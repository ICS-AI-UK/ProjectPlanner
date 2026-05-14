import { uuid, PALETTE, nextColour, addProject, updateProject, deleteProject, addTask, updateTask, deleteTask, addSubtask, updateSubtask, deleteSubtask, addChildItem, updateItemById, deleteItemById, getState } from './store.js';

const overlay  = document.getElementById('modal-overlay');
const modalEl  = document.getElementById('modal');
const titleEl  = document.getElementById('modal-title');
const bodyEl   = document.getElementById('modal-body');
const saveBtn  = document.getElementById('modal-save');
const cancelBtn= document.getElementById('modal-cancel');
const closeBtn = document.getElementById('modal-close');
const deleteBtn= document.getElementById('modal-delete');

let currentSaveFn = null;
let currentDeleteFn = null;

function open(title, bodyHTML, onSave, onDelete = null) {
  titleEl.textContent = title;
  bodyEl.innerHTML = bodyHTML;
  currentSaveFn = onSave;
  currentDeleteFn = onDelete;
  deleteBtn.classList.toggle('hidden', !onDelete);
  overlay.classList.remove('hidden');
  bodyEl.querySelector('input,textarea')?.focus();
}

export function closeModal() {
  overlay.classList.add('hidden');
  currentSaveFn = null;
  currentDeleteFn = null;
}

saveBtn.addEventListener('click', () => { currentSaveFn?.(); });
cancelBtn.addEventListener('click', closeModal);
closeBtn.addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
deleteBtn.addEventListener('click', () => {
  if (currentDeleteFn && confirm('Are you sure you want to delete this? This cannot be undone.')) {
    currentDeleteFn();
    closeModal();
  }
});

// ── Colour palette UI ─────────────────────────────────────────
function renderPalette(selectedColour) {
  return `<div class="colour-palette" id="colour-palette">
    ${PALETTE.map(c => `
      <div class="colour-swatch ${c === selectedColour ? 'selected' : ''}"
           style="background:${c}" data-colour="${c}" title="${c}"></div>
    `).join('')}
  </div>`;
}

function bindPalette(container) {
  let selected = container.querySelector('.colour-swatch.selected')?.dataset.colour || PALETTE[0];
  container.querySelectorAll('.colour-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      container.querySelectorAll('.colour-swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
      selected = sw.dataset.colour;
    });
  });
  return { getColour: () => selected };
}

// ── Tag input UI ──────────────────────────────────────────────
function renderTagInput(assignees = []) {
  return `<div class="tag-input-wrap" id="tag-input-wrap">
    ${assignees.map(a => tagHTML(a)).join('')}
    <input type="text" id="tag-text" placeholder="Type a name, press Enter" />
  </div>`;
}

function tagHTML(name) {
  return `<span class="tag" data-name="${name}">${name}<button type="button" data-remove="${name}">&times;</button></span>`;
}

function bindTagInput(container) {
  const wrap = container.querySelector('#tag-input-wrap');
  const input = container.querySelector('#tag-text');

  function addTag(name) {
    name = name.trim();
    if (!name) return;
    if (wrap.querySelector(`[data-name="${name}"]`)) return;
    const span = document.createElement('span');
    span.className = 'tag';
    span.dataset.name = name;
    span.innerHTML = `${name}<button type="button" data-remove="${name}">&times;</button>`;
    wrap.insertBefore(span, input);
    input.value = '';
  }

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); addTag(input.value); }
    if (e.key === 'Backspace' && !input.value) {
      const tags = wrap.querySelectorAll('.tag');
      tags[tags.length - 1]?.remove();
    }
  });

  wrap.addEventListener('click', e => {
    if (e.target.dataset.remove) e.target.closest('.tag').remove();
    else input.focus();
  });

  return {
    getAssignees: () => [...wrap.querySelectorAll('.tag')].map(t => t.dataset.name),
  };
}

// ── Project modal ─────────────────────────────────────────────
export function openAddProject() {
  const colour = nextColour();
  const html = `
    <div class="field">
      <label>Project Name *</label>
      <input type="text" id="f-name" placeholder="e.g. Data Platform Modernisation" />
    </div>
    <div class="field">
      <label>Colour</label>
      ${renderPalette(colour)}
    </div>`;

  open('Add Project', html, () => {
    const name = bodyEl.querySelector('#f-name').value.trim();
    if (!name) { alert('Project name is required.'); return; }
    const { getColour } = bindPalette(bodyEl);
    addProject({ id: uuid(), name, colour: bodyEl.querySelector('.colour-swatch.selected')?.dataset.colour || colour, collapsed: false, tasks: [] });
    closeModal();
  });

  bindPalette(bodyEl);
}

