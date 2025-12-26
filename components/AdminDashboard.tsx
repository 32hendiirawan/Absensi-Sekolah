
import React, { useState, useMemo } from 'react';
import { User, AttendanceRecord, SchoolSettings, Role, AttendanceStatus, AppNotification } from '../types';
import { ICONS } from '../constants';
import { getCurrentPosition } from '../services/geoService';
import { getWhatsAppUrl, buildLateMessage } from '../services/whatsappService';
import * as XLSX from 'xlsx';

interface AdminDashboardProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  attendance: AttendanceRecord[];
  settings: SchoolSettings;
  setSettings: React.Dispatch<React.SetStateAction<SchoolSettings>>;
  pendingNotifications: AppNotification[];
  setPendingNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
}

type SortConfig = {
  key: keyof User | 'none';
  direction: 'asc' | 'desc';
};

type ReportType = 'harian' | 'bulanan' | 'semester';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  users, 
  setUsers, 
  attendance, 
  settings, 
  setSettings,
  pendingNotifications,
  setPendingNotifications
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'reports' | 'settings' | 'whatsapp'>('reports');
  const [reportType, setReportType] = useState<ReportType>('harian');
  const [isLocating, setIsLocating] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'none', direction: 'asc' });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<Partial<User>>({ role: Role.STUDENT });

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedSemester, setSelectedSemester] = useState<'Ganjil' | 'Genap'>(new Date().getMonth() >= 6 ? 'Ganjil' : 'Genap');
  const [selectedClass, setSelectedClass] = useState<string>('Semua');

  const [newHoliday, setNewHoliday] = useState('');

  const monthsID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  // Fix: Added toggleSort function to handle user table sorting
  const toggleSort = (key: keyof User) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Fix: Added SortIndicator component to display sorting direction in table headers
  const SortIndicator = ({ column }: { column: keyof User }) => {
    if (sortConfig.key !== column) return null;
    return <span className="ml-1 text-indigo-600 font-bold">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  const students = useMemo(() => users.filter(u => u.role === Role.STUDENT), [users]);
  const classList = useMemo(() => {
    const classes = Array.from(new Set(students.map(s => s.class).filter(Boolean)));
    return ['Semua', ...classes];
  }, [students]);

  const getWorkingDaysCount = (year: number, monthOrSemester: number | 'Ganjil' | 'Genap'): number => {
    let days: Date[] = [];
    if (typeof monthOrSemester === 'number') {
      const totalDays = new Date(year, monthOrSemester + 1, 0).getDate();
      for (let i = 1; i <= totalDays; i++) days.push(new Date(year, monthOrSemester, i));
    } else {
      const months = monthOrSemester === 'Ganjil' ? [6, 7, 8, 9, 10, 11] : [0, 1, 2, 3, 4, 5];
      months.forEach(m => {
        const totalDays = new Date(year, m + 1, 0).getDate();
        for (let i = 1; i <= totalDays; i++) days.push(new Date(year, m, i));
      });
    }
    return days.filter(d => {
      if (d.getDay() === 0) return false;
      const dateStr = d.toISOString().split('T')[0];
      if (settings.holidays.includes(dateStr)) return false;
      if (d > new Date()) return false;
      return true;
    }).length;
  };

  const studentRecap = useMemo(() => {
    const workingDays = reportType === 'harian' ? 1 : 
      reportType === 'bulanan' ? getWorkingDaysCount(selectedYear, selectedMonth) : 
      getWorkingDaysCount(selectedYear, selectedSemester);

    return students
      .filter(s => selectedClass === 'Semua' || s.class === selectedClass)
      .map(student => {
        const studentRecs = attendance.filter(r => r.studentId === student.id && (
          reportType === 'harian' ? new Date(r.timestamp).toISOString().split('T')[0] === selectedDate :
          reportType === 'bulanan' ? new Date(r.timestamp).getMonth() === selectedMonth && new Date(r.timestamp).getFullYear() === selectedYear :
          reportType === 'semester' ? (selectedSemester === 'Ganjil' ? [6,7,8,9,10,11] : [0,1,2,3,4,5]).includes(new Date(r.timestamp).getMonth()) && new Date(r.timestamp).getFullYear() === selectedYear : true
        ));
        const hadir = studentRecs.filter(r => r.status === AttendanceStatus.HADIR).length;
        const sakit = studentRecs.filter(r => r.status === AttendanceStatus.SAKIT).length;
        const izin = studentRecs.filter(r => r.status === AttendanceStatus.IZIN).length;
        const alpa = Math.max(0, workingDays - (hadir + sakit + izin));
        return { ...student, hadir, sakit, izin, alpa };
      });
  }, [students, attendance, selectedClass, reportType, selectedYear, selectedMonth, selectedSemester, selectedDate, settings.holidays]);

  const processedStudents = useMemo(() => {
    let result = [...students].filter(student => 
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.class && student.class.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    if (sortConfig.key !== 'none') {
      result.sort((a, b) => {
        const aValue = (a[sortConfig.key as keyof User] || '').toString().toLowerCase();
        const bValue = (b[sortConfig.key as keyof User] || '').toString().toLowerCase();
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [students, searchTerm, sortConfig]);

  const handleFetchCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const pos = await getCurrentPosition();
      setSettings({ ...settings, targetLat: pos.coords.latitude, targetLng: pos.coords.longitude });
      alert('Koordinat berhasil diperbarui.');
    } catch (err: any) {
      alert(`Gagal: ${err.message}`);
    } finally {
      setIsLocating(false);
    }
  };

  const handleCheckLateStudents = () => {
    const now = new Date();
    const [entryHour, entryMinute] = settings.entryTime.split(':').map(Number);
    const entryTimeToday = new Date();
    entryTimeToday.setHours(entryHour, entryMinute, 0, 0);

    if (now < entryTimeToday) {
      alert(`Belum waktunya mengecek keterlambatan. Jam masuk: ${settings.entryTime}`);
      return;
    }

    const todayStr = now.toISOString().split('T')[0];
    const newLateNotifs: AppNotification[] = [];

    students.forEach(student => {
      const hasPresenceToday = attendance.some(r => 
        r.studentId === student.id && 
        new Date(r.timestamp).toISOString().split('T')[0] === todayStr
      );

      if (!hasPresenceToday && student.parentContact) {
        // Only add if not already in queue
        const exists = pendingNotifications.some(n => 
          n.studentId === student.id && n.type === 'Keterlambatan' && 
          new Date(n.createdAt).toISOString().split('T')[0] === todayStr
        );

        if (!exists) {
          newLateNotifs.push({
            id: Math.random().toString(36).substr(2, 9),
            studentId: student.id,
            studentName: student.name,
            type: 'Keterlambatan',
            contact: student.parentContact,
            message: buildLateMessage(student),
            createdAt: now.toISOString()
          });
        }
      }
    });

    if (newLateNotifs.length > 0) {
      setPendingNotifications(prev => [...newLateNotifs, ...prev]);
      alert(`${newLateNotifs.length} siswa terlambat terdeteksi dan masuk antrean WhatsApp.`);
    } else {
      alert('Tidak ada siswa baru yang terlambat hari ini.');
    }
  };

  const sendNotification = (notif: AppNotification) => {
    const url = getWhatsAppUrl(notif.contact, notif.message);
    window.open(url, '_blank');
    // Automatically remove after sending
    setPendingNotifications(prev => prev.filter(n => n.id !== notif.id));
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const data: any[][] = [];
    data.push(['Rekap Kehadiran']);
    data.push([`Sekolah: ${settings.name}`]);
    data.push([`Kelas: ${selectedClass}`]);
    data.push([`Bulan: ${monthsID[selectedMonth]} Tahun: ${selectedYear}`]);
    data.push([]);
    const headers1 = ['No.', 'Nama', 'Tanggal', ...Array(30).fill(''), 'Jumlah', '', '', ''];
    const headers2 = ['', '', ...Array.from({length: 31}, (_, i) => i + 1), 'Hadir', 'Sakit', 'Izin', 'Alpa'];
    data.push(headers1);
    data.push(headers2);
    const workingDays = getWorkingDaysCount(selectedYear, selectedMonth);
    const filteredStudents = students.filter(s => selectedClass === 'Semua' || s.class === selectedClass);
    filteredStudents.forEach((student, index) => {
      const row = [index + 1, student.name];
      const studentRecs = attendance.filter(r => r.studentId === student.id && new Date(r.timestamp).getMonth() === selectedMonth && new Date(r.timestamp).getFullYear() === selectedYear);
      let h = 0, sCount = 0, iCount = 0;
      const totalDays = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      for (let day = 1; day <= 31; day++) {
        if (day > totalDays) { row.push('-'); continue; }
        const d = new Date(selectedYear, selectedMonth, day);
        const record = studentRecs.find(r => new Date(r.timestamp).getDate() === day);
        if (record) {
          if (record.status === AttendanceStatus.HADIR) { row.push('H'); h++; }
          else if (record.status === AttendanceStatus.SAKIT) { row.push('S'); sCount++; }
          else if (record.status === AttendanceStatus.IZIN) { row.push('I'); iCount++; }
        } else {
          const dateStr = d.toISOString().split('T')[0];
          if (d > new Date() || d.getDay() === 0 || settings.holidays.includes(dateStr)) row.push('');
          else row.push('A');
        }
      }
      row.push(h, sCount, iCount, Math.max(0, workingDays - (h + sCount + iCount)));
      data.push(row);
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 36 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 36 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 36 } }, { s: { r: 3, c: 0 }, e: { r: 3, c: 36 } },
      { s: { r: 5, c: 0 }, e: { r: 6, c: 0 } }, { s: { r: 5, c: 1 }, e: { r: 6, c: 1 } },
      { s: { r: 5, c: 2 }, e: { r: 5, c: 32 } }, { s: { r: 5, c: 33 }, e: { r: 5, c: 36 } }
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap');
    XLSX.writeFile(wb, `Rekap_${selectedClass}.xlsx`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
        {[
          { id: 'reports', label: 'Rekapitulasi', icon: ICONS.Reports },
          { id: 'users', label: 'Siswa & Akun', icon: ICONS.Users },
          { id: 'whatsapp', label: 'WhatsApp', icon: ICONS.WhatsApp },
          { id: 'settings', label: 'Pengaturan', icon: ICONS.Settings }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === t.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.icon} {t.label}
            {t.id === 'whatsapp' && pendingNotifications.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {pendingNotifications.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'whatsapp' && (
        <div className="space-y-6 animate-in slide-in-from-right duration-500">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Antrean Pesan WhatsApp</h3>
              <p className="text-sm text-slate-500">Kirim laporan manual ke orang tua siswa.</p>
            </div>
            <button 
              onClick={handleCheckLateStudents}
              className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2"
            >
              {ICONS.Clock} Cek Siswa Alpa/Terlambat
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingNotifications.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                <div className="text-slate-300 flex justify-center mb-4 scale-150">{ICONS.WhatsApp}</div>
                <p className="text-slate-500 font-medium">Tidak ada antrean pesan saat ini.</p>
              </div>
            ) : (
              pendingNotifications.map(notif => (
                <div key={notif.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                        notif.type === 'Kehadiran' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {notif.type}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(notif.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 mb-1">{notif.studentName}</h4>
                    <p className="text-xs text-slate-600 line-clamp-4 whitespace-pre-wrap italic bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {notif.message}
                    </p>
                  </div>
                  <div className="mt-5 flex gap-2">
                    <button 
                      onClick={() => setPendingNotifications(prev => prev.filter(n => n.id !== notif.id))}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                      {ICONS.Delete}
                    </button>
                    <button 
                      onClick={() => sendNotification(notif)}
                      className="flex-1 py-2 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-green-100"
                    >
                      {ICONS.WhatsApp} Kirim Pesan
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                {(['harian', 'bulanan', 'semester'] as ReportType[]).map((type) => (
                  <button key={type} onClick={() => setReportType(type)} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${reportType === type ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    {type}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Kelas:</label>
                  <select className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                    {classList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {reportType === 'harian' && <input type="date" className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />}
                {reportType === 'bulanan' && <select className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>{monthsID.map((m, i) => <option key={i} value={i}>{m}</option>)}</select>}
                {(reportType === 'bulanan' || reportType === 'semester') && <select className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>{[2024, 2025].map(y => <option key={y} value={y}>{y}</option>)}</select>}
                <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-100">{ICONS.Reports} Ekspor Excel</button>
              </div>
            </div>
            {(reportType === 'bulanan' || reportType === 'semester') && (
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-lg">
                <div className="text-indigo-600">{ICONS.Calendar}</div>
                <span>Total Hari Efektif: <b>{reportType === 'bulanan' ? getWorkingDaysCount(selectedYear, selectedMonth) : getWorkingDaysCount(selectedYear, selectedSemester)} hari</b></span>
              </div>
            )}
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50"><h3 className="text-lg font-bold text-slate-900">Rekap {reportType} - {selectedClass}</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase tracking-widest text-[10px]">Siswa</th>
                    <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase tracking-widest text-[10px]">Kelas</th>
                    <th className="px-6 py-4 text-center font-bold text-green-600 uppercase tracking-widest text-[10px]">Hadir</th>
                    <th className="px-6 py-4 text-center font-bold text-red-600 uppercase tracking-widest text-[10px]">Sakit</th>
                    <th className="px-6 py-4 text-center font-bold text-orange-600 uppercase tracking-widest text-[10px]">Izin</th>
                    <th className="px-6 py-4 text-center font-bold text-slate-400 uppercase tracking-widest text-[10px]">Alpa</th>
                    <th className="px-6 py-4 text-right font-bold text-slate-500 uppercase tracking-widest text-[10px]">Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentRecap.map(s => {
                    const workingDays = reportType === 'bulanan' ? getWorkingDaysCount(selectedYear, selectedMonth) : getWorkingDaysCount(selectedYear, selectedSemester);
                    const pct = workingDays > 0 ? Math.round((s.hadir / workingDays) * 100) : 0;
                    return (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-900">{s.name}</td>
                        <td className="px-6 py-4 text-slate-500">{s.class}</td>
                        <td className="px-6 py-4 text-center font-bold">{s.hadir}</td>
                        <td className="px-6 py-4 text-center font-bold">{s.sakit}</td>
                        <td className="px-6 py-4 text-center font-bold">{s.izin}</td>
                        <td className="px-6 py-4 text-center font-bold text-red-500">{s.alpa}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs font-bold text-indigo-600">{pct}%</span>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-600" style={{ width: `${pct}%` }}></div></div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-6 rounded-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Tambah Siswa Baru</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <input placeholder="Nama Lengkap" className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" value={newUser.name || ''} onChange={e => setNewUser({...newUser, name: e.target.value})} />
              <input placeholder="Username" className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" value={newUser.username || ''} onChange={e => setNewUser({...newUser, username: e.target.value})} />
              <input placeholder="Kelas" className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" value={newUser.class || ''} onChange={e => setNewUser({...newUser, class: e.target.value})} />
              <input placeholder="No WA Ortu" className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" value={newUser.parentContact || ''} onChange={e => setNewUser({...newUser, parentContact: e.target.value})} />
              <button onClick={() => {
                if (!newUser.username || !newUser.name) return alert('Lengkapi data!');
                setUsers([...users, { id: Math.random().toString(36).substr(2, 9), username: newUser.username!, name: newUser.name!, role: Role.STUDENT, class: newUser.class, parentContact: newUser.parentContact, password: '123' }]);
                setNewUser({ role: Role.STUDENT });
              }} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors">
                {ICONS.Plus} Simpan Siswa
              </button>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center"><h3 className="text-lg font-bold text-slate-900">Daftar Akun Siswa</h3><input type="text" placeholder="Cari nama..." className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase text-[10px] cursor-pointer" onClick={() => toggleSort('name')}>Info Siswa <SortIndicator column="name" /></th>
                    <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase text-[10px]">Username</th>
                    <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase text-[10px]">Kontak Ortu</th>
                    <th className="px-6 py-4 text-right font-bold text-slate-500 uppercase text-[10px]">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {processedStudents.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4"><b>{u.name}</b><p className="text-[10px] uppercase">{u.class}</p></td>
                      <td className="px-6 py-4 font-mono">{u.username}</td>
                      <td className="px-6 py-4">{u.parentContact || '-'}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => setEditingUser(u)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg">{ICONS.Edit}</button>
                        <button onClick={() => setUsers(users.filter(x => x.id !== u.id))} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">{ICONS.Delete}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in zoom-in-95 duration-500">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-8">Pengaturan Sekolah</h3>
            <div className="space-y-6">
              <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" value={settings.name} onChange={e => setSettings({...settings, name: e.target.value})} placeholder="Nama Sekolah" />
              <div className="grid grid-cols-2 gap-4">
                <input type="time" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" value={settings.entryTime} onChange={e => setSettings({...settings, entryTime: e.target.value})} />
                <input type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" value={settings.radiusMeters} onChange={e => setSettings({...settings, radiusMeters: parseInt(e.target.value)})} placeholder="Radius (m)" />
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border">
                <div className="flex justify-between mb-4"><b>Koordinat</b> <button onClick={handleFetchCurrentLocation} disabled={isLocating} className="text-xs text-indigo-600 font-bold">Set Lokasi Saya</button></div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" step="any" className="w-full p-2 bg-white border rounded" value={settings.targetLat} onChange={e => setSettings({...settings, targetLat: parseFloat(e.target.value)})} />
                  <input type="number" step="any" className="w-full p-2 bg-white border rounded" value={settings.targetLng} onChange={e => setSettings({...settings, targetLng: parseFloat(e.target.value)})} />
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xl font-bold mb-4">Hari Libur</h3>
            <div className="flex gap-2 mb-4">
              <input type="date" className="flex-1 p-2 bg-slate-50 border rounded-xl" value={newHoliday} onChange={e => setNewHoliday(e.target.value)} />
              <button onClick={() => { if(!newHoliday) return; setSettings({...settings, holidays: [...settings.holidays, newHoliday].sort()}); setNewHoliday(''); }} className="bg-indigo-600 text-white p-2 rounded-xl font-bold">Tambah</button>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {settings.holidays.map(h => (
                <div key={h} className="flex justify-between p-2 bg-slate-50 rounded-lg"><span>{h}</span> <button onClick={() => setSettings({...settings, holidays: settings.holidays.filter(x => x !== h)})} className="text-red-600">X</button></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-8 space-y-4">
            <h3 className="text-xl font-bold">Edit Siswa</h3>
            <input className="w-full p-2 bg-slate-50 border rounded" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} />
            <input className="w-full p-2 bg-slate-50 border rounded" value={editingUser.class || ''} onChange={e => setEditingUser({...editingUser, class: e.target.value})} />
            <div className="flex gap-2"><button onClick={() => setEditingUser(null)} className="flex-1 p-2 bg-slate-100 rounded">Batal</button> <button onClick={() => { setUsers(users.map(u => u.id === editingUser.id ? editingUser : u)); setEditingUser(null); }} className="flex-1 p-2 bg-indigo-600 text-white rounded font-bold">Simpan</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
