import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { 
  Activity, 
  Users, 
  Monitor, 
  RotateCw, 
  Trash2, 
  ShieldX, 
  UserMinus, 
  RotateCcw, 
  Search, 
  Filter, 
  Smartphone, 
  Laptop
} from 'lucide-react';

export interface DeviceLog {
  id: string;
  student_id: string;
  student_name: string;
  stage: string;
  church: string;
  church_name?: string;
  device_name: string;
  device_model?: string;
  device_type: string;
  os_version: string;
  device_os?: string;
  ip_address: string;
  last_known_ip: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

interface AdminLiveMonitoringProps {
  onResetExam?: (studentId: string, name?: string) => void;
  globalChurchFilter?: string;
}

const AdminLiveMonitoring: React.FC<AdminLiveMonitoringProps> = ({ 
  onResetExam, 
  globalChurchFilter = 'الكل' 
}) => {
  const [logs, setLogs] = useState<DeviceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState('الكل');
  const [selectedChurch, setSelectedChurch] = useState(globalChurchFilter);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Real-time statistics states
  const [activeExamsRealCount, setActiveExamsRealCount] = useState(0);
  const [submittedExamsRealCount, setSubmittedExamsRealCount] = useState(0);
  const [totalDevicesRealCount, setTotalDevicesRealCount] = useState(0);

  // Fetch real-time statistics from dedicated tables/views
  const fetchRealtimeStats = async () => {
    try {
      // 1. Fetch from active_sessions for active count and unique devices
      const { data: sessions, error: sessionErr } = await supabase
        .from('active_sessions')
        .select('status, device_id, student_id');

      if (!sessionErr && sessions) {
        const activeOnly = sessions.filter(s => s.status === 'active');
        setActiveExamsRealCount(activeOnly.length);
        
        // Count total unique device fingerprints across ALL active/recently logged sessions
        const deviceIds = sessions.map(s => s.device_id).filter(Boolean);
        const uniqueDevices = new Set(deviceIds);
        
        // Fallback to logs count if sessions table is less populated than logs
        setTotalDevicesRealCount(Math.max(uniqueDevices.size, logs.length));
      }

      // 2. Fetch from exam_submissions for total completed exams
      const { count, error: subErr } = await supabase
        .from('exam_submissions')
        .select('*', { count: 'exact', head: true });

      if (!subErr) {
        setSubmittedExamsRealCount(count || 0);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard metrics:", err);
    }
  };

  // Fetch device logs from Supabase
  const fetchLiveLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('exam_device_logs')
        .select('*')
        .order('created_at', { ascending: false }); // Show newest logs first

      if (error) throw error;
      if (data) {
        setLogs(data);
      }
    } catch (err) {
      console.error("Error fetching live device logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveLogs();
    fetchRealtimeStats();

    // Set up realtime subscription for instantaneous live tracking of device logs
    const logsSubscription = supabase
      .channel('exam_device_logs_changes_realtime')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'exam_device_logs' }, 
        () => {
          // Fetch updated logs on any changes (insert, update, delete)
          fetchLiveLogs();
        }
      )
      .subscribe();

    // Set up realtime subscription for session changes (Point 1 & 3)
    const sessionsSubscription = supabase
      .channel('active_sessions_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'active_sessions' },
        () => {
          fetchRealtimeStats();
        }
      )
      .subscribe();

    // Set up realtime subscription for exam submissions to enable instant sync on submit actions (Point 2)
    const submissionsSubscription = supabase
      .channel('live-submissions')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'exam_submissions' }, 
        () => {
          // Trigger fetch updated logs / active participant list dynamically
          fetchLiveLogs(); 
          fetchRealtimeStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(logsSubscription);
      supabase.removeChannel(sessionsSubscription);
      supabase.removeChannel(submissionsSubscription);
    };
  }, []);

  // Update filter when global filter changes
  useEffect(() => {
    if (globalChurchFilter) {
      setSelectedChurch(globalChurchFilter);
    }
  }, [globalChurchFilter]);

  // Administration actions mirroring existing LiveExamMonitoring
  const handleTerminateSession = async (studentId: string) => {
    if (!confirm('هل أنت متأكد من طرد هذا الطالب وحظر جهازه من الامتحان؟')) return;
    
    setIsProcessing(studentId);
    try {
      const { error } = await supabase
        .from('exam_device_logs')
        .update({
          status: 'terminated',
          created_at: new Date().toISOString()
        })
        .eq('student_id', studentId);

      if (error) throw error;
      alert('تم إرسال أمر الطرد والإنهاء بنجاح 🛑');
      fetchLiveLogs();
    } catch (e: any) {
      console.error(e);
      alert('فشل أمر الطرد: ' + e.message);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleClearBlacklist = async (studentId: string) => {
    if (!confirm('هل تريد فك الحظر عن هذا الجهاز لتسمح له بالمحاولة مجدداً؟')) return;
    setIsProcessing(studentId);
    try {
      const { error } = await supabase
        .from('exam_device_logs')
        .update({
          status: 'جاري الامتحان',
          created_at: new Date().toISOString()
        })
        .eq('student_id', studentId);

      if (error) throw error;
      alert('تم إزالة حظر الجهاز بنجاح ✅');
      fetchLiveLogs();
    } catch (e: any) {
      alert('حدث خطأ أثناء فك الحظر: ' + e.message);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDeleteLogRow = async (logId: any, studentId: string) => {
    if (!confirm('هل تريد حذف هذا السجل نهائياً من شاشة المراقبة؟ سيؤدي ذلك أيضاً لحذف الجلسة النشطة والسماح للطالب بالدخول مجدداً.')) return;
    setIsProcessing(studentId);
    try {
      // 1. Delete from exam_device_logs SURGICALLY by its unique row ID (supports integers/UUIDs safely)
      await supabase
        .from('exam_device_logs')
        .delete()
        .eq('id', logId);

      // 2. Delete from active_sessions for this student to reset their gate access
      await supabase
        .from('active_sessions')
        .delete()
        .eq('student_id', studentId);

      alert('تم حذف السجل والجلسة بنجاح 🗑️');
      fetchLiveLogs();
      fetchRealtimeStats();
    } catch (e: any) {
      console.error(e);
      alert('حدث خطأ أثناء رغبتك بالمسح');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleResetAllMonitoring = async () => {
    if (!confirm('سيتم حذف كافة بيانات المراقبة المباشرة وسجلات الأجهزة وكافة الجلسات النشطة! هل أنت متأكد؟')) return;
    setLoading(true);
    try {
      await Promise.all([
        supabase.from('exam_device_logs').delete().neq('student_id', '0'),
        supabase.from('active_sessions').delete().neq('student_id', '0')
      ]);
      alert('تمت تصفير كافة السجلات والجلسات بنجاح وتهيئتها 🧹');
      fetchLiveLogs();
      fetchRealtimeStats();
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء حذف كافة السجلات');
    } finally {
      setLoading(false);
    }
  };

  const handleForceSubmit = async (studentId: string, studentName: string) => {
    if (!confirm(`هل أنت متأكد من إنهاء الاختبار وسحب ورقة الطالب ${studentName || ''}؟`)) return;
    setIsProcessing(studentId);
    try {
      // 1. Update status in exam_device_logs to 'submitted'
      const { error: logErr } = await supabase
        .from('exam_device_logs')
        .update({
          status: 'submitted',
          created_at: new Date().toISOString()
        })
        .eq('student_id', studentId);

      if (logErr) throw logErr;

      // 2. Also update status in active_sessions to 'submitted'
      await supabase
        .from('active_sessions')
        .delete()
        .eq('student_id', studentId);

      const { error: activeErr } = await supabase
        .from('active_sessions')
        .insert({
          student_id: studentId,
          status: 'submitted',
          allowReentry: false,
          lastUpdate: new Date().toISOString()
        });

      if (activeErr) throw activeErr;

      alert('تم إنهاء الاختبار وسحب الورقة بنجاح 📄');
      fetchLiveLogs();
      fetchRealtimeStats();
    } catch (e: any) {
      console.error(e);
      alert('فشل سحب الورقة: ' + e.message);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleResetOpenExam = async (studentId: string, studentName: string) => {
    if (!confirm(`هل أنت متأكد من إعادة تعيين وفتح الامتحان للطالب ${studentName || ''}؟ سيؤدي هذا لتصفير محاولته والسماح له بالدخول مجدداً.`)) return;
    setIsProcessing(studentId);
    try {
      // 1. Delete submission from exam_submissions to allow re-entry
      const { error: subErr } = await supabase
        .from('exam_submissions')
        .delete()
        .eq('student_id', studentId);

      if (subErr) throw subErr;

      // 2. Set active_sessions details status to 'active' & allowing reentry
      await supabase
        .from('active_sessions')
        .delete()
        .eq('student_id', studentId);

      const { error: activeErr } = await supabase
        .from('active_sessions')
        .insert({
          student_id: studentId,
          status: 'active',
          allowReentry: true,
          lastUpdate: new Date().toISOString()
        });

      if (activeErr) throw activeErr;

      // 3. Reset exam_device_logs row status back to 'active' or 'جاري الامتحان'
      const { error: devErr } = await supabase
        .from('exam_device_logs')
        .update({
          status: 'جاري الامتحان',
          created_at: new Date().toISOString()
        })
        .eq('student_id', studentId);

      if (devErr) throw devErr;

      // 4. Trigger optional callback if passed
      if (onResetExam) {
        try {
          await onResetExam(studentId, studentName);
        } catch (err) {
          console.warn("Prop callback list sync finished with warnings:", err);
        }
      }

      alert('تم إعادة تعيين النتيجة وفتح الامتحان بنجاح! ✅');
      fetchLiveLogs();
      fetchRealtimeStats();
    } catch (e: any) {
      console.error(e);
      alert('فشل إعادة فتح الامتحان: ' + e.message);
    } finally {
      setIsProcessing(null);
    }
  };

  // Get unique churches and stages for filter buttons
  const uniqueChurches = Array.from(new Set(logs.map(log => log.church || log.church_name || 'غير محدد'))).filter(Boolean);
  const uniqueStages = Array.from(new Set(logs.map(log => log.stage || 'غير محدد'))).filter(Boolean);

  // Filter logs locally
  const filteredLogs = logs.filter(log => {
    const logChurch = log.church || log.church_name || 'غير محدد';
    const logStage = log.stage || 'غير محدد';
    
    const matchesSearch = 
      String(log.student_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(log.student_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(log.device_name || log.device_model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String((log as any).device_id || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStage = selectedStage === 'الكل' || logStage === selectedStage;
    const matchesChurch = selectedChurch === 'الكل' || logChurch === selectedChurch;

    return matchesSearch && matchesStage && matchesChurch;
  });

  // Calculate statistics from current active logs
  const totalLogsCount = logs.length;
  const activeExamsCount = logs.filter(log => log.status === 'active' || log.status === 'جاري الامتحان').length;
  const submittedExamsCount = logs.filter(log => log.status === 'submitted' || log.status === 'تم التسليم بنجاح').length;
  const blacklistedCount = logs.filter(log => log.status === 'terminated').length;

  // Pagination Logic
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading && logs.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500 font-sans flex flex-col items-center justify-center gap-4 bg-white rounded-3xl border border-slate-100 shadow-sm" id="live-monitoring-loading">
        <RotateCw className="animate-spin text-indigo-600" size={32} />
        <span className="font-bold">جاري تحميل بيانات المتابعة المباشرة للأجهزة والطلاب...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans relative z-10 pointer-events-auto" id="live-monitoring-container">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative z-20 pointer-events-auto">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Activity className="text-indigo-600 animate-pulse" size={24} />
            لوحة المتابعة المباشرة وسجلات الأجهزة (Device Logs)
          </h2>
          <p className="text-xs text-slate-400 mt-1">تتبع نشاط وجلسات أجهزة الطلاب ومراقبة محاولات الغش أو الانقطاع بشكل فوري.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={handleResetAllMonitoring}
            className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-black rounded-xl border border-rose-150 transition-all flex items-center gap-2"
          >
            <ShieldX size={15} />
            تصفير سجلات المراقبة
          </button>
          <button 
            type="button"
            onClick={fetchLiveLogs}
            className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-black rounded-xl border border-indigo-150 transition-all flex items-center gap-2"
          >
            <RotateCw size={15} />
            تحديث البيانات 🔄
          </button>
        </div>
      </div>
 
      {/* Mini Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase">الامتحانات النشطة حالياً</p>
            <h3 className="text-xl font-black text-slate-800" id="stat-active-exams">{activeExamsRealCount}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase">الامتحانات المسلمة</p>
            <h3 className="text-xl font-black text-slate-800" id="stat-submitted-exams">{submittedExamsRealCount}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
            <ShieldX size={24} />
          </div>
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase">الأجهزة المطرودة/المحظورة</p>
            <h3 className="text-xl font-black text-slate-800">{blacklistedCount}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-600">
            <Monitor size={24} />
          </div>
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase font-sans">إجمالي أجهزة الطلاب</p>
            <h3 className="text-xl font-black text-slate-800" id="stat-total-devices">{totalDevicesRealCount}</h3>
          </div>
        </div>
      </div>

      {/* Database Filters & Live Search */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute right-4 top-3.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="ابحث باسم الطالب، كود التسجيل، أو نوع الجهاز..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm text-slate-700 transition-all"
            />
          </div>

          {/* Stage Filter */}
          <div className="flex items-center gap-2">
            <Filter className="text-slate-400 hidden sm:block" size={18} />
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm text-slate-700 font-sans"
            >
              <option value="الكل">كل المراحل التعليمية</option>
              {uniqueStages.map(stage => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
          </div>

          {/* Church Filter */}
          <div className="flex items-center gap-2">
            <Filter className="text-slate-400 hidden sm:block" size={18} />
            <select
              value={selectedChurch}
              onChange={(e) => setSelectedChurch(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm text-slate-700 font-sans"
            >
              <option value="الكل">كل الكنائس والإيبارشيات</option>
              {uniqueChurches.map(church => (
                <option key={church} value={church}>{church}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Live Logs Table Panel */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative z-10 pointer-events-auto" id="live-logs-table-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-black border-b border-slate-200 uppercase">
                <th className="p-4 pr-6">الطالب</th>
                <th className="p-4">المرحلة</th>
                <th className="p-4">الكنيسة</th>
                <th className="p-4">تفاصيل الجهاز المتصل</th>
                <th className="p-4">عنوان الـ IP</th>
                <th className="p-4">حالة الاتصال للرصد</th>
                <th className="p-4">التوقيت</th>
                <th className="p-4 text-center">التحكم التقني والجلسة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-sm font-sans">
              {paginatedLogs.map((log) => {
                const logChurch = log.church || log.church_name || 'غير مكتمل';
                const logDeviceName = log.device_name || log.device_model || 'متصفح عشوائي';
                const logOsVersion = log.os_version || log.device_os || 'غير معروف';
                const logIp = log.ip_address || log.last_known_ip || 'غير معروف';
                const logDeviceId = (log as any).device_id || 'ID غير محدد';
                const isTerminated = log.status === 'terminated';
                const isActive = log.status === 'active' || log.status === 'جاري الامتحان';
                const isCompleted = log.status === 'submitted' || log.status === 'تم التسليم بنجاح';

                return (
                  <tr key={String(log.id)} className={`hover:bg-indigo-50/25 transition-all text-xs ${isTerminated ? 'opacity-40 grayscale bg-rose-50/10' : ''}`}>
                    {/* Student Name */}
                    <td className="p-4 pr-6 font-black text-slate-900">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-black flex items-center gap-1.5">
                          {log.student_name}
                          {isActive && <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse inline-block shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
                          {isCompleted && <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full inline-block" />}
                          {isTerminated && <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded text-[9px] font-black">مطرود وعنيف</span>}
                        </span>
                        <span className="text-[10px] text-slate-450 font-mono">ID: {String(log.student_id)}</span>
                      </div>
                    </td>

                    {/* Educational Stage */}
                    <td className="p-4 font-bold text-slate-600">{log.stage}</td>

                    {/* Church */}
                    <td className="p-4 text-slate-500 font-semibold">{logChurch}</td>

                    {/* Device info */}
                    <td className="p-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          {log.device_type === 'Mobile' ? <Smartphone size={13} className="text-slate-400" /> : <Laptop size={13} className="text-slate-400" />}
                          {logDeviceName}
                        </span>
                        <div className="flex items-center gap-1 text-[9px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 max-w-fit">
                          <Monitor size={10} />
                          <span className="font-black">{logDeviceId}</span> | {logOsVersion}
                        </div>
                      </div>
                    </td>

                    {/* IP Address */}
                    <td className="p-4 font-mono text-[11px] text-slate-500">{logIp}</td>

                    {/* Status Badge */}
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full font-black text-[10px] inline-block ${
                        isTerminated ? 'bg-rose-50 text-rose-700' :
                        isCompleted ? 'bg-indigo-50 text-indigo-700' :
                        isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {log.status === 'terminated' ? 'مطرود ومحظور' :
                         log.status === 'active' || log.status === 'جاري الامتحان' ? 'جاري الامتحان ⏳' :
                         log.status === 'submitted' || log.status === 'تم التسليم بنجاح' ? 'تم التسليم 🎓' :
                         log.status}
                      </span>
                    </td>

                    {/* Timestamp */}
                    <td className="p-4 text-slate-400 font-bold">
                      {new Date(log.created_at || new Date().toISOString()).toLocaleTimeString('ar-EG', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>

                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2" id={`actions-${String(log.id)}`}>
                          {/* Reset / Open Exam */}
                          <button
                            type="button"
                            onClick={() => handleResetOpenExam(String(log.student_id), log.student_name)}
                            disabled={isProcessing === String(log.student_id)}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-[11px] font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer pointer-events-auto shadow-sm shadow-amber-500/25"
                            title="إعادة تعيين / فتح الامتحان للطالب وتصفير السجل"
                          >
                            <RotateCcw size={12} className={isProcessing === String(log.student_id) ? 'animate-spin' : ''} />
                            إعادة تعيين / فتح الامتحان
                          </button>
 
                          {/* Force Submit / Terminate Sheet */}
                          {isActive && (
                            <button
                              type="button"
                              onClick={() => handleForceSubmit(String(log.student_id), log.student_name)}
                              disabled={isProcessing === String(log.student_id)}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-[11px] font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer pointer-events-auto shadow-sm shadow-rose-600/25"
                              title="إنهاء الاختبار وسحب ورقة الطالب"
                            >
                              <ShieldX size={12} />
                              إنهاء الاختبار / سحب الورقة
                            </button>
                          )}
 
                          {/* Unban / Unblock */}
                          {isTerminated && (
                            <button
                              type="button"
                              onClick={() => handleClearBlacklist(String(log.student_id))}
                              disabled={isProcessing === String(log.student_id)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-750 active:scale-95 text-white text-[11px] font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer pointer-events-auto shadow-sm shadow-emerald-500/25"
                              title="فك حظر الجهاز"
                            >
                              <UserMinus size={12} />
                              فك حظر الجهاز
                            </button>
                          )}
 
                          {/* Delete Log Row */}
                          <button
                            type="button"
                            onClick={() => handleDeleteLogRow(log.id, String(log.student_id))}
                            disabled={isProcessing === String(log.student_id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition-colors cursor-pointer pointer-events-auto"
                            title="حذف هذا السجل فقط"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4">
            <span className="text-[10px] font-black text-slate-400 uppercase">
              عرض الصفحة {currentPage} من {totalPages} (إجمالي {filteredLogs.length} سجل)
            </span>
            <div className="flex items-center gap-1.5 pointer-events-auto">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-black hover:bg-slate-50 disabled:opacity-30 transition-all cursor-pointer pointer-events-auto"
              >
                السابق
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, i, arr) => (
                  <React.Fragment key={p}>
                    {i > 0 && arr[i - 1] !== p - 1 && <span className="text-slate-300">...</span>}
                    <button
                      onClick={() => setCurrentPage(p)}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg text-[10px] font-black transition-all cursor-pointer pointer-events-auto ${
                        currentPage === p ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-black hover:bg-slate-50 disabled:opacity-30 transition-all cursor-pointer pointer-events-auto"
              >
                التالي
              </button>
            </div>
          </div>
        )}

        {filteredLogs.length === 0 && (
          <div className="text-center py-16 text-slate-400 italic bg-slate-50/50">
            لا توجد سجلات أجهزة مطابقة لخيارات البحث أو الفلترة المتاحة.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLiveMonitoring;
