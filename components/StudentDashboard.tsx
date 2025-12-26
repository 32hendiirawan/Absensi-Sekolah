
import React, { useState, useEffect } from 'react';
import { User, AttendanceRecord, AttendanceStatus, SchoolSettings } from '../types';
import { ICONS } from '../constants';
import { calculateDistance, getCurrentPosition } from '../services/geoService';

interface StudentDashboardProps {
  currentUser: User;
  attendance: AttendanceRecord[];
  settings: SchoolSettings;
  onSubmitAttendance: (record: Omit<AttendanceRecord, 'id' | 'studentId' | 'studentName' | 'class'>) => Promise<void>;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ 
  currentUser, 
  attendance, 
  settings,
  onSubmitAttendance 
}) => {
  const [status, setStatus] = useState<AttendanceStatus>(AttendanceStatus.HADIR);
  const [evidence, setEvidence] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentDist, setCurrentDist] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const myHistory = attendance.filter(a => a.studentId === currentUser.id);
  const hasAlreadyAbsenToday = myHistory.some(a => 
    new Date(a.timestamp).toDateString() === new Date().toDateString()
  );

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEvidence(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      let locationData = undefined;

      if (status === AttendanceStatus.HADIR) {
        // GPS Check
        const pos = await getCurrentPosition();
        const dist = calculateDistance(
          pos.coords.latitude, 
          pos.coords.longitude, 
          settings.targetLat, 
          settings.targetLng
        );
        setCurrentDist(dist);

        if (dist > settings.radiusMeters) {
          alert(`Presensi gagal! Anda berada ${Math.round(dist)}m dari sekolah. Maksimal radius adalah ${settings.radiusMeters}m.`);
          setIsSubmitting(false);
          return;
        }

        locationData = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          distance: dist
        };
      } else {
        // Check evidence for SAKIT/IZIN
        if (!evidence) {
          alert('Bukti foto/dokumen wajib diunggah untuk status Sakit atau Izin.');
          setIsSubmitting(false);
          return;
        }
      }

      await onSubmitAttendance({
        timestamp: new Date().toISOString(),
        status,
        location: locationData,
        evidenceUrl: evidence || undefined
      });
      
      setEvidence(null);
    } catch (err: any) {
      alert(`Terjadi kesalahan: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left: Attendance Form */}
      <div className="lg:col-span-1">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-900">Presensi Hari Ini</h3>
            <div className="flex flex-col items-end">
              <span className="text-lg font-bold text-indigo-600">
                {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-xs text-slate-500">
                {currentTime.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            </div>
          </div>

          {hasAlreadyAbsenToday ? (
            <div className="bg-green-50 border border-green-200 p-6 rounded-xl text-center">
              <div className="text-green-600 flex justify-center mb-3">
                <div className="scale-150">{ICONS.Success}</div>
              </div>
              <h4 className="font-bold text-green-900 mb-1">Sudah Absen!</h4>
              <p className="text-sm text-green-700">Terima kasih, Anda sudah melakukan presensi hari ini.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">Pilih Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {[AttendanceStatus.HADIR, AttendanceStatus.SAKIT, AttendanceStatus.IZIN].map((s) => (
                    <button
                      key={s}
                      onClick={() => { setStatus(s); setEvidence(null); }}
                      className={`py-3 rounded-xl text-sm font-semibold transition-all border-2 ${
                        status === s 
                          ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm' 
                          : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {status === AttendanceStatus.HADIR ? (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <div className="flex items-start gap-3">
                    <div className="text-blue-600 mt-0.5">{ICONS.Location}</div>
                    <div>
                      <p className="text-sm font-semibold text-blue-900">Validasi GPS Aktif</p>
                      <p className="text-xs text-blue-700 leading-relaxed mt-1">
                        Pastikan Anda berada dalam radius {settings.radiusMeters}m dari lokasi sekolah untuk presensi "Hadir".
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                    <div className="flex items-start gap-3">
                      <div className="text-orange-600 mt-0.5">{ICONS.Warning}</div>
                      <div>
                        <p className="text-sm font-semibold text-orange-900">Wajib Unggah Bukti</p>
                        <p className="text-xs text-orange-700 mt-1">
                          Unggah surat keterangan dokter atau surat izin orang tua.
                        </p>
                      </div>
                    </div>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  {evidence && (
                    <div className="relative group">
                      <img src={evidence} alt="Bukti" className="w-full h-32 object-cover rounded-lg border border-slate-200" />
                      <button 
                        onClick={() => setEvidence(null)}
                        className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {ICONS.Delete}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <>
                    {ICONS.Hadir}
                    <span>Kirim Presensi Sekarang</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right: History & Stats */}
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Hadir', val: myHistory.filter(a => a.status === 'Hadir').length, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Total Sakit', val: myHistory.filter(a => a.status === 'Sakit').length, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Total Izin', val: myHistory.filter(a => a.status === 'Izin').length, color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Total Hari', val: myHistory.length, color: 'text-indigo-600', bg: 'bg-indigo-50' }
          ].map((stat, i) => (
            <div key={i} className={`p-4 rounded-2xl border border-slate-100 ${stat.bg}`}>
              <p className="text-xs font-semibold text-slate-500 uppercase">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.val}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Riwayat Presensi Saya</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tanggal</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Waktu</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Info</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myHistory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-400">Belum ada data riwayat</td>
                  </tr>
                ) : (
                  myHistory.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-900 font-medium">
                        {new Date(h.timestamp).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(h.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          h.status === 'Hadir' ? 'bg-green-100 text-green-700' :
                          h.status === 'Sakit' ? 'bg-red-100 text-red-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {h.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 italic">
                        {h.status === 'Hadir' 
                          ? `${Math.round(h.location?.distance || 0)}m dari sekolah` 
                          : h.evidenceUrl ? 'Ada Bukti Dokumen' : 'N/A'
                        }
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
