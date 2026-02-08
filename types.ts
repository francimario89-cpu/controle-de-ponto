
export interface Company {
  id: string;
  name: string;
  socialReason?: string;
  cnpj: string;
  phone?: string;
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
  schedules?: WorkSchedule[];
  config?: { 
    overtimePercentage: number;
    nightShiftPercentage: number;
    weeklyHours: number;
    toleranceMinutes: number;
  };
}

export interface WorkSchedule {
  id: string;
  name: string;
  weeklyHours: number;
  toleranceMinutes: number;
  overtimePercentage: number;
  nightShiftPercentage: number;
  description?: string;
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
  scheduleId?: string;
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
  scheduleId?: string;
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
  mood?: string;
  isAdjustment?: boolean; // Novo campo para destaque visual
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
  managerFeedback?: string;
  attachment?: string;
  attachmentName?: string; // Nome do arquivo anexo
  createdAt: Date;
  times?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export interface Feedback {
  id: string;
  from: string;
  to: string;
  rating: number;
  comment: string;
  date: Date;
}

export interface BenefitCategory {
  id: string;
  name: string;
  balance: number;
  icon: string;
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
