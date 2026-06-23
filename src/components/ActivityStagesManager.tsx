import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  getCustomActivities, 
  addCustomActivity, 
  toggleCustomActivityStatus, 
  deleteCustomActivity, 
  CustomActivity 
} from '../utils/activitiesService';
import { Plus, Trash2, CheckCircle, AlertCircle, RefreshCw, ToggleLeft, ToggleRight, Sparkles, Database } from 'lucide-react';

interface Stage {
  id: number;
  activity_type: string;
  stage_name: string;
  form_type: string;
}

export default function ActivityStagesManager() {
  const [activityType, setActivityType] = useState<string>('');
  const [stageName, setStageName] = useState<string>('');
  const [formType, setFormType] = useState<string>('');
  const [stagesList, setStagesList] = useState<Stage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // States for Dynamic Custom Activities
  const [customActivitiesList, setCustomActivitiesList] = useState<CustomActivity[]>([]);
  const [newActivityName, setNewActivityName] = useState<string>('');
  const [activityLoading, setActivityLoading] = useState<boolean>(false);
  const [activityActionLoading, setActivityActionLoading] = useState<boolean>(false);
  const [activityError, setActivityError] = useState<string | null>(null);

  const fetchStages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_stages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStagesList(data || []);
    } catch (err: any) {
      console.error('Error fetching stages:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadActivitiesData = async () => {
    setActivityLoading(true);
    setActivityError(null);
    try {
      const data = await getCustomActivities();
      setCustomActivitiesList(data);
    } catch (err: any) {
      setActivityError(err.message || 'فشل تحميل الأنشطة');
    } finally {
      setActivityLoading(false);
    }
  };

  useEffect(() => {
    fetchStages();
    loadActivitiesData();
  }, []);

  // Filter only active activities to use in stage creation
  const availableActivities = customActivitiesList
    .filter(act => act.is_active)
    .map(act => act.name);

  const handleAddStage = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!activityType || !stageName || !formType) {
      setMessage({ text: 'الرجاء ملء جميع الحقول المطلوبة', isError: true });
      return;
    }

    setSubmitLoading(true);

    try {
      const { data, error } = await supabase
        .from('activity_stages')
        .insert([
          {
            activity_type: activityType,
            stage_name: stageName,
            form_type: formType,
          },
        ])
        .select();

      if (error) throw error;

      setMessage({ text: 'تم إضافة المرحلة بنجاح! 🎉', isError: false });
      
      setStageName('');
      setFormType('');

      if (data && data[0]) {
        setStagesList((prev) => [data[0] as Stage, ...prev]);
      }
    } catch (err: any) {
      console.error('Insert failed:', err.message);
      setMessage({ text: `فشل الحفظ: ${err.message}`, isError: true });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteStage = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من مسح هذه المرحلة؟')) return;

    try {
      const { error } = await supabase
        .from('activity_stages')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setStagesList((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      alert(`فشل الحذف: ${err.message}`);
    }
  };

  // Dynamic Activity Actions
  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setActivityError(null);
    const cleanName = newActivityName.trim();
    if (!cleanName) return;

    setActivityActionLoading(true);
    try {
      await addCustomActivity(cleanName);
      setNewActivityName('');
      await loadActivitiesData();
      // Dispatch custom event to notify App.tsx if it is listening
      window.dispatchEvent(new Event('custom-activities-updated'));
    } catch (err: any) {
      setActivityError(err.message || 'فشل إضافة النشاط');
    } finally {
      setActivityActionLoading(false);
    }
  };

  const handleToggleActivity = async (id: string | number, currentStatus: boolean) => {
    setActivityError(null);
    try {
      await toggleCustomActivityStatus(id, !currentStatus);
      await loadActivitiesData();
      window.dispatchEvent(new Event('custom-activities-updated'));
    } catch (err: any) {
      setActivityError(err.message || 'فشل تعديل حالة النشاط');
    }
  };

  const handleDeleteActivityAction = async (id: string | number, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف النشاط "${name}" نهائياً من القائمة؟`)) return;
    setActivityError(null);
    try {
      await deleteCustomActivity(id);
      await loadActivitiesData();
      window.dispatchEvent(new Event('custom-activities-updated'));
    } catch (err: any) {
      setActivityError(err.message || 'فشل حذف النشاط');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-slate-50 rounded-2xl border border-slate-100 shadow-xl mt-8" dir="rtl">
      
      {/* 2️⃣ Dynamic Activities Management Section (Our Custom module) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-md mb-8">
        <div className="flex items-center gap-3 border-b border-indigo-50 pb-4 mb-5">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Sparkles size={22} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800">إدارة الأنشطة والأقسام ديناميكياً ⭐</h3>
            <p className="text-xs text-slate-500 font-bold mt-0.5">يمكنك إضافة، تعطيل أو حذف مجالات الأنشطة الأخرى لتنعكس فوراً على مستوى النظام وحسابات الطلبة.</p>
          </div>
        </div>

        {activityError && (
          <div className="p-3.5 mb-4 rounded-xl text-center bg-red-50 border border-red-100 text-red-700 text-sm font-bold flex items-center justify-center gap-2">
            <AlertCircle size={18} />
            {activityError}
          </div>
        )}

        {/* Form to add activity */}
        <form onSubmit={handleCreateActivity} className="flex gap-3 mb-6 items-end">
          <div className="flex-1">
            <label className="block text-slate-700 font-black text-xs mb-1.5">اسم النشاط الجديد:</label>
            <input
              type="text"
              value={newActivityName}
              onChange={(e) => setNewActivityName(e.target.value)}
              placeholder="مثال: رسم، أشغال يدوية، مسرحية..."
              className="w-full p-3 border border-slate-200 bg-slate-50/50 rounded-xl outline-none focus:bg-white focus:border-indigo-500 transition-all text-slate-800 text-sm font-bold"
              required
            />
          </div>
          <button
            type="submit"
            disabled={activityActionLoading || !newActivityName.trim()}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:shadow-indigo-100 transition-all disabled:opacity-50 text-sm cursor-pointer"
          >
            {activityActionLoading ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <Plus size={18} />
            )}
            <span>إضافة نشاط</span>
          </button>
        </form>

        {/* Table or Grid of Activities */}
        <div>
          <label className="block text-slate-700 font-black text-xs mb-2.5">الأنشطة الحالية المسجلة بالنظام:</label>
          
          {activityLoading ? (
            <div className="flex items-center justify-center py-6 text-slate-400 gap-2 font-bold text-xs">
              <RefreshCw size={16} className="animate-spin text-indigo-500" />
              جاري مزامنة مجالات الأنشطة...
            </div>
          ) : customActivitiesList.length === 0 ? (
            <p className="text-center text-slate-400 py-6 font-bold text-sm">لا يوجد أنشطة مسجلة حالياً.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {customActivitiesList.map((activity) => (
                <div 
                  key={activity.id} 
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                    activity.is_active 
                      ? 'bg-slate-50/60 border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/5' 
                      : 'bg-red-50/5 border-red-100 grayscale-[0.3]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-3 h-3 rounded-full ${activity.is_active ? 'bg-emerald-500' : 'bg-red-400'}`}></span>
                    <span className="font-black text-slate-700 text-sm">{activity.name}</span>
                    {!activity.is_active && (
                      <span className="text-[10px] font-bold bg-red-100 border border-red-200 text-red-600 px-1.5 py-0.5 rounded-full">معطل</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Toggle Switch */}
                    <button
                      onClick={() => handleToggleActivity(activity.id, activity.is_active)}
                      className="p-1 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                      title={activity.is_active ? "تعطيل النشاط" : "تفعيل النشاط"}
                    >
                      {activity.is_active ? (
                        <ToggleRight className="text-emerald-500" size={30} />
                      ) : (
                        <ToggleLeft className="text-slate-300" size={30} />
                      )}
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteActivityAction(activity.id, activity.name)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="حذف النشاط نهائياً"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Database Migration helper */}
        <div className="mt-5 p-4 bg-amber-50/60 border border-amber-150 rounded-xl text-xs text-amber-800 leading-relaxed space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-amber-900">
            <Database size={14} />
            <span>معلومة تقنية - ربط قاعدة البيانات:</span>
          </div>
          <div>
            النظام يعمل بكفاءة تامة وتلقائية للنسخ الاحتياطي والمزامنة. للتأكد من تخزين الأنشطة ضمن قاعدة بيانات Supabase المستقرة بشكل دائم وتثبيت صلاحيات الأمان والـ RLS، يرجى تشغيل المهاجرة والـ SQL Script المحفوظ في المهاجرات بالنظام.
          </div>
        </div>
      </div>

      {/* 2️⃣ Activity Stages Section */}
      <h2 className="text-2xl font-black mb-6 text-indigo-800 border-b pb-3 flex items-center gap-2 mt-10">
        <span>إدارة مراحل الأنشطة</span>
        <span className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold px-2 py-0.5 rounded-full">المراحل التعليمية</span>
      </h2>

      {message && (
        <div className={`p-4 mb-4 rounded-xl text-center font-bold ${message.isError ? 'bg-red-105 border border-red-200 text-red-700' : 'bg-green-105 border border-green-200 text-green-700'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleAddStage} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-8">
        <div>
          <label className="block text-slate-750 font-black text-xs mb-1.5">نوع النشاط:</label>
          <select
            value={activityType}
            onChange={(e) => setActivityType(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-800 font-bold text-sm"
            required
          >
            <option value="">-- اختر النشاط --</option>
            {availableActivities.map((act) => <option key={act} value={act}>{act}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-slate-755 font-black text-xs mb-1.5">اسم المرحلة:</label>
          <input
            type="text"
            value={stageName}
            onChange={(e) => setStageName(e.target.value)}
            placeholder="مثال: ابتدائي، إعدادي..."
            className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-bold text-sm bg-white"
            required
          />
        </div>

        <div>
          <label className="block text-slate-755 font-black text-xs mb-1.5">نوع الفورم:</label>
          <select
            value={formType}
            onChange={(e) => setFormType(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-800 font-bold text-sm"
            required
          >
            <option value="">-- اختر نوع الفورم --</option>
            <option value="جماعي">جماعي</option>
            <option value="فردي">فردي</option>
            <option value="عزف">عزف</option>
          </select>
        </div>

        <div className="md:col-span-3 pt-2">
          <button
            type="submit"
            disabled={submitLoading || availableActivities.length === 0}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-3.5 rounded-xl font-bold transition disabled:bg-gray-400 cursor-pointer shadow-md text-sm"
          >
            {submitLoading ? 'جاري الإضافة...' : 'إضافة المرحلة'}
          </button>
        </div>
      </form>

      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-black mb-3.5 text-slate-800">المراحل والشرائح التعليمية المسجلة حالياً:</h3>
        
        {loading ? (
          <p className="text-center text-slate-400 py-6 font-bold text-xs flex items-center justify-center gap-2">
            <RefreshCw size={16} className="animate-spin text-indigo-500" />
            جاري تحفيظ المراحل الحالية...
          </p>
        ) : stagesList.length === 0 ? (
          <p className="text-center text-slate-400 py-4 font-bold text-sm">لا توجد مراحل مسجلة حاليًا.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold">
                  <th className="p-3 font-black text-xs">النشاط الرئيسي</th>
                  <th className="p-3 font-black text-xs">شريحة المرحلة</th>
                  <th className="p-3 font-black text-xs">نوع وتنسيق التقييم</th>
                  <th className="p-3 text-center font-black text-xs">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {stagesList.map((stage) => (
                  <tr key={stage.id} className="border-b border-slate-100 hover:bg-slate-50/50 font-semibold text-slate-700">
                    <td className="p-3 font-bold text-slate-800">{stage.activity_type}</td>
                    <td className="p-3 text-slate-600">{stage.stage_name}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                        stage.form_type === 'جماعي' ? 'bg-sky-50 border border-sky-100 text-sky-700' :
                        stage.form_type === 'عزف' ? 'bg-purple-50 border border-purple-100 text-purple-700' : 'bg-amber-50 border border-amber-100 text-amber-700'
                      }`}>
                        {stage.form_type}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDeleteStage(stage.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 font-black text-xs px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                      >
                        مسح
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
