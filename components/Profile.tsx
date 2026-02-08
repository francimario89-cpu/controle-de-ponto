
import React, { useState } from 'react';
import { User, Company } from '../types';
import { db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

interface ProfileProps {
  user: User;
  company?: Company | null;
  onLogout: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user, company, onLogout }) => {
  const [showPassModal, setShowPassModal] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = async () => {
    if (!newPass) return alert("Digite a nova senha!");
    setLoading(true);
    try {
      const q = query(collection(db, "employees"), where("matricula", "==", user.matricula), where("companyCode", "==", user.companyCode));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(doc(db, "employees", snap.docs[0].id), { password: newPass });
        alert("SENHA ALTERADA COM SUCESSO!");
        setShowPassModal(false);
        setNewPass('');
      }
    } catch (e) { alert("ERRO AO ALTERAR SENHA."); }
    setLoading(false);
  };

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
          <div className="relative group">
            <div className="w-24 h-24 rounded-[35px] overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl bg-slate-100">
              <img 
                src={user.photo || `https://ui-avatars.com/api/?name=${user.name}&background=0057ff&color=fff`} 
                className="w-full h-full object-cover" 
              />
            </div>
            <button className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-xl shadow-lg border-2 border-white">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </button>
          </div>
          <h2 className="text-lg font-black text-slate-800 dark:text-white mt-4 mb-1 uppercase tracking-tighter">{user.name}</h2>
          <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em]">{user.roleFunction || 'Colaborador'}</p>
        </div>

        <div className="px-6 space-y-1">
          <FieldLine icon="🆔" label="Matrícula" value={user.matricula || '-'} />
          <FieldLine icon="💼" label="Cargo" value={user.roleFunction || 'Não definido'} />
          <FieldLine icon="⏰" label="Jornada" value={user.workShift || 'Não definida'} />
          <FieldLine icon="🏢" label="Empresa" value={user.companyName || company?.name || '-'} />
        </div>

        <div className="p-6 space-y-3">
           <button onClick={() => setShowPassModal(true)} className="w-full py-5 bg-primary text-white rounded-[28px] font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">
             Alterar Minha Senha
           </button>
           <button 
             onClick={() => { if(confirm("Sair do app?")) onLogout(); }}
             className="w-full py-5 bg-slate-100 dark:bg-slate-800 text-red-600 rounded-[28px] font-black text-xs uppercase tracking-[0.2em] active:scale-95 transition-all"
           >
             Sair do Aplicativo
           </button>
        </div>
      </div>

      {showPassModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6">
           <div className="bg-white dark:bg-slate-900 rounded-[44px] w-full max-w-sm p-10 shadow-2xl space-y-4">
              <h2 className="text-sm font-black text-primary text-center uppercase tracking-widest">Nova Senha</h2>
              <p className="text-[9px] text-slate-400 font-bold uppercase text-center mb-4">Escolha uma senha segura de acesso ao app.</p>
              <input 
                type="password" 
                placeholder="DIGITE A NOVA SENHA" 
                value={newPass} 
                onChange={e => setNewPass(e.target.value)} 
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black text-center dark:text-white border-2 border-transparent focus:border-primary/20 outline-none" 
              />
              <div className="flex gap-3 pt-4">
                 <button onClick={() => setShowPassModal(false)} className="flex-1 py-4 border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase text-slate-400">Cancelar</button>
                 <button onClick={handleUpdatePassword} disabled={loading} className="flex-[2] py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase shadow-xl">
                   {loading ? 'Salvando...' : 'Atualizar'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
