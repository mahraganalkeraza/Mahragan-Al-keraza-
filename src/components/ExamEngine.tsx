import React, { useState, useEffect } from 'react';
import { auth, db, CURRENT_YEAR } from '../firebase';
import { OFFICIAL_COMPETITIONS } from '../constants';
import { collection, doc, setDoc, getDocs, onSnapshot, getDoc, updateDoc, query, where, deleteDoc, writeBatch, getCountFromServer } from 'firebase/firestore';
import { rdb, rdbRef, rdbSet, onDisconnect, rdbServerTimestamp } from '../firebase';
import { Plus, Trash2, Save, FileText, CheckCircle, Video, Key, BookOpen, Clock, Activity, Users, Wallet, ShieldX, Loader2 } from 'lucide-react';
import { QRScanner } from './QRScanner';
import { getDeviceFingerprint, DeviceFingerprint } from '../lib/deviceTracking';

const normalizeArabic = (text: any): string => {
  if (!text || typeof text !== 'string') return '';
  return text
    .trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ');
};

interface Question {
  id: string;
  type: 'mcq' | 'boolean' | 'matching' | 'fill';
  text: string;
  options: string[];
  matchingPairs?: { left: string, right: string }[];
  correctAnswers: string[];
  points: number;
}

interface Exam {
  id: string;
  stage: string;
  competitionType: string;
  model: string;
  questions: Question[];
  isActive: boolean;
  updatedAt: string;
}

const COMPETITION_TYPES = OFFICIAL_COMPETITIONS;

const SCORE_FIELD_MAP: Record<string, string> = {
  'دراسي': 'academicScore',
  'محفوظات': 'memorizationScore',
  'قبطي مستوى أول': 'copticL1Score',
  'قبطي مستوى ثان': 'copticL2Score'
};

interface ExamEngineProps {
  stages: any[];
}

