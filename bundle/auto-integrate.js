import{existsSync as Qt}from"node:fs";import{homedir as Zt}from"node:os";import{join as eo}from"node:path";import{spawnSync as to}from"node:child_process";import{homedir as $t}from"node:os";import{join as C}from"node:path";function ie(e={}){return C(e.home??$t(),".gemini")}function U(e={}){return C(ie(e),"config")}function R(e={}){return C(U(e),"mcp_config.json")}function _(e={}){return C(U(e),"hooks.json")}function se(e={}){return C(ie(e),"antigravity-cli")}function ce(e="toolnet-memory",o={}){return C(se(o),"plugins",e)}function ae(e={}){return[se(e),U(e)]}import{homedir as Dt}from"node:os";import{join as S}from"node:path";function k(e={}){let o=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return o?S(o,"opencode"):S(e.home??Dt(),".config","opencode")}function le(e={}){return S(k(e),"opencode.json")}function ue(e={}){return S(k(e),"plugins")}function ge(e={}){return S(k(e),"AGENTS.md")}import{homedir as me}from"node:os";import{join as Y}from"node:path";function W(e={}){return Y(e.home??me(),".claude")}function de(e={}){return Y(W(e),"settings.json")}function fe(e={}){return Y(e.home??me(),".claude.json")}import{homedir as Gt}from"node:os";import{join as I}from"node:path";function q(e={}){return e.kiroHome??process.env.KIRO_HOME??I(e.home??Gt(),".kiro")}function Lt(e={}){return I(q(e),"settings")}function pe(e={}){return I(Lt(e),"mcp.json")}function Bt(e={}){return I(q(e),"hooks")}function ye(e={}){return I(Bt(e),"toolnet-memory.json")}function he(e={}){return[q(e)]}import{homedir as Kt}from"node:os";import{join as H}from"node:path";function J(e={}){return e.cursorHome??H(e.home??Kt(),".cursor")}function Ut(e={}){return e.cursorConfigDir??process.env.CURSOR_CONFIG_DIR??(e.xdgConfigHome??process.env.XDG_CONFIG_HOME?H(e.xdgConfigHome??process.env.XDG_CONFIG_HOME,"cursor"):void 0)??J(e)}function ke(e={}){return H(J(e),"mcp.json")}function Oe(e={}){return H(J(e),"hooks.json")}function Ce(e={}){return Array.from(new Set([J(e),Ut(e)]))}import{homedir as Yt}from"node:os";import{join as $}from"node:path";function V(e={}){return e.copilotHome??process.env.COPILOT_HOME??$(e.home??Yt(),".copilot")}function be(e={}){return $(V(e),"mcp-config.json")}function Wt(e={}){return $(V(e),"hooks")}function ve(e={}){return $(Wt(e),"toolnet-memory.json")}function xe(e={}){return[V(e)]}import{homedir as qt}from"node:os";import{join as O}from"node:path";function D(e={}){return e.grokHome??process.env.GROK_HOME??O(e.home??qt(),".grok")}function we(e={}){return O(D(e),"config.toml")}function Vt(e={}){return O(D(e),"hooks")}function Se(e={}){return O(Vt(e),"toolnet-memory.json")}function Ie(e={}){return[D(e)]}function Xt(e={}){return O(D(e),"skills")}function zt(e={}){return O(Xt(e),"toolnet-continuity")}function Ee(e={}){return O(zt(e),"SKILL.md")}function oo(e){return to("sh",["-lc",`command -v ${JSON.stringify(e)} >/dev/null 2>&1`],{stdio:"ignore"}).status===0}function h(e){let o=e.commandExists(e.command),t=e.configPaths.filter(s=>Qt(s)),n=t.length>0,i=[];o&&i.push(`command:${e.command}`);for(let s of t)i.push(`config:${s}`);return{agent:e.agent,detected:o||n,commandDetected:o,configDetected:n,evidence:i}}function Ne(e={}){let o=e.home??Zt(),t=e.commandExists??oo,n=e.codexHome??process.env.CODEX_HOME??eo(o,".codex");return[h({agent:"agy",command:"agy",commandExists:t,configPaths:ae({home:o})}),h({agent:"opencode",command:"opencode",commandExists:t,configPaths:[k({home:o,xdgConfigHome:e.xdgConfigHome})]}),h({agent:"claude",command:"claude",commandExists:t,configPaths:[W({home:o})]}),h({agent:"kiro",command:"kiro-cli",commandExists:t,configPaths:he({home:o,kiroHome:e.kiroHome})}),h({agent:"cursor",command:"agent",commandExists:t,configPaths:Ce({home:o,cursorHome:e.cursorHome,cursorConfigDir:e.cursorConfigDir,xdgConfigHome:e.xdgConfigHome})}),h({agent:"copilot",command:"copilot",commandExists:t,configPaths:xe({home:o,copilotHome:e.copilotHome})}),h({agent:"grok",command:"grok",commandExists:t,configPaths:Ie({home:o,grokHome:e.grokHome})}),h({agent:"codex",command:"codex",commandExists:t,configPaths:[n]})]}import{existsSync as L,mkdirSync as Pe,readFileSync as Re,renameSync as Oo,writeFileSync as Co}from"node:fs";import{dirname as bo,join as G}from"node:path";import{existsSync as no,mkdirSync as ro,readFileSync as io,renameSync as so,rmSync as co,writeFileSync as ao}from"node:fs";import{dirname as lo}from"node:path";function uo(e){return`'${e.replace(/'/g,"'\\''")}'`}function Fe(e={}){let o=e.hooksFile??_();ro(lo(o),{recursive:!0,mode:448});let t={};if(no(o)){let r;try{r=JSON.parse(io(o,"utf8"))}catch(c){throw new Error(`Invalid existing Agy hooks.json: ${c instanceof Error?c.message:String(c)}`)}if(typeof r!="object"||r===null||Array.isArray(r))throw new Error("Invalid existing Agy hooks.json: root must be a JSON object.");t=r}let n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",i=`${uo(n)} session:agy-hook`;t["toolnet-memory"]={enabled:!0,PreToolUse:[{matcher:"view_file|list_dir|find_by_name|grep_search|run_command",hooks:[{type:"command",command:`${i} pre-tool`,timeout:5}]}],PreInvocation:[{type:"command",command:`${i} pre`,timeout:15}],PostInvocation:[{type:"command",command:`${i} post`,timeout:15}],Stop:[{type:"command",command:`${i} stop`,timeout:30}]};let s=`${o}.tmp-${process.pid}-${Date.now()}`;try{ao(s,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),so(s,o)}finally{co(s,{force:!0})}return o}import{existsSync as go,mkdirSync as mo,readFileSync as fo,renameSync as po,writeFileSync as yo}from"node:fs";import{dirname as ho}from"node:path";function E(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function ko(e,o){mo(ho(e),{recursive:!0,mode:448});let t=`${e}.tmp-${process.pid}-${Date.now()}`;yo(t,`${JSON.stringify(o,null,2)}
`,{encoding:"utf8",mode:384}),po(t,e)}function je(e){if(!go(e))return{};let o=fo(e,"utf8").trim();if(!o)return{};let t;try{t=JSON.parse(o)}catch(n){throw new Error(`Invalid existing Agy MCP config: ${n instanceof Error?n.message:String(n)}`)}if(!E(t))throw new Error("Invalid existing Agy MCP config: root must be a JSON object.");return t}function Te(e,o){return E(e)?e.command===o&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function Me(e={}){let o=e.configFile??R(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",i=je(o),s=i.mcpServers;if(s!==void 0&&!E(s))throw new Error("Invalid existing Agy MCP config: mcpServers must be an object.");let r=E(s)?{...s}:{},c=r[n];if(Te(c,t))return{installed:!0,changed:!1,configFile:o,serverName:n,command:t,args:["mcp"]};r[n]={command:t,args:["mcp"]};let u={...i,mcpServers:r};ko(o,u);let a=je(o).mcpServers;if(!E(a)||!Te(a[n],t))throw new Error("Agy MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:o,serverName:n,command:t,args:["mcp"]}}var vo=`# ToolNet Memory Continuity

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
`;function _e(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function X(e,o){Pe(bo(e),{recursive:!0});let t=`${e}.tmp-${process.pid}-${Date.now()}`;Co(t,o,{encoding:"utf8",mode:384}),Oo(t,e)}function Ae(e,o){L(e)&&Re(e,"utf8")===o||X(e,o)}function He(e){if(!L(e))return{};let o=Re(e,"utf8").trim();if(!o)return{};let t;try{t=JSON.parse(o)}catch(n){throw new Error(`Invalid legacy Antigravity config ${e}: ${n instanceof Error?n.message:String(n)}`)}if(!_e(t))throw new Error(`Invalid legacy Antigravity config ${e}: root must be object`);return t}function xo(e,o){if(!L(e))return!1;let t=He(e);if(!_e(t.mcpServers)||!Object.prototype.hasOwnProperty.call(t.mcpServers,o))return!1;let n={...t.mcpServers};return delete n[o],X(e,`${JSON.stringify({...t,mcpServers:n},null,2)}
`),!0}function wo(e){if(!L(e))return!1;let o=He(e);if(!Object.prototype.hasOwnProperty.call(o,"toolnet-memory"))return!1;let t={...o};return delete t["toolnet-memory"],X(e,`${JSON.stringify(t,null,2)}
`),!0}function Je(e={}){let o=e.pluginName??"toolnet-memory",t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.pluginRoot??ce(o),i=G(n,"plugin.json"),s=G(n,"mcp_config.json"),r=G(n,"hooks.json"),c=G(n,"rules","toolnet-memory-continuity.md");Pe(n,{recursive:!0,mode:448}),Ae(i,`${JSON.stringify({$schema:"https://antigravity.google/schemas/v1/plugin.json",name:o,description:"Persistent project continuity and memory for Antigravity coding sessions."},null,2)}
`),Me({configFile:s,binary:t,serverName:"toolnet-memory"}),Fe({hooksFile:r,binary:t}),Ae(c,`${vo.trim()}
`);let u=e.legacyMcpFile??R(),l=e.legacyHooksFile??_(),a=[];return u!==s&&xo(u,"toolnet-memory")&&a.push(u),l!==r&&wo(l)&&a.push(l),{installed:!0,pluginRoot:n,files:[i,s,r,c],migratedLegacy:a}}import{existsSync as Io,mkdirSync as Ge,readFileSync as Eo,writeFileSync as Le}from"node:fs";import{join as No}from"node:path";var So="memory_agent_ask";function $e(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${So}

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
`.trim()}var De="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",z="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function Fo(){let e=ge();Ge(k(),{recursive:!0});let o=`${De}
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


