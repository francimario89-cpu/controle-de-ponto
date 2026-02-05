
import React, { useState } from 'react';
import { User, Company } from '../types';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, limit, setDoc } from "firebase/firestore";

interface LoginProps {
  onLogin: (user: User, company?: Company) => void;
}

const MASTER_KEY = "FORTIME2025"; // Chave que só você (dono) sabe para criar empresas

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [role, setRole] = useState<'admin' | 'employee' | 'totem' | null>(null);
  const [adminMode, setAdminMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [companyName, setCompanyName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [masterKey, setMasterKey] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [matricula, setMatricula] = useState('');

  const handleAdminAuth = async () => {
    setLoading(true); setError('');
    try {
      if (adminMode === 'signup') {
        if (masterKey !== MASTER_KEY) {
          setError('Chave Mestra inválida. Apenas o proprietário do software pode criar empresas.');
          setLoading(false); return;
        }
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const comp: Company = { id: code, name: companyName, cnpj, address: '', accessCode: code, adminEmail: email, adminPassword: password };
        await setDoc(doc(db, "companies", code), comp);
        onLogin({ name: "Gestor RH", email, companyCode: code, companyName, role: 'admin', photo: `https://ui-avatars.com/api/?name=RH&background=f97316&color=fff` }, comp);
      } else {
        const q = query(collection(db, "companies"), where("adminEmail", "==", email), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty && snap.docs[0].data().adminPassword === password) {
          const c = snap.docs[0].data() as Company;
          onLogin({ name: "Gestor RH", email: c.adminEmail, companyCode: c.accessCode, companyName: c.name, role: 'admin', photo: `https://ui-avatars.com/api/?name=RH&background=f97316&color=fff` }, c);
        } else setError('E-mail ou senha de admin incorretos.');
      }
    } catch { setError('Erro na autenticação.'); }
    setLoading(false);
  };

  const handleEmployeeLogin = async () => {
    setLoading(true); setError('');
    try {
      const compDoc = await getDoc(doc(db, "companies", companyCode));
      if (!compDoc.exists()) throw new Error('Empresa não encontrada');
      
      const q = query(collection(db, "employees"), where("companyCode", "==", companyCode), where("matricula", "==", matricula));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const emp = snap.docs[0].data();
        if (emp.password === password) {
          onLogin({
            name: emp.name, email: emp.email, companyCode, companyName: compDoc.data().name,
            role: 'employee', matricula, photo: emp.photo, hasFacialRecord: emp.hasFacialRecord
          });
        } else setError('Senha de colaborador incorreta.');
      } else setError('Matrícula não cadastrada nesta empresa.');
    } catch (e: any) { setError(e.message || 'Erro ao conectar.'); }
    setLoading(false);
  };

  return (
    <div className="h-screen w-screen bg-orange-50 flex flex-col items-center justify-center p-8 max-w-md mx-auto relative overflow-hidden">
      <div className="mb-10 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-white rounded-3xl shadow-2xl flex items-center justify-center mx-auto mb-4 border border-orange-100 rotate-3">
          <svg className="w-12 h-12 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tighter">ForTime <span className="text-orange-500">PRO</span></h1>
        <p className="text-[10px] text-orange-400 font-bold uppercase tracking-[0.2em] mt-1">Sua empresa no controle</p>
      </div>

      <div className="w-full bg-white rounded-[44px] p-8 shadow-2xl border border-orange-50 relative z-10 transition-all">
        {loading && <div className="absolute inset-0 bg-white/80 z-20 rounded-[44px] flex items-center justify-center"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>}
        {error && <p className="text-[10px] text-red-500 font-bold mb-4 text-center bg-red-50 p-3 rounded-2xl border border-red-100">{error}</p>}

        {!role ? (
          <div className="space-y-3">
            <button onClick={() => setRole('admin')} className="w-full p-6 border-2 border-orange-100 rounded-3xl flex items-center gap-4 hover:bg-orange-50 transition-all group">
              <span className="text-3xl group-hover:scale-110 transition-transform">📊</span>
              <div className="text-left">
                <p className="font-black text-orange-600 text-xs uppercase">Gestor RH</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Minha Empresa / Admin</p>
              </div>
            </button>
            <button onClick={() => setRole('employee')} className="w-full p-6 border-2 border-orange-100 rounded-3xl flex items-center gap-4 hover:bg-orange-50 transition-all group">
              <span className="text-3xl group-hover:scale-110 transition-transform">👤</span>
              <div className="text-left">
                <p className="font-black text-orange-600 text-xs uppercase">Colaborador</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Bater Ponto / Histórico</p>
              </div>
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-in slide-in-from-bottom-4">
            {role === 'admin' ? (
              <>
                <div className="flex bg-orange-50 p-1 rounded-2xl mb-2">
                  <button onClick={() => setAdminMode('login')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${adminMode === 'login' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>Entrar</button>
                  <button onClick={() => setAdminMode('signup')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${adminMode === 'signup' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>Nova Empresa</button>
                </div>
                
                {adminMode === 'signup' && (
                  <>
                    <input type="text" placeholder="CHAVE MESTRA (DONO)" value={masterKey} onChange={e => setMasterKey(e.target.value.toUpperCase())} className="w-full p-4 bg-orange-50/50 border border-orange-100 rounded-2xl text-xs font-bold" />
                    <input type="text" placeholder="NOME DA EMPRESA" value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full p-4 bg-orange-50/50 border border-orange-100 rounded-2xl text-xs font-bold" />
                  </>
                )}
                <input type="email" placeholder="E-MAIL DO GESTOR" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-orange-50/50 border border-orange-100 rounded-2xl text-xs font-bold" />
                <input type="password" placeholder="SENHA" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-orange-50/50 border border-orange-100 rounded-2xl text-xs font-bold" />
                <button onClick={handleAdminAuth} className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl shadow-orange-100 active:scale-95 transition-all">{adminMode === 'signup' ? 'Criar Empresa' : 'Acessar Painel'}</button>
              </>
            ) : (
              <>
                <input type="text" placeholder="CÓDIGO DA EMPRESA" value={companyCode} onChange={e => setCompanyCode(e.target.value.toUpperCase())} className="w-full p-4 bg-orange-50/50 border border-orange-100 rounded-2xl text-xs font-bold text-center tracking-widest" />
                <input type="text" placeholder="SUA MATRÍCULA" value={matricula} onChange={e => setMatricula(e.target.value)} className="w-full p-4 bg-orange-50/50 border border-orange-100 rounded-2xl text-xs font-bold" />
                <input type="password" placeholder="SUA SENHA" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-orange-50/50 border border-orange-100 rounded-2xl text-xs font-bold" />
                <button onClick={handleEmployeeLogin} className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl shadow-orange-100 active:scale-95 transition-all">Entrar</button>
              </>
            )}
            <button onClick={() => {setRole(null); setError('')}} className="w-full text-[9px] text-slate-400 font-black uppercase text-center mt-2 tracking-widest">Escolher outro acesso</button>
          </div>
        )}
      </div>
      <p className="mt-8 text-[9px] text-orange-400/30 font-black uppercase tracking-[0.4em]">v3.5.1 Stable Cloud</p>
    </div>
  );
};

export default Login;
