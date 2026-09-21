import { getState, updateProject, updateTask, reorderProjects, reorderTasks, promoteToSubtask, demoteFromSubtask, updateItemById, deleteItemById, reorderChildren, moveItemToParent, moveItemToTopLevel, findInTree } from './store.js';
import { openEditProject, openAddTask, openEditTask, openAddSubtask, openEditSubtask, openAddMilestone, openEditMilestone } from './modal.js';

const sidebarInner = document.getElementById('sidebar-inner');
let activeMenu = null;

export function renderSidebar() {
  const { projects } = getState();
  const scrollTop = sidebarInner.scrollTop;
  sidebarInner.innerHTML = '';

  if (!projects.length) {
    sidebarInner.innerHTML = `<div class="empty-state"><p>No projects yet.</p><p>Click <strong>+ Add Project</strong> to get started.</p></div>`;
    return;
  }

  projects.forEach(project => {
    sidebarInner.appendChild(makeProjectRow(project));
    (project.milestones || []).forEach(milestone => {
      sidebarInner.appendChild(makeMilestoneRow(project, milestone));
    });
    if (!project.collapsed) {
      project.tasks.forEach(task => {
        sidebarInner.appendChild(makeTaskRow(project, task));
        if (!task.collapsed) {
          appendSubtreeRows(sidebarInner, project, task.id, task.subtasks, 1);
        }
      });
    }
  });

  sidebarInner.scrollTop = scrollTop;
}

function makeProjectRow(project) {
  const row = document.createElement('div');
  row.className = 'tree-row project-row';
  row.dataset.id = project.id;
  row.draggable = true;
  bindProjectDrag(row, project.id);

  const hasTasks = project.tasks.length > 0;
  const toggle = makeToggle(hasTasks, project.collapsed, () => {
    updateProject(project.id, { collapsed: !project.collapsed });
  });

  const dot = document.createElement('div');
  dot.className = 'project-dot';
  dot.style.background = project.colour;

  const name = document.createElement('div');
  name.className = 'tree-name';
  name.textContent = project.name;
  makeEditable(name, val => updateProject(project.id, { name: val }));

  const menu = makeMenuBtn([
    { label: 'Edit Project', action: () => openEditProject(project) },
    { label: 'Add Task', action: () => openAddTask(project.id) },
    { label: 'Add Milestone', action: () => openAddMilestone(project.id) },
    { label: 'Delete Project', danger: true, action: () => {
      if (confirm(`Delete project "${project.name}" and all its tasks?`)) {
        import('./store.js').then(m => m.deleteProject(project.id));
      }
    }},
  ]);

  row.append(toggle, dot, name, menu);
  return row;
}

function makeTaskRow(project, task) {
  const row = document.createElement('div');
  row.className = 'tree-row task-row';
  row.dataset.id = task.id;
  row.draggable = true;
  bindTaskDrag(row, project.id, task.id);

  const hasSubs = task.subtasks.length > 0;
  const toggle = makeToggle(hasSubs, task.collapsed, () => {
    updateTask(project.id, task.id, { collapsed: !task.collapsed });
  });

  const name = document.createElement('div');
  name.className = 'tree-name';
  name.textContent = task.name;

  const chips = makeChips(task.assignees);

  const menu = makeMenuBtn([
    { label: 'Edit Task', action: () => openEditTask(project.id, task) },
    { label: 'Add Sub-task', action: () => openAddSubtask(project.id, task.id) },
    { label: 'Delete Task', danger: true, action: () => {
      if (confirm(`Delete task "${task.name}"?`)) {
        import('./store.js').then(m => m.deleteTask(project.id, task.id));
      }
    }},
  ]);

  row.append(toggle, name, chips, menu);
  return row;
}

function appendSubtreeRows(container, project, parentId, subtasks, depth) {
  subtasks.forEach(sub => {
    container.appendChild(makeSubtaskRow(project, parentId, sub, depth));
    if (!sub.collapsed && sub.subtasks?.length) {
      appendSubtreeRows(container, project, sub.id, sub.subtasks, depth + 1);
    }
  });
}

function makeSubtaskRow(project, parentId, sub, depth) {
  const row = document.createElement('div');
  row.className = 'tree-row subtask-row';
  row.dataset.id = sub.id;
  row.dataset.parentId = parentId;
  row.style.paddingLeft = `${44 + (depth - 1) * 16}px`;
  row.draggable = true;
  bindSubtaskDrag(row, project.id, parentId, sub.id);

  const hasSubs = sub.subtasks?.length > 0;
  const toggle = makeToggle(hasSubs, sub.collapsed, () => {
    updateItemById(project.id, sub.id, { collapsed: !sub.collapsed });
  });

  const name = document.createElement('div');
  name.className = 'tree-name';
  name.textContent = sub.name;

  const chips = makeChips(sub.assignees);

  const menu = makeMenuBtn([
    { label: 'Edit Sub-task', action: () => openEditSubtask(project.id, sub) },
    { label: 'Add Sub-task', action: () => openAddSubtask(project.id, sub.id) },
    { label: 'Make top-level task', action: () => moveItemToTopLevel(project.id, sub.id) },
    { label: 'Delete Sub-task', danger: true, action: () => {
      if (confirm(`Delete sub-task "${sub.name}"?`)) {
        deleteItemById(project.id, sub.id);
      }
    }},
  ]);

  row.append(toggle, name, chips, menu);
  return row;
}

