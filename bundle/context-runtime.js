#!/usr/bin/env node
import*as $ from"fs";import*as Ie from"path";import*as h from"fs";import*as m from"path";import*as oe from"crypto";function S(r){return r?Math.ceil(r.length/3.5):0}function F(r,t){if(!r)return"";if(S(r)<=t)return r;let n=Math.floor(t*3.5),s=r.slice(0,n),o=s.lastIndexOf("."),a=s.lastIndexOf(`
`),d=Math.max(o,a);return d>n*.7?s.slice(0,d+1):s}function J(r,t){if(!r)return"";let e=r.split(`
`).filter(o=>o.trim());if(e.length<=t)return r;let n=e.slice(0,t),s=e.length-t;return[...n,`... (${s} more items omitted)`].join(`
`)}function Me(r,t){let{maxTokens:e,trimMarker:n="[Context trimmed by ToolNet Memory token budget]"}=t;if(r.length===0)return"";let s=[...r].sort((i,l)=>l.priority-i.priority),o=[],a=0,d=!1;for(let i of s){let l=`# ${i.title}

`,f=S(l),c=S(i.content),k=f+c;if(a+k<=e)o.push(l+i.content),a+=k;else{let u=e-a-f;if(u>50){let g=F(i.content,u);o.push(l+g),a=e,d=!0}else d=!0;break}}return d&&o.push(`
${n}
`),o.join(`

---

`)}function G(r,t){let e=[{title:"Profile",content:J(r,10),priority:100},{title:"Current Work",content:J(t,15),priority:90}];return Me(e,{maxTokens:800})}import{chmodSync as cr,existsSync as Ee,mkdirSync as ur,readFileSync as Re,renameSync as lr,writeFileSync as dr}from"node:fs";import{dirname as fr,join as q}from"node:path";var Y="toolnet.context-offload.v1";function Ne(r){return q(r,".toolnet","offload")}function $e(r){return q(Ne(r),"graph.json")}function W(){return{schema:Y,version:1,updatedAt:new Date(0).toISOString(),nodes:[]}}function _e(r){let t=$e(r);if(!Ee(t))return W();try{let e=JSON.parse(Re(t,"utf8"));return e.schema!==Y||e.version!==1||!Array.isArray(e.nodes)?W():e}catch{return W()}}function U(r,t){let e=r.replace(/\s+/gu," ").trim();return e.length<=t?e:e.slice(0,t-1).trimEnd()+"\u2026"}function Q(r,t={}){let e=_e(r);if(e.nodes.length===0)return"";let n=Math.max(1,Math.min(12,t.maxAssets??6)),s=Math.max(320,Math.min(2400,t.maxChars??900)),o=["[TOOLNET CONTEXT OFFLOAD GRAPH]","Large tool/file payloads stay outside prompt context.","Read only a needed asset with MCP context_offload_read."];for(let a of e.nodes.slice(-n).reverse()){let d=U(a.sourceRefs.at(-1)??"unknown",72),i=a.files.length>0?` files=${U(a.files.join(","),120)}`:"",l=`event:${d} --offloads--> asset:${a.id.slice(0,12)} kind=${a.kind} bytes=${a.bytes}${i}`;if([...o,l].join(`
`).length>s)break;o.push(l)}return o.join(`
`)}import{existsSync as X,mkdirSync as xr,readFileSync as Z,renameSync as wr,writeFileSync as jr}from"node:fs";import{dirname as Ar,join as ee}from"node:path";import{createHash as Fe}from"node:crypto";import{dirname as We}from"node:path";import{mkdirSync as De,readFileSync as kr,renameSync as Ke,writeFileSync as Le}from"node:fs";function y(r){return Fe("sha256").update(r).digest("hex")}function v(r,t){De(We(r),{recursive:!0});let e=`${r}.${process.pid}.tmp`;Le(e,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Ke(e,r)}function Be(r){return ee(r.rootPath,".toolnet","context","handoff.md")}function Ve(r){return ee(r.rootPath,".toolnet","context","handoff.json")}function He(r){let t=Be(r);if(!X(t))return null;try{let e=Z(t,"utf8").trim();if(!e)return null;let n=new Date(0).toISOString(),s=Ve(r);if(X(s))try{let o=JSON.parse(Z(s,"utf8"));typeof o.generatedAt=="string"&&(n=o.generatedAt)}catch{}return{version:1,projectId:r.id,projectName:r.name,text:e,digest:y(e),generatedAt:n}}catch{return null}}function te(r,t=1800){let e=He(r);if(!e?.text)return null;let n=e.text;return n.length>t&&(n=`${n.slice(0,t)}

[Fast handoff truncated]`),["[TOOLNET FAST HANDOFF]","",`Project: ${r.name}`,`Updated: ${e.generatedAt}`,"",n].join(`
`)}var C="memory_agent_ask";function re(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${C}

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

Preferred mode:

- mode="local"
  for direct factual questions such as:
  current task, last file, blocker, completed TODOs.

- mode="ai"
  for composite or ambiguous continuity questions
  that benefit from ToolNet Memory Agent reasoning.

Do NOT call it automatically when:

- Normal startup context already gives enough information.
- The question is unrelated to previous project work.
- The answer is obvious from current repository evidence.

Rules:

- Never invent previous work.
- Current repository evidence overrides stale memory.
- NEVER reconstruct previous work by reading ToolNet internal session files.
- NEVER read/list/search .toolnet/sessions/**, session state.json,
  events.jsonl, or raw transcripts to discover previous-agent state.
- Do not search the filesystem for the implementation/schema of
  memory_agent_ask. Invoke the MCP tool directly when deeper
  continuity is required.
- Do not dump raw transcripts or full memory.
- After receiving the ToolNet answer, continue the task
  instead of asking the user to repeat known context.
- If ToolNet says information is not recorded, say so.
`.trim()}function ne(){return`
[TOOLNET MEMORY AGENT]

Tool:
- ${C}

For resume/continue requests:

1. Use the injected ToolNet continuity handoff FIRST.
2. If the handoff is missing or ambiguous, invoke
   ${C} directly BEFORE repository/history exploration.
3. NEVER reconstruct prior work from:
   - .toolnet/sessions/**
   - state.json
   - events.jsonl
   - raw transcripts
4. NEVER search for the implementation/schema of
   ${C}; invoke the MCP tool directly.
5. Inspect git/source only AFTER continuity context is known.

Use:
- mode="local" for current task, last file, blocker or next action.
- mode="ai" for ambiguous or combined continuity questions.

Current repository evidence overrides stale memory.
`.trim()}function x(r){let t=m.resolve(r),e=m.parse(t).root;for(;t!==e;){let n=m.join(t,".toolnet");if(h.existsSync(n)&&h.statSync(n).isDirectory())return t;t=m.dirname(t)}return null}function T(r){try{return h.existsSync(r)?h.readFileSync(r,"utf-8").trim():null}catch{return null}}function se(r){return r.split(`
`).filter(n=>{let s=n.toUpperCase();return!(s.includes("SECRET")||s.includes("TOKEN")||s.includes("API_KEY")||s.includes("APIKEY")||s.includes("PASSWORD")||s.includes("PASS="))}).join(`
`)}function D(r={}){let t=r.projectPath||process.cwd(),e=x(t);if(!e)return null;let n=m.join(e,".toolnet","project.json"),s="Unknown";try{if(h.existsSync(n)){let _=JSON.parse(h.readFileSync(n,"utf-8"));s=_.name||_.projectName||"Unknown"}}catch{}let o=m.join(e,".toolnet","profile.md"),a=m.join(e,".toolnet","current.md"),d=T(o)||"",i=T(a)||"";d=se(d),i=se(i);let l=`[TOOLNET PROJECT CONTEXT]

Project: ${s}
Root: ${e}

`,f=G(d,i),c=te({id:"",name:s,rootPath:e},1600),k=c?`

${c}
`:"",u=Q(e,{maxAssets:6,maxChars:900}),g=u?`

${u}
`:"",Oe=`

${ne()}

Forbidden At Startup:
- Do not run session:agy-recover, handoff:latest, or brief automatically.
- Do not perform deep recovery merely because an agent starts.
- If the user asks to resume previous work and fast context is insufficient,
  use memory_agent_ask before guessing.
`;return l+f+k+g+Oe}function ie(r={}){let t=r.projectPath||process.cwd(),e=x(t);if(!e)throw new Error("Not in a ToolNet project (no .toolnet directory found)");let n=m.join(e,".toolnet","profile.md"),s=m.join(e,".toolnet","current.md"),o=T(n)||"",a=T(s)||"",d=`# AI Startup Instructions

Read and follow:
- .toolnet/profile.md
- .toolnet/current.md

Rules:
- Fast context first.
- Do not run session:agy-recover, handoff:latest, or brief automatically.
- Do not invent previous-session state.
- Current repository evidence overrides stale memory.

${re()}

---

## Profile

${o}

---

## Current Work

${a}
`,i=["GEMINI.md","AGENTS.md","CLAUDE.md"],l=[];for(let f of i){let c=m.join(e,f);try{h.writeFileSync(c,d,"utf-8"),l.push(f)}catch(k){console.error(`Failed to write ${f}:`,k)}}return l}function ae(r){return oe.createHash("sha256").update(r,"utf-8").digest("hex")}import{existsSync as an,mkdirSync as nt,readFileSync as cn,writeFileSync as st}from"node:fs";import{dirname as ot,join as me}from"node:path";import{existsSync as le,mkdirSync as ze,readFileSync as Je,statSync as ce,writeFileSync as Ge}from"node:fs";import{dirname as Ue,join as qe}from"node:path";var ue=64*1024,Ye=`# ToolNet Project Operating Manual

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
`;function I(r){return qe(r.rootPath,".toolnet","PROJECT.md")}function Qe(r){return r.normalize("NFKC").replace(/\s+/g," ").trim()}function Xe(r){let t=[],e=new Set,n=/^\s*[-*]\s+\[(enforce|advisory)\]\s+(.+?)\s*$/gimu,s;for(;s=n.exec(r);){let o=s[1].toLowerCase(),a=Qe(s[2]);if(!a)continue;let d=`${o}:${a.toLowerCase()}`;e.has(d)||(e.add(d),t.push({id:y(d).slice(0,24),mode:o,text:a,source:"manual"}))}return t}function Ze(r){let t=I(r);return le(t)||(ze(Ue(t),{recursive:!0}),Ge(t,Ye,{encoding:"utf8",mode:384})),t}function K(r,t=!1){let e=t?Ze(r):I(r);if(!le(e))return null;if(ce(e).size>ue)throw new Error(`PROJECT.md exceeds ${ue} bytes`);let s=Je(e,"utf8");return{path:e,content:s,digest:y(s),rules:Xe(s),bytes:Buffer.byteLength(s,"utf8"),updatedAt:new Date(ce(e).mtimeMs).toISOString()}}async function L(r,t){let e=await t.getText(`projects/${r.id}/work/current.json`);if(!e)return null;try{return JSON.parse(e)}catch{return null}}async function de(r,t){let e=await t.getText(`projects/${r.id}/work/handoff-latest.json`);if(!e)return null;try{return JSON.parse(e)}catch{return null}}async function pe(r,t){let e=await t.getText(`projects/${r.id}/work/semantic/current.json`);if(!e)return null;try{return JSON.parse(e)}catch{return null}}function B(r){if(!r)return 0;let t=Array.from(r).length,e=r.trim().split(/\s+/u).filter(Boolean).length;return Math.ceil(Math.max(t/3.5,e*1.3))}function p(r,t){let e=r.replace(/\s+/g," ").trim();return e.length<=t?e:e.slice(0,Math.max(0,t-1)).trimEnd()+"\u2026"}function et(r){let t=[],e=!1;for(let n of r.split(/\r?\n/u)){let s=n.trim();if(s.includes("<!--")&&(e=!0),e){s.includes("-->")&&(e=!1);continue}let o=s.toLowerCase();if(!(!s||s.startsWith("#")||s==="```"||o.startsWith("- [enforce]")||o.startsWith("* [enforce]")||o.startsWith("- [advisory]")||o.startsWith("* [advisory]"))&&(s=s.replace(/^[-*]\s+/u,""),s&&t.push(p(s,280)),t.length>=16))break}return t}function tt(r){let t=[],e=[];for(let n of r.split(/\\r?\\n/u)){let s=n.trim(),o=s.toLowerCase(),d=["- [enforce]","* [enforce]","- [advisory]","* [advisory]"].find(l=>o.startsWith(l));if(!d)continue;let i=s.slice(d.length).trim();i&&(d.includes("enforce")?t.push(i):e.push(i))}return{enforce:t,advisory:e}}function rt(r,t){let e=[];for(let n of r){let s=[...e,n].join(`
`);if(B(s)<=t){e.push(n);continue}let o=B(e.join(`
`)),a=Math.max(0,t-o);if(a>=16){let d=Math.floor(a*3.2),i=p(n,d);i&&e.push(i)}break}return e.join(`
`).trim()}async function fe(r){let t=Math.max(256,Math.min(2e3,r.maxTokens??1e3)),e=K(r.project,!1),n=e?.content??"";n||(n=await r.storage.getText(`projects/${r.project.id}/project/manual.md`)??"");let s=tt(n),o=e?e.rules.filter(u=>u.mode==="enforce").map(u=>u.text):s.enforce,a=e?e.rules.filter(u=>u.mode==="advisory").map(u=>u.text):s.advisory,d=n?et(n):[],i=await L(r.project,r.storage),l=await pe(r.project,r.storage),f=await de(r.project,r.storage),c=[];if(c.push("[TOOLNET PROJECT CONTEXT]"),c.push(`Project: ${r.project.name}`),c.push("Continue existing project state. Do not restart completed work unless evidence shows it is necessary."),n&&c.push(`Full operating manual: ${I(r.project)}`),o.length){c.push("","PROJECT RULES \u2014 MUST FOLLOW");for(let u of o.slice(0,24))c.push(`- [ENFORCE] ${p(u,240)}`)}if(a.length){c.push("","PROJECT PREFERENCES");for(let u of a.slice(0,10))c.push(`- ${p(u,220)}`)}if(l&&(l.mission&&c.push("","MISSION",p(l.mission.value,420)),l.activeObjective&&c.push("","CURRENT OBJECTIVE",p(l.activeObjective.value,420)),l.why&&c.push("","WHY THIS WORK MATTERS",p(l.why.value,420)),l.desiredOutcome&&c.push("","DESIRED OUTCOME",p(l.desiredOutcome.value,420)),l.planRationale&&c.push("","WHY THIS APPROACH",p(l.planRationale.value,420))),i){if(c.push("","ACTIVE WORK"),i.goal&&c.push(`Goal: ${p(i.goal,320)}`),i.plan&&c.push(`Plan: ${p(i.plan,320)}`),c.push(`Progress: phases ${i.progress.phasesCompleted}/${i.progress.phasesTotal}; tasks ${i.progress.tasksCompleted}/${i.progress.tasksTotal}; blocked ${i.progress.blocked}`),i.currentPhase&&c.push(`Current phase: ${i.currentPhase.title} [${i.currentPhase.status}]`),i.currentPhase&&l){let u=l.phases.find(g=>g.order===i.currentPhase?.order);u&&(u.objective&&c.push(`Phase objective: ${p(u.objective.value,340)}`),u.why?c.push(`Why this phase: ${p(u.why.value,340)}`):c.push("Why this phase: not explicitly recorded. Inspect existing implementation before assuming intent."),u.deliverable&&c.push(`Deliverable: ${p(u.deliverable.value,340)}`),u.dependencies.length&&c.push(`Depends on: ${u.dependencies.slice(0,4).map(g=>p(g.value,180)).join("; ")}`),u.acceptanceCriteria.length&&(c.push("","DEFINITION OF DONE"),u.acceptanceCriteria.slice(0,6).forEach(g=>{c.push(`- ${p(g.value,260)}`)})),u.openQuestions.length&&(c.push("","OPEN QUESTIONS FOR CURRENT PHASE"),u.openQuestions.slice(0,4).forEach(g=>{c.push(`- ${p(g.value,260)}`)})))}i.currentTask&&c.push(`Current task: ${i.currentTask.title} [${i.currentTask.status}]`),i.nextActions.length&&(c.push("","NEXT ACTIONS"),i.nextActions.slice(0,6).forEach((u,g)=>{c.push(`${g+1}. ${p(u,260)}`)})),i.blockers.length&&(c.push("","BLOCKERS"),i.blockers.slice(0,5).forEach(u=>{c.push(`- ${p(u,260)}`)})),i.warnings.length&&(c.push("","ATTENTION"),i.warnings.slice(-5).forEach(u=>{c.push(`- ${p(u,260)}`)})),i.decisions.length&&(c.push("","RECENT DECISIONS"),i.decisions.slice(-5).forEach(u=>{c.push(`- ${p(u,260)}`)})),i.lastSession&&c.push("",`Last work session: ${i.lastSession.agent} / ${i.lastSession.nativeSessionId}`)}if(l&&l.openQuestions.length&&(c.push("","UNRESOLVED QUESTIONS"),l.openQuestions.slice(0,5).forEach(u=>{c.push(`- ${p(u.value,260)}`)})),f&&c.push(`Latest handoff: ${f.reason} / ${f.sourceSession.agent}`),d.length){c.push("","OPERATING NOTES");for(let u of d)c.push(`- ${u}`)}c.push("","Before changing anything: verify the current repository state and continue from the active phase/task above.");let k=rt(c,t);return{version:1,projectId:r.project.id,projectName:r.project.name,text:k,estimatedTokens:B(k),maxTokens:t,hasManual:!!n,hasWorkState:!!i,hasHandoff:!!f,generatedAt:new Date().toISOString()}}function it(r){return me(r.rootPath,".toolnet","context","startup.md")}function at(r){return me(r.rootPath,".toolnet","context","startup.json")}function ct(r,t){let e=it(r);nt(ot(e),{recursive:!0}),st(e,t.text.endsWith(`
`)?t.text:t.text+`
`,{encoding:"utf8",mode:384}),v(at(r),t)}async function ge(r,t,e=800){let s=(await fe({project:r,storage:t,maxTokens:e})).text;S(s)>e&&(s=F(s,e),s+=`

[Context trimmed by ToolNet Memory token budget]
`);let a={version:1,projectId:r.id,projectName:r.name,text:s,digest:y(s),estimatedTokens:S(s),generatedAt:new Date().toISOString()};return ct(r,a),await t.put(`projects/${r.id}/context/startup.md`,a.text+`
`,"text/markdown"),await t.put(`projects/${r.id}/context/startup.json`,JSON.stringify(a,null,2)+`
`,"application/json"),a}import{existsSync as ut,readFileSync as lt}from"node:fs";import{homedir as dt}from"node:os";import{join as pt}from"node:path";function ft(r){let t=r.trim();return t.length>=2&&t.startsWith('"')&&t.endsWith('"')?(t=t.slice(1,-1),t.replace(/\\n/g,`
`).replace(/\\r/g,"\r").replace(/\\t/g,"	").replace(/\\"/g,'"').replace(/\\\\/g,"\\")):t.length>=2&&t.startsWith("'")&&t.endsWith("'")?t.slice(1,-1):t}function mt(){let r=process.env.TOOLNET_GLOBAL_ENV??pt(dt(),".config","toolnet-memory",".env");if(!ut(r))return;let t=lt(r,"utf8");for(let e of t.split(/\r?\n/)){let n=e.trim();if(!n||n.startsWith("#"))continue;n.startsWith("export ")&&(n=n.slice(7));let s=n.indexOf("=");if(s<=0)continue;let o=n.slice(0,s).trim();/^[A-Za-z_][A-Za-z0-9_]*$/.test(o)&&process.env[o]===void 0&&(process.env[o]=ft(n.slice(s+1)))}}mt();function w(r,t){return r===void 0?t:["1","true","yes","on"].includes(r.toLowerCase())}function j(r,t){if(!r)return t;let e=Number(r);return Number.isFinite(e)?e:t}function he(){return{memory:{autoCapture:w(process.env.MEMORY_AUTO_CAPTURE,!0),autoRetrieve:w(process.env.MEMORY_AUTO_RETRIEVE,!0),autoSummarize:w(process.env.MEMORY_AUTO_SUMMARIZE,!0),autoSync:w(process.env.MEMORY_AUTO_SYNC,!0)},retrieval:{maxCandidates:j(process.env.MEMORY_MAX_CANDIDATES,50),rerankTop:j(process.env.MEMORY_RERANK_TOP,10),finalContext:j(process.env.MEMORY_FINAL_CONTEXT,5),tokenBudget:j(process.env.MEMORY_TOKEN_BUDGET,2e3)},storage:{provider:process.env.MEMORY_STORAGE_PROVIDER??"huggingface",r2:{accountId:process.env.R2_ACCOUNT_ID,bucket:process.env.R2_BUCKET,accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY},s3:{endpoint:process.env.S3_ENDPOINT,region:process.env.S3_REGION,bucket:process.env.S3_BUCKET,accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY,forcePathStyle:w(process.env.S3_FORCE_PATH_STYLE,!1)},huggingface:{namespace:process.env.HF_NAMESPACE,bucket:process.env.HF_BUCKET,accessKeyId:process.env.HF_S3_ACCESS_KEY_ID,secretAccessKey:process.env.HF_S3_SECRET_ACCESS_KEY},localRoot:process.env.MEMORY_LOCAL_STORAGE_PATH},cache:{maxMb:j(process.env.MEMORY_LOCAL_CACHE_MB,200)}}}import{createHash as gt}from"node:crypto";import{existsSync as V,mkdirSync as ht,readFileSync as yt,renameSync as kt,writeFileSync as St}from"node:fs";import{basename as vt,dirname as O,join as E,parse as Se,resolve as b}from"node:path";var ve=".toolnet",xt="project.json";function wt(r){return gt("sha256").update(r).digest("hex").slice(0,16)}function H(r){return E(r,ve,xt)}function jt(r){return V(H(r))}function bt(r,t){let e=b(r),n=Se(e).root;for(;;){if(jt(e))return e;if(e===n||t&&e===b(t))break;let s=O(e);if(s===e)break;e=s}return null}function At(r){let t=b(r),e=Se(t).root,n=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"];for(;;){if(n.some(o=>V(E(t,o))))return t;if(t===e)break;let s=O(t);if(s===t)break;t=s}return b(r)}function Pt(r){let t;try{t=JSON.parse(yt(r,"utf8"))}catch(s){throw new Error(`Invalid ToolNet project manifest: ${r}: ${s instanceof Error?s.message:String(s)}`)}if(!t||typeof t!="object")throw new Error(`Invalid ToolNet project manifest: ${r}`);let e=t;if(typeof e.id!="string"||!e.id.trim())throw new Error(`ToolNet project manifest is missing id: ${r}`);if(typeof e.name!="string"||!e.name.trim())throw new Error(`ToolNet project manifest is missing name: ${r}`);let n=new Date().toISOString();return{version:1,id:e.id,name:e.name,remote:typeof e.remote=="string"&&e.remote.trim()?e.remote:e.name,rootPath:typeof e.rootPath=="string"?e.rootPath:O(O(r)),createdAt:typeof e.createdAt=="string"?e.createdAt:n,updatedAt:typeof e.updatedAt=="string"?e.updatedAt:n,graphVersion:typeof e.graphVersion=="number"?e.graphVersion:0,memoryVersion:typeof e.memoryVersion=="number"?e.memoryVersion:0,metadata:e.metadata&&typeof e.metadata=="object"?e.metadata:void 0}}function ye(r,t){let e=E(r,ve);ht(e,{recursive:!0});let n=H(r),s=`${n}.tmp-${process.pid}`;St(s,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),kt(s,n)}function ke(r,t){return{id:r.id,name:r.name,remote:r.remote,rootPath:t,createdAt:r.createdAt,updatedAt:r.updatedAt,graphVersion:r.graphVersion,memoryVersion:r.memoryVersion,metadata:r.metadata}}var M=class{detect(t=process.cwd()){let e=b(t),n=At(e),o=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(f=>V(E(n,f))),a=bt(e,o?n:void 0);if(a){let f=H(a),c=Pt(f);return c.rootPath!==a&&(c.rootPath=a,c.updatedAt=new Date().toISOString(),ye(a,c)),ke(c,a)}let d=new Date().toISOString(),i=vt(n),l={version:1,id:wt(n),name:i,remote:i,rootPath:n,createdAt:d,updatedAt:d,graphVersion:0,memoryVersion:0};return ye(n,l),ke(l,n)}};import{homedir as qt}from"node:os";import{join as Yt}from"node:path";import{DeleteObjectCommand as Ct,GetObjectCommand as Tt,HeadObjectCommand as It,ListObjectsV2Command as Ot,PutObjectCommand as Mt,S3Client as Et}from"@aws-sdk/client-s3";import{getSignedUrl as Rt}from"@aws-sdk/s3-request-presigner";var R=class{name="huggingface";client;bucket;constructor(t){this.bucket=t.bucket,this.client=new Et({region:"us-east-1",endpoint:`https://s3.hf.co/${t.namespace}`,forcePathStyle:!0,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:t.accessKeyId,secretAccessKey:t.secretAccessKey}})}async put(t,e,n="application/octet-stream"){let s=typeof e=="string"?Buffer.from(e,"utf8"):e;await this.client.send(new Mt({Bucket:this.bucket,Key:t,Body:s,ContentType:n}))}async get(t){let e=await Rt(this.client,new Tt({Bucket:this.bucket,Key:t}),{expiresIn:60}),n=await fetch(e,{redirect:"follow"});if(n.status===404)return null;if(!n.ok)throw new Error(`HF download failed: ${n.status} ${n.statusText}`);return new Uint8Array(await n.arrayBuffer())}async getText(t){let e=await this.get(t);return e?Buffer.from(e).toString("utf8"):null}async exists(t){try{return await this.client.send(new It({Bucket:this.bucket,Key:t})),!0}catch(e){if(typeof e=="object"&&e!==null&&"$metadata"in e&&e.$metadata?.httpStatusCode===404)return!1;throw e}}async delete(t){await this.client.send(new Ct({Bucket:this.bucket,Key:t}))}async list(t=""){let e=[],n;do{let s=await this.client.send(new Ot({Bucket:this.bucket,Prefix:t||void 0,ContinuationToken:n}));for(let o of s.Contents??[])o.Key&&e.push({key:o.Key,size:o.Size,updatedAt:o.LastModified?.toISOString()});n=s.IsTruncated?s.NextContinuationToken:void 0}while(n);return e}};import{access as xe,mkdir as Nt,readFile as $t,readdir as _t,rm as Ft,stat as we,writeFile as Wt}from"node:fs/promises";import{dirname as Dt,join as Kt,relative as je,resolve as Lt}from"node:path";var A=class{constructor(t){this.root=t}root;name="local";path(t){let e=t.replace(/^\/+/,"");return Lt(this.root,e)}async put(t,e){let n=this.path(t);await Nt(Dt(n),{recursive:!0}),await Wt(n,e)}async get(t){try{return await $t(this.path(t))}catch(e){if(typeof e=="object"&&e!==null&&"code"in e&&e.code==="ENOENT")return null;throw e}}async getText(t){let e=await this.get(t);return e?Buffer.from(e).toString("utf8"):null}async exists(t){try{return await xe(this.path(t)),!0}catch{return!1}}async delete(t){await Ft(this.path(t),{force:!0})}async list(t=""){let e=this.path(t),n=[];try{await xe(e)}catch{return n}let s=async a=>{let d=await _t(a,{withFileTypes:!0});for(let i of d){let l=Kt(a,i.name);if(i.isDirectory()){await s(l);continue}let f=await we(l);n.push({key:je(this.root,l),size:f.size,updatedAt:f.mtime.toISOString()})}},o=await we(e);return o.isDirectory()?await s(e):n.push({key:je(this.root,e),size:o.size,updatedAt:o.mtime.toISOString()}),n}};import{DeleteObjectCommand as Bt,GetObjectCommand as Vt,HeadObjectCommand as Ht,ListObjectsV2Command as zt,PutObjectCommand as Jt,S3Client as Gt}from"@aws-sdk/client-s3";import{getSignedUrl as Ut}from"@aws-sdk/s3-request-presigner";var P=class{name;client;bucket;constructor(t){this.name=t.name??"s3",this.bucket=t.bucket,this.client=new Gt({region:t.region??"us-east-1",endpoint:t.endpoint||void 0,forcePathStyle:t.forcePathStyle??!1,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:t.accessKeyId,secretAccessKey:t.secretAccessKey}})}async put(t,e,n="application/octet-stream"){let s=typeof e=="string"?Buffer.from(e,"utf8"):e;await this.client.send(new Jt({Bucket:this.bucket,Key:t,Body:s,ContentType:n}))}async get(t){let e=await Ut(this.client,new Vt({Bucket:this.bucket,Key:t}),{expiresIn:60}),n=await fetch(e,{redirect:"follow"});if(n.status===404)return null;if(!n.ok)throw new Error(`${this.name} download failed: ${n.status} ${n.statusText}`);return new Uint8Array(await n.arrayBuffer())}async getText(t){let e=await this.get(t);return e?Buffer.from(e).toString("utf8"):null}async exists(t){try{return await this.client.send(new Ht({Bucket:this.bucket,Key:t})),!0}catch(e){if(typeof e=="object"&&e!==null&&"$metadata"in e&&e.$metadata?.httpStatusCode===404)return!1;throw e}}async delete(t){await this.client.send(new Bt({Bucket:this.bucket,Key:t}))}async list(t=""){let e=[],n;do{let s=await this.client.send(new zt({Bucket:this.bucket,Prefix:t||void 0,ContinuationToken:n}));for(let o of s.Contents??[])o.Key&&e.push({key:o.Key,size:o.Size,updatedAt:o.LastModified?.toISOString()});n=s.IsTruncated?s.NextContinuationToken:void 0}while(n);return e}};function z(r,t){return console.warn(t),new A(r)}function be(r){let t=r.localRoot??Yt(qt(),".toolnet-memory","storage");if(r.provider==="r2"){let e=r.r2;return e?.accountId&&e.bucket&&e.accessKeyId&&e.secretAccessKey?new P({name:"r2",endpoint:`https://${e.accountId}.r2.cloudflarestorage.com`,region:"auto",bucket:e.bucket,forcePathStyle:!0,accessKeyId:e.accessKeyId,secretAccessKey:e.secretAccessKey}):z(t,"[storage] Cloudflare R2 credentials missing. Using local fallback.")}if(r.provider==="s3"){let e=r.s3;return e?.bucket&&e.accessKeyId&&e.secretAccessKey?new P({name:"s3",endpoint:e.endpoint,region:e.region??"us-east-1",bucket:e.bucket,forcePathStyle:e.forcePathStyle??!1,accessKeyId:e.accessKeyId,secretAccessKey:e.secretAccessKey}):z(t,"[storage] S3 credentials missing. Using local fallback.")}if(r.provider==="huggingface"){let e=r.huggingface;return e?.namespace&&e.bucket&&e.accessKeyId&&e.secretAccessKey?new R({namespace:e.namespace,bucket:e.bucket,accessKeyId:e.accessKeyId,secretAccessKey:e.secretAccessKey}):z(t,"[storage] Hugging Face credentials missing. Using local fallback.")}return new A(t)}function Qt(r){return new Promise(t=>setTimeout(t,r))}async function Ae(r,t={}){let e=Math.max(1,t.attempts??3),n=t.baseDelayMs??150,s=t.maxDelayMs??2e3,o;for(let a=1;a<=e;a++)try{return await r()}catch(d){if(o=d,a>=e)break;let i=Math.min(s,n*2**(a-1)),l=Math.floor(Math.random()*Math.max(1,i*.2));await Qt(i+l)}throw o}var Xt=new Set(["put","get","getText","delete","list"]);function Pe(r,t={}){return new Proxy(r,{get(e,n){let s=Reflect.get(e,n,e);return typeof s!="function"?s:Xt.has(n)?(...o)=>Ae(()=>Promise.resolve(s.apply(e,o)),t):s.bind(e)}})}function Ce(r){let t=r.trim().replace(/\s+/g,"_").replace(/[^A-Za-z0-9._-]/g,"_").replace(/_+/g,"_").replace(/^\.+|\.+$/g,"").slice(0,100);if(!t||t==="."||t==="..")throw new Error("Invalid project storage folder");return t}function Te(r){let t=r.replace(/^\/+/,"");if(t.startsWith("memories/"))return"memory/records/"+t.slice(9);if(t.startsWith("vectors/"))return"memory/vectors/"+t.slice(8);if(t.startsWith("graph/"))return"code/graph/"+t.slice(6);let e=t.match(/^(snapshots\/[^/]+\/)memories\/(.+)$/);if(e)return`${e[1]}memory/records/${e[2]}`;if(e=t.match(/^(snapshots\/[^/]+\/)vectors\/(.+)$/),e)return`${e[1]}memory/vectors/${e[2]}`;if(e=t.match(/^(snapshots\/[^/]+\/)graph\/(.+)$/),e)return`${e[1]}code/graph/${e[2]}`;let n=t.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)memories\/(.+)$/);if(n)return`${n[1]}memory/records/${n[2]}`;if(n=t.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)vectors\/(.+)$/),n)return`${n[1]}memory/vectors/${n[2]}`;if(n=t.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)graph\/(.+)$/),n)return`${n[1]}code/graph/${n[2]}`;let s=t.match(/^(projects\/[^/]+\/)memories\/(.+)$/);return s?`${s[1]}memory/records/${s[2]}`:(s=t.match(/^(projects\/[^/]+\/)vectors\/(.+)$/),s?`${s[1]}memory/vectors/${s[2]}`:(s=t.match(/^(projects\/[^/]+\/)graph\/(.+)$/),s?`${s[1]}code/graph/${s[2]}`:t))}var N=class{constructor(t,e,n,s){this.provider=t;this.name=t.name,this.projectId=e,this.projectName=n,this.folder=Ce(s??n),this.sourcePrefix=`projects/${e}`,this.targetPrefix=`projects/${this.folder}`}provider;name;folder;sourcePrefix;targetPrefix;projectId;projectName;registryPromise;async registerProject(){let t=`${this.targetPrefix}/project.json`,e=new Date().toISOString(),n=e,s=await this.provider.getText(t);if(s){let a;try{a=JSON.parse(s)}catch(d){throw new Error(`Invalid remote ToolNet project manifest at ${t}: ${d instanceof Error?d.message:String(d)}`)}if(typeof a.id=="string"&&a.id!==this.projectId)throw new Error(["ToolNet remote project namespace collision.",`Remote folder: ${this.targetPrefix}`,`Existing project id: ${a.id}`,`Current project id: ${this.projectId}`,"Refusing to mix data from two projects."].join(" "));typeof a.createdAt=="string"&&(n=a.createdAt)}let o={version:1,id:this.projectId,name:this.projectName,remote:this.folder,createdAt:n,updatedAt:e};await this.provider.put(t,JSON.stringify(o,null,2)+`
`,"application/json")}async ensureRegistered(){return this.registryPromise||(this.registryPromise=this.registerProject()),this.registryPromise}key(t){if(t=Te(t),t===this.sourcePrefix)return this.targetPrefix;if(t.startsWith(`${this.sourcePrefix}/`))return this.targetPrefix+t.slice(this.sourcePrefix.length);if(t===this.targetPrefix||t.startsWith(`${this.targetPrefix}/`))return t;if(t.startsWith("projects/"))throw new Error(["Cross-project storage access denied.",`Current project: ${this.targetPrefix}`,`Requested key: ${t}`].join(" "));return t}async put(t,e,n){return await this.ensureRegistered(),this.provider.put(this.key(t),e,n)}async get(t){return await this.ensureRegistered(),this.provider.get(this.key(t))}async getText(t){return await this.ensureRegistered(),this.provider.getText(this.key(t))}async delete(t){return await this.ensureRegistered(),this.provider.delete(this.key(t))}async exists(t){return await this.ensureRegistered(),this.provider.exists(this.key(t))}async list(t){return await this.ensureRegistered(),this.provider.list(this.key(t))}};function Zt(){let r=process.argv.slice(2),t=r[0]||"print",e={mode:"minimal"};for(let n=1;n<r.length;n++)r[n]==="--project"&&r[n+1]?(e.project=r[n+1],n++):r[n]==="--limit"&&r[n+1]?(e.limit=parseInt(r[n+1],10),n++):r[n]==="--focused"&&r[n+1]?(e.mode="focused",e.query=r[n+1],n++):r[n]==="--deep"&&(e.mode="deep");return{command:t,options:e}}async function er(){let{command:r,options:t}=Zt();try{switch(r){case"print":await tr(t);break;case"sync":await rr(t);break;case"refresh":await nr(t);break;case"profile-show":await sr(t);break;case"profile-sync":await or(t);break;default:console.error(`Unknown command: ${r}`),console.error("Available commands: print, sync, refresh, profile-show, profile-sync"),process.exit(1)}}catch(e){console.error("Error:",e instanceof Error?e.message:String(e)),process.exit(1)}}async function tr(r){let t=r.mode||"minimal";if(t==="minimal"){let e=D({projectPath:r.project});e||(console.error("No ToolNet project found. Run toolnet-memory init first."),process.exit(1)),process.stdout.write(e)}else(t==="focused"||t==="deep")&&(console.error("Focused and deep modes require storage access."),console.error("Use: toolnet-memory brief --deep for deep context"),process.exit(1))}async function rr(r){let t=D({projectPath:r.project});t||(console.error("No ToolNet project found."),process.exit(1));let e=ae(t);console.log(`Context hash: ${e}`),console.log(`Context size: ${t.length} chars`)}async function nr(r){console.log("Refreshing deep startup brief cache...");let t=r.project||process.cwd(),e=x(t);e||(console.error("No ToolNet project found."),process.exit(1));let n=new M().detect(e),s=he(),o=Pe(be({provider:s.storage.provider,huggingface:s.storage.huggingface,localRoot:s.storage.localRoot}),{attempts:2}),a=new N(o,n.id,n.name,n.remote??n.name);await ge(n,a),console.log("Deep startup brief cache refreshed.")}async function sr(r){let t=r.project||process.cwd(),e=x(t);e||(console.error("No ToolNet project found."),process.exit(1));let n=Ie.join(e,".toolnet","profile.md");$.existsSync(n)||(console.error("No profile.md found in .toolnet directory."),process.exit(1));let s=$.readFileSync(n,"utf-8");process.stdout.write(s)}async function or(r){let t=ie({projectPath:r.project});console.log("Created/updated:");for(let e of t)console.log(`- ${e}`)}er();
