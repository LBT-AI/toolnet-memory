import{existsSync as ct,statSync as fo}from"node:fs";import{resolve as yo,join as ho}from"node:path";import{existsSync as lt,readFileSync as ut}from"node:fs";import{homedir as dt}from"node:os";import{join as mt}from"node:path";function pt(e){let n=e.trim();return n.length>=2&&n.startsWith('"')&&n.endsWith('"')?(n=n.slice(1,-1),n.replace(/\\n/g,`
`).replace(/\\r/g,"\r").replace(/\\t/g,"	").replace(/\\"/g,'"').replace(/\\\\/g,"\\")):n.length>=2&&n.startsWith("'")&&n.endsWith("'")?n.slice(1,-1):n}function gt(){let e=process.env.TOOLNET_GLOBAL_ENV??mt(dt(),".config","toolnet-memory",".env");if(!lt(e))return;let n=ut(e,"utf8");for(let t of n.split(/\r?\n/)){let o=t.trim();if(!o||o.startsWith("#"))continue;o.startsWith("export ")&&(o=o.slice(7));let s=o.indexOf("=");if(s<=0)continue;let i=o.slice(0,s).trim();/^[A-Za-z_][A-Za-z0-9_]*$/.test(i)&&process.env[i]===void 0&&(process.env[i]=pt(o.slice(s+1)))}}gt();import{createHash as ft}from"node:crypto";import{existsSync as _,mkdirSync as yt,readFileSync as ht,renameSync as vt,writeFileSync as bt}from"node:fs";import{basename as St,dirname as M,join as A,parse as X,resolve as v}from"node:path";var Z=".toolnet",Ot="project.json";function xt(e){return ft("sha256").update(e).digest("hex").slice(0,16)}function P(e){return A(e,Z,Ot)}function wt(e){return _(P(e))}function Ct(e,n){let t=v(e),o=X(t).root;for(;;){if(wt(t))return t;if(t===o||n&&t===v(n))break;let s=M(t);if(s===t)break;t=s}return null}function kt(e){let n=v(e),t=X(n).root,o=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"];for(;;){if(o.some(i=>_(A(n,i))))return n;if(n===t)break;let s=M(n);if(s===n)break;n=s}return v(e)}function It(e){let n;try{n=JSON.parse(ht(e,"utf8"))}catch(s){throw new Error(`Invalid ToolNet project manifest: ${e}: ${s instanceof Error?s.message:String(s)}`)}if(!n||typeof n!="object")throw new Error(`Invalid ToolNet project manifest: ${e}`);let t=n;if(typeof t.id!="string"||!t.id.trim())throw new Error(`ToolNet project manifest is missing id: ${e}`);if(typeof t.name!="string"||!t.name.trim())throw new Error(`ToolNet project manifest is missing name: ${e}`);let o=new Date().toISOString();return{version:1,id:t.id,name:t.name,remote:typeof t.remote=="string"&&t.remote.trim()?t.remote:t.name,rootPath:typeof t.rootPath=="string"?t.rootPath:M(M(e)),createdAt:typeof t.createdAt=="string"?t.createdAt:o,updatedAt:typeof t.updatedAt=="string"?t.updatedAt:o,graphVersion:typeof t.graphVersion=="number"?t.graphVersion:0,memoryVersion:typeof t.memoryVersion=="number"?t.memoryVersion:0,metadata:t.metadata&&typeof t.metadata=="object"?t.metadata:void 0}}function q(e,n){let t=A(e,Z);yt(t,{recursive:!0});let o=P(e),s=`${o}.tmp-${process.pid}`;bt(s,JSON.stringify(n,null,2)+`
`,{encoding:"utf8",mode:384}),vt(s,o)}function Q(e,n){return{id:e.id,name:e.name,remote:e.remote,rootPath:n,createdAt:e.createdAt,updatedAt:e.updatedAt,graphVersion:e.graphVersion,memoryVersion:e.memoryVersion,metadata:e.metadata}}var E=class{detect(n=process.cwd()){let t=v(n),o=kt(t),i=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(u=>_(A(o,u))),r=Ct(t,i?o:void 0);if(r){let u=P(r),p=It(u);return p.rootPath!==r&&(p.rootPath=r,p.updatedAt=new Date().toISOString(),q(r,p)),Q(p,r)}let a=new Date().toISOString(),l=St(o),c={version:1,id:xt(o),name:l,remote:l,rootPath:o,createdAt:a,updatedAt:a,graphVersion:0,memoryVersion:0};return q(o,c),Q(c,o)}};var ee=["\u280B","\u2819","\u2839","\u2838","\u283C","\u2834","\u2826","\u2827","\u2807","\u280F"],m={clear:"\r\x1B[2K",cyan:"\x1B[36m",green:"\x1B[32m",red:"\x1B[31m",yellow:"\x1B[33m",amber:"\x1B[38;5;214m",dim:"\x1B[2m",reset:"\x1B[0m"};function te(e,n=16){let o=Math.max(1,n-4+1),s=e%o;return"\u2500".repeat(s)+"\u2501".repeat(4)+"\u2500".repeat(Math.max(0,n-s-4))}function ne(e){let n=Date.now()-e;return n<1e3?`${n}ms`:n<1e4?`${(n/1e3).toFixed(1)}s`:`${Math.round(n/1e3)}s`}var F=class{stream;enabled;interactive;color;intervalMs;display;label;frame=0;startedAt=0;timer;active=!1;constructor(n,t={}){this.label=n,this.stream=t.stream??process.stderr,this.enabled=t.enabled??!0,this.interactive=t.interactive??this.stream.isTTY===!0,this.color=t.color??(this.interactive&&process.env.NO_COLOR===void 0),this.intervalMs=Math.max(40,t.intervalMs??80),this.display=t.display??"spinner"}start(){return!this.enabled||this.active?this:(this.active=!0,this.startedAt=Date.now(),this.interactive?(this.render(),this.timer=setInterval(()=>{this.frame=(this.frame+1)%1e4,this.render()},this.intervalMs),this.timer.unref?.(),this):(this.stream.write(`\u2192 ${this.label}
`),this))}update(n){return this.label=n,this.enabled&&this.active&&this.interactive&&this.render(),this}succeed(n){this.finish("\u2713",n??this.label,m.green)}fail(n){this.finish("\u2717",n??this.label,m.red)}warn(n){this.finish("!",n??this.label,m.yellow)}stop(){this.active&&(this.timer&&(clearInterval(this.timer),this.timer=void 0),this.enabled&&this.interactive&&this.stream.write(m.clear),this.active=!1)}render(){if(!this.enabled||!this.active||!this.interactive)return;let n=ee[this.frame%ee.length],t=this.display==="bar"?this.color?`${m.amber}${te(this.frame)}${m.reset}`:te(this.frame):this.color?`${m.cyan}${n}${m.reset}`:n,o=ne(this.startedAt),s=this.color?`${m.dim}${o}${m.reset}`:o;this.stream.write(`${m.clear}${t} ${this.label} ${s}`)}finish(n,t,o){if(!this.enabled){this.active=!1;return}this.startedAt||(this.startedAt=Date.now()),this.timer&&(clearInterval(this.timer),this.timer=void 0);let s=ne(this.startedAt),i=this.color?`${o}${n}${m.reset}`:n,r=this.color?`${m.dim}${s}${m.reset}`:s;this.interactive?this.stream.write(`${m.clear}${i} ${t} ${r}
`):this.stream.write(`${i} ${t} (${s})
`),this.active=!1}};async function $(e,n,t={}){let o=new F(e,t).start();try{let s=await n();return o.succeed(),s}catch(s){throw o.fail(),s}}import{existsSync as Rt}from"node:fs";import{homedir as Nt}from"node:os";import{join as _t}from"node:path";import{spawnSync as Pt}from"node:child_process";import{homedir as Mt}from"node:os";import{join as f}from"node:path";function oe(e={}){return f(e.home??Mt(),".gemini")}function D(e={}){return f(oe(e),"config")}function T(e={}){return f(D(e),"mcp_config.json")}function j(e={}){return f(D(e),"hooks.json")}function re(e={}){return f(oe(e),"antigravity-cli")}function se(e="toolnet-memory",n={}){return f(re(n),"plugins",e)}function ie(e={}){return[re(e),D(e)]}import{homedir as Et}from"node:os";import{join as b}from"node:path";function g(e={}){let n=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return n?b(n,"opencode"):b(e.home??Et(),".config","opencode")}function ae(e={}){return b(g(e),"opencode.json")}function ce(e={}){return b(g(e),"plugins")}function le(e={}){return b(g(e),"AGENTS.md")}import{homedir as ue}from"node:os";import{join as L}from"node:path";function J(e={}){return L(e.home??ue(),".claude")}function de(e={}){return L(J(e),"settings.json")}function me(e={}){return L(e.home??ue(),".claude.json")}import{homedir as At}from"node:os";import{join as S}from"node:path";function K(e={}){return e.kiroHome??process.env.KIRO_HOME??S(e.home??At(),".kiro")}function Tt(e={}){return S(K(e),"settings")}function pe(e={}){return S(Tt(e),"mcp.json")}function jt(e={}){return S(K(e),"hooks")}function ge(e={}){return S(jt(e),"toolnet-memory.json")}function fe(e={}){return[K(e)]}function Ft(e){return Pt("sh",["-lc",`command -v ${JSON.stringify(e)} >/dev/null 2>&1`],{stdio:"ignore"}).status===0}function O(e){let n=e.commandExists(e.command),t=e.configPaths.filter(i=>Rt(i)),o=t.length>0,s=[];n&&s.push(`command:${e.command}`);for(let i of t)s.push(`config:${i}`);return{agent:e.agent,detected:n||o,commandDetected:n,configDetected:o,evidence:s}}function ye(e={}){let n=e.home??Nt(),t=e.commandExists??Ft,o=e.codexHome??process.env.CODEX_HOME??_t(n,".codex");return[O({agent:"agy",command:"agy",commandExists:t,configPaths:ie({home:n})}),O({agent:"opencode",command:"opencode",commandExists:t,configPaths:[g({home:n,xdgConfigHome:e.xdgConfigHome})]}),O({agent:"claude",command:"claude",commandExists:t,configPaths:[J({home:n})]}),O({agent:"kiro",command:"kiro-cli",commandExists:t,configPaths:fe({home:n,kiroHome:e.kiroHome})}),O({agent:"codex",command:"codex",commandExists:t,configPaths:[o]})]}import{existsSync as N,mkdirSync as xe,readFileSync as we,renameSync as Xt,writeFileSync as Zt}from"node:fs";import{dirname as en,join as R}from"node:path";import{existsSync as $t,mkdirSync as Dt,readFileSync as Lt,renameSync as Jt,rmSync as Kt,writeFileSync as Ht}from"node:fs";import{dirname as Bt}from"node:path";function Yt(e){return`'${e.replace(/'/g,"'\\''")}'`}function he(e={}){let n=e.hooksFile??j();Dt(Bt(n),{recursive:!0,mode:448});let t={};if($t(n)){let r;try{r=JSON.parse(Lt(n,"utf8"))}catch(a){throw new Error(`Invalid existing Agy hooks.json: ${a instanceof Error?a.message:String(a)}`)}if(typeof r!="object"||r===null||Array.isArray(r))throw new Error("Invalid existing Agy hooks.json: root must be a JSON object.");t=r}let o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",s=`${Yt(o)} session:agy-hook`;t["toolnet-memory"]={enabled:!0,PreToolUse:[{matcher:"view_file|list_dir|find_by_name|grep_search|run_command",hooks:[{type:"command",command:`${s} pre-tool`,timeout:5}]}],PreInvocation:[{type:"command",command:`${s} pre`,timeout:15}],PostInvocation:[{type:"command",command:`${s} post`,timeout:15}],Stop:[{type:"command",command:`${s} stop`,timeout:30}]};let i=`${n}.tmp-${process.pid}-${Date.now()}`;try{Ht(i,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Jt(i,n)}finally{Kt(i,{force:!0})}return n}import{existsSync as Ut,mkdirSync as zt,readFileSync as Wt,renameSync as Gt,writeFileSync as Vt}from"node:fs";import{dirname as qt}from"node:path";function x(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Qt(e,n){zt(qt(e),{recursive:!0,mode:448});let t=`${e}.tmp-${process.pid}-${Date.now()}`;Vt(t,`${JSON.stringify(n,null,2)}
`,{encoding:"utf8",mode:384}),Gt(t,e)}function ve(e){if(!Ut(e))return{};let n=Wt(e,"utf8").trim();if(!n)return{};let t;try{t=JSON.parse(n)}catch(o){throw new Error(`Invalid existing Agy MCP config: ${o instanceof Error?o.message:String(o)}`)}if(!x(t))throw new Error("Invalid existing Agy MCP config: root must be a JSON object.");return t}function be(e,n){return x(e)?e.command===n&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function Se(e={}){let n=e.configFile??T(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",s=ve(n),i=s.mcpServers;if(i!==void 0&&!x(i))throw new Error("Invalid existing Agy MCP config: mcpServers must be an object.");let r=x(i)?{...i}:{},a=r[o];if(be(a,t))return{installed:!0,changed:!1,configFile:n,serverName:o,command:t,args:["mcp"]};r[o]={command:t,args:["mcp"]};let l={...s,mcpServers:r};Qt(n,l);let u=ve(n).mcpServers;if(!x(u)||!be(u[o],t))throw new Error("Agy MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:n,serverName:o,command:t,args:["mcp"]}}var tn=`# ToolNet Memory Continuity

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
`;function Ce(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function H(e,n){xe(en(e),{recursive:!0});let t=`${e}.tmp-${process.pid}-${Date.now()}`;Zt(t,n,{encoding:"utf8",mode:384}),Xt(t,e)}function Oe(e,n){N(e)&&we(e,"utf8")===n||H(e,n)}function ke(e){if(!N(e))return{};let n=we(e,"utf8").trim();if(!n)return{};let t;try{t=JSON.parse(n)}catch(o){throw new Error(`Invalid legacy Antigravity config ${e}: ${o instanceof Error?o.message:String(o)}`)}if(!Ce(t))throw new Error(`Invalid legacy Antigravity config ${e}: root must be object`);return t}function nn(e,n){if(!N(e))return!1;let t=ke(e);if(!Ce(t.mcpServers)||!Object.prototype.hasOwnProperty.call(t.mcpServers,n))return!1;let o={...t.mcpServers};return delete o[n],H(e,`${JSON.stringify({...t,mcpServers:o},null,2)}
`),!0}function on(e){if(!N(e))return!1;let n=ke(e);if(!Object.prototype.hasOwnProperty.call(n,"toolnet-memory"))return!1;let t={...n};return delete t["toolnet-memory"],H(e,`${JSON.stringify(t,null,2)}
`),!0}function Ie(e={}){let n=e.pluginName??"toolnet-memory",t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.pluginRoot??se(n),s=R(o,"plugin.json"),i=R(o,"mcp_config.json"),r=R(o,"hooks.json"),a=R(o,"rules","toolnet-memory-continuity.md");xe(o,{recursive:!0,mode:448}),Oe(s,`${JSON.stringify({$schema:"https://antigravity.google/schemas/v1/plugin.json",name:n,description:"Persistent project continuity and memory for Antigravity coding sessions."},null,2)}
`),Se({configFile:i,binary:t,serverName:"toolnet-memory"}),he({hooksFile:r,binary:t}),Oe(a,`${tn.trim()}
`);let l=e.legacyMcpFile??T(),c=e.legacyHooksFile??j(),u=[];return l!==i&&nn(l,"toolnet-memory")&&u.push(l),c!==r&&on(c)&&u.push(c),{installed:!0,pluginRoot:o,files:[s,i,r,a],migratedLegacy:u}}import{existsSync as sn,mkdirSync as Ae,readFileSync as an,writeFileSync as Te}from"node:fs";import{join as cn}from"node:path";var rn="memory_agent_ask";function Me(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${rn}

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
`.trim()}var Ee="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",B="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function ln(){let e=le();Ae(g(),{recursive:!0});let n=`${Ee}
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


