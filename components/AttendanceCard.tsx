import React, { useState, useRef, useEffect, useMemo } from 'react';
import { PointRecord, User, Company } from '../types';
import { CheckCircle2, Clock, FileText, Download, PenTool, X, ShieldCheck, ChevronRight, Calendar, AlertCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface jsPDFWithPlugin extends jsPDF {
  autoTable: (options: any) => jsPDF;
  lastAutoTable?: { finalY: number };
}

interface AttendanceCardProps {
  records: PointRecord[];
  company: Company | null;
}

interface SignedPeriodInfo {
  periodId: string;
  signedAt: string;
  protocol: string;
  signatureImage?: string;
  signerName: string;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const AttendanceCard: React.FC<AttendanceCardProps> = ({ records, company }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'signed' | 'all'>('pending');
  const [viewState, setViewState] = useState<'list' | 'detail' | 'signature'>('list');
  const [selectedPeriod, setSelectedPeriod] = useState<any | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const user: User = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('fortime_user') || '{}');
    } catch {
      return {} as User;
    }
  }, []);

  // Chave de persistência de assinaturas para o colaborador
  const storageKey = `pontoexato_signed_espelhos_${user.matricula || 'default'}`;

  const [signedList, setSignedList] = useState<SignedPeriodInfo[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Salvar assinaturas no localStorage
  const saveSignedInfo = (info: SignedPeriodInfo) => {
    const updated = [...signedList.filter(s => s.periodId !== info.periodId), info];
    setSignedList(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  // Gerar períodos dinâmicos do ano atual (últimos 4 meses)
  const periods = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth(); // 0 a 11

    const list = [];
    for (let i = 0; i < 4; i++) {
      let m = curMonth - i;
      let y = curYear;
      if (m < 0) {
        m += 12;
        y -= 1;
      }
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const id = `${y}-${String(m + 1).padStart(2, '0')}`;
      const label = `${MONTH_NAMES[m]} / ${y}`;
      const startDate = `01/${String(m + 1).padStart(2, '0')}/${y}`;
      const endDate = `${daysInMonth}/${String(m + 1).padStart(2, '0')}/${y}`;

      const isSigned = signedList.some(s => s.periodId === id);
      const signInfo = signedList.find(s => s.periodId === id);

      list.push({
        id,
        year: y,
        month: m,
        label,
        period: `${startDate} a ${endDate}`,
        daysInMonth,
        isSigned,
        signInfo,
      });
    }
    return list;
  }, [signedList]);

  const filteredPeriods = useMemo(() => {
    if (activeTab === 'pending') return periods.filter(p => !p.isSigned);
    if (activeTab === 'signed') return periods.filter(p => p.isSigned);
    return periods;
  }, [periods, activeTab]);

  const pendingCount = periods.filter(p => !p.isSigned).length;
  const signedCount = periods.filter(p => p.isSigned).length;

  // Lógica de desenho da assinatura (Canvas touch/mouse)
  useEffect(() => {
    if (viewState === 'signature' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Resolução interna nítida
      canvas.width = canvas.offsetWidth * 2 || 600;
      canvas.height = canvas.offsetHeight * 2 || 350;
      ctx.scale(2, 2);

      let drawing = false;

      const getPos = (e: MouseEvent | TouchEvent) => {
        const rect = canvas.getBoundingClientRect();
        if ('touches' in e && e.touches.length > 0) {
          return {
            x: e.touches[0].clientX - rect.left,
            y: e.touches[0].clientY - rect.top,
          };
        }
        const me = e as MouseEvent;
        return {
          x: me.clientX - rect.left,
          y: me.clientY - rect.top,
        };
      };

      const startDraw = (e: any) => {
        drawing = true;
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
      };

      const endDraw = () => {
        drawing = false;
        ctx.beginPath();
      };

      const draw = (e: any) => {
        if (!drawing) return;
        e.preventDefault();
        const pos = getPos(e);
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#0f172a';
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      };

      canvas.addEventListener('mousedown', startDraw);
      canvas.addEventListener('mousemove', draw);
      canvas.addEventListener('mouseup', endDraw);
      canvas.addEventListener('touchstart', startDraw, { passive: false });
      canvas.addEventListener('touchmove', draw, { passive: false });
      canvas.addEventListener('touchend', endDraw);

      return () => {
        canvas.removeEventListener('mousedown', startDraw);
        canvas.removeEventListener('mousemove', draw);
        canvas.removeEventListener('mouseup', endDraw);
        canvas.removeEventListener('touchstart', startDraw);
        canvas.removeEventListener('touchmove', draw);
        canvas.removeEventListener('touchend', endDraw);
      };
    }
  }, [viewState]);

  const handleClearCanvas = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  const handleConfirmSignature = (drawnImage?: string) => {
    if (!selectedPeriod) return;
    const protocolHash = `PX-EPE-${selectedPeriod.id}-${user.matricula || 'N/A'}-${Date.now().toString(36).toUpperCase()}`;
    const signInfo: SignedPeriodInfo = {
      periodId: selectedPeriod.id,
      signedAt: new Date().toLocaleString('pt-BR'),
      protocol: protocolHash,
      signatureImage: drawnImage || signatureData || undefined,
      signerName: user.name,
    };

    saveSignedInfo(signInfo);
    setSelectedPeriod({ ...selectedPeriod, isSigned: true, signInfo });
    setViewState('detail');
    setFeedbackToast('Espelho de Ponto assinado eletronicamente com sucesso!');
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  const handleQuickElectronicSign = () => {
    handleConfirmSignature();
  };

  const handleSaveDrawnSignature = () => {
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      setSignatureData(dataUrl);
      handleConfirmSignature(dataUrl);
    }
  };

  // Calcular linhas diárias do mês selecionado com base nos registros reais
  const monthDaysData = useMemo(() => {
    if (!selectedPeriod) return [];
    const { year, month, daysInMonth } = selectedPeriod;

    const days = [];
    let totalWorkedMinutes = 0;
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dayOfWeek = weekdays[dateObj.getDay()];
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

      // Filtrar batidas do usuário para este dia
      const dayRecords = records
        .filter(r => {
          const rDate = new Date(r.timestamp);
          return (
            rDate.getFullYear() === year &&
            rDate.getMonth() === month &&
            rDate.getDate() === d
          );
        })
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      let e1 = '-';
      let s1 = '-';
      let e2 = '-';
      let s2 = '-';
      let dayWorkedHours = '00:00';

      if (dayRecords.length > 0) {
        if (dayRecords[0]) e1 = new Date(dayRecords[0].timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        if (dayRecords[1]) s1 = new Date(dayRecords[1].timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        if (dayRecords[2]) e2 = new Date(dayRecords[2].timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        if (dayRecords[3]) s2 = new Date(dayRecords[3].timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        if (dayRecords.length >= 2) {
          // Cálculo simples de tempo trabalhado
          const t1 = new Date(dayRecords[0].timestamp).getTime();
          const t2 = new Date(dayRecords[1].timestamp).getTime();
          let diffMin = Math.max(0, Math.floor((t2 - t1) / (1000 * 60)));

          if (dayRecords.length >= 4) {
            const t3 = new Date(dayRecords[2].timestamp).getTime();
            const t4 = new Date(dayRecords[3].timestamp).getTime();
            diffMin += Math.max(0, Math.floor((t4 - t3) / (1000 * 60)));
          }

          totalWorkedMinutes += diffMin;
          const h = Math.floor(diffMin / 60);
          const m = diffMin % 60;
          dayWorkedHours = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }
      } else if (!isWeekend && d <= new Date().getDate() && year === new Date().getFullYear() && month === new Date().getMonth()) {
        // Dia útil sem batida no mês atual
        dayWorkedHours = '00:00';
      }

      days.push({
        dayNumber: d,
        formattedDate: `${String(d).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}`,
        dayOfWeek,
        isWeekend,
        hasRecords: dayRecords.length > 0,
        recordsCount: dayRecords.length,
        e1,
        s1,
        e2,
        s2,
        workedHours: dayWorkedHours,
      });
    }

    return { days, totalWorkedMinutes };
  }, [selectedPeriod, records]);

  // Exportar PDF oficial do Espelho de Ponto (Portaria 671 MTP) no modelo exato padrão
  const handleExportPDF = () => {
    if (!selectedPeriod) return;

    try {
      const doc = new jsPDF() as jsPDFWithPlugin;
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 10;
      const contentWidth = pageWidth - (margin * 2);
      const { year, month } = selectedPeriod;
      const weeklyHours = (user as any).weeklyHours || 44;

      const formatMinutesToHours = (minutes: number) => {
        if (!minutes || minutes <= 0) return "";
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      };

      const calculateHoursDiff = (start: string, end: string) => {
        if (!start || !end) return 0;
        const [h1, m1] = start.split(':').map(Number);
        const [h2, m2] = end.split(':').map(Number);
        if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
        const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
        return diff > 0 ? diff : 0;
      };

      // TITULO
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      const monthLabel = MONTH_NAMES[month].toUpperCase();
      doc.text(`FOLHA DE PONTO / ESPELHO DE PONTO ELETRÔNICO`, pageWidth / 2, 10, { align: 'center' });
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`MÊS/ANO: ${monthLabel} / ${year}  |  Portaria MTP nº 671/2021`, pageWidth / 2, 14, { align: 'center' });

      // BOX 1: DADOS DO EMPREGADOR
      doc.setFontSize(7.5);
      doc.rect(margin, 17, contentWidth, 20);
      doc.setFont("helvetica", "bold");
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, 17, contentWidth, 4.5, 'F');
      doc.text("DADOS DO EMPREGADOR", pageWidth / 2, 20.5, { align: 'center' });
      doc.line(margin, 21.5, pageWidth - margin, 21.5);
      
      doc.setFont("helvetica", "normal");
      doc.text(`Razão Social / Nome: ${company?.name || 'EMPRESA'}`, margin + 2, 26);
      doc.text(`CNPJ: ${company?.cnpj || 'NÃO INFORMADO'}`, pageWidth / 2 + 15, 26);
      doc.text(`Endereço: ${company?.address || 'NÃO INFORMADO'}`, margin + 2, 30);
      doc.text(`Cidade/UF: ${company?.city || ''} - ${company?.state || ''}`, margin + 2, 34);
      doc.text(`CEP: ${company?.zip || ''}`, pageWidth / 2 + 15, 34);

      // BOX 2: DADOS DO COLABORADOR
      doc.rect(margin, 39, contentWidth, 26);
      doc.setFont("helvetica", "bold");
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, 39, contentWidth, 4.5, 'F');
      doc.text("DADOS DO COLABORADOR", pageWidth / 2, 42.5, { align: 'center' });
      doc.line(margin, 43.5, pageWidth - margin, 43.5);
      
      doc.setFont("helvetica", "normal");
      doc.text(`Nome: ${user.name}`, margin + 2, 48);
      doc.text(`Matrícula: ${user.matricula || 'N/A'}`, pageWidth / 2 + 15, 48);
      doc.text(`CPF: ${user.cpf || 'NÃO INFORMADO'}`, margin + 2, 52);
      doc.text(`CTPS: ${(user as any).ctpsNumber || '---'} / Série: ${(user as any).ctpsSeries || '---'}`, pageWidth / 2 + 15, 52);
      doc.text(`Cargo / Função: ${user.roleFunction || 'COLABORADOR'}`, margin + 2, 56);
      if (user.isExemptPointControl) {
        doc.text(`Jornada: DISPENSADO DE PONTO (ART. 62, II CLT)`, pageWidth / 2 + 15, 56);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(109, 40, 217);
        doc.text(`REGIME LEGAL: ART. 62, INCISO II DA CLT (CARGO DE GERÊNCIA / CONFIANÇA - SEM CONTROLE DE HORÁRIO)`, margin + 2, 61);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
      } else {
        doc.text(`Jornada: ${user.workShift || '08:00 - 11:00 / 13:00 - 18:00'} (${weeklyHours}h semanais)`, pageWidth / 2 + 15, 56);
        doc.text(`Horário Contratado: Entrada: 08:00 | Saída Intervalo: 12:00 | Retorno: 13:00/14:00 | Saída: 18:00`, margin + 2, 61);
      }

      // TABELA DE PONTO (EXATOS 31 DIAS)
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const body: any[] = [];

      let totalWorkedMinutes = 0;
      let totalExtraMinutes = 0;
      let totalExpectedMinutes = 0;
      let daysWorkedCount = 0;

      for (let day = 1; day <= 31; day++) {
        const dayStr = String(day).padStart(2, '0');
        const dateObj = new Date(year, month, day);
        const dayOfWeek = dateObj.getDay(); // 0 = Dom, 6 = Sáb
        const dayOfWeekLabel = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dayOfWeek];

        if (day > daysInMonth) {
          body.push([`${dayStr}`, '', '', '', '', '', '', '']);
          continue;
        }

        const dayRecs = records.filter(r => {
          const rd = new Date(r.timestamp);
          return r.matricula === user.matricula &&
                 rd.getFullYear() === year &&
                 rd.getMonth() === month &&
                 rd.getDate() === day;
        }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        let e1 = '';
        let s1 = '';
        let e2 = '';
        let s2 = '';

        if (dayRecs.length === 1) {
          e1 = new Date(dayRecs[0].timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        } else if (dayRecs.length === 2) {
          e1 = new Date(dayRecs[0].timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          s2 = new Date(dayRecs[1].timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        } else if (dayRecs.length === 3) {
          e1 = new Date(dayRecs[0].timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          s1 = new Date(dayRecs[1].timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          e2 = new Date(dayRecs[2].timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        } else if (dayRecs.length >= 4) {
          e1 = new Date(dayRecs[0].timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          s1 = new Date(dayRecs[1].timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          e2 = new Date(dayRecs[2].timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          s2 = new Date(dayRecs[3].timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }

        let workedMinutes = 0;
        if (e1 && s1 && e2 && s2) {
          workedMinutes = calculateHoursDiff(e1, s1) + calculateHoursDiff(e2, s2);
        } else if (e1 && s2 && !s1 && !e2) {
          workedMinutes = calculateHoursDiff(e1, s2);
        } else if (e1 && s1 && !e2 && !s2) {
          workedMinutes = calculateHoursDiff(e1, s1);
        }

        let extraMinutes = 0;
        let rubrica = '';

        if (workedMinutes > 0) {
          if (dayOfWeek === 0) {
            extraMinutes = workedMinutes;
            rubrica = 'DSR';
          } else if (dayOfWeek === 6) {
            extraMinutes = workedMinutes > 240 ? (workedMinutes - 240) : 0;
          } else {
            extraMinutes = workedMinutes > 480 ? (workedMinutes - 480) : 0;
          }

          const dayTargetMinutes = dayOfWeek === 6 ? 240 : (dayOfWeek === 0 ? 0 : 480);
          totalExpectedMinutes += dayTargetMinutes;
          totalWorkedMinutes += workedMinutes;
          totalExtraMinutes += extraMinutes;
          daysWorkedCount++;
        } else if (dayOfWeek === 0) {
          rubrica = 'DSR';
        } else if (user.isExemptPointControl && dayOfWeek >= 1 && dayOfWeek <= 5) {
          e1 = 'DISPENSADO';
          s1 = 'ART. 62';
          e2 = '-';
          s2 = '-';
          rubrica = 'CARGO DE GERÊNCIA (ART. 62, II CLT)';
        }

        const workedStr = workedMinutes > 0 ? formatMinutesToHours(workedMinutes) : '';
        const extraStr = extraMinutes > 0 ? formatMinutesToHours(extraMinutes) : '';

        body.push([
          `${dayStr} ${dayOfWeekLabel}`,
          e1,
          s1,
          e2,
          s2,
          workedStr,
          extraStr,
          rubrica
        ]);
      }

      doc.autoTable({
        startY: 67,
        head: [['DIA', 'ENTRADA', 'INÍCIO INT.', 'FIM INT.', 'SAÍDA', 'TOTAL DIA', 'HORA EXTRA', 'RUBRICA']],
        body: body,
        foot: [[
          'TOTAIS',
          '',
          '',
          '',
          '',
          formatMinutesToHours(totalWorkedMinutes) || '00:00',
          formatMinutesToHours(totalExtraMinutes) || '00:00',
          ''
        ]],
        theme: 'grid',
        headStyles: { 
          fillColor: [241, 245, 249], 
          textColor: [15, 23, 42], 
          lineWidth: 0.1, 
          fontSize: 6, 
          halign: 'center', 
          valign: 'middle', 
          fontStyle: 'bold' 
        },
        footStyles: {
          fillColor: [226, 232, 240], 
          textColor: [15, 23, 42], 
          lineWidth: 0.1, 
          fontSize: 6.5, 
          halign: 'center', 
          valign: 'middle', 
          fontStyle: 'bold' 
        },
        styles: { 
          fontSize: 6, 
          cellPadding: 0.35, 
          halign: 'center', 
          textColor: [0, 0, 0], 
          lineWidth: 0.1,
          minCellHeight: 4.6
        },
        columnStyles: {
          0: { cellWidth: 14, fontStyle: 'bold' },
          1: { cellWidth: 23 },
          2: { cellWidth: 24 },
          3: { cellWidth: 24 },
          4: { cellWidth: 23 },
          5: { cellWidth: 26, fontStyle: 'bold' },
          6: { cellWidth: 26, fontStyle: 'bold' },
          7: { cellWidth: 30 }
        },
        margin: { left: margin, right: margin }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 3;

      // BOX RESUMO GERAL DO MÊS / BANCO DE HORAS
      doc.rect(margin, finalY, contentWidth, 18);
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, finalY, contentWidth, 4.5, 'F');
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("RESUMO GERAL DO MÊS / BANCO DE HORAS", pageWidth / 2, finalY + 3.2, { align: 'center' });
      doc.line(margin, finalY + 4.5, pageWidth - margin, finalY + 4.5);

      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);

      // Linha 1 de métricas
      doc.text(`Total Horas Trabalhadas:`, margin + 3, finalY + 8.5);
      doc.setFont("helvetica", "bold");
      doc.text(`${formatMinutesToHours(totalWorkedMinutes) || '00:00'} h`, margin + 38, finalY + 8.5);

      doc.setFont("helvetica", "normal");
      doc.text(`Total Horas Extras:`, margin + 65, finalY + 8.5);
      doc.setFont("helvetica", "bold");
      doc.text(`${formatMinutesToHours(totalExtraMinutes) || '00:00'} h`, margin + 96, finalY + 8.5);

      doc.setFont("helvetica", "normal");
      doc.text(`Dias Trabalhados:`, margin + 130, finalY + 8.5);
      doc.setFont("helvetica", "bold");
      doc.text(`${daysWorkedCount} dias`, margin + 158, finalY + 8.5);

      // Linha 2 de métricas
      doc.setFont("helvetica", "normal");
      const balanceMin = totalWorkedMinutes - totalExpectedMinutes;
      const balanceSign = balanceMin >= 0 ? '+' : '-';
      const balanceStr = `${balanceSign}${formatMinutesToHours(Math.abs(balanceMin)) || '00:00'} h`;

      doc.text(`Jornada Mensal Base:`, margin + 3, finalY + 13.5);
      doc.setFont("helvetica", "bold");
      doc.text(`~${weeklyHours === 40 ? '176' : '220'}h (${weeklyHours}h/sem)`, margin + 38, finalY + 13.5);

      doc.setFont("helvetica", "normal");
      doc.text(`Saldo / Banco de Horas:`, margin + 65, finalY + 13.5);
      doc.setFont("helvetica", "bold");
      doc.text(balanceStr, margin + 96, finalY + 13.5);

      doc.setFont("helvetica", "normal");
      doc.text(`Conformidade Legal:`, margin + 130, finalY + 13.5);
      doc.setFont("helvetica", "bold");
      doc.text(`CLT / Port. 671 MTP`, margin + 158, finalY + 13.5);

      // Disclaimer
      const disclaimY = finalY + 21;
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 116, 139);
      doc.text("Reconheço a exatidão das marcações acima registradas nos termos do Art. 74 da CLT e Portaria MTP nº 671/2021.", margin, disclaimY);

      // Linhas de Assinatura
      const signLineY = disclaimY + 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(0, 0, 0);

      // Se houver imagem de assinatura desenhada, insere acima da linha
      if (selectedPeriod.isSigned && selectedPeriod.signInfo?.signatureImage) {
        try {
          doc.addImage(selectedPeriod.signInfo.signatureImage, 'PNG', margin + 20, signLineY - 8, 45, 7);
        } catch (e) {}
      }

      doc.line(margin + 5, signLineY, margin + 80, signLineY);
      doc.text(`Assinatura do Colaborador (${user.name})`, margin + 42.5, signLineY + 3.2, { align: 'center' });

      doc.line(pageWidth - margin - 80, signLineY, pageWidth - margin - 5, signLineY);
      doc.text("Assinatura do Empregador / RH", pageWidth - margin - 42.5, signLineY + 3.2, { align: 'center' });

      doc.save(`Folha_Ponto_${user.matricula || 'colaborador'}_${selectedPeriod.id}.pdf`);
    } catch (e) {
      console.error('Erro ao gerar PDF oficial:', e);
      alert('Não foi possível gerar a Folha de Ponto. Tente novamente.');
    }
  };

  // VIEW: TELA DE DESENHO DA ASSINATURA TOUCH / MOUSE
  if (viewState === 'signature') {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950 flex flex-col animate-in slide-in-from-bottom duration-300">
        <header className="p-4 flex items-center justify-between border-b dark:border-slate-800">
          <button 
            onClick={() => setViewState('detail')} 
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white"
          >
            <X size={22} />
          </button>
          <div className="text-center">
            <h2 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider">
              Assinatura do Espelho de Ponto
            </h2>
            <p className="text-[9px] font-bold text-slate-400">{selectedPeriod?.label}</p>
          </div>
          <button 
            onClick={handleClearCanvas} 
            className="px-3 py-1.5 text-[10px] font-black uppercase text-rose-600 bg-rose-50 dark:bg-rose-950/30 rounded-xl"
          >
            Limpar
          </button>
        </header>

        <div className="flex-1 p-4 flex flex-col">
          <div className="flex-1 bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-3xl relative overflow-hidden flex items-center justify-center">
            <canvas ref={canvasRef} className="w-full h-full cursor-crosshair touch-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20 text-[10px] font-black uppercase tracking-widest text-center text-slate-500">
              ✍️ Desenhe sua assinatura com o dedo ou mouse aqui
            </div>
          </div>
          <p className="text-[9px] text-center text-slate-400 font-medium py-3">
            Ao assinar, você confirma a exatidão das marcações de ponto deste período nos termos da Portaria 671 MTP.
          </p>
        </div>

        <div className="p-4 border-t dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-3">
          <button
            onClick={() => setViewState('detail')}
            className="flex-1 py-4 border border-slate-200 dark:border-slate-800 rounded-2xl font-black uppercase text-xs text-slate-500"
          >
            Voltar
          </button>
          <button
            onClick={handleSaveDrawnSignature}
            className="flex-[2] py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={16} /> Confirmar Assinatura
          </button>
        </div>
      </div>
    );
  }

  // VIEW: DETALHES DO ESPELHO DE PONTO ELETRÔNICO
  if (viewState === 'detail' && selectedPeriod) {
    const isSigned = selectedPeriod.isSigned;
    const signInfo = selectedPeriod.signInfo;

    return (
      <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 animate-in slide-in-from-right duration-200">
        <header className="px-4 py-4 flex items-center justify-between border-b dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20">
          <button onClick={() => setViewState('list')} className="p-2 text-orange-600 dark:text-orange-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="text-center">
            <h1 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Espelho de Ponto Eletrônico</h1>
            <p className="text-[9px] font-bold text-orange-600 uppercase tracking-widest">{selectedPeriod.label}</p>
          </div>
          <button 
            onClick={handleExportPDF} 
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-orange-600"
            title="Baixar PDF Oficial"
          >
            <Download size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 pb-36">
          {/* TOAST DE FEEDBACK */}
          {feedbackToast && (
            <div className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg flex items-center justify-between text-[10px] font-black uppercase tracking-wider animate-in fade-in">
              <span>✅ {feedbackToast}</span>
              <button onClick={() => setFeedbackToast(null)}>✕</button>
            </div>
          )}

          {/* STATUS DA FOLHA */}
          <div className={`p-4 rounded-3xl border flex items-center justify-between ${
            isSigned 
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-300' 
              : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-300'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isSigned ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                {isSigned ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider">
                  {isSigned ? 'Espelho Assinado Eletronicamente' : 'Pendente de Assinatura'}
                </p>
                <p className="text-[8px] font-bold opacity-80 mt-0.5">
                  {isSigned 
                    ? `Assinado em ${signInfo?.signedAt || 'Data registrada'}` 
                    : 'Revise suas batidas e realize a assinatura digital'}
                </p>
              </div>
            </div>
            {isSigned && (
              <span className="text-[9px] bg-emerald-600 text-white px-2 py-1 rounded-full font-black uppercase">
                Concluído
              </span>
            )}
          </div>

          {/* IDENTIFICAÇÃO FORMAL (PORTARIA 671 MTP) */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border dark:border-slate-800 shadow-sm space-y-2 text-[10px]">
            <div className="flex justify-between items-center border-b dark:border-slate-800 pb-2">
              <span className="text-[9px] font-black text-slate-400 uppercase">Empregador:</span>
              <span className="font-bold text-slate-800 dark:text-white uppercase">{company?.name || 'PontoExato Demo & Serviços'}</span>
            </div>
            <div className="flex justify-between items-center border-b dark:border-slate-800 pb-2">
              <span className="text-[9px] font-black text-slate-400 uppercase">CNPJ:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">{company?.cnpj || '12.345.678/0001-90'}</span>
            </div>
            <div className="flex justify-between items-center border-b dark:border-slate-800 pb-2">
              <span className="text-[9px] font-black text-slate-400 uppercase">Colaborador:</span>
              <span className="font-bold text-slate-800 dark:text-white uppercase">{user.name}</span>
            </div>
            <div className="flex justify-between items-center border-b dark:border-slate-800 pb-2">
              <span className="text-[9px] font-black text-slate-400 uppercase">Matrícula / Cargo:</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">{user.matricula || 'N/A'} • {user.roleFunction || 'Colaborador'}</span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-[9px] font-black text-slate-400 uppercase">Jornada Contratual:</span>
              <span className="font-bold text-orange-600">{user.workShift || '08:00 - 12:00 / 13:00 - 17:00'}</span>
            </div>
          </div>

          {/* TABELA DE BATIDAS DO MÊS */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase text-slate-800 dark:text-white tracking-wider">
                Extrato Diário de Marcações
              </h3>
              <span className="text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold px-2 py-0.5 rounded-full uppercase">
                {selectedPeriod.daysInMonth} dias apurados
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase">
                  <tr>
                    <th className="py-2.5 px-2 text-left">Dia</th>
                    <th className="py-2.5 px-1.5">E1</th>
                    <th className="py-2.5 px-1.5">S1</th>
                    <th className="py-2.5 px-1.5">E2</th>
                    <th className="py-2.5 px-1.5">S2</th>
                    <th className="py-2.5 px-2">Total</th>
                  </tr>
                </thead>
                <tbody className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 divide-y dark:divide-slate-800/60">
                  {monthDaysData.days.map((d: any) => (
                    <tr 
                      key={d.dayNumber}
                      className={d.isWeekend ? 'bg-slate-50/50 dark:bg-slate-900/40 text-slate-400' : (d.hasRecords ? 'hover:bg-orange-50/30' : '')}
                    >
                      <td className="py-2.5 px-2 text-left font-black text-slate-800 dark:text-white">
                        <span className="font-mono">{d.formattedDate}</span>
                        <span className="text-[8px] text-slate-400 ml-1 uppercase">({d.dayOfWeek})</span>
                      </td>
                      <td className="py-2.5 px-1.5 font-mono">{d.e1}</td>
                      <td className="py-2.5 px-1.5 font-mono">{d.s1}</td>
                      <td className="py-2.5 px-1.5 font-mono">{d.e2}</td>
                      <td className="py-2.5 px-1.5 font-mono">{d.s2}</td>
                      <td className="py-2.5 px-2 font-mono font-bold text-slate-800 dark:text-white">
                        {d.isWeekend && !d.hasRecords ? (
                          <span className="text-[8px] text-slate-400 uppercase font-normal">Folga</span>
                        ) : (
                          d.workedHours
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* COMPROVANTE DE ACEITE ELETRÔNICO (SE JÁ ASSINADO) */}
          {isSigned && signInfo && (
            <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 p-5 rounded-3xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <ShieldCheck size={18} />
                <h4 className="text-[10px] font-black uppercase tracking-wider">
                  Comprovante de Aceite Eletrônico (Art. 83 Portaria 671)
                </h4>
              </div>
              {signInfo.signatureImage && (
                <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 flex justify-center">
                  <img src={signInfo.signatureImage} alt="Assinatura" className="max-h-16 object-contain" />
                </div>
              )}
              <div className="text-[9px] space-y-1 text-slate-600 dark:text-slate-300 font-medium">
                <p><b>Signatário:</b> {signInfo.signerName}</p>
                <p><b>Data / Hora da Assinatura:</b> {signInfo.signedAt}</p>
                <p className="truncate"><b>Protocolo SHA-256:</b> <span className="font-mono text-slate-800 dark:text-white">{signInfo.protocol}</span></p>
              </div>
            </div>
          )}
        </div>

        {/* BARRA FIXA DE AÇÃO INFERIOR */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t dark:border-slate-800 max-w-md mx-auto z-30 flex flex-col gap-2">
          {!isSigned ? (
            <div className="flex gap-2">
              <button
                onClick={() => setViewState('signature')}
                className="flex-1 py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <PenTool size={14} /> Desenhar Assinatura
              </button>
              <button
                onClick={handleQuickElectronicSign}
                className="flex-1 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 size={14} /> Assinar em 1 Toque
              </button>
            </div>
          ) : (
            <button
              onClick={handleExportPDF}
              className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase text-xs tracking-wider shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Download size={16} /> Baixar Espelho em PDF (Portaria 671)
            </button>
          )}
        </div>
      </div>
    );
  }

  // VIEW: LISTA PRINCIPAL DE ESPELHOS DE PONTO
  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <header className="px-4 py-4 border-b dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10 flex flex-col items-center">
        <h1 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-wider mb-3">
          Espelho de Ponto Eletrônico
        </h1>
        
        {/* ABAS: PENDENTES, ASSINADOS, TODOS */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-full">
          {[
            { id: 'pending', label: 'Pendentes', count: pendingCount },
            { id: 'signed', label: 'Assinados', count: signedCount },
            { id: 'all', label: 'Todos', count: periods.length },
          ].map(t => (
            <button 
              key={t.id}
              onClick={() => setActiveTab(t.id as any)} 
              className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === t.id 
                  ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span>{t.label}</span>
              <span className={`text-[8px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === t.id 
                  ? 'bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-300' 
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
              }`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar pb-32">
        {/* BANNER INFORMATIVO */}
        <div className="p-4 bg-orange-50/80 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/30 rounded-3xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center text-lg shadow-sm shrink-0">
            📋
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-orange-900 dark:text-orange-300">
              Conformidade Portaria 671 MTP (REP-P)
            </p>
            <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
              Consulte seu espelho mensal com total transparência e assine digitalmente suas folhas de frequência.
            </p>
          </div>
        </div>

        {filteredPeriods.map((period) => (
          <div 
            key={period.id} 
            onClick={() => {
              setSelectedPeriod(period);
              setViewState('detail');
            }}
            className="bg-white dark:bg-slate-900 p-5 rounded-[28px] border dark:border-slate-800 shadow-sm hover:border-orange-300 dark:hover:border-orange-800 transition-all cursor-pointer group active:scale-[0.98] flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm ${
                period.isSigned 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800/40' 
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-800/40'
              }`}>
                {period.isSigned ? '✅' : '⏳'}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">
                    {period.label}
                  </h3>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                    period.isSigned 
                      ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' 
                      : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                  }`}>
                    {period.isSigned ? 'Assinado' : 'Pendente'}
                  </span>
                </div>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                  Período: {period.period}
                </p>
                {period.isSigned && period.signInfo && (
                  <p className="text-[8px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                    Assinado eletronicamente em {period.signInfo.signedAt}
                  </p>
                )}
              </div>
            </div>

            <ChevronRight size={18} className="text-slate-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
          </div>
        ))}

        {filteredPeriods.length === 0 && (
          <div className="py-20 text-center opacity-40 flex flex-col items-center">
            <span className="text-4xl mb-3">📁</span>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Nenhum espelho de ponto nesta categoria
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceCard;
