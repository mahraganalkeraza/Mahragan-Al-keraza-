import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import fs from 'fs';

const rawConfig = fs.readFileSync('./firebase-applet-config.json', 'utf8');
const config = JSON.parse(rawConfig);
const app = initializeApp(config);
const db = getFirestore(app);

const STAGES = [
  'حضانة',
  'أولى وثانية',
  'ثالثة ورابعة',
  'خامسة وسادسة',
  'إعدادي',
  'ثانوي',
  'جامعة',
  'خريجون',
  'خدام وإعداد الخدام',
  'تعليم كبار',
  'قانا الجليل',
  'سمعان الشيخ',
  'قدرات خاصة',
  'صم وبكم',
  'ديديموس',
  'بولس وسيلا'
];

const COMPS = [
  'دراسي', 'محفوظات', 'قبطي مستوى أول', 'قبطي مستوى ثان'
];

async function seedLevels() {
  const levelsSnap = await getDocs(collection(db, 'levels'));
  const batch = writeBatch(db);

  // Delete all existing levels
  levelsSnap.docs.forEach(d => {
    batch.delete(d.ref);
  });

  // Recreate correct ones
  for (const name of STAGES) {
      const ref = doc(collection(db, 'levels'));
      batch.set(ref, {
          name,
          allowedCompetitions: COMPS
      });
  }

  await batch.commit();
  console.log("Successfully seeded levels collection.");
}

seedLevels().catch(console.error);
