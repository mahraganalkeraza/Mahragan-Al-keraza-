import { supabase } from '../lib/supabaseClient';

let isPurgeInProgress = false;

/**
 * Helper function to clear all cookies across path scopes and domains
 */
export function clearAllCookies() {
  try {
    const cookies = document.cookie ? document.cookie.split("; ") : [];
    const hostname = window.location.hostname;
    const path = window.location.pathname;
    const paths = ["/", path, path.substring(0, path.lastIndexOf('/')) || "/"];
    const domains = [
      hostname,
      "." + hostname,
      hostname.startsWith(".") ? hostname.substring(1) : hostname
    ].filter(Boolean);

    for (const cookie of cookies) {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      if (!name) continue;

      // Expire cookie without explicit domain/path
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
      
      // Expire cookie across path and domain variations
      for (const p of paths) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${p};`;
        for (const d of domains) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${p}; domain=${d};`;
        }
      }
    }
  } catch (e) {
    console.warn("Cookie clear error:", e);
  }
}

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
 * Executes a full clean, force logout, cache purge, and page reload for ALL users,
 * including visitors logged in via Daily QR Code scan and registered account holders.
 *
 * Sequence:
 * 1. Clear All Local & Session Storage (explicit QR validation keys + clear())
 * 2. Clear Cookies across all path scopes
 * 3. Purge Cache Storage & Service Workers (PWA / Browser Cache)
 * 4. Force Uncached Hard Reload: window.location.href = window.location.pathname + '?v=' + new Date().getTime();
 */
export async function performPurgeAndReload(timestampMs?: number) {
  if (isPurgeInProgress) return;
  isPurgeInProgress = true;

  try {
    // Revoke Supabase auth session if active
    await supabase.auth.signOut().catch((err) => console.warn("SignOut error:", err));

    // 1. Clear All Local & Session Storage
    const specificKeys = [
      'qr_token',
      'daily_code',
      'access_key',
      'guest_session',
      'gate_access_granted_hourly',
      'gate_access_granted',
      'gateway_exam_token',
      'active_student_session',
      'active_student_id',
      'church_session',
      'userProfileCache',
      'cached_auth_version',
      'exam_session',
      'portal_locked_by_admin',
      'manual_seed_modifier',
      'last_applied_refresh',
      'cached_students_registry',
      'cached_students_registry_time',
      'cached_students_last_sync_timestamp',
      'current_exam_questions',
      'device_hardware_token',
      'app_version'
    ];

    specificKeys.forEach((key) => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch (e) {}
    });

    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn("Storage clear error:", e);
    }

    // 2. Clear Cookies across all path scopes
    clearAllCookies();

    // 3. Purge Cache Storage & Service Workers (PWA / Browser Cache)
    if ('caches' in window) {
      try {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
      } catch (cErr) {
        console.warn("Cache delete error:", cErr);
      }
    }

    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      } catch (swErr) {
        console.warn("SW unregister error:", swErr);
      }
    }

    // 4. Force Uncached Hard Reload
    const reloadVersion = timestampMs || new Date().getTime();
    window.location.href = window.location.pathname + '?v=' + reloadVersion;
  } catch (err) {
    console.error("Purge and reload error:", err);
    window.location.href = window.location.pathname + '?v=' + new Date().getTime();
  }
}

/**
 * Triggered by Admin: updates DB persistent timestamp & broadcasts Realtime event to all devices.
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

  // 2. Publish Realtime Broadcast Event across multiple channels to reach all devices
  const channelsToBroadcast = ['global-app-control', 'church-lock-channel', 'global-updates'];
  
  await Promise.all(channelsToBroadcast.map(async (channelName) => {
    try {
      const channel = supabase.channel(channelName);
      await new Promise<void>((resolve) => {
        channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            try {
              await channel.send({
                type: 'broadcast',
                event: 'FORCE_GLOBAL_REFRESH',
                payload: { timestamp: nowMs }
              });
              await channel.send({
                type: 'broadcast',
                event: 'FORCE_HARD_REFRESH',
                payload: { type: 'FORCE_HARD_REFRESH', timestamp: nowMs }
              });
            } catch (sendErr) {
              console.warn(`Error sending broadcast on ${channelName}:`, sendErr);
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
        }, 1500);
      });
    } catch (err) {
      console.warn(`Realtime broadcast error on ${channelName}:`, err);
    }
  }));

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
    .on('broadcast', { event: 'FORCE_HARD_REFRESH' }, (payload) => {
      const incomingTimestamp = Number(payload?.payload?.timestamp || Date.now());
      const lastApplied = Number(localStorage.getItem('last_applied_refresh') || '0');
      if (incomingTimestamp > lastApplied) {
        console.log(`[ForceRefresh] Hard refresh broadcast received! Timestamp: ${incomingTimestamp}, Local applied: ${lastApplied}. Executing purge...`);
        performPurgeAndReload(incomingTimestamp);
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

