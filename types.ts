
export interface Company {
  id: string;
  name: string;
  cnpj: string;
  address: string;
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
  holidays?: Holiday[];
}

export interface Holiday {
  id: string;
  date: string;
  description: string;
  type: 'feriado' | 'parada';
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
  roleFunction?: string; 
  workShift?: string;
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
  attachment?: string;
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
  faqs: {
    q: string;
    a: string;
  }[];
}
