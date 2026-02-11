# DeepKit Hub: Unified Command Center PRD
**Version:** 1.0
**Owner:** Sreedeep / DeepKit Core
**Philosophy:** A nostalgic, developer-friendly CRT-inspired web UI that serves as the central nerve center for DeepKit's entire sovereign toolchain.

---

## Strategic Overview

### Problem
You have 25+ dockerized tools (n8n, Strapi, Ollama, Neo4j, etc.) scattered across different ports and UIs. New users (coders and non-coders alike) have **no central entry point**—they need to know ports, tool names, and context switching is friction.

### Solution
**DeepKit Hub**: A single, beautiful CRT-style web dashboard that:
1. Serves as **mission control** for all tools.
2. Provides **quick-access cards** (Kanban-style blocks) to launch any tool.
3. Integrates **DeepKit Dock** (port management) directly into the hub.
4. Integrates **DeepKit Recorder** as a sidebar tool.
5. Shows **Hardware Pulse** widget (system stats).
6. Pulls **DeepKit Docs** into an intra-hub wiki/reference panel.
7. Maintains the **CRT scanline aesthetic** globally—no jarring color shifts between tools.

The hub is the **home screen**. Everything else is a spoke.

---

## 1. DeepKit Hub Architecture

### 1.1. Visual Language (Locked to Brand Bible V4.0)

**Color Modes (Context-Aware):**

- **CORE** (Cyber Teal `#00F0FF`): Dashboard, primary UI, hub itself.
- **OG_RETRO** (Phosphor Green `#39FF14`): LLM/Ollama runtimes, terminal-style outputs.
- **UTILITY** (Bright Amber `#FFB000`): Docs, security logs, high-contrast readability.
- **STEALTH** (Ghost Mono `#A0A0A0`): Background processes, logs, low-strain late-night mode.

**Aesthetic Rules (Non-Negotiable):**

- Global `background: #000000`.
- No rounded corners. All containers: `2px solid [Mode Color]`.
- Text: Mode Color with `1px text-shadow glow`.
- CRT scanline overlay (fixed `::after` on body, 5% opacity scanline texture).
- Vector-style mascot (**The Deep**) in header, loading screens, and success banners.
- High-contrast mono/vector fonts (no anti-aliased fonts; crisp vector outlines).

**Audio Cues (Haptic Feedback):**

- `TACTILE_CLICK` (0.05s 8-bit key sound): All interactions.
- `SUCCESS_CHIME` (0.2s ascending beep): Tool launch, workflow complete.
- `PAGE_TRANSITION` (0.1s low-freq sweep): Tab/tool switching.
- `ALERT_BUZZ` (100Hz 0.1s tone): Port conflict, connectivity loss.

---

### 1.2. Hub Layout (Wireframe)

