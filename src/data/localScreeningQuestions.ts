import { BishopricExamQuestion } from '../utils/bishopricExamStorage';

export interface ExtendedCopticQuestion extends BishopricExamQuestion {
  letterToPronounce?: string;
  shouldAutoPlay?: boolean;
  audioUrl?: string;
}

// 1. Coptic Level 1 Questions for Nursery (حضانة - قبطي مستوى أول)
export const copticLevel1Nursery: ExtendedCopticQuestion[] = [
  {
    id: 'coptic_nursery_1',
    stage: 'حضانة',
    subject_name: 'قبطي مستوى أول',
    question_text: 'ما هو اسم هذا الحرف القبطي Ⲁ ؟',
    options: ['ألفا (Alpha)', 'فيتا (Vita)', 'غملا (Gamma)', 'دلتا (Delta)'],
    correct_answer: 'ألفا (Alpha)',
    score: 1,
    letterToPronounce: 'A',
    shouldAutoPlay: true,
    is_excellence: false
  },
  {
    id: 'coptic_nursery_2',
    stage: 'حضانة',
    subject_name: 'قبطي مستوى أول',
    question_text: 'ما هو نطق الحرف Ⲁ في بداية كلمة Ⲁⲗⲫⲁ ؟',
    options: ['أ (A)', 'ب (B)', 'ج (G)', 'د (D)'],
    correct_answer: 'أ (A)',
    score: 1,
    letterToPronounce: 'A',
    shouldAutoPlay: false,
    is_excellence: false
  },
  {
    id: 'coptic_nursery_3',
    stage: 'حضانة',
    subject_name: 'قبطي مستوى أول',
    question_text: 'اختر الحرف القبطي الذي ينطق مثل حرف الـ V أو B :',
    options: ['Ⲃ (Vita)', 'Ⲁ (Alpha)', 'Ⲅ (Gamma)', 'Ⲇ (Delta)'],
    correct_answer: 'Ⲃ (Vita)',
    score: 1,
    letterToPronounce: 'V',
    shouldAutoPlay: true,
    is_excellence: false
  },
  {
    id: 'coptic_nursery_4',
    stage: 'حضانة',
    subject_name: 'قبطي مستوى أول',
    question_text: 'ما هو المعنى العربي للكلمة القبطية Ⲃⲏⲑⲗⲉⲉⲙ ؟',
    options: ['بيت لحم', 'أورشليم', 'الناصرة', 'مصر'],
    correct_answer: 'بيت لحم',
    score: 1,
    letterToPronounce: 'Bethlehem',
    shouldAutoPlay: false,
    is_excellence: false
  },
  {
    id: 'coptic_nursery_5',
    stage: 'حضانة',
    subject_name: 'قبطي مستوى أول',
    question_text: 'ما اسم هذا الحرف القبطي Ⲅ ؟',
    options: ['غملا (Gamma)', 'فيتا (Vita)', 'سيجما (Sigma)', 'ألفا (Alpha)'],
    correct_answer: 'غملا (Gamma)',
    score: 1,
    letterToPronounce: 'Gamma',
    shouldAutoPlay: true,
    is_excellence: false
  },
  {
    id: 'coptic_nursery_6',
    stage: 'حضانة',
    subject_name: 'قبطي مستوى أول',
    question_text: 'ما المعنى العربي للكلمة القبطية Ⲁⲅⲅⲉⲗⲟⲥ ؟',
    options: ['ملاك', 'قديس', 'كاهن', 'ملك'],
    correct_answer: 'ملاك',
    score: 1,
    letterToPronounce: 'Angelos',
    shouldAutoPlay: false,
    is_excellence: false
  },
  {
    id: 'coptic_nursery_7',
    stage: 'حضانة',
    subject_name: 'قبطي مستوى أول',
    question_text: 'ما هو اسم الحرف القبطي Ⲇ ؟',
    options: ['دلتا (Delta)', 'زيتا (Zeta)', 'إى (Ei)', 'ثيتا (Theta)'],
    correct_answer: 'دلتا (Delta)',
    score: 1,
    letterToPronounce: 'D',
    shouldAutoPlay: true,
    is_excellence: false
  },
  {
    id: 'coptic_nursery_8',
    stage: 'حضانة',
    subject_name: 'قبطي مستوى أول',
    question_text: 'ما هو المعنى العربي للكلمة القبطية Ⲓⲏⲥⲟⲩⲥ ؟',
    options: ['يسوع', 'المسيح', 'الرب', 'الإله'],
    correct_answer: 'يسوع',
    score: 1,
    letterToPronounce: 'Jesus',
    shouldAutoPlay: false,
    is_excellence: false
  },
  // سؤال تميز حضانة
  {
    id: 'coptic_nursery_excellence_1',
    stage: 'حضانة',
    subject_name: 'قبطي مستوى أول',
    question_text: '🌟 سؤال تميز: ما هو الحرف الذي ينطق (أو طويلة) في القبطية؟',
    options: ['Ⲱ (Omega)', 'Ⲟ (Omicron)', 'Ⲁ (Alpha)', 'Ⲉ (Ei)'],
    correct_answer: 'Ⲱ (Omega)',
    score: 2,
    letterToPronounce: 'Omega',
    shouldAutoPlay: true,
    is_excellence: true
  }
];

