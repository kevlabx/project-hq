// app.js
/* LoomPages Project HQ — Matrix "Game Mode"
   Local-only SPA: state in localStorage; no external deps.
   Implements Matrix-mode UX upgrades (pills, construct hub, console theme, story beats, chips, etc.).
*/

/* ---------------------------
   Tiny DOM helpers
---------------------------- */
const el  = (s, r=document) => r.querySelector(s);
const els = (s, r=document) => [...r.querySelectorAll(s)];

/* ---------------------------
   Constants & Schema
---------------------------- */
const STORAGE_KEY = "LP_HQ_STATE_V5";
const OVERLAY_VERSION = 5;

const DAYS = ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10"];
const SPRINT_NAMES = {
  D1:"Foundations", D2:"Style Tokens", D3:"Section Library v1", D4:"Editor UX",
  D5:"Rule Generator", D6:"Export", D7:"Optional AI Copy", D8:"Quality & Stability",
  D9:"Landing & Legal", D10:"Hardening & Launch"
};

/* Story beats (short paraphrases to avoid long quotations) */
const STORY_BEATS = {
  D1: "You know the path. Now walk it.",
  D2: "Choice shapes reality. Choose the tokens.",
  D3: "There is no spoon—just components.",
  D4: "Control the inputs to bend the page.",
  D5: "Rules reveal the pattern beneath.",
  D6: "Construct the world. Export it.",
  D7: "Power needs restraint. Make it safe.",
  D8: "See the code as the user sees it.",
  D9: "Show, not tell. Then tell clearly.",
  D10:"Everything that has a beginning has an end. Ship."
};

/* Base tasks (unchanged content, themed UI elsewhere) */
const TASKS = [
  { id:"D1-T1", day:"D1", title:"Scaffold Next app and deploy skeleton", checklist:[
    { text:"Node LTS, PNPM, and Git installed", done:false },
    { text:"Create Next.js app (TypeScript)", done:false },
    { text:"Add Tailwind CSS, ShadCN UI, Zustand, Zod, dnd-kit", done:false },
    { text:"Initialize Git repo and push to GitHub", done:false },
    { text:"Connect Vercel and deploy app", done:false },
    { text:"Open live URL to verify deployment", done:false }
  ]},
  { id:"D1-T2", day:"D1", title:"Repo hygiene and CI basics", checklist:[
    { text:"Set up ESLint and Prettier", done:false },
    { text:"Enable strict TypeScript options", done:false },
    { text:"Write a README.md with project info", done:false },
    { text:"Add a LOG.md for daily notes (optional)", done:false }
  ]},
  { id:"D2-T1", day:"D2", title:"Map tokens to CSS variables", checklist:[
    { text:"Define color, font, spacing, radius tokens", done:false },
    { text:"Expose tokens via CSS variables (Tailwind config)", done:false },
    { text:"Verify contrast (especially for colors)", done:false }
  ]},
  { id:"D2-T2", day:"D2", title:"Build TokensPanel with presets", checklist:[
    { text:"Add UI controls for brandColor, accentColor, etc.", done:false },
    { text:"Include four theme presets", done:false },
    { text:"Save token changes to local state (persisted)", done:false }
  ]},
  { id:"D3-T1", day:"D3", title:"Implement six sections with variants", checklist:[
    { text:"Components: Hero, Features, Pricing, FAQ, Testimonials, CTA", done:false },
    { text:"Each has 3–4 variants (different layouts/styles)", done:false },
    { text:"Ensure all are responsive and accessible", done:false }
  ]},
  { id:"D3-T2", day:"D3", title:"Wire up SectionRegistry and types", checklist:[
    { text:"Register each section type in a central registry", done:false },
    { text:"Define TypeScript props for each section for type-checking", done:false },
    { text:"Confirm no console errors for missing keys/props", done:false }
  ]},
  { id:"D4-T1", day:"D4", title:"Editor forms and validation", checklist:[
    { text:"Create form UI for section content (with labels)", done:false },
    { text:"Use Zod schemas to validate inputs", done:false },
    { text:"Show friendly error messages for invalid inputs", done:false }
  ]},
  { id:"D4-T2", day:"D4", title:"Reorder, duplicate, delete functionality", checklist:[
    { text:"Implement drag-and-drop list of sections (dnd-kit)", done:false },
    { text:"Add buttons to duplicate and delete sections", done:false },
    { text:"Consider simple undo/redo (if time)", done:false }
  ]},
  { id:"D4-T3", day:"D4", title:"Autosave and recover", checklist:[
    { text:"Save editor state to IndexedDB (or localStorage) every 10s", done:false },
    { text:"On load, recover the last saved draft", done:false }
  ]},
  { id:"D5-T1", day:"D5", title:"Brief form and generator rules", checklist:[
    { text:"Create a form to input industry, audience, tone, goal", done:false },
    { text:"Define deterministic rules mapping brief -> sections/variants", done:false },
    { text:"Seed brief presets for 8 industries", done:false }
  ]},
  { id:"D5-T2", day:"D5", title:"Copy templates", checklist:[
    { text:"Prepare placeholder text templates for each section type", done:false },
    { text:"Fill section props with brief-based content (no AI yet)", done:false },
    { text:"Ensure a full page can be generated from brief", done:false }
  ]},
  { id:"D6-T1", day:"D6", title:"Export ZIP that builds", checklist:[
    { text:"Collect all necessary project files in-memory", done:false },
    { text:"Generate a ZIP for download", done:false },
    { text:"Test the exported project on Windows (build & run)", done:false }
  ]},
  { id:"D6-T2", day:"D6", title:"Optional GitHub export with PAT", checklist:[
    { text:"If PAT provided, create a new repo via GitHub API", done:false },
    { text:"Push exported files to new repo", done:false },
    { text:"Include README with deploy instructions", done:false }
  ]},
  { id:"D7-T1", day:"D7", title:"Settings modal and key storage", checklist:[
    { text:"Add OpenAI API Key field in Settings (stored locally)", done:false },
    { text:"Include a global 'AI features off' switch", done:false }
  ]},
  { id:"D7-T2", day:"D7", title:"Edge function and Improve button", checklist:[
    { text:"Create stateless function to send text to OpenAI for improvements", done:false },
    { text:"Implement rate limiting and no-logging for AI requests", done:false },
    { text:"Add UI button to polish text and show spinner/errors", done:false }
  ]},
  { id:"D8-T1", day:"D8", title:"Accessibility and SEO", checklist:[
    { text:"Ensure all images have alt text, form elements have labels", done:false },
    { text:"Add meta tags and sitemap for SEO", done:false }
  ]},
  { id:"D8-T2", day:"D8", title:"Performance and crash safety", checklist:[
    { text:"Eliminate major layout shifts (CLS)", done:false },
    { text:"Optimize images (use appropriate sizes/formats)", done:false },
    { text:"Implement ErrorBoundary and state recovery", done:false }
  ]},
  { id:"D8-T3", day:"D8", title:"Tests", checklist:[
    { text:"Write 20 unit/snapshot tests", done:false },
    { text:"Create a Playwright script: generate -> edit -> export flow", done:false }
  ]},
  { id:"D9-T1", day:"D9", title:"Public landing and demos", checklist:[
    { text:"Design landing page (hero, value props, demo links)", done:false },
    { text:"Capture a short demo GIF or screenshots", done:false },
    { text:"Deploy 6 example sites to share", done:false }
  ]},
  { id:"D9-T2", day:"D9", title:"Docs and legal pages", checklist:[
    { text:"Write Quick Start, Export guide, Tokens guide, FAQ", done:false },
    { text:"Draft Terms of Service, Privacy Policy, AUP, Non-affiliation", done:false }
  ]},
  { id:"D10-T1", day:"D10", title:"Safety and load checks", checklist:[
    { text:"Sanitize all user inputs (prevent XSS)", done:false },
    { text:"Restrict upload types (images only etc.)", done:false },
    { text:"Add Content Security Policy headers to deploys", done:false },
    { text:"Test with 100 sections (extreme case) in editor", done:false }
  ]},
  { id:"D10-T2", day:"D10", title:"Final polish and announce", checklist:[
    { text:"Ensure empty states and tooltips are helpful", done:false },
    { text:"Record a 2-minute demo video", done:false },
    { text:"Test support email workflow", done:false },
    { text:"Point custom domain to Vercel (get HTTPS green lock)", done:false },
    { text:"Prepare announcement post", done:false }
  ]}
];

