// app.js
/* LoomPages Project HQ logic – local-first state management and UI rendering */

const el  = (s, r=document) => r.querySelector(s);
const els = (s, r=document) => [ ...r.querySelectorAll(s) ];

const STORAGE_KEY = "LP_HQ_STATE_V5";
const OVERLAY_VERSION = 5;

const DAYS = ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10"];
const SPRINT_NAMES = {
  "D1": "Foundations",
  "D2": "Style Tokens",
  "D3": "Section Library v1",
  "D4": "Editor UX",
  "D5": "Rule Generator",
  "D6": "Export",
  "D7": "Optional AI Copy",
  "D8": "Quality & Stability",
  "D9": "Landing & Legal",
  "D10": "Hardening & Launch"
};
const TASKS = [
  { "id": "D1-T1", "day": "D1", "title": "Scaffold Next app and deploy skeleton", "checklist": [
      { "text": "Node LTS, PNPM, and Git installed", "done": false },
      { "text": "Create Next.js app (TypeScript)", "done": false },
      { "text": "Add Tailwind CSS, ShadCN UI, Zustand, Zod, dnd-kit", "done": false },
      { "text": "Initialize Git repo and push to GitHub", "done": false },
      { "text": "Connect Vercel and deploy app", "done": false },
      { "text": "Open live URL to verify deployment", "done": false }
    ]
  },
  { "id": "D1-T2", "day": "D1", "title": "Repo hygiene and CI basics", "checklist": [
      { "text": "Set up ESLint and Prettier", "done": false },
      { "text": "Enable strict TypeScript options", "done": false },
      { "text": "Write a README.md with project info", "done": false },
      { "text": "Add a LOG.md for daily notes (optional)", "done": false }
    ]
  },
  { "id": "D2-T1", "day": "D2", "title": "Map tokens to CSS variables", "checklist": [
      { "text": "Define color, font, spacing, radius tokens", "done": false },
      { "text": "Expose tokens via CSS variables (Tailwind config)", "done": false },
      { "text": "Verify contrast (especially for colors)", "done": false }
    ]
  },
  { "id": "D2-T2", "day": "D2", "title": "Build TokensPanel with presets", "checklist": [
      { "text": "Add UI controls for brandColor, accentColor, etc.", "done": false },
      { "text": "Include four theme presets", "done": false },
      { "text": "Save token changes to local state (persisted)", "done": false }
    ]
  },
  { "id": "D3-T1", "day": "D3", "title": "Implement six sections with variants", "checklist": [
      { "text": "Components: Hero, Features, Pricing, FAQ, Testimonials, CTA", "done": false },
      { "text": "Each has 3–4 variants (different layouts/styles)", "done": false },
      { "text": "Ensure all are responsive and accessible", "done": false }
    ]
  },
  { "id": "D3-T2", "day": "D3", "title": "Wire up SectionRegistry and types", "checklist": [
      { "text": "Register each section type in a central registry", "done": false },
      { "text": "Define TypeScript props for each section for type-checking", "done": false },
      { "text": "Confirm no console errors for missing keys/props", "done": false }
    ]
  },
  { "id": "D4-T1", "day": "D4", "title": "Editor forms and validation", "checklist": [
      { "text": "Create form UI for section content (with labels)", "done": false },
      { "text": "Use Zod schemas to validate inputs", "done": false },
      { "text": "Show friendly error messages for invalid inputs", "done": false }
    ]
  },
  { "id": "D4-T2", "day": "D4", "title": "Reorder, duplicate, delete functionality", "checklist": [
      { "text": "Implement drag-and-drop list of sections (dnd-kit)", "done": false },
      { "text": "Add buttons to duplicate and delete sections", "done": false },
      { "text": "Consider simple undo/redo (if time)", "done": false }
    ]
  },
  { "id": "D4-T3", "day": "D4", "title": "Autosave and recover", "checklist": [
      { "text": "Save editor state to IndexedDB (or localStorage) every 10s", "done": false },
      { "text": "On load, recover the last saved draft", "done": false }
    ]
  },
  { "id": "D5-T1", "day": "D5", "title": "Brief form and generator rules", "checklist": [
      { "text": "Create a form to input industry, audience, tone, goal", "done": false },
      { "text": "Define deterministic rules mapping brief -> sections/variants", "done": false },
      { "text": "Seed brief presets for 8 industries", "done": false }
    ]
  },
  { "id": "D5-T2", "day": "D5", "title": "Copy templates", "checklist": [
      { "text": "Prepare placeholder text templates for each section type", "done": false },
      { "text": "Fill section props with brief-based content (no AI yet)", "done": false },
      { "text": "Ensure a full page can be generated from brief", "done": false }
    ]
  },
  { "id": "D6-T1", "day": "D6", "title": "Export ZIP that builds", "checklist": [
      { "text": "Collect all necessary project files in-memory", "done": false },
      { "text": "Generate a ZIP for download", "done": false },
      { "text": "Test the exported project on Windows (build & run)", "done": false }
    ]
  },
  { "id": "D6-T2", "day": "D6", "title": "Optional GitHub export with PAT", "checklist": [
      { "text": "If PAT provided, create a new repo via GitHub API", "done": false },
      { "text": "Push exported files to new repo", "done": false },
      { "text": "Include README with deploy instructions", "done": false }
    ]
  },
  { "id": "D7-T1", "day": "D7", "title": "Settings modal and key storage", "checklist": [
      { "text": "Add OpenAI API Key field in Settings (stored locally)", "done": false },
      { "text": "Include a global 'AI features off' switch", "done": false }
    ]
  },
  { "id": "D7-T2", "day": "D7", "title": "Edge function and Improve button", "checklist": [
      { "text": "Create stateless function to send text to OpenAI for improvements", "done": false },
      { "text": "Implement rate limiting and no-logging for AI requests", "done": false },
      { "text": "Add UI button to polish text and show spinner/errors", "done": false }
    ]
  },
  { "id": "D8-T1", "day": "D8", "title": "Accessibility and SEO", "checklist": [
      { "text": "Ensure all images have alt text, form elements have labels", "done": false },
      { "text": "Add meta tags and sitemap for SEO", "done": false }
    ]
  },
  { "id": "D8-T2", "day": "D8", "title": "Performance and crash safety", "checklist": [
      { "text": "Eliminate major layout shifts (CLS)", "done": false },
      { "text": "Optimize images (use appropriate sizes/formats)", "done": false },
      { "text": "Implement ErrorBoundary and state recovery", "done": false }
    ]
  },
  { "id": "D8-T3", "day": "D8", "title": "Tests", "checklist": [
      { "text": "Write 20 unit/snapshot tests", "done": false },
      { "text": "Create a Playwright script: generate -> edit -> export flow", "done": false }
    ]
  },
  { "id": "D9-T1", "day": "D9", "title": "Public landing and demos", "checklist": [
      { "text": "Design landing page (hero, value props, demo links)", "done": false },
      { "text": "Capture a short demo GIF or screenshots", "done": false },
      { "text": "Deploy 6 example sites to share", "done": false }
    ]
  },
  { "id": "D9-T2", "day": "D9", "title": "Docs and legal pages", "checklist": [
      { "text": "Write Quick Start, Export guide, Tokens guide, FAQ", "done": false },
      { "text": "Draft Terms of Service, Privacy Policy, AUP, Non-affiliation", "done": false }
    ]
  },
  { "id": "D10-T1", "day": "D10", "title": "Safety and load checks", "checklist": [
      { "text": "Sanitize all user inputs (prevent XSS)", "done": false },
      { "text": "Restrict upload types (images only etc.)", "done": false },
      { "text": "Add Content Security Policy headers to deploys", "done": false },
      { "text": "Test with 100 sections (extreme case) in editor", "done": false }
    ]
  },
  { "id": "D10-T2", "day": "D10", "title": "Final polish and announce", "checklist": [
      { "text": "Ensure empty states and tooltips are helpful", "done": false },
      { "text": "Record a 2-minute demo video", "done": false },
      { "text": "Test support email workflow", "done": false },
      { "text": "Point custom domain to Vercel (get HTTPS green lock)", "done": false },
      { "text": "Prepare announcement post", "done": false }
    ]
  }
];

