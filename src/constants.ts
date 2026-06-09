import { BookItem } from './types';

export const PRICING_DATA: BookItem[] = [
  { stage: "حضانة", studyPrice: 11, memoPrice: 5, copticPrice: 5, activityPrice: 10 },
  { stage: "تعليم الكبار", studyPrice: 15, memoPrice: 0, copticPrice: 0, activityPrice: 0 },
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
  { stage: " صم وبكم", studyPrice: 15, memoPrice: 0, copticPrice: 0, activityPrice: 0 },
  { stage: "سمعان الشيخ", studyPrice: 15, memoPrice: 0, copticPrice: 0, activityPrice: 0 },
  { stage: "ذوي القدرات", studyPrice: 15, memoPrice: 0, copticPrice: 0, activityPrice: 0 },
  { stage: "ديديموس", studyPrice: 15, memoPrice: 0, copticPrice: 0, activityPrice: 0 },
  { stage: "بولس وسيلا", studyPrice: 15, memoPrice: 0, copticPrice: 0, activityPrice: 0 },
];

export const CAROUSEL_IMAGES = [
  { url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR8bzr21AT2qsavhSTiRBeo31HS1xbYyleEBg&s", title: "نيافة الحبر الجليل الأنبا أغاثون" },
  { url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSkkt7y0FjD9toZ5ROTyINBTiB5qnB686HnOQ&s", title: "الألحان والتسبحة" },
];

export const CHURCH_CREDENTIALS: Record<string, string> = {
  "العباسية": "Lk2951",
  "المطرانية": "Vp7@385",
  "نزلة عصر": "Zw2#398",
  "المداور": "Kf1@638",
  "نزلة رمضان": "Nb7_264",
  "البسقلون": "Rt5#930",
  "عباد شارونة": "Mx2@901",
  "علي باشا": "Js3@452",
  "عزبة رزق": "Kz5#259",
  "صفانية": "Dx1#924",
  "الملاك ميخائيل - مغاغة": "Km1@245",
  "عزبة بطرس": "Tr4#739",
  "قصر لملوم": "Lk5_441",
  "بني عامر": "Vz1#827",
  "قفادة": "Jh4_333",
  "عزبة سمعان": "Ty3@682",
  "بلهاسة": "Bn6#218",
  "بني خالد": "Xj7195",
  "شارونة": "Bm1627",
  "الشيخ زياد": "Dp2#118",
  "أبو غطاس": "Xj9_803",
  "طنبدي": "Jn5#572",
  "ميانة": "Lk9118",
  "صعايدة الكوم الأخضر": "Qw9_106",
  "الشيخ مسعود": "Sm7_134",
  "كفر عبد الخالق": "Vn4@538",
  "عطف حيدر": "Gx6_193",
  "عزبة مهدي": "Kf4#819",
  "الكوم الأخضر": "Bf3#614",
  "الجزيرة": "Np8_423",
  "شم القبلية": "Mr8508",
  "مارمينا مغاغة": "Gh8_682",
  "برطباط": "Bt4@717",
  "عزبة إسحق": "Rf1860",
  "صعايدة الساوي": "Tp2#742",
  "العذراء مغاغة": "Gh9515",
  "شمس الدين": "Rt8485",
  "آبا البلد": "Jn2@551",
  "دهروط": "Ts6304",
  "الساوي": "Lv6373",
  "بني واللمس": "Xz8_402",
  "كوم الحاصل": "Tr8704",
  "دير الجرنوس": "Rf5#472",
  "الزورة": "Wq3#490",
  "إشنين": "Mb4@952",
  "إبراهيم عبد السيد": "Qw4@316",
  "القديسة دميانة": "Vz9@624",
  "برمشا": "Wq2@714",
  "القايات": "Zw7291",
  "محمد بيه": "Bt3*815",
  "العدوة": "Vp3_726"
};

export const ADMIN_PASSWORD = "ADMIN_MAFK_2026";

export const STAGE_ORDER = [
  'حضانة',
  'أولى وثانية',
  'ثالثة ورابعة',
  'خامسة وسادسة',
  'إعدادي',
  'ثانوي',
  'جامعة',
  'خريجون',
  'خدام وإعداد الخدام',
  'قانا الجليل',
  'سمعان الشيخ',
  'تعليم كبار',
  'حرفيون'
];

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
  special_needs: 'ذوي القدرات'
};