${Me()}

${B}`,t=sn(e)?an(e,"utf8"):"",o=t.indexOf(Ee),s=t.indexOf(B);return o>=0&&s>=o?t=t.slice(0,o)+n+t.slice(s+B.length):(t=t.trimEnd(),t&&(t+=`

`),t+=n),Te(e,t.trimEnd()+`
`,{encoding:"utf8",mode:384}),e}function je(e={}){let n=e.directory??ce();Ae(n,{recursive:!0}),ln();let t=cn(n,"toolnet-memory.js"),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",s=`
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
`;return Te(t,s.trimStart(),{encoding:"utf8",mode:384}),t}import{existsSync as _e,mkdirSync as un,readFileSync as dn,renameSync as mn,writeFileSync as pn}from"node:fs";import{dirname as Pe,join as gn}from"node:path";function y(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function fn(e,n){un(Pe(e),{recursive:!0});let t=`${e}.tmp-${process.pid}-${Date.now()}`;pn(t,`${JSON.stringify(n,null,2)}
`,{encoding:"utf8",mode:384}),mn(t,e)}function Re(e){if(!_e(e))return{};let n=dn(e,"utf8").trim();if(!n)return{};let t;try{t=JSON.parse(n)}catch(o){throw new Error(`Invalid existing OpenCode opencode.json: ${o instanceof Error?o.message:String(o)}`)}if(!y(t))throw new Error("Invalid existing OpenCode opencode.json: root must be a JSON object.");return t}function Ne(e,n){if(!y(e))return!1;let t=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(t)&&t.length===2&&t[0]===n&&t[1]==="mcp"}function yn(e,n){let t=e.mcpServers;if(!y(t)||!Object.prototype.hasOwnProperty.call(t,n))return{root:e,changed:!1};let o={...t};return delete o[n],{root:{...e,mcpServers:o},changed:!0}}function Fe(e={}){let n=e.configFile??ae(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",s=gn(Pe(n),"opencode.jsonc"),i=_e(s)?s:void 0,r=Re(n),a=yn(r,o),l=a.root,c=l.mcp;if(c!==void 0&&!y(c))throw new Error("Invalid existing OpenCode config: mcp must be an object.");let u=y(c)?{...c}:{},p=u[o];if(Ne(p,t)&&!a.changed)return{installed:!0,changed:!1,configFile:n,serverName:o,command:[t,"mcp"],preservedJsonc:i};u[o]={type:"local",command:[t,"mcp"],enabled:!0};let d={...l,mcp:u};fn(n,d);let V=Re(n);if(!y(V.mcp)||!Ne(V.mcp[o],t))throw new Error("OpenCode MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:n,serverName:o,command:[t,"mcp"],preservedJsonc:i}}import{existsSync as hn,mkdirSync as $e,readFileSync as vn,writeFileSync as De}from"node:fs";import{homedir as Le}from"node:os";import{dirname as Je,join as Y}from"node:path";function bn(e){let n=[],t=/"((?:\\.|[^"\\])*)"|'([^']*)'/g,o;for(;o=t.exec(e);){let s=o[1]??o[2]??"";try{n.push(o[1]!==void 0?JSON.parse(`"${s}"`):s)}catch{n.push(s)}}return n}function Ke(e={}){let n=e.configFile??Y(process.env.CODEX_HOME??Y(Le(),".codex"),"config.toml"),t=e.previousFile??Y(Le(),".config","toolnet-memory","codex-notify-previous.json");$e(Je(n),{recursive:!0}),$e(Je(t),{recursive:!0});let o=hn(n)?vn(n,"utf8"):"",s=e.binary??"toolnet-memory",i=`notify = [${JSON.stringify(s)}, "session:codex-notify"]`,r=o.split(`
`),a=r.findIndex(d=>/^\s*\[/.test(d));a<0&&(a=r.length);let l=-1,c=-1;for(let d=0;d<a;d+=1)if(/^\s*notify\s*=/.test(r[d])){if(l=d,c=d,r[d].includes("[")&&!r[d].includes("]"))for(;c+1<a&&(c+=1,!r[c].includes("]")););break}let u=[];if(l>=0){let d=r.slice(l,c+1).join(`
`);u=bn(d),r.splice(l,c-l+1,i)}else a=r.findIndex(d=>/^\s*\[/.test(d)),a<0&&(a=r.length),r.splice(a,0,i);let p=u.length>=2&&u[u.length-1]==="session:codex-notify";return u.length>0&&!p&&De(t,JSON.stringify(u,null,2)+`
`,{encoding:"utf8",mode:384}),o=r.join(`
`),o.endsWith(`
`)||(o+=`
`),De(n,o,{encoding:"utf8",mode:384}),{configFile:n,previousFile:t,preservedPrevious:u.length>0&&!p}}import{existsSync as Sn,mkdirSync as On,readFileSync as xn,writeFileSync as wn}from"node:fs";import{homedir as Cn}from"node:os";import{dirname as kn,join as He}from"node:path";function In(e){return`'${e.replace(/'/g,"'\\''")}'`}function Be(e={}){let n=e.hooksFile??He(process.env.CODEX_HOME??He(Cn(),".codex"),"hooks.json");On(kn(n),{recursive:!0});let t={};if(Sn(n))try{t=JSON.parse(xn(n,"utf8"))}catch(a){throw new Error(`Invalid existing Codex hooks.json: ${a instanceof Error?a.message:String(a)}`)}let o=t.hooks&&typeof t.hooks=="object"&&!Array.isArray(t.hooks)?t.hooks:{};t.hooks=o;let i=(Array.isArray(o.SessionStart)?o.SessionStart:[]).filter(a=>{try{return!JSON.stringify(a).includes("session:codex-context")}catch{return!0}}),r=e.binary??"toolnet-memory";return i.push({matcher:"startup|resume|clear|compact",hooks:[{type:"command",command:`${In(r)} session:codex-context`,timeout:15,additionalContextLimit:1e3,statusMessage:"Loading ToolNet project continuity"}]}),o.SessionStart=i,wn(n,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),n}import{spawnSync as Mn}from"node:child_process";function U(e,n){return Mn(e,n,{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}function Ye(e,n){let t=U(e,["mcp","get",n,"--json"]);if(t.status!==0||!t.stdout)return null;try{return JSON.parse(t.stdout)}catch{return null}}function Ue(e,n){return e.enabled!==!1&&e.transport?.type==="stdio"&&e.transport?.command===n&&Array.isArray(e.transport?.args)&&e.transport?.args.length===1&&e.transport.args[0]==="mcp"}function ze(e={}){let n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=e.codexBinary??"codex",o=e.serverName??"toolnet-memory",s=Ye(t,o);if(s&&Ue(s,n))return{installed:!0,changed:!1,serverName:o,command:n,args:["mcp"]};if(s){let a=U(t,["mcp","remove",o]);if(a.status!==0)return{installed:!1,changed:!1,serverName:o,command:n,args:["mcp"],error:(a.stderr||a.stdout||"Unable to remove old ToolNet MCP configuration.").trim()}}let i=U(t,["mcp","add",o,"--",n,"mcp"]);if(i.status!==0)return{installed:!1,changed:!1,serverName:o,command:n,args:["mcp"],error:(i.stderr||i.stdout||"Unable to register ToolNet MCP.").trim()};let r=Ye(t,o);return!r||!Ue(r,n)?{installed:!1,changed:!0,serverName:o,command:n,args:["mcp"],error:"Codex accepted MCP registration but verification did not match expected ToolNet command."}:{installed:!0,changed:!0,serverName:o,command:n,args:["mcp"]}}import{existsSync as En,mkdirSync as An,readFileSync as Tn,renameSync as jn,rmSync as Rn,writeFileSync as Nn}from"node:fs";import{dirname as _n}from"node:path";function w(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Pn(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function Fn(e){if(!En(e))return{};let n;try{n=JSON.parse(Tn(e,"utf8"))}catch(t){throw new Error(`Invalid existing Claude settings.json: ${t instanceof Error?t.message:String(t)}`)}if(!w(n))throw new Error("Invalid existing Claude settings.json: root must be a JSON object.");return n}function z(e){if(e===void 0)return[];if(!Array.isArray(e))throw new Error("Invalid existing Claude settings.json: hook event must be an array.");let n=[];for(let t of e){if(!w(t)){n.push(t);continue}let o=t.hooks;if(!Array.isArray(o)){n.push(t);continue}let s=o.filter(i=>{if(!w(i))return!0;let r=i.command;return!(typeof r=="string"&&r.includes("session:claude-hook"))});s.length!==0&&n.push({...t,hooks:s})}return n}function W(e){return{type:"command",command:e,timeout:10}}function $n(e,n){An(_n(e),{recursive:!0,mode:448});let t=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Nn(t,JSON.stringify(n,null,2)+`
`,{encoding:"utf8",mode:384}),jn(t,e)}finally{Rn(t,{force:!0})}}function We(e={}){let n=e.settingsFile??de(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=Fn(n),s=o.hooks;if(s!==void 0&&!w(s))throw new Error("Invalid existing Claude settings.json: hooks must be an object.");let i=w(s)?{...s}:{},r=`${Pn(t)} session:claude-hook`,a=z(i.SessionStart);a.push({matcher:"startup|resume|clear|compact",hooks:[W(r)]}),i.SessionStart=a;let l=z(i.PostToolUse);l.push({matcher:"Edit|Write",hooks:[W(r)]}),i.PostToolUse=l;let c=z(i.Stop);c.push({hooks:[W(r)]}),i.Stop=c;let u={...o,hooks:i},p=JSON.stringify(o),d=JSON.stringify(u);return p===d?{settingsFile:n,changed:!1}:($n(n,u),{settingsFile:n,changed:!0})}import{existsSync as Dn,mkdirSync as Ln,readFileSync as Jn,renameSync as Kn,rmSync as Hn,writeFileSync as Bn}from"node:fs";import{dirname as Yn}from"node:path";function C(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Ge(e){if(!Dn(e))return{};let n;try{n=JSON.parse(Jn(e,"utf8"))}catch(t){throw new Error(`Invalid existing Claude Code config: ${t instanceof Error?t.message:String(t)}`)}if(!C(n))throw new Error("Invalid existing Claude Code config: root must be a JSON object.");return n}function Ve(e,n){if(!C(e))return!1;let t=e.args;return e.type==="stdio"&&e.command===n&&Array.isArray(t)&&t.length===1&&t[0]==="mcp"}function Un(e,n){Ln(Yn(e),{recursive:!0});let t=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Bn(t,JSON.stringify(n,null,2)+`
`,{encoding:"utf8",mode:384}),Kn(t,e)}finally{Hn(t,{force:!0})}}function qe(e={}){let n=e.stateFile??me(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",s=Ge(n),i=s.mcpServers;if(i!==void 0&&!C(i))throw new Error("Invalid existing Claude Code config: mcpServers must be an object.");let r=C(i)?{...i}:{},a=r[o];if(Ve(a,t))return{installed:!0,changed:!1,configFile:n,serverName:o,command:[t,"mcp"],repaired:!1};let l=a!==void 0;r[o]={type:"stdio",command:t,args:["mcp"]},Un(n,{...s,mcpServers:r});let u=Ge(n).mcpServers;if(!C(u)||!Ve(u[o],t))throw new Error("Claude Code MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:n,serverName:o,command:[t,"mcp"],repaired:l}}function Qe(e={}){let n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=We({binary:n,settingsFile:e.settingsFile}),o=qe({binary:n,stateFile:e.stateFile});return{hooks:t,mcp:o,files:[t.settingsFile,o.configFile]}}import{existsSync as zn,mkdirSync as Wn,readFileSync as Gn,renameSync as Vn,rmSync as qn,writeFileSync as Qn}from"node:fs";import{dirname as Xn}from"node:path";var h="ToolNet Memory - ";function et(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Zn(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function Xe(e){if(!zn(e))return{};let n=Gn(e,"utf8").trim();if(!n)return{};let t;try{t=JSON.parse(n)}catch(o){throw new Error(`Invalid existing Kiro hooks file: ${o instanceof Error?o.message:String(o)}`)}if(!et(t))throw new Error("Invalid existing Kiro hooks file: root must be a JSON object.");return t}function Ze(e){return et(e)?typeof e.name=="string"&&e.name.startsWith(h):!1}function k(e){return{type:"command",command:e}}function eo(e){return[{name:`${h}Session Start`,description:"Inject compact local ToolNet continuity and capture Kiro session activation.",trigger:"SessionStart",action:k(e),timeout:10,enabled:!0},{name:`${h}Prompt Continuity`,description:"Capture prompts and refresh ToolNet guidance only for resume/continue requests.",trigger:"UserPromptSubmit",action:k(e),timeout:10,enabled:!0},{name:`${h}Raw History Guard`,description:"Prevent Kiro from reconstructing continuity from raw ToolNet/agent session history.",trigger:"PreToolUse",matcher:"*",action:k(e),timeout:10,enabled:!0},{name:`${h}Tool Capture`,description:"Capture durable tool activity while filtering noisy read-only events.",trigger:"PostToolUse",matcher:"*",action:k(e),timeout:15,enabled:!0},{name:`${h}Final Flush`,description:"Flush pending Kiro WAL events when the assistant finishes a turn.",trigger:"Stop",action:k(e),timeout:30,enabled:!0}]}function to(e,n){Wn(Xn(e),{recursive:!0,mode:448});let t=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Qn(t,JSON.stringify(n,null,2)+`
`,{encoding:"utf8",mode:384}),Vn(t,e)}finally{qn(t,{force:!0})}}function tt(e={}){let n=e.hooksFile??ge(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=Xe(n);if(o.version!==void 0&&o.version!=="v1")throw new Error(`Unsupported existing Kiro hooks version: ${String(o.version)}`);let s=o.hooks;if(s!==void 0&&!Array.isArray(s))throw new Error("Invalid existing Kiro hooks file: hooks must be an array.");let i=Array.isArray(s)?s.filter(u=>!Ze(u)):[],r=`${Zn(t)} session:kiro-hook`,a=eo(r),l={...o,version:"v1",hooks:[...i,...a]};if(JSON.stringify(o)===JSON.stringify(l))return{hooksFile:n,changed:!1,hookCount:a.length};to(n,l);let c=Xe(n);if(c.version!=="v1"||!Array.isArray(c.hooks)||c.hooks.filter(Ze).length!==a.length)throw new Error("Kiro hooks were written but verification failed.");return{hooksFile:n,changed:!0,hookCount:a.length}}import{existsSync as no,mkdirSync as oo,readFileSync as ro,renameSync as so,rmSync as io,writeFileSync as ao}from"node:fs";import{dirname as co}from"node:path";function I(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function nt(e){if(!no(e))return{};let n=ro(e,"utf8").trim();if(!n)return{};let t;try{t=JSON.parse(n)}catch(o){throw new Error(`Invalid existing Kiro MCP config: ${o instanceof Error?o.message:String(o)}`)}if(!I(t))throw new Error("Invalid existing Kiro MCP config: root must be a JSON object.");return t}function ot(e,n){return I(e)?e.command===n&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&e.disabled===!1:!1}function lo(e,n){oo(co(e),{recursive:!0,mode:448});let t=`${e}.tmp-${process.pid}-${Date.now()}`;try{ao(t,`${JSON.stringify(n,null,2)}
`,{encoding:"utf8",mode:384}),so(t,e)}finally{io(t,{force:!0})}}function rt(e={}){let n=e.configFile??pe(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",s=nt(n),i=s.mcpServers;if(i!==void 0&&!I(i))throw new Error("Invalid existing Kiro MCP config: mcpServers must be an object.");let r=I(i)?{...i}:{},a=r[o];if(ot(a,t))return{installed:!0,changed:!1,configFile:n,serverName:o,command:t,args:["mcp"]};r[o]={command:t,args:["mcp"],disabled:!1};let l={...s,mcpServers:r};lo(n,l);let u=nt(n).mcpServers;if(!I(u)||!ot(u[o],t))throw new Error("Kiro MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:n,serverName:o,command:t,args:["mcp"]}}function st(e={}){let n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=rt({binary:n,configFile:e.configFile}),o=tt({binary:n,hooksFile:e.hooksFile});return{installed:t.installed,changed:t.changed||o.changed,mcp:t,hooks:o,files:[t.configFile,o.hooksFile]}}function it(){return ye()}function G(e={}){let n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=[],o=e.detections??it(),s=new Map(o.map(i=>[i.agent,i.detected]));if(!(e.force===!0||s.get("agy")===!0))t.push({agent:"agy",detected:!1,installed:!1,targets:[]});else try{let r=Ie({binary:n});t.push({agent:"agy",detected:!0,installed:!0,targets:r.files})}catch(r){t.push({agent:"agy",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||s.get("opencode")===!0))t.push({agent:"opencode",detected:!1,installed:!1,targets:[]});else try{let r=je({binary:n}),a=Fe({binary:n});t.push({agent:"opencode",detected:!0,installed:!0,targets:[r,a.configFile,`mcp:${a.serverName}`]})}catch(r){t.push({agent:"opencode",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||s.get("claude")===!0))t.push({agent:"claude",detected:!1,installed:!1,targets:[]});else try{let r=Qe({binary:n});t.push({agent:"claude",detected:!0,installed:!0,targets:[r.hooks.settingsFile,r.mcp.configFile,`mcp:${r.mcp.serverName}`]})}catch(r){t.push({agent:"claude",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||s.get("kiro")===!0))t.push({agent:"kiro",detected:!1,installed:!1,targets:[]});else try{let r=st({...e.kiro??{},binary:n});t.push({agent:"kiro",detected:!0,installed:!0,targets:[r.mcp.configFile,`mcp:${r.mcp.serverName}`,r.hooks.hooksFile]})}catch(r){t.push({agent:"kiro",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||s.get("codex")===!0))t.push({agent:"codex",detected:!1,installed:!1,targets:[]});else try{let r=Ke({binary:n}),a=Be({binary:n}),l=ze({binary:n});if(!l.installed)throw new Error(l.error??"Codex MCP registration failed");let c=[r.configFile,a,`mcp:${l.serverName}`];r.preservedPrevious&&c.push(r.previousFile),t.push({agent:"codex",detected:!0,installed:!0,targets:c})}catch(r){t.push({agent:"codex",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}return t}function at(e){switch(e){case"agy":return"Agy / Antigravity";case"opencode":return"OpenCode";case"claude":return"Claude Code";case"kiro":return"Kiro CLI";case"codex":return"Codex"}}function uo(e){console.log(""),console.log("ToolNet Memory Integration Detection"),console.log("===================================="),console.log("");for(let n of e){let t=at(n.agent);if(!n.detected){console.log(`\u25CB ${t}: not detected`);continue}console.log(`\u2713 ${t}: detected`);for(let o of n.evidence)console.log(`  ${o}`)}console.log("")}function mo(e){console.log(""),console.log("ToolNet Memory AI Integrations"),console.log("=============================="),console.log("");for(let n of e){let t=at(n.agent);if(!n.detected){console.log(`- ${t}: not detected`);continue}if(n.installed){console.log(`\u2713 ${t}: automatic memory enabled`);continue}console.log(`\u2717 ${t}: integration failed`),n.error&&console.log(`  ${n.error}`)}console.log("")}async function po(){let e=process.argv.slice(2),n=e.includes("--all"),t=e.includes("--json");if(e.includes("--detect-only")){let i=it();if(t){console.log(JSON.stringify(i,null,2));return}uo(i);return}let s=G({force:n});if(t){console.log(JSON.stringify(s,null,2));return}mo(s)}var go=process.argv[1]&&(process.argv[1].endsWith("auto-integrate.js")||process.argv[1].endsWith("auto-integrate.ts"));go&&po().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});function vo(e=process.cwd()){let n=yo(e);if(!ct(n))throw new Error(`Project path does not exist: ${n}`);if(!fo(n).isDirectory())throw new Error(`Project path is not a directory: ${n}`);let t=new E().detect(n),o=ho(t.rootPath,".toolnet","project.json");if(!ct(o))throw new Error(`ToolNet project initialization failed: ${o} was not created`);return{initialized:!0,project:{id:t.id,name:t.name,remote:t.remote,rootPath:t.rootPath},manifestFile:o}}function bo(e,n){let t=e.indexOf(n);return t>=0?e[t+1]:void 0}async function So(){let e=process.argv.slice(2),n=e.includes("--json"),t=!e.includes("--no-integrate"),o=bo(e,"--project"),s=e.find((l,c)=>!l.startsWith("-")&&(c===0||e[c-1]!=="--project")),i=o??s??process.cwd(),r=await $("Initializing ToolNet project",()=>vo(i),{enabled:!n}),a=[];if(t&&(a=await $("Detecting AI coding agents",()=>G(),{enabled:!n})),n){console.log(JSON.stringify({...r,integrations:a},null,2));return}if(console.log(""),console.log("ToolNet Memory"),console.log("=============="),console.log(""),console.log("\u2713 Project initialized"),console.log(""),console.log(`Project:  ${r.project.name}`),console.log(`ID:       ${r.project.id}`),console.log(`Root:     ${r.project.rootPath}`),console.log(`Manifest: ${r.manifestFile}`),console.log(""),t){console.log("AI integrations:");let l=a.filter(c=>c.detected&&c.installed);if(!l.length)console.log("  \u25CB No supported coding agent detected");else for(let c of l){let u=c.agent==="agy"?"Agy / Antigravity":c.agent==="opencode"?"OpenCode":"Codex";console.log(`  \u2713 ${u}`)}console.log("")}console.log("Next: toolnet-memory doctor"),console.log("")}var Oo=process.argv[1]?.endsWith("/init.js")||process.argv[1]?.endsWith("/init.ts");Oo&&So().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});export{vo as initializeToolNetProject};
