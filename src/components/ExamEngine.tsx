import { UAParser } from "ua-parser-js";
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabaseClient";
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  Play,
  CheckCircle2,
  ShieldX,
  HelpCircle,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Check,
  Clock,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { QRScanner } from "./QRScanner";
import { getDeviceFingerprint, DeviceFingerprint } from "../lib/deviceTracking";
import logo from "../by-logo.jpeg";

const CURRENT_YEAR = "2026";

const normalizeArabic = (text: any): string => {
  if (!text || typeof text !== "string") return "";
  return text
    .trim()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
    .replace(/\s+/g, " ");
};

const restoreFullAnswers = (compactAnswers: any[]): Record<string, any> => {
  const restored: Record<string, any> = {};
  const cachedExams = JSON.parse(
    localStorage.getItem("exams_pool_cache") || "[]",
  );

  compactAnswers.forEach((item: any) => {
    const qId = item.qId || item.question_id || item.questionId;
    const ansVal =
      item.ans !== undefined ? item.ans : item.student_answer || item.answer;
    const rawSub = item.sub || item.subject;

    if (!rawSub) return;

    // Map rawSub to official competition name if compact
    const keyMapReverse: Record<string, string> = {
      derasy: "دراسي",
      mahfozat: "محفوظات",
      qebty_lvl1: "قبطي مستوى أول",
      qebty_lvl2: "قبطي مستوى ثاني",
      دراسي: "دراسي",
      محفوظات: "محفوظات",
      "قبطي مستوى أول": "قبطي مستوى أول",
      "قبطي مستوى ثاني": "قبطي مستوى ثاني",
    };
    const officialSub = keyMapReverse[rawSub] || rawSub;
    if (!restored[officialSub]) restored[officialSub] = {};

    let actualValue = ansVal;
    if (typeof ansVal === "number") {
      const examSchema = cachedExams.find(
        (e: any) =>
          e.competitionType === officialSub ||
          (e.subject || e.competition_type) === officialSub,
      );
      const questionsList =
        examSchema?.questions || examSchema?.questions_data || [];
      const question = questionsList.find((qu: any) => qu.id === qId);
      if (question) {
        if (question.type === "mcq" || question.type === "boolean") {
          if (question.options?.[ansVal] !== undefined) {
            actualValue = question.options[ansVal];
          }
        }
      }
    } else if (typeof ansVal === "object" && ansVal !== null) {
      const examSchema = cachedExams.find(
        (e: any) =>
          e.competitionType === officialSub ||
          (e.subject || e.competition_type) === officialSub,
      );
      const questionsList =
        examSchema?.questions || examSchema?.questions_data || [];
      const question = questionsList.find((qu: any) => qu.id === qId);
      if (question) {
        if (question.type === "matching") {
          const resolvedMatches: Record<number, string> = {};
          const shuffledRights =
            (question as any).shuffledRights ||
            question.matchingPairs?.map((p: any) => p.right);
          Object.entries(ansVal).forEach(([idxKey, valIndex]) => {
            const pIdx = Number(idxKey);
            if (shuffledRights?.[valIndex as number] !== undefined) {
              resolvedMatches[pIdx] = shuffledRights[valIndex as number];
            } else if (
              question.matchingPairs?.[valIndex as number] !== undefined
            ) {
              resolvedMatches[pIdx] =
                question.matchingPairs[valIndex as number].right;
            } else {
              resolvedMatches[pIdx] = String(valIndex);
            }
          });
          actualValue = resolvedMatches;
        }
      }
    }

    restored[officialSub][qId] = actualValue;
  });

  return restored;
};

const fetchAllExamsAndCache = async (): Promise<any[]> => {
  const cacheKey = "exams_pool_cache";
  const cacheTimeKey = "exams_pool_cache_time";
  const cachedTime = localStorage.getItem(cacheTimeKey);
  const now = Date.now();

  if (cachedTime && now - Number(cachedTime) < 24 * 60 * 60 * 1000) {
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        return JSON.parse(cachedData);
      } catch (e) {
        console.error("Error parsing cached exams_pool:", e);
      }
    }
  }

  // Cache missing or expired: fetch all exams from Supabase
  try {
    const { data, error } = await supabase.from("exams_pool").select("*");

    if (error) throw error;
    if (data) {
      localStorage.setItem(cacheKey, JSON.stringify(data));
      localStorage.setItem(cacheTimeKey, String(now));
      return data;
    }
  } catch (err) {
    console.error("Failed to fetch and cache exams_pool from Supabase:", err);
    // Fallback to existing cache if fetching fails (offline resiliency)
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        return JSON.parse(cachedData);
      } catch (e) {}
    }
  }
  return [];
};

interface Question {
  id: string;
  type: "mcq" | "boolean" | "matching" | "fill" | "multi_select";
  text: string;
  options: any[];
  matchingPairs?: { left: string; right: string }[];
  correctAnswers: string[];
  points: number;
}

interface Exam {
  id: string;
  stage: string;
  competitionType: string;
  model: string;
  questions: Question[];
  isActive: boolean;
  updatedAt: string;
}

const COMPETITION_TYPES = [
  "دراسي",
  "محفوظات",
  "قبطي مستوى أول",
  "قبطي مستوى ثاني",
];

const SCORE_FIELD_MAP: Record<string, string> = {
  دراسي: "academicScore",
  محفوظات: "memorizationScore",
  "قبطي مستوى أول": "copticL1Score",
  "قبطي مستوى ثاني": "copticL2Score",
};

interface ExamEngineProps {
  stages: any[];
}

