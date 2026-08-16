import React, { useState, useEffect, useMemo } from 'react';
import { 
  Key, 
  Search, 
  User, 
  Building2, 
  GraduationCap, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Award, 
  ArrowRight, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  RotateCcw, 
  HelpCircle, 
  ShieldCheck, 
  FileCheck, 
  Sparkles,
  QrCode,
  X,
  Printer,
  RefreshCw
} from 'lucide-react';
import { 
  BishopricExamRecord, 
  BishopricExamQuestion, 
  BishopricExamResult,
  verifyBishopricStudentCode,
  fetchBishopricQuestions,
  submitBishopricExamResult
} from '../utils/bishopricExamStorage';

interface BishopricStudentExamEngineProps {
  initialExamCode?: string;
  onClose?: () => void;
  onComplete?: (result: BishopricExamResult) => void;
}

export const BishopricStudentExamEngine: React.FC<BishopricStudentExamEngineProps> = ({
  initialExamCode = '',
  onClose,
  onComplete
}) => {
  // Step 1: 'login' | 'preview' | 'exam' | 'submitted'
  const [step, setStep] = useState<'login' | 'preview' | 'exam' | 'submitted'>('login');
  
  // Auth state
  const [examCodeInput, setExamCodeInput] = useState(initialExamCode);
  const [isVerifying, setIsVerifying] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [student, setStudent] = useState<BishopricExamRecord | null>(null);
  const [previousResult, setPreviousResult] = useState<BishopricExamResult | null>(null);

  // Exam state
  const [questions, setQuestions] = useState<BishopricExamQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(30 * 60); // 30 minutes in seconds
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionAttemptNumber, setSubmissionAttemptNumber] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [finalResult, setFinalResult] = useState<BishopricExamResult | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Read initial code from prop or URL query parameter
  useEffect(() => {
    let urlCode = '';
    try {
      const searchParams = new URLSearchParams(window.location.search);
      urlCode = searchParams.get('code') || '';
      if (!urlCode && window.location.hash.includes('code=')) {
        const hashPart = window.location.hash.split('code=')[1];
        if (hashPart) {
          urlCode = decodeURIComponent(hashPart.split('&')[0]);
        }
      }
    } catch (e) {
      console.warn('URL parsing error:', e);
    }

    const targetCode = (initialExamCode || urlCode || '').trim();
    if (targetCode) {
      setExamCodeInput(targetCode);
      handleVerifyCode(targetCode);
    }
  }, [initialExamCode]);

  // Session Auto-Recovery: Save selected answers to localStorage during exam
  useEffect(() => {
    if (step === 'exam' && student?.exam_code) {
      const progressKey = `bishopric_exam_progress_${student.exam_code.trim()}`;
      try {
        localStorage.setItem(
          progressKey,
          JSON.stringify({
            answers: selectedAnswers,
            currentQuestionIdx,
            timestamp: Date.now()
          })
        );
      } catch (e) {
        console.warn('Error saving progress to localStorage:', e);
      }
    }
  }, [step, selectedAnswers, currentQuestionIdx, student?.exam_code]);

  // Timer effect
  useEffect(() => {
    let interval: any;
    if (isTimerRunning && step === 'exam' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            handleAutoSubmitOnTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, step, timeLeft]);

  // Handle Verify Exam Code
  const handleVerifyCode = async (codeToVerify?: string) => {
    const code = (codeToVerify || examCodeInput).trim();
    if (!code) {
      setAuthError('يرجى إدخال كود امتحان الأسقفية الخاص بك');
      return;
    }

    setIsVerifying(true);
    setAuthError(null);

    const res = await verifyBishopricStudentCode(code);
    setIsVerifying(false);

    if (!res.success || !res.student) {
      setAuthError(res.error || 'كود الامتحان غير صالح');
      return;
    }

    setStudent(res.student);

    // Duplicate Exam Prevention: If a result record exists for exam_code with status == 'completed', block entry
    if (res.alreadySubmitted && (res.alreadySubmitted.status === 'completed' || res.alreadySubmitted.percentage !== undefined)) {
      setAuthError('عفواً، تم أداء هذا الامتحان بالفعل بهذا الكود.');
      setStep('login');
      return;
    }

    // Otherwise load questions for this student's stage
    loadQuestionsForStudent(res.student);
  };

  const loadQuestionsForStudent = async (studentData: BishopricExamRecord) => {
    setIsLoadingQuestions(true);
    try {
      const qList = await fetchBishopricQuestions(studentData.stage);
      setQuestions(qList);
      setStep('preview');
    } catch (err) {
      console.error('Error fetching questions for student:', err);
      setAuthError('تعذر تحميل أسئلة الامتحان. يرجى إعادة المحاولة.');
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  // Start Exam
  const handleStartExam = () => {
    if (questions.length === 0) {
      alert('لم يتم إضافة أسئلة بعد لهذه المرحلة الدراسية. يرجى مراجعة المسؤول.');
      return;
    }

    let restoredAnswers: Record<number, string> = {};
    let restoredIdx = 0;

    if (student?.exam_code) {
      const progressKey = `bishopric_exam_progress_${student.exam_code.trim()}`;
      try {
        const saved = localStorage.getItem(progressKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.answers) restoredAnswers = parsed.answers;
          if (typeof parsed.currentQuestionIdx === 'number') restoredIdx = parsed.currentQuestionIdx;
        }
      } catch (e) {
        console.warn('Error reading progress:', e);
      }
    }

    setCurrentQuestionIdx(restoredIdx);
    setSelectedAnswers(restoredAnswers);
    setTimeLeft(Math.max(questions.length * 3 * 60, 15 * 60)); // 3 mins per question
    setIsTimerRunning(true);
    setStep('exam');
  };

  const handleSelectOption = (option: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQuestionIdx]: option
    }));
  };

  const handleAutoSubmitOnTimeout = () => {
    alert('انتهى الوقت المحدد للامتحان! سيتم إرسال إجاباتك تلقائياً.');
    executeSubmission();
  };

  // Calculate scores & submit
  const executeSubmission = async () => {
    if (!student) return;
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmissionAttemptNumber(1);
    setIsTimerRunning(false);
    setShowConfirmModal(false);

    let calculatedTotalScore = 0;
    let calculatedMaxScore = 0;

    questions.forEach((q, idx) => {
      const qScore = Number(q.score) || 1;
      calculatedMaxScore += qScore;
      const studentAns = selectedAnswers[idx];
      if (studentAns && studentAns.trim() === q.correct_answer.trim()) {
        calculatedTotalScore += qScore;
      }
    });

    const percentage = calculatedMaxScore > 0 
      ? Number(((calculatedTotalScore / calculatedMaxScore) * 100).toFixed(1)) 
      : 0;

    const resultPayload: BishopricExamResult = {
      exam_code: student.exam_code,
      student_name: student.student_name,
      church_name: student.church_name,
      stage: student.stage,
      subject_name: questions[0]?.subject_name || 'امتحان الأسقفية',
      total_score: calculatedTotalScore,
      max_score: calculatedMaxScore,
      percentage: percentage,
      status: 'completed',
      completed_at: new Date().toISOString()
    };

    // Strict handshake with up to 3 automatic retries
    const res = await submitBishopricExamResult(resultPayload, 3, (attempt) => {
      setSubmissionAttemptNumber(attempt);
    });

    setIsSubmitting(false);

    if (res.success && res.data) {
      // Clear local progress cache strictly AFTER verified DB insert confirmation
      try {
        localStorage.removeItem(`bishopric_exam_progress_${student.exam_code.trim()}`);
      } catch (e) {}

      setFinalResult(res.data);
      setStep('submitted');
      if (onComplete) {
        onComplete(res.data);
      }
    } else {
      // Strict constraint: Do NOT clear localStorage or show completion screen on failure
      setSubmitError(res.error || 'فشل التأكيد من السيرفر، يرجى المحاولة مرة أخرى.');
    }
  };

  // Format time (MM:SS)
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQ = questions[currentQuestionIdx];
  const answeredCount = Object.keys(selectedAnswers).length;
  const progressPercent = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  // Grade descriptor helper
  const getGradeInfo = (pct: number) => {
    if (pct >= 90) return { title: 'ممتاز 🌟', color: 'text-emerald-700 bg-emerald-100 border-emerald-300' };
    if (pct >= 80) return { title: 'جيد جداً 🎖️', color: 'text-blue-700 bg-blue-100 border-blue-300' };
    if (pct >= 65) return { title: 'جيد 👍', color: 'text-sky-700 bg-sky-100 border-sky-300' };
    if (pct >= 50) return { title: 'مقبول / ناجح ✅', color: 'text-amber-700 bg-amber-100 border-amber-300' };
    return { title: 'يحتاج لتحسين 📖', color: 'text-rose-700 bg-rose-100 border-rose-300' };
  };

  return (
    <div className="max-w-3xl mx-auto font-arabic text-right animate-fade-in" dir="rtl">
      {/* Header Close button if provided */}
      {onClose && (
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <ArrowRight size={16} />
            <span>العودة للقائمة الرئيسية</span>
          </button>
          <div className="text-xs font-black text-indigo-700 flex items-center gap-1">
            <Sparkles size={14} /> بوابة امتحانات الأسقفية المركزية 2026
          </div>
        </div>
      )}

      {/* STEP 1: LOGIN WITH EXAM CODE */}
      {step === 'login' && (
        <div className="bg-white rounded-3xl p-8 md:p-10 border border-slate-200 shadow-xl text-center space-y-6">
          <div className="w-20 h-20 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-3xl mx-auto flex items-center justify-center shadow-inner">
            <Key size={38} className="animate-pulse" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">
              تسجيل دخول امتحان الأسقفية الإلكتروني
            </h2>
            <p className="text-xs md:text-sm text-slate-500 font-bold max-w-md mx-auto leading-relaxed">
              أدخل كود الامتحان المخصص لك من كنيستك لبدء الاختبار الإلكتروني المعتمد لأسقفية الشباب
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-4">
            <div className="relative">
              <Key size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="أدخل كود امتحان الأسقفية (مثال: BISHOP-1234)"
                value={examCodeInput}
                onChange={(e) => {
                  setExamCodeInput(e.target.value);
                  setAuthError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleVerifyCode();
                }}
                className="w-full pl-4 pr-12 py-4 bg-slate-50 border border-slate-300 rounded-2xl text-center font-mono font-black text-base md:text-lg text-slate-900 tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all shadow-inner"
              />
            </div>

            {authError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-black flex items-start gap-2 text-right">
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <button
              onClick={() => handleVerifyCode()}
              disabled={isVerifying || !examCodeInput.trim()}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 text-white rounded-2xl font-black text-sm md:text-base transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
            >
              {isVerifying ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>جاري التحقق من الكود...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={20} />
                  <span>التحقق والدخول للاختبار</span>
                </>
              )}
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-400 text-xs font-bold">
            <HelpCircle size={14} />
            <span>في حال فقدان الكود، يرجى مراجعة أمين الخدمة أو منسق الكنيسة</span>
          </div>
        </div>
      )}

      {/* STEP 2: VERIFIED PREVIEW & INSTRUCTIONS */}
      {step === 'preview' && student && (
        <div className="bg-white rounded-3xl p-8 md:p-10 border border-slate-200 shadow-xl space-y-6">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl flex items-center justify-center shrink-0">
              <User size={32} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1 px-3 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black mb-1">
                <CheckCircle2 size={12} /> كود معتمد ومطابق
              </div>
              <h3 className="text-2xl font-black text-slate-900">{student.student_name}</h3>
              <p className="text-xs md:text-sm text-slate-500 font-bold mt-0.5">
                كنيسة: {student.church_name} • المرحلة: {student.stage}
              </p>
            </div>
          </div>

          {/* Exam Specs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
              <span className="text-[11px] text-slate-400 font-bold block mb-1">عدد الأسئلة</span>
              <span className="text-xl font-black text-slate-900">{questions.length} سؤال</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
              <span className="text-[11px] text-slate-400 font-bold block mb-1">الوقت المخصص</span>
              <span className="text-xl font-black text-slate-900">{Math.max(questions.length * 3, 15)} دقيقة</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
              <span className="text-[11px] text-slate-400 font-bold block mb-1">المادة</span>
              <span className="text-xl font-black text-slate-900">{questions[0]?.subject_name || 'عام'}</span>
            </div>
          </div>

          {/* Instructions */}
          <div className="p-5 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-2 text-xs font-bold text-indigo-950 leading-relaxed">
            <h4 className="font-black text-indigo-900 flex items-center gap-1.5 text-sm">
              <ShieldCheck size={16} className="text-indigo-600" />
              تعليمات هامة قبل بدء الامتحان:
            </h4>
            <ul className="list-disc list-inside space-y-1.5 text-indigo-900/80 pr-2">
              <li>يحتوي الامتحان على أسئلة اختيار من متعدد خاصة بمرحلة ({student.stage}).</li>
              <li>يمكنك التنقل بين الأسئلة بحرية وتعديل إجاباتك قبل الضغط على زر "تسليم نهائي".</li>
              <li>بمجرد الضغط على "تسليم نهائي"، سيتم تصحيح إجاباتك وحفظ النتيجة في قاعدة البيانات فورياً.</li>
            </ul>
          </div>

          {questions.length === 0 ? (
            <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-center space-y-2">
              <AlertCircle className="mx-auto text-amber-600" size={32} />
              <p className="text-sm font-black">لم يتم إضافة أسئلة بعد لمرحلة ({student.stage})</p>
              <p className="text-xs font-bold text-amber-700">
                يرجى التواصل مع مسؤول الكنيسة أو إداري الأسقفية لتغذية بنك الأسئلة أولاً.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setStep('login')}
                className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-sm transition-all cursor-pointer"
              >
                رجوع
              </button>
              <button
                onClick={handleStartExam}
                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm md:text-base transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
              >
                <BookOpen size={18} />
                <span>ابدأ الامتحان الآن</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: ACTIVE EXAM RUNNER */}
      {step === 'exam' && currentQ && (
        <div className="space-y-6">
          {/* Top Bar: Progress & Timer */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center font-black text-sm">
                {currentQuestionIdx + 1}/{questions.length}
              </span>
              <div>
                <div className="text-xs font-black text-slate-900">
                  السؤال {currentQuestionIdx + 1} من {questions.length}
                </div>
                <div className="text-[11px] font-bold text-slate-400">
                  تمت الإجابة على: {answeredCount} سؤال
                </div>
              </div>
            </div>

            {/* Countdown timer */}
            <div className={`px-4 py-2 rounded-2xl border font-mono font-black text-sm flex items-center gap-2 ${
              timeLeft < 300 
                ? 'bg-rose-50 border-rose-200 text-rose-700 animate-pulse' 
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <Clock size={16} />
              <span>{formatTime(timeLeft)}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-600 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Question Card */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-lg space-y-6">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-black">
                  {currentQ.subject_name}
                </span>
                <h3 className="text-base md:text-xl font-black text-slate-900 leading-relaxed pt-2">
                  {currentQ.question_text}
                </h3>
              </div>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-black shrink-0">
                {currentQ.score} {currentQ.score > 2 && currentQ.score < 11 ? 'درجات' : 'درجة'}
              </span>
            </div>

            {/* Options List */}
            <div className="space-y-3">
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = selectedAnswers[currentQuestionIdx] === opt;
                return (
                  <button
                    key={optIdx}
                    onClick={() => handleSelectOption(opt)}
                    className={`w-full p-4 rounded-2xl border text-right transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/90 border-indigo-600 text-indigo-950 font-black ring-2 ring-indigo-500/30 shadow-md'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800 font-bold'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                        isSelected 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-white border border-slate-300 text-slate-600'
                      }`}>
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className="text-sm md:text-base leading-relaxed">{opt}</span>
                    </div>

                    {isSelected && (
                      <CheckCircle2 size={20} className="text-indigo-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Nav Controls */}
            <div className="flex items-center justify-between gap-3 pt-6 border-t border-slate-100">
              <button
                onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))}
                disabled={currentQuestionIdx === 0}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs md:text-sm font-black transition-all flex items-center gap-1.5 disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight size={18} />
                <span>السابق</span>
              </button>

              {currentQuestionIdx < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQuestionIdx(prev => Math.min(questions.length - 1, prev + 1))}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs md:text-sm font-black transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  <span>التالي</span>
                  <ChevronLeft size={18} />
                </button>
              ) : (
                <button
                  onClick={() => setShowConfirmModal(true)}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs md:text-sm font-black transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer animate-pulse"
                >
                  <FileCheck size={18} />
                  <span>مراجعة وتسليم الامتحان</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Jump Palette */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-700">لوحة التنقل السريع بين الأسئلة:</span>
              <button
                onClick={() => setShowConfirmModal(true)}
                className="text-xs font-black text-indigo-600 hover:text-indigo-800"
              >
                إنهاء وتسليم الآن
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {questions.map((_, idx) => {
                const isAnswered = selectedAnswers[idx] !== undefined;
                const isCurrent = idx === currentQuestionIdx;
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentQuestionIdx(idx)}
                    className={`w-9 h-9 rounded-xl font-black text-xs transition-all cursor-pointer ${
                      isCurrent
                        ? 'ring-2 ring-indigo-600 bg-indigo-600 text-white shadow-md'
                        : isAnswered
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center">
              <FileCheck size={32} />
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 mb-2">
                تأكيد تسليم الامتحان الإلكتروني
              </h3>
              <p className="text-xs text-slate-500 font-bold leading-relaxed">
                لقد أجبت على <strong className="text-indigo-600">{answeredCount}</strong> من أصل <strong className="text-slate-800">{questions.length}</strong> سؤال.
                {answeredCount < questions.length && (
                  <span className="block mt-1 text-rose-600 font-black">
                    ⚠️ تنبيه: توجد {questions.length - answeredCount} أسئلة لم يتم الإجابة عليها بعد!
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs md:text-sm font-black transition-colors cursor-pointer"
              >
                الرجوع للمراجعة
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={executeSubmission}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs md:text-sm font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
              >
                <Check size={18} />
                <span>تأكيد التسليم النهائي</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOCKED LOADING OVERLAY DURING SUBMISSION HANDSHAKE */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-arabic" dir="rtl">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 text-center space-y-5 animate-in fade-in zoom-in duration-200">
            {/* Animated Spinner Bubble */}
            <div className="relative w-20 h-20 bg-indigo-50 border-2 border-indigo-200 rounded-full mx-auto flex items-center justify-center shadow-inner">
              <RefreshCw size={36} className="text-indigo-600 animate-spin" />
              <div className="absolute inset-0 rounded-full border-2 border-indigo-400 border-t-transparent animate-ping opacity-30" />
            </div>

            <div className="space-y-2">
              <h3 className="text-base md:text-lg font-black text-slate-900 leading-snug">
                جاري حفظ نتائج الامتحان والتأكد من السيرفر... برجاء عدم إغلاق الصفحة
              </h3>
              <p className="text-xs font-bold text-slate-500">
                {submissionAttemptNumber > 1 
                  ? `إعادة محاولة التأكيد من السيرفر (محاولة ${submissionAttemptNumber} من 3)...`
                  : 'جاري إرسال الإجابات والتحقق المباشر من استجابة السيرفر...'}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] font-black text-indigo-700 bg-indigo-50/70 p-2.5 rounded-2xl">
              <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              <span>ربط مؤمن ومباشر لجدول bishopric_exam_results</span>
            </div>
          </div>
        </div>
      )}

      {/* ERROR MODAL IF ALL RETRIES FAIL */}
      {submitError && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-arabic" dir="rtl">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-rose-200 text-center space-y-5">
            <div className="w-16 h-16 bg-rose-50 border border-rose-200 text-rose-600 rounded-full mx-auto flex items-center justify-center">
              <AlertCircle size={32} />
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-black text-slate-900">
                تعذر الاتصال بالسيرفر لتأكيد حفظ النتيجة
              </h3>
              <p className="text-xs font-bold text-slate-600 leading-relaxed">
                {submitError}
              </p>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] font-bold text-emerald-800 text-right">
                🔒 إجاباتك محفوظة بأمان ولم تفقد أي بيانات. يرجى التأكد من الاتصال بالإنترنت ثم النقر على زر إعادة المحاولة.
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={executeSubmission}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} />
                <span>إعادة إرسال النتيجة والتأكيد من السيرفر</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: SUBMITTED / RESULT CERTIFICATE */}
      {step === 'submitted' && finalResult && (
        <div className="bg-white rounded-3xl p-8 md:p-10 border border-slate-200 shadow-2xl text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center shadow-inner">
            <Award size={44} className="text-emerald-600 animate-bounce" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1 px-4 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black mb-2">
              <CheckCircle2 size={14} /> تم تسجيل النتيجة وتأكيد الامتحان بنجاح
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900">
              {finalResult.student_name}
            </h2>
            <p className="text-xs md:text-sm text-slate-500 font-bold mt-1">
              كنيسة: {finalResult.church_name} • المرحلة: {finalResult.stage}
            </p>
          </div>

          {/* Grade Badge */}
          {(() => {
            const grade = getGradeInfo(Number(finalResult.percentage) || 0);
            return (
              <div className={`p-6 rounded-3xl border ${grade.color} max-w-sm mx-auto space-y-2`}>
                <span className="text-xs font-black uppercase tracking-wider block opacity-80">التقييم العام</span>
                <span className="text-2xl font-black block">{grade.title}</span>
                <div className="flex items-center justify-center gap-6 pt-3 border-t border-current/20">
                  <div>
                    <span className="text-[10px] font-bold block opacity-70">الدرجة الكلية</span>
                    <span className="text-xl font-black">{finalResult.total_score} / {finalResult.max_score}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold block opacity-70">النسبة المئوية</span>
                    <span className="text-xl font-black">{finalResult.percentage}%</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Details Card */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 max-w-md mx-auto text-xs font-bold text-slate-600 space-y-1.5">
            <div className="flex justify-between">
              <span>كود الامتحان:</span>
              <code className="font-mono text-indigo-700 font-black">{finalResult.exam_code}</code>
            </div>
            <div className="flex justify-between">
              <span>وقت وتاريخ التسليم:</span>
              <span className="text-slate-800">{finalResult.completed_at ? new Date(finalResult.completed_at).toLocaleString('ar-EG') : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span>المادة:</span>
              <span className="text-slate-800">{finalResult.subject_name}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => window.print()}
              className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs md:text-sm font-black transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer size={16} />
              <span>طباعة إشعار النتيجة</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs md:text-sm font-black transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                العودة للمنصة
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
