
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { Candidate, EvaluationResult, Position, QuestionTemplate, ScoreCriteria } from "../types";

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key is MISSING in process.env.API_KEY");
    throw new Error("API Key belum dikonfigurasi.");
  }
  console.log("Stats API Key:", apiKey.substring(0, 10) + "...");
  return new GoogleGenerativeAI(apiKey.trim());
};

const aggressiveJsonRepair = (str: string): string => {
  if (!str) return "{}";
  let fixed = str.replace(/```json\n?|```/g, '').trim();
  const firstOpen = fixed.indexOf('{');
  const lastClose = fixed.lastIndexOf('}');
  return firstOpen !== -1 && lastClose !== -1 ? fixed.substring(firstOpen, lastClose + 1) : fixed;
};

// ... existing helper function ...

export async function parseCV(fileData: string, mimeType: string): Promise<Partial<Candidate>> {
  try {
    const genAI = getAI();
    console.log("Using Model: gemini-1.5-flash-001 for CV Parsing");
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-001",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            name: { type: SchemaType.STRING, description: "Nama lengkap kandidat" },
            email: { type: SchemaType.STRING, description: "Alamat email" },
            phone: { type: SchemaType.STRING, description: "Nomor telepon/WA" },
            lastPosition: { type: SchemaType.STRING, description: "Jabatan terakhir (dalam Bahasa Indonesia)" },
            skills: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "Daftar keahlian"
            },
            experience: { type: SchemaType.STRING, description: "Ringkasan pengalaman kerja dalam Bahasa Indonesia" },
            education: { type: SchemaType.STRING, description: "Pendidikan terakhir dalam Bahasa Indonesia" }
          }
        }
      }
    });

    const result = await model.generateContent([
      {
        inlineData: {
          data: fileData,
          mimeType: mimeType
        }
      },
      "Ekstrak informasi dari CV ini ke dalam format JSON. WAJIB MENGGUNAKAN BAHASA INDONESIA untuk ringkasan dan deskripsi. Jika informasi tidak ditemukan, biarkan string kosong. Pastikan nomor telepon dan email diekstrak dengan akurat."
    ]);

    const textOutput = result.response.text();
    if (!textOutput) return {};

    return JSON.parse(aggressiveJsonRepair(textOutput));
  } catch (e: any) {
    if (e.toString().includes("404")) {
      console.error("404 ERROR DETECTED: API Key tidak valid untuk model ini. Pastikan 'Generative Language API' sudah ENABLED di Google Cloud Console project Anda.");
    }
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
  const genAI = getAI();
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

  /* 
    PENTING: Gunakan model 'gemini-1.5-flash-001' yang merupakan versi stabil.
    Jika error 404 muncul, berarti API Key ini dibatasi atau API belum diaktifkan di Google Cloud.
  */
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash-001",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          questionScores: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                id: { type: SchemaType.STRING },
                score: { type: SchemaType.NUMBER },
                reasoning: { type: SchemaType.STRING, description: "Analisis alasan skor dalam Bahasa Indonesia" }
              }
            }
          },
          summary: { type: SchemaType.STRING, description: "Kesimpulan keseluruhan dalam Bahasa Indonesia" },
          strengths: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Daftar kekuatan kandidat dalam Bahasa Indonesia" },
          weaknesses: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Daftar kekurangan kandidat dalam Bahasa Indonesia" }
        }
      }
    }
  });

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  const data = JSON.parse(aggressiveJsonRepair(responseText || "{}"));

  let gScore = 0, gW = 0, tScore = 0, tW = 0;
  const breakdown = questions.map((q, idx) => {
    const aiRes = data.questionScores?.find((s: any) => String(s.id).toLowerCase() === String(q.id).toLowerCase()) || data.questionScores?.[idx];
    const score = aiRes?.score || 0;
    if (q.category === 'General') { gScore += score * (q.weight / 100); gW += q.weight; }
    else { tScore += score * (q.weight / 100); tW += q.weight; }
    return { id: q.id, category: q.category, question: q.question, score, weight: q.weight, reasoning: aiRes?.reasoning || "-" };
  });

  const finalG = gW > 0 ? Math.round((gScore / gW) * 100) : 0;
  const finalT = tW > 0 ? Math.round((tScore / tW) * 100) : 0;
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
