import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  Users, Award, TrendingUp, Filter, RefreshCw, 
  Building2, GraduationCap, Trophy, AlertTriangle, CheckCircle2, Loader2, BarChart2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { motion } from 'motion/react';

interface SubmissionRecord {
  id: string;
  student_id?: string;
  studentName?: string;
  churchName?: string;
  stage?: string;
  score?: number;
  total_max_score?: number;
  derasy_score?: number | null;
  mahfouzat_score?: number | null;
  qebty_lvl1_score?: number | null;
  qebty_lvl2_score?: number | null;
  academicScore?: number | null;
  memorizationScore?: number | null;
  copticL1Score?: number | null;
  copticL2Score?: number | null;
  is_published?: boolean;
  competition_type?: string;
  data?: Record<string, any>;
}

export const QualificationGapAnalysisChart: React.FC = () => {
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [minThreshold, setMinThreshold] = useState<number>(90);
  const [stageThresholds, setStageThresholds] = useState<Record<string, number>>({});
  const [weightsMap, setWeightsMap] = useState<Record<string, Record<string, number>>>({});

  // Filter state
  const [selectedChurch, setSelectedChurch] = useState<string>('الكل');
  const [selectedStage, setSelectedStage] = useState<string>('الكل');
  const [selectedCompetition, setSelectedCompetition] = useState<string>('الكل');
  const [groupBy, setGroupBy] = useState<'church' | 'stage'>('church');

  // Competitions options
  const competitionOptions = [
    { id: 'الكل', label: 'الكل (جميع المسابقات)' },
    { id: 'دراسي', label: 'دراسي (المسابقة الدراسية)' },
    { id: 'محفوظات', label: 'محفوظات (العقيدة والألحان)' },
    { id: 'قبطي مستوى أول', label: 'قبطي مستوى أول' },
    { id: 'قبطي مستوى ثان', label: 'قبطي مستوى ثان' }
  ];

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch honors settings and submissions concurrently
      const [honorsSnap, submissionsSnap] = await Promise.all([
        supabase.from('honors_settings').select('*').eq('id', 'current_config').maybeSingle(),
        supabase.from('exam_submissions').select('*')
      ]);

      if (honorsSnap.data) {
        const d = honorsSnap.data;
        if (d.min_threshold !== undefined) setMinThreshold(Number(d.min_threshold));
        if (d.stage_thresholds && typeof d.stage_thresholds === 'object') {
          setStageThresholds(d.stage_thresholds);
        }
        if (d.weights_matrix && typeof d.weights_matrix === 'object') {
          const w = { ...d.weights_matrix };
          if (w.__stage_thresholds__) {
            setStageThresholds(prev => ({ ...prev, ...w.__stage_thresholds__ }));
            delete w.__stage_thresholds__;
          }
          if (w.__stage_fees__) {
            delete w.__stage_fees__;
          }
          setWeightsMap(w);
        }
      }

      const fetchedSubs = submissionsSnap.data || [];
      setSubmissions(fetchedSubs);

      // Cache locally as fallback
      if (fetchedSubs.length > 0) {
        localStorage.setItem('cached_gap_analysis_submissions', JSON.stringify(fetchedSubs));
      }
    } catch (err) {
      console.warn('Error fetching data for gap analysis chart, checking cache:', err);
      try {
        const cached = localStorage.getItem('cached_gap_analysis_submissions');
        if (cached) {
          setSubmissions(JSON.parse(cached));
        }
      } catch (e) {
        console.error('Failed reading cached submissions:', e);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Extract unique churches and stages for dropdowns
  const availableChurches = useMemo(() => {
    const set = new Set<string>();
    submissions.forEach(sub => {
      const c = (sub.churchName || sub.data?.['الكنيسة'] || '').trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [submissions]);

  const availableStages = useMemo(() => {
    const set = new Set<string>();
    submissions.forEach(sub => {
      const s = (sub.stage || sub.data?.['المرحلة'] || '').trim();
      if (s) set.add(s);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [submissions]);

  // Adjust default group-by when church selection changes
  useEffect(() => {
    if (selectedChurch !== 'الكل') {
      setGroupBy('stage');
    } else {
      setGroupBy('church');
    }
  }, [selectedChurch]);

  // Helper to get score of a specific competition for a submission
  const getSubjectScore = (sub: SubmissionRecord, competitionKey: string): number | null => {
    let raw: any = null;
    if (competitionKey === 'دراسي') {
      raw = sub.derasy_score ?? sub.academicScore ?? sub.data?.['دراسي'] ?? sub.data?.['المسابقة الدراسية'];
    } else if (competitionKey === 'محفوظات') {
      raw = sub.mahfouzat_score ?? sub.memorizationScore ?? sub.data?.['محفوظات'];
    } else if (competitionKey === 'قبطي مستوى أول') {
      raw = sub.qebty_lvl1_score ?? sub.copticL1Score ?? sub.data?.['قبطي مستوى أول'] ?? sub.data?.['قبطي 1'];
    } else if (competitionKey === 'قبطي مستوى ثان' || competitionKey === 'قبطي مستوى ثاني') {
      raw = sub.qebty_lvl2_score ?? sub.copticL2Score ?? sub.data?.['قبطي مستوى ثاني'] ?? sub.data?.['قبطي مستوى ثان'] ?? sub.data?.['قبطي 2'];
    }
    if (raw !== null && raw !== undefined && raw !== '') {
      const val = parseFloat(raw);
      if (!isNaN(val)) return val;
    }
    return null;
  };

  // Helper to check if submission took a specific competition
  const tookCompetition = (sub: SubmissionRecord, compKey: string): boolean => {
    if (compKey === 'الكل') return true;
    const score = getSubjectScore(sub, compKey);
    if (score !== null) return true;
    
    // Check if sub.competition_type explicitly matches
    const cType = (sub.competition_type || sub.data?.['المسابقة'] || '').trim();
    if (cType && (cType === compKey || cType.includes(compKey))) return true;

    return false;
  };

  // Helper to compute percentage for a submission given active competition filter
  const computePercentage = (sub: SubmissionRecord, stageName: string, compKey: string): number => {
    const stageWeights = weightsMap[stageName] || {};

    if (compKey !== 'الكل') {
      const score = getSubjectScore(sub, compKey);
      if (score !== null) {
        const maxScore = Number(stageWeights[compKey]) || 100;
        return (score / maxScore) * 100;
      }
      return 0;
    }

    // If 'الكل': check maximum percentage across all subjects
    let maxPerc = 0;
    const subjects = ['دراسي', 'محفوظات', 'قبطي مستوى أول', 'قبطي مستوى ثاني'];
    subjects.forEach(subj => {
      const score = getSubjectScore(sub, subj);
      if (score !== null) {
        const maxScore = Number(stageWeights[subj]) || 100;
        const perc = (score / maxScore) * 100;
        if (perc > maxPerc) maxPerc = perc;
      }
    });

    if (maxPerc === 0 && sub.score !== undefined && sub.total_max_score && sub.total_max_score > 0) {
      maxPerc = (sub.score / sub.total_max_score) * 100;
    }

    return maxPerc;
  };

  // Process and compute chart data & KPI metrics
  const { chartData, totalExaminees, totalQualified, totalGap, passRate } = useMemo(() => {
    // Group map: key -> { totalExamineesSet: Set<studentId>, qualifiedSet: Set<studentId> }
    const groupMap: Record<string, { totalSet: Set<string>; qualifiedSet: Set<string> }> = {};

    let globalExamineesSet = new Set<string>();
    let globalQualifiedSet = new Set<string>();

    submissions.forEach((sub, idx) => {
      const church = (sub.churchName || sub.data?.['الكنيسة'] || 'غير محدد').trim();
      const stage = (sub.stage || sub.data?.['المرحلة'] || 'غير محدد').trim();

      // Filter by Church
      if (selectedChurch !== 'الكل' && church !== selectedChurch) return;

      // Filter by Stage
      if (selectedStage !== 'الكل' && stage !== selectedStage) return;

      // Filter by Competition
      if (!tookCompetition(sub, selectedCompetition)) return;

      // Identify unique student
      const studentId = sub.student_id || sub.id || `${church}_${stage}_${sub.studentName || idx}`;
      const threshold = stageThresholds[stage] !== undefined ? Number(stageThresholds[stage]) : minThreshold;

      const perc = computePercentage(sub, stage, selectedCompetition);
      const isQualified = perc >= threshold;

      // Determine group key
      const groupKey = groupBy === 'church' ? (church || 'غير محدد') : (stage || 'غير محدد');

      if (!groupMap[groupKey]) {
        groupMap[groupKey] = { totalSet: new Set(), qualifiedSet: new Set() };
      }

      groupMap[groupKey].totalSet.add(studentId);
      globalExamineesSet.add(studentId);

      if (isQualified) {
        groupMap[groupKey].qualifiedSet.add(studentId);
        globalQualifiedSet.add(studentId);
      }
    });

    // Convert groupMap to Chart Array
    const rows = Object.keys(groupMap).map(key => {
      const examineesCount = groupMap[key].totalSet.size;
      const qualifiedCount = groupMap[key].qualifiedSet.size;
      const gapValue = Math.max(0, examineesCount - qualifiedCount);
      const rate = examineesCount > 0 ? parseFloat(((qualifiedCount / examineesCount) * 100).toFixed(1)) : 0;

      return {
        name: key,
        'إجمالي الممتحنين': examineesCount,
        'إجمالي المصعدين': qualifiedCount,
        'الفجوة': gapValue,
        passRate: rate
      };
    });

    // Sort rows by total examinees descending
    rows.sort((a, b) => b['إجمالي الممتحنين'] - a['إجمالي الممتحنين']);

    const totalEx = globalExamineesSet.size;
    const totalQual = globalQualifiedSet.size;
    const gap = Math.max(0, totalEx - totalQual);
    const overallRate = totalEx > 0 ? parseFloat(((totalQual / totalEx) * 100).toFixed(1)) : 0;

    return {
      chartData: rows,
      totalExaminees: totalEx,
      totalQualified: totalQual,
      totalGap: gap,
      passRate: overallRate
    };
  }, [submissions, selectedChurch, selectedStage, selectedCompetition, groupBy, stageThresholds, minThreshold, weightsMap]);

  // Custom Tooltip component for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const examinees = data['إجمالي الممتحنين'];
      const qualified = data['إجمالي المصعدين'];
      const gap = data['الفجوة'];
      const rate = data.passRate;

      return (
        <div className="bg-slate-900/95 text-white p-4 rounded-2xl shadow-xl border border-slate-700/50 backdrop-blur-md font-arabic dir-rtl min-w-[220px]">
          <p className="text-sm font-black text-amber-400 pb-2 mb-2 border-b border-slate-700/80 flex items-center gap-1.5">
            <Building2 size={16} className="text-amber-400" />
            {label}
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-200">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                إجمالي الممتحنين:
              </span>
              <span className="font-black text-blue-300 text-sm">{examinees} طالب</span>
            </div>
            <div className="flex justify-between items-center text-slate-200">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                إجمالي المصعدين:
              </span>
              <span className="font-black text-emerald-400 text-sm">{qualified} طالب</span>
            </div>
            <div className="flex justify-between items-center text-amber-300 bg-amber-950/40 px-2 py-1 rounded-lg">
              <span>نسبة التأهل:</span>
              <span className="font-black text-sm">{rate}%</span>
            </div>
            <div className="flex justify-between items-center text-rose-300 bg-rose-950/40 px-2 py-1 rounded-lg mt-1">
              <span className="flex items-center gap-1">
                <AlertTriangle size={13} className="text-rose-400" />
                الفجوة (غير المصعدين):
              </span>
              <span className="font-black text-sm">{gap} طالب</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 w-full font-arabic dir-rtl"
    >
      {/* Header & Refresh */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <BarChart2 size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                تحليل الفجوة بين الممتحنين والمصعدين
              </h3>
              <p className="text-xs text-slate-500 font-bold mt-0.5">
                مقارنة تفاعلية حية بين إجمالي الطلاب أداءً للامتحانات والناجحين المتأهلين للتصفيات النهائيـة
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* Grouping Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
            <button
              onClick={() => setGroupBy('church')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                groupBy === 'church' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building2 size={13} /> حسب الكنيسة
            </button>
            <button
              onClick={() => setGroupBy('stage')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                groupBy === 'stage' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <GraduationCap size={13} /> حسب المرحلة
            </button>
          </div>

          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition border border-slate-200"
            title="تحديث البيانات"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin text-indigo-600' : ''} />
          </button>
        </div>
      </div>

      {/* Control & Filter Panel */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Church Filter */}
        <div>
          <label className="text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Building2 size={14} className="text-indigo-600" />
            الكنيسة:
          </label>
          <select
            value={selectedChurch}
            onChange={(e) => setSelectedChurch(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
          >
            <option value="الكل">الكل (جميع الكنائس)</option>
            {availableChurches.map(ch => (
              <option key={ch} value={ch}>{ch}</option>
            ))}
          </select>
        </div>

        {/* Stage Filter */}
        <div>
          <label className="text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
            <GraduationCap size={14} className="text-blue-600" />
            المرحلة الدراسية:
          </label>
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
          >
            <option value="الكل">الكل (جميع المراحل)</option>
            {availableStages.map(stg => (
              <option key={stg} value={stg}>{stg}</option>
            ))}
          </select>
        </div>

        {/* Competition Filter */}
        <div>
          <label className="text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Trophy size={14} className="text-amber-600" />
            نوع المسابقة:
          </label>
          <select
            value={selectedCompetition}
            onChange={(e) => setSelectedCompetition(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
          >
            {competitionOptions.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Total Examinees */}
        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200/60 shadow-2xs">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-black text-blue-800">إجمالي الممتحنين</span>
            <div className="p-1.5 bg-blue-500 text-white rounded-lg">
              <Users size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-950">
            {totalExaminees.toLocaleString('ar-EG')}
            <span className="text-xs font-bold text-blue-700 mr-1">طالب</span>
          </p>
          <p className="text-[10px] text-blue-600 font-bold mt-1">الذين أتموا الامتحانات</p>
        </div>

        {/* KPI 2: Total Qualified */}
        <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200/60 shadow-2xs">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-black text-emerald-800">إجمالي المصعدين</span>
            <div className="p-1.5 bg-emerald-600 text-white rounded-lg">
              <Award size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-950">
            {totalQualified.toLocaleString('ar-EG')}
            <span className="text-xs font-bold text-emerald-700 mr-1">طالب</span>
          </p>
          <p className="text-[10px] text-emerald-600 font-bold mt-1">حقوق التأهل وفق الشروط</p>
        </div>

        {/* KPI 3: Total Gap */}
        <div className="p-4 bg-gradient-to-br from-rose-50 to-amber-50 rounded-2xl border border-rose-200/60 shadow-2xs">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-black text-rose-800">حجم الفجوة (غير المصعدين)</span>
            <div className="p-1.5 bg-rose-500 text-white rounded-lg">
              <AlertTriangle size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-950">
            {totalGap.toLocaleString('ar-EG')}
            <span className="text-xs font-bold text-rose-700 mr-1">طالب</span>
          </p>
          <p className="text-[10px] text-rose-600 font-bold mt-1">فرق الدرجات دون حد التأهل</p>
        </div>

        {/* KPI 4: Pass & Qualification Rate */}
        <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border border-purple-200/60 shadow-2xs">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-black text-purple-800">النسبة العامة للتأهل</span>
            <div className="p-1.5 bg-purple-600 text-white rounded-lg">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-purple-950">
            %{passRate.toLocaleString('ar-EG')}
          </p>
          <p className="text-[10px] text-purple-600 font-bold mt-1">معدل اجتياز التصفيات</p>
        </div>
      </div>

      {/* Main Bar Chart Section */}
      <div className="pt-2">
        {isLoading ? (
          <div className="h-72 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 size={32} className="animate-spin text-indigo-600" />
            <p className="text-xs font-bold">جاري تحميل وحساب بيانات الفجوة...</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-slate-400 gap-2 border-2 border-dashed border-slate-200 rounded-2xl">
            <AlertTriangle size={32} className="text-slate-300" />
            <p className="text-sm font-bold text-slate-600">لا توجد بيانات ممتحنين تطابق الفلاتر المحددة</p>
            <p className="text-xs text-slate-400">جرب تغيير الكنيسة، المرحلة أو المسابقة من القائمة أعلاه</p>
          </div>
        ) : (
          <div className="h-80 sm:h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 10, left: 10, bottom: 65 }}
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#475569', fontSize: 11, fontWeight: 'bold' }} 
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  wrapperStyle={{ fontFamily: 'Tajawal', fontWeight: 'bold', fontSize: '12px', paddingBottom: '10px' }} 
                />
                <Bar 
                  dataKey="إجمالي الممتحنين" 
                  name="إجمالي الممتحنين" 
                  fill="#3b82f6" 
                  radius={[6, 6, 0, 0]} 
                  maxBarSize={40}
                />
                <Bar 
                  dataKey="إجمالي المصعدين" 
                  name="إجمالي المصعدين" 
                  fill="#10b981" 
                  radius={[6, 6, 0, 0]} 
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Footer Notes */}
      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[11px] text-slate-500 font-bold">
        <div className="flex items-center gap-1.5 text-slate-600">
          <CheckCircle2 size={14} className="text-emerald-600" />
          <span>يتم تطبيق شروط ونسب التأهل المحددة تلقائياً في محرك الكنترول المركزي</span>
        </div>
        <div>
          <span>عدد الجهات المعروضة: {chartData.length}</span>
        </div>
      </div>
    </motion.div>
  );
};
