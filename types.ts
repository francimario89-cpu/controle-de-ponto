
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
}

export interface User {
  name: string;
  email: string;
  photo?: string;
  companyCode: string;
  companyName?: string;
  role: 'admin' | 'employee' | 'totem';
  matricula?: string;
  cpf?: string;
  phone?: string;
  admissionDate?: string;
  department?: string;
  hasFacialRecord?: boolean;
  roleFunction?: string;
  workShift?: string;
}

export interface PointRecord {
  id: string;
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
}

export interface AttendanceRequest {
  id: string;
  companyCode: string;
  matricula: string;
  userName: string;
  type: 'ajuste' | 'atestado' | 'abono' | 'inclusão';
  status: 'pending' | 'approved' | 'rejected';
  date: string;
  reason: string;
  createdAt: Date;
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
  date: string;
  description: string;
  type: 'feriado' | 'evento';
}
