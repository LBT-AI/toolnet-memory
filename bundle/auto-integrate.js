import{existsSync as gt}from"node:fs";import{homedir as cn}from"node:os";import{join as ln}from"node:path";import{spawnSync as an}from"node:child_process";import{homedir as Ao}from"node:os";import{join as v}from"node:path";function _e(e={}){return v(e.home??Ao(),".gemini")}function ne(e={}){return v(_e(e),"config")}function L(e={}){return v(ne(e),"mcp_config.json")}function K(e={}){return v(ne(e),"hooks.json")}function Je(e={}){return v(_e(e),"antigravity-cli")}function De(e="toolnet-memory",t={}){return v(Je(t),"plugins",e)}function $e(e={}){return[Je(e),ne(e)]}import{homedir as Ho}from"node:os";import{join as N}from"node:path";function S(e={}){let t=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return t?N(t,"opencode"):N(e.home??Ho(),".config","opencode")}function Ge(e={}){return N(S(e),"opencode.json")}function Le(e={}){return N(S(e),"plugins")}function Ke(e={}){return N(S(e),"AGENTS.md")}import{homedir as Ue}from"node:os";import{join as re}from"node:path";function ie(e={}){return re(e.home??Ue(),".claude")}function Be(e={}){return re(ie(e),"settings.json")}function qe(e={}){return re(e.home??Ue(),".claude.json")}import{homedir as _o}from"node:os";import{join as T}from"node:path";function se(e={}){return e.kiroHome??process.env.KIRO_HOME??T(e.home??_o(),".kiro")}function Jo(e={}){return T(se(e),"settings")}function We(e={}){return T(Jo(e),"mcp.json")}function Do(e={}){return T(se(e),"hooks")}function Ye(e={}){return T(Do(e),"toolnet-memory.json")}function Ve(e={}){return[se(e)]}import{homedir as $o}from"node:os";import{join as ce}from"node:path";function Xe(e={}){let t=e.home??$o(),o=e.xdgConfigHome??process.env.XDG_CONFIG_HOME;return o?ce(o,"toolnet-memory"):ce(t,".config","toolnet-memory")}function le(e={}){return ce(Xe(e),"mcp.json")}function ze(e={}){return[Xe(e),le(e)]}import{homedir as Go}from"node:os";import{join as ae}from"node:path";function ue(e={}){return e.kiloHome??process.env.KILO_HOME??ae(e.home??Go(),".kilo")}function Lo(e={}){return ae(ue(e),"kilo.jsonc")}function pe(e={}){return ae(ue(e),"mcp.json")}function Qe(e={}){return[ue(e),pe(e),Lo(e)]}import{homedir as Ko}from"node:os";import{join as h,resolve as Uo}from"node:path";function U(e={}){return e.cursorHome??h(e.home??Ko(),".cursor")}function Bo(e={}){return e.cursorConfigDir??process.env.CURSOR_CONFIG_DIR??(e.xdgConfigHome??process.env.XDG_CONFIG_HOME?h(e.xdgConfigHome??process.env.XDG_CONFIG_HOME,"cursor"):void 0)??U(e)}function B(e={}){return h(U(e),"mcp.json")}function q(e={}){return h(U(e),"hooks.json")}function ge(e){return h(Uo(e),".cursor")}function Ze(e){return h(ge(e),"mcp.json")}function et(e){return h(ge(e),"hooks.json")}function qo(e){return h(ge(e),"rules")}function tt(e){return h(qo(e),"toolnet-memory.mdc")}function ot(e={}){return Array.from(new Set([U(e),Bo(e)]))}import{homedir as Wo}from"node:os";import{join as y,resolve as Yo}from"node:path";function fe(e={}){return e.copilotHome??process.env.COPILOT_HOME??y(e.home??Wo(),".copilot")}function W(e={}){return y(fe(e),"mcp-config.json")}function Vo(e={}){return y(fe(e),"hooks")}function Y(e={}){return y(Vo(e),"toolnet-memory.json")}function me(e){return y(Yo(e),".github")}function nt(e){return y(me(e),"mcp.json")}function Xo(e){return y(me(e),"hooks")}function rt(e){return y(Xo(e),"toolnet-memory.json")}function zo(e){return y(me(e),"instructions")}function it(e){return y(zo(e),"toolnet-memory.instructions.md")}function st(e={}){return[fe(e)]}import{homedir as Qo}from"node:os";import{join as d,resolve as Zo}from"node:path";function V(e={}){return e.grokHome??process.env.GROK_HOME??d(e.home??Qo(),".grok")}function X(e={}){return d(V(e),"config.toml")}function en(e={}){return d(V(e),"hooks")}function z(e={}){return d(en(e),"toolnet-memory.json")}function tn(e={}){return d(V(e),"skills")}function on(e={}){return d(tn(e),"toolnet-continuity")}function Q(e={}){return d(on(e),"SKILL.md")}function de(e){return d(Zo(e),".grok")}function ct(e){return d(de(e),"config.toml")}function nn(e){return d(de(e),"hooks")}function lt(e){return d(nn(e),"toolnet-memory.json")}function rn(e){return d(de(e),"skills")}function sn(e){return d(rn(e),"toolnet-continuity")}function at(e){return d(sn(e),"SKILL.md")}function ut(e={}){return[V(e)]}function un(e){return an("sh",["-lc",`command -v ${JSON.stringify(e)} >/dev/null 2>&1`],{stdio:"ignore"}).status===0}function j(e){let t=e.commandExists(e.command),o=e.configPaths.filter(c=>gt(c)),n=o.length>0,r=[];t&&r.push(`command:${e.command}`);for(let c of o)r.push(`config:${c}`);return{agent:e.agent,detected:t||n,commandDetected:t,configDetected:n,evidence:r}}function pt(e){let t=e.commands.filter(i=>e.commandExists(i)),o=e.configPaths.filter(i=>gt(i)),n=t.length>0,r=o.length>0,c=[...t.map(i=>`command:${i}`),...o.map(i=>`config:${i}`)];return{agent:e.agent,detected:n||r,commandDetected:n,configDetected:r,evidence:c}}function ft(e={}){let t=e.home??cn(),o=e.commandExists??un,n=e.codexHome??process.env.CODEX_HOME??ln(t,".codex");return[j({agent:"agy",command:"agy",commandExists:o,configPaths:$e({home:t})}),j({agent:"opencode",command:"opencode",commandExists:o,configPaths:[S({home:t,xdgConfigHome:e.xdgConfigHome})]}),j({agent:"claude",command:"claude",commandExists:o,configPaths:[ie({home:t})]}),j({agent:"kiro",command:"kiro-cli",commandExists:o,configPaths:Ve({home:t,kiroHome:e.kiroHome})}),pt({agent:"cursor",commands:["agent","cursor-agent"],commandExists:o,configPaths:ot({home:t,cursorHome:e.cursorHome,cursorConfigDir:e.cursorConfigDir,xdgConfigHome:e.xdgConfigHome})}),j({agent:"copilot",command:"copilot",commandExists:o,configPaths:st({home:t,copilotHome:e.copilotHome})}),j({agent:"grok",command:"grok",commandExists:o,configPaths:ut({home:t,grokHome:e.grokHome})}),j({agent:"toolnet-cli",command:"toolnet-memory",commandExists:o,configPaths:ze({home:t,xdgConfigHome:e.xdgConfigHome})}),pt({agent:"kilo",commands:["kilo","kilo-code"],commandExists:o,configPaths:Qe({home:t,kiloHome:e.kiloHome})}),j({agent:"codex",command:"codex",commandExists:o,configPaths:[n]})]}import{existsSync as ee,mkdirSync as bt,readFileSync as Ct,renameSync as xn,writeFileSync as wn}from"node:fs";import{dirname as Fn,join as Z}from"node:path";import{existsSync as pn,mkdirSync as gn,readFileSync as fn,renameSync as mn,rmSync as dn,writeFileSync as yn}from"node:fs";import{dirname as hn}from"node:path";function kn(e){return`'${e.replace(/'/g,"'\\''")}'`}function mt(e={}){let t=e.hooksFile??K();gn(hn(t),{recursive:!0,mode:448});let o={};if(pn(t)){let i;try{i=JSON.parse(fn(t,"utf8"))}catch(s){throw new Error(`Invalid existing Agy hooks.json: ${s instanceof Error?s.message:String(s)}`)}if(typeof i!="object"||i===null||Array.isArray(i))throw new Error("Invalid existing Agy hooks.json: root must be a JSON object.");o=i}let n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=`${kn(n)} session:agy-hook`;o["toolnet-memory"]={enabled:!0,PreToolUse:[{matcher:"view_file|list_dir|find_by_name|grep_search|run_command",hooks:[{type:"command",command:`${r} pre-tool`,timeout:5}]}],PreInvocation:[{type:"command",command:`${r} pre`,timeout:15}],PostInvocation:[{type:"command",command:`${r} post`,timeout:15}],Stop:[{type:"command",command:`${r} stop`,timeout:30}]};let c=`${t}.tmp-${process.pid}-${Date.now()}`;try{yn(c,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),mn(c,t)}finally{dn(c,{force:!0})}return t}import{existsSync as bn,mkdirSync as Cn,readFileSync as On,renameSync as jn,writeFileSync as In}from"node:fs";import{dirname as Sn}from"node:path";function M(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function vn(e,t){Cn(Sn(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;In(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),jn(o,e)}function dt(e){if(!bn(e))return{};let t=On(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch(n){throw new Error(`Invalid existing Agy MCP config: ${n instanceof Error?n.message:String(n)}`)}if(!M(o))throw new Error("Invalid existing Agy MCP config: root must be a JSON object.");return o}function yt(e,t){return M(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function ht(e={}){let t=e.configFile??L(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=dt(t),c=r.mcpServers;if(c!==void 0&&!M(c))throw new Error("Invalid existing Agy MCP config: mcpServers must be an object.");let i=M(c)?{...c}:{},s=i[n];if(yt(s,o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};i[n]={command:o,args:["mcp"]};let l={...r,mcpServers:i};vn(t,l);let a=dt(t).mcpServers;if(!M(a)||!yt(a[n],o))throw new Error("Agy MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}var Rn=`# ToolNet Memory Continuity

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
`;function Ot(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function ye(e,t){bt(Fn(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;wn(o,t,{encoding:"utf8",mode:384}),xn(o,e)}function kt(e,t){ee(e)&&Ct(e,"utf8")===t||ye(e,t)}function jt(e){if(!ee(e))return{};let t=Ct(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch(n){throw new Error(`Invalid legacy Antigravity config ${e}: ${n instanceof Error?n.message:String(n)}`)}if(!Ot(o))throw new Error(`Invalid legacy Antigravity config ${e}: root must be object`);return o}function En(e,t){if(!ee(e))return!1;let o=jt(e);if(!Ot(o.mcpServers)||!Object.prototype.hasOwnProperty.call(o.mcpServers,t))return!1;let n={...o.mcpServers};return delete n[t],ye(e,`${JSON.stringify({...o,mcpServers:n},null,2)}
`),!0}function Pn(e){if(!ee(e))return!1;let t=jt(e);if(!Object.prototype.hasOwnProperty.call(t,"toolnet-memory"))return!1;let o={...t};return delete o["toolnet-memory"],ye(e,`${JSON.stringify(o,null,2)}
`),!0}function It(e={}){let t=e.pluginName??"toolnet-memory",o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.pluginRoot??De(t),r=Z(n,"plugin.json"),c=Z(n,"mcp_config.json"),i=Z(n,"hooks.json"),s=Z(n,"rules","toolnet-memory-continuity.md");bt(n,{recursive:!0,mode:448}),kt(r,`${JSON.stringify({$schema:"https://antigravity.google/schemas/v1/plugin.json",name:t,description:"Persistent project continuity and memory for Antigravity coding sessions."},null,2)}
`),ht({configFile:c,binary:o,serverName:"toolnet-memory"}),mt({hooksFile:i,binary:o}),kt(s,`${Rn.trim()}
`);let l=e.legacyMcpFile??L(),u=e.legacyHooksFile??K(),a=[];return l!==c&&En(l,"toolnet-memory")&&a.push(l),u!==i&&Pn(u)&&a.push(u),{installed:!0,pluginRoot:n,files:[r,c,i,s],migratedLegacy:a}}import{existsSync as Tn,mkdirSync as xt,readFileSync as Mn,writeFileSync as wt}from"node:fs";import{join as An}from"node:path";var Nn="memory_agent_ask";function St(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${Nn}

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
`.trim()}var vt="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",he="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function Hn(){let e=Ke();xt(S(),{recursive:!0});let t=`${vt}
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


${St()}

${he}`,o=Tn(e)?Mn(e,"utf8"):"",n=o.indexOf(vt),r=o.indexOf(he);return n>=0&&r>=n?o=o.slice(0,n)+t+o.slice(r+he.length):(o=o.trimEnd(),o&&(o+=`

`),o+=t),wt(e,o.trimEnd()+`
`,{encoding:"utf8",mode:384}),e}function Ft(e={}){let t=e.directory??Le();xt(t,{recursive:!0}),Hn();let o=An(t,"toolnet-memory.js"),n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=`
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
`;return wt(o,r.trimStart(),{encoding:"utf8",mode:384}),o}import{existsSync as Pt,mkdirSync as _n,readFileSync as Jn,renameSync as Dn,writeFileSync as $n}from"node:fs";import{dirname as Nt,join as Gn}from"node:path";function x(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Ln(e,t){_n(Nt(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;$n(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Dn(o,e)}function Rt(e){if(!Pt(e))return{};let t=Jn(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch(n){throw new Error(`Invalid existing OpenCode opencode.json: ${n instanceof Error?n.message:String(n)}`)}if(!x(o))throw new Error("Invalid existing OpenCode opencode.json: root must be a JSON object.");return o}function Et(e,t){if(!x(e))return!1;let o=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(o)&&o.length===2&&o[0]===t&&o[1]==="mcp"}function Kn(e,t){let o=e.mcpServers;if(!x(o)||!Object.prototype.hasOwnProperty.call(o,t))return{root:e,changed:!1};let n={...o};return delete n[t],{root:{...e,mcpServers:n},changed:!0}}function Tt(e={}){let t=e.configFile??Ge(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=Gn(Nt(t),"opencode.jsonc"),c=Pt(r)?r:void 0,i=Rt(t),s=Kn(i,n),l=s.root,u=l.mcp;if(u!==void 0&&!x(u))throw new Error("Invalid existing OpenCode config: mcp must be an object.");let a=x(u)?{...u}:{},p=a[n];if(Et(p,o)&&!s.changed)return{installed:!0,changed:!1,configFile:t,serverName:n,command:[o,"mcp"],preservedJsonc:c};a[n]={type:"local",command:[o,"mcp"],enabled:!0};let g={...l,mcp:a};Ln(t,g);let O=Rt(t);if(!x(O.mcp)||!Et(O.mcp[n],o))throw new Error("OpenCode MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:[o,"mcp"],preservedJsonc:c}}import{existsSync as Un,mkdirSync as Mt,readFileSync as Bn,writeFileSync as At}from"node:fs";import{homedir as Ht}from"node:os";import{dirname as _t,join as ke}from"node:path";function qn(e){let t=[],o=/"((?:\\.|[^"\\])*)"|'([^']*)'/g,n;for(;n=o.exec(e);){let r=n[1]??n[2]??"";try{t.push(n[1]!==void 0?JSON.parse(`"${r}"`):r)}catch{t.push(r)}}return t}function Jt(e={}){let t=e.configFile??ke(process.env.CODEX_HOME??ke(Ht(),".codex"),"config.toml"),o=e.previousFile??ke(Ht(),".config","toolnet-memory","codex-notify-previous.json");Mt(_t(t),{recursive:!0}),Mt(_t(o),{recursive:!0});let n=Un(t)?Bn(t,"utf8"):"",r=e.binary??"toolnet-memory",c=`notify = [${JSON.stringify(r)}, "session:codex-notify"]`,i=n.split(`
`),s=i.findIndex(g=>/^\s*\[/.test(g));s<0&&(s=i.length);let l=-1,u=-1;for(let g=0;g<s;g+=1)if(/^\s*notify\s*=/.test(i[g])){if(l=g,u=g,i[g].includes("[")&&!i[g].includes("]"))for(;u+1<s&&(u+=1,!i[u].includes("]")););break}let a=[];if(l>=0){let g=i.slice(l,u+1).join(`
`);a=qn(g),i.splice(l,u-l+1,c)}else s=i.findIndex(g=>/^\s*\[/.test(g)),s<0&&(s=i.length),i.splice(s,0,c);let p=a.length>=2&&a[a.length-1]==="session:codex-notify";return a.length>0&&!p&&At(o,JSON.stringify(a,null,2)+`
`,{encoding:"utf8",mode:384}),n=i.join(`
`),n.endsWith(`
`)||(n+=`
`),At(t,n,{encoding:"utf8",mode:384}),{configFile:t,previousFile:o,preservedPrevious:a.length>0&&!p}}import{existsSync as Wn,mkdirSync as Yn,readFileSync as Vn,writeFileSync as Xn}from"node:fs";import{homedir as zn}from"node:os";import{dirname as Qn,join as Dt}from"node:path";function Zn(e){return`'${e.replace(/'/g,"'\\''")}'`}function $t(e={}){let t=e.hooksFile??Dt(process.env.CODEX_HOME??Dt(zn(),".codex"),"hooks.json");Yn(Qn(t),{recursive:!0});let o={};if(Wn(t))try{o=JSON.parse(Vn(t,"utf8"))}catch(s){throw new Error(`Invalid existing Codex hooks.json: ${s instanceof Error?s.message:String(s)}`)}let n=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=n;let c=(Array.isArray(n.SessionStart)?n.SessionStart:[]).filter(s=>{try{return!JSON.stringify(s).includes("session:codex-context")}catch{return!0}}),i=e.binary??"toolnet-memory";return c.push({matcher:"startup|resume|clear|compact",hooks:[{type:"command",command:`${Zn(i)} session:codex-context`,timeout:15,additionalContextLimit:1e3,statusMessage:"Loading ToolNet project continuity"}]}),n.SessionStart=c,Xn(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),t}import{spawnSync as er}from"node:child_process";function be(e,t){return er(e,t,{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}function Gt(e,t){let o=be(e,["mcp","get",t,"--json"]);if(o.status!==0||!o.stdout)return null;try{return JSON.parse(o.stdout)}catch{return null}}function Lt(e,t){return e.enabled!==!1&&e.transport?.type==="stdio"&&e.transport?.command===t&&Array.isArray(e.transport?.args)&&e.transport?.args.length===1&&e.transport.args[0]==="mcp"}function Kt(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.codexBinary??"codex",n=e.serverName??"toolnet-memory",r=Gt(o,n);if(r&&Lt(r,t))return{installed:!0,changed:!1,serverName:n,command:t,args:["mcp"]};if(r){let s=be(o,["mcp","remove",n]);if(s.status!==0)return{installed:!1,changed:!1,serverName:n,command:t,args:["mcp"],error:(s.stderr||s.stdout||"Unable to remove old ToolNet MCP configuration.").trim()}}let c=be(o,["mcp","add",n,"--",t,"mcp"]);if(c.status!==0)return{installed:!1,changed:!1,serverName:n,command:t,args:["mcp"],error:(c.stderr||c.stdout||"Unable to register ToolNet MCP.").trim()};let i=Gt(o,n);return!i||!Lt(i,t)?{installed:!1,changed:!0,serverName:n,command:t,args:["mcp"],error:"Codex accepted MCP registration but verification did not match expected ToolNet command."}:{installed:!0,changed:!0,serverName:n,command:t,args:["mcp"]}}import{existsSync as tr,mkdirSync as or,readFileSync as nr,renameSync as rr,rmSync as ir,writeFileSync as sr}from"node:fs";import{dirname as cr}from"node:path";function A(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function lr(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function ar(e){if(!tr(e))return{};let t;try{t=JSON.parse(nr(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude settings.json: ${o instanceof Error?o.message:String(o)}`)}if(!A(t))throw new Error("Invalid existing Claude settings.json: root must be a JSON object.");return t}function Ce(e){if(e===void 0)return[];if(!Array.isArray(e))throw new Error("Invalid existing Claude settings.json: hook event must be an array.");let t=[];for(let o of e){if(!A(o)){t.push(o);continue}let n=o.hooks;if(!Array.isArray(n)){t.push(o);continue}let r=n.filter(c=>{if(!A(c))return!0;let i=c.command;return!(typeof i=="string"&&i.includes("session:claude-hook"))});r.length!==0&&t.push({...o,hooks:r})}return t}function Oe(e){return{type:"command",command:e,timeout:10}}function ur(e,t){or(cr(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{sr(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),rr(o,e)}finally{ir(o,{force:!0})}}function Ut(e={}){let t=e.settingsFile??Be(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=ar(t),r=n.hooks;if(r!==void 0&&!A(r))throw new Error("Invalid existing Claude settings.json: hooks must be an object.");let c=A(r)?{...r}:{},i=`${lr(o)} session:claude-hook`,s=Ce(c.SessionStart);s.push({matcher:"startup|resume|clear|compact",hooks:[Oe(i)]}),c.SessionStart=s;let l=Ce(c.PostToolUse);l.push({matcher:"Edit|Write",hooks:[Oe(i)]}),c.PostToolUse=l;let u=Ce(c.Stop);u.push({hooks:[Oe(i)]}),c.Stop=u;let a={...n,hooks:c},p=JSON.stringify(n),g=JSON.stringify(a);return p===g?{settingsFile:t,changed:!1}:(ur(t,a),{settingsFile:t,changed:!0})}import{existsSync as pr,mkdirSync as gr,readFileSync as fr,renameSync as mr,rmSync as dr,writeFileSync as yr}from"node:fs";import{dirname as hr}from"node:path";function H(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Bt(e){if(!pr(e))return{};let t;try{t=JSON.parse(fr(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude Code config: ${o instanceof Error?o.message:String(o)}`)}if(!H(t))throw new Error("Invalid existing Claude Code config: root must be a JSON object.");return t}function qt(e,t){if(!H(e))return!1;let o=e.args;return e.type==="stdio"&&e.command===t&&Array.isArray(o)&&o.length===1&&o[0]==="mcp"}function kr(e,t){gr(hr(e),{recursive:!0});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{yr(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),mr(o,e)}finally{dr(o,{force:!0})}}function Wt(e={}){let t=e.stateFile??qe(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=Bt(t),c=r.mcpServers;if(c!==void 0&&!H(c))throw new Error("Invalid existing Claude Code config: mcpServers must be an object.");let i=H(c)?{...c}:{},s=i[n];if(qt(s,o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:[o,"mcp"],repaired:!1};let l=s!==void 0;i[n]={type:"stdio",command:o,args:["mcp"]},kr(t,{...r,mcpServers:i});let a=Bt(t).mcpServers;if(!H(a)||!qt(a[n],o))throw new Error("Claude Code MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:[o,"mcp"],repaired:l}}function Yt(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=Ut({binary:t,settingsFile:e.settingsFile}),n=Wt({binary:t,stateFile:e.stateFile});return{hooks:o,mcp:n,files:[o.settingsFile,n.configFile]}}import{existsSync as br,mkdirSync as Cr,readFileSync as Or,renameSync as jr,rmSync as Ir,writeFileSync as Sr}from"node:fs";import{dirname as vr}from"node:path";var w="ToolNet Memory - ";function zt(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function xr(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function Vt(e){if(!br(e))return{};let t=Or(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch(n){throw new Error(`Invalid existing Kiro hooks file: ${n instanceof Error?n.message:String(n)}`)}if(!zt(o))throw new Error("Invalid existing Kiro hooks file: root must be a JSON object.");return o}function Xt(e){return zt(e)?typeof e.name=="string"&&e.name.startsWith(w):!1}function _(e){return{type:"command",command:e}}function wr(e){return[{name:`${w}Session Start`,description:"Inject compact local ToolNet continuity and capture Kiro session activation.",trigger:"SessionStart",action:_(e),timeout:10,enabled:!0},{name:`${w}Prompt Continuity`,description:"Capture prompts and refresh ToolNet guidance only for resume/continue requests.",trigger:"UserPromptSubmit",action:_(e),timeout:10,enabled:!0},{name:`${w}Raw History Guard`,description:"Prevent Kiro from reconstructing continuity from raw ToolNet/agent session history.",trigger:"PreToolUse",matcher:"*",action:_(e),timeout:10,enabled:!0},{name:`${w}Tool Capture`,description:"Capture durable tool activity while filtering noisy read-only events.",trigger:"PostToolUse",matcher:"*",action:_(e),timeout:15,enabled:!0},{name:`${w}Final Flush`,description:"Flush pending Kiro WAL events when the assistant finishes a turn.",trigger:"Stop",action:_(e),timeout:30,enabled:!0}]}function Fr(e,t){Cr(vr(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Sr(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),jr(o,e)}finally{Ir(o,{force:!0})}}function Qt(e={}){let t=e.hooksFile??Ye(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=Vt(t);if(n.version!==void 0&&n.version!=="v1")throw new Error(`Unsupported existing Kiro hooks version: ${String(n.version)}`);let r=n.hooks;if(r!==void 0&&!Array.isArray(r))throw new Error("Invalid existing Kiro hooks file: hooks must be an array.");let c=Array.isArray(r)?r.filter(a=>!Xt(a)):[],i=`${xr(o)} session:kiro-hook`,s=wr(i),l={...n,version:"v1",hooks:[...c,...s]};if(JSON.stringify(n)===JSON.stringify(l))return{hooksFile:t,changed:!1,hookCount:s.length};Fr(t,l);let u=Vt(t);if(u.version!=="v1"||!Array.isArray(u.hooks)||u.hooks.filter(Xt).length!==s.length)throw new Error("Kiro hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:s.length}}import{existsSync as Rr,mkdirSync as Er,readFileSync as Pr,renameSync as Nr,rmSync as Tr,writeFileSync as Mr}from"node:fs";import{dirname as Ar}from"node:path";function J(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Zt(e){if(!Rr(e))return{};let t=Pr(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch(n){throw new Error(`Invalid existing Kiro MCP config: ${n instanceof Error?n.message:String(n)}`)}if(!J(o))throw new Error("Invalid existing Kiro MCP config: root must be a JSON object.");return o}function eo(e,t){return J(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&e.disabled===!1:!1}function Hr(e,t){Er(Ar(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Mr(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Nr(o,e)}finally{Tr(o,{force:!0})}}function to(e={}){let t=e.configFile??We(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=Zt(t),c=r.mcpServers;if(c!==void 0&&!J(c))throw new Error("Invalid existing Kiro MCP config: mcpServers must be an object.");let i=J(c)?{...c}:{},s=i[n];if(eo(s,o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};i[n]={command:o,args:["mcp"],disabled:!1};let l={...r,mcpServers:i};Hr(t,l);let a=Zt(t).mcpServers;if(!J(a)||!eo(a[n],o))throw new Error("Kiro MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}function oo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=to({binary:t,configFile:e.configFile}),n=Qt({binary:t,hooksFile:e.hooksFile});return{installed:o.installed,changed:o.changed||n.changed,mcp:o,hooks:n,files:[o.configFile,n.hooksFile]}}import{existsSync as _r,mkdirSync as Jr,readFileSync as Dr,renameSync as $r,rmSync as Gr,writeFileSync as Lr}from"node:fs";import{dirname as Kr}from"node:path";function je(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Ur(e){if(!_r(e))return{};let t=Dr(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch(n){throw new Error(`Invalid existing ToolNet CLI MCP config: ${n instanceof Error?n.message:String(n)}`)}if(!je(o))throw new Error("Invalid existing ToolNet CLI MCP config: root must be a JSON object.");return o}function Br(e,t){Jr(Kr(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Lr(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),$r(o,e)}finally{Gr(o,{force:!0})}}function no(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??le(),n=Ur(o),r="toolnet-memory";if(je(n.mcpServers)&&n.mcpServers[r]!=null&&!e.force)return{installed:!0,changed:!1,configFile:o};let i=je(n.mcpServers)?n.mcpServers:{};return i[r]={command:t,args:["mcp"]},n.mcpServers=i,Br(o,n),{installed:!0,changed:!0,configFile:o}}function ro(e={}){let t=e.binary??"toolnet-memory",o=no({binary:t,configFile:e.configFile,force:e.force});return{installed:o.installed,changed:o.changed,mcp:{...o,configured:o.installed},files:[o.configFile]}}import{mkdirSync as Zr,existsSync as ei}from"node:fs";import{dirname as ti}from"node:path";import{existsSync as qr,mkdirSync as Wr,readFileSync as Yr,renameSync as Vr,rmSync as Xr,writeFileSync as zr}from"node:fs";import{dirname as Qr}from"node:path";function m(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function I(e,t){if(!qr(e))return{};let o=Yr(e,"utf8").trim();if(!o)return{};let n;try{n=JSON.parse(o)}catch(r){throw new Error(`Invalid existing ${t} MCP config: ${r instanceof Error?r.message:String(r)}`)}if(!m(n))throw new Error(`Invalid existing ${t} MCP config: root must be a JSON object.`);return n}function F(e,t){Wr(Qr(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{zr(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Vr(o,e)}finally{Xr(o,{force:!0})}}function io(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??pe(),n=ti(o);ei(n)||Zr(n,{recursive:!0});let r=I(o,"Kilo"),c=r.mcpServers;if(c!==void 0&&!m(c))throw new Error("Invalid existing Kilo MCP config: mcpServers must be an object.");let i=m(c)?{...c}:{},s="toolnet-memory";return m(i[s])&&i[s].command===t&&!e.force?{installed:!0,changed:!1,configFile:o,configured:!0}:(i[s]={command:t,args:["mcp"]},F(o,{...r,mcpServers:i}),{installed:!0,changed:!0,configFile:o,configured:!0})}function so(e={}){let t=e.binary??"toolnet-memory",o=io({binary:t,configFile:e.configFile,force:e.force});return{installed:o.installed,changed:o.changed,mcp:o,files:[o.configFile]}}import{existsSync as oi,mkdirSync as ni,readFileSync as ri,renameSync as ii,rmSync as si,writeFileSync as ci}from"node:fs";import{dirname as li}from"node:path";function f(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function k(e,t){if(!oi(e))return{};let o=ri(e,"utf8").trim();if(!o)return{};let n;try{n=JSON.parse(o)}catch(r){throw new Error(`Invalid existing ${t} hooks file: ${r instanceof Error?r.message:String(r)}`)}if(!f(n))throw new Error(`Invalid existing ${t} hooks file: root must be a JSON object.`);return n}function R(e,t){ni(li(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{ci(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),ii(o,e)}finally{si(o,{force:!0})}}function Ie(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}var D=[["sessionStart",10],["beforeSubmitPrompt",10],["preToolUse",10],["postToolUse",15],["afterAgentResponse",15],["stop",30]];function co(e){return f(e)&&typeof e.command=="string"&&e.command.includes("session:cursor-hook")}function ai(e,t,o){let r={type:"command",command:`TOOLNET_HOOK_EVENT=${Ie(e)} ${Ie(t)} session:cursor-hook`,timeout:o};return e==="preToolUse"&&(r.matcher=".*"),r}function Se(e={}){let t=e.hooksFile??q(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=k(t,"Cursor");if(n.version!==void 0&&n.version!==1)throw new Error(`Unsupported existing Cursor hooks version: ${String(n.version)}`);let r=n.hooks;if(r!==void 0&&!f(r))throw new Error("Invalid existing Cursor hooks file: hooks must be an object.");let c=f(r)?{...r}:{};for(let[u,a]of D){let p=c[u];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing Cursor hooks file: hooks.${u} must be an array.`);let g=Array.isArray(p)?p.filter(O=>!co(O)):[];c[u]=[...g,ai(u,o,a)]}let i={...n,version:1,hooks:c};if(JSON.stringify(n)===JSON.stringify(i))return{hooksFile:t,changed:!1,hookCount:D.length};R(t,i);let s=k(t,"Cursor");if(s.version!==1||!f(s.hooks))throw new Error("Cursor hooks were written but verification failed.");let l=0;for(let[u]of D){let a=s.hooks[u];if(!Array.isArray(a))throw new Error("Cursor hooks were written but verification failed.");l+=a.filter(co).length}if(l!==D.length)throw new Error("Cursor hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:D.length}}function lo(e,t){return m(e)?(e.type===void 0||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function ve(e={}){let t=e.configFile??B(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=I(t,"Cursor"),c=r.mcpServers;if(c!==void 0&&!m(c))throw new Error("Invalid existing Cursor MCP config: mcpServers must be an object.");let i=m(c)?{...c}:{};if(lo(i[n],o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};i[n]={type:"stdio",command:o,args:["mcp"]},F(t,{...r,mcpServers:i});let l=I(t,"Cursor").mcpServers;if(!m(l)||!lo(l[n],o))throw new Error("Cursor MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}import{mkdirSync as ui,readFileSync as ao,renameSync as pi,rmSync as gi,writeFileSync as fi}from"node:fs";import{dirname as mi}from"node:path";var xe=`---
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
`;function di(e,t){ui(mi(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{fi(o,t,{encoding:"utf8",mode:384}),pi(o,e)}finally{gi(o,{force:!0})}}function uo(e){let t=e.ruleFile??tt(e.projectRoot);try{if(ao(t,"utf8")===xe)return{ruleFile:t,changed:!1}}catch{}if(di(t,xe),ao(t,"utf8")!==xe)throw new Error("Cursor ToolNet project rule was written but verification failed.");return{ruleFile:t,changed:!0}}import{spawnSync as yi}from"node:child_process";import{existsSync as E,statSync as hi}from"node:fs";import{dirname as ki,join as bi,parse as Ci,resolve as Fe}from"node:path";function po(e){let t=Fe(e);if(!E(t))throw new Error(`Project path does not exist: ${t}`);if(!hi(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);return t}function te(e){return bi(e,".toolnet","project.json")}function Oi(e){let t=Fe(e),o=Ci(t).root;for(;;){if(E(te(t)))return t;if(t===o)return;let n=ki(t);if(n===t)return;t=n}}function we(e){let t=yi("git",["rev-parse","--show-toplevel"],{cwd:e,encoding:"utf8",timeout:5e3});if(t.status!==0)return;let o=t.stdout.trim();return o?Fe(o):void 0}function b(e={}){let t=po(e.cwd??process.cwd());if(e.project){let r=po(e.project),c=te(r),i=we(r);return{root:r,source:"explicit",eligible:!0,toolnetProject:E(c),manifestFile:E(c)?c:void 0,gitRoot:i}}let o=Oi(t);if(o){let r=te(o);return{root:o,source:"toolnet",eligible:!0,toolnetProject:!0,manifestFile:r,gitRoot:we(o)}}let n=we(t);if(n){let r=te(n);return{root:n,source:"git",eligible:!0,toolnetProject:E(r),manifestFile:E(r)?r:void 0,gitRoot:n}}return{root:t,source:"cwd",eligible:!1,toolnetProject:!1}}function yo(e,t={}){let o=[],n=e.indexOf("--scope");if(n>=0){let c=e[n+1];if(c!=="global"&&c!=="project"&&c!=="both")throw new Error(`Invalid --scope value: ${String(c)}`);o.push(c)}e.includes("--global")&&o.push("global"),e.includes("--both")&&o.push("both");let r=Array.from(new Set(o));if(r.length>1)throw new Error(`Conflicting integration scopes: ${r.join(", ")}`);return r[0]??t.defaultScope??"global"}function go(e,t){return{install:e,effective:t}}function C(e,t){return{surface:e,global:go(t.globalInstall,t.effective==="global"||t.effective==="both"),project:go(t.projectInstall,t.effective==="project"||t.effective==="both"),effective:t.effective,risk:t.risk??"none",dedupeRequired:t.dedupeRequired??!1,trustRequired:t.trustRequired??t.projectInstall,note:t.note}}function ji(e){return{mcp:C("mcp",{globalInstall:!0,projectInstall:!1,effective:"global"}),hooks:C("hooks",{globalInstall:!0,projectInstall:!1,effective:"global"}),work:C("work",{globalInstall:e==="grok",projectInstall:!1,effective:e==="grok"?"global":"none",note:e==="grok"?"Grok supports a global ToolNet continuity skill.":"Cursor/Copilot work instructions remain project-scoped."})}}function fo(e){return{mcp:C("mcp",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),hooks:C("hooks",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),work:C("work",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!1,note:e==="cursor"?"Use .cursor/rules/toolnet-memory.mdc.":e==="copilot"?"Use .github/instructions/toolnet-memory.instructions.md.":"Use .grok/skills/toolnet-continuity/SKILL.md."})}}function mo(e){return{mcp:C("mcp",{globalInstall:!0,projectInstall:!0,effective:"project",risk:e==="cursor"?"precedence-unverified":"shadowed-global",trustRequired:!0,note:e==="cursor"?"Project ToolNet MCP is the intended effective definition; native same-name precedence must be E2E certified before release.":"Global remains useful outside the project; same-name project definition wins inside the project."}),hooks:C("hooks",{globalInstall:!0,projectInstall:!0,effective:"both",risk:"additive-duplicate",dedupeRequired:!0,trustRequired:!0,note:"Global and project hook sources can both execute for the same native event."}),work:C("work",{globalInstall:e==="grok",projectInstall:!0,effective:"project",risk:e==="grok"?"shadowed-global":"none",trustRequired:!1,note:e==="cursor"?"Project rule is authoritative.":e==="copilot"?"Project instruction is authoritative.":"Project skill shadows the same-name global skill inside the project."})}}function P(e){let{agent:t,scope:o,project:n}=e;return(o==="project"||o==="both")&&(!n||!n.eligible)?{agent:t,requestedScope:o,project:n,surfaces:o==="both"?mo(t):fo(t),canInstall:!1,reason:"Project scope requires an explicit project, existing ToolNet project, or Git repository root."}:{agent:t,requestedScope:o,project:n,surfaces:o==="global"?ji(t):o==="project"?fo(t):mo(t),canInstall:!0}}function ho(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.rule?.changed)}function ko(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=o==="global"?void 0:b({project:e.projectRoot}),r=P({agent:"cursor",scope:o,project:n});if(!r.canInstall)throw new Error(r.reason??"Cursor project integration scope cannot be resolved.");let c,i;if((r.surfaces.mcp.global.install||r.surfaces.hooks.global.install||r.surfaces.work.global.install)&&(c={},r.surfaces.mcp.global.install&&(c.mcp=ve({binary:t,configFile:e.configFile??B()})),r.surfaces.hooks.global.install&&(c.hooks=Se({binary:t,hooksFile:e.hooksFile??q()}))),r.surfaces.mcp.project.install||r.surfaces.hooks.project.install||r.surfaces.work.project.install){if(!n?.eligible)throw new Error("Cursor project integration requires an eligible project root.");i={},r.surfaces.mcp.project.install&&(i.mcp=ve({binary:t,configFile:e.projectConfigFile??Ze(n.root)})),r.surfaces.hooks.project.install&&(i.hooks=Se({binary:t,hooksFile:e.projectHooksFile??et(n.root)})),r.surfaces.work.project.install&&(i.rule=uo({projectRoot:n.root,ruleFile:e.projectRuleFile}))}let s=i?.mcp??c?.mcp,l=i?.hooks??c?.hooks;if(!s||!l)throw new Error("Cursor integration did not produce an effective MCP/hooks installation.");let u=Array.from(new Set([c?.mcp?.configFile,c?.hooks?.hooksFile,c?.rule?.ruleFile,i?.mcp?.configFile,i?.hooks?.hooksFile,i?.rule?.ruleFile].filter(a=>typeof a=="string")));return{installed:!0,changed:ho(c)||ho(i),scope:o,plan:r,project:n,global:c,projectScope:i,mcp:s,hooks:l,rule:i?.rule,files:u}}var $=[["sessionStart",10],["userPromptSubmitted",10],["userPromptTransformed",10],["preToolUse",10],["postToolUse",15],["agentStop",30]];function Ii(e){if(typeof e.command=="string")return e.command;if(typeof e.bash=="string")return e.bash}function bo(e){return f(e)&&Ii(e)?.includes("session:copilot-hook")===!0}function Si(e,t,o){let n={type:"command",command:`${t} session:copilot-hook`,env:{TOOLNET_HOOK_EVENT:e},timeoutSec:o};return e==="preToolUse"&&(n.matcher=".*"),n}function Re(e={}){let t=e.hooksFile??Y(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=k(t,"GitHub Copilot CLI");if(n.version!==void 0&&n.version!==1)throw new Error(`Unsupported existing GitHub Copilot CLI hooks version: ${String(n.version)}`);let r=n.hooks;if(r!==void 0&&!f(r))throw new Error("Invalid existing GitHub Copilot CLI hooks file: hooks must be an object.");let c=f(r)?{...r}:{};for(let[u,a]of $){let p=c[u];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing GitHub Copilot CLI hooks file: hooks.${u} must be an array.`);let g=Array.isArray(p)?p.filter(O=>!bo(O)):[];c[u]=[...g,Si(u,o,a)]}let i={...n,version:1,hooks:c};if(JSON.stringify(n)===JSON.stringify(i))return{hooksFile:t,changed:!1,hookCount:$.length};R(t,i);let s=k(t,"GitHub Copilot CLI");if(s.version!==1||!f(s.hooks))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");let l=0;for(let[u]of $){let a=s.hooks[u];if(!Array.isArray(a))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");l+=a.filter(bo).length}if(l!==$.length)throw new Error("GitHub Copilot CLI hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:$.length}}function Co(e,t){return m(e)?(e.type===void 0||e.type==="local"||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&Array.isArray(e.tools)&&e.tools.length===1&&e.tools[0]==="*":!1}function Ee(e={}){let t=e.configFile??W(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=I(t,"GitHub Copilot CLI"),c=r.mcpServers;if(c!==void 0&&!m(c))throw new Error("Invalid existing GitHub Copilot CLI MCP config: mcpServers must be an object.");let i=m(c)?{...c}:{};if(Co(i[n],o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};i[n]={type:"stdio",command:o,args:["mcp"],tools:["*"]},F(t,{...r,mcpServers:i});let l=I(t,"GitHub Copilot CLI").mcpServers;if(!m(l)||!Co(l[n],o))throw new Error("GitHub Copilot CLI MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}import{mkdirSync as vi,readFileSync as Oo,renameSync as xi,rmSync as wi,writeFileSync as Fi}from"node:fs";import{dirname as Ri}from"node:path";var Pe=`---
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
`;function Ei(e,t){vi(Ri(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Fi(o,t,{encoding:"utf8",mode:384}),xi(o,e)}finally{wi(o,{force:!0})}}function jo(e){let t=e.instructionFile??it(e.projectRoot);try{if(Oo(t,"utf8")===Pe)return{instructionFile:t,changed:!1}}catch{}if(Ei(t,Pe),Oo(t,"utf8")!==Pe)throw new Error("Copilot ToolNet project instruction verification failed.");return{instructionFile:t,changed:!0}}function Io(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.instruction?.changed)}function So(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=o==="global"?void 0:b({project:e.projectRoot}),r=P({agent:"copilot",scope:o,project:n});if(!r.canInstall)throw new Error(r.reason??"Copilot project integration scope cannot be resolved.");let c,i;if((r.surfaces.mcp.global.install||r.surfaces.hooks.global.install||r.surfaces.work.global.install)&&(c={},r.surfaces.mcp.global.install&&(c.mcp=Ee({binary:t,configFile:e.configFile??W()})),r.surfaces.hooks.global.install&&(c.hooks=Re({binary:t,hooksFile:e.hooksFile??Y()}))),r.surfaces.mcp.project.install||r.surfaces.hooks.project.install||r.surfaces.work.project.install){if(!n?.eligible)throw new Error("Copilot project integration requires an eligible project root.");i={},r.surfaces.mcp.project.install&&(i.mcp=Ee({binary:t,configFile:e.projectConfigFile??nt(n.root)})),r.surfaces.hooks.project.install&&(i.hooks=Re({binary:t,hooksFile:e.projectHooksFile??rt(n.root)})),r.surfaces.work.project.install&&(i.instruction=jo({projectRoot:n.root,instructionFile:e.projectInstructionFile}))}let s=i?.mcp??c?.mcp,l=i?.hooks??c?.hooks;if(!s||!l)throw new Error("Copilot integration did not produce effective MCP/hooks.");let u=Array.from(new Set([c?.mcp?.configFile,c?.hooks?.hooksFile,c?.instruction?.instructionFile,i?.mcp?.configFile,i?.hooks?.hooksFile,i?.instruction?.instructionFile].filter(a=>typeof a=="string")));return{installed:!0,changed:Io(c)||Io(i),scope:o,plan:r,project:n,global:c,projectScope:i,mcp:s,hooks:l,instruction:i?.instruction,files:u}}import{existsSync as Pi,mkdirSync as Ni,readFileSync as vo,renameSync as Ti,rmSync as Mi,writeFileSync as Ai}from"node:fs";import{dirname as Hi}from"node:path";var Ne=`---
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
`;function _i(e,t){Ni(Hi(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Ai(o,t,{encoding:"utf8",mode:384}),Ti(o,e)}finally{Mi(o,{force:!0})}}function Te(e={}){let t=e.skillFile??Q();if(Pi(t)&&vo(t,"utf8")===Ne)return{skillFile:t,changed:!1};if(_i(t,Ne),vo(t,"utf8")!==Ne)throw new Error("Grok ToolNet continuity skill was written but verification failed.");return{skillFile:t,changed:!0}}var G=[["SessionStart",10],["UserPromptSubmit",10],["PreToolUse",10],["PostToolUse",15],["Stop",30]];function xo(e){return!f(e)||!Array.isArray(e.hooks)?!1:e.hooks.some(t=>f(t)&&typeof t.command=="string"&&t.command.includes("session:grok-hook"))}function Ji(e,t,o){let n={hooks:[{type:"command",command:`${t} session:grok-hook`,timeout:o,env:{TOOLNET_HOOK_EVENT:e}}]};return e==="PreToolUse"&&(n.matcher=".*"),n}function Me(e={}){let t=e.hooksFile??z(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=k(t,"Grok Build"),r=n.hooks;if(r!==void 0&&!f(r))throw new Error("Invalid existing Grok Build hooks file: hooks must be an object.");let c=f(r)?{...r}:{};for(let[u,a]of G){let p=c[u];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing Grok Build hooks file: hooks.${u} must be an array.`);let g=Array.isArray(p)?p.filter(O=>!xo(O)):[];c[u]=[...g,Ji(u,o,a)]}let i={...n,hooks:c};if(JSON.stringify(n)===JSON.stringify(i))return{hooksFile:t,changed:!1,hookCount:G.length};R(t,i);let s=k(t,"Grok Build");if(!f(s.hooks))throw new Error("Grok Build hooks were written but verification failed.");let l=0;for(let[u]of G){let a=s.hooks[u];if(!Array.isArray(a))throw new Error("Grok Build hooks were written but verification failed.");l+=a.filter(xo).length}if(l!==G.length)throw new Error("Grok Build hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:G.length}}import{existsSync as Di,mkdirSync as $i,readFileSync as Gi,renameSync as Li,rmSync as Ki,writeFileSync as Ui}from"node:fs";import{dirname as Bi}from"node:path";function wo(e){return Di(e)?Gi(e,"utf8"):""}function qi(e,t){$i(Bi(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Ui(o,t,{encoding:"utf8",mode:384}),Li(o,e)}finally{Ki(o,{force:!0})}}function Ae(e){return e.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t")}function Wi(e){return`[mcp_servers."${Ae(e)}"]`}function Yi(e,t){return[Wi(e),`command = "${Ae(t)}"`,'args = ["mcp"]',"enabled = true"].join(`
`)}function Vi(e){let t=e.trim();return t.startsWith("[")&&t.includes("]")}function oe(e){return e.trim().replace(/\s+/g,"")}function Xi(e){return new Set([oe(`[mcp_servers.${e}]`),oe(`[mcp_servers."${e}"]`),oe(`[mcp_servers.'${e}']`)])}function Ro(e,t){let o=e.split(/\r?\n/),n=Xi(t),r=-1;for(let a=0;a<o.length;a+=1){let p=oe(o[a].replace(/\s+#.*$/,""));if(n.has(p)){r=a;break}}if(r<0)return null;let c=o.length;for(let a=r+1;a<o.length;a+=1)if(Vi(o[a])){c=a;break}let i=[],s=0;for(let a of o)i.push(s),s+=a.length+1;let l=i[r]??0,u=c>=o.length?e.length:i[c]??e.length;return{start:l,end:u}}function zi(e,t,o){let n=`${Yi(t,o)}
`,r=Ro(e,t);if(r){let c=e.slice(0,r.start),i=e.slice(r.end);return`${c}${n}${i.replace(/^\n+/,"")}`}return e.trim()?`${e.replace(/\s*$/,"")}

${n}`:n}function Fo(e,t,o){let n=Ro(e,t);if(!n)return!1;let r=e.slice(n.start,n.end);return r.includes(`command = "${Ae(o)}"`)&&/args\s*=\s*\[\s*"mcp"\s*\]/.test(r)&&/enabled\s*=\s*true/.test(r)}function He(e={}){let t=e.configFile??X(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=wo(t);if(Fo(r,n,o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};let c=zi(r,n,o);qi(t,c);let i=wo(t);if(!Fo(i,n,o))throw new Error("Grok Build MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}function Eo(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.skill?.changed)}function Po(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=o==="global"?void 0:b({project:e.projectRoot}),r=P({agent:"grok",scope:o,project:n});if(!r.canInstall)throw new Error(r.reason??"Grok project integration scope cannot be resolved.");let c,i;if((r.surfaces.mcp.global.install||r.surfaces.hooks.global.install||r.surfaces.work.global.install)&&(c={},r.surfaces.mcp.global.install&&(c.mcp=He({binary:t,configFile:e.configFile??X()})),r.surfaces.hooks.global.install&&(c.hooks=Me({binary:t,hooksFile:e.hooksFile??z()})),r.surfaces.work.global.install&&(c.skill=Te({skillFile:e.skillFile??Q()}))),r.surfaces.mcp.project.install||r.surfaces.hooks.project.install||r.surfaces.work.project.install){if(!n?.eligible)throw new Error("Grok project integration requires an eligible project root.");i={},r.surfaces.mcp.project.install&&(i.mcp=He({binary:t,configFile:e.projectConfigFile??ct(n.root)})),r.surfaces.hooks.project.install&&(i.hooks=Me({binary:t,hooksFile:e.projectHooksFile??lt(n.root)})),r.surfaces.work.project.install&&(i.skill=Te({skillFile:e.projectSkillFile??at(n.root)}))}let s=i?.mcp??c?.mcp,l=i?.hooks??c?.hooks,u=i?.skill??c?.skill;if(!s||!l||!u)throw new Error("Grok integration did not produce effective MCP/hooks/skill.");let a=Array.from(new Set([c?.mcp?.configFile,c?.hooks?.hooksFile,c?.skill?.skillFile,i?.mcp?.configFile,i?.hooks?.hooksFile,i?.skill?.skillFile].filter(p=>typeof p=="string")));return{installed:!0,changed:Eo(c)||Eo(i),scope:o,plan:r,project:n,global:c,projectScope:i,mcp:s,hooks:l,skill:u,files:a}}function No(e={}){if(e.scope==="global")return{scope:"global",automatic:!1,reason:"explicit-global"};if(e.scope==="project"||e.scope==="both"){let o=b({cwd:e.cwd,project:e.projectRoot});if(!o.eligible)throw new Error(`Explicit ${e.scope} integration requires an explicit project, ToolNet project, or Git repository root.`);return{scope:e.scope,automatic:!1,project:o,reason:e.scope==="project"?"explicit-project":"explicit-both"}}let t=b({cwd:e.cwd,project:e.projectRoot});return t.toolnetProject?{scope:"both",automatic:!0,project:t,reason:"toolnet-project"}:{scope:"global",automatic:!0,reason:"no-toolnet-project"}}function To(){return ft()}function Qi(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[],n=e.detections??To(),r=new Map(n.map(i=>[i.agent,i.detected])),c=No({scope:e.scope,projectRoot:e.projectRoot,cwd:e.cwd});if(!(e.force===!0||r.get("agy")===!0))o.push({agent:"agy",detected:!1,installed:!1,targets:[]});else try{let s=It({binary:t});o.push({agent:"agy",detected:!0,installed:!0,targets:s.files})}catch(s){o.push({agent:"agy",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||r.get("opencode")===!0))o.push({agent:"opencode",detected:!1,installed:!1,targets:[]});else try{let s=Ft({binary:t}),l=Tt({binary:t});o.push({agent:"opencode",detected:!0,installed:!0,targets:[s,l.configFile,`mcp:${l.serverName}`]})}catch(s){o.push({agent:"opencode",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||r.get("claude")===!0))o.push({agent:"claude",detected:!1,installed:!1,targets:[]});else try{let s=Yt({binary:t});o.push({agent:"claude",detected:!0,installed:!0,targets:[s.hooks.settingsFile,s.mcp.configFile,`mcp:${s.mcp.serverName}`]})}catch(s){o.push({agent:"claude",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||r.get("kiro")===!0))o.push({agent:"kiro",detected:!1,installed:!1,targets:[]});else try{let s=oo({...e.kiro??{},binary:t});o.push({agent:"kiro",detected:!0,installed:!0,targets:[s.mcp.configFile,`mcp:${s.mcp.serverName}`,s.hooks.hooksFile]})}catch(s){o.push({agent:"kiro",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||r.get("cursor")===!0))o.push({agent:"cursor",detected:!1,installed:!1,targets:[]});else try{let s=e.cursor??{},l=ko({...s,binary:t,scope:s.scope??c.scope,projectRoot:s.projectRoot??c.project?.root});o.push({agent:"cursor",detected:!0,installed:!0,scope:l.scope,projectRoot:l.project?.root,targets:[...l.files,`mcp:${l.mcp.serverName}`]})}catch(s){o.push({agent:"cursor",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||r.get("copilot")===!0))o.push({agent:"copilot",detected:!1,installed:!1,targets:[]});else try{let s=e.copilot??{},l=So({...s,binary:t,scope:s.scope??c.scope,projectRoot:s.projectRoot??c.project?.root});o.push({agent:"copilot",detected:!0,installed:!0,scope:l.scope,projectRoot:l.project?.root,targets:[...l.files,`mcp:${l.mcp.serverName}`]})}catch(s){o.push({agent:"copilot",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||r.get("grok")===!0))o.push({agent:"grok",detected:!1,installed:!1,targets:[]});else try{let s=e.grok??{},l=Po({...s,binary:t,scope:s.scope??c.scope,projectRoot:s.projectRoot??c.project?.root});o.push({agent:"grok",detected:!0,installed:!0,scope:l.scope,projectRoot:l.project?.root,targets:[...l.files,`mcp:${l.mcp.serverName}`]})}catch(s){o.push({agent:"grok",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||r.get("toolnet-cli")===!0))o.push({agent:"toolnet-cli",detected:!1,installed:!1,targets:[]});else try{let s=e.toolnetCli??{},l=ro({...s,binary:t});o.push({agent:"toolnet-cli",detected:!0,installed:!0,targets:[l.mcp.configFile]})}catch(s){o.push({agent:"toolnet-cli",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||r.get("kilo")===!0))o.push({agent:"kilo",detected:!1,installed:!1,targets:[]});else try{let s=e.kilo??{},l=so({...s,binary:t});o.push({agent:"kilo",detected:!0,installed:!0,targets:[l.mcp.configFile]})}catch(s){o.push({agent:"kilo",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||r.get("codex")===!0))o.push({agent:"codex",detected:!1,installed:!1,targets:[]});else try{let s=Jt({binary:t}),l=$t({binary:t}),u=Kt({binary:t});if(!u.installed)throw new Error(u.error??"Codex MCP registration failed");let a=[s.configFile,l,`mcp:${u.serverName}`];s.preservedPrevious&&a.push(s.previousFile),o.push({agent:"codex",detected:!0,installed:!0,targets:a})}catch(s){o.push({agent:"codex",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}return o}function Mo(e){switch(e){case"agy":return"Agy / Antigravity";case"opencode":return"OpenCode";case"claude":return"Claude Code";case"kiro":return"Kiro CLI";case"cursor":return"Cursor CLI";case"copilot":return"GitHub Copilot CLI";case"grok":return"Grok Build";case"codex":return"Codex";default:return e}}function Zi(e){console.log(""),console.log("ToolNet Memory Integration Detection"),console.log("===================================="),console.log("");for(let t of e){let o=Mo(t.agent);if(!t.detected){console.log(`\u25CB ${o}: not detected`);continue}console.log(`\u2713 ${o}: detected`);for(let n of t.evidence)console.log(`  ${n}`)}console.log("")}function es(e){console.log(""),console.log("ToolNet Memory AI Integrations"),console.log("=============================="),console.log("");for(let t of e){let o=Mo(t.agent);if(!t.detected){console.log(`- ${o}: not detected`);continue}if(t.installed){let n=t.scope?` [scope=${t.scope}]`:"";console.log(`\u2713 ${o}: automatic memory enabled${n}`),t.projectRoot&&console.log(`  project: ${t.projectRoot}`);continue}console.log(`\u2717 ${o}: integration failed`),t.error&&console.log(`  ${t.error}`)}console.log("")}function ts(e,t){let o=e.indexOf(t);return o>=0?e[o+1]:void 0}function os(e){return e.includes("--scope")||e.includes("--global")||e.includes("--both")?yo(e):void 0}async function ns(){let e=process.argv.slice(2),t=e.includes("--all"),o=e.includes("--json"),n=e.includes("--detect-only"),r=os(e),c=ts(e,"--project");if(n){let s=To();if(o){console.log(JSON.stringify(s,null,2));return}Zi(s);return}let i=Qi({force:t,scope:r,projectRoot:c});if(o){console.log(JSON.stringify(i,null,2));return}es(i)}var rs=process.argv[1]&&(process.argv[1].endsWith("auto-integrate.js")||process.argv[1].endsWith("auto-integrate.ts"));rs&&ns().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});export{To as detectAutoIntegrations,Qi as installAutoIntegrations};
