import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://cdn.sheetjs.com/xlsx-latest/package/xlsx.mjs";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

/**
 * Helper to clean and format student names
 */
function formatStudentName(rawName: any): string {
  if (!rawName) return '';
  return String(rawName).replace(/[\t\n\r]/g, ' ').trim();
}

/**
 * Supabase Edge Function: generate-excel
 * Populates ONLY promoted student basic info (Name, Phone, and Birth Date).
 * Completely bypasses Column C to preserve original Data Validation dropdown lists embedded in .xls template.
 * Eliminates competition data.
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

    // 2. Parse workbook using SheetJS (XLSX)
    const workbook = XLSX.read(new Uint8Array(fileBuffer), {
      type: "array",
      cellStyles: true,
      cellFormulas: true,
      bookVBA: true,
    });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return new Response(
        JSON.stringify({ error: `Template ${templateName} has no valid worksheets` }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Determine start row: Check row 2 (0-indexed r = 1) cell content
    let startRowIndex = 1; // 0-indexed row 2 (A2)
    const cellA2 = worksheet[XLSX.utils.encode_cell({ r: 1, c: 0 })];
    const cellB2 = worksheet[XLSX.utils.encode_cell({ r: 1, c: 1 })];
    const row2Text = `${cellA2?.v || ''} ${cellB2?.v || ''}`;

    if (row2Text.includes('اسم') || row2Text.includes('موبايل') || row2Text.includes('النوع')) {
      startRowIndex = 2; // 0-indexed row 3 (A3)
    }

    // Safely update cell values directly to preserve validation metadata
    const setCellVal = (r: number, c: number, value: any, isNumber = false) => {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (!worksheet[cellRef]) {
        worksheet[cellRef] = { t: isNumber ? 'n' : 's', v: value };
      } else {
        worksheet[cellRef].v = value;
        worksheet[cellRef].t = isNumber ? 'n' : 's';
      }
    };

    let maxRowIndex = startRowIndex;

    studentsArray.forEach((student: any, idx: number) => {
      const rIdx = startRowIndex + idx;
      if (rIdx > maxRowIndex) maxRowIndex = rIdx;

      // Column A (Index 0): Student Name (student.name / student.studentName / student.fullName)
      const nameVal = formatStudentName(
        student.name || student.studentName || student.fullName || ''
      );
      if (nameVal) setCellVal(rIdx, 0, nameVal);

      // Column B (Index 1): Phone Number (student.phoneNumber / student.phone / student.mobile)
      const phoneVal = student.phoneNumber || student.phone || student.mobile || '';
      if (phoneVal) setCellVal(rIdx, 1, String(phoneVal));

      // Column C (Index 2): DO NOT WRITE ANYTHING (SKIP COMPLETELY)
      // Leaving this column untouched is required to preserve the original Data Validation dropdown lists embedded in the .xls template.

      // Column D (Index 3): Birth Day (student.birthDay / student.day) formatted as a Number
      const dayVal = student.birthDay ?? student.day;
      if (dayVal !== undefined && dayVal !== null && dayVal !== '') {
        setCellVal(rIdx, 3, Number(dayVal), true);
      }

      // Column E (Index 4): Birth Month (student.birthMonth / student.month) formatted as a Number
      const monthVal = student.birthMonth ?? student.month;
      if (monthVal !== undefined && monthVal !== null && monthVal !== '') {
        setCellVal(rIdx, 4, Number(monthVal), true);
      }

      // Column F (Index 5): Birth Year (student.birthYear / student.year) formatted as a Number
      const yearVal = student.birthYear ?? student.year;
      if (yearVal !== undefined && yearVal !== null && yearVal !== '') {
        setCellVal(rIdx, 5, Number(yearVal), true);
      }

      // Competitions (Column G+ / Index 6+): REMOVE COMPLETELY
    });

    // Update worksheet reference range !ref
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:F100');
    if (maxRowIndex > range.e.r) {
      range.e.r = maxRowIndex;
      worksheet['!ref'] = XLSX.utils.encode_range(range);
    }

    // 3. Export modified workbook using BIFF8 .xls binary buffer
    const outBuffer = XLSX.write(workbook, {
      bookType: "biff8",
      type: "buffer",
      cellStyles: true,
      bookVBA: true,
    });

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