/* Daily prompts */
const DEFAULT_PROMPTS = {
  D1:{ start:`Context: Build a minimal Next.js App Router app with TypeScript, Tailwind, shadcn/ui, Zustand, Zod, and dnd-kit. Strict TS. Folders: app, components, lib, public. Add TokensProvider and Preview components. Push to GitHub and deploy to Vercel (Windows, Node LTS, pnpm, Git).
Task: Provide exact Windows PowerShell commands, installation steps, minimal files (with code), and a short test plan.`,
       end:`List what we finished today.
Top three risks for tomorrow.
Short next steps (under 200 words).` },
  D2:{ start:`Context: TokensProvider and Preview exist.
Goal: Create a TokensPanel to edit brandColor, accentColor, fontPair, fontScale, spacingScale, radius. Map tokens to CSS variables and Tailwind. Make four presets: Clean, Friendly, Bold, Minimal.
Show code linking tokens to live preview.`,
       end:`Summarize today's token work. Note any styling bugs. Propose two refactors for tomorrow.` },
  D3:{ start:`Context: Tokens and preview work.
Goal: Build six section types (Hero, Features, Pricing, FAQ, Testimonials, CTA) with 3–4 variants each. Ensure they are accessible and responsive. Provide a SectionRegistry and typed props.`,
       end:`List sections and variants completed. Note any missing alt text or keyboard traps. Action items for Day 4.` },
  D4:{ start:`Context: Sections and registry ready.
Goal: Build an Editor panel with Zod validation, inline error messages, drag-and-drop reorder (dnd-kit), duplicate/delete, and (if possible) undo/redo. Autosave to IndexedDB every 10 seconds.`,
       end:`Describe any UX rough spots in the Editor. Name one <1h improvement. Confirm autosave & recovery with a quick test summary.` },
  D5:{ start:`Context: Editor works.
Goal: Add a Brief form (industry, audience, tone, goal). Implement generateFromBrief to produce a PageSchema (select sections, variants, and placeholder text – no AI). Seed 8 industries (Cafe, Barber, Interior Design, Fitness, Tutor, Photographer, Bakery, Agency).`,
       end:`Summarize brief-to-section rules (maybe a table). Note weak layouts. Suggest tweaks.` },
  D6:{ start:`Context: Can generate & edit a page.
Goal: Implement exportProject to build a Next.js static site in-memory and download a ZIP. Include package.json, pages, components/sections, tailwind.config, README. Optional: support GitHub export via PAT.`,
       end:`Confirm exported project builds on Windows. List any issues and fixes. Suggest one way to reduce export size.` },
  D7:{ start:`Context: Export works.
Goal: Add a Settings modal to store an OpenAI API key (localStorage). Add an "AI improve" feature: a toggle to enable AI text polish. Implement a function (using fetch or edge function) to send text to OpenAI for improvement (accessibility/SEO/perf), with rate limiting and no logging.`,
       end:`Write a security note about key handling. List tests confirming no key leaves browser except to OpenAI.` },
  D8:{ start:`Context: AI polish optional.
Goal: Accessibility/SEO/Performance sweep. Add meta tags and sitemap. Fix layout shifts and optimize images. Implement ErrorBoundary to catch errors and allow state recovery. Write ~20 tests and a Playwright smoke test (gen→edit→export).`,
       end:`Report Lighthouse scores (Perf, A11y, SEO) and top fixes for each. Paste a summary of Playwright test results.` },
  D9:{ start:`Context: Quality passes done.
Goal: Publish a landing page explaining brief→build→edit→export→deploy flow. Deploy six demo sites. Write docs: Quick Start, Export, Tokens, FAQ. Add legal pages: ToS, Privacy, AUP, Non-affiliation.`,
       end:`Review landing and docs for clarity. Suggest two small copy edits to better target non-developers.` },
  D10:{ start:`Context: Site and docs live.
Goal: Final hardening. Sanitize inputs, restrict file types, set CSP headers. Test with 100 sections for performance. Create a 2-min demo video. Test support email. Point custom domain to Vercel (HTTPS). Announce on social.`,
       end:`Final retro – WWW (Went Well), WNI (Needs Improvement), Next steps (short plan for week two).` }
};

