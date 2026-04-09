function renderHorizontalView() {
  const container = document.getElementById('horizontal');
  container.innerHTML = '';

  const daysInMonth = getDaysInMonth();
  const positions = getPositions();
  const fixedSlots = getSavedFixedSlots();
  const scheduleData = getScheduleData();

  container.innerHTML += '<h2 class="section-title">位置</h2>';
  container.appendChild(buildPositionTable(daysInMonth, positions, fixedSlots, scheduleData));

  container.innerHTML += '<h2 class="section-title">個人班別</h2>';
  container.appendChild(buildPersonTable(daysInMonth, positions, fixedSlots, scheduleData));
}

function buildPositionTable(daysInMonth, positions, fixedSlots, scheduleData) {
  const wrap = document.createElement('div');
  wrap.className = 'h-table-wrap';
  const table = document.createElement('table');
  table.className = 'h-table';

  let headHtml = '<thead><tr><th class="row-label">位置</th>';
  for (let d = 1; d <= daysInMonth; d++) {
    const isWe = isWeekend(d);
    headHtml += `<th class="${isWe ? 'weekend' : ''}">${d}<br>${DOW_NAMES[getDow(d)]}</th>`;
  }
  headHtml += '</tr></thead>';

  let bodyHtml = '<tbody>';
  positions.forEach(pos => {
    bodyHtml += `<tr><td class="row-label">${pos}</td>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const isWe = isWeekend(d);
      const person = scheduleData[d - 1][pos] || '';
      bodyHtml += `<td class="${isWe ? 'weekend' : ''}">${person}</td>`;
    }
    bodyHtml += '</tr>';
  });

  // 固定列
  fixedSlots.forEach(slot => {
    bodyHtml += `<tr><td class="row-label" style="color:#2b6cb0;">${slot.name}</td>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const isWe = isWeekend(d);
      const dow = getDow(d);
      let person = '';
      if (slot.person) {
        if (slot.weekdays && dow >= 1 && dow <= 5) person = slot.person;
        else if (!slot.weekdays) person = slot.person;
      }
      bodyHtml += `<td class="${isWe ? 'weekend' : ''}">${person}</td>`;
    }
    bodyHtml += '</tr>';
  });

  // ONCALL 列
  bodyHtml += `<tr><td class="row-label" style="color:#553c9a;font-weight:700;">ONCALL</td>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const isWe = isWeekend(d);
    const people = getOncallForDay(d, scheduleData);
    bodyHtml += `<td class="${isWe ? 'weekend' : ''}" style="font-size:11px;">${people.join(',')}</td>`;
  }
  bodyHtml += '</tr>';

  bodyHtml += '</tbody>';

  table.innerHTML = headHtml + bodyHtml;
  wrap.appendChild(table);
  return wrap;
}

function buildPersonTable(daysInMonth, positions, fixedSlots, scheduleData) {
  const wrap = document.createElement('div');
  wrap.className = 'h-table-wrap';
  const table = document.createElement('table');
  table.className = 'h-table';

  let headHtml = '<thead><tr><th class="row-label">人員</th>';
  for (let d = 1; d <= daysInMonth; d++) {
    const isWe = isWeekend(d);
    headHtml += `<th class="${isWe ? 'weekend' : ''}">${d}<br>${DOW_NAMES[getDow(d)]}</th>`;
  }
  headHtml += '<th>合計</th></tr></thead>';

  let bodyHtml = '<tbody>';
  STAFF.forEach(staff => {
    bodyHtml += `<tr><td class="row-label">${staff.nick} ${staff.name}</td>`;
    let total = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const isWe = isWeekend(d);
      const dayData = scheduleData[d - 1];
      const dow = getDow(d);
      let found = '';

      // 工作位置
      for (const [pos, nick] of Object.entries(dayData)) {
        if (nick === staff.nick && positions.includes(pos)) { found = pos; break; }
      }

      // 固定列
      if (!found) {
        for (const slot of fixedSlots) {
          if (slot.person === staff.nick) {
            if (slot.weekdays && dow >= 1 && dow <= 5) { found = slot.name; break; }
            else if (!slot.weekdays) { found = slot.name; break; }
          }
        }
      }

      if (found) total++;
      const display = found ? getPositionShort(found) : '';
      const cls = isWe ? 'weekend' : '';
      const style = found ? `style="background:${getPositionColor(found)}"` : '';
      bodyHtml += `<td class="${cls}" ${style}>${display}</td>`;
    }
    bodyHtml += `<td style="font-weight:600">${total}</td></tr>`;
  });
  bodyHtml += '</tbody>';

  table.innerHTML = headHtml + bodyHtml;
  wrap.appendChild(table);
  return wrap;
}

function getPositionShort(pos) {
  const map = {
    'MRI':'MRI','CT':'CT','ER':'ER','Portable':'P',
    '3rd X光':'X','MAMMO':'MA','OPD2/BMD':'OPD',
    'ER CT':'EC','小':'小','小二線':'小2',
    '大':'大','13-21':'21','代1':'代','代2':'代2',
    '血管1':'血1','血管2':'血2',
  };
  return map[pos] || pos;
}

function getPositionColor(pos) {
  const map = {
    '小':'#fff3e0','小二線':'#fff8e1','大':'#f3e5f5','13-21':'#fffde7',
    '血管1':'#ebf4ff','血管2':'#ebf4ff',
  };
  return map[pos] || '';
}
