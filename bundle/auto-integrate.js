import{existsSync as Ve}from"node:fs";import{homedir as ze}from"node:os";import{join as Qe}from"node:path";import{spawnSync as Ze}from"node:child_process";import{homedir as Ye}from"node:os";import{join as p}from"node:path";function H(e={}){return p(e.home??Ye(),".gemini")}function j(e={}){return p(H(e),"config")}function w(e={}){return p(j(e),"mcp_config.json")}function I(e={}){return p(j(e),"hooks.json")}function L(e={}){return p(H(e),"antigravity-cli")}function K(e="toolnet-memory",n={}){return p(L(n),"plugins",e)}function B(e={}){return[L(e),j(e)]}import{homedir as qe}from"node:os";import{join as h}from"node:path";function m(e={}){let n=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return n?h(n,"opencode"):h(e.home??qe(),".config","opencode")}function U(e={}){return h(m(e),"opencode.json")}function Y(e={}){return h(m(e),"plugins")}function q(e={}){return h(m(e),"AGENTS.md")}import{homedir as W}from"node:os";import{join as T}from"node:path";function A(e={}){return T(e.home??W(),".claude")}function G(e={}){return T(A(e),"settings.json")}function X(e={}){return T(e.home??W(),".claude.json")}import{homedir as We}from"node:os";import{join as O}from"node:path";function M(e={}){return e.kiroHome??process.env.KIRO_HOME??O(e.home??We(),".kiro")}function Ge(e={}){return O(M(e),"settings")}function V(e={}){return O(Ge(e),"mcp.json")}function Xe(e={}){return O(M(e),"hooks")}function z(e={}){return O(Xe(e),"toolnet-memory.json")}function Q(e={}){return[M(e)]}function et(e){return Ze("sh",["-lc",`command -v ${JSON.stringify(e)} >/dev/null 2>&1`],{stdio:"ignore"}).status===0}function v(e){let n=e.commandExists(e.command),t=e.configPaths.filter(i=>Ve(i)),o=t.length>0,s=[];n&&s.push(`command:${e.command}`);for(let i of t)s.push(`config:${i}`);return{agent:e.agent,detected:n||o,commandDetected:n,configDetected:o,evidence:s}}function Z(e={}){let n=e.home??ze(),t=e.commandExists??et,o=e.codexHome??process.env.CODEX_HOME??Qe(n,".codex");return[v({agent:"agy",command:"agy",commandExists:t,configPaths:B({home:n})}),v({agent:"opencode",command:"opencode",commandExists:t,configPaths:[m({home:n,xdgConfigHome:e.xdgConfigHome})]}),v({agent:"claude",command:"claude",commandExists:t,configPaths:[A({home:n})]}),v({agent:"kiro",command:"kiro-cli",commandExists:t,configPaths:Q({home:n,kiroHome:e.kiroHome})}),v({agent:"codex",command:"codex",commandExists:t,configPaths:[o]})]}import{existsSync as E,mkdirSync as ie,readFileSync as se,renameSync as yt,writeFileSync as ht}from"node:fs";import{dirname as Ot,join as N}from"node:path";import{existsSync as tt,mkdirSync as nt,readFileSync as ot,renameSync as rt,rmSync as it,writeFileSync as st}from"node:fs";import{dirname as ct}from"node:path";function at(e){return`'${e.replace(/'/g,"'\\''")}'`}function ee(e={}){let n=e.hooksFile??I();nt(ct(n),{recursive:!0,mode:448});let t={};if(tt(n)){let r;try{r=JSON.parse(ot(n,"utf8"))}catch(c){throw new Error(`Invalid existing Agy hooks.json: ${c instanceof Error?c.message:String(c)}`)}if(typeof r!="object"||r===null||Array.isArray(r))throw new Error("Invalid existing Agy hooks.json: root must be a JSON object.");t=r}let o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",s=`${at(o)} session:agy-hook`;t["toolnet-memory"]={enabled:!0,PreToolUse:[{matcher:"view_file|list_dir|find_by_name|grep_search|run_command",hooks:[{type:"command",command:`${s} pre-tool`,timeout:5}]}],PreInvocation:[{type:"command",command:`${s} pre`,timeout:15}],PostInvocation:[{type:"command",command:`${s} post`,timeout:15}],Stop:[{type:"command",command:`${s} stop`,timeout:30}]};let i=`${n}.tmp-${process.pid}-${Date.now()}`;try{st(i,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),rt(i,n)}finally{it(i,{force:!0})}return n}import{existsSync as lt,mkdirSync as ut,readFileSync as dt,renameSync as mt,writeFileSync as gt}from"node:fs";import{dirname as pt}from"node:path";function x(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function ft(e,n){ut(pt(e),{recursive:!0,mode:448});let t=`${e}.tmp-${process.pid}-${Date.now()}`;gt(t,`${JSON.stringify(n,null,2)}
`,{encoding:"utf8",mode:384}),mt(t,e)}function te(e){if(!lt(e))return{};let n=dt(e,"utf8").trim();if(!n)return{};let t;try{t=JSON.parse(n)}catch(o){throw new Error(`Invalid existing Agy MCP config: ${o instanceof Error?o.message:String(o)}`)}if(!x(t))throw new Error("Invalid existing Agy MCP config: root must be a JSON object.");return t}function ne(e,n){return x(e)?e.command===n&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function oe(e={}){let n=e.configFile??w(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",s=te(n),i=s.mcpServers;if(i!==void 0&&!x(i))throw new Error("Invalid existing Agy MCP config: mcpServers must be an object.");let r=x(i)?{...i}:{},c=r[o];if(ne(c,t))return{installed:!0,changed:!1,configFile:n,serverName:o,command:t,args:["mcp"]};r[o]={command:t,args:["mcp"]};let l={...s,mcpServers:r};ft(n,l);let a=te(n).mcpServers;if(!x(a)||!ne(a[o],t))throw new Error("Agy MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:n,serverName:o,command:t,args:["mcp"]}}var vt=`# ToolNet Memory Continuity

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
`;function ce(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function F(e,n){ie(Ot(e),{recursive:!0});let t=`${e}.tmp-${process.pid}-${Date.now()}`;ht(t,n,{encoding:"utf8",mode:384}),yt(t,e)}function re(e,n){E(e)&&se(e,"utf8")===n||F(e,n)}function ae(e){if(!E(e))return{};let n=se(e,"utf8").trim();if(!n)return{};let t;try{t=JSON.parse(n)}catch(o){throw new Error(`Invalid legacy Antigravity config ${e}: ${o instanceof Error?o.message:String(o)}`)}if(!ce(t))throw new Error(`Invalid legacy Antigravity config ${e}: root must be object`);return t}function xt(e,n){if(!E(e))return!1;let t=ae(e);if(!ce(t.mcpServers)||!Object.prototype.hasOwnProperty.call(t.mcpServers,n))return!1;let o={...t.mcpServers};return delete o[n],F(e,`${JSON.stringify({...t,mcpServers:o},null,2)}
`),!0}function bt(e){if(!E(e))return!1;let n=ae(e);if(!Object.prototype.hasOwnProperty.call(n,"toolnet-memory"))return!1;let t={...n};return delete t["toolnet-memory"],F(e,`${JSON.stringify(t,null,2)}
`),!0}function le(e={}){let n=e.pluginName??"toolnet-memory",t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.pluginRoot??K(n),s=N(o,"plugin.json"),i=N(o,"mcp_config.json"),r=N(o,"hooks.json"),c=N(o,"rules","toolnet-memory-continuity.md");ie(o,{recursive:!0,mode:448}),re(s,`${JSON.stringify({$schema:"https://antigravity.google/schemas/v1/plugin.json",name:n,description:"Persistent project continuity and memory for Antigravity coding sessions."},null,2)}
`),oe({configFile:i,binary:t,serverName:"toolnet-memory"}),ee({hooksFile:r,binary:t}),re(c,`${vt.trim()}
`);let l=e.legacyMcpFile??w(),u=e.legacyHooksFile??I(),a=[];return l!==i&&xt(l,"toolnet-memory")&&a.push(l),u!==r&&bt(u)&&a.push(u),{installed:!0,pluginRoot:o,files:[s,i,r,c],migratedLegacy:a}}import{existsSync as kt,mkdirSync as me,readFileSync as St,writeFileSync as ge}from"node:fs";import{join as wt}from"node:path";var Ct="memory_agent_ask";function ue(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${Ct}

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
`.trim()}var de="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",R="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function It(){let e=q();me(m(),{recursive:!0});let n=`${de}
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


