import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Receipt, Download, Loader2, Award, CheckCircle2, RefreshCw, FileText, Sparkles, Building2, Calendar, DollarSign } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { withStylesCleaned } from '../utils/oklchCleaner';

interface ChurchQualificationFeesCardProps {
  churchName: string;
  refreshTrigger?: number;
}

interface StageBreakdownItem {
  stage: string;
  qualifiedCount: number;
  feePerStudent: number;
  subtotal: number;
  students: Array<{ id: string; name: string; percentage: number }>;
}

// Helper to normalize Arabic characters to prevent mismatch in churches and stages
const normalizeArabic = (str: any): string => {
  if (str === undefined || str === null) return '';
  return String(str)
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, '') // Remove tashkeel/harakat
    .replace(/ـ+/g, '') // Remove tatweel
    .replace(/[أإآ]/g, 'ا') // Normalize alefs
    .replace(/ة/g, 'ه') // Normalize taa marbuta
    .replace(/ى/g, 'ي') // Normalize alif maqsura
    .replace(/[^\u0600-\u06FFa-zA-Z0-9]/g, ' ') // Replace non-alphanumeric punctuation with space
    .replace(/\s+/g, ' ') // Collapse spaces
    .trim()
    .toLowerCase();
};

const stripChurchPrefix = (name: string): string => {
  return normalizeArabic(name)
    .replace(/^(كنيسه|كنسيه|مقر|دير|قطاع)\s+/, '')
    .trim();
};

