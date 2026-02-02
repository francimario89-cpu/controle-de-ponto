
import React, { useState } from 'react';

interface LoginProps {
  onLogin: (company: string, email: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [step, setStep] = useState(1);
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="h-screen w-screen bg-[#0055b8] flex flex-col items-center justify-center p-8 text-white max-w-md mx-auto">
      <div className="mb-12 flex flex-col items-center">
        <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-xl">
           <svg className="w-12 h-12 text-[#0055b8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 7v5" />
           </svg>
        </div>
        <h1 className="text-2xl font-bold">Meu Controle de Ponto</h1>
        <p className="text-white/60 text-sm">Seja bem vindo!</p>
      </div>

      <div className="w-full bg-white rounded-3xl p-6 text-slate-800 space-y-4 shadow-2xl">
        {step === 1 ? (
          <>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase">Código da Empresa</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </span>
                <input 
                  type="text" 
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder="Ex: fortime"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0055b8]/20"
                />
              </div>
            </div>
            <button 
              onClick={() => setStep(2)}
              disabled={!company}
              className="w-full bg-[#0055b8] text-white py-4 rounded-xl font-bold shadow-lg shadow-[#0055b8]/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              Continuar
            </button>
          </>
        ) : (
          <>
             <div className="flex items-center gap-3 mb-4">
               <img src="https://ortep.com.br/wp-content/uploads/2021/08/logo-fortime-blue.png" alt="Logo" className="h-6" />
             </div>
             <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Seu e-mail</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Sua senha</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
             </div>
             <button 
              onClick={() => onLogin(company, email)}
              className="w-full bg-[#0055b8] text-white py-4 rounded-xl font-bold mt-4"
            >
              Continuar
            </button>
          </>
        )}
      </div>
      
      <p className="mt-8 text-xs text-white/40">Powered by fortime</p>
    </div>
  );
};

export default Login;
