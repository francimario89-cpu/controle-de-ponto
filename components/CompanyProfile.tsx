
import React, { useState } from 'react';
import { Company } from '../types';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface CompanyProfileProps {
  company: Company | null;
}

const CompanyProfile: React.FC<CompanyProfileProps> = ({ company }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: company?.name || '',
    socialReason: company?.socialReason || '',
    cnpj: company?.cnpj || '',
    address: company?.address || '',
    neighborhood: company?.neighborhood || '',
    city: company?.city || '',
    state: company?.state || '',
    zip: company?.zip || '',
    phone: company?.phone || '',
    adminEmail: company?.adminEmail || ''
  });

  const handleSave = async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "companies", company.id), formData);
      alert("DADOS DA EMPRESA ATUALIZADOS COM SUCESSO!");
    } catch (e) {
      console.error(e);
      alert("ERRO AO ATUALIZAR DADOS.");
    }
    setLoading(false);
  };

  const fields = [
    { label: "Nome Fantasia", value: formData.name, field: "name" },
    { label: "Razão Social", value: formData.socialReason, field: "socialReason" },
    { label: "CNPJ", value: formData.cnpj, field: "cnpj" },
    { label: "Endereço (Rua/Nº)", value: formData.address, field: "address" },
    { label: "Bairro", value: formData.neighborhood, field: "neighborhood" },
    { label: "Cidade", value: formData.city, field: "city" },
    { label: "Estado (UF)", value: formData.state, field: "state" },
    { label: "CEP", value: formData.zip, field: "zip" },
    { label: "Telefone", value: formData.phone, field: "phone" },
    { label: "E-mail Administrativo", value: formData.adminEmail, field: "adminEmail" }
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <header className="px-6 py-6 flex flex-col items-center border-b dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
        <h1 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-widest">Dados da Empresa</h1>
        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Configurações de Registro</p>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6 pb-32">
        <div className="flex flex-col items-center mb-4">
           <div className="w-24 h-24 rounded-3xl bg-slate-100 dark:bg-slate-800 overflow-hidden shadow-2xl border-4 border-white dark:border-slate-700 mb-4 relative group">
              <img 
                src={company?.logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || 'Empresa')}&background=0057ff&color=fff`} 
                className="w-full h-full object-contain" 
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                 <span className="text-white text-xs font-black">EDITAR</span>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {fields.map((f) => (
            <div key={f.field} className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                {f.label}
              </label>
              <input 
                type="text" 
                value={(formData as any)[f.field]} 
                onChange={e => setFormData(prev => ({ ...prev, [f.field]: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-[#0057ff] transition-all shadow-sm"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 bg-white dark:bg-slate-950 border-t dark:border-slate-900 fixed bottom-0 left-0 right-0 max-w-lg mx-auto">
        <button 
          onClick={handleSave}
          disabled={loading}
          className="w-full py-5 bg-[#0057ff] text-white rounded-[28px] font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? 'SALVANDO...' : 'Salvar Alterações'}
        </button>
      </div>
    </div>
  );
};

export default CompanyProfile;
