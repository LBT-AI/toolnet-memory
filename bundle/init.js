import{existsSync as Qo,statSync as Js}from"node:fs";import{resolve as Ls,join as Gs}from"node:path";import{existsSync as Zo,readFileSync as er}from"node:fs";import{homedir as tr}from"node:os";import{join as or}from"node:path";function rr(e){let t=e.trim();return t.length>=2&&t.startsWith('"')&&t.endsWith('"')?(t=t.slice(1,-1),t.replace(/\\n/g,`
`).replace(/\\r/g,"\r").replace(/\\t/g,"	").replace(/\\"/g,'"').replace(/\\\\/g,"\\")):t.length>=2&&t.startsWith("'")&&t.endsWith("'")?t.slice(1,-1):t}function nr(){let e=process.env.TOOLNET_GLOBAL_ENV??or(tr(),".config","toolnet-memory",".env");if(!Zo(e))return;let t=er(e,"utf8");for(let o of t.split(/\r?\n/)){let r=o.trim();if(!r||r.startsWith("#"))continue;r.startsWith("export ")&&(r=r.slice(7));let n=r.indexOf("=");if(n<=0)continue;let s=r.slice(0,n).trim();/^[A-Za-z_][A-Za-z0-9_]*$/.test(s)&&process.env[s]===void 0&&(process.env[s]=rr(r.slice(n+1)))}}nr();import{createHash as ir}from"node:crypto";import{existsSync as ae,mkdirSync as sr,readFileSync as cr,renameSync as ar,writeFileSync as lr}from"node:fs";import{basename as ur,dirname as B,join as Y,parse as qe,resolve as A}from"node:path";var Ve=".toolnet",pr="project.json";function gr(e){return ir("sha256").update(e).digest("hex").slice(0,16)}function le(e){return Y(e,Ve,pr)}function dr(e){return ae(le(e))}function fr(e,t){let o=A(e),r=qe(o).root;for(;;){if(dr(o))return o;if(o===r||t&&o===A(t))break;let n=B(o);if(n===o)break;o=n}return null}function mr(e){let t=A(e),o=qe(t).root,r=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"];for(;;){if(r.some(s=>ae(Y(t,s))))return t;if(t===o)break;let n=B(t);if(n===t)break;t=n}return A(e)}function yr(e){let t;try{t=JSON.parse(cr(e,"utf8"))}catch(n){throw new Error(`Invalid ToolNet project manifest: ${e}: ${n instanceof Error?n.message:String(n)}`)}if(!t||typeof t!="object")throw new Error(`Invalid ToolNet project manifest: ${e}`);let o=t;if(typeof o.id!="string"||!o.id.trim())throw new Error(`ToolNet project manifest is missing id: ${e}`);if(typeof o.name!="string"||!o.name.trim())throw new Error(`ToolNet project manifest is missing name: ${e}`);let r=new Date().toISOString();return{version:1,id:o.id,name:o.name,remote:typeof o.remote=="string"&&o.remote.trim()?o.remote:o.name,rootPath:typeof o.rootPath=="string"?o.rootPath:B(B(e)),createdAt:typeof o.createdAt=="string"?o.createdAt:r,updatedAt:typeof o.updatedAt=="string"?o.updatedAt:r,graphVersion:typeof o.graphVersion=="number"?o.graphVersion:0,memoryVersion:typeof o.memoryVersion=="number"?o.memoryVersion:0,metadata:o.metadata&&typeof o.metadata=="object"?o.metadata:void 0}}function We(e,t){let o=Y(e,Ve);sr(o,{recursive:!0});let r=le(e),n=`${r}.tmp-${process.pid}`;lr(n,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),ar(n,r)}function ze(e,t){return{id:e.id,name:e.name,remote:e.remote,rootPath:t,createdAt:e.createdAt,updatedAt:e.updatedAt,graphVersion:e.graphVersion,memoryVersion:e.memoryVersion,metadata:e.metadata}}var U=class{detect(t=process.cwd()){let o=A(t),r=mr(o),s=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(u=>ae(Y(r,u))),i=fr(o,s?r:void 0);if(i){let u=le(i),p=yr(u);return p.rootPath!==i&&(p.rootPath=i,p.updatedAt=new Date().toISOString(),We(i,p)),ze(p,i)}let c=new Date().toISOString(),a=ur(r),l={version:1,id:gr(r),name:a,remote:a,rootPath:r,createdAt:c,updatedAt:c,graphVersion:0,memoryVersion:0};return We(r,l),ze(l,r)}};var Xe=["\u280B","\u2819","\u2839","\u2838","\u283C","\u2834","\u2826","\u2827","\u2807","\u280F"],f={clear:"\r\x1B[2K",cyan:"\x1B[36m",green:"\x1B[32m",red:"\x1B[31m",yellow:"\x1B[33m",amber:"\x1B[38;5;214m",dim:"\x1B[2m",reset:"\x1B[0m"};function Qe(e,t=16){let r=Math.max(1,t-4+1),n=e%r;return"\u2500".repeat(n)+"\u2501".repeat(4)+"\u2500".repeat(Math.max(0,t-n-4))}function Ze(e){let t=Date.now()-e;return t<1e3?`${t}ms`:t<1e4?`${(t/1e3).toFixed(1)}s`:`${Math.round(t/1e3)}s`}var ue=class{stream;enabled;interactive;color;intervalMs;display;label;frame=0;startedAt=0;timer;active=!1;constructor(t,o={}){this.label=t,this.stream=o.stream??process.stderr,this.enabled=o.enabled??!0,this.interactive=o.interactive??this.stream.isTTY===!0,this.color=o.color??(this.interactive&&process.env.NO_COLOR===void 0),this.intervalMs=Math.max(40,o.intervalMs??80),this.display=o.display??"spinner"}start(){return!this.enabled||this.active?this:(this.active=!0,this.startedAt=Date.now(),this.interactive?(this.render(),this.timer=setInterval(()=>{this.frame=(this.frame+1)%1e4,this.render()},this.intervalMs),this.timer.unref?.(),this):(this.stream.write(`\u2192 ${this.label}
`),this))}update(t){return this.label=t,this.enabled&&this.active&&this.interactive&&this.render(),this}succeed(t){this.finish("\u2713",t??this.label,f.green)}fail(t){this.finish("\u2717",t??this.label,f.red)}warn(t){this.finish("!",t??this.label,f.yellow)}stop(){this.active&&(this.timer&&(clearInterval(this.timer),this.timer=void 0),this.enabled&&this.interactive&&this.stream.write(f.clear),this.active=!1)}render(){if(!this.enabled||!this.active||!this.interactive)return;let t=Xe[this.frame%Xe.length],o=this.display==="bar"?this.color?`${f.amber}${Qe(this.frame)}${f.reset}`:Qe(this.frame):this.color?`${f.cyan}${t}${f.reset}`:t,r=Ze(this.startedAt),n=this.color?`${f.dim}${r}${f.reset}`:r;this.stream.write(`${f.clear}${o} ${this.label} ${n}`)}finish(t,o,r){if(!this.enabled){this.active=!1;return}this.startedAt||(this.startedAt=Date.now()),this.timer&&(clearInterval(this.timer),this.timer=void 0);let n=Ze(this.startedAt),s=this.color?`${r}${t}${f.reset}`:t,i=this.color?`${f.dim}${n}${f.reset}`:n;this.interactive?this.stream.write(`${f.clear}${s} ${o} ${i}
`):this.stream.write(`${s} ${o} (${n})
`),this.active=!1}};async function pe(e,t,o={}){let r=new ue(e,o).start();try{let n=await t();return r.succeed(),n}catch(n){throw r.fail(),n}}import{existsSync as Mt}from"node:fs";import{homedir as Gr}from"node:os";import{join as Kr}from"node:path";import{spawnSync as Br}from"node:child_process";import{homedir as hr}from"node:os";import{join as w}from"node:path";function et(e={}){return w(e.home??hr(),".gemini")}function ge(e={}){return w(et(e),"config")}function W(e={}){return w(ge(e),"mcp_config.json")}function z(e={}){return w(ge(e),"hooks.json")}function tt(e={}){return w(et(e),"antigravity-cli")}function ot(e="toolnet-memory",t={}){return w(tt(t),"plugins",e)}function rt(e={}){return[tt(e),ge(e)]}import{homedir as kr}from"node:os";import{join as P}from"node:path";function j(e={}){let t=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return t?P(t,"opencode"):P(e.home??kr(),".config","opencode")}function nt(e={}){return P(j(e),"opencode.json")}function it(e={}){return P(j(e),"plugins")}function st(e={}){return P(j(e),"AGENTS.md")}import{homedir as ct}from"node:os";import{join as de}from"node:path";function fe(e={}){return de(e.home??ct(),".claude")}function at(e={}){return de(fe(e),"settings.json")}function lt(e={}){return de(e.home??ct(),".claude.json")}import{homedir as br}from"node:os";import{join as N}from"node:path";function me(e={}){return e.kiroHome??process.env.KIRO_HOME??N(e.home??br(),".kiro")}function Cr(e={}){return N(me(e),"settings")}function ut(e={}){return N(Cr(e),"mcp.json")}function vr(e={}){return N(me(e),"hooks")}function pt(e={}){return N(vr(e),"toolnet-memory.json")}function gt(e={}){return[me(e)]}import{homedir as Sr}from"node:os";import{join as ye}from"node:path";function dt(e={}){let t=e.home??Sr(),o=e.xdgConfigHome??process.env.XDG_CONFIG_HOME;return o?ye(o,"toolnet-memory"):ye(t,".config","toolnet-memory")}function he(e={}){return ye(dt(e),"mcp.json")}function ft(e={}){return[dt(e),he(e)]}import{homedir as Or}from"node:os";import{join as ke}from"node:path";function be(e={}){return e.kiloHome??process.env.KILO_HOME??ke(e.home??Or(),".kilo")}function Ir(e={}){return ke(be(e),"kilo.jsonc")}function Ce(e={}){return ke(be(e),"mcp.json")}function mt(e={}){return[be(e),Ce(e),Ir(e)]}import{homedir as jr}from"node:os";import{join as k,resolve as wr}from"node:path";function q(e={}){return e.cursorHome??k(e.home??jr(),".cursor")}function xr(e={}){return e.cursorConfigDir??process.env.CURSOR_CONFIG_DIR??(e.xdgConfigHome??process.env.XDG_CONFIG_HOME?k(e.xdgConfigHome??process.env.XDG_CONFIG_HOME,"cursor"):void 0)??q(e)}function V(e={}){return k(q(e),"mcp.json")}function X(e={}){return k(q(e),"hooks.json")}function ve(e){return k(wr(e),".cursor")}function yt(e){return k(ve(e),"mcp.json")}function ht(e){return k(ve(e),"hooks.json")}function Rr(e){return k(ve(e),"rules")}function kt(e){return k(Rr(e),"toolnet-memory.mdc")}function bt(e={}){return Array.from(new Set([q(e),xr(e)]))}import{homedir as Mr}from"node:os";import{join as h,resolve as Er}from"node:path";function Se(e={}){return e.copilotHome??process.env.COPILOT_HOME??h(e.home??Mr(),".copilot")}function Q(e={}){return h(Se(e),"mcp-config.json")}function Tr(e={}){return h(Se(e),"hooks")}function Z(e={}){return h(Tr(e),"toolnet-memory.json")}function Oe(e){return h(Er(e),".github")}function Ct(e){return h(Oe(e),"mcp.json")}function Fr(e){return h(Oe(e),"hooks")}function vt(e){return h(Fr(e),"toolnet-memory.json")}function Ar(e){return h(Oe(e),"instructions")}function St(e){return h(Ar(e),"toolnet-memory.instructions.md")}function Ot(e={}){return[Se(e)]}import{homedir as Pr}from"node:os";import{join as y,resolve as Nr}from"node:path";function ee(e={}){return e.grokHome??process.env.GROK_HOME??y(e.home??Pr(),".grok")}function te(e={}){return y(ee(e),"config.toml")}function _r(e={}){return y(ee(e),"hooks")}function oe(e={}){return y(_r(e),"toolnet-memory.json")}function Dr(e={}){return y(ee(e),"skills")}function $r(e={}){return y(Dr(e),"toolnet-continuity")}function re(e={}){return y($r(e),"SKILL.md")}function Ie(e){return y(Nr(e),".grok")}function It(e){return y(Ie(e),"config.toml")}function Hr(e){return y(Ie(e),"hooks")}function jt(e){return y(Hr(e),"toolnet-memory.json")}function Jr(e){return y(Ie(e),"skills")}function Lr(e){return y(Jr(e),"toolnet-continuity")}function wt(e){return y(Lr(e),"SKILL.md")}function xt(e={}){return[ee(e)]}function Ur(e){return Br("sh",["-lc",`command -v ${JSON.stringify(e)} >/dev/null 2>&1`],{stdio:"ignore"}).status===0}function O(e){let t=e.commandExists(e.command),o=e.configPaths.filter(s=>Mt(s)),r=o.length>0,n=[];t&&n.push(`command:${e.command}`);for(let s of o)n.push(`config:${s}`);return{agent:e.agent,detected:t||r,commandDetected:t,configDetected:r,evidence:n}}function Rt(e){let t=e.commands.filter(i=>e.commandExists(i)),o=e.configPaths.filter(i=>Mt(i)),r=t.length>0,n=o.length>0,s=[...t.map(i=>`command:${i}`),...o.map(i=>`config:${i}`)];return{agent:e.agent,detected:r||n,commandDetected:r,configDetected:n,evidence:s}}function Et(e={}){let t=e.home??Gr(),o=e.commandExists??Ur,r=e.codexHome??process.env.CODEX_HOME??Kr(t,".codex");return[O({agent:"agy",command:"agy",commandExists:o,configPaths:rt({home:t})}),O({agent:"opencode",command:"opencode",commandExists:o,configPaths:[j({home:t,xdgConfigHome:e.xdgConfigHome})]}),O({agent:"claude",command:"claude",commandExists:o,configPaths:[fe({home:t})]}),O({agent:"kiro",command:"kiro-cli",commandExists:o,configPaths:gt({home:t,kiroHome:e.kiroHome})}),Rt({agent:"cursor",commands:["agent","cursor-agent"],commandExists:o,configPaths:bt({home:t,cursorHome:e.cursorHome,cursorConfigDir:e.cursorConfigDir,xdgConfigHome:e.xdgConfigHome})}),O({agent:"copilot",command:"copilot",commandExists:o,configPaths:Ot({home:t,copilotHome:e.copilotHome})}),O({agent:"grok",command:"grok",commandExists:o,configPaths:xt({home:t,grokHome:e.grokHome})}),O({agent:"toolnet-cli",command:"toolnet-memory",commandExists:o,configPaths:ft({home:t,xdgConfigHome:e.xdgConfigHome})}),Rt({agent:"kilo",commands:["kilo","kilo-code"],commandExists:o,configPaths:mt({home:t,kiloHome:e.kiloHome})}),O({agent:"codex",command:"codex",commandExists:o,configPaths:[r]})]}import{existsSync as ie,mkdirSync as _t,readFileSync as Dt,renameSync as an,writeFileSync as ln}from"node:fs";import{dirname as un,join as ne}from"node:path";import{existsSync as Yr,mkdirSync as Wr,readFileSync as zr,renameSync as qr,rmSync as Vr,writeFileSync as Xr}from"node:fs";import{dirname as Qr}from"node:path";function Zr(e){return`'${e.replace(/'/g,"'\\''")}'`}function Tt(e={}){let t=e.hooksFile??z();Wr(Qr(t),{recursive:!0,mode:448});let o={};if(Yr(t)){let i;try{i=JSON.parse(zr(t,"utf8"))}catch(c){throw new Error(`Invalid existing Agy hooks.json: ${c instanceof Error?c.message:String(c)}`)}if(typeof i!="object"||i===null||Array.isArray(i))throw new Error("Invalid existing Agy hooks.json: root must be a JSON object.");o=i}let r=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=`${Zr(r)} session:agy-hook`;o["toolnet-memory"]={enabled:!0,PreToolUse:[{matcher:"view_file|list_dir|find_by_name|grep_search|run_command",hooks:[{type:"command",command:`${n} pre-tool`,timeout:5}]}],PreInvocation:[{type:"command",command:`${n} pre`,timeout:15}],PostInvocation:[{type:"command",command:`${n} post`,timeout:15}],Stop:[{type:"command",command:`${n} stop`,timeout:30}]};let s=`${t}.tmp-${process.pid}-${Date.now()}`;try{Xr(s,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),qr(s,t)}finally{Vr(s,{force:!0})}return t}import{existsSync as en,mkdirSync as tn,readFileSync as on,renameSync as rn,writeFileSync as nn}from"node:fs";import{dirname as sn}from"node:path";function _(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function cn(e,t){tn(sn(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;nn(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),rn(o,e)}function Ft(e){if(!en(e))return{};let t=on(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch(r){throw new Error(`Invalid existing Agy MCP config: ${r instanceof Error?r.message:String(r)}`)}if(!_(o))throw new Error("Invalid existing Agy MCP config: root must be a JSON object.");return o}function At(e,t){return _(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function Pt(e={}){let t=e.configFile??W(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=Ft(t),s=n.mcpServers;if(s!==void 0&&!_(s))throw new Error("Invalid existing Agy MCP config: mcpServers must be an object.");let i=_(s)?{...s}:{},c=i[r];if(At(c,o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};i[r]={command:o,args:["mcp"]};let a={...n,mcpServers:i};cn(t,a);let u=Ft(t).mcpServers;if(!_(u)||!At(u[r],o))throw new Error("Agy MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}var pn=`# ToolNet Memory Continuity

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
`;function $t(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function je(e,t){_t(un(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;ln(o,t,{encoding:"utf8",mode:384}),an(o,e)}function Nt(e,t){ie(e)&&Dt(e,"utf8")===t||je(e,t)}function Ht(e){if(!ie(e))return{};let t=Dt(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch(r){throw new Error(`Invalid legacy Antigravity config ${e}: ${r instanceof Error?r.message:String(r)}`)}if(!$t(o))throw new Error(`Invalid legacy Antigravity config ${e}: root must be object`);return o}function gn(e,t){if(!ie(e))return!1;let o=Ht(e);if(!$t(o.mcpServers)||!Object.prototype.hasOwnProperty.call(o.mcpServers,t))return!1;let r={...o.mcpServers};return delete r[t],je(e,`${JSON.stringify({...o,mcpServers:r},null,2)}
`),!0}function dn(e){if(!ie(e))return!1;let t=Ht(e);if(!Object.prototype.hasOwnProperty.call(t,"toolnet-memory"))return!1;let o={...t};return delete o["toolnet-memory"],je(e,`${JSON.stringify(o,null,2)}
`),!0}function Jt(e={}){let t=e.pluginName??"toolnet-memory",o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.pluginRoot??ot(t),n=ne(r,"plugin.json"),s=ne(r,"mcp_config.json"),i=ne(r,"hooks.json"),c=ne(r,"rules","toolnet-memory-continuity.md");_t(r,{recursive:!0,mode:448}),Nt(n,`${JSON.stringify({$schema:"https://antigravity.google/schemas/v1/plugin.json",name:t,description:"Persistent project continuity and memory for Antigravity coding sessions."},null,2)}
`),Pt({configFile:s,binary:o,serverName:"toolnet-memory"}),Tt({hooksFile:i,binary:o}),Nt(c,`${pn.trim()}
`);let a=e.legacyMcpFile??W(),l=e.legacyHooksFile??z(),u=[];return a!==s&&gn(a,"toolnet-memory")&&u.push(a),l!==i&&dn(l)&&u.push(l),{installed:!0,pluginRoot:r,files:[n,s,i,c],migratedLegacy:u}}import{existsSync as mn,mkdirSync as Kt,readFileSync as yn,writeFileSync as Bt}from"node:fs";import{join as hn}from"node:path";var fn="memory_agent_ask";function Lt(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${fn}

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
`.trim()}var Gt="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",we="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function kn(){let e=st();Kt(j(),{recursive:!0});let t=`${Gt}
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


