// app.js
/* Matrix-mode assignment cockpit: local-only progress + beginner-friendly UX */

const el  = (s, r=document)=>r.querySelector(s);
const els = (s, r=document)=>[...r.querySelectorAll(s)];

const STORAGE_KEY="LP_HQ_STATE_V4";
const OVERLAY_VERSION=4;

const DAYS = ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10"];

const DEFAULT_PROMPTS = {
  D1:{
    start:`Context: Build a minimal Next.js App Router app with TypeScript, Tailwind, shadcn/ui, Zustand, Zod, and Kit. Strict TS. Folders app, components, lib, public. Add TokensProvider and Preview. Push to GitHub and deploy to Vercel. Windows with Node LTS, pnpm, Git.
Task: Give exact Windows PowerShell commands, installs, minimal files with code, and a short test plan.`,
    end:`List what we finished today.
Top three risks for tomorrow.
Short next steps. Under 200 words.`
  },
  D2:{
    start:`Context: TokensProvider and Preview exist.
Goal: Create a TokensPanel to edit brandColor, accentColor, fontPair, fontScale, spacingScale, radius. Map to CSS variables and Tailwind. Make four presets: Clean, Friendly, Bold, Minimal.
Show code for mapping and live preview.`,
    end:`Summarize token work, note styling bugs, propose two refactors for tomorrow.`
  },
  D3:{
    start:`Context: Tokens and live preview work.
Goal: Build six section types Hero, Features, Pricing, FAQ, Testimonials, CTA with three or four variants each. Accessible, responsive. Provide SectionRegistry and typed props.`,
    end:`List sections and variants shipped. Note missing alt text or tab traps. Action list for Day 4.`
  },
  D4:{
    start:`Context: Sections and registry ready.
Goal: Build Editor panel with Zod validation, inline error UI, drag-and-drop reorder with edit, duplicate, delete, undo/redo. Autosave to IndexedDB every 10 seconds.`,
    end:`Describe UX rough spots, one sub-hour improvement, confirm autosave and recovery with a quick test script.`
  },
  D5:{
    start:`Context: Editor ready.
Goal: Brief form industry, audience, tone, goal. Implement generator/brief + renderer putting PageSchema with section order, variants, and draft copy (no AI). Seed 8 industries: Cafe, Barber, Interior Design, Fitness, Tutor, Photographer, Bakery, Agency.`,
    end:`Summarize rules in a small table, note weak layouts, suggest tweaks.`
  },
  D6:{start:`Context: Generator shipping. Goal: Export ZIP build with minimal Next project skeleton + tokens + content.` , end:`Export tested? Any missing files?`},
  D7:{start:`Context: Optional AI polish. Goal: add copy polish hooks A11y/SEO/Perf.` , end:`Which copy blocks improved?`},
  D8:{start:`Context: Hardening. Goal: A11y/SEO/Perf sweeps + Lighthouse.` , end:`Report scores + remaining gaps.`},
  D9:{start:`Context: Marketing. Goal: publish demo + readme + screenshots.` , end:`Share links + checklist for launch.`},
  D10:{start:`Context: Exit. Goal: Final retro + next steps.` , end:`Write a short retro (WWW, WNI, Next).`}
};

function emptyOverlay(){
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
    settings:{
      contrast: true,
      theme: "dark" // "dark" | "light"
    },
    prompts: DEFAULT_PROMPTS
  };
}

function loadOverlay(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return emptyOverlay();
    const o = JSON.parse(raw);
    if(o.version!==OVERLAY_VERSION) return emptyOverlay();
    return {...emptyOverlay(), ...o, prompts: o.prompts || DEFAULT_PROMPTS};
  }catch{
    return emptyOverlay();
  }
}

function saveOverlay(){
  state.overlay.lastSaved = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.overlay));
  updateLastSaved();
}

const state = {
  overlay: loadOverlay()
};

/* ---------- Render ---------- */

