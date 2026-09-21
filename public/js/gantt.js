import { getState, updateTask, updateSubtask, getBankHolidaySet } from './store.js';
import { openEditTask, openEditSubtask, openEditMilestone } from './modal.js';

const DAY_MS = 86400000;
const DAY_W  = 32; // px — matches --day-width CSS var

// The From/To inputs are a *focus window*: they decide where you land, not how
// far you can travel. The rendered canvas below grows past them as you pan.
let selStart = null;  // Date — user's selected window (From input)
let selEnd   = null;  // Date — user's selected window (To input)

let viewStart = null; // Date (start of the rendered canvas)
let viewEnd   = null; // Date (end of the rendered canvas)

const ganttPanel = document.getElementById('gantt-panel');
const ganttInner = document.getElementById('gantt-inner');

// ── Date range init ───────────────────────────────────────────
function defaultWindow() {
  const today = startOfDay(new Date());
  return [addDays(today, -30), addDays(today, 62)];
}

export function initDateRange() {
  const [start, end] = defaultWindow();
  applySelection(start, end, false);
}

export function getViewRange() { return { viewStart, viewEnd }; }

export function setViewRange(start, end) { applySelection(start, end); }

// Snap the canvas back to exactly the selected window and scroll to its start.
// Every explicit date control routes through here; panning deliberately does not.
function applySelection(start, end, render = true) {
  selStart = startOfDay(start);
  selEnd   = startOfDay(end);
  viewStart = selStart;
  viewEnd   = selEnd;
  syncDateInputs();
  if (render) {
    renderGantt();
    ganttPanel.scrollLeft = 0;
  }
}

function syncDateInputs() {
  document.getElementById('view-from').value = fmtISO(selStart);
  document.getElementById('view-to').value   = fmtISO(selEnd);
}

// ── Main render ───────────────────────────────────────────────
export function renderGantt() {
  ganttInner.innerHTML = '';
  const { projects } = getState();
  const days = getDayRange(viewStart, viewEnd);
  const today = startOfDay(new Date());
  const bhSet = getBankHolidaySet();

  // Size the canvas to the full timeline so the header spans every day
  // rather than being clipped at the panel's visible width.
  ganttInner.style.width = `${days.length * DAY_W}px`;

  // Header
  ganttInner.appendChild(buildHeader(days, today, bhSet));

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
    rowsWrap.appendChild(buildProjectRow(project, days, today, bhSet));
    if (!project.collapsed) {
      project.tasks.forEach(task => {
        rowsWrap.appendChild(buildTaskRow(project, task, days, today, bhSet));
        if (!task.collapsed) {
          task.subtasks.forEach(sub => {
            rowsWrap.appendChild(buildSubtaskRow(project, task, sub, days, today, bhSet));
          });
        }
      });
    }
  });

  if (todayLine) rowsWrap.appendChild(todayLine);
  ganttInner.appendChild(rowsWrap);
}

// ── Header ────────────────────────────────────────────────────
function buildHeader(days, today, bhSet) {
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
    const label = document.createElement('span');
    label.className = 'gantt-month-label';
    label.textContent = days[i].toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    cell.appendChild(label);
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
    if (dow === 0 || dow === 6 || bhSet.has(fmtISO(d))) cell.classList.add('weekend');
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
function buildProjectRow(project, days, today, bhSet) {
  const row = document.createElement('div');
  row.className = 'gantt-row project-row';
  buildCells(row, days, today, bhSet);
  buildMilestoneMarkers(row, project.milestones || [], days, project.id, project.colour);
  return row;
}

function buildTaskRow(project, task, days, today, bhSet) {
  const row = document.createElement('div');
  row.className = 'gantt-row';
  buildCells(row, days, today, bhSet);
  buildBar(row, task, project.colour, days, (patch) => {
    updateTask(project.id, task.id, patch);
  }, () => openEditTask(project.id, task));
  return row;
}

function buildSubtaskRow(project, task, sub, days, today, bhSet) {
  const row = document.createElement('div');
  row.className = 'gantt-row';
  buildCells(row, days, today, bhSet);
  buildBar(row, sub, project.colour, days, (patch) => {
    updateSubtask(project.id, task.id, sub.id, patch);
  }, () => openEditSubtask(project.id, task.id, sub), true);
  return row;
}

function buildCells(row, days, today, bhSet) {
  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.height = '100%';
  days.forEach(d => {
    const cell = document.createElement('div');
    cell.className = 'gantt-cell';
    const dow = d.getDay();
    if (dow === 0 || dow === 6 || bhSet.has(fmtISO(d))) cell.classList.add('weekend');
    if (sameDay(d, today)) cell.classList.add('today-col');
    wrap.appendChild(cell);
  });
  row.appendChild(wrap);
}

// ── Milestone markers ─────────────────────────────────────────
function buildMilestoneMarkers(row, milestones, days, projectId, colour) {
  if (!milestones.length) return;

  const wrap = document.createElement('div');
  wrap.className = 'gantt-milestone-wrap';

  milestones.forEach(milestone => {
    const mDate = startOfDay(new Date(milestone.date));
    const idx = days.findIndex(d => sameDay(d, mDate));
    if (idx < 0) return;

    const diamond = document.createElement('div');
    diamond.className = 'gantt-milestone';
    diamond.style.left = `${idx * DAY_W + DAY_W / 2}px`;
    diamond.style.color = colour;

    diamond.addEventListener('click', e => {
      e.stopPropagation();
      openEditMilestone(projectId, milestone);
    });

    bindMilestoneTooltip(diamond, milestone);
    wrap.appendChild(diamond);
  });

  row.appendChild(wrap);
}

function bindMilestoneTooltip(el, milestone) {
  el.addEventListener('mouseenter', (e) => {
    if (tooltip) tooltip.remove();
    tooltip = document.createElement('div');
    tooltip.className = 'gantt-tooltip';
    tooltip.innerHTML = `<strong>${milestone.name}</strong>${milestone.date}`;
    document.body.appendChild(tooltip);
    positionTooltip(e);
  });
  el.addEventListener('mousemove', positionTooltip);
  el.addEventListener('mouseleave', () => { tooltip?.remove(); tooltip = null; });
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
    const [start, end] = defaultWindow();
    applySelection(start, end);
  });
  document.getElementById('view-from').addEventListener('change', e => {
    const d = new Date(e.target.value);
    if (!isNaN(d)) applySelection(d, selEnd < d ? d : selEnd);
  });
  document.getElementById('view-to').addEventListener('change', e => {
    const d = new Date(e.target.value);
    if (!isNaN(d)) applySelection(selStart > d ? d : selStart, d);
  });
}