${ue()}

${R}`,t=kt(e)?St(e,"utf8"):"",o=t.indexOf(de),s=t.indexOf(R);return o>=0&&s>=o?t=t.slice(0,o)+n+t.slice(s+R.length):(t=t.trimEnd(),t&&(t+=`

`),t+=n),ge(e,t.trimEnd()+`
`,{encoding:"utf8",mode:384}),e}function pe(e={}){let n=e.directory??Y();me(n,{recursive:!0}),It();let t=wt(n,"toolnet-memory.js"),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",s=`
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
`;return ge(t,s.trimStart(),{encoding:"utf8",mode:384}),t}import{existsSync as he,mkdirSync as Nt,readFileSync as Et,renameSync as jt,writeFileSync as Tt}from"node:fs";import{dirname as Oe,join as At}from"node:path";function f(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Mt(e,n){Nt(Oe(e),{recursive:!0});let t=`${e}.tmp-${process.pid}-${Date.now()}`;Tt(t,`${JSON.stringify(n,null,2)}
`,{encoding:"utf8",mode:384}),jt(t,e)}function fe(e){if(!he(e))return{};let n=Et(e,"utf8").trim();if(!n)return{};let t;try{t=JSON.parse(n)}catch(o){throw new Error(`Invalid existing OpenCode opencode.json: ${o instanceof Error?o.message:String(o)}`)}if(!f(t))throw new Error("Invalid existing OpenCode opencode.json: root must be a JSON object.");return t}function ye(e,n){if(!f(e))return!1;let t=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(t)&&t.length===2&&t[0]===n&&t[1]==="mcp"}function Ft(e,n){let t=e.mcpServers;if(!f(t)||!Object.prototype.hasOwnProperty.call(t,n))return{root:e,changed:!1};let o={...t};return delete o[n],{root:{...e,mcpServers:o},changed:!0}}function ve(e={}){let n=e.configFile??U(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",s=At(Oe(n),"opencode.jsonc"),i=he(s)?s:void 0,r=fe(n),c=Ft(r,o),l=c.root,u=l.mcp;if(u!==void 0&&!f(u))throw new Error("Invalid existing OpenCode config: mcp must be an object.");let a=f(u)?{...u}:{},g=a[o];if(ye(g,t)&&!c.changed)return{installed:!0,changed:!1,configFile:n,serverName:o,command:[t,"mcp"],preservedJsonc:i};a[o]={type:"local",command:[t,"mcp"],enabled:!0};let d={...l,mcp:a};Mt(n,d);let D=fe(n);if(!f(D.mcp)||!ye(D.mcp[o],t))throw new Error("OpenCode MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:n,serverName:o,command:[t,"mcp"],preservedJsonc:i}}import{existsSync as Rt,mkdirSync as xe,readFileSync as Pt,writeFileSync as be}from"node:fs";import{homedir as Ce}from"node:os";import{dirname as ke,join as P}from"node:path";function _t(e){let n=[],t=/"((?:\\.|[^"\\])*)"|'([^']*)'/g,o;for(;o=t.exec(e);){let s=o[1]??o[2]??"";try{n.push(o[1]!==void 0?JSON.parse(`"${s}"`):s)}catch{n.push(s)}}return n}function Se(e={}){let n=e.configFile??P(process.env.CODEX_HOME??P(Ce(),".codex"),"config.toml"),t=e.previousFile??P(Ce(),".config","toolnet-memory","codex-notify-previous.json");xe(ke(n),{recursive:!0}),xe(ke(t),{recursive:!0});let o=Rt(n)?Pt(n,"utf8"):"",s=e.binary??"toolnet-memory",i=`notify = [${JSON.stringify(s)}, "session:codex-notify"]`,r=o.split(`
`),c=r.findIndex(d=>/^\s*\[/.test(d));c<0&&(c=r.length);let l=-1,u=-1;for(let d=0;d<c;d+=1)if(/^\s*notify\s*=/.test(r[d])){if(l=d,u=d,r[d].includes("[")&&!r[d].includes("]"))for(;u+1<c&&(u+=1,!r[u].includes("]")););break}let a=[];if(l>=0){let d=r.slice(l,u+1).join(`
`);a=_t(d),r.splice(l,u-l+1,i)}else c=r.findIndex(d=>/^\s*\[/.test(d)),c<0&&(c=r.length),r.splice(c,0,i);let g=a.length>=2&&a[a.length-1]==="session:codex-notify";return a.length>0&&!g&&be(t,JSON.stringify(a,null,2)+`
`,{encoding:"utf8",mode:384}),o=r.join(`
`),o.endsWith(`
`)||(o+=`
`),be(n,o,{encoding:"utf8",mode:384}),{configFile:n,previousFile:t,preservedPrevious:a.length>0&&!g}}import{existsSync as Jt,mkdirSync as $t,readFileSync as Dt,writeFileSync as Ht}from"node:fs";import{homedir as Lt}from"node:os";import{dirname as Kt,join as we}from"node:path";function Bt(e){return`'${e.replace(/'/g,"'\\''")}'`}function Ie(e={}){let n=e.hooksFile??we(process.env.CODEX_HOME??we(Lt(),".codex"),"hooks.json");$t(Kt(n),{recursive:!0});let t={};if(Jt(n))try{t=JSON.parse(Dt(n,"utf8"))}catch(c){throw new Error(`Invalid existing Codex hooks.json: ${c instanceof Error?c.message:String(c)}`)}let o=t.hooks&&typeof t.hooks=="object"&&!Array.isArray(t.hooks)?t.hooks:{};t.hooks=o;let i=(Array.isArray(o.SessionStart)?o.SessionStart:[]).filter(c=>{try{return!JSON.stringify(c).includes("session:codex-context")}catch{return!0}}),r=e.binary??"toolnet-memory";return i.push({matcher:"startup|resume|clear|compact",hooks:[{type:"command",command:`${Bt(r)} session:codex-context`,timeout:15,additionalContextLimit:1e3,statusMessage:"Loading ToolNet project continuity"}]}),o.SessionStart=i,Ht(n,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),n}import{spawnSync as Ut}from"node:child_process";function _(e,n){return Ut(e,n,{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}function Ne(e,n){let t=_(e,["mcp","get",n,"--json"]);if(t.status!==0||!t.stdout)return null;try{return JSON.parse(t.stdout)}catch{return null}}function Ee(e,n){return e.enabled!==!1&&e.transport?.type==="stdio"&&e.transport?.command===n&&Array.isArray(e.transport?.args)&&e.transport?.args.length===1&&e.transport.args[0]==="mcp"}function je(e={}){let n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=e.codexBinary??"codex",o=e.serverName??"toolnet-memory",s=Ne(t,o);if(s&&Ee(s,n))return{installed:!0,changed:!1,serverName:o,command:n,args:["mcp"]};if(s){let c=_(t,["mcp","remove",o]);if(c.status!==0)return{installed:!1,changed:!1,serverName:o,command:n,args:["mcp"],error:(c.stderr||c.stdout||"Unable to remove old ToolNet MCP configuration.").trim()}}let i=_(t,["mcp","add",o,"--",n,"mcp"]);if(i.status!==0)return{installed:!1,changed:!1,serverName:o,command:n,args:["mcp"],error:(i.stderr||i.stdout||"Unable to register ToolNet MCP.").trim()};let r=Ne(t,o);return!r||!Ee(r,n)?{installed:!1,changed:!0,serverName:o,command:n,args:["mcp"],error:"Codex accepted MCP registration but verification did not match expected ToolNet command."}:{installed:!0,changed:!0,serverName:o,command:n,args:["mcp"]}}import{existsSync as Yt,mkdirSync as qt,readFileSync as Wt,renameSync as Gt,rmSync as Xt,writeFileSync as Vt}from"node:fs";import{dirname as zt}from"node:path";function b(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Qt(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function Zt(e){if(!Yt(e))return{};let n;try{n=JSON.parse(Wt(e,"utf8"))}catch(t){throw new Error(`Invalid existing Claude settings.json: ${t instanceof Error?t.message:String(t)}`)}if(!b(n))throw new Error("Invalid existing Claude settings.json: root must be a JSON object.");return n}function J(e){if(e===void 0)return[];if(!Array.isArray(e))throw new Error("Invalid existing Claude settings.json: hook event must be an array.");let n=[];for(let t of e){if(!b(t)){n.push(t);continue}let o=t.hooks;if(!Array.isArray(o)){n.push(t);continue}let s=o.filter(i=>{if(!b(i))return!0;let r=i.command;return!(typeof r=="string"&&r.includes("session:claude-hook"))});s.length!==0&&n.push({...t,hooks:s})}return n}function $(e){return{type:"command",command:e,timeout:10}}function en(e,n){qt(zt(e),{recursive:!0,mode:448});let t=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Vt(t,JSON.stringify(n,null,2)+`
`,{encoding:"utf8",mode:384}),Gt(t,e)}finally{Xt(t,{force:!0})}}function Te(e={}){let n=e.settingsFile??G(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=Zt(n),s=o.hooks;if(s!==void 0&&!b(s))throw new Error("Invalid existing Claude settings.json: hooks must be an object.");let i=b(s)?{...s}:{},r=`${Qt(t)} session:claude-hook`,c=J(i.SessionStart);c.push({matcher:"startup|resume|clear|compact",hooks:[$(r)]}),i.SessionStart=c;let l=J(i.PostToolUse);l.push({matcher:"Edit|Write",hooks:[$(r)]}),i.PostToolUse=l;let u=J(i.Stop);u.push({hooks:[$(r)]}),i.Stop=u;let a={...o,hooks:i},g=JSON.stringify(o),d=JSON.stringify(a);return g===d?{settingsFile:n,changed:!1}:(en(n,a),{settingsFile:n,changed:!0})}import{existsSync as tn,mkdirSync as nn,readFileSync as on,renameSync as rn,rmSync as sn,writeFileSync as cn}from"node:fs";import{dirname as an}from"node:path";function C(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Ae(e){if(!tn(e))return{};let n;try{n=JSON.parse(on(e,"utf8"))}catch(t){throw new Error(`Invalid existing Claude Code config: ${t instanceof Error?t.message:String(t)}`)}if(!C(n))throw new Error("Invalid existing Claude Code config: root must be a JSON object.");return n}function Me(e,n){if(!C(e))return!1;let t=e.args;return e.type==="stdio"&&e.command===n&&Array.isArray(t)&&t.length===1&&t[0]==="mcp"}function ln(e,n){nn(an(e),{recursive:!0});let t=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{cn(t,JSON.stringify(n,null,2)+`
`,{encoding:"utf8",mode:384}),rn(t,e)}finally{sn(t,{force:!0})}}function Fe(e={}){let n=e.stateFile??X(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",s=Ae(n),i=s.mcpServers;if(i!==void 0&&!C(i))throw new Error("Invalid existing Claude Code config: mcpServers must be an object.");let r=C(i)?{...i}:{},c=r[o];if(Me(c,t))return{installed:!0,changed:!1,configFile:n,serverName:o,command:[t,"mcp"],repaired:!1};let l=c!==void 0;r[o]={type:"stdio",command:t,args:["mcp"]},ln(n,{...s,mcpServers:r});let a=Ae(n).mcpServers;if(!C(a)||!Me(a[o],t))throw new Error("Claude Code MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:n,serverName:o,command:[t,"mcp"],repaired:l}}function Re(e={}){let n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=Te({binary:n,settingsFile:e.settingsFile}),o=Fe({binary:n,stateFile:e.stateFile});return{hooks:t,mcp:o,files:[t.settingsFile,o.configFile]}}import{existsSync as un,mkdirSync as dn,readFileSync as mn,renameSync as gn,rmSync as pn,writeFileSync as fn}from"node:fs";import{dirname as yn}from"node:path";var y="ToolNet Memory - ";function Je(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function hn(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function Pe(e){if(!un(e))return{};let n=mn(e,"utf8").trim();if(!n)return{};let t;try{t=JSON.parse(n)}catch(o){throw new Error(`Invalid existing Kiro hooks file: ${o instanceof Error?o.message:String(o)}`)}if(!Je(t))throw new Error("Invalid existing Kiro hooks file: root must be a JSON object.");return t}function _e(e){return Je(e)?typeof e.name=="string"&&e.name.startsWith(y):!1}function k(e){return{type:"command",command:e}}function On(e){return[{name:`${y}Session Start`,description:"Inject compact local ToolNet continuity and capture Kiro session activation.",trigger:"SessionStart",action:k(e),timeout:10,enabled:!0},{name:`${y}Prompt Continuity`,description:"Capture prompts and refresh ToolNet guidance only for resume/continue requests.",trigger:"UserPromptSubmit",action:k(e),timeout:10,enabled:!0},{name:`${y}Raw History Guard`,description:"Prevent Kiro from reconstructing continuity from raw ToolNet/agent session history.",trigger:"PreToolUse",matcher:"*",action:k(e),timeout:10,enabled:!0},{name:`${y}Tool Capture`,description:"Capture durable tool activity while filtering noisy read-only events.",trigger:"PostToolUse",matcher:"*",action:k(e),timeout:15,enabled:!0},{name:`${y}Final Flush`,description:"Flush pending Kiro WAL events when the assistant finishes a turn.",trigger:"Stop",action:k(e),timeout:30,enabled:!0}]}function vn(e,n){dn(yn(e),{recursive:!0,mode:448});let t=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{fn(t,JSON.stringify(n,null,2)+`
`,{encoding:"utf8",mode:384}),gn(t,e)}finally{pn(t,{force:!0})}}function $e(e={}){let n=e.hooksFile??z(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=Pe(n);if(o.version!==void 0&&o.version!=="v1")throw new Error(`Unsupported existing Kiro hooks version: ${String(o.version)}`);let s=o.hooks;if(s!==void 0&&!Array.isArray(s))throw new Error("Invalid existing Kiro hooks file: hooks must be an array.");let i=Array.isArray(s)?s.filter(a=>!_e(a)):[],r=`${hn(t)} session:kiro-hook`,c=On(r),l={...o,version:"v1",hooks:[...i,...c]};if(JSON.stringify(o)===JSON.stringify(l))return{hooksFile:n,changed:!1,hookCount:c.length};vn(n,l);let u=Pe(n);if(u.version!=="v1"||!Array.isArray(u.hooks)||u.hooks.filter(_e).length!==c.length)throw new Error("Kiro hooks were written but verification failed.");return{hooksFile:n,changed:!0,hookCount:c.length}}import{existsSync as xn,mkdirSync as bn,readFileSync as Cn,renameSync as kn,rmSync as Sn,writeFileSync as wn}from"node:fs";import{dirname as In}from"node:path";function S(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function De(e){if(!xn(e))return{};let n=Cn(e,"utf8").trim();if(!n)return{};let t;try{t=JSON.parse(n)}catch(o){throw new Error(`Invalid existing Kiro MCP config: ${o instanceof Error?o.message:String(o)}`)}if(!S(t))throw new Error("Invalid existing Kiro MCP config: root must be a JSON object.");return t}function He(e,n){return S(e)?e.command===n&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&e.disabled===!1:!1}function Nn(e,n){bn(In(e),{recursive:!0,mode:448});let t=`${e}.tmp-${process.pid}-${Date.now()}`;try{wn(t,`${JSON.stringify(n,null,2)}
`,{encoding:"utf8",mode:384}),kn(t,e)}finally{Sn(t,{force:!0})}}function Le(e={}){let n=e.configFile??V(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",s=De(n),i=s.mcpServers;if(i!==void 0&&!S(i))throw new Error("Invalid existing Kiro MCP config: mcpServers must be an object.");let r=S(i)?{...i}:{},c=r[o];if(He(c,t))return{installed:!0,changed:!1,configFile:n,serverName:o,command:t,args:["mcp"]};r[o]={command:t,args:["mcp"],disabled:!1};let l={...s,mcpServers:r};Nn(n,l);let a=De(n).mcpServers;if(!S(a)||!He(a[o],t))throw new Error("Kiro MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:n,serverName:o,command:t,args:["mcp"]}}function Ke(e={}){let n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=Le({binary:n,configFile:e.configFile}),o=$e({binary:n,hooksFile:e.hooksFile});return{installed:t.installed,changed:t.changed||o.changed,mcp:t,hooks:o,files:[t.configFile,o.hooksFile]}}function Be(){return Z()}function En(e={}){let n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=[],o=e.detections??Be(),s=new Map(o.map(i=>[i.agent,i.detected]));if(!(e.force===!0||s.get("agy")===!0))t.push({agent:"agy",detected:!1,installed:!1,targets:[]});else try{let r=le({binary:n});t.push({agent:"agy",detected:!0,installed:!0,targets:r.files})}catch(r){t.push({agent:"agy",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||s.get("opencode")===!0))t.push({agent:"opencode",detected:!1,installed:!1,targets:[]});else try{let r=pe({binary:n}),c=ve({binary:n});t.push({agent:"opencode",detected:!0,installed:!0,targets:[r,c.configFile,`mcp:${c.serverName}`]})}catch(r){t.push({agent:"opencode",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||s.get("claude")===!0))t.push({agent:"claude",detected:!1,installed:!1,targets:[]});else try{let r=Re({binary:n});t.push({agent:"claude",detected:!0,installed:!0,targets:[r.hooks.settingsFile,r.mcp.configFile,`mcp:${r.mcp.serverName}`]})}catch(r){t.push({agent:"claude",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||s.get("kiro")===!0))t.push({agent:"kiro",detected:!1,installed:!1,targets:[]});else try{let r=Ke({...e.kiro??{},binary:n});t.push({agent:"kiro",detected:!0,installed:!0,targets:[r.mcp.configFile,`mcp:${r.mcp.serverName}`,r.hooks.hooksFile]})}catch(r){t.push({agent:"kiro",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||s.get("codex")===!0))t.push({agent:"codex",detected:!1,installed:!1,targets:[]});else try{let r=Se({binary:n}),c=Ie({binary:n}),l=je({binary:n});if(!l.installed)throw new Error(l.error??"Codex MCP registration failed");let u=[r.configFile,c,`mcp:${l.serverName}`];r.preservedPrevious&&u.push(r.previousFile),t.push({agent:"codex",detected:!0,installed:!0,targets:u})}catch(r){t.push({agent:"codex",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}return t}function Ue(e){switch(e){case"agy":return"Agy / Antigravity";case"opencode":return"OpenCode";case"claude":return"Claude Code";case"kiro":return"Kiro CLI";case"codex":return"Codex"}}function jn(e){console.log(""),console.log("ToolNet Memory Integration Detection"),console.log("===================================="),console.log("");for(let n of e){let t=Ue(n.agent);if(!n.detected){console.log(`\u25CB ${t}: not detected`);continue}console.log(`\u2713 ${t}: detected`);for(let o of n.evidence)console.log(`  ${o}`)}console.log("")}function Tn(e){console.log(""),console.log("ToolNet Memory AI Integrations"),console.log("=============================="),console.log("");for(let n of e){let t=Ue(n.agent);if(!n.detected){console.log(`- ${t}: not detected`);continue}if(n.installed){console.log(`\u2713 ${t}: automatic memory enabled`);continue}console.log(`\u2717 ${t}: integration failed`),n.error&&console.log(`  ${n.error}`)}console.log("")}async function An(){let e=process.argv.slice(2),n=e.includes("--all"),t=e.includes("--json");if(e.includes("--detect-only")){let i=Be();if(t){console.log(JSON.stringify(i,null,2));return}jn(i);return}let s=En({force:n});if(t){console.log(JSON.stringify(s,null,2));return}Tn(s)}var Mn=process.argv[1]&&(process.argv[1].endsWith("auto-integrate.js")||process.argv[1].endsWith("auto-integrate.ts"));Mn&&An().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});export{Be as detectAutoIntegrations,En as installAutoIntegrations};
