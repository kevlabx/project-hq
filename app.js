/* Assignment-mode Project HQ: all state local to the browser. No GitHub links. */

const el  = (sel, root=document) => root.querySelector(sel);
const els = (sel, root=document) => [...root.querySelectorAll(sel)];
const fmtPct = n => `${Math.round(n)}%`;

const STORAGE_KEY = "LP_HQ_STATE_V1";
const OVERLAY_VERSION = 1;

// ---------- small fetch helpers with good errors ----------
async function getJSON(url){ const r = await fetch(url,{cache:"no-cache"}); if(!r.ok) throw new Error(`Fetch ${r.status} ${url}`); return r.json(); }
async function getText(url){ const r = await fetch(url,{cache:"no-cache"}); if(!r.ok) throw new Error(`Fetch ${r.status} ${url}`); return r.text(); }

// ---------- state ----------
const state = {
  base: null,      // base data from /data/*
  overlay: null,   // local-only progress/edits
  view: "dashboard",
  day: "D1",
  edit: false
};

// ---------- overlay (localStorage) ----------
function emptyOverlay(){
  const days = ["D1","D2","D3","D4","D5","D6","D7","D8","D9","D10"];
  const dayNotes = Object.fromEntries(days.map(d => [d, {start:"", end:"", complete:false}]));
  return {
    version: OVERLAY_VERSION,
    dayTicks: {},          // { D1: { itemId:true } }
    dayNotes,              // { Dn: { start, end, complete } }
    bugs: [],              // [{id, title, status, severity}]
    parkingLocal: [],      // [{name, area}]
    decisionsLocal: [],    // [{id,date,decision,impact}]
    ssotPatch: "",         // override html (sanitized)
    lastSaved: null,
    activity: []           // [{time,type,detail}]
  };
}

function loadOverlay(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return emptyOverlay();
    const obj = JSON.parse(raw);
    if(obj.version !== OVERLAY_VERSION) return emptyOverlay();
    return {...emptyOverlay(), ...obj};
  }catch(_){ return emptyOverlay(); }
}

function saveOverlay(){
  state.overlay.lastSaved = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.overlay));
  const label = el('#last-saved');
  if (label) label.textContent = `Last saved locally: ${new Date(state.overlay.lastSaved).toLocaleString()}`;
}

function recordActivity(type, detail){
  state.overlay.activity.push({ time: Date.now(), type, detail });
  if (state.overlay.activity.length > 300) state.overlay.activity.shift();
}

