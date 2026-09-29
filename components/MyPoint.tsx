import React, { useState, useMemo } from 'react';
import { PointRecord, User, Company } from '../types';
import { Clock, Calendar, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, FileText, ArrowRight, PenTool } from 'lucide-react';

interface MyPointProps {
  records: PointRecord[];
  user?: User;
  company?: Company | null;
  onNavigate?: (view: string) => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAY_NAMES = [
  'DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'
];

export const MyPoint: React.FC<MyPointProps> = ({ records = [], user, company, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'history' | 'bank'>('history');
  
  // Mês selecionado (padrão: mês atual)
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  // Modal de Detalhes do Dia
  const [selectedDayDetail, setSelectedDayDetail] = useState<any | null>(null);

  const weeklyHours = (user as any)?.weeklyHours || 44;
  const isExempt = !!user?.isExemptPointControl;

  // Funções de navegação de mês
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  // Auxiliares de cálculo de tempo
  const formatMinutes = (min: number) => {
    const abs = Math.abs(min);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const formatSignedMinutes = (min: number) => {
    const sign = min >= 0 ? '+' : '-';
    const abs = Math.abs(min);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `${sign}${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`;
  };

  const calculateHoursDiff = (start: string, end: string) => {
    if (!start || !end) return 0;
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
    const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    return diff > 0 ? diff : 0;
  };

  // Cálculo diário e mensal detalhado
  const monthlyData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const days = [];

    let totalWorkedMin = 0;
    let totalExpectedMin = 0;
    let totalExtraMin = 0;
    let totalShortageMin = 0;

    // Semanas do mês para o gráfico
    const weeksMap: { [key: number]: { worked: number; expected: number } } = {
      1: { worked: 0, expected: 0 },
      2: { worked: 0, expected: 0 },
      3: { worked: 0, expected: 0 },
      4: { worked: 0, expected: 0 }
    };

    const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();
    const currentDay = now.getDate();

    for (let day = daysInMonth; day >= 1; day--) {
      const dateObj = new Date(selectedYear, selectedMonth, day);
      const dayOfWeek = dateObj.getDay(); // 0 Dom, 6 Sab
      const weekdayName = WEEKDAY_NAMES[dayOfWeek];
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isSunday = dayOfWeek === 0;
      const isSaturday = dayOfWeek === 6;

      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const displayDate = `${String(day).padStart(2, '0')}/${String(selectedMonth + 1).padStart(2, '0')}`;
      const fullDisplayDate = `${String(day).padStart(2, '0')}/${String(selectedMonth + 1).padStart(2, '0')}/${selectedYear}`;

      // Filtrar batidas reais deste dia
      const dayRecords = records.filter(r => {
        const rd = new Date(r.timestamp);
        return (
          rd.getFullYear() === selectedYear &&
          rd.getMonth() === selectedMonth &&
          rd.getDate() === day
        );
      }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      let e1 = '';
      let s1 = '';
      let e2 = '';
      let s2 = '';

      if (dayRecords.length === 1) {
        e1 = new Date(dayRecords[0].timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      } else if (dayRecords.length === 2) {
        e1 = new Date(dayRecords[0].timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        s2 = new Date(dayRecords[1].timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      } else if (dayRecords.length === 3) {
        e1 = new Date(dayRecords[0].timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        s1 = new Date(dayRecords[1].timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        e2 = new Date(dayRecords[2].timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      } else if (dayRecords.length >= 4) {
        e1 = new Date(dayRecords[0].timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        s1 = new Date(dayRecords[1].timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        e2 = new Date(dayRecords[2].timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        s2 = new Date(dayRecords[3].timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      }

      // Cálculo de minutos trabalhados
      let workedMin = 0;
      if (e1 && s1 && e2 && s2) {
        workedMin = calculateHoursDiff(e1, s1) + calculateHoursDiff(e2, s2);
      } else if (e1 && s2 && !s1 && !e2) {
        workedMin = calculateHoursDiff(e1, s2);
      } else if (e1 && s1 && !e2 && !s2) {
        workedMin = calculateHoursDiff(e1, s1);
      }

      // Jornada prevista para o dia
      let expectedMin = 0;
      if (!isExempt) {
        if (!isWeekend) {
          expectedMin = weeklyHours === 40 ? 480 : 528; // 8h ou 8h48 (para compensação de sábado)
        } else if (isSaturday && weeklyHours === 44) {
          expectedMin = 0; // compensado durante a semana
        }
      }

      let extraMin = 0;
      let shortageMin = 0;
      let occurrence = '';

      if (isSunday) {
        occurrence = 'DSR';
        if (workedMin > 0) extraMin = workedMin;
      } else if (isSaturday) {
        occurrence = 'Sábado';
        if (workedMin > 0) extraMin = workedMin;
      } else if (isExempt) {
        occurrence = 'Dispensado (Art. 62 CLT)';
      } else {
        if (workedMin > expectedMin) {
          extraMin = workedMin - expectedMin;
        } else if (workedMin < expectedMin) {
          // Apenas contabiliza falta se o dia já passou
          const isPastDay = !isCurrentMonth || day < currentDay;
          if (isPastDay) {
            shortageMin = expectedMin - workedMin;
            if (workedMin === 0) occurrence = 'Falta';
            else occurrence = 'Saída Antecipada / Atraso';
          }
        }
      }

      // Adiciona aos acumuladores mensais
      totalWorkedMin += workedMin;
      totalExpectedMin += expectedMin;
      totalExtraMin += extraMin;
      totalShortageMin += shortageMin;

      // Alocação por semanas
      const weekIndex = Math.min(4, Math.ceil(day / 7));
      if (weeksMap[weekIndex]) {
        weeksMap[weekIndex].worked += workedMin;
        weeksMap[weekIndex].expected += expectedMin;
      }

      days.push({
        day,
        dateStr,
        displayDate,
        fullDisplayDate,
        weekdayName,
        isWeekend,
        isSunday,
        isSaturday,
        e1,
        s1,
        e2,
        s2,
        records: dayRecords,
        workedMin,
        expectedMin,
        extraMin,
        shortageMin,
        occurrence,
        formattedWorked: workedMin > 0 ? formatMinutes(workedMin) : (workedMin === 0 && !isWeekend && (!isCurrentMonth || day <= currentDay) ? '00:00' : '-'),
        formattedExpected: expectedMin > 0 ? formatMinutes(expectedMin) : '00:00',
        hasRecords: dayRecords.length > 0,
        hasAdjustment: dayRecords.some(r => r.isAdjustment),
        hasOffline: dayRecords.some(r => r.isOffline)
      });
    }

    // Saldo acumulado do mês
    const netMonthMin = totalWorkedMin - totalExpectedMin;
    
    // Saldo anterior simulado constante/banco prévio
    const previousBalanceMin = 140; // +02h20 padrão de banco acumulado anterior
    const currentBalanceMin = previousBalanceMin + netMonthMin;

    // Semanas calculadas
    const weeklyBreakdown = [1, 2, 3, 4].map(w => {
      const diff = (weeksMap[w]?.worked || 0) - (weeksMap[w]?.expected || 0);
      return {
        week: w,
        label: `Semana ${w}`,
        diffMin: diff,
        formatted: formatSignedMinutes(diff),
        isPositive: diff >= 0
      };
    });

    return {
      days,
      daysInMonth,
      totalWorkedMin,
      totalExpectedMin,
      totalExtraMin,
      totalShortageMin,
      netMonthMin,
      previousBalanceMin,
      currentBalanceMin,
      weeklyBreakdown,
      formattedWorked: formatMinutes(totalWorkedMin),
      formattedExpected: formatMinutes(totalExpectedMin),
      formattedExtra: `+${formatMinutes(totalExtraMin)}`,
      formattedShortage: `-${formatMinutes(totalShortageMin)}`,
      formattedPreviousBalance: formatSignedMinutes(previousBalanceMin),
      formattedCurrentBalance: formatSignedMinutes(currentBalanceMin)
    };
  }, [records, selectedYear, selectedMonth, weeklyHours, isExempt]);

  // Ação para abrir solicitação de ajuste com data pré-selecionada
  const handleOpenAdjustment = (dateStr: string) => {
    localStorage.setItem('pontoexato_adjust_date', dateStr);
    setSelectedDayDetail(null);
    if (onNavigate) {
      onNavigate('requests');
    }
  };

  const handleDownloadPersonalReport = () => {
    if (records.length === 0) return alert("Nenhum registro para exportar.");
    
    let content = `LIVRO DE PONTO & HISTÓRICO - PONTOEXATO\n`;
    content += `COLABORADOR: ${user?.name || records[0]?.userName}\n`;
    content += `MATRÍCULA: ${user?.matricula || records[0]?.matricula || 'N/A'}\n`;
    content += `PERÍODO: ${MONTH_NAMES[selectedMonth].toUpperCase()} / ${selectedYear}\n`;
    content += `HORAS TRABALHADAS: ${monthlyData.formattedWorked}h | SALDO: ${monthlyData.formattedCurrentBalance}\n`;
    content += `------------------------------------------------------------\n`;
    
    monthlyData.days.forEach(d => {
      content += `${d.fullDisplayDate} (${d.weekdayName}) | E1: ${d.e1 || '-'} | S1: ${d.s1 || '-'} | E2: ${d.e2 || '-'} | S2: ${d.s2 || '-'} | Total: ${d.formattedWorked} | Extra: ${d.extraMin > 0 ? formatMinutes(d.extraMin) : '00:00'}\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Historico_Ponto_${user?.matricula || 'colaborador'}_${selectedYear}_${selectedMonth + 1}.txt`;
    link.click();
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans pb-28">
      {/* CABEÇALHO COM ABAS */}
      <header className="px-4 pt-4 pb-3 bg-white dark:bg-slate-900 border-b dark:border-slate-800 sticky top-0 z-20">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider">
              Minha Jornada & Extrato
            </h1>
            <p className="text-[9px] font-bold text-slate-400">Acompanhamento e Banco de Horas</p>
          </div>
          <button
            onClick={handleDownloadPersonalReport}
            className="px-3 py-1.5 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-orange-100 transition-all flex items-center gap-1"
          >
            <FileText size={12} /> Extrato
          </button>
        </div>

        {/* ABAS: HISTÓRICO & BANCO DE HORAS */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-full">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <span>📋 Histórico de Ponto</span>
          </button>
          <button
            onClick={() => setActiveTab('bank')}
            className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'bank'
                ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <span>📊 Meu Banco de Horas</span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
        {/* SELETOR DE MÊS */}
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 p-3 rounded-2xl flex items-center justify-between shadow-sm">
          <button
            onClick={handlePrevMonth}
            className="p-2 text-slate-500 hover:text-orange-600 dark:text-slate-400 dark:hover:text-white rounded-xl active:scale-95 transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <h2 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-widest">
              {MONTH_NAMES[selectedMonth]} {selectedYear}
            </h2>
            <p className="text-[8px] font-bold text-slate-400 uppercase">Período de Apuração Mensal</p>
          </div>
          <button
            onClick={handleNextMonth}
            className="p-2 text-slate-500 hover:text-orange-600 dark:text-slate-400 dark:hover:text-white rounded-xl active:scale-95 transition-all"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* ========================================================= */}
        {/* VISÃO 1: HISTÓRICO DE PONTO DIÁRIO                        */}
        {/* ========================================================= */}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* CARD DE SALDO DESTAQUE */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 rounded-[32px] shadow-xl flex items-center justify-between border border-slate-700/50">
              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black ${
                  monthlyData.currentBalanceMin >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {monthlyData.currentBalanceMin >= 0 ? '🟢' : '🔴'}
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Saldo do Banco de Horas</p>
                  <p className={`text-2xl font-black tracking-tight ${
                    monthlyData.currentBalanceMin >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {monthlyData.formattedCurrentBalance}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('bank')}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all"
              >
                Ver Detalhes
              </button>
            </div>

            {/* TABELA / CARD RESUMO MENSAL */}
            <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b dark:border-slate-800 pb-2">
                <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-wider">
                  Resumo Geral do Mês
                </span>
                <span className="text-[8px] bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full font-black uppercase">
                  {MONTH_NAMES[selectedMonth]}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[10px]">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Horas Previstas</p>
                  <p className="text-sm font-black text-slate-800 dark:text-white">{monthlyData.formattedExpected} h</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Horas Trabalhadas</p>
                  <p className="text-sm font-black text-slate-800 dark:text-white">{monthlyData.formattedWorked} h</p>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/30">
                  <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Horas Extras</p>
                  <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">{monthlyData.formattedExtra} h</p>
                </div>
                <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-100 dark:border-rose-800/30">
                  <p className="text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase">Horas Faltantes</p>
                  <p className="text-sm font-black text-rose-700 dark:text-rose-300">{monthlyData.formattedShortage} h</p>
                </div>
              </div>

              <div className="pt-2 border-t dark:border-slate-800 flex justify-between text-[10px] font-medium text-slate-500">
                <span>Saldo Anterior: <b className="text-slate-700 dark:text-slate-300">{monthlyData.formattedPreviousBalance}</b></span>
                <span>Saldo Acumulado: <b className={monthlyData.currentBalanceMin >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{monthlyData.formattedCurrentBalance}</b></span>
              </div>
            </div>

            {/* LISTA DIÁRIA */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                  Histórico Diário de Batidas
                </span>
                <span className="text-[8px] text-slate-400 font-bold uppercase">Toque no dia para ver detalhes</span>
              </div>

              {monthlyData.days.map((d: any) => {
                const hasPunches = d.e1 || d.s1 || d.e2 || d.s2;
                return (
                  <div
                    key={d.day}
                    onClick={() => setSelectedDayDetail(d)}
                    className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl p-4 shadow-sm hover:border-orange-300 dark:hover:border-orange-700 transition-all cursor-pointer group active:scale-[0.99] space-y-2.5"
                  >
                    {/* LINHA SUPERIOR: DIA DA SEMANA E DATA */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">
                          {d.weekdayName} — {d.displayDate}
                        </span>
                        {d.hasAdjustment && (
                          <span className="text-[7px] bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 px-1.5 py-0.5 rounded-full font-black uppercase">
                            Ajustado
                          </span>
                        )}
                        {d.hasOffline && (
                          <span className="text-[7px] bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-black uppercase">
                            Offline
                          </span>
                        )}
                      </div>

                      {/* SALDO / STATUS DO DIA */}
                      <div>
                        {d.extraMin > 0 ? (
                          <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-lg">
                            +{formatMinutes(d.extraMin)} Extra
                          </span>
                        ) : d.shortageMin > 0 ? (
                          <span className="text-[9px] font-black text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-lg">
                            -{formatMinutes(d.shortageMin)} Falta
                          </span>
                        ) : d.occurrence ? (
                          <span className="text-[8px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg uppercase">
                            {d.occurrence}
                          </span>
                        ) : hasPunches ? (
                          <span className="text-[9px] font-bold text-emerald-600">
                            {d.formattedWorked} h
                          </span>
                        ) : (
                          <span className="text-[8px] text-slate-300">-</span>
                        )}
                      </div>
                    </div>

                    {/* HORÁRIOS DAS BATIDAS */}
                    {hasPunches ? (
                      <div className="grid grid-cols-4 gap-1.5 pt-1 text-center font-mono">
                        <div className="p-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                          <p className="text-[7px] font-sans font-bold text-slate-400 uppercase">Entrada</p>
                          <p className="text-[11px] font-bold text-emerald-600">{d.e1 || '-'}</p>
                        </div>
                        <div className="p-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                          <p className="text-[7px] font-sans font-bold text-slate-400 uppercase">Almoço</p>
                          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{d.s1 || '-'}</p>
                        </div>
                        <div className="p-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                          <p className="text-[7px] font-sans font-bold text-slate-400 uppercase">Retorno</p>
                          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{d.e2 || '-'}</p>
                        </div>
                        <div className="p-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                          <p className="text-[7px] font-sans font-bold text-slate-400 uppercase">Saída</p>
                          <p className="text-[11px] font-bold text-emerald-600">{d.s2 || '-'}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="py-2 text-center text-[9px] text-slate-400 font-medium">
                        {d.isSunday ? 'Domingo (Descanso Semanal Remunerado - DSR)' : d.isSaturday ? 'Sábado de Folga' : 'Nenhuma marcação registrada'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VISÃO 2: MEU BANCO DE HORAS (MARQ STYLE)                 */}
        {/* ========================================================= */}
        {activeTab === 'bank' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* SALDO ATUAL GRANDE */}
            <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-[35px] p-6 text-center shadow-sm space-y-2">
              <span className="text-3xl">📊</span>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Meu Banco de Horas</p>
              <h2 className={`text-4xl font-black tracking-tight ${
                monthlyData.currentBalanceMin >= 0 ? 'text-emerald-500' : 'text-rose-500'
              }`}>
                {monthlyData.formattedCurrentBalance}
              </h2>
              <p className="text-[9px] font-bold text-slate-500 uppercase">Saldo Atual Acumulado</p>

              <div className="pt-4 border-t dark:border-slate-800 grid grid-cols-3 gap-2 text-center">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/30">
                  <p className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Horas Extras</p>
                  <p className="text-xs font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{monthlyData.formattedExtra} h</p>
                </div>
                <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-100 dark:border-rose-800/30">
                  <p className="text-[8px] font-bold text-rose-600 dark:text-rose-400 uppercase">Horas Faltantes</p>
                  <p className="text-xs font-black text-rose-700 dark:text-rose-300 mt-0.5">{monthlyData.formattedShortage} h</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border dark:border-slate-700">
                  <p className="text-[8px] font-bold text-slate-400 uppercase">Saldo Anterior</p>
                  <p className="text-xs font-black text-slate-800 dark:text-white mt-0.5">{monthlyData.formattedPreviousBalance} h</p>
                </div>
              </div>
            </div>

            {/* GRÁFICO / BALANÇO POR SEMANA */}
            <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b dark:border-slate-800 pb-2">
                <h3 className="text-[10px] font-black uppercase text-slate-800 dark:text-white tracking-wider">
                  Saldo por Semana ({MONTH_NAMES[selectedMonth]})
                </h3>
                <span className="text-[8px] text-slate-400 font-bold uppercase">Balanço Semanal</span>
              </div>

              <div className="space-y-2.5">
                {monthlyData.weeklyBreakdown.map((w) => (
                  <div key={w.week} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                        w.isPositive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {w.week}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800 dark:text-white">{w.label}</p>
                        <p className="text-[8px] text-slate-400 uppercase">Dias apurados da semana</p>
                      </div>
                    </div>

                    <div className={`px-3 py-1 rounded-xl text-xs font-black font-mono ${
                      w.isPositive ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600'
                    }`}>
                      {w.formatted}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ATALHOS RÁPIDOS */}
            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => onNavigate && onNavigate('card')}
                className="w-full p-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <FileText size={16} />
                  <span>Ver Espelho de Ponto Eletrônico (Portaria 671)</span>
                </div>
                <ArrowRight size={14} />
              </button>

              <button
                onClick={() => onNavigate && onNavigate('requests')}
                className="w-full p-4 bg-white dark:bg-slate-900 border dark:border-slate-800 hover:bg-slate-50 text-slate-800 dark:text-white rounded-2xl font-black uppercase text-[10px] tracking-wider active:scale-95 transition-all flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <PenTool size={16} className="text-orange-500" />
                  <span>Solicitar Correção / Ajuste ao RH</span>
                </div>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL DETALHES DO DIA                                     */}
      {/* ========================================================= */}
      {selectedDayDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-[36px] w-full max-w-sm p-6 shadow-2xl space-y-4 animate-in zoom-in duration-200">
            {/* CABEÇALHO DO MODAL */}
            <div className="flex justify-between items-center border-b dark:border-slate-800 pb-3">
              <div>
                <span className="text-[9px] font-bold text-orange-600 uppercase tracking-widest">
                  {selectedDayDetail.weekdayName}
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {selectedDayDetail.fullDisplayDate}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDayDetail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl"
              >
                ✕
              </button>
            </div>

            {/* JORNADA PREVISTA */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border dark:border-slate-700/60 space-y-1 text-[10px]">
              <p className="text-[8px] font-bold text-slate-400 uppercase">Jornada Prevista do Dia</p>
              <p className="font-black text-slate-800 dark:text-white">
                {user?.workShift || '08:00 às 18:00 (com 1h de intervalo)'}
              </p>
            </div>

            {/* REGISTROS REALIZADOS NO DIA */}
            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                Registros Realizados
              </p>
              
              <div className="space-y-1.5">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                    🟢 Entrada
                  </span>
                  <span className="font-mono font-black text-slate-900 dark:text-white">
                    {selectedDayDetail.e1 || 'Não registrada'}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                    🟡 Início Intervalo
                  </span>
                  <span className="font-mono font-black text-slate-900 dark:text-white">
                    {selectedDayDetail.s1 || 'Não registrada'}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                    🟡 Fim Intervalo
                  </span>
                  <span className="font-mono font-black text-slate-900 dark:text-white">
                    {selectedDayDetail.e2 || 'Não registrada'}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                    🔴 Saída
                  </span>
                  <span className="font-mono font-black text-slate-900 dark:text-white">
                    {selectedDayDetail.s2 || 'Não registrada'}
                  </span>
                </div>
              </div>
            </div>

            {/* RESUMO DO DIA */}
            <div className="p-3.5 bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/30 rounded-2xl space-y-1.5 text-[10px]">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Total Trabalhado:</span>
                <b className="text-slate-900 dark:text-white">{selectedDayDetail.formattedWorked} h</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Jornada Prevista:</span>
                <b className="text-slate-900 dark:text-white">{selectedDayDetail.formattedExpected} h</b>
              </div>
              <div className="flex justify-between pt-1 border-t border-orange-200 dark:border-orange-800/30 font-bold">
                <span className="text-slate-700 dark:text-slate-300">Balanço do Dia:</span>
                {selectedDayDetail.extraMin > 0 ? (
                  <span className="text-emerald-600">+{formatMinutes(selectedDayDetail.extraMin)} Extra</span>
                ) : selectedDayDetail.shortageMin > 0 ? (
                  <span className="text-rose-600">-{formatMinutes(selectedDayDetail.shortageMin)} Falta</span>
                ) : (
                  <span className="text-slate-500">00:00 (Jornada cumprida)</span>
                )}
              </div>
            </div>

            {/* BOTÃO DE SOLICITAR AJUSTE */}
            <div className="pt-1 flex flex-col gap-2">
              <button
                onClick={() => handleOpenAdjustment(selectedDayDetail.dateStr)}
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <PenTool size={14} /> Solicitar Ajuste Deste Dia
              </button>
              <button
                onClick={() => setSelectedDayDetail(null)}
                className="w-full py-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white text-[9px] font-black uppercase tracking-wider"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPoint;
