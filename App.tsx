
import React, { useState, useEffect } from 'react';
import { Role, User, AttendanceRecord, SchoolSettings, AppNotification } from './types';
import { DEFAULT_SCHOOL_SETTINGS, ICONS } from './constants';
import Login from './components/Login';
import StudentDashboard from './components/StudentDashboard';
import AdminDashboard from './components/AdminDashboard';
import { buildAttendanceMessage } from './services/whatsappService';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [settings, setSettings] = useState<SchoolSettings>(DEFAULT_SCHOOL_SETTINGS);
  const [pendingNotifications, setPendingNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load Initial Data
  useEffect(() => {
    const savedUsers = localStorage.getItem('absensi_users');
    const savedAttendance = localStorage.getItem('absensi_records');
    const savedSettings = localStorage.getItem('absensi_settings');
    const savedNotifications = localStorage.getItem('absensi_notifications');

    if (savedUsers) setUsers(JSON.parse(savedUsers));
    else {
      const initialUsers = [
        { id: '1', username: 'admin', password: '123', role: Role.ADMIN, name: 'Administrator' },
        { id: '2', username: 'siswa', password: '123', role: Role.STUDENT, name: 'Budi Santoso', class: '12-IPA-1', parentContact: '628123456789' }
      ];
      setUsers(initialUsers);
      localStorage.setItem('absensi_users', JSON.stringify(initialUsers));
    }

    if (savedAttendance) setAttendance(JSON.parse(savedAttendance));
    if (savedSettings) setSettings(JSON.parse(savedSettings));
    if (savedNotifications) setPendingNotifications(JSON.parse(savedNotifications));
    
    setIsLoading(false);
  }, []);

  // Persist State Changes
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('absensi_users', JSON.stringify(users));
      localStorage.setItem('absensi_records', JSON.stringify(attendance));
      localStorage.setItem('absensi_settings', JSON.stringify(settings));
      localStorage.setItem('absensi_notifications', JSON.stringify(pendingNotifications));
    }
  }, [users, attendance, settings, pendingNotifications, isLoading]);

  const handleLogin = (username: string, pass: string) => {
    const user = users.find(u => u.username === username && u.password === pass);
    if (user) setCurrentUser(user);
    else alert('Username atau password salah!');
  };

  const handleLogout = () => setCurrentUser(null);

  const submitAttendance = async (record: Omit<AttendanceRecord, 'id' | 'studentId' | 'studentName' | 'class'>) => {
    if (!currentUser) return;
    
    const newRecord: AttendanceRecord = {
      ...record,
      id: Math.random().toString(36).substr(2, 9),
      studentId: currentUser.id,
      studentName: currentUser.name,
      class: currentUser.class || 'N/A'
    };

    setAttendance(prev => [newRecord, ...prev]);

    // Automatically queue WhatsApp Notification for admin to send manually
    if (currentUser.parentContact) {
      const message = buildAttendanceMessage(currentUser, newRecord);
      const newNotif: AppNotification = {
        id: Math.random().toString(36).substr(2, 9),
        studentId: currentUser.id,
        studentName: currentUser.name,
        type: 'Kehadiran',
        contact: currentUser.parentContact,
        message: message,
        createdAt: new Date().toISOString()
      };
      setPendingNotifications(prev => [newNotif, ...prev]);
    }

    alert(`Presensi ${newRecord.status} berhasil disimpan! Laporan telah masuk antrean WhatsApp Admin.`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!currentUser) return <Login onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <div className="text-white">{ICONS.Hadir}</div>
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 leading-tight">PresensiKu</h1>
                <p className="text-xs text-slate-500">{settings.name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-slate-900">{currentUser.name}</p>
                <p className="text-xs text-slate-500 uppercase tracking-wider">{currentUser.role}</p>
              </div>
              <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all">
                {ICONS.Logout}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        {currentUser.role === Role.ADMIN ? (
          <AdminDashboard 
            users={users} 
            setUsers={setUsers}
            attendance={attendance}
            settings={settings}
            setSettings={setSettings}
            pendingNotifications={pendingNotifications}
            setPendingNotifications={setPendingNotifications}
          />
        ) : (
          <StudentDashboard 
            currentUser={currentUser} 
            attendance={attendance}
            settings={settings}
            onSubmitAttendance={submitAttendance}
          />
        )}
      </main>
      
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <p className="text-center text-slate-400 text-sm">
          &copy; 2024 Sistem Kehadiran Siswa Cerdas • Built with Gemini & React
        </p>
      </footer>
    </div>
  );
};

export default App;
