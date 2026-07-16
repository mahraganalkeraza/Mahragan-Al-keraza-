import { precacheAndRoute } from 'workbox-precaching';

// Precaching assets automatically compiled by VitePWA
precacheAndRoute(self.__WB_MANIFEST || []);

// Aggressive cache-busting and update controls
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Database constants
const DB_NAME = 'gateway-pwa-db';
const DB_VERSION = 1;

const SUPABASE_URL = "https://nrigdgdiqjdzieryjjod.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yaWdkZ2RpcWpkemllcnlqam9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Njg3MTIsImV4cCI6MjA5NjM0NDcxMn0.9YMt8Vxy4lJ_7RBpjvBd9Gv9TB-AFv88U6pDoH9A3Fo";

// IndexedDB Helper
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('roster')) {
        db.createObjectStore('roster', { keyPath: 'student_id' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta');
      }
      if (!db.objectStoreNames.contains('exams')) {
        db.createObjectStore('exams', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pending_submissions')) {
        db.createObjectStore('pending_submissions', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

function getMeta(key) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('meta', 'readonly');
      const store = tx.objectStore('meta');
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  });
}

function setMeta(key, value) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('meta', 'readwrite');
      const store = tx.objectStore('meta');
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

function getAllRoster() {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('roster', 'readonly');
      const store = tx.objectStore('roster');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  });
}

function getRosterItem(studentId) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('roster', 'readonly');
      const store = tx.objectStore('roster');
      const req = store.get(studentId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  });
}

function saveRosterItems(items) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('roster', 'readwrite');
      const store = tx.objectStore('roster');
      items.forEach(item => {
        if (item && item.student_id) {
          store.put(item);
        }
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  });
}

function saveExamsToIndexedDB(exams) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('exams', 'readwrite');
      const store = tx.objectStore('exams');
      exams.forEach(exam => {
        if (exam && exam.id) {
          store.put(exam);
        }
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  });
}

function getAllExamsFromIndexedDB() {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('exams', 'readonly');
      const store = tx.objectStore('exams');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  });
}

async function queueSubmissionInIndexedDB(request) {
  const url = request.url;
  const method = request.method;
  const headers = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  const body = await request.text();
  
  let student_id = 'unknown';
  try {
    const parsed = JSON.parse(body);
    student_id = parsed.student_id || 'unknown';
  } catch (e) {}

  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending_submissions', 'readwrite');
      const store = tx.objectStore('pending_submissions');
      store.add({
        url,
        method,
        headers,
        body,
        student_id,
        timestamp: Date.now()
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  });
}

