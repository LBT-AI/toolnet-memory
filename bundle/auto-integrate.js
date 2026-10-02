import{existsSync as Rt}from"node:fs";import{homedir as Jr}from"node:os";import{join as y}from"node:path";import{spawnSync as Gr}from"node:child_process";import{homedir as yr}from"node:os";import{join as R}from"node:path";function et(e={}){return R(e.home??yr(),".gemini")}function tt(e={}){return R(et(e),"antigravity-cli")}function ot(e={}){return R(et(e),"config")}function B(e={}){return R(ot(e),"mcp_config.json")}function W(e={}){let t=e.cwd??process.cwd();return R(t,".agents","mcp_config.json")}function U(e="toolnet-memory",t={}){return R(tt(t),"plugins",e)}function nt(e={}){return[tt(e),B(e),ot(e),W(e)]}import{homedir as rt}from"node:os";import{join as v}from"node:path";function E(e={}){let t=process.env.OPENCODE_CONFIG_DIR?.trim();if(t)return t;let o=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return o?v(o,"opencode"):v(e.home??rt(),".config","opencode")}function me(e={}){let t=process.env.OPENCODE_CONFIG?.trim();if(t)return t;let o=e.home??rt(),n=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return n?v(n,"opencode","opencode.json"):v(o,".config","opencode","opencode.json")}function ye(e={}){let t=e.cwd??process.cwd();return v(t,"opencode.json")}function it(e={}){return v(E(e),"plugins")}function st(e={}){return v(E(e),"AGENTS.md")}import{homedir as ct}from"node:os";import{join as he}from"node:path";function ke(e={}){return he(e.home??ct(),".claude")}function lt(e={}){return he(ke(e),"settings.json")}function at(e={}){return he(e.home??ct(),".claude.json")}import{homedir as hr}from"node:os";import{join as F}from"node:path";function Ie(e={}){return e.kiroHome??process.env.KIRO_HOME??F(e.home??hr(),".kiro")}function kr(e={}){return F(Ie(e),"settings")}function Q(e={}){return F(kr(e),"mcp.json")}function be(e={}){let t=e.cwd??process.cwd();return F(t,".kiro","settings","mcp.json")}function Ir(e={}){return F(Ie(e),"hooks")}function Se(e={}){return F(Ir(e),"toolnet-memory.json")}function Oe(e={}){let t=e.cwd??process.cwd();return F(t,".kiro","hooks","toolnet-memory.json")}function ut(e={}){return[Ie(e),Q(e)]}import{homedir as br}from"node:os";import{join as we}from"node:path";function dt(e={}){return we(e.home??br(),".toolnetcli")}function Sr(e={}){return we(dt(e),"config.json")}function pt(e={}){let t=e.cwd??process.cwd();return we(t,".toolnet","mcp.json")}function gt(e={}){let t=dt(e),o=Sr(e);return[t,o]}import{homedir as Or}from"node:os";import{join as je}from"node:path";function ft(e={}){if(e.kiloHome)return e.kiloHome;if(process.env.KILO_HOME)return process.env.KILO_HOME;let t=e.xdgConfigHome??process.env.XDG_CONFIG_HOME;return t?je(t,"kilo"):je(e.home??Or(),".config","kilo")}function Ce(e={}){return je(ft(e),"kilo.jsonc")}function mt(e={}){let t=ft(e),o=Ce(e);return[t,o]}import{homedir as wr}from"node:os";import{join as S,resolve as jr}from"node:path";function Y(e={}){return e.cursorHome??S(e.home??wr(),".cursor")}function Cr(e={}){return e.cursorConfigDir??process.env.CURSOR_CONFIG_DIR??(e.xdgConfigHome??process.env.XDG_CONFIG_HOME?S(e.xdgConfigHome??process.env.XDG_CONFIG_HOME,"cursor"):void 0)??Y(e)}function V(e={}){return S(Y(e),"mcp.json")}function X(e={}){return S(Y(e),"hooks.json")}function xe(e){return S(jr(e),".cursor")}function yt(e){return S(xe(e),"mcp.json")}function ht(e){return S(xe(e),"hooks.json")}function xr(e){return S(xe(e),"rules")}function kt(e){return S(xr(e),"toolnet-memory.mdc")}function It(e={}){return Array.from(new Set([Y(e),Cr(e)]))}import{homedir as vr}from"node:os";import{join as b,resolve as Fr}from"node:path";function ve(e={}){return e.copilotHome??process.env.COPILOT_HOME??b(e.home??vr(),".copilot")}function z(e={}){return b(ve(e),"mcp-config.json")}function Rr(e={}){return b(ve(e),"hooks")}function Z(e={}){return b(Rr(e),"toolnet-memory.json")}function Fe(e){return b(Fr(e),".github")}function bt(e){return b(Fe(e),"mcp.json")}function Er(e){return b(Fe(e),"hooks")}function St(e){return b(Er(e),"toolnet-memory.json")}function Pr(e){return b(Fe(e),"instructions")}function Ot(e){return b(Pr(e),"toolnet-memory.instructions.md")}function wt(e={}){return[ve(e)]}import{homedir as Nr}from"node:os";import{join as k,resolve as Tr}from"node:path";function ee(e={}){return e.grokHome??process.env.GROK_HOME??k(e.home??Nr(),".grok")}function te(e={}){return k(ee(e),"config.toml")}function Ar(e={}){return k(ee(e),"hooks")}function oe(e={}){return k(Ar(e),"toolnet-memory.json")}function Mr(e={}){return k(ee(e),"skills")}function Hr(e={}){return k(Mr(e),"toolnet-continuity")}function ne(e={}){return k(Hr(e),"SKILL.md")}function Re(e){return k(Tr(e),".grok")}function jt(e){return k(Re(e),"config.toml")}function $r(e){return k(Re(e),"hooks")}function Ct(e){return k($r(e),"toolnet-memory.json")}function Dr(e){return k(Re(e),"skills")}function _r(e){return k(Dr(e),"toolnet-continuity")}function xt(e){return k(_r(e),"SKILL.md")}function vt(e={}){return[ee(e)]}function Lr(e){return Gr("sh",["-lc",`command -v ${JSON.stringify(e)} >/dev/null 2>&1`],{stdio:"ignore"}).status===0}function f(e){let t=e.commandExists(e.command),o=e.configPaths.filter(c=>Rt(c)),n=o.length>0,r=[];t&&r.push(`command:${e.command}`);for(let c of o)r.push(`config:${c}`);return{agent:e.agent,detected:t||n,commandDetected:t,configDetected:n,evidence:r}}function Ft(e){let t=e.commands.filter(s=>e.commandExists(s)),o=e.configPaths.filter(s=>Rt(s)),n=t.length>0,r=o.length>0,c=[...t.map(s=>`command:${s}`),...o.map(s=>`config:${s}`)];return{agent:e.agent,detected:n||r,commandDetected:n,configDetected:r,evidence:c}}function Et(e={}){let t=e.home??Jr(),o=e.commandExists??Lr,n=e.codexHome??process.env.CODEX_HOME??y(t,".codex");return[f({agent:"agy",command:"agy",commandExists:o,configPaths:nt({home:t})}),f({agent:"opencode",command:"opencode",commandExists:o,configPaths:[E({home:t,xdgConfigHome:e.xdgConfigHome})]}),f({agent:"claude",command:"claude",commandExists:o,configPaths:[ke({home:t})]}),f({agent:"kiro",command:"kiro-cli",commandExists:o,configPaths:ut({home:t,kiroHome:e.kiroHome})}),Ft({agent:"cursor",commands:["agent","cursor-agent"],commandExists:o,configPaths:It({home:t,cursorHome:e.cursorHome,cursorConfigDir:e.cursorConfigDir,xdgConfigHome:e.xdgConfigHome})}),f({agent:"copilot",command:"copilot",commandExists:o,configPaths:wt({home:t,copilotHome:e.copilotHome})}),f({agent:"grok",command:"grok",commandExists:o,configPaths:vt({home:t,grokHome:e.grokHome})}),f({agent:"toolnet-cli",command:"toolnet",commandExists:o,configPaths:gt({home:t})}),Ft({agent:"kilo",commands:["kilo","kilo-code"],commandExists:o,configPaths:mt({home:t,kiloHome:e.kiloHome})}),f({agent:"codex",command:"codex",commandExists:o,configPaths:[n]}),f({agent:"goose",command:"goose",commandExists:o,configPaths:[y(t,".agents","plugins")]}),f({agent:"qwen",command:"qwen",commandExists:o,configPaths:[y(t,".qwen")]}),f({agent:"kimi",command:"kimi-code",commandExists:o,configPaths:[y(t,".kimi-code")]}),f({agent:"hermes",command:"hermes",commandExists:o,configPaths:[y(t,".hermes")]}),f({agent:"qoder",command:"qoder",commandExists:o,configPaths:[y(t,".qoder-cn"),y(t,".qoder")]}),f({agent:"aider",command:"aider",commandExists:o,configPaths:[y(t,".aider")]}),f({agent:"plandex",command:"plandex",commandExists:o,configPaths:[y(t,".plandex"),y(t,"plandex-server")]}),f({agent:"openrouter",command:"openrouter",commandExists:o,configPaths:[y(t,".openrouter")]}),f({agent:"bob",command:"bob",commandExists:o,configPaths:[y(t,".bob")]}),f({agent:"cline",command:"cline",commandExists:o,configPaths:[y(t,".cline")]}),f({agent:"rovo",command:"rovo",commandExists:o,configPaths:[y(t,".rovodev"),y(t,".rovo")]}),f({agent:"warp",command:"warp",commandExists:o,configPaths:[y(t,".warp")]})]}import{existsSync as ci,mkdirSync as Ht,readFileSync as li,renameSync as ai,writeFileSync as ui}from"node:fs";import{dirname as di,join as ie}from"node:path";import{existsSync as qr,mkdirSync as Kr,readFileSync as Br,renameSync as Wr,rmSync as Ur,writeFileSync as Qr}from"node:fs";import{dirname as Yr,join as Vr}from"node:path";function Xr(e){return`'${e.replace(/'/g,"'\\''")}'`}function zr(e){if(!qr(e))return{};let t;try{t=JSON.parse(Br(e,"utf8"))}catch{throw new Error(`Invalid existing Agy hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Agy hooks.json at ${e}: root must be a JSON object.`);return t}function Zr(e,t){Kr(Yr(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Qr(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Wr(o,e)}finally{Ur(o,{force:!0})}}function Pt(e={}){let t=e.pluginName??"toolnet-memory",o=e.hooksFile??Vr(U(t),"hooks.json"),n=zr(o),r=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",c=`${Xr(r)} session:agy-hook`;return n["toolnet-memory"]={enabled:!0,PreToolUse:[{matcher:"view_file|list_dir|find_by_name|grep_search|run_command",hooks:[{type:"command",command:`${c} pre-tool`,timeout:5}]}],PreInvocation:[{type:"command",command:`${c} pre`,timeout:15}],PostInvocation:[{type:"command",command:`${c} post`,timeout:15}],Stop:[{type:"command",command:`${c} stop`,timeout:30}]},Zr(o,n),o}import{existsSync as ei,mkdirSync as ti,readFileSync as oi,renameSync as ni,writeFileSync as ri}from"node:fs";import{dirname as ii}from"node:path";function H(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function si(e,t){ti(ii(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;ri(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),ni(o,e)}function Nt(e){if(!ei(e))return{};let t=oi(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Agy MCP config at ${e}: parse error. Not overwriting.`)}if(!H(o))throw new Error(`Invalid existing Agy MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Tt(e,t){return H(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function re(e,t,o,n){let r=Nt(e),c=r.mcpServers;if(c!==void 0&&!H(c))throw new Error(`Invalid existing Agy MCP config: mcpServers must be an object in ${e}.`);let s=H(c)?{...c}:{},i=s[o];if(Tt(i,t)&&!n)return{installed:!0,changed:!1};s[o]={command:t,args:["mcp"]};let l={...r,mcpServers:s};si(e,l);let u=Nt(e).mcpServers;if(!H(u)||!Tt(u[o],t))throw new Error(`Agy MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function At(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",n=e.scope??"global";if(e.configFile)return{...re(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(n==="both"){let s=B(),i=W({cwd:e.cwd}),l=re(s,t,o,e.force??!1),a=re(i,t,o,e.force??!1);return{installed:!0,changed:l.changed||a.changed,configFile:s,serverName:o,command:t,args:["mcp"]}}let r=n==="workspace"?W({cwd:e.cwd}):B();return{...re(r,t,o,e.force??!1),configFile:r,serverName:o,command:t,args:["mcp"]}}var pi=`# ToolNet Memory Continuity

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
`;function gi(e,t){Ht(di(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;ui(o,t,{encoding:"utf8",mode:384}),ai(o,e)}function Mt(e,t){ci(e)&&li(e,"utf8")===t||gi(e,t)}function $t(e={}){let t=e.pluginName??"toolnet-memory",o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.pluginRoot??U(t),r=ie(n,"plugin.json"),c=ie(n,"mcp_config.json"),s=ie(n,"hooks.json"),i=ie(n,"rules","toolnet-memory-continuity.md");return Ht(n,{recursive:!0,mode:448}),Mt(r,`${JSON.stringify({$schema:"https://antigravity.google/schemas/v1/plugin.json",name:t,description:"Persistent project continuity and memory for Antigravity coding sessions."},null,2)}
`),At({configFile:c,binary:o,serverName:"toolnet-memory",force:e.force}),Pt({hooksFile:s,binary:o,pluginName:t}),Mt(i,`${pi.trim()}
`),{installed:!0,pluginRoot:n,files:[r,c,s,i]}}import{existsSync as mi,mkdirSync as Gt,readFileSync as yi,writeFileSync as Lt}from"node:fs";import{join as _t}from"node:path";var fi="memory_agent_ask";function Dt(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${fi}

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
`.trim()}var Jt="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",Ee="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function hi(e={}){let t=st();Gt(E(),{recursive:!0});let o=`${Jt}
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


${Dt()}

${Ee}`,n=mi(t)?yi(t,"utf8"):"",r=n.indexOf(Jt),c=n.indexOf(Ee);return r>=0&&c>=r?n=n.slice(0,r)+o+n.slice(c+Ee.length):(n=n.trimEnd(),n&&(n+=`

`),n+=o),Lt(t,n.trimEnd()+`
`,{encoding:"utf8",mode:384}),t}function qt(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[];o.push(hi({cwd:e.cwd}));let n=e.scope??"global",r=[];if((n==="global"||n==="both")&&r.push(e.directory??it()),n==="project"||n==="both"){let c=e.cwd??process.cwd();r.push(_t(c,".opencode","plugins"))}for(let c of r){Gt(c,{recursive:!0});let s=_t(c,"toolnet-memory.js"),i=`
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
`;Lt(s,i.trimStart(),{encoding:"utf8",mode:384}),o.push(s)}return o}import{existsSync as Wt,mkdirSync as ki,readFileSync as Ii,renameSync as bi,writeFileSync as Si}from"node:fs";import{dirname as Ut,join as Oi}from"node:path";function $(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function wi(e,t){ki(Ut(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;Si(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),bi(o,e)}function Kt(e){if(!Wt(e))return{};let t=Ii(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing OpenCode config at ${e}: parse error. Not overwriting.`)}if(!$(o))throw new Error(`Invalid existing OpenCode config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Bt(e,t){if(!$(e))return!1;let o=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(o)&&o.length===2&&o[0]===t&&o[1]==="mcp"}function se(e,t,o,n){let r=Oi(Ut(e),"opencode.jsonc"),c=Wt(r)?r:void 0,s=Kt(e),i=s.mcp;if(i!==void 0&&!$(i))throw new Error(`Invalid existing OpenCode config: mcp must be an object in ${e}.`);let l=$(i)?{...i}:{},a=l[o];if(Bt(a,t)&&!n)return{installed:!0,changed:!1,preservedJsonc:c};l[o]={type:"local",command:[t,"mcp"],enabled:!0};let u={...s,mcp:l};wi(e,u);let d=Kt(e);if(!$(d.mcp)||!Bt(d.mcp[o],t))throw new Error(`OpenCode MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0,preservedJsonc:c}}function Qt(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",n=e.scope??"global";if(e.configFile)return{...se(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:[t,"mcp"]};if(n==="both"){let s=me(),i=ye({cwd:e.cwd}),l=se(s,t,o,e.force??!1),a=se(i,t,o,e.force??!1);return{installed:!0,changed:l.changed||a.changed,configFile:s,serverName:o,command:[t,"mcp"],preservedJsonc:l.preservedJsonc??a.preservedJsonc}}let r=n==="project"?ye({cwd:e.cwd}):me();return{...se(r,t,o,e.force??!1),configFile:r,serverName:o,command:[t,"mcp"]}}import{existsSync as ji,mkdirSync as Yt,readFileSync as Ci,writeFileSync as Vt}from"node:fs";import{homedir as Xt}from"node:os";import{dirname as zt,join as Pe}from"node:path";function xi(e){let t=[],o=/"((?:\\.|[^"\\])*)"|'([^']*)'/g,n;for(;n=o.exec(e);){let r=n[1]??n[2]??"";try{t.push(n[1]!==void 0?JSON.parse(`"${r}"`):r)}catch{t.push(r)}}return t}function Zt(e={}){let t=e.configFile??Pe(process.env.CODEX_HOME??Pe(Xt(),".codex"),"config.toml"),o=e.previousFile??Pe(Xt(),".config","toolnet-memory","codex-notify-previous.json");Yt(zt(t),{recursive:!0}),Yt(zt(o),{recursive:!0});let n=ji(t)?Ci(t,"utf8"):"",r=e.binary??"toolnet-memory",c=`notify = [${JSON.stringify(r)}, "session:codex-notify"]`,s=n.split(`
`),i=s.findIndex(p=>/^\s*\[/.test(p));i<0&&(i=s.length);let l=-1,a=-1;for(let p=0;p<i;p+=1)if(/^\s*notify\s*=/.test(s[p])){if(l=p,a=p,s[p].includes("[")&&!s[p].includes("]"))for(;a+1<i&&(a+=1,!s[a].includes("]")););break}let u=[];if(l>=0){let p=s.slice(l,a+1).join(`
`);u=xi(p),s.splice(l,a-l+1,c)}else i=s.findIndex(p=>/^\s*\[/.test(p)),i<0&&(i=s.length),s.splice(i,0,c);let d=u.length>=2&&u[u.length-1]==="session:codex-notify";return u.length>0&&!d&&Vt(o,JSON.stringify(u,null,2)+`
`,{encoding:"utf8",mode:384}),n=s.join(`
`),n.endsWith(`
`)||(n+=`
`),Vt(t,n,{encoding:"utf8",mode:384}),{configFile:t,previousFile:o,preservedPrevious:u.length>0&&!d}}import{existsSync as vi,mkdirSync as Fi,readFileSync as Ri,writeFileSync as Ei}from"node:fs";import{homedir as Pi}from"node:os";import{dirname as Ni,join as eo}from"node:path";function Ti(e){return`'${e.replace(/'/g,"'\\''")}'`}function to(e={}){let t=e.hooksFile??eo(process.env.CODEX_HOME??eo(Pi(),".codex"),"hooks.json");Fi(Ni(t),{recursive:!0});let o={};if(vi(t))try{o=JSON.parse(Ri(t,"utf8"))}catch(i){throw new Error(`Invalid existing Codex hooks.json: ${i instanceof Error?i.message:String(i)}`)}let n=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=n;let c=(Array.isArray(n.SessionStart)?n.SessionStart:[]).filter(i=>{try{return!JSON.stringify(i).includes("session:codex-context")}catch{return!0}}),s=e.binary??"toolnet-memory";return c.push({matcher:"startup|resume|clear|compact",hooks:[{type:"command",command:`${Ti(s)} session:codex-context`,timeout:15,additionalContextLimit:1e3,statusMessage:"Loading ToolNet project continuity"}]}),n.SessionStart=c,Ei(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),t}import{existsSync as oo,mkdirSync as Ai,readFileSync as no,writeFileSync as Mi}from"node:fs";import{homedir as Hi}from"node:os";import{dirname as $i,join as ro}from"node:path";function io(e){return`'${e.replace(/'/g,"'\\''")}'`}function so(e={}){let t=e.hooksFile??ro(process.env.CODEX_HOME??ro(Hi(),".codex"),"hooks.json");Ai($i(t),{recursive:!0});let o={};if(oo(t))try{o=JSON.parse(no(t,"utf8"))}catch{throw new Error(`Invalid existing Codex hooks.json at ${t}: parse error. Not overwriting.`)}let n=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=n;let r=e.binary??"toolnet-memory",c=`${io(r)} session:codex-stop-hook`,s=`${io(r)} session:codex-session-end`,i={hooks:[{type:"command",command:c,timeout:30}]},l={hooks:[{type:"command",command:s,timeout:3}]},u=(Array.isArray(n.Stop)?n.Stop:[]).filter(I=>{try{return!JSON.stringify(I).includes("session:codex-stop-hook")}catch{return!0}}),p=(Array.isArray(n.SessionEnd)?n.SessionEnd:[]).filter(I=>{try{return!JSON.stringify(I).includes("session:codex-session-end")}catch{return!0}});n.Stop=[...u,i],n.SessionEnd=[...p,l];let g=JSON.stringify(o,null,2)+`
`,C=!oo(t)||no(t,"utf8")!==g;return Mi(t,g,{encoding:"utf8",mode:384}),{hooksFile:t,changed:C,stopInstalled:!0,sessionEndInstalled:!0}}import{spawnSync as Di}from"node:child_process";function Ne(e,t){return Di(e,t,{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}function co(e,t){let o=Ne(e,["mcp","get",t,"--json"]);if(o.status!==0||!o.stdout)return null;try{return JSON.parse(o.stdout)}catch{return null}}function lo(e,t){return e.enabled!==!1&&e.transport?.type==="stdio"&&e.transport?.command===t&&Array.isArray(e.transport?.args)&&e.transport?.args.length===1&&e.transport.args[0]==="mcp"}function ao(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.codexBinary??"codex",n=e.serverName??"toolnet-memory",r=co(o,n);if(r&&lo(r,t))return{installed:!0,changed:!1,serverName:n,command:t,args:["mcp"]};if(r){let i=Ne(o,["mcp","remove",n]);if(i.status!==0)return{installed:!1,changed:!1,serverName:n,command:t,args:["mcp"],error:(i.stderr||i.stdout||"Unable to remove old ToolNet MCP configuration.").trim()}}let c=Ne(o,["mcp","add",n,"--",t,"mcp"]);if(c.status!==0)return{installed:!1,changed:!1,serverName:n,command:t,args:["mcp"],error:(c.stderr||c.stdout||"Unable to register ToolNet MCP.").trim()};let s=co(o,n);return!s||!lo(s,t)?{installed:!1,changed:!0,serverName:n,command:t,args:["mcp"],error:"Codex accepted MCP registration but verification did not match expected ToolNet command."}:{installed:!0,changed:!0,serverName:n,command:t,args:["mcp"]}}import{existsSync as _i,mkdirSync as Ji,readFileSync as Gi,renameSync as Li,rmSync as qi,writeFileSync as Ki}from"node:fs";import{dirname as Bi}from"node:path";function D(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Wi(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function Ui(e){if(!_i(e))return{};let t;try{t=JSON.parse(Gi(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude settings.json: ${o instanceof Error?o.message:String(o)}`)}if(!D(t))throw new Error("Invalid existing Claude settings.json: root must be a JSON object.");return t}function ce(e){if(e===void 0)return[];if(!Array.isArray(e))throw new Error("Invalid existing Claude settings.json: hook event must be an array.");let t=[];for(let o of e){if(!D(o)){t.push(o);continue}let n=o.hooks;if(!Array.isArray(n)){t.push(o);continue}let r=n.filter(c=>{if(!D(c))return!0;let s=c.command;return!(typeof s=="string"&&s.includes("session:claude-hook"))});r.length!==0&&t.push({...o,hooks:r})}return t}function le(e,t=10){return{type:"command",command:e,timeout:t}}function Qi(e,t){Ji(Bi(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Ki(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Li(o,e)}finally{qi(o,{force:!0})}}function uo(e={}){let t=e.settingsFile??lt(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=Ui(t),r=n.hooks;if(r!==void 0&&!D(r))throw new Error("Invalid existing Claude settings.json: hooks must be an object.");let c=D(r)?{...r}:{},s=`${Wi(o)} session:claude-hook`,i=ce(c.SessionStart);i.push({matcher:"startup|resume|clear|compact",hooks:[le(s)]}),c.SessionStart=i;let l=ce(c.UserPromptSubmit);l.push({hooks:[le(s)]}),c.UserPromptSubmit=l;let a=ce(c.PostToolUse);a.push({matcher:"Edit|Write",hooks:[le(s)]}),c.PostToolUse=a;let u=ce(c.Stop);u.push({hooks:[le(s,30)]}),c.Stop=u;let d={...n,hooks:c},p=JSON.stringify(n),g=JSON.stringify(d);return p===g?{settingsFile:t,changed:!1}:e.dryRun===!0?{settingsFile:t,changed:!0,dryRun:!0}:(Qi(t,d),{settingsFile:t,changed:!0})}import{existsSync as Yi,mkdirSync as Vi,readFileSync as Xi,renameSync as zi,rmSync as Zi,writeFileSync as es}from"node:fs";import{dirname as ts}from"node:path";function _(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function po(e){if(!Yi(e))return{};let t;try{t=JSON.parse(Xi(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude Code config: ${o instanceof Error?o.message:String(o)}`)}if(!_(t))throw new Error("Invalid existing Claude Code config: root must be a JSON object.");return t}function go(e,t){if(!_(e))return!1;let o=e.args;return e.type==="stdio"&&e.command===t&&Array.isArray(o)&&o.length===1&&o[0]==="mcp"}function os(e,t){Vi(ts(e),{recursive:!0});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{es(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),zi(o,e)}finally{Zi(o,{force:!0})}}function fo(e={}){let t=e.stateFile??at(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=po(t),c=r.mcpServers;if(c!==void 0&&!_(c))throw new Error("Invalid existing Claude Code config: mcpServers must be an object.");let s=_(c)?{...c}:{},i=s[n];if(go(i,o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:[o,"mcp"],repaired:!1};let l=i!==void 0;if(s[n]={type:"stdio",command:o,args:["mcp"]},e.dryRun===!0)return{installed:!0,changed:!0,configFile:t,serverName:n,command:[o,"mcp"],repaired:l,dryRun:!0};os(t,{...r,mcpServers:s});let u=po(t).mcpServers;if(!_(u)||!go(u[n],o))throw new Error("Claude Code MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:[o,"mcp"],repaired:l}}function mo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=uo({binary:t,settingsFile:e.settingsFile,...e.dryRun!==void 0?{dryRun:e.dryRun}:{}}),n=fo({binary:t,stateFile:e.stateFile,...e.dryRun!==void 0?{dryRun:e.dryRun}:{}});return{hooks:o,mcp:n,files:[o.settingsFile,n.configFile]}}import{existsSync as ns,mkdirSync as rs,readFileSync as is,renameSync as ss,rmSync as cs,writeFileSync as ls}from"node:fs";import{dirname as as}from"node:path";var P="ToolNet Memory - ";function ko(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function us(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function yo(e){if(!ns(e))return{};let t=is(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro hooks file at ${e}: parse error. Not overwriting.`)}if(!ko(o))throw new Error(`Invalid existing Kiro hooks file at ${e}: root must be a JSON object. Not overwriting.`);return o}function ho(e){return ko(e)?typeof e.name=="string"&&e.name.startsWith(P):!1}function J(e){return{type:"command",command:e}}function ds(e){return[{name:`${P}Session Start`,description:"Inject compact local ToolNet continuity and capture Kiro session activation.",trigger:"SessionStart",action:J(e),timeout:10,enabled:!0},{name:`${P}Prompt Continuity`,description:"Capture prompts and refresh ToolNet guidance only for resume/continue requests.",trigger:"UserPromptSubmit",action:J(e),timeout:10,enabled:!0},{name:`${P}Raw History Guard`,description:"Prevent Kiro from reconstructing continuity from raw ToolNet/agent session history.",trigger:"PreToolUse",matcher:"*",action:J(e),timeout:10,enabled:!0},{name:`${P}Tool Capture`,description:"Capture durable tool activity while filtering noisy read-only events.",trigger:"PostToolUse",matcher:"*",action:J(e),timeout:15,enabled:!0},{name:`${P}Final Flush`,description:"Flush pending Kiro WAL events when the assistant finishes a turn.",trigger:"Stop",action:J(e),timeout:30,enabled:!0}]}function ps(e,t){rs(as(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{ls(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),ss(o,e)}finally{cs(o,{force:!0})}}function ae(e,t,o){let n=yo(e);if(n.version!==void 0&&n.version!=="v1")throw new Error(`Unsupported existing Kiro hooks version: ${String(n.version)}`);let r=n.hooks;if(r!==void 0&&!Array.isArray(r))throw new Error("Invalid existing Kiro hooks file: hooks must be an array.");let c=Array.isArray(r)?r.filter(a=>!ho(a)):[],s=ds(t),i={...n,version:"v1",hooks:[...c,...s]};if(!o&&JSON.stringify(n)===JSON.stringify(i))return{changed:!1,hookCount:s.length};ps(e,i);let l=yo(e);if(l.version!=="v1"||!Array.isArray(l.hooks)||l.hooks.filter(ho).length!==s.length)throw new Error("Kiro hooks were written but verification failed.");return{changed:!0,hookCount:s.length}}function Io(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=`${us(t)} session:kiro-hook`;if(e.hooksFile){let s=ae(e.hooksFile,n,e.force??!1);return{hooksFile:e.hooksFile,...s}}if(o==="both"){let s=Se(),i=Oe({cwd:e.cwd}),l=ae(s,n,e.force??!1),a=ae(i,n,e.force??!1);return{hooksFile:s,changed:l.changed||a.changed,hookCount:l.hookCount}}let r=o==="project"?Oe({cwd:e.cwd}):Se(),c=ae(r,n,e.force??!1);return{hooksFile:r,...c}}import{existsSync as gs,mkdirSync as fs,readFileSync as ms,renameSync as ys,rmSync as hs,writeFileSync as ks}from"node:fs";import{dirname as Is}from"node:path";function G(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function bo(e){if(!gs(e))return{};let t=ms(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro MCP config at ${e}: parse error. Not overwriting.`)}if(!G(o))throw new Error(`Invalid existing Kiro MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function So(e,t){return G(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&e.disabled===!1:!1}function bs(e,t){fs(Is(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{ks(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),ys(o,e)}finally{hs(o,{force:!0})}}function ue(e,t,o,n){let r=bo(e),c=r.mcpServers;if(c!==void 0&&!G(c))throw new Error(`Invalid existing Kiro MCP config: mcpServers must be an object in ${e}.`);let s=G(c)?{...c}:{},i=s[o];if(So(i,t)&&!n)return{installed:!0,changed:!1};s[o]={command:t,args:["mcp"],disabled:!1};let l={...r,mcpServers:s};bs(e,l);let u=bo(e).mcpServers;if(!G(u)||!So(u[o],t))throw new Error(`Kiro MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function Oo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",n=e.scope??"global";if(e.configFile)return{...ue(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(n==="both"){let s=Q(),i=be({cwd:e.cwd}),l=ue(s,t,o,e.force??!1),a=ue(i,t,o,e.force??!1);return{installed:!0,changed:l.changed||a.changed,configFile:s,serverName:o,command:t,args:["mcp"]}}let r=n==="project"?be({cwd:e.cwd}):Q();return{...ue(r,t,o,e.force??!1),configFile:r,serverName:o,command:t,args:["mcp"]}}function wo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=Oo({binary:t,configFile:e.configFile,scope:e.scope,cwd:e.cwd,force:e.force}),n=Io({binary:t,hooksFile:e.hooksFile,scope:e.scope,cwd:e.cwd,force:e.force});return{installed:o.installed,changed:o.changed||n.changed,mcp:o,hooks:n,files:[o.configFile,n.hooksFile]}}import{existsSync as Ss,mkdirSync as Os,readFileSync as ws,renameSync as js,rmSync as Cs,writeFileSync as xs}from"node:fs";import{dirname as vs}from"node:path";function Te(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Fs(e){if(!Ss(e))return{};let t=ws(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: parse error. Not overwriting.`)}if(!Te(o))throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Rs(e,t){Os(vs(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{xs(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),js(o,e)}finally{Cs(o,{force:!0})}}function jo(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??pt({cwd:e.cwd}),n=Fs(o),r="toolnet-memory";if(Te(n.mcpServers)&&n.mcpServers[r]!=null&&!e.force)return{installed:!0,changed:!1,configFile:o};let s=Te(n.mcpServers)?{...n.mcpServers}:{};return s[r]={command:t,args:["mcp"]},n.mcpServers=s,Rs(o,n),{installed:!0,changed:!0,configFile:o}}function Co(e={}){let t=e.binary??"toolnet-memory",o=jo({binary:t,configFile:e.configFile,force:e.force,cwd:e.cwd});return{installed:o.installed,changed:o.changed,mcp:{...o,configured:o.installed},files:[o.configFile]}}import{mkdirSync as $s,existsSync as Ds}from"node:fs";import{dirname as _s}from"node:path";import{existsSync as Es,mkdirSync as Ps,readFileSync as Ns,renameSync as Ts,rmSync as As,writeFileSync as Ms}from"node:fs";import{dirname as Hs}from"node:path";function h(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function x(e,t){if(!Es(e))return{};let o=Ns(e,"utf8").trim();if(!o)return{};let n;try{n=JSON.parse(o)}catch(r){throw new Error(`Invalid existing ${t} MCP config: ${r instanceof Error?r.message:String(r)}`)}if(!h(n))throw new Error(`Invalid existing ${t} MCP config: root must be a JSON object.`);return n}function N(e,t){Ps(Hs(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Ms(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Ts(o,e)}finally{As(o,{force:!0})}}function xo(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??Ce(),n=_s(o);Ds(n)||$s(n,{recursive:!0});let r=x(o,"Kilo"),c=r.mcp;if(c!==void 0&&!h(c))throw new Error("Invalid existing Kilo config: mcp must be an object.");let s=h(c)?{...c}:{},i="toolnet-memory";return h(s[i])&&!e.force?{installed:!0,changed:!1,configFile:o,configured:!0}:(s[i]={type:"local",command:[t,"mcp"],enabled:!0,timeout:1e4},N(o,{...r,mcp:s}),{installed:!0,changed:!0,configFile:o,configured:!0})}function vo(e={}){let t=e.binary??"toolnet-memory",o=xo({binary:t,configFile:e.configFile,force:e.force});return{installed:o.installed,changed:o.changed,mcp:o,files:[o.configFile]}}import{existsSync as Js,mkdirSync as Gs,readFileSync as Ls,renameSync as qs,rmSync as Ks,writeFileSync as Bs}from"node:fs";import{dirname as Ws}from"node:path";function m(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function O(e,t){if(!Js(e))return{};let o=Ls(e,"utf8").trim();if(!o)return{};let n;try{n=JSON.parse(o)}catch(r){throw new Error(`Invalid existing ${t} hooks file: ${r instanceof Error?r.message:String(r)}`)}if(!m(n))throw new Error(`Invalid existing ${t} hooks file: root must be a JSON object.`);return n}function T(e,t){Gs(Ws(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Bs(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),qs(o,e)}finally{Ks(o,{force:!0})}}function Ae(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}var L=[["sessionStart",10],["beforeSubmitPrompt",10],["preToolUse",10],["postToolUse",15],["afterAgentResponse",15],["stop",30]];function Fo(e){return m(e)&&typeof e.command=="string"&&e.command.includes("session:cursor-hook")}function Us(e,t,o){let r={type:"command",command:`TOOLNET_HOOK_EVENT=${Ae(e)} ${Ae(t)} session:cursor-hook`,timeout:o};return e==="preToolUse"&&(r.matcher=".*"),r}function Me(e={}){let t=e.hooksFile??X(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=O(t,"Cursor");if(n.version!==void 0&&n.version!==1)throw new Error(`Unsupported existing Cursor hooks version: ${String(n.version)}`);let r=n.hooks;if(r!==void 0&&!m(r))throw new Error("Invalid existing Cursor hooks file: hooks must be an object.");let c=m(r)?{...r}:{};for(let[a,u]of L){let d=c[a];if(d!==void 0&&!Array.isArray(d))throw new Error(`Invalid existing Cursor hooks file: hooks.${a} must be an array.`);let p=Array.isArray(d)?d.filter(g=>!Fo(g)):[];c[a]=[...p,Us(a,o,u)]}let s={...n,version:1,hooks:c};if(JSON.stringify(n)===JSON.stringify(s))return{hooksFile:t,changed:!1,hookCount:L.length};T(t,s);let i=O(t,"Cursor");if(i.version!==1||!m(i.hooks))throw new Error("Cursor hooks were written but verification failed.");let l=0;for(let[a]of L){let u=i.hooks[a];if(!Array.isArray(u))throw new Error("Cursor hooks were written but verification failed.");l+=u.filter(Fo).length}if(l!==L.length)throw new Error("Cursor hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:L.length}}function Ro(e,t){return h(e)?(e.type===void 0||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function He(e={}){let t=e.configFile??V(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=x(t,"Cursor"),c=r.mcpServers;if(c!==void 0&&!h(c))throw new Error("Invalid existing Cursor MCP config: mcpServers must be an object.");let s=h(c)?{...c}:{};if(Ro(s[n],o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};s[n]={type:"stdio",command:o,args:["mcp"]},N(t,{...r,mcpServers:s});let l=x(t,"Cursor").mcpServers;if(!h(l)||!Ro(l[n],o))throw new Error("Cursor MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}import{mkdirSync as Qs,readFileSync as Eo,renameSync as Ys,rmSync as Vs,writeFileSync as Xs}from"node:fs";import{dirname as zs}from"node:path";var $e=`---
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
`;function Zs(e,t){Qs(zs(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Xs(o,t,{encoding:"utf8",mode:384}),Ys(o,e)}finally{Vs(o,{force:!0})}}function Po(e){let t=e.ruleFile??kt(e.projectRoot);try{if(Eo(t,"utf8")===$e)return{ruleFile:t,changed:!1}}catch{}if(Zs(t,$e),Eo(t,"utf8")!==$e)throw new Error("Cursor ToolNet project rule was written but verification failed.");return{ruleFile:t,changed:!0}}import{spawnSync as ec}from"node:child_process";import{existsSync as A,statSync as tc}from"node:fs";import{dirname as oc,join as nc,parse as rc,resolve as _e}from"node:path";function No(e){let t=_e(e);if(!A(t))throw new Error(`Project path does not exist: ${t}`);if(!tc(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);return t}function de(e){return nc(e,".toolnet","project.json")}function ic(e){let t=_e(e),o=rc(t).root;for(;;){if(A(de(t)))return t;if(t===o)return;let n=oc(t);if(n===t)return;t=n}}function De(e){let t=ec("git",["rev-parse","--show-toplevel"],{cwd:e,encoding:"utf8",timeout:5e3});if(t.status!==0)return;let o=t.stdout.trim();return o?_e(o):void 0}function w(e={}){let t=No(e.cwd??process.cwd());if(e.project){let r=No(e.project),c=de(r),s=De(r);return{root:r,source:"explicit",eligible:!0,toolnetProject:A(c),manifestFile:A(c)?c:void 0,gitRoot:s}}let o=ic(t);if(o){let r=de(o);return{root:o,source:"toolnet",eligible:!0,toolnetProject:!0,manifestFile:r,gitRoot:De(o)}}let n=De(t);if(n){let r=de(n);return{root:n,source:"git",eligible:!0,toolnetProject:A(r),manifestFile:A(r)?r:void 0,gitRoot:n}}return{root:t,source:"cwd",eligible:!1,toolnetProject:!1}}function Ho(e,t={}){let o=[],n=e.indexOf("--scope");if(n>=0){let c=e[n+1];if(c!=="global"&&c!=="project"&&c!=="both")throw new Error(`Invalid --scope value: ${String(c)}`);o.push(c)}e.includes("--global")&&o.push("global"),e.includes("--both")&&o.push("both");let r=Array.from(new Set(o));if(r.length>1)throw new Error(`Conflicting integration scopes: ${r.join(", ")}`);return r[0]??t.defaultScope??"global"}function To(e,t){return{install:e,effective:t}}function j(e,t){return{surface:e,global:To(t.globalInstall,t.effective==="global"||t.effective==="both"),project:To(t.projectInstall,t.effective==="project"||t.effective==="both"),effective:t.effective,risk:t.risk??"none",dedupeRequired:t.dedupeRequired??!1,trustRequired:t.trustRequired??t.projectInstall,note:t.note}}function sc(e){return{mcp:j("mcp",{globalInstall:!0,projectInstall:!1,effective:"global"}),hooks:j("hooks",{globalInstall:!0,projectInstall:!1,effective:"global"}),work:j("work",{globalInstall:e==="grok",projectInstall:!1,effective:e==="grok"?"global":"none",note:e==="grok"?"Grok supports a global ToolNet continuity skill.":"Cursor/Copilot work instructions remain project-scoped."})}}function Ao(e){return{mcp:j("mcp",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),hooks:j("hooks",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),work:j("work",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!1,note:e==="cursor"?"Use .cursor/rules/toolnet-memory.mdc.":e==="copilot"?"Use .github/instructions/toolnet-memory.instructions.md.":"Use .grok/skills/toolnet-continuity/SKILL.md."})}}function Mo(e){return{mcp:j("mcp",{globalInstall:!0,projectInstall:!0,effective:"project",risk:e==="cursor"?"precedence-unverified":"shadowed-global",trustRequired:!0,note:e==="cursor"?"Project ToolNet MCP is the intended effective definition; native same-name precedence must be E2E certified before release.":"Global remains useful outside the project; same-name project definition wins inside the project."}),hooks:j("hooks",{globalInstall:!0,projectInstall:!0,effective:"both",risk:"additive-duplicate",dedupeRequired:!0,trustRequired:!0,note:"Global and project hook sources can both execute for the same native event."}),work:j("work",{globalInstall:e==="grok",projectInstall:!0,effective:"project",risk:e==="grok"?"shadowed-global":"none",trustRequired:!1,note:e==="cursor"?"Project rule is authoritative.":e==="copilot"?"Project instruction is authoritative.":"Project skill shadows the same-name global skill inside the project."})}}function M(e){let{agent:t,scope:o,project:n}=e;return(o==="project"||o==="both")&&(!n||!n.eligible)?{agent:t,requestedScope:o,project:n,surfaces:o==="both"?Mo(t):Ao(t),canInstall:!1,reason:"Project scope requires an explicit project, existing ToolNet project, or Git repository root."}:{agent:t,requestedScope:o,project:n,surfaces:o==="global"?sc(t):o==="project"?Ao(t):Mo(t),canInstall:!0}}function $o(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.rule?.changed)}function Do(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=o==="global"?void 0:w({project:e.projectRoot}),r=M({agent:"cursor",scope:o,project:n});if(!r.canInstall)throw new Error(r.reason??"Cursor project integration scope cannot be resolved.");let c,s;if((r.surfaces.mcp.global.install||r.surfaces.hooks.global.install||r.surfaces.work.global.install)&&(c={},r.surfaces.mcp.global.install&&(c.mcp=He({binary:t,configFile:e.configFile??V()})),r.surfaces.hooks.global.install&&(c.hooks=Me({binary:t,hooksFile:e.hooksFile??X()}))),r.surfaces.mcp.project.install||r.surfaces.hooks.project.install||r.surfaces.work.project.install){if(!n?.eligible)throw new Error("Cursor project integration requires an eligible project root.");s={},r.surfaces.mcp.project.install&&(s.mcp=He({binary:t,configFile:e.projectConfigFile??yt(n.root)})),r.surfaces.hooks.project.install&&(s.hooks=Me({binary:t,hooksFile:e.projectHooksFile??ht(n.root)})),r.surfaces.work.project.install&&(s.rule=Po({projectRoot:n.root,ruleFile:e.projectRuleFile}))}let i=s?.mcp??c?.mcp,l=s?.hooks??c?.hooks;if(!i||!l)throw new Error("Cursor integration did not produce an effective MCP/hooks installation.");let a=Array.from(new Set([c?.mcp?.configFile,c?.hooks?.hooksFile,c?.rule?.ruleFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.rule?.ruleFile].filter(u=>typeof u=="string")));return{installed:!0,changed:$o(c)||$o(s),scope:o,plan:r,project:n,global:c,projectScope:s,mcp:i,hooks:l,rule:s?.rule,files:a}}var q=[["sessionStart",10],["userPromptSubmitted",10],["userPromptTransformed",10],["preToolUse",10],["postToolUse",15],["agentStop",30]];function cc(e){if(typeof e.command=="string")return e.command;if(typeof e.bash=="string")return e.bash}function _o(e){return m(e)&&cc(e)?.includes("session:copilot-hook")===!0}function lc(e,t,o){let n={type:"command",command:`${t} session:copilot-hook`,env:{TOOLNET_HOOK_EVENT:e},timeoutSec:o};return e==="preToolUse"&&(n.matcher=".*"),n}function Je(e={}){let t=e.hooksFile??Z(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=O(t,"GitHub Copilot CLI");if(n.version!==void 0&&n.version!==1)throw new Error(`Unsupported existing GitHub Copilot CLI hooks version: ${String(n.version)}`);let r=n.hooks;if(r!==void 0&&!m(r))throw new Error("Invalid existing GitHub Copilot CLI hooks file: hooks must be an object.");let c=m(r)?{...r}:{};for(let[a,u]of q){let d=c[a];if(d!==void 0&&!Array.isArray(d))throw new Error(`Invalid existing GitHub Copilot CLI hooks file: hooks.${a} must be an array.`);let p=Array.isArray(d)?d.filter(g=>!_o(g)):[];c[a]=[...p,lc(a,o,u)]}let s={...n,version:1,hooks:c};if(JSON.stringify(n)===JSON.stringify(s))return{hooksFile:t,changed:!1,hookCount:q.length};T(t,s);let i=O(t,"GitHub Copilot CLI");if(i.version!==1||!m(i.hooks))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");let l=0;for(let[a]of q){let u=i.hooks[a];if(!Array.isArray(u))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");l+=u.filter(_o).length}if(l!==q.length)throw new Error("GitHub Copilot CLI hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:q.length}}function Jo(e,t){return h(e)?(e.type===void 0||e.type==="local"||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&Array.isArray(e.tools)&&e.tools.length===1&&e.tools[0]==="*":!1}function Ge(e={}){let t=e.configFile??z(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=x(t,"GitHub Copilot CLI"),c=r.mcpServers;if(c!==void 0&&!h(c))throw new Error("Invalid existing GitHub Copilot CLI MCP config: mcpServers must be an object.");let s=h(c)?{...c}:{};if(Jo(s[n],o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};s[n]={type:"stdio",command:o,args:["mcp"],tools:["*"]},N(t,{...r,mcpServers:s});let l=x(t,"GitHub Copilot CLI").mcpServers;if(!h(l)||!Jo(l[n],o))throw new Error("GitHub Copilot CLI MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}import{mkdirSync as ac,readFileSync as Go,renameSync as uc,rmSync as dc,writeFileSync as pc}from"node:fs";import{dirname as gc}from"node:path";var Le=`---
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
`;function fc(e,t){ac(gc(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{pc(o,t,{encoding:"utf8",mode:384}),uc(o,e)}finally{dc(o,{force:!0})}}function Lo(e){let t=e.instructionFile??Ot(e.projectRoot);try{if(Go(t,"utf8")===Le)return{instructionFile:t,changed:!1}}catch{}if(fc(t,Le),Go(t,"utf8")!==Le)throw new Error("Copilot ToolNet project instruction verification failed.");return{instructionFile:t,changed:!0}}function qo(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.instruction?.changed)}function Ko(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=o==="global"?void 0:w({project:e.projectRoot}),r=M({agent:"copilot",scope:o,project:n});if(!r.canInstall)throw new Error(r.reason??"Copilot project integration scope cannot be resolved.");let c,s;if((r.surfaces.mcp.global.install||r.surfaces.hooks.global.install||r.surfaces.work.global.install)&&(c={},r.surfaces.mcp.global.install&&(c.mcp=Ge({binary:t,configFile:e.configFile??z()})),r.surfaces.hooks.global.install&&(c.hooks=Je({binary:t,hooksFile:e.hooksFile??Z()}))),r.surfaces.mcp.project.install||r.surfaces.hooks.project.install||r.surfaces.work.project.install){if(!n?.eligible)throw new Error("Copilot project integration requires an eligible project root.");s={},r.surfaces.mcp.project.install&&(s.mcp=Ge({binary:t,configFile:e.projectConfigFile??bt(n.root)})),r.surfaces.hooks.project.install&&(s.hooks=Je({binary:t,hooksFile:e.projectHooksFile??St(n.root)})),r.surfaces.work.project.install&&(s.instruction=Lo({projectRoot:n.root,instructionFile:e.projectInstructionFile}))}let i=s?.mcp??c?.mcp,l=s?.hooks??c?.hooks;if(!i||!l)throw new Error("Copilot integration did not produce effective MCP/hooks.");let a=Array.from(new Set([c?.mcp?.configFile,c?.hooks?.hooksFile,c?.instruction?.instructionFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.instruction?.instructionFile].filter(u=>typeof u=="string")));return{installed:!0,changed:qo(c)||qo(s),scope:o,plan:r,project:n,global:c,projectScope:s,mcp:i,hooks:l,instruction:s?.instruction,files:a}}import{existsSync as mc,mkdirSync as yc,readFileSync as Bo,renameSync as hc,rmSync as kc,writeFileSync as Ic}from"node:fs";import{dirname as bc}from"node:path";var qe=`---
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
`;function Sc(e,t){yc(bc(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Ic(o,t,{encoding:"utf8",mode:384}),hc(o,e)}finally{kc(o,{force:!0})}}function Ke(e={}){let t=e.skillFile??ne();if(mc(t)&&Bo(t,"utf8")===qe)return{skillFile:t,changed:!1};if(Sc(t,qe),Bo(t,"utf8")!==qe)throw new Error("Grok ToolNet continuity skill was written but verification failed.");return{skillFile:t,changed:!0}}var K=[["SessionStart",10],["UserPromptSubmit",10],["PreToolUse",10],["PostToolUse",15],["Stop",30]];function Wo(e){return!m(e)||!Array.isArray(e.hooks)?!1:e.hooks.some(t=>m(t)&&typeof t.command=="string"&&t.command.includes("session:grok-hook"))}function Oc(e,t,o){let n={hooks:[{type:"command",command:`${t} session:grok-hook`,timeout:o,env:{TOOLNET_HOOK_EVENT:e}}]};return e==="PreToolUse"&&(n.matcher=".*"),n}function Be(e={}){let t=e.hooksFile??oe(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=O(t,"Grok Build"),r=n.hooks;if(r!==void 0&&!m(r))throw new Error("Invalid existing Grok Build hooks file: hooks must be an object.");let c=m(r)?{...r}:{};for(let[a,u]of K){let d=c[a];if(d!==void 0&&!Array.isArray(d))throw new Error(`Invalid existing Grok Build hooks file: hooks.${a} must be an array.`);let p=Array.isArray(d)?d.filter(g=>!Wo(g)):[];c[a]=[...p,Oc(a,o,u)]}let s={...n,hooks:c};if(JSON.stringify(n)===JSON.stringify(s))return{hooksFile:t,changed:!1,hookCount:K.length};T(t,s);let i=O(t,"Grok Build");if(!m(i.hooks))throw new Error("Grok Build hooks were written but verification failed.");let l=0;for(let[a]of K){let u=i.hooks[a];if(!Array.isArray(u))throw new Error("Grok Build hooks were written but verification failed.");l+=u.filter(Wo).length}if(l!==K.length)throw new Error("Grok Build hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:K.length}}import{existsSync as wc,mkdirSync as jc,readFileSync as Cc,renameSync as xc,rmSync as vc,writeFileSync as Fc}from"node:fs";import{dirname as Rc}from"node:path";function Uo(e){return wc(e)?Cc(e,"utf8"):""}function Ec(e,t){jc(Rc(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Fc(o,t,{encoding:"utf8",mode:384}),xc(o,e)}finally{vc(o,{force:!0})}}function We(e){return e.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t")}function Pc(e){return`[mcp_servers."${We(e)}"]`}function Nc(e,t){return[Pc(e),`command = "${We(t)}"`,'args = ["mcp"]',"enabled = true"].join(`
`)}function Tc(e){let t=e.trim();return t.startsWith("[")&&t.includes("]")}function pe(e){return e.trim().replace(/\s+/g,"")}function Ac(e){return new Set([pe(`[mcp_servers.${e}]`),pe(`[mcp_servers."${e}"]`),pe(`[mcp_servers.'${e}']`)])}function Yo(e,t){let o=e.split(/\r?\n/),n=Ac(t),r=-1;for(let u=0;u<o.length;u+=1){let d=pe(o[u].replace(/\s+#.*$/,""));if(n.has(d)){r=u;break}}if(r<0)return null;let c=o.length;for(let u=r+1;u<o.length;u+=1)if(Tc(o[u])){c=u;break}let s=[],i=0;for(let u of o)s.push(i),i+=u.length+1;let l=s[r]??0,a=c>=o.length?e.length:s[c]??e.length;return{start:l,end:a}}function Mc(e,t,o){let n=`${Nc(t,o)}
`,r=Yo(e,t);if(r){let c=e.slice(0,r.start),s=e.slice(r.end);return`${c}${n}${s.replace(/^\n+/,"")}`}return e.trim()?`${e.replace(/\s*$/,"")}

${n}`:n}function Qo(e,t,o){let n=Yo(e,t);if(!n)return!1;let r=e.slice(n.start,n.end);return r.includes(`command = "${We(o)}"`)&&/args\s*=\s*\[\s*"mcp"\s*\]/.test(r)&&/enabled\s*=\s*true/.test(r)}function Ue(e={}){let t=e.configFile??te(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=Uo(t);if(Qo(r,n,o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};let c=Mc(r,n,o);Ec(t,c);let s=Uo(t);if(!Qo(s,n,o))throw new Error("Grok Build MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}function Vo(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.skill?.changed)}function Xo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=o==="global"?void 0:w({project:e.projectRoot}),r=M({agent:"grok",scope:o,project:n});if(!r.canInstall)throw new Error(r.reason??"Grok project integration scope cannot be resolved.");let c,s;if((r.surfaces.mcp.global.install||r.surfaces.hooks.global.install||r.surfaces.work.global.install)&&(c={},r.surfaces.mcp.global.install&&(c.mcp=Ue({binary:t,configFile:e.configFile??te()})),r.surfaces.hooks.global.install&&(c.hooks=Be({binary:t,hooksFile:e.hooksFile??oe()})),r.surfaces.work.global.install&&(c.skill=Ke({skillFile:e.skillFile??ne()}))),r.surfaces.mcp.project.install||r.surfaces.hooks.project.install||r.surfaces.work.project.install){if(!n?.eligible)throw new Error("Grok project integration requires an eligible project root.");s={},r.surfaces.mcp.project.install&&(s.mcp=Ue({binary:t,configFile:e.projectConfigFile??jt(n.root)})),r.surfaces.hooks.project.install&&(s.hooks=Be({binary:t,hooksFile:e.projectHooksFile??Ct(n.root)})),r.surfaces.work.project.install&&(s.skill=Ke({skillFile:e.projectSkillFile??xt(n.root)}))}let i=s?.mcp??c?.mcp,l=s?.hooks??c?.hooks,a=s?.skill??c?.skill;if(!i||!l||!a)throw new Error("Grok integration did not produce effective MCP/hooks/skill.");let u=Array.from(new Set([c?.mcp?.configFile,c?.hooks?.hooksFile,c?.skill?.skillFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.skill?.skillFile].filter(d=>typeof d=="string")));return{installed:!0,changed:Vo(c)||Vo(s),scope:o,plan:r,project:n,global:c,projectScope:s,mcp:i,hooks:l,skill:a,files:u}}import{existsSync as tn,mkdirSync as og,readFileSync as on,renameSync as ng,rmSync as rg,writeFileSync as Dc}from"node:fs";import{homedir as Hc}from"node:os";import{join as zo}from"node:path";function $c(e="toolnet-memory",t={}){return zo(t.home??Hc(),".agents","plugins",e)}function Zo(e="toolnet-memory",t={}){return zo($c(e,t),"hooks","hooks.json")}function en(e){return`'${e.replace(/'/g,"'\\''")}'`}function _c(e){if(!tn(e))return{};let t;try{t=JSON.parse(on(e,"utf8"))}catch{throw new Error(`Invalid existing Goose hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Goose hooks.json at ${e}: root must be a JSON object.`);return t}function nn(e={}){let t=e.pluginName??"toolnet-memory",o=e.hooksFile??Zo(t),n=_c(o),r=e.binary??"toolnet-memory",c=`${en(r)} session:goose-hook`,s=`${en(r)} session:goose-hook`,i={type:"command",command:c,timeout:30},l={type:"command",command:s,timeout:3},a=n.hooks&&typeof n.hooks=="object"&&!Array.isArray(n.hooks)?n.hooks:{};n.hooks=a;let d=(Array.isArray(a.Stop)?a.Stop:[]).filter(fe=>{try{return!JSON.stringify(fe).includes("session:goose-hook")}catch{return!0}}),g=(Array.isArray(a.SessionEnd)?a.SessionEnd:[]).filter(fe=>{try{return!JSON.stringify(fe).includes("session:goose-hook")}catch{return!0}});a.Stop=[...d,{hooks:[i]}],a.SessionEnd=[...g,{hooks:[l]}];let C=JSON.stringify(n,null,2)+`
`,I=!tn(o)||on(o,"utf8")!==C;return Dc(o,C,{encoding:"utf8",mode:384}),{hooksFile:o,changed:I,stopInstalled:!0,sessionEndInstalled:!0}}function rn(e={}){let t=nn(e);return{hooksFile:t.hooksFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as an,mkdirSync as Gc,readFileSync as un,renameSync as Lc,rmSync as qc,writeFileSync as Kc}from"node:fs";import{dirname as Bc}from"node:path";import{homedir as Jc}from"node:os";import{join as sn}from"node:path";function cn(e={}){let t=e.projectRoot;return t?sn(t,".qwen","hooks.json"):sn(e.home??Jc(),".qwen","hooks.json")}function ln(e){return`'${e.replace(/'/g,"'\\''")}'`}function Wc(e){if(!an(e))return{};let t;try{t=JSON.parse(un(e,"utf8"))}catch{throw new Error(`Invalid existing Qwen hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Qwen hooks.json at ${e}: root must be a JSON object.`);return t}function Uc(e,t){Gc(Bc(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Kc(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Lc(o,e)}finally{qc(o,{force:!0})}}function dn(e={}){let t=e.hooksFile??cn({projectRoot:e.projectRoot}),o=Wc(t),n=e.binary??"toolnet-memory",r=`${ln(n)} session:qwen-hook`,c=`${ln(n)} session:qwen-hook`,s={type:"command",command:r,timeout:30},i={type:"command",command:c,timeout:3},l=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=l;let u=(Array.isArray(l.Stop)?l.Stop:[]).filter(I=>{try{return!JSON.stringify(I).includes("session:qwen-hook")}catch{return!0}}),p=(Array.isArray(l.SessionEnd)?l.SessionEnd:[]).filter(I=>{try{return!JSON.stringify(I).includes("session:qwen-hook")}catch{return!0}});l.Stop=[...u,{hooks:[s]}],l.SessionEnd=[...p,{hooks:[i]}];let g=JSON.stringify(o,null,2)+`
`,C=!an(t)||un(t,"utf8")!==g;return Uc(t,o),{hooksFile:t,changed:C,stopInstalled:!0,sessionEndInstalled:!0}}function pn(e={}){let t=dn(e);return{hooksFile:t.hooksFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as yn,mkdirSync as Vc,readFileSync as Xc,renameSync as zc,rmSync as Zc,writeFileSync as el}from"node:fs";import{dirname as tl}from"node:path";import{homedir as Qc}from"node:os";import{join as Yc}from"node:path";function gn(e={}){return Yc(e.home??Qc(),".kimi-code","config.toml")}function fn(e){return`'${e.replace(/'/g,"'\\''")}'`}function ol(e){return yn(e)?Xc(e,"utf8"):""}function mn(e,t){Vc(tl(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{el(o,t,{encoding:"utf8",mode:384}),zc(o,e)}finally{Zc(o,{force:!0})}}function hn(e={}){let t=e.configFile??gn(),o=ol(t),n=e.binary??"toolnet-memory",r=`${fn(n)} session:kimi-hook`,c=`${fn(n)} session:kimi-hook`,s=`[[hooks]]
name = "toolnet-memory-stop"
event = "Stop"
command = ${r}
timeout = 30
`,i=`[[hooks]]
name = "toolnet-memory-session-end"
event = "SessionEnd"
command = ${c}
timeout = 3
`,l=!1;return o.includes("toolnet-memory-stop")||(o=o.trim()+`

`+s+`
`,l=!0),o.includes("toolnet-memory-session-end")||(o=o.trim()+`

`+i+`
`,l=!0),l?mn(t,o):yn(t)||(mn(t,s+`
`+i+`
`),l=!0),{configFile:t,changed:l,stopInstalled:!0,sessionEndInstalled:!0}}function kn(e={}){let t=hn(e);return{configFile:t.configFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as bn,mkdirSync as il,readFileSync as sl,renameSync as cl,rmSync as ll,writeFileSync as al}from"node:fs";import{dirname as ul}from"node:path";import{homedir as nl}from"node:os";import{join as rl}from"node:path";function In(e={}){return rl(e.home??nl(),".hermes","config.yaml")}function dl(e){return`'${e.replace(/'/g,"'\\''")}'`}function pl(e){return bn(e)?sl(e,"utf8"):""}function gl(e,t){il(ul(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{al(o,t,{encoding:"utf8",mode:384}),cl(o,e)}finally{ll(o,{force:!0})}}function Sn(e={}){let t=e.configFile??In(),o=pl(t),n=e.binary??"toolnet-memory",c=`  - name: toolnet-memory-session-end
    event: on_session_end
    command: ${`${dl(n)} session:hermes-hook`}
    timeout: 30
`,s=!1;return o.includes("toolnet-memory-session-end")||(o.includes("hooks:")?o=o.replace(/hooks:\n/,`hooks:
${c}`):o=o.trim()+`

hooks:
`+c,s=!0),(s||!bn(t))&&(o.endsWith(`
`)||(o+=`
`),gl(t,o)),{configFile:t,changed:s,sessionEndInstalled:!0}}function On(e={}){let t=Sn(e);return{configFile:t.configFile,changed:t.changed,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as Cn,mkdirSync as yl,readFileSync as xn,renameSync as hl,rmSync as kl,writeFileSync as Il}from"node:fs";import{dirname as bl}from"node:path";import{existsSync as fl}from"node:fs";import{homedir as ml}from"node:os";import{join as Qe}from"node:path";function wn(e={}){let t=e.home??ml();return fl(Qe(t,".qoder-cn"))?Qe(t,".qoder-cn","settings.json"):Qe(t,".qoder","settings.json")}function jn(e){return`'${e.replace(/'/g,"'\\''")}'`}function Sl(e){if(!Cn(e))return{};let t;try{t=JSON.parse(xn(e,"utf8"))}catch{throw new Error(`Invalid existing Qoder settings.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Qoder settings.json at ${e}: root must be a JSON object.`);return t}function Ol(e,t){yl(bl(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Il(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),hl(o,e)}finally{kl(o,{force:!0})}}function vn(e={}){let t=e.settingsFile??wn(),o=Sl(t),n=e.binary??"toolnet-memory",r=`${jn(n)} session:qoder-hook`,c=`${jn(n)} session:qoder-hook`,s={type:"command",command:r,timeout:30},i={type:"command",command:c,timeout:3},l=Array.isArray(o.hooks)?[...o.hooks]:[],u=l.filter(g=>{try{return!JSON.stringify(g).includes("session:qoder-hook")}catch{return!0}}).filter(g=>{try{return!JSON.stringify(g).includes("session:qoder-hook")}catch{return!0}});l.length=0,l.push({...s,event:"Stop"},{...i,event:"SessionEnd"}),o.hooks=l;let d=JSON.stringify(o,null,2)+`
`,p=!Cn(t)||xn(t,"utf8")!==d;return Ol(t,o),{settingsFile:t,changed:p,stopInstalled:!0,sessionEndInstalled:!0}}function Fn(e={}){let t=vn(e);return{settingsFile:t.settingsFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as wl,mkdirSync as Rn,readFileSync as jl,renameSync as Cl,rmSync as xl,writeFileSync as vl}from"node:fs";import{dirname as Fl,join as ge}from"node:path";import{homedir as Rl}from"node:os";function El(e,t){Rn(Fl(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{vl(o,t,{encoding:"utf8",mode:493}),Cl(o,e)}finally{xl(o,{force:!0})}}var Ye=`#!/usr/bin/env node
// ToolNet-managed aider wrapper - DO NOT EDIT
// Installed by toolnet-memory session:aider-install

import { spawn as childSpawn } from 'node:child_process';

import { mkdirSync } from 'node:fs';

import { dirname, join } from 'node:path';

function forwardSignal(child, signal) {
  if (child.pid && !child.killed) {
    try {
      process.kill(child.pid, signal);
    } catch {
      // Child may have already exited.
    }
  }
}

async function spawnAiderSession(sessionId, cwd, aiderBinary, aiderArgs) {
  const historyDir = join(cwd, '.toolnet', 'aider-history');
  mkdirSync(historyDir, { recursive: true, mode: 0o700 });

  const uniqueHistoryPath = join(historyDir, sessionId + '.md');

  const env = {
    ...process.env,
    AIDER_CHAT_HISTORY_FILE: uniqueHistoryPath,
  };

  const child = childSpawn(aiderBinary, ['--chat-history-file', uniqueHistoryPath, ...aiderArgs], {
    cwd,
    env,
    shell: false,
    stdio: 'inherit',
  });

  const result = { exitCode: null, signal: null, historyPath: uniqueHistoryPath };

  const onInt = () => forwardSignal(child, 'SIGINT');
  const onTerm = () => forwardSignal(child, 'SIGTERM');

  process.once('SIGINT', onInt);
  process.once('SIGTERM', onTerm);

  await new Promise((resolve) => {
    child.on('exit', (code, signal) => {
      result.exitCode = code ?? null;
      result.signal = (signal ?? null);
      resolve();
    });

    child.on('error', () => {
      result.exitCode = 1;
      resolve();
    });
  });

  process.removeListener('SIGINT', onInt);
  process.removeListener('SIGTERM', onTerm);

  return result;
}

async function main() {
  const cwd = process.cwd();
  const sessionId = process.env.TOOLNET_AIDER_SESSION_ID ?? Date.now().toString(36);
  const aiderBinary = process.argv[2] ?? 'aider';
  const aiderArgs = process.argv.slice(3);

  const result = await spawnAiderSession(sessionId, cwd, aiderBinary, aiderArgs);
  process.exitCode = result.exitCode ?? 0;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
`;function En(e={}){let t=e.cwd?ge(e.cwd,".toolnet","bin"):ge(process.env.TOOLNET_HOME??ge(Rl(),".toolnet"),"bin");Rn(t,{recursive:!0,mode:448});let o=ge(t,"aider-wrapper"),n=Ye.endsWith(`
`)?Ye:Ye+`
`,r=!wl(o)||jl(o,"utf8")!==n;return El(o,n),{launcherPath:o,changed:r}}import{existsSync as Pn,mkdirSync as Pl,readFileSync as Nn,renameSync as Nl,rmSync as Tl,writeFileSync as Al}from"node:fs";import{dirname as Ml,join as Tn}from"node:path";import{homedir as Hl}from"node:os";function $l(){return process.env.PLANDEX_BASE_DIR??Tn(Hl(),"plandex-server")}function Dl(e){if(!Pn(e))return{};let t;try{t=JSON.parse(Nn(e,"utf8"))}catch{throw new Error(`Invalid existing Plandex config at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Plandex config at ${e}: root must be a JSON object.`);return t}function _l(e,t){Pl(Ml(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Al(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Nl(o,e)}finally{Tl(o,{force:!0})}}function An(e={}){let t=$l(),o=Tn(t,"toolnet-memory.json"),n=Dl(o),r=n.toolnetMemory??{};r.integration="toolnet-memory",r.captureMode="manual-recovery",r.managedBy="toolnet-memory",n.toolnetMemory=r;let c=JSON.stringify(n,null,2)+`
`,s=!Pn(o)||Nn(o,"utf8")!==c;return _l(o,n),{configPath:o,changed:s}}import{existsSync as Mn,mkdirSync as Hn,readFileSync as $n,renameSync as Jl,rmSync as Gl,writeFileSync as Ll}from"node:fs";import{dirname as Dn,join as ql}from"node:path";import{homedir as Kl}from"node:os";function Bl(e){if(!Mn(e))return{};let t;try{t=JSON.parse($n(e,"utf8"))}catch{throw new Error(`Invalid existing OpenRouter config at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing OpenRouter config at ${e}: root must be a JSON object.`);return t}function Wl(e,t){Hn(Dn(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Ll(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Jl(o,e)}finally{Gl(o,{force:!0})}}function _n(e={}){let t=Kl(),o=ql(t,".config","openrouter","toolnet-memory.json");Hn(Dn(o),{recursive:!0,mode:448});let n=Bl(o);n.toolnetMemory={integration:"toolnet-memory",captureMode:"blocked-product-identity",managedBy:"toolnet-memory",blocked:!0,reason:"OpenRouter CLI product identity is blocked for ToolNet integration."};let r=JSON.stringify(n,null,2)+`
`,c=!Mn(o)||$n(o,"utf8")!==r;return Wl(o,n),{configPath:o,blocked:!0,changed:c}}import{existsSync as Kn,mkdirSync as Ql,readFileSync as Bn,renameSync as Yl,rmSync as Vl,writeFileSync as Xl}from"node:fs";import{dirname as zl}from"node:path";import{homedir as Ul}from"node:os";import{join as Jn}from"node:path";function Gn(e={}){return Jn(e.home??Ul(),".bob","settings","settings.json")}function Ln(e){return Jn(e,".bob","settings.json")}function Zl(e){if(!Kn(e))return{};let t;try{t=JSON.parse(Bn(e,"utf8"))}catch{throw new Error(`Invalid existing Bob settings.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Bob settings.json at ${e}: root must be a JSON object.`);return t}function ea(e,t){Ql(zl(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Xl(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Yl(o,e)}finally{Vl(o,{force:!0})}}function qn(e){return`'${e.replace(/'/g,"'\\''")}'`}function Wn(e={}){let t=e.projectRoot!==void 0?Ln(e.projectRoot):Gn({home:e.home}),o=Zl(t),n=e.binary??"toolnet-memory",r=`${qn(n)} hook ibm-bob`,c=`${qn(n)} hook ibm-bob`,s={type:"command",command:r,timeout:10},i={type:"command",command:c,timeout:10},l=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=l;let u=(Array.isArray(l.Stop)?l.Stop:[]).filter(I=>{try{return!JSON.stringify(I).includes("hook ibm-bob")}catch{return!0}}),p=(Array.isArray(l.SessionStart)?l.SessionStart:[]).filter(I=>{try{return!JSON.stringify(I).includes("hook ibm-bob")}catch{return!0}});l.Stop=[...u,{hooks:[s]}],l.SessionStart=[...p,{hooks:[i]}];let g=JSON.stringify(o,null,2)+`
`,C=!Kn(t)||Bn(t,"utf8")!==g;return ea(t,o),{settingsFile:t,changed:C,stopInstalled:!0,sessionStartInstalled:!0}}function Un(e={}){let t=Wn(e);return{settingsFile:t.settingsFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionStartInstalled:t.sessionStartInstalled}}import{existsSync as Ve,mkdirSync as Vn,readFileSync as Xe,renameSync as oa,rmSync as na,writeFileSync as ra}from"node:fs";import{dirname as ia,join as ze}from"node:path";import{homedir as ta}from"node:os";import{join as Qn}from"node:path";function Yn(e){return e?Qn(e,".cline","hooks"):Qn(ta(),"Documents","Cline","Hooks")}function sa(e){return`'${e.replace(/'/g,"'\\''")}'`}function Ze(e,t){Vn(ia(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{ra(o,t,{encoding:"utf8",mode:493}),oa(o,e)}finally{na(o,{force:!0})}}function ca(e){return`#!/bin/sh
exec ${`${sa(e)} hook cline`}
`}function Xn(e={}){let t=e.binary??"toolnet-memory",o=Yn(e.projectRoot),n=ze(o,"toolnet-memory.sh");Vn(o,{recursive:!0,mode:448});let r=ca(t),c=!Ve(n)||Xe(n,"utf8")!==r;Ze(n,r);let s=ze(o,"TaskComplete"),i=ze(o,"TaskStart"),l=!1,a=!1;return(!Ve(s)||Xe(s,"utf8")!==r)&&(Ze(s,r),l=!0),(!Ve(i)||Xe(i,"utf8")!==r)&&(Ze(i,r),a=!0),{hooksDir:o,hooksFile:n,changed:c||l||a,taskCompleteInstalled:l,taskStartInstalled:a}}function zn(e={}){let t=Xn(e);return{hooksFile:t.hooksFile,hooksDir:t.hooksDir,changed:t.changed,taskCompleteInstalled:t.taskCompleteInstalled,taskStartInstalled:t.taskStartInstalled}}import{existsSync as tr,mkdirSync as or,readFileSync as ua,renameSync as da,rmSync as pa,writeFileSync as ga}from"node:fs";import{dirname as nr}from"node:path";import{homedir as la}from"node:os";import{join as aa}from"node:path";function Zn(){return aa(la(),".rovodev","config.yml")}function rr(e){return`'${e.replace(/'/g,"'\\''")}'`}function er(e,t){or(nr(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{ga(o,t,{encoding:"utf8",mode:384}),da(o,e)}finally{pa(o,{force:!0})}}function fa(e){return tr(e)?ua(e,"utf8"):""}function ma(e){let t=`  - type: command
    command: ${rr("toolnet-memory hook rovo")}
    timeout: 10
`;if(e.includes("hooks:")){if(e.includes("toolnet-memory hook rovo"))return e;let o=e.split(`
`),r=o.length-1;for(let c=o.length-1;c>=0&&o[c].trim()==="";c--)r=c;return o.splice(r,0,t),o.join(`
`)}return e+`
hooks:
${t}`}function ir(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??Zn();if(or(nr(o),{recursive:!0,mode:448}),!tr(o)){let s=`hooks:
  - type: command
    command: ${rr(`${t} hook rovo`)}
    timeout: 10
`;return er(o,s),{configFile:o,changed:!0,hookInstalled:!0}}let n=fa(o),r=ma(n),c=n!==r;return c&&er(o,r),{configFile:o,changed:c,hookInstalled:c}}function sr(e={}){let t=ir(e);return{configFile:t.configFile,changed:t.changed,hookInstalled:t.hookInstalled}}import{existsSync as lr,mkdirSync as ur,readFileSync as ar,renameSync as ka,rmSync as Ia,writeFileSync as ba}from"node:fs";import{dirname as dr,join as Sa}from"node:path";import{homedir as ya}from"node:os";import{join as ha}from"node:path";function cr(){return[ha(ya(),".warp")]}function Oa(e,t){ur(dr(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{ba(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),ka(o,e)}finally{Ia(o,{force:!0})}}function pr(e={}){let t=cr(),o=Sa(t[0],"toolnet-memory.json");ur(dr(o),{recursive:!0,mode:448});let n=lr(o)?JSON.parse(ar(o,"utf8")):{};n.toolnetMemory={integration:"toolnet-memory",captureMode:"blocked-capability",managedBy:"toolnet-memory",blocked:!0,reason:"Warp Agent CLI capability is blocked for ToolNet integration."};let r=JSON.stringify(n,null,2)+`
`,c=!lr(o)||ar(o,"utf8")!==r;return Oa(o,n),{configFile:o,blocked:!0,changed:c}}function gr(e={}){if(e.scope==="global")return{scope:"global",automatic:!1,reason:"explicit-global"};if(e.scope==="project"||e.scope==="both"){let o=w({cwd:e.cwd,project:e.projectRoot});if(!o.eligible)throw new Error(`Explicit ${e.scope} integration requires an explicit project, ToolNet project, or Git repository root.`);return{scope:e.scope,automatic:!1,project:o,reason:e.scope==="project"?"explicit-project":"explicit-both"}}let t=w({cwd:e.cwd,project:e.projectRoot});return t.toolnetProject?{scope:"both",automatic:!0,project:t,reason:"toolnet-project"}:{scope:"global",automatic:!0,reason:"no-toolnet-project"}}function fr(){return Et()}function wa(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[],n=e.detections??fr(),r=new Map(n.map(s=>[s.agent,s.detected])),c=gr({scope:e.scope,projectRoot:e.projectRoot,cwd:e.cwd});if(!(e.force===!0||r.get("agy")===!0))o.push({agent:"agy",detected:!1,installed:!1,targets:[]});else try{let i=$t({binary:t});o.push({agent:"agy",detected:!0,installed:!0,targets:i.files})}catch(i){o.push({agent:"agy",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("opencode")===!0))o.push({agent:"opencode",detected:!1,installed:!1,targets:[]});else try{let i=qt({binary:t}),l=Qt({binary:t});o.push({agent:"opencode",detected:!0,installed:!0,targets:[...i,l.configFile,`mcp:${l.serverName}`]})}catch(i){o.push({agent:"opencode",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("claude")===!0))o.push({agent:"claude",detected:!1,installed:!1,targets:[]});else try{let i=mo({binary:t});o.push({agent:"claude",detected:!0,installed:!0,targets:[i.hooks.settingsFile,i.mcp.configFile,`mcp:${i.mcp.serverName}`]})}catch(i){o.push({agent:"claude",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("kiro")===!0))o.push({agent:"kiro",detected:!1,installed:!1,targets:[]});else try{let i=wo({...e.kiro??{},binary:t});o.push({agent:"kiro",detected:!0,installed:!0,targets:[i.mcp.configFile,`mcp:${i.mcp.serverName}`,i.hooks.hooksFile]})}catch(i){o.push({agent:"kiro",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("cursor")===!0))o.push({agent:"cursor",detected:!1,installed:!1,targets:[]});else try{let i=e.cursor??{},l=Do({...i,binary:t,scope:i.scope??c.scope,projectRoot:i.projectRoot??c.project?.root});o.push({agent:"cursor",detected:!0,installed:!0,scope:l.scope,projectRoot:l.project?.root,targets:[...l.files,`mcp:${l.mcp.serverName}`]})}catch(i){o.push({agent:"cursor",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("copilot")===!0))o.push({agent:"copilot",detected:!1,installed:!1,targets:[]});else try{let i=e.copilot??{},l=Ko({...i,binary:t,scope:i.scope??c.scope,projectRoot:i.projectRoot??c.project?.root});o.push({agent:"copilot",detected:!0,installed:!0,scope:l.scope,projectRoot:l.project?.root,targets:[...l.files,`mcp:${l.mcp.serverName}`]})}catch(i){o.push({agent:"copilot",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("grok")===!0))o.push({agent:"grok",detected:!1,installed:!1,targets:[]});else try{let i=e.grok??{},l=Xo({...i,binary:t,scope:i.scope??c.scope,projectRoot:i.projectRoot??c.project?.root});o.push({agent:"grok",detected:!0,installed:!0,scope:l.scope,projectRoot:l.project?.root,targets:[...l.files,`mcp:${l.mcp.serverName}`]})}catch(i){o.push({agent:"grok",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("toolnet-cli")===!0))o.push({agent:"toolnet-cli",detected:!1,installed:!1,targets:[]});else try{let i=e.toolnetCli??{},l=Co({...i,binary:t});o.push({agent:"toolnet-cli",detected:!0,installed:!0,targets:[l.mcp.configFile]})}catch(i){o.push({agent:"toolnet-cli",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("kilo")===!0))o.push({agent:"kilo",detected:!1,installed:!1,targets:[]});else try{let i=e.kilo??{},l=vo({...i,binary:t});o.push({agent:"kilo",detected:!0,installed:!0,targets:[l.mcp.configFile]})}catch(i){o.push({agent:"kilo",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("codex")===!0))o.push({agent:"codex",detected:!1,installed:!1,targets:[]});else try{let i=Zt({binary:t}),l=to({binary:t}),a=so({binary:t}),u=ao({binary:t});if(!u.installed)throw new Error(u.error??"Codex MCP registration failed");let d=[i.configFile,l,a.hooksFile,`mcp:${u.serverName}`];i.preservedPrevious&&d.push(i.previousFile),o.push({agent:"codex",detected:!0,installed:!0,targets:d})}catch(i){o.push({agent:"codex",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("goose")===!0))o.push({agent:"goose",detected:!1,installed:!1,targets:[]});else try{let i=e.goose??{},l=rn({...i,binary:t});o.push({agent:"goose",detected:!0,installed:!0,targets:[l.hooksFile]})}catch(i){o.push({agent:"goose",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("qwen")===!0))o.push({agent:"qwen",detected:!1,installed:!1,targets:[]});else try{let i=e.qwen??{},l=pn({...i,binary:t});o.push({agent:"qwen",detected:!0,installed:!0,targets:[l.hooksFile]})}catch(i){o.push({agent:"qwen",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("kimi")===!0))o.push({agent:"kimi",detected:!1,installed:!1,targets:[]});else try{let i=e.kimi??{},l=kn({...i,binary:t});o.push({agent:"kimi",detected:!0,installed:!0,targets:[l.configFile]})}catch(i){o.push({agent:"kimi",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("hermes")===!0))o.push({agent:"hermes",detected:!1,installed:!1,targets:[]});else try{let i=e.hermes??{},l=On({...i,binary:t});o.push({agent:"hermes",detected:!0,installed:!0,targets:[l.configFile]})}catch(i){o.push({agent:"hermes",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("qoder")===!0))o.push({agent:"qoder",detected:!1,installed:!1,targets:[]});else try{let i=e.qoder??{},l=Fn({...i,binary:t});o.push({agent:"qoder",detected:!0,installed:!0,targets:[l.settingsFile]})}catch(i){o.push({agent:"qoder",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("aider")===!0))o.push({agent:"aider",detected:!1,installed:!1,targets:[]});else try{let i=e.aider??{},l=En({...i,binary:t});o.push({agent:"aider",detected:!0,installed:!0,targets:[l.launcherPath]})}catch(i){o.push({agent:"aider",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("plandex")===!0))o.push({agent:"plandex",detected:!1,installed:!1,targets:[]});else try{let i=e.plandex??{},l=An({...i,binary:t});o.push({agent:"plandex",detected:!0,installed:!0,targets:[l.configPath]})}catch(i){o.push({agent:"plandex",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("openrouter")===!0))o.push({agent:"openrouter",detected:!1,installed:!1,targets:[]});else try{let i=e.openrouter??{},l=_n({...i,binary:t});o.push({agent:"openrouter",detected:!0,installed:!0,targets:[l.configPath]})}catch(i){o.push({agent:"openrouter",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("bob")===!0))o.push({agent:"bob",detected:!1,installed:!1,targets:[]});else try{let i=e.bob??{},l=Un({...i,binary:t});o.push({agent:"bob",detected:!0,installed:!0,targets:[l.settingsFile]})}catch(i){o.push({agent:"bob",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("cline")===!0))o.push({agent:"cline",detected:!1,installed:!1,targets:[]});else try{let i=e.cline??{},l=zn({...i,binary:t});o.push({agent:"cline",detected:!0,installed:!0,targets:[l.hooksFile]})}catch(i){o.push({agent:"cline",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("rovo")===!0))o.push({agent:"rovo",detected:!1,installed:!1,targets:[]});else try{let i=e.rovo??{},l=sr({...i,binary:t});o.push({agent:"rovo",detected:!0,installed:!0,targets:[l.configFile]})}catch(i){o.push({agent:"rovo",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("warp")===!0))o.push({agent:"warp",detected:!1,installed:!1,targets:[]});else try{let i=e.warp??{},l=pr({...i,binary:t});o.push({agent:"warp",detected:!0,installed:!0,targets:[l.configFile]})}catch(i){o.push({agent:"warp",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}return o}function mr(e){switch(e){case"agy":return"Agy / Antigravity";case"opencode":return"OpenCode";case"claude":return"Claude Code";case"kiro":return"Kiro CLI";case"cursor":return"Cursor CLI";case"copilot":return"GitHub Copilot CLI";case"grok":return"Grok Build";case"toolnet-cli":return"ToolNet CLI";case"kilo":return"Kilo";case"codex":return"Codex";case"goose":return"goose";case"qwen":return"Qwen Code";case"kimi":return"Kimi Code CLI";case"hermes":return"Hermes Agent";case"qoder":return"Qoder CLI";case"aider":return"Aider";case"plandex":return"Plandex";case"openrouter":return"OpenRouter CLI";case"bob":return"IBM Bob Shell";case"cline":return"Cline CLI";case"rovo":return"Rovo Dev CLI";case"warp":return"Warp Agent CLI";default:return e}}function ja(e){console.log(""),console.log("ToolNet Memory Integration Detection"),console.log("===================================="),console.log("");for(let t of e){let o=mr(t.agent);if(!t.detected){console.log(`\u25CB ${o}: not detected`);continue}console.log(`\u2713 ${o}: detected`);for(let n of t.evidence)console.log(`  ${n}`)}console.log("")}var Ca=["claude","cursor","copilot","grok","kiro","opencode","codex","agy"],xa={opencode:"toolnet-memory session:opencode-sync",codex:"toolnet-memory session:codex-sync",agy:"toolnet-memory session:agy-sync","toolnet-cli":"toolnet-memory session:toolnet-cli-sync"};function va(e){if(Ca.includes(e))return"ToolNet integration configured; hooks installed successfully";let t=xa[e];return t?`ToolNet integration configured; run ${t} to capture session history`:"ToolNet integration configured; capture begins when a supported hook or sync runs"}function Fa(e){console.log(""),console.log("ToolNet Memory AI Integrations"),console.log("=============================="),console.log("");for(let t of e){let o=mr(t.agent);if(!t.detected){console.log(`- ${o}: not detected`);continue}if(t.installed){let n=t.scope?` [scope=${t.scope}]`:"";console.log(`\u2713 ${o}: ${va(t.agent)}${n}`),t.projectRoot&&console.log(`  project: ${t.projectRoot}`);continue}console.log(`\u2717 ${o}: integration failed`),t.error&&console.log(`  ${t.error}`)}console.log("")}function Ra(e,t){let o=e.indexOf(t);return o>=0?e[o+1]:void 0}function Ea(e){return e.includes("--scope")||e.includes("--global")||e.includes("--both")?Ho(e):void 0}async function Pa(){let e=process.argv.slice(2),t=e.includes("--all"),o=e.includes("--json"),n=e.includes("--detect-only"),r=Ea(e),c=Ra(e,"--project");if(n){let i=fr();if(o){console.log(JSON.stringify(i,null,2));return}ja(i);return}let s=wa({force:t,scope:r,projectRoot:c});if(o){console.log(JSON.stringify(s,null,2));return}Fa(s)}var Na=process.argv[1]&&(process.argv[1].endsWith("auto-integrate.js")||process.argv[1].endsWith("auto-integrate.ts"));Na&&Pa().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});export{fr as detectAutoIntegrations,wa as installAutoIntegrations,mr as integrationDisplayName};
