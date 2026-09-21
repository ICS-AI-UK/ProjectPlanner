import { fetchData, } from './api.js';
import { setState, subscribe, getState, deleteBankHoliday } from './store.js';
import { renderSidebar, initDivider } from './sidebar.js';
import { renderGantt, initDateRange, initNavButtons, syncScroll, initCanvasPan } from './gantt.js';
import { openAddProject, showToast, openAddBankHoliday, openEditBankHoliday } from './modal.js';
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
  initCanvasPan();

  subscribe(() => {
    renderSidebar();
    renderGantt();
    renderTodoSection(sidebarInner);
  });

  renderSidebar();
  renderGantt();
  renderTodoSection(sidebarInner);

  document.getElementById('btn-add-project').addEventListener('click', openAddProject);

  // Bank Holidays overlay
  const bankHolidaysOverlay = document.getElementById('bank-holidays-overlay');
  const bankHolidaysBody    = document.getElementById('bank-holidays-body');

  function renderBankHolidaysList() {
    const { bankHolidays = [] } = getState();
    bankHolidaysBody.innerHTML = '';
    if (!bankHolidays.length) {
      bankHolidaysBody.innerHTML = '<p style="color:var(--colour-text-muted);font-size:13px">No bank holidays added yet.</p>';
      return;
    }
    const sorted = [...bankHolidays].sort((a, b) => a.date.localeCompare(b.date));
    sorted.forEach(h => {
      const row = document.createElement('div');
      row.className = 'bh-row';
      const info = document.createElement('span');
      info.className = 'bh-info';
      info.textContent = `${h.name} — ${h.date}`;
      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-ghost btn-sm';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => openEditBankHoliday(h, renderBankHolidaysList));
      row.append(info, editBtn);
      bankHolidaysBody.appendChild(row);
    });
  }

  document.getElementById('btn-bank-holidays').addEventListener('click', () => {
    renderBankHolidaysList();
    bankHolidaysOverlay.classList.remove('hidden');
  });
  document.getElementById('bank-holidays-close').addEventListener('click', () => {
    bankHolidaysOverlay.classList.add('hidden');
  });
  bankHolidaysOverlay.addEventListener('click', e => {
    if (e.target === bankHolidaysOverlay) bankHolidaysOverlay.classList.add('hidden');
  });
  document.getElementById('bank-holidays-add').addEventListener('click', () => {
    openAddBankHoliday(renderBankHolidaysList);
  });

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
