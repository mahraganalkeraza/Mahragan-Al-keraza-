import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

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

  // تحديث قائمة الأنشطة لتشمل كل الأقسام الجديدة
  const availableActivities = [
    'ألحان',
    'كورال',
    'ترنيم فردي',
    'عزف',
    'ثقافية',
    'أدبية',
    'فنون تشكيلية',
    'كمبيوتر'
  ];

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

  useEffect(() => {
    fetchStages();
  }, []);

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

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 rounded-xl shadow-lg mt-8" dir="rtl">
      <h2 className="text-2xl font-bold mb-6 text-indigo-800 border-b pb-3">إدارة مراحل الأنشطة</h2>

      {message && (
        <div className={`p-4 mb-4 rounded-md text-center font-medium ${message.isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleAddStage} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-5 rounded-lg border shadow-sm mb-8">
        <div>
          <label className="block text-gray-700 font-medium mb-1">نوع النشاط:</label>
          <select
            value={activityType}
            onChange={(e) => setActivityType(e.target.value)}
            className="w-full p-2.5 border rounded-md focus:ring-2 focus:ring-indigo-500 bg-gray-50 text-slate-800 font-bold"
          >
            <option value="">-- اختر النشاط --</option>
            {availableActivities.map((act) => <option key={act} value={act}>{act}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">اسم المرحلة:</label>
          <input
            type="text"
            value={stageName}
            onChange={(e) => setStageName(e.target.value)}
            placeholder="مثال: ابتدائي، إعدادي..."
            className="w-full p-2.5 border rounded-md focus:ring-2 focus:ring-indigo-500 text-slate-800 font-bold"
          />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">نوع الفورم:</label>
          <select
            value={formType}
            onChange={(e) => setFormType(e.target.value)}
            className="w-full p-2.5 border rounded-md focus:ring-2 focus:ring-indigo-500 bg-gray-50 text-slate-800 font-bold"
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
            disabled={submitLoading}
            className="w-full bg-indigo-600 text-white p-3 rounded-md font-bold hover:bg-indigo-700 transition disabled:bg-gray-400"
          >
            {submitLoading ? 'جاري الإضافة...' : 'إضافة المرحلة'}
          </button>
        </div>
      </form>

      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-gray-700 font-bold">المراحل المسجلة:</h3>
        {loading ? (
          <p className="text-center text-gray-500 py-4 font-bold">جاري التحميل...</p>
        ) : stagesList.length === 0 ? (
          <p className="text-center text-gray-400 py-4 font-bold">لا توجد مراحل مسجلة حاليًا.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 border-b text-gray-600 font-bold">
                  <th className="p-3">النشاط</th>
                  <th className="p-3">المرحلة</th>
                  <th className="p-3">نوع الفورم</th>
                  <th className="p-3 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {stagesList.map((stage) => (
                  <tr key={stage.id} className="border-b hover:bg-gray-50 font-medium text-slate-800">
                    <td className="p-3 font-semibold text-gray-900">{stage.activity_type}</td>
                    <td className="p-3 text-gray-700 font-semibold">{stage.stage_name}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        stage.form_type === 'جماعي' ? 'bg-blue-100 text-blue-800' :
                        stage.form_type === 'عزف' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {stage.form_type}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDeleteStage(stage.id)}
                        className="text-red-600 hover:text-red-800 font-black text-xs px-2 py-1 hover:bg-red-50 rounded"
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
