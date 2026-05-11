import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, getDocs, onSnapshot, getDoc, updateDoc, query, where, deleteDoc } from 'firebase/firestore';
import { Plus, Trash2, Save, FileText, CheckCircle, Video, Key, BookOpen, Clock, Activity, Users, Wallet, ShieldX } from 'lucide-react';
import { QRScanner } from './QRScanner';
import { getDeviceFingerprint, DeviceFingerprint } from '../lib/deviceTracking';

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
  model: string; // A, B, C
  questions: Question[];
  isActive: boolean;
  updatedAt: string;
}

const COMPETITION_TYPES = [
  'دراسي',
  'محفوظات',
  'قبطي مستوى أول',
  'قبطي مستوى ثاني'
];

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

            {/* MCQ & Boolean UI */}
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

            {/* Matching UI */}
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

            {/* Fill in the blanks UI */}
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
  const [score, setScore] = useState(0);
  const [deviceInfo, setDeviceInfo] = useState({ ip: 'جاري التحميل...', type: 'غير معروف', count: 0 });
  const [fingerprint, setFingerprint] = useState<DeviceFingerprint | null>(null);
  const [lastScanDebug, setLastScanDebug] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTerminated, setIsTerminated] = useState(false);

  useEffect(() => {
    if (!activeStudent?.id) return;
    const unsub = onSnapshot(doc(db, 'active_sessions', activeStudent.id), (snap) => {
      if (snap.exists() && snap.data()?.status === 'terminated') {
        setIsTerminated(true);
        setActiveStudent(null);
        setSelectedCompetition(null);
        setActiveExam(null);
        // Clear local cache for this student to prevent re-entry attempt if they reload
        localStorage.removeItem(`exam_${activeStudent.id}_${selectedCompetition}`);
      }
    });
    return () => unsub();
  }, [activeStudent?.id, selectedCompetition]);

  useEffect(() => {
    const fp = getDeviceFingerprint();
    setFingerprint(fp);

    // Attempt to get IP
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => {
        setDeviceInfo(prev => ({ ...prev, ip: data.ip }));
      })
      .catch(() => setDeviceInfo(prev => ({ ...prev, ip: 'مخفي/غير متاح' })));

    // Detect device type
    const ua = navigator.userAgent;
    let type = 'Desktop';
    if (/android/i.test(ua)) type = 'Android';
    else if (/iPad|iPhone|iPod/.test(ua)) type = 'iPhone/iOS';
    setDeviceInfo(prev => ({ ...prev, type }));
  }, []);

  const fetchStudentAndExam = async (input: string) => {
    console.log('--- SCANNER DEBUG: Input Received ---', input);
    setLastScanDebug(input);
    try {
      setIsLoading(true);
      let studentId = input.trim();
      let studentNameFromPayload = '';
      
      // Attempt to parse JSON if it looks like our payload
      try {
        if (input.includes('{')) {
          const payload = JSON.parse(input);
          studentId = (payload.studentID || payload.id || input).toString().trim();
          studentNameFromPayload = payload.fullName || '';
          console.log('--- SCANNER DEBUG: JSON Payload Parsed ---', payload);
        }
      } catch (e) {
        console.warn('QR scan not a JSON payload or parsing failed, using raw string');
      }

      console.log('--- SCANNER DEBUG: Searching for studentId ---', studentId);

      // Blacklist Check
      if (fingerprint?.uuid) {
        const blSnap = await getDoc(doc(db, 'blacklist', fingerprint.uuid));
        if (blSnap.exists()) {
          setIsLoading(false);
          return alert('عذراً، هذا الجهاز تم حظره من دخول الامتحانات نظراً لمخالفات سابقة.');
        }
      }

      let studentData: any = null;

      // Step 1: Try direct ID match in participants (Source of Truth)
      const partDocRef = doc(db, 'participants', studentId);
      const partSnap = await getDoc(partDocRef);
      
      if (partSnap.exists()) {
        studentData = { id: partSnap.id, ...(partSnap.data() as object) };
        console.log('--- SCANNER DEBUG: Found in participants by ID ---', studentData);
      } else {
        // Step 2: Try serial match in participants
        const partRef = collection(db, 'participants');
        const qSerial = query(partRef, where('serial', '==', studentId));
        const qSnap = await getDocs(qSerial);
        
        if (!qSnap.empty) {
          const docFound = qSnap.docs[0];
          studentData = { id: docFound.id, ...(docFound.data() as object) };
          console.log('--- SCANNER DEBUG: Found in participants by Serial ---', studentData);
        }
      }

      // Step 3: Check Results collection for existing scores (Sync identity)
      if (studentData) {
        const resDocRef = doc(db, 'results', studentData.id);
        const resSnap = await getDoc(resDocRef);
        
        if (resSnap.exists()) {
           // Merge result data (scores) into student data
           studentData = { ...studentData, ...(resSnap.data() as object) };
           console.log('--- SCANNER DEBUG: Merged with existing results ---', resSnap.data());
        } else {
           console.log('--- SCANNER DEBUG: No results doc yet, will create on submission ---');
        }
      }

      if (!studentData) {
        setIsLoading(false);
        console.error('--- SCANNER DEBUG: NOT FOUND ---');
        return alert(`لم يتم العثور على طالب بالكود: ${studentId}\nتأكد من صحة الكود أو تواصل مع المسئول.`);
      }
      
      const deviceId = localStorage.getItem('coptic_device_id');
      
      // Log access with fingerprint
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

      // Normalize studentName field
      if (!studentData.studentName) studentData.studentName = studentData.name;

      // Create Active Session
      await setDoc(doc(db, 'active_sessions', studentData.id), {
        studentId: studentData.id,
        studentName: studentData.studentName,
        churchName: studentData.churchName,
        deviceId: fingerprint?.uuid,
        status: 'active',
        timestamp: new Date().toISOString(),
        lastUpdate: new Date().toISOString()
      });

      setActiveStudent(studentData);
      setIsScanning(false);
      setIsLoading(false);
    } catch (e: any) {
      console.error('--- SCANNER DEBUG: ERROR ---', e);
      setIsLoading(false);
      alert('خطأ في استرجاع البيانات: ' + (e.message || 'Error occurred'));
    }
  };

  const startExam = async (competitionType: string) => {
    try {
      if (!activeStudent) return;
      setIsLoading(true);
      
      const stage = activeStudent.data?.['المرحلة'] || activeStudent.stage;
      
      // Check if already taken this specific competition
      const scoreFieldMap: Record<string, string> = {
        'دراسي': 'academicScore',
        'محفوظات': 'memorizationScore',
        'قبطي مستوى أول': 'copticL1Score',
        'قبطي مستوى ثاني': 'copticL2Score'
      };
      
      const field = scoreFieldMap[competitionType];
      if (activeStudent[field] !== undefined && activeStudent[field] !== null) {
        setIsLoading(false);
        return alert(`عفواً، لقد قمت بأداء امتحان ${competitionType} سابقاً. لا يسمح بإعادته إلا بإذن المسئول.`);
      }

      const examsSnap = await getDocs(collection(db, 'exams'));
      const availableExams = examsSnap.docs
        .map(d => d.data() as Exam)
        .filter(e => e.stage === stage && e.competitionType === competitionType && e.isActive);
      
      if (availableExams.length === 0) {
        setIsLoading(false);
        return alert(`لا يوجد امتحان متاح لمرحلة ${stage} في مسابقة ${competitionType}`);
      }
      
      const randomModel = availableExams[Math.floor(Math.random() * availableExams.length)];
      
      // Shuffle questions
      const shuffledQuestions = [...randomModel.questions].sort(() => 0.5 - Math.random());
      shuffledQuestions.forEach(q => {
        if (q.type === 'mcq') q.options.sort(() => 0.5 - Math.random());
        if (q.type === 'matching' && q.matchingPairs) {
          (q as any).shuffledRights = q.matchingPairs.map(p => p.right).sort(() => 0.5 - Math.random());
        }
      });

      randomModel.questions = shuffledQuestions;
      
      const saved = localStorage.getItem(`exam_${activeStudent.id}_${competitionType}`);
      if (saved) setAnswers(JSON.parse(saved));
      else setAnswers({});

      setSelectedCompetition(competitionType);
      setActiveExam(randomModel);
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
    activeExam.questions.forEach(q => {
      const stdAns = answers[q.id];
      if (!stdAns) return;

      if (q.type === 'mcq' || q.type === 'boolean') {
        if (stdAns === q.correctAnswers[0]) totalScore += q.points;
      } else if (q.type === 'fill') {
        if (stdAns.trim() === q.correctAnswers[0].trim()) totalScore += q.points;
      } else if (q.type === 'matching') {
        // Matching stdAns is expected to be Record<leftIndex, rightValue>
        let correctMatches = 0;
        q.matchingPairs?.forEach((pair, idx) => {
           if (stdAns[idx] === pair.right) correctMatches++;
        });
        if (correctMatches === q.matchingPairs?.length) totalScore += q.points;
        else if (correctMatches > 0) {
           // Partial credit? User didn't specify. Let's do full match for now.
        }
      }
    });

    setScore(totalScore);

    const scoreFieldMap: Record<string, string> = {
      'دراسي': 'academicScore',
      'محفوظات': 'memorizationScore',
      'قبطي مستوى أول': 'copticL1Score',
      'قبطي مستوى ثاني': 'copticL2Score'
    };
    
    const field = scoreFieldMap[selectedCompetition];

    try {
      // Use setDoc with merge: true to handle missing results documents
      await setDoc(doc(db, 'results', activeStudent.id), {
        studentName: activeStudent.studentName || activeStudent.name || 'بدون اسم',
        churchName: activeStudent.churchName || 'غير محدد',
        stage: activeExam.stage,
        score: totalScore, // Default main score, might be overwritten by specific competitions
        grade: '--',
        timestamp: new Date().toISOString(),
        [field]: totalScore,
        [`data.${selectedCompetition}`]: totalScore,
        submissionInfo: {
          timestamp: new Date().toISOString(),
          ip: deviceInfo.ip,
          deviceId: fingerprint?.uuid,
          fingerprint: fingerprint,
          userAgent: navigator.userAgent,
          competitionType: selectedCompetition
        }
      }, { merge: true });
      
      setIsExamCompleted(true);
      setIsLoading(false);
      
      // Remove Active Session on normal completion
      try {
        await deleteDoc(doc(db, 'active_sessions', activeStudent.id));
      } catch (e) {
        console.warn('Could not delete active session doc', e);
      }

      localStorage.removeItem(`exam_${activeStudent.id}_${selectedCompetition}`);
    } catch (e: any) {
      console.error('Submission error:', e);
      setIsLoading(false);
      alert('فشل في حفظ الدرجة: ' + (e.message || 'Error occurred'));
    }
  };

  if (isTerminated) {
    return (
      <div className="text-center p-12 bg-white border border-rose-200 rounded-3xl shadow-xl overflow-hidden relative">
        <div className="absolute top-0 inset-x-0 h-2 bg-rose-500" />
        <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          <ShieldX size={48} />
        </div>
        <h2 className="text-3xl font-black mb-4 text-slate-800">تم إنهاء الجلسة</h2>
        <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 mb-8 max-w-md mx-auto">
           <p className="text-rose-700 font-bold text-lg">عذراً، تم إنهاء محاولة الامتحان الخاصة بك بواسطة الإدارة.</p>
           <p className="text-rose-500 text-sm mt-2">يرجى مراجعة اللجنة المنظمة في حال وجود خطأ.</p>
        </div>
        <button 
          onClick={() => { setIsTerminated(false); setActiveStudent(null); setActiveExam(null); setSelectedCompetition(null); }} 
          className="px-8 py-3 bg-slate-100 text-slate-600 rounded-xl font-black hover:bg-slate-200 transition-all"
        >
          الخروج
        </button>
      </div>
    );
  }

  if (!activeStudent && !isScanning) {
    return (
      <div className="text-center p-12 bg-white border border-slate-200 rounded-3xl shadow-xl">
        <div className="mb-6 flex justify-center gap-4 text-[10px] font-black uppercase text-slate-400">
           <span className="flex items-center gap-1"><Activity size={12}/> IP: {deviceInfo.ip}</span>
           <span className="flex items-center gap-1"><Activity size={12}/> {deviceInfo.type}</span>
        </div>
        <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <BookOpen size={40} />
        </div>
        <h3 className="text-2xl font-black mb-2 text-slate-800">بوابة الامتحان الإلكتروني</h3>
        <p className="text-slate-500 mb-8 font-bold">يرجى مسح كود الطالب أو إدخال رقم المسلسل للبدء</p>
        
        <div className="max-w-xs mx-auto space-y-4">
          <button 
            onClick={() => setIsScanning(true)} 
            className="w-full px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <FileText size={24} /> مسح QR كود الطالب
          </button>
          
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-slate-400 text-xs font-black uppercase">أو</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="كود الطالب"
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-center"
              onKeyDown={(e) => {
                if (e.key === 'Enter') fetchStudentAndExam((e.target as HTMLInputElement).value);
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (isScanning) {
    return (
      <div className="p-8 bg-white border border-slate-200 rounded-3xl text-center shadow-xl">
        <h3 className="text-xl font-black mb-6 text-slate-800">يُرجى مسح الكود التعريفي للطالب</h3>
        <div className="max-w-sm mx-auto overflow-hidden rounded-2xl border-4 border-indigo-100 shadow-inner">
          <QRScanner onScanSuccess={fetchStudentAndExam} />
        </div>
        {lastScanDebug && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-mono break-all text-amber-700">
            <span className="font-black block mb-1">آخر قراءة للكاميرا:</span>
            {lastScanDebug}
          </div>
        )}
        <button 
          onClick={() => setIsScanning(false)} 
          className="mt-8 px-8 py-3 bg-slate-100 text-slate-600 rounded-xl font-black hover:bg-slate-200 transition-all"
        >
          إلغاء
        </button>
      </div>
    );
  }

  if (activeStudent && !selectedCompetition) {
     const stage = activeStudent.data?.['المرحلة'] || activeStudent.stage;
     return (
       <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center">
         <div className="flex flex-col items-center mb-8">
           <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-md">
             <Users size={32} className="text-indigo-600" />
           </div>
           <h3 className="text-2xl font-black text-slate-800">{activeStudent.studentName}</h3>
           <p className="text-indigo-600 font-bold bg-indigo-50 px-4 py-1 rounded-full mt-2">مرحلة {stage}</p>
         </div>

         <h4 className="text-lg font-black text-slate-700 mb-6 flex items-center justify-center gap-2">
           <Activity size={20} className="text-indigo-500"/> اختر نوع الامتحان
         </h4>
         
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto">
           {COMPETITION_TYPES.map(type => (
             <button
               key={type}
               onClick={() => startExam(type)}
               disabled={isLoading}
               className="p-6 bg-slate-50 border border-slate-200 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 transition-all group relative overflow-hidden"
             >
               <div className="absolute top-0 right-0 w-1 h-full bg-indigo-500 transition-all opacity-0 group-hover:opacity-100" />
               <h5 className="font-black text-slate-800 text-lg mb-1">{type}</h5>
               <p className="text-xs text-slate-400 font-bold">ابدأ امتحان {type} الإلكتروني</p>
             </button>
           ))}
         </div>

         <button 
           onClick={() => { setActiveStudent(null); setSelectedCompetition(null); }}
           className="mt-8 text-slate-400 font-bold hover:text-red-500 transition-colors text-sm"
         >
           إلغاء والعودة للبوابة
         </button>
       </div>
     );
  }

  if (isExamCompleted) {
    return (
      <div className="text-center p-12 bg-white border border-emerald-200 rounded-3xl shadow-xl overflow-hidden relative">
        <div className="absolute top-0 inset-x-0 h-2 bg-emerald-500" />
        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          <CheckCircle size={48} />
        </div>
        <h2 className="text-3xl font-black mb-2 text-slate-800">تم إنهاء الامتحان بنجاح</h2>
        <p className="text-slate-500 font-bold mb-8">لقد تم حفظ نتيجتك في مسابقة {selectedCompetition}</p>
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-10 inline-block min-w-[200px]">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">الدرجة المحصلة</p>
          <p className="text-5xl font-black text-indigo-600">{score}</p>
        </div>
        <button 
          onClick={() => { setActiveStudent(null); setActiveExam(null); setSelectedCompetition(null); setIsExamCompleted(false); }} 
          className="block w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 mt-4"
        >
          العودة للبوابة الرئيسية
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
      {isLoading && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-[1px] z-[100] flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <div className="bg-indigo-600 p-6 flex flex-col md:flex-row justify-between items-center text-white gap-4">
        <div>
          <h2 className="text-2xl font-black">{activeStudent?.studentName}</h2>
          <div className="flex items-center gap-3 opacity-90 mt-1">
             <span className="text-sm font-bold bg-white/20 px-3 py-1 rounded-full">{selectedCompetition}</span>
             <span className="text-sm font-bold bg-white/20 px-3 py-1 rounded-full">{activeExam?.stage}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="font-mono bg-white/20 px-4 py-2 rounded-xl text-lg font-black">
            نموذج {activeExam?.model}
          </div>
          <div className="flex flex-col items-end text-[10px] font-black opacity-60">
             <span>IP: {deviceInfo.ip}</span>
             <span>ID: {localStorage.getItem('coptic_device_id')?.slice(-6).toUpperCase()}</span>
          </div>
        </div>
      </div>
      
      <div className="p-6 md:p-8 space-y-8 max-h-[70vh] overflow-y-auto no-scrollbar">
        {activeExam?.questions.map((q, i) => (
          <div key={q.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <h4 className="text-lg font-bold mb-4">{i + 1}. {q.text} <span className="text-sm font-normal text-slate-400">({q.points} درجات)</span></h4>
            
            {(q.type === 'mcq' || q.type === 'boolean') && (
              <div className="space-y-3">
                {q.options.map((opt, oIndex) => {
                  const isChecked = answers[q.id] === opt;
                  return (
                    <label key={oIndex} className={`block p-4 rounded-xl border cursor-pointer transition-all ${isChecked ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:border-indigo-300'}`}>
                      <div className="flex items-center gap-3">
                        <input 
                          type="radio"
                          name={`q_${q.id}`}
                          checked={isChecked}
                          onChange={() => handleAnswer(q.id, opt)}
                          className="w-5 h-5 accent-indigo-600"
                        />
                        <span className="font-medium text-slate-700">{opt}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {q.type === 'fill' && (
              <input 
                type="text"
                value={answers[q.id] || ''}
                onChange={e => handleAnswer(q.id, e.target.value)}
                placeholder="اكتب الإجابة هنا..."
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 outline-none"
              />
            )}

            {q.type === 'matching' && (
              <div className="space-y-4">
                {q.matchingPairs?.map((pair, pIdx) => (
                  <div key={pIdx} className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1 w-full p-3 bg-white border border-slate-200 rounded-xl text-center font-bold">
                       {pair.left}
                    </div>
                    <div className="text-slate-300">↔</div>
                    <select 
                      value={answers[q.id]?.[pIdx] || ''}
                      onChange={e => {
                        const current = answers[q.id] || {};
                        handleAnswer(q.id, { ...current, [pIdx]: e.target.value });
                      }}
                      className="flex-1 w-full p-3 border-2 border-indigo-100 rounded-xl bg-white font-bold"
                    >
                      <option value="">اختر المطابق...</option>
                      {(q as any).shuffledRights?.map((r: string, rIdx: number) => (
                        <option key={rIdx} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        
        <button onClick={handleSubmit} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-opacity-90 transition-all">
          تسليم الامتحان
        </button>
      </div>
    </div>
  );
};
