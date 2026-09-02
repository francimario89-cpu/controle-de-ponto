
import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Upload, Trash2, Image as ImageIcon, Sparkles, Building2 } from 'lucide-react';
import { Company } from '../types';
import { db } from '../firebase';
import { collection, query, onSnapshot, addDoc, doc, deleteDoc, setDoc } from 'firebase/firestore';

const CompaniesView: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCompanyLogo, setNewCompanyLogo] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newCompany, setNewCompany] = useState({ 
    name: '', 
    cnpj: '', 
    address: '', 
    neighborhood: '',
    city: '',
    state: '',
    zip: '',
    adminEmail: '', 
    adminPassword: '',
    authorizedIP: '' 
  });
  const [showPass, setShowPass] = useState(false);
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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Arquivo muito grande. O limite máximo é de 5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxDimension = 512;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          const isTransparent = file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/svg+xml';
          const optimizedBase64 = canvas.toDataURL(isTransparent ? 'image/png' : 'image/jpeg', 0.92);
          setNewCompanyLogo(optimizedBase64);
        }
      };
      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddCompany = async () => {
    if (!newCompany.name || !newCompany.adminEmail) {
      alert("NOME E E-MAIL SÃO OBRIGATÓRIOS");
      return;
    }
    setLoading(true);
    try {
      const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      await setDoc(doc(db, "companies", accessCode), {
        ...newCompany,
        id: accessCode,
        accessCode,
        logoUrl: newCompanyLogo || '',
        themeColor: '#0057ff',
        config: { overtimePercentage: 50, nightShiftPercentage: 20, weeklyHours: 44, toleranceMinutes: 10 }
      });
      setShowAddModal(false);
      setNewCompanyLogo('');
      setNewCompany({ 
        name: '', 
        cnpj: '', 
        address: '', 
        neighborhood: '',
        city: '',
        state: '',
        zip: '',
        adminEmail: '', 
        adminPassword: '',
        authorizedIP: '' 
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
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center p-2 border border-slate-100 dark:border-slate-700">
              <img 
                src={comp.logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(comp.name)}&background=0057ff&color=fff`} 
                alt={comp.name}
                className="w-full h-full object-contain" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase leading-tight">{comp.name}</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">CNPJ: {comp.cnpj || 'Não informado'}</p>
              <div className="mt-2 flex gap-2">
                 <span className="text-[8px] bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-black uppercase">CÓDIGO: {comp.accessCode}</span>
                 {comp.authorizedIP && <span className="text-[8px] bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full font-black uppercase">WIFI ATIVO</span>}
              </div>
            </div>
            <button onClick={() => handleDelete(comp.id)} className="p-3 text-slate-300 hover:text-red-500 transition-colors">🗑️</button>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 rounded-[44px] w-full max-w-lg p-8 md:p-10 shadow-2xl animate-in zoom-in duration-300 overflow-y-auto max-h-[90vh] no-scrollbar space-y-5">
            <h2 className="text-[13px] font-black uppercase text-center tracking-[0.2em] text-[#0057ff]">
              Cadastrar Nova Unidade / Empresa
            </h2>

            {/* SEÇÃO DE LOGOMARCA */}
            <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 text-xs font-black uppercase">
                <ImageIcon size={16} className="text-blue-600" />
                <span>Logomarca da Empresa (Opcional)</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 p-2 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                  <img 
                    src={newCompanyLogo || `https://ui-avatars.com/api/?name=${encodeURIComponent(newCompany.name || 'Empresa')}&background=0057ff&color=fff`} 
                    alt="Prévia"
                    className="max-w-full max-h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="flex-1 space-y-2">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleLogoUpload} 
                    accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml" 
                    className="hidden" 
                  />
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    >
                      <Upload size={13} />
                      <span>{newCompanyLogo ? 'Trocar Logo' : 'Enviar Logo'}</span>
                    </button>
                    {newCompanyLogo && (
                      <button
                        type="button"
                        onClick={() => setNewCompanyLogo('')}
                        className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors"
                        title="Remover Logo"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <p className="text-[8px] text-slate-400 font-bold uppercase">
                    Recomendado: 512×512 px (1:1) • PNG transparente ou JPG • até 2 MB
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <input type="text" placeholder="NOME FANTASIA DA EMPRESA" value={newCompany.name} onChange={e => setNewCompany({...newCompany, name: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black outline-none border-2 border-transparent focus:border-[#0057ff] dark:text-white" />
              <input type="text" placeholder="CNPJ" value={newCompany.cnpj} onChange={e => setNewCompany({...newCompany, cnpj: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black outline-none dark:text-white" />
              
              <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Endereço Completo</p>
                <input type="text" placeholder="RUA / NÚMERO" value={newCompany.address} onChange={e => setNewCompany({...newCompany, address: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black outline-none dark:text-white" />
                <div className="flex gap-2">
                  <input type="text" placeholder="BAIRRO" value={newCompany.neighborhood} onChange={e => setNewCompany({...newCompany, neighborhood: e.target.value.toUpperCase()})} className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black outline-none dark:text-white" />
                  <input type="text" placeholder="CEP" value={newCompany.zip} onChange={e => setNewCompany({...newCompany, zip: e.target.value})} className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black outline-none dark:text-white" />
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="CIDADE" value={newCompany.city} onChange={e => setNewCompany({...newCompany, city: e.target.value.toUpperCase()})} className="flex-[2] p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black outline-none dark:text-white" />
                  <input type="text" placeholder="UF" maxLength={2} value={newCompany.state} onChange={e => setNewCompany({...newCompany, state: e.target.value.toUpperCase()})} className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black text-center outline-none dark:text-white" />
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest px-2">Restrição de Rede (Opcional)</p>
                <input type="text" placeholder="IP PÚBLICO DO WIFI" value={newCompany.authorizedIP} onChange={e => setNewCompany({...newCompany, authorizedIP: e.target.value})} className="w-full p-4 bg-orange-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black outline-none border-2 border-orange-100 focus:border-orange-500 dark:text-white" />
              </div>

              <input type="email" placeholder="E-MAIL GESTOR" value={newCompany.adminEmail} onChange={e => setNewCompany({...newCompany, adminEmail: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black outline-none dark:text-white" />
              <div className="relative w-full">
                <input 
                  type={showPass ? "text" : "password"} 
                  placeholder="SENHA ACESSO" 
                  value={newCompany.adminPassword} 
                  onChange={e => setNewCompany({...newCompany, adminPassword: e.target.value})} 
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black outline-none dark:text-white pr-14" 
                />
                <button 
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
              
            <div className="flex gap-3 pt-4">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase text-slate-400">Voltar</button>
              <button onClick={handleAddCompany} disabled={loading} className="flex-[2] py-4 bg-[#0057ff] text-white rounded-2xl text-[10px] font-black uppercase shadow-xl shadow-blue-100 dark:shadow-none">
                {loading ? 'SALVANDO...' : 'Salvar Unidade'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompaniesView;
