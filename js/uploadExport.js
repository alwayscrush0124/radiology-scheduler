function renderUploadView() {
  const container = document.getElementById('upload');
  container.innerHTML = '';

  const daysInMonth = getDaysInMonth();
  const scheduleData = getScheduleData();

  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';
  toolbar.innerHTML = `
    <button class="btn btn-primary" id="download-csv">下載 CSV</button>
    <button class="btn btn-secondary" id="reset-btn">重置為初始資料</button>
  `;
  container.appendChild(toolbar);

  const uploadData = computeUploadCodes(daysInMonth, scheduleData);

  const wrap = document.createElement('div');
  wrap.className = 'h-table-wrap';
  const table = document.createElement('table');
  table.className = 'upload-table';

  let headHtml = '<thead><tr><th>暱稱</th><th>員編</th><th>姓名</th>';
  for (let d = 1; d <= daysInMonth; d++) headHtml += `<th>${d}</th>`;
  headHtml += '</tr></thead>';

  let bodyHtml = '<tbody>';
  uploadData.rows.forEach(row => {
    bodyHtml += `<tr><td>${row.nick}</td><td>${row.id}</td><td>${row.name}</td>`;
    row.codes.forEach(code => {
      bodyHtml += `<td class="code-${code}">${code}</td>`;
    });
    bodyHtml += '</tr>';
  });

  bodyHtml += `<tr><td colspan="${daysInMonth + 3}" style="height:8px;background:#edf2f7;border:none;"></td></tr>`;

  const codeLabels = {0:'休假(0)',1:'白班(1)',221:'特殊(221)',262:'大夜(262)',273:'13-21(273)',278:'小夜(278)'};
  [0,1,221,262,273,278].forEach(code => {
    bodyHtml += `<tr><td colspan="3" class="code-${code}">${codeLabels[code]}</td>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const count = uploadData.totals[d - 1][code] || 0;
      bodyHtml += `<td class="code-${code}">${count}</td>`;
    }
    bodyHtml += '</tr>';
  });

  bodyHtml += '<tr style="font-weight:600"><td colspan="3">總數</td>';
  for (let d = 1; d <= daysInMonth; d++) {
    const total = Object.values(uploadData.totals[d - 1]).reduce((a, b) => a + b, 0);
    bodyHtml += `<td>${total}</td>`;
  }
  bodyHtml += '</tr></tbody>';

  table.innerHTML = headHtml + bodyHtml;
  wrap.appendChild(table);
  container.appendChild(wrap);

  document.getElementById('download-csv').addEventListener('click', () => downloadCSV(uploadData));
  document.getElementById('reset-btn').addEventListener('click', () => {
    if (confirm('確定要重置為初始資料？所有修改將遺失。')) {
      resetSchedule();
      refreshAll();
    }
  });
}

function computeUploadCodes(daysInMonth, scheduleData) {
  const rows = [];
  const totals = [];
  const fixedSlots = getSavedFixedSlots();
  for (let d = 0; d < daysInMonth; d++) totals.push({});

  STAFF.forEach(staff => {
    const codes = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayData = scheduleData[d - 1];
      const dow = getDow(d);
      let code = 0;
      // 工作位置
      for (const [pos, nick] of Object.entries(dayData)) {
        if (nick === staff.nick) { code = SHIFT_CODES[pos] || 1; break; }
      }
      // 固定列（白班代碼1）
      if (code === 0) {
        for (const slot of fixedSlots) {
          if (slot.person === staff.nick) {
            if (slot.weekdays && dow >= 1 && dow <= 5) { code = 1; break; }
            else if (!slot.weekdays) { code = 1; break; }
          }
        }
      }
      codes.push(code);
      totals[d - 1][code] = (totals[d - 1][code] || 0) + 1;
    }
    rows.push({ nick: staff.nick, id: staff.id, name: staff.name, codes });
  });

  return { rows, totals };
}

function downloadCSV(uploadData) {
  const daysInMonth = getDaysInMonth();
  let csv = '\uFEFF';
  csv += '暱稱,員編,姓名';
  for (let d = 1; d <= daysInMonth; d++) csv += `,${currentMonth}/${d}`;
  csv += '\n';
  uploadData.rows.forEach(row => {
    csv += `${row.nick},${row.id},${row.name},${row.codes.join(',')}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `班表上傳_${currentYear}年${currentMonth}月.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
