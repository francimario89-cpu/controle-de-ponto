
export interface Company {
  id: string;
  name: string;
  cnpj: string;
  address: string;
  accessCode: string;
  authorizedIP?: string;
  adminEmail: string;
  adminPassword?: string;
  // Novos campos de Geofencing e Escala
  geofence?: {
    enabled: boolean;
    lat: number;
    lng: number;
    radius: number; // em metros
  };
  workShift?: {
    start: string; // "08:00"
    end: string;   // "18:00"
    breakMinutes: number;
  };
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  matricula: string;
  password?: string;
  photo: string;
  hasFacialRecord: boolean;
  status: 'active' | 'inactive';
  companyCode: string;
}

export interface User {
  name: string;
  email: string;
  photo?: string;
  companyCode: string;
  companyName?: string;
  role: 'admin' | 'employee' | 'totem';
  matricula?: string;
  hasFacialRecord?: boolean;
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
  digitalSignature: string; // Hash de segurança
  type: 'entrada' | 'saida';
}

export interface AttendanceRequest {
  id: string;
  companyCode: string;
  matricula: string;
  userName: string;
  type: 'ajuste' | 'atestado' | 'abono';
  status: 'pending' | 'approved' | 'rejected';
  date: string;
  reason: string;
  attachment?: string; // Base64 da foto do atestado
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: Date;
}

export interface NotebookSummary {
  overview: string;
  topics: string[];
  faqs: Array<{ q: string; a: string; }>;
}
