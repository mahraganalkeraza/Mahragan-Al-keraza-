import { BookItem } from './types';

export const OFFICIAL_STAGES = [
  "حضانة",
  "أولى وثانية",
  "ثالثة ورابعة",
  "خامسة وسادسة",
  "إعدادي",
  "ثانوي",
  "جامعة",
  "خريجون",
  "خدام وإعداد الخدام",
  "قانا الجليل",
  "تعليم كبار",
  "سمعان الشيخ",
  "حرفيون",
  "صم وبكم",
  "قدرات خاصة",
  "ديديموس",
  "بولس وسيلا"
];

export const OFFICIAL_COMPETITIONS = [
  "دراسي",
  "محفوظات",
  "قبطي مستوى أول",
  "قبطي مستوى ثان"
];

export const STAGE_ORDER = OFFICIAL_STAGES;

export const PRICING_DATA: BookItem[] = [
  { stage: "حضانة", studyPrice: 11, memoPrice: 5, copticPrice: 5, activityPrice: 10 },
  { stage: "تعليم كبار", studyPrice: 15, memoPrice: 0, copticPrice: 0, activityPrice: 0 },
  { stage: "أولى وثانية", studyPrice: 15, memoPrice: 5, copticPrice: 5, activityPrice: 10 },
  { stage: "ثالثة ورابعة", studyPrice: 18, memoPrice: 10, copticPrice: 0, activityPrice: 11 },
  { stage: "خامسة وسادسة", studyPrice: 18, memoPrice: 11, copticPrice: 0, activityPrice: 10 },
  { stage: "إعدادي", studyPrice: 20, memoPrice: 0, copticPrice: 0, activityPrice: 0 },
  { stage: "ثانوي", studyPrice: 20, memoPrice: 0, copticPrice: 0, activityPrice: 0 },
  { stage: "جامعة", studyPrice: 20, memoPrice: 0, copticPrice: 0, activityPrice: 0 },
  { stage: "خريجون", studyPrice: 20, memoPrice: 0, copticPrice: 0, activityPrice: 0 },
  { stage: "حرفيون", studyPrice: 20, memoPrice: 0, copticPrice: 0, activityPrice: 0 },
  { stage: "خدام وإعداد الخدام", studyPrice: 20, memoPrice: 0, copticPrice: 0, activityPrice: 0 },
  { stage: "قانا الجليل", studyPrice: 20, memoPrice: 0, activityPrice: 0, copticPrice: 0 },
  { stage: "صم وبكم", studyPrice: 15, memoPrice: 0, copticPrice: 0, activityPrice: 0 },
  { stage: "سمعان الشيخ", studyPrice: 15, memoPrice: 0, copticPrice: 0, activityPrice: 0 },
  { stage: "قدرات خاصة", studyPrice: 15, memoPrice: 0, copticPrice: 0, activityPrice: 0 },
  { stage: "ديديموس", studyPrice: 15, memoPrice: 0, copticPrice: 0, activityPrice: 0 },
  { stage: "بولس وسيلا", studyPrice: 15, memoPrice: 0, copticPrice: 0, activityPrice: 0 },
];


