
import React, { useState } from 'react';
import { User } from '../types';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";

interface ProfileProps {
  user: User;
}

const Profile: React.FC<ProfileProps> = ({ user }) => {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) return setStatus({ type: 'error', msg: 'As senhas não coincidem.' });
    if (newPass.length < 4) return setStatus({ type: 'error', msg: 'A senha deve ter no mínimo 4 caracteres.' });

    setLoading(true);
    try {
      const q = query(
        collection(db, "employees"), 
        where("companyCode", "==", user.companyCode), 
        where("matricula", "==", user.matricula)
      );
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const empDoc = snap.docs[0];
        if (empDoc.data().password === currentPass) {
          await updateDoc(doc(db, "employees", empDoc.id), { password: newPass });
          setStatus({ type: 'success', msg: 'Senha alterada com sucesso!' });
          setCurrentPass(''); setNewPass(''); setConfirmPass('');
        } else {
          setStatus({ type: 'error', msg: 'Senha atual incorreta.' });
        }
      }
    } catch {
      setStatus({ type: 'error', msg: 'Erro ao conectar ao servidor.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="w-24 h-24 rounded-[40px] overflow-hidden border-4 border-white shadow-2xl relative group">
          <img src={user.photo} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[8px] text-white font-black uppercase">Alterar Foto</span>
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-lg font-black text-slate-800 tracking-tight">{user.name}</h2>
          <p className="text-[10px] text-orange-400 font-bold uppercase tracking-widest mt-1">{user.companyName}</p>
        </div>
      </div>

      <div className="bg-white rounded-[40px] p-8 shadow-sm border border-orange-50 space-y-6">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-orange-50 pb-4">Alterar Senha</h3>
        
        {status && (
          <div className={`p-4 rounded-2xl text-[10px] font-bold text-center border ${status.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
            {status.msg}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Senha Atual</label>
            <input 
              type="password" 
              value={currentPass}
              onChange={e => setCurrentPass(e.target.value)}
              className="w-full p-4 bg-orange-50 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all" 
              required
            />
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Nova Senha</label>
            <input 
              type="password" 
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              className="w-full p-4 bg-orange-50 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all" 
              required
            />
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Confirmar Nova Senha</label>
            <input 
              type="password" 
              value={confirmPass}
              onChange={e => setConfirmPass(e.target.value)}
              className="w-full p-4 bg-orange-50 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all" 
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl shadow-orange-100 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? 'Processando...' : 'Salvar Nova Senha'}
          </button>
        </form>
      </div>

      <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100">
        <p className="text-[9px] text-slate-400 font-bold uppercase leading-relaxed text-center">
          Sua conta é protegida por criptografia. Não compartilhe sua senha com ninguém, nem mesmo com o RH.
        </p>
      </div>
    </div>
  );
};

export default Profile;
