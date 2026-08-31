import{existsSync as kt}from"node:fs";import{homedir as un}from"node:os";import{join as pn}from"node:path";import{spawnSync as gn}from"node:child_process";import{homedir as $o}from"node:os";import{join as v}from"node:path";function Ke(e={}){return v(e.home??$o(),".gemini")}function Ue(e={}){return v(Ke(e),"antigravity-cli")}function Be(e={}){return v(Ke(e),"config")}function L(e={}){return v(Be(e),"mcp_config.json")}function K(e={}){let t=e.cwd??process.cwd();return v(t,".agents","mcp_config.json")}function U(e="toolnet-memory",t={}){return v(Ue(t),"plugins",e)}function qe(e={}){return[Ue(e),L(e),Be(e),K(e)]}import{homedir as We}from"node:os";import{join as w}from"node:path";function S(e={}){let t=process.env.OPENCODE_CONFIG_DIR?.trim();if(t)return t;let o=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return o?w(o,"opencode"):w(e.home??We(),".config","opencode")}function le(e={}){let t=process.env.OPENCODE_CONFIG?.trim();if(t)return t;let o=e.home??We(),n=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return n?w(n,"opencode","opencode.json"):w(o,".config","opencode","opencode.json")}function ae(e={}){let t=e.cwd??process.cwd();return w(t,"opencode.json")}function Ye(e={}){return w(S(e),"plugins")}function Xe(e={}){return w(S(e),"AGENTS.md")}import{homedir as Ve}from"node:os";import{join as ue}from"node:path";function pe(e={}){return ue(e.home??Ve(),".claude")}function ze(e={}){return ue(pe(e),"settings.json")}function Qe(e={}){return ue(e.home??Ve(),".claude.json")}import{homedir as Jo}from"node:os";import{join as I}from"node:path";function ge(e={}){return e.kiroHome??process.env.KIRO_HOME??I(e.home??Jo(),".kiro")}function Go(e={}){return I(ge(e),"settings")}function B(e={}){return I(Go(e),"mcp.json")}function fe(e={}){let t=e.cwd??process.cwd();return I(t,".kiro","settings","mcp.json")}function Lo(e={}){return I(ge(e),"hooks")}function de(e={}){return I(Lo(e),"toolnet-memory.json")}function me(e={}){let t=e.cwd??process.cwd();return I(t,".kiro","hooks","toolnet-memory.json")}function Ze(e={}){return[ge(e),B(e)]}import{homedir as Ko}from"node:os";import{join as ye}from"node:path";function et(e={}){return ye(e.home??Ko(),".toolnetcli")}function Uo(e={}){return ye(et(e),"config.json")}function tt(e={}){let t=e.cwd??process.cwd();return ye(t,".toolnet","mcp.json")}function ot(e={}){let t=et(e),o=Uo(e);return[t,o]}import{homedir as Bo}from"node:os";import{join as he}from"node:path";function nt(e={}){if(e.kiloHome)return e.kiloHome;if(process.env.KILO_HOME)return process.env.KILO_HOME;let t=e.xdgConfigHome??process.env.XDG_CONFIG_HOME;return t?he(t,"kilo"):he(e.home??Bo(),".config","kilo")}function ke(e={}){return he(nt(e),"kilo.jsonc")}function rt(e={}){let t=nt(e),o=ke(e);return[t,o]}import{homedir as qo}from"node:os";import{join as h,resolve as Wo}from"node:path";function q(e={}){return e.cursorHome??h(e.home??qo(),".cursor")}function Yo(e={}){return e.cursorConfigDir??process.env.CURSOR_CONFIG_DIR??(e.xdgConfigHome??process.env.XDG_CONFIG_HOME?h(e.xdgConfigHome??process.env.XDG_CONFIG_HOME,"cursor"):void 0)??q(e)}function W(e={}){return h(q(e),"mcp.json")}function Y(e={}){return h(q(e),"hooks.json")}function be(e){return h(Wo(e),".cursor")}function it(e){return h(be(e),"mcp.json")}function st(e){return h(be(e),"hooks.json")}function Xo(e){return h(be(e),"rules")}function ct(e){return h(Xo(e),"toolnet-memory.mdc")}function lt(e={}){return Array.from(new Set([q(e),Yo(e)]))}import{homedir as Vo}from"node:os";import{join as y,resolve as zo}from"node:path";function Ce(e={}){return e.copilotHome??process.env.COPILOT_HOME??y(e.home??Vo(),".copilot")}function X(e={}){return y(Ce(e),"mcp-config.json")}function Qo(e={}){return y(Ce(e),"hooks")}function V(e={}){return y(Qo(e),"toolnet-memory.json")}function Oe(e){return y(zo(e),".github")}function at(e){return y(Oe(e),"mcp.json")}function Zo(e){return y(Oe(e),"hooks")}function ut(e){return y(Zo(e),"toolnet-memory.json")}function en(e){return y(Oe(e),"instructions")}function pt(e){return y(en(e),"toolnet-memory.instructions.md")}function gt(e={}){return[Ce(e)]}import{homedir as tn}from"node:os";import{join as m,resolve as on}from"node:path";function z(e={}){return e.grokHome??process.env.GROK_HOME??m(e.home??tn(),".grok")}function Q(e={}){return m(z(e),"config.toml")}function nn(e={}){return m(z(e),"hooks")}function Z(e={}){return m(nn(e),"toolnet-memory.json")}function rn(e={}){return m(z(e),"skills")}function sn(e={}){return m(rn(e),"toolnet-continuity")}function ee(e={}){return m(sn(e),"SKILL.md")}function je(e){return m(on(e),".grok")}function ft(e){return m(je(e),"config.toml")}function cn(e){return m(je(e),"hooks")}function dt(e){return m(cn(e),"toolnet-memory.json")}function ln(e){return m(je(e),"skills")}function an(e){return m(ln(e),"toolnet-continuity")}function mt(e){return m(an(e),"SKILL.md")}function yt(e={}){return[z(e)]}function fn(e){return gn("sh",["-lc",`command -v ${JSON.stringify(e)} >/dev/null 2>&1`],{stdio:"ignore"}).status===0}function O(e){let t=e.commandExists(e.command),o=e.configPaths.filter(s=>kt(s)),n=o.length>0,r=[];t&&r.push(`command:${e.command}`);for(let s of o)r.push(`config:${s}`);return{agent:e.agent,detected:t||n,commandDetected:t,configDetected:n,evidence:r}}function ht(e){let t=e.commands.filter(i=>e.commandExists(i)),o=e.configPaths.filter(i=>kt(i)),n=t.length>0,r=o.length>0,s=[...t.map(i=>`command:${i}`),...o.map(i=>`config:${i}`)];return{agent:e.agent,detected:n||r,commandDetected:n,configDetected:r,evidence:s}}function bt(e={}){let t=e.home??un(),o=e.commandExists??fn,n=e.codexHome??process.env.CODEX_HOME??pn(t,".codex");return[O({agent:"agy",command:"agy",commandExists:o,configPaths:qe({home:t})}),O({agent:"opencode",command:"opencode",commandExists:o,configPaths:[S({home:t,xdgConfigHome:e.xdgConfigHome})]}),O({agent:"claude",command:"claude",commandExists:o,configPaths:[pe({home:t})]}),O({agent:"kiro",command:"kiro-cli",commandExists:o,configPaths:Ze({home:t,kiroHome:e.kiroHome})}),ht({agent:"cursor",commands:["agent","cursor-agent"],commandExists:o,configPaths:lt({home:t,cursorHome:e.cursorHome,cursorConfigDir:e.cursorConfigDir,xdgConfigHome:e.xdgConfigHome})}),O({agent:"copilot",command:"copilot",commandExists:o,configPaths:gt({home:t,copilotHome:e.copilotHome})}),O({agent:"grok",command:"grok",commandExists:o,configPaths:yt({home:t,grokHome:e.grokHome})}),O({agent:"toolnet-cli",command:"toolnet",commandExists:o,configPaths:ot({home:t})}),ht({agent:"kilo",commands:["kilo","kilo-code"],commandExists:o,configPaths:rt({home:t,kiloHome:e.kiloHome})}),O({agent:"codex",command:"codex",commandExists:o,configPaths:[n]})]}import{existsSync as Tn,mkdirSync as vt,readFileSync as En,renameSync as Mn,writeFileSync as An}from"node:fs";import{dirname as Hn,join as oe}from"node:path";import{existsSync as dn,mkdirSync as mn,readFileSync as yn,renameSync as hn,rmSync as kn,writeFileSync as bn}from"node:fs";import{dirname as Cn,join as On}from"node:path";function jn(e){return`'${e.replace(/'/g,"'\\''")}'`}function wn(e){if(!dn(e))return{};let t;try{t=JSON.parse(yn(e,"utf8"))}catch{throw new Error(`Invalid existing Agy hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Agy hooks.json at ${e}: root must be a JSON object.`);return t}function In(e,t){mn(Cn(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{bn(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),hn(o,e)}finally{kn(o,{force:!0})}}function Ct(e={}){let t=e.pluginName??"toolnet-memory",o=e.hooksFile??On(U(t),"hooks.json"),n=wn(o),r=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",s=`${jn(r)} session:agy-hook`;return n["toolnet-memory"]={enabled:!0,PreToolUse:[{matcher:"view_file|list_dir|find_by_name|grep_search|run_command",hooks:[{type:"command",command:`${s} pre-tool`,timeout:5}]}],PreInvocation:[{type:"command",command:`${s} pre`,timeout:15}],PostInvocation:[{type:"command",command:`${s} post`,timeout:15}],Stop:[{type:"command",command:`${s} stop`,timeout:30}]},In(o,n),o}import{existsSync as vn,mkdirSync as Sn,readFileSync as xn,renameSync as Fn,writeFileSync as Rn}from"node:fs";import{dirname as Nn}from"node:path";function E(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Pn(e,t){Sn(Nn(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;Rn(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Fn(o,e)}function Ot(e){if(!vn(e))return{};let t=xn(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Agy MCP config at ${e}: parse error. Not overwriting.`)}if(!E(o))throw new Error(`Invalid existing Agy MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function jt(e,t){return E(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function te(e,t,o,n){let r=Ot(e),s=r.mcpServers;if(s!==void 0&&!E(s))throw new Error(`Invalid existing Agy MCP config: mcpServers must be an object in ${e}.`);let i=E(s)?{...s}:{},c=i[o];if(jt(c,t)&&!n)return{installed:!0,changed:!1};i[o]={command:t,args:["mcp"]};let l={...r,mcpServers:i};Pn(e,l);let u=Ot(e).mcpServers;if(!E(u)||!jt(u[o],t))throw new Error(`Agy MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function wt(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",n=e.scope??"global";if(e.configFile)return{...te(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(n==="both"){let i=L(),c=K({cwd:e.cwd}),l=te(i,t,o,e.force??!1),a=te(c,t,o,e.force??!1);return{installed:!0,changed:l.changed||a.changed,configFile:i,serverName:o,command:t,args:["mcp"]}}let r=n==="workspace"?K({cwd:e.cwd}):L();return{...te(r,t,o,e.force??!1),configFile:r,serverName:o,command:t,args:["mcp"]}}var _n=`# ToolNet Memory Continuity

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

- \`.toolnet/runtime/sources/** and legacy .toolnet/sessions/**\`
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
`;function Dn(e,t){vt(Hn(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;An(o,t,{encoding:"utf8",mode:384}),Mn(o,e)}function It(e,t){Tn(e)&&En(e,"utf8")===t||Dn(e,t)}function St(e={}){let t=e.pluginName??"toolnet-memory",o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.pluginRoot??U(t),r=oe(n,"plugin.json"),s=oe(n,"mcp_config.json"),i=oe(n,"hooks.json"),c=oe(n,"rules","toolnet-memory-continuity.md");return vt(n,{recursive:!0,mode:448}),It(r,`${JSON.stringify({$schema:"https://antigravity.google/schemas/v1/plugin.json",name:t,description:"Persistent project continuity and memory for Antigravity coding sessions."},null,2)}
`),wt({configFile:s,binary:o,serverName:"toolnet-memory",force:e.force}),Ct({hooksFile:i,binary:o,pluginName:t}),It(c,`${_n.trim()}
`),{installed:!0,pluginRoot:n,files:[r,s,i,c]}}import{existsSync as Jn,mkdirSync as Nt,readFileSync as Gn,writeFileSync as Pt}from"node:fs";import{join as Ft}from"node:path";var $n="memory_agent_ask";function xt(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${$n}

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
- NEVER read/list/search .toolnet/runtime/sources/** and legacy .toolnet/sessions/**, session state.json,
  events.jsonl, or raw transcripts to discover previous-agent state.
- Do not search the filesystem for the implementation/schema of
  memory_agent_ask. Invoke the MCP tool directly when deeper
  continuity is required.
- Do not dump raw transcripts or full memory.
- After receiving the ToolNet answer, continue the task
  instead of asking the user to repeat known context.
- If ToolNet says information is not recorded, say so.
`.trim()}var Rt="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",we="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function Ln(e={}){let t=Xe();Nt(S(),{recursive:!0});let o=`${Rt}
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


${xt()}

${we}`,n=Jn(t)?Gn(t,"utf8"):"",r=n.indexOf(Rt),s=n.indexOf(we);return r>=0&&s>=r?n=n.slice(0,r)+o+n.slice(s+we.length):(n=n.trimEnd(),n&&(n+=`

`),n+=o),Pt(t,n.trimEnd()+`
`,{encoding:"utf8",mode:384}),t}function Tt(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[];o.push(Ln({cwd:e.cwd}));let n=e.scope??"global",r=[];if((n==="global"||n==="both")&&r.push(e.directory??Ye()),n==="project"||n==="both"){let s=e.cwd??process.cwd();r.push(Ft(s,".opencode","plugins"))}for(let s of r){Nt(s,{recursive:!0});let i=Ft(s,"toolnet-memory.js"),c=`
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
`;Pt(i,c.trimStart(),{encoding:"utf8",mode:384}),o.push(i)}return o}import{existsSync as At,mkdirSync as Kn,readFileSync as Un,renameSync as Bn,writeFileSync as qn}from"node:fs";import{dirname as Ht,join as Wn}from"node:path";function M(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Yn(e,t){Kn(Ht(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;qn(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Bn(o,e)}function Et(e){if(!At(e))return{};let t=Un(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing OpenCode config at ${e}: parse error. Not overwriting.`)}if(!M(o))throw new Error(`Invalid existing OpenCode config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Mt(e,t){if(!M(e))return!1;let o=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(o)&&o.length===2&&o[0]===t&&o[1]==="mcp"}function ne(e,t,o,n){let r=Wn(Ht(e),"opencode.jsonc"),s=At(r)?r:void 0,i=Et(e),c=i.mcp;if(c!==void 0&&!M(c))throw new Error(`Invalid existing OpenCode config: mcp must be an object in ${e}.`);let l=M(c)?{...c}:{},a=l[o];if(Mt(a,t)&&!n)return{installed:!0,changed:!1,preservedJsonc:s};l[o]={type:"local",command:[t,"mcp"],enabled:!0};let u={...i,mcp:l};Yn(e,u);let p=Et(e);if(!M(p.mcp)||!Mt(p.mcp[o],t))throw new Error(`OpenCode MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0,preservedJsonc:s}}function _t(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",n=e.scope??"global";if(e.configFile)return{...ne(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:[t,"mcp"]};if(n==="both"){let i=le(),c=ae({cwd:e.cwd}),l=ne(i,t,o,e.force??!1),a=ne(c,t,o,e.force??!1);return{installed:!0,changed:l.changed||a.changed,configFile:i,serverName:o,command:[t,"mcp"],preservedJsonc:l.preservedJsonc??a.preservedJsonc}}let r=n==="project"?ae({cwd:e.cwd}):le();return{...ne(r,t,o,e.force??!1),configFile:r,serverName:o,command:[t,"mcp"]}}import{existsSync as Xn,mkdirSync as Dt,readFileSync as Vn,writeFileSync as $t}from"node:fs";import{homedir as Jt}from"node:os";import{dirname as Gt,join as Ie}from"node:path";function zn(e){let t=[],o=/"((?:\\.|[^"\\])*)"|'([^']*)'/g,n;for(;n=o.exec(e);){let r=n[1]??n[2]??"";try{t.push(n[1]!==void 0?JSON.parse(`"${r}"`):r)}catch{t.push(r)}}return t}function Lt(e={}){let t=e.configFile??Ie(process.env.CODEX_HOME??Ie(Jt(),".codex"),"config.toml"),o=e.previousFile??Ie(Jt(),".config","toolnet-memory","codex-notify-previous.json");Dt(Gt(t),{recursive:!0}),Dt(Gt(o),{recursive:!0});let n=Xn(t)?Vn(t,"utf8"):"",r=e.binary??"toolnet-memory",s=`notify = [${JSON.stringify(r)}, "session:codex-notify"]`,i=n.split(`
`),c=i.findIndex(g=>/^\s*\[/.test(g));c<0&&(c=i.length);let l=-1,a=-1;for(let g=0;g<c;g+=1)if(/^\s*notify\s*=/.test(i[g])){if(l=g,a=g,i[g].includes("[")&&!i[g].includes("]"))for(;a+1<c&&(a+=1,!i[a].includes("]")););break}let u=[];if(l>=0){let g=i.slice(l,a+1).join(`
`);u=zn(g),i.splice(l,a-l+1,s)}else c=i.findIndex(g=>/^\s*\[/.test(g)),c<0&&(c=i.length),i.splice(c,0,s);let p=u.length>=2&&u[u.length-1]==="session:codex-notify";return u.length>0&&!p&&$t(o,JSON.stringify(u,null,2)+`
`,{encoding:"utf8",mode:384}),n=i.join(`
`),n.endsWith(`
`)||(n+=`
`),$t(t,n,{encoding:"utf8",mode:384}),{configFile:t,previousFile:o,preservedPrevious:u.length>0&&!p}}import{existsSync as Qn,mkdirSync as Zn,readFileSync as er,writeFileSync as tr}from"node:fs";import{homedir as or}from"node:os";import{dirname as nr,join as Kt}from"node:path";function rr(e){return`'${e.replace(/'/g,"'\\''")}'`}function Ut(e={}){let t=e.hooksFile??Kt(process.env.CODEX_HOME??Kt(or(),".codex"),"hooks.json");Zn(nr(t),{recursive:!0});let o={};if(Qn(t))try{o=JSON.parse(er(t,"utf8"))}catch(c){throw new Error(`Invalid existing Codex hooks.json: ${c instanceof Error?c.message:String(c)}`)}let n=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=n;let s=(Array.isArray(n.SessionStart)?n.SessionStart:[]).filter(c=>{try{return!JSON.stringify(c).includes("session:codex-context")}catch{return!0}}),i=e.binary??"toolnet-memory";return s.push({matcher:"startup|resume|clear|compact",hooks:[{type:"command",command:`${rr(i)} session:codex-context`,timeout:15,additionalContextLimit:1e3,statusMessage:"Loading ToolNet project continuity"}]}),n.SessionStart=s,tr(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),t}import{spawnSync as ir}from"node:child_process";function ve(e,t){return ir(e,t,{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}function Bt(e,t){let o=ve(e,["mcp","get",t,"--json"]);if(o.status!==0||!o.stdout)return null;try{return JSON.parse(o.stdout)}catch{return null}}function qt(e,t){return e.enabled!==!1&&e.transport?.type==="stdio"&&e.transport?.command===t&&Array.isArray(e.transport?.args)&&e.transport?.args.length===1&&e.transport.args[0]==="mcp"}function Wt(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.codexBinary??"codex",n=e.serverName??"toolnet-memory",r=Bt(o,n);if(r&&qt(r,t))return{installed:!0,changed:!1,serverName:n,command:t,args:["mcp"]};if(r){let c=ve(o,["mcp","remove",n]);if(c.status!==0)return{installed:!1,changed:!1,serverName:n,command:t,args:["mcp"],error:(c.stderr||c.stdout||"Unable to remove old ToolNet MCP configuration.").trim()}}let s=ve(o,["mcp","add",n,"--",t,"mcp"]);if(s.status!==0)return{installed:!1,changed:!1,serverName:n,command:t,args:["mcp"],error:(s.stderr||s.stdout||"Unable to register ToolNet MCP.").trim()};let i=Bt(o,n);return!i||!qt(i,t)?{installed:!1,changed:!0,serverName:n,command:t,args:["mcp"],error:"Codex accepted MCP registration but verification did not match expected ToolNet command."}:{installed:!0,changed:!0,serverName:n,command:t,args:["mcp"]}}import{existsSync as sr,mkdirSync as cr,readFileSync as lr,renameSync as ar,rmSync as ur,writeFileSync as pr}from"node:fs";import{dirname as gr}from"node:path";function A(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function fr(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function dr(e){if(!sr(e))return{};let t;try{t=JSON.parse(lr(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude settings.json: ${o instanceof Error?o.message:String(o)}`)}if(!A(t))throw new Error("Invalid existing Claude settings.json: root must be a JSON object.");return t}function Se(e){if(e===void 0)return[];if(!Array.isArray(e))throw new Error("Invalid existing Claude settings.json: hook event must be an array.");let t=[];for(let o of e){if(!A(o)){t.push(o);continue}let n=o.hooks;if(!Array.isArray(n)){t.push(o);continue}let r=n.filter(s=>{if(!A(s))return!0;let i=s.command;return!(typeof i=="string"&&i.includes("session:claude-hook"))});r.length!==0&&t.push({...o,hooks:r})}return t}function xe(e){return{type:"command",command:e,timeout:10}}function mr(e,t){cr(gr(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{pr(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),ar(o,e)}finally{ur(o,{force:!0})}}function Yt(e={}){let t=e.settingsFile??ze(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=dr(t),r=n.hooks;if(r!==void 0&&!A(r))throw new Error("Invalid existing Claude settings.json: hooks must be an object.");let s=A(r)?{...r}:{},i=`${fr(o)} session:claude-hook`,c=Se(s.SessionStart);c.push({matcher:"startup|resume|clear|compact",hooks:[xe(i)]}),s.SessionStart=c;let l=Se(s.PostToolUse);l.push({matcher:"Edit|Write",hooks:[xe(i)]}),s.PostToolUse=l;let a=Se(s.Stop);a.push({hooks:[xe(i)]}),s.Stop=a;let u={...n,hooks:s},p=JSON.stringify(n),g=JSON.stringify(u);return p===g?{settingsFile:t,changed:!1}:(mr(t,u),{settingsFile:t,changed:!0})}import{existsSync as yr,mkdirSync as hr,readFileSync as kr,renameSync as br,rmSync as Cr,writeFileSync as Or}from"node:fs";import{dirname as jr}from"node:path";function H(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Xt(e){if(!yr(e))return{};let t;try{t=JSON.parse(kr(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude Code config: ${o instanceof Error?o.message:String(o)}`)}if(!H(t))throw new Error("Invalid existing Claude Code config: root must be a JSON object.");return t}function Vt(e,t){if(!H(e))return!1;let o=e.args;return e.type==="stdio"&&e.command===t&&Array.isArray(o)&&o.length===1&&o[0]==="mcp"}function wr(e,t){hr(jr(e),{recursive:!0});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Or(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),br(o,e)}finally{Cr(o,{force:!0})}}function zt(e={}){let t=e.stateFile??Qe(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=Xt(t),s=r.mcpServers;if(s!==void 0&&!H(s))throw new Error("Invalid existing Claude Code config: mcpServers must be an object.");let i=H(s)?{...s}:{},c=i[n];if(Vt(c,o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:[o,"mcp"],repaired:!1};let l=c!==void 0;i[n]={type:"stdio",command:o,args:["mcp"]},wr(t,{...r,mcpServers:i});let u=Xt(t).mcpServers;if(!H(u)||!Vt(u[n],o))throw new Error("Claude Code MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:[o,"mcp"],repaired:l}}function Qt(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=Yt({binary:t,settingsFile:e.settingsFile}),n=zt({binary:t,stateFile:e.stateFile});return{hooks:o,mcp:n,files:[o.settingsFile,n.configFile]}}import{existsSync as Ir,mkdirSync as vr,readFileSync as Sr,renameSync as xr,rmSync as Fr,writeFileSync as Rr}from"node:fs";import{dirname as Nr}from"node:path";var x="ToolNet Memory - ";function to(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Pr(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function Zt(e){if(!Ir(e))return{};let t=Sr(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro hooks file at ${e}: parse error. Not overwriting.`)}if(!to(o))throw new Error(`Invalid existing Kiro hooks file at ${e}: root must be a JSON object. Not overwriting.`);return o}function eo(e){return to(e)?typeof e.name=="string"&&e.name.startsWith(x):!1}function _(e){return{type:"command",command:e}}function Tr(e){return[{name:`${x}Session Start`,description:"Inject compact local ToolNet continuity and capture Kiro session activation.",trigger:"SessionStart",action:_(e),timeout:10,enabled:!0},{name:`${x}Prompt Continuity`,description:"Capture prompts and refresh ToolNet guidance only for resume/continue requests.",trigger:"UserPromptSubmit",action:_(e),timeout:10,enabled:!0},{name:`${x}Raw History Guard`,description:"Prevent Kiro from reconstructing continuity from raw ToolNet/agent session history.",trigger:"PreToolUse",matcher:"*",action:_(e),timeout:10,enabled:!0},{name:`${x}Tool Capture`,description:"Capture durable tool activity while filtering noisy read-only events.",trigger:"PostToolUse",matcher:"*",action:_(e),timeout:15,enabled:!0},{name:`${x}Final Flush`,description:"Flush pending Kiro WAL events when the assistant finishes a turn.",trigger:"Stop",action:_(e),timeout:30,enabled:!0}]}function Er(e,t){vr(Nr(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Rr(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),xr(o,e)}finally{Fr(o,{force:!0})}}function re(e,t,o){let n=Zt(e);if(n.version!==void 0&&n.version!=="v1")throw new Error(`Unsupported existing Kiro hooks version: ${String(n.version)}`);let r=n.hooks;if(r!==void 0&&!Array.isArray(r))throw new Error("Invalid existing Kiro hooks file: hooks must be an array.");let s=Array.isArray(r)?r.filter(a=>!eo(a)):[],i=Tr(t),c={...n,version:"v1",hooks:[...s,...i]};if(!o&&JSON.stringify(n)===JSON.stringify(c))return{changed:!1,hookCount:i.length};Er(e,c);let l=Zt(e);if(l.version!=="v1"||!Array.isArray(l.hooks)||l.hooks.filter(eo).length!==i.length)throw new Error("Kiro hooks were written but verification failed.");return{changed:!0,hookCount:i.length}}function oo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=`${Pr(t)} session:kiro-hook`;if(e.hooksFile){let i=re(e.hooksFile,n,e.force??!1);return{hooksFile:e.hooksFile,...i}}if(o==="both"){let i=de(),c=me({cwd:e.cwd}),l=re(i,n,e.force??!1),a=re(c,n,e.force??!1);return{hooksFile:i,changed:l.changed||a.changed,hookCount:l.hookCount}}let r=o==="project"?me({cwd:e.cwd}):de(),s=re(r,n,e.force??!1);return{hooksFile:r,...s}}import{existsSync as Mr,mkdirSync as Ar,readFileSync as Hr,renameSync as _r,rmSync as Dr,writeFileSync as $r}from"node:fs";import{dirname as Jr}from"node:path";function D(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function no(e){if(!Mr(e))return{};let t=Hr(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro MCP config at ${e}: parse error. Not overwriting.`)}if(!D(o))throw new Error(`Invalid existing Kiro MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function ro(e,t){return D(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&e.disabled===!1:!1}function Gr(e,t){Ar(Jr(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{$r(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),_r(o,e)}finally{Dr(o,{force:!0})}}function ie(e,t,o,n){let r=no(e),s=r.mcpServers;if(s!==void 0&&!D(s))throw new Error(`Invalid existing Kiro MCP config: mcpServers must be an object in ${e}.`);let i=D(s)?{...s}:{},c=i[o];if(ro(c,t)&&!n)return{installed:!0,changed:!1};i[o]={command:t,args:["mcp"],disabled:!1};let l={...r,mcpServers:i};Gr(e,l);let u=no(e).mcpServers;if(!D(u)||!ro(u[o],t))throw new Error(`Kiro MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function io(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",n=e.scope??"global";if(e.configFile)return{...ie(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(n==="both"){let i=B(),c=fe({cwd:e.cwd}),l=ie(i,t,o,e.force??!1),a=ie(c,t,o,e.force??!1);return{installed:!0,changed:l.changed||a.changed,configFile:i,serverName:o,command:t,args:["mcp"]}}let r=n==="project"?fe({cwd:e.cwd}):B();return{...ie(r,t,o,e.force??!1),configFile:r,serverName:o,command:t,args:["mcp"]}}function so(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=io({binary:t,configFile:e.configFile,scope:e.scope,cwd:e.cwd,force:e.force}),n=oo({binary:t,hooksFile:e.hooksFile,scope:e.scope,cwd:e.cwd,force:e.force});return{installed:o.installed,changed:o.changed||n.changed,mcp:o,hooks:n,files:[o.configFile,n.hooksFile]}}import{existsSync as Lr,mkdirSync as Kr,readFileSync as Ur,renameSync as Br,rmSync as qr,writeFileSync as Wr}from"node:fs";import{dirname as Yr}from"node:path";function Fe(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Xr(e){if(!Lr(e))return{};let t=Ur(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: parse error. Not overwriting.`)}if(!Fe(o))throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Vr(e,t){Kr(Yr(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Wr(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Br(o,e)}finally{qr(o,{force:!0})}}function co(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??tt({cwd:e.cwd}),n=Xr(o),r="toolnet-memory";if(Fe(n.mcpServers)&&n.mcpServers[r]!=null&&!e.force)return{installed:!0,changed:!1,configFile:o};let i=Fe(n.mcpServers)?{...n.mcpServers}:{};return i[r]={command:t,args:["mcp"]},n.mcpServers=i,Vr(o,n),{installed:!0,changed:!0,configFile:o}}function lo(e={}){let t=e.binary??"toolnet-memory",o=co({binary:t,configFile:e.configFile,force:e.force,cwd:e.cwd});return{installed:o.installed,changed:o.changed,mcp:{...o,configured:o.installed},files:[o.configFile]}}import{mkdirSync as ri,existsSync as ii}from"node:fs";import{dirname as si}from"node:path";import{existsSync as zr,mkdirSync as Qr,readFileSync as Zr,renameSync as ei,rmSync as ti,writeFileSync as oi}from"node:fs";import{dirname as ni}from"node:path";function d(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function j(e,t){if(!zr(e))return{};let o=Zr(e,"utf8").trim();if(!o)return{};let n;try{n=JSON.parse(o)}catch(r){throw new Error(`Invalid existing ${t} MCP config: ${r instanceof Error?r.message:String(r)}`)}if(!d(n))throw new Error(`Invalid existing ${t} MCP config: root must be a JSON object.`);return n}function F(e,t){Qr(ni(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{oi(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),ei(o,e)}finally{ti(o,{force:!0})}}function ao(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??ke(),n=si(o);ii(n)||ri(n,{recursive:!0});let r=j(o,"Kilo"),s=r.mcp;if(s!==void 0&&!d(s))throw new Error("Invalid existing Kilo config: mcp must be an object.");let i=d(s)?{...s}:{},c="toolnet-memory";return d(i[c])&&!e.force?{installed:!0,changed:!1,configFile:o,configured:!0}:(i[c]={type:"local",command:[t,"mcp"],enabled:!0,timeout:1e4},F(o,{...r,mcp:i}),{installed:!0,changed:!0,configFile:o,configured:!0})}function uo(e={}){let t=e.binary??"toolnet-memory",o=ao({binary:t,configFile:e.configFile,force:e.force});return{installed:o.installed,changed:o.changed,mcp:o,files:[o.configFile]}}import{existsSync as ci,mkdirSync as li,readFileSync as ai,renameSync as ui,rmSync as pi,writeFileSync as gi}from"node:fs";import{dirname as fi}from"node:path";function f(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function k(e,t){if(!ci(e))return{};let o=ai(e,"utf8").trim();if(!o)return{};let n;try{n=JSON.parse(o)}catch(r){throw new Error(`Invalid existing ${t} hooks file: ${r instanceof Error?r.message:String(r)}`)}if(!f(n))throw new Error(`Invalid existing ${t} hooks file: root must be a JSON object.`);return n}function R(e,t){li(fi(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{gi(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),ui(o,e)}finally{pi(o,{force:!0})}}function Re(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}var $=[["sessionStart",10],["beforeSubmitPrompt",10],["preToolUse",10],["postToolUse",15],["afterAgentResponse",15],["stop",30]];function po(e){return f(e)&&typeof e.command=="string"&&e.command.includes("session:cursor-hook")}function di(e,t,o){let r={type:"command",command:`TOOLNET_HOOK_EVENT=${Re(e)} ${Re(t)} session:cursor-hook`,timeout:o};return e==="preToolUse"&&(r.matcher=".*"),r}function Ne(e={}){let t=e.hooksFile??Y(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=k(t,"Cursor");if(n.version!==void 0&&n.version!==1)throw new Error(`Unsupported existing Cursor hooks version: ${String(n.version)}`);let r=n.hooks;if(r!==void 0&&!f(r))throw new Error("Invalid existing Cursor hooks file: hooks must be an object.");let s=f(r)?{...r}:{};for(let[a,u]of $){let p=s[a];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing Cursor hooks file: hooks.${a} must be an array.`);let g=Array.isArray(p)?p.filter(T=>!po(T)):[];s[a]=[...g,di(a,o,u)]}let i={...n,version:1,hooks:s};if(JSON.stringify(n)===JSON.stringify(i))return{hooksFile:t,changed:!1,hookCount:$.length};R(t,i);let c=k(t,"Cursor");if(c.version!==1||!f(c.hooks))throw new Error("Cursor hooks were written but verification failed.");let l=0;for(let[a]of $){let u=c.hooks[a];if(!Array.isArray(u))throw new Error("Cursor hooks were written but verification failed.");l+=u.filter(po).length}if(l!==$.length)throw new Error("Cursor hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:$.length}}function go(e,t){return d(e)?(e.type===void 0||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function Pe(e={}){let t=e.configFile??W(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=j(t,"Cursor"),s=r.mcpServers;if(s!==void 0&&!d(s))throw new Error("Invalid existing Cursor MCP config: mcpServers must be an object.");let i=d(s)?{...s}:{};if(go(i[n],o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};i[n]={type:"stdio",command:o,args:["mcp"]},F(t,{...r,mcpServers:i});let l=j(t,"Cursor").mcpServers;if(!d(l)||!go(l[n],o))throw new Error("Cursor MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}import{mkdirSync as mi,readFileSync as fo,renameSync as yi,rmSync as hi,writeFileSync as ki}from"node:fs";import{dirname as bi}from"node:path";var Te=`---
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
  - \`.toolnet/runtime/sources/** and legacy .toolnet/sessions/**\`
  - ToolNet raw \`events.jsonl\`
  - ToolNet raw \`state.json\`
  - another coding agent's private transcript/history files.
- After continuity is recovered, verify current repository source and git
  state before changing code.
- Do not ask the user to repeat project context that ToolNet already provides.

Current repository evidence overrides stale memory.
`;function Ci(e,t){mi(bi(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{ki(o,t,{encoding:"utf8",mode:384}),yi(o,e)}finally{hi(o,{force:!0})}}function mo(e){let t=e.ruleFile??ct(e.projectRoot);try{if(fo(t,"utf8")===Te)return{ruleFile:t,changed:!1}}catch{}if(Ci(t,Te),fo(t,"utf8")!==Te)throw new Error("Cursor ToolNet project rule was written but verification failed.");return{ruleFile:t,changed:!0}}import{spawnSync as Oi}from"node:child_process";import{existsSync as N,statSync as ji}from"node:fs";import{dirname as wi,join as Ii,parse as vi,resolve as Me}from"node:path";function yo(e){let t=Me(e);if(!N(t))throw new Error(`Project path does not exist: ${t}`);if(!ji(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);return t}function se(e){return Ii(e,".toolnet","project.json")}function Si(e){let t=Me(e),o=vi(t).root;for(;;){if(N(se(t)))return t;if(t===o)return;let n=wi(t);if(n===t)return;t=n}}function Ee(e){let t=Oi("git",["rev-parse","--show-toplevel"],{cwd:e,encoding:"utf8",timeout:5e3});if(t.status!==0)return;let o=t.stdout.trim();return o?Me(o):void 0}function b(e={}){let t=yo(e.cwd??process.cwd());if(e.project){let r=yo(e.project),s=se(r),i=Ee(r);return{root:r,source:"explicit",eligible:!0,toolnetProject:N(s),manifestFile:N(s)?s:void 0,gitRoot:i}}let o=Si(t);if(o){let r=se(o);return{root:o,source:"toolnet",eligible:!0,toolnetProject:!0,manifestFile:r,gitRoot:Ee(o)}}let n=Ee(t);if(n){let r=se(n);return{root:n,source:"git",eligible:!0,toolnetProject:N(r),manifestFile:N(r)?r:void 0,gitRoot:n}}return{root:t,source:"cwd",eligible:!1,toolnetProject:!1}}function Co(e,t={}){let o=[],n=e.indexOf("--scope");if(n>=0){let s=e[n+1];if(s!=="global"&&s!=="project"&&s!=="both")throw new Error(`Invalid --scope value: ${String(s)}`);o.push(s)}e.includes("--global")&&o.push("global"),e.includes("--both")&&o.push("both");let r=Array.from(new Set(o));if(r.length>1)throw new Error(`Conflicting integration scopes: ${r.join(", ")}`);return r[0]??t.defaultScope??"global"}function ho(e,t){return{install:e,effective:t}}function C(e,t){return{surface:e,global:ho(t.globalInstall,t.effective==="global"||t.effective==="both"),project:ho(t.projectInstall,t.effective==="project"||t.effective==="both"),effective:t.effective,risk:t.risk??"none",dedupeRequired:t.dedupeRequired??!1,trustRequired:t.trustRequired??t.projectInstall,note:t.note}}function xi(e){return{mcp:C("mcp",{globalInstall:!0,projectInstall:!1,effective:"global"}),hooks:C("hooks",{globalInstall:!0,projectInstall:!1,effective:"global"}),work:C("work",{globalInstall:e==="grok",projectInstall:!1,effective:e==="grok"?"global":"none",note:e==="grok"?"Grok supports a global ToolNet continuity skill.":"Cursor/Copilot work instructions remain project-scoped."})}}function ko(e){return{mcp:C("mcp",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),hooks:C("hooks",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),work:C("work",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!1,note:e==="cursor"?"Use .cursor/rules/toolnet-memory.mdc.":e==="copilot"?"Use .github/instructions/toolnet-memory.instructions.md.":"Use .grok/skills/toolnet-continuity/SKILL.md."})}}function bo(e){return{mcp:C("mcp",{globalInstall:!0,projectInstall:!0,effective:"project",risk:e==="cursor"?"precedence-unverified":"shadowed-global",trustRequired:!0,note:e==="cursor"?"Project ToolNet MCP is the intended effective definition; native same-name precedence must be E2E certified before release.":"Global remains useful outside the project; same-name project definition wins inside the project."}),hooks:C("hooks",{globalInstall:!0,projectInstall:!0,effective:"both",risk:"additive-duplicate",dedupeRequired:!0,trustRequired:!0,note:"Global and project hook sources can both execute for the same native event."}),work:C("work",{globalInstall:e==="grok",projectInstall:!0,effective:"project",risk:e==="grok"?"shadowed-global":"none",trustRequired:!1,note:e==="cursor"?"Project rule is authoritative.":e==="copilot"?"Project instruction is authoritative.":"Project skill shadows the same-name global skill inside the project."})}}function P(e){let{agent:t,scope:o,project:n}=e;return(o==="project"||o==="both")&&(!n||!n.eligible)?{agent:t,requestedScope:o,project:n,surfaces:o==="both"?bo(t):ko(t),canInstall:!1,reason:"Project scope requires an explicit project, existing ToolNet project, or Git repository root."}:{agent:t,requestedScope:o,project:n,surfaces:o==="global"?xi(t):o==="project"?ko(t):bo(t),canInstall:!0}}function Oo(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.rule?.changed)}function jo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=o==="global"?void 0:b({project:e.projectRoot}),r=P({agent:"cursor",scope:o,project:n});if(!r.canInstall)throw new Error(r.reason??"Cursor project integration scope cannot be resolved.");let s,i;if((r.surfaces.mcp.global.install||r.surfaces.hooks.global.install||r.surfaces.work.global.install)&&(s={},r.surfaces.mcp.global.install&&(s.mcp=Pe({binary:t,configFile:e.configFile??W()})),r.surfaces.hooks.global.install&&(s.hooks=Ne({binary:t,hooksFile:e.hooksFile??Y()}))),r.surfaces.mcp.project.install||r.surfaces.hooks.project.install||r.surfaces.work.project.install){if(!n?.eligible)throw new Error("Cursor project integration requires an eligible project root.");i={},r.surfaces.mcp.project.install&&(i.mcp=Pe({binary:t,configFile:e.projectConfigFile??it(n.root)})),r.surfaces.hooks.project.install&&(i.hooks=Ne({binary:t,hooksFile:e.projectHooksFile??st(n.root)})),r.surfaces.work.project.install&&(i.rule=mo({projectRoot:n.root,ruleFile:e.projectRuleFile}))}let c=i?.mcp??s?.mcp,l=i?.hooks??s?.hooks;if(!c||!l)throw new Error("Cursor integration did not produce an effective MCP/hooks installation.");let a=Array.from(new Set([s?.mcp?.configFile,s?.hooks?.hooksFile,s?.rule?.ruleFile,i?.mcp?.configFile,i?.hooks?.hooksFile,i?.rule?.ruleFile].filter(u=>typeof u=="string")));return{installed:!0,changed:Oo(s)||Oo(i),scope:o,plan:r,project:n,global:s,projectScope:i,mcp:c,hooks:l,rule:i?.rule,files:a}}var J=[["sessionStart",10],["userPromptSubmitted",10],["userPromptTransformed",10],["preToolUse",10],["postToolUse",15],["agentStop",30]];function Fi(e){if(typeof e.command=="string")return e.command;if(typeof e.bash=="string")return e.bash}function wo(e){return f(e)&&Fi(e)?.includes("session:copilot-hook")===!0}function Ri(e,t,o){let n={type:"command",command:`${t} session:copilot-hook`,env:{TOOLNET_HOOK_EVENT:e},timeoutSec:o};return e==="preToolUse"&&(n.matcher=".*"),n}function Ae(e={}){let t=e.hooksFile??V(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=k(t,"GitHub Copilot CLI");if(n.version!==void 0&&n.version!==1)throw new Error(`Unsupported existing GitHub Copilot CLI hooks version: ${String(n.version)}`);let r=n.hooks;if(r!==void 0&&!f(r))throw new Error("Invalid existing GitHub Copilot CLI hooks file: hooks must be an object.");let s=f(r)?{...r}:{};for(let[a,u]of J){let p=s[a];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing GitHub Copilot CLI hooks file: hooks.${a} must be an array.`);let g=Array.isArray(p)?p.filter(T=>!wo(T)):[];s[a]=[...g,Ri(a,o,u)]}let i={...n,version:1,hooks:s};if(JSON.stringify(n)===JSON.stringify(i))return{hooksFile:t,changed:!1,hookCount:J.length};R(t,i);let c=k(t,"GitHub Copilot CLI");if(c.version!==1||!f(c.hooks))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");let l=0;for(let[a]of J){let u=c.hooks[a];if(!Array.isArray(u))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");l+=u.filter(wo).length}if(l!==J.length)throw new Error("GitHub Copilot CLI hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:J.length}}function Io(e,t){return d(e)?(e.type===void 0||e.type==="local"||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&Array.isArray(e.tools)&&e.tools.length===1&&e.tools[0]==="*":!1}function He(e={}){let t=e.configFile??X(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=j(t,"GitHub Copilot CLI"),s=r.mcpServers;if(s!==void 0&&!d(s))throw new Error("Invalid existing GitHub Copilot CLI MCP config: mcpServers must be an object.");let i=d(s)?{...s}:{};if(Io(i[n],o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};i[n]={type:"stdio",command:o,args:["mcp"],tools:["*"]},F(t,{...r,mcpServers:i});let l=j(t,"GitHub Copilot CLI").mcpServers;if(!d(l)||!Io(l[n],o))throw new Error("GitHub Copilot CLI MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}import{mkdirSync as Ni,readFileSync as vo,renameSync as Pi,rmSync as Ti,writeFileSync as Ei}from"node:fs";import{dirname as Mi}from"node:path";var _e=`---
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
  - \`.toolnet/runtime/sources/** and legacy .toolnet/sessions/**\`
  - ToolNet raw \`events.jsonl\`
  - ToolNet raw \`state.json\`
  - another coding agent's private transcript/history files.
- After continuity is recovered, verify current repository source and git
  state before changing code.
- Do not ask the user to repeat context ToolNet already provides.

Current repository evidence overrides stale memory.
`;function Ai(e,t){Ni(Mi(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Ei(o,t,{encoding:"utf8",mode:384}),Pi(o,e)}finally{Ti(o,{force:!0})}}function So(e){let t=e.instructionFile??pt(e.projectRoot);try{if(vo(t,"utf8")===_e)return{instructionFile:t,changed:!1}}catch{}if(Ai(t,_e),vo(t,"utf8")!==_e)throw new Error("Copilot ToolNet project instruction verification failed.");return{instructionFile:t,changed:!0}}function xo(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.instruction?.changed)}function Fo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=o==="global"?void 0:b({project:e.projectRoot}),r=P({agent:"copilot",scope:o,project:n});if(!r.canInstall)throw new Error(r.reason??"Copilot project integration scope cannot be resolved.");let s,i;if((r.surfaces.mcp.global.install||r.surfaces.hooks.global.install||r.surfaces.work.global.install)&&(s={},r.surfaces.mcp.global.install&&(s.mcp=He({binary:t,configFile:e.configFile??X()})),r.surfaces.hooks.global.install&&(s.hooks=Ae({binary:t,hooksFile:e.hooksFile??V()}))),r.surfaces.mcp.project.install||r.surfaces.hooks.project.install||r.surfaces.work.project.install){if(!n?.eligible)throw new Error("Copilot project integration requires an eligible project root.");i={},r.surfaces.mcp.project.install&&(i.mcp=He({binary:t,configFile:e.projectConfigFile??at(n.root)})),r.surfaces.hooks.project.install&&(i.hooks=Ae({binary:t,hooksFile:e.projectHooksFile??ut(n.root)})),r.surfaces.work.project.install&&(i.instruction=So({projectRoot:n.root,instructionFile:e.projectInstructionFile}))}let c=i?.mcp??s?.mcp,l=i?.hooks??s?.hooks;if(!c||!l)throw new Error("Copilot integration did not produce effective MCP/hooks.");let a=Array.from(new Set([s?.mcp?.configFile,s?.hooks?.hooksFile,s?.instruction?.instructionFile,i?.mcp?.configFile,i?.hooks?.hooksFile,i?.instruction?.instructionFile].filter(u=>typeof u=="string")));return{installed:!0,changed:xo(s)||xo(i),scope:o,plan:r,project:n,global:s,projectScope:i,mcp:c,hooks:l,instruction:i?.instruction,files:a}}import{existsSync as Hi,mkdirSync as _i,readFileSync as Ro,renameSync as Di,rmSync as $i,writeFileSync as Ji}from"node:fs";import{dirname as Gi}from"node:path";var De=`---
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
   - \`.toolnet/runtime/sources/** and legacy .toolnet/sessions/**\`
   - ToolNet \`events.jsonl\` or \`state.json\`
   - raw transcripts
   - another coding agent's private session/history files
6. After ToolNet continuity is known, verify current git and repository
   source truth before changing code.
7. Do not ask the user to repeat context ToolNet already provides.

Current repository evidence overrides stale memory.
`;function Li(e,t){_i(Gi(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Ji(o,t,{encoding:"utf8",mode:384}),Di(o,e)}finally{$i(o,{force:!0})}}function $e(e={}){let t=e.skillFile??ee();if(Hi(t)&&Ro(t,"utf8")===De)return{skillFile:t,changed:!1};if(Li(t,De),Ro(t,"utf8")!==De)throw new Error("Grok ToolNet continuity skill was written but verification failed.");return{skillFile:t,changed:!0}}var G=[["SessionStart",10],["UserPromptSubmit",10],["PreToolUse",10],["PostToolUse",15],["Stop",30]];function No(e){return!f(e)||!Array.isArray(e.hooks)?!1:e.hooks.some(t=>f(t)&&typeof t.command=="string"&&t.command.includes("session:grok-hook"))}function Ki(e,t,o){let n={hooks:[{type:"command",command:`${t} session:grok-hook`,timeout:o,env:{TOOLNET_HOOK_EVENT:e}}]};return e==="PreToolUse"&&(n.matcher=".*"),n}function Je(e={}){let t=e.hooksFile??Z(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=k(t,"Grok Build"),r=n.hooks;if(r!==void 0&&!f(r))throw new Error("Invalid existing Grok Build hooks file: hooks must be an object.");let s=f(r)?{...r}:{};for(let[a,u]of G){let p=s[a];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing Grok Build hooks file: hooks.${a} must be an array.`);let g=Array.isArray(p)?p.filter(T=>!No(T)):[];s[a]=[...g,Ki(a,o,u)]}let i={...n,hooks:s};if(JSON.stringify(n)===JSON.stringify(i))return{hooksFile:t,changed:!1,hookCount:G.length};R(t,i);let c=k(t,"Grok Build");if(!f(c.hooks))throw new Error("Grok Build hooks were written but verification failed.");let l=0;for(let[a]of G){let u=c.hooks[a];if(!Array.isArray(u))throw new Error("Grok Build hooks were written but verification failed.");l+=u.filter(No).length}if(l!==G.length)throw new Error("Grok Build hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:G.length}}import{existsSync as Ui,mkdirSync as Bi,readFileSync as qi,renameSync as Wi,rmSync as Yi,writeFileSync as Xi}from"node:fs";import{dirname as Vi}from"node:path";function Po(e){return Ui(e)?qi(e,"utf8"):""}function zi(e,t){Bi(Vi(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Xi(o,t,{encoding:"utf8",mode:384}),Wi(o,e)}finally{Yi(o,{force:!0})}}function Ge(e){return e.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t")}function Qi(e){return`[mcp_servers."${Ge(e)}"]`}function Zi(e,t){return[Qi(e),`command = "${Ge(t)}"`,'args = ["mcp"]',"enabled = true"].join(`
`)}function es(e){let t=e.trim();return t.startsWith("[")&&t.includes("]")}function ce(e){return e.trim().replace(/\s+/g,"")}function ts(e){return new Set([ce(`[mcp_servers.${e}]`),ce(`[mcp_servers."${e}"]`),ce(`[mcp_servers.'${e}']`)])}function Eo(e,t){let o=e.split(/\r?\n/),n=ts(t),r=-1;for(let u=0;u<o.length;u+=1){let p=ce(o[u].replace(/\s+#.*$/,""));if(n.has(p)){r=u;break}}if(r<0)return null;let s=o.length;for(let u=r+1;u<o.length;u+=1)if(es(o[u])){s=u;break}let i=[],c=0;for(let u of o)i.push(c),c+=u.length+1;let l=i[r]??0,a=s>=o.length?e.length:i[s]??e.length;return{start:l,end:a}}function os(e,t,o){let n=`${Zi(t,o)}
`,r=Eo(e,t);if(r){let s=e.slice(0,r.start),i=e.slice(r.end);return`${s}${n}${i.replace(/^\n+/,"")}`}return e.trim()?`${e.replace(/\s*$/,"")}

${n}`:n}function To(e,t,o){let n=Eo(e,t);if(!n)return!1;let r=e.slice(n.start,n.end);return r.includes(`command = "${Ge(o)}"`)&&/args\s*=\s*\[\s*"mcp"\s*\]/.test(r)&&/enabled\s*=\s*true/.test(r)}function Le(e={}){let t=e.configFile??Q(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=Po(t);if(To(r,n,o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};let s=os(r,n,o);zi(t,s);let i=Po(t);if(!To(i,n,o))throw new Error("Grok Build MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}function Mo(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.skill?.changed)}function Ao(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=o==="global"?void 0:b({project:e.projectRoot}),r=P({agent:"grok",scope:o,project:n});if(!r.canInstall)throw new Error(r.reason??"Grok project integration scope cannot be resolved.");let s,i;if((r.surfaces.mcp.global.install||r.surfaces.hooks.global.install||r.surfaces.work.global.install)&&(s={},r.surfaces.mcp.global.install&&(s.mcp=Le({binary:t,configFile:e.configFile??Q()})),r.surfaces.hooks.global.install&&(s.hooks=Je({binary:t,hooksFile:e.hooksFile??Z()})),r.surfaces.work.global.install&&(s.skill=$e({skillFile:e.skillFile??ee()}))),r.surfaces.mcp.project.install||r.surfaces.hooks.project.install||r.surfaces.work.project.install){if(!n?.eligible)throw new Error("Grok project integration requires an eligible project root.");i={},r.surfaces.mcp.project.install&&(i.mcp=Le({binary:t,configFile:e.projectConfigFile??ft(n.root)})),r.surfaces.hooks.project.install&&(i.hooks=Je({binary:t,hooksFile:e.projectHooksFile??dt(n.root)})),r.surfaces.work.project.install&&(i.skill=$e({skillFile:e.projectSkillFile??mt(n.root)}))}let c=i?.mcp??s?.mcp,l=i?.hooks??s?.hooks,a=i?.skill??s?.skill;if(!c||!l||!a)throw new Error("Grok integration did not produce effective MCP/hooks/skill.");let u=Array.from(new Set([s?.mcp?.configFile,s?.hooks?.hooksFile,s?.skill?.skillFile,i?.mcp?.configFile,i?.hooks?.hooksFile,i?.skill?.skillFile].filter(p=>typeof p=="string")));return{installed:!0,changed:Mo(s)||Mo(i),scope:o,plan:r,project:n,global:s,projectScope:i,mcp:c,hooks:l,skill:a,files:u}}function Ho(e={}){if(e.scope==="global")return{scope:"global",automatic:!1,reason:"explicit-global"};if(e.scope==="project"||e.scope==="both"){let o=b({cwd:e.cwd,project:e.projectRoot});if(!o.eligible)throw new Error(`Explicit ${e.scope} integration requires an explicit project, ToolNet project, or Git repository root.`);return{scope:e.scope,automatic:!1,project:o,reason:e.scope==="project"?"explicit-project":"explicit-both"}}let t=b({cwd:e.cwd,project:e.projectRoot});return t.toolnetProject?{scope:"both",automatic:!0,project:t,reason:"toolnet-project"}:{scope:"global",automatic:!0,reason:"no-toolnet-project"}}function _o(){return bt()}function ns(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[],n=e.detections??_o(),r=new Map(n.map(i=>[i.agent,i.detected])),s=Ho({scope:e.scope,projectRoot:e.projectRoot,cwd:e.cwd});if(!(e.force===!0||r.get("agy")===!0))o.push({agent:"agy",detected:!1,installed:!1,targets:[]});else try{let c=St({binary:t});o.push({agent:"agy",detected:!0,installed:!0,targets:c.files})}catch(c){o.push({agent:"agy",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("opencode")===!0))o.push({agent:"opencode",detected:!1,installed:!1,targets:[]});else try{let c=Tt({binary:t}),l=_t({binary:t});o.push({agent:"opencode",detected:!0,installed:!0,targets:[...c,l.configFile,`mcp:${l.serverName}`]})}catch(c){o.push({agent:"opencode",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("claude")===!0))o.push({agent:"claude",detected:!1,installed:!1,targets:[]});else try{let c=Qt({binary:t});o.push({agent:"claude",detected:!0,installed:!0,targets:[c.hooks.settingsFile,c.mcp.configFile,`mcp:${c.mcp.serverName}`]})}catch(c){o.push({agent:"claude",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("kiro")===!0))o.push({agent:"kiro",detected:!1,installed:!1,targets:[]});else try{let c=so({...e.kiro??{},binary:t});o.push({agent:"kiro",detected:!0,installed:!0,targets:[c.mcp.configFile,`mcp:${c.mcp.serverName}`,c.hooks.hooksFile]})}catch(c){o.push({agent:"kiro",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("cursor")===!0))o.push({agent:"cursor",detected:!1,installed:!1,targets:[]});else try{let c=e.cursor??{},l=jo({...c,binary:t,scope:c.scope??s.scope,projectRoot:c.projectRoot??s.project?.root});o.push({agent:"cursor",detected:!0,installed:!0,scope:l.scope,projectRoot:l.project?.root,targets:[...l.files,`mcp:${l.mcp.serverName}`]})}catch(c){o.push({agent:"cursor",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("copilot")===!0))o.push({agent:"copilot",detected:!1,installed:!1,targets:[]});else try{let c=e.copilot??{},l=Fo({...c,binary:t,scope:c.scope??s.scope,projectRoot:c.projectRoot??s.project?.root});o.push({agent:"copilot",detected:!0,installed:!0,scope:l.scope,projectRoot:l.project?.root,targets:[...l.files,`mcp:${l.mcp.serverName}`]})}catch(c){o.push({agent:"copilot",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("grok")===!0))o.push({agent:"grok",detected:!1,installed:!1,targets:[]});else try{let c=e.grok??{},l=Ao({...c,binary:t,scope:c.scope??s.scope,projectRoot:c.projectRoot??s.project?.root});o.push({agent:"grok",detected:!0,installed:!0,scope:l.scope,projectRoot:l.project?.root,targets:[...l.files,`mcp:${l.mcp.serverName}`]})}catch(c){o.push({agent:"grok",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("toolnet-cli")===!0))o.push({agent:"toolnet-cli",detected:!1,installed:!1,targets:[]});else try{let c=e.toolnetCli??{},l=lo({...c,binary:t});o.push({agent:"toolnet-cli",detected:!0,installed:!0,targets:[l.mcp.configFile]})}catch(c){o.push({agent:"toolnet-cli",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("kilo")===!0))o.push({agent:"kilo",detected:!1,installed:!1,targets:[]});else try{let c=e.kilo??{},l=uo({...c,binary:t});o.push({agent:"kilo",detected:!0,installed:!0,targets:[l.mcp.configFile]})}catch(c){o.push({agent:"kilo",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("codex")===!0))o.push({agent:"codex",detected:!1,installed:!1,targets:[]});else try{let c=Lt({binary:t}),l=Ut({binary:t}),a=Wt({binary:t});if(!a.installed)throw new Error(a.error??"Codex MCP registration failed");let u=[c.configFile,l,`mcp:${a.serverName}`];c.preservedPrevious&&u.push(c.previousFile),o.push({agent:"codex",detected:!0,installed:!0,targets:u})}catch(c){o.push({agent:"codex",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}return o}function Do(e){switch(e){case"agy":return"Agy / Antigravity";case"opencode":return"OpenCode";case"claude":return"Claude Code";case"kiro":return"Kiro CLI";case"cursor":return"Cursor CLI";case"copilot":return"GitHub Copilot CLI";case"grok":return"Grok Build";case"codex":return"Codex";default:return e}}function rs(e){console.log(""),console.log("ToolNet Memory Integration Detection"),console.log("===================================="),console.log("");for(let t of e){let o=Do(t.agent);if(!t.detected){console.log(`\u25CB ${o}: not detected`);continue}console.log(`\u2713 ${o}: detected`);for(let n of t.evidence)console.log(`  ${n}`)}console.log("")}function is(e){console.log(""),console.log("ToolNet Memory AI Integrations"),console.log("=============================="),console.log("");for(let t of e){let o=Do(t.agent);if(!t.detected){console.log(`- ${o}: not detected`);continue}if(t.installed){let n=t.scope?` [scope=${t.scope}]`:"";console.log(`\u2713 ${o}: automatic memory enabled${n}`),t.projectRoot&&console.log(`  project: ${t.projectRoot}`);continue}console.log(`\u2717 ${o}: integration failed`),t.error&&console.log(`  ${t.error}`)}console.log("")}function ss(e,t){let o=e.indexOf(t);return o>=0?e[o+1]:void 0}function cs(e){return e.includes("--scope")||e.includes("--global")||e.includes("--both")?Co(e):void 0}async function ls(){let e=process.argv.slice(2),t=e.includes("--all"),o=e.includes("--json"),n=e.includes("--detect-only"),r=cs(e),s=ss(e,"--project");if(n){let c=_o();if(o){console.log(JSON.stringify(c,null,2));return}rs(c);return}let i=ns({force:t,scope:r,projectRoot:s});if(o){console.log(JSON.stringify(i,null,2));return}is(i)}var as=process.argv[1]&&(process.argv[1].endsWith("auto-integrate.js")||process.argv[1].endsWith("auto-integrate.ts"));as&&ls().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});export{_o as detectAutoIntegrations,ns as installAutoIntegrations};
