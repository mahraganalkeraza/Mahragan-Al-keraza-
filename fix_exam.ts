import fs from 'fs';

let content = fs.readFileSync('src/components/ExamLoginPortal.tsx', 'utf-8');

const target = `      const { data: examRow, error: examErr } = await supabase
        .from('exams_pool')
        .select('id, exam_title, stage, questions_data, model_type, is_active')
        .eq('stage', studentObj.stage)
        .eq('is_active', true)
        .maybeSingle();

      if (examErr || !examRow) {
        setErrors(\`تنبيه: لا يوجد امتحان نشط ومفتوح حالياً مخصص لمرحلة (\${studentObj.stage || 'غير محددة'}).\`);
        setIsLoading(false);
        return;
      }`;

const replacement = `      // Extract recruit's competitions
      let compsArr: any[] = [];
      const comps = studentObj.competitions;
      if (Array.isArray(comps)) {
        compsArr = comps;
      } else if (typeof comps === 'string') {
        try {
          compsArr = JSON.parse(comps);
        } catch (e) {
          compsArr = [comps];
        }
      }
      const compNames = compsArr.map((item: any) => 
        typeof item === 'string' ? item : (item.activity || item.competition || item.name || '')
      ).filter(Boolean);

      // MISSION DIRECTIVE: Scan the Database, Identify the Target, Verify Status
      const { data: activeExams, error: examErr } = await supabase
        .from('exams_pool')
        .select('id, exam_title, stage, subject, questions_data, model_type, is_active')
        .eq('stage', studentObj.stage)
        .eq('is_active', true);

      if (examErr) {
        setErrors("Mission Standby: حدث خطأ أثناء الاتصال بقاعدة البيانات.");
        setIsLoading(false);
        return;
      }

      // Filter by the recruit's specific subject competition
      const examRow = activeExams?.find(exam => compNames.includes(exam.subject) || compNames.includes(exam.exam_title));

      if (!examRow) {
        setErrors(\`Mission Standby: لا يوجد امتحان نشط ومطابق لمرحلة ومسابقة المتدرب (\${studentObj.stage || 'غير محددة'}).\`);
        setIsLoading(false);
        return;
      }`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/ExamLoginPortal.tsx', content, 'utf-8');
