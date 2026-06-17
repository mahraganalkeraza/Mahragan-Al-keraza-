import React, { useState, useMemo } from 'react';
import { Settings, Calculator, Users, Building2, Monitor, FileSpreadsheet, FileText } from 'lucide-react';

interface Props {
  allStudents: any[];
}

export default function SmartCommitteePlanner({ allStudents = [] }: Props) {
  // Extract all unique stages present in the users' data
  const uniqueStages = useMemo(() => {
    const stages = new Set<string>();
    allStudents.forEach(s => {
      if (s.stage) stages.add(s.stage);
    });
    return Array.from(stages).sort();
  }, [allStudents]);

  const [onlineStages, setOnlineStages] = useState<string[]>([]);
  const [bubbleSheetStages, setBubbleSheetStages] = useState<string[]>([]);
  const [paperStages, setPaperStages] = useState<string[]>([]);
  const [expectedHours, setExpectedHours] = useState<number>(4);

  const handleStageToggle = (stage: string, type: 'online' | 'bubble' | 'paper') => {
    const toggleList = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
      if (list.includes(stage)) {
        setList(list.filter(s => s !== stage));
      } else {
        setList([...list, stage]);
      }
    };

    if (type === 'online') toggleList(onlineStages, setOnlineStages);
    if (type === 'bubble') toggleList(bubbleSheetStages, setBubbleSheetStages);
    if (type === 'paper') toggleList(paperStages, setPaperStages);
  };

  const resultsByChurch = useMemo(() => {
    const churches: Record<string, {
      onlineCount: number;
      bubbleCount: number;
      paperCount: number;
      onlineServants: number;
      writtenServants: number;
      totalCommittee: number;
    }> = {};

    allStudents.forEach(student => {
      const churchName = student.churchName || student.church || 'كنيسة غير محددة';
      if (!churches[churchName]) {
        churches[churchName] = {
          onlineCount: 0,
          bubbleCount: 0,
          paperCount: 0,
          onlineServants: 0,
          writtenServants: 0,
          totalCommittee: 0
        };
      }

      if (onlineStages.includes(student.stage)) {
        churches[churchName].onlineCount++;
      }
      if (bubbleSheetStages.includes(student.stage)) {
        churches[churchName].bubbleCount++;
      }
      if (paperStages.includes(student.stage)) {
        churches[churchName].paperCount++;
      }
    });

    const safeHours = expectedHours > 0 ? expectedHours : 1;

    Object.keys(churches).forEach(church => {
      const data = churches[church];
      
      // Online logic: Math.ceil((Count / 10) / Expected Hours)
      data.onlineServants = Math.ceil((data.onlineCount / 10) / safeHours);
      
      // Bubble/Paper logic: classroom monitoring formula: Math.ceil(Count / 25)
      data.writtenServants = Math.ceil((data.bubbleCount + data.paperCount) / 25);
      
      // Total = online + written + 1 admin coordinator
      data.totalCommittee = data.onlineServants + data.writtenServants + 1;
    });

    return Object.entries(churches).sort((a, b) => b[1].totalCommittee - a[1].totalCommittee);
  }, [allStudents, onlineStages, bubbleSheetStages, paperStages, expectedHours]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm" dir="rtl">
      {/* Header section */}
      <div className="bg-primary/5 p-8 border-b border-primary/10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 mb-2">
            <Calculator className="text-primary" size={28} />
            مخطط توزيع اللجان (الذكي)
          </h2>
          <p className="text-slate-600 font-medium">التحكم في تصنيف المراحل وحساب القوة الموصى بها للجان الفرعية لكل كنيسة</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 min-w-[250px]">
          <Settings className="text-slate-400" />
          <div className="flex-1">
            <label className="text-xs font-black text-slate-500 block mb-1">عدد ساعات اللجنة المتوقعة :</label>
            <input 
              type="number"
              min="1"
              max="24"
              value={expectedHours}
              onChange={(e) => setExpectedHours(Number(e.target.value) || 1)}
              className="w-full text-lg font-black text-primary outline-none bg-transparent"
            />
          </div>
        </div>
      </div>

      <div className="p-8">
        <h3 className="font-black text-slate-700 text-lg mb-6 border-r-4 border-primary pr-4">تهيئة مراحل الامتحانات</h3>
        
        {/* Stages Selection Zones */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          
          {/* Online Zone */}
          <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
            <h4 className="font-black text-blue-800 flex items-center gap-2 mb-4">
              <Monitor size={20} className="text-blue-600" />
              مراحل الأونلاين
            </h4>
            <div className="space-y-3">
              {uniqueStages.map(stage => (
                <label key={`online-${stage}`} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-blue-100/50 cursor-pointer hover:bg-blue-50 transition-colors">
                  <input 
                    type="checkbox"
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    checked={onlineStages.includes(stage)}
                    onChange={() => handleStageToggle(stage, 'online')}
                  />
                  <span className="font-medium text-slate-700 text-sm">{stage}</span>
                </label>
              ))}
              {uniqueStages.length === 0 && <p className="text-xs text-slate-400">لا يوجد مراحل مسجلة</p>}
            </div>
          </div>

          {/* Bubble Zone */}
          <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100">
            <h4 className="font-black text-emerald-800 flex items-center gap-2 mb-4">
              <FileSpreadsheet size={20} className="text-emerald-600" />
              مراحل البابل شيت
            </h4>
            <div className="space-y-3">
              {uniqueStages.map(stage => (
                <label key={`bubble-${stage}`} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-emerald-100/50 cursor-pointer hover:bg-emerald-50 transition-colors">
                  <input 
                    type="checkbox"
                    className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    checked={bubbleSheetStages.includes(stage)}
                    onChange={() => handleStageToggle(stage, 'bubble')}
                  />
                  <span className="font-medium text-slate-700 text-sm">{stage}</span>
                </label>
              ))}
              {uniqueStages.length === 0 && <p className="text-xs text-slate-400">لا يوجد مراحل مسجلة</p>}
            </div>
          </div>

          {/* Paper Zone */}
          <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100">
            <h4 className="font-black text-orange-800 flex items-center gap-2 mb-4">
              <FileText size={20} className="text-orange-600" />
              مراحل الورقي
            </h4>
            <div className="space-y-3">
              {uniqueStages.map(stage => (
                <label key={`paper-${stage}`} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-orange-100/50 cursor-pointer hover:bg-orange-50 transition-colors">
                  <input 
                    type="checkbox"
                    className="w-5 h-5 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                    checked={paperStages.includes(stage)}
                    onChange={() => handleStageToggle(stage, 'paper')}
                  />
                  <span className="font-medium text-slate-700 text-sm">{stage}</span>
                </label>
              ))}
              {uniqueStages.length === 0 && <p className="text-xs text-slate-400">لا يوجد مراحل مسجلة</p>}
            </div>
          </div>
        </div>

        {/* Results Grid */}
        <h3 className="font-black text-slate-700 text-lg mb-6 border-r-4 border-primary pr-4 flex items-center gap-2">
          <Users className="text-primary" size={20} /> النتائج المباشرة وتقدير اللجان
        </h3>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-right bg-white">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-slate-600 font-bold text-sm">
                <th className="p-4 rounded-tr-2xl">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-slate-400" />
                    كنيسة المشترك
                  </div>
                </th>
                <th className="p-4 text-center">أونلاين (العدد)</th>
                <th className="p-4 text-center">تحريري [بابل/ورقي]</th>
                <th className="p-4 text-center bg-blue-50/50">خدام أونلاين</th>
                <th className="p-4 text-center bg-emerald-50/50">مراقبين تحريري</th>
                <th className="p-4 text-center bg-primary/5 text-primary rounded-tl-2xl border-r border-primary/10">القوة الإجمالية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {resultsByChurch.map(([church, counts]) => (
                <tr key={church} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-black text-slate-800">{church}</td>
                  <td className="p-4 text-center">
                    <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold font-mono">
                      {counts.onlineCount}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold font-mono">
                      {(counts.bubbleCount + counts.paperCount)}
                    </span>
                  </td>
                  <td className="p-4 text-center bg-blue-50/30">
                    <span className="font-black text-blue-700">{counts.onlineServants}</span>
                  </td>
                  <td className="p-4 text-center bg-emerald-50/30">
                    <span className="font-black text-emerald-700">{counts.writtenServants}</span>
                  </td>
                  <td className="p-4 text-center bg-primary/5 border-r border-primary/10">
                    <span className="font-black text-primary text-lg">
                      {counts.totalCommittee}
                    </span>
                  </td>
                </tr>
              ))}
              
              {resultsByChurch.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">لا يوجد بيانات لعرضها</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
