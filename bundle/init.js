import{existsSync as oo,statSync as ti}from"node:fs";import{resolve as oi,join as ni}from"node:path";import{existsSync as no,readFileSync as ro}from"node:fs";import{homedir as io}from"node:os";import{join as so}from"node:path";function co(e){let t=e.trim();return t.length>=2&&t.startsWith('"')&&t.endsWith('"')?(t=t.slice(1,-1),t.replace(/\\n/g,`
`).replace(/\\r/g,"\r").replace(/\\t/g,"	").replace(/\\"/g,'"').replace(/\\\\/g,"\\")):t.length>=2&&t.startsWith("'")&&t.endsWith("'")?t.slice(1,-1):t}function ao(){let e=process.env.TOOLNET_GLOBAL_ENV??so(io(),".config","toolnet-memory",".env");if(!no(e))return;let t=ro(e,"utf8");for(let o of t.split(/\r?\n/)){let n=o.trim();if(!n||n.startsWith("#"))continue;n.startsWith("export ")&&(n=n.slice(7));let i=n.indexOf("=");if(i<=0)continue;let s=n.slice(0,i).trim();/^[A-Za-z_][A-Za-z0-9_]*$/.test(s)&&process.env[s]===void 0&&(process.env[s]=co(n.slice(i+1)))}}ao();import{createHash as lo}from"node:crypto";import{existsSync as q,mkdirSync as uo,readFileSync as mo,renameSync as go,writeFileSync as po}from"node:fs";import{basename as fo,dirname as $,join as H,parse as he,resolve as I}from"node:path";var ke=".toolnet",yo="project.json";function ho(e){return lo("sha256").update(e).digest("hex").slice(0,16)}function Q(e){return H(e,ke,yo)}function ko(e){return q(Q(e))}function bo(e,t){let o=I(e),n=he(o).root;for(;;){if(ko(o))return o;if(o===n||t&&o===I(t))break;let i=$(o);if(i===o)break;o=i}return null}function Oo(e){let t=I(e),o=he(t).root,n=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"];for(;;){if(n.some(s=>q(H(t,s))))return t;if(t===o)break;let i=$(t);if(i===t)break;t=i}return I(e)}function vo(e){let t;try{t=JSON.parse(mo(e,"utf8"))}catch(i){throw new Error(`Invalid ToolNet project manifest: ${e}: ${i instanceof Error?i.message:String(i)}`)}if(!t||typeof t!="object")throw new Error(`Invalid ToolNet project manifest: ${e}`);let o=t;if(typeof o.id!="string"||!o.id.trim())throw new Error(`ToolNet project manifest is missing id: ${e}`);if(typeof o.name!="string"||!o.name.trim())throw new Error(`ToolNet project manifest is missing name: ${e}`);let n=new Date().toISOString();return{version:1,id:o.id,name:o.name,remote:typeof o.remote=="string"&&o.remote.trim()?o.remote:o.name,rootPath:typeof o.rootPath=="string"?o.rootPath:$($(e)),createdAt:typeof o.createdAt=="string"?o.createdAt:n,updatedAt:typeof o.updatedAt=="string"?o.updatedAt:n,graphVersion:typeof o.graphVersion=="number"?o.graphVersion:0,memoryVersion:typeof o.memoryVersion=="number"?o.memoryVersion:0,metadata:o.metadata&&typeof o.metadata=="object"?o.metadata:void 0}}function fe(e,t){let o=H(e,ke);uo(o,{recursive:!0});let n=Q(e),i=`${n}.tmp-${process.pid}`;po(i,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),go(i,n)}function ye(e,t){return{id:e.id,name:e.name,remote:e.remote,rootPath:t,createdAt:e.createdAt,updatedAt:e.updatedAt,graphVersion:e.graphVersion,memoryVersion:e.memoryVersion,metadata:e.metadata}}var D=class{detect(t=process.cwd()){let o=I(t),n=Oo(o),s=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(l=>q(H(n,l))),r=bo(o,s?n:void 0);if(r){let l=Q(r),d=vo(l);return d.rootPath!==r&&(d.rootPath=r,d.updatedAt=new Date().toISOString(),fe(r,d)),ye(d,r)}let c=new Date().toISOString(),u=fo(n),a={version:1,id:ho(n),name:u,remote:u,rootPath:n,createdAt:c,updatedAt:c,graphVersion:0,memoryVersion:0};return fe(n,a),ye(a,n)}};var be=["\u280B","\u2819","\u2839","\u2838","\u283C","\u2834","\u2826","\u2827","\u2807","\u280F"],p={clear:"\r\x1B[2K",cyan:"\x1B[36m",green:"\x1B[32m",red:"\x1B[31m",yellow:"\x1B[33m",amber:"\x1B[38;5;214m",dim:"\x1B[2m",reset:"\x1B[0m"};function Oe(e,t=16){let n=Math.max(1,t-4+1),i=e%n;return"\u2500".repeat(i)+"\u2501".repeat(4)+"\u2500".repeat(Math.max(0,t-i-4))}function ve(e){let t=Date.now()-e;return t<1e3?`${t}ms`:t<1e4?`${(t/1e3).toFixed(1)}s`:`${Math.round(t/1e3)}s`}var X=class{stream;enabled;interactive;color;intervalMs;display;label;frame=0;startedAt=0;timer;active=!1;constructor(t,o={}){this.label=t,this.stream=o.stream??process.stderr,this.enabled=o.enabled??!0,this.interactive=o.interactive??this.stream.isTTY===!0,this.color=o.color??(this.interactive&&process.env.NO_COLOR===void 0),this.intervalMs=Math.max(40,o.intervalMs??80),this.display=o.display??"spinner"}start(){return!this.enabled||this.active?this:(this.active=!0,this.startedAt=Date.now(),this.interactive?(this.render(),this.timer=setInterval(()=>{this.frame=(this.frame+1)%1e4,this.render()},this.intervalMs),this.timer.unref?.(),this):(this.stream.write(`\u2192 ${this.label}
`),this))}update(t){return this.label=t,this.enabled&&this.active&&this.interactive&&this.render(),this}succeed(t){this.finish("\u2713",t??this.label,p.green)}fail(t){this.finish("\u2717",t??this.label,p.red)}warn(t){this.finish("!",t??this.label,p.yellow)}stop(){this.active&&(this.timer&&(clearInterval(this.timer),this.timer=void 0),this.enabled&&this.interactive&&this.stream.write(p.clear),this.active=!1)}render(){if(!this.enabled||!this.active||!this.interactive)return;let t=be[this.frame%be.length],o=this.display==="bar"?this.color?`${p.amber}${Oe(this.frame)}${p.reset}`:Oe(this.frame):this.color?`${p.cyan}${t}${p.reset}`:t,n=ve(this.startedAt),i=this.color?`${p.dim}${n}${p.reset}`:n;this.stream.write(`${p.clear}${o} ${this.label} ${i}`)}finish(t,o,n){if(!this.enabled){this.active=!1;return}this.startedAt||(this.startedAt=Date.now()),this.timer&&(clearInterval(this.timer),this.timer=void 0);let i=ve(this.startedAt),s=this.color?`${n}${t}${p.reset}`:t,r=this.color?`${p.dim}${i}${p.reset}`:i;this.interactive?this.stream.write(`${p.clear}${s} ${o} ${r}
`):this.stream.write(`${s} ${o} (${i})
`),this.active=!1}};async function Z(e,t,o={}){let n=new X(e,o).start();try{let i=await t();return n.succeed(),i}catch(i){throw n.fail(),i}}import{existsSync as _o}from"node:fs";import{homedir as Po}from"node:os";import{join as $o}from"node:path";import{spawnSync as Do}from"node:child_process";import{homedir as Co}from"node:os";import{join as v}from"node:path";function Ce(e={}){return v(e.home??Co(),".gemini")}function ee(e={}){return v(Ce(e),"config")}function J(e={}){return v(ee(e),"mcp_config.json")}function L(e={}){return v(ee(e),"hooks.json")}function we(e={}){return v(Ce(e),"antigravity-cli")}function Se(e="toolnet-memory",t={}){return v(we(t),"plugins",e)}function xe(e={}){return[we(e),ee(e)]}import{homedir as wo}from"node:os";import{join as E}from"node:path";function b(e={}){let t=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return t?E(t,"opencode"):E(e.home??wo(),".config","opencode")}function Ie(e={}){return E(b(e),"opencode.json")}function Ee(e={}){return E(b(e),"plugins")}function Me(e={}){return E(b(e),"AGENTS.md")}import{homedir as Te}from"node:os";import{join as te}from"node:path";function oe(e={}){return te(e.home??Te(),".claude")}function Ae(e={}){return te(oe(e),"settings.json")}function je(e={}){return te(e.home??Te(),".claude.json")}import{homedir as So}from"node:os";import{join as M}from"node:path";function ne(e={}){return e.kiroHome??process.env.KIRO_HOME??M(e.home??So(),".kiro")}function xo(e={}){return M(ne(e),"settings")}function Ne(e={}){return M(xo(e),"mcp.json")}function Io(e={}){return M(ne(e),"hooks")}function Re(e={}){return M(Io(e),"toolnet-memory.json")}function Fe(e={}){return[ne(e)]}import{homedir as Eo}from"node:os";import{join as G}from"node:path";function K(e={}){return e.cursorHome??G(e.home??Eo(),".cursor")}function Mo(e={}){return e.cursorConfigDir??process.env.CURSOR_CONFIG_DIR??(e.xdgConfigHome??process.env.XDG_CONFIG_HOME?G(e.xdgConfigHome??process.env.XDG_CONFIG_HOME,"cursor"):void 0)??K(e)}function _e(e={}){return G(K(e),"mcp.json")}function Pe(e={}){return G(K(e),"hooks.json")}function $e(e={}){return Array.from(new Set([K(e),Mo(e)]))}import{homedir as To}from"node:os";import{join as B}from"node:path";function re(e={}){return e.copilotHome??process.env.COPILOT_HOME??B(e.home??To(),".copilot")}function De(e={}){return B(re(e),"mcp-config.json")}function Ao(e={}){return B(re(e),"hooks")}function He(e={}){return B(Ao(e),"toolnet-memory.json")}function Je(e={}){return[re(e)]}import{homedir as jo}from"node:os";import{join as O}from"node:path";function U(e={}){return e.grokHome??process.env.GROK_HOME??O(e.home??jo(),".grok")}function Le(e={}){return O(U(e),"config.toml")}function No(e={}){return O(U(e),"hooks")}function Ge(e={}){return O(No(e),"toolnet-memory.json")}function Ke(e={}){return[U(e)]}function Ro(e={}){return O(U(e),"skills")}function Fo(e={}){return O(Ro(e),"toolnet-continuity")}function Be(e={}){return O(Fo(e),"SKILL.md")}function Ho(e){return Do("sh",["-lc",`command -v ${JSON.stringify(e)} >/dev/null 2>&1`],{stdio:"ignore"}).status===0}function k(e){let t=e.commandExists(e.command),o=e.configPaths.filter(s=>_o(s)),n=o.length>0,i=[];t&&i.push(`command:${e.command}`);for(let s of o)i.push(`config:${s}`);return{agent:e.agent,detected:t||n,commandDetected:t,configDetected:n,evidence:i}}function Ue(e={}){let t=e.home??Po(),o=e.commandExists??Ho,n=e.codexHome??process.env.CODEX_HOME??$o(t,".codex");return[k({agent:"agy",command:"agy",commandExists:o,configPaths:xe({home:t})}),k({agent:"opencode",command:"opencode",commandExists:o,configPaths:[b({home:t,xdgConfigHome:e.xdgConfigHome})]}),k({agent:"claude",command:"claude",commandExists:o,configPaths:[oe({home:t})]}),k({agent:"kiro",command:"kiro-cli",commandExists:o,configPaths:Fe({home:t,kiroHome:e.kiroHome})}),k({agent:"cursor",command:"agent",commandExists:o,configPaths:$e({home:t,cursorHome:e.cursorHome,cursorConfigDir:e.cursorConfigDir,xdgConfigHome:e.xdgConfigHome})}),k({agent:"copilot",command:"copilot",commandExists:o,configPaths:Je({home:t,copilotHome:e.copilotHome})}),k({agent:"grok",command:"grok",commandExists:o,configPaths:Ke({home:t,grokHome:e.grokHome})}),k({agent:"codex",command:"codex",commandExists:o,configPaths:[n]})]}import{existsSync as z,mkdirSync as Qe,readFileSync as Xe,renameSync as tn,writeFileSync as on}from"node:fs";import{dirname as nn,join as Y}from"node:path";import{existsSync as Jo,mkdirSync as Lo,readFileSync as Go,renameSync as Ko,rmSync as Bo,writeFileSync as Uo}from"node:fs";import{dirname as Yo}from"node:path";function zo(e){return`'${e.replace(/'/g,"'\\''")}'`}function Ye(e={}){let t=e.hooksFile??L();Lo(Yo(t),{recursive:!0,mode:448});let o={};if(Jo(t)){let r;try{r=JSON.parse(Go(t,"utf8"))}catch(c){throw new Error(`Invalid existing Agy hooks.json: ${c instanceof Error?c.message:String(c)}`)}if(typeof r!="object"||r===null||Array.isArray(r))throw new Error("Invalid existing Agy hooks.json: root must be a JSON object.");o=r}let n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",i=`${zo(n)} session:agy-hook`;o["toolnet-memory"]={enabled:!0,PreToolUse:[{matcher:"view_file|list_dir|find_by_name|grep_search|run_command",hooks:[{type:"command",command:`${i} pre-tool`,timeout:5}]}],PreInvocation:[{type:"command",command:`${i} pre`,timeout:15}],PostInvocation:[{type:"command",command:`${i} post`,timeout:15}],Stop:[{type:"command",command:`${i} stop`,timeout:30}]};let s=`${t}.tmp-${process.pid}-${Date.now()}`;try{Uo(s,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),Ko(s,t)}finally{Bo(s,{force:!0})}return t}import{existsSync as Wo,mkdirSync as Vo,readFileSync as qo,renameSync as Qo,writeFileSync as Xo}from"node:fs";import{dirname as Zo}from"node:path";function T(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function en(e,t){Vo(Zo(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;Xo(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Qo(o,e)}function ze(e){if(!Wo(e))return{};let t=qo(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch(n){throw new Error(`Invalid existing Agy MCP config: ${n instanceof Error?n.message:String(n)}`)}if(!T(o))throw new Error("Invalid existing Agy MCP config: root must be a JSON object.");return o}function We(e,t){return T(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function Ve(e={}){let t=e.configFile??J(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",i=ze(t),s=i.mcpServers;if(s!==void 0&&!T(s))throw new Error("Invalid existing Agy MCP config: mcpServers must be an object.");let r=T(s)?{...s}:{},c=r[n];if(We(c,o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};r[n]={command:o,args:["mcp"]};let u={...i,mcpServers:r};en(t,u);let l=ze(t).mcpServers;if(!T(l)||!We(l[n],o))throw new Error("Agy MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}var rn=`# ToolNet Memory Continuity

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
`;function Ze(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function ie(e,t){Qe(nn(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;on(o,t,{encoding:"utf8",mode:384}),tn(o,e)}function qe(e,t){z(e)&&Xe(e,"utf8")===t||ie(e,t)}function et(e){if(!z(e))return{};let t=Xe(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch(n){throw new Error(`Invalid legacy Antigravity config ${e}: ${n instanceof Error?n.message:String(n)}`)}if(!Ze(o))throw new Error(`Invalid legacy Antigravity config ${e}: root must be object`);return o}function sn(e,t){if(!z(e))return!1;let o=et(e);if(!Ze(o.mcpServers)||!Object.prototype.hasOwnProperty.call(o.mcpServers,t))return!1;let n={...o.mcpServers};return delete n[t],ie(e,`${JSON.stringify({...o,mcpServers:n},null,2)}
`),!0}function cn(e){if(!z(e))return!1;let t=et(e);if(!Object.prototype.hasOwnProperty.call(t,"toolnet-memory"))return!1;let o={...t};return delete o["toolnet-memory"],ie(e,`${JSON.stringify(o,null,2)}
`),!0}function tt(e={}){let t=e.pluginName??"toolnet-memory",o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.pluginRoot??Se(t),i=Y(n,"plugin.json"),s=Y(n,"mcp_config.json"),r=Y(n,"hooks.json"),c=Y(n,"rules","toolnet-memory-continuity.md");Qe(n,{recursive:!0,mode:448}),qe(i,`${JSON.stringify({$schema:"https://antigravity.google/schemas/v1/plugin.json",name:t,description:"Persistent project continuity and memory for Antigravity coding sessions."},null,2)}
`),Ve({configFile:s,binary:o,serverName:"toolnet-memory"}),Ye({hooksFile:r,binary:o}),qe(c,`${rn.trim()}
`);let u=e.legacyMcpFile??J(),a=e.legacyHooksFile??L(),l=[];return u!==s&&sn(u,"toolnet-memory")&&l.push(u),a!==r&&cn(a)&&l.push(a),{installed:!0,pluginRoot:n,files:[i,s,r,c],migratedLegacy:l}}import{existsSync as ln,mkdirSync as rt,readFileSync as un,writeFileSync as it}from"node:fs";import{join as dn}from"node:path";var an="memory_agent_ask";function ot(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${an}

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
`.trim()}var nt="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",se="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function mn(){let e=Me();rt(b(),{recursive:!0});let t=`${nt}
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