/* ---------------------------
   State & Persistence
---------------------------- */
function emptyOverlay(){
  return {
    version: OVERLAY_VERSION,
    view: "dashboard",
    day: "D1",
    edit: false,
    locked: false,
    hasSeenWelcome: false,
    readinessPct: 0,
    lastSaved: null,
    // Story/game bits
    chips: {},              // achievements/skill chips
    agents: [],             // rebranded "bugs" (future use)
    settings: {
      contrast: true,
      theme: "dark",        // 'dark' | 'light' | 'console'
      storyMode: true,
      sfx: false,
      haptics: false
    },
    prompts: DEFAULT_PROMPTS,
    tasks: TASKS
  };
}

function loadOverlay(){
  try{
    const raw5 = localStorage.getItem(STORAGE_KEY);
    const raw4 = localStorage.getItem("LP_HQ_STATE_V4");
    if(!raw5 && raw4){
      const old = JSON.parse(raw4);
      const base = emptyOverlay();
      // Migrate tasks from old state
      let tasks = TASKS;
      if(old.tasks && Array.isArray(old.tasks)){
        tasks = TASKS.map(baseTask => {
          const saved = old.tasks.find(t => t.id === baseTask.id);
          if(!saved) return baseTask;
          const mergedChecklist = baseTask.checklist.map(item => {
            const savedItem = saved.checklist.find(i => i.text === item.text);
            return savedItem ? { ...item, done: !!savedItem.done } : { ...item };
          });
          return { ...baseTask, checklist: mergedChecklist };
        });
      }
      const newState = { ...base, ...old,
        version: OVERLAY_VERSION,
        tasks,
        prompts: old.prompts || DEFAULT_PROMPTS,
        settings: { ...base.settings, ...(old.settings || {}) },
        chips: old.chips || {},
        agents: Array.isArray(old.agents) ? old.agents : (Array.isArray(old.bugs) ? old.bugs : [])
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      try{ localStorage.removeItem("LP_HQ_STATE_V4"); }catch(e){}
      return newState;
    }
    const raw = raw5;
    if(!raw) return emptyOverlay();
    const o = JSON.parse(raw);
    if(o.version !== OVERLAY_VERSION){
      if(typeof o.version === "number" && o.version < OVERLAY_VERSION){
        const base = emptyOverlay();
        // Migrate older version state
        let tasks = TASKS;
        if(o.tasks && Array.isArray(o.tasks)){
          tasks = TASKS.map(baseTask => {
            const saved = o.tasks.find(t => t.id === baseTask.id);
            if(!saved) return baseTask;
            const mergedChecklist = baseTask.checklist.map(item => {
              const savedItem = saved.checklist.find(i => i.text === item.text);
              return savedItem ? { ...item, done: !!savedItem.done } : { ...item };
            });
            return { ...baseTask, checklist: mergedChecklist };
          });
        }
        const migrated = { ...base, ...o,
          version: OVERLAY_VERSION,
          tasks,
          prompts: o.prompts || DEFAULT_PROMPTS,
          settings: { ...base.settings, ...(o.settings || {}) },
          chips: o.chips || {},
          agents: Array.isArray(o.agents) ? o.agents : []
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      } else {
        return emptyOverlay();
      }
    }
    const base = emptyOverlay();
    return { ...base, ...o,
      prompts: o.prompts || DEFAULT_PROMPTS,
      tasks: Array.isArray(o.tasks) ? o.tasks : TASKS,
      settings: { ...base.settings, ...(o.settings || {}) },
      chips: o.chips || {},
      agents: Array.isArray(o.agents) ? o.agents : []
    };
  }catch{
    return emptyOverlay();
  }
}

const state = { overlay: loadOverlay() };

function saveOverlay(){
  state.overlay.lastSaved = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.overlay));
  updateLastSaved();
  updateOperator();
}

