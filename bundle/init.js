import{existsSync as sr,statSync as ec}from"node:fs";import{resolve as tc,join as oc}from"node:path";import{existsSync as cr,readFileSync as ar}from"node:fs";import{homedir as lr}from"node:os";import{join as ur}from"node:path";function pr(e){let t=e.trim();return t.length>=2&&t.startsWith('"')&&t.endsWith('"')?(t=t.slice(1,-1),t.replace(/\\n/g,`
`).replace(/\\r/g,"\r").replace(/\\t/g,"	").replace(/\\"/g,'"').replace(/\\\\/g,"\\")):t.length>=2&&t.startsWith("'")&&t.endsWith("'")?t.slice(1,-1):t}function dr(){let e=process.env.TOOLNET_GLOBAL_ENV??ur(lr(),".config","toolnet-memory",".env");if(!cr(e))return;let t=ar(e,"utf8");for(let o of t.split(/\r?\n/)){let r=o.trim();if(!r||r.startsWith("#"))continue;r.startsWith("export ")&&(r=r.slice(7));let n=r.indexOf("=");if(n<=0)continue;let s=r.slice(0,n).trim();/^[A-Za-z_][A-Za-z0-9_]*$/.test(s)&&process.env[s]===void 0&&(process.env[s]=pr(r.slice(n+1)))}}dr();import{createHash as gr}from"node:crypto";import{existsSync as ye,mkdirSync as fr,readFileSync as mr,renameSync as yr,writeFileSync as hr}from"node:fs";import{basename as kr,dirname as W,join as V,parse as nt,resolve as _}from"node:path";var it=".toolnet",br="project.json";function Cr(e){return gr("sha256").update(e).digest("hex").slice(0,16)}function he(e){return V(e,it,br)}function vr(e){return ye(he(e))}function wr(e,t){let o=_(e),r=nt(o).root;for(;;){if(vr(o))return o;if(o===r||t&&o===_(t))break;let n=W(o);if(n===o)break;o=n}return null}function Ir(e){let t=_(e),o=nt(t).root,r=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"];for(;;){if(r.some(s=>ye(V(t,s))))return t;if(t===o)break;let n=W(t);if(n===t)break;t=n}return _(e)}function Sr(e){let t;try{t=JSON.parse(mr(e,"utf8"))}catch(n){throw new Error(`Invalid ToolNet project manifest: ${e}: ${n instanceof Error?n.message:String(n)}`)}if(!t||typeof t!="object")throw new Error(`Invalid ToolNet project manifest: ${e}`);let o=t;if(typeof o.id!="string"||!o.id.trim())throw new Error(`ToolNet project manifest is missing id: ${e}`);if(typeof o.name!="string"||!o.name.trim())throw new Error(`ToolNet project manifest is missing name: ${e}`);let r=new Date().toISOString();return{version:1,id:o.id,name:o.name,remote:typeof o.remote=="string"&&o.remote.trim()?o.remote:o.name,rootPath:typeof o.rootPath=="string"?o.rootPath:W(W(e)),createdAt:typeof o.createdAt=="string"?o.createdAt:r,updatedAt:typeof o.updatedAt=="string"?o.updatedAt:r,graphVersion:typeof o.graphVersion=="number"?o.graphVersion:0,memoryVersion:typeof o.memoryVersion=="number"?o.memoryVersion:0,metadata:o.metadata&&typeof o.metadata=="object"?o.metadata:void 0}}function ot(e,t){let o=V(e,it);fr(o,{recursive:!0});let r=he(e),n=`${r}.tmp-${process.pid}`;hr(n,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),yr(n,r)}function rt(e,t){return{id:e.id,name:e.name,remote:e.remote,rootPath:t,createdAt:e.createdAt,updatedAt:e.updatedAt,graphVersion:e.graphVersion,memoryVersion:e.memoryVersion,metadata:e.metadata}}var Y=class{detect(t=process.cwd()){let o=_(t),r=Ir(o),s=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(u=>ye(V(r,u))),i=wr(o,s?r:void 0);if(i){let u=he(i),p=Sr(u);return p.rootPath!==i&&(p.rootPath=i,p.updatedAt=new Date().toISOString(),ot(i,p)),rt(p,i)}let c=new Date().toISOString(),a=kr(r),l={version:1,id:Cr(r),name:a,remote:a,rootPath:r,createdAt:c,updatedAt:c,graphVersion:0,memoryVersion:0};return ot(r,l),rt(l,r)}};var jr={mcp:!0,continuityRead:!0,nativeCapture:!1,lifecycleHooks:!1,sharedJournalWrite:!1,level:"mcp-only"},Or={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!1,sharedJournalWrite:!0,level:"native-capture"},j={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!0,sharedJournalWrite:!0,level:"native-capture"},xr={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!0,sharedJournalWrite:!0,level:"native-capture"};function h(e,t,o){return{agent:e,...t,refreshMode:o}}var st={agy:h("agy",j,"native-lifecycle"),opencode:h("opencode",xr,"persistent-plugin"),codex:h("codex",j,"native-lifecycle"),claude:h("claude",j,"native-lifecycle"),kiro:h("kiro",j,"native-lifecycle"),cursor:h("cursor",j,"native-lifecycle"),copilot:h("copilot",j,"native-lifecycle"),grok:h("grok",j,"native-lifecycle"),"toolnet-cli":h("toolnet-cli",Or,"native-session"),kilo:h("kilo",jr,"mcp-only")};function Rr(e){return Object.prototype.hasOwnProperty.call(st,e)}function Mr(e){if(Rr(e))return st[e]}function ct(e){let t=Mr(e);if(!t)return"unknown";switch(t.refreshMode){case"native-lifecycle":return"native lifecycle";case"persistent-plugin":return"persistent plugin";case"native-session":return"native session capture";case"mcp-only":return"MCP only"}}var at=["\u280B","\u2819","\u2839","\u2838","\u283C","\u2834","\u2826","\u2827","\u2807","\u280F"],f={clear:"\r\x1B[2K",cyan:"\x1B[36m",green:"\x1B[32m",red:"\x1B[31m",yellow:"\x1B[33m",amber:"\x1B[38;5;214m",dim:"\x1B[2m",reset:"\x1B[0m"};function lt(e,t=16){let r=Math.max(1,t-4+1),n=e%r;return"\u2500".repeat(n)+"\u2501".repeat(4)+"\u2500".repeat(Math.max(0,t-n-4))}function ut(e){let t=Date.now()-e;return t<1e3?`${t}ms`:t<1e4?`${(t/1e3).toFixed(1)}s`:`${Math.round(t/1e3)}s`}var ke=class{stream;enabled;interactive;color;intervalMs;display;label;frame=0;startedAt=0;timer;active=!1;constructor(t,o={}){this.label=t,this.stream=o.stream??process.stderr,this.enabled=o.enabled??!0,this.interactive=o.interactive??this.stream.isTTY===!0,this.color=o.color??(this.interactive&&process.env.NO_COLOR===void 0),this.intervalMs=Math.max(40,o.intervalMs??80),this.display=o.display??"spinner"}start(){return!this.enabled||this.active?this:(this.active=!0,this.startedAt=Date.now(),this.interactive?(this.render(),this.timer=setInterval(()=>{this.frame=(this.frame+1)%1e4,this.render()},this.intervalMs),this.timer.unref?.(),this):(this.stream.write(`\u2192 ${this.label}
`),this))}update(t){return this.label=t,this.enabled&&this.active&&this.interactive&&this.render(),this}succeed(t){this.finish("\u2713",t??this.label,f.green)}fail(t){this.finish("\u2717",t??this.label,f.red)}warn(t){this.finish("!",t??this.label,f.yellow)}stop(){this.active&&(this.timer&&(clearInterval(this.timer),this.timer=void 0),this.enabled&&this.interactive&&this.stream.write(f.clear),this.active=!1)}render(){if(!this.enabled||!this.active||!this.interactive)return;let t=at[this.frame%at.length],o=this.display==="bar"?this.color?`${f.amber}${lt(this.frame)}${f.reset}`:lt(this.frame):this.color?`${f.cyan}${t}${f.reset}`:t,r=ut(this.startedAt),n=this.color?`${f.dim}${r}${f.reset}`:r;this.stream.write(`${f.clear}${o} ${this.label} ${n}`)}finish(t,o,r){if(!this.enabled){this.active=!1;return}this.startedAt||(this.startedAt=Date.now()),this.timer&&(clearInterval(this.timer),this.timer=void 0);let n=ut(this.startedAt),s=this.color?`${r}${t}${f.reset}`:t,i=this.color?`${f.dim}${n}${f.reset}`:n;this.interactive?this.stream.write(`${f.clear}${s} ${o} ${i}
`):this.stream.write(`${s} ${o} (${n})
`),this.active=!1}};async function be(e,t,o={}){let r=new ke(e,o).start();try{let n=await t();return r.succeed(),n}catch(n){throw r.fail(),n}}import{existsSync as Jt}from"node:fs";import{homedir as en}from"node:os";import{join as tn}from"node:path";import{spawnSync as on}from"node:child_process";import{homedir as Er}from"node:os";import{join as R}from"node:path";function pt(e={}){return R(e.home??Er(),".gemini")}function dt(e={}){return R(pt(e),"antigravity-cli")}function gt(e={}){return R(pt(e),"config")}function z(e={}){return R(gt(e),"mcp_config.json")}function q(e={}){let t=e.cwd??process.cwd();return R(t,".agents","mcp_config.json")}function X(e="toolnet-memory",t={}){return R(dt(t),"plugins",e)}function ft(e={}){return[dt(e),z(e),gt(e),q(e)]}import{homedir as mt}from"node:os";import{join as O}from"node:path";function M(e={}){let t=process.env.OPENCODE_CONFIG_DIR?.trim();if(t)return t;let o=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return o?O(o,"opencode"):O(e.home??mt(),".config","opencode")}function Ce(e={}){let t=process.env.OPENCODE_CONFIG?.trim();if(t)return t;let o=e.home??mt(),r=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return r?O(r,"opencode","opencode.json"):O(o,".config","opencode","opencode.json")}function ve(e={}){let t=e.cwd??process.cwd();return O(t,"opencode.json")}function yt(e={}){return O(M(e),"plugins")}function ht(e={}){return O(M(e),"AGENTS.md")}import{homedir as kt}from"node:os";import{join as we}from"node:path";function Ie(e={}){return we(e.home??kt(),".claude")}function bt(e={}){return we(Ie(e),"settings.json")}function Ct(e={}){return we(e.home??kt(),".claude.json")}import{homedir as Tr}from"node:os";import{join as x}from"node:path";function Se(e={}){return e.kiroHome??process.env.KIRO_HOME??x(e.home??Tr(),".kiro")}function Ar(e={}){return x(Se(e),"settings")}function Q(e={}){return x(Ar(e),"mcp.json")}function je(e={}){let t=e.cwd??process.cwd();return x(t,".kiro","settings","mcp.json")}function Fr(e={}){return x(Se(e),"hooks")}function Oe(e={}){return x(Fr(e),"toolnet-memory.json")}function xe(e={}){let t=e.cwd??process.cwd();return x(t,".kiro","hooks","toolnet-memory.json")}function vt(e={}){return[Se(e),Q(e)]}import{homedir as Pr}from"node:os";import{join as Re}from"node:path";function wt(e={}){return Re(e.home??Pr(),".toolnetcli")}function Nr(e={}){return Re(wt(e),"config.json")}function It(e={}){let t=e.cwd??process.cwd();return Re(t,".toolnet","mcp.json")}function St(e={}){let t=wt(e),o=Nr(e);return[t,o]}import{homedir as _r}from"node:os";import{join as Me}from"node:path";function jt(e={}){if(e.kiloHome)return e.kiloHome;if(process.env.KILO_HOME)return process.env.KILO_HOME;let t=e.xdgConfigHome??process.env.XDG_CONFIG_HOME;return t?Me(t,"kilo"):Me(e.home??_r(),".config","kilo")}function Ee(e={}){return Me(jt(e),"kilo.jsonc")}function Ot(e={}){let t=jt(e),o=Ee(e);return[t,o]}import{homedir as Dr}from"node:os";import{join as b,resolve as $r}from"node:path";function Z(e={}){return e.cursorHome??b(e.home??Dr(),".cursor")}function Hr(e={}){return e.cursorConfigDir??process.env.CURSOR_CONFIG_DIR??(e.xdgConfigHome??process.env.XDG_CONFIG_HOME?b(e.xdgConfigHome??process.env.XDG_CONFIG_HOME,"cursor"):void 0)??Z(e)}function ee(e={}){return b(Z(e),"mcp.json")}function te(e={}){return b(Z(e),"hooks.json")}function Te(e){return b($r(e),".cursor")}function xt(e){return b(Te(e),"mcp.json")}function Rt(e){return b(Te(e),"hooks.json")}function Jr(e){return b(Te(e),"rules")}function Mt(e){return b(Jr(e),"toolnet-memory.mdc")}function Et(e={}){return Array.from(new Set([Z(e),Hr(e)]))}import{homedir as Lr}from"node:os";import{join as k,resolve as Gr}from"node:path";function Ae(e={}){return e.copilotHome??process.env.COPILOT_HOME??k(e.home??Lr(),".copilot")}function oe(e={}){return k(Ae(e),"mcp-config.json")}function Kr(e={}){return k(Ae(e),"hooks")}function re(e={}){return k(Kr(e),"toolnet-memory.json")}function Fe(e){return k(Gr(e),".github")}function Tt(e){return k(Fe(e),"mcp.json")}function Br(e){return k(Fe(e),"hooks")}function At(e){return k(Br(e),"toolnet-memory.json")}function Ur(e){return k(Fe(e),"instructions")}function Ft(e){return k(Ur(e),"toolnet-memory.instructions.md")}function Pt(e={}){return[Ae(e)]}import{homedir as Wr}from"node:os";import{join as y,resolve as Yr}from"node:path";function ne(e={}){return e.grokHome??process.env.GROK_HOME??y(e.home??Wr(),".grok")}function ie(e={}){return y(ne(e),"config.toml")}function Vr(e={}){return y(ne(e),"hooks")}function se(e={}){return y(Vr(e),"toolnet-memory.json")}function zr(e={}){return y(ne(e),"skills")}function qr(e={}){return y(zr(e),"toolnet-continuity")}function ce(e={}){return y(qr(e),"SKILL.md")}function Pe(e){return y(Yr(e),".grok")}function Nt(e){return y(Pe(e),"config.toml")}function Xr(e){return y(Pe(e),"hooks")}function _t(e){return y(Xr(e),"toolnet-memory.json")}function Qr(e){return y(Pe(e),"skills")}function Zr(e){return y(Qr(e),"toolnet-continuity")}function Dt(e){return y(Zr(e),"SKILL.md")}function $t(e={}){return[ne(e)]}function rn(e){return on("sh",["-lc",`command -v ${JSON.stringify(e)} >/dev/null 2>&1`],{stdio:"ignore"}).status===0}function I(e){let t=e.commandExists(e.command),o=e.configPaths.filter(s=>Jt(s)),r=o.length>0,n=[];t&&n.push(`command:${e.command}`);for(let s of o)n.push(`config:${s}`);return{agent:e.agent,detected:t||r,commandDetected:t,configDetected:r,evidence:n}}function Ht(e){let t=e.commands.filter(i=>e.commandExists(i)),o=e.configPaths.filter(i=>Jt(i)),r=t.length>0,n=o.length>0,s=[...t.map(i=>`command:${i}`),...o.map(i=>`config:${i}`)];return{agent:e.agent,detected:r||n,commandDetected:r,configDetected:n,evidence:s}}function Lt(e={}){let t=e.home??en(),o=e.commandExists??rn,r=e.codexHome??process.env.CODEX_HOME??tn(t,".codex");return[I({agent:"agy",command:"agy",commandExists:o,configPaths:ft({home:t})}),I({agent:"opencode",command:"opencode",commandExists:o,configPaths:[M({home:t,xdgConfigHome:e.xdgConfigHome})]}),I({agent:"claude",command:"claude",commandExists:o,configPaths:[Ie({home:t})]}),I({agent:"kiro",command:"kiro-cli",commandExists:o,configPaths:vt({home:t,kiroHome:e.kiroHome})}),Ht({agent:"cursor",commands:["agent","cursor-agent"],commandExists:o,configPaths:Et({home:t,cursorHome:e.cursorHome,cursorConfigDir:e.cursorConfigDir,xdgConfigHome:e.xdgConfigHome})}),I({agent:"copilot",command:"copilot",commandExists:o,configPaths:Pt({home:t,copilotHome:e.copilotHome})}),I({agent:"grok",command:"grok",commandExists:o,configPaths:$t({home:t,grokHome:e.grokHome})}),I({agent:"toolnet-cli",command:"toolnet",commandExists:o,configPaths:St({home:t})}),Ht({agent:"kilo",commands:["kilo","kilo-code"],commandExists:o,configPaths:Ot({home:t,kiloHome:e.kiloHome})}),I({agent:"codex",command:"codex",commandExists:o,configPaths:[r]})]}import{existsSync as In,mkdirSync as Yt,readFileSync as Sn,renameSync as jn,writeFileSync as On}from"node:fs";import{dirname as xn,join as le}from"node:path";import{existsSync as nn,mkdirSync as sn,readFileSync as cn,renameSync as an,rmSync as ln,writeFileSync as un}from"node:fs";import{dirname as pn,join as dn}from"node:path";function gn(e){return`'${e.replace(/'/g,"'\\''")}'`}function fn(e){if(!nn(e))return{};let t;try{t=JSON.parse(cn(e,"utf8"))}catch{throw new Error(`Invalid existing Agy hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Agy hooks.json at ${e}: root must be a JSON object.`);return t}function mn(e,t){sn(pn(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{un(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),an(o,e)}finally{ln(o,{force:!0})}}function Gt(e={}){let t=e.pluginName??"toolnet-memory",o=e.hooksFile??dn(X(t),"hooks.json"),r=fn(o),n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",s=`${gn(n)} session:agy-hook`;return r["toolnet-memory"]={enabled:!0,PreToolUse:[{matcher:"view_file|list_dir|find_by_name|grep_search|run_command",hooks:[{type:"command",command:`${s} pre-tool`,timeout:5}]}],PreInvocation:[{type:"command",command:`${s} pre`,timeout:15}],PostInvocation:[{type:"command",command:`${s} post`,timeout:15}],Stop:[{type:"command",command:`${s} stop`,timeout:30}]},mn(o,r),o}import{existsSync as yn,mkdirSync as hn,readFileSync as kn,renameSync as bn,writeFileSync as Cn}from"node:fs";import{dirname as vn}from"node:path";function D(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function wn(e,t){hn(vn(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;Cn(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),bn(o,e)}function Kt(e){if(!yn(e))return{};let t=kn(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Agy MCP config at ${e}: parse error. Not overwriting.`)}if(!D(o))throw new Error(`Invalid existing Agy MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Bt(e,t){return D(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function ae(e,t,o,r){let n=Kt(e),s=n.mcpServers;if(s!==void 0&&!D(s))throw new Error(`Invalid existing Agy MCP config: mcpServers must be an object in ${e}.`);let i=D(s)?{...s}:{},c=i[o];if(Bt(c,t)&&!r)return{installed:!0,changed:!1};i[o]={command:t,args:["mcp"]};let a={...n,mcpServers:i};wn(e,a);let u=Kt(e).mcpServers;if(!D(u)||!Bt(u[o],t))throw new Error(`Agy MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function Ut(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...ae(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(r==="both"){let i=z(),c=q({cwd:e.cwd}),a=ae(i,t,o,e.force??!1),l=ae(c,t,o,e.force??!1);return{installed:!0,changed:a.changed||l.changed,configFile:i,serverName:o,command:t,args:["mcp"]}}let n=r==="workspace"?q({cwd:e.cwd}):z();return{...ae(n,t,o,e.force??!1),configFile:n,serverName:o,command:t,args:["mcp"]}}var Rn=`# ToolNet Memory Continuity

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
`;function Mn(e,t){Yt(xn(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;On(o,t,{encoding:"utf8",mode:384}),jn(o,e)}function Wt(e,t){In(e)&&Sn(e,"utf8")===t||Mn(e,t)}function Vt(e={}){let t=e.pluginName??"toolnet-memory",o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.pluginRoot??X(t),n=le(r,"plugin.json"),s=le(r,"mcp_config.json"),i=le(r,"hooks.json"),c=le(r,"rules","toolnet-memory-continuity.md");return Yt(r,{recursive:!0,mode:448}),Wt(n,`${JSON.stringify({$schema:"https://antigravity.google/schemas/v1/plugin.json",name:t,description:"Persistent project continuity and memory for Antigravity coding sessions."},null,2)}
`),Ut({configFile:s,binary:o,serverName:"toolnet-memory",force:e.force}),Gt({hooksFile:i,binary:o,pluginName:t}),Wt(c,`${Rn.trim()}
`),{installed:!0,pluginRoot:r,files:[n,s,i,c]}}import{existsSync as Tn,mkdirSync as Qt,readFileSync as An,writeFileSync as Zt}from"node:fs";import{join as qt}from"node:path";var En="memory_agent_ask";function zt(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${En}

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
`.trim()}var Xt="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",Ne="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function Fn(e={}){let t=ht();Qt(M(),{recursive:!0});let o=`${Xt}
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


