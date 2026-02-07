
import React, { useState } from 'react';
import { User } from '../types';
import { db } from '../firebase';
import { doc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';

interface SettingsViewProps {
  user: User;
  onBack: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ user, onBack }) => {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = async () => {
    if (!newPassword) return alert("Digite a nova senha");
    setLoading(true);
    try {
      const q = query(
        collection(db, "employees"), 
        where("companyCode", "==", user.companyCode), 
        where("matricula", "==", user.matricula)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(doc(db, "employees", snap.docs[0].id), {
          password: newPassword
        });
        alert("Senha atualizada com sucesso!");
        setNewPassword('');
      }
    } catch (e) {
      alert("Erro ao atualizar senha.");
    }
    setLoading(false);
  };

  const handleExportData = () => {
    const data = {
      user: user.name,
      matricula: user.matricula,
      exportDate: new Date().toISOString(),
      deviceInfo: navigator.userAgent
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dados_ponto_${user.matricula}.json`;
    a.click();
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* Header Estilo Imagem */}
      <header className="px-4 py-4 flex items-center border-b dark:border-slate-800">
        <button onClick={onBack} className="p-2 text-indigo-600 dark:text-indigo-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="flex-1 text-center font-bold text-slate-800 dark:text-white mr-10">Configurações</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar pb-24">
        
        {/* Biometria */}
        <section className="space-y-2">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm">Biometria</h3>
              <p className="text-xs text-slate-500 font-medium leading-tight">Biometria obrigatória no registro de ponto.</p>
              <p className="text-[10px] text-slate-400">Esta configuração é habilitada pelo seu gestor.</p>
            </div>
            <div className="w-12 h-6 bg-slate-200 dark:bg-slate-800 rounded-full relative opacity-50 cursor-not-allowed">
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></div>
            </div>
          </div>
        </section>

        <hr className="dark:border-slate-800" />

        {/* Notificações Push */}
        <section className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm">Notificações de Push</h3>
              <p className="text-xs text-slate-500 font-medium">Lembrete de Registro de Ponto</p>
            </div>
            <button 
              onClick={() => setPushEnabled(!pushEnabled)}
              className={`w-12 h-6 rounded-full relative transition-colors ${pushEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${pushEnabled ? 'right-1' : 'left-1'}`}></div>
            </button>
          </div>
        </section>

        <hr className="dark:border-slate-800" />

        {/* Alterar Senha */}
        <section className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">Nova Senha</label>
            <div className="flex-1 relative">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Nova senha"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800 pr-10 outline-none focus:border-indigo-500 dark:text-white"
              />
              <button 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-600"
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>
          <button 
            onClick={handleUpdatePassword}
            disabled={loading}
            className="w-full py-3 border-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 rounded-lg font-bold text-sm hover:bg-indigo-50 active:bg-indigo-100 transition-colors"
          >
            {loading ? "Processando..." : "Alterar Senha"}
          </button>
        </section>

        <hr className="dark:border-slate-800" />

        {/* Opções Avançadas */}
        <section className="space-y-4">
          <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm">Opções avançadas</h3>
          <div className="space-y-3">
            <button className="w-full py-3 border-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 rounded-lg font-bold text-sm">
              Sincronizar registros
            </button>
            <button 
              onClick={handleExportData}
              className="w-full py-3 border-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 rounded-lg font-bold text-sm"
            >
              Exportar banco de dados
            </button>
            <button className="w-full py-3 border-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 rounded-lg font-bold text-sm">
              Status das configurações
            </button>
          </div>
        </section>

      </div>
    </div>
  );
};

export default SettingsView;
