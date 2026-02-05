
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
  Timestamp,
  orderBy
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

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeView, setActiveView] = useState<'dashboard' | 'mypoint' | 'card' | 'requests' | 'admin' | 'totem'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPunching, setIsPunching] = useState(false);
  const [lastPunch, setLastPunch] = useState<PointRecord | null>(null);
  const [records, setRecords] = useState<PointRecord[]>([]);

  useEffect(() => {
    const savedUser = localStorage.getItem('fortime_user');
    const savedCompany = localStorage.getItem('fortime_company');
    
    if (savedUser && savedUser !== "undefined") {
      try {
        const parsedUser = JSON.parse(savedUser) as User;
        setUser(parsedUser);
        if (savedCompany && savedCompany !== "undefined") {
          setCompany(JSON.parse(savedCompany) as Company);
        }

        if (parsedUser.role === 'admin') setActiveView('admin');
        else if (parsedUser.role === 'totem') setActiveView('totem');
        else setActiveView('dashboard');
      } catch (e) {
        localStorage.removeItem('fortime_user');
      }
    }
  }, []);

  useEffect(() => {
    if (!user?.companyCode || !db) return;
    const q = query(collection(db, "employees"), where("companyCode", "==", user.companyCode));
    return onSnapshot(q, (snapshot) => {
      const emps: Employee[] = [];
      snapshot.forEach((doc) => emps.push({ id: doc.id, ...doc.data() } as Employee));
      setEmployees(emps);
    });
  }, [user?.companyCode]);

  useEffect(() => {
    if (!user?.companyCode || !db) return;
    const q = query(collection(db, "records"), where("companyCode", "==", user.companyCode), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snapshot) => {
      const recs: PointRecord[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        recs.push({ ...data, id: doc.id, timestamp: data.timestamp.toDate() } as PointRecord);
      });
      setRecords(recs);
    });
  }, [user?.companyCode]);

  const handleLogin = async (newUser: User, newCompany?: Company) => {
    try {
      if (newCompany && db) {
        await setDoc(doc(db, "companies", newCompany.accessCode), newCompany);
        setCompany(newCompany);
        localStorage.setItem('fortime_company', JSON.stringify(newCompany));
      }
      setUser(newUser);
      localStorage.setItem('fortime_user', JSON.stringify(newUser));
      if (newUser.role === 'admin') setActiveView('admin');
      else if (newUser.role === 'totem') setActiveView('totem');
      else setActiveView('dashboard');
    } catch (e) {
      alert("Erro ao conectar com Firebase.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('fortime_user');
    localStorage.removeItem('fortime_company');
    setUser(null);
    setCompany(null);
    setActiveView('dashboard');
    setIsSidebarOpen(false);
  };

  const handlePunch = async (record: PointRecord) => {
    if (!user?.companyCode || !db) return;
    try {
      const firestoreRecord = { ...record, companyCode: user.companyCode, timestamp: Timestamp.fromDate(record.timestamp) };
      await addDoc(collection(db, "records"), firestoreRecord);
      if (user?.role !== 'totem') setLastPunch(record);
      setIsPunching(false);
    } catch (e) {
      alert("Erro ao registrar ponto.");
    }
  };

  const handleCameraPunch = (photo: string, location: { lat: number; lng: number; address: string }) => {
    if (!user) return;
    handlePunch({
      id: '', 
      userName: user.name,
      timestamp: new Date(),
      photo,
      latitude: location.lat,
      longitude: location.lng,
      address: location.address,
      status: 'synchronized',
      matricula: user.matricula
    });
  };

  if (!user) return <Login onLogin={handleLogin} />;
  
  if (activeView === 'totem') {
    return <KioskMode employees={employees} onPunch={handlePunch} onExit={handleLogout} />;
  }

  return (
    <div className="flex h-screen w-screen bg-orange-50/50 text-slate-900 font-sans overflow-hidden">
      {/* Container principal com paddings para Safe Areas do iPhone (Notch) */}
      <div className="h-full w-full max-w-md mx-auto bg-white shadow-2xl flex flex-col relative overflow-hidden border-x border-orange-100 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <Sidebar 
          user={user} 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          onNavigate={(v) => { 
            if (v === 'logout') handleLogout();
            else { setActiveView(v as any); setIsSidebarOpen(false); }
          }} 
          activeView={activeView} 
        />

        <header className="bg-white px-4 py-4 flex items-center justify-between border-b border-orange-50 sticky top-0 z-10">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-orange-500">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex flex-col items-center">
             <span className="text-sm font-black text-orange-600 uppercase">
               {user.role === 'admin' ? 'RH Master' : 'Meu Ponto'}
             </span>
             <span className="text-[9px] text-orange-400 font-bold uppercase truncate max-w-[150px]">
               {company?.name || user.companyName}
             </span>
          </div>
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-orange-100 bg-orange-50">
            <img src={user.photo || `https://ui-avatars.com/api/?name=${user.name}`} alt="Profile" className="w-full h-full object-cover" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto no-scrollbar bg-orange-50/10">
          {activeView === 'dashboard' && <Dashboard onPunchClick={() => setIsPunching(true)} lastPunch={records[0]} />}
          {activeView === 'mypoint' && <MyPoint />}
          {activeView === 'card' && <AttendanceCard />}
          {activeView === 'requests' && <Requests />}
          {activeView === 'admin' && <AdminDashboard latestRecords={records} company={company} employees={employees} onAddEmployee={(e) => {}} />}
        </div>

        {isPunching && <PunchCamera onCapture={handleCameraPunch} onCancel={() => setIsPunching(false)} />}
        {lastPunch && <PunchSuccess record={lastPunch} onClose={() => setLastPunch(null)} />}
      </div>
    </div>
  );
};

export default App;
