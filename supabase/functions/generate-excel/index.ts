import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import ExcelJS from "npm:exceljs@4.4.0";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

/**
 * Safely parses competitions field whether it is an array, string, JSON string, or object.
 * Prevents character-by-character splitting on Arabic strings.
 */
function parseCompetitions(comps: any): string[] {
  if (!comps) return [];
  if (Array.isArray(comps)) {
    return comps
      .map(c => {
        if (typeof c === 'string') return c.trim();
        if (typeof c === 'object' && c !== null) return (c.name || c.title || c.label || '').trim();
        return String(c).trim();
      })
      .filter(Boolean);
  }
  if (typeof comps === 'string') {
    const trimmed = comps.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        return parseCompetitions(parsed);
      } catch {
        // Fallback to delimiter splitting
      }
    }
    return trimmed
      .split(/[,|\n;]/)
      .map(s => s.trim())
      .filter(Boolean);
  }
  if (typeof comps === 'object') {
    return Object.values(comps)
      .map(v => String(v).trim())
      .filter(Boolean);
  }
  return [String(comps).trim()];
}

/**
 * Helper to clean and format student names
 */
function formatStudentName(rawName: any): string {
  if (!rawName) return '';
  return String(rawName).replace(/[\t\n\r]/g, ' ').trim();
}

/**
 * Supabase Edge Function: generate-excel
 * Retrieves template from Supabase Storage 'templates' bucket, populates student data with ExcelJS,
 * preserving existing cell formatting and dropdown data validations.
 */
serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { templateName, students } = body;

    if (!templateName) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: templateName' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const studentsArray = Array.isArray(students) ? students : [];

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    let fileBuffer: ArrayBuffer | null = null;

    // 1. Fetch template from Supabase Storage 'templates' bucket
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('templates')
      .download(templateName);

    if (!storageError && storageData) {
      fileBuffer = await storageData.arrayBuffer();
    } else {
      console.log(`Storage download failed for '${templateName}' (${storageError?.message}). Trying public fallback...`);
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/templates/${encodeURIComponent(templateName)}`;
      const res = await fetch(publicUrl);
      if (res.ok) {
        fileBuffer = await res.arrayBuffer();
      }
    }

    if (!fileBuffer || fileBuffer.byteLength === 0) {
      return new Response(
        JSON.stringify({ error: `Could not locate template file: ${templateName}` }),
        { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Load workbook with ExcelJS
    const workbook = new ExcelJS.Workbook();
    let loaded = false;

    try {
      await workbook.xlsx.load(fileBuffer);
      loaded = true;
    } catch (xlsxErr) {
      console.warn(`ExcelJS xlsx load warning for ${templateName}:`, xlsxErr);
    }

    if (!loaded) {
      // If template binary is raw BIFF8 (.xls) or couldn't be loaded directly by xlsx loader,
      // return original fileBuffer directly as fallback so download succeeds gracefully
      return new Response(fileBuffer, {
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/vnd.ms-excel',
          'Content-Disposition': `attachment; filename="${templateName}"`,
        },
      });
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return new Response(
        JSON.stringify({ error: `Template ${templateName} has no valid worksheets` }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Determine starting row for student data insertion
    // Check row 2 content: if row 2 has headers (e.g., 'اسم', 'موبايل'), data starts at row 3; else row 2.
    let startRow = 2;
    const row2Cell1 = worksheet.getRow(2).getCell(1).value;
    const row2Cell2 = worksheet.getRow(2).getCell(2).value;
    const row2Text = `${row2Cell1 || ''} ${row2Cell2 || ''}`;
    if (row2Text.includes('اسم') || row2Text.includes('موبايل') || row2Text.includes('النوع')) {
      startRow = 3;
    }

    // 4. Populate student data directly into worksheet cells
    studentsArray.forEach((student: any, idx: number) => {
      const rowIndex = startRow + idx;
      const row = worksheet.getRow(rowIndex);

      // Student Name -> Column 1 (A)
      const nameVal = formatStudentName(
        student.name || student.studentName || student.fullName || ''
      );
      if (nameVal) row.getCell(1).value = nameVal;

      // Phone Number -> Column 2 (B)
      const phoneVal = student.phoneNumber || student.phone || student.mobile || '';
      if (phoneVal) row.getCell(2).value = String(phoneVal);

      // Gender / Stage -> Column 3 (C)
      const isFemale =
        student.gender === 'أنثى' ||
        student.gender === 'female' ||
        student.gender === 'انثى';
      const genderStr = student.gender ? (isFemale ? 'أنثى' : 'ذكر') : (student.stage || student.educationalStage || '');
      if (genderStr) row.getCell(3).value = genderStr;

      // Birth Date / Day -> Column 4 (D)
      if (student.birthDay || student.day) {
        row.getCell(4).value = Number(student.birthDay || student.day);
      } else if (student.stage || student.educationalStage) {
        row.getCell(4).value = String(student.stage || student.educationalStage);
      }

      // Birth Month -> Column 5 (E)
      if (student.birthMonth || student.month) {
        row.getCell(5).value = Number(student.birthMonth || student.month);
      }

      // Birth Year -> Column 6 (F)
      if (student.birthYear || student.year) {
        row.getCell(6).value = Number(student.birthYear || student.year);
      }

      // Competitions -> Columns 7 through 14 (G - N)
      const competitionsList = parseCompetitions(student.competitions);
      competitionsList.forEach((compName, cIdx) => {
        if (cIdx < 8) {
          row.getCell(7 + cIdx).value = compName;
        }
      });

      row.commit();
    });

    // 5. Generate output binary buffer
    const outBuffer = await workbook.xlsx.writeBuffer();

    return new Response(outBuffer, {
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/vnd.ms-excel',
        'Content-Disposition': `attachment; filename="${templateName}"`,
      },
    });
  } catch (err: any) {
    console.error('Edge Function Error in generate-excel:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error in generate-excel function' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
