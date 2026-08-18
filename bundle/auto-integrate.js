import{existsSync as je}from"node:fs";import{homedir as Ae}from"node:os";import{join as Me}from"node:path";import{spawnSync as Fe}from"node:child_process";import{homedir as Te}from"node:os";import{join as p}from"node:path";function _(e={}){return p(e.home??Te(),".gemini")}function I(e={}){return p(_(e),"config")}function x(e={}){return p(I(e),"mcp_config.json")}function C(e={}){return p(I(e),"hooks.json")}function P(e={}){return p(_(e),"antigravity-cli")}function J(e="toolnet-memory",n={}){return p(P(n),"plugins",e)}function D(e={}){return[P(e),I(e)]}import{homedir as Ee}from"node:os";import{join as y}from"node:path";function m(e={}){let n=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return n?y(n,"opencode"):y(e.home??Ee(),".config","opencode")}function $(e={}){return y(m(e),"opencode.json")}function L(e={}){return y(m(e),"plugins")}function H(e={}){return y(m(e),"AGENTS.md")}import{homedir as B}from"node:os";import{join as k}from"node:path";function N(e={}){return k(e.home??B(),".claude")}function U(e={}){return k(N(e),"settings.json")}function Y(e={}){return k(e.home??B(),".claude.json")}function Re(e){return Fe("sh",["-lc",`command -v ${JSON.stringify(e)} >/dev/null 2>&1`],{stdio:"ignore"}).status===0}function S(e){let n=e.commandExists(e.command),t=e.configPaths.filter(s=>je(s)),o=t.length>0,i=[];n&&i.push(`command:${e.command}`);for(let s of t)i.push(`config:${s}`);return{agent:e.agent,detected:n||o,commandDetected:n,configDetected:o,evidence:i}}function q(e={}){let n=e.home??Ae(),t=e.commandExists??Re,o=e.codexHome??process.env.CODEX_HOME??Me(n,".codex");return[S({agent:"agy",command:"agy",commandExists:t,configPaths:D({home:n})}),S({agent:"opencode",command:"opencode",commandExists:t,configPaths:[m({home:n,xdgConfigHome:e.xdgConfigHome})]}),S({agent:"claude",command:"claude",commandExists:t,configPaths:[N({home:n})]}),S({agent:"codex",command:"codex",commandExists:t,configPaths:[o]})]}import{existsSync as w,mkdirSync as z,readFileSync as Q,renameSync as Ve,writeFileSync as ze}from"node:fs";import{dirname as Qe,join as b}from"node:path";import{existsSync as _e,mkdirSync as Pe,readFileSync as Je,renameSync as De,rmSync as $e,writeFileSync as Le}from"node:fs";import{dirname as He}from"node:path";function Be(e){return`'${e.replace(/'/g,"'\\''")}'`}function W(e={}){let n=e.hooksFile??C();Pe(He(n),{recursive:!0,mode:448});let t={};if(_e(n)){let r;try{r=JSON.parse(Je(n,"utf8"))}catch(c){throw new Error(`Invalid existing Agy hooks.json: ${c instanceof Error?c.message:String(c)}`)}if(typeof r!="object"||r===null||Array.isArray(r))throw new Error("Invalid existing Agy hooks.json: root must be a JSON object.");t=r}let o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",i=`${Be(o)} session:agy-hook`;t["toolnet-memory"]={enabled:!0,PreToolUse:[{matcher:"view_file|list_dir|find_by_name|grep_search|run_command",hooks:[{type:"command",command:`${i} pre-tool`,timeout:5}]}],PreInvocation:[{type:"command",command:`${i} pre`,timeout:15}],PostInvocation:[{type:"command",command:`${i} post`,timeout:15}],Stop:[{type:"command",command:`${i} stop`,timeout:30}]};let s=`${n}.tmp-${process.pid}-${Date.now()}`;try{Le(s,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),De(s,n)}finally{$e(s,{force:!0})}return n}import{existsSync as Ue,mkdirSync as Ye,readFileSync as qe,renameSync as We,writeFileSync as Ge}from"node:fs";import{dirname as Xe}from"node:path";function h(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Ke(e,n){Ye(Xe(e),{recursive:!0,mode:448});let t=`${e}.tmp-${process.pid}-${Date.now()}`;Ge(t,`${JSON.stringify(n,null,2)}
`,{encoding:"utf8",mode:384}),We(t,e)}function G(e){if(!Ue(e))return{};let n=qe(e,"utf8").trim();if(!n)return{};let t;try{t=JSON.parse(n)}catch(o){throw new Error(`Invalid existing Agy MCP config: ${o instanceof Error?o.message:String(o)}`)}if(!h(t))throw new Error("Invalid existing Agy MCP config: root must be a JSON object.");return t}function X(e,n){return h(e)?e.command===n&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function K(e={}){let n=e.configFile??x(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",i=G(n),s=i.mcpServers;if(s!==void 0&&!h(s))throw new Error("Invalid existing Agy MCP config: mcpServers must be an object.");let r=h(s)?{...s}:{},c=r[o];if(X(c,t))return{installed:!0,changed:!1,configFile:n,serverName:o,command:t,args:["mcp"]};r[o]={command:t,args:["mcp"]};let l={...i,mcpServers:r};Ke(n,l);let a=G(n).mcpServers;if(!h(a)||!X(a[o],t))throw new Error("Agy MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:n,serverName:o,command:t,args:["mcp"]}}var Ze=`# ToolNet Memory Continuity

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
`;function Z(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function T(e,n){z(Qe(e),{recursive:!0});let t=`${e}.tmp-${process.pid}-${Date.now()}`;ze(t,n,{encoding:"utf8",mode:384}),Ve(t,e)}function V(e,n){w(e)&&Q(e,"utf8")===n||T(e,n)}function ee(e){if(!w(e))return{};let n=Q(e,"utf8").trim();if(!n)return{};let t;try{t=JSON.parse(n)}catch(o){throw new Error(`Invalid legacy Antigravity config ${e}: ${o instanceof Error?o.message:String(o)}`)}if(!Z(t))throw new Error(`Invalid legacy Antigravity config ${e}: root must be object`);return t}function et(e,n){if(!w(e))return!1;let t=ee(e);if(!Z(t.mcpServers)||!Object.prototype.hasOwnProperty.call(t.mcpServers,n))return!1;let o={...t.mcpServers};return delete o[n],T(e,`${JSON.stringify({...t,mcpServers:o},null,2)}
`),!0}function tt(e){if(!w(e))return!1;let n=ee(e);if(!Object.prototype.hasOwnProperty.call(n,"toolnet-memory"))return!1;let t={...n};return delete t["toolnet-memory"],T(e,`${JSON.stringify(t,null,2)}
`),!0}function te(e={}){let n=e.pluginName??"toolnet-memory",t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.pluginRoot??J(n),i=b(o,"plugin.json"),s=b(o,"mcp_config.json"),r=b(o,"hooks.json"),c=b(o,"rules","toolnet-memory-continuity.md");z(o,{recursive:!0,mode:448}),V(i,`${JSON.stringify({$schema:"https://antigravity.google/schemas/v1/plugin.json",name:n,description:"Persistent project continuity and memory for Antigravity coding sessions."},null,2)}
`),K({configFile:s,binary:t,serverName:"toolnet-memory"}),W({hooksFile:r,binary:t}),V(c,`${Ze.trim()}
`);let l=e.legacyMcpFile??x(),u=e.legacyHooksFile??C(),a=[];return l!==s&&et(l,"toolnet-memory")&&a.push(l),u!==r&&tt(u)&&a.push(u),{installed:!0,pluginRoot:o,files:[i,s,r,c],migratedLegacy:a}}import{existsSync as ot,mkdirSync as re,readFileSync as rt,writeFileSync as se}from"node:fs";import{join as st}from"node:path";var nt="memory_agent_ask";function ne(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${nt}

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
`.trim()}var oe="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",E="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function it(){let e=H();re(m(),{recursive:!0});let n=`${oe}
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


