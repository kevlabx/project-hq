/* Matrix-mode assignment cockpit: local-only progress + story/game UX. */

const el  = (s, r=document)=>r.querySelector(s);
const els = (s, r=document)=>[...r.querySelectorAll(s)];
const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
const fmtPct = n => `${Math.round(n)}%`;

const STORAGE_KEY="LP_HQ_STATE_V3"; // bumped schema
const OVERLAY_VERSION=3;

const DAYS = ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10"];

/* fetch helpers */
async function j(url){ const r=await fetch(url,{cache:"no-cache"}); if(!r.ok) throw new Error(`Fetch ${r.status} ${url}`); return r.json(); }
async function t(url){ const r=await fetch(url,{cache:"no-cache"}); if(!r.ok) throw new Error(`Fetch ${r.status} ${url}`); return r.text(); }

/* state */
const state = {
  base:null,
  view:"dashboard",
  day:"D1",
  edit:false,
  jack:false, // (Lock In) UI label; action key left as 'jack'
  overlay:null
};

/* overlay schema */
function emptyOverlay(){
  const dayNotes = Object.fromEntries(DAYS.map(d=>[d, {start:"", end:"", intention:"", complete:false}]));
  return {
    version:OVERLAY_VERSION,
    codename:"",
    settings:{
      // high-contrast ON by default; rain OFF by default
      motion:true,
      highContrast:true,
      sound:false,
      rainMode:"off" // 'off' | 'edge' | 'nav'
    },
    dayTicks:{},
    dayNotes,
    bugs:[],
    parkingLocal:[],
    decisionsLocal:[],
    ssotPatch:"",
    focusXP:0,
    activity:[],
    milestones:{},
    endgame:{ repoUrl:"", demoUrl:"", retro:"", submitted:false, complete:false },
    lastSaved:null,
    lastActiveDay:"D1"
  };
}

function loadOverlay(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return emptyOverlay();
    const o = JSON.parse(raw);
    if(o.version!==OVERLAY_VERSION) return emptyOverlay();
    return {...emptyOverlay(), ...o};
  }catch{ return emptyOverlay(); }
}
function saveOverlay(){
  state.overlay.lastSaved = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.overlay));
  const lbl = el('#last-saved');
  if (lbl) lbl.textContent = `Last saved locally: ${new Date(state.overlay.lastSaved).toLocaleString()}`;
}
function act(type, detail){
  state.overlay.activity.push({time:Date.now(), type, detail});
  if(state.overlay.activity.length>400) state.overlay.activity.shift();
  saveOverlay();
  maybeMilestones();
}

/* sanitizers */
function esc(s=""){ return String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])); }
function sanitizeHtml(html=""){
  let out=String(html).replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,"");
  out=out.replace(/\son\w+="[^"]*"/gi,"").replace(/\son\w+='[^']*'/gi,"");
  const ok=/^(a|strong|em|ul|ol|li|br|p|b|i|code|pre|h3|h4)$/i;
  return out.replace(/<\/?([a-z0-9-]+)([^>]*)>/gi,(m,tag,attrs)=> ok.test(tag)?`<${tag}${attrs}>`:esc(m));
}

/* base load */
async function loadBase(){
  const [prompts,sprints,roadmap,tasks,bugsSeed,parkingSeed,decisionsSeed,dayChecks]=await Promise.all([
    j("data/prompts.json"), j("data/sprints.json"), j("data/roadmap.json"), j("data/tasks.json"),
    j("data/bugs.json"), j("data/parking.json"), j("data/decisions.json"), j("data/day_checklists.json")
  ]);
  const ssot = await t("data/ssot.html");
  state.base = {prompts,sprints,roadmap,tasks,bugsSeed,parkingSeed,decisionsSeed,dayChecks,ssot};
}

/* progress */
function itemsForDay(day){ return (state.base.dayChecks.find(x=>x.day===day)?.items)||[]; }
function ticksForDay(day){ return state.overlay.dayTicks[day] || (state.overlay.dayTicks[day]={}); }
function dayTickedCount(day){ const items=itemsForDay(day); const ticks=ticksForDay(day); return items.reduce((n,i)=>n+(ticks[i.id]?1:0),0); }
function dayPct(day){ const items=itemsForDay(day); if(!items.length) return 0; return (dayTickedCount(day)/items.length)*100; }

function overallPctRaw(){
  if(!state.base) return 0;
  const days = state.base.sprints.map(s=>s.day);
  const sum = days.reduce((a,d)=>a+dayPct(d),0);
  return sum/days.length;
}
function overallPct(){
  const base = overallPctRaw();
  if(state.overlay.endgame.complete) return base;
  return Math.min(base, 99);
}
function streaks(){
  const done = DAYS.map(d=> !!state.overlay.dayNotes[d]?.complete);
  let best=0,cur=0;
  for(const v of done){ cur=v?(cur+1):0; best=Math.max(best,cur); }
  return { current:cur, best };
}

/* ring element */
function ringHtml(p, big=false, shimmer=false){
  const cls = `ring${big?' big':''}${shimmer?' shimmer':''}`;
  return `<div class="${cls}" style="--p:${p}"><div class="readout">${fmtPct(p)}</div></div>`;
}