${ot()}

${se}`,o=ln(e)?un(e,"utf8"):"",n=o.indexOf(nt),i=o.indexOf(se);return n>=0&&i>=n?o=o.slice(0,n)+t+o.slice(i+se.length):(o=o.trimEnd(),o&&(o+=`

`),o+=t),it(e,o.trimEnd()+`
`,{encoding:"utf8",mode:384}),e}function st(e={}){let t=e.directory??Ee();rt(t,{recursive:!0}),mn();let o=dn(t,"toolnet-memory.js"),n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",i=`
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
  ${JSON.stringify(n)}

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
`;return it(o,i.trimStart(),{encoding:"utf8",mode:384}),o}import{existsSync as lt,mkdirSync as gn,readFileSync as pn,renameSync as fn,writeFileSync as yn}from"node:fs";import{dirname as ut,join as hn}from"node:path";function C(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function kn(e,t){gn(ut(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;yn(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),fn(o,e)}function ct(e){if(!lt(e))return{};let t=pn(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch(n){throw new Error(`Invalid existing OpenCode opencode.json: ${n instanceof Error?n.message:String(n)}`)}if(!C(o))throw new Error("Invalid existing OpenCode opencode.json: root must be a JSON object.");return o}function at(e,t){if(!C(e))return!1;let o=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(o)&&o.length===2&&o[0]===t&&o[1]==="mcp"}function bn(e,t){let o=e.mcpServers;if(!C(o)||!Object.prototype.hasOwnProperty.call(o,t))return{root:e,changed:!1};let n={...o};return delete n[t],{root:{...e,mcpServers:n},changed:!0}}function dt(e={}){let t=e.configFile??Ie(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",i=hn(ut(t),"opencode.jsonc"),s=lt(i)?i:void 0,r=ct(t),c=bn(r,n),u=c.root,a=u.mcp;if(a!==void 0&&!C(a))throw new Error("Invalid existing OpenCode config: mcp must be an object.");let l=C(a)?{...a}:{},d=l[n];if(at(d,o)&&!c.changed)return{installed:!0,changed:!1,configFile:t,serverName:n,command:[o,"mcp"],preservedJsonc:s};l[n]={type:"local",command:[o,"mcp"],enabled:!0};let m={...u,mcp:l};kn(t,m);let h=ct(t);if(!C(h.mcp)||!at(h.mcp[n],o))throw new Error("OpenCode MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:[o,"mcp"],preservedJsonc:s}}import{existsSync as On,mkdirSync as mt,readFileSync as vn,writeFileSync as gt}from"node:fs";import{homedir as pt}from"node:os";import{dirname as ft,join as ce}from"node:path";function Cn(e){let t=[],o=/"((?:\\.|[^"\\])*)"|'([^']*)'/g,n;for(;n=o.exec(e);){let i=n[1]??n[2]??"";try{t.push(n[1]!==void 0?JSON.parse(`"${i}"`):i)}catch{t.push(i)}}return t}function yt(e={}){let t=e.configFile??ce(process.env.CODEX_HOME??ce(pt(),".codex"),"config.toml"),o=e.previousFile??ce(pt(),".config","toolnet-memory","codex-notify-previous.json");mt(ft(t),{recursive:!0}),mt(ft(o),{recursive:!0});let n=On(t)?vn(t,"utf8"):"",i=e.binary??"toolnet-memory",s=`notify = [${JSON.stringify(i)}, "session:codex-notify"]`,r=n.split(`
`),c=r.findIndex(m=>/^\s*\[/.test(m));c<0&&(c=r.length);let u=-1,a=-1;for(let m=0;m<c;m+=1)if(/^\s*notify\s*=/.test(r[m])){if(u=m,a=m,r[m].includes("[")&&!r[m].includes("]"))for(;a+1<c&&(a+=1,!r[a].includes("]")););break}let l=[];if(u>=0){let m=r.slice(u,a+1).join(`
`);l=Cn(m),r.splice(u,a-u+1,s)}else c=r.findIndex(m=>/^\s*\[/.test(m)),c<0&&(c=r.length),r.splice(c,0,s);let d=l.length>=2&&l[l.length-1]==="session:codex-notify";return l.length>0&&!d&&gt(o,JSON.stringify(l,null,2)+`
`,{encoding:"utf8",mode:384}),n=r.join(`
`),n.endsWith(`
`)||(n+=`
`),gt(t,n,{encoding:"utf8",mode:384}),{configFile:t,previousFile:o,preservedPrevious:l.length>0&&!d}}import{existsSync as wn,mkdirSync as Sn,readFileSync as xn,writeFileSync as In}from"node:fs";import{homedir as En}from"node:os";import{dirname as Mn,join as ht}from"node:path";function Tn(e){return`'${e.replace(/'/g,"'\\''")}'`}function kt(e={}){let t=e.hooksFile??ht(process.env.CODEX_HOME??ht(En(),".codex"),"hooks.json");Sn(Mn(t),{recursive:!0});let o={};if(wn(t))try{o=JSON.parse(xn(t,"utf8"))}catch(c){throw new Error(`Invalid existing Codex hooks.json: ${c instanceof Error?c.message:String(c)}`)}let n=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=n;let s=(Array.isArray(n.SessionStart)?n.SessionStart:[]).filter(c=>{try{return!JSON.stringify(c).includes("session:codex-context")}catch{return!0}}),r=e.binary??"toolnet-memory";return s.push({matcher:"startup|resume|clear|compact",hooks:[{type:"command",command:`${Tn(r)} session:codex-context`,timeout:15,additionalContextLimit:1e3,statusMessage:"Loading ToolNet project continuity"}]}),n.SessionStart=s,In(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),t}import{spawnSync as An}from"node:child_process";function ae(e,t){return An(e,t,{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}function bt(e,t){let o=ae(e,["mcp","get",t,"--json"]);if(o.status!==0||!o.stdout)return null;try{return JSON.parse(o.stdout)}catch{return null}}function Ot(e,t){return e.enabled!==!1&&e.transport?.type==="stdio"&&e.transport?.command===t&&Array.isArray(e.transport?.args)&&e.transport?.args.length===1&&e.transport.args[0]==="mcp"}function vt(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.codexBinary??"codex",n=e.serverName??"toolnet-memory",i=bt(o,n);if(i&&Ot(i,t))return{installed:!0,changed:!1,serverName:n,command:t,args:["mcp"]};if(i){let c=ae(o,["mcp","remove",n]);if(c.status!==0)return{installed:!1,changed:!1,serverName:n,command:t,args:["mcp"],error:(c.stderr||c.stdout||"Unable to remove old ToolNet MCP configuration.").trim()}}let s=ae(o,["mcp","add",n,"--",t,"mcp"]);if(s.status!==0)return{installed:!1,changed:!1,serverName:n,command:t,args:["mcp"],error:(s.stderr||s.stdout||"Unable to register ToolNet MCP.").trim()};let r=bt(o,n);return!r||!Ot(r,t)?{installed:!1,changed:!0,serverName:n,command:t,args:["mcp"],error:"Codex accepted MCP registration but verification did not match expected ToolNet command."}:{installed:!0,changed:!0,serverName:n,command:t,args:["mcp"]}}import{existsSync as jn,mkdirSync as Nn,readFileSync as Rn,renameSync as Fn,rmSync as _n,writeFileSync as Pn}from"node:fs";import{dirname as $n}from"node:path";function A(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Dn(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function Hn(e){if(!jn(e))return{};let t;try{t=JSON.parse(Rn(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude settings.json: ${o instanceof Error?o.message:String(o)}`)}if(!A(t))throw new Error("Invalid existing Claude settings.json: root must be a JSON object.");return t}function le(e){if(e===void 0)return[];if(!Array.isArray(e))throw new Error("Invalid existing Claude settings.json: hook event must be an array.");let t=[];for(let o of e){if(!A(o)){t.push(o);continue}let n=o.hooks;if(!Array.isArray(n)){t.push(o);continue}let i=n.filter(s=>{if(!A(s))return!0;let r=s.command;return!(typeof r=="string"&&r.includes("session:claude-hook"))});i.length!==0&&t.push({...o,hooks:i})}return t}function ue(e){return{type:"command",command:e,timeout:10}}function Jn(e,t){Nn($n(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Pn(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Fn(o,e)}finally{_n(o,{force:!0})}}function Ct(e={}){let t=e.settingsFile??Ae(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=Hn(t),i=n.hooks;if(i!==void 0&&!A(i))throw new Error("Invalid existing Claude settings.json: hooks must be an object.");let s=A(i)?{...i}:{},r=`${Dn(o)} session:claude-hook`,c=le(s.SessionStart);c.push({matcher:"startup|resume|clear|compact",hooks:[ue(r)]}),s.SessionStart=c;let u=le(s.PostToolUse);u.push({matcher:"Edit|Write",hooks:[ue(r)]}),s.PostToolUse=u;let a=le(s.Stop);a.push({hooks:[ue(r)]}),s.Stop=a;let l={...n,hooks:s},d=JSON.stringify(n),m=JSON.stringify(l);return d===m?{settingsFile:t,changed:!1}:(Jn(t,l),{settingsFile:t,changed:!0})}import{existsSync as Ln,mkdirSync as Gn,readFileSync as Kn,renameSync as Bn,rmSync as Un,writeFileSync as Yn}from"node:fs";import{dirname as zn}from"node:path";function j(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function wt(e){if(!Ln(e))return{};let t;try{t=JSON.parse(Kn(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude Code config: ${o instanceof Error?o.message:String(o)}`)}if(!j(t))throw new Error("Invalid existing Claude Code config: root must be a JSON object.");return t}function St(e,t){if(!j(e))return!1;let o=e.args;return e.type==="stdio"&&e.command===t&&Array.isArray(o)&&o.length===1&&o[0]==="mcp"}function Wn(e,t){Gn(zn(e),{recursive:!0});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Yn(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Bn(o,e)}finally{Un(o,{force:!0})}}function xt(e={}){let t=e.stateFile??je(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",i=wt(t),s=i.mcpServers;if(s!==void 0&&!j(s))throw new Error("Invalid existing Claude Code config: mcpServers must be an object.");let r=j(s)?{...s}:{},c=r[n];if(St(c,o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:[o,"mcp"],repaired:!1};let u=c!==void 0;r[n]={type:"stdio",command:o,args:["mcp"]},Wn(t,{...i,mcpServers:r});let l=wt(t).mcpServers;if(!j(l)||!St(l[n],o))throw new Error("Claude Code MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:[o,"mcp"],repaired:u}}function It(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=Ct({binary:t,settingsFile:e.settingsFile}),n=xt({binary:t,stateFile:e.stateFile});return{hooks:o,mcp:n,files:[o.settingsFile,n.configFile]}}import{existsSync as Vn,mkdirSync as qn,readFileSync as Qn,renameSync as Xn,rmSync as Zn,writeFileSync as er}from"node:fs";import{dirname as tr}from"node:path";var w="ToolNet Memory - ";function Tt(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function or(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function Et(e){if(!Vn(e))return{};let t=Qn(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch(n){throw new Error(`Invalid existing Kiro hooks file: ${n instanceof Error?n.message:String(n)}`)}if(!Tt(o))throw new Error("Invalid existing Kiro hooks file: root must be a JSON object.");return o}function Mt(e){return Tt(e)?typeof e.name=="string"&&e.name.startsWith(w):!1}function N(e){return{type:"command",command:e}}function nr(e){return[{name:`${w}Session Start`,description:"Inject compact local ToolNet continuity and capture Kiro session activation.",trigger:"SessionStart",action:N(e),timeout:10,enabled:!0},{name:`${w}Prompt Continuity`,description:"Capture prompts and refresh ToolNet guidance only for resume/continue requests.",trigger:"UserPromptSubmit",action:N(e),timeout:10,enabled:!0},{name:`${w}Raw History Guard`,description:"Prevent Kiro from reconstructing continuity from raw ToolNet/agent session history.",trigger:"PreToolUse",matcher:"*",action:N(e),timeout:10,enabled:!0},{name:`${w}Tool Capture`,description:"Capture durable tool activity while filtering noisy read-only events.",trigger:"PostToolUse",matcher:"*",action:N(e),timeout:15,enabled:!0},{name:`${w}Final Flush`,description:"Flush pending Kiro WAL events when the assistant finishes a turn.",trigger:"Stop",action:N(e),timeout:30,enabled:!0}]}function rr(e,t){qn(tr(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{er(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Xn(o,e)}finally{Zn(o,{force:!0})}}function At(e={}){let t=e.hooksFile??Re(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=Et(t);if(n.version!==void 0&&n.version!=="v1")throw new Error(`Unsupported existing Kiro hooks version: ${String(n.version)}`);let i=n.hooks;if(i!==void 0&&!Array.isArray(i))throw new Error("Invalid existing Kiro hooks file: hooks must be an array.");let s=Array.isArray(i)?i.filter(l=>!Mt(l)):[],r=`${or(o)} session:kiro-hook`,c=nr(r),u={...n,version:"v1",hooks:[...s,...c]};if(JSON.stringify(n)===JSON.stringify(u))return{hooksFile:t,changed:!1,hookCount:c.length};rr(t,u);let a=Et(t);if(a.version!=="v1"||!Array.isArray(a.hooks)||a.hooks.filter(Mt).length!==c.length)throw new Error("Kiro hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:c.length}}import{existsSync as ir,mkdirSync as sr,readFileSync as cr,renameSync as ar,rmSync as lr,writeFileSync as ur}from"node:fs";import{dirname as dr}from"node:path";function R(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function jt(e){if(!ir(e))return{};let t=cr(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch(n){throw new Error(`Invalid existing Kiro MCP config: ${n instanceof Error?n.message:String(n)}`)}if(!R(o))throw new Error("Invalid existing Kiro MCP config: root must be a JSON object.");return o}function Nt(e,t){return R(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&e.disabled===!1:!1}function mr(e,t){sr(dr(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{ur(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),ar(o,e)}finally{lr(o,{force:!0})}}function Rt(e={}){let t=e.configFile??Ne(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",i=jt(t),s=i.mcpServers;if(s!==void 0&&!R(s))throw new Error("Invalid existing Kiro MCP config: mcpServers must be an object.");let r=R(s)?{...s}:{},c=r[n];if(Nt(c,o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};r[n]={command:o,args:["mcp"],disabled:!1};let u={...i,mcpServers:r};mr(t,u);let l=jt(t).mcpServers;if(!R(l)||!Nt(l[n],o))throw new Error("Kiro MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}function Ft(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=Rt({binary:t,configFile:e.configFile}),n=At({binary:t,hooksFile:e.hooksFile});return{installed:o.installed,changed:o.changed||n.changed,mcp:o,hooks:n,files:[o.configFile,n.hooksFile]}}import{existsSync as gr,mkdirSync as pr,readFileSync as fr,renameSync as yr,rmSync as hr,writeFileSync as kr}from"node:fs";import{dirname as br}from"node:path";function g(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function y(e,t){if(!gr(e))return{};let o=fr(e,"utf8").trim();if(!o)return{};let n;try{n=JSON.parse(o)}catch(i){throw new Error(`Invalid existing ${t} hooks file: ${i instanceof Error?i.message:String(i)}`)}if(!g(n))throw new Error(`Invalid existing ${t} hooks file: root must be a JSON object.`);return n}function S(e,t){pr(br(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{kr(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),yr(o,e)}finally{hr(o,{force:!0})}}function de(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}var F=[["sessionStart",10],["beforeSubmitPrompt",10],["preToolUse",10],["postToolUse",15],["afterAgentResponse",15],["stop",30]];function _t(e){return g(e)&&typeof e.command=="string"&&e.command.includes("session:cursor-hook")}function Or(e,t,o){let i={type:"command",command:`TOOLNET_HOOK_EVENT=${de(e)} ${de(t)} session:cursor-hook`,timeout:o};return e==="preToolUse"&&(i.matcher=".*"),i}function Pt(e={}){let t=e.hooksFile??Pe(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=y(t,"Cursor");if(n.version!==void 0&&n.version!==1)throw new Error(`Unsupported existing Cursor hooks version: ${String(n.version)}`);let i=n.hooks;if(i!==void 0&&!g(i))throw new Error("Invalid existing Cursor hooks file: hooks must be an object.");let s=g(i)?{...i}:{};for(let[a,l]of F){let d=s[a];if(d!==void 0&&!Array.isArray(d))throw new Error(`Invalid existing Cursor hooks file: hooks.${a} must be an array.`);let m=Array.isArray(d)?d.filter(h=>!_t(h)):[];s[a]=[...m,Or(a,o,l)]}let r={...n,version:1,hooks:s};if(JSON.stringify(n)===JSON.stringify(r))return{hooksFile:t,changed:!1,hookCount:F.length};S(t,r);let c=y(t,"Cursor");if(c.version!==1||!g(c.hooks))throw new Error("Cursor hooks were written but verification failed.");let u=0;for(let[a]of F){let l=c.hooks[a];if(!Array.isArray(l))throw new Error("Cursor hooks were written but verification failed.");u+=l.filter(_t).length}if(u!==F.length)throw new Error("Cursor hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:F.length}}import{existsSync as vr,mkdirSync as Cr,readFileSync as wr,renameSync as Sr,rmSync as xr,writeFileSync as Ir}from"node:fs";import{dirname as Er}from"node:path";function f(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function x(e,t){if(!vr(e))return{};let o=wr(e,"utf8").trim();if(!o)return{};let n;try{n=JSON.parse(o)}catch(i){throw new Error(`Invalid existing ${t} MCP config: ${i instanceof Error?i.message:String(i)}`)}if(!f(n))throw new Error(`Invalid existing ${t} MCP config: root must be a JSON object.`);return n}function W(e,t){Cr(Er(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Ir(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Sr(o,e)}finally{xr(o,{force:!0})}}function $t(e,t){return f(e)?(e.type===void 0||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function Dt(e={}){let t=e.configFile??_e(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",i=x(t,"Cursor"),s=i.mcpServers;if(s!==void 0&&!f(s))throw new Error("Invalid existing Cursor MCP config: mcpServers must be an object.");let r=f(s)?{...s}:{};if($t(r[n],o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};r[n]={type:"stdio",command:o,args:["mcp"]},W(t,{...i,mcpServers:r});let u=x(t,"Cursor").mcpServers;if(!f(u)||!$t(u[n],o))throw new Error("Cursor MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}function Ht(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=Dt({binary:t,configFile:e.configFile}),n=Pt({binary:t,hooksFile:e.hooksFile});return{installed:o.installed,changed:o.changed||n.changed,mcp:o,hooks:n,files:[o.configFile,n.hooksFile]}}var _=[["sessionStart",10],["userPromptSubmitted",10],["userPromptTransformed",10],["preToolUse",10],["postToolUse",15],["agentStop",30]];function Mr(e){if(typeof e.command=="string")return e.command;if(typeof e.bash=="string")return e.bash}function Jt(e){return g(e)&&Mr(e)?.includes("session:copilot-hook")===!0}function Tr(e,t,o){let n={type:"command",command:`${t} session:copilot-hook`,env:{TOOLNET_HOOK_EVENT:e},timeoutSec:o};return e==="preToolUse"&&(n.matcher=".*"),n}function Lt(e={}){let t=e.hooksFile??He(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=y(t,"GitHub Copilot CLI");if(n.version!==void 0&&n.version!==1)throw new Error(`Unsupported existing GitHub Copilot CLI hooks version: ${String(n.version)}`);let i=n.hooks;if(i!==void 0&&!g(i))throw new Error("Invalid existing GitHub Copilot CLI hooks file: hooks must be an object.");let s=g(i)?{...i}:{};for(let[a,l]of _){let d=s[a];if(d!==void 0&&!Array.isArray(d))throw new Error(`Invalid existing GitHub Copilot CLI hooks file: hooks.${a} must be an array.`);let m=Array.isArray(d)?d.filter(h=>!Jt(h)):[];s[a]=[...m,Tr(a,o,l)]}let r={...n,version:1,hooks:s};if(JSON.stringify(n)===JSON.stringify(r))return{hooksFile:t,changed:!1,hookCount:_.length};S(t,r);let c=y(t,"GitHub Copilot CLI");if(c.version!==1||!g(c.hooks))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");let u=0;for(let[a]of _){let l=c.hooks[a];if(!Array.isArray(l))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");u+=l.filter(Jt).length}if(u!==_.length)throw new Error("GitHub Copilot CLI hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:_.length}}function Gt(e,t){return f(e)?(e.type===void 0||e.type==="local"||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&Array.isArray(e.tools)&&e.tools.length===1&&e.tools[0]==="*":!1}function Kt(e={}){let t=e.configFile??De(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",i=x(t,"GitHub Copilot CLI"),s=i.mcpServers;if(s!==void 0&&!f(s))throw new Error("Invalid existing GitHub Copilot CLI MCP config: mcpServers must be an object.");let r=f(s)?{...s}:{};if(Gt(r[n],o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};r[n]={type:"stdio",command:o,args:["mcp"],tools:["*"]},W(t,{...i,mcpServers:r});let u=x(t,"GitHub Copilot CLI").mcpServers;if(!f(u)||!Gt(u[n],o))throw new Error("GitHub Copilot CLI MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}function Bt(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=Kt({binary:t,configFile:e.configFile}),n=Lt({binary:t,hooksFile:e.hooksFile});return{installed:o.installed,changed:o.changed||n.changed,mcp:o,hooks:n,files:[o.configFile,n.hooksFile]}}import{existsSync as Ar,mkdirSync as jr,readFileSync as Ut,renameSync as Nr,rmSync as Rr,writeFileSync as Fr}from"node:fs";import{dirname as _r}from"node:path";var me=`---
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
`;function Pr(e,t){jr(_r(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Fr(o,t,{encoding:"utf8",mode:384}),Nr(o,e)}finally{Rr(o,{force:!0})}}function Yt(e={}){let t=e.skillFile??Be();if(Ar(t)&&Ut(t,"utf8")===me)return{skillFile:t,changed:!1};if(Pr(t,me),Ut(t,"utf8")!==me)throw new Error("Grok ToolNet continuity skill was written but verification failed.");return{skillFile:t,changed:!0}}var P=[["SessionStart",10],["UserPromptSubmit",10],["PreToolUse",10],["PostToolUse",15],["Stop",30]];function zt(e){return!g(e)||!Array.isArray(e.hooks)?!1:e.hooks.some(t=>g(t)&&typeof t.command=="string"&&t.command.includes("session:grok-hook"))}function $r(e,t,o){let n={hooks:[{type:"command",command:`${t} session:grok-hook`,timeout:o,env:{TOOLNET_HOOK_EVENT:e}}]};return e==="PreToolUse"&&(n.matcher=".*"),n}function Wt(e={}){let t=e.hooksFile??Ge(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=y(t,"Grok Build"),i=n.hooks;if(i!==void 0&&!g(i))throw new Error("Invalid existing Grok Build hooks file: hooks must be an object.");let s=g(i)?{...i}:{};for(let[a,l]of P){let d=s[a];if(d!==void 0&&!Array.isArray(d))throw new Error(`Invalid existing Grok Build hooks file: hooks.${a} must be an array.`);let m=Array.isArray(d)?d.filter(h=>!zt(h)):[];s[a]=[...m,$r(a,o,l)]}let r={...n,hooks:s};if(JSON.stringify(n)===JSON.stringify(r))return{hooksFile:t,changed:!1,hookCount:P.length};S(t,r);let c=y(t,"Grok Build");if(!g(c.hooks))throw new Error("Grok Build hooks were written but verification failed.");let u=0;for(let[a]of P){let l=c.hooks[a];if(!Array.isArray(l))throw new Error("Grok Build hooks were written but verification failed.");u+=l.filter(zt).length}if(u!==P.length)throw new Error("Grok Build hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:P.length}}import{existsSync as Dr,mkdirSync as Hr,readFileSync as Jr,renameSync as Lr,rmSync as Gr,writeFileSync as Kr}from"node:fs";import{dirname as Br}from"node:path";function Vt(e){return Dr(e)?Jr(e,"utf8"):""}function Ur(e,t){Hr(Br(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Kr(o,t,{encoding:"utf8",mode:384}),Lr(o,e)}finally{Gr(o,{force:!0})}}function ge(e){return e.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t")}function Yr(e){return`[mcp_servers."${ge(e)}"]`}function zr(e,t){return[Yr(e),`command = "${ge(t)}"`,'args = ["mcp"]',"enabled = true"].join(`
`)}function Wr(e){let t=e.trim();return t.startsWith("[")&&t.includes("]")}function V(e){return e.trim().replace(/\s+/g,"")}function Vr(e){return new Set([V(`[mcp_servers.${e}]`),V(`[mcp_servers."${e}"]`),V(`[mcp_servers.'${e}']`)])}function Qt(e,t){let o=e.split(/\r?\n/),n=Vr(t),i=-1;for(let l=0;l<o.length;l+=1){let d=V(o[l].replace(/\s+#.*$/,""));if(n.has(d)){i=l;break}}if(i<0)return null;let s=o.length;for(let l=i+1;l<o.length;l+=1)if(Wr(o[l])){s=l;break}let r=[],c=0;for(let l of o)r.push(c),c+=l.length+1;let u=r[i]??0,a=s>=o.length?e.length:r[s]??e.length;return{start:u,end:a}}function qr(e,t,o){let n=`${zr(t,o)}
`,i=Qt(e,t);if(i){let s=e.slice(0,i.start),r=e.slice(i.end);return`${s}${n}${r.replace(/^\n+/,"")}`}return e.trim()?`${e.replace(/\s*$/,"")}