function makeMilestoneRow(project, milestone) {
  const row = document.createElement('div');
  row.className = 'tree-row milestone-row';

  const icon = document.createElement('div');
  icon.className = 'milestone-icon';
  icon.textContent = '◆';
  icon.style.color = project.colour;

  const name = document.createElement('div');
  name.className = 'tree-name';
  name.textContent = `${milestone.name} — ${milestone.date}`;

  row.append(icon, name);
  row.addEventListener('click', () => openEditMilestone(project.id, milestone));
  return row;
}

function makeToggle(hasChildren, collapsed, onClick) {
  const el = document.createElement('div');
  el.className = 'tree-toggle' + (hasChildren ? '' : ' placeholder');
  el.textContent = hasChildren ? (collapsed ? '▶' : '▼') : '';
  if (hasChildren) el.addEventListener('click', e => { e.stopPropagation(); onClick(); });
  return el;
}

function makeChips(assignees = []) {
  const wrap = document.createElement('div');
  wrap.className = 'assignee-chips';
  assignees.slice(0, 2).forEach(a => {
    const chip = document.createElement('span');
    chip.className = 'assignee-chip';
    chip.textContent = a.split(' ')[0];
    chip.title = a;
    wrap.appendChild(chip);
  });
  if (assignees.length > 2) {
    const more = document.createElement('span');
    more.className = 'assignee-chip';
    more.textContent = `+${assignees.length - 2}`;
    wrap.appendChild(more);
  }
  return wrap;
}

function makeMenuBtn(items) {
  const btn = document.createElement('button');
  btn.className = 'context-menu-btn';
  btn.textContent = '⋮';
  btn.addEventListener('click', e => {
    e.stopPropagation();
    closeActiveMenu();
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    items.forEach(item => {
      const b = document.createElement('button');
      b.className = 'context-menu-item' + (item.danger ? ' danger' : '');
      b.textContent = item.label;
      b.addEventListener('click', e => { e.stopPropagation(); closeActiveMenu(); item.action(); });
      menu.appendChild(b);
    });
    const rect = btn.getBoundingClientRect();
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.left = `${rect.left}px`;
    document.body.appendChild(menu);
    activeMenu = menu;
  });
  return btn;
}

// ── Drop indicator line ───────────────────────────────────────
const dropIndicator = (() => {
  const el = document.createElement('div');
  el.id = 'drop-indicator';
  document.body.appendChild(el);
  return {
    show(rect, position) {
      el.style.display = 'block';
      el.style.left   = `${rect.left}px`;
      el.style.width  = `${rect.width}px`;
      el.style.top    = `${position === 'above' ? rect.top : rect.bottom}px`;
    },
    hide() { el.style.display = 'none'; },
  };
})();

// ── Task drag-to-reorder / promote to sub-task ────────────────
let dragTaskSrcId     = null;
let dragTaskProjectId = null;

function getTaskZone(e, row) {
  const rect  = row.getBoundingClientRect();
  const ratio = (e.clientY - rect.top) / rect.height;
  if (ratio < 0.28) return 'above';
  if (ratio > 0.72) return 'below';
  return 'subtask';
}

function clearTaskDragStyles() {
  document.querySelectorAll('.drag-over-above, .drag-over-below, .drag-over-subtask')
    .forEach(el => el.classList.remove('drag-over-above', 'drag-over-below', 'drag-over-subtask'));
  dropIndicator.hide();
}

function bindTaskDrag(row, projectId, taskId) {
  row.addEventListener('dragstart', e => {
    dragTaskSrcId     = taskId;
    dragTaskProjectId = projectId;
    row.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
  });

  row.addEventListener('dragend', () => {
    dragTaskSrcId = null;
    dragTaskProjectId = null;
    row.classList.remove('dragging');
    clearTaskDragStyles();
  });

  row.addEventListener('dragover', e => {
    if (!dragTaskSrcId || dragTaskSrcId === taskId || dragTaskProjectId !== projectId) return;
    e.preventDefault();
    e.stopPropagation();
    clearTaskDragStyles();
    const zone = getTaskZone(e, row);
    const rect  = row.getBoundingClientRect();
    if (zone === 'subtask') {
      row.classList.add('drag-over-subtask');
    } else {
      dropIndicator.show(rect, zone);
    }
  });

  row.addEventListener('dragleave', e => {
    if (!row.contains(e.relatedTarget)) clearTaskDragStyles();
  });

  row.addEventListener('drop', e => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragTaskSrcId || dragTaskSrcId === taskId || dragTaskProjectId !== projectId) return;
    clearTaskDragStyles();
    const zone    = getTaskZone(e, row);
    const srcId   = dragTaskSrcId;
    const projId  = dragTaskProjectId;

    if (zone === 'subtask') {
      showSubtaskPopup(e.clientX, e.clientY, taskId, projId, () => {
        promoteToSubtask(projId, srcId, taskId);
      });
    } else {
      reorderTasks(projId, srcId, taskId, zone);
    }
  });
}

