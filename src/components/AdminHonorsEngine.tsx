import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { Result } from '../types';
import { Save, Download, Award, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabaseClient';

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
      let stagesList: string[] = [];
      let subjectsList: string[] = [];

      // Try cache first
      const cacheLevelsStr = localStorage.getItem('cache_levels');
      if (cacheLevelsStr) {
        try {
          const parsed = JSON.parse(cacheLevelsStr);
          if (Array.isArray(parsed.data)) {
            stagesList = parsed.data.map((l: any) => l.name).filter(Boolean);
          }
        } catch (e) {}
      }

      const cacheCompsStr = localStorage.getItem('cache_competitions');
      if (cacheCompsStr) {
        try {
          const parsed = JSON.parse(cacheCompsStr);
          if (Array.isArray(parsed.data)) {
            subjectsList = parsed.data.map((c: any) => c.name).filter(Boolean);
          }
        } catch (e) {}
      }

      // Try Supabase for stages & subjects if they aren't filled yet
      if (stagesList.length === 0 && supabase) {
        try {
          const { data, error } = await supabase.from('stages').select('*');
          if (!error && data) {
            stagesList = data.map((s: any) => s.name);
          }
        } catch (sErr) {
          console.warn('Supabase fetch failed for stages weight settings:', sErr);
        }
      }

      if (subjectsList.length === 0 && supabase) {
        try {
          const { data, error } = await supabase.from('competitions').select('*');
          if (!error && data) {
            subjectsList = data.map((c: any) => c.name);
          }
        } catch (cErr) {
          console.warn('Supabase fetch failed for comps weight settings:', cErr);
        }
      }

      // Fallback weights and threshold from local storage if firestore quota fails
      const storedWeights = localStorage.getItem('honors_weights_backup');
      const storedThreshold = localStorage.getItem('honors_min_threshold_backup');
      if (storedWeights) {
        try {
          setWeights(JSON.parse(storedWeights));
        } catch (e) {}
      }
      if (storedThreshold) {
        setMinThreshold(Number(storedThreshold));
      }

      // Try to load weights from Firestore
      try {
        const snap = await getDoc(doc(db, 'settings', 'examWeights'));
        if (snap.exists()) {
          const data = snap.data();
          if (data.weights) {
            setWeights(data.weights);
            localStorage.setItem('honors_weights_backup', JSON.stringify(data.weights));
          }
          if (data.minThreshold !== undefined) {
            setMinThreshold(data.minThreshold);
            localStorage.setItem('honors_min_threshold_backup', String(data.minThreshold));
          }
        }
      } catch (fbErr) {
        console.warn("[Firebase Fallback] Failed to fetch exam weights from firestore:", fbErr);
      }

      // If they are still completely empty, fallback dynamically to list
      if (stagesList.length === 0) {
        stagesList = ["المرحلة الإعدادية", "المرحلة الثانوية", "المرحلة الابتدائية (خامس وسادس)"];
      }
      if (subjectsList.length === 0) {
        subjectsList = ["دراسي", "طقوس وقبطي", "ألحان تسبحة", "محفوظات"];
      }

      setSystemStages(Array.from(new Set(stagesList)));
      setSystemSubjects(Array.from(new Set(subjectsList)));
    } catch (e) {
      console.error('Failed to load honors config fully', e);
    }
    setIsLoading(false);
  };

  const saveSettings = async () => {
    setIsSaving(true);
    // Back up to localStorage first
    localStorage.setItem('honors_weights_backup', JSON.stringify(weights));
    localStorage.setItem('honors_min_threshold_backup', String(minThreshold));

    try {
      await setDoc(doc(db, 'settings', 'examWeights'), {
        weights,
        minThreshold
      });
      alert('تم حفظ إعدادات ودرجات التكريم بنجاح!');
    } catch (e: any) {
      console.error(e);
      const isQuota = e.code === 'resource-exhausted' || String(e).toLowerCase().includes('quota');
      if (isQuota) {
        alert('تم حفظ الإعدادات محلياً في المتصفح بنجاح! لامتلاء الحصة السحابية المجانية لـ Firebase، تم تفعيل الوضع المحلي المتين لمتابعة العمل دون توقف.');
      } else {
        alert('حدث خطأ أثناء الحفظ: ' + (e.message || String(e)));
      }
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
    if (!isOpen || results.length === 0) return { studentRanks: {}, exportData: [] };

    const grouped: Record<string, Record<string, { result: Result, percentage: number }[]>> = {};

    results.forEach(r => {
      const stage = r.academicScore !== undefined ? r.stage : r.data?.['دراسي'] || r.stage;
      const church = r.churchName || 'غير محدد';
      
      const stWeights = weights[stage] || {};
      let bestPercentage = 0;

      const scores: Record<string, number> = {};

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
          }
        }
      }

      if (bestPercentage >= minThreshold) {
        if (!grouped[church]) grouped[church] = {};
        if (!grouped[church][stage]) grouped[church][stage] = [];
        grouped[church][stage].push({ result: r, percentage: bestPercentage });
      }
    });

    const sRanks: Record<string, { rank: number; colorClass: string, percentage: number, title: string }> = {};
    const eData: any[] = [];

    Object.keys(grouped).forEach(church => {
      Object.keys(grouped[church]).forEach(stage => {
        const students = grouped[church][stage];
        const uniqueValues = Array.from(new Set(students.map(s => s.percentage))).sort((a, b) => b - a);

        students.forEach((s) => {
          const rank = uniqueValues.indexOf(s.percentage) + 1;
          if (rank <= 3) {
            const isTied = students.filter(x => x.percentage === s.percentage).length > 1;
            
            let color = '';
            let rankName = '';
            if (rank === 1) { color = 'bg-green-200'; rankName = 'أول'; }
            if (rank === 2) { color = 'bg-yellow-200'; rankName = 'ثاني'; }
            if (rank === 3) { color = 'bg-orange-100'; rankName = 'ثالث'; }
            
            const title = `مركز ${rankName}${isTied ? ' مكرر' : ''}`;

            if (s.result.id) {
              sRanks[s.result.id] = { rank, colorClass: color, percentage: s.percentage, title };
            }
            
            eData.push({
               'الكود': s.result.id,
               'الاسم': s.result.studentName,
               'الكنيسة': church,
               'المرحلة': stage,
               'النسبة المئوية (%)': parseFloat(s.percentage.toFixed(2)),
               'المركز': title,
               'رقم المركز': rank
            });
          }
        });
      });
    });

    // Sort Export Data: Church -> Stage -> Rank
    eData.sort((a, b) => {
       if (a['الكنيسة'] !== b['الكنيسة']) return a['الكنيسة'].localeCompare(b['الكنيسة']);
       if (a['المرحلة'] !== b['المرحلة']) return a['المرحلة'].localeCompare(b['المرحلة']);
       return a['رقم المركز'] - b['رقم المركز'];
    });

    return { studentRanks: sRanks, exportData: eData };
  }, [results, weights, minThreshold, isOpen]);

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
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المكرمين");
    XLSX.writeFile(wb, `Honors_Leaderboard_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // If enabled is false (e.g., church user), don't render.
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
}