${ne()}

${E}`,t=ot(e)?rt(e,"utf8"):"",o=t.indexOf(oe),i=t.indexOf(E);return o>=0&&i>=o?t=t.slice(0,o)+n+t.slice(i+E.length):(t=t.trimEnd(),t&&(t+=`

`),t+=n),se(e,t.trimEnd()+`
`,{encoding:"utf8",mode:384}),e}function ie(e={}){let n=e.directory??L();re(n,{recursive:!0}),it();let t=st(n,"toolnet-memory.js"),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",i=`
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
`;return se(t,i.trimStart(),{encoding:"utf8",mode:384}),t}import{existsSync as le,mkdirSync as ct,readFileSync as at,renameSync as lt,writeFileSync as ut}from"node:fs";import{dirname as ue,join as dt}from"node:path";function f(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function mt(e,n){ct(ue(e),{recursive:!0});let t=`${e}.tmp-${process.pid}-${Date.now()}`;ut(t,`${JSON.stringify(n,null,2)}
`,{encoding:"utf8",mode:384}),lt(t,e)}function ce(e){if(!le(e))return{};let n=at(e,"utf8").trim();if(!n)return{};let t;try{t=JSON.parse(n)}catch(o){throw new Error(`Invalid existing OpenCode opencode.json: ${o instanceof Error?o.message:String(o)}`)}if(!f(t))throw new Error("Invalid existing OpenCode opencode.json: root must be a JSON object.");return t}function ae(e,n){if(!f(e))return!1;let t=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(t)&&t.length===2&&t[0]===n&&t[1]==="mcp"}function gt(e,n){let t=e.mcpServers;if(!f(t)||!Object.prototype.hasOwnProperty.call(t,n))return{root:e,changed:!1};let o={...t};return delete o[n],{root:{...e,mcpServers:o},changed:!0}}function de(e={}){let n=e.configFile??$(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",i=dt(ue(n),"opencode.jsonc"),s=le(i)?i:void 0,r=ce(n),c=gt(r,o),l=c.root,u=l.mcp;if(u!==void 0&&!f(u))throw new Error("Invalid existing OpenCode config: mcp must be an object.");let a=f(u)?{...u}:{},g=a[o];if(ae(g,t)&&!c.changed)return{installed:!0,changed:!1,configFile:n,serverName:o,command:[t,"mcp"],preservedJsonc:s};a[o]={type:"local",command:[t,"mcp"],enabled:!0};let d={...l,mcp:a};mt(n,d);let R=ce(n);if(!f(R.mcp)||!ae(R.mcp[o],t))throw new Error("OpenCode MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:n,serverName:o,command:[t,"mcp"],preservedJsonc:s}}import{existsSync as pt,mkdirSync as me,readFileSync as ft,writeFileSync as ge}from"node:fs";import{homedir as pe}from"node:os";import{dirname as fe,join as j}from"node:path";function yt(e){let n=[],t=/"((?:\\.|[^"\\])*)"|'([^']*)'/g,o;for(;o=t.exec(e);){let i=o[1]??o[2]??"";try{n.push(o[1]!==void 0?JSON.parse(`"${i}"`):i)}catch{n.push(i)}}return n}function ye(e={}){let n=e.configFile??j(process.env.CODEX_HOME??j(pe(),".codex"),"config.toml"),t=e.previousFile??j(pe(),".config","toolnet-memory","codex-notify-previous.json");me(fe(n),{recursive:!0}),me(fe(t),{recursive:!0});let o=pt(n)?ft(n,"utf8"):"",i=e.binary??"toolnet-memory",s=`notify = [${JSON.stringify(i)}, "session:codex-notify"]`,r=o.split(`
`),c=r.findIndex(d=>/^\s*\[/.test(d));c<0&&(c=r.length);let l=-1,u=-1;for(let d=0;d<c;d+=1)if(/^\s*notify\s*=/.test(r[d])){if(l=d,u=d,r[d].includes("[")&&!r[d].includes("]"))for(;u+1<c&&(u+=1,!r[u].includes("]")););break}let a=[];if(l>=0){let d=r.slice(l,u+1).join(`
`);a=yt(d),r.splice(l,u-l+1,s)}else c=r.findIndex(d=>/^\s*\[/.test(d)),c<0&&(c=r.length),r.splice(c,0,s);let g=a.length>=2&&a[a.length-1]==="session:codex-notify";return a.length>0&&!g&&ge(t,JSON.stringify(a,null,2)+`
`,{encoding:"utf8",mode:384}),o=r.join(`
`),o.endsWith(`
`)||(o+=`
`),ge(n,o,{encoding:"utf8",mode:384}),{configFile:n,previousFile:t,preservedPrevious:a.length>0&&!g}}import{existsSync as ht,mkdirSync as Ot,readFileSync as vt,writeFileSync as xt}from"node:fs";import{homedir as Ct}from"node:os";import{dirname as St,join as he}from"node:path";function bt(e){return`'${e.replace(/'/g,"'\\''")}'`}function Oe(e={}){let n=e.hooksFile??he(process.env.CODEX_HOME??he(Ct(),".codex"),"hooks.json");Ot(St(n),{recursive:!0});let t={};if(ht(n))try{t=JSON.parse(vt(n,"utf8"))}catch(c){throw new Error(`Invalid existing Codex hooks.json: ${c instanceof Error?c.message:String(c)}`)}let o=t.hooks&&typeof t.hooks=="object"&&!Array.isArray(t.hooks)?t.hooks:{};t.hooks=o;let s=(Array.isArray(o.SessionStart)?o.SessionStart:[]).filter(c=>{try{return!JSON.stringify(c).includes("session:codex-context")}catch{return!0}}),r=e.binary??"toolnet-memory";return s.push({matcher:"startup|resume|clear|compact",hooks:[{type:"command",command:`${bt(r)} session:codex-context`,timeout:15,additionalContextLimit:1e3,statusMessage:"Loading ToolNet project continuity"}]}),o.SessionStart=s,xt(n,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),n}import{spawnSync as wt}from"node:child_process";function A(e,n){return wt(e,n,{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}function ve(e,n){let t=A(e,["mcp","get",n,"--json"]);if(t.status!==0||!t.stdout)return null;try{return JSON.parse(t.stdout)}catch{return null}}function xe(e,n){return e.enabled!==!1&&e.transport?.type==="stdio"&&e.transport?.command===n&&Array.isArray(e.transport?.args)&&e.transport?.args.length===1&&e.transport.args[0]==="mcp"}function Ce(e={}){let n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=e.codexBinary??"codex",o=e.serverName??"toolnet-memory",i=ve(t,o);if(i&&xe(i,n))return{installed:!0,changed:!1,serverName:o,command:n,args:["mcp"]};if(i){let c=A(t,["mcp","remove",o]);if(c.status!==0)return{installed:!1,changed:!1,serverName:o,command:n,args:["mcp"],error:(c.stderr||c.stdout||"Unable to remove old ToolNet MCP configuration.").trim()}}let s=A(t,["mcp","add",o,"--",n,"mcp"]);if(s.status!==0)return{installed:!1,changed:!1,serverName:o,command:n,args:["mcp"],error:(s.stderr||s.stdout||"Unable to register ToolNet MCP.").trim()};let r=ve(t,o);return!r||!xe(r,n)?{installed:!1,changed:!0,serverName:o,command:n,args:["mcp"],error:"Codex accepted MCP registration but verification did not match expected ToolNet command."}:{installed:!0,changed:!0,serverName:o,command:n,args:["mcp"]}}import{existsSync as It,mkdirSync as kt,readFileSync as Nt,renameSync as Tt,rmSync as Et,writeFileSync as jt}from"node:fs";import{dirname as At}from"node:path";function O(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Mt(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function Ft(e){if(!It(e))return{};let n;try{n=JSON.parse(Nt(e,"utf8"))}catch(t){throw new Error(`Invalid existing Claude settings.json: ${t instanceof Error?t.message:String(t)}`)}if(!O(n))throw new Error("Invalid existing Claude settings.json: root must be a JSON object.");return n}function M(e){if(e===void 0)return[];if(!Array.isArray(e))throw new Error("Invalid existing Claude settings.json: hook event must be an array.");let n=[];for(let t of e){if(!O(t)){n.push(t);continue}let o=t.hooks;if(!Array.isArray(o)){n.push(t);continue}let i=o.filter(s=>{if(!O(s))return!0;let r=s.command;return!(typeof r=="string"&&r.includes("session:claude-hook"))});i.length!==0&&n.push({...t,hooks:i})}return n}function F(e){return{type:"command",command:e,timeout:10}}function Rt(e,n){kt(At(e),{recursive:!0,mode:448});let t=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{jt(t,JSON.stringify(n,null,2)+`
`,{encoding:"utf8",mode:384}),Tt(t,e)}finally{Et(t,{force:!0})}}function Se(e={}){let n=e.settingsFile??U(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=Ft(n),i=o.hooks;if(i!==void 0&&!O(i))throw new Error("Invalid existing Claude settings.json: hooks must be an object.");let s=O(i)?{...i}:{},r=`${Mt(t)} session:claude-hook`,c=M(s.SessionStart);c.push({matcher:"startup|resume|clear|compact",hooks:[F(r)]}),s.SessionStart=c;let l=M(s.PostToolUse);l.push({matcher:"Edit|Write",hooks:[F(r)]}),s.PostToolUse=l;let u=M(s.Stop);u.push({hooks:[F(r)]}),s.Stop=u;let a={...o,hooks:s},g=JSON.stringify(o),d=JSON.stringify(a);return g===d?{settingsFile:n,changed:!1}:(Rt(n,a),{settingsFile:n,changed:!0})}import{existsSync as _t,mkdirSync as Pt,readFileSync as Jt,renameSync as Dt,rmSync as $t,writeFileSync as Lt}from"node:fs";import{dirname as Ht}from"node:path";function v(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function be(e){if(!_t(e))return{};let n;try{n=JSON.parse(Jt(e,"utf8"))}catch(t){throw new Error(`Invalid existing Claude Code config: ${t instanceof Error?t.message:String(t)}`)}if(!v(n))throw new Error("Invalid existing Claude Code config: root must be a JSON object.");return n}function we(e,n){if(!v(e))return!1;let t=e.args;return e.type==="stdio"&&e.command===n&&Array.isArray(t)&&t.length===1&&t[0]==="mcp"}function Bt(e,n){Pt(Ht(e),{recursive:!0});let t=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Lt(t,JSON.stringify(n,null,2)+`
`,{encoding:"utf8",mode:384}),Dt(t,e)}finally{$t(t,{force:!0})}}function Ie(e={}){let n=e.stateFile??Y(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",i=be(n),s=i.mcpServers;if(s!==void 0&&!v(s))throw new Error("Invalid existing Claude Code config: mcpServers must be an object.");let r=v(s)?{...s}:{},c=r[o];if(we(c,t))return{installed:!0,changed:!1,configFile:n,serverName:o,command:[t,"mcp"],repaired:!1};let l=c!==void 0;r[o]={type:"stdio",command:t,args:["mcp"]},Bt(n,{...i,mcpServers:r});let a=be(n).mcpServers;if(!v(a)||!we(a[o],t))throw new Error("Claude Code MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:n,serverName:o,command:[t,"mcp"],repaired:l}}function ke(e={}){let n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=Se({binary:n,settingsFile:e.settingsFile}),o=Ie({binary:n,stateFile:e.stateFile});return{hooks:t,mcp:o,files:[t.settingsFile,o.configFile]}}function Ne(){return q()}function Ut(e={}){let n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=[],o=Ne(),i=new Map(o.map(s=>[s.agent,s.detected]));if(!(e.force===!0||i.get("agy")===!0))t.push({agent:"agy",detected:!1,installed:!1,targets:[]});else try{let r=te({binary:n});t.push({agent:"agy",detected:!0,installed:!0,targets:r.files})}catch(r){t.push({agent:"agy",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("opencode")===!0))t.push({agent:"opencode",detected:!1,installed:!1,targets:[]});else try{let r=ie({binary:n}),c=de({binary:n});t.push({agent:"opencode",detected:!0,installed:!0,targets:[r,c.configFile,`mcp:${c.serverName}`]})}catch(r){t.push({agent:"opencode",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("claude")===!0))t.push({agent:"claude",detected:!1,installed:!1,targets:[]});else try{let r=ke({binary:n});t.push({agent:"claude",detected:!0,installed:!0,targets:[r.hooks.settingsFile,r.mcp.configFile,`mcp:${r.mcp.serverName}`]})}catch(r){t.push({agent:"claude",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("codex")===!0))t.push({agent:"codex",detected:!1,installed:!1,targets:[]});else try{let r=ye({binary:n}),c=Oe({binary:n}),l=Ce({binary:n});if(!l.installed)throw new Error(l.error??"Codex MCP registration failed");let u=[r.configFile,c,`mcp:${l.serverName}`];r.preservedPrevious&&u.push(r.previousFile),t.push({agent:"codex",detected:!0,installed:!0,targets:u})}catch(r){t.push({agent:"codex",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}return t}function Yt(e){console.log(""),console.log("ToolNet Memory Integration Detection"),console.log("===================================="),console.log("");for(let n of e){let t=n.agent==="agy"?"Agy / Antigravity":n.agent==="opencode"?"OpenCode":n.agent==="claude"?"Claude Code":"Codex";if(!n.detected){console.log(`\u25CB ${t}: not detected`);continue}console.log(`\u2713 ${t}: detected`);for(let o of n.evidence)console.log(`  ${o}`)}console.log("")}function qt(e){console.log(""),console.log("ToolNet Memory AI Integrations"),console.log("=============================="),console.log("");for(let n of e){let t=n.agent==="agy"?"Agy / Antigravity":n.agent==="opencode"?"OpenCode":"Codex";if(!n.detected){console.log(`- ${t}: not detected`);continue}if(n.installed){console.log(`\u2713 ${t}: automatic memory enabled`);continue}console.log(`\u2717 ${t}: integration failed`),n.error&&console.log(`  ${n.error}`)}console.log("")}async function Wt(){let e=process.argv.slice(2),n=e.includes("--all"),t=e.includes("--json");if(e.includes("--detect-only")){let s=Ne();if(t){console.log(JSON.stringify(s,null,2));return}Yt(s);return}let i=Ut({force:n});if(t){console.log(JSON.stringify(i,null,2));return}qt(i)}var Gt=process.argv[1]&&(process.argv[1].endsWith("auto-integrate.js")||process.argv[1].endsWith("auto-integrate.ts"));Gt&&Wt().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});export{Ne as detectAutoIntegrations,Ut as installAutoIntegrations};
