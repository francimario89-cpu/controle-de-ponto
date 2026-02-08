
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
import ComplianceAudit from './components/ComplianceAudit';
import Profile from './components/Profile';
import CompanyProfile from './components/CompanyProfile';

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

  const handlePunch = async (photo: string, location: { lat: number; lng: number; address: string }) => {
    if (!user) return;
    const signature = `FT-${user.matricula || 'N/A'}-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
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
      companyCode: user.companyCode
    };

    try {
      const docRef = await addDoc(collection(db, "records"), newRecordData);
      const recordWithId = { ...newRecordData, id: docRef.id } as PointRecord;
      setLastPunch(recordWithId);
      setShowPunchCamera(false);
    } catch (err) {
      console.error("Erro ao registrar ponto:", err);
      alert("Falha ao salvar o ponto eletrônico.");
    }
  };

  const handleUpdateEmployee = async (id: string, data: any) => {
    try {
      await updateDoc(doc(db, "employees", id), data);
      alert("COLABORADOR ATUALIZADO!");
    } catch (err) {
      alert("ERRO AO ATUALIZAR.");
    }
  };

  const isAdmin = user?.role === 'admin';
  const isAdminView = ['colaboradores', 'aprovacoes', 'saldos', 'audit', 'company_profile'].includes(activeView) || (isAdmin && activeView === 'dashboard');

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div className="flex h-screen w-screen bg-white text-slate-900 overflow-hidden font-sans">
      <Sidebar 
        user={user} 
        company={company} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        onNavigate={(v) => { if (v === 'logout') handleLogout(); else setActiveView(v); }}
        activeView={activeView}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="md:hidden p-4 flex justify-between items-center border-b bg-white z-30">
           <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
           </button>
           <h1 className="text-sm font-black tracking-tighter uppercase">ForTime <span className="text-orange-600">PRO</span></h1>
           <div className="w-10"></div>
        </header>

        {isAdmin && (
          <header className="hidden md:flex p-6 justify-between items-center bg-white border-b px-10">
             <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Módulo Administrativo</p>
               <h2 className="text-xl font-black tracking-tighter uppercase text-slate-800">
                 Gestão de RH - {company?.name}
               </h2>
             </div>
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 text-xl">🛡️</div>
             </div>
          </header>
        )}

        <main className="flex-1 overflow-y-auto no-scrollbar">
          <div className={`mx-auto w-full h-full ${isAdminView ? 'p-6 md:p-10' : 'max-w-md p-4'}`}>
            {!isAdmin ? (
              <>
                {activeView === 'dashboard' && <Dashboard user={user} lastPunch={records[0]} onPunchClick={() => setShowPunchCamera(true)} onNavigate={setActiveView} />}
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
                    await addDoc(collection(db, "employees"), { ...e, companyCode: user.companyCode, status: 'active', photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(e.name)}&background=f97316&color=fff` });
                    alert("CADASTRADO!");
                  } catch (err) { alert("ERRO AO SALVAR."); }
                }} 
                onDeleteEmployee={async (id) => { if(confirm("EXCLUIR?")) await deleteDoc(doc(db, "employees", id)); }} 
                onUpdateEmployee={handleUpdateEmployee}
                onUpdateIP={() => {}}
                initialTab={activeView as any}
                onNavigate={setActiveView}
              />
            )}
            {activeView === 'company_profile' && <CompanyProfile company={company} />}
          </div>
        </main>

        {!isAdmin && showPunchCamera && <PunchCamera geofenceConfig={company?.geofence} onCapture={handlePunch} onCancel={() => setShowPunchCamera(false)} />}
        {!isAdmin && lastPunch && <PunchSuccess record={lastPunch} onClose={() => setLastPunch(null)} />}
      </div>
    </div>
  );
};

export default App;
