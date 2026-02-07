
import React from 'react';
import { User, Company } from '../types';

interface ProfileProps {
  user: User;
  company?: Company | null;
}

const Profile: React.FC<ProfileProps> = ({ user, company }) => {
  // Dados fictícios para complementar a tela conforme a imagem
  const profileData = {
    role: user.roleFunction || "Aux. de DP - Recursos Humanos",
    admissionDate: user.admissionDate || "03/07/2017",
    birthDate: "11/09/1999",
    gender: "Feminino",
    civilStatus: "Solteiro(a)",
    motherName: "Maria Júlia da Silva Santos",
    fatherName: "João Antônio da Silva Santos"
  };

  const FieldBox = ({ icon, label, value }: { icon: string, label: string, value: string }) => (
    <div className="flex items-center gap-4 py-2">
      <div className="flex items-center gap-2 w-28 shrink-0">
        <span className="text-slate-500 text-lg">{icon}</span>
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
      </div>
      <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 shadow-sm">
        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{value}</span>
      </div>
    </div>
  );

  const FieldLine = ({ icon, label, value }: { icon: string, label: string, value: string }) => (
    <div className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-800">
      <div className="flex items-center gap-2">
        <span className="text-slate-500 text-lg">{icon}</span>
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
      </div>
      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{value}</span>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      {/* Custom Header */}
      <header className="px-4 py-4 flex items-center border-b dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
        <button className="p-2 text-[#0057ff]">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="flex-1 text-center font-bold text-slate-800 dark:text-white mr-10 text-sm">Meus Dados</h1>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        {/* Profile Identity Section */}
        <div className="flex flex-col items-center pt-8 pb-6 px-6">
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-xl bg-slate-100">
              <img 
                src={user.photo || `https://ui-avatars.com/api/?name=${user.name}&background=ffedd5&color=f97316`} 
                className="w-full h-full object-cover" 
              />
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-[#0057ff] rounded-full border-2 border-white flex items-center justify-center text-white shadow-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-1">{user.name}</h2>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-tight">{profileData.role}</p>
        </div>

        {/* Admission Card */}
        <div className="mx-6 mb-6 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 flex items-center justify-center gap-3 border border-slate-100 dark:border-slate-800">
          <div className="text-xl text-slate-400">✨</div>
          <div className="text-left">
            <p className="text-[10px] text-slate-400 font-bold uppercase leading-none mb-1">Admissão:</p>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{profileData.admissionDate}</p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="px-6 space-y-2">
          <FieldBox icon="👤" label="Nome" value={user.name} />
          <FieldBox icon="✉️" label="E-mail" value={user.email} />
          
          <div className="pt-2">
            <FieldLine icon="📅" label="Nascimento" value={profileData.birthDate} />
            <FieldLine icon="⚙️" label="Gênero" value={profileData.gender} />
            <FieldLine icon="💍" label="Estado Civil" value={profileData.civilStatus} />
          </div>

          <div className="pt-2 space-y-2">
            <FieldBox icon="👵" label="Nome da mãe" value={profileData.motherName} />
            <FieldBox icon="👴" label="Nome do pai" value={profileData.fatherName} />
          </div>
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="p-6 bg-white dark:bg-slate-950 border-t dark:border-slate-900 flex gap-4 fixed bottom-0 left-0 right-0 max-w-lg mx-auto">
        <button className="flex-1 py-4 border-2 border-[#0057ff] text-[#0057ff] rounded-lg font-bold text-sm hover:bg-blue-50 transition-colors">
          Cancelar
        </button>
        <button className="flex-1 py-4 bg-[#0057ff] text-white rounded-lg font-bold text-sm shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 transition-colors">
          Solicitar Alteração
        </button>
      </div>
    </div>
  );
};

export default Profile;
