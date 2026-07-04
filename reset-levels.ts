import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

// Load env vars if needed, or assume they are in process.env
// For a script we might need to read .env
if (fs.existsSync('.env')) {
  const env = fs.readFileSync('.env', 'utf8');
  env.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) process.env[key.trim()] = value.trim();
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

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
  console.log("Starting Supabase seeding...");
  
  // Delete all existing stage_competitions
  const { error: delError } = await supabase
    .from('stage_competitions')
    .delete()
    .neq('id', '0'); // Logic to delete all

  if (delError) console.error("Error deleting old stages:", delError);

  // Recreate correct ones
  for (const name of STAGES) {
      const { error: insError } = await supabase.from('stage_competitions').insert({
          stage_name: name,
          category: 'مهرجان الكرازة',
          competition_ids: COMPS
      });
      if (insError) console.error(`Error inserting ${name}:`, insError);
  }

  console.log("Successfully seeded stage_competitions in Supabase.");
}

seedLevels().catch(console.error);
