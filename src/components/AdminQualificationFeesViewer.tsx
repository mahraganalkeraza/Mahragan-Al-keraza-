import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  Receipt, Download, Loader2, Search, Building2, Users, DollarSign, 
  Eye, RefreshCw, Sparkles, FileText, ChevronLeft, CheckCircle2, Award, Filter 
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { withStylesCleaned } from '../utils/oklchCleaner';

interface StageBreakdownItem {
  stage: string;
  qualifiedCount: number;
  feePerStudent: number;
  subtotal: number;
}

interface ChurchSummaryItem {
  churchName: string;
  totalQualifiedCount: number;
  totalAmountRequired: number;
  stageBreakdown: StageBreakdownItem[];
}

export const AdminQualificationFeesViewer: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [churchesSummary, setChurchesSummary] = useState<ChurchSummaryItem[]>([]);
  const [stageFees, setStageFees] = useState<Record<string, number>>({});
  const [selectedChurchDetail, setSelectedChurchDetail] = useState<ChurchSummaryItem | null>(null);
  
  const [isExportingMasterPdf, setIsExportingMasterPdf] = useState(false);
  const [exportingChurchName, setExportingChurchName] = useState<string | null>(null);
  const [targetChurchForPdf, setTargetChurchForPdf] = useState<ChurchSummaryItem | null>(null);

  const singleInvoiceRef = useRef<HTMLDivElement>(null);
  const masterReportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAllChurchesFeesData();
  }, []);

  const fetchAllChurchesFeesData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch settings, submissions, and churches from multiple tables to ensure no church is left out
      const [honorsSnap, sysFeesSnap, submissionsSnap, churchesSnap, accessCodesSnap] = await Promise.all([
        supabase.from('honors_settings').select('*').eq('id', 'current_config').maybeSingle(),
        supabase.from('system_settings').select('*').eq('id', 'stage_fees').maybeSingle(),
        supabase.from('exam_submissions').select('*').eq('is_published', true).range(0, 4999),
        supabase.from('churches').select('*').range(0, 4999),
        supabase.from('church_access_codes').select('church_name').range(0, 4999)
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

      const allSubmissions = submissionsSnap.data || [];

      // Compile a complete, deduplicated list of church names across all available data sources (Left Join approach)
      const allChurchNamesSet = new Set<string>();

      if (churchesSnap.data) {
        churchesSnap.data.forEach((c: any) => {
          const name = (c.name || '').trim();
          if (name) allChurchNamesSet.add(name);
        });
      }

      if (accessCodesSnap.data) {
        accessCodesSnap.data.forEach((ac: any) => {
          const name = (ac.church_name || '').trim();
          if (name) allChurchNamesSet.add(name);
        });
      }

      // 2. Map submissions by church -> stage -> student
      // churchMap: Record<churchName, Record<stageName, Map<studentId, { id, name, percentage }>>>
      const churchMap: Record<string, Record<string, Map<string, { id: string; name: string; percentage: number }>>> = {};

      allSubmissions.forEach((sub: any) => {
        const rawChurch = (sub.churchName || sub.data?.['الكنيسة'] || '').trim();
        if (!rawChurch) return;

        // Ensure we record any church names found in actual submissions as well
        allChurchNamesSet.add(rawChurch);

        const stage = sub.stage || sub.data?.['المرحلة'] || 'غير محدد';
        const studentId = sub.id || sub.student_id || sub.studentName;
        const studentName = sub.studentName || 'غير مسمى';

        const stWeights = weightsMap[stage] || {};
        const stThreshold = threshMap[stage] !== undefined ? Number(threshMap[stage]) : globalMin;

        // Calculate max percentage achieved by this submission
        let maxPerc = 0;
        const subjects = ['دراسي', 'محفوظات', 'قبطي مستوى أول', 'قبطي مستوى ثاني'];
        subjects.forEach(subj => {
          let score = 0;
          if (subj === 'دراسي') score = parseFloat(sub.derasy_score ?? sub.academicScore ?? sub.data?.['دراسي'] ?? 0);
          else if (subj === 'محفوظات') score = parseFloat(sub.mahfouzat_score ?? sub.memorizationScore ?? sub.data?.['محفوظات'] ?? 0);
          else if (subj === 'قبطي مستوى أول') score = parseFloat(sub.qebty_lvl1_score ?? sub.copticL1Score ?? sub.data?.['قبطي مستوى أول'] ?? 0);
          else if (subj === 'قبطي مستوى ثاني') score = parseFloat(sub.qebty_lvl2_score ?? sub.copticL2Score ?? sub.data?.['قبطي مستوى ثاني'] ?? 0);
          
          const maxScore = Number(stWeights[subj]) || 100;
          if (score > 0 && maxScore > 0) {
            const perc = (score / maxScore) * 100;
            if (perc > maxPerc) maxPerc = perc;
          }
        });

        if (sub.score !== undefined && sub.total_max_score) {
          const overallPerc = (sub.score / sub.total_max_score) * 100;
          if (overallPerc > maxPerc) maxPerc = overallPerc;
        }

        // Check qualification
        if (maxPerc >= stThreshold) {
          if (!churchMap[rawChurch]) churchMap[rawChurch] = {};
          if (!churchMap[rawChurch][stage]) churchMap[rawChurch][stage] = new Map();

          const existing = churchMap[rawChurch][stage].get(studentId);
          if (!existing || maxPerc > existing.percentage) {
            churchMap[rawChurch][stage].set(studentId, { id: studentId, name: studentName, percentage: maxPerc });
          }
        }
      });

      // 3. Transform the full set of churches into structured summaries (including those with 0 qualified)
      const summaryList: ChurchSummaryItem[] = [];

      allChurchNamesSet.forEach(chName => {
        const stagesObj = churchMap[chName] || {};
        const stageBreakdown: StageBreakdownItem[] = [];
        let chTotalCount = 0;
        let chTotalAmount = 0;

        Object.keys(stagesObj).forEach(stg => {
          const count = stagesObj[stg].size;
          if (count > 0) {
            const fee = feesMap[stg] !== undefined ? Number(feesMap[stg]) : 50;
            const subtotal = count * fee;

            chTotalCount += count;
            chTotalAmount += subtotal;

            stageBreakdown.push({
              stage: stg,
              qualifiedCount: count,
              feePerStudent: fee,
              subtotal
            });
          }
        });

        stageBreakdown.sort((a, b) => a.stage.localeCompare(b.stage, 'ar'));
        summaryList.push({
          churchName: chName,
          totalQualifiedCount: chTotalCount,
          totalAmountRequired: chTotalAmount,
          stageBreakdown
        });
      });

      // Alphabetical Sorting: Sort the final summaryList alphabetically so all churches (active or zeroed) are organized properly in the UI.
      summaryList.sort((a, b) => a.churchName.localeCompare(b.churchName, 'ar'));

      setChurchesSummary(summaryList);

    } catch (err) {
      console.error('Error fetching admin qualification fees summary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // KPIs
  const { globalTotalAmount, globalTotalQualified, globalTotalChurches } = useMemo(() => {
    let amt = 0;
    let count = 0;
    churchesSummary.forEach(item => {
      amt += item.totalAmountRequired;
      count += item.totalQualifiedCount;
    });
    return {
      globalTotalAmount: amt,
      globalTotalQualified: count,
      globalTotalChurches: churchesSummary.length
    };
  }, [churchesSummary]);

  // Filtered List
  const filteredChurches = useMemo(() => {
    if (!searchTerm.trim()) return churchesSummary;
    const term = searchTerm.trim().toLowerCase();
    return churchesSummary.filter(item => item.churchName.toLowerCase().includes(term));
  }, [churchesSummary, searchTerm]);

  // Single Church PDF Download
  const handleDownloadSingleChurchPdf = async (churchItem: ChurchSummaryItem) => {
    setExportingChurchName(churchItem.churchName);
    setTargetChurchForPdf(churchItem);

    // Give react time to render the hidden DOM element
    setTimeout(async () => {
      if (!singleInvoiceRef.current) {
        setExportingChurchName(null);
        setTargetChurchForPdf(null);
        return;
      }

      try {
        const element = singleInvoiceRef.current;
        const opt = {
          margin: [8, 8, 8, 8],
          filename: `مطالبة_رسوم_التصفيات_${churchItem.churchName.replace(/\s+/g, '_')}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 3, useCORS: true, allowTaint: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        } as any;

        await withStylesCleaned(async () => {
          await html2pdf().set(opt).from(element).save();
        });
      } catch (err) {
        console.error('Error exporting single church PDF:', err);
        alert('حدث خطأ أثناء تحميل ملف PDF للكنيسة.');
      } finally {
        setExportingChurchName(null);
        setTargetChurchForPdf(null);
      }
    }, 150);
  };

  // Master Global PDF Export
  const handleDownloadMasterPdf = async () => {
    setIsExportingMasterPdf(true);

    setTimeout(async () => {
      if (!masterReportRef.current) {
        setIsExportingMasterPdf(false);
        return;
      }

      try {
        const element = masterReportRef.current;
        const opt = {
          margin: [8, 8, 8, 8],
          filename: `تقرير_إجمالي_اشتراكات_الكنائس_${new Date().toLocaleDateString('ar-EG').replace(/\//g, '-')}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 3, useCORS: true, allowTaint: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        } as any;

        await withStylesCleaned(async () => {
          await html2pdf().set(opt).from(element).save();
        });
      } catch (err) {
        console.error('Error exporting master PDF:', err);
        alert('حدث خطأ أثناء تصدير التقرير الكلي لكافة الكنائس.');
      } finally {
        setIsExportingMasterPdf(false);
      }
    }, 150);
  };

  return (
    <div className="space-y-8 font-sans" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/30 backdrop-blur-md">
              <Receipt size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl md:text-3xl font-black">اشتراكات أونلاين الأسقفية</h2>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black rounded-full">
                  التصفيات النهائية
                </span>
              </div>
              <p className="text-slate-300 text-xs md:text-sm font-bold mt-1">
               رسوم الاشتراك المستحقة على الكنائس المشاركة بناءً على أعداد الطلاب الصاعدين
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-stretch md:self-auto">
            <button
              onClick={fetchAllChurchesFeesData}
              disabled={isLoading}
              className="p-3.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition border border-white/10"
              title="تحديث البيانات"
            >
              <RefreshCw size={20} className={isLoading ? 'animate-spin text-emerald-400' : ''} />
            </button>

            <button
              onClick={handleDownloadMasterPdf}
              disabled={isLoading || isExportingMasterPdf || churchesSummary.length === 0}
              className="px-6 py-3.5 bg-emerald-600 text-white hover:bg-emerald-500 rounded-2xl font-black text-sm flex items-center gap-2.5 transition shadow-lg shadow-emerald-900/50 disabled:opacity-50 active:scale-95"
            >
              {isExportingMasterPdf ? (
                <>
                  <Loader2 size={20} className="animate-spin" /> جاري التصدير...
                </>
              ) : (
                <>
                  <Download size={20} /> تصدير كشف ماليات كل الكنائس (PDF)
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">إجمالي المبلغ الكلي المطلوب</p>
            <p className="text-2xl md:text-3xl font-black text-emerald-700 mt-1">
              {globalTotalAmount.toLocaleString('ar-EG')} <span className="text-xs text-slate-500 font-bold">ج.م</span>
            </p>
          </div>
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black">
            <DollarSign size={28} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">إجمالي عدد الطلاب الصاعدين</p>
            <p className="text-2xl md:text-3xl font-black text-blue-700 mt-1">
              {globalTotalQualified} <span className="text-xs text-slate-500 font-bold">طالب</span>
            </p>
          </div>
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black">
            <Users size={28} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">عدد الكنائس المشاركة</p>
            <p className="text-2xl md:text-3xl font-black text-purple-700 mt-1">
              {globalTotalChurches} <span className="text-xs text-slate-500 font-bold">كنيسة</span>
            </p>
          </div>
          <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center font-black">
            <Building2 size={28} />
          </div>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="بحث باسم الكنيسة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-11 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition"
          />
        </div>

        <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
          <span>عرض <strong className="text-slate-900 font-black">{filteredChurches.length}</strong> من إجمالي {churchesSummary.length} كنيسة</span>
        </div>
      </div>

      {/* Main Table */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200/80 text-slate-400 space-y-3">
          <Loader2 size={36} className="animate-spin text-emerald-600" />
          <p className="font-bold text-sm">جاري جلب واحتساب بيانات اشتراكات الكنائس الصاعدة...</p>
        </div>
      ) : filteredChurches.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-slate-200/80 p-8 space-y-3">
          <Award className="mx-auto text-slate-300" size={48} />
          <p className="text-slate-800 font-black text-base">لا توجد بيانات مطابقة لنتائج البحث الحالي</p>
          <p className="text-slate-500 text-xs font-bold">تأكد من إعلان ورصد النتائج، أو جرب البحث بكلمة أخرى.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-black text-xs border-b border-slate-200">
                  <th className="p-4 min-w-[50px] text-center">#</th>
                  <th className="p-4">اسم الكنيسة</th>
                  <th className="p-4 text-center">عدد المراحل الصاعدة</th>
                  <th className="p-4 text-center">إجمالي عدد الصاعدين</th>
                  <th className="p-4 text-center">إجمالي المبلغ المطلوب (ج.م)</th>
                  <th className="p-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-sm">
                {filteredChurches.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 text-center text-slate-400 text-xs">{index + 1}</td>
                    <td className="p-4 text-slate-900 font-black">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        {item.churchName}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-xl font-black text-xs inline-block">
                        {item.stageBreakdown.length} مرحلة
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-3.5 py-1 bg-blue-50 text-blue-700 rounded-xl font-black text-xs inline-block">
                        {item.totalQualifiedCount} طالب
                      </span>
                    </td>
                    <td className="p-4 text-center font-black text-emerald-700 text-base">
                      {item.totalAmountRequired.toLocaleString('ar-EG')} ج.م
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedChurchDetail(item)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs flex items-center gap-1.5 transition"
                          title="عرض تفاصيل المراحل"
                        >
                          <Eye size={14} /> التفاصيل
                        </button>

                        <button
                          onClick={() => handleDownloadSingleChurchPdf(item)}
                          disabled={exportingChurchName === item.churchName}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
                        >
                          {exportingChurchName === item.churchName ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Download size={14} />
                          )}
                          تحميل مطالبة الكنيسة (PDF)
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedChurchDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <Receipt size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">{selectedChurchDetail.churchName}</h3>
                  <p className="text-xs text-slate-500 font-bold">تفاصيل اشتراكات ومبالغ الطلاب الصاعدين حسب المرحلة</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedChurchDetail(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-black text-xs">
                    <th className="p-3 border-b border-l border-slate-200">المرحلة</th>
                    <th className="p-3 border-b border-l border-slate-200 text-center">عدد الصاعدين</th>
                    <th className="p-3 border-b border-l border-slate-200 text-center">رسم الفرد</th>
                    <th className="p-3 border-b border-slate-200 text-center">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold">
                  {selectedChurchDetail.stageBreakdown.map((st, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-3 border-l border-slate-100 font-black text-slate-800">{st.stage}</td>
                      <td className="p-3 border-l border-slate-100 text-center text-blue-700 font-black">{st.qualifiedCount} صاعد</td>
                      <td className="p-3 border-l border-slate-100 text-center">{st.feePerStudent} ج.م</td>
                      <td className="p-3 text-center font-black text-emerald-700">{st.subtotal.toLocaleString('ar-EG')} ج.م</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-800">الإجمالي</p>
                <p className="text-xl font-black text-emerald-950 mt-0.5">
                  {selectedChurchDetail.totalAmountRequired.toLocaleString('ar-EG')} جنيه مصري
                </p>
              </div>
              <button
                onClick={() => {
                  const target = selectedChurchDetail;
                  setSelectedChurchDetail(null);
                  handleDownloadSingleChurchPdf(target);
                }}
                className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-xs flex items-center gap-1.5 hover:bg-emerald-700 transition"
              >
                <Download size={14} /> تحميل مطالبة الكنيسة (PDF)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden DOM Element for Single Church Invoice Export */}
      <div className="hidden">
        {targetChurchForPdf && (
          <div
            ref={singleInvoiceRef}
            className="p-6 bg-white text-slate-900 font-sans"
            style={{ width: '194mm', boxSizing: 'border-box', pageBreakInside: 'avoid', breakInside: 'avoid' }}
            dir="rtl"
          >
            <div className="border-b-2 border-emerald-600 pb-3 mb-4 flex justify-between items-center">
              <div>
                <h1 className="text-xl font-black text-emerald-900 mb-0.5">مهرجان الكرازة المرقسية</h1>
                <h2 className="text-sm font-bold text-slate-700">اشتراك أونلاين الأسقفية (التصفيات النهائية)</h2>
              </div>
              <div className="text-left bg-emerald-50 border border-emerald-200 py-1.5 px-3 rounded-xl">
                <p className="text-[11px] font-bold text-emerald-800">التاريخ: {new Date().toLocaleDateString('ar-EG')}</p>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5">اللجنة المركزية - المنطقة 18</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 text-center">
              <div>
                <p className="text-[10px] text-slate-500 font-bold">اسم الكنيسة</p>
                <p className="text-sm font-black text-slate-900 mt-0.5">{targetChurchForPdf.churchName}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold">إجمالي عدد الطلاب الصاعدين</p>
                <p className="text-sm font-black text-blue-700 mt-0.5">{targetChurchForPdf.totalQualifiedCount} طالب</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold">إجمالي المبلغ</p>
                <p className="text-sm font-black text-emerald-700 mt-0.5">{targetChurchForPdf.totalAmountRequired.toLocaleString('ar-EG')} ج.م</p>
              </div>
            </div>

            <table className="w-full text-right border-collapse mb-4 text-[11px]">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-black" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <th className="py-2 px-2.5 border border-slate-300 text-center min-w-[28px]">#</th>
                  <th className="py-2 px-2.5 border border-slate-300">المرحلة الدراسية</th>
                  <th className="py-2 px-2.5 border border-slate-300 text-center">عدد المشتركين الصاعدين</th>
                  <th className="py-2 px-2.5 border border-slate-300 text-center">رسم الاشتراك للفرد</th>
                  <th className="py-2 px-2.5 border border-slate-300 text-center">إجمالي المبلغ المستحق</th>
                </tr>
              </thead>
              <tbody>
                {targetChurchForPdf.stageBreakdown.map((item, index) => (
                  <tr key={index} className="border border-slate-200" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <td className="py-1.5 px-2.5 border border-slate-200 text-center font-bold">{index + 1}</td>
                    <td className="py-1.5 px-2.5 border border-slate-200 font-black text-slate-800">{item.stage}</td>
                    <td className="py-1.5 px-2.5 border border-slate-200 text-center font-bold text-blue-800">{item.qualifiedCount} صاعد</td>
                    <td className="py-1.5 px-2.5 border border-slate-200 text-center font-bold">{item.feePerStudent} ج.م</td>
                    <td className="py-1.5 px-2.5 border border-slate-200 text-center font-black text-emerald-800">{item.subtotal.toLocaleString('ar-EG')} ج.م</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="p-3 bg-emerald-50 border-2 border-emerald-600 rounded-xl text-center mb-4" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <p className="text-[10px] font-bold text-emerald-800">المطلوب سداده</p>
              <p className="text-lg font-black text-emerald-950 mt-0.5">
                {targetChurchForPdf.totalAmountRequired.toLocaleString('ar-EG')} جنيه مصري فقط لا غير
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 text-[10px] text-slate-600 space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <p className="font-bold text-slate-800">ملاحظات وتعليمات هامة:</p>
              <p>1. تم استخراج هذا التقرير بناءً على نتائج وتصفيات مهرجان الكرازة المرقسية المحلية.</p>
              <p>2. يرجى توريد المبلغ الموضح للجنة المالية بمقر اللجنة بالمطرانية.</p>
              <div className="pt-4 flex justify-between items-center text-xs font-black text-slate-800">
                <div>التوقيع: ..............................</div>
                <div>يُعتمد: ..............................</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden DOM Element for Master All-Churches PDF Export */}
      <div className="hidden">
        <div
          ref={masterReportRef}
          className="p-6 bg-white text-slate-900 font-sans"
          style={{ width: '194mm', boxSizing: 'border-box' }}
          dir="rtl"
        >
          <div className="border-b-2 border-slate-900 pb-3 mb-4 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-black text-slate-900 mb-0.5">المنطقة 18 - مهرجان الكرازة المرقسية</h1>
              <h2 className="text-sm font-bold text-slate-700">اشتراك أونلاين الأسقفية (التصفيات النهائية)</h2>
            </div>
            <div className="text-left bg-slate-100 border border-slate-300 py-1.5 px-3 rounded-xl">
              <p className="text-[11px] font-bold text-slate-800">التاريخ: {new Date().toLocaleDateString('ar-EG')}</p>
              <p className="text-[10px] text-slate-500 font-bold mt-0.5">تقرير اللجنة المركزية</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 text-center">
            <div>
              <p className="text-[10px] text-slate-500 font-bold">عدد الكنائس المشاركة</p>
              <p className="text-sm font-black text-purple-800 mt-0.5">{globalTotalChurches} كنيسة</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold">إجمالي أعداد الصاعدين</p>
              <p className="text-sm font-black text-blue-800 mt-0.5">{globalTotalQualified} طالب</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold">إجمالي المبالغ المستحقة</p>
              <p className="text-sm font-black text-emerald-800 mt-0.5">{globalTotalAmount.toLocaleString('ar-EG')} ج.م</p>
            </div>
          </div>

          <table className="w-full text-right border-collapse mb-4 text-[11px]">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-black" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <th className="py-2 px-2.5 border border-slate-300 text-center min-w-[28px]">#</th>
                <th className="py-2 px-2.5 border border-slate-300">اسم الكنيسة</th>
                <th className="py-2 px-2.5 border border-slate-300 text-center">عدد المراحل</th>
                <th className="py-2 px-2.5 border border-slate-300 text-center">إجمالي الصاعدين</th>
                <th className="py-2 px-2.5 border border-slate-300 text-center">إجمالي المبلغ (ج.م)</th>
              </tr>
            </thead>
            <tbody>
              {churchesSummary.map((item, index) => (
                <tr key={index} className="border border-slate-200" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <td className="py-1.5 px-2 border border-slate-200 text-center font-bold">{index + 1}</td>
                  <td className="py-1.5 px-2 border border-slate-200 font-black text-slate-900">{item.churchName}</td>
                  <td className="py-1.5 px-2 border border-slate-200 text-center font-bold text-purple-800">{item.stageBreakdown.length}</td>
                  <td className="py-1.5 px-2 border border-slate-200 text-center font-bold text-blue-800">{item.totalQualifiedCount}</td>
                  <td className="py-1.5 px-2 border border-slate-200 text-center font-black text-emerald-800">{item.totalAmountRequired.toLocaleString('ar-EG')} ج.م</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-black text-slate-900" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <td colSpan={2} className="py-2 px-2.5 border border-slate-300 text-right">الإجمالي الكلي المستحق</td>
                <td className="py-2 px-2.5 border border-slate-300 text-center">-</td>
                <td className="py-2 px-2.5 border border-slate-300 text-center text-blue-900">{globalTotalQualified} طالب</td>
                <td className="py-2 px-2.5 border border-slate-300 text-center text-emerald-900 text-xs font-black">{globalTotalAmount.toLocaleString('ar-EG')} ج.م</td>
              </tr>
            </tfoot>
          </table>

          <div className="mt-4 pt-3 border-t border-slate-200 text-[10px] text-slate-600 space-y-1" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <p className="font-bold text-slate-800">بيان اعتمادات الكنترول المركزي:</p>
            <p>يعتبر هذا الكشف بياناً رسمياً معتمداً من اللجنة المركزية لمهرجان الكرازة المرقسية.</p>
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
