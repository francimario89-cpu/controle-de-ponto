
import React, { useState, useEffect, useRef } from 'react';
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
import VacationView from './components/VacationView';
import SettingsView from './components/SettingsView';
import CompaniesView from './components/CompaniesView';
import { saveOfflineRecord, getOfflineRecords, syncOfflineRecords } from './utils/offlineStorage';
import { TEST_DEMO_COMPANY, seedSampleRecords } from './utils/testUserHelper';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('fortime_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [company, setCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<PointRecord[]>([]);
  const [activeView, setActiveView] = useState(() => {
    const saved = localStorage.getItem('fortime_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.role === 'master') return 'companies';
      } catch (e) {}
    }
    return 'dashboard';
  });
  const [showPunchCamera, setShowPunchCamera] = useState(false);
  const [lastPunch, setLastPunch] = useState<PointRecord | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('fortime_dark_mode');
    return saved === 'true';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('fortime_dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [activeView]);

  useEffect(() => {
    if (user?.companyCode) {
      const unsubCompany = onSnapshot(doc(db, "companies", user.companyCode), (snapshot) => {
        if (snapshot.exists()) {
          setCompany({ id: snapshot.id, ...snapshot.data() } as Company);
        } else if (user.companyCode === 'DEMO') {
          setCompany(TEST_DEMO_COMPANY);
        }
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

        // Mesclar registros offline pendentes no dispositivo
        const offlineQueue = getOfflineRecords().map(o => ({
          ...o,
          timestamp: new Date(o.timestamp),
          status: 'pending' as const
        }));

        const allRecords = [...offlineQueue, ...recs.filter(r => !offlineQueue.some(o => o.id === r.id))];
        setRecords(allRecords.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
      }, (err) => {
        console.error("Erro ao sincronizar Livro de Ponto:", err);
      });

      // Auto-sincronizar quando a conexão estiver ativa
      const handleOnlineSync = async () => {
        if (navigator.onLine) {
          try {
            await syncOfflineRecords(db);
          } catch (e) {
            console.error("Falha ao auto-sincronizar fila offline:", e);
          }
        }
      };

      window.addEventListener('online', handleOnlineSync);
      window.addEventListener('pontoexato_offline_change', handleOnlineSync);
      handleOnlineSync();

      return () => {
        unsubCompany();
        unsubEmployees();
        unsubRecords();
        window.removeEventListener('online', handleOnlineSync);
        window.removeEventListener('pontoexato_offline_change', handleOnlineSync);
      };
    }
  }, [user?.companyCode]);

  const handleLogin = (u: User, c?: Company) => {
    setUser(u);
    if (c) setCompany(c);
    localStorage.setItem('fortime_user', JSON.stringify(u));
    if (u.role === 'master') {
      setActiveView('companies');
    } else {
      setActiveView('dashboard');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setCompany(null);
    localStorage.removeItem('fortime_user');
    setActiveView('dashboard');
  };

  // Determinar a próxima batida sugerida para o colaborador hoje
  const getSuggestedPunchType = (userMatricula?: string, userName?: string): 'entrada' | 'inicio_intervalo' | 'fim_intervalo' | 'saida' => {
    const todayStr = new Date().toDateString();
    const todayUserRecords = records
      .filter(r => {
        const matchesMatricula = userMatricula && r.matricula && String(r.matricula).trim().toLowerCase() === String(userMatricula).trim().toLowerCase();
        const matchesName = userName && r.userName && r.userName.trim().toLowerCase() === userName.trim().toLowerCase();
        const matchesDate = new Date(r.timestamp).toDateString() === todayStr;
        return (matchesMatricula || matchesName) && matchesDate;
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (todayUserRecords.length === 0) return 'entrada';
    const lastType = todayUserRecords[todayUserRecords.length - 1].type;
    if (lastType === 'entrada') return 'inicio_intervalo';
    if (lastType === 'inicio_intervalo') return 'fim_intervalo';
    if (lastType === 'fim_intervalo') return 'saida';
    return 'entrada';
  };

  const handlePunch = async (
    photo: string, 
    location: { lat: number; lng: number; address: string }, 
    mood: string,
    punchType?: 'entrada' | 'inicio_intervalo' | 'fim_intervalo' | 'saida'
  ) => {
    if (!user) return;
    const signature = `PX-${user.matricula || 'N/A'}-${Date.now()}`;
    
    // Se o colaborador escolheu um tipo específico na tela, usa ele; senão, calcula inteligentemente
    const currentType = punchType || getSuggestedPunchType(user.matricula, user.name);

    const baseRecordData = {
      userName: user.name,
      matricula: user.matricula || 'N/A',
      timestamp: new Date(),
      address: location.address,
      latitude: location.lat,
      longitude: location.lng,
      photo: photo,
      status: 'synchronized' as const,
      digitalSignature: signature,
      type: currentType,
      companyCode: user.companyCode || '',
      mood: mood
    };

    // Caso o dispositivo esteja offline, salva localmente
    if (!navigator.onLine) {
      const offlineRecord = saveOfflineRecord(baseRecordData);
      setLastPunch(offlineRecord);
      setRecords(prev => [offlineRecord, ...prev]);
      setShowPunchCamera(false);
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "records"), baseRecordData);
      const recordWithId = { ...baseRecordData, id: docRef.id } as PointRecord;
      setLastPunch(recordWithId);
      setShowPunchCamera(false);
    } catch (err) {
      console.warn("Falha de rede ao contatar o Firebase. Salvando no modo offline local:", err);
      const offlineRecord = saveOfflineRecord(baseRecordData);
      setLastPunch(offlineRecord);
      setRecords(prev => [offlineRecord, ...prev]);
      setShowPunchCamera(false);
    }
  };

  const isMaster = user?.role === 'master';
  const isAdmin = user?.role === 'admin' || isMaster;
  const isAdminView = isAdmin && ['companies', 'dashboard', 'colaboradores', 'aprovacoes', 'feriados', 'saldos', 'company_profile', 'ferias', 'correcao', 'pontos_individuais'].includes(activeView);

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
        {/* Barra de Simulação do Colaborador Temporário */}
        {(user.isTemporary || user.matricula === 'TEMP-2026') && (
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white px-4 py-2 flex items-center justify-between text-[10px] font-black uppercase tracking-wider z-40 shadow-sm shrink-0">
            <div className="flex items-center gap-2 truncate">
              <span className="bg-black/20 px-2 py-0.5 rounded-full text-[8px] font-bold">🧪 SIMULAÇÃO</span>
              <span className="truncate">Colaborador Temporário (TEMP-2026)</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button 
                onClick={async () => {
                  if (window.confirm("Deseja regerar as batidas de teste?")) {
                    await seedSampleRecords(db);
                    alert("Batidas de teste regeradas com sucesso!");
                  }
                }} 
                className="underline hover:text-white/80 text-[9px] lowercase font-semibold"
              >
                regerar batidas
              </button>
              <button 
                onClick={handleLogout} 
                className="bg-white text-orange-600 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase hover:bg-orange-50 active:scale-95 transition-all shadow-sm"
              >
                Sair
              </button>
            </div>
          </div>
        )}

        <header className="md:hidden p-4 flex justify-between items-center bg-white dark:bg-slate-900 z-30">
           <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 dark:text-slate-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
           </button>
           <h1 className="text-sm font-black tracking-tighter uppercase dark:text-white">Ponto<span className="text-orange-600">Exato</span></h1>
           <div className="w-10"></div>
        </header>

        <main ref={mainRef} className="flex-1 overflow-y-auto no-scrollbar">
          <div className={`mx-auto w-full min-h-full ${isAdminView ? 'p-3 md:p-8 pt-2 md:pt-4' : 'max-w-md p-2 sm:p-4'}`}>
            {activeView === 'companies' ? (
              <CompaniesView />
            ) : !isAdmin ? (
              <>
                {activeView === 'dashboard' && <Dashboard user={user} lastPunch={records[0]} records={records.filter(r => r.matricula === user.matricula)} onPunchClick={() => setShowPunchCamera(true)} onNavigate={setActiveView} />}
                {activeView === 'mypoint' && <MyPoint records={records.filter(r => r.matricula === user.matricula)} company={company} />}
                {activeView === 'card' && <AttendanceCard records={records.filter(r => r.matricula === user.matricula)} company={company} />}
                {activeView === 'requests' && <Requests />}
                {activeView === 'assistant' && <AiAssistant user={user} records={records.filter(r => r.matricula === user.matricula)} />}
                {activeView === 'profile' && <Profile user={user} company={company} onLogout={handleLogout} />}
                {activeView === 'vacation' && <VacationView user={user} />}
                {activeView === 'settings' && <SettingsView user={user} onBack={() => setActiveView('dashboard')} isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode(!isDarkMode)} />}
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
                onDeleteEmployee={async (id) => {
                  try {
                    await deleteDoc(doc(db, "employees", id));
                    alert("COLABORADOR EXCLUÍDO COM SUCESSO!");
                  } catch (err) {
                    alert("ERRO AO EXCLUIR COLABORADOR.");
                  }
                }} 
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
        {!isAdmin && showPunchCamera && (
          <PunchCamera 
            geofenceConfig={company?.geofence} 
            authorizedIP={company?.authorizedIP} 
            defaultPunchType={getSuggestedPunchType(user?.matricula, user?.name)}
            onCapture={handlePunch} 
            onCancel={() => setShowPunchCamera(false)} 
          />
        )}
        {!isAdmin && lastPunch && <PunchSuccess record={lastPunch} onClose={() => setLastPunch(null)} company={company} />}
      </div>
    </div>
  );
};

export default App;
