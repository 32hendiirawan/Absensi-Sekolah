
export enum Role {
  ADMIN = 'ADMIN',
  STUDENT = 'STUDENT'
}

export enum AttendanceStatus {
  HADIR = 'Hadir',
  SAKIT = 'Sakit',
  IZIN = 'Izin',
  ALPA = 'Alpa'
}

export interface User {
  id: string;
  username: string;
  password?: string;
  role: Role;
  name: string;
  class?: string;
  parentContact?: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  timestamp: string;
  status: AttendanceStatus;
  location?: {
    lat: number;
    lng: number;
    distance: number;
  };
  evidenceUrl?: string; // Base64 for simplicity in local demo
}

export interface SchoolSettings {
  name: string;
  targetLat: number;
  targetLng: number;
  radiusMeters: number;
  entryTime: string; // HH:mm
  holidays: string[]; // Array of YYYY-MM-DD
}

export interface AppNotification {
  id: string;
  studentId: string;
  studentName: string;
  type: 'Kehadiran' | 'Keterlambatan';
  contact: string;
  message: string;
  createdAt: string;
}

export interface AppState {
  users: User[];
  attendance: AttendanceRecord[];
  settings: SchoolSettings;
  currentUser: User | null;
  pendingNotifications: AppNotification[];
}
