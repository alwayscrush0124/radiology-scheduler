// 取得其他月份的班表資料（用於跨月週顯示）
function getOtherMonthScheduleData(otherMonth) {
  // 計算該月的西元年
  let adYear = getADYear();
  if (otherMonth > currentMonth && otherMonth === 12 && currentMonth === 1) {
    adYear -= 1; // 一月看上個月十二月 → 去年
  } else if (otherMonth < currentMonth && otherMonth === 1 && currentMonth === 12) {
    adYear += 1; // 十二月看下個月一月 → 明年
  } else if (otherMonth < currentMonth) {
    // 可能是上個月，同年
  } else if (otherMonth > currentMonth) {
    // 可能是下個月，同年
  }
  const key = `${adYear}-${String(otherMonth).padStart(2, '0')}`;
  return allSchedules[key] || [];
}

function renderWeeklyView() {
  const container = document.getElementById('weekly');
  container.innerHTML = '';

  const positions = getPositions();
  const leavePositions = getLeavePositions();
  const fixedSlots = getSavedFixedSlots();
  const scheduleData = getScheduleData();
  const weeks = getWeeksOfMonth();

  // 同步固定列資料到班表
  syncFixedSlotsToSchedule(scheduleData, fixedSlots);

  weeks.forEach((week, wi) => {
    const block = document.createElement('div');
    block.className = 'week-block';

    const header = document.createElement('div');
    header.className = 'week-header';
    const sM = week.startMonth || currentMonth;
    const eM = week.endMonth || currentMonth;
    const startLabel = sM === currentMonth ? `${currentMonth}/${week.start}` : `${sM}/${week.start}`;
    const endD = Math.min(week.end, week.endMonth === currentMonth ? getDaysInMonth() : week.end);
    const endLabel = eM === currentMonth ? `${currentMonth}/${endD}` : `${eM}/${endD}`;
    header.innerHTML = `<span>第 ${wi + 1} 週：${startLabel} ~ ${endLabel}</span>`;
    block.appendChild(header);

    const table = document.createElement('table');
    table.className = 'week-table';

    // 表頭
    const thead = document.createElement('thead');
    let headerRow = '<tr><th class="pos-col">位置</th>';
    week.days.forEach(dayInfo => {
      const isWe = dayInfo.dow === 0 || dayInfo.dow === 6;
      const cls = isWe ? 'weekend-col' : '';
      const otherMonth = dayInfo.month !== currentMonth ? ' style="color:#aaa"' : '';
      headerRow += `<th class="${cls}"${otherMonth}>${dayInfo.day}<br>${DOW_NAMES[dayInfo.dow]}</th>`;
    });
    headerRow += '</tr>';
    thead.innerHTML = headerRow;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    // 計算每天重複人員（用於防呆）
    const dayDuplicates = {};
    week.days.forEach(dayInfo => {
      if (dayInfo.month !== currentMonth) return;
      dayDuplicates[dayInfo.day] = findDuplicates(dayInfo.day, scheduleData, positions, fixedSlots);
    });

    // 工作位置列
    positions.forEach(pos => {
      const tr = document.createElement('tr');
      const posClass = getPosClass(pos);
      let html = `<td class="pos-col">${pos}</td>`;

      week.days.forEach(dayInfo => {
        const isWe = dayInfo.dow === 0 || dayInfo.dow === 6;
        const isOtherMonth = dayInfo.month !== currentMonth;
        let person = '';
        let dupWarn = '';
        if (!isOtherMonth) {
          const dayData = scheduleData[dayInfo.day - 1];
          person = (dayData && dayData[pos]) || '';
          if (person && dayDuplicates[dayInfo.day] && dayDuplicates[dayInfo.day].has(person)) {
            dupWarn = `<span class="dup-warn" title="${person} 同一天出現在多個位置">⚠</span>`;
          }
        } else {
          const otherData = getOtherMonthScheduleData(dayInfo.month);
          const dayData = otherData[dayInfo.day - 1];
          person = (dayData && dayData[pos]) || '';
        }
        const edited = !isOtherMonth && isEdited(dayInfo.day, pos);
        const boldStyle = edited ? 'font-weight:700;' : '';
        const otherStyle = isOtherMonth ? 'color:#aaa;background:#f9f9f9;' : '';
        const dupClass = (person && !isOtherMonth && dayDuplicates[dayInfo.day]?.has(person)) ? 'dup-cell' : '';
        const cellClass = `${posClass} ${isWe ? 'weekend-col' : ''} ${isOtherMonth ? '' : 'editable'} ${dupClass}`;
        if (isOtherMonth) {
          html += `<td class="${cellClass}" style="${otherStyle}">${person}</td>`;
        } else {
          html += `<td class="${cellClass}" style="${boldStyle}" data-day="${dayInfo.day}" data-pos="${pos}">${person}${dupWarn}</td>`;
        }
      });
      tr.innerHTML = html;
      tbody.appendChild(tr);
    });

    // 分隔列 - 休假
    if (leavePositions.length > 0) {
      const sepTr = document.createElement('tr');
      sepTr.className = 'leave-separator';
      sepTr.innerHTML = `<td colspan="${week.days.length + 1}" class="leave-sep-cell"></td>`;
      tbody.appendChild(sepTr);
    }

    // 休假列
    leavePositions.forEach(pos => {
      const tr = document.createElement('tr');
      tr.className = 'leave-row';
      let html = `<td class="pos-col leave-pos">${pos}</td>`;

      week.days.forEach(dayInfo => {
        const isWe = dayInfo.dow === 0 || dayInfo.dow === 6;
        const isOtherMonth = dayInfo.month !== currentMonth;
        let person = '';
        let warnHtml = '';
        let typeHtml = '';
        if (!isOtherMonth) {
          const dayData = scheduleData[dayInfo.day - 1];
          person = (dayData && dayData[pos]) || '';
          if (person) {
            const conflict = checkLeaveConflict(dayInfo.day, person, scheduleData);
            if (conflict) {
              warnHtml = `<span class="leave-warn" title="${conflict}">⚠</span>`;
            }
            const lType = getLeaveType(dayInfo.day, pos);
            if (lType) {
              typeHtml = `<br><span class="leave-type-label">${lType}</span>`;
            }
          }
        } else {
          const otherData = getOtherMonthScheduleData(dayInfo.month);
          const dayData = otherData[dayInfo.day - 1];
          person = (dayData && dayData[pos]) || '';
        }
        const edited = !isOtherMonth && isEdited(dayInfo.day, pos);
        const locked = !isOtherMonth && isFromAnnualLeave(dayInfo.day, pos);
        const boldStyle = edited ? 'font-weight:700;' : '';
        const otherStyle = isOtherMonth ? 'color:#aaa;background:#f9f9f9;' : '';
        const lockedClass = locked ? 'al-locked' : '';
        const editableClass = (isOtherMonth || locked) ? '' : 'editable';
        const cellClass = `leave-cell ${isWe ? 'weekend-col' : ''} ${editableClass} ${lockedClass}`;
        const lockIcon = locked ? '<span class="al-lock-icon" title="由年度預假表填入，不可修改">🔒</span>' : '';
        if (isOtherMonth) {
          html += `<td class="${cellClass}" style="${otherStyle}">${person}</td>`;
        } else {
          html += `<td class="${cellClass}" style="${boldStyle}" data-day="${dayInfo.day}" data-pos="${pos}" data-is-leave="1">${person}${typeHtml}${warnHtml}${lockIcon}</td>`;
        }
      });
      tr.innerHTML = html;
      tbody.appendChild(tr);
    });

    // ONCALL 列
    {
      const oncallSep = document.createElement('tr');
      oncallSep.className = 'leave-separator';
      oncallSep.innerHTML = `<td colspan="${week.days.length + 1}" class="leave-sep-cell" style="background:#805ad5;"></td>`;
      tbody.appendChild(oncallSep);

      const oncallTr = document.createElement('tr');
      oncallTr.className = 'oncall-row';
      let oncallHtml = `<td class="pos-col oncall-pos">ONCALL</td>`;
      week.days.forEach(dayInfo => {
        const isWe = dayInfo.dow === 0 || dayInfo.dow === 6;
        const isOtherMonth = dayInfo.month !== currentMonth;
        let people = [];
        let isManual = false;
        if (!isOtherMonth) {
          people = getOncallForDay(dayInfo.day, scheduleData);
          isManual = scheduleData[dayInfo.day - 1]?.['ONCALL'] !== undefined;
        } else {
          const otherData = getOtherMonthScheduleData(dayInfo.month);
          if (otherData.length > 0) {
            people = getOncallForDay(dayInfo.day, otherData);
          }
        }
        const display = people.join(', ');
        const edited = !isOtherMonth && isManual;
        const boldStyle = edited ? 'font-weight:700;' : '';
        const otherStyle = isOtherMonth ? 'color:#aaa;background:#f9f9f9;' : '';
        const cellClass = `oncall-cell ${isWe ? 'weekend-col' : ''} ${isOtherMonth ? '' : 'editable'}`;
        if (isOtherMonth) {
          oncallHtml += `<td class="${cellClass}" style="${otherStyle}">${display}</td>`;
        } else {
          oncallHtml += `<td class="${cellClass}" style="${boldStyle}" data-day="${dayInfo.day}" data-pos="ONCALL" data-is-oncall="1">${display}</td>`;
        }
      });
      oncallTr.innerHTML = oncallHtml;
      tbody.appendChild(oncallTr);
    }

    // 分隔列 - 固定列（血管）
    if (fixedSlots.length > 0) {
      const sepTr = document.createElement('tr');
      sepTr.className = 'leave-separator';
      sepTr.innerHTML = `<td colspan="${week.days.length + 1}" class="leave-sep-cell" style="background:#a0aec0;"></td>`;
      tbody.appendChild(sepTr);
    }

    // 固定列（血管）- 從 scheduleData 讀取（sync 已寫入預設值，手動編輯會覆蓋）
    fixedSlots.forEach(slot => {
      const tr = document.createElement('tr');
      tr.className = 'fixed-row';
      let html = `<td class="pos-col fixed-pos">${slot.name}</td>`;

      week.days.forEach(dayInfo => {
        const isWe = dayInfo.dow === 0 || dayInfo.dow === 6;
        const isOtherMonth = dayInfo.month !== currentMonth;
        let person = '';
        if (!isOtherMonth) {
          person = (scheduleData[dayInfo.day - 1] && scheduleData[dayInfo.day - 1][slot.name]) || '';
        } else {
          const otherData = getOtherMonthScheduleData(dayInfo.month);
          person = (otherData[dayInfo.day - 1] && otherData[dayInfo.day - 1][slot.name]) || '';
        }
        const edited = !isOtherMonth && isEdited(dayInfo.day, slot.name);
        const boldStyle = edited ? 'font-weight:700;' : '';
        const otherStyle = isOtherMonth ? 'color:#aaa;background:#f9f9f9;' : '';
        const cellClass = `fixed-cell ${isWe ? 'weekend-col' : ''} ${isOtherMonth ? '' : 'editable'}`;
        if (isOtherMonth) {
          html += `<td class="${cellClass}" style="${otherStyle}">${person}</td>`;
        } else {
          html += `<td class="${cellClass}" style="${boldStyle}" data-day="${dayInfo.day}" data-pos="${slot.name}" data-is-fixed="1">${person}</td>`;
        }
      });
      tr.innerHTML = html;
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    block.appendChild(table);
    container.appendChild(block);
  });

  // 綁定編輯事件
  container.querySelectorAll('td.editable').forEach(td => {
    td.addEventListener('click', function () {
      const isLeave = this.dataset.isLeave === '1';
      const isFixed = this.dataset.isFixed === '1';
      const isOncall = this.dataset.isOncall === '1';
      if (isOncall) {
        openOncallModal(parseInt(this.dataset.day), this);
      } else {
        openEditModal(parseInt(this.dataset.day), this.dataset.pos, this, isLeave, isFixed);
      }
    });
  });
}

// 同步固定列到班表（跳過已手動編輯的格子）
function syncFixedSlotsToSchedule(scheduleData, fixedSlots) {
  const daysInMonth = getDaysInMonth();
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = getDow(d);
    fixedSlots.forEach(slot => {
      // 已手動編輯的格子不覆蓋
      if (isEdited(d, slot.name)) return;
      if (slot.person) {
        if (slot.weekdays && dow >= 1 && dow <= 5) {
          scheduleData[d - 1][slot.name] = slot.person;
        } else if (!slot.weekdays) {
          scheduleData[d - 1][slot.name] = slot.person;
        }
      }
    });
  }
}

// 找出某天有重複出現在多個位置的人
function findDuplicates(day, scheduleData, positions, fixedSlots) {
  const dayData = scheduleData[day - 1];
  if (!dayData) return new Set();
  const personCount = {};
  const dow = getDow(day);

  // 工作位置
  positions.forEach(pos => {
    const p = dayData[pos];
    if (p) personCount[p] = (personCount[p] || 0) + 1;
  });

  // 固定列
  fixedSlots.forEach(slot => {
    if (slot.person && (!slot.weekdays || (dow >= 1 && dow <= 5))) {
      personCount[slot.person] = (personCount[slot.person] || 0) + 1;
    }
  });

  const dups = new Set();
  for (const [person, count] of Object.entries(personCount)) {
    if (count > 1) dups.add(person);
  }
  return dups;
}

// 檢查休假衝突
function checkLeaveConflict(day, nick, scheduleData) {
  const dayData = scheduleData[day - 1];
  if (!dayData) return null;
  const positions = getPositions();

  let assignedPos = null;
  for (const pos of positions) {
    if (dayData[pos] === nick) {
      assignedPos = pos;
      break;
    }
  }
  if (!assignedPos) return null;

  const dai1 = dayData['代1'] || '';
  const dai2 = dayData['代2'] || '';
  const hasCover = (dai1 && dai1 !== nick) || (dai2 && dai2 !== nick);

  if (!hasCover) {
    return `${nick} 休假但仍在「${assignedPos}」，且代1/代2 未安排代班人員`;
  }
  return `${nick} 休假，原「${assignedPos}」位置請確認由代班人員接手`;
}

function getWeeksOfMonth() {
  const daysInMonth = getDaysInMonth();
  const weeks = [];

  const firstDow = getFirstDow();
  let mondayDay;
  let mondayMonth;

  if (firstDow === 1) {
    mondayDay = 1;
    mondayMonth = currentMonth;
  } else if (firstDow === 0) {
    mondayDay = getLastMonthDay() - 5;
    mondayMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  } else {
    const daysBack = firstDow - 1;
    const lastMonthDays = getLastMonthDay();
    mondayDay = lastMonthDays - daysBack + 1;
    mondayMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  }

  let currentDay = mondayDay;
  let currentDayMonth = mondayMonth;
  let covered = false;

  while (!covered) {
    const week = { days: [], start: currentDay, startMonth: currentDayMonth };
    for (let i = 0; i < 7; i++) {
      const dow = (1 + i) % 7;
      const actualDow = dow === 0 ? 0 : dow;
      week.days.push({ day: currentDay, month: currentDayMonth, dow: actualDow });

      const maxDay = currentDayMonth === currentMonth ? daysInMonth : getMonthDays(currentDayMonth);
      if (currentDay >= maxDay) {
        currentDay = 1;
        currentDayMonth = currentDayMonth === 12 ? 1 : currentDayMonth + 1;
      } else {
        currentDay++;
      }
    }
    week.end = week.days[6].day;
    week.endMonth = week.days[6].month;
    weeks.push(week);

    if (currentDayMonth !== currentMonth || currentDay > daysInMonth) {
      covered = true;
    }
  }

  return weeks;
}

function getLastMonthDay() {
  const m = currentMonth === 1 ? 12 : currentMonth - 1;
  const y = currentMonth === 1 ? getADYear() - 1 : getADYear();
  return new Date(y, m, 0).getDate();
}

function getMonthDays(month) {
  const y = month >= currentMonth ? getADYear() : getADYear();
  return new Date(y, month, 0).getDate();
}

function getPosClass(pos) {
  const map = {
    '小': 'pos-小', '小二線': 'pos-小二線', '大': 'pos-大', '13-21': 'pos-13-21',
  };
  return map[pos] || '';
}

// 編輯 Modal
function openEditModal(day, pos, cellEl, isLeave, isFixed) {
  const modal = document.getElementById('edit-modal');
  const select = document.getElementById('modal-select');
  const title = document.getElementById('modal-title');
  const info = document.getElementById('modal-info');
  const leaveTypeWrap = document.getElementById('modal-leave-type-wrap');
  const leaveTypeInput = document.getElementById('modal-leave-type');

  const scheduleData = getScheduleData();
  const current = scheduleData[day - 1][pos] || '';
  const dow = DOW_NAMES[getDow(day)];

  title.textContent = `編輯 ${currentMonth}/${day} (${dow})`;
  if (isFixed) {
    const slots = getSavedFixedSlots();
    const slot = slots.find(s => s.name === pos);
    const defaultPerson = slot ? slot.person : '';
    info.textContent = `位置：${pos}　目前：${current || '(空)'}　預設：${defaultPerson || '(無)'}`;
  } else {
    info.textContent = `位置：${pos}　目前：${current || '(空)'}`;
  }

  select.innerHTML = '<option value="">(空)</option>';
  STAFF.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.nick;
    opt.textContent = `${s.nick} - ${s.name}`;
    if (s.nick === current) opt.selected = true;
    select.appendChild(opt);
  });

  // 休假類型
  if (isLeave) {
    leaveTypeWrap.style.display = 'block';
    leaveTypeInput.value = getLeaveType(day, pos);
  } else {
    leaveTypeWrap.style.display = 'none';
    leaveTypeInput.value = '';
  }

  modal.classList.remove('hidden');

  document.getElementById('modal-save').onclick = () => {
    const newVal = select.value;
    const scheduleData = getScheduleData();
    scheduleData[day - 1][pos] = newVal;
    if (!newVal) delete scheduleData[day - 1][pos];
    markEdited(day, pos);
    if (isLeave) {
      setLeaveType(day, pos, leaveTypeInput.value.trim());
    }
    saveSchedule();
    modal.classList.add('hidden');
    refreshAll();
  };

  document.getElementById('modal-clear').onclick = () => {
    const scheduleData = getScheduleData();
    delete scheduleData[day - 1][pos];
    markEdited(day, pos);
    if (isLeave) setLeaveType(day, pos, '');
    saveSchedule();
    modal.classList.add('hidden');
    refreshAll();
  };

  document.getElementById('modal-cancel').onclick = () => modal.classList.add('hidden');
  document.getElementById('modal-close').onclick = () => modal.classList.add('hidden');
}