function render(){
  // theme + contrast
  document.documentElement.dataset.theme = state.overlay.settings.theme === "light" ? "light" : "dark";
  document.documentElement.dataset.contrast = state.overlay.settings.contrast ? "high" : "normal";
  document.body.classList.toggle('jackin', !!state.overlay.locked);

  // header active
  els('.nav .pill').forEach(b=>{
    b.classList.toggle('active', b.dataset.nav === state.overlay.view);
  });
  el('#btn-edit')?.classList.toggle('active', !!state.overlay.edit);
  el('#btn-edit')?.setAttribute('aria-pressed', String(!!state.overlay.edit));
  el('#btn-edit')?.replaceChildren(document.createTextNode(`Edit: ${state.overlay.edit?'On':'Off'}`));

  el('#btn-jack')?.replaceChildren(document.createTextNode(state.overlay.locked ? 'Unlock' : 'Lock In'));

  // settings checkboxes reflect state
  const sc = el('#set-contrast'); if(sc){ sc.checked = !!state.overlay.settings.contrast; }
  const st = el('#set-theme'); if(st){ st.checked = state.overlay.settings.theme==="light"; }

  // main view
  const app = el('#app');
  if(!app) return;

  let html = "";
  const v = state.overlay.view;
  if(v === "dashboard"){
    html += (needsWelcome()? welcomeView() : "");
    html += missionHero();
    html += newPanelWhatYouBuild();
    html += newPanelHowItWorks();
    html += dayRail();
  }
  else if(v === "days"){
    html += daysView();
  }
  else if(v === "prompts"){
    html += commonPromptsPanel();
    html += allPromptsPanel();
  }
  else if(v === "cheatsheet"){
    html += cheatSheetView();
  }
  else if(v === "commands"){
    html += commandsView();
  }
  else{
    html += placeholderView(v);
  }

  app.innerHTML = html;
  wireDynamic();
  updateLastSaved();
}

/* ---------- Views ---------- */

function needsWelcome(){ return !state.overlay.hasSeenWelcome; }

function welcomeView(){
  return `
  <section class="panel">
    <div class="h2">Welcome, Operator.</div>
    <p class="small muted">Build a landing page in 10 days. No accounts. Your progress stays <em>only</em> in your browser.</p>
    <ol class="small">
      <li>Open <strong>Days</strong> and copy the Start prompt.</li>
      <li>Work in your repo, deploy, then tick your checklist.</li>
      <li>End the day with a short retro in the Exit panel.</li>
    </ol>
    <div class="toolbar">
      <button class="btn primary" data-action="start-mission">Red Pill — Start Day 1</button>
      <button class="btn" data-action="see-plan">Blue Pill — See the Plan</button>
    </div>
  </section>`;
}

function missionHero(){
  const pct = clamp(state.overlay.readinessPct||0,0,100);
  return `
  <section class="panel">
    <div class="grid cols-3">
      <div class="card center">
        <div class="ring" style="--pct:${pct}%"><span>${Math.round(pct)}%</span></div>
      </div>
      <div>
        <div class="h2">“Follow the white rabbit.”</div>
        <p class="small muted">Follow the daily prompts. Tick checklists. Ship. Nothing leaves your browser.</p>
        <div class="toolbar">
          <button class="btn" data-action="start-mission">Red Pill — Start Day 1</button>
          <button class="btn" data-action="see-plan">Blue Pill — See the Plan</button>
        </div>
      </div>
      <div>
        <div class="h2">Streak</div>
        <div class="small muted">Keep a daily streak for focus XP. Export JSON any time.</div>
      </div>
    </div>
  </section>`;
}

function newPanelWhatYouBuild(){
  return `
  <section class="panel">
    <div class="h2">What you'll build</div>
    <p class="small">Sections (Hero/Features/Pricing/FAQ/Testimonials/CTA) + variants, rule-based generator, export to ZIP, optional AI polish, quality bars (A11y/SEO/Perf).</p>
  </section>`;
}

function newPanelHowItWorks(){
  return `
  <section class="panel">
    <div class="h2">How this works</div>
    <ol class="small">
      <li>Open a day → copy the prompt (“Load program”).</li>
      <li>Build in your repo + deploy.</li>
      <li>Tick checklist, write end notes, Export JSON.</li>
    </ol>
  </section>`;
}

