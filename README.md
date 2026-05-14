# ICS Project Planner
### AI Transformation Programme

An interactive, browser-based Gantt chart tool for planning and tracking the ICS AI Transformation Programme. All data is saved locally to a JSON file — no cloud, no database, no build step.

---

## Features

- **Gantt chart** — day-resolution timeline with month/day headers, weekend shading, and a today marker
- **Drag & drop** — move bars to shift dates; drag left/right edges to resize
- **Projects, Tasks & Sub-tasks** — full hierarchy with collapse/expand in both the sidebar and the chart
- **Assignees** — free-text tag-style input on each task
- **Add / Edit / Delete** — full CRUD via modals and right-click (`⋮`) context menus
- **Date navigation** — Prev / Next month buttons, Today re-centre, and custom date range pickers
- **Auto-save** — every change is debounced and written to `data/projects.json` within 500ms
- **Persistent state** — collapsed/expanded rows survive page refresh

---

## Requirements

- [Node.js](https://nodejs.org/) v18 or later

---

## Getting Started

```bash
# 1. Install dependencies (Express only)
npm install

# 2. Start the server
npm start
```

Then open **http://localhost:3003** in your browser.

The server serves the frontend as static files and exposes two API endpoints:

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/data` | Read all project data |
| `POST` | `/api/data` | Write all project data |

---

## Data Storage

All data is stored in `data/projects.json` relative to the project root. This file is created automatically on first run if it doesn't exist.

To reset to a blank slate, clear the `projects` array in the file:

```json
{ "projects": [] }
```

---

## Project Structure

```
/
├── server.js               # Express server
├── package.json
├── data/
│   └── projects.json       # All project data (auto-created)
└── public/
    ├── index.html
    ├── css/
    │   └── main.css
    └── js/
        ├── app.js          # Entry point
        ├── api.js          # Fetch wrapper for the REST API
        ├── store.js        # In-memory state + auto-save
        ├── gantt.js        # Gantt chart rendering and drag interactions
        ├── sidebar.js      # Project tree panel
        └── modal.js        # Add/edit modals and toast notifications
```

---

## Usage Tips

- **Add a project** — click `+ Add Project` in the top-right corner
- **Add a task** — hover a project row in the sidebar and click `⋮` → Add Task
- **Add a sub-task** — hover a task row and click `⋮` → Add Sub-task
- **Edit anything** — click a Gantt bar, or use `⋮` → Edit on any sidebar row
- **Move a task** — drag the middle of its Gantt bar left or right
- **Resize a task** — drag the left or right edge of its Gantt bar
- **Collapse a project** — click the `▼` triangle next to a project or task name
- **Rename a project** — double-click its name in the sidebar