/* toasts/milestones */
function toast(msg, kind="ok"){
  const root = el('#toasts'); if(!root) return;
  const d = document.createElement('div');
  d.className = `toast ${kind}`; d.textContent = msg;
  root.appendChild(d);
  setTimeout(()=>{ d.style.opacity="0"; setTimeout(()=>d.remove(), 300); }, 2400);
}
function maybeMilestones(){
  const p = Math.round(overallPctRaw());
  const marks = [10,25,50,75,90,99,100];
  for(const m of marks){
    if(p>=m && !state.overlay.milestones[m]){
      state.overlay.milestones[m]=true;
      if(m===50) toast("Operator: 50% — we’re inside the mainframe.", "ok");
      else if(m===99) toast("Operator: 99% — execute the EXIT CODE ritual.", "warn");
      else if(m===100) toast("Operator: 100% — signal clean. Extraction complete.", "ok");
      else toast(`Milestone reached: ${m}%`, "ok");
      saveOverlay();
    }
  }
}

/* code rain (mode-aware) */
let rainRAF=0, rainCtx=null, rainCols=[], rainFont=16, rainCanvas=null;

function applyRainMode(){
  const cv = rainCanvas || el('#code-rain'); if(!cv) return;
  cv.classList.remove('rain-off','rain-nav');
  const mode = state.overlay.settings.rainMode;
  if(mode==='off'){ cv.classList.add('rain-off'); }
  if(mode==='nav'){ cv.classList.add('rain-nav'); }
  // edge mode uses default canvas class (full-screen with mask defined in CSS)
  resizeRain();
}

function resizeRain(){
  const cv = rainCanvas || el('#code-rain'); if(!cv) return;
  if(cv.classList.contains('rain-nav')){
    cv.width = innerWidth; cv.height = 64;
  }else{
    cv.width = innerWidth; cv.height = innerHeight;
  }
  const cols = Math.ceil(cv.width/rainFont);
  rainCols = Array(cols).fill(0);
}

function initRain(){
  const cv = el('#code-rain'); rainCanvas = cv; if(!cv) return;
  rainCtx = cv.getContext('2d');

  applyRainMode();
  addEventListener('resize', resizeRain);

  const glyphs = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  const step=()=>{
    const mode = state.overlay.settings.rainMode;
    if(mode==='off' || state.jack){ // pause when Lock In
      if(rainCtx){ rainCtx.clearRect(0,0,cv.width,cv.height); }
      rainRAF=requestAnimationFrame(step);
      return;
    }
    rainCtx.fillStyle="rgba(0,0,0,0.06)";
    rainCtx.clearRect(0,0,cv.width,cv.height);
    rainCtx.fillRect(0,0,cv.width,cv.height);

    // much softer to stay out of the way
    rainCtx.fillStyle="#00ff85";
    rainCtx.globalAlpha = mode==='nav' ? 0.14 : 0.08;

    for(let i=0;i<rainCols.length;i++){
      const txt = glyphs[Math.floor(Math.random()*glyphs.length)];
      const x=i*rainFont; const y = rainCols[i]*rainFont;
      rainCtx.fillText(txt,x,y);
      if(y>cv.height && Math.random()>0.975){ rainCols[i]=0; } else { rainCols[i]++; }
    }
    rainCtx.globalAlpha = 1;
    rainRAF=requestAnimationFrame(step);
  };
  rainRAF=requestAnimationFrame(step);
}

/* sounds (kept off by default; safe to ignore if you remove the toggle) */
let audioCtx=null;
function beep(){
  if(!state.overlay.settings.sound) return;
  try{
    audioCtx = audioCtx || new (window.AudioContext||window.webkitAudioContext)();
    const o = audioCtx.createOscillator(); const g=audioCtx.createGain();
    o.type="triangle"; o.frequency.value=660; g.gain.value=0.02;
    o.connect(g); g.connect(audioCtx.destination); o.start();
    setTimeout(()=>{o.stop()},120);
  }catch{}
}

/* modal */
function openModal(html){
  const root = el('#modal-root');
  const backdrop = document.createElement('div'); backdrop.className="modal-backdrop";
  const box = document.createElement('div'); box.className="modal"; box.innerHTML = html;
  root.appendChild(backdrop); root.appendChild(box);
  const close = ()=>{ backdrop.remove(); box.remove(); };
  backdrop.addEventListener('click', close);
  box.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click', close));
  return { close, el:box };
}