export const CAROUSEL_IMAGES = [
  { url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR8bzr21AT2qsavhSTiRBeo31HS1xbYyleEBg&s", title: "نيافة الحبر الجليل الأنبا أغاثون" },
  { url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSkkt7y0FjD9toZ5ROTyINBTiB5qnB686HnOQ&s", title: "الألحان والتسبحة" },
];

export const CHURCH_CREDENTIALS = [
  { churchName: "العباسية", accessCode: "Lk2*951" },
  { churchName: "المطرانية", accessCode: "Vp7@385" },
  { churchName: "نزلة عصر", accessCode: "Zw2#398" },
  { churchName: "المداور", accessCode: "Kf1@638" },
  { churchName: "نزلة رمضان", accessCode: "Nb7_264" },
  { churchName: "البسقلون", accessCode: "Rt5#930" },
  { churchName: "عباد شارونة", accessCode: "Mx2@901" },
  { churchName: "علي باشا", accessCode: "Js3@452" },
  { churchName: "عزبة رزق", accessCode: "Kz5#259" },
  { churchName: "صفانية", accessCode: "Dx1#924" },
  { churchName: "الملاك ميخائيل - مغاغة", accessCode: "Km1@245" },
  { churchName: "عزبة بطرس", accessCode: "Tr4#739" },
  { churchName: "قصر لملوم", accessCode: "Lk5_441" },
  { churchName: "بني عامر", accessCode: "Vz1#827" },
  { churchName: "قفادة", accessCode: "Jh4_333" },
  { churchName: "عزبة سمعان", accessCode: "Ty3@682" },
  { churchName: "بلهاسة", accessCode: "Bn6#218" },
  { churchName: "بني خالد", accessCode: "Xj7*195" },
  { churchName: "شارونة", accessCode: "Bm1*627" },
  { churchName: "الشيخ زياد", accessCode: "Dp2#118" },
  { churchName: "أبو غطاس", accessCode: "Xj9_803" },
  { churchName: "طنبدي", accessCode: "Jn5#572" },
  { churchName: "ميانة", accessCode: "Lk9*118" },
  { churchName: "صعايدة الكوم الأخضر", accessCode: "Qw9_106" },
  { churchName: "الشيخ مسعود", accessCode: "Sm7_134" },
  { churchName: "كفر عبد الخالق", accessCode: "Vn4@538" },
  { churchName: "عطف حيدر", accessCode: "Gx6_193" },
  { churchName: "عزبة مهدي", accessCode: "Kf4#819" },
  { churchName: "الكوم الأخضر", accessCode: "Bf3#614" },
  { churchName: "الجزيرة", accessCode: "Np8_423" },
  { churchName: "شم القبلية", accessCode: "Mr8*508" },
  { churchName: "مارمينا مغاغة", accessCode: "Gh8_682" },
  { churchName: "برطباط", accessCode: "Bt4@717" },
  { churchName: "عزبة إسحق", accessCode: "Rf1*860" },
  { churchName: "صعايدة الساوي", accessCode: "Tp2#742" },
  { churchName: "العذراء مغاغة", accessCode: "Gh9*515" },
  { churchName: "شمس الدين", accessCode: "Rt8*485" },
  { churchName: "آبا البلد", accessCode: "Jn2@551" },
  { churchName: "دهروط", accessCode: "Ts6*304" },
  { churchName: "الساوي", accessCode: "Lv6*373" },
  { churchName: "بني واللمس", accessCode: "Xz8_402" },
  { churchName: "كوم الحاصل", accessCode: "Tr8*704" },
  { churchName: "دير الجرنوس", accessCode: "Rf5#472" },
  { churchName: "الزورة", accessCode: "Wq3#490" },
  { churchName: "إشنين", accessCode: "Mb4@952" },
  { churchName: "إبراهيم عبد السيد", accessCode: "Qw4@316" },
  { churchName: "القديسة دميانة", accessCode: "Vz9@624" },
  { churchName: "برمشا", accessCode: "Wq2@714" },
  { churchName: "القايات", accessCode: "Zw7*291" },
  { churchName: "محمد بيه", accessCode: "Bt3*815" },
  { churchName: "العدوة", accessCode: "Vp3_726" }
];

export const ADMIN_PASSWORD = "ADMIN_MAFK_2026";

export const sortStages = (a: string, b: string) => {
  const indexA = STAGE_ORDER.indexOf(a);
  const indexB = STAGE_ORDER.indexOf(b);
  if (indexA === -1 && indexB === -1) return a.localeCompare(b);
  if (indexA === -1) return 1;
  if (indexB === -1) return -1;
  return indexA - indexB;
};

export const STAGE_LABELS: Record<string, string> = {
  nursery: 'حضانة',
  stage12: 'أولى وثانية',
  stage34: 'ثالثة ورابعة',
  stage56: 'خامسة وسادسة',
  adults: 'تعليم كبار',
  seniors: 'سمعان الشيخ',
  special_needs: 'قدرات خاصة'
};
