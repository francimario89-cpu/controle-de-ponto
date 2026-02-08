
import React, { useState, useEffect } from 'react';
import { Company } from '../types';
import { db } from '../firebase';
import { collection, query, onSnapshot, addDoc, doc, deleteDoc } from 'firebase/firestore';

const CompaniesView: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCompany, setNewCompany] = useState({ 
    name: '', 
    cnpj: '', 
    address: '', 
    neighborhood: '',
    city: '',
    state: '',
    zip: '',
    adminEmail: '', 
    adminPassword: '' 
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "companies"));
    const unsub = onSnapshot(q, (snap) => {
      const comps: Company[] = [];
      snap.forEach(d => comps.push({ id: d.id, ...d.data() } as Company));
      setCompanies(comps);
    });
    return () => unsub();
  }, []);

  const handleAddCompany = async () => {
    if (!newCompany.name || !newCompany.adminEmail) {
      alert("NOME E E-MAIL SÃO OBRIGATÓRIOS");
      return;
    }
    setLoading(true);
    try {
      const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      await addDoc(collection(db, "companies"), {
        ...newCompany,
        accessCode,
        themeColor: '#0057ff',
        config: { overtimePercentage: 50, nightShiftPercentage: 20, weeklyHours: 44, toleranceMinutes: 10 }
      });
      setShowAddModal(false);
      setNewCompany({ 
        name: '', 
        cnpj: '', 
        address: '', 
        neighborhood: '',
        city: '',
        state: '',
        zip: '',
        adminEmail: '', 
        adminPassword: '' 
      });
      alert("EMPRESA ADICIONADA COM SUCESSO!");
    } catch (e) {
      console.error(e);
      alert("ERRO AO ADICIONAR EMPRESA.");
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("TEM CERTEZA QUE DESEJA EXCLUIR ESTA EMPRESA E TODOS OS SEUS DADOS?")) {
      await deleteDoc(doc(db, "companies", id));
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <header className="px-6 py-6 flex flex-col items-center border-b dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
        <h1 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-widest">Gestão de Empresas</h1>
        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Multi-Empresa Ativo</p>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar pb-32">
        <button 
          onClick={() => setShowAddModal(true)}
          className="w-full py-5 bg-slate-900 dark:bg-slate-800 text-white rounded-[32px] font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all mb-4"
        >
          <span>➕ ADICIONAR NOVA UNIDADE</span>
        </button>

        {companies.map(comp => (
          <div key={comp.id} className="bg-white dark:bg-slate-900 p-6 rounded-[40px] border dark:border-slate-800 flex items-center gap-5 shadow-sm group">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center p-3">
              <img src={comp.logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(comp.name)}&background=0057ff&color=fff`} className="w-full h-full object-contain" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase leading-tight">{comp.name}</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">CNPJ: {comp.cnpj || 'Não informado'}</p>
              <div className="mt-2 flex gap-2">
                 <span className="text-[8px] bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-black uppercase">CÓDIGO: {comp.accessCode}</span>
              </div>
            </div>
            <button onClick={() => handleDelete(comp.id)} className="p-3 text-slate-300 hover:text-red-500 transition-colors">🗑️</button>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 rounded-[44px] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in duration-300 overflow-y-auto max-h-[90vh] no-scrollbar">
            <h2 className="text-[12px] font-black uppercase text-center mb-8 tracking-[0.3em] text-[#0057ff]">Cadastrar Empresa</h2>
            <div className="space-y-4">
              <input type="text" placeholder="NOME DA EMPRESA" value={newCompany.name} onChange={e => setNewCompany({...newCompany, name: e.target.value.toUpperCase()})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl text-[10px] font-black outline-none border-2 border-transparent focus:border-[#0057ff] dark:text-white" />
              <input type="text" placeholder="CNPJ" value={newCompany.cnpj} onChange={e => setNewCompany({...newCompany, cnpj: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl text-[10px] font-black outline-none dark:text-white" />
              
              <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Endereço Completo</p>
                <input type="text" placeholder="RUA / NÚMERO" value={newCompany.address} onChange={e => setNewCompany({...newCompany, address: e.target.value.toUpperCase()})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl text-[10px] font-black outline-none dark:text-white" />
                <div className="flex gap-2">
                  <input type="text" placeholder="BAIRRO" value={newCompany.neighborhood} onChange={e => setNewCompany({...newCompany, neighborhood: e.target.value.toUpperCase()})} className="flex-1 p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl text-[10px] font-black outline-none dark:text-white" />
                  <input type="text" placeholder="CEP" value={newCompany.zip} onChange={e => setNewCompany({...newCompany, zip: e.target.value})} className="flex-1 p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl text-[10px] font-black outline-none dark:text-white" />
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="CIDADE" value={newCompany.city} onChange={e => setNewCompany({...newCompany, city: e.target.value.toUpperCase()})} className="flex-[2] p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl text-[10px] font-black outline-none dark:text-white" />
                  <input type="text" placeholder="UF" maxLength={2} value={newCompany.state} onChange={e => setNewCompany({...newCompany, state: e.target.value.toUpperCase()})} className="flex-1 p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl text-[10px] font-black text-center outline-none dark:text-white" />
                </div>
              </div>

              <input type="email" placeholder="E-MAIL GESTOR" value={newCompany.adminEmail} onChange={e => setNewCompany({...newCompany, adminEmail: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl text-[10px] font-black outline-none dark:text-white" />
              <input type="password" placeholder="SENHA ACESSO" value={newCompany.adminPassword} onChange={e => setNewCompany({...newCompany, adminPassword: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl text-[10px] font-black outline-none dark:text-white" />
              
              <div className="flex gap-3 pt-6">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-5 border-2 border-slate-100 rounded-[28px] text-[10px] font-black uppercase text-slate-400">Voltar</button>
                <button onClick={handleAddCompany} disabled={loading} className="flex-[2] py-5 bg-[#0057ff] text-white rounded-[28px] text-[10px] font-black uppercase shadow-xl shadow-blue-100 dark:shadow-none">
                  {loading ? 'SALVANDO...' : 'Salvar Unidade'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompaniesView;
