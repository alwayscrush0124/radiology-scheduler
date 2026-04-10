// 模組設定：RUN CYCLE 排班邏輯
// positions: 位置名稱列表
// cycle: 每個位置在每天(一~日)對應的人員編號
// roster: 編號對應的人員暱稱列表 (index 0 = 編號1)

const DEFAULT_MODULE = {
  positions: [
    { name: 'MRI',       days: [1,1,1,1,1,null,null],    color: '' },
    { name: 'CT',        days: [2,2,2,2,2,null,null],    color: '' },
    { name: 'ER',        days: [3,3,3,3,3,null,null],    color: '' },
    { name: 'Portable',  days: [4,4,9,9,4,4,4],          color: '' },
    { name: 'OPD',       days: [5,9,5,5,5,null,null],    color: '' },
    { name: 'MA/骨密',   days: [7,7,7,7,7,null,null],    color: '' },
    { name: '2rd X光',   days: [6,6,6,6,6,null,null],    color: '' },
    { name: 'ER CT',     days: [8,8,8,8,8,5,13],         color: '' },
    { name: 'P小',       days: [10,10,10,10,9,9,10],     color: '#e53e3e' },
    { name: 'CT小',      days: [11,11,11,12,12,12,12],   color: '#e53e3e' },
    { name: '大',        days: [12,13,13,13,13,11,11],   color: '#e53e3e' },
    { name: '13-21',     days: [14,14,14,14,14,null,null], color: '#ecc94b' },
    { name: '代1',       days: [15,15,15,15,15,null,null], color: '' },
    { name: '代2',       days: [16,16,16,16,16,null,null], color: '' },
  ],
  // 15人輪轉 + 1人固定(代2)
  cycleLength: 15,
  // 固定人員 (代2永遠是"行")
  fixedSlots: { 16: '行' },
};

// 模組內位置名稱 → 週班表位置名稱 的對應
const MODULE_TO_SCHEDULE = {
  'MRI': 'MRI',
  'CT': 'CT',
  'ER': 'ER',
  'Portable': 'Portable',
  'OPD': '3rd X光',
  'MA/骨密': 'MAMMO',
  '2rd X光': 'OPD2/BMD',
  'ER CT': 'ER CT',
  'P小': '小',
  'CT小': '小二線',
  '大': '大',
  '13-21': '13-21',
  '代1': '代1',
  '代2': '代2',
};

let currentModule = null;
let moduleUnlocked = false;  // 模組是否已解鎖
const MODULE_PASSWORD_KEY = 'radiology_module_password';

function getModulePassword() {
  return localStorage.getItem(MODULE_PASSWORD_KEY) || '123';
}

function setModulePassword(pw) {
  localStorage.setItem(MODULE_PASSWORD_KEY, pw);
}

function loadModule() {
  const saved = localStorage.getItem('radiology_module');
  if (saved) {
    currentModule = JSON.parse(saved);
  } else {
    currentModule = JSON.parse(JSON.stringify(DEFAULT_MODULE));
  }
  return currentModule;
}

function saveModule() {
  localStorage.setItem('radiology_module', JSON.stringify(currentModule));
  if (typeof scheduleCloudSync === 'function') scheduleCloudSync();
}

function resetModule() {
  currentModule = JSON.parse(JSON.stringify(DEFAULT_MODULE));
  saveModule();
}

// 取得位置列表 (從模組)
function getPositions() {
  const mod = loadModule();
  return mod.positions.map(p => {
    const schedName = MODULE_TO_SCHEDULE[p.name] || p.name;
    return schedName;
  });
}

