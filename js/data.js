// 人員名單
const STAFF = [
  { nick: '宏', id: 'G03577', name: '謝政宏' },
  { nick: '娟', id: 'G03941', name: '王珮娟' },
  { nick: '璇', id: 'G04158', name: '吳沁璇' },
  { nick: '芳', id: 'G04159', name: '楊淑芳' },
  { nick: '清', id: 'G04195', name: '許志清' },
  { nick: '玲', id: 'G04197', name: '鍾宜玲' },
  { nick: '俊', id: 'G04198', name: '彭嘉俊' },
  { nick: '行', id: 'G04199', name: '唐知行' },
  { nick: '堯', id: 'G04265', name: '高敬堯' },
  { nick: '倫', id: 'G04839', name: '徐珮倫' },
  { nick: '魁', id: 'G04855', name: '張孝魁' },
  { nick: '翔', id: 'G04857', name: '鍾元翔' },
  { nick: '琳', id: 'G05356', name: '阮仕琳' },
  { nick: '韋', id: 'G05800', name: '黃政韋' },
  { nick: '潔', id: 'G06131', name: '蔡思潔' },
  { nick: '婷', id: 'G06363', name: '粘洛婷' },
  { nick: '岑', id: 'G06396', name: '陸亮岑' },
  { nick: '宗', id: 'G06799', name: '莊勳宗' },
  { nick: '崴', id: 'G06800', name: '王冠崴' },
  { nick: '綾', id: 'G07323', name: '林紫綾' },
];

// 班別代碼對應
const SHIFT_CODES = {
  'MRI': 1, 'CT': 1, 'ER': 1, '3rd X光': 1, 'MAMMO': 1,
  'OPD2/BMD': 1, '代1': 1, '代2': 1,
  'Portable': 221, 'ER CT': 221,
  '大': 262,
  '13-21': 273,
  '小': 278, '小二線': 278,
};

// 值班表位置對應
const DUTY_MAP = {
  '白班': 'Portable',
  '小小夜': '13-21',
  '小夜': '小',
  '小夜二線': '小二線',
  '大夜': '大',
};

// 休假列數（預設2）
function getLeaveSlots() {
  const saved = localStorage.getItem('radiology_leave_slots');
  return saved ? parseInt(saved) : 2;
}

function setLeaveSlots(n) {
  localStorage.setItem('radiology_leave_slots', String(n));
}

function getLeavePositions() {
  const n = getLeaveSlots();
  const arr = [];
  for (let i = 1; i <= n; i++) arr.push('休假' + i);
  return arr;
}

// 星期名
const DOW_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

// 當前選擇的年月
let currentYear = 115;  // 民國年
let currentMonth = 5;

// 取得西元年
function getADYear() { return currentYear + 1911; }

// 取得該月天數
function getDaysInMonth() {
  return new Date(getADYear(), currentMonth, 0).getDate();
}

// 取得該月1號星期幾 (0=日,1=一,...,6=六)
function getFirstDow() {
  return new Date(getADYear(), currentMonth - 1, 1).getDay();
}

// 取得某天星期幾
function getDow(dayOfMonth) {
  return new Date(getADYear(), currentMonth - 1, dayOfMonth).getDay();
}

// 判斷是否為週末
function isWeekend(dayOfMonth) {
  const d = getDow(dayOfMonth);
  return d === 0 || d === 6;
}

// 取得某人的全名
function getFullName(nick) {
  const s = STAFF.find(s => s.nick === nick);
  return s ? s.name : nick;
}

// 取得某人的員編
function getEmployeeId(nick) {
  const s = STAFF.find(s => s.nick === nick);
  return s ? s.id : '';
}

// 全域班表資料：key = "YYYY-MM", value = array of day objects
let allSchedules = {};

// 記錄被編輯過的格子：key = "YYYY-MM", value = Set of "day-pos" strings
let allEdits = {};

function getScheduleKey() {
  return `${getADYear()}-${String(currentMonth).padStart(2, '0')}`;
}

function getScheduleData() {
  const key = getScheduleKey();
  if (!allSchedules[key]) {
    allSchedules[key] = buildEmptyMonth();
  }
  return allSchedules[key];
}

