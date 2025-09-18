/* global CONFIG */
const el = (sel, root = document) => root.querySelector(sel);
const els = (sel, root = document) => [...root.querySelectorAll(sel)];
const fmtPct = n => `${Math.round(n)}%`;

// ---------- tiny fetch helpers with good errors ----------
async function getJSON(url) {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  try {
    return await res.json();
  } catch (e) {
    throw new Error(`JSON parse failed for ${url}: ${e.message}`);
  }
}

async function getText(url) {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  return res.text();
}

// ---------- state ----------
const state = {
  data: null,
  view: "dashboard",
  day: "D1"
};

// ---------- data loading ----------
async function loadData() {
  const [prompts, sprints, roadmap, tasks, bugs, parking, decisions] =
    await Promise.all([
      getJSON("data/prompts.json"),
      getJSON("data/sprints.json"),
      getJSON("data/roadmap.json"),
      getJSON("data/tasks.json"),
      getJSON("data/bugs.json"),
      getJSON("data/parking.json"),
      getJSON("data/decisions.json")
    ]);
  const ssot = await getText("data/ssot.html");
  // minimal shape checks to avoid hard crashes later
  const safe = x => (Array.isArray(x) ? x : []);
  state.data = {
    prompts: safe(prompts),
    sprints: safe(sprints),
    roadmap: safe(roadmap),
    tasks: safe(tasks),
    bugs: safe(bugs),
    parking: safe(parking),
    decisions: safe(decisions),
    ssot: ssot || ""
  };
}

// ---------- computations ----------
function overallProgress() {
  const tasks = state.data.tasks || [];
  if (!tasks.length) return 0;
  const avg = tasks.reduce((a, t) => a + (Number(t.percent) || 0), 0) / tasks.length;
  return avg;
}

function byStatus() {
  const groups = { "Not started": [], "In progress": [], "Blocked": [], "Done": [] };
  (state.data.tasks || []).forEach(t => (groups[t.status] ?? groups["Not started"]).push(t));
  return groups;
}

function tasksForDay(day) {
  return (state.data.tasks || []).filter(t => t.day === day);
}

// ---------- GitHub config helpers (safe even if CONFIG isn't defined) ----------
function getCfg() {
  return (typeof window !== "undefined" && window.CONFIG) ? window.CONFIG : null;
}
function hasRepoConfig() {
  const c = getCfg();
  return !!(c && c.GITHUB_OWNER && c.GITHUB_REPO);
}

function issueURLForTaskUpdate(task) {
  const c = getCfg();
  if (!c) return null;
  const title = encodeURIComponent(`Task Update: ${task.id} ${task.title}`);
  const body = encodeURIComponent(
`<!-- edit fields below; keep JSON intact -->
{
  "taskId": "${task.id}",
  "status": "${task.status}",
  "percent": ${Number(task.percent) || 0},
  "note": "what changed",
  "owner": "@your-github-username"
}
`);
  const labels = encodeURIComponent("task-update");
  return `https://github.com/${c.GITHUB_OWNER}/${c.GITHUB_REPO}/issues/new?title=${title}&labels=${labels}&body=${body}`;
}

function issueURLForBug(task) {
  const c = getCfg();
  if (!c) return null;
  const title = encodeURIComponent(`Bug: ${task ? task.id + " " : ""}describe-problem`);
  const labels = encodeURIComponent("bug");
  const body = encodeURIComponent(
`Steps:
1. 
2. 
Expected: 
Actual:

Linked Task: ${task ? task.id : "N/A"}
Severity: Sev2
`);
  return `https://github.com/${c.GITHUB_OWNER}/${c.GITHUB_REPO}/issues/new?title=${title}&labels=${labels}&body=${body}`;
}


