
import { GoogleGenAI, Type } from "@google/genai";
import { AttendanceRecord } from "../types";

export const analyzeAttendance = async (records: AttendanceRecord[]) => {
  // Fix: Initialized GoogleGenAI with named parameter apiKey from process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Berikut adalah data kehadiran siswa:
    ${JSON.stringify(records.map(r => ({ name: r.studentName, status: r.status, date: r.timestamp })))}
    
    Analisis data tersebut dan berikan ringkasan dalam Bahasa Indonesia:
    1. Berapa persentase kehadiran hari ini?
    2. Siapa siswa yang paling sering sakit/izin?
    3. Rekomendasi apa yang bisa diberikan untuk meningkatkan disiplin?
    
    Format jawaban dalam paragraf yang rapi dan profesional.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return "Maaf, gagal menganalisis data saat ini.";
  }
};
