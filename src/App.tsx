import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function App() {
  const [examData, setExamData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExamData = async () => {
    setLoading(true);
    setError(null);
    setExamData(null);

    // تنظيف الكلمات من أي مسافات زائدة
    const cleanStage = "حضانة".trim();
    const cleanSubject = "دراسي".trim();

    console.log("Searching for:", { cleanStage, cleanSubject });

    const { data, error } = await supabase
      .from('exams_pool')
      .select('id, exam_title, questions_data, stage, subject')
      .eq('stage', cleanStage)
      .eq('subject', cleanSubject)
      .eq('is_active', true)
      .maybeSingle();

    setLoading(false);

    if (error) {
      console.error("Supabase Error:", error);
      setError(error.message);
      return;
    }
    
    if (!data) {
      console.warn("لا يوجد امتحان مطابق لـ:", cleanStage, cleanSubject);
      setError("لا يوجد امتحان مطابق.");
    } else {
      console.log("تم العثور على الامتحان:", data);
      setExamData(data);
    }
  };

  return (
    <div className="min-h-screen p-8 text-center bg-gray-50 text-gray-900">
      <h1 className="text-3xl font-bold mb-6">بحث عن امتحان</h1>
      
      <button 
        onClick={fetchExamData}
        disabled={loading}
        className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "جاري البحث..." : "بحث"}
      </button>

      {error && (
        <div className="mt-4 text-red-600 font-medium">{error}</div>
      )}

      {examData && (
        <div className="mt-8 p-6 max-w-xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 text-right">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">{examData.exam_title || 'بدون عنوان'}</h2>
          <div className="text-gray-600 space-y-2">
            <p><strong>المرحلة:</strong> {examData.stage}</p>
            <p><strong>المادة:</strong> {examData.subject}</p>
            {/* يمكنك عرض الأسئلة هنا */}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
