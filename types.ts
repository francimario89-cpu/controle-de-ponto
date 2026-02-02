
export interface User {
  name: string;
  email: string;
  photo?: string;
  companyCode: string;
  role: string;
}

export interface PointRecord {
  id: string;
  timestamp: Date;
  address: string;
  latitude: number;
  longitude: number;
  photo: string;
  status: 'synchronized' | 'pending';
}

export interface AttendanceRequest {
  id: string;
  type: 'inclusao' | 'abono';
  status: 'pending' | 'approved' | 'rejected';
  date: string;
  times: string[];
  reason: string;
}

export interface DaySchedule {
  day: string;
  date: string;
  records: string[];
  totalHours: string;
}

// Added missing interfaces for Gemini-powered features
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