export const ChurchQualificationFeesCard: React.FC<ChurchQualificationFeesCardProps> = ({
  churchName,
  refreshTrigger = 0
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [stageFees, setStageFees] = useState<Record<string, number>>({});
  const [stageThresholds, setStageThresholds] = useState<Record<string, number>>({});
  const [minThreshold, setMinThreshold] = useState<number>(90);
  const [breakdown, setBreakdown] = useState<StageBreakdownItem[]>([]);
  const [totalAmountRequired, setTotalAmountRequired] = useState<number>(0);
  const [totalQualifiedCount, setTotalQualifiedCount] = useState<number>(0);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFeesAndSubmissions();
  }, [churchName, refreshTrigger]);

  const fetchFeesAndSubmissions = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch honors settings (config, thresholds, weights, fees), stages, and submissions
      const [honorsSnap, sysFeesSnap, submissionsSnap, stagesSnap] = await Promise.all([
        supabase.from('honors_settings').select('*').eq('id', 'current_config').maybeSingle(),
        supabase.from('system_settings').select('*').eq('id', 'stage_fees').maybeSingle(),
        supabase.from('exam_submissions').select('*'),
        supabase.from('stage_competitions').select('stage_name')
      ]);

      let feesMap: Record<string, number> = {};
      let threshMap: Record<string, number> = {};
      let globalMin = 90;
      let weightsMap: Record<string, Record<string, number>> = {};

      if (honorsSnap.data) {
        const d = honorsSnap.data;
        if (d.min_threshold !== undefined) globalMin = Number(d.min_threshold);
        if (d.stage_thresholds && typeof d.stage_thresholds === 'object') threshMap = d.stage_thresholds;
        if (d.stage_fees && typeof d.stage_fees === 'object') feesMap = d.stage_fees;
        
        if (d.weights_matrix && typeof d.weights_matrix === 'object') {
          weightsMap = d.weights_matrix;
          if (d.weights_matrix.__stage_thresholds__) threshMap = { ...threshMap, ...d.weights_matrix.__stage_thresholds__ };
          if (d.weights_matrix.__stage_fees__) feesMap = { ...feesMap, ...d.weights_matrix.__stage_fees__ };
        }
      }

      if (sysFeesSnap.data && sysFeesSnap.data.config_data && typeof sysFeesSnap.data.config_data === 'object') {
        feesMap = { ...feesMap, ...sysFeesSnap.data.config_data };
      }

      setStageFees(feesMap);
      setStageThresholds(threshMap);
      setMinThreshold(globalMin);

      // System stages
      const systemStages = Array.from(
        new Set((stagesSnap.data || []).map((s: any) => (s.stage_name || '').trim()).filter(Boolean))
      );

      // Canonical match helper for Stages
      const findCanonicalStage = (rawStage: string): string => {
        if (!rawStage || !rawStage.trim()) return 'عام';
        const normRaw = normalizeArabic(rawStage);

        for (const stage of systemStages) {
          if (normalizeArabic(stage) === normRaw) return stage;
        }

        for (const stage of systemStages) {
          const normStage = normalizeArabic(stage);
          if (normStage.includes(normRaw) || normRaw.includes(normStage)) return stage;
        }

        return rawStage.trim();
      };

      // Safe Stage Fee lookup with fallback
      const getStageFee = (stageName: string): number => {
        const normStage = normalizeArabic(stageName);
        const feeKey = Object.keys(feesMap || {}).find(k => normalizeArabic(k) === normStage);
        if (feeKey !== undefined && !isNaN(Number(feesMap[feeKey])) && Number(feesMap[feeKey]) >= 0) {
          return Number(feesMap[feeKey]);
        }
        if (feesMap['default'] !== undefined && !isNaN(Number(feesMap['default'])) && Number(feesMap['default']) >= 0) {
          return Number(feesMap['default']);
        }
        return 50; // Standard fallback rate (50 EGP)
      };

      // Stage Threshold lookup
      const getStageThreshold = (stageName: string): number => {
        const normStage = normalizeArabic(stageName);
        const threshKey = Object.keys(threshMap || {}).find(k => normalizeArabic(k) === normStage);
        if (threshKey !== undefined && !isNaN(Number(threshMap[threshKey])) && Number(threshMap[threshKey]) > 0) {
          return Number(threshMap[threshKey]);
        }
        return globalMin || 90;
      };

      // Stage Weights and Subject Max Score lookup
      const getStageWeights = (stageName: string): Record<string, number> => {
        const normStage = normalizeArabic(stageName);
        const key = Object.keys(weightsMap || {}).find(k => normalizeArabic(k) === normStage);
        return key ? weightsMap[key] : {};
      };

      const getSubjectMaxScore = (subjectName: string, stWeights: Record<string, number>): number => {
        const normSubj = normalizeArabic(subjectName);
        const key = Object.keys(stWeights || {}).find(k => normalizeArabic(k) === normSubj);
        if (key && Number(stWeights[key]) > 0) {
          return Number(stWeights[key]);
        }
        return 100;
      };

      // 2. Filter submissions for current logged in church with normalized matching
      const allSubmissions = submissionsSnap.data || [];
      const targetNormChurch = normalizeArabic(churchName || '');
      const targetStrippedChurch = stripChurchPrefix(churchName || '');

      const isMatchingChurch = (subChurchName: string) => {
        if (!targetNormChurch) return true;
        if (!subChurchName) return false;
        const normSub = normalizeArabic(subChurchName);
        const strippedSub = stripChurchPrefix(subChurchName);
        if (normSub === targetNormChurch || strippedSub === targetStrippedChurch) return true;
        if (targetStrippedChurch && (normSub.includes(targetStrippedChurch) || strippedSub.includes(targetStrippedChurch))) return true;
        if (normSub.includes(targetNormChurch) || targetNormChurch.includes(normSub)) return true;
        return false;
      };

      const churchSubmissions = churchName 
        ? allSubmissions.filter((s: any) => {
            const rawChurch = s.churchName || s.church || s.data?.['الكنيسة'] || s.data?.['كنيسة'] || '';
            return isMatchingChurch(rawChurch);
          })
        : allSubmissions;

      // 3. Process qualified students grouped by stage
      const stageMap: Record<string, Map<string, { id: string; name: string; percentage: number }>> = {};

      churchSubmissions.forEach((sub: any) => {
        const rawStage = (sub.stage || sub.data?.['المرحلة'] || sub.grade || '').trim();
        const stage = findCanonicalStage(rawStage);

        const studentId = String(
          sub.student_id || 
          sub.studentCode || 
          sub.code || 
          sub.id || 
          `${sub.studentName || sub.name || 'طالب'}_${stage}`
        ).trim().toLowerCase();

        const studentName = (sub.studentName || sub.name || sub.fullName || sub.data?.['الاسم'] || 'غير مسمى').trim();

        const stWeights = getStageWeights(stage);
        const stThreshold = getStageThreshold(stage);

        // Calculate max percentage achieved by this submission across subjects
        let maxPerc = 0;

        // Core subjects
        const coreSubjects = ['دراسي', 'محفوظات', 'قبطي مستوى أول', 'قبطي مستوى ثاني'];
        coreSubjects.forEach(subj => {
          let score: any = null;
          if (subj === 'دراسي') score = sub.derasy_score ?? sub.academicScore ?? sub.data?.['دراسي'] ?? sub.data?.['دراسية'];
          else if (subj === 'محفوظات') score = sub.mahfouzat_score ?? sub.memorizationScore ?? sub.data?.['محفوظات'];
          else if (subj === 'قبطي مستوى أول') score = sub.qebty_lvl1_score ?? sub.copticL1Score ?? sub.data?.['قبطي مستوى أول'] ?? sub.data?.['قبطي 1'];
          else if (subj === 'قبطي مستوى ثاني') score = sub.qebty_lvl2_score ?? sub.copticL2Score ?? sub.data?.['قبطي مستوى ثاني'] ?? sub.data?.['قبطي 2'];
          
          if (score !== undefined && score !== null && score !== '') {
            const numScore = parseFloat(score);
            if (!isNaN(numScore) && numScore > 0) {
              const maxScore = getSubjectMaxScore(subj, stWeights);
              if (maxScore > 0) {
                const perc = (numScore / maxScore) * 100;
                if (perc > maxPerc) maxPerc = perc;
              }
            }
          }
        });

        // Dynamic subjects in sub.data
        if (sub.data && typeof sub.data === 'object') {
          Object.keys(sub.data).forEach(k => {
            const normKey = normalizeArabic(k);
            if (normKey === 'الكنيسه' || normKey === 'المرحله' || normKey === 'الاسم' || normKey === 'الكود') return;
            const val = sub.data[k];
            if (val !== undefined && val !== null && val !== '') {
              const numVal = parseFloat(val);
              if (!isNaN(numVal) && numVal > 0) {
                const maxScore = getSubjectMaxScore(k, stWeights);
                if (maxScore > 0) {
                  const perc = (numVal / maxScore) * 100;
                  if (perc > maxPerc) maxPerc = perc;
                }
              }
            }
          });
        }

        // Direct overall percentage / total scores
        if (sub.percentage !== undefined && sub.percentage !== null && !isNaN(Number(sub.percentage))) {
          const p = Number(sub.percentage);
          if (p > maxPerc) maxPerc = p;
        }

        if (sub.score !== undefined && sub.score !== null && sub.total_max_score && Number(sub.total_max_score) > 0) {
          const p = (Number(sub.score) / Number(sub.total_max_score)) * 100;
          if (p > maxPerc) maxPerc = p;
        }

        if (sub.actualScore !== undefined && sub.maxScore && Number(sub.maxScore) > 0) {
          const p = (Number(sub.actualScore) / Number(sub.maxScore)) * 100;
          if (p > maxPerc) maxPerc = p;
        }

        // Check if student qualifies according to threshold
        if (maxPerc >= stThreshold) {
          if (!stageMap[stage]) {
            stageMap[stage] = new Map();
          }
          // Store distinct student entry (deduplicate across subjects)
          const existing = stageMap[stage].get(studentId);
          if (!existing || maxPerc > existing.percentage) {
            stageMap[stage].set(studentId, { id: studentId, name: studentName, percentage: maxPerc });
          }
        }
      });

      // 4. Build final breakdown table
      const items: StageBreakdownItem[] = [];
      let grandTotal = 0;
      let grandCount = 0;

      Object.keys(stageMap).forEach(stage => {
        const studentList = Array.from(stageMap[stage].values());
        const count = studentList.length;
        if (count > 0) {
          const fee = getStageFee(stage);
          const subtotal = count * fee;

          grandTotal += subtotal;
          grandCount += count;

          items.push({
            stage,
            qualifiedCount: count,
            feePerStudent: fee,
            subtotal,
            students: studentList
          });
        }
      });

      // Sort items by stage name
      items.sort((a, b) => a.stage.localeCompare(b.stage, 'ar'));

      setBreakdown(items);
      setTotalAmountRequired(grandTotal);
      setTotalQualifiedCount(grandCount);

    } catch (err) {
      console.error('Error fetching qualification fees breakdown:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!invoiceRef.current) return;
    setIsExportingPdf(true);

    try {
      const element = invoiceRef.current;
      const opt = {
        margin: [8, 8, 8, 8],
        filename: `مطالبة_رسوم_التصفيات_${(churchName || 'الكنيسة').replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true, allowTaint: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      } as any;

      await withStylesCleaned(async () => {
        await html2pdf().set(opt).from(element).save();
      });
    } catch (err) {
      console.error('PDF export error:', err);
      alert('حدث خطأ أثناء تحميل ملف PDF. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 md:p-8 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner border border-emerald-100">
            <Receipt size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl md:text-2xl font-black text-slate-900">رسوم التصفيات النهائية</h3>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black rounded-full">
                اشتراك الأونلاين الصاعدين
              </span>
            </div>
            <p className="text-slate-500 font-bold text-xs md:text-sm mt-1">
              حساب المبالغ المستحقة لكنيسة <span className="text-emerald-700 font-black">{churchName || 'المحددة'}</span> بناءً على أعداد الطلاب الصاعدين
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchFeesAndSubmissions}
            disabled={isLoading}
            className="p-3 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-2xl transition border border-slate-200"
            title="تحديث البيانات"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin text-emerald-600' : ''} />
          </button>

          <button
            onClick={handleExportPDF}
            disabled={isLoading || isExportingPdf || breakdown.length === 0}
            className="px-5 py-3 bg-emerald-600 text-white rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-emerald-700 transition shadow-lg hover:shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            {isExportingPdf ? (
              <>
                <Loader2 size={18} className="animate-spin" /> جاري التحميل...
              </>
            ) : (
              <>
                <Download size={18} /> تحميل المبلغ المالي المستحق (PDF)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content View */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
          <Loader2 size={36} className="animate-spin text-emerald-600" />
          <p className="font-bold text-sm">جاري احتساب أعداد الصاعدين ورسوم الاشتراكات المقررة...</p>
        </div>
      ) : breakdown.length === 0 ? (
        <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <Award className="mx-auto text-slate-300 mb-3" size={44} />
          <p className="text-slate-800 font-black text-base">
            لا توجد نتائج صاعدين معلنة حاليًا لهذه الكنيسة
          </p>
          <p className="text-slate-500 font-bold text-xs mt-1">
            سيتم تحديث جدول الرسوم المالية تلقائياً فور اعتماد واعلان نتائج التصفيات النهائية من قبل اللجنة.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Breakdown Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-black text-xs md:text-sm">
                  <th className="p-4 border-b border-l border-slate-200">المرحلة الدراسية</th>
                  <th className="p-4 border-b border-l border-slate-200 text-center">عدد الصاعدين</th>
                  <th className="p-4 border-b border-l border-slate-200 text-center">رسم الاشتراك للفرد</th>
                  <th className="p-4 border-b border-slate-200 text-center">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {breakdown.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-black text-slate-800 text-sm border-l border-slate-100 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      {item.stage}
                    </td>
                    <td className="p-4 text-center font-bold text-slate-700 text-sm border-l border-slate-100">
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-xl font-black text-xs inline-block">
                        {item.qualifiedCount} صاعد
                      </span>
                    </td>
                    <td className="p-4 text-center font-bold text-slate-600 text-sm border-l border-slate-100">
                      {item.feePerStudent} ج.م
                    </td>
                    <td className="p-4 text-center font-black text-emerald-700 text-sm">
                      {item.subtotal.toLocaleString('ar-EG')} ج.م
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Highlight Grand Total Banner */}
          <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <Sparkles size={24} className="text-emerald-300" />
              </div>
              <div>
                <p className="text-emerald-200 text-xs font-bold">إجمالي المبلغ المستحق</p>
                <p className="text-xl md:text-2xl font-black mt-0.5">
                  كنيسة {churchName || 'المهرجان'} ({totalQualifiedCount} طالب صاعد)
                </p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 text-center md:text-left">
              <p className="text-emerald-200 text-[10px] font-bold uppercase tracking-wider">المبلغ الكلي المطلوب</p>
              <p className="text-2xl md:text-3xl font-black text-emerald-300">
                {totalAmountRequired.toLocaleString('ar-EG')} <span className="text-sm text-white font-bold">ج.م</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hidden PDF Printable Invoice Template */}
      <div className="hidden">
        <div 
          ref={invoiceRef}
          className="p-6 bg-white text-slate-900 font-sans"
          style={{ width: '194mm', boxSizing: 'border-box', pageBreakInside: 'avoid', breakInside: 'avoid' }}
          dir="rtl"
        >
          {/* Header */}
          <div className="border-b-2 border-emerald-600 pb-3 mb-4 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-black text-emerald-900 mb-0.5">المنطقة 18 - مهرجان الكرازة المرقسية</h1>
              <h2 className="text-sm font-bold text-slate-700">اشتراك أونلاين الأسقفية (التصفيات النهائية)</h2>
            </div>
            <div className="text-left bg-emerald-50 border border-emerald-200 py-1.5 px-3 rounded-xl">
              <p className="text-[11px] font-bold text-emerald-800">التاريخ: {new Date().toLocaleDateString('ar-EG')}</p>
              <p className="text-[10px] text-slate-500 font-bold mt-0.5">مهرجان الكرازة المركزية - المنطقة 18</p>
            </div>
          </div>

          {/* Metadata Box */}
          <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 text-center">
            <div>
              <p className="text-[10px] text-slate-500 font-bold">اسم الكنيسة</p>
              <p className="text-sm font-black text-slate-900 mt-0.5">{churchName || 'غير محدد'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold">إجمالي عدد الطلاب الصاعدين</p>
              <p className="text-sm font-black text-blue-700 mt-0.5">{totalQualifiedCount} طالب</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold">إجمالي المطالبة المالية</p>
              <p className="text-sm font-black text-emerald-700 mt-0.5">{totalAmountRequired.toLocaleString('ar-EG')} ج.م</p>
            </div>
          </div>

          {/* Itemized Table */}
          <table className="w-full text-right border-collapse mb-4 text-[11px]">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-black" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <th className="py-2 px-2.5 border border-slate-300 text-center min-w-[28px]">#</th>
                <th className="py-2 px-2.5 border border-slate-300">المرحلة الدراسية</th>
                <th className="py-2 px-2.5 border border-slate-300 text-center">عدد المشتركين الصاعدين</th>
                <th className="py-2 px-2.5 border border-slate-300 text-center">رسم الاشتراك للفرد</th>
                <th className="py-2 px-2.5 border border-slate-300 text-center">المبلغ المستحق</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((item, index) => (
                <tr key={index} className="border border-slate-200" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <td className="py-1.5 px-2.5 border border-slate-200 text-center font-bold">{index + 1}</td>
                  <td className="py-1.5 px-2.5 border border-slate-200 font-black text-slate-800">{item.stage}</td>
                  <td className="py-1.5 px-2.5 border border-slate-200 text-center font-bold text-blue-800">{item.qualifiedCount} صاعد</td>
                  <td className="py-1.5 px-2.5 border border-slate-200 text-center font-bold">{item.feePerStudent} ج.م</td>
                  <td className="py-1.5 px-2.5 border border-slate-200 text-center font-black text-emerald-800">{item.subtotal.toLocaleString('ar-EG')} ج.م</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-black text-slate-900" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <td colSpan={2} className="py-2 px-2.5 border border-slate-300 text-right">الإجمالي العام المستحق</td>
                <td className="py-2 px-2.5 border border-slate-300 text-center text-blue-900">{totalQualifiedCount} طالب</td>
                <td className="py-2 px-2.5 border border-slate-300 text-center">-</td>
                <td className="py-2 px-2.5 border border-slate-300 text-center text-emerald-900 text-xs font-black">{totalAmountRequired.toLocaleString('ar-EG')} ج.م</td>
              </tr>
            </tfoot>
          </table>

          {/* Grand Total Highlight Box */}
          <div className="p-3 bg-emerald-50 border-2 border-emerald-600 rounded-xl text-center mb-4" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <p className="text-[10px] font-bold text-emerald-800">المبلغ المطلوب</p>
            <p className="text-lg font-black text-emerald-950 mt-0.5">
              {totalAmountRequired.toLocaleString('ar-EG')} جنيه مصري فقط لا غير
            </p>
          </div>

          {/* Official Footer / Control Notes */}
          <div className="mt-4 pt-3 border-t border-slate-200 text-[10px] text-slate-600 space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <p className="font-bold text-slate-800">ملاحظات وتعليمات هامة:</p>
            <p>1. تم استخراج هذه التقرير بناءً على نتائج وتصفيات مهرجان الكرازة المرقسية المحلية.</p>
            <p>2. يرجى توريد المبلغ الموضح للجنة المالية بمقر اللجنة بالمطرانية قبل بدء فعاليات التصفيات النهائية.</p>
            <div className="pt-4 flex justify-between items-center text-xs font-black text-slate-800">
              <div>التوقيع: ..............................</div>
              <div>يُعتمد: ..............................</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
