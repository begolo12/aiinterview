
import { GoogleGenAI, Type } from "@google/genai";
import { Candidate, EvaluationResult, Position, QuestionTemplate, ScoreCriteria } from "../types";

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key belum dikonfigurasi.");
  return new GoogleGenAI({ apiKey });
};

const aggressiveJsonRepair = (str: string): string => {
  if (!str) return "{}";
  let fixed = str.replace(/```json\n?|```/g, '').trim();
  const firstOpen = fixed.indexOf('{');
  const lastClose = fixed.lastIndexOf('}');
  return firstOpen !== -1 && lastClose !== -1 ? fixed.substring(firstOpen, lastClose + 1) : fixed;
};

export async function parseCV(fileData: string, mimeType: string): Promise<Partial<Candidate>> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: {
        parts: [
          {
            inlineData: {
              data: fileData,
              mimeType: mimeType
            }
          },
          {
            text: "Ekstrak informasi dari CV ini ke dalam format JSON. WAJIB MENGGUNAKAN BAHASA INDONESIA untuk ringkasan dan deskripsi. Jika informasi tidak ditemukan, biarkan string kosong. Pastikan nomor telepon dan email diekstrak dengan akurat."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Nama lengkap kandidat" },
            email: { type: Type.STRING, description: "Alamat email" },
            phone: { type: Type.STRING, description: "Nomor telepon/WA" },
            lastPosition: { type: Type.STRING, description: "Jabatan terakhir (dalam Bahasa Indonesia)" },
            skills: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Daftar keahlian" 
            },
            experience: { type: Type.STRING, description: "Ringkasan pengalaman kerja dalam Bahasa Indonesia" },
            education: { type: Type.STRING, description: "Pendidikan terakhir dalam Bahasa Indonesia" }
          }
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) return {};
    
    return JSON.parse(aggressiveJsonRepair(textOutput));
  } catch (e) {
    console.error("Gagal melakukan parsing CV:", e);
    return {};
  }
}

export async function evaluateInterview(
  candidate: Candidate,
  transcript: string,
  position: Position,
  manualScores: Record<string, number>,
  questions: QuestionTemplate[] = [] 
): Promise<EvaluationResult> {
  const ai = getAI();
  const safeTranscript = transcript.substring(0, 15000);
  const questionsList = questions.map(q => `ID:${q.id} | Pertanyaan:"${q.question}" | Kunci Jawaban:"${q.idealAnswer}"`).join('\n');

  const prompt = `
    Role: Senior HR Analyst Profesional di Indonesia.
    Tugas: Evaluasi KANDIDAT berdasarkan transkrip wawancara.
    
    PERATURAN UTAMA:
    1. SEMUA HASIL TEKS (summary, strengths, weaknesses, reasoning) WAJIB MENGGUNAKAN BAHASA INDONESIA yang formal dan profesional.
    2. Bedakan pembicara: HR bertanya (sesuai daftar pertanyaan), Kandidat menjawab.
    3. Abaikan ucapan HR dalam penilaian.
    4. Evaluasi jawaban Kandidat terhadap "Kunci Jawaban" yang disediakan.
    5. Maklumi gangguan suara (stuttering, fillers) dari hasil speech-to-text.
    
    Daftar Pertanyaan & Kunci:
    ${questionsList}

    Transkrip Wawancara:
    ${safeTranscript}
    
    Skala Penilaian (0-100):
    - 0-40: Tidak relevan / Tidak menjawab.
    - 41-70: Jawaban dasar / Normatif / Kurang detail.
    - 71-100: Jawaban sangat baik / Detail / Profesional.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview", 
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          questionScores: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT,
              properties: { 
                id: { type: Type.STRING }, 
                score: { type: Type.NUMBER }, 
                reasoning: { type: Type.STRING, description: "Analisis alasan skor dalam Bahasa Indonesia" } 
              }
            } 
          },
          summary: { type: Type.STRING, description: "Kesimpulan keseluruhan dalam Bahasa Indonesia" },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Daftar kekuatan kandidat dalam Bahasa Indonesia" },
          weaknesses: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Daftar kekurangan kandidat dalam Bahasa Indonesia" }
        }
      }
    }
  });

  const data = JSON.parse(aggressiveJsonRepair(response.text || "{}"));
  
  let gScore = 0, gW = 0, tScore = 0, tW = 0;
  const breakdown = questions.map((q, idx) => {
    const aiRes = data.questionScores?.find((s: any) => String(s.id).toLowerCase() === String(q.id).toLowerCase()) || data.questionScores?.[idx];
    const score = aiRes?.score || 0;
    if (q.category === 'General') { gScore += score * (q.weight/100); gW += q.weight; }
    else { tScore += score * (q.weight/100); tW += q.weight; }
    return { id: q.id, category: q.category, question: q.question, score, weight: q.weight, reasoning: aiRes?.reasoning || "-" };
  });

  const finalG = gW > 0 ? Math.round((gScore/gW)*100) : 0;
  const finalT = tW > 0 ? Math.round((tScore/tW)*100) : 0;
  const total = Math.round((finalG * 0.5) + (finalT * 0.5));

  return {
    score: total, generalScore: finalG, technicalScore: finalT,
    verdict: total >= 70 ? 'LULUS' : 'TIDAK LULUS',
    strengths: data.strengths || [], weaknesses: data.weaknesses || [], summary: data.summary || "",
    criteriaScores: [
      { name: 'Penampilan', score: manualScores.appearance, type: 'Manual', reason: '-' },
      { name: 'AI Soft Skill', score: finalG, type: 'AI', reason: 'Rata-rata tertimbang' },
      { name: 'AI Hard Skill', score: finalT, type: 'AI', reason: 'Rata-rata tertimbang' }
    ],
    interviewDate: new Date().toLocaleDateString('id-ID'),
    questionBreakdown: breakdown
  };
}
