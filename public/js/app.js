import { fetchData, } from './api.js';
import { setState, subscribe } from './store.js';
import { renderSidebar, initDivider } from './sidebar.js';
import { renderGantt, initDateRange, initNavButtons, syncScroll } from './gantt.js';
import { openAddProject, showToast } from './modal.js';
import { renderTodoSection } from './todo.js';

const sidebarInner = document.getElementById('sidebar-inner');

async function boot() {
  try {
    const data = await fetchData();
    setState(data, { silent: true });
  } catch (e) {
    showToast('Could not load data from server. Is the server running?', 'error');
  }

  initDateRange();
  initNavButtons();
  initDivider();
  syncScroll();

  subscribe(() => {
    renderSidebar();
    renderGantt();
    renderTodoSection(sidebarInner);
  });

  renderSidebar();
  renderGantt();
  renderTodoSection(sidebarInner);

  document.getElementById('btn-add-project').addEventListener('click', openAddProject);

  const considerationsOverlay = document.getElementById('considerations-overlay');
  document.getElementById('btn-considerations').addEventListener('click', () => {
    considerationsOverlay.classList.remove('hidden');
  });
  document.getElementById('considerations-close').addEventListener('click', () => {
    considerationsOverlay.classList.add('hidden');
  });
  considerationsOverlay.addEventListener('click', e => {
    if (e.target === considerationsOverlay) considerationsOverlay.classList.add('hidden');
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') considerationsOverlay.classList.add('hidden');
  });
}

boot();
