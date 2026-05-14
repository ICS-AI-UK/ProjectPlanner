import { saveData } from './api.js';
import { showToast } from './modal.js';

const PALETTE = [
  '#4A90E2','#7ED321','#F5A623','#D0021B','#9B59B6',
  '#1ABC9C','#E67E22','#2ECC71','#3498DB','#E74C3C',
];

let state = { projects: [] };
let listeners = [];
let saveTimer = null;

export function getState() { return state; }

export function setState(newState, { silent = false } = {}) {
  state = newState;
  scheduleSave();
  if (!silent) notify();
}

export function subscribe(fn) {
  listeners.push(fn);
  return () => { listeners = listeners.filter(l => l !== fn); };
}

function notify() {
  listeners.forEach(fn => fn(state));
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await saveData(state);
      showToast('Saved', 'success');
    } catch {
      showToast('Save failed — retrying…', 'error');
      setTimeout(async () => {
        try { await saveData(state); showToast('Saved', 'success'); }
        catch { showToast('Save failed. Check the server is running.', 'error'); }
      }, 2000);
    }
  }, 500);
}

// ── UUID ──────────────────────────────────────────────────────
export function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ── Palette ───────────────────────────────────────────────────
export function nextColour() {
  const used = state.projects.map(p => p.colour);
  const unused = PALETTE.filter(c => !used.includes(c));
  return unused.length ? unused[0] : PALETTE[state.projects.length % PALETTE.length];
}

export { PALETTE };

// ── Project helpers ───────────────────────────────────────────
export function addProject(project) {
  setState({ ...state, projects: [...state.projects, project] });
}

export function updateProject(id, patch) {
  setState({
    ...state,
    projects: state.projects.map(p => p.id === id ? { ...p, ...patch } : p),
  });
}

export function deleteProject(id) {
  setState({ ...state, projects: state.projects.filter(p => p.id !== id) });
}

export function reorderProjects(fromId, toId, position) {
  const projects = [...state.projects];
  const fromIdx = projects.findIndex(p => p.id === fromId);
  const toIdx   = projects.findIndex(p => p.id === toId);
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;
  const [moved] = projects.splice(fromIdx, 1);
  const insertAt = position === 'above' ? toIdx : toIdx + 1;
  projects.splice(fromIdx < toIdx ? insertAt - 1 : insertAt, 0, moved);
  setState({ ...state, projects });
}

export function promoteToSubtask(projectId, taskId, parentTaskId) {
  setState({
    ...state,
    projects: state.projects.map(p => {
      if (p.id !== projectId) return p;
      const task = p.tasks.find(t => t.id === taskId);
      if (!task) return p;
      const { collapsed: _c, ...subTask } = task;
      return {
        ...p,
        tasks: p.tasks
          .filter(t => t.id !== taskId)
          .map(t => t.id !== parentTaskId ? t : { ...t, subtasks: [...t.subtasks, subTask] }),
      };
    }),
  });
}

export function demoteFromSubtask(projectId, parentTaskId, subtaskId) {
  setState({
    ...state,
    projects: state.projects.map(p => {
      if (p.id !== projectId) return p;
      const parent = p.tasks.find(t => t.id === parentTaskId);
      const sub = parent?.subtasks.find(s => s.id === subtaskId);
      if (!sub) return p;
      const parentIdx = p.tasks.findIndex(t => t.id === parentTaskId);
      const tasks = p.tasks.map(t =>
        t.id !== parentTaskId ? t : { ...t, subtasks: t.subtasks.filter(s => s.id !== subtaskId) }
      );
      tasks.splice(parentIdx + 1, 0, { ...sub, collapsed: false, subtasks: sub.subtasks || [] });
      return { ...p, tasks };
    }),
  });
}

export function reorderTasks(projectId, fromId, toId, position) {
  setState({
    ...state,
    projects: state.projects.map(p => {
      if (p.id !== projectId) return p;
      const tasks = [...p.tasks];
      const fromIdx = tasks.findIndex(t => t.id === fromId);
      const toIdx   = tasks.findIndex(t => t.id === toId);
      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return p;
      const [moved] = tasks.splice(fromIdx, 1);
      const insertAt = position === 'above' ? toIdx : toIdx + 1;
      tasks.splice(fromIdx < toIdx ? insertAt - 1 : insertAt, 0, moved);
      return { ...p, tasks };
    }),
  });
}

// ── Todo helpers ──────────────────────────────────────────────
export function addTodo(todo) {
  setState({ ...state, todos: [...(state.todos || []), todo] });
}

export function updateTodo(id, patch) {
  setState({
    ...state,
    todos: (state.todos || []).map(t => t.id === id ? { ...t, ...patch } : t),
  });
}

export function deleteTodo(id) {
  setState({ ...state, todos: (state.todos || []).filter(t => t.id !== id) });
}

// ── Task helpers ──────────────────────────────────────────────
export function addTask(projectId, task) {
  setState({
    ...state,
    projects: state.projects.map(p =>
      p.id === projectId ? { ...p, tasks: [...p.tasks, task] } : p
    ),
  });
}

export function updateTask(projectId, taskId, patch) {
  setState({
    ...state,
    projects: state.projects.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        tasks: p.tasks.map(t => t.id === taskId ? { ...t, ...patch } : t),
      };
    }),
  });
}

