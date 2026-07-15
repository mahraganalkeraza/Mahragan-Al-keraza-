import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Result } from '../types';
import { Save, Download, Award, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import * as XLSX from 'xlsx';

interface WeightsMap {
  [stage: string]: {
    [subject: string]: number;
  };
}

export const AdminHonorsEngine: React.FC<{ results: Result[], enabled?: boolean, onHonorsUpdate?: (ranks: Record<string, { rank: number; colorClass: string, percentage: number, title: string }>) => void }> = ({ results, enabled = true, onHonorsUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [weights, setWeights] = useState<WeightsMap>({});
  const [minThreshold, setMinThreshold] = useState<number>(90);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [systemStages, setSystemStages] = useState<string[]>([]);
  const [systemSubjects, setSystemSubjects] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const [weightsSnap, stagesSnap, bankSnap] = await Promise.all([
        supabase.from('system_settings').select('*').eq('id', 'examWeights').maybeSingle(),
        supabase.from('stage_competitions').select('stage_name'),
        supabase.from('competition_bank').select('name')
      ]);

      if (weightsSnap.data) {
        const data = weightsSnap.data.details || {};
        if (data.weights) setWeights(data.weights);
        if (data.minThreshold !== undefined) setMinThreshold(data.minThreshold);
      }

      setSystemStages(stagesSnap.data?.map(d => d.stage_name).filter(Boolean) as string[] || []);
      setSystemSubjects(bankSnap.data?.map(d => d.name).filter(Boolean) as string[] || []);
    } catch (e) {
      console.error('Failed to load honors config', e);
    }
    setIsLoading(false);
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      await supabase.from('system_settings').upsert({
        id: 'examWeights',
        details: { weights, minThreshold }
      });
      alert('تم حفظ إعدادات ودرجات التكريم بنجاح!');
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء الحفظ.');
    }
    setIsSaving(false);
  };

  const handleWeightChange = (stage: string, subject: string, value: string) => {
    const num = parseFloat(value) || 0;
    setWeights(prev => ({
      ...prev,
      [stage]: {
        ...(prev[stage] || {}),
        [subject]: num
      }
    }));
  };

  const { studentRanks, exportData } = useMemo(() => {
    if (!isOpen || !results || results?.length === 0) return { studentRanks: {}, exportData: [] };

    // 1. تجميع كافة الطلاب حسب الكنيسة والمرحلة
    const grouped: Record<string, Record<string, { result: Result; percentage: number; score: number; maxScore: number; subject: string }[]>> = {};

    const validResults = (results || []).filter(r => r && (r.academicScore !== undefined || r.derasy_score !== undefined || r.score !== undefined || r.data));

    validResults.forEach(r => {
      const stage = r.academicScore !== undefined ? r.stage : r.data?.['دراسي'] || r.stage;
      const church = r.churchName || 'غير محدد';
      const stWeights = weights[stage] || {};
      
      let bestPercentage = 0;
      let bestScore = 0;
      let bestMaxScore = 0;
      let bestSubject = '';

      for (const subj of systemSubjects) {
        let score = 0;
        if (subj === 'دراسي') score = parseFloat((r.academicScore ?? r.data?.['دراسي']) as any ?? 0);
        else if (subj === 'محفوظات') score = parseFloat((r.memorizationScore ?? r.data?.['محفوظات']) as any ?? 0);
        else if (subj === 'قبطي مستوى أول') score = parseFloat((r.copticL1Score ?? r.data?.['قبطي مستوى أول']) as any ?? 0);
        else if (subj === 'قبطي مستوى ثاني') score = parseFloat((r.copticL2Score ?? r.data?.['قبطي مستوى ثاني']) as any ?? 0);
        else score = parseFloat(r.data?.[subj] as any ?? 0);

        score = Number(score) || 0;
        const maxScore = Number(stWeights[subj]) || 0;
        
        if (maxScore > 0 && score > 0) {
          const perc = (score / maxScore) * 100;
          if (perc > bestPercentage) {
            bestPercentage = perc;
            bestScore = score;
            bestMaxScore = maxScore;
            bestSubject = subj;
          }
        }
      }

      if (bestMaxScore > 0) {
        if (!grouped[church]) grouped[church] = {};
        if (!grouped[church][stage]) grouped[church][stage] = [];
        grouped[church][stage].push({
          result: r,
          percentage: bestPercentage,
          score: bestScore,
          maxScore: bestMaxScore,
          subject: bestSubject
        });
      }
    });

    const sRanks: Record<string, { rank: number; colorClass: string; percentage: number; title: string }> = {};
    const eData: any[] = [];

    // 2. تطبيق الترتيب النسبي بناءً على النسبة المئوية المكافئة لخصم الدرجات
    Object.keys(grouped).forEach(church => {
      Object.keys(grouped[church]).forEach(stage => {
        const students = grouped[church][stage] || [];
        if (students.length === 0) return;

        // إيجاد أعلى نسبة مئوية تم تحقيقها في المجموعة
        const maxPercentageInGroup = Math.max(...students.map(s => s.percentage));

        // هل يوجد من حصل على الدرجة النهائية (100%)؟
        const hasPerfectScore = maxPercentageInGroup >= 100;

        // تصفية الطلاب المؤهلين (الذين حققوا الحد الأدنى للتكريم)
        const qualifiedStudents = students.filter(s => s.percentage >= minThreshold);

        qualifiedStudents.forEach(s => {
          // حساب النسبة المئوية التي تعادل "درجة واحدة" من المجموع الكلي لمسابقة هذا الطالب
          const singlePointPercentage = (1 / s.maxScore) * 100;

          let rank = 0;

          if (hasPerfectScore) {
            // الحالة الأولى: يوجد مركز أول حقيقي جاب 100%
            const diffPercentage = 100 - s.percentage;

            if (diffPercentage === 0) {
              rank = 1; // الأول: جاب 100% كاملة
            } else if (diffPercentage <= singlePointPercentage + 0.01) { 
              rank = 2; // الثاني: ناقص درجة واحدة أو أقل (مع سماحية بسيطة لتقريب الكسور)
            } else if (diffPercentage <= (singlePointPercentage * 2) + 0.01) {
              rank = 3; // الثالث: ناقص درجتين أو أقل
            }
          } else {
            // الحالة الثانية: أعلى واحد مش جايب 100% (ترتيب نسبي)
            // نقارن نسبة الطالب بالنسبة المئوية القصوى المحققة في الكنيسة والمرحلة
            const diffPercentage = maxPercentageInGroup - s.percentage;

            if (diffPercentage === 0) {
              rank = 1; // الأول نسبياً: صاحب أعلى نسبة مئوية
            } else if (diffPercentage <= singlePointPercentage + 0.01) {
              rank = 2; // الثاني نسبياً: يقل عن الأول بما يعادل درجة واحدة أو أقل
            } else if (diffPercentage <= (singlePointPercentage * 2) + 0.01) {
              rank = 3; // الثالث نسبياً: يقل عن الأول بما يعادل درجتين أو أقل
            }
          }

          if (rank >= 1 && rank <= 3) {
            assignRank(s, rank, church, stage);
          }
        });
      });
    });

    // دالة مساعدة لتسجيل المراكز والتصدير
    function assignRank(s: any, rank: number, church: string, stage: string) {
      let color = '';
      let rankName = '';
      if (rank === 1) { color = 'bg-green-200'; rankName = 'أول'; }
      if (rank === 2) { color = 'bg-yellow-200'; rankName = 'ثاني'; }
      if (rank === 3) { color = 'bg-orange-100'; rankName = 'ثالث'; }

      const title = `مركز ${rankName}`;

      if (s.result?.id) {
        sRanks[s.result.id] = { rank, colorClass: color, percentage: s.percentage, title };
      }

      eData.push({
        'الكود': s.result?.id || '',
        'الاسم': s.result?.studentName || '',
        'الكنيسة': church,
        'المرحلة': stage,
        'المسابقة الأعلى': s.subject,
        'الدرجة الفعلية': s.score,
        'الدرجة الكلية للمسابقة': s.maxScore,
        'النسبة المئوية (%)': parseFloat((s.percentage || 0).toFixed(2)),
        'المركز': title,
        'رقم المركز': rank
      });
    }

    // إضافة كلمة "مكرر" ديناميكياً للمراكز المتطابقة
    eData.forEach(item => {
      const duplicates = eData.filter(
        x => x['الكنيسة'] === item['الكنيسة'] && 
             x['المرحلة'] === item['المرحلة'] && 
             x['رقم المركز'] === item['رقم المركز']
      );
      if (duplicates.length > 1) {
        item['المركز'] = `${item['المركز']} مكرر`;
        if (sRanks[item['الكود']]) {
          sRanks[item['الكود']].title = `${sRanks[item['الكود']].title} مكرر`;
        }
      }
    });

    // ترتيب البيانات للتصدير
    eData.sort((a, b) => {
      if (a['الكنيسة'] !== b['الكنيسة']) return a['الكنيسة'].localeCompare(b['الكنيسة']);
      if (a['المرحلة'] !== b['المرحلة']) return a['المرحلة'].localeCompare(b['المرحلة']);
      return a['رقم المركز'] - b['رقم المركز'];
    });

    return { studentRanks: sRanks, exportData: eData };
  }, [results, weights, minThreshold, isOpen, systemSubjects]);

  useEffect(() => {
    if (onHonorsUpdate) {
      onHonorsUpdate(studentRanks);
    }
  }, [studentRanks, onHonorsUpdate]);

  const exportExcel = () => {
    if (exportData.length === 0) {
      alert('لا توجد بيانات لمكرمين مستوفين الشروط!');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(exportData);
    const csvContent = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], {
      type: "text/csv;charset=utf-8;"
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Honors_Leaderboard_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!enabled) return null;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      {/* Header / Trigger */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 bg-gradient-to-l from-indigo-50 to-white hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Award className="text-indigo-600" size={24} />
          <h3 className="text-xl font-black text-indigo-900">محرك أوائل التكريم (Honors Engine)</h3>
        </div>
        {isOpen ? <ChevronUp className="text-indigo-400" /> : <ChevronDown className="text-indigo-400" />}
      </button>

      {/* Expanded Content */}
      {isOpen && (
        <div className="p-6 border-t border-slate-100">
          {isLoading ? (
            <div className="flex items-center gap-2 text-indigo-600 font-bold p-6 justify-center">
              <Loader2 className="animate-spin" /> جاري تحميل الإعدادات...
            </div>
          ) : (
            <div className="space-y-8">
              <p className="text-slate-500 text-sm font-bold bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                حدد الدرجة النهائية (الحد الأقصى) لكل مسابقة حسب المرحلة. سيقوم النظام أوتوماتيكياً باختيار أفضل مادة لكل مشترك، وحساب نسبته المئوية (%). من ثم سيقوم بترتيب المشتركين داخل كل كنيسة بناءً على أعلي نسبة فوق الحد الأدنى. الأوائل الثلاث وتكراراتهم سيتم تمييزهم لونياً.
              </p>

              {/* Threshold & Global Actions */}
              <div className="flex flex-col md:flex-row items-center justify-between bg-slate-50 p-6 rounded-2xl border border-slate-200 gap-6">
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-2">الحد الأدنى للتكريم (%)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={minThreshold}
                      onChange={(e) => setMinThreshold(Number(e.target.value) || 0)}
                      className="w-32 px-4 py-2 bg-white border border-slate-300 rounded-xl font-bold text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                  <button 
                    onClick={saveSettings}
                    disabled={isSaving}
                    className="flex-1 md:flex-none px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-indigo-700 transition shadow-lg active:scale-95 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    حفظ المصفوفة ديناميكياً
                  </button>
                  <button 
                    onClick={exportExcel}
                    className="flex-1 md:flex-none px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-emerald-700 transition shadow-lg active:scale-95"
                  >
                    <Download size={18} /> تصدير كشف المكرمين فقط
                  </button>
                </div>
              </div>

              {/* Dynamic Matrix View */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-black text-sm uppercase">
                      <th className="p-4 border-b border-l border-slate-200">المرحلة / المسابقة</th>
                      {systemSubjects.map((s, idx) => (
                        <th key={idx} className="p-4 border-b border-l border-slate-200 text-center">{s}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {systemStages.map((stage) => (
                      <tr key={stage} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 border-b border-l border-slate-200 font-bold text-indigo-900 bg-slate-50/50">{stage}</td>
                        {systemSubjects.map((subj) => (
                          <td key={subj} className="p-3 border-b border-l border-slate-100 relative text-center">
                            <input 
                              type="number"
                              min="0"
                              placeholder="-"
                              value={weights[stage]?.[subj] || ''}
                              onChange={(e) => handleWeightChange(stage, subj, e.target.value)}
                              className="w-20 px-2 py-1.5 text-center bg-white border border-slate-200 rounded-lg text-sm font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none placeholder:text-slate-300"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