export const ExamBuilder: React.FC<ExamEngineProps> = ({ stages }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedStage, setSelectedStage] = useState("");
  const [selectedCompetition, setSelectedCompetition] = useState("دراسي");
  const [selectedModel, setSelectedModel] = useState("A");
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const isCopticFont = selectedCompetition && selectedCompetition.includes("قبطي");

  const fetchExamsPool = async () => {
    try {
      const { data, error } = await supabase
        .from("exams_pool")
        .select("id, stage, subject, model_type, is_active, created_at");
      if (error) {
        console.error("Error fetching exams pool:", error);
      } else if (data) {
        const loaded: Exam[] = data.map((row: any) => ({
          id: row.id,
          stage: row.stage,
          competitionType: row.subject || row.competition_type || "",
          model: row.model || row.model_type || "A",
          questions: [], // Excluded initially for efficiency
          isActive: row.is_active ?? true,
          created_at: row.created_at,
          updatedAt: row.created_at || "",
        }));
        setExams(loaded);

        // Populate metadata form selectors automatically if data exists
        if (loaded.length > 0) {
          const firstExam = loaded[0];
          setSelectedStage(firstExam.stage || "");
          setSelectedCompetition(firstExam.competitionType || "دراسي");
          setSelectedModel(firstExam.model || "A");
        }
      }
    } catch (e) {
      console.error("Error loading exams metadata from Supabase:", e);
    }
  };

  useEffect(() => {
    fetchExamsPool();
  }, []);

  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  useEffect(() => {
    const fetchQuestionsOnDemand = async () => {
      if (selectedStage && selectedCompetition && selectedModel) {
        setIsLoadingQuestions(true);
        const examId = `${selectedStage}_${selectedCompetition}_${selectedModel}`;
        try {
          const { data, error } = await supabase
            .from("exams_pool")
            .select("questions_data")
            .eq("id", examId)
            .maybeSingle();

          if (error) {
            console.error("Error fetching active exam questions:", error);
            setCurrentQuestions([]);
          } else if (data && data.questions_data) {
            setCurrentQuestions(data.questions_data);
          } else {
            setCurrentQuestions([]);
          }
        } catch (e) {
          console.error("Error loading questions:", e);
          setCurrentQuestions([]);
        } finally {
          setIsLoadingQuestions(false);
        }
        setIsDirty(false);
      }
    };
    fetchQuestionsOnDemand();
  }, [selectedStage, selectedCompetition, selectedModel]);

  // Auto-save logic every 60 seconds if dirty
  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(() => {
      handleSaveExam(true);
    }, 60000);
    return () => clearTimeout(timer);
  }, [isDirty, currentQuestions]);

  const handleAddQuestion = () => {
    setCurrentQuestions([
      ...currentQuestions,
      {
        id: Date.now().toString(),
        type: "mcq",
        text: "",
        options: [{ text: "", score: 0 }],
        correctAnswers: [],
        points: 1,
      },
    ]);
    setIsDirty(true);
  };

  const handleSaveExam = async (isAuto = false) => {
    try {
      if (!selectedStage || !selectedCompetition || !selectedModel) return;

      const examId = `${selectedStage}_${selectedCompetition}_${selectedModel}`;

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

      // ✅ التعديل السحري الجديد: أخبر سوبابايس أن التحديث يتم فقط لو تطابق الطالب مع نفس المسابقة
const { error: saveErr } = await supabase
  .from("exams_pool")
  .upsert(examPayload, { onConflict: 'id' }); 
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
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex flex-wrap items-center gap-4 mb-6 sticky top-0 bg-white py-2 z-10 border-b">
        <select
          className="px-4 py-2 border rounded-xl font-bold text-sm"
          value={selectedStage}
          onChange={(e) => setSelectedStage(e.target.value)}
        >
          <option value="">اختر المرحلة</option>
          {stages.map((s) => (
            <option
              key={typeof s === "string" ? s : s.name}
              value={typeof s === "string" ? s : s.name}
            >
              {typeof s === "string" ? s : s.name}
            </option>
          ))}
        </select>
        <select
          className="px-4 py-2 border rounded-xl font-bold text-sm"
          value={selectedCompetition}
          onChange={(e) => setSelectedCompetition(e.target.value)}
        >
          {COMPETITION_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <select
          className="px-4 py-2 border rounded-xl font-bold text-sm"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
        >
          <option value="A">نموذج A</option>
          <option value="B">نموذج B</option>
          <option value="C">نموذج C</option>
        </select>
        <button
          onClick={handleAddQuestion}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-2 text-sm font-bold transition-all"
        >
          <Plus size={16} /> إضافة سؤال
        </button>
        <button
          onClick={() => handleSaveExam()}
          className={`px-4 py-2 text-white rounded-xl flex items-center gap-2 text-sm font-bold transition-all ${isDirty ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-400"}`}
        >
          <Save size={16} /> {isDirty ? "حفظ التغييرات" : "تم الحفظ"}
        </button>
        {isDirty && (
          <span className="text-xs text-amber-605 font-bold animate-pulse">
            يوجد تغييرات غير محفوظة...
          </span>
        )}
      </div>

      <div className="space-y-6">
        {currentQuestions.map((q, qIndex) => (
          <div
            key={q.id}
            className="p-6 border rounded-2xl bg-slate-50 relative group"
          >
            <button
              onClick={() => {
                setCurrentQuestions(
                  currentQuestions.filter((_, i) => i !== qIndex),
                );
                setIsDirty(true);
              }}
              className="absolute top-4 left-4 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 size={20} />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="md:col-span-2">
                <label className="text-xs font-black mb-1 block flex items-center justify-between">
                  <span>رأس السؤال</span>
                  <span className="text-indigo-600 font-extrabold bg-indigo-50/80 px-2.5 py-0.5 rounded-full text-[11px] shadow-sm">
                    الدرجة المحددة: {q.points}
                  </span>
                </label>
                <input
                  type="text"
                  value={q.text}
                  placeholder="اكتب السؤال هنا..."
                  onChange={(e) => {
                    const newQ = [...currentQuestions];
                    newQ[qIndex].text = e.target.value;
                    setCurrentQuestions(newQ);
                    setIsDirty(true);
                  }}
                  className={`w-full px-4 py-2 border rounded-xl bg-white ${isCopticFont ? "coptic-text text-lg" : ""}`}
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-black mb-1 block">النوع</label>
                  <select
                    value={q.type}
                    onChange={(e) => {
                      const newQ = [...currentQuestions];
                      newQ[qIndex].type = e.target.value as any;
                      if (e.target.value === "boolean") {
                        newQ[qIndex].options = ["صح", "خطأ"];
                        newQ[qIndex].correctAnswers = ["صح"];
                      } else if (e.target.value === "matching") {
                        newQ[qIndex].matchingPairs = [{ left: "", right: "" }];
                        newQ[qIndex].options = [];
                        newQ[qIndex].correctAnswers = [];
                      } else if (e.target.value === "fill") {
                        newQ[qIndex].options = [];
                        newQ[qIndex].correctAnswers = [""];
                      } else if (e.target.value === "multi_select") {
                        newQ[qIndex].options = [{ text: "", score: 0 }];
                        newQ[qIndex].correctAnswers = [];
                      } else if (e.target.value === "mcq") {
                        newQ[qIndex].options = [{ text: "", score: 0 }];
                        newQ[qIndex].correctAnswers = [];
                      }
                      setCurrentQuestions(newQ);
                      setIsDirty(true);
                    }}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="mcq">اختيار من متعدد (Single Choice)</option>
                    <option value="multi_select">اختيار متعدد (Multiple Selection)</option>
                    <option value="boolean">صح وخطأ</option>
                    <option value="matching">توصيل</option>
                    <option value="fill">أكمل</option>
                  </select>
                </div>

                {/* 🎯 خانة الدرجة لكل أنواع الأسئلة */}
                <div className="w-20">
                  <label className="text-xs font-black mb-1 block">
                    الدرجة
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={q.points}
                    onChange={(e) => {
                      const newQ = [...currentQuestions];
                      newQ[qIndex].points = parseFloat(e.target.value) || 0;
                      setCurrentQuestions(newQ);
                      setIsDirty(true);
                    }}
                    className="w-full px-3 py-2 border rounded-lg text-center bg-white"
                  />
                </div>
              </div>
            </div>
            {q.type === "boolean" && (
              <div className="space-y-3">
                <label className="text-xs font-black mb-2 block text-slate-400">
                  الخيارات (حدد الإجابة الصحيحة)
                </label>
                {q.options?.map((opt, optIndex) => {
                  const optText = typeof opt === "object" && opt !== null ? (opt.text || "") : String(opt);
                  return (
                    <div key={optIndex} className="flex gap-3 items-center">
                      <input
                        type="radio"
                        name={`correct_${q.id}`}
                        checked={q.correctAnswers.includes(optText)}
                        onChange={() => {
                          const newQ = [...currentQuestions];
                          newQ[qIndex].correctAnswers = [optText];
                          setCurrentQuestions(newQ);
                          setIsDirty(true);
                        }}
                        className="w-5 h-5 accent-indigo-600"
                      />
                      <input
                        type="text"
                        value={optText}
                        disabled={true}
                        className={`flex-1 px-4 py-2 border rounded-xl bg-slate-50 text-slate-500 ${isCopticFont ? "coptic-text text-lg" : ""}`}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {(q.type === "mcq" || q.type === "multi_select") && (
              <div className="space-y-3">
                <label className="text-xs font-black mb-2 block text-slate-400">
                  الخيارات (اكتب الخيارات والدرجة لكل خيار)
                </label>
                {q.options?.map((opt, optIndex) => {
                  const optText = typeof opt === "object" && opt !== null ? (opt.text || "") : String(opt);
                  const optScore = typeof opt === "object" && opt !== null ? (opt.score || 0) : 0;
                  const isCorrect = q.correctAnswers.includes(optText);

                  return (
                    <div key={optIndex} className="flex gap-3 items-center flex-wrap sm:flex-nowrap">
                      {q.type === "mcq" ? (
                        <input
                          type="radio"
                          name={`correct_${q.id}`}
                          checked={isCorrect}
                          onChange={() => {
                            const newQ = [...currentQuestions];
                            newQ[qIndex].correctAnswers = [optText];
                            setCurrentQuestions(newQ);
                            setIsDirty(true);
                          }}
                          className="w-5 h-5 accent-indigo-600 shrink-0"
                        />
                      ) : (
                        <input
                          type="checkbox"
                          checked={isCorrect}
                          onChange={(e) => {
                            const newQ = [...currentQuestions];
                            if (e.target.checked) {
                              if (!newQ[qIndex].correctAnswers.includes(optText)) {
                                newQ[qIndex].correctAnswers.push(optText);
                              }
                            } else {
                              newQ[qIndex].correctAnswers = newQ[qIndex].correctAnswers.filter(
                                (x: string) => x !== optText
                              );
                            }
                            setCurrentQuestions(newQ);
                            setIsDirty(true);
                          }}
                          className="w-5 h-5 accent-indigo-600 rounded shrink-0"
                        />
                      )}
                      <input
                        type="text"
                        value={optText}
                        placeholder="نص الخيار..."
                        onChange={(e) => {
                          const newQ = [...currentQuestions];
                          const oldVal = optText;
                          const newVal = e.target.value;
                          
                          newQ[qIndex].options[optIndex] = { text: newVal, score: optScore };
                          
                          const correctIdx = newQ[qIndex].correctAnswers.indexOf(oldVal);
                          if (correctIdx !== -1) {
                            newQ[qIndex].correctAnswers[correctIdx] = newVal;
                          }
                          setCurrentQuestions(newQ);
                          setIsDirty(true);
                        }}
                        className={`flex-1 px-4 py-2 border rounded-xl bg-white ${isCopticFont ? "coptic-text text-lg" : ""}`}
                      />
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-black text-slate-400">الدرجة:</span>
                        <input
                          type="number"
                          step="0.5"
                          value={optScore}
                          onChange={(e) => {
                            const newQ = [...currentQuestions];
                            newQ[qIndex].options[optIndex] = { text: optText, score: parseFloat(e.target.value) || 0 };
                            setCurrentQuestions(newQ);
                            setIsDirty(true);
                          }}
                          className="w-20 px-2 py-2 border rounded-xl text-center bg-white font-bold"
                        />
                      </div>

                      {q.options.length > 1 && (
                        <button
                          onClick={() => {
                            const newQ = [...currentQuestions];
                            newQ[qIndex].options = newQ[qIndex].options.filter(
                              (_, i) => i !== optIndex,
                            );
                            newQ[qIndex].correctAnswers = newQ[qIndex].correctAnswers.filter(
                              (x: string) => x !== optText
                            );
                            setCurrentQuestions(newQ);
                            setIsDirty(true);
                          }}
                          className="p-2 text-red-500 shrink-0"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  );
                })}
                
                <button
                  onClick={() => {
                    const newQ = [...currentQuestions];
                    newQ[qIndex].options.push({ text: "", score: 0 });
                    setCurrentQuestions(newQ);
                    setIsDirty(true);
                  }}
                  className="text-indigo-600 text-xs font-black flex items-center gap-1 mt-4"
                >
                  <Plus size={14} /> إضافة خيار جديد
                </button>
              </div>
            )}

            {q.type === "matching" && (
              <div className="space-y-4">
                <label className="text-xs font-black mb-2 block text-slate-400">
                  أزواج التوصيل (العمود أ - العمود ب)
                </label>
                {q.matchingPairs?.map((pair, pIdx) => (
                  <div key={pIdx} className="flex gap-4 items-center">
                    <span className="text-xs font-bold text-slate-300 w-4">
                      {pIdx + 1}.
                    </span>
                    <input
                      type="text"
                      placeholder="العنصر (أ)"
                      value={pair.left}
                      onChange={(e) => {
                        const newQ = [...currentQuestions];
                        newQ[qIndex].matchingPairs![pIdx].left = e.target.value;
                        setCurrentQuestions(newQ);
                        setIsDirty(true);
                      }}
                      className={`flex-1 px-4 py-2 border rounded-xl bg-white ${isCopticFont ? "coptic-text text-lg" : ""}`}
                    />
                    <div className="text-slate-300 font-bold">↔</div>
                    <input
                      type="text"
                      placeholder="العنصر (ب)"
                      value={pair.right}
                      onChange={(e) => {
                        const newQ = [...currentQuestions];
                        newQ[qIndex].matchingPairs![pIdx].right =
                          e.target.value;
                        setCurrentQuestions(newQ);
                        setIsDirty(true);
                      }}
                      className={`flex-1 px-4 py-2 border rounded-xl bg-white ${isCopticFont ? "coptic-text text-lg" : ""}`}
                    />
                    <button
                      onClick={() => {
                        const newQ = [...currentQuestions];
                        newQ[qIndex].matchingPairs = newQ[
                          qIndex
                        ].matchingPairs?.filter((_, i) => i !== pIdx);
                        setCurrentQuestions(newQ);
                        setIsDirty(true);
                      }}
                      className="p-2 text-red-400 hover:text-red-600"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newQ = [...currentQuestions];
                    newQ[qIndex].matchingPairs?.push({ left: "", right: "" });
                    setCurrentQuestions(newQ);
                    setIsDirty(true);
                  }}
                  className="text-indigo-600 text-xs font-black flex items-center gap-1 mt-4"
                >
                  <Plus size={14} /> إضافة زوج توصيل
                </button>
              </div>
            )}

            {q.type === "fill" && (
              <div className="space-y-3">
                <label className="text-xs font-black mb-1 block text-slate-400">
                  الإجابة الصحيحة (سيقوم الطالب بكتابتها)
                </label>
                <input
                  type="text"
                  value={q.correctAnswers[0] || ""}
                  onChange={(e) => {
                    const newQ = [...currentQuestions];
                    newQ[qIndex].correctAnswers = [e.target.value];
                    setCurrentQuestions(newQ);
                    setIsDirty(true);
                  }}
                  placeholder="الإجابة المتوقعة..."
                  className={`w-full px-4 py-2 border rounded-xl bg-white ${isCopticFont ? "coptic-text text-lg" : ""}`}
                />
              </div>
            )}
          </div>
        ))}
        {currentQuestions.length === 0 && (
          <div className="text-center py-20 text-slate-300 italic">
            ابدأ بإضافة أسئلة للمرحلة والنموذج المختار...
          </div>
        )}
      </div>
    </div>
  );
};

export const isStudentEnrolledInCompetition = (
  student: any,
  examType: string,
): boolean => {
  if (!student) return false;
  if (student.isManual) return true;

  const enrolled = student.enrolled_subjects;
  if (!enrolled) return false;

  let arr: any[] = [];
  if (Array.isArray(enrolled)) {
    arr = enrolled;
  } else if (typeof enrolled === "string") {
    try {
      arr = JSON.parse(enrolled);
    } catch (e) {
      arr = [enrolled];
    }
  } else {
    return false;
  }

  return arr.some((item: any) => {
    if (!item) return false;

    if (typeof item === "string") {
      const normalizedItem = item.trim();
      if (examType === "قبطي مستوى أول") {
        return (
          normalizedItem === "قبطي مستوى أول" ||
          normalizedItem === "قبطي مستوى 1"
        );
      }
      if (examType === "قبطي مستوى ثاني") {
        return (
          normalizedItem === "قبطي مستوى ثاني" ||
          normalizedItem === "قبطي مستوى ثانٍ" ||
          normalizedItem === "قبطي مستوى 2"
        );
      }
      return normalizedItem === examType;
    }

    if (typeof item === "object") {
      const activity = item.activity || item.competition || item.name || "";
      const level = item.level || "";

      const actNorm = activity.trim();
      const lvlNorm = level.trim();

      if (examType === "دراسي") {
        return actNorm === "دراسي";
      }
      if (examType === "محفوظات") {
        return actNorm === "محفوظات";
      }
      if (examType === "قبطي مستوى أول") {
        return (
          actNorm === "قبطي" &&
          (lvlNorm === "مستوى أول" ||
            lvlNorm === "مستوى اول" ||
            lvlNorm === "1" ||
            lvlNorm === "الأول" ||
            lvlNorm === "الأولى")
        );
      }
      if (examType === "قبطي مستوى ثاني") {
        return (
          actNorm === "قبطي" &&
          (lvlNorm === "مستوى ثاني" ||
            lvlNorm === "مستوى ثانٍ" ||
            lvlNorm === "ثاني" ||
            lvlNorm === "2" ||
            lvlNorm === "الثاني" ||
            lvlNorm === "الثانية")
        );
      }
    }

    return false;
  });
};

const isCopticText = (text: any): boolean => {
  if (typeof text !== "string") return false;
  // Detect standard Coptic/Greek unicode range
  const regex = /[\u2C80-\u2CFF\u0370-\u03FF]/;
  return regex.test(text);
};

interface QuestionCardProps {
  q: any;
  qIdx: number;
  totalQuestions: number;
  currentAnswer: any;
  onAnswer: (qid: string, val: any) => void;
}

const QuestionCard = React.memo(({ q, qIdx, totalQuestions, currentAnswer, onAnswer }: QuestionCardProps) => {
  return (
    <div
      className="max-w-3xl mx-auto p-6 bg-white rounded-2xl shadow-md border border-slate-100 space-y-6 select-none animate-question-fade"
      id={`question-block-${q.id}`}
      key={`${q.id}-${qIdx}`}
    >
      {/* Question Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <span className="text-xs font-black text-amber-800 bg-amber-50 px-3 py-1.5 rounded-full flex items-center gap-1 border border-amber-200/60 shadow-sm">
          <Sparkles size={13} className="animate-pulse text-[#d4af37]" />
          السؤال {qIdx + 1} من {totalQuestions}
        </span>
        {q.type === "mcq" && (
          <span className="text-xs text-slate-400 font-bold bg-slate-100 px-3 py-1.5 rounded-full font-sans">
            اختيار من متعدد
          </span>
        )}
        {q.type === "multi_select" && (
          <span className="text-xs text-slate-400 font-bold bg-slate-100 px-3 py-1.5 rounded-full font-sans">
            اختيار متعدد الإجابات (Checkboxes)
          </span>
        )}
        {q.type === "boolean" && (
          <span className="text-xs text-slate-400 font-bold bg-slate-100 px-3 py-1.5 rounded-full font-sans">
            صح وخطأ
          </span>
        )}
        {q.type === "fill" && (
          <span className="text-xs text-slate-400 font-bold bg-slate-100 px-3 py-1.5 rounded-full font-sans">
            أكمل الفراغ
          </span>
        )}
        {q.type === "matching" && (
          <span className="text-xs text-slate-400 font-bold bg-slate-100 px-3 py-1.5 rounded-full font-sans">
            توصيل
          </span>
        )}
      </div>

      <h2 className={`text-xl font-bold text-slate-800 leading-relaxed ${isCopticText(q.text) ? 'coptic-text' : 'font-sans'}`}>
        {q.text}
      </h2>

      {(q.type === "mcq" || q.type === "multi_select" || q.type === "boolean") && (
        <div className="space-y-3 mt-4" id={`answers-grp-${q.id}`}>
          {q.options.map((optVal: any, oIndex: number) => {
            const optText = typeof optVal === "object" && optVal !== null ? (optVal.text || "") : String(optVal);
            const isSelected = q.type === "multi_select"
              ? (Array.isArray(currentAnswer) ? currentAnswer.includes(optText) : false)
              : (currentAnswer === optText);
            const optionIsCoptic = isCopticText(optText);

            const handleToggle = () => {
              if (q.type === "multi_select") {
                let nextAnswer: string[];
                if (Array.isArray(currentAnswer)) {
                  if (currentAnswer.includes(optText)) {
                    nextAnswer = currentAnswer.filter((x: string) => x !== optText);
                  } else {
                    nextAnswer = [...currentAnswer, optText];
                  }
                } else {
                  nextAnswer = [optText];
                }
                onAnswer(q.id, nextAnswer);
              } else {
                onAnswer(q.id, optText);
              }
            };

            return (
              <div
                role="button"
                tabIndex={0}
                key={oIndex}
                onClick={handleToggle}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleToggle();
                  }
                }}
                className={`w-full text-right p-4 rounded-xl border-2 cursor-pointer transition-all duration-150 ease-in-out flex items-center justify-between transform hover:scale-[1.01] active:scale-[0.99] outline-none ${
                  isSelected
                    ? "bg-amber-50/80 border-[#d4af37] text-amber-950 font-medium shadow-sm"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-normal"
                }`}
                id={`label-${q.id}-${oIndex}`}
              >
                <div className="flex items-center gap-3">
                  {/* Circular radio for MCQ/Boolean, Square checkbox with rounded-md for Multi Selection */}
                  <div
                    className={`w-5 h-5 flex items-center justify-center transition-all duration-150 shrink-0 ${
                      q.type === "multi_select"
                        ? "rounded-md border-2"
                        : "rounded-full border-2"
                    } ${
                      isSelected
                        ? "border-[#d4af37] bg-[#d4af37] text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isSelected && <Check size={12} className="stroke-[3px]" />}
                  </div>
                  <span className={`text-sm sm:text-base leading-relaxed ${optionIsCoptic ? 'coptic-text' : ''}`}>{optText}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {q.type === "fill" && (
        <input
          type="text"
          id={`input-fill-${q.id}`}
          placeholder="اكتب إجابتك هنا بوضوح ودقة..."
          value={currentAnswer || ""}
          onChange={(e) => onAnswer(q.id, e.target.value)}
          className={`w-full px-4 py-3.5 border-2 border-slate-200 focus:border-[#d4af37] focus:ring-4 focus:ring-amber-100 rounded-xl bg-slate-50 hover:bg-slate-50/50 focus:bg-white outline-none font-bold text-slate-850 transition-all ${isCopticText(currentAnswer) ? 'coptic-text' : 'font-sans'}`}
        />
      )}

      {q.type === "matching" && q.matchingPairs && (
        <div className="space-y-3 mt-4" id={`matching-grp-${q.id}`}>
          <p className="text-xs text-slate-400 mb-2 font-black font-sans bg-slate-50 px-3 py-1.5 rounded-lg inline-block">
            اختر الإقران الصحيح لكل عنصر من القائمة اليسرى:
          </p>
          {q.matchingPairs.map((pair: any, pIdx: number) => {
            const currentListAnswers = currentAnswer || {};
            const isPairSelected = !!currentListAnswers[pIdx];
            const leftIsCoptic = isCopticText(pair.left);
            const selectedValIsCoptic = isCopticText(currentListAnswers[pIdx]);
            return (
              <div
                key={pIdx}
                className={`grid grid-cols-1 sm:grid-cols-3 gap-4 items-center p-4 border rounded-xl transition-all duration-150 ${
                  isPairSelected
                    ? "bg-amber-50/40 border-amber-200/80 shadow-sm"
                    : "bg-white border-slate-200"
                }`}
                id={`matching-pair-${q.id}-${pIdx}`}
              >
                <span className={`font-bold text-slate-700 text-sm ${leftIsCoptic ? 'coptic-text' : ''}`}>
                  {pair.left}
                </span>
                <span className="text-slate-400 text-center hidden sm:block font-black">
                  ←
                </span>
                <select
                  id={`select-match-${q.id}-${pIdx}`}
                  value={currentListAnswers[pIdx] || ""}
                  onChange={(e) => {
                    const nextList = {
                      ...currentListAnswers,
                      [pIdx]: e.target.value,
                    };
                    onAnswer(q.id, nextList);
                  }}
                  className={`px-3 py-2 border border-slate-300 focus:border-[#d4af37] focus:ring-2 focus:ring-amber-100 rounded-lg bg-white font-bold text-xs text-slate-700 outline-none transition-all ${selectedValIsCoptic ? 'coptic-text' : 'font-sans'}`}
                >
                  <option value="">اختر المطابقة الصحيحة...</option>
                  {(q as any).shuffledRights?.map(
                    (rItem: string, rIdx: number) => (
                      <option key={rIdx} value={rItem} className={isCopticText(rItem) ? 'coptic-text' : ''}>
                        {rItem}
                      </option>
                    ),
                  )}
                </select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.currentAnswer === nextProps.currentAnswer &&
    prevProps.qIdx === nextProps.qIdx &&
    prevProps.totalQuestions === nextProps.totalQuestions &&
    prevProps.q?.id === nextProps.q?.id &&
    prevProps.q?.text === nextProps.q?.text
  );
});
QuestionCard.displayName = "QuestionCard";

export interface LiveExamGatewayProps {
  setCurrentScreen?: (screen: string) => void;
  setCurrentStudent?: (student: any) => void;
  setActiveExam?: (exam: any) => void;
}

export const LiveExamGateway: React.FC<LiveExamGatewayProps> = ({ 
  setCurrentScreen,
  setCurrentStudent,
  setActiveExam: setParentActiveExam
}) => {
  const [isExamCardHovered, setIsExamCardHovered] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [middleNameValidation, setMiddleNameValidation] = useState('');
  const [activeStudent, setActiveStudent] = useState<any>(null);
  const [completedExams, setCompletedExams] = useState<string[]>([]);
  const [examsPool, setExamsPool] = useState<any[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<string | null>(
    null,
  );
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [examSecondsLeft, setExamSecondsLeft] = useState(900); // 15 mins default timer
  const [errors, setErrors] = useState<string | null>(null);

  const [isExamCompleted, setIsExamCompleted] = useState(false);
  const [isAlreadyExamined, setIsAlreadyExamined] = useState(false);
  const [score, setScore] = useState(0);
  const [deviceInfo, setDeviceInfo] = useState({
    ip: "جاري التحميل...",
    type: "غير معروف",
    count: 0,
  });
  const [fingerprint, setFingerprint] = useState<DeviceFingerprint | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [hasSubmissionFailed, setHasSubmissionFailed] = useState(false);
  const [isTerminated, setIsTerminated] = useState(false);
  const [completedSubjects, setCompletedSubjects] = useState<
    Record<string, number | null>
  >({
    derasy: null,
    mahfozat: null,
    qebty_lvl1: null,
    qebty_lvl2: null,
  });
  const [allAnswers, setAllAnswers] = useState<Record<string, any>>({});
  const [examConfig, setExamConfig] = useState<any>({
    isExamLive: true,
    autoCloseTime: null,
    churchOverrides: {},
    stageOverrides: {},
  });

  const [globalSettings, setGlobalSettings] = useState<any>({
    is_exam_locked: false,
    is_registration_locked: false,
    is_book_orders_locked: false,
    is_site_disabled: false,
  });
  const [granularControls, setGranularControls] = useState<any[]>([]);
  const [isGateChecking, setIsGateChecking] = useState(true);
  const [isExamBlocked, setIsExamBlocked] = useState(false);

  useEffect(() => {
    const checkGateStatus = async () => {
      let student = activeStudent;
      if (!student) {
        const activeStudentId = localStorage.getItem("active_student_id");
        if (activeStudentId) {
          const cached = localStorage.getItem(`student_profile_${activeStudentId}`);
          if (cached) {
            try { student = JSON.parse(cached); } catch(e) {}
          }
        }
      }
      
      if (!student || !student.stage) {
        setIsGateChecking(false);
        return;
      }

      setIsGateChecking(true);
      try {
        const { data: sysData } = await supabase.from('system_settings').select('is_exam_locked').eq('id', '1').maybeSingle();
        if (sysData?.is_exam_locked) {
          setIsExamBlocked(true);
          setIsGateChecking(false);
          return;
        }

        const { data, error } = await supabase
          .from('granular_controls')
          .select('is_exam_disabled, exam_start_at, exam_end_at')
          .eq('target_name', student.stage)
          .maybeSingle();

        const now = new Date();
        const start = data?.exam_start_at ? new Date(data.exam_start_at) : null;
        const end = data?.exam_end_at ? new Date(data.exam_end_at) : null;

        if (start && now < start) {
          setIsExamBlocked(true);
          // TODO: handle displaying the blocked message with dynamic time information. Hardcoding for now as a simple message.
        } else if (end && now > end) {
          setIsExamBlocked(true);
        } else if (data?.is_exam_disabled) {
          setIsExamBlocked(true);
        } else {
          setIsExamBlocked(false);
        }
      } catch (err) {
        setIsExamBlocked(false);
      } finally {
        setIsGateChecking(false);
      }
    };

    checkGateStatus();
  }, [activeStudent?.stage]);

  // Load configuration from Supabase once on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data, error } = await supabase
          .from("exam_config")
          .select("*")
          .maybeSingle();
        if (data && !error) {
          setExamConfig({
            isExamLive: data.is_exam_live ?? data.isExamLive ?? true,
            autoCloseTime: data.auto_close_time ?? data.autoCloseTime ?? null,
            churchOverrides:
              data.church_overrides ?? data.churchOverrides ?? {},
            stageOverrides: data.stage_overrides ?? data.stageOverrides ?? {},
          });
        }
      } catch (e) {
        console.warn("Failed to fetch exam_config from Supabase:", e);
      }

      try {
        const { data: globalRes } = await supabase.from("system_settings").select("*").eq("id", "1").maybeSingle();
        if (globalRes) {
          setGlobalSettings({
            is_exam_locked: !!globalRes.is_exam_locked,
            is_registration_locked: !!globalRes.is_registration_locked,
            is_book_orders_locked: !!globalRes.is_book_orders_locked,
            is_site_disabled: !!globalRes.is_site_disabled,
          });
        }
      } catch (e) {
        console.warn("Failed to fetch system_settings:", e);
      }
    };
    fetchConfig();
  }, []);

  // Sync state with active student on localstorage
  useEffect(() => {
    const activeStudentId = localStorage.getItem("active_student_id");
    if (activeStudentId) {
      const cached = localStorage.getItem(`student_profile_${activeStudentId}`);
      if (cached) {
        try {
          setActiveStudent(JSON.parse(cached));
        } catch (e) {
          console.error("Error parsing cached active student:", e);
        }
      }
    }
  }, []);

  // Load completed exams and exams pool when active student changes
  useEffect(() => {
    const fetchStudentSubmissionsAndExams = async () => {
      if (activeStudent?.id) {
        try {
          const { data: userSubmissions, error: subError } = await supabase
            .from("exam_submissions")
            .select("exam_id")
            .eq("student_id", activeStudent.id);
          
          if (!subError && userSubmissions) {
            const completedIds = userSubmissions.map(s => s.exam_id).filter(Boolean);
            setCompletedExams(completedIds);
          }
        } catch (e) {
          console.error("Error fetching student submissions:", e);
        }
      } else {
        setCompletedExams([]);
      }
      
      try {
        const pool = await fetchAllExamsAndCache();
        setExamsPool(pool);
      } catch (e) {
        console.error("Error loading exams pool:", e);
      }
    };
    
    fetchStudentSubmissionsAndExams();
  }, [activeStudent?.id]);

  // Add another useEffect to load/save completedSubjects and allAnswers to localStorage per-student
  useEffect(() => {
    if (activeStudent?.id) {
      // Load completed subjects and answers from localStorage if present
      const savedCompleted = localStorage.getItem(
        `completed_subjects_${activeStudent.id}`,
      );
      const savedAllAnswers = localStorage.getItem(
        `all_answers_${activeStudent.id}`,
      );

      if (savedCompleted) {
        try {
          setCompletedSubjects(JSON.parse(savedCompleted));
        } catch (e) {}
      } else {
        // If not in localStorage, default to standard scores or null
        setCompletedSubjects({
          derasy: activeStudent.academicScore ?? null,
          mahfozat: activeStudent.memorizationScore ?? null,
          qebty_lvl1: activeStudent.copticL1Score ?? null,
          qebty_lvl2: activeStudent.copticL2Score ?? null,
        });
      }

      if (savedAllAnswers) {
        try {
          setAllAnswers(JSON.parse(savedAllAnswers));
        } catch (e) {}
      } else if (activeStudent.detailed_answers) {
        try {
          const parsedAnswers =
            typeof activeStudent.detailed_answers === "string"
              ? JSON.parse(activeStudent.detailed_answers)
              : activeStudent.detailed_answers;

          if (Array.isArray(parsedAnswers)) {
            const restored = restoreFullAnswers(parsedAnswers);
            setAllAnswers(restored);
          } else if (
            typeof parsedAnswers === "object" &&
            parsedAnswers !== null
          ) {
            setAllAnswers(parsedAnswers);
          }
        } catch (e) {}
      }
    } else {
      setCompletedSubjects({
        derasy: null,
        mahfozat: null,
        qebty_lvl1: null,
        qebty_lvl2: null,
      });
      setAllAnswers({});
    }
  }, [activeStudent]);

  // Sync to localStorage
  useEffect(() => {
    if (activeStudent?.id) {
      localStorage.setItem(
        `completed_subjects_${activeStudent.id}`,
        JSON.stringify(completedSubjects),
      );
    }
  }, [completedSubjects, activeStudent?.id]);

  useEffect(() => {
    if (activeStudent?.id) {
      localStorage.setItem(
        `all_answers_${activeStudent.id}`,
        JSON.stringify(allAnswers),
      );
    }
  }, [allAnswers, activeStudent?.id]);

  // Reset active question index and default countdown timer when activeExam shifts
  useEffect(() => {
    if (activeExam) {
      setCurrentQuestionIdx(0);
      setExamSecondsLeft(900); // 15 mins default timer
    }
  }, [activeExam]);

  // Handle countdown timer decrementing
  useEffect(() => {
    if (!activeExam || isExamCompleted || isTerminated) return;
    
    const interval = setInterval(() => {
      setExamSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto submit the exam when time finishes!
          console.warn("Time expired. Force-submitting current student progress...");
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [activeExam, isExamCompleted, isTerminated]); // strictly omitted answers to prevent re-renders wiping timer

  // Auto submit when time hits 0 (explicit watcher)
  useEffect(() => {
    if (activeExam && !isExamCompleted && !isTerminated && examSecondsLeft === 0) {
      console.warn("Time expired. Force-submitting current student progress...");
      handleSubmitExam();
    }
  }, [examSecondsLeft, activeExam, isExamCompleted, isTerminated]);

  // Live Heartbeat (The Ping) - Postponed to next season
  // useEffect(() => {
  //   if (!activeExam || isExamCompleted || isTerminated || !activeStudent?.id) return;
  //   
  //   const pingInterval = setInterval(async () => {
  //     try {
  //       await supabase
  //         .from('exam_device_logs')
  //         .update({ last_ping: new Date().toISOString() })
  //         .eq('student_id', activeStudent.id);
  //     } catch (e) {
  //       console.warn("Heartbeat ping failed:", e);
  //     }
  //   }, 15000); // every 15 seconds
  // 
  //   return () => clearInterval(pingInterval);
  // }, [activeExam, isExamCompleted, isTerminated, activeStudent]);
  // Load device info on mount
  useEffect(() => {
    const fp = getDeviceFingerprint();
    setFingerprint(fp);

    fetch("https://api.ipify.org?format=json")
      .then((res) => res.json())
      .then((data) => {
        setDeviceInfo((prev) => ({ ...prev, ip: data.ip }));
      })
      .catch(() => setDeviceInfo((prev) => ({ ...prev, ip: "مخفي/غير متاح" })));

    const ua = navigator.userAgent;
    let type = "Desktop";
    if (/android/i.test(ua)) type = "Android";
    else if (/iPad|iPhone|iPod/.test(ua)) type = "iPhone/iOS";
    setDeviceInfo((prev) => ({ ...prev, type }));
  }, []);

  const fetchStudentAndExam = async (input: string) => {
    if (!input || !input.trim()) return;
    try {
      setIsScanning(false);
      setIsLoading(true);
      let studentId = input.trim();
      let studentNameFromPayload = "";

      try {
        if (input.includes("{")) {
          const payload = JSON.parse(input);
          studentId = (payload.studentID || payload.id || input)
            .toString()
            .trim();
          studentNameFromPayload = payload.fullName || "";
        }
      } catch (e) {}

      const normalizedId = studentId.toLowerCase();

      // Query standard Supabase registrations table first
      const { data: studentObj, error: fetchErr } = await supabase
        .from("registrations")
        .select("*")
        .eq("student_id", normalizedId)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      let studentData: any = null;

      if (!studentObj) {
        setIsLoading(false);
        return alert("عفواً، هذا الكود غير مسجل بمهرجان هذا العام.");
      }

      studentData = {
        id: studentObj.student_id,
        studentName:
          studentObj.name ||
          studentObj.student_name ||
          studentNameFromPayload ||
          "طالب",
        churchName:
          studentObj.churchName ||
          studentObj.church ||
          studentObj.church_name ||
          studentObj.church_Name ||
          "غير محدد",
        church_name:
          studentObj.church_name ||
          studentObj.churchName ||
          studentObj.church ||
          studentObj.church_Name ||
          "غير محدد",
        church_Name:
          studentObj.church_Name ||
          studentObj.church_name ||
          studentObj.churchName ||
          studentObj.church ||
          "غير محدد",
        stage: studentObj.stage || "عام",
        gender: studentObj.gender || "",
        coptic_level: studentObj.coptic_level ?? null,
        enrolled_subjects:
          (studentObj.competitions || studentObj.enrolled_subjects) ?? null,
      };

      // 1. بنجيب السطر الفريد والوحيد للطالب من جدول الإرسال
      const { data: userSubmission, error: subError } = await supabase
        .from("exam_submissions")
        .select("*") // بنجيب كل الأعمدة (المسابقات) للسطر ده
        .eq("student_id", studentData.id)
        .maybeSingle(); // لأنه سطر واحد فقط لكل طالب

      if (subError) {
        console.warn("Error fetching student submissions:", subError);
      }

      if (userSubmission) {
        // 2. بنشوف إيه الأسماء بتاعة الخانات (المسابقات) اللي قيمتها مش فاضية (يعني حلها قبل كده)
        // بنلف على كل الخانات، ولو الخانة مش null ومش الـ IDs الأساسية، بنعتبرها مسابقة مخلصة
        const completedIds = Object.keys(userSubmission).filter(key => {
          const ignoredFields = ['id', 'student_id', 'created_at', 'updated_at'];
          return !ignoredFields.includes(key) && userSubmission[key] !== null;
        });

        setCompletedExams(completedIds); // هيرجع array بأسماء الخانات المخلصة مثلاً: ['alhan']
      } else {
        setCompletedExams([]);
      }
      // Lock-in student profile
      setSelectedCompetition(null);
      setActiveExam(null);
      setIsExamCompleted(false);
      setIsAlreadyExamined(false);
      setIsTerminated(false);
      setAnswers({});
      setActiveStudent(studentData);

      localStorage.setItem("active_student_id", studentData.id);
      localStorage.setItem(
        `student_profile_${studentData.id}`,
        JSON.stringify(studentData),
      );

      setIsScanning(false);
      setIsLoading(false);

      // Try playing sensory beep and trigger vibration logic
      try {
        const AudioContext =
          window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          osc.connect(gainNode);
          gainNode.connect(ctx.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
        }
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
      } catch (err) {}
    } catch (e: any) {
      setIsLoading(false);
      alert("حدث خطأ غير متوقع: " + (e.message || "Error occurred"));
    }
  };

  const startExam = async (competitionType: string) => {
    try {
      if (!activeStudent) return;
      setIsLoading(true);
      setErrors(null);

      const stage = activeStudent.stage || "عام";

      if (globalSettings.is_exam_locked) {
        setIsLoading(false);
        return alert("عذراً، الامتحانات الإلكترونية مغلقة بالكامل بقرار من اللجنة المركزية 🔒");
      }

      // Get exams_pool info without devicelogs check

      if (examConfig) {
        if (!examConfig.isExamLive) {
          setIsLoading(false);
          return alert("عذراً، الامتحانات مغلقة الآن بقرار من اللجنة المركزية");
        }

        if (examConfig.autoCloseTime) {
          const now = new Date();
          const [hours, minutes] = examConfig.autoCloseTime
            .split(":")
            .map(Number);
          const closeTime = new Date();
          closeTime.setHours(hours, minutes, 0, 0);

          if (now > closeTime) {
            setIsLoading(false);
            return alert(
              `عذراً، انتهى الوقت المحدد للامتحانات اليوم (${examConfig.autoCloseTime})`,
            );
          }
        }
        if (examConfig.churchOverrides?.[activeStudent.churchName] === false) {
          setIsLoading(false);
          return alert(
            `عذراً، الامتحانات مغلقة حالياً لكنيسة ${activeStudent.churchName}`,
          );
        }
        if (examConfig.stageOverrides?.[stage] === false) {
          setIsLoading(false);
          return alert(`عذراً، الامتحانات مغلقة حالياً لمرحلة ${stage}`);
        }
      }

      if (!isStudentEnrolledInCompetition(activeStudent, competitionType)) {
        setIsLoading(false);
        return alert(
          "عذراً، أنت غير مسجل في هذه المسابقة. يرجى مراجعة اللجنة .",
        );
      }

      if (
        competitionType === "قبطي مستوى أول" &&
        Number(activeStudent.coptic_level) === 2
      ) {
        setIsLoading(false);
        return alert("غير مسموح لك بدخول مستوى قبطي مخالف لمستواك المسجل.");
      }
      if (
        competitionType === "قبطي مستوى ثاني" &&
        Number(activeStudent.coptic_level) === 1
      ) {
        setIsLoading(false);
        return alert("غير مسموح لك بدخول مستوى قبطي مخالف لمستواك المسجل.");
      }

      const scoreField = SCORE_FIELD_MAP[competitionType];
      const fieldMap: Record<string, string> = {
        academicScore: "academicScore",
        memorizationScore: "memorizationScore",
        copticL1Score: "copticL1Score",
        copticL2Score: "copticL2Score",
      };
      const studentField = fieldMap[scoreField];

      const keyMapObj: Record<string, string> = {
        دراسي: "derasy",
        محفوظات: "mahfozat",
        "قبطي مستوى أول": "qebty_lvl1",
        "قبطي مستوى ثاني": "qebty_lvl2",
      };
      const subKey = keyMapObj[competitionType];

      if (
        (subKey && completedSubjects[subKey] !== null) ||
        (activeStudent[studentField] !== undefined &&
          activeStudent[studentField] !== null)
      ) {
        setIsLoading(false);
        setScore(
          subKey && completedSubjects[subKey] !== null
            ? completedSubjects[subKey]!
            : activeStudent[studentField],
        );
        setIsAlreadyExamined(true);
        setIsExamCompleted(true);
        setSelectedCompetition(competitionType);
        return;
      }

      // Explicitly clear temporary cash states
      localStorage.removeItem(`exam_${activeStudent.id}_${competitionType}`);
      setAnswers({});
      setIsExamCompleted(false);
      setIsTerminated(false);

      // Read exams from cache or fetch all exams pool once per day (Zero-Egress Strategy)
      const allCachedPool = await fetchAllExamsAndCache();
      const matchedExams = allCachedPool.filter(
        (row: any) =>
          String(row.stage).trim() === String(stage).trim() &&
          normalizeArabic(row.subject || row.competition_type) ===
            normalizeArabic(competitionType),
      );

      // Fetch cumulative submission check from the server to avoid local caching bypasses
      const { data: submissionCheck } = await supabase
        .from('exam_submissions')
        .select('exam_id')
        .eq('student_id', String(activeStudent.id))
        .maybeSingle();

      // 🛡️ الفحص الأكثر حزماً (يمنع الدخول للمسابقة التي تم تسليمها فقط)
      const targetComp = (competitionType || "").trim();
      const hasTakenThisCompetition =
        submissionCheck &&
        submissionCheck.exam_id &&
        String(submissionCheck.exam_id).trim().includes(targetComp);

      // 🔥 الفرامل الحازمة:
      if (hasTakenThisCompetition) {
        setErrors("لقد قمت بتقديم هذه المسابقة مسبقاً ولا يمكنك الدخول إليها مرة أخرى.");
        setIsLoading(false);
        return;
      }

      const availableExams: Exam[] = matchedExams
        .map((row: any) => ({
          id: row.id,
          stage: row.stage,
          competitionType: row.subject || row.competition_type || "",
          model: row.model || row.model_type || "A",
          questions: row.questions_data || [],
          isActive: row.is_active ?? true,
          updatedAt: row.updated_at || "",
        }))
        .filter((exam) => exam.isActive !== false);

      if (availableExams.length === 0) {
        setIsLoading(false);
        return alert(
          `لا يوجد امتحان متاح لمرحلة ${stage} في مسابقة ${competitionType}`,
        );
      }

      const randomModel =
        availableExams[Math.floor(Math.random() * availableExams.length)];

      let shuffledQuestions = [...randomModel.questions];
      const isCoptic = ["قبطي مستوى أول", "قبطي مستوى ثاني"].includes(competitionType);

      if (!isCoptic) {
        shuffledQuestions = shuffledQuestions.sort(() => 0.5 - Math.random());
      }

      shuffledQuestions.forEach((q) => {
        // 1️⃣ حماية اللخبطة: التأكد أننا نتعامل مع نسخ وليس مراجع مباشرة إذا لزم الأمر
        if (!isCoptic) {
          if (q.type === "mcq" || q.type === "multi_select") {
            if (Array.isArray(q.options)) {
              q.options = [...q.options].sort(() => 0.5 - Math.random());
            }
          }
        }

        // 2️⃣ منطق التوصيل: سليم، لكن تأكد أن الـ matchingPairs هيكلها ثابت
        if (q.type === "matching" && q.matchingPairs) {
          const rights = [...q.matchingPairs].map((p: any) => p.right);
          if (!isCoptic) {
            (q as any).shuffledRights = rights.sort(() => 0.5 - Math.random());
          } else {
            (q as any).shuffledRights = rights;
          }
        }
      });

      randomModel.questions = shuffledQuestions;

      setSelectedCompetition(competitionType);
      setActiveExam(randomModel);
      localStorage.setItem(`exam_start_time_${activeStudent.id}`, Date.now().toString());

      // DEVICE METADATA EXTRACTION & LOGGING CONSOLIDATION - Postponed to next season
      // try {
      //   const parser = new UAParser();
      //   const result = parser.getResult();
      //   const osName = result.os.name || "Unknown OS";
      //   const deviceType = result.device.type || "Desktop";
      //   const userAgent = navigator.userAgent;
      // 
      //   await supabase.from("exam_device_logs").upsert({
      //     student_id: String(activeStudent.id),
      //     student_name: activeStudent.studentName || activeStudent.name || "بدون اسم",
      //     church: activeStudent.churchName || "غير مكتمل",
      //     stage: stage,
      //     device_name: userAgent,
      //     device_type: deviceType,
      //     os_version: osName,
      //     ip_address: deviceInfo?.ip || "127.0.0.1",
      //     last_known_ip: deviceInfo?.ip || "127.0.0.1",
      //     exam_id: randomModel?.id || null,
      //     started_at: new Date().toISOString(),
      //     status: "active",
      //     last_ping: new Date().toISOString()
      //   }, { onConflict: 'student_id' });
      // } catch (logErr) {
      //   console.error("Failed to update exam_device_logs on start:", logErr);
      // }
      // 
      // // Update monitoring with chosen exam
      // try {
      //   await supabase
      //     .from("live_monitoring")
      //     .update({
      //       device_type: `يجري امتحان: ${competitionType}`,
      //       updated_at: new Date().toISOString(),
      //     })
      //     .eq("student_id", activeStudent.id);
      // } catch (e) {
      //   console.error("Failed to update live monitoring:", e);
      // }

      setIsLoading(false);
    } catch (e: any) {
      console.error(e);
      setIsLoading(false);
      alert("حدث خطأ في بدء الامتحان: " + e.message);
    }
  };

  const handleAnswer = useCallback((qid: string, val: any) => {
    setAnswers((prev) => {
      const next = { ...prev, [qid]: val };
      if (activeStudent && selectedCompetition) {
        localStorage.setItem(
          `exam_${activeStudent.id}_${selectedCompetition}`,
          JSON.stringify(next),
        );
      }
      return next;
    });
  }, [activeStudent, selectedCompetition]);

  const handleConfirmAndReturn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault(); // 👈 CRITICAL: Prevents HTML form side-effects/freezing

    if (!activeExam || !activeStudent || !selectedCompetition) return;
    setIsLoading(true);

    let totalScore = 0;

    activeExam.questions.forEach((q) => {
      const stdAns = answers[q.id];
      const correctAns = q.correctAnswers?.[0];

      if (!stdAns) return;

      if (q.type === "multi_select") {
        const selectedList = Array.isArray(stdAns) ? stdAns : [];
        q.options.forEach((opt: any) => {
          const optText = typeof opt === "object" && opt !== null ? (opt.text || "") : String(opt);
          const optScore = typeof opt === "object" && opt !== null ? Number(opt.score || 0) : 0;
          const isMatch = selectedList.some((s: string) => 
            String(s).trim() === String(optText).trim() ||
            normalizeArabic(s) === normalizeArabic(optText)
          );
          if (isMatch) {
            totalScore += optScore;
          }
        });
      } else if (q.type === "mcq") {
        const selectedText = String(stdAns);
        let foundScore = null;
        q.options.forEach((opt: any) => {
          const optText = typeof opt === "object" && opt !== null ? (opt.text || "") : String(opt);
          const optScore = typeof opt === "object" && opt !== null ? Number(opt.score || 0) : 0;
          if (normalizeArabic(optText) === normalizeArabic(selectedText)) {
            if (typeof opt === "object" && opt !== null && "score" in opt) {
              foundScore = optScore;
            }
          }
        });
        if (foundScore !== null) {
          totalScore += foundScore;
        } else {
          const correctAns = q.correctAnswers?.[0];
          if (normalizeArabic(selectedText) === normalizeArabic(String(correctAns))) {
            totalScore += q.points;
          }
        }
      } else if (q.type === "boolean" || q.type === "fill") {
        if (
          normalizeArabic(String(stdAns)) ===
          normalizeArabic(String(correctAns))
        ) {
          totalScore += q.points;
        }
      } else if (q.type === "matching") {
        let correctMatches = 0;
        const matchingPairs = q.matchingPairs || [];
        matchingPairs.forEach((pair, pIdx) => {
          const sMatch = stdAns[pIdx];
          const rMatch = pair.right;
          if (normalizeArabic(sMatch) === normalizeArabic(rMatch)) {
            correctMatches++;
          }
        });
        if (correctMatches === matchingPairs.length) totalScore += q.points;
      }
    });

    const keyMapObj: Record<string, string> = {
      دراسي: "derasy",
      محفوظات: "mahfozat",
      "قبطي مستوى أول": "qebty_lvl1",
      "قبطي مستوى ثاني": "qebty_lvl2",
    };
    const key = keyMapObj[selectedCompetition];

    if (key) {
      setCompletedSubjects((prev) => {
        const next = { ...prev, [key]: totalScore };
        localStorage.setItem(
          `completed_subjects_${activeStudent.id}`,
          JSON.stringify(next),
        );
        return next;
      });

      setAllAnswers((prev) => {
        const next = { ...prev, [selectedCompetition]: answers };
        localStorage.setItem(
          `all_answers_${activeStudent.id}`,
          JSON.stringify(next),
        );
        return next;
      });
    }

    // Live monitoring postponed to next season
    // try {
    //   await supabase
    //     .from("live_monitoring")
    //     .update({
    //       device_type: `حفظ مادة: ${selectedCompetition}`,
    //       updated_at: new Date().toISOString(),
    //     })
    //     .eq("student_id", activeStudent.id);
    // } catch (e) {
    //   console.error("Failed to update status monitor:", e);
    // }

    try {
      alert("تم حفظ وإرسال إجابات المسابقة بنجاح! 🎉");
    } catch (_) {}

    // 2. Clear current exam state and route back to the student exams grid view
    if (typeof setActiveExam === "function") setActiveExam(null);
    if (typeof setSelectedCompetition === "function")
      setSelectedCompetition(null);

    setIsLoading(false);
  };

  const handleSubmitExam = async (e?: React.FormEvent) => {
    await handleConfirmAndReturn(e);
  };

  const handleFinalSubmission = async (e?: React.FormEvent) => {
    if (e) e.preventDefault(); // 👈 CRITICAL: Prevents HTML form locking/reloading behavior

    if (middleNameValidation.trim() !== '') {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        setIsExamCompleted(true);
        // Simulate a success alert to prevent bot retry
        alert("تم تسليم الامتحان بالكامل ليظهر في السجل العام بنجاح!");
      }, 800);
      return;
    }

    let currentStudentObj = activeStudent;
    let currentCompletedSubjects = completedSubjects;
    let currentAllAnswers = allAnswers;

    if (!currentStudentObj) {
      const activeStudentId = localStorage.getItem("active_student_id");
      if (activeStudentId) {
        const cached = localStorage.getItem(`student_profile_${activeStudentId}`);
        if (cached) {
          try {
            currentStudentObj = JSON.parse(cached);
            setActiveStudent(currentStudentObj);

            const savedCompleted = localStorage.getItem(`completed_subjects_${activeStudentId}`);
            if (savedCompleted) {
              currentCompletedSubjects = JSON.parse(savedCompleted);
              setCompletedSubjects(currentCompletedSubjects);
            }
            const savedAllAnswers = localStorage.getItem(`all_answers_${activeStudentId}`);
            if (savedAllAnswers) {
              currentAllAnswers = JSON.parse(savedAllAnswers);
              setAllAnswers(currentAllAnswers);
            }
          } catch (e) {
            console.error("Error restoring student profile from localStorage for submission retry:", e);
          }
        }
      }
    }

    if (!currentStudentObj) {
      alert("عذراً، لم يتم العثور على بيانات الطالب النشط.");
      return;
    }

    const anySaved = Object.values(currentCompletedSubjects).some(
      (score) => score !== null,
    );
    if (!anySaved) {
      alert(
        "عذراً، يجب إتمام وحفظ مادة واحدة على الأقل قبل تسليم الامتحان بالكامل.",
      );
      return;
    }

    if (
      !confirm(
        "هل أنت متأكد من تسليم وإرسال كافة المواد المكتملة كمسودة للامتحان النهائي؟ لن تتمكن من تعديل الإجابات بعد التسليم.",
      )
    )
      return;
    setIsLoading(true);

    try {
      const cachedExams = JSON.parse(
        localStorage.getItem("exams_pool_cache") || "[]",
      );

      let derasyTotal = 0;
      let mahfozatTotal = 0;
      let qebtyLvl1Total = 0;
      let qebtyLvl2Total = 0;
      let primaryExamId = "";

      const allCollectedAnswersArray = Object.entries(currentAllAnswers).flatMap(
        ([subj, ansObj]) => {
          const keyMapObj: Record<string, string> = {
            دراسي: "derasy",
            محفوظات: "mahfozat",
            "قبطي مستوى أول": "qebty_lvl1",
            "قبطي مستوى ثاني": "qebty_lvl2",
          };
          const compactSub = keyMapObj[subj] || subj;
          const examSchema = cachedExams.find(
            (e: any) =>
              String(e.stage).trim() === String(currentStudentObj.stage).trim() &&
              (e.competitionType === subj ||
                (e.subject || e.competition_type) === subj),
          );

          if (examSchema && !primaryExamId) {
            primaryExamId = examSchema.id;
          }

          return Object.entries(ansObj as Record<string, any>).map(
            ([qid, val]) => {
              let compactAns: any = val;
              let calculatedPts = 0;

              if (examSchema) {
                const questionsList =
                  examSchema.questions || examSchema.questions_data || [];
                const question = questionsList.find((qu: any) => qu.id === qid);
                if (question) {
                  const correctAns = question.correctAnswers?.[0];
                  if (question.type === "mcq") {
                    compactAns =
                      question.options?.indexOf(val) !== -1
                        ? question.options?.indexOf(val)
                        : val;
                    let foundScore = null;
                    question.options?.forEach((opt: any) => {
                      const optText = typeof opt === "object" && opt !== null ? (opt.text || "") : String(opt);
                      const optScore = typeof opt === "object" && opt !== null ? Number(opt.score || 0) : 0;
                      if (normalizeArabic(optText) === normalizeArabic(String(val))) {
                        if (typeof opt === "object" && opt !== null && "score" in opt) {
                          foundScore = optScore;
                        }
                      }
                    });
                    if (foundScore !== null) {
                      calculatedPts = foundScore;
                    } else {
                      if (
                        normalizeArabic(String(val)) ===
                        normalizeArabic(String(correctAns))
                      ) {
                        calculatedPts = Number(question.points) || 0;
                      }
                    }
                  } else if (question.type === "multi_select") {
                    compactAns = val;
                    const selectedList = Array.isArray(val) ? val : [];
                    calculatedPts = 0; // Reset to ensure we sum individual option scores
                    
                    question.options?.forEach((opt: any) => {
                      const optText = typeof opt === "object" && opt !== null ? (opt.text || "") : String(opt);
                      const optScore = typeof opt === "object" && opt !== null ? Number(opt.score || 0) : 0;
                      
                      const isMatch = selectedList.some((s: string) => 
                        String(s).trim() === String(optText).trim() ||
                        normalizeArabic(s) === normalizeArabic(optText)
                      );

                      if (isMatch) {
                        calculatedPts += optScore;
                      }
                    });
                  } else if (question.type === "boolean") {
                    compactAns =
                      question.options?.indexOf(val) !== -1
                        ? question.options?.indexOf(val)
                        : val;
                    if (
                      normalizeArabic(String(val)) ===
                      normalizeArabic(String(correctAns))
                    ) {
                      calculatedPts = Number(question.points) || 0;
                    }
                  } else if (question.type === "fill") {
                    compactAns = val;
                    if (
                      normalizeArabic(String(val)) ===
                      normalizeArabic(String(correctAns))
                    ) {
                      calculatedPts = Number(question.points) || 0;
                    }
                  } else if (question.type === "matching") {
                    calculatedPts = 0;
                    const matchingPairs = question.matchingPairs || [];
                    const matchedIndIndices: Record<number, number> = {};

                    let correctMatches = 0;
                    matchingPairs.forEach((pair: any, pIdx: number) => {
                      const sMatch =
                        val && typeof val === "object" ? val[pIdx] : "";
                      const rMatch = pair.right;
                      const rightList =
                        (question as any).shuffledRights ||
                        matchingPairs.map((p: any) => p.right);
                      matchedIndIndices[pIdx] = rightList.indexOf(sMatch);

                      if (normalizeArabic(sMatch) === normalizeArabic(rMatch)) {
                        correctMatches++;
                      }
                    });
                    compactAns = matchedIndIndices;
                    if (correctMatches === matchingPairs.length)
                      calculatedPts = Number(question.points) || 0;
                  }
                }
              }

              if (compactSub === "derasy") derasyTotal += calculatedPts;
              if (compactSub === "mahfozat") mahfozatTotal += calculatedPts;
              if (compactSub === "qebty_lvl1") qebtyLvl1Total += calculatedPts;
              if (compactSub === "qebty_lvl2") qebtyLvl2Total += calculatedPts;

              return {
                qId: qid,
                ans: compactAns,
                pts: calculatedPts,
                sub: compactSub,
              };
            },
          );
        },
      );

      // Calculate duration securely from database or local fallback
      let calculatedDurationInSeconds = 0;
      try {
        const localStart = localStorage.getItem(`exam_start_time_${currentStudentObj?.id}`);
        if (localStart) {
          calculatedDurationInSeconds = Math.floor((new Date().getTime() - Number(localStart)) / 1000);
        }
      } catch (err) {
        console.warn("Could not compute precise duration", err);
      }

      // Prepare the data matching exactly the `exam_submissions` table schema
      const currentStudentPayload = currentStudentObj ? {
        id: currentStudentObj.id,
        name: currentStudentObj.studentName || currentStudentObj.name || "بدون اسم",
        church: currentStudentObj.church_name || currentStudentObj.churchName || currentStudentObj.church_Name || currentStudentObj.church || "غير مكتمل",
        gender: currentStudentObj.gender || "",
        stage: currentStudentObj.stage || "ثالثة ورابعة"
      } : null;

      // DO NOT PASS RESET OR EMPTY VARIABLES HERE:
      const finalDerasyScore = derasyTotal || currentCompletedSubjects.derasy || 0;
      const finalMahfouzatScore = mahfozatTotal || currentCompletedSubjects.mahfozat || 0;
      const finalQebtyLvl1Score = qebtyLvl1Total || currentCompletedSubjects.qebty_lvl1 || 0;
      const finalQebtyLvl2Score = qebtyLvl2Total || currentCompletedSubjects.qebty_lvl2 || 0;
      const selectedAnswers = JSON.stringify(allCollectedAnswersArray);

      const totalScore = (Number(finalDerasyScore) || 0) + 
                         (Number(finalMahfouzatScore) || 0) + 
                         (Number(finalQebtyLvl1Score) || 0) + 
                         (Number(finalQebtyLvl2Score) || 0);

      // تأكد أولاً إن متغير اسم الطالب ممسوك من الشاشة أو من بيانات الدخول (مثلاً: studentData.name أو userProfile.name)
    const studentName = currentStudentPayload?.name || "مخدوم غير مسجل";

      // 1️⃣ أولاً: جلب الـ exam_id القديم المتسجل في السيرفر حالياً (لو موجود)
      const { data: oldSubmission } = await supabase
        .from('exam_submissions')
        .select('exam_id')
        .eq('student_id', currentStudentPayload?.id)
        .maybeSingle();

      const oldExamId = oldSubmission?.exam_id ? oldSubmission.exam_id.trim() : "";
      const currentExamId = (activeExam?.id || primaryExamId || "unknown").trim();

      // 2️⃣ ثانياً: دمج الـ ID الجديد مع القديم بذكاء وعمل تراكم (عشان ميمسحوش بعض)
      let combinedExamId = currentExamId;
      if (oldExamId && oldExamId !== "unknown") {
        combinedExamId = oldExamId.includes(currentExamId) 
          ? oldExamId 
          : `${oldExamId} + ${currentExamId}`;
      }

      // 3️⃣ ثالثاً: بناء الـ Payload الذكي باستخدام الـ combinedExamId المدموج
      let scoreUpdatePayload: any = {
        name: studentName,
        churchName: currentStudentPayload?.church,
        stage: currentStudentPayload?.stage,
        gender: currentStudentPayload?.gender,
        detailed_answers: JSON.parse(selectedAnswers || "[]"),
        exam_id: combinedExamId, // 🔥 السحر هنا: بقى يشيل القديم + الجديد مع بعض!
        is_published: true,
        duration_seconds: calculatedDurationInSeconds,
        status: "completed",
        submitted_at: new Date().toISOString()
      };

      // 4️⃣ رابعاً: دمج درجات المسابقة الحالية
      if (finalDerasyScore > 0) scoreUpdatePayload.derasy_score = finalDerasyScore;
      if (finalMahfouzatScore > 0) scoreUpdatePayload.mahfouzat_score = finalMahfouzatScore;
      if (finalQebtyLvl1Score > 0) scoreUpdatePayload.qebty_lvl1_score = finalQebtyLvl1Score;
      if (finalQebtyLvl2Score > 0) scoreUpdatePayload.qebty_lvl2_score = finalQebtyLvl2Score;

      // 5️⃣ خامساً: اللوجيك المشروط اللي بيحدد Insert أو Update (بتاعك زي ما هو)
      const { data: checkCheck } = await supabase
        .from('exam_submissions')
        .select('student_id')
        .eq('student_id', currentStudentPayload?.id)
        .maybeSingle();

      let dbResult;

      if (!checkCheck) {
        // لو الطالب جديد تماماً.. بنعمل INSERT لأول مرة
        scoreUpdatePayload.student_id = currentStudentPayload?.id;
        dbResult = await supabase
          .from('exam_submissions')
          .insert(scoreUpdatePayload);
      } else {
        // 🔥 لو الطالب موجود قبل كدة.. بنعمل UPDATE للخانة الجديدة بس ومبنلمسش القديم!
        dbResult = await supabase
          .from('exam_submissions')
          .update(scoreUpdatePayload)
          .eq('student_id', currentStudentPayload?.id);
      }

      // 6️⃣ سادساً: فحص الأخطاء كالمعتاد
      if (dbResult.error) {
        console.error("Supabase Error:", dbResult.error.message);
        alert(`فشل إرسال الإجابات لقاعدة البيانات: ${dbResult.error.message}`);
        setHasSubmissionFailed(true);
        setIsLoading(false);
        return;
      }

      console.log("تم الحفظ بنجاح !");
      const submittedExamId = activeExam?.id || "unknown";
      if (submittedExamId && submittedExamId !== "unknown") {
        setCompletedExams(prev => [...prev, String(submittedExamId)]);
      }
      // DO NOT clear React state, localStorage or navigate away BEFORE the above block resolves

      // Clean up local storage trace for this specific student
      localStorage.removeItem("exam_progress_" + currentStudentObj.id);
      localStorage.removeItem(`exam_start_time_${currentStudentObj.id}`);

      // device_log status logic has been removed permanently

      // Local update in cache
      const updatedProfile = {
        ...currentStudentObj,
        academicScore: finalDerasyScore,
        memorizationScore: finalMahfouzatScore,
        copticL1Score: finalQebtyLvl1Score,
        copticL2Score: finalQebtyLvl2Score,
      };

      localStorage.setItem(
        `student_profile_${currentStudentObj.id}`,
        JSON.stringify(updatedProfile),
      );

      // Cleanup localStorage details
      localStorage.removeItem("active_student_id");
      localStorage.removeItem(`student_profile_${currentStudentObj.id}`);
      localStorage.removeItem(`completed_subjects_${currentStudentObj.id}`);
      localStorage.removeItem(`all_answers_${currentStudentObj.id}`);
      for (const type of COMPETITION_TYPES) {
        localStorage.removeItem(`exam_${currentStudentObj.id}_${type}`);
      }

      // Purge all intermediate component states tracking answer indexes before success screen
      setAnswers({});
      setAllAnswers({});
      setCompletedSubjects({
        derasy: null,
        mahfozat: null,
        qebty_lvl1: null,
        qebty_lvl2: null,
      });

      setScore(0);
      setHasSubmissionFailed(false);
      setIsExamCompleted(true);
      alert("تم حفظ وإرسال إجابات المسابقة بنجاح! 🎉");

      // Clear current exam states and redirect back to the student grid view
      if (typeof setParentActiveExam === 'function') setParentActiveExam(null);
      if (typeof setCurrentStudent === 'function') setCurrentStudent(null);
      if (typeof setSelectedCompetition === 'function') setSelectedCompetition(null);
      if (typeof setCurrentScreen === 'function') {
        setCurrentScreen('student-exam');
      }
      setIsLoading(false);
    } catch (e: any) {
      console.error("Critical crash during submission handler:", e);
      setHasSubmissionFailed(true);
      setIsLoading(false);
      alert("حدث خطأ غير متوقع، برجاء مراجعة اتصال الشبكة والمحاولة مرة أخرى.");
    }
  };

  const handleBackToPortal = () => {
    if (typeof setParentActiveExam === 'function') setParentActiveExam(null);
    if (typeof setCurrentStudent === 'function') setCurrentStudent(null);
    if (typeof setCurrentScreen === 'function') setCurrentScreen('student-exam');
  };

  useEffect(() => {
    if (!activeStudent) {
      const activeStudentId = localStorage.getItem("active_student_id");
      if (!activeStudentId) {
        // If there's no active student and no local session, immediately return to portal.
        // This WIPE OUTs the old manual UI block.
        handleBackToPortal();
      }
    }
  }, [activeStudent]);

  if (!activeStudent) {
    const activeStudentId = localStorage.getItem("active_student_id");
    if (!activeStudentId) {
      return null;
    }
  }

  if (isGateChecking) {
    return (
      <div className="fixed inset-0 z-[250] bg-[#4a000b] flex flex-col items-center justify-center p-4 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-100 border-t-amber-500 mx-auto mb-6"></div>
        <p className="text-white font-bold text-xl">جاري التحقق من صلاحيات اللجنة...</p>
      </div>
    );
  }

  if (isExamBlocked) {
    return (
      <div className="fixed inset-0 z-[250] bg-[#4a000b] flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-white p-12 rounded-3xl max-w-lg shadow-xl shadow-rose-900/50">
          <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldX size={48} />
          </div>
          <h2 className="text-3xl font-black mb-4 text-rose-700">الامتحان مغلق</h2>
          <p className="text-slate-600 font-bold mb-8">
            عفواً، الامتحان مغلق حالياً بقرار من إدارة الكنترول المركزي. يرجى مراجعة المشرف الخاص بك.
          </p>
          <button
            onClick={() => {
              localStorage.removeItem("active_student_id");
              setActiveStudent(null);
              handleBackToPortal();
            }}
            className="px-8 py-3 bg-slate-100 text-slate-700 rounded-xl font-black hover:bg-slate-200 transition-all font-sans"
          >
            العودة للترتيب
          </button>
        </div>
      </div>
    );
  }

  if (isExamCompleted) {
    return (
      <div
        className="fixed inset-0 z-[250] bg-gradient-to-br from-[#4a000b] via-[#6b0311] to-[#2b0006] min-h-screen w-full overflow-y-auto flex flex-col items-center justify-center p-4 sm:p-6 font-arabic antialiased"
        id="exam-completed-outer-container"
      >
        <div
          className="text-center p-12 bg-white border border-emerald-250 rounded-3xl shadow-xl overflow-hidden relative w-full max-w-md mx-auto"
          id="exam-completed-card"
        >
          <div className="absolute top-0 inset-x-0 h-2 bg-emerald-500" />
          <h2
            className="text-3xl font-black mb-4 text-emerald-600"
            id="completed-header"
          >
            {isAlreadyExamined
              ? "لقد قمت بتسليم هذا الامتحان مسبقاً!"
              : "تم استلام إجاباتك بنجاح!"}
          </h2>
          <p className="text-slate-600 font-bold mb-6" id="completion-text-sub">
            نتمنى لك التوفيق دائمًا.
          </p>
          <button
            id="exit-completion-btn"
            onClick={() => {
              localStorage.removeItem("active_student_id");
              setIsExamCompleted(false);
              setIsAlreadyExamined(false);
              setActiveStudent(null);
              setActiveExam(null);
              setSelectedCompetition(null);
              setAnswers({});
              setAllAnswers({});
              setCompletedSubjects({
                derasy: null,
                mahfozat: null,
                qebty_lvl1: null,
                qebty_lvl2: null,
              });
              setIsTerminated(false);

              handleBackToPortal();
            }}
            className="px-8 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-black hover:bg-emerald-200 transition-all font-sans"
          >
            خروج البوابة
          </button>
        </div>
      </div>
    );
  }

  if (isTerminated) {
    return (
      <div
        className="fixed inset-0 z-[250] bg-gradient-to-br from-[#4a000b] via-[#6b0311] to-[#2b0006] min-h-screen w-full overflow-y-auto flex flex-col items-center justify-center p-4 sm:p-6 font-arabic antialiased"
        id="exam-terminated-outer-container"
      >
        <div
          className="text-center p-12 bg-white border border-rose-200 rounded-3xl shadow-xl overflow-hidden relative w-full max-w-md mx-auto"
          id="exam-terminated-card"
        >
          <div className="absolute top-0 inset-x-0 h-2 bg-rose-500" />
          <div
            className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm"
            id="terminated-shield-container"
          >
            <ShieldX size={48} />
          </div>
          <h2
            className="text-3xl font-black mb-4 text-slate-800"
            id="terminated-header"
          >
            تم إنهاء وتجميد الجلسة
          </h2>
          <p
            className="text-slate-450 font-medium mb-6 text-sm"
            id="terminated-subtext"
          >
            تم قطع الاتصال وحظر هذا الجهاز من اللجان المركزية.
          </p>
          <button
            id="terminated-exit-btn"
            onClick={() => {
              localStorage.removeItem("active_student_id");
              setIsTerminated(false);
              setActiveStudent(null);
              setActiveExam(null);
              setSelectedCompetition(null);
              setAnswers({});
              setAllAnswers({});
              setCompletedSubjects({
                derasy: null,
                mahfozat: null,
                qebty_lvl1: null,
                qebty_lvl2: null,
              });
              setIsExamCompleted(false);

              handleBackToPortal();
            }}
            className="px-8 py-3 bg-slate-100 text-slate-600 rounded-xl font-black hover:bg-slate-200 transition-all font-sans"
          >
            خروج
          </button>
        </div>
      </div>
    );
  }



  if (activeStudent && !selectedCompetition) {
    return (
      <div
        className="fixed inset-0 z-[250] bg-gradient-to-br from-[#4a000b] via-[#6b0311] to-[#2b0006] min-h-screen w-full overflow-y-auto pt-12 sm:pt-16 pb-12 px-4 sm:px-6 flex flex-col items-center font-arabic antialiased"
        id="student-selection-outer-container"
      >
        <h1 className="text-amber-400 font-extrabold text-3xl sm:text-4xl drop-shadow-md mb-8 text-center text-balance mt-4">
          بوابة الامتحان الالكترونية
        </h1>
        <div className="w-full max-w-2xl">
          <div
            className="bg-white/95 text-gray-900 rounded-2xl p-6 sm:p-8 shadow-xl border border-amber-500/20 text-center"
            id="student-selection-card"
          >
            {/* Section 2: METADATA STYLING UPGRADE - prominent and centered */}
            <div
              className="w-full text-center py-4 px-4 bg-white border border-amber-200 rounded-2xl text-sm font-medium text-gray-900 mb-6 shadow-sm flex flex-col items-center justify-center gap-1.5 animate-fade-in"
              id="live-exam-metadata-upgrade"
            >
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span
                  className="text-[#4a000b] text-xs font-black bg-amber-100 px-3 py-1 rounded-full border border-amber-200"
                  id="badge-stage"
                >
                  {activeStudent.stage}
                </span>
                <span
                  className="text-[#4a000b] text-xs font-black bg-amber-100 px-3 py-1 rounded-full border border-amber-200"
                  id="badge-church"
                >
                  كنيسة {activeStudent.churchName}
                </span>
              </div>
              <h3
                className="text-xl sm:text-2xl font-black text-[#4a000b] tracking-tight mt-2 break-words max-w-full"
                id="student-name-text"
              >
                المشترك:{" "}
                <span className="text-[#6b0311] block sm:inline">
                  {activeStudent.studentName}
                </span>
              </h3>
              <p
                className="text-[10px] sm:text-[11px] text-gray-600 font-bold uppercase tracking-wider mt-1"
                id="student-meta-details-sub"
              >
                المشترك النشط بالبوابة الرقمية • كود خاص:{" "}
                <span className="font-mono text-[#6b0311] font-black">
                  {activeStudent.id}
                </span>
              </p>
            </div>

            {errors && (
              <div className="bg-rose-50 border border-rose-200 text-rose-750 px-4 py-3 rounded-xl mb-6 text-sm font-black text-center flex items-center justify-center gap-2" id="gateway-errors-banner">
                <span className="text-rose-600">⚠️</span>
                <span>{errors}</span>
              </div>
            )}

          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto mb-8"
            id="competition-choices-grid"
          >
            {COMPETITION_TYPES.map((type) => {
              // Basic criteria validation
              if (
                type === "قبطي مستوى أول" &&
                Number(activeStudent.coptic_level) === 2
              )
                return null;
              if (
                type === "قبطي مستوى ثاني" &&
                Number(activeStudent.coptic_level) === 1
              )
                return null;

              const keyMapObj: Record<string, string> = {
                دراسي: "derasy",
                محفوظات: "mahfozat",
                "قبطي مستوى أول": "qebty_lvl1",
                "قبطي مستوى ثاني": "qebty_lvl2",
              };
              const subKey = keyMapObj[type];
              const scoreField = SCORE_FIELD_MAP[type];
              const fieldMap: Record<string, string> = {
                academicScore: "academicScore",
                memorizationScore: "memorizationScore",
                copticL1Score: "copticL1Score",
                copticL2Score: "copticL2Score",
              };
              const studentField = fieldMap[scoreField];
              const isSaved =
                (subKey && completedSubjects[subKey] !== null) ||
                (activeStudent[studentField] !== undefined &&
                  activeStudent[studentField] !== null);
              const isEnrolled = isStudentEnrolledInCompetition(
                activeStudent,
                type,
              );
              if (!isEnrolled) {
                return (
                  <div
                    key={type}
                    id={`competition-btn-${subKey}-locked`}
                    className="p-5 border border-slate-200 bg-slate-100 opacity-60 rounded-xl select-none flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 justify-between mb-1">
                        <h5 className="font-black text-xl text-slate-400">
                          {type}
                        </h5>
                        <span className="text-lg grayscale">🔒</span>
                      </div>
                      <span className="text-xs text-rose-500 font-bold block mt-3 bg-rose-50 border border-rose-150 px-3 py-1.5 rounded-xl text-center">
                        عذرًا، أنت غير مسجل في هذه المسابقة
                      </span>
                    </div>
                  </div>
                );
              }

              const matchingExam = examsPool.find(
                (row: any) =>
                  String(row.stage).trim() === String(activeStudent.stage || "عام").trim() &&
                  normalizeArabic(row.subject || row.competition_type) ===
                    normalizeArabic(type) &&
                  (row.is_active ?? true) !== false
              );
              const currentExamId = matchingExam ? String(matchingExam.id) : null;
              const isExamInCompletedExams = currentExamId ? completedExams.includes(currentExamId) : false;
              const isSubmitted = isExamInCompletedExams || isSaved;

              if (isSubmitted) {
                return (
                  <button
                    key={type}
                    id={`competition-btn-${subKey}`}
                    disabled={true}
                    className="p-5 rounded-xl border border-slate-300 bg-slate-100 opacity-70 cursor-not-allowed transition-all text-center flex flex-col justify-between w-full"
                  >
                    <h5 className="font-black text-xl mb-1 text-slate-500">
                      {type}
                    </h5>
                    <span className="text-xs text-slate-600 font-bold block mt-3 bg-slate-200 border border-slate-300 px-3 py-1.5 rounded-xl text-center font-sans">
                      🔒 Submitted Successfully
                    </span>
                  </button>
                );
              }

              return (
                <button
                  key={type}
                  id={`competition-btn-${subKey}`}
                  onClick={() => startExam(type)}
                  disabled={isLoading}
                  className="bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl p-5 shadow-lg transform hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-amber-300 text-center flex flex-col justify-between w-full"
                >
                  <h5 className="text-[#4a000b] font-black text-xl mb-1">
                    {type}
                  </h5>
                  <span className="text-[#6b0311]/80 font-medium text-sm block">
                    اضغط هنا لبدء الاختبار
                  </span>
                </button>
              );
            })}
          </div>

          <div
            className="flex flex-col max-w-xl mx-auto gap-4"
            id="portal-actions-block"
          >
            {/* Honeypot Anti-Bot Field */}
            <input
              type="text"
              name="_sub_backend_version_gate"
              style={{
                position: 'absolute',
                left: '-9999px',
                top: 'auto',
                width: '1px',
                height: '1px',
                overflow: 'hidden',
                opacity: 0
              }}
              tabIndex={-1}
              autoComplete="new-password"
              aria-hidden="true"
              value={middleNameValidation}
              onChange={(e) => setMiddleNameValidation(e.target.value)}
            />

            {hasSubmissionFailed && (
              <div 
                className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl text-center text-xs font-black leading-relaxed" 
                id="submission-fail-retry-alert"
              >
                ⚠️ يبدو أن هناك مشكلة في الاتصال بالشبكة ولم نتمكن من تسليم الإجابات. 
                <br />
                   إجاباتك محفوظة بأمان  في ذاكرة جهازك .
                <br />
                يرجى الضغط على زر "إعادة المحاولة" أدناه لتسليم الإجابات مجددًا.
              </div>
            )}

            <button
              type="button"
              id="final-exam-submit-btn"
              onClick={handleFinalSubmission}
              disabled={isLoading}
              className={`w-full py-4 rounded-2xl font-black text-lg shadow-xl transition-all font-sans flex items-center justify-center gap-2 ${
                hasSubmissionFailed 
                  ? "bg-amber-500 hover:bg-amber-600 hover:shadow-amber-950/40 text-[#4a000b]" 
                  : "bg-[#4a000b] hover:bg-[#6b0311] hover:shadow-lg text-white"
              }`}
            >
              {isLoading 
                ? (hasSubmissionFailed ? "جاري إعادة محاولة إرسال الإجابات... ⏳" : "جاري إرسال الإجابات... ⏳") 
                : (hasSubmissionFailed ? "إعادة تسليم الامتحان بالكامل 🔄" : "إرسال وتسليم الامتحان بالكامل ليظهر في السجل العام")}
            </button>

            <button
              id="cancel-exam-exit-btn"
              onClick={() => {
                localStorage.removeItem("active_student_id");
                setActiveStudent(null);

                handleBackToPortal();
              }}
              className="px-8 py-3 bg-rose-50 text-rose-600 rounded-xl font-black hover:bg-rose-100 transition-all font-sans"
            >
              إلغاء وخروج
            </button>
          </div>
        </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className="fixed inset-0 z-[250] bg-[#4a000b] flex flex-col items-center justify-center p-4 text-center"
        id="live-loader-outer-container"
      >
        <div className="w-full max-w-lg" id="loader-card">
          <h2 className="text-3xl sm:text-4xl font-black text-amber-300 mb-8 drop-shadow-md">
            أهلاً بك يا {activeStudent?.studentName || "طالب"}
          </h2>
          <div className="flex justify-center mb-8">
            <div 
              className="animate-spin rounded-full h-16 w-16 border-4 border-amber-100 border-t-amber-500 shadow-[0_0_15px_rgba(212,175,55,0.4)]" 
              id="loader-spin-icon"
            />
          </div>
          <p className="text-white font-bold text-2xl drop-shadow-md mb-3" id="loader-text-status">
            جاري تحميل أسئلة وتهيئة امتحان {selectedCompetition}...
          </p>
          <p className="text-white text-lg font-medium opacity-100 drop-shadow-md">
            برجاء الانتظار قليلاً وعدم إغلاق الصفحة
          </p>
        </div>
      </div>
    );
  }

  if (
    !activeExam ||
    !activeExam.questions ||
    activeExam.questions.length === 0
  ) {
    return (
      <div
        className="fixed inset-0 z-[250] bg-gradient-to-br from-[#4a000b] via-[#6b0311] to-[#2b0006] min-h-screen w-full overflow-y-auto flex flex-col items-center justify-center p-4 sm:p-6 font-arabic antialiased"
        id="no-exam-questions-outer-container"
      >
        <div
          className="text-center p-12 bg-white border border-rose-200 rounded-3xl shadow-xl w-full max-w-md mx-auto"
          id="no-exam-card"
        >
          <ShieldX className="text-rose-500 mx-auto mb-4" size={48} />
          <p className="text-slate-700 font-bold" id="no-exam-text-msg">
            عذراً، لم تضع اللجنة أي أسئلة مسبقة لهذا النموذج حاليًا.
          </p>
          <button
            id="return-selector-btn"
            onClick={() => {
              setActiveExam(null);
              setSelectedCompetition(null);
            }}
            className="mt-6 px-6 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors font-sans"
          >
            عودة للاختيار
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = activeExam.questions[currentQuestionIdx];
  const progressPercent = activeExam.questions.length > 0 
    ? ((currentQuestionIdx + 1) / activeExam.questions.length) * 100 
    : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const floatingCardStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '1.25rem',
    // Customized Soft, wide golden shadow (Dynamic spread & high blur)
    boxShadow: isExamCardHovered 
      ? '0px 40px 80px -10px rgba(212, 175, 55, 0.48)' 
      : '0px 30px 60px -15px rgba(212, 175, 55, 0.38)',
    transition: 'all 0.5s ease-in-out',
  };

  const isCopticActive = ["قبطي مستوى أول", "قبطي مستوى ثاني"].includes(selectedCompetition || "");

  return (
    <div className={`fixed inset-0 z-[250] overflow-y-auto bg-gradient-to-br from-[#6b0311] via-[#4a000b] to-[#2b0005] select-none flex items-center justify-center p-3 sm:p-6 ${isCopticActive ? "coptic-text coptic-exam-active" : ""}`} id="active-exam-viewport">
      {/* Centered background container for the Festival Logo, with subtle blend/opacity */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <img
          src={logo}
          alt="Festival Logo"
          className="w-80 h-80 sm:w-96 sm:h-96 object-contain opacity-10 blur-[6px] select-none mix-blend-overlay"
        />
      </div>

      <div
        className="w-full max-w-2xl relative z-10 py-4"
        id="active-exam-questions-outer-container"
      >
        <div
          className="overflow-hidden flex flex-col transition-all duration-500 ease-in-out hover:-translate-y-2"
          id="active-exam-questions-card"
          style={floatingCardStyle}
          onMouseEnter={() => setIsExamCardHovered(true)}
          onMouseLeave={() => setIsExamCardHovered(false)}
        >
          {/* Sticky Header with micro progress bar and countdown timer */}
          <div 
            className="p-5 sm:p-6 border-b border-rose-50/20 bg-slate-50/90 backdrop-blur-md sticky top-0 z-10 flex flex-col gap-3 select-none"
            id="active-exam-sticky-header"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-50 border border-amber-200/50 text-amber-800 shrink-0">
                  <BookOpen size={16} className="text-[#aa7c11]" />
                </span>
                <div>
                  <h4 className="text-sm sm:text-base font-black text-slate-800 leading-none">
                    امتحان {selectedCompetition}
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-400 font-bold mt-1">
                    المرحلة: {activeStudent?.stage || "غير معروفة"}
                  </p>
                </div>
              </div>

              {/* Countdown timer */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-sans transition-all shrink-0 ${
                examSecondsLeft < 120 
                  ? "bg-[#ffebed] text-rose-700 animate-pulse font-black border border-rose-200" 
                  : "bg-amber-50 text-amber-900 border border-amber-200/50 font-black shadow-sm"
              }`}>
                <Clock size={15} className={`${examSecondsLeft < 120 ? "text-rose-600 animate-spin" : "text-amber-600"}`} />
                <span className="text-sm font-bold tracking-wider">{formatTime(examSecondsLeft)}</span>
              </div>
            </div>

            {/* Micro Progress Bar & Remaining Counter */}
            <div className="mt-2">
              <div className="flex justify-between items-center text-[11px] sm:text-xs text-slate-400 font-bold mb-1">
                <span>السؤال {currentQuestionIdx + 1} من {activeExam.questions.length}</span>
                <span>المتبقي: {activeExam.questions.length - (currentQuestionIdx + 1)}</span>
              </div>
              
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#aa7c11] rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Question content wrapper */}
          <div
            className="p-5 sm:p-6 flex-1 bg-slate-55/30"
            id="active-exam-scroll-area"
          >
          {currentQuestion && (
            <QuestionCard
              q={currentQuestion}
              qIdx={currentQuestionIdx}
              totalQuestions={activeExam.questions.length}
              currentAnswer={answers[currentQuestion.id]}
              onAnswer={handleAnswer}
            />
          )}

          {/* Navigation layout */}
          <div className="flex items-center justify-between gap-4 pt-6 border-t border-slate-200 mt-6 select-none">
            {/* Prev Question */}
            <button
              type="button"
              disabled={currentQuestionIdx === 0}
              onClick={() => {
                if (currentQuestionIdx > 0) {
                  setCurrentQuestionIdx(prev => prev - 1);
                }
              }}
              className={`px-4 sm:px-5 py-3 rounded-xl font-bold flex items-center gap-1.5 transition-all outline-none ${
                currentQuestionIdx === 0
                  ? "opacity-30 pointer-events-none text-slate-400 bg-slate-100 border border-slate-200"
                  : "cursor-pointer bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 active:scale-95 shadow-sm"
              }`}
            >
              <ChevronRight size={18} />
              <span className="text-xs sm:text-sm">السؤال السابق</span>
            </button>

            {/* Next or Submit */}
            {currentQuestionIdx < activeExam.questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                className="px-4 sm:px-5 py-3 cursor-pointer rounded-xl font-bold bg-[#4a000b] hover:bg-[#6b0311] text-white flex items-center gap-1.5 transition-all outline-none active:scale-95 shadow-md shadow-[#4a000b]/20"
              >
                <span className="text-xs sm:text-sm">السؤال التالي</span>
                <ChevronLeft size={18} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmitExam}
                className="px-5 sm:px-6 py-3 cursor-pointer rounded-xl font-black bg-amber-500 hover:bg-amber-600 text-[#4a000b] flex items-center gap-1.5 transition-all outline-none active:scale-95 shadow-md shadow-amber-500/20 text-xs sm:text-sm animate-pulse"
              >
                <span>إرسال نهائي للاختبار</span>
                <Check size={18} className="stroke-[3px]" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);
};
