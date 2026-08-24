import{existsSync as ot}from"node:fs";import{homedir as Uo}from"node:os";import{join as Bo}from"node:path";import{spawnSync as Ko}from"node:child_process";import{homedir as Oo}from"node:os";import{join as S}from"node:path";function Pe(e={}){return S(e.home??Oo(),".gemini")}function ne(e={}){return S(Pe(e),"config")}function G(e={}){return S(ne(e),"mcp_config.json")}function L(e={}){return S(ne(e),"hooks.json")}function Te(e={}){return S(Pe(e),"antigravity-cli")}function Ne(e="toolnet-memory",t={}){return S(Te(t),"plugins",e)}function Me(e={}){return[Te(e),ne(e)]}import{homedir as jo}from"node:os";import{join as P}from"node:path";function j(e={}){let t=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return t?P(t,"opencode"):P(e.home??jo(),".config","opencode")}function Ae(e={}){return P(j(e),"opencode.json")}function He(e={}){return P(j(e),"plugins")}function _e(e={}){return P(j(e),"AGENTS.md")}import{homedir as Je}from"node:os";import{join as re}from"node:path";function ie(e={}){return re(e.home??Je(),".claude")}function $e(e={}){return re(ie(e),"settings.json")}function De(e={}){return re(e.home??Je(),".claude.json")}import{homedir as Io}from"node:os";import{join as T}from"node:path";function se(e={}){return e.kiroHome??process.env.KIRO_HOME??T(e.home??Io(),".kiro")}function So(e={}){return T(se(e),"settings")}function Ge(e={}){return T(So(e),"mcp.json")}function vo(e={}){return T(se(e),"hooks")}function Le(e={}){return T(vo(e),"toolnet-memory.json")}function Ue(e={}){return[se(e)]}import{homedir as wo}from"node:os";import{join as h,resolve as xo}from"node:path";function U(e={}){return e.cursorHome??h(e.home??wo(),".cursor")}function Fo(e={}){return e.cursorConfigDir??process.env.CURSOR_CONFIG_DIR??(e.xdgConfigHome??process.env.XDG_CONFIG_HOME?h(e.xdgConfigHome??process.env.XDG_CONFIG_HOME,"cursor"):void 0)??U(e)}function B(e={}){return h(U(e),"mcp.json")}function K(e={}){return h(U(e),"hooks.json")}function ce(e){return h(xo(e),".cursor")}function Be(e){return h(ce(e),"mcp.json")}function Ke(e){return h(ce(e),"hooks.json")}function Ro(e){return h(ce(e),"rules")}function qe(e){return h(Ro(e),"toolnet-memory.mdc")}function We(e={}){return Array.from(new Set([U(e),Fo(e)]))}import{homedir as Eo}from"node:os";import{join as y,resolve as Po}from"node:path";function ae(e={}){return e.copilotHome??process.env.COPILOT_HOME??y(e.home??Eo(),".copilot")}function q(e={}){return y(ae(e),"mcp-config.json")}function To(e={}){return y(ae(e),"hooks")}function W(e={}){return y(To(e),"toolnet-memory.json")}function le(e){return y(Po(e),".github")}function Ye(e){return y(le(e),"mcp.json")}function No(e){return y(le(e),"hooks")}function Ve(e){return y(No(e),"toolnet-memory.json")}function Mo(e){return y(le(e),"instructions")}function Xe(e){return y(Mo(e),"toolnet-memory.instructions.md")}function ze(e={}){return[ae(e)]}import{homedir as Ao}from"node:os";import{join as d,resolve as Ho}from"node:path";function Y(e={}){return e.grokHome??process.env.GROK_HOME??d(e.home??Ao(),".grok")}function V(e={}){return d(Y(e),"config.toml")}function _o(e={}){return d(Y(e),"hooks")}function X(e={}){return d(_o(e),"toolnet-memory.json")}function Jo(e={}){return d(Y(e),"skills")}function $o(e={}){return d(Jo(e),"toolnet-continuity")}function z(e={}){return d($o(e),"SKILL.md")}function ue(e){return d(Ho(e),".grok")}function Qe(e){return d(ue(e),"config.toml")}function Do(e){return d(ue(e),"hooks")}function Ze(e){return d(Do(e),"toolnet-memory.json")}function Go(e){return d(ue(e),"skills")}function Lo(e){return d(Go(e),"toolnet-continuity")}function et(e){return d(Lo(e),"SKILL.md")}function tt(e={}){return[Y(e)]}function qo(e){return Ko("sh",["-lc",`command -v ${JSON.stringify(e)} >/dev/null 2>&1`],{stdio:"ignore"}).status===0}function I(e){let t=e.commandExists(e.command),o=e.configPaths.filter(i=>ot(i)),n=o.length>0,r=[];t&&r.push(`command:${e.command}`);for(let i of o)r.push(`config:${i}`);return{agent:e.agent,detected:t||n,commandDetected:t,configDetected:n,evidence:r}}function Wo(e){let t=e.commands.filter(s=>e.commandExists(s)),o=e.configPaths.filter(s=>ot(s)),n=t.length>0,r=o.length>0,i=[...t.map(s=>`command:${s}`),...o.map(s=>`config:${s}`)];return{agent:e.agent,detected:n||r,commandDetected:n,configDetected:r,evidence:i}}function nt(e={}){let t=e.home??Uo(),o=e.commandExists??qo,n=e.codexHome??process.env.CODEX_HOME??Bo(t,".codex");return[I({agent:"agy",command:"agy",commandExists:o,configPaths:Me({home:t})}),I({agent:"opencode",command:"opencode",commandExists:o,configPaths:[j({home:t,xdgConfigHome:e.xdgConfigHome})]}),I({agent:"claude",command:"claude",commandExists:o,configPaths:[ie({home:t})]}),I({agent:"kiro",command:"kiro-cli",commandExists:o,configPaths:Ue({home:t,kiroHome:e.kiroHome})}),Wo({agent:"cursor",commands:["agent","cursor-agent"],commandExists:o,configPaths:We({home:t,cursorHome:e.cursorHome,cursorConfigDir:e.cursorConfigDir,xdgConfigHome:e.xdgConfigHome})}),I({agent:"copilot",command:"copilot",commandExists:o,configPaths:ze({home:t,copilotHome:e.copilotHome})}),I({agent:"grok",command:"grok",commandExists:o,configPaths:tt({home:t,grokHome:e.grokHome})}),I({agent:"codex",command:"codex",commandExists:o,configPaths:[n]})]}import{existsSync as Z,mkdirSync as lt,readFileSync as ut,renameSync as un,writeFileSync as pn}from"node:fs";import{dirname as gn,join as Q}from"node:path";import{existsSync as Yo,mkdirSync as Vo,readFileSync as Xo,renameSync as zo,rmSync as Qo,writeFileSync as Zo}from"node:fs";import{dirname as en}from"node:path";function tn(e){return`'${e.replace(/'/g,"'\\''")}'`}function rt(e={}){let t=e.hooksFile??L();Vo(en(t),{recursive:!0,mode:448});let o={};if(Yo(t)){let s;try{s=JSON.parse(Xo(t,"utf8"))}catch(c){throw new Error(`Invalid existing Agy hooks.json: ${c instanceof Error?c.message:String(c)}`)}if(typeof s!="object"||s===null||Array.isArray(s))throw new Error("Invalid existing Agy hooks.json: root must be a JSON object.");o=s}let n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=`${tn(n)} session:agy-hook`;o["toolnet-memory"]={enabled:!0,PreToolUse:[{matcher:"view_file|list_dir|find_by_name|grep_search|run_command",hooks:[{type:"command",command:`${r} pre-tool`,timeout:5}]}],PreInvocation:[{type:"command",command:`${r} pre`,timeout:15}],PostInvocation:[{type:"command",command:`${r} post`,timeout:15}],Stop:[{type:"command",command:`${r} stop`,timeout:30}]};let i=`${t}.tmp-${process.pid}-${Date.now()}`;try{Zo(i,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),zo(i,t)}finally{Qo(i,{force:!0})}return t}import{existsSync as on,mkdirSync as nn,readFileSync as rn,renameSync as sn,writeFileSync as cn}from"node:fs";import{dirname as an}from"node:path";function N(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function ln(e,t){nn(an(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;cn(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),sn(o,e)}function it(e){if(!on(e))return{};let t=rn(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch(n){throw new Error(`Invalid existing Agy MCP config: ${n instanceof Error?n.message:String(n)}`)}if(!N(o))throw new Error("Invalid existing Agy MCP config: root must be a JSON object.");return o}function st(e,t){return N(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function ct(e={}){let t=e.configFile??G(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=it(t),i=r.mcpServers;if(i!==void 0&&!N(i))throw new Error("Invalid existing Agy MCP config: mcpServers must be an object.");let s=N(i)?{...i}:{},c=s[n];if(st(c,o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};s[n]={command:o,args:["mcp"]};let a={...r,mcpServers:s};ln(t,a);let l=it(t).mcpServers;if(!N(l)||!st(l[n],o))throw new Error("Agy MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}var fn=`# ToolNet Memory Continuity

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
`;function pt(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function pe(e,t){lt(gn(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;pn(o,t,{encoding:"utf8",mode:384}),un(o,e)}function at(e,t){Z(e)&&ut(e,"utf8")===t||pe(e,t)}function gt(e){if(!Z(e))return{};let t=ut(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch(n){throw new Error(`Invalid legacy Antigravity config ${e}: ${n instanceof Error?n.message:String(n)}`)}if(!pt(o))throw new Error(`Invalid legacy Antigravity config ${e}: root must be object`);return o}function dn(e,t){if(!Z(e))return!1;let o=gt(e);if(!pt(o.mcpServers)||!Object.prototype.hasOwnProperty.call(o.mcpServers,t))return!1;let n={...o.mcpServers};return delete n[t],pe(e,`${JSON.stringify({...o,mcpServers:n},null,2)}
`),!0}function mn(e){if(!Z(e))return!1;let t=gt(e);if(!Object.prototype.hasOwnProperty.call(t,"toolnet-memory"))return!1;let o={...t};return delete o["toolnet-memory"],pe(e,`${JSON.stringify(o,null,2)}
`),!0}function ft(e={}){let t=e.pluginName??"toolnet-memory",o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.pluginRoot??Ne(t),r=Q(n,"plugin.json"),i=Q(n,"mcp_config.json"),s=Q(n,"hooks.json"),c=Q(n,"rules","toolnet-memory-continuity.md");lt(n,{recursive:!0,mode:448}),at(r,`${JSON.stringify({$schema:"https://antigravity.google/schemas/v1/plugin.json",name:t,description:"Persistent project continuity and memory for Antigravity coding sessions."},null,2)}
`),ct({configFile:i,binary:o,serverName:"toolnet-memory"}),rt({hooksFile:s,binary:o}),at(c,`${fn.trim()}
`);let a=e.legacyMcpFile??G(),u=e.legacyHooksFile??L(),l=[];return a!==i&&dn(a,"toolnet-memory")&&l.push(a),u!==s&&mn(u)&&l.push(u),{installed:!0,pluginRoot:n,files:[r,i,s,c],migratedLegacy:l}}import{existsSync as hn,mkdirSync as yt,readFileSync as kn,writeFileSync as ht}from"node:fs";import{join as bn}from"node:path";var yn="memory_agent_ask";function dt(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${yn}

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
`.trim()}var mt="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",ge="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function Cn(){let e=_e();yt(j(),{recursive:!0});let t=`${mt}
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


${dt()}

${ge}`,o=hn(e)?kn(e,"utf8"):"",n=o.indexOf(mt),r=o.indexOf(ge);return n>=0&&r>=n?o=o.slice(0,n)+t+o.slice(r+ge.length):(o=o.trimEnd(),o&&(o+=`

`),o+=t),ht(e,o.trimEnd()+`
`,{encoding:"utf8",mode:384}),e}function kt(e={}){let t=e.directory??He();yt(t,{recursive:!0}),Cn();let o=bn(t,"toolnet-memory.js"),n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=`
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
`;return ht(o,r.trimStart(),{encoding:"utf8",mode:384}),o}import{existsSync as Ot,mkdirSync as On,readFileSync as jn,renameSync as In,writeFileSync as Sn}from"node:fs";import{dirname as jt,join as vn}from"node:path";function v(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function wn(e,t){On(jt(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;Sn(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),In(o,e)}function bt(e){if(!Ot(e))return{};let t=jn(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch(n){throw new Error(`Invalid existing OpenCode opencode.json: ${n instanceof Error?n.message:String(n)}`)}if(!v(o))throw new Error("Invalid existing OpenCode opencode.json: root must be a JSON object.");return o}function Ct(e,t){if(!v(e))return!1;let o=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(o)&&o.length===2&&o[0]===t&&o[1]==="mcp"}function xn(e,t){let o=e.mcpServers;if(!v(o)||!Object.prototype.hasOwnProperty.call(o,t))return{root:e,changed:!1};let n={...o};return delete n[t],{root:{...e,mcpServers:n},changed:!0}}function It(e={}){let t=e.configFile??Ae(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=vn(jt(t),"opencode.jsonc"),i=Ot(r)?r:void 0,s=bt(t),c=xn(s,n),a=c.root,u=a.mcp;if(u!==void 0&&!v(u))throw new Error("Invalid existing OpenCode config: mcp must be an object.");let l=v(u)?{...u}:{},p=l[n];if(Ct(p,o)&&!c.changed)return{installed:!0,changed:!1,configFile:t,serverName:n,command:[o,"mcp"],preservedJsonc:i};l[n]={type:"local",command:[o,"mcp"],enabled:!0};let g={...a,mcp:l};wn(t,g);let O=bt(t);if(!v(O.mcp)||!Ct(O.mcp[n],o))throw new Error("OpenCode MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:[o,"mcp"],preservedJsonc:i}}import{existsSync as Fn,mkdirSync as St,readFileSync as Rn,writeFileSync as vt}from"node:fs";import{homedir as wt}from"node:os";import{dirname as xt,join as fe}from"node:path";function En(e){let t=[],o=/"((?:\\.|[^"\\])*)"|'([^']*)'/g,n;for(;n=o.exec(e);){let r=n[1]??n[2]??"";try{t.push(n[1]!==void 0?JSON.parse(`"${r}"`):r)}catch{t.push(r)}}return t}function Ft(e={}){let t=e.configFile??fe(process.env.CODEX_HOME??fe(wt(),".codex"),"config.toml"),o=e.previousFile??fe(wt(),".config","toolnet-memory","codex-notify-previous.json");St(xt(t),{recursive:!0}),St(xt(o),{recursive:!0});let n=Fn(t)?Rn(t,"utf8"):"",r=e.binary??"toolnet-memory",i=`notify = [${JSON.stringify(r)}, "session:codex-notify"]`,s=n.split(`
`),c=s.findIndex(g=>/^\s*\[/.test(g));c<0&&(c=s.length);let a=-1,u=-1;for(let g=0;g<c;g+=1)if(/^\s*notify\s*=/.test(s[g])){if(a=g,u=g,s[g].includes("[")&&!s[g].includes("]"))for(;u+1<c&&(u+=1,!s[u].includes("]")););break}let l=[];if(a>=0){let g=s.slice(a,u+1).join(`
`);l=En(g),s.splice(a,u-a+1,i)}else c=s.findIndex(g=>/^\s*\[/.test(g)),c<0&&(c=s.length),s.splice(c,0,i);let p=l.length>=2&&l[l.length-1]==="session:codex-notify";return l.length>0&&!p&&vt(o,JSON.stringify(l,null,2)+`
`,{encoding:"utf8",mode:384}),n=s.join(`
`),n.endsWith(`
`)||(n+=`
`),vt(t,n,{encoding:"utf8",mode:384}),{configFile:t,previousFile:o,preservedPrevious:l.length>0&&!p}}import{existsSync as Pn,mkdirSync as Tn,readFileSync as Nn,writeFileSync as Mn}from"node:fs";import{homedir as An}from"node:os";import{dirname as Hn,join as Rt}from"node:path";function _n(e){return`'${e.replace(/'/g,"'\\''")}'`}function Et(e={}){let t=e.hooksFile??Rt(process.env.CODEX_HOME??Rt(An(),".codex"),"hooks.json");Tn(Hn(t),{recursive:!0});let o={};if(Pn(t))try{o=JSON.parse(Nn(t,"utf8"))}catch(c){throw new Error(`Invalid existing Codex hooks.json: ${c instanceof Error?c.message:String(c)}`)}let n=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=n;let i=(Array.isArray(n.SessionStart)?n.SessionStart:[]).filter(c=>{try{return!JSON.stringify(c).includes("session:codex-context")}catch{return!0}}),s=e.binary??"toolnet-memory";return i.push({matcher:"startup|resume|clear|compact",hooks:[{type:"command",command:`${_n(s)} session:codex-context`,timeout:15,additionalContextLimit:1e3,statusMessage:"Loading ToolNet project continuity"}]}),n.SessionStart=i,Mn(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),t}import{spawnSync as Jn}from"node:child_process";function de(e,t){return Jn(e,t,{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}function Pt(e,t){let o=de(e,["mcp","get",t,"--json"]);if(o.status!==0||!o.stdout)return null;try{return JSON.parse(o.stdout)}catch{return null}}function Tt(e,t){return e.enabled!==!1&&e.transport?.type==="stdio"&&e.transport?.command===t&&Array.isArray(e.transport?.args)&&e.transport?.args.length===1&&e.transport.args[0]==="mcp"}function Nt(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.codexBinary??"codex",n=e.serverName??"toolnet-memory",r=Pt(o,n);if(r&&Tt(r,t))return{installed:!0,changed:!1,serverName:n,command:t,args:["mcp"]};if(r){let c=de(o,["mcp","remove",n]);if(c.status!==0)return{installed:!1,changed:!1,serverName:n,command:t,args:["mcp"],error:(c.stderr||c.stdout||"Unable to remove old ToolNet MCP configuration.").trim()}}let i=de(o,["mcp","add",n,"--",t,"mcp"]);if(i.status!==0)return{installed:!1,changed:!1,serverName:n,command:t,args:["mcp"],error:(i.stderr||i.stdout||"Unable to register ToolNet MCP.").trim()};let s=Pt(o,n);return!s||!Tt(s,t)?{installed:!1,changed:!0,serverName:n,command:t,args:["mcp"],error:"Codex accepted MCP registration but verification did not match expected ToolNet command."}:{installed:!0,changed:!0,serverName:n,command:t,args:["mcp"]}}import{existsSync as $n,mkdirSync as Dn,readFileSync as Gn,renameSync as Ln,rmSync as Un,writeFileSync as Bn}from"node:fs";import{dirname as Kn}from"node:path";function M(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function qn(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function Wn(e){if(!$n(e))return{};let t;try{t=JSON.parse(Gn(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude settings.json: ${o instanceof Error?o.message:String(o)}`)}if(!M(t))throw new Error("Invalid existing Claude settings.json: root must be a JSON object.");return t}function me(e){if(e===void 0)return[];if(!Array.isArray(e))throw new Error("Invalid existing Claude settings.json: hook event must be an array.");let t=[];for(let o of e){if(!M(o)){t.push(o);continue}let n=o.hooks;if(!Array.isArray(n)){t.push(o);continue}let r=n.filter(i=>{if(!M(i))return!0;let s=i.command;return!(typeof s=="string"&&s.includes("session:claude-hook"))});r.length!==0&&t.push({...o,hooks:r})}return t}function ye(e){return{type:"command",command:e,timeout:10}}function Yn(e,t){Dn(Kn(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Bn(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Ln(o,e)}finally{Un(o,{force:!0})}}function Mt(e={}){let t=e.settingsFile??$e(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=Wn(t),r=n.hooks;if(r!==void 0&&!M(r))throw new Error("Invalid existing Claude settings.json: hooks must be an object.");let i=M(r)?{...r}:{},s=`${qn(o)} session:claude-hook`,c=me(i.SessionStart);c.push({matcher:"startup|resume|clear|compact",hooks:[ye(s)]}),i.SessionStart=c;let a=me(i.PostToolUse);a.push({matcher:"Edit|Write",hooks:[ye(s)]}),i.PostToolUse=a;let u=me(i.Stop);u.push({hooks:[ye(s)]}),i.Stop=u;let l={...n,hooks:i},p=JSON.stringify(n),g=JSON.stringify(l);return p===g?{settingsFile:t,changed:!1}:(Yn(t,l),{settingsFile:t,changed:!0})}import{existsSync as Vn,mkdirSync as Xn,readFileSync as zn,renameSync as Qn,rmSync as Zn,writeFileSync as er}from"node:fs";import{dirname as tr}from"node:path";function A(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function At(e){if(!Vn(e))return{};let t;try{t=JSON.parse(zn(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude Code config: ${o instanceof Error?o.message:String(o)}`)}if(!A(t))throw new Error("Invalid existing Claude Code config: root must be a JSON object.");return t}function Ht(e,t){if(!A(e))return!1;let o=e.args;return e.type==="stdio"&&e.command===t&&Array.isArray(o)&&o.length===1&&o[0]==="mcp"}function or(e,t){Xn(tr(e),{recursive:!0});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{er(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Qn(o,e)}finally{Zn(o,{force:!0})}}function _t(e={}){let t=e.stateFile??De(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=At(t),i=r.mcpServers;if(i!==void 0&&!A(i))throw new Error("Invalid existing Claude Code config: mcpServers must be an object.");let s=A(i)?{...i}:{},c=s[n];if(Ht(c,o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:[o,"mcp"],repaired:!1};let a=c!==void 0;s[n]={type:"stdio",command:o,args:["mcp"]},or(t,{...r,mcpServers:s});let l=At(t).mcpServers;if(!A(l)||!Ht(l[n],o))throw new Error("Claude Code MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:[o,"mcp"],repaired:a}}function Jt(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=Mt({binary:t,settingsFile:e.settingsFile}),n=_t({binary:t,stateFile:e.stateFile});return{hooks:o,mcp:n,files:[o.settingsFile,n.configFile]}}import{existsSync as nr,mkdirSync as rr,readFileSync as ir,renameSync as sr,rmSync as cr,writeFileSync as ar}from"node:fs";import{dirname as lr}from"node:path";var w="ToolNet Memory - ";function Gt(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function ur(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function $t(e){if(!nr(e))return{};let t=ir(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch(n){throw new Error(`Invalid existing Kiro hooks file: ${n instanceof Error?n.message:String(n)}`)}if(!Gt(o))throw new Error("Invalid existing Kiro hooks file: root must be a JSON object.");return o}function Dt(e){return Gt(e)?typeof e.name=="string"&&e.name.startsWith(w):!1}function H(e){return{type:"command",command:e}}function pr(e){return[{name:`${w}Session Start`,description:"Inject compact local ToolNet continuity and capture Kiro session activation.",trigger:"SessionStart",action:H(e),timeout:10,enabled:!0},{name:`${w}Prompt Continuity`,description:"Capture prompts and refresh ToolNet guidance only for resume/continue requests.",trigger:"UserPromptSubmit",action:H(e),timeout:10,enabled:!0},{name:`${w}Raw History Guard`,description:"Prevent Kiro from reconstructing continuity from raw ToolNet/agent session history.",trigger:"PreToolUse",matcher:"*",action:H(e),timeout:10,enabled:!0},{name:`${w}Tool Capture`,description:"Capture durable tool activity while filtering noisy read-only events.",trigger:"PostToolUse",matcher:"*",action:H(e),timeout:15,enabled:!0},{name:`${w}Final Flush`,description:"Flush pending Kiro WAL events when the assistant finishes a turn.",trigger:"Stop",action:H(e),timeout:30,enabled:!0}]}function gr(e,t){rr(lr(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{ar(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),sr(o,e)}finally{cr(o,{force:!0})}}function Lt(e={}){let t=e.hooksFile??Le(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=$t(t);if(n.version!==void 0&&n.version!=="v1")throw new Error(`Unsupported existing Kiro hooks version: ${String(n.version)}`);let r=n.hooks;if(r!==void 0&&!Array.isArray(r))throw new Error("Invalid existing Kiro hooks file: hooks must be an array.");let i=Array.isArray(r)?r.filter(l=>!Dt(l)):[],s=`${ur(o)} session:kiro-hook`,c=pr(s),a={...n,version:"v1",hooks:[...i,...c]};if(JSON.stringify(n)===JSON.stringify(a))return{hooksFile:t,changed:!1,hookCount:c.length};gr(t,a);let u=$t(t);if(u.version!=="v1"||!Array.isArray(u.hooks)||u.hooks.filter(Dt).length!==c.length)throw new Error("Kiro hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:c.length}}import{existsSync as fr,mkdirSync as dr,readFileSync as mr,renameSync as yr,rmSync as hr,writeFileSync as kr}from"node:fs";import{dirname as br}from"node:path";function _(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Ut(e){if(!fr(e))return{};let t=mr(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch(n){throw new Error(`Invalid existing Kiro MCP config: ${n instanceof Error?n.message:String(n)}`)}if(!_(o))throw new Error("Invalid existing Kiro MCP config: root must be a JSON object.");return o}function Bt(e,t){return _(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&e.disabled===!1:!1}function Cr(e,t){dr(br(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{kr(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),yr(o,e)}finally{hr(o,{force:!0})}}function Kt(e={}){let t=e.configFile??Ge(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=Ut(t),i=r.mcpServers;if(i!==void 0&&!_(i))throw new Error("Invalid existing Kiro MCP config: mcpServers must be an object.");let s=_(i)?{...i}:{},c=s[n];if(Bt(c,o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};s[n]={command:o,args:["mcp"],disabled:!1};let a={...r,mcpServers:s};Cr(t,a);let l=Ut(t).mcpServers;if(!_(l)||!Bt(l[n],o))throw new Error("Kiro MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}function qt(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=Kt({binary:t,configFile:e.configFile}),n=Lt({binary:t,hooksFile:e.hooksFile});return{installed:o.installed,changed:o.changed||n.changed,mcp:o,hooks:n,files:[o.configFile,n.hooksFile]}}import{existsSync as Or,mkdirSync as jr,readFileSync as Ir,renameSync as Sr,rmSync as vr,writeFileSync as wr}from"node:fs";import{dirname as xr}from"node:path";function f(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function k(e,t){if(!Or(e))return{};let o=Ir(e,"utf8").trim();if(!o)return{};let n;try{n=JSON.parse(o)}catch(r){throw new Error(`Invalid existing ${t} hooks file: ${r instanceof Error?r.message:String(r)}`)}if(!f(n))throw new Error(`Invalid existing ${t} hooks file: root must be a JSON object.`);return n}function x(e,t){jr(xr(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{wr(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Sr(o,e)}finally{vr(o,{force:!0})}}function he(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}var J=[["sessionStart",10],["beforeSubmitPrompt",10],["preToolUse",10],["postToolUse",15],["afterAgentResponse",15],["stop",30]];function Wt(e){return f(e)&&typeof e.command=="string"&&e.command.includes("session:cursor-hook")}function Fr(e,t,o){let r={type:"command",command:`TOOLNET_HOOK_EVENT=${he(e)} ${he(t)} session:cursor-hook`,timeout:o};return e==="preToolUse"&&(r.matcher=".*"),r}function ke(e={}){let t=e.hooksFile??K(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=k(t,"Cursor");if(n.version!==void 0&&n.version!==1)throw new Error(`Unsupported existing Cursor hooks version: ${String(n.version)}`);let r=n.hooks;if(r!==void 0&&!f(r))throw new Error("Invalid existing Cursor hooks file: hooks must be an object.");let i=f(r)?{...r}:{};for(let[u,l]of J){let p=i[u];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing Cursor hooks file: hooks.${u} must be an array.`);let g=Array.isArray(p)?p.filter(O=>!Wt(O)):[];i[u]=[...g,Fr(u,o,l)]}let s={...n,version:1,hooks:i};if(JSON.stringify(n)===JSON.stringify(s))return{hooksFile:t,changed:!1,hookCount:J.length};x(t,s);let c=k(t,"Cursor");if(c.version!==1||!f(c.hooks))throw new Error("Cursor hooks were written but verification failed.");let a=0;for(let[u]of J){let l=c.hooks[u];if(!Array.isArray(l))throw new Error("Cursor hooks were written but verification failed.");a+=l.filter(Wt).length}if(a!==J.length)throw new Error("Cursor hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:J.length}}import{existsSync as Rr,mkdirSync as Er,readFileSync as Pr,renameSync as Tr,rmSync as Nr,writeFileSync as Mr}from"node:fs";import{dirname as Ar}from"node:path";function m(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function F(e,t){if(!Rr(e))return{};let o=Pr(e,"utf8").trim();if(!o)return{};let n;try{n=JSON.parse(o)}catch(r){throw new Error(`Invalid existing ${t} MCP config: ${r instanceof Error?r.message:String(r)}`)}if(!m(n))throw new Error(`Invalid existing ${t} MCP config: root must be a JSON object.`);return n}function ee(e,t){Er(Ar(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Mr(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Tr(o,e)}finally{Nr(o,{force:!0})}}function Yt(e,t){return m(e)?(e.type===void 0||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function be(e={}){let t=e.configFile??B(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=F(t,"Cursor"),i=r.mcpServers;if(i!==void 0&&!m(i))throw new Error("Invalid existing Cursor MCP config: mcpServers must be an object.");let s=m(i)?{...i}:{};if(Yt(s[n],o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};s[n]={type:"stdio",command:o,args:["mcp"]},ee(t,{...r,mcpServers:s});let a=F(t,"Cursor").mcpServers;if(!m(a)||!Yt(a[n],o))throw new Error("Cursor MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}import{mkdirSync as Hr,readFileSync as Vt,renameSync as _r,rmSync as Jr,writeFileSync as $r}from"node:fs";import{dirname as Dr}from"node:path";var Ce=`---
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
  - \`.toolnet/sessions/**\`
  - ToolNet raw \`events.jsonl\`
  - ToolNet raw \`state.json\`
  - another coding agent's private transcript/history files.
- After continuity is recovered, verify current repository source and git
  state before changing code.
- Do not ask the user to repeat project context that ToolNet already provides.

Current repository evidence overrides stale memory.
`;function Gr(e,t){Hr(Dr(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{$r(o,t,{encoding:"utf8",mode:384}),_r(o,e)}finally{Jr(o,{force:!0})}}function Xt(e){let t=e.ruleFile??qe(e.projectRoot);try{if(Vt(t,"utf8")===Ce)return{ruleFile:t,changed:!1}}catch{}if(Gr(t,Ce),Vt(t,"utf8")!==Ce)throw new Error("Cursor ToolNet project rule was written but verification failed.");return{ruleFile:t,changed:!0}}import{spawnSync as Lr}from"node:child_process";import{existsSync as R,statSync as Ur}from"node:fs";import{dirname as Br,join as Kr,parse as qr,resolve as je}from"node:path";function zt(e){let t=je(e);if(!R(t))throw new Error(`Project path does not exist: ${t}`);if(!Ur(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);return t}function te(e){return Kr(e,".toolnet","project.json")}function Wr(e){let t=je(e),o=qr(t).root;for(;;){if(R(te(t)))return t;if(t===o)return;let n=Br(t);if(n===t)return;t=n}}function Oe(e){let t=Lr("git",["rev-parse","--show-toplevel"],{cwd:e,encoding:"utf8",timeout:5e3});if(t.status!==0)return;let o=t.stdout.trim();return o?je(o):void 0}function b(e={}){let t=zt(e.cwd??process.cwd());if(e.project){let r=zt(e.project),i=te(r),s=Oe(r);return{root:r,source:"explicit",eligible:!0,toolnetProject:R(i),manifestFile:R(i)?i:void 0,gitRoot:s}}let o=Wr(t);if(o){let r=te(o);return{root:o,source:"toolnet",eligible:!0,toolnetProject:!0,manifestFile:r,gitRoot:Oe(o)}}let n=Oe(t);if(n){let r=te(n);return{root:n,source:"git",eligible:!0,toolnetProject:R(r),manifestFile:R(r)?r:void 0,gitRoot:n}}return{root:t,source:"cwd",eligible:!1,toolnetProject:!1}}function to(e,t={}){let o=[],n=e.indexOf("--scope");if(n>=0){let i=e[n+1];if(i!=="global"&&i!=="project"&&i!=="both")throw new Error(`Invalid --scope value: ${String(i)}`);o.push(i)}e.includes("--global")&&o.push("global"),e.includes("--both")&&o.push("both");let r=Array.from(new Set(o));if(r.length>1)throw new Error(`Conflicting integration scopes: ${r.join(", ")}`);return r[0]??t.defaultScope??"global"}function Qt(e,t){return{install:e,effective:t}}function C(e,t){return{surface:e,global:Qt(t.globalInstall,t.effective==="global"||t.effective==="both"),project:Qt(t.projectInstall,t.effective==="project"||t.effective==="both"),effective:t.effective,risk:t.risk??"none",dedupeRequired:t.dedupeRequired??!1,trustRequired:t.trustRequired??t.projectInstall,note:t.note}}function Yr(e){return{mcp:C("mcp",{globalInstall:!0,projectInstall:!1,effective:"global"}),hooks:C("hooks",{globalInstall:!0,projectInstall:!1,effective:"global"}),work:C("work",{globalInstall:e==="grok",projectInstall:!1,effective:e==="grok"?"global":"none",note:e==="grok"?"Grok supports a global ToolNet continuity skill.":"Cursor/Copilot work instructions remain project-scoped."})}}function Zt(e){return{mcp:C("mcp",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),hooks:C("hooks",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),work:C("work",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!1,note:e==="cursor"?"Use .cursor/rules/toolnet-memory.mdc.":e==="copilot"?"Use .github/instructions/toolnet-memory.instructions.md.":"Use .grok/skills/toolnet-continuity/SKILL.md."})}}function eo(e){return{mcp:C("mcp",{globalInstall:!0,projectInstall:!0,effective:"project",risk:e==="cursor"?"precedence-unverified":"shadowed-global",trustRequired:!0,note:e==="cursor"?"Project ToolNet MCP is the intended effective definition; native same-name precedence must be E2E certified before release.":"Global remains useful outside the project; same-name project definition wins inside the project."}),hooks:C("hooks",{globalInstall:!0,projectInstall:!0,effective:"both",risk:"additive-duplicate",dedupeRequired:!0,trustRequired:!0,note:"Global and project hook sources can both execute for the same native event."}),work:C("work",{globalInstall:e==="grok",projectInstall:!0,effective:"project",risk:e==="grok"?"shadowed-global":"none",trustRequired:!1,note:e==="cursor"?"Project rule is authoritative.":e==="copilot"?"Project instruction is authoritative.":"Project skill shadows the same-name global skill inside the project."})}}function E(e){let{agent:t,scope:o,project:n}=e;return(o==="project"||o==="both")&&(!n||!n.eligible)?{agent:t,requestedScope:o,project:n,surfaces:o==="both"?eo(t):Zt(t),canInstall:!1,reason:"Project scope requires an explicit project, existing ToolNet project, or Git repository root."}:{agent:t,requestedScope:o,project:n,surfaces:o==="global"?Yr(t):o==="project"?Zt(t):eo(t),canInstall:!0}}function oo(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.rule?.changed)}function no(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=o==="global"?void 0:b({project:e.projectRoot}),r=E({agent:"cursor",scope:o,project:n});if(!r.canInstall)throw new Error(r.reason??"Cursor project integration scope cannot be resolved.");let i,s;if((r.surfaces.mcp.global.install||r.surfaces.hooks.global.install||r.surfaces.work.global.install)&&(i={},r.surfaces.mcp.global.install&&(i.mcp=be({binary:t,configFile:e.configFile??B()})),r.surfaces.hooks.global.install&&(i.hooks=ke({binary:t,hooksFile:e.hooksFile??K()}))),r.surfaces.mcp.project.install||r.surfaces.hooks.project.install||r.surfaces.work.project.install){if(!n?.eligible)throw new Error("Cursor project integration requires an eligible project root.");s={},r.surfaces.mcp.project.install&&(s.mcp=be({binary:t,configFile:e.projectConfigFile??Be(n.root)})),r.surfaces.hooks.project.install&&(s.hooks=ke({binary:t,hooksFile:e.projectHooksFile??Ke(n.root)})),r.surfaces.work.project.install&&(s.rule=Xt({projectRoot:n.root,ruleFile:e.projectRuleFile}))}let c=s?.mcp??i?.mcp,a=s?.hooks??i?.hooks;if(!c||!a)throw new Error("Cursor integration did not produce an effective MCP/hooks installation.");let u=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.rule?.ruleFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.rule?.ruleFile].filter(l=>typeof l=="string")));return{installed:!0,changed:oo(i)||oo(s),scope:o,plan:r,project:n,global:i,projectScope:s,mcp:c,hooks:a,rule:s?.rule,files:u}}var $=[["sessionStart",10],["userPromptSubmitted",10],["userPromptTransformed",10],["preToolUse",10],["postToolUse",15],["agentStop",30]];function Vr(e){if(typeof e.command=="string")return e.command;if(typeof e.bash=="string")return e.bash}function ro(e){return f(e)&&Vr(e)?.includes("session:copilot-hook")===!0}function Xr(e,t,o){let n={type:"command",command:`${t} session:copilot-hook`,env:{TOOLNET_HOOK_EVENT:e},timeoutSec:o};return e==="preToolUse"&&(n.matcher=".*"),n}function Ie(e={}){let t=e.hooksFile??W(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=k(t,"GitHub Copilot CLI");if(n.version!==void 0&&n.version!==1)throw new Error(`Unsupported existing GitHub Copilot CLI hooks version: ${String(n.version)}`);let r=n.hooks;if(r!==void 0&&!f(r))throw new Error("Invalid existing GitHub Copilot CLI hooks file: hooks must be an object.");let i=f(r)?{...r}:{};for(let[u,l]of $){let p=i[u];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing GitHub Copilot CLI hooks file: hooks.${u} must be an array.`);let g=Array.isArray(p)?p.filter(O=>!ro(O)):[];i[u]=[...g,Xr(u,o,l)]}let s={...n,version:1,hooks:i};if(JSON.stringify(n)===JSON.stringify(s))return{hooksFile:t,changed:!1,hookCount:$.length};x(t,s);let c=k(t,"GitHub Copilot CLI");if(c.version!==1||!f(c.hooks))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");let a=0;for(let[u]of $){let l=c.hooks[u];if(!Array.isArray(l))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");a+=l.filter(ro).length}if(a!==$.length)throw new Error("GitHub Copilot CLI hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:$.length}}function io(e,t){return m(e)?(e.type===void 0||e.type==="local"||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&Array.isArray(e.tools)&&e.tools.length===1&&e.tools[0]==="*":!1}function Se(e={}){let t=e.configFile??q(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=F(t,"GitHub Copilot CLI"),i=r.mcpServers;if(i!==void 0&&!m(i))throw new Error("Invalid existing GitHub Copilot CLI MCP config: mcpServers must be an object.");let s=m(i)?{...i}:{};if(io(s[n],o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};s[n]={type:"stdio",command:o,args:["mcp"],tools:["*"]},ee(t,{...r,mcpServers:s});let a=F(t,"GitHub Copilot CLI").mcpServers;if(!m(a)||!io(a[n],o))throw new Error("GitHub Copilot CLI MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}import{mkdirSync as zr,readFileSync as so,renameSync as Qr,rmSync as Zr,writeFileSync as ei}from"node:fs";import{dirname as ti}from"node:path";var ve=`---
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
  - \`.toolnet/sessions/**\`
  - ToolNet raw \`events.jsonl\`
  - ToolNet raw \`state.json\`
  - another coding agent's private transcript/history files.
- After continuity is recovered, verify current repository source and git
  state before changing code.
- Do not ask the user to repeat context ToolNet already provides.

Current repository evidence overrides stale memory.
`;function oi(e,t){zr(ti(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{ei(o,t,{encoding:"utf8",mode:384}),Qr(o,e)}finally{Zr(o,{force:!0})}}function co(e){let t=e.instructionFile??Xe(e.projectRoot);try{if(so(t,"utf8")===ve)return{instructionFile:t,changed:!1}}catch{}if(oi(t,ve),so(t,"utf8")!==ve)throw new Error("Copilot ToolNet project instruction verification failed.");return{instructionFile:t,changed:!0}}function ao(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.instruction?.changed)}function lo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=o==="global"?void 0:b({project:e.projectRoot}),r=E({agent:"copilot",scope:o,project:n});if(!r.canInstall)throw new Error(r.reason??"Copilot project integration scope cannot be resolved.");let i,s;if((r.surfaces.mcp.global.install||r.surfaces.hooks.global.install||r.surfaces.work.global.install)&&(i={},r.surfaces.mcp.global.install&&(i.mcp=Se({binary:t,configFile:e.configFile??q()})),r.surfaces.hooks.global.install&&(i.hooks=Ie({binary:t,hooksFile:e.hooksFile??W()}))),r.surfaces.mcp.project.install||r.surfaces.hooks.project.install||r.surfaces.work.project.install){if(!n?.eligible)throw new Error("Copilot project integration requires an eligible project root.");s={},r.surfaces.mcp.project.install&&(s.mcp=Se({binary:t,configFile:e.projectConfigFile??Ye(n.root)})),r.surfaces.hooks.project.install&&(s.hooks=Ie({binary:t,hooksFile:e.projectHooksFile??Ve(n.root)})),r.surfaces.work.project.install&&(s.instruction=co({projectRoot:n.root,instructionFile:e.projectInstructionFile}))}let c=s?.mcp??i?.mcp,a=s?.hooks??i?.hooks;if(!c||!a)throw new Error("Copilot integration did not produce effective MCP/hooks.");let u=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.instruction?.instructionFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.instruction?.instructionFile].filter(l=>typeof l=="string")));return{installed:!0,changed:ao(i)||ao(s),scope:o,plan:r,project:n,global:i,projectScope:s,mcp:c,hooks:a,instruction:s?.instruction,files:u}}import{existsSync as ni,mkdirSync as ri,readFileSync as uo,renameSync as ii,rmSync as si,writeFileSync as ci}from"node:fs";import{dirname as ai}from"node:path";var we=`---
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
`;function li(e,t){ri(ai(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{ci(o,t,{encoding:"utf8",mode:384}),ii(o,e)}finally{si(o,{force:!0})}}function xe(e={}){let t=e.skillFile??z();if(ni(t)&&uo(t,"utf8")===we)return{skillFile:t,changed:!1};if(li(t,we),uo(t,"utf8")!==we)throw new Error("Grok ToolNet continuity skill was written but verification failed.");return{skillFile:t,changed:!0}}var D=[["SessionStart",10],["UserPromptSubmit",10],["PreToolUse",10],["PostToolUse",15],["Stop",30]];function po(e){return!f(e)||!Array.isArray(e.hooks)?!1:e.hooks.some(t=>f(t)&&typeof t.command=="string"&&t.command.includes("session:grok-hook"))}function ui(e,t,o){let n={hooks:[{type:"command",command:`${t} session:grok-hook`,timeout:o,env:{TOOLNET_HOOK_EVENT:e}}]};return e==="PreToolUse"&&(n.matcher=".*"),n}function Fe(e={}){let t=e.hooksFile??X(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=k(t,"Grok Build"),r=n.hooks;if(r!==void 0&&!f(r))throw new Error("Invalid existing Grok Build hooks file: hooks must be an object.");let i=f(r)?{...r}:{};for(let[u,l]of D){let p=i[u];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing Grok Build hooks file: hooks.${u} must be an array.`);let g=Array.isArray(p)?p.filter(O=>!po(O)):[];i[u]=[...g,ui(u,o,l)]}let s={...n,hooks:i};if(JSON.stringify(n)===JSON.stringify(s))return{hooksFile:t,changed:!1,hookCount:D.length};x(t,s);let c=k(t,"Grok Build");if(!f(c.hooks))throw new Error("Grok Build hooks were written but verification failed.");let a=0;for(let[u]of D){let l=c.hooks[u];if(!Array.isArray(l))throw new Error("Grok Build hooks were written but verification failed.");a+=l.filter(po).length}if(a!==D.length)throw new Error("Grok Build hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:D.length}}import{existsSync as pi,mkdirSync as gi,readFileSync as fi,renameSync as di,rmSync as mi,writeFileSync as yi}from"node:fs";import{dirname as hi}from"node:path";function go(e){return pi(e)?fi(e,"utf8"):""}function ki(e,t){gi(hi(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{yi(o,t,{encoding:"utf8",mode:384}),di(o,e)}finally{mi(o,{force:!0})}}function Re(e){return e.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t")}function bi(e){return`[mcp_servers."${Re(e)}"]`}function Ci(e,t){return[bi(e),`command = "${Re(t)}"`,'args = ["mcp"]',"enabled = true"].join(`
`)}function Oi(e){let t=e.trim();return t.startsWith("[")&&t.includes("]")}function oe(e){return e.trim().replace(/\s+/g,"")}function ji(e){return new Set([oe(`[mcp_servers.${e}]`),oe(`[mcp_servers."${e}"]`),oe(`[mcp_servers.'${e}']`)])}function mo(e,t){let o=e.split(/\r?\n/),n=ji(t),r=-1;for(let l=0;l<o.length;l+=1){let p=oe(o[l].replace(/\s+#.*$/,""));if(n.has(p)){r=l;break}}if(r<0)return null;let i=o.length;for(let l=r+1;l<o.length;l+=1)if(Oi(o[l])){i=l;break}let s=[],c=0;for(let l of o)s.push(c),c+=l.length+1;let a=s[r]??0,u=i>=o.length?e.length:s[i]??e.length;return{start:a,end:u}}function Ii(e,t,o){let n=`${Ci(t,o)}
`,r=mo(e,t);if(r){let i=e.slice(0,r.start),s=e.slice(r.end);return`${i}${n}${s.replace(/^\n+/,"")}`}return e.trim()?`${e.replace(/\s*$/,"")}

${n}`:n}function fo(e,t,o){let n=mo(e,t);if(!n)return!1;let r=e.slice(n.start,n.end);return r.includes(`command = "${Re(o)}"`)&&/args\s*=\s*\[\s*"mcp"\s*\]/.test(r)&&/enabled\s*=\s*true/.test(r)}function Ee(e={}){let t=e.configFile??V(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=go(t);if(fo(r,n,o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};let i=Ii(r,n,o);ki(t,i);let s=go(t);if(!fo(s,n,o))throw new Error("Grok Build MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}function yo(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.skill?.changed)}function ho(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=o==="global"?void 0:b({project:e.projectRoot}),r=E({agent:"grok",scope:o,project:n});if(!r.canInstall)throw new Error(r.reason??"Grok project integration scope cannot be resolved.");let i,s;if((r.surfaces.mcp.global.install||r.surfaces.hooks.global.install||r.surfaces.work.global.install)&&(i={},r.surfaces.mcp.global.install&&(i.mcp=Ee({binary:t,configFile:e.configFile??V()})),r.surfaces.hooks.global.install&&(i.hooks=Fe({binary:t,hooksFile:e.hooksFile??X()})),r.surfaces.work.global.install&&(i.skill=xe({skillFile:e.skillFile??z()}))),r.surfaces.mcp.project.install||r.surfaces.hooks.project.install||r.surfaces.work.project.install){if(!n?.eligible)throw new Error("Grok project integration requires an eligible project root.");s={},r.surfaces.mcp.project.install&&(s.mcp=Ee({binary:t,configFile:e.projectConfigFile??Qe(n.root)})),r.surfaces.hooks.project.install&&(s.hooks=Fe({binary:t,hooksFile:e.projectHooksFile??Ze(n.root)})),r.surfaces.work.project.install&&(s.skill=xe({skillFile:e.projectSkillFile??et(n.root)}))}let c=s?.mcp??i?.mcp,a=s?.hooks??i?.hooks,u=s?.skill??i?.skill;if(!c||!a||!u)throw new Error("Grok integration did not produce effective MCP/hooks/skill.");let l=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.skill?.skillFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.skill?.skillFile].filter(p=>typeof p=="string")));return{installed:!0,changed:yo(i)||yo(s),scope:o,plan:r,project:n,global:i,projectScope:s,mcp:c,hooks:a,skill:u,files:l}}function ko(e={}){if(e.scope==="global")return{scope:"global",automatic:!1,reason:"explicit-global"};if(e.scope==="project"||e.scope==="both"){let o=b({cwd:e.cwd,project:e.projectRoot});if(!o.eligible)throw new Error(`Explicit ${e.scope} integration requires an explicit project, ToolNet project, or Git repository root.`);return{scope:e.scope,automatic:!1,project:o,reason:e.scope==="project"?"explicit-project":"explicit-both"}}let t=b({cwd:e.cwd,project:e.projectRoot});return t.toolnetProject?{scope:"both",automatic:!0,project:t,reason:"toolnet-project"}:{scope:"global",automatic:!0,reason:"no-toolnet-project"}}function bo(){return nt()}function Si(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[],n=e.detections??bo(),r=new Map(n.map(s=>[s.agent,s.detected])),i=ko({scope:e.scope,projectRoot:e.projectRoot,cwd:e.cwd});if(!(e.force===!0||r.get("agy")===!0))o.push({agent:"agy",detected:!1,installed:!1,targets:[]});else try{let c=ft({binary:t});o.push({agent:"agy",detected:!0,installed:!0,targets:c.files})}catch(c){o.push({agent:"agy",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("opencode")===!0))o.push({agent:"opencode",detected:!1,installed:!1,targets:[]});else try{let c=kt({binary:t}),a=It({binary:t});o.push({agent:"opencode",detected:!0,installed:!0,targets:[c,a.configFile,`mcp:${a.serverName}`]})}catch(c){o.push({agent:"opencode",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("claude")===!0))o.push({agent:"claude",detected:!1,installed:!1,targets:[]});else try{let c=Jt({binary:t});o.push({agent:"claude",detected:!0,installed:!0,targets:[c.hooks.settingsFile,c.mcp.configFile,`mcp:${c.mcp.serverName}`]})}catch(c){o.push({agent:"claude",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("kiro")===!0))o.push({agent:"kiro",detected:!1,installed:!1,targets:[]});else try{let c=qt({...e.kiro??{},binary:t});o.push({agent:"kiro",detected:!0,installed:!0,targets:[c.mcp.configFile,`mcp:${c.mcp.serverName}`,c.hooks.hooksFile]})}catch(c){o.push({agent:"kiro",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("cursor")===!0))o.push({agent:"cursor",detected:!1,installed:!1,targets:[]});else try{let c=e.cursor??{},a=no({...c,binary:t,scope:c.scope??i.scope,projectRoot:c.projectRoot??i.project?.root});o.push({agent:"cursor",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(c){o.push({agent:"cursor",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("copilot")===!0))o.push({agent:"copilot",detected:!1,installed:!1,targets:[]});else try{let c=e.copilot??{},a=lo({...c,binary:t,scope:c.scope??i.scope,projectRoot:c.projectRoot??i.project?.root});o.push({agent:"copilot",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(c){o.push({agent:"copilot",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("grok")===!0))o.push({agent:"grok",detected:!1,installed:!1,targets:[]});else try{let c=e.grok??{},a=ho({...c,binary:t,scope:c.scope??i.scope,projectRoot:c.projectRoot??i.project?.root});o.push({agent:"grok",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(c){o.push({agent:"grok",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("codex")===!0))o.push({agent:"codex",detected:!1,installed:!1,targets:[]});else try{let c=Ft({binary:t}),a=Et({binary:t}),u=Nt({binary:t});if(!u.installed)throw new Error(u.error??"Codex MCP registration failed");let l=[c.configFile,a,`mcp:${u.serverName}`];c.preservedPrevious&&l.push(c.previousFile),o.push({agent:"codex",detected:!0,installed:!0,targets:l})}catch(c){o.push({agent:"codex",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}return o}function Co(e){switch(e){case"agy":return"Agy / Antigravity";case"opencode":return"OpenCode";case"claude":return"Claude Code";case"kiro":return"Kiro CLI";case"cursor":return"Cursor CLI";case"copilot":return"GitHub Copilot CLI";case"grok":return"Grok Build";case"codex":return"Codex"}}function vi(e){console.log(""),console.log("ToolNet Memory Integration Detection"),console.log("===================================="),console.log("");for(let t of e){let o=Co(t.agent);if(!t.detected){console.log(`\u25CB ${o}: not detected`);continue}console.log(`\u2713 ${o}: detected`);for(let n of t.evidence)console.log(`  ${n}`)}console.log("")}function wi(e){console.log(""),console.log("ToolNet Memory AI Integrations"),console.log("=============================="),console.log("");for(let t of e){let o=Co(t.agent);if(!t.detected){console.log(`- ${o}: not detected`);continue}if(t.installed){let n=t.scope?` [scope=${t.scope}]`:"";console.log(`\u2713 ${o}: automatic memory enabled${n}`),t.projectRoot&&console.log(`  project: ${t.projectRoot}`);continue}console.log(`\u2717 ${o}: integration failed`),t.error&&console.log(`  ${t.error}`)}console.log("")}function xi(e,t){let o=e.indexOf(t);return o>=0?e[o+1]:void 0}function Fi(e){return e.includes("--scope")||e.includes("--global")||e.includes("--both")?to(e):void 0}async function Ri(){let e=process.argv.slice(2),t=e.includes("--all"),o=e.includes("--json"),n=e.includes("--detect-only"),r=Fi(e),i=xi(e,"--project");if(n){let c=bo();if(o){console.log(JSON.stringify(c,null,2));return}vi(c);return}let s=Si({force:t,scope:r,projectRoot:i});if(o){console.log(JSON.stringify(s,null,2));return}wi(s)}var Ei=process.argv[1]&&(process.argv[1].endsWith("auto-integrate.js")||process.argv[1].endsWith("auto-integrate.ts"));Ei&&Ri().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});export{bo as detectAutoIntegrations,Si as installAutoIntegrations};