${Lt()}

${we}`,o=mn(e)?yn(e,"utf8"):"",r=o.indexOf(Gt),n=o.indexOf(we);return r>=0&&n>=r?o=o.slice(0,r)+t+o.slice(n+we.length):(o=o.trimEnd(),o&&(o+=`

`),o+=t),Bt(e,o.trimEnd()+`
`,{encoding:"utf8",mode:384}),e}function Ut(e={}){let t=e.directory??it();Kt(t,{recursive:!0}),kn();let o=hn(t,"toolnet-memory.js"),r=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=`
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
`;return Bt(o,n.trimStart(),{encoding:"utf8",mode:384}),o}import{existsSync as zt,mkdirSync as bn,readFileSync as Cn,renameSync as vn,writeFileSync as Sn}from"node:fs";import{dirname as qt,join as On}from"node:path";function x(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function In(e,t){bn(qt(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;Sn(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),vn(o,e)}function Yt(e){if(!zt(e))return{};let t=Cn(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch(r){throw new Error(`Invalid existing OpenCode opencode.json: ${r instanceof Error?r.message:String(r)}`)}if(!x(o))throw new Error("Invalid existing OpenCode opencode.json: root must be a JSON object.");return o}function Wt(e,t){if(!x(e))return!1;let o=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(o)&&o.length===2&&o[0]===t&&o[1]==="mcp"}function jn(e,t){let o=e.mcpServers;if(!x(o)||!Object.prototype.hasOwnProperty.call(o,t))return{root:e,changed:!1};let r={...o};return delete r[t],{root:{...e,mcpServers:r},changed:!0}}function Vt(e={}){let t=e.configFile??nt(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=On(qt(t),"opencode.jsonc"),s=zt(n)?n:void 0,i=Yt(t),c=jn(i,r),a=c.root,l=a.mcp;if(l!==void 0&&!x(l))throw new Error("Invalid existing OpenCode config: mcp must be an object.");let u=x(l)?{...l}:{},p=u[r];if(Wt(p,o)&&!c.changed)return{installed:!0,changed:!1,configFile:t,serverName:r,command:[o,"mcp"],preservedJsonc:s};u[r]={type:"local",command:[o,"mcp"],enabled:!0};let g={...a,mcp:u};In(t,g);let S=Yt(t);if(!x(S.mcp)||!Wt(S.mcp[r],o))throw new Error("OpenCode MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:[o,"mcp"],preservedJsonc:s}}import{existsSync as wn,mkdirSync as Xt,readFileSync as xn,writeFileSync as Qt}from"node:fs";import{homedir as Zt}from"node:os";import{dirname as eo,join as xe}from"node:path";function Rn(e){let t=[],o=/"((?:\\.|[^"\\])*)"|'([^']*)'/g,r;for(;r=o.exec(e);){let n=r[1]??r[2]??"";try{t.push(r[1]!==void 0?JSON.parse(`"${n}"`):n)}catch{t.push(n)}}return t}function to(e={}){let t=e.configFile??xe(process.env.CODEX_HOME??xe(Zt(),".codex"),"config.toml"),o=e.previousFile??xe(Zt(),".config","toolnet-memory","codex-notify-previous.json");Xt(eo(t),{recursive:!0}),Xt(eo(o),{recursive:!0});let r=wn(t)?xn(t,"utf8"):"",n=e.binary??"toolnet-memory",s=`notify = [${JSON.stringify(n)}, "session:codex-notify"]`,i=r.split(`
`),c=i.findIndex(g=>/^\s*\[/.test(g));c<0&&(c=i.length);let a=-1,l=-1;for(let g=0;g<c;g+=1)if(/^\s*notify\s*=/.test(i[g])){if(a=g,l=g,i[g].includes("[")&&!i[g].includes("]"))for(;l+1<c&&(l+=1,!i[l].includes("]")););break}let u=[];if(a>=0){let g=i.slice(a,l+1).join(`
`);u=Rn(g),i.splice(a,l-a+1,s)}else c=i.findIndex(g=>/^\s*\[/.test(g)),c<0&&(c=i.length),i.splice(c,0,s);let p=u.length>=2&&u[u.length-1]==="session:codex-notify";return u.length>0&&!p&&Qt(o,JSON.stringify(u,null,2)+`
`,{encoding:"utf8",mode:384}),r=i.join(`
`),r.endsWith(`
`)||(r+=`
`),Qt(t,r,{encoding:"utf8",mode:384}),{configFile:t,previousFile:o,preservedPrevious:u.length>0&&!p}}import{existsSync as Mn,mkdirSync as En,readFileSync as Tn,writeFileSync as Fn}from"node:fs";import{homedir as An}from"node:os";import{dirname as Pn,join as oo}from"node:path";function Nn(e){return`'${e.replace(/'/g,"'\\''")}'`}function ro(e={}){let t=e.hooksFile??oo(process.env.CODEX_HOME??oo(An(),".codex"),"hooks.json");En(Pn(t),{recursive:!0});let o={};if(Mn(t))try{o=JSON.parse(Tn(t,"utf8"))}catch(c){throw new Error(`Invalid existing Codex hooks.json: ${c instanceof Error?c.message:String(c)}`)}let r=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=r;let s=(Array.isArray(r.SessionStart)?r.SessionStart:[]).filter(c=>{try{return!JSON.stringify(c).includes("session:codex-context")}catch{return!0}}),i=e.binary??"toolnet-memory";return s.push({matcher:"startup|resume|clear|compact",hooks:[{type:"command",command:`${Nn(i)} session:codex-context`,timeout:15,additionalContextLimit:1e3,statusMessage:"Loading ToolNet project continuity"}]}),r.SessionStart=s,Fn(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),t}import{spawnSync as _n}from"node:child_process";function Re(e,t){return _n(e,t,{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}function no(e,t){let o=Re(e,["mcp","get",t,"--json"]);if(o.status!==0||!o.stdout)return null;try{return JSON.parse(o.stdout)}catch{return null}}function io(e,t){return e.enabled!==!1&&e.transport?.type==="stdio"&&e.transport?.command===t&&Array.isArray(e.transport?.args)&&e.transport?.args.length===1&&e.transport.args[0]==="mcp"}function so(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.codexBinary??"codex",r=e.serverName??"toolnet-memory",n=no(o,r);if(n&&io(n,t))return{installed:!0,changed:!1,serverName:r,command:t,args:["mcp"]};if(n){let c=Re(o,["mcp","remove",r]);if(c.status!==0)return{installed:!1,changed:!1,serverName:r,command:t,args:["mcp"],error:(c.stderr||c.stdout||"Unable to remove old ToolNet MCP configuration.").trim()}}let s=Re(o,["mcp","add",r,"--",t,"mcp"]);if(s.status!==0)return{installed:!1,changed:!1,serverName:r,command:t,args:["mcp"],error:(s.stderr||s.stdout||"Unable to register ToolNet MCP.").trim()};let i=no(o,r);return!i||!io(i,t)?{installed:!1,changed:!0,serverName:r,command:t,args:["mcp"],error:"Codex accepted MCP registration but verification did not match expected ToolNet command."}:{installed:!0,changed:!0,serverName:r,command:t,args:["mcp"]}}import{existsSync as Dn,mkdirSync as $n,readFileSync as Hn,renameSync as Jn,rmSync as Ln,writeFileSync as Gn}from"node:fs";import{dirname as Kn}from"node:path";function D(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Bn(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function Un(e){if(!Dn(e))return{};let t;try{t=JSON.parse(Hn(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude settings.json: ${o instanceof Error?o.message:String(o)}`)}if(!D(t))throw new Error("Invalid existing Claude settings.json: root must be a JSON object.");return t}function Me(e){if(e===void 0)return[];if(!Array.isArray(e))throw new Error("Invalid existing Claude settings.json: hook event must be an array.");let t=[];for(let o of e){if(!D(o)){t.push(o);continue}let r=o.hooks;if(!Array.isArray(r)){t.push(o);continue}let n=r.filter(s=>{if(!D(s))return!0;let i=s.command;return!(typeof i=="string"&&i.includes("session:claude-hook"))});n.length!==0&&t.push({...o,hooks:n})}return t}function Ee(e){return{type:"command",command:e,timeout:10}}function Yn(e,t){$n(Kn(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Gn(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Jn(o,e)}finally{Ln(o,{force:!0})}}function co(e={}){let t=e.settingsFile??at(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=Un(t),n=r.hooks;if(n!==void 0&&!D(n))throw new Error("Invalid existing Claude settings.json: hooks must be an object.");let s=D(n)?{...n}:{},i=`${Bn(o)} session:claude-hook`,c=Me(s.SessionStart);c.push({matcher:"startup|resume|clear|compact",hooks:[Ee(i)]}),s.SessionStart=c;let a=Me(s.PostToolUse);a.push({matcher:"Edit|Write",hooks:[Ee(i)]}),s.PostToolUse=a;let l=Me(s.Stop);l.push({hooks:[Ee(i)]}),s.Stop=l;let u={...r,hooks:s},p=JSON.stringify(r),g=JSON.stringify(u);return p===g?{settingsFile:t,changed:!1}:(Yn(t,u),{settingsFile:t,changed:!0})}import{existsSync as Wn,mkdirSync as zn,readFileSync as qn,renameSync as Vn,rmSync as Xn,writeFileSync as Qn}from"node:fs";import{dirname as Zn}from"node:path";function $(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function ao(e){if(!Wn(e))return{};let t;try{t=JSON.parse(qn(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude Code config: ${o instanceof Error?o.message:String(o)}`)}if(!$(t))throw new Error("Invalid existing Claude Code config: root must be a JSON object.");return t}function lo(e,t){if(!$(e))return!1;let o=e.args;return e.type==="stdio"&&e.command===t&&Array.isArray(o)&&o.length===1&&o[0]==="mcp"}function ei(e,t){zn(Zn(e),{recursive:!0});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Qn(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Vn(o,e)}finally{Xn(o,{force:!0})}}function uo(e={}){let t=e.stateFile??lt(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=ao(t),s=n.mcpServers;if(s!==void 0&&!$(s))throw new Error("Invalid existing Claude Code config: mcpServers must be an object.");let i=$(s)?{...s}:{},c=i[r];if(lo(c,o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:[o,"mcp"],repaired:!1};let a=c!==void 0;i[r]={type:"stdio",command:o,args:["mcp"]},ei(t,{...n,mcpServers:i});let u=ao(t).mcpServers;if(!$(u)||!lo(u[r],o))throw new Error("Claude Code MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:[o,"mcp"],repaired:a}}function po(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=co({binary:t,settingsFile:e.settingsFile}),r=uo({binary:t,stateFile:e.stateFile});return{hooks:o,mcp:r,files:[o.settingsFile,r.configFile]}}import{existsSync as ti,mkdirSync as oi,readFileSync as ri,renameSync as ni,rmSync as ii,writeFileSync as si}from"node:fs";import{dirname as ci}from"node:path";var R="ToolNet Memory - ";function mo(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function ai(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function go(e){if(!ti(e))return{};let t=ri(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch(r){throw new Error(`Invalid existing Kiro hooks file: ${r instanceof Error?r.message:String(r)}`)}if(!mo(o))throw new Error("Invalid existing Kiro hooks file: root must be a JSON object.");return o}function fo(e){return mo(e)?typeof e.name=="string"&&e.name.startsWith(R):!1}function H(e){return{type:"command",command:e}}function li(e){return[{name:`${R}Session Start`,description:"Inject compact local ToolNet continuity and capture Kiro session activation.",trigger:"SessionStart",action:H(e),timeout:10,enabled:!0},{name:`${R}Prompt Continuity`,description:"Capture prompts and refresh ToolNet guidance only for resume/continue requests.",trigger:"UserPromptSubmit",action:H(e),timeout:10,enabled:!0},{name:`${R}Raw History Guard`,description:"Prevent Kiro from reconstructing continuity from raw ToolNet/agent session history.",trigger:"PreToolUse",matcher:"*",action:H(e),timeout:10,enabled:!0},{name:`${R}Tool Capture`,description:"Capture durable tool activity while filtering noisy read-only events.",trigger:"PostToolUse",matcher:"*",action:H(e),timeout:15,enabled:!0},{name:`${R}Final Flush`,description:"Flush pending Kiro WAL events when the assistant finishes a turn.",trigger:"Stop",action:H(e),timeout:30,enabled:!0}]}function ui(e,t){oi(ci(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{si(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),ni(o,e)}finally{ii(o,{force:!0})}}function yo(e={}){let t=e.hooksFile??pt(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=go(t);if(r.version!==void 0&&r.version!=="v1")throw new Error(`Unsupported existing Kiro hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!Array.isArray(n))throw new Error("Invalid existing Kiro hooks file: hooks must be an array.");let s=Array.isArray(n)?n.filter(u=>!fo(u)):[],i=`${ai(o)} session:kiro-hook`,c=li(i),a={...r,version:"v1",hooks:[...s,...c]};if(JSON.stringify(r)===JSON.stringify(a))return{hooksFile:t,changed:!1,hookCount:c.length};ui(t,a);let l=go(t);if(l.version!=="v1"||!Array.isArray(l.hooks)||l.hooks.filter(fo).length!==c.length)throw new Error("Kiro hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:c.length}}import{existsSync as pi,mkdirSync as gi,readFileSync as di,renameSync as fi,rmSync as mi,writeFileSync as yi}from"node:fs";import{dirname as hi}from"node:path";function J(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function ho(e){if(!pi(e))return{};let t=di(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch(r){throw new Error(`Invalid existing Kiro MCP config: ${r instanceof Error?r.message:String(r)}`)}if(!J(o))throw new Error("Invalid existing Kiro MCP config: root must be a JSON object.");return o}function ko(e,t){return J(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&e.disabled===!1:!1}function ki(e,t){gi(hi(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{yi(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),fi(o,e)}finally{mi(o,{force:!0})}}function bo(e={}){let t=e.configFile??ut(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=ho(t),s=n.mcpServers;if(s!==void 0&&!J(s))throw new Error("Invalid existing Kiro MCP config: mcpServers must be an object.");let i=J(s)?{...s}:{},c=i[r];if(ko(c,o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};i[r]={command:o,args:["mcp"],disabled:!1};let a={...n,mcpServers:i};ki(t,a);let u=ho(t).mcpServers;if(!J(u)||!ko(u[r],o))throw new Error("Kiro MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}function Co(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=bo({binary:t,configFile:e.configFile}),r=yo({binary:t,hooksFile:e.hooksFile});return{installed:o.installed,changed:o.changed||r.changed,mcp:o,hooks:r,files:[o.configFile,r.hooksFile]}}import{existsSync as bi,mkdirSync as Ci,readFileSync as vi,renameSync as Si,rmSync as Oi,writeFileSync as Ii}from"node:fs";import{dirname as ji}from"node:path";function Te(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function wi(e){if(!bi(e))return{};let t=vi(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch(r){throw new Error(`Invalid existing ToolNet CLI MCP config: ${r instanceof Error?r.message:String(r)}`)}if(!Te(o))throw new Error("Invalid existing ToolNet CLI MCP config: root must be a JSON object.");return o}function xi(e,t){Ci(ji(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Ii(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Si(o,e)}finally{Oi(o,{force:!0})}}function vo(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??he(),r=wi(o),n="toolnet-memory";if(Te(r.mcpServers)&&r.mcpServers[n]!=null&&!e.force)return{installed:!0,changed:!1,configFile:o};let i=Te(r.mcpServers)?r.mcpServers:{};return i[n]={command:t,args:["mcp"]},r.mcpServers=i,xi(o,r),{installed:!0,changed:!0,configFile:o}}function So(e={}){let t=e.binary??"toolnet-memory",o=vo({binary:t,configFile:e.configFile,force:e.force});return{installed:o.installed,changed:o.changed,mcp:{...o,configured:o.installed},files:[o.configFile]}}import{mkdirSync as Ni,existsSync as _i}from"node:fs";import{dirname as Di}from"node:path";import{existsSync as Ri,mkdirSync as Mi,readFileSync as Ei,renameSync as Ti,rmSync as Fi,writeFileSync as Ai}from"node:fs";import{dirname as Pi}from"node:path";function m(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function I(e,t){if(!Ri(e))return{};let o=Ei(e,"utf8").trim();if(!o)return{};let r;try{r=JSON.parse(o)}catch(n){throw new Error(`Invalid existing ${t} MCP config: ${n instanceof Error?n.message:String(n)}`)}if(!m(r))throw new Error(`Invalid existing ${t} MCP config: root must be a JSON object.`);return r}function M(e,t){Mi(Pi(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Ai(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Ti(o,e)}finally{Fi(o,{force:!0})}}function Oo(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??Ce(),r=Di(o);_i(r)||Ni(r,{recursive:!0});let n=I(o,"Kilo"),s=n.mcpServers;if(s!==void 0&&!m(s))throw new Error("Invalid existing Kilo MCP config: mcpServers must be an object.");let i=m(s)?{...s}:{},c="toolnet-memory";return m(i[c])&&i[c].command===t&&!e.force?{installed:!0,changed:!1,configFile:o,configured:!0}:(i[c]={command:t,args:["mcp"]},M(o,{...n,mcpServers:i}),{installed:!0,changed:!0,configFile:o,configured:!0})}function Io(e={}){let t=e.binary??"toolnet-memory",o=Oo({binary:t,configFile:e.configFile,force:e.force});return{installed:o.installed,changed:o.changed,mcp:o,files:[o.configFile]}}import{existsSync as $i,mkdirSync as Hi,readFileSync as Ji,renameSync as Li,rmSync as Gi,writeFileSync as Ki}from"node:fs";import{dirname as Bi}from"node:path";function d(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function b(e,t){if(!$i(e))return{};let o=Ji(e,"utf8").trim();if(!o)return{};let r;try{r=JSON.parse(o)}catch(n){throw new Error(`Invalid existing ${t} hooks file: ${n instanceof Error?n.message:String(n)}`)}if(!d(r))throw new Error(`Invalid existing ${t} hooks file: root must be a JSON object.`);return r}function E(e,t){Hi(Bi(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Ki(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Li(o,e)}finally{Gi(o,{force:!0})}}function Fe(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}var L=[["sessionStart",10],["beforeSubmitPrompt",10],["preToolUse",10],["postToolUse",15],["afterAgentResponse",15],["stop",30]];function jo(e){return d(e)&&typeof e.command=="string"&&e.command.includes("session:cursor-hook")}function Ui(e,t,o){let n={type:"command",command:`TOOLNET_HOOK_EVENT=${Fe(e)} ${Fe(t)} session:cursor-hook`,timeout:o};return e==="preToolUse"&&(n.matcher=".*"),n}function Ae(e={}){let t=e.hooksFile??X(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=b(t,"Cursor");if(r.version!==void 0&&r.version!==1)throw new Error(`Unsupported existing Cursor hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!d(n))throw new Error("Invalid existing Cursor hooks file: hooks must be an object.");let s=d(n)?{...n}:{};for(let[l,u]of L){let p=s[l];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing Cursor hooks file: hooks.${l} must be an array.`);let g=Array.isArray(p)?p.filter(S=>!jo(S)):[];s[l]=[...g,Ui(l,o,u)]}let i={...r,version:1,hooks:s};if(JSON.stringify(r)===JSON.stringify(i))return{hooksFile:t,changed:!1,hookCount:L.length};E(t,i);let c=b(t,"Cursor");if(c.version!==1||!d(c.hooks))throw new Error("Cursor hooks were written but verification failed.");let a=0;for(let[l]of L){let u=c.hooks[l];if(!Array.isArray(u))throw new Error("Cursor hooks were written but verification failed.");a+=u.filter(jo).length}if(a!==L.length)throw new Error("Cursor hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:L.length}}function wo(e,t){return m(e)?(e.type===void 0||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function Pe(e={}){let t=e.configFile??V(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=I(t,"Cursor"),s=n.mcpServers;if(s!==void 0&&!m(s))throw new Error("Invalid existing Cursor MCP config: mcpServers must be an object.");let i=m(s)?{...s}:{};if(wo(i[r],o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};i[r]={type:"stdio",command:o,args:["mcp"]},M(t,{...n,mcpServers:i});let a=I(t,"Cursor").mcpServers;if(!m(a)||!wo(a[r],o))throw new Error("Cursor MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}import{mkdirSync as Yi,readFileSync as xo,renameSync as Wi,rmSync as zi,writeFileSync as qi}from"node:fs";import{dirname as Vi}from"node:path";var Ne=`---
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
`;function Xi(e,t){Yi(Vi(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{qi(o,t,{encoding:"utf8",mode:384}),Wi(o,e)}finally{zi(o,{force:!0})}}function Ro(e){let t=e.ruleFile??kt(e.projectRoot);try{if(xo(t,"utf8")===Ne)return{ruleFile:t,changed:!1}}catch{}if(Xi(t,Ne),xo(t,"utf8")!==Ne)throw new Error("Cursor ToolNet project rule was written but verification failed.");return{ruleFile:t,changed:!0}}import{spawnSync as Qi}from"node:child_process";import{existsSync as T,statSync as Zi}from"node:fs";import{dirname as es,join as ts,parse as os,resolve as De}from"node:path";function Mo(e){let t=De(e);if(!T(t))throw new Error(`Project path does not exist: ${t}`);if(!Zi(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);return t}function se(e){return ts(e,".toolnet","project.json")}function rs(e){let t=De(e),o=os(t).root;for(;;){if(T(se(t)))return t;if(t===o)return;let r=es(t);if(r===t)return;t=r}}function _e(e){let t=Qi("git",["rev-parse","--show-toplevel"],{cwd:e,encoding:"utf8",timeout:5e3});if(t.status!==0)return;let o=t.stdout.trim();return o?De(o):void 0}function C(e={}){let t=Mo(e.cwd??process.cwd());if(e.project){let n=Mo(e.project),s=se(n),i=_e(n);return{root:n,source:"explicit",eligible:!0,toolnetProject:T(s),manifestFile:T(s)?s:void 0,gitRoot:i}}let o=rs(t);if(o){let n=se(o);return{root:o,source:"toolnet",eligible:!0,toolnetProject:!0,manifestFile:n,gitRoot:_e(o)}}let r=_e(t);if(r){let n=se(r);return{root:r,source:"git",eligible:!0,toolnetProject:T(n),manifestFile:T(n)?n:void 0,gitRoot:r}}return{root:t,source:"cwd",eligible:!1,toolnetProject:!1}}function Ao(e,t={}){let o=[],r=e.indexOf("--scope");if(r>=0){let s=e[r+1];if(s!=="global"&&s!=="project"&&s!=="both")throw new Error(`Invalid --scope value: ${String(s)}`);o.push(s)}e.includes("--global")&&o.push("global"),e.includes("--both")&&o.push("both");let n=Array.from(new Set(o));if(n.length>1)throw new Error(`Conflicting integration scopes: ${n.join(", ")}`);return n[0]??t.defaultScope??"global"}function Eo(e,t){return{install:e,effective:t}}function v(e,t){return{surface:e,global:Eo(t.globalInstall,t.effective==="global"||t.effective==="both"),project:Eo(t.projectInstall,t.effective==="project"||t.effective==="both"),effective:t.effective,risk:t.risk??"none",dedupeRequired:t.dedupeRequired??!1,trustRequired:t.trustRequired??t.projectInstall,note:t.note}}function ns(e){return{mcp:v("mcp",{globalInstall:!0,projectInstall:!1,effective:"global"}),hooks:v("hooks",{globalInstall:!0,projectInstall:!1,effective:"global"}),work:v("work",{globalInstall:e==="grok",projectInstall:!1,effective:e==="grok"?"global":"none",note:e==="grok"?"Grok supports a global ToolNet continuity skill.":"Cursor/Copilot work instructions remain project-scoped."})}}function To(e){return{mcp:v("mcp",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),hooks:v("hooks",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),work:v("work",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!1,note:e==="cursor"?"Use .cursor/rules/toolnet-memory.mdc.":e==="copilot"?"Use .github/instructions/toolnet-memory.instructions.md.":"Use .grok/skills/toolnet-continuity/SKILL.md."})}}function Fo(e){return{mcp:v("mcp",{globalInstall:!0,projectInstall:!0,effective:"project",risk:e==="cursor"?"precedence-unverified":"shadowed-global",trustRequired:!0,note:e==="cursor"?"Project ToolNet MCP is the intended effective definition; native same-name precedence must be E2E certified before release.":"Global remains useful outside the project; same-name project definition wins inside the project."}),hooks:v("hooks",{globalInstall:!0,projectInstall:!0,effective:"both",risk:"additive-duplicate",dedupeRequired:!0,trustRequired:!0,note:"Global and project hook sources can both execute for the same native event."}),work:v("work",{globalInstall:e==="grok",projectInstall:!0,effective:"project",risk:e==="grok"?"shadowed-global":"none",trustRequired:!1,note:e==="cursor"?"Project rule is authoritative.":e==="copilot"?"Project instruction is authoritative.":"Project skill shadows the same-name global skill inside the project."})}}function F(e){let{agent:t,scope:o,project:r}=e;return(o==="project"||o==="both")&&(!r||!r.eligible)?{agent:t,requestedScope:o,project:r,surfaces:o==="both"?Fo(t):To(t),canInstall:!1,reason:"Project scope requires an explicit project, existing ToolNet project, or Git repository root."}:{agent:t,requestedScope:o,project:r,surfaces:o==="global"?ns(t):o==="project"?To(t):Fo(t),canInstall:!0}}function Po(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.rule?.changed)}function No(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:C({project:e.projectRoot}),n=F({agent:"cursor",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Cursor project integration scope cannot be resolved.");let s,i;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(s={},n.surfaces.mcp.global.install&&(s.mcp=Pe({binary:t,configFile:e.configFile??V()})),n.surfaces.hooks.global.install&&(s.hooks=Ae({binary:t,hooksFile:e.hooksFile??X()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Cursor project integration requires an eligible project root.");i={},n.surfaces.mcp.project.install&&(i.mcp=Pe({binary:t,configFile:e.projectConfigFile??yt(r.root)})),n.surfaces.hooks.project.install&&(i.hooks=Ae({binary:t,hooksFile:e.projectHooksFile??ht(r.root)})),n.surfaces.work.project.install&&(i.rule=Ro({projectRoot:r.root,ruleFile:e.projectRuleFile}))}let c=i?.mcp??s?.mcp,a=i?.hooks??s?.hooks;if(!c||!a)throw new Error("Cursor integration did not produce an effective MCP/hooks installation.");let l=Array.from(new Set([s?.mcp?.configFile,s?.hooks?.hooksFile,s?.rule?.ruleFile,i?.mcp?.configFile,i?.hooks?.hooksFile,i?.rule?.ruleFile].filter(u=>typeof u=="string")));return{installed:!0,changed:Po(s)||Po(i),scope:o,plan:n,project:r,global:s,projectScope:i,mcp:c,hooks:a,rule:i?.rule,files:l}}var G=[["sessionStart",10],["userPromptSubmitted",10],["userPromptTransformed",10],["preToolUse",10],["postToolUse",15],["agentStop",30]];function is(e){if(typeof e.command=="string")return e.command;if(typeof e.bash=="string")return e.bash}function _o(e){return d(e)&&is(e)?.includes("session:copilot-hook")===!0}function ss(e,t,o){let r={type:"command",command:`${t} session:copilot-hook`,env:{TOOLNET_HOOK_EVENT:e},timeoutSec:o};return e==="preToolUse"&&(r.matcher=".*"),r}function $e(e={}){let t=e.hooksFile??Z(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=b(t,"GitHub Copilot CLI");if(r.version!==void 0&&r.version!==1)throw new Error(`Unsupported existing GitHub Copilot CLI hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!d(n))throw new Error("Invalid existing GitHub Copilot CLI hooks file: hooks must be an object.");let s=d(n)?{...n}:{};for(let[l,u]of G){let p=s[l];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing GitHub Copilot CLI hooks file: hooks.${l} must be an array.`);let g=Array.isArray(p)?p.filter(S=>!_o(S)):[];s[l]=[...g,ss(l,o,u)]}let i={...r,version:1,hooks:s};if(JSON.stringify(r)===JSON.stringify(i))return{hooksFile:t,changed:!1,hookCount:G.length};E(t,i);let c=b(t,"GitHub Copilot CLI");if(c.version!==1||!d(c.hooks))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");let a=0;for(let[l]of G){let u=c.hooks[l];if(!Array.isArray(u))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");a+=u.filter(_o).length}if(a!==G.length)throw new Error("GitHub Copilot CLI hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:G.length}}function Do(e,t){return m(e)?(e.type===void 0||e.type==="local"||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&Array.isArray(e.tools)&&e.tools.length===1&&e.tools[0]==="*":!1}function He(e={}){let t=e.configFile??Q(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=I(t,"GitHub Copilot CLI"),s=n.mcpServers;if(s!==void 0&&!m(s))throw new Error("Invalid existing GitHub Copilot CLI MCP config: mcpServers must be an object.");let i=m(s)?{...s}:{};if(Do(i[r],o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};i[r]={type:"stdio",command:o,args:["mcp"],tools:["*"]},M(t,{...n,mcpServers:i});let a=I(t,"GitHub Copilot CLI").mcpServers;if(!m(a)||!Do(a[r],o))throw new Error("GitHub Copilot CLI MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}import{mkdirSync as cs,readFileSync as $o,renameSync as as,rmSync as ls,writeFileSync as us}from"node:fs";import{dirname as ps}from"node:path";var Je=`---
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
`;function gs(e,t){cs(ps(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{us(o,t,{encoding:"utf8",mode:384}),as(o,e)}finally{ls(o,{force:!0})}}function Ho(e){let t=e.instructionFile??St(e.projectRoot);try{if($o(t,"utf8")===Je)return{instructionFile:t,changed:!1}}catch{}if(gs(t,Je),$o(t,"utf8")!==Je)throw new Error("Copilot ToolNet project instruction verification failed.");return{instructionFile:t,changed:!0}}function Jo(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.instruction?.changed)}function Lo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:C({project:e.projectRoot}),n=F({agent:"copilot",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Copilot project integration scope cannot be resolved.");let s,i;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(s={},n.surfaces.mcp.global.install&&(s.mcp=He({binary:t,configFile:e.configFile??Q()})),n.surfaces.hooks.global.install&&(s.hooks=$e({binary:t,hooksFile:e.hooksFile??Z()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Copilot project integration requires an eligible project root.");i={},n.surfaces.mcp.project.install&&(i.mcp=He({binary:t,configFile:e.projectConfigFile??Ct(r.root)})),n.surfaces.hooks.project.install&&(i.hooks=$e({binary:t,hooksFile:e.projectHooksFile??vt(r.root)})),n.surfaces.work.project.install&&(i.instruction=Ho({projectRoot:r.root,instructionFile:e.projectInstructionFile}))}let c=i?.mcp??s?.mcp,a=i?.hooks??s?.hooks;if(!c||!a)throw new Error("Copilot integration did not produce effective MCP/hooks.");let l=Array.from(new Set([s?.mcp?.configFile,s?.hooks?.hooksFile,s?.instruction?.instructionFile,i?.mcp?.configFile,i?.hooks?.hooksFile,i?.instruction?.instructionFile].filter(u=>typeof u=="string")));return{installed:!0,changed:Jo(s)||Jo(i),scope:o,plan:n,project:r,global:s,projectScope:i,mcp:c,hooks:a,instruction:i?.instruction,files:l}}import{existsSync as ds,mkdirSync as fs,readFileSync as Go,renameSync as ms,rmSync as ys,writeFileSync as hs}from"node:fs";import{dirname as ks}from"node:path";var Le=`---
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
`;function bs(e,t){fs(ks(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{hs(o,t,{encoding:"utf8",mode:384}),ms(o,e)}finally{ys(o,{force:!0})}}function Ge(e={}){let t=e.skillFile??re();if(ds(t)&&Go(t,"utf8")===Le)return{skillFile:t,changed:!1};if(bs(t,Le),Go(t,"utf8")!==Le)throw new Error("Grok ToolNet continuity skill was written but verification failed.");return{skillFile:t,changed:!0}}var K=[["SessionStart",10],["UserPromptSubmit",10],["PreToolUse",10],["PostToolUse",15],["Stop",30]];function Ko(e){return!d(e)||!Array.isArray(e.hooks)?!1:e.hooks.some(t=>d(t)&&typeof t.command=="string"&&t.command.includes("session:grok-hook"))}function Cs(e,t,o){let r={hooks:[{type:"command",command:`${t} session:grok-hook`,timeout:o,env:{TOOLNET_HOOK_EVENT:e}}]};return e==="PreToolUse"&&(r.matcher=".*"),r}function Ke(e={}){let t=e.hooksFile??oe(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=b(t,"Grok Build"),n=r.hooks;if(n!==void 0&&!d(n))throw new Error("Invalid existing Grok Build hooks file: hooks must be an object.");let s=d(n)?{...n}:{};for(let[l,u]of K){let p=s[l];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing Grok Build hooks file: hooks.${l} must be an array.`);let g=Array.isArray(p)?p.filter(S=>!Ko(S)):[];s[l]=[...g,Cs(l,o,u)]}let i={...r,hooks:s};if(JSON.stringify(r)===JSON.stringify(i))return{hooksFile:t,changed:!1,hookCount:K.length};E(t,i);let c=b(t,"Grok Build");if(!d(c.hooks))throw new Error("Grok Build hooks were written but verification failed.");let a=0;for(let[l]of K){let u=c.hooks[l];if(!Array.isArray(u))throw new Error("Grok Build hooks were written but verification failed.");a+=u.filter(Ko).length}if(a!==K.length)throw new Error("Grok Build hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:K.length}}import{existsSync as vs,mkdirSync as Ss,readFileSync as Os,renameSync as Is,rmSync as js,writeFileSync as ws}from"node:fs";import{dirname as xs}from"node:path";function Bo(e){return vs(e)?Os(e,"utf8"):""}function Rs(e,t){Ss(xs(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{ws(o,t,{encoding:"utf8",mode:384}),Is(o,e)}finally{js(o,{force:!0})}}function Be(e){return e.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t")}function Ms(e){return`[mcp_servers."${Be(e)}"]`}function Es(e,t){return[Ms(e),`command = "${Be(t)}"`,'args = ["mcp"]',"enabled = true"].join(`
`)}function Ts(e){let t=e.trim();return t.startsWith("[")&&t.includes("]")}function ce(e){return e.trim().replace(/\s+/g,"")}function Fs(e){return new Set([ce(`[mcp_servers.${e}]`),ce(`[mcp_servers."${e}"]`),ce(`[mcp_servers.'${e}']`)])}function Yo(e,t){let o=e.split(/\r?\n/),r=Fs(t),n=-1;for(let u=0;u<o.length;u+=1){let p=ce(o[u].replace(/\s+#.*$/,""));if(r.has(p)){n=u;break}}if(n<0)return null;let s=o.length;for(let u=n+1;u<o.length;u+=1)if(Ts(o[u])){s=u;break}let i=[],c=0;for(let u of o)i.push(c),c+=u.length+1;let a=i[n]??0,l=s>=o.length?e.length:i[s]??e.length;return{start:a,end:l}}function As(e,t,o){let r=`${Es(t,o)}
`,n=Yo(e,t);if(n){let s=e.slice(0,n.start),i=e.slice(n.end);return`${s}${r}${i.replace(/^\n+/,"")}`}return e.trim()?`${e.replace(/\s*$/,"")}

${r}`:r}function Uo(e,t,o){let r=Yo(e,t);if(!r)return!1;let n=e.slice(r.start,r.end);return n.includes(`command = "${Be(o)}"`)&&/args\s*=\s*\[\s*"mcp"\s*\]/.test(n)&&/enabled\s*=\s*true/.test(n)}function Ue(e={}){let t=e.configFile??te(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=Bo(t);if(Uo(n,r,o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};let s=As(n,r,o);Rs(t,s);let i=Bo(t);if(!Uo(i,r,o))throw new Error("Grok Build MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}function Wo(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.skill?.changed)}function zo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:C({project:e.projectRoot}),n=F({agent:"grok",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Grok project integration scope cannot be resolved.");let s,i;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(s={},n.surfaces.mcp.global.install&&(s.mcp=Ue({binary:t,configFile:e.configFile??te()})),n.surfaces.hooks.global.install&&(s.hooks=Ke({binary:t,hooksFile:e.hooksFile??oe()})),n.surfaces.work.global.install&&(s.skill=Ge({skillFile:e.skillFile??re()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Grok project integration requires an eligible project root.");i={},n.surfaces.mcp.project.install&&(i.mcp=Ue({binary:t,configFile:e.projectConfigFile??It(r.root)})),n.surfaces.hooks.project.install&&(i.hooks=Ke({binary:t,hooksFile:e.projectHooksFile??jt(r.root)})),n.surfaces.work.project.install&&(i.skill=Ge({skillFile:e.projectSkillFile??wt(r.root)}))}let c=i?.mcp??s?.mcp,a=i?.hooks??s?.hooks,l=i?.skill??s?.skill;if(!c||!a||!l)throw new Error("Grok integration did not produce effective MCP/hooks/skill.");let u=Array.from(new Set([s?.mcp?.configFile,s?.hooks?.hooksFile,s?.skill?.skillFile,i?.mcp?.configFile,i?.hooks?.hooksFile,i?.skill?.skillFile].filter(p=>typeof p=="string")));return{installed:!0,changed:Wo(s)||Wo(i),scope:o,plan:n,project:r,global:s,projectScope:i,mcp:c,hooks:a,skill:l,files:u}}function qo(e={}){if(e.scope==="global")return{scope:"global",automatic:!1,reason:"explicit-global"};if(e.scope==="project"||e.scope==="both"){let o=C({cwd:e.cwd,project:e.projectRoot});if(!o.eligible)throw new Error(`Explicit ${e.scope} integration requires an explicit project, ToolNet project, or Git repository root.`);return{scope:e.scope,automatic:!1,project:o,reason:e.scope==="project"?"explicit-project":"explicit-both"}}let t=C({cwd:e.cwd,project:e.projectRoot});return t.toolnetProject?{scope:"both",automatic:!0,project:t,reason:"toolnet-project"}:{scope:"global",automatic:!0,reason:"no-toolnet-project"}}function Vo(){return Et()}function Ye(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[],r=e.detections??Vo(),n=new Map(r.map(i=>[i.agent,i.detected])),s=qo({scope:e.scope,projectRoot:e.projectRoot,cwd:e.cwd});if(!(e.force===!0||n.get("agy")===!0))o.push({agent:"agy",detected:!1,installed:!1,targets:[]});else try{let c=Jt({binary:t});o.push({agent:"agy",detected:!0,installed:!0,targets:c.files})}catch(c){o.push({agent:"agy",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("opencode")===!0))o.push({agent:"opencode",detected:!1,installed:!1,targets:[]});else try{let c=Ut({binary:t}),a=Vt({binary:t});o.push({agent:"opencode",detected:!0,installed:!0,targets:[c,a.configFile,`mcp:${a.serverName}`]})}catch(c){o.push({agent:"opencode",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("claude")===!0))o.push({agent:"claude",detected:!1,installed:!1,targets:[]});else try{let c=po({binary:t});o.push({agent:"claude",detected:!0,installed:!0,targets:[c.hooks.settingsFile,c.mcp.configFile,`mcp:${c.mcp.serverName}`]})}catch(c){o.push({agent:"claude",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("kiro")===!0))o.push({agent:"kiro",detected:!1,installed:!1,targets:[]});else try{let c=Co({...e.kiro??{},binary:t});o.push({agent:"kiro",detected:!0,installed:!0,targets:[c.mcp.configFile,`mcp:${c.mcp.serverName}`,c.hooks.hooksFile]})}catch(c){o.push({agent:"kiro",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("cursor")===!0))o.push({agent:"cursor",detected:!1,installed:!1,targets:[]});else try{let c=e.cursor??{},a=No({...c,binary:t,scope:c.scope??s.scope,projectRoot:c.projectRoot??s.project?.root});o.push({agent:"cursor",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(c){o.push({agent:"cursor",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("copilot")===!0))o.push({agent:"copilot",detected:!1,installed:!1,targets:[]});else try{let c=e.copilot??{},a=Lo({...c,binary:t,scope:c.scope??s.scope,projectRoot:c.projectRoot??s.project?.root});o.push({agent:"copilot",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(c){o.push({agent:"copilot",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("grok")===!0))o.push({agent:"grok",detected:!1,installed:!1,targets:[]});else try{let c=e.grok??{},a=zo({...c,binary:t,scope:c.scope??s.scope,projectRoot:c.projectRoot??s.project?.root});o.push({agent:"grok",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(c){o.push({agent:"grok",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("toolnet-cli")===!0))o.push({agent:"toolnet-cli",detected:!1,installed:!1,targets:[]});else try{let c=e.toolnetCli??{},a=So({...c,binary:t});o.push({agent:"toolnet-cli",detected:!0,installed:!0,targets:[a.mcp.configFile]})}catch(c){o.push({agent:"toolnet-cli",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("kilo")===!0))o.push({agent:"kilo",detected:!1,installed:!1,targets:[]});else try{let c=e.kilo??{},a=Io({...c,binary:t});o.push({agent:"kilo",detected:!0,installed:!0,targets:[a.mcp.configFile]})}catch(c){o.push({agent:"kilo",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("codex")===!0))o.push({agent:"codex",detected:!1,installed:!1,targets:[]});else try{let c=to({binary:t}),a=ro({binary:t}),l=so({binary:t});if(!l.installed)throw new Error(l.error??"Codex MCP registration failed");let u=[c.configFile,a,`mcp:${l.serverName}`];c.preservedPrevious&&u.push(c.previousFile),o.push({agent:"codex",detected:!0,installed:!0,targets:u})}catch(c){o.push({agent:"codex",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}return o}function Xo(e){switch(e){case"agy":return"Agy / Antigravity";case"opencode":return"OpenCode";case"claude":return"Claude Code";case"kiro":return"Kiro CLI";case"cursor":return"Cursor CLI";case"copilot":return"GitHub Copilot CLI";case"grok":return"Grok Build";case"codex":return"Codex";default:return e}}function Ps(e){console.log(""),console.log("ToolNet Memory Integration Detection"),console.log("===================================="),console.log("");for(let t of e){let o=Xo(t.agent);if(!t.detected){console.log(`\u25CB ${o}: not detected`);continue}console.log(`\u2713 ${o}: detected`);for(let r of t.evidence)console.log(`  ${r}`)}console.log("")}function Ns(e){console.log(""),console.log("ToolNet Memory AI Integrations"),console.log("=============================="),console.log("");for(let t of e){let o=Xo(t.agent);if(!t.detected){console.log(`- ${o}: not detected`);continue}if(t.installed){let r=t.scope?` [scope=${t.scope}]`:"";console.log(`\u2713 ${o}: automatic memory enabled${r}`),t.projectRoot&&console.log(`  project: ${t.projectRoot}`);continue}console.log(`\u2717 ${o}: integration failed`),t.error&&console.log(`  ${t.error}`)}console.log("")}function _s(e,t){let o=e.indexOf(t);return o>=0?e[o+1]:void 0}function Ds(e){return e.includes("--scope")||e.includes("--global")||e.includes("--both")?Ao(e):void 0}async function $s(){let e=process.argv.slice(2),t=e.includes("--all"),o=e.includes("--json"),r=e.includes("--detect-only"),n=Ds(e),s=_s(e,"--project");if(r){let c=Vo();if(o){console.log(JSON.stringify(c,null,2));return}Ps(c);return}let i=Ye({force:t,scope:n,projectRoot:s});if(o){console.log(JSON.stringify(i,null,2));return}Ns(i)}var Hs=process.argv[1]&&(process.argv[1].endsWith("auto-integrate.js")||process.argv[1].endsWith("auto-integrate.ts"));Hs&&$s().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});function Ks(e=process.cwd()){let t=Ls(e);if(!Qo(t))throw new Error(`Project path does not exist: ${t}`);if(!Js(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);let o=new U().detect(t),r=Gs(o.rootPath,".toolnet","project.json");if(!Qo(r))throw new Error(`ToolNet project initialization failed: ${r} was not created`);return{initialized:!0,project:{id:o.id,name:o.name,remote:o.remote,rootPath:o.rootPath},manifestFile:r}}function Bs(e,t){let o=e.indexOf(t);return o>=0?e[o+1]:void 0}async function Us(){let e=process.argv.slice(2),t=e.includes("--json"),o=!e.includes("--no-integrate"),r=Bs(e,"--project"),n=e.find((a,l)=>!a.startsWith("-")&&(l===0||e[l-1]!=="--project")),s=r??n??process.cwd(),i=await pe("Initializing ToolNet project",()=>Ks(s),{enabled:!t}),c=[];if(o&&(c=await pe("Detecting AI coding agents",()=>Ye({projectRoot:i.project.rootPath}),{enabled:!t})),t){console.log(JSON.stringify({...i,integrations:c},null,2));return}if(console.log(""),console.log("ToolNet Memory"),console.log("=============="),console.log(""),console.log("\u2713 Project initialized"),console.log(""),console.log(`Project:  ${i.project.name}`),console.log(`ID:       ${i.project.id}`),console.log(`Root:     ${i.project.rootPath}`),console.log(`Manifest: ${i.manifestFile}`),console.log(""),o){console.log("AI integrations:");let a=c.filter(l=>l.detected&&l.installed);if(!a.length)console.log("  \u25CB No supported coding agent detected");else for(let l of a){let u=l.agent==="agy"?"Agy / Antigravity":l.agent==="opencode"?"OpenCode":"Codex";console.log(`  \u2713 ${u}`)}console.log("")}console.log("Next: toolnet-memory doctor"),console.log("")}var Ys=process.argv[1]?.endsWith("/init.js")||process.argv[1]?.endsWith("/init.ts");Ys&&Us().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});export{Ks as initializeToolNetProject};
