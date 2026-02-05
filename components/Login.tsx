
import React, { useState } from 'react';
import { User, Company } from '../types';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, limit, setDoc } from "firebase/firestore";

interface LoginProps {
  onLogin: (user: User, company?: Company) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [role, setRole] = useState<'admin' | 'employee' | 'totem' | null>(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [companyName, setCompanyName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [matricula, setMatricula] = useState('');

  const handleAdminAuth = async (mode: 'login' | 'signup') => {
    setLoading(true); setError('');
    try {
      if (mode === 'signup') {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const comp: Company = { id: code, name: companyName, cnpj, address: '', accessCode: code, adminEmail: email, adminPassword: password };
        await setDoc(doc(db, "companies", code), comp);
        onLogin({ name: "Gestor", email, companyCode: code, companyName, role: 'admin' }, comp);
      } else {
        const q = query(collection(db, "companies"), where("adminEmail", "==", email), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty && snap.docs[0].data().adminPassword === password) {
          const c = snap.docs[0].data() as Company;
          onLogin({ name: "Gestor", email: c.adminEmail, companyCode: c.accessCode, companyName: c.name, role: 'admin' }, c);
        } else setError('Dados inválidos.');
      }
    } catch { setError('Erro na autenticação.'); }
    setLoading(false);
  };

  const handleEmployeeLogin = async () => {
    setLoading(true); setError('');
    try {
      const compDoc = await getDoc(doc(db, "companies", companyCode));
      if (!compDoc.exists()) throw new Error();
      const q = query(collection(db, "employees"), where("companyCode", "==", companyCode), where("matricula", "==", matricula));
      const snap = await getDocs(q);
      if (!snap.empty && snap.docs[0].data().password === password) {
        const emp = snap.docs[0].data();
        onLogin({
          name: emp.name, email: emp.email, companyCode, companyName: compDoc.data().name,
          role: 'employee', matricula, photo: emp.photo, hasFacialRecord: emp.hasFacialRecord
        });
      } else setError('Matrícula ou senha incorretos.');
    } catch { setError('Erro ao conectar.'); }
    setLoading(false);
  };

  return (
    <div className="h-screen w-screen bg-orange-50 flex flex-col items-center justify-center p-8 max-w-md mx-auto">
      <div className="mb-10 text-center">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center mx-auto mb-4 border border-orange-100">
          <svg className="w-10 h-10 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tighter">ForTime <span className="text-orange-500">PRO</span></h1>
      </div>

      <div className="w-full bg-white rounded-[40px] p-8 shadow-2xl border border-orange-50 relative">
        {loading && <div className="absolute inset-0 bg-white/60 z-10 rounded-[40px] flex items-center justify-center"><div className="w-6 h-6 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>}
        {error && <p className="text-[10px] text-red-500 font-bold mb-4 text-center bg-red-50 p-2 rounded-lg">{error}</p>}

        {step === 0 ? (
          <div className="space-y-3">
            <button onClick={() => { setRole('admin'); setStep(1); }} className="w-full p-4 border border-orange-100 rounded-2xl flex items-center gap-4 hover:bg-orange-50 font-bold text-xs uppercase text-orange-600">📊 Acesso Gestor</button>
            <button onClick={() => { setRole('employee'); setStep(1); }} className="w-full p-4 border border-orange-100 rounded-2xl flex items-center gap-4 hover:bg-orange-50 font-bold text-xs uppercase text-orange-600">👤 Colaborador</button>
          </div>
        ) : (
          <div className="space-y-4">
            {role === 'admin' ? (
              <>
                <input type="email" placeholder="E-MAIL" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-orange-50/50 rounded-2xl text-xs font-bold" />
                <input type="password" placeholder="SENHA" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-orange-50/50 rounded-2xl text-xs font-bold" />
                <button onClick={() => handleAdminAuth('login')} className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black uppercase text-xs">Entrar no Painel</button>
              </>
            ) : (
              <>
                <input type="text" placeholder="CÓDIGO EMPRESA" value={companyCode} onChange={e => setCompanyCode(e.target.value.toUpperCase())} className="w-full p-4 bg-orange-50/50 rounded-2xl text-xs font-bold text-center" />
                <input type="text" placeholder="MATRÍCULA" value={matricula} onChange={e => setMatricula(e.target.value)} className="w-full p-4 bg-orange-50/50 rounded-2xl text-xs font-bold" />
                <input type="password" placeholder="SENHA" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-orange-50/50 rounded-2xl text-xs font-bold" />
                <button onClick={handleEmployeeLogin} className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black uppercase text-xs">Logar e Bater Ponto</button>
              </>
            )}
            <button onClick={() => setStep(0)} className="w-full text-[9px] text-slate-400 font-bold uppercase text-center mt-2">Voltar</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
