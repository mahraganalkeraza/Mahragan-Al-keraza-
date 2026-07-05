import fs from 'fs';

let content = fs.readFileSync('src/components/ExamEngine.tsx', 'utf-8');

const target = `  const handleAddQuestion = () => {
    setCurrentQuestions([
      ...cur  const handleSaveExam = async (isAuto = false) => {
    try {
      if (!selectedStage || !selectedCompetition || !selectedModel) return;

      const examId = \`\${selectedStage}_\${selectedCompetition}_\${selectedModel}\`;

      // 1. تنظيف البيانات من المسافات الزائدة لتجنب أي أخطاء تطابق
      const examPayload = {
        id: examId,
        exam_title: selectedCompetition.trim(),
        stage: selectedStage.trim(),
        subject: selectedCompetition.trim(),
        model_type: selectedModel,
        questions_data: currentQuestions,
        is_active: true,
        model: selectedModel,
        updated_at: new Date().toISOString() // تحديث تاريخ التعديل
      };

      // 2. استخدام upsert وهو الحل السحري لمشكلة الـ 23505
      const { error: saveErr } = await supabase
        .from("exams_pool")
        .upsert(examPayload, { onConflict: 'id' }); // إخبار سوبابايس: لو الـ ID موجود، حدّثه!

      if (saveErr) throw saveErr;

      setIsDirty(false);

      // Update local set of exams as well
      setExams((prev) => {
        const otherExams = prev.filter((e) => e.id !== examId);
        return [
          ...otherExams,
          {
            id: examId,
            stage: selectedStage,
            competitionType: selectedCompetition,
            model: selectedModel,
            questions: currentQuestions,
            isActive: true,
            updatedAt: new Date().toISOString(),
          },
        ];
      });

      if (!isAuto) {
        console.log("Mission Accomplished: Exam saved/updated successfully!");
        alert("تم حفظ الامتحان بنجاح.");
      }
    } catch (error: any) {
      console.error("Critical Failure:", error.message);
      if (!isAuto) alert("فشلت عملية الحفظ: " + error.message);
    }
  };      });

      if (!isAuto) alert("تم الحفظ بنجاح");
    } catch (error: any) {
      console.error("Error saving exam :", error);
      if (!isAuto) alert("حدث خطأ أثناء الحفظ  : " + error.message);
    }
  };`;

const replacement = `  const handleAddQuestion = () => {
    setCurrentQuestions([
      ...currentQuestions,
      {
        id: Date.now().toString(),
        type: "mcq",
        text: "",
        options: [""],
        correctAnswers: [],
        points: 1,
      },
    ]);
    setIsDirty(true);
  };

  const handleSaveExam = async (isAuto = false) => {
    try {
      if (!selectedStage || !selectedCompetition || !selectedModel) return;

      const examId = \`\${selectedStage}_\${selectedCompetition}_\${selectedModel}\`;

      // 1. تنظيف البيانات من المسافات الزائدة لتجنب أي أخطاء تطابق
      const examPayload = {
        id: examId,
        exam_title: selectedCompetition.trim(),
        stage: selectedStage.trim(),
        subject: selectedCompetition.trim(),
        model_type: selectedModel,
        questions_data: currentQuestions,
        is_active: true,
        model: selectedModel,
        updated_at: new Date().toISOString() // تحديث تاريخ التعديل
      };

      // 2. استخدام upsert وهو الحل السحري لمشكلة الـ 23505
      const { error: saveErr } = await supabase
        .from("exams_pool")
        .upsert(examPayload, { onConflict: 'id' }); // إخبار سوبابايس: لو الـ ID موجود، حدّثه!

      if (saveErr) throw saveErr;

      setIsDirty(false);

      // Update local set of exams as well
      setExams((prev) => {
        const otherExams = prev.filter((e) => e.id !== examId);
        return [
          ...otherExams,
          {
            id: examId,
            stage: selectedStage,
            competitionType: selectedCompetition,
            model: selectedModel,
            questions: currentQuestions,
            isActive: true,
            updatedAt: new Date().toISOString(),
          },
        ];
      });

      if (!isAuto) {
        console.log("Mission Accomplished: Exam saved/updated successfully!");
        alert("تم حفظ الامتحان بنجاح.");
      }
    } catch (error: any) {
      console.error("Critical Failure:", error.message);
      if (!isAuto) alert("فشلت عملية الحفظ: " + error.message);
    }
  };`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/ExamEngine.tsx', content, 'utf-8');