const DEFAULT_PROMPTS = {
  D1: {
    start: `Context: Build a minimal Next.js App Router app with TypeScript, Tailwind, shadcn/ui, Zustand, Zod, and dnd-kit. Strict TS. Folders: app, components, lib, public. Add TokensProvider and Preview components. Push to GitHub and deploy to Vercel (Windows, Node LTS, pnpm, Git).
Task: Provide exact Windows PowerShell commands, installation steps, minimal files (with code), and a short test plan.`,
    end: `List what we finished today.
Top three risks for tomorrow.
Short next steps (under 200 words).`
  },
  D2: {
    start: `Context: TokensProvider and Preview exist.
Goal: Create a TokensPanel to edit brandColor, accentColor, fontPair, fontScale, spacingScale, radius. Map tokens to CSS variables and Tailwind. Make four presets: Clean, Friendly, Bold, Minimal.
Show code linking tokens to live preview.`,
    end: `Summarize today's token work. Note any styling bugs. Propose two refactors for tomorrow.`
  },
  D3: {
    start: `Context: Tokens and preview work.
Goal: Build six section types (Hero, Features, Pricing, FAQ, Testimonials, CTA) with 3–4 variants each. Ensure they are accessible and responsive. Provide a SectionRegistry and typed props.`,
    end: `List sections and variants completed. Note any missing alt text or keyboard traps. Action items for Day 4.`
  },
  D4: {
    start: `Context: Sections and registry ready.
Goal: Build an Editor panel with Zod validation, inline error messages, drag-and-drop reorder (dnd-kit), duplicate/delete, and (if possible) undo/redo. Autosave to IndexedDB every 10 seconds.`,
    end: `Describe any UX rough spots in the Editor. Name one <1h improvement. Confirm autosave & recovery with a quick test summary.`
  },
  D5: {
    start: `Context: Editor works.
Goal: Add a Brief form (industry, audience, tone, goal). Implement generateFromBrief to produce a PageSchema (select sections, variants, and placeholder text – no AI). Seed 8 industries (Cafe, Barber, Interior Design, Fitness, Tutor, Photographer, Bakery, Agency).`,
    end: `Summarize brief-to-section rules (maybe a table). Note weak layouts. Suggest tweaks.`
  },
  D6: {
    start: `Context: Can generate & edit a page.
Goal: Implement exportProject to build a Next.js static site in-memory and download a ZIP. Include package.json, pages, components/sections, tailwind.config, README. Optional: support GitHub export via PAT.`,
    end: `Confirm exported project builds on Windows. List any issues and fixes. Suggest one way to reduce export size.`
  },
  D7: {
    start: `Context: Export works.
Goal: Add a Settings modal to store an OpenAI API key (localStorage). Add an "AI improve" feature: a toggle to enable AI text polish. Implement a function (using fetch or edge function) to send text to OpenAI for improvement (accessibility/SEO/perf), with rate limiting and no logging.`,
    end: `Write a security note about key handling. List tests confirming no key leaves browser except to OpenAI.`
  },
  D8: {
    start: `Context: AI polish optional.
Goal: Accessibility/SEO/Performance sweep. Add meta tags and sitemap. Fix layout shifts and optimize images. Implement ErrorBoundary to catch errors and allow state recovery. Write ~20 tests and a Playwright smoke test (gen→edit→export).`,
    end: `Report Lighthouse scores (Perf, A11y, SEO) and top fixes for each. Paste a summary of Playwright test results.`
  },
  D9: {
    start: `Context: Quality passes done.
Goal: Publish a landing page explaining brief→build→edit→export→deploy flow. Deploy six demo sites. Write docs: Quick Start, Export, Tokens, FAQ. Add legal pages: ToS, Privacy, AUP, Non-affiliation.`,
    end: `Review landing and docs for clarity. Suggest two small copy edits to better target non-developers.`
  },
  D10: {
    start: `Context: Site and docs live.
Goal: Final hardening. Sanitize inputs, restrict file types, set CSP headers. Test with 100 sections for performance. Create a 2-min demo video. Test support email. Point custom domain to Vercel (HTTPS). Announce on social.`,
    end: `Final retro – WWW (Went Well), WNI (Needs Improvement), Next steps (short plan for week two).`
  }
};