${$e()}

${z}`,t=Io(e)?Eo(e,"utf8"):"",n=t.indexOf(De),i=t.indexOf(z);return n>=0&&i>=n?t=t.slice(0,n)+o+t.slice(i+z.length):(t=t.trimEnd(),t&&(t+=`

`),t+=o),Le(e,t.trimEnd()+`
`,{encoding:"utf8",mode:384}),e}function Be(e={}){let o=e.directory??ue();Ge(o,{recursive:!0}),Fo();let t=No(o,"toolnet-memory.js"),n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",i=`
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
`;return Le(t,i.trimStart(),{encoding:"utf8",mode:384}),t}import{existsSync as Ye,mkdirSync as jo,readFileSync as To,renameSync as Mo,writeFileSync as Ao}from"node:fs";import{dirname as We,join as Po}from"node:path";function b(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Ro(e,o){jo(We(e),{recursive:!0});let t=`${e}.tmp-${process.pid}-${Date.now()}`;Ao(t,`${JSON.stringify(o,null,2)}
`,{encoding:"utf8",mode:384}),Mo(t,e)}function Ke(e){if(!Ye(e))return{};let o=To(e,"utf8").trim();if(!o)return{};let t;try{t=JSON.parse(o)}catch(n){throw new Error(`Invalid existing OpenCode opencode.json: ${n instanceof Error?n.message:String(n)}`)}if(!b(t))throw new Error("Invalid existing OpenCode opencode.json: root must be a JSON object.");return t}function Ue(e,o){if(!b(e))return!1;let t=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(t)&&t.length===2&&t[0]===o&&t[1]==="mcp"}function _o(e,o){let t=e.mcpServers;if(!b(t)||!Object.prototype.hasOwnProperty.call(t,o))return{root:e,changed:!1};let n={...t};return delete n[o],{root:{...e,mcpServers:n},changed:!0}}function qe(e={}){let o=e.configFile??le(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",i=Po(We(o),"opencode.jsonc"),s=Ye(i)?i:void 0,r=Ke(o),c=_o(r,n),u=c.root,l=u.mcp;if(l!==void 0&&!b(l))throw new Error("Invalid existing OpenCode config: mcp must be an object.");let a=b(l)?{...l}:{},g=a[n];if(Ue(g,t)&&!c.changed)return{installed:!0,changed:!1,configFile:o,serverName:n,command:[t,"mcp"],preservedJsonc:s};a[n]={type:"local",command:[t,"mcp"],enabled:!0};let m={...u,mcp:a};Ro(o,m);let y=Ke(o);if(!b(y.mcp)||!Ue(y.mcp[n],t))throw new Error("OpenCode MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:o,serverName:n,command:[t,"mcp"],preservedJsonc:s}}import{existsSync as Ho,mkdirSync as Ve,readFileSync as Jo,writeFileSync as Xe}from"node:fs";import{homedir as ze}from"node:os";import{dirname as Qe,join as Q}from"node:path";function $o(e){let o=[],t=/"((?:\\.|[^"\\])*)"|'([^']*)'/g,n;for(;n=t.exec(e);){let i=n[1]??n[2]??"";try{o.push(n[1]!==void 0?JSON.parse(`"${i}"`):i)}catch{o.push(i)}}return o}function Ze(e={}){let o=e.configFile??Q(process.env.CODEX_HOME??Q(ze(),".codex"),"config.toml"),t=e.previousFile??Q(ze(),".config","toolnet-memory","codex-notify-previous.json");Ve(Qe(o),{recursive:!0}),Ve(Qe(t),{recursive:!0});let n=Ho(o)?Jo(o,"utf8"):"",i=e.binary??"toolnet-memory",s=`notify = [${JSON.stringify(i)}, "session:codex-notify"]`,r=n.split(`
`),c=r.findIndex(m=>/^\s*\[/.test(m));c<0&&(c=r.length);let u=-1,l=-1;for(let m=0;m<c;m+=1)if(/^\s*notify\s*=/.test(r[m])){if(u=m,l=m,r[m].includes("[")&&!r[m].includes("]"))for(;l+1<c&&(l+=1,!r[l].includes("]")););break}let a=[];if(u>=0){let m=r.slice(u,l+1).join(`
`);a=$o(m),r.splice(u,l-u+1,s)}else c=r.findIndex(m=>/^\s*\[/.test(m)),c<0&&(c=r.length),r.splice(c,0,s);let g=a.length>=2&&a[a.length-1]==="session:codex-notify";return a.length>0&&!g&&Xe(t,JSON.stringify(a,null,2)+`
`,{encoding:"utf8",mode:384}),n=r.join(`
`),n.endsWith(`
`)||(n+=`
`),Xe(o,n,{encoding:"utf8",mode:384}),{configFile:o,previousFile:t,preservedPrevious:a.length>0&&!g}}import{existsSync as Do,mkdirSync as Go,readFileSync as Lo,writeFileSync as Bo}from"node:fs";import{homedir as Ko}from"node:os";import{dirname as Uo,join as et}from"node:path";function Yo(e){return`'${e.replace(/'/g,"'\\''")}'`}function tt(e={}){let o=e.hooksFile??et(process.env.CODEX_HOME??et(Ko(),".codex"),"hooks.json");Go(Uo(o),{recursive:!0});let t={};if(Do(o))try{t=JSON.parse(Lo(o,"utf8"))}catch(c){throw new Error(`Invalid existing Codex hooks.json: ${c instanceof Error?c.message:String(c)}`)}let n=t.hooks&&typeof t.hooks=="object"&&!Array.isArray(t.hooks)?t.hooks:{};t.hooks=n;let s=(Array.isArray(n.SessionStart)?n.SessionStart:[]).filter(c=>{try{return!JSON.stringify(c).includes("session:codex-context")}catch{return!0}}),r=e.binary??"toolnet-memory";return s.push({matcher:"startup|resume|clear|compact",hooks:[{type:"command",command:`${Yo(r)} session:codex-context`,timeout:15,additionalContextLimit:1e3,statusMessage:"Loading ToolNet project continuity"}]}),n.SessionStart=s,Bo(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),o}import{spawnSync as Wo}from"node:child_process";function Z(e,o){return Wo(e,o,{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}function ot(e,o){let t=Z(e,["mcp","get",o,"--json"]);if(t.status!==0||!t.stdout)return null;try{return JSON.parse(t.stdout)}catch{return null}}function nt(e,o){return e.enabled!==!1&&e.transport?.type==="stdio"&&e.transport?.command===o&&Array.isArray(e.transport?.args)&&e.transport?.args.length===1&&e.transport.args[0]==="mcp"}function rt(e={}){let o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=e.codexBinary??"codex",n=e.serverName??"toolnet-memory",i=ot(t,n);if(i&&nt(i,o))return{installed:!0,changed:!1,serverName:n,command:o,args:["mcp"]};if(i){let c=Z(t,["mcp","remove",n]);if(c.status!==0)return{installed:!1,changed:!1,serverName:n,command:o,args:["mcp"],error:(c.stderr||c.stdout||"Unable to remove old ToolNet MCP configuration.").trim()}}let s=Z(t,["mcp","add",n,"--",o,"mcp"]);if(s.status!==0)return{installed:!1,changed:!1,serverName:n,command:o,args:["mcp"],error:(s.stderr||s.stdout||"Unable to register ToolNet MCP.").trim()};let r=ot(t,n);return!r||!nt(r,o)?{installed:!1,changed:!0,serverName:n,command:o,args:["mcp"],error:"Codex accepted MCP registration but verification did not match expected ToolNet command."}:{installed:!0,changed:!0,serverName:n,command:o,args:["mcp"]}}import{existsSync as qo,mkdirSync as Vo,readFileSync as Xo,renameSync as zo,rmSync as Qo,writeFileSync as Zo}from"node:fs";import{dirname as en}from"node:path";function N(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function tn(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function on(e){if(!qo(e))return{};let o;try{o=JSON.parse(Xo(e,"utf8"))}catch(t){throw new Error(`Invalid existing Claude settings.json: ${t instanceof Error?t.message:String(t)}`)}if(!N(o))throw new Error("Invalid existing Claude settings.json: root must be a JSON object.");return o}function ee(e){if(e===void 0)return[];if(!Array.isArray(e))throw new Error("Invalid existing Claude settings.json: hook event must be an array.");let o=[];for(let t of e){if(!N(t)){o.push(t);continue}let n=t.hooks;if(!Array.isArray(n)){o.push(t);continue}let i=n.filter(s=>{if(!N(s))return!0;let r=s.command;return!(typeof r=="string"&&r.includes("session:claude-hook"))});i.length!==0&&o.push({...t,hooks:i})}return o}function te(e){return{type:"command",command:e,timeout:10}}function nn(e,o){Vo(en(e),{recursive:!0,mode:448});let t=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Zo(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),zo(t,e)}finally{Qo(t,{force:!0})}}function it(e={}){let o=e.settingsFile??de(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=on(o),i=n.hooks;if(i!==void 0&&!N(i))throw new Error("Invalid existing Claude settings.json: hooks must be an object.");let s=N(i)?{...i}:{},r=`${tn(t)} session:claude-hook`,c=ee(s.SessionStart);c.push({matcher:"startup|resume|clear|compact",hooks:[te(r)]}),s.SessionStart=c;let u=ee(s.PostToolUse);u.push({matcher:"Edit|Write",hooks:[te(r)]}),s.PostToolUse=u;let l=ee(s.Stop);l.push({hooks:[te(r)]}),s.Stop=l;let a={...n,hooks:s},g=JSON.stringify(n),m=JSON.stringify(a);return g===m?{settingsFile:o,changed:!1}:(nn(o,a),{settingsFile:o,changed:!0})}import{existsSync as rn,mkdirSync as sn,readFileSync as cn,renameSync as an,rmSync as ln,writeFileSync as un}from"node:fs";import{dirname as gn}from"node:path";function F(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function st(e){if(!rn(e))return{};let o;try{o=JSON.parse(cn(e,"utf8"))}catch(t){throw new Error(`Invalid existing Claude Code config: ${t instanceof Error?t.message:String(t)}`)}if(!F(o))throw new Error("Invalid existing Claude Code config: root must be a JSON object.");return o}function ct(e,o){if(!F(e))return!1;let t=e.args;return e.type==="stdio"&&e.command===o&&Array.isArray(t)&&t.length===1&&t[0]==="mcp"}function mn(e,o){sn(gn(e),{recursive:!0});let t=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{un(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),an(t,e)}finally{ln(t,{force:!0})}}function at(e={}){let o=e.stateFile??fe(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",i=st(o),s=i.mcpServers;if(s!==void 0&&!F(s))throw new Error("Invalid existing Claude Code config: mcpServers must be an object.");let r=F(s)?{...s}:{},c=r[n];if(ct(c,t))return{installed:!0,changed:!1,configFile:o,serverName:n,command:[t,"mcp"],repaired:!1};let u=c!==void 0;r[n]={type:"stdio",command:t,args:["mcp"]},mn(o,{...i,mcpServers:r});let a=st(o).mcpServers;if(!F(a)||!ct(a[n],t))throw new Error("Claude Code MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:o,serverName:n,command:[t,"mcp"],repaired:u}}function lt(e={}){let o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=it({binary:o,settingsFile:e.settingsFile}),n=at({binary:o,stateFile:e.stateFile});return{hooks:t,mcp:n,files:[t.settingsFile,n.configFile]}}import{existsSync as dn,mkdirSync as fn,readFileSync as pn,renameSync as yn,rmSync as hn,writeFileSync as kn}from"node:fs";import{dirname as On}from"node:path";var v="ToolNet Memory - ";function mt(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Cn(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function ut(e){if(!dn(e))return{};let o=pn(e,"utf8").trim();if(!o)return{};let t;try{t=JSON.parse(o)}catch(n){throw new Error(`Invalid existing Kiro hooks file: ${n instanceof Error?n.message:String(n)}`)}if(!mt(t))throw new Error("Invalid existing Kiro hooks file: root must be a JSON object.");return t}function gt(e){return mt(e)?typeof e.name=="string"&&e.name.startsWith(v):!1}function j(e){return{type:"command",command:e}}function bn(e){return[{name:`${v}Session Start`,description:"Inject compact local ToolNet continuity and capture Kiro session activation.",trigger:"SessionStart",action:j(e),timeout:10,enabled:!0},{name:`${v}Prompt Continuity`,description:"Capture prompts and refresh ToolNet guidance only for resume/continue requests.",trigger:"UserPromptSubmit",action:j(e),timeout:10,enabled:!0},{name:`${v}Raw History Guard`,description:"Prevent Kiro from reconstructing continuity from raw ToolNet/agent session history.",trigger:"PreToolUse",matcher:"*",action:j(e),timeout:10,enabled:!0},{name:`${v}Tool Capture`,description:"Capture durable tool activity while filtering noisy read-only events.",trigger:"PostToolUse",matcher:"*",action:j(e),timeout:15,enabled:!0},{name:`${v}Final Flush`,description:"Flush pending Kiro WAL events when the assistant finishes a turn.",trigger:"Stop",action:j(e),timeout:30,enabled:!0}]}function vn(e,o){fn(On(e),{recursive:!0,mode:448});let t=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{kn(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),yn(t,e)}finally{hn(t,{force:!0})}}function dt(e={}){let o=e.hooksFile??ye(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=ut(o);if(n.version!==void 0&&n.version!=="v1")throw new Error(`Unsupported existing Kiro hooks version: ${String(n.version)}`);let i=n.hooks;if(i!==void 0&&!Array.isArray(i))throw new Error("Invalid existing Kiro hooks file: hooks must be an array.");let s=Array.isArray(i)?i.filter(a=>!gt(a)):[],r=`${Cn(t)} session:kiro-hook`,c=bn(r),u={...n,version:"v1",hooks:[...s,...c]};if(JSON.stringify(n)===JSON.stringify(u))return{hooksFile:o,changed:!1,hookCount:c.length};vn(o,u);let l=ut(o);if(l.version!=="v1"||!Array.isArray(l.hooks)||l.hooks.filter(gt).length!==c.length)throw new Error("Kiro hooks were written but verification failed.");return{hooksFile:o,changed:!0,hookCount:c.length}}import{existsSync as xn,mkdirSync as wn,readFileSync as Sn,renameSync as In,rmSync as En,writeFileSync as Nn}from"node:fs";import{dirname as Fn}from"node:path";function T(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function ft(e){if(!xn(e))return{};let o=Sn(e,"utf8").trim();if(!o)return{};let t;try{t=JSON.parse(o)}catch(n){throw new Error(`Invalid existing Kiro MCP config: ${n instanceof Error?n.message:String(n)}`)}if(!T(t))throw new Error("Invalid existing Kiro MCP config: root must be a JSON object.");return t}function pt(e,o){return T(e)?e.command===o&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&e.disabled===!1:!1}function jn(e,o){wn(Fn(e),{recursive:!0,mode:448});let t=`${e}.tmp-${process.pid}-${Date.now()}`;try{Nn(t,`${JSON.stringify(o,null,2)}
`,{encoding:"utf8",mode:384}),In(t,e)}finally{En(t,{force:!0})}}function yt(e={}){let o=e.configFile??pe(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",i=ft(o),s=i.mcpServers;if(s!==void 0&&!T(s))throw new Error("Invalid existing Kiro MCP config: mcpServers must be an object.");let r=T(s)?{...s}:{},c=r[n];if(pt(c,t))return{installed:!0,changed:!1,configFile:o,serverName:n,command:t,args:["mcp"]};r[n]={command:t,args:["mcp"],disabled:!1};let u={...i,mcpServers:r};jn(o,u);let a=ft(o).mcpServers;if(!T(a)||!pt(a[n],t))throw new Error("Kiro MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:o,serverName:n,command:t,args:["mcp"]}}function ht(e={}){let o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=yt({binary:o,configFile:e.configFile}),n=dt({binary:o,hooksFile:e.hooksFile});return{installed:t.installed,changed:t.changed||n.changed,mcp:t,hooks:n,files:[t.configFile,n.hooksFile]}}import{existsSync as Tn,mkdirSync as Mn,readFileSync as An,renameSync as Pn,rmSync as Rn,writeFileSync as _n}from"node:fs";import{dirname as Hn}from"node:path";function d(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function p(e,o){if(!Tn(e))return{};let t=An(e,"utf8").trim();if(!t)return{};let n;try{n=JSON.parse(t)}catch(i){throw new Error(`Invalid existing ${o} hooks file: ${i instanceof Error?i.message:String(i)}`)}if(!d(n))throw new Error(`Invalid existing ${o} hooks file: root must be a JSON object.`);return n}function x(e,o){Mn(Hn(e),{recursive:!0,mode:448});let t=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{_n(t,`${JSON.stringify(o,null,2)}
`,{encoding:"utf8",mode:384}),Pn(t,e)}finally{Rn(t,{force:!0})}}function oe(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}var M=[["sessionStart",10],["beforeSubmitPrompt",10],["preToolUse",10],["postToolUse",15],["afterAgentResponse",15],["stop",30]];function kt(e){return d(e)&&typeof e.command=="string"&&e.command.includes("session:cursor-hook")}function Jn(e,o,t){let i={type:"command",command:`TOOLNET_HOOK_EVENT=${oe(e)} ${oe(o)} session:cursor-hook`,timeout:t};return e==="preToolUse"&&(i.matcher=".*"),i}function Ot(e={}){let o=e.hooksFile??Oe(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=p(o,"Cursor");if(n.version!==void 0&&n.version!==1)throw new Error(`Unsupported existing Cursor hooks version: ${String(n.version)}`);let i=n.hooks;if(i!==void 0&&!d(i))throw new Error("Invalid existing Cursor hooks file: hooks must be an object.");let s=d(i)?{...i}:{};for(let[l,a]of M){let g=s[l];if(g!==void 0&&!Array.isArray(g))throw new Error(`Invalid existing Cursor hooks file: hooks.${l} must be an array.`);let m=Array.isArray(g)?g.filter(y=>!kt(y)):[];s[l]=[...m,Jn(l,t,a)]}let r={...n,version:1,hooks:s};if(JSON.stringify(n)===JSON.stringify(r))return{hooksFile:o,changed:!1,hookCount:M.length};x(o,r);let c=p(o,"Cursor");if(c.version!==1||!d(c.hooks))throw new Error("Cursor hooks were written but verification failed.");let u=0;for(let[l]of M){let a=c.hooks[l];if(!Array.isArray(a))throw new Error("Cursor hooks were written but verification failed.");u+=a.filter(kt).length}if(u!==M.length)throw new Error("Cursor hooks were written but verification failed.");return{hooksFile:o,changed:!0,hookCount:M.length}}import{existsSync as $n,mkdirSync as Dn,readFileSync as Gn,renameSync as Ln,rmSync as Bn,writeFileSync as Kn}from"node:fs";import{dirname as Un}from"node:path";function f(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function w(e,o){if(!$n(e))return{};let t=Gn(e,"utf8").trim();if(!t)return{};let n;try{n=JSON.parse(t)}catch(i){throw new Error(`Invalid existing ${o} MCP config: ${i instanceof Error?i.message:String(i)}`)}if(!f(n))throw new Error(`Invalid existing ${o} MCP config: root must be a JSON object.`);return n}function B(e,o){Dn(Un(e),{recursive:!0,mode:448});let t=`${e}.tmp-${process.pid}-${Date.now()}`;try{Kn(t,`${JSON.stringify(o,null,2)}
`,{encoding:"utf8",mode:384}),Ln(t,e)}finally{Bn(t,{force:!0})}}function Ct(e,o){return f(e)?(e.type===void 0||e.type==="stdio")&&e.command===o&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function bt(e={}){let o=e.configFile??ke(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",i=w(o,"Cursor"),s=i.mcpServers;if(s!==void 0&&!f(s))throw new Error("Invalid existing Cursor MCP config: mcpServers must be an object.");let r=f(s)?{...s}:{};if(Ct(r[n],t))return{installed:!0,changed:!1,configFile:o,serverName:n,command:t,args:["mcp"]};r[n]={type:"stdio",command:t,args:["mcp"]},B(o,{...i,mcpServers:r});let u=w(o,"Cursor").mcpServers;if(!f(u)||!Ct(u[n],t))throw new Error("Cursor MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:o,serverName:n,command:t,args:["mcp"]}}function vt(e={}){let o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=bt({binary:o,configFile:e.configFile}),n=Ot({binary:o,hooksFile:e.hooksFile});return{installed:t.installed,changed:t.changed||n.changed,mcp:t,hooks:n,files:[t.configFile,n.hooksFile]}}var A=[["sessionStart",10],["userPromptSubmitted",10],["userPromptTransformed",10],["preToolUse",10],["postToolUse",15],["agentStop",30]];function Yn(e){if(typeof e.command=="string")return e.command;if(typeof e.bash=="string")return e.bash}function xt(e){return d(e)&&Yn(e)?.includes("session:copilot-hook")===!0}function Wn(e,o,t){let n={type:"command",command:`${o} session:copilot-hook`,env:{TOOLNET_HOOK_EVENT:e},timeoutSec:t};return e==="preToolUse"&&(n.matcher=".*"),n}function wt(e={}){let o=e.hooksFile??ve(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=p(o,"GitHub Copilot CLI");if(n.version!==void 0&&n.version!==1)throw new Error(`Unsupported existing GitHub Copilot CLI hooks version: ${String(n.version)}`);let i=n.hooks;if(i!==void 0&&!d(i))throw new Error("Invalid existing GitHub Copilot CLI hooks file: hooks must be an object.");let s=d(i)?{...i}:{};for(let[l,a]of A){let g=s[l];if(g!==void 0&&!Array.isArray(g))throw new Error(`Invalid existing GitHub Copilot CLI hooks file: hooks.${l} must be an array.`);let m=Array.isArray(g)?g.filter(y=>!xt(y)):[];s[l]=[...m,Wn(l,t,a)]}let r={...n,version:1,hooks:s};if(JSON.stringify(n)===JSON.stringify(r))return{hooksFile:o,changed:!1,hookCount:A.length};x(o,r);let c=p(o,"GitHub Copilot CLI");if(c.version!==1||!d(c.hooks))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");let u=0;for(let[l]of A){let a=c.hooks[l];if(!Array.isArray(a))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");u+=a.filter(xt).length}if(u!==A.length)throw new Error("GitHub Copilot CLI hooks were written but verification failed.");return{hooksFile:o,changed:!0,hookCount:A.length}}function St(e,o){return f(e)?(e.type===void 0||e.type==="local"||e.type==="stdio")&&e.command===o&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&Array.isArray(e.tools)&&e.tools.length===1&&e.tools[0]==="*":!1}function It(e={}){let o=e.configFile??be(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",i=w(o,"GitHub Copilot CLI"),s=i.mcpServers;if(s!==void 0&&!f(s))throw new Error("Invalid existing GitHub Copilot CLI MCP config: mcpServers must be an object.");let r=f(s)?{...s}:{};if(St(r[n],t))return{installed:!0,changed:!1,configFile:o,serverName:n,command:t,args:["mcp"]};r[n]={type:"stdio",command:t,args:["mcp"],tools:["*"]},B(o,{...i,mcpServers:r});let u=w(o,"GitHub Copilot CLI").mcpServers;if(!f(u)||!St(u[n],t))throw new Error("GitHub Copilot CLI MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:o,serverName:n,command:t,args:["mcp"]}}function Et(e={}){let o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=It({binary:o,configFile:e.configFile}),n=wt({binary:o,hooksFile:e.hooksFile});return{installed:t.installed,changed:t.changed||n.changed,mcp:t,hooks:n,files:[t.configFile,n.hooksFile]}}import{existsSync as qn,mkdirSync as Vn,readFileSync as Nt,renameSync as Xn,rmSync as zn,writeFileSync as Qn}from"node:fs";import{dirname as Zn}from"node:path";var ne=`---
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
`;function er(e,o){Vn(Zn(e),{recursive:!0,mode:448});let t=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Qn(t,o,{encoding:"utf8",mode:384}),Xn(t,e)}finally{zn(t,{force:!0})}}function Ft(e={}){let o=e.skillFile??Ee();if(qn(o)&&Nt(o,"utf8")===ne)return{skillFile:o,changed:!1};if(er(o,ne),Nt(o,"utf8")!==ne)throw new Error("Grok ToolNet continuity skill was written but verification failed.");return{skillFile:o,changed:!0}}var P=[["SessionStart",10],["UserPromptSubmit",10],["PreToolUse",10],["PostToolUse",15],["Stop",30]];function jt(e){return!d(e)||!Array.isArray(e.hooks)?!1:e.hooks.some(o=>d(o)&&typeof o.command=="string"&&o.command.includes("session:grok-hook"))}function tr(e,o,t){let n={hooks:[{type:"command",command:`${o} session:grok-hook`,timeout:t,env:{TOOLNET_HOOK_EVENT:e}}]};return e==="PreToolUse"&&(n.matcher=".*"),n}function Tt(e={}){let o=e.hooksFile??Se(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=p(o,"Grok Build"),i=n.hooks;if(i!==void 0&&!d(i))throw new Error("Invalid existing Grok Build hooks file: hooks must be an object.");let s=d(i)?{...i}:{};for(let[l,a]of P){let g=s[l];if(g!==void 0&&!Array.isArray(g))throw new Error(`Invalid existing Grok Build hooks file: hooks.${l} must be an array.`);let m=Array.isArray(g)?g.filter(y=>!jt(y)):[];s[l]=[...m,tr(l,t,a)]}let r={...n,hooks:s};if(JSON.stringify(n)===JSON.stringify(r))return{hooksFile:o,changed:!1,hookCount:P.length};x(o,r);let c=p(o,"Grok Build");if(!d(c.hooks))throw new Error("Grok Build hooks were written but verification failed.");let u=0;for(let[l]of P){let a=c.hooks[l];if(!Array.isArray(a))throw new Error("Grok Build hooks were written but verification failed.");u+=a.filter(jt).length}if(u!==P.length)throw new Error("Grok Build hooks were written but verification failed.");return{hooksFile:o,changed:!0,hookCount:P.length}}import{existsSync as or,mkdirSync as nr,readFileSync as rr,renameSync as ir,rmSync as sr,writeFileSync as cr}from"node:fs";import{dirname as ar}from"node:path";function Mt(e){return or(e)?rr(e,"utf8"):""}function lr(e,o){nr(ar(e),{recursive:!0,mode:448});let t=`${e}.tmp-${process.pid}-${Date.now()}`;try{cr(t,o,{encoding:"utf8",mode:384}),ir(t,e)}finally{sr(t,{force:!0})}}function re(e){return e.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t")}function ur(e){return`[mcp_servers."${re(e)}"]`}function gr(e,o){return[ur(e),`command = "${re(o)}"`,'args = ["mcp"]',"enabled = true"].join(`
`)}function mr(e){let o=e.trim();return o.startsWith("[")&&o.includes("]")}function K(e){return e.trim().replace(/\s+/g,"")}function dr(e){return new Set([K(`[mcp_servers.${e}]`),K(`[mcp_servers."${e}"]`),K(`[mcp_servers.'${e}']`)])}function Pt(e,o){let t=e.split(/\r?\n/),n=dr(o),i=-1;for(let a=0;a<t.length;a+=1){let g=K(t[a].replace(/\s+#.*$/,""));if(n.has(g)){i=a;break}}if(i<0)return null;let s=t.length;for(let a=i+1;a<t.length;a+=1)if(mr(t[a])){s=a;break}let r=[],c=0;for(let a of t)r.push(c),c+=a.length+1;let u=r[i]??0,l=s>=t.length?e.length:r[s]??e.length;return{start:u,end:l}}function fr(e,o,t){let n=`${gr(o,t)}
`,i=Pt(e,o);if(i){let s=e.slice(0,i.start),r=e.slice(i.end);return`${s}${n}${r.replace(/^\n+/,"")}`}return e.trim()?`${e.replace(/\s*$/,"")}

