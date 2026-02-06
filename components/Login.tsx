
import React, { useState } from 'react';
import { User, Company } from '../types';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, limit, setDoc } from "firebase/firestore";

interface LoginProps {
  onLogin: (user: User, company?: Company) => void;
}

const MASTER_KEY = "FORTIME2025"; 

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
        if (masterKey !== MASTER_KEY) { setError('Chave inválida.'); setLoading(false); return; }
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const comp: Company = { id: code, name: companyName, cnpj, address: '', accessCode: code, adminEmail: email, adminPassword: password };
        await setDoc(doc(db, "companies", code), comp);
        onLogin({ name: "Gestor RH", email, companyCode: code, role: 'admin' }, comp);
      } else {
        const q = query(collection(db, "companies"), where("adminEmail", "==", email), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty && snap.docs[0].data().adminPassword === password) {
          const c = snap.docs[0].data() as Company;
          onLogin({ name: "Gestor RH", email: c.adminEmail, companyCode: c.accessCode, role: 'admin' }, c);
        } else setError('Erro de credenciais.');
      }
    } catch { setError('Erro técnico.'); }
    setLoading(false);
  };

  const handleEmployeeLogin = async () => {
    setLoading(true); setError('');
    try {
      const compDoc = await getDoc(doc(db, "companies", companyCode));
      if (!compDoc.exists()) throw new Error('Empresa inválida');
      const q = query(collection(db, "employees"), where("companyCode", "==", companyCode), where("matricula", "==", matricula));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const emp = snap.docs[0].data();
        if (emp.password === password) {
          onLogin({
            name: emp.name, companyCode, companyName: compDoc.data().name, role: 'employee', 
            matricula, photo: emp.photo || '', hasFacialRecord: emp.hasFacialRecord === true
          });
        } else setError('Senha incorreta.');
      } else setError('Não encontrado.');
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div className="h-screen w-screen bg-orange-50 dark:bg-slate-950 flex flex-col items-center justify-center p-8 max-w-md mx-auto transition-colors">
      <div className="mb-10 text-center animate-in zoom-in duration-500">
        <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-3xl shadow-xl flex items-center justify-center mx-auto mb-4 border dark:border-slate-800"><span className="text-3xl">⏰</span></div>
        <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">ForTime <span className="text-orange-500">PRO</span></h1>
      </div>

      <div className="w-full bg-white dark:bg-slate-900 rounded-[40px] p-8 shadow-2xl border dark:border-slate-800">
        {error && <p className="text-[10px] text-red-500 font-black mb-4 text-center bg-red-50 dark:bg-red-950/20 p-3 rounded-2xl">{error}</p>}
        {!role ? (
          <div className="space-y-3">
            <button onClick={() => setRole('admin')} className="w-full p-6 border-2 dark:border-slate-800 rounded-3xl flex items-center gap-4 hover:bg-orange-50 dark:hover:bg-slate-800/50 transition-all text-left">
              <span className="text-3xl">📊</span>
              <div><p className="font-black text-orange-600 text-xs uppercase">GESTOR</p></div>
            </button>
            <button onClick={() => setRole('employee')} className="w-full p-6 border-2 dark:border-slate-800 rounded-3xl flex items-center gap-4 hover:bg-orange-50 dark:hover:bg-slate-800/50 transition-all text-left">
              <span className="text-3xl">👤</span>
              <div><p className="font-black text-orange-600 text-xs uppercase">COLABORADOR</p></div>
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-in slide-in-from-bottom-4">
            {role === 'admin' ? (
              <>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                  <button onClick={() => setAdminMode('login')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl ${adminMode === 'login' ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-white' : 'text-slate-400'}`}>ENTRAR</button>
                  <button onClick={() => setAdminMode('signup')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl ${adminMode === 'signup' ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-white' : 'text-slate-400'}`}>NOVO</button>
                </div>
                {adminMode === 'signup' && <input type="text" placeholder="CHAVE MESTRA" value={masterKey} onChange={e => setMasterKey(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs font-bold outline-none dark:text-white" />}
                <input type="email" placeholder="E-MAIL" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs font-bold outline-none dark:text-white" />
                <input type="password" placeholder="SENHA" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs font-bold outline-none dark:text-white" />
                <button onClick={handleAdminAuth} className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl">{loading ? '...' : 'ACESSAR'}</button>
              </>
            ) : (
              <>
                <input type="text" placeholder="CÓDIGO EMPRESA" value={companyCode} onChange={e => setCompanyCode(e.target.value.toUpperCase())} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs font-bold text-center tracking-widest outline-none dark:text-white" />
                <input type="text" placeholder="MATRÍCULA" value={matricula} onChange={e => setMatricula(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs font-bold outline-none dark:text-white" />
                <input type="password" placeholder="SENHA" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs font-bold outline-none dark:text-white" />
                <button onClick={handleEmployeeLogin} className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl">{loading ? '...' : 'ENTRAR'}</button>
              </>
            )}
            <button onClick={() => setRole(null)} className="w-full text-[9px] text-slate-400 font-black uppercase text-center mt-2 tracking-widest">VOLTAR</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
