import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useSmartExam, Question } from '../hooks/useSmartExam';
import { BulkModelExporter } from './BulkModelExporter';
import { 
  BookOpen, 
  Settings, 
  HelpCircle, 
  CheckCircle2, 
  ArrowRight, 
  Loader2, 
  Sparkles, 
  AlertCircle,
  Award,
  FileText
} from 'lucide-react';

export const ExamModelsDashboard: React.FC = () => {
  const [stages, setStages] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);

  // Form selections
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [questionsCount, setQuestionsCount] = useState<number>(10);

  // Smart exam hook
  const { questions, loading: isLoadingSimulation, error: simulationError, startExam, clearCurrentExam } = useSmartExam();

  useEffect(() => {
    const loadMetadata = async () => {
      setIsLoadingMeta(true);
      try {
        // First try fetching from questions table
        const { data: qData, error: qErr } = await supabase
          .from('questions')
          .select('stage_name, subject_name');
        
        if (qData && qData.length > 0) {
          const uniqueStages = Array.from(new Set(qData.map((q: any) => q.stage_name).filter(Boolean))) as string[];
          const uniqueSubjects = Array.from(new Set(qData.map((q: any) => q.subject_name).filter(Boolean))) as string[];
          
          setStages(uniqueStages.sort());
          setSubjects(uniqueSubjects.sort());

          if (uniqueStages.length > 0) setSelectedStage(uniqueStages[0]);
          if (uniqueSubjects.length > 0) setSelectedSubject(uniqueSubjects[0]);
        } else {
          // Fallback to stage_competitions
          const { data: scData } = await supabase
            .from('stage_competitions')
            .select('stage_name, allowed_competitions');
          
          if (scData && scData.length > 0) {
            const uniqueStages = Array.from(new Set(scData.map((s: any) => s.stage_name).filter(Boolean))) as string[];
            const uniqueSubjects = Array.from(new Set(scData.flatMap((s: any) => s.allowed_competitions || []).filter(Boolean))) as string[];
            
            setStages(uniqueStages.sort());
            setSubjects(uniqueSubjects.sort());

            if (uniqueStages.length > 0) setSelectedStage(uniqueStages[0]);
            if (uniqueSubjects.length > 0) setSelectedSubject(uniqueSubjects[0]);
          } else {
            // Static fallbacks
            const defaultStages = ['ابتدائي', 'اعدادي', 'ثانوي', 'جامعيين', 'خدام'];
            const defaultSubjects = ['دراسي', 'طقس', 'عقيدة', 'ألحان'];
            setStages(defaultStages);
            setSubjects(defaultSubjects);
            setSelectedStage(defaultStages[0]);
            setSelectedSubject(defaultSubjects[0]);
          }
        }
      } catch (err) {
        console.error("Error loading exam metadata:", err);
        const defaultStages = ['ابتدائي', 'اعدادي', 'ثانوي', 'جامعيين', 'خدام'];
        const defaultSubjects = ['دراسي', 'طقس', 'عقيدة', 'ألحان'];
        setStages(defaultStages);
        setSubjects(defaultSubjects);
        setSelectedStage(defaultStages[0]);
        setSelectedSubject(defaultSubjects[0]);
      } finally {
        setIsLoadingMeta(false);
      }
    };
    
    loadMetadata();
  }, []);

  const handleStartSimulation = async () => {
    if (!selectedStage) {
      alert('الرجاء اختيار المرحلة أولاً.');
      return;
    }
    if (!selectedSubject) {
      alert('الرجاء اختيار المسابقة أولاً.');
      return;
    }
    
    try {
      await startExam(selectedStage, selectedSubject, questionsCount);
    } catch (err) {
      // Error handled by hook state
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'easy':
      case 'سهل':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'medium':
      case 'متوسط':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'hard':
      case 'صعب':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const getDifficultyLabel = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'easy':
      case 'سهل':
        return 'سهل';
      case 'medium':
      case 'متوسط':
        return 'متوسط';
      case 'hard':
      case 'صعب':
        return 'صعب';
      default:
        return level;
    }
  };

  // Render Simulation Questions Preview
  if (questions && questions.length > 0) {
    return (
      <div className="space-y-6 font-arabic" dir="rtl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div>
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Sparkles className="text-amber-500 animate-pulse" size={20} />
              معاينة سحب الامتحان الذكي (أونلاين)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              المرحلة: <span className="font-extrabold text-slate-700">{selectedStage}</span> |{' '}
              المادة: <span className="font-extrabold text-slate-700">{selectedSubject}</span> |{' '}
              عدد الأسئلة: <span className="font-extrabold text-indigo-600">{questions.length} سؤال</span>
            </p>
          </div>
          <button
            onClick={clearCurrentExam}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all cursor-pointer"
          >
            <ArrowRight size={14} />
            العودة للوحة التحكم والخيارات
          </button>
        </div>

        {/* Interactive Questions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {questions.map((q, idx) => {
            let optionsArray: string[] = [];
            if (Array.isArray(q.options)) {
              optionsArray = q.options;
            } else if (typeof q.options === 'object' && q.options !== null) {
              optionsArray = Object.values(q.options);
            }

            return (
              <div 
                key={q.id || idx}
                className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:border-indigo-100 transition-colors relative overflow-hidden"
              >
                {/* Difficulty Badge */}
                <div className="absolute top-4 left-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${getDifficultyColor(q.difficulty_level)}`}>
                    {getDifficultyLabel(q.difficulty_level)}
                  </span>
                </div>

                <div>
                  <div className="flex items-start gap-2.5 mb-4">
                    <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <h4 className="text-sm font-extrabold text-slate-800 leading-relaxed pr-12">
                      {q.question_text}
                    </h4>
                  </div>

                  {/* Options List */}
                  <div className="space-y-2 mt-2">
                    {optionsArray.map((opt, oIdx) => {
                      const optionLetter = String.fromCharCode(65 + oIdx);
                      const isCorrect = opt === q.correct_answer;
                      
                      return (
                        <div 
                          key={oIdx}
                          className={`p-3 rounded-xl text-xs font-bold border transition-colors flex items-center justify-between ${
                            isCorrect 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-extrabold' 
                              : 'bg-slate-50/50 border-slate-100 text-slate-600'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center border ${
                              isCorrect 
                                ? 'bg-emerald-500 text-white border-emerald-600' 
                                : 'bg-white text-slate-400 border-slate-200'
                            }`}>
                              {optionLetter}
                            </span>
                            <span>{opt}</span>
                          </div>
                          {isCorrect && (
                            <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Additional Metadata Footer */}
                <div className="border-t border-slate-50 mt-5 pt-3 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                  <span>مرات استخدام السؤال: {q.usage_count || 0}</span>
                  <span>معرف السؤال: {q.id}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-arabic" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 p-8 rounded-3xl text-white relative overflow-hidden shadow-md">
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-12 translate-y-12">
          <BookOpen size={240} />
        </div>
        <div className="relative z-10 max-w-2xl">
          <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
           إنشاء نماذج الامتحانات   
          </span>
          <h2 className="text-2xl font-black mt-3 text-white">إعدادات نماذج امتحانات المهرجان</h2>
          <p className="text-xs text-indigo-200/80 leading-relaxed mt-2">
            يتيح لك هذا القسم إعداد نماذج الامتحانات وتحميل 10 نماذج مختلفة تمامًا بضغطة زر واحدة داخل ملف Word منسق للطباعة لتسهيل الامتحانات الورقية.
          </p>
        </div>
      </div>

      {/* Main Controls Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-1.5">
          <Settings className="text-indigo-600" size={16} />
          تحديد معايير وتصنيف سحب الأسئلة
        </h3>

        {isLoadingMeta ? (
          <div className="flex items-center justify-center py-8 gap-2">
            <Loader2 className="animate-spin text-indigo-600" size={20} />
            <span className="text-xs text-slate-500 font-bold">جاري تحميل الفئات ومواضيع الاختبار...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Stage Selector */}
            <div>
              <label className="block text-xs font-black text-slate-500 mb-2">المرحلة</label>
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 shadow-sm cursor-pointer"
              >
                {stages.map((stage) => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>
            </div>

            {/* Subject Selector */}
            <div>
              <label className="block text-xs font-black text-slate-500 mb-2">  المسابقة </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 shadow-sm cursor-pointer"
              >
                {subjects.map((subj) => (
                  <option key={subj} value={subj}>{subj}</option>
                ))}
              </select>
            </div>

            {/* Questions Count Input */}
            <div>
              <label className="block text-xs font-black text-slate-500 mb-2">عدد الأسئلة للنموذج</label>
              <input
                type="number"
                min={1}
                max={100}
                value={questionsCount}
                onChange={(e) => setQuestionsCount(Math.max(1, parseInt(e.target.value) || 10))}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 shadow-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Side-by-Side Mode Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Card: Online Simulation Mode */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition-colors">
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 shadow-sm">
              <Sparkles size={20} />
            </div>
            <h3 className="text-sm font-black text-slate-800 mb-2">وضع المعاينة والمحاكاة التفاعلية (أونلاين)</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              اسحب عينة عشوائية ذكية من الأسئلة بناءً على معدلات الاستخدام الحالية وتوزيع الصعوبة لتجربة شكل الامتحان بشكل تفاعلي أمامك على الشاشة ومعاينة الإجابات النموذجية.
            </p>
          </div>

          {simulationError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl flex items-start gap-1.5">
              <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
              <div className="leading-relaxed font-semibold">{simulationError}</div>
            </div>
          )}

          <button
            onClick={handleStartSimulation}
            disabled={isLoadingSimulation || isLoadingMeta}
            className={`w-full py-3 px-4 rounded-xl font-bold text-xs transition-all text-white flex items-center justify-center gap-2 shadow-sm ${
              isLoadingSimulation 
                ? 'bg-slate-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] cursor-pointer'
            }`}
          >
            {isLoadingSimulation ? (
              <>
                <Loader2 className="animate-spin" size={14} />
                جاري سحب الأسئلة...
              </>
            ) : (
              <>
                <Award size={14} />
                سحب ومعاينة الامتحان التفاعلي
              </>
            )}
          </button>
        </div>

        {/* Right Card: Bulk Model Exporter */}
        <div className="flex">
          <BulkModelExporter 
            stage={selectedStage}
            subject={selectedSubject}
            questionsPerModel={questionsCount}
          />
        </div>
      </div>
    </div>
  );
};