function emptyOverlay() {
  return {
    version: OVERLAY_VERSION,
    view: "dashboard",
    day: "D1",
    edit: false,
    locked: false,
    overlayNotes: "",
    hasSeenWelcome: false,
    readinessPct: 0,
    lastSaved: null,
    settings: {
      contrast: true,
      theme: "dark"
    },
    prompts: DEFAULT_PROMPTS,
    tasks: TASKS
  };
}

function loadOverlay() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyOverlay();
    const o = JSON.parse(raw);
    if (o.version !== OVERLAY_VERSION) return emptyOverlay();
    return { ...emptyOverlay(), ...o, prompts: o.prompts || DEFAULT_PROMPTS, tasks: o.tasks || TASKS };
  } catch {
    return emptyOverlay();
  }
}

function saveOverlay() {
  state.overlay.lastSaved = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.overlay));
  updateLastSaved();
}

const state = {
  overlay: loadOverlay()
};

/* ---------- Render ---------- */

function render() {
  // apply theme and contrast
  document.documentElement.dataset.theme = (state.overlay.settings.theme === "light" ? "light" : "dark");
  document.documentElement.dataset.contrast = (state.overlay.settings.contrast ? "high" : "normal");
  document.body.classList.toggle('jackin', !!state.overlay.locked);

  // update header active states
  els('.nav .pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.nav === state.overlay.view);
  });
  el('#btn-edit')?.classList.toggle('active', !!state.overlay.edit);
  el('#btn-edit')?.setAttribute('aria-pressed', String(!!state.overlay.edit));
  el('#btn-edit')?.replaceChildren(document.createTextNode(`Edit: ${state.overlay.edit ? 'On' : 'Off'}`));
  el('#btn-jack')?.replaceChildren(document.createTextNode(state.overlay.locked ? 'Exit Focus' : 'Focus Mode'));

  // settings checkbox states
  const contrastCbx = el('#set-contrast');
  if (contrastCbx) contrastCbx.checked = !!state.overlay.settings.contrast;
  const themeCbx = el('#set-theme');
  if (themeCbx) themeCbx.checked = (state.overlay.settings.theme === "light");

  // render main view
  const app = el('#app');
  if (!app) return;
  let html = "";
  const v = state.overlay.view;
  if (v === "dashboard") {
    html += (needsWelcome() ? welcomeView() : "");
    html += missionHero();
    html += newPanelWhatYouBuild();
    html += newPanelHowItWorks();
    html += dayRail();
  } else if (v === "days") {
    html += daysView();
  } else if (v === "prompts") {
    html += commonPromptsPanel();
    html += allPromptsPanel();
  } else if (v === "cheatsheet") {
    html += cheatSheetView();
  } else if (v === "commands") {
    html += commandsView();
  } else {
    html += placeholderView(v);
  }
  app.innerHTML = html;
  wireDynamic();
  updateLastSaved();
}