/* ---------------------------
   Derived metrics
---------------------------- */
function percentForDay(day){
  const tasks = state.overlay.tasks.filter(t => t.day === day);
  let total = 0, done = 0;
  tasks.forEach(t => t.checklist.forEach(i => { total++; if(i.done) done++; }));
  return total ? Math.round((done/total)*100) : 0;
}
function percentOverall(){
  let total = 0, done = 0;
  state.overlay.tasks.forEach(t => t.checklist.forEach(i => { total++; if(i.done) done++; }));
  return total ? (done/total)*100 : 0;
}
function currentStreak(){
  let s = 0;
  for(const d of DAYS){
    if(percentForDay(d) === 100) s++; else break;
  }
  return s;
}
function traceRiskLabel(){
  const last = state.overlay.lastSaved ? new Date(state.overlay.lastSaved) : new Date();
  const hours = Math.max(0, (Date.now() - last.getTime()) / 36e5);
  if(hours > 48) return "trace risk high";
  if(hours > 24) return "trace risk rising";
  return "trace risk low";
}

/* ---------------------------
   Rendering
---------------------------- */
function render(){
  // theme & contrast
  const theme = state.overlay.settings.theme;
  document.documentElement.dataset.theme = (theme === "light" ? "light" : theme === "console" ? "console" : "dark");
  document.documentElement.dataset.contrast = state.overlay.settings.contrast ? "high" : "normal";
  document.body.classList.toggle('jackin', !!state.overlay.locked);
  document.body.classList.toggle('story-on', !!state.overlay.settings.storyMode);

  // header nav active state
  els('.nav .pill').forEach(btn => btn.classList.toggle('active', btn.dataset.nav === state.overlay.view));
  const editBtn = el('#btn-edit');
  if(editBtn){
    editBtn.classList.toggle('active', !!state.overlay.edit);
    editBtn.setAttribute('aria-pressed', String(!!state.overlay.edit));
    editBtn.textContent = `Edit: ${state.overlay.edit ? 'On' : 'Off'}`;
  }
  const jackBtn = el('#btn-jack');
  if(jackBtn){
    jackBtn.textContent = state.overlay.locked ? (jackBtn.dataset.labelOn || "Unjack") : (jackBtn.dataset.labelOff || "Jack In");
    jackBtn.setAttribute('aria-pressed', String(!!state.overlay.locked));
  }

  // sync settings toggles
  const cbx = {
    contrast: el('#set-contrast'),
    theme: el('#set-theme'),
    story: el('#set-story'),
    console: el('#set-console'),
    sfx: el('#set-sfx'),
    haptics: el('#set-haptics'),
  };
  if(cbx.contrast) cbx.contrast.checked = !!state.overlay.settings.contrast;
  if(cbx.theme)    cbx.theme.checked    = (state.overlay.settings.theme === "light");
  if(cbx.console)  cbx.console.checked  = (state.overlay.settings.theme === "console");
  if(cbx.story)    cbx.story.checked    = !!state.overlay.settings.storyMode;
  if(cbx.sfx)      cbx.sfx.checked      = !!state.overlay.settings.sfx;
  if(cbx.haptics)  cbx.haptics.checked  = !!state.overlay.settings.haptics;
  if(cbx.contrast) cbx.contrast.parentElement.setAttribute('aria-checked', cbx.contrast.checked ? 'true' : 'false');
  if(cbx.theme)    cbx.theme.parentElement.setAttribute('aria-checked', cbx.theme.checked ? 'true' : 'false');
  if(cbx.console)  cbx.console.parentElement.setAttribute('aria-checked', cbx.console.checked ? 'true' : 'false');
  if(cbx.story)    cbx.story.parentElement.setAttribute('aria-checked', cbx.story.checked ? 'true' : 'false');
  if(cbx.sfx)      cbx.sfx.parentElement.setAttribute('aria-checked', cbx.sfx.checked ? 'true' : 'false');
  if(cbx.haptics)  cbx.haptics.parentElement.setAttribute('aria-checked', cbx.haptics.checked ? 'true' : 'false');

  const v = state.overlay.view;
  const app = el('#app');
  if(!app) return;

  let html = "";
  if(v === "dashboard"){
    html += welcomeMaybe();
    html += constructHubSection();
    html += intelCards();
    html += newPanelWhatYouBuild();
    html += newPanelHowItWorks();
    html += dayRail();
  } else if(v === "days"){
    html += daysView();
  } else if(v === "prompts"){
    html += commonPromptsPanel();
    html += allPromptsPanel();
  } else if(v === "cheatsheet"){
    html += cheatSheetView();
  } else if(v === "commands"){
    html += commandsView();
  } else if(v === "agents"){
    html += agentsView();
  } else {
    html += placeholderView(v);
  }

  app.innerHTML = html;

  // After DOM injection: wire & decorate
  wireDynamic();
  paintConstruct();
  updateLastSaved();
  updateOperator();
}

/* ----- Dashboard pieces ----- */
function welcomeMaybe(){
  if(state.overlay.hasSeenWelcome) return "";
  // Red/Blue pill welcome
  return `
  <section class="panel">
    <div class="h2">Welcome to the Construct.</div>
    <p class="small muted">Build a landing page in 10 days. All progress stays <em>only</em> in your browser.</p>
    <div class="toolbar">
      <button class="pill red" data-action="start-mission" aria-label="Take red pill — start Day 1">Red pill — enter the build</button>
      <button class="pill blue" data-action="see-plan" aria-label="Take blue pill — view plan">Blue pill — peek at the plan</button>
    </div>
  </section>`;
}

