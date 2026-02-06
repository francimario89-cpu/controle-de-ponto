
import React, { useState, useEffect } from 'react';
import { User, PointRecord, Company, Employee, AttendanceRequest, ChatMessage } from './types';
import { db } from './firebase';
import { getGeminiResponse } from './geminiService';
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
import ChatArea from './components/ChatArea';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeView, setActiveView] = useState<'dashboard' | 'mypoint' | 'card' | 'requests' | 'admin' | 'totem' | 'profile' | 'shifts' | 'calendar' | 'vacations' | 'aprovacoes' | 'contabilidade' | 'chat'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPunching, setIsPunching] = useState(false);
  const [lastPunch, setLastPunch] = useState<PointRecord | null>(null);
  const [records, setRecords] = useState<PointRecord[]>([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('fortime_user');
    if (savedUser) setUser(JSON.parse(savedUser));
    setIsInitialized(true);

    const handleOnline = () => {
      setIsOffline(false);
      syncOfflineRecords();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncOfflineRecords = async () => {
    const offline = JSON.parse(localStorage.getItem('offline_punches') || '[]');
    if (offline.length === 0) return;
    
    for (const rec of offline) {
      await addDoc(collection(db, "records"), { 
        ...rec, 
        timestamp: Timestamp.fromDate(new Date(rec.timestamp)) 
      });
    }
    localStorage.removeItem('offline_punches');
    alert("Registros offline sincronizados com sucesso!");
  };

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

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    const newUserMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text };
    setChatMessages(prev => [...prev, newUserMsg]);
    setIsChatLoading(true);
    
    const userRecords = records
      .filter(r => r.matricula === user?.matricula)
      .slice(0, 10)
      .map(r => `${r.timestamp.toLocaleString()} - ${r.type}`);
    
    const response = await getGeminiResponse(text, userRecords);
    const modelMsg: ChatMessage = { id: (Date.now()+1).toString(), role: 'model', text: response };
    setChatMessages(prev => [...prev, modelMsg]);
    setIsChatLoading(false);
  };

  const handleLogin = (newUser: User, newCompany?: Company) => {
    setUser(newUser);
    if (newCompany) setCompany(newCompany);
    localStorage.setItem('fortime_user', JSON.stringify(newUser));
    setActiveView(newUser.role === 'admin' ? 'admin' : 'dashboard');
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    setCompany(null);
    setActiveView('dashboard');
  };

  const handleCameraCapture = async (photo: string, loc: any) => {
    if (!user) return;
    const todayRecs = records.filter(r => r.matricula === user.matricula && r.timestamp.toLocaleDateString() === new Date().toLocaleDateString());
    const type = todayRecs.length % 2 === 0 ? 'entrada' : 'saida';
    
    const recordData = {
      userName: user.name,
      address: loc.address,
      latitude: loc.lat,
      longitude: loc.lng,
      photo,
      status: isOffline ? 'pending' : 'synchronized',
      matricula: user.matricula,
      digitalSignature: Math.random().toString(36).substring(2, 15),
      type,
      companyCode: user.companyCode,
      timestamp: new Date()
    };

    if (isOffline) {
      const offline = JSON.parse(localStorage.getItem('offline_punches') || '[]');
      offline.push({ ...recordData, timestamp: recordData.timestamp.toISOString() });
      localStorage.setItem('offline_punches', JSON.stringify(offline));
      alert("Ponto registrado offline! Sincronizará quando houver internet.");
    } else {
      await addDoc(collection(db, "records"), { ...recordData, timestamp: Timestamp.fromDate(recordData.timestamp) });
    }

    setLastPunch({ ...recordData, id: 'temp' } as PointRecord);
    setIsPunching(false);
  };

  if (!isInitialized) return null;
  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div className="flex h-screen w-screen bg-slate-100 overflow-hidden font-sans justify-center items-center p-0 md:p-4">
      <style>{`
        :root { --primary-color: #f97316; --primary-light: #fff7ed; }
        .bg-primary { background-color: var(--primary-color) !important; }
        .text-primary { color: var(--primary-color) !important; }
        .border-primary { border-color: var(--primary-color) !important; }
        .bg-primary-light { background-color: var(--primary-light) !important; }
        .shadow-primary { shadow-color: var(--primary-color) !important; }
      `}</style>
      
      <div className="h-full w-full max-w-lg bg-white shadow-2xl flex flex-col relative border-x border-slate-200 overflow-hidden md:rounded-[40px]">
        {isOffline && (
          <div className="bg-red-500 text-white text-[8px] font-black uppercase tracking-widest py-1 text-center animate-pulse z-[60]">
            Modo Offline Ativo - Registros serão salvos localmente
          </div>
        )}
        
        <Sidebar user={user} company={company} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} onNavigate={(v) => { if(v==='chat') setActiveView('chat'); else handleNavigation(v); }} activeView={activeView} />
        
        <header className="px-6 py-6 flex items-center justify-between border-b border-slate-50 bg-white sticky top-0 z-10 shrink-0">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 text-slate-800 focus:outline-none hover:bg-slate-50 rounded-2xl transition-colors">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8h16M4 16h16" /></svg>
          </button>
          <div className="text-center">
            {company?.logoUrl ? <img src={company.logoUrl} className="h-10 object-contain mb-1" /> : <p className="text-[11px] font-bold text-primary uppercase tracking-[0.2em]">{company?.name || 'ForTime PRO'}</p>}
          </div>
          <button onClick={() => setActiveView('profile')} className="w-11 h-11 rounded-2xl overflow-hidden border border-slate-100 shadow-sm transition-transform active:scale-90">
             <img src={user.photo || `https://ui-avatars.com/api/?name=${user.name}`} className="w-full h-full object-cover" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar pb-10 bg-slate-50/30">
          <div className="max-w-md mx-auto w-full h-full">
            {activeView === 'dashboard' && <Dashboard onPunchClick={() => setIsPunching(true)} lastPunch={records.filter(r => r.matricula === user.matricula)[0]} onNavigate={setActiveView} user={user} />}
            {activeView === 'mypoint' && <MyPoint records={records.filter(r => r.matricula === user.matricula)} />}
            {activeView === 'card' && <AttendanceCard records={records.filter(r => r.matricula === user.matricula)} />}
            {activeView === 'requests' && <Requests />}
            {activeView === 'chat' && <ChatArea messages={chatMessages} onSendMessage={handleSendMessage} isLoading={isChatLoading} />}
            {(['admin', 'shifts', 'calendar', 'vacations', 'aprovacoes', 'contabilidade'].includes(activeView)) && 
              <AdminDashboard 
                latestRecords={records} company={company} employees={employees} 
                onAddEmployee={async (e) => await addDoc(collection(db, "employees"), { ...e, companyCode: user.companyCode, status: 'active', hasFacialRecord: false })} 
                onDeleteEmployee={async (id) => confirm("Excluir?") && await deleteDoc(doc(db, "employees", id))} 
                onUpdateIP={async (ip) => await updateDoc(doc(db, "companies", user.companyCode), { authorizedIP: ip })}
                initialTab={
                  activeView === 'shifts' ? 'jornada' : activeView === 'calendar' ? 'calendario' : 
                  activeView === 'vacations' ? 'ferias' : activeView === 'contabilidade' ? 'contabilidade' : 
                  activeView === 'aprovacoes' ? 'aprovacoes' : 'colaboradores'
                }
              />
            }
            {activeView === 'profile' && <Profile user={user} company={company} />}
          </div>
        </main>

        {activeView === 'dashboard' && (
           <button 
             onClick={() => setActiveView('chat')}
             className="fixed bottom-24 right-8 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all z-[100]"
           >
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
           </button>
        )}

        {isPunching && <PunchCamera geofenceConfig={company?.geofence} onCapture={handleCameraCapture} onCancel={() => setIsPunching(false)} />}
        {lastPunch && <PunchSuccess record={lastPunch} onClose={() => setLastPunch(null)} />}
      </div>
    </div>
  );

  function handleNavigation(view: string) {
    if (view === 'logout') { handleLogout(); return; }
    if (user?.role === 'admin' && view === 'requests') { setActiveView('aprovacoes'); } 
    else { setActiveView(view as any); }
    setIsSidebarOpen(false);
  }
};

export default App;
