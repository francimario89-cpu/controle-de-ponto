
import React, { useState, useEffect } from 'react';
import { User, PointRecord, Company, Employee } from './types';
import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc,
  updateDoc,
  Timestamp,
  orderBy,
  getDoc
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
    const savedCompany = localStorage.getItem('fortime_company');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      if (savedCompany) setCompany(JSON.parse(savedCompany));
      if (parsedUser.role === 'admin') setActiveView('admin');
    }
    setIsInitialized(true);
  }, []);

  // Sync Data
  useEffect(() => {
    if (!user?.companyCode || !db) return;
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
    if (newCompany) localStorage.setItem('fortime_company', JSON.stringify(newCompany));
    setActiveView(newUser.role === 'admin' ? 'admin' : newUser.role === 'totem' ? 'totem' : 'dashboard');
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    setCompany(null);
    setActiveView('dashboard');
    setIsSidebarOpen(false);
  };

  const handleUpdateIP = async (ip: string) => {
    if (!user?.companyCode) return;
    await updateDoc(doc(db, "companies", user.companyCode), { authorizedIP: ip });
    alert("IP da Empresa atualizado!");
  };

  const checkNetwork = async () => {
    if (!company?.authorizedIP) return true;
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      if (data.ip !== company.authorizedIP) {
        alert(`Acesso Negado: Registre ponto conectado ao Wi-Fi autorizado.\nSeu IP atual: ${data.ip}`);
        return false;
      }
      return true;
    } catch { return false; }
  };

  const handleAddEmployee = async (emp: any) => {
    await addDoc(collection(db, "employees"), { ...emp, companyCode: user?.companyCode });
  };

  const handleDeleteEmployee = async (id: string) => {
    if (confirm("Excluir este colaborador permanentemente?")) {
      await deleteDoc(doc(db, "employees", id));
    }
  };

  const handleCameraCapture = async (photo: string, loc: any) => {
    if (!user) return;
    
    // Se for primeiro acesso, salva a foto como biometria oficial
    if (!user.hasFacialRecord && user.role === 'employee') {
      const q = query(collection(db, "employees"), where("companyCode", "==", user.companyCode), where("matricula", "==", user.matricula));
      const snap = await (await import("firebase/firestore")).getDocs(q);
      if (!snap.empty) {
        await updateDoc(doc(db, "employees", snap.docs[0].id), { photo, hasFacialRecord: true });
        const updatedUser = { ...user, photo, hasFacialRecord: true };
        setUser(updatedUser);
        localStorage.setItem('fortime_user', JSON.stringify(updatedUser));
      }
    }

    const record: PointRecord = {
      id: '', userName: user.name, timestamp: new Date(), 
      photo, latitude: loc.lat, longitude: loc.lng, address: loc.address,
      status: 'synchronized', matricula: user.matricula
    };

    await addDoc(collection(db, "records"), { ...record, companyCode: user.companyCode, timestamp: Timestamp.fromDate(record.timestamp) });
    setLastPunch(record);
    setIsPunching(false);
  };

  if (!isInitialized) return null;
  if (!user) return <Login onLogin={handleLogin} />;
  if (activeView === 'totem') return <KioskMode employees={employees} onPunch={() => {}} onExit={handleLogout} />;

  return (
    <div className="flex h-screen w-screen bg-orange-50/50 overflow-hidden font-sans">
      <div className="h-full w-full max-w-md mx-auto bg-white shadow-2xl flex flex-col relative border-x border-orange-100">
        <Sidebar user={user} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} onNavigate={(v) => v === 'logout' ? handleLogout() : {setActiveView(v as any), setIsSidebarOpen(false)}} activeView={activeView} />
        
        <header className="px-4 py-4 flex items-center justify-between border-b border-orange-50 bg-white sticky top-0 z-10">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-orange-500">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="text-center">
            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{user.role === 'admin' ? 'Gestão RH' : 'Minha Jornada'}</p>
            <p className="text-[8px] text-slate-400 font-bold truncate max-w-[120px]">{company?.name}</p>
          </div>
          <button onClick={() => setActiveView('profile')} className="w-10 h-10 rounded-xl overflow-hidden border border-orange-100 active:scale-95 transition-transform"><img src={user.photo || `https://ui-avatars.com/api/?name=${user.name}`} className="w-full h-full object-cover" /></button>
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar pb-10">
          {activeView === 'dashboard' && <Dashboard onPunchClick={async () => (await checkNetwork()) && setIsPunching(true)} lastPunch={records.filter(r => r.matricula === user.matricula)[0]} onNavigate={setActiveView} user={user} />}
          {activeView === 'mypoint' && <MyPoint records={records.filter(r => r.matricula === user.matricula)} />}
          {activeView === 'card' && <AttendanceCard records={records.filter(r => r.matricula === user.matricula)} />}
          {activeView === 'requests' && <Requests />}
          {activeView === 'admin' && <AdminDashboard latestRecords={records} company={company} employees={employees} onAddEmployee={handleAddEmployee} onDeleteEmployee={handleDeleteEmployee} onUpdateIP={handleUpdateIP} />}
          {activeView === 'profile' && <Profile user={user} />}
        </main>

        {isPunching && <PunchCamera isFirstAccess={!user.hasFacialRecord && user.role === 'employee'} onCapture={handleCameraCapture} onCancel={() => setIsPunching(false)} />}
        {lastPunch && <PunchSuccess record={lastPunch} onClose={() => setLastPunch(null)} />}
      </div>
    </div>
  );
};

export default App;