// ── Subtask drag-to-reorder / nest deeper ─────────────────────
let dragSubSrcId     = null;
let dragSubParentId  = null;
let dragSubProjectId = null;

function bindSubtaskDrag(row, projectId, parentId, subtaskId) {
  row.addEventListener('dragstart', e => {
    dragSubSrcId     = subtaskId;
    dragSubParentId  = parentId;
    dragSubProjectId = projectId;
    row.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
  });

  row.addEventListener('dragend', () => {
    dragSubSrcId = null;
    dragSubParentId = null;
    dragSubProjectId = null;
    row.classList.remove('dragging');
    clearTaskDragStyles();
  });

  row.addEventListener('dragover', e => {
    if (!dragSubSrcId || dragSubSrcId === subtaskId || dragSubParentId !== parentId) return;
    e.preventDefault();
    e.stopPropagation();
    clearTaskDragStyles();
    const zone = getTaskZone(e, row);
    const rect = row.getBoundingClientRect();
    if (zone === 'subtask') {
      row.classList.add('drag-over-subtask');
    } else {
      dropIndicator.show(rect, zone);
    }
  });

  row.addEventListener('dragleave', e => {
    if (!row.contains(e.relatedTarget)) clearTaskDragStyles();
  });

  row.addEventListener('drop', e => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragSubSrcId || dragSubSrcId === subtaskId || dragSubParentId !== parentId) return;
    clearTaskDragStyles();
    const zone   = getTaskZone(e, row);
    const srcId  = dragSubSrcId;
    const projId = dragSubProjectId;
    const parId  = dragSubParentId;

    if (zone === 'subtask') {
      showSubtaskPopup(e.clientX, e.clientY, subtaskId, projId, () => {
        moveItemToParent(projId, srcId, subtaskId);
      });
    } else {
      reorderChildren(projId, parId, srcId, subtaskId, zone);
    }
  });
}

function showSubtaskPopup(x, y, parentTaskId, projectId, onConfirm) {
  const parent = findInTree(projectId, parentTaskId);
  if (!parent) return;

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.left = `${Math.min(x, window.innerWidth - 240)}px`;
  menu.style.top  = `${y}px`;
  menu.innerHTML  = `
    <button class="context-menu-item subtask-confirm">Make sub-task of &ldquo;${esc(parent.name)}&rdquo;</button>
    <button class="context-menu-item">Cancel</button>
  `;
  document.body.appendChild(menu);

  menu.querySelector('.subtask-confirm').addEventListener('click', () => { menu.remove(); onConfirm(); });
  menu.querySelectorAll('.context-menu-item')[1].addEventListener('click', () => menu.remove());
  setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 0);
}

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Project drag-to-reorder ───────────────────────────────────
let dragSrcId = null;

function bindProjectDrag(row, projectId) {
  row.addEventListener('dragstart', e => {
    dragSrcId = projectId;
    row.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  row.addEventListener('dragend', () => {
    dragSrcId = null;
    row.classList.remove('dragging');
    dropIndicator.hide();
  });

  row.addEventListener('dragover', e => {
    if (!dragSrcId || dragSrcId === projectId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = row.getBoundingClientRect();
    const position = e.clientY < rect.top + rect.height / 2 ? 'above' : 'below';
    dropIndicator.show(rect, position);
  });

  row.addEventListener('dragleave', e => {
    if (!row.contains(e.relatedTarget)) dropIndicator.hide();
  });

  row.addEventListener('drop', e => {
    e.preventDefault();
    dropIndicator.hide();
    if (!dragSrcId || dragSrcId === projectId) return;
    const rect = row.getBoundingClientRect();
    const position = e.clientY < rect.top + rect.height / 2 ? 'above' : 'below';
    reorderProjects(dragSrcId, projectId, position);
  });
}

function closeActiveMenu() {
  activeMenu?.remove();
  activeMenu = null;
}

document.addEventListener('click', closeActiveMenu);

function makeEditable(el, onSave) {
  el.addEventListener('dblclick', () => {
    el.contentEditable = 'true';
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
  });
  el.addEventListener('blur', () => {
    el.contentEditable = 'false';
    onSave(el.textContent.trim());
  });
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
    if (e.key === 'Escape') { el.contentEditable = 'false'; }
  });
}

// ── Resizable divider ─────────────────────────────────────────
export function initDivider() {
  const divider = document.getElementById('divider');
  const sidebar = document.getElementById('sidebar');
  let dragging = false;
  let startX, startW;

  divider.addEventListener('mousedown', e => {
    dragging = true;
    startX = e.clientX;
    startW = sidebar.offsetWidth;
    divider.classList.add('dragging');
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const w = Math.min(450, Math.max(200, startW + e.clientX - startX));
    sidebar.style.width = `${w}px`;
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    divider.classList.remove('dragging');
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  });
}