function dayRail(){
  const items = DAYS.map(d=>{
    return `<div class="day-card">
      <div><strong>${d}</strong><span class="badge muted small" style="margin-left:8px">0%</span></div>
      <div class="right"><button class="btn" data-action="open-day" data-day="${d}">Open</button></div>
    </div>`;
  }).join("");
  return `<section class="panel">
    <div class="h2">10-day mission rail</div>
    <div class="list">${items}</div>
  </section>`;
}

function daysView(){
  const d = state.overlay.day;
  const prom = state.overlay.prompts[d] || {start:"", end:""};
  return `
  <section class="panel">
    <div class="h2">${d}</div>
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
      ${DAYS.map(x=>`<button class="pill ${x===d?'active':''}" data-daytab="${x}">${x}</button>`).join("")}
    </div>
  </section>`;
}

function commonPromptsPanel(){
  const lines = [
    "Give a 2-sentence goal for today and a 5-step plan.",
    "Draft 3 commit messages (prefix with D{day}:). ≤65 chars.",
    "Write acceptance criteria as Given/When/Then.",
    "Generate alt-text for all images (10–15 words each).",
    "Suggest 5 mobile tests that could break the layout.",
    "List 8 accessibility checks for this screen.",
    "Propose SEO title + meta description + counts.",
    "Turn tokens into Tailwind overrides (brandColor, fontScale, radius…).",
    "Write a 100-word retro: WWW / WNI / Next.",
    "Create a 3-item ‘tomorrow setup’ checklist."
  ];
  return `<section class="panel">
    <div class="h2">Common Prompts</div>
    <div class="code">${lines.map(s=>"• "+s).join("\n")}</div>
  </section>`;
}

function allPromptsPanel(){
  const blocks = DAYS.map(d=>{
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
  return `<section class="panel"><div class="h2">All prompts (copy to load programs)</div><div class="grid cols-3">${blocks}</div></section>`;
}

function cheatSheetView(){
  return `
  <section class="panel"><div class="h2">Cheat Sheet</div>
    <div class="grid cols-3">
      <div class="card">
        <div class="h2">VS Code</div>
        <div class="code">Ctrl + P  Quick open
Ctrl + Shift + P  Command palette
Ctrl + /  Toggle comment
Alt + ↑/↓  Move line
Ctrl + B  Toggle sidebar</div>
      </div>
      <div class="card">
        <div class="h2">Git basics</div>
        <div class="code">git status
git add .
git commit -m "msg"
git push
git switch -c feature/x
git restore --staged .</div>
      </div>
      <div class="card">
        <div class="h2">Shell tips</div>
        <div class="code">node -v
npm -v
pnpm -v
pnpm dlx serve .
pnpm dev</div>
      </div>
    </div>
  </section>`;
}

function commandsView(){
  return `
  <section class="panel"><div class="h2">Commands</div>
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

function placeholderView(name){
  const title = name.charAt(0).toUpperCase()+name.slice(1);
  return `<section class="panel"><div class="h2">${title}</div><p class="small muted">This area is being scaffolded. For now, use <strong>Days</strong>, <strong>Prompts</strong>, <strong>Cheat Sheet</strong>, and <strong>Commands</strong>.</p></section>`;
}

/* ---------- Wire UI ---------- */

function wireHeader(){
  // nav
  els('.nav [data-nav]').forEach(b=>{
    b.addEventListener('click', ()=>{
      state.overlay.view = b.dataset.nav;
      saveOverlay(); render();
    });
  });

  // quick actions
  el('#btn-edit')?.addEventListener('click', ()=>{
    state.overlay.edit = !state.overlay.edit;
    toast(state.overlay.edit? "Edit enabled" : "Edit disabled");
    saveOverlay(); render();
  });

  el('#btn-jack')?.addEventListener('click', ()=>{
    state.overlay.locked = !state.overlay.locked;
    toast(state.overlay.locked? "Locked in. Distraction shields up." : "Unlocked.");
    saveOverlay(); render();
  });

  el('#btn-export')?.addEventListener('click', ()=>{
    const name = `lp-hq-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
    const blob = new Blob([JSON.stringify(state.overlay,null,2)], {type:"application/json"});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
  });

  el('#btn-import')?.addEventListener('click', ()=> el('#file-import').click());
  el('#file-import')?.addEventListener('change', (e)=>{
    const f = e.target.files?.[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const o = JSON.parse(String(reader.result||"{}"));
        if(!o || typeof o!=="object") throw new Error("Bad file");
        state.overlay = {...emptyOverlay(), ...o};
        toast("Imported progress.");
        saveOverlay(); render();
      }catch(err){
        toast("Import failed: "+err.message);
      }
    };
    reader.readAsText(f);
  });

  el('#btn-reset')?.addEventListener('click', ()=>{
    if(confirm("Reset all local progress? This cannot be undone.")){
      state.overlay = emptyOverlay();
      saveOverlay(); render();
      toast("All local data cleared.");
    }
  });

  // settings
  const settingsMenu = el('.settings');
  el('#btn-settings')?.addEventListener('click', ()=>{
    settingsMenu?.classList.toggle('open');
  });
  document.addEventListener('click', (e)=>{
    if(!settingsMenu) return;
    if(settingsMenu.contains(e.target)) return;
    settingsMenu.classList.remove('open');
  });

  el('#set-contrast')?.addEventListener('change', (e)=>{
    state.overlay.settings.contrast = e.target.checked;
    saveOverlay(); render();
  });
  el('#set-theme')?.addEventListener('change', (e)=>{
    state.overlay.settings.theme = e.target.checked ? "light" : "dark";
    saveOverlay(); render();
  });

  // keyboard shortcuts
  document.addEventListener('keydown', (e)=>{
    if(e.target && /input|textarea/i.test(e.target.tagName)) return;
    if(e.key.toLowerCase()==='e'){ el('#btn-edit')?.click(); }
    if(e.key.toLowerCase()==='l'){ el('#btn-jack')?.click(); }
    if(/[0-9]/.test(e.key)){
      const idx = (e.key==='0')? 9 : (parseInt(e.key,10)-1);
      if(idx>=0 && idx<DAYS.length){
        state.overlay.day = DAYS[idx];
        state.overlay.view = "days";
        saveOverlay(); render();
      }
    }
  });
}