```
┌─────────────────────────────────────────────────────────────┐
│ [🔱 THE DEEP] DeepKit Hub  v4.0  |  Cyber Teal Mode  [⚙️]  │ ← Global Header
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────  QUICK ACCESS ──────────────────┐  │
│  │  [n8n Automation]  [Strapi CMS]  [Ollama LLM]  [...]  │  │
│  │  [Neo4j Graph]     [Supabase]     [Railway Deploy]     │  │
│  │  [Harbor Dock]     [Recorder]     [Docs Wiki]          │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────────────────  HARDWARE PULSE ────────────────────┐  │
│  │ CPU: 34% │ RAM: 62% │ Disk: 71% │ Network: Active   │  │
│  │ [████░░░░] [██████░░░░] [███████░░░]  [⚡ 24.5 MB/s] │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────────────────  DOCK STATUS ──────────────────────┐   │
│  │ Ports in Use: 12 / 65535                             │   │
│  │ [⚠️  Conflict on 3000] [✓ 8000 Free] [📌 5432 DB]    │   │
│  │ [🎮 Suggest Port] [⭐ View All]                      │   │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────────────────  RECENT ACTIVITY ─────────────────┐   │
│  │ • Started Ollama LLM on 11000 (2 min ago)           │   │
│  │ • Recorder: Captured UI demo (45s, saved)           │   │
│  │ • n8n workflow: Email->DB automation live           │   │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Core Hub Components

### 2.1. Global Header (Always Visible)

**Left side:**
- **Logo + Mascot**: The Deep vector illustration (small, ~40px).
- **Hub Title**: "DeepKit Hub" in vector mono font.
- **Version**: v4.0 (or current).

**Right side:**
- **Mode Selector** (dropdown or toggle):
  - CORE (Cyber Teal) — default.
  - OG_RETRO (Phosphor Green).
  - UTILITY (Bright Amber).
  - STEALTH (Ghost Mono).
- **Settings** (gear icon).
- **Status Indicator** (green dot = all systems nominal, yellow = warning, red = critical).

**Behavior:**
- Sticky at top, always visible.
- On mode change: global theme transition (0.2s), `PAGE_TRANSITION` audio cue.

---

### 2.2. Quick Access Kanban Grid

**What it is:**
A card-based grid (like a Kanban board, but static) showing all 25+ tools + the new DeepKit modules.

**Card structure:**
```
┌────────────────────┐
│  [Tool Icon/Emoji] │
│  n8n Automation    │
│  📍 Port 5000      │
│  ◉ Running         │
│  [LAUNCH]          │
└────────────────────┘
```

**Properties:**
- Each card: `2px solid [Mode Color]`, no rounded corners.
- Icon: Vector style or mono emoji.
- Tool name: Bold vector font.
- Port display: Small, dimmed text.
- Status indicator:
  - Green circle (◉) = running.
  - Yellow circle (◐) = idle but available.
  - Red circle (◎) = error/stopped.
- Launch button: Teal text, glowing on hover, plays `TACTILE_CLICK`.

**Interaction:**
- Click card → opens tool in new tab (or modal, depending on tool).
- Hover → slight glow effect, border brightens.
- Right-click → context menu (stop, restart, logs, etc.).

**Grid layout:**
- Responsive 4–6 columns on desktop, 2–3 on tablet, 1 on mobile.
- Scroll horizontally or vertically (user's choice).
- Tools can be reordered (drag-and-drop, persisted to local config).

**Special cards (always pinned):**
1. **Harbor Dock** — Port management UI.
2. **Recorder** — Screen recording launcher.
3. **Docs Wiki** — DeepKit documentation.

---

### 2.3. Hardware Pulse Widget

**What it is:**
A real-time system stats display (CPU, RAM, disk, network).

**Layout:**
```
┌─────────────────────────────────────────────┐
│ CPU: 34%  │  RAM: 62%  │  Disk: 71%       │
│ [████░░░░]  [██████░░░░]  [███████░░░]     │
│                                             │
│ Network: Active                             │
│ ⬆️  24.5 MB/s  │  ⬇️  18.3 MB/s            │
└─────────────────────────────────────────────┘
```

**Technical:**
- Poll `/api/system-stats` every 1–2 seconds.
- Bars use Mode Color for fill, `#333333` for background.
- Network stats show active connections (Docker, IDE, etc.).
- Click to expand into a detailed "System Monitor" modal.

**Alerts:**
- If CPU > 85%, bar flashes amber.
- If RAM > 90%, bar flashes red + `ALERT_BUZZ` sound (optional).
- Tooltip on hover: "RAM usage spike: Ollama inference running."

---

### 2.4. Dock Status Panel (DeepKit Dock Integration)

**What it is:**
A simplified version of the full Dock UI, showing:
- Total ports in use.
- Conflict alerts.
- Quick "suggest port" button.
- Link to full Dock UI.