// ---------- rendering ----------
function render() {
  const app = el("#app");
  if (!state.data) {
    app.innerHTML = '<div class="panel">Loading…</div>';
    return;
  }

  const prog = overallProgress();

  if (state.view === "dashboard") {
    app.innerHTML = `
      <section class="grid cols-3">
        <div class="panel kpi">
          <div class="ring" style="--p:${prog}"></div>
          <div>
            <div class="h2">Overall progress</div>
            <div class="small muted">Average of all task percentages</div>
            <div class="h2">${fmtPct(prog)}</div>
          </div>
        </div>
        <div class="panel kpi">
          <div>
            <div class="h2">Tasks</div>
            <div class="small muted">Total and done</div>
            <div class="h2">${state.data.tasks.length} total • ${state.data.tasks.filter(t=>t.status==='Done').length} done</div>
          </div>
        </div>
        <div class="panel kpi">
          <div>
            <div class="h2">Today focus</div>
            <div class="small muted">Select a day on “Days” to focus</div>
            <div class="h2">${state.day}</div>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="h2">Live task board</div>
        ${renderBoard()}
      </section>

      <section class="grid cols-2">
        <div class="panel">
          <div class="h2">SSOT quick view</div>
          <div class="small muted">Single Source of Truth summary</div>
          <div class="code" style="max-height:180px;overflow:auto">${state.data.ssot}</div>
          <div class="footer-note">Open the SSOT tab for full content.</div>
        </div>
        <div class="panel">
          <div class="h2">Daily prompts library</div>
          <div class="small muted">Copy prompts for ChatGPT</div>
          ${renderPromptList()}
        </div>
      </section>
    `;
  }

  if (state.view === "days") {
    const day = state.day;
    const tasks = tasksForDay(day);
    const prompt = (state.data.prompts || []).find(p => p.day === day);
    app.innerHTML = `
      <section class="panel">
        <div class="toolbar">
          ${state.data.sprints.map(s => `
            <button class="btn ${s.day === day ? "nav-active" : ""}" data-day="${s.day}" data-action="set-day">${s.day}</button>
          `).join("")}
        </div>
        <div class="h2">Day ${day.slice(1)} plan</div>
        <div class="grid cols-2">
          <div class="panel">
            <div class="h2">Start prompt</div>
            <div class="code">${escapeHtml(prompt?.start || "No prompt found for this day.")}</div>
          </div>
          <div class="panel">
            <div class="h2">End prompt</div>
            <div class="code">${escapeHtml(prompt?.end || "No end prompt found for this day.")}</div>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="h2">Tasks for ${day}</div>
        <table class="table">
          <thead><tr><th>Task</th><th>Status</th><th>%</th><th>Priority</th><th>Actions</th></tr></thead>
          <tbody>
            ${tasks.map(t => `
              <tr>
                <td><strong>${t.id}</strong> ${t.title}<br><span class="small muted">${(t.checklist||[]).join(" • ")}</span></td>
                <td>${tagStatus(t.status)}</td>
                <td>${t.percent || 0}</td>
                <td>${t.priority}</td>
                <td>
                  ${renderIssueButtons(t)}
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </section>
    `;
  }

  if (state.view === "tasks") {
    app.innerHTML = `
      <section class="panel">
        <div class="h2">Kanban board</div>
        ${renderBoard()}
      </section>
    `;
  }

  if (state.view === "bugs") {
    app.innerHTML = `
      <section class="panel">
        <div class="h2">Bugs</div>
        <div class="toolbar">
          ${hasRepoConfig()
            ? `<a class="btn" href="${issueURLForBug()}" target="_blank">Report new bug</a>`
            : `<span class="btn" title="Set GITHUB_OWNER/REPO in data/config.js">Report new bug (configure repo)</span>`}
        </div>
        <table class="table">
          <thead><tr><th>Bug</th><th>Status</th><th>Severity</th></tr></thead>
          <tbody>
            ${state.data.bugs.map(b => `
            <tr>
              <td><strong>#${b.id}</strong> ${b.title}</td>
              <td>${tagStatus(b.status)}</td>
              <td>${b.severity}</td>
            </tr>`).join("")}
          </tbody>
        </table>
        <div class="note">Bugs list updates when issues are synced by workflow.</div>
      </section>
    `;
  }

  if (state.view === "docs") {
    app.innerHTML = `
      <section class="panel">
        <div class="h2">Single Source of Truth</div>
        <div class="code" style="white-space:normal">${state.data.ssot}</div>
      </section>
    `;
  }

  if (state.view === "decisions") {
    app.innerHTML = `
      <section class="panel">
        <div class="h2">Decisions log</div>
        <table class="table">
          <thead><tr><th>ID</th><th>Decision</th><th>Date</th><th>Impact</th></tr></thead>
          <tbody>
          ${state.data.decisions.map(d => `
            <tr>
              <td>${d.id}</td>
              <td>${d.decision}</td>
              <td>${d.date}</td>
              <td>${d.impact}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </section>
    `;
  }

  if (state.view === "parking") {
    app.innerHTML = `
      <section class="panel">
        <div class="h2">Parking Lot</div>
        <table class="table">
          <thead><tr><th>Idea</th><th>Area</th></tr></thead>
          <tbody>
          ${state.data.parking.map(p => `
            <tr>
              <td>${p.name}</td>
              <td>${p.area}</td>
            </tr>`).join("")}
          </tbody>
        </table>
        <div class="note">Use “New issue → Idea” to add items. Workflow can sync later.</div>
      </section>
    `;
  }

  if (state.view === "prompts") {
    app.innerHTML = `
      <section class="panel">
        <div class="h2">Prompts library</div>
        ${renderPromptList(true)}
      </section>
    `;
  }

  if (state.view === "demos") {
    app.innerHTML = `
      <section class="panel">
        <div class="h2">Demo gallery</div>
        <div class="grid cols-3">
          <div class="card"><h4>Café demo</h4><div class="small muted">link later</div></div>
          <div class="card"><h4>Barber demo</h4><div class="small muted">link later</div></div>
          <div class="card"><h4>Interior demo</h4><div class="small muted">link later</div></div>
        </div>
      </section>
    `;
  }

  if (state.view === "commands") {
    app.innerHTML = `
      <section class="panel">
        <div class="h2">Windows commands</div>
        <div class="code">node -v\nnpm -v\npnpm -v\ngit --version\npnpm i\npnpm dev</div>
        <div class="footer-note">Use VS Code Live Server or “npx serve” to test locally.</div>
      </section>
    `;
  }

  els(".nav button").forEach(b => b.classList.toggle("active", b.dataset.view === state.view));
  els(".ring").forEach(r => r.style.setProperty("--p", prog));
}

function renderIssueButtons(t) {
  if (!hasRepoConfig()) {
    return `<span class="btn" title="Set GITHUB_OWNER/REPO in data/config.js">Update (configure repo)</span>
            <span class="btn" title="Set GITHUB_OWNER/REPO in data/config.js">Bug (configure repo)</span>`;
  }
  return `
    <a class="btn" href="${issueURLForTaskUpdate(t)}" target="_blank">Update</a>
    <a class="btn" href="${issueURLForBug(t)}" target="_blank">Bug</a>
  `;
}

function renderBoard() {
  const groups = byStatus();
  const cols = Object.entries(groups).map(([k, items]) => `
    <div class="column">
      <div class="h2">${k} <span class="tag">${items.length}</span></div>
      ${items.map(t => `
        <div class="card">
          <h4>${t.id} · ${t.title}</h4>
          <div class="small muted">${t.day} · ${t.priority} · ${t.percent || 0}%</div>
          <div class="toolbar">
            ${renderIssueButtons(t)}
          </div>
        </div>
      `).join("")}
    </div>
  `).join("");
  return `<div class="board">${cols}</div>`;
}

function renderPromptList(includeDays = false) {
  const list = includeDays ? state.data.prompts : state.data.prompts.slice(0, 3);
  return `
    <table class="table">
      <thead><tr><th>Day</th><th>Start prompt</th><th>End prompt</th></tr></thead>
      <tbody>
        ${list.map(p => `
        <tr>
          <td>${p.day}</td>
          <td><div class="code">${escapeHtml(p.start)}</div></td>
          <td><div class="code">${escapeHtml(p.end)}</div></td>
        </tr>`).join("")}
      </tbody>
    </table>
  `;
}

function tagStatus(s) {
  const m = {
    "Done": "badge-ok",
    "In progress": "badge-warn",
    "Blocked": "badge-bad",
    "Not started": ""
  }[s] || "";
  return `<span class="tag ${m}">${s}</span>`;
}

function escapeHtml(s = "") {
  return String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

function wireNav() {
  els(".nav button").forEach(b => {
    b.addEventListener("click", () => {
      state.view = b.dataset.view;
      render();
    });
  });
  document.addEventListener("click", e => {
    const t = e.target.closest('[data-action="set-day"]');
    if (t) { state.day = t.dataset.day; render(); }
  });
}

// ---------- boot with safety net ----------
(function attachGlobalErrorPanels() {
  window.addEventListener("error", e => showFatal(e.error || e.message));
  window.addEventListener("unhandledrejection", e => showFatal(e.reason || e));
})();

function showFatal(err) {
  const app = el("#app");
  if (!app) return;
  console.error("Fatal:", err);
  app.innerHTML = `<div class="panel">
    <div class="h2">Load error</div>
    <div class="small muted">Open DevTools (F12) → Console for details. Likely a missing file or invalid JSON.</div>
    <pre class="code">${escapeHtml(String(err))}</pre>
  </div>`;
}

(async function init() {
  try {
    wireNav();
    await loadData();
    render();
  } catch (err) {
    showFatal(err);
  }
})();