export function openEditProject(project) {
  const html = `
    <div class="field">
      <label>Project Name *</label>
      <input type="text" id="f-name" value="${esc(project.name)}" />
    </div>
    <div class="field">
      <label>Colour</label>
      ${renderPalette(project.colour)}
    </div>`;

  open('Edit Project', html,
    () => {
      const name = bodyEl.querySelector('#f-name').value.trim();
      if (!name) { alert('Project name is required.'); return; }
      updateProject(project.id, { name, colour: bodyEl.querySelector('.colour-swatch.selected')?.dataset.colour || project.colour });
      closeModal();
    },
    () => deleteProject(project.id)
  );

  bindPalette(bodyEl);
}

// ── Task / subtask modal ──────────────────────────────────────
function taskFormHTML(task = {}) {
  return `
    <div class="field">
      <label>Task Name *</label>
      <input type="text" id="f-name" value="${esc(task.name || '')}" placeholder="e.g. Discovery Phase" />
    </div>
    <div class="field">
      <label>Description</label>
      <textarea id="f-desc" placeholder="Optional details…">${esc(task.description || '')}</textarea>
    </div>
    <div class="field">
      <label>Assignees</label>
      ${renderTagInput(task.assignees || [])}
    </div>
    <div class="field-row">
      <div class="field">
        <label>Start Date *</label>
        <input type="date" id="f-start" value="${task.startDate || ''}" />
      </div>
      <div class="field">
        <label>End Date *</label>
        <input type="date" id="f-end" value="${task.endDate || ''}" />
      </div>
    </div>`;
}

function readTaskForm(getAssignees) {
  const name = bodyEl.querySelector('#f-name').value.trim();
  const description = bodyEl.querySelector('#f-desc').value.trim();
  const startDate = bodyEl.querySelector('#f-start').value;
  const endDate = bodyEl.querySelector('#f-end').value;
  const assignees = getAssignees();

  if (!name) { alert('Task name is required.'); return null; }
  if (!startDate) { alert('Start date is required.'); return null; }
  if (!endDate) { alert('End date is required.'); return null; }
  if (startDate > endDate) { alert('Start date must be before end date.'); return null; }
  return { name, description, startDate, endDate, assignees };
}

export function openAddTask(projectId) {
  const defaults = defaultTaskDates(projectId);
  open('Add Task', taskFormHTML(defaults), () => {
    const data = readTaskForm(tagBind.getAssignees);
    if (!data) return;
    addTask(projectId, { id: uuid(), ...data, collapsed: false, subtasks: [] });
    closeModal();
  });
  const tagBind = bindTagInput(bodyEl);
}

function defaultTaskDates(projectId) {
  const project = getState().projects.find(p => p.id === projectId);
  const tasks = project?.tasks ?? [];
  if (!tasks.length) return {};
  const lastEnd = tasks.map(t => t.endDate).sort().at(-1);
  if (!lastEnd) return {};
  const start = addDays(lastEnd, 1);
  const end   = addDays(lastEnd, 6);
  return { startDate: start, endDate: end };
}

function addDays(isoDate, n) {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function openEditTask(projectId, task) {
  open('Edit Task', taskFormHTML(task),
    () => {
      const data = readTaskForm(tagBind.getAssignees);
      if (!data) return;
      updateTask(projectId, task.id, data);
      closeModal();
    },
    () => deleteTask(projectId, task.id)
  );
  const tagBind = bindTagInput(bodyEl);
}

export function openAddSubtask(projectId, parentId) {
  open('Add Sub-task', taskFormHTML(), () => {
    const data = readTaskForm(tagBind.getAssignees);
    if (!data) return;
    addChildItem(projectId, parentId, { id: uuid(), ...data, subtasks: [] });
    closeModal();
  });
  const tagBind = bindTagInput(bodyEl);
}

export function openEditSubtask(projectId, subtask) {
  open('Edit Sub-task', taskFormHTML(subtask),
    () => {
      const data = readTaskForm(tagBind.getAssignees);
      if (!data) return;
      updateItemById(projectId, subtask.id, data);
      closeModal();
    },
    () => deleteItemById(projectId, subtask.id)
  );
  const tagBind = bindTagInput(bodyEl);
}

// ── Toast ─────────────────────────────────────────────────────
const toastContainer = document.getElementById('toast-container');

export function showToast(message, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  toastContainer.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// ── Helpers ───────────────────────────────────────────────────
function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