**Layout:**
```
┌──────────────────────────────────────────────────┐
│ 🚢 Harbor Dock Status                            │
│ Ports in Use: 12 / 65535                         │
│                                                  │
│ ⚠️  CONFLICT: Port 3000 used by 2 processes     │
│    Process A (node) vs. Process B (python)       │
│    [Resolve] [Ignore]                            │
│                                                  │
│ ✓ 8000 Free  │  ✓ 5173 Free  │  📌 5432 (DB)    │
│                                                  │
│ [🎮 Suggest Port]  [⭐ View All Ports]           │
└──────────────────────────────────────────────────┘
```

**Behavior:**
- Shows conflicts in real-time.
- [Suggest Port] button → opens modal, suggests a safe port, allows instant reserve.
- [View All Ports] → navigates to full Dock UI.

---

### 2.5. Recent Activity Log

**What it is:**
A scrollable list of the last 10–15 events.

**Events logged:**
- Tool startup/shutdown.
- Port assignments/conflicts.
- Recording save.
- Workflow execution.
- System alerts.

**Style:**
```
• Started Ollama LLM on 11000 (2 min ago)
• Recorder: Captured UI demo (45s, saved to ~/DeepKit/Recordings)
• n8n workflow: Email->DB automation live (27s runtime)
• ⚠️  Port 3000 conflict detected (5 min ago) — resolved
```

---

## 3. DeepKit Dock (Port Manager) — Hub Integration

### 3.1. Full Dock UI (Separate Page)

When user clicks "Harbor Dock" card or "[View All Ports]" link, they navigate to `/dock`.

**Layout:**

