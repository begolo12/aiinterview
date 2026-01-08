
export enum Division {
  BUSDEV = 'Busdev',
  KEUANGAN = 'Keuangan',
  OPERASI = 'Operasi'
}

export type Position = string;

export interface QuestionTemplate {
  id: string;
  category: 'General' | 'Technical';
  question: string;
  idealAnswer: string;
  weight: number; // Added: Weightage percentage (0-100)
}

export interface ScoreCriteria {
  name: string;
  score: number;
  type: string; 
  reason: string;
}

export type Role = 'HR' | 'MANAGER' | 'DIRECTOR' | 'CEO';

export interface User {
  username: string;
  password?: string; // stored in firestore
  name: string;
  role: Role;
  division?: Division; // Optional, for managers
}

export interface EvaluationResult {
  score: number; // Final weighted score (50% General + 50% Technical)
  generalScore: number; // New: Specific score for General Questions
  technicalScore: number; // New: Specific score for Technical Questions
  
  verdict: 'LULUS' | 'TIDAK LULUS';
  strengths: string[];
  weaknesses: string[];
  summary: string;
  
  // Detailed scoring (includes Manual Criteria for display only)
  criteriaScores: ScoreCriteria[]; 
  
  // Multi-rater storage
  raterScores?: Record<string, Record<string, number>>;

  interviewDate: string;
  interviewDateISO?: string;
  
  // Store per-question breakdown
  questionBreakdown?: { 
    id: string; 
    category: string;
    question: string;
    score: number; 
    weight: number; 
    reasoning?: string; // New: AI explanation/summary of the answer
  }[];
}

export interface Documents {
  ktp: boolean;
  kk: boolean;
  simA?: boolean;
  simC?: boolean;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  placeOfBirth?: string;
  birthDate?: string;
  gender?: string;
  maritalStatus?: string;
  religion?: string;
  lastPosition?: string;
  summary: string;
  skills: string[];
  experience: string;
  education: string;
  cvImage?: string; 
  status: 'Draft' | 'Interview' | 'LULUS' | 'TIDAK LULUS';
  evaluation?: EvaluationResult;
  transcript?: string;
  division: Division;
  position: Position;
  documents: Documents; // New Field for Document Checklist
}

// Web Speech API Types
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
    jspdf: any;
  }
}
