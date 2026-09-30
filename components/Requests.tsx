import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { AttendanceRequest } from '../types';
import { Camera, Upload, CheckCircle2, XCircle, Clock, FileText, AlertCircle, ShieldCheck } from 'lucide-react';

const Requests: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [showCreateMode, setShowCreateMode] = useState(() => {
    return Boolean(localStorage.getItem('pontoexato_adjust_date'));
  });
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const [type, setType] = useState<'inclusão' | 'atestado' | 'licenca_maternidade' | 'folga_compensatoria' | 'folga_abonada'>('inclusão');
  
  // Campos específicos de Ajuste de Ponto (Portaria 671 MTP)
  const [adjustType, setAdjustType] = useState<'entrada' | 'saida_intervalo' | 'retorno_intervalo' | 'saida' | 'inclusao' | 'correcao'>('retorno_intervalo');
  const [requestedTime, setRequestedTime] = useState('13:02');
  const [originalTime, setOriginalTime] = useState('—');

  const [date, setDate] = useState(() => {
    const prefill = localStorage.getItem('pontoexato_adjust_date');
    if (prefill) {
      localStorage.removeItem('pontoexato_adjust_date');
      return prefill;
    }
    return new Date().toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [daysCount, setDaysCount] = useState(1);
  const [cid, setCid] = useState('');
  const [reason, setReason] = useState('Esqueci de registrar o retorno do intervalo.');
  const [customDetail, setCustomDetail] = useState('');
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [attachmentData, setAttachmentData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<string | null>(null);

  const userStr = localStorage.getItem('fortime_user');
  const user = userStr ? JSON.parse(userStr) : null;

  // Função auxiliar para calcular data final com base na quantidade de dias
  const calculateEndDateFromDays = (startStr: string, days: number): string => {
    if (!startStr || isNaN(days) || days < 1) return startStr;
    const [y, m, d] = startStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + (days - 1));
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const calculateDaysBetween = (startStr: string, endStr: string): number => {
    if (!startStr || !endStr) return 1;
    const s = new Date(startStr);
    const e = new Date(endStr);
    const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  };

  const isPeriodType = (t: string) => ['atestado', 'licenca_maternidade', 'folga_compensatoria', 'folga_abonada'].includes(t);

  const handleStartDateChange = (newStart: string) => {
    setDate(newStart);
    if (isPeriodType(type)) {
      const calculatedEnd = calculateEndDateFromDays(newStart, daysCount);
      setEndDate(calculatedEnd);
    } else {
      setEndDate(newStart);
    }
  };

  const handleDaysChange = (days: number) => {
    setDaysCount(days);
    const calculatedEnd = calculateEndDateFromDays(date, days);
    setEndDate(calculatedEnd);
  };

  const handleEndDateChange = (newEnd: string) => {
    setEndDate(newEnd);
    const days = calculateDaysBetween(date, newEnd);
    setDaysCount(days);
  };

  // Predefinições ao trocar de tipo
  const handleTypeSelect = (selectedType: 'inclusão' | 'atestado' | 'licenca_maternidade' | 'folga_compensatoria' | 'folga_abonada') => {
    setType(selectedType);
    if (selectedType === 'licenca_maternidade') {
      setDaysCount(120);
      setReason('Licença Maternidade (Art. 392 da CLT)');
      const calculatedEnd = calculateEndDateFromDays(date, 120);
      setEndDate(calculatedEnd);
    } else if (selectedType === 'atestado') {
      setDaysCount(1);
      setReason('Atestado Médico / Afastamento por Saúde');
      const calculatedEnd = calculateEndDateFromDays(date, 1);
      setEndDate(calculatedEnd);
    } else if (selectedType === 'folga_compensatoria') {
      setDaysCount(1);
      setReason('Folga Compensatória (Desconto no Banco de Horas)');
      const calculatedEnd = calculateEndDateFromDays(date, 1);
      setEndDate(calculatedEnd);
    } else if (selectedType === 'folga_abonada') {
      setDaysCount(1);
      setReason('Folga Programada Abonada');
      const calculatedEnd = calculateEndDateFromDays(date, 1);
      setEndDate(calculatedEnd);
    } else {
      setReason('Esqueci de registrar o retorno do intervalo.');
      setEndDate(date);
    }
  };

  const handleAdjustTypeSelect = (adj: 'entrada' | 'saida_intervalo' | 'retorno_intervalo' | 'saida' | 'inclusao' | 'correcao') => {
    setAdjustType(adj);
    if (adj === 'entrada') {
      setReason('Esqueci de bater a entrada.');
      setRequestedTime('08:00');
    } else if (adj === 'saida_intervalo') {
      setReason('Esqueci de registrar a saída para o intervalo.');
      setRequestedTime('12:00');
    } else if (adj === 'retorno_intervalo') {
      setReason('Esqueci de registrar o retorno do intervalo.');
      setRequestedTime('13:00');
    } else if (adj === 'saida') {
      setReason('Esqueci de registrar a saída.');
      setRequestedTime('18:00');
    } else if (adj === 'correcao') {
      setReason('Horário registrado incorretamente.');
    } else {
      setReason('Inclusão de marcação não realizada.');
    }
  };

  useEffect(() => {
    if (!user?.companyCode || !user?.matricula) return;
    
    const q = query(
      collection(db, "requests"), 
      where("companyCode", "==", user.companyCode),
      where("matricula", "==", user.matricula)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date()
      })) as AttendanceRequest[];
      
      data.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setRequests(data);
    });

    return () => unsub();
  }, [user?.companyCode, user?.matricula]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      alert("Arquivo muito grande. O tamanho máximo permitido é de 800KB.");
      return;
    }

    setAttachmentName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentData(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (!user || !user.companyCode) {
      alert("Erro ao identificar empresa. Saia e entre novamente.");
      return;
    }
    setLoading(true);
    try {
      let finalReason = reason;
      if (type === 'atestado') {
        finalReason = `Atestado Médico - Afastamento de ${daysCount} dia(s)`;
        if (cid) finalReason += ` (CID: ${cid.toUpperCase()})`;
        if (customDetail.trim()) finalReason += ` - ${customDetail.trim()}`;
      } else if (type === 'licenca_maternidade') {
        finalReason = `Licença Maternidade (${daysCount} dias)`;
        if (customDetail.trim()) finalReason += ` - ${customDetail.trim()}`;
      } else if (type === 'folga_compensatoria') {
        finalReason = `Folga Compensatória - Débito no Banco de Horas (${daysCount} dia(s))`;
        if (customDetail.trim()) finalReason += ` - ${customDetail.trim()}`;
      } else if (type === 'folga_abonada') {
        finalReason = `Folga Abonada pela Empresa (${daysCount} dia(s))`;
        if (customDetail.trim()) finalReason += ` - ${customDetail.trim()}`;
      } else {
        finalReason = customDetail.trim() ? customDetail.trim() : reason;
      }

      const adjustLabel = adjustType === 'entrada' ? 'Entrada'
        : adjustType === 'saida_intervalo' ? 'Saída Intervalo'
        : adjustType === 'retorno_intervalo' ? 'Retorno Intervalo'
        : adjustType === 'saida' ? 'Saída'
        : adjustType === 'correcao' ? 'Correção de Horário'
        : 'Inclusão de Marcação';

      const payload: any = {
        companyCode: user.companyCode,
        matricula: user.matricula,
        userName: user.name,
        type: type,
        reason: finalReason,
        date: date,
        endDate: isPeriodType(type) ? endDate : date,
        daysCount: isPeriodType(type) ? daysCount : 1,
        cid: cid ? cid.toUpperCase() : '',
        status: 'pending',
        attachment: attachmentData || "",
        attachmentName: attachmentName || "",
        createdAt: serverTimestamp(),
        // Campos de ajuste do espelho
        adjustType: adjustType,
        requestedTime: requestedTime,
        originalTime: originalTime || '—',
        auditLog: `${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}: ${user.name} solicitou ajuste de ${adjustLabel} para ${requestedTime}.`
      };

      await addDoc(collection(db, "requests"), payload);
      setShowCreateMode(false);
      setAttachmentName(null);
      setAttachmentData(null);
      setCustomDetail('');
      setCid('');
      setActiveTab('pending');
      alert("Solicitação de ajuste enviada com sucesso para o RH!");
    } catch (e) {
      alert("Erro ao enviar. Tente novamente.");
    }
    setLoading(false);
  };

  const filteredRequests = requests.filter(r => r.status === activeTab);

  const getAdjustLabel = (req: AttendanceRequest) => {
    if (!req.adjustType) return 'Ajuste de Ponto';
    switch (req.adjustType) {
      case 'entrada': return 'Entrada';
      case 'saida_intervalo': return 'Saída para Intervalo';
      case 'retorno_intervalo': return 'Retorno do Intervalo';
      case 'saida': return 'Saída';
      case 'correcao': return 'Correção de Horário';
      default: return 'Inclusão de Marcação';
    }
  };

  if (showCreateMode) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-slate-900 animate-in slide-in-from-right duration-300 font-sans">
        <header className="px-4 py-4 flex items-center border-b dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <button onClick={() => setShowCreateMode(false)} className="p-2 text-orange-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex-1 text-center mr-8">
            <h1 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">
              Solicitar Ajuste do Espelho de Ponto
            </h1>
            <p className="text-[8px] font-bold text-slate-400">Portaria 671 MTP - Transparência e Auditoria</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 no-scrollbar pb-32">
          {/* Tipos Principais */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button 
              type="button"
              onClick={() => handleTypeSelect('inclusão')} 
              className={`p-3.5 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all ${
                type === 'inclusão' ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 shadow-sm scale-[1.02]' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-500'
              }`}
            >
              <span className="text-xl block mb-1">✏️</span>
              <span className="text-[8.5px] font-black uppercase tracking-tight">Ajuste de Ponto</span>
            </button>

            <button 
              type="button"
              onClick={() => handleTypeSelect('atestado')} 
              className={`p-3.5 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all ${
                type === 'atestado' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 shadow-sm scale-[1.02]' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-500'
              }`}
            >
              <span className="text-xl block mb-1">🏥</span>
              <span className="text-[8.5px] font-black uppercase tracking-tight">Atestado Médico</span>
            </button>

            <button 
              type="button"
              onClick={() => handleTypeSelect('folga_compensatoria')} 
              className={`p-3.5 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all ${
                type === 'folga_compensatoria' ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 shadow-sm scale-[1.02]' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-500'
              }`}
            >
              <span className="text-xl block mb-1">🏖️</span>
              <span className="text-[8.5px] font-black uppercase tracking-tight">Folga Compensatória</span>
            </button>
          </div>

          {/* SELEÇÃO ESPECÍFICA PARA AJUSTE DE PONTO */}
          {type === 'inclusão' && (
            <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-[32px] border dark:border-slate-700/60 space-y-4">
              {/* DATA */}
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                  Data do Ponto
                </label>
                <input 
                  type="date" 
                  value={date} 
                  onChange={e => handleStartDateChange(e.target.value)} 
                  className="w-full p-3.5 bg-white dark:bg-slate-900 rounded-2xl text-xs font-black border dark:border-slate-700 outline-none" 
                />
              </div>

              {/* TIPO DE AJUSTE */}
              <div>
                <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 block">
                  Tipo de Ajuste Solicitado
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'entrada', label: '⭕ Entrada' },
                    { id: 'saida_intervalo', label: '⭕ Saída para Intervalo' },
                    { id: 'retorno_intervalo', label: '⭕ Retorno do Intervalo' },
                    { id: 'saida', label: '⭕ Saída' },
                    { id: 'inclusao', label: '⭕ Inclusão de Marcação' },
                    { id: 'correcao', label: '⭕ Correção de Horário' },
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleAdjustTypeSelect(item.id as any)}
                      className={`p-3 rounded-2xl text-[9px] font-black uppercase text-left transition-all border ${
                        adjustType === item.id 
                          ? 'bg-orange-600 text-white border-orange-600 shadow-md scale-[1.02]' 
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-orange-300'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* HORÁRIO SOLICITADO */}
              <div>
                <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">
                  Horário Correto Solicitado
                </label>
                <div className="flex items-center gap-2">
                  <input 
                    type="time" 
                    value={requestedTime} 
                    onChange={e => setRequestedTime(e.target.value)} 
                    className="flex-1 p-3.5 bg-white dark:bg-slate-900 rounded-2xl text-base font-black font-mono border dark:border-slate-700 outline-none" 
                  />
                  <span className="text-[10px] text-slate-400 font-bold uppercase px-2">
                    Ex: 13:02
                  </span>
                </div>
              </div>

              {/* MOTIVO DA SOLICITAÇÃO */}
              <div>
                <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">
                  Motivo da Solicitação
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Ex: Esqueci de registrar o retorno do intervalo."
                  className="w-full p-3.5 bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-2xl text-xs font-bold outline-none resize-none"
                />

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    'Esqueci de registrar o retorno do intervalo.',
                    'Esqueci de bater a entrada.',
                    'Esqueci de bater a saída.',
                    'Problema no aplicativo/internet no momento da batida.',
                    'Horário autorizado previamente pelo gestor.'
                  ].map((sug, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setReason(sug)}
                      className="px-2.5 py-1 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-[8px] font-bold rounded-lg border dark:border-slate-700 hover:border-orange-400"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* DEMAIS CAMPOS PARA ATESTADO MÉDICO */}
          {type === 'atestado' && (
            <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-[28px] border dark:border-slate-700 space-y-4">
              <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Período do Atestado Médico
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Data de Início</label>
                  <input type="date" value={date} onChange={e => handleStartDateChange(e.target.value)} className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl text-xs font-black border" />
                </div>
                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Data de Término</label>
                  <input type="date" value={endDate} onChange={e => handleEndDateChange(e.target.value)} className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl text-xs font-black border" />
                </div>
              </div>
              <div>
                <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Código CID (Opcional)</label>
                <input type="text" placeholder="Ex: J06.9" value={cid} onChange={e => setCid(e.target.value.toUpperCase())} className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl text-xs font-bold border uppercase" />
              </div>
            </div>
          )}

          {/* ANEXAR COMPROVANTE (TIRAR FOTO OU ESCOLHER ARQUIVO) */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-3xl border dark:border-slate-700/60 space-y-2">
            <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block">
              Anexar Documento / Comprovante (Opcional)
            </label>
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*,.pdf" />
            <input type="file" ref={cameraInputRef} className="hidden" onChange={handleFileChange} accept="image/*" capture="environment" />

            <div className="grid grid-cols-2 gap-2">
              <button 
                type="button"
                onClick={() => cameraInputRef.current?.click()} 
                className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[9px] font-black uppercase flex items-center justify-center gap-1.5 shadow-sm hover:border-orange-400"
              >
                <Camera size={14} className="text-orange-500" /> Tirar Foto
              </button>
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()} 
                className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[9px] font-black uppercase flex items-center justify-center gap-1.5 shadow-sm hover:border-orange-400"
              >
                <Upload size={14} className="text-orange-500" /> Escolher Arquivo
              </button>
            </div>

            {attachmentName && (
              <p className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <span>📎 Anexo: {attachmentName}</span>
                <button type="button" onClick={() => { setAttachmentName(null); setAttachmentData(null); }} className="text-rose-500 font-black">✕</button>
              </p>
            )}
          </div>

          {/* BOTÕES DE ENVIO */}
          <div className="flex gap-3 pt-2">
            <button 
              type="button"
              onClick={() => setShowCreateMode(false)} 
              className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-600 dark:text-slate-300"
            >
              Cancelar
            </button>
            <button 
              type="button"
              onClick={handleSubmit} 
              disabled={loading} 
              className="flex-[2] py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-wider shadow-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Enviando...' : 'Enviar Solicitação'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans">
      <header className="px-4 py-4 border-b dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center">
        <h1 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">
          Solicitações e Ajustes de Ponto
        </h1>
        <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Acompanhamento em Tempo Real</p>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-full mt-3 border dark:border-slate-700">
          {(['pending', 'approved', 'rejected'] as const).map(t => (
            <button 
              key={t} 
              onClick={() => setActiveTab(t)} 
              className={`flex-1 py-2.5 text-[9px] font-black uppercase rounded-xl transition-all ${
                activeTab === t ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {t === 'pending' ? '🟡 Pendentes' : t === 'approved' ? '🟢 Aprovadas' : '🔴 Recusadas'}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar pb-32">
        {filteredRequests.map((req) => {
          const isAtestado = req.type === 'atestado';
          const isAdjustment = req.type === 'inclusão' || req.type === 'ajuste';
          const adjustLabel = getAdjustLabel(req);

          return (
            <div 
              key={req.id} 
              className="bg-white dark:bg-slate-900 p-5 rounded-[28px] border dark:border-slate-800 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg ${
                    req.status === 'approved' 
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40' 
                      : req.status === 'rejected'
                      ? 'bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40'
                      : 'bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/40'
                  }`}>
                    {req.status === 'approved' ? '🟢' : req.status === 'rejected' ? '🔴' : '🟡'}
                  </div>

                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white">
                      {isAdjustment ? `${adjustLabel} → ${req.requestedTime || 'Horário'}` : isAtestado ? 'Atestado Médico' : req.type}
                    </h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">
                      Data: {new Date(req.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase ${
                  req.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' :
                  req.status === 'rejected' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' :
                  'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                }`}>
                  {req.status === 'approved' ? 'Aprovada' : req.status === 'rejected' ? 'Recusada' : 'Pendente'}
                </span>
              </div>

              {/* MENSAGEM DO STATUS */}
              {req.status === 'pending' && (
                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl text-[9px] text-amber-800 dark:text-amber-300 space-y-0.5">
                  <p className="font-black uppercase flex items-center gap-1">
                    <Clock size={12} /> Aguardando análise do responsável
                  </p>
                  <p className="opacity-90">
                    Solicitação enviada em {req.createdAt.toLocaleDateString('pt-BR')} às {req.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.
                  </p>
                </div>
              )}

              {req.status === 'approved' && (
                <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl text-[9px] text-emerald-800 dark:text-emerald-300 space-y-0.5">
                  <p className="font-black uppercase flex items-center gap-1">
                    <CheckCircle2 size={12} /> Ajuste Aprovado pelo RH
                  </p>
                  <p className="opacity-90">
                    O espelho de ponto passou a constar o registro e o banco de horas foi recalculado.
                  </p>
                  {req.approvedBy && (
                    <p className="text-[8px] font-bold opacity-75">
                      Aprovado por: {req.approvedBy}
                    </p>
                  )}
                </div>
              )}

              {req.status === 'rejected' && (
                <div className="p-3 bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 rounded-2xl text-[9px] text-rose-800 dark:text-rose-300 space-y-1">
                  <p className="font-black uppercase flex items-center gap-1">
                    <XCircle size={12} /> Solicitação Recusada
                  </p>
                  {req.rejectionReason && (
                    <p className="font-medium bg-white/70 dark:bg-slate-900/70 p-2 rounded-xl border border-rose-100 dark:border-rose-900/40">
                      <b>Motivo informado pelo responsável:</b> "{req.rejectionReason}"
                    </p>
                  )}
                  {req.approvedBy && (
                    <p className="text-[8px] font-bold opacity-75">
                      Analisado por: {req.approvedBy}
                    </p>
                  )}
                </div>
              )}

              {/* MOTIVO APRESENTADO */}
              <div className="text-[10px] text-slate-600 dark:text-slate-300">
                <p className="text-[8px] font-black uppercase text-slate-400">Motivo Informado:</p>
                <p className="font-semibold italic">"{req.reason}"</p>
              </div>

              {/* ANEXO */}
              {req.attachment && (
                <button
                  onClick={() => setSelectedPhotoModal(req.attachment!)}
                  className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-[9px] font-black uppercase"
                >
                  <Camera size={12} /> Ver Comprovante Anexo
                </button>
              )}
            </div>
          );
        })}

        {filteredRequests.length === 0 && (
          <div className="py-20 text-center opacity-40 flex flex-col items-center">
            <span className="text-4xl mb-2">📄</span>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Nenhuma solicitação nesta categoria
            </p>
          </div>
        )}
      </div>

      {/* BOTÃO FLUTUANTE PARA NOVO PEDIDO */}
      <button 
        onClick={() => setShowCreateMode(true)} 
        className="fixed bottom-28 right-6 w-14 h-14 bg-orange-600 hover:bg-orange-700 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 border-4 border-white dark:border-slate-900 transition-all z-20"
        title="Nova Solicitação de Ajuste"
      >
        <span className="text-2xl font-light leading-none">+</span>
      </button>

      {/* MODAL DE VISUALIZAÇÃO DO ANEXO */}
      {selectedPhotoModal && (
        <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-[36px] max-w-lg w-full p-6 shadow-2xl relative">
            <button 
              onClick={() => setSelectedPhotoModal(null)} 
              className="absolute top-4 right-4 bg-slate-100 dark:bg-slate-700 p-2.5 rounded-full text-slate-700 dark:text-white"
            >
              ✕
            </button>
            <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white mb-4">Comprovante Anexo</h3>
            <img src={selectedPhotoModal} alt="Anexo" className="w-full max-h-[70vh] object-contain rounded-2xl border" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Requests;
