
import { GoogleGenAI, Type } from "@google/genai";
import { Candidate, EvaluationResult, Position, QuestionTemplate, ScoreCriteria } from "../types";

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key belum dikonfigurasi.");
  return new GoogleGenAI({ apiKey });
};

const aggressiveJsonRepair = (str: string): string => {
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
      contents: [{ parts: [{ inlineData: { data: fileData, mimeType }, text: "Extract CV to JSON: name, email, phone, lastPosition, skills (array), experience, education." }] }],
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(aggressiveJsonRepair(response.text || "{}"));
  } catch (e) { return {}; }
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
  const questionsList = questions.map(q => `ID:${q.id} | Q:"${q.question}" | Key:"${q.idealAnswer}"`).join('\n');

  const prompt = `
    Role: Senior HR Analyst.
    Task: Evaluate CANDIDATE only from a raw, single-stream interview transcript.
    
    Context:
    Candidate: ${candidate.name} | Position: ${position}
    
    Processing Logic:
    1. Distinguish speakers: HR asks questions (matching the reference list), Candidate provides answers.
    2. IGNORE HR's speech for scoring.
    3. Evaluate Candidate answers against "Key" provided.
    4. Handle speech-to-text noise (stuttering, fillers).
    
    Reference Questions:
    ${questionsList}

    Raw Transcript:
    ${safeTranscript}
    
    Scoring (0-100):
    - 0-40: Irrelevant/No Answer.
    - 41-70: Basic/Vague.
    - 71-100: Detailed/Professional.
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
              properties: { id: { type: Type.STRING }, score: { type: Type.NUMBER }, reasoning: { type: Type.STRING } }
            } 
          },
          summary: { type: Type.STRING },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } }
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
      { name: 'Appearance', score: manualScores.appearance, type: 'Manual', reason: '-' },
      { name: 'AI Soft Skill', score: finalG, type: 'AI', reason: 'Weighted Avg' },
      { name: 'AI Hard Skill', score: finalT, type: 'AI', reason: 'Weighted Avg' }
    ],
    interviewDate: new Date().toLocaleDateString('id-ID'),
    questionBreakdown: breakdown
  };
}