function exportOverlay(){
  const blob = new Blob([JSON.stringify(state.overlay, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `project-hq-progress-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function importOverlayFromFile(file){
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const obj = JSON.parse(String(reader.result));
      if (!obj || obj.version !== OVERLAY_VERSION) throw new Error("Wrong or missing version");
      state.overlay = {...emptyOverlay(), ...obj};
      saveOverlay();
      render();
    }catch(e){ alert(`Import failed: ${e.message}`); }
  };
  reader.readAsText(file);
}

function resetOverlay(){
  if (!confirm("This clears your local progress. Continue?")) return;
  state.overlay = emptyOverlay();
  saveOverlay();
  render();
}

// ---------- sanitisers ----------
function esc(s=""){ return String(s).replace(/[&<>]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])); }

// super simple allowlist for SSOT rendered HTML
function sanitizeHtml(html=""){
  // strip event handlers and script/style tags
  let out = String(html).replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,"");
  out = out.replace(/\son\w+="[^"]*"/gi,"").replace(/\son\w+='[^']*'/gi,"");
  // allow a, strong, em, ul, ol, li, br, p
  // remove unknown tags by escaping them
  const allowed = /^(a|strong|em|ul|ol|li|br|p|b|i)$/i;
  out = out.replace(/<\/?([a-z0-9-]+)([^>]*)>/gi, (m,tag,attrs)=>{
    return allowed.test(tag) ? `<${tag}${attrs}>` : esc(m);
  });
  return out;
}

// ---------- data loading ----------
async function loadBase(){
  const [prompts, sprints, roadmap, tasks, bugsSeed, parkingSeed, decisionsSeed, dayChecks] =
    await Promise.all([
      getJSON("data/prompts.json"),
      getJSON("data/sprints.json"),
      getJSON("data/roadmap.json"),
      getJSON("data/tasks.json"),
      getJSON("data/bugs.json"),
      getJSON("data/parking.json"),
      getJSON("data/decisions.json"),
      getJSON("data/day_checklists.json")
    ]);
  const ssot = await getText("data/ssot.html");
  state.base = {prompts,sprints,roadmap,tasks,bugsSeed,parkingSeed,decisionsSeed,dayChecks,ssot};
}

// ---------- progress computations ----------
function dayItems(day){
  const d = state.base.dayChecks.find(x => x.day === day);
  return d ? d.items : [];
}

function dayTickedCount(day){
  const items = dayItems(day);
  const ticks = state.overlay.dayTicks[day] || {};
  return items.reduce((n,it)=> n + (ticks[it.id] ? 1 : 0), 0);
}

function dayProgressPct(day){
  const items = dayItems(day);
  if (!items.length) return 0;
  return (dayTickedCount(day) / items.length) * 100;
}

function overallProgress(){
  const days = state.base.sprints.map(s=>s.day);
  if (!days.length) return 0;
  const sum = days.reduce((a,d)=> a + dayProgressPct(d), 0);
  return sum / days.length;
}

// ---------- rendering helpers ----------
function tagStatus(s){
  const m = {"Done":"badge-ok","In progress":"badge-warn","Blocked":"badge-bad","Not started":""}[s] || "";
  return `<span class="tag ${m}">${s}</span>`;
}

function boardCols(){
  const groups = { "Not started":[], "In progress":[], "Blocked":[], "Done":[] };
  state.base.tasks.forEach(t => groups[t.status]?.push(t));
  const cols = Object.entries(groups).map(([k,items])=>`
    <div class="column">
      <div class="h2">${k} <span class="tag">${items.length}</span></div>
      ${items.map(t=>`
        <div class="card">
          <h4>${esc(t.id)} · ${esc(t.title)}</h4>
          <div class="small muted">${esc(t.day)} · ${esc(t.priority)} · ${esc(String(t.percent||0))}%</div>
          <div class="note">Guidance only. Progress is tracked by day checklists.</div>
        </div>
      `).join('')}
    </div>
  `).join('');
  return `<div class="board">${cols}</div>`;
}

function renderChecklist(day){
  const items = dayItems(day);
  const ticks = state.overlay.dayTicks[day] || {};
  const disabled = state.edit ? "" : "disabled";
  return `
    <div class="panel">
      <div class="h2">Checklist for ${day} <span class="small muted">(${dayTickedCount(day)} / ${items.length})</span></div>
      ${items.map(it=>`
        <label class="checkbox">
          <input type="checkbox" data-action="tick" data-day="${day}" data-id="${esc(it.id)}" ${ticks[it.id]?'checked':''} ${disabled}/>
          <div><strong>${esc(it.title)}</strong><div class="small muted">${esc(it.desc||"")}</div></div>
        </label>
      `).join('')}
      <div class="toolbar">
        <label class="checkbox">
          <input type="checkbox" data-action="day-complete" data-day="${day}" ${state.overlay.dayNotes[day]?.complete ? 'checked':''} ${disabled}/>
          <div><strong>Mark day complete</strong></div>
        </label>
        <div class="tag">Progress: ${Math.round(dayProgressPct(day))}%</div>
      </div>
    </div>
  `;
}

function renderDayNotes(day){
  const notes = state.overlay.dayNotes[day] || {start:"", end:""};
  const disabled = state.edit ? "" : "disabled";
  return `
    <div class="grid cols-2">
      <div class="panel">
        <div class="h2">Start notes</div>
        <textarea class="textarea" data-action="note-start" data-day="${day}" ${disabled}>${esc(notes.start)}</textarea>
      </div>
      <div class="panel">
        <div class="h2">End notes</div>
        <textarea class="textarea" data-action="note-end" data-day="${day}" ${disabled}>${esc(notes.end)}</textarea>
      </div>
    </div>
  `;
}

function renderPromptList(includeDays=false){
  const list = includeDays ? state.base.prompts : state.base.prompts.slice(0,3);
  return `
    <table class="table">
      <thead><tr><th>Day</th><th>Start prompt</th><th>End prompt</th></tr></thead>
      <tbody>
        ${list.map(p=>`
        <tr>
          <td>${p.day}</td>
          <td>
            <div class="code">${esc(p.start)}</div>
            <div class="toolbar"><button class="btn" data-action="copy" data-text="${esc(p.start)}">Copy</button></div>
          </td>
          <td>
            <div class="code">${esc(p.end)}</div>
            <div class="toolbar"><button class="btn" data-action="copy" data-text="${esc(p.end)}">Copy</button></div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  `;
}

function renderBugs(){
  const disabled = state.edit ? "" : "disabled";
  const list = state.overlay.bugs;
  return `
    <div class="panel">
      <div class="h2">Bugs</div>
      <div class="toolbar">
        <input class="input" placeholder="Bug title" id="bug-title" ${disabled}/>
        <select class="input" id="bug-sev" ${disabled}>
          <option>Sev2</option><option>Sev1</option><option>Sev3</option>
        </select>
        <button class="btn" data-action="bug-add" ${disabled}>Add</button>
      </div>
      <table class="table">
        <thead><tr><th>Bug</th><th>Status</th><th>Severity</th><th>Actions</th></tr></thead>
        <tbody>
          ${list.map((b,i)=>`
            <tr>
              <td><strong>#${i+1}</strong> ${esc(b.title)} ${b.local?'<span class="badge-local">local</span>':''}</td>
              <td>${esc(b.status||"New")}</td>
              <td>${esc(b.severity||"Sev2")}</td>
              <td>
                <button class="btn" data-action="bug-status" data-idx="${i}" data-val="New" ${disabled}>New</button>
                <button class="btn" data-action="bug-status" data-idx="${i}" data-val="In progress" ${disabled}>In progress</button>
                <button class="btn" data-action="bug-status" data-idx="${i}" data-val="Done" ${disabled}>Done</button>
                <button class="btn" data-action="bug-del" data-idx="${i}" ${disabled}>Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="note">Bugs are stored only in your browser. Export JSON to share.</div>
    </div>
  `;
}

function renderParking(){
  const disabled = state.edit ? "" : "disabled";
  const base = state.base.parkingSeed;
  const local = state.overlay.parkingLocal;
  return `
    <div class="panel">
      <div class="h2">Parking Lot</div>
      <div class="toolbar">
        <input class="input" placeholder="Idea" id="pk-name" ${disabled}/>
        <input class="input" placeholder="Area (Builder / Sections / Export / ...)" id="pk-area" ${disabled}/>
        <button class="btn" data-action="pk-add" ${disabled}>Add</button>
      </div>
      <table class="table">
        <thead><tr><th>Idea</th><th>Area</th><th></th></tr></thead>
        <tbody>
          ${base.map(p=>`
            <tr><td>${esc(p.name)}</td><td>${esc(p.area)}</td><td></td></tr>
          `).join('')}
          ${local.map((p,i)=>`
            <tr><td>${esc(p.name)} <span class="badge-local">local</span></td><td>${esc(p.area)}</td>
            <td><button class="btn" data-action="pk-del" data-idx="${i}" ${disabled}>Delete</button></td></tr>
          `).join('')}
        </tbody>
      </table>
      <div class="note">Base items are read-only. Your additions are local.</div>
    </div>
  `;
}

function renderDecisions(){
  const disabled = state.edit ? "" : "disabled";
  const base = state.base.decisionsSeed;
  const local = state.overlay.decisionsLocal;
  return `
    <div class="panel">
      <div class="h2">Decisions log</div>
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
          ${base.map(d=>`
            <tr><td>${esc(d.id)}</td><td>${esc(d.decision)}</td><td>${esc(d.date)}</td><td>${esc(d.impact)}</td><td></td></tr>
          `).join('')}
          ${local.map((d,i)=>`
            <tr><td>${esc(d.id)} <span class="badge-local">local</span></td><td>${esc(d.decision)}</td><td>${esc(d.date)}</td><td>${esc(d.impact)}</td>
            <td><button class="btn" data-action="dc-del" data-idx="${i}" ${disabled}>Delete</button></td></tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderSSOT(){
  const disabled = state.edit ? "" : "disabled";
  const html = state.overlay.ssotPatch ? sanitizeHtml(state.overlay.ssotPatch) : state.base.ssot;
  return `
    <div class="panel">
      <div class="h2">Single Source of Truth</div>
      <div class="code" style="white-space:normal" id="ssot-view">${html}</div>
      <div class="toolbar">
        <button class="btn" data-action="ssot-edit" ${disabled}>Edit (local)</button>
        <button class="btn" data-action="ssot-clear" ${disabled}>Revert to base</button>
      </div>
      <div class="note">Edits are stored locally and sanitized. Base SSOT is never changed.</div>
      <div id="ssot-editor" style="display:none">
        <textarea class="textarea" id="ssot-text"></textarea>
        <div class="toolbar">
          <button class="btn" data-action="ssot-save">Save</button>
          <button class="btn" data-action="ssot-cancel">Cancel</button>
        </div>
      </div>
    </div>
  `;
}

// ---------- main render ----------
function render(){
  const app = el('#app');
  if (!state.base){ app.innerHTML = '<div class="panel">Loading…</div>'; return; }

  // header edit button label
  const btn = el('#btn-edit'); if(btn) btn.textContent = `Edit: ${state.edit ? 'On' : 'Off'}`;
  const ringAll = overallProgress();

  if (state.view === 'dashboard'){
    app.innerHTML = `
      <section class="grid cols-3">
        <div class="panel kpi">
          <div class="ring" style="--p:${ringAll}"></div>
          <div>
            <div class="h2">Overall progress</div>
            <div class="small muted">Calculated from daily checklists</div>
            <div class="h2">${fmtPct(ringAll)}</div>
          </div>
        </div>
        <div class="panel kpi">
          <div>
            <div class="h2">Assignment</div>
            <div class="small muted">Build LoomPages MVP in your own repo</div>
            <div class="h2">10 days</div>
          </div>
        </div>
        <div class="panel kpi">
          <div>
            <div class="h2">Privacy</div>
            <div class="small muted">Local-only tracking</div>
            <div class="h2">No uploads</div>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="h2">Live task board (reference)</div>
        ${boardCols()}
      </section>

      <section class="grid cols-2">
        <div class="panel">
          <div class="h2">SSOT quick view</div>
          <div class="small muted">Single Source of Truth summary (editable locally on SSOT tab)</div>
          <div class="code" style="max-height:180px;overflow:auto">${state.overlay.ssotPatch ? sanitizeHtml(state.overlay.ssotPatch) : state.base.ssot}</div>
        </div>
        <div class="panel">
          <div class="h2">Daily prompts library</div>
          <div class="small muted">Copy prompts for ChatGPT</div>
          ${renderPromptList()}
        </div>
      </section>
    `;
  }

  if (state.view === 'days'){
    const day = state.day;
    const p = state.base.prompts.find(x=>x.day===day);
    app.innerHTML = `
      <section class="panel">
        <div class="toolbar">
          ${state.base.sprints.map(s=>`
            <button class="btn ${s.day===day?'nav-active':''}" data-day="${s.day}" data-action="set-day">${s.day}</button>
          `).join('')}
        </div>
        <div class="h2">Day ${day.slice(1)} plan</div>
        <div class="grid cols-2">
          <div class="panel">
            <div class="h2">Start prompt</div>
            <div class="code">${esc(p?.start||"No prompt")}</div>
            <div class="toolbar"><button class="btn" data-action="copy" data-text="${esc(p?.start||'')}">Copy</button></div>
          </div>
          <div class="panel">
            <div class="h2">End prompt</div>
            <div class="code">${esc(p?.end||"No prompt")}</div>
            <div class="toolbar"><button class="btn" data-action="copy" data-text="${esc(p?.end||'')}">Copy</button></div>
          </div>
        </div>
      </section>

      ${renderChecklist(day)}
      ${renderDayNotes(day)}
    `;
  }

  if (state.view === 'tasks'){
    app.innerHTML = `
      <section class="panel">
        <div class="h2">Kanban board (reference only)</div>
        ${boardCols()}
      </section>
    `;
  }

  if (state.view === 'bugs'){ app.innerHTML = renderBugs(); }
  if (state.view === 'parking'){ app.innerHTML = renderParking(); }
  if (state.view === 'decisions'){ app.innerHTML = renderDecisions(); }

  if (state.view === 'docs'){
    app.innerHTML = renderSSOT();
    // prep hidden editor textarea with current patch or base
    const ed = el("#ssot-text");
    if (ed) ed.value = state.overlay.ssotPatch || state.base.ssot;
  }

  if (state.view === 'prompts'){
    app.innerHTML = `
      <section class="panel">
        <div class="h2">Prompts library</div>
        ${renderPromptList(true)}
      </section>
    `;
  }

  if (state.view === 'demos'){
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

  if (state.view === 'commands'){
    app.innerHTML = `
      <section class="panel">
        <div class="h2">Windows commands</div>
        <div class="code">node -v\nnpm -v\npnpm -v\ngit --version\npnpm i\npnpm dev</div>
        <div class="footer-note">Use VS Code Live Server or “npx serve” to test locally.</div>
      </section>
    `;
  }

  els('.nav button').forEach(b => b.classList.toggle('active', b.dataset.view===state.view));
  els('.ring').forEach(r => r.style.setProperty('--p', overallProgress()));
}

// ---------- wiring ----------
function wireHeader(){
  el('#btn-edit')?.addEventListener('click', ()=>{
    state.edit = !state.edit;
    render();
  });
  el('#btn-export')?.addEventListener('click', ()=> exportOverlay());
  el('#btn-import')?.addEventListener('click', ()=> el('#file-import').click());
  el('#file-import')?.addEventListener('change', (e)=> {
    const f = e.target.files?.[0]; if (f) importOverlayFromFile(f);
    e.target.value = "";
  });
  el('#btn-reset')?.addEventListener('click', resetOverlay);
}

function wireAppLevel(){
  document.addEventListener('click', (e)=>{
    const t = e.target;

    if (t.matches('.nav button')){ state.view = t.dataset.view; render(); return; }
    const dayBtn = t.closest('[data-action="set-day"]'); if (dayBtn){ state.day = dayBtn.dataset.day; render(); return; }

    if (t.matches('[data-action="copy"]')){
      navigator.clipboard.writeText(t.dataset.text || "");
      t.textContent = "Copied"; setTimeout(()=>t.textContent="Copy",1200);
      return;
    }

    if (t.matches('[data-action="tick"]')){
      if (!state.edit) return;
      const day = t.dataset.day, id = t.dataset.id;
      state.overlay.dayTicks[day] = state.overlay.dayTicks[day] || {};
      state.overlay.dayTicks[day][id] = !!t.checked;
      recordActivity('tick', `${day}:${id}=${t.checked}`);
      saveOverlay(); render();
      return;
    }

    if (t.matches('[data-action="day-complete"]')){
      if (!state.edit) return;
      const day = t.dataset.day;
      state.overlay.dayNotes[day] = state.overlay.dayNotes[day] || {start:"", end:"", complete:false};
      state.overlay.dayNotes[day].complete = t.checked;
      recordActivity('day-complete', `${day}=${t.checked}`);
      saveOverlay(); render();
      return;
    }

    // Bugs
    if (t.matches('[data-action="bug-add"]')){
      if (!state.edit) return;
      const title = el('#bug-title')?.value.trim(); const sev = el('#bug-sev')?.value || "Sev2";
      if (!title) return alert("Enter a bug title");
      state.overlay.bugs.push({ title, severity: sev, status: "New", local:true });
      recordActivity('bug-add', title);
      saveOverlay(); render();
      return;
    }
    if (t.matches('[data-action="bug-status"]')){
      if (!state.edit) return;
      const i = Number(t.dataset.idx); const v = t.dataset.val;
      if (state.overlay.bugs[i]) state.overlay.bugs[i].status = v;
      recordActivity('bug-status', `${i}:${v}`);
      saveOverlay(); render(); return;
    }
    if (t.matches('[data-action="bug-del"]')){
      if (!state.edit) return;
      const i = Number(t.dataset.idx);
      state.overlay.bugs.splice(i,1);
      recordActivity('bug-del', String(i));
      saveOverlay(); render(); return;
    }

    // Parking
    if (t.matches('[data-action="pk-add"]')){
      if (!state.edit) return;
      const name = el('#pk-name')?.value.trim(); const area = el('#pk-area')?.value.trim();
      if (!name) return alert("Enter idea");
      state.overlay.parkingLocal.push({name, area});
      recordActivity('pk-add', name);
      saveOverlay(); render(); return;
    }
    if (t.matches('[data-action="pk-del"]')){
      if (!state.edit) return;
      const i = Number(t.dataset.idx);
      state.overlay.parkingLocal.splice(i,1);
      recordActivity('pk-del', String(i));
      saveOverlay(); render(); return;
    }

    // Decisions
    if (t.matches('[data-action="dc-add"]')){
      if (!state.edit) return;
      const id = el('#dc-id')?.value.trim();
      const date = el('#dc-date')?.value.trim();
      const decision = el('#dc-decision')?.value.trim();
      const impact = el('#dc-impact')?.value.trim();
      if (!id || !decision) return alert("Enter ID and decision");
      state.overlay.decisionsLocal.push({id,date,decision,impact});
      recordActivity('dc-add', id);
      saveOverlay(); render(); return;
    }
    if (t.matches('[data-action="dc-del"]')){
      if (!state.edit) return;
      const i = Number(t.dataset.idx);
      state.overlay.decisionsLocal.splice(i,1);
      recordActivity('dc-del', String(i));
      saveOverlay(); render(); return;
    }

    // SSOT edit
    if (t.matches('[data-action="ssot-edit"]')){ el('#ssot-editor').style.display = 'block'; return; }
    if (t.matches('[data-action="ssot-cancel"]')){ el('#ssot-editor').style.display = 'none'; return; }
    if (t.matches('[data-action="ssot-clear"]')){
      if (!state.edit) return;
      state.overlay.ssotPatch = "";
      recordActivity('ssot-clear', '');
      saveOverlay(); render(); return;
    }
    if (t.matches('[data-action="ssot-save"]')){
      if (!state.edit) return;
      const raw = el('#ssot-text').value;
      state.overlay.ssotPatch = raw;
      recordActivity('ssot-save', `${raw.length} chars`);
      saveOverlay(); render(); return;
    }
  });

  document.addEventListener('input', (e)=>{
    const t = e.target;
    if (t.matches('[data-action="note-start"]')){
      if (!state.edit) return;
      const d = t.dataset.day;
      state.overlay.dayNotes[d] = state.overlay.dayNotes[d] || {start:"", end:"", complete:false};
      state.overlay.dayNotes[d].start = t.value;
      saveOverlay();
    }
    if (t.matches('[data-action="note-end"]')){
      if (!state.edit) return;
      const d = t.dataset.day;
      state.overlay.dayNotes[d] = state.overlay.dayNotes[d] || {start:"", end:"", complete:false};
      state.overlay.dayNotes[d].end = t.value;
      saveOverlay();
    }
  });
}

// ---------- init ----------
(async function init(){
  state.overlay = loadOverlay();
  try{
    wireHeader();
    wireAppLevel();
    await loadBase();
    render();
    if (state.overlay.lastSaved) {
      const label = el('#last-saved');
      if (label) label.textContent = `Last saved locally: ${new Date(state.overlay.lastSaved).toLocaleString()}`;
    }
  }catch(e){
    const app = el('#app');
    console.error(e);
    app.innerHTML = `<div class="panel"><div class="h2">Load error</div><pre class="code">${esc(String(e))}</pre>
    <div class="toolbar"><button class="btn" onclick="localStorage.removeItem('${STORAGE_KEY}');location.reload()">Reset local data</button></div></div>`;
  }
})();
