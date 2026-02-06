
import React, { useState, useEffect } from 'react';
import { User, PointRecord, Company, Employee, AttendanceRequest } from './types';
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
import Profile from './components/Profile';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeView, setActiveView] = useState<'dashboard' | 'mypoint' | 'card' | 'requests' | 'admin' | 'totem' | 'profile' | 'shifts' | 'calendar' | 'vacations' | 'aprovacoes'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPunching, setIsPunching] = useState(false);
  const [lastPunch, setLastPunch] = useState<PointRecord | null>(null);
  const [records, setRecords] = useState<PointRecord[]>([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('fortime_user');
    if (savedUser) setUser(JSON.parse(savedUser));
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!user?.companyCode) return;
    
    const unsubComp = onSnapshot(doc(db, "companies", user.companyCode), (d) => {
      if (d.exists()) {
        const data = { id: d.id, ...d.data() } as Company;
        setCompany(data);
        const themeColor = data.themeColor || '#f97316';
        document.documentElement.style.setProperty('--primary-color', themeColor);
        document.documentElement.style.setProperty('--primary-light', themeColor + '20');
      }
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

    const unsubReqs = onSnapshot(query(collection(db, "requests"), where("companyCode", "==", user.companyCode), where("status", "==", "pending")), (s) => {
      setPendingRequestsCount(s.size);
    });

    return () => { unsubComp(); unsubEmps(); unsubRecs(); unsubReqs(); };
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

  const handleCameraCapture = async (photo: string, loc: any) => {
    if (!user) return;
    const todayRecs = records.filter(r => 
      r.matricula === user.matricula && 
      r.timestamp.toLocaleDateString() === new Date().toLocaleDateString()
    );
    const type = todayRecs.length % 2 === 0 ? 'entrada' : 'saida';

    const record: PointRecord = {
      id: '', userName: user.name, timestamp: new Date(), 
      photo, latitude: loc.lat, longitude: loc.lng, address: loc.address,
      status: 'synchronized', matricula: user.matricula,
      digitalSignature: Math.random().toString(36).substring(2, 15),
      type
    };

    await addDoc(collection(db, "records"), { ...record, companyCode: user.companyCode, timestamp: Timestamp.fromDate(record.timestamp) });
    setLastPunch(record);
    setIsPunching(false);
  };

  if (!isInitialized) return null;
  if (!user) return <Login onLogin={handleLogin} />;

  const isAdmin = user.role === 'admin';

  return (
    <div className="flex h-screen w-screen bg-slate-100 overflow-hidden font-sans justify-center items-center p-0 md:p-4">
      <style>{`
        :root {
          --primary-color: #f97316;
          --primary-light: #fff7ed;
        }
        .bg-primary { background-color: var(--primary-color) !important; }
        .text-primary { color: var(--primary-color) !important; }
        .border-primary { border-color: var(--primary-color) !important; }
        .bg-primary-light { background-color: var(--primary-light) !important; }
        .shadow-primary { shadow-color: var(--primary-color) !important; }
      `}</style>

      <div className="h-full w-full max-w-lg bg-white shadow-2xl flex flex-col relative border-x border-slate-200 overflow-hidden md:rounded-[40px]">
        <Sidebar 
          user={user} 
          company={company}
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          onNavigate={(v) => v === 'logout' ? handleLogout() : (setActiveView(v as any), setIsSidebarOpen(false))} 
          activeView={activeView} 
        />
        
        <header className="px-6 py-5 flex items-center justify-between border-b border-slate-50 bg-white sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-800 focus:outline-none hover:bg-slate-50 rounded-xl transition-colors">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 8h16M4 16h16" /></svg>
            </button>
            {isAdmin && pendingRequestsCount > 0 && (
              <button 
                onClick={() => setActiveView('aprovacoes')}
                className="relative p-2 text-primary hover:bg-primary-light rounded-xl transition-all animate-bounce"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                  {pendingRequestsCount}
                </span>
              </button>
            )}
          </div>

          <div className="text-center">
            {company?.logoUrl ? (
              <img src={company.logoUrl} className="h-6 mx-auto object-contain mb-0.5" alt="Logo" />
            ) : (
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{company?.name || 'ForTime PRO'}</p>
            )}
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{activeView}</p>
          </div>

          <button onClick={() => setActiveView('profile')} className="w-10 h-10 rounded-2xl overflow-hidden border border-slate-100 shadow-sm transition-transform active:scale-90">
             <img src={user.photo || `https://ui-avatars.com/api/?name=${user.name}`} className="w-full h-full object-cover" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar pb-10 bg-slate-50/30">
          {activeView === 'dashboard' && <Dashboard onPunchClick={() => setIsPunching(true)} lastPunch={records.filter(r => r.matricula === user.matricula)[0]} onNavigate={setActiveView} user={user} />}
          {activeView === 'mypoint' && <MyPoint records={records.filter(r => r.matricula === user.matricula)} />}
          {activeView === 'card' && <AttendanceCard records={records.filter(r => r.matricula === user.matricula)} />}
          {activeView === 'requests' && <Requests />}
          {(['admin', 'shifts', 'calendar', 'vacations', 'aprovacoes'].includes(activeView)) && 
            <AdminDashboard 
              latestRecords={records} 
              company={company} 
              employees={employees} 
              onAddEmployee={async (e) => await addDoc(collection(db, "employees"), { ...e, companyCode: user.companyCode })} 
              onDeleteEmployee={async (id) => confirm("Excluir?") && await deleteDoc(doc(db, "employees", id))} 
              onUpdateIP={async (ip) => await updateDoc(doc(db, "companies", user.companyCode), { authorizedIP: ip })}
              initialTab={
                activeView === 'shifts' ? 'jornada' : 
                activeView === 'calendar' ? 'calendario' : 
                activeView === 'vacations' ? 'ferias' : 
                activeView === 'aprovacoes' ? 'aprovacoes' :
                'colaboradores'
              }
            />
          }
          {activeView === 'profile' && <Profile user={user} company={company} />}
        </main>

        {isPunching && <PunchCamera geofenceConfig={company?.geofence} onCapture={handleCameraCapture} onCancel={() => setIsPunching(false)} />}
        {lastPunch && <PunchSuccess record={lastPunch} onClose={() => setLastPunch(null)} />}
      </div>
    </div>
  );
};

export default App;