/* ---------- Views ---------- */

function needsWelcome() {
  return !state.overlay.hasSeenWelcome;
}

function welcomeView() {
  return `
  <section class="panel">
    <div class="h2">Welcome!</div>
    <p class="small muted">Build a landing page in 10 days. All progress stays <em>only</em> in your browser (no accounts).</p>
    <ol class="small">
      <li>Open <strong>Days</strong> and copy the Start prompt into your AI assistant.</li>
      <li>Code in your repo, deploy the site, then check off tasks here.</li>
      <li>End the day with a short retro using the End prompt.</li>
    </ol>
    <div class="toolbar">
      <button class="btn primary" data-action="start-mission">Start Day 1</button>
      <button class="btn" data-action="see-plan">View 10-Day Plan</button>
    </div>
  </section>`;
}

function missionHero() {
  const pct = clamp(state.overlay.readinessPct || 0, 0, 100);
  const percent = Math.round(pct);
  // Determine current streak (consecutive days completed, up to today)
  let currentStreak = 0;
  for (const d of DAYS) {
    const tasksForDay = state.overlay.tasks.filter(t => t.day === d);
    const dayDone = tasksForDay.length > 0 && tasksForDay.every(t => t.checklist.every(item => item.done));
    if (dayDone) {
      currentStreak++;
    } else break;
  }
  return `
  <section class="panel">
    <div class="grid cols-3">
      <div class="card center">
        <div class="ring" style="--pct:${percent}%"><span>${percent}%</span></div>
      </div>
      <div>
        <div class="h2">Project Progress</div>
        <p class="small muted">Follow daily prompts, complete tasks, and ship your project. Nothing leaves your browser.</p>
        <div class="toolbar">
          <button class="btn" data-action="start-mission">Start Day 1</button>
          <button class="btn" data-action="see-plan">View Plan</button>
        </div>
      </div>
      <div>
        <div class="h2">Completion</div>
        <div class="small muted">Completed <strong>${currentStreak}</strong> of 10 days. Export JSON anytime to save progress.</div>
      </div>
    </div>
  </section>`;
}

