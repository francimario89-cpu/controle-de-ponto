
import React, { useState, useEffect } from 'react';
import { User, PointRecord, Company, Employee } from './types';
import { db } from './firebase';
import { 
  collection, addDoc, query, where, onSnapshot, doc, updateDoc, Timestamp, orderBy, deleteDoc
} from "firebase/firestore";
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import PunchCamera from './components/PunchCamera';
import PunchSuccess from './components/PunchSuccess';
import MyPoint from './components/MyPoint';
import AttendanceCard from './components/AttendanceCard';
import Requests from './components/Requests';
import AdminDashboard from './components/AdminDashboard';
import KioskMode from './components/KioskMode';
import Profile from './components/Profile';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeView, setActiveView] = useState<'dashboard' | 'mypoint' | 'card' | 'requests' | 'admin' | 'totem' | 'profile'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPunching, setIsPunching] = useState(false);
  const [lastPunch, setLastPunch] = useState<PointRecord | null>(null);
  const [records, setRecords] = useState<PointRecord[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('fortime_user');
    if (savedUser) setUser(JSON.parse(savedUser));
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!user?.companyCode) return;
    const unsubComp = onSnapshot(doc(db, "companies", user.companyCode), (d) => {
      if (d.exists()) setCompany({ id: d.id, ...d.data() } as Company);
    });
    const unsubEmps = onSnapshot(query(collection(db, "employees"), where("companyCode", "==", user.companyCode)), (s) => {
      const emps: Employee[] = [];
      s.forEach(d => emps.push({ id: d.id, ...d.data() } as Employee));
      setEmployees(emps);
    });
    const unsubRecs = onSnapshot(query(collection(db, "records"), where("companyCode", "==", user.companyCode), orderBy("timestamp", "desc")), (s) => {
      const recs: PointRecord[] = [];
      s.forEach(d => {
        const data = d.data();
        recs.push({ ...data, id: d.id, timestamp: data.timestamp.toDate() } as PointRecord);
      });
      setRecords(recs);
    });
    return () => { unsubComp(); unsubEmps(); unsubRecs(); };
  }, [user?.companyCode]);

  const handleLogin = (newUser: User, newCompany?: Company) => {
    setUser(newUser);
    if (newCompany) setCompany(newCompany);
    localStorage.setItem('fortime_user', JSON.stringify(newUser));
    setActiveView(newUser.role === 'admin' ? 'admin' : newUser.role === 'totem' ? 'totem' : 'dashboard');
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    setCompany(null);
    setActiveView('dashboard');
  };

  const generateSignature = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const handleCameraCapture = async (photo: string, loc: any) => {
    if (!user) return;
    
    // Simulação de Auditoria de Tipo (Entrada/Saída)
    const todayRecs = records.filter(r => 
      r.matricula === user.matricula && 
      r.timestamp.toLocaleDateString() === new Date().toLocaleDateString()
    );
    const type = todayRecs.length % 2 === 0 ? 'entrada' : 'saida';

    const record: PointRecord = {
      id: '', userName: user.name, timestamp: new Date(), 
      photo, latitude: loc.lat, longitude: loc.lng, address: loc.address,
      status: 'synchronized', matricula: user.matricula,
      digitalSignature: generateSignature(),
      type
    };

    await addDoc(collection(db, "records"), { ...record, companyCode: user.companyCode, timestamp: Timestamp.fromDate(record.timestamp) });
    setLastPunch(record);
    setIsPunching(false);
  };

  if (!isInitialized) return null;
  if (!user) return <Login onLogin={handleLogin} />;
  if (activeView === 'totem') return <KioskMode employees={employees} onPunch={() => {}} onExit={handleLogout} />;

  return (
    <div className="flex h-screen w-screen bg-slate-100 overflow-hidden font-sans">
      <div className="h-full w-full max-w-md mx-auto bg-white shadow-2xl flex flex-col relative border-x border-slate-200">
        <Sidebar user={user} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} onNavigate={(v) => v === 'logout' ? handleLogout() : (setActiveView(v as any), setIsSidebarOpen(false))} activeView={activeView} />
        
        <header className="px-6 py-5 flex items-center justify-between border-b border-slate-50 bg-white sticky top-0 z-10">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-800"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 8h16M4 16h16" /></svg></button>
          <div className="text-center">
            <p className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em]">{company?.name || 'ForTime PRO'}</p>
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{activeView}</p>
          </div>
          <button onClick={() => setActiveView('profile')} className="w-10 h-10 rounded-2xl overflow-hidden border border-slate-100"><img src={user.photo || `https://ui-avatars.com/api/?name=${user.name}`} className="w-full h-full object-cover" /></button>
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar pb-10">
          {activeView === 'dashboard' && <Dashboard onPunchClick={() => setIsPunching(true)} lastPunch={records.filter(r => r.matricula === user.matricula)[0]} onNavigate={setActiveView} user={user} />}
          {activeView === 'mypoint' && <MyPoint records={records.filter(r => r.matricula === user.matricula)} />}
          {activeView === 'card' && <AttendanceCard records={records.filter(r => r.matricula === user.matricula)} />}
          {activeView === 'requests' && <Requests />}
          {activeView === 'admin' && <AdminDashboard latestRecords={records} company={company} employees={employees} onAddEmployee={async (e) => await addDoc(collection(db, "employees"), { ...e, companyCode: user.companyCode })} onDeleteEmployee={async (id) => confirm("Excluir?") && await deleteDoc(doc(db, "employees", id))} onUpdateIP={async (ip) => await updateDoc(doc(db, "companies", user.companyCode), { authorizedIP: ip })} />}
          {activeView === 'profile' && <Profile user={user} />}
        </main>

        {isPunching && <PunchCamera geofenceConfig={company?.geofence} onCapture={handleCameraCapture} onCancel={() => setIsPunching(false)} />}
        {lastPunch && <PunchSuccess record={lastPunch} onClose={() => setLastPunch(null)} />}
      </div>
    </div>
  );
};

export default App;
