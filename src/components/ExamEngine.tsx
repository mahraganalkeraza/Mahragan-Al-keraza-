import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Plus, Trash, Save, Play, CheckCircle, AlertTriangle, ArrowRight, 
  Award, FileText, ClipboardList, Send, Edit, HelpCircle, RefreshCw 
} from 'lucide-react';

// Safe Supabase helper that returns a working client if configured, or a safe fallback mock if not
function createSafeSupabaseClient() {
  const url = (((import.meta as any).env.VITE_SUPABASE_URL || "") as string).trim();
  const key = (((import.meta as any).env.VITE_SUPABASE_ANON_KEY || "") as string).trim();

  // Validate if URL is a valid HTTP/HTTPS url
  const isValidUrl = url && (url.startsWith('http://') || url.startsWith('https://')) && !url.includes('PLACEHOLDER') && !url.includes('YOUR_');

  if (!isValidUrl) {
    console.warn("Supabase URL is not configured or is invalid. Falling back to safe mock client.");
    // Return a safe mock object that won't throw on .from().upsert()
    return {
      from: () => ({
        upsert: async () => ({ error: null }),
        select: async () => ({ data: [], error: null })
      })
    } as any;
  }

  try {
    return createClient(url, key);
  } catch (err) {
    console.error("Error creating Supabase client:", err);
    return {
      from: () => ({
        upsert: async () => ({ error: err as any }),
        select: async () => ({ data: [], error: err as any })
      })
    } as any;
  }
}

export const supabase = createSafeSupabaseClient();

// Types
export interface Question {
  id: string;
  type: 'mcq' | 'true_false' | 'matching';
  text: string;
  options?: string[];
  correctAnswer?: string;
  matchingPairs?: { left: string; right: string }[];
  shuffledRights?: string[];
}

export interface Exam {
  id: string;
  title: string;
  questions: Question[];
  updated_at?: string;
}

