import{existsSync as wt}from"node:fs";import{homedir as Vn}from"node:os";import{join as v}from"node:path";import{spawnSync as Xn}from"node:child_process";import{homedir as xn}from"node:os";import{join as R}from"node:path";function Qe(e={}){return R(e.home??xn(),".gemini")}function Ye(e={}){return R(Qe(e),"antigravity-cli")}function Ve(e={}){return R(Qe(e),"config")}function U(e={}){return R(Ve(e),"mcp_config.json")}function B(e={}){let t=e.cwd??process.cwd();return R(t,".agents","mcp_config.json")}function W(e="toolnet-memory",t={}){return R(Ye(t),"plugins",e)}function Xe(e={}){return[Ye(e),U(e),Ve(e),B(e)]}import{homedir as ze}from"node:os";import{join as S}from"node:path";function E(e={}){let t=process.env.OPENCODE_CONFIG_DIR?.trim();if(t)return t;let o=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return o?S(o,"opencode"):S(e.home??ze(),".config","opencode")}function fe(e={}){let t=process.env.OPENCODE_CONFIG?.trim();if(t)return t;let o=e.home??ze(),n=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return n?S(n,"opencode","opencode.json"):S(o,".config","opencode","opencode.json")}function me(e={}){let t=e.cwd??process.cwd();return S(t,"opencode.json")}function Ze(e={}){return S(E(e),"plugins")}function et(e={}){return S(E(e),"AGENTS.md")}import{homedir as tt}from"node:os";import{join as ye}from"node:path";function he(e={}){return ye(e.home??tt(),".claude")}function ot(e={}){return ye(he(e),"settings.json")}function nt(e={}){return ye(e.home??tt(),".claude.json")}import{homedir as vn}from"node:os";import{join as x}from"node:path";function ke(e={}){return e.kiroHome??process.env.KIRO_HOME??x(e.home??vn(),".kiro")}function Fn(e={}){return x(ke(e),"settings")}function Q(e={}){return x(Fn(e),"mcp.json")}function Ie(e={}){let t=e.cwd??process.cwd();return x(t,".kiro","settings","mcp.json")}function Rn(e={}){return x(ke(e),"hooks")}function be(e={}){return x(Rn(e),"toolnet-memory.json")}function Oe(e={}){let t=e.cwd??process.cwd();return x(t,".kiro","hooks","toolnet-memory.json")}function rt(e={}){return[ke(e),Q(e)]}import{homedir as En}from"node:os";import{join as je}from"node:path";function it(e={}){return je(e.home??En(),".toolnetcli")}function Pn(e={}){return je(it(e),"config.json")}function st(e={}){let t=e.cwd??process.cwd();return je(t,".toolnet","mcp.json")}function ct(e={}){let t=it(e),o=Pn(e);return[t,o]}import{homedir as Nn}from"node:os";import{join as we}from"node:path";function lt(e={}){if(e.kiloHome)return e.kiloHome;if(process.env.KILO_HOME)return process.env.KILO_HOME;let t=e.xdgConfigHome??process.env.XDG_CONFIG_HOME;return t?we(t,"kilo"):we(e.home??Nn(),".config","kilo")}function Ce(e={}){return we(lt(e),"kilo.jsonc")}function at(e={}){let t=lt(e),o=Ce(e);return[t,o]}import{homedir as Tn}from"node:os";import{join as b,resolve as An}from"node:path";function Y(e={}){return e.cursorHome??b(e.home??Tn(),".cursor")}function Mn(e={}){return e.cursorConfigDir??process.env.CURSOR_CONFIG_DIR??(e.xdgConfigHome??process.env.XDG_CONFIG_HOME?b(e.xdgConfigHome??process.env.XDG_CONFIG_HOME,"cursor"):void 0)??Y(e)}function V(e={}){return b(Y(e),"mcp.json")}function X(e={}){return b(Y(e),"hooks.json")}function Se(e){return b(An(e),".cursor")}function ut(e){return b(Se(e),"mcp.json")}function pt(e){return b(Se(e),"hooks.json")}function Hn(e){return b(Se(e),"rules")}function dt(e){return b(Hn(e),"toolnet-memory.mdc")}function gt(e={}){return Array.from(new Set([Y(e),Mn(e)]))}import{homedir as $n}from"node:os";import{join as k,resolve as _n}from"node:path";function xe(e={}){return e.copilotHome??process.env.COPILOT_HOME??k(e.home??$n(),".copilot")}function z(e={}){return k(xe(e),"mcp-config.json")}function Dn(e={}){return k(xe(e),"hooks")}function Z(e={}){return k(Dn(e),"toolnet-memory.json")}function ve(e){return k(_n(e),".github")}function ft(e){return k(ve(e),"mcp.json")}function Jn(e){return k(ve(e),"hooks")}function mt(e){return k(Jn(e),"toolnet-memory.json")}function Gn(e){return k(ve(e),"instructions")}function yt(e){return k(Gn(e),"toolnet-memory.instructions.md")}function ht(e={}){return[xe(e)]}import{homedir as Ln}from"node:os";import{join as y,resolve as Kn}from"node:path";function ee(e={}){return e.grokHome??process.env.GROK_HOME??y(e.home??Ln(),".grok")}function te(e={}){return y(ee(e),"config.toml")}function qn(e={}){return y(ee(e),"hooks")}function oe(e={}){return y(qn(e),"toolnet-memory.json")}function Un(e={}){return y(ee(e),"skills")}function Bn(e={}){return y(Un(e),"toolnet-continuity")}function ne(e={}){return y(Bn(e),"SKILL.md")}function Fe(e){return y(Kn(e),".grok")}function kt(e){return y(Fe(e),"config.toml")}function Wn(e){return y(Fe(e),"hooks")}function It(e){return y(Wn(e),"toolnet-memory.json")}function Qn(e){return y(Fe(e),"skills")}function Yn(e){return y(Qn(e),"toolnet-continuity")}function bt(e){return y(Yn(e),"SKILL.md")}function Ot(e={}){return[ee(e)]}function zn(e){return Xn("sh",["-lc",`command -v ${JSON.stringify(e)} >/dev/null 2>&1`],{stdio:"ignore"}).status===0}function h(e){let t=e.commandExists(e.command),o=e.configPaths.filter(c=>wt(c)),n=o.length>0,r=[];t&&r.push(`command:${e.command}`);for(let c of o)r.push(`config:${c}`);return{agent:e.agent,detected:t||n,commandDetected:t,configDetected:n,evidence:r}}function jt(e){let t=e.commands.filter(s=>e.commandExists(s)),o=e.configPaths.filter(s=>wt(s)),n=t.length>0,r=o.length>0,c=[...t.map(s=>`command:${s}`),...o.map(s=>`config:${s}`)];return{agent:e.agent,detected:n||r,commandDetected:n,configDetected:r,evidence:c}}function Ct(e={}){let t=e.home??Vn(),o=e.commandExists??zn,n=e.codexHome??process.env.CODEX_HOME??v(t,".codex");return[h({agent:"agy",command:"agy",commandExists:o,configPaths:Xe({home:t})}),h({agent:"opencode",command:"opencode",commandExists:o,configPaths:[E({home:t,xdgConfigHome:e.xdgConfigHome})]}),h({agent:"claude",command:"claude",commandExists:o,configPaths:[he({home:t})]}),h({agent:"kiro",command:"kiro-cli",commandExists:o,configPaths:rt({home:t,kiroHome:e.kiroHome})}),jt({agent:"cursor",commands:["agent","cursor-agent"],commandExists:o,configPaths:gt({home:t,cursorHome:e.cursorHome,cursorConfigDir:e.cursorConfigDir,xdgConfigHome:e.xdgConfigHome})}),h({agent:"copilot",command:"copilot",commandExists:o,configPaths:ht({home:t,copilotHome:e.copilotHome})}),h({agent:"grok",command:"grok",commandExists:o,configPaths:Ot({home:t,grokHome:e.grokHome})}),h({agent:"toolnet-cli",command:"toolnet",commandExists:o,configPaths:ct({home:t})}),jt({agent:"kilo",commands:["kilo","kilo-code"],commandExists:o,configPaths:at({home:t,kiloHome:e.kiloHome})}),h({agent:"codex",command:"codex",commandExists:o,configPaths:[n]}),h({agent:"goose",command:"goose",commandExists:o,configPaths:[v(t,".agents","plugins")]}),h({agent:"qwen",command:"qwen",commandExists:o,configPaths:[v(t,".qwen")]}),h({agent:"kimi",command:"kimi-code",commandExists:o,configPaths:[v(t,".kimi-code")]}),h({agent:"hermes",command:"hermes",commandExists:o,configPaths:[v(t,".hermes")]}),h({agent:"qoder",command:"qoder",commandExists:o,configPaths:[v(t,".qoder-cn"),v(t,".qoder")]})]}import{existsSync as hr,mkdirSync as Et,readFileSync as kr,renameSync as Ir,writeFileSync as br}from"node:fs";import{dirname as Or,join as ie}from"node:path";import{existsSync as Zn,mkdirSync as er,readFileSync as tr,renameSync as or,rmSync as nr,writeFileSync as rr}from"node:fs";import{dirname as ir,join as sr}from"node:path";function cr(e){return`'${e.replace(/'/g,"'\\''")}'`}function lr(e){if(!Zn(e))return{};let t;try{t=JSON.parse(tr(e,"utf8"))}catch{throw new Error(`Invalid existing Agy hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Agy hooks.json at ${e}: root must be a JSON object.`);return t}function ar(e,t){er(ir(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{rr(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),or(o,e)}finally{nr(o,{force:!0})}}function St(e={}){let t=e.pluginName??"toolnet-memory",o=e.hooksFile??sr(W(t),"hooks.json"),n=lr(o),r=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",c=`${cr(r)} session:agy-hook`;return n["toolnet-memory"]={enabled:!0,PreToolUse:[{matcher:"view_file|list_dir|find_by_name|grep_search|run_command",hooks:[{type:"command",command:`${c} pre-tool`,timeout:5}]}],PreInvocation:[{type:"command",command:`${c} pre`,timeout:15}],PostInvocation:[{type:"command",command:`${c} post`,timeout:15}],Stop:[{type:"command",command:`${c} stop`,timeout:30}]},ar(o,n),o}import{existsSync as ur,mkdirSync as pr,readFileSync as dr,renameSync as gr,writeFileSync as fr}from"node:fs";import{dirname as mr}from"node:path";function H(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function yr(e,t){pr(mr(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;fr(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),gr(o,e)}function xt(e){if(!ur(e))return{};let t=dr(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Agy MCP config at ${e}: parse error. Not overwriting.`)}if(!H(o))throw new Error(`Invalid existing Agy MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function vt(e,t){return H(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function re(e,t,o,n){let r=xt(e),c=r.mcpServers;if(c!==void 0&&!H(c))throw new Error(`Invalid existing Agy MCP config: mcpServers must be an object in ${e}.`);let s=H(c)?{...c}:{},i=s[o];if(vt(i,t)&&!n)return{installed:!0,changed:!1};s[o]={command:t,args:["mcp"]};let l={...r,mcpServers:s};yr(e,l);let u=xt(e).mcpServers;if(!H(u)||!vt(u[o],t))throw new Error(`Agy MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function Ft(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",n=e.scope??"global";if(e.configFile)return{...re(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(n==="both"){let s=U(),i=B({cwd:e.cwd}),l=re(s,t,o,e.force??!1),a=re(i,t,o,e.force??!1);return{installed:!0,changed:l.changed||a.changed,configFile:s,serverName:o,command:t,args:["mcp"]}}let r=n==="workspace"?B({cwd:e.cwd}):U();return{...re(r,t,o,e.force??!1),configFile:r,serverName:o,command:t,args:["mcp"]}}var jr=`# ToolNet Memory Continuity

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
`;function wr(e,t){Et(Or(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;br(o,t,{encoding:"utf8",mode:384}),Ir(o,e)}function Rt(e,t){hr(e)&&kr(e,"utf8")===t||wr(e,t)}function Pt(e={}){let t=e.pluginName??"toolnet-memory",o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.pluginRoot??W(t),r=ie(n,"plugin.json"),c=ie(n,"mcp_config.json"),s=ie(n,"hooks.json"),i=ie(n,"rules","toolnet-memory-continuity.md");return Et(n,{recursive:!0,mode:448}),Rt(r,`${JSON.stringify({$schema:"https://antigravity.google/schemas/v1/plugin.json",name:t,description:"Persistent project continuity and memory for Antigravity coding sessions."},null,2)}
`),Ft({configFile:c,binary:o,serverName:"toolnet-memory",force:e.force}),St({hooksFile:s,binary:o,pluginName:t}),Rt(i,`${jr.trim()}
`),{installed:!0,pluginRoot:n,files:[r,c,s,i]}}import{existsSync as Sr,mkdirSync as Mt,readFileSync as xr,writeFileSync as Ht}from"node:fs";import{join as Tt}from"node:path";var Cr="memory_agent_ask";function Nt(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${Cr}

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
`.trim()}var At="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",Re="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function vr(e={}){let t=et();Mt(E(),{recursive:!0});let o=`${At}
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


${Nt()}

${Re}`,n=Sr(t)?xr(t,"utf8"):"",r=n.indexOf(At),c=n.indexOf(Re);return r>=0&&c>=r?n=n.slice(0,r)+o+n.slice(c+Re.length):(n=n.trimEnd(),n&&(n+=`

`),n+=o),Ht(t,n.trimEnd()+`
`,{encoding:"utf8",mode:384}),t}function $t(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[];o.push(vr({cwd:e.cwd}));let n=e.scope??"global",r=[];if((n==="global"||n==="both")&&r.push(e.directory??Ze()),n==="project"||n==="both"){let c=e.cwd??process.cwd();r.push(Tt(c,".opencode","plugins"))}for(let c of r){Mt(c,{recursive:!0});let s=Tt(c,"toolnet-memory.js"),i=`
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
`;Ht(s,i.trimStart(),{encoding:"utf8",mode:384}),o.push(s)}return o}import{existsSync as Jt,mkdirSync as Fr,readFileSync as Rr,renameSync as Er,writeFileSync as Pr}from"node:fs";import{dirname as Gt,join as Nr}from"node:path";function $(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Tr(e,t){Fr(Gt(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;Pr(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Er(o,e)}function _t(e){if(!Jt(e))return{};let t=Rr(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing OpenCode config at ${e}: parse error. Not overwriting.`)}if(!$(o))throw new Error(`Invalid existing OpenCode config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Dt(e,t){if(!$(e))return!1;let o=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(o)&&o.length===2&&o[0]===t&&o[1]==="mcp"}function se(e,t,o,n){let r=Nr(Gt(e),"opencode.jsonc"),c=Jt(r)?r:void 0,s=_t(e),i=s.mcp;if(i!==void 0&&!$(i))throw new Error(`Invalid existing OpenCode config: mcp must be an object in ${e}.`);let l=$(i)?{...i}:{},a=l[o];if(Dt(a,t)&&!n)return{installed:!0,changed:!1,preservedJsonc:c};l[o]={type:"local",command:[t,"mcp"],enabled:!0};let u={...s,mcp:l};Tr(e,u);let p=_t(e);if(!$(p.mcp)||!Dt(p.mcp[o],t))throw new Error(`OpenCode MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0,preservedJsonc:c}}function Lt(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",n=e.scope??"global";if(e.configFile)return{...se(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:[t,"mcp"]};if(n==="both"){let s=fe(),i=me({cwd:e.cwd}),l=se(s,t,o,e.force??!1),a=se(i,t,o,e.force??!1);return{installed:!0,changed:l.changed||a.changed,configFile:s,serverName:o,command:[t,"mcp"],preservedJsonc:l.preservedJsonc??a.preservedJsonc}}let r=n==="project"?me({cwd:e.cwd}):fe();return{...se(r,t,o,e.force??!1),configFile:r,serverName:o,command:[t,"mcp"]}}import{existsSync as Ar,mkdirSync as Kt,readFileSync as Mr,writeFileSync as qt}from"node:fs";import{homedir as Ut}from"node:os";import{dirname as Bt,join as Ee}from"node:path";function Hr(e){let t=[],o=/"((?:\\.|[^"\\])*)"|'([^']*)'/g,n;for(;n=o.exec(e);){let r=n[1]??n[2]??"";try{t.push(n[1]!==void 0?JSON.parse(`"${r}"`):r)}catch{t.push(r)}}return t}function Wt(e={}){let t=e.configFile??Ee(process.env.CODEX_HOME??Ee(Ut(),".codex"),"config.toml"),o=e.previousFile??Ee(Ut(),".config","toolnet-memory","codex-notify-previous.json");Kt(Bt(t),{recursive:!0}),Kt(Bt(o),{recursive:!0});let n=Ar(t)?Mr(t,"utf8"):"",r=e.binary??"toolnet-memory",c=`notify = [${JSON.stringify(r)}, "session:codex-notify"]`,s=n.split(`
`),i=s.findIndex(d=>/^\s*\[/.test(d));i<0&&(i=s.length);let l=-1,a=-1;for(let d=0;d<i;d+=1)if(/^\s*notify\s*=/.test(s[d])){if(l=d,a=d,s[d].includes("[")&&!s[d].includes("]"))for(;a+1<i&&(a+=1,!s[a].includes("]")););break}let u=[];if(l>=0){let d=s.slice(l,a+1).join(`
`);u=Hr(d),s.splice(l,a-l+1,c)}else i=s.findIndex(d=>/^\s*\[/.test(d)),i<0&&(i=s.length),s.splice(i,0,c);let p=u.length>=2&&u[u.length-1]==="session:codex-notify";return u.length>0&&!p&&qt(o,JSON.stringify(u,null,2)+`
`,{encoding:"utf8",mode:384}),n=s.join(`
`),n.endsWith(`
`)||(n+=`
`),qt(t,n,{encoding:"utf8",mode:384}),{configFile:t,previousFile:o,preservedPrevious:u.length>0&&!p}}import{existsSync as $r,mkdirSync as _r,readFileSync as Dr,writeFileSync as Jr}from"node:fs";import{homedir as Gr}from"node:os";import{dirname as Lr,join as Qt}from"node:path";function Kr(e){return`'${e.replace(/'/g,"'\\''")}'`}function Yt(e={}){let t=e.hooksFile??Qt(process.env.CODEX_HOME??Qt(Gr(),".codex"),"hooks.json");_r(Lr(t),{recursive:!0});let o={};if($r(t))try{o=JSON.parse(Dr(t,"utf8"))}catch(i){throw new Error(`Invalid existing Codex hooks.json: ${i instanceof Error?i.message:String(i)}`)}let n=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=n;let c=(Array.isArray(n.SessionStart)?n.SessionStart:[]).filter(i=>{try{return!JSON.stringify(i).includes("session:codex-context")}catch{return!0}}),s=e.binary??"toolnet-memory";return c.push({matcher:"startup|resume|clear|compact",hooks:[{type:"command",command:`${Kr(s)} session:codex-context`,timeout:15,additionalContextLimit:1e3,statusMessage:"Loading ToolNet project continuity"}]}),n.SessionStart=c,Jr(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),t}import{existsSync as Vt,mkdirSync as qr,readFileSync as Xt,writeFileSync as Ur}from"node:fs";import{homedir as Br}from"node:os";import{dirname as Wr,join as zt}from"node:path";function Zt(e){return`'${e.replace(/'/g,"'\\''")}'`}function eo(e={}){let t=e.hooksFile??zt(process.env.CODEX_HOME??zt(Br(),".codex"),"hooks.json");qr(Wr(t),{recursive:!0});let o={};if(Vt(t))try{o=JSON.parse(Xt(t,"utf8"))}catch{throw new Error(`Invalid existing Codex hooks.json at ${t}: parse error. Not overwriting.`)}let n=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=n;let r=e.binary??"toolnet-memory",c=`${Zt(r)} session:codex-stop-hook`,s=`${Zt(r)} session:codex-session-end`,i={hooks:[{type:"command",command:c,timeout:30}]},l={hooks:[{type:"command",command:s,timeout:3}]},u=(Array.isArray(n.Stop)?n.Stop:[]).filter(I=>{try{return!JSON.stringify(I).includes("session:codex-stop-hook")}catch{return!0}}),d=(Array.isArray(n.SessionEnd)?n.SessionEnd:[]).filter(I=>{try{return!JSON.stringify(I).includes("session:codex-session-end")}catch{return!0}});n.Stop=[...u,i],n.SessionEnd=[...d,l];let g=JSON.stringify(o,null,2)+`
`,F=!Vt(t)||Xt(t,"utf8")!==g;return Ur(t,g,{encoding:"utf8",mode:384}),{hooksFile:t,changed:F,stopInstalled:!0,sessionEndInstalled:!0}}import{spawnSync as Qr}from"node:child_process";function Pe(e,t){return Qr(e,t,{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}function to(e,t){let o=Pe(e,["mcp","get",t,"--json"]);if(o.status!==0||!o.stdout)return null;try{return JSON.parse(o.stdout)}catch{return null}}function oo(e,t){return e.enabled!==!1&&e.transport?.type==="stdio"&&e.transport?.command===t&&Array.isArray(e.transport?.args)&&e.transport?.args.length===1&&e.transport.args[0]==="mcp"}function no(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.codexBinary??"codex",n=e.serverName??"toolnet-memory",r=to(o,n);if(r&&oo(r,t))return{installed:!0,changed:!1,serverName:n,command:t,args:["mcp"]};if(r){let i=Pe(o,["mcp","remove",n]);if(i.status!==0)return{installed:!1,changed:!1,serverName:n,command:t,args:["mcp"],error:(i.stderr||i.stdout||"Unable to remove old ToolNet MCP configuration.").trim()}}let c=Pe(o,["mcp","add",n,"--",t,"mcp"]);if(c.status!==0)return{installed:!1,changed:!1,serverName:n,command:t,args:["mcp"],error:(c.stderr||c.stdout||"Unable to register ToolNet MCP.").trim()};let s=to(o,n);return!s||!oo(s,t)?{installed:!1,changed:!0,serverName:n,command:t,args:["mcp"],error:"Codex accepted MCP registration but verification did not match expected ToolNet command."}:{installed:!0,changed:!0,serverName:n,command:t,args:["mcp"]}}import{existsSync as Yr,mkdirSync as Vr,readFileSync as Xr,renameSync as zr,rmSync as Zr,writeFileSync as ei}from"node:fs";import{dirname as ti}from"node:path";function _(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function oi(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function ni(e){if(!Yr(e))return{};let t;try{t=JSON.parse(Xr(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude settings.json: ${o instanceof Error?o.message:String(o)}`)}if(!_(t))throw new Error("Invalid existing Claude settings.json: root must be a JSON object.");return t}function ce(e){if(e===void 0)return[];if(!Array.isArray(e))throw new Error("Invalid existing Claude settings.json: hook event must be an array.");let t=[];for(let o of e){if(!_(o)){t.push(o);continue}let n=o.hooks;if(!Array.isArray(n)){t.push(o);continue}let r=n.filter(c=>{if(!_(c))return!0;let s=c.command;return!(typeof s=="string"&&s.includes("session:claude-hook"))});r.length!==0&&t.push({...o,hooks:r})}return t}function le(e,t=10){return{type:"command",command:e,timeout:t}}function ri(e,t){Vr(ti(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{ei(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),zr(o,e)}finally{Zr(o,{force:!0})}}function ro(e={}){let t=e.settingsFile??ot(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=ni(t),r=n.hooks;if(r!==void 0&&!_(r))throw new Error("Invalid existing Claude settings.json: hooks must be an object.");let c=_(r)?{...r}:{},s=`${oi(o)} session:claude-hook`,i=ce(c.SessionStart);i.push({matcher:"startup|resume|clear|compact",hooks:[le(s)]}),c.SessionStart=i;let l=ce(c.UserPromptSubmit);l.push({hooks:[le(s)]}),c.UserPromptSubmit=l;let a=ce(c.PostToolUse);a.push({matcher:"Edit|Write",hooks:[le(s)]}),c.PostToolUse=a;let u=ce(c.Stop);u.push({hooks:[le(s,30)]}),c.Stop=u;let p={...n,hooks:c},d=JSON.stringify(n),g=JSON.stringify(p);return d===g?{settingsFile:t,changed:!1}:e.dryRun===!0?{settingsFile:t,changed:!0,dryRun:!0}:(ri(t,p),{settingsFile:t,changed:!0})}import{existsSync as ii,mkdirSync as si,readFileSync as ci,renameSync as li,rmSync as ai,writeFileSync as ui}from"node:fs";import{dirname as pi}from"node:path";function D(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function io(e){if(!ii(e))return{};let t;try{t=JSON.parse(ci(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude Code config: ${o instanceof Error?o.message:String(o)}`)}if(!D(t))throw new Error("Invalid existing Claude Code config: root must be a JSON object.");return t}function so(e,t){if(!D(e))return!1;let o=e.args;return e.type==="stdio"&&e.command===t&&Array.isArray(o)&&o.length===1&&o[0]==="mcp"}function di(e,t){si(pi(e),{recursive:!0});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{ui(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),li(o,e)}finally{ai(o,{force:!0})}}function co(e={}){let t=e.stateFile??nt(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=io(t),c=r.mcpServers;if(c!==void 0&&!D(c))throw new Error("Invalid existing Claude Code config: mcpServers must be an object.");let s=D(c)?{...c}:{},i=s[n];if(so(i,o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:[o,"mcp"],repaired:!1};let l=i!==void 0;if(s[n]={type:"stdio",command:o,args:["mcp"]},e.dryRun===!0)return{installed:!0,changed:!0,configFile:t,serverName:n,command:[o,"mcp"],repaired:l,dryRun:!0};di(t,{...r,mcpServers:s});let u=io(t).mcpServers;if(!D(u)||!so(u[n],o))throw new Error("Claude Code MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:[o,"mcp"],repaired:l}}function lo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=ro({binary:t,settingsFile:e.settingsFile,...e.dryRun!==void 0?{dryRun:e.dryRun}:{}}),n=co({binary:t,stateFile:e.stateFile,...e.dryRun!==void 0?{dryRun:e.dryRun}:{}});return{hooks:o,mcp:n,files:[o.settingsFile,n.configFile]}}import{existsSync as gi,mkdirSync as fi,readFileSync as mi,renameSync as yi,rmSync as hi,writeFileSync as ki}from"node:fs";import{dirname as Ii}from"node:path";var P="ToolNet Memory - ";function po(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function bi(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function ao(e){if(!gi(e))return{};let t=mi(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro hooks file at ${e}: parse error. Not overwriting.`)}if(!po(o))throw new Error(`Invalid existing Kiro hooks file at ${e}: root must be a JSON object. Not overwriting.`);return o}function uo(e){return po(e)?typeof e.name=="string"&&e.name.startsWith(P):!1}function J(e){return{type:"command",command:e}}function Oi(e){return[{name:`${P}Session Start`,description:"Inject compact local ToolNet continuity and capture Kiro session activation.",trigger:"SessionStart",action:J(e),timeout:10,enabled:!0},{name:`${P}Prompt Continuity`,description:"Capture prompts and refresh ToolNet guidance only for resume/continue requests.",trigger:"UserPromptSubmit",action:J(e),timeout:10,enabled:!0},{name:`${P}Raw History Guard`,description:"Prevent Kiro from reconstructing continuity from raw ToolNet/agent session history.",trigger:"PreToolUse",matcher:"*",action:J(e),timeout:10,enabled:!0},{name:`${P}Tool Capture`,description:"Capture durable tool activity while filtering noisy read-only events.",trigger:"PostToolUse",matcher:"*",action:J(e),timeout:15,enabled:!0},{name:`${P}Final Flush`,description:"Flush pending Kiro WAL events when the assistant finishes a turn.",trigger:"Stop",action:J(e),timeout:30,enabled:!0}]}function ji(e,t){fi(Ii(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{ki(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),yi(o,e)}finally{hi(o,{force:!0})}}function ae(e,t,o){let n=ao(e);if(n.version!==void 0&&n.version!=="v1")throw new Error(`Unsupported existing Kiro hooks version: ${String(n.version)}`);let r=n.hooks;if(r!==void 0&&!Array.isArray(r))throw new Error("Invalid existing Kiro hooks file: hooks must be an array.");let c=Array.isArray(r)?r.filter(a=>!uo(a)):[],s=Oi(t),i={...n,version:"v1",hooks:[...c,...s]};if(!o&&JSON.stringify(n)===JSON.stringify(i))return{changed:!1,hookCount:s.length};ji(e,i);let l=ao(e);if(l.version!=="v1"||!Array.isArray(l.hooks)||l.hooks.filter(uo).length!==s.length)throw new Error("Kiro hooks were written but verification failed.");return{changed:!0,hookCount:s.length}}function go(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=`${bi(t)} session:kiro-hook`;if(e.hooksFile){let s=ae(e.hooksFile,n,e.force??!1);return{hooksFile:e.hooksFile,...s}}if(o==="both"){let s=be(),i=Oe({cwd:e.cwd}),l=ae(s,n,e.force??!1),a=ae(i,n,e.force??!1);return{hooksFile:s,changed:l.changed||a.changed,hookCount:l.hookCount}}let r=o==="project"?Oe({cwd:e.cwd}):be(),c=ae(r,n,e.force??!1);return{hooksFile:r,...c}}import{existsSync as wi,mkdirSync as Ci,readFileSync as Si,renameSync as xi,rmSync as vi,writeFileSync as Fi}from"node:fs";import{dirname as Ri}from"node:path";function G(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function fo(e){if(!wi(e))return{};let t=Si(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro MCP config at ${e}: parse error. Not overwriting.`)}if(!G(o))throw new Error(`Invalid existing Kiro MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function mo(e,t){return G(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&e.disabled===!1:!1}function Ei(e,t){Ci(Ri(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Fi(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),xi(o,e)}finally{vi(o,{force:!0})}}function ue(e,t,o,n){let r=fo(e),c=r.mcpServers;if(c!==void 0&&!G(c))throw new Error(`Invalid existing Kiro MCP config: mcpServers must be an object in ${e}.`);let s=G(c)?{...c}:{},i=s[o];if(mo(i,t)&&!n)return{installed:!0,changed:!1};s[o]={command:t,args:["mcp"],disabled:!1};let l={...r,mcpServers:s};Ei(e,l);let u=fo(e).mcpServers;if(!G(u)||!mo(u[o],t))throw new Error(`Kiro MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function yo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",n=e.scope??"global";if(e.configFile)return{...ue(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(n==="both"){let s=Q(),i=Ie({cwd:e.cwd}),l=ue(s,t,o,e.force??!1),a=ue(i,t,o,e.force??!1);return{installed:!0,changed:l.changed||a.changed,configFile:s,serverName:o,command:t,args:["mcp"]}}let r=n==="project"?Ie({cwd:e.cwd}):Q();return{...ue(r,t,o,e.force??!1),configFile:r,serverName:o,command:t,args:["mcp"]}}function ho(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=yo({binary:t,configFile:e.configFile,scope:e.scope,cwd:e.cwd,force:e.force}),n=go({binary:t,hooksFile:e.hooksFile,scope:e.scope,cwd:e.cwd,force:e.force});return{installed:o.installed,changed:o.changed||n.changed,mcp:o,hooks:n,files:[o.configFile,n.hooksFile]}}import{existsSync as Pi,mkdirSync as Ni,readFileSync as Ti,renameSync as Ai,rmSync as Mi,writeFileSync as Hi}from"node:fs";import{dirname as $i}from"node:path";function Ne(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function _i(e){if(!Pi(e))return{};let t=Ti(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: parse error. Not overwriting.`)}if(!Ne(o))throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Di(e,t){Ni($i(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Hi(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Ai(o,e)}finally{Mi(o,{force:!0})}}function ko(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??st({cwd:e.cwd}),n=_i(o),r="toolnet-memory";if(Ne(n.mcpServers)&&n.mcpServers[r]!=null&&!e.force)return{installed:!0,changed:!1,configFile:o};let s=Ne(n.mcpServers)?{...n.mcpServers}:{};return s[r]={command:t,args:["mcp"]},n.mcpServers=s,Di(o,n),{installed:!0,changed:!0,configFile:o}}function Io(e={}){let t=e.binary??"toolnet-memory",o=ko({binary:t,configFile:e.configFile,force:e.force,cwd:e.cwd});return{installed:o.installed,changed:o.changed,mcp:{...o,configured:o.installed},files:[o.configFile]}}import{mkdirSync as Wi,existsSync as Qi}from"node:fs";import{dirname as Yi}from"node:path";import{existsSync as Ji,mkdirSync as Gi,readFileSync as Li,renameSync as Ki,rmSync as qi,writeFileSync as Ui}from"node:fs";import{dirname as Bi}from"node:path";function m(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function C(e,t){if(!Ji(e))return{};let o=Li(e,"utf8").trim();if(!o)return{};let n;try{n=JSON.parse(o)}catch(r){throw new Error(`Invalid existing ${t} MCP config: ${r instanceof Error?r.message:String(r)}`)}if(!m(n))throw new Error(`Invalid existing ${t} MCP config: root must be a JSON object.`);return n}function N(e,t){Gi(Bi(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Ui(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Ki(o,e)}finally{qi(o,{force:!0})}}function bo(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??Ce(),n=Yi(o);Qi(n)||Wi(n,{recursive:!0});let r=C(o,"Kilo"),c=r.mcp;if(c!==void 0&&!m(c))throw new Error("Invalid existing Kilo config: mcp must be an object.");let s=m(c)?{...c}:{},i="toolnet-memory";return m(s[i])&&!e.force?{installed:!0,changed:!1,configFile:o,configured:!0}:(s[i]={type:"local",command:[t,"mcp"],enabled:!0,timeout:1e4},N(o,{...r,mcp:s}),{installed:!0,changed:!0,configFile:o,configured:!0})}function Oo(e={}){let t=e.binary??"toolnet-memory",o=bo({binary:t,configFile:e.configFile,force:e.force});return{installed:o.installed,changed:o.changed,mcp:o,files:[o.configFile]}}import{existsSync as Vi,mkdirSync as Xi,readFileSync as zi,renameSync as Zi,rmSync as es,writeFileSync as ts}from"node:fs";import{dirname as os}from"node:path";function f(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function O(e,t){if(!Vi(e))return{};let o=zi(e,"utf8").trim();if(!o)return{};let n;try{n=JSON.parse(o)}catch(r){throw new Error(`Invalid existing ${t} hooks file: ${r instanceof Error?r.message:String(r)}`)}if(!f(n))throw new Error(`Invalid existing ${t} hooks file: root must be a JSON object.`);return n}function T(e,t){Xi(os(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{ts(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Zi(o,e)}finally{es(o,{force:!0})}}function Te(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}var L=[["sessionStart",10],["beforeSubmitPrompt",10],["preToolUse",10],["postToolUse",15],["afterAgentResponse",15],["stop",30]];function jo(e){return f(e)&&typeof e.command=="string"&&e.command.includes("session:cursor-hook")}function ns(e,t,o){let r={type:"command",command:`TOOLNET_HOOK_EVENT=${Te(e)} ${Te(t)} session:cursor-hook`,timeout:o};return e==="preToolUse"&&(r.matcher=".*"),r}function Ae(e={}){let t=e.hooksFile??X(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=O(t,"Cursor");if(n.version!==void 0&&n.version!==1)throw new Error(`Unsupported existing Cursor hooks version: ${String(n.version)}`);let r=n.hooks;if(r!==void 0&&!f(r))throw new Error("Invalid existing Cursor hooks file: hooks must be an object.");let c=f(r)?{...r}:{};for(let[a,u]of L){let p=c[a];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing Cursor hooks file: hooks.${a} must be an array.`);let d=Array.isArray(p)?p.filter(g=>!jo(g)):[];c[a]=[...d,ns(a,o,u)]}let s={...n,version:1,hooks:c};if(JSON.stringify(n)===JSON.stringify(s))return{hooksFile:t,changed:!1,hookCount:L.length};T(t,s);let i=O(t,"Cursor");if(i.version!==1||!f(i.hooks))throw new Error("Cursor hooks were written but verification failed.");let l=0;for(let[a]of L){let u=i.hooks[a];if(!Array.isArray(u))throw new Error("Cursor hooks were written but verification failed.");l+=u.filter(jo).length}if(l!==L.length)throw new Error("Cursor hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:L.length}}function wo(e,t){return m(e)?(e.type===void 0||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function Me(e={}){let t=e.configFile??V(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=C(t,"Cursor"),c=r.mcpServers;if(c!==void 0&&!m(c))throw new Error("Invalid existing Cursor MCP config: mcpServers must be an object.");let s=m(c)?{...c}:{};if(wo(s[n],o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};s[n]={type:"stdio",command:o,args:["mcp"]},N(t,{...r,mcpServers:s});let l=C(t,"Cursor").mcpServers;if(!m(l)||!wo(l[n],o))throw new Error("Cursor MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}import{mkdirSync as rs,readFileSync as Co,renameSync as is,rmSync as ss,writeFileSync as cs}from"node:fs";import{dirname as ls}from"node:path";var He=`---
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
`;function as(e,t){rs(ls(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{cs(o,t,{encoding:"utf8",mode:384}),is(o,e)}finally{ss(o,{force:!0})}}function So(e){let t=e.ruleFile??dt(e.projectRoot);try{if(Co(t,"utf8")===He)return{ruleFile:t,changed:!1}}catch{}if(as(t,He),Co(t,"utf8")!==He)throw new Error("Cursor ToolNet project rule was written but verification failed.");return{ruleFile:t,changed:!0}}import{spawnSync as us}from"node:child_process";import{existsSync as A,statSync as ps}from"node:fs";import{dirname as ds,join as gs,parse as fs,resolve as _e}from"node:path";function xo(e){let t=_e(e);if(!A(t))throw new Error(`Project path does not exist: ${t}`);if(!ps(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);return t}function pe(e){return gs(e,".toolnet","project.json")}function ms(e){let t=_e(e),o=fs(t).root;for(;;){if(A(pe(t)))return t;if(t===o)return;let n=ds(t);if(n===t)return;t=n}}function $e(e){let t=us("git",["rev-parse","--show-toplevel"],{cwd:e,encoding:"utf8",timeout:5e3});if(t.status!==0)return;let o=t.stdout.trim();return o?_e(o):void 0}function j(e={}){let t=xo(e.cwd??process.cwd());if(e.project){let r=xo(e.project),c=pe(r),s=$e(r);return{root:r,source:"explicit",eligible:!0,toolnetProject:A(c),manifestFile:A(c)?c:void 0,gitRoot:s}}let o=ms(t);if(o){let r=pe(o);return{root:o,source:"toolnet",eligible:!0,toolnetProject:!0,manifestFile:r,gitRoot:$e(o)}}let n=$e(t);if(n){let r=pe(n);return{root:n,source:"git",eligible:!0,toolnetProject:A(r),manifestFile:A(r)?r:void 0,gitRoot:n}}return{root:t,source:"cwd",eligible:!1,toolnetProject:!1}}function Eo(e,t={}){let o=[],n=e.indexOf("--scope");if(n>=0){let c=e[n+1];if(c!=="global"&&c!=="project"&&c!=="both")throw new Error(`Invalid --scope value: ${String(c)}`);o.push(c)}e.includes("--global")&&o.push("global"),e.includes("--both")&&o.push("both");let r=Array.from(new Set(o));if(r.length>1)throw new Error(`Conflicting integration scopes: ${r.join(", ")}`);return r[0]??t.defaultScope??"global"}function vo(e,t){return{install:e,effective:t}}function w(e,t){return{surface:e,global:vo(t.globalInstall,t.effective==="global"||t.effective==="both"),project:vo(t.projectInstall,t.effective==="project"||t.effective==="both"),effective:t.effective,risk:t.risk??"none",dedupeRequired:t.dedupeRequired??!1,trustRequired:t.trustRequired??t.projectInstall,note:t.note}}function ys(e){return{mcp:w("mcp",{globalInstall:!0,projectInstall:!1,effective:"global"}),hooks:w("hooks",{globalInstall:!0,projectInstall:!1,effective:"global"}),work:w("work",{globalInstall:e==="grok",projectInstall:!1,effective:e==="grok"?"global":"none",note:e==="grok"?"Grok supports a global ToolNet continuity skill.":"Cursor/Copilot work instructions remain project-scoped."})}}function Fo(e){return{mcp:w("mcp",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),hooks:w("hooks",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),work:w("work",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!1,note:e==="cursor"?"Use .cursor/rules/toolnet-memory.mdc.":e==="copilot"?"Use .github/instructions/toolnet-memory.instructions.md.":"Use .grok/skills/toolnet-continuity/SKILL.md."})}}function Ro(e){return{mcp:w("mcp",{globalInstall:!0,projectInstall:!0,effective:"project",risk:e==="cursor"?"precedence-unverified":"shadowed-global",trustRequired:!0,note:e==="cursor"?"Project ToolNet MCP is the intended effective definition; native same-name precedence must be E2E certified before release.":"Global remains useful outside the project; same-name project definition wins inside the project."}),hooks:w("hooks",{globalInstall:!0,projectInstall:!0,effective:"both",risk:"additive-duplicate",dedupeRequired:!0,trustRequired:!0,note:"Global and project hook sources can both execute for the same native event."}),work:w("work",{globalInstall:e==="grok",projectInstall:!0,effective:"project",risk:e==="grok"?"shadowed-global":"none",trustRequired:!1,note:e==="cursor"?"Project rule is authoritative.":e==="copilot"?"Project instruction is authoritative.":"Project skill shadows the same-name global skill inside the project."})}}function M(e){let{agent:t,scope:o,project:n}=e;return(o==="project"||o==="both")&&(!n||!n.eligible)?{agent:t,requestedScope:o,project:n,surfaces:o==="both"?Ro(t):Fo(t),canInstall:!1,reason:"Project scope requires an explicit project, existing ToolNet project, or Git repository root."}:{agent:t,requestedScope:o,project:n,surfaces:o==="global"?ys(t):o==="project"?Fo(t):Ro(t),canInstall:!0}}function Po(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.rule?.changed)}function No(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=o==="global"?void 0:j({project:e.projectRoot}),r=M({agent:"cursor",scope:o,project:n});if(!r.canInstall)throw new Error(r.reason??"Cursor project integration scope cannot be resolved.");let c,s;if((r.surfaces.mcp.global.install||r.surfaces.hooks.global.install||r.surfaces.work.global.install)&&(c={},r.surfaces.mcp.global.install&&(c.mcp=Me({binary:t,configFile:e.configFile??V()})),r.surfaces.hooks.global.install&&(c.hooks=Ae({binary:t,hooksFile:e.hooksFile??X()}))),r.surfaces.mcp.project.install||r.surfaces.hooks.project.install||r.surfaces.work.project.install){if(!n?.eligible)throw new Error("Cursor project integration requires an eligible project root.");s={},r.surfaces.mcp.project.install&&(s.mcp=Me({binary:t,configFile:e.projectConfigFile??ut(n.root)})),r.surfaces.hooks.project.install&&(s.hooks=Ae({binary:t,hooksFile:e.projectHooksFile??pt(n.root)})),r.surfaces.work.project.install&&(s.rule=So({projectRoot:n.root,ruleFile:e.projectRuleFile}))}let i=s?.mcp??c?.mcp,l=s?.hooks??c?.hooks;if(!i||!l)throw new Error("Cursor integration did not produce an effective MCP/hooks installation.");let a=Array.from(new Set([c?.mcp?.configFile,c?.hooks?.hooksFile,c?.rule?.ruleFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.rule?.ruleFile].filter(u=>typeof u=="string")));return{installed:!0,changed:Po(c)||Po(s),scope:o,plan:r,project:n,global:c,projectScope:s,mcp:i,hooks:l,rule:s?.rule,files:a}}var K=[["sessionStart",10],["userPromptSubmitted",10],["userPromptTransformed",10],["preToolUse",10],["postToolUse",15],["agentStop",30]];function hs(e){if(typeof e.command=="string")return e.command;if(typeof e.bash=="string")return e.bash}function To(e){return f(e)&&hs(e)?.includes("session:copilot-hook")===!0}function ks(e,t,o){let n={type:"command",command:`${t} session:copilot-hook`,env:{TOOLNET_HOOK_EVENT:e},timeoutSec:o};return e==="preToolUse"&&(n.matcher=".*"),n}function De(e={}){let t=e.hooksFile??Z(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=O(t,"GitHub Copilot CLI");if(n.version!==void 0&&n.version!==1)throw new Error(`Unsupported existing GitHub Copilot CLI hooks version: ${String(n.version)}`);let r=n.hooks;if(r!==void 0&&!f(r))throw new Error("Invalid existing GitHub Copilot CLI hooks file: hooks must be an object.");let c=f(r)?{...r}:{};for(let[a,u]of K){let p=c[a];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing GitHub Copilot CLI hooks file: hooks.${a} must be an array.`);let d=Array.isArray(p)?p.filter(g=>!To(g)):[];c[a]=[...d,ks(a,o,u)]}let s={...n,version:1,hooks:c};if(JSON.stringify(n)===JSON.stringify(s))return{hooksFile:t,changed:!1,hookCount:K.length};T(t,s);let i=O(t,"GitHub Copilot CLI");if(i.version!==1||!f(i.hooks))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");let l=0;for(let[a]of K){let u=i.hooks[a];if(!Array.isArray(u))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");l+=u.filter(To).length}if(l!==K.length)throw new Error("GitHub Copilot CLI hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:K.length}}function Ao(e,t){return m(e)?(e.type===void 0||e.type==="local"||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&Array.isArray(e.tools)&&e.tools.length===1&&e.tools[0]==="*":!1}function Je(e={}){let t=e.configFile??z(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=C(t,"GitHub Copilot CLI"),c=r.mcpServers;if(c!==void 0&&!m(c))throw new Error("Invalid existing GitHub Copilot CLI MCP config: mcpServers must be an object.");let s=m(c)?{...c}:{};if(Ao(s[n],o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};s[n]={type:"stdio",command:o,args:["mcp"],tools:["*"]},N(t,{...r,mcpServers:s});let l=C(t,"GitHub Copilot CLI").mcpServers;if(!m(l)||!Ao(l[n],o))throw new Error("GitHub Copilot CLI MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}import{mkdirSync as Is,readFileSync as Mo,renameSync as bs,rmSync as Os,writeFileSync as js}from"node:fs";import{dirname as ws}from"node:path";var Ge=`---
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
`;function Cs(e,t){Is(ws(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{js(o,t,{encoding:"utf8",mode:384}),bs(o,e)}finally{Os(o,{force:!0})}}function Ho(e){let t=e.instructionFile??yt(e.projectRoot);try{if(Mo(t,"utf8")===Ge)return{instructionFile:t,changed:!1}}catch{}if(Cs(t,Ge),Mo(t,"utf8")!==Ge)throw new Error("Copilot ToolNet project instruction verification failed.");return{instructionFile:t,changed:!0}}function $o(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.instruction?.changed)}function _o(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=o==="global"?void 0:j({project:e.projectRoot}),r=M({agent:"copilot",scope:o,project:n});if(!r.canInstall)throw new Error(r.reason??"Copilot project integration scope cannot be resolved.");let c,s;if((r.surfaces.mcp.global.install||r.surfaces.hooks.global.install||r.surfaces.work.global.install)&&(c={},r.surfaces.mcp.global.install&&(c.mcp=Je({binary:t,configFile:e.configFile??z()})),r.surfaces.hooks.global.install&&(c.hooks=De({binary:t,hooksFile:e.hooksFile??Z()}))),r.surfaces.mcp.project.install||r.surfaces.hooks.project.install||r.surfaces.work.project.install){if(!n?.eligible)throw new Error("Copilot project integration requires an eligible project root.");s={},r.surfaces.mcp.project.install&&(s.mcp=Je({binary:t,configFile:e.projectConfigFile??ft(n.root)})),r.surfaces.hooks.project.install&&(s.hooks=De({binary:t,hooksFile:e.projectHooksFile??mt(n.root)})),r.surfaces.work.project.install&&(s.instruction=Ho({projectRoot:n.root,instructionFile:e.projectInstructionFile}))}let i=s?.mcp??c?.mcp,l=s?.hooks??c?.hooks;if(!i||!l)throw new Error("Copilot integration did not produce effective MCP/hooks.");let a=Array.from(new Set([c?.mcp?.configFile,c?.hooks?.hooksFile,c?.instruction?.instructionFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.instruction?.instructionFile].filter(u=>typeof u=="string")));return{installed:!0,changed:$o(c)||$o(s),scope:o,plan:r,project:n,global:c,projectScope:s,mcp:i,hooks:l,instruction:s?.instruction,files:a}}import{existsSync as Ss,mkdirSync as xs,readFileSync as Do,renameSync as vs,rmSync as Fs,writeFileSync as Rs}from"node:fs";import{dirname as Es}from"node:path";var Le=`---
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
`;function Ps(e,t){xs(Es(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Rs(o,t,{encoding:"utf8",mode:384}),vs(o,e)}finally{Fs(o,{force:!0})}}function Ke(e={}){let t=e.skillFile??ne();if(Ss(t)&&Do(t,"utf8")===Le)return{skillFile:t,changed:!1};if(Ps(t,Le),Do(t,"utf8")!==Le)throw new Error("Grok ToolNet continuity skill was written but verification failed.");return{skillFile:t,changed:!0}}var q=[["SessionStart",10],["UserPromptSubmit",10],["PreToolUse",10],["PostToolUse",15],["Stop",30]];function Jo(e){return!f(e)||!Array.isArray(e.hooks)?!1:e.hooks.some(t=>f(t)&&typeof t.command=="string"&&t.command.includes("session:grok-hook"))}function Ns(e,t,o){let n={hooks:[{type:"command",command:`${t} session:grok-hook`,timeout:o,env:{TOOLNET_HOOK_EVENT:e}}]};return e==="PreToolUse"&&(n.matcher=".*"),n}function qe(e={}){let t=e.hooksFile??oe(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=O(t,"Grok Build"),r=n.hooks;if(r!==void 0&&!f(r))throw new Error("Invalid existing Grok Build hooks file: hooks must be an object.");let c=f(r)?{...r}:{};for(let[a,u]of q){let p=c[a];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing Grok Build hooks file: hooks.${a} must be an array.`);let d=Array.isArray(p)?p.filter(g=>!Jo(g)):[];c[a]=[...d,Ns(a,o,u)]}let s={...n,hooks:c};if(JSON.stringify(n)===JSON.stringify(s))return{hooksFile:t,changed:!1,hookCount:q.length};T(t,s);let i=O(t,"Grok Build");if(!f(i.hooks))throw new Error("Grok Build hooks were written but verification failed.");let l=0;for(let[a]of q){let u=i.hooks[a];if(!Array.isArray(u))throw new Error("Grok Build hooks were written but verification failed.");l+=u.filter(Jo).length}if(l!==q.length)throw new Error("Grok Build hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:q.length}}import{existsSync as Ts,mkdirSync as As,readFileSync as Ms,renameSync as Hs,rmSync as $s,writeFileSync as _s}from"node:fs";import{dirname as Ds}from"node:path";function Go(e){return Ts(e)?Ms(e,"utf8"):""}function Js(e,t){As(Ds(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{_s(o,t,{encoding:"utf8",mode:384}),Hs(o,e)}finally{$s(o,{force:!0})}}function Ue(e){return e.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t")}function Gs(e){return`[mcp_servers."${Ue(e)}"]`}function Ls(e,t){return[Gs(e),`command = "${Ue(t)}"`,'args = ["mcp"]',"enabled = true"].join(`
`)}function Ks(e){let t=e.trim();return t.startsWith("[")&&t.includes("]")}function de(e){return e.trim().replace(/\s+/g,"")}function qs(e){return new Set([de(`[mcp_servers.${e}]`),de(`[mcp_servers."${e}"]`),de(`[mcp_servers.'${e}']`)])}function Ko(e,t){let o=e.split(/\r?\n/),n=qs(t),r=-1;for(let u=0;u<o.length;u+=1){let p=de(o[u].replace(/\s+#.*$/,""));if(n.has(p)){r=u;break}}if(r<0)return null;let c=o.length;for(let u=r+1;u<o.length;u+=1)if(Ks(o[u])){c=u;break}let s=[],i=0;for(let u of o)s.push(i),i+=u.length+1;let l=s[r]??0,a=c>=o.length?e.length:s[c]??e.length;return{start:l,end:a}}function Us(e,t,o){let n=`${Ls(t,o)}
`,r=Ko(e,t);if(r){let c=e.slice(0,r.start),s=e.slice(r.end);return`${c}${n}${s.replace(/^\n+/,"")}`}return e.trim()?`${e.replace(/\s*$/,"")}

${n}`:n}function Lo(e,t,o){let n=Ko(e,t);if(!n)return!1;let r=e.slice(n.start,n.end);return r.includes(`command = "${Ue(o)}"`)&&/args\s*=\s*\[\s*"mcp"\s*\]/.test(r)&&/enabled\s*=\s*true/.test(r)}function Be(e={}){let t=e.configFile??te(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=Go(t);if(Lo(r,n,o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};let c=Us(r,n,o);Js(t,c);let s=Go(t);if(!Lo(s,n,o))throw new Error("Grok Build MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}function qo(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.skill?.changed)}function Uo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=o==="global"?void 0:j({project:e.projectRoot}),r=M({agent:"grok",scope:o,project:n});if(!r.canInstall)throw new Error(r.reason??"Grok project integration scope cannot be resolved.");let c,s;if((r.surfaces.mcp.global.install||r.surfaces.hooks.global.install||r.surfaces.work.global.install)&&(c={},r.surfaces.mcp.global.install&&(c.mcp=Be({binary:t,configFile:e.configFile??te()})),r.surfaces.hooks.global.install&&(c.hooks=qe({binary:t,hooksFile:e.hooksFile??oe()})),r.surfaces.work.global.install&&(c.skill=Ke({skillFile:e.skillFile??ne()}))),r.surfaces.mcp.project.install||r.surfaces.hooks.project.install||r.surfaces.work.project.install){if(!n?.eligible)throw new Error("Grok project integration requires an eligible project root.");s={},r.surfaces.mcp.project.install&&(s.mcp=Be({binary:t,configFile:e.projectConfigFile??kt(n.root)})),r.surfaces.hooks.project.install&&(s.hooks=qe({binary:t,hooksFile:e.projectHooksFile??It(n.root)})),r.surfaces.work.project.install&&(s.skill=Ke({skillFile:e.projectSkillFile??bt(n.root)}))}let i=s?.mcp??c?.mcp,l=s?.hooks??c?.hooks,a=s?.skill??c?.skill;if(!i||!l||!a)throw new Error("Grok integration did not produce effective MCP/hooks/skill.");let u=Array.from(new Set([c?.mcp?.configFile,c?.hooks?.hooksFile,c?.skill?.skillFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.skill?.skillFile].filter(p=>typeof p=="string")));return{installed:!0,changed:qo(c)||qo(s),scope:o,plan:r,project:n,global:c,projectScope:s,mcp:i,hooks:l,skill:a,files:u}}import{existsSync as Yo,mkdirSync as dp,readFileSync as Vo,renameSync as gp,rmSync as fp,writeFileSync as Qs}from"node:fs";import{homedir as Bs}from"node:os";import{join as Bo}from"node:path";function Ws(e="toolnet-memory",t={}){return Bo(t.home??Bs(),".agents","plugins",e)}function Wo(e="toolnet-memory",t={}){return Bo(Ws(e,t),"hooks","hooks.json")}function Qo(e){return`'${e.replace(/'/g,"'\\''")}'`}function Ys(e){if(!Yo(e))return{};let t;try{t=JSON.parse(Vo(e,"utf8"))}catch{throw new Error(`Invalid existing Goose hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Goose hooks.json at ${e}: root must be a JSON object.`);return t}function Xo(e={}){let t=e.pluginName??"toolnet-memory",o=e.hooksFile??Wo(t),n=Ys(o),r=e.binary??"toolnet-memory",c=`${Qo(r)} session:goose-hook`,s=`${Qo(r)} session:goose-hook`,i={type:"command",command:c,timeout:30},l={type:"command",command:s,timeout:3},a=n.hooks&&typeof n.hooks=="object"&&!Array.isArray(n.hooks)?n.hooks:{};n.hooks=a;let p=(Array.isArray(a.Stop)?a.Stop:[]).filter(ge=>{try{return!JSON.stringify(ge).includes("session:goose-hook")}catch{return!0}}),g=(Array.isArray(a.SessionEnd)?a.SessionEnd:[]).filter(ge=>{try{return!JSON.stringify(ge).includes("session:goose-hook")}catch{return!0}});a.Stop=[...p,{hooks:[i]}],a.SessionEnd=[...g,{hooks:[l]}];let F=JSON.stringify(n,null,2)+`
`,I=!Yo(o)||Vo(o,"utf8")!==F;return Qs(o,F,{encoding:"utf8",mode:384}),{hooksFile:o,changed:I,stopInstalled:!0,sessionEndInstalled:!0}}function zo(e={}){let t=Xo(e);return{hooksFile:t.hooksFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as on,mkdirSync as Xs,readFileSync as nn,renameSync as zs,rmSync as Zs,writeFileSync as ec}from"node:fs";import{dirname as tc}from"node:path";import{homedir as Vs}from"node:os";import{join as Zo}from"node:path";function en(e={}){let t=e.projectRoot;return t?Zo(t,".qwen","hooks.json"):Zo(e.home??Vs(),".qwen","hooks.json")}function tn(e){return`'${e.replace(/'/g,"'\\''")}'`}function oc(e){if(!on(e))return{};let t;try{t=JSON.parse(nn(e,"utf8"))}catch{throw new Error(`Invalid existing Qwen hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Qwen hooks.json at ${e}: root must be a JSON object.`);return t}function nc(e,t){Xs(tc(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{ec(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),zs(o,e)}finally{Zs(o,{force:!0})}}function rn(e={}){let t=e.hooksFile??en({projectRoot:e.projectRoot}),o=oc(t),n=e.binary??"toolnet-memory",r=`${tn(n)} session:qwen-hook`,c=`${tn(n)} session:qwen-hook`,s={type:"command",command:r,timeout:30},i={type:"command",command:c,timeout:3},l=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=l;let u=(Array.isArray(l.Stop)?l.Stop:[]).filter(I=>{try{return!JSON.stringify(I).includes("session:qwen-hook")}catch{return!0}}),d=(Array.isArray(l.SessionEnd)?l.SessionEnd:[]).filter(I=>{try{return!JSON.stringify(I).includes("session:qwen-hook")}catch{return!0}});l.Stop=[...u,{hooks:[s]}],l.SessionEnd=[...d,{hooks:[i]}];let g=JSON.stringify(o,null,2)+`
`,F=!on(t)||nn(t,"utf8")!==g;return nc(t,o),{hooksFile:t,changed:F,stopInstalled:!0,sessionEndInstalled:!0}}function sn(e={}){let t=rn(e);return{hooksFile:t.hooksFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as un,mkdirSync as sc,readFileSync as cc,renameSync as lc,rmSync as ac,writeFileSync as uc}from"node:fs";import{dirname as pc}from"node:path";import{homedir as rc}from"node:os";import{join as ic}from"node:path";function cn(e={}){return ic(e.home??rc(),".kimi-code","config.toml")}function ln(e){return`'${e.replace(/'/g,"'\\''")}'`}function dc(e){return un(e)?cc(e,"utf8"):""}function an(e,t){sc(pc(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{uc(o,t,{encoding:"utf8",mode:384}),lc(o,e)}finally{ac(o,{force:!0})}}function pn(e={}){let t=e.configFile??cn(),o=dc(t),n=e.binary??"toolnet-memory",r=`${ln(n)} session:kimi-hook`,c=`${ln(n)} session:kimi-hook`,s=`[[hooks]]
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
`,l=!0),l?an(t,o):un(t)||(an(t,s+`
`+i+`
`),l=!0),{configFile:t,changed:l,stopInstalled:!0,sessionEndInstalled:!0}}function dn(e={}){let t=pn(e);return{configFile:t.configFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as fn,mkdirSync as mc,readFileSync as yc,renameSync as hc,rmSync as kc,writeFileSync as Ic}from"node:fs";import{dirname as bc}from"node:path";import{homedir as gc}from"node:os";import{join as fc}from"node:path";function gn(e={}){return fc(e.home??gc(),".hermes","config.yaml")}function Oc(e){return`'${e.replace(/'/g,"'\\''")}'`}function jc(e){return fn(e)?yc(e,"utf8"):""}function wc(e,t){mc(bc(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Ic(o,t,{encoding:"utf8",mode:384}),hc(o,e)}finally{kc(o,{force:!0})}}function mn(e={}){let t=e.configFile??gn(),o=jc(t),n=e.binary??"toolnet-memory",c=`  - name: toolnet-memory-session-end
    event: on_session_end
    command: ${`${Oc(n)} session:hermes-hook`}
    timeout: 30
`,s=!1;return o.includes("toolnet-memory-session-end")||(o.includes("hooks:")?o=o.replace(/hooks:\n/,`hooks:
${c}`):o=o.trim()+`

hooks:
`+c,s=!0),(s||!fn(t))&&(o.endsWith(`
`)||(o+=`
`),wc(t,o)),{configFile:t,changed:s,sessionEndInstalled:!0}}function yn(e={}){let t=mn(e);return{configFile:t.configFile,changed:t.changed,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as In,mkdirSync as xc,readFileSync as bn,renameSync as vc,rmSync as Fc,writeFileSync as Rc}from"node:fs";import{dirname as Ec}from"node:path";import{existsSync as Cc}from"node:fs";import{homedir as Sc}from"node:os";import{join as We}from"node:path";function hn(e={}){let t=e.home??Sc();return Cc(We(t,".qoder-cn"))?We(t,".qoder-cn","settings.json"):We(t,".qoder","settings.json")}function kn(e){return`'${e.replace(/'/g,"'\\''")}'`}function Pc(e){if(!In(e))return{};let t;try{t=JSON.parse(bn(e,"utf8"))}catch{throw new Error(`Invalid existing Qoder settings.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Qoder settings.json at ${e}: root must be a JSON object.`);return t}function Nc(e,t){xc(Ec(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Rc(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),vc(o,e)}finally{Fc(o,{force:!0})}}function On(e={}){let t=e.settingsFile??hn(),o=Pc(t),n=e.binary??"toolnet-memory",r=`${kn(n)} session:qoder-hook`,c=`${kn(n)} session:qoder-hook`,s={type:"command",command:r,timeout:30},i={type:"command",command:c,timeout:3},l=Array.isArray(o.hooks)?[...o.hooks]:[],u=l.filter(g=>{try{return!JSON.stringify(g).includes("session:qoder-hook")}catch{return!0}}).filter(g=>{try{return!JSON.stringify(g).includes("session:qoder-hook")}catch{return!0}});l.length=0,l.push({...s,event:"Stop"},{...i,event:"SessionEnd"}),o.hooks=l;let p=JSON.stringify(o,null,2)+`
`,d=!In(t)||bn(t,"utf8")!==p;return Nc(t,o),{settingsFile:t,changed:d,stopInstalled:!0,sessionEndInstalled:!0}}function jn(e={}){let t=On(e);return{settingsFile:t.settingsFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}function wn(e={}){if(e.scope==="global")return{scope:"global",automatic:!1,reason:"explicit-global"};if(e.scope==="project"||e.scope==="both"){let o=j({cwd:e.cwd,project:e.projectRoot});if(!o.eligible)throw new Error(`Explicit ${e.scope} integration requires an explicit project, ToolNet project, or Git repository root.`);return{scope:e.scope,automatic:!1,project:o,reason:e.scope==="project"?"explicit-project":"explicit-both"}}let t=j({cwd:e.cwd,project:e.projectRoot});return t.toolnetProject?{scope:"both",automatic:!0,project:t,reason:"toolnet-project"}:{scope:"global",automatic:!0,reason:"no-toolnet-project"}}function Cn(){return Ct()}function Tc(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[],n=e.detections??Cn(),r=new Map(n.map(s=>[s.agent,s.detected])),c=wn({scope:e.scope,projectRoot:e.projectRoot,cwd:e.cwd});if(!(e.force===!0||r.get("agy")===!0))o.push({agent:"agy",detected:!1,installed:!1,targets:[]});else try{let i=Pt({binary:t});o.push({agent:"agy",detected:!0,installed:!0,targets:i.files})}catch(i){o.push({agent:"agy",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("opencode")===!0))o.push({agent:"opencode",detected:!1,installed:!1,targets:[]});else try{let i=$t({binary:t}),l=Lt({binary:t});o.push({agent:"opencode",detected:!0,installed:!0,targets:[...i,l.configFile,`mcp:${l.serverName}`]})}catch(i){o.push({agent:"opencode",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("claude")===!0))o.push({agent:"claude",detected:!1,installed:!1,targets:[]});else try{let i=lo({binary:t});o.push({agent:"claude",detected:!0,installed:!0,targets:[i.hooks.settingsFile,i.mcp.configFile,`mcp:${i.mcp.serverName}`]})}catch(i){o.push({agent:"claude",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("kiro")===!0))o.push({agent:"kiro",detected:!1,installed:!1,targets:[]});else try{let i=ho({...e.kiro??{},binary:t});o.push({agent:"kiro",detected:!0,installed:!0,targets:[i.mcp.configFile,`mcp:${i.mcp.serverName}`,i.hooks.hooksFile]})}catch(i){o.push({agent:"kiro",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("cursor")===!0))o.push({agent:"cursor",detected:!1,installed:!1,targets:[]});else try{let i=e.cursor??{},l=No({...i,binary:t,scope:i.scope??c.scope,projectRoot:i.projectRoot??c.project?.root});o.push({agent:"cursor",detected:!0,installed:!0,scope:l.scope,projectRoot:l.project?.root,targets:[...l.files,`mcp:${l.mcp.serverName}`]})}catch(i){o.push({agent:"cursor",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("copilot")===!0))o.push({agent:"copilot",detected:!1,installed:!1,targets:[]});else try{let i=e.copilot??{},l=_o({...i,binary:t,scope:i.scope??c.scope,projectRoot:i.projectRoot??c.project?.root});o.push({agent:"copilot",detected:!0,installed:!0,scope:l.scope,projectRoot:l.project?.root,targets:[...l.files,`mcp:${l.mcp.serverName}`]})}catch(i){o.push({agent:"copilot",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("grok")===!0))o.push({agent:"grok",detected:!1,installed:!1,targets:[]});else try{let i=e.grok??{},l=Uo({...i,binary:t,scope:i.scope??c.scope,projectRoot:i.projectRoot??c.project?.root});o.push({agent:"grok",detected:!0,installed:!0,scope:l.scope,projectRoot:l.project?.root,targets:[...l.files,`mcp:${l.mcp.serverName}`]})}catch(i){o.push({agent:"grok",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("toolnet-cli")===!0))o.push({agent:"toolnet-cli",detected:!1,installed:!1,targets:[]});else try{let i=e.toolnetCli??{},l=Io({...i,binary:t});o.push({agent:"toolnet-cli",detected:!0,installed:!0,targets:[l.mcp.configFile]})}catch(i){o.push({agent:"toolnet-cli",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("kilo")===!0))o.push({agent:"kilo",detected:!1,installed:!1,targets:[]});else try{let i=e.kilo??{},l=Oo({...i,binary:t});o.push({agent:"kilo",detected:!0,installed:!0,targets:[l.mcp.configFile]})}catch(i){o.push({agent:"kilo",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("codex")===!0))o.push({agent:"codex",detected:!1,installed:!1,targets:[]});else try{let i=Wt({binary:t}),l=Yt({binary:t}),a=eo({binary:t}),u=no({binary:t});if(!u.installed)throw new Error(u.error??"Codex MCP registration failed");let p=[i.configFile,l,a.hooksFile,`mcp:${u.serverName}`];i.preservedPrevious&&p.push(i.previousFile),o.push({agent:"codex",detected:!0,installed:!0,targets:p})}catch(i){o.push({agent:"codex",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("goose")===!0))o.push({agent:"goose",detected:!1,installed:!1,targets:[]});else try{let i=e.goose??{},l=zo({...i,binary:t});o.push({agent:"goose",detected:!0,installed:!0,targets:[l.hooksFile]})}catch(i){o.push({agent:"goose",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("qwen")===!0))o.push({agent:"qwen",detected:!1,installed:!1,targets:[]});else try{let i=e.qwen??{},l=sn({...i,binary:t});o.push({agent:"qwen",detected:!0,installed:!0,targets:[l.hooksFile]})}catch(i){o.push({agent:"qwen",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("kimi")===!0))o.push({agent:"kimi",detected:!1,installed:!1,targets:[]});else try{let i=e.kimi??{},l=dn({...i,binary:t});o.push({agent:"kimi",detected:!0,installed:!0,targets:[l.configFile]})}catch(i){o.push({agent:"kimi",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("hermes")===!0))o.push({agent:"hermes",detected:!1,installed:!1,targets:[]});else try{let i=e.hermes??{},l=yn({...i,binary:t});o.push({agent:"hermes",detected:!0,installed:!0,targets:[l.configFile]})}catch(i){o.push({agent:"hermes",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("qoder")===!0))o.push({agent:"qoder",detected:!1,installed:!1,targets:[]});else try{let i=e.qoder??{},l=jn({...i,binary:t});o.push({agent:"qoder",detected:!0,installed:!0,targets:[l.settingsFile]})}catch(i){o.push({agent:"qoder",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}return o}function Sn(e){switch(e){case"agy":return"Agy / Antigravity";case"opencode":return"OpenCode";case"claude":return"Claude Code";case"kiro":return"Kiro CLI";case"cursor":return"Cursor CLI";case"copilot":return"GitHub Copilot CLI";case"grok":return"Grok Build";case"toolnet-cli":return"ToolNet CLI";case"kilo":return"Kilo";case"codex":return"Codex";case"goose":return"goose";case"qwen":return"Qwen Code";case"kimi":return"Kimi Code CLI";case"hermes":return"Hermes Agent";case"qoder":return"Qoder CLI";default:return e}}function Ac(e){console.log(""),console.log("ToolNet Memory Integration Detection"),console.log("===================================="),console.log("");for(let t of e){let o=Sn(t.agent);if(!t.detected){console.log(`\u25CB ${o}: not detected`);continue}console.log(`\u2713 ${o}: detected`);for(let n of t.evidence)console.log(`  ${n}`)}console.log("")}var Mc=["claude","cursor","copilot","grok","kiro","opencode","codex","agy"],Hc={opencode:"toolnet-memory session:opencode-sync",codex:"toolnet-memory session:codex-sync",agy:"toolnet-memory session:agy-sync","toolnet-cli":"toolnet-memory session:toolnet-cli-sync"};function $c(e){if(Mc.includes(e))return"ToolNet integration configured; hooks installed successfully";let t=Hc[e];return t?`ToolNet integration configured; run ${t} to capture session history`:"ToolNet integration configured; capture begins when a supported hook or sync runs"}function _c(e){console.log(""),console.log("ToolNet Memory AI Integrations"),console.log("=============================="),console.log("");for(let t of e){let o=Sn(t.agent);if(!t.detected){console.log(`- ${o}: not detected`);continue}if(t.installed){let n=t.scope?` [scope=${t.scope}]`:"";console.log(`\u2713 ${o}: ${$c(t.agent)}${n}`),t.projectRoot&&console.log(`  project: ${t.projectRoot}`);continue}console.log(`\u2717 ${o}: integration failed`),t.error&&console.log(`  ${t.error}`)}console.log("")}function Dc(e,t){let o=e.indexOf(t);return o>=0?e[o+1]:void 0}function Jc(e){return e.includes("--scope")||e.includes("--global")||e.includes("--both")?Eo(e):void 0}async function Gc(){let e=process.argv.slice(2),t=e.includes("--all"),o=e.includes("--json"),n=e.includes("--detect-only"),r=Jc(e),c=Dc(e,"--project");if(n){let i=Cn();if(o){console.log(JSON.stringify(i,null,2));return}Ac(i);return}let s=Tc({force:t,scope:r,projectRoot:c});if(o){console.log(JSON.stringify(s,null,2));return}_c(s)}var Lc=process.argv[1]&&(process.argv[1].endsWith("auto-integrate.js")||process.argv[1].endsWith("auto-integrate.ts"));Lc&&Gc().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});export{Cn as detectAutoIntegrations,Tc as installAutoIntegrations,Sn as integrationDisplayName};
