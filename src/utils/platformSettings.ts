import { supabase } from './supabaseClient';

export interface PlatformState {
  isOpen: boolean;
  content: number;
  isExamLocked: boolean;
  isRegistrationLocked: boolean;
  isSiteDisabled: boolean;
  isBookOrdersLocked: boolean;
  updatedAt?: string;
  raw?: any;
}

/**
 * Checks if the platform is open based on content column:
 * content === 1 or Number(content) === 1 => Platform OPEN/ENABLED
 * content === 0 or Number(content) === 0 => Platform CLOSED/DISABLED
 */
export const isPlatformOpenFromContent = (content: any, fallbackSiteDisabled?: boolean): boolean => {
  if (content !== undefined && content !== null && content !== '') {
    const num = Number(content);
    if (!isNaN(num)) {
      return num === 1;
    }
  }
  return fallbackSiteDisabled !== undefined ? !fallbackSiteDisabled : true;
};

/**
 * Fetches the master system settings row with id = 1
 */
export const fetchPlatformState = async (): Promise<PlatformState> => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      console.warn('Warning: fetchPlatformState on system_settings id=1:', error.message);
    }

    if (data) {
      const rawContent = data.content;
      const isOpen = isPlatformOpenFromContent(rawContent, data.is_site_disabled);
      const contentNum = isOpen ? 1 : 0;

      return {
        isOpen,
        content: contentNum,
        isExamLocked: !!data.is_exam_locked,
        isRegistrationLocked: !!data.is_registration_locked,
        isSiteDisabled: !isOpen || !!data.is_site_disabled,
        isBookOrdersLocked: !!data.is_book_orders_locked,
        updatedAt: data.updated_at,
        raw: data
      };
    }
  } catch (err) {
    console.error('Failed to fetch platform state:', err);
  }

  return {
    isOpen: true,
    content: 1,
    isExamLocked: false,
    isRegistrationLocked: false,
    isSiteDisabled: false,
    isBookOrdersLocked: false
  };
};

/**
 * Updates row id = 1 setting content to 1 or 0 and updating updated_at
 */
export const updatePlatformState = async (
  open: boolean
): Promise<{ success: boolean; error?: string }> => {
  try {
    const contentVal = open ? 1 : 0;
    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from('system_settings')
      .update({
        content: contentVal,
        is_site_disabled: !open,
        is_exam_locked: !open,
        updated_at: nowIso
      })
      .eq('id', 1);

    if (error) {
      console.error('Error updating system_settings id=1:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Failed to update platform state:', err);
    return { success: false, error: err.message || 'حدث خطأ أثناء تحديث حالة المنصة' };
  }
};

/**
 * Generic field update targeting row id = 1 with updated_at timestamp
 */
export const updateMasterSetting = async (
  field: string,
  value: any
): Promise<{ success: boolean; error?: string }> => {
  try {
    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      [field]: value,
      updated_at: nowIso
    };

    if (field === 'is_site_disabled') {
      updatePayload.content = value ? 0 : 1;
    } else if (field === 'content') {
      const isOpen = Number(value) === 1;
      updatePayload.is_site_disabled = !isOpen;
      updatePayload.is_exam_locked = !isOpen;
    }

    const { error } = await supabase
      .from('system_settings')
      .update(updatePayload)
      .eq('id', 1);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

/**
 * Subscribes to Realtime changes on system_settings table (target id = 1)
 */
export const subscribeToPlatformState = (
  onChange: (state: PlatformState) => void
) => {
  const channelName = `realtime-platform-state-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'system_settings' },
      (payload) => {
        const record = payload.new as any;
        if (record && (record.id === 1 || record.id === '1')) {
          const rawContent = record.content;
          const isOpen = isPlatformOpenFromContent(rawContent, record.is_site_disabled);
          const contentNum = isOpen ? 1 : 0;

          onChange({
            isOpen,
            content: contentNum,
            isExamLocked: !!record.is_exam_locked,
            isRegistrationLocked: !!record.is_registration_locked,
            isSiteDisabled: !isOpen || !!record.is_site_disabled,
            isBookOrdersLocked: !!record.is_book_orders_locked,
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
