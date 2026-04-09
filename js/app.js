document.addEventListener('DOMContentLoaded', () => {
  // 初始化年月選擇器
  initMonthSelector();

  // 載入資料
  loadSchedule();
  loadModule();

  // 主 Tab 切換
  document.querySelectorAll('#tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#tabs .tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });

  // 統計報表子 Tab
  document.querySelectorAll('.sub-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.sub-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.subtab).classList.add('active');
    });
  });

  // 夜班報表子子 Tab
  document.querySelectorAll('.report-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.report-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.report-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('report-' + tab.dataset.report).classList.add('active');
    });
  });

  // Modal 外部點擊關閉
  document.getElementById('edit-modal').addEventListener('click', (e) => {
    if (e.target.id === 'edit-modal') e.target.classList.add('hidden');
  });
  document.getElementById('oncall-modal').addEventListener('click', (e) => {
    if (e.target.id === 'oncall-modal') e.target.classList.add('hidden');
  });

  // 設定副標題
  document.querySelector('.subtitle').textContent =
    `新竹台大分院生醫院竹北院區 · ${currentYear}年${currentMonth}月`;

  // 渲染
  refreshAll();
  renderModuleView();
  renderAnnualLeaveView();
});

function initMonthSelector() {
  const selYear = document.getElementById('sel-year');
  const selMonth = document.getElementById('sel-month');

  // 民國年 110~120
  for (let y = 110; y <= 120; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    if (y === currentYear) opt.selected = true;
    selYear.appendChild(opt);
  }

  for (let m = 1; m <= 12; m++) {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    if (m === currentMonth) opt.selected = true;
    selMonth.appendChild(opt);
  }

  selYear.addEventListener('change', () => {
    currentYear = parseInt(selYear.value);
    onMonthChange();
  });
  selMonth.addEventListener('change', () => {
    currentMonth = parseInt(selMonth.value);
    onMonthChange();
  });
}

function onMonthChange() {
  document.querySelector('.subtitle').textContent =
    `新竹台大分院生醫院竹北院區 · ${currentYear}年${currentMonth}月`;
  loadSchedule();
  refreshAll();
  renderModuleView();
  renderAnnualLeaveView();
}

function refreshAll() {
  syncAnnualLeaveToSchedule();
  renderWeeklyView();
  renderHorizontalView();
  renderUploadView();
  renderReportView();
}