/* views */
function missionHero(){
  const p = Math.round(overallPct());
  const shimmer = p>=90;
  const {current, best} = streaks();
  return `
  <section class="panel" style="position:relative;overflow:hidden">
    <div style="display:flex;gap:22px;align-items:center;justify-content:center;flex-wrap:wrap">
      ${ringHtml(p,true,shimmer)}
      <div>
        <div class="h2">“Follow the white rabbit.”</div>
        <div class="small muted">Follow the daily prompts. Tick checklists. Ship. Nothing leaves your browser.</div>
        <div class="toolbar" style="margin-top:8px">
          <button class="btn" data-action="red-pill">Red Pill — Start Day 1</button>
          <button class="btn" data-action="blue-pill">Blue Pill — See the Plan</button>
        </div>
        <div class="small muted" style="margin-top:8px">
          Streak: ${current} • Best: ${best} • Focus XP: ${state.overlay.focusXP}
        </div>
        <div class="heatmap" style="margin-top:8px">
          ${DAYS.map(d=>{
            const pct = Math.round(dayPct(d));
            const lvl = pct>=75? 'lvl4' : pct>=50? 'lvl3' : pct>=25? 'lvl2' : pct>0? 'lvl1':''; 
            return `<div class="cell ${lvl}" title="${d}: ${pct}%"></div>`;
          }).join('')}
        </div>
      </div>
    </div>
  </section>
  `;
}
function missionExplainer(){
  return `
  <section class="grid cols-3">
    <div class="panel kpi">
      <div>${ringHtml(overallPctRaw())}</div>
      <div>
        <div class="h2">Readiness Meter</div>
        <div class="small muted">Fills from your daily checklists. Caps at 99% until the EXIT CODE ritual.</div>
      </div>
    </div>
    <div class="panel">
      <div class="h2">What you’ll build</div>
      <div class="small">Sections (Hero/Features/Pricing/FAQ/Testimonials/CTA) + variants, rule-based generator (8 industries), export to ZIP, optional AI polish, quality bars (A11y/SEO/Perf).</div>
    </div>
    <div class="panel">
      <div class="h2">How this works</div>
      <ol class="small">
        <li>Open a day → copy the prompt (“Load program”)</li>
        <li>Build in <em>your</em> repo + deploy</li>
        <li>Tick checklist, write end notes, Export JSON</li>
      </ol>
    </div>
  </section>
  `;
}
function missionDaysRail(){
  return `
  <section class="panel">
    <div class="h2">10-day mission rail</div>
    <div class="grid cols-3">
      ${state.base.sprints.map(s=>{
        const pct = Math.round(dayPct(s.day));
        const glyph = state.overlay.dayNotes[s.day]?.complete ? "✓" : "";
        return `
        <div class="card">
          <h4>${s.day} ${glyph}</h4>
          <div class="small muted">${(state.base.prompts.find(p=>p.day===s.day)?.start||"") .split(".")[0]}.</div>
          <div style="margin:8px 0">${ringHtml(pct)}</div>
          <div class="toolbar">
            <button class="btn" data-action="goto-day" data-day="${s.day}">Open</button>
          </div>
        </div>`;
      }).join('')}
    </div>
  </section>
  `;
}
function operatorLine(day){
  const map = {
    D1:"Operator: boot the stack, find a phone line (first deploy).",
    D2:"Operator: load the armory (tokens & presets).",
    D3:"Operator: dojo time — build the sections library.",
    D4:"Operator: bullet-time UX — editor + autosave.",
    D5:"Operator: craft the rules — generate full pages.",
    D6:"Operator: extraction — export a buildable ZIP.",
    D7:"Operator: Oracle assist — optional copy polish.",
    D8:"Operator: harden the hull — A11y/SEO/Perf.",
    D9:"Operator: broadcast — landing & docs.",
    D10:"Operator: exit the Matrix — safety & polish."
  };
  return map[day]||"Operator: proceed.";
}