```
┌──────────────────────────────────────────────────────────────┐
│ [🔱] DeepKit > Harbor Dock  |  Cyber Teal Mode  | [← Hub]    │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  [All Ports ▼]  [Search: ____]  [Project: All ▼]            │
│                                                                │
│  ┌─ PORT HEATMAP (0–65535) ───────────────────────────────┐ │
│  │ System       │ Dev Ports      │ Services      │ Misc    │ │
│  │ 0–1023       │ 1024–9999      │ 10000–49999   │ 50000+  │ │
│  │ [RED]        │ [GREEN/YEL]    │ [AMBER]       │ [GRAY]  │ │
│  │ [●●●●○○○]   │ [●●○○○○○○○○]  │ [●●●●●○○○○]  │ [●○○]   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌─ PORT TABLE ────────────────────────────────────────────┐ │
│  │ Port │ Process     │ PID   │ Project     │ Type      │   │ │
│  │ ────────────────────────────────────────────────────── │   │ │
│  │ 3000 │ node        │ 1234  │ project-foo │ frontend  │   │ │
│  │ 3001 │ python      │ 5678  │ (system)    │ API       │   │ │
│  │ 5173 │ vite        │ 9012  │ project-foo │ dev-test  │   │ │
│  │ 8000 │ (free)      │ —     │ —           │ —         │   │ │
│  │ 5432 │ postgres    │ 3456  │ (docker)    │ database  │   │ │
│  │ ════ │ ════════════│ ══════│ ════════════│ ═════════ │   │ │
│  │ [➕ Add Port] [🎮 Suggest] [⭐ Clear Conflict]        │   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌─ PORT PERSONALITY (Gamification) ──────────────────────┐ │
│  │ 🏆 Port 3000: "The Starter"  (7 day streak)           │   │
│  │ 🌟 Port 8000: "The Classic"  (Most stable)            │   │
│  │ 🎮 Port 6969: "The Cheeky"   (Unlocked!)              │   │
│  │                                                         │   │
│  │ [View Leaderboard] [Achievements]                      │   │
│  └────────────────────────────────────────────────────────┘ │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

### 3.2. Dock Features (Full Detail)

**Port Scanner:**
- Real-time polling (2–5s interval).
- Show all ports 0–65535.
- Identify system services (AirPlay on 5001, mDNS, etc.) on macOS.
- Join with Docker API data.

**Port Heatmap:**
- Horizontal spectrum showing port density.
- Color zones:
  - Red (0–1023): System (dangerous to touch).
  - Green/Yellow (1024–9999): Dev ports (your playground).
  - Amber (10000–49999): Services & utilities.
  - Gray (50000+): Misc / ephemeral.
- Click zone to filter table.

**Port Table:**
- Sortable columns: Port, Process, PID, Project, Type.
- Filters:
  - Show only "My Projects".
  - Show only "System".
  - Show only "Conflicts".
  - Search by port number or process name.

**Port Personality (Gamification):**
- Each port has a character: "The Starter" (3000), "The Classic" (8000), "The Cheeky" (6969), etc.
- Stats per port:
  - Uptime.
  - Conflicts resolved.
  - Projects using it.
- Leaderboard: "Ports ranked by stability and use."
- Achievements: "7-day streak on port 3000", "Resolved 5 conflicts", etc.

**Suggestion Engine:**
- [🎮 Suggest] button → Modal:
  ```
  Type: [Frontend ▼]  Project: [project-foo ▼]  Cluster? [Yes/No]

  Recommended: 3300
  (Next free in frontend_range, matches your preference history)

  [Reserve 3300]  [See Alternatives: 3301, 3302, 3303]
  ```
- Returns port + optional cluster (3300, 3301, 3302).

**Conflict Resolution:**
- If port is taken by something unexpected:
  ```
  ⚠️  Port 3000 is in use by process X (not your project).

  Options:
  [Kill Process X]  [Reassign to 3300]  [Ignore]
  ```

---

## 4. DeepKit Recorder (Hub Integration)

### 4.1. Quick Launch from Hub

**Recorder card in Quick Access grid:**
```
┌────────────────────┐
│  📹 DeepKit        │
│  Recorder          │
│  ◉ Ready           │
│  [LAUNCH]          │
└────────────────────┘
```

Click → opens `/recorder` in modal or new tab.

### 4.2. Recorder UI

**Layout:**
```
┌──────────────────────────────────────────────────────────┐
│ [🔱] DeepKit Recorder  |  [← Back to Hub]                │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  Mode: [Full Screen ▼]  Audio: [Mic + System ▼]         │
│                                                            │
│  [🔴 START]  [⏸ PAUSE]  [⏹ STOP]  |  Duration: 00:45    │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐│
│  │ 📍 Preview / Annotation Canvas                        ││
│  │ [Drawing] [Arrow] [Text] [Cursor Highlight]          ││
│  │                                                       ││
│  │ [Video preview area — your screen capture]           ││
│  │                                                       ││
│  └──────────────────────────────────────────────────────┘│
│                                                            │
│  Project: [project-foo ▼]  Notes: [____________]         │
│  [💾 Save Recording]  [⭐ Save + Archive]                │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

**Features:**
- **Mode selector**: Full screen, window, region, browser tab.
- **Audio control**: Mic, system audio, both, none.
- **Recording controls**: Start, pause, stop (with duration).
- **Annotation tools**: Draw, arrow, text, cursor highlight (Screenity-style).
- **Project association**: Link recording to a DeepKit project (n8n, Strapi, etc.).
- **Save options**: Download as .webm, or archive to `~/DeepKit/Recordings` with JSON metadata.

**Post-recording:**
```
✓ Recording saved!

📹 demo-ui-flow.webm (1:23, 45 MB)
Project: project-foo
Metadata: [Edit notes, tags, etc.]

[↓ Download]  [🗂️ View in Folder]  [🎬 Edit]  [🗑️ Delete]
```

---

## 5. DeepKit Docs (Hub Integration)

### 5.1. Docs Wiki

**Accessible from:**
- Hub Quick Access card: "Docs Wiki".
- Footer link on all pages: "[📖 Docs]".