function shiftMonths(n) {
  applySelection(addMonths(selStart, n), addMonths(selEnd, n));
}

// ── Infinite horizontal panning ───────────────────────────────
const EDGE_PX  = 240; // extend once the scroll comes this close to an edge
const MIN_EXTEND = 60; // days added per extension (at least)

// How far panning may grow the canvas beyond the selected window, per side.
// Every day rendered costs one cell per row, so this bounds the re-render hitch
// an extension can cause: ~5 years measures ~90ms on a small plan and scales
// with row count. Budgeting per side rather than capping the total span means a
// deliberately wide From/To selection is still pannable.
const MAX_EXTEND_DAYS = 1830;

function daysBetween(a, b) {
  return Math.round((b - a) / DAY_MS);
}

// Grows the canvas when `desired` (a scroll offset, which may be out of bounds
// mid-drag) reaches within EDGE_PX of either end. Returns the number of px the
// offset was shifted by, so an in-progress drag can compensate and keep the
// content glued to the cursor.
//
// Callers pass the *requested* offset rather than letting the browser clamp it
// first: a fast drag can ask for a negative scrollLeft, and clamping that to 0
// before extending would silently swallow the rest of the gesture.
function maybeExtendRange(desired = ganttPanel.scrollLeft) {
  const { scrollWidth, clientWidth } = ganttPanel;
  const pastLeft  = EDGE_PX - desired;
  const pastRight = (desired + clientWidth + EDGE_PX) - scrollWidth;

  // Always add MIN_EXTEND on top of the overshoot so one extension clears the
  // trigger zone; otherwise the next event would immediately extend again.
  if (pastLeft > 0) {
    const room = MAX_EXTEND_DAYS - daysBetween(viewStart, selStart);
    if (room <= 0) return 0;
    const step  = Math.min(room, Math.max(MIN_EXTEND, Math.ceil(pastLeft / DAY_W)));
    const shift = step * DAY_W;
    viewStart = addDays(viewStart, -step);
    renderGantt();
    ganttPanel.scrollLeft = desired + shift; // re-anchor: content moved right
    return shift;
  }

  if (pastRight > 0) {
    const room = MAX_EXTEND_DAYS - daysBetween(selEnd, viewEnd);
    if (room <= 0) return 0;
    const step = Math.min(room, Math.max(MIN_EXTEND, Math.ceil(pastRight / DAY_W)));
    viewEnd = addDays(viewEnd, step);
    renderGantt();
    return 0; // growing rightwards leaves existing content in place
  }

  return 0;
}

// ── Canvas pan (drag empty area left/right) ───────────────────
let panning = false;

export function initCanvasPan() {
  let startX = 0;
  let startScrollLeft = 0;
  let lastScrollLeft = ganttPanel.scrollLeft;

  ganttPanel.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const target = e.target;
    if (target.closest('.gantt-bar')) return;
    panning = true;
    startX = e.clientX;
    startScrollLeft = ganttPanel.scrollLeft;
    ganttPanel.style.cursor = 'grabbing';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!panning) return;
    const delta = e.clientX - startX;
    // Grow first, so the requested offset is in bounds by the time we apply it.
    // Re-anchoring the origin keeps the canvas glued to the cursor.
    startScrollLeft += maybeExtendRange(startScrollLeft - delta);
    ganttPanel.scrollLeft = startScrollLeft - delta;
  });

  document.addEventListener('mouseup', () => {
    if (!panning) return;
    panning = false;
    ganttPanel.style.cursor = '';
  });

  // Wheel, trackpad and scrollbar. Skipped mid-drag because the pan handler
  // above calls maybeExtendRange itself in order to compensate the drag origin.
  ganttPanel.addEventListener('scroll', () => {
    const movedX = ganttPanel.scrollLeft !== lastScrollLeft;
    lastScrollLeft = ganttPanel.scrollLeft; // kept fresh even mid-drag
    if (panning) return;
    if (!movedX) return; // vertical-only scroll
    maybeExtendRange();
    lastScrollLeft = ganttPanel.scrollLeft;
  });
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
  const cur  = startOfDay(new Date(start));
  const last = startOfDay(new Date(end));
  while (cur <= last) {
    days.push(new Date(cur));
    // Step by calendar day, not by 86400000ms: a fixed-ms step drifts across
    // DST changes and duplicates or skips a day (e.g. 25 Oct 2026 in the UK).
    cur.setDate(cur.getDate() + 1);
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
  const r = startOfDay(d); // calendar-day arithmetic, so DST can't shift the result
  r.setDate(r.getDate() + n);
  return r;
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
