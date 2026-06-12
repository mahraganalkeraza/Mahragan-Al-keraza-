import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Activity, Users, Monitor, Clock, TrendingUp, ShieldAlert, Smartphone, ShieldX, UserMinus, RotateCcw, RotateCw, Trash2, AlertCircle } from 'lucide-react';

export const LiveExamMonitoring: React.FC<{ 
  results: any[], 
  onlineResults?: any[],
  globalChurchFilter: string,
  onResetExam: (studentId: string, name?: string) => void
}> = ({ results, onlineResults = [], globalChurchFilter, onResetExam }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [activeSessionsData, setActiveSessionsData] = useState<any[]>([]);
  const [totalRegistered, setTotalRegistered] = useState(0);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTotalRegistered = async () => {
    try {
      const query = supabase.from('registrations').select('*', { count: 'exact', head: true });
      if (globalChurchFilter !== 'الكل') {
        query.eq('churchName', globalChurchFilter);
      }
      const { count, error } = await query;
      if (error) throw error;
      setTotalRegistered(count || 0);
    } catch (e) { 
      console.error("Failed to fetch count in Live Monitor:", e); 
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await fetchTotalRegistered();
      
      const { data: submissions, error } = await supabase
        .from('exam_submissions')
        .select('student_id, student_name, church_name, stage, submitted_at')
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      if (submissions) {
        // Map Supabase rows to local variables
        const mappedRows = submissions.map((sbRow: any) => ({
          studentId: sbRow.student_id,
          studentName: sbRow.student_name,
          churchName: sbRow.church_name,
          stage: sbRow.stage,
          timestamp: sbRow.submitted_at || new Date().toISOString(),
          status: 'completed', // Submissions are final
          deviceType: 'تم التسليم',
          ip: sbRow.church_name || '127.0.0.1', // Fallback for stats Grouping
          attempts: 1,
        }));

        setActiveSessionsData(mappedRows);
        setLogs(mappedRows);
      }
    } catch (e: any) {
      console.error("Error fetching monitoring data from Supabase:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Polling interval every 45 seconds to protect quota
    const intervalId = setInterval(() => {
      fetchData();
    }, 45000);

    return () => clearInterval(intervalId);
  }, [globalChurchFilter]);

  const handleTerminateSession = async (studentId: string) => {
    if (!confirm('هل أنت متأكد من طرد هذا الطالب وحظر جهازه من الامتحان؟')) return;
    
    setIsProcessing(studentId);
    try {
      const { error } = await supabase
        .from('live_monitoring')
        .update({
          status: 'terminated',
          updated_at: new Date().toISOString()
        })
        .eq('student_id', studentId);

      if (error) throw error;
      alert('تم إرسال أمر الطرد والإنهاء بنجاح');
      fetchData();
    } catch (e: any) {
      console.error(e);
      alert('فشل أمر الطرد: ' + e.message);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleResetAllMonitoring = async () => {
    if (!confirm('سيتم مسح كافة بيانات المراقبة المباشرة وسجلات الدخول (Logs) من Supabase. هل أنت متأكد؟')) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from('live_monitoring').delete().neq('student_id', '0');
      if (error) throw error;
      setLogs([]);
      setActiveSessionsData([]);
      alert('تم تصفير كافة البيانات بنجاح ');
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء تصفير البيانات');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLogRow = async (studentId: string) => {
    if (!confirm('هل تريد حذف هذا السجل (التسليم) من شاشة المراقبة وقاعدة البيانات؟')) return;
    try {
      const { error } = await supabase
        .from('exam_submissions')
        .delete()
        .eq('student_id', studentId);

      if (error) throw error;
      setLogs(prev => prev.filter(l => l.studentId !== studentId));
      setActiveSessionsData(prev => prev.filter(s => s.studentId !== studentId));
      alert('تم حذف السجل بنجاح');
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearBlacklist = async (studentId: string) => {
    if (!confirm('هل تريد فك الحظر عن هذا الجهاز؟')) return;
    try {
      const { error } = await supabase
        .from('live_monitoring')
        .update({
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('student_id', studentId);

      if (error) throw error;
      alert('تم فك الحظر بنجاح');
      fetchData();
    } catch (e: any) {
      alert('حدث خطأ أثناء فك الحظر: ' + e.message);
    }
  };

  // Stats per stage
  const stageStats = logs.reduce((acc: any, r) => {
    const stage = r.stage || 'غير محدد';
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {});

  // Device Counts
  const deviceCounts = logs.reduce((acc: any, log) => {
    if (log.ip) {
      acc[log.ip] = (acc[log.ip] || 0) + 1;
    }
    return acc;
  }, {});

  const submissionsCount = logs.length;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-200">
        <h3 className="font-black text-slate-800 text-lg">المتابعة المباشرة للامتحانات (Supabase Control)</h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleResetAllMonitoring}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-bold hover:bg-rose-100 transition-all disabled:opacity-50 border border-rose-200 text-xs"
          >
            <ShieldX size={15} />
            تصفير بيانات المراقبة المباشرة
          </button>
          <button 
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all disabled:opacity-50 text-xs"
          >
            {isLoading ? <RotateCw className="animate-spin" size={15} /> : <RotateCw size={15} />}
            تحديث البيانات
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
              <Activity size={24} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase">الإمتحانات المسلمة (Submissions)</p>
              <h3 className="text-2xl font-black text-slate-800">{submissionsCount}</h3>
            </div>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
             <div className="h-full bg-indigo-500" style={{ width: '100%' }} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase">إجمالي المسجلين (Registrations)</p>
              <h3 className="text-2xl font-black text-slate-800">{totalRegistered.toLocaleString('ar-EG')}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600">
              <Monitor size={24} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase">الأجهزة الفريدة / IPs</p>
              <h3 className="text-2xl font-black text-slate-800">{Object.keys(deviceCounts).length}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h4 className="font-black text-slate-800 mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-indigo-600" /> توزيع المراحل
          </h4>
          <div className="space-y-3">
            {Object.entries(stageStats).map(([stage, count]: any) => (
              <div key={stage} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                 <span className="font-bold text-slate-600 text-sm">{stage}</span>
                 <span className="font-black text-indigo-600">{count}</span>
              </div>
            ))}
            {Object.keys(stageStats).length === 0 && (
              <div className="text-slate-400 text-xs italic text-center">لا توجد مراحل مسجلة حالياً</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h4 className="font-black text-slate-800 mb-6 flex items-center gap-2">
            <ShieldAlert size={20} className="text-rose-600" /> مراقبة الأجهزة والنشاط المباشر
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="text-xs font-black text-slate-400 uppercase border-b border-slate-100 pb-4">
                   <th className="pb-4">الطالب</th>
                   <th className="pb-4">الكنيسة</th>
                   <th className="pb-4">الجهاز / IP</th>
                   <th className="pb-4">المحاولات</th>
                   <th className="pb-4">التوقيت</th>
                   <th className="pb-4 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.slice(0, 50).map((log: any) => {
                  const isActive = log.status === 'active';
                  const isTerminated = log.status === 'terminated';
                  const fp = log.fingerprint;

                  return (
                    <tr key={log.studentId} className={`text-xs group ${isTerminated ? 'opacity-50 grayscale' : ''}`}>
                      <td className="py-4 font-black text-slate-700">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                             {log.studentName || 'غير معروف'}
                             {isActive && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" title="نشط الآن" />}
                             {isTerminated && <span className="bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded text-[9px] uppercase font-black">تم الطرد</span>}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-slate-500 font-bold">{log.churchName}</td>
                      <td className="py-4">
                          <div className="flex flex-col gap-1">
                             <span className="flex items-center gap-1 font-bold text-slate-600">
                               <Smartphone size={12} /> {fp ? `${fp.brand === 'Unknown' ? '' : fp.brand} ${fp.model} (${fp.os})`.trim() : log.deviceType}
                             </span>
                             <div className="flex gap-2 items-center text-[9px] text-slate-350 font-mono">
                                <span>{log.ip}</span>
                             </div>
                          </div>
                      </td>
                      <td className="py-4">
                        <span className="px-2 py-1 rounded-full font-black bg-slate-100 text-slate-500">
                          {log.attempts} محاولة
                        </span>
                      </td>
                      <td className="py-4 text-slate-400 font-bold">{new Date(log.timestamp).toLocaleTimeString('ar-EG')}</td>
                      <td className="py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            onClick={() => handleDeleteLogRow(log.studentId)}
                            className="p-2 text-slate-300 hover:text-rose-500 rounded-lg transition-colors"
                            title="حذف هذا السجل"
                          >
                             <Trash2 size={15} />
                          </button>

                          {isActive && (
                            <button
                              onClick={() => handleTerminateSession(log.studentId)}
                              disabled={isProcessing === log.studentId}
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 font-black"
                              title="طرد وحظر الجهاز"
                            >
                              <ShieldX size={15} />
                              <span className="hidden group-hover:inline text-[10px]">طرد</span>
                            </button>
                          )}
                          
                          <button 
                            onClick={async () => {
                              setIsProcessing(log.studentId);
                              await onResetExam(log.studentId, log.studentName);
                              // Delete submission to allow student to re-enter
                              await supabase
                                .from('exam_submissions')
                                .delete()
                                .eq('student_id', log.studentId);
                              
                              // Cleanup monitoring node if it still exists
                              await supabase
                                .from('live_monitoring')
                                .update({ status: 'active', attempts_count: 0, is_locked: false, updated_at: new Date().toISOString() })
                                .eq('student_id', log.studentId);
                              setIsProcessing(null);
                              fetchData();
                            }}
                            disabled={isProcessing === log.studentId}
                            className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                            title="إعادة فتح الامتحان (تصفير المحاولة)"
                          >
                            <RotateCcw size={15} className={isProcessing === log.studentId ? 'animate-spin' : ''} />
                          </button>

                          {isTerminated && (
                             <button 
                               onClick={() => handleClearBlacklist(log.studentId)}
                               className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                               title="فك حظر الجهاز"
                             >
                               <UserMinus size={15} />
                             </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {logs.length === 0 && (
             <div className="text-center py-12 text-slate-300 italic">بانتظار حركة للامتحانات الجارية...</div>
          )}
        </div>
      </div>
    </div>
  );
};
