
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
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">{user.name}</h2>
          <p className="text-[10px] text-primary font-bold uppercase tracking-[0.2em] mt-1">{user.companyName}</p>
        </div>
      </div>

      <div className="w-full bg-white rounded-[40px] p-8 shadow-sm border border-primary/10 space-y-4">
         <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] text-center">Dados Cadastrais</h3>
         <div className="space-y-3">
            <div className="flex justify-between border-b border-slate-50 pb-2">
               <span className="text-[9px] font-bold text-slate-400 uppercase">Matrícula</span>
               <span className="text-[10px] font-bold text-slate-700">{user.matricula}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-2">
               <span className="text-[9px] font-bold text-slate-400 uppercase">Cargo</span>
               <span className="text-[10px] font-bold text-slate-700">{user.roleFunction || 'Não Informado'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-2">
               <span className="text-[9px] font-bold text-slate-400 uppercase">Departamento</span>
               <span className="text-[10px] font-bold text-slate-700">{user.department || 'Geral'}</span>
            </div>
         </div>
      </div>

      {!isAdmin && (
        <div className="w-full bg-indigo-50 rounded-[40px] p-8 border border-indigo-100 text-center space-y-3">
           <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Alteração de Senha</p>
           <p className="text-[9px] text-indigo-400 font-medium leading-relaxed">
             Por políticas de segurança da <strong>{user.companyName}</strong>, a alteração de senha deve ser solicitada diretamente ao RH ou seu gestor imediato.
           </p>
        </div>
      )}

      {isAdmin && (
        <div className="w-full bg-white rounded-[40px] p-6 shadow-sm border border-primary/10">
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] text-center mb-4">Acesso Administrativo</p>
           <p className="text-[9px] text-slate-400 text-center italic">Como administrador, você gerencia as senhas de toda a equipe através do Painel de Colaboradores.</p>
        </div>
      )}

      <div className="w-full bg-white rounded-[40px] p-8 shadow-sm border border-primary/10 flex flex-col items-center gap-6">
         <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">ID Digital</h3>
         <div className="p-4 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <div className="w-32 h-32 grid grid-cols-4 gap-1 p-2 bg-white">
               {Array.from({length: 16}).map((_, i) => (
                 <div key={i} className={`rounded-sm ${Math.random() > 0.5 ? 'bg-slate-900' : 'bg-transparent'}`}></div>
               ))}
            </div>
         </div>
         <p className="text-[9px] font-bold text-slate-400 uppercase text-center">Código de Identificação para Totens.</p>
      </div>
    </div>
  );
};

export default Profile;