// 從模組產生班表
// roster: 長度 = cycleLength 的暱稱陣列 (代表輪轉順序)
// weekOffset: 該週是第幾輪 (0-based)
function generateWeekFromModule(roster, weekOffset) {
  const mod = loadModule();
  const result = {}; // dayIndex(0=一) => { position: nickname }
  for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
    result[dayIdx] = {};
    mod.positions.forEach(pos => {
      const num = pos.days[dayIdx]; // 該位置在這天的編號
      if (num === null) return;
      const schedPos = MODULE_TO_SCHEDULE[pos.name] || pos.name;
      // 編號是1-based, 輪轉offset
      if (mod.fixedSlots[num]) {
        result[dayIdx][schedPos] = mod.fixedSlots[num];
      } else {
        const rosterIdx = ((num - 1 - weekOffset) % mod.cycleLength + mod.cycleLength) % mod.cycleLength;
        result[dayIdx][schedPos] = roster[rosterIdx];
      }
    });
  }
  return result;
}

// 渲染模組設定頁面
function renderModuleView() {
  const container = document.getElementById('module');
  const mod = loadModule();
  container.innerHTML = '';

  // 密碼鎖定畫面
  if (!moduleUnlocked) {
    renderModuleLock(container);
    return;
  }

  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';
  toolbar.innerHTML = `
    <button class="btn btn-primary" id="module-apply">套用模組到當月班表</button>
    <button class="btn btn-danger" id="module-clear-month">清空當月班表</button>
    <button class="btn btn-secondary" id="module-reset">重置為預設</button>
    <button class="btn btn-primary" id="module-export" style="margin-left:auto;">匯出備份</button>
    <button class="btn btn-secondary" id="module-import">匯入備份</button>
    <input type="file" id="module-import-file" accept=".json" style="display:none;">
    <button class="btn btn-secondary" id="module-change-pw">修改密碼</button>
    <button class="btn btn-secondary" id="module-lock">鎖定</button>
  `;
  container.appendChild(toolbar);

  // 說明
  const info = document.createElement('p');
  info.style.cssText = 'margin-bottom:12px;color:#666;font-size:13px;';
  info.textContent = '編輯下表中的數字可調整排班邏輯。數字代表輪轉順序中的位置（1~15輪轉，16為固定人員）。空格表示該天此位置不排班。';
  container.appendChild(info);

  // 模組表格
  const wrap = document.createElement('div');
  wrap.className = 'h-table-wrap';
  const table = document.createElement('table');
  table.className = 'week-table';
  table.id = 'module-table';

  const dayLabels = ['一', '二', '三', '四', '五', '六', '日'];
  let html = `<thead><tr><th class="pos-col">位置</th>`;
  dayLabels.forEach((d, i) => {
    const isWe = i >= 5;
    html += `<th class="${isWe ? 'weekend-col' : ''}">${d}</th>`;
  });
  html += '</tr></thead><tbody>';

  mod.positions.forEach((pos, pi) => {
    const bgStyle = pos.color ? `background:${pos.color};color:white;` : '';
    html += `<tr>`;
    html += `<td class="pos-col" style="${bgStyle}">${pos.name}</td>`;
    pos.days.forEach((num, di) => {
      const isWe = di >= 5;
      const val = num !== null ? num : '';
      html += `<td class="${isWe ? 'weekend-col' : ''} editable" contenteditable="true" data-pi="${pi}" data-di="${di}">${val}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody>';
  table.innerHTML = html;
  wrap.appendChild(table);
  container.appendChild(wrap);

  // 新增/刪除位置按鈕
  const posTools = document.createElement('div');
  posTools.className = 'toolbar';
  posTools.style.marginTop = '12px';
  posTools.innerHTML = `
    <button class="btn btn-secondary" id="module-add-pos">新增位置</button>
    <button class="btn btn-danger" id="module-del-pos">刪除最後一列</button>
  `;
  container.appendChild(posTools);

  // 輪轉順序設定
  const savedRoster = getSavedRoster();
  const rosterSection = document.createElement('div');
  rosterSection.style.marginTop = '20px';
  rosterSection.innerHTML = `<h3 class="section-title">輪轉人員順序（編號 1~${savedRoster.length}）</h3>`;
  const rosterWrap = document.createElement('div');
  rosterWrap.className = 'h-table-wrap';
  const rosterTable = document.createElement('table');
  rosterTable.className = 'week-table';
  rosterTable.id = 'roster-table';

  let rHtml = '<thead><tr>';
  for (let i = 1; i <= savedRoster.length; i++) rHtml += `<th>${i}</th>`;
  rHtml += '</tr></thead><tbody><tr>';
  for (let i = 0; i < savedRoster.length; i++) {
    rHtml += `<td contenteditable="true" class="editable" data-ri="${i}">${savedRoster[i] || ''}</td>`;
  }
  rHtml += '</tr></tbody>';
  rosterTable.innerHTML = rHtml;
  rosterWrap.appendChild(rosterTable);
  rosterSection.appendChild(rosterWrap);

  // 新增/刪除人員按鈕
  const rosterTools = document.createElement('div');
  rosterTools.className = 'toolbar';
  rosterTools.style.marginTop = '8px';
  rosterTools.innerHTML = `
    <button class="btn btn-secondary" id="roster-add">新增人員</button>
    <button class="btn btn-danger" id="roster-del">刪除最後一位</button>
    <span style="font-size:13px;color:#666;margin-left:8px;">目前 ${savedRoster.length} 人輪轉</span>
  `;
  rosterSection.appendChild(rosterTools);
  container.appendChild(rosterSection);

  // 起始設定
  const savedStartDate = getSavedStartDate();
  const savedEndDate = getSavedEndDate();
  const savedStartOffset = getSavedStartOffset();
  const startSection = document.createElement('div');
  startSection.style.marginTop = '16px';
  startSection.innerHTML = `
    <h3 class="section-title">模組展開設定</h3>
    <div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap;margin-top:8px;">
      <div>
        <label style="font-weight:600;font-size:13px;">起始日期：</label>
        <input type="date" id="module-start-date" value="${savedStartDate}" style="padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;font-size:14px;">
      </div>
      <div>
        <label style="font-weight:600;font-size:13px;">結束日期：</label>
        <input type="date" id="module-end-date" value="${savedEndDate}" style="padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;font-size:14px;">
      </div>
      <div>
        <label style="font-weight:600;font-size:13px;">起始人員序號：</label>
        <input type="number" id="module-start-offset" min="1" max="${savedRoster.length}" value="${savedStartOffset}" style="width:60px;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;font-size:14px;">
        <span style="font-size:13px;color:#666;margin-left:4px;">（對應上方人員表的編號）</span>
      </div>
    </div>
    <p style="font-size:13px;color:#666;margin-top:6px;">套用時只會填入起始～結束日期區間內的班表，區間外的現有資料不受影響。</p>
    <div style="margin-top:10px;">
      <button class="btn btn-primary" id="module-apply-range">套用模組到指定範圍</button>
      <span style="font-size:13px;color:#666;margin-left:8px;">依據上方起始～結束日期，一次套用所有月份</span>
    </div>
  `;
  container.appendChild(startSection);

  // 休假設定
  const leaveCount = getLeaveSlots();
  const leaveSection = document.createElement('div');
  leaveSection.style.marginTop = '20px';
  leaveSection.innerHTML = `<h3 class="section-title">休假列設定</h3>`;
  const leaveInfo = document.createElement('p');
  leaveInfo.style.cssText = 'margin-bottom:8px;color:#666;font-size:13px;';
  leaveInfo.textContent = `目前週班表有 ${leaveCount} 個休假列（休假1～休假${leaveCount}）。若需要更多休假列可新增，或刪除多餘的休假列。`;
  leaveSection.appendChild(leaveInfo);
  const leaveTools = document.createElement('div');
  leaveTools.className = 'toolbar';
  leaveTools.innerHTML = `
    <button class="btn btn-secondary" id="leave-add">新增休假</button>
    <button class="btn btn-danger" id="leave-del">刪除最後一列</button>
    <span style="font-size:13px;color:#666;margin-left:8px;">目前 ${leaveCount} 列</span>
  `;
  leaveSection.appendChild(leaveTools);
  container.appendChild(leaveSection);

  // 固定列設定（血管等）
  const fixedSlots = getSavedFixedSlots();
  const fixedSection = document.createElement('div');
  fixedSection.style.marginTop = '20px';
  fixedSection.innerHTML = `<h3 class="section-title">固定列設定（血管等）</h3>`;
  const fixedInfo = document.createElement('p');
  fixedInfo.style.cssText = 'margin-bottom:8px;color:#666;font-size:13px;';
  fixedInfo.textContent = '固定列的人員每天（或僅平日）固定顯示，不參與輪轉。';
  fixedSection.appendChild(fixedInfo);

  const fixedWrap = document.createElement('div');
  fixedWrap.className = 'h-table-wrap';
  const fixedTable = document.createElement('table');
  fixedTable.className = 'week-table';
  fixedTable.id = 'fixed-table';
  let fHtml = '<thead><tr><th>名稱</th><th>人員</th><th>僅平日</th></tr></thead><tbody>';
  fixedSlots.forEach((slot, i) => {
    fHtml += `<tr>
      <td contenteditable="true" class="editable" data-fi="${i}" data-field="name">${slot.name}</td>
      <td contenteditable="true" class="editable" data-fi="${i}" data-field="person">${slot.person}</td>
      <td><input type="checkbox" data-fi="${i}" data-field="weekdays" ${slot.weekdays ? 'checked' : ''}></td>
    </tr>`;
  });
  fHtml += '</tbody>';
  fixedTable.innerHTML = fHtml;
  fixedWrap.appendChild(fixedTable);
  fixedSection.appendChild(fixedWrap);

  const fixedTools = document.createElement('div');
  fixedTools.className = 'toolbar';
  fixedTools.style.marginTop = '8px';
  fixedTools.innerHTML = `
    <button class="btn btn-secondary" id="fixed-add">新增固定列</button>
    <button class="btn btn-danger" id="fixed-del">刪除最後一列</button>
  `;
  fixedSection.appendChild(fixedTools);
  container.appendChild(fixedSection);

  // ONCALL 設定
  const oncallConfig = getOncallConfig();
  const oncallSection = document.createElement('div');
  oncallSection.style.marginTop = '20px';
  oncallSection.innerHTML = `<h3 class="section-title">ONCALL 設定</h3>`;
  const oncallInfo = document.createElement('p');
  oncallInfo.style.cssText = 'margin-bottom:8px;color:#666;font-size:13px;';
  oncallInfo.textContent = 'ONCALL 會自動從班表帶入指定位置的人員。可依星期幾設定不同來源位置（以逗號分隔）。';
  oncallSection.appendChild(oncallInfo);

  const allPos = getPositions();
  const oncallWrap = document.createElement('div');
  oncallWrap.style.cssText = 'display:grid;grid-template-columns:120px 1fr;gap:8px;align-items:center;max-width:600px;';
  oncallWrap.innerHTML = `
    <label style="font-weight:600;font-size:13px;">週一～五：</label>
    <input type="text" id="oncall-weekday" value="${oncallConfig.weekday.join(',')}" placeholder="例：ER" style="padding:6px 8px;border:1px solid #e2e8f0;border-radius:4px;font-size:13px;">
    <label style="font-weight:600;font-size:13px;">週六：</label>
    <input type="text" id="oncall-saturday" value="${oncallConfig.saturday.join(',')}" placeholder="例：小二線,ER CT" style="padding:6px 8px;border:1px solid #e2e8f0;border-radius:4px;font-size:13px;">
    <label style="font-weight:600;font-size:13px;">週日：</label>
    <input type="text" id="oncall-sunday" value="${oncallConfig.sunday.join(',')}" placeholder="例：小,Portable" style="padding:6px 8px;border:1px solid #e2e8f0;border-radius:4px;font-size:13px;">
  `;
  oncallSection.appendChild(oncallWrap);
  const oncallNote = document.createElement('p');
  oncallNote.style.cssText = 'margin-top:6px;font-size:12px;color:#888;';
  oncallNote.textContent = `可用位置：${allPos.join(', ')}`;
  oncallSection.appendChild(oncallNote);
  container.appendChild(oncallSection);

  // 綁定事件
  bindModuleEvents(mod);
}

// 密碼鎖定畫面
function renderModuleLock(container) {
  const lockDiv = document.createElement('div');
  lockDiv.style.cssText = 'max-width:360px;margin:60px auto;text-align:center;';
  lockDiv.innerHTML = `
    <div style="font-size:48px;margin-bottom:16px;">🔒</div>
    <h2 style="margin-bottom:8px;color:#2d3748;">模組設定已鎖定</h2>
    <p style="color:#666;margin-bottom:20px;font-size:14px;">請輸入密碼以解鎖編輯</p>
    <input type="password" id="module-pw-input" placeholder="輸入密碼"
      style="width:200px;padding:10px;border:1px solid #e2e8f0;border-radius:6px;font-size:16px;text-align:center;">
    <br>
    <button class="btn btn-primary" id="module-pw-submit" style="margin-top:12px;">解鎖</button>
    <p id="module-pw-error" style="color:#e53e3e;margin-top:8px;display:none;font-size:13px;">密碼錯誤</p>
  `;
  container.appendChild(lockDiv);

  const pwInput = document.getElementById('module-pw-input');
  const submit = document.getElementById('module-pw-submit');
  const errorMsg = document.getElementById('module-pw-error');

  const tryUnlock = () => {
    if (pwInput.value === getModulePassword()) {
      moduleUnlocked = true;
      renderModuleView();
    } else {
      errorMsg.style.display = 'block';
      pwInput.value = '';
      pwInput.focus();
    }
  };

  submit.addEventListener('click', tryUnlock);
  pwInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tryUnlock();
  });
  pwInput.focus();
}

function getSavedRoster() {
  const saved = localStorage.getItem('radiology_roster');
  if (saved) return JSON.parse(saved);
  // 預設: 從 RUN CYCLE W1 的順序
  return ['倫','綾','娟','岑','魁','婷','琳','潔','宏','韋','芳','崴','俊','璇','堯'];
}

function saveRoster(roster) {
  localStorage.setItem('radiology_roster', JSON.stringify(roster));
  if (typeof scheduleCloudSync === 'function') scheduleCloudSync();
}

function getSavedStartDate() {
  const saved = localStorage.getItem('radiology_start_date');
  if (saved) return saved;
  const y = getADYear();
  const m = String(currentMonth).padStart(2, '0');
  return `${y}-${m}-01`;
}

function getSavedEndDate() {
  const saved = localStorage.getItem('radiology_end_date');
  if (saved) return saved;
  // 預設: 當月最後一天
  const y = getADYear();
  const m = String(currentMonth).padStart(2, '0');
  const lastDay = new Date(y, currentMonth, 0).getDate();
  return `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
}

function getSavedStartOffset() {
  const saved = localStorage.getItem('radiology_start_offset');
  return saved ? parseInt(saved) : 1;
}

function bindModuleEvents(mod) {
  // 儲存模組表格編輯
  document.querySelectorAll('#module-table td[contenteditable]').forEach(td => {
    td.addEventListener('blur', () => {
      const pi = parseInt(td.dataset.pi);
      const di = parseInt(td.dataset.di);
      const val = td.textContent.trim();
      mod.positions[pi].days[di] = val === '' ? null : parseInt(val);
      currentModule = mod;
      saveModule();
    });
  });

  // 儲存輪轉順序
  document.querySelectorAll('#roster-table td[contenteditable]').forEach(td => {
    td.addEventListener('blur', () => {
      const roster = [];
      document.querySelectorAll('#roster-table td[contenteditable]').forEach(cell => {
        roster.push(cell.textContent.trim());
      });
      saveRoster(roster);
    });
  });

  // 新增人員
  document.getElementById('roster-add').addEventListener('click', () => {
    const nick = prompt('請輸入新人員暱稱：');
    if (!nick) return;
    const roster = getSavedRoster();
    roster.push(nick);
    saveRoster(roster);
    // 同步更新 cycleLength
    mod.cycleLength = roster.length;
    currentModule = mod;
    saveModule();
    renderModuleView();
  });

  // 刪除最後一位人員
  document.getElementById('roster-del').addEventListener('click', () => {
    const roster = getSavedRoster();
    if (roster.length <= 1) return;
    if (!confirm(`確定刪除最後一位「${roster[roster.length - 1]}」？`)) return;
    roster.pop();
    saveRoster(roster);
    mod.cycleLength = roster.length;
    currentModule = mod;
    saveModule();
    renderModuleView();
  });

  // 套用到班表
  document.getElementById('module-apply').addEventListener('click', () => {
    if (!confirm('將模組套用到當月班表？現有班表會被覆蓋。')) return;
    applyModuleToSchedule();
    refreshAll();
  });

  // 套用到指定範圍（跨月）
  document.getElementById('module-apply-range').addEventListener('click', () => {
    const sd = getSavedStartDate();
    const ed = getSavedEndDate();
    if (!confirm(`將模組套用到 ${sd} ~ ${ed} 的所有月份班表？現有班表會被覆蓋。`)) return;
    applyModuleToRange(true);
    refreshAll();
  });

  // 清空當月班表
  document.getElementById('module-clear-month').addEventListener('click', () => {
    const key = getScheduleKey();
    if (!confirm(`確定清空 ${currentYear}年${currentMonth}月 的所有班表資料？此操作無法復原。`)) return;
    allSchedules[key] = buildEmptyMonth();
    allEdits[key] = new Set();
    saveSchedule();
    refreshAll();
  });

  // 重置
  document.getElementById('module-reset').addEventListener('click', () => {
    if (!confirm('重置模組為預設值？')) return;
    resetModule();
    localStorage.removeItem('radiology_roster');
    renderModuleView();
  });

  // 新增位置
  document.getElementById('module-add-pos').addEventListener('click', () => {
    const name = prompt('請輸入新位置名稱：');
    if (!name) return;
    mod.positions.push({ name, days: [null,null,null,null,null,null,null], color: '' });
    currentModule = mod;
    saveModule();
    renderModuleView();
  });

  // 刪除最後一列
  document.getElementById('module-del-pos').addEventListener('click', () => {
    if (mod.positions.length <= 1) return;
    if (!confirm(`確定刪除最後一列「${mod.positions[mod.positions.length-1].name}」？`)) return;
    mod.positions.pop();
    currentModule = mod;
    saveModule();
    renderModuleView();
  });

  // 起始日期
  document.getElementById('module-start-date').addEventListener('change', (e) => {
    localStorage.setItem('radiology_start_date', e.target.value);
  });

  // 結束日期
  document.getElementById('module-end-date').addEventListener('change', (e) => {
    localStorage.setItem('radiology_end_date', e.target.value);
  });

  // 起始人員序號
  document.getElementById('module-start-offset').addEventListener('change', (e) => {
    let val = parseInt(e.target.value) || 1;
    if (val < 1) val = 1;
    const roster = getSavedRoster();
    if (val > roster.length) val = roster.length;
    e.target.value = val;
    localStorage.setItem('radiology_start_offset', String(val));
  });

  // 匯出備份
  document.getElementById('module-export').addEventListener('click', () => {
    const backup = {
      module: currentModule,
      roster: getSavedRoster(),
      startDate: getSavedStartDate(),
      endDate: getSavedEndDate(),
      startOffset: getSavedStartOffset(),
      leaveSlots: getLeaveSlots(),
      fixedSlots: getSavedFixedSlots(),
      oncallConfig: getOncallConfig(),
      exportDate: new Date().toISOString(),
    };
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `模組備份_${currentYear}年${currentMonth}月.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // 匯入備份
  document.getElementById('module-import').addEventListener('click', () => {
    document.getElementById('module-import-file').click();
  });
  document.getElementById('module-import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const backup = JSON.parse(ev.target.result);
        if (!backup.module || !backup.roster) {
          alert('檔案格式不正確');
          return;
        }
        if (!confirm(`確定匯入備份？（匯出時間：${backup.exportDate || '未知'}）\n現有模組設定將被覆蓋。`)) return;
        currentModule = backup.module;
        saveModule();
        saveRoster(backup.roster);
        if (backup.startDate) localStorage.setItem('radiology_start_date', backup.startDate);
        if (backup.endDate) localStorage.setItem('radiology_end_date', backup.endDate);
        if (backup.startOffset) localStorage.setItem('radiology_start_offset', String(backup.startOffset));
        if (backup.leaveSlots !== undefined) setLeaveSlots(backup.leaveSlots);
        if (backup.fixedSlots) localStorage.setItem('radiology_fixed_slots', JSON.stringify(backup.fixedSlots));
        if (backup.oncallConfig) saveOncallConfig(backup.oncallConfig);
        alert('匯入成功');
        renderModuleView();
        refreshAll();
      } catch (err) {
        alert('檔案讀取失敗：' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // 鎖定
  document.getElementById('module-lock').addEventListener('click', () => {
    moduleUnlocked = false;
    renderModuleView();
  });

  // 修改密碼
  document.getElementById('module-change-pw').addEventListener('click', () => {
    const oldPw = prompt('請輸入目前密碼：');
    if (oldPw !== getModulePassword()) { alert('密碼錯誤'); return; }
    const newPw = prompt('請輸入新密碼：');
    if (!newPw) return;
    const confirmPw = prompt('請再次輸入新密碼：');
    if (newPw !== confirmPw) { alert('兩次密碼不一致'); return; }
    setModulePassword(newPw);
    alert('密碼已更新');
  });

  // 新增休假列
  document.getElementById('leave-add').addEventListener('click', () => {
    const n = getLeaveSlots();
    setLeaveSlots(n + 1);
    renderModuleView();
    refreshAll();
  });

  // 刪除最後一列休假
  document.getElementById('leave-del').addEventListener('click', () => {
    const n = getLeaveSlots();
    if (n <= 0) return;
    if (!confirm(`確定刪除「休假${n}」？`)) return;
    setLeaveSlots(n - 1);
    renderModuleView();
    refreshAll();
  });

  // 固定列編輯
  document.querySelectorAll('#fixed-table td[contenteditable]').forEach(td => {
    td.addEventListener('blur', () => {
      const fi = parseInt(td.dataset.fi);
      const field = td.dataset.field;
      const slots = getSavedFixedSlots();
      slots[fi][field] = td.textContent.trim();
      saveFixedSlots(slots);
      refreshAll();
    });
  });
  document.querySelectorAll('#fixed-table input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const fi = parseInt(cb.dataset.fi);
      const slots = getSavedFixedSlots();
      slots[fi].weekdays = cb.checked;
      saveFixedSlots(slots);
      refreshAll();
    });
  });

  // 新增固定列
  document.getElementById('fixed-add').addEventListener('click', () => {
    const name = prompt('請輸入固定列名稱：');
    if (!name) return;
    const slots = getSavedFixedSlots();
    slots.push({ name, person: '', weekdays: true });
    saveFixedSlots(slots);
    renderModuleView();
    refreshAll();
  });

  // 刪除最後固定列
  document.getElementById('fixed-del').addEventListener('click', () => {
    const slots = getSavedFixedSlots();
    if (slots.length <= 0) return;
    if (!confirm(`確定刪除「${slots[slots.length - 1].name}」？`)) return;
    slots.pop();
    saveFixedSlots(slots);
    renderModuleView();
    refreshAll();
  });

  // ONCALL 設定儲存
  ['oncall-weekday', 'oncall-saturday', 'oncall-sunday'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('blur', () => {
      const config = {
        weekday: document.getElementById('oncall-weekday').value.split(',').map(s => s.trim()).filter(Boolean),
        saturday: document.getElementById('oncall-saturday').value.split(',').map(s => s.trim()).filter(Boolean),
        sunday: document.getElementById('oncall-sunday').value.split(',').map(s => s.trim()).filter(Boolean),
      };
      saveOncallConfig(config);
      refreshAll();
    });
  });
}

// 將 "YYYY-MM-DD" 字串解析為本地時間午夜（避免 UTC 偏移造成日期錯誤）
function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// 套用模組到當月班表
function applyModuleToSchedule() {
  applyModuleToRange(false);
}

// 套用模組到指定日期範圍（跨月）
function applyModuleToRange(isFullRange) {
  const roster = getSavedRoster();
  const startDate = parseLocalDate(getSavedStartDate());
  const endDate = parseLocalDate(getSavedEndDate());
  const startOffset = getSavedStartOffset() - 1; // 轉為 0-based
  const mod = loadModule();

  // 預先算出「輪轉第0週」的週一
  const startDow = startDate.getDay();
  const startMondayOffset = startDow === 0 ? 1 : 1 - startDow;
  const startMonday = new Date(startDate);
  startMonday.setDate(startMonday.getDate() + startMondayOffset);

  // 決定要處理的月份範圍
  let monthsToProcess;
  if (isFullRange) {
    // 跨月：收集 startDate 到 endDate 之間所有月份
    monthsToProcess = [];
    let y = startDate.getFullYear();
    let m = startDate.getMonth(); // 0-based
    const endY = endDate.getFullYear();
    const endM = endDate.getMonth();
    while (y < endY || (y === endY && m <= endM)) {
      monthsToProcess.push({ adYear: y, month: m + 1 }); // month 1-based
      m++;
      if (m > 11) { m = 0; y++; }
    }
  } else {
    // 只處理當前月份
    monthsToProcess = [{ adYear: getADYear(), month: currentMonth }];
  }

  // 對每個月份套用模組
  monthsToProcess.forEach(({ adYear, month }) => {
    const key = `${adYear}-${String(month).padStart(2, '0')}`;
    const dim = new Date(adYear, month, 0).getDate(); // 該月天數
    const schedule = allSchedules[key] ? [...allSchedules[key]] : Array.from({ length: dim }, () => ({}));
    while (schedule.length < dim) schedule.push({});

    for (let d = 1; d <= dim; d++) {
      const thisDate = new Date(adYear, month - 1, d);
      if (thisDate < startDate || thisDate > endDate) continue;

      const dow = thisDate.getDay();
      const dayIdx = dow === 0 ? 6 : dow - 1;

      // 找到這天所在那週的週一
      const mondayOff = dow === 0 ? -6 : 1 - dow;
      const thisMonday = new Date(thisDate);
      thisMonday.setDate(thisMonday.getDate() + mondayOff);

      // 週數差 + 起始人員偏移
      const weekDiff = Math.round((thisMonday - startMonday) / (7 * 86400000));
      const weekOffset = (((weekDiff + startOffset) % mod.cycleLength) + mod.cycleLength) % mod.cycleLength;

      const weekData = generateWeekFromModule(roster, weekOffset);
      schedule[d - 1] = weekData[dayIdx] || {};
    }

    allSchedules[key] = schedule;
    if (!allEdits[key]) allEdits[key] = new Set();
  });

  saveSchedule();
}