${zt()}

${Ne}`,r=Tn(t)?An(t,"utf8"):"",n=r.indexOf(Xt),s=r.indexOf(Ne);return n>=0&&s>=n?r=r.slice(0,n)+o+r.slice(s+Ne.length):(r=r.trimEnd(),r&&(r+=`

`),r+=o),Zt(t,r.trimEnd()+`
`,{encoding:"utf8",mode:384}),t}function eo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[];o.push(Fn({cwd:e.cwd}));let r=e.scope??"global",n=[];if((r==="global"||r==="both")&&n.push(e.directory??yt()),r==="project"||r==="both"){let s=e.cwd??process.cwd();n.push(qt(s,".opencode","plugins"))}for(let s of n){Qt(s,{recursive:!0});let i=qt(s,"toolnet-memory.js"),c=`
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

const PROJECT_REFRESH_MS = 60000

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

    let refreshInFlight =
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

        if (
          !localOnly
        ) {
          void refreshProjection(
            "after-remote-sync"
          )
        }
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

    function refreshProjection(
      reason = "unknown"
    ) {
      if (
        refreshInFlight
      ) {
        return refreshInFlight
      }

      refreshInFlight =
        runWithTimeout(
          [
            TOOLNET_BINARY,
            "background:refresh",
            "--project",
            projectRoot,
            "--quiet",
          ],
          {
            timeout:
              REMOTE_TIMEOUT_MS,
          }
        )
          .then(
            () => {
              writeStatus({
                active: true,
                projectRoot,
                reason,
                state:
                  "projection-refresh-success",
              })
            }
          )
          .catch(
            error => {
              writeStatus({
                active: true,
                projectRoot,
                reason,
                state:
                  "projection-refresh-failed",
                error:
                  error instanceof
                  Error
                    ? error.message
                    : String(
                        error
                      ),
              })

              return undefined
            }
          )
          .finally(
            () => {
              refreshInFlight =
                null
            }
          )

      return refreshInFlight
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

    /*
     * Shared project projection refresh.
     *
     * Pulls memory/work operations created by other
     * agents or VPS hosts and rebuilds local/shared
     * current.json projection caches.
     *
     * Overlap is prevented by refreshInFlight.
     */
    const projectRefreshPeriodic =
      setInterval(
        () => {
          void refreshProjection(
            "periodic-project-refresh"
          )
        },
        PROJECT_REFRESH_MS
      )

    /*
     * First refresh is asynchronous.
     * Plugin startup must not wait for remote storage.
     */
    void refreshProjection(
      "plugin-startup"
    )

    for (
      const timer of [
        localPeriodic,
        remotePeriodic,
        projectRefreshPeriodic,
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

        clearInterval(
          projectRefreshPeriodic
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
`;Zt(i,c.trimStart(),{encoding:"utf8",mode:384}),o.push(i)}return o}import{existsSync as ro,mkdirSync as Pn,readFileSync as Nn,renameSync as _n,writeFileSync as Dn}from"node:fs";import{dirname as no,join as $n}from"node:path";function $(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Hn(e,t){Pn(no(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;Dn(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),_n(o,e)}function to(e){if(!ro(e))return{};let t=Nn(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing OpenCode config at ${e}: parse error. Not overwriting.`)}if(!$(o))throw new Error(`Invalid existing OpenCode config at ${e}: root must be a JSON object. Not overwriting.`);return o}function oo(e,t){if(!$(e))return!1;let o=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(o)&&o.length===2&&o[0]===t&&o[1]==="mcp"}function ue(e,t,o,r){let n=$n(no(e),"opencode.jsonc"),s=ro(n)?n:void 0,i=to(e),c=i.mcp;if(c!==void 0&&!$(c))throw new Error(`Invalid existing OpenCode config: mcp must be an object in ${e}.`);let a=$(c)?{...c}:{},l=a[o];if(oo(l,t)&&!r)return{installed:!0,changed:!1,preservedJsonc:s};a[o]={type:"local",command:[t,"mcp"],enabled:!0};let u={...i,mcp:a};Hn(e,u);let p=to(e);if(!$(p.mcp)||!oo(p.mcp[o],t))throw new Error(`OpenCode MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0,preservedJsonc:s}}function io(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...ue(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:[t,"mcp"]};if(r==="both"){let i=Ce(),c=ve({cwd:e.cwd}),a=ue(i,t,o,e.force??!1),l=ue(c,t,o,e.force??!1);return{installed:!0,changed:a.changed||l.changed,configFile:i,serverName:o,command:[t,"mcp"],preservedJsonc:a.preservedJsonc??l.preservedJsonc}}let n=r==="project"?ve({cwd:e.cwd}):Ce();return{...ue(n,t,o,e.force??!1),configFile:n,serverName:o,command:[t,"mcp"]}}import{existsSync as Jn,mkdirSync as so,readFileSync as Ln,writeFileSync as co}from"node:fs";import{homedir as ao}from"node:os";import{dirname as lo,join as _e}from"node:path";function Gn(e){let t=[],o=/"((?:\\.|[^"\\])*)"|'([^']*)'/g,r;for(;r=o.exec(e);){let n=r[1]??r[2]??"";try{t.push(r[1]!==void 0?JSON.parse(`"${n}"`):n)}catch{t.push(n)}}return t}function uo(e={}){let t=e.configFile??_e(process.env.CODEX_HOME??_e(ao(),".codex"),"config.toml"),o=e.previousFile??_e(ao(),".config","toolnet-memory","codex-notify-previous.json");so(lo(t),{recursive:!0}),so(lo(o),{recursive:!0});let r=Jn(t)?Ln(t,"utf8"):"",n=e.binary??"toolnet-memory",s=`notify = [${JSON.stringify(n)}, "session:codex-notify"]`,i=r.split(`
`),c=i.findIndex(d=>/^\s*\[/.test(d));c<0&&(c=i.length);let a=-1,l=-1;for(let d=0;d<c;d+=1)if(/^\s*notify\s*=/.test(i[d])){if(a=d,l=d,i[d].includes("[")&&!i[d].includes("]"))for(;l+1<c&&(l+=1,!i[l].includes("]")););break}let u=[];if(a>=0){let d=i.slice(a,l+1).join(`
`);u=Gn(d),i.splice(a,l-a+1,s)}else c=i.findIndex(d=>/^\s*\[/.test(d)),c<0&&(c=i.length),i.splice(c,0,s);let p=u.length>=2&&u[u.length-1]==="session:codex-notify";return u.length>0&&!p&&co(o,JSON.stringify(u,null,2)+`
`,{encoding:"utf8",mode:384}),r=i.join(`
`),r.endsWith(`
`)||(r+=`
`),co(t,r,{encoding:"utf8",mode:384}),{configFile:t,previousFile:o,preservedPrevious:u.length>0&&!p}}import{existsSync as Kn,mkdirSync as Bn,readFileSync as Un,writeFileSync as Wn}from"node:fs";import{homedir as Yn}from"node:os";import{dirname as Vn,join as po}from"node:path";function zn(e){return`'${e.replace(/'/g,"'\\''")}'`}function go(e={}){let t=e.hooksFile??po(process.env.CODEX_HOME??po(Yn(),".codex"),"hooks.json");Bn(Vn(t),{recursive:!0});let o={};if(Kn(t))try{o=JSON.parse(Un(t,"utf8"))}catch(c){throw new Error(`Invalid existing Codex hooks.json: ${c instanceof Error?c.message:String(c)}`)}let r=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=r;let s=(Array.isArray(r.SessionStart)?r.SessionStart:[]).filter(c=>{try{return!JSON.stringify(c).includes("session:codex-context")}catch{return!0}}),i=e.binary??"toolnet-memory";return s.push({matcher:"startup|resume|clear|compact",hooks:[{type:"command",command:`${zn(i)} session:codex-context`,timeout:15,additionalContextLimit:1e3,statusMessage:"Loading ToolNet project continuity"}]}),r.SessionStart=s,Wn(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),t}import{spawnSync as qn}from"node:child_process";function De(e,t){return qn(e,t,{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}function fo(e,t){let o=De(e,["mcp","get",t,"--json"]);if(o.status!==0||!o.stdout)return null;try{return JSON.parse(o.stdout)}catch{return null}}function mo(e,t){return e.enabled!==!1&&e.transport?.type==="stdio"&&e.transport?.command===t&&Array.isArray(e.transport?.args)&&e.transport?.args.length===1&&e.transport.args[0]==="mcp"}function yo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.codexBinary??"codex",r=e.serverName??"toolnet-memory",n=fo(o,r);if(n&&mo(n,t))return{installed:!0,changed:!1,serverName:r,command:t,args:["mcp"]};if(n){let c=De(o,["mcp","remove",r]);if(c.status!==0)return{installed:!1,changed:!1,serverName:r,command:t,args:["mcp"],error:(c.stderr||c.stdout||"Unable to remove old ToolNet MCP configuration.").trim()}}let s=De(o,["mcp","add",r,"--",t,"mcp"]);if(s.status!==0)return{installed:!1,changed:!1,serverName:r,command:t,args:["mcp"],error:(s.stderr||s.stdout||"Unable to register ToolNet MCP.").trim()};let i=fo(o,r);return!i||!mo(i,t)?{installed:!1,changed:!0,serverName:r,command:t,args:["mcp"],error:"Codex accepted MCP registration but verification did not match expected ToolNet command."}:{installed:!0,changed:!0,serverName:r,command:t,args:["mcp"]}}import{existsSync as Xn,mkdirSync as Qn,readFileSync as Zn,renameSync as ei,rmSync as ti,writeFileSync as oi}from"node:fs";import{dirname as ri}from"node:path";function H(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function ni(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function ii(e){if(!Xn(e))return{};let t;try{t=JSON.parse(Zn(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude settings.json: ${o instanceof Error?o.message:String(o)}`)}if(!H(t))throw new Error("Invalid existing Claude settings.json: root must be a JSON object.");return t}function $e(e){if(e===void 0)return[];if(!Array.isArray(e))throw new Error("Invalid existing Claude settings.json: hook event must be an array.");let t=[];for(let o of e){if(!H(o)){t.push(o);continue}let r=o.hooks;if(!Array.isArray(r)){t.push(o);continue}let n=r.filter(s=>{if(!H(s))return!0;let i=s.command;return!(typeof i=="string"&&i.includes("session:claude-hook"))});n.length!==0&&t.push({...o,hooks:n})}return t}function He(e){return{type:"command",command:e,timeout:10}}function si(e,t){Qn(ri(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{oi(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),ei(o,e)}finally{ti(o,{force:!0})}}function ho(e={}){let t=e.settingsFile??bt(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=ii(t),n=r.hooks;if(n!==void 0&&!H(n))throw new Error("Invalid existing Claude settings.json: hooks must be an object.");let s=H(n)?{...n}:{},i=`${ni(o)} session:claude-hook`,c=$e(s.SessionStart);c.push({matcher:"startup|resume|clear|compact",hooks:[He(i)]}),s.SessionStart=c;let a=$e(s.PostToolUse);a.push({matcher:"Edit|Write",hooks:[He(i)]}),s.PostToolUse=a;let l=$e(s.Stop);l.push({hooks:[He(i)]}),s.Stop=l;let u={...r,hooks:s},p=JSON.stringify(r),d=JSON.stringify(u);return p===d?{settingsFile:t,changed:!1}:(si(t,u),{settingsFile:t,changed:!0})}import{existsSync as ci,mkdirSync as ai,readFileSync as li,renameSync as ui,rmSync as pi,writeFileSync as di}from"node:fs";import{dirname as gi}from"node:path";function J(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function ko(e){if(!ci(e))return{};let t;try{t=JSON.parse(li(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude Code config: ${o instanceof Error?o.message:String(o)}`)}if(!J(t))throw new Error("Invalid existing Claude Code config: root must be a JSON object.");return t}function bo(e,t){if(!J(e))return!1;let o=e.args;return e.type==="stdio"&&e.command===t&&Array.isArray(o)&&o.length===1&&o[0]==="mcp"}function fi(e,t){ai(gi(e),{recursive:!0});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{di(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),ui(o,e)}finally{pi(o,{force:!0})}}function Co(e={}){let t=e.stateFile??Ct(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=ko(t),s=n.mcpServers;if(s!==void 0&&!J(s))throw new Error("Invalid existing Claude Code config: mcpServers must be an object.");let i=J(s)?{...s}:{},c=i[r];if(bo(c,o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:[o,"mcp"],repaired:!1};let a=c!==void 0;i[r]={type:"stdio",command:o,args:["mcp"]},fi(t,{...n,mcpServers:i});let u=ko(t).mcpServers;if(!J(u)||!bo(u[r],o))throw new Error("Claude Code MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:[o,"mcp"],repaired:a}}function vo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=ho({binary:t,settingsFile:e.settingsFile}),r=Co({binary:t,stateFile:e.stateFile});return{hooks:o,mcp:r,files:[o.settingsFile,r.configFile]}}import{existsSync as mi,mkdirSync as yi,readFileSync as hi,renameSync as ki,rmSync as bi,writeFileSync as Ci}from"node:fs";import{dirname as vi}from"node:path";var E="ToolNet Memory - ";function So(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function wi(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function wo(e){if(!mi(e))return{};let t=hi(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro hooks file at ${e}: parse error. Not overwriting.`)}if(!So(o))throw new Error(`Invalid existing Kiro hooks file at ${e}: root must be a JSON object. Not overwriting.`);return o}function Io(e){return So(e)?typeof e.name=="string"&&e.name.startsWith(E):!1}function L(e){return{type:"command",command:e}}function Ii(e){return[{name:`${E}Session Start`,description:"Inject compact local ToolNet continuity and capture Kiro session activation.",trigger:"SessionStart",action:L(e),timeout:10,enabled:!0},{name:`${E}Prompt Continuity`,description:"Capture prompts and refresh ToolNet guidance only for resume/continue requests.",trigger:"UserPromptSubmit",action:L(e),timeout:10,enabled:!0},{name:`${E}Raw History Guard`,description:"Prevent Kiro from reconstructing continuity from raw ToolNet/agent session history.",trigger:"PreToolUse",matcher:"*",action:L(e),timeout:10,enabled:!0},{name:`${E}Tool Capture`,description:"Capture durable tool activity while filtering noisy read-only events.",trigger:"PostToolUse",matcher:"*",action:L(e),timeout:15,enabled:!0},{name:`${E}Final Flush`,description:"Flush pending Kiro WAL events when the assistant finishes a turn.",trigger:"Stop",action:L(e),timeout:30,enabled:!0}]}function Si(e,t){yi(vi(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Ci(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),ki(o,e)}finally{bi(o,{force:!0})}}function pe(e,t,o){let r=wo(e);if(r.version!==void 0&&r.version!=="v1")throw new Error(`Unsupported existing Kiro hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!Array.isArray(n))throw new Error("Invalid existing Kiro hooks file: hooks must be an array.");let s=Array.isArray(n)?n.filter(l=>!Io(l)):[],i=Ii(t),c={...r,version:"v1",hooks:[...s,...i]};if(!o&&JSON.stringify(r)===JSON.stringify(c))return{changed:!1,hookCount:i.length};Si(e,c);let a=wo(e);if(a.version!=="v1"||!Array.isArray(a.hooks)||a.hooks.filter(Io).length!==i.length)throw new Error("Kiro hooks were written but verification failed.");return{changed:!0,hookCount:i.length}}function jo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=`${wi(t)} session:kiro-hook`;if(e.hooksFile){let i=pe(e.hooksFile,r,e.force??!1);return{hooksFile:e.hooksFile,...i}}if(o==="both"){let i=Oe(),c=xe({cwd:e.cwd}),a=pe(i,r,e.force??!1),l=pe(c,r,e.force??!1);return{hooksFile:i,changed:a.changed||l.changed,hookCount:a.hookCount}}let n=o==="project"?xe({cwd:e.cwd}):Oe(),s=pe(n,r,e.force??!1);return{hooksFile:n,...s}}import{existsSync as ji,mkdirSync as Oi,readFileSync as xi,renameSync as Ri,rmSync as Mi,writeFileSync as Ei}from"node:fs";import{dirname as Ti}from"node:path";function G(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Oo(e){if(!ji(e))return{};let t=xi(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro MCP config at ${e}: parse error. Not overwriting.`)}if(!G(o))throw new Error(`Invalid existing Kiro MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function xo(e,t){return G(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&e.disabled===!1:!1}function Ai(e,t){Oi(Ti(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Ei(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Ri(o,e)}finally{Mi(o,{force:!0})}}function de(e,t,o,r){let n=Oo(e),s=n.mcpServers;if(s!==void 0&&!G(s))throw new Error(`Invalid existing Kiro MCP config: mcpServers must be an object in ${e}.`);let i=G(s)?{...s}:{},c=i[o];if(xo(c,t)&&!r)return{installed:!0,changed:!1};i[o]={command:t,args:["mcp"],disabled:!1};let a={...n,mcpServers:i};Ai(e,a);let u=Oo(e).mcpServers;if(!G(u)||!xo(u[o],t))throw new Error(`Kiro MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function Ro(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...de(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(r==="both"){let i=Q(),c=je({cwd:e.cwd}),a=de(i,t,o,e.force??!1),l=de(c,t,o,e.force??!1);return{installed:!0,changed:a.changed||l.changed,configFile:i,serverName:o,command:t,args:["mcp"]}}let n=r==="project"?je({cwd:e.cwd}):Q();return{...de(n,t,o,e.force??!1),configFile:n,serverName:o,command:t,args:["mcp"]}}function Mo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=Ro({binary:t,configFile:e.configFile,scope:e.scope,cwd:e.cwd,force:e.force}),r=jo({binary:t,hooksFile:e.hooksFile,scope:e.scope,cwd:e.cwd,force:e.force});return{installed:o.installed,changed:o.changed||r.changed,mcp:o,hooks:r,files:[o.configFile,r.hooksFile]}}import{existsSync as Fi,mkdirSync as Pi,readFileSync as Ni,renameSync as _i,rmSync as Di,writeFileSync as $i}from"node:fs";import{dirname as Hi}from"node:path";function Je(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Ji(e){if(!Fi(e))return{};let t=Ni(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: parse error. Not overwriting.`)}if(!Je(o))throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Li(e,t){Pi(Hi(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{$i(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),_i(o,e)}finally{Di(o,{force:!0})}}function Eo(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??It({cwd:e.cwd}),r=Ji(o),n="toolnet-memory";if(Je(r.mcpServers)&&r.mcpServers[n]!=null&&!e.force)return{installed:!0,changed:!1,configFile:o};let i=Je(r.mcpServers)?{...r.mcpServers}:{};return i[n]={command:t,args:["mcp"]},r.mcpServers=i,Li(o,r),{installed:!0,changed:!0,configFile:o}}function To(e={}){let t=e.binary??"toolnet-memory",o=Eo({binary:t,configFile:e.configFile,force:e.force,cwd:e.cwd});return{installed:o.installed,changed:o.changed,mcp:{...o,configured:o.installed},files:[o.configFile]}}import{mkdirSync as zi,existsSync as qi}from"node:fs";import{dirname as Xi}from"node:path";import{existsSync as Gi,mkdirSync as Ki,readFileSync as Bi,renameSync as Ui,rmSync as Wi,writeFileSync as Yi}from"node:fs";import{dirname as Vi}from"node:path";function m(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function S(e,t){if(!Gi(e))return{};let o=Bi(e,"utf8").trim();if(!o)return{};let r;try{r=JSON.parse(o)}catch(n){throw new Error(`Invalid existing ${t} MCP config: ${n instanceof Error?n.message:String(n)}`)}if(!m(r))throw new Error(`Invalid existing ${t} MCP config: root must be a JSON object.`);return r}function T(e,t){Ki(Vi(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Yi(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Ui(o,e)}finally{Wi(o,{force:!0})}}function Ao(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??Ee(),r=Xi(o);qi(r)||zi(r,{recursive:!0});let n=S(o,"Kilo"),s=n.mcp;if(s!==void 0&&!m(s))throw new Error("Invalid existing Kilo config: mcp must be an object.");let i=m(s)?{...s}:{},c="toolnet-memory";return m(i[c])&&!e.force?{installed:!0,changed:!1,configFile:o,configured:!0}:(i[c]={type:"local",command:[t,"mcp"],enabled:!0,timeout:1e4},T(o,{...n,mcp:i}),{installed:!0,changed:!0,configFile:o,configured:!0})}function Fo(e={}){let t=e.binary??"toolnet-memory",o=Ao({binary:t,configFile:e.configFile,force:e.force});return{installed:o.installed,changed:o.changed,mcp:o,files:[o.configFile]}}import{existsSync as Qi,mkdirSync as Zi,readFileSync as es,renameSync as ts,rmSync as os,writeFileSync as rs}from"node:fs";import{dirname as ns}from"node:path";function g(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function C(e,t){if(!Qi(e))return{};let o=es(e,"utf8").trim();if(!o)return{};let r;try{r=JSON.parse(o)}catch(n){throw new Error(`Invalid existing ${t} hooks file: ${n instanceof Error?n.message:String(n)}`)}if(!g(r))throw new Error(`Invalid existing ${t} hooks file: root must be a JSON object.`);return r}function A(e,t){Zi(ns(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{rs(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),ts(o,e)}finally{os(o,{force:!0})}}function Le(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}var K=[["sessionStart",10],["beforeSubmitPrompt",10],["preToolUse",10],["postToolUse",15],["afterAgentResponse",15],["stop",30]];function Po(e){return g(e)&&typeof e.command=="string"&&e.command.includes("session:cursor-hook")}function is(e,t,o){let n={type:"command",command:`TOOLNET_HOOK_EVENT=${Le(e)} ${Le(t)} session:cursor-hook`,timeout:o};return e==="preToolUse"&&(n.matcher=".*"),n}function Ge(e={}){let t=e.hooksFile??te(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=C(t,"Cursor");if(r.version!==void 0&&r.version!==1)throw new Error(`Unsupported existing Cursor hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!g(n))throw new Error("Invalid existing Cursor hooks file: hooks must be an object.");let s=g(n)?{...n}:{};for(let[l,u]of K){let p=s[l];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing Cursor hooks file: hooks.${l} must be an array.`);let d=Array.isArray(p)?p.filter(N=>!Po(N)):[];s[l]=[...d,is(l,o,u)]}let i={...r,version:1,hooks:s};if(JSON.stringify(r)===JSON.stringify(i))return{hooksFile:t,changed:!1,hookCount:K.length};A(t,i);let c=C(t,"Cursor");if(c.version!==1||!g(c.hooks))throw new Error("Cursor hooks were written but verification failed.");let a=0;for(let[l]of K){let u=c.hooks[l];if(!Array.isArray(u))throw new Error("Cursor hooks were written but verification failed.");a+=u.filter(Po).length}if(a!==K.length)throw new Error("Cursor hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:K.length}}function No(e,t){return m(e)?(e.type===void 0||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function Ke(e={}){let t=e.configFile??ee(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=S(t,"Cursor"),s=n.mcpServers;if(s!==void 0&&!m(s))throw new Error("Invalid existing Cursor MCP config: mcpServers must be an object.");let i=m(s)?{...s}:{};if(No(i[r],o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};i[r]={type:"stdio",command:o,args:["mcp"]},T(t,{...n,mcpServers:i});let a=S(t,"Cursor").mcpServers;if(!m(a)||!No(a[r],o))throw new Error("Cursor MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}import{mkdirSync as ss,readFileSync as _o,renameSync as cs,rmSync as as,writeFileSync as ls}from"node:fs";import{dirname as us}from"node:path";var Be=`---
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
`;function ps(e,t){ss(us(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{ls(o,t,{encoding:"utf8",mode:384}),cs(o,e)}finally{as(o,{force:!0})}}function Do(e){let t=e.ruleFile??Mt(e.projectRoot);try{if(_o(t,"utf8")===Be)return{ruleFile:t,changed:!1}}catch{}if(ps(t,Be),_o(t,"utf8")!==Be)throw new Error("Cursor ToolNet project rule was written but verification failed.");return{ruleFile:t,changed:!0}}import{spawnSync as ds}from"node:child_process";import{existsSync as F,statSync as gs}from"node:fs";import{dirname as fs,join as ms,parse as ys,resolve as We}from"node:path";function $o(e){let t=We(e);if(!F(t))throw new Error(`Project path does not exist: ${t}`);if(!gs(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);return t}function ge(e){return ms(e,".toolnet","project.json")}function hs(e){let t=We(e),o=ys(t).root;for(;;){if(F(ge(t)))return t;if(t===o)return;let r=fs(t);if(r===t)return;t=r}}function Ue(e){let t=ds("git",["rev-parse","--show-toplevel"],{cwd:e,encoding:"utf8",timeout:5e3});if(t.status!==0)return;let o=t.stdout.trim();return o?We(o):void 0}function v(e={}){let t=$o(e.cwd??process.cwd());if(e.project){let n=$o(e.project),s=ge(n),i=Ue(n);return{root:n,source:"explicit",eligible:!0,toolnetProject:F(s),manifestFile:F(s)?s:void 0,gitRoot:i}}let o=hs(t);if(o){let n=ge(o);return{root:o,source:"toolnet",eligible:!0,toolnetProject:!0,manifestFile:n,gitRoot:Ue(o)}}let r=Ue(t);if(r){let n=ge(r);return{root:r,source:"git",eligible:!0,toolnetProject:F(n),manifestFile:F(n)?n:void 0,gitRoot:r}}return{root:t,source:"cwd",eligible:!1,toolnetProject:!1}}function Go(e,t={}){let o=[],r=e.indexOf("--scope");if(r>=0){let s=e[r+1];if(s!=="global"&&s!=="project"&&s!=="both")throw new Error(`Invalid --scope value: ${String(s)}`);o.push(s)}e.includes("--global")&&o.push("global"),e.includes("--both")&&o.push("both");let n=Array.from(new Set(o));if(n.length>1)throw new Error(`Conflicting integration scopes: ${n.join(", ")}`);return n[0]??t.defaultScope??"global"}function Ho(e,t){return{install:e,effective:t}}function w(e,t){return{surface:e,global:Ho(t.globalInstall,t.effective==="global"||t.effective==="both"),project:Ho(t.projectInstall,t.effective==="project"||t.effective==="both"),effective:t.effective,risk:t.risk??"none",dedupeRequired:t.dedupeRequired??!1,trustRequired:t.trustRequired??t.projectInstall,note:t.note}}function ks(e){return{mcp:w("mcp",{globalInstall:!0,projectInstall:!1,effective:"global"}),hooks:w("hooks",{globalInstall:!0,projectInstall:!1,effective:"global"}),work:w("work",{globalInstall:e==="grok",projectInstall:!1,effective:e==="grok"?"global":"none",note:e==="grok"?"Grok supports a global ToolNet continuity skill.":"Cursor/Copilot work instructions remain project-scoped."})}}function Jo(e){return{mcp:w("mcp",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),hooks:w("hooks",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),work:w("work",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!1,note:e==="cursor"?"Use .cursor/rules/toolnet-memory.mdc.":e==="copilot"?"Use .github/instructions/toolnet-memory.instructions.md.":"Use .grok/skills/toolnet-continuity/SKILL.md."})}}function Lo(e){return{mcp:w("mcp",{globalInstall:!0,projectInstall:!0,effective:"project",risk:e==="cursor"?"precedence-unverified":"shadowed-global",trustRequired:!0,note:e==="cursor"?"Project ToolNet MCP is the intended effective definition; native same-name precedence must be E2E certified before release.":"Global remains useful outside the project; same-name project definition wins inside the project."}),hooks:w("hooks",{globalInstall:!0,projectInstall:!0,effective:"both",risk:"additive-duplicate",dedupeRequired:!0,trustRequired:!0,note:"Global and project hook sources can both execute for the same native event."}),work:w("work",{globalInstall:e==="grok",projectInstall:!0,effective:"project",risk:e==="grok"?"shadowed-global":"none",trustRequired:!1,note:e==="cursor"?"Project rule is authoritative.":e==="copilot"?"Project instruction is authoritative.":"Project skill shadows the same-name global skill inside the project."})}}function P(e){let{agent:t,scope:o,project:r}=e;return(o==="project"||o==="both")&&(!r||!r.eligible)?{agent:t,requestedScope:o,project:r,surfaces:o==="both"?Lo(t):Jo(t),canInstall:!1,reason:"Project scope requires an explicit project, existing ToolNet project, or Git repository root."}:{agent:t,requestedScope:o,project:r,surfaces:o==="global"?ks(t):o==="project"?Jo(t):Lo(t),canInstall:!0}}function Ko(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.rule?.changed)}function Bo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:v({project:e.projectRoot}),n=P({agent:"cursor",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Cursor project integration scope cannot be resolved.");let s,i;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(s={},n.surfaces.mcp.global.install&&(s.mcp=Ke({binary:t,configFile:e.configFile??ee()})),n.surfaces.hooks.global.install&&(s.hooks=Ge({binary:t,hooksFile:e.hooksFile??te()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Cursor project integration requires an eligible project root.");i={},n.surfaces.mcp.project.install&&(i.mcp=Ke({binary:t,configFile:e.projectConfigFile??xt(r.root)})),n.surfaces.hooks.project.install&&(i.hooks=Ge({binary:t,hooksFile:e.projectHooksFile??Rt(r.root)})),n.surfaces.work.project.install&&(i.rule=Do({projectRoot:r.root,ruleFile:e.projectRuleFile}))}let c=i?.mcp??s?.mcp,a=i?.hooks??s?.hooks;if(!c||!a)throw new Error("Cursor integration did not produce an effective MCP/hooks installation.");let l=Array.from(new Set([s?.mcp?.configFile,s?.hooks?.hooksFile,s?.rule?.ruleFile,i?.mcp?.configFile,i?.hooks?.hooksFile,i?.rule?.ruleFile].filter(u=>typeof u=="string")));return{installed:!0,changed:Ko(s)||Ko(i),scope:o,plan:n,project:r,global:s,projectScope:i,mcp:c,hooks:a,rule:i?.rule,files:l}}var B=[["sessionStart",10],["userPromptSubmitted",10],["userPromptTransformed",10],["preToolUse",10],["postToolUse",15],["agentStop",30]];function bs(e){if(typeof e.command=="string")return e.command;if(typeof e.bash=="string")return e.bash}function Uo(e){return g(e)&&bs(e)?.includes("session:copilot-hook")===!0}function Cs(e,t,o){let r={type:"command",command:`${t} session:copilot-hook`,env:{TOOLNET_HOOK_EVENT:e},timeoutSec:o};return e==="preToolUse"&&(r.matcher=".*"),r}function Ye(e={}){let t=e.hooksFile??re(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=C(t,"GitHub Copilot CLI");if(r.version!==void 0&&r.version!==1)throw new Error(`Unsupported existing GitHub Copilot CLI hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!g(n))throw new Error("Invalid existing GitHub Copilot CLI hooks file: hooks must be an object.");let s=g(n)?{...n}:{};for(let[l,u]of B){let p=s[l];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing GitHub Copilot CLI hooks file: hooks.${l} must be an array.`);let d=Array.isArray(p)?p.filter(N=>!Uo(N)):[];s[l]=[...d,Cs(l,o,u)]}let i={...r,version:1,hooks:s};if(JSON.stringify(r)===JSON.stringify(i))return{hooksFile:t,changed:!1,hookCount:B.length};A(t,i);let c=C(t,"GitHub Copilot CLI");if(c.version!==1||!g(c.hooks))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");let a=0;for(let[l]of B){let u=c.hooks[l];if(!Array.isArray(u))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");a+=u.filter(Uo).length}if(a!==B.length)throw new Error("GitHub Copilot CLI hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:B.length}}function Wo(e,t){return m(e)?(e.type===void 0||e.type==="local"||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&Array.isArray(e.tools)&&e.tools.length===1&&e.tools[0]==="*":!1}function Ve(e={}){let t=e.configFile??oe(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=S(t,"GitHub Copilot CLI"),s=n.mcpServers;if(s!==void 0&&!m(s))throw new Error("Invalid existing GitHub Copilot CLI MCP config: mcpServers must be an object.");let i=m(s)?{...s}:{};if(Wo(i[r],o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};i[r]={type:"stdio",command:o,args:["mcp"],tools:["*"]},T(t,{...n,mcpServers:i});let a=S(t,"GitHub Copilot CLI").mcpServers;if(!m(a)||!Wo(a[r],o))throw new Error("GitHub Copilot CLI MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}import{mkdirSync as vs,readFileSync as Yo,renameSync as ws,rmSync as Is,writeFileSync as Ss}from"node:fs";import{dirname as js}from"node:path";var ze=`---
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
`;function Os(e,t){vs(js(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Ss(o,t,{encoding:"utf8",mode:384}),ws(o,e)}finally{Is(o,{force:!0})}}function Vo(e){let t=e.instructionFile??Ft(e.projectRoot);try{if(Yo(t,"utf8")===ze)return{instructionFile:t,changed:!1}}catch{}if(Os(t,ze),Yo(t,"utf8")!==ze)throw new Error("Copilot ToolNet project instruction verification failed.");return{instructionFile:t,changed:!0}}function zo(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.instruction?.changed)}function qo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:v({project:e.projectRoot}),n=P({agent:"copilot",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Copilot project integration scope cannot be resolved.");let s,i;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(s={},n.surfaces.mcp.global.install&&(s.mcp=Ve({binary:t,configFile:e.configFile??oe()})),n.surfaces.hooks.global.install&&(s.hooks=Ye({binary:t,hooksFile:e.hooksFile??re()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Copilot project integration requires an eligible project root.");i={},n.surfaces.mcp.project.install&&(i.mcp=Ve({binary:t,configFile:e.projectConfigFile??Tt(r.root)})),n.surfaces.hooks.project.install&&(i.hooks=Ye({binary:t,hooksFile:e.projectHooksFile??At(r.root)})),n.surfaces.work.project.install&&(i.instruction=Vo({projectRoot:r.root,instructionFile:e.projectInstructionFile}))}let c=i?.mcp??s?.mcp,a=i?.hooks??s?.hooks;if(!c||!a)throw new Error("Copilot integration did not produce effective MCP/hooks.");let l=Array.from(new Set([s?.mcp?.configFile,s?.hooks?.hooksFile,s?.instruction?.instructionFile,i?.mcp?.configFile,i?.hooks?.hooksFile,i?.instruction?.instructionFile].filter(u=>typeof u=="string")));return{installed:!0,changed:zo(s)||zo(i),scope:o,plan:n,project:r,global:s,projectScope:i,mcp:c,hooks:a,instruction:i?.instruction,files:l}}import{existsSync as xs,mkdirSync as Rs,readFileSync as Xo,renameSync as Ms,rmSync as Es,writeFileSync as Ts}from"node:fs";import{dirname as As}from"node:path";var qe=`---
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
`;function Fs(e,t){Rs(As(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Ts(o,t,{encoding:"utf8",mode:384}),Ms(o,e)}finally{Es(o,{force:!0})}}function Xe(e={}){let t=e.skillFile??ce();if(xs(t)&&Xo(t,"utf8")===qe)return{skillFile:t,changed:!1};if(Fs(t,qe),Xo(t,"utf8")!==qe)throw new Error("Grok ToolNet continuity skill was written but verification failed.");return{skillFile:t,changed:!0}}var U=[["SessionStart",10],["UserPromptSubmit",10],["PreToolUse",10],["PostToolUse",15],["Stop",30]];function Qo(e){return!g(e)||!Array.isArray(e.hooks)?!1:e.hooks.some(t=>g(t)&&typeof t.command=="string"&&t.command.includes("session:grok-hook"))}function Ps(e,t,o){let r={hooks:[{type:"command",command:`${t} session:grok-hook`,timeout:o,env:{TOOLNET_HOOK_EVENT:e}}]};return e==="PreToolUse"&&(r.matcher=".*"),r}function Qe(e={}){let t=e.hooksFile??se(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=C(t,"Grok Build"),n=r.hooks;if(n!==void 0&&!g(n))throw new Error("Invalid existing Grok Build hooks file: hooks must be an object.");let s=g(n)?{...n}:{};for(let[l,u]of U){let p=s[l];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing Grok Build hooks file: hooks.${l} must be an array.`);let d=Array.isArray(p)?p.filter(N=>!Qo(N)):[];s[l]=[...d,Ps(l,o,u)]}let i={...r,hooks:s};if(JSON.stringify(r)===JSON.stringify(i))return{hooksFile:t,changed:!1,hookCount:U.length};A(t,i);let c=C(t,"Grok Build");if(!g(c.hooks))throw new Error("Grok Build hooks were written but verification failed.");let a=0;for(let[l]of U){let u=c.hooks[l];if(!Array.isArray(u))throw new Error("Grok Build hooks were written but verification failed.");a+=u.filter(Qo).length}if(a!==U.length)throw new Error("Grok Build hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:U.length}}import{existsSync as Ns,mkdirSync as _s,readFileSync as Ds,renameSync as $s,rmSync as Hs,writeFileSync as Js}from"node:fs";import{dirname as Ls}from"node:path";function Zo(e){return Ns(e)?Ds(e,"utf8"):""}function Gs(e,t){_s(Ls(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Js(o,t,{encoding:"utf8",mode:384}),$s(o,e)}finally{Hs(o,{force:!0})}}function Ze(e){return e.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t")}function Ks(e){return`[mcp_servers."${Ze(e)}"]`}function Bs(e,t){return[Ks(e),`command = "${Ze(t)}"`,'args = ["mcp"]',"enabled = true"].join(`
`)}function Us(e){let t=e.trim();return t.startsWith("[")&&t.includes("]")}function fe(e){return e.trim().replace(/\s+/g,"")}function Ws(e){return new Set([fe(`[mcp_servers.${e}]`),fe(`[mcp_servers."${e}"]`),fe(`[mcp_servers.'${e}']`)])}function tr(e,t){let o=e.split(/\r?\n/),r=Ws(t),n=-1;for(let u=0;u<o.length;u+=1){let p=fe(o[u].replace(/\s+#.*$/,""));if(r.has(p)){n=u;break}}if(n<0)return null;let s=o.length;for(let u=n+1;u<o.length;u+=1)if(Us(o[u])){s=u;break}let i=[],c=0;for(let u of o)i.push(c),c+=u.length+1;let a=i[n]??0,l=s>=o.length?e.length:i[s]??e.length;return{start:a,end:l}}function Ys(e,t,o){let r=`${Bs(t,o)}
`,n=tr(e,t);if(n){let s=e.slice(0,n.start),i=e.slice(n.end);return`${s}${r}${i.replace(/^\n+/,"")}`}return e.trim()?`${e.replace(/\s*$/,"")}

${r}`:r}function er(e,t,o){let r=tr(e,t);if(!r)return!1;let n=e.slice(r.start,r.end);return n.includes(`command = "${Ze(o)}"`)&&/args\s*=\s*\[\s*"mcp"\s*\]/.test(n)&&/enabled\s*=\s*true/.test(n)}function et(e={}){let t=e.configFile??ie(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=Zo(t);if(er(n,r,o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};let s=Ys(n,r,o);Gs(t,s);let i=Zo(t);if(!er(i,r,o))throw new Error("Grok Build MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}function or(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.skill?.changed)}function rr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:v({project:e.projectRoot}),n=P({agent:"grok",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Grok project integration scope cannot be resolved.");let s,i;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(s={},n.surfaces.mcp.global.install&&(s.mcp=et({binary:t,configFile:e.configFile??ie()})),n.surfaces.hooks.global.install&&(s.hooks=Qe({binary:t,hooksFile:e.hooksFile??se()})),n.surfaces.work.global.install&&(s.skill=Xe({skillFile:e.skillFile??ce()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Grok project integration requires an eligible project root.");i={},n.surfaces.mcp.project.install&&(i.mcp=et({binary:t,configFile:e.projectConfigFile??Nt(r.root)})),n.surfaces.hooks.project.install&&(i.hooks=Qe({binary:t,hooksFile:e.projectHooksFile??_t(r.root)})),n.surfaces.work.project.install&&(i.skill=Xe({skillFile:e.projectSkillFile??Dt(r.root)}))}let c=i?.mcp??s?.mcp,a=i?.hooks??s?.hooks,l=i?.skill??s?.skill;if(!c||!a||!l)throw new Error("Grok integration did not produce effective MCP/hooks/skill.");let u=Array.from(new Set([s?.mcp?.configFile,s?.hooks?.hooksFile,s?.skill?.skillFile,i?.mcp?.configFile,i?.hooks?.hooksFile,i?.skill?.skillFile].filter(p=>typeof p=="string")));return{installed:!0,changed:or(s)||or(i),scope:o,plan:n,project:r,global:s,projectScope:i,mcp:c,hooks:a,skill:l,files:u}}function nr(e={}){if(e.scope==="global")return{scope:"global",automatic:!1,reason:"explicit-global"};if(e.scope==="project"||e.scope==="both"){let o=v({cwd:e.cwd,project:e.projectRoot});if(!o.eligible)throw new Error(`Explicit ${e.scope} integration requires an explicit project, ToolNet project, or Git repository root.`);return{scope:e.scope,automatic:!1,project:o,reason:e.scope==="project"?"explicit-project":"explicit-both"}}let t=v({cwd:e.cwd,project:e.projectRoot});return t.toolnetProject?{scope:"both",automatic:!0,project:t,reason:"toolnet-project"}:{scope:"global",automatic:!0,reason:"no-toolnet-project"}}function ir(){return Lt()}function tt(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[],r=e.detections??ir(),n=new Map(r.map(i=>[i.agent,i.detected])),s=nr({scope:e.scope,projectRoot:e.projectRoot,cwd:e.cwd});if(!(e.force===!0||n.get("agy")===!0))o.push({agent:"agy",detected:!1,installed:!1,targets:[]});else try{let c=Vt({binary:t});o.push({agent:"agy",detected:!0,installed:!0,targets:c.files})}catch(c){o.push({agent:"agy",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("opencode")===!0))o.push({agent:"opencode",detected:!1,installed:!1,targets:[]});else try{let c=eo({binary:t}),a=io({binary:t});o.push({agent:"opencode",detected:!0,installed:!0,targets:[...c,a.configFile,`mcp:${a.serverName}`]})}catch(c){o.push({agent:"opencode",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("claude")===!0))o.push({agent:"claude",detected:!1,installed:!1,targets:[]});else try{let c=vo({binary:t});o.push({agent:"claude",detected:!0,installed:!0,targets:[c.hooks.settingsFile,c.mcp.configFile,`mcp:${c.mcp.serverName}`]})}catch(c){o.push({agent:"claude",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("kiro")===!0))o.push({agent:"kiro",detected:!1,installed:!1,targets:[]});else try{let c=Mo({...e.kiro??{},binary:t});o.push({agent:"kiro",detected:!0,installed:!0,targets:[c.mcp.configFile,`mcp:${c.mcp.serverName}`,c.hooks.hooksFile]})}catch(c){o.push({agent:"kiro",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("cursor")===!0))o.push({agent:"cursor",detected:!1,installed:!1,targets:[]});else try{let c=e.cursor??{},a=Bo({...c,binary:t,scope:c.scope??s.scope,projectRoot:c.projectRoot??s.project?.root});o.push({agent:"cursor",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(c){o.push({agent:"cursor",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("copilot")===!0))o.push({agent:"copilot",detected:!1,installed:!1,targets:[]});else try{let c=e.copilot??{},a=qo({...c,binary:t,scope:c.scope??s.scope,projectRoot:c.projectRoot??s.project?.root});o.push({agent:"copilot",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(c){o.push({agent:"copilot",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("grok")===!0))o.push({agent:"grok",detected:!1,installed:!1,targets:[]});else try{let c=e.grok??{},a=rr({...c,binary:t,scope:c.scope??s.scope,projectRoot:c.projectRoot??s.project?.root});o.push({agent:"grok",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(c){o.push({agent:"grok",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("toolnet-cli")===!0))o.push({agent:"toolnet-cli",detected:!1,installed:!1,targets:[]});else try{let c=e.toolnetCli??{},a=To({...c,binary:t});o.push({agent:"toolnet-cli",detected:!0,installed:!0,targets:[a.mcp.configFile]})}catch(c){o.push({agent:"toolnet-cli",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("kilo")===!0))o.push({agent:"kilo",detected:!1,installed:!1,targets:[]});else try{let c=e.kilo??{},a=Fo({...c,binary:t});o.push({agent:"kilo",detected:!0,installed:!0,targets:[a.mcp.configFile]})}catch(c){o.push({agent:"kilo",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("codex")===!0))o.push({agent:"codex",detected:!1,installed:!1,targets:[]});else try{let c=uo({binary:t}),a=go({binary:t}),l=yo({binary:t});if(!l.installed)throw new Error(l.error??"Codex MCP registration failed");let u=[c.configFile,a,`mcp:${l.serverName}`];c.preservedPrevious&&u.push(c.previousFile),o.push({agent:"codex",detected:!0,installed:!0,targets:u})}catch(c){o.push({agent:"codex",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}return o}function me(e){switch(e){case"agy":return"Agy / Antigravity";case"opencode":return"OpenCode";case"claude":return"Claude Code";case"kiro":return"Kiro CLI";case"cursor":return"Cursor CLI";case"copilot":return"GitHub Copilot CLI";case"grok":return"Grok Build";case"toolnet-cli":return"ToolNet CLI";case"kilo":return"Kilo";case"codex":return"Codex";default:return e}}function Vs(e){console.log(""),console.log("ToolNet Memory Integration Detection"),console.log("===================================="),console.log("");for(let t of e){let o=me(t.agent);if(!t.detected){console.log(`\u25CB ${o}: not detected`);continue}console.log(`\u2713 ${o}: detected`);for(let r of t.evidence)console.log(`  ${r}`)}console.log("")}function zs(e){console.log(""),console.log("ToolNet Memory AI Integrations"),console.log("=============================="),console.log("");for(let t of e){let o=me(t.agent);if(!t.detected){console.log(`- ${o}: not detected`);continue}if(t.installed){let r=t.scope?` [scope=${t.scope}]`:"";console.log(`\u2713 ${o}: automatic memory enabled${r}`),t.projectRoot&&console.log(`  project: ${t.projectRoot}`);continue}console.log(`\u2717 ${o}: integration failed`),t.error&&console.log(`  ${t.error}`)}console.log("")}function qs(e,t){let o=e.indexOf(t);return o>=0?e[o+1]:void 0}function Xs(e){return e.includes("--scope")||e.includes("--global")||e.includes("--both")?Go(e):void 0}async function Qs(){let e=process.argv.slice(2),t=e.includes("--all"),o=e.includes("--json"),r=e.includes("--detect-only"),n=Xs(e),s=qs(e,"--project");if(r){let c=ir();if(o){console.log(JSON.stringify(c,null,2));return}Vs(c);return}let i=tt({force:t,scope:n,projectRoot:s});if(o){console.log(JSON.stringify(i,null,2));return}zs(i)}var Zs=process.argv[1]&&(process.argv[1].endsWith("auto-integrate.js")||process.argv[1].endsWith("auto-integrate.ts"));Zs&&Qs().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});function rc(e=process.cwd()){let t=tc(e);if(!sr(t))throw new Error(`Project path does not exist: ${t}`);if(!ec(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);let o=new Y().detect(t),r=oc(o.rootPath,".toolnet","project.json");if(!sr(r))throw new Error(`ToolNet project initialization failed: ${r} was not created`);return{initialized:!0,project:{id:o.id,name:o.name,remote:o.remote,rootPath:o.rootPath},manifestFile:r}}function nc(e,t){let o=e.indexOf(t);return o>=0?e[o+1]:void 0}async function ic(){let e=process.argv.slice(2),t=e.includes("--json"),o=!e.includes("--no-integrate"),r=nc(e,"--project"),n=e.find((a,l)=>!a.startsWith("-")&&(l===0||e[l-1]!=="--project")),s=r??n??process.cwd(),i=await be("Initializing ToolNet project",()=>rc(s),{enabled:!t}),c=[];if(o&&(c=await be("Detecting coding agents",()=>tt({projectRoot:i.project.rootPath}),{enabled:!t})),t){console.log(JSON.stringify({...i,integrations:c},null,2));return}if(console.log(""),console.log("ToolNet Memory"),console.log("=============="),console.log(""),console.log("\u2713 Project initialized"),console.log(""),console.log(`Project:  ${i.project.name}`),console.log(`ID:       ${i.project.id}`),console.log(`Root:     ${i.project.rootPath}`),console.log(`Manifest: ${i.manifestFile}`),console.log(""),o){console.log("AI integrations:");let a=c.filter(l=>l.detected&&l.installed);if(!a.length)console.log("  \u25CB No supported coding agent detected");else for(let l of a){let u=me(l.agent),p=ct(l.agent);console.log(`  \u2713 ${u} \u2014 ${p}`)}console.log("")}console.log("Next: toolnet-memory doctor"),console.log("")}var sc=process.argv[1]?.endsWith("/init.js")||process.argv[1]?.endsWith("/init.ts");sc&&ic().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});export{rc as initializeToolNetProject};
