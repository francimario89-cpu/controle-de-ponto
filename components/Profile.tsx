
import React, { useState } from 'react';
import { User, Company } from '../types';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";

interface ProfileProps {
  user: User;
  company?: Company | null;
}

const Profile: React.FC<ProfileProps> = ({ user, company }) => {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const isAdmin = user.role === 'admin';

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) return setStatus({ type: 'error', msg: 'As senhas não coincidem.' });
    setLoading(true);
    try {
      const q = query(collection(db, "employees"), where("companyCode", "==", user.companyCode), where("matricula", "==", user.matricula));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(doc(db, "employees", snap.docs[0].id), { password: newPass });
        setStatus({ type: 'success', msg: 'Senha alterada com sucesso!' });
      }
    } catch {
      setStatus({ type: 'error', msg: 'Erro ao processar.' });
    } finally {
      setLoading(false);
    }
  };

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

      {!isAdmin && (
        <div className="w-full bg-white rounded-[40px] p-8 shadow-sm border border-primary/10 flex flex-col items-center gap-6">
           <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">ID Digital / Totem</h3>
           <div className="p-4 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              {/* Simulando um QR Code minimalista */}
              <div className="w-32 h-32 grid grid-cols-4 gap-1 p-2 bg-white">
                 {Array.from({length: 16}).map((_, i) => (
                   <div key={i} className={`rounded-sm ${Math.random() > 0.5 ? 'bg-slate-900' : 'bg-transparent'}`}></div>
                 ))}
              </div>
           </div>
           <p className="text-[9px] font-bold text-slate-400 uppercase text-center">Apresente este código no Totem<br/>da sua unidade para acesso rápido.</p>
        </div>
      )}

      <div className="w-full bg-white rounded-[40px] p-6 shadow-sm border border-primary/10 space-y-6">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] text-center">Segurança</h3>
        {status && <p className={`text-[10px] text-center font-bold uppercase ${status.type === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>{status.msg}</p>}
        <form onSubmit={handleChangePassword} className="space-y-4">
          <input type="password" value={currentPass} onChange={e => setCurrentPass(e.target.value)} placeholder="Senha Atual" className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-semibold outline-none" required />
          <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Nova Senha" className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-semibold outline-none" required />
          <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Confirmar Nova Senha" className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-semibold outline-none" required />
          <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold uppercase text-[10px] shadow-xl">
            {loading ? 'Processando...' : 'Atualizar Credenciais'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