/* render */
function render(){
  const app = el('#app');
  if(!state.base){ app.innerHTML='<div class="panel">Loading…</div>'; return; }

  document.documentElement.dataset.contrast = state.overlay.settings.highContrast ? "high" : "normal";

  if(state.view==="dashboard"){
    app.innerHTML = missionHero()+missionExplainer()+missionDaysRail()+focusPomodoro()+endgamePanel();
  }

  if(state.view==="days"){
    const day = state.day;
    state.overlay.lastActiveDay = day; saveOverlay();

    const p = state.base.prompts.find(x=>x.day===day);
    const items = itemsForDay(day);
    const ticks = ticksForDay(day);
    const notes = state.overlay.dayNotes[day] || { start:"", end:"", intention:"", complete:false };
    const disabled = state.edit ? "" : "disabled";
    const pct = Math.round(dayPct(day));

    app.innerHTML = `
      <section class="panel focus-target">
        <div class="toolbar">
          ${state.base.sprints.map(s=>`<button class="btn ${s.day===day?'nav-active':''}" data-action="set-day" data-day="${s.day}">${s.day}</button>`).join('')}
        </div>
        <div class="h2">${operatorLine(day)}</div>
        <div class="grid cols-2">
          <div class="panel">
            <div class="h2">Start prompt</div>
            <div class="code">${esc(p?.start||"No prompt")}</div>
            <div class="toolbar"><button class="btn" data-action="copy" data-text="${esc(p?.start||'')}">Load program</button></div>
          </div>
          <div class="panel">
            <div class="h2">End prompt</div>
            <div class="code">${esc(p?.end||"No prompt")}</div>
            <div class="toolbar"><button class="btn" data-action="copy" data-text="${esc(p?.end||'')}">Load program</button></div>
          </div>
        </div>
      </section>

      <section class="panel focus-target">
        <div class="h2">Mission checklist ${ringHtml(pct)}</div>
        ${items.map((it,idx)=>{
          const group = idx<3 ? "Equip/Engage/Extract" : "Side Quest";
          return `
            <label class="checkbox">
              <input type="checkbox" data-action="tick" data-day="${day}" data-id="${esc(it.id)}" ${ticks[it.id]?'checked':''} ${disabled} />
              <div>
                <strong>${esc(it.title)}</strong>
                <div class="small muted">${group}${it.desc? " • "+esc(it.desc):""}</div>
              </div>
            </label>
          `;
        }).join('')}
        <div class="toolbar">
          <label class="checkbox">
            <input type="checkbox" data-action="day-complete" data-day="${day}" ${notes.complete?'checked':''} ${disabled}/>
            <div><strong>Mark day complete</strong> <span class="small muted">(affects streak)</span></div>
          </label>
          <button class="btn" data-action="eod" ${disabled}>End-of-day ritual</button>
        </div>
      </section>

      <section class="grid cols-3 focus-target">
        <div class="panel">
          <div class="h2">Implementation intention</div>
          <input class="input" placeholder="If it’s 9:00am, I will ____." data-action="intent" data-day="${day}" value="${esc(notes.intention)}" ${disabled}/>
        </div>
        <div class="panel">
          <div class="h2">Start notes</div>
          <textarea class="textarea" data-action="note-start" data-day="${day}" ${disabled}>${esc(notes.start)}</textarea>
        </div>
        <div class="panel">
          <div class="h2">End notes</div>
          <textarea class="textarea" data-action="note-end" data-day="${day}" ${disabled}>${esc(notes.end)}</textarea>
        </div>
      </section>
    `;
  }

  if(state.view==="tasks"){
    const groups = { "Not started":[], "In progress":[], "Blocked":[], "Done":[] };
    state.base.tasks.forEach(t=>groups[t.status]?.push(t));
    const cols = Object.entries(groups).map(([k,items])=>`
      <div class="column">
        <div class="h2">${k} <span class="tag">${items.length}</span></div>
        ${items.map(t=>{
          const dPct = Math.round(dayPct(t.day||""));
          return `
            <div class="card">
              <h4>${esc(t.id)} · ${esc(t.title)}</h4>
              <div class="small muted">${esc(t.day)} · ${esc(t.priority)} · Day progress: ${dPct}%</div>
              <div class="note small">Guidance only. Track real progress in Days.</div>
            </div>`;
        }).join('')}
      </div>`).join('');
    el('#app').innerHTML = `<section class="panel"><div class="h2">Kanban (reference)</div><div class="board">${cols}</div></section>`;
  }

  if(state.view==="bugs"){ el('#app').innerHTML = renderBugs(); }
  if(state.view==="parking"){ el('#app').innerHTML = renderParking(); }
  if(state.view==="decisions"){ el('#app').innerHTML = renderDecisions(); }

  if(state.view==="docs"){
    const html = state.overlay.ssotPatch ? sanitizeHtml(state.overlay.ssotPatch) : state.base.ssot;
    el('#app').innerHTML = `
      <section class="panel">
        <div class="h2">SSOT</div>
        <div class="code" style="white-space:normal" id="ssot-view">${html}</div>
        <div class="toolbar">
          <button class="btn" data-action="ssot-edit" ${state.edit?"":"disabled"}>Edit (local)</button>
          <button class="btn" data-action="ssot-clear" ${state.edit?"":"disabled"}>Revert to base</button>
        </div>
        <div id="ssot-editor" style="display:none">
          <textarea class="textarea" id="ssot-text">${state.overlay.ssotPatch||state.base.ssot}</textarea>
          <div class="toolbar">
            <button class="btn" data-action="ssot-save">Save</button>
            <button class="btn" data-action="ssot-cancel">Cancel</button>
          </div>
        </div>
      </section>`;
  }

  if(state.view==="prompts"){
    el('#app').innerHTML = `
      <section class="panel">
        <div class="h2">All prompts (copy to load programs)</div>
        ${renderPromptList(true)}
      </section>`;
  }

  if(state.view==="cheats"){
    el('#app').innerHTML = `
      <section class="panel">
        <div class="h2">Cheat Sheet</div>
        <div class="grid cols-3">
          <div class="panel">
            <h4>VS Code</h4>
            <div class="small">
              <div><span class="kbd">Ctrl</span> + <span class="kbd">P</span> Quick open</div>
              <div><span class="kbd">Ctrl</span> + <span class="kbd">Shift</span> + <span class="kbd">P</span> Command palette</div>
              <div><span class="kbd">Ctrl</span> + <span class="kbd">/</span> Toggle comment</div>
              <div><span class="kbd">Alt</span> + <span class="kbd">Up/Down</span> Move line</div>
              <div><span class="kbd">Ctrl</span> + <span class="kbd">B</span> Toggle sidebar</div>
            </div>
          </div>
          <div class="panel">
            <h4>Git basics</h4>
            <div class="code">git status\ngit add .\ngit commit -m "msg"\ngit push</div>
            <div class="small muted" style="margin-top:6px">Keep commits small & meaningful.</div>
          </div>
          <div class="panel">
            <h4>Shell tips</h4>
            <div class="code">node -v\nnpm -v\npnpm -v\nnpx serve .</div>
          </div>
        </div>
      </section>`;
  }

  if(state.view==="commands"){
    const win = `node -v
npm -v
pnpm -v
git --version
pnpm i
pnpm dev
npx serve .`;
    const mac = `node -v
npm -v
pnpm -v
git --version
pnpm install
pnpm dev
npx serve .`;
    const lin = `node -v
npm -v
pnpm -v
git --version
pnpm install
pnpm dev
npx serve .`;
    el('#app').innerHTML = `
      <section class="panel">
        <div class="h2">Commands</div>
        <div class="grid cols-3">
          <div class="panel"><h4>Windows</h4><div class="code">${esc(win)}</div></div>
          <div class="panel"><h4>macOS</h4><div class="code">${esc(mac)}</div></div>
          <div class="panel"><h4>Linux</h4><div class="code">${esc(lin)}</div></div>
        </div>
        <div class="footer-note">Use VS Code Live Server or “npx serve” to test locally.</div>
      </section>`;
  }

  els('.nav button').forEach(b=>b.classList.toggle('active', b.dataset.view===state.view));
  els('.ring').forEach(r=>r.style.setProperty('--p', overallPct()));
}