export const ExamBuilder: React.FC<ExamEngineProps> = ({ stages }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedCompetition, setSelectedCompetition] = useState('دراسي');
  const [selectedModel, setSelectedModel] = useState('A');
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'exams'), (snap) => {
      const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() } as Exam));
      setExams(loaded);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (selectedStage && selectedCompetition && selectedModel) {
      const exam = exams.find(e => 
        e.stage === selectedStage && 
        e.competitionType === selectedCompetition && 
        e.model === selectedModel
      );
      if (exam) {
        setCurrentQuestions(exam.questions || []);
      } else {
        setCurrentQuestions([]);
      }
      setIsDirty(false);
    }
  }, [selectedStage, selectedCompetition, selectedModel, exams]);

  // Auto-save logic every 60 seconds if dirty
  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(() => {
      handleSaveExam(true);
    }, 60000);
    return () => clearTimeout(timer);
  }, [isDirty, currentQuestions]);

  const handleAddQuestion = () => {
    setCurrentQuestions([
      ...currentQuestions, 
      {
        id: Date.now().toString(),
        type: 'mcq',
        text: '',
        options: [''],
        correctAnswers: [],
        points: 1
      }
    ]);
    setIsDirty(true);
  };

  const handleSaveExam = async (isAuto = false) => {
    try {
      if (!selectedStage || !selectedCompetition || !selectedModel) return;
      const examId = `${selectedStage}_${selectedCompetition}_${selectedModel}`;
      await setDoc(doc(db, 'exams', examId), {
        stage: selectedStage,
        competitionType: selectedCompetition,
        model: selectedModel,
        questions: currentQuestions,
        isActive: true,
        updatedAt: new Date().toISOString()
      });
      setIsDirty(false);
      if (!isAuto) alert('تم الحفظ بنجاح');
    } catch (error) {
      console.error('Error saving exam:', error);
      if (!isAuto) alert('حدث خطأ أثناء الحفظ');
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex flex-wrap items-center gap-4 mb-6 sticky top-0 bg-white py-2 z-10 border-b">
        <select className="px-4 py-2 border rounded-xl font-bold" value={selectedStage} onChange={e => setSelectedStage(e.target.value)}>
          <option value="">اختر المرحلة</option>
          {stages.map(s => <option key={typeof s === 'string' ? s : s.name} value={typeof s === 'string' ? s : s.name}>{typeof s === 'string' ? s : s.name}</option>)}
        </select>
        <select className="px-4 py-2 border rounded-xl font-bold" value={selectedCompetition} onChange={e => setSelectedCompetition(e.target.value)}>
          {COMPETITION_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
        </select>
        <select className="px-4 py-2 border rounded-xl font-bold" value={selectedModel} onChange={e => setSelectedModel(e.target.value)}>
          <option value="A">نموذج A</option>
          <option value="B">نموذج B</option>
          <option value="C">نموذج C</option>
        </select>
        <button onClick={handleAddQuestion} className="px-4 py-2 bg-indigo-600 text-white rounded-xl flex items-center gap-2">
          <Plus size={16} /> إضافة سؤال
        </button>
        <button onClick={() => handleSaveExam()} className={`px-4 py-2 text-white rounded-xl flex items-center gap-2 ${isDirty ? 'bg-emerald-600' : 'bg-slate-400'}`}>
          <Save size={16} /> {isDirty ? 'حفظ التغييرات' : 'تم الحفظ'}
        </button>
        {isDirty && <span className="text-xs text-amber-600 font-bold animate-pulse">يوجد تغييرات غير محفوظة...</span>}
      </div>

      <div className="space-y-6">
        {currentQuestions.map((q, qIndex) => (
          <div key={q.id} className="p-6 border rounded-2xl bg-slate-50 relative group">
            <button 
              onClick={() => {
                setCurrentQuestions(currentQuestions.filter((_, i) => i !== qIndex));
                setIsDirty(true);
              }}
              className="absolute top-4 left-4 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 size={20} />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="md:col-span-2">
                <label className="text-xs font-black mb-1 block">رأس السؤال</label>
                <input 
                  type="text" 
                  value={q.text} 
                  placeholder="اكتب السؤال هنا..."
                  onChange={e => {
                    const newQ = [...currentQuestions];
                    newQ[qIndex].text = e.target.value;
                    setCurrentQuestions(newQ);
                    setIsDirty(true);
                  }}
                  className="w-full px-4 py-2 border rounded-xl"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-black mb-1 block">النوع</label>
                  <select 
                    value={q.type} 
                    onChange={e => {
                      const newQ = [...currentQuestions];
                      newQ[qIndex].type = e.target.value as any;
                      if (e.target.value === 'boolean') {
                        newQ[qIndex].options = ['صح', 'خطأ'];
                        newQ[qIndex].correctAnswers = ['صح'];
                      } else if (e.target.value === 'matching') {
                        newQ[qIndex].matchingPairs = [{ left: '', right: '' }];
                        newQ[qIndex].options = [];
                        newQ[qIndex].correctAnswers = [];
                      } else if (e.target.value === 'fill') {
                        newQ[qIndex].options = [];
                        newQ[qIndex].correctAnswers = [''];
                      }
                      setCurrentQuestions(newQ);
                      setIsDirty(true);
                    }}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="mcq">اختيار من متعدد</option>
                    <option value="boolean">صح وخطأ</option>
                    <option value="matching">توصيل</option>
                    <option value="fill">أكمل</option>
                  </select>
                </div>
                <div className="w-20">
                  <label className="text-xs font-black mb-1 block">الدرجة</label>
                  <input 
                    type="number" 
                    value={q.points} 
                    onChange={e => {
                      const newQ = [...currentQuestions];
                      newQ[qIndex].points = Number(e.target.value);
                      setCurrentQuestions(newQ);
                      setIsDirty(true);
                    }}
                    className="w-full px-3 py-2 border rounded-lg text-center"
                  />
                </div>
              </div>
            </div>

            {(q.type === 'mcq' || q.type === 'boolean') && (
              <div className="space-y-3">
                <label className="text-xs font-black mb-2 block text-slate-400">الخيارات (حدد الإجابة الصحيحة)</label>
                {q.options?.map((opt, optIndex) => (
                  <div key={optIndex} className="flex gap-3 items-center">
                    <input 
                      type="radio"
                      name={`correct_${q.id}`}
                      checked={q.correctAnswers.includes(opt)}
                      onChange={() => {
                        const newQ = [...currentQuestions];
                        newQ[qIndex].correctAnswers = [opt];
                        setCurrentQuestions(newQ);
                        setIsDirty(true);
                      }}
                      className="w-5 h-5 accent-indigo-600"
                    />
                    <input 
                      type="text" 
                      value={opt} 
                      onChange={e => {
                        const newQ = [...currentQuestions];
                        const oldVal = newQ[qIndex].options[optIndex];
                        newQ[qIndex].options[optIndex] = e.target.value;
                        if (newQ[qIndex].correctAnswers.includes(oldVal)) {
                           newQ[qIndex].correctAnswers = [e.target.value];
                        }
                        setCurrentQuestions(newQ);
                        setIsDirty(true);
                      }}
                      disabled={q.type === 'boolean'}
                      className="flex-1 px-4 py-2 border rounded-xl bg-white"
                    />
                    {q.type === 'mcq' && q.options.length > 1 && (
                      <button 
                        onClick={() => {
                          const newQ = [...currentQuestions];
                          newQ[qIndex].options = newQ[qIndex].options.filter((_, i) => i !== optIndex);
                          setCurrentQuestions(newQ);
                          setIsDirty(true);
                        }}
                        className="p-2 text-red-500"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
                {q.type === 'mcq' && (
                  <button 
                    onClick={() => {
                      const newQ = [...currentQuestions];
                      newQ[qIndex].options.push('');
                      setCurrentQuestions(newQ);
                      setIsDirty(true);
                    }}
                    className="text-indigo-600 text-xs font-black flex items-center gap-1 mt-4"
                  >
                    <Plus size={14} /> إضافة خيار جديد
                  </button>
                )}
              </div>
            )}

            {q.type === 'matching' && (
              <div className="space-y-4">
                <label className="text-xs font-black mb-2 block text-slate-400">أزواج التوصيل (العمود أ - العمود ب)</label>
                {q.matchingPairs?.map((pair, pIdx) => (
                  <div key={pIdx} className="flex gap-4 items-center">
                    <span className="text-xs font-bold text-slate-300 w-4">{pIdx+1}.</span>
                    <input 
                      type="text"
                      placeholder="العنصر (أ)"
                      value={pair.left}
                      onChange={e => {
                        const newQ = [...currentQuestions];
                        newQ[qIndex].matchingPairs![pIdx].left = e.target.value;
                        setCurrentQuestions(newQ);
                        setIsDirty(true);
                      }}
                      className="flex-1 px-4 py-2 border rounded-xl bg-white"
                    />
                    <div className="text-slate-300">↔</div>
                    <input 
                      type="text"
                      placeholder="العنصر (ب)"
                      value={pair.right}
                      onChange={e => {
                        const newQ = [...currentQuestions];
                        newQ[qIndex].matchingPairs![pIdx].right = e.target.value;
                        setCurrentQuestions(newQ);
                        setIsDirty(true);
                      }}
                      className="flex-1 px-4 py-2 border rounded-xl bg-white"
                    />
                    <button 
                      onClick={() => {
                        const newQ = [...currentQuestions];
                        newQ[qIndex].matchingPairs = newQ[qIndex].matchingPairs?.filter((_, i) => i !== pIdx);
                        setCurrentQuestions(newQ);
                        setIsDirty(true);
                      }}
                      className="p-2 text-red-400"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                <button 
                  onClick={() => {
                    const newQ = [...currentQuestions];
                    newQ[qIndex].matchingPairs?.push({ left: '', right: '' });
                    setCurrentQuestions(newQ);
                    setIsDirty(true);
                  }}
                  className="text-indigo-600 text-xs font-black flex items-center gap-1 mt-4"
                >
                  <Plus size={14} /> إضافة زوج توصيل
                </button>
              </div>
            )}

            {q.type === 'fill' && (
              <div className="space-y-3">
                <label className="text-xs font-black mb-1 block text-slate-400">الإجابة الصحيحة (سيقوم الطالب بكتابتها)</label>
                <input 
                  type="text" 
                  value={q.correctAnswers[0] || ''} 
                  onChange={e => {
                    const newQ = [...currentQuestions];
                    newQ[qIndex].correctAnswers = [e.target.value];
                    setCurrentQuestions(newQ);
                    setIsDirty(true);
                  }}
                  placeholder="الإجابة المتوقعة..."
                  className="w-full px-4 py-2 border rounded-xl bg-white"
                />
              </div>
            )}
          </div>
        ))}
        {currentQuestions.length === 0 && (
          <div className="text-center py-20 text-slate-300 italic">
            ابدأ بإضافة أسئلة للمرحلة والنموذج المختار...
          </div>
        )}
      </div>
    </div>
  );
};

export const LiveExamGateway: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [activeStudent, setActiveStudent] = useState<any>(null);
  const [selectedCompetition, setSelectedCompetition] = useState<string | null>(null);
  const [activeExam, setActiveExam] = useState<Exam|null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isExamCompleted, setIsExamCompleted] = useState(false);
  const [isAlreadyExamined, setIsAlreadyExamined] = useState(false);
  const [score, setScore] = useState(0);
  const [deviceInfo, setDeviceInfo] = useState({ ip: 'جاري التحميل...', type: 'غير معروف', count: 0 });
  const [fingerprint, setFingerprint] = useState<DeviceFingerprint | null>(null);
  const [lastScanDebug, setLastScanDebug] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTerminated, setIsTerminated] = useState(false);
  const [examConfig, setExamConfig] = useState<any>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      // Instead of onSnapshot, just get the cached config from localStorage if we must, 
      // or rely on a one-time getDoc. We will use a one-time getDoc for exam_config.
      try {
        const snap = await getDoc(doc(db, 'settings', 'exam_config'));
        if (snap.exists()) setExamConfig(snap.data());
      } catch(e) {}
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    const activeStudentId = localStorage.getItem('active_student_id');
    if (activeStudentId) {
      const cached = localStorage.getItem(`student_profile_${activeStudentId}`);
      if (cached) {
        try {
          setActiveStudent(JSON.parse(cached));
        } catch (e) {
          console.error('Error parsing cached active student:', e);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!activeStudent?.id) return;
    
    // 1. Kill Switch Listener: Watch for termination or reset
    const unsubSession = onSnapshot(doc(db, 'active_sessions', activeStudent.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status === 'terminated') {
          setIsTerminated(true);
          // Clear local storage on kick
          localStorage.removeItem(`exam_${activeStudent.id}_${selectedCompetition}`);
        }
        if (data.allowReentry) {
          // Admin reset the exam, we can re-enter
          setIsAlreadyExamined(false);
          setIsExamCompleted(false);
          setIsTerminated(false);
        }
      }
    });

    // 2. RDB Presence: Track active connection
    const presenceRef = rdbRef(rdb, `presence/${activeStudent.id}`);
    rdbSet(presenceRef, {
      studentName: activeStudent.studentName,
      churchName: activeStudent.churchName,
      lastSeen: rdbServerTimestamp(),
      deviceId: fingerprint?.uuid,
      competition: selectedCompetition || 'waiting'
    });

    // Remove presence on disconnect
    onDisconnect(presenceRef).remove();

    return () => {
      unsubSession();
      rdbSet(presenceRef, null); // Clean up on unmount
    };
    
  }, [activeStudent?.id, selectedCompetition, fingerprint?.uuid]);

  useEffect(() => {
    const fp = getDeviceFingerprint();
    setFingerprint(fp);

    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => {
        setDeviceInfo(prev => ({ ...prev, ip: data.ip }));
      })
      .catch(() => setDeviceInfo(prev => ({ ...prev, ip: 'مخفي/غير متاح' })));

    const ua = navigator.userAgent;
    let type = 'Desktop';
    if (/android/i.test(ua)) type = 'Android';
    else if (/iPad|iPhone|iPod/.test(ua)) type = 'iPhone/iOS';
    setDeviceInfo(prev => ({ ...prev, type }));
  }, []);

  const fetchStudentAndExam = async (input: string) => {
    if (!input || !input.trim()) return;
    setLastScanDebug(input);
    try {
      setIsScanning(false);
      setIsLoading(true);
      let studentId = input.trim().toLowerCase();
      let studentNameFromPayload = '';
      
      try {
        if (input.includes('{')) {
          const payload = JSON.parse(input);
          studentId = (payload.studentID || payload.id || input).toString().trim();
          studentNameFromPayload = payload.fullName || '';
        }
      } catch (e) {}

      const normalizedId = studentId.toLowerCase();

      let studentData: any = null;
      const cacheKey = `student_profile_${studentId}`;

      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          studentData = JSON.parse(cached);
        }
      } catch (e) {
        console.error("Error reading cached student profile:", e);
      }

      if (!studentData) {
        try {
          const docRef = doc(db, 'students', studentId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            studentData = { id: snap.id, ...(snap.data() as object) };
            localStorage.setItem(cacheKey, JSON.stringify(studentData));
          }
        } catch (e) {
          console.error("Error fetching student profile:", e);
        }
      }

      const isAdminUser = auth.currentUser?.email === 'admin@mafk.com' || auth.currentUser?.email === 'kareemsame77esoyam@gmail.com';
      if (!studentData && isAdminUser) {
        if (confirm(`لم يتم العثور على طالب بالكود "${studentId}". هل تريد إنشاء جلسة امتحان يدوية بهذا الكود؟ (لمسؤولي النظام فقط)`)) {
          studentData = {
            id: studentId,
            studentName: 'طالب يدوي - ' + studentId,
            churchName: 'إدخال يدوي',
            stage: 'عام',
            isManual: true
          };
        }
      }

      if (!studentData) {
        setIsLoading(false);
        return alert(`عذراً، هذا الكود غير مسجل: ${studentId}\nيرجى التأكد من الكود المطبوع أو مراجعة المشرف.`);
      }

      // No logging read per scan, immediately write action if needed, or simply log action.
      try {
        await setDoc(doc(db, 'exam_logs', Date.now().toString()), {
          ip: deviceInfo.ip,
          userAgent: navigator.userAgent,
          fingerprint: fingerprint,
          timestamp: new Date().toISOString(),
          studentId: studentData.id,
          studentName: studentData.name || studentData.studentName || studentNameFromPayload,
          churchName: studentData.churchName,
          deviceId: fingerprint?.uuid,
          deviceType: deviceInfo.type,
          action: 'IDENTIFIED'
        });
      } catch (e) {
        console.error("Failed to log exam login", e);
      }

      if (!studentData.studentName) studentData.studentName = studentData.name;

      const sessionData: any = {
        studentId: studentData.id,
        studentName: studentData.studentName,
        churchName: studentData.churchName,
        deviceId: fingerprint?.uuid,
        fingerprint: fingerprint,
        status: 'active',
        timestamp: new Date().toISOString(),
        lastUpdate: new Date().toISOString()
      };

      if (studentData.isManual) sessionData.isManual = true;

      await setDoc(doc(db, 'active_sessions', studentData.id), sessionData);

      setSelectedCompetition(null);
      setActiveExam(null);
      setIsExamCompleted(false);
      setIsAlreadyExamined(false);
      setIsTerminated(false);
      setAnswers({});
      setActiveStudent(studentData);
      localStorage.setItem('active_student_id', studentId);
      setIsScanning(false);
      setIsLoading(false);
      
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          osc.connect(gainNode);
          gainNode.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
        }
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
      } catch (err) {
        console.error("Feedback error", err);
      }
    } catch (e: any) {
      setIsLoading(false);
      alert('حدث خطأ غير متوقع: ' + (e.message || 'Error occurred'));
    }
  };

  const startExam = async (competitionType: string) => {
    try {
      if (!activeStudent) return;
      setIsLoading(true);
      
      const stage = activeStudent.data?.['المرحلة'] || activeStudent.stage;

      if (examConfig) {
        // Force exams to be live as requested by user
        if (false && !examConfig.isExamLive) {
          setIsLoading(false);
          return alert('عذراً، الامتحانات مغلقة الآن بقرار من اللجنة المركزية');
        }

        if (examConfig.autoCloseTime) {
          const now = new Date();
          const [hours, minutes] = examConfig.autoCloseTime.split(':').map(Number);
          const closeTime = new Date();
          closeTime.setHours(hours, minutes, 0, 0);
          
          if (now > closeTime) {
            setIsLoading(false);
            return alert(`عذراً، انتهى الوقت المحدد للامتحانات اليوم (${examConfig.autoCloseTime})`);
          }
        }
        if (examConfig.churchOverrides?.[activeStudent.churchName] === false) {
          setIsLoading(false);
          return alert(`عذراً، الامتحانات مغلقة حالياً لكنيسة ${activeStudent.churchName}`);
        }
        if (examConfig.stageOverrides?.[stage] === false) {
          setIsLoading(false);
          return alert(`عذراً، الامتحانات مغلقة حالياً لمرحلة ${stage}`);
        }
      }

      if (activeStudent.enrolled_subjects && Array.isArray(activeStudent.enrolled_subjects)) {
        if (!activeStudent.enrolled_subjects.includes(competitionType)) {
          setIsLoading(false);
          return alert("عذراً، أنت غير مسجل في هذه المسابقة. يرجى مراجعة اللجنة التنظيمية.");
        }
      }

      if (competitionType === 'قبطي مستوى أول' && Number(activeStudent.coptic_level) === 2) {
        setIsLoading(false);
        return alert("غير مسموح لك بدخول مستوى قبطي مخالف لمستواك المسجل.");
      }
      if (competitionType === 'قبطي مستوى ثاني' && Number(activeStudent.coptic_level) === 1) {
        setIsLoading(false);
        return alert("غير مسموح لك بدخول مستوى قبطي مخالف لمستواك المسجل.");
      }
      
      const field = SCORE_FIELD_MAP[competitionType];
      if (activeStudent[field] !== undefined && activeStudent[field] !== null) {
        setIsLoading(false);
        setScore(activeStudent[field]);
        setIsAlreadyExamined(true);
        setIsExamCompleted(true);
        setSelectedCompetition(competitionType);
        return;
      }

      // Explicitly clear any previous cached states for this subject
      localStorage.removeItem(`exam_${activeStudent.id}_${competitionType}`);
      setAnswers({});
      setIsExamCompleted(false);
      setIsTerminated(false);

      let availableExams: Exam[] = [];
      const cacheKey = `exams_${stage}_${competitionType}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        availableExams = JSON.parse(cached);
      } else {
        const examsSnap = await getDocs(
          query(
            collection(db, 'exams'), 
            where('stage', '==', stage), 
            where('competitionType', '==', competitionType), 
            where('isActive', '==', true)
          )
        );
        availableExams = examsSnap.docs.map(d => d.data() as Exam);
        sessionStorage.setItem(cacheKey, JSON.stringify(availableExams));
      }
      
      if (availableExams.length === 0) {
        setIsLoading(false);
        return alert(`لا يوجد امتحان متاح لمرحلة ${stage} في مسابقة ${competitionType}`);
      }
      
      const randomModel = availableExams[Math.floor(Math.random() * availableExams.length)];
      
      const shuffledQuestions = [...randomModel.questions].sort(() => 0.5 - Math.random());
      shuffledQuestions.forEach(q => {
        if (q.type === 'mcq') q.options.sort(() => 0.5 - Math.random());
        if (q.type === 'matching' && q.matchingPairs) {
          (q as any).shuffledRights = q.matchingPairs.map((p: any) => p.right).sort(() => 0.5 - Math.random());
        }
      });

      randomModel.questions = shuffledQuestions;
      
      setSelectedCompetition(competitionType);
      setActiveExam(randomModel);
      
      await setDoc(doc(db, 'active_sessions', activeStudent.id), {
         competition: competitionType,
         lastUpdate: new Date().toISOString()
      }, { merge: true });

      setIsLoading(false);
    } catch (e) {
      console.error(e);
      setIsLoading(false);
      alert('خطأ في بدء الامتحان');
    }
  };

  const handleAnswer = (qid: string, val: any) => {
    setAnswers(prev => {
      const next = { ...prev, [qid]: val };
      if (activeStudent && selectedCompetition) {
        localStorage.setItem(`exam_${activeStudent.id}_${selectedCompetition}`, JSON.stringify(next));
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!activeExam || !activeStudent || !selectedCompetition) return;
    if (!confirm('هل أنت متأكد من إنهاء الامتحان؟')) return;
    setIsLoading(true);

    let totalScore = 0;

    activeExam.questions.forEach((q) => {
      const stdAns = answers[q.id];
      const correctAns = q.correctAnswers?.[0];
      
      if (!stdAns) return;

      if (q.type === 'mcq' || q.type === 'boolean' || q.type === 'fill') {
        if (normalizeArabic(String(stdAns)) === normalizeArabic(String(correctAns))) {
          totalScore += q.points;
        }
      } else if (q.type === 'matching') {
        let correctMatches = 0;
        const matchingPairs = q.matchingPairs || [];
        matchingPairs.forEach((pair, pIdx) => {
           const sMatch = stdAns[pIdx];
           const rMatch = pair.right;
           if (normalizeArabic(sMatch) === normalizeArabic(rMatch)) {
             correctMatches++;
           }
        });
        if (correctMatches === matchingPairs.length) totalScore += q.points;
      }
    });

    setScore(totalScore);

    const field = SCORE_FIELD_MAP[selectedCompetition];

    try {
      const batch = writeBatch(db);
      
      const payload: any = {
        studentId: activeStudent.id,
        studentName: activeStudent.studentName || activeStudent.name || 'بدون اسم',
        gender: activeStudent.gender || '',
        church: activeStudent.churchName || 'غير محدد',
        churchName: activeStudent.churchName || 'غير محدد',
        stage: activeExam.stage,
        score: totalScore,
        year: String(CURRENT_YEAR),
        grade: '--',
        timestamp: new Date().toISOString(),
        isSubmitted: true,
        [field]: totalScore,
        data: {
          [selectedCompetition]: totalScore
        }
      };

      const onlineResultPayload = {
        studentId: activeStudent.id,
        studentID: activeStudent.id,
        studentName: activeStudent.studentName || activeStudent.name || 'بدون اسم',
        gender: activeStudent.gender || '',
        church: activeStudent.churchName || 'غير محدد',
        churchName: activeStudent.churchName || 'غير محدد',
        stage: activeExam.stage,
        year: String(CURRENT_YEAR),
        [`مسابقة ${selectedCompetition}`]: totalScore,
        submissionTimestamp: new Date().toISOString(),
        timestamp: new Date().toISOString()
      };

      batch.set(doc(db, 'results', activeStudent.id), payload, { merge: true });
      batch.set(doc(db, 'online_results', activeStudent.id), onlineResultPayload, { merge: true });
      batch.set(doc(db, 'participants', activeStudent.id), { [field]: totalScore, isSubmitted: true }, { merge: true });
      batch.delete(doc(db, 'active_sessions', activeStudent.id));
      
      await batch.commit();
      
      setIsExamCompleted(true);

      localStorage.removeItem(`exam_${activeStudent.id}_${selectedCompetition}`);
    } catch (e: any) {
      setIsLoading(false);
      alert('فشل في حفظ الدرجة: ' + (e.message || 'Error occurred'));
    }
  };

  if (isExamCompleted) {
    return (
      <div className="LiveExamGateway text-center p-12 bg-white border border-emerald-200 rounded-3xl shadow-xl overflow-hidden relative">
        <div className="absolute top-0 inset-x-0 h-2 bg-emerald-500" />
        <h2 className="text-3xl font-black mb-4 text-emerald-600">
          {isAlreadyExamined ? 'لقد قمت بتسليم هذا الامتحان مسبقاً!' : 'تم استلام إجاباتك بنجاح!'}
        </h2>
        {isAlreadyExamined && score > 0 && (
          <div className="mb-6 mx-auto inline-block bg-emerald-50 px-6 py-2 rounded-xl border border-emerald-100">
            <span className="font-bold text-emerald-800">الدرجة المسجلة: {score}</span>
          </div>
        )}
        <p className="text-slate-600 font-bold mb-6">نتمنى لك التوفيق.</p>
        <button 
          onClick={() => { localStorage.removeItem('active_student_id'); setIsExamCompleted(false); setIsAlreadyExamined(false); setActiveStudent(null); setActiveExam(null); setSelectedCompetition(null); }} 
          className="px-8 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-black hover:bg-emerald-200 transition-all"
        >
          خروج
        </button>
      </div>
    );
  }

  if (isTerminated) {
    return (
      <div className="LiveExamGateway text-center p-12 bg-white border border-rose-200 rounded-3xl shadow-xl overflow-hidden relative">
        <div className="absolute top-0 inset-x-0 h-2 bg-rose-500" />
        <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          <ShieldX size={48} />
        </div>
        <h2 className="text-3xl font-black mb-4 text-slate-800">تم إنهاء الجلسة</h2>
        <button 
          onClick={() => { localStorage.removeItem('active_student_id'); setIsTerminated(false); setActiveStudent(null); setActiveExam(null); setSelectedCompetition(null); }} 
          className="px-8 py-3 bg-slate-100 text-slate-600 rounded-xl font-black hover:bg-slate-200 transition-all"
        >
          الخروج
        </button>
      </div>
    );
  }

  if (!activeStudent && !isScanning) {
    return (
      <div className="LiveExamGateway text-center p-12 bg-white border border-slate-200 rounded-3xl shadow-xl">
        <h3 className="text-2xl font-black mb-2 text-slate-800">بوابة الامتحان الإلكتروني</h3>
        
        <div className="max-w-xs mx-auto space-y-4">
          <button 
            onClick={() => setIsScanning(true)} 
            className="w-full px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            مسح QR كود
          </button>
          
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="كود الطالب"
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-center"
              onKeyDown={(e) => {
                if (e.key === 'Enter') fetchStudentAndExam((e.target as HTMLInputElement).value);
              }}
              id="manual-student-id"
            />
            <button 
              onClick={() => {
                const input = document.getElementById('manual-student-id') as HTMLInputElement;
                if (input?.value) fetchStudentAndExam(input.value);
              }}
              className="px-4 py-3 bg-indigo-100 text-indigo-600 rounded-xl font-black"
            >
              دخول
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!activeStudent && isScanning) {
    return (
      <div className="LiveExamGateway bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center">
        <h3 className="text-2xl font-black mb-6 text-slate-800">توجيه الكاميرا نحو كود الطالب</h3>
        <div className="max-w-md mx-auto aspect-square rounded-2xl overflow-hidden bg-slate-900 border-4 border-slate-100 shadow-inner mb-6 relative">
          <QRScanner onScanSuccess={(id) => fetchStudentAndExam(id)} />
        </div>
        <button 
          onClick={() => setIsScanning(false)}
          className="px-8 py-3 bg-slate-100 text-slate-600 rounded-xl font-black hover:bg-slate-200 transition-all"
        >
          إلغاء
        </button>
      </div>
    );
  }

  if (activeStudent && !selectedCompetition) {
     const stage = activeStudent.data?.['المرحلة'] || activeStudent.stage;
     return (
       <div className="LiveExamGateway bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center">
         <h3 className="text-2xl font-black text-slate-800 mb-8">{activeStudent.studentName}</h3>
         
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto mb-8">
           {COMPETITION_TYPES.filter(type => {
              if (activeStudent.enrolled_subjects && Array.isArray(activeStudent.enrolled_subjects)) {
                  if (!activeStudent.enrolled_subjects.includes(type)) return false;
              }
              if (type === 'قبطي مستوى أول' && Number(activeStudent.coptic_level) === 2) return false;
              if (type === 'قبطي مستوى ثاني' && Number(activeStudent.coptic_level) === 1) return false;
              return true;
            }).length === 0 ? (
              <div className="col-span-full p-8 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 font-bold text-center">
                لا يوجد امتحانات متاحة لك حالياً.
              </div>
            ) : (
                COMPETITION_TYPES.filter(type => {
                  if (activeStudent.enrolled_subjects && Array.isArray(activeStudent.enrolled_subjects)) {
                      if (!activeStudent.enrolled_subjects.includes(type)) return false;
                  }
                  if (type === 'قبطي مستوى أول' && Number(activeStudent.coptic_level) === 2) return false;
                  if (type === 'قبطي مستوى ثاني' && Number(activeStudent.coptic_level) === 1) return false;
                  return true;
                }).map(type => (
               <button
                 key={type}
                 onClick={() => startExam(type)}
                 disabled={isLoading}
                 className="p-6 bg-slate-50 border border-slate-200 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 transition-all"
               >
                 <h5 className="font-black text-slate-800 text-lg mb-1">{type}</h5>
               </button>
             ))
           )}
         </div>
         <button 
           onClick={() => { localStorage.removeItem('active_student_id'); setActiveStudent(null); }} 
           className="px-8 py-3 bg-rose-50 text-rose-600 rounded-xl font-black hover:bg-rose-100 transition-all"
         >
           إلغاء / خروج
         </button>
       </div>
     );
  }

  if (isLoading) {
    return (
      <div className="LiveExamGateway text-center p-12 bg-white border border-slate-200 rounded-3xl shadow-xl">
        <Loader2 className="animate-spin text-indigo-600 mx-auto" size={48} />
        <p className="mt-4 text-slate-500 font-bold">جاري تحميل أسئلة الامتحان...</p>
      </div>
    );
  }

  if (!activeExam || !activeExam.questions || activeExam.questions.length === 0) {
    return (
      <div className="LiveExamGateway text-center p-12 bg-white border border-rose-200 rounded-3xl shadow-xl">
        <ShieldX className="text-rose-500 mx-auto mb-4" size={48} />
        <p className="text-slate-700 font-bold">عذراً، لم يتم العثور على أسئلة لهذه المسابقة أو انتهى وقت الامتحان.</p>
        <button 
          onClick={() => { localStorage.removeItem('active_student_id'); setActiveStudent(null); setSelectedCompetition(null); setActiveExam(null); }} 
          className="mt-6 px-6 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
        >
          رجوع
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
      <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
        {activeExam.questions.map((q, i) => (
          <div key={q.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <h4 className="text-lg font-bold mb-4">{i + 1}. {q.text}</h4>
            
            {(q.type === 'mcq' || q.type === 'boolean') && (
              <div className="space-y-3">
                {q.options.map((opt, oIndex) => (
                    <label key={oIndex} className="block p-4 rounded-xl border border-slate-200 cursor-pointer">
                      <input 
                        type="radio"
                        checked={answers[q.id] === opt}
                        onChange={() => handleAnswer(q.id, opt)}
                        className="w-5 h-5 accent-indigo-600"
                      />
                      <span className="font-medium text-slate-700 ml-2">{opt}</span>
                    </label>
                ))}
              </div>
            )}
          </div>
        ))}
        <button onClick={handleSubmit} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-indigo-700">
          تسليم الامتحان
        </button>
      </div>
    </div>
  );
};
