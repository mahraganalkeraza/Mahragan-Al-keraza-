import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
 * Direct public template URLs mapped to keys
 */
const TEMPLATE_URLS: Record<string, string> = {
  'primary': 'https://nrigdgdiqjdzieryjjod.supabase.co/storage/v1/object/public/templates/primary_registration_2026.xls',
  'primary_registration_2026.xls': 'https://nrigdgdiqjdzieryjjod.supabase.co/storage/v1/object/public/templates/primary_registration_2026.xls',
  'prep_servants': 'https://nrigdgdiqjdzieryjjod.supabase.co/storage/v1/object/public/templates/prep_to_servants_2026.xls',
  'prep_to_servants_2026.xls': 'https://nrigdgdiqjdzieryjjod.supabase.co/storage/v1/object/public/templates/prep_to_servants_2026.xls',
  'special': 'https://nrigdgdiqjdzieryjjod.supabase.co/storage/v1/object/public/templates/special_categories_2026.xls',
  'special_categories_2026.xls': 'https://nrigdgdiqjdzieryjjod.supabase.co/storage/v1/object/public/templates/special_categories_2026.xls'
};

/**
 * Supabase Edge Function: generate-excel
 * Fetches legacy .xls (BIFF8 format) templates directly from public storage,
 * and populates student data. It leaves Column C completely empty (skipped)
 * to preserve original Data Validation dropdown lists pre-built in the Excel sheet.
 */
serve(async (req: Request) => {
  // Handle CORS preflight options
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { templateType, templateName, students } = body;

    const inputName = templateType || templateName;
    if (!inputName) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: templateType or templateName' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const studentsArray = Array.isArray(students) ? students : [];

    // Resolve template URL using explicit map or falling back
    let targetUrl = '';
    const key = String(inputName).trim().toLowerCase();

    if (TEMPLATE_URLS[key]) {
      targetUrl = TEMPLATE_URLS[key];
    } else if (key.includes('primary')) {
      targetUrl = TEMPLATE_URLS['primary'];
    } else if (key.includes('prep') || key.includes('servant')) {
      targetUrl = TEMPLATE_URLS['prep_servants'];
    } else if (key.includes('special')) {
      targetUrl = TEMPLATE_URLS['special'];
    } else {
      targetUrl = `https://nrigdgdiqjdzieryjjod.supabase.co/storage/v1/object/public/templates/${inputName}`;
    }

    console.log(`[generate-excel] Fetching template from: ${targetUrl}`);
    const fetchResp = await fetch(targetUrl);
    if (!fetchResp.ok) {
      throw new Error(`Failed to download template from ${targetUrl} (HTTP ${fetchResp.status})`);
    }

    const fileBuffer = await fetchResp.arrayBuffer();
    if (!fileBuffer || fileBuffer.byteLength === 0) {
      throw new Error('Downloaded template buffer is empty');
    }

    // Parse ArrayBuffer with explicit cells configurations for cellStyles, cellFormulas and bookVBA
    const workbook = XLSX.read(new Uint8Array(fileBuffer), {
      type: "array",
      cellStyles: true,
      cellFormulas: true,
      bookVBA: true,
    });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('The template workbook contains no worksheets');
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Autodetect start row: index = 2 (Row 3) if Row 2 (index 1) contains header labels like "اسم" or "موبايل"
    let startRowIndex = 1; // Default to row 2 (index 1)
    const cellA2 = worksheet[XLSX.utils.encode_cell({ r: 1, c: 0 })];
    const cellB2 = worksheet[XLSX.utils.encode_cell({ r: 1, c: 1 })];
    const row2Text = `${cellA2?.v || ''} ${cellB2?.v || ''}`;

    if (row2Text.includes('اسم') || row2Text.includes('موبايل') || row2Text.includes('النوع')) {
      startRowIndex = 2; // Row 3 (index 2)
    }

    // Helper to safely write cell values directly without replacing original cell structures
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
      if (rIdx > maxRowIndex) {
        maxRowIndex = rIdx;
      }

      // Column A (Index 0): Student Name
      const nameVal = formatStudentName(student.name || student.fullName || student.studentName || '');
      if (nameVal) {
        setCellVal(rIdx, 0, nameVal);
      }

      // Column B (Index 1): Mobile / Phone
      const phoneVal = student.phone || student.phoneNumber || student.mobile || '';
      if (phoneVal) {
        setCellVal(rIdx, 1, String(phoneVal));
      }

      // Column C (Index 2): DO NOT WRITE ANYTHING (SKIP THIS COLUMN ENTIRELY).
      // This is mandatory to preserve the pre-existing dropdown Data Validation list in cell Column C.

      // Column D (Index 3): Birth Day (Number format)
      const dayVal = student.birthDay ?? student.day;
      if (dayVal !== undefined && dayVal !== null && dayVal !== '') {
        setCellVal(rIdx, 3, Number(dayVal), true);
      }

      // Column E (Index 4): Birth Month (Number format)
      const monthVal = student.birthMonth ?? student.month;
      if (monthVal !== undefined && monthVal !== null && monthVal !== '') {
        setCellVal(rIdx, 4, Number(monthVal), true);
      }

      // Column F (Index 5): Birth Year (Number format)
      const yearVal = student.birthYear ?? student.year;
      if (yearVal !== undefined && yearVal !== null && yearVal !== '') {
        setCellVal(rIdx, 5, Number(yearVal), true);
      }

      // Columns G+ (Index 6+): DO NOT WRITE ANY COMPETITIONS (Remove competition processing completely).
    });

    // Update worksheet reference range !ref dynamically
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:F100');
    if (maxRowIndex > range.e.r) {
      range.e.r = maxRowIndex;
      worksheet['!ref'] = XLSX.utils.encode_range(range);
    }

    // Export BIFF8 binary buffer
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
        'Content-Disposition': `attachment; filename="${inputName}"`,
      },
    });

  } catch (err: any) {
    console.error('Edge Function Error in generate-excel:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error in generate-excel' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