// ==========================================
// FIX 05: Prevent Matching Questions UI Crash (Component: QuestionCard)
// ==========================================
export function QuestionCard({
  q,
  answer,
  onAnswer,
}: {
  q: Question;
  answer: any;
  onAnswer: (qId: string, ans: any) => void;
}) {
  const currentListAnswers = answer || {};

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 mb-4 text-right" dir="rtl">
      <div className="flex items-start gap-3">
        <span className="bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2.5 py-1 rounded-xl text-xs font-black shrink-0">
          سؤال
        </span>
        <h3 className="text-sm font-black text-slate-100 leading-relaxed mb-4">{q.text}</h3>
      </div>

      {/* MCQ Type */}
      {q.type === 'mcq' && q.options && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          {q.options.map((opt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onAnswer(q.id, opt)}
              className={`px-4 py-3 rounded-xl font-bold text-xs text-right transition-all border ${
                answer === opt
                  ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                  : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* True/False Type */}
      {q.type === 'true_false' && (
        <div className="grid grid-cols-2 gap-3 mt-2">
          {['صح', 'خطأ'].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onAnswer(q.id, opt)}
              className={`px-4 py-3 rounded-xl font-bold text-xs text-center transition-all border ${
                answer === opt
                  ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                  : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* Matching Pairs Type */}
      {q.type === 'matching' && q.matchingPairs && (
        <div className="space-y-4 mt-2">
          <p className="text-[10px] text-slate-400 font-bold mb-2">قم بمطابقة كل عنصر في العمود الأيمن مع ما يناسبه في العمود الأيسر:</p>
          {q.matchingPairs.map((pair, pIdx) => (
            <div key={pIdx} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-850">
              <span className="text-xs font-black text-slate-200 pr-2">{pair.left}</span>
              <div className="w-full sm:w-64">
                <select
                  id={`select-match-${q.id}-${pIdx}`}
                  value={currentListAnswers[pIdx] || ""}
                  onChange={(e) => {
                    const nextList = { ...currentListAnswers, [pIdx]: e.target.value };
                    onAnswer(q.id, nextList);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 focus:border-[#d4af37] focus:ring-2 focus:ring-amber-100 rounded-lg bg-white font-bold text-xs text-slate-700 outline-none transition-all font-sans"
                >
                  <option value="">اختر المطابقة الصحيحة...</option>
                  {((q as any).shuffledRights || q.matchingPairs?.map((p: any) => p.right) || []).map(
                    (rItem: string, rIdx: number) => (
                      <option key={rIdx} value={rItem}>
                        {rItem}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// FIX 04: Stabilize Routing Callback Guards (Component: LiveExamGateway)
// ==========================================
export function LiveExamGateway({
  exam,
  onBack,
}: {
  exam: Exam;
  onBack: () => void;
}) {
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(1800); // 30 minutes

  // Calculate score locally
  const calculateScore = useCallback(() => {
    let correct = 0;
    const questions = exam.questions || [];
    if (questions.length === 0) return 100;

    questions.forEach((q) => {
      const ans = currentAnswers[q.id];
      if (q.type === 'mcq' || q.type === 'true_false') {
        if (ans === q.correctAnswer) {
          correct++;
        }
      } else if (q.type === 'matching' && q.matchingPairs) {
        let isMatchCorrect = true;
        q.matchingPairs.forEach((pair, idx) => {
          if (ans?.[idx] !== pair.right) {
            isMatchCorrect = false;
          }
        });
        if (isMatchCorrect) correct++;
      }
    });

    return Math.round((correct / questions.length) * 100);
  }, [currentAnswers, exam.questions]);

  // handleSubmitExam Callback memoized properly
  const handleSubmitExam = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      // Simulate submission network call
      await new Promise((resolve) => setTimeout(resolve, 800));
      const finalScore = calculateScore();
      setScore(finalScore);
      setSubmitted(true);
    } catch (err) {
      console.error("Submission failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  }, [calculateScore, isSubmitting]);

  // Auto-submit timer
  useEffect(() => {
    if (submitted) return;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [handleSubmitExam, submitted]);

  const handleAnswerChange = (qId: string, answerValue: any) => {
    setCurrentAnswers((prev) => ({
      ...prev,
      [qId]: answerValue,
    }));
  };

  const formatTimeRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (submitted) {
    return (
      <div className="w-full max-w-2xl bg-slate-950/90 border border-slate-800 rounded-3xl p-6 md:p-8 text-center relative z-10 shadow-2xl" dir="rtl">
        <Award className="mx-auto text-amber-400 mb-4 animate-bounce" size={56} />
        <h2 className="text-xl font-black text-slate-100 mb-2">اكتمل الاختبار بنجاح!</h2>
        <p className="text-slate-400 text-xs font-bold mb-6">{exam.title}</p>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6 inline-block min-w-[180px]">
          <p className="text-slate-500 text-[10px] font-black uppercase mb-1">الدرجة النهائية</p>
          <p className="text-3xl font-black text-amber-400 font-mono">% {score}</p>
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-2 transition-all"
          >
            <ArrowRight size={16} />
            العودة للقائمة الرئيسية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl bg-slate-950/90 border border-slate-800 rounded-3xl p-6 md:p-8 relative z-10 shadow-2xl" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5 mb-6">
        <div>
          <h1 className="text-lg font-black text-amber-400">{exam.title}</h1>
          <p className="text-slate-400 text-[10px] font-bold mt-1">يرجى قراءة الأسئلة جيداً والتركيز قبل الإجابة</p>
        </div>
        <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 font-mono text-emerald-400 text-sm font-black flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-slate-500 font-bold">الوقت المتبقي:</span>
          <span>{formatTimeRemaining(timeRemaining)}</span>
        </div>
      </div>

      {/* Question List */}
      <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
        {exam.questions && exam.questions.length > 0 ? (
          exam.questions.map((q) => (
            <QuestionCard
              key={q.id}
              q={q}
              answer={currentAnswers[q.id]}
              onAnswer={handleAnswerChange}
            />
          ))
        ) : (
          <p className="text-center text-slate-500 text-xs font-bold py-6">لا توجد أسئلة مضافة لهذا الاختبار بعد.</p>
        )}
      </div>

      {/* Footer Submission Actions */}
      <div className="flex justify-between items-center border-t border-slate-800 pt-5 mt-6">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-white font-bold text-xs rounded-xl transition-all"
        >
          خروج مؤقت
        </button>

        <button
          type="button"
          onClick={handleSubmitExam}
          disabled={isSubmitting}
          className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 transition-all shadow-md shadow-amber-500/20"
        >
          {isSubmitting ? (
            <RefreshCw className="animate-spin" size={16} />
          ) : (
            <Send size={16} />
          )}
          إنهاء وإرسال الإجابات
        </button>
      </div>
    </div>
  );
}

// ==========================================
// FIX 01, 02, 03: Component: ExamBuilder
// ==========================================
export function ExamBuilder({
  onBack,
}: {
  onBack: () => void;
}) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [examId, setExamId] = useState<string>('exam-' + Date.now());
  const [examTitle, setExamTitle] = useState<string>('اختبار جديد لمهرجان الكرازة');
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // States for adding question
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState<'mcq' | 'true_false' | 'matching'>('mcq');
  const [qOptions, setQOptions] = useState<string[]>(['', '']);
  const [qCorrect, setQCorrect] = useState('');
  const [qPairs, setQPairs] = useState<{ left: string; right: string }[]>([{ left: '', right: '' }]);

  // Load initial exams pool from cache or localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('exams_pool');
      if (stored) {
        setExams(JSON.parse(stored));
      } else {
        // Seed default template
        const defaultExam: Exam = {
          id: 'exam-2026',
          title: 'مسابقة الألحان والطقوس - المستوى الأول',
          questions: [
            {
              id: 'q1',
              type: 'mcq',
              text: 'أي من الكنائس التالية بنيت في القرن الرابع الميلادي؟',
              options: ['الكنيسة المعلقة', 'كنيسة مارجرجس', 'كنيسة أبي سيفين', 'دير المحرق'],
              correctAnswer: 'الكنيسة المعلقة'
            },
            {
              id: 'q2',
              type: 'true_false',
              text: 'يعتبر قداس القديس باسيليوس هو القداس الأكثر استخداماً في الكنيسة القبطية الأرثوذكسية.',
              correctAnswer: 'صح'
            },
            {
              id: 'q3',
              type: 'matching',
              text: 'طابق الرمز اللاهوتي بمعناه الروحي:',
              matchingPairs: [
                { left: 'البخور', right: 'صلوات القديسين صاعدة' },
                { left: 'الشموع', right: 'نور المسيح المضيء' },
                { left: 'الماء', right: 'التطهير والغسيل الروحي' }
              ],
              shuffledRights: ['نور المسيح المضيء', 'صلوات القديسين صاعدة', 'التطهير والغسيل الروحي']
            }
          ]
        };
        setExams([defaultExam]);
        localStorage.setItem('exams_pool', JSON.stringify([defaultExam]));
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  // ==========================================
  // FIX 03: Resolve Database State Discrepancy (Function: handleSaveExam)
  // ==========================================
  const handleSaveExam = async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const payload = {
        id: examId,
        title: examTitle,
        questions: currentQuestions,
        updated_at: new Date().toISOString(),
      };

      // Execute upsert into Supabase pool
      let hasError = false;
      if ((import.meta as any).env.VITE_SUPABASE_URL) {
        const { error } = await supabase.from("exams_pool").upsert(payload);
        if (error) {
          console.error("Supabase upsert error:", error);
          hasError = true;
        }
      }

      // Persist in local storage for preview safety
      const stored = localStorage.getItem('exams_pool');
      const list: Exam[] = stored ? JSON.parse(stored) : [];
      const updatedList = list.filter((x) => x.id !== examId);
      updatedList.push(payload);
      localStorage.setItem('exams_pool', JSON.stringify(updatedList));

      // Ensure the payload mapping stored locally in state mirrors the server structure perfectly.
      // Server-side fetchExamsPool leaves questions: [] for optimization.
      const localPayload: Exam = {
        ...payload,
        questions: [], // optimized out locally to perfectly align with server shape
      };

      setExams((prev) => {
        const exists = prev.some((ex) => ex.id === examId);
        if (exists) {
          return prev.map((ex) => (ex.id === examId ? localPayload : ex));
        } else {
          return [...prev, localPayload];
        }
      });

      setIsDirty(false);
      if (!isSilent) {
        alert("تم حفظ ملف الاختبار وتحديث مجمع الأسئلة بنجاح!");
      }
    } catch (err) {
      console.error("Failed to save exam:", err);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  };

  // ==========================================
  // FIX 01: Break the Auto-Save Infinite Loop
  // ==========================================
  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(() => {
      handleSaveExam(true);
    }, 60000);
    return () => clearTimeout(timer);
  }, [isDirty]); // Clean isolation: only depend on the dirty state flag

  // Handlers
  const handleAddQuestion = () => {
    if (!qText.trim()) return;

    const newQ: Question = {
      id: 'q-' + Date.now(),
      type: qType,
      text: qText,
    };

    if (qType === 'mcq') {
      newQ.options = qOptions.filter(o => o.trim());
      newQ.correctAnswer = qCorrect || qOptions[0];
    } else if (qType === 'true_false') {
      newQ.correctAnswer = qCorrect || 'صح';
    } else if (qType === 'matching') {
      newQ.matchingPairs = qPairs.filter(p => p.left.trim() && p.right.trim());
      newQ.shuffledRights = newQ.matchingPairs.map(p => p.right).sort(() => Math.random() - 0.5);
    }

    setCurrentQuestions(prev => [...prev, newQ]);
    setIsDirty(true);

    // Reset fields
    setQText('');
    setQOptions(['', '']);
    setQCorrect('');
    setQPairs([{ left: '', right: '' }]);
  };

  const handleDeleteQuestion = (id: string) => {
    setCurrentQuestions(prev => prev.filter(q => q.id !== id));
    setIsDirty(true);
  };

  const handleSelectExamToEdit = (ex: Exam) => {
    // To edit an exam, we retrieve its full questions
    try {
      const stored = localStorage.getItem('exams_pool');
      const fullList: Exam[] = stored ? JSON.parse(stored) : [];
      const found = fullList.find(x => x.id === ex.id);
      
      if (found) {
        setExamId(found.id);
        setExamTitle(found.title);
        setCurrentQuestions(found.questions || []);
        setIsDirty(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full max-w-4xl bg-slate-950/90 border border-slate-800 rounded-3xl p-6 md:p-8 relative z-10 shadow-2xl" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5 mb-6">
        <div className="text-right">
          <h1 className="text-lg font-black text-amber-400">محرر وباني الامتحانات</h1>
          <p className="text-slate-400 text-[10px] font-bold mt-1">إنشاء، تعديل وتجهيز نماذج اختبارات لجان مهرجان الكرازة</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* ==========================================
              FIX 02: Correct Tailwind CSS Color Typo (text-amber-600)
              ========================================== */}
          {isDirty && (
            <span className="text-xs text-amber-600 font-bold animate-pulse">
              يوجد تغييرات غير محفوظة...
            </span>
          )}

          <button
            type="button"
            onClick={() => handleSaveExam(false)}
            disabled={isLoading}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/10"
          >
            <Save size={15} />
            حفظ الآن
          </button>
          
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs rounded-xl"
          >
            رجوع
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Create/Edit Exam */}
        <div className="lg:col-span-8 space-y-5">
          {/* Exam Info */}
          <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-850 space-y-3">
            <label className="block text-slate-400 text-xs font-black text-right">عنوان الاختبار المرقسي</label>
            <input
              type="text"
              value={examTitle}
              onChange={(e) => {
                setExamTitle(e.target.value);
                setIsDirty(true);
              }}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 outline-none text-xs font-bold text-slate-100 text-right"
              placeholder="مثال: مسابقة الألحان والطقوس - المستوى الأول"
            />
          </div>

          {/* Add Question Form */}
          <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-850 space-y-4 text-right">
            <h3 className="text-xs font-black text-amber-400 border-b border-slate-800 pb-2">إضافة سؤال جديد</h3>
            
            <div className="space-y-2">
              <label className="block text-slate-400 text-[10px] font-bold">صياغة السؤال</label>
              <textarea
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                className="w-full h-16 px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 outline-none text-xs font-bold text-slate-100 text-right"
                placeholder="أكتب السؤال هنا..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="block text-slate-400 text-[10px] font-bold">نوع السؤال</label>
                <select
                  value={qType}
                  onChange={(e) => setQType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-100 outline-none"
                >
                  <option value="mcq">اختيار من متعدد</option>
                  <option value="true_false">صح أم خطأ</option>
                  <option value="matching">سؤال التوصيل / المطابقة</option>
                </select>
              </div>

              {qType !== 'matching' && (
                <div className="space-y-2">
                  <label className="block text-slate-400 text-[10px] font-bold">الإجابة الصحيحة</label>
                  {qType === 'true_false' ? (
                    <select
                      value={qCorrect}
                      onChange={(e) => setQCorrect(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-100 outline-none"
                    >
                      <option value="صح">صح</option>
                      <option value="خطأ">خطأ</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={qCorrect}
                      onChange={(e) => setQCorrect(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-100 outline-none"
                      placeholder="الإجابة النموذجية..."
                    />
                  )}
                </div>
              )}
            </div>

            {/* MCQ Options */}
            {qType === 'mcq' && (
              <div className="space-y-2">
                <label className="block text-slate-400 text-[10px] font-bold">خيارات الإجابة</label>
                <div className="grid grid-cols-2 gap-2">
                  {qOptions.map((opt, idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const copy = [...qOptions];
                        copy[idx] = e.target.value;
                        setQOptions(copy);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-100 outline-none"
                      placeholder={`خيار ${idx + 1}...`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setQOptions(prev => [...prev, ''])}
                  className="text-[10px] text-amber-500 font-bold hover:underline"
                >
                  + إضافة خيار إضافي
                </button>
              </div>
            )}

            {/* Matching Pairs Inputs */}
            {qType === 'matching' && (
              <div className="space-y-2">
                <label className="block text-slate-400 text-[10px] font-bold">أزواج التوصيل والربط</label>
                {qPairs.map((pair, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={pair.left}
                      onChange={(e) => {
                        const copy = [...qPairs];
                        copy[idx].left = e.target.value;
                        setQPairs(copy);
                      }}
                      className="w-1/2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-100 outline-none"
                      placeholder="العنصر الأيمن..."
                    />
                    <input
                      type="text"
                      value={pair.right}
                      onChange={(e) => {
                        const copy = [...qPairs];
                        copy[idx].right = e.target.value;
                        setQPairs(copy);
                      }}
                      className="w-1/2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-100 outline-none"
                      placeholder="العنصر المطابق الأيسر..."
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setQPairs(prev => [...prev, { left: '', right: '' }])}
                  className="text-[10px] text-amber-500 font-bold hover:underline animate-pulse"
                >
                  + إضافة زوج توصيل آخر
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleAddQuestion}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-amber-400 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
            >
              <Plus size={16} />
              تأكيد وإدراج السؤال الحالي في الكشف
            </button>
          </div>

          {/* Current Question list */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-300 text-right">أسئلة الاختبار المضافة حالياً ({currentQuestions.length})</h3>
            <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
              {currentQuestions.map((q, idx) => (
                <div key={q.id} className="bg-slate-900/50 p-3 rounded-xl border border-slate-850 flex items-center justify-between gap-4">
                  <div className="text-right">
                    <span className="text-[9px] bg-slate-950 text-amber-500 font-black px-2 py-0.5 rounded-lg border border-slate-800">
                      {q.type === 'mcq' ? 'اختياري' : q.type === 'true_false' ? 'صح/خطأ' : 'توصيل'}
                    </span>
                    <p className="text-xs font-bold text-slate-200 mt-1.5 leading-relaxed">{idx + 1}. {q.text}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="p-2 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 hover:border-red-500/30 text-red-400 rounded-xl transition-all"
                    title="حذف السؤال"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Saved Exam Templates Pool */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-4 text-right">
            <h3 className="text-xs font-black text-slate-100 flex items-center gap-2 mb-3">
              <ClipboardList className="text-amber-500" size={16} />
              نماذج الامتحانات الجاهزة
            </h3>
            <div className="space-y-2">
              {exams.map((ex) => (
                <div
                  key={ex.id}
                  onClick={() => handleSelectExamToEdit(ex)}
                  className={`p-3 rounded-xl border text-right cursor-pointer transition-all ${
                    examId === ex.id
                      ? 'bg-amber-500/15 border-amber-500 text-slate-100'
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <p className="text-xs font-black leading-normal">{ex.title}</p>
                  <p className="text-[9px] text-slate-500 font-mono mt-1">ID: {ex.id}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Main Unified Dashboard Container Component
// ==========================================
export default function ExamEngine() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'builder' | 'gateway'>('dashboard');
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);

  // Default seeded exam for demonstration/testing in the Gateway
  const mockExam: Exam = {
    id: 'exam-2026',
    title: 'مسابقة الألحان والطقوس - المستوى الأول',
    questions: [
      {
        id: 'q1',
        type: 'mcq',
        text: 'أي من الكنائس التالية بنيت في القرن الرابع الميلادي؟',
        options: ['الكنيسة المعلقة', 'كنيسة مارجرجس', 'كنيسة أبي سيفين', 'دير المحرق'],
        correctAnswer: 'الكنيسة المعلقة'
      },
      {
        id: 'q2',
        type: 'true_false',
        text: 'يعتبر قداس القديس باسيليوس هو القداس الأكثر استخداماً في الكنيسة القبطية الأرثوذكسية.',
        correctAnswer: 'صح'
      },
      {
        id: 'q3',
        type: 'matching',
        text: 'طابق الرمز اللاهوتي بمعناه الروحي:',
        matchingPairs: [
          { left: 'البخور', right: 'صلوات القديسين صاعدة' },
          { left: 'الشموع', right: 'نور المسيح المضيء' },
          { left: 'الماء', right: 'التطهير والغسيل الروحي' }
        ],
        shuffledRights: ['نور المسيح المضيء', 'صلوات القديسين صاعدة', 'التطهير والغسيل الروحي']
      }
    ]
  };

  const startExam = () => {
    try {
      const stored = localStorage.getItem('exams_pool');
      if (stored) {
        const pool: Exam[] = JSON.parse(stored);
        if (pool.length > 0) {
          setSelectedExam(pool[0]);
          setCurrentView('gateway');
          return;
        }
      }
    } catch (err) {
      console.error(err);
    }
    setSelectedExam(mockExam);
    setCurrentView('gateway');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex flex-col items-center justify-center relative overflow-hidden font-sans" dir="rtl">
      {/* Premium Ambient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-slate-950/90 to-slate-950 pointer-events-none z-0" />
      <div className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0" />

      {currentView === 'dashboard' && (
        <div className="w-full max-w-xl bg-slate-950/85 backdrop-blur-md rounded-3xl border border-slate-800 p-6 md:p-8 text-center relative z-10 shadow-2xl">
          <FileText className="mx-auto text-amber-500 mb-4" size={48} />
          <h1 className="text-2xl font-black text-amber-400 mb-2">منظومة امتحانات مهرجان الكرازة</h1>
          <p className="text-slate-400 text-xs font-bold mb-8">إيبارشية مغاغة والعدوة - التحكم الموحد بالاختبارات وتدشين اللجان</p>

          <div className="grid grid-cols-1 gap-4">
            <button
              type="button"
              onClick={startExam}
              className="p-5 bg-gradient-to-l from-amber-500/10 to-amber-600/5 hover:from-amber-500/20 hover:to-amber-600/10 border border-amber-500/20 hover:border-amber-500/40 rounded-2xl text-right transition-all group flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-black text-amber-300 group-hover:text-amber-400">بوابة تقديم الامتحانات (الطلاب)</p>
                <p className="text-slate-400 text-[10px] font-bold mt-1">بدء نموذج اختبار تفاعلي فوري لتقييم الأداء والمستوى.</p>
              </div>
              <Play className="text-amber-500 shrink-0 group-hover:scale-110 transition-transform" size={24} />
            </button>

            <button
              type="button"
              onClick={() => setCurrentView('builder')}
              className="p-5 bg-gradient-to-l from-slate-900 to-slate-900/60 hover:from-slate-850 hover:to-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl text-right transition-all group flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-black text-slate-200 group-hover:text-amber-300">محرر وباني الاختبارات (الإدارة)</p>
                <p className="text-slate-400 text-[10px] font-bold mt-1">تصميم وتجهيز نماذج الأسئلة المتعددة والتوصيل وإضافتها للمجمع.</p>
              </div>
              <Edit className="text-slate-400 shrink-0 group-hover:scale-110 transition-transform" size={24} />
            </button>
          </div>
        </div>
      )}

      {currentView === 'builder' && (
        <ExamBuilder onBack={() => setCurrentView('dashboard')} />
      )}

      {currentView === 'gateway' && selectedExam && (
        <LiveExamGateway exam={selectedExam} onBack={() => setCurrentView('dashboard')} />
      )}
    </div>
  );
}