function wireDynamic(){
  // welcome buttons
  els('[data-action="start-mission"]').forEach(b=>b.addEventListener('click', ()=>{
    state.overlay.hasSeenWelcome = true;
    state.overlay.view = "days";
    state.overlay.day = "D1";
    saveOverlay(); render();
  }));
  els('[data-action="see-plan"]').forEach(b=>b.addEventListener('click', ()=>{
    state.overlay.hasSeenWelcome = true;
    saveOverlay();
    window.scrollTo({top: document.body.scrollHeight*0.35, behavior: 'smooth'});
  }));

  // day rail open
  els('[data-action="open-day"]').forEach(b=>b.addEventListener('click', ()=>{
    const d = b.dataset.day;
    state.overlay.day = d;
    state.overlay.view = "days";
    saveOverlay(); render();
  }));

  // day tabs
  els('[data-daytab]').forEach(b=>b.addEventListener('click', ()=>{
    state.overlay.day = b.dataset.daytab;
    saveOverlay(); render();
  }));

  // copy buttons
  els('[data-copy]').forEach(b=>b.addEventListener('click', ()=>{
    const target = b.getAttribute('data-copy');
    const node = el(target);
    if(!node) return;
    const text = node.textContent||"";
    navigator.clipboard.writeText(text).then(()=>{
      toast("Copied to clipboard");
    }).catch(()=>{
      toast("Copy failed");
    });
  }));
}

/* ---------- Helpers ---------- */

function updateLastSaved(){
  const t = state.overlay.lastSaved ? `Last saved locally: ${new Date(state.overlay.lastSaved).toLocaleString()}` : "";
  const node = el('#last-saved'); if(node) node.textContent = t;
}
function clamp(n,a,b){ return Math.max(a, Math.min(b, n)); }
function escapeHtml(s){
  return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}
function toast(msg){
  const box = el('#toasts');
  if(!box) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(()=>{ t.style.opacity='0'; setTimeout(()=>t.remove(), 250); }, 1500);
}

/* ---------- Boot ---------- */
document.addEventListener('DOMContentLoaded', ()=>{
  render();
  wireHeader();
  saveOverlay(); // sets initial lastSaved timestamp
});
