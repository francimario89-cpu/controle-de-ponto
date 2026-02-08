
import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
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
import Profile from './components/Profile';
import CompanyProfile from './components/CompanyProfile';
import BottomNav from './components/BottomNav';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('fortime_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [company, setCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<PointRecord[]>([]);
  const [activeView, setActiveView] = useState('dashboard');
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
          const timestamp = data.timestamp?.toDate ? data.timestamp.toDate() : (data.timestamp ? new Date(data.timestamp) : new Date());
          recs.push({ 
            ...data, 
            id: d.id, 
            timestamp: timestamp
          } as PointRecord);
        });
        // Ordenação robusta em memória para evitar erros de índice no Firebase
        setRecords(recs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
      }, (err) => {
        console.error("Erro ao sincronizar Livro de Ponto:", err);
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

  const handlePunch = async (photo: string, location: { lat: number; lng: number; address: string }, mood: string) => {
    if (!user) return;
    const signature = `PX-${user.matricula || 'N/A'}-${Date.now()}`;
    const newRecordData = {
      userName: user.name,
      matricula: user.matricula || 'N/A',
      timestamp: new Date(),
      address: location.address,
      latitude: location.lat,
      longitude: location.lng,
      photo: photo,
      status: 'synchronized' as const,
      digitalSignature: signature,
      type: 'entrada' as const,
      companyCode: user.companyCode,
      mood: mood
    };

    try {
      const docRef = await addDoc(collection(db, "records"), newRecordData);
      const recordWithId = { ...newRecordData, id: docRef.id } as PointRecord;
      setLastPunch(recordWithId);
      setShowPunchCamera(false);
    } catch (err) {
      alert("Falha ao salvar o ponto. Verifique sua conexão.");
    }
  };

  const isAdmin = user?.role === 'admin';
  const isAdminView = isAdmin && ['dashboard', 'colaboradores', 'aprovacoes', 'saldos', 'audit', 'company_profile'].includes(activeView);

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div className="flex h-screen w-screen bg-slate-50 dark:bg-slate-950 text-slate-900 overflow-hidden font-sans">
      <Sidebar 
        user={user} 
        company={company} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        onNavigate={(v) => { if (v === 'logout') handleLogout(); else setActiveView(v); }}
        activeView={activeView}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="md:hidden p-4 flex justify-between items-center bg-white dark:bg-slate-900 z-30">
           <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 dark:text-slate-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
           </button>
           <h1 className="text-sm font-black tracking-tighter uppercase dark:text-white">Ponto<span className="text-orange-600">Exato</span></h1>
           <div className="w-10"></div>
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar">
          <div className={`mx-auto w-full h-full ${isAdminView ? 'p-6 md:p-10' : 'max-w-md p-4'}`}>
            {!isAdmin ? (
              <>
                {activeView === 'dashboard' && <Dashboard user={user} lastPunch={records[0]} records={records.filter(r => r.matricula === user.matricula)} onPunchClick={() => setShowPunchCamera(true)} onNavigate={setActiveView} />}
                {activeView === 'mypoint' && <MyPoint records={records.filter(r => r.matricula === user.matricula)} />}
                {activeView === 'card' && <AttendanceCard records={records.filter(r => r.matricula === user.matricula)} company={company} />}
                {activeView === 'requests' && <Requests />}
                {activeView === 'assistant' && <AiAssistant user={user} records={records.filter(r => r.matricula === user.matricula)} />}
                {activeView === 'profile' && <Profile user={user} company={company} onLogout={handleLogout} />}
              </>
            ) : (
              <AdminDashboard 
                latestRecords={records} 
                company={company} 
                employees={employees} 
                onAddEmployee={async (e) => {
                  try {
                    await addDoc(collection(db, "employees"), { 
                      ...e, 
                      companyCode: user.companyCode, 
                      status: 'active', 
                      photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(e.name)}&background=f97316&color=fff`,
                      hasFacialRecord: false 
                    });
                    alert("COLABORADOR CADASTRADO!");
                  } catch (err) { alert("ERRO AO SALVAR NO FIREBASE."); }
                }} 
                onDeleteEmployee={async (id) => { if(confirm("DESEJA REALMENTE EXCLUIR ESTE COLABORADOR?")) await deleteDoc(doc(db, "employees", id)); }} 
                onUpdateEmployee={async (id, data) => { await updateDoc(doc(db, "employees", id), data); }}
                onUpdateIP={() => {}}
                initialTab={activeView as any}
                onNavigate={setActiveView}
              />
            )}
            {activeView === 'company_profile' && <CompanyProfile company={company} />}
          </div>
        </main>

        {!isAdmin && <BottomNav activeView={activeView} onNavigate={setActiveView} />}
        {!isAdmin && showPunchCamera && <PunchCamera geofenceConfig={company?.geofence} onCapture={handlePunch} onCancel={() => setShowPunchCamera(false)} />}
        {!isAdmin && lastPunch && <PunchSuccess record={lastPunch} onClose={() => setLastPunch(null)} />}
      </div>
    </div>
  );
};

export default App;