function newPanelWhatYouBuild() {
  return `
  <section class="panel">
    <div class="h2">What you'll build</div>
    <p class="small">A custom landing page generator with editable sections, theme tokens, export to Next.js, and optional AI content polish. By Day 10, you'll have a deployed landing page and a toolkit to generate more.</p>
  </section>`;
}

function newPanelHowItWorks() {
  return `
  <section class="panel">
    <div class="h2">How this works</div>
    <ol class="small">
      <li>Each <strong>Day</strong> has a Start prompt (for planning/coding) and an End prompt (for reflection).</li>
      <li>Use the prompts with ChatGPT or similar to guide implementation.</li>
      <li>Tick off tasks as you complete them. All data stays local (you can export/import progress).</li>
    </ol>
  </section>`;
}

function dayRail() {
  let itemsHtml = "";
  for (const d of DAYS) {
    // calculate completion percent for day d
    let total = 0, done = 0;
    const tasksForDay = state.overlay.tasks.filter(t => t.day === d);
    for (const task of tasksForDay) {
      for (const item of task.checklist) {
        total++;
        if (item.done) done++;
      }
    }
    const pct = total ? Math.round((done / total) * 100) : 0;
    itemsHtml += `<div class="day-card">
        <div><strong>Day ${d.slice(1)}</strong><span class="badge muted small" style="margin-left:8px">${pct}%</span></div>
        <div class="right"><button class="btn" data-action="open-day" data-day="${d}">Open</button></div>
      </div>`;
  }
  return `
  <section class="panel">
    <div class="h2">10-day mission rail</div>
    <div class="list">${itemsHtml}</div>
  </section>`;
}

function daysView() {
  const d = state.overlay.day;
  const prom = state.overlay.prompts[d] || { start: "", end: "" };
  let html = `<section class="panel">
    <div class="h2">Day ${d.slice(1)}${SPRINT_NAMES[d] ? ' – '+SPRINT_NAMES[d] : ''}</div>
    <div class="grid cols-2">
      <div class="card">
        <div class="h2">Start</div>
        <div class="code" id="code-start">${escapeHtml(prom.start)}</div>
        <div class="toolbar"><button class="btn" data-copy="#code-start">Copy</button></div>
      </div>
      <div class="card">
        <div class="h2">End</div>
        <div class="code" id="code-end">${escapeHtml(prom.end)}</div>
        <div class="toolbar"><button class="btn" data-copy="#code-end">Copy</button></div>
      </div>
    </div>
    <div class="toolbar">
      ${DAYS.map(x => `<button class="pill ${x === d ? 'active' : ''}" data-daytab="${x}">${x}</button>`).join("")}
    </div>
  </section>`;
  // Tasks checklist for the day
  html += `<section class="panel"><div class="h2">Tasks</div>`;
  const tasks = state.overlay.tasks.filter(t => t.day === d);
  for (const task of tasks) {
    html += `<div><strong>${escapeHtml(task.title)}</strong></div><ul class="small" style="margin:4px 0 12px 0;">`;
    task.checklist.forEach((item, i) => {
      html += `<li><label><input type="checkbox" data-task="${task.id}" data-item="${i}" ${item.done ? 'checked' : ''}/> <span>${escapeHtml(item.text)}</span></label></li>`;
    });
    html += `</ul>`;
  }
  html += `</section>`;
  return html;
}

function commonPromptsPanel() {
  const lines = [
    "Give a 2-sentence goal for today and a 5-step plan.",
    "Draft 3 commit messages (each prefixed with D{day}:, ≤ 65 chars).",
    "Write acceptance criteria as Given/When/Then.",
    "Generate alt text for all images (10–15 words each).",
    "Suggest 5 mobile tests that could break the layout.",
    "List 8 accessibility checks for this screen.",
    "Propose an SEO title & meta description (with character counts).",
    "Map design tokens to Tailwind config (colors, font scale, radius…).",
    "Write a 100-word retro: WWW / WNI / Next.",
    "Create a 3-item checklist to start tomorrow."
  ];
  return `
  <section class="panel">
    <div class="h2">Common Prompts</div>
    <div class="code">${lines.map(s => "• " + s).join("\n")}</div>
  </section>`;
}