export function deleteTask(projectId, taskId) {
  setState({
    ...state,
    projects: state.projects.map(p => {
      if (p.id !== projectId) return p;
      return { ...p, tasks: p.tasks.filter(t => t.id !== taskId) };
    }),
  });
}

// ── Subtask helpers ───────────────────────────────────────────
export function addSubtask(projectId, taskId, subtask) {
  setState({
    ...state,
    projects: state.projects.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        tasks: p.tasks.map(t => {
          if (t.id !== taskId) return t;
          return { ...t, subtasks: [...t.subtasks, subtask] };
        }),
      };
    }),
  });
}

export function updateSubtask(projectId, taskId, subtaskId, patch) {
  setState({
    ...state,
    projects: state.projects.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        tasks: p.tasks.map(t => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            subtasks: t.subtasks.map(s => s.id === subtaskId ? { ...s, ...patch } : s),
          };
        }),
      };
    }),
  });
}

export function deleteSubtask(projectId, taskId, subtaskId) {
  setState({
    ...state,
    projects: state.projects.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        tasks: p.tasks.map(t => {
          if (t.id !== taskId) return t;
          return { ...t, subtasks: t.subtasks.filter(s => s.id !== subtaskId) };
        }),
      };
    }),
  });
}

// ── Generic tree helpers (work at any depth) ──────────────────
function treeFind(items, id) {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.subtasks?.length) {
      const found = treeFind(item.subtasks, id);
      if (found) return found;
    }
  }
  return null;
}

function treeUpdate(items, id, patch) {
  return items.map(item => {
    if (item.id === id) return { ...item, ...patch };
    if (item.subtasks?.length) return { ...item, subtasks: treeUpdate(item.subtasks, id, patch) };
    return item;
  });
}

function treeRemove(items, id) {
  return items
    .filter(item => item.id !== id)
    .map(item => item.subtasks?.length ? { ...item, subtasks: treeRemove(item.subtasks, id) } : item);
}

function treeAddChild(items, parentId, child) {
  return items.map(item => {
    if (item.id === parentId) return { ...item, subtasks: [...(item.subtasks || []), child] };
    if (item.subtasks?.length) return { ...item, subtasks: treeAddChild(item.subtasks, parentId, child) };
    return item;
  });
}

function treeReorderChildren(items, parentId, fromId, toId, position) {
  return items.map(item => {
    if (item.id === parentId) {
      const children = [...(item.subtasks || [])];
      const fromIdx = children.findIndex(c => c.id === fromId);
      const toIdx   = children.findIndex(c => c.id === toId);
      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return item;
      const [moved] = children.splice(fromIdx, 1);
      const insertAt = position === 'above' ? toIdx : toIdx + 1;
      children.splice(fromIdx < toIdx ? insertAt - 1 : insertAt, 0, moved);
      return { ...item, subtasks: children };
    }
    if (item.subtasks?.length) return { ...item, subtasks: treeReorderChildren(item.subtasks, parentId, fromId, toId, position) };
    return item;
  });
}

export function findInTree(projectId, itemId) {
  const project = state.projects.find(p => p.id === projectId);
  if (!project) return null;
  return treeFind(project.tasks, itemId);
}

export function addChildItem(projectId, parentId, child) {
  setState({
    ...state,
    projects: state.projects.map(p => {
      if (p.id !== projectId) return p;
      return { ...p, tasks: treeAddChild(p.tasks, parentId, child) };
    }),
  });
}

export function updateItemById(projectId, itemId, patch) {
  setState({
    ...state,
    projects: state.projects.map(p => {
      if (p.id !== projectId) return p;
      return { ...p, tasks: treeUpdate(p.tasks, itemId, patch) };
    }),
  });
}

export function deleteItemById(projectId, itemId) {
  setState({
    ...state,
    projects: state.projects.map(p => {
      if (p.id !== projectId) return p;
      return { ...p, tasks: treeRemove(p.tasks, itemId) };
    }),
  });
}

export function reorderChildren(projectId, parentId, fromId, toId, position) {
  setState({
    ...state,
    projects: state.projects.map(p => {
      if (p.id !== projectId) return p;
      return { ...p, tasks: treeReorderChildren(p.tasks, parentId, fromId, toId, position) };
    }),
  });
}

export function moveItemToParent(projectId, itemId, newParentId) {
  setState({
    ...state,
    projects: state.projects.map(p => {
      if (p.id !== projectId) return p;
      const item = treeFind(p.tasks, itemId);
      if (!item) return p;
      const tasksRemoved = treeRemove(p.tasks, itemId);
      const tasksAdded   = treeAddChild(tasksRemoved, newParentId, { ...item });
      return { ...p, tasks: tasksAdded };
    }),
  });
}

export function moveItemToTopLevel(projectId, itemId) {
  setState({
    ...state,
    projects: state.projects.map(p => {
      if (p.id !== projectId) return p;
      const item = treeFind(p.tasks, itemId);
      if (!item) return p;
      const tasksRemoved = treeRemove(p.tasks, itemId);
      const newTask = { ...item, collapsed: item.collapsed ?? false, subtasks: item.subtasks || [] };
      return { ...p, tasks: [...tasksRemoved, newTask] };
    }),
  });
}
