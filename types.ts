
export interface Company {
  id: string;
  name: string;
  cnpj: string;
  address: string;
  accessCode: string;
  authorizedIP?: string;
  adminEmail: string;
  adminPassword?: string;
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
}

export interface AttendanceRequest {
  id: string;
  type: 'inclusao' | 'abono';
  status: 'pending' | 'approved' | 'rejected';
  date: string;
  times: string[];
  reason: string;
}

// Added missing interface for ChatArea component
export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

// Added missing interface for NotesArea component
export interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: Date;
}

// Added missing interface for GuideArea component, matching the responseSchema in geminiService
export interface NotebookSummary {
  overview: string;
  topics: string[];
  faqs: Array<{
    q: string;
    a: string;
  }>;
}
