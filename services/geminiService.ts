
// Use correct import for GoogleGenAI
import { GoogleGenAI, Type } from "@google/genai";
import { Candidate, EvaluationResult, Position, QuestionTemplate, ScoreCriteria } from "../types";

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
    const ai = getAI();
    
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
  manualScores: Record<string, number>,
  questions: QuestionTemplate[] = [] // Added context questions
): Promise<EvaluationResult> {
  
  // Note: Manual scores are kept for record but NOT used in calculation anymore
  const manualCriteriaList: ScoreCriteria[] = [
    { name: 'Penampilan & Kerapian', score: manualScores['appearance'] || 0, type: 'Manual (HR)', reason: 'Observasi Visual' },
    { name: 'Etika & Sopan Santun', score: manualScores['attitude'] || 0, type: 'Manual (HR)', reason: 'Observasi Visual' },
    { name: 'Gaya Komunikasi', score: manualScores['communication'] || 0, type: 'Manual (HR)', reason: 'Observasi Visual' },
    { name: 'Antusiasme', score: manualScores['enthusiasm'] || 0, type: 'Manual (HR)', reason: 'Observasi Visual' },
    { name: `Pengetahuan Dasar (${candidate.division})`, score: manualScores['knowledge'] || 0, type: 'Manual (HR)', reason: 'Observasi Visual' }
  ];

  // Prepare questions list string for prompt
  const questionsList = questions.length > 0 
    ? questions.map((q, i) => `${i+1}. ${q.question} (Kategori: ${q.category})`).join('\n')
    : "Tidak ada daftar pertanyaan spesifik, nilai berdasarkan alur percakapan.";

  const prompt = `
    Anda adalah Manager HR Senior. Tugas Anda adalah memberikan penilaian Objektif berdasarkan transkrip wawancara untuk posisi: ${position}.
    
    Kandidat: ${candidate.name}
    Divisi: ${candidate.division}
    
    Daftar Pertanyaan yang seharusnya diajukan (ACUAN PENILAIAN):
    """
    ${questionsList}
    """

    Transkrip Wawancara Aktual: 
    """
    ${interviewTranscript}
    """
    
    ---
    INSTRUKSI PENILAIAN (50% GENERAL / 50% TECHNICAL):
    
    1. GENERAL SCORE (0-100):
       - Cocokkan jawaban kandidat dengan pertanyaan kategori 'General' di atas.
       - Nilai attitude, motivasi, dan kecocokan budaya kerja.

    2. TECHNICAL SCORE (0-100):
       - Cocokkan jawaban kandidat dengan pertanyaan kategori 'Technical' di atas.
       - Nilai pemahaman teknis terhadap jobdesk ${position}.
       - Jika transkrip tidak menjawab semua pertanyaan teknis, nilai berdasarkan apa yang ada saja namun berikan catatan di summary.

    Output JSON Format:
    {
      "generalScore": number,
      "technicalScore": number,
      "summary": string,
      "strengths": string[],
      "weaknesses": string[]
    }
  `;

  try {
    const ai = getAI();
    
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", 
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            generalScore: { type: Type.NUMBER },
            technicalScore: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });

    const cleanedText = cleanJson(response.text || "{}");
    const data = JSON.parse(cleanedText);
    
    // Calculate Final Score: 50% General + 50% Technical
    const generalScore = data.generalScore || 0;
    const technicalScore = data.technicalScore || 0;
    const finalScore = Math.round((generalScore * 0.5) + (technicalScore * 0.5));
    
    const finalVerdict = finalScore >= 70 ? 'LULUS' : 'TIDAK LULUS';

    // AI Criteria for display
    const aiCriteriaList: ScoreCriteria[] = [
      { name: 'General / Soft Skill', score: generalScore, type: 'Analisis AI', reason: 'Berdasarkan pertanyaan umum & motivasi' },
      { name: 'Technical / Hard Skill', score: technicalScore, type: 'Analisis AI', reason: 'Berdasarkan pertanyaan teknis & studi kasus' }
    ];

    return {
      score: finalScore,
      generalScore: generalScore,
      technicalScore: technicalScore,
      verdict: finalVerdict,
      strengths: data.strengths || [],
      weaknesses: data.weaknesses || [],
      summary: data.summary || "",
      criteriaScores: [...manualCriteriaList, ...aiCriteriaList],
      interviewDate: new Date().toLocaleDateString('id-ID', { 
        day: 'numeric', month: 'long', year: 'numeric' 
      }),
      interviewDateISO: new Date().toISOString()
    };
  } catch (e) {
    console.error("Failed to parse evaluation response", e);
    throw new Error("Gagal menganalisis hasil interview.");
  }
}
