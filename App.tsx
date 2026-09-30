
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
import { SyncCenterModal } from './components/SyncCenterModal';
import { saveOfflineRecord, getOfflineRecords, syncOfflineRecords, generatePunchId, getLastSyncTime } from './utils/offlineStorage';
import { TEST_DEMO_COMPANY, seedSampleRecords } from './utils/testUserHelper';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('fortime_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [company, setCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<PointRecord[]>([]);
  const [showSyncCenterModal, setShowSyncCenterModal] = useState(false);
  const [syncStatusBanner, setSyncStatusBanner] = useState<{
    title: string;
    subtitle: string;
    isProgress?: boolean;
    progress?: number;
    statusType?: 'success' | 'offline' | 'restoring';
  } | null>(null);
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
    const handleUserUpdate = (e: any) => {
      if (e.detail) {
        setUser(prev => prev ? ({ ...prev, ...e.detail }) : prev);
      }
    };
    window.addEventListener('pontoexato_user_updated', handleUserUpdate);
    return () => window.removeEventListener('pontoexato_user_updated', handleUserUpdate);
  }, []);

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
          const queue = getOfflineRecords();
          if (queue.length > 0) {
            setSyncStatusBanner({
              title: '📡 Conexão restaurada',
              subtitle: `🔄 Sincronizando ${queue.length} ponto(s) aguardando envio...`,
              isProgress: true,
              progress: 25,
              statusType: 'restoring'
            });

            try {
              const { syncedCount } = await syncOfflineRecords(db, (pct, current, total) => {
                setSyncStatusBanner(prev => prev ? {
                  ...prev,
                  subtitle: `🔄 Sincronizando ${current} de ${total} ponto(s)...`,
                  progress: pct
                } : null);
              });

              if (syncedCount > 0) {
                setSyncStatusBanner({
                  title: `✅ ${syncedCount} ponto(s) sincronizado(s)!`,
                  subtitle: 'Status: 🟢 Sincronizado com o servidor',
                  isProgress: false,
                  progress: 100,
                  statusType: 'success'
                });
                setTimeout(() => setSyncStatusBanner(null), 4500);
              }
            } catch (e) {
              console.error("Falha ao auto-sincronizar fila offline:", e);
            }
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

  const handlePunch = async (
    photo: string, 
    location: { lat: number; lng: number; address: string }, 
    mood: string,
    punchTypeOverride?: 'entrada' | 'inicio_intervalo' | 'fim_intervalo' | 'saida'
  ) => {
    if (!user) return;
    const punchDate = new Date();
    const timeFormatted = punchDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const uniqueId = generatePunchId(punchDate);
    const signature = `PX-${user.matricula || 'N/A'}-${uniqueId}`;
    
    // Comparação ultra robusta para todos os colaboradores (matrícula ou nome completo)
    const isMatchingUser = (r: PointRecord) => {
      if (!r) return false;
      const rMat = String(r.matricula || '').trim().toLowerCase();
      const uMat = String(user.matricula || '').trim().toLowerCase();
      if (uMat && rMat && rMat !== 'n/a' && (rMat === uMat || rMat.padStart(4, '0') === uMat.padStart(4, '0'))) return true;
      const rName = String(r.userName || '').trim().toLowerCase();
      const uName = String(user.name || '').trim().toLowerCase();
      if (rName && uName && (rName === uName || rName.includes(uName) || uName.includes(rName))) return true;
      return false;
    };

    const isSameLocalDate = (d1: any, d2: Date) => {
      if (!d1) return false;
      const date1 = d1?.toDate ? d1.toDate() : (d1 instanceof Date ? d1 : new Date(d1));
      if (!date1 || isNaN(date1.getTime())) return false;
      return (
        date1.getFullYear() === d2.getFullYear() &&
        date1.getMonth() === d2.getMonth() &&
        date1.getDate() === d2.getDate()
      );
    };

    // Determinar o tipo da batida de acordo com as batidas de hoje
    const todayUserRecords = records
      .filter(r => isMatchingUser(r) && isSameLocalDate(r.timestamp, punchDate))
      .sort((a, b) => {
        const da = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime();
        const db = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime();
        return da - db;
      });

    const punchTypes: ('entrada' | 'inicio_intervalo' | 'fim_intervalo' | 'saida')[] = ['entrada', 'inicio_intervalo', 'fim_intervalo', 'saida'];
    const autoSuggestedType = punchTypes[Math.min(todayUserRecords.length, 3)] || 'entrada';
    const currentType = punchTypeOverride || autoSuggestedType;
    const typeLabel = currentType === 'entrada' ? 'Entrada' : currentType === 'saida' ? 'Saída' : currentType === 'inicio_intervalo' ? 'Início do Intervalo' : 'Retorno do Intervalo';

    const baseRecordData = {
      uniqueId,
      userName: String(user.name || 'Colaborador'),
      matricula: String(user.matricula || 'N/A'),
      timestamp: punchDate,
      address: String(location?.address || 'Dispositivo Web'),
      latitude: Number(location?.lat) || 0,
      longitude: Number(location?.lng) || 0,
      photo: photo || 'https://ui-avatars.com/api/?name=Colaborador&background=f97316&color=fff',
      status: 'synchronized' as const,
      digitalSignature: signature,
      type: currentType,
      companyCode: String(user.companyCode || '').trim(),
      mood: String(mood || 'feliz')
    };

    // Caso o dispositivo esteja offline, salva localmente
    if (!navigator.onLine) {
      const offlineRecord = saveOfflineRecord(baseRecordData);
      setLastPunch(offlineRecord);
      setRecords(prev => [offlineRecord, ...prev]);
      setShowPunchCamera(false);
      setSyncStatusBanner({
        title: '⚠️ Sem conexão com a internet',
        subtitle: `Seu ponto (${timeFormatted} — ${typeLabel}) foi salvo no dispositivo (${uniqueId}) e será sincronizado automaticamente quando a conexão retornar.`,
        statusType: 'offline'
      });
      setTimeout(() => setSyncStatusBanner(null), 6000);
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "records"), baseRecordData);
      const recordWithId = { ...baseRecordData, id: docRef.id } as PointRecord;
      setLastPunch(recordWithId);
      setShowPunchCamera(false);
      setSyncStatusBanner({
        title: '✅ Ponto registrado com sucesso',
        subtitle: `${timeFormatted} — ${typeLabel} • Registro sincronizado com o servidor em tempo real (${uniqueId})`,
        statusType: 'success'
      });
      setTimeout(() => setSyncStatusBanner(null), 4500);
    } catch (err) {
      console.warn("Falha de rede ao contatar o Firebase. Salvando no modo offline local:", err);
      const offlineRecord = saveOfflineRecord(baseRecordData);
      setLastPunch(offlineRecord);
      setRecords(prev => [offlineRecord, ...prev]);
      setShowPunchCamera(false);
      setSyncStatusBanner({
        title: '⚠️ Sem conexão com a internet',
        subtitle: `Seu ponto (${timeFormatted} — ${typeLabel}) foi salvo no dispositivo (${uniqueId}) e será sincronizado quando a conexão retornar.`,
        statusType: 'offline'
      });
      setTimeout(() => setSyncStatusBanner(null), 6000);
    }
  };

  const userFilteredRecords = useMemo(() => {
    if (!user) return [];
    const isMatchingCurrentUser = (r: PointRecord) => {
      if (!r) return false;
      const rMat = String(r.matricula || '').trim().toLowerCase();
      const uMat = String(user.matricula || '').trim().toLowerCase();
      if (uMat && rMat && rMat !== 'n/a' && (rMat === uMat || rMat.padStart(4, '0') === uMat.padStart(4, '0'))) return true;
      const rName = String(r.userName || '').trim().toLowerCase();
      const uName = String(user.name || '').trim().toLowerCase();
      if (rName && uName && (rName === uName || rName.includes(uName) || uName.includes(rName))) return true;
      return false;
    };
    return records.filter(isMatchingCurrentUser);
  }, [records, user]);

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
        onNavigate={(v) => { 
          if (v === 'logout') handleLogout(); 
          else if (v === 'sync') setShowSyncCenterModal(true);
          else setActiveView(v); 
        }}
        activeView={activeView}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Banner de Status de Sincronização em Tempo Real */}
        {syncStatusBanner && (
          <div className={`px-4 py-2.5 text-white flex items-center justify-between text-[11px] font-bold z-50 shrink-0 shadow-md animate-in slide-in-from-top-2 ${
            syncStatusBanner.statusType === 'offline' 
              ? 'bg-amber-600' 
              : syncStatusBanner.statusType === 'restoring'
              ? 'bg-blue-600'
              : 'bg-emerald-600'
          }`}>
            <div className="flex items-center gap-2.5 flex-1 pr-2">
              <span className="text-base">
                {syncStatusBanner.statusType === 'offline' ? '⚠️' : syncStatusBanner.statusType === 'restoring' ? '🔄' : '✅'}
              </span>
              <div>
                <p className="font-black uppercase text-[10px] tracking-wider">{syncStatusBanner.title}</p>
                <p className="text-[9px] opacity-90">{syncStatusBanner.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSyncCenterModal(true)}
                className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-[9px] font-black uppercase tracking-wider"
              >
                Ver Fila
              </button>
              <button onClick={() => setSyncStatusBanner(null)} className="opacity-70 hover:opacity-100 text-xs">
                ✕
              </button>
            </div>
          </div>
        )}

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

        <header className="md:hidden p-4 flex justify-between items-center bg-white dark:bg-slate-900 z-30 border-b dark:border-slate-800">
           <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 dark:text-slate-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
           </button>
           <h1 className="text-sm font-black tracking-tighter uppercase dark:text-white">Ponto<span className="text-orange-600">Exato</span></h1>
           <button 
             onClick={() => setShowSyncCenterModal(true)} 
             className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
             title="Status da Sincronização"
           >
             {navigator.onLine ? '🟢 Online' : '🔴 Offline'}
           </button>
        </header>

        <main ref={mainRef} className="flex-1 overflow-y-auto no-scrollbar">
          <div className={`mx-auto w-full min-h-full ${isAdminView ? 'p-4 md:p-8 pt-2 md:pt-4' : 'max-w-md p-4'}`}>
            {activeView === 'companies' ? (
              <CompaniesView />
            ) : !isAdmin ? (
              <>
                {activeView === 'dashboard' && <Dashboard user={user} lastPunch={userFilteredRecords[0]} records={userFilteredRecords} onPunchClick={() => setShowPunchCamera(true)} onNavigate={setActiveView} />}
                {activeView === 'mypoint' && <MyPoint records={userFilteredRecords} user={user} company={company} onNavigate={setActiveView} />}
                {activeView === 'card' && <AttendanceCard records={userFilteredRecords} company={company} />}
                {activeView === 'requests' && <Requests />}
                {activeView === 'sync' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-[35px] p-6 border dark:border-slate-800 shadow-sm text-center space-y-4">
                      <div className="w-16 h-16 bg-orange-100 dark:bg-orange-950/40 text-orange-600 rounded-3xl flex items-center justify-center mx-auto text-2xl font-black">
                        🔄
                      </div>
                      <div>
                        <h2 className="text-base font-black uppercase text-slate-800 dark:text-white">Central de Sincronização</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Status de Conectividade e Fila Local</p>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        O PontoExato funciona 100% offline. Quando você estiver sem sinal, suas marcações ficam salvas com criptografia e chave anti-duplicidade no dispositivo e são transmitidas assim que a internet retornar.
                      </p>
                      <button
                        onClick={() => setShowSyncCenterModal(true)}
                        className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase text-xs tracking-wider shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        Abrir Fila de Sincronização
                      </button>
                    </div>
                  </div>
                )}
                {activeView === 'assistant' && <AiAssistant user={user} records={userFilteredRecords} />}
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
        {!isAdmin && showPunchCamera && (() => {
          const now = new Date();
          const todayUserRecords = userFilteredRecords.filter(r => {
            const d = r.timestamp?.toDate ? r.timestamp.toDate() : (r.timestamp instanceof Date ? r.timestamp : new Date(r.timestamp));
            return d && !isNaN(d.getTime()) && 
              d.getFullYear() === now.getFullYear() && 
              d.getMonth() === now.getMonth() && 
              d.getDate() === now.getDate();
          }).sort((a, b) => {
            const da = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime();
            const db = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime();
            return da - db;
          });

          let suggestedType: 'entrada' | 'inicio_intervalo' | 'fim_intervalo' | 'saida' = 'entrada';
          if (todayUserRecords.length === 0) {
            suggestedType = 'entrada';
          } else if (todayUserRecords.length === 1) {
            suggestedType = 'inicio_intervalo';
          } else if (todayUserRecords.length === 2) {
            const hasInterval = todayUserRecords.some(r => r.type === 'inicio_intervalo');
            suggestedType = hasInterval ? 'fim_intervalo' : 'saida';
          } else if (todayUserRecords.length === 3) {
            suggestedType = 'saida';
          } else {
            suggestedType = 'saida';
          }

          return (
            <PunchCamera 
              geofenceConfig={company?.geofence} 
              authorizedIP={company?.authorizedIP} 
              defaultPunchType={suggestedType}
              todayPunchesCount={todayUserRecords.length}
              onCapture={handlePunch} 
              onCancel={() => setShowPunchCamera(false)} 
            />
          );
        })()}
        {!isAdmin && lastPunch && <PunchSuccess record={lastPunch} onClose={() => setLastPunch(null)} />}

        {/* Modal de Sincronização / Fila Local */}
        <SyncCenterModal 
          isOpen={showSyncCenterModal} 
          onClose={() => setShowSyncCenterModal(false)} 
        />
      </div>
    </div>
  );
};

export default App;
