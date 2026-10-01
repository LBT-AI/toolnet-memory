import{existsSync as Ct}from"node:fs";import{homedir as ar}from"node:os";import{join as k}from"node:path";import{spawnSync as ur}from"node:child_process";import{homedir as Dn}from"node:os";import{join as R}from"node:path";function Ve(e={}){return R(e.home??Dn(),".gemini")}function Xe(e={}){return R(Ve(e),"antigravity-cli")}function ze(e={}){return R(Ve(e),"config")}function U(e={}){return R(ze(e),"mcp_config.json")}function B(e={}){let t=e.cwd??process.cwd();return R(t,".agents","mcp_config.json")}function W(e="toolnet-memory",t={}){return R(Xe(t),"plugins",e)}function Ze(e={}){return[Xe(e),U(e),ze(e),B(e)]}import{homedir as et}from"node:os";import{join as x}from"node:path";function E(e={}){let t=process.env.OPENCODE_CONFIG_DIR?.trim();if(t)return t;let o=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return o?x(o,"opencode"):x(e.home??et(),".config","opencode")}function me(e={}){let t=process.env.OPENCODE_CONFIG?.trim();if(t)return t;let o=e.home??et(),n=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return n?x(n,"opencode","opencode.json"):x(o,".config","opencode","opencode.json")}function ye(e={}){let t=e.cwd??process.cwd();return x(t,"opencode.json")}function tt(e={}){return x(E(e),"plugins")}function ot(e={}){return x(E(e),"AGENTS.md")}import{homedir as nt}from"node:os";import{join as he}from"node:path";function ke(e={}){return he(e.home??nt(),".claude")}function rt(e={}){return he(ke(e),"settings.json")}function it(e={}){return he(e.home??nt(),".claude.json")}import{homedir as Jn}from"node:os";import{join as v}from"node:path";function Ie(e={}){return e.kiroHome??process.env.KIRO_HOME??v(e.home??Jn(),".kiro")}function Gn(e={}){return v(Ie(e),"settings")}function Q(e={}){return v(Gn(e),"mcp.json")}function be(e={}){let t=e.cwd??process.cwd();return v(t,".kiro","settings","mcp.json")}function Ln(e={}){return v(Ie(e),"hooks")}function Oe(e={}){return v(Ln(e),"toolnet-memory.json")}function we(e={}){let t=e.cwd??process.cwd();return v(t,".kiro","hooks","toolnet-memory.json")}function st(e={}){return[Ie(e),Q(e)]}import{homedir as Kn}from"node:os";import{join as Se}from"node:path";function ct(e={}){return Se(e.home??Kn(),".toolnetcli")}function qn(e={}){return Se(ct(e),"config.json")}function lt(e={}){let t=e.cwd??process.cwd();return Se(t,".toolnet","mcp.json")}function at(e={}){let t=ct(e),o=qn(e);return[t,o]}import{homedir as Un}from"node:os";import{join as je}from"node:path";function ut(e={}){if(e.kiloHome)return e.kiloHome;if(process.env.KILO_HOME)return process.env.KILO_HOME;let t=e.xdgConfigHome??process.env.XDG_CONFIG_HOME;return t?je(t,"kilo"):je(e.home??Un(),".config","kilo")}function Ce(e={}){return je(ut(e),"kilo.jsonc")}function dt(e={}){let t=ut(e),o=Ce(e);return[t,o]}import{homedir as Bn}from"node:os";import{join as O,resolve as Wn}from"node:path";function Y(e={}){return e.cursorHome??O(e.home??Bn(),".cursor")}function Qn(e={}){return e.cursorConfigDir??process.env.CURSOR_CONFIG_DIR??(e.xdgConfigHome??process.env.XDG_CONFIG_HOME?O(e.xdgConfigHome??process.env.XDG_CONFIG_HOME,"cursor"):void 0)??Y(e)}function V(e={}){return O(Y(e),"mcp.json")}function X(e={}){return O(Y(e),"hooks.json")}function xe(e){return O(Wn(e),".cursor")}function pt(e){return O(xe(e),"mcp.json")}function gt(e){return O(xe(e),"hooks.json")}function Yn(e){return O(xe(e),"rules")}function ft(e){return O(Yn(e),"toolnet-memory.mdc")}function mt(e={}){return Array.from(new Set([Y(e),Qn(e)]))}import{homedir as Vn}from"node:os";import{join as I,resolve as Xn}from"node:path";function ve(e={}){return e.copilotHome??process.env.COPILOT_HOME??I(e.home??Vn(),".copilot")}function z(e={}){return I(ve(e),"mcp-config.json")}function zn(e={}){return I(ve(e),"hooks")}function Z(e={}){return I(zn(e),"toolnet-memory.json")}function Fe(e){return I(Xn(e),".github")}function yt(e){return I(Fe(e),"mcp.json")}function Zn(e){return I(Fe(e),"hooks")}function ht(e){return I(Zn(e),"toolnet-memory.json")}function er(e){return I(Fe(e),"instructions")}function kt(e){return I(er(e),"toolnet-memory.instructions.md")}function It(e={}){return[ve(e)]}import{homedir as tr}from"node:os";import{join as h,resolve as or}from"node:path";function ee(e={}){return e.grokHome??process.env.GROK_HOME??h(e.home??tr(),".grok")}function te(e={}){return h(ee(e),"config.toml")}function nr(e={}){return h(ee(e),"hooks")}function oe(e={}){return h(nr(e),"toolnet-memory.json")}function rr(e={}){return h(ee(e),"skills")}function ir(e={}){return h(rr(e),"toolnet-continuity")}function ne(e={}){return h(ir(e),"SKILL.md")}function Re(e){return h(or(e),".grok")}function bt(e){return h(Re(e),"config.toml")}function sr(e){return h(Re(e),"hooks")}function Ot(e){return h(sr(e),"toolnet-memory.json")}function cr(e){return h(Re(e),"skills")}function lr(e){return h(cr(e),"toolnet-continuity")}function wt(e){return h(lr(e),"SKILL.md")}function St(e={}){return[ee(e)]}function dr(e){return ur("sh",["-lc",`command -v ${JSON.stringify(e)} >/dev/null 2>&1`],{stdio:"ignore"}).status===0}function m(e){let t=e.commandExists(e.command),o=e.configPaths.filter(c=>Ct(c)),n=o.length>0,r=[];t&&r.push(`command:${e.command}`);for(let c of o)r.push(`config:${c}`);return{agent:e.agent,detected:t||n,commandDetected:t,configDetected:n,evidence:r}}function jt(e){let t=e.commands.filter(s=>e.commandExists(s)),o=e.configPaths.filter(s=>Ct(s)),n=t.length>0,r=o.length>0,c=[...t.map(s=>`command:${s}`),...o.map(s=>`config:${s}`)];return{agent:e.agent,detected:n||r,commandDetected:n,configDetected:r,evidence:c}}function xt(e={}){let t=e.home??ar(),o=e.commandExists??dr,n=e.codexHome??process.env.CODEX_HOME??k(t,".codex");return[m({agent:"agy",command:"agy",commandExists:o,configPaths:Ze({home:t})}),m({agent:"opencode",command:"opencode",commandExists:o,configPaths:[E({home:t,xdgConfigHome:e.xdgConfigHome})]}),m({agent:"claude",command:"claude",commandExists:o,configPaths:[ke({home:t})]}),m({agent:"kiro",command:"kiro-cli",commandExists:o,configPaths:st({home:t,kiroHome:e.kiroHome})}),jt({agent:"cursor",commands:["agent","cursor-agent"],commandExists:o,configPaths:mt({home:t,cursorHome:e.cursorHome,cursorConfigDir:e.cursorConfigDir,xdgConfigHome:e.xdgConfigHome})}),m({agent:"copilot",command:"copilot",commandExists:o,configPaths:It({home:t,copilotHome:e.copilotHome})}),m({agent:"grok",command:"grok",commandExists:o,configPaths:St({home:t,grokHome:e.grokHome})}),m({agent:"toolnet-cli",command:"toolnet",commandExists:o,configPaths:at({home:t})}),jt({agent:"kilo",commands:["kilo","kilo-code"],commandExists:o,configPaths:dt({home:t,kiloHome:e.kiloHome})}),m({agent:"codex",command:"codex",commandExists:o,configPaths:[n]}),m({agent:"goose",command:"goose",commandExists:o,configPaths:[k(t,".agents","plugins")]}),m({agent:"qwen",command:"qwen",commandExists:o,configPaths:[k(t,".qwen")]}),m({agent:"kimi",command:"kimi-code",commandExists:o,configPaths:[k(t,".kimi-code")]}),m({agent:"hermes",command:"hermes",commandExists:o,configPaths:[k(t,".hermes")]}),m({agent:"qoder",command:"qoder",commandExists:o,configPaths:[k(t,".qoder-cn"),k(t,".qoder")]}),m({agent:"aider",command:"aider",commandExists:o,configPaths:[k(t,".aider")]}),m({agent:"plandex",command:"plandex",commandExists:o,configPaths:[k(t,".plandex"),k(t,"plandex-server")]}),m({agent:"openrouter",command:"openrouter",commandExists:o,configPaths:[k(t,".openrouter")]})]}import{existsSync as Er,mkdirSync as Nt,readFileSync as Pr,renameSync as Nr,writeFileSync as Tr}from"node:fs";import{dirname as Ar,join as ie}from"node:path";import{existsSync as pr,mkdirSync as gr,readFileSync as fr,renameSync as mr,rmSync as yr,writeFileSync as hr}from"node:fs";import{dirname as kr,join as Ir}from"node:path";function br(e){return`'${e.replace(/'/g,"'\\''")}'`}function Or(e){if(!pr(e))return{};let t;try{t=JSON.parse(fr(e,"utf8"))}catch{throw new Error(`Invalid existing Agy hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Agy hooks.json at ${e}: root must be a JSON object.`);return t}function wr(e,t){gr(kr(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{hr(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),mr(o,e)}finally{yr(o,{force:!0})}}function vt(e={}){let t=e.pluginName??"toolnet-memory",o=e.hooksFile??Ir(W(t),"hooks.json"),n=Or(o),r=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",c=`${br(r)} session:agy-hook`;return n["toolnet-memory"]={enabled:!0,PreToolUse:[{matcher:"view_file|list_dir|find_by_name|grep_search|run_command",hooks:[{type:"command",command:`${c} pre-tool`,timeout:5}]}],PreInvocation:[{type:"command",command:`${c} pre`,timeout:15}],PostInvocation:[{type:"command",command:`${c} post`,timeout:15}],Stop:[{type:"command",command:`${c} stop`,timeout:30}]},wr(o,n),o}import{existsSync as Sr,mkdirSync as jr,readFileSync as Cr,renameSync as xr,writeFileSync as vr}from"node:fs";import{dirname as Fr}from"node:path";function H(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Rr(e,t){jr(Fr(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;vr(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),xr(o,e)}function Ft(e){if(!Sr(e))return{};let t=Cr(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Agy MCP config at ${e}: parse error. Not overwriting.`)}if(!H(o))throw new Error(`Invalid existing Agy MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Rt(e,t){return H(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function re(e,t,o,n){let r=Ft(e),c=r.mcpServers;if(c!==void 0&&!H(c))throw new Error(`Invalid existing Agy MCP config: mcpServers must be an object in ${e}.`);let s=H(c)?{...c}:{},i=s[o];if(Rt(i,t)&&!n)return{installed:!0,changed:!1};s[o]={command:t,args:["mcp"]};let l={...r,mcpServers:s};Rr(e,l);let u=Ft(e).mcpServers;if(!H(u)||!Rt(u[o],t))throw new Error(`Agy MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function Et(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",n=e.scope??"global";if(e.configFile)return{...re(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(n==="both"){let s=U(),i=B({cwd:e.cwd}),l=re(s,t,o,e.force??!1),a=re(i,t,o,e.force??!1);return{installed:!0,changed:l.changed||a.changed,configFile:s,serverName:o,command:t,args:["mcp"]}}let r=n==="workspace"?B({cwd:e.cwd}):U();return{...re(r,t,o,e.force??!1),configFile:r,serverName:o,command:t,args:["mcp"]}}var Mr=`# ToolNet Memory Continuity

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
`;function Hr(e,t){Nt(Ar(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;Tr(o,t,{encoding:"utf8",mode:384}),Nr(o,e)}function Pt(e,t){Er(e)&&Pr(e,"utf8")===t||Hr(e,t)}function Tt(e={}){let t=e.pluginName??"toolnet-memory",o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.pluginRoot??W(t),r=ie(n,"plugin.json"),c=ie(n,"mcp_config.json"),s=ie(n,"hooks.json"),i=ie(n,"rules","toolnet-memory-continuity.md");return Nt(n,{recursive:!0,mode:448}),Pt(r,`${JSON.stringify({$schema:"https://antigravity.google/schemas/v1/plugin.json",name:t,description:"Persistent project continuity and memory for Antigravity coding sessions."},null,2)}
`),Et({configFile:c,binary:o,serverName:"toolnet-memory",force:e.force}),vt({hooksFile:s,binary:o,pluginName:t}),Pt(i,`${Mr.trim()}
`),{installed:!0,pluginRoot:n,files:[r,c,s,i]}}import{existsSync as _r,mkdirSync as $t,readFileSync as Dr,writeFileSync as _t}from"node:fs";import{join as Mt}from"node:path";var $r="memory_agent_ask";function At(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${$r}

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
`.trim()}var Ht="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",Ee="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function Jr(e={}){let t=ot();$t(E(),{recursive:!0});let o=`${Ht}
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


${At()}

${Ee}`,n=_r(t)?Dr(t,"utf8"):"",r=n.indexOf(Ht),c=n.indexOf(Ee);return r>=0&&c>=r?n=n.slice(0,r)+o+n.slice(c+Ee.length):(n=n.trimEnd(),n&&(n+=`

`),n+=o),_t(t,n.trimEnd()+`
`,{encoding:"utf8",mode:384}),t}function Dt(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[];o.push(Jr({cwd:e.cwd}));let n=e.scope??"global",r=[];if((n==="global"||n==="both")&&r.push(e.directory??tt()),n==="project"||n==="both"){let c=e.cwd??process.cwd();r.push(Mt(c,".opencode","plugins"))}for(let c of r){$t(c,{recursive:!0});let s=Mt(c,"toolnet-memory.js"),i=`
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
`;_t(s,i.trimStart(),{encoding:"utf8",mode:384}),o.push(s)}return o}import{existsSync as Lt,mkdirSync as Gr,readFileSync as Lr,renameSync as Kr,writeFileSync as qr}from"node:fs";import{dirname as Kt,join as Ur}from"node:path";function $(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Br(e,t){Gr(Kt(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;qr(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Kr(o,e)}function Jt(e){if(!Lt(e))return{};let t=Lr(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing OpenCode config at ${e}: parse error. Not overwriting.`)}if(!$(o))throw new Error(`Invalid existing OpenCode config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Gt(e,t){if(!$(e))return!1;let o=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(o)&&o.length===2&&o[0]===t&&o[1]==="mcp"}function se(e,t,o,n){let r=Ur(Kt(e),"opencode.jsonc"),c=Lt(r)?r:void 0,s=Jt(e),i=s.mcp;if(i!==void 0&&!$(i))throw new Error(`Invalid existing OpenCode config: mcp must be an object in ${e}.`);let l=$(i)?{...i}:{},a=l[o];if(Gt(a,t)&&!n)return{installed:!0,changed:!1,preservedJsonc:c};l[o]={type:"local",command:[t,"mcp"],enabled:!0};let u={...s,mcp:l};Br(e,u);let d=Jt(e);if(!$(d.mcp)||!Gt(d.mcp[o],t))throw new Error(`OpenCode MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0,preservedJsonc:c}}function qt(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",n=e.scope??"global";if(e.configFile)return{...se(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:[t,"mcp"]};if(n==="both"){let s=me(),i=ye({cwd:e.cwd}),l=se(s,t,o,e.force??!1),a=se(i,t,o,e.force??!1);return{installed:!0,changed:l.changed||a.changed,configFile:s,serverName:o,command:[t,"mcp"],preservedJsonc:l.preservedJsonc??a.preservedJsonc}}let r=n==="project"?ye({cwd:e.cwd}):me();return{...se(r,t,o,e.force??!1),configFile:r,serverName:o,command:[t,"mcp"]}}import{existsSync as Wr,mkdirSync as Ut,readFileSync as Qr,writeFileSync as Bt}from"node:fs";import{homedir as Wt}from"node:os";import{dirname as Qt,join as Pe}from"node:path";function Yr(e){let t=[],o=/"((?:\\.|[^"\\])*)"|'([^']*)'/g,n;for(;n=o.exec(e);){let r=n[1]??n[2]??"";try{t.push(n[1]!==void 0?JSON.parse(`"${r}"`):r)}catch{t.push(r)}}return t}function Yt(e={}){let t=e.configFile??Pe(process.env.CODEX_HOME??Pe(Wt(),".codex"),"config.toml"),o=e.previousFile??Pe(Wt(),".config","toolnet-memory","codex-notify-previous.json");Ut(Qt(t),{recursive:!0}),Ut(Qt(o),{recursive:!0});let n=Wr(t)?Qr(t,"utf8"):"",r=e.binary??"toolnet-memory",c=`notify = [${JSON.stringify(r)}, "session:codex-notify"]`,s=n.split(`
`),i=s.findIndex(p=>/^\s*\[/.test(p));i<0&&(i=s.length);let l=-1,a=-1;for(let p=0;p<i;p+=1)if(/^\s*notify\s*=/.test(s[p])){if(l=p,a=p,s[p].includes("[")&&!s[p].includes("]"))for(;a+1<i&&(a+=1,!s[a].includes("]")););break}let u=[];if(l>=0){let p=s.slice(l,a+1).join(`
`);u=Yr(p),s.splice(l,a-l+1,c)}else i=s.findIndex(p=>/^\s*\[/.test(p)),i<0&&(i=s.length),s.splice(i,0,c);let d=u.length>=2&&u[u.length-1]==="session:codex-notify";return u.length>0&&!d&&Bt(o,JSON.stringify(u,null,2)+`
`,{encoding:"utf8",mode:384}),n=s.join(`
`),n.endsWith(`
`)||(n+=`
`),Bt(t,n,{encoding:"utf8",mode:384}),{configFile:t,previousFile:o,preservedPrevious:u.length>0&&!d}}import{existsSync as Vr,mkdirSync as Xr,readFileSync as zr,writeFileSync as Zr}from"node:fs";import{homedir as ei}from"node:os";import{dirname as ti,join as Vt}from"node:path";function oi(e){return`'${e.replace(/'/g,"'\\''")}'`}function Xt(e={}){let t=e.hooksFile??Vt(process.env.CODEX_HOME??Vt(ei(),".codex"),"hooks.json");Xr(ti(t),{recursive:!0});let o={};if(Vr(t))try{o=JSON.parse(zr(t,"utf8"))}catch(i){throw new Error(`Invalid existing Codex hooks.json: ${i instanceof Error?i.message:String(i)}`)}let n=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=n;let c=(Array.isArray(n.SessionStart)?n.SessionStart:[]).filter(i=>{try{return!JSON.stringify(i).includes("session:codex-context")}catch{return!0}}),s=e.binary??"toolnet-memory";return c.push({matcher:"startup|resume|clear|compact",hooks:[{type:"command",command:`${oi(s)} session:codex-context`,timeout:15,additionalContextLimit:1e3,statusMessage:"Loading ToolNet project continuity"}]}),n.SessionStart=c,Zr(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),t}import{existsSync as zt,mkdirSync as ni,readFileSync as Zt,writeFileSync as ri}from"node:fs";import{homedir as ii}from"node:os";import{dirname as si,join as eo}from"node:path";function to(e){return`'${e.replace(/'/g,"'\\''")}'`}function oo(e={}){let t=e.hooksFile??eo(process.env.CODEX_HOME??eo(ii(),".codex"),"hooks.json");ni(si(t),{recursive:!0});let o={};if(zt(t))try{o=JSON.parse(Zt(t,"utf8"))}catch{throw new Error(`Invalid existing Codex hooks.json at ${t}: parse error. Not overwriting.`)}let n=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=n;let r=e.binary??"toolnet-memory",c=`${to(r)} session:codex-stop-hook`,s=`${to(r)} session:codex-session-end`,i={hooks:[{type:"command",command:c,timeout:30}]},l={hooks:[{type:"command",command:s,timeout:3}]},u=(Array.isArray(n.Stop)?n.Stop:[]).filter(b=>{try{return!JSON.stringify(b).includes("session:codex-stop-hook")}catch{return!0}}),p=(Array.isArray(n.SessionEnd)?n.SessionEnd:[]).filter(b=>{try{return!JSON.stringify(b).includes("session:codex-session-end")}catch{return!0}});n.Stop=[...u,i],n.SessionEnd=[...p,l];let g=JSON.stringify(o,null,2)+`
`,F=!zt(t)||Zt(t,"utf8")!==g;return ri(t,g,{encoding:"utf8",mode:384}),{hooksFile:t,changed:F,stopInstalled:!0,sessionEndInstalled:!0}}import{spawnSync as ci}from"node:child_process";function Ne(e,t){return ci(e,t,{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}function no(e,t){let o=Ne(e,["mcp","get",t,"--json"]);if(o.status!==0||!o.stdout)return null;try{return JSON.parse(o.stdout)}catch{return null}}function ro(e,t){return e.enabled!==!1&&e.transport?.type==="stdio"&&e.transport?.command===t&&Array.isArray(e.transport?.args)&&e.transport?.args.length===1&&e.transport.args[0]==="mcp"}function io(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.codexBinary??"codex",n=e.serverName??"toolnet-memory",r=no(o,n);if(r&&ro(r,t))return{installed:!0,changed:!1,serverName:n,command:t,args:["mcp"]};if(r){let i=Ne(o,["mcp","remove",n]);if(i.status!==0)return{installed:!1,changed:!1,serverName:n,command:t,args:["mcp"],error:(i.stderr||i.stdout||"Unable to remove old ToolNet MCP configuration.").trim()}}let c=Ne(o,["mcp","add",n,"--",t,"mcp"]);if(c.status!==0)return{installed:!1,changed:!1,serverName:n,command:t,args:["mcp"],error:(c.stderr||c.stdout||"Unable to register ToolNet MCP.").trim()};let s=no(o,n);return!s||!ro(s,t)?{installed:!1,changed:!0,serverName:n,command:t,args:["mcp"],error:"Codex accepted MCP registration but verification did not match expected ToolNet command."}:{installed:!0,changed:!0,serverName:n,command:t,args:["mcp"]}}import{existsSync as li,mkdirSync as ai,readFileSync as ui,renameSync as di,rmSync as pi,writeFileSync as gi}from"node:fs";import{dirname as fi}from"node:path";function _(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function mi(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function yi(e){if(!li(e))return{};let t;try{t=JSON.parse(ui(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude settings.json: ${o instanceof Error?o.message:String(o)}`)}if(!_(t))throw new Error("Invalid existing Claude settings.json: root must be a JSON object.");return t}function ce(e){if(e===void 0)return[];if(!Array.isArray(e))throw new Error("Invalid existing Claude settings.json: hook event must be an array.");let t=[];for(let o of e){if(!_(o)){t.push(o);continue}let n=o.hooks;if(!Array.isArray(n)){t.push(o);continue}let r=n.filter(c=>{if(!_(c))return!0;let s=c.command;return!(typeof s=="string"&&s.includes("session:claude-hook"))});r.length!==0&&t.push({...o,hooks:r})}return t}function le(e,t=10){return{type:"command",command:e,timeout:t}}function hi(e,t){ai(fi(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{gi(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),di(o,e)}finally{pi(o,{force:!0})}}function so(e={}){let t=e.settingsFile??rt(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=yi(t),r=n.hooks;if(r!==void 0&&!_(r))throw new Error("Invalid existing Claude settings.json: hooks must be an object.");let c=_(r)?{...r}:{},s=`${mi(o)} session:claude-hook`,i=ce(c.SessionStart);i.push({matcher:"startup|resume|clear|compact",hooks:[le(s)]}),c.SessionStart=i;let l=ce(c.UserPromptSubmit);l.push({hooks:[le(s)]}),c.UserPromptSubmit=l;let a=ce(c.PostToolUse);a.push({matcher:"Edit|Write",hooks:[le(s)]}),c.PostToolUse=a;let u=ce(c.Stop);u.push({hooks:[le(s,30)]}),c.Stop=u;let d={...n,hooks:c},p=JSON.stringify(n),g=JSON.stringify(d);return p===g?{settingsFile:t,changed:!1}:e.dryRun===!0?{settingsFile:t,changed:!0,dryRun:!0}:(hi(t,d),{settingsFile:t,changed:!0})}import{existsSync as ki,mkdirSync as Ii,readFileSync as bi,renameSync as Oi,rmSync as wi,writeFileSync as Si}from"node:fs";import{dirname as ji}from"node:path";function D(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function co(e){if(!ki(e))return{};let t;try{t=JSON.parse(bi(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude Code config: ${o instanceof Error?o.message:String(o)}`)}if(!D(t))throw new Error("Invalid existing Claude Code config: root must be a JSON object.");return t}function lo(e,t){if(!D(e))return!1;let o=e.args;return e.type==="stdio"&&e.command===t&&Array.isArray(o)&&o.length===1&&o[0]==="mcp"}function Ci(e,t){Ii(ji(e),{recursive:!0});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Si(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Oi(o,e)}finally{wi(o,{force:!0})}}function ao(e={}){let t=e.stateFile??it(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=co(t),c=r.mcpServers;if(c!==void 0&&!D(c))throw new Error("Invalid existing Claude Code config: mcpServers must be an object.");let s=D(c)?{...c}:{},i=s[n];if(lo(i,o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:[o,"mcp"],repaired:!1};let l=i!==void 0;if(s[n]={type:"stdio",command:o,args:["mcp"]},e.dryRun===!0)return{installed:!0,changed:!0,configFile:t,serverName:n,command:[o,"mcp"],repaired:l,dryRun:!0};Ci(t,{...r,mcpServers:s});let u=co(t).mcpServers;if(!D(u)||!lo(u[n],o))throw new Error("Claude Code MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:[o,"mcp"],repaired:l}}function uo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=so({binary:t,settingsFile:e.settingsFile,...e.dryRun!==void 0?{dryRun:e.dryRun}:{}}),n=ao({binary:t,stateFile:e.stateFile,...e.dryRun!==void 0?{dryRun:e.dryRun}:{}});return{hooks:o,mcp:n,files:[o.settingsFile,n.configFile]}}import{existsSync as xi,mkdirSync as vi,readFileSync as Fi,renameSync as Ri,rmSync as Ei,writeFileSync as Pi}from"node:fs";import{dirname as Ni}from"node:path";var P="ToolNet Memory - ";function fo(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Ti(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function po(e){if(!xi(e))return{};let t=Fi(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro hooks file at ${e}: parse error. Not overwriting.`)}if(!fo(o))throw new Error(`Invalid existing Kiro hooks file at ${e}: root must be a JSON object. Not overwriting.`);return o}function go(e){return fo(e)?typeof e.name=="string"&&e.name.startsWith(P):!1}function J(e){return{type:"command",command:e}}function Ai(e){return[{name:`${P}Session Start`,description:"Inject compact local ToolNet continuity and capture Kiro session activation.",trigger:"SessionStart",action:J(e),timeout:10,enabled:!0},{name:`${P}Prompt Continuity`,description:"Capture prompts and refresh ToolNet guidance only for resume/continue requests.",trigger:"UserPromptSubmit",action:J(e),timeout:10,enabled:!0},{name:`${P}Raw History Guard`,description:"Prevent Kiro from reconstructing continuity from raw ToolNet/agent session history.",trigger:"PreToolUse",matcher:"*",action:J(e),timeout:10,enabled:!0},{name:`${P}Tool Capture`,description:"Capture durable tool activity while filtering noisy read-only events.",trigger:"PostToolUse",matcher:"*",action:J(e),timeout:15,enabled:!0},{name:`${P}Final Flush`,description:"Flush pending Kiro WAL events when the assistant finishes a turn.",trigger:"Stop",action:J(e),timeout:30,enabled:!0}]}function Mi(e,t){vi(Ni(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Pi(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Ri(o,e)}finally{Ei(o,{force:!0})}}function ae(e,t,o){let n=po(e);if(n.version!==void 0&&n.version!=="v1")throw new Error(`Unsupported existing Kiro hooks version: ${String(n.version)}`);let r=n.hooks;if(r!==void 0&&!Array.isArray(r))throw new Error("Invalid existing Kiro hooks file: hooks must be an array.");let c=Array.isArray(r)?r.filter(a=>!go(a)):[],s=Ai(t),i={...n,version:"v1",hooks:[...c,...s]};if(!o&&JSON.stringify(n)===JSON.stringify(i))return{changed:!1,hookCount:s.length};Mi(e,i);let l=po(e);if(l.version!=="v1"||!Array.isArray(l.hooks)||l.hooks.filter(go).length!==s.length)throw new Error("Kiro hooks were written but verification failed.");return{changed:!0,hookCount:s.length}}function mo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=`${Ti(t)} session:kiro-hook`;if(e.hooksFile){let s=ae(e.hooksFile,n,e.force??!1);return{hooksFile:e.hooksFile,...s}}if(o==="both"){let s=Oe(),i=we({cwd:e.cwd}),l=ae(s,n,e.force??!1),a=ae(i,n,e.force??!1);return{hooksFile:s,changed:l.changed||a.changed,hookCount:l.hookCount}}let r=o==="project"?we({cwd:e.cwd}):Oe(),c=ae(r,n,e.force??!1);return{hooksFile:r,...c}}import{existsSync as Hi,mkdirSync as $i,readFileSync as _i,renameSync as Di,rmSync as Ji,writeFileSync as Gi}from"node:fs";import{dirname as Li}from"node:path";function G(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function yo(e){if(!Hi(e))return{};let t=_i(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro MCP config at ${e}: parse error. Not overwriting.`)}if(!G(o))throw new Error(`Invalid existing Kiro MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function ho(e,t){return G(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&e.disabled===!1:!1}function Ki(e,t){$i(Li(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Gi(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Di(o,e)}finally{Ji(o,{force:!0})}}function ue(e,t,o,n){let r=yo(e),c=r.mcpServers;if(c!==void 0&&!G(c))throw new Error(`Invalid existing Kiro MCP config: mcpServers must be an object in ${e}.`);let s=G(c)?{...c}:{},i=s[o];if(ho(i,t)&&!n)return{installed:!0,changed:!1};s[o]={command:t,args:["mcp"],disabled:!1};let l={...r,mcpServers:s};Ki(e,l);let u=yo(e).mcpServers;if(!G(u)||!ho(u[o],t))throw new Error(`Kiro MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function ko(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",n=e.scope??"global";if(e.configFile)return{...ue(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(n==="both"){let s=Q(),i=be({cwd:e.cwd}),l=ue(s,t,o,e.force??!1),a=ue(i,t,o,e.force??!1);return{installed:!0,changed:l.changed||a.changed,configFile:s,serverName:o,command:t,args:["mcp"]}}let r=n==="project"?be({cwd:e.cwd}):Q();return{...ue(r,t,o,e.force??!1),configFile:r,serverName:o,command:t,args:["mcp"]}}function Io(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=ko({binary:t,configFile:e.configFile,scope:e.scope,cwd:e.cwd,force:e.force}),n=mo({binary:t,hooksFile:e.hooksFile,scope:e.scope,cwd:e.cwd,force:e.force});return{installed:o.installed,changed:o.changed||n.changed,mcp:o,hooks:n,files:[o.configFile,n.hooksFile]}}import{existsSync as qi,mkdirSync as Ui,readFileSync as Bi,renameSync as Wi,rmSync as Qi,writeFileSync as Yi}from"node:fs";import{dirname as Vi}from"node:path";function Te(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Xi(e){if(!qi(e))return{};let t=Bi(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: parse error. Not overwriting.`)}if(!Te(o))throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function zi(e,t){Ui(Vi(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Yi(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Wi(o,e)}finally{Qi(o,{force:!0})}}function bo(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??lt({cwd:e.cwd}),n=Xi(o),r="toolnet-memory";if(Te(n.mcpServers)&&n.mcpServers[r]!=null&&!e.force)return{installed:!0,changed:!1,configFile:o};let s=Te(n.mcpServers)?{...n.mcpServers}:{};return s[r]={command:t,args:["mcp"]},n.mcpServers=s,zi(o,n),{installed:!0,changed:!0,configFile:o}}function Oo(e={}){let t=e.binary??"toolnet-memory",o=bo({binary:t,configFile:e.configFile,force:e.force,cwd:e.cwd});return{installed:o.installed,changed:o.changed,mcp:{...o,configured:o.installed},files:[o.configFile]}}import{mkdirSync as ss,existsSync as cs}from"node:fs";import{dirname as ls}from"node:path";import{existsSync as Zi,mkdirSync as es,readFileSync as ts,renameSync as os,rmSync as ns,writeFileSync as rs}from"node:fs";import{dirname as is}from"node:path";function y(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function C(e,t){if(!Zi(e))return{};let o=ts(e,"utf8").trim();if(!o)return{};let n;try{n=JSON.parse(o)}catch(r){throw new Error(`Invalid existing ${t} MCP config: ${r instanceof Error?r.message:String(r)}`)}if(!y(n))throw new Error(`Invalid existing ${t} MCP config: root must be a JSON object.`);return n}function N(e,t){es(is(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{rs(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),os(o,e)}finally{ns(o,{force:!0})}}function wo(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??Ce(),n=ls(o);cs(n)||ss(n,{recursive:!0});let r=C(o,"Kilo"),c=r.mcp;if(c!==void 0&&!y(c))throw new Error("Invalid existing Kilo config: mcp must be an object.");let s=y(c)?{...c}:{},i="toolnet-memory";return y(s[i])&&!e.force?{installed:!0,changed:!1,configFile:o,configured:!0}:(s[i]={type:"local",command:[t,"mcp"],enabled:!0,timeout:1e4},N(o,{...r,mcp:s}),{installed:!0,changed:!0,configFile:o,configured:!0})}function So(e={}){let t=e.binary??"toolnet-memory",o=wo({binary:t,configFile:e.configFile,force:e.force});return{installed:o.installed,changed:o.changed,mcp:o,files:[o.configFile]}}import{existsSync as as,mkdirSync as us,readFileSync as ds,renameSync as ps,rmSync as gs,writeFileSync as fs}from"node:fs";import{dirname as ms}from"node:path";function f(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function w(e,t){if(!as(e))return{};let o=ds(e,"utf8").trim();if(!o)return{};let n;try{n=JSON.parse(o)}catch(r){throw new Error(`Invalid existing ${t} hooks file: ${r instanceof Error?r.message:String(r)}`)}if(!f(n))throw new Error(`Invalid existing ${t} hooks file: root must be a JSON object.`);return n}function T(e,t){us(ms(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{fs(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),ps(o,e)}finally{gs(o,{force:!0})}}function Ae(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}var L=[["sessionStart",10],["beforeSubmitPrompt",10],["preToolUse",10],["postToolUse",15],["afterAgentResponse",15],["stop",30]];function jo(e){return f(e)&&typeof e.command=="string"&&e.command.includes("session:cursor-hook")}function ys(e,t,o){let r={type:"command",command:`TOOLNET_HOOK_EVENT=${Ae(e)} ${Ae(t)} session:cursor-hook`,timeout:o};return e==="preToolUse"&&(r.matcher=".*"),r}function Me(e={}){let t=e.hooksFile??X(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=w(t,"Cursor");if(n.version!==void 0&&n.version!==1)throw new Error(`Unsupported existing Cursor hooks version: ${String(n.version)}`);let r=n.hooks;if(r!==void 0&&!f(r))throw new Error("Invalid existing Cursor hooks file: hooks must be an object.");let c=f(r)?{...r}:{};for(let[a,u]of L){let d=c[a];if(d!==void 0&&!Array.isArray(d))throw new Error(`Invalid existing Cursor hooks file: hooks.${a} must be an array.`);let p=Array.isArray(d)?d.filter(g=>!jo(g)):[];c[a]=[...p,ys(a,o,u)]}let s={...n,version:1,hooks:c};if(JSON.stringify(n)===JSON.stringify(s))return{hooksFile:t,changed:!1,hookCount:L.length};T(t,s);let i=w(t,"Cursor");if(i.version!==1||!f(i.hooks))throw new Error("Cursor hooks were written but verification failed.");let l=0;for(let[a]of L){let u=i.hooks[a];if(!Array.isArray(u))throw new Error("Cursor hooks were written but verification failed.");l+=u.filter(jo).length}if(l!==L.length)throw new Error("Cursor hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:L.length}}function Co(e,t){return y(e)?(e.type===void 0||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function He(e={}){let t=e.configFile??V(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=C(t,"Cursor"),c=r.mcpServers;if(c!==void 0&&!y(c))throw new Error("Invalid existing Cursor MCP config: mcpServers must be an object.");let s=y(c)?{...c}:{};if(Co(s[n],o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};s[n]={type:"stdio",command:o,args:["mcp"]},N(t,{...r,mcpServers:s});let l=C(t,"Cursor").mcpServers;if(!y(l)||!Co(l[n],o))throw new Error("Cursor MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}import{mkdirSync as hs,readFileSync as xo,renameSync as ks,rmSync as Is,writeFileSync as bs}from"node:fs";import{dirname as Os}from"node:path";var $e=`---
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
`;function ws(e,t){hs(Os(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{bs(o,t,{encoding:"utf8",mode:384}),ks(o,e)}finally{Is(o,{force:!0})}}function vo(e){let t=e.ruleFile??ft(e.projectRoot);try{if(xo(t,"utf8")===$e)return{ruleFile:t,changed:!1}}catch{}if(ws(t,$e),xo(t,"utf8")!==$e)throw new Error("Cursor ToolNet project rule was written but verification failed.");return{ruleFile:t,changed:!0}}import{spawnSync as Ss}from"node:child_process";import{existsSync as A,statSync as js}from"node:fs";import{dirname as Cs,join as xs,parse as vs,resolve as De}from"node:path";function Fo(e){let t=De(e);if(!A(t))throw new Error(`Project path does not exist: ${t}`);if(!js(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);return t}function de(e){return xs(e,".toolnet","project.json")}function Fs(e){let t=De(e),o=vs(t).root;for(;;){if(A(de(t)))return t;if(t===o)return;let n=Cs(t);if(n===t)return;t=n}}function _e(e){let t=Ss("git",["rev-parse","--show-toplevel"],{cwd:e,encoding:"utf8",timeout:5e3});if(t.status!==0)return;let o=t.stdout.trim();return o?De(o):void 0}function S(e={}){let t=Fo(e.cwd??process.cwd());if(e.project){let r=Fo(e.project),c=de(r),s=_e(r);return{root:r,source:"explicit",eligible:!0,toolnetProject:A(c),manifestFile:A(c)?c:void 0,gitRoot:s}}let o=Fs(t);if(o){let r=de(o);return{root:o,source:"toolnet",eligible:!0,toolnetProject:!0,manifestFile:r,gitRoot:_e(o)}}let n=_e(t);if(n){let r=de(n);return{root:n,source:"git",eligible:!0,toolnetProject:A(r),manifestFile:A(r)?r:void 0,gitRoot:n}}return{root:t,source:"cwd",eligible:!1,toolnetProject:!1}}function No(e,t={}){let o=[],n=e.indexOf("--scope");if(n>=0){let c=e[n+1];if(c!=="global"&&c!=="project"&&c!=="both")throw new Error(`Invalid --scope value: ${String(c)}`);o.push(c)}e.includes("--global")&&o.push("global"),e.includes("--both")&&o.push("both");let r=Array.from(new Set(o));if(r.length>1)throw new Error(`Conflicting integration scopes: ${r.join(", ")}`);return r[0]??t.defaultScope??"global"}function Ro(e,t){return{install:e,effective:t}}function j(e,t){return{surface:e,global:Ro(t.globalInstall,t.effective==="global"||t.effective==="both"),project:Ro(t.projectInstall,t.effective==="project"||t.effective==="both"),effective:t.effective,risk:t.risk??"none",dedupeRequired:t.dedupeRequired??!1,trustRequired:t.trustRequired??t.projectInstall,note:t.note}}function Rs(e){return{mcp:j("mcp",{globalInstall:!0,projectInstall:!1,effective:"global"}),hooks:j("hooks",{globalInstall:!0,projectInstall:!1,effective:"global"}),work:j("work",{globalInstall:e==="grok",projectInstall:!1,effective:e==="grok"?"global":"none",note:e==="grok"?"Grok supports a global ToolNet continuity skill.":"Cursor/Copilot work instructions remain project-scoped."})}}function Eo(e){return{mcp:j("mcp",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),hooks:j("hooks",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),work:j("work",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!1,note:e==="cursor"?"Use .cursor/rules/toolnet-memory.mdc.":e==="copilot"?"Use .github/instructions/toolnet-memory.instructions.md.":"Use .grok/skills/toolnet-continuity/SKILL.md."})}}function Po(e){return{mcp:j("mcp",{globalInstall:!0,projectInstall:!0,effective:"project",risk:e==="cursor"?"precedence-unverified":"shadowed-global",trustRequired:!0,note:e==="cursor"?"Project ToolNet MCP is the intended effective definition; native same-name precedence must be E2E certified before release.":"Global remains useful outside the project; same-name project definition wins inside the project."}),hooks:j("hooks",{globalInstall:!0,projectInstall:!0,effective:"both",risk:"additive-duplicate",dedupeRequired:!0,trustRequired:!0,note:"Global and project hook sources can both execute for the same native event."}),work:j("work",{globalInstall:e==="grok",projectInstall:!0,effective:"project",risk:e==="grok"?"shadowed-global":"none",trustRequired:!1,note:e==="cursor"?"Project rule is authoritative.":e==="copilot"?"Project instruction is authoritative.":"Project skill shadows the same-name global skill inside the project."})}}function M(e){let{agent:t,scope:o,project:n}=e;return(o==="project"||o==="both")&&(!n||!n.eligible)?{agent:t,requestedScope:o,project:n,surfaces:o==="both"?Po(t):Eo(t),canInstall:!1,reason:"Project scope requires an explicit project, existing ToolNet project, or Git repository root."}:{agent:t,requestedScope:o,project:n,surfaces:o==="global"?Rs(t):o==="project"?Eo(t):Po(t),canInstall:!0}}function To(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.rule?.changed)}function Ao(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=o==="global"?void 0:S({project:e.projectRoot}),r=M({agent:"cursor",scope:o,project:n});if(!r.canInstall)throw new Error(r.reason??"Cursor project integration scope cannot be resolved.");let c,s;if((r.surfaces.mcp.global.install||r.surfaces.hooks.global.install||r.surfaces.work.global.install)&&(c={},r.surfaces.mcp.global.install&&(c.mcp=He({binary:t,configFile:e.configFile??V()})),r.surfaces.hooks.global.install&&(c.hooks=Me({binary:t,hooksFile:e.hooksFile??X()}))),r.surfaces.mcp.project.install||r.surfaces.hooks.project.install||r.surfaces.work.project.install){if(!n?.eligible)throw new Error("Cursor project integration requires an eligible project root.");s={},r.surfaces.mcp.project.install&&(s.mcp=He({binary:t,configFile:e.projectConfigFile??pt(n.root)})),r.surfaces.hooks.project.install&&(s.hooks=Me({binary:t,hooksFile:e.projectHooksFile??gt(n.root)})),r.surfaces.work.project.install&&(s.rule=vo({projectRoot:n.root,ruleFile:e.projectRuleFile}))}let i=s?.mcp??c?.mcp,l=s?.hooks??c?.hooks;if(!i||!l)throw new Error("Cursor integration did not produce an effective MCP/hooks installation.");let a=Array.from(new Set([c?.mcp?.configFile,c?.hooks?.hooksFile,c?.rule?.ruleFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.rule?.ruleFile].filter(u=>typeof u=="string")));return{installed:!0,changed:To(c)||To(s),scope:o,plan:r,project:n,global:c,projectScope:s,mcp:i,hooks:l,rule:s?.rule,files:a}}var K=[["sessionStart",10],["userPromptSubmitted",10],["userPromptTransformed",10],["preToolUse",10],["postToolUse",15],["agentStop",30]];function Es(e){if(typeof e.command=="string")return e.command;if(typeof e.bash=="string")return e.bash}function Mo(e){return f(e)&&Es(e)?.includes("session:copilot-hook")===!0}function Ps(e,t,o){let n={type:"command",command:`${t} session:copilot-hook`,env:{TOOLNET_HOOK_EVENT:e},timeoutSec:o};return e==="preToolUse"&&(n.matcher=".*"),n}function Je(e={}){let t=e.hooksFile??Z(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=w(t,"GitHub Copilot CLI");if(n.version!==void 0&&n.version!==1)throw new Error(`Unsupported existing GitHub Copilot CLI hooks version: ${String(n.version)}`);let r=n.hooks;if(r!==void 0&&!f(r))throw new Error("Invalid existing GitHub Copilot CLI hooks file: hooks must be an object.");let c=f(r)?{...r}:{};for(let[a,u]of K){let d=c[a];if(d!==void 0&&!Array.isArray(d))throw new Error(`Invalid existing GitHub Copilot CLI hooks file: hooks.${a} must be an array.`);let p=Array.isArray(d)?d.filter(g=>!Mo(g)):[];c[a]=[...p,Ps(a,o,u)]}let s={...n,version:1,hooks:c};if(JSON.stringify(n)===JSON.stringify(s))return{hooksFile:t,changed:!1,hookCount:K.length};T(t,s);let i=w(t,"GitHub Copilot CLI");if(i.version!==1||!f(i.hooks))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");let l=0;for(let[a]of K){let u=i.hooks[a];if(!Array.isArray(u))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");l+=u.filter(Mo).length}if(l!==K.length)throw new Error("GitHub Copilot CLI hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:K.length}}function Ho(e,t){return y(e)?(e.type===void 0||e.type==="local"||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&Array.isArray(e.tools)&&e.tools.length===1&&e.tools[0]==="*":!1}function Ge(e={}){let t=e.configFile??z(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=C(t,"GitHub Copilot CLI"),c=r.mcpServers;if(c!==void 0&&!y(c))throw new Error("Invalid existing GitHub Copilot CLI MCP config: mcpServers must be an object.");let s=y(c)?{...c}:{};if(Ho(s[n],o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};s[n]={type:"stdio",command:o,args:["mcp"],tools:["*"]},N(t,{...r,mcpServers:s});let l=C(t,"GitHub Copilot CLI").mcpServers;if(!y(l)||!Ho(l[n],o))throw new Error("GitHub Copilot CLI MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}import{mkdirSync as Ns,readFileSync as $o,renameSync as Ts,rmSync as As,writeFileSync as Ms}from"node:fs";import{dirname as Hs}from"node:path";var Le=`---
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
`;function $s(e,t){Ns(Hs(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Ms(o,t,{encoding:"utf8",mode:384}),Ts(o,e)}finally{As(o,{force:!0})}}function _o(e){let t=e.instructionFile??kt(e.projectRoot);try{if($o(t,"utf8")===Le)return{instructionFile:t,changed:!1}}catch{}if($s(t,Le),$o(t,"utf8")!==Le)throw new Error("Copilot ToolNet project instruction verification failed.");return{instructionFile:t,changed:!0}}function Do(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.instruction?.changed)}function Jo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=o==="global"?void 0:S({project:e.projectRoot}),r=M({agent:"copilot",scope:o,project:n});if(!r.canInstall)throw new Error(r.reason??"Copilot project integration scope cannot be resolved.");let c,s;if((r.surfaces.mcp.global.install||r.surfaces.hooks.global.install||r.surfaces.work.global.install)&&(c={},r.surfaces.mcp.global.install&&(c.mcp=Ge({binary:t,configFile:e.configFile??z()})),r.surfaces.hooks.global.install&&(c.hooks=Je({binary:t,hooksFile:e.hooksFile??Z()}))),r.surfaces.mcp.project.install||r.surfaces.hooks.project.install||r.surfaces.work.project.install){if(!n?.eligible)throw new Error("Copilot project integration requires an eligible project root.");s={},r.surfaces.mcp.project.install&&(s.mcp=Ge({binary:t,configFile:e.projectConfigFile??yt(n.root)})),r.surfaces.hooks.project.install&&(s.hooks=Je({binary:t,hooksFile:e.projectHooksFile??ht(n.root)})),r.surfaces.work.project.install&&(s.instruction=_o({projectRoot:n.root,instructionFile:e.projectInstructionFile}))}let i=s?.mcp??c?.mcp,l=s?.hooks??c?.hooks;if(!i||!l)throw new Error("Copilot integration did not produce effective MCP/hooks.");let a=Array.from(new Set([c?.mcp?.configFile,c?.hooks?.hooksFile,c?.instruction?.instructionFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.instruction?.instructionFile].filter(u=>typeof u=="string")));return{installed:!0,changed:Do(c)||Do(s),scope:o,plan:r,project:n,global:c,projectScope:s,mcp:i,hooks:l,instruction:s?.instruction,files:a}}import{existsSync as _s,mkdirSync as Ds,readFileSync as Go,renameSync as Js,rmSync as Gs,writeFileSync as Ls}from"node:fs";import{dirname as Ks}from"node:path";var Ke=`---
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
`;function qs(e,t){Ds(Ks(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Ls(o,t,{encoding:"utf8",mode:384}),Js(o,e)}finally{Gs(o,{force:!0})}}function qe(e={}){let t=e.skillFile??ne();if(_s(t)&&Go(t,"utf8")===Ke)return{skillFile:t,changed:!1};if(qs(t,Ke),Go(t,"utf8")!==Ke)throw new Error("Grok ToolNet continuity skill was written but verification failed.");return{skillFile:t,changed:!0}}var q=[["SessionStart",10],["UserPromptSubmit",10],["PreToolUse",10],["PostToolUse",15],["Stop",30]];function Lo(e){return!f(e)||!Array.isArray(e.hooks)?!1:e.hooks.some(t=>f(t)&&typeof t.command=="string"&&t.command.includes("session:grok-hook"))}function Us(e,t,o){let n={hooks:[{type:"command",command:`${t} session:grok-hook`,timeout:o,env:{TOOLNET_HOOK_EVENT:e}}]};return e==="PreToolUse"&&(n.matcher=".*"),n}function Ue(e={}){let t=e.hooksFile??oe(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=w(t,"Grok Build"),r=n.hooks;if(r!==void 0&&!f(r))throw new Error("Invalid existing Grok Build hooks file: hooks must be an object.");let c=f(r)?{...r}:{};for(let[a,u]of q){let d=c[a];if(d!==void 0&&!Array.isArray(d))throw new Error(`Invalid existing Grok Build hooks file: hooks.${a} must be an array.`);let p=Array.isArray(d)?d.filter(g=>!Lo(g)):[];c[a]=[...p,Us(a,o,u)]}let s={...n,hooks:c};if(JSON.stringify(n)===JSON.stringify(s))return{hooksFile:t,changed:!1,hookCount:q.length};T(t,s);let i=w(t,"Grok Build");if(!f(i.hooks))throw new Error("Grok Build hooks were written but verification failed.");let l=0;for(let[a]of q){let u=i.hooks[a];if(!Array.isArray(u))throw new Error("Grok Build hooks were written but verification failed.");l+=u.filter(Lo).length}if(l!==q.length)throw new Error("Grok Build hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:q.length}}import{existsSync as Bs,mkdirSync as Ws,readFileSync as Qs,renameSync as Ys,rmSync as Vs,writeFileSync as Xs}from"node:fs";import{dirname as zs}from"node:path";function Ko(e){return Bs(e)?Qs(e,"utf8"):""}function Zs(e,t){Ws(zs(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Xs(o,t,{encoding:"utf8",mode:384}),Ys(o,e)}finally{Vs(o,{force:!0})}}function Be(e){return e.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t")}function ec(e){return`[mcp_servers."${Be(e)}"]`}function tc(e,t){return[ec(e),`command = "${Be(t)}"`,'args = ["mcp"]',"enabled = true"].join(`
`)}function oc(e){let t=e.trim();return t.startsWith("[")&&t.includes("]")}function pe(e){return e.trim().replace(/\s+/g,"")}function nc(e){return new Set([pe(`[mcp_servers.${e}]`),pe(`[mcp_servers."${e}"]`),pe(`[mcp_servers.'${e}']`)])}function Uo(e,t){let o=e.split(/\r?\n/),n=nc(t),r=-1;for(let u=0;u<o.length;u+=1){let d=pe(o[u].replace(/\s+#.*$/,""));if(n.has(d)){r=u;break}}if(r<0)return null;let c=o.length;for(let u=r+1;u<o.length;u+=1)if(oc(o[u])){c=u;break}let s=[],i=0;for(let u of o)s.push(i),i+=u.length+1;let l=s[r]??0,a=c>=o.length?e.length:s[c]??e.length;return{start:l,end:a}}function rc(e,t,o){let n=`${tc(t,o)}
`,r=Uo(e,t);if(r){let c=e.slice(0,r.start),s=e.slice(r.end);return`${c}${n}${s.replace(/^\n+/,"")}`}return e.trim()?`${e.replace(/\s*$/,"")}

${n}`:n}function qo(e,t,o){let n=Uo(e,t);if(!n)return!1;let r=e.slice(n.start,n.end);return r.includes(`command = "${Be(o)}"`)&&/args\s*=\s*\[\s*"mcp"\s*\]/.test(r)&&/enabled\s*=\s*true/.test(r)}function We(e={}){let t=e.configFile??te(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=Ko(t);if(qo(r,n,o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};let c=rc(r,n,o);Zs(t,c);let s=Ko(t);if(!qo(s,n,o))throw new Error("Grok Build MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}function Bo(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.skill?.changed)}function Wo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=o==="global"?void 0:S({project:e.projectRoot}),r=M({agent:"grok",scope:o,project:n});if(!r.canInstall)throw new Error(r.reason??"Grok project integration scope cannot be resolved.");let c,s;if((r.surfaces.mcp.global.install||r.surfaces.hooks.global.install||r.surfaces.work.global.install)&&(c={},r.surfaces.mcp.global.install&&(c.mcp=We({binary:t,configFile:e.configFile??te()})),r.surfaces.hooks.global.install&&(c.hooks=Ue({binary:t,hooksFile:e.hooksFile??oe()})),r.surfaces.work.global.install&&(c.skill=qe({skillFile:e.skillFile??ne()}))),r.surfaces.mcp.project.install||r.surfaces.hooks.project.install||r.surfaces.work.project.install){if(!n?.eligible)throw new Error("Grok project integration requires an eligible project root.");s={},r.surfaces.mcp.project.install&&(s.mcp=We({binary:t,configFile:e.projectConfigFile??bt(n.root)})),r.surfaces.hooks.project.install&&(s.hooks=Ue({binary:t,hooksFile:e.projectHooksFile??Ot(n.root)})),r.surfaces.work.project.install&&(s.skill=qe({skillFile:e.projectSkillFile??wt(n.root)}))}let i=s?.mcp??c?.mcp,l=s?.hooks??c?.hooks,a=s?.skill??c?.skill;if(!i||!l||!a)throw new Error("Grok integration did not produce effective MCP/hooks/skill.");let u=Array.from(new Set([c?.mcp?.configFile,c?.hooks?.hooksFile,c?.skill?.skillFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.skill?.skillFile].filter(d=>typeof d=="string")));return{installed:!0,changed:Bo(c)||Bo(s),scope:o,plan:r,project:n,global:c,projectScope:s,mcp:i,hooks:l,skill:a,files:u}}import{existsSync as Xo,mkdirSync as Yd,readFileSync as zo,renameSync as Vd,rmSync as Xd,writeFileSync as cc}from"node:fs";import{homedir as ic}from"node:os";import{join as Qo}from"node:path";function sc(e="toolnet-memory",t={}){return Qo(t.home??ic(),".agents","plugins",e)}function Yo(e="toolnet-memory",t={}){return Qo(sc(e,t),"hooks","hooks.json")}function Vo(e){return`'${e.replace(/'/g,"'\\''")}'`}function lc(e){if(!Xo(e))return{};let t;try{t=JSON.parse(zo(e,"utf8"))}catch{throw new Error(`Invalid existing Goose hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Goose hooks.json at ${e}: root must be a JSON object.`);return t}function Zo(e={}){let t=e.pluginName??"toolnet-memory",o=e.hooksFile??Yo(t),n=lc(o),r=e.binary??"toolnet-memory",c=`${Vo(r)} session:goose-hook`,s=`${Vo(r)} session:goose-hook`,i={type:"command",command:c,timeout:30},l={type:"command",command:s,timeout:3},a=n.hooks&&typeof n.hooks=="object"&&!Array.isArray(n.hooks)?n.hooks:{};n.hooks=a;let d=(Array.isArray(a.Stop)?a.Stop:[]).filter(fe=>{try{return!JSON.stringify(fe).includes("session:goose-hook")}catch{return!0}}),g=(Array.isArray(a.SessionEnd)?a.SessionEnd:[]).filter(fe=>{try{return!JSON.stringify(fe).includes("session:goose-hook")}catch{return!0}});a.Stop=[...d,{hooks:[i]}],a.SessionEnd=[...g,{hooks:[l]}];let F=JSON.stringify(n,null,2)+`
`,b=!Xo(o)||zo(o,"utf8")!==F;return cc(o,F,{encoding:"utf8",mode:384}),{hooksFile:o,changed:b,stopInstalled:!0,sessionEndInstalled:!0}}function en(e={}){let t=Zo(e);return{hooksFile:t.hooksFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as rn,mkdirSync as uc,readFileSync as sn,renameSync as dc,rmSync as pc,writeFileSync as gc}from"node:fs";import{dirname as fc}from"node:path";import{homedir as ac}from"node:os";import{join as tn}from"node:path";function on(e={}){let t=e.projectRoot;return t?tn(t,".qwen","hooks.json"):tn(e.home??ac(),".qwen","hooks.json")}function nn(e){return`'${e.replace(/'/g,"'\\''")}'`}function mc(e){if(!rn(e))return{};let t;try{t=JSON.parse(sn(e,"utf8"))}catch{throw new Error(`Invalid existing Qwen hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Qwen hooks.json at ${e}: root must be a JSON object.`);return t}function yc(e,t){uc(fc(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{gc(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),dc(o,e)}finally{pc(o,{force:!0})}}function cn(e={}){let t=e.hooksFile??on({projectRoot:e.projectRoot}),o=mc(t),n=e.binary??"toolnet-memory",r=`${nn(n)} session:qwen-hook`,c=`${nn(n)} session:qwen-hook`,s={type:"command",command:r,timeout:30},i={type:"command",command:c,timeout:3},l=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=l;let u=(Array.isArray(l.Stop)?l.Stop:[]).filter(b=>{try{return!JSON.stringify(b).includes("session:qwen-hook")}catch{return!0}}),p=(Array.isArray(l.SessionEnd)?l.SessionEnd:[]).filter(b=>{try{return!JSON.stringify(b).includes("session:qwen-hook")}catch{return!0}});l.Stop=[...u,{hooks:[s]}],l.SessionEnd=[...p,{hooks:[i]}];let g=JSON.stringify(o,null,2)+`
`,F=!rn(t)||sn(t,"utf8")!==g;return yc(t,o),{hooksFile:t,changed:F,stopInstalled:!0,sessionEndInstalled:!0}}function ln(e={}){let t=cn(e);return{hooksFile:t.hooksFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as pn,mkdirSync as Ic,readFileSync as bc,renameSync as Oc,rmSync as wc,writeFileSync as Sc}from"node:fs";import{dirname as jc}from"node:path";import{homedir as hc}from"node:os";import{join as kc}from"node:path";function an(e={}){return kc(e.home??hc(),".kimi-code","config.toml")}function un(e){return`'${e.replace(/'/g,"'\\''")}'`}function Cc(e){return pn(e)?bc(e,"utf8"):""}function dn(e,t){Ic(jc(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Sc(o,t,{encoding:"utf8",mode:384}),Oc(o,e)}finally{wc(o,{force:!0})}}function gn(e={}){let t=e.configFile??an(),o=Cc(t),n=e.binary??"toolnet-memory",r=`${un(n)} session:kimi-hook`,c=`${un(n)} session:kimi-hook`,s=`[[hooks]]
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
`,l=!0),l?dn(t,o):pn(t)||(dn(t,s+`
`+i+`
`),l=!0),{configFile:t,changed:l,stopInstalled:!0,sessionEndInstalled:!0}}function fn(e={}){let t=gn(e);return{configFile:t.configFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as yn,mkdirSync as Fc,readFileSync as Rc,renameSync as Ec,rmSync as Pc,writeFileSync as Nc}from"node:fs";import{dirname as Tc}from"node:path";import{homedir as xc}from"node:os";import{join as vc}from"node:path";function mn(e={}){return vc(e.home??xc(),".hermes","config.yaml")}function Ac(e){return`'${e.replace(/'/g,"'\\''")}'`}function Mc(e){return yn(e)?Rc(e,"utf8"):""}function Hc(e,t){Fc(Tc(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Nc(o,t,{encoding:"utf8",mode:384}),Ec(o,e)}finally{Pc(o,{force:!0})}}function hn(e={}){let t=e.configFile??mn(),o=Mc(t),n=e.binary??"toolnet-memory",c=`  - name: toolnet-memory-session-end
    event: on_session_end
    command: ${`${Ac(n)} session:hermes-hook`}
    timeout: 30
`,s=!1;return o.includes("toolnet-memory-session-end")||(o.includes("hooks:")?o=o.replace(/hooks:\n/,`hooks:
${c}`):o=o.trim()+`

hooks:
`+c,s=!0),(s||!yn(t))&&(o.endsWith(`
`)||(o+=`
`),Hc(t,o)),{configFile:t,changed:s,sessionEndInstalled:!0}}function kn(e={}){let t=hn(e);return{configFile:t.configFile,changed:t.changed,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as On,mkdirSync as Dc,readFileSync as wn,renameSync as Jc,rmSync as Gc,writeFileSync as Lc}from"node:fs";import{dirname as Kc}from"node:path";import{existsSync as $c}from"node:fs";import{homedir as _c}from"node:os";import{join as Qe}from"node:path";function In(e={}){let t=e.home??_c();return $c(Qe(t,".qoder-cn"))?Qe(t,".qoder-cn","settings.json"):Qe(t,".qoder","settings.json")}function bn(e){return`'${e.replace(/'/g,"'\\''")}'`}function qc(e){if(!On(e))return{};let t;try{t=JSON.parse(wn(e,"utf8"))}catch{throw new Error(`Invalid existing Qoder settings.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Qoder settings.json at ${e}: root must be a JSON object.`);return t}function Uc(e,t){Dc(Kc(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Lc(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Jc(o,e)}finally{Gc(o,{force:!0})}}function Sn(e={}){let t=e.settingsFile??In(),o=qc(t),n=e.binary??"toolnet-memory",r=`${bn(n)} session:qoder-hook`,c=`${bn(n)} session:qoder-hook`,s={type:"command",command:r,timeout:30},i={type:"command",command:c,timeout:3},l=Array.isArray(o.hooks)?[...o.hooks]:[],u=l.filter(g=>{try{return!JSON.stringify(g).includes("session:qoder-hook")}catch{return!0}}).filter(g=>{try{return!JSON.stringify(g).includes("session:qoder-hook")}catch{return!0}});l.length=0,l.push({...s,event:"Stop"},{...i,event:"SessionEnd"}),o.hooks=l;let d=JSON.stringify(o,null,2)+`
`,p=!On(t)||wn(t,"utf8")!==d;return Uc(t,o),{settingsFile:t,changed:p,stopInstalled:!0,sessionEndInstalled:!0}}function jn(e={}){let t=Sn(e);return{settingsFile:t.settingsFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as Bc,mkdirSync as Cn,readFileSync as Wc,renameSync as Qc,rmSync as Yc,writeFileSync as Vc}from"node:fs";import{dirname as Xc,join as ge}from"node:path";import{homedir as zc}from"node:os";function Zc(e,t){Cn(Xc(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Vc(o,t,{encoding:"utf8",mode:493}),Qc(o,e)}finally{Yc(o,{force:!0})}}var Ye=`#!/usr/bin/env node
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
`;function xn(e={}){let t=e.cwd?ge(e.cwd,".toolnet","bin"):ge(process.env.TOOLNET_HOME??ge(zc(),".toolnet"),"bin");Cn(t,{recursive:!0,mode:448});let o=ge(t,"aider-wrapper"),n=Ye.endsWith(`
`)?Ye:Ye+`
`,r=!Bc(o)||Wc(o,"utf8")!==n;return Zc(o,n),{launcherPath:o,changed:r}}import{existsSync as vn,mkdirSync as el,readFileSync as Fn,renameSync as tl,rmSync as ol,writeFileSync as nl}from"node:fs";import{dirname as rl,join as Rn}from"node:path";import{homedir as il}from"node:os";function sl(){return process.env.PLANDEX_BASE_DIR??Rn(il(),"plandex-server")}function cl(e){if(!vn(e))return{};let t;try{t=JSON.parse(Fn(e,"utf8"))}catch{throw new Error(`Invalid existing Plandex config at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Plandex config at ${e}: root must be a JSON object.`);return t}function ll(e,t){el(rl(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{nl(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),tl(o,e)}finally{ol(o,{force:!0})}}function En(e={}){let t=sl(),o=Rn(t,"toolnet-memory.json"),n=cl(o),r=n.toolnetMemory??{};r.integration="toolnet-memory",r.captureMode="manual-recovery",r.managedBy="toolnet-memory",n.toolnetMemory=r;let c=JSON.stringify(n,null,2)+`
`,s=!vn(o)||Fn(o,"utf8")!==c;return ll(o,n),{configPath:o,changed:s}}import{existsSync as Pn,mkdirSync as Nn,readFileSync as Tn,renameSync as al,rmSync as ul,writeFileSync as dl}from"node:fs";import{dirname as An,join as pl}from"node:path";import{homedir as gl}from"node:os";function fl(e){if(!Pn(e))return{};let t;try{t=JSON.parse(Tn(e,"utf8"))}catch{throw new Error(`Invalid existing OpenRouter config at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing OpenRouter config at ${e}: root must be a JSON object.`);return t}function ml(e,t){Nn(An(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{dl(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),al(o,e)}finally{ul(o,{force:!0})}}function Mn(e={}){let t=gl(),o=pl(t,".config","openrouter","toolnet-memory.json");Nn(An(o),{recursive:!0,mode:448});let n=fl(o);n.toolnetMemory={integration:"toolnet-memory",captureMode:"blocked-product-identity",managedBy:"toolnet-memory",blocked:!0,reason:"OpenRouter CLI product identity is blocked for ToolNet integration."};let r=JSON.stringify(n,null,2)+`
`,c=!Pn(o)||Tn(o,"utf8")!==r;return ml(o,n),{configPath:o,blocked:!0,changed:c}}function Hn(e={}){if(e.scope==="global")return{scope:"global",automatic:!1,reason:"explicit-global"};if(e.scope==="project"||e.scope==="both"){let o=S({cwd:e.cwd,project:e.projectRoot});if(!o.eligible)throw new Error(`Explicit ${e.scope} integration requires an explicit project, ToolNet project, or Git repository root.`);return{scope:e.scope,automatic:!1,project:o,reason:e.scope==="project"?"explicit-project":"explicit-both"}}let t=S({cwd:e.cwd,project:e.projectRoot});return t.toolnetProject?{scope:"both",automatic:!0,project:t,reason:"toolnet-project"}:{scope:"global",automatic:!0,reason:"no-toolnet-project"}}function $n(){return xt()}function yl(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[],n=e.detections??$n(),r=new Map(n.map(s=>[s.agent,s.detected])),c=Hn({scope:e.scope,projectRoot:e.projectRoot,cwd:e.cwd});if(!(e.force===!0||r.get("agy")===!0))o.push({agent:"agy",detected:!1,installed:!1,targets:[]});else try{let i=Tt({binary:t});o.push({agent:"agy",detected:!0,installed:!0,targets:i.files})}catch(i){o.push({agent:"agy",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("opencode")===!0))o.push({agent:"opencode",detected:!1,installed:!1,targets:[]});else try{let i=Dt({binary:t}),l=qt({binary:t});o.push({agent:"opencode",detected:!0,installed:!0,targets:[...i,l.configFile,`mcp:${l.serverName}`]})}catch(i){o.push({agent:"opencode",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("claude")===!0))o.push({agent:"claude",detected:!1,installed:!1,targets:[]});else try{let i=uo({binary:t});o.push({agent:"claude",detected:!0,installed:!0,targets:[i.hooks.settingsFile,i.mcp.configFile,`mcp:${i.mcp.serverName}`]})}catch(i){o.push({agent:"claude",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("kiro")===!0))o.push({agent:"kiro",detected:!1,installed:!1,targets:[]});else try{let i=Io({...e.kiro??{},binary:t});o.push({agent:"kiro",detected:!0,installed:!0,targets:[i.mcp.configFile,`mcp:${i.mcp.serverName}`,i.hooks.hooksFile]})}catch(i){o.push({agent:"kiro",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("cursor")===!0))o.push({agent:"cursor",detected:!1,installed:!1,targets:[]});else try{let i=e.cursor??{},l=Ao({...i,binary:t,scope:i.scope??c.scope,projectRoot:i.projectRoot??c.project?.root});o.push({agent:"cursor",detected:!0,installed:!0,scope:l.scope,projectRoot:l.project?.root,targets:[...l.files,`mcp:${l.mcp.serverName}`]})}catch(i){o.push({agent:"cursor",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("copilot")===!0))o.push({agent:"copilot",detected:!1,installed:!1,targets:[]});else try{let i=e.copilot??{},l=Jo({...i,binary:t,scope:i.scope??c.scope,projectRoot:i.projectRoot??c.project?.root});o.push({agent:"copilot",detected:!0,installed:!0,scope:l.scope,projectRoot:l.project?.root,targets:[...l.files,`mcp:${l.mcp.serverName}`]})}catch(i){o.push({agent:"copilot",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("grok")===!0))o.push({agent:"grok",detected:!1,installed:!1,targets:[]});else try{let i=e.grok??{},l=Wo({...i,binary:t,scope:i.scope??c.scope,projectRoot:i.projectRoot??c.project?.root});o.push({agent:"grok",detected:!0,installed:!0,scope:l.scope,projectRoot:l.project?.root,targets:[...l.files,`mcp:${l.mcp.serverName}`]})}catch(i){o.push({agent:"grok",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("toolnet-cli")===!0))o.push({agent:"toolnet-cli",detected:!1,installed:!1,targets:[]});else try{let i=e.toolnetCli??{},l=Oo({...i,binary:t});o.push({agent:"toolnet-cli",detected:!0,installed:!0,targets:[l.mcp.configFile]})}catch(i){o.push({agent:"toolnet-cli",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("kilo")===!0))o.push({agent:"kilo",detected:!1,installed:!1,targets:[]});else try{let i=e.kilo??{},l=So({...i,binary:t});o.push({agent:"kilo",detected:!0,installed:!0,targets:[l.mcp.configFile]})}catch(i){o.push({agent:"kilo",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("codex")===!0))o.push({agent:"codex",detected:!1,installed:!1,targets:[]});else try{let i=Yt({binary:t}),l=Xt({binary:t}),a=oo({binary:t}),u=io({binary:t});if(!u.installed)throw new Error(u.error??"Codex MCP registration failed");let d=[i.configFile,l,a.hooksFile,`mcp:${u.serverName}`];i.preservedPrevious&&d.push(i.previousFile),o.push({agent:"codex",detected:!0,installed:!0,targets:d})}catch(i){o.push({agent:"codex",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("goose")===!0))o.push({agent:"goose",detected:!1,installed:!1,targets:[]});else try{let i=e.goose??{},l=en({...i,binary:t});o.push({agent:"goose",detected:!0,installed:!0,targets:[l.hooksFile]})}catch(i){o.push({agent:"goose",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("qwen")===!0))o.push({agent:"qwen",detected:!1,installed:!1,targets:[]});else try{let i=e.qwen??{},l=ln({...i,binary:t});o.push({agent:"qwen",detected:!0,installed:!0,targets:[l.hooksFile]})}catch(i){o.push({agent:"qwen",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("kimi")===!0))o.push({agent:"kimi",detected:!1,installed:!1,targets:[]});else try{let i=e.kimi??{},l=fn({...i,binary:t});o.push({agent:"kimi",detected:!0,installed:!0,targets:[l.configFile]})}catch(i){o.push({agent:"kimi",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("hermes")===!0))o.push({agent:"hermes",detected:!1,installed:!1,targets:[]});else try{let i=e.hermes??{},l=kn({...i,binary:t});o.push({agent:"hermes",detected:!0,installed:!0,targets:[l.configFile]})}catch(i){o.push({agent:"hermes",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("qoder")===!0))o.push({agent:"qoder",detected:!1,installed:!1,targets:[]});else try{let i=e.qoder??{},l=jn({...i,binary:t});o.push({agent:"qoder",detected:!0,installed:!0,targets:[l.settingsFile]})}catch(i){o.push({agent:"qoder",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("aider")===!0))o.push({agent:"aider",detected:!1,installed:!1,targets:[]});else try{let i=e.aider??{},l=xn({...i,binary:t});o.push({agent:"aider",detected:!0,installed:!0,targets:[l.launcherPath]})}catch(i){o.push({agent:"aider",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("plandex")===!0))o.push({agent:"plandex",detected:!1,installed:!1,targets:[]});else try{let i=e.plandex??{},l=En({...i,binary:t});o.push({agent:"plandex",detected:!0,installed:!0,targets:[l.configPath]})}catch(i){o.push({agent:"plandex",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("openrouter")===!0))o.push({agent:"openrouter",detected:!1,installed:!1,targets:[]});else try{let i=e.openrouter??{},l=Mn({...i,binary:t});o.push({agent:"openrouter",detected:!0,installed:!0,targets:[l.configPath]})}catch(i){o.push({agent:"openrouter",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}return o}function _n(e){switch(e){case"agy":return"Agy / Antigravity";case"opencode":return"OpenCode";case"claude":return"Claude Code";case"kiro":return"Kiro CLI";case"cursor":return"Cursor CLI";case"copilot":return"GitHub Copilot CLI";case"grok":return"Grok Build";case"toolnet-cli":return"ToolNet CLI";case"kilo":return"Kilo";case"codex":return"Codex";case"goose":return"goose";case"qwen":return"Qwen Code";case"kimi":return"Kimi Code CLI";case"hermes":return"Hermes Agent";case"qoder":return"Qoder CLI";case"aider":return"Aider";case"plandex":return"Plandex";case"openrouter":return"OpenRouter CLI";default:return e}}function hl(e){console.log(""),console.log("ToolNet Memory Integration Detection"),console.log("===================================="),console.log("");for(let t of e){let o=_n(t.agent);if(!t.detected){console.log(`\u25CB ${o}: not detected`);continue}console.log(`\u2713 ${o}: detected`);for(let n of t.evidence)console.log(`  ${n}`)}console.log("")}var kl=["claude","cursor","copilot","grok","kiro","opencode","codex","agy"],Il={opencode:"toolnet-memory session:opencode-sync",codex:"toolnet-memory session:codex-sync",agy:"toolnet-memory session:agy-sync","toolnet-cli":"toolnet-memory session:toolnet-cli-sync"};function bl(e){if(kl.includes(e))return"ToolNet integration configured; hooks installed successfully";let t=Il[e];return t?`ToolNet integration configured; run ${t} to capture session history`:"ToolNet integration configured; capture begins when a supported hook or sync runs"}function Ol(e){console.log(""),console.log("ToolNet Memory AI Integrations"),console.log("=============================="),console.log("");for(let t of e){let o=_n(t.agent);if(!t.detected){console.log(`- ${o}: not detected`);continue}if(t.installed){let n=t.scope?` [scope=${t.scope}]`:"";console.log(`\u2713 ${o}: ${bl(t.agent)}${n}`),t.projectRoot&&console.log(`  project: ${t.projectRoot}`);continue}console.log(`\u2717 ${o}: integration failed`),t.error&&console.log(`  ${t.error}`)}console.log("")}function wl(e,t){let o=e.indexOf(t);return o>=0?e[o+1]:void 0}function Sl(e){return e.includes("--scope")||e.includes("--global")||e.includes("--both")?No(e):void 0}async function jl(){let e=process.argv.slice(2),t=e.includes("--all"),o=e.includes("--json"),n=e.includes("--detect-only"),r=Sl(e),c=wl(e,"--project");if(n){let i=$n();if(o){console.log(JSON.stringify(i,null,2));return}hl(i);return}let s=yl({force:t,scope:r,projectRoot:c});if(o){console.log(JSON.stringify(s,null,2));return}Ol(s)}var Cl=process.argv[1]&&(process.argv[1].endsWith("auto-integrate.js")||process.argv[1].endsWith("auto-integrate.ts"));Cl&&jl().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});export{$n as detectAutoIntegrations,yl as installAutoIntegrations,_n as integrationDisplayName};
