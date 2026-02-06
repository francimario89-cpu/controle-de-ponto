
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
      alert("Identidade Visual atualizada!");
    } catch (e) {
      alert("Erro ao salvar.");
    } finally {
      setIsSavingBranding(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-6 flex flex-col items-center">
      {/* Avatar e Nome Centralizado */}
      <div className="flex flex-col items-center gap-4 py-4 w-full text-center">
        <div className="w-24 h-24 rounded-[32px] overflow-hidden border-4 border-white shadow-xl bg-slate-100">
          <img src={user.photo || `https://ui-avatars.com/api/?name=${user.name}`} className="w-full h-full object-cover" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">{user.name}</h2>
          <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mt-1">{user.companyName}</p>
          <span className="inline-block mt-2 px-3 py-1 bg-primary-light text-primary text-[8px] font-black uppercase rounded-full">
            {isAdmin ? 'Gestor Administrativo' : 'Colaborador'}
          </span>
        </div>
      </div>

      {/* Identidade Visual (Somente Admin) */}
      {isAdmin && (
        <div className="w-full bg-white rounded-[40px] p-6 shadow-sm border border-primary/10 space-y-6">
          <div className="text-center border-b border-slate-50 pb-4">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Identidade Visual</h3>
          </div>

          {/* Upload de Logo */}
          <div className="flex flex-col items-center gap-4 p-4 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
             <div className="h-12 flex items-center justify-center">
                {company?.logoUrl ? (
                  <img src={company.logoUrl} className="max-h-full object-contain" />
                ) : (
                  <p className="text-[8px] font-black text-slate-300 uppercase">Sem Logomarca</p>
                )}
             </div>
             <label className="cursor-pointer bg-white px-4 py-2 rounded-xl text-[9px] font-black uppercase text-primary border border-primary/20 shadow-sm">
                Alterar Logo
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
             </label>
          </div>

          {/* Paleta de Cores Disponíveis */}
          <div className="space-y-4">
             <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Escolha a Cor do App</p>
             <div className="grid grid-cols-6 gap-2 px-2">
               {[
                 { name: 'Azul', hex: '#2563eb' },
                 { name: 'Verde', hex: '#10b981' },
                 { name: 'Vermelho', hex: '#ef4444' },
                 { name: 'Amarelo', hex: '#eab308' },
                 { name: 'Laranja', hex: '#f97316' },
                 { name: 'Lilás', hex: '#7c3aed' }
               ].map(c => (
                 <button 
                   key={c.hex} 
                   onClick={() => setThemeColor(c.hex)}
                   title={c.name}
                   className={`h-10 rounded-xl transition-all ${themeColor === c.hex ? 'ring-4 ring-slate-800 scale-110' : 'scale-100 shadow-sm'}`}
                   style={{ backgroundColor: c.hex }}
                 />
               ))}
             </div>

             <button 
               onClick={handleSaveBranding}
               disabled={isSavingBranding}
               className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all"
             >
               {isSavingBranding ? 'Salvando...' : 'Aplicar Tema'}
             </button>
          </div>
        </div>
      )}

      {/* Alterar Senha Centralizado */}
      <div className="w-full bg-white rounded-[40px] p-6 shadow-sm border border-primary/10 space-y-6">
        <div className="text-center border-b border-slate-50 pb-4">
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Segurança</h3>
        </div>
        
        {status && (
          <div className={`p-4 rounded-2xl text-[10px] font-bold text-center border ${status.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
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
              className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold outline-none" 
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Nova Senha</label>
            <input 
              type="password" 
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold outline-none" 
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-xl active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? 'Processando...' : 'Atualizar Senha'}
          </button>
        </form>
      </div>

      <p className="text-[9px] text-slate-300 font-black uppercase tracking-[0.4em] text-center">
        ForTime PRO Cloud Security
      </p>
    </div>
  );
};

export default Profile;
