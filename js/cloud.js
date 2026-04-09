// ============================================
// 雲端同步模組 - Google Apps Script 後端
// ============================================

const CLOUD_URL = 'https://script.google.com/macros/s/AKfycbxPIJNXPdEHkFItcO6G--tAKDPt2nVhF-gRlvOWM7bE5HGCcDPeHd7Az1uuHNBwt_RwlA/exec';

let cloudEnabled = true;
let cloudSyncing = false;
let syncTimer = null;

// localStorage 中需要同步的 key 前綴
const SYNC_PREFIXES = ['radiology_', 'al_track_'];

// --- 狀態顯示 ---
function showCloudStatus(status) {
  const el = document.getElementById('cloud-status');
  if (!el) return;

  const map = {
    loading:  { text: '載入雲端資料...', color: '#3182ce', icon: '☁️' },
    loaded:   { text: '已從雲端載入',     color: '#38a169', icon: '✅' },
    saving:   { text: '儲存中...',         color: '#d69e2e', icon: '💾' },
    saved:    { text: '已同步到雲端',      color: '#38a169', icon: '✅' },
    error:    { text: '雲端同步失敗',      color: '#e53e3e', icon: '⚠️' },
    offline:  { text: '離線模式',          color: '#718096', icon: '📴' },
    disabled: { text: '雲端未啟用',        color: '#a0aec0', icon: '—' },
  };
  const s = map[status] || map.disabled;
  el.innerHTML = `<span style="font-size:12px;">${s.icon}</span> <span>${s.text}</span>`;
  el.style.color = s.color;

  // 成功狀態 3 秒後淡出
  if (status === 'saved' || status === 'loaded') {
    setTimeout(() => {
      if (el.style.color === s.color) {
        el.style.opacity = '0.5';
      }
    }, 3000);
  } else {
    el.style.opacity = '1';
  }
}

// --- 從雲端載入全部資料 ---
async function loadFromCloud() {
  if (!CLOUD_URL || !cloudEnabled) {
    showCloudStatus('disabled');
    return false;
  }

  showCloudStatus('loading');
  try {
    const res = await fetch(CLOUD_URL + '?action=load');
    const data = await res.json();

    if (data.error) throw new Error(data.error);

    // 如果雲端有資料，寫入 localStorage
    const keys = Object.keys(data);
    if (keys.length === 0) {
      console.log('[Cloud] 雲端無資料，使用本地資料');
      showCloudStatus('loaded');
      return false;
    }

    for (const key of keys) {
      localStorage.setItem(key, data[key]);
    }
    console.log(`[Cloud] 已從雲端載入 ${keys.length} 筆資料`);
    showCloudStatus('loaded');
    return true;
  } catch (err) {
    console.error('[Cloud] 載入失敗:', err);
    showCloudStatus('error');
    return false;
  }
}

// --- 收集需要同步的 localStorage 資料 ---
function collectSyncData() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (SYNC_PREFIXES.some(p => key.startsWith(p))) {
      data[key] = localStorage.getItem(key);
    }
  }
  return data;
}

// --- 排程雲端同步（debounce 2 秒）---
function scheduleCloudSync() {
  if (!cloudEnabled || !CLOUD_URL) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(doCloudSync, 2000);
}

// --- 執行雲端同步 ---
async function doCloudSync() {
  if (cloudSyncing) {
    // 已在同步中，排程重試
    scheduleCloudSync();
    return;
  }
  cloudSyncing = true;
  showCloudStatus('saving');

  try {
    const data = collectSyncData();
    const count = Object.keys(data).length;

    const res = await fetch(CLOUD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'saveAll', data }),
    });
    const result = await res.json();

    if (result.error) throw new Error(result.error);

    console.log(`[Cloud] 已同步 ${count} 筆資料到雲端`);
    showCloudStatus('saved');
  } catch (err) {
    console.error('[Cloud] 同步失敗:', err);
    showCloudStatus('error');
  } finally {
    cloudSyncing = false;
  }
}

// --- 手動觸發同步 ---
async function forceCloudSync() {
  if (syncTimer) clearTimeout(syncTimer);
  await doCloudSync();
}
