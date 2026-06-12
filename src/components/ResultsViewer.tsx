import React, { useMemo, useState, useEffect } from 'react';
import { Result } from '../types';
import { RefreshCcw, ShieldAlert, Loader } from 'lucide-react';
import { AdminHonorsEngine } from './AdminHonorsEngine';
import { supabase } from '../utils/supabaseClient';
import PaginationComponent from './Pagination';

export const ResultsViewer: React.FC<{ 
  results?: Result[], 
  onReset?: (id: string) => void,
  isAdmin?: boolean 
}> = ({ results: resultsProp, onReset: onResetProp, isAdmin }) => {
  const [supabaseSubmissions, setSupabaseSubmissions] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [honorsRanks, setHonorsRanks] = useState<Record<string, { rank: number; colorClass: string, percentage: number, title: string }>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

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

  // Fetch results dynamically from Supabase exam_submissions table
  const fetchSubmissionsFromSupabase = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('exam_submissions')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mapped: Result[] = data.map((sbRow: any) => ({
          id: sbRow.student_id || sbRow.id,
          studentName: sbRow.student_name,
          churchName: sbRow.church_name,
          stage: sbRow.stage,
          academicScore: sbRow.derasy_score ?? null,
          memorizationScore: sbRow.mahfouzat_score ?? sbRow.mahfozat_score ?? null,
          copticL1Score: sbRow.qebty_lvl1_score ?? null,
          copticL2Score: sbRow.qebty_lvl2_score ?? null,
          timestamp: sbRow.submitted_at || null,
          gender: sbRow.gender || '',
          data: sbRow.detailed_answers || {}
        }));
        setSupabaseSubmissions(mapped);
      }
    } catch (err) {
      console.error('Error fetching submissions from Supabase:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissionsFromSupabase();
  }, []);

  const results = supabaseSubmissions;

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
    const churches = Array.from(new Set(results.map(r => r.churchName).filter(Boolean)));
    const stages = Array.from(new Set(results.map(r => r.academicScore !== undefined && r.academicScore !== null ? r.stage : r.data?.['دراسي'] || r.stage).filter(Boolean))) as string[];
    
    return { churches, stages };
  }, [results]);

  // Handle local user reset in Supabase
  const handleResetRow = async (id: string) => {
    if (!confirm('هل تريد فعلاً إعادة تعيين وحذف النتيجة وإعادة فتح الامتحان في Supabase؟')) return;
    try {
      // 1. Delete submission record from Supabase
      const { error } = await supabase
        .from('exam_submissions')
        .delete()
        .eq('student_id', id);

      if (error) throw error;

      // 2. Also reset live monitoring record back to active
      await supabase
        .from('live_monitoring')
        .update({
          status: 'active',
          attempts_count: 0,
          is_locked: false,
          updated_at: new Date().toISOString()
        })
        .eq('student_id', id);

      alert('تم إعادة تعيين النتيجة وفتح الامتحان بنجاح في Supabase!');
      fetchSubmissionsFromSupabase();
    } catch (err: any) {
      console.error('Error in reset operation:', err);
      alert('حدث خطأ أثناء ريست الامتحان: ' + err.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Honors Engine (Admin Only) */}
      <AdminHonorsEngine results={results} enabled={isAdmin} onHonorsUpdate={setHonorsRanks} />

      {/* Real-time Master Table */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
          <h4 className="text-xl font-black text-slate-800">السجل العام لحالة نتائج الامتحانات (Supabase Database)</h4>
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchSubmissionsFromSupabase}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all"
              title="تحديث البيانات"
            >
              <RefreshCcw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <span className="bg-slate-100 px-4 py-1 rounded-full text-xs font-black">إجمالي: {results.length}</span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader className="animate-spin text-indigo-600 mb-4" size={32} />
            <p className="text-slate-500 text-sm font-bold">جاري جلب النتائج النشطة من Supabase...</p>
          </div>
        ) : (
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
                {results.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((r, index) => {
                  const rowData: Record<string, any> = {
                    'وقت التسليم': r.timestamp ? new Date(r.timestamp).toLocaleString('ar-EG') : '',
                    'الاسم': r.studentName,
                    'الكنيسة/البلد': r.churchName,
                    'النوع': (r as any).gender || r.data?.['النوع'] || '',
                    'التحصيل الدراسي': r.academicScore ?? r.data?.['دراسي'] ?? '',
                    'محفوظات': r.memorizationScore ?? r.data?.['محفوظات'] ?? '',
                    'قبطي مستوى أول': r.copticL1Score ?? r.data?.['قبطي مستوى أول'] ?? '',
                    'قبطي مستوى ثاني': r.copticL2Score ?? r.data?.['قبطي مستوى ثاني'] ?? '',
                    ...r.data
                  };
                  
                  const hasScore = (r.academicScore !== undefined && r.academicScore !== null) ||
                                   (r.memorizationScore !== undefined && r.memorizationScore !== null) ||
                                   (r.copticL1Score !== undefined && r.copticL1Score !== null) ||
                                   (r.copticL2Score !== undefined && r.copticL2Score !== null);
                  const honorData = r.id ? honorsRanks[r.id] : null;
                  const rowClass = honorData ? honorData.colorClass : 'hover:bg-slate-50 transition-colors';

                  return (
                    <tr key={r.id || index} className={rowClass}>
                      <td className="p-4 font-bold text-slate-400 text-sm whitespace-nowrap border-l border-slate-50 relative">
                        {honorData && (
                          <div className="absolute top-1 right-2 text-[9px] font-black bg-white/50 px-1 py-0.5 rounded text-slate-700 border border-black/10">
                            {honorData.title} ({honorData.percentage.toFixed(1)}%)
                          </div>
                        )}
                        {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                      </td>
                      {isAdmin && (
                        <td className="p-4 border-l border-slate-50">
                          {hasScore && (
                            <button 
                              onClick={() => handleResetRow(r.id!)}
                              title="إعادة الامتحان وتصفير محتواه"
                              className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-all border border-rose-100"
                            >
                              <RefreshCcw size={14} />
                            </button>
                          )}
                        </td>
                      )}
                      {allHeaders.map((header, idx) => {
                        const isDerasi = header === 'التحصيل الدراسي';
                        return (
                          <td key={idx} className={`p-4 font-bold whitespace-nowrap border-l border-slate-50 ${isDerasi ? 'text-indigo-600 font-black' : 'text-slate-700'}`}>
                            {rowData[header] !== undefined && rowData[header] !== null ? rowData[header] : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {results.length === 0 && (
              <div className="text-center py-12 text-slate-400 italic">بانتظار رصد وتسجيل درجات الامتحانات...</div>
            )}

            <PaginationComponent 
              currentPage={currentPage}
              totalItems={results.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Admin Analytics: Church vs Stages Matrix */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <h4 className="text-xl font-black text-indigo-800 mb-6 border-b border-slate-100 pb-4">
          مصفوفة مشاركة الكنائس والبلدان وفقاً للمراحل
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
export default ResultsViewer;
