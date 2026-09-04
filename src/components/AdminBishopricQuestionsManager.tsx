import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../utils/supabaseClient';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Filter, 
  Save, 
  RefreshCw, 
  Check, 
  X, 
  Layers,
  HelpCircle,
  Sparkles,
  Award,
  Star
} from 'lucide-react';
import { 
  BishopricExamQuestion, 
  fetchBishopricQuestions, 
  saveBishopricQuestion, 
  deleteBishopricQuestion,
  normalizeArabic
} from '../utils/bishopricExamStorage';
import { STAGE_ORDER } from '../constants';

// قائمة المسابقات الثابتة
const competitionOptions = [
  "دراسي",
  "محفوظات",
  "قبطي مستوى أول",
  "قبطي مستوى ثانٍ"
];

export const AdminBishopricQuestionsManager: React.FC = () => {
  const [questions, setQuestions] = useState<BishopricExamQuestion[]>([]);
  const [stageOptions, setStageOptions] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem('cached_bishopric_stages');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return STAGE_ORDER.slice(0, 16);
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStages, setIsLoadingStages] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' | null }>({ text: '', type: null });

  // Filter States
  const [stageFilter, setStageFilter] = useState('الكل');
  const [subjectFilter, setSubjectFilter] = useState('الكل');
  const [typeFilter, setTypeFilter] = useState<'all' | 'standard' | 'excellence'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Form State for inline editing or adding
  const [editingQuestion, setEditingQuestion] = useState<Partial<BishopricExamQuestion> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Dynamic fetch stages from Supabase
  useEffect(() => {
    const fetchStages = async () => {
      setIsLoadingStages(true);
      try {
        let stagesData: any[] | null = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const { data, error } = await supabase
              .from('stage_competitions')
              .select('stage_name');
            
            if (!error && data && data.length > 0) {
              stagesData = data;
              break;
            }
          } catch (_) {}

          if (attempt < 3) {
            await new Promise((r) => setTimeout(r, 600 * attempt));
          }
        }

        if (stagesData && stagesData.length > 0) {
          // استخراج المراحل بدون تكرار
          const uniqueStages = Array.from(new Set(stagesData.map((item: any) => item.stage_name).filter(Boolean))) as string[];
          setStageOptions(uniqueStages);
          try {
            localStorage.setItem('cached_bishopric_stages', JSON.stringify(uniqueStages));
          } catch (_) {}
        } else {
          try {
            const cached = localStorage.getItem('cached_bishopric_stages');
            if (cached) {
              setStageOptions(JSON.parse(cached));
            } else {
              setStageOptions(STAGE_ORDER.slice(0, 16));
            }
          } catch (_) {
            setStageOptions(STAGE_ORDER.slice(0, 16));
          }
        }
      } catch (err: any) {
        console.warn('Notice fetching stages from Supabase (using fallback):', err?.message || err);
        try {
          const cached = localStorage.getItem('cached_bishopric_stages');
          if (cached) {
            setStageOptions(JSON.parse(cached));
          } else {
            setStageOptions(STAGE_ORDER.slice(0, 16));
          }
        } catch (_) {
          setStageOptions(STAGE_ORDER.slice(0, 16));
        }
      } finally {
        setIsLoadingStages(false);
      }
    };

    fetchStages();
  }, []);

  // Load questions
  const loadQuestions = async () => {
    setIsLoading(true);
    try {
      const qData = await fetchBishopricQuestions();
      setQuestions(qData);
    } catch (err) {
      console.error('Error loading Bishopric questions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const handleOpenAdd = () => {
    setEditingQuestion({
      stage: stageFilter !== 'الكل' ? stageFilter : (stageOptions[0] || 'عام'),
      subject_name: subjectFilter !== 'الكل' ? subjectFilter : competitionOptions[0],
      question_text: '',
      options: ['', '', '', ''],
      correct_answer: '',
      score: 1,
      is_excellence: false
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (q: BishopricExamQuestion) => {
    setEditingQuestion({
      id: q.id,
      stage: q.stage || (stageOptions[0] || 'عام'),
      subject_name: q.subject_name || competitionOptions[0],
      question_text: q.question_text || '',
      options: Array.isArray(q.options) && q.options.length > 0 ? [...q.options] : ['', '', '', ''],
      correct_answer: q.correct_answer || '',
      score: Number(q.score) || 1,
      is_excellence: Boolean(q.is_excellence)
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingQuestion) return;

    const { stage, subject_name, question_text, options, correct_answer, score, is_excellence } = editingQuestion;

    if (!stage || !subject_name) {
      setStatusMessage({ text: 'يرجى تحديد المرحلة والمسابقة', type: 'error' });
      return;
    }

    if (!question_text || !question_text.trim()) {
      setStatusMessage({ text: 'يرجى كتابة رأس السؤال', type: 'error' });
      return;
    }

    const cleanOptions = (options || []).map(o => String(o).trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      setStatusMessage({ text: 'يرجى إدخال خيارين على الأقل للسؤال', type: 'error' });
      return;
    }

    if (!correct_answer || !cleanOptions.includes(correct_answer.trim())) {
      setStatusMessage({ text: 'يرجى تحديد الإجابة النموذجية الصحيحة من بين الخيارات المتاحة', type: 'error' });
      return;
    }

    setIsSaving(true);
    setStatusMessage({ text: 'جاري حفظ السؤال...', type: 'info' });

    const payload: BishopricExamQuestion = {
      id: editingQuestion.id,
      stage: stage.trim(),
      subject_name: subject_name.trim(),
      question_text: question_text.trim(),
      options: cleanOptions,
      correct_answer: correct_answer.trim(),
      score: Number(score) || 1,
      is_excellence: Boolean(is_excellence)
    };

    const res = await saveBishopricQuestion(payload);
    setIsSaving(false);

    if (res.success) {
      setStatusMessage({ 
        text: editingQuestion.id 
          ? (is_excellence ? 'تم تحديث سؤال التميز بنجاح 🌟' : 'تم تحديث السؤال بنجاح') 
          : (is_excellence ? 'تم حفظ سؤال التميز بنجاح 🌟 في بنك الأسئلة' : 'تم حفظ السؤال الجديد بنجاح في جدول bishopric_exam_questions'), 
        type: 'success' 
      });
      setIsModalOpen(false);
      setEditingQuestion(null);
      loadQuestions();
      setTimeout(() => setStatusMessage({ text: '', type: null }), 3500);
    } else {
      setStatusMessage({ text: res.error || 'فشل في حفظ السؤال', type: 'error' });
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!window.confirm('هل أنت متأكد من حذف هذا السؤال من أسئلة الأسقفية؟')) {
      return;
    }

    setIsLoading(true);
    const res = await deleteBishopricQuestion(id);
    if (res.success) {
      setStatusMessage({ text: 'تم حذف السؤال بنجاح', type: 'info' });
      loadQuestions();
      setTimeout(() => setStatusMessage({ text: '', type: null }), 3000);
    } else {
      setIsLoading(false);
      setStatusMessage({ text: res.error || 'فشل في حذف السؤال', type: 'error' });
    }
  };

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const normSearch = normalizeArabic(searchTerm);
      const normText = normalizeArabic(q.question_text || '');
      const matchesSearch = !searchTerm || normText.includes(normSearch);
      const matchesStage = stageFilter === 'الكل' || q.stage === stageFilter;
      const matchesSubject = subjectFilter === 'الكل' || q.subject_name === subjectFilter;
      
      const matchesType = typeFilter === 'all' 
        ? true 
        : typeFilter === 'excellence' 
        ? Boolean(q.is_excellence) 
        : !q.is_excellence;

      return matchesSearch && matchesStage && matchesSubject && matchesType;
    });
  }, [questions, searchTerm, stageFilter, subjectFilter, typeFilter]);

  const totalExcellenceCount = useMemo(() => {
    return questions.filter(q => q.is_excellence).length;
  }, [questions]);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 font-arabic text-right space-y-6" dir="rtl">
      {/* Top Sticky Header Bar matching Tab 1 (ExamBuilder) style */}
      <div className="flex flex-wrap items-center justify-between gap-4 sticky top-0 bg-white py-3 z-10 border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-sm bg-white shadow-sm focus:ring-2 focus:ring-indigo-500"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
          >
            <option value="الكل">كل المراحل</option>
            {stageOptions.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-sm bg-white shadow-sm focus:ring-2 focus:ring-indigo-500"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
          >
            <option value="الكل">كل المسابقات</option>
            {competitionOptions.map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>

          {/* Type Filter: Standard vs Excellence */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
                typeFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل ({questions.length})
            </button>
            <button
              onClick={() => setTypeFilter('standard')}
              className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
                typeFilter === 'standard' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              أساسية ({questions.length - totalExcellenceCount})
            </button>
            <button
              onClick={() => setTypeFilter('excellence')}
              className={`px-3 py-1 text-xs font-black rounded-lg transition-all flex items-center gap-1 ${
                typeFilter === 'excellence' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-700 hover:text-amber-900'
              }`}
            >
              <Sparkles size={12} />
              <span>تميز ({totalExcellenceCount})</span>
            </button>
          </div>

          <div className="relative">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="بحث في نص السؤال..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-9 pl-4 py-2 border border-slate-300 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-indigo-500 w-48 sm:w-56"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadQuestions}
            disabled={isLoading}
            className="p-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
          
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-2 text-sm font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus size={16} /> إضافة سؤال أونلاين جديد
          </button>
        </div>
      </div>

      {/* Alert Status Banner */}
      {statusMessage.text && (
        <div className={`p-4 rounded-xl flex items-center justify-between gap-3 text-xs font-bold ${
          statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
          statusMessage.type === 'error' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' && <CheckCircle2 size={16} />}
            {statusMessage.type === 'error' && <AlertCircle size={16} />}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage({ text: '', type: null })}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Questions List matching Tab 1 Card Templates */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-500 font-bold flex flex-col items-center gap-2">
          <RefreshCw size={24} className="animate-spin text-indigo-600" />
          <span>جاري تحميل أسئلة أونلاين الأسقفية...</span>
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="py-12 text-center text-slate-500 font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-300">
          <HelpCircle size={32} className="mx-auto mb-2 text-slate-400" />
          <p>لا توجد أسئلة مضافة حتى الآن تطابق معايير التصفية المحددة.</p>
          <button
            onClick={handleOpenAdd}
            className="mt-3 px-4 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-black inline-flex items-center gap-1.5 transition-all"
          >
            <Plus size={14} /> إضافة سؤال جديد الآن
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredQuestions.map((q, qIndex) => {
            const isExcellence = Boolean(q.is_excellence);
            return (
              <div
                key={q.id || qIndex}
                className={`p-6 border rounded-2xl relative group transition-all shadow-sm ${
                  isExcellence 
                    ? 'border-amber-300 bg-gradient-to-br from-amber-50/60 via-amber-50/20 to-white hover:border-amber-400 ring-1 ring-amber-200' 
                    : 'border-slate-200 bg-slate-50 hover:border-indigo-300'
                }`}
              >
                {/* Top Left Actions matching Tab 1 */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(q)}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer shadow-sm ${
                      isExcellence 
                        ? 'text-amber-700 hover:text-amber-900 bg-white border-amber-200 hover:bg-amber-50' 
                        : 'text-indigo-600 hover:text-indigo-800 bg-white border-slate-200 hover:bg-indigo-50'
                    }`}
                    title="تعديل السؤال"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(q.id)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 bg-white border border-slate-200 rounded-lg hover:bg-rose-50 transition-all cursor-pointer shadow-sm"
                    title="حذف السؤال"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Question Card Header */}
                <div className="mb-4 pr-2">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                      isExcellence ? 'bg-amber-600 text-white' : 'bg-indigo-600 text-white'
                    }`}>
                      سؤال #{qIndex + 1}
                    </span>

                    {/* Excellence Badge */}
                    {isExcellence ? (
                      <span className="bg-gradient-to-r from-amber-500 to-yellow-600 text-white text-[11px] font-black px-3 py-0.5 rounded-full shadow-sm flex items-center gap-1 animate-pulse">
                        <Sparkles size={12} /> سؤال تميز (Tie-Breaker)
                      </span>
                    ) : (
                      <span className="bg-slate-200 text-slate-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                        سؤال أساسي
                      </span>
                    )}

                    <span className="bg-slate-200 text-slate-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                      المرحلة: {q.stage}
                    </span>
                    <span className="bg-purple-100 text-purple-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                      المسابقة: {q.subject_name}
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                      الدرجة: {q.score}
                    </span>
                  </div>

                  <h4 className="text-base font-black text-slate-900 mt-2 leading-relaxed">
                    {q.question_text}
                  </h4>
                  
                  {isExcellence && (
                    <p className="text-[11px] font-bold text-amber-800 mt-1 flex items-center gap-1">
                      <Star size={12} className="text-amber-600 fill-amber-500 shrink-0" />
                      <span>يظهر هذا السؤال حصرياً للطالب الحاصل على الدرجة النهائية في مسابقة ({q.subject_name}) لتحديد الترتيب الأول.</span>
                    </p>
                  )}
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200">
                  {Array.isArray(q.options) && q.options.map((opt, optIdx) => {
                    const isCorrect = q.correct_answer === opt;
                    return (
                      <div
                        key={optIdx}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 ${
                          isCorrect
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-black'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-black border border-slate-300 shrink-0">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span>{opt}</span>
                        </div>
                        {isCorrect && (
                          <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                            <Check size={12} /> الإجابة النموذجية
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal for Creating/Editing Question */}
      {isModalOpen && editingQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 overflow-y-auto max-h-[90vh] font-arabic" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen size={20} className="text-indigo-600" />
                <h3 className="font-black text-lg text-slate-900">
                  {editingQuestion.id ? 'تعديل سؤال أونلاين الأسقفية' : 'إضافة سؤال أونلاين جديد للأسقفية'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Excellence Toggle Banner */}
            <div className={`p-4 rounded-2xl border transition-all ${
              editingQuestion.is_excellence 
                ? 'bg-amber-50 border-amber-300 text-amber-950 ring-2 ring-amber-400/30' 
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={Boolean(editingQuestion.is_excellence)}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, is_excellence: e.target.checked })}
                  className="w-5 h-5 mt-0.5 text-amber-600 rounded-lg focus:ring-amber-500 border-slate-300 shrink-0 cursor-pointer"
                />
                <div className="space-y-1">
                  <span className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                    <Sparkles size={16} className={editingQuestion.is_excellence ? 'text-amber-600' : 'text-slate-400'} />
                    <span>سؤال تميز (Tie-Breaker / Excellence Question)</span>
                  </span>
                  <p className="text-xs font-bold text-slate-500 leading-relaxed">
                    عند التفعيل، سيكون هذا السؤال مخفياً ولن يفتح للطالب إلا إذا أحرز الدرجة النهائية في جميع الأسئلة الأساسية الخاصة بهذه المسابقة ({editingQuestion.subject_name || 'المسابقة المحددة'}).
                  </p>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">المرحلة الدراسية</label>
                <select
                  value={editingQuestion.stage || (stageOptions.length > 0 ? stageOptions[0] : '')}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, stage: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  {stageOptions.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">المسابقة / المادة</label>
                <select
                  value={editingQuestion.subject_name || competitionOptions[0]}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, subject_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  {competitionOptions.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">
                  {editingQuestion.is_excellence ? 'نقاط التميز' : 'الدرجة المخصصة'}
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={editingQuestion.score || 1}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, score: Number(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-black text-slate-700 block mb-1">
                {editingQuestion.is_excellence ? 'نص سؤال التميز' : 'نص السؤال'}
              </label>
              <textarea
                rows={3}
                placeholder={editingQuestion.is_excellence ? "اكتب نص سؤال التميز لتحديد المراكز الأولى..." : "اكتب نص السؤال بوضوح هنا..."}
                value={editingQuestion.question_text || ''}
                onChange={(e) => setEditingQuestion({ ...editingQuestion, question_text: e.target.value })}
                className="w-full p-3 border border-slate-300 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-indigo-500 leading-relaxed"
              />
            </div>

            {/* Options List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-700 block">خيارات السؤال (حدد الإجابة النموذجية):</label>
                {(editingQuestion.options || []).length < 6 && (
                  <button
                    type="button"
                    onClick={() => setEditingQuestion({
                      ...editingQuestion,
                      options: [...(editingQuestion.options || []), '']
                    })}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} /> إضافة خيار
                  </button>
                )}
              </div>

              {(editingQuestion.options || []).map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingQuestion({ ...editingQuestion, correct_answer: opt })}
                    className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 border transition-all cursor-pointer ${
                      editingQuestion.correct_answer === opt && opt.trim() !== ''
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                    title="انقر لتحديد هذا الخيار كإجابة نموذجية"
                  >
                    <Check size={14} />
                    <span>{editingQuestion.correct_answer === opt && opt.trim() !== '' ? 'إجابة نموذجية' : `خيار ${idx + 1}`}</span>
                  </button>

                  <input
                    type="text"
                    placeholder={`نص الخيار ${idx + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...(editingQuestion.options || [])];
                      const prevVal = newOpts[idx];
                      newOpts[idx] = e.target.value;
                      
                      let newCorrect = editingQuestion.correct_answer;
                      if (newCorrect === prevVal) {
                        newCorrect = e.target.value;
                      }

                      setEditingQuestion({
                        ...editingQuestion,
                        options: newOpts,
                        correct_answer: newCorrect
                      });
                    }}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500"
                  />

                  {(editingQuestion.options || []).length > 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        const removed = (editingQuestion.options || [])[idx];
                        const nextOpts = (editingQuestion.options || []).filter((_, i) => i !== idx);
                        setEditingQuestion({
                          ...editingQuestion,
                          options: nextOpts,
                          correct_answer: editingQuestion.correct_answer === removed ? '' : editingQuestion.correct_answer
                        });
                      }}
                      className="p-2 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-sm cursor-pointer"
              >
                <Save size={16} />
                <span>{isSaving ? 'جاري الحفظ...' : 'حفظ السؤال'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