function constructHubSection(){
  const pct = Math.round(clamp(percentOverall(),0,100));
  const nodes = DAYS.map((d,i)=>`<button class="node" data-day="${d}" style="--angle: ${i*36}deg; --pct: ${percentForDay(d)}" aria-label="Open Day ${d.slice(1)}"></button>`).join("");
  return `
  <section class="panel construct-hub" aria-label="Construct Hub">
    <div class="construct">
      <div class="core-ring" role="img" aria-label="Overall completion" style="--pct: ${pct}"></div>
      <div class="orbit">${nodes}</div>
    </div>
    <div class="construct-legend small">
      <span class="chip">Overall</span>
      <span class="chip">D1–D10 nodes</span>
      <span class="chip ok">Skill chips</span>
    </div>
  </section>`;
}

function intelCards(){
  const todayIdx = DAYS.indexOf(state.overlay.day);
  const today = state.overlay.day;
  const yesterday = DAYS[Math.max(0, todayIdx-1)];
  const tStart = (state.overlay.prompts[today]||{}).start || "—";
  const yEnd  = (state.overlay.prompts[yesterday]||{}).end || "—";
  return `
  <section class="panel intel">
    <div class="grid cols-3">
      <div class="card intel-card"><div class="label">TODAY</div><div class="intel-body" id="intel-today">${escapeHtml(firstTwoLines(tStart))}</div></div>
      <div class="card intel-card"><div class="label">RISKS</div><div class="intel-body" id="intel-risks">${escapeHtml(topRisksFromEnd(yEnd))}</div></div>
      <div class="card intel-card"><div class="label">NEXT</div><div class="intel-body" id="intel-next">${escapeHtml(nextStepsFromStart(tStart))}</div></div>
    </div>
  </section>`;
}
function firstTwoLines(s){
  return String(s).split(/\n/).slice(0,2).join(" ").trim() || "—";
}
function topRisksFromEnd(s){
  const lines = String(s).split(/\n/).filter(x=>/risk/i.test(x)).slice(0,2);
  return lines.join(" ").trim() || "Keep scope small. Deploy daily.";
}
function nextStepsFromStart(s){
  const lines = String(s).split(/\n/).filter(x=>/goal|task|plan|steps|implement|create/i.test(x)).slice(0,1);
  return lines.join(" ").trim() || "Copy Start prompt, ship one commit.";
}

/* Dashboard: intro panels */
function newPanelWhatYouBuild(){
  return `
  <section class="panel">
    <div class="h2">What you’ll build</div>
    <div class="grid cols-2">
      <div class="card">
        <strong>10-day guided landing page generator</strong>
        <p class="small muted">Tokens → Sections → Editor → Export → Deploy. No servers, progress stored locally.</p>
      </div>
      <div class="card">
        <strong>Matrix “Game Mode” UI</strong>
        <p class="small muted">Orbit hub, story beats, skill chips, console theme, keyboard shortcuts.</p>
      </div>
    </div>
  </section>`;
}
function newPanelHowItWorks(){
  return `
  <section class="panel">
    <div class="h2">How it works</div>
    <div class="list">
      <div>• Use the <strong>Days</strong> view to follow daily prompts and check off tasks.</div>
      <div>• <strong>Prompts</strong> provides copy-ready start/end packets for each day.</div>
      <div>• <strong>Cheat Sheet</strong> & <strong>Commands</strong> give quick refs.</div>
      <div>• Click any node in the hub or press 1–0 keys to jump to a day.</div>
    </div>
  </section>`;
}

/* ----- Other views ----- */
function dayRail(){
  let itemsHtml = "";
  for(const d of DAYS){
    const pct = percentForDay(d);
    itemsHtml += `<div class="day-card">
      <div><strong>Day ${d.slice(1)}</strong><span class="badge muted small" style="margin-left:8px">${pct}%</span></div>
      <div class="right"><button class="btn" data-action="open-day" data-day="${d}" aria-label="Open Day ${d.slice(1)} (${pct}% complete)">Open</button></div>
    </div>`;
  }
  return `<section class="panel"><div class="h2">10-day mission rail</div><div class="list">${itemsHtml}</div></section>`;
}

