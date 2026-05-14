# Implementation Plan
## AI Transformation Programme — Project Planning Tool

---

## Phase 1 — Project Scaffold

- [x] Create folder structure (`public/css/`, `public/js/`, `data/`)
- [x] Create `package.json` with Express as the only dependency
- [x] Create `data/projects.json` with empty projects array as seed data
- [x] Create `server.js` — Express server with `GET /api/data`, `POST /api/data`, and static file serving
- [x] Verify server starts and API endpoints respond correctly with `curl` or browser

---

## Phase 2 — Frontend Shell

- [x] Create `public/index.html` with semantic layout: header, left panel, Gantt panel
- [x] Create `public/css/main.css` — base reset, layout grid (header + two-panel split), fonts, colour variables
- [x] Create `public/js/app.js` — entry point, calls `api.js` on load, wires up top-level event listeners
- [x] Create `public/js/api.js` — `fetchData()` and `saveData(state)` using Fetch API, with error handling and retry logic
- [x] Create `public/js/store.js` — in-memory state object, `getState()`, `setState()`, `subscribe()` for re-render triggers

---

## Phase 3 — Data Layer

- [x] Define and document the full in-memory state shape (mirrors `projects.json` schema)
- [x] Implement `store.js` helpers: `addProject`, `updateProject`, `deleteProject`
- [x] Implement `store.js` helpers: `addTask`, `updateTask`, `deleteTask`
- [x] Implement `store.js` helpers: `addSubtask`, `updateSubtask`, `deleteSubtask`
- [x] Implement UUID generation utility (self-contained, no library)
- [x] Implement debounced auto-save: any state change triggers `saveData` after 500ms
- [x] Seed `projects.json` with realistic sample data (3 projects, varied tasks/sub-tasks, spanning 3 months)

---

## Phase 4 — Left Panel (Project Tree)

- [x] Create `public/js/sidebar.js` — renders project/task/sub-task tree from state
- [x] Render project rows: coloured dot, name, expand/collapse triangle, `⋮` menu button
- [x] Render task rows: indented, name, assignee chips (truncated), expand/collapse triangle, `⋮` menu button
- [x] Render sub-task rows: further indented, name, assignee chips, `⋮` menu button (no expand arrow)
- [x] Implement expand/collapse toggle for project rows (hides all child task + sub-task rows)
- [x] Implement expand/collapse toggle for task rows (hides sub-task rows only)
- [x] Persist collapsed state to store (and therefore to JSON) on each toggle
- [x] Implement inline project name editing (double-click name → contenteditable → blur to save)
- [x] Wire `⋮` context menu for projects: Edit, Add Task, Delete Project
- [x] Wire `⋮` context menu for tasks: Edit, Add Sub-task, Delete Task
- [x] Wire `⋮` context menu for sub-tasks: Edit, Delete Sub-task
- [x] Implement resizable divider between left panel and Gantt panel (drag to resize, min 200px, max 450px)

---

## Phase 5 — Gantt Chart Rendering

- [x] Create `public/js/gantt.js` — owns the Gantt DOM container and all rendering
- [x] Implement date range calculation (default: 3 months centred on today)
- [x] Render time axis — row 1: month labels spanning correct column widths
- [x] Render time axis — row 2: day number labels (1–31)
- [x] Shade weekend columns (Saturday/Sunday) with subtle background
- [x] Render today marker — red vertical line + date label
- [x] Render one row per visible project/task/sub-task, vertically synchronised with left panel
- [x] Render task bars: correct horizontal position and width based on start/end dates, project colour
- [x] Render sub-task bars: lighter shade (70% opacity), indented 20px
- [x] Skip rendering bars for collapsed rows
- [x] Synchronise vertical scroll between left panel and Gantt panel

---

## Phase 6 — Gantt Interactions

- [x] Implement bar hover tooltip: name, assignees, start–end date range
- [x] Implement drag-to-move: dragging bar body shifts both start and end dates
- [x] Implement drag-to-resize start: dragging left edge adjusts start date (cannot exceed end date)
- [x] Implement drag-to-resize end: dragging right edge adjusts end date (cannot precede start date)
- [x] Snap all drag operations to whole-day increments
- [x] Enforce minimum 1-day task duration during resize
- [x] Update store and trigger re-render on drag end (not during drag — update bar visually during drag, persist on mouse-up)
- [x] Implement click-on-bar to open edit modal (distinguish from drag with a movement threshold)

---

## Phase 7 — Date Range Navigation

- [x] Add Prev / Next buttons in header — shift visible window by 1 month
- [x] Add Today button — recentre Gantt on today's date
- [x] Add "View from" and "View to" date pickers in header
- [x] Ensure Gantt re-renders correctly on any date range change

---

## Phase 8 — Add / Edit Modal

- [x] Create `public/js/modal.js` — renders and manages a single reusable modal overlay
- [x] Implement project modal: Name field, colour picker (palette of 10)
- [x] Implement task/sub-task modal: Name, Description (textarea), Assignees (tag input), Start date, End date
- [x] Implement tag-style assignee input: type name → Enter to add chip, × to remove chip
- [x] Validate required fields (Name, Start date, End date) before saving
- [x] Validate Start date is not after End date
- [x] Show Delete button in edit mode (hidden in add mode); confirm before delete
- [x] Wire modal Save → update store → close modal → re-render sidebar + Gantt
- [x] Wire modal Cancel → discard changes → close modal
- [x] Close modal on overlay click or Escape key

---

## Phase 9 — Error Handling & Polish

- [x] Implement toast notification component (bottom-right, auto-dismiss after 4s)
- [x] Show toast on save failure with retry behaviour (retry once after 2s)
- [x] Show toast on successful save (brief, subtle — "Saved")
- [x] Handle empty state — show "Add your first project" prompt when projects array is empty
- [x] Gracefully handle malformed or missing `projects.json` on server start (auto-create with empty array)
- [x] Auto-assign project colours from palette (cycle if > 10 projects)
- [ ] Ensure all interactions are keyboard-accessible (Tab navigation, Enter/Space to activate buttons)

---

## Phase 10 — Testing & Verification

- [x] Manually test: sidebar renders correctly with projects, tasks, sub-tasks
- [x] Manually test: Gantt bars render at correct positions with correct colours
- [x] Manually test: today line renders at correct date
- [x] Manually test: no console errors on load
- [x] Manually test: create project, add tasks and sub-tasks, verify JSON file updated
- [x] Manually test: drag bar to move dates, verify dates update correctly
- [x] Manually test: resize bar from left and right edges
- [x] Manually test: collapse/expand projects and tasks, verify Gantt rows hide/show
- [x] Manually test: edit and delete tasks via modal and context menu
- [x] Manually test: date range navigation (Prev, Next, Today buttons)
- [x] Manually test: page refresh — verify all data and collapsed state persists
- [ ] Manually test: save failure scenario (stop server while editing) — verify toast + retry
- [ ] Verify layout at 1280px, 1440px, and 1920px widths

---

## Completion Tracker

| Phase | Items | Done |
|---|---|---|
| 1 — Scaffold | 5 | 5 |
| 2 — Frontend Shell | 5 | 5 |
| 3 — Data Layer | 7 | 7 |
| 4 — Left Panel | 12 | 12 |
| 5 — Gantt Rendering | 11 | 11 |
| 6 — Gantt Interactions | 8 | 8 |
| 7 — Navigation | 4 | 4 |
| 8 — Modal | 10 | 10 |
| 9 — Polish | 7 | 6 |
| 10 — Testing | 13 | 11 |
| **Total** | **82** | **80** |
