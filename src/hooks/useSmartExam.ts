import { useState, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';

export interface Question {
  id: string;
  stage_name: string;
  subject_name: string;
  difficulty_level: 'easy' | 'medium' | 'hard';
  question_text: string;
  options: any;
  correct_answer: string;
  usage_count: number;
}

export const useSmartExam = () => {
  const [questions, setQuestions] = useState<Question[]>(() => {
    try {
      const cached = localStorage.getItem('current_exam_questions');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const startExam = useCallback(async (
    stage: string,
    subject: string,
    limit: number,
    studentId?: string,
    modelId?: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      // استدعاء الدالة الذكية من السوبابيز لمنع التصادم وجلب أقل الأسئلة استخداماً
      const { data, error: rpcError } = await supabase.rpc('draw_smart_questions', {
        p_stage: stage,
        p_subject: subject,
        p_limit: limit,
        p_student_id: studentId || null,
        p_model_id: modelId || null
      });

      if (rpcError) throw rpcError;

      if (!data || data.length === 0) {
        throw new Error('لم يتم العثور على أسئلة تطابق هذه الاختيارات في بنك الأسئلة.');
      }

      setQuestions(data as Question[]);
      
      // حفظ الأسئلة مؤقتاً في LocalStorage لحماية جلسة الطالب من الـ Refresh
      localStorage.setItem('current_exam_questions', JSON.stringify(data));
      
      return data as Question[];
    } catch (err: any) {
      const errMsg = err.message || 'حدث خطأ غير متوقع أثناء سحب الأسئلة.';
      setError(errMsg);
      console.error('Exam Drawing Error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearCurrentExam = useCallback(() => {
    setQuestions([]);
    localStorage.removeItem('current_exam_questions');
  }, []);

  return {
    questions,
    loading,
    error,
    startExam,
    clearCurrentExam,
  };
};
