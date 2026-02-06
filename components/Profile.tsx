
import React from 'react';
import { User, Company } from '../types';

interface ProfileProps {
  user: User;
  company?: Company | null;
}

const Profile: React.FC<ProfileProps> = ({ user, company }) => {
  const isAdmin = user.role === 'admin';

  return (
    <div className="max-w-md mx-auto p-6 space-y-6 flex flex-col items-center">
      <div className="flex flex-col items-center gap-4 py-4 w-full text-center">
        <div className="w-24 h-24 rounded-[32px] overflow-hidden border-4 border-white shadow-xl bg-slate-100">
          <img src={user.photo || `https://ui-avatars.com/api/?name=${user.name}`} className="w-full h-full object-cover" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight uppercase">{user.name}</h2>
          <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mt-1">{user.companyName}</p>
        </div>
      </div>

      <div className="w-full bg-white dark:bg-slate-900 rounded-[40px] p-8 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
         <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center">DADOS</h3>
         <div className="space-y-4">
            <div className="flex justify-between border-b border-slate-50 dark:border-slate-800 pb-2">
               <span className="text-[9px] font-black text-slate-400 uppercase">MATRÍCULA</span>
               <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{user.matricula}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 dark:border-slate-800 pb-2">
               <span className="text-[9px] font-black text-slate-400 uppercase">FUNÇÃO</span>
               <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{user.roleFunction || 'GERAL'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 dark:border-slate-800 pb-2">
               <span className="text-[9px] font-black text-slate-400 uppercase">SETOR</span>
               <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{user.department || 'OPERACIONAL'}</span>
            </div>
         </div>
      </div>

      <div className="w-full bg-orange-50 dark:bg-slate-800 rounded-[40px] p-8 border border-orange-100 dark:border-slate-700 text-center">
         <p className="text-[9px] text-orange-600 dark:text-orange-400 font-black uppercase leading-relaxed">
           Para alterar sua senha ou dados cadastrais, procure o seu GESTOR ou o setor de RH da empresa.
         </p>
      </div>

      <p className="text-[8px] text-slate-300 font-black uppercase tracking-[0.4em]">ForTime PRO v4.2.0</p>
    </div>
  );
};

export default Profile;
