
import { Candidate, EvaluationResult, Position, QuestionTemplate } from "../types";

const getAPIKey = () => {
  const key = process.env.API_KEY || "";
  return key.trim();
};

const aggressiveJsonRepair = (str: string): string => {
  if (!str) return "{}";
  let fixed = str.replace(/```json\n?|```/g, '').trim();
  const firstOpen = fixed.indexOf('{');
  const lastClose = fixed.lastIndexOf('}');
  if (firstOpen !== -1 && lastClose !== -1) {
    return fixed.substring(firstOpen, lastClose + 1);
  }
  return fixed;
};

const cleanObject = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(cleanObject);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, cleanObject(v)])
    );
  }
  return obj;
};

export async function parseCV(fileData: string, mimeType: string): Promise<Partial<Candidate>> {
  const apiKey = getAPIKey();
  if (!apiKey) return {};
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const prompt = "Ekstrak informasi dari CV ini ke dalam format JSON. Gunakan Bahasa Indonesia. Field: name, email, phone, lastPosition, skills (array), experience, education.";
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ inlineData: { data: fileData, mimeType: mimeType } }, { text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });
    if (!response.ok) throw new Error("Gagal menghubungi AI");
    const result = await response.json();
    const textOutput = result.candidates?.[0]?.content?.parts?.[0]?.text;
    return cleanObject(JSON.parse(aggressiveJsonRepair(textOutput || "{}")));
  } catch (e) {
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
  const apiKey = getAPIKey();
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const questionsList = questions.map(q => `ID:${q.id} | Pertanyaan:"${q.question}" | Kunci:"${q.idealAnswer}"`).join('\n');
    const prompt = `
      Role: Senior HR Analyst Profesional Indonesia.
      Tugas: Evaluasi transkrip wawancara berdasarkan pertanyaan dan kunci jawaban.
      
      PANDUAN NILAI (0-100):
      - 0-40: Tidak nyambung / Tidak menjawab.
      - 60-75: Jawaban Standar (Gunakan ini jika benar tapi singkat).
      - 76-100: Jawaban Detail & Profesional.

      Daftar Pertanyaan:
      ${questionsList}

      Transkrip:
      ${transcript}
      
      Output JSON:
      {
        "questionScores": [{"id": "string", "score": number, "reasoning": "string"}],
        "summary": "string",
        "strengths": ["string"],
        "weaknesses": ["string"]
      }
    `;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (!response.ok) throw new Error("Gagal evaluasi AI");
    const result = await response.json();
    const textOutput = result.candidates?.[0]?.content?.parts?.[0]?.text;
    const data = JSON.parse(aggressiveJsonRepair(textOutput || "{}"));

    // LOGIKA PERHITUNGAN BARU: RATA-RATA TERTIMBANG
    let totalPoints = 0;
    let totalWeights = 0;
    let gPoints = 0, gWeights = 0, tPoints = 0, tWeights = 0;

    const breakdown = questions.map((q, idx) => {
      const aiRes = data.questionScores?.find((s: any) => String(s.id).toLowerCase() === String(q.id).toLowerCase()) || data.questionScores?.[idx];
      const score = Number(aiRes?.score) || 0;
      const weight = Number(q.weight) || 0;

      totalPoints += (score * weight);
      totalWeights += weight;

      if (q.category === 'General') {
        gPoints += (score * weight);
        gWeights += weight;
      } else {
        tPoints += (score * weight);
        tWeights += weight;
      }

      return {
        id: q.id,
        category: q.category,
        question: q.question,
        score,
        weight,
        reasoning: aiRes?.reasoning || "-"
      };
    });

    const finalTotal = totalWeights > 0 ? Math.round(totalPoints / totalWeights) : 0;
    const finalG = gWeights > 0 ? Math.round(gPoints / gWeights) : 0;
    const finalT = tWeights > 0 ? Math.round(tPoints / tWeights) : 0;

    const evaluationResult = {
      score: finalTotal,
      generalScore: finalG,
      technicalScore: finalT,
      verdict: finalTotal >= 70 ? 'LULUS' : 'TIDAK LULUS',
      strengths: data.strengths || [],
      weaknesses: data.weaknesses || [],
      summary: data.summary || "",
      criteriaScores: [
        { name: 'Penampilan', score: manualScores?.appearance || 75, type: 'Manual', reason: '-' },
        { name: 'Rata-rata Umum', score: finalG, type: 'AI', reason: 'Soft Skill' },
        { name: 'Rata-rata Teknis', score: finalT, type: 'AI', reason: 'Hard Skill' }
      ],
      interviewDate: new Date().toLocaleDateString('id-ID'),
      questionBreakdown: breakdown
    };

    return cleanObject(evaluationResult);
  } catch (e: any) {
    throw e;
  }
}