**Layout:**
```
┌──────────────────────────────────────────────────────────┐
│ [🔱] DeepKit Docs  |  Search: [_____] [← Hub]            │
├──────────────────────────────────────────────────────────┤
│                                                            │
│ [Getting Started] [Tools] [Dock] [Recorder] [API] [FAQ]  │
│                                                            │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Getting Started                                      │ │
│ │                                                      │ │
│ │ Welcome to DeepKit. DeepKit is a curated, privacy-  │ │
│ │ first ecosystem of 25+ tools running locally.       │ │
│ │                                                      │ │
│ │ [Next: Understanding Ports]                         │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

**Content:**
- Written in Markdown.
- Served from `~/DeepKit/Docs/` or bundled.
- Searchable (client-side or server-side).
- Linked to tools (e.g., "Dock" docs auto-expand when viewing `/dock`).

**Styling:**
- Consistent with Hub aesthetic (Cyber Teal headers, vector font, scanlines).
- Code blocks use `OG_RETRO` (Phosphor Green) for syntax highlighting.

---

## 6. Technical Architecture

### 6.1. Tech Stack

**Frontend:**
- Framework: React + TypeScript.
- Styling: CSS-in-JS with design tokens (for mode switching).
- Charts/Visualizations: D3.js or simple Canvas for heatmap.
- Audio: Web Audio API for haptic cues.
- Bundling: Vite (fast dev, clean build).

**Backend:**
- Runtime: Node.js.
- Framework: Express or Fastify (lightweight).
- APIs:
  - `/api/ports/list` — all ports in use.
  - `/api/ports/suggest` — smart port suggestion.
  - `/api/system-stats` — CPU, RAM, disk, network.
  - `/api/tools` — list of available tools with metadata.
  - `/api/recordings` — list saved recordings.

**Database/Storage:**
- Local JSON file for port preferences + project mappings.
- SQLite (optional, if you want structured queries later).
- File system for recordings (`~/DeepKit/Recordings/`).

**Integration Points:**
- **Docker API**: Query running containers, port mappings.
- **OS-level**: `lsof -i`, `netstat`, or `ss` for port enumeration.
- **IDE Extensions**: (future) VS Code, JetBrains plugin to query DeepKit API.

### 6.2. Port Architecture (Tied to Brand Bible)

Enforce global port ranges:

```
3000–3999   [THE FACE]     User Dashboards, front-end tools.
5000–5999   [THE ENGINE]   Automation (n8n), APIs.
6000–7999   [THE VAULT]    Databases, storage, caching.
11000+      [THE BRAIN]    AI & LLM runtimes (Ollama, etc.).
```

**Dock suggests ports respecting these zones.**

### 6.3. Deployment

**Option A: Standalone Electron app**
- Wrap Hub + Dock + Recorder as a native macOS/Windows app.
- One-click launch, always running in background.

**Option B: Browser-based SPA**
- Served from a local Node server (e.g., `http://localhost:7777/`).
- User bookmarks it or adds to home screen.

**Recommendation for MVP: Option B** (simpler, cross-platform, faster iteration).

---

## 7. User Flows

### 7.1. New User Onboarding

1. User launches DeepKit Hub for first time.
2. Hub shows welcome banner with The Deep mascot:
   ```
   "Welcome to DeepKit. I'm The Deep—your personal AI curator.
    Let me show you around."
   ```
3. Interactive walkthrough:
   - "Here are your tools. Click any card to launch."
   - "This is Harbor Dock. It's your port manager."
   - "And this is Recorder. Save demos of your work."
4. User clicks "I'm Ready" → banner disappears, hub loads normally.

### 7.2. Developer Workflow (Typical)

1. Morning: Opens DeepKit Hub.
2. Sees Hardware Pulse, status of all tools.
3. Sees Dock alerts if any port conflicts.
4. Wants to spin up a new dev server:
   - Clicks "Harbor Dock" → goes to `/dock`.
   - Clicks [🎮 Suggest] → selects "frontend" + project name.
   - Gets suggested port 3300.
   - Starts dev server on 3300.
5. Later: Records a UI demo with Recorder.
   - Selects "Full Screen" + "Mic + System Audio".
   - Records for 2 min, annotates key UI elements.
   - Saves to project, associates with `project-foo`.