function getEditsSet() {
  const key = getScheduleKey();
  if (!allEdits[key]) {
    allEdits[key] = new Set();
  }
  return allEdits[key];
}

function markEdited(day, pos) {
  getEditsSet().add(`${day}-${pos}`);
}

function isEdited(day, pos) {
  return getEditsSet().has(`${day}-${pos}`);
}

function buildEmptyMonth() {
  const days = getDaysInMonth();
  const result = [];
  for (let i = 0; i < days; i++) result.push({});
  return result;
}

// 115年5月的初始資料
function buildMay2026Schedule() {
  return [
    { 'Portable':'芳', 'ER CT':'堯', '小':'潔', '小二線':'岑', '大':'魁' },
    { 'Portable':'芳', 'ER CT':'崴', '小':'潔', '小二線':'岑', '大':'娟' },
    { 'Portable':'芳', 'ER CT':'婷', '小':'綾', '小二線':'岑', '大':'娟' },
    { 'MRI':'琳', 'CT':'倫', 'ER':'宏', 'Portable':'韋', '3rd X光':'芳', 'MAMMO':'璇', 'OPD2/BMD':'俊', 'ER CT':'崴', '小':'潔', '小二線':'綾', '大':'娟', '13-21':'魁', '代1':'婷', '代2':'行' },
    { 'MRI':'琳', 'CT':'倫', 'ER':'宏', 'Portable':'韋', '3rd X光':'堯', 'MAMMO':'璇', 'OPD2/BMD':'俊', 'ER CT':'崴', '小':'潔', '小二線':'綾', '大':'岑', '13-21':'魁', '代1':'婷', '代2':'行' },
    { 'MRI':'琳', 'CT':'倫', 'ER':'宏', 'Portable':'堯', '3rd X光':'芳', 'MAMMO':'璇', 'OPD2/BMD':'俊', 'ER CT':'崴', '小':'潔', '小二線':'綾', '大':'岑', '13-21':'魁', '代1':'婷', '代2':'行' },
    { 'MRI':'琳', 'CT':'倫', 'ER':'宏', 'Portable':'堯', '3rd X光':'芳', 'MAMMO':'璇', 'OPD2/BMD':'俊', 'ER CT':'崴', '小':'潔', '小二線':'娟', '大':'岑', '13-21':'魁', '代1':'婷', '代2':'行' },
    { 'MRI':'琳', 'CT':'倫', 'ER':'宏', 'Portable':'韋', '3rd X光':'芳', 'MAMMO':'璇', 'OPD2/BMD':'俊', 'ER CT':'崴', '小':'堯', '小二線':'娟', '大':'岑', '13-21':'魁', '代1':'婷', '代2':'行' },
    { 'Portable':'韋', 'ER CT':'芳', '小':'堯', '小二線':'娟', '大':'綾' },
    { 'Portable':'韋', 'ER CT':'婷', '小':'潔', '小二線':'娟', '大':'綾' },
    { 'MRI':'璇', 'CT':'琳', 'ER':'倫', 'Portable':'婷', '3rd X光':'韋', 'MAMMO':'芳', 'OPD2/BMD':'崴', 'ER CT':'俊', '小':'堯', '小二線':'潔', '大':'綾', '13-21':'岑', '代1':'魁', '代2':'行' },
    { 'MRI':'璇', 'CT':'琳', 'ER':'倫', 'Portable':'婷', '3rd X光':'璇', 'MAMMO':'芳', 'OPD2/BMD':'崴', 'ER CT':'俊', '小':'堯', '小二線':'潔', '大':'娟', '13-21':'岑', '代1':'魁', '代2':'行' },
    { 'MRI':'璇', 'CT':'琳', 'ER':'倫', 'Portable':'宏', '3rd X光':'韋', 'MAMMO':'芳', 'OPD2/BMD':'崴', 'ER CT':'俊', '小':'堯', '小二線':'潔', '大':'娟', '13-21':'岑', '代1':'魁', '代2':'行' },
    { 'MRI':'璇', 'CT':'琳', 'ER':'倫', 'Portable':'宏', '3rd X光':'韋', 'MAMMO':'芳', 'OPD2/BMD':'崴', 'ER CT':'俊', '小':'堯', '小二線':'綾', '大':'娟', '13-21':'岑', '代1':'魁', '代2':'行' },
    { 'MRI':'璇', 'CT':'琳', 'ER':'倫', 'Portable':'婷', '3rd X光':'韋', 'MAMMO':'芳', 'OPD2/BMD':'崴', 'ER CT':'俊', '小':'宏', '小二線':'綾', '大':'娟', '13-21':'岑', '代1':'魁', '代2':'行' },
    { 'Portable':'岑', 'ER CT':'韋', '小':'宏', '小二線':'綾', '大':'潔' },
    { 'Portable':'魁', 'ER CT':'娟', '小':'堯', '小二線':'綾', '大':'潔' },
    { 'MRI':'魁', 'CT':'婷', 'ER':'琳', 'Portable':'倫', '3rd X光':'璇', 'MAMMO':'芳', 'OPD2/BMD':'韋', 'ER CT':'崴', '小':'宏', '小二線':'堯', '大':'潔', '13-21':'娟', '代1':'岑', '代2':'行' },
    { 'MRI':'魁', 'CT':'婷', 'ER':'琳', 'Portable':'倫', '3rd X光':'俊', 'MAMMO':'芳', 'OPD2/BMD':'韋', 'ER CT':'崴', '小':'宏', '小二線':'堯', '大':'綾', '13-21':'娟', '代1':'岑', '代2':'行' },
    { 'MRI':'魁', 'CT':'婷', 'ER':'琳', 'Portable':'俊', '3rd X光':'璇', 'MAMMO':'芳', 'OPD2/BMD':'韋', 'ER CT':'崴', '小':'宏', '小二線':'堯', '大':'綾', '13-21':'娟', '代1':'岑', '代2':'行' },
    { 'MRI':'魁', 'CT':'婷', 'ER':'琳', 'Portable':'俊', '3rd X光':'璇', 'MAMMO':'芳', 'OPD2/BMD':'韋', 'ER CT':'崴', '小':'宏', '小二線':'潔', '大':'綾', '13-21':'娟', '代1':'岑', '代2':'行' },
    { 'MRI':'魁', 'CT':'婷', 'ER':'琳', 'Portable':'倫', '3rd X光':'璇', 'MAMMO':'芳', 'OPD2/BMD':'韋', 'ER CT':'崴', '小':'俊', '小二線':'潔', '大':'綾', '13-21':'娟', '代1':'岑', '代2':'行' },
    { 'Portable':'倫', 'ER CT':'璇', '小':'俊', '小二線':'潔', '大':'堯' },
    { 'Portable':'倫', 'ER CT':'綾', '小':'宏', '小二線':'潔', '大':'堯' },
    { 'MRI':'岑', 'CT':'魁', 'ER':'婷', 'Portable':'琳', '3rd X光':'倫', 'MAMMO':'娟', 'OPD2/BMD':'韋', 'ER CT':'芳', '小':'俊', '小二線':'宏', '大':'堯', '13-21':'綾', '代1':'璇', '代2':'行' },
    { 'MRI':'岑', 'CT':'魁', 'ER':'婷', 'Portable':'琳', '3rd X光':'崴', 'MAMMO':'娟', 'OPD2/BMD':'韋', 'ER CT':'芳', '小':'俊', '小二線':'宏', '大':'潔', '13-21':'綾', '代1':'璇', '代2':'行' },
    { 'MRI':'岑', 'CT':'魁', 'ER':'婷', 'Portable':'崴', '3rd X光':'倫', 'MAMMO':'娟', 'OPD2/BMD':'韋', 'ER CT':'芳', '小':'俊', '小二線':'宏', '大':'潔', '13-21':'綾', '代1':'璇', '代2':'行' },
    { 'MRI':'岑', 'CT':'魁', 'ER':'婷', 'Portable':'崴', '3rd X光':'倫', 'MAMMO':'娟', 'OPD2/BMD':'韋', 'ER CT':'芳', '小':'俊', '小二線':'堯', '大':'潔', '13-21':'綾', '代1':'璇', '代2':'行' },
    { 'MRI':'岑', 'CT':'魁', 'ER':'婷', 'Portable':'琳', '3rd X光':'倫', 'MAMMO':'娟', 'OPD2/BMD':'韋', 'ER CT':'芳', '小':'崴', '小二線':'堯', '大':'潔', '13-21':'綾', '代1':'璇', '代2':'行' },
    { 'Portable':'琳', 'ER CT':'倫', '小':'崴', '小二線':'堯', '大':'宏' },
    { 'Portable':'倫', 'ER CT':'潔', '小':'俊', '小二線':'堯', '大':'宏' },
  ];
}

