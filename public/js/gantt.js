import { getState, updateTask, updateSubtask } from './store.js';
import { openEditTask, openEditSubtask } from './modal.js';

const DAY_MS = 86400000;
const DAY_W  = 32; // px — matches --day-width CSS var

let viewStart = null; // Date (start of visible window)
let viewEnd   = null; // Date (end of visible window)

const ganttPanel = document.getElementById('gantt-panel');
const ganttInner = document.getElementById('gantt-inner');

// ── Date range init ───────────────────────────────────────────
export function initDateRange() {
  const today = startOfDay(new Date());
  viewStart = addDays(today, -30);
  viewEnd   = addDays(today, 62);
  syncDateInputs();
}

export function getViewRange() { return { viewStart, viewEnd }; }

export function setViewRange(start, end) {
  viewStart = start;
  viewEnd = end;
  syncDateInputs();
}

function syncDateInputs() {
  document.getElementById('view-from').value = fmtISO(viewStart);
  document.getElementById('view-to').value   = fmtISO(viewEnd);
}

// ── Main render ───────────────────────────────────────────────
export function renderGantt() {
  ganttInner.innerHTML = '';
  const { projects } = getState();
  const days = getDayRange(viewStart, viewEnd);
  const today = startOfDay(new Date());

  // Header
  ganttInner.appendChild(buildHeader(days, today));

  // Today line (positioned after header is laid out)
  const todayLine = buildTodayLine(today, days);

  // Rows
  const rowsWrap = document.createElement('div');
  rowsWrap.style.position = 'relative';

  if (!projects.length) {
    ganttInner.appendChild(rowsWrap);
    return;
  }

  projects.forEach(project => {
    rowsWrap.appendChild(buildProjectRow(project, days, today));
    if (!project.collapsed) {
      project.tasks.forEach(task => {
        rowsWrap.appendChild(buildTaskRow(project, task, days, today));
        if (!task.collapsed) {
          task.subtasks.forEach(sub => {
            rowsWrap.appendChild(buildSubtaskRow(project, task, sub, days, today));
          });
        }
      });
    }
  });

  if (todayLine) rowsWrap.appendChild(todayLine);
  ganttInner.appendChild(rowsWrap);
}

// ── Header ────────────────────────────────────────────────────
function buildHeader(days, today) {
  const header = document.createElement('div');
  header.className = 'gantt-header';

  // Month row
  const monthRow = document.createElement('div');
  monthRow.className = 'gantt-months';

  let i = 0;
  while (i < days.length) {
    const month = days[i].getMonth();
    const year  = days[i].getFullYear();
    let count = 0;
    while (i + count < days.length && days[i + count].getMonth() === month) count++;
    const cell = document.createElement('div');
    cell.className = 'gantt-month-cell';
    cell.style.width = `${count * DAY_W}px`;
    cell.textContent = days[i].toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    monthRow.appendChild(cell);
    i += count;
  }

  // Day row
  const dayRow = document.createElement('div');
  dayRow.className = 'gantt-days';
  days.forEach(d => {
    const cell = document.createElement('div');
    cell.className = 'gantt-day-cell';
    const dow = d.getDay();
    if (dow === 0 || dow === 6) cell.classList.add('weekend');
    if (sameDay(d, today)) cell.classList.add('today-col');
    cell.textContent = d.getDate();
    dayRow.appendChild(cell);
  });

  header.appendChild(monthRow);
  header.appendChild(dayRow);
  return header;
}

// ── Today line ────────────────────────────────────────────────
function buildTodayLine(today, days) {
  const idx = days.findIndex(d => sameDay(d, today));
  if (idx < 0) return null;

  const line = document.createElement('div');
  line.className = 'today-line';
  line.style.left = `${idx * DAY_W + DAY_W / 2}px`;
  line.style.top  = '0';

  const label = document.createElement('div');
  label.className = 'today-line-label';
  label.textContent = 'Today';
  line.appendChild(label);
  return line;
}

// ── Row builders ──────────────────────────────────────────────
function buildProjectRow(project, days, today) {
  const row = document.createElement('div');
  row.className = 'gantt-row project-row';
  buildCells(row, days, today);
  return row;
}