6. Posts demo to Slack, link from Recordings folder.

### 7.3. Conflict Resolution

1. User gets `ALERT_BUZZ` sound (100Hz, 0.1s).
2. Dock status panel shows:
   ```
   ⚠️  CONFLICT: Port 3000 used by 2 processes
   ```
3. User clicks "Resolve".
4. Modal offers:
   - [Kill the other process]
   - [Reassign my dev server to 3300]
   - [Ignore]
5. User picks "Reassign" → Dock updates, dev server automatically told to use 3300.

---

## 8. Acceptance Criteria

### DeepKit Hub v1

- [ ] Landing page loads with Cyber Teal theme, scanline overlay, vector font.
- [ ] Header with logo, mode selector, status indicator.
- [ ] Quick Access grid shows all 25+ tools + Dock + Recorder + Docs.
- [ ] Clicking any tool card launches it (opens new tab or modal).
- [ ] Hardware Pulse widget updates in real-time (CPU, RAM, disk, network).
- [ ] Dock Status panel shows top conflicts, free ports, suggest button.
- [ ] Recent Activity log shows last 10–15 events.
- [ ] Mode switching (CORE → OG_RETRO → UTILITY → STEALTH) applies globally.
- [ ] Audio cues play on all interactions (TACTILE_CLICK, etc.).
- [ ] All UI respects `#000000` background, no rounded corners, Mode Color text + glow.

### Harbor Dock v1

- [ ] Full Dock UI at `/dock` with port heatmap + table.
- [ ] Real-time port scanning (shows all in-use ports + PID, process name).
- [ ] System port identification (macOS AirPlay 5001, etc.).
- [ ] Docker integration (shows container ports).
- [ ] Port Suggestion engine (`suggest --type frontend --project foo` returns port + cluster).
- [ ] Stable port mapping (persists project → port assignment).
- [ ] Conflict detection + one-click resolution.
- [ ] Gamification layer (port personality, leaderboard, achievements).
- [ ] CLI / HTTP API for IDE integration.

### DeepKit Recorder v1

- [ ] Recorder UI at `/recorder` with mode + audio controls.
- [ ] Can record full screen, window, or region.
- [ ] Audio: mic, system, both, or none.
- [ ] Annotation tools (draw, arrow, text, cursor highlight).
- [ ] Saves as .webm locally to `~/DeepKit/Recordings/`.
- [ ] JSON metadata sidecar per recording (project, timestamp, notes).
- [ ] Associates recording with DeepKit project.

### Docs v1

- [ ] Wiki at `/docs` with searchable content.
- [ ] Getting Started guide.
- [ ] Tool-specific docs (Dock, Recorder, etc.).
- [ ] API reference.
- [ ] Consistent styling (Cyber Teal, vector font, scanlines).

---

## 9. Success Metrics

1. **User retention**: >80% of first-time users return within 7 days.
2. **Tool adoption**: Users launch ≥3 different tools per week.
3. **Port conflicts**: 0 unresolved conflicts in the first month (via Dock).
4. **Recording usage**: ≥1 recording per user per week (engagement metric).
5. **NPS**: Minimum 50+ (strong satisfaction).

---

## 10. Timeline & Phases

**Phase 1 (Weeks 1–2): Core Hub + Dock**
- Hub landing page, mode switching, mascot.
- Dock port scanner, suggestion engine, basic table.
- Audio cues.

**Phase 2 (Week 3): Recorder + Docs**
- Recorder UI, screen capture, annotation.
- Docs wiki with markdown support.

**Phase 3 (Week 4): Polish + Gamification**
- Port personality, leaderboard, achievements.
- Performance optimization, edge case handling.

**Phase 4+ (Future): IDE Integration, Mobile, Clustering**
- VS Code extension, JetBrains plugin.
- Mobile web app (responsive).
- Multi-machine port coordination.

---

**This is your unified DeepKit Hub PRD.** All modular, all local, all CRT-styled.
