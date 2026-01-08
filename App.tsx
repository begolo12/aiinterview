
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, Mic, CheckCircle2, LayoutDashboard, Loader2, Briefcase, History,
  Plus, X, Trash2, Activity, Trophy, Star, LogOut,
  FileQuestion, Save, Search, BarChart3, ChevronRight, Download, Mail, Phone, Clock,
  MapPin, AlertCircle, MessageSquare, Upload, Edit, Check, Globe, CreditCard, GripVertical, RefreshCw, AlertTriangle, Info, Scale, FolderPlus, XCircle, MicOff, Square, Play, UserPlus, ArrowLeft, Smartphone, Calendar
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

import { Candidate, Division, Position, EvaluationResult, User as UserType, QuestionTemplate } from './types';
import { DIVISION_POSITIONS as INITIAL_DIV_POS, QUESTION_TEMPLATES as DEFAULT_TEMPLATES } from './constants';
import { evaluateInterview, parseCV } from './services/geminiService';
import { seedUsers, loginUser } from './services/authService';
import { db } from './services/firebase';
import { collection, getDocs, updateDoc, doc, query, orderBy, setDoc, getDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { generateBODReport } from './services/reportService';

const DEFAULT_SCORES = { appearance: 75, attitude: 75, communication: 75, enthusiasm: 75, knowledge: 75 };

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [loginData, setLoginData] = useState({ user: '', pass: '' });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'candidates' | 'database' | 'interview' | 'questions'>('dashboard');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [interviewTranscript, setInterviewTranscript] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [manualScores, setManualScores] = useState({...DEFAULT_SCORES});
  const [searchTerm, setSearchTerm] = useState('');
  const [interviewSearch, setInterviewSearch] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [selectedForReport, setSelectedForReport] = useState<string[]>([]);

  // Config States
  const [divPos, setDivPos] = useState<Record<Division, Position[]>>(INITIAL_DIV_POS);
  const [questionBank, setQuestionBank] = useState<Record<Position, QuestionTemplate[]>>(DEFAULT_TEMPLATES);
  const [selPos, setSelPos] = useState<Position>('Office Boy (OB)');
  
  // UI & Form States
  const [viewingCand, setViewingCand] = useState<Candidate | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [alert, setAlert] = useState({ show: false, msg: '', type: 'info' as any });
  const [form, setForm] = useState({ 
    name: '', div: '' as any, pos: '', email: '', phone: '', 
    ktp: false, kk: false, simA: false, simC: false 
  });

  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition once on mount
  useEffect(() => {
    seedUsers();
    refreshData();
    const saved = localStorage.getItem('daniswaraUser');
    if (saved) setCurrentUser(JSON.parse(saved));

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'id-ID';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setInterviewTranscript(prev => prev + ' ' + finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        if (event.error === 'not-allowed') {
          showAlert("Izin mikrofon ditolak!", "error");
          setIsRecording(false);
        }
      };

      recognition.onend = () => {
        // Auto-restart if we are still supposed to be recording
        if (recognitionRef.current.activeRecording) {
          try { recognition.start(); } catch(e) {}
        }
      };

      recognitionRef.current = {
        instance: recognition,
        activeRecording: false
      };
    }
  }, []);

  const refreshData = async () => {
    try {
      const q = query(collection(db, "candidates"), orderBy("name")); 
      const snap = await getDocs(q);
      setCandidates(snap.docs.map(d => ({ id: d.id, ...d.data() } as Candidate)));
      
      const cfg = await getDoc(doc(db, 'settings', 'config'));
      if (cfg.exists()) setDivPos(cfg.data().divisionPositions);
      
      const qb = await getDoc(doc(db, 'question_templates', 'all'));
      if (qb.exists()) setQuestionBank(qb.data().templates);
    } catch (e) { console.error("Refresh Error:", e); }
  };

  const showAlert = (msg: string, type: any = 'info') => {
    setAlert({ show: true, msg, type });
    setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
  };

  const toggleRecording = () => {
    if (!recognitionRef.current?.instance) {
      return showAlert("Browser Anda tidak mendukung Voice-to-Text.", "error");
    }

    if (isRecording) {
      recognitionRef.current.activeRecording = false;
      recognitionRef.current.instance.stop();
      setIsRecording(false);
      showAlert("Perekaman berhenti.", "info");
    } else {
      setInterviewTranscript('');
      recognitionRef.current.activeRecording = true;
      try {
        recognitionRef.current.instance.start();
        setIsRecording(true);
        showAlert("Perekaman dimulai (Bicara sekarang)...", "success");
      } catch (e) {
        console.error("Start Error:", e);
      }
    }
  };

  const handleCV = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsing(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const b64 = (ev.target?.result as string).split(',')[1];
        const res = await parseCV(b64, file.type);
        setForm(prev => ({ 
          ...prev, 
          name: res.name || prev.name, 
          email: res.email || prev.email, 
          phone: res.phone || prev.phone 
        }));
        showAlert("CV Berhasil di-scan AI!", "success");
      } catch (err) { showAlert("Gagal membaca CV.", "error"); }
      finally { setIsParsing(false); }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCand = async () => {
    if (!form.name || !form.div || !form.pos) return showAlert("Mohon lengkapi Nama, Divisi, dan Posisi!", "error");
    setIsParsing(true);
    try {
      const docData = { 
        name: form.name, email: form.email, phone: form.phone, 
        division: form.div, position: form.pos,
        documents: { ktp: form.ktp, kk: form.kk, simA: form.simA, simC: form.simC } 
      };

      if (isEditing && editId) {
        await updateDoc(doc(db, "candidates", editId), docData);
        showAlert("Data Pelamar Diperbarui!", "success");
      } else {
        await addDoc(collection(db, "candidates"), { 
          ...docData, 
          status: 'Interview', 
          summary: '-', 
          experience: '-',
          skills: [],
          education: '-'
        });
        showAlert("Pelamar Berhasil Ditambahkan!", "success");
      }
      setShowAddModal(false);
      refreshData();
    } catch(e) { showAlert("Gagal menyimpan data.", "error"); }
    finally { setIsParsing(false); }
  };

  const handleEvaluate = async (reEvaluateId?: string) => {
    const targetId = reEvaluateId || selectedCandidateId;
    if (!targetId) return;
    
    setIsEvaluating(true);
    if (isRecording) toggleRecording();

    try {
      const cand = candidates.find(c => c.id === targetId)!;
      const transcriptToUse = reEvaluateId ? (cand.transcript || '') : interviewTranscript;
      
      const res = await evaluateInterview(
        cand, 
        transcriptToUse, 
        cand.position, 
        manualScores, 
        questionBank[cand.position] || []
      );

      await updateDoc(doc(db, "candidates", cand.id), { 
        status: res.verdict, 
        evaluation: res, 
        transcript: transcriptToUse 
      });

      refreshData();
      setViewingCand({ ...cand, evaluation: res, transcript: transcriptToUse, status: res.verdict });
      if (!reEvaluateId) {
        setSelectedCandidateId(null);
        setInterviewTranscript('');
      }
      showAlert(reEvaluateId ? "Berhasil Evaluasi Ulang!" : "Evaluasi Selesai!", "success");
    } catch(e) { showAlert("Evaluasi gagal.", "error"); }
    finally { setIsEvaluating(false); }
  };

  const stats = useMemo(() => {
    const evaled = candidates.filter(c => c.evaluation);
    const passed = candidates.filter(c => c.status === 'LULUS').length;
    return {
      total: candidates.length,
      passed,
      avg: evaled.length ? Math.round(evaled.reduce((a, b) => a + (b.evaluation?.score || 0), 0) / evaled.length) : 0,
      dist: [
        { name: 'Lulus', value: passed, color: '#10b981' },
        { name: 'Gagal', value: candidates.filter(c => c.status === 'TIDAK LULUS').length, color: '#f43f5e' },
        { name: 'Proses', value: candidates.filter(c => c.status === 'Interview').length, color: '#3b82f6' }
      ]
    };
  }, [candidates]);

  const filtered = candidates.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const interviewFiltered = candidates.filter(c => 
    (c.status === 'Interview' || c.status === 'Draft') &&
    (c.name.toLowerCase().includes(interviewSearch.toLowerCase()) || 
     c.position.toLowerCase().includes(interviewSearch.toLowerCase()))
  );

  const handleToggleSelection = (id: string) => {
    setSelectedForReport(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedForReport.length === filtered.length) {
      setSelectedForReport([]);
    } else {
      setSelectedForReport(filtered.map(c => c.id));
    }
  };

  const handleGenerateSelectedReport = () => {
    const targets = selectedForReport.length > 0 
      ? candidates.filter(c => selectedForReport.includes(c.id))
      : candidates;
    
    if (targets.length === 0) return showAlert("Pilih kandidat terlebih dahulu!", "error");
    generateBODReport(targets, '', '');
  };

  if (!currentUser) return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-violet-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"><Users className="text-white w-8 h-8" /></div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">DANISWARA</h1>
          <p className="text-slate-400 text-xs font-bold uppercase mt-1">AI Recruitment Platform</p>
        </div>
        <div className="space-y-4">
          <input type="text" placeholder="Username" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-violet-500" value={loginData.user} onChange={e => setLoginData({...loginData, user: e.target.value})} />
          <input type="password" placeholder="Password" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-violet-500" value={loginData.pass} onChange={e => setLoginData({...loginData, pass: e.target.value})} />
          <button onClick={async () => {
            const u = await loginUser(loginData.user, loginData.pass);
            if (u) { setCurrentUser(u); localStorage.setItem('daniswaraUser', JSON.stringify(u)); } else showAlert("Username/Password Salah", "error");
          }} className="w-full bg-violet-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-violet-700 transition-all">Sign In</button>
        </div>
      </div>
    </div>
  );

  const selectedCand = candidates.find(c => c.id === selectedCandidateId);
  const currentQuestions = selectedCand ? (questionBank[selectedCand.position] || []) : [];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r flex flex-col p-6 space-y-8 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-violet-600 p-2 rounded-xl rotate-3 shadow-lg shadow-violet-200"><Users className="text-white w-6 h-6" /></div>
          <div>
            <span className="font-black text-xl tracking-tighter uppercase block leading-none">Daniswara</span>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Onboarding AI</span>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'candidates', icon: Users, label: 'Antrean Pelamar' },
            { id: 'database', icon: History, label: 'Database' },
            { id: 'interview', icon: Mic, label: 'Live Interview' },
            { id: 'questions', icon: FileQuestion, label: 'Bank Soal AI', role: 'HR' }
          ].filter(i => !i.role || currentUser.role === i.role).map(i => (
            <button key={i.id} onClick={() => setActiveTab(i.id as any)} className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all ${activeTab === i.id ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
              <i.icon className="w-5 h-5" /> {i.label}
            </button>
          ))}
        </nav>
        <div className="pt-6 border-t">
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-2xl mb-4">
             <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-xs">{currentUser.name.charAt(0)}</div>
             <div className="overflow-hidden"><p className="text-xs font-bold truncate">{currentUser.name}</p><p className="text-[10px] text-slate-400 font-black uppercase">{currentUser.role}</p></div>
          </div>
          <button onClick={() => { setCurrentUser(null); localStorage.clear(); }} className="w-full flex items-center gap-3 px-5 py-3 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-50 rounded-2xl transition-all">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 bg-white border-b flex items-center justify-between px-8 z-10">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <input type="text" placeholder="Cari nama atau posisi kandidat..." className="w-full pl-11 pr-4 py-2.5 bg-slate-50 rounded-xl text-xs font-medium border border-transparent focus:bg-white focus:border-violet-200 outline-none transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <button onClick={() => { setIsEditing(false); setForm({name:'', div:'' as any, pos:'', email:'', phone:'', ktp:false, kk:false, simA:false, simC:false}); setShowAddModal(true); }} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95">
            <Plus className="w-4 h-4" /> Tambah Pelamar
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-4 gap-6">
                {[
                  { label: 'Total Pelamar', val: stats.total, icon: Users, color: 'violet' },
                  { label: 'Kandidat Lolos', val: stats.passed, icon: Trophy, color: 'emerald' },
                  { label: 'Rata-rata Skor', val: stats.avg, icon: Star, color: 'amber' },
                  { label: 'Pass Rate %', val: `${Math.round((stats.passed/stats.total)*100 || 0)}%`, icon: Activity, color: 'blue' }
                ].map((s, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-5">
                    <div className={`w-14 h-14 bg-${s.color}-50 rounded-2xl flex items-center justify-center text-${s.color}-600 shrink-0`}><s.icon className="w-7 h-7" /></div>
                    <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{s.label}</p><h3 className="text-3xl font-black">{s.val}</h3></div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 bg-white p-8 rounded-[2.5rem] border shadow-sm h-96">
                  <h3 className="text-xs font-black uppercase text-slate-800 mb-6 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-violet-500" /> Distribusi Skor & Status</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.dist} barSize={60}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 700, fill: '#64748b'}} />
                        <YAxis hide />
                        <RechartsTooltip cursor={{fill: 'transparent'}} />
                        <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                          {stats.dist.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col items-center">
                  <h3 className="text-xs font-black uppercase text-slate-800 mb-8 self-start">Rasio Kelulusan</h3>
                  <div className="flex-1 w-full relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={stats.dist} innerRadius={60} outerRadius={90} paddingAngle={8} dataKey="value">
                          {stats.dist.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                       <span className="text-3xl font-black">{stats.passed}</span>
                       <span className="text-[10px] font-black text-emerald-600 uppercase">Hired</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'candidates' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500 pb-10">
              {filtered.filter(c => c.status === 'Interview' || c.status === 'Draft').map(c => (
                <div key={c.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-violet-200/40 transition-all flex flex-col group relative overflow-hidden">
                  <div className="absolute top-6 right-6 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                    <button onClick={() => { 
                      setEditId(c.id); 
                      setIsEditing(true); 
                      setForm({
                        name: c.name, div: c.division, pos: c.position, 
                        email: c.email, phone: c.phone, 
                        ktp: c.documents?.ktp || false, kk: c.documents?.kk || false, 
                        simA: c.documents?.simA || false, simC: c.documents?.simC || false
                      }); 
                      setShowAddModal(true); 
                    }} className="p-2.5 bg-slate-50 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all shadow-sm"><Edit className="w-4 h-4"/></button>
                    <button onClick={async (e) => { e.stopPropagation(); if(confirm("Hapus data pelamar ini?")) { await deleteDoc(doc(db, "candidates", c.id)); refreshData(); showAlert("Data dihapus", "success"); } }} className="p-2.5 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shadow-sm"><Trash2 className="w-4 h-4"/></button>
                  </div>
                  <div className="w-16 h-16 rounded-[1.5rem] bg-violet-50 text-violet-600 flex items-center justify-center font-black text-xl mb-6 shadow-inner">{c.name.charAt(0)}</div>
                  <h3 className="text-xl font-black text-slate-800 pr-12">{c.name}</h3>
                  <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-tighter flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5"/> {c.position}</p>
                  <div className="mt-8 pt-6 border-t border-slate-50 space-y-3">
                    <button onClick={() => { setSelectedCandidateId(c.id); setInterviewTranscript(c.transcript || ''); setActiveTab('interview'); }} className="w-full bg-slate-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-violet-600 shadow-lg shadow-violet-100 transition-all active:scale-95">
                      <Mic className="w-4 h-4" /> Mulai Interview
                    </button>
                    <button onClick={() => setViewingCand(c)} className="w-full py-3 text-slate-400 font-black text-[10px] uppercase hover:bg-slate-50 hover:text-slate-800 rounded-2xl transition-all tracking-widest">Detail Profile</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'interview' && (
            <div className="h-full animate-in zoom-in-95 duration-500 pb-10">
              {!selectedCandidateId ? (
                <div className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-sm min-h-full">
                  <div className="flex justify-between items-center mb-10">
                    <div>
                       <h2 className="text-3xl font-black text-slate-800 tracking-tight">Pilih Pelamar Interview</h2>
                       <p className="text-slate-400 text-sm font-medium">Hanya pelamar di database dengan status 'Interview' yang muncul di sini.</p>
                    </div>
                    <div className="relative w-80">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input type="text" placeholder="Cari pelamar..." className="w-full pl-11 pr-4 py-3 bg-slate-50 rounded-2xl text-xs font-bold border border-transparent focus:bg-white focus:border-violet-100 outline-none transition-all" value={interviewSearch} onChange={e => setInterviewSearch(e.target.value)} />
                    </div>
                  </div>
                  
                  {interviewFiltered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-200">
                       <Users className="w-20 h-20 mb-4 opacity-10"/>
                       <p className="text-xl font-black">Tidak ada pelamar yang cocok</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {interviewFiltered.map(c => (
                        <div key={c.id} onClick={() => setSelectedCandidateId(c.id)} className="p-8 bg-slate-50 rounded-[2.5rem] border-2 border-transparent hover:border-violet-600 hover:bg-white hover:shadow-xl hover:shadow-violet-200/20 transition-all cursor-pointer group flex flex-col items-center text-center">
                           <div className="w-20 h-20 rounded-[1.8rem] bg-white shadow-sm flex items-center justify-center text-2xl font-black text-slate-400 group-hover:bg-violet-600 group-hover:text-white transition-all mb-6">
                              {c.name.charAt(0)}
                           </div>
                           <h4 className="font-black text-slate-800 text-lg group-hover:text-violet-600 transition-colors leading-tight mb-1">{c.name}</h4>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{c.position}</p>
                           <button className="mt-auto w-full py-3 bg-white border border-slate-200 rounded-2xl text-[9px] font-black uppercase tracking-widest group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-all">Mulai Sesi</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden">
                  <div className="flex-1 flex flex-col p-10 border-r relative min-w-0">
                    <div className="flex justify-between items-center mb-8 shrink-0">
                      <div className="flex items-center gap-4">
                        <button onClick={() => setSelectedCandidateId(null)} className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-slate-800"><ArrowLeft className="w-6 h-6"/></button>
                        <div className="w-14 h-14 bg-violet-600 rounded-[1.2rem] text-white flex items-center justify-center font-black text-xl shadow-lg">
                          {selectedCand?.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-black text-2xl text-slate-800 leading-none mb-1">{selectedCand?.name}</h3>
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{selectedCand?.position}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={toggleRecording} className={`p-4 rounded-2xl transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                          {isRecording ? <Square className="w-4 h-4 fill-white"/> : <Play className="w-4 h-4 fill-slate-600"/>}
                          {isRecording ? 'Stop Recording' : 'Start Recording'}
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 rounded-[2.5rem] p-8 border-2 border-transparent focus-within:border-violet-100 transition-all relative">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest absolute top-4 left-8">Interview Transcript (Live AI)</p>
                      <textarea 
                        className="w-full flex-1 bg-transparent font-mono text-sm leading-relaxed outline-none resize-none pt-4" 
                        placeholder="Gunakan tombol Record untuk voice-to-text, atau ketik transkrip di sini..."
                        value={interviewTranscript} onChange={e => setInterviewTranscript(e.target.value)}
                      />
                    </div>
                    
                    <button onClick={() => handleEvaluate()} disabled={isEvaluating || !interviewTranscript} className={`w-full py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest mt-8 flex items-center justify-center gap-4 shadow-xl transition-all active:scale-95 ${!interviewTranscript ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-violet-600 shadow-violet-200'}`}>
                      {isEvaluating ? <Loader2 className="animate-spin w-5 h-5"/> : <CheckCircle2 className="w-5 h-5"/>} {isEvaluating ? 'Menganalisis Jawaban...' : 'Selesai & Evaluasi AI'}
                    </button>
                  </div>
                  
                  <div className="w-96 bg-slate-50 flex flex-col shrink-0">
                    <div className="p-8 border-b bg-white">
                      <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><FileQuestion className="w-4 h-4 text-violet-500"/> Bank Soal: {selectedCand?.position}</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      {currentQuestions.map((q, idx) => (
                        <div key={q.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                           <div className="flex items-center gap-2 mb-2">
                             <span className="bg-violet-100 text-violet-600 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black">{idx + 1}</span>
                             <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${q.category === 'Technical' ? 'bg-indigo-50 text-indigo-500' : 'bg-amber-50 text-amber-600'}`}>{q.category}</span>
                           </div>
                           <p className="text-[11px] font-bold text-slate-700 leading-relaxed">{q.question}</p>
                        </div>
                      ))}
                    </div>
                    <div className="p-8 bg-white border-t space-y-4">
                      <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Star className="w-4 h-4"/> Manual HR Rating</h3>
                      {['appearance', 'attitude', 'communication'].map(k => (
                        <div key={k} className="space-y-2">
                          <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-500">
                             <span>{k}</span>
                             <span className="text-violet-600">{manualScores[k as keyof typeof manualScores]}</span>
                          </div>
                          <input type="range" min="0" max="100" step="5" className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-600" value={manualScores[k as keyof typeof manualScores]} onChange={e => setManualScores({...manualScores, [k]: parseInt(e.target.value)})} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'database' && (
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-700 pb-10">
              <div className="p-8 border-b flex justify-between items-center bg-slate-50/20">
                <div>
                  <h3 className="font-black text-xl text-slate-800">Database Pelamar</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Pilih pelamar untuk membuat laporan gabungan</p>
                </div>
                <button onClick={handleGenerateSelectedReport} className="bg-violet-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-violet-700 transition-all shadow-lg shadow-violet-100 active:scale-95">
                  <Download className="w-4 h-4"/> {selectedForReport.length > 0 ? `Download (${selectedForReport.length}) Laporan` : 'Download Semua'}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="py-5 px-6 w-12 text-center">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded accent-violet-600 cursor-pointer"
                          checked={selectedForReport.length === filtered.length && filtered.length > 0}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th className="py-5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Kandidat</th>
                      <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Posisi</th>
                      <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Tgl Interview</th>
                      <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                      <th className="py-5 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Score</th>
                      <th className="py-5 px-8 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.map(c => (
                      <tr key={c.id} className={`hover:bg-slate-50/50 transition-all group ${selectedForReport.includes(c.id) ? 'bg-violet-50/30' : ''}`}>
                        <td className="py-5 px-6 text-center">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded accent-violet-600 cursor-pointer"
                            checked={selectedForReport.includes(c.id)}
                            onChange={() => handleToggleSelection(c.id)}
                          />
                        </td>
                        <td className="py-5 px-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-xs text-slate-400 group-hover:bg-violet-600 group-hover:text-white transition-all">{c.name.charAt(0)}</div>
                            <div><p className="font-bold text-slate-800 text-sm">{c.name}</p><p className="text-[10px] text-slate-400 font-medium truncate w-32">{c.email}</p></div>
                          </div>
                        </td>
                        <td className="py-5 px-6"><p className="text-sm font-bold text-slate-700">{c.position}</p></td>
                        <td className="py-5 px-6 text-center">
                          <div className="flex flex-col items-center">
                            <Calendar className="w-3.5 h-3.5 text-slate-300 mb-0.5" />
                            <p className="text-[10px] font-bold text-slate-500 whitespace-nowrap">{c.evaluation?.interviewDate || '-'}</p>
                          </div>
                        </td>
                        <td className="py-5 px-6">
                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                            c.status === 'LULUS' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                            c.status === 'TIDAK LULUS' ? 'bg-red-50 text-red-600 border-red-100' : 
                            'bg-blue-50 text-blue-600 border-blue-100'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-5 px-6 text-center font-black">{c.evaluation?.score || '-'}</td>
                        <td className="py-5 px-8 text-right flex justify-end gap-1">
                          <button onClick={() => setViewingCand(c)} className="p-2.5 text-violet-600 hover:bg-violet-50 rounded-xl transition-all"><ChevronRight className="w-5 h-5"/></button>
                          <button onClick={() => { 
                            setEditId(c.id); 
                            setIsEditing(true); 
                            setForm({
                              name: c.name, div: c.division, pos: c.position, 
                              email: c.email, phone: c.phone, 
                              ktp: c.documents?.ktp || false, kk: c.documents?.kk || false, 
                              simA: c.documents?.simA || false, simC: c.documents?.simC || false
                            }); 
                            setShowAddModal(true); 
                          }} className="p-2.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all"><Edit className="w-5 h-5"/></button>
                          <button onClick={async () => { if(confirm("Hapus data ini?")) { await deleteDoc(doc(db, "candidates", c.id)); refreshData(); showAlert("Data dihapus", "success"); } }} className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-5 h-5"/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="flex gap-8 h-full animate-in fade-in duration-500 pb-10">
              <div className="w-80 space-y-4 shrink-0">
                <h3 className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Bank Soal Per Posisi</h3>
                <div className="bg-white p-3 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-1 overflow-y-auto max-h-[70vh]">
                  {Object.keys(questionBank).sort().map(p => (
                    <button key={p} onClick={() => setSelPos(p)} className={`w-full text-left px-5 py-3.5 rounded-2xl text-xs font-black transition-all ${selPos === p ? 'bg-violet-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex-1 bg-white rounded-[3rem] border border-slate-100 shadow-sm flex flex-col min-w-0">
                <div className="p-10 border-b flex justify-between items-center bg-slate-50/30">
                  <div>
                    <h3 className="font-black text-2xl text-slate-800 leading-none mb-1">{selPos}</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Atur standar pertanyaan wawancara</p>
                  </div>
                  <button onClick={async () => {
                    await setDoc(doc(db, 'question_templates', 'all'), { templates: questionBank });
                    showAlert("Bank Soal Berhasil Disimpan!", "success");
                  }} className="bg-violet-600 text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3 shadow-xl hover:bg-violet-700 transition-all active:scale-95">
                    <Save className="w-4 h-4"/> Simpan Perubahan
                  </button>
                </div>
                <div className="p-10 space-y-6 overflow-y-auto flex-1">
                  {(questionBank[selPos] || []).map((q, idx) => (
                    <div key={q.id} className="p-8 bg-slate-50 rounded-[2.5rem] border border-transparent hover:border-violet-100 transition-all">
                      <div className="flex items-center gap-4 mb-6">
                        <span className="bg-violet-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shadow-md">{idx + 1}</span>
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${q.category === 'Technical' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>{q.category}</span>
                        <div className="ml-auto flex items-center gap-3">
                          <div className="flex items-center gap-1 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-500 shadow-sm"><Scale className="w-3.5 h-3.5"/> {q.weight}%</div>
                        </div>
                      </div>
                      <input 
                        type="text" 
                        className="w-full bg-transparent font-black text-slate-800 text-base outline-none mb-4"
                        value={q.question}
                        onChange={e => {
                          const n = {...questionBank};
                          n[selPos] = n[selPos].map(it => it.id === q.id ? {...it, question: e.target.value} : it);
                          setQuestionBank(n);
                        }}
                      />
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kunci Jawaban Ideal (Panduan AI)</label>
                        <textarea 
                          className="w-full bg-white p-4 rounded-2xl text-xs font-medium text-slate-600 border border-slate-100 outline-none"
                          value={q.idealAnswer}
                          onChange={e => {
                            const n = {...questionBank};
                            n[selPos] = n[selPos].map(it => it.id === q.id ? {...it, idealAnswer: e.target.value} : it);
                            setQuestionBank(n);
                          }}
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* RAPOR EVALUASI - EXECUTIVE DASHBOARD (COMPACT & SINGLE SCREEN) */}
      {viewingCand && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-6xl h-full max-h-[92vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-500">
            
            {/* Header Rapi & Ringkas */}
            <div className={`px-8 py-5 border-b flex justify-between items-center ${viewingCand.status === 'LULUS' ? 'bg-emerald-50/30' : 'bg-red-50/30'}`}>
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl text-white flex items-center justify-center font-black text-2xl shadow-lg ${viewingCand.status === 'LULUS' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                  {viewingCand.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 leading-none mb-1">{viewingCand.name}</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Briefcase className="w-3 h-3"/> {viewingCand.position}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><History className="w-3 h-3"/> {viewingCand.evaluation?.interviewDate || '-'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className={`text-4xl font-black leading-none ${viewingCand.status === 'LULUS' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {viewingCand.evaluation?.score || 0}<span className="text-sm text-slate-300 font-bold ml-1">/100</span>
                  </span>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Final Score</p>
                </div>
                <button onClick={() => setViewingCand(null)} className="p-2.5 bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"><X className="w-5 h-5"/></button>
              </div>
            </div>
            
            <div className="flex-1 flex overflow-hidden">
              {/* SIDEBAR - Profil & Dokumen */}
              <div className="w-72 bg-slate-50 p-6 border-r overflow-y-auto space-y-6 flex flex-col shrink-0">
                <div className="space-y-4">
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Smartphone className="w-3 h-3 text-violet-500"/> Kontak</h4>
                  <div className="space-y-2">
                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Email</p>
                      <p className="text-[11px] font-bold text-slate-700 truncate">{viewingCand.email || '-'}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Telepon</p>
                      <p className="text-[11px] font-bold text-slate-700">{viewingCand.phone || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><CreditCard className="w-3 h-3 text-violet-500"/> Dokumen</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'KTP', ok: viewingCand.documents?.ktp },
                      { label: 'KK', ok: viewingCand.documents?.kk },
                      { label: 'SIM A', ok: viewingCand.documents?.simA },
                      { label: 'SIM C', ok: viewingCand.documents?.simC },
                    ].map((doc, idx) => (
                      <div key={idx} className={`p-2 rounded-lg border flex items-center gap-1.5 transition-all ${doc.ok ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-300 opacity-60'}`}>
                        {doc.ok ? <CheckCircle2 className="w-3 h-3"/> : <XCircle className="w-3 h-3"/>}
                        <span className="text-[8px] font-black uppercase tracking-tight">{doc.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-200">
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><MessageSquare className="w-3 h-3 text-violet-500"/> Summary AI</h4>
                  <div className="bg-slate-900 text-white p-4 rounded-xl text-[10px] leading-relaxed italic font-medium max-h-40 overflow-y-auto">
                    "{viewingCand.evaluation?.summary}"
                  </div>
                </div>
              </div>

              {/* MAIN CONTENT - Analisis & Tabel */}
              <div className="flex-1 p-8 overflow-y-auto space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2"><Trophy className="w-3 h-3"/> Keunggulan</h4>
                    <div className="space-y-1.5">
                      {viewingCand.evaluation?.strengths.map((s, idx) => (
                        <div key={idx} className="bg-emerald-50/50 text-emerald-700 px-3 py-2 rounded-lg text-[10px] font-bold border border-emerald-100/50 flex items-center gap-2">
                          <Check className="w-3 h-3 shrink-0"/> {s}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-[9px] font-black text-red-600 uppercase tracking-widest flex items-center gap-2"><AlertCircle className="w-3 h-3"/> Kekurangan</h4>
                    <div className="space-y-1.5">
                      {viewingCand.evaluation?.weaknesses.map((w, idx) => (
                        <div key={idx} className="bg-red-50/50 text-red-700 px-3 py-2 rounded-lg text-[10px] font-bold border border-red-100/50 flex items-center gap-2">
                          <AlertTriangle className="w-3 h-3 shrink-0"/> {w}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Activity className="w-3 h-3 text-violet-500"/> Detail Skor Jawaban</h4>
                  <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-[10px]">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="py-3 px-5 font-black uppercase tracking-widest text-slate-400">Pertanyaan</th>
                          <th className="py-3 px-4 font-black uppercase tracking-widest text-slate-400 w-16 text-center">Skor</th>
                          <th className="py-3 px-5 font-black uppercase tracking-widest text-slate-400">Analisis AI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {viewingCand.evaluation?.questionBreakdown?.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/30 transition-all">
                            <td className="py-3 px-5">
                              <p className="font-bold text-slate-700 leading-snug mb-0.5 line-clamp-1">{item.question}</p>
                              <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border ${item.category === 'Technical' ? 'bg-indigo-50 text-indigo-500 border-indigo-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{item.category}</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`text-base font-black ${item.score >= 80 ? 'text-emerald-600' : item.score < 50 ? 'text-red-600' : 'text-slate-800'}`}>{item.score}</span>
                            </td>
                            <td className="py-3 px-5">
                              <p className="text-slate-500 italic leading-snug line-clamp-2">{item.reasoning}</p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="px-8 py-5 border-t bg-slate-50 flex justify-between items-center">
               <button onClick={() => handleEvaluate(viewingCand.id)} disabled={isEvaluating} className="px-5 py-2.5 bg-white border border-slate-200 text-amber-600 rounded-xl font-black uppercase text-[9px] tracking-widest flex items-center gap-2 hover:bg-amber-50 transition-all">
                  {isEvaluating ? <Loader2 className="animate-spin w-3.5 h-3.5"/> : <RefreshCw className="w-3.5 h-3.5"/>} Kalkulasi Ulang
               </button>
               <button onClick={() => generateBODReport([viewingCand], '', '')} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black uppercase text-[9px] tracking-widest shadow-lg flex items-center gap-2 hover:bg-violet-600 transition-all active:scale-95">
                  <Download className="w-3.5 h-3.5"/> Download PDF
               </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH PELAMAR */}
      {showAddModal && (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-12 shadow-2xl relative animate-in zoom-in-95 duration-500 overflow-hidden max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowAddModal(false)} className="absolute top-10 right-10 text-slate-300 hover:text-red-500 transition-all"><X className="w-8 h-8"/></button>
            <h3 className="text-3xl font-black mb-10 text-slate-800 tracking-tight">{isEditing ? 'Edit Data Pelamar' : 'Tambah Pelamar Baru'}</h3>
            
            <div className="mb-10 p-8 bg-violet-50 rounded-[2.5rem] border-2 border-dashed border-violet-200 flex flex-col items-center justify-center gap-3 relative transition-all hover:bg-violet-100/50">
              {isParsing ? <Loader2 className="animate-spin text-violet-600 w-10 h-10" /> : <Upload className="text-violet-600 w-10 h-10" />}
              <div className="text-center">
                <p className="text-[11px] font-black uppercase text-violet-600 tracking-widest">{isParsing ? 'AI sedang membaca CV...' : 'Auto-Fill Data via CV (PDF/Foto)'}</p>
              </div>
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleCV} accept="application/pdf,image/*" />
            </div>

            <div className="space-y-6">
              <input type="text" placeholder="Nama Lengkap" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-violet-500 transition-all" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input type="email" placeholder="Email" className="p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-violet-500 outline-none" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                <input type="text" placeholder="Telepon" className="p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-violet-500 outline-none" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <select className="p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-violet-500 outline-none" value={form.div} onChange={e => setForm({...form, div: e.target.value as any, pos: ''})}>
                  <option value="">Divisi...</option>
                  {Object.values(Division).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select className="p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-violet-500 outline-none" value={form.pos} onChange={e => setForm({...form, pos: e.target.value})} disabled={!form.div}>
                  <option value="">Posisi...</option>
                  {form.div && divPos[form.div as Division]?.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-200 space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><CreditCard className="w-4 h-4"/> Checklist Dokumen Masuk</h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {[
                    { key: 'ktp', label: 'Fotokopi KTP' },
                    { key: 'kk', label: 'Fotokopi KK' },
                    { key: 'simA', label: 'SIM A (Driver)' },
                    { key: 'simC', label: 'SIM C (Kurir)' },
                  ].map(doc => (
                    <label key={doc.key} className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${form[doc.key as keyof typeof form] ? 'bg-violet-600 border-violet-600' : 'bg-white border-slate-300'}`}>
                        {form[doc.key as keyof typeof form] && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <input type="checkbox" className="hidden" checked={form[doc.key as keyof typeof form] as boolean} onChange={e => setForm({...form, [doc.key]: e.target.checked})} />
                      <span className="text-xs font-bold text-slate-600 group-hover:text-violet-600 transition-all">{doc.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button onClick={handleSaveCand} disabled={isParsing} className="w-full bg-violet-600 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-violet-100 hover:bg-violet-700 transition-all active:scale-95 flex items-center justify-center gap-3 mt-4">
                {isParsing ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
                {isEditing ? 'Simpan Perubahan' : 'Simpan & Masukkan Antrean'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Alert */}
      {alert.show && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-bottom-10 duration-500">
          <div className={`px-10 py-5 rounded-3xl shadow-2xl flex items-center gap-4 text-white font-black uppercase text-[11px] tracking-widest border-2 ${alert.type === 'success' ? 'bg-emerald-600 border-emerald-500' : alert.type === 'error' ? 'bg-red-600 border-red-500' : 'bg-slate-900 border-slate-800'}`}>
            {alert.type === 'success' ? <CheckCircle2 className="w-5 h-5"/> : <Info className="w-5 h-5"/>} 
            {alert.msg}
          </div>
        </div>
      )}

      <style>{`
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        input[type=range] { -webkit-appearance: none; width: 100%; }
        input[type=range]:focus { outline: none; }
        input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 4px; cursor: pointer; background: #e2e8f0; border-radius: 2px; }
        input[type=range]::-webkit-slider-thumb { height: 16px; width: 16px; border-radius: 50%; background: #7c3aed; cursor: pointer; -webkit-appearance: none; margin-top: -6px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
      `}</style>
    </div>
  );
};

export default App;