function daysView(){
  const d = state.overlay.day;
  const prom = state.overlay.prompts[d] || { start:"", end:"" };

  const earlyDots = [ "D1","D2","D3" ].map(x=>{
    const filled = percentForDay(x) === 100 ? "background:var(--accent-green)" : "background:transparent";
    return `<i style="display:inline-block;width:10px;height:10px;border-radius:50%;border:1px solid var(--line);${filled};margin-right:6px"></i>`;
  }).join("");

  const beat = state.overlay.settings.storyMode ? `<div class="card"><div class="small muted">Story beat</div><div>${escapeHtml(STORY_BEATS[d]||"Stay the course.")}</div></div>` : "";

  const tabs = DAYS.map(x=>{
    const pct = percentForDay(x);
    return `<button class="pill ${x===d?'active':''}" data-daytab="${x}" data-day="${x}" style="--pct:${pct}">${x}</button>`;
  }).join("");

  let html = `
  <section class="panel">
    <div class="h2">Day ${d.slice(1)}${SPRINT_NAMES[d] ? ' – '+SPRINT_NAMES[d] : ''}</div>
    <div class="small muted" aria-hidden="true">${earlyDots}</div>
    <div class="grid cols-2">
      <div class="packet">
        <div class="packet-title small muted">Packet: Start</div>
        <div class="code" id="code-start">${escapeHtml(prom.start)}</div>
        <div class="toolbar"><button class="btn" data-copy="#code-start" data-copy-label="Packet copied.">Copy</button></div>
      </div>
      <div class="packet">
        <div class="packet-title small muted">Packet: End</div>
        <div class="code" id="code-end">${escapeHtml(prom.end)}</div>
        <div class="toolbar"><button class="btn" data-copy="#code-end" data-copy-label="Packet copied.">Copy</button></div>
      </div>
    </div>
    ${beat}
    <div class="toolbar" aria-label="Day tabs">${tabs}</div>
  </section>`;

  html += `<section class="panel"><div class="h2">Tasks</div>`;
  const tasks = state.overlay.tasks.filter(t => t.day === d);
  for(const task of tasks){
    html += `<div><strong>${escapeHtml(task.title)}</strong></div><ul class="small" style="margin:4px 0 12px 0;">`;
    task.checklist.forEach((item,i)=>{
      html += `<li><label><input type="checkbox" data-task="${task.id}" data-item="${i}" ${item.done?'checked':''}/> <span>${escapeHtml(item.text)}</span></label></li>`;
    });
    html += `</ul>`;
  }
  html += `</section>`;
  return html;
}

function commonPromptsPanel(){
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
  return `<section class="panel"><div class="h2">Common Prompts</div><div class="code">${lines.map(s=>"• "+s).join("\n")}</div></section>`;
}

function allPromptsPanel(){
  const blocks = DAYS.map(d=>{
    const p = state.overlay.prompts[d];
    return `<div class="card">
      <div class="h2">${d}</div>
      <div class="small muted">Start</div>
      <div class="code" id="p-${d}-s">${escapeHtml(p.start)}</div>
      <div class="toolbar"><button class="btn" data-copy="#p-${d}-s" data-copy-label="Packet copied.">Copy</button></div>
      <div class="space"></div>
      <div class="small muted">End</div>
      <div class="code" id="p-${d}-e">${escapeHtml(p.end)}</div>
      <div class="toolbar"><button class="btn" data-copy="#p-${d}-e" data-copy-label="Packet copied.">Copy</button></div>
    </div>`;
  }).join("");
  return `<section class="panel"><div class="h2">All prompts (for reference)</div><div class="grid cols-3">${blocks}</div></section>`;
}

function cheatSheetView(){
  return `
  <section class="panel">
    <div class="h2">Cheat Sheet</div>
    <div class="grid cols-3">
      <div class="card"><div class="h2">VS Code</div>
        <div class="code">Ctrl + P  – Quick open file
Ctrl + Shift + P  – Command palette
Ctrl + /  – Toggle comment
Alt + ↑/↓  – Move line up/down
Ctrl + B  – Toggle sidebar visibility</div>
      </div>
      <div class="card"><div class="h2">Git basics</div>
        <div class="code">git status      – Check changes
git add .       – Stage all changes
git commit -m "msg"  – Commit changes
git push        – Push to remote
git switch -c feature/x  – Create & switch to branch
git restore --staged .   – Unstage all changes</div>
      </div>
      <div class="card"><div class="h2">Shell / PNPM</div>
        <div class="code">node -v           – Check Node version
npm -v            – Check npm version
pnpm -v           – Check pnpm version
pnpm dlx serve .  – Serve current folder (static)
pnpm dev          – Run dev server (if set up)</div>
      </div>
    </div>
  </section>`;
}

