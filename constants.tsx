
import React from 'react';
import { 
  UserCheck, 
  Users, 
  Settings, 
  FileText, 
  LogOut, 
  MapPin, 
  Clock, 
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Edit2,
  ChevronRight,
  Home,
  Calendar
} from 'lucide-react';

export const ICONS = {
  Hadir: <UserCheck className="w-5 h-5" />,
  Users: <Users className="w-5 h-5" />,
  Settings: <Settings className="w-5 h-5" />,
  Reports: <FileText className="w-5 h-5" />,
  Logout: <LogOut className="w-5 h-5" />,
  Location: <MapPin className="w-5 h-5" />,
  Clock: <Clock className="w-5 h-5" />,
  WhatsApp: <MessageSquare className="w-5 h-5" />,
  Warning: <AlertTriangle className="w-5 h-5" />,
  Success: <CheckCircle className="w-5 h-5" />,
  Error: <XCircle className="w-5 h-5" />,
  Plus: <Plus className="w-5 h-5" />,
  Delete: <Trash2 className="w-5 h-5" />,
  Edit: <Edit2 className="w-5 h-5" />,
  ArrowRight: <ChevronRight className="w-5 h-5" />,
  Home: <Home className="w-5 h-5" />,
  Calendar: <Calendar className="w-5 h-5" />
};

export const DEFAULT_SCHOOL_SETTINGS = {
  name: 'SMA Negeri Cerdas Utama',
  targetLat: -6.200000,
  targetLng: 106.816666,
  radiusMeters: 100,
  entryTime: '07:30',
  holidays: []
};