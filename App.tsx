
import React, { useState, useEffect } from 'react';
import { User, PointRecord, Company, Employee, AttendanceRequest } from './types';
import { db } from './firebase';
import { 
  collection, addDoc, query, where, onSnapshot, doc, updateDoc, Timestamp, orderBy, deleteDoc, getDocs
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
import HolidaysView from './components/HolidaysView';
import KioskMode from './components/KioskMode';
import AiAssistant from './components/AiAssistant';
import ComplianceAudit from './components/ComplianceAudit';
import CompanyFeatures from './components/CompanyFeatures';
import BenefitsView from './components/BenefitsView';
import FeedbackView from './components/FeedbackView';
import VacationView from './components/VacationView';
import SettingsView from './components/SettingsView';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeView, setActiveView] = useState<'dashboard' | 'mypoint' | 'card' | 'requests' | 'holidays' | 'colaboradores' | 'profile' | 'assistant' | 'audit' | 'aprovacoes' | 'relatorio' | 'saldos' | 'config' | 'features' | 'benefits' | 'feedback' | 'vacation' | 'settings'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPunching, setIsPunching] = useState(false);
  const [lastPunch, setLastPunch] = useState<PointRecord | null>(null);
  const [records, setRecords] = useState<PointRecord[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const savedUser = localStorage.getItem('fortime_user');
    if (savedUser) setUser(JSON.parse(savedUser));
    setIsInitialized(true);

    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineRecords();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncOfflineRecords = async () => {
    const offlineData = localStorage.getItem('offline_records');
    if (!offlineData) return;
    
    const offlineRecords = JSON.parse(offlineData);
    if (offlineRecords.length === 0) return;

    for (const rec of offlineRecords) {
      try {
        await addDoc(collection(db, "records"), { 
          ...rec, 
          timestamp: Timestamp.fromDate(new Date(rec.timestamp)) 
        });
      } catch (e) {
        console.error("Erro ao sincronizar registro:", e);
      }
    }
    localStorage.setItem('offline_records', JSON.stringify([]));
  };

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    if (!user?.companyCode) return;
    const unsubComp = onSnapshot(doc(db, "companies", user.companyCode), (d) => {
      if (d.exists()) {
        const data = { id: d.id, ...d.data() } as Company;
        setCompany(data);
        const themeColor = data.themeColor || '#f97316';
        document.documentElement.style.setProperty('--primary-color', themeColor);
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
    return () => { unsubComp(); unsubEmps(); unsubRecs(); };
  }, [user?.companyCode]);

  const handleCameraCapture = async (photo: string, loc: any) => {
    if (!user) return;
    
    const todayRecs = records.filter(r => r.matricula === user.matricula && r.timestamp.toLocaleDateString() === new Date().toLocaleDateString());
    const type = todayRecs.length % 2 === 0 ? 'entrada' : 'saida';
    const recordData = {
      userName: user.name, address: loc.address, latitude: loc.lat, longitude: loc.lng,
      photo, status: isOnline ? 'synchronized' : 'pending', matricula: user.matricula,
      digitalSignature: Math.random().toString(36).substring(2, 15), type,
      companyCode: user.companyCode, timestamp: new Date()
    };

    if (isOnline) {
      await addDoc(collection(db, "records"), { ...recordData, timestamp: Timestamp.fromDate(recordData.timestamp) });
    } else {
      const offline = JSON.parse(localStorage.getItem('offline_records') || '[]');
      offline.push(recordData);
      localStorage.setItem('offline_records', JSON.stringify(offline));
    }

    setLastPunch({ ...recordData, id: 'temp' } as PointRecord);
    setIsPunching(false);
  };

  if (!isInitialized) return null;
  if (!user) return <Login onLogin={(u, c) => { setUser(u); if(c) setCompany(c); localStorage.setItem('fortime_user', JSON.stringify(u)); setActiveView(u.role === 'admin' ? 'relatorio' : 'dashboard'); }} />;

  const userRecords = records.filter(r => r.matricula === user.matricula);

  return (
    <div className={`flex h-screen w-screen transition-colors duration-500 overflow-hidden font-sans justify-center items-center p-0 md:p-4 ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-orange-50 text-slate-900'}`}>
      <style>{`:root { --primary-color: #f97316; } .bg-primary { background-color: var(--primary-color) !important; } .text-primary { color: var(--primary-color) !important; }`}</style>
      
      {!isOnline && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[100] bg-red-500 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase shadow-lg animate-bounce">
          ⚡ Modo Offline Ativo
        </div>
      )}

      <div className={`h-full w-full max-w-lg shadow-2xl flex flex-col relative border-x overflow-hidden md:rounded-[40px] transition-all duration-500 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <Sidebar user={user} company={company} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} onNavigate={(v) => { if(v==='logout'){localStorage.clear(); setUser(null);} else {setActiveView(v as any); setIsSidebarOpen(false);}}} activeView={activeView} />
        
        {/* Renderização condicional do header (oculto na view de settings pois ela tem header próprio) */}
        {activeView !== 'settings' && (
          <header className={`px-6 py-6 flex items-center justify-between border-b sticky top-0 z-10 shrink-0 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-50'}`}>
            <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 text-slate-800 dark:text-slate-300"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8h16M4 16h16" /></svg></button>
            <div className="text-center">{company?.logoUrl ? <img src={company.logoUrl} className="h-10 object-contain" /> : <p className="text-[11px] font-bold text-primary uppercase tracking-widest">{company?.name || 'ForTime PRO'}</p>}</div>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-11 h-11 rounded-2xl flex items-center justify-center bg-slate-100 dark:bg-slate-800">{isDarkMode ? '☀️' : '🌙'}</button>
          </header>
        )}

        <main className="flex-1 overflow-y-auto no-scrollbar pb-10">
          <div className="max-w-md mx-auto w-full h-full">
            {activeView === 'dashboard' && <Dashboard onPunchClick={() => setIsPunching(true)} lastPunch={userRecords[0]} onNavigate={(v) => setActiveView(v)} user={user} />}
            {activeView === 'mypoint' && <MyPoint records={userRecords} />}
            {activeView === 'card' && <AttendanceCard records={userRecords} company={company} />}
            {activeView === 'holidays' && <HolidaysView company={company} />}
            {activeView === 'requests' && <Requests />}
            {activeView === 'profile' && <Profile user={user} company={company} />}
            {activeView === 'assistant' && <AiAssistant user={user} records={userRecords} />}
            {activeView === 'audit' && <ComplianceAudit records={records} employees={employees} />}
            {activeView === 'features' && <CompanyFeatures />}
            {activeView === 'benefits' && <BenefitsView />}
            {activeView === 'feedback' && <FeedbackView user={user} />}
            {activeView === 'vacation' && <VacationView />}
            {activeView === 'settings' && <SettingsView user={user} onBack={() => setActiveView('dashboard')} />}
            {(['colaboradores', 'aprovacoes', 'config', 'relatorio', 'saldos'].includes(activeView)) && 
              <AdminDashboard 
                latestRecords={records} company={company} employees={employees} 
                onAddEmployee={async (e) => await addDoc(collection(db, "employees"), { ...e, companyCode: user.companyCode, status: 'active', hasFacialRecord: false })} 
                onDeleteEmployee={async (id) => { if(confirm("EXCLUIR?")) await deleteDoc(doc(db, "employees", id)); }} 
                onUpdateIP={() => {}}
                initialTab={activeView as any}
              />
            }
          </div>
        </main>

        {isPunching && <PunchCamera geofenceConfig={company?.geofence} onCapture={handleCameraCapture} onCancel={() => setIsPunching(false)} isFirstAccess={!user.hasFacialRecord} />}
        {lastPunch && <PunchSuccess record={lastPunch} onClose={() => setLastPunch(null)} />}
      </div>
    </div>
  );
};

export default App;