// ===== 年度預假表 =====
// 資料結構: { "2026": { "5-1": { "休假1": "芳", "休假2": "宏" }, ... } }
let annualLeaveData = {};

function getAnnualLeave(adYear) {
  const key = String(adYear || getADYear());
  if (!annualLeaveData[key]) annualLeaveData[key] = {};
  return annualLeaveData[key];
}

function setAnnualLeave(adYear, month, day, slot, nick) {
  const data = getAnnualLeave(adYear);
  const dateKey = `${month}-${day}`;
  if (!data[dateKey]) data[dateKey] = {};
  if (nick) {
    data[dateKey][slot] = nick;
  } else {
    delete data[dateKey][slot];
    if (Object.keys(data[dateKey]).length === 0) delete data[dateKey];
  }
  saveAnnualLeave();
}

function getAnnualLeaveForDay(month, day, adYear) {
  const data = getAnnualLeave(adYear);
  return data[`${month}-${day}`] || {};
}

function saveAnnualLeave() {
  localStorage.setItem('radiology_annual_leave', JSON.stringify(annualLeaveData));
  if (typeof scheduleCloudSync === 'function') scheduleCloudSync();
}

function loadAnnualLeave() {
  const saved = localStorage.getItem('radiology_annual_leave');
  if (saved) annualLeaveData = JSON.parse(saved);
}

