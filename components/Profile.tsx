
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

  // Branding States
  const [themeColor, setThemeColor] = useState(company?.themeColor || '#f97316');
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  const isAdmin = user.role === 'admin';

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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        if (company?.id) {
          await updateDoc(doc(db, "companies", company.id), { logoUrl: base64 });
          alert("Logomarca atualizada com sucesso!");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveBranding = async () => {
    if (!company?.id) return;
    setIsSavingBranding(true);
    try {
      await updateDoc(doc(db, "companies", company.id), { themeColor });
      alert("Cores do sistema atualizadas!");
    } catch (e) {
      alert("Erro ao salvar cores.");
    } finally {
      setIsSavingBranding(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-6 flex flex-col items-center">
      {/* Avatar e Identificação Centralizada */}
      <div className="flex flex-col items-center gap-4 py-4 w-full">
        <div className="w-28 h-28 rounded-[40px] overflow-hidden border-4 border-white shadow-2xl relative group bg-slate-100">
          <img src={user.photo || `https://ui-avatars.com/api/?name=${user.name}`} className="w-full h-full object-cover" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">{user.name}</h2>
          <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-1">{user.companyName || 'ForTime PRO'}</p>
          <span className="text-[8px] bg-primary/10 text-primary px-3 py-1 rounded-full font-black uppercase tracking-tighter mt-2 inline-block">
            {isAdmin ? 'Gestor de RH' : 'Colaborador'}
          </span>
        </div>
      </div>

      {/* Seção de Branding (Somente Admin) */}
      {isAdmin && (
        <div className="w-full bg-white rounded-[40px] p-8 shadow-sm border border-primary/10 space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-4">
             <span className="text-xl">🎨</span>
             <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Identidade Visual</h3>
          </div>

          {/* Logo Upload Centralizado */}
          <div className="flex flex-col items-center gap-4 p-6 bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
             <div className="h-16 flex items-center justify-center">
                {company?.logoUrl ? (
                  <img src={company.logoUrl} className="max-h-full object-contain" />
                ) : (
                  <p className="text-[9px] font-black text-slate-300 uppercase">Sua Logomarca Aqui</p>
                )}
             </div>
             <label className="cursor-pointer bg-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase text-primary border border-primary/20 shadow-sm hover:bg-primary hover:text-white transition-all">
                Mudar Logomarca
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
             </label>
          </div>

          {/* Paleta de Cores Corrigida */}
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Paleta de Cores</p>
                <div 
                  className="w-6 h-6 rounded-full border-2 border-white shadow-sm" 
                  style={{ backgroundColor: themeColor }}
                />
             </div>
             
             <div className="grid grid-cols-5 gap-3">
               {['#f97316', '#2563eb', '#10b981', '#7c3aed', '#ef4444'].map(c => (
                 <button 
                   key={c} 
                   onClick={() => setThemeColor(c)}
                   className={`h-10 rounded-2xl border-4 transition-all ${themeColor === c ? 'border-slate-800 scale-110' : 'border-white shadow-sm'}`}
                   style={{ backgroundColor: c }}
                 />
               ))}
             </div>

             <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                <input 
                  type="color" 
                  value={themeColor} 
                  onChange={e => setThemeColor(e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border-none bg-transparent"
                />
                <div className="flex-1">
                  <p className="text-[10px] font-black text-slate-700 uppercase">{themeColor}</p>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">Cor Personalizada</p>
                </div>
             </div>

             <button 
               onClick={handleSaveBranding}
               disabled={isSavingBranding}
               className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all"
             >
               {isSavingBranding ? 'Salvando...' : 'Salvar Nova Identidade'}
             </button>
          </div>
        </div>
      )}

      {/* Alterar Senha Centralizado */}
      <div className="w-full bg-white rounded-[40px] p-8 shadow-sm border border-primary/10 space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-50 pb-4">
           <span className="text-xl">🔒</span>
           <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Segurança da Conta</h3>
        </div>
        
        {status && (
          <div className={`p-4 rounded-2xl text-[10px] font-bold text-center border animate-in fade-in ${status.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
            {status.msg}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Senha Atual</label>
            <input 
              type="password" 
              value={currentPass}
              onChange={e => setCurrentPass(e.target.value)}
              className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary transition-all" 
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Nova Senha</label>
            <input 
              type="password" 
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary transition-all" 
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? 'Processando...' : 'Salvar Alterações'}
          </button>
        </form>
      </div>

      <p className="text-[9px] text-slate-300 font-black uppercase tracking-[0.2em] text-center max-w-[200px]">
        ForTime PRO Cloud Security System
      </p>
    </div>
  );
};

export default Profile;
