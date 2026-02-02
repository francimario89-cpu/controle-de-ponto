
import React, { useState, useEffect } from 'react';
import { User, PointRecord } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import PunchCamera from './components/PunchCamera';
import PunchSuccess from './components/PunchSuccess';
import MyPoint from './components/MyPoint';
import AttendanceCard from './components/AttendanceCard';
import Requests from './components/Requests';
import AdminDashboard from './components/AdminDashboard';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'mypoint' | 'card' | 'requests' | 'admin'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPunching, setIsPunching] = useState(false);
  const [lastPunch, setLastPunch] = useState<PointRecord | null>(null);
  const [records, setRecords] = useState<PointRecord[]>([]);

  const handleLogin = (companyCode: string, email: string) => {
    setUser({
      name: 'Milu da Silva Santos',
      email,
      companyCode,
      role: 'Gestora de RH',
      photo: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=400&fit=crop'
    });
  };

  const handlePunch = (photo: string, location: { lat: number; lng: number; address: string }) => {
    const newRecord: PointRecord = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      photo,
      latitude: location.lat,
      longitude: location.lng,
      address: location.address,
      status: 'synchronized'
    };
    setRecords([newRecord, ...records]);
    setLastPunch(newRecord);
    setIsPunching(false);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen w-screen bg-slate-100 text-slate-900 font-sans overflow-hidden">
      <div className="h-full w-full max-w-md mx-auto bg-white shadow-2xl flex flex-col relative overflow-hidden border-x border-slate-200">
        <Sidebar 
          user={user}
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          onNavigate={(view) => {
            setActiveView(view as any);
            setIsSidebarOpen(false);
          }}
          activeView={activeView}
        />

        <header className="bg-white px-4 py-4 flex items-center justify-between border-b border-slate-50 sticky top-0 z-10 shadow-sm">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-[#0055b8] active:scale-90 transition-transform">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          
          <div className="flex flex-col items-center">
             <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-black text-slate-800 uppercase tracking-tight">Portal RH</span>
             </div>
             <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{activeView === 'admin' ? 'Dashboard Gestor' : 'Meu Ponto'}</span>
          </div>

          <div className="w-11 h-11 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm">
            <img src={user.photo} alt="Profile" className="w-full h-full object-cover" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto no-scrollbar bg-[#FBFCFE]">
          {activeView === 'dashboard' && <Dashboard onPunchClick={() => setIsPunching(true)} lastPunch={records[0]} />}
          {activeView === 'mypoint' && <MyPoint />}
          {activeView === 'card' && <AttendanceCard />}
          {activeView === 'requests' && <Requests />}
          {activeView === 'admin' && <AdminDashboard />}
        </div>

        {activeView !== 'admin' && (
          <div className="p-4 bg-white border-t border-slate-100 flex justify-center">
            <button 
              onClick={() => setActiveView('admin')}
              className="text-xs font-bold text-indigo-600 hover:underline"
            >
              Alternar para Painel do Gestor →
            </button>
          </div>
        )}

        {isPunching && <PunchCamera onCancel={() => setIsPunching(false)} onCapture={handlePunch} />}
        {lastPunch && <PunchSuccess record={lastPunch} onClose={() => setLastPunch(null)} />}
      </div>
    </div>
  );
};

export default App;
