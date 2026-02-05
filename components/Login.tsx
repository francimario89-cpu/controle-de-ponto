
import React, { useState, useEffect } from 'react';
import { User, Company } from '../types';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";

interface LoginProps {
  onLogin: (user: User, company?: Company) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [role, setRole] = useState<'admin' | 'employee' | 'totem' | null>(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dbStatus, setDbStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  
  const [companyName, setCompanyName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [matricula, setMatricula] = useState('');

  // Verifica se o novo banco está acessível
  useEffect(() => {
    const checkConn = async () => {
      if (!db) { setDbStatus('offline'); return; }
      try {
        const q = query(collection(db, "companies"), limit(1));
        await getDocs(q);
        setDbStatus('online');
      } catch (e) {
        console.warn("Aguardando configuração de chaves do Firebase...");
        setDbStatus('offline');
      }
    };
    checkConn();
  }, []);

  const handleAdminSignup = async () => {
    if (!companyName || !cnpj || !adminEmail) { setError('Preencha os campos.'); return; }
    if (dbStatus === 'offline') { setError('Erro: Banco não configurado no firebase.ts'); return; }
    setLoading(true);
    try {
      const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      onLogin({
        name: "Gestor RH",
        email: adminEmail,
        companyCode: accessCode,
        companyName: companyName,
        role: 'admin',
        photo: 'https://ui-avatars.com/api/?name=RH&background=f97316&color=fff'
      }, {
        id: accessCode,
        name: companyName,
        cnpj: cnpj,
        address: "Endereço não informado",
        accessCode: accessCode
      });
    } catch (e) {
      setError('Erro ao criar empresa no novo banco.');
    } finally { setLoading(false); }
  };

  const handleTotemLogin = async () => {
    if (!companyCode || !db) { setError('Digite o código.'); return; }
    setLoading(true);
    try {
      const compDoc = await getDoc(doc(db, "companies", companyCode));
      if (compDoc.exists()) {
        const companyData = compDoc.data() as Company;
        onLogin({
          name: "Totem " + companyData.name,
          email: "totem@" + companyCode,
          companyCode: companyCode,
          companyName: companyData.name,
          role: 'totem',
          photo: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400'
        }, companyData);
      } else { setError('Código não encontrado no novo banco.'); }
    } catch (e) { setError('Erro de conexão com o Firebase.'); } finally { setLoading(false); }
  };

  const handleEmployeeLogin = async () => {
    if (!companyCode || !matricula || !db) { setError('Preencha os campos.'); return; }
    setLoading(true);
    try {
      const compDoc = await getDoc(doc(db, "companies", companyCode));
      if (!compDoc.exists()) { setError('Empresa não cadastrada.'); setLoading(false); return; }
      const q = query(collection(db, "employees"), where("companyCode", "==", companyCode), where("matricula", "==", matricula));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const empData = querySnapshot.docs[0].data();
        onLogin({
          name: empData.name,
          email: empData.email,
          companyCode: companyCode,
          companyName: (compDoc.data() as Company).name,
          role: 'employee',
          matricula: matricula,
          photo: empData.photo || `https://ui-avatars.com/api/?name=${empData.name}&background=f97316&color=fff`
        });
      } else { setError('Matrícula não encontrada.'); }
    } catch (e) { setError('Erro ao buscar colaborador.'); } finally { setLoading(false); }
  };

  return (
    <div className="h-screen w-screen bg-orange-50 flex flex-col items-center justify-center p-8 text-slate-800 max-w-md mx-auto relative overflow-hidden">
      
      {/* Indicador de Status do Banco */}
      <div className="absolute top-10 right-10 flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-orange-100">
        <div className={`w-2 h-2 rounded-full ${dbStatus === 'online' ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></div>
        <span className="text-[8px] font-black uppercase text-slate-400">
          {dbStatus === 'online' ? 'Novo Banco OK' : 'Sem Conexão'}
        </span>
      </div>

      <div className="mb-8 flex flex-col items-center">
        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-4 shadow-xl border border-orange-100">
           <svg className="w-12 h-12 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg>
        </div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tighter">ForTime <span className="text-orange-500">PRO</span></h1>
        <p className="text-[10px] text-orange-400 font-bold uppercase tracking-widest mt-1">Conectando ao novo ambiente</p>
      </div>

      <div className="w-full bg-white rounded-[40px] p-8 space-y-4 shadow-2xl border border-orange-50 relative z-10">
        {loading && <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 rounded-[40px] flex items-center justify-center"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>}

        {error && <div className="bg-red-50 text-red-500 text-[10px] font-bold p-3 rounded-xl border border-red-100 text-center">{error}</div>}
        
        {step === 0 ? (
          <div className="space-y-3">
            <button onClick={() => { setRole('admin'); setStep(1); }} className="w-full p-5 border border-orange-100 rounded-3xl flex items-center gap-4 hover:bg-orange-50 transition-all">
              <span className="text-2xl">📊</span>
              <p className="font-black text-orange-600 text-xs uppercase">Configurar Nova Empresa</p>
            </button>
            <button onClick={() => { setRole('employee'); setStep(1); }} className="w-full p-5 border border-orange-100 rounded-3xl flex items-center gap-4 hover:bg-orange-50 transition-all">
              <span className="text-2xl">👤</span>
              <p className="font-black text-orange-600 text-xs uppercase">Acesso Colaborador</p>
            </button>
            <button onClick={() => { setRole('totem'); setStep(1); }} className="w-full p-5 border border-orange-100 rounded-3xl flex items-center gap-4 hover:bg-orange-50 transition-all">
              <span className="text-2xl">📸</span>
              <p className="font-black text-orange-600 text-xs uppercase">Modo Totem</p>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {role === 'admin' && (
              <>
                <input type="text" placeholder="Nome da Empresa" value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full p-4 bg-orange-50/30 border border-orange-100 rounded-2xl text-xs font-bold" />
                <input type="text" placeholder="CNPJ" value={cnpj} onChange={e => setCnpj(e.target.value)} className="w-full p-4 bg-orange-50/30 border border-orange-100 rounded-2xl text-xs font-bold" />
                <input type="email" placeholder="E-mail" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className="w-full p-4 bg-orange-50/30 border border-orange-100 rounded-2xl text-xs font-bold" />
                <button onClick={handleAdminSignup} className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black uppercase text-xs">Salvar no Novo Banco</button>
              </>
            )}
            {(role === 'employee' || role === 'totem') && (
              <>
                <input type="text" placeholder="CÓDIGO DA EMPRESA" value={companyCode} onChange={e => setCompanyCode(e.target.value.toUpperCase())} className="w-full p-4 bg-orange-50/30 border border-orange-100 rounded-2xl text-center text-sm font-black tracking-widest" />
                {role === 'employee' && <input type="text" placeholder="SUA MATRÍCULA" value={matricula} onChange={e => setMatricula(e.target.value)} className="w-full p-4 bg-orange-50/30 border border-orange-100 rounded-2xl text-xs font-bold" />}
                <button onClick={role === 'employee' ? handleEmployeeLogin : handleTotemLogin} className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black uppercase text-xs">Entrar</button>
              </>
            )}
            <button onClick={() => setStep(0)} className="w-full text-[9px] text-slate-400 font-black uppercase text-center mt-2">Voltar</button>
          </div>
        )}
      </div>

      <p className="mt-8 text-[9px] text-orange-400/40 font-black uppercase tracking-[0.3em] text-center px-10">
        Para ativar o novo banco, cole suas credenciais em firebase.ts e ative o Firestore em modo teste no console.
      </p>
    </div>
  );
};

export default Login;