function buildTaskRow(project, task, days, today) {
  const row = document.createElement('div');
  row.className = 'gantt-row';
  buildCells(row, days, today);
  buildBar(row, task, project.colour, days, (patch) => {
    updateTask(project.id, task.id, patch);
  }, () => openEditTask(project.id, task));
  return row;
}

function buildSubtaskRow(project, task, sub, days, today) {
  const row = document.createElement('div');
  row.className = 'gantt-row';
  buildCells(row, days, today);
  buildBar(row, sub, project.colour, days, (patch) => {
    updateSubtask(project.id, task.id, sub.id, patch);
  }, () => openEditSubtask(project.id, task.id, sub), true);
  return row;
}

function buildCells(row, days, today) {
  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.height = '100%';
  days.forEach(d => {
    const cell = document.createElement('div');
    cell.className = 'gantt-cell';
    const dow = d.getDay();
    if (dow === 0 || dow === 6) cell.classList.add('weekend');
    if (sameDay(d, today)) cell.classList.add('today-col');
    wrap.appendChild(cell);
  });
  row.appendChild(wrap);
}

// ── Bar ───────────────────────────────────────────────────────
function buildBar(row, item, colour, days, onUpdate, onEdit, isSubtask = false) {
  const start = startOfDay(new Date(item.startDate));
  const end   = startOfDay(new Date(item.endDate));

  const startIdx = days.findIndex(d => sameDay(d, start));
  const endIdx   = days.findIndex(d => sameDay(d, end));
  if (startIdx < 0 && endIdx < 0) return;

  const clampedStart = Math.max(0, startIdx < 0 ? 0 : startIdx);
  const clampedEnd   = Math.min(days.length - 1, endIdx < 0 ? days.length - 1 : endIdx);

  const barWrap = document.createElement('div');
  barWrap.className = 'gantt-bar-wrap';

  const bar = document.createElement('div');
  bar.className = 'gantt-bar';
  bar.style.left   = `${clampedStart * DAY_W}px`;
  bar.style.width  = `${(clampedEnd - clampedStart + 1) * DAY_W}px`;
  bar.style.background = isSubtask ? hexWithOpacity(colour, 0.65) : colour;

  const handleL = document.createElement('div');
  handleL.className = 'gantt-bar-handle left';

  const label = document.createElement('div');
  label.className = 'gantt-bar-label';
  label.textContent = item.name;

  const handleR = document.createElement('div');
  handleR.className = 'gantt-bar-handle right';

  bar.append(handleL, label, handleR);

  // Tooltip
  bindTooltip(bar, item);

  // Drag interactions
  bindBarDrag(bar, handleL, handleR, item, days, clampedStart, clampedEnd, onUpdate, onEdit);

  barWrap.appendChild(bar);
  row.appendChild(barWrap);
}

// ── Drag logic ────────────────────────────────────────────────
function bindBarDrag(bar, handleL, handleR, item, days, initStart, initEnd, onUpdate, onEdit) {
  let dragMode = null; // 'move' | 'left' | 'right'
  let startX = 0;
  let origStartIdx = initStart;
  let origEndIdx   = initEnd;
  let moved = false;

  function onMouseDown(mode) {
    return (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragMode = mode;
      startX = e.clientX;
      origStartIdx = initStart;
      origEndIdx   = initEnd;
      moved = false;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };
  }

  function onMouseMove(e) {
    const delta = Math.round((e.clientX - startX) / DAY_W);
    if (delta !== 0) moved = true;
    let newStart = origStartIdx;
    let newEnd   = origEndIdx;

    if (dragMode === 'move') {
      newStart = origStartIdx + delta;
      newEnd   = origEndIdx + delta;
    } else if (dragMode === 'left') {
      newStart = Math.min(origStartIdx + delta, origEndIdx); // can't exceed end
    } else if (dragMode === 'right') {
      newEnd = Math.max(origEndIdx + delta, origStartIdx); // can't precede start
    }

    // Clamp to visible range
    newStart = Math.max(0, Math.min(newStart, days.length - 1));
    newEnd   = Math.max(0, Math.min(newEnd,   days.length - 1));
    if (newEnd < newStart) newEnd = newStart; // enforce min 1 day

    bar.style.left  = `${newStart * DAY_W}px`;
    bar.style.width = `${(newEnd - newStart + 1) * DAY_W}px`;
    initStart = newStart;
    initEnd   = newEnd;
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);

    if (!moved) {
      onEdit();
    } else {
      const newStartDate = fmtISO(days[initStart]);
      const newEndDate   = fmtISO(days[initEnd]);
      onUpdate({ startDate: newStartDate, endDate: newEndDate });
    }
    dragMode = null;
  }

  handleL.addEventListener('mousedown', onMouseDown('left'));
  handleR.addEventListener('mousedown', onMouseDown('right'));
  bar.addEventListener('mousedown', e => {
    if (e.target === handleL || e.target === handleR) return;
    onMouseDown('move')(e);
  });
}

