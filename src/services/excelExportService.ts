import { downloadBlob } from '../utils/fileDownload';
import { supabase } from '../utils/supabaseClient';

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

/**
 * Invokes the Supabase Edge Function 'generate-excel' to fetch the populated ArrayBuffer.
 */
export async function fetchExcelBufferFromEdgeFunction(
  storageName: string,
  students: any[]
): Promise<ArrayBuffer> {
  const { data, error } = await supabase.functions.invoke('generate-excel', {
    body: {
      templateName: storageName,
      students: students || [],
    },
  });

  if (error) {
    console.error(`[generate-excel] Error invoking function for ${storageName}:`, error);
    throw new Error(error.message || `حدث خطأ أثناء الاتصال بالخدمة السحابية لتوليد ملف الاكسل`);
  }

  if (!data) {
    throw new Error('لم يتم استلام أي بيانات من Edge Function');
  }

  if (data instanceof ArrayBuffer) {
    return data;
  }
  if (data instanceof Blob) {
    return await data.arrayBuffer();
  }
  if (data && typeof data === 'object' && 'buffer' in data && (data as any).buffer instanceof ArrayBuffer) {
    return (data as any).buffer;
  }

  throw new Error('تنسيق الاستجابة غير متوافق من Edge Function');
}

/**
 * Main export handler that invokes the Supabase Edge Function 'generate-excel'
 * to populate and download template-based Excel files directly, bypassing local template files.
 */
export async function handleExportExcel(
  templateType: TemplateType,
  studentsData: any[]
): Promise<void> {
  const config = TEMPLATE_MAPPING[templateType];
  if (!config) {
    throw new Error(`نوع القالب غير معروف: ${templateType}`);
  }

  const { storageName, downloadName } = config;

  console.log(`[handleExportExcel] Requesting Edge Function 'generate-excel' for: ${storageName}`, {
    studentCount: studentsData?.length || 0,
  });

  const arrayBuffer = await fetchExcelBufferFromEdgeFunction(storageName, studentsData);
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    throw new Error(`الملف المستلم لـ ${downloadName} فارغ`);
  }

  const blob = new Blob([arrayBuffer], { type: 'application/vnd.ms-excel' });
  downloadBlob(blob, downloadName);
  console.log(`[handleExportExcel] Successfully generated and downloaded: ${downloadName}`);
}

export const exportExcelTemplate = handleExportExcel;
export const exportStudentsExcel = handleExportExcel;

