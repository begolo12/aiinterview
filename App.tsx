import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, UserPlus, Mic, CheckCircle2, LayoutDashboard, Loader2, Briefcase, History,
  Award, Plus, X, BookOpen, Trash2, Activity, Trophy, Star, LogOut, Settings,
  FileQuestion, Save, Search, TrendingUp, PieChart as IconPieChart, BarChart3,
  ChevronRight, Filter, Download, MoreVertical, MapPin, Mail, Phone, Clock,
  Calendar, AlertCircle, MessageSquare, FileText, Upload, ChevronUp, ChevronDown,
  Target, Percent, XCircle
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
  { id: 'knowledge', label: 'Pengetahuan Dasar' } // Label will be dynamic
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

  // States for Adding Candidate
  const [newCandName, setNewCandName] = useState('');
  const [newCandDiv, setNewCandDiv] = useState<Division | ''>('');
  const [newCandPos, setNewCandPos] = useState<Position | ''>('');
  const [newCandEmail, setNewCandEmail] = useState('');
  const [newCandPhone, setNewCandPhone] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    seedUsers();
    fetchCandidates();
    fetchQuestions();
    const savedUser = localStorage.getItem('daniswaraUser');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
  }, []);

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
        alert("CV Berhasil di-scan!");
      } catch (err) {
        alert("Gagal membaca CV. Silakan isi manual.");
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveQuestions = async () => {
    setIsSavingQuestions(true);
    try {
      await setDoc(doc(db, 'question_templates', 'all'), { templates: questionBank });
      alert("Bank soal berhasil disimpan!");
    } catch (e) { alert("Gagal menyimpan."); } finally { setIsSavingQuestions(false); }
  };

  const deleteQuestion = (pos: Position, index: number) => {
    if (!confirm("Hapus pertanyaan ini?")) return;
    const updated = { ...questionBank };
    updated[pos] = updated[pos].filter((_, i) => i !== index);
    setQuestionBank(updated);
  };

  const addQuestion = (pos: Position, category: 'General' | 'Technical') => {
    const updated = { ...questionBank };
    const posQuestions = [...(updated[pos] || [])];
    const newQ: QuestionTemplate = { 
      id: Date.now().toString(), 
      category, 
      question: `Pertanyaan ${category} baru...`, 
      idealAnswer: 'Tulis jawaban ideal...' 
    };

    // Find insertion index: after the last existing question of the SAME category
    const lastIndex = posQuestions.map(q => q.category).lastIndexOf(category);
    if (lastIndex !== -1) {
      posQuestions.splice(lastIndex + 1, 0, newQ);
    } else {
      // If none of this category exists
      if (category === 'General') {
        posQuestions.unshift(newQ); // General at the top
      } else {
        posQuestions.push(newQ); // Technical at the bottom
      }
    }

    updated[pos] = posQuestions;
    setQuestionBank(updated);
  };

  const updateQuestion = (pos: Position, index: number, field: keyof QuestionTemplate, value: string) => {
    const updated = { ...questionBank };
    updated[pos][index] = { ...updated[pos][index], [field]: value };
    setQuestionBank(updated);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = await loginUser(loginUsername, loginPassword);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('daniswaraUser', JSON.stringify(user));
    } else setAuthError('Username/Password salah.');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('daniswaraUser');
  };

  const handleAddCandidate = async () => {
    if (!newCandName || !newCandDiv || !newCandPos) return alert("Mohon lengkapi data");
    setIsParsing(true);
    try {
      await addDoc(collection(db, "candidates"), {
        name: newCandName,
        division: newCandDiv,
        position: newCandPos,
        email: newCandEmail || `${newCandName.toLowerCase().replace(/\s/g, '')}@example.com`,
        phone: newCandPhone || '0812-xxxx-xxxx',
        status: 'Interview',
        skills: [],
        experience: '-',
        education: '-',
        summary: '-'
      });
      setShowAddModal(false);
      setNewCandName(''); setNewCandEmail(''); setNewCandPhone('');
      fetchCandidates();
    } catch (e) { alert("Gagal menambah kandidat"); } finally { setIsParsing(false); }
  };

  const handleEvaluate = async () => {
    if (!selectedCandidateId || !currentUser) return;
    setIsEvaluating(true);
    try {
      const cand = candidates.find(c => c.id === selectedCandidateId)!;
      const result = await evaluateInterview(cand, interviewTranscript, cand.position, currentRaterScores);
      
      // Multi-rater support: Store HR as the primary evaluator
      await updateDoc(doc(db, "candidates", cand.id), { 
        status: result.verdict, 
        evaluation: result, 
        transcript: interviewTranscript 
      });
      
      fetchCandidates();
      setViewingCandidate({ ...cand, status: result.verdict, evaluation: result, transcript: interviewTranscript });
      setSelectedCandidateId(null);
      setInterviewTranscript('');
    } catch (e) { alert("Evaluasi gagal."); } finally { setIsEvaluating(false); }
  };

  const stats = useMemo(() => {
    const total = candidates.length;
    const passed = candidates.filter(c => c.status === 'LULUS').length;
    const failed = candidates.filter(c => c.status === 'TIDAK LULUS').length;
    const process = candidates.filter(c => c.status === 'Interview' || c.status === 'Draft').length;
    const evaluated = candidates.filter(c => c.evaluation);
    const avgScore = evaluated.length ? Math.round(evaluated.reduce((a, b) => a + (b.evaluation?.score || 0), 0) / evaluated.length) : 0;
    
    // Detailed Division Stats
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

    // Score Distribution
    const scoreDist = [
      { range: '> 85', count: evaluated.filter(c => (c.evaluation?.score || 0) > 85).length, fill: '#10b981' }, // Emerald
      { range: '70 - 85', count: evaluated.filter(c => (c.evaluation?.score || 0) >= 70 && (c.evaluation?.score || 0) <= 85).length, fill: '#3b82f6' }, // Blue
      { range: '< 70', count: evaluated.filter(c => (c.evaluation?.score || 0) < 70).length, fill: '#ef4444' } // Red
    ];

    return { total, passed, failed, process, avgScore, rate: total ? Math.round((passed/total)*100) : 0, divisionStats, scoreDist };
  }, [candidates]);

  const filteredCandidates = candidates.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getManualCriterionLabel = (id: string, div: string) => {
    if (id === 'knowledge') return `Pengetahuan Dasar (${div})`;
    return MANUAL_CRITERIA.find(m => m.id === id)?.label || id;
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md space-y-6">
          <div className="text-center mb-4">
            <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3 shadow-xl">
               <Users className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">DANISWARA</h1>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Onboarding System</p>
          </div>
          <div className="space-y-3">
            <input type="text" placeholder="Username" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all" />
            <input type="password" placeholder="Password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all" />
          </div>
          {authError && <p className="text-red-500 text-[10px] font-black uppercase text-center">{authError}</p>}
          <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 active:scale-95 transition-all">Sign In</button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900">
      {/* Sidebar */}
      <aside className="hidden lg:flex lg:w-72 border-r bg-white flex-col z-20">
        <div className="p-8 flex items-center gap-4">
          <div className="bg-blue-600 p-2.5 rounded-xl rotate-3 shadow-lg shadow-blue-200">
            <Users className="text-white w-6 h-6" />
          </div>
          <div>
            <span className="font-black text-slate-800 text-lg tracking-tighter uppercase block">Daniswara</span>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Onboarding AI</span>
          </div>
        </div>
        
        <div className="px-6 mb-6">
           <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3 border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-black text-blue-600">
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
              className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
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

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b flex items-center justify-between px-6 z-10 shrink-0">
           <div className="flex items-center gap-4 flex-1">
              <div className="relative max-w-sm w-full">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                 <input 
                   type="text" 
                   placeholder="Cari kandidat..." 
                   className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl text-xs font-medium border border-slate-100 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                 />
              </div>
           </div>
           <div className="flex items-center gap-3">
              <button onClick={() => setShowAddModal(true)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95">
                 <Plus className="w-3.5 h-3.5" /> Tambah Pelamar
              </button>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
          {activeTab === 'dashboard' && (
            <div className="h-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between shrink-0">
                 <div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Recruitment Overview</h2>
                    <p className="text-[10px] text-slate-500 font-medium">Real-time performance metrics & analytics.</p>
                 </div>
                 <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-600">{new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
                 </div>
              </div>

              {/* KPI Cards - Dense */}
              <div className="grid grid-cols-5 gap-3 shrink-0">
                {[
                  { label: 'Total Applicants', value: stats.total, sub: 'All Candidates', icon: Users, color: 'blue' },
                  { label: 'Qualified', value: stats.passed, sub: `${stats.rate}% Rate`, icon: Trophy, color: 'emerald' },
                  { label: 'Rejected', value: stats.failed, sub: 'Below Standard', icon: XCircle, color: 'red' },
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

              <div className="grid grid-cols-3 gap-4 flex-1 min-h-0">
                 {/* Division Performance Table - More info in less space */}
                 <div className="col-span-2 bg-white rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                       <h3 className="font-black text-xs text-slate-800 flex items-center gap-2"><Briefcase className="w-3.5 h-3.5 text-slate-400"/> Performa Rekrutmen per Divisi</h3>
                       <button className="text-[10px] font-bold text-blue-600 hover:underline">View Details</button>
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
                                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wide ${d.count > 0 ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                         {d.count > 0 ? 'Active' : 'No Data'}
                                      </span>
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>

                 {/* Charts & Distributions */}
                 <div className="flex flex-col gap-4">
                    {/* Score Distribution */}
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
                    
                    {/* Recruitment Funnel Pie */}
                    <div className="flex-1 bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col relative">
                        <h3 className="font-black text-xs text-slate-800 mb-2 flex items-center gap-2"><IconPieChart className="w-3.5 h-3.5 text-slate-400"/> Funnel Seleksi</h3>
                        <div className="flex-1 min-h-0 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Lulus', value: stats.passed, color: '#10b981' },
                                            { name: 'Gagal', value: stats.failed, color: '#ef4444' },
                                            { name: 'Proses', value: stats.process, color: '#f59e0b' }
                                        ]}
                                        cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value"
                                    >
                                        {[{c:'#10b981'}, {c:'#ef4444'}, {c:'#f59e0b'}].map((e, i) => <Cell key={i} fill={e.c} />)}
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

              {/* Bottom Row - Top Candidates Strip */}
              <div className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm shrink-0">
                  <div className="flex items-center justify-between mb-3">
                     <h3 className="font-bold text-xs text-slate-800 flex items-center gap-2"><Trophy className="w-3.5 h-3.5 text-amber-500"/> Top 5 Candidates Leaderboard</h3>
                     <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ranked by Total Score</span>
                  </div>
                  <div className="grid grid-cols-5 gap-3">
                    {candidates.filter(c => c.evaluation).sort((a,b) => (b.evaluation?.score || 0) - (a.evaluation?.score || 0)).slice(0, 5).map((c, i) => (
                      <div key={i} onClick={() => setViewingCandidate(c)} className="cursor-pointer bg-slate-50 hover:bg-blue-50 p-2.5 rounded-xl border border-transparent hover:border-blue-100 transition-all flex items-center gap-3 group">
                         <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${i===0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>#{i+1}</div>
                         <div className="min-w-0">
                            <p className="font-bold text-[10px] truncate text-slate-700">{c.name}</p>
                            <p className="text-[9px] font-bold text-slate-400 truncate">{c.position}</p>
                         </div>
                         <div className="ml-auto text-right">
                            <span className="text-xs font-black text-blue-600">{c.evaluation?.score}</span>
                         </div>
                      </div>
                    ))}
                  </div>
              </div>
            </div>
          )}

          {activeTab === 'candidates' && (
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-3xl font-black text-slate-800">Antrean Pelamar</h2>
                    <p className="text-slate-500 font-medium">Kandidat yang siap untuk interview.</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {filteredCandidates.filter(c => c.status === 'Interview' || c.status === 'Draft').map((c) => (
                   <div key={c.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 flex flex-col relative overflow-hidden group">
                      <div className="flex justify-between items-start mb-6">
                         <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center font-black text-blue-600 text-xl">
                            {c.name.charAt(0)}
                         </div>
                         <span className="bg-amber-50 text-amber-600 text-[10px] font-black uppercase px-3 py-1.5 rounded-full tracking-widest border border-amber-100">
                            {c.status}
                         </span>
                      </div>
                      <div className="mb-8">
                         <h3 className="text-xl font-black text-slate-800 group-hover:text-blue-600 transition-colors mb-1">{c.name}</h3>
                         <p className="text-sm font-bold text-slate-400 flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> {c.position}</p>
                         <p className="text-xs font-medium text-slate-400 mt-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {c.division}</p>
                      </div>
                      <div className="mt-auto space-y-2">
                         {currentUser.role === 'HR' ? (
                           <button 
                             onClick={() => { setSelectedCandidateId(c.id); setInterviewTranscript(c.transcript || ''); setActiveTab('interview'); }}
                             className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-blue-600 transition-all active:scale-95"
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
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-left-4 duration-500 pb-20">
               <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-3xl font-black text-slate-800">Database Kandidat</h2>
                    <p className="text-slate-500 font-medium">Histori lengkap semua kandidat dan skor 10 sektor.</p>
                  </div>
                  <button onClick={() => generateBODReport(candidates, '', '')} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition-all">
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
                                       <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                          {c.name.charAt(0)}
                                       </div>
                                       <div>
                                          <p className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{c.name}</p>
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
                                       c.status === 'TIDAK LULUS' ? 'bg-red-50 text-red-600 border-red-100' :
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
                                       <button onClick={() => setViewingCandidate(c)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all">
                                          <ChevronRight className="w-4 h-4" />
                                       </button>
                                       <button onClick={async () => { if(confirm("Hapus permanen?")) { await deleteDoc(doc(db, "candidates", c.id)); fetchCandidates(); } }} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all">
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
            <div className="h-full max-w-7xl mx-auto flex flex-col space-y-6 animate-in fade-in zoom-in-95 duration-500 pb-10">
               {!selectedCandidateId ? (
                 <div className="flex-1 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 p-10 text-center">
                    <Mic className="w-16 h-16 mb-4 opacity-10" />
                    <h3 className="text-xl font-black text-slate-400 mb-2">Belum Ada Interview Aktif</h3>
                    <button onClick={() => setActiveTab('candidates')} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-blue-600 transition-all">
                       Ke Antrean Pelamar
                    </button>
                 </div>
               ) : (
                 <div className="flex-1 flex flex-col lg:flex-row bg-white rounded-[2.5rem] border shadow-2xl overflow-hidden">
                    <div className="flex-1 flex flex-col min-w-0 border-r relative">
                       <div className="p-8 border-b flex items-center justify-between bg-slate-50/50 shrink-0">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg">
                                {candidates.find(c => c.id === selectedCandidateId)?.name.charAt(0)}
                             </div>
                             <div>
                                <h3 className="font-black text-slate-800 text-lg">{candidates.find(c => c.id === selectedCandidateId)?.name}</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{candidates.find(c => c.id === selectedCandidateId)?.position}</p>
                             </div>
                          </div>
                          <button onClick={() => setSelectedCandidateId(null)} className="p-2 bg-white text-slate-400 hover:text-red-500 rounded-xl border border-slate-100 transition-all"><X className="w-5 h-5"/></button>
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
                          
                          <div className="h-40 bg-blue-50/50 rounded-[2rem] p-6 border border-blue-100/50 overflow-y-auto shrink-0">
                             <h4 className="text-[10px] font-black text-blue-500 uppercase mb-4 tracking-widest flex items-center gap-2"><FileQuestion className="w-3 h-3"/> Pertanyaan Panduan</h4>
                             <div className="space-y-3">
                                {(questionBank[candidates.find(c => c.id === selectedCandidateId)?.position as Position] || []).map((q, i) => (
                                  <div key={i} className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm text-xs font-bold text-slate-600 flex items-start gap-2">
                                     <span className="text-blue-500">{i + 1}.</span> {q.question}
                                  </div>
                                ))}
                             </div>
                          </div>
                       </div>

                       <div className="p-8 border-t bg-slate-50/50 shrink-0">
                          <button 
                            onClick={handleEvaluate} 
                            disabled={isEvaluating || !interviewTranscript}
                            className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 transition-all ${!interviewTranscript ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white hover:bg-blue-600 shadow-xl shadow-blue-100'}`}
                          >
                             {isEvaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Selesai & Evaluasi AI
                          </button>
                       </div>
                    </div>

                    <div className="w-full lg:w-96 bg-slate-50/30 p-8 flex flex-col space-y-8 overflow-y-auto shrink-0">
                       <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Manual Rating (HR)</h3>
                       <div className="space-y-6">
                          {MANUAL_CRITERIA.map((crit) => {
                             const currentCandDiv = candidates.find(c => c.id === selectedCandidateId)?.division || '';
                             const label = crit.id === 'knowledge' ? `Pengetahuan Dasar (${currentCandDiv})` : crit.label;
                             
                             return (
                                <div key={crit.id} className="space-y-3">
                                   <div className="flex justify-between items-center">
                                      <span className="text-xs font-black text-slate-500 uppercase tracking-tighter">{label}</span>
                                      <span className="bg-white px-3 py-1 rounded-lg text-xs font-black text-blue-600 border border-slate-100">{currentRaterScores[crit.id]}</span>
                                   </div>
                                   <input 
                                     type="range" 
                                     min="0" max="100" step="5" 
                                     value={currentRaterScores[crit.id]} 
                                     onChange={e => setCurrentRaterScores({...currentRaterScores, [crit.id]: parseInt(e.target.value)})}
                                     className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
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
               <div className="flex justify-between items-center bg-slate-50/80 backdrop-blur-sm sticky top-0 z-30 py-4 px-4 -mx-4 shrink-0">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Bank Soal AI</h2>
                    <p className="text-xs text-slate-500 font-medium">Tentukan parameter pertanyaan untuk tiap posisi.</p>
                  </div>
                  <button onClick={handleSaveQuestions} disabled={isSavingQuestions} className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center gap-3 hover:bg-blue-700 transition-all">
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
                             className={`w-full text-left px-4 py-3 rounded-xl text-xs font-black transition-all ${selectedQuestionPos === pos ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                           >
                              {pos}
                           </button>
                        ))}
                     </div>
                  </div>

                  <div className="flex-1 bg-white rounded-[3rem] border border-slate-100 shadow-sm flex flex-col min-h-0">
                     <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white z-20 shrink-0">
                        <h3 className="font-black text-xl text-slate-800 tracking-tight">{selectedQuestionPos}</h3>
                        <div className="flex gap-2">
                           <button onClick={() => addQuestion(selectedQuestionPos, 'General')} className="bg-slate-50 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-100 hover:bg-blue-50 hover:text-blue-600 transition-all flex items-center gap-2">
                              <Plus className="w-3 h-3" /> + Soal Umum
                           </button>
                           <button onClick={() => addQuestion(selectedQuestionPos, 'Technical')} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-100 hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2">
                              <Plus className="w-3 h-3" /> + Soal Teknis
                           </button>
                        </div>
                     </div>

                     <div className="flex-1 overflow-y-auto p-8 space-y-6">
                        {questionBank[selectedQuestionPos]?.map((q, i) => (
                          <div key={i} className="group relative p-6 bg-slate-50/50 rounded-3xl border-2 border-transparent hover:border-blue-100 hover:bg-white transition-all duration-300">
                             <div className="flex items-center gap-3 mb-4">
                                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm">
                                   {i + 1}
                                </span>
                                <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${q.category === 'Technical' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-600'}`}>
                                   {q.category}
                                </span>
                                <button onClick={() => deleteQuestion(selectedQuestionPos, i)} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100">
                                   <Trash2 className="w-4 h-4" />
                                </button>
                             </div>
                             <div className="space-y-4">
                                <textarea 
                                  value={q.question} 
                                  onChange={e => updateQuestion(selectedQuestionPos, i, 'question', e.target.value)}
                                  className="w-full bg-transparent font-bold text-slate-700 outline-none resize-none"
                                  rows={2}
                                />
                                <textarea 
                                  value={q.idealAnswer} 
                                  onChange={e => updateQuestion(selectedQuestionPos, i, 'idealAnswer', e.target.value)}
                                  className="w-full bg-blue-50/30 p-3 rounded-xl text-xs font-medium text-blue-600 border border-blue-50 outline-none resize-none italic"
                                  rows={2}
                                />
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

      {/* Rapor & Transcript Detail Modal */}
      {viewingCandidate && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl max-h-[95vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-500">
             <div className={`p-8 flex items-center justify-between border-b ${viewingCandidate.status === 'LULUS' ? 'bg-emerald-50/50' : 'bg-red-50/50'} shrink-0`}>
                <div className="flex items-center gap-6">
                   <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-2xl shadow-xl ${viewingCandidate.status === 'LULUS' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
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
                      <h3 className={`text-4xl font-black ${viewingCandidate.status === 'LULUS' ? 'text-emerald-600' : 'text-red-600'}`}>{viewingCandidate.evaluation?.score || 0}/100</h3>
                   </div>
                   <button onClick={() => { setViewingCandidate(null); setShowTranscriptInModal(false); }} className="p-3 bg-white text-slate-400 hover:text-red-500 rounded-2xl border transition-all active:scale-90"><X className="w-6 h-6"/></button>
                </div>
             </div>
             
             <div className="flex-1 overflow-y-auto p-10 space-y-10">
                {showTranscriptInModal ? (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                     <div className="flex items-center justify-between border-b pb-4">
                        <h4 className="text-xl font-black text-slate-800 flex items-center gap-2"><MessageSquare className="w-6 h-6 text-blue-600" /> Transkrip Wawancara</h4>
                        <button onClick={() => setShowTranscriptInModal(false)} className="text-blue-600 font-bold text-sm hover:underline">Kembali ke Rapor</button>
                     </div>
                     <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 font-mono text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                        {viewingCandidate.transcript || "Tidak ada transkrip tersedia."}
                     </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Activity className="w-4 h-4"/> Rapor Detil Penilaian (10 Sektor)</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                          {viewingCandidate.evaluation?.criteriaScores.map((cs, i) => (
                             <div key={i} className={`p-4 rounded-2xl border transition-all hover:shadow-lg ${cs.type.includes('Manual') ? 'bg-white border-slate-100' : 'bg-blue-50/30 border-blue-50'}`}>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter truncate">{cs.type}</p>
                                <p className="text-xs font-bold text-slate-700 mt-1 mb-2 leading-tight h-8 overflow-hidden">{cs.name}</p>
                                <div className="flex items-end justify-between">
                                   <span className="text-xl font-black text-slate-800">{cs.score}</span>
                                   <span className="text-[8px] font-black text-slate-400 uppercase">/100</span>
                                </div>
                                <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                                   <div className={`h-full ${cs.score >= 70 ? 'bg-emerald-500' : 'bg-red-400'}`} style={{width: `${cs.score}%`}}></div>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                       <div className="lg:col-span-2 space-y-4">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Analisis AI</h4>
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
                                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Kelemahan</p>
                                <ul className="space-y-2">
                                   {viewingCandidate.evaluation?.weaknesses.map((w, i) => (
                                      <li key={i} className="text-xs font-bold text-slate-700 bg-red-50 px-3 py-2 rounded-xl flex items-start gap-2 border border-red-100/50">• {w}</li>
                                   ))}
                                </ul>
                             </div>
                          </div>
                       </div>

                       <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Opsi Lanjutan</h4>
                          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 space-y-4 shadow-sm">
                             <div className="flex items-center gap-4">
                                <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><Mail className="w-4 h-4" /></div>
                                <div><p className="text-[9px] font-black text-slate-400 uppercase">Email</p><p className="text-xs font-bold">{viewingCandidate.email}</p></div>
                             </div>
                             <div className="flex items-center gap-4">
                                <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><Phone className="w-4 h-4" /></div>
                                <div><p className="text-[9px] font-black text-slate-400 uppercase">Telepon</p><p className="text-xs font-bold">{viewingCandidate.phone}</p></div>
                             </div>
                          </div>
                          <button 
                            onClick={() => setShowTranscriptInModal(true)} 
                            className="w-full p-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-600 transition-all shadow-xl"
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
                <button onClick={() => generateBODReport([viewingCandidate], '', '')} className="px-8 py-3.5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-blue-600 transition-all flex items-center gap-2">
                   <Download className="w-4 h-4"/> PDF Report
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Add Modal with PDF Scanner */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl relative animate-in zoom-in-95 duration-500">
              <button onClick={() => setShowAddModal(false)} className="absolute top-8 right-8 text-slate-300 hover:text-red-500 transition-all"><X className="w-6 h-6"/></button>
              <h3 className="text-2xl font-black text-slate-800 mb-6 tracking-tight">Tambah Pelamar</h3>
              
              <div className="mb-8 p-4 bg-blue-50 rounded-2xl border-2 border-dashed border-blue-200 flex flex-col items-center justify-center gap-3 relative overflow-hidden group">
                 {isParsing ? (
                   <>
                     <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                     <p className="text-xs font-black text-blue-600 uppercase animate-pulse">AI Sedang Scan CV...</p>
                   </>
                 ) : (
                   <>
                     <Upload className="w-8 h-8 text-blue-600" />
                     <div className="text-center">
                        <p className="text-xs font-black text-blue-600 uppercase">Upload PDF CV / Foto CV</p>
                        <p className="text-[9px] text-blue-400 font-bold">Data akan terisi otomatis oleh AI</p>
                     </div>
                     <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="application/pdf,image/*" className="absolute inset-0 opacity-0 cursor-pointer" />
                   </>
                 )}
              </div>

              <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                       <input type="text" value={newCandName} onChange={e => setNewCandName(e.target.value)} placeholder="Nama..." className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-blue-500 outline-none transition-all" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                       <input type="email" value={newCandEmail} onChange={e => setNewCandEmail(e.target.value)} placeholder="Email..." className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-blue-500 outline-none transition-all" />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telepon</label>
                    <input type="text" value={newCandPhone} onChange={e => setNewCandPhone(e.target.value)} placeholder="No. WA..." className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-blue-500 outline-none transition-all" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Divisi</label>
                       <select value={newCandDiv} onChange={e => {setNewCandDiv(e.target.value as Division); setNewCandPos('');}} className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-blue-500 outline-none transition-all">
                          <option value="">Divisi...</option>
                          {Object.values(Division).map(d => <option key={d} value={d}>{d}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Posisi</label>
                       <select value={newCandPos} onChange={e => setNewCandPos(e.target.value as Position)} disabled={!newCandDiv} className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-blue-500 outline-none transition-all disabled:opacity-50">
                          <option value="">Posisi...</option>
                          {newCandDiv && DIVISION_POSITIONS[newCandDiv as Division].map(p => <option key={p} value={p}>{p}</option>)}
                       </select>
                    </div>
                 </div>
                 <button onClick={handleAddCandidate} disabled={isParsing} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2 mt-4">
                    {isParsing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Simpan Pelamar
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;