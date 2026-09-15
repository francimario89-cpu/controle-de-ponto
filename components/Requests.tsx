import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { AttendanceRequest } from '../types';

const Requests: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [showCreateMode, setShowCreateMode] = useState(false);
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [type, setType] = useState<'inclusão' | 'atestado' | 'licenca_maternidade'>('inclusão');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [daysCount, setDaysCount] = useState(1);
  const [cid, setCid] = useState('');
  const [informTimes, setInformTimes] = useState(false);
  const [times, setTimes] = useState<string[]>(['08:00', '12:00', '14:00', '18:00']);
  const [reason, setReason] = useState('Esquecimento');
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

  // Função auxiliar para calcular dias entre duas datas
  const calculateDaysBetween = (startStr: string, endStr: string): number => {
    if (!startStr || !endStr) return 1;
    const s = new Date(startStr);
    const e = new Date(endStr);
    const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  };

  // Ajusta automaticamente endDate quando altera date ou daysCount em atestado ou licença maternidade
  const handleStartDateChange = (newStart: string) => {
    setDate(newStart);
    if (type === 'atestado' || type === 'licenca_maternidade') {
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
  const handleTypeSelect = (selectedType: 'inclusão' | 'atestado' | 'licenca_maternidade') => {
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
    } else {
      setReason('Esquecimento');
      setEndDate(date);
    }
  };

  useEffect(() => {
    if (!user?.companyCode || !user?.matricula) return;
    
    const q = query(
      collection(db, "requests"), 
      where("companyCode", "==", user.companyCode),
      where("matricula", "==", user.matricula)
    );

    const unsub = onSnapshot(q, (snap) => {
      const reqs: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        reqs.push({ 
          id: d.id, 
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date())
        });
      });
      setRequests(reqs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    }, (err) => {
      console.error("Erro ao carregar solicitações:", err);
    });
    return () => unsub();
  }, [user?.companyCode, user?.matricula]);

  const filteredRequests = requests.filter(r => {
    if (activeTab === 'pending') return r.status === 'pending';
    if (activeTab === 'approved') return r.status === 'approved';
    return r.status === 'rejected';
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 600 * 1024) { 
        alert("Arquivo muito pesado! Por favor, reduza a qualidade da foto ou envie um arquivo de até 600KB.");
        return;
      }
      setAttachmentName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => setAttachmentData(event.target?.result as string);
      reader.readAsDataURL(file);
    }
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
      } else {
        finalReason = customDetail.trim() ? `${reason} - ${customDetail.trim()}` : reason;
      }

      const payload: any = {
        companyCode: user.companyCode,
        matricula: user.matricula,
        userName: user.name,
        type: type,
        reason: finalReason,
        date: date,
        endDate: (type === 'atestado' || type === 'licenca_maternidade') ? endDate : date,
        daysCount: (type === 'atestado' || type === 'licenca_maternidade') ? daysCount : 1,
        cid: cid ? cid.toUpperCase() : '',
        status: 'pending',
        attachment: attachmentData || "",
        attachmentName: attachmentName || "",
        createdAt: serverTimestamp()
      };

      if (type === 'inclusão' && informTimes) {
        payload.suggestedTimes = times.filter(t => !!t);
      }

      await addDoc(collection(db, "requests"), payload);
      setShowCreateMode(false);
      setAttachmentName(null);
      setAttachmentData(null);
      setCustomDetail('');
      setCid('');
      setActiveTab('pending');
      alert("Solicitação de aprovação enviada com sucesso para o RH!");
    } catch (e) {
      alert("Erro ao enviar. Tente novamente ou verifique se o arquivo não é muito grande.");
    }
    setLoading(false);
  };

  if (showCreateMode) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-slate-900 animate-in slide-in-from-right duration-300">
        <header className="px-4 py-4 flex items-center border-b dark:border-slate-800">
          <button onClick={() => setShowCreateMode(false)} className="p-2 text-orange-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="flex-1 text-center font-black text-slate-800 dark:text-white mr-10 text-sm uppercase">Pedir Aprovação ao RH</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 no-scrollbar pb-32">
          {/* Tipos de Solicitação */}
          <div className="grid grid-cols-3 gap-2">
            <button 
              type="button"
              onClick={() => handleTypeSelect('inclusão')} 
              className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all ${
                type === 'inclusão' ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 shadow-sm' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-500'
              }`}
            >
              <span className="text-2xl block mb-1">📝</span>
              <span className="text-[8px] font-black uppercase tracking-tight">Esquecimento de Ponto</span>
            </button>

            <button 
              type="button"
              onClick={() => handleTypeSelect('atestado')} 
              className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all ${
                type === 'atestado' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 shadow-sm' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-500'
              }`}
            >
              <span className="text-2xl block mb-1">🏥</span>
              <span className="text-[8px] font-black uppercase tracking-tight">Atestado Médico</span>
            </button>

            <button 
              type="button"
              onClick={() => handleTypeSelect('licenca_maternidade')} 
              className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all ${
                type === 'licenca_maternidade' ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 shadow-sm' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-500'
              }`}
            >
              <span className="text-2xl block mb-1">🤱</span>
              <span className="text-[8px] font-black uppercase tracking-tight">Licença Maternidade</span>
            </button>
          </div>

          {/* Banner Informativo */}
          {type === 'atestado' && (
            <div className="bg-blue-50/90 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 p-4 rounded-2xl space-y-1 text-blue-900 dark:text-blue-200 text-[9px] font-bold">
              <div className="flex items-center gap-2 font-black uppercase text-blue-700 dark:text-blue-300">
                <span>🏥</span> Afastamento por Saúde / Atestado Médico:
              </div>
              <p className="leading-relaxed">
                Marque o dia inicial e a quantidade de dias do atestado. Todos os dias do período serão encaminhados ao RH para abono integral no seu espelho de ponto.
              </p>
            </div>
          )}

          {type === 'licenca_maternidade' && (
            <div className="bg-rose-50/90 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 p-4 rounded-2xl space-y-1 text-rose-900 dark:text-rose-200 text-[9px] font-bold">
              <div className="flex items-center gap-2 font-black uppercase text-rose-700 dark:text-rose-300">
                <span>🤱</span> Licença Maternidade (CLT Art. 392):
              </div>
              <p className="leading-relaxed">
                Período oficial de 120 dias (ou 180 dias se Empresa Cidadã). As horas de trabalho ficam totalmente abonadas durante todo o período.
              </p>
            </div>
          )}

          {/* Seleção de Datas para Atestado Médico */}
          {type === 'atestado' && (
            <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-[28px] border dark:border-slate-700 space-y-4">
              <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Período do Atestado Médico
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                    Data de Início do Atestado
                  </label>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={e => handleStartDateChange(e.target.value)} 
                    className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl text-xs font-black border dark:border-slate-700 outline-none" 
                  />
                </div>

                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                    Data de Término do Atestado
                  </label>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={e => handleEndDateChange(e.target.value)} 
                    className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl text-xs font-black border dark:border-slate-700 outline-none" 
                  />
                </div>
              </div>

              {/* Botões Rápidos de Quantidade de Dias */}
              <div>
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                  Selecione os dias de atestado:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[1, 2, 3, 5, 7, 10, 14, 15].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleDaysChange(d)}
                      className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${
                        daysCount === d 
                          ? 'bg-blue-600 text-white shadow-md scale-105' 
                          : 'bg-white dark:bg-slate-900 border dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300'
                      }`}
                    >
                      {d} {d === 1 ? 'Dia' : 'Dias'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resumo do Período */}
              <div className="bg-blue-50/60 dark:bg-blue-950/20 p-3 rounded-2xl border border-blue-100 dark:border-blue-900/40 flex items-center justify-between text-[9px] font-black uppercase text-blue-700 dark:text-blue-300">
                <span>Duração do Atestado:</span>
                <span>
                  {daysCount} {daysCount === 1 ? 'dia' : 'dias'} ({new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')} até {new Date(endDate + 'T12:00:00').toLocaleDateString('pt-BR')})
                </span>
              </div>

              {/* Campo CID */}
              <div>
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                  Código CID do Atestado (Opcional)
                </label>
                <input 
                  type="text" 
                  placeholder="Ex: J06.9, M54.5 (conforme atestado)"
                  value={cid} 
                  onChange={e => setCid(e.target.value.toUpperCase())}
                  className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl text-xs font-bold border dark:border-slate-700 outline-none uppercase" 
                />
              </div>
            </div>
          )}

          {/* Seleção para Licença Maternidade */}
          {type === 'licenca_maternidade' && (
            <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-[28px] border dark:border-slate-700 space-y-4">
              <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Período da Licença Maternidade
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                    Data de Início (Parto ou Atestado Pré-Parto)
                  </label>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={e => handleStartDateChange(e.target.value)} 
                    className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl text-xs font-black border dark:border-slate-700 outline-none" 
                  />
                </div>

                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                    Data de Retorno Previsto
                  </label>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={e => handleEndDateChange(e.target.value)} 
                    className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl text-xs font-black border dark:border-slate-700 outline-none" 
                  />
                </div>
              </div>

              {/* Botões Rápidos de Licença Maternidade */}
              <div>
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                  Duração da Licença:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDaysChange(120)}
                    className={`p-3 rounded-2xl text-[9px] font-black uppercase text-left transition-all border ${
                      daysCount === 120 
                        ? 'bg-rose-500 text-white border-rose-600 shadow-md' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <p className="font-black text-xs mb-0.5">120 Dias</p>
                    <p className="text-[7.5px] opacity-80 uppercase">Padrão CLT (Art. 392)</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDaysChange(180)}
                    className={`p-3 rounded-2xl text-[9px] font-black uppercase text-left transition-all border ${
                      daysCount === 180 
                        ? 'bg-rose-500 text-white border-rose-600 shadow-md' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <p className="font-black text-xs mb-0.5">180 Dias</p>
                    <p className="text-[7.5px] opacity-80 uppercase">Empresa Cidadã</p>
                  </button>
                </div>
              </div>

              {/* Resumo da Licença */}
              <div className="bg-rose-50/60 dark:bg-rose-950/20 p-3 rounded-2xl border border-rose-100 dark:border-rose-900/40 flex items-center justify-between text-[9px] font-black uppercase text-rose-700 dark:text-rose-300">
                <span>Período Total:</span>
                <span>
                  {daysCount} dias ({new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')} até {new Date(endDate + 'T12:00:00').toLocaleDateString('pt-BR')})
                </span>
              </div>
            </div>
          )}

          {/* Seleção para Esquecimento de Ponto */}
          {type === 'inclusão' && (
            <>
              <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-[28px] border dark:border-slate-700">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Data da Ocorrência / Esquecimento</p>
                <input 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                  className="bg-transparent border-none outline-none font-black text-slate-800 dark:text-white text-sm w-full" 
                />
              </div>

              <div>
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1 block">Motivo Principal</label>
                <select value={reason} onChange={e => setReason(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl text-[11px] font-black outline-none">
                  <option value="Esquecimento">Esquecimento de registro</option>
                  <option value="Problemas Técnicos">Problemas Técnicos / Celular sem bateria</option>
                  <option value="Trabalho Externo">Trabalho Externo / Viagem a serviço</option>
                  <option value="Outros">Outros motivos</option>
                </select>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-3xl border dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-300">
                    Deseja sugerir os horários esquecidos?
                  </span>
                  <button
                    type="button"
                    onClick={() => setInformTimes(!informTimes)}
                    className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase transition-all ${
                      informTimes ? 'bg-orange-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {informTimes ? 'Sim (Informar)' : 'Não (Apenas Pedir)'}
                  </button>
                </div>

                {informTimes && (
                  <div className="space-y-2 pt-2 border-t dark:border-slate-700 animate-in fade-in duration-200">
                    <p className="text-[8px] font-bold text-slate-400 uppercase">Horários sugeridos para inclusão:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {['Entrada 1', 'Saída 1 (Almoço)', 'Entrada 2 (Retorno)', 'Saída 2'].map((label, idx) => (
                        <div key={idx} className="space-y-1">
                          <label className="text-[7px] font-black uppercase text-slate-400 block">{label}</label>
                          <input
                            type="time"
                            value={times[idx] || ''}
                            onChange={e => {
                              const newTimes = [...times];
                              newTimes[idx] = e.target.value;
                              setTimes(newTimes);
                            }}
                            className="w-full p-2.5 bg-white dark:bg-slate-900 rounded-xl text-xs font-black border dark:border-slate-700 outline-none text-center"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Observação / Justificativa */}
          <div>
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1 block">Observação / Justificativa (Opcional)</label>
            <textarea
              rows={3}
              value={customDetail}
              onChange={e => setCustomDetail(e.target.value)}
              placeholder="Descreva brevemente a justificativa para o gestor..."
              className="w-full p-4 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-3xl text-[11px] font-bold outline-none resize-none"
            />
          </div>

          {/* Comprovante / Atestado */}
          <div>
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1 block">
              {type === 'atestado' 
                ? 'Foto / Arquivo do Atestado Médico (Recomendado)' 
                : type === 'licenca_maternidade' 
                  ? 'Certidão ou Laudo Médico Pré-Parto' 
                  : 'Comprovante / Declaração (Opcional)'}
            </label>
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*" />
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()} 
              className={`w-full p-5 rounded-3xl border-2 border-dashed transition-all ${
                attachmentName 
                  ? 'border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' 
                  : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300'
              }`}
            >
              <span className="font-black text-[10px] uppercase">
                {attachmentName ? `✓ ${attachmentName}` : '📁 Anexar Foto / Documento (Max 600KB)'}
              </span>
            </button>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-4 pt-2">
            <button 
              type="button"
              onClick={() => setShowCreateMode(false)} 
              className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-[28px] text-[10px] font-black uppercase text-slate-600 dark:text-slate-300"
            >
              Cancelar
            </button>
            <button 
              type="button"
              onClick={handleSubmit} 
              disabled={loading} 
              className="flex-[2] py-5 bg-orange-600 hover:bg-orange-700 text-white rounded-[28px] font-black uppercase shadow-xl disabled:opacity-50 transition-all"
            >
              {loading ? 'Enviando...' : 'Pedir Aprovação'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      <header className="px-4 py-4 border-b dark:border-slate-800 flex flex-col items-center">
        <h1 className="font-black text-slate-800 dark:text-white text-sm uppercase">Meus Pedidos RH</h1>
        <div className="flex bg-white dark:bg-slate-800 p-1 rounded-2xl w-full mt-4 border dark:border-slate-700">
          {(['pending', 'approved', 'rejected'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-3 text-[9px] font-black uppercase rounded-xl transition-all ${activeTab === t ? 'bg-orange-500 text-white' : 'text-slate-400'}`}>
              {t === 'pending' ? 'Em análise' : t === 'approved' ? 'Aprovadas' : 'Recusadas'}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar pb-32">
        {filteredRequests.map((req) => {
          const isAtestado = req.type === 'atestado' || req.type === 'abono';
          const isMaternidade = req.type === 'licenca_maternidade';

          return (
            <div key={req.id} className="bg-white dark:bg-slate-800 p-6 rounded-[35px] border border-slate-100 dark:border-slate-700 shadow-sm animate-in fade-in space-y-3">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl ${
                     isMaternidade 
                       ? 'bg-rose-50 text-rose-500 dark:bg-rose-950/30' 
                       : isAtestado 
                         ? 'bg-blue-50 text-blue-500 dark:bg-blue-950/30' 
                         : 'bg-orange-50 text-orange-500 dark:bg-orange-950/30'
                   }`}>
                      {isMaternidade ? '🤱' : isAtestado ? '🏥' : '📝'}
                   </div>
                   <div>
                      <p className="text-[10px] font-black uppercase leading-none">
                        {isMaternidade ? 'Licença Maternidade' : isAtestado ? 'Atestado Médico' : 'Esquecimento de Ponto'}
                      </p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">
                        {req.endDate && req.endDate !== req.date ? (
                          `Período: ${new Date(req.date + 'T12:00:00').toLocaleDateString('pt-BR')} até ${new Date(req.endDate + 'T12:00:00').toLocaleDateString('pt-BR')} (${req.daysCount || calculateDaysBetween(req.date, req.endDate)} dias)`
                        ) : (
                          `Data: ${new Date(req.date + 'T12:00:00').toLocaleDateString('pt-BR')}`
                        )}
                      </p>
                   </div>
                 </div>
                 <div className={`px-3 py-1 rounded-full text-[7px] font-black uppercase ${req.status === 'approved' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' : req.status === 'rejected' ? 'bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400' : 'bg-orange-100 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400'}`}>
                   {req.status === 'approved' ? 'Aprovado' : req.status === 'rejected' ? 'Recusado' : 'Em análise'}
                 </div>
              </div>

              <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 italic">"{req.reason}"</p>

              {req.cid && (
                <span className="inline-block bg-blue-50 dark:bg-blue-950/20 text-blue-600 border border-blue-100 dark:border-blue-900/30 px-2.5 py-1 rounded-xl text-[8px] font-mono font-bold">
                  CID: {req.cid}
                </span>
              )}

              {req.attachment && (
                <button
                  onClick={() => setSelectedPhotoModal(req.attachment!)}
                  className="inline-flex items-center gap-1.5 text-blue-500 hover:text-blue-700 text-[8px] font-black uppercase pt-1"
                >
                  📷 Ver Comprovante / Atestado Anexo
                </button>
              )}
            </div>
          );
        })}

        {filteredRequests.length === 0 && (
          <div className="py-20 text-center opacity-30 flex flex-col items-center">
            <span className="text-4xl mb-2">📄</span>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nenhuma solicitação nesta aba</p>
          </div>
        )}
      </div>

      <button onClick={() => setShowCreateMode(true)} className="fixed bottom-28 right-6 w-16 h-16 bg-orange-600 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 border-4 border-white transition-all">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M12 4v16m8-8H4" /></svg>
      </button>

      {/* Modal de visualização do anexo */}
      {selectedPhotoModal && (
        <div className="fixed inset-0 z-[110] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
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
