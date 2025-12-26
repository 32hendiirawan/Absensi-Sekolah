
import { AttendanceRecord, User } from '../types';

/**
 * Generates a WhatsApp deep link
 */
export const getWhatsAppUrl = (phone: string, text: string) => {
  const cleanPhone = phone.replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
};

/**
 * Simulates sending a WhatsApp message.
 */
export const sendWhatsAppNotification = async (
  parentContact: string, 
  message: string
) => {
  console.log(`[WhatsApp Simulation] Sending to ${parentContact}: ${message}`);
  return new Promise((resolve) => setTimeout(resolve, 800));
};

export const buildAttendanceMessage = (student: User, record: AttendanceRecord): string => {
  const time = new Date(record.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const date = new Date(record.timestamp).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  
  let msg = `*LAPORAN KEHADIRAN SISWA*\n\n`;
  msg += `Nama: ${student.name}\n`;
  msg += `Kelas: ${student.class}\n`;
  msg += `Tanggal: ${date}\n`;
  msg += `Waktu: ${time}\n`;
  msg += `Status: *${record.status.toUpperCase()}*\n\n`;
  
  if (record.status === 'Hadir') {
    msg += `Ananda telah tiba di sekolah tepat waktu. Terima kasih.`;
  } else if (record.status === 'Sakit' || record.status === 'Izin') {
    msg += `Kami telah menerima laporan ${record.status} ananda beserta bukti lampiran. Semoga lekas pulih/urusan lancar.`;
  }
  
  return msg;
};

export const buildLateMessage = (student: User): string => {
  return `*PERINGATAN KEHADIRAN*\n\nInformasi: Ananda *${student.name}* (${student.class}) belum tercatat melakukan presensi hingga jam masuk hari ini. Mohon segera hubungi pihak sekolah atau ingatkan ananda.`;
};