function commandsView(){
  return `
  <section class="panel">
    <div class="h2">Commands</div>
    <div class="grid cols-3">
      <div class="card"><div class="h2">Windows</div>
        <div class="code">node -v
npm -v
pnpm -v
git --version
corepack enable
pnpm i
pnpm dev
pnpm dlx serve .</div>
      </div>
      <div class="card"><div class="h2">macOS</div>
        <div class="code">node -v
npm -v
pnpm -v
git --version
corepack enable
pnpm install
pnpm dev
pnpm dlx serve .</div>
      </div>
      <div class="card"><div class="h2">Linux</div>
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

function agentsView(){
  const n = state.overlay.agents.length;
  const list = n ? state.overlay.agents.map((a)=>`<li>${escapeHtml(a)}</li>`).join("") : `<li class="muted">No agents currently detected.</li>`;
  return `<section class="panel"><div class="h2">Agents</div><ul>${list}</ul></section>`;
}

function placeholderView(name){
  const title = name.charAt(0).toUpperCase()+name.slice(1);
  return `<section class="panel">
    <div class="h2">${escapeHtml(title)}</div>
    <p class="small muted">This section is under construction. Use <strong>Days</strong>, <strong>Prompts</strong>, <strong>Cheat Sheet</strong>, or <strong>Commands</strong>.</p>
  </section>`;
}

/* ---------------------------
   Header wiring & global UX
---------------------------- */
function wireHeader(){
  // nav
  els('.nav [data-nav]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      state.overlay.view = btn.dataset.nav;
      saveOverlay(); render();
    });
  });

  // edit / jack in
  el('#btn-edit')?.addEventListener('click', ()=>{
    state.overlay.edit = !state.overlay.edit;
    toast(state.overlay.edit ? "Edit enabled" : "Edit disabled");
    saveOverlay(); render();
  });
  el('#btn-jack')?.addEventListener('click', ()=>{
    state.overlay.locked = !state.overlay.locked;
    toast(state.overlay.locked ? "Focus mode on." : "Focus mode off.");
    saveOverlay(); render();
  });

  // export/import/reset
  el('#btn-export')?.addEventListener('click', ()=>{
    const name = `lp-hq-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
    const blob = new Blob([JSON.stringify(state.overlay,null,2)],{type:"application/json"});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
    earnChip('exported');
    toast("Progress exported.");
  });
  el('#btn-import')?.addEventListener('click', ()=> el('#file-import')?.click());
  el('#file-import')?.addEventListener('change', (e)=>{
    const file = e.target.files?.[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const data = JSON.parse(String(reader.result||"{}"));
        if(!data || typeof data !== "object") throw new Error("Bad file format");
        const base = emptyOverlay();
        // Merge imported state (handles older version structures)
        let tasks = base.tasks;
        if(data.tasks && Array.isArray(data.tasks)){
          tasks = base.tasks.map(baseTask => {
            const saved = data.tasks.find(t => t.id === baseTask.id);
            if(!saved) return baseTask;
            const mergedChecklist = baseTask.checklist.map(item => {
              const savedItem = saved.checklist.find(i => i.text === item.text);
              return savedItem ? { ...item, done: !!savedItem.done } : { ...item };
            });
            return { ...baseTask, checklist: mergedChecklist };
          });
        }
        state.overlay = { ...base, ...data,
          version: OVERLAY_VERSION,
          tasks,
          prompts: data.prompts || DEFAULT_PROMPTS,
          settings: { ...base.settings, ...(data.settings || {}) },
          chips: data.chips || {},
          agents: Array.isArray(data.agents) ? data.agents : (Array.isArray(data.bugs) ? data.bugs : [])
        };
        toast("Memory retrieved.");
        saveOverlay(); render();
      }catch(err){ toast("Import failed: "+(err?.message||"")); }
    };
    reader.readAsText(file);
  });
  el('#btn-reset')?.addEventListener('click', ()=>{
    if(confirm("Reset all local progress? This cannot be undone.")){
      state.overlay = emptyOverlay();
      saveOverlay(); render();
      toast("All local data cleared.");
    }
  });

  // settings menu
  const settingsMenu = el('.settings');
  el('#btn-settings')?.addEventListener('click', ()=>{
    settingsMenu?.classList.toggle('open');
    el('#btn-settings')?.setAttribute('aria-expanded', settingsMenu?.classList.contains('open') ? 'true' : 'false');
  });
  document.addEventListener('click',(e)=>{
    if(!settingsMenu) return;
    if(settingsMenu.contains(e.target) || e.target === el('#btn-settings')) return;
    settingsMenu.classList.remove('open');
    el('#btn-settings')?.setAttribute('aria-expanded','false');
  });

  // toggles
  el('#set-contrast')?.addEventListener('change', e=>{
    state.overlay.settings.contrast = !!e.target.checked; saveOverlay(); render();
  });
  el('#set-theme')?.addEventListener('change', e=>{
    if(e.target.checked){
      state.overlay.settings.theme = "light";
      const consoleCbx = el('#set-console'); if(consoleCbx) consoleCbx.checked = false;
    }else{
      if(state.overlay.settings.theme === "light") state.overlay.settings.theme = "dark";
    }
    saveOverlay(); render();
  });
  el('#set-console')?.addEventListener('change', e=>{
    if(e.target.checked){
      state.overlay.settings.theme = "console";
      const dayCbx = el('#set-theme'); if(dayCbx) dayCbx.checked = false;
    }else{
      if(state.overlay.settings.theme === "console") state.overlay.settings.theme = "dark";
    }
    saveOverlay(); render();
  });
  el('#set-story')?.addEventListener('change', e=>{
    state.overlay.settings.storyMode = !!e.target.checked; saveOverlay(); render();
  });
  el('#set-sfx')?.addEventListener('change', e=>{
    state.overlay.settings.sfx = !!e.target.checked; saveOverlay(); render();
  });
  el('#set-haptics')?.addEventListener('change', e=>{
    state.overlay.settings.haptics = !!e.target.checked; saveOverlay(); render();
  });

  // terminal (command palette)
  el('#btn-terminal')?.addEventListener('click', openTerminal);
  el('#terminal-close')?.addEventListener('click', closeTerminal);
  document.addEventListener('keydown', (e)=>{
    // Ignore when typing in fields
    if(e.target && /input|textarea/i.test(e.target.tagName)) return;
    const key = e.key.toLowerCase();
    // shortcuts
    if((e.ctrlKey || e.metaKey) && key === 'k'){ e.preventDefault(); openTerminal(); earnChip('keys'); return; }
    if(key === 'e'){ el('#btn-edit')?.click(); earnChip('keys'); }
    if(key === 'l'){ el('#btn-jack')?.click(); earnChip('keys'); }
    if(/[0-9]/.test(key)){
      const idx = (key === '0') ? 9 : (parseInt(key,10)-1);
      if(idx>=0 && idx<DAYS.length){
        state.overlay.day = DAYS[idx]; state.overlay.view = "days";
        saveOverlay(); render(); earnChip('keys');
      }
    }
    if(key==='escape' && !el('#terminal-overlay')?.classList.contains('hidden')) closeTerminal();
  });
}

