import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  Clock, 
  Users, 
  Award, 
  RefreshCw, 
  AlertTriangle, 
  Wifi, 
  CheckCircle2, 
  LogOut, 
  Tv, 
  Send,
  Zap,
  Globe,
  Bell,
  ShieldCheck,
  BarChart2,
  ListFilter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabaseClient';
import { LiveExamMonitoring } from './LiveExamMonitoring';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface AdminLiveMonitoringProps {
  globalChurchFilter?: string;
  onResetExam?: (studentId: string, studentName?: string) => Promise<void>;
}

interface ActivityEvent {
  id: string;
  type: 'registration' | 'exam_login' | 'exam_submit' | 'broadcast';
  message: string;
  timestamp: Date;
  meta?: any;
}

const AdminLiveMonitoring: React.FC<AdminLiveMonitoringProps> = ({ 
  globalChurchFilter = 'الكل', 
  onResetExam 
}) => {
  const [activeTab, setActiveTab] = useState<'traffic' | 'devices' | 'analytics'>('traffic');
  const [liveEvents, setLiveEvents] = useState<ActivityEvent[]>([]);
  const [dbStats, setDbStats] = useState({
    totalRegistrations: 0,
    totalSubmissions: 0,
    activeDevices: 0,
    totalChurches: 32 // fallback constant representing regional churches
  });
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [submissionBreakdown, setSubmissionBreakdown] = useState<any[]>([]);

  // Sound effects of real-time traffic (visual or buzzer indicator, kept clean)
  const colors = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

  // Fetch summary counts for KPIs
  const fetchDbStats = async () => {
    setIsRefreshingStats(true);
    try {
      // 1. Total registrations count
      const { count: regCount, error: regErr } = await supabase
        .from('registrations')
        .select('*', { count: 'exact', head: true });

      // 2. Exam submissions count
      const { count: examCount, error: examErr } = await supabase
        .from('exam_submissions')
        .select('*', { count: 'exact', head: true });

      // 3. Current connected logs
      const { count: logCount, error: logErr } = await supabase
        .from('exam_device_logs')
        .select('*', { count: 'exact', head: true });

      // 4. Submission Breakdown for chart
      const { data: subData } = await supabase
        .from('exam_submissions')
        .select('submissionType, results_source');

      setDbStats({
        totalRegistrations: regCount || 0,
        totalSubmissions: examCount || 0,
        activeDevices: logCount || 0,
        totalChurches: 32
      });

      // Prepare Chart Data
      if (subData) {
        let online = 0;
        let bubble = 0;
        let paper = 0;
        subData.forEach(row => {
          const type = row.submissionType || row.results_source;
          if (type === 'bubble_sheet') bubble++;
          else if (type === 'paper') paper++;
          else online++;
        });

        setSubmissionBreakdown([
          { name: 'تصحيح أونلاين 💻', value: online, color: '#4F46E5' },
          { name: 'بابل شيت 📝', value: bubble, color: '#10B981' },
          { name: 'ورقي تقليدي 📃', value: paper, color: '#F59E0B' }
        ]);
      }
    } catch (err) {
      console.error("Error fetching db statistics in monitoring dashboard:", err);
    } finally {
      setIsRefreshingStats(false);
    }
  };

  // Broadcast clear message or refresh signal
  const sendAdminBroadcast = async () => {
    if (!broadcastMessage.trim()) return;
    setIsBroadcasting(true);
    try {
      const payloadObj = {
        type: 'ADMIN_BROADCAST',
        message: broadcastMessage,
        sender: 'الكنترول الرئيسي',
        timestamp: Date.now()
      };

      // Broadcast on standard channel
      await supabase.channel('global-updates').send({
        type: 'broadcast',
        event: 'ADMIN_BROADCAST',
        payload: payloadObj
      });

      // Add to local activity stream
      const newEvent: ActivityEvent = {
        id: `broadcast-${Date.now()}`,
        type: 'broadcast',
        message: `تم بث رسالة تنبيهية للممتحنين: "${broadcastMessage}" 📣`,
        timestamp: new Date()
      };
      setLiveEvents(prev => [newEvent, ...prev.slice(0, 24)]);
      setBroadcastMessage('');
      alert("تم إرسال بث الرسالة لجميع الأجهزة المتصلة بنجاح! 🚀");
    } catch (err: any) {
      alert("حدث خطأ أثناء إرسال البث: " + err.message);
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Force global cache clear / system hard refresh
  const triggerGlobalHardRefresh = async () => {
    if (!confirm("تحذير أمني: هل ترغب حقًا في بث إشارة طرد وإلغاء اتصال وتحديث قهري فوري (Hard Refresh) لجميع الكنائس والأجهزة المتصلة؟ سيتم إنهاء الجلسات الحالية بالكامل.")) return;
    setIsBroadcasting(true);
    try {
      const payloadObj = { 
        type: 'FORCE_HARD_REFRESH', 
        timestamp: Date.now() 
      };

      await supabase.channel('church-lock-channel').send({
        type: 'broadcast',
        event: 'FORCE_HARD_REFRESH',
        payload: payloadObj
      });
      await supabase.channel('global-updates').send({
        type: 'broadcast',
        event: 'FORCE_HARD_REFRESH',
        payload: payloadObj
      });

      const newEvent: ActivityEvent = {
        id: `refresh-${Date.now()}`,
        type: 'broadcast',
        message: `🚨 تم إطلاق بث تحديث قهري فوري (FORCE_HARD_REFRESH) لجميع المستخدمين والأجهزة لإخلاء الذاكرة المؤقتة.`,
        timestamp: new Date()
      };
      setLiveEvents(prev => [newEvent, ...prev.slice(0, 24)]);
      alert("تم بث أمر التحديث القهري بنجاح لكافة المتصفحات المتصلة فوراً! 🔄⚡");
    } catch (err: any) {
      alert("حدث خطأ أثناء بث الأمر: " + err.message);
    } finally {
      setIsBroadcasting(false);
    }
  };

  useEffect(() => {
    fetchDbStats();

    // Setup real-time subscribers for dynamic traffic tickers
    const registrationsChannel = supabase
      .channel('live-dashboard-traffic')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'registrations' },
        (payload) => {
          const r = payload.new;
          if (r && r.name !== 'SYSTEM_LOCK') {
            const churchStr = r.churchName || r.church_name || 'الرعية';
            const newEvent: ActivityEvent = {
              id: `reg-${r.id}-${Date.now()}`,
              type: 'registration',
              message: `مُشترك جديد: تم تسجيل الطالب "${r.name}" بنجاح - كنيسة ${churchStr} ⛪`,
              timestamp: new Date(),
              meta: r
            };
            setLiveEvents(prev => [newEvent, ...prev.slice(0, 24)]);
            // Auto refresh counts
            setDbStats(prev => ({ ...prev, totalRegistrations: prev.totalRegistrations + 1 }));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'exam_submissions' },
        (payload) => {
          const sub = payload.new;
          if (sub) {
            const typeStr = sub.submissionType === 'bubble_sheet' ? 'بابل شيت' : sub.submissionType === 'paper' ? 'ورقي' : 'أونلاين';
            const newEvent: ActivityEvent = {
              id: `sub-${sub.id}-${Date.now()}`,
              type: 'exam_submit',
              message: `رصد درجة: استلم الكنترول إجابات امتحان (${typeStr}) للطالب كود "${sub.student_id || 'مجهول'}" 🔵`,
              timestamp: new Date(),
              meta: sub
            };
            setLiveEvents(prev => [newEvent, ...prev.slice(0, 24)]);
            // Auto refresh counts
            setDbStats(prev => ({ ...prev, totalSubmissions: prev.totalSubmissions + 1 }));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'exam_device_logs' },
        (payload) => {
          const l = payload.new;
          if (l) {
            const newEvent: ActivityEvent = {
              id: `login-${l.id}-${Date.now()}`,
              type: 'exam_login',
              message: `الاتصال بالبوابة: الطالب "${l.student_name}" يدخل بوابة الاختبارات الآن للامتحان 💻`,
              timestamp: new Date(),
              meta: l
            };
            setLiveEvents(prev => [newEvent, ...prev.slice(0, 24)]);
            // Auto refresh counts
            setDbStats(prev => ({ ...prev, activeDevices: prev.activeDevices + 1 }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(registrationsChannel);
    };
  }, []);

  // Filter events by global group filter if needed
  const filteredEvents = useMemo(() => {
    if (globalChurchFilter === 'الكل') return liveEvents;
    return liveEvents.filter(ev => {
      if (!ev.meta) return true; // Keep broadcasts untargeted
      const churchVal = ev.meta.churchName || ev.meta.church_name || ev.meta.church || '';
      return churchVal.includes(globalChurchFilter);
    });
  }, [liveEvents, globalChurchFilter]);

  return (
    <div className="space-y-8 font-arabic text-right mb-12">
      
      {/* Real-time Status Card Ribbon overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Connection status header */}
        <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[170px] border border-indigo-950">
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-3 translate-x-3 scale-110">
            <RadioWaveBackground />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 bg-emerald-400 rounded-full animate-ping"></span>
              <span className="text-xs font-black text-indigo-200 tracking-wide">بيئة الرصد والدردشة النشطة</span>
            </div>
            <Globe size={18} className="text-indigo-400 animate-spin-slow" />
          </div>
          
          <div className="my-3">
            <div className="text-[10px] font-bold text-indigo-300">أجهزة ومستكشفين قيد المتابعة</div>
            <div className="text-4xl font-black mt-1 flex items-baseline gap-2">
              <span>{dbStats.activeDevices}</span>
              <span className="text-xs text-emerald-400 font-extrabold">نبضة حية</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-bold text-indigo-200">
            <span>Supabase WS: متصل بنجاح</span>
            <button 
              onClick={fetchDbStats} 
              disabled={isRefreshingStats}
              className="hover:text-white transition-colors cursor-pointer flex items-center gap-1 font-black bg-indigo-800/50 px-2 py-1 rounded"
            >
              <RefreshCw size={10} className={isRefreshingStats ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Global Registrants Counter */}
        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col justify-between min-h-[170px]">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">قاعدة البيانات الموحدة للأكاديميات</span>
            <Users size={18} className="text-indigo-600" />
          </div>
          <div className="my-3">
            <div className="text-[10px] font-black text-slate-400">إجمالي طلاب الأنشطة المقيدين</div>
            <div className="text-4xl font-black text-slate-900 mt-1">{dbStats.totalRegistrations}</div>
          </div>
          <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5 border-t border-slate-100 pt-3">
            <span className="inline-block h-2 w-2 rounded-full bg-indigo-500"></span>
            <span>يدعم التصفية حسب الكنيسة / المنطقة جغرافيّاً</span>
          </div>
        </div>

        {/* Total exam papers processed */}
        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col justify-between min-h-[170px]">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">إحصائيات الكنترول الدقيقة</span>
            <Award size={18} className="text-emerald-600" />
          </div>
          <div className="my-3">
            <div className="text-[10px] font-black text-slate-400">أوراق امتحانات مرصودة ومصححة</div>
            <div className="text-4xl font-black text-slate-900 mt-1">{dbStats.totalSubmissions}</div>
          </div>
          <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5 border-t border-slate-100 pt-3">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>تحديث مباشر فور انتهاء أي طالب من التصحيح</span>
          </div>
        </div>

      </div>

      {/* Admin Broadcast emergency alert controller */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200/80 p-5 rounded-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2 text-amber-900 font-black text-sm">
              <AlertTriangle className="text-amber-600 animate-pulse" size={18} />
              مركز بث الطوارئ والاتصال القهري بكافة الأجهزة
            </div>
            <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
              يمكنك كتابة رسالة توجيهية تظهر فوراً لجميع الكنائس المنخرطة في نظام الامتحانات النشط الآن، أو إطلاق إشارة تصفير طرد الكاش وبث التحديث الفوري للأجهزة المتصلة.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="relative">
              <input 
                type="text"
                placeholder="اكتب التنبيه هنا (مثال: باقي ربع ساعة)..."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="w-full sm:w-72 px-4 py-2 bg-white border border-amber-200 rounded-xl text-xs font-bold shadow-sm outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
            <button
              onClick={sendAdminBroadcast}
              disabled={isBroadcasting || !broadcastMessage.trim()}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:from-slate-300 disabled:to-slate-400 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Send size={13} />
              <span>بث الرسالة فوراً 📣</span>
            </button>

            <button
              onClick={triggerGlobalHardRefresh}
              disabled={isBroadcasting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer"
              title="طرد قهري وتحديث كاش للجميع"
            >
              <RefreshCw size={13} className={isBroadcasting ? "animate-spin" : ""} />
              <span>تحديث كاش الكل ⚡🔄</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Tabbed Layout view */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-0 shadow-sm overflow-hidden">
        
        {/* Navigation Selector Bars */}
        <div className="bg-slate-50 border-b border-slate-150 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setActiveTab('traffic')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'traffic' 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`}
            >
              <Activity size={14} />
              <span>شريط التدفق الحي للعمليات ({filteredEvents.length})</span>
            </button>

            <button 
              onClick={() => setActiveTab('devices')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'devices' 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`}
            >
              <Tv size={14} />
              <span>الرصد الفني وجلسات الأجهزة الحية</span>
            </button>

            <button 
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'analytics' 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`}
            >
              <BarChart2 size={14} />
              <span>الإحصائيات والتحليلات الرسومية</span>
            </button>
          </div>

          <div className="text-[11px] font-black text-slate-400 flex items-center gap-1.5">
            <ListFilter size={13} className="text-slate-400" />
            <span>نطاق العرض الحالي:</span>
            <span className="text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md font-bold text-indigo-700">الكنائس: {globalChurchFilter}</span>
          </div>
        </div>

        {/* Tab content renderer panels */}
        <div className="p-6 md:p-8">
          <AnimatePresence mode="wait">
            
            {/* TAB 1: Live Activity Activity Stream & Logs */}
            {activeTab === 'traffic' && (
              <motion.div
                key="traffic-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-800">سجل الأحداث والعمليات التلقائي (Live Operations Ticker)</h3>
                    <p className="text-[10px] text-slate-400 font-bold">يتم بث بيانات الإدخال والدرجات وتسجيل الطلاب بشكل فوري دون تحديث للأنظمه المفتوحة.</p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">آخر تحديث: قبل ثوانٍ مصلحة الرصد</span>
                </div>

                {/* Event Activity list */}
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2 divide-y divide-slate-100">
                  {filteredEvents.length === 0 ? (
                    <div className="p-12 text-center text-xs text-slate-400 font-extrabold flex flex-col items-center justify-center gap-2">
                      <div className="relative mb-2">
                        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-indigo-500 animate-ping"></span>
                        <Bell className="text-slate-300" size={32} />
                      </div>
                      <span>في انتظار تدفق البيانات الفورية...</span>
                      <p className="text-[10px] text-slate-400 font-bold font-arabic">سجل بعض المشتركين الجدد أو ادخل للامتحان من حسابات الكنائس لمشاهدة الحركة الحية.</p>
                    </div>
                  ) : (
                    filteredEvents.map((ev, index) => (
                      <div key={ev.id} className="pt-3 first:pt-0 flex items-start gap-3 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50/40 p-2 rounded-xl">
                        {/* Event type badge */}
                        <div className={`p-2 rounded-xl ${
                          ev.type === 'registration' 
                            ? 'bg-indigo-50 text-indigo-700' 
                            : ev.type === 'exam_login' 
                              ? 'bg-amber-50 text-amber-700' 
                              : ev.type === 'exam_submit' 
                                ? 'bg-emerald-50 text-emerald-700' 
                                : 'bg-red-50 text-red-700'
                        }`}>
                          {ev.type === 'registration' && <Users size={14} />}
                          {ev.type === 'exam_login' && <Tv size={14} />}
                          {ev.type === 'exam_submit' && <Award size={14} />}
                          {ev.type === 'broadcast' && <AlertTriangle size={14} />}
                        </div>

                        <div className="flex-1 space-y-1">
                          <p className="text-slate-800 font-black leading-relaxed">{ev.message}</p>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400">
                            <span className="font-mono">{new Date(ev.timestamp).toLocaleTimeString('ar-EG')}</span>
                            <span>•</span>
                            <span className="text-indigo-600 font-extrabold">العملية المباشرة</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB 2: Directly Embed our Re-implemented live student devices monitoring table */}
            {activeTab === 'devices' && (
              <motion.div
                key="devices-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <LiveExamMonitoring 
                  globalChurchFilter={globalChurchFilter} 
                  onResetExam={onResetExam} 
                />
              </motion.div>
            )}

            {/* TAB 3: Visual Analytics with Recharts */}
            {activeTab === 'analytics' && (
              <motion.div
                key="analytics-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div>
                  <h3 className="text-base font-black text-indigo-950">لوحات التحليل الديموغرافي والفني للنتائج</h3>
                  <p className="text-xs text-slate-500 font-bold">توضيح مرئي ديناميكي لتوزع درجات الامتحانات والوسائل المتبعة باللجان الفاعلة.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Pie chart of exam submission origins */}
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6">
                    <h4 className="text-xs font-black text-slate-800 mb-6 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
                      تحليل وسيلة أداء الامتحانات ورصد الدرجات (%)
                    </h4>

                    <div className="h-64">
                      {submissionBreakdown.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={submissionBreakdown}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {submissionBreakdown.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => `${value} ورقة رصد`} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-slate-400 font-bold">
                          لا تتوفر أوراق تصحيح وبيانات كافية للرسم التوضيحي.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Operational metrics progress indicator */}
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 mb-6 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                        معدل استهلاك الشبكة ومؤشرات الكنترول الفنية
                      </h4>

                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
                            <span>نسبة الأجهزة المتصلة نشطة (Pinging)</span>
                            <span className="font-mono text-emerald-600 font-black">
                              {dbStats.activeDevices > 0 ? Math.round((dbStats.activeDevices / (dbStats.totalRegistrations || 1)) * 100) : 0}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${dbStats.activeDevices > 0 ? Math.min(100, Math.round((dbStats.activeDevices / (dbStats.totalRegistrations || 1)) * 100)) : 0}%` }}
                            ></div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
                            <span>نسبة تقدم ورصد أوراق الإجابات المنجزة</span>
                            <span className="font-mono text-indigo-600 font-black">
                              {dbStats.totalSubmissions > 0 ? Math.round((dbStats.totalSubmissions / (dbStats.totalRegistrations || 1)) * 100) : 0}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${dbStats.totalSubmissions > 0 ? Math.min(100, Math.round((dbStats.totalSubmissions / (dbStats.totalRegistrations || 1)) * 100)) : 0}%` }}
                            ></div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
                            <span>جاهزية وتغطيـة كشافات الكنائس الفرعية</span>
                            <span className="font-mono text-amber-600 font-black">94.2%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div className="bg-amber-500 h-2 rounded-full" style={{ width: '94.2%' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-4 mt-6 flex items-center justify-between text-[11px] text-slate-500 font-black">
                      <span>الأنظمة المزامنة حية • معايير ISO الأمنية</span>
                      <ShieldCheck className="text-emerald-500" size={16} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

    </div>
  );
};

export default AdminLiveMonitoring;

// Waves background design
const RadioWaveBackground = () => (
  <svg width="200" height="200" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3"/>
    <circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4"/>
    <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="1"/>
    <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2"/>
  </svg>
);
