
import React, { useState, useMemo, useEffect } from 'react';
import { Eye, EyeOff, MapPin, Camera, X, Calendar, Plus, Trash2, ShieldCheck } from 'lucide-react';
import { PointRecord, Company, Employee, AttendanceRequest, Holiday } from '../types';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getAllHolidaysForYear, getHolidayForDate } from '../utils/holidays';
import ComplianceAudit from './ComplianceAudit';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface jsPDFWithPlugin extends jsPDF {
  autoTable: (options: any) => jsPDF;
  lastAutoTable?: { finalY: number };
  [key: string]: any;
}

interface AdminDashboardProps {
  latestRecords: PointRecord[];
  company: Company | null;
  employees: Employee[];
  onAddEmployee: (emp: any) => void;
  onDeleteEmployee: (id: string) => void;
  onUpdateEmployee: (id: string, data: any) => void;
  onUpdateIP: (ip: string) => void;
  initialTab?: 'dashboard' | 'colaboradores' | 'aprovacoes' | 'saldos' | 'audit' | 'pontos_individuais' | 'correcao' | 'ferias' | 'feriados';
  onNavigate: (v: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ latestRecords, company, employees, onAddEmployee, onDeleteEmployee, onUpdateEmployee, initialTab, onNavigate }) => {
  const [activeTab, setActiveTab] = useState(initialTab || 'dashboard');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminPassAttempt, setAdminPassAttempt] = useState('');
  const [authError, setAuthError] = useState(false);
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [vacationRequests, setVacationRequests] = useState<any[]>([]);
  const [customHolidays, setCustomHolidays] = useState<Holiday[]>([]);
  const [selectedHolidayYear, setSelectedHolidayYear] = useState<number>(new Date().getFullYear());
  const [showAddHolidayModal, setShowAddHolidayModal] = useState(false);
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayType, setNewHolidayType] = useState<'feriado' | 'ponto_facultativo' | 'evento'>('feriado');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showManualPunchModal, setShowManualPunchModal] = useState(false);
  const [selectedEmployeeManualPunch, setSelectedEmployeeManualPunch] = useState<Employee | null>(null);
  const [manualPunchDate, setManualPunchDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualPunchTime, setManualPunchTime] = useState('08:00');
  const [manualPunchType, setManualPunchType] = useState<'entrada' | 'saida' | 'inicio_intervalo' | 'fim_intervalo'>('entrada');
  const [showEditRecordModal, setShowEditRecordModal] = useState(false);
  const [selectedRecordToEdit, setSelectedRecordToEdit] = useState<PointRecord | null>(null);
  const [editRecordDate, setEditRecordDate] = useState('');
  const [editRecordTime, setEditRecordTime] = useState('');
  const [editRecordType, setEditRecordType] = useState<'entrada' | 'saida' | 'inicio_intervalo' | 'fim_intervalo'>('entrada');
  const [editingPasswordId, setEditingPasswordId] = useState<string | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editEmpData, setEditEmpData] = useState<Partial<Employee>>({});
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [showNewEmpPass, setShowNewEmpPass] = useState(false);
  const [showResetPass, setShowResetPass] = useState(false);
  const [selectedEmployeeIndividual, setSelectedEmployeeIndividual] = useState<string>('todos');
  const [selectedDateIndividual, setSelectedDateIndividual] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);

  // Filtro de colaboradores
  const [employeeFilterStatus, setEmployeeFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');

  // Estados para Gestão de Férias pelo Admin
  const [showAdminVacationModal, setShowAdminVacationModal] = useState(false);
  const [adminVacationMatricula, setAdminVacationMatricula] = useState('');
  const [adminVacationStart, setAdminVacationStart] = useState('');
  const [adminVacationEnd, setAdminVacationEnd] = useState('');
  const [adminVacationStatus, setAdminVacationStatus] = useState<'approved' | 'pending'>('approved');
  const [adminVacationNote, setAdminVacationNote] = useState('');
  const [vacationFilterMatricula, setVacationFilterMatricula] = useState('todos');
  
  const [newEmp, setNewEmp] = useState({ 
    name: '', 
    matricula: '', 
    cpf: '',
    birthDate: '',
    roleFunction: '', 
    workShift: '08:00 - 12:00 / 14:00 - 18:00',
    weeklyHours: 44,
    status: 'active' as 'active' | 'inactive',
    password: '',
    ctpsNumber: '',
    ctpsSeries: ''
  });

  const now = new Date();
  const [reportFilter, setReportFilter] = useState({
    matricula: 'todos',
    month: now.getMonth(),
    year: now.getFullYear()
  });

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (isAuthorized && company?.id) {
      const q = query(collection(db, "requests"), where("companyCode", "==", company.id));
      const unsub = onSnapshot(q, (snap) => {
        const reqs: any[] = [];
        snap.forEach(d => {
          const data = d.data();
          const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date());
          reqs.push({ id: d.id, ...data, createdAt });
        });
        setRequests(reqs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
      });
      return () => unsub();
    }
  }, [isAuthorized, company?.id]);

  useEffect(() => {
    if (isAuthorized && company?.id) {
      const q = query(collection(db, "vacations"), where("companyCode", "==", company.id));
      const unsub = onSnapshot(q, (snap) => {
        const reqs: any[] = [];
        snap.forEach(d => {
          const data = d.data();
          reqs.push({ id: d.id, ...data, createdAt: data.createdAt?.toDate() || new Date() });
        });
        setVacationRequests(reqs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
      });
      return () => unsub();
    }
  }, [isAuthorized, company?.id]);

  // Listener para Feriados e Folgas da Empresa no Firestore
  useEffect(() => {
    if (isAuthorized && company?.id) {
      const q = query(collection(db, "holidays"), where("companyCode", "==", company.id));
      const unsub = onSnapshot(q, (snap) => {
        const hols: Holiday[] = [];
        snap.forEach(d => {
          const data = d.data();
          hols.push({ id: d.id, ...data } as Holiday);
        });
        setCustomHolidays(hols);
      });
      return () => unsub();
    }
  }, [isAuthorized, company?.id]);

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayDate || !newHolidayName) {
      alert("Por favor, informe a data e a descrição do feriado.");
      return;
    }
    try {
      await addDoc(collection(db, "holidays"), {
        companyCode: company?.id,
        date: newHolidayDate,
        description: newHolidayName.trim(),
        type: newHolidayType,
        isNational: false,
        createdAt: new Date()
      });
      setShowAddHolidayModal(false);
      setNewHolidayDate('');
      setNewHolidayName('');
      setNewHolidayType('feriado');
      alert("Feriado / Folga cadastrado com sucesso!");
    } catch (err) {
      alert("Erro ao cadastrar feriado no banco de dados.");
    }
  };

  const handleDeleteHoliday = async (id: string, name: string) => {
    if (confirm(`Deseja remover o feriado "${name}"?`)) {
      try {
        await deleteDoc(doc(db, "holidays", id));
        alert("Feriado removido com sucesso!");
      } catch (err) {
        alert("Erro ao remover feriado.");
      }
    }
  };

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const activeTodayCount = new Set(
      latestRecords.filter(r => r.timestamp.toDateString() === today).map(r => r.matricula)
    ).size;
    return {
      total: employees.length,
      activeToday: activeTodayCount,
      pendingRequests: requests.filter(r => r.status === 'pending').length
    };
  }, [employees, latestRecords, requests]);

  const handleVerifyAdmin = () => {
    if (adminPassAttempt === company?.adminPassword) { setIsAuthorized(true); setAuthError(false); }
    else { setAuthError(true); setAdminPassAttempt(''); }
  };

  const filteredRecords = useMemo(() => {
    return latestRecords.filter(r => {
      const date = new Date(r.timestamp);
      return (reportFilter.matricula === 'todos' || r.matricula === reportFilter.matricula) &&
             date.getMonth() === reportFilter.month &&
             date.getFullYear() === reportFilter.year;
    });
  }, [latestRecords, reportFilter]);

  const calculateHoursDiff = (start: string, end: string) => {
    if (!start || !end) return 0;
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
    const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    return diff > 0 ? diff : 0;
  };

  const formatMinutesToHours = (minutes: number) => {
    if (!minutes || minutes <= 0) return "";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const monthlyReportStats = useMemo(() => {
    const daysInMonth = new Date(reportFilter.year, reportFilter.month + 1, 0).getDate();
    const targetEmployees = reportFilter.matricula === 'todos' 
      ? employees 
      : employees.filter(e => e.matricula === reportFilter.matricula);

    const empStats = targetEmployees.map(emp => {
      let empWorkedMin = 0;
      let empExtraMin = 0;
      let empDaysCount = 0;
      let empExpectedMin = 0;
      const weeklyHours = emp.weeklyHours || company?.config?.weeklyHours || 44;

      for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(reportFilter.year, reportFilter.month, day);
        const dayOfWeek = dateObj.getDay();
        const dateStr = `${reportFilter.year}-${String(reportFilter.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const holiday = getHolidayForDate(dateStr, customHolidays);

        const dayRecs = filteredRecords.filter(r => {
          const rd = new Date(r.timestamp);
          return r.matricula === emp.matricula &&
                 rd.getDate() === day;
        }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        let e1 = dayRecs[0] ? new Date(dayRecs[0].timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
        let s1 = dayRecs[1] ? new Date(dayRecs[1].timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
        let e2 = dayRecs[2] ? new Date(dayRecs[2].timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
        let s2 = dayRecs[3] ? new Date(dayRecs[3].timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';

        let workedMin = 0;
        if (e1 && s1 && e2 && s2) {
          workedMin = calculateHoursDiff(e1, s1) + calculateHoursDiff(e2, s2);
        } else if (e1 && s2 && !s1 && !e2) {
          workedMin = calculateHoursDiff(e1, s2);
        } else if (e1 && s1 && !e2 && !s2) {
          workedMin = calculateHoursDiff(e1, s1);
        }

        let extraMin = 0;
        if (workedMin > 0) {
          if (holiday || dayOfWeek === 0) {
            // Feriado ou Domingo (DSR): 100% das horas trabalhadas são horas extras
            extraMin = workedMin;
          } else if (dayOfWeek === 6) {
            // Sábado: Na jornada CLT de 44h semanais, 4h são normais (240 min).
            // Apenas o que exceder 4h no sábado é hora extra!
            extraMin = workedMin > 240 ? (workedMin - 240) : 0;
          } else {
            // Segunda a Sexta: 8h normais (480 min). O que exceder é hora extra.
            extraMin = workedMin > 480 ? (workedMin - 480) : 0;
          }

          // Se for feriado ou domingo, a meta esperada é 0 (pois tudo é extra). Nos demais, aplica a meta.
          const dayTarget = holiday ? 0 : (dayOfWeek === 6 ? 240 : (dayOfWeek === 0 ? 0 : 480));
          empExpectedMin += dayTarget;
          empWorkedMin += workedMin;
          empExtraMin += extraMin;
          empDaysCount++;
        }
      }

      const balanceMin = empWorkedMin - empExpectedMin;

      return {
        employee: emp,
        workedMin: empWorkedMin,
        extraMin: empExtraMin,
        daysCount: empDaysCount,
        balanceMin
      };
    });

    const totalWorkedMin = empStats.reduce((acc, s) => acc + s.workedMin, 0);
    const totalExtraMin = empStats.reduce((acc, s) => acc + s.extraMin, 0);
    const totalDays = empStats.reduce((acc, s) => acc + s.daysCount, 0);

    return {
      empStats,
      totalWorkedMin,
      totalExtraMin,
      totalDays
    };
  }, [filteredRecords, reportFilter, employees, company, customHolidays]);

  const handleExportPDF = () => {
    const records = filteredRecords;
    const doc = new jsPDF() as jsPDFWithPlugin;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);

    const employeesToExport = reportFilter.matricula === 'todos' 
      ? employees 
      : employees.filter(e => e.matricula === reportFilter.matricula);

    if (employeesToExport.length === 0) {
      alert("Nenhum colaborador encontrado para o filtro selecionado.");
      return;
    }

    employeesToExport.forEach((emp, index) => {
      if (index > 0) doc.addPage();

      // TITULO
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      const monthLabel = new Date(0, reportFilter.month).toLocaleString('pt-BR', { month: 'long' }).toUpperCase();
      doc.text(`FOLHA DE PONTO / ESPELHO DE PONTO ELETRÔNICO`, pageWidth / 2, 10, { align: 'center' });
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`MÊS/ANO: ${monthLabel} / ${reportFilter.year}  |  Portaria MTP nº 671/2021`, pageWidth / 2, 14, { align: 'center' });

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
      doc.text(`Nome: ${emp.name}`, margin + 2, 48);
      doc.text(`Matrícula: ${emp.matricula}`, pageWidth / 2 + 15, 48);
      doc.text(`CPF: ${emp.cpf || 'NÃO INFORMADO'}`, margin + 2, 52);
      doc.text(`CTPS: ${emp.ctpsNumber || '---'} / Série: ${emp.ctpsSeries || '---'}`, pageWidth / 2 + 15, 52);
      doc.text(`Cargo / Função: ${emp.roleFunction || 'COLABORADOR'}`, margin + 2, 56);
      doc.text(`Jornada: ${emp.workShift || '08:00 - 12:00 / 14:00 - 18:00'} (${emp.weeklyHours || 44}h semanais)`, pageWidth / 2 + 15, 56);
      doc.text(`Horário Contratado: Entrada: 08:00 | Saída Intervalo: 12:00 | Retorno: 13:00/14:00 | Saída: 18:00`, margin + 2, 61);

      // TABELA DE PONTO
      const daysInMonth = new Date(reportFilter.year, reportFilter.month + 1, 0).getDate();
      const body: any[] = [];

      const weeklyHours = emp.weeklyHours || company?.config?.weeklyHours || 44;

      let totalWorkedMinutes = 0;
      let totalExtraMinutes = 0;
      let totalExpectedMinutes = 0;
      let daysWorkedCount = 0;

      for (let day = 1; day <= 31; day++) {
        const dayStr = String(day).padStart(2, '0');
        const dateObj = new Date(reportFilter.year, reportFilter.month, day);
        const dayOfWeek = dateObj.getDay(); // 0 = Domingo, 6 = Sábado
        const dayOfWeekLabel = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dayOfWeek];

        if (day > daysInMonth) {
          body.push([`${dayStr}`, '', '', '', '', '', '', '']);
          continue;
        }

        const dayRecs = records.filter(r => {
          const rd = new Date(r.timestamp);
          return r.matricula === emp.matricula &&
                 rd.getDate() === day &&
                 rd.getMonth() === reportFilter.month &&
                 rd.getFullYear() === reportFilter.year;
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

        const dateStr = `${reportFilter.year}-${String(reportFilter.month + 1).padStart(2, '0')}-${dayStr}`;
        const holiday = getHolidayForDate(dateStr, customHolidays);

        let extraMinutes = 0;
        let rubrica = '';

        if (holiday) {
          if (workedMinutes > 0) {
            // Feriado trabalhado: 100% de horas extras
            extraMinutes = workedMinutes;
            totalExpectedMinutes += 0;
            totalWorkedMinutes += workedMinutes;
            totalExtraMinutes += extraMinutes;
            daysWorkedCount++;
            rubrica = `FERIADO TRABALHADO (${holiday.description})`;
          } else {
            // Feriado não trabalhado: dispensa legal de jornada
            e1 = 'FERIADO';
            s1 = '-';
            e2 = '-';
            s2 = '-';
            rubrica = `FERIADO (${holiday.description})`;
          }
        } else if (workedMinutes > 0) {
          if (dayOfWeek === 0) {
            // Domingo (DSR / 100% Extra)
            extraMinutes = workedMinutes;
            rubrica = 'DSR';
          } else if (dayOfWeek === 6) {
            // Sábado: Na jornada CLT de 44h semanais, 4h são normais (240 min).
            // Apenas o que exceder 4h no sábado é hora extra!
            extraMinutes = workedMinutes > 240 ? (workedMinutes - 240) : 0;
          } else {
            // Segunda a Sexta: 8h normais (480 min). O que exceder é hora extra.
            extraMinutes = workedMinutes > 480 ? (workedMinutes - 480) : 0;
          }

          const dayTargetMinutes = dayOfWeek === 6 ? 240 : (dayOfWeek === 0 ? 0 : 480);
          totalExpectedMinutes += dayTargetMinutes;
          totalWorkedMinutes += workedMinutes;
          totalExtraMinutes += extraMinutes;
          daysWorkedCount++;
        } else if (dayOfWeek === 0) {
          rubrica = 'DSR';
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

      doc.line(margin + 5, signLineY, margin + 80, signLineY);
      doc.text(`Assinatura do Colaborador (${emp.name})`, margin + 42.5, signLineY + 3.2, { align: 'center' });

      doc.line(pageWidth - margin - 80, signLineY, pageWidth - margin - 5, signLineY);
      doc.text("Assinatura do Empregador / RH", pageWidth - margin - 42.5, signLineY + 3.2, { align: 'center' });
    });

    doc.save(`FOLHA_PONTO_${company?.name || 'EMPRESA'}_${reportFilter.month + 1}_${reportFilter.year}.pdf`);
  };

  const handleExportCSV = () => {
    const headers = ['Data', 'Matricula', 'Nome', 'Tipo', 'Horário', 'Endereço', 'Status'];
    const rows = filteredRecords.map(r => [
      new Date(r.timestamp).toLocaleDateString('pt-BR'),
      r.matricula,
      r.userName,
      r.type,
      new Date(r.timestamp).toLocaleTimeString('pt-BR'),
      r.address,
      r.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_ponto_${company?.name || 'empresa'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const chartData = useMemo(() => {
    // Registros por dia (últimos 7 dias)
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }).reverse();

    const activityByDay = last7Days.map(day => {
      const count = latestRecords.filter(r => 
        new Date(r.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) === day
      ).length;
      return { name: day, registros: count };
    });

    // Tipos de registros
    const types = {
      entrada: latestRecords.filter(r => r.type === 'entrada').length,
      saida: latestRecords.filter(r => r.type === 'saida').length,
      intervalo: latestRecords.filter(r => r.type === 'inicio_intervalo' || r.type === 'fim_intervalo').length,
    };

    const typeData = [
      { name: 'Entradas', value: types.entrada, color: '#f97316' },
      { name: 'Saídas', value: types.saida, color: '#475569' },
      { name: 'Intervalos', value: types.intervalo, color: '#94a3b8' },
    ];

    return { activityByDay, typeData };
  }, [latestRecords]);

  const handleUpdatePassword = async () => {
    if (!editingPasswordId || !newPasswordValue) return;
    try {
      await updateDoc(doc(db, "employees", editingPasswordId), { password: newPasswordValue });
      alert("SENHA ATUALIZADA!");
      setEditingPasswordId(null);
      setNewPasswordValue('');
    } catch (e) { alert("ERRO AO ATUALIZAR."); }
  };

  const handleSaveEditEmployee = async () => {
    if (!editingEmployee) return;
    try {
      await onUpdateEmployee(editingEmployee.id, editEmpData);
      alert("DADOS ATUALIZADOS COM SUCESSO!");
      setEditingEmployee(null);
    } catch (e) {
      alert("ERRO AO ATUALIZAR DADOS.");
    }
  };

  const handleToggleEmployeeStatus = async (emp: Employee) => {
    const nextStatus = emp.status === 'inactive' ? 'active' : 'inactive';
    const actionName = nextStatus === 'active' ? 'ATIVAR' : 'DESATIVAR / INATIVAR';
    const confirmMsg = nextStatus === 'active' 
      ? `Deseja ATIVAR o acesso do colaborador ${emp.name} (Matrícula: ${emp.matricula})?` 
      : `Deseja DESATIVAR (marcar como inativo) o colaborador ${emp.name} (Matrícula: ${emp.matricula})?\n\nO colaborador não conseguirá mais bater ponto no aplicativo nem no totem até ser reativado.`;

    if (confirm(confirmMsg)) {
      try {
        await onUpdateEmployee(emp.id, { status: nextStatus });
        alert(`Colaborador ${nextStatus === 'active' ? 'ATIVADO' : 'DESATIVADO'} com sucesso!`);
      } catch (e) {
        alert("Erro ao alterar status do colaborador.");
      }
    }
  };

  const handleDeleteEmployeeSafe = (emp: Employee) => {
    if (confirm(`⚠️ ATENÇÃO: Deseja realmente EXCLUIR PERMANENTEMENTE o colaborador ${emp.name} (Matrícula: ${emp.matricula})?\n\nEsta ação removerá todos os dados cadastrais do colaborador do banco de dados.\nSe você deseja apenas suspender o acesso temporariamente, utilize o botão "Desativar".`)) {
      onDeleteEmployee(emp.id);
    }
  };

  const filteredEmployeesList = useMemo(() => {
    return employees.filter(emp => {
      const isInactive = emp.status === 'inactive';
      const matchesStatus = employeeFilterStatus === 'all' 
        ? true 
        : employeeFilterStatus === 'active' 
          ? !isInactive 
          : isInactive;
      
      const search = employeeSearchTerm.toLowerCase().trim();
      const matchesSearch = !search || 
        (emp.name && emp.name.toLowerCase().includes(search)) || 
        (emp.matricula && emp.matricula.toLowerCase().includes(search)) || 
        (emp.cpf && emp.cpf.toLowerCase().includes(search)) ||
        (emp.roleFunction && emp.roleFunction.toLowerCase().includes(search));

      return matchesStatus && matchesSearch;
    });
  }, [employees, employeeFilterStatus, employeeSearchTerm]);

  const handleRequestStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, "requests", id), { status });
      alert(`SOLICITAÇÃO ${status === 'approved' ? 'APROVADA' : 'RECUSADA'} COM SUCESSO!`);
    } catch (err) {
      alert("ERRO AO ATUALIZAR SOLICITAÇÃO.");
    }
  };

  const handleVacationStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, "vacations", id), { status });
      alert(`SOLICITAÇÃO ${status === 'approved' ? 'APROVADA' : 'RECUSADA'}!`);
    } catch (e) { alert("ERRO AO ATUALIZAR STATUS."); }
  };

  const handleCreateAdminVacation = async () => {
    if (!adminVacationMatricula || !adminVacationStart || !adminVacationEnd) {
      alert("Por favor, selecione o colaborador e informe a data de início e término.");
      return;
    }

    if (new Date(adminVacationStart) > new Date(adminVacationEnd)) {
      alert("A data de início não pode ser posterior à data de término.");
      return;
    }

    const selectedEmp = employees.find(e => e.matricula === adminVacationMatricula);
    if (!selectedEmp) {
      alert("Colaborador não encontrado.");
      return;
    }

    try {
      await addDoc(collection(db, "vacations"), {
        userId: selectedEmp.matricula,
        userName: selectedEmp.name,
        startDate: adminVacationStart,
        endDate: adminVacationEnd,
        status: adminVacationStatus,
        note: adminVacationNote || '',
        companyCode: company?.id,
        createdAt: new Date()
      });
      alert("FÉRIAS REGISTRADAS COM SUCESSO!");
      setShowAdminVacationModal(false);
      setAdminVacationMatricula('');
      setAdminVacationStart('');
      setAdminVacationEnd('');
      setAdminVacationNote('');
      setAdminVacationStatus('approved');
    } catch (e) {
      alert("Erro ao registrar férias no sistema.");
    }
  };

  const handleDeleteVacation = async (id: string) => {
    if (confirm("Deseja realmente excluir este lançamento de férias?")) {
      try {
        await deleteDoc(doc(db, "vacations", id));
        alert("Férias excluídas com sucesso!");
      } catch (e) {
        alert("Erro ao excluir.");
      }
    }
  };

  const handleManualPunch = async () => {
    if (!selectedEmployeeManualPunch || !manualPunchDate || !manualPunchTime) return;
    
    const [year, month, day] = manualPunchDate.split('-').map(Number);
    const [hours, minutes] = manualPunchTime.split(':').map(Number);
    const timestamp = new Date(year, month - 1, day, hours, minutes);
    
    const signature = `MANUAL-${selectedEmployeeManualPunch.matricula}-${Date.now()}`;
    
    const newRecord = {
      userName: selectedEmployeeManualPunch.name,
      matricula: selectedEmployeeManualPunch.matricula,
      timestamp: timestamp,
      address: 'LANÇAMENTO MANUAL (RH)',
      latitude: 0,
      longitude: 0,
      photo: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
      status: 'synchronized',
      digitalSignature: signature,
      type: manualPunchType,
      companyCode: company?.id,
      isAdjustment: true
    };

    try {
      await addDoc(collection(db, "records"), newRecord);
      alert("PONTO MANUAL REGISTRADO COM SUCESSO!");
      setShowManualPunchModal(false);
    } catch (err) {
      alert("ERRO AO SALVAR PONTO MANUAL.");
    }
  };

  const handleUpdateRecord = async () => {
    if (!selectedRecordToEdit || !editRecordDate || !editRecordTime) return;
    
    const [year, month, day] = editRecordDate.split('-').map(Number);
    const [hours, minutes] = editRecordTime.split(':').map(Number);
    const timestamp = new Date(year, month - 1, day, hours, minutes);
    
    try {
      await updateDoc(doc(db, "records", selectedRecordToEdit.id), {
        timestamp: timestamp,
        type: editRecordType,
        isAdjustment: true
      });
      alert("REGISTRO ATUALIZADO COM SUCESSO!");
      setShowEditRecordModal(false);
    } catch (err) {
      alert("ERRO AO ATUALIZAR REGISTRO.");
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm("DESEJA REALMENTE EXCLUIR ESTE REGISTRO DE PONTO?")) return;
    try {
      await deleteDoc(doc(db, "records", id));
      alert("REGISTRO EXCLUÍDO!");
    } catch (err) {
      alert("ERRO AO EXCLUIR REGISTRO.");
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-50 p-6">
        <div className="w-full max-w-sm bg-white p-10 rounded-[44px] shadow-2xl border text-center space-y-6">
           <div className="w-20 h-20 bg-orange-100 rounded-[35px] flex items-center justify-center mx-auto text-orange-600 text-3xl">🔒</div>
           <h2 className="text-sm font-black text-slate-900 uppercase">Gestão RH</h2>
           <div className="relative w-full">
             <input 
               type={showAdminPass ? "text" : "password"} 
               placeholder="SENHA DE ACESSO" 
               value={adminPassAttempt} 
               onChange={e => setAdminPassAttempt(e.target.value)} 
               className={`w-full p-5 bg-slate-50 rounded-3xl text-[11px] font-black text-center border-2 ${authError ? 'border-red-500' : 'border-transparent'}`} 
             />
             <button 
               type="button"
               onClick={() => setShowAdminPass(!showAdminPass)}
               className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
             >
               {showAdminPass ? <EyeOff size={20} /> : <Eye size={20} />}
             </button>
           </div>
           <button onClick={handleVerifyAdmin} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase text-xs">Entrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-8 animate-in fade-in">
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
        {[
          { id: 'dashboard', label: 'Início', icon: '🏠' },
          { id: 'colaboradores', label: 'Equipe', icon: '👥' },
          { id: 'aprovacoes', label: 'Pedidos', icon: '✅' },
          { id: 'correcao', label: 'Correção', icon: '✏️' },
          { id: 'ferias', label: 'Férias', icon: '🏖️' },
          { id: 'feriados', label: 'Feriados', icon: '📅' },
          { id: 'saldos', label: 'Folhas PDF', icon: '📘' },
          { id: 'pontos_individuais', label: 'Individuais', icon: '👤' },
          { id: 'audit', label: 'IA Audit', icon: '⚖️' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`min-w-[100px] p-4 rounded-3xl flex flex-col items-center gap-1 transition-all border ${activeTab === tab.id ? 'bg-orange-600 text-white border-orange-600 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="bg-orange-50 p-8 rounded-[44px] shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 border border-orange-100">
            <div className="space-y-1"><p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Painel Administrativo</p><h3 className="text-slate-900 text-lg font-black uppercase">{company?.name}</h3></div>
            <div className="bg-white px-8 py-5 rounded-3xl border border-orange-100 text-center shadow-sm">
              <p className="text-[8px] text-slate-400 font-black uppercase mb-1">CÓDIGO EMPRESA</p>
              {company?.accessCode ? (
                <span className="text-orange-600 font-mono text-xl font-black">{company.accessCode}</span>
              ) : (
                <button 
                  onClick={async () => {
                    if (!company?.id) return;
                    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                    try {
                      await updateDoc(doc(db, "companies", company.id), { accessCode: newCode });
                      alert("CÓDIGO GERADO: " + newCode);
                    } catch (e) { alert("ERRO AO GERAR CÓDIGO"); }
                  }}
                  className="text-[10px] font-black text-orange-600 underline uppercase"
                >
                  Gerar Código
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-[40px] border shadow-sm text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Total Colaboradores</p>
              <p className="text-4xl font-black text-slate-800">{stats.total}</p>
            </div>
            <div className="bg-white p-8 rounded-[40px] border shadow-sm text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Ativos Hoje</p>
              <p className="text-4xl font-black text-orange-600">{stats.activeToday}</p>
            </div>
            <div className="bg-white p-8 rounded-[40px] border shadow-sm text-center">
              <p className="text-[10px] font-black text-blue-600 uppercase mb-2">Solicitações</p>
              <p className="text-4xl font-black text-blue-600">{stats.pendingRequests}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-[40px] border shadow-sm">
              <h4 className="text-[10px] font-black uppercase text-slate-400 mb-6">Atividade (Últimos 7 dias)</h4>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.activityByDay}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900}} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      cursor={{ fill: '#f8fafc' }}
                    />
                    <Bar dataKey="registros" fill="#f97316" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[40px] border shadow-sm">
              <h4 className="text-[10px] font-black uppercase text-slate-400 mb-6">Distribuição de Registros</h4>
              <div className="h-[250px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.typeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2 ml-4">
                  {chartData.typeData.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{backgroundColor: item.color}}></div>
                      <span className="text-[10px] font-black uppercase text-slate-600">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'colaboradores' && (
        <div className="space-y-6">
          {/* Métricas Rápidas de Equipe */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-[32px] border shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Cadastrados</p>
                <h4 className="text-2xl font-black text-slate-900 mt-1">{employees.length}</h4>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-xl">👥</div>
            </div>
            <div className="bg-white p-6 rounded-[32px] border shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Colaboradores Ativos</p>
                <h4 className="text-2xl font-black text-emerald-600 mt-1">{employees.filter(e => e.status !== 'inactive').length}</h4>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">🟢</div>
            </div>
            <div className="bg-white p-6 rounded-[32px] border shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Inativos / Desativados</p>
                <h4 className="text-2xl font-black text-slate-600 mt-1">{employees.filter(e => e.status === 'inactive').length}</h4>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center text-xl">⚪</div>
            </div>
          </div>

          {/* Barra de Busca e Filtros */}
          <div className="bg-white p-6 rounded-[36px] border shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
            <div className="flex-1">
              <input 
                type="text" 
                placeholder="BUSCAR POR NOME, MATRÍCULA, CPF OU FUNÇÃO..." 
                value={employeeSearchTerm}
                onChange={e => setEmployeeSearchTerm(e.target.value)}
                className="w-full px-5 py-3.5 bg-slate-50 border rounded-2xl text-[11px] font-bold outline-none focus:border-orange-500 transition-all uppercase placeholder:normal-case placeholder:font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1">
                <button 
                  onClick={() => setEmployeeFilterStatus('all')}
                  className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${employeeFilterStatus === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Todos ({employees.length})
                </button>
                <button 
                  onClick={() => setEmployeeFilterStatus('active')}
                  className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${employeeFilterStatus === 'active' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Ativos ({employees.filter(e => e.status !== 'inactive').length})
                </button>
                <button 
                  onClick={() => setEmployeeFilterStatus('inactive')}
                  className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${employeeFilterStatus === 'inactive' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Inativos ({employees.filter(e => e.status === 'inactive').length})
                </button>
              </div>

              <button 
                onClick={() => setShowAddModal(true)} 
                className="bg-slate-900 hover:bg-black text-white px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase shadow-lg transition-all"
              >
                + Novo Cadastro
              </button>
            </div>
          </div>

          {/* Tabela de Colaboradores */}
          <div className="bg-white rounded-[40px] border overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-left min-w-[750px]">
              <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-500 border-b">
                <tr>
                  <th className="p-5">Colaborador</th>
                  <th className="p-5">Matrícula / CPF</th>
                  <th className="p-5">Função & Jornada</th>
                  <th className="p-5 text-center">Status</th>
                  <th className="p-5 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="text-[11px] font-bold uppercase">
                {filteredEmployeesList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 font-bold normal-case text-xs">
                      Nenhum colaborador encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredEmployeesList.map(emp => {
                    const isInactive = emp.status === 'inactive';
                    return (
                      <tr key={emp.id} className={`border-b transition-colors ${isInactive ? 'bg-slate-50/70 opacity-75' : 'hover:bg-slate-50/50'}`}>
                        <td className="p-5">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-black ${isInactive ? 'bg-slate-200 text-slate-500' : 'bg-orange-100 text-orange-700'}`}>
                              {emp.name.charAt(0)}
                            </div>
                            <div>
                              <p className={`font-black text-xs ${isInactive ? 'text-slate-600 line-through' : 'text-slate-900'}`}>{emp.name}</p>
                              {emp.birthDate && <p className="text-[9px] text-slate-400 font-medium lowercase">nasc: {emp.birthDate}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="p-5">
                          <p className="font-mono text-slate-700 font-black">{emp.matricula}</p>
                          <p className="text-[9px] text-slate-400 font-mono font-medium">{emp.cpf || 'Sem CPF'}</p>
                        </td>
                        <td className="p-5">
                          <p className="text-slate-800">{emp.roleFunction || 'Geral'}</p>
                          <p className="text-[9px] text-slate-400 font-medium lowercase">{emp.workShift || '08:00 - 18:00'} ({emp.weeklyHours || 44}h/sem)</p>
                        </td>
                        <td className="p-5 text-center">
                          {isInactive ? (
                            <span className="inline-block bg-slate-200 text-slate-700 border border-slate-300 px-3 py-1 rounded-full text-[8px] font-black uppercase">
                              Inativo
                            </span>
                          ) : (
                            <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-[8px] font-black uppercase">
                              Ativo
                            </span>
                          )}
                        </td>
                        <td className="p-5 text-center">
                          <div className="flex justify-center items-center gap-1.5 flex-wrap">
                            <button 
                              onClick={() => { setSelectedEmployeeManualPunch(emp); setShowManualPunchModal(true); }} 
                              title="Lançar Ponto Manual"
                              className="bg-orange-50 text-orange-600 hover:bg-orange-100 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase transition-all"
                            >
                              Ponto
                            </button>
                            <button 
                              onClick={() => { setEditingEmployee(emp); setEditEmpData(emp); }} 
                              title="Editar Dados do Colaborador"
                              className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase transition-all"
                            >
                              Editar
                            </button>
                            <button 
                              onClick={() => handleToggleEmployeeStatus(emp)} 
                              title={isInactive ? "Ativar Colaborador" : "Desativar Colaborador"}
                              className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase transition-all ${
                                isInactive 
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                                  : 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                              }`}
                            >
                              {isInactive ? 'Ativar' : 'Desativar'}
                            </button>
                            <button 
                              onClick={() => { setEditingPasswordId(emp.id); setNewPasswordValue(''); }} 
                              title="Redefinir Senha"
                              className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase transition-all"
                            >
                              Senha
                            </button>
                            <button 
                              onClick={() => handleDeleteEmployeeSafe(emp)} 
                              title="Excluir Definitivamente"
                              className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase transition-all"
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'saldos' && (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[40px] border shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-900">Folhas de Ponto Oficiais (PDF / CLT)</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Conforme Portaria MTP nº 671/2021 com Somatório de Horas e Horas Extras</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleExportCSV} className="bg-slate-100 text-slate-600 px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
                  📊 CSV
                </button>
                <button onClick={handleExportPDF} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 transition-all">
                  📥 Baixar Folha PDF A4
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select value={reportFilter.matricula} onChange={e => setReportFilter({...reportFilter, matricula: e.target.value})} className="p-4 bg-slate-50 rounded-2xl text-[10px] font-black uppercase outline-none border">
                <option value="todos">Todos Colaboradores</option>
                {employees.map(e => <option key={e.id} value={e.matricula}>{e.name}</option>)}
              </select>
              <select value={reportFilter.month} onChange={e => setReportFilter({...reportFilter, month: parseInt(e.target.value)})} className="p-4 bg-slate-50 rounded-2xl text-[10px] font-black uppercase outline-none border">
                {Array.from({length: 12}).map((_, i) => <option key={i} value={i}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}</option>)}
              </select>
              <select value={reportFilter.year} onChange={e => setReportFilter({...reportFilter, year: parseInt(e.target.value)})} className="p-4 bg-slate-50 rounded-2xl text-[10px] font-black uppercase outline-none border">
                {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Horas Trabalhadas</p>
                <p className="text-xl font-black text-slate-900">{formatMinutesToHours(monthlyReportStats.totalWorkedMin) || '00:00'} <span className="text-xs text-slate-400">h</span></p>
              </div>
              <div className="p-5 rounded-3xl bg-orange-50 border border-orange-100">
                <p className="text-[8px] font-black text-orange-400 uppercase tracking-widest mb-1">Horas Extras</p>
                <p className="text-xl font-black text-orange-600">{formatMinutesToHours(monthlyReportStats.totalExtraMin) || '00:00'} <span className="text-xs text-orange-400">h</span></p>
              </div>
              <div className="p-5 rounded-3xl bg-blue-50 border border-blue-100">
                <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">Dias Registrados</p>
                <p className="text-xl font-black text-blue-700">{monthlyReportStats.totalDays} <span className="text-xs text-blue-400">dias</span></p>
              </div>
              <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-100">
                <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1">Colaboradores</p>
                <p className="text-xl font-black text-emerald-700">{monthlyReportStats.empStats.length} <span className="text-xs text-emerald-400">ativos</span></p>
              </div>
            </div>
          </div>

          {/* Tabela de Resumo dos Colaboradores */}
          <div className="bg-white rounded-[40px] border overflow-hidden shadow-sm overflow-x-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h4 className="text-[11px] font-black uppercase text-slate-700">Resumo Consolidado por Colaborador</h4>
              <span className="text-[9px] font-bold text-slate-400 uppercase">
                {new Date(0, reportFilter.month).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()} / {reportFilter.year}
              </span>
            </div>
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-500">
                <tr>
                  <th className="p-5">Colaborador</th>
                  <th className="p-5">Matrícula</th>
                  <th className="p-5">Cargo</th>
                  <th className="p-5">Dias Trab.</th>
                  <th className="p-5">Horas Trab.</th>
                  <th className="p-5">Horas Extras</th>
                  <th className="p-5">Saldo</th>
                  <th className="p-5 text-center">PDF</th>
                </tr>
              </thead>
              <tbody className="text-[11px] font-bold uppercase">
                {monthlyReportStats.empStats.map(stat => (
                  <tr key={stat.employee.id} className="border-b hover:bg-slate-50/50 transition-colors">
                    <td className="p-5 font-black text-slate-900">{stat.employee.name}</td>
                    <td className="p-5 text-slate-400">{stat.employee.matricula}</td>
                    <td className="p-5 text-slate-500">{stat.employee.roleFunction || '-'}</td>
                    <td className="p-5">{stat.daysCount} dias</td>
                    <td className="p-5 font-black text-slate-800">{formatMinutesToHours(stat.workedMin) || '00:00'} h</td>
                    <td className="p-5">
                      {stat.extraMin > 0 ? (
                        <span className="bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full text-[9px] font-black">
                          +{formatMinutesToHours(stat.extraMin)} h
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="p-5">
                      <span className={`text-[10px] font-black ${stat.balanceMin >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {stat.balanceMin >= 0 ? '+' : '-'}{formatMinutesToHours(Math.abs(stat.balanceMin)) || '00:00'} h
                      </span>
                    </td>
                    <td className="p-5 text-center">
                      <button 
                        onClick={() => {
                          setReportFilter(prev => ({ ...prev, matricula: stat.employee.matricula }));
                          setTimeout(handleExportPDF, 100);
                        }}
                        className="bg-orange-50 text-orange-600 hover:bg-orange-100 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase transition-all"
                        title="Baixar folha individual deste colaborador"
                      >
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
                {monthlyReportStats.empStats.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-slate-400">Nenhum registro encontrado para este período</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'pontos_individuais' && (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[40px] border shadow-sm space-y-6">
            <h3 className="text-sm font-black uppercase">Consulta de Pontos Individuais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Colaborador</label>
                <select 
                  value={selectedEmployeeIndividual} 
                  onChange={e => setSelectedEmployeeIndividual(e.target.value)} 
                  className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black uppercase outline-none border"
                >
                  <option value="todos">Todos</option>
                  {employees.map(e => <option key={e.id} value={e.matricula}>{e.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Data</label>
                <input 
                  type="date" 
                  value={selectedDateIndividual} 
                  onChange={e => setSelectedDateIndividual(e.target.value)} 
                  className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" 
                />
              </div>
            </div>

            {(() => {
              const holidayInfo = getHolidayForDate(selectedDateIndividual, customHolidays);
              if (!holidayInfo) return null;
              return (
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl flex items-center justify-between gap-3 text-orange-800">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎉</span>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wide">
                        {holidayInfo.description} ({holidayInfo.type === 'feriado' ? 'Feriado' : 'Ponto Facultativo'})
                      </p>
                      <p className="text-[8px] font-bold text-orange-600 uppercase">
                        Dia com dispensa legal de jornada. Horas trabalhadas neste dia são computadas com 100% de adicional de hora extra.
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-white border border-orange-200 rounded-xl text-[8px] font-black uppercase text-orange-700">
                    {holidayInfo.isNational ? '🏛️ Nacional' : '🏢 Local / Empresa'}
                  </span>
                </div>
              );
            })()}
          </div>

          <div className="bg-white rounded-[40px] border overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-500">
                <tr>
                  <th className="p-5">Colaborador</th>
                  <th className="p-5">Entrada</th>
                  <th className="p-5">Intervalo</th>
                  <th className="p-5">Retorno</th>
                  <th className="p-5">Saída</th>
                  <th className="p-5">Total Trabalhado</th>
                  <th className="p-5">Horas Extras</th>
                </tr>
              </thead>
              <tbody className="text-[11px] font-bold uppercase">
                {employees
                  .filter(emp => selectedEmployeeIndividual === 'todos' || emp.matricula === selectedEmployeeIndividual)
                  .map(emp => {
                    const dayRecs = latestRecords
                      .filter(r => 
                        r.matricula === emp.matricula && 
                        r.timestamp.toISOString().split('T')[0] === selectedDateIndividual
                      )
                      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

                    const e1 = dayRecs[0] ? dayRecs[0].timestamp.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : '-';
                    const s1 = dayRecs[1] ? dayRecs[1].timestamp.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : '-';
                    const e2 = dayRecs[2] ? dayRecs[2].timestamp.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : '-';
                    const s2 = dayRecs[3] ? dayRecs[3].timestamp.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : '-';

                    const renderRecordIcons = (rec: PointRecord | undefined) => {
                      if (!rec) return null;
                      return (
                        <div className="flex gap-1 mt-1">
                          {rec.photo && (
                            <button 
                              onClick={() => { setSelectedPhotoUrl(rec.photo); setShowPhotoModal(true); }}
                              className="text-blue-400 hover:text-blue-600"
                              title="Ver Foto"
                            >
                              <Camera size={10} />
                            </button>
                          )}
                          {rec.latitude && rec.longitude && (
                            <a 
                              href={`https://www.google.com/maps?q=${rec.latitude},${rec.longitude}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-emerald-400 hover:text-emerald-600"
                              title="Ver Localização"
                            >
                              <MapPin size={10} />
                            </a>
                          )}
                        </div>
                      );
                    };

                    let workedMinutes = 0;
                    if (dayRecs[0] && dayRecs[1]) workedMinutes += calculateHoursDiff(e1, s1);
                    if (dayRecs[2] && dayRecs[3]) workedMinutes += calculateHoursDiff(e2, s2);

                    const holidayInfo = getHolidayForDate(selectedDateIndividual, customHolidays);
                    const dateObj = new Date(selectedDateIndividual + 'T12:00:00');
                    const dayOfWeek = dateObj.getDay();
                    let extraMinutes = 0;
                    if (workedMinutes > 0) {
                      if (holidayInfo || dayOfWeek === 0) {
                        // Feriado ou Domingo: 100% de Horas Extras
                        extraMinutes = workedMinutes;
                      } else if (dayOfWeek === 6) {
                        extraMinutes = workedMinutes > 240 ? (workedMinutes - 240) : 0;
                      } else {
                        extraMinutes = workedMinutes > 480 ? (workedMinutes - 480) : 0;
                      }
                    }

                    return (
                      <tr key={emp.id} className="border-b">
                        <td className="p-5">{emp.name}</td>
                        <td className="p-5">
                          <div>{e1}</div>
                          {renderRecordIcons(dayRecs[0])}
                        </td>
                        <td className="p-5">
                          <div>{s1}</div>
                          {renderRecordIcons(dayRecs[1])}
                        </td>
                        <td className="p-5">
                          <div>{e2}</div>
                          {renderRecordIcons(dayRecs[2])}
                        </td>
                        <td className="p-5">
                          <div>{s2}</div>
                          {renderRecordIcons(dayRecs[3])}
                        </td>
                        <td className="p-5 text-slate-600">
                          {workedMinutes > 0 ? (
                            formatMinutesToHours(workedMinutes)
                          ) : holidayInfo ? (
                            <span className="text-[8px] font-black px-2 py-0.5 rounded bg-orange-100 text-orange-700">Feriado</span>
                          ) : '-'}
                        </td>
                        <td className="p-5">
                          {extraMinutes > 0 ? (
                            <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[8px] font-black">
                              +{formatMinutesToHours(extraMinutes)}
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'audit' && <ComplianceAudit records={latestRecords} employees={employees} />}

      {activeTab === 'aprovacoes' && (
        <div className="space-y-6">
          <h3 className="text-sm font-black uppercase px-2">Solicitações de Ajuste e Abono</h3>
          <div className="bg-white rounded-[40px] border overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-500">
                <tr>
                  <th className="p-5">Data Pedido</th>
                  <th className="p-5">Colaborador</th>
                  <th className="p-5">Tipo</th>
                  <th className="p-5">Data Ref.</th>
                  <th className="p-5">Motivo/Justificativa</th>
                  <th className="p-5">Status</th>
                  <th className="p-5 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="text-[11px] font-bold uppercase">
                {requests.map(req => (
                  <tr key={req.id} className="border-b">
                    <td className="p-5 text-slate-400">{req.createdAt.toLocaleDateString('pt-BR')}</td>
                    <td className="p-5">{req.userName}</td>
                    <td className="p-5">
                      <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[8px] font-black">
                        {req.type}
                      </span>
                    </td>
                    <td className="p-5">{new Date(req.date).toLocaleDateString('pt-BR')}</td>
                    <td className="p-5 text-[9px] text-slate-500 max-w-[200px]">
                      <div className="flex flex-col gap-1">
                        <span className="truncate">{req.reason}</span>
                        {req.attachment && (
                          <button 
                            onClick={() => { setSelectedPhotoUrl(req.attachment!); setShowPhotoModal(true); }}
                            className="flex items-center gap-1 text-blue-500 hover:text-blue-700 text-[8px] font-black uppercase"
                          >
                            <Camera size={10} /> Ver Anexo
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-5">
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black ${
                        req.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 
                        req.status === 'rejected' ? 'bg-red-50 text-red-600' : 
                        'bg-amber-50 text-amber-600'
                      }`}>
                        {req.status === 'pending' ? 'PENDENTE' : req.status === 'approved' ? 'APROVADO' : 'RECUSADO'}
                      </span>
                    </td>
                    <td className="p-5 text-center flex justify-center gap-2">
                      {req.status === 'pending' && (
                        <>
                          <button onClick={() => handleRequestStatus(req.id, 'approved')} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[8px] font-black uppercase">Aprovar</button>
                          <button onClick={() => handleRequestStatus(req.id, 'rejected')} className="bg-red-600 text-white px-4 py-2 rounded-xl text-[8px] font-black uppercase">Recusar</button>
                        </>
                      )}
                      {req.status !== 'pending' && <span className="text-slate-300 text-[8px]">CONCLUÍDO</span>}
                    </td>
                  </tr>
                ))}
                {requests.length === 0 && (
                  <tr><td colSpan={7} className="p-10 text-center text-slate-400">Nenhuma solicitação pendente</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'correcao' && (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[40px] border shadow-sm space-y-6">
            <h3 className="text-sm font-black uppercase">Correção de Registros</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select value={reportFilter.matricula} onChange={e => setReportFilter({...reportFilter, matricula: e.target.value})} className="p-4 bg-slate-50 rounded-2xl text-[10px] font-black uppercase outline-none border">
                <option value="todos">Todos Colaboradores</option>
                {employees.map(e => <option key={e.id} value={e.matricula}>{e.name}</option>)}
              </select>
              <select value={reportFilter.month} onChange={e => setReportFilter({...reportFilter, month: parseInt(e.target.value)})} className="p-4 bg-slate-50 rounded-2xl text-[10px] font-black uppercase outline-none border">
                {Array.from({length: 12}).map((_, i) => <option key={i} value={i}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}</option>)}
              </select>
              <select value={reportFilter.year} onChange={e => setReportFilter({...reportFilter, year: parseInt(e.target.value)})} className="p-4 bg-slate-50 rounded-2xl text-[10px] font-black uppercase outline-none border">
                {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-[40px] border overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-500">
                <tr>
                  <th className="p-5">Data/Hora</th>
                  <th className="p-5">Colaborador</th>
                  <th className="p-5">Tipo</th>
                  <th className="p-5">Endereço</th>
                  <th className="p-5 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="text-[11px] font-bold uppercase">
                {filteredRecords.map(rec => (
                  <tr key={rec.id} className="border-b">
                    <td className="p-5">
                      {rec.timestamp.toLocaleDateString('pt-BR')} {rec.timestamp.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                    </td>
                    <td className="p-5">{rec.userName}</td>
                    <td className="p-5">
                      <span className={`px-2 py-1 rounded-lg text-[8px] ${
                        rec.type === 'entrada' ? 'bg-orange-100 text-orange-700' :
                        rec.type === 'saida' ? 'bg-slate-100 text-slate-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {rec.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-5">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-slate-400 max-w-[200px] truncate">{rec.address}</span>
                        <div className="flex gap-2">
                          {rec.photo && (
                            <button 
                              onClick={() => { setSelectedPhotoUrl(rec.photo); setShowPhotoModal(true); }}
                              className="flex items-center gap-1 text-blue-500 hover:text-blue-700 text-[8px] font-black uppercase"
                            >
                              <Camera size={10} /> Foto
                            </button>
                          )}
                          {rec.latitude && rec.longitude && (
                            <a 
                              href={`https://www.google.com/maps?q=${rec.latitude},${rec.longitude}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-emerald-500 hover:text-emerald-700 text-[8px] font-black uppercase"
                            >
                              <MapPin size={10} /> Mapa
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-center flex justify-center gap-2">
                      <button 
                        onClick={() => {
                          setSelectedRecordToEdit(rec);
                          setEditRecordDate(rec.timestamp.toISOString().split('T')[0]);
                          setEditRecordTime(rec.timestamp.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}));
                          setEditRecordType(rec.type);
                          setShowEditRecordModal(true);
                        }} 
                        className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[8px] font-black uppercase"
                      >
                        Corrigir
                      </button>
                      <button 
                        onClick={() => handleDeleteRecord(rec.id)} 
                        className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-[8px] font-black uppercase"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredRecords.length === 0 && (
                  <tr><td colSpan={5} className="p-10 text-center text-slate-400">Nenhum registro encontrado para este filtro</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'ferias' && (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[40px] border shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-900">Gestão & Escala de Férias (CLT)</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Acompanhe pedidos de colaboradores ou programe o descanso direto pelo RH</p>
              </div>
              <button 
                onClick={() => {
                  if (employees.length > 0) setAdminVacationMatricula(employees[0].matricula);
                  setShowAdminVacationModal(true);
                }} 
                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 transition-all shrink-0"
              >
                + Programar Férias Direto
              </button>
            </div>

            {/* Como Funciona Guide Box */}
            <div className="bg-orange-50/70 border border-orange-100 p-5 rounded-3xl space-y-2">
              <div className="flex items-center gap-2 text-orange-700 font-black text-[10px] uppercase tracking-wide">
                <span>💡</span> Como Funciona a Gestão de Férias:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[9px] text-slate-600 font-bold uppercase leading-relaxed">
                <div className="p-3 bg-white/80 rounded-2xl border border-orange-100/50">
                  <span className="text-orange-600 font-black">1. Pelo Colaborador:</span> Ele acessa o app no menu <strong className="text-slate-800">"Minhas Férias"</strong> e envia a data de início e fim.
                </div>
                <div className="p-3 bg-white/80 rounded-2xl border border-orange-100/50">
                  <span className="text-orange-600 font-black">2. Pelo Painel RH:</span> O pedido aparece aqui nesta lista para você clicar em <strong className="text-emerald-600">"Aprovar"</strong> ou <strong className="text-rose-600">"Recusar"</strong>.
                </div>
                <div className="p-3 bg-white/80 rounded-2xl border border-orange-100/50">
                  <span className="text-orange-600 font-black">3. Lançamento Direto:</span> Use o botão acima para agendar as férias de qualquer membro da equipe imediatamente.
                </div>
              </div>
            </div>

            {/* Metric Cards */}
            {(() => {
              const todayStr = new Date().toISOString().split('T')[0];
              const approvedCount = vacationRequests.filter(v => v.status === 'approved').length;
              const pendingCount = vacationRequests.filter(v => v.status === 'pending').length;
              const activeNowCount = vacationRequests.filter(v => v.status === 'approved' && v.startDate <= todayStr && v.endDate >= todayStr).length;

              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Registros</p>
                    <p className="text-xl font-black text-slate-900">{vacationRequests.length}</p>
                  </div>
                  <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-100">
                    <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1">Aprovadas / Programadas</p>
                    <p className="text-xl font-black text-emerald-700">{approvedCount}</p>
                  </div>
                  <div className="p-5 rounded-3xl bg-amber-50 border border-amber-100">
                    <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest mb-1">Aguardando Aprovação</p>
                    <p className="text-xl font-black text-amber-700">{pendingCount}</p>
                  </div>
                  <div className="p-5 rounded-3xl bg-blue-50 border border-blue-100">
                    <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">Em Férias Hoje</p>
                    <p className="text-xl font-black text-blue-700">{activeNowCount}</p>
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center gap-3 pt-2">
              <label className="text-[9px] font-black text-slate-400 uppercase">Filtrar por Colaborador:</label>
              <select 
                value={vacationFilterMatricula} 
                onChange={e => setVacationFilterMatricula(e.target.value)}
                className="p-3 bg-slate-50 rounded-2xl text-[10px] font-black uppercase outline-none border max-w-xs"
              >
                <option value="todos">Todos Colaboradores</option>
                {employees.map(e => <option key={e.id} value={e.matricula}>{e.name}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-[40px] border overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-left min-w-[750px]">
              <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-500">
                <tr>
                  <th className="p-5">Colaborador</th>
                  <th className="p-5">Início</th>
                  <th className="p-5">Término</th>
                  <th className="p-5">Duração</th>
                  <th className="p-5">Status</th>
                  <th className="p-5">Obs / Justificativa</th>
                  <th className="p-5 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="text-[11px] font-bold uppercase">
                {vacationRequests
                  .filter(req => vacationFilterMatricula === 'todos' || req.userId === vacationFilterMatricula)
                  .map(req => {
                    const startObj = new Date(req.startDate);
                    const endObj = new Date(req.endDate);
                    const diffDays = Math.ceil(Math.abs(endObj.getTime() - startObj.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                    return (
                      <tr key={req.id} className="border-b hover:bg-slate-50/50 transition-colors">
                        <td className="p-5">
                          <p className="font-black text-slate-900">{req.userName}</p>
                          <p className="text-[8px] text-slate-400 font-bold">Matrícula: {req.userId}</p>
                        </td>
                        <td className="p-5 font-black text-slate-700">
                          {startObj.toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-5 font-black text-slate-700">
                          {endObj.toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-5">
                          <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-xl text-[9px] font-black">
                            {isNaN(diffDays) ? '-' : `${diffDays} dias`}
                          </span>
                        </td>
                        <td className="p-5">
                          <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${
                            req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 
                            req.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {req.status === 'approved' ? 'Aprovado' : req.status === 'rejected' ? 'Recusado' : 'Pendente'}
                          </span>
                        </td>
                        <td className="p-5 text-[9px] text-slate-400 max-w-[180px] truncate">
                          {req.note || 'Sem observações'}
                        </td>
                        <td className="p-5 text-center">
                          <div className="flex justify-center gap-2">
                            {req.status === 'pending' && (
                              <>
                                <button onClick={() => handleVacationStatus(req.id, 'approved')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-[8px] font-black uppercase transition-all shadow-sm">
                                  Aprovar
                                </button>
                                <button onClick={() => handleVacationStatus(req.id, 'rejected')} className="bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-xl text-[8px] font-black uppercase transition-all shadow-sm">
                                  Recusar
                                </button>
                              </>
                            )}
                            <button 
                              onClick={() => handleDeleteVacation(req.id)}
                              className="bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase transition-all"
                              title="Excluir Registro"
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                {vacationRequests.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center">
                      <div className="max-w-xs mx-auto space-y-3">
                        <span className="text-3xl">🏖️</span>
                        <p className="text-xs font-black uppercase text-slate-700">Nenhuma solicitação de férias cadastrada</p>
                        <p className="text-[9px] text-slate-400 uppercase font-bold">Os colaboradores podem pedir pelo app ou você pode programar as férias agora.</p>
                        <button 
                          onClick={() => {
                            if (employees.length > 0) setAdminVacationMatricula(employees[0].matricula);
                            setShowAdminVacationModal(true);
                          }}
                          className="bg-orange-600 text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase shadow-md inline-block"
                        >
                          + Programar Férias Agora
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'feriados' && (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[40px] border shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-900">Gestão de Feriados & Pontos Facultativos</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                  Controle os dias não trabalhados e cálculo automático de 100% de hora extra nos registros
                </p>
              </div>
              <button 
                onClick={() => setShowAddHolidayModal(true)} 
                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 transition-all shrink-0"
              >
                <Plus size={14} /> Cadastrar Feriado / Folga Local
              </button>
            </div>

            {/* Banner Informativo CLT */}
            <div className="bg-orange-50/80 border border-orange-100 p-5 rounded-3xl space-y-2">
              <div className="flex items-center gap-2 text-orange-700 font-black text-[10px] uppercase tracking-wide">
                <span>💡</span> Como Funcionam os Feriados no Sistema de Ponto:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[9px] text-slate-600 font-bold uppercase leading-relaxed">
                <div className="p-3 bg-white/90 rounded-2xl border border-orange-100/60">
                  <span className="text-orange-600 font-black">🏛️ Feriados Nacionais Automáticos:</span> Já vêm pré-configurados pela legislação brasileira (Tiradentes, Independência, Consciência Negra, Páscoa móvel, etc.).
                </div>
                <div className="p-3 bg-white/90 rounded-2xl border border-orange-100/60">
                  <span className="text-orange-600 font-black">🏢 Feriados Municipais / Empresa:</span> Você pode cadastrar datas locais da sua cidade, padroeira ou recessos da empresa com um clique.
                </div>
                <div className="p-3 bg-white/90 rounded-2xl border border-orange-100/60">
                  <span className="text-orange-600 font-black">⚖️ Regra de Ponto & CLT:</span> No dia de feriado, a jornada é dispensada (não gera horas negativas) e, se o funcionário trabalhar, o sistema calcula <strong>100% de horas extras</strong> automaticamente!
                </div>
              </div>
            </div>

            {/* Year Selector & Metrics */}
            {(() => {
              const allHols = getAllHolidaysForYear(selectedHolidayYear, customHolidays);
              const nationalCount = allHols.filter(h => h.isNational).length;
              const customCount = allHols.filter(h => !h.isNational).length;
              const todayStr = new Date().toISOString().split('T')[0];
              const upcomingHols = allHols.filter(h => h.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date));
              const nextHol = upcomingHols[0];

              return (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase">Selecione o Ano:</label>
                      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl">
                        {[2024, 2025, 2026, 2027].map(y => (
                          <button
                            key={y}
                            onClick={() => setSelectedHolidayYear(y)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                              selectedHolidayYear === y ? 'bg-orange-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {y}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Feriados no Ano</p>
                      <p className="text-xl font-black text-slate-900">{allHols.length} <span className="text-xs text-slate-400">dias</span></p>
                    </div>
                    <div className="p-5 rounded-3xl bg-blue-50 border border-blue-100">
                      <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-1">Feriados Nacionais</p>
                      <p className="text-xl font-black text-blue-700">{nationalCount} <span className="text-xs text-blue-400">oficiais</span></p>
                    </div>
                    <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-100">
                      <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1">Municipais / Empresa</p>
                      <p className="text-xl font-black text-emerald-700">{customCount} <span className="text-xs text-emerald-400">cadastrados</span></p>
                    </div>
                    <div className="p-5 rounded-3xl bg-amber-50 border border-amber-100">
                      <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest mb-1">Próximo Feriado</p>
                      <p className="text-xs font-black text-amber-800 truncate">
                        {nextHol ? `${new Date(nextHol.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - ${nextHol.description}` : 'Nenhum próximo'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Lista de Feriados */}
          <div className="bg-white rounded-[40px] border overflow-hidden shadow-sm overflow-x-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h4 className="text-[11px] font-black uppercase text-slate-700">Calendário de Feriados e Folgas ({selectedHolidayYear})</h4>
              <span className="text-[9px] font-bold text-slate-400 uppercase">
                {getAllHolidaysForYear(selectedHolidayYear, customHolidays).length} Datas cadastradas
              </span>
            </div>
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-500">
                <tr>
                  <th className="p-5">Data</th>
                  <th className="p-5">Dia da Semana</th>
                  <th className="p-5">Descrição / Nome</th>
                  <th className="p-5">Origem</th>
                  <th className="p-5">Tipo</th>
                  <th className="p-5 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="text-[11px] font-bold uppercase">
                {(() => {
                  const hols = getAllHolidaysForYear(selectedHolidayYear, customHolidays);
                  const todayStr = new Date().toISOString().split('T')[0];

                  return hols.map(h => {
                    const [y, m, d] = h.date.split('-').map(Number);
                    const dateObj = new Date(y, m - 1, d, 12);
                    const dayOfWeekLabel = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][dateObj.getDay()];
                    const isToday = h.date === todayStr;

                    return (
                      <tr key={h.id || h.date} className={`border-b hover:bg-slate-50/50 transition-colors ${isToday ? 'bg-orange-50/40' : ''}`}>
                        <td className="p-5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-900 font-black text-xs">
                              {String(d).padStart(2, '0')}/{String(m).padStart(2, '0')}/{y}
                            </span>
                            {isToday && (
                              <span className="bg-orange-500 text-white text-[7px] font-black px-2 py-0.5 rounded-full">
                                HOJE
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-5 text-slate-500">{dayOfWeekLabel}</td>
                        <td className="p-5 font-black text-slate-900">{h.description}</td>
                        <td className="p-5">
                          {h.isNational ? (
                            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[8px] font-black">
                              🏛️ Nacional Oficial
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[8px] font-black">
                              🏢 Municipal / Empresa
                            </span>
                          )}
                        </td>
                        <td className="p-5">
                          <span className={`px-2.5 py-1 rounded-full text-[8px] font-black ${
                            h.type === 'feriado' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {h.type === 'feriado' ? 'Feriado' : 'Ponto Facultativo'}
                          </span>
                        </td>
                        <td className="p-5 text-center">
                          {!h.isNational && h.id ? (
                            <button
                              onClick={() => handleDeleteHoliday(h.id!, h.description)}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-2 rounded-xl text-[9px] font-black transition-all"
                              title="Remover Feriado Local"
                            >
                              <Trash2 size={13} />
                            </button>
                          ) : (
                            <span className="text-slate-300 text-[8px] font-black" title="Feriado nacional fixado por lei federal">
                              🔒 Fixo
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-[44px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in overflow-y-auto max-h-[90vh] no-scrollbar">
            <h2 className="text-[14px] font-black uppercase text-center mb-6 text-orange-600 tracking-widest">Novo Colaborador</h2>
            <div className="space-y-3">
              <input type="text" placeholder="NOME COMPLETO" value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
              <div className="flex gap-2">
                <input type="text" placeholder="MATRÍCULA" value={newEmp.matricula} onChange={e => setNewEmp({...newEmp, matricula: e.target.value})} className="flex-1 p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
                <input type="text" placeholder="CPF" value={newEmp.cpf} onChange={e => setNewEmp({...newEmp, cpf: e.target.value})} className="flex-1 p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] font-black uppercase text-slate-400 ml-2">Data de Nascimento</label>
                <input type="date" value={newEmp.birthDate} onChange={e => setNewEmp({...newEmp, birthDate: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
              </div>
              <input type="text" placeholder="CARGO / FUNÇÃO" value={newEmp.roleFunction} onChange={e => setNewEmp({...newEmp, roleFunction: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
              <div className="flex gap-2">
                <input type="text" placeholder="CTPS Nº" value={newEmp.ctpsNumber} onChange={e => setNewEmp({...newEmp, ctpsNumber: e.target.value})} className="flex-1 p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
                <input type="text" placeholder="SÉRIE" value={newEmp.ctpsSeries} onChange={e => setNewEmp({...newEmp, ctpsSeries: e.target.value})} className="flex-1 p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="HORÁRIO (EX: 08:00 - 18:00)" value={newEmp.workShift} onChange={e => setNewEmp({...newEmp, workShift: e.target.value})} className="flex-[2] p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
                <input type="number" placeholder="HORAS/SEM" value={newEmp.weeklyHours} onChange={e => setNewEmp({...newEmp, weeklyHours: parseInt(e.target.value) || 44})} className="flex-1 p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
              </div>
              <div>
                <label className="text-[8px] font-black uppercase text-slate-400 ml-2">Status Inicial</label>
                <select 
                  value={newEmp.status} 
                  onChange={e => setNewEmp({...newEmp, status: e.target.value as any})}
                  className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border"
                >
                  <option value="active">🟢 ATIVO (Acesso Liberado)</option>
                  <option value="inactive">⚪ INATIVO (Acesso Bloqueado)</option>
                </select>
              </div>
              <div className="relative w-full">
                <input 
                  type={showNewEmpPass ? "text" : "password"} 
                  placeholder="SENHA DE ACESSO" 
                  value={newEmp.password} 
                  onChange={e => setNewEmp({...newEmp, password: e.target.value})} 
                  className="w-full p-4 bg-orange-50 rounded-2xl text-[10px] font-black border border-orange-100 outline-none pr-12" 
                />
                <button 
                  type="button"
                  onClick={() => setShowNewEmpPass(!showNewEmpPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-400 hover:text-orange-600 transition-colors"
                >
                  {showNewEmpPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            <div className="flex gap-3 pt-6">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 border rounded-2xl text-[10px] font-black uppercase text-slate-400">Voltar</button>
              <button onClick={() => { onAddEmployee(newEmp); setShowAddModal(false); }} className="flex-[2] py-4 bg-orange-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl">Cadastrar</button>
            </div>
          </div>
        </div>
      )}

      {editingPasswordId && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-[44px] w-full max-w-sm p-10 shadow-2xl space-y-4">
             <h2 className="text-sm font-black text-center uppercase mb-4 text-blue-600">Redefinir Senha</h2>
             <div className="relative w-full">
               <input 
                 type={showResetPass ? "text" : "password"} 
                 value={newPasswordValue} 
                 onChange={e => setNewPasswordValue(e.target.value)} 
                 placeholder="NOVA SENHA" 
                 className="w-full p-5 bg-slate-50 rounded-3xl text-[11px] font-black text-center border pr-14" 
               />
               <button 
                 type="button"
                 onClick={() => setShowResetPass(!showResetPass)}
                 className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
               >
                 {showResetPass ? <EyeOff size={20} /> : <Eye size={20} />}
               </button>
             </div>
             <div className="flex gap-3 pt-4">
                <button onClick={() => setEditingPasswordId(null)} className="flex-1 py-4 border rounded-2xl text-[10px] font-black uppercase text-slate-400">Sair</button>
                <button onClick={handleUpdatePassword} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl">Salvar</button>
             </div>
          </div>
        </div>
      )}

      {editingEmployee && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-[44px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in overflow-y-auto max-h-[90vh] no-scrollbar">
            <h2 className="text-[14px] font-black uppercase text-center mb-6 text-emerald-600 tracking-widest">Editar Colaborador</h2>
            <div className="space-y-3">
              <div>
                <label className="text-[8px] font-black uppercase text-slate-400 ml-2">Nome Completo</label>
                <input type="text" value={editEmpData.name} onChange={e => setEditEmpData({...editEmpData, name: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[8px] font-black uppercase text-slate-400 ml-2">Matrícula</label>
                  <input type="text" value={editEmpData.matricula} onChange={e => setEditEmpData({...editEmpData, matricula: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
                </div>
                <div className="flex-1">
                  <label className="text-[8px] font-black uppercase text-slate-400 ml-2">CPF</label>
                  <input type="text" value={editEmpData.cpf} onChange={e => setEditEmpData({...editEmpData, cpf: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
                </div>
              </div>
              <div>
                <label className="text-[8px] font-black uppercase text-slate-400 ml-2">Data de Nascimento</label>
                <input type="date" value={editEmpData.birthDate} onChange={e => setEditEmpData({...editEmpData, birthDate: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
              </div>
              <div>
                <label className="text-[8px] font-black uppercase text-slate-400 ml-2">Cargo / Função</label>
                <input type="text" value={editEmpData.roleFunction} onChange={e => setEditEmpData({...editEmpData, roleFunction: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[8px] font-black uppercase text-slate-400 ml-2">CTPS Nº</label>
                  <input type="text" value={editEmpData.ctpsNumber} onChange={e => setEditEmpData({...editEmpData, ctpsNumber: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
                </div>
                <div className="flex-1">
                  <label className="text-[8px] font-black uppercase text-slate-400 ml-2">SÉRIE</label>
                  <input type="text" value={editEmpData.ctpsSeries} onChange={e => setEditEmpData({...editEmpData, ctpsSeries: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-[2]">
                  <label className="text-[8px] font-black uppercase text-slate-400 ml-2">Horário</label>
                  <input type="text" value={editEmpData.workShift} onChange={e => setEditEmpData({...editEmpData, workShift: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
                </div>
                <div className="flex-1">
                  <label className="text-[8px] font-black uppercase text-slate-400 ml-2">Horas/Sem</label>
                  <input type="number" value={editEmpData.weeklyHours} onChange={e => setEditEmpData({...editEmpData, weeklyHours: parseInt(e.target.value) || 44})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
                </div>
              </div>
              <div>
                <label className="text-[8px] font-black uppercase text-slate-400 ml-2">Status do Colaborador</label>
                <select 
                  value={editEmpData.status || 'active'} 
                  onChange={e => setEditEmpData({...editEmpData, status: e.target.value as any})}
                  className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border"
                >
                  <option value="active">🟢 ATIVO (Acesso Liberado)</option>
                  <option value="inactive">⚪ INATIVO (Acesso Bloqueado)</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 pt-6">
              <button onClick={() => setEditingEmployee(null)} className="flex-1 py-4 border rounded-2xl text-[10px] font-black uppercase text-slate-400">Cancelar</button>
              <button onClick={handleSaveEditEmployee} className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl">Salvar Alterações</button>
            </div>
          </div>
        </div>
      )}

      {showManualPunchModal && selectedEmployeeManualPunch && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-[44px] w-full max-w-sm p-8 shadow-2xl space-y-4 animate-in zoom-in">
            <h2 className="text-sm font-black text-center uppercase mb-2 text-orange-600">Lançamento Manual</h2>
            <p className="text-[10px] font-bold text-center text-slate-500 uppercase mb-4">Colaborador: {selectedEmployeeManualPunch.name}</p>
            
            <div className="space-y-3">
              <div>
                <label className="text-[8px] font-black uppercase text-slate-400 ml-2">Data</label>
                <input type="date" value={manualPunchDate} onChange={e => setManualPunchDate(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
              </div>
              <div>
                <label className="text-[8px] font-black uppercase text-slate-400 ml-2">Horário</label>
                <input type="time" value={manualPunchTime} onChange={e => setManualPunchTime(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
              </div>
              <div>
                <label className="text-[8px] font-black uppercase text-slate-400 ml-2">Tipo de Registro</label>
                <select value={manualPunchType} onChange={e => setManualPunchType(e.target.value as any)} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border uppercase">
                  <option value="entrada">Entrada</option>
                  <option value="inicio_intervalo">Início Intervalo</option>
                  <option value="fim_intervalo">Fim Intervalo</option>
                  <option value="saida">Saída</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button onClick={() => setShowManualPunchModal(false)} className="flex-1 py-4 border rounded-2xl text-[10px] font-black uppercase text-slate-400">Cancelar</button>
              <button onClick={handleManualPunch} className="flex-[2] py-4 bg-orange-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {showEditRecordModal && selectedRecordToEdit && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-[44px] w-full max-w-sm p-8 shadow-2xl space-y-4 animate-in zoom-in">
            <h2 className="text-sm font-black text-center uppercase mb-2 text-blue-600">Corrigir Registro</h2>
            <p className="text-[10px] font-bold text-center text-slate-500 uppercase mb-4">Colaborador: {selectedRecordToEdit.userName}</p>
            
            <div className="space-y-3">
              <div>
                <label className="text-[8px] font-black uppercase text-slate-400 ml-2">Data</label>
                <input type="date" value={editRecordDate} onChange={e => setEditRecordDate(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
              </div>
              <div>
                <label className="text-[8px] font-black uppercase text-slate-400 ml-2">Horário</label>
                <input type="time" value={editRecordTime} onChange={e => setEditRecordTime(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
              </div>
              <div>
                <label className="text-[8px] font-black uppercase text-slate-400 ml-2">Tipo de Registro</label>
                <select value={editRecordType} onChange={e => setEditRecordType(e.target.value as any)} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border uppercase">
                  <option value="entrada">Entrada</option>
                  <option value="inicio_intervalo">Início Intervalo</option>
                  <option value="fim_intervalo">Fim Intervalo</option>
                  <option value="saida">Saída</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button onClick={() => setShowEditRecordModal(false)} className="flex-1 py-4 border rounded-2xl text-[10px] font-black uppercase text-slate-400">Cancelar</button>
              <button onClick={handleUpdateRecord} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl">Salvar Alteração</button>
            </div>
          </div>
        </div>
      )}

      {showPhotoModal && selectedPhotoUrl && (
        <div className="fixed inset-0 z-[110] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[44px] w-full max-w-lg p-4 shadow-2xl animate-in zoom-in relative">
            <button 
              onClick={() => setShowPhotoModal(false)}
              className="absolute -top-4 -right-4 bg-white text-slate-900 p-3 rounded-full shadow-xl hover:bg-slate-100 transition-all z-10"
            >
              <X size={24} />
            </button>
            <div className="rounded-[32px] overflow-hidden border-4 border-slate-50">
              <img 
                src={selectedPhotoUrl} 
                alt="Foto do Ponto" 
                className="w-full h-auto object-contain max-h-[70vh]" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-6 text-center">
              <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-900">Confirmação de Identidade</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Foto capturada no momento da batida</p>
            </div>
          </div>
        </div>
      )}

      {showAdminVacationModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-[44px] w-full max-w-md p-8 shadow-2xl space-y-4 animate-in zoom-in">
            <h2 className="text-sm font-black text-center uppercase mb-1 text-orange-600">Programar Férias Direto</h2>
            <p className="text-[10px] font-bold text-center text-slate-400 uppercase mb-4">Lançamento oficial pelo RH / Empregador</p>
            
            <div className="space-y-3">
              <div>
                <label className="text-[8px] font-black uppercase text-slate-400 ml-2">Colaborador</label>
                <select 
                  value={adminVacationMatricula} 
                  onChange={e => setAdminVacationMatricula(e.target.value)}
                  className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black uppercase outline-none border"
                >
                  <option value="">Selecione o Colaborador...</option>
                  {employees.map(e => <option key={e.id} value={e.matricula}>{e.name} (Matrícula: {e.matricula})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[8px] font-black uppercase text-slate-400 ml-2">Data de Início</label>
                  <input 
                    type="date" 
                    value={adminVacationStart} 
                    onChange={e => setAdminVacationStart(e.target.value)} 
                    className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" 
                  />
                </div>
                <div>
                  <label className="text-[8px] font-black uppercase text-slate-400 ml-2">Data de Término</label>
                  <input 
                    type="date" 
                    value={adminVacationEnd} 
                    onChange={e => setAdminVacationEnd(e.target.value)} 
                    className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" 
                  />
                </div>
              </div>

              {adminVacationStart && adminVacationEnd && (
                <div className="p-3 bg-orange-50 rounded-2xl border border-orange-100 flex justify-between items-center text-[9px] font-black uppercase text-orange-700">
                  <span>Duração Estimada:</span>
                  <span>
                    {(() => {
                      const s = new Date(adminVacationStart);
                      const en = new Date(adminVacationEnd);
                      const d = Math.ceil(Math.abs(en.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                      return isNaN(d) ? '-' : `${d} dias de descanso`;
                    })()}
                  </span>
                </div>
              )}

              <div>
                <label className="text-[8px] font-black uppercase text-slate-400 ml-2">Status Inicial</label>
                <select 
                  value={adminVacationStatus} 
                  onChange={e => setAdminVacationStatus(e.target.value as any)}
                  className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black uppercase outline-none border"
                >
                  <option value="approved">Aprovado / Programado</option>
                  <option value="pending">Pendente de Confirmação</option>
                </select>
              </div>

              <div>
                <label className="text-[8px] font-black uppercase text-slate-400 ml-2">Observação / Período Aquisitivo (Opcional)</label>
                <input 
                  type="text" 
                  placeholder="Ex: Férias regulares 2025/2026 - 30 dias"
                  value={adminVacationNote} 
                  onChange={e => setAdminVacationNote(e.target.value)}
                  className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" 
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button onClick={() => setShowAdminVacationModal(false)} className="flex-1 py-4 border rounded-2xl text-[10px] font-black uppercase text-slate-400">Cancelar</button>
              <button onClick={handleCreateAdminVacation} className="flex-[2] py-4 bg-orange-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl">Gravar Férias</button>
            </div>
          </div>
        </div>
      )}

      {showAddHolidayModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-[44px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in overflow-y-auto max-h-[90vh] no-scrollbar">
            <div className="w-16 h-16 rounded-[28px] bg-orange-100 text-orange-600 flex items-center justify-center mx-auto text-2xl mb-4">
              📅
            </div>
            <h2 className="text-[14px] font-black uppercase text-center mb-1 text-slate-900 tracking-widest">
              Cadastrar Feriado / Folga
            </h2>
            <p className="text-[9px] font-bold uppercase text-slate-400 text-center mb-6">
              Adicione feriados municipais, padroeiras ou recessos internos da sua empresa
            </p>

            <form onSubmit={handleAddHoliday} className="space-y-4">
              <div>
                <label className="text-[8px] font-black uppercase text-slate-400 ml-2">Data do Feriado / Folga</label>
                <input 
                  type="date" 
                  required
                  value={newHolidayDate} 
                  onChange={e => setNewHolidayDate(e.target.value)} 
                  className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border focus:border-orange-500" 
                />
              </div>

              <div>
                <label className="text-[8px] font-black uppercase text-slate-400 ml-2">Nome / Descrição</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Aniversário da Cidade, Recesso Coletivo"
                  value={newHolidayName} 
                  onChange={e => setNewHolidayName(e.target.value.toUpperCase())} 
                  className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border focus:border-orange-500" 
                />
              </div>

              <div>
                <label className="text-[8px] font-black uppercase text-slate-400 ml-2">Tipo de Folga</label>
                <select 
                  value={newHolidayType} 
                  onChange={e => setNewHolidayType(e.target.value as any)} 
                  className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black uppercase outline-none border"
                >
                  <option value="feriado">Feriado Municipal / Estadual</option>
                  <option value="ponto_facultativo">Ponto Facultativo / Recesso</option>
                  <option value="evento">Evento / Folga Especial</option>
                </select>
              </div>

              <div className="p-3 bg-orange-50 rounded-2xl border border-orange-100 text-[8px] font-bold text-orange-700 uppercase leading-relaxed">
                ⚖️ Este dia dispensará a cobrança de jornada dos colaboradores no livro de ponto. Caso algum colaborador trabalhe, o sistema gerará 100% de horas extras.
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddHolidayModal(false)} 
                  className="flex-1 py-4 border rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-[2] py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl"
                >
                  Salvar Feriado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
