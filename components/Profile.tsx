
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

  return (
    <div className="flex flex-col h-full bg-white">
      <header className="px-4 py-4 flex items-center border-b bg-white sticky top-0 z-10">
        <h1 className="flex-1 text-center font-bold text-slate-800 text-sm">Meus Dados</h1>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <div className="flex flex-col items-center pt-8 pb-6 px-6">
          <div className="w-24 h-24 rounded-[35px] overflow-hidden border-4 border-white shadow-xl bg-slate-100">
            <img src={user.photo || `https://ui-avatars.com/api/?name=${user.name}&background=f97316&color=fff`} className="w-full h-full object-cover" />
          </div>
          <h2 className="text-lg font-black text-slate-800 mt-4 uppercase">{user.name}</h2>
          <p className="text-orange-600 text-[10px] font-black uppercase tracking-[0.2em]">{user.roleFunction || 'Colaborador'}</p>
        </div>

        <div className="px-6 space-y-4">
          <div className="p-4 bg-slate-50 rounded-2xl">
             <p className="text-[9px] font-black text-slate-400 uppercase">Matrícula</p>
             <p className="text-sm font-black uppercase">{user.matricula || '-'}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl">
             <p className="text-[9px] font-black text-slate-400 uppercase">Cargo</p>
             <p className="text-sm font-black uppercase">{user.roleFunction || '-'}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl">
             <p className="text-[9px] font-black text-slate-400 uppercase">Empresa</p>
             <p className="text-sm font-black uppercase">{company?.name || '-'}</p>
          </div>
        </div>

        <div className="p-6 space-y-3">
           <button onClick={() => setShowPassModal(true)} className="w-full py-5 bg-orange-600 text-white rounded-[28px] font-black text-xs uppercase shadow-xl active:scale-95 transition-all">
             🔒 Alterar Minha Senha de Acesso
           </button>
           <button onClick={() => { if(confirm("Sair do app?")) onLogout(); }} className="w-full py-5 bg-slate-100 text-red-600 rounded-[28px] font-black text-xs uppercase active:scale-95 transition-all">
             Sair do Aplicativo
           </button>
        </div>
      </div>

      {showPassModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-6">
           <div className="bg-white rounded-[44px] w-full max-w-sm p-10 shadow-2xl space-y-4">
              <h2 className="text-sm font-black text-orange-600 text-center uppercase">Trocar Senha</h2>
              <input type="password" placeholder="NOVA SENHA" value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black text-center" />
              <div className="flex gap-3 pt-4">
                 <button onClick={() => setShowPassModal(false)} className="flex-1 py-4 border rounded-2xl text-[10px] font-black uppercase text-slate-400">Voltar</button>
                 <button onClick={handleUpdatePassword} disabled={loading} className="flex-[2] py-4 bg-orange-600 text-white rounded-2xl text-[10px] font-black uppercase">Atualizar</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
