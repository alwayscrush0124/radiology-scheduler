function renderReportView() {
  renderDutyRoster();
  renderStatistics();
  renderSignSheet();
}

// ========== 值班表（印）==========
function renderDutyRoster() {
  const container = document.getElementById('report-duty');
  container.innerHTML = '';
  const daysInMonth = getDaysInMonth();
  const scheduleData = getScheduleData();
  const adYear = getADYear();

  const wrap = document.createElement('div');
  wrap.className = 'report-wrap';

  wrap.innerHTML = `
    <div class="toolbar no-print">
      <button class="btn btn-primary" onclick="exportReport('duty','pdf')">輸出 PDF</button>
      <button class="btn btn-secondary" onclick="exportReport('duty','xlsx')">輸出 XLSX</button>
      <button class="btn btn-secondary" onclick="exportReport('duty','csv')">輸出 CSV</button>
    </div>
  `;

  const table = document.createElement('table');
  table.className = 'report-table duty-table';
  table.id = 'duty-export-table';

  let html = '';
  // 標題行 (合併)
  html += `<thead>
    <tr><td></td><td colspan="5" class="report-title-cell">新竹台大分院生醫院竹北院區影像醫學部</td></tr>
    <tr><td></td><td colspan="5" class="report-title-cell">${adYear}  年  ${currentMonth} 月  值 班 表</td></tr>
    <tr>
      <th style="width:35px"></th>
      <th>白班<br>(08:00~16:30)</th>
      <th>小小夜<br>(12:30-21:00)</th>
      <th>小夜<br>(15:30~24:00)</th>
      <th>小夜二線<br>(15:30~24:00)</th>
      <th>大夜<br>(23:30~08:00)</th>
    </tr>
  </thead><tbody>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const dayData = scheduleData[d - 1];
    const get = (pos) => dayData[pos] ? getFullName(dayData[pos]) : '';
    html += `<tr>
      <td style="font-weight:600;text-align:center">${d}</td>
      <td>${get('Portable')}</td>
      <td>${get('13-21')}</td>
      <td>${get('小')}</td>
      <td>${get('小二線')}</td>
      <td>${get('大')}</td>
    </tr>`;
  }

  html += '</tbody>';
  table.innerHTML = html;
  wrap.appendChild(table);
  container.appendChild(wrap);
}

// ========== 統計明細表（印）==========
function renderStatistics() {
  const container = document.getElementById('report-stats');
  container.innerHTML = '';
  const stats = computeNightStats();

  const wrap = document.createElement('div');
  wrap.className = 'report-wrap';

  wrap.innerHTML = `
    <div class="toolbar no-print">
      <button class="btn btn-primary" onclick="exportReport('stats','pdf')">輸出 PDF</button>
      <button class="btn btn-secondary" onclick="exportReport('stats','xlsx')">輸出 XLSX</button>
      <button class="btn btn-secondary" onclick="exportReport('stats','csv')">輸出 CSV</button>
    </div>
  `;

  const table = document.createElement('table');
  table.className = 'report-table stats-table';
  table.id = 'stats-export-table';

  let html = `<thead>
    <tr><td colspan="10" class="report-title-cell">生醫醫院 影像醫學部  ${currentYear} 年 ${currentMonth} 月</td></tr>
    <tr><td colspan="10" class="report-title-cell report-title-main">三班制人員大小夜、小小夜績效點數統計明細表</td></tr>
    <tr>
      <th>序號</th><th>姓名</th><th>員工編號</th>
      <th>大夜<br>(次數)</th><th>小夜<br>(次數)</th><th>小小夜<br>(次數)</th>
      <th>小小夜<br>績效</th>
      <th>申報<br>大夜</th><th>申報<br>小夜<br>(小夜+小小夜)</th>
      <th>證明文件</th>
    </tr>
  </thead><tbody>`;

  let totalBig = 0, totalSmall = 0, totalMini = 0;
  let seq = 0;

  stats.forEach(s => {
    if (s.big === 0 && s.small === 0 && s.mini === 0) return;
    seq++;
    totalBig += s.big;
    totalSmall += s.small;
    totalMini += s.mini;

    const miniPerf = (s.mini * 0.5).toFixed(1);
    const reportBig = (s.big * 1.07).toFixed(2);
    const reportSmall = (s.small * 0.99 + s.mini * 0.5).toFixed(2);

    html += `<tr>
      <td>${seq}</td><td>${s.name}</td><td>${s.id}</td>
      <td class="num-col">${s.big || ''}</td>
      <td class="num-col">${s.small || ''}</td>
      <td class="num-col">${s.mini || ''}</td>
      <td class="num-col">${s.mini > 0 ? miniPerf : ''}</td>
      <td class="num-col">${s.big > 0 ? reportBig : '0.00'}</td>
      <td class="num-col">${reportSmall}</td>
      <td>簽名單、值班表</td>
    </tr>`;
  });

  // 空行填到 18 行
  for (let i = seq + 1; i <= 18; i++) {
    html += `<tr><td>${i}</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td>簽名單、值班表</td></tr>`;
  }

  html += `<tr class="total-row">
    <td colspan="3"></td>
    <td class="num-col">${totalBig}</td>
    <td class="num-col">${totalSmall}</td>
    <td class="num-col">${totalMini}</td>
    <td colspan="4"></td>
  </tr>`;

  html += '</tbody>';
  table.innerHTML = html;
  wrap.appendChild(table);

  const footer = document.createElement('div');
  footer.className = 'report-footer';
  footer.innerHTML = `
    <p>備註：</p>
    <p>1.Portal申請大夜點值:班數*1.07</p>
    <p>2.Portal申請小夜點值:班數*0.99</p>
    <p>3.Portal申請小小夜點值:班數*0.5  (登錄於小夜欄位)</p>
    <div class="report-signature">
      <span>填表人：＿＿＿＿＿＿＿＿＿＿＿＿</span>
      <span>單位主管：＿＿＿＿＿＿＿＿＿＿＿＿</span>
    </div>
  `;
  wrap.appendChild(footer);
  container.appendChild(wrap);
}

// ========== 簽名單（印）==========
function renderSignSheet() {
  const container = document.getElementById('report-sign');
  container.innerHTML = '';
  const stats = computeNightStats();

  const wrap = document.createElement('div');
  wrap.className = 'report-wrap';

  wrap.innerHTML = `
    <div class="toolbar no-print">
      <button class="btn btn-primary" onclick="exportReport('sign','pdf')">輸出 PDF</button>
      <button class="btn btn-secondary" onclick="exportReport('sign','xlsx')">輸出 XLSX</button>
      <button class="btn btn-secondary" onclick="exportReport('sign','csv')">輸出 CSV</button>
    </div>
  `;

  const table = document.createElement('table');
  table.className = 'report-table sign-table';
  table.id = 'sign-export-table';

  let html = `<thead>
    <tr><td colspan="8" class="report-title-cell">生醫醫院 影像醫學部  ${currentYear} 年 ${currentMonth} 月</td></tr>
    <tr><td colspan="8" class="report-title-cell report-title-main">三班制人員大小夜出席次數統計表</td></tr>
    <tr>
      <th>序號</th><th>姓名</th><th>員工編號</th>
      <th>大夜<br>(次數)</th><th>小夜<br>(次數)</th><th>小小夜<br>(次數)</th>
      <th>簽名</th><th>備註</th>
    </tr>
  </thead><tbody>`;

  let totalBig = 0, totalSmall = 0, totalMini = 0;
  let seq = 0;

  stats.forEach(s => {
    if (s.big === 0 && s.small === 0 && s.mini === 0) return;
    seq++;
    totalBig += s.big;
    totalSmall += s.small;
    totalMini += s.mini;
    html += `<tr>
      <td>${seq}</td><td>${s.name}</td><td>${s.id}</td>
      <td class="num-col">${s.big || ''}</td>
      <td class="num-col">${s.small || ''}</td>
      <td class="num-col">${s.mini || ''}</td>
      <td class="sign-cell"></td><td></td>
    </tr>`;
  });

  // 空行填到 17
  for (let i = seq + 1; i <= 17; i++) {
    html += `<tr><td>${i}</td><td></td><td></td><td></td><td></td><td></td><td class="sign-cell"></td><td></td></tr>`;
  }

  html += `<tr class="total-row">
    <td colspan="3"></td>
    <td class="num-col">${totalBig}</td>
    <td class="num-col">${totalSmall}</td>
    <td class="num-col">${totalMini}</td>
    <td colspan="2"></td>
  </tr>`;
  html += '</tbody>';

  table.innerHTML = html;
  wrap.appendChild(table);

  const footer = document.createElement('div');
  footer.className = 'report-footer';
  footer.innerHTML = `
    <p>註：晚間夜班費三班制申請時段及注意事項</p>
    <p>1.大夜為 24:00~08:00</p>
    <p>2.小夜15:00~23:00;16:00~24:00</p>
    <p>3.小小夜15:00~24:00此時段上班時數 大於4小時,小於10小時</p>
    <p>4.不申請加班費情形下經院方同意，得依申請大小夜紅利</p>
    <p style="margin-top:8px">註：颱風上班當日若遇新竹縣市政府發佈停班停課經院方公告"出勤時段得依一般加班程序申請時"。符合當日大小夜津貼上班時段之申請同仁，加班申請或大小夜津貼申請，請擇一申請。</p>
    <div class="report-signature">
      <span>填表人：＿＿＿＿＿＿＿＿＿＿＿＿</span>
      <span>單位主管：＿＿＿＿＿＿＿＿＿＿＿＿</span>
    </div>
  `;
  wrap.appendChild(footer);
  container.appendChild(wrap);
}

function computeNightStats() {
  const daysInMonth = getDaysInMonth();
  const scheduleData = getScheduleData();
  const stats = {};
  STAFF.forEach(s => {
    stats[s.nick] = { nick: s.nick, name: s.name, id: s.id, big: 0, small: 0, mini: 0 };
  });

  for (let d = 1; d <= daysInMonth; d++) {
    const dayData = scheduleData[d - 1];
    if (dayData['大'] && stats[dayData['大']]) stats[dayData['大']].big++;
    if (dayData['小'] && stats[dayData['小']]) stats[dayData['小']].small++;
    if (dayData['小二線'] && stats[dayData['小二線']]) stats[dayData['小二線']].small++;
    if (dayData['13-21'] && stats[dayData['13-21']]) stats[dayData['13-21']].mini++;
  }

  return Object.values(stats);
}

// ========== 匯出功能 ==========
function exportReport(type, format) {
  const names = { duty: '值班表', stats: '統計明細表', sign: '簽名單' };
  const fileName = `${names[type]}_${currentYear}年${currentMonth}月`;

  if (format === 'pdf') {
    exportPDF(type);
  } else if (format === 'xlsx') {
    exportXLSX(type, fileName);
  } else if (format === 'csv') {
    exportCSV(type, fileName);
  }
}

// PDF: 使用瀏覽器列印功能
function exportPDF(reportId) {
  document.querySelectorAll('.printing').forEach(el => el.classList.remove('printing'));
  document.getElementById('stats-parent').classList.add('printing');
  document.getElementById('report').classList.add('printing');
  document.getElementById('report-' + reportId).classList.add('printing');
  window.print();
  setTimeout(() => {
    document.querySelectorAll('.printing').forEach(el => el.classList.remove('printing'));
  }, 100);
}

// XLSX: 使用 SheetJS
function exportXLSX(type, fileName) {
  const tableId = type + '-export-table';
  const table = document.getElementById(tableId);
  if (!table || typeof XLSX === 'undefined') {
    alert('無法匯出 XLSX，請確認網路連線正常。');
    return;
  }
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(table, { raw: true });

  // 設定欄寬
  const colCount = table.querySelector('tr').children.length;
  const wscols = [];
  for (let i = 0; i < colCount; i++) wscols.push({ wch: 12 });
  ws['!cols'] = wscols;

  XLSX.utils.book_append_sheet(wb, ws, fileName.substring(0, 31));
  XLSX.writeFile(wb, fileName + '.xlsx');
}

// CSV
function exportCSV(type, fileName) {
  const tableId = type + '-export-table';
  const table = document.getElementById(tableId);
  if (!table) return;

  let csv = '\uFEFF'; // BOM for Excel
  const rows = table.querySelectorAll('tr');
  rows.forEach(row => {
    const cells = [];
    row.querySelectorAll('th, td').forEach(cell => {
      let text = cell.textContent.replace(/"/g, '""').replace(/\n/g, ' ');
      cells.push(`"${text}"`);
    });
    csv += cells.join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}
