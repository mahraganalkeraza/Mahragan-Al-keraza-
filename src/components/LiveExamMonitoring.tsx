import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  Search, 
  RefreshCw, 
  Unlock, 
  Lock, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Monitor,
  Database,
  Users,
  ShieldAlert,
  Download,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabaseClient';

interface ExamDeviceLog {
  id: number;
  student_id: string;
  student_name: string;
  church: string;
  stage?: string;
  device_name?: string;
  device_type?: string;
  os_version?: string;
  ip_address?: string;
  last_known_ip?: string;
  status: string;
  created_at?: string;
  last_ping: string;
  allow_reentry: boolean;
  started_at?: string;
}

interface LiveExamMonitoringProps {
  globalChurchFilter?: string;
  onResetExam?: (studentId: string, studentName?: string) => Promise<void>;
  hideActions?: boolean;
}

export const LiveExamMonitoring: React.FC<LiveExamMonitoringProps> = ({ 
  globalChurchFilter = 'الكل', 
  onResetExam,
  hideActions = false
}) => {
  const [logs, setLogs] = useState<ExamDeviceLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState('الكل');
  const [isConnected, setIsConnected] = useState(true);
  const [statusFilter, setStatusFilter] = useState('الكل');
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Fetch active logs
  const fetchActiveLogs = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('exam_device_logs')
        .select('*')
        .order('last_ping', { ascending: false });

      if (globalChurchFilter !== 'الكل') {
        query = query.eq('church', globalChurchFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching device logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveLogs();

    // Setup Supabase Realtime channel for exam_device_logs changes
    const logsSubscription = supabase
      .channel('live-logs-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exam_device_logs'
        },
        (payload: any) => {
          console.log('Realtime update on exam_device_logs:', payload);
          if (payload.eventType === 'INSERT') {
            const newItem = payload.new as ExamDeviceLog;
            // Check if global filter matches
            if (globalChurchFilter === 'الكل' || newItem.church === globalChurchFilter) {
              setLogs(prev => [newItem, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedItem = payload.new as ExamDeviceLog;
            setLogs(prev => prev.map(log => log.student_id === updatedItem.student_id ? updatedItem : log));
          } else if (payload.eventType === 'DELETE') {
            const oldId = payload.old?.id;
            const oldStudentId = payload.old?.student_id;
            setLogs(prev => prev.filter(log => log.id !== oldId && log.student_id !== oldStudentId));
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(logsSubscription);
    };
  }, [globalChurchFilter]);

  // Force re-entry allowance toggle
  const toggleReentry = async (log: ExamDeviceLog) => {
    setActioningId(log.student_id);
    const updatedReentry = !log.allow_reentry;
    try {
      const { error } = await supabase
        .from('exam_device_logs')
        .update({ allow_reentry: updatedReentry })
        .eq('student_id', log.student_id);

      if (error) throw error;
      
      // Update local state is done automatically via Postgres realtime,
      // but let's update immediately for instant visual feedback.
      setLogs(prev => prev.map(item => item.student_id === log.student_id ? { ...item, allow_reentry: updatedReentry } : item));
    } catch (err: any) {
      alert("فشل تحديث صلاحية إعادة الدخول: " + err.message);
    } finally {
      setActioningId(null);
    }
  };

  // Kick student or remove device footprint
  const removeFootprint = async (studentId: string, studentName: string) => {
    if (!confirm(`هل ترغب في طرد وحذف السجل التعريفي والتحقق الفني لجهاز الطالب: ${studentName}؟ سيتمكن من تسجيل الدخول من جهاز جديد.`)) return;
    setActioningId(studentId);
    try {
      const { error } = await supabase
        .from('exam_device_logs')
        .delete()
        .eq('student_id', studentId);

      if (error) throw error;
      setLogs(prev => prev.filter(item => item.student_id !== studentId));
    } catch (err: any) {
      alert("حدث خطأ أثناء طرد الجهاز: " + err.message);
    } finally {
      setActioningId(null);
    }
  };

  // Unique list of stages for filtering
  const distinctStages = useMemo(() => {
    const list = new Set<string>();
    logs.forEach(log => {
      if (log.stage) list.add(log.stage);
    });
    return Array.from(list);
  }, [logs]);

  // Filter logs locally based on filters
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        log.student_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        log.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.church && log.church.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStage = selectedStage === 'الكل' || log.stage === selectedStage;
      
      const isPingActive = (Date.now() - new Date(log.last_ping).getTime()) < 35000;
      const matchesStatus = 
        statusFilter === 'الكل' || 
        (statusFilter === 'نشط' && isPingActive) || 
        (statusFilter === 'خامل' && !isPingActive) || 
        (statusFilter === 'مسموح_بالإعادة' && log.allow_reentry);

      return matchesSearch && matchesStage && matchesStatus;
    });
  }, [logs, searchQuery, selectedStage, statusFilter]);

  // Analytics Metrics
  const metrics = useMemo(() => {
    let active = 0;
    let completed = 0;
    let pending = 0;
    let fallbackAndIncomplete = 0;

    logs.forEach(log => {
      const isPingActive = (Date.now() - new Date(log.last_ping).getTime()) < 35000;
      if (isPingActive) active++;
      
      if (log.status?.includes('Success') || log.status?.includes('اكتمل')) {
        completed++;
      } else if (log.status?.includes('انتظار') || log.status?.includes('قيد')) {
        pending++;
      } else {
        fallbackAndIncomplete++;
      }
    });

    return { active, total: logs.length, completed, pending, fallbackAndIncomplete };
  }, [logs]);

  const exportLogsToExcel = () => {
    if (logs.length === 0) return;
    
    // Simple CSV formulation
    const headers = ["معرف الطالب", "الاسم", "الكنيسة", "المرحلة", "الحالة المباشرة", "حالة الاتصال", "آخر تواصل (Ping)", "صلاحية الإعادة"];
    const rows = logs.map(log => {
      const isPingActive = (Date.now() - new Date(log.last_ping).getTime()) < 35000;
      return [
        log.student_id,
        log.student_name,
        log.church,
        log.stage || "غير محدد",
        log.status || "نشط",
        isPingActive ? "متصل نشط" : "خامل / غير متصل",
        new Date(log.last_ping).toLocaleString('ar-EG'),
        log.allow_reentry ? "مسموح" : "مغلق"
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.map(item => `"${String(item).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `تقرير_متابعة الأجهزة_المباشرة_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-sm font-arabic max-w-full" dir="rtl">
      
      {/* Upper Status Ribbon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-xs text-indigo-600 font-black tracking-wide uppercase">قناة المتابعة والتحكم المباشر بالامتحانات (Supabase Live)</span>
          </div>
          <h2 className="text-xl font-black text-slate-900">رصد وتحليل تفاعل الطلاب مباشر ⚡</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Connection status pill */}
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black tracking-normal ${
            isConnected 
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
              : "bg-red-50 text-red-700 border border-red-200"
          }`}>
            {isConnected ? (
              <>
                <Wifi size={13} className="animate-pulse" />
                قناة البث متصلة ونشطة
              </>
            ) : (
              <>
                <WifiOff size={13} />
                قناة البث منقطعة
              </>
            )}
          </span>

          <button 
            onClick={fetchActiveLogs}
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-all cursor-pointer"
            title="تحديث البيانات يدبويًا"
          >
            <RefreshCw size={15} />
          </button>

          <button 
            onClick={exportLogsToExcel}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl border border-indigo-100 text-[11px] font-black flex items-center gap-1.5 cursor-pointer transition-all"
            title="تصدير السجلات الحالية كـ CSV"
          >
            <Download size={14} />
            <span>تصدير تقرير متكامل</span>
          </button>
        </div>
      </div>

      {/* Analytics KPI Ribbon Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl">
          <div className="text-slate-400 font-extrabold text-xs mb-1">الطلاب المتصلين حالياً</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">{metrics.active}</span>
            <span className="text-[10px] font-bold text-slate-400">ينبض نشاطاً</span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl">
          <div className="text-slate-400 font-extrabold text-xs mb-1">إجمالي الحسابات المسجلة</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{metrics.total}</span>
            <span className="text-[10px] font-bold text-slate-400">جهاز نشط اليوم</span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl">
          <div className="text-slate-400 font-extrabold text-xs mb-1">مرحلة إتمام وحفظ الأجوبة</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-600">{metrics.completed}</span>
            <span className="text-[10px] font-bold text-slate-400">مكتمل</span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl">
          <div className="text-slate-400 font-extrabold text-xs mb-1">قيد الدخول / الانتظار</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600">{metrics.pending}</span>
            <span className="text-[10px] font-bold text-slate-400">جاري الدخول</span>
          </div>
        </div>
      </div>

      {/* Control Filters Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Search */}
        <div className="relative">
          <input 
            type="text"
            placeholder="البحث عن طريق الاسم، الكود أو الكنيسة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-250 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/25 transition-all"
          />
          <Search className="absolute right-3.5 top-3 text-slate-400" size={16} />
        </div>

        {/* Stage Filter */}
        <div className="relative">
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-250 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/25 transition-all text-slate-700"
          >
            <option value="الكل">كل المراحل الدراسية ({distinctStages.length})</option>
            {distinctStages.map(stg => (
              <option key={stg} value={stg}>{stg}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-250 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/25 transition-all text-slate-700"
          >
            <option value="الكل">جميع الأجهزة (متصل وخامل)</option>
            <option value="نشط">الاتصال النشط فقط (Pinging) 🟢</option>
            <option value="خامل">غير المتصلين/الخاملين 💤</option>
            <option value="مسموح_بالإعادة">المسموح لهم بإعادة الدخول 🔄</option>
          </select>
        </div>
      </div>

      {/* Main Monitoring Table */}
      <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
              <th className="p-4" style={{ width: '220px' }}>اسم وبيانات الطالب</th>
              <th className="p-4">الكنيسة والمرحلة</th>
              <th className="p-4" style={{ width: '240px' }}>جهاز الفحص والمستعرض</th>
              <th className="p-4 text-center">آخر إشارة نبض</th>
              <th className="p-4 text-center" style={{ width: '130px' }}>صلاحية الإعادة</th>
              {!hideActions && <th className="p-4 text-center" style={{ width: '150px' }}>عمليات إدارية</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150">
            <AnimatePresence initial={false}>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs text-slate-400 font-extrabold">
                    <Loader2 className="animate-spin text-indigo-600 mx-auto mb-2" size={24} />
                    جاري الاتصال والتحقق مع قاعدة البيانات للرصد الحي...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs text-slate-400 font-black">
                    <AlertCircle className="text-slate-400 mx-auto mb-2" size={24} />
                    لا توجد أجهزة نشطة حاليًا تطابق الفلاتر في هذه الكنيسة.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const pingTime = new Date(log.last_ping).getTime();
                  const isPingActive = (Date.now() - pingTime) < 35000;
                  const minutesAgo = Math.floor((Date.now() - pingTime) / 60000);
                  
                  return (
                    <motion.tr 
                      key={log.id || log.student_id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`hover:bg-slate-50/50 transition-colors text-xs font-bold text-slate-700 ${
                        isPingActive ? 'bg-emerald-50/10' : ''
                      }`}
                    >
                      {/* Name & ID */}
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          {/* Live Traffic state check dot */}
                          <span className={`h-3 w-3 rounded-full shrink-0 ${
                            isPingActive ? 'bg-emerald-500 animate-ping' : 'bg-slate-350'
                          }`} title={isPingActive ? "متصل ونشط حاليًا" : "غير متصل / خامل"}></span>

                          <div>
                            <div className="font-black text-slate-900 truncate max-w-[180px]">{log.student_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono tracking-wider">{log.student_id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Church & Stage */}
                      <td className="p-4">
                        <div className="font-black text-slate-800 truncate max-w-[170px]">{log.church || 'كنيسة عامة'}</div>
                        <div className="text-[10px] text-indigo-600 font-extrabold mt-0.5">{log.stage || 'غير محددة'}</div>
                      </td>

                      {/* Device User Agent details with icons */}
                      <td className="p-4 text-slate-500">
                        <div className="flex items-center gap-1 text-[10px] truncate max-w-[220px]" title={log.device_name}>
                          <Monitor size={12} className="text-slate-400 shrink-0" />
                          <span>{log.device_name || 'Generic Web Browser'}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[9px] text-slate-400">
                          <span>IP: {log.ip_address || '127.0.0.1'}</span>
                          {log.device_type && <span className="bg-slate-100 text-slate-600 px-1 rounded-sm">{log.device_type}</span>}
                          {log.os_version && <span className="bg-slate-100 text-slate-600 px-1 rounded-sm">{log.os_version}</span>}
                        </div>
                      </td>

                      {/* Last Pulse */}
                      <td className="p-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1 text-slate-600 font-mono">
                          <Clock size={12} className="text-slate-400" />
                          <span>
                            {isPingActive 
                              ? "الآن (متصل)" 
                              : minutesAgo <= 0 
                                ? "منذ ثوانٍ" 
                                : `منذ ${minutesAgo} دقيقة`
                            }
                          </span>
                        </div>
                        <span className="text-[8px] font-black text-slate-400 inline-block mt-0.5">
                          {new Date(log.last_ping).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </td>

                      {/* Reentry Status toggle show */}
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black ${
                          log.allow_reentry 
                            ? "bg-amber-100 text-amber-800 border border-amber-200" 
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}>
                          {log.allow_reentry ? (
                            <>
                              <Unlock size={11} />
                              مسموح بإعادة الدخول
                            </>
                          ) : (
                            <>
                              <Lock size={11} />
                              دخول لمرة واحدة
                            </>
                          )}
                        </span>
                      </td>

                      {/* Operations */}
                      {!hideActions && (
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* Toggle Reentry permission button */}
                            <button
                              onClick={() => toggleReentry(log)}
                              disabled={actioningId === log.student_id}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                log.allow_reentry
                                  ? "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                              }`}
                              title={log.allow_reentry ? "حظر إعادة الدخول الفوري" : "السماح بإعادة الدخول الفوري"}
                            >
                              {log.allow_reentry ? <Lock size={13} /> : <Unlock size={13} />}
                            </button>

                            {/* Reset full exam - which clears results, inserts new wait log */}
                            {onResetExam && (
                              <button
                                onClick={() => onResetExam(log.student_id, log.student_name)}
                                disabled={actioningId === log.student_id}
                                className="p-1.5 bg-red-50 hover:bg-red-150 text-red-700 border border-red-200 rounded-lg transition-all cursor-pointer"
                                title="إعادة تصفير كامل للامتحان وأرشفة المحاولة"
                              >
                                <RefreshCw size={13} className={actioningId === log.student_id ? "animate-spin" : ""} />
                              </button>
                            )}

                            {/* Clear log completely - Kick student device */}
                            <button
                              onClick={() => removeFootprint(log.student_id, log.student_name)}
                              disabled={actioningId === log.student_id}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition-all cursor-pointer"
                              title="حذف جهاز التحقق (طرد فوري)"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      )}
                    </motion.tr>
                  );
                })
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Helper tips for controllers */}
      <div className="mt-4 p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-start gap-2.5 text-[11px] text-indigo-950 font-medium">
        <ShieldAlert className="text-indigo-600 shrink-0 mt-0.5" size={14} />
        <p className="leading-relaxed font-bold">
          💡 <strong>إرشادات المراقبة الفنية:</strong> الطلاب يرسلون إشارة نبضات (Pings) تلقائية كل ٣٠ ثانية أثناء استمرار فتح الامتحان. في حال واجه طالب مشكلة انقطاع بالإنترنت أو الخروج المفاجئ، يمكنك الضغط على زر <strong>"السماح بإعادة الدخول" <Unlock className="inline text-amber-700" size={11} /></strong> لتمكينه من معاودة الإجابة دون فقدان تقدمه، أو الضغط على <strong>"تحديث وأرشفة المحاولة"</strong> لإعادة الامتحان بأكمله.
        </p>
      </div>

    </div>
  );
};

// Loader custom replacement
const Loader2: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 16 }) => {
  return (
    <svg 
      className={`animate-spin ${className}`} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      style={{ width: size, height: size }}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
};
