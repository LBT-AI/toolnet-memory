#!/usr/bin/env node
import*as B from"fs";import*as Xe from"path";import*as v from"fs";import*as h from"path";import*as be from"crypto";function A(r){return r?Math.ceil(r.length/3.5):0}function J(r,t){if(!r)return"";if(A(r)<=t)return r;let n=Math.floor(t*3.5),s=r.slice(0,n),i=s.lastIndexOf("."),a=s.lastIndexOf(`
`),l=Math.max(i,a);return l>n*.7?s.slice(0,l+1):s}function le(r,t){if(!r)return"";let e=r.split(`
`).filter(i=>i.trim());if(e.length<=t)return r;let n=e.slice(0,t),s=e.length-t;return[...n,`... (${s} more items omitted)`].join(`
`)}function tt(r,t){let{maxTokens:e,trimMarker:n="[Context trimmed by ToolNet Memory token budget]"}=t;if(r.length===0)return"";let s=[...r].sort((c,p)=>p.priority-c.priority),i=[],a=0,l=!1;for(let c of s){let p=`# ${c.title}

`,f=A(p),u=A(c.content),y=f+u;if(a+y<=e)i.push(p+c.content),a+=y;else{let d=e-a-f;if(d>50){let g=J(c.content,d);i.push(p+g),a=e,l=!0}else l=!0;break}}return l&&i.push(`
${n}
`),i.join(`

---

`)}function de(r,t){let e=[{title:"Profile",content:le(r,10),priority:100},{title:"Current Work",content:le(t,15),priority:90}];return tt(e,{maxTokens:800})}import{chmodSync as $r,existsSync as rt,mkdirSync as _r,readFileSync as nt,renameSync as Fr,writeFileSync as Wr}from"node:fs";import{dirname as Kr,join as fe}from"node:path";var me="toolnet.context-offload.v1";function st(r){return fe(r,".toolnet","offload")}function ot(r){return fe(st(r),"graph.json")}function U(){return{schema:me,version:1,updatedAt:new Date(0).toISOString(),nodes:[]}}function it(r){let t=ot(r);if(!rt(t))return U();try{let e=JSON.parse(nt(t,"utf8"));return e.schema!==me||e.version!==1||!Array.isArray(e.nodes)?U():e}catch{return U()}}function pe(r,t){let e=r.replace(/\s+/gu," ").trim();return e.length<=t?e:e.slice(0,t-1).trimEnd()+"\u2026"}function ge(r,t={}){let e=it(r);if(e.nodes.length===0)return"";let n=Math.max(1,Math.min(12,t.maxAssets??6)),s=Math.max(320,Math.min(2400,t.maxChars??900)),i=["[TOOLNET CONTEXT OFFLOAD GRAPH]","Large tool/file payloads stay outside prompt context.","Read only a needed asset with MCP context_offload_read."];for(let a of e.nodes.slice(-n).reverse()){let l=pe(a.sourceRefs.at(-1)??"unknown",72),c=a.files.length>0?` files=${pe(a.files.join(","),120)}`:"",p=`event:${l} --offloads--> asset:${a.id.slice(0,12)} kind=${a.kind} bytes=${a.bytes}${c}`;if([...i,p].join(`
`).length>s)break;i.push(p)}return i.join(`
`)}import{existsSync as he,mkdirSync as Gr,readFileSync as ye,renameSync as qr,writeFileSync as Yr}from"node:fs";import{dirname as Xr,join as ke}from"node:path";import{createHash as at}from"node:crypto";import{dirname as ct}from"node:path";import{mkdirSync as ut,readFileSync as zr,renameSync as lt,writeFileSync as dt}from"node:fs";function S(r){return at("sha256").update(r).digest("hex")}function P(r,t){ut(ct(r),{recursive:!0});let e=`${r}.${process.pid}.tmp`;dt(e,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),lt(e,r)}function pt(r){return ke(r.rootPath,".toolnet","context","handoff.md")}function ft(r){return ke(r.rootPath,".toolnet","context","handoff.json")}function mt(r){let t=pt(r);if(!he(t))return null;try{let e=ye(t,"utf8").trim();if(!e)return null;let n=new Date(0).toISOString(),s=ft(r);if(he(s))try{let i=JSON.parse(ye(s,"utf8"));typeof i.generatedAt=="string"&&(n=i.generatedAt)}catch{}return{version:1,projectId:r.id,projectName:r.name,text:e,digest:S(e),generatedAt:n}}catch{return null}}function Se(r,t=1800){let e=mt(r);if(!e?.text)return null;let n=e.text;return n.length>t&&(n=`${n.slice(0,t)}

[Fast handoff truncated]`),["[TOOLNET FAST HANDOFF]","",`Project: ${r.name}`,`Updated: ${e.generatedAt}`,"",n].join(`
`)}var $="memory_agent_ask";function ve(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${$}

Use it automatically BEFORE guessing when:

- The user asks to continue, resume, or pick up previous work.
- The user says things like:
  - "ti\u1EBFp t\u1EE5c task l\xFAc n\xE3y"
  - "l\xE0m ti\u1EBFp ph\u1EA7n \u0111ang d\u1EDF"
  - "agent tr\u01B0\u1EDBc \u0111ang l\xE0m g\xEC?"
  - "d\u1EEBng \u1EDF \u0111\xE2u?"
  - "todo n\xE0o ch\u01B0a xong?"
  - "continue the previous task"
  - "resume the last session"
- Previous-agent state, unfinished work, blockers,
  decisions, touched files, or next actions are unclear.
- Fast startup context is not enough to safely continue.

Mode:

- mode="local"
  for all continuity questions, including:
  current task, last file, blocker, completed TODOs,
  composite continuity questions, and agent takeover.

- ToolNet Memory Agent is deterministic and local-only.
  No external AI/LLM provider is used.

Do NOT call it automatically when:

- Normal startup context already gives enough information.
- The question is unrelated to previous project work.
- The answer is obvious from current repository evidence.

Rules:

- Never invent previous work.
- Current repository evidence overrides stale memory.
- NEVER reconstruct previous work by reading ToolNet internal session files.
- NEVER read/list/search .toolnet/journal/**, .toolnet/runtime/sources/**, and legacy .toolnet/sessions/**, session state.json,
  events.jsonl, or raw transcripts to discover previous-agent state.
- Do not search the filesystem for the implementation/schema of
  memory_agent_ask. Invoke the MCP tool directly when deeper
  continuity is required.
- Do not dump raw transcripts or full memory.
- After receiving the ToolNet answer, continue the task
  instead of asking the user to repeat known context.
- If ToolNet says information is not recorded, say so.
`.trim()}function xe(){return`
[TOOLNET MEMORY AGENT]

Tool:
- ${$}

For resume/continue requests:

1. Use the injected ToolNet continuity handoff FIRST.
2. If the handoff is missing or ambiguous, invoke
   ${$} directly BEFORE repository/history exploration.
3. NEVER reconstruct prior work from:
   - .toolnet/journal/**, .toolnet/runtime/sources/**, and legacy .toolnet/sessions/**
   - state.json
   - events.jsonl
   - raw transcripts
4. NEVER search for the implementation/schema of
   ${$}; invoke the MCP tool directly.
5. Inspect git/source only AFTER continuity context is known.

Use:
- mode="local" for all continuity questions.
- No AI/LLM mode exists.

Current repository evidence overrides stale memory.
`.trim()}function C(r){let t=h.resolve(r),e=h.parse(t).root;for(;t!==e;){let n=h.join(t,".toolnet");if(v.existsSync(n)&&v.statSync(n).isDirectory())return t;t=h.dirname(t)}return null}function _(r){try{return v.existsSync(r)?v.readFileSync(r,"utf-8").trim():null}catch{return null}}function we(r){return r.split(`
`).filter(n=>{let s=n.toUpperCase();return!(s.includes("SECRET")||s.includes("TOKEN")||s.includes("API_KEY")||s.includes("APIKEY")||s.includes("PASSWORD")||s.includes("PASS="))}).join(`
`)}function G(r={}){let t=r.projectPath||process.cwd(),e=C(t);if(!e)return null;let n=h.join(e,".toolnet","project.json"),s="Unknown";try{if(v.existsSync(n)){let j=JSON.parse(v.readFileSync(n,"utf-8"));s=j.name||j.projectName||"Unknown"}}catch{}let i=h.join(e,".toolnet","profile.md"),a=h.join(e,".toolnet","current.md"),l=_(i)||"",c=_(a)||"";l=we(l),c=we(c);let p=`[TOOLNET PROJECT CONTEXT]

Project: ${s}
Root: ${e}

`,f=de(l,c),u=Se({id:"",name:s,rootPath:e},1600),y=u?`

${u}
`:"",d=ge(e,{maxAssets:6,maxChars:900}),g=d?`

${d}
`:"",O=`

${xe()}

Forbidden At Startup:
- Do not run session:agy-recover, handoff:latest, or brief automatically.
- Do not perform deep recovery merely because an agent starts.
- If the user asks to resume previous work and fast context is insufficient,
  use memory_agent_ask before guessing.
`;return p+f+y+g+O}function je(r={}){let t=r.projectPath||process.cwd(),e=C(t);if(!e)throw new Error("Not in a ToolNet project (no .toolnet directory found)");let n=h.join(e,".toolnet","profile.md"),s=h.join(e,".toolnet","current.md"),i=_(n)||"",a=_(s)||"",l=`# AI Startup Instructions

Read and follow:
- .toolnet/profile.md
- .toolnet/current.md

Rules:
- Fast context first.
- Do not run session:agy-recover, handoff:latest, or brief automatically.
- Do not invent previous-session state.
- Current repository evidence overrides stale memory.

${ve()}

---

## Profile

${i}

---

## Current Work

${a}
`,c=["GEMINI.md","AGENTS.md","CLAUDE.md"],p=[];for(let f of c){let u=h.join(e,f);try{v.writeFileSync(u,l,"utf-8"),p.push(f)}catch(y){console.error(`Failed to write ${f}:`,y)}}return p}function Ae(r){return be.createHash("sha256").update(r,"utf-8").digest("hex")}import{existsSync as Dn,mkdirSync as It,readFileSync as Kn,writeFileSync as Rt}from"node:fs";import{dirname as Et,join as Fe}from"node:path";import{existsSync as Me,mkdirSync as gt,readFileSync as ht,statSync as Pe,writeFileSync as yt}from"node:fs";import{dirname as kt,join as St}from"node:path";var Ce=64*1024,vt=`# ToolNet Project Operating Manual

This file contains persistent instructions for AI agents working on this project.

## Critical Rules

<!--
Examples:

- [enforce] Never edit production files directly.
- [enforce] Edit source only in /path/to/source.
- [enforce] Deploy only with ./deploy.sh --apply
-->

## Workflow

<!--
Describe the correct working process.
-->

## Architecture

<!--
Important architecture conventions.
-->

## Verification

<!--
Tests / QA required after changes.
-->

## Known Gotchas

<!--
Things an AI agent should always remember.
-->

## Preferences

<!--
- [advisory] Prefer small focused files.
-->
`;function F(r){return St(r.rootPath,".toolnet","PROJECT.md")}function xt(r){return r.normalize("NFKC").replace(/\s+/g," ").trim()}function wt(r){let t=[],e=new Set,n=/^\s*[-*]\s+\[(enforce|advisory)\]\s+(.+?)\s*$/gimu,s;for(;s=n.exec(r);){let i=s[1].toLowerCase(),a=xt(s[2]);if(!a)continue;let l=`${i}:${a.toLowerCase()}`;e.has(l)||(e.add(l),t.push({id:S(l).slice(0,24),mode:i,text:a,source:"manual"}))}return t}function bt(r){let t=F(r);return Me(t)||(gt(kt(t),{recursive:!0}),yt(t,vt,{encoding:"utf8",mode:384})),t}function q(r,t=!1){let e=t?bt(r):F(r);if(!Me(e))return null;if(Pe(e).size>Ce)throw new Error(`PROJECT.md exceeds ${Ce} bytes`);let s=ht(e,"utf8");return{path:e,content:s,digest:S(s),rules:wt(s),bytes:Buffer.byteLength(s,"utf8"),updatedAt:new Date(Pe(e).mtimeMs).toISOString()}}import{join as Te}from"node:path";import{mkdirSync as jt}from"node:fs";function Re(r){return r.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim()}function x(r,t=20){let e=[],n=new Set;for(let s of r.slice().reverse()){let i=Re(s);if(!(!i||n.has(i))&&(n.add(i),e.push(s),e.length>=t))break}return e.reverse()}function At(r,t=20){let e=new Map;for(let n of r){let s=`${n.kind}|${Re(n.command)}`;e.delete(s),e.set(s,n)}return Array.from(e.values()).slice(-t)}function Pt(r){return r.kind==="phase"?/^Phase\s+\d+$/iu.test(r.text):r.kind==="task"?/^(?:TODO|Task|Việc)\s+\d+$/iu.test(r.text):!1}function Ie(r,t){let e=t.status??r?.status??"pending",n=e;r&&(r.status==="completed"&&e!=="completed"?n="completed":e==="pending"&&(r.status==="in_progress"||r.status==="blocked")&&(n=r.status));let s=r&&Pt(t)?r.title:t.text;return{id:r?.id??S(t.key).slice(0,24),title:s,status:n,order:t.order??r?.order,confidence:Math.max(t.confidence,r?.confidence??0),updatedAt:t.occurredAt,updatedBy:{agent:t.agent,nativeSessionId:t.nativeSessionId,eventId:t.eventId}}}async function Ee(r,t){let e=`projects/${r.id}/work/observations/`,n=await t.list(e),s=[];for(let i of n.filter(a=>a.key.endsWith(".json")).sort((a,l)=>a.key.localeCompare(l.key))){let a=await t.getText(i.key);if(a)try{let l=JSON.parse(a);l.version===1&&Array.isArray(l.observations)&&s.push(l)}catch{}}return s}async function Oe(r,t){let n=(await Ee(r,t)).flatMap(o=>o.observations).sort((o,k)=>{let ce=o.occurredAt.localeCompare(k.occurredAt);if(ce!==0)return ce;let ue=o.sequence-k.sequence;return ue!==0?ue:o.id.localeCompare(k.id)}),s=new Map,i=new Map,a,l,c,p,f,u=[],y=[],d=[],g=[],O=[],j=new Map,te=[],re=[],ne=[],se=[],oe=[],ie=[];for(let o of n)switch(o.kind){case"request":a=o.text;break;case"activity":l=o.text;break;case"goal":c=o.text;break;case"plan":p=o.text;break;case"phase":s.set(o.key,Ie(s.get(o.key),o));break;case"task":i.set(o.key,Ie(i.get(o.key),o));break;case"decision":u.push(o.text);break;case"blocker":y.push(o.text);break;case"warning":d.push(o.text);break;case"next_action":g.push(o.text);break;case"file":{O.push(o.text);let k=o.fileAction??"active";j.delete(o.text),j.set(o.text,k),k==="modified"?te.push(o.text):k==="created"?re.push(o.text):k==="deleted"&&ne.push(o.text);break}case"command":se.push(o.text);break;case"test":oe.push(o.text),o.checkKind&&ie.push({kind:o.checkKind,command:o.text,status:o.checkStatus??"unknown",updatedAt:o.occurredAt,agent:o.agent,nativeSessionId:o.nativeSessionId});break;case"session":f={agent:o.agent,nativeSessionId:o.nativeSessionId,sessionKey:o.sessionKey,updatedAt:o.occurredAt};break}let b=Array.from(s.values()).sort((o,k)=>(o.order??Number.MAX_SAFE_INTEGER)-(k.order??Number.MAX_SAFE_INTEGER)),w=Array.from(i.values()).sort((o,k)=>(o.order??Number.MAX_SAFE_INTEGER)-(k.order??Number.MAX_SAFE_INTEGER)),H=b.find(o=>o.status==="in_progress")??b.find(o=>o.status==="blocked")??b.find(o=>o.status==="pending"),N=w.find(o=>o.status==="in_progress")??w.find(o=>o.status==="blocked")??w.find(o=>o.status==="pending"),Ze=x([...g,...N?[N.title]:[],...!N&&H?[H.title]:[],...w.filter(o=>o.status==="pending").slice(0,5).map(o=>o.title)],8),et=x([...y,...b.filter(o=>o.status==="blocked").map(o=>o.title),...w.filter(o=>o.status==="blocked").map(o=>o.title)],20),z={version:1,projectId:r.id,projectName:r.name,currentRequest:a,currentActivity:l,goal:c,plan:p,phases:b,tasks:w,decisions:x(u,20),blockers:et,warnings:x(d,20),nextActions:Ze,filesTouched:x(O,30),activeFiles:Array.from(j.entries()).filter(([,o])=>o!=="deleted").map(([o])=>o).slice(-5),modifiedFiles:x(te,30),createdFiles:x(re,30),deletedFiles:x(ne,30),commands:x(se,20),tests:x(oe,20),checks:At(ie,20),currentPhase:H,currentTask:N,progress:{phasesTotal:b.length,phasesCompleted:b.filter(o=>o.status==="completed").length,tasksTotal:w.length,tasksCompleted:w.filter(o=>o.status==="completed").length,blocked:b.filter(o=>o.status==="blocked").length+w.filter(o=>o.status==="blocked").length},lastSession:f,updatedAt:n.length?n[n.length-1].occurredAt:new Date().toISOString()},ae=Te(r.rootPath,".toolnet","work");return jt(ae,{recursive:!0}),P(Te(ae,"current.json"),z),await t.put(`projects/${r.id}/work/current.json`,JSON.stringify(z,null,2)+`
`,"application/json"),z}async function Y(r,t){if((await Ee(r,t)).length>0)return Oe(r,t);let n=await t.getText(`projects/${r.id}/work/current.json`);if(!n)return null;try{return JSON.parse(n)}catch{return null}}var hn=new Int32Array(new SharedArrayBuffer(4));async function Ne(r,t){let e=await t.getText(`projects/${r.id}/work/handoff-latest.json`);if(!e)return null;try{return JSON.parse(e)}catch{return null}}async function $e(r,t){let e=await t.getText(`projects/${r.id}/work/semantic/current.json`);if(!e)return null;try{return JSON.parse(e)}catch{return null}}function Q(r){if(!r)return 0;let t=Array.from(r).length,e=r.trim().split(/\s+/u).filter(Boolean).length;return Math.ceil(Math.max(t/3.5,e*1.3))}function m(r,t){let e=r.replace(/\s+/g," ").trim();return e.length<=t?e:e.slice(0,Math.max(0,t-1)).trimEnd()+"\u2026"}function Ct(r){let t=[],e=!1;for(let n of r.split(/\r?\n/u)){let s=n.trim();if(s.includes("<!--")&&(e=!0),e){s.includes("-->")&&(e=!1);continue}let i=s.toLowerCase();if(!(!s||s.startsWith("#")||s==="```"||i.startsWith("- [enforce]")||i.startsWith("* [enforce]")||i.startsWith("- [advisory]")||i.startsWith("* [advisory]"))&&(s=s.replace(/^[-*]\s+/u,""),s&&t.push(m(s,280)),t.length>=16))break}return t}function Mt(r){let t=[],e=[];for(let n of r.split(/\\r?\\n/u)){let s=n.trim(),i=s.toLowerCase(),l=["- [enforce]","* [enforce]","- [advisory]","* [advisory]"].find(p=>i.startsWith(p));if(!l)continue;let c=s.slice(l.length).trim();c&&(l.includes("enforce")?t.push(c):e.push(c))}return{enforce:t,advisory:e}}function Tt(r,t){let e=[];for(let n of r){let s=[...e,n].join(`
`);if(Q(s)<=t){e.push(n);continue}let i=Q(e.join(`
`)),a=Math.max(0,t-i);if(a>=16){let l=Math.floor(a*3.2),c=m(n,l);c&&e.push(c)}break}return e.join(`
`).trim()}async function _e(r){let t=Math.max(256,Math.min(2e3,r.maxTokens??1e3)),e=q(r.project,!1),n=e?.content??"";n||(n=await r.storage.getText(`projects/${r.project.id}/project/manual.md`)??"");let s=Mt(n),i=e?e.rules.filter(d=>d.mode==="enforce").map(d=>d.text):s.enforce,a=e?e.rules.filter(d=>d.mode==="advisory").map(d=>d.text):s.advisory,l=n?Ct(n):[],c=await Y(r.project,r.storage),p=await $e(r.project,r.storage),f=await Ne(r.project,r.storage),u=[];if(u.push("[TOOLNET PROJECT CONTEXT]"),u.push(`Project: ${r.project.name}`),u.push("Continue existing project state. Do not restart completed work unless evidence shows it is necessary."),n&&u.push(`Full operating manual: ${F(r.project)}`),i.length){u.push("","PROJECT RULES \u2014 MUST FOLLOW");for(let d of i.slice(0,24))u.push(`- [ENFORCE] ${m(d,240)}`)}if(a.length){u.push("","PROJECT PREFERENCES");for(let d of a.slice(0,10))u.push(`- ${m(d,220)}`)}if(p&&(p.mission&&u.push("","MISSION",m(p.mission.value,420)),p.activeObjective&&u.push("","CURRENT OBJECTIVE",m(p.activeObjective.value,420)),p.why&&u.push("","WHY THIS WORK MATTERS",m(p.why.value,420)),p.desiredOutcome&&u.push("","DESIRED OUTCOME",m(p.desiredOutcome.value,420)),p.planRationale&&u.push("","WHY THIS APPROACH",m(p.planRationale.value,420))),c){if(u.push("","ACTIVE WORK"),c.goal&&u.push(`Goal: ${m(c.goal,320)}`),c.plan&&u.push(`Plan: ${m(c.plan,320)}`),u.push(`Progress: phases ${c.progress.phasesCompleted}/${c.progress.phasesTotal}; tasks ${c.progress.tasksCompleted}/${c.progress.tasksTotal}; blocked ${c.progress.blocked}`),c.currentPhase&&u.push(`Current phase: ${c.currentPhase.title} [${c.currentPhase.status}]`),c.currentPhase&&p){let d=p.phases.find(g=>g.order===c.currentPhase?.order);d&&(d.objective&&u.push(`Phase objective: ${m(d.objective.value,340)}`),d.why?u.push(`Why this phase: ${m(d.why.value,340)}`):u.push("Why this phase: not explicitly recorded. Inspect existing implementation before assuming intent."),d.deliverable&&u.push(`Deliverable: ${m(d.deliverable.value,340)}`),d.dependencies.length&&u.push(`Depends on: ${d.dependencies.slice(0,4).map(g=>m(g.value,180)).join("; ")}`),d.acceptanceCriteria.length&&(u.push("","DEFINITION OF DONE"),d.acceptanceCriteria.slice(0,6).forEach(g=>{u.push(`- ${m(g.value,260)}`)})),d.openQuestions.length&&(u.push("","OPEN QUESTIONS FOR CURRENT PHASE"),d.openQuestions.slice(0,4).forEach(g=>{u.push(`- ${m(g.value,260)}`)})))}c.currentTask&&u.push(`Current task: ${c.currentTask.title} [${c.currentTask.status}]`),c.nextActions.length&&(u.push("","NEXT ACTIONS"),c.nextActions.slice(0,6).forEach((d,g)=>{u.push(`${g+1}. ${m(d,260)}`)})),c.blockers.length&&(u.push("","BLOCKERS"),c.blockers.slice(0,5).forEach(d=>{u.push(`- ${m(d,260)}`)})),c.warnings.length&&(u.push("","ATTENTION"),c.warnings.slice(-5).forEach(d=>{u.push(`- ${m(d,260)}`)})),c.decisions.length&&(u.push("","RECENT DECISIONS"),c.decisions.slice(-5).forEach(d=>{u.push(`- ${m(d,260)}`)})),c.lastSession&&u.push("",`Last work session: ${c.lastSession.agent} / ${c.lastSession.nativeSessionId}`)}if(p&&p.openQuestions.length&&(u.push("","UNRESOLVED QUESTIONS"),p.openQuestions.slice(0,5).forEach(d=>{u.push(`- ${m(d.value,260)}`)})),f&&u.push(`Latest handoff: ${f.reason} / ${f.sourceSession.agent}`),l.length){u.push("","OPERATING NOTES");for(let d of l)u.push(`- ${d}`)}u.push("","Before changing anything: verify the current repository state and continue from the active phase/task above.");let y=Tt(u,t);return{version:1,projectId:r.project.id,projectName:r.project.name,text:y,estimatedTokens:Q(y),maxTokens:t,hasManual:!!n,hasWorkState:!!c,hasHandoff:!!f,generatedAt:new Date().toISOString()}}function Ot(r){return Fe(r.rootPath,".toolnet","context","startup.md")}function Nt(r){return Fe(r.rootPath,".toolnet","context","startup.json")}function $t(r,t){let e=Ot(r);It(Et(e),{recursive:!0}),Rt(e,t.text.endsWith(`
`)?t.text:t.text+`
`,{encoding:"utf8",mode:384}),P(Nt(r),t)}async function We(r,t,e=800){let s=(await _e({project:r,storage:t,maxTokens:e})).text;A(s)>e&&(s=J(s,e),s+=`

[Context trimmed by ToolNet Memory token budget]
`);let a={version:1,projectId:r.id,projectName:r.name,text:s,digest:S(s),estimatedTokens:A(s),generatedAt:new Date().toISOString()};return $t(r,a),await t.put(`projects/${r.id}/context/startup.md`,a.text+`
`,"text/markdown"),await t.put(`projects/${r.id}/context/startup.json`,JSON.stringify(a,null,2)+`
`,"application/json"),a}import{existsSync as _t,readFileSync as Ft}from"node:fs";import{homedir as Wt}from"node:os";import{join as Dt}from"node:path";function Kt(r){let t=r.trim();return t.length>=2&&t.startsWith('"')&&t.endsWith('"')?(t=t.slice(1,-1),t.replace(/\\n/g,`
`).replace(/\\r/g,"\r").replace(/\\t/g,"	").replace(/\\"/g,'"').replace(/\\\\/g,"\\")):t.length>=2&&t.startsWith("'")&&t.endsWith("'")?t.slice(1,-1):t}function Lt(){let r=process.env.TOOLNET_GLOBAL_ENV??Dt(Wt(),".config","toolnet-memory",".env");if(!_t(r))return;let t=Ft(r,"utf8");for(let e of t.split(/\r?\n/)){let n=e.trim();if(!n||n.startsWith("#"))continue;n.startsWith("export ")&&(n=n.slice(7));let s=n.indexOf("=");if(s<=0)continue;let i=n.slice(0,s).trim();/^[A-Za-z_][A-Za-z0-9_]*$/.test(i)&&process.env[i]===void 0&&(process.env[i]=Kt(n.slice(s+1)))}}Lt();function M(r,t){return r===void 0?t:["1","true","yes","on"].includes(r.toLowerCase())}function T(r,t){if(!r)return t;let e=Number(r);return Number.isFinite(e)?e:t}function De(){return{memory:{autoCapture:M(process.env.MEMORY_AUTO_CAPTURE,!0),autoRetrieve:M(process.env.MEMORY_AUTO_RETRIEVE,!0),autoSummarize:M(process.env.MEMORY_AUTO_SUMMARIZE,!0),autoSync:M(process.env.MEMORY_AUTO_SYNC,!0)},retrieval:{maxCandidates:T(process.env.MEMORY_MAX_CANDIDATES,50),rerankTop:T(process.env.MEMORY_RERANK_TOP,10),finalContext:T(process.env.MEMORY_FINAL_CONTEXT,5),tokenBudget:T(process.env.MEMORY_TOKEN_BUDGET,2e3)},storage:{provider:process.env.MEMORY_STORAGE_PROVIDER??"huggingface",r2:{accountId:process.env.R2_ACCOUNT_ID,bucket:process.env.R2_BUCKET,accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY},s3:{endpoint:process.env.S3_ENDPOINT,region:process.env.S3_REGION,bucket:process.env.S3_BUCKET,accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY,forcePathStyle:M(process.env.S3_FORCE_PATH_STYLE,!1)},huggingface:{namespace:process.env.HF_NAMESPACE,bucket:process.env.HF_BUCKET,accessKeyId:process.env.HF_S3_ACCESS_KEY_ID,secretAccessKey:process.env.HF_S3_SECRET_ACCESS_KEY},localRoot:process.env.MEMORY_LOCAL_STORAGE_PATH},cache:{maxMb:T(process.env.MEMORY_LOCAL_CACHE_MB,200)}}}import{createHash as Vt}from"node:crypto";import{existsSync as X,mkdirSync as Bt,readFileSync as Ht,renameSync as zt,writeFileSync as Jt}from"node:fs";import{basename as Ut,dirname as W,join as K,parse as Ve,resolve as I}from"node:path";var Be=".toolnet",Gt="project.json";function qt(r){return Vt("sha256").update(r).digest("hex").slice(0,16)}function Z(r){return K(r,Be,Gt)}function Yt(r){return X(Z(r))}function Qt(r,t){let e=I(r),n=Ve(e).root;for(;;){if(Yt(e))return e;if(e===n||t&&e===I(t))break;let s=W(e);if(s===e)break;e=s}return null}function Xt(r){let t=I(r),e=Ve(t).root,n=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"];for(;;){if(n.some(i=>X(K(t,i))))return t;if(t===e)break;let s=W(t);if(s===t)break;t=s}return I(r)}function Zt(r){let t;try{t=JSON.parse(Ht(r,"utf8"))}catch(s){throw new Error(`Invalid ToolNet project manifest: ${r}: ${s instanceof Error?s.message:String(s)}`)}if(!t||typeof t!="object")throw new Error(`Invalid ToolNet project manifest: ${r}`);let e=t;if(typeof e.id!="string"||!e.id.trim())throw new Error(`ToolNet project manifest is missing id: ${r}`);if(typeof e.name!="string"||!e.name.trim())throw new Error(`ToolNet project manifest is missing name: ${r}`);let n=new Date().toISOString();return{version:1,id:e.id,name:e.name,remote:typeof e.remote=="string"&&e.remote.trim()?e.remote:e.name,rootPath:typeof e.rootPath=="string"?e.rootPath:W(W(r)),createdAt:typeof e.createdAt=="string"?e.createdAt:n,updatedAt:typeof e.updatedAt=="string"?e.updatedAt:n,graphVersion:typeof e.graphVersion=="number"?e.graphVersion:0,memoryVersion:typeof e.memoryVersion=="number"?e.memoryVersion:0,metadata:e.metadata&&typeof e.metadata=="object"?e.metadata:void 0}}function Ke(r,t){let e=K(r,Be);Bt(e,{recursive:!0});let n=Z(r),s=`${n}.tmp-${process.pid}`;Jt(s,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),zt(s,n)}function Le(r,t){return{id:r.id,name:r.name,remote:r.remote,rootPath:t,createdAt:r.createdAt,updatedAt:r.updatedAt,graphVersion:r.graphVersion,memoryVersion:r.memoryVersion,metadata:r.metadata}}var D=class{detect(t=process.cwd()){let e=I(t),n=Xt(e),i=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(f=>X(K(n,f))),a=Qt(e,i?n:void 0);if(a){let f=Z(a),u=Zt(f);return u.rootPath!==a&&(u.rootPath=a,u.updatedAt=new Date().toISOString(),Ke(a,u)),Le(u,a)}let l=new Date().toISOString(),c=Ut(n),p={version:1,id:qt(n),name:c,remote:c,rootPath:n,createdAt:l,updatedAt:l,graphVersion:0,memoryVersion:0};return Ke(n,p),Le(p,n)}};import{homedir as wr}from"node:os";import{join as br}from"node:path";import{DeleteObjectCommand as er,GetObjectCommand as tr,HeadObjectCommand as rr,ListObjectsV2Command as nr,PutObjectCommand as sr,S3Client as or}from"@aws-sdk/client-s3";import{getSignedUrl as ir}from"@aws-sdk/s3-request-presigner";var L=class{name="huggingface";client;bucket;constructor(t){this.bucket=t.bucket,this.client=new or({region:"us-east-1",endpoint:`https://s3.hf.co/${t.namespace}`,forcePathStyle:!0,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:t.accessKeyId,secretAccessKey:t.secretAccessKey}})}async put(t,e,n="application/octet-stream"){let s=typeof e=="string"?Buffer.from(e,"utf8"):e;await this.client.send(new sr({Bucket:this.bucket,Key:t,Body:s,ContentType:n}))}async get(t){let e=await ir(this.client,new tr({Bucket:this.bucket,Key:t}),{expiresIn:60}),n=await fetch(e,{redirect:"follow"});if(n.status===404)return null;if(!n.ok)throw new Error(`HF download failed: ${n.status} ${n.statusText}`);return new Uint8Array(await n.arrayBuffer())}async getText(t){let e=await this.get(t);return e?Buffer.from(e).toString("utf8"):null}async exists(t){try{return await this.client.send(new rr({Bucket:this.bucket,Key:t})),!0}catch(e){if(typeof e=="object"&&e!==null&&"$metadata"in e&&e.$metadata?.httpStatusCode===404)return!1;throw e}}async delete(t){await this.client.send(new er({Bucket:this.bucket,Key:t}))}async list(t=""){let e=[],n;do{let s=await this.client.send(new nr({Bucket:this.bucket,Prefix:t||void 0,ContinuationToken:n}));for(let i of s.Contents??[])i.Key&&e.push({key:i.Key,size:i.Size,updatedAt:i.LastModified?.toISOString()});n=s.IsTruncated?s.NextContinuationToken:void 0}while(n);return e}};import{access as He,mkdir as ar,readFile as cr,readdir as ur,rm as lr,stat as ze,writeFile as dr}from"node:fs/promises";import{dirname as pr,join as fr,relative as Je,resolve as mr}from"node:path";var R=class{constructor(t){this.root=t}root;name="local";path(t){let e=t.replace(/^\/+/,"");return mr(this.root,e)}async put(t,e){let n=this.path(t);await ar(pr(n),{recursive:!0}),await dr(n,e)}async get(t){try{return await cr(this.path(t))}catch(e){if(typeof e=="object"&&e!==null&&"code"in e&&e.code==="ENOENT")return null;throw e}}async getText(t){let e=await this.get(t);return e?Buffer.from(e).toString("utf8"):null}async exists(t){try{return await He(this.path(t)),!0}catch{return!1}}async delete(t){await lr(this.path(t),{force:!0})}async list(t=""){let e=this.path(t),n=[];try{await He(e)}catch{return n}let s=async a=>{let l=await ur(a,{withFileTypes:!0});for(let c of l){let p=fr(a,c.name);if(c.isDirectory()){await s(p);continue}let f=await ze(p);n.push({key:Je(this.root,p),size:f.size,updatedAt:f.mtime.toISOString()})}},i=await ze(e);return i.isDirectory()?await s(e):n.push({key:Je(this.root,e),size:i.size,updatedAt:i.mtime.toISOString()}),n}};import{DeleteObjectCommand as gr,GetObjectCommand as hr,HeadObjectCommand as yr,ListObjectsV2Command as kr,PutObjectCommand as Sr,S3Client as vr}from"@aws-sdk/client-s3";import{getSignedUrl as xr}from"@aws-sdk/s3-request-presigner";var E=class{name;client;bucket;constructor(t){this.name=t.name??"s3",this.bucket=t.bucket,this.client=new vr({region:t.region??"us-east-1",endpoint:t.endpoint||void 0,forcePathStyle:t.forcePathStyle??!1,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:t.accessKeyId,secretAccessKey:t.secretAccessKey}})}async put(t,e,n="application/octet-stream"){let s=typeof e=="string"?Buffer.from(e,"utf8"):e;await this.client.send(new Sr({Bucket:this.bucket,Key:t,Body:s,ContentType:n}))}async get(t){let e=await xr(this.client,new hr({Bucket:this.bucket,Key:t}),{expiresIn:60}),n=await fetch(e,{redirect:"follow"});if(n.status===404)return null;if(!n.ok)throw new Error(`${this.name} download failed: ${n.status} ${n.statusText}`);return new Uint8Array(await n.arrayBuffer())}async getText(t){let e=await this.get(t);return e?Buffer.from(e).toString("utf8"):null}async exists(t){try{return await this.client.send(new yr({Bucket:this.bucket,Key:t})),!0}catch(e){if(typeof e=="object"&&e!==null&&"$metadata"in e&&e.$metadata?.httpStatusCode===404)return!1;throw e}}async delete(t){await this.client.send(new gr({Bucket:this.bucket,Key:t}))}async list(t=""){let e=[],n;do{let s=await this.client.send(new kr({Bucket:this.bucket,Prefix:t||void 0,ContinuationToken:n}));for(let i of s.Contents??[])i.Key&&e.push({key:i.Key,size:i.Size,updatedAt:i.LastModified?.toISOString()});n=s.IsTruncated?s.NextContinuationToken:void 0}while(n);return e}};function ee(r,t){return console.warn(t),new R(r)}function Ue(r){let t=r.localRoot??br(wr(),".toolnet-memory","storage");if(r.provider==="r2"){let e=r.r2;return e?.accountId&&e.bucket&&e.accessKeyId&&e.secretAccessKey?new E({name:"r2",endpoint:`https://${e.accountId}.r2.cloudflarestorage.com`,region:"auto",bucket:e.bucket,forcePathStyle:!0,accessKeyId:e.accessKeyId,secretAccessKey:e.secretAccessKey}):ee(t,"[storage] Cloudflare R2 credentials missing. Using local fallback.")}if(r.provider==="s3"){let e=r.s3;return e?.bucket&&e.accessKeyId&&e.secretAccessKey?new E({name:"s3",endpoint:e.endpoint,region:e.region??"us-east-1",bucket:e.bucket,forcePathStyle:e.forcePathStyle??!1,accessKeyId:e.accessKeyId,secretAccessKey:e.secretAccessKey}):ee(t,"[storage] S3 credentials missing. Using local fallback.")}if(r.provider==="huggingface"){let e=r.huggingface;return e?.namespace&&e.bucket&&e.accessKeyId&&e.secretAccessKey?new L({namespace:e.namespace,bucket:e.bucket,accessKeyId:e.accessKeyId,secretAccessKey:e.secretAccessKey}):ee(t,"[storage] Hugging Face credentials missing. Using local fallback.")}return new R(t)}function jr(r){return new Promise(t=>setTimeout(t,r))}async function Ge(r,t={}){let e=Math.max(1,t.attempts??3),n=t.baseDelayMs??150,s=t.maxDelayMs??2e3,i;for(let a=1;a<=e;a++)try{return await r()}catch(l){if(i=l,a>=e)break;let c=Math.min(s,n*2**(a-1)),p=Math.floor(Math.random()*Math.max(1,c*.2));await jr(c+p)}throw i}var Ar=new Set(["put","get","getText","delete","list"]);function qe(r,t={}){return new Proxy(r,{get(e,n){let s=Reflect.get(e,n,e);return typeof s!="function"?s:Ar.has(n)?(...i)=>Ge(()=>Promise.resolve(s.apply(e,i)),t):s.bind(e)}})}function Ye(r){let t=r.trim().replace(/\s+/g,"_").replace(/[^A-Za-z0-9._-]/g,"_").replace(/_+/g,"_").replace(/^\.+|\.+$/g,"").slice(0,100);if(!t||t==="."||t==="..")throw new Error("Invalid project storage folder");return t}function Qe(r){let t=r.replace(/^\/+/,"");if(t.startsWith("memories/"))return"memory/records/"+t.slice(9);if(t.startsWith("vectors/"))return"memory/vectors/"+t.slice(8);if(t.startsWith("graph/"))return"code/graph/"+t.slice(6);let e=t.match(/^(snapshots\/[^/]+\/)memories\/(.+)$/);if(e)return`${e[1]}memory/records/${e[2]}`;if(e=t.match(/^(snapshots\/[^/]+\/)vectors\/(.+)$/),e)return`${e[1]}memory/vectors/${e[2]}`;if(e=t.match(/^(snapshots\/[^/]+\/)graph\/(.+)$/),e)return`${e[1]}code/graph/${e[2]}`;let n=t.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)memories\/(.+)$/);if(n)return`${n[1]}memory/records/${n[2]}`;if(n=t.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)vectors\/(.+)$/),n)return`${n[1]}memory/vectors/${n[2]}`;if(n=t.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)graph\/(.+)$/),n)return`${n[1]}code/graph/${n[2]}`;let s=t.match(/^(projects\/[^/]+\/)memories\/(.+)$/);return s?`${s[1]}memory/records/${s[2]}`:(s=t.match(/^(projects\/[^/]+\/)vectors\/(.+)$/),s?`${s[1]}memory/vectors/${s[2]}`:(s=t.match(/^(projects\/[^/]+\/)graph\/(.+)$/),s?`${s[1]}code/graph/${s[2]}`:t))}var V=class{constructor(t,e,n,s){this.provider=t;this.name=t.name,this.projectId=e,this.projectName=n,this.folder=Ye(s??n),this.sourcePrefix=`projects/${e}`,this.targetPrefix=`projects/${this.folder}`}provider;name;folder;sourcePrefix;targetPrefix;projectId;projectName;registryPromise;async registerProject(){let t=`${this.targetPrefix}/project.json`,e=new Date().toISOString(),n=e,s=await this.provider.getText(t);if(s){let a;try{a=JSON.parse(s)}catch(l){throw new Error(`Invalid remote ToolNet project manifest at ${t}: ${l instanceof Error?l.message:String(l)}`)}if(typeof a.id=="string"&&a.id!==this.projectId)throw new Error(["ToolNet remote project namespace collision.",`Remote folder: ${this.targetPrefix}`,`Existing project id: ${a.id}`,`Current project id: ${this.projectId}`,"Refusing to mix data from two projects."].join(" "));typeof a.createdAt=="string"&&(n=a.createdAt)}let i={version:1,id:this.projectId,name:this.projectName,remote:this.folder,createdAt:n,updatedAt:e};await this.provider.put(t,JSON.stringify(i,null,2)+`
`,"application/json")}async ensureRegistered(){return this.registryPromise||(this.registryPromise=this.registerProject()),this.registryPromise}key(t){if(t=Qe(t),t===this.sourcePrefix)return this.targetPrefix;if(t.startsWith(`${this.sourcePrefix}/`))return this.targetPrefix+t.slice(this.sourcePrefix.length);if(t===this.targetPrefix||t.startsWith(`${this.targetPrefix}/`))return t;if(t.startsWith("projects/"))throw new Error(["Cross-project storage access denied.",`Current project: ${this.targetPrefix}`,`Requested key: ${t}`].join(" "));return t}async put(t,e,n){return await this.ensureRegistered(),this.provider.put(this.key(t),e,n)}async get(t){return await this.ensureRegistered(),this.provider.get(this.key(t))}async getText(t){return await this.ensureRegistered(),this.provider.getText(this.key(t))}async delete(t){return await this.ensureRegistered(),this.provider.delete(this.key(t))}async exists(t){return await this.ensureRegistered(),this.provider.exists(this.key(t))}async list(t){return await this.ensureRegistered(),this.provider.list(this.key(t))}};function Pr(){let r=process.argv.slice(2),t=r[0]||"print",e={mode:"minimal"};for(let n=1;n<r.length;n++)r[n]==="--project"&&r[n+1]?(e.project=r[n+1],n++):r[n]==="--limit"&&r[n+1]?(e.limit=parseInt(r[n+1],10),n++):r[n]==="--focused"&&r[n+1]?(e.mode="focused",e.query=r[n+1],n++):r[n]==="--deep"&&(e.mode="deep");return{command:t,options:e}}async function Cr(){let{command:r,options:t}=Pr();try{switch(r){case"print":await Mr(t);break;case"sync":await Tr(t);break;case"refresh":await Ir(t);break;case"profile-show":await Rr(t);break;case"profile-sync":await Er(t);break;default:console.error(`Unknown command: ${r}`),console.error("Available commands: print, sync, refresh, profile-show, profile-sync"),process.exit(1)}}catch(e){console.error("Error:",e instanceof Error?e.message:String(e)),process.exit(1)}}async function Mr(r){let t=r.mode||"minimal";if(t==="minimal"){let e=G({projectPath:r.project});e||(console.error("No ToolNet project found. Run toolnet-memory init first."),process.exit(1)),process.stdout.write(e)}else(t==="focused"||t==="deep")&&(console.error("Focused and deep modes require storage access."),console.error("Use: toolnet-memory brief --deep for deep context"),process.exit(1))}async function Tr(r){let t=G({projectPath:r.project});t||(console.error("No ToolNet project found."),process.exit(1));let e=Ae(t);console.log(`Context hash: ${e}`),console.log(`Context size: ${t.length} chars`)}async function Ir(r){console.log("Refreshing deep startup brief cache...");let t=r.project||process.cwd(),e=C(t);e||(console.error("No ToolNet project found."),process.exit(1));let n=new D().detect(e),s=De(),i=qe(Ue({provider:s.storage.provider,huggingface:s.storage.huggingface,localRoot:s.storage.localRoot}),{attempts:2}),a=new V(i,n.id,n.name,n.remote??n.name);await We(n,a),console.log("Deep startup brief cache refreshed.")}async function Rr(r){let t=r.project||process.cwd(),e=C(t);e||(console.error("No ToolNet project found."),process.exit(1));let n=Xe.join(e,".toolnet","profile.md");B.existsSync(n)||(console.error("No profile.md found in .toolnet directory."),process.exit(1));let s=B.readFileSync(n,"utf-8");process.stdout.write(s)}async function Er(r){let t=je({projectPath:r.project});console.log("Created/updated:");for(let e of t)console.log(`- ${e}`)}Cr();
