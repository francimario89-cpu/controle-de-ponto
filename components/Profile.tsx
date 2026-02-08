
import React from 'react';
import { User, Company } from '../types';

interface ProfileProps {
  user: User;
  company?: Company | null;
  onLogout: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user, company, onLogout }) => {
  const FieldLine = ({ icon, label, value }: { icon: string, label: string, value: string }) => (
    <div className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-800">
      <div className="flex items-center gap-2">
        <span className="text-slate-500 text-lg">{icon}</span>
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
      </div>
      <span className="text-sm font-black text-slate-800 dark:text-white uppercase">{value}</span>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <header className="px-4 py-4 flex items-center border-b dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
        <h1 className="flex-1 text-center font-bold text-slate-800 dark:text-white text-sm">Meus Dados</h1>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <div className="flex flex-col items-center pt-8 pb-6 px-6">
          <div className="w-24 h-24 rounded-[35px] overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl bg-slate-100 mb-4">
            <img 
              src={user.photo || `https://ui-avatars.com/api/?name=${user.name}&background=0057ff&color=fff`} 
              className="w-full h-full object-cover" 
            />
          </div>
          <h2 className="text-lg font-black text-slate-800 dark:text-white mb-1 uppercase tracking-tighter">{user.name}</h2>
          <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em]">{user.roleFunction || 'Colaborador'}</p>
        </div>

        <div className="px-6 space-y-1">
          <FieldLine icon="🆔" label="Matrícula" value={user.matricula || '-'} />
          <FieldLine icon="💼" label="Cargo" value={user.roleFunction || 'Não definido'} />
          <FieldLine icon="⏰" label="Jornada" value={user.workShift || 'Não definida'} />
          <FieldLine icon="🏢" label="Empresa" value={user.companyName || company?.name || '-'} />
          <FieldLine icon="✉️" label="E-mail" value={user.email || '-'} />
        </div>

        <div className="p-6 space-y-3">
           <button className="w-full py-5 bg-primary text-white rounded-[28px] font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">
             Solicitar Alteração
           </button>
           <button 
             onClick={() => { if(confirm("Deseja realmente sair do aplicativo?")) onLogout(); }}
             className="w-full py-5 bg-slate-100 dark:bg-slate-800 text-red-500 rounded-[28px] font-black text-xs uppercase tracking-[0.2em] active:scale-95 transition-all"
           >
             Sair do Aplicativo
           </button>
        </div>
      </div>
      
      <p className="p-6 text-center text-[8px] font-black text-slate-300 uppercase tracking-widest">
        ForTime PRO - Versão 4.0
      </p>
    </div>
  );
};

export default Profile;
