import React, { useMemo } from 'react';
import { Result } from '../types';
import { RefreshCcw, ShieldAlert } from 'lucide-react';

export const ResultsViewer: React.FC<{ 
  results: Result[], 
  onReset?: (id: string) => void,
  isAdmin?: boolean 
}> = ({ results, onReset, isAdmin }) => {
  const MASTER_HEADERS = [
    'وقت التسليم',
    'الاسم',
    'الكنيسة/البلد',
    'النوع',
    'التحصيل الدراسي',
    'محفوظات',
    'قبطي مستوى أول',
    'قبطي مستوى ثاني'
  ];

  // Discover dynamic headers
  const dynamicHeaders = useMemo(() => {
    const dh = new Set<string>();
    results.forEach(r => {
      if (r.data) {
         Object.keys(r.data).forEach(k => {
           if (!MASTER_HEADERS.includes(k) && k !== 'serial' && k !== 'دراسي') {
             dh.add(k);
           }
         });
      }
    });
    return Array.from(dh);
  }, [results]);

  const allHeaders = [...MASTER_HEADERS, ...dynamicHeaders];

  // Derive Church vs Stages Matrix
  const matrix = useMemo(() => {
    const churches = Array.from(new Set(results.map(r => r.churchName)));
    const stages = Array.from(new Set(results.map(r => r.academicScore !== undefined ? r.stage : r.data?.['دراسي'] || r.stage))).filter(Boolean) as string[];
    
    return { churches, stages };
  }, [results]);

  return (
    <div className="space-y-8">
      {/* Real-time Master Table */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
          <h4 className="text-xl font-black text-slate-800">السجل العام (Master Record)</h4>
          <span className="bg-slate-100 px-4 py-1 rounded-full text-xs font-black">إجمالي: {results.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase whitespace-nowrap">
                <th className="p-4 border-b border-slate-100">م</th>
                {isAdmin && <th className="p-4 border-b border-slate-100">تحكم</th>}
                {allHeaders.map((header, idx) => (
                  <th key={idx} className="p-4 border-b border-slate-100">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {results.slice(0, 500).map((r, index) => {
                const rowData: Record<string, any> = {
                  'وقت التسليم': r.timestamp ? new Date(r.timestamp).toLocaleString('ar-EG') : '',
                  'الاسم': r.studentName,
                  'الكنيسة/البلد': r.churchName,
                  'النوع': r.data?.['النوع'] || '',
                  'التحصيل الدراسي': r.academicScore ?? r.data?.['دراسي'] ?? '',
                  'محفوظات': r.memorizationScore ?? r.data?.['محفوظات'] ?? '',
                  'قبطي مستوى أول': r.copticL1Score ?? r.data?.['قبطي مستوى أول'] ?? '',
                  'قبطي مستوى ثاني': r.copticL2Score ?? r.data?.['قبطي مستوى ثاني'] ?? '',
                  ...r.data
                };
                
                const hasScore = r.academicScore !== undefined && r.academicScore !== null;

                return (
                  <tr key={r.id || index} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-400 text-sm whitespace-nowrap border-l border-slate-50">
                      {index + 1}
                    </td>
                    {isAdmin && (
                      <td className="p-4 border-l border-slate-50">
                        {hasScore && (
                          <button 
                            onClick={() => onReset?.(r.id!)}
                            title="إعادة الامتحان"
                            className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-all border border-rose-100"
                          >
                            <RefreshCcw size={14} />
                          </button>
                        )}
                      </td>
                    )}
                    {allHeaders.map((header, idx) => {
                      const isDerasi = header === 'دراسي';
                      return (
                        <td key={idx} className={`p-4 font-bold whitespace-nowrap border-l border-slate-50 ${isDerasi ? 'text-indigo-600 font-black' : 'text-slate-700'}`}>
                          {rowData[header] || '-'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {results.length > 100 && (
             <p className="text-center text-sm text-slate-400 font-bold mt-4">
               تظهر أحدث 100 نتيجة فقط في العرض المباشر لضمان سرعة النظام.
             </p>
          )}
        </div>
      </div>

      {/* Admin Analytics: Church vs Stages Matrix */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <h4 className="text-xl font-black text-indigo-800 mb-6 border-b border-slate-100 pb-4">
          Admin Analytics: Church vs Stages Matrix
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-indigo-50 text-[10px] font-black text-indigo-500 uppercase whitespace-nowrap border-b-2 border-indigo-100">
                <th className="p-4">الكنيسة</th>
                {matrix.stages.map((stage, idx) => (
                  <th key={idx} className="p-4">{stage}</th>
                ))}
                <th className="p-4 border-r border-indigo-100">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-50">
              {matrix.churches.map((church, idx) => {
                const churchResults = results.filter(r => r.churchName === church);
                return (
                  <tr key={idx} className="bg-white hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-indigo-700 text-sm border-l border-indigo-50">
                      {church}
                    </td>
                    {matrix.stages.map((stage, sIdx) => {
                      const count = churchResults.filter(r => (r.data?.['دراسي'] || r.stage) === stage).length;
                      return (
                        <td key={sIdx} className="p-4 text-slate-600 font-bold text-sm border-l border-indigo-50">
                          {count > 0 ? count : '-'}
                        </td>
                      );
                    })}
                    <td className="p-4 font-black text-slate-800 border-r border-indigo-100">
                      {churchResults.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
