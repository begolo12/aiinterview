
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, UserPlus, Mic, CheckCircle2, LayoutDashboard, Loader2, Briefcase, History,
  Award, Plus, X, BookOpen, Trash2, Activity, Trophy, Star, LogOut, Settings,
  FileQuestion, Save, Search, TrendingUp, PieChart as IconPieChart, BarChart3,
  ChevronRight, Filter, Download, MoreVertical, MapPin, Mail, Phone, Clock,
  Calendar, AlertCircle, MessageSquare, FileText, Upload, ChevronUp, ChevronDown,
  Target, Percent, XCircle, Edit, Check, Globe, CreditCard, GripVertical, Pencil,
  RefreshCw, AlertTriangle, Info, Scale
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

import { Candidate, Division, Position, EvaluationResult, User as UserType, ScoreCriteria, QuestionTemplate } from './types';
import { DIVISION_POSITIONS, QUESTION_TEMPLATES as DEFAULT_QUESTION_TEMPLATES } from './constants';
import { evaluateInterview, parseCV } from './services/geminiService';
import { seedUsers, loginUser } from './services/authService';
import { db } from './services/firebase';
import { collection, getDocs, updateDoc, doc, query, orderBy, setDoc, getDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { generateBODReport } from './services/reportService';

const MANUAL_CRITERIA = [
  { id: 'appearance', label: 'Penampilan & Kerapian' },
  { id: 'attitude', label: 'Etika & Sopan Santun' },
  { id: 'communication', label: 'Gaya Komunikasi' },
  { id: 'enthusiasm', label: 'Antusiasme & Inisiatif' },
  { id: 'knowledge', label: 'Pengetahuan Dasar' }
];

const DEFAULT_SCORES = {
  appearance: 75,
  attitude: 75,
  communication: 75,
  enthusiasm: 75,
  knowledge: 75
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'candidates' | 'database' | 'interview' | 'questions'>('dashboard');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [interviewTranscript, setInterviewTranscript] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [currentRaterScores, setCurrentRaterScores] = useState<Record<string, number>>({...DEFAULT_SCORES});
  const [questionBank, setQuestionBank] = useState<Record<Position, QuestionTemplate[]>>(DEFAULT_QUESTION_TEMPLATES);
  const [selectedQuestionPos, setSelectedQuestionPos] = useState<Position>('Office Boy (OB)');
  const [isSavingQuestions, setIsSavingQuestions] = useState(false);
  const [viewingCandidate, setViewingCandidate] = useState<Candidate | null>(null);
  const [showTranscriptInModal, setShowTranscriptInModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Custom Modal States
  const [alertState, setAlertState] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({ show: false, message: '', type: 'info' });
  const [confirmState, setConfirmState] = useState<{ show: boolean; message: string; onConfirm: () => void; }>({ show: false, message: '', onConfirm: () => {} });

  // State for Editing Questions
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  // Drag and Drop Refs
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // States for Adding/Editing Candidate
  const [isEditing, setIsEditing] = useState(false);
  const [currentEditId, setCurrentEditId] = useState<string | null>(null);
  
  const [newCandName, setNewCandName] = useState('');
  const [newCandDiv, setNewCandDiv] = useState<Division | ''>('');
  const [newCandPos, setNewCandPos] = useState<Position | ''>('');
  const [newCandEmail, setNewCandEmail] = useState('');
  const [newCandPhone, setNewCandPhone] = useState('');
  
  // States for Documents
  const [hasKtp, setHasKtp] = useState(false);
  const [hasKk, setHasKk] = useState(false);
  const [hasSimA, setHasSimA] = useState(false);
  const [hasSimC, setHasSimC] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    seedUsers();
    fetchCandidates();
    fetchQuestions();
    const savedUser = localStorage.getItem('daniswaraUser');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
  }, []);

  const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlertState({ show: true, message, type });
  };

  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmState({ show: true, message, onConfirm });
  };

  const fetchCandidates = async () => {
    try {
      const q = query(collection(db, "candidates"), orderBy("name")); 
      const querySnapshot = await getDocs(q);
      const fetched: Candidate[] = [];
      querySnapshot.forEach((doc) => fetched.push({ id: doc.id, ...doc.data() } as Candidate));
      setCandidates(fetched);
    } catch (e) { console.error(e); }
  };

  const fetchQuestions = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'question_templates', 'all'));
      if (docSnap.exists()) setQuestionBank(docSnap.data().templates);
    } catch (e) { console.error(e); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      try {
        const extracted = await parseCV(base64, file.type);
        if (extracted.name) setNewCandName(extracted.name);
        if (extracted.email) setNewCandEmail(extracted.email);
        if (extracted.phone) setNewCandPhone(extracted.phone);
        showAlert("CV Berhasil di-scan!", "success");
      } catch (err) {
        showAlert("Gagal membaca CV. Silakan isi manual.", "error");
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const redistributeGeneralWeights = (questions: QuestionTemplate[]): QuestionTemplate[] => {
    const generalQs = questions.filter(q => q.category === 'General');
    if (generalQs.length === 0) return questions;

    const weightPerQ = Math.floor(100 / generalQs.length);
    const remainder = 100 % generalQs.length;

    let genIndex = 0;
    return questions.map(q => {
      if (q.category === 'General') {
        const newWeight = genIndex === generalQs.length - 1 ? weightPerQ + remainder : weightPerQ;
        genIndex++;
        return { ...q, weight: newWeight };
      }
      return q;
    });
  };

  const handleSaveQuestions = async () => {
    // 1. Force Recalculate General Weights to 100% BEFORE validation
    // This fixes the issue where existing data might be 0% or undefined.
    let updatedQuestions = redistributeGeneralWeights([...questionBank[selectedQuestionPos]]);

    // 2. Validate Weights
    const techTotal = updatedQuestions.filter(q => q.category === 'Technical').reduce((sum, q) => sum + (q.weight || 0), 0);
    const genTotal = updatedQuestions.filter(q => q.category === 'General').reduce((sum, q) => sum + (q.weight || 0), 0);

    // Allow small rounding errors (99-101) for Technical
    if (Math.abs(techTotal - 100) > 1 && updatedQuestions.some(q => q.category === 'Technical')) {
       return showAlert(`Total Bobot Technical harus 100% (Saat ini: ${techTotal}%). Mohon sesuaikan manual.`, 'error');
    }
    
    // General check should pass now, but keep as safeguard
    if (updatedQuestions.some(q => q.category === 'General') && Math.abs(genTotal - 100) > 1) {
       return showAlert(`Total Bobot General error sistem (Saat ini: ${genTotal}%).`, 'error');
    }

    setIsSavingQuestions(true);
    try {
      // 3. Update the state and DB with the recalculated General weights
      const newBank = { ...questionBank, [selectedQuestionPos]: updatedQuestions };
      
      // Update local state first to reflect changes immediately
      setQuestionBank(newBank);
      
      await setDoc(doc(db, 'question_templates', 'all'), { templates: newBank });
      setEditingQuestionId(null);
      showAlert("Bank soal berhasil disimpan ke Database!", "success");
    } catch (e) { showAlert("Gagal menyimpan bank soal.", "error"); } finally { setIsSavingQuestions(false); }
  };

  const deleteQuestion = (pos: Position, questionId: string, category: 'General' | 'Technical') => {
    showConfirm("Hapus pertanyaan ini secara permanen?", () => {
        setQuestionBank(prev => {
          const next = { ...prev };
          
          if (category === 'General') {
            // Delete from ALL positions and redistribute
            Object.keys(next).forEach(key => {
              const p = key as Position;
              const filtered = next[p].filter(q => q.id !== questionId);
              next[p] = redistributeGeneralWeights(filtered);
            });
          } else {
            // Delete from this position
            next[pos] = next[pos].filter(q => q.id !== questionId);
          }
          return next;
        });
    });
  };

  const addQuestion = (pos: Position, category: 'General' | 'Technical') => {
    const newId = `new-${Date.now()}`;
    const newQ: QuestionTemplate = { 
      id: newId, 
      category, 
      question: category === 'General' ? 'Pertanyaan Umum Baru (Otomatis ditambahkan ke semua posisi)...' : 'Pertanyaan Teknis Baru...', 
      idealAnswer: 'Tulis jawaban ideal di sini...',
      weight: 0 // Will be fixed immediately
    };

    setQuestionBank(prev => {
      const next = { ...prev };

      if (category === 'General') {
        Object.keys(next).forEach(key => {
          const p = key as Position;
          const lastGenIdx = next[p].map(q => q.category).lastIndexOf('General');
          const newArr = [...next[p]];
          
          if (lastGenIdx !== -1) {
            newArr.splice(lastGenIdx + 1, 0, newQ);
          } else {
            newArr.unshift(newQ);
          }
          // Auto balance general weights
          next[p] = redistributeGeneralWeights(newArr);
        });
      } else {
        next[pos] = [...next[pos], newQ];
        // For technical, new question gets 0 weight initially, user must adjust
      }
      return next;
    });
    
    setEditingQuestionId(newId);
  };

  const updateQuestion = (id: string, field: keyof QuestionTemplate, value: string | number) => {
    setQuestionBank(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        const pos = key as Position;
        next[pos] = next[pos].map(q => {
          if (q.id === id) {
            return { ...q, [field]: value };
          }
          return q;
        });
      });
      return next;
    });
  };

  // Drag and Drop Logic
  const handleSort = () => {
    let _questionBank = { ...questionBank };
    const items = [..._questionBank[selectedQuestionPos]];

    if (dragItem.current !== null && dragOverItem.current !== null) {
      const draggedItemContent = items.splice(dragItem.current, 1)[0];
      items.splice(dragOverItem.current, 0, draggedItemContent);
      _questionBank[selectedQuestionPos] = items;
      setQuestionBank(_questionBank);
      dragItem.current = null;
      dragOverItem.current = null;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) {
      showAlert('Mohon isi username dan password.', 'info');
      return;
    }
    
    try {
      const user = await loginUser(loginUsername, loginPassword);
      if (user) {
        setCurrentUser(user);
        localStorage.setItem('daniswaraUser', JSON.stringify(user));
        setAuthError('');
      } else {
        setAuthError('Username atau Password salah. (Default: irvan / 123)');
        showAlert('Login Gagal: Username atau Password salah.', 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Terjadi kesalahan sistem saat login. Cek koneksi internet.', 'error');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('daniswaraUser');
  };

  // Helper to check if SIM is required based on Division/Position
  const isSimRequired = useMemo(() => {
    return newCandDiv === Division.OPERASI || newCandPos === 'Umum';
  }, [newCandDiv, newCandPos]);

  // Handle Opening Add Modal (Reset)
  const openAddModal = () => {
    setIsEditing(false);
    setCurrentEditId(null);
    setNewCandName('');
    setNewCandDiv('');
    setNewCandPos('');
    setNewCandEmail('');
    setNewCandPhone('');
    setHasKtp(false);
    setHasKk(false);
    setHasSimA(false);
    setHasSimC(false);
    setShowAddModal(true);
  };

  // Handle Opening Edit Modal (Populate)
  const openEditModal = (c: Candidate) => {
    setIsEditing(true);
    setCurrentEditId(c.id);
    setNewCandName(c.name);
    setNewCandDiv(c.division);
    setNewCandPos(c.position);
    setNewCandEmail(c.email);
    setNewCandPhone(c.phone);
    
    // Populate documents if they exist
    setHasKtp(c.documents?.ktp || false);
    setHasKk(c.documents?.kk || false);
    setHasSimA(c.documents?.simA || false);
    setHasSimC(c.documents?.simC || false);
    
    setShowAddModal(true);
  };

  const handleSaveCandidate = async () => {
    if (!newCandName || !newCandDiv || !newCandPos) return showAlert("Mohon lengkapi data Nama, Divisi, dan Posisi.", "error");
    setIsParsing(true);
    try {
      const candidateData: any = {
        name: newCandName,
        division: newCandDiv,
        position: newCandPos,
        email: newCandEmail || `${newCandName.toLowerCase().replace(/\s/g, '')}@example.com`,
        phone: newCandPhone || '0812-xxxx-xxxx',
        documents: {
          ktp: hasKtp,
          kk: hasKk,
          simA: isSimRequired ? hasSimA : false,
          simC: isSimRequired ? hasSimC : false
        }
      };

      if (isEditing && currentEditId) {
        // Update existing
        await updateDoc(doc(db, "candidates", currentEditId), candidateData);
        showAlert("Data pelamar berhasil diperbarui!", "success");
      } else {
        // Create new
        await addDoc(collection(db, "candidates"), {
          ...candidateData,
          status: 'Interview',
          skills: [],
          experience: '-',
          education: '-',
          summary: '-'
        });
        showAlert("Pelamar berhasil ditambahkan!", "success");
      }

      setShowAddModal(false);
      fetchCandidates();
    } catch (e) { showAlert("Gagal menyimpan data kandidat.", "error"); } finally { setIsParsing(false); }
  };

  const handleDeleteCandidate = async (id: string) => {
    showConfirm("Hapus data pelamar ini secara permanen?", async () => {
      try {
        await deleteDoc(doc(db, "candidates", id));
        fetchCandidates();
      } catch(e) { showAlert("Gagal menghapus data.", "error"); }
    });
  };

  // Evaluate New Interview (Live)
  const handleEvaluate = async () => {
    if (!selectedCandidateId || !currentUser) return;
    setIsEvaluating(true);
    try {
      const cand = candidates.find(c => c.id === selectedCandidateId)!;
      // Pass the CURRENT question bank to the evaluation service
      const currentQuestions = questionBank[cand.position] || [];
      
      const result = await evaluateInterview(
        cand, 
        interviewTranscript, 
        cand.position, 
        currentRaterScores, 
        currentQuestions
      );
      
      await updateDoc(doc(db, "candidates", cand.id), { 
        status: result.verdict, 
        evaluation: result, 
        transcript: interviewTranscript 
      });
      
      fetchCandidates();
      setViewingCandidate({ ...cand, status: result.verdict, evaluation: result, transcript: interviewTranscript });
      setSelectedCandidateId(null);
      setInterviewTranscript('');
      showAlert("Evaluasi AI selesai!", "success");
    } catch (e) { showAlert("Evaluasi gagal. Silakan coba lagi.", "error"); } finally { setIsEvaluating(false); }
  };

  // Re-Evaluate Existing Interview (Recalculate with New Questions)
  const handleReEvaluate = async () => {
    if (!viewingCandidate || !viewingCandidate.transcript) return showAlert("Tidak ada transkrip untuk dinilai ulang.", "info");
    
    showConfirm("Hitung ulang skor AI? Ini akan menggunakan DAFTAR PERTANYAAN TERBARU dari Bank Soal.", async () => {
        setIsEvaluating(true);
        try {
          // SAFEGUARD: Ensure questions exist for this position
          const currentQuestions = questionBank[viewingCandidate.position];
          
          if (!currentQuestions || currentQuestions.length === 0) {
            throw new Error(`Bank soal tidak ditemukan untuk posisi: ${viewingCandidate.position}. Mohon cek tab 'Bank Soal AI' dan pastikan posisi ini memiliki pertanyaan.`);
          }

          const result = await evaluateInterview(
            viewingCandidate,
            viewingCandidate.transcript || '',
            viewingCandidate.position,
            currentRaterScores, // Fallback to current UI sliders or defaults
            currentQuestions
          );
    
          // Update Firebase
          await updateDoc(doc(db, "candidates", viewingCandidate.id), {
            status: result.verdict, 
            evaluation: result
          });
    
          // Update Local State
          const updatedCand = { ...viewingCandidate, status: result.verdict, evaluation: result };
          setViewingCandidate(updatedCand);
          setCandidates(prev => prev.map(c => c.id === updatedCand.id ? updatedCand : c));
    
          showAlert("Evaluasi ulang selesai dengan standar soal terbaru!", "success");
        } catch (e: any) {
          console.error(e);
          showAlert(e.message || "Gagal melakukan evaluasi ulang.", "error");
        } finally {
          setIsEvaluating(false);
        }
    });
  };

  const handleGenerateReport = () => {
    const success = generateBODReport(candidates, '', '');
    if (!success) {
        showAlert("Tidak ada data kandidat untuk dilaporkan.", "info");
    }
  };

  // ... (Stats calculation and filteredCandidates remain the same)
  const stats = useMemo(() => {
    const total = candidates.length;
    const passed = candidates.filter(c => c.status === 'LULUS').length;
    const failed = candidates.filter(c => c.status === 'TIDAK LULUS').length;
    const process = candidates.filter(c => c.status === 'Interview' || c.status === 'Draft').length;
    const evaluated = candidates.filter(c => c.evaluation);
    const avgScore = evaluated.length ? Math.round(evaluated.reduce((a, b) => a + (b.evaluation?.score || 0), 0) / evaluated.length) : 0;
    
    const divisionStats = Object.values(Division).map(d => {
      const divCandidates = candidates.filter(c => c.division === d);
      const divPassed = divCandidates.filter(c => c.status === 'LULUS').length;
      const divEvaluated = divCandidates.filter(c => c.evaluation);
      const divAvg = divEvaluated.length ? Math.round(divEvaluated.reduce((a, b) => a + (b.evaluation?.score || 0), 0) / divEvaluated.length) : 0;
      
      return {
        name: d,
        count: divCandidates.length,
        passed: divPassed,
        passRate: divCandidates.length ? Math.round((divPassed / divCandidates.length) * 100) : 0,
        avgScore: divAvg
      };
    });

    const scoreDist = [
      { range: '> 85', count: evaluated.filter(c => (c.evaluation?.score || 0) > 85).length, fill: '#10b981' }, 
      { range: '70 - 85', count: evaluated.filter(c => (c.evaluation?.score || 0) >= 70 && (c.evaluation?.score || 0) <= 85).length, fill: '#3b82f6' }, 
      { range: '< 70', count: evaluated.filter(c => (c.evaluation?.score || 0) < 70).length, fill: '#ef4444' } 
    ];

    return { total, passed, failed, process, avgScore, rate: total ? Math.round((passed/total)*100) : 0, divisionStats, scoreDist };
  }, [candidates]);

  // Calculate Weights for Display in Question Bank
  const currentTotalWeightTechnical = useMemo(() => {
     return (questionBank[selectedQuestionPos] || [])
       .filter(q => q.category === 'Technical')
       .reduce((sum, q) => sum + (q.weight || 0), 0);
  }, [questionBank, selectedQuestionPos]);

  const filteredCandidates = candidates.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md space-y-6">
          <div className="text-center mb-4">
            <div className="bg-violet-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3 shadow-xl shadow-violet-200">
               <Users className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">DANISWARA</h1>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Onboarding System</p>
          </div>
          <div className="space-y-3">
            <input type="text" placeholder="Username" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-violet-500 transition-all" />
            <input type="password" placeholder="Password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-violet-500 transition-all" />
          </div>
          {authError && <p className="text-red-500 text-[10px] font-black uppercase text-center">{authError}</p>}
          <button type="submit" className="w-full bg-violet-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-violet-700 active:scale-95 transition-all">Sign In</button>
        </form>
        {/* Render Modals even in login screen if needed, though mostly used inside */}
        {alertState.show && (
          <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
             <div className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-sm w-full text-center space-y-4 animate-in zoom-in-95 duration-300">
                <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center ${
                  alertState.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
                  alertState.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-violet-100 text-violet-600'
                }`}>
                  {alertState.type === 'success' ? <CheckCircle2 className="w-8 h-8"/> :
                   alertState.type === 'error' ? <XCircle className="w-8 h-8"/> : <Info className="w-8 h-8"/>}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">
                    {alertState.type === 'success' ? 'Berhasil!' : alertState.type === 'error' ? 'Oops!' : 'Info'}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 mt-1 leading-relaxed px-4">{alertState.message}</p>
                </div>
                <button 
                  onClick={() => setAlertState(prev => ({ ...prev, show: false }))}
                  className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all"
                >
                  Tutup
                </button>
             </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900">
      <aside className="hidden lg:flex lg:w-72 border-r bg-white flex-col z-20 shadow-sm">
        <div className="p-8 flex items-center gap-4">
          <div className="bg-violet-600 p-2.5 rounded-xl rotate-3 shadow-lg shadow-violet-200">
            <Users className="text-white w-6 h-6" />
          </div>
          <div>
            <span className="font-black text-slate-800 text-lg tracking-tighter uppercase block">Daniswara</span>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Onboarding AI</span>
          </div>
        </div>
        
        <div className="px-6 mb-6">
           <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3 border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center font-black text-violet-600">
                 {currentUser.name.charAt(0)}
              </div>
              <div className="overflow-hidden">
                 <p className="font-bold text-sm truncate">{currentUser.name}</p>
                 <p className="text-[10px] font-black text-slate-400 uppercase">{currentUser.role}</p>
              </div>
           </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'candidates', icon: Users, label: 'Antrean Pelamar' },
            { id: 'database', icon: History, label: 'Database Kandidat' },
            { id: 'interview', icon: Mic, label: 'Live Interview' },
            { id: 'questions', icon: FileQuestion, label: 'Bank Soal AI', role: 'HR' }
          ].filter(item => !item.role || currentUser.role === item.role).map(item => (
            <button 
              key={item.id} 
              onClick={() => setActiveTab(item.id as any)} 
              className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all ${activeTab === item.id ? 'bg-violet-600 text-white shadow-lg shadow-violet-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
            >
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : 'text-slate-400'}`} /> {item.label}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t mt-auto">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-5 py-3 rounded-2xl text-xs font-black text-red-500 hover:bg-red-50 transition-all uppercase tracking-widest">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b flex items-center justify-between px-6 z-10 shrink-0">
           <div className="flex items-center gap-4 flex-1">
              <div className="relative max-w-sm w-full">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                 <input 
                   type="text" 
                   placeholder="Cari kandidat..." 
                   className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl text-xs font-medium border border-slate-100 focus:bg-white focus:ring-2 focus:ring-violet-100 transition-all outline-none"
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                 />
              </div>
           </div>
           <div className="flex items-center gap-3">
              <button onClick={openAddModal} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95">
                 <Plus className="w-3.5 h-3.5" /> Tambah Pelamar
              </button>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
          {activeTab === 'dashboard' && (
            <div className="h-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
               {/* ... stats ... */}
               <div className="grid grid-cols-5 gap-3 shrink-0">
                {[
                  { label: 'Total Applicants', value: stats.total, sub: 'All Candidates', icon: Users, color: 'violet' },
                  { label: 'Qualified', value: stats.passed, sub: `${stats.rate}% Rate`, icon: Trophy, color: 'emerald' },
                  { label: 'Rejected', value: stats.failed, sub: 'Below Standard', icon: XCircle, color: 'rose' },
                  { label: 'Active Process', value: stats.process, sub: 'In Pipeline', icon: Clock, color: 'amber' },
                  { label: 'Average Score', value: stats.avgScore, sub: '/ 100 Points', icon: Star, color: 'indigo' }
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl bg-${stat.color}-50 flex items-center justify-center shrink-0`}>
                       <stat.icon className={`w-4 h-4 text-${stat.color}-600`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{stat.label}</p>
                      <h3 className="text-lg font-black leading-none mt-0.5">{stat.value}</h3>
                      <p className="text-[8px] font-bold text-slate-400 mt-0.5">{stat.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Charts & Graphs */}
              <div className="grid grid-cols-3 gap-4 flex-1 min-h-0">
                 <div className="col-span-2 bg-white rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                       <h3 className="font-black text-xs text-slate-800 flex items-center gap-2"><Briefcase className="w-3.5 h-3.5 text-slate-400"/> Performa Rekrutmen per Divisi</h3>
                       <button className="text-[10px] font-bold text-violet-600 hover:underline">View Details</button>
                    </div>
                    <div className="flex-1 overflow-auto">
                       <table className="w-full text-left">
                          <thead className="bg-slate-50 sticky top-0 z-10">
                             <tr>
                                <th className="py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Divisi</th>
                                <th className="py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Pelamar</th>
                                <th className="py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Lulus</th>
                                <th className="py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Pass Rate</th>
                                <th className="py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Avg Score</th>
                                <th className="py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                             {stats.divisionStats.map((d, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                   <td className="py-3 px-4 font-bold text-xs text-slate-700">{d.name}</td>
                                   <td className="py-3 px-4 text-center text-xs font-bold text-slate-500">{d.count}</td>
                                   <td className="py-3 px-4 text-center text-xs font-bold text-emerald-600">{d.passed}</td>
                                   <td className="py-3 px-4 text-center">
                                      <div className="flex items-center justify-center gap-2">
                                         <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${d.passRate >= 50 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{width: `${d.passRate}%`}}></div>
                                         </div>
                                         <span className="text-[9px] font-bold">{d.passRate}%</span>
                                      </div>
                                   </td>
                                   <td className="py-3 px-4 text-center text-xs font-bold text-slate-700">{d.avgScore}</td>
                                   <td className="py-3 px-4 text-center">
                                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wide ${d.count > 0 ? 'bg-violet-50 text-violet-600' : 'bg-slate-100 text-slate-400'}`}>
                                         {d.count > 0 ? 'Active' : 'No Data'}
                                      </span>
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>

                 <div className="flex flex-col gap-4">
                    <div className="flex-1 bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col">
                       <h3 className="font-black text-xs text-slate-800 mb-2 flex items-center gap-2"><BarChart3 className="w-3.5 h-3.5 text-slate-400"/> Distribusi Kualitas (Skor)</h3>
                       <div className="flex-1 min-h-0">
                          <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={stats.scoreDist} layout="vertical" margin={{top:0, right:20, left:0, bottom:0}} barSize={16}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="range" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 9, fontWeight: 600}} width={50} />
                                <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px'}} />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                  {stats.scoreDist.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                  ))}
                                </Bar>
                             </BarChart>
                          </ResponsiveContainer>
                       </div>
                    </div>
                    
                    <div className="flex-1 bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col relative">
                        <h3 className="font-black text-xs text-slate-800 mb-2 flex items-center gap-2"><IconPieChart className="w-3.5 h-3.5 text-slate-400"/> Funnel Seleksi</h3>
                        <div className="flex-1 min-h-0 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Lulus', value: stats.passed, color: '#10b981' },
                                            { name: 'Gagal', value: stats.failed, color: '#f43f5e' },
                                            { name: 'Proses', value: stats.process, color: '#f59e0b' }
                                        ]}
                                        cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value"
                                    >
                                        {[{c:'#10b981'}, {c:'#f43f5e'}, {c:'#f59e0b'}].map((e, i) => <Cell key={i} fill={e.c} />)}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{borderRadius: '8px', fontSize: '10px'}} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-xl font-black text-slate-800">{stats.passed}</span>
                                <span className="text-[7px] font-black text-emerald-600 uppercase">Hired</span>
                            </div>
                        </div>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'candidates' && (
             /* Candidates Tab (Unchanged) */
             <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-3xl font-black text-slate-800">Antrean Pelamar</h2>
                    <p className="text-slate-500 font-medium">Kandidat yang siap untuk interview.</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {filteredCandidates.filter(c => c.status === 'Interview' || c.status === 'Draft').map((c) => (
                   <div key={c.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-violet-200/50 transition-all duration-300 flex flex-col relative overflow-hidden group">
                      
                      <div className="absolute top-6 right-6 flex gap-2 z-10">
                         <button onClick={() => openEditModal(c)} className="p-2 bg-slate-50 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all">
                            <Pencil className="w-4 h-4" />
                         </button>
                         <button onClick={() => handleDeleteCandidate(c.id)} className="p-2 bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                            <Trash2 className="w-4 h-4" />
                         </button>
                      </div>

                      <div className="flex justify-between items-start mb-6">
                         <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center font-black text-violet-600 text-xl">
                            {c.name.charAt(0)}
                         </div>
                         <span className="bg-amber-50 text-amber-600 text-[10px] font-black uppercase px-3 py-1.5 rounded-full tracking-widest border border-amber-100">
                            {c.status}
                         </span>
                      </div>
                      <div className="mb-8">
                         <h3 className="text-xl font-black text-slate-800 group-hover:text-violet-600 transition-colors mb-1 pr-16 truncate">{c.name}</h3>
                         <p className="text-sm font-bold text-slate-400 flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> {c.position}</p>
                         <p className="text-xs font-medium text-slate-400 mt-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {c.division}</p>
                      </div>
                      <div className="mt-auto space-y-2">
                         {currentUser.role === 'HR' ? (
                           <button 
                             onClick={() => { setSelectedCandidateId(c.id); setInterviewTranscript(c.transcript || ''); setActiveTab('interview'); }}
                             className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-violet-600 transition-all active:scale-95"
                           >
                              <Mic className="w-4 h-4" /> Mulai Interview
                           </button>
                         ) : (
                           <div className="w-full bg-slate-100 text-slate-400 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 border border-slate-200">
                              <Clock className="w-4 h-4" /> Menunggu HR
                           </div>
                         )}
                         <button onClick={() => setViewingCandidate(c)} className="w-full bg-slate-50 text-slate-400 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white hover:text-slate-800 border border-transparent transition-all">
                            Detail Profile
                         </button>
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {activeTab === 'database' && (
            /* Database Tab (Unchanged) */
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-left-4 duration-500 pb-20">
               <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-3xl font-black text-slate-800">Database Kandidat</h2>
                    <p className="text-slate-500 font-medium">Histori lengkap semua kandidat dan skor 10 sektor.</p>
                  </div>
                  <button onClick={handleGenerateReport} className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-violet-700 transition-all">
                     <Download className="w-4 h-4" /> Download Report
                  </button>
               </div>

               <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse">
                        <thead>
                           <tr className="bg-slate-50/50 border-b border-slate-100">
                              <th className="py-5 px-8 text-[10px] uppercase font-black text-slate-400 tracking-widest">Kandidat</th>
                              <th className="py-5 px-6 text-[10px] uppercase font-black text-slate-400 tracking-widest">Posisi</th>
                              <th className="py-5 px-6 text-[10px] uppercase font-black text-slate-400 tracking-widest">Status</th>
                              <th className="py-5 px-6 text-[10px] uppercase font-black text-slate-400 tracking-widest text-center">Skor</th>
                              <th className="py-5 px-8 text-[10px] uppercase font-black text-slate-400 tracking-widest text-right">Actions</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {filteredCandidates.map((c) => (
                              <tr key={c.id} className="group hover:bg-slate-50/50 transition-colors">
                                 <td className="py-5 px-8">
                                    <div className="flex items-center gap-4">
                                       <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-violet-600 group-hover:text-white transition-all">
                                          {c.name.charAt(0)}
                                       </div>
                                       <div>
                                          <p className="font-bold text-slate-800 group-hover:text-violet-600 transition-colors">{c.name}</p>
                                          <p className="text-[10px] text-slate-400 font-medium">{c.email}</p>
                                       </div>
                                    </div>
                                 </td>
                                 <td className="py-5 px-6">
                                    <p className="text-sm font-bold text-slate-700">{c.position}</p>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{c.division}</p>
                                 </td>
                                 <td className="py-5 px-6">
                                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                       c.status === 'LULUS' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                       c.status === 'TIDAK LULUS' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                       'bg-blue-50 text-blue-600 border-blue-100'
                                    }`}>
                                       {c.status}
                                    </span>
                                 </td>
                                 <td className="py-5 px-6 text-center">
                                    <span className={`text-sm font-black ${Number(c.evaluation?.score) >= 70 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                       {c.evaluation?.score || '-'}
                                    </span>
                                 </td>
                                 <td className="py-5 px-8 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                       <button onClick={() => setViewingCandidate(c)} className="p-2 bg-violet-50 text-violet-600 rounded-lg hover:bg-violet-600 hover:text-white transition-all">
                                          <ChevronRight className="w-4 h-4" />
                                       </button>
                                       <button onClick={() => openEditModal(c)} className="p-2 bg-slate-50 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all">
                                          <Edit className="w-4 h-4" />
                                       </button>
                                       <button onClick={() => handleDeleteCandidate(c.id)} className="p-2 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all">
                                          <Trash2 className="w-4 h-4" />
                                       </button>
                                    </div>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'interview' && (
             /* Interview Tab (Unchanged) */
             <div className="h-full max-w-7xl mx-auto flex flex-col space-y-6 animate-in fade-in zoom-in-95 duration-500 pb-10">
               {!selectedCandidateId ? (
                 <div className="flex-1 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 p-10 text-center">
                    <Mic className="w-16 h-16 mb-4 opacity-10" />
                    <h3 className="text-xl font-black text-slate-400 mb-2">Belum Ada Interview Aktif</h3>
                    <button onClick={() => setActiveTab('candidates')} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-violet-600 transition-all">
                       Ke Antrean Pelamar
                    </button>
                 </div>
               ) : (
                 <div className="flex-1 flex flex-col lg:flex-row bg-white rounded-[2.5rem] border shadow-2xl overflow-hidden">
                    <div className="flex-1 flex flex-col min-w-0 border-r relative">
                       <div className="p-8 border-b flex items-center justify-between bg-slate-50/50 shrink-0">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-2xl bg-violet-600 text-white flex items-center justify-center font-black text-lg">
                                {candidates.find(c => c.id === selectedCandidateId)?.name.charAt(0)}
                             </div>
                             <div>
                                <h3 className="font-black text-slate-800 text-lg">{candidates.find(c => c.id === selectedCandidateId)?.name}</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{candidates.find(c => c.id === selectedCandidateId)?.position}</p>
                             </div>
                          </div>
                          <button onClick={() => setSelectedCandidateId(null)} className="p-2 bg-white text-slate-400 hover:text-rose-500 rounded-xl border border-slate-100 transition-all"><X className="w-5 h-5"/></button>
                       </div>
                       
                       <div className="flex-1 p-8 flex flex-col space-y-6 overflow-hidden">
                          <div className="flex-1 bg-slate-50 rounded-[2rem] p-6 relative flex flex-col">
                             <p className="text-[10px] font-black text-slate-300 uppercase absolute top-4 left-6 tracking-widest">Transcript Percakapan</p>
                             <textarea 
                               className="w-full flex-1 bg-transparent font-mono text-sm leading-relaxed outline-none resize-none text-slate-600 pt-6"
                               placeholder="Input percakapan interview di sini..."
                               value={interviewTranscript}
                               onChange={e => setInterviewTranscript(e.target.value)}
                             />
                          </div>
                          
                          <div className="h-40 bg-violet-50/50 rounded-[2rem] p-6 border border-violet-100/50 overflow-y-auto shrink-0">
                             <h4 className="text-[10px] font-black text-violet-500 uppercase mb-4 tracking-widest flex items-center gap-2"><FileQuestion className="w-3 h-3"/> Pertanyaan Panduan</h4>
                             <div className="space-y-3">
                                {(questionBank[candidates.find(c => c.id === selectedCandidateId)?.position as Position] || []).map((q, i) => (
                                  <div key={i} className="bg-white p-3 rounded-xl border border-violet-100 shadow-sm text-xs font-bold text-slate-600 flex items-center justify-between gap-2">
                                     <div className="flex-1 flex items-start gap-2">
                                       <span className="text-violet-500 min-w-[15px]">{i + 1}.</span> {q.question}
                                     </div>
                                     <span className="bg-violet-100 text-violet-600 text-[8px] font-black px-1.5 py-0.5 rounded ml-2 whitespace-nowrap">{q.weight}%</span>
                                  </div>
                                ))}
                             </div>
                          </div>
                       </div>

                       <div className="p-8 border-t bg-slate-50/50 shrink-0">
                          <button 
                            onClick={handleEvaluate} 
                            disabled={isEvaluating || !interviewTranscript}
                            className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 transition-all ${!interviewTranscript ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white hover:bg-violet-600 shadow-xl shadow-violet-100'}`}
                          >
                             {isEvaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Selesai & Evaluasi AI
                          </button>
                       </div>
                    </div>

                    <div className="w-full lg:w-96 bg-slate-50/30 p-8 flex flex-col space-y-8 overflow-y-auto shrink-0">
                       <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Manual Rating (HR)</h3>
                       <p className="text-[10px] text-slate-500 font-bold -mt-6 mb-4">Catatan internal (tidak mempengaruhi nilai kelulusan)</p>
                       <div className="space-y-6">
                          {MANUAL_CRITERIA.map((crit) => {
                             const currentCandDiv = candidates.find(c => c.id === selectedCandidateId)?.division || '';
                             const label = crit.id === 'knowledge' ? `Pengetahuan Dasar (${currentCandDiv})` : crit.label;
                             
                             return (
                                <div key={crit.id} className="space-y-3">
                                   <div className="flex justify-between items-center">
                                      <span className="text-xs font-black text-slate-500 uppercase tracking-tighter">{label}</span>
                                      <span className="bg-white px-3 py-1 rounded-lg text-xs font-black text-violet-600 border border-slate-100">{currentRaterScores[crit.id]}</span>
                                   </div>
                                   <input 
                                     type="range" 
                                     min="0" max="100" step="5" 
                                     value={currentRaterScores[crit.id]} 
                                     onChange={e => setCurrentRaterScores({...currentRaterScores, [crit.id]: parseInt(e.target.value)})}
                                     className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                                   />
                                </div>
                             );
                          })}
                       </div>
                    </div>
                 </div>
               )}
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="h-full flex flex-col space-y-8 animate-in fade-in zoom-in-95 duration-500">
               {/* Question Bank UI (Unchanged) */}
               <div className="flex justify-between items-center bg-slate-50/80 backdrop-blur-sm sticky top-0 z-30 py-4 px-4 -mx-4 shrink-0">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Bank Soal AI</h2>
                    <p className="text-xs text-slate-500 font-medium">Atur pertanyaan dan Bobot. General (Otomatis Rata), Technical (Edit Manual).</p>
                  </div>
                  <button onClick={handleSaveQuestions} disabled={isSavingQuestions} className="bg-violet-600 text-white px-8 py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center gap-3 hover:bg-violet-700 transition-all">
                    {isSavingQuestions ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Simpan Bank Soal
                  </button>
               </div>

               <div className="flex flex-1 gap-8 min-h-0 overflow-hidden">
                  <div className="w-72 lg:sticky lg:top-0 h-full overflow-y-auto shrink-0 pr-2">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Pilih Posisi</p>
                     <div className="bg-white p-3 rounded-[2rem] border border-slate-100 shadow-sm space-y-1">
                        {Object.keys(questionBank).sort().map((pos) => (
                           <button 
                             key={pos} 
                             onClick={() => setSelectedQuestionPos(pos as Position)}
                             className={`w-full text-left px-4 py-3 rounded-xl text-xs font-black transition-all ${selectedQuestionPos === pos ? 'bg-violet-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                           >
                              {pos}
                           </button>
                        ))}
                     </div>
                     <div className="mt-6 ml-2 space-y-2">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Bobot (Technical)</p>
                       <div className="flex items-center gap-2">
                         <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${currentTotalWeightTechnical === 100 ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                              style={{ width: `${Math.min(currentTotalWeightTechnical, 100)}%` }}
                            ></div>
                         </div>
                         <span className={`text-xs font-black ${currentTotalWeightTechnical === 100 ? 'text-emerald-600' : 'text-rose-500'}`}>{currentTotalWeightTechnical}%</span>
                       </div>
                       {currentTotalWeightTechnical !== 100 && (
                         <p className="text-[9px] text-rose-500 font-bold">Harus 100%</p>
                       )}
                     </div>
                  </div>

                  <div className="flex-1 bg-white rounded-[3rem] border border-slate-100 shadow-sm flex flex-col min-h-0">
                     <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white z-20 shrink-0">
                        <h3 className="font-black text-xl text-slate-800 tracking-tight">{selectedQuestionPos}</h3>
                        <div className="flex gap-2">
                           <button onClick={() => addQuestion(selectedQuestionPos, 'General')} className="bg-slate-50 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-100 hover:bg-violet-50 hover:text-violet-600 transition-all flex items-center gap-2">
                              <Plus className="w-3 h-3" /> + Soal Umum (Auto %)
                           </button>
                           <button onClick={() => addQuestion(selectedQuestionPos, 'Technical')} className="bg-violet-50 text-violet-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-violet-100 hover:bg-violet-600 hover:text-white transition-all flex items-center gap-2">
                              <Plus className="w-3 h-3" /> + Soal Teknis
                           </button>
                        </div>
                     </div>

                     <div className="flex-1 overflow-y-auto p-8 space-y-6">
                        {questionBank[selectedQuestionPos]?.map((q, i) => (
                          <div 
                             key={i} 
                             draggable
                             onDragStart={() => (dragItem.current = i)}
                             onDragEnter={() => (dragOverItem.current = i)}
                             onDragEnd={handleSort}
                             onDragEndCapture={handleSort}
                             onDragOver={(e) => e.preventDefault()}
                             className={`group relative p-6 rounded-3xl border-2 transition-all duration-300 cursor-move ${editingQuestionId === q.id ? 'bg-violet-50/50 border-violet-200' : 'bg-slate-50/50 border-transparent hover:border-violet-100 hover:bg-white'}`}
                           >
                             <div className="flex items-center gap-3 mb-4">
                                <GripVertical className="w-5 h-5 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing" />
                                <span className="bg-violet-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm">
                                   {i + 1}
                                </span>
                                <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${q.category === 'Technical' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-700'}`}>
                                   {q.category} {q.category === 'General' && <Globe className="w-2 h-2"/>}
                                </span>
                                {q.category === 'General' && <span className="text-[8px] font-bold text-slate-400">Syncs to All</span>}
                                
                                <div className="ml-auto flex items-center gap-2">
                                  {/* Weight Display / Edit */}
                                  <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded-lg mr-2">
                                     <Scale className="w-3 h-3 text-slate-400" />
                                     {editingQuestionId === q.id && q.category === 'Technical' ? (
                                        <input 
                                           type="number" 
                                           className="w-10 text-xs font-black text-center outline-none bg-slate-50"
                                           value={q.weight}
                                           onChange={(e) => updateQuestion(q.id, 'weight', parseInt(e.target.value) || 0)}
                                        />
                                     ) : (
                                        <span className="text-xs font-black text-slate-700">{q.weight}%</span>
                                     )}
                                  </div>

                                  {editingQuestionId === q.id ? (
                                     <button onClick={() => setEditingQuestionId(null)} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all shadow-md">
                                        <Check className="w-4 h-4" />
                                     </button>
                                  ) : (
                                     <button onClick={() => setEditingQuestionId(q.id)} className="p-2 bg-white text-slate-400 hover:text-violet-600 rounded-lg border border-slate-100 hover:border-violet-200 transition-all">
                                        <Edit className="w-4 h-4" />
                                     </button>
                                  )}
                                  
                                  <button onClick={() => deleteQuestion(selectedQuestionPos, q.id, q.category)} className="p-2 bg-white text-slate-300 hover:text-rose-500 rounded-lg border border-transparent hover:border-rose-100 transition-all">
                                     <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                             </div>
                             
                             <div className="space-y-4 ml-8">
                                {editingQuestionId === q.id ? (
                                  <>
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold text-slate-400 uppercase">Pertanyaan</label>
                                      <textarea 
                                        value={q.question} 
                                        onChange={e => updateQuestion(q.id, 'question', e.target.value)}
                                        className="w-full bg-white font-bold text-slate-800 outline-none p-4 rounded-xl border border-violet-200 focus:ring-2 focus:ring-violet-100 transition-all"
                                        rows={3}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold text-slate-400 uppercase">Jawaban Ideal (Panduan AI)</label>
                                      <textarea 
                                        value={q.idealAnswer} 
                                        onChange={e => updateQuestion(q.id, 'idealAnswer', e.target.value)}
                                        className="w-full bg-violet-50 p-4 rounded-xl text-xs font-medium text-violet-700 border border-violet-100 outline-none focus:ring-2 focus:ring-violet-100 transition-all italic"
                                        rows={3}
                                      />
                                    </div>
                                    {q.category === 'General' && (
                                       <p className="text-[10px] text-amber-600 font-bold italic bg-amber-50 p-2 rounded-lg">
                                          *Bobot soal General diatur otomatis (Rata-rata).
                                       </p>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <p className="font-bold text-slate-700 text-sm leading-relaxed">{q.question}</p>
                                    <div className="bg-violet-50/50 p-3 rounded-xl border border-violet-50">
                                      <p className="text-xs font-medium text-violet-600/80 italic leading-relaxed">"{q.idealAnswer}"</p>
                                    </div>
                                  </>
                                )}
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </main>

      {/* Rapor & Transcript Detail Modal (Same as before) */}
      {viewingCandidate && (
        <div className="fixed inset-0 z-[50] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
           {/* ... existing modal code ... */}
           <div className="bg-white w-full max-w-5xl max-h-[95vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-500">
             <div className={`p-8 flex items-center justify-between border-b ${viewingCandidate.status === 'LULUS' ? 'bg-emerald-50/50' : 'bg-rose-50/50'} shrink-0`}>
                <div className="flex items-center gap-6">
                   <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-2xl shadow-xl ${viewingCandidate.status === 'LULUS' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                      {viewingCandidate.name.charAt(0)}
                   </div>
                   <div>
                      <h2 className="text-3xl font-black text-slate-800 tracking-tight">{viewingCandidate.name}</h2>
                      <p className="text-sm font-bold text-slate-500 flex items-center gap-2 uppercase tracking-tighter mt-1">
                        <Briefcase className="w-4 h-4" /> {viewingCandidate.position} | {viewingCandidate.division}
                      </p>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                   <div className="text-right mr-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Skor Akhir</p>
                      <h3 className={`text-4xl font-black ${viewingCandidate.status === 'LULUS' ? 'text-emerald-600' : 'text-rose-600'}`}>{viewingCandidate.evaluation?.score || 0}/100</h3>
                   </div>
                   <button onClick={() => { setViewingCandidate(null); setShowTranscriptInModal(false); }} className="p-3 bg-white text-slate-400 hover:text-rose-500 rounded-2xl border transition-all active:scale-90"><X className="w-6 h-6"/></button>
                </div>
             </div>
             
             <div className="flex-1 overflow-y-auto p-10 space-y-10">
                {showTranscriptInModal ? (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                     <div className="flex items-center justify-between border-b pb-4">
                        <h4 className="text-xl font-black text-slate-800 flex items-center gap-2"><MessageSquare className="w-6 h-6 text-violet-600" /> Transkrip Wawancara</h4>
                        <button onClick={() => setShowTranscriptInModal(false)} className="text-violet-600 font-bold text-sm hover:underline">Kembali ke Rapor</button>
                     </div>
                     <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 font-mono text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                        {viewingCandidate.transcript || "Tidak ada transkrip tersedia."}
                     </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><CreditCard className="w-4 h-4"/> Kelengkapan Dokumen</h4>
                       <div className="flex gap-4 flex-wrap">
                          <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${viewingCandidate.documents?.ktp ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                             {viewingCandidate.documents?.ktp ? <CheckCircle2 className="w-4 h-4"/> : <XCircle className="w-4 h-4"/>}
                             <span className="text-xs font-bold">KTP</span>
                          </div>
                          <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${viewingCandidate.documents?.kk ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                             {viewingCandidate.documents?.kk ? <CheckCircle2 className="w-4 h-4"/> : <XCircle className="w-4 h-4"/>}
                             <span className="text-xs font-bold">Kartu Keluarga</span>
                          </div>
                          {(viewingCandidate.division === Division.OPERASI || viewingCandidate.position === 'Umum') && (
                            <>
                                <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${viewingCandidate.documents?.simA ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                                   {viewingCandidate.documents?.simA ? <CheckCircle2 className="w-4 h-4"/> : <XCircle className="w-4 h-4"/>}
                                   <span className="text-xs font-bold">SIM A</span>
                                </div>
                                <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${viewingCandidate.documents?.simC ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                                   {viewingCandidate.documents?.simC ? <CheckCircle2 className="w-4 h-4"/> : <XCircle className="w-4 h-4"/>}
                                   <span className="text-xs font-bold">SIM C</span>
                                </div>
                            </>
                          )}
                       </div>
                    </div>

                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Activity className="w-4 h-4"/> Hasil Penilaian (Bobot 50:50)</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-violet-50/50 p-6 rounded-[2rem] border border-violet-50 flex items-center justify-between">
                             <div>
                                <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest">General Score</p>
                                <p className="text-xs text-slate-500 font-medium mt-1">Soft Skill, Culture Fit</p>
                             </div>
                             <div className="text-right">
                                <span className="text-3xl font-black text-slate-800">{viewingCandidate.evaluation?.generalScore || 0}</span>
                                <span className="text-xs font-bold text-slate-400">/100</span>
                             </div>
                          </div>
                          <div className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-50 flex items-center justify-between">
                             <div>
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Technical Score</p>
                                <p className="text-xs text-slate-500 font-medium mt-1">Hard Skill, Studi Kasus</p>
                             </div>
                             <div className="text-right">
                                <span className="text-3xl font-black text-slate-800">{viewingCandidate.evaluation?.technicalScore || 0}</span>
                                <span className="text-xs font-bold text-slate-400">/100</span>
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                       <div className="lg:col-span-2 space-y-4">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Kesimpulan AI</h4>
                          <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 relative">
                             <div className="absolute top-4 left-4 text-4xl text-slate-200 opacity-50 font-serif leading-none">"</div>
                             <p className="text-sm text-slate-600 leading-relaxed italic font-medium px-4">{viewingCandidate.evaluation?.summary}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-6 mt-6">
                             <div className="space-y-3">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Kekuatan</p>
                                <ul className="space-y-2">
                                   {viewingCandidate.evaluation?.strengths.map((s, i) => (
                                      <li key={i} className="text-xs font-bold text-slate-700 bg-emerald-50 px-3 py-2 rounded-xl flex items-start gap-2 border border-emerald-100/50">• {s}</li>
                                   ))}
                                </ul>
                             </div>
                             <div className="space-y-3">
                                <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Kelemahan</p>
                                <ul className="space-y-2">
                                   {viewingCandidate.evaluation?.weaknesses.map((w, i) => (
                                      <li key={i} className="text-xs font-bold text-slate-700 bg-rose-50 px-3 py-2 rounded-xl flex items-start gap-2 border border-rose-100/50">• {w}</li>
                                   ))}
                                </ul>
                             </div>
                          </div>
                       </div>

                       <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Opsi Lanjutan</h4>
                          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 space-y-4 shadow-sm">
                             <div className="flex items-center gap-4">
                                <div className="p-2 bg-violet-50 rounded-xl text-violet-600"><Mail className="w-4 h-4" /></div>
                                <div><p className="text-[9px] font-black text-slate-400 uppercase">Email</p><p className="text-xs font-bold">{viewingCandidate.email}</p></div>
                             </div>
                             <div className="flex items-center gap-4">
                                <div className="p-2 bg-violet-50 rounded-xl text-violet-600"><Phone className="w-4 h-4" /></div>
                                <div><p className="text-[9px] font-black text-slate-400 uppercase">Telepon</p><p className="text-xs font-bold">{viewingCandidate.phone}</p></div>
                             </div>
                             
                             {/* Re-Evaluate Button (Visible only if transcript exists) */}
                             {viewingCandidate.transcript && (
                               <button 
                                 onClick={handleReEvaluate} 
                                 disabled={isEvaluating}
                                 className="w-full p-4 bg-amber-50 text-amber-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-amber-100 border border-amber-100 transition-all flex items-center justify-center gap-2"
                               >
                                  {isEvaluating ? <Loader2 className="w-4 h-4 animate-spin"/> : <RefreshCw className="w-4 h-4" />}
                                  Evaluasi Ulang AI
                               </button>
                             )}
                          </div>
                          
                          <button 
                            onClick={() => setShowTranscriptInModal(true)} 
                            className="w-full p-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-violet-600 transition-all shadow-xl"
                          >
                             Lihat Transkrip Lengkap
                          </button>
                       </div>
                    </div>
                  </>
                )}
             </div>
             
             <div className="p-8 border-t bg-slate-50 flex justify-end gap-4 shrink-0">
                <button onClick={() => { setViewingCandidate(null); setShowTranscriptInModal(false); }} className="px-8 py-3.5 bg-white text-slate-500 border border-slate-200 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all">Tutup</button>
                <button onClick={() => generateBODReport([viewingCandidate], '', '')} className="px-8 py-3.5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-violet-600 transition-all flex items-center gap-2">
                   <Download className="w-4 h-4"/> PDF Report
                </button>
             </div>
           </div>
        </div>
      )}

      {/* Add/Edit Modal (Unchanged) ... */}
      {/* Alert Modal (Unchanged) ... */}
      {/* Confirm Modal (Unchanged) ... */}
      
      {/* Re-include modal/alerts because I replaced the entire App.tsx */}
      {showAddModal && (
        <div className="fixed inset-0 z-[50] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl relative animate-in zoom-in-95 duration-500 max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowAddModal(false)} className="absolute top-8 right-8 text-slate-300 hover:text-rose-500 transition-all"><X className="w-6 h-6"/></button>
              <h3 className="text-2xl font-black text-slate-800 mb-6 tracking-tight">
                {isEditing ? 'Edit Data Pelamar' : 'Tambah Pelamar'}
              </h3>
              
              {!isEditing && (
                <div className="mb-8 p-4 bg-violet-50 rounded-2xl border-2 border-dashed border-violet-200 flex flex-col items-center justify-center gap-3 relative overflow-hidden group">
                   {isParsing ? (
                     <>
                       <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
                       <p className="text-xs font-black text-violet-600 uppercase animate-pulse">AI Sedang Scan CV...</p>
                     </>
                   ) : (
                     <>
                       <Upload className="w-8 h-8 text-violet-600" />
                       <div className="text-center">
                          <p className="text-xs font-black text-violet-600 uppercase">Upload PDF CV / Foto CV</p>
                          <p className="text-[9px] text-violet-400 font-bold">Data akan terisi otomatis oleh AI</p>
                       </div>
                       <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="application/pdf,image/*" className="absolute inset-0 opacity-0 cursor-pointer" />
                     </>
                   )}
                </div>
              )}

              <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                       <input type="text" value={newCandName} onChange={e => setNewCandName(e.target.value)} placeholder="Nama..." className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-violet-500 outline-none transition-all" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                       <input type="email" value={newCandEmail} onChange={e => setNewCandEmail(e.target.value)} placeholder="Email..." className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-violet-500 outline-none transition-all" />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telepon</label>
                    <input type="text" value={newCandPhone} onChange={e => setNewCandPhone(e.target.value)} placeholder="No. WA..." className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-violet-500 outline-none transition-all" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Divisi</label>
                       <select value={newCandDiv} onChange={e => {setNewCandDiv(e.target.value as Division); setNewCandPos('');}} className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-violet-500 outline-none transition-all">
                          <option value="">Divisi...</option>
                          {Object.values(Division).map(d => <option key={d} value={d}>{d}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Posisi</label>
                       <select value={newCandPos} onChange={e => setNewCandPos(e.target.value as Position)} disabled={!newCandDiv} className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-violet-500 outline-none transition-all disabled:opacity-50">
                          <option value="">Posisi...</option>
                          {newCandDiv && DIVISION_POSITIONS[newCandDiv as Division].map(p => <option key={p} value={p}>{p}</option>)}
                       </select>
                    </div>
                 </div>

                 {/* Document Checklist */}
                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Kelengkapan Dokumen</p>
                    <div className="flex gap-4">
                       <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={hasKtp} onChange={e => setHasKtp(e.target.checked)} className="w-4 h-4 accent-violet-600 rounded" />
                          <span className="text-xs font-bold text-slate-700">KTP</span>
                       </label>
                       <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={hasKk} onChange={e => setHasKk(e.target.checked)} className="w-4 h-4 accent-violet-600 rounded" />
                          <span className="text-xs font-bold text-slate-700">KK</span>
                       </label>
                    </div>
                    
                    {/* Conditional SIM Requirements */}
                    {isSimRequired && (
                      <div className="flex gap-4 pt-2 border-t border-slate-200/50">
                         <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={hasSimA} onChange={e => setHasSimA(e.target.checked)} className="w-4 h-4 accent-violet-600 rounded" />
                            <span className="text-xs font-bold text-slate-700">SIM A</span>
                         </label>
                         <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={hasSimC} onChange={e => setHasSimC(e.target.checked)} className="w-4 h-4 accent-violet-600 rounded" />
                            <span className="text-xs font-bold text-slate-700">SIM C</span>
                         </label>
                      </div>
                    )}
                 </div>

                 <button onClick={handleSaveCandidate} disabled={isParsing} className="w-full bg-violet-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-violet-700 transition-all active:scale-95 flex items-center justify-center gap-2 mt-4">
                    {isParsing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} 
                    {isEditing ? 'Simpan Perubahan' : 'Simpan Pelamar'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      {alertState.show && (
        <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-sm w-full text-center space-y-4 animate-in zoom-in-95 duration-300">
              <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center ${
                alertState.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
                alertState.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-violet-100 text-violet-600'
              }`}>
                {alertState.type === 'success' ? <CheckCircle2 className="w-8 h-8"/> :
                 alertState.type === 'error' ? <XCircle className="w-8 h-8"/> : <Info className="w-8 h-8"/>}
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">
                  {alertState.type === 'success' ? 'Berhasil!' : alertState.type === 'error' ? 'Oops!' : 'Info'}
                </h3>
                <p className="text-xs font-medium text-slate-500 mt-1 leading-relaxed px-4">{alertState.message}</p>
              </div>
              <button 
                onClick={() => setAlertState(prev => ({ ...prev, show: false }))}
                className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all"
              >
                Tutup
              </button>
           </div>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {confirmState.show && (
        <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-sm w-full text-center space-y-4 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
                 <AlertTriangle className="w-8 h-8"/>
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">Konfirmasi</h3>
                <p className="text-xs font-medium text-slate-500 mt-1 leading-relaxed px-4">{confirmState.message}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setConfirmState(prev => ({ ...prev, show: false }))}
                  className="py-3.5 bg-slate-100 text-slate-500 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
                >
                  Batal
                </button>
                <button 
                  onClick={() => {
                    confirmState.onConfirm();
                    setConfirmState(prev => ({ ...prev, show: false }));
                  }}
                  className="py-3.5 bg-violet-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-violet-700 transition-all"
                >
                  Ya, Lanjutkan
                </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default App;
