import{existsSync as Do,statSync as ds}from"node:fs";import{resolve as gs,join as fs}from"node:path";import{existsSync as Ho,readFileSync as Jo}from"node:fs";import{homedir as Lo}from"node:os";import{join as Go}from"node:path";function Ko(e){let t=e.trim();return t.length>=2&&t.startsWith('"')&&t.endsWith('"')?(t=t.slice(1,-1),t.replace(/\\n/g,`
`).replace(/\\r/g,"\r").replace(/\\t/g,"	").replace(/\\"/g,'"').replace(/\\\\/g,"\\")):t.length>=2&&t.startsWith("'")&&t.endsWith("'")?t.slice(1,-1):t}function Bo(){let e=process.env.TOOLNET_GLOBAL_ENV??Go(Lo(),".config","toolnet-memory",".env");if(!Ho(e))return;let t=Jo(e,"utf8");for(let o of t.split(/\r?\n/)){let r=o.trim();if(!r||r.startsWith("#"))continue;r.startsWith("export ")&&(r=r.slice(7));let n=r.indexOf("=");if(n<=0)continue;let s=r.slice(0,n).trim();/^[A-Za-z_][A-Za-z0-9_]*$/.test(s)&&process.env[s]===void 0&&(process.env[s]=Ko(r.slice(n+1)))}}Bo();import{createHash as Uo}from"node:crypto";import{existsSync as ae,mkdirSync as Yo,readFileSync as Wo,renameSync as zo,writeFileSync as qo}from"node:fs";import{basename as Vo,dirname as K,join as U,parse as Ke,resolve as A}from"node:path";var Be=".toolnet",Xo="project.json";function Qo(e){return Uo("sha256").update(e).digest("hex").slice(0,16)}function le(e){return U(e,Be,Xo)}function Zo(e){return ae(le(e))}function er(e,t){let o=A(e),r=Ke(o).root;for(;;){if(Zo(o))return o;if(o===r||t&&o===A(t))break;let n=K(o);if(n===o)break;o=n}return null}function tr(e){let t=A(e),o=Ke(t).root,r=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"];for(;;){if(r.some(s=>ae(U(t,s))))return t;if(t===o)break;let n=K(t);if(n===t)break;t=n}return A(e)}function or(e){let t;try{t=JSON.parse(Wo(e,"utf8"))}catch(n){throw new Error(`Invalid ToolNet project manifest: ${e}: ${n instanceof Error?n.message:String(n)}`)}if(!t||typeof t!="object")throw new Error(`Invalid ToolNet project manifest: ${e}`);let o=t;if(typeof o.id!="string"||!o.id.trim())throw new Error(`ToolNet project manifest is missing id: ${e}`);if(typeof o.name!="string"||!o.name.trim())throw new Error(`ToolNet project manifest is missing name: ${e}`);let r=new Date().toISOString();return{version:1,id:o.id,name:o.name,remote:typeof o.remote=="string"&&o.remote.trim()?o.remote:o.name,rootPath:typeof o.rootPath=="string"?o.rootPath:K(K(e)),createdAt:typeof o.createdAt=="string"?o.createdAt:r,updatedAt:typeof o.updatedAt=="string"?o.updatedAt:r,graphVersion:typeof o.graphVersion=="number"?o.graphVersion:0,memoryVersion:typeof o.memoryVersion=="number"?o.memoryVersion:0,metadata:o.metadata&&typeof o.metadata=="object"?o.metadata:void 0}}function Le(e,t){let o=U(e,Be);Yo(o,{recursive:!0});let r=le(e),n=`${r}.tmp-${process.pid}`;qo(n,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),zo(n,r)}function Ge(e,t){return{id:e.id,name:e.name,remote:e.remote,rootPath:t,createdAt:e.createdAt,updatedAt:e.updatedAt,graphVersion:e.graphVersion,memoryVersion:e.memoryVersion,metadata:e.metadata}}var B=class{detect(t=process.cwd()){let o=A(t),r=tr(o),s=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(u=>ae(U(r,u))),i=er(o,s?r:void 0);if(i){let u=le(i),p=or(u);return p.rootPath!==i&&(p.rootPath=i,p.updatedAt=new Date().toISOString(),Le(i,p)),Ge(p,i)}let c=new Date().toISOString(),a=Vo(r),l={version:1,id:Qo(r),name:a,remote:a,rootPath:r,createdAt:c,updatedAt:c,graphVersion:0,memoryVersion:0};return Le(r,l),Ge(l,r)}};var Ue=["\u280B","\u2819","\u2839","\u2838","\u283C","\u2834","\u2826","\u2827","\u2807","\u280F"],f={clear:"\r\x1B[2K",cyan:"\x1B[36m",green:"\x1B[32m",red:"\x1B[31m",yellow:"\x1B[33m",amber:"\x1B[38;5;214m",dim:"\x1B[2m",reset:"\x1B[0m"};function Ye(e,t=16){let r=Math.max(1,t-4+1),n=e%r;return"\u2500".repeat(n)+"\u2501".repeat(4)+"\u2500".repeat(Math.max(0,t-n-4))}function We(e){let t=Date.now()-e;return t<1e3?`${t}ms`:t<1e4?`${(t/1e3).toFixed(1)}s`:`${Math.round(t/1e3)}s`}var ue=class{stream;enabled;interactive;color;intervalMs;display;label;frame=0;startedAt=0;timer;active=!1;constructor(t,o={}){this.label=t,this.stream=o.stream??process.stderr,this.enabled=o.enabled??!0,this.interactive=o.interactive??this.stream.isTTY===!0,this.color=o.color??(this.interactive&&process.env.NO_COLOR===void 0),this.intervalMs=Math.max(40,o.intervalMs??80),this.display=o.display??"spinner"}start(){return!this.enabled||this.active?this:(this.active=!0,this.startedAt=Date.now(),this.interactive?(this.render(),this.timer=setInterval(()=>{this.frame=(this.frame+1)%1e4,this.render()},this.intervalMs),this.timer.unref?.(),this):(this.stream.write(`\u2192 ${this.label}
`),this))}update(t){return this.label=t,this.enabled&&this.active&&this.interactive&&this.render(),this}succeed(t){this.finish("\u2713",t??this.label,f.green)}fail(t){this.finish("\u2717",t??this.label,f.red)}warn(t){this.finish("!",t??this.label,f.yellow)}stop(){this.active&&(this.timer&&(clearInterval(this.timer),this.timer=void 0),this.enabled&&this.interactive&&this.stream.write(f.clear),this.active=!1)}render(){if(!this.enabled||!this.active||!this.interactive)return;let t=Ue[this.frame%Ue.length],o=this.display==="bar"?this.color?`${f.amber}${Ye(this.frame)}${f.reset}`:Ye(this.frame):this.color?`${f.cyan}${t}${f.reset}`:t,r=We(this.startedAt),n=this.color?`${f.dim}${r}${f.reset}`:r;this.stream.write(`${f.clear}${o} ${this.label} ${n}`)}finish(t,o,r){if(!this.enabled){this.active=!1;return}this.startedAt||(this.startedAt=Date.now()),this.timer&&(clearInterval(this.timer),this.timer=void 0);let n=We(this.startedAt),s=this.color?`${r}${t}${f.reset}`:t,i=this.color?`${f.dim}${n}${f.reset}`:n;this.interactive?this.stream.write(`${f.clear}${s} ${o} ${i}
`):this.stream.write(`${s} ${o} (${n})
`),this.active=!1}};async function pe(e,t,o={}){let r=new ue(e,o).start();try{let n=await t();return r.succeed(),n}catch(n){throw r.fail(),n}}import{existsSync as bt}from"node:fs";import{homedir as Ir}from"node:os";import{join as Or}from"node:path";import{spawnSync as xr}from"node:child_process";import{homedir as rr}from"node:os";import{join as I}from"node:path";function ze(e={}){return I(e.home??rr(),".gemini")}function de(e={}){return I(ze(e),"config")}function Y(e={}){return I(de(e),"mcp_config.json")}function W(e={}){return I(de(e),"hooks.json")}function qe(e={}){return I(ze(e),"antigravity-cli")}function Ve(e="toolnet-memory",t={}){return I(qe(t),"plugins",e)}function Xe(e={}){return[qe(e),de(e)]}import{homedir as nr}from"node:os";import{join as P}from"node:path";function w(e={}){let t=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return t?P(t,"opencode"):P(e.home??nr(),".config","opencode")}function Qe(e={}){return P(w(e),"opencode.json")}function Ze(e={}){return P(w(e),"plugins")}function et(e={}){return P(w(e),"AGENTS.md")}import{homedir as tt}from"node:os";import{join as ge}from"node:path";function fe(e={}){return ge(e.home??tt(),".claude")}function ot(e={}){return ge(fe(e),"settings.json")}function rt(e={}){return ge(e.home??tt(),".claude.json")}import{homedir as ir}from"node:os";import{join as F}from"node:path";function me(e={}){return e.kiroHome??process.env.KIRO_HOME??F(e.home??ir(),".kiro")}function sr(e={}){return F(me(e),"settings")}function nt(e={}){return F(sr(e),"mcp.json")}function cr(e={}){return F(me(e),"hooks")}function it(e={}){return F(cr(e),"toolnet-memory.json")}function st(e={}){return[me(e)]}import{homedir as ar}from"node:os";import{join as k,resolve as lr}from"node:path";function z(e={}){return e.cursorHome??k(e.home??ar(),".cursor")}function ur(e={}){return e.cursorConfigDir??process.env.CURSOR_CONFIG_DIR??(e.xdgConfigHome??process.env.XDG_CONFIG_HOME?k(e.xdgConfigHome??process.env.XDG_CONFIG_HOME,"cursor"):void 0)??z(e)}function q(e={}){return k(z(e),"mcp.json")}function V(e={}){return k(z(e),"hooks.json")}function ye(e){return k(lr(e),".cursor")}function ct(e){return k(ye(e),"mcp.json")}function at(e){return k(ye(e),"hooks.json")}function pr(e){return k(ye(e),"rules")}function lt(e){return k(pr(e),"toolnet-memory.mdc")}function ut(e={}){return Array.from(new Set([z(e),ur(e)]))}import{homedir as dr}from"node:os";import{join as h,resolve as gr}from"node:path";function he(e={}){return e.copilotHome??process.env.COPILOT_HOME??h(e.home??dr(),".copilot")}function X(e={}){return h(he(e),"mcp-config.json")}function fr(e={}){return h(he(e),"hooks")}function Q(e={}){return h(fr(e),"toolnet-memory.json")}function ke(e){return h(gr(e),".github")}function pt(e){return h(ke(e),"mcp.json")}function mr(e){return h(ke(e),"hooks")}function dt(e){return h(mr(e),"toolnet-memory.json")}function yr(e){return h(ke(e),"instructions")}function gt(e){return h(yr(e),"toolnet-memory.instructions.md")}function ft(e={}){return[he(e)]}import{homedir as hr}from"node:os";import{join as m,resolve as kr}from"node:path";function Z(e={}){return e.grokHome??process.env.GROK_HOME??m(e.home??hr(),".grok")}function ee(e={}){return m(Z(e),"config.toml")}function br(e={}){return m(Z(e),"hooks")}function te(e={}){return m(br(e),"toolnet-memory.json")}function vr(e={}){return m(Z(e),"skills")}function Sr(e={}){return m(vr(e),"toolnet-continuity")}function oe(e={}){return m(Sr(e),"SKILL.md")}function be(e){return m(kr(e),".grok")}function mt(e){return m(be(e),"config.toml")}function Cr(e){return m(be(e),"hooks")}function yt(e){return m(Cr(e),"toolnet-memory.json")}function wr(e){return m(be(e),"skills")}function jr(e){return m(wr(e),"toolnet-continuity")}function ht(e){return m(jr(e),"SKILL.md")}function kt(e={}){return[Z(e)]}function Rr(e){return xr("sh",["-lc",`command -v ${JSON.stringify(e)} >/dev/null 2>&1`],{stdio:"ignore"}).status===0}function j(e){let t=e.commandExists(e.command),o=e.configPaths.filter(s=>bt(s)),r=o.length>0,n=[];t&&n.push(`command:${e.command}`);for(let s of o)n.push(`config:${s}`);return{agent:e.agent,detected:t||r,commandDetected:t,configDetected:r,evidence:n}}function Er(e){let t=e.commands.filter(i=>e.commandExists(i)),o=e.configPaths.filter(i=>bt(i)),r=t.length>0,n=o.length>0,s=[...t.map(i=>`command:${i}`),...o.map(i=>`config:${i}`)];return{agent:e.agent,detected:r||n,commandDetected:r,configDetected:n,evidence:s}}function vt(e={}){let t=e.home??Ir(),o=e.commandExists??Rr,r=e.codexHome??process.env.CODEX_HOME??Or(t,".codex");return[j({agent:"agy",command:"agy",commandExists:o,configPaths:Xe({home:t})}),j({agent:"opencode",command:"opencode",commandExists:o,configPaths:[w({home:t,xdgConfigHome:e.xdgConfigHome})]}),j({agent:"claude",command:"claude",commandExists:o,configPaths:[fe({home:t})]}),j({agent:"kiro",command:"kiro-cli",commandExists:o,configPaths:st({home:t,kiroHome:e.kiroHome})}),Er({agent:"cursor",commands:["agent","cursor-agent"],commandExists:o,configPaths:ut({home:t,cursorHome:e.cursorHome,cursorConfigDir:e.cursorConfigDir,xdgConfigHome:e.xdgConfigHome})}),j({agent:"copilot",command:"copilot",commandExists:o,configPaths:ft({home:t,copilotHome:e.copilotHome})}),j({agent:"grok",command:"grok",commandExists:o,configPaths:kt({home:t,grokHome:e.grokHome})}),j({agent:"codex",command:"codex",commandExists:o,configPaths:[r]})]}import{existsSync as ne,mkdirSync as Ot,readFileSync as xt,renameSync as Ur,writeFileSync as Yr}from"node:fs";import{dirname as Wr,join as re}from"node:path";import{existsSync as Mr,mkdirSync as Tr,readFileSync as Ar,renameSync as Pr,rmSync as Fr,writeFileSync as Nr}from"node:fs";import{dirname as _r}from"node:path";function $r(e){return`'${e.replace(/'/g,"'\\''")}'`}function St(e={}){let t=e.hooksFile??W();Tr(_r(t),{recursive:!0,mode:448});let o={};if(Mr(t)){let i;try{i=JSON.parse(Ar(t,"utf8"))}catch(c){throw new Error(`Invalid existing Agy hooks.json: ${c instanceof Error?c.message:String(c)}`)}if(typeof i!="object"||i===null||Array.isArray(i))throw new Error("Invalid existing Agy hooks.json: root must be a JSON object.");o=i}let r=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=`${$r(r)} session:agy-hook`;o["toolnet-memory"]={enabled:!0,PreToolUse:[{matcher:"view_file|list_dir|find_by_name|grep_search|run_command",hooks:[{type:"command",command:`${n} pre-tool`,timeout:5}]}],PreInvocation:[{type:"command",command:`${n} pre`,timeout:15}],PostInvocation:[{type:"command",command:`${n} post`,timeout:15}],Stop:[{type:"command",command:`${n} stop`,timeout:30}]};let s=`${t}.tmp-${process.pid}-${Date.now()}`;try{Nr(s,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),Pr(s,t)}finally{Fr(s,{force:!0})}return t}import{existsSync as Dr,mkdirSync as Hr,readFileSync as Jr,renameSync as Lr,writeFileSync as Gr}from"node:fs";import{dirname as Kr}from"node:path";function N(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Br(e,t){Hr(Kr(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;Gr(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Lr(o,e)}function Ct(e){if(!Dr(e))return{};let t=Jr(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch(r){throw new Error(`Invalid existing Agy MCP config: ${r instanceof Error?r.message:String(r)}`)}if(!N(o))throw new Error("Invalid existing Agy MCP config: root must be a JSON object.");return o}function wt(e,t){return N(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function jt(e={}){let t=e.configFile??Y(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=Ct(t),s=n.mcpServers;if(s!==void 0&&!N(s))throw new Error("Invalid existing Agy MCP config: mcpServers must be an object.");let i=N(s)?{...s}:{},c=i[r];if(wt(c,o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};i[r]={command:o,args:["mcp"]};let a={...n,mcpServers:i};Br(t,a);let u=Ct(t).mcpServers;if(!N(u)||!wt(u[r],o))throw new Error("Agy MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}var zr=`# ToolNet Memory Continuity

ToolNet Memory is the authoritative continuity layer for previous project work.

## Resume / continue behavior

Whenever the user asks to continue, resume, finish, pick up, return to, or complete previous work:

1. FIRST call the ToolNet Memory MCP tool \`memory_agent_ask\`.
2. Use ToolNet's compact continuity result to determine:
   - current task
   - completed work
   - current or last file
   - TODOs
   - blockers
   - next action
3. Only AFTER continuity is known may you inspect current source or git to verify repository truth.

## Forbidden continuity recovery

Do NOT reconstruct previous work by reading, listing, searching, or shelling into:

- \`.toolnet/sessions/**\`
- \`state.json\`
- \`events.jsonl\`
- raw transcripts
- \`~/.gemini/antigravity-cli/brain/**\`
- Antigravity \`transcript.jsonl\`
- another coding agent's internal session history

Do NOT run Bash/cat/tail/grep against those locations to discover previous work.

Do NOT search the filesystem for the implementation or schema of \`memory_agent_ask\`.
Invoke the MCP tool directly.

For direct continuity facts, prefer \`mode="local"\`.
Use \`mode="ai"\` only when continuity is ambiguous or requires synthesis.

Current repository evidence overrides stale memory after ToolNet has restored the working context.

Do not ask the user to repeat context already available through ToolNet Memory.
`;function Rt(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function ve(e,t){Ot(Wr(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;Yr(o,t,{encoding:"utf8",mode:384}),Ur(o,e)}function It(e,t){ne(e)&&xt(e,"utf8")===t||ve(e,t)}function Et(e){if(!ne(e))return{};let t=xt(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch(r){throw new Error(`Invalid legacy Antigravity config ${e}: ${r instanceof Error?r.message:String(r)}`)}if(!Rt(o))throw new Error(`Invalid legacy Antigravity config ${e}: root must be object`);return o}function qr(e,t){if(!ne(e))return!1;let o=Et(e);if(!Rt(o.mcpServers)||!Object.prototype.hasOwnProperty.call(o.mcpServers,t))return!1;let r={...o.mcpServers};return delete r[t],ve(e,`${JSON.stringify({...o,mcpServers:r},null,2)}
`),!0}function Vr(e){if(!ne(e))return!1;let t=Et(e);if(!Object.prototype.hasOwnProperty.call(t,"toolnet-memory"))return!1;let o={...t};return delete o["toolnet-memory"],ve(e,`${JSON.stringify(o,null,2)}
`),!0}function Mt(e={}){let t=e.pluginName??"toolnet-memory",o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.pluginRoot??Ve(t),n=re(r,"plugin.json"),s=re(r,"mcp_config.json"),i=re(r,"hooks.json"),c=re(r,"rules","toolnet-memory-continuity.md");Ot(r,{recursive:!0,mode:448}),It(n,`${JSON.stringify({$schema:"https://antigravity.google/schemas/v1/plugin.json",name:t,description:"Persistent project continuity and memory for Antigravity coding sessions."},null,2)}
`),jt({configFile:s,binary:o,serverName:"toolnet-memory"}),St({hooksFile:i,binary:o}),It(c,`${zr.trim()}
`);let a=e.legacyMcpFile??Y(),l=e.legacyHooksFile??W(),u=[];return a!==s&&qr(a,"toolnet-memory")&&u.push(a),l!==i&&Vr(l)&&u.push(l),{installed:!0,pluginRoot:r,files:[n,s,i,c],migratedLegacy:u}}import{existsSync as Qr,mkdirSync as Pt,readFileSync as Zr,writeFileSync as Ft}from"node:fs";import{join as en}from"node:path";var Xr="memory_agent_ask";function Tt(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${Xr}

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
`.trim()}var At="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",Se="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function tn(){let e=et();Pt(w(),{recursive:!0});let t=`${At}
## ToolNet Memory

ToolNet Memory is available for projects that already contain a valid \`.toolnet/project.json\`.

Rules:

1. Do not create a ToolNet project automatically.
2. If no valid \`.toolnet/project.json\` exists in the current project or an ancestor, ignore ToolNet Memory.
3. Normal startup context must stay small and selective.
4. Do not automatically run deep recovery commands.
5. Use ToolNet MCP or selective retrieval when older project knowledge is actually needed.
6. Raw transcripts must not be injected into prompts.
7. Current repository evidence has priority over stale memory when they conflict.


${Tt()}

${Se}`,o=Qr(e)?Zr(e,"utf8"):"",r=o.indexOf(At),n=o.indexOf(Se);return r>=0&&n>=r?o=o.slice(0,r)+t+o.slice(n+Se.length):(o=o.trimEnd(),o&&(o+=`

`),o+=t),Ft(e,o.trimEnd()+`
`,{encoding:"utf8",mode:384}),e}function Nt(e={}){let t=e.directory??Ze();Pt(t,{recursive:!0}),tn();let o=en(t,"toolnet-memory.js"),r=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=`
// Generated by ToolNet Memory.
// OpenCode integration:
// - project gated
// - selective context injection
// - incremental session checkpoints
// - periodic durability sync
// - best-effort shutdown flush

import fs from "node:fs"
import path from "node:path"
import os from "node:os"

const TOOLNET_BINARY =
  ${JSON.stringify(r)}

const CONTEXT_MAX_TOKENS = 700

const CONTEXT_CACHE_MS = 5000

const LOCAL_CAPTURE_MS = 15000

const REMOTE_SYNC_MS = 60000

const EVENT_CAPTURE_DEBOUNCE_MS = 1200

const CAPTURE_TIMEOUT_MS = 20000

const REMOTE_TIMEOUT_MS = 120000

const GLOBAL_STATUS_FILE = path.join(
  os.homedir(),
  ".config",
  "toolnet-memory",
  "opencode-sync-status.json"
)

function projectStatusFile(
  data
) {
  if (
    typeof data?.projectRoot ===
      "string" &&
    data.projectRoot.length > 0
  ) {
    return path.join(
      data.projectRoot,
      ".toolnet",
      "runtime",
      "opencode-status.json"
    )
  }

  return GLOBAL_STATUS_FILE
}

function writeStatus(data) {
  try {
    const statusFile =
      projectStatusFile(
        data
      )

    fs.mkdirSync(
      path.dirname(
        statusFile
      ),
      {
        recursive: true,
      }
    )

    fs.writeFileSync(
      statusFile,
      JSON.stringify(
        {
          timestamp:
            new Date()
              .toISOString(),
          ...data,
        },
        null,
        2
      ) + "\\n"
    )
  } catch {
    // Status reporting must
    // never break OpenCode.
  }
}

function validProjectManifest(
  file
) {
  try {
    const parsed =
      JSON.parse(
        fs.readFileSync(
          file,
          "utf8"
        )
      )

    return Boolean(
      parsed &&
      typeof parsed ===
        "object" &&
      typeof parsed.id ===
        "string" &&
      parsed.id.length > 0
    )
  } catch {
    return false
  }
}

function findProjectRoot(
  inputDirectory
) {
  let current =
    path.resolve(
      inputDirectory
    )

  const filesystemRoot =
    path.parse(
      current
    ).root

  while (true) {
    const manifest =
      path.join(
        current,
        ".toolnet",
        "project.json"
      )

    if (
      fs.existsSync(
        manifest
      ) &&
      validProjectManifest(
        manifest
      )
    ) {
      return current
    }

    if (
      current ===
      filesystemRoot
    ) {
      break
    }

    const parent =
      path.dirname(
        current
      )

    if (
      parent === current
    ) {
      break
    }

    current = parent
  }

  return null
}

function getSessionId(
  event
) {
  const p =
    event?.properties ?? {}

  const candidates = [
    p.sessionID,
    p.sessionId,
    p.info?.id,
    p.session?.id,
  ]

  return (
    candidates.find(
      value =>
        typeof value ===
          "string" &&
        value.length > 0
    ) ?? null
  )
}

async function runWithTimeout(
  args,
  {
    stdout = "ignore",
    timeout =
      REMOTE_TIMEOUT_MS,
  } = {}
) {
  const child =
    Bun.spawn(
      args,
      {
        stdin:
          "ignore",
        stdout,
        stderr:
          "ignore",
      }
    )

  let timer

  const timeoutPromise =
    new Promise(
      (_, reject) => {
        timer =
          setTimeout(
            () => {
              try {
                child.kill()
              } catch {}

              reject(
                new Error(
                  "ToolNet command timeout"
                )
              )
            },
            timeout
          )
      }
    )

  try {
    const exitCode =
      await Promise.race([
        child.exited,
        timeoutPromise,
      ])

    if (
      typeof exitCode ===
        "number" &&
      exitCode !== 0
    ) {
      throw new Error(
        \`ToolNet exited with code \${exitCode}\`
      )
    }

    return child
  } finally {
    if (timer) {
      clearTimeout(
        timer
      )
    }
  }
}

export const ToolNetMemoryPlugin =
  async ({
    directory,
  }) => {
    /*
     * CRITICAL:
     * Never auto-create a ToolNet
     * project just because OpenCode
     * happens to start in /root,
     * /tmp, $HOME, etc.
     */
    const projectRoot =
      findProjectRoot(
        directory
      )

    if (!projectRoot) {
      writeStatus({
        active: false,
        reason:
          "no-toolnet-project",
        directory,
      })

      return {}
    }

    writeStatus({
      active: true,
      projectRoot,
      state:
        "plugin-loaded",
    })

    let lastSessionId =
      null

    /*
     * Two independent lanes:
     *
     * captureChain:
     *   OpenCode DB -> local fsync WAL -> current work
     *
     * remoteInFlight:
     *   WAL -> Hugging Face / S3
     *
     * A slow remote backend must never block local capture.
     */
    let captureChain =
      Promise.resolve()

    let remoteInFlight =
      null

    let debounceTimer =
      null

    let contextCache = {
      value: "",
      expiresAt: 0,
    }

    /*
     * Compact startup context is injected once
     * per native OpenCode session.
     *
     * Deep history is retrieved through
     * memory_agent_ask / MCP on demand.
     */
    const injectedSessions =
      new Set()

    function contextSessionKey(
      input
    ) {
      const candidates = [
        input?.sessionID,
        input?.sessionId,
        input?.session?.id,
        input?.info?.id,
        lastSessionId,
      ]

      const sessionId =
        candidates.find(
          value =>
            typeof value ===
              "string" &&
            value.length > 0
        )

      return sessionId
        ? "session:" +
            sessionId
        : "project:" +
            projectRoot
    }

    async function readContext() {
      const now =
        Date.now()

      if (
        contextCache.value &&
        now <
          contextCache.expiresAt
      ) {
        return (
          contextCache.value
        )
      }

      try {
        const child =
          Bun.spawn(
            [
              TOOLNET_BINARY,
              "context:print",
              "--project",
              projectRoot,
              "--tokens",
              String(
                CONTEXT_MAX_TOKENS
              ),
            ],
            {
              stdin:
                "ignore",
              stdout:
                "pipe",
              stderr:
                "ignore",
            }
          )

        const textPromise =
          new Response(
            child.stdout
          ).text()

        const exitCode =
          await child.exited

        if (
          exitCode !== 0
        ) {
          return ""
        }

        const text =
          (
            await textPromise
          ).trim()

        contextCache = {
          value: text,
          expiresAt:
            now +
            CONTEXT_CACHE_MS,
        }

        return text
      } catch {
        return ""
      }
    }

    async function syncNow(
      sessionId,
      {
        flag = null,
        reason = "unknown",
        localOnly = false,
        timeout =
          REMOTE_TIMEOUT_MS,
      } = {}
    ) {
      if (!sessionId) {
        return
      }

      const args = [
        TOOLNET_BINARY,
        "session:opencode-sync",
        sessionId,
        "--project",
        projectRoot,
      ]

      if (flag) {
        args.push(
          flag
        )
      }

      if (localOnly) {
        args.push(
          "--local-only"
        )
      }

      try {
        await runWithTimeout(
          args,
          {
            timeout,
          }
        )

        writeStatus({
          active: true,
          projectRoot,
          sessionId,
          reason,
          mode:
            localOnly
              ? "local"
              : "remote",
          state:
            localOnly
              ? "capture-success"
              : "sync-success",
        })
      } catch (error) {
        writeStatus({
          active: true,
          projectRoot,
          sessionId,
          reason,
          mode:
            localOnly
              ? "local"
              : "remote",
          state:
            localOnly
              ? "capture-failed"
              : "sync-failed",
          error:
            error instanceof
            Error
              ? error.message
              : String(
                  error
                ),
        })

        throw error
      }
    }

    function queueCapture(
      sessionId,
      flag,
      reason
    ) {
      if (!sessionId) {
        return captureChain
      }

      lastSessionId =
        sessionId

      /*
       * Local captures are serialized with each other,
       * but completely independent from remote sync.
       */
      captureChain =
        captureChain
          .catch(
            () =>
              undefined
          )
          .then(
            () =>
              syncNow(
                sessionId,
                {
                  flag,
                  reason,
                  localOnly: true,
                  timeout:
                    CAPTURE_TIMEOUT_MS,
                }
              )
          )
          .catch(
            () =>
              undefined
          )

      return captureChain
    }

    function queueRemote(
      sessionId,
      flag,
      reason
    ) {
      if (!sessionId) {
        return Promise.resolve()
      }

      lastSessionId =
        sessionId

      /*
       * Never build an endless remote backlog.
       * One remote flush is enough because WAL keeps
       * every pending local event until acknowledged.
       */
      if (remoteInFlight) {
        return remoteInFlight
      }

      remoteInFlight =
        syncNow(
          sessionId,
          {
            flag,
            reason,
            localOnly: false,
            timeout:
              REMOTE_TIMEOUT_MS,
          }
        )
          .catch(
            () =>
              undefined
          )
          .finally(
            () => {
              remoteInFlight =
                null
            }
          )

      return remoteInFlight
    }

    function scheduleCapture(
      sessionId,
      reason
    ) {
      if (!sessionId) {
        return
      }

      if (debounceTimer) {
        clearTimeout(
          debounceTimer
        )
      }

      debounceTimer =
        setTimeout(
          () => {
            debounceTimer =
              null

            void queueCapture(
              sessionId,
              null,
              reason
            )
          },
          EVENT_CAPTURE_DEBOUNCE_MS
        )

      if (
        typeof debounceTimer.unref ===
        "function"
      ) {
        debounceTimer.unref()
      }
    }

    /*
     * Crash-safe LOCAL checkpoint.
     *
     * Fast lane:
     * OpenCode DB -> fsync WAL -> current work.
     *
     * No network dependency.
     */
    const localPeriodic =
      setInterval(
        () => {
          if (
            lastSessionId
          ) {
            void queueCapture(
              lastSessionId,
              null,
              "periodic-local"
            )
          }
        },
        LOCAL_CAPTURE_MS
      )

    /*
     * Remote durability is deliberately slower
     * and independent from the local lane.
     */
    const remotePeriodic =
      setInterval(
        () => {
          if (
            lastSessionId
          ) {
            void queueRemote(
              lastSessionId,
              null,
              "periodic-remote"
            )
          }
        },
        REMOTE_SYNC_MS
      )

    for (
      const timer of [
        localPeriodic,
        remotePeriodic,
      ]
    ) {
      if (
        typeof timer.unref ===
        "function"
      ) {
        timer.unref()
      }
    }

    return {
      event: async ({
        event,
      }) => {
        const sessionId =
          getSessionId(
            event
          )

        if (sessionId) {
          lastSessionId =
            sessionId
        }

        const terminalEvent =
          event.type ===
            "session.idle" ||
          event.type ===
            "session.compacted" ||
          event.type ===
            "session.error"

        if (
          sessionId &&
          !terminalEvent
        ) {
          scheduleCapture(
            sessionId,
            "event:" +
              event.type
          )
        }

        if (
          event.type ===
          "session.idle"
        ) {
          await queueCapture(
            sessionId,
            "--idle",
            "session.idle:capture"
          )

          void queueRemote(
            sessionId,
            null,
            "session.idle:remote"
          )

          return
        }

        if (
          event.type ===
          "session.compacted"
        ) {
          await queueCapture(
            sessionId,
            "--compacted",
            "session.compacted:capture"
          )

          void queueRemote(
            sessionId,
            null,
            "session.compacted:remote"
          )

          contextCache = {
            value: "",
            expiresAt: 0,
          }

          return
        }

        if (
          event.type ===
          "session.error"
        ) {
          await queueCapture(
            sessionId,
            "--error",
            "session.error:capture"
          )

          void queueRemote(
            sessionId,
            null,
            "session.error:remote"
          )

          return
        }
      },

      /*
       * VERIFIED on OpenCode 1.18.14:
       * this hook fires on real model turns.
       *
       * It remains experimental, therefore
       * AGENTS.md + MCP stay as fallbacks.
       */
      "experimental.chat.system.transform":
        async (
          input,
          output
        ) => {
          const injectionKey =
            contextSessionKey(
              input
            )

          /*
           * Never inject ToolNet context on
           * every model turn.
           */
          if (
            injectedSessions.has(
              injectionKey
            )
          ) {
            return
          }

          const context =
            await readContext()

          if (!context) {
            return
          }

          if (
            Array.isArray(
              output?.system
            )
          ) {
            output.system.push(
              context
            )

            injectedSessions.add(
              injectionKey
            )

            return
          }

          if (
            typeof output?.system ===
            "string"
          ) {
            output.system =
              output.system
                ? output.system +
                    "\\n\\n" +
                    context
                : context

            injectedSessions.add(
              injectionKey
            )
          }
        },

      /*
       * Optional compaction survival hook.
       * We keep it as a supplementary path,
       * never as the only continuity path.
       */
      "experimental.session.compacting":
        async (
          _input,
          output
        ) => {
          const context =
            await readContext()

          if (
            context &&
            Array.isArray(
              output?.context
            )
          ) {
            output.context.push(
              context
            )
          }
        },

      /*
       * VERIFIED for clean OpenCode exits.
       * Best effort only: kill -9 / crash /
       * machine loss cannot guarantee this.
       */
      dispose: async () => {
        clearInterval(
          localPeriodic
        )

        clearInterval(
          remotePeriodic
        )

        if (debounceTimer) {
          clearTimeout(
            debounceTimer
          )
        }

        /*
         * On a clean exit we only REQUIRE the
         * fast local fsync checkpoint.
         *
         * Never hold OpenCode shutdown hostage
         * to a slow remote backend.
         */
        if (
          lastSessionId
        ) {
          await queueCapture(
            lastSessionId,
            "--idle",
            "dispose:capture"
          )
        }

        try {
          await captureChain
        } catch {
          // Fail open.
        }
      },
    }
  }
`;return Ft(o,n.trimStart(),{encoding:"utf8",mode:384}),o}import{existsSync as Dt,mkdirSync as on,readFileSync as rn,renameSync as nn,writeFileSync as sn}from"node:fs";import{dirname as Ht,join as cn}from"node:path";function O(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function an(e,t){on(Ht(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;sn(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),nn(o,e)}function _t(e){if(!Dt(e))return{};let t=rn(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch(r){throw new Error(`Invalid existing OpenCode opencode.json: ${r instanceof Error?r.message:String(r)}`)}if(!O(o))throw new Error("Invalid existing OpenCode opencode.json: root must be a JSON object.");return o}function $t(e,t){if(!O(e))return!1;let o=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(o)&&o.length===2&&o[0]===t&&o[1]==="mcp"}function ln(e,t){let o=e.mcpServers;if(!O(o)||!Object.prototype.hasOwnProperty.call(o,t))return{root:e,changed:!1};let r={...o};return delete r[t],{root:{...e,mcpServers:r},changed:!0}}function Jt(e={}){let t=e.configFile??Qe(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=cn(Ht(t),"opencode.jsonc"),s=Dt(n)?n:void 0,i=_t(t),c=ln(i,r),a=c.root,l=a.mcp;if(l!==void 0&&!O(l))throw new Error("Invalid existing OpenCode config: mcp must be an object.");let u=O(l)?{...l}:{},p=u[r];if($t(p,o)&&!c.changed)return{installed:!0,changed:!1,configFile:t,serverName:r,command:[o,"mcp"],preservedJsonc:s};u[r]={type:"local",command:[o,"mcp"],enabled:!0};let d={...a,mcp:u};an(t,d);let C=_t(t);if(!O(C.mcp)||!$t(C.mcp[r],o))throw new Error("OpenCode MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:[o,"mcp"],preservedJsonc:s}}import{existsSync as un,mkdirSync as Lt,readFileSync as pn,writeFileSync as Gt}from"node:fs";import{homedir as Kt}from"node:os";import{dirname as Bt,join as Ce}from"node:path";function dn(e){let t=[],o=/"((?:\\.|[^"\\])*)"|'([^']*)'/g,r;for(;r=o.exec(e);){let n=r[1]??r[2]??"";try{t.push(r[1]!==void 0?JSON.parse(`"${n}"`):n)}catch{t.push(n)}}return t}function Ut(e={}){let t=e.configFile??Ce(process.env.CODEX_HOME??Ce(Kt(),".codex"),"config.toml"),o=e.previousFile??Ce(Kt(),".config","toolnet-memory","codex-notify-previous.json");Lt(Bt(t),{recursive:!0}),Lt(Bt(o),{recursive:!0});let r=un(t)?pn(t,"utf8"):"",n=e.binary??"toolnet-memory",s=`notify = [${JSON.stringify(n)}, "session:codex-notify"]`,i=r.split(`
`),c=i.findIndex(d=>/^\s*\[/.test(d));c<0&&(c=i.length);let a=-1,l=-1;for(let d=0;d<c;d+=1)if(/^\s*notify\s*=/.test(i[d])){if(a=d,l=d,i[d].includes("[")&&!i[d].includes("]"))for(;l+1<c&&(l+=1,!i[l].includes("]")););break}let u=[];if(a>=0){let d=i.slice(a,l+1).join(`
`);u=dn(d),i.splice(a,l-a+1,s)}else c=i.findIndex(d=>/^\s*\[/.test(d)),c<0&&(c=i.length),i.splice(c,0,s);let p=u.length>=2&&u[u.length-1]==="session:codex-notify";return u.length>0&&!p&&Gt(o,JSON.stringify(u,null,2)+`
`,{encoding:"utf8",mode:384}),r=i.join(`
`),r.endsWith(`
`)||(r+=`
`),Gt(t,r,{encoding:"utf8",mode:384}),{configFile:t,previousFile:o,preservedPrevious:u.length>0&&!p}}import{existsSync as gn,mkdirSync as fn,readFileSync as mn,writeFileSync as yn}from"node:fs";import{homedir as hn}from"node:os";import{dirname as kn,join as Yt}from"node:path";function bn(e){return`'${e.replace(/'/g,"'\\''")}'`}function Wt(e={}){let t=e.hooksFile??Yt(process.env.CODEX_HOME??Yt(hn(),".codex"),"hooks.json");fn(kn(t),{recursive:!0});let o={};if(gn(t))try{o=JSON.parse(mn(t,"utf8"))}catch(c){throw new Error(`Invalid existing Codex hooks.json: ${c instanceof Error?c.message:String(c)}`)}let r=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=r;let s=(Array.isArray(r.SessionStart)?r.SessionStart:[]).filter(c=>{try{return!JSON.stringify(c).includes("session:codex-context")}catch{return!0}}),i=e.binary??"toolnet-memory";return s.push({matcher:"startup|resume|clear|compact",hooks:[{type:"command",command:`${bn(i)} session:codex-context`,timeout:15,additionalContextLimit:1e3,statusMessage:"Loading ToolNet project continuity"}]}),r.SessionStart=s,yn(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),t}import{spawnSync as vn}from"node:child_process";function we(e,t){return vn(e,t,{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}function zt(e,t){let o=we(e,["mcp","get",t,"--json"]);if(o.status!==0||!o.stdout)return null;try{return JSON.parse(o.stdout)}catch{return null}}function qt(e,t){return e.enabled!==!1&&e.transport?.type==="stdio"&&e.transport?.command===t&&Array.isArray(e.transport?.args)&&e.transport?.args.length===1&&e.transport.args[0]==="mcp"}function Vt(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.codexBinary??"codex",r=e.serverName??"toolnet-memory",n=zt(o,r);if(n&&qt(n,t))return{installed:!0,changed:!1,serverName:r,command:t,args:["mcp"]};if(n){let c=we(o,["mcp","remove",r]);if(c.status!==0)return{installed:!1,changed:!1,serverName:r,command:t,args:["mcp"],error:(c.stderr||c.stdout||"Unable to remove old ToolNet MCP configuration.").trim()}}let s=we(o,["mcp","add",r,"--",t,"mcp"]);if(s.status!==0)return{installed:!1,changed:!1,serverName:r,command:t,args:["mcp"],error:(s.stderr||s.stdout||"Unable to register ToolNet MCP.").trim()};let i=zt(o,r);return!i||!qt(i,t)?{installed:!1,changed:!0,serverName:r,command:t,args:["mcp"],error:"Codex accepted MCP registration but verification did not match expected ToolNet command."}:{installed:!0,changed:!0,serverName:r,command:t,args:["mcp"]}}import{existsSync as Sn,mkdirSync as Cn,readFileSync as wn,renameSync as jn,rmSync as In,writeFileSync as On}from"node:fs";import{dirname as xn}from"node:path";function _(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Rn(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function En(e){if(!Sn(e))return{};let t;try{t=JSON.parse(wn(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude settings.json: ${o instanceof Error?o.message:String(o)}`)}if(!_(t))throw new Error("Invalid existing Claude settings.json: root must be a JSON object.");return t}function je(e){if(e===void 0)return[];if(!Array.isArray(e))throw new Error("Invalid existing Claude settings.json: hook event must be an array.");let t=[];for(let o of e){if(!_(o)){t.push(o);continue}let r=o.hooks;if(!Array.isArray(r)){t.push(o);continue}let n=r.filter(s=>{if(!_(s))return!0;let i=s.command;return!(typeof i=="string"&&i.includes("session:claude-hook"))});n.length!==0&&t.push({...o,hooks:n})}return t}function Ie(e){return{type:"command",command:e,timeout:10}}function Mn(e,t){Cn(xn(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{On(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),jn(o,e)}finally{In(o,{force:!0})}}function Xt(e={}){let t=e.settingsFile??ot(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=En(t),n=r.hooks;if(n!==void 0&&!_(n))throw new Error("Invalid existing Claude settings.json: hooks must be an object.");let s=_(n)?{...n}:{},i=`${Rn(o)} session:claude-hook`,c=je(s.SessionStart);c.push({matcher:"startup|resume|clear|compact",hooks:[Ie(i)]}),s.SessionStart=c;let a=je(s.PostToolUse);a.push({matcher:"Edit|Write",hooks:[Ie(i)]}),s.PostToolUse=a;let l=je(s.Stop);l.push({hooks:[Ie(i)]}),s.Stop=l;let u={...r,hooks:s},p=JSON.stringify(r),d=JSON.stringify(u);return p===d?{settingsFile:t,changed:!1}:(Mn(t,u),{settingsFile:t,changed:!0})}import{existsSync as Tn,mkdirSync as An,readFileSync as Pn,renameSync as Fn,rmSync as Nn,writeFileSync as _n}from"node:fs";import{dirname as $n}from"node:path";function $(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Qt(e){if(!Tn(e))return{};let t;try{t=JSON.parse(Pn(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude Code config: ${o instanceof Error?o.message:String(o)}`)}if(!$(t))throw new Error("Invalid existing Claude Code config: root must be a JSON object.");return t}function Zt(e,t){if(!$(e))return!1;let o=e.args;return e.type==="stdio"&&e.command===t&&Array.isArray(o)&&o.length===1&&o[0]==="mcp"}function Dn(e,t){An($n(e),{recursive:!0});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{_n(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Fn(o,e)}finally{Nn(o,{force:!0})}}function eo(e={}){let t=e.stateFile??rt(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=Qt(t),s=n.mcpServers;if(s!==void 0&&!$(s))throw new Error("Invalid existing Claude Code config: mcpServers must be an object.");let i=$(s)?{...s}:{},c=i[r];if(Zt(c,o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:[o,"mcp"],repaired:!1};let a=c!==void 0;i[r]={type:"stdio",command:o,args:["mcp"]},Dn(t,{...n,mcpServers:i});let u=Qt(t).mcpServers;if(!$(u)||!Zt(u[r],o))throw new Error("Claude Code MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:[o,"mcp"],repaired:a}}function to(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=Xt({binary:t,settingsFile:e.settingsFile}),r=eo({binary:t,stateFile:e.stateFile});return{hooks:o,mcp:r,files:[o.settingsFile,r.configFile]}}import{existsSync as Hn,mkdirSync as Jn,readFileSync as Ln,renameSync as Gn,rmSync as Kn,writeFileSync as Bn}from"node:fs";import{dirname as Un}from"node:path";var x="ToolNet Memory - ";function no(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Yn(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function oo(e){if(!Hn(e))return{};let t=Ln(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch(r){throw new Error(`Invalid existing Kiro hooks file: ${r instanceof Error?r.message:String(r)}`)}if(!no(o))throw new Error("Invalid existing Kiro hooks file: root must be a JSON object.");return o}function ro(e){return no(e)?typeof e.name=="string"&&e.name.startsWith(x):!1}function D(e){return{type:"command",command:e}}function Wn(e){return[{name:`${x}Session Start`,description:"Inject compact local ToolNet continuity and capture Kiro session activation.",trigger:"SessionStart",action:D(e),timeout:10,enabled:!0},{name:`${x}Prompt Continuity`,description:"Capture prompts and refresh ToolNet guidance only for resume/continue requests.",trigger:"UserPromptSubmit",action:D(e),timeout:10,enabled:!0},{name:`${x}Raw History Guard`,description:"Prevent Kiro from reconstructing continuity from raw ToolNet/agent session history.",trigger:"PreToolUse",matcher:"*",action:D(e),timeout:10,enabled:!0},{name:`${x}Tool Capture`,description:"Capture durable tool activity while filtering noisy read-only events.",trigger:"PostToolUse",matcher:"*",action:D(e),timeout:15,enabled:!0},{name:`${x}Final Flush`,description:"Flush pending Kiro WAL events when the assistant finishes a turn.",trigger:"Stop",action:D(e),timeout:30,enabled:!0}]}function zn(e,t){Jn(Un(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Bn(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Gn(o,e)}finally{Kn(o,{force:!0})}}function io(e={}){let t=e.hooksFile??it(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=oo(t);if(r.version!==void 0&&r.version!=="v1")throw new Error(`Unsupported existing Kiro hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!Array.isArray(n))throw new Error("Invalid existing Kiro hooks file: hooks must be an array.");let s=Array.isArray(n)?n.filter(u=>!ro(u)):[],i=`${Yn(o)} session:kiro-hook`,c=Wn(i),a={...r,version:"v1",hooks:[...s,...c]};if(JSON.stringify(r)===JSON.stringify(a))return{hooksFile:t,changed:!1,hookCount:c.length};zn(t,a);let l=oo(t);if(l.version!=="v1"||!Array.isArray(l.hooks)||l.hooks.filter(ro).length!==c.length)throw new Error("Kiro hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:c.length}}import{existsSync as qn,mkdirSync as Vn,readFileSync as Xn,renameSync as Qn,rmSync as Zn,writeFileSync as ei}from"node:fs";import{dirname as ti}from"node:path";function H(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function so(e){if(!qn(e))return{};let t=Xn(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch(r){throw new Error(`Invalid existing Kiro MCP config: ${r instanceof Error?r.message:String(r)}`)}if(!H(o))throw new Error("Invalid existing Kiro MCP config: root must be a JSON object.");return o}function co(e,t){return H(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&e.disabled===!1:!1}function oi(e,t){Vn(ti(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{ei(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Qn(o,e)}finally{Zn(o,{force:!0})}}function ao(e={}){let t=e.configFile??nt(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=so(t),s=n.mcpServers;if(s!==void 0&&!H(s))throw new Error("Invalid existing Kiro MCP config: mcpServers must be an object.");let i=H(s)?{...s}:{},c=i[r];if(co(c,o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};i[r]={command:o,args:["mcp"],disabled:!1};let a={...n,mcpServers:i};oi(t,a);let u=so(t).mcpServers;if(!H(u)||!co(u[r],o))throw new Error("Kiro MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}function lo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=ao({binary:t,configFile:e.configFile}),r=io({binary:t,hooksFile:e.hooksFile});return{installed:o.installed,changed:o.changed||r.changed,mcp:o,hooks:r,files:[o.configFile,r.hooksFile]}}import{existsSync as ri,mkdirSync as ni,readFileSync as ii,renameSync as si,rmSync as ci,writeFileSync as ai}from"node:fs";import{dirname as li}from"node:path";function g(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function b(e,t){if(!ri(e))return{};let o=ii(e,"utf8").trim();if(!o)return{};let r;try{r=JSON.parse(o)}catch(n){throw new Error(`Invalid existing ${t} hooks file: ${n instanceof Error?n.message:String(n)}`)}if(!g(r))throw new Error(`Invalid existing ${t} hooks file: root must be a JSON object.`);return r}function R(e,t){ni(li(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{ai(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),si(o,e)}finally{ci(o,{force:!0})}}function Oe(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}var J=[["sessionStart",10],["beforeSubmitPrompt",10],["preToolUse",10],["postToolUse",15],["afterAgentResponse",15],["stop",30]];function uo(e){return g(e)&&typeof e.command=="string"&&e.command.includes("session:cursor-hook")}function ui(e,t,o){let n={type:"command",command:`TOOLNET_HOOK_EVENT=${Oe(e)} ${Oe(t)} session:cursor-hook`,timeout:o};return e==="preToolUse"&&(n.matcher=".*"),n}function xe(e={}){let t=e.hooksFile??V(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=b(t,"Cursor");if(r.version!==void 0&&r.version!==1)throw new Error(`Unsupported existing Cursor hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!g(n))throw new Error("Invalid existing Cursor hooks file: hooks must be an object.");let s=g(n)?{...n}:{};for(let[l,u]of J){let p=s[l];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing Cursor hooks file: hooks.${l} must be an array.`);let d=Array.isArray(p)?p.filter(C=>!uo(C)):[];s[l]=[...d,ui(l,o,u)]}let i={...r,version:1,hooks:s};if(JSON.stringify(r)===JSON.stringify(i))return{hooksFile:t,changed:!1,hookCount:J.length};R(t,i);let c=b(t,"Cursor");if(c.version!==1||!g(c.hooks))throw new Error("Cursor hooks were written but verification failed.");let a=0;for(let[l]of J){let u=c.hooks[l];if(!Array.isArray(u))throw new Error("Cursor hooks were written but verification failed.");a+=u.filter(uo).length}if(a!==J.length)throw new Error("Cursor hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:J.length}}import{existsSync as pi,mkdirSync as di,readFileSync as gi,renameSync as fi,rmSync as mi,writeFileSync as yi}from"node:fs";import{dirname as hi}from"node:path";function y(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function E(e,t){if(!pi(e))return{};let o=gi(e,"utf8").trim();if(!o)return{};let r;try{r=JSON.parse(o)}catch(n){throw new Error(`Invalid existing ${t} MCP config: ${n instanceof Error?n.message:String(n)}`)}if(!y(r))throw new Error(`Invalid existing ${t} MCP config: root must be a JSON object.`);return r}function ie(e,t){di(hi(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{yi(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),fi(o,e)}finally{mi(o,{force:!0})}}function po(e,t){return y(e)?(e.type===void 0||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function Re(e={}){let t=e.configFile??q(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=E(t,"Cursor"),s=n.mcpServers;if(s!==void 0&&!y(s))throw new Error("Invalid existing Cursor MCP config: mcpServers must be an object.");let i=y(s)?{...s}:{};if(po(i[r],o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};i[r]={type:"stdio",command:o,args:["mcp"]},ie(t,{...n,mcpServers:i});let a=E(t,"Cursor").mcpServers;if(!y(a)||!po(a[r],o))throw new Error("Cursor MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}import{mkdirSync as ki,readFileSync as go,renameSync as bi,rmSync as vi,writeFileSync as Si}from"node:fs";import{dirname as Ci}from"node:path";var Ee=`---
description: ToolNet Memory project continuity and safety rules
alwaysApply: true
---

# ToolNet Memory

Use ToolNet Memory as the continuity source for this project.

- When the user asks to continue, resume, pick up, finish unfinished work,
  or asks where work stopped, use ToolNet continuity before reconstructing
  context from old chat/session history.
- Use the ToolNet MCP server and \`memory_agent_ask\` when fast project context
  is missing, stale, or ambiguous.
- Prefer \`mode="local"\` for current task, current file, blockers, TODOs,
  completed work, and next action.
- Use \`mode="ai"\` only when synthesis is actually required.
- Do not reconstruct continuity by reading:
  - \`.toolnet/sessions/**\`
  - ToolNet raw \`events.jsonl\`
  - ToolNet raw \`state.json\`
  - another coding agent's private transcript/history files.
- After continuity is recovered, verify current repository source and git
  state before changing code.
- Do not ask the user to repeat project context that ToolNet already provides.

Current repository evidence overrides stale memory.
`;function wi(e,t){ki(Ci(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Si(o,t,{encoding:"utf8",mode:384}),bi(o,e)}finally{vi(o,{force:!0})}}function fo(e){let t=e.ruleFile??lt(e.projectRoot);try{if(go(t,"utf8")===Ee)return{ruleFile:t,changed:!1}}catch{}if(wi(t,Ee),go(t,"utf8")!==Ee)throw new Error("Cursor ToolNet project rule was written but verification failed.");return{ruleFile:t,changed:!0}}import{spawnSync as ji}from"node:child_process";import{existsSync as M,statSync as Ii}from"node:fs";import{dirname as Oi,join as xi,parse as Ri,resolve as Te}from"node:path";function mo(e){let t=Te(e);if(!M(t))throw new Error(`Project path does not exist: ${t}`);if(!Ii(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);return t}function se(e){return xi(e,".toolnet","project.json")}function Ei(e){let t=Te(e),o=Ri(t).root;for(;;){if(M(se(t)))return t;if(t===o)return;let r=Oi(t);if(r===t)return;t=r}}function Me(e){let t=ji("git",["rev-parse","--show-toplevel"],{cwd:e,encoding:"utf8",timeout:5e3});if(t.status!==0)return;let o=t.stdout.trim();return o?Te(o):void 0}function v(e={}){let t=mo(e.cwd??process.cwd());if(e.project){let n=mo(e.project),s=se(n),i=Me(n);return{root:n,source:"explicit",eligible:!0,toolnetProject:M(s),manifestFile:M(s)?s:void 0,gitRoot:i}}let o=Ei(t);if(o){let n=se(o);return{root:o,source:"toolnet",eligible:!0,toolnetProject:!0,manifestFile:n,gitRoot:Me(o)}}let r=Me(t);if(r){let n=se(r);return{root:r,source:"git",eligible:!0,toolnetProject:M(n),manifestFile:M(n)?n:void 0,gitRoot:r}}return{root:t,source:"cwd",eligible:!1,toolnetProject:!1}}function bo(e,t={}){let o=[],r=e.indexOf("--scope");if(r>=0){let s=e[r+1];if(s!=="global"&&s!=="project"&&s!=="both")throw new Error(`Invalid --scope value: ${String(s)}`);o.push(s)}e.includes("--global")&&o.push("global"),e.includes("--both")&&o.push("both");let n=Array.from(new Set(o));if(n.length>1)throw new Error(`Conflicting integration scopes: ${n.join(", ")}`);return n[0]??t.defaultScope??"global"}function yo(e,t){return{install:e,effective:t}}function S(e,t){return{surface:e,global:yo(t.globalInstall,t.effective==="global"||t.effective==="both"),project:yo(t.projectInstall,t.effective==="project"||t.effective==="both"),effective:t.effective,risk:t.risk??"none",dedupeRequired:t.dedupeRequired??!1,trustRequired:t.trustRequired??t.projectInstall,note:t.note}}function Mi(e){return{mcp:S("mcp",{globalInstall:!0,projectInstall:!1,effective:"global"}),hooks:S("hooks",{globalInstall:!0,projectInstall:!1,effective:"global"}),work:S("work",{globalInstall:e==="grok",projectInstall:!1,effective:e==="grok"?"global":"none",note:e==="grok"?"Grok supports a global ToolNet continuity skill.":"Cursor/Copilot work instructions remain project-scoped."})}}function ho(e){return{mcp:S("mcp",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),hooks:S("hooks",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),work:S("work",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!1,note:e==="cursor"?"Use .cursor/rules/toolnet-memory.mdc.":e==="copilot"?"Use .github/instructions/toolnet-memory.instructions.md.":"Use .grok/skills/toolnet-continuity/SKILL.md."})}}function ko(e){return{mcp:S("mcp",{globalInstall:!0,projectInstall:!0,effective:"project",risk:e==="cursor"?"precedence-unverified":"shadowed-global",trustRequired:!0,note:e==="cursor"?"Project ToolNet MCP is the intended effective definition; native same-name precedence must be E2E certified before release.":"Global remains useful outside the project; same-name project definition wins inside the project."}),hooks:S("hooks",{globalInstall:!0,projectInstall:!0,effective:"both",risk:"additive-duplicate",dedupeRequired:!0,trustRequired:!0,note:"Global and project hook sources can both execute for the same native event."}),work:S("work",{globalInstall:e==="grok",projectInstall:!0,effective:"project",risk:e==="grok"?"shadowed-global":"none",trustRequired:!1,note:e==="cursor"?"Project rule is authoritative.":e==="copilot"?"Project instruction is authoritative.":"Project skill shadows the same-name global skill inside the project."})}}function T(e){let{agent:t,scope:o,project:r}=e;return(o==="project"||o==="both")&&(!r||!r.eligible)?{agent:t,requestedScope:o,project:r,surfaces:o==="both"?ko(t):ho(t),canInstall:!1,reason:"Project scope requires an explicit project, existing ToolNet project, or Git repository root."}:{agent:t,requestedScope:o,project:r,surfaces:o==="global"?Mi(t):o==="project"?ho(t):ko(t),canInstall:!0}}function vo(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.rule?.changed)}function So(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:v({project:e.projectRoot}),n=T({agent:"cursor",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Cursor project integration scope cannot be resolved.");let s,i;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(s={},n.surfaces.mcp.global.install&&(s.mcp=Re({binary:t,configFile:e.configFile??q()})),n.surfaces.hooks.global.install&&(s.hooks=xe({binary:t,hooksFile:e.hooksFile??V()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Cursor project integration requires an eligible project root.");i={},n.surfaces.mcp.project.install&&(i.mcp=Re({binary:t,configFile:e.projectConfigFile??ct(r.root)})),n.surfaces.hooks.project.install&&(i.hooks=xe({binary:t,hooksFile:e.projectHooksFile??at(r.root)})),n.surfaces.work.project.install&&(i.rule=fo({projectRoot:r.root,ruleFile:e.projectRuleFile}))}let c=i?.mcp??s?.mcp,a=i?.hooks??s?.hooks;if(!c||!a)throw new Error("Cursor integration did not produce an effective MCP/hooks installation.");let l=Array.from(new Set([s?.mcp?.configFile,s?.hooks?.hooksFile,s?.rule?.ruleFile,i?.mcp?.configFile,i?.hooks?.hooksFile,i?.rule?.ruleFile].filter(u=>typeof u=="string")));return{installed:!0,changed:vo(s)||vo(i),scope:o,plan:n,project:r,global:s,projectScope:i,mcp:c,hooks:a,rule:i?.rule,files:l}}var L=[["sessionStart",10],["userPromptSubmitted",10],["userPromptTransformed",10],["preToolUse",10],["postToolUse",15],["agentStop",30]];function Ti(e){if(typeof e.command=="string")return e.command;if(typeof e.bash=="string")return e.bash}function Co(e){return g(e)&&Ti(e)?.includes("session:copilot-hook")===!0}function Ai(e,t,o){let r={type:"command",command:`${t} session:copilot-hook`,env:{TOOLNET_HOOK_EVENT:e},timeoutSec:o};return e==="preToolUse"&&(r.matcher=".*"),r}function Ae(e={}){let t=e.hooksFile??Q(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=b(t,"GitHub Copilot CLI");if(r.version!==void 0&&r.version!==1)throw new Error(`Unsupported existing GitHub Copilot CLI hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!g(n))throw new Error("Invalid existing GitHub Copilot CLI hooks file: hooks must be an object.");let s=g(n)?{...n}:{};for(let[l,u]of L){let p=s[l];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing GitHub Copilot CLI hooks file: hooks.${l} must be an array.`);let d=Array.isArray(p)?p.filter(C=>!Co(C)):[];s[l]=[...d,Ai(l,o,u)]}let i={...r,version:1,hooks:s};if(JSON.stringify(r)===JSON.stringify(i))return{hooksFile:t,changed:!1,hookCount:L.length};R(t,i);let c=b(t,"GitHub Copilot CLI");if(c.version!==1||!g(c.hooks))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");let a=0;for(let[l]of L){let u=c.hooks[l];if(!Array.isArray(u))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");a+=u.filter(Co).length}if(a!==L.length)throw new Error("GitHub Copilot CLI hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:L.length}}function wo(e,t){return y(e)?(e.type===void 0||e.type==="local"||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&Array.isArray(e.tools)&&e.tools.length===1&&e.tools[0]==="*":!1}function Pe(e={}){let t=e.configFile??X(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=E(t,"GitHub Copilot CLI"),s=n.mcpServers;if(s!==void 0&&!y(s))throw new Error("Invalid existing GitHub Copilot CLI MCP config: mcpServers must be an object.");let i=y(s)?{...s}:{};if(wo(i[r],o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};i[r]={type:"stdio",command:o,args:["mcp"],tools:["*"]},ie(t,{...n,mcpServers:i});let a=E(t,"GitHub Copilot CLI").mcpServers;if(!y(a)||!wo(a[r],o))throw new Error("GitHub Copilot CLI MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}import{mkdirSync as Pi,readFileSync as jo,renameSync as Fi,rmSync as Ni,writeFileSync as _i}from"node:fs";import{dirname as $i}from"node:path";var Fe=`---
applyTo: "**"
---

# ToolNet Memory project continuity

Use ToolNet Memory as the continuity source for this repository.

- When the user asks to continue, resume, pick up, finish unfinished work,
  or asks where work stopped, recover ToolNet continuity before reconstructing
  state from chat/session history.
- Use the ToolNet MCP server and \`memory_agent_ask\` when fast project context
  is missing, stale, or ambiguous.
- Prefer \`mode="local"\` for current task, current file, blockers, TODOs,
  completed work, and next action.
- Use \`mode="ai"\` only when continuity needs synthesis.
- Do not reconstruct continuity by reading:
  - \`.toolnet/sessions/**\`
  - ToolNet raw \`events.jsonl\`
  - ToolNet raw \`state.json\`
  - another coding agent's private transcript/history files.
- After continuity is recovered, verify current repository source and git
  state before changing code.
- Do not ask the user to repeat context ToolNet already provides.

Current repository evidence overrides stale memory.
`;function Di(e,t){Pi($i(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{_i(o,t,{encoding:"utf8",mode:384}),Fi(o,e)}finally{Ni(o,{force:!0})}}function Io(e){let t=e.instructionFile??gt(e.projectRoot);try{if(jo(t,"utf8")===Fe)return{instructionFile:t,changed:!1}}catch{}if(Di(t,Fe),jo(t,"utf8")!==Fe)throw new Error("Copilot ToolNet project instruction verification failed.");return{instructionFile:t,changed:!0}}function Oo(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.instruction?.changed)}function xo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:v({project:e.projectRoot}),n=T({agent:"copilot",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Copilot project integration scope cannot be resolved.");let s,i;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(s={},n.surfaces.mcp.global.install&&(s.mcp=Pe({binary:t,configFile:e.configFile??X()})),n.surfaces.hooks.global.install&&(s.hooks=Ae({binary:t,hooksFile:e.hooksFile??Q()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Copilot project integration requires an eligible project root.");i={},n.surfaces.mcp.project.install&&(i.mcp=Pe({binary:t,configFile:e.projectConfigFile??pt(r.root)})),n.surfaces.hooks.project.install&&(i.hooks=Ae({binary:t,hooksFile:e.projectHooksFile??dt(r.root)})),n.surfaces.work.project.install&&(i.instruction=Io({projectRoot:r.root,instructionFile:e.projectInstructionFile}))}let c=i?.mcp??s?.mcp,a=i?.hooks??s?.hooks;if(!c||!a)throw new Error("Copilot integration did not produce effective MCP/hooks.");let l=Array.from(new Set([s?.mcp?.configFile,s?.hooks?.hooksFile,s?.instruction?.instructionFile,i?.mcp?.configFile,i?.hooks?.hooksFile,i?.instruction?.instructionFile].filter(u=>typeof u=="string")));return{installed:!0,changed:Oo(s)||Oo(i),scope:o,plan:n,project:r,global:s,projectScope:i,mcp:c,hooks:a,instruction:i?.instruction,files:l}}import{existsSync as Hi,mkdirSync as Ji,readFileSync as Ro,renameSync as Li,rmSync as Gi,writeFileSync as Ki}from"node:fs";import{dirname as Bi}from"node:path";var Ne=`---
name: toolnet-continuity
description: Restore previous ToolNet project work when the user asks to continue, resume, pick up, finish unfinished work, or asks where work stopped.
when-to-use: continue, resume, pick up, carry on, ti\u1EBFp t\u1EE5c, l\xE0m ti\u1EBFp, l\xE0m n\u1ED1t, \u0111ang l\xE0m \u0111\u1EBFn \u0111\xE2u, d\u1EEBng \u1EDF \u0111\xE2u
---

# ToolNet Continuity

When the user asks to continue or resume previous work:

1. Use the ToolNet Memory MCP server as the continuity source.
2. Invoke \`memory_agent_ask\` before exploring old history if the current
   ToolNet handoff is missing, stale, or ambiguous.
3. Prefer \`mode="local"\` for current task, last file, blocker, completed
   work, TODOs, and next action.
4. Use \`mode="ai"\` only when continuity requires synthesis.
5. Do not reconstruct previous work from:
   - \`.toolnet/sessions/**\`
   - ToolNet \`events.jsonl\` or \`state.json\`
   - raw transcripts
   - another coding agent's private session/history files
6. After ToolNet continuity is known, verify current git and repository
   source truth before changing code.
7. Do not ask the user to repeat context ToolNet already provides.

Current repository evidence overrides stale memory.
`;function Ui(e,t){Ji(Bi(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Ki(o,t,{encoding:"utf8",mode:384}),Li(o,e)}finally{Gi(o,{force:!0})}}function _e(e={}){let t=e.skillFile??oe();if(Hi(t)&&Ro(t,"utf8")===Ne)return{skillFile:t,changed:!1};if(Ui(t,Ne),Ro(t,"utf8")!==Ne)throw new Error("Grok ToolNet continuity skill was written but verification failed.");return{skillFile:t,changed:!0}}var G=[["SessionStart",10],["UserPromptSubmit",10],["PreToolUse",10],["PostToolUse",15],["Stop",30]];function Eo(e){return!g(e)||!Array.isArray(e.hooks)?!1:e.hooks.some(t=>g(t)&&typeof t.command=="string"&&t.command.includes("session:grok-hook"))}function Yi(e,t,o){let r={hooks:[{type:"command",command:`${t} session:grok-hook`,timeout:o,env:{TOOLNET_HOOK_EVENT:e}}]};return e==="PreToolUse"&&(r.matcher=".*"),r}function $e(e={}){let t=e.hooksFile??te(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=b(t,"Grok Build"),n=r.hooks;if(n!==void 0&&!g(n))throw new Error("Invalid existing Grok Build hooks file: hooks must be an object.");let s=g(n)?{...n}:{};for(let[l,u]of G){let p=s[l];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing Grok Build hooks file: hooks.${l} must be an array.`);let d=Array.isArray(p)?p.filter(C=>!Eo(C)):[];s[l]=[...d,Yi(l,o,u)]}let i={...r,hooks:s};if(JSON.stringify(r)===JSON.stringify(i))return{hooksFile:t,changed:!1,hookCount:G.length};R(t,i);let c=b(t,"Grok Build");if(!g(c.hooks))throw new Error("Grok Build hooks were written but verification failed.");let a=0;for(let[l]of G){let u=c.hooks[l];if(!Array.isArray(u))throw new Error("Grok Build hooks were written but verification failed.");a+=u.filter(Eo).length}if(a!==G.length)throw new Error("Grok Build hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:G.length}}import{existsSync as Wi,mkdirSync as zi,readFileSync as qi,renameSync as Vi,rmSync as Xi,writeFileSync as Qi}from"node:fs";import{dirname as Zi}from"node:path";function Mo(e){return Wi(e)?qi(e,"utf8"):""}function es(e,t){zi(Zi(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Qi(o,t,{encoding:"utf8",mode:384}),Vi(o,e)}finally{Xi(o,{force:!0})}}function De(e){return e.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t")}function ts(e){return`[mcp_servers."${De(e)}"]`}function os(e,t){return[ts(e),`command = "${De(t)}"`,'args = ["mcp"]',"enabled = true"].join(`
`)}function rs(e){let t=e.trim();return t.startsWith("[")&&t.includes("]")}function ce(e){return e.trim().replace(/\s+/g,"")}function ns(e){return new Set([ce(`[mcp_servers.${e}]`),ce(`[mcp_servers."${e}"]`),ce(`[mcp_servers.'${e}']`)])}function Ao(e,t){let o=e.split(/\r?\n/),r=ns(t),n=-1;for(let u=0;u<o.length;u+=1){let p=ce(o[u].replace(/\s+#.*$/,""));if(r.has(p)){n=u;break}}if(n<0)return null;let s=o.length;for(let u=n+1;u<o.length;u+=1)if(rs(o[u])){s=u;break}let i=[],c=0;for(let u of o)i.push(c),c+=u.length+1;let a=i[n]??0,l=s>=o.length?e.length:i[s]??e.length;return{start:a,end:l}}function is(e,t,o){let r=`${os(t,o)}
`,n=Ao(e,t);if(n){let s=e.slice(0,n.start),i=e.slice(n.end);return`${s}${r}${i.replace(/^\n+/,"")}`}return e.trim()?`${e.replace(/\s*$/,"")}

${r}`:r}function To(e,t,o){let r=Ao(e,t);if(!r)return!1;let n=e.slice(r.start,r.end);return n.includes(`command = "${De(o)}"`)&&/args\s*=\s*\[\s*"mcp"\s*\]/.test(n)&&/enabled\s*=\s*true/.test(n)}function He(e={}){let t=e.configFile??ee(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=Mo(t);if(To(n,r,o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};let s=is(n,r,o);es(t,s);let i=Mo(t);if(!To(i,r,o))throw new Error("Grok Build MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}function Po(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.skill?.changed)}function Fo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:v({project:e.projectRoot}),n=T({agent:"grok",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Grok project integration scope cannot be resolved.");let s,i;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(s={},n.surfaces.mcp.global.install&&(s.mcp=He({binary:t,configFile:e.configFile??ee()})),n.surfaces.hooks.global.install&&(s.hooks=$e({binary:t,hooksFile:e.hooksFile??te()})),n.surfaces.work.global.install&&(s.skill=_e({skillFile:e.skillFile??oe()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Grok project integration requires an eligible project root.");i={},n.surfaces.mcp.project.install&&(i.mcp=He({binary:t,configFile:e.projectConfigFile??mt(r.root)})),n.surfaces.hooks.project.install&&(i.hooks=$e({binary:t,hooksFile:e.projectHooksFile??yt(r.root)})),n.surfaces.work.project.install&&(i.skill=_e({skillFile:e.projectSkillFile??ht(r.root)}))}let c=i?.mcp??s?.mcp,a=i?.hooks??s?.hooks,l=i?.skill??s?.skill;if(!c||!a||!l)throw new Error("Grok integration did not produce effective MCP/hooks/skill.");let u=Array.from(new Set([s?.mcp?.configFile,s?.hooks?.hooksFile,s?.skill?.skillFile,i?.mcp?.configFile,i?.hooks?.hooksFile,i?.skill?.skillFile].filter(p=>typeof p=="string")));return{installed:!0,changed:Po(s)||Po(i),scope:o,plan:n,project:r,global:s,projectScope:i,mcp:c,hooks:a,skill:l,files:u}}function No(e={}){if(e.scope==="global")return{scope:"global",automatic:!1,reason:"explicit-global"};if(e.scope==="project"||e.scope==="both"){let o=v({cwd:e.cwd,project:e.projectRoot});if(!o.eligible)throw new Error(`Explicit ${e.scope} integration requires an explicit project, ToolNet project, or Git repository root.`);return{scope:e.scope,automatic:!1,project:o,reason:e.scope==="project"?"explicit-project":"explicit-both"}}let t=v({cwd:e.cwd,project:e.projectRoot});return t.toolnetProject?{scope:"both",automatic:!0,project:t,reason:"toolnet-project"}:{scope:"global",automatic:!0,reason:"no-toolnet-project"}}function _o(){return vt()}function Je(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[],r=e.detections??_o(),n=new Map(r.map(i=>[i.agent,i.detected])),s=No({scope:e.scope,projectRoot:e.projectRoot,cwd:e.cwd});if(!(e.force===!0||n.get("agy")===!0))o.push({agent:"agy",detected:!1,installed:!1,targets:[]});else try{let c=Mt({binary:t});o.push({agent:"agy",detected:!0,installed:!0,targets:c.files})}catch(c){o.push({agent:"agy",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("opencode")===!0))o.push({agent:"opencode",detected:!1,installed:!1,targets:[]});else try{let c=Nt({binary:t}),a=Jt({binary:t});o.push({agent:"opencode",detected:!0,installed:!0,targets:[c,a.configFile,`mcp:${a.serverName}`]})}catch(c){o.push({agent:"opencode",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("claude")===!0))o.push({agent:"claude",detected:!1,installed:!1,targets:[]});else try{let c=to({binary:t});o.push({agent:"claude",detected:!0,installed:!0,targets:[c.hooks.settingsFile,c.mcp.configFile,`mcp:${c.mcp.serverName}`]})}catch(c){o.push({agent:"claude",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("kiro")===!0))o.push({agent:"kiro",detected:!1,installed:!1,targets:[]});else try{let c=lo({...e.kiro??{},binary:t});o.push({agent:"kiro",detected:!0,installed:!0,targets:[c.mcp.configFile,`mcp:${c.mcp.serverName}`,c.hooks.hooksFile]})}catch(c){o.push({agent:"kiro",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("cursor")===!0))o.push({agent:"cursor",detected:!1,installed:!1,targets:[]});else try{let c=e.cursor??{},a=So({...c,binary:t,scope:c.scope??s.scope,projectRoot:c.projectRoot??s.project?.root});o.push({agent:"cursor",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(c){o.push({agent:"cursor",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("copilot")===!0))o.push({agent:"copilot",detected:!1,installed:!1,targets:[]});else try{let c=e.copilot??{},a=xo({...c,binary:t,scope:c.scope??s.scope,projectRoot:c.projectRoot??s.project?.root});o.push({agent:"copilot",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(c){o.push({agent:"copilot",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("grok")===!0))o.push({agent:"grok",detected:!1,installed:!1,targets:[]});else try{let c=e.grok??{},a=Fo({...c,binary:t,scope:c.scope??s.scope,projectRoot:c.projectRoot??s.project?.root});o.push({agent:"grok",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(c){o.push({agent:"grok",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("codex")===!0))o.push({agent:"codex",detected:!1,installed:!1,targets:[]});else try{let c=Ut({binary:t}),a=Wt({binary:t}),l=Vt({binary:t});if(!l.installed)throw new Error(l.error??"Codex MCP registration failed");let u=[c.configFile,a,`mcp:${l.serverName}`];c.preservedPrevious&&u.push(c.previousFile),o.push({agent:"codex",detected:!0,installed:!0,targets:u})}catch(c){o.push({agent:"codex",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}return o}function $o(e){switch(e){case"agy":return"Agy / Antigravity";case"opencode":return"OpenCode";case"claude":return"Claude Code";case"kiro":return"Kiro CLI";case"cursor":return"Cursor CLI";case"copilot":return"GitHub Copilot CLI";case"grok":return"Grok Build";case"codex":return"Codex"}}function ss(e){console.log(""),console.log("ToolNet Memory Integration Detection"),console.log("===================================="),console.log("");for(let t of e){let o=$o(t.agent);if(!t.detected){console.log(`\u25CB ${o}: not detected`);continue}console.log(`\u2713 ${o}: detected`);for(let r of t.evidence)console.log(`  ${r}`)}console.log("")}function cs(e){console.log(""),console.log("ToolNet Memory AI Integrations"),console.log("=============================="),console.log("");for(let t of e){let o=$o(t.agent);if(!t.detected){console.log(`- ${o}: not detected`);continue}if(t.installed){let r=t.scope?` [scope=${t.scope}]`:"";console.log(`\u2713 ${o}: automatic memory enabled${r}`),t.projectRoot&&console.log(`  project: ${t.projectRoot}`);continue}console.log(`\u2717 ${o}: integration failed`),t.error&&console.log(`  ${t.error}`)}console.log("")}function as(e,t){let o=e.indexOf(t);return o>=0?e[o+1]:void 0}function ls(e){return e.includes("--scope")||e.includes("--global")||e.includes("--both")?bo(e):void 0}async function us(){let e=process.argv.slice(2),t=e.includes("--all"),o=e.includes("--json"),r=e.includes("--detect-only"),n=ls(e),s=as(e,"--project");if(r){let c=_o();if(o){console.log(JSON.stringify(c,null,2));return}ss(c);return}let i=Je({force:t,scope:n,projectRoot:s});if(o){console.log(JSON.stringify(i,null,2));return}cs(i)}var ps=process.argv[1]&&(process.argv[1].endsWith("auto-integrate.js")||process.argv[1].endsWith("auto-integrate.ts"));ps&&us().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});function ms(e=process.cwd()){let t=gs(e);if(!Do(t))throw new Error(`Project path does not exist: ${t}`);if(!ds(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);let o=new B().detect(t),r=fs(o.rootPath,".toolnet","project.json");if(!Do(r))throw new Error(`ToolNet project initialization failed: ${r} was not created`);return{initialized:!0,project:{id:o.id,name:o.name,remote:o.remote,rootPath:o.rootPath},manifestFile:r}}function ys(e,t){let o=e.indexOf(t);return o>=0?e[o+1]:void 0}async function hs(){let e=process.argv.slice(2),t=e.includes("--json"),o=!e.includes("--no-integrate"),r=ys(e,"--project"),n=e.find((a,l)=>!a.startsWith("-")&&(l===0||e[l-1]!=="--project")),s=r??n??process.cwd(),i=await pe("Initializing ToolNet project",()=>ms(s),{enabled:!t}),c=[];if(o&&(c=await pe("Detecting AI coding agents",()=>Je({projectRoot:i.project.rootPath}),{enabled:!t})),t){console.log(JSON.stringify({...i,integrations:c},null,2));return}if(console.log(""),console.log("ToolNet Memory"),console.log("=============="),console.log(""),console.log("\u2713 Project initialized"),console.log(""),console.log(`Project:  ${i.project.name}`),console.log(`ID:       ${i.project.id}`),console.log(`Root:     ${i.project.rootPath}`),console.log(`Manifest: ${i.manifestFile}`),console.log(""),o){console.log("AI integrations:");let a=c.filter(l=>l.detected&&l.installed);if(!a.length)console.log("  \u25CB No supported coding agent detected");else for(let l of a){let u=l.agent==="agy"?"Agy / Antigravity":l.agent==="opencode"?"OpenCode":"Codex";console.log(`  \u2713 ${u}`)}console.log("")}console.log("Next: toolnet-memory doctor"),console.log("")}var ks=process.argv[1]?.endsWith("/init.js")||process.argv[1]?.endsWith("/init.ts");ks&&hs().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});export{ms as initializeToolNetProject};
