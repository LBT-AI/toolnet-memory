import{existsSync as Ue,statSync as kn}from"node:fs";import{resolve as Rn,join as jn}from"node:path";import{existsSync as Ke,readFileSync as Ve}from"node:fs";import{homedir as We}from"node:os";import{join as Ge}from"node:path";function qe(e){let t=e.trim();return t.length>=2&&t.startsWith('"')&&t.endsWith('"')?(t=t.slice(1,-1),t.replace(/\\n/g,`
`).replace(/\\r/g,"\r").replace(/\\t/g,"	").replace(/\\"/g,'"').replace(/\\\\/g,"\\")):t.length>=2&&t.startsWith("'")&&t.endsWith("'")?t.slice(1,-1):t}function Qe(){let e=process.env.TOOLNET_GLOBAL_ENV??Ge(We(),".config","toolnet-memory",".env");if(!Ke(e))return;let t=Ve(e,"utf8");for(let n of t.split(/\r?\n/)){let o=n.trim();if(!o||o.startsWith("#"))continue;o.startsWith("export ")&&(o=o.slice(7));let s=o.indexOf("=");if(s<=0)continue;let i=o.slice(0,s).trim();/^[A-Za-z_][A-Za-z0-9_]*$/.test(i)&&process.env[i]===void 0&&(process.env[i]=qe(o.slice(s+1)))}}Qe();import{createHash as Xe}from"node:crypto";import{existsSync as k,mkdirSync as Ze,readFileSync as et,renameSync as tt,writeFileSync as nt}from"node:fs";import{basename as ot,dirname as w,join as C,parse as V,resolve as h}from"node:path";var W=".toolnet",rt="project.json";function st(e){return Xe("sha256").update(e).digest("hex").slice(0,16)}function R(e){return C(e,W,rt)}function it(e){return k(R(e))}function at(e,t){let n=h(e),o=V(n).root;for(;;){if(it(n))return n;if(n===o||t&&n===h(t))break;let s=w(n);if(s===n)break;n=s}return null}function ct(e){let t=h(e),n=V(t).root,o=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"];for(;;){if(o.some(i=>k(C(t,i))))return t;if(t===n)break;let s=w(t);if(s===t)break;t=s}return h(e)}function lt(e){let t;try{t=JSON.parse(et(e,"utf8"))}catch(s){throw new Error(`Invalid ToolNet project manifest: ${e}: ${s instanceof Error?s.message:String(s)}`)}if(!t||typeof t!="object")throw new Error(`Invalid ToolNet project manifest: ${e}`);let n=t;if(typeof n.id!="string"||!n.id.trim())throw new Error(`ToolNet project manifest is missing id: ${e}`);if(typeof n.name!="string"||!n.name.trim())throw new Error(`ToolNet project manifest is missing name: ${e}`);let o=new Date().toISOString();return{version:1,id:n.id,name:n.name,remote:typeof n.remote=="string"&&n.remote.trim()?n.remote:n.name,rootPath:typeof n.rootPath=="string"?n.rootPath:w(w(e)),createdAt:typeof n.createdAt=="string"?n.createdAt:o,updatedAt:typeof n.updatedAt=="string"?n.updatedAt:o,graphVersion:typeof n.graphVersion=="number"?n.graphVersion:0,memoryVersion:typeof n.memoryVersion=="number"?n.memoryVersion:0,metadata:n.metadata&&typeof n.metadata=="object"?n.metadata:void 0}}function U(e,t){let n=C(e,W);Ze(n,{recursive:!0});let o=R(e),s=`${o}.tmp-${process.pid}`;nt(s,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),tt(s,o)}function K(e,t){return{id:e.id,name:e.name,remote:e.remote,rootPath:t,createdAt:e.createdAt,updatedAt:e.updatedAt,graphVersion:e.graphVersion,memoryVersion:e.memoryVersion,metadata:e.metadata}}var O=class{detect(t=process.cwd()){let n=h(t),o=ct(n),i=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(u=>k(C(o,u))),r=at(n,i?o:void 0);if(r){let u=R(r),p=lt(u);return p.rootPath!==r&&(p.rootPath=r,p.updatedAt=new Date().toISOString(),U(r,p)),K(p,r)}let a=new Date().toISOString(),l=ot(o),c={version:1,id:st(o),name:l,remote:l,rootPath:o,createdAt:a,updatedAt:a,graphVersion:0,memoryVersion:0};return U(o,c),K(c,o)}};var G=["\u280B","\u2819","\u2839","\u2838","\u283C","\u2834","\u2826","\u2827","\u2807","\u280F"],m={clear:"\r\x1B[2K",cyan:"\x1B[36m",green:"\x1B[32m",red:"\x1B[31m",yellow:"\x1B[33m",amber:"\x1B[38;5;214m",dim:"\x1B[2m",reset:"\x1B[0m"};function q(e,t=16){let o=Math.max(1,t-4+1),s=e%o;return"\u2500".repeat(s)+"\u2501".repeat(4)+"\u2500".repeat(Math.max(0,t-s-4))}function Q(e){let t=Date.now()-e;return t<1e3?`${t}ms`:t<1e4?`${(t/1e3).toFixed(1)}s`:`${Math.round(t/1e3)}s`}var j=class{stream;enabled;interactive;color;intervalMs;display;label;frame=0;startedAt=0;timer;active=!1;constructor(t,n={}){this.label=t,this.stream=n.stream??process.stderr,this.enabled=n.enabled??!0,this.interactive=n.interactive??this.stream.isTTY===!0,this.color=n.color??(this.interactive&&process.env.NO_COLOR===void 0),this.intervalMs=Math.max(40,n.intervalMs??80),this.display=n.display??"spinner"}start(){return!this.enabled||this.active?this:(this.active=!0,this.startedAt=Date.now(),this.interactive?(this.render(),this.timer=setInterval(()=>{this.frame=(this.frame+1)%1e4,this.render()},this.intervalMs),this.timer.unref?.(),this):(this.stream.write(`\u2192 ${this.label}
`),this))}update(t){return this.label=t,this.enabled&&this.active&&this.interactive&&this.render(),this}succeed(t){this.finish("\u2713",t??this.label,m.green)}fail(t){this.finish("\u2717",t??this.label,m.red)}warn(t){this.finish("!",t??this.label,m.yellow)}stop(){this.active&&(this.timer&&(clearInterval(this.timer),this.timer=void 0),this.enabled&&this.interactive&&this.stream.write(m.clear),this.active=!1)}render(){if(!this.enabled||!this.active||!this.interactive)return;let t=G[this.frame%G.length],n=this.display==="bar"?this.color?`${m.amber}${q(this.frame)}${m.reset}`:q(this.frame):this.color?`${m.cyan}${t}${m.reset}`:t,o=Q(this.startedAt),s=this.color?`${m.dim}${o}${m.reset}`:o;this.stream.write(`${m.clear}${n} ${this.label} ${s}`)}finish(t,n,o){if(!this.enabled){this.active=!1;return}this.startedAt||(this.startedAt=Date.now()),this.timer&&(clearInterval(this.timer),this.timer=void 0);let s=Q(this.startedAt),i=this.color?`${o}${t}${m.reset}`:t,r=this.color?`${m.dim}${s}${m.reset}`:s;this.interactive?this.stream.write(`${m.clear}${i} ${n} ${r}
`):this.stream.write(`${i} ${n} (${s})
`),this.active=!1}};async function N(e,t,n={}){let o=new j(e,n).start();try{let s=await t();return o.succeed(),s}catch(s){throw o.fail(),s}}import{existsSync as mt}from"node:fs";import{homedir as pt}from"node:os";import{join as gt}from"node:path";import{spawnSync as ft}from"node:child_process";import{homedir as ut}from"node:os";import{join as f}from"node:path";function X(e={}){return f(e.home??ut(),".gemini")}function _(e={}){return f(X(e),"config")}function M(e={}){return f(_(e),"mcp_config.json")}function I(e={}){return f(_(e),"hooks.json")}function Z(e={}){return f(X(e),"antigravity-cli")}function ee(e="toolnet-memory",t={}){return f(Z(t),"plugins",e)}function te(e={}){return[Z(e),_(e)]}import{homedir as dt}from"node:os";import{join as v}from"node:path";function g(e={}){let t=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return t?v(t,"opencode"):v(e.home??dt(),".config","opencode")}function ne(e={}){return v(g(e),"opencode.json")}function oe(e={}){return v(g(e),"plugins")}function re(e={}){return v(g(e),"AGENTS.md")}import{homedir as se}from"node:os";import{join as P}from"node:path";function F(e={}){return P(e.home??se(),".claude")}function ie(e={}){return P(F(e),"settings.json")}function ae(e={}){return P(e.home??se(),".claude.json")}function yt(e){return ft("sh",["-lc",`command -v ${JSON.stringify(e)} >/dev/null 2>&1`],{stdio:"ignore"}).status===0}function A(e){let t=e.commandExists(e.command),n=e.configPaths.filter(i=>mt(i)),o=n.length>0,s=[];t&&s.push(`command:${e.command}`);for(let i of n)s.push(`config:${i}`);return{agent:e.agent,detected:t||o,commandDetected:t,configDetected:o,evidence:s}}function ce(e={}){let t=e.home??pt(),n=e.commandExists??yt,o=e.codexHome??process.env.CODEX_HOME??gt(t,".codex");return[A({agent:"agy",command:"agy",commandExists:n,configPaths:te({home:t})}),A({agent:"opencode",command:"opencode",commandExists:n,configPaths:[g({home:t,xdgConfigHome:e.xdgConfigHome})]}),A({agent:"claude",command:"claude",commandExists:n,configPaths:[F({home:t})]}),A({agent:"codex",command:"codex",commandExists:n,configPaths:[o]})]}import{existsSync as T,mkdirSync as ge,readFileSync as fe,renameSync as jt,writeFileSync as Nt}from"node:fs";import{dirname as _t,join as E}from"node:path";import{existsSync as ht,mkdirSync as vt,readFileSync as bt,renameSync as xt,rmSync as St,writeFileSync as wt}from"node:fs";import{dirname as Ot}from"node:path";function Ct(e){return`'${e.replace(/'/g,"'\\''")}'`}function le(e={}){let t=e.hooksFile??I();vt(Ot(t),{recursive:!0,mode:448});let n={};if(ht(t)){let r;try{r=JSON.parse(bt(t,"utf8"))}catch(a){throw new Error(`Invalid existing Agy hooks.json: ${a instanceof Error?a.message:String(a)}`)}if(typeof r!="object"||r===null||Array.isArray(r))throw new Error("Invalid existing Agy hooks.json: root must be a JSON object.");n=r}let o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",s=`${Ct(o)} session:agy-hook`;n["toolnet-memory"]={enabled:!0,PreToolUse:[{matcher:"view_file|list_dir|find_by_name|grep_search|run_command",hooks:[{type:"command",command:`${s} pre-tool`,timeout:5}]}],PreInvocation:[{type:"command",command:`${s} pre`,timeout:15}],PostInvocation:[{type:"command",command:`${s} post`,timeout:15}],Stop:[{type:"command",command:`${s} stop`,timeout:30}]};let i=`${t}.tmp-${process.pid}-${Date.now()}`;try{wt(i,JSON.stringify(n,null,2)+`
`,{encoding:"utf8",mode:384}),xt(i,t)}finally{St(i,{force:!0})}return t}import{existsSync as Mt,mkdirSync as It,readFileSync as At,renameSync as Et,writeFileSync as Tt}from"node:fs";import{dirname as kt}from"node:path";function b(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Rt(e,t){It(kt(e),{recursive:!0,mode:448});let n=`${e}.tmp-${process.pid}-${Date.now()}`;Tt(n,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Et(n,e)}function ue(e){if(!Mt(e))return{};let t=At(e,"utf8").trim();if(!t)return{};let n;try{n=JSON.parse(t)}catch(o){throw new Error(`Invalid existing Agy MCP config: ${o instanceof Error?o.message:String(o)}`)}if(!b(n))throw new Error("Invalid existing Agy MCP config: root must be a JSON object.");return n}function de(e,t){return b(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function me(e={}){let t=e.configFile??M(),n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",s=ue(t),i=s.mcpServers;if(i!==void 0&&!b(i))throw new Error("Invalid existing Agy MCP config: mcpServers must be an object.");let r=b(i)?{...i}:{},a=r[o];if(de(a,n))return{installed:!0,changed:!1,configFile:t,serverName:o,command:n,args:["mcp"]};r[o]={command:n,args:["mcp"]};let l={...s,mcpServers:r};Rt(t,l);let u=ue(t).mcpServers;if(!b(u)||!de(u[o],n))throw new Error("Agy MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:o,command:n,args:["mcp"]}}var Pt=`# ToolNet Memory Continuity

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
`;function ye(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function D(e,t){ge(_t(e),{recursive:!0});let n=`${e}.tmp-${process.pid}-${Date.now()}`;Nt(n,t,{encoding:"utf8",mode:384}),jt(n,e)}function pe(e,t){T(e)&&fe(e,"utf8")===t||D(e,t)}function he(e){if(!T(e))return{};let t=fe(e,"utf8").trim();if(!t)return{};let n;try{n=JSON.parse(t)}catch(o){throw new Error(`Invalid legacy Antigravity config ${e}: ${o instanceof Error?o.message:String(o)}`)}if(!ye(n))throw new Error(`Invalid legacy Antigravity config ${e}: root must be object`);return n}function Ft(e,t){if(!T(e))return!1;let n=he(e);if(!ye(n.mcpServers)||!Object.prototype.hasOwnProperty.call(n.mcpServers,t))return!1;let o={...n.mcpServers};return delete o[t],D(e,`${JSON.stringify({...n,mcpServers:o},null,2)}
`),!0}function Dt(e){if(!T(e))return!1;let t=he(e);if(!Object.prototype.hasOwnProperty.call(t,"toolnet-memory"))return!1;let n={...t};return delete n["toolnet-memory"],D(e,`${JSON.stringify(n,null,2)}
`),!0}function ve(e={}){let t=e.pluginName??"toolnet-memory",n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.pluginRoot??ee(t),s=E(o,"plugin.json"),i=E(o,"mcp_config.json"),r=E(o,"hooks.json"),a=E(o,"rules","toolnet-memory-continuity.md");ge(o,{recursive:!0,mode:448}),pe(s,`${JSON.stringify({$schema:"https://antigravity.google/schemas/v1/plugin.json",name:t,description:"Persistent project continuity and memory for Antigravity coding sessions."},null,2)}
`),me({configFile:i,binary:n,serverName:"toolnet-memory"}),le({hooksFile:r,binary:n}),pe(a,`${Pt.trim()}
`);let l=e.legacyMcpFile??M(),c=e.legacyHooksFile??I(),u=[];return l!==i&&Ft(l,"toolnet-memory")&&u.push(l),c!==r&&Dt(c)&&u.push(c),{installed:!0,pluginRoot:o,files:[s,i,r,a],migratedLegacy:u}}import{existsSync as Lt,mkdirSync as Se,readFileSync as Jt,writeFileSync as we}from"node:fs";import{join as Bt}from"node:path";var $t="memory_agent_ask";function be(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${$t}

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
`.trim()}var xe="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",$="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function Ht(){let e=re();Se(g(),{recursive:!0});let t=`${xe}
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


