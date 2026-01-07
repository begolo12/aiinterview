
// Use correct import for GoogleGenAI
import { GoogleGenAI, Type } from "@google/genai";
import { Candidate, EvaluationResult, Position, ScoreCriteria } from "../types";

// Helper to lazy-load AI instance to prevent crash on app startup if API key is missing
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key is missing. Please set VITE_API_KEY or process.env.API_KEY.");
    throw new Error("API Key belum dikonfigurasi.");
  }
  return new GoogleGenAI({ apiKey });
};

const cleanJson = (text: string) => {
  // Remove markdown code blocks if present
  let cleaned = text.replace(/```json\n?|```/g, '').trim();
  // Find first { and last } to ensure valid JSON boundaries
  const firstOpen = cleaned.indexOf('{');
  const lastClose = cleaned.lastIndexOf('}');
  if (firstOpen !== -1 && lastClose !== -1) {
    cleaned = cleaned.substring(firstOpen, lastClose + 1);
  }
  return cleaned;
};

export async function parseCV(fileData: string, mimeType: string): Promise<Partial<Candidate>> {
  try {
    // Initialize AI here protected by try-catch
    const ai = getAI();
    
    // Use gemini-3-flash-preview for basic text extraction tasks
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: [
        {
          parts: [
            {
              inlineData: {
                data: fileData,
                mimeType: mimeType
              }
            },
            {
              text: `Ekstrak data diri dari CV ini ke JSON.
              Field: name, placeOfBirth, birthDate, gender, maritalStatus, religion, email, phone, address, lastPosition, summary, skills (array), experience, education.
              Jika tidak ada, kosongkan string.`
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            placeOfBirth: { type: Type.STRING },
            birthDate: { type: Type.STRING },
            gender: { type: Type.STRING },
            maritalStatus: { type: Type.STRING },
            religion: { type: Type.STRING },
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
            address: { type: Type.STRING },
            lastPosition: { type: Type.STRING },
            summary: { type: Type.STRING },
            skills: { type: Type.ARRAY, items: { type: Type.STRING } },
            experience: { type: Type.STRING },
            education: { type: Type.STRING },
          }
        }
      }
    });

    // response.text is a property, not a method
    const cleanedText = cleanJson(response.text || "{}");
    return JSON.parse(cleanedText);
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return {};
  }
}

export async function evaluateInterview(
  candidate: Candidate,
  interviewTranscript: string,
  position: Position,
  manualScores: Record<string, number> 
): Promise<EvaluationResult> {
  
  // Calculate Manual Average
  const manualValues = Object.values(manualScores);
  const manualAvg = manualValues.length > 0 
    ? Math.round(manualValues.reduce((a: number, b: number) => a + b, 0) / manualValues.length)
    : 0;

  // Prepare Manual Criteria Data for the final result
  // Note: Knowledge label is now dynamic based on Division
  const manualCriteriaList: ScoreCriteria[] = [
    { name: 'Penampilan & Kerapian', score: manualScores['appearance'] || 0, type: 'Manual (HR)', reason: 'Penilaian langsung saat interview' },
    { name: 'Etika & Sopan Santun', score: manualScores['attitude'] || 0, type: 'Manual (HR)', reason: 'Penilaian langsung saat interview' },
    { name: 'Gaya Komunikasi', score: manualScores['communication'] || 0, type: 'Manual (HR)', reason: 'Penilaian langsung saat interview' },
    { name: 'Antusiasme', score: manualScores['enthusiasm'] || 0, type: 'Manual (HR)', reason: 'Penilaian langsung saat interview' },
    { name: `Pengetahuan Dasar (${candidate.division})`, score: manualScores['knowledge'] || 0, type: 'Manual (HR)', reason: 'Penilaian langsung saat interview' }
  ];

  const prompt = `
    Anda adalah Manager HR Senior yang sangat bijaksana dan cerdas. Tugas Anda adalah memberikan penilaian berbasis KONTEN PERCAKAPAN (60% Bobot) untuk posisi: ${position}.
    
    Kandidat: ${candidate.name}
    Divisi: ${candidate.division}
    Pengalaman CV: ${candidate.experience}
    Transkrip Wawancara: 
    """
    ${interviewTranscript}
    """
    
    ---
    INSTRUKSI PENTING:
    1. Anda harus menilai kompetensi kandidat berdasarkan transkrip.
    2. JIKA ADA pertanyaan teknis dari bank soal yang TIDAK DITANYAKAN oleh pewawancara:
       - JANGAN memberikan nilai 0 atau mengatakan "tidak ada data".
       - GUNAKAN KECERDASAN ANDA untuk menarik KESIMPULAN BIJAK (Inferensi) berdasarkan jawaban lain yang relevan, latar belakang pengalaman, dan gaya bicara kandidat.
    3. Fokus pada POTENSI dan KECOCOKAN.

    Sektor yang harus dinilai (Analisis AI):
    - Pemahaman Tugas (Job Understanding)
    - Keahlian Teknis (Technical Skill sesuai posisi ${position})
    - Pemecahan Masalah (Problem Solving)
    - Relevansi Pengalaman (Experience Fit)
    - Kecocokan Budaya/Karakter (Culture Fit)

    Berikan skor (0-100) dan alasan singkat (1 kalimat) untuk setiap sektor.
    
    Output JSON Format:
    {
      "aiScore": number,
      "summary": string,
      "strengths": string[],
      "weaknesses": string[],
      "aiCriteriaScores": [
         { "name": "Nama Sektor", "score": number, "reason": "alasan singkat" }
      ]
    }
  `;

  try {
    const ai = getAI(); // Initialize AI here
    
    // Use gemini-3-pro-preview for complex reasoning tasks
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", 
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            aiScore: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            aiCriteriaScores: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                  reason: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    // response.text is a property
    const cleanedText = cleanJson(response.text || "{}");
    const data = JSON.parse(cleanedText);
    
    // Combine Manual + AI Criteria to get 10 Sectors
    const aiCriteriaFormatted: ScoreCriteria[] = (data.aiCriteriaScores || []).map((c: any) => ({
      name: c.name,
      score: c.score,
      type: 'Analisis AI',
      reason: c.reason
    }));

    const allCriteria = [...manualCriteriaList, ...aiCriteriaFormatted];

    // Calculate Final Weighted Score: Manual (40%) + AI (60%)
    const finalScore = Math.round((manualAvg * 0.4) + ((data.aiScore || 0) * 0.6));
    const finalVerdict = finalScore >= 70 ? 'LULUS' : 'TIDAK LULUS';

    return {
      score: finalScore,
      manualScoreAvg: manualAvg,
      aiScore: data.aiScore || 0,
      verdict: finalVerdict,
      strengths: data.strengths || [],
      weaknesses: data.weaknesses || [],
      summary: data.summary || "",
      criteriaScores: allCriteria,
      interviewDate: new Date().toLocaleDateString('id-ID', { 
        day: 'numeric', month: 'long', year: 'numeric' 
      }),
      interviewDateISO: new Date().toISOString()
    };
  } catch (e) {
    console.error("Failed to parse evaluation response", e);
    throw new Error("Gagal menganalisis hasil interview. Respon AI tidak valid atau API Key bermasalah.");
  }
}
