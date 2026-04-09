# 影像醫學部 排班系統

新竹台大分院生醫院竹北院區 影像醫學部 放射科班表管理系統。

## 功能

- **週班表**：以週為單位顯示排班，點擊格子即可編輯人員。支援休假列、ONCALL（雙人）、固定列（血管）
- **年度預假表**：12 個月日曆，填入預假後自動帶入週班表（帶入的格子會鎖定）
- **統計報表**
  - 橫式月報：位置 × 日期、個人 × 日期
  - 上傳 CSV：自動產生班別代碼（0/1/221/262/273/278），可下載
  - 夜班報表：值班表、統計明細表、簽名單（支援 PDF/XLSX/CSV 輸出）
- **模組設定**（密碼鎖定，預設 `123`）
  - RUN CYCLE 輪轉排班模組
  - 輪轉人員順序管理
  - 起始/結束日期與人員序號設定
  - 休假列數設定
  - 固定列設定（血管等）
  - ONCALL 來源位置設定
  - 備份匯出/匯入（JSON）

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | 純 HTML / CSS / JavaScript（無框架） |
| 資料儲存 | localStorage（第一版）→ Google Sheets API（第二版） |
| 報表匯出 | SheetJS (xlsx.js) CDN |
| 部署 | GitHub Pages（靜態網站） |

## 檔案結構

```
radiology-scheduler/
├── index.html            # 主頁 SPA
├── css/styles.css        # 樣式 + 列印樣式
├── js/
│   ├── data.js           # 資料模型、localStorage 讀寫
│   ├── module.js         # 模組設定、RUN CYCLE、備份
│   ├── weeklyView.js     # 週班表渲染 + 編輯
│   ├── horizontalView.js # 橫式月報
│   ├── uploadExport.js   # 上傳 CSV 代碼產生
│   ├── reportView.js     # 夜班報表（值班表/統計/簽名）
│   ├── annualLeave.js    # 年度預假表
│   └── app.js            # 初始化、Tab 切換
├── serve.ps1             # 本地開發用 PowerShell HTTP Server
└── serve.bat             # serve.ps1 的包裝
```

## 部署到 GitHub Pages

### 步驟 1：建立 GitHub Repository

```bash
cd radiology-scheduler
git init
git add .
git commit -m "初始版本"
```

到 GitHub 建立新 Repository（例如 `radiology-scheduler`），然後：

```bash
git remote add origin https://github.com/<你的帳號>/radiology-scheduler.git
git branch -M main
git push -u origin main
```

### 步驟 2：啟用 GitHub Pages

1. 到 GitHub Repository → **Settings** → **Pages**
2. Source 選擇 **Deploy from a branch**
3. Branch 選擇 **main**，資料夾選 **/ (root)**
4. 點 **Save**
5. 等 1~2 分鐘，網站就會在 `https://<你的帳號>.github.io/radiology-scheduler/` 上線

### 步驟 3：後續更新

```bash
git add .
git commit -m "更新班表"
git push
```

推送後 GitHub Pages 會自動重新部署。

---

## 第二版：串接 Google Sheets 作為後端資料庫

### 架構概念

```
瀏覽器 (GitHub Pages)
    ↕ Google Sheets API (REST)
Google Sheets (資料庫)
```

所有人打開網頁就看到最新班表，修改後寫回 Google Sheets，其他人重新載入即可看到。

### 步驟 1：建立 Google Sheets

