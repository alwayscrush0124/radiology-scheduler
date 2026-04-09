// ============================================
// Google Apps Script - 影像醫學部排班系統 後端 API
// ============================================
// 使用方式：
// 1. 到 Google Sheets → Extensions → Apps Script
// 2. 貼上此段程式碼（取代全部內容）
// 3. 點 Deploy → New deployment → Web app
//    - Execute as: Me
//    - Who has access: Anyone
// 4. 複製部署網址，貼到前端 js/cloud.js 的 CLOUD_URL
// ============================================

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || '';

    if (action === 'load') {
      return loadAllData();
    }

    if (action === 'ping') {
      return resp({ ok: true, time: new Date().toISOString() });
    }

    return resp({ error: 'unknown action. use ?action=load or ?action=ping' });
  } catch (err) {
    return resp({ error: err.message });
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action || '';

    if (action === 'saveAll') {
      return saveAllData(payload.data || {});
    }

    return resp({ error: 'unknown action' });
  } catch (err) {
    return resp({ error: err.message });
  }
}

// --- 取得或建立「資料」工作表 ---
function getOrCreateSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ws = ss.getSheetByName('資料');
  if (!ws) {
    ws = ss.insertSheet('資料');
    ws.getRange(1, 1, 1, 3).setValues([['key', 'value', 'updated']]);
    ws.setColumnWidth(1, 200);
    ws.setColumnWidth(2, 600);
    ws.setColumnWidth(3, 180);
    ws.getRange(1, 1, 1, 3).setFontWeight('bold');
  }
  return ws;
}

// --- 載入全部資料 ---
function loadAllData() {
  var ws = getOrCreateSheet();
  var lastRow = ws.getLastRow();
  if (lastRow <= 1) {
    return resp({}); // 空資料
  }
  var data = ws.getRange(2, 1, lastRow - 1, 2).getValues();
  var result = {};
  for (var i = 0; i < data.length; i++) {
    if (data[i][0]) {
      result[data[i][0]] = data[i][1];
    }
  }
  return resp(result);
}

// --- 儲存全部資料（整批覆蓋）---
function saveAllData(data) {
  var ws = getOrCreateSheet();
  var now = new Date().toISOString();
  var keys = Object.keys(data);

  if (keys.length === 0) {
    return resp({ success: true, count: 0 });
  }

  // 組裝新資料
  var rows = [];
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    var v = data[k];
    // 確保 value 是字串
    if (typeof v !== 'string') {
      v = JSON.stringify(v);
    }
    rows.push([k, v, now]);
  }

  // 清除舊資料（保留標題行）
  var lastRow = ws.getLastRow();
  if (lastRow > 1) {
    ws.getRange(2, 1, lastRow - 1, 3).clear();
  }

  // 寫入新資料
  ws.getRange(2, 1, rows.length, 3).setValues(rows);

  return resp({ success: true, count: rows.length });
}

// --- JSON 回應 ---
function resp(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