${n}`:n}function qt(e,t,o){let n=Qt(e,t);if(!n)return!1;let i=e.slice(n.start,n.end);return i.includes(`command = "${ge(o)}"`)&&/args\s*=\s*\[\s*"mcp"\s*\]/.test(i)&&/enabled\s*=\s*true/.test(i)}function Xt(e={}){let t=e.configFile??Le(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",i=Vt(t);if(qt(i,n,o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};let s=qr(i,n,o);Ur(t,s);let r=Vt(t);if(!qt(r,n,o))throw new Error("Grok Build MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}function Zt(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=Xt({binary:t,configFile:e.configFile}),n=Wt({binary:t,hooksFile:e.hooksFile}),i=Yt({skillFile:e.skillFile});return{installed:o.installed,changed:o.changed||n.changed||i.changed,mcp:o,hooks:n,skill:i,files:[o.configFile,n.hooksFile,i.skillFile]}}function eo(){return Ue()}function pe(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[],n=e.detections??eo(),i=new Map(n.map(s=>[s.agent,s.detected]));if(!(e.force===!0||i.get("agy")===!0))o.push({agent:"agy",detected:!1,installed:!1,targets:[]});else try{let r=tt({binary:t});o.push({agent:"agy",detected:!0,installed:!0,targets:r.files})}catch(r){o.push({agent:"agy",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("opencode")===!0))o.push({agent:"opencode",detected:!1,installed:!1,targets:[]});else try{let r=st({binary:t}),c=dt({binary:t});o.push({agent:"opencode",detected:!0,installed:!0,targets:[r,c.configFile,`mcp:${c.serverName}`]})}catch(r){o.push({agent:"opencode",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("claude")===!0))o.push({agent:"claude",detected:!1,installed:!1,targets:[]});else try{let r=It({binary:t});o.push({agent:"claude",detected:!0,installed:!0,targets:[r.hooks.settingsFile,r.mcp.configFile,`mcp:${r.mcp.serverName}`]})}catch(r){o.push({agent:"claude",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("kiro")===!0))o.push({agent:"kiro",detected:!1,installed:!1,targets:[]});else try{let r=Ft({...e.kiro??{},binary:t});o.push({agent:"kiro",detected:!0,installed:!0,targets:[r.mcp.configFile,`mcp:${r.mcp.serverName}`,r.hooks.hooksFile]})}catch(r){o.push({agent:"kiro",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("cursor")===!0))o.push({agent:"cursor",detected:!1,installed:!1,targets:[]});else try{let r=Ht({...e.cursor??{},binary:t});o.push({agent:"cursor",detected:!0,installed:!0,targets:[r.mcp.configFile,`mcp:${r.mcp.serverName}`,r.hooks.hooksFile]})}catch(r){o.push({agent:"cursor",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("copilot")===!0))o.push({agent:"copilot",detected:!1,installed:!1,targets:[]});else try{let r=Bt({...e.copilot??{},binary:t});o.push({agent:"copilot",detected:!0,installed:!0,targets:[r.mcp.configFile,`mcp:${r.mcp.serverName}`,r.hooks.hooksFile]})}catch(r){o.push({agent:"copilot",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("grok")===!0))o.push({agent:"grok",detected:!1,installed:!1,targets:[]});else try{let r=Zt({...e.grok??{},binary:t});o.push({agent:"grok",detected:!0,installed:!0,targets:[r.mcp.configFile,`mcp:${r.mcp.serverName}`,r.hooks.hooksFile,r.skill.skillFile]})}catch(r){o.push({agent:"grok",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("codex")===!0))o.push({agent:"codex",detected:!1,installed:!1,targets:[]});else try{let r=yt({binary:t}),c=kt({binary:t}),u=vt({binary:t});if(!u.installed)throw new Error(u.error??"Codex MCP registration failed");let a=[r.configFile,c,`mcp:${u.serverName}`];r.preservedPrevious&&a.push(r.previousFile),o.push({agent:"codex",detected:!0,installed:!0,targets:a})}catch(r){o.push({agent:"codex",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}return o}function to(e){switch(e){case"agy":return"Agy / Antigravity";case"opencode":return"OpenCode";case"claude":return"Claude Code";case"kiro":return"Kiro CLI";case"cursor":return"Cursor CLI";case"copilot":return"GitHub Copilot CLI";case"grok":return"Grok Build";case"codex":return"Codex"}}function Qr(e){console.log(""),console.log("ToolNet Memory Integration Detection"),console.log("===================================="),console.log("");for(let t of e){let o=to(t.agent);if(!t.detected){console.log(`\u25CB ${o}: not detected`);continue}console.log(`\u2713 ${o}: detected`);for(let n of t.evidence)console.log(`  ${n}`)}console.log("")}function Xr(e){console.log(""),console.log("ToolNet Memory AI Integrations"),console.log("=============================="),console.log("");for(let t of e){let o=to(t.agent);if(!t.detected){console.log(`- ${o}: not detected`);continue}if(t.installed){console.log(`\u2713 ${o}: automatic memory enabled`);continue}console.log(`\u2717 ${o}: integration failed`),t.error&&console.log(`  ${t.error}`)}console.log("")}async function Zr(){let e=process.argv.slice(2),t=e.includes("--all"),o=e.includes("--json");if(e.includes("--detect-only")){let s=eo();if(o){console.log(JSON.stringify(s,null,2));return}Qr(s);return}let i=pe({force:t});if(o){console.log(JSON.stringify(i,null,2));return}Xr(i)}var ei=process.argv[1]&&(process.argv[1].endsWith("auto-integrate.js")||process.argv[1].endsWith("auto-integrate.ts"));ei&&Zr().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});function ri(e=process.cwd()){let t=oi(e);if(!oo(t))throw new Error(`Project path does not exist: ${t}`);if(!ti(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);let o=new D().detect(t),n=ni(o.rootPath,".toolnet","project.json");if(!oo(n))throw new Error(`ToolNet project initialization failed: ${n} was not created`);return{initialized:!0,project:{id:o.id,name:o.name,remote:o.remote,rootPath:o.rootPath},manifestFile:n}}function ii(e,t){let o=e.indexOf(t);return o>=0?e[o+1]:void 0}async function si(){let e=process.argv.slice(2),t=e.includes("--json"),o=!e.includes("--no-integrate"),n=ii(e,"--project"),i=e.find((u,a)=>!u.startsWith("-")&&(a===0||e[a-1]!=="--project")),s=n??i??process.cwd(),r=await Z("Initializing ToolNet project",()=>ri(s),{enabled:!t}),c=[];if(o&&(c=await Z("Detecting AI coding agents",()=>pe(),{enabled:!t})),t){console.log(JSON.stringify({...r,integrations:c},null,2));return}if(console.log(""),console.log("ToolNet Memory"),console.log("=============="),console.log(""),console.log("\u2713 Project initialized"),console.log(""),console.log(`Project:  ${r.project.name}`),console.log(`ID:       ${r.project.id}`),console.log(`Root:     ${r.project.rootPath}`),console.log(`Manifest: ${r.manifestFile}`),console.log(""),o){console.log("AI integrations:");let u=c.filter(a=>a.detected&&a.installed);if(!u.length)console.log("  \u25CB No supported coding agent detected");else for(let a of u){let l=a.agent==="agy"?"Agy / Antigravity":a.agent==="opencode"?"OpenCode":"Codex";console.log(`  \u2713 ${l}`)}console.log("")}console.log("Next: toolnet-memory doctor"),console.log("")}var ci=process.argv[1]?.endsWith("/init.js")||process.argv[1]?.endsWith("/init.ts");ci&&si().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});export{ri as initializeToolNetProject};
