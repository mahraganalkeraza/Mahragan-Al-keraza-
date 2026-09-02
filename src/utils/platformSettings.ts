import { supabase } from './supabaseClient';

export interface PlatformState {
  isBishopricExamDisabled: boolean;
  isOpen: boolean; // true when is_bishopric_exam_disabled === false
  updatedAt?: string;
  raw?: any;
}

/**
 * Checks if the bishopric exam platform is open based on is_bishopric_exam_disabled:
 * is_bishopric_exam_disabled === true  => CLOSED
 * is_bishopric_exam_disabled === false => OPEN
 */
export const isBishopricExamOpen = (is_bishopric_exam_disabled: any): boolean => {
  return !is_bishopric_exam_disabled;
};

/**
 * Fetches the master system settings row with id = 1
 */
export const fetchPlatformState = async (): Promise<PlatformState> => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('id, is_bishopric_exam_disabled, updated_at')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      console.warn('Warning: fetchPlatformState on system_settings id=1:', error.message);
    }

    if (data) {
      const isDisabled = !!data.is_bishopric_exam_disabled;
      return {
        isBishopricExamDisabled: isDisabled,
        isOpen: !isDisabled,
        updatedAt: data.updated_at,
        raw: data
      };
    }
  } catch (err) {
    console.error('Failed to fetch bishopric platform state:', err);
  }

  return {
    isBishopricExamDisabled: false,
    isOpen: true
  };
};

/**
 * Updates row id = 1 setting is_bishopric_exam_disabled strictly
 * disabled: true => platform closed
 * disabled: false => platform open
 * NOTE: Strictly leaves is_site_disabled and is_exam_locked untouched
 */
export const updateBishopricExamDisabled = async (
  disabled: boolean
): Promise<{ success: boolean; error?: string }> => {
  try {
    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from('system_settings')
      .update({
        is_bishopric_exam_disabled: disabled,
        updated_at: nowIso
      })
      .eq('id', 1);

    if (error) {
      console.error('Error updating system_settings is_bishopric_exam_disabled id=1:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Failed to update bishopric platform state:', err);
    return { success: false, error: err.message || 'حدث خطأ أثناء تحديث حالة منصة امتحانات الأسقفية' };
  }
};

/**
 * Helper to update platform state by desired open state
 * open = true  => is_bishopric_exam_disabled = false
 * open = false => is_bishopric_exam_disabled = true
 */
export const updatePlatformState = async (
  open: boolean
): Promise<{ success: boolean; error?: string }> => {
  return updateBishopricExamDisabled(!open);
};

/**
 * Subscribes to Realtime changes on system_settings table (target id = 1)
 */
export const subscribeToPlatformState = (
  onChange: (state: PlatformState) => void
) => {
  const channelName = `realtime-bishopric-state-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'system_settings' },
      (payload) => {
        const record = payload.new as any;
        if (record && (record.id === 1 || record.id === '1')) {
          const isDisabled = !!record.is_bishopric_exam_disabled;
          onChange({
            isBishopricExamDisabled: isDisabled,
            isOpen: !isDisabled,
            updatedAt: record.updated_at,
            raw: record
          });
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