// 2. Coptic Level 1 Questions for Grades 1 & 2 (أولى وثانية - قبطي مستوى أول)
export const copticLevel1Grades1And2: ExtendedCopticQuestion[] = [
  {
    id: 'coptic_g12_1',
    stage: 'أولى وثانية',
    subject_name: 'قبطي مستوى أول',
    question_text: 'ما اسم الحرف القبطي Ⲍ الذي ينطق (ز) ؟',
    options: ['زيتا (Zeta)', 'إيتا (Eta)', 'ثيتا (Theta)', 'يوتا (Iota)'],
    correct_answer: 'زيتا (Zeta)',
    score: 1,
    letterToPronounce: 'Z',
    shouldAutoPlay: true,
    is_excellence: false
  },
  {
    id: 'coptic_g12_2',
    stage: 'أولى وثانية',
    subject_name: 'قبطي مستوى أول',
    question_text: 'كيف ينطق الحرف القبطي ⲏ (إيتا) ؟',
    options: ['إي طويلة (ee)', 'أ (a)', 'و (o)', 'ي قصيرة (i)'],
    correct_answer: 'إي طويلة (ee)',
    score: 1,
    letterToPronounce: 'E',
    shouldAutoPlay: false,
    is_excellence: false
  },
  {
    id: 'coptic_g12_3',
    stage: 'أولى وثانية',
    subject_name: 'قبطي مستوى أول',
    question_text: 'ما المعنى العربي للكلمة القبطية Ⲭⲣⲓⲥⲧⲟⲥ ؟',
    options: ['المسيح', 'يسوع', 'المخلص', 'المعلم'],
    correct_answer: 'المسيح',
    score: 1,
    letterToPronounce: 'Khristos',
    shouldAutoPlay: false,
    is_excellence: false
  },
  {
    id: 'coptic_g12_4',
    stage: 'أولى وثانية',
    subject_name: 'قبطي مستوى أول',
    question_text: 'ما هو اسم الحرف القبطي Ⲑ ؟',
    options: ['ثيتا (Theta)', 'يوتا (Iota)', 'كبّا (Kappa)', 'لولا (Lola)'],
    correct_answer: 'ثيتا (Theta)',
    score: 1,
    letterToPronounce: 'Th',
    shouldAutoPlay: true,
    is_excellence: false
  },
  {
    id: 'coptic_g12_5',
    stage: 'أولى وثانية',
    subject_name: 'قبطي مستوى أول',
    question_text: 'ما هو المعنى العربي للكلمة القبطية Ⲑⲉⲟⲥ ؟',
    options: ['إله', 'ملاك', 'سماء', 'أرض'],
    correct_answer: 'إله',
    score: 1,
    letterToPronounce: 'Theos',
    shouldAutoPlay: false,
    is_excellence: false
  },
  {
    id: 'coptic_g12_6',
    stage: 'أولى وثانية',
    subject_name: 'قبطي مستوى أول',
    question_text: 'اختر الحرف القبطي المسمى (كبّا) وينطق كـ (ك) :',
    options: ['Ⲕ (Kappa)', 'Ⲗ (Lola)', 'Ⲙ (May)', 'Ⲛ (Nei)'],
    correct_answer: 'Ⲕ (Kappa)',
    score: 1,
    letterToPronounce: 'K',
    shouldAutoPlay: true,
    is_excellence: false
  },
  {
    id: 'coptic_g12_7',
    stage: 'أولى وثانية',
    subject_name: 'قبطي مستوى أول',
    question_text: 'ما هو نطق الحرف Ⲗ (لولا) في كلمة Ⲗⲟⲅⲟⲥ ؟',
    options: ['ل (L)', 'م (M)', 'ن (N)', 'ك (K)'],
    correct_answer: 'ل (L)',
    score: 1,
    letterToPronounce: 'L',
    shouldAutoPlay: true,
    is_excellence: false
  },
  {
    id: 'coptic_g12_8',
    stage: 'أولى وثانية',
    subject_name: 'قبطي مستوى أول',
    question_text: 'ما المعنى العربي للكلمة القبطية Ⲗⲟⲅⲟⲥ ؟',
    options: ['الكلمة', 'النور', 'الحياة', 'الطريق'],
    correct_answer: 'الكلمة',
    score: 1,
    letterToPronounce: 'Logos',
    shouldAutoPlay: false,
    is_excellence: false
  },
  {
    id: 'coptic_g12_9',
    stage: 'أولى وثانية',
    subject_name: 'قبطي مستوى أول',
    question_text: 'ما المعنى العربي للكلمة القبطية Ⲙⲁⲣⲓⲁ ؟',
    options: ['مريم', 'مرثا', 'سالومي', 'مريم المجدلية'],
    correct_answer: 'مريم',
    score: 1,
    letterToPronounce: 'Maria',
    shouldAutoPlay: false,
    is_excellence: false
  },
  // سؤال تميز أولى وثانية
  {
    id: 'coptic_g12_excellence_1',
    stage: 'أولى وثانية',
    subject_name: 'قبطي مستوى أول',
    question_text: '🌟 سؤال تميز: ما اسم ونطق هذا الحرف القبطي Ϣ ؟',
    options: ['شاي (ينطق ش)', 'سيما (ينطق س)', 'في (ينطق ف)', 'خاي (ينطق خ)'],
    correct_answer: 'شاي (ينطق ش)',
    score: 2,
    letterToPronounce: 'Shai',
    shouldAutoPlay: true,
    is_excellence: true
  }
];

/**
 * Helper function to retrieve pre-loaded Coptic Level 1 questions for Nursery & Grades 1-2
 */
export const getPreloadedCopticQuestions = (stageStr: string, subjectOrCode?: string): ExtendedCopticQuestion[] => {
  const normStage = (stageStr || '').toLowerCase();
  const normSubj = (subjectOrCode || '').toLowerCase();

  const isCopticReq = normStage.includes('قبطي') || normSubj.includes('قبطي') || normStage.includes('م1') || normSubj.includes('م1');
  
  if (normStage.includes('حضانة') || normStage.includes('حضانه')) {
    return copticLevel1Nursery;
  }

  if (normStage.includes('أولى') || normStage.includes('اولى') || normStage.includes('ثانية') || normStage.includes('ثانيه')) {
    return copticLevel1Grades1And2;
  }

  if (isCopticReq) {
    // Default fallback to Nursery / G1-2 Coptic set
    return [...copticLevel1Nursery, ...copticLevel1Grades1And2];
  }

  return [];
};
