
import React, { useState } from 'react';
import { User, Company } from '../types';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, limit, setDoc, updateDoc } from "firebase/firestore";

interface LoginProps {
  onLogin: (user: User, company?: Company) => void;
}

const MASTER_KEY = "FORTIME2025"; 

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [role, setRole] = useState<'admin' | 'employee' | 'totem' | null>(null);
  const [adminMode, setAdminMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [masterKey, setMasterKey] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [matricula, setMatricula] = useState('');

  const handleAdminAuth = async () => {
    setLoading(true); setError(''); setSuccessMessage('');
    try {
      if (adminMode === 'signup') {
        if (masterKey !== MASTER_KEY) { setError('CHAVE MESTRA INVÁLIDA'); setLoading(false); return; }
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const comp: Company = { id: code, name: companyName, cnpj: '', address: '', accessCode: code, adminEmail: email, adminPassword: password };
        await setDoc(doc(db, "companies", code), comp);
        onLogin({ name: "ADMIN", email, companyCode: code, role: 'admin' }, comp);
      } else if (adminMode === 'login') {
        const q = query(collection(db, "companies"), where("adminEmail", "==", email), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const c = snap.docs[0].data() as Company;
          if (c.adminPassword === password) {
            onLogin({ name: "ADMIN", email: c.adminEmail, companyCode: c.accessCode, role: 'admin' }, c);
          } else {
            setError('SENHA INCORRETA');
          }
        } else setError('USUÁRIO NÃO ENCONTRADO');
      } else if (adminMode === 'forgot') {
        if (masterKey !== MASTER_KEY) { setError('CHAVE MESTRA INVÁLIDA'); setLoading(false); return; }
        const q = query(collection(db, "companies"), where("adminEmail", "==", email), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const compRef = doc(db, "companies", snap.docs[0].id);
          await updateDoc(compRef, { adminPassword: newPassword });
          setSuccessMessage('SENHA REDEFINIDA COM SUCESSO!');
          setTimeout(() => setAdminMode('login'), 2000);
        } else setError('E-MAIL NÃO VINCULADO A NENHUMA EMPRESA');
      }
    } catch { setError('ERRO TÉCNICO AO PROCESSAR'); }
    setLoading(false);
  };

  const handleEmployeeLogin = async () => {
    setLoading(true); setError('');
    try {
      const compDoc = await getDoc(doc(db, "companies", companyCode));
      if (!compDoc.exists()) throw new Error('CÓDIGO DA EMPRESA INVÁLIDO');
      const q = query(collection(db, "employees"), where("companyCode", "==", companyCode), where("matricula", "==", matricula));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const emp = snap.docs[0].data();
        if (emp.password === password) {
          onLogin({
            name: emp.name, companyCode, companyName: compDoc.data().name, role: 'employee', 
            matricula, photo: emp.photo || '', hasFacialRecord: emp.hasFacialRecord === true
          });
        } else setError('SENHA DE ACESSO ERRADA');
      } else setError('COLABORADOR NÃO CADASTRADO');
    } catch (e: any) { setError(e.message.toUpperCase()); }
    setLoading(false);
  };

  return (
    <div className="h-screen w-screen bg-orange-50 dark:bg-slate-950 flex flex-col items-center justify-center p-8 max-w-md mx-auto transition-colors">
      <div className="mb-10 text-center animate-in zoom-in duration-500">
        <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-3xl shadow-xl flex items-center justify-center mx-auto mb-4 border dark:border-slate-800"><span className="text-3xl">⏰</span></div>
        <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">ForTime <span className="text-orange-500">PRO</span></h1>
      </div>

      <div className="w-full bg-white dark:bg-slate-900 rounded-[40px] p-8 shadow-2xl border dark:border-slate-800">
        {error && <p className="text-[10px] text-red-500 font-black mb-4 text-center bg-red-50 dark:bg-red-950/20 p-3 rounded-2xl animate-bounce">{error}</p>}
        {successMessage && <p className="text-[10px] text-emerald-500 font-black mb-4 text-center bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-2xl">{successMessage}</p>}
        
        {!role ? (
          <div className="space-y-3">
            <button onClick={() => setRole('admin')} className="w-full p-6 border-2 dark:border-slate-800 rounded-3xl flex items-center gap-4 hover:bg-orange-50 dark:hover:bg-slate-800 transition-all text-left">
              <span className="text-3xl">📊</span>
              <div>
                 <p className="font-black text-orange-600 text-[11px] uppercase tracking-widest">Painel Gestor</p>
                 <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">RH e Administração</p>
              </div>
            </button>
            <button onClick={() => setRole('employee')} className="w-full p-6 border-2 dark:border-slate-800 rounded-3xl flex items-center gap-4 hover:bg-orange-50 dark:hover:bg-slate-800 transition-all text-left">
              <span className="text-3xl">👤</span>
              <div>
                 <p className="font-black text-orange-600 text-[11px] uppercase tracking-widest">Colaborador</p>
                 <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Meu Ponto e Extrato</p>
              </div>
            </button>
            <button onClick={() => setRole('totem')} className="w-full p-6 border-2 dark:border-slate-800 rounded-3xl flex items-center gap-4 hover:bg-orange-50 dark:hover:bg-slate-800 transition-all text-left">
              <span className="text-3xl">📟</span>
              <div>
                 <p className="font-black text-orange-600 text-[11px] uppercase tracking-widest">Modo Totem</p>
                 <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Terminal na Empresa</p>
              </div>
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-in slide-in-from-bottom-4">
            {role === 'admin' ? (
              <>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-2">
                  <button onClick={() => setAdminMode('login')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${adminMode === 'login' ? 'bg-white dark:bg-slate-700 text-orange-600 shadow-sm' : 'text-slate-400'}`}>ENTRAR</button>
                  <button onClick={() => setAdminMode('signup')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${adminMode === 'signup' ? 'bg-white dark:bg-slate-700 text-orange-600 shadow-sm' : 'text-slate-400'}`}>NOVO</button>
                </div>
                
                {adminMode === 'forgot' ? (
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-500 uppercase text-center mb-2 tracking-widest">Recuperação de Acesso</p>
                    <input type="email" placeholder="E-MAIL DE GESTOR" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[11px] font-black outline-none dark:text-white" />
                    <input type="text" placeholder="CHAVE MESTRA (MASTER KEY)" value={masterKey} onChange={e => setMasterKey(e.target.value.toUpperCase())} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[11px] font-black outline-none dark:text-white border-2 border-orange-200 focus:border-orange-500" />
                    <input type="password" placeholder="NOVA SENHA" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[11px] font-black outline-none dark:text-white" />
                    <button onClick={handleAdminAuth} className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">{loading ? 'PROCESSANDO...' : 'REDEFINIR SENHA'}</button>
                  </div>
                ) : (
                  <>
                    {adminMode === 'signup' && (
                      <>
                        <input type="text" placeholder="CHAVE MESTRA" value={masterKey} onChange={e => setMasterKey(e.target.value.toUpperCase())} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[11px] font-black outline-none dark:text-white" />
                        <input type="text" placeholder="NOME DA EMPRESA" value={companyName} onChange={e => setCompanyName(e.target.value.toUpperCase())} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[11px] font-black outline-none dark:text-white" />
                      </>
                    )}
                    <input type="email" placeholder="E-MAIL ADMINISTRATIVO" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[11px] font-black outline-none dark:text-white" />
                    <input type="password" placeholder="SENHA" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[11px] font-black outline-none dark:text-white" />
                    <button onClick={handleAdminAuth} className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">{loading ? 'AUTENTICANDO...' : (adminMode === 'signup' ? 'CRIAR CONTA' : 'ACESSAR PAINEL')}</button>
                    
                    {adminMode === 'login' && (
                      <button onClick={() => setAdminMode('forgot')} className="w-full text-[9px] text-primary font-black uppercase text-center mt-2 tracking-widest hover:underline">Esqueci minha senha</button>
                    )}
                  </>
                )}
              </>
            ) : role === 'employee' ? (
              <>
                <input type="text" placeholder="CÓDIGO EMPRESA" value={companyCode} onChange={e => setCompanyCode(e.target.value.toUpperCase())} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[11px] font-black text-center tracking-[0.3em] outline-none dark:text-white" />
                <input type="text" placeholder="MATRÍCULA" value={matricula} onChange={e => setMatricula(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[11px] font-black outline-none dark:text-white" />
                <input type="password" placeholder="SENHA" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[11px] font-black outline-none dark:text-white" />
                <button onClick={handleEmployeeLogin} className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">{loading ? 'VALIDANDO...' : 'ENTRAR NO SISTEMA'}</button>
              </>
            ) : (
              <>
                <p className="text-[9px] font-black text-slate-400 uppercase text-center mb-4 tracking-widest">Configuração de Terminal</p>
                <input type="text" placeholder="CÓDIGO DA EMPRESA" value={companyCode} onChange={e => setCompanyCode(e.target.value.toUpperCase())} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[11px] font-black text-center tracking-[0.5em] outline-none dark:text-white" />
                <button onClick={async () => {
                  try {
                    const docSnap = await getDoc(doc(db, "companies", companyCode));
                    if (docSnap.exists()) onLogin({ name: "TOTEM", email: '', companyCode, role: 'totem' }, docSnap.data() as Company);
                    else setError('CÓDIGO DE EMPRESA INVÁLIDO');
                  } catch { setError('ERRO DE CONEXÃO'); }
                }} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl">ATIVAR TERMINAL TOTEM</button>
              </>
            )}
            <button onClick={() => { setRole(null); setAdminMode('login'); setError(''); setSuccessMessage(''); }} className="w-full text-[9px] text-slate-400 font-black uppercase text-center mt-6 tracking-widest hover:text-slate-600 transition-colors">Voltar para Seleção</button>
          </div>
        )}
      </div>
      
      <p className="fixed bottom-10 text-[8px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.5em]">ForTime PRO - Compliance Portaria 671</p>
    </div>
  );
};

export default Login;