// 檢查某天某休假欄位是否由年度預假表填入
function isFromAnnualLeave(day, leavePos) {
  const al = getAnnualLeaveForDay(currentMonth, day);
  return !!al[leavePos];
}

// 休假類型資料: { "2026-05": { "1-休假1": "年假", ... } }
let allLeaveTypes = {};

function getLeaveTypeKey() { return getScheduleKey(); }

function getLeaveType(day, pos) {
  const data = allLeaveTypes[getLeaveTypeKey()] || {};
  return data[`${day}-${pos}`] || '';
}

function setLeaveType(day, pos, type) {
  const key = getLeaveTypeKey();
  if (!allLeaveTypes[key]) allLeaveTypes[key] = {};
  if (type) {
    allLeaveTypes[key][`${day}-${pos}`] = type;
  } else {
    delete allLeaveTypes[key][`${day}-${pos}`];
  }
  localStorage.setItem('radiology_leave_types', JSON.stringify(allLeaveTypes));
  if (typeof scheduleCloudSync === 'function') scheduleCloudSync();
}

function loadLeaveTypes() {
  const saved = localStorage.getItem('radiology_leave_types');
  if (saved) allLeaveTypes = JSON.parse(saved);
}

// 固定列（血管）
function getSavedFixedSlots() {
  const saved = localStorage.getItem('radiology_fixed_slots');
  if (saved) return JSON.parse(saved);
  return [
    { name: '血管1', person: '', weekdays: true },
    { name: '血管2', person: '', weekdays: true },
  ];
}

function saveFixedSlots(slots) {
  localStorage.setItem('radiology_fixed_slots', JSON.stringify(slots));
  if (typeof scheduleCloudSync === 'function') scheduleCloudSync();
}

function getFixedPositions() {
  return getSavedFixedSlots().map(s => s.name);
}

// ONCALL 設定
// rules: 每天從哪些位置自動帶入
// { weekday: ['ER'], saturday: ['小二線','ER CT'], sunday: ['小','Portable'] }
function getOncallConfig() {
  const saved = localStorage.getItem('radiology_oncall_config');
  if (saved) return JSON.parse(saved);
  return {
    weekday: ['ER'],
    saturday: ['小二線', 'ER CT'],
    sunday: ['小', 'Portable'],
  };
}