${be()}

${$}`,n=Lt(e)?Jt(e,"utf8"):"",o=n.indexOf(xe),s=n.indexOf($);return o>=0&&s>=o?n=n.slice(0,o)+t+n.slice(s+$.length):(n=n.trimEnd(),n&&(n+=`

`),n+=t),we(e,n.trimEnd()+`
`,{encoding:"utf8",mode:384}),e}function Oe(e={}){let t=e.directory??oe();Se(t,{recursive:!0}),Ht();let n=Bt(t,"toolnet-memory.js"),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",s=`
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
  ${JSON.stringify(o)}

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
`;return we(n,s.trimStart(),{encoding:"utf8",mode:384}),n}import{existsSync as Ie,mkdirSync as Yt,readFileSync as zt,renameSync as Ut,writeFileSync as Kt}from"node:fs";import{dirname as Ae,join as Vt}from"node:path";function y(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Wt(e,t){Yt(Ae(e),{recursive:!0});let n=`${e}.tmp-${process.pid}-${Date.now()}`;Kt(n,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Ut(n,e)}function Ce(e){if(!Ie(e))return{};let t=zt(e,"utf8").trim();if(!t)return{};let n;try{n=JSON.parse(t)}catch(o){throw new Error(`Invalid existing OpenCode opencode.json: ${o instanceof Error?o.message:String(o)}`)}if(!y(n))throw new Error("Invalid existing OpenCode opencode.json: root must be a JSON object.");return n}function Me(e,t){if(!y(e))return!1;let n=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(n)&&n.length===2&&n[0]===t&&n[1]==="mcp"}function Gt(e,t){let n=e.mcpServers;if(!y(n)||!Object.prototype.hasOwnProperty.call(n,t))return{root:e,changed:!1};let o={...n};return delete o[t],{root:{...e,mcpServers:o},changed:!0}}function Ee(e={}){let t=e.configFile??ne(),n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",s=Vt(Ae(t),"opencode.jsonc"),i=Ie(s)?s:void 0,r=Ce(t),a=Gt(r,o),l=a.root,c=l.mcp;if(c!==void 0&&!y(c))throw new Error("Invalid existing OpenCode config: mcp must be an object.");let u=y(c)?{...c}:{},p=u[o];if(Me(p,n)&&!a.changed)return{installed:!0,changed:!1,configFile:t,serverName:o,command:[n,"mcp"],preservedJsonc:i};u[o]={type:"local",command:[n,"mcp"],enabled:!0};let d={...l,mcp:u};Wt(t,d);let z=Ce(t);if(!y(z.mcp)||!Me(z.mcp[o],n))throw new Error("OpenCode MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:o,command:[n,"mcp"],preservedJsonc:i}}import{existsSync as qt,mkdirSync as Te,readFileSync as Qt,writeFileSync as ke}from"node:fs";import{homedir as Re}from"node:os";import{dirname as je,join as L}from"node:path";function Xt(e){let t=[],n=/"((?:\\.|[^"\\])*)"|'([^']*)'/g,o;for(;o=n.exec(e);){let s=o[1]??o[2]??"";try{t.push(o[1]!==void 0?JSON.parse(`"${s}"`):s)}catch{t.push(s)}}return t}function Ne(e={}){let t=e.configFile??L(process.env.CODEX_HOME??L(Re(),".codex"),"config.toml"),n=e.previousFile??L(Re(),".config","toolnet-memory","codex-notify-previous.json");Te(je(t),{recursive:!0}),Te(je(n),{recursive:!0});let o=qt(t)?Qt(t,"utf8"):"",s=e.binary??"toolnet-memory",i=`notify = [${JSON.stringify(s)}, "session:codex-notify"]`,r=o.split(`
`),a=r.findIndex(d=>/^\s*\[/.test(d));a<0&&(a=r.length);let l=-1,c=-1;for(let d=0;d<a;d+=1)if(/^\s*notify\s*=/.test(r[d])){if(l=d,c=d,r[d].includes("[")&&!r[d].includes("]"))for(;c+1<a&&(c+=1,!r[c].includes("]")););break}let u=[];if(l>=0){let d=r.slice(l,c+1).join(`
`);u=Xt(d),r.splice(l,c-l+1,i)}else a=r.findIndex(d=>/^\s*\[/.test(d)),a<0&&(a=r.length),r.splice(a,0,i);let p=u.length>=2&&u[u.length-1]==="session:codex-notify";return u.length>0&&!p&&ke(n,JSON.stringify(u,null,2)+`
`,{encoding:"utf8",mode:384}),o=r.join(`
`),o.endsWith(`
`)||(o+=`
`),ke(t,o,{encoding:"utf8",mode:384}),{configFile:t,previousFile:n,preservedPrevious:u.length>0&&!p}}import{existsSync as Zt,mkdirSync as en,readFileSync as tn,writeFileSync as nn}from"node:fs";import{homedir as on}from"node:os";import{dirname as rn,join as _e}from"node:path";function sn(e){return`'${e.replace(/'/g,"'\\''")}'`}function Pe(e={}){let t=e.hooksFile??_e(process.env.CODEX_HOME??_e(on(),".codex"),"hooks.json");en(rn(t),{recursive:!0});let n={};if(Zt(t))try{n=JSON.parse(tn(t,"utf8"))}catch(a){throw new Error(`Invalid existing Codex hooks.json: ${a instanceof Error?a.message:String(a)}`)}let o=n.hooks&&typeof n.hooks=="object"&&!Array.isArray(n.hooks)?n.hooks:{};n.hooks=o;let i=(Array.isArray(o.SessionStart)?o.SessionStart:[]).filter(a=>{try{return!JSON.stringify(a).includes("session:codex-context")}catch{return!0}}),r=e.binary??"toolnet-memory";return i.push({matcher:"startup|resume|clear|compact",hooks:[{type:"command",command:`${sn(r)} session:codex-context`,timeout:15,additionalContextLimit:1e3,statusMessage:"Loading ToolNet project continuity"}]}),o.SessionStart=i,nn(t,JSON.stringify(n,null,2)+`
`,{encoding:"utf8",mode:384}),t}import{spawnSync as an}from"node:child_process";function J(e,t){return an(e,t,{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}function Fe(e,t){let n=J(e,["mcp","get",t,"--json"]);if(n.status!==0||!n.stdout)return null;try{return JSON.parse(n.stdout)}catch{return null}}function De(e,t){return e.enabled!==!1&&e.transport?.type==="stdio"&&e.transport?.command===t&&Array.isArray(e.transport?.args)&&e.transport?.args.length===1&&e.transport.args[0]==="mcp"}function $e(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.codexBinary??"codex",o=e.serverName??"toolnet-memory",s=Fe(n,o);if(s&&De(s,t))return{installed:!0,changed:!1,serverName:o,command:t,args:["mcp"]};if(s){let a=J(n,["mcp","remove",o]);if(a.status!==0)return{installed:!1,changed:!1,serverName:o,command:t,args:["mcp"],error:(a.stderr||a.stdout||"Unable to remove old ToolNet MCP configuration.").trim()}}let i=J(n,["mcp","add",o,"--",t,"mcp"]);if(i.status!==0)return{installed:!1,changed:!1,serverName:o,command:t,args:["mcp"],error:(i.stderr||i.stdout||"Unable to register ToolNet MCP.").trim()};let r=Fe(n,o);return!r||!De(r,t)?{installed:!1,changed:!0,serverName:o,command:t,args:["mcp"],error:"Codex accepted MCP registration but verification did not match expected ToolNet command."}:{installed:!0,changed:!0,serverName:o,command:t,args:["mcp"]}}import{existsSync as cn,mkdirSync as ln,readFileSync as un,renameSync as dn,rmSync as mn,writeFileSync as pn}from"node:fs";import{dirname as gn}from"node:path";function x(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function fn(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function yn(e){if(!cn(e))return{};let t;try{t=JSON.parse(un(e,"utf8"))}catch(n){throw new Error(`Invalid existing Claude settings.json: ${n instanceof Error?n.message:String(n)}`)}if(!x(t))throw new Error("Invalid existing Claude settings.json: root must be a JSON object.");return t}function B(e){if(e===void 0)return[];if(!Array.isArray(e))throw new Error("Invalid existing Claude settings.json: hook event must be an array.");let t=[];for(let n of e){if(!x(n)){t.push(n);continue}let o=n.hooks;if(!Array.isArray(o)){t.push(n);continue}let s=o.filter(i=>{if(!x(i))return!0;let r=i.command;return!(typeof r=="string"&&r.includes("session:claude-hook"))});s.length!==0&&t.push({...n,hooks:s})}return t}function H(e){return{type:"command",command:e,timeout:10}}function hn(e,t){ln(gn(e),{recursive:!0,mode:448});let n=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{pn(n,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),dn(n,e)}finally{mn(n,{force:!0})}}function Le(e={}){let t=e.settingsFile??ie(),n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=yn(t),s=o.hooks;if(s!==void 0&&!x(s))throw new Error("Invalid existing Claude settings.json: hooks must be an object.");let i=x(s)?{...s}:{},r=`${fn(n)} session:claude-hook`,a=B(i.SessionStart);a.push({matcher:"startup|resume|clear|compact",hooks:[H(r)]}),i.SessionStart=a;let l=B(i.PostToolUse);l.push({matcher:"Edit|Write",hooks:[H(r)]}),i.PostToolUse=l;let c=B(i.Stop);c.push({hooks:[H(r)]}),i.Stop=c;let u={...o,hooks:i},p=JSON.stringify(o),d=JSON.stringify(u);return p===d?{settingsFile:t,changed:!1}:(hn(t,u),{settingsFile:t,changed:!0})}import{existsSync as vn,mkdirSync as bn,readFileSync as xn,renameSync as Sn,rmSync as wn,writeFileSync as On}from"node:fs";import{dirname as Cn}from"node:path";function S(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Je(e){if(!vn(e))return{};let t;try{t=JSON.parse(xn(e,"utf8"))}catch(n){throw new Error(`Invalid existing Claude Code config: ${n instanceof Error?n.message:String(n)}`)}if(!S(t))throw new Error("Invalid existing Claude Code config: root must be a JSON object.");return t}function Be(e,t){if(!S(e))return!1;let n=e.args;return e.type==="stdio"&&e.command===t&&Array.isArray(n)&&n.length===1&&n[0]==="mcp"}function Mn(e,t){bn(Cn(e),{recursive:!0});let n=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{On(n,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Sn(n,e)}finally{wn(n,{force:!0})}}function He(e={}){let t=e.stateFile??ae(),n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",s=Je(t),i=s.mcpServers;if(i!==void 0&&!S(i))throw new Error("Invalid existing Claude Code config: mcpServers must be an object.");let r=S(i)?{...i}:{},a=r[o];if(Be(a,n))return{installed:!0,changed:!1,configFile:t,serverName:o,command:[n,"mcp"],repaired:!1};let l=a!==void 0;r[o]={type:"stdio",command:n,args:["mcp"]},Mn(t,{...s,mcpServers:r});let u=Je(t).mcpServers;if(!S(u)||!Be(u[o],n))throw new Error("Claude Code MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:o,command:[n,"mcp"],repaired:l}}function Ye(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=Le({binary:t,settingsFile:e.settingsFile}),o=He({binary:t,stateFile:e.stateFile});return{hooks:n,mcp:o,files:[n.settingsFile,o.configFile]}}function ze(){return ce()}function Y(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=[],o=ze(),s=new Map(o.map(i=>[i.agent,i.detected]));if(!(e.force===!0||s.get("agy")===!0))n.push({agent:"agy",detected:!1,installed:!1,targets:[]});else try{let r=ve({binary:t});n.push({agent:"agy",detected:!0,installed:!0,targets:r.files})}catch(r){n.push({agent:"agy",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||s.get("opencode")===!0))n.push({agent:"opencode",detected:!1,installed:!1,targets:[]});else try{let r=Oe({binary:t}),a=Ee({binary:t});n.push({agent:"opencode",detected:!0,installed:!0,targets:[r,a.configFile,`mcp:${a.serverName}`]})}catch(r){n.push({agent:"opencode",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||s.get("claude")===!0))n.push({agent:"claude",detected:!1,installed:!1,targets:[]});else try{let r=Ye({binary:t});n.push({agent:"claude",detected:!0,installed:!0,targets:[r.hooks.settingsFile,r.mcp.configFile,`mcp:${r.mcp.serverName}`]})}catch(r){n.push({agent:"claude",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||s.get("codex")===!0))n.push({agent:"codex",detected:!1,installed:!1,targets:[]});else try{let r=Ne({binary:t}),a=Pe({binary:t}),l=$e({binary:t});if(!l.installed)throw new Error(l.error??"Codex MCP registration failed");let c=[r.configFile,a,`mcp:${l.serverName}`];r.preservedPrevious&&c.push(r.previousFile),n.push({agent:"codex",detected:!0,installed:!0,targets:c})}catch(r){n.push({agent:"codex",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}return n}function In(e){console.log(""),console.log("ToolNet Memory Integration Detection"),console.log("===================================="),console.log("");for(let t of e){let n=t.agent==="agy"?"Agy / Antigravity":t.agent==="opencode"?"OpenCode":t.agent==="claude"?"Claude Code":"Codex";if(!t.detected){console.log(`\u25CB ${n}: not detected`);continue}console.log(`\u2713 ${n}: detected`);for(let o of t.evidence)console.log(`  ${o}`)}console.log("")}function An(e){console.log(""),console.log("ToolNet Memory AI Integrations"),console.log("=============================="),console.log("");for(let t of e){let n=t.agent==="agy"?"Agy / Antigravity":t.agent==="opencode"?"OpenCode":"Codex";if(!t.detected){console.log(`- ${n}: not detected`);continue}if(t.installed){console.log(`\u2713 ${n}: automatic memory enabled`);continue}console.log(`\u2717 ${n}: integration failed`),t.error&&console.log(`  ${t.error}`)}console.log("")}async function En(){let e=process.argv.slice(2),t=e.includes("--all"),n=e.includes("--json");if(e.includes("--detect-only")){let i=ze();if(n){console.log(JSON.stringify(i,null,2));return}In(i);return}let s=Y({force:t});if(n){console.log(JSON.stringify(s,null,2));return}An(s)}var Tn=process.argv[1]&&(process.argv[1].endsWith("auto-integrate.js")||process.argv[1].endsWith("auto-integrate.ts"));Tn&&En().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});function Nn(e=process.cwd()){let t=Rn(e);if(!Ue(t))throw new Error(`Project path does not exist: ${t}`);if(!kn(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);let n=new O().detect(t),o=jn(n.rootPath,".toolnet","project.json");if(!Ue(o))throw new Error(`ToolNet project initialization failed: ${o} was not created`);return{initialized:!0,project:{id:n.id,name:n.name,remote:n.remote,rootPath:n.rootPath},manifestFile:o}}function _n(e,t){let n=e.indexOf(t);return n>=0?e[n+1]:void 0}async function Pn(){let e=process.argv.slice(2),t=e.includes("--json"),n=!e.includes("--no-integrate"),o=_n(e,"--project"),s=e.find((l,c)=>!l.startsWith("-")&&(c===0||e[c-1]!=="--project")),i=o??s??process.cwd(),r=await N("Initializing ToolNet project",()=>Nn(i),{enabled:!t}),a=[];if(n&&(a=await N("Detecting AI coding agents",()=>Y(),{enabled:!t})),t){console.log(JSON.stringify({...r,integrations:a},null,2));return}if(console.log(""),console.log("ToolNet Memory"),console.log("=============="),console.log(""),console.log("\u2713 Project initialized"),console.log(""),console.log(`Project:  ${r.project.name}`),console.log(`ID:       ${r.project.id}`),console.log(`Root:     ${r.project.rootPath}`),console.log(`Manifest: ${r.manifestFile}`),console.log(""),n){console.log("AI integrations:");let l=a.filter(c=>c.detected&&c.installed);if(!l.length)console.log("  \u25CB No supported coding agent detected");else for(let c of l){let u=c.agent==="agy"?"Agy / Antigravity":c.agent==="opencode"?"OpenCode":"Codex";console.log(`  \u2713 ${u}`)}console.log("")}console.log("Next: toolnet-memory doctor"),console.log("")}var Fn=process.argv[1]?.endsWith("/init.js")||process.argv[1]?.endsWith("/init.ts");Fn&&Pn().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});export{Nn as initializeToolNetProject};
