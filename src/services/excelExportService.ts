import { saveAs } from 'file-saver';
import { supabase } from '../utils/supabaseClient';
import { fillExcelTemplateBuffer } from '../components/TemplateExcelExporter';

export type TemplateType = 'primary' | 'special' | 'prep_servants';

export interface TemplateMappingInfo {
  storageName: string;
  downloadName: string;
}

/**
 * Template Mapping object connecting each stage key, its internal storage file name
 * on Supabase Storage (English without spaces), and its display file name in Arabic for download.
 */
export const TEMPLATE_MAPPING: Record<TemplateType, TemplateMappingInfo> = {
  primary: {
    storageName: 'primary_registration_2026.xls',
    downloadName: 'تسجيل مشتركين ابتدائي 2026.xls',
  },
  special: {
    storageName: 'special_categories_2026.xls',
    downloadName: 'تسجيل مشتركين فئات خاصة 2026.xls',
  },
  prep_servants: {
    storageName: 'prep_to_servants_2026.xls',
    downloadName: 'تسجيل مشتركين من اعدادي لخدام 2026.xls',
  },
};

export async function exportExcelTemplate(
  templateType: TemplateType,
  students: any[]
): Promise<void> {
  return exportStudentsExcel(templateType, students);
}

/**
 * Single, unified export function in React that invokes the Supabase Edge Function 'generate-excel'
 * to populate and download template-based Excel files for all educational stages, preserving data validations
 * (dropdown lists) and original formatting without altering data content.
 *
 * @param templateType - 'primary' | 'special' | 'prep_servants'
 * @param students - Unaltered array of student objects
 */
export async function exportStudentsExcel(
  templateType: TemplateType,
  students: any[]
): Promise<void> {
  const config = TEMPLATE_MAPPING[templateType];
  if (!config) {
    throw new Error(`نوع القالب غير معروف: ${templateType}`);
  }

  const { storageName, downloadName } = config;

  console.log(`[exportStudentsExcel] Requesting Edge Function 'generate-excel' for: ${storageName}`, {
    studentCount: students?.length || 0,
  });

  try {
    // Invoke Supabase Edge Function named generate-excel
    const { data, error } = await supabase.functions.invoke('generate-excel', {
      body: {
        templateName: storageName,
        students: students || [],
      },
    });

    if (error) {
      console.warn(`[exportStudentsExcel] Edge Function error for ${storageName}:`, error);
      throw error;
    }

    if (!data) {
      throw new Error('لم يتم استلام أي بيانات من Edge Function');
    }

    let blob: Blob;
    if (data instanceof Blob) {
      blob = data;
    } else if (data instanceof ArrayBuffer) {
      blob = new Blob([data], { type: 'application/vnd.ms-excel' });
    } else if (data && typeof data === 'object' && 'buffer' in data && (data as any).buffer instanceof ArrayBuffer) {
      blob = new Blob([(data as any).buffer], { type: 'application/vnd.ms-excel' });
    } else {
      throw new Error('تنسيق الاستجابة غير متوافق');
    }

    // Convert binary output into a Blob and trigger automated file download
    saveAs(blob, downloadName);

    console.log(`[exportStudentsExcel] Successfully generated and downloaded: ${downloadName}`);
    return;
  } catch (edgeErr: any) {
    console.warn(`[exportStudentsExcel] Edge Function unavailable or failed. Executing local template engine for ${downloadName}:`, edgeErr);

    try {
      // Local fallback buffer filling
      const buffer = await fillExcelTemplateBuffer(downloadName, students);
      const blob = new Blob([buffer], { type: 'application/vnd.ms-excel' });
      saveAs(blob, downloadName);
      console.log(`[exportStudentsExcel] Download completed via client fallback: ${downloadName}`);
    } catch (fallbackErr: any) {
      console.error(`[exportStudentsExcel] Client fallback also failed:`, fallbackErr);
      const errorMessage = fallbackErr?.message || fallbackErr || 'خطأ غير معروف أثناء إنشاء الملف';
      throw new Error(`فشل تصدير ملف Excel (${downloadName}): ${errorMessage}`);
    }
  }
}