function allPromptsPanel() {
  const blocks = DAYS.map(d => {
    const p = state.overlay.prompts[d];
    return `<div class="card">
      <div class="h2">${d}</div>
      <div class="small muted">Start</div>
      <div class="code" id="p-${d}-s">${escapeHtml(p.start)}</div>
      <div class="toolbar"><button class="btn" data-copy="#p-${d}-s">Copy</button></div>
      <div class="space"></div>
      <div class="small muted">End</div>
      <div class="code" id="p-${d}-e">${escapeHtml(p.end)}</div>
      <div class="toolbar"><button class="btn" data-copy="#p-${d}-e">Copy</button></div>
    </div>`;
  }).join("");
  return `<section class="panel"><div class="h2">All prompts (for reference)</div><div class="grid cols-3">${blocks}</div></section>`;
}

function cheatSheetView() {
  return `
  <section class="panel">
    <div class="h2">Cheat Sheet</div>
    <div class="grid cols-3">
      <div class="card">
        <div class="h2">VS Code</div>
        <div class="code">Ctrl + P  – Quick open file
Ctrl + Shift + P  – Command palette
Ctrl + /  – Toggle comment
Alt + ↑/↓  – Move line up/down
Ctrl + B  – Toggle sidebar visibility</div>
      </div>
      <div class="card">
        <div class="h2">Git basics</div>
        <div class="code">git status      – Check changes
git add .       – Stage all changes
git commit -m "msg"  – Commit changes
git push        – Push to remote
git switch -c feature/x  – Create & switch to branch
git restore --staged .   – Unstage all changes</div>
      </div>
      <div class="card">
        <div class="h2">Shell / PNPM</div>
        <div class="code">node -v           – Check Node version
npm -v            – Check npm version
pnpm -v           – Check pnpm version
pnpm dlx serve .  – Serve current folder (static)
pnpm dev          – Run dev server (if set up)</div>
      </div>
    </div>
  </section>`;
}

function commandsView() {
  return `
  <section class="panel">
    <div class="h2">Commands</div>
    <div class="grid cols-3">
      <div class="card">
        <div class="h2">Windows</div>
        <div class="code">node -v
npm -v
pnpm -v
git --version
corepack enable
pnpm i
pnpm dev
pnpm dlx serve .</div>
      </div>
      <div class="card">
        <div class="h2">macOS</div>
        <div class="code">node -v
npm -v
pnpm -v
git --version
corepack enable
pnpm install
pnpm dev
pnpm dlx serve .</div>
      </div>
      <div class="card">
        <div class="h2">Linux</div>
        <div class="code">node -v
npm -v
pnpm -v
git --version
corepack enable
pnpm install
pnpm dev
pnpm dlx serve .</div>
      </div>
    </div>
  </section>`;
}

function placeholderView(name) {
  const title = name.charAt(0).toUpperCase() + name.slice(1);
  return `<section class="panel">
    <div class="h2">${escapeHtml(title)}</div>
    <p class="small muted">This section is under construction. For now, please use the <strong>Days</strong>, <strong>Prompts</strong>, <strong>Cheat Sheet</strong>, or <strong>Commands</strong> sections above.</p>
  </section>`;
}

/* ---------- Wire up UI ---------- */

