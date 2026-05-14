import { getState, addTodo, updateTodo, deleteTodo, uuid } from './store.js';
import { showToast } from './modal.js';

const SECTION_ID = 'todo-section';

// ── Render ────────────────────────────────────────────────────
export function renderTodoSection(container) {
  let section = document.getElementById(SECTION_ID);
  const isNew = !section;

  if (isNew) {
    section = document.createElement('div');
    section.id = SECTION_ID;
    container.appendChild(section);
  }

  const todos = getState().todos || [];
  const collapsed = section.dataset.collapsed === 'true';

  section.innerHTML = `
    <div class="todo-header">
      <span class="todo-toggle">${collapsed ? '▶' : '▼'}</span>
      <span class="todo-title">To-Do List</span>
      <span class="todo-count">${todos.length}</span>
      <button class="todo-add-btn" title="Add item">+</button>
    </div>
    <div class="todo-list ${collapsed ? 'hidden' : ''}">
      ${todos.length === 0
        ? '<div class="todo-empty">No items yet. Click + to add one.</div>'
        : todos.map(t => todoItemHTML(t)).join('')}
    </div>
  `;

  section.querySelector('.todo-toggle').addEventListener('click', () => {
    section.dataset.collapsed = collapsed ? 'false' : 'true';
    renderTodoSection(container);
  });

  section.querySelector('.todo-title').addEventListener('click', () => {
    section.dataset.collapsed = collapsed ? 'false' : 'true';
    renderTodoSection(container);
  });

  section.querySelector('.todo-add-btn').addEventListener('click', e => {
    e.stopPropagation();
    openTodoModal();
  });

  section.querySelectorAll('.todo-item-edit').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = btn.closest('.todo-item').dataset.id;
      const todo = (getState().todos || []).find(t => t.id === id);
      if (todo) openTodoModal(todo);
    });
  });

  section.querySelectorAll('.todo-item-delete').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = btn.closest('.todo-item').dataset.id;
      const todo = (getState().todos || []).find(t => t.id === id);
      if (todo && confirm(`Delete "${todo.name}"?`)) deleteTodo(id);
    });
  });

  // Expand item detail on click
  section.querySelectorAll('.todo-item').forEach(item => {
    item.addEventListener('click', () => {
      item.classList.toggle('expanded');
    });
  });
}

function todoItemHTML(todo) {
  const assignees = todo.assignees?.length
    ? todo.assignees.map(a => `<span class="assignee-chip">${a.split(' ')[0]}</span>`).join('')
    : '';
  const desc = todo.description
    ? `<div class="todo-item-desc">${esc(todo.description)}</div>`
    : '';
  const fullAssignees = todo.assignees?.length
    ? `<div class="todo-item-assignees-full">${todo.assignees.map(a => esc(a)).join(', ')}</div>`
    : '';

  return `
    <div class="todo-item" data-id="${todo.id}">
      <div class="todo-item-main">
        <span class="todo-bullet">•</span>
        <span class="todo-item-name">${esc(todo.name)}</span>
        <div class="todo-item-chips">${assignees}</div>
        <div class="todo-item-actions">
          <button class="todo-item-edit" title="Edit">✎</button>
          <button class="todo-item-delete" title="Delete">✕</button>
        </div>
      </div>
      <div class="todo-item-detail">
        ${desc}
        ${fullAssignees}
      </div>
    </div>
  `;
}

// ── Modal ─────────────────────────────────────────────────────
function openTodoModal(existing = null) {
  const overlay = document.getElementById('modal-overlay');
  const titleEl = document.getElementById('modal-title');
  const bodyEl  = document.getElementById('modal-body');
  const saveBtn = document.getElementById('modal-save');
  const cancelBtn = document.getElementById('modal-cancel');
  const closeBtn  = document.getElementById('modal-close');
  const deleteBtn = document.getElementById('modal-delete');

  titleEl.textContent = existing ? 'Edit To-Do Item' : 'Add To-Do Item';
  deleteBtn.classList.toggle('hidden', !existing);

  bodyEl.innerHTML = `
    <div class="field">
      <label>Name *</label>
      <input type="text" id="td-name" value="${esc(existing?.name || '')}" placeholder="e.g. Book kick-off meeting" />
    </div>
    <div class="field">
      <label>Description</label>
      <textarea id="td-desc" placeholder="Optional details…">${esc(existing?.description || '')}</textarea>
    </div>
    <div class="field">
      <label>Assignees</label>
      <div class="tag-input-wrap" id="td-tag-wrap">
        ${(existing?.assignees || []).map(a => `<span class="tag" data-name="${a}">${a}<button type="button" data-remove="${a}">&times;</button></span>`).join('')}
        <input type="text" id="td-tag-text" placeholder="Type a name, press Enter" />
      </div>
    </div>
  `;

  overlay.classList.remove('hidden');
  bodyEl.querySelector('#td-name').focus();

  // Tag input
  const wrap  = bodyEl.querySelector('#td-tag-wrap');
  const input = bodyEl.querySelector('#td-tag-text');

  function addTag(name) {
    name = name.trim();
    if (!name || wrap.querySelector(`[data-name="${name}"]`)) return;
    const span = document.createElement('span');
    span.className = 'tag';
    span.dataset.name = name;
    span.innerHTML = `${name}<button type="button" data-remove="${name}">&times;</button>`;
    wrap.insertBefore(span, input);
    input.value = '';
  }

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); addTag(input.value); }
    if (e.key === 'Backspace' && !input.value) wrap.querySelectorAll('.tag')[wrap.querySelectorAll('.tag').length - 1]?.remove();
  });
  wrap.addEventListener('click', e => {
    if (e.target.dataset.remove) e.target.closest('.tag').remove();
    else input.focus();
  });

  function getAssignees() {
    return [...wrap.querySelectorAll('.tag')].map(t => t.dataset.name);
  }

  function onSave() {
    const name = bodyEl.querySelector('#td-name').value.trim();
    if (!name) { alert('Name is required.'); return; }
    const description = bodyEl.querySelector('#td-desc').value.trim();
    const assignees = getAssignees();
    if (existing) {
      updateTodo(existing.id, { name, description, assignees });
    } else {
      addTodo({ id: uuid(), name, description, assignees });
    }
    close();
  }

  function onDelete() {
    if (confirm(`Delete "${existing.name}"?`)) { deleteTodo(existing.id); close(); }
  }

  function close() {
    overlay.classList.add('hidden');
    saveBtn.onclick = null;
    cancelBtn.onclick = null;
    closeBtn.onclick = null;
    deleteBtn.onclick = null;
    document.removeEventListener('keydown', onEsc);
  }

  function onEsc(e) { if (e.key === 'Escape') close(); }

  saveBtn.onclick   = onSave;
  cancelBtn.onclick = close;
  closeBtn.onclick  = close;
  deleteBtn.onclick = onDelete;
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); }, { once: true });
  document.addEventListener('keydown', onEsc);
}

function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