// ── Tooltip ───────────────────────────────────────────────────
let tooltip = null;

function bindTooltip(bar, item) {
  bar.addEventListener('mouseenter', (e) => {
    if (tooltip) tooltip.remove();
    tooltip = document.createElement('div');
    tooltip.className = 'gantt-tooltip';
    const assignees = item.assignees?.length ? item.assignees.join(', ') : '—';
    tooltip.innerHTML = `<strong>${item.name}</strong>${assignees}<br />${item.startDate} → ${item.endDate}`;
    document.body.appendChild(tooltip);
    positionTooltip(e);
  });
  bar.addEventListener('mousemove', positionTooltip);
  bar.addEventListener('mouseleave', () => { tooltip?.remove(); tooltip = null; });
}

function positionTooltip(e) {
  if (!tooltip) return;
  tooltip.style.left = `${e.clientX + 12}px`;
  tooltip.style.top  = `${e.clientY - 8}px`;
}

// ── Date navigation ───────────────────────────────────────────
export function initNavButtons() {
  document.getElementById('btn-prev').addEventListener('click', () => shiftMonths(-1));
  document.getElementById('btn-next').addEventListener('click', () => shiftMonths(1));
  document.getElementById('btn-today').addEventListener('click', () => {
    initDateRange();
    renderGantt();
  });
  document.getElementById('view-from').addEventListener('change', e => {
    const d = new Date(e.target.value);
    if (!isNaN(d)) { viewStart = d; renderGantt(); }
  });
  document.getElementById('view-to').addEventListener('change', e => {
    const d = new Date(e.target.value);
    if (!isNaN(d)) { viewEnd = d; renderGantt(); }
  });
}

function shiftMonths(n) {
  viewStart = addMonths(viewStart, n);
  viewEnd   = addMonths(viewEnd, n);
  syncDateInputs();
  renderGantt();
}

// ── Sync vertical scroll with sidebar ────────────────────────
export function syncScroll() {
  const sidebar = document.getElementById('sidebar-inner');
  let syncingSidebar = false;
  let syncingGantt   = false;

  ganttPanel.addEventListener('scroll', () => {
    if (syncingGantt) return;
    syncingSidebar = true;
    sidebar.scrollTop = ganttPanel.scrollTop;
    syncingSidebar = false;
  });

  sidebar.addEventListener('scroll', () => {
    if (syncingSidebar) return;
    syncingGantt = true;
    ganttPanel.scrollTop = sidebar.scrollTop;
    syncingGantt = false;
  });
}

// ── Date utilities ────────────────────────────────────────────
function getDayRange(start, end) {
  const days = [];
  let cur = startOfDay(new Date(start));
  const last = startOfDay(new Date(end));
  while (cur <= last) {
    days.push(new Date(cur));
    cur = new Date(cur.getTime() + DAY_MS);
  }
  return days;
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function addDays(d, n) {
  return new Date(d.getTime() + n * DAY_MS);
}

function addMonths(d, n) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

function fmtISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function hexWithOpacity(hex, opacity) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}
