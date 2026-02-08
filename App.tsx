
import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { User, Company, Employee, PointRecord } from './types';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import PunchCamera from './components/PunchCamera';
import PunchSuccess from './components/PunchSuccess';
import MyPoint from './components/MyPoint';
import AttendanceCard from './components/AttendanceCard';
import Requests from './components/Requests';
import AdminDashboard from './components/AdminDashboard';
import AiAssistant from './components/AiAssistant';
import ComplianceAudit from './components/ComplianceAudit';
import BenefitsView from './components/BenefitsView';
import FeedbackView from './components/FeedbackView';
import VacationView from './components/VacationView';
import SettingsView from './components/SettingsView';
import ScheduleView from './components/ScheduleView';
import CompanyProfile from './components/CompanyProfile';
import CompaniesView from './components/CompaniesView';
import KioskMode from './components/KioskMode';
import HolidaysView from './components/HolidaysView';
import Profile from './components/Profile';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('fortime_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [company, setCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<PointRecord[]>([]);
  const [activeView, setActiveView] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showPunchCamera, setShowPunchCamera] = useState(false);
  const [lastPunch, setLastPunch] = useState<PointRecord | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (user?.companyCode) {
      const unsubCompany = onSnapshot(doc(db, "companies", user.companyCode), (snapshot) => {
        if (snapshot.exists()) setCompany({ id: snapshot.id, ...snapshot.data() } as Company);
      });

      const qEmp = query(collection(db, "employees"), where("companyCode", "==", user.companyCode));
      const unsubEmployees = onSnapshot(qEmp, (snap) => {
        const emps: Employee[] = [];
        snap.forEach(d => emps.push({ id: d.id, ...d.data() } as Employee));
        setEmployees(emps);
      });

      const qRec = query(collection(db, "records"), where("companyCode", "==", user.companyCode));
      const unsubRecords = onSnapshot(qRec, (snap) => {
        const recs: PointRecord[] = [];
        snap.forEach(d => {
          const data = d.data();
          recs.push({ 
            ...data, 
            id: d.id, 
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp) 
          } as PointRecord);
        });
        setRecords(recs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
      });

      return () => {
        unsubCompany();
        unsubEmployees();
        unsubRecords();
      };
    }
  }, [user?.companyCode]);

  const handleLogin = (u: User, c?: Company) => {
    setUser(u);
    if (c) setCompany(c);
    localStorage.setItem('fortime_user', JSON.stringify(u));
  };

  const handleLogout = () => {
    setUser(null);
    setCompany(null);
    localStorage.removeItem('fortime_user');
    setActiveView('dashboard');
  };

  const handlePunch = async (photo: string, loc: { lat: number; lng: number; address: string }) => {
    if (!user) return;
    const now = new Date();
    const newRecord: any = {
      userName: user.name,
      timestamp: now,
      address: loc.address,
      latitude: loc.lat,
      longitude: loc.lng,
      photo,
      status: 'synchronized',
      matricula: user.matricula,
      companyCode: user.companyCode,
      digitalSignature: Math.random().toString(36).substring(2, 15),
      type: 'entrada' 
    };

    try {
      const docRef = await addDoc(collection(db, "records"), newRecord);
      const recordWithId = { ...newRecord, id: docRef.id };
      setLastPunch(recordWithId);
      setShowPunchCamera(false);
    } catch (e) {
      console.error("Erro ao registrar ponto:", e);
      alert("Erro ao salvar ponto.");
    }
  };

  if (!user) return <Login onLogin={handleLogin} />;

  if (user.role === 'totem') {
    return (
      <KioskMode 
        employees={employees} 
        onPunch={(r) => { setLastPunch(r); }} 
        onExit={handleLogout} 
      />
    );
  }

  const isAdminView = ['colaboradores', 'aprovacoes', 'config', 'relatorio', 'saldos', 'audit', 'company_profile'].includes(activeView);

  return (
    <div className={`flex h-screen w-screen transition-colors duration-500 overflow-hidden font-sans ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Sidebar Fixo no Desktop, Drawer no Mobile */}
      <Sidebar 
        user={user} 
        company={company} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        onNavigate={(v) => { if (v === 'logout') handleLogout(); else setActiveView(v); }}
        activeView={activeView}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Header Mobile */}
        <header className="md:hidden p-4 flex justify-between items-center border-b dark:border-slate-800 bg-white dark:bg-slate-900 z-30">
           <button onClick={() => setIsSidebarOpen(true)} className="p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
           </button>
           <h1 className="text-sm font-black tracking-tighter">ForTime <span className="text-primary">PRO</span></h1>
           <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-xl">{isDarkMode ? '🌞' : '🌙'}</button>
        </header>

        {/* Header Desktop (Opcional) */}
        <header className="hidden md:flex p-6 justify-between items-center bg-white dark:bg-slate-900 border-b dark:border-slate-800">
           <div>
             <h1 className="text-lg font-black tracking-tighter uppercase">{company?.name || 'ForTime PRO'}</h1>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{activeView.replace('_', ' ')}</p>
           </div>
           <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl shadow-sm hover:scale-105 transition-all">
             {isDarkMode ? '🌞 Light Mode' : '🌙 Dark Mode'}
           </button>
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar">
          <div className={`mx-auto w-full h-full ${isAdminView ? 'p-4 md:p-10' : 'max-w-md p-4'}`}>
            {activeView === 'dashboard' && <Dashboard user={user} lastPunch={records[0]} onPunchClick={() => setShowPunchCamera(true)} onNavigate={setActiveView} />}
            {activeView === 'mypoint' && <MyPoint records={records.filter(r => r.matricula === user.matricula)} />}
            {activeView === 'card' && <AttendanceCard records={records.filter(r => r.matricula === user.matricula)} company={company} />}
            {activeView === 'requests' && <Requests />}
            {activeView === 'assistant' && <AiAssistant user={user} records={records.filter(r => r.matricula === user.matricula)} />}
            {activeView === 'profile' && <Profile user={user} company={company} onLogout={handleLogout} />}
            {activeView === 'audit' && <ComplianceAudit records={records} employees={employees} />}
            {activeView === 'companies' && <CompaniesView />}
            {activeView === 'company_profile' && <CompanyProfile company={company} />}
            {activeView === 'holidays' && <HolidaysView company={company} />}
            {activeView === 'benefits' && <BenefitsView />}
            {activeView === 'feedback' && <FeedbackView user={user} />}
            {activeView === 'vacation' && <VacationView />}
            {activeView === 'settings' && <SettingsView user={user} onBack={() => setActiveView('dashboard')} />}
            {activeView === 'schedule' && <ScheduleView />}

            {(['colaboradores', 'aprovacoes', 'config', 'relatorio', 'saldos'].includes(activeView)) && 
              <AdminDashboard 
                latestRecords={records} company={company} employees={employees} 
                onAddEmployee={async (e) => {
                  try {
                    await addDoc(collection(db, "employees"), { 
                      ...e, 
                      companyCode: user.companyCode, 
                      status: 'active', 
                      hasFacialRecord: false,
                      photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(e.name)}&background=0057ff&color=fff`
                    });
                    alert("COLABORADOR CADASTRADO COM SUCESSO!");
                  } catch (err) {
                    console.error("Erro ao adicionar:", err);
                    alert("ERRO AO SALVAR COLABORADOR.");
                  }
                }} 
                onDeleteEmployee={async (id) => { if(confirm("EXCLUIR COLABORADOR?")) await deleteDoc(doc(db, "employees", id)); }} 
                onUpdateIP={() => {}}
                initialTab={activeView as any}
              />
            }
          </div>
        </main>

        {showPunchCamera && <PunchCamera geofenceConfig={company?.geofence} onCapture={handlePunch} onCancel={() => setShowPunchCamera(false)} />}
        {lastPunch && <PunchSuccess record={lastPunch} onClose={() => setLastPunch(null)} />}
      </div>
    </div>
  );
};

export default App;