function wireHeader() {
  // top nav buttons
  els('.nav [data-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.overlay.view = btn.dataset.nav;
      saveOverlay();
      render();
    });
  });

  // header action buttons
  el('#btn-edit')?.addEventListener('click', () => {
    state.overlay.edit = !state.overlay.edit;
    toast(state.overlay.edit ? "Edit enabled" : "Edit disabled");
    saveOverlay();
    render();
  });

  el('#btn-jack')?.addEventListener('click', () => {
    state.overlay.locked = !state.overlay.locked;
    toast(state.overlay.locked ? "Focus mode on." : "Focus mode off.");
    saveOverlay();
    render();
  });

  el('#btn-export')?.addEventListener('click', () => {
    const name = `lp-hq-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const blob = new Blob([ JSON.stringify(state.overlay, null, 2) ], { type: "application/json" });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });

  el('#btn-import')?.addEventListener('click', () => el('#file-import')?.click());

  el('#file-import')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || "{}"));
        if (!data || typeof data !== "object") throw new Error("Bad file format");
        state.overlay = { ...emptyOverlay(), ...data };
        toast("Imported progress.");
        saveOverlay();
        render();
      } catch (err) {
        toast("Import failed: " + err.message);
      }
    };
    reader.readAsText(file);
  });

  el('#btn-reset')?.addEventListener('click', () => {
    if (confirm("Reset all local progress? This cannot be undone.")) {
      state.overlay = emptyOverlay();
      saveOverlay();
      render();
      toast("All local data cleared.");
    }
  });

  // settings menu toggle
  const settingsMenu = el('.settings');
  el('#btn-settings')?.addEventListener('click', () => {
    settingsMenu?.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!settingsMenu) return;
    if (settingsMenu.contains(e.target)) return;
    settingsMenu.classList.remove('open');
  });

  // theme/contrast toggles
  el('#set-contrast')?.addEventListener('change', (e) => {
    state.overlay.settings.contrast = e.target.checked;
    saveOverlay();
    render();
  });
  el('#set-theme')?.addEventListener('change', (e) => {
    state.overlay.settings.theme = e.target.checked ? "light" : "dark";
    saveOverlay();
    render();
  });

  // keyboard shortcuts (when not typing in an input/textarea)
  document.addEventListener('keydown', (e) => {
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    const key = e.key.toLowerCase();
    if (key === 'e') el('#btn-edit')?.click();
    if (key === 'l') el('#btn-jack')?.click();
    if (/[0-9]/.test(key)) {
      const idx = (key === '0') ? 9 : (parseInt(key, 10) - 1);
      if (idx >= 0 && idx < DAYS.length) {
        state.overlay.day = DAYS[idx];
        state.overlay.view = "days";
        saveOverlay();
        render();
      }
    }
  });
}

function wireDynamic() {
  // welcome buttons
  els('[data-action="start-mission"]').forEach(btn => btn.addEventListener('click', () => {
    state.overlay.hasSeenWelcome = true;
    state.overlay.view = "days";
    state.overlay.day = "D1";
    saveOverlay();
    render();
  }));
  els('[data-action="see-plan"]').forEach(btn => btn.addEventListener('click', () => {
    state.overlay.hasSeenWelcome = true;
    saveOverlay();
    window.scrollTo({ top: document.body.scrollHeight * 0.35, behavior: 'smooth' });
  }));

  // open day from timeline
  els('[data-action="open-day"]').forEach(btn => btn.addEventListener('click', () => {
    const d = btn.dataset.day;
    state.overlay.day = d;
    state.overlay.view = "days";
    saveOverlay();
    render();
  }));

  // day tab navigation (within Days view)
  els('[data-daytab]').forEach(btn => btn.addEventListener('click', () => {
    state.overlay.day = btn.dataset.daytab;
    saveOverlay();
    render();
  }));

  // copy prompt buttons
  els('[data-copy]').forEach(btn => btn.addEventListener('click', () => {
    const targetSel = btn.getAttribute('data-copy');
    const node = el(targetSel);
    if (!node) return;
    const text = node.textContent || "";
    navigator.clipboard.writeText(text).then(() => {
      toast("Copied to clipboard");
    }).catch(() => {
      toast("Copy failed");
    });
  }));

  // task checkbox toggles
  els('input[data-task]').forEach(input => input.addEventListener('change', () => {
    const taskId = input.getAttribute('data-task');
    const itemIndex = parseInt(input.getAttribute('data-item'), 10);
    const task = state.overlay.tasks.find(t => t.id === taskId);
    if (task) {
      task.checklist[itemIndex].done = input.checked;
    }
    // recalc overall readiness percentage
    let total = 0, done = 0;
    for (const t of state.overlay.tasks) {
      for (const item of t.checklist) {
        total++;
        if (item.done) done++;
      }
    }
    state.overlay.readinessPct = total ? (done / total) * 100 : 0;
    saveOverlay();
    render();
  }));
}

/* ---------- Helpers ---------- */

function updateLastSaved() {
  const text = state.overlay.lastSaved ? `Last saved locally: ${new Date(state.overlay.lastSaved).toLocaleString()}` : "";
  const label = el('#last-saved');
  if (label) label.textContent = text;
}
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
function toast(msg) {
  const container = el('#toasts');
  if (!container) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 300);
  }, 1500);
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  render();
  wireHeader();
  saveOverlay(); // set initial lastSaved timestamp
});
