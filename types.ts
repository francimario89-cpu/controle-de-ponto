
// Definindo interfaces globais para o sistema PontoExato
export interface Company {
  id: string;
  name: string;
  socialReason?: string;
  cnpj: string;
  phone?: string;
  address: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip?: string;
  accessCode: string;
  authorizedIP?: string;
  adminEmail: string;
  adminPassword?: string;
  logoUrl?: string;
  themeColor?: string;
  geofence?: {
    enabled: boolean;
    lat: number;
    lng: number;
    radius: number;
  };
  // Adicionando feriados ao perfil da empresa
  holidays?: Holiday[];
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  matricula: string;
  cpf?: string;
  phone?: string;
  birthDate?: string;
  admissionDate?: string;
  department?: string;
  password?: string;
  photo: string;
  hasFacialRecord: boolean;
  status: 'active' | 'inactive';
  companyCode: string;
  roleFunction?: string; 
  workShift?: string;
  weeklyHours?: number;
  ctpsNumber?: string;
  ctpsSeries?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip?: string;
  isExemptPointControl?: boolean; // Dispensado de controle de jornada (Art. 62, II CLT - Gerência / Confiança)
  exemptReason?: string;
  contractType?: string; // e.g. "Contrato de Trabalho Temporário (Lei 6.019/74)"
  contractEndDate?: string;
  isTemporary?: boolean;
}

export interface User {
  name: string;
  email: string;
  photo?: string;
  companyCode: string;
  companyName?: string;
  role: 'admin' | 'employee' | 'totem' | 'master';
  matricula?: string;
  cpf?: string;
  phone?: string;
  admissionDate?: string;
  department?: string;
  hasFacialRecord?: boolean;
  roleFunction?: string;
  workShift?: string;
  isExemptPointControl?: boolean;
  exemptReason?: string;
  contractType?: string;
  contractEndDate?: string;
  isTemporary?: boolean;
}

export interface PointRecord {
  id: string;
  uniqueId?: string; // ID único anti-duplicidade (ex: PONTO-20260929-0802-8F72A)
  userName: string;
  timestamp: Date;
  address: string;
  latitude: number;
  longitude: number;
  photo: string;
  status: 'synchronized' | 'pending';
  matricula?: string;
  digitalSignature: string;
  type: 'entrada' | 'saida' | 'inicio_intervalo' | 'fim_intervalo';
  mood?: string;
  isAdjustment?: boolean;
  isOffline?: boolean;
  offlineSavedAt?: string;
  syncedAt?: string | Date;
  companyCode?: string;
}

export interface DeviceSyncStatus {
  id?: string;
  userName: string;
  matricula: string;
  companyCode: string;
  lastSyncAt: string;
  pendingCount: number;
  deviceInfo?: string;
  isOnline: boolean;
  status: 'online' | 'pending' | 'error';
}

export interface AttendanceRequest {
  id: string;
  companyCode: string;
  matricula: string;
  userName: string;
  type: 'ajuste' | 'atestado' | 'abono' | 'inclusão' | 'licenca_maternidade' | 'afastamento_saude' | 'folga_compensatoria' | 'folga_abonada';
  status: 'pending' | 'approved' | 'rejected';
  date: string; // Data início
  endDate?: string; // Data fim (para atestados de múltiplos dias, licença maternidade ou folgas)
  daysCount?: number; // Total de dias de afastamento
  cid?: string; // Código CID (opcional para atestado)
  hoursDeducted?: number; // Horas deduzidas do banco de horas no caso de folga compensatória
  reason: string;
  createdAt: Date;
  attachment?: string;
  attachmentName?: string;
  suggestedTimes?: string[];
  // Campos detalhados de Ajuste do Espelho de Ponto (Portaria 671 MTP)
  adjustType?: 'entrada' | 'saida_intervalo' | 'retorno_intervalo' | 'saida' | 'inclusao' | 'correcao';
  requestedTime?: string;
  originalTime?: string;
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: Date | string;
  auditLog?: string;
}

export interface MedicalLeave {
  id: string;
  companyCode: string;
  matricula: string;
  userName: string;
  type: 'atestado' | 'licenca_maternidade' | 'afastamento_saude' | 'afastamento_inss';
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  daysCount: number;
  reason: string;
  cid?: string;
  attachment?: string;
  attachmentName?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
}

// Interface para mensagens do Chat do Assistente
export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

// Interface para Notas de Insights de RH
export interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: Date;
}

// Interface para Resumo Gerado por IA
export interface NotebookSummary {
  overview: string;
  topics: string[];
  faqs: { q: string; a: string }[];
}

// Interface para Feriados e Eventos
export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  type: 'feriado' | 'ponto_facultativo' | 'evento' | 'ignorado';
  isNational?: boolean;
  isExcluded?: boolean;
  companyCode?: string;
  coverage?: 'geral' | 'setorial';
}

// Interface para Gestão de Vendas e Comissões
export interface Sale {
  id: string;
  sellerId: string;
  sellerName: string;
  companyCode: string;
  date: Date;
  amount: number;
  ticketValue: 150 | 200 | 300;
  commissionValue: number;
  commissionStatus: 'pending' | 'paid';
  customerName?: string;
  createdAt: Date;
}