/* subviews */
function renderPromptList(includeDays=false){
  const list = includeDays ? state.base.prompts : state.base.prompts.slice(0,3);
  return `
    <table class="table">
      <thead><tr><th>Day</th><th>Start</th><th>End</th></tr></thead>
      <tbody>
        ${list.map(p=>`
        <tr>
          <td>${p.day}</td>
          <td><div class="code">${esc(p.start)}</div><div class="toolbar"><button class="btn" data-action="copy" data-text="${esc(p.start)}">Copy</button></div></td>
          <td><div class="code">${esc(p.end)}</div><div class="toolbar"><button class="btn" data-action="copy" data-text="${esc(p.end)}">Copy</button></div></td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

function renderBugs(){
  const d = state.overlay.bugs;
  const disabled = state.edit?"":"disabled";
  return `
  <section class="panel">
    <div class="h2">Bugs</div>
    <div class="toolbar">
      <input class="input" placeholder="Bug title" id="bug-title" ${disabled}/>
      <select class="input" id="bug-sev" ${disabled}><option>Sev2</option><option>Sev1</option><option>Sev3</option></select>
      <button class="btn" data-action="bug-add" ${disabled}>Add</button>
    </div>
    <table class="table">
      <thead><tr><th>Bug</th><th>Status</th><th>Severity</th><th>Actions</th></tr></thead>
      <tbody>
        ${d.map((b,i)=>`
          <tr>
            <td><strong>#${i+1}</strong> ${esc(b.title)}</td>
            <td>${esc(b.status||"New")}</td>
            <td>${esc(b.severity||"Sev2")}</td>
            <td>
              <button class="btn" data-action="bug-status" data-idx="${i}" data-val="New" ${disabled}>New</button>
              <button class="btn" data-action="bug-status" data-idx="${i}" data-val="In progress" ${disabled}>In progress</button>
              <button class="btn" data-action="bug-status" data-idx="${i}" data-val="Done" ${disabled}>Done</button>
              <button class="btn" data-action="bug-del" data-idx="${i}" ${disabled}>Delete</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>
  </section>`;
}
function renderParking(){
  const base = state.base.parkingSeed;
  const local = state.overlay.parkingLocal;
  const disabled = state.edit?"":"disabled";
  return `
  <section class="panel">
    <div class="h2">Parking</div>
    <div class="toolbar">
      <input class="input" placeholder="Idea" id="pk-name" ${disabled}/>
      <input class="input" placeholder="Area (Builder/Sections/Export/...)" id="pk-area" ${disabled}/>
      <button class="btn" data-action="pk-add" ${disabled}>Add</button>
    </div>
    <table class="table">
      <thead><tr><th>Idea</th><th>Area</th><th></th></tr></thead>
      <tbody>
        ${base.map(p=>`<tr><td>${esc(p.name)}</td><td>${esc(p.area)}</td><td></td></tr>`).join('')}
        ${local.map((p,i)=>`<tr><td>${esc(p.name)} <span class="tag">local</span></td><td>${esc(p.area)}</td><td><button class="btn" data-action="pk-del" data-idx="${i}" ${disabled}>Delete</button></td></tr>`).join('')}
      </tbody>
    </table>
  </section>`;
}
function renderDecisions(){
  const base = state.base.decisionsSeed;
  const local = state.overlay.decisionsLocal;
  const disabled = state.edit?"":"disabled";
  return `
  <section class="panel">
    <div class="h2">Decisions</div>
    <div class="toolbar">
      <input class="input" placeholder="ID (e.g., D-003)" id="dc-id" ${disabled}/>
      <input class="input" placeholder="Date (YYYY-MM-DD)" id="dc-date" ${disabled}/>
      <input class="input" placeholder="Decision" id="dc-decision" ${disabled}/>
      <input class="input" placeholder="Impact" id="dc-impact" ${disabled}/>
      <button class="btn" data-action="dc-add" ${disabled}>Add</button>
    </div>
    <table class="table">
      <thead><tr><th>ID</th><th>Decision</th><th>Date</th><th>Impact</th><th></th></tr></thead>
      <tbody>
        ${base.map(d=>`<tr><td>${esc(d.id)}</td><td>${esc(d.decision)}</td><td>${esc(d.date)}</td><td>${esc(d.impact)}</td><td></td></tr>`).join('')}
        ${local.map((d,i)=>`<tr><td>${esc(d.id)} <span class="tag">local</span></td><td>${esc(d.decision)}</td><td>${esc(d.date)}</td><td>${esc(d.impact)}</td><td><button class="btn" data-action="dc-del" data-idx="${i}" ${disabled}>Delete</button></td></tr>`).join('')}
      </tbody>
    </table>
  </section>`;
}

/* header wiring */
function wireHeader(){
  el('#btn-edit')?.addEventListener('click', ()=>{ state.edit=!state.edit; el('#btn-edit').textContent=`Edit: ${state.edit?'On':'Off'}`; toast(`Edit ${state.edit?'On':'Off'}`); render(); });
  el('#btn-export')?.addEventListener('click', exportOverlay);
  el('#btn-import')?.addEventListener('click', ()=>el('#file-import').click());
  el('#file-import')?.addEventListener('change', e=>{ const f=e.target.files?.[0]; if(f){ importOverlayFromFile(f); } e.target.value=""; });
  el('#btn-reset')?.addEventListener('click', resetOverlay);

  el('#btn-settings')?.addEventListener('click', ()=>{ el('.menu.settings').classList.toggle('open'); });
  document.addEventListener('click', e=>{ if(!e.target.closest('.menu')) el('.menu.settings')?.classList.remove('open'); });

  const S=state.overlay.settings;
  // Handlers are optional-safe (UI may or may not have these)
  el('#set-motion')?.addEventListener('change', e=>{ S.motion = !e.target.checked; saveOverlay(); });
  el('#set-contrast')?.addEventListener('change', e=>{ S.highContrast = e.target.checked; saveOverlay(); render(); });
  el('#set-sound')?.addEventListener('change', e=>{ S.sound = e.target.checked; saveOverlay(); });
  el('#set-rain-mode')?.addEventListener('change', e=>{ S.rainMode = e.target.value; saveOverlay(); applyRainMode(); });

  // initialize panel inputs if present
  const init = ()=>{
    const S=state.overlay.settings;
    const rm = el('#set-rain-mode'); if(rm) rm.value = S.rainMode || "off";
    const m  = el('#set-motion'); if(m) m.checked = !S.motion;
    const c  = el('#set-contrast'); if(c) c.checked = !!S.highContrast;
    const s  = el('#set-sound'); if(s) s.checked = !!S.sound;
  };
  setTimeout(init,0);

  // Label shows Lock In even though the action key stays 'jack'
  el('#btn-jack')?.addEventListener('click', ()=>{
    state.jack=!state.jack;
    document.body.classList.toggle('jackin', state.jack);
    render(); // visual dim
  });
}

/* app wiring */
let pomInt=null, pomLeft=25*60;
function wireApp(){
  document.addEventListener('click', e=>{
    const t=e.target;

    if(t.matches('.nav button')){ state.view=t.dataset.view; render(); return; }
    const d=t.closest('[data-action="set-day"]'); if(d){ state.day=d.dataset.day; state.overlay.lastActiveDay=state.day; saveOverlay(); render(); return; }

    if(t.matches('[data-action="red-pill"]')){ state.view="days"; state.day="D1"; toast("Operator: connecting you to D1."); render(); return; }
    if(t.matches('[data-action="blue-pill"]')){ window.scrollTo({top:document.body.scrollHeight*0.35, behavior: state.overlay.settings.motion?'smooth':'instant'}); return; }
    if(t.matches('[data-action="goto-day"]')){ state.view="days"; state.day=t.dataset.day; render(); return; }

    if(t.matches('[data-action="copy"]')){ navigator.clipboard.writeText(t.dataset.text||""); t.textContent="Loaded"; setTimeout(()=>t.textContent="Load program",1200); return; }

    if(t.matches('[data-action="tick"]')){
      if(!state.edit) return;
      const day=t.dataset.day,id=t.dataset.id;
      const v=t.checked;
      ticksForDay(day)[id]=v;
      act('tick', `${day}:${id}=${v}`); beep(); render(); return;
    }

    if(t.matches('[data-action="day-complete"]')){
      if(!state.edit) return;
      const day=t.dataset.day; const v=t.checked;
      state.overlay.dayNotes[day].complete=v;
      act('day-complete', `${day}=${v}`); render(); return;
    }

    if(t.matches('[data-action="eod"]')){
      if(!state.edit) return;
      const html = `
      <div class="h2" style="margin-bottom:8px">End-of-day ritual</div>
      <ol class="small">
        <li>Commit & push</li><li>Deploy</li><li>Write end notes</li><li>Export progress</li>
      </ol>
      <div class="toolbar"><button class="btn" data-close>Done</button></div>`;
      openModal(html); return;
    }

    if(t.matches('[data-action="eg-save"]]')){
      if(!state.edit) return;
      const eg=state.overlay.endgame;
      eg.repoUrl = el('#eg-repo')?.value.trim()||"";
      eg.demoUrl = el('#eg-demo')?.value.trim()||"";
      eg.retro   = el('#eg-retro')?.value.trim()||"";
      eg.submitted = !!el('#eg-sub')?.checked;
      if(eg.repoUrl && eg.demoUrl && eg.submitted){ eg.complete=true; toast("Exit Code accepted. Readiness 100%.","ok"); }
      saveOverlay(); render(); return;
    }

    // Bugs
    if(t.matches('[data-action="bug-add"]')){
      if(!state.edit) return;
      const title=el('#bug-title')?.value.trim(); const sev=el('#bug-sev')?.value||"Sev2";
      if(!title) return alert("Bug title?");
      state.overlay.bugs.push({title,severity:sev,status:"New"});
      act('bug-add', title); render(); return;
    }
    if(t.matches('[data-action="bug-status"]')){
      if(!state.edit) return; const i=+t.dataset.idx; const v=t.dataset.val;
      if(state.overlay.bugs[i]) state.overlay.bugs[i].status=v;
      act('bug-status', `${i}:${v}`); render(); return;
    }
    if(t.matches('[data-action="bug-del"]')){
      if(!state.edit) return; const i=+t.dataset.idx;
      state.overlay.bugs.splice(i,1); act('bug-del', `${i}`); render(); return;
    }

    // Parking
    if(t.matches('[data-action="pk-add"]')){
      if(!state.edit) return;
      const name=el('#pk-name')?.value.trim(); const area=el('#pk-area')?.value.trim();
      if(!name) return alert("Idea?");
      state.overlay.parkingLocal.push({name,area}); act('pk-add', name); render(); return;
    }
    if(t.matches('[data-action="pk-del"]')){
      if(!state.edit) return; const i=+t.dataset.idx;
      state.overlay.parkingLocal.splice(i,1); act('pk-del', `${i}`); render(); return;
    }

    // Decisions
    if(t.matches('[data-action="dc-add"]')){
      if(!state.edit) return;
      const id=el('#dc-id')?.value.trim(); const date=el('#dc-date')?.value.trim();
      const decision=el('#dc-decision')?.value.trim(); const impact=el('#dc-impact')?.value.trim();
      if(!id||!decision) return alert("ID and Decision required");
      state.overlay.decisionsLocal.push({id,date,decision,impact}); act('dc-add', id); render(); return;
    }
    if(t.matches('[data-action="dc-del"]')){
      if(!state.edit) return; const i=+t.dataset.idx;
      state.overlay.decisionsLocal.splice(i,1); act('dc-del', `${i}`); render(); return;
    }

    // SSOT edit
    if(t.matches('[data-action="ssot-edit"]')){ el('#ssot-editor').style.display='block'; return; }
    if(t.matches('[data-action="ssot-cancel"]')){ el('#ssot-editor').style.display='none'; return; }
    if(t.matches('[data-action="ssot-save"]')){
      if(!state.edit) return;
      const raw=el('#ssot-text').value; state.overlay.ssotPatch=raw; act('ssot-save', `${raw.length} chars`); render(); return;
    }
    if(t.matches('[data-action="ssot-clear"]')){ if(!state.edit) return; state.overlay.ssotPatch=""; act('ssot-clear',''); render(); return; }

    // Focus / Pomodoro
    if(t.matches('[data-action="jack"]')){ state.jack=!state.jack; document.body.classList.toggle('jackin',state.jack); render(); return; }
    if(t.matches('[data-action="pomodoro"]')){
      const v=t.dataset.val;
      if(v==="start"){ if(pomInt) return; pomInt=setInterval(()=>{ pomLeft--; updatePom(); if(pomLeft<=0){ clearInterval(pomInt); pomInt=null; pomLeft=25*60; state.overlay.focusXP+=1; toast("Pomodoro cycle complete. +1 Focus XP"); saveOverlay(); updatePom(); } },1000); }
      if(v==="stop"){ clearInterval(pomInt); pomInt=null; }
      if(v==="reset"){ pomLeft=25*60; updatePom(); }
      return;
    }
  });

  document.addEventListener('input', e=>{
    const t=e.target;
    if(t.matches('[data-action="note-start"]')){ if(!state.edit) return; const d=t.dataset.day; state.overlay.dayNotes[d].start=t.value; saveOverlay(); }
    if(t.matches('[data-action="note-end"]')){ if(!state.edit) return; const d=t.dataset.day; state.overlay.dayNotes[d].end=t.value; saveOverlay(); }
    if(t.matches('[data-action="intent"]')){ if(!state.edit) return; const d=t.dataset.day; state.overlay.dayNotes[d].intention=t.value; saveOverlay(); }
  });
}
function updatePom(){
  const m = Math.floor(pomLeft/60), s=pomLeft%60;
  const elT=el('#pom-time'); if(elT) elT.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

/* export/import/reset */
function exportOverlay(){
  const blob=new Blob([JSON.stringify(state.overlay,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=url; a.download=`project-hq-progress-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function importOverlayFromFile(file){
  const rdr=new FileReader();
  rdr.onload=()=>{ try{ const obj=JSON.parse(String(rdr.result)); if(obj.version!==OVERLAY_VERSION) throw new Error("version mismatch"); state.overlay={...emptyOverlay(), ...obj}; saveOverlay(); render(); }catch(e){ alert("Import failed: "+e.message); } };
  rdr.readAsText(file);
}
function resetOverlay(){
  if(!confirm("This clears your local progress. Continue?")) return;
  state.overlay = emptyOverlay(); saveOverlay(); render();
}

/* sparkline */
function drawSpark(){
  const c=el('#spark'); if(!c) return; const ctx=c.getContext('2d');
  const w=c.width, h=c.height; ctx.clearRect(0,0,w,h);
  const values = DAYS.map(d=> dayPct(d));
  const max = Math.max(1, ...values);
  ctx.strokeStyle="#00ff85"; ctx.lineWidth=2; ctx.beginPath();
  values.forEach((v,i)=>{ const x=(i/(values.length-1))*w; const y=h - (v/max)*h; if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
  ctx.stroke();
}

/* focus/pomodoro panels */
function focusPomodoro(){
  return `
  <section class="grid cols-3">
    <div class="panel">
      <div class="h2">Lock In (Focus)</div>
      <div class="small muted">Hide distractions. Work the plan.</div>
      <div class="toolbar"><button class="btn" data-action="jack">${state.jack? "Exit Lock In" : "Enter Lock In"}</button></div>
    </div>
    <div class="panel">
      <div class="h2">Focus Timer</div>
      <div class="toolbar">
        <button class="btn" data-action="pomodoro" data-val="start">Start</button>
        <button class="btn" data-action="pomodoro" data-val="stop">Stop</button>
        <button class="btn" data-action="pomodoro" data-val="reset">Reset</button>
      </div>
      <div class="small muted">Completing a cycle grants Focus XP (cosmetic).</div>
      <div id="pom-time" class="h2">25:00</div>
    </div>
    <div class="panel">
      <div class="h2">Momentum</div>
      <canvas id="spark" width="320" height="60" style="width:100%;height:60px"></canvas>
      <div class="small muted">Progress by day (tap the big ring for hints).</div>
    </div>
  </section>`;
}
function endgamePanel(){
  const p = Math.round(overallPctRaw());
  if(p<99 && !state.overlay.endgame.complete) return "";
  const eg = state.overlay.endgame;
  return `
  <section class="panel">
    <div class="h2">EXIT CODE</div>
    <div class="small muted">At 99%, complete this ritual to flip to 100%: share links + export progress.</div>
    <div class="grid cols-3">
      <div class="panel">
        <div class="h2">Repo URL</div>
        <input class="input" id="eg-repo" value="${esc(eg.repoUrl)}" ${state.edit?"":"disabled"} />
      </div>
      <div class="panel">
        <div class="h2">Live demo URL</div>
        <input class="input" id="eg-demo" value="${esc(eg.demoUrl)}" ${state.edit?"":"disabled"} />
      </div>
      <div class="panel">
        <div class="h2">Short retro</div>
        <textarea class="textarea" id="eg-retro" ${state.edit?"":"disabled"}>${esc(eg.retro)}</textarea>
      </div>
    </div>
    <div class="toolbar">
      <label class="checkbox"><input type="checkbox" id="eg-sub" ${eg.submitted?'checked':''} ${state.edit?"":"disabled"} /> <div>I have exported my progress JSON and sent links.</div></label>
      <button class="btn" data-action="eg-save" ${state.edit?"":"disabled"}>Save EXIT CODE</button>
    </div>
  </section>`;
}

/* init */
(async function init(){
  state.overlay = loadOverlay();
  try{
    await loadBase();
    document.documentElement.dataset.theme="matrix";
    initRain();
    wireHeader(); wireApp();
    render(); drawSpark();
    if(state.overlay.lastSaved){ const lbl=el('#last-saved'); if(lbl) lbl.textContent=`Last saved locally: ${new Date(state.overlay.lastSaved).toLocaleString()}`; }
    document.addEventListener('change', e=>{ if(e.target.matches('[data-action="tick"]')) beep(); maybeMilestones(); drawSpark(); });
  }catch(e){
    console.error(e);
    el('#app').innerHTML = `<div class="panel"><div class="h2">Load error</div><pre class="code">${esc(String(e))}</pre>
    <div class="toolbar"><button class="btn" onclick="localStorage.removeItem('${STORAGE_KEY}');location.reload()">Reset local data</button></div></div>`;
  }
})();