1. 到 [Google Sheets](https://sheets.google.com) 建立新試算表
2. 建立以下分頁：
   - **班表資料**：欄位 `年月, 日, 位置, 人員`
   - **人員名單**：欄位 `暱稱, 員編, 姓名`
   - **模組設定**：存放 RUN CYCLE 設定 JSON
   - **年度預假**：欄位 `年, 月, 日, 休假欄, 人員`
3. 記下試算表 ID（網址中 `https://docs.google.com/spreadsheets/d/【這段】/edit`）

### 步驟 2：建立 Google Cloud 專案 + API Key

1. 到 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案（例如 `radiology-scheduler`）
3. 啟用 **Google Sheets API**：
   - 左側選單 → **APIs & Services** → **Library**
   - 搜尋 `Google Sheets API` → 點 **ENABLE**
4. 建立 API Key：
   - 左側選單 → **APIs & Services** → **Credentials**
   - 點 **Create Credentials** → **API Key**
   - 建議限制 Key 只能用於 Google Sheets API + 你的 GitHub Pages 網域

### 步驟 3：設定試算表權限

**方案 A：唯讀公開 + 寫入用 Service Account（推薦）**

1. 試算表設為「知道連結的人可以檢視」→ 讀取不需要登入
2. 建立 Service Account：
   - Google Cloud Console → **IAM & Admin** → **Service Accounts**
   - 建立 Service Account → 下載 JSON 金鑰
   - 將 Service Account 的 email 加為試算表的「編輯者」
3. 寫入需要透過一個中間層（因為 Service Account 金鑰不能暴露在前端）：
   - 選項 1：用 **Google Apps Script** 當中間 API（免費，推薦）
   - 選項 2：用 Cloudflare Workers / Vercel Edge Functions

**方案 B：全部用 Google Apps Script（最簡單）**

不需要 API Key，直接用 Google Apps Script 做讀寫 API：

1. 在 Google Sheets → **Extensions** → **Apps Script**
2. 貼上以下程式碼：

```javascript
// Google Apps Script - 班表 API

function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const action = e.parameter.action;

  if (action === 'getSchedule') {
    const yearMonth = e.parameter.yearMonth; // 例如 "2026-05"
    const ws = sheet.getSheetByName('班表資料');
    const data = ws.getDataRange().getValues();
    const result = data.filter(row => row[0] === yearMonth);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'getStaff') {
    const ws = sheet.getSheetByName('人員名單');
    const data = ws.getDataRange().getValues();
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ error: 'unknown action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const payload = JSON.parse(e.postData.contents);

  if (payload.action === 'saveSchedule') {
    const ws = sheet.getSheetByName('班表資料');
    // 清除該月舊資料，寫入新資料
    const yearMonth = payload.yearMonth;
    const data = ws.getDataRange().getValues();
    // 找到該月資料的起始行，刪除後重新寫入
    const newRows = payload.schedule; // [[yearMonth, day, pos, person], ...]
    // ... 實作刪除舊資料 + 寫入新資料
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ error: 'unknown action' }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. 部署為 Web App：
   - 點 **Deploy** → **New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**（或限制為組織內）
   - 點 **Deploy** → 複製 Web App URL

4. 在前端 JavaScript 呼叫：

```javascript
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/你的部署ID/exec';

// 讀取班表
async function fetchSchedule(yearMonth) {
  const res = await fetch(`${APPS_SCRIPT_URL}?action=getSchedule&yearMonth=${yearMonth}`);
  return await res.json();
}

// 儲存班表
async function saveScheduleToCloud(yearMonth, scheduleData) {
  const rows = [];
  scheduleData.forEach((dayData, i) => {
    Object.entries(dayData).forEach(([pos, person]) => {
      rows.push([yearMonth, i + 1, pos, person]);
    });
  });
  await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'saveSchedule', yearMonth, schedule: rows }),
  });
}
```

### 步驟 4：修改前端程式碼

將 `data.js` 中的 localStorage 讀寫改為呼叫 Google Sheets API：

1. `loadSchedule()` → 改為 `await fetchSchedule(yearMonth)`
2. `saveSchedule()` → 改為 `await saveScheduleToCloud(yearMonth, data)`
3. 加入 loading 狀態提示（因為 API 呼叫有延遲）
4. 可保留 localStorage 作為離線快取

### 建議的漸進式遷移

| 階段 | 讀取來源 | 寫入目標 | 說明 |
|------|----------|----------|------|
| v1 (目前) | localStorage | localStorage | 單機使用 |
| v2a | Google Sheets | localStorage + Google Sheets | 讀雲端、寫兩邊 |
| v2b | Google Sheets | Google Sheets | 完全雲端 |

### 注意事項

- Google Apps Script 有每日執行額度限制（免費帳號約 20,000 次/天），一般科室使用綽綽有餘
- Apps Script 回應速度約 1~3 秒，建議加入 loading 動畫
- 可考慮每次載入頁面時從雲端拉資料，編輯時先存 localStorage 再背景同步到雲端
- 如果需要即時同步（多人同時編輯），可用 `setInterval` 定期拉取，或改用 Firebase Realtime Database

## 本地開發

```bash
# 使用 PowerShell HTTP Server（Windows）
.\serve.bat
# 瀏覽器開啟 http://localhost:8080

# 或直接開啟 index.html（部分功能可能受限於 file:// 協議）
```

## 班別代碼對照

| 代碼 | 班別 | 對應位置 |
|------|------|----------|
| 0 | 休假 | 未排班 |
| 1 | 白班 | MRI, CT, ER, 3rd X光, MAMMO, OPD2/BMD, 代1, 代2, 血管 |
| 221 | Portable/ER CT | Portable, ER CT |
| 262 | 大夜 | 大 |
| 273 | 13-21 | 13-21 |
| 278 | 小夜 | 小, 小二線 |

## 夜班費計算公式

| 項目 | 公式 |
|------|------|
| 申報大夜 | 大夜次數 × 1.07 |
| 小小夜績效 | 小小夜(13-21)次數 × 0.5 |
| 申報小夜 | 小夜次數 × 0.99 + 小小夜績效 |

## License

僅供新竹台大分院影像醫學部內部使用。
