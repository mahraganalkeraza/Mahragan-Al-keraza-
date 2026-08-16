import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Document, Paragraph, TextRun, Packer, HeadingLevel } from 'docx';
import { FileDown, RefreshCcw, CheckCircle, AlertTriangle } from 'lucide-react';

interface BulkModelExporterProps {
  stage: string;
  subject: string;
  questionsPerModel: number;
}

export const BulkModelExporter: React.FC<BulkModelExporterProps> = ({
  stage,
  subject,
  questionsPerModel
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const generateBulkModels = async () => {
    if (!stage || stage === 'الكل' || stage === '') {
      alert('الرجاء اختيار المرحلة أولاً.');
      return;
    }
    if (!subject || subject === 'الكل' || subject === '') {
      alert('الرجاء اختيار المادة أولاً.');
      return;
    }
    if (!questionsPerModel || questionsPerModel <= 0) {
      alert('الرجاء تحديد عدد الأسئلة للنموذج الواحد بشكل صحيح.');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setErrorMsg(null);
    setStatusText('بدء توليد النماذج...');
    
    try {
      const JSZip = (await import('jszip')).default;
      const { saveAs } = await import('file-saver');
      const zip = new JSZip();
      // توليد 10 نماذج متعاقبة
      for (let i = 1; i <= 10; i++) {
        const modelIdentifier = `Model_${String.fromCharCode(64 + i)}`; // Model_A, Model_B, etc.
        const modelLetter = String.fromCharCode(64 + i); // A, B, etc.
        
        setStatusText(`جاري سحب الأسئلة للنموذج (${modelLetter})...`);

        // 1. سحب أسئلة فريدة وذكية لهذا النموذج عبر الـ RPC
        const { data: fetchedQuestions, error: rpcError } = await supabase.rpc('draw_smart_questions', {
          p_stage: stage,
          p_subject: subject,
          p_limit: questionsPerModel,
          p_student_id: null,
          p_model_id: modelIdentifier // وسم السحب باسم النموذج للتحليلات
        });

        if (rpcError) throw rpcError;
        
        if (!fetchedQuestions || fetchedQuestions.length === 0) {
          throw new Error(`لم يتم العثور على أسئلة للمرحلة "${stage}" والمادة "${subject}" لتوليد النموذج (${modelLetter}).`);
        }

        setStatusText(`جاري إنشاء ملف Word للنموذج (${modelLetter})...`);

        // 2. بناء هيكل ملف الـ Word الخاص بالنموذج الحالي
        const docParagraphs: Paragraph[] = [
          new Paragraph({
            text: `امتحان مادة: ${subject}`,
            heading: HeadingLevel.HEADING_1,
            alignment: 'center',
          }),
          new Paragraph({
            text: `المرحلة الدراسية: ${stage}`,
            heading: HeadingLevel.HEADING_2,
            alignment: 'center',
          }),
          new Paragraph({
            text: `نموذج الامتحان: (${modelLetter})`,
            heading: HeadingLevel.HEADING_3,
            alignment: 'center',
          }),
          new Paragraph({ text: '____________________________________________________\n' }),
        ];

        // إضافة الأسئلة داخل المستند
        fetchedQuestions.forEach((q: any, index: number) => {
          docParagraphs.push(
            new Paragraph({
              children: [
                new TextRun({ text: `س ${index + 1}: `, bold: true }),
                new TextRun({ text: q.question_text || '' }),
              ],
              spacing: { before: 200 },
            })
          );

          // التعامل مع الخيارات سواء كانت Array أو Object مخزنة في JSONB
          let optionsArray: string[] = [];
          if (Array.isArray(q.options)) {
            optionsArray = q.options;
          } else if (typeof q.options === 'object' && q.options !== null) {
            optionsArray = Object.values(q.options);
          }

          optionsArray.forEach((opt: string, optIndex: number) => {
            const letter = String.fromCharCode(65 + optIndex); // A, B, C, D
            docParagraphs.push(
              new Paragraph({
                text: `   ${letter}) ${opt}`,
                spacing: { before: 50 },
              })
            );
          });
        });

        const doc = new Document({
          sections: [{ children: docParagraphs }],
        });

        // 3. تحويل المستند إلى Blob وإضافته لملف الـ ZIP
        const blob = await Packer.toBlob(doc);
        zip.file(`Exam_${modelIdentifier}.docx`, blob);

        // تحديث النسبة المئوية للمؤشر
        setProgress(Math.round((i / 10) * 100));
      }

      setStatusText('جاري حزم جميع نماذج الامتحانات في ملف واحد مضغوط...');
      
      // 4. حزم الملف المضغوط وتنزيله للمستخدم
      const zipContent = await zip.generateAsync({ type: 'blob' });
      const safeSubject = subject.replace(/\s+/g, '_');
      saveAs(zipContent, `Exams_${safeSubject}_10_Models.zip`);
      
      setStatusText('اكتمل توليد وتحميل النماذج الـ 10 بنجاح! 🎉');

    } catch (error: any) {
      console.error('Error generating bulk models:', error);
      setErrorMsg(error.message || 'حدث خطأ غير متوقع أثناء توليد النماذج.');
      setStatusText('فشلت العملية ❌');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm max-w-md w-full font-arabic" dir="rtl">
      <div className="flex items-center gap-2 mb-3">
        <FileDown className="text-indigo-600" size={20} />
        <h3 className="text-sm font-black text-slate-800">توليد النماذج الورقية المتعددة (أوفلاين)</h3>
      </div>
      
      <p className="text-xs text-slate-500 leading-relaxed mb-4">
        سيقوم النظام بسحب وتوليد 10 نماذج امتحانات مختلفة كلياً بناءً على خوارزمية عدم تكرار الأسئلة الذكية وتوزيع مستويات الصعوبة، ثم تصديرها منسقة داخل ملف ZIP واحد يحتوي على 10 ملفات Word (.docx) صالحة للطباعة الفورية.
      </p>

      {/* تفاصيل المادة والمرحلة المختارة حالياً للوضوح */}
      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs mb-4 space-y-1">
        <div>
          <span className="text-slate-400">المرحلة النشطة:</span>{' '}
          <span className="font-extrabold text-slate-700">{stage || 'لم تختر بعد'}</span>
        </div>
        <div>
          <span className="text-slate-400">المادة الدراسية:</span>{' '}
          <span className="font-extrabold text-slate-700">{subject || 'لم تختر بعد'}</span>
        </div>
        <div>
          <span className="text-slate-400">عدد الأسئلة للنموذج الواحد:</span>{' '}
          <span className="font-extrabold text-slate-700">{questionsPerModel || 10}</span>
        </div>
      </div>

      {isGenerating && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5 text-xs font-bold text-slate-600">
            <span className="flex items-center gap-1">
              <RefreshCcw size={13} className="animate-spin text-indigo-600" />
              {statusText}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl flex items-start gap-2">
          <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
          <div className="font-medium leading-relaxed">{errorMsg}</div>
        </div>
      )}

      {!isGenerating && statusText.includes('بنجاح') && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle size={15} className="flex-shrink-0" />
          <div className="font-bold">{statusText}</div>
        </div>
      )}
      
      <button
        onClick={generateBulkModels}
        disabled={isGenerating}
        className={`w-full py-3 px-4 rounded-xl font-bold text-xs transition-all text-white flex items-center justify-center gap-2 shadow-sm ${
          isGenerating 
            ? 'bg-slate-400 cursor-not-allowed' 
            : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] cursor-pointer'
        }`}
      >
        {isGenerating ? `جاري توليد النماذج... (${progress}%)` : 'توليد وتنزيل 10 نماذج مضغوطة'}
      </button>
    </div>
  );
};
