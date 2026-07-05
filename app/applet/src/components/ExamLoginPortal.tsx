import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient'; // Assuming this path

// دالة سحرية لتنظيف النصوص العربية والمسافات المخفية تماماً
const normalizeArabic = (str: string | any): string => {
  if (!str || typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/[\u064B-\u065F]/g, '') // حذف التشكيل
    .replace(/[أإآا]/g, 'ا')         // توحيد الألفات
    .replace(/ى/g, 'ي')             // توحيد الياء
    .replace(/ة/g, 'ه');            // توحيد التاء المربوطة والهاء
};

interface ExamLoginPortalProps {
  onClose: () => void;
  onSuccess: (student: any, examData: any) => void;
}

const ExamLoginPortal: React.FC<ExamLoginPortalProps> = ({ onClose, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string | null>(null);

  // معالج سحب الامتحان الفعلي من الـ Pool وتفجير شاشة الأسئلة
  const triggerActiveExamLaunch = async (studentObj: any) => {
    setIsLoading(true);
    
    try {
      const studentIdStr = String(studentObj.student_id).trim(); // Used student_id based on previous grep
      // تنظيف المرحلة
      const cleanStage = studentObj.stage ? studentObj.stage.trim() : ''; 

      // --- Check 1: Anti-Cheat ---
      const { data: submissionCheck } = await supabase
        .from('exam_submissions')
        .select('student_id')
        .eq('student_id', studentIdStr)
        .maybeSingle();

      if (submissionCheck) {
        alert("عفواً، لقد قمت بدخول هذا الامتحان مسبقاً!");
        setIsLoading(false);
        return;
      }

      // --- Check 2: Global Lock ---
      const { data: sysData } = await supabase
        .from('system_settings')
        .select('is_exam_locked')
        .eq('id', '1')
        .maybeSingle();

      if (sysData?.is_exam_locked) {
        alert("المهمة مغلقة حالياً من الإدارة العامة.");
        setIsLoading(false);
        return;
      }

      // --- Check 3: Granular Controls (إصلاح خطأ الـ 400) ---
      const { data: gateData } = await supabase
        .from('granular_controls')
        .select('is_exam_disabled, exam_start_at, exam_end_at')
        .eq('target_name', cleanStage) // استخدام المرحلة المنظفة
        .maybeSingle();

      if (gateData) {
        if (gateData.is_exam_disabled) {
          alert("الامتحان معطل حالياً لهذه المرحلة.");
          setIsLoading(false);
          return;
        }
        const now = new Date();
        const start = gateData.exam_start_at ? new Date(gateData.exam_start_at) : null;
        const end = gateData.exam_end_at ? new Date(gateData.exam_end_at) : null;
        if ((start && now < start) || (end && now > end)) {
          alert("عفواً، الامتحان خارج نطاق الوقت المحدد المسموح به.");
          setIsLoading(false);
          return;
        }
      }

      // --- Check 4 & 5: Retrieval & Advanced Arabic Matching ---
      const { data: activeExams, error: examErr } = await supabase
        .from('exams_pool')
        .select('id, exam_title, stage, subject, questions_data, model_type, is_active')
        .eq('stage', cleanStage) // الفلترة بالمرحلة الصحيحة
        .eq('is_active', true);

      if (examErr) {
        console.error("Database Error:", examErr);
        alert("Mission Standby: حدث خطأ أثناء الاتصال بقاعدة البيانات.");
        setIsLoading(false);
        return;
      }

      // تجهيز وتنظيف مسابقات الطالب (تفكيك الـ JSON أو الـ Array أو الـ String)
      let compNames: string[] = [];
      if (studentObj.competitions) {
        try {
          const parsed = typeof studentObj.competitions === 'string' ? JSON.parse(studentObj.competitions) : studentObj.competitions;
          compNames = Array.isArray(parsed) ? parsed.map(c => normalizeArabic(c)) : [normalizeArabic(parsed)];
        } catch {
          compNames = [normalizeArabic(studentObj.competitions)];
        }
      }

      console.log("Cleaned Student Competitions (Normalized):", compNames);

      // الفلترة الذكية (تقارن النص بعد تنظيفه تماماً من عيوب الياء والألف والمسافات)
      const examRow = activeExams?.find(exam => {
        const normalizedExamSubject = normalizeArabic(exam.subject);
        const normalizedExamTitle = normalizeArabic(exam.exam_title);
        
        return compNames.some(comp => 
          comp === normalizedExamSubject || 
          comp === normalizedExamTitle || 
          normalizedExamSubject.includes(comp) || 
          normalizedExamTitle.includes(comp)
        );
      });

      if (!examRow) {
        console.warn("No match found between student competitions and available exams.");
        alert(`Mission Standby: لا يوجد امتحان نشط ومطابق لمرحلة ومسابقة المتدرب (${cleanStage}).`);
        setIsLoading(false);
        return;
      }

      // الـ Deploy الناجح!
      console.log("Success! Launching Exam:", examRow);
      onSuccess(studentObj, examRow);

    } catch (error) {
      console.error("Critical Failure in Launch Pipeline:", error);
      alert("Mission Standby: حدث خطأ غير متوقع في نظام التشغيل.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
        {errors && <p className="text-red-500">{errors}</p>}
        {/* Simplified UI for demonstration */}
        <button onClick={() => triggerActiveExamLaunch({ student_id: '1', stage: 'Primary', competitions: 'دراسي' })}>
            بدء الامتحان
        </button>
    </div>
  );
};

export default ExamLoginPortal;
