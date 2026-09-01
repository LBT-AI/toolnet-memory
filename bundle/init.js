import{existsSync as on,statSync as Us}from"node:fs";import{resolve as Ws,join as Ys}from"node:path";import{existsSync as nn,readFileSync as rn}from"node:fs";import{homedir as sn}from"node:os";import{join as cn}from"node:path";function an(e){let t=e.trim();return t.length>=2&&t.startsWith('"')&&t.endsWith('"')?(t=t.slice(1,-1),t.replace(/\\n/g,`
`).replace(/\\r/g,"\r").replace(/\\t/g,"	").replace(/\\"/g,'"').replace(/\\\\/g,"\\")):t.length>=2&&t.startsWith("'")&&t.endsWith("'")?t.slice(1,-1):t}function ln(){let e=process.env.TOOLNET_GLOBAL_ENV??cn(sn(),".config","toolnet-memory",".env");if(!nn(e))return;let t=rn(e,"utf8");for(let o of t.split(/\r?\n/)){let n=o.trim();if(!n||n.startsWith("#"))continue;n.startsWith("export ")&&(n=n.slice(7));let r=n.indexOf("=");if(r<=0)continue;let s=n.slice(0,r).trim();/^[A-Za-z_][A-Za-z0-9_]*$/.test(s)&&process.env[s]===void 0&&(process.env[s]=an(n.slice(r+1)))}}ln();import{createHash as un}from"node:crypto";import{existsSync as ge,mkdirSync as pn,readFileSync as dn,renameSync as gn,writeFileSync as fn}from"node:fs";import{basename as mn,dirname as B,join as W,parse as tt,resolve as N}from"node:path";var ot=".toolnet",yn="project.json";function hn(e){return un("sha256").update(e).digest("hex").slice(0,16)}function fe(e){return W(e,ot,yn)}function kn(e){return ge(fe(e))}function bn(e,t){let o=N(e),n=tt(o).root;for(;;){if(kn(o))return o;if(o===n||t&&o===N(t))break;let r=B(o);if(r===o)break;o=r}return null}function Cn(e){let t=N(e),o=tt(t).root,n=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"];for(;;){if(n.some(s=>ge(W(t,s))))return t;if(t===o)break;let r=B(t);if(r===t)break;t=r}return N(e)}function wn(e){let t;try{t=JSON.parse(dn(e,"utf8"))}catch(r){throw new Error(`Invalid ToolNet project manifest: ${e}: ${r instanceof Error?r.message:String(r)}`)}if(!t||typeof t!="object")throw new Error(`Invalid ToolNet project manifest: ${e}`);let o=t;if(typeof o.id!="string"||!o.id.trim())throw new Error(`ToolNet project manifest is missing id: ${e}`);if(typeof o.name!="string"||!o.name.trim())throw new Error(`ToolNet project manifest is missing name: ${e}`);let n=new Date().toISOString();return{version:1,id:o.id,name:o.name,remote:typeof o.remote=="string"&&o.remote.trim()?o.remote:o.name,rootPath:typeof o.rootPath=="string"?o.rootPath:B(B(e)),createdAt:typeof o.createdAt=="string"?o.createdAt:n,updatedAt:typeof o.updatedAt=="string"?o.updatedAt:n,graphVersion:typeof o.graphVersion=="number"?o.graphVersion:0,memoryVersion:typeof o.memoryVersion=="number"?o.memoryVersion:0,metadata:o.metadata&&typeof o.metadata=="object"?o.metadata:void 0}}function Ze(e,t){let o=W(e,ot);pn(o,{recursive:!0});let n=fe(e),r=`${n}.tmp-${process.pid}`;fn(r,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),gn(r,n)}function et(e,t){return{id:e.id,name:e.name,remote:e.remote,rootPath:t,createdAt:e.createdAt,updatedAt:e.updatedAt,graphVersion:e.graphVersion,memoryVersion:e.memoryVersion,metadata:e.metadata}}var U=class{detect(t=process.cwd()){let o=N(t),n=Cn(o),s=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(u=>ge(W(n,u))),i=bn(o,s?n:void 0);if(i){let u=fe(i),p=wn(u);return p.rootPath!==i&&(p.rootPath=i,p.updatedAt=new Date().toISOString(),Ze(i,p)),et(p,i)}let c=new Date().toISOString(),a=mn(n),l={version:1,id:hn(n),name:a,remote:a,rootPath:n,createdAt:c,updatedAt:c,graphVersion:0,memoryVersion:0};return Ze(n,l),et(l,n)}};var nt=["\u280B","\u2819","\u2839","\u2838","\u283C","\u2834","\u2826","\u2827","\u2807","\u280F"],f={clear:"\r\x1B[2K",cyan:"\x1B[36m",green:"\x1B[32m",red:"\x1B[31m",yellow:"\x1B[33m",amber:"\x1B[38;5;214m",dim:"\x1B[2m",reset:"\x1B[0m"};function rt(e,t=16){let n=Math.max(1,t-4+1),r=e%n;return"\u2500".repeat(r)+"\u2501".repeat(4)+"\u2500".repeat(Math.max(0,t-r-4))}function it(e){let t=Date.now()-e;return t<1e3?`${t}ms`:t<1e4?`${(t/1e3).toFixed(1)}s`:`${Math.round(t/1e3)}s`}var me=class{stream;enabled;interactive;color;intervalMs;display;label;frame=0;startedAt=0;timer;active=!1;constructor(t,o={}){this.label=t,this.stream=o.stream??process.stderr,this.enabled=o.enabled??!0,this.interactive=o.interactive??this.stream.isTTY===!0,this.color=o.color??(this.interactive&&process.env.NO_COLOR===void 0),this.intervalMs=Math.max(40,o.intervalMs??80),this.display=o.display??"spinner"}start(){return!this.enabled||this.active?this:(this.active=!0,this.startedAt=Date.now(),this.interactive?(this.render(),this.timer=setInterval(()=>{this.frame=(this.frame+1)%1e4,this.render()},this.intervalMs),this.timer.unref?.(),this):(this.stream.write(`\u2192 ${this.label}
`),this))}update(t){return this.label=t,this.enabled&&this.active&&this.interactive&&this.render(),this}succeed(t){this.finish("\u2713",t??this.label,f.green)}fail(t){this.finish("\u2717",t??this.label,f.red)}warn(t){this.finish("!",t??this.label,f.yellow)}stop(){this.active&&(this.timer&&(clearInterval(this.timer),this.timer=void 0),this.enabled&&this.interactive&&this.stream.write(f.clear),this.active=!1)}render(){if(!this.enabled||!this.active||!this.interactive)return;let t=nt[this.frame%nt.length],o=this.display==="bar"?this.color?`${f.amber}${rt(this.frame)}${f.reset}`:rt(this.frame):this.color?`${f.cyan}${t}${f.reset}`:t,n=it(this.startedAt),r=this.color?`${f.dim}${n}${f.reset}`:n;this.stream.write(`${f.clear}${o} ${this.label} ${r}`)}finish(t,o,n){if(!this.enabled){this.active=!1;return}this.startedAt||(this.startedAt=Date.now()),this.timer&&(clearInterval(this.timer),this.timer=void 0);let r=it(this.startedAt),s=this.color?`${n}${t}${f.reset}`:t,i=this.color?`${f.dim}${r}${f.reset}`:r;this.interactive?this.stream.write(`${f.clear}${s} ${o} ${i}
`):this.stream.write(`${s} ${o} (${r})
`),this.active=!1}};async function ye(e,t,o={}){let n=new me(e,o).start();try{let r=await t();return n.succeed(),r}catch(r){throw n.fail(),r}}import{existsSync as Pt}from"node:fs";import{homedir as Wn}from"node:os";import{join as Yn}from"node:path";import{spawnSync as zn}from"node:child_process";import{homedir as vn}from"node:os";import{join as I}from"node:path";function st(e={}){return I(e.home??vn(),".gemini")}function ct(e={}){return I(st(e),"antigravity-cli")}function at(e={}){return I(st(e),"config")}function Y(e={}){return I(at(e),"mcp_config.json")}function z(e={}){let t=e.cwd??process.cwd();return I(t,".agents","mcp_config.json")}function V(e="toolnet-memory",t={}){return I(ct(t),"plugins",e)}function lt(e={}){return[ct(e),Y(e),at(e),z(e)]}import{homedir as ut}from"node:os";import{join as O}from"node:path";function x(e={}){let t=process.env.OPENCODE_CONFIG_DIR?.trim();if(t)return t;let o=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return o?O(o,"opencode"):O(e.home??ut(),".config","opencode")}function he(e={}){let t=process.env.OPENCODE_CONFIG?.trim();if(t)return t;let o=e.home??ut(),n=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return n?O(n,"opencode","opencode.json"):O(o,".config","opencode","opencode.json")}function ke(e={}){let t=e.cwd??process.cwd();return O(t,"opencode.json")}function pt(e={}){return O(x(e),"plugins")}function dt(e={}){return O(x(e),"AGENTS.md")}import{homedir as gt}from"node:os";import{join as be}from"node:path";function Ce(e={}){return be(e.home??gt(),".claude")}function ft(e={}){return be(Ce(e),"settings.json")}function mt(e={}){return be(e.home??gt(),".claude.json")}import{homedir as jn}from"node:os";import{join as S}from"node:path";function we(e={}){return e.kiroHome??process.env.KIRO_HOME??S(e.home??jn(),".kiro")}function On(e={}){return S(we(e),"settings")}function q(e={}){return S(On(e),"mcp.json")}function ve(e={}){let t=e.cwd??process.cwd();return S(t,".kiro","settings","mcp.json")}function Sn(e={}){return S(we(e),"hooks")}function je(e={}){return S(Sn(e),"toolnet-memory.json")}function Oe(e={}){let t=e.cwd??process.cwd();return S(t,".kiro","hooks","toolnet-memory.json")}function yt(e={}){return[we(e),q(e)]}import{homedir as In}from"node:os";import{join as Se}from"node:path";function ht(e={}){return Se(e.home??In(),".toolnetcli")}function xn(e={}){return Se(ht(e),"config.json")}function kt(e={}){let t=e.cwd??process.cwd();return Se(t,".toolnet","mcp.json")}function bt(e={}){let t=ht(e),o=xn(e);return[t,o]}import{homedir as Rn}from"node:os";import{join as Ie}from"node:path";function Ct(e={}){if(e.kiloHome)return e.kiloHome;if(process.env.KILO_HOME)return process.env.KILO_HOME;let t=e.xdgConfigHome??process.env.XDG_CONFIG_HOME;return t?Ie(t,"kilo"):Ie(e.home??Rn(),".config","kilo")}function xe(e={}){return Ie(Ct(e),"kilo.jsonc")}function wt(e={}){let t=Ct(e),o=xe(e);return[t,o]}import{homedir as Mn}from"node:os";import{join as k,resolve as En}from"node:path";function X(e={}){return e.cursorHome??k(e.home??Mn(),".cursor")}function Tn(e={}){return e.cursorConfigDir??process.env.CURSOR_CONFIG_DIR??(e.xdgConfigHome??process.env.XDG_CONFIG_HOME?k(e.xdgConfigHome??process.env.XDG_CONFIG_HOME,"cursor"):void 0)??X(e)}function Q(e={}){return k(X(e),"mcp.json")}function Z(e={}){return k(X(e),"hooks.json")}function Re(e){return k(En(e),".cursor")}function vt(e){return k(Re(e),"mcp.json")}function jt(e){return k(Re(e),"hooks.json")}function Fn(e){return k(Re(e),"rules")}function Ot(e){return k(Fn(e),"toolnet-memory.mdc")}function St(e={}){return Array.from(new Set([X(e),Tn(e)]))}import{homedir as An}from"node:os";import{join as h,resolve as Nn}from"node:path";function Me(e={}){return e.copilotHome??process.env.COPILOT_HOME??h(e.home??An(),".copilot")}function ee(e={}){return h(Me(e),"mcp-config.json")}function Pn(e={}){return h(Me(e),"hooks")}function te(e={}){return h(Pn(e),"toolnet-memory.json")}function Ee(e){return h(Nn(e),".github")}function It(e){return h(Ee(e),"mcp.json")}function _n(e){return h(Ee(e),"hooks")}function xt(e){return h(_n(e),"toolnet-memory.json")}function Dn(e){return h(Ee(e),"instructions")}function Rt(e){return h(Dn(e),"toolnet-memory.instructions.md")}function Mt(e={}){return[Me(e)]}import{homedir as $n}from"node:os";import{join as y,resolve as Hn}from"node:path";function oe(e={}){return e.grokHome??process.env.GROK_HOME??y(e.home??$n(),".grok")}function ne(e={}){return y(oe(e),"config.toml")}function Jn(e={}){return y(oe(e),"hooks")}function re(e={}){return y(Jn(e),"toolnet-memory.json")}function Ln(e={}){return y(oe(e),"skills")}function Gn(e={}){return y(Ln(e),"toolnet-continuity")}function ie(e={}){return y(Gn(e),"SKILL.md")}function Te(e){return y(Hn(e),".grok")}function Et(e){return y(Te(e),"config.toml")}function Kn(e){return y(Te(e),"hooks")}function Tt(e){return y(Kn(e),"toolnet-memory.json")}function Bn(e){return y(Te(e),"skills")}function Un(e){return y(Bn(e),"toolnet-continuity")}function Ft(e){return y(Un(e),"SKILL.md")}function At(e={}){return[oe(e)]}function Vn(e){return zn("sh",["-lc",`command -v ${JSON.stringify(e)} >/dev/null 2>&1`],{stdio:"ignore"}).status===0}function v(e){let t=e.commandExists(e.command),o=e.configPaths.filter(s=>Pt(s)),n=o.length>0,r=[];t&&r.push(`command:${e.command}`);for(let s of o)r.push(`config:${s}`);return{agent:e.agent,detected:t||n,commandDetected:t,configDetected:n,evidence:r}}function Nt(e){let t=e.commands.filter(i=>e.commandExists(i)),o=e.configPaths.filter(i=>Pt(i)),n=t.length>0,r=o.length>0,s=[...t.map(i=>`command:${i}`),...o.map(i=>`config:${i}`)];return{agent:e.agent,detected:n||r,commandDetected:n,configDetected:r,evidence:s}}function _t(e={}){let t=e.home??Wn(),o=e.commandExists??Vn,n=e.codexHome??process.env.CODEX_HOME??Yn(t,".codex");return[v({agent:"agy",command:"agy",commandExists:o,configPaths:lt({home:t})}),v({agent:"opencode",command:"opencode",commandExists:o,configPaths:[x({home:t,xdgConfigHome:e.xdgConfigHome})]}),v({agent:"claude",command:"claude",commandExists:o,configPaths:[Ce({home:t})]}),v({agent:"kiro",command:"kiro-cli",commandExists:o,configPaths:yt({home:t,kiroHome:e.kiroHome})}),Nt({agent:"cursor",commands:["agent","cursor-agent"],commandExists:o,configPaths:St({home:t,cursorHome:e.cursorHome,cursorConfigDir:e.cursorConfigDir,xdgConfigHome:e.xdgConfigHome})}),v({agent:"copilot",command:"copilot",commandExists:o,configPaths:Mt({home:t,copilotHome:e.copilotHome})}),v({agent:"grok",command:"grok",commandExists:o,configPaths:At({home:t,grokHome:e.grokHome})}),v({agent:"toolnet-cli",command:"toolnet",commandExists:o,configPaths:bt({home:t})}),Nt({agent:"kilo",commands:["kilo","kilo-code"],commandExists:o,configPaths:wt({home:t,kiloHome:e.kiloHome})}),v({agent:"codex",command:"codex",commandExists:o,configPaths:[n]})]}import{existsSync as fr,mkdirSync as Gt,readFileSync as mr,renameSync as yr,writeFileSync as hr}from"node:fs";import{dirname as kr,join as ce}from"node:path";import{existsSync as qn,mkdirSync as Xn,readFileSync as Qn,renameSync as Zn,rmSync as er,writeFileSync as tr}from"node:fs";import{dirname as or,join as nr}from"node:path";function rr(e){return`'${e.replace(/'/g,"'\\''")}'`}function ir(e){if(!qn(e))return{};let t;try{t=JSON.parse(Qn(e,"utf8"))}catch{throw new Error(`Invalid existing Agy hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Agy hooks.json at ${e}: root must be a JSON object.`);return t}function sr(e,t){Xn(or(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{tr(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Zn(o,e)}finally{er(o,{force:!0})}}function Dt(e={}){let t=e.pluginName??"toolnet-memory",o=e.hooksFile??nr(V(t),"hooks.json"),n=ir(o),r=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",s=`${rr(r)} session:agy-hook`;return n["toolnet-memory"]={enabled:!0,PreToolUse:[{matcher:"view_file|list_dir|find_by_name|grep_search|run_command",hooks:[{type:"command",command:`${s} pre-tool`,timeout:5}]}],PreInvocation:[{type:"command",command:`${s} pre`,timeout:15}],PostInvocation:[{type:"command",command:`${s} post`,timeout:15}],Stop:[{type:"command",command:`${s} stop`,timeout:30}]},sr(o,n),o}import{existsSync as cr,mkdirSync as ar,readFileSync as lr,renameSync as ur,writeFileSync as pr}from"node:fs";import{dirname as dr}from"node:path";function P(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function gr(e,t){ar(dr(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;pr(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),ur(o,e)}function $t(e){if(!cr(e))return{};let t=lr(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Agy MCP config at ${e}: parse error. Not overwriting.`)}if(!P(o))throw new Error(`Invalid existing Agy MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Ht(e,t){return P(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function se(e,t,o,n){let r=$t(e),s=r.mcpServers;if(s!==void 0&&!P(s))throw new Error(`Invalid existing Agy MCP config: mcpServers must be an object in ${e}.`);let i=P(s)?{...s}:{},c=i[o];if(Ht(c,t)&&!n)return{installed:!0,changed:!1};i[o]={command:t,args:["mcp"]};let a={...r,mcpServers:i};gr(e,a);let u=$t(e).mcpServers;if(!P(u)||!Ht(u[o],t))throw new Error(`Agy MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function Jt(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",n=e.scope??"global";if(e.configFile)return{...se(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(n==="both"){let i=Y(),c=z({cwd:e.cwd}),a=se(i,t,o,e.force??!1),l=se(c,t,o,e.force??!1);return{installed:!0,changed:a.changed||l.changed,configFile:i,serverName:o,command:t,args:["mcp"]}}let r=n==="workspace"?z({cwd:e.cwd}):Y();return{...se(r,t,o,e.force??!1),configFile:r,serverName:o,command:t,args:["mcp"]}}var br=`# ToolNet Memory Continuity

ToolNet Memory is the authoritative continuity layer for previous project work.

## Resume / continue behavior

Whenever the user asks to continue, resume, finish, pick up, return to, or complete previous work:

1. FIRST call the ToolNet Memory MCP tool \`memory_agent_ask\`.
2. Invoke \`memory_agent_ask\` with \`mode="local"\` for all continuity questions.
3. Use ToolNet's compact continuity result to determine:
   - current task
   - completed work
   - current or last file
   - TODOs
   - blockers
   - next action
4. Only AFTER continuity is known may you inspect current source or git to verify repository truth.

## Forbidden continuity recovery

Do NOT reconstruct previous work by reading, listing, searching, or shelling into:

- \`.toolnet/journal/**, .toolnet/runtime/sources/**, and legacy .toolnet/sessions/**\`
- \`state.json\`
- \`events.jsonl\`
- raw transcripts
- \`~/.gemini/antigravity-cli/brain/**\`
- Antigravity \`transcript.jsonl\`
- another coding agent's internal session history

Do NOT run Bash/cat/tail/grep against those locations to discover previous work.

Do NOT search the filesystem for the implementation or schema of \`memory_agent_ask\`.
Invoke the MCP tool directly.

Current repository evidence overrides stale memory after ToolNet has restored the working context.

Do not ask the user to repeat context already available through ToolNet Memory.
`;function Cr(e,t){Gt(kr(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;hr(o,t,{encoding:"utf8",mode:384}),yr(o,e)}function Lt(e,t){fr(e)&&mr(e,"utf8")===t||Cr(e,t)}function Kt(e={}){let t=e.pluginName??"toolnet-memory",o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.pluginRoot??V(t),r=ce(n,"plugin.json"),s=ce(n,"mcp_config.json"),i=ce(n,"hooks.json"),c=ce(n,"rules","toolnet-memory-continuity.md");return Gt(n,{recursive:!0,mode:448}),Lt(r,`${JSON.stringify({$schema:"https://antigravity.google/schemas/v1/plugin.json",name:t,description:"Persistent project continuity and memory for Antigravity coding sessions."},null,2)}
`),Jt({configFile:s,binary:o,serverName:"toolnet-memory",force:e.force}),Dt({hooksFile:i,binary:o,pluginName:t}),Lt(c,`${br.trim()}
`),{installed:!0,pluginRoot:n,files:[r,s,i,c]}}import{existsSync as vr,mkdirSync as Yt,readFileSync as jr,writeFileSync as zt}from"node:fs";import{join as Ut}from"node:path";var wr="memory_agent_ask";function Bt(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${wr}

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
`.trim()}var Wt="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",Fe="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function Or(e={}){let t=dt();Yt(x(),{recursive:!0});let o=`${Wt}
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
8. Memory Agent is local-only. No AI/LLM mode.


${Bt()}

${Fe}`,n=vr(t)?jr(t,"utf8"):"",r=n.indexOf(Wt),s=n.indexOf(Fe);return r>=0&&s>=r?n=n.slice(0,r)+o+n.slice(s+Fe.length):(n=n.trimEnd(),n&&(n+=`

`),n+=o),zt(t,n.trimEnd()+`
`,{encoding:"utf8",mode:384}),t}function Vt(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[];o.push(Or({cwd:e.cwd}));let n=e.scope??"global",r=[];if((n==="global"||n==="both")&&r.push(e.directory??pt()),n==="project"||n==="both"){let s=e.cwd??process.cwd();r.push(Ut(s,".opencode","plugins"))}for(let s of r){Yt(s,{recursive:!0});let i=Ut(s,"toolnet-memory.js"),c=`
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
  ${JSON.stringify(t)}

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

    if (parent === current) {
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

        /*
         * session.idle = execution idle, NOT permanent session end.
         * Sessions can be resumed with --continue, /sessions, /resume.
         */
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

        /*
         * session.idle: local flush only.
         * No --idle flag (dispose bug fix).
         */
        if (
          event.type ===
          "session.idle"
        ) {
          await queueCapture(
            sessionId,
            null,
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

        /*
         * session.deleted: do NOT run normal DB sync.
         * The session data may already be purged.
         */
        if (
          event.type ===
          "session.deleted"
        ) {
          return
        }
      },

      /*
       * VERIFIED on OpenCode 1.18.14:
       * this hook fires on real model turns.
       *
       * It remains experimental, therefore
       * AGENTS.md + MCP stay as fallbacks.
       *
       * FIX: Merge ToolNet context into existing system entry.
       * Do NOT push a new system message.
       * Mutation must be IN-PLACE.
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

          /*
           * In-place merge into existing system array.
           * Do NOT create a second system message.
           */
          if (
            Array.isArray(
              output?.system
            )
          ) {
            if (
              output.system.length === 0
            ) {
              output.system.push(
                context
              )
            } else {
              output.system[output.system.length - 1] =
                output.system[output.system.length - 1] +
                "

" +
                context
            }

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
                    "

" +
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
       *
       * output.context.push() is the official API.
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
       *
       * FIX: dispose only does local flush.
       * No --idle flag. Only actual session.idle
       * event sets idle state.
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
         *
         * No --idle flag: only actual session.idle
         * event marks session as idle.
         */
        if (
          lastSessionId
        ) {
          await queueCapture(
            lastSessionId,
            null,
            "dispose:local-flush"
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
`;zt(i,c.trimStart(),{encoding:"utf8",mode:384}),o.push(i)}return o}import{existsSync as Qt,mkdirSync as Sr,readFileSync as Ir,renameSync as xr,writeFileSync as Rr}from"node:fs";import{dirname as Zt,join as Mr}from"node:path";function _(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Er(e,t){Sr(Zt(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;Rr(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),xr(o,e)}function qt(e){if(!Qt(e))return{};let t=Ir(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing OpenCode config at ${e}: parse error. Not overwriting.`)}if(!_(o))throw new Error(`Invalid existing OpenCode config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Xt(e,t){if(!_(e))return!1;let o=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(o)&&o.length===2&&o[0]===t&&o[1]==="mcp"}function ae(e,t,o,n){let r=Mr(Zt(e),"opencode.jsonc"),s=Qt(r)?r:void 0,i=qt(e),c=i.mcp;if(c!==void 0&&!_(c))throw new Error(`Invalid existing OpenCode config: mcp must be an object in ${e}.`);let a=_(c)?{...c}:{},l=a[o];if(Xt(l,t)&&!n)return{installed:!0,changed:!1,preservedJsonc:s};a[o]={type:"local",command:[t,"mcp"],enabled:!0};let u={...i,mcp:a};Er(e,u);let p=qt(e);if(!_(p.mcp)||!Xt(p.mcp[o],t))throw new Error(`OpenCode MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0,preservedJsonc:s}}function eo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",n=e.scope??"global";if(e.configFile)return{...ae(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:[t,"mcp"]};if(n==="both"){let i=he(),c=ke({cwd:e.cwd}),a=ae(i,t,o,e.force??!1),l=ae(c,t,o,e.force??!1);return{installed:!0,changed:a.changed||l.changed,configFile:i,serverName:o,command:[t,"mcp"],preservedJsonc:a.preservedJsonc??l.preservedJsonc}}let r=n==="project"?ke({cwd:e.cwd}):he();return{...ae(r,t,o,e.force??!1),configFile:r,serverName:o,command:[t,"mcp"]}}import{existsSync as Tr,mkdirSync as to,readFileSync as Fr,writeFileSync as oo}from"node:fs";import{homedir as no}from"node:os";import{dirname as ro,join as Ae}from"node:path";function Ar(e){let t=[],o=/"((?:\\.|[^"\\])*)"|'([^']*)'/g,n;for(;n=o.exec(e);){let r=n[1]??n[2]??"";try{t.push(n[1]!==void 0?JSON.parse(`"${r}"`):r)}catch{t.push(r)}}return t}function io(e={}){let t=e.configFile??Ae(process.env.CODEX_HOME??Ae(no(),".codex"),"config.toml"),o=e.previousFile??Ae(no(),".config","toolnet-memory","codex-notify-previous.json");to(ro(t),{recursive:!0}),to(ro(o),{recursive:!0});let n=Tr(t)?Fr(t,"utf8"):"",r=e.binary??"toolnet-memory",s=`notify = [${JSON.stringify(r)}, "session:codex-notify"]`,i=n.split(`
`),c=i.findIndex(d=>/^\s*\[/.test(d));c<0&&(c=i.length);let a=-1,l=-1;for(let d=0;d<c;d+=1)if(/^\s*notify\s*=/.test(i[d])){if(a=d,l=d,i[d].includes("[")&&!i[d].includes("]"))for(;l+1<c&&(l+=1,!i[l].includes("]")););break}let u=[];if(a>=0){let d=i.slice(a,l+1).join(`
`);u=Ar(d),i.splice(a,l-a+1,s)}else c=i.findIndex(d=>/^\s*\[/.test(d)),c<0&&(c=i.length),i.splice(c,0,s);let p=u.length>=2&&u[u.length-1]==="session:codex-notify";return u.length>0&&!p&&oo(o,JSON.stringify(u,null,2)+`
`,{encoding:"utf8",mode:384}),n=i.join(`
`),n.endsWith(`
`)||(n+=`
`),oo(t,n,{encoding:"utf8",mode:384}),{configFile:t,previousFile:o,preservedPrevious:u.length>0&&!p}}import{existsSync as Nr,mkdirSync as Pr,readFileSync as _r,writeFileSync as Dr}from"node:fs";import{homedir as $r}from"node:os";import{dirname as Hr,join as so}from"node:path";function Jr(e){return`'${e.replace(/'/g,"'\\''")}'`}function co(e={}){let t=e.hooksFile??so(process.env.CODEX_HOME??so($r(),".codex"),"hooks.json");Pr(Hr(t),{recursive:!0});let o={};if(Nr(t))try{o=JSON.parse(_r(t,"utf8"))}catch(c){throw new Error(`Invalid existing Codex hooks.json: ${c instanceof Error?c.message:String(c)}`)}let n=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=n;let s=(Array.isArray(n.SessionStart)?n.SessionStart:[]).filter(c=>{try{return!JSON.stringify(c).includes("session:codex-context")}catch{return!0}}),i=e.binary??"toolnet-memory";return s.push({matcher:"startup|resume|clear|compact",hooks:[{type:"command",command:`${Jr(i)} session:codex-context`,timeout:15,additionalContextLimit:1e3,statusMessage:"Loading ToolNet project continuity"}]}),n.SessionStart=s,Dr(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),t}import{spawnSync as Lr}from"node:child_process";function Ne(e,t){return Lr(e,t,{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}function ao(e,t){let o=Ne(e,["mcp","get",t,"--json"]);if(o.status!==0||!o.stdout)return null;try{return JSON.parse(o.stdout)}catch{return null}}function lo(e,t){return e.enabled!==!1&&e.transport?.type==="stdio"&&e.transport?.command===t&&Array.isArray(e.transport?.args)&&e.transport?.args.length===1&&e.transport.args[0]==="mcp"}function uo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.codexBinary??"codex",n=e.serverName??"toolnet-memory",r=ao(o,n);if(r&&lo(r,t))return{installed:!0,changed:!1,serverName:n,command:t,args:["mcp"]};if(r){let c=Ne(o,["mcp","remove",n]);if(c.status!==0)return{installed:!1,changed:!1,serverName:n,command:t,args:["mcp"],error:(c.stderr||c.stdout||"Unable to remove old ToolNet MCP configuration.").trim()}}let s=Ne(o,["mcp","add",n,"--",t,"mcp"]);if(s.status!==0)return{installed:!1,changed:!1,serverName:n,command:t,args:["mcp"],error:(s.stderr||s.stdout||"Unable to register ToolNet MCP.").trim()};let i=ao(o,n);return!i||!lo(i,t)?{installed:!1,changed:!0,serverName:n,command:t,args:["mcp"],error:"Codex accepted MCP registration but verification did not match expected ToolNet command."}:{installed:!0,changed:!0,serverName:n,command:t,args:["mcp"]}}import{existsSync as Gr,mkdirSync as Kr,readFileSync as Br,renameSync as Ur,rmSync as Wr,writeFileSync as Yr}from"node:fs";import{dirname as zr}from"node:path";function D(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Vr(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function qr(e){if(!Gr(e))return{};let t;try{t=JSON.parse(Br(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude settings.json: ${o instanceof Error?o.message:String(o)}`)}if(!D(t))throw new Error("Invalid existing Claude settings.json: root must be a JSON object.");return t}function Pe(e){if(e===void 0)return[];if(!Array.isArray(e))throw new Error("Invalid existing Claude settings.json: hook event must be an array.");let t=[];for(let o of e){if(!D(o)){t.push(o);continue}let n=o.hooks;if(!Array.isArray(n)){t.push(o);continue}let r=n.filter(s=>{if(!D(s))return!0;let i=s.command;return!(typeof i=="string"&&i.includes("session:claude-hook"))});r.length!==0&&t.push({...o,hooks:r})}return t}function _e(e){return{type:"command",command:e,timeout:10}}function Xr(e,t){Kr(zr(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Yr(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Ur(o,e)}finally{Wr(o,{force:!0})}}function po(e={}){let t=e.settingsFile??ft(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=qr(t),r=n.hooks;if(r!==void 0&&!D(r))throw new Error("Invalid existing Claude settings.json: hooks must be an object.");let s=D(r)?{...r}:{},i=`${Vr(o)} session:claude-hook`,c=Pe(s.SessionStart);c.push({matcher:"startup|resume|clear|compact",hooks:[_e(i)]}),s.SessionStart=c;let a=Pe(s.PostToolUse);a.push({matcher:"Edit|Write",hooks:[_e(i)]}),s.PostToolUse=a;let l=Pe(s.Stop);l.push({hooks:[_e(i)]}),s.Stop=l;let u={...n,hooks:s},p=JSON.stringify(n),d=JSON.stringify(u);return p===d?{settingsFile:t,changed:!1}:(Xr(t,u),{settingsFile:t,changed:!0})}import{existsSync as Qr,mkdirSync as Zr,readFileSync as ei,renameSync as ti,rmSync as oi,writeFileSync as ni}from"node:fs";import{dirname as ri}from"node:path";function $(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function go(e){if(!Qr(e))return{};let t;try{t=JSON.parse(ei(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude Code config: ${o instanceof Error?o.message:String(o)}`)}if(!$(t))throw new Error("Invalid existing Claude Code config: root must be a JSON object.");return t}function fo(e,t){if(!$(e))return!1;let o=e.args;return e.type==="stdio"&&e.command===t&&Array.isArray(o)&&o.length===1&&o[0]==="mcp"}function ii(e,t){Zr(ri(e),{recursive:!0});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{ni(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),ti(o,e)}finally{oi(o,{force:!0})}}function mo(e={}){let t=e.stateFile??mt(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=go(t),s=r.mcpServers;if(s!==void 0&&!$(s))throw new Error("Invalid existing Claude Code config: mcpServers must be an object.");let i=$(s)?{...s}:{},c=i[n];if(fo(c,o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:[o,"mcp"],repaired:!1};let a=c!==void 0;i[n]={type:"stdio",command:o,args:["mcp"]},ii(t,{...r,mcpServers:i});let u=go(t).mcpServers;if(!$(u)||!fo(u[n],o))throw new Error("Claude Code MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:[o,"mcp"],repaired:a}}function yo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=po({binary:t,settingsFile:e.settingsFile}),n=mo({binary:t,stateFile:e.stateFile});return{hooks:o,mcp:n,files:[o.settingsFile,n.configFile]}}import{existsSync as si,mkdirSync as ci,readFileSync as ai,renameSync as li,rmSync as ui,writeFileSync as pi}from"node:fs";import{dirname as di}from"node:path";var R="ToolNet Memory - ";function bo(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function gi(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function ho(e){if(!si(e))return{};let t=ai(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro hooks file at ${e}: parse error. Not overwriting.`)}if(!bo(o))throw new Error(`Invalid existing Kiro hooks file at ${e}: root must be a JSON object. Not overwriting.`);return o}function ko(e){return bo(e)?typeof e.name=="string"&&e.name.startsWith(R):!1}function H(e){return{type:"command",command:e}}function fi(e){return[{name:`${R}Session Start`,description:"Inject compact local ToolNet continuity and capture Kiro session activation.",trigger:"SessionStart",action:H(e),timeout:10,enabled:!0},{name:`${R}Prompt Continuity`,description:"Capture prompts and refresh ToolNet guidance only for resume/continue requests.",trigger:"UserPromptSubmit",action:H(e),timeout:10,enabled:!0},{name:`${R}Raw History Guard`,description:"Prevent Kiro from reconstructing continuity from raw ToolNet/agent session history.",trigger:"PreToolUse",matcher:"*",action:H(e),timeout:10,enabled:!0},{name:`${R}Tool Capture`,description:"Capture durable tool activity while filtering noisy read-only events.",trigger:"PostToolUse",matcher:"*",action:H(e),timeout:15,enabled:!0},{name:`${R}Final Flush`,description:"Flush pending Kiro WAL events when the assistant finishes a turn.",trigger:"Stop",action:H(e),timeout:30,enabled:!0}]}function mi(e,t){ci(di(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{pi(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),li(o,e)}finally{ui(o,{force:!0})}}function le(e,t,o){let n=ho(e);if(n.version!==void 0&&n.version!=="v1")throw new Error(`Unsupported existing Kiro hooks version: ${String(n.version)}`);let r=n.hooks;if(r!==void 0&&!Array.isArray(r))throw new Error("Invalid existing Kiro hooks file: hooks must be an array.");let s=Array.isArray(r)?r.filter(l=>!ko(l)):[],i=fi(t),c={...n,version:"v1",hooks:[...s,...i]};if(!o&&JSON.stringify(n)===JSON.stringify(c))return{changed:!1,hookCount:i.length};mi(e,c);let a=ho(e);if(a.version!=="v1"||!Array.isArray(a.hooks)||a.hooks.filter(ko).length!==i.length)throw new Error("Kiro hooks were written but verification failed.");return{changed:!0,hookCount:i.length}}function Co(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=`${gi(t)} session:kiro-hook`;if(e.hooksFile){let i=le(e.hooksFile,n,e.force??!1);return{hooksFile:e.hooksFile,...i}}if(o==="both"){let i=je(),c=Oe({cwd:e.cwd}),a=le(i,n,e.force??!1),l=le(c,n,e.force??!1);return{hooksFile:i,changed:a.changed||l.changed,hookCount:a.hookCount}}let r=o==="project"?Oe({cwd:e.cwd}):je(),s=le(r,n,e.force??!1);return{hooksFile:r,...s}}import{existsSync as yi,mkdirSync as hi,readFileSync as ki,renameSync as bi,rmSync as Ci,writeFileSync as wi}from"node:fs";import{dirname as vi}from"node:path";function J(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function wo(e){if(!yi(e))return{};let t=ki(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro MCP config at ${e}: parse error. Not overwriting.`)}if(!J(o))throw new Error(`Invalid existing Kiro MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function vo(e,t){return J(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&e.disabled===!1:!1}function ji(e,t){hi(vi(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{wi(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),bi(o,e)}finally{Ci(o,{force:!0})}}function ue(e,t,o,n){let r=wo(e),s=r.mcpServers;if(s!==void 0&&!J(s))throw new Error(`Invalid existing Kiro MCP config: mcpServers must be an object in ${e}.`);let i=J(s)?{...s}:{},c=i[o];if(vo(c,t)&&!n)return{installed:!0,changed:!1};i[o]={command:t,args:["mcp"],disabled:!1};let a={...r,mcpServers:i};ji(e,a);let u=wo(e).mcpServers;if(!J(u)||!vo(u[o],t))throw new Error(`Kiro MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function jo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",n=e.scope??"global";if(e.configFile)return{...ue(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(n==="both"){let i=q(),c=ve({cwd:e.cwd}),a=ue(i,t,o,e.force??!1),l=ue(c,t,o,e.force??!1);return{installed:!0,changed:a.changed||l.changed,configFile:i,serverName:o,command:t,args:["mcp"]}}let r=n==="project"?ve({cwd:e.cwd}):q();return{...ue(r,t,o,e.force??!1),configFile:r,serverName:o,command:t,args:["mcp"]}}function Oo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=jo({binary:t,configFile:e.configFile,scope:e.scope,cwd:e.cwd,force:e.force}),n=Co({binary:t,hooksFile:e.hooksFile,scope:e.scope,cwd:e.cwd,force:e.force});return{installed:o.installed,changed:o.changed||n.changed,mcp:o,hooks:n,files:[o.configFile,n.hooksFile]}}import{existsSync as Oi,mkdirSync as Si,readFileSync as Ii,renameSync as xi,rmSync as Ri,writeFileSync as Mi}from"node:fs";import{dirname as Ei}from"node:path";function De(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Ti(e){if(!Oi(e))return{};let t=Ii(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: parse error. Not overwriting.`)}if(!De(o))throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Fi(e,t){Si(Ei(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Mi(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),xi(o,e)}finally{Ri(o,{force:!0})}}function So(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??kt({cwd:e.cwd}),n=Ti(o),r="toolnet-memory";if(De(n.mcpServers)&&n.mcpServers[r]!=null&&!e.force)return{installed:!0,changed:!1,configFile:o};let i=De(n.mcpServers)?{...n.mcpServers}:{};return i[r]={command:t,args:["mcp"]},n.mcpServers=i,Fi(o,n),{installed:!0,changed:!0,configFile:o}}function Io(e={}){let t=e.binary??"toolnet-memory",o=So({binary:t,configFile:e.configFile,force:e.force,cwd:e.cwd});return{installed:o.installed,changed:o.changed,mcp:{...o,configured:o.installed},files:[o.configFile]}}import{mkdirSync as Ji,existsSync as Li}from"node:fs";import{dirname as Gi}from"node:path";import{existsSync as Ai,mkdirSync as Ni,readFileSync as Pi,renameSync as _i,rmSync as Di,writeFileSync as $i}from"node:fs";import{dirname as Hi}from"node:path";function m(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function j(e,t){if(!Ai(e))return{};let o=Pi(e,"utf8").trim();if(!o)return{};let n;try{n=JSON.parse(o)}catch(r){throw new Error(`Invalid existing ${t} MCP config: ${r instanceof Error?r.message:String(r)}`)}if(!m(n))throw new Error(`Invalid existing ${t} MCP config: root must be a JSON object.`);return n}function M(e,t){Ni(Hi(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{$i(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),_i(o,e)}finally{Di(o,{force:!0})}}function xo(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??xe(),n=Gi(o);Li(n)||Ji(n,{recursive:!0});let r=j(o,"Kilo"),s=r.mcp;if(s!==void 0&&!m(s))throw new Error("Invalid existing Kilo config: mcp must be an object.");let i=m(s)?{...s}:{},c="toolnet-memory";return m(i[c])&&!e.force?{installed:!0,changed:!1,configFile:o,configured:!0}:(i[c]={type:"local",command:[t,"mcp"],enabled:!0,timeout:1e4},M(o,{...r,mcp:i}),{installed:!0,changed:!0,configFile:o,configured:!0})}function Ro(e={}){let t=e.binary??"toolnet-memory",o=xo({binary:t,configFile:e.configFile,force:e.force});return{installed:o.installed,changed:o.changed,mcp:o,files:[o.configFile]}}import{existsSync as Ki,mkdirSync as Bi,readFileSync as Ui,renameSync as Wi,rmSync as Yi,writeFileSync as zi}from"node:fs";import{dirname as Vi}from"node:path";function g(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function b(e,t){if(!Ki(e))return{};let o=Ui(e,"utf8").trim();if(!o)return{};let n;try{n=JSON.parse(o)}catch(r){throw new Error(`Invalid existing ${t} hooks file: ${r instanceof Error?r.message:String(r)}`)}if(!g(n))throw new Error(`Invalid existing ${t} hooks file: root must be a JSON object.`);return n}function E(e,t){Bi(Vi(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{zi(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Wi(o,e)}finally{Yi(o,{force:!0})}}function $e(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}var L=[["sessionStart",10],["beforeSubmitPrompt",10],["preToolUse",10],["postToolUse",15],["afterAgentResponse",15],["stop",30]];function Mo(e){return g(e)&&typeof e.command=="string"&&e.command.includes("session:cursor-hook")}function qi(e,t,o){let r={type:"command",command:`TOOLNET_HOOK_EVENT=${$e(e)} ${$e(t)} session:cursor-hook`,timeout:o};return e==="preToolUse"&&(r.matcher=".*"),r}function He(e={}){let t=e.hooksFile??Z(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=b(t,"Cursor");if(n.version!==void 0&&n.version!==1)throw new Error(`Unsupported existing Cursor hooks version: ${String(n.version)}`);let r=n.hooks;if(r!==void 0&&!g(r))throw new Error("Invalid existing Cursor hooks file: hooks must be an object.");let s=g(r)?{...r}:{};for(let[l,u]of L){let p=s[l];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing Cursor hooks file: hooks.${l} must be an array.`);let d=Array.isArray(p)?p.filter(A=>!Mo(A)):[];s[l]=[...d,qi(l,o,u)]}let i={...n,version:1,hooks:s};if(JSON.stringify(n)===JSON.stringify(i))return{hooksFile:t,changed:!1,hookCount:L.length};E(t,i);let c=b(t,"Cursor");if(c.version!==1||!g(c.hooks))throw new Error("Cursor hooks were written but verification failed.");let a=0;for(let[l]of L){let u=c.hooks[l];if(!Array.isArray(u))throw new Error("Cursor hooks were written but verification failed.");a+=u.filter(Mo).length}if(a!==L.length)throw new Error("Cursor hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:L.length}}function Eo(e,t){return m(e)?(e.type===void 0||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function Je(e={}){let t=e.configFile??Q(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=j(t,"Cursor"),s=r.mcpServers;if(s!==void 0&&!m(s))throw new Error("Invalid existing Cursor MCP config: mcpServers must be an object.");let i=m(s)?{...s}:{};if(Eo(i[n],o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};i[n]={type:"stdio",command:o,args:["mcp"]},M(t,{...r,mcpServers:i});let a=j(t,"Cursor").mcpServers;if(!m(a)||!Eo(a[n],o))throw new Error("Cursor MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}import{mkdirSync as Xi,readFileSync as To,renameSync as Qi,rmSync as Zi,writeFileSync as es}from"node:fs";import{dirname as ts}from"node:path";var Le=`---
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
- ToolNet Memory Agent is local-only; use \`mode="local"\` for all continuity questions.
- Do not reconstruct continuity by reading:
  - \`.toolnet/journal/**, .toolnet/runtime/sources/**, and legacy .toolnet/sessions/**\`
  - ToolNet raw \`events.jsonl\`
  - ToolNet raw \`state.json\`
  - another coding agent's private transcript/history files.
- After continuity is recovered, verify current repository source and git
  state before changing code.
- Do not ask the user to repeat project context that ToolNet already provides.

Current repository evidence overrides stale memory.
`;function os(e,t){Xi(ts(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{es(o,t,{encoding:"utf8",mode:384}),Qi(o,e)}finally{Zi(o,{force:!0})}}function Fo(e){let t=e.ruleFile??Ot(e.projectRoot);try{if(To(t,"utf8")===Le)return{ruleFile:t,changed:!1}}catch{}if(os(t,Le),To(t,"utf8")!==Le)throw new Error("Cursor ToolNet project rule was written but verification failed.");return{ruleFile:t,changed:!0}}import{spawnSync as ns}from"node:child_process";import{existsSync as T,statSync as rs}from"node:fs";import{dirname as is,join as ss,parse as cs,resolve as Ke}from"node:path";function Ao(e){let t=Ke(e);if(!T(t))throw new Error(`Project path does not exist: ${t}`);if(!rs(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);return t}function pe(e){return ss(e,".toolnet","project.json")}function as(e){let t=Ke(e),o=cs(t).root;for(;;){if(T(pe(t)))return t;if(t===o)return;let n=is(t);if(n===t)return;t=n}}function Ge(e){let t=ns("git",["rev-parse","--show-toplevel"],{cwd:e,encoding:"utf8",timeout:5e3});if(t.status!==0)return;let o=t.stdout.trim();return o?Ke(o):void 0}function C(e={}){let t=Ao(e.cwd??process.cwd());if(e.project){let r=Ao(e.project),s=pe(r),i=Ge(r);return{root:r,source:"explicit",eligible:!0,toolnetProject:T(s),manifestFile:T(s)?s:void 0,gitRoot:i}}let o=as(t);if(o){let r=pe(o);return{root:o,source:"toolnet",eligible:!0,toolnetProject:!0,manifestFile:r,gitRoot:Ge(o)}}let n=Ge(t);if(n){let r=pe(n);return{root:n,source:"git",eligible:!0,toolnetProject:T(r),manifestFile:T(r)?r:void 0,gitRoot:n}}return{root:t,source:"cwd",eligible:!1,toolnetProject:!1}}function Do(e,t={}){let o=[],n=e.indexOf("--scope");if(n>=0){let s=e[n+1];if(s!=="global"&&s!=="project"&&s!=="both")throw new Error(`Invalid --scope value: ${String(s)}`);o.push(s)}e.includes("--global")&&o.push("global"),e.includes("--both")&&o.push("both");let r=Array.from(new Set(o));if(r.length>1)throw new Error(`Conflicting integration scopes: ${r.join(", ")}`);return r[0]??t.defaultScope??"global"}function No(e,t){return{install:e,effective:t}}function w(e,t){return{surface:e,global:No(t.globalInstall,t.effective==="global"||t.effective==="both"),project:No(t.projectInstall,t.effective==="project"||t.effective==="both"),effective:t.effective,risk:t.risk??"none",dedupeRequired:t.dedupeRequired??!1,trustRequired:t.trustRequired??t.projectInstall,note:t.note}}function ls(e){return{mcp:w("mcp",{globalInstall:!0,projectInstall:!1,effective:"global"}),hooks:w("hooks",{globalInstall:!0,projectInstall:!1,effective:"global"}),work:w("work",{globalInstall:e==="grok",projectInstall:!1,effective:e==="grok"?"global":"none",note:e==="grok"?"Grok supports a global ToolNet continuity skill.":"Cursor/Copilot work instructions remain project-scoped."})}}function Po(e){return{mcp:w("mcp",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),hooks:w("hooks",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),work:w("work",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!1,note:e==="cursor"?"Use .cursor/rules/toolnet-memory.mdc.":e==="copilot"?"Use .github/instructions/toolnet-memory.instructions.md.":"Use .grok/skills/toolnet-continuity/SKILL.md."})}}function _o(e){return{mcp:w("mcp",{globalInstall:!0,projectInstall:!0,effective:"project",risk:e==="cursor"?"precedence-unverified":"shadowed-global",trustRequired:!0,note:e==="cursor"?"Project ToolNet MCP is the intended effective definition; native same-name precedence must be E2E certified before release.":"Global remains useful outside the project; same-name project definition wins inside the project."}),hooks:w("hooks",{globalInstall:!0,projectInstall:!0,effective:"both",risk:"additive-duplicate",dedupeRequired:!0,trustRequired:!0,note:"Global and project hook sources can both execute for the same native event."}),work:w("work",{globalInstall:e==="grok",projectInstall:!0,effective:"project",risk:e==="grok"?"shadowed-global":"none",trustRequired:!1,note:e==="cursor"?"Project rule is authoritative.":e==="copilot"?"Project instruction is authoritative.":"Project skill shadows the same-name global skill inside the project."})}}function F(e){let{agent:t,scope:o,project:n}=e;return(o==="project"||o==="both")&&(!n||!n.eligible)?{agent:t,requestedScope:o,project:n,surfaces:o==="both"?_o(t):Po(t),canInstall:!1,reason:"Project scope requires an explicit project, existing ToolNet project, or Git repository root."}:{agent:t,requestedScope:o,project:n,surfaces:o==="global"?ls(t):o==="project"?Po(t):_o(t),canInstall:!0}}function $o(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.rule?.changed)}function Ho(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=o==="global"?void 0:C({project:e.projectRoot}),r=F({agent:"cursor",scope:o,project:n});if(!r.canInstall)throw new Error(r.reason??"Cursor project integration scope cannot be resolved.");let s,i;if((r.surfaces.mcp.global.install||r.surfaces.hooks.global.install||r.surfaces.work.global.install)&&(s={},r.surfaces.mcp.global.install&&(s.mcp=Je({binary:t,configFile:e.configFile??Q()})),r.surfaces.hooks.global.install&&(s.hooks=He({binary:t,hooksFile:e.hooksFile??Z()}))),r.surfaces.mcp.project.install||r.surfaces.hooks.project.install||r.surfaces.work.project.install){if(!n?.eligible)throw new Error("Cursor project integration requires an eligible project root.");i={},r.surfaces.mcp.project.install&&(i.mcp=Je({binary:t,configFile:e.projectConfigFile??vt(n.root)})),r.surfaces.hooks.project.install&&(i.hooks=He({binary:t,hooksFile:e.projectHooksFile??jt(n.root)})),r.surfaces.work.project.install&&(i.rule=Fo({projectRoot:n.root,ruleFile:e.projectRuleFile}))}let c=i?.mcp??s?.mcp,a=i?.hooks??s?.hooks;if(!c||!a)throw new Error("Cursor integration did not produce an effective MCP/hooks installation.");let l=Array.from(new Set([s?.mcp?.configFile,s?.hooks?.hooksFile,s?.rule?.ruleFile,i?.mcp?.configFile,i?.hooks?.hooksFile,i?.rule?.ruleFile].filter(u=>typeof u=="string")));return{installed:!0,changed:$o(s)||$o(i),scope:o,plan:r,project:n,global:s,projectScope:i,mcp:c,hooks:a,rule:i?.rule,files:l}}var G=[["sessionStart",10],["userPromptSubmitted",10],["userPromptTransformed",10],["preToolUse",10],["postToolUse",15],["agentStop",30]];function us(e){if(typeof e.command=="string")return e.command;if(typeof e.bash=="string")return e.bash}function Jo(e){return g(e)&&us(e)?.includes("session:copilot-hook")===!0}function ps(e,t,o){let n={type:"command",command:`${t} session:copilot-hook`,env:{TOOLNET_HOOK_EVENT:e},timeoutSec:o};return e==="preToolUse"&&(n.matcher=".*"),n}function Be(e={}){let t=e.hooksFile??te(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=b(t,"GitHub Copilot CLI");if(n.version!==void 0&&n.version!==1)throw new Error(`Unsupported existing GitHub Copilot CLI hooks version: ${String(n.version)}`);let r=n.hooks;if(r!==void 0&&!g(r))throw new Error("Invalid existing GitHub Copilot CLI hooks file: hooks must be an object.");let s=g(r)?{...r}:{};for(let[l,u]of G){let p=s[l];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing GitHub Copilot CLI hooks file: hooks.${l} must be an array.`);let d=Array.isArray(p)?p.filter(A=>!Jo(A)):[];s[l]=[...d,ps(l,o,u)]}let i={...n,version:1,hooks:s};if(JSON.stringify(n)===JSON.stringify(i))return{hooksFile:t,changed:!1,hookCount:G.length};E(t,i);let c=b(t,"GitHub Copilot CLI");if(c.version!==1||!g(c.hooks))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");let a=0;for(let[l]of G){let u=c.hooks[l];if(!Array.isArray(u))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");a+=u.filter(Jo).length}if(a!==G.length)throw new Error("GitHub Copilot CLI hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:G.length}}function Lo(e,t){return m(e)?(e.type===void 0||e.type==="local"||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&Array.isArray(e.tools)&&e.tools.length===1&&e.tools[0]==="*":!1}function Ue(e={}){let t=e.configFile??ee(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=j(t,"GitHub Copilot CLI"),s=r.mcpServers;if(s!==void 0&&!m(s))throw new Error("Invalid existing GitHub Copilot CLI MCP config: mcpServers must be an object.");let i=m(s)?{...s}:{};if(Lo(i[n],o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};i[n]={type:"stdio",command:o,args:["mcp"],tools:["*"]},M(t,{...r,mcpServers:i});let a=j(t,"GitHub Copilot CLI").mcpServers;if(!m(a)||!Lo(a[n],o))throw new Error("GitHub Copilot CLI MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}import{mkdirSync as ds,readFileSync as Go,renameSync as gs,rmSync as fs,writeFileSync as ms}from"node:fs";import{dirname as ys}from"node:path";var We=`---
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
- ToolNet Memory Agent is local-only; use \`mode="local"\` for all continuity questions.
- Do not reconstruct continuity by reading:
  - \`.toolnet/journal/**, .toolnet/runtime/sources/**, and legacy .toolnet/sessions/**\`
  - ToolNet raw \`events.jsonl\`
  - ToolNet raw \`state.json\`
  - another coding agent's private transcript/history files.
- After continuity is recovered, verify current repository source and git
  state before changing code.
- Do not ask the user to repeat context ToolNet already provides.

Current repository evidence overrides stale memory.
`;function hs(e,t){ds(ys(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{ms(o,t,{encoding:"utf8",mode:384}),gs(o,e)}finally{fs(o,{force:!0})}}function Ko(e){let t=e.instructionFile??Rt(e.projectRoot);try{if(Go(t,"utf8")===We)return{instructionFile:t,changed:!1}}catch{}if(hs(t,We),Go(t,"utf8")!==We)throw new Error("Copilot ToolNet project instruction verification failed.");return{instructionFile:t,changed:!0}}function Bo(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.instruction?.changed)}function Uo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=o==="global"?void 0:C({project:e.projectRoot}),r=F({agent:"copilot",scope:o,project:n});if(!r.canInstall)throw new Error(r.reason??"Copilot project integration scope cannot be resolved.");let s,i;if((r.surfaces.mcp.global.install||r.surfaces.hooks.global.install||r.surfaces.work.global.install)&&(s={},r.surfaces.mcp.global.install&&(s.mcp=Ue({binary:t,configFile:e.configFile??ee()})),r.surfaces.hooks.global.install&&(s.hooks=Be({binary:t,hooksFile:e.hooksFile??te()}))),r.surfaces.mcp.project.install||r.surfaces.hooks.project.install||r.surfaces.work.project.install){if(!n?.eligible)throw new Error("Copilot project integration requires an eligible project root.");i={},r.surfaces.mcp.project.install&&(i.mcp=Ue({binary:t,configFile:e.projectConfigFile??It(n.root)})),r.surfaces.hooks.project.install&&(i.hooks=Be({binary:t,hooksFile:e.projectHooksFile??xt(n.root)})),r.surfaces.work.project.install&&(i.instruction=Ko({projectRoot:n.root,instructionFile:e.projectInstructionFile}))}let c=i?.mcp??s?.mcp,a=i?.hooks??s?.hooks;if(!c||!a)throw new Error("Copilot integration did not produce effective MCP/hooks.");let l=Array.from(new Set([s?.mcp?.configFile,s?.hooks?.hooksFile,s?.instruction?.instructionFile,i?.mcp?.configFile,i?.hooks?.hooksFile,i?.instruction?.instructionFile].filter(u=>typeof u=="string")));return{installed:!0,changed:Bo(s)||Bo(i),scope:o,plan:r,project:n,global:s,projectScope:i,mcp:c,hooks:a,instruction:i?.instruction,files:l}}import{existsSync as ks,mkdirSync as bs,readFileSync as Wo,renameSync as Cs,rmSync as ws,writeFileSync as vs}from"node:fs";import{dirname as js}from"node:path";var Ye=`---
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
4. ToolNet Memory Agent is local-only; use \`mode="local"\` for all continuity questions.
5. Do not reconstruct previous work from:
   - \`.toolnet/journal/**, .toolnet/runtime/sources/**, and legacy .toolnet/sessions/**\`
   - ToolNet \`events.jsonl\` or \`state.json\`
   - raw transcripts
   - another coding agent's private session/history files
6. After ToolNet continuity is known, verify current git and repository
   source truth before changing code.
7. Do not ask the user to repeat context ToolNet already provides.

Current repository evidence overrides stale memory.
`;function Os(e,t){bs(js(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{vs(o,t,{encoding:"utf8",mode:384}),Cs(o,e)}finally{ws(o,{force:!0})}}function ze(e={}){let t=e.skillFile??ie();if(ks(t)&&Wo(t,"utf8")===Ye)return{skillFile:t,changed:!1};if(Os(t,Ye),Wo(t,"utf8")!==Ye)throw new Error("Grok ToolNet continuity skill was written but verification failed.");return{skillFile:t,changed:!0}}var K=[["SessionStart",10],["UserPromptSubmit",10],["PreToolUse",10],["PostToolUse",15],["Stop",30]];function Yo(e){return!g(e)||!Array.isArray(e.hooks)?!1:e.hooks.some(t=>g(t)&&typeof t.command=="string"&&t.command.includes("session:grok-hook"))}function Ss(e,t,o){let n={hooks:[{type:"command",command:`${t} session:grok-hook`,timeout:o,env:{TOOLNET_HOOK_EVENT:e}}]};return e==="PreToolUse"&&(n.matcher=".*"),n}function Ve(e={}){let t=e.hooksFile??re(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=b(t,"Grok Build"),r=n.hooks;if(r!==void 0&&!g(r))throw new Error("Invalid existing Grok Build hooks file: hooks must be an object.");let s=g(r)?{...r}:{};for(let[l,u]of K){let p=s[l];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing Grok Build hooks file: hooks.${l} must be an array.`);let d=Array.isArray(p)?p.filter(A=>!Yo(A)):[];s[l]=[...d,Ss(l,o,u)]}let i={...n,hooks:s};if(JSON.stringify(n)===JSON.stringify(i))return{hooksFile:t,changed:!1,hookCount:K.length};E(t,i);let c=b(t,"Grok Build");if(!g(c.hooks))throw new Error("Grok Build hooks were written but verification failed.");let a=0;for(let[l]of K){let u=c.hooks[l];if(!Array.isArray(u))throw new Error("Grok Build hooks were written but verification failed.");a+=u.filter(Yo).length}if(a!==K.length)throw new Error("Grok Build hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:K.length}}import{existsSync as Is,mkdirSync as xs,readFileSync as Rs,renameSync as Ms,rmSync as Es,writeFileSync as Ts}from"node:fs";import{dirname as Fs}from"node:path";function zo(e){return Is(e)?Rs(e,"utf8"):""}function As(e,t){xs(Fs(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Ts(o,t,{encoding:"utf8",mode:384}),Ms(o,e)}finally{Es(o,{force:!0})}}function qe(e){return e.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t")}function Ns(e){return`[mcp_servers."${qe(e)}"]`}function Ps(e,t){return[Ns(e),`command = "${qe(t)}"`,'args = ["mcp"]',"enabled = true"].join(`
`)}function _s(e){let t=e.trim();return t.startsWith("[")&&t.includes("]")}function de(e){return e.trim().replace(/\s+/g,"")}function Ds(e){return new Set([de(`[mcp_servers.${e}]`),de(`[mcp_servers."${e}"]`),de(`[mcp_servers.'${e}']`)])}function qo(e,t){let o=e.split(/\r?\n/),n=Ds(t),r=-1;for(let u=0;u<o.length;u+=1){let p=de(o[u].replace(/\s+#.*$/,""));if(n.has(p)){r=u;break}}if(r<0)return null;let s=o.length;for(let u=r+1;u<o.length;u+=1)if(_s(o[u])){s=u;break}let i=[],c=0;for(let u of o)i.push(c),c+=u.length+1;let a=i[r]??0,l=s>=o.length?e.length:i[s]??e.length;return{start:a,end:l}}function $s(e,t,o){let n=`${Ps(t,o)}
`,r=qo(e,t);if(r){let s=e.slice(0,r.start),i=e.slice(r.end);return`${s}${n}${i.replace(/^\n+/,"")}`}return e.trim()?`${e.replace(/\s*$/,"")}

${n}`:n}function Vo(e,t,o){let n=qo(e,t);if(!n)return!1;let r=e.slice(n.start,n.end);return r.includes(`command = "${qe(o)}"`)&&/args\s*=\s*\[\s*"mcp"\s*\]/.test(r)&&/enabled\s*=\s*true/.test(r)}function Xe(e={}){let t=e.configFile??ne(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=zo(t);if(Vo(r,n,o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};let s=$s(r,n,o);As(t,s);let i=zo(t);if(!Vo(i,n,o))throw new Error("Grok Build MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}function Xo(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.skill?.changed)}function Qo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=o==="global"?void 0:C({project:e.projectRoot}),r=F({agent:"grok",scope:o,project:n});if(!r.canInstall)throw new Error(r.reason??"Grok project integration scope cannot be resolved.");let s,i;if((r.surfaces.mcp.global.install||r.surfaces.hooks.global.install||r.surfaces.work.global.install)&&(s={},r.surfaces.mcp.global.install&&(s.mcp=Xe({binary:t,configFile:e.configFile??ne()})),r.surfaces.hooks.global.install&&(s.hooks=Ve({binary:t,hooksFile:e.hooksFile??re()})),r.surfaces.work.global.install&&(s.skill=ze({skillFile:e.skillFile??ie()}))),r.surfaces.mcp.project.install||r.surfaces.hooks.project.install||r.surfaces.work.project.install){if(!n?.eligible)throw new Error("Grok project integration requires an eligible project root.");i={},r.surfaces.mcp.project.install&&(i.mcp=Xe({binary:t,configFile:e.projectConfigFile??Et(n.root)})),r.surfaces.hooks.project.install&&(i.hooks=Ve({binary:t,hooksFile:e.projectHooksFile??Tt(n.root)})),r.surfaces.work.project.install&&(i.skill=ze({skillFile:e.projectSkillFile??Ft(n.root)}))}let c=i?.mcp??s?.mcp,a=i?.hooks??s?.hooks,l=i?.skill??s?.skill;if(!c||!a||!l)throw new Error("Grok integration did not produce effective MCP/hooks/skill.");let u=Array.from(new Set([s?.mcp?.configFile,s?.hooks?.hooksFile,s?.skill?.skillFile,i?.mcp?.configFile,i?.hooks?.hooksFile,i?.skill?.skillFile].filter(p=>typeof p=="string")));return{installed:!0,changed:Xo(s)||Xo(i),scope:o,plan:r,project:n,global:s,projectScope:i,mcp:c,hooks:a,skill:l,files:u}}function Zo(e={}){if(e.scope==="global")return{scope:"global",automatic:!1,reason:"explicit-global"};if(e.scope==="project"||e.scope==="both"){let o=C({cwd:e.cwd,project:e.projectRoot});if(!o.eligible)throw new Error(`Explicit ${e.scope} integration requires an explicit project, ToolNet project, or Git repository root.`);return{scope:e.scope,automatic:!1,project:o,reason:e.scope==="project"?"explicit-project":"explicit-both"}}let t=C({cwd:e.cwd,project:e.projectRoot});return t.toolnetProject?{scope:"both",automatic:!0,project:t,reason:"toolnet-project"}:{scope:"global",automatic:!0,reason:"no-toolnet-project"}}function en(){return _t()}function Qe(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[],n=e.detections??en(),r=new Map(n.map(i=>[i.agent,i.detected])),s=Zo({scope:e.scope,projectRoot:e.projectRoot,cwd:e.cwd});if(!(e.force===!0||r.get("agy")===!0))o.push({agent:"agy",detected:!1,installed:!1,targets:[]});else try{let c=Kt({binary:t});o.push({agent:"agy",detected:!0,installed:!0,targets:c.files})}catch(c){o.push({agent:"agy",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("opencode")===!0))o.push({agent:"opencode",detected:!1,installed:!1,targets:[]});else try{let c=Vt({binary:t}),a=eo({binary:t});o.push({agent:"opencode",detected:!0,installed:!0,targets:[...c,a.configFile,`mcp:${a.serverName}`]})}catch(c){o.push({agent:"opencode",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("claude")===!0))o.push({agent:"claude",detected:!1,installed:!1,targets:[]});else try{let c=yo({binary:t});o.push({agent:"claude",detected:!0,installed:!0,targets:[c.hooks.settingsFile,c.mcp.configFile,`mcp:${c.mcp.serverName}`]})}catch(c){o.push({agent:"claude",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("kiro")===!0))o.push({agent:"kiro",detected:!1,installed:!1,targets:[]});else try{let c=Oo({...e.kiro??{},binary:t});o.push({agent:"kiro",detected:!0,installed:!0,targets:[c.mcp.configFile,`mcp:${c.mcp.serverName}`,c.hooks.hooksFile]})}catch(c){o.push({agent:"kiro",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("cursor")===!0))o.push({agent:"cursor",detected:!1,installed:!1,targets:[]});else try{let c=e.cursor??{},a=Ho({...c,binary:t,scope:c.scope??s.scope,projectRoot:c.projectRoot??s.project?.root});o.push({agent:"cursor",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(c){o.push({agent:"cursor",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("copilot")===!0))o.push({agent:"copilot",detected:!1,installed:!1,targets:[]});else try{let c=e.copilot??{},a=Uo({...c,binary:t,scope:c.scope??s.scope,projectRoot:c.projectRoot??s.project?.root});o.push({agent:"copilot",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(c){o.push({agent:"copilot",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("grok")===!0))o.push({agent:"grok",detected:!1,installed:!1,targets:[]});else try{let c=e.grok??{},a=Qo({...c,binary:t,scope:c.scope??s.scope,projectRoot:c.projectRoot??s.project?.root});o.push({agent:"grok",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(c){o.push({agent:"grok",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("toolnet-cli")===!0))o.push({agent:"toolnet-cli",detected:!1,installed:!1,targets:[]});else try{let c=e.toolnetCli??{},a=Io({...c,binary:t});o.push({agent:"toolnet-cli",detected:!0,installed:!0,targets:[a.mcp.configFile]})}catch(c){o.push({agent:"toolnet-cli",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("kilo")===!0))o.push({agent:"kilo",detected:!1,installed:!1,targets:[]});else try{let c=e.kilo??{},a=Ro({...c,binary:t});o.push({agent:"kilo",detected:!0,installed:!0,targets:[a.mcp.configFile]})}catch(c){o.push({agent:"kilo",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("codex")===!0))o.push({agent:"codex",detected:!1,installed:!1,targets:[]});else try{let c=io({binary:t}),a=co({binary:t}),l=uo({binary:t});if(!l.installed)throw new Error(l.error??"Codex MCP registration failed");let u=[c.configFile,a,`mcp:${l.serverName}`];c.preservedPrevious&&u.push(c.previousFile),o.push({agent:"codex",detected:!0,installed:!0,targets:u})}catch(c){o.push({agent:"codex",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}return o}function tn(e){switch(e){case"agy":return"Agy / Antigravity";case"opencode":return"OpenCode";case"claude":return"Claude Code";case"kiro":return"Kiro CLI";case"cursor":return"Cursor CLI";case"copilot":return"GitHub Copilot CLI";case"grok":return"Grok Build";case"codex":return"Codex";default:return e}}function Hs(e){console.log(""),console.log("ToolNet Memory Integration Detection"),console.log("===================================="),console.log("");for(let t of e){let o=tn(t.agent);if(!t.detected){console.log(`\u25CB ${o}: not detected`);continue}console.log(`\u2713 ${o}: detected`);for(let n of t.evidence)console.log(`  ${n}`)}console.log("")}function Js(e){console.log(""),console.log("ToolNet Memory AI Integrations"),console.log("=============================="),console.log("");for(let t of e){let o=tn(t.agent);if(!t.detected){console.log(`- ${o}: not detected`);continue}if(t.installed){let n=t.scope?` [scope=${t.scope}]`:"";console.log(`\u2713 ${o}: automatic memory enabled${n}`),t.projectRoot&&console.log(`  project: ${t.projectRoot}`);continue}console.log(`\u2717 ${o}: integration failed`),t.error&&console.log(`  ${t.error}`)}console.log("")}function Ls(e,t){let o=e.indexOf(t);return o>=0?e[o+1]:void 0}function Gs(e){return e.includes("--scope")||e.includes("--global")||e.includes("--both")?Do(e):void 0}async function Ks(){let e=process.argv.slice(2),t=e.includes("--all"),o=e.includes("--json"),n=e.includes("--detect-only"),r=Gs(e),s=Ls(e,"--project");if(n){let c=en();if(o){console.log(JSON.stringify(c,null,2));return}Hs(c);return}let i=Qe({force:t,scope:r,projectRoot:s});if(o){console.log(JSON.stringify(i,null,2));return}Js(i)}var Bs=process.argv[1]&&(process.argv[1].endsWith("auto-integrate.js")||process.argv[1].endsWith("auto-integrate.ts"));Bs&&Ks().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});function zs(e=process.cwd()){let t=Ws(e);if(!on(t))throw new Error(`Project path does not exist: ${t}`);if(!Us(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);let o=new U().detect(t),n=Ys(o.rootPath,".toolnet","project.json");if(!on(n))throw new Error(`ToolNet project initialization failed: ${n} was not created`);return{initialized:!0,project:{id:o.id,name:o.name,remote:o.remote,rootPath:o.rootPath},manifestFile:n}}function Vs(e,t){let o=e.indexOf(t);return o>=0?e[o+1]:void 0}async function qs(){let e=process.argv.slice(2),t=e.includes("--json"),o=!e.includes("--no-integrate"),n=Vs(e,"--project"),r=e.find((a,l)=>!a.startsWith("-")&&(l===0||e[l-1]!=="--project")),s=n??r??process.cwd(),i=await ye("Initializing ToolNet project",()=>zs(s),{enabled:!t}),c=[];if(o&&(c=await ye("Detecting AI coding agents",()=>Qe({projectRoot:i.project.rootPath}),{enabled:!t})),t){console.log(JSON.stringify({...i,integrations:c},null,2));return}if(console.log(""),console.log("ToolNet Memory"),console.log("=============="),console.log(""),console.log("\u2713 Project initialized"),console.log(""),console.log(`Project:  ${i.project.name}`),console.log(`ID:       ${i.project.id}`),console.log(`Root:     ${i.project.rootPath}`),console.log(`Manifest: ${i.manifestFile}`),console.log(""),o){console.log("AI integrations:");let a=c.filter(l=>l.detected&&l.installed);if(!a.length)console.log("  \u25CB No supported coding agent detected");else for(let l of a){let u=l.agent==="agy"?"Agy / Antigravity":l.agent==="opencode"?"OpenCode":"Codex";console.log(`  \u2713 ${u}`)}console.log("")}console.log("Next: toolnet-memory doctor"),console.log("")}var Xs=process.argv[1]?.endsWith("/init.js")||process.argv[1]?.endsWith("/init.ts");Xs&&qs().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});export{zs as initializeToolNetProject};
