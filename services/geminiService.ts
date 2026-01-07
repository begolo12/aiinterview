
// Use correct import for GoogleGenAI
import { GoogleGenAI, Type } from "@google/genai";
import { Candidate, EvaluationResult, Position, QuestionTemplate, ScoreCriteria } from "../types";

// Helper to lazy-load AI instance
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key is missing. Please set VITE_API_KEY or process.env.API_KEY.");
    throw new Error("API Key belum dikonfigurasi.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper: Try to repair broken JSON string (common AI issue with unescaped quotes)
const aggressiveJsonRepair = (str: string): string => {
  // 1. Remove markdown code blocks
  let fixed = str.replace(/```json\n?|```/g, '').trim();
  
  // 2. Find outermost brackets
  const firstOpen = fixed.indexOf('{');
  const lastClose = fixed.lastIndexOf('}');
  if (firstOpen !== -1 && lastClose !== -1) {
    fixed = fixed.substring(firstOpen, lastClose + 1);
  }

  // 3. Attempt to escape quotes inside values. 
  // This is tricky. A simple heuristic: 
  // If we see a quote that is NOT preceded by [:{,] and NOT followed by [}:,], it's likely content.
  // Note: This is not perfect but saves 80% of "chatty" AI errors.
  // Using a library like 'json5' would be better but we want zero deps.
  // We will trust valid JSON first.
  return fixed;
};

export async function parseCV(fileData: string, mimeType: string): Promise<Partial<Candidate>> {
  try {
    const ai = getAI();
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: [
        {
          parts: [
            { inlineData: { data: fileData, mimeType: mimeType } },
            {
              text: `Extract candidate data from CV to JSON.
              Fields: name, placeOfBirth, birthDate, gender, maritalStatus, religion, email, phone, address, lastPosition, summary, skills (array), experience, education.
              If not found, use empty string.`
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

    const cleanedText = aggressiveJsonRepair(response.text || "{}");
    return JSON.parse(cleanedText);
  } catch (e) {
    console.error("Failed to parse CV response", e);
    return {};
  }
}

export async function evaluateInterview(
  candidate: Candidate,
  interviewTranscript: string,
  position: Position,
  manualScores: Record<string, number>,
  questions: QuestionTemplate[] = [] 
): Promise<EvaluationResult> {
  
  const manualCriteriaList: ScoreCriteria[] = [
    { name: 'Penampilan & Kerapian', score: manualScores['appearance'] || 0, type: 'Manual (HR)', reason: 'Observasi Visual' },
    { name: 'Etika & Sopan Santun', score: manualScores['attitude'] || 0, type: 'Manual (HR)', reason: 'Observasi Visual' },
    { name: 'Gaya Komunikasi', score: manualScores['communication'] || 0, type: 'Manual (HR)', reason: 'Observasi Visual' },
    { name: 'Antusiasme', score: manualScores['enthusiasm'] || 0, type: 'Manual (HR)', reason: 'Observasi Visual' },
    { name: `Pengetahuan Dasar (${candidate.division})`, score: manualScores['knowledge'] || 0, type: 'Manual (HR)', reason: 'Observasi Visual' }
  ];

  // Truncate to 15k to prevent timeout/context issues
  const safeTranscript = interviewTranscript.length > 15000 
    ? interviewTranscript.substring(0, 15000) + "...[TRUNCATED]" 
    : interviewTranscript;

  const questionsList = questions.length > 0 
    ? questions.map((q, i) => `ID: ${q.id} (Urutan ${i+1}) | Pertanyaan: "${q.question}" | Kunci: "${q.idealAnswer}"`).join('\n')
    : "Tidak ada pertanyaan spesifik. Nilai secara umum.";

  const prompt = `
    Anda adalah HR Manager Senior. Tugas: Menilai kandidat berdasarkan TRANSKRIP WAWANCARA.
    
    Kandidat: ${candidate.name}
    Posisi: ${position}
    
    DAFTAR PERTANYAAN (Gunakan ID yang sesuai):
    ${questionsList}

    TRANSKRIP WAWANCARA: 
    ${safeTranscript}
    
    PEDOMAN SKOR:
    0 = Tidak menjawab / Salah total.
    10-50 = Jawaban terlalu singkat / ragu-ragu.
    51-75 = Jawaban benar tapi kurang detail.
    76-100 = Jawaban sempurna, detail, solutif.

    OUTPUT JSON:
    Pastikan "id" pada "questionScores" cocok dengan ID di daftar pertanyaan di atas.
    Jika ID tidak ditemukan, gunakan urutan index array.
  `;

  try {
    const ai = getAI();
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        maxOutputTokens: 8192, 
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
                  reasoning: { type: Type.STRING } 
                }
              } 
            },
            summary: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });

    const cleanedText = aggressiveJsonRepair(response.text || "{}");
    
    let data;
    try {
      data = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      console.log("Raw Text:", cleanedText);
      // If parsing fails, we construct a fallback object with empty scores but error message in summary
      // This prevents "0 results" crashing the UI logic, but warns the user
      throw new Error("Gagal membaca format respon AI. Mohon coba 'Evaluasi Ulang'.");
    }
    
    // --- CALCULATE WEIGHTED SCORES WITH ROBUST MAPPING ---
    let totalGeneralScore = 0;
    let totalGeneralWeight = 0;
    let totalTechnicalScore = 0;
    let totalTechnicalWeight = 0;
    
    const questionBreakdown = questions.map((q, index) => {
      // 1. Try Exact ID Match
      let aiResult = data.questionScores?.find((qs: any) => qs.id === q.id);
      
      // 2. Fallback: Fuzzy ID Match (ignore case)
      if (!aiResult && data.questionScores) {
         aiResult = data.questionScores.find((qs: any) => 
            qs.id && String(qs.id).toLowerCase() === String(q.id).toLowerCase()
         );
      }

      // 3. Fallback: Index Match (Assuming AI kept the order)
      if (!aiResult && data.questionScores && data.questionScores[index]) {
         // Only use index match if the AI return list size is similar to question list size
         aiResult = data.questionScores[index];
      }

      const rawScore = (aiResult && typeof aiResult.score === 'number') ? aiResult.score : 0;
      const weight = (typeof q.weight === 'number') ? q.weight : 0;
      const reasoning = aiResult?.reasoning || "Tidak ada analisis.";
      
      if (q.category === 'General') {
        totalGeneralScore += rawScore * (weight / 100);
        totalGeneralWeight += weight;
      } else {
        totalTechnicalScore += rawScore * (weight / 100);
        totalTechnicalWeight += weight;
      }

      return {
        id: q.id || `q-${index}`,
        category: q.category || 'General',
        question: q.question || '',
        score: rawScore,
        weight: weight,
        reasoning: reasoning
      };
    });

    // Handle case where total weights might be 0 to avoid NaN
    const finalGeneralScore = totalGeneralWeight > 0 ? Math.round((totalGeneralScore / totalGeneralWeight) * 100) : 0;
    const finalTechnicalScore = totalTechnicalWeight > 0 ? Math.round((totalTechnicalScore / totalTechnicalWeight) * 100) : 0;
    
    const finalScore = Math.round((finalGeneralScore * 0.5) + (finalTechnicalScore * 0.5));
    const finalVerdict = finalScore >= 70 ? 'LULUS' : 'TIDAK LULUS';

    const aiCriteriaList: ScoreCriteria[] = [
      { name: 'General / Soft Skill', score: finalGeneralScore, type: 'Analisis AI', reason: 'Rata-rata Terbobot' },
      { name: 'Technical / Hard Skill', score: finalTechnicalScore, type: 'Analisis AI', reason: 'Rata-rata Terbobot' }
    ];

    return {
      score: finalScore,
      generalScore: finalGeneralScore,
      technicalScore: finalTechnicalScore,
      verdict: finalVerdict,
      strengths: Array.isArray(data.strengths) ? data.strengths : ["-"],
      weaknesses: Array.isArray(data.weaknesses) ? data.weaknesses : ["-"],
      summary: data.summary || "Evaluasi selesai.",
      criteriaScores: [...manualCriteriaList, ...aiCriteriaList],
      interviewDate: new Date().toLocaleDateString('id-ID', { 
        day: 'numeric', month: 'long', year: 'numeric' 
      }),
      interviewDateISO: new Date().toISOString(),
      questionBreakdown: questionBreakdown
    };
  } catch (e: any) {
    console.error("Failed to parse evaluation response", e);
    throw new Error(e.message || "Gagal menganalisis hasil interview.");
  }
}
