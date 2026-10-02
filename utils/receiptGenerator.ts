import { jsPDF } from 'jspdf';
import { PointRecord, Company, User } from '../types';

export function getCompanyAndUserData(company?: Company | null): { companyName: string; cnpj: string } {
  let companyName = company?.socialReason || company?.name || '';
  let cnpj = company?.cnpj || '';

  if (!companyName || !cnpj) {
    try {
      const savedUser = localStorage.getItem('fortime_user');
      if (savedUser) {
        const u: User = JSON.parse(savedUser);
        if (!companyName && u.companyName) companyName = u.companyName;
      }
    } catch {}
  }

  return {
    companyName: companyName || 'PontoExato Soluções Corporativas Ltda',
    cnpj: cnpj || '12.345.678/0001-90',
  };
}

export function formatPunchType(type?: string): string {
  switch (type) {
    case 'entrada': return 'ENTRADA';
    case 'inicio_intervalo': return 'INÍCIO DE INTERVALO (ALMOÇO)';
    case 'fim_intervalo': return 'RETORNO DO INTERVALO';
    case 'saida': return 'SAÍDA';
    default: return type ? type.toUpperCase() : 'REGISTRO DE PONTO';
  }
}

/**
 * Gera e faz o download do Comprovante de Registro de Ponto em formato PDF oficial
 * em conformidade com as diretrizes da Portaria MTP nº 671/2021 (REP-P).
 */