// ONCALL 編輯 Modal（雙人選擇）
function openOncallModal(day, cellEl) {
  const modal = document.getElementById('oncall-modal');
  const title = document.getElementById('oncall-modal-title');
  const info = document.getElementById('oncall-modal-info');
  const sel1 = document.getElementById('oncall-select1');
  const sel2 = document.getElementById('oncall-select2');

  const scheduleData = getScheduleData();
  const dow = DOW_NAMES[getDow(day)];
  const people = getOncallForDay(day, scheduleData);
  const isManual = scheduleData[day - 1]?.['ONCALL'] !== undefined;
  const defaults = getOncallDefault(day, scheduleData);

  title.textContent = `編輯 ONCALL ${currentMonth}/${day} (${dow})`;
  info.textContent = `目前：${people.join(', ') || '(空)'}${isManual ? ' (手動)' : ' (自動)'}`;

  // 填充下拉選單
  [sel1, sel2].forEach((sel, idx) => {
    sel.innerHTML = '<option value="">(空)</option>';
    STAFF.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.nick;
      opt.textContent = `${s.nick} - ${s.name}`;
      if (people[idx] === s.nick) opt.selected = true;
      sel.appendChild(opt);
    });
  });

  modal.classList.remove('hidden');

  document.getElementById('oncall-modal-save').onclick = () => {
    const v1 = sel1.value;
    const v2 = sel2.value;
    const arr = [v1, v2].filter(Boolean);
    scheduleData[day - 1]['ONCALL'] = arr.join(',');
    if (arr.length === 0) delete scheduleData[day - 1]['ONCALL'];
    saveSchedule();
    modal.classList.add('hidden');
    refreshAll();
  };

  document.getElementById('oncall-modal-reset').onclick = () => {
    // 移除手動覆蓋，恢復自動帶入
    delete scheduleData[day - 1]['ONCALL'];
    saveSchedule();
    modal.classList.add('hidden');
    refreshAll();
  };

  document.getElementById('oncall-modal-cancel').onclick = () => modal.classList.add('hidden');
  document.getElementById('oncall-modal-close').onclick = () => modal.classList.add('hidden');
}