function saveOncallConfig(config) {
  localStorage.setItem('radiology_oncall_config', JSON.stringify(config));
  if (typeof scheduleCloudSync === 'function') scheduleCloudSync();
}

// 取得某天 ONCALL 預設人員（從班表位置帶入）
function getOncallDefault(day, scheduleData) {
  const dow = getDow(day);
  const dayData = scheduleData[day - 1];
  if (!dayData) return [];
  const config = getOncallConfig();

  let sourcePositions;
  if (dow === 6) sourcePositions = config.saturday;
  else if (dow === 0) sourcePositions = config.sunday;
  else sourcePositions = config.weekday;

  const people = [];
  (sourcePositions || []).forEach(pos => {
    if (dayData[pos]) people.push(dayData[pos]);
  });
  return people;
}

// 取得某天 ONCALL 最終值（手動覆蓋 > 自動帶入）
function getOncallForDay(day, scheduleData) {
  const manual = scheduleData[day - 1]?.['ONCALL'];
  if (manual !== undefined && manual !== null) {
    // 手動值：字串，逗號分隔
    return manual.split(',').filter(s => s);
  }
  return getOncallDefault(day, scheduleData);
}

// 儲存/載入
function saveSchedule() {
  localStorage.setItem('radiology_schedules', JSON.stringify(allSchedules));
  localStorage.setItem('radiology_edits', JSON.stringify(
    Object.fromEntries(Object.entries(allEdits).map(([k, v]) => [k, [...v]]))
  ));
  if (typeof scheduleCloudSync === 'function') scheduleCloudSync();
}

function loadSchedule() {
  const saved = localStorage.getItem('radiology_schedules');
  if (saved) allSchedules = JSON.parse(saved);
  const edits = localStorage.getItem('radiology_edits');
  if (edits) {
    const parsed = JSON.parse(edits);
    allEdits = Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, new Set(v)]));
  }
  // 確保115年5月有初始資料
  if (!allSchedules['2026-05']) {
    allSchedules['2026-05'] = buildMay2026Schedule();
  }
  loadAnnualLeave();
  loadLeaveTypes();
}

// 將年度預假表同步到班表的休假欄位
function syncAnnualLeaveToSchedule() {
  const scheduleData = getScheduleData();
  const daysInMonth = getDaysInMonth();
  const leavePositions = getLeavePositions();
  for (let d = 1; d <= daysInMonth; d++) {
    const al = getAnnualLeaveForDay(currentMonth, d);
    leavePositions.forEach(pos => {
      if (al[pos]) {
        // 年度預假表有資料 → 寫入班表
        scheduleData[d - 1][pos] = al[pos];
      } else if (isFromAnnualLeaveOld(d, pos)) {
        // 年度預假表已取消但班表還有殘留 → 清除
        delete scheduleData[d - 1][pos];
      }
    });
    // 更新追蹤
    updateAnnualLeaveTrack(d, al, leavePositions);
  }
}

// 追蹤哪些格子是由年度預假表填入的（用來偵測取消）
function getAnnualLeaveTrack() {
  const key = 'al_track_' + getScheduleKey();
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : {};
}

function updateAnnualLeaveTrack(day, al, leavePositions) {
  const key = 'al_track_' + getScheduleKey();
  const track = getAnnualLeaveTrack();
  leavePositions.forEach(pos => {
    const k = `${day}-${pos}`;
    if (al[pos]) {
      track[k] = al[pos];
    } else {
      delete track[k];
    }
  });
  localStorage.setItem(key, JSON.stringify(track));
}

function isFromAnnualLeaveOld(day, pos) {
  const track = getAnnualLeaveTrack();
  return !!track[`${day}-${pos}`];
}

function resetSchedule() {
  const key = getScheduleKey();
  delete allSchedules[key];
  delete allEdits[key];
  if (key === '2026-05') {
    allSchedules['2026-05'] = buildMay2026Schedule();
  }
  saveSchedule();
}
