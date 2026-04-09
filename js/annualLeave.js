let alViewYear = null; // 年度預假表目前顯示的民國年

function renderAnnualLeaveView() {
  const container = document.getElementById('annual-leave');
  container.innerHTML = '';

  if (alViewYear === null) alViewYear = currentYear;
  const adYear = alViewYear + 1911;
  const leaveSlots = getLeaveSlots();
  const leaveNames = [];
  for (let i = 1; i <= leaveSlots; i++) leaveNames.push('休假' + i);

  // 標題 + 年度切換
  const titleDiv = document.createElement('div');
  titleDiv.style.cssText = 'display:flex;align-items:center;gap:12px;margin-bottom:12px;';
  titleDiv.innerHTML = `
    <button class="btn btn-secondary" id="al-prev-year" style="padding:4px 12px;">◀</button>
    <h2 class="section-title" style="margin:0;">${alViewYear} 年度預假表（西元 ${adYear}）</h2>
    <button class="btn btn-secondary" id="al-next-year" style="padding:4px 12px;">▶</button>
  `;
  container.appendChild(titleDiv);

  // 12個月
  for (let m = 1; m <= 12; m++) {
    const block = buildMonthLeaveBlock(adYear, m, leaveNames);
    container.appendChild(block);
  }

  // 綁定事件
  bindAnnualLeaveEvents(leaveNames);

  // 年度切換
  document.getElementById('al-prev-year').addEventListener('click', () => {
    alViewYear--;
    renderAnnualLeaveView();
  });
  document.getElementById('al-next-year').addEventListener('click', () => {
    alViewYear++;
    renderAnnualLeaveView();
  });
}

function buildMonthLeaveBlock(adYear, month, leaveNames) {
  const block = document.createElement('div');
  block.className = 'al-month-block';

  const daysInMonth = new Date(adYear, month, 0).getDate();

  // 算出每天的星期
  const dayInfos = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(adYear, month - 1, d);
    dayInfos.push({ day: d, dow: dt.getDay() });
  }

  // 找出週數標記 (從該月第一天所屬的 ISO 週開始)
  const weekNums = [];
  let lastWeek = -1;
  dayInfos.forEach(di => {
    const wn = getISOWeekNum(adYear, month, di.day);
    if (wn !== lastWeek) {
      weekNums.push({ day: di.day, week: wn });
      lastWeek = wn;
    }
  });

  const table = document.createElement('table');
  table.className = 'al-table';

  // Row 1: 週數 + 日期
  let html = '<tbody>';

  // 日期列
  html += `<tr><td class="al-month-label" rowspan="${leaveNames.length + 2}">${month}月</td>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const isWe = dayInfos[d - 1].dow === 0 || dayInfos[d - 1].dow === 6;
    html += `<td class="al-date ${isWe ? 'al-weekend' : ''}">${month}/${d}</td>`;
  }
  html += '</tr>';

  // 星期列
  const dowShort = ['日', '一', '二', '三', '四', '五', '六'];
  html += '<tr>';
  for (let d = 1; d <= daysInMonth; d++) {
    const di = dayInfos[d - 1];
    const isWe = di.dow === 0 || di.dow === 6;
    html += `<td class="al-dow ${isWe ? 'al-weekend' : ''}">週${dowShort[di.dow]}</td>`;
  }
  html += '</tr>';

  // 休假列
  const alData = annualLeaveData[String(adYear)] || {};
  leaveNames.forEach(slot => {
    const shortLabel = slot.replace('休假', '休');
    html += `<tr>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const isWe = dayInfos[d - 1].dow === 0 || dayInfos[d - 1].dow === 6;
      const dateKey = `${month}-${d}`;
      const person = (alData[dateKey] && alData[dateKey][slot]) || '';
      html += `<td class="al-cell ${isWe ? 'al-weekend' : ''} al-editable" data-month="${month}" data-day="${d}" data-slot="${slot}">${person}</td>`;
    }
    html += '</tr>';
  });

  html += '</tbody>';
  table.innerHTML = html;
  block.appendChild(table);
  return block;
}

function getISOWeekNum(year, month, day) {
  const dt = new Date(year, month - 1, day);
  dt.setDate(dt.getDate() + 3 - (dt.getDay() + 6) % 7);
  const yearStart = new Date(dt.getFullYear(), 0, 4);
  return Math.ceil((((dt - yearStart) / 86400000) + 1) / 7);
}

function bindAnnualLeaveEvents(leaveNames) {
  document.querySelectorAll('.al-editable').forEach(td => {
    td.addEventListener('click', function () {
      const month = parseInt(this.dataset.month);
      const day = parseInt(this.dataset.day);
      const slot = this.dataset.slot;
      openAnnualLeaveModal(month, day, slot, this);
    });
  });
}

function openAnnualLeaveModal(month, day, slot, cellEl) {
  const modal = document.getElementById('edit-modal');
  const select = document.getElementById('modal-select');
  const title = document.getElementById('modal-title');
  const info = document.getElementById('modal-info');

  const adYear = alViewYear + 1911;
  const dt = new Date(adYear, month - 1, day);
  const dowName = DOW_NAMES[dt.getDay()];
  const alData = annualLeaveData[String(adYear)] || {};
  const dateKey = `${month}-${day}`;
  const current = (alData[dateKey] && alData[dateKey][slot]) || '';

  title.textContent = `預假 ${month}/${day} (${dowName})`;
  info.textContent = `${slot}　目前：${current || '(空)'}`;

  select.innerHTML = '<option value="">(空)</option>';
  STAFF.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.nick;
    opt.textContent = `${s.nick} - ${s.name}`;
    if (s.nick === current) opt.selected = true;
    select.appendChild(opt);
  });

  modal.classList.remove('hidden');

  document.getElementById('modal-save').onclick = () => {
    setAnnualLeave(adYear, month, day, slot, select.value);
    modal.classList.add('hidden');
    // 如果是當前年度，同步到班表
    if (adYear === getADYear()) {
      syncAnnualLeaveToSchedule();
      saveSchedule();
    }
    renderAnnualLeaveView();
    refreshAll();
  };

  document.getElementById('modal-clear').onclick = () => {
    setAnnualLeave(adYear, month, day, slot, '');
    modal.classList.add('hidden');
    renderAnnualLeaveView();
    // refreshAll 會透過 syncAnnualLeaveToSchedule 自動清除班表中的對應資料
    if (adYear === getADYear()) {
      // 需要切到對應月份同步，或直接清除當月
      if (currentMonth === month) {
        const scheduleData = getScheduleData();
        if (scheduleData[day - 1]) {
          delete scheduleData[day - 1][slot];
          saveSchedule();
        }
      }
    }
    refreshAll();
  };

  document.getElementById('modal-cancel').onclick = () => modal.classList.add('hidden');
  document.getElementById('modal-close').onclick = () => modal.classList.add('hidden');
}