/* ---------------------------
   Dynamic wiring after render
---------------------------- */
function wireDynamic(){
  // welcome pills
  els('[data-action="start-mission"]').forEach(btn=>btn.addEventListener('click', ()=>{
    state.overlay.hasSeenWelcome = true;
    state.overlay.view = "days"; state.overlay.day = "D1";
    saveOverlay(); render();
  }));
  els('[data-action="see-plan"]').forEach(btn=>btn.addEventListener('click', ()=>{
    state.overlay.hasSeenWelcome = true; saveOverlay();
    window.scrollTo({ top: document.body.scrollHeight * 0.35, behavior:'smooth' });
  }));

  // open day from rail
  els('[data-action="open-day"]').forEach(btn=>btn.addEventListener('click', ()=>{
    const d = btn.dataset.day; state.overlay.day=d; state.overlay.view="days";
    saveOverlay(); render();
  }));

  // day tabs
  els('[data-daytab]').forEach(btn=>btn.addEventListener('click', ()=>{
    state.overlay.day = btn.dataset.daytab; saveOverlay(); render();
  }));

  // construct hub nodes
  els('.construct .node').forEach(node=>{
    node.addEventListener('click', ()=>{
      const d = node.getAttribute('data-day'); if(!d) return;
      state.overlay.day = d; state.overlay.view = "days";
      saveOverlay(); render();
    });
  });

  // copy packets
  els('[data-copy]').forEach(btn=>btn.addEventListener('click', async ()=>{
    const sel = btn.getAttribute('data-copy'); const node = sel && el(sel);
    if(!node) return;
    const text = node.textContent || "";
    try{
      if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(text);
      }else{
        // fallback
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta);
        ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      }
      const msg = btn.getAttribute('data-copy-label') || "Copied to clipboard";
      toast(msg); playSfx('copy'); earnChip('copied');
    }catch{
      toast("Copy failed");
    }
  }));

  // checklist changes (detect 100% per-day to award chip/haptics)
  els('input[data-task]').forEach(input=>input.addEventListener('change', ()=>{
    const taskId = input.getAttribute('data-task');
    const itemIdx = parseInt(input.getAttribute('data-item'),10);
    const task = state.overlay.tasks.find(t=>t.id===taskId);
    if(task && task.checklist[itemIdx]){
      task.checklist[itemIdx].done = !!input.checked;
    }
    state.overlay.readinessPct = percentOverall();
    const d = task?.day;
    if(d){
      const before = parseInt((input.dataset.prevPct||"-1"),10);
      const nowPct = percentForDay(d);
      if(before >= 0 && before < 100 && nowPct === 100){
        earnChip(`day-${d}`);
        playSfx('complete');
        if(state.overlay.settings.haptics) try{ navigator.vibrate?.(25); }catch{}
      }
      input.dataset.prevPct = String(nowPct);
    }
    saveOverlay(); render();
  }));
}

/* ---------------------------
   Visual updates & HUD
---------------------------- */
function paintConstruct(){
  const core = el('.core-ring');
  if(core) core.style.setProperty('--pct', String(Math.round(clamp(percentOverall(),0,100))));
  els('.construct .node').forEach(node=>{
    const d = node.getAttribute('data-day'); if(!d) return;
    node.style.setProperty('--pct', String(percentForDay(d)));
  });
}

function updateOperator(){
  const hud = el('#operator'); if(!hud) return;
  const s = currentStreak();
  const risk = traceRiskLabel();
  hud.textContent = `Operator: link secure • local save OK • streak ${s} • ${risk}`;
}

function updateLastSaved(){
  const label = el('#last-saved');
  if(label){
    label.textContent = state.overlay.lastSaved
      ? `Last saved locally: ${new Date(state.overlay.lastSaved).toLocaleString()}`
      : "";
  }
}

/* ---------------------------
   Terminal (command palette)
---------------------------- */
function openTerminal(){
  const term = el('#terminal-overlay'); if(!term) return;
  term.classList.remove('hidden');
  const body = el('.terminal-body', term); body?.focus();
}
function closeTerminal(){
  const term = el('#terminal-overlay'); if(!term) return;
  term.classList.add('hidden');
  el('#btn-terminal')?.focus();
}

/* ---------------------------
   Chips / SFX helpers
---------------------------- */
function earnChip(key){
  if(!key) return;
  if(!state.overlay.chips) state.overlay.chips = {};
  if(!state.overlay.chips[key]){
    state.overlay.chips[key] = true;
    saveOverlay();
  }
}
function playSfx(kind){
  if(!state.overlay.settings.sfx) return;
  const id = kind === 'complete' ? '#sfx-complete' : '#sfx-copy';
  const a = el(id);
  try{ a?.play()?.catch(()=>{}); }catch{}
}

/* ---------------------------
   Toasts
---------------------------- */
function toast(message, ms=2200){
  const host = el('#toasts'); if(!host) return;
  const box = document.createElement('div');
  box.className = 'toast';
  box.setAttribute('role','status');
  box.textContent = message;
  host.appendChild(box);
  setTimeout(()=>{ box.style.opacity = '0'; }, ms);
  setTimeout(()=>{ box.remove(); }, ms + 300);
}

/* ---------------------------
   Misc utils
---------------------------- */
function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }
function escapeHtml(s){
  const map = {'&':'&amp;','<':'&lt;','>':'&gt;'};
  return String(s).replace(/[&<>]/g, ch => map[ch]);
}

/* ---------------------------
   Init
---------------------------- */
document.addEventListener('DOMContentLoaded', ()=>{
  render();
  wireHeader();
  saveOverlay(); // set initial lastSaved + HUD
});