export function downloadReceiptPDF(record: PointRecord, company?: Company | null) {
  const { companyName, cnpj } = getCompanyAndUserData(company);
  const dateObj = new Date(record.timestamp);
  const formattedDate = dateObj.toLocaleDateString('pt-BR');
  const formattedTime = dateObj.toLocaleTimeString('pt-BR');
  const typeText = formatPunchType(record.type);

  // Criar documento PDF com tamanho de recibo (80mm x 150mm) ou A6
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [90, 155]
  });

  const width = doc.internal.pageSize.getWidth();
  const margin = 7;
  const contentWidth = width - (margin * 2);

  // Faixa Superior / Cabeçalho
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(margin, 6, contentWidth, 16, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('COMPROVANTE DE REGISTRO DE PONTO', width / 2, 12, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Portaria MTP nº 671/2021 • REP-P Digital', width / 2, 17, { align: 'center' });

  let curY = 27;

  // DADOS DO EMPREGADOR
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, curY, contentWidth, 19, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('EMPREGADOR / EMPRESA', margin + 3, curY + 4.5);

  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  const splitCompName = doc.splitTextToSize(companyName, contentWidth - 6);
  doc.text(splitCompName, margin + 3, curY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text(`CNPJ: ${cnpj}`, margin + 3, curY + 15.5);

  curY += 22;

  // DADOS DO TRABALHADOR
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, curY, contentWidth, 19, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TRABALHADOR / COLABORADOR', margin + 3, curY + 4.5);

  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  const splitUserName = doc.splitTextToSize(record.userName || 'Colaborador', contentWidth - 6);
  doc.text(splitUserName, margin + 3, curY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text(`Matrícula / ID: ${record.matricula || 'N/A'}`, margin + 3, curY + 15.5);

  curY += 22;

  // DETALHES DA BATIDA
  doc.setFillColor(254, 243, 199); // amber-100 / laranja suave
  doc.setDrawColor(251, 191, 36);
  doc.roundedRect(margin, curY, contentWidth, 26, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(180, 83, 9);
  doc.text(`TIPO: ${typeText}`, width / 2, curY + 5.5, { align: 'center' });

  // Hora em destaque
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(formattedTime, width / 2, curY + 14, { align: 'center' });

  // Data
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Data do Registro: ${formattedDate}`, width / 2, curY + 19, { align: 'center' });

  if (record.isOffline) {
    doc.setFontSize(6.5);
    doc.setTextColor(217, 119, 6);
    doc.text('(Registro Gravado em Modo Offline Seguro)', width / 2, curY + 23.5, { align: 'center' });
  }

  curY += 29;

  // LOCALIZAÇÃO
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, curY, contentWidth, 17, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('LOCALIZAÇÃO / COORDENADAS', margin + 3, curY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  const splitAddress = doc.splitTextToSize(record.address || 'Localização Registrada', contentWidth - 6);
  doc.text(splitAddress, margin + 3, curY + 9);

  curY += 20;

  // ASSINATURA DIGITAL / PROTOCOLO
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, curY, contentWidth, 19, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('ASSINATURA DIGITAL (HASH SHA-256 / PROTOCOLO):', margin + 3, curY + 4.5);

  doc.setFont('courier', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(15, 23, 42);
  const splitHash = doc.splitTextToSize(record.digitalSignature || 'PX-DIGITAL-SIGNATURE', contentWidth - 6);
  doc.text(splitHash, margin + 3, curY + 9);

  curY += 22;

  // RODAPÉ DE VALIDADE JURÍDICA
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Documento emitido eletronicamente pelo Sistema PontoExato.', width / 2, curY + 2, { align: 'center' });
  doc.text(`Emissão: ${new Date().toLocaleString('pt-BR')}`, width / 2, curY + 5.5, { align: 'center' });

  // Salvar o arquivo
  const safeTime = dateObj.toISOString().slice(0, 10);
  const filename = `Comprovante_Ponto_${record.matricula || 'colaborador'}_${safeTime}_${dateObj.getHours()}h${dateObj.getMinutes()}.pdf`;
  doc.save(filename);
}

/**
 * Retorna o texto formatado do comprovante para compartilhamento ou cópia
 */
export function getReceiptPlainText(record: PointRecord, company?: Company | null): string {
  const { companyName, cnpj } = getCompanyAndUserData(company);
  const dateObj = new Date(record.timestamp);
  const formattedDate = dateObj.toLocaleDateString('pt-BR');
  const formattedTime = dateObj.toLocaleTimeString('pt-BR');
  const typeText = formatPunchType(record.type);

  let text = "================================================\n";
  text += "  COMPROVANTE DE REGISTRO DE PONTO DO TRABALHADOR\n";
  text += "          Portaria MTP nº 671/2021 (REP-P)\n";
  text += "================================================\n\n";
  text += `EMPREGADOR: ${companyName}\n`;
  text += `CNPJ: ${cnpj}\n\n`;
  text += `COLABORADOR: ${record.userName}\n`;
  text += `MATRÍCULA: ${record.matricula || 'N/A'}\n\n`;
  text += `TIPO: ${typeText}\n`;
  text += `DATA: ${formattedDate}\n`;
  text += `HORÁRIO: ${formattedTime}\n`;
  text += `LOCAL: ${record.address}\n\n`;
  text += `ASSINATURA DIGITAL (HASH):\n${record.digitalSignature}\n\n`;
  text += "------------------------------------------------\n";
  text += `Emitido eletronicamente por PontoExato v5.2\n`;
  text += `Data da Emissão: ${new Date().toLocaleString('pt-BR')}\n`;
  text += "================================================\n";

  return text;
}

/**
 * Baixa arquivo TXT do comprovante
 */
export function downloadReceiptText(record: PointRecord, company?: Company | null) {
  const text = getReceiptPlainText(record, company);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Comprovante_Ponto_${record.timestamp.getTime()}.txt`;
  a.click();
}

/**
 * Tenta compartilhar o comprovante usando a Web Share API (WhatsApp, E-mail, etc.) ou faz download
 */
export async function shareOrCopyReceipt(record: PointRecord, company?: Company | null): Promise<boolean> {
  const text = getReceiptPlainText(record, company);

  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Comprovante de Registro de Ponto',
        text: text,
      });
      return true;
    } catch (e) {
      // Usuário cancelou o compartilhamento nativo ou não suportado
    }
  }

  // Fallback para cópia para a área de transferência
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    downloadReceiptText(record, company);
    return false;
  }
}