${n}`:n}function At(e,o,t){let n=Pt(e,o);if(!n)return!1;let i=e.slice(n.start,n.end);return i.includes(`command = "${re(t)}"`)&&/args\s*=\s*\[\s*"mcp"\s*\]/.test(i)&&/enabled\s*=\s*true/.test(i)}function Rt(e={}){let o=e.configFile??we(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",i=Mt(o);if(At(i,n,t))return{installed:!0,changed:!1,configFile:o,serverName:n,command:t,args:["mcp"]};let s=fr(i,n,t);lr(o,s);let r=Mt(o);if(!At(r,n,t))throw new Error("Grok Build MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:o,serverName:n,command:t,args:["mcp"]}}function _t(e={}){let o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=Rt({binary:o,configFile:e.configFile}),n=Tt({binary:o,hooksFile:e.hooksFile}),i=Ft({skillFile:e.skillFile});return{installed:t.installed,changed:t.changed||n.changed||i.changed,mcp:t,hooks:n,skill:i,files:[t.configFile,n.hooksFile,i.skillFile]}}function Ht(){return Ne()}function pr(e={}){let o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=[],n=e.detections??Ht(),i=new Map(n.map(s=>[s.agent,s.detected]));if(!(e.force===!0||i.get("agy")===!0))t.push({agent:"agy",detected:!1,installed:!1,targets:[]});else try{let r=Je({binary:o});t.push({agent:"agy",detected:!0,installed:!0,targets:r.files})}catch(r){t.push({agent:"agy",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("opencode")===!0))t.push({agent:"opencode",detected:!1,installed:!1,targets:[]});else try{let r=Be({binary:o}),c=qe({binary:o});t.push({agent:"opencode",detected:!0,installed:!0,targets:[r,c.configFile,`mcp:${c.serverName}`]})}catch(r){t.push({agent:"opencode",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("claude")===!0))t.push({agent:"claude",detected:!1,installed:!1,targets:[]});else try{let r=lt({binary:o});t.push({agent:"claude",detected:!0,installed:!0,targets:[r.hooks.settingsFile,r.mcp.configFile,`mcp:${r.mcp.serverName}`]})}catch(r){t.push({agent:"claude",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("kiro")===!0))t.push({agent:"kiro",detected:!1,installed:!1,targets:[]});else try{let r=ht({...e.kiro??{},binary:o});t.push({agent:"kiro",detected:!0,installed:!0,targets:[r.mcp.configFile,`mcp:${r.mcp.serverName}`,r.hooks.hooksFile]})}catch(r){t.push({agent:"kiro",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("cursor")===!0))t.push({agent:"cursor",detected:!1,installed:!1,targets:[]});else try{let r=vt({...e.cursor??{},binary:o});t.push({agent:"cursor",detected:!0,installed:!0,targets:[r.mcp.configFile,`mcp:${r.mcp.serverName}`,r.hooks.hooksFile]})}catch(r){t.push({agent:"cursor",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("copilot")===!0))t.push({agent:"copilot",detected:!1,installed:!1,targets:[]});else try{let r=Et({...e.copilot??{},binary:o});t.push({agent:"copilot",detected:!0,installed:!0,targets:[r.mcp.configFile,`mcp:${r.mcp.serverName}`,r.hooks.hooksFile]})}catch(r){t.push({agent:"copilot",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("grok")===!0))t.push({agent:"grok",detected:!1,installed:!1,targets:[]});else try{let r=_t({...e.grok??{},binary:o});t.push({agent:"grok",detected:!0,installed:!0,targets:[r.mcp.configFile,`mcp:${r.mcp.serverName}`,r.hooks.hooksFile,r.skill.skillFile]})}catch(r){t.push({agent:"grok",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("codex")===!0))t.push({agent:"codex",detected:!1,installed:!1,targets:[]});else try{let r=Ze({binary:o}),c=tt({binary:o}),u=rt({binary:o});if(!u.installed)throw new Error(u.error??"Codex MCP registration failed");let l=[r.configFile,c,`mcp:${u.serverName}`];r.preservedPrevious&&l.push(r.previousFile),t.push({agent:"codex",detected:!0,installed:!0,targets:l})}catch(r){t.push({agent:"codex",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}return t}function Jt(e){switch(e){case"agy":return"Agy / Antigravity";case"opencode":return"OpenCode";case"claude":return"Claude Code";case"kiro":return"Kiro CLI";case"cursor":return"Cursor CLI";case"copilot":return"GitHub Copilot CLI";case"grok":return"Grok Build";case"codex":return"Codex"}}function yr(e){console.log(""),console.log("ToolNet Memory Integration Detection"),console.log("===================================="),console.log("");for(let o of e){let t=Jt(o.agent);if(!o.detected){console.log(`\u25CB ${t}: not detected`);continue}console.log(`\u2713 ${t}: detected`);for(let n of o.evidence)console.log(`  ${n}`)}console.log("")}function hr(e){console.log(""),console.log("ToolNet Memory AI Integrations"),console.log("=============================="),console.log("");for(let o of e){let t=Jt(o.agent);if(!o.detected){console.log(`- ${t}: not detected`);continue}if(o.installed){console.log(`\u2713 ${t}: automatic memory enabled`);continue}console.log(`\u2717 ${t}: integration failed`),o.error&&console.log(`  ${o.error}`)}console.log("")}async function kr(){let e=process.argv.slice(2),o=e.includes("--all"),t=e.includes("--json");if(e.includes("--detect-only")){let s=Ht();if(t){console.log(JSON.stringify(s,null,2));return}yr(s);return}let i=pr({force:o});if(t){console.log(JSON.stringify(i,null,2));return}hr(i)}var Or=process.argv[1]&&(process.argv[1].endsWith("auto-integrate.js")||process.argv[1].endsWith("auto-integrate.ts"));Or&&kr().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});export{Ht as detectAutoIntegrations,pr as installAutoIntegrations};
