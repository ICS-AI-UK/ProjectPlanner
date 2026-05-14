# Project Planning Tool — Specification
## AI Transformation Programme

**Version:** 1.0  
**Date:** 2026-05-08  
**Author:** ICS AI

---

## 1. Overview

A browser-based, interactive Gantt chart tool for planning and tracking the ICS AI Transformation Programme. Data is persisted to a local JSON file via a lightweight Node.js/Express backend. All editing is done in-place within the UI.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| Frontend | HTML5 + CSS3 + Vanilla JavaScript (ES Modules) |
| Data store | `data/projects.json` (relative to server root) |
| Charting | Custom canvas/SVG Gantt (no external charting library) |

No build tools, no framework, no bundler. Runs with `node server.js`.

---

## 3. File Structure

```
/project-planner/
├── server.js               # Express server — serves static files + REST API
├── package.json
├── data/
│   └── projects.json       # Persistent data store
└── public/
    ├── index.html
    ├── css/
    │   └── main.css
    └── js/
        ├── app.js          # Entry point, bootstraps the app
        ├── api.js          # Fetch wrapper for GET/POST /api/data
        ├── store.js        # In-memory state management
        ├── gantt.js        # Gantt chart rendering + interaction
        ├── sidebar.js      # Project/task tree panel (left sidebar)
        └── modal.js        # Add/edit modal dialogs
```

---

## 4. Data Model

### `projects.json` schema

```json
{
  "projects": [
    {
      "id": "uuid-v4",
      "name": "Project Alpha",
      "colour": "#4A90E2",
      "collapsed": false,
      "tasks": [
        {
          "id": "uuid-v4",
          "name": "Discovery Phase",
          "description": "Initial stakeholder interviews and requirements gathering.",
          "assignees": ["Alice Johnson", "Bob Smith"],
          "startDate": "2026-05-01",
          "endDate": "2026-05-15",
          "collapsed": false,
          "subtasks": [
            {
              "id": "uuid-v4",
              "name": "Stakeholder interviews",
              "description": "",
              "assignees": ["Alice Johnson"],
              "startDate": "2026-05-01",
              "endDate": "2026-05-07",
              "subtasks": []
            }
          ]
        }
      ]
    }
  ]
}
```

**Rules:**
- Sub-tasks support one level of nesting in v1 (sub-tasks cannot themselves have sub-tasks in the UI, but the schema supports it for future use).
- `colour` is auto-assigned from a palette on project creation; user can override.
- `collapsed` tracks the expand/collapse state of a project row or task row on the Gantt.
- Dates are ISO 8601 strings (`YYYY-MM-DD`).

---

## 5. Backend API

