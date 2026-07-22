import { supabase } from '../lib/supabaseClient';

let isPurgeInProgress = false;

/**
 * Fetches the latest forced refresh timestamp from system_settings DB.
 */
export async function getLatestForcedRefreshTimestamp(): Promise<number> {
  try {
    const { data: appConfig } = await supabase
      .from('system_settings')
      .select('*')
      .eq('id', 'app_config')
      .maybeSingle();

    if (appConfig) {
      if (appConfig.last_forced_refresh_at) {
        const parsed = new Date(appConfig.last_forced_refresh_at).getTime();
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
      if (appConfig.content_version && !isNaN(Number(appConfig.content_version))) {
        const parsed = Number(appConfig.content_version);
        if (parsed > 0) return parsed;
      }
    }

    const { data: rowOne } = await supabase
      .from('system_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (rowOne) {
      if (rowOne.last_forced_refresh_at) {
        const parsed = new Date(rowOne.last_forced_refresh_at).getTime();
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
      if (rowOne.content && !isNaN(Number(rowOne.content))) {
        const parsed = Number(rowOne.content);
        if (parsed > 0) return parsed;
      }
    }
  } catch (err) {
    console.error("Error fetching forced refresh timestamp:", err);
  }
  return 0;
}

/**
 * Executes a full clean, force logout, cache purge, and page reload.
 */
export async function performPurgeAndReload(timestampMs: number) {
  if (isPurgeInProgress) return;
  isPurgeInProgress = true;

  try {
    // a) Sign out current user session completely
    await supabase.auth.signOut().catch((err) => console.warn("SignOut error:", err));

    // Unregister Service Workers
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      } catch (swErr) {
        console.warn("SW unregister error:", swErr);
      }
    }

    // Clear Cache Storage
    if ('caches' in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch (cErr) {
        console.warn("Cache delete error:", cErr);
      }
    }

    // b) Clear all local storage & session storage
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn("Storage clear error:", e);
    }

    // Store last_applied_refresh so device knows it's up to date after reload
    try {
      localStorage.setItem('last_applied_refresh', String(timestampMs));
    } catch (e) {}

    // c) Force a clean cache-busting reload
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.set('v', String(timestampMs || Date.now()));
    window.location.href = cleanUrl.toString();
  } catch (err) {
    console.error("Purge and reload error:", err);
    window.location.reload();
  }
}

/**
 * Triggered by Admin: updates DB persistent timestamp & broadcasts Realtime event.
 */
export async function triggerGlobalRefresh(): Promise<number> {
  const nowMs = Date.now();
  const isoTime = new Date(nowMs).toISOString();

  // 1. Update persistent state in database
  try {
    const { error: upsertErr } = await supabase.from('system_settings').upsert({
      id: 'app_config',
      last_forced_refresh_at: isoTime,
      content_version: String(nowMs),
      updated_at: isoTime
    });
    if (upsertErr) {
      // Fallback if last_forced_refresh_at column does not exist
      await supabase.from('system_settings').upsert({
        id: 'app_config',
        content_version: String(nowMs),
        updated_at: isoTime
      });
    }
  } catch (e) {
    console.warn("Failed to update app_config in system_settings:", e);
  }

  try {
    await supabase.from('system_settings').update({
      content: String(nowMs),
      updated_at: isoTime
    }).eq('id', 1);
  } catch (e) {
    console.warn("Failed to update row 1 in system_settings:", e);
  }

  // 2. Publish Supabase Realtime Broadcast Event
  try {
    const channel = supabase.channel('global-app-control');
    await new Promise<void>((resolve) => {
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try {
            await channel.send({
              type: 'broadcast',
              event: 'FORCE_GLOBAL_REFRESH',
              payload: { timestamp: nowMs }
            });
          } catch (sendErr) {
            console.warn("Error sending broadcast:", sendErr);
          }
          setTimeout(() => {
            supabase.removeChannel(channel);
            resolve();
          }, 300);
        }
      });
      setTimeout(() => {
        supabase.removeChannel(channel);
        resolve();
      }, 2000);
    });
  } catch (err) {
    console.warn("Realtime broadcast error:", err);
  }

  return nowMs;
}

/**
 * Subscribes client device to Realtime Broadcast & checks DB timestamp on reconnection/session check.
 */
export function setupForceRefreshListener(): () => void {
  // Reconnection / Session check on initial app load / mount
  const checkInitialDbTimestamp = async () => {
    const dbTimestamp = await getLatestForcedRefreshTimestamp();
    if (dbTimestamp > 0) {
      const lastApplied = Number(localStorage.getItem('last_applied_refresh') || '0');
      if (dbTimestamp > lastApplied) {
        console.log(`[ForceRefresh] Stale device detected! DB timestamp: ${dbTimestamp}, Local applied: ${lastApplied}. Executing purge...`);
        await performPurgeAndReload(dbTimestamp);
      }
    }
  };

  checkInitialDbTimestamp();

  // Realtime Broadcast Listener
  const channel = supabase.channel('global-app-control');

  channel
    .on('broadcast', { event: 'FORCE_GLOBAL_REFRESH' }, (payload) => {
      const incomingTimestamp = Number(payload?.payload?.timestamp || Date.now());
      const lastApplied = Number(localStorage.getItem('last_applied_refresh') || '0');
      if (incomingTimestamp > lastApplied) {
        console.log(`[ForceRefresh] Broadcast event received! Timestamp: ${incomingTimestamp}, Local applied: ${lastApplied}. Executing purge...`);
        performPurgeAndReload(incomingTimestamp);
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
