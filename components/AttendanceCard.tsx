
import React from 'react';
import { PointRecord, User, Company } from '../types';

interface AttendanceCardProps {
  records: PointRecord[];
  company: Company | null;
}

const AttendanceCard: React.FC<AttendanceCardProps> = ({ records, company }) => {
  const user: User = JSON.parse(localStorage.getItem('fortime_user') || '{}');

  const calculateTotalHours = () => {
    if (records.length < 2) return 0;
    const sorted = [...records].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    let totalMs = 0;
    for (let i = 0; i < sorted.length; i += 2) {
      const entry = sorted[i];
      const exit = sorted[i + 1];
      if (entry && exit) totalMs += exit.timestamp.getTime() - entry.timestamp.getTime();
    }
    return totalMs / (1000 * 60 * 60);
  };

  const totalHours = calculateTotalHours();
  const hours = Math.floor(totalHours);
  const minutes = Math.round((totalHours - hours) * 60);

  const generatePrintableFolha = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = now.toLocaleString('pt-BR', { month: 'long' }).toUpperCase();
    
    const empRecs = records.filter(r => 
      r.timestamp.getMonth() === month && 
      r.timestamp.getFullYear() === year
    );

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let tableRows = '';
    for (let d = 1; d <= 31; d++) {
      const dateObj = new Date(year, month, d);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      
      if (d > daysInMonth) {
        tableRows += `<tr class="empty-row"><td>${d}</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`;
        continue;
      }

      const dateStr = dateObj.toLocaleDateString('pt-BR');
      const dayRecs = empRecs.filter(r => r.timestamp.toLocaleDateString('pt-BR') === dateStr)
                         .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      const e1 = dayRecs[0] ? dayRecs[0].timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
      const s1 = dayRecs[1] ? dayRecs[1].timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
      const e2 = dayRecs[2] ? dayRecs[2].timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
      const s2 = dayRecs[3] ? dayRecs[3].timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
      
      const rowClass = isWeekend ? 'weekend' : '';
      tableRows += `<tr class="${rowClass}">
        <td>${d}</td>
        <td>${e1}</td>
        <td>${s1}</td>
        <td>${e2}</td>
        <td>${s2}</td>
        <td></td>
        <td></td>
      </tr>`;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>FOLHA DE PONTO - ${user.name}</title>
          <style>
            @page { size: A4; margin: 3mm; }
            body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 0; color: #000; font-size: 8.5px; line-height: 1.1; }
            .container { width: 100%; max-width: 200mm; margin: 0 auto; border: 1px solid #000; padding: 8px; box-sizing: border-box; height: 100vh; display: flex; flex-direction: column; justify-content: space-between; }
            .title { text-align: center; font-size: 12px; font-weight: 900; border-bottom: 1.5px solid #000; padding-bottom: 3px; margin-bottom: 8px; }
            .header-info { display: grid; grid-template-columns: 1.2fr 1fr; gap: 8px; margin-bottom: 8px; }
            .info-box { border: 1px solid #000; padding: 4px; background: #fafafa; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { border: 1px solid #000; text-align: center; padding: 3px 1px; }
            th { background: #f2f2f2; font-weight: 900; font-size: 7px; }
            tr.weekend { background: #f9f9f9; }
            .footer-sigs { margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
            .sig-line { border-top: 1px solid #000; text-align: center; padding-top: 3px; font-weight: 900; font-size: 8px; }
            .stamp { text-align: center; font-size: 7px; color: #888; margin-top: 10px; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="container">
            <div>
              <div class="title">FOLHA DE FREQUÊNCIA INDIVIDUAL</div>
              <div class="header-info">
                <div class="info-box">
                  <b>EMPRESA:</b> ${company?.name || '---'}<br/>
                  <b>CNPJ:</b> ${company?.cnpj || '---'}<br/>
                  <b>ENDEREÇO:</b> ${company?.address || '---'}
                </div>
                <div class="info-box">
                  <b>COLABORADOR:</b> ${user.name}<br/>
                  <b>MATRÍCULA:</b> ${user.matricula || '---'}<br/>
                  <b>PERÍODO:</b> ${monthName} / ${year}
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th width="25">DIA</th>
                    <th>ENTRADA 1</th>
                    <th>SAÍDA 1</th>
                    <th>ENTRADA 2</th>
                    <th>SAÍDA 2</th>
                    <th width="40">H. EXTRA</th>
                    <th width="100">ASSINATURA</th>
                  </tr>
                </thead>
                <tbody>${tableRows}</tbody>
              </table>
            </div>
            <div>
              <div class="footer-sigs">
                <div class="sig-line">Assinatura do Colaborador</div>
                <div class="sig-line">Assinatura da Empresa</div>
              </div>
              <div class="stamp">Documento gerado eletronicamente em conformidade com a Portaria 671 MTP - ForTime PRO</div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-slate-900 rounded-[44px] p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 blur-3xl -mr-16 -mt-16"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 mb-1">Dados Contratuais</p>
        <h2 className="text-xl font-black tracking-tight mb-2 truncate">{user.roleFunction || 'Ocupação não definida'}</h2>
        <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest bg-orange-500/10 inline-block px-3 py-1 rounded-lg">Jornada: {user.workShift || 'Flexível'}</p>
        
        <div className="grid grid-cols-2 gap-4 mt-8">
          <div className="bg-white/5 border border-white/10 p-5 rounded-[32px] backdrop-blur-sm">
            <p className="text-[9px] font-black uppercase opacity-40 mb-1">Saldo do Mês</p>
            <p className="text-2xl font-black text-orange-500">{hours}h {minutes}m</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-5 rounded-[32px] backdrop-blur-sm">
            <p className="text-[9px] font-black uppercase opacity-40 mb-1">Status</p>
            <p className="text-sm font-black text-emerald-400 mt-2 uppercase">● Regular</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[40px] border border-orange-50 dark:border-slate-700 p-6 shadow-sm space-y-4">
        <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest px-2">Documentos Legais</h3>
        
        <button 
          onClick={generatePrintableFolha}
          className="w-full py-6 bg-slate-900 dark:bg-slate-700 text-white rounded-[28px] font-black uppercase text-xs shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
        >
          <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Gerar Folha A4 Oficial
        </button>

        <p className="text-center text-[8px] text-slate-400 font-bold uppercase tracking-widest px-4">
          A Folha de Ponto A4 é o documento oficial para assinatura e comprovação de jornada.
        </p>
      </div>
    </div>
  );
};

export default AttendanceCard;