Served by `server.js` on `http://localhost:3000`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/data` | Returns full contents of `projects.json` |
| `POST` | `/api/data` | Overwrites `projects.json` with request body |
| `GET` | `/*` | Serves `public/` as static files |

The frontend holds the full state in memory, modifies it locally on every user action, then POSTs the entire state to `/api/data` to persist. No partial updates — simple last-write-wins.

---

## 6. UI Layout

```
┌──────────────────────────────────────────────────────────────┐
│  HEADER: App title | Date range controls | + Add Project btn  │
├────────────────┬─────────────────────────────────────────────┤
│                │  GANTT CHART (scrollable horizontally)        │
│  LEFT PANEL    │  ┌────────────────────────────────────────┐  │
│  Project tree  │  │ Month headers                          │  │
│  (fixed width) │  │ Day columns                            │  │
│                │  │ Today marker (red vertical line)       │  │
│  • Project A   │  │                                        │  │
│    ▼ Task 1    │  │  ████████████  ← task bar              │  │
│       Task 1a  │  │    ████        ← subtask bar           │  │
│       Task 1b  │  │                                        │  │
│    ▶ Task 2    │  │  ██████████████                        │  │
│  • Project B   │  │                                        │  │
└────────────────┴─────────────────────────────────────────────┘
```

- Left panel and Gantt rows are **vertically synchronised** (same row heights, scroll together).
- Horizontal scroll is on the Gantt panel only.
- Left panel is fixed-width (280px), resizable by dragging the divider.

---

## 7. Gantt Chart

### 7.1 Time Axis

- Default view: **3 months** centred on today.
- Header row 1: Month name + year (spanning all days in that month).
- Header row 2: Day numbers (1–31).
- Weekends shaded with a subtle background.
- **Today** shown as a red vertical line with a label.

### 7.2 Bars

- Each project has a header row (non-draggable, shows project colour label).
- Each task has a row; bars are coloured by their parent project's colour.
- Sub-tasks are indented 20px and use a lighter shade of the project colour.
- Bar height: 24px. Row height: 36px (6px padding above/below).

### 7.3 Interactions

| Interaction | Behaviour |
|---|---|
| Drag bar (middle) | Move task start + end dates together |
| Drag bar left edge | Resize: adjust start date |
| Drag bar right edge | Resize: adjust end date |
| Click bar | Open edit modal for that task |
| Click expand/collapse arrow (left panel) | Toggle visibility of sub-tasks in Gantt |
| Hover bar | Tooltip: name, assignees, start–end dates |

- Minimum task duration: 1 day.
- Dragging snaps to whole days.
- Start date cannot be dragged past end date, and vice versa.

### 7.4 Date Range Navigation

- **← Prev / Next →** buttons shift the visible window by 1 month.
- **Today** button recentres the view on today.
- Optional date pickers for "View from" / "View to" in the header.

---

## 8. Left Panel — Project Tree

- Lists all projects with a coloured dot.
- Each project row has:
  - Expand/collapse triangle (▶/▼) if it has tasks.
  - Project name (click to edit inline).
  - `⋮` context menu: Edit, Add Task, Delete Project.
- Each task row (indented) has:
  - Expand/collapse triangle if it has sub-tasks.
  - Task name.
  - Assignee chip(s) (truncated if multiple).
  - `⋮` context menu: Edit, Add Sub-task, Delete Task.
- Sub-task rows are further indented, no expand arrow.

---

## 9. Add / Edit Modal

A single reusable modal used for projects, tasks, and sub-tasks.

### Project fields
- Name (text, required)
- Colour (colour picker)

### Task / Sub-task fields
- Name (text, required)
- Description (textarea)
- Assignees (tag-style free-text input — type a name, press Enter to add, × to remove)
- Start date (date picker)
- End date (date picker)

Modal actions: **Save** | **Cancel** | **Delete** (red, only shown in edit mode).

---

## 10. Collapse / Expand Behaviour

- Clicking ▶/▼ on a project row toggles all its task rows (and their sub-tasks) in both the left panel and the Gantt simultaneously.
- Clicking ▶/▼ on a task row toggles only its sub-task rows.
- Collapsed state is persisted to `projects.json` so it survives page refresh.

---

## 11. Persistence Flow

1. On page load: `GET /api/data` → populate in-memory store → render UI.
2. On any data change (add/edit/delete/drag): update in-memory store → re-render → `POST /api/data` (debounced 500ms to avoid hammering on drag).
3. On POST error: show a non-blocking toast notification ("Save failed — retrying…") and retry once after 2 seconds.

---

## 12. Colour Palette

Projects are auto-assigned colours from this palette (cycling if more than 10):

```
#4A90E2  #7ED321  #F5A623  #D0021B  #9B59B6
#1ABC9C  #E67E22  #2ECC71  #3498DB  #E74C3C
```

Sub-task bars use the same hue at 70% opacity.

---

## 13. Constraints & Non-Goals (v1)

- No user authentication — single-user local tool only.
- No multi-user / real-time collaboration.
- No drag-to-reorder tasks within a project.
- No dependencies/arrows between tasks.
- No percentage-complete tracking.
- No export (PDF/image) in v1.
- Sub-tasks are one level deep in the UI.

---

## 14. Future Considerations (v2+)

- Export Gantt as PNG or PDF.
- Task dependency arrows.
- Drag-to-reorder tasks.
- Filter/search by assignee or project.
- Keyboard shortcuts for navigation.
- Dark mode.