// Delta Sync Centralized Fetch Handler
async function handleRosterSync() {
  // Trigger processing any pending offline queue items upon user-initiated Sync action
  if (typeof processQueue === 'function') {
    processQueue().catch(err => console.error('[SW Sync] Roster sync queue run error:', err));
  }

  try {
    let lastTimestamp = await getMeta('last_sync_timestamp');
    if (!lastTimestamp) {
      lastTimestamp = "1970-01-01T00:00:00.000Z";
    }

    const url = `${SUPABASE_URL}/rest/v1/registrations?select=student_id,name,stage,churchName,gender,competitions,updated_at&updated_at=gt.${lastTimestamp}&order=updated_at.asc`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Supabase returned status ${response.status}`);
    }

    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const cleanedData = data.filter(r => r.name !== 'SYSTEM_LOCK');
      await saveRosterItems(cleanedData);

      let latest = lastTimestamp;
      data.forEach(r => {
        if (r.updated_at && r.updated_at > latest) {
          latest = r.updated_at;
        }
      });
      await setMeta('last_sync_timestamp', latest);
    }

    const syncTimeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date().toLocaleDateString('ar-EG');
    await setMeta('last_sync_time_str', syncTimeStr);

    const fullRoster = await getAllRoster();
    return new Response(JSON.stringify({ roster: fullRoster, syncTime: syncTimeStr }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Roster delta sync failed, returning cached roster:', error);
    const fullRoster = await getAllRoster();
    const lastSyncTimeStr = await getMeta('last_sync_time_str') || 'غير معروف';
    return new Response(JSON.stringify({ roster: fullRoster, syncTime: lastSyncTimeStr, error: error.message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleRosterGet(requestUrl) {
  const url = new URL(requestUrl);
  const studentId = url.searchParams.get('student_id');
  
  if (studentId) {
    const item = await getRosterItem(studentId);
    if (item) {
      return new Response(JSON.stringify(item), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } else {
      try {
        const supabaseUrl = `${SUPABASE_URL}/rest/v1/registrations?student_id=eq.${encodeURIComponent(studentId)}&select=*`;
        const response = await fetch(supabaseUrl, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data[0]) {
            await saveRosterItems([data[0]]);
            return new Response(JSON.stringify(data[0]), { status: 200, headers: { 'Content-Type': 'application/json' } });
          }
        }
      } catch (e) {
        console.error("Direct fetch student fallback failed:", e);
      }
      return new Response(JSON.stringify(null), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
  }

  const roster = await getAllRoster();
  const lastSyncTimeStr = await getMeta('last_sync_time_str') || 'غير معروف';
  return new Response(JSON.stringify({ roster, syncTime: lastSyncTimeStr }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Network-First with Cache Fallback for Exams Schema
async function handleExamsPoolRequest(request) {
  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      const clonedResp = response.clone();
      const exams = await clonedResp.json();
      if (Array.isArray(exams)) {
        await saveExamsToIndexedDB(exams);
      }
      return response;
    }
  } catch (err) {
    console.warn("Exams fetch failed, falling back to cached exams:", err);
  }

  const cachedExams = await getAllExamsFromIndexedDB();
  return new Response(JSON.stringify(cachedExams), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Secure write-acknowledgment submission interceptor
async function handleExamSubmission(request) {
  const reqClone = request.clone();
  try {
    const response = await fetch(request);
    if (response.ok) {
      return response;
    }
    throw new Error('Network response not ok: ' + response.status);
  } catch (err) {
    console.error('Failed to submit exam, queuing in IndexedDB for Background Sync:', err);
    await queueSubmissionInIndexedDB(reqClone);
    return new Response(JSON.stringify({ offline: true, message: 'Queued for background sync successfully.' }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Main Fetch Event Interception (Local Proxy Pattern)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Intercept roster gateway API calls
  if (url.pathname === '/api/roster') {
    if (url.searchParams.get('sync') === 'true') {
      event.respondWith(handleRosterSync());
    } else {
      event.respondWith(handleRosterGet(event.request.url));
    }
    return;
  }

  // 2. Intercept Supabase exams pool calls
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/rest/v1/exams_pool')) {
    event.respondWith(handleExamsPoolRequest(event.request));
    return;
  }

  // 3. Intercept Supabase exam submissions
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/rest/v1/exam_submissions')) {
    if (event.request.method === 'POST' || event.request.method === 'PATCH') {
      event.respondWith(handleExamSubmission(event.request));
      return;
    }
  }
});

// Periodic background sync logic
let isRetrying = false;
async function processQueue() {
  if (isRetrying) return;
  isRetrying = true;
  try {
    const db = await openDB();
    const tx = db.transaction('pending_submissions', 'readonly');
    const store = tx.objectStore('pending_submissions');
    const requests = await store.getAll();
    
    for (const reqData of requests) {
      try {
        const headers = new Headers(reqData.headers);
        const response = await fetch(reqData.url, {
          method: reqData.method,
          headers: headers,
          body: reqData.body
        });
        if (response.ok) {
          const delDb = await openDB();
          const delTx = delDb.transaction('pending_submissions', 'readwrite');
          await delTx.objectStore('pending_submissions').delete(reqData.id);
          console.log(`[SW Sync] Successfully synced pending submission for ID ${reqData.id} of student ${reqData.student_id}`);
        } else {
          console.warn(`[SW Sync] Retry failed for submission ${reqData.id}: status ${response.status}`);
        }
      } catch (err) {
        console.error(`[SW Sync] Error retrying submission ${reqData.id}:`, err);
        break; // Pause loop if connection is still failed
      }
    }
  } catch (err) {
    console.error('[SW Sync] Error processing offline queue:', err);
  } finally {
    isRetrying = false;
  }
}
