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
  RefreshCw,
  Star,
  Trophy
} from 'lucide-react';
import { 
  BishopricExamRecord, 
  BishopricExamQuestion, 
  BishopricExamResult,
  sanitizeExamCode,
  verifyBishopricCodeWithCache,
  verifyBishopricStudentCode,
  fetchBishopricQuestions,
  handleSubmitBishopricExam,
  submitBishopricExamResult,
  updateLocalCacheCodeStatus,
  normalizeCategoryType,
  parseGranularScores
} from '../utils/bishopricExamStorage';
import { supabase } from '../utils/supabaseClient';
import { useNotificationBubble } from '../context/NotificationContext';
import { fetchPlatformState, subscribeToPlatformState, PlatformState } from '../utils/platformSettings';

interface BishopricStudentExamEngineProps {
  initialExamCode?: string;
  availableStages?: string[];
  onClose?: () => void;
  onComplete?: (result: BishopricExamResult) => void;
}

export const BishopricStudentExamEngine: React.FC<BishopricStudentExamEngineProps> = ({
  initialExamCode = '',
  availableStages = [],
  onClose,
  onComplete
}) => {
  const { showBubble, showSuccess, showError, showWarning, showInfo, showConfirmDialog } = useNotificationBubble();

  // Step 1: 'login' | 'dashboard' | 'preview' | 'exam' | 'submitted'
  const [step, setStep] = useState<'login' | 'dashboard' | 'preview' | 'exam' | 'submitted'>('login');
  const [completedCategories, setCompletedCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  // Auth state
  const [examCodeInput, setExamCodeInput] = useState(() => {
    if (initialExamCode && initialExamCode.trim()) return initialExamCode.trim();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const codeParam = params.get('code') || params.get('exam_code');
      if (codeParam) return codeParam.trim();
      if (window.location.hash.includes('code=')) {
        const hashQuery = window.location.hash.split('?')[1] || '';
        const hashParams = new URLSearchParams(hashQuery);
        const hashC = hashParams.get('code') || hashParams.get('exam_code');
        if (hashC) return hashC.trim();
      }
    }
    return '';
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [student, setStudent] = useState<BishopricExamRecord | null>(null);
  const [previousResult, setPreviousResult] = useState<BishopricExamResult | null>(null);

  // Platform master state from system_settings row id = 1
  const [platformState, setPlatformState] = useState<PlatformState>({
    isOpen: true,
    content: 1,
    isSiteDisabled: false,
    isExamLocked: false,
    isRegistrationLocked: false,
    isBookOrdersLocked: false,
    updatedAt: new Date().toISOString()
  });

  useEffect(() => {
    fetchPlatformState().then(setPlatformState);
    const unsubscribe = subscribeToPlatformState((state) => {
      setPlatformState(state);
    });
    return () => unsubscribe();
  }, []);

  // Raw Questions loaded from database
  const [rawQuestions, setRawQuestions] = useState<BishopricExamQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  
  // Dynamic Exam state
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [unlockedExcellenceCategories, setUnlockedExcellenceCategories] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(30 * 60); // 30 minutes in seconds
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionAttemptNumber, setSubmissionAttemptNumber] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [finalResult, setFinalResult] = useState<BishopricExamResult | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [showMinimalCoupon, setShowMinimalCoupon] = useState(false);
  const [currentCouponData, setCurrentCouponData] = useState<{
    categoryTitle: string;
    questions: { studentScore: number; maxScore: number }[];
  } | null>(null);

  // Separation of Standard vs Excellence questions
  const { standardQuestions, excellenceQuestions } = useMemo(() => {
    const std: BishopricExamQuestion[] = [];
    const exc: BishopricExamQuestion[] = [];
    rawQuestions.forEach((q) => {
      // If we are in dashboard, preview, or exam, filter questions by category
      if (activeCategory) {
        const catType = normalizeCategoryType(q.subject_name);
        if (catType !== activeCategory) {
          return;
        }
      }
      if (q.is_excellence) {
        exc.push(q);
      } else {
        std.push(q);
      }
    });
    return { standardQuestions: std, excellenceQuestions: exc };
  }, [rawQuestions, activeCategory]);

  // Active Questions List (Standard + Unlocked Excellence Questions)
  const activeQuestions = useMemo(() => {
    const active: (BishopricExamQuestion & { originalCategory?: string; isExcellenceItem?: boolean })[] = [
      ...standardQuestions.map(q => ({ ...q, isExcellenceItem: false }))
    ];

    excellenceQuestions.forEach(eq => {
      if (unlockedExcellenceCategories.includes(eq.subject_name)) {
        active.push({ ...eq, isExcellenceItem: true });
      }
    });

    return active;
  }, [standardQuestions, excellenceQuestions, unlockedExcellenceCategories]);

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

  // Dynamic Excellence Unlocking Evaluation on each answer update
  useEffect(() => {
    if (step !== 'exam' || standardQuestions.length === 0 || excellenceQuestions.length === 0) {
      return;
    }

    // Group standard questions by subject_name / category
    const categoryStandardMap: Record<string, BishopricExamQuestion[]> = {};
    standardQuestions.forEach(q => {
      const cat = q.subject_name || 'عام';
      if (!categoryStandardMap[cat]) categoryStandardMap[cat] = [];
      categoryStandardMap[cat].push(q);
    });

    const newlyUnlocked: string[] = [];

    // Check each category that has an excellence question configured
    excellenceQuestions.forEach(eq => {
      const cat = eq.subject_name || 'عام';
      const catQuestions = categoryStandardMap[cat] || [];

      if (catQuestions.length > 0) {
        let earnedPoints = 0;
        let totalPoints = 0;
        let allAnswered = true;

        catQuestions.forEach(q => {
          const qScore = Number(q.score) || 1;
          totalPoints += qScore;
          const qKey = q.id || `q_${q.question_text}`;
          const ans = selectedAnswers[qKey];
          if (!ans) {
            allAnswered = false;
          } else if (ans.trim() === q.correct_answer.trim()) {
            earnedPoints += qScore;
          }
        });

        // IF standard_score === max_score for this category -> UNLOCK!
        if (allAnswered && totalPoints > 0 && earnedPoints === totalPoints) {
          newlyUnlocked.push(cat);
        }
      }
    });

    // Check if any new category just unlocked
    newlyUnlocked.forEach(cat => {
      if (!unlockedExcellenceCategories.includes(cat)) {
        showBubble({
          type: 'success',
          title: '🌟 سؤال التميز مفتوح!',
          message: `أحسنت يا ${student?.student_name || 'بطل'}! نظرًا لحصولك على الدرجة النهائية، تم فتح سؤال التميز الخاص بمسابقة (${cat}).`
        });
      }
    });

    if (newlyUnlocked.length > 0) {
      setUnlockedExcellenceCategories(prev => {
        // Keep existing unlocked if they satisfied or preserve them
        const combined = Array.from(new Set([...prev, ...newlyUnlocked]));
        const isSame = combined.length === prev.length && combined.every((val, i) => val === prev[i]);
        if (isSame) return prev;
        return combined;
      });
    }
  }, [selectedAnswers, step, standardQuestions, excellenceQuestions]);

  // Session Auto-Recovery: Save progress to localStorage during exam
  useEffect(() => {
    if (step === 'exam' && student?.exam_code) {
      const progressKey = `bishopric_exam_progress_${student.exam_code.trim()}`;
      try {
        localStorage.setItem(
          progressKey,
          JSON.stringify({
            answers: selectedAnswers,
            currentQuestionIdx,
            unlockedCategories: unlockedExcellenceCategories,
            timestamp: Date.now()
          })
        );
      } catch (e) {
        console.warn('Error saving progress to localStorage:', e);
      }
    }
  }, [step, selectedAnswers, currentQuestionIdx, unlockedExcellenceCategories, student?.exam_code]);

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

  // Fetch completed categories for a student code
  const fetchCompletedCategories = async (code: string) => {
    try {
      const { data, error } = await supabase
        .from('bishopric_exam_results')
        .select('category, answers')
        .eq('student_code', code);
      
      if (!error && data) {
        const categories: string[] = [];
        data.forEach(item => {
          if (item.category) {
            if (item.category.includes(',')) {
              categories.push(...item.category.split(',').map(s => s.trim()));
            } else {
              categories.push(item.category.trim());
            }
          }
          if (item.answers && item.answers._completed_categories) {
            categories.push(...item.answers._completed_categories);
          }
        });
        const uniqueCats = Array.from(new Set(categories)).filter(Boolean);
        setCompletedCategories(uniqueCats);
        return uniqueCats;
      }
    } catch (e) {
      console.error('Error fetching completed categories:', e);
    }
    return [];
  };

  // Handle Verify Exam Code with Smart Church Caching & Quota Protection
  const handleVerifyCode = async (codeToVerify?: string) => {
    const rawInput = (codeToVerify || examCodeInput || '').trim();
    const formattedCode = sanitizeExamCode(rawInput);
    
    if (!formattedCode) {
      showBubble({
        type: 'warning',
        title: 'تنبيه',
        message: 'يرجى إدخال كود امتحان الأسقفية الخاص بك أولاً.'
      });
      return;
    }
    if (isVerifying) return; // حماية من الضغط المتكرر ومنع الـ Loop

    setIsVerifying(true);
    setAuthError(null);
    try {
      const res = await verifyBishopricCodeWithCache(formattedCode, availableStages);
      if (!res.success || !res.student) {
        const errorMsg = res.error || 'الكود غير صحيح أو لا ينتمي للمراحل المتاحة.';
        setAuthError(errorMsg);
        showBubble({
          type: 'error',
          title: res.isUsed ? 'كود مستخدم' : 'خطأ',
          message: errorMsg
        });
        return;
      }

      setStudent(res.student);

      // Fetch completed categories
      await fetchCompletedCategories(formattedCode);

      showBubble({
        type: 'success',
        title: 'تم التحقق بنجاح',
        message: `أهلاً بك يا ${res.student.student_name} (${res.student.stage})، تم التحقق من الكود بنجاح.`
      });

      // Otherwise load questions for this student's stage
      await loadQuestionsForStudent(res.student);
    } catch (err) {
      console.error('Code verification error:', err);
      const networkErrorMsg = 'حدث خطأ في الاتصال بالسيرفر، يرجى المحاولة مرة أخرى.';
      setAuthError(networkErrorMsg);
      showBubble({
        type: 'error',
        title: 'خطأ اتصال',
        message: networkErrorMsg
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const loadQuestionsForStudent = async (studentData: BishopricExamRecord) => {
    setIsLoadingQuestions(true);
    try {
      const qList = await fetchBishopricQuestions(studentData.stage);
      setRawQuestions(qList);
      setStep('dashboard'); // Land on Category Selection Dashboard
    } catch (err) {
      console.error('Error fetching questions for student:', err);
      const qErr = 'تعذر تحميل أسئلة الامتحان. يرجى إعادة المحاولة.';
      setAuthError(qErr);
      showBubble({
        type: 'error',
        title: 'خطأ تحميل الأسئلة',
        message: qErr
      });
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  // Open Student Grade Statement (بيان الدرجات) immediately after completing ANY individual competition
  const handleViewGradeStatement = async () => {
    if (!student) return;
    try {
      const { data, error } = await supabase
        .from('bishopric_exam_results')
        .select('*')
        .or(`student_code.ilike.${student.exam_code.trim()},exam_code.ilike.${student.exam_code.trim()}`);

      if (data && data.length > 0) {
        setFinalResult(data[0]);
      } else {
        setFinalResult({
          student_name: student.student_name,
          church_name: student.church_name,
          stage: student.stage,
          subject_name: 'امتحان الأسقفية الإلكتروني',
          percentage: '100',
          total_score: completedCategories.length * 15,
          max_score: completedCategories.length * 15,
          exam_code: student.exam_code,
          completed_at: new Date().toISOString()
        } as any);
      }
      setStep('submitted');
    } catch (err) {
      console.error('Error fetching student statement:', err);
      setStep('submitted');
    }
  };

  // Compute Granular Scores for the student grade statement view
  const granularResult = useMemo(() => {
    if (!finalResult) return null;
    return parseGranularScores(finalResult, rawQuestions);
  }, [finalResult, rawQuestions]);

  // Dynamic categories detection based on loaded stage questions
  const availableCategoriesForStage = useMemo(() => {
    const cats = [];
    
    // Check if we have curriculum questions or force default
    cats.push({ id: 'curriculum', title: 'دراسي', subtitle: 'مسابقة المنهج الدراسي الرئيسي' });
    cats.push({ id: 'hymns', title: 'محفوظات', subtitle: 'مسابقة الألحان والتسبحة والمحفوظات' });

    // Check if stage has questions with level 2 coptic or fallback to level 1 coptic
    const hasCoptic2 = rawQuestions.some(q => normalizeCategoryType(q.subject_name) === 'coptic2');
    if (hasCoptic2) {
      cats.push({ id: 'coptic2', title: 'قبطي مستوى ثانٍ', subtitle: 'مسابقة اللغة القبطية (المستوى الثاني)' });
    } else {
      cats.push({ id: 'coptic1', title: 'قبطي مستوى أول', subtitle: 'مسابقة اللغة القبطية (المستوى الأول)' });
    }

    return cats;
  }, [rawQuestions]);

  // Handle Select Category with Server Verification to protect against double devices submission
  const handleSelectCategory = async (category: string) => {
    try {
      const { data, error } = await supabase
        .from('bishopric_exam_results')
        .select('category, answers')
        .eq('student_code', student?.exam_code || examCodeInput);

      if (!error && data && data.length > 0) {
        const record = data[0];
        const completed: string[] = [];
        if (record.category) {
          completed.push(...record.category.split(',').map((s: string) => s.trim()));
        }
        if (record.answers && record.answers._completed_categories) {
          completed.push(...record.answers._completed_categories);
        }

        if (completed.includes(category)) {
          showBubble({
            type: 'warning',
            title: 'تم التسليم بالفعل',
            message: 'عذراً، تم تسليم هذه المسابقة بالفعل مسبقاً!'
          });
          setCompletedCategories(prev => Array.from(new Set([...prev, category])));
          return;
        }
      }

      // Open Exam Engine for this category
      setActiveCategory(category);
      setCurrentQuestionIdx(0);
      setSelectedAnswers({});
      setUnlockedExcellenceCategories([]);
      setTimeLeft(30 * 60); // Reset timer to 30 minutes
      setIsTimerRunning(false);
      setStep('preview');
    } catch (err) {
      console.error('Error selecting category:', err);
      // Fallback open
      setActiveCategory(category);
      setStep('preview');
    }
  };

  // Start Exam
  const handleStartExam = () => {
    if (standardQuestions.length === 0 && rawQuestions.length === 0) {
      showBubble({
        type: 'warning',
        title: 'تنبيه',
        message: 'لم يتم إضافة أسئلة بعد لهذه المرحلة الدراسية. يرجى مراجعة المسؤول.'
      });
      return;
    }

    let restoredAnswers: Record<string, string> = {};
    let restoredIdx = 0;
    let restoredUnlocked: string[] = [];

    if (student?.exam_code) {
      const progressKey = `bishopric_exam_progress_${student.exam_code.trim()}`;
      try {
        const saved = localStorage.getItem(progressKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.answers) restoredAnswers = parsed.answers;
          if (typeof parsed.currentQuestionIdx === 'number') restoredIdx = parsed.currentQuestionIdx;
          if (Array.isArray(parsed.unlockedCategories)) restoredUnlocked = parsed.unlockedCategories;
        }
      } catch (e) {
        console.warn('Error reading progress:', e);
      }
    }

    setCurrentQuestionIdx(restoredIdx);
    setSelectedAnswers(restoredAnswers);
    setUnlockedExcellenceCategories(restoredUnlocked);
    setTimeLeft(Math.max((standardQuestions.length || rawQuestions.length) * 3 * 60, 15 * 60)); // 3 mins per question
    setIsTimerRunning(true);
    setStep('exam');
    showBubble({
      type: 'info',
      title: 'بدء الامتحان',
      message: 'بدأ وقت الامتحان الآن، ركّز في الإجابات وبالتوفيق والبركة!'
    });
  };

  const currentQ = activeQuestions[currentQuestionIdx] || activeQuestions[0];

  // Helper check for Coptic stages (e.g., stage or subject includes "قبطي", "م1", or "م2")
  const selectedStage = student?.stage || (currentQ ? currentQ.stage : '');
  const isCopticStage = useMemo(() => {
    const stageStr = String(selectedStage || '').toLowerCase();
    const subjectStr = String(currentQ?.subject_name || '').toLowerCase();
    const examCodeStr = String(student?.exam_code || initialExamCode || '').toLowerCase();
    return (
      stageStr.includes('قبطي') ||
      stageStr.includes('م1') ||
      stageStr.includes('م2') ||
      subjectStr.includes('قبطي') ||
      subjectStr.includes('م1') ||
      subjectStr.includes('م2') ||
      examCodeStr.includes('قبطي')
    );
  }, [selectedStage, currentQ?.subject_name, student?.exam_code, initialExamCode]);

  const handleSelectOption = (option: string) => {
    if (!currentQ) return;
    const qKey = currentQ.id || `q_${currentQ.question_text}`;
    setSelectedAnswers(prev => ({
      ...prev,
      [qKey]: option
    }));
  };

  const handleAutoSubmitOnTimeout = () => {
    showBubble({
      type: 'warning',
      title: 'انتهاء الوقت',
      message: 'انتهى الوقت المحدد للامتحان! جاري إرسال إجاباتك تلقائياً للسيرفر...'
    });
    executeSubmission();
  };

  // Calculate scores & submit (Strict server confirmed save with custom loader)
  const executeSubmission = async () => {
    if (!student || isSubmitting || !activeCategory) return; // منع التكرار والضغط المتوازي

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmissionAttemptNumber(1);
    setIsTimerRunning(false);
    setShowConfirmModal(false);

    // 1. Calculate Standard Score for the CURRENT category
    let standardScore = 0;
    let standardMaxScore = 0;
    standardQuestions.forEach((q) => {
      const qScore = Number(q.score) || 1;
      standardMaxScore += qScore;
      const qKey = q.id || `q_${q.question_text}`;
      const studentAns = selectedAnswers[qKey];
      if (studentAns && studentAns.trim() === q.correct_answer.trim()) {
        standardScore += qScore;
      }
    });

    // 2. Calculate Excellence Bonus Points for the CURRENT category
    let earnedExcellencePoints = 0;
    let maxExcellencePoints = 0;
    const excellenceAnswersMap: Record<string, any> = {};

    excellenceQuestions.forEach((eq) => {
      if (unlockedExcellenceCategories.includes(eq.subject_name)) {
        const eqScore = Number(eq.score) || 1;
        maxExcellencePoints += eqScore;
        const qKey = eq.id || `q_${eq.question_text}`;
        const studentAns = selectedAnswers[qKey];
        excellenceAnswersMap[eq.subject_name] = {
          question: eq.question_text,
          answer: studentAns || '',
          is_correct: studentAns && studentAns.trim() === eq.correct_answer.trim(),
          score: eqScore
        };
        if (studentAns && studentAns.trim() === eq.correct_answer.trim()) {
          earnedExcellencePoints += eqScore;
        }
      }
    });

    try {
      // 3. Fetch existing database record to perform cumulative merge
      const { data: existingData, error: fetchErr } = await supabase
        .from('bishopric_exam_results')
        .select('*')
        .eq('student_code', student.exam_code);

      const existingRecord = existingData && existingData.length > 0 ? existingData[0] : null;

      // Merge answers
      const prevAnswers = existingRecord?.answers || {};
      const mergedAnswers = { ...prevAnswers, ...selectedAnswers };

      // Merge completed categories
      const prevCompleted = completedCategories || [];
      const updatedCompleted = Array.from(new Set([...prevCompleted, activeCategory]));
      const categoryString = updatedCompleted.join(',');

      // Merge excellence answers
      const prevExcAnswers = existingRecord?.excellence_answers || {};
      const mergedExcAnswers = { ...prevExcAnswers, ...excellenceAnswersMap };

      // Merge excellence categories
      const prevExcCats = existingRecord?.excellence_categories || [];
      const mergedExcCats = Array.from(new Set([...prevExcCats, ...unlockedExcellenceCategories]));

      // 4. Compute cumulative scores over all completed categories
      let totalScore = 0;
      let totalMaxScore = 0;
      let totalExcellencePoints = 0;
      let totalMaxExcellencePoints = 0;

      let scoreDarasi = 0;
      let scoreMahfoozat = 0;
      let scoreCoptic = 0;

      rawQuestions.forEach((q) => {
        const qCat = normalizeCategoryType(q.subject_name);
        if (updatedCompleted.includes(qCat)) {
          const qScore = Number(q.score) || 1;
          const qKey = q.id || `q_${q.question_text}`;
          const studentAns = mergedAnswers[qKey];
          const isCorrect = studentAns !== undefined && studentAns !== null && String(studentAns).trim() === String(q.correct_answer || '').trim();

          if (q.is_excellence) {
            totalMaxExcellencePoints += qScore;
            if (isCorrect) {
              totalExcellencePoints += qScore;
            }
          } else {
            totalMaxScore += qScore;
            if (isCorrect) {
              totalScore += qScore;
              if (qCat === 'curriculum') {
                scoreDarasi += qScore;
              } else if (qCat === 'hymns') {
                scoreMahfoozat += qScore;
              } else if (qCat === 'coptic1' || qCat === 'coptic2') {
                scoreCoptic += qScore;
              }
            }
          }
        }
      });

      const grandTotalScore = scoreDarasi + scoreMahfoozat + scoreCoptic;
      const overallPercentage = totalMaxScore > 0 
        ? Number(((totalScore / totalMaxScore) * 100).toFixed(1)) 
        : 0;

      const nowIso = new Date().toISOString();
      const resultPayload: BishopricExamResult = {
        exam_code: student.exam_code,
        student_code: student.exam_code,
        student_name: student.student_name,
        church_name: student.church_name,
        stage: student.stage,
        subject_name: 'امتحان الأسقفية',
        category: categoryString,
        score_darasi: scoreDarasi,
        score_mahfoozat: scoreMahfoozat,
        score_coptic: scoreCoptic,
        grand_total_score: grandTotalScore,
        score: totalScore,
        max_score: totalMaxScore,
        percentage: overallPercentage,
        excellence_points: totalExcellencePoints,
        max_excellence_points: totalMaxExcellencePoints,
        excellence_unlocked: mergedExcCats.length > 0,
        excellence_categories: mergedExcCats,
        excellence_answers: mergedExcAnswers,
        answers: {
          ...mergedAnswers,
          _completed_categories: updatedCompleted
        },
        status: 'completed',
        submitted_at: nowIso,
        completed_at: nowIso
      };

      // Save backup locally
      try {
        localStorage.setItem(`exam_${student.exam_code}_${activeCategory}`, JSON.stringify(resultPayload));
      } catch (e) {
        console.warn('Error saving local backup:', e);
      }

      // 5. Submit cumulative payload to database via handleSubmitBishopricExam
      const res = await handleSubmitBishopricExam(
        student.exam_code,
        {
          ...mergedAnswers,
          _completed_categories: updatedCompleted
        },
        rawQuestions, // pass ALL questions to evaluate overall score properly
        setIsSubmitting,
        showBubble,
        () => {},
        {
          student_name: student.student_name,
          church_name: student.church_name,
          stage: student.stage,
          subject_name: 'امتحان الأسقفية',
          category: categoryString,
          max_score: totalMaxScore,
          max_excellence_points: totalMaxExcellencePoints,
          excellence_unlocked: mergedExcCats.length > 0,
          excellence_categories: mergedExcCats,
          excellence_answers: mergedExcAnswers,
          score_darasi: scoreDarasi,
          score_mahfoozat: scoreMahfoozat,
          score_coptic: scoreCoptic,
          grand_total_score: grandTotalScore
        }
      );

      if (res.success && res.data) {
        // Clear local progress cache for this category strictly AFTER verified DB insert confirmation
        try {
          localStorage.removeItem(`bishopric_exam_progress_${student.exam_code.trim()}`);
          localStorage.removeItem(`bishopric_exam_progress_${student.exam_code.trim()}_${activeCategory}`);
        } catch (e) {}
        
        const categoryTitle = availableCategoriesForStage.find(c => c.id === activeCategory)?.title || activeCategory;
        const couponQuestions = standardQuestions.map((q) => {
          const qScore = Number(q.score) || 1;
          const qKey = q.id || `q_${q.question_text}`;
          const studentAns = selectedAnswers[qKey];
          const isCorrect = studentAns !== undefined && studentAns !== null && String(studentAns).trim() === String(q.correct_answer || '').trim();
          return {
            studentScore: isCorrect ? qScore : 0,
            maxScore: qScore
          };
        });

        setCurrentCouponData({
          categoryTitle,
          questions: couponQuestions
        });
        setShowMinimalCoupon(true);

        setIsSubmitting(false);
        setCompletedCategories(updatedCompleted);
        setActiveCategory(null);
        setFinalResult(res.data);
        
        showBubble({
          type: 'success',
          title: 'تم الحفظ بنجاح',
          message: 'تم تسليم المسابقة وحفظ النتيجة وتأكيد درجاتك بنجاح!'
        });

        // Navigate back to Category Cards Screen
        setStep('dashboard');

        if (onComplete) {
          onComplete(res.data);
        }
      } else {
        setIsSubmitting(false);
        const failMsg = res.error || 'تعذر تأكيد الحفظ ، يرجى إعادة المحاولة';
        setSubmitError(failMsg);
      }
    } catch (err: any) {
      console.error('Submission error:', err);
      setIsSubmitting(false);
      const errTxt = 'تعذر تأكيد الحفظ ، يرجى إعادة المحاولة';
      setSubmitError(errTxt);
    }
  };

  // Hardcode Exact Redirection URL for "العودة للمنصة" (Back to Platform) Button
  const handleReturnToPlatform = () => {
    // 1. Clear current active exam states
    setActiveCategory(null);
    setSelectedAnswers({});
    setStudent(null);
    setStep('login');

    if (onClose) {
      try {
        onClose();
      } catch (e) {
        console.error('onClose error:', e);
      }
    }

    // 2. Direct hardcoded redirection to the exact hash URL
    window.location.href = 'https://mahraganalkeraza.github.io/Mahragan-Al-keraza-/#/bishopric-exam';
    
    // Fallback to force hash reload if already on the page
    window.location.hash = '#/bishopric-exam';
  };

  // Format time (MM:SS)
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const answeredCount = activeQuestions.filter(q => {
    const qKey = q.id || `q_${q.question_text}`;
    return selectedAnswers[qKey] !== undefined;
  }).length;
  
  const progressPercent = activeQuestions.length > 0 ? (answeredCount / activeQuestions.length) * 100 : 0;

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
      {showMinimalCoupon && currentCouponData ? (
        <div className="max-w-md mx-auto bg-white p-6 rounded-2xl shadow-xl border-2 border-blue-600 my-8 dir-rtl">
          <h2 className="text-xl font-black text-center text-blue-900 mb-4 border-b pb-2">
            📋 كوبون النتيجة - {currentCouponData.categoryTitle}
          </h2>

          {/* Question Breakdown Grid */}
          <div className="space-y-2 mb-6 max-h-80 overflow-y-auto pr-1">
            {currentCouponData.questions.map((q, idx) => (
              <div 
                key={idx} 
                className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <span className="font-bold text-gray-800">سؤال {idx + 1}</span>
                <span className="font-black text-lg text-blue-700">
                  {q.studentScore} / {q.maxScore}
                </span>
              </div>
            ))}
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={() => {
              setShowMinimalCoupon(false);
              setCurrentCouponData(null);
              setActiveCategory(null); // Return to category selection cards
              setStep('dashboard');
            }}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md transition cursor-pointer"
          >
            متابعة المسابقات المتبقية ←
          </button>
        </div>
      ) : (
        <>
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
            <Sparkles size={14} /> منصة امتحانات الأسقفية
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
              تسجيل دخول امتحان الأسقفية
            </h2>
            <p className="text-xs md:text-sm text-slate-500 font-bold max-w-md mx-auto leading-relaxed">
              أدخل كود الامتحان المخصص لك من كنيستك لبدء الامتحان
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-4">
            {!platformState.isOpen && (
              <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-900 text-xs md:text-sm font-black flex items-start gap-3 text-right shadow-sm animate-pulse">
                <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-extrabold text-amber-900 mb-0.5">⚠️ منصة الامتحانات مغلقة حالياً</div>
                  <div className="text-amber-700 font-bold text-xs leading-relaxed">
                    منصة امتحانات الأسقفية مغلقة بقرار إداري. سيتم فتح إمكانية الدخول فور تفعيلها من قبل الإدارة المركزية.
                  </div>
                </div>
              </div>
            )}

            <div className="relative">
              <Key size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="أدخل كود امتحان الأسقفية (مثال:025 M1234567890)"
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

      {/* STEP 1.5: CATEGORY SELECTION DASHBOARD */}
      {step === 'dashboard' && student && (
        <div className="space-y-6 animate-fade-in">
          {/* Student Profile Ribbon */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-right">
              <div className="w-16 h-16 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-3xl flex items-center justify-center shrink-0">
                <User size={32} />
              </div>
              <div>
                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                  كود الطالب: {student.exam_code}
                </span>
                <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-1">{student.student_name}</h3>
                <p className="text-xs md:text-sm text-slate-500 font-bold">
                  كنيسة: {student.church_name} • المرحلة الدراسية: {student.stage}
                </p>
              </div>
            </div>

            {/* Overall Progress Widget */}
            <div className="bg-slate-50 px-5 py-4 rounded-2xl border border-slate-200 text-center sm:text-left min-w-[150px]">
              <span className="text-[10px] text-slate-400 font-black block mb-1">نسبة الإنجاز</span>
              <span className="text-2xl font-black text-indigo-600">
                {completedCategories.length} / {availableCategoriesForStage.length}
              </span>
              <span className="text-[10px] text-slate-500 font-bold block mt-1">مسابقات مكتملة</span>
            </div>
          </div>

          {/* Subtitle / Call to Action */}
          <div className="text-center sm:text-right">
            <h4 className="text-lg font-black text-slate-800">اختر أحد مسابقات المرحلة التالية:</h4>
            <p className="text-xs text-slate-500 font-bold mt-1">
              تنبيه: يمكنك أداء كل مسابقة مرة واحدة فقط. سيتم قفل المسابقة بمجرد إرسال الإجابات.
            </p>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {availableCategoriesForStage.map((cat) => {
              const isCompleted = completedCategories.includes(cat.id);
              return (
                <div
                  key={cat.id}
                  onClick={() => isCompleted ? handleViewGradeStatement() : handleSelectCategory(cat.id)}
                  className={`bg-white rounded-3xl p-6 border transition-all relative overflow-hidden flex flex-col justify-between min-h-[180px] cursor-pointer ${
                    isCompleted
                      ? 'border-emerald-300 bg-emerald-50/20 hover:border-emerald-500 hover:shadow-lg hover:-translate-y-1'
                      : 'border-slate-200 hover:border-indigo-500 hover:shadow-xl hover:-translate-y-1'
                  }`}
                >
                  {/* Decorative corner icon for completed */}
                  {isCompleted && (
                    <div className="absolute top-0 left-0 w-14 h-14 bg-emerald-500 text-white flex items-center justify-center rounded-br-2xl shadow-xs">
                      <CheckCircle2 size={22} />
                    </div>
                  )}

                  <div className="space-y-2 text-right">
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full inline-block ${
                      isCompleted 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                        : 'bg-indigo-50 text-indigo-800 border border-indigo-100'
                    }`}>
                      {isCompleted ? 'تم الإرسال بنجاح ✅' : 'جاهز للبدء'}
                    </span>
                    <h3 className="text-xl font-black text-slate-900 pt-1">{cat.title}</h3>
                    <p className="text-xs text-slate-500 font-bold leading-relaxed">{cat.subtitle}</p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-400">امتحان ٢٠٢٦</span>
                    <span className={`text-xs font-black flex items-center gap-1 ${
                      isCompleted ? 'text-emerald-700 font-bold' : 'text-indigo-600 font-bold'
                    }`}>
                      {isCompleted ? (
                        <>
                          <span>عرض بيان الدرجات</span>
                          <Award size={14} />
                        </>
                      ) : (
                        <>
                          <span>ابدأ الآن</span>
                          <ArrowRight size={14} className="rotate-180" />
                        </>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grade Statement / Certificate Section (Active immediately after completing ANY individual competition) */}
          {completedCategories.length >= 1 && (
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50/30 to-indigo-50/30 p-6 md:p-8 rounded-3xl border-2 border-emerald-400 text-center space-y-4 max-w-xl mx-auto shadow-md">
              <Award className="mx-auto text-emerald-600 animate-bounce" size={44} />
              <div className="space-y-1.5">
                <h3 className="text-xl font-black text-slate-900">
                  {completedCategories.length === availableCategoriesForStage.length
                    ? '🎉 لقد أتممت كافة مسابقات المهرجان الإلكترونية!'
                    : `تم تسجيل إجاباتك في (${completedCategories.length} من ${availableCategoriesForStage.length}) مسابقات بنجاح`}
                </h3>
                <p className="text-xs text-slate-600 font-bold leading-relaxed">
                  نهنئك يا <span className="text-indigo-700 font-black">{student.student_name}</span>. يمكنك الاطلاع على بيان الدرجات المعتمد للمسابقات التي أتممتها وطباعة كشف النتيجة في أي وقت.
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={handleViewGradeStatement}
                  className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs md:text-sm font-black transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer hover:scale-[1.02]"
                >
                  <Award size={18} />
                  <span>عرض بيان درجات الطالب (كشف النتيجة الرسمي)</span>
                </button>
              </div>
            </div>
          )}

          {/* Logout / Switch User Option */}
          <div className="flex items-center justify-center pt-6">
            <button
              onClick={() => {
                setStudent(null);
                setStep('login');
              }}
              className="text-xs font-black text-slate-500 hover:text-rose-600 transition-colors flex items-center gap-1.5 cursor-pointer bg-slate-100 hover:bg-rose-50 px-5 py-2.5 rounded-xl border border-slate-200"
            >
              <span>تسجيل الخروج والرجوع لصفحة الكود</span>
            </button>
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
              <span className="text-[11px] text-slate-400 font-bold block mb-1">عدد الأسئلة الأساسية</span>
              <span className="text-xl font-black text-slate-900">{standardQuestions.length} سؤال</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
              <span className="text-[11px] text-slate-400 font-bold block mb-1">الوقت المخصص</span>
              <span className="text-xl font-black text-slate-900">{Math.max(standardQuestions.length * 3, 15)} دقيقة</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
              <span className="text-[11px] text-slate-400 font-bold block mb-1">أسئلة التميز الإضافية</span>
              <span className="text-xl font-black text-amber-600 flex items-center justify-center gap-1">
                <Sparkles size={16} />
                <span>{excellenceQuestions.length} سؤال</span>
              </span>
            </div>
          </div>

          {/* Instructions with Excellence Feature Highlight */}
          <div className="p-5 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-2 text-xs font-bold text-indigo-950 leading-relaxed">
            <h4 className="font-black text-indigo-900 flex items-center gap-1.5 text-sm">
              <ShieldCheck size={16} className="text-indigo-600" />
              تعليمات هامة قبل بدء الامتحان:
            </h4>
            <ul className="list-disc list-inside space-y-1.5 text-indigo-900/80 pr-2">
              <li>يحتوي الامتحان على أسئلة اختيار من متعدد خاصة بمرحلة ({student.stage}).</li>
              <li>يمكنك التنقل بين الأسئلة بحرية وتعديل إجاباتك قبل الضغط على زر "تسليم نهائي".</li>
              <li className="text-amber-900 font-black">
                🌟 نظام أسئلة التميز (Tie-Breaker): في حال حصولك على الدرجة النهائية في أي مسابقة، سيفتح لك تلقائياً سؤال تميز إضافي لتحديد المراكز الأولى والتفوق!
              </li>
              <li>بمجرد الضغط على "تسليم نهائي"، سيتم تصحيح إجاباتك وحفظ النتيجة في قاعدة البيانات فورياً.</li>
            </ul>
          </div>

          {standardQuestions.length === 0 && rawQuestions.length === 0 ? (
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
                onClick={() => setStep('dashboard')}
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
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                currentQ.is_excellence
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-indigo-50 text-indigo-700'
              }`}>
                {currentQuestionIdx + 1}/{activeQuestions.length}
              </span>
              <div>
                <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <span>السؤال {currentQuestionIdx + 1} من {activeQuestions.length}</span>
                  {currentQ.is_excellence && (
                    <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] rounded-full flex items-center gap-0.5">
                      <Sparkles size={10} /> سؤال تميز
                    </span>
                  )}
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
              className={`h-full transition-all duration-300 ${
                currentQ.is_excellence ? 'bg-amber-500' : 'bg-indigo-600'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Excellence Unlocked Notification Banner (if any category unlocked) */}
          {unlockedExcellenceCategories.length > 0 && (
            <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-50 to-yellow-50 border border-amber-300 rounded-2xl flex items-center justify-between gap-3 text-xs font-black text-amber-900 animate-pulse">
              <div className="flex items-center gap-2">
                <Trophy size={18} className="text-amber-600 shrink-0" />
                <span>
                  🌟 تهانينا! لقد حصلت على الدرجة النهائية وتم فتح سؤال التميز الخاص بمسابقة: ({unlockedExcellenceCategories.join('، ')})
                </span>
              </div>
              <span className="px-2.5 py-1 bg-amber-600 text-white rounded-lg text-[10px] shrink-0">
                مفتوح الآن في الأسئلة
              </span>
            </div>
          )}

          {/* Question Card */}
          <div className={`p-6 md:p-8 rounded-3xl border shadow-lg space-y-6 transition-all question-container ${isCopticStage ? 'coptic-font coptic-text' : ''} ${
            currentQ.is_excellence
              ? 'bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 border-amber-300 ring-2 ring-amber-300/50'
              : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-lg text-xs font-black ${
                    currentQ.is_excellence ? 'bg-amber-600 text-white shadow-sm' : 'bg-indigo-50 text-indigo-700'
                  }`}>
                    {currentQ.subject_name}
                  </span>

                  {currentQ.is_excellence && (
                    <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-lg text-xs font-black flex items-center gap-1 shadow-sm">
                      <Sparkles size={12} /> سؤال التميز لتحديد المركز الأول
                    </span>
                  )}
                </div>

                <h3 className={`text-base md:text-xl font-black text-slate-900 leading-relaxed pt-2 ${isCopticStage ? 'coptic-font coptic-text' : ''}`}>
                  {currentQ.question_text}
                </h3>

                {currentQ.is_excellence && (
                  <p className="text-xs font-bold text-amber-800 flex items-center gap-1 mt-1">
                    <Star size={14} className="text-amber-600 fill-amber-500" />
                    <span>سؤال إضافي لتفوقك وحصولك على الدرجة النهائية في مسابقة ({currentQ.subject_name}).</span>
                  </p>
                )}
              </div>
              
              <span className={`px-3 py-1 rounded-xl text-xs font-black shrink-0 border ${
                currentQ.is_excellence
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {currentQ.score} {currentQ.score > 2 && currentQ.score < 11 ? (currentQ.is_excellence ? 'نقاط تميز' : 'درجات') : (currentQ.is_excellence ? 'نقطة تميز' : 'درجة')}
              </span>
            </div>

            {/* Options List */}
            <div className={`space-y-3 options-grid ${isCopticStage ? 'coptic-font coptic-text' : ''}`}>
              {currentQ.options.map((opt, optIdx) => {
                const qKey = currentQ.id || `q_${currentQ.question_text}`;
                const isSelected = selectedAnswers[qKey] === opt;
                return (
                  <button
                    key={optIdx}
                    onClick={() => handleSelectOption(opt)}
                    className={`w-full p-4 rounded-2xl border text-right transition-all flex items-center justify-between gap-3 cursor-pointer option-btn ${isCopticStage ? 'coptic-font coptic-text' : ''} ${
                      isSelected
                        ? currentQ.is_excellence
                          ? 'bg-amber-100/90 border-amber-600 text-amber-950 font-black ring-2 ring-amber-500/40 shadow-md'
                          : 'bg-indigo-50/90 border-indigo-600 text-indigo-950 font-black ring-2 ring-indigo-500/30 shadow-md'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800 font-bold'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                        isSelected 
                          ? currentQ.is_excellence ? 'bg-amber-600 text-white' : 'bg-indigo-600 text-white'
                          : 'bg-white border border-slate-300 text-slate-600'
                      }`}>
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className={`text-sm md:text-base leading-relaxed ${isCopticStage ? 'coptic-font coptic-text' : ''}`}>{opt}</span>
                    </div>

                    {isSelected && (
                      <CheckCircle2 size={20} className={currentQ.is_excellence ? 'text-amber-600 shrink-0' : 'text-indigo-600 shrink-0'} />
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

              {currentQuestionIdx < activeQuestions.length - 1 ? (
                <button
                  onClick={() => setCurrentQuestionIdx(prev => Math.min(activeQuestions.length - 1, prev + 1))}
                  className={`px-6 py-3 text-white rounded-2xl text-xs md:text-sm font-black transition-all flex items-center gap-1.5 shadow-md cursor-pointer ${
                    currentQ.is_excellence
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                  }`}
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
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-700">لوحة التنقل السريع بين الأسئلة:</span>
                {unlockedExcellenceCategories.length > 0 && (
                  <span className="text-[11px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 flex items-center gap-1">
                    <Sparkles size={12} /> تتضمن أسئلة تميز مفتوحة
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowConfirmModal(true)}
                className="text-xs font-black text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                إنهاء وتسليم الآن
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeQuestions.map((q, idx) => {
                const qKey = q.id || `q_${q.question_text}`;
                const isAnswered = selectedAnswers[qKey] !== undefined;
                const isCurrent = idx === currentQuestionIdx;
                const isExc = Boolean(q.is_excellence);

                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentQuestionIdx(idx)}
                    className={`w-9 h-9 rounded-xl font-black text-xs transition-all cursor-pointer relative ${
                      isCurrent
                        ? isExc 
                          ? 'ring-2 ring-amber-600 bg-amber-600 text-white shadow-md'
                          : 'ring-2 ring-indigo-600 bg-indigo-600 text-white shadow-md'
                        : isAnswered
                        ? isExc
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : isExc
                        ? 'bg-amber-50 text-amber-800 border border-dashed border-amber-300'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {idx + 1}
                    {isExc && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center text-[8px] text-white">
                        ★
                      </span>
                    )}
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
                لقد أجبت على <strong className="text-indigo-600">{answeredCount}</strong> من أصل <strong className="text-slate-800">{activeQuestions.length}</strong> سؤال.
                {answeredCount < activeQuestions.length && (
                  <span className="block mt-1 text-rose-600 font-black">
                    ⚠️ تنبيه: توجد {activeQuestions.length - answeredCount} أسئلة لم يتم الإجابة عليها بعد!
                  </span>
                )}
                {unlockedExcellenceCategories.length > 0 && (
                  <span className="block mt-2 p-2 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs font-black">
                    🌟 لقد تم فتح سؤال التميز لمسابقة ({unlockedExcellenceCategories.join('، ')}) وتأكيد إجابته سيمنحك نقاط تفوق إضافية!
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
                جاري تأكيد حفظ الإجابات...
              </h3>
              <p className="text-xs font-bold text-slate-500">
                {submissionAttemptNumber > 1 
                  ? `إعادة محاولة التأكيد من السيرفر (محاولة ${submissionAttemptNumber} من 3)...`
                  : 'يتم الآن التحقق من وصول وحفظ إجاباتك ونقاط التميز بشكل آمن ومؤكد في السيرفر المركزي...'}
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

      {/* STEP 4: SUBMITTED / OFFICIAL GRADE STATEMENT & CERTIFICATE */}
      {step === 'submitted' && finalResult && (
        <div className="bg-white rounded-3xl p-6 md:p-10 border border-slate-200 shadow-2xl text-center space-y-6 max-w-3xl mx-auto animate-fade-in print:p-0 print:border-none print:shadow-none">
          {/* Header Banner */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="text-right">
              <span className="text-[11px] font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                أسقفية الشباب • مهرجان الكرازة
              </span>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 mt-1">بيان درجات الطالب والتقدير العام</h2>
            </div>
            <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl flex items-center justify-center shadow-xs">
              <Award size={32} className="text-emerald-600 animate-bounce" />
            </div>
          </div>

          {/* Student Info Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-right">
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">اسم الطالب</span>
              <span className="text-xs font-black text-slate-900 block truncate">{finalResult.student_name}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">الكنيسة</span>
              <span className="text-xs font-black text-slate-800 block truncate">{finalResult.church_name}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">المرحلة الدراسية</span>
              <span className="text-xs font-black text-indigo-700 block truncate">{finalResult.stage}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">كود الامتحان</span>
              <span className="text-xs font-mono font-black text-slate-800 block">{finalResult.exam_code}</span>
            </div>
          </div>

          {/* Subject Breakdown Cards (Curriculum, Hymns, Coptic 1, Coptic 2) */}
          {granularResult && (
            <div className="space-y-2 text-right">
              <h4 className="text-xs font-black text-slate-700">تفاصيل درجات المسابقات:</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* 1. Curriculum */}
                <div className={`p-3.5 rounded-2xl border flex flex-col justify-between text-center ${
                  granularResult.curriculum.participated 
                    ? 'bg-indigo-50/40 border-indigo-200' 
                    : 'bg-slate-50 border-slate-200 opacity-70'
                }`}>
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-800">المنهج الدراسي</p>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full inline-block ${
                      granularResult.curriculum.participated ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {granularResult.curriculum.participated ? 'مشترك ✅' : 'غير مشترك'}
                    </span>
                    <p className="text-base font-black text-slate-900 mt-1">
                      {granularResult.curriculum.participated ? `${granularResult.curriculum.score} / ${granularResult.curriculum.maxScore || 15}` : '-'}
                    </p>
                  </div>
                  {granularResult.curriculum.excellence > 0 && (
                    <span className="inline-block mt-2 text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                      +{granularResult.curriculum.excellence} تميز 🌟
                    </span>
                  )}
                </div>

                {/* 2. Hymns */}
                <div className={`p-3.5 rounded-2xl border flex flex-col justify-between text-center ${
                  granularResult.hymns.participated 
                    ? 'bg-indigo-50/40 border-indigo-200' 
                    : 'bg-slate-50 border-slate-200 opacity-70'
                }`}>
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-800">الألحان والمحفوظات</p>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full inline-block ${
                      granularResult.hymns.participated ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {granularResult.hymns.participated ? 'مشترك ✅' : 'غير مشترك'}
                    </span>
                    <p className="text-base font-black text-slate-900 mt-1">
                      {granularResult.hymns.participated ? `${granularResult.hymns.score} / ${granularResult.hymns.maxScore || 15}` : '-'}
                    </p>
                  </div>
                  {granularResult.hymns.excellence > 0 && (
                    <span className="inline-block mt-2 text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                      +{granularResult.hymns.excellence} تميز 🌟
                    </span>
                  )}
                </div>

                {/* 3. Coptic 1 */}
                <div className={`p-3.5 rounded-2xl border flex flex-col justify-between text-center ${
                  granularResult.coptic1.participated 
                    ? 'bg-indigo-50/40 border-indigo-200' 
                    : 'bg-slate-50 border-slate-200 opacity-70'
                }`}>
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-800">اللغة القبطية (م1)</p>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full inline-block ${
                      granularResult.coptic1.participated ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {granularResult.coptic1.participated ? 'مشترك ✅' : 'غير مشترك'}
                    </span>
                    <p className="text-base font-black text-slate-900 mt-1">
                      {granularResult.coptic1.participated ? `${granularResult.coptic1.score} / ${granularResult.coptic1.maxScore || 15}` : '-'}
                    </p>
                  </div>
                  {granularResult.coptic1.excellence > 0 && (
                    <span className="inline-block mt-2 text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                      +{granularResult.coptic1.excellence} تميز 🌟
                    </span>
                  )}
                </div>

                {/* 4. Coptic 2 */}
                <div className={`p-3.5 rounded-2xl border flex flex-col justify-between text-center ${
                  granularResult.coptic2.participated 
                    ? 'bg-indigo-50/40 border-indigo-200' 
                    : 'bg-slate-50 border-slate-200 opacity-70'
                }`}>
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-800">اللغة القبطية (م2)</p>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full inline-block ${
                      granularResult.coptic2.participated ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {granularResult.coptic2.participated ? 'مشترك ✅' : 'غير مشترك'}
                    </span>
                    <p className="text-base font-black text-slate-900 mt-1">
                      {granularResult.coptic2.participated ? `${granularResult.coptic2.score} / ${granularResult.coptic2.maxScore || 15}` : '-'}
                    </p>
                  </div>
                  {granularResult.coptic2.excellence > 0 && (
                    <span className="inline-block mt-2 text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                      +{granularResult.coptic2.excellence} تميز 🌟
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Excellence Bonus Medal Banner if earned */}
          {((granularResult?.totalExcellencePoints ?? Number(finalResult.excellence_points)) > 0) && (
            <div className="p-4 bg-gradient-to-r from-amber-500/20 via-amber-100 to-yellow-100 border-2 border-amber-400 rounded-3xl text-center space-y-1 max-w-md mx-auto shadow-sm">
              <div className="flex items-center justify-center gap-1.5 text-amber-900 font-black text-sm">
                <Trophy size={18} className="text-amber-600 animate-pulse" />
                <span>وسام التميز والتفوق لحسم المراكز الأولى</span>
              </div>
              <p className="text-xs font-bold text-amber-800">
                أحسنت صنعاً! حصلت على <strong className="text-amber-950 font-black text-sm">+{granularResult?.totalExcellencePoints ?? finalResult.excellence_points}</strong> نقاط إضافية في سؤال التميز 🌟
              </p>
            </div>
          )}

          {/* Dynamic Grade & Total Card */}
          {(() => {
            const pct = (granularResult?.percentage ?? Number(finalResult.percentage)) || 0;
            const grade = getGradeInfo(pct);
            const standardScore = granularResult?.totalStandardScore ?? finalResult.total_score;
            const maxScore = granularResult?.maxScore ?? finalResult.max_score;
            const grandTotal = granularResult?.grandTotal ?? finalResult.grand_total_score ?? standardScore;

            return (
              <div className={`p-6 rounded-3xl border ${grade.color} space-y-3`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider block opacity-80">التقييم العام المعتمد</span>
                  <span className="text-xl md:text-2xl font-black">{grade.title}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-current/20 text-center">
                  <div>
                    <span className="text-[10px] font-bold block opacity-75">الدرجة الأساسية</span>
                    <span className="text-lg md:text-xl font-black font-mono">{standardScore} / {maxScore}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold block opacity-75">النسبة المئوية</span>
                    <span className="text-lg md:text-xl font-black font-mono">{pct}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold block opacity-75">المجموع بالتميز</span>
                    <span className="text-lg md:text-xl font-black font-mono">{grandTotal}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-100 print:hidden">
            <button
              onClick={() => window.print()}
              className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs md:text-sm font-black transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer size={16} />
              <span>طباعة بيان الدرجات</span>
            </button>
            <button
              onClick={() => setStep('dashboard')}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs md:text-sm font-black transition-all shadow-md shadow-indigo-600/20 cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw size={16} />
              <span>الرجوع للوحة المسابقات</span>
            </button>
            <button
              onClick={handleReturnToPlatform}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs md:text-sm font-black transition-all border border-slate-200 cursor-pointer"
            >
              العودة للمنصة
            </button>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export const BishopricExamModule = BishopricStudentExamEngine;



export default BishopricStudentExamEngine;
