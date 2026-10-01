import{existsSync as bt}from"node:fs";import{homedir as hn}from"node:os";import{join as kn}from"node:path";import{spawnSync as bn}from"node:child_process";import{homedir as qo}from"node:os";import{join as v}from"node:path";function Ue(e={}){return v(e.home??qo(),".gemini")}function Be(e={}){return v(Ue(e),"antigravity-cli")}function qe(e={}){return v(Ue(e),"config")}function L(e={}){return v(qe(e),"mcp_config.json")}function K(e={}){let t=e.cwd??process.cwd();return v(t,".agents","mcp_config.json")}function U(e="toolnet-memory",t={}){return v(Be(t),"plugins",e)}function We(e={}){return[Be(e),L(e),qe(e),K(e)]}import{homedir as Ye}from"node:os";import{join as w}from"node:path";function x(e={}){let t=process.env.OPENCODE_CONFIG_DIR?.trim();if(t)return t;let o=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return o?w(o,"opencode"):w(e.home??Ye(),".config","opencode")}function pe(e={}){let t=process.env.OPENCODE_CONFIG?.trim();if(t)return t;let o=e.home??Ye(),n=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return n?w(n,"opencode","opencode.json"):w(o,".config","opencode","opencode.json")}function ge(e={}){let t=e.cwd??process.cwd();return w(t,"opencode.json")}function Ve(e={}){return w(x(e),"plugins")}function Xe(e={}){return w(x(e),"AGENTS.md")}import{homedir as ze}from"node:os";import{join as de}from"node:path";function fe(e={}){return de(e.home??ze(),".claude")}function Qe(e={}){return de(fe(e),"settings.json")}function Ze(e={}){return de(e.home??ze(),".claude.json")}import{homedir as Wo}from"node:os";import{join as S}from"node:path";function me(e={}){return e.kiroHome??process.env.KIRO_HOME??S(e.home??Wo(),".kiro")}function Yo(e={}){return S(me(e),"settings")}function B(e={}){return S(Yo(e),"mcp.json")}function ye(e={}){let t=e.cwd??process.cwd();return S(t,".kiro","settings","mcp.json")}function Vo(e={}){return S(me(e),"hooks")}function he(e={}){return S(Vo(e),"toolnet-memory.json")}function ke(e={}){let t=e.cwd??process.cwd();return S(t,".kiro","hooks","toolnet-memory.json")}function et(e={}){return[me(e),B(e)]}import{homedir as Xo}from"node:os";import{join as be}from"node:path";function tt(e={}){return be(e.home??Xo(),".toolnetcli")}function zo(e={}){return be(tt(e),"config.json")}function ot(e={}){let t=e.cwd??process.cwd();return be(t,".toolnet","mcp.json")}function nt(e={}){let t=tt(e),o=zo(e);return[t,o]}import{homedir as Qo}from"node:os";import{join as je}from"node:path";function rt(e={}){if(e.kiloHome)return e.kiloHome;if(process.env.KILO_HOME)return process.env.KILO_HOME;let t=e.xdgConfigHome??process.env.XDG_CONFIG_HOME;return t?je(t,"kilo"):je(e.home??Qo(),".config","kilo")}function Ie(e={}){return je(rt(e),"kilo.jsonc")}function it(e={}){let t=rt(e),o=Ie(e);return[t,o]}import{homedir as Zo}from"node:os";import{join as k,resolve as en}from"node:path";function q(e={}){return e.cursorHome??k(e.home??Zo(),".cursor")}function tn(e={}){return e.cursorConfigDir??process.env.CURSOR_CONFIG_DIR??(e.xdgConfigHome??process.env.XDG_CONFIG_HOME?k(e.xdgConfigHome??process.env.XDG_CONFIG_HOME,"cursor"):void 0)??q(e)}function W(e={}){return k(q(e),"mcp.json")}function Y(e={}){return k(q(e),"hooks.json")}function Ce(e){return k(en(e),".cursor")}function st(e){return k(Ce(e),"mcp.json")}function ct(e){return k(Ce(e),"hooks.json")}function on(e){return k(Ce(e),"rules")}function lt(e){return k(on(e),"toolnet-memory.mdc")}function at(e={}){return Array.from(new Set([q(e),tn(e)]))}import{homedir as nn}from"node:os";import{join as h,resolve as rn}from"node:path";function Oe(e={}){return e.copilotHome??process.env.COPILOT_HOME??h(e.home??nn(),".copilot")}function V(e={}){return h(Oe(e),"mcp-config.json")}function sn(e={}){return h(Oe(e),"hooks")}function X(e={}){return h(sn(e),"toolnet-memory.json")}function we(e){return h(rn(e),".github")}function ut(e){return h(we(e),"mcp.json")}function cn(e){return h(we(e),"hooks")}function pt(e){return h(cn(e),"toolnet-memory.json")}function ln(e){return h(we(e),"instructions")}function gt(e){return h(ln(e),"toolnet-memory.instructions.md")}function dt(e={}){return[Oe(e)]}import{homedir as an}from"node:os";import{join as m,resolve as un}from"node:path";function z(e={}){return e.grokHome??process.env.GROK_HOME??m(e.home??an(),".grok")}function Q(e={}){return m(z(e),"config.toml")}function pn(e={}){return m(z(e),"hooks")}function Z(e={}){return m(pn(e),"toolnet-memory.json")}function gn(e={}){return m(z(e),"skills")}function dn(e={}){return m(gn(e),"toolnet-continuity")}function ee(e={}){return m(dn(e),"SKILL.md")}function Se(e){return m(un(e),".grok")}function ft(e){return m(Se(e),"config.toml")}function fn(e){return m(Se(e),"hooks")}function mt(e){return m(fn(e),"toolnet-memory.json")}function mn(e){return m(Se(e),"skills")}function yn(e){return m(mn(e),"toolnet-continuity")}function yt(e){return m(yn(e),"SKILL.md")}function ht(e={}){return[z(e)]}function jn(e){return bn("sh",["-lc",`command -v ${JSON.stringify(e)} >/dev/null 2>&1`],{stdio:"ignore"}).status===0}function C(e){let t=e.commandExists(e.command),o=e.configPaths.filter(s=>bt(s)),n=o.length>0,r=[];t&&r.push(`command:${e.command}`);for(let s of o)r.push(`config:${s}`);return{agent:e.agent,detected:t||n,commandDetected:t,configDetected:n,evidence:r}}function kt(e){let t=e.commands.filter(i=>e.commandExists(i)),o=e.configPaths.filter(i=>bt(i)),n=t.length>0,r=o.length>0,s=[...t.map(i=>`command:${i}`),...o.map(i=>`config:${i}`)];return{agent:e.agent,detected:n||r,commandDetected:n,configDetected:r,evidence:s}}function jt(e={}){let t=e.home??hn(),o=e.commandExists??jn,n=e.codexHome??process.env.CODEX_HOME??kn(t,".codex");return[C({agent:"agy",command:"agy",commandExists:o,configPaths:We({home:t})}),C({agent:"opencode",command:"opencode",commandExists:o,configPaths:[x({home:t,xdgConfigHome:e.xdgConfigHome})]}),C({agent:"claude",command:"claude",commandExists:o,configPaths:[fe({home:t})]}),C({agent:"kiro",command:"kiro-cli",commandExists:o,configPaths:et({home:t,kiroHome:e.kiroHome})}),kt({agent:"cursor",commands:["agent","cursor-agent"],commandExists:o,configPaths:at({home:t,cursorHome:e.cursorHome,cursorConfigDir:e.cursorConfigDir,xdgConfigHome:e.xdgConfigHome})}),C({agent:"copilot",command:"copilot",commandExists:o,configPaths:dt({home:t,copilotHome:e.copilotHome})}),C({agent:"grok",command:"grok",commandExists:o,configPaths:ht({home:t,grokHome:e.grokHome})}),C({agent:"toolnet-cli",command:"toolnet",commandExists:o,configPaths:nt({home:t})}),kt({agent:"kilo",commands:["kilo","kilo-code"],commandExists:o,configPaths:it({home:t,kiloHome:e.kiloHome})}),C({agent:"codex",command:"codex",commandExists:o,configPaths:[n]})]}import{existsSync as Jn,mkdirSync as vt,readFileSync as $n,renameSync as Gn,writeFileSync as Ln}from"node:fs";import{dirname as Kn,join as oe}from"node:path";import{existsSync as In,mkdirSync as Cn,readFileSync as On,renameSync as wn,rmSync as Sn,writeFileSync as vn}from"node:fs";import{dirname as xn,join as Fn}from"node:path";function Rn(e){return`'${e.replace(/'/g,"'\\''")}'`}function Nn(e){if(!In(e))return{};let t;try{t=JSON.parse(On(e,"utf8"))}catch{throw new Error(`Invalid existing Agy hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Agy hooks.json at ${e}: root must be a JSON object.`);return t}function Pn(e,t){Cn(xn(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{vn(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),wn(o,e)}finally{Sn(o,{force:!0})}}function It(e={}){let t=e.pluginName??"toolnet-memory",o=e.hooksFile??Fn(U(t),"hooks.json"),n=Nn(o),r=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",s=`${Rn(r)} session:agy-hook`;return n["toolnet-memory"]={enabled:!0,PreToolUse:[{matcher:"view_file|list_dir|find_by_name|grep_search|run_command",hooks:[{type:"command",command:`${s} pre-tool`,timeout:5}]}],PreInvocation:[{type:"command",command:`${s} pre`,timeout:15}],PostInvocation:[{type:"command",command:`${s} post`,timeout:15}],Stop:[{type:"command",command:`${s} stop`,timeout:30}]},Pn(o,n),o}import{existsSync as En,mkdirSync as Tn,readFileSync as Mn,renameSync as An,writeFileSync as _n}from"node:fs";import{dirname as Hn}from"node:path";function T(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Dn(e,t){Tn(Hn(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;_n(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),An(o,e)}function Ct(e){if(!En(e))return{};let t=Mn(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Agy MCP config at ${e}: parse error. Not overwriting.`)}if(!T(o))throw new Error(`Invalid existing Agy MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Ot(e,t){return T(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function te(e,t,o,n){let r=Ct(e),s=r.mcpServers;if(s!==void 0&&!T(s))throw new Error(`Invalid existing Agy MCP config: mcpServers must be an object in ${e}.`);let i=T(s)?{...s}:{},c=i[o];if(Ot(c,t)&&!n)return{installed:!0,changed:!1};i[o]={command:t,args:["mcp"]};let l={...r,mcpServers:i};Dn(e,l);let a=Ct(e).mcpServers;if(!T(a)||!Ot(a[o],t))throw new Error(`Agy MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function wt(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",n=e.scope??"global";if(e.configFile)return{...te(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(n==="both"){let i=L(),c=K({cwd:e.cwd}),l=te(i,t,o,e.force??!1),u=te(c,t,o,e.force??!1);return{installed:!0,changed:l.changed||u.changed,configFile:i,serverName:o,command:t,args:["mcp"]}}let r=n==="workspace"?K({cwd:e.cwd}):L();return{...te(r,t,o,e.force??!1),configFile:r,serverName:o,command:t,args:["mcp"]}}var Un=`# ToolNet Memory Continuity

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
`;function Bn(e,t){vt(Kn(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;Ln(o,t,{encoding:"utf8",mode:384}),Gn(o,e)}function St(e,t){Jn(e)&&$n(e,"utf8")===t||Bn(e,t)}function xt(e={}){let t=e.pluginName??"toolnet-memory",o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.pluginRoot??U(t),r=oe(n,"plugin.json"),s=oe(n,"mcp_config.json"),i=oe(n,"hooks.json"),c=oe(n,"rules","toolnet-memory-continuity.md");return vt(n,{recursive:!0,mode:448}),St(r,`${JSON.stringify({$schema:"https://antigravity.google/schemas/v1/plugin.json",name:t,description:"Persistent project continuity and memory for Antigravity coding sessions."},null,2)}
`),wt({configFile:s,binary:o,serverName:"toolnet-memory",force:e.force}),It({hooksFile:i,binary:o,pluginName:t}),St(c,`${Un.trim()}
`),{installed:!0,pluginRoot:n,files:[r,s,i,c]}}import{existsSync as Wn,mkdirSync as Pt,readFileSync as Yn,writeFileSync as Et}from"node:fs";import{join as Rt}from"node:path";var qn="memory_agent_ask";function Ft(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${qn}

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
`.trim()}var Nt="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",ve="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function Vn(e={}){let t=Xe();Pt(x(),{recursive:!0});let o=`${Nt}
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


${Ft()}

${ve}`,n=Wn(t)?Yn(t,"utf8"):"",r=n.indexOf(Nt),s=n.indexOf(ve);return r>=0&&s>=r?n=n.slice(0,r)+o+n.slice(s+ve.length):(n=n.trimEnd(),n&&(n+=`

`),n+=o),Et(t,n.trimEnd()+`
`,{encoding:"utf8",mode:384}),t}function Tt(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[];o.push(Vn({cwd:e.cwd}));let n=e.scope??"global",r=[];if((n==="global"||n==="both")&&r.push(e.directory??Ve()),n==="project"||n==="both"){let s=e.cwd??process.cwd();r.push(Rt(s,".opencode","plugins"))}for(let s of r){Pt(s,{recursive:!0});let i=Rt(s,"toolnet-memory.js"),c=`
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
`;Et(i,c.trimStart(),{encoding:"utf8",mode:384}),o.push(i)}return o}import{existsSync as _t,mkdirSync as Xn,readFileSync as zn,renameSync as Qn,writeFileSync as Zn}from"node:fs";import{dirname as Ht,join as er}from"node:path";function M(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function tr(e,t){Xn(Ht(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;Zn(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Qn(o,e)}function Mt(e){if(!_t(e))return{};let t=zn(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing OpenCode config at ${e}: parse error. Not overwriting.`)}if(!M(o))throw new Error(`Invalid existing OpenCode config at ${e}: root must be a JSON object. Not overwriting.`);return o}function At(e,t){if(!M(e))return!1;let o=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(o)&&o.length===2&&o[0]===t&&o[1]==="mcp"}function ne(e,t,o,n){let r=er(Ht(e),"opencode.jsonc"),s=_t(r)?r:void 0,i=Mt(e),c=i.mcp;if(c!==void 0&&!M(c))throw new Error(`Invalid existing OpenCode config: mcp must be an object in ${e}.`);let l=M(c)?{...c}:{},u=l[o];if(At(u,t)&&!n)return{installed:!0,changed:!1,preservedJsonc:s};l[o]={type:"local",command:[t,"mcp"],enabled:!0};let a={...i,mcp:l};tr(e,a);let p=Mt(e);if(!M(p.mcp)||!At(p.mcp[o],t))throw new Error(`OpenCode MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0,preservedJsonc:s}}function Dt(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",n=e.scope??"global";if(e.configFile)return{...ne(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:[t,"mcp"]};if(n==="both"){let i=pe(),c=ge({cwd:e.cwd}),l=ne(i,t,o,e.force??!1),u=ne(c,t,o,e.force??!1);return{installed:!0,changed:l.changed||u.changed,configFile:i,serverName:o,command:[t,"mcp"],preservedJsonc:l.preservedJsonc??u.preservedJsonc}}let r=n==="project"?ge({cwd:e.cwd}):pe();return{...ne(r,t,o,e.force??!1),configFile:r,serverName:o,command:[t,"mcp"]}}import{existsSync as or,mkdirSync as Jt,readFileSync as nr,writeFileSync as $t}from"node:fs";import{homedir as Gt}from"node:os";import{dirname as Lt,join as xe}from"node:path";function rr(e){let t=[],o=/"((?:\\.|[^"\\])*)"|'([^']*)'/g,n;for(;n=o.exec(e);){let r=n[1]??n[2]??"";try{t.push(n[1]!==void 0?JSON.parse(`"${r}"`):r)}catch{t.push(r)}}return t}function Kt(e={}){let t=e.configFile??xe(process.env.CODEX_HOME??xe(Gt(),".codex"),"config.toml"),o=e.previousFile??xe(Gt(),".config","toolnet-memory","codex-notify-previous.json");Jt(Lt(t),{recursive:!0}),Jt(Lt(o),{recursive:!0});let n=or(t)?nr(t,"utf8"):"",r=e.binary??"toolnet-memory",s=`notify = [${JSON.stringify(r)}, "session:codex-notify"]`,i=n.split(`
`),c=i.findIndex(g=>/^\s*\[/.test(g));c<0&&(c=i.length);let l=-1,u=-1;for(let g=0;g<c;g+=1)if(/^\s*notify\s*=/.test(i[g])){if(l=g,u=g,i[g].includes("[")&&!i[g].includes("]"))for(;u+1<c&&(u+=1,!i[u].includes("]")););break}let a=[];if(l>=0){let g=i.slice(l,u+1).join(`
`);a=rr(g),i.splice(l,u-l+1,s)}else c=i.findIndex(g=>/^\s*\[/.test(g)),c<0&&(c=i.length),i.splice(c,0,s);let p=a.length>=2&&a[a.length-1]==="session:codex-notify";return a.length>0&&!p&&$t(o,JSON.stringify(a,null,2)+`
`,{encoding:"utf8",mode:384}),n=i.join(`
`),n.endsWith(`
`)||(n+=`
`),$t(t,n,{encoding:"utf8",mode:384}),{configFile:t,previousFile:o,preservedPrevious:a.length>0&&!p}}import{existsSync as ir,mkdirSync as sr,readFileSync as cr,writeFileSync as lr}from"node:fs";import{homedir as ar}from"node:os";import{dirname as ur,join as Ut}from"node:path";function pr(e){return`'${e.replace(/'/g,"'\\''")}'`}function Bt(e={}){let t=e.hooksFile??Ut(process.env.CODEX_HOME??Ut(ar(),".codex"),"hooks.json");sr(ur(t),{recursive:!0});let o={};if(ir(t))try{o=JSON.parse(cr(t,"utf8"))}catch(c){throw new Error(`Invalid existing Codex hooks.json: ${c instanceof Error?c.message:String(c)}`)}let n=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=n;let s=(Array.isArray(n.SessionStart)?n.SessionStart:[]).filter(c=>{try{return!JSON.stringify(c).includes("session:codex-context")}catch{return!0}}),i=e.binary??"toolnet-memory";return s.push({matcher:"startup|resume|clear|compact",hooks:[{type:"command",command:`${pr(i)} session:codex-context`,timeout:15,additionalContextLimit:1e3,statusMessage:"Loading ToolNet project continuity"}]}),n.SessionStart=s,lr(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),t}import{existsSync as qt,mkdirSync as gr,readFileSync as Wt,writeFileSync as dr}from"node:fs";import{homedir as fr}from"node:os";import{dirname as mr,join as Yt}from"node:path";function Vt(e){return`'${e.replace(/'/g,"'\\''")}'`}function Xt(e={}){let t=e.hooksFile??Yt(process.env.CODEX_HOME??Yt(fr(),".codex"),"hooks.json");gr(mr(t),{recursive:!0});let o={};if(qt(t))try{o=JSON.parse(Wt(t,"utf8"))}catch{throw new Error(`Invalid existing Codex hooks.json at ${t}: parse error. Not overwriting.`)}let n=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=n;let r=e.binary??"toolnet-memory",s=`${Vt(r)} session:codex-stop-hook`,i=`${Vt(r)} session:codex-session-end`,c={hooks:[{type:"command",command:s,timeout:30}]},l={hooks:[{type:"command",command:i,timeout:3}]},a=(Array.isArray(n.Stop)?n.Stop:[]).filter(ue=>{try{return!JSON.stringify(ue).includes("session:codex-stop-hook")}catch{return!0}}),g=(Array.isArray(n.SessionEnd)?n.SessionEnd:[]).filter(ue=>{try{return!JSON.stringify(ue).includes("session:codex-session-end")}catch{return!0}});n.Stop=[...a,c],n.SessionEnd=[...g,l];let y=JSON.stringify(o,null,2)+`
`,Bo=!qt(t)||Wt(t,"utf8")!==y;return dr(t,y,{encoding:"utf8",mode:384}),{hooksFile:t,changed:Bo,stopInstalled:!0,sessionEndInstalled:!0}}import{spawnSync as yr}from"node:child_process";function Fe(e,t){return yr(e,t,{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}function zt(e,t){let o=Fe(e,["mcp","get",t,"--json"]);if(o.status!==0||!o.stdout)return null;try{return JSON.parse(o.stdout)}catch{return null}}function Qt(e,t){return e.enabled!==!1&&e.transport?.type==="stdio"&&e.transport?.command===t&&Array.isArray(e.transport?.args)&&e.transport?.args.length===1&&e.transport.args[0]==="mcp"}function Zt(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.codexBinary??"codex",n=e.serverName??"toolnet-memory",r=zt(o,n);if(r&&Qt(r,t))return{installed:!0,changed:!1,serverName:n,command:t,args:["mcp"]};if(r){let c=Fe(o,["mcp","remove",n]);if(c.status!==0)return{installed:!1,changed:!1,serverName:n,command:t,args:["mcp"],error:(c.stderr||c.stdout||"Unable to remove old ToolNet MCP configuration.").trim()}}let s=Fe(o,["mcp","add",n,"--",t,"mcp"]);if(s.status!==0)return{installed:!1,changed:!1,serverName:n,command:t,args:["mcp"],error:(s.stderr||s.stdout||"Unable to register ToolNet MCP.").trim()};let i=zt(o,n);return!i||!Qt(i,t)?{installed:!1,changed:!0,serverName:n,command:t,args:["mcp"],error:"Codex accepted MCP registration but verification did not match expected ToolNet command."}:{installed:!0,changed:!0,serverName:n,command:t,args:["mcp"]}}import{existsSync as hr,mkdirSync as kr,readFileSync as br,renameSync as jr,rmSync as Ir,writeFileSync as Cr}from"node:fs";import{dirname as Or}from"node:path";function A(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function wr(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function Sr(e){if(!hr(e))return{};let t;try{t=JSON.parse(br(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude settings.json: ${o instanceof Error?o.message:String(o)}`)}if(!A(t))throw new Error("Invalid existing Claude settings.json: root must be a JSON object.");return t}function re(e){if(e===void 0)return[];if(!Array.isArray(e))throw new Error("Invalid existing Claude settings.json: hook event must be an array.");let t=[];for(let o of e){if(!A(o)){t.push(o);continue}let n=o.hooks;if(!Array.isArray(n)){t.push(o);continue}let r=n.filter(s=>{if(!A(s))return!0;let i=s.command;return!(typeof i=="string"&&i.includes("session:claude-hook"))});r.length!==0&&t.push({...o,hooks:r})}return t}function ie(e,t=10){return{type:"command",command:e,timeout:t}}function vr(e,t){kr(Or(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Cr(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),jr(o,e)}finally{Ir(o,{force:!0})}}function eo(e={}){let t=e.settingsFile??Qe(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=Sr(t),r=n.hooks;if(r!==void 0&&!A(r))throw new Error("Invalid existing Claude settings.json: hooks must be an object.");let s=A(r)?{...r}:{},i=`${wr(o)} session:claude-hook`,c=re(s.SessionStart);c.push({matcher:"startup|resume|clear|compact",hooks:[ie(i)]}),s.SessionStart=c;let l=re(s.UserPromptSubmit);l.push({hooks:[ie(i)]}),s.UserPromptSubmit=l;let u=re(s.PostToolUse);u.push({matcher:"Edit|Write",hooks:[ie(i)]}),s.PostToolUse=u;let a=re(s.Stop);a.push({hooks:[ie(i,30)]}),s.Stop=a;let p={...n,hooks:s},g=JSON.stringify(n),y=JSON.stringify(p);return g===y?{settingsFile:t,changed:!1}:e.dryRun===!0?{settingsFile:t,changed:!0,dryRun:!0}:(vr(t,p),{settingsFile:t,changed:!0})}import{existsSync as xr,mkdirSync as Fr,readFileSync as Rr,renameSync as Nr,rmSync as Pr,writeFileSync as Er}from"node:fs";import{dirname as Tr}from"node:path";function _(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function to(e){if(!xr(e))return{};let t;try{t=JSON.parse(Rr(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude Code config: ${o instanceof Error?o.message:String(o)}`)}if(!_(t))throw new Error("Invalid existing Claude Code config: root must be a JSON object.");return t}function oo(e,t){if(!_(e))return!1;let o=e.args;return e.type==="stdio"&&e.command===t&&Array.isArray(o)&&o.length===1&&o[0]==="mcp"}function Mr(e,t){Fr(Tr(e),{recursive:!0});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Er(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Nr(o,e)}finally{Pr(o,{force:!0})}}function no(e={}){let t=e.stateFile??Ze(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=to(t),s=r.mcpServers;if(s!==void 0&&!_(s))throw new Error("Invalid existing Claude Code config: mcpServers must be an object.");let i=_(s)?{...s}:{},c=i[n];if(oo(c,o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:[o,"mcp"],repaired:!1};let l=c!==void 0;if(i[n]={type:"stdio",command:o,args:["mcp"]},e.dryRun===!0)return{installed:!0,changed:!0,configFile:t,serverName:n,command:[o,"mcp"],repaired:l,dryRun:!0};Mr(t,{...r,mcpServers:i});let a=to(t).mcpServers;if(!_(a)||!oo(a[n],o))throw new Error("Claude Code MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:[o,"mcp"],repaired:l}}function ro(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=eo({binary:t,settingsFile:e.settingsFile,...e.dryRun!==void 0?{dryRun:e.dryRun}:{}}),n=no({binary:t,stateFile:e.stateFile,...e.dryRun!==void 0?{dryRun:e.dryRun}:{}});return{hooks:o,mcp:n,files:[o.settingsFile,n.configFile]}}import{existsSync as Ar,mkdirSync as _r,readFileSync as Hr,renameSync as Dr,rmSync as Jr,writeFileSync as $r}from"node:fs";import{dirname as Gr}from"node:path";var F="ToolNet Memory - ";function co(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Lr(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function io(e){if(!Ar(e))return{};let t=Hr(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro hooks file at ${e}: parse error. Not overwriting.`)}if(!co(o))throw new Error(`Invalid existing Kiro hooks file at ${e}: root must be a JSON object. Not overwriting.`);return o}function so(e){return co(e)?typeof e.name=="string"&&e.name.startsWith(F):!1}function H(e){return{type:"command",command:e}}function Kr(e){return[{name:`${F}Session Start`,description:"Inject compact local ToolNet continuity and capture Kiro session activation.",trigger:"SessionStart",action:H(e),timeout:10,enabled:!0},{name:`${F}Prompt Continuity`,description:"Capture prompts and refresh ToolNet guidance only for resume/continue requests.",trigger:"UserPromptSubmit",action:H(e),timeout:10,enabled:!0},{name:`${F}Raw History Guard`,description:"Prevent Kiro from reconstructing continuity from raw ToolNet/agent session history.",trigger:"PreToolUse",matcher:"*",action:H(e),timeout:10,enabled:!0},{name:`${F}Tool Capture`,description:"Capture durable tool activity while filtering noisy read-only events.",trigger:"PostToolUse",matcher:"*",action:H(e),timeout:15,enabled:!0},{name:`${F}Final Flush`,description:"Flush pending Kiro WAL events when the assistant finishes a turn.",trigger:"Stop",action:H(e),timeout:30,enabled:!0}]}function Ur(e,t){_r(Gr(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{$r(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Dr(o,e)}finally{Jr(o,{force:!0})}}function se(e,t,o){let n=io(e);if(n.version!==void 0&&n.version!=="v1")throw new Error(`Unsupported existing Kiro hooks version: ${String(n.version)}`);let r=n.hooks;if(r!==void 0&&!Array.isArray(r))throw new Error("Invalid existing Kiro hooks file: hooks must be an array.");let s=Array.isArray(r)?r.filter(u=>!so(u)):[],i=Kr(t),c={...n,version:"v1",hooks:[...s,...i]};if(!o&&JSON.stringify(n)===JSON.stringify(c))return{changed:!1,hookCount:i.length};Ur(e,c);let l=io(e);if(l.version!=="v1"||!Array.isArray(l.hooks)||l.hooks.filter(so).length!==i.length)throw new Error("Kiro hooks were written but verification failed.");return{changed:!0,hookCount:i.length}}function lo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=`${Lr(t)} session:kiro-hook`;if(e.hooksFile){let i=se(e.hooksFile,n,e.force??!1);return{hooksFile:e.hooksFile,...i}}if(o==="both"){let i=he(),c=ke({cwd:e.cwd}),l=se(i,n,e.force??!1),u=se(c,n,e.force??!1);return{hooksFile:i,changed:l.changed||u.changed,hookCount:l.hookCount}}let r=o==="project"?ke({cwd:e.cwd}):he(),s=se(r,n,e.force??!1);return{hooksFile:r,...s}}import{existsSync as Br,mkdirSync as qr,readFileSync as Wr,renameSync as Yr,rmSync as Vr,writeFileSync as Xr}from"node:fs";import{dirname as zr}from"node:path";function D(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function ao(e){if(!Br(e))return{};let t=Wr(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro MCP config at ${e}: parse error. Not overwriting.`)}if(!D(o))throw new Error(`Invalid existing Kiro MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function uo(e,t){return D(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&e.disabled===!1:!1}function Qr(e,t){qr(zr(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Xr(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Yr(o,e)}finally{Vr(o,{force:!0})}}function ce(e,t,o,n){let r=ao(e),s=r.mcpServers;if(s!==void 0&&!D(s))throw new Error(`Invalid existing Kiro MCP config: mcpServers must be an object in ${e}.`);let i=D(s)?{...s}:{},c=i[o];if(uo(c,t)&&!n)return{installed:!0,changed:!1};i[o]={command:t,args:["mcp"],disabled:!1};let l={...r,mcpServers:i};Qr(e,l);let a=ao(e).mcpServers;if(!D(a)||!uo(a[o],t))throw new Error(`Kiro MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function po(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",n=e.scope??"global";if(e.configFile)return{...ce(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(n==="both"){let i=B(),c=ye({cwd:e.cwd}),l=ce(i,t,o,e.force??!1),u=ce(c,t,o,e.force??!1);return{installed:!0,changed:l.changed||u.changed,configFile:i,serverName:o,command:t,args:["mcp"]}}let r=n==="project"?ye({cwd:e.cwd}):B();return{...ce(r,t,o,e.force??!1),configFile:r,serverName:o,command:t,args:["mcp"]}}function go(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=po({binary:t,configFile:e.configFile,scope:e.scope,cwd:e.cwd,force:e.force}),n=lo({binary:t,hooksFile:e.hooksFile,scope:e.scope,cwd:e.cwd,force:e.force});return{installed:o.installed,changed:o.changed||n.changed,mcp:o,hooks:n,files:[o.configFile,n.hooksFile]}}import{existsSync as Zr,mkdirSync as ei,readFileSync as ti,renameSync as oi,rmSync as ni,writeFileSync as ri}from"node:fs";import{dirname as ii}from"node:path";function Re(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function si(e){if(!Zr(e))return{};let t=ti(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: parse error. Not overwriting.`)}if(!Re(o))throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function ci(e,t){ei(ii(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{ri(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),oi(o,e)}finally{ni(o,{force:!0})}}function fo(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??ot({cwd:e.cwd}),n=si(o),r="toolnet-memory";if(Re(n.mcpServers)&&n.mcpServers[r]!=null&&!e.force)return{installed:!0,changed:!1,configFile:o};let i=Re(n.mcpServers)?{...n.mcpServers}:{};return i[r]={command:t,args:["mcp"]},n.mcpServers=i,ci(o,n),{installed:!0,changed:!0,configFile:o}}function mo(e={}){let t=e.binary??"toolnet-memory",o=fo({binary:t,configFile:e.configFile,force:e.force,cwd:e.cwd});return{installed:o.installed,changed:o.changed,mcp:{...o,configured:o.installed},files:[o.configFile]}}import{mkdirSync as mi,existsSync as yi}from"node:fs";import{dirname as hi}from"node:path";import{existsSync as li,mkdirSync as ai,readFileSync as ui,renameSync as pi,rmSync as gi,writeFileSync as di}from"node:fs";import{dirname as fi}from"node:path";function f(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function O(e,t){if(!li(e))return{};let o=ui(e,"utf8").trim();if(!o)return{};let n;try{n=JSON.parse(o)}catch(r){throw new Error(`Invalid existing ${t} MCP config: ${r instanceof Error?r.message:String(r)}`)}if(!f(n))throw new Error(`Invalid existing ${t} MCP config: root must be a JSON object.`);return n}function R(e,t){ai(fi(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{di(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),pi(o,e)}finally{gi(o,{force:!0})}}function yo(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??Ie(),n=hi(o);yi(n)||mi(n,{recursive:!0});let r=O(o,"Kilo"),s=r.mcp;if(s!==void 0&&!f(s))throw new Error("Invalid existing Kilo config: mcp must be an object.");let i=f(s)?{...s}:{},c="toolnet-memory";return f(i[c])&&!e.force?{installed:!0,changed:!1,configFile:o,configured:!0}:(i[c]={type:"local",command:[t,"mcp"],enabled:!0,timeout:1e4},R(o,{...r,mcp:i}),{installed:!0,changed:!0,configFile:o,configured:!0})}function ho(e={}){let t=e.binary??"toolnet-memory",o=yo({binary:t,configFile:e.configFile,force:e.force});return{installed:o.installed,changed:o.changed,mcp:o,files:[o.configFile]}}import{existsSync as ki,mkdirSync as bi,readFileSync as ji,renameSync as Ii,rmSync as Ci,writeFileSync as Oi}from"node:fs";import{dirname as wi}from"node:path";function d(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function b(e,t){if(!ki(e))return{};let o=ji(e,"utf8").trim();if(!o)return{};let n;try{n=JSON.parse(o)}catch(r){throw new Error(`Invalid existing ${t} hooks file: ${r instanceof Error?r.message:String(r)}`)}if(!d(n))throw new Error(`Invalid existing ${t} hooks file: root must be a JSON object.`);return n}function N(e,t){bi(wi(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Oi(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Ii(o,e)}finally{Ci(o,{force:!0})}}function Ne(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}var J=[["sessionStart",10],["beforeSubmitPrompt",10],["preToolUse",10],["postToolUse",15],["afterAgentResponse",15],["stop",30]];function ko(e){return d(e)&&typeof e.command=="string"&&e.command.includes("session:cursor-hook")}function Si(e,t,o){let r={type:"command",command:`TOOLNET_HOOK_EVENT=${Ne(e)} ${Ne(t)} session:cursor-hook`,timeout:o};return e==="preToolUse"&&(r.matcher=".*"),r}function Pe(e={}){let t=e.hooksFile??Y(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=b(t,"Cursor");if(n.version!==void 0&&n.version!==1)throw new Error(`Unsupported existing Cursor hooks version: ${String(n.version)}`);let r=n.hooks;if(r!==void 0&&!d(r))throw new Error("Invalid existing Cursor hooks file: hooks must be an object.");let s=d(r)?{...r}:{};for(let[u,a]of J){let p=s[u];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing Cursor hooks file: hooks.${u} must be an array.`);let g=Array.isArray(p)?p.filter(y=>!ko(y)):[];s[u]=[...g,Si(u,o,a)]}let i={...n,version:1,hooks:s};if(JSON.stringify(n)===JSON.stringify(i))return{hooksFile:t,changed:!1,hookCount:J.length};N(t,i);let c=b(t,"Cursor");if(c.version!==1||!d(c.hooks))throw new Error("Cursor hooks were written but verification failed.");let l=0;for(let[u]of J){let a=c.hooks[u];if(!Array.isArray(a))throw new Error("Cursor hooks were written but verification failed.");l+=a.filter(ko).length}if(l!==J.length)throw new Error("Cursor hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:J.length}}function bo(e,t){return f(e)?(e.type===void 0||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function Ee(e={}){let t=e.configFile??W(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=O(t,"Cursor"),s=r.mcpServers;if(s!==void 0&&!f(s))throw new Error("Invalid existing Cursor MCP config: mcpServers must be an object.");let i=f(s)?{...s}:{};if(bo(i[n],o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};i[n]={type:"stdio",command:o,args:["mcp"]},R(t,{...r,mcpServers:i});let l=O(t,"Cursor").mcpServers;if(!f(l)||!bo(l[n],o))throw new Error("Cursor MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}import{mkdirSync as vi,readFileSync as jo,renameSync as xi,rmSync as Fi,writeFileSync as Ri}from"node:fs";import{dirname as Ni}from"node:path";var Te=`---
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
`;function Pi(e,t){vi(Ni(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Ri(o,t,{encoding:"utf8",mode:384}),xi(o,e)}finally{Fi(o,{force:!0})}}function Io(e){let t=e.ruleFile??lt(e.projectRoot);try{if(jo(t,"utf8")===Te)return{ruleFile:t,changed:!1}}catch{}if(Pi(t,Te),jo(t,"utf8")!==Te)throw new Error("Cursor ToolNet project rule was written but verification failed.");return{ruleFile:t,changed:!0}}import{spawnSync as Ei}from"node:child_process";import{existsSync as P,statSync as Ti}from"node:fs";import{dirname as Mi,join as Ai,parse as _i,resolve as Ae}from"node:path";function Co(e){let t=Ae(e);if(!P(t))throw new Error(`Project path does not exist: ${t}`);if(!Ti(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);return t}function le(e){return Ai(e,".toolnet","project.json")}function Hi(e){let t=Ae(e),o=_i(t).root;for(;;){if(P(le(t)))return t;if(t===o)return;let n=Mi(t);if(n===t)return;t=n}}function Me(e){let t=Ei("git",["rev-parse","--show-toplevel"],{cwd:e,encoding:"utf8",timeout:5e3});if(t.status!==0)return;let o=t.stdout.trim();return o?Ae(o):void 0}function j(e={}){let t=Co(e.cwd??process.cwd());if(e.project){let r=Co(e.project),s=le(r),i=Me(r);return{root:r,source:"explicit",eligible:!0,toolnetProject:P(s),manifestFile:P(s)?s:void 0,gitRoot:i}}let o=Hi(t);if(o){let r=le(o);return{root:o,source:"toolnet",eligible:!0,toolnetProject:!0,manifestFile:r,gitRoot:Me(o)}}let n=Me(t);if(n){let r=le(n);return{root:n,source:"git",eligible:!0,toolnetProject:P(r),manifestFile:P(r)?r:void 0,gitRoot:n}}return{root:t,source:"cwd",eligible:!1,toolnetProject:!1}}function vo(e,t={}){let o=[],n=e.indexOf("--scope");if(n>=0){let s=e[n+1];if(s!=="global"&&s!=="project"&&s!=="both")throw new Error(`Invalid --scope value: ${String(s)}`);o.push(s)}e.includes("--global")&&o.push("global"),e.includes("--both")&&o.push("both");let r=Array.from(new Set(o));if(r.length>1)throw new Error(`Conflicting integration scopes: ${r.join(", ")}`);return r[0]??t.defaultScope??"global"}function Oo(e,t){return{install:e,effective:t}}function I(e,t){return{surface:e,global:Oo(t.globalInstall,t.effective==="global"||t.effective==="both"),project:Oo(t.projectInstall,t.effective==="project"||t.effective==="both"),effective:t.effective,risk:t.risk??"none",dedupeRequired:t.dedupeRequired??!1,trustRequired:t.trustRequired??t.projectInstall,note:t.note}}function Di(e){return{mcp:I("mcp",{globalInstall:!0,projectInstall:!1,effective:"global"}),hooks:I("hooks",{globalInstall:!0,projectInstall:!1,effective:"global"}),work:I("work",{globalInstall:e==="grok",projectInstall:!1,effective:e==="grok"?"global":"none",note:e==="grok"?"Grok supports a global ToolNet continuity skill.":"Cursor/Copilot work instructions remain project-scoped."})}}function wo(e){return{mcp:I("mcp",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),hooks:I("hooks",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),work:I("work",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!1,note:e==="cursor"?"Use .cursor/rules/toolnet-memory.mdc.":e==="copilot"?"Use .github/instructions/toolnet-memory.instructions.md.":"Use .grok/skills/toolnet-continuity/SKILL.md."})}}function So(e){return{mcp:I("mcp",{globalInstall:!0,projectInstall:!0,effective:"project",risk:e==="cursor"?"precedence-unverified":"shadowed-global",trustRequired:!0,note:e==="cursor"?"Project ToolNet MCP is the intended effective definition; native same-name precedence must be E2E certified before release.":"Global remains useful outside the project; same-name project definition wins inside the project."}),hooks:I("hooks",{globalInstall:!0,projectInstall:!0,effective:"both",risk:"additive-duplicate",dedupeRequired:!0,trustRequired:!0,note:"Global and project hook sources can both execute for the same native event."}),work:I("work",{globalInstall:e==="grok",projectInstall:!0,effective:"project",risk:e==="grok"?"shadowed-global":"none",trustRequired:!1,note:e==="cursor"?"Project rule is authoritative.":e==="copilot"?"Project instruction is authoritative.":"Project skill shadows the same-name global skill inside the project."})}}function E(e){let{agent:t,scope:o,project:n}=e;return(o==="project"||o==="both")&&(!n||!n.eligible)?{agent:t,requestedScope:o,project:n,surfaces:o==="both"?So(t):wo(t),canInstall:!1,reason:"Project scope requires an explicit project, existing ToolNet project, or Git repository root."}:{agent:t,requestedScope:o,project:n,surfaces:o==="global"?Di(t):o==="project"?wo(t):So(t),canInstall:!0}}function xo(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.rule?.changed)}function Fo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=o==="global"?void 0:j({project:e.projectRoot}),r=E({agent:"cursor",scope:o,project:n});if(!r.canInstall)throw new Error(r.reason??"Cursor project integration scope cannot be resolved.");let s,i;if((r.surfaces.mcp.global.install||r.surfaces.hooks.global.install||r.surfaces.work.global.install)&&(s={},r.surfaces.mcp.global.install&&(s.mcp=Ee({binary:t,configFile:e.configFile??W()})),r.surfaces.hooks.global.install&&(s.hooks=Pe({binary:t,hooksFile:e.hooksFile??Y()}))),r.surfaces.mcp.project.install||r.surfaces.hooks.project.install||r.surfaces.work.project.install){if(!n?.eligible)throw new Error("Cursor project integration requires an eligible project root.");i={},r.surfaces.mcp.project.install&&(i.mcp=Ee({binary:t,configFile:e.projectConfigFile??st(n.root)})),r.surfaces.hooks.project.install&&(i.hooks=Pe({binary:t,hooksFile:e.projectHooksFile??ct(n.root)})),r.surfaces.work.project.install&&(i.rule=Io({projectRoot:n.root,ruleFile:e.projectRuleFile}))}let c=i?.mcp??s?.mcp,l=i?.hooks??s?.hooks;if(!c||!l)throw new Error("Cursor integration did not produce an effective MCP/hooks installation.");let u=Array.from(new Set([s?.mcp?.configFile,s?.hooks?.hooksFile,s?.rule?.ruleFile,i?.mcp?.configFile,i?.hooks?.hooksFile,i?.rule?.ruleFile].filter(a=>typeof a=="string")));return{installed:!0,changed:xo(s)||xo(i),scope:o,plan:r,project:n,global:s,projectScope:i,mcp:c,hooks:l,rule:i?.rule,files:u}}var $=[["sessionStart",10],["userPromptSubmitted",10],["userPromptTransformed",10],["preToolUse",10],["postToolUse",15],["agentStop",30]];function Ji(e){if(typeof e.command=="string")return e.command;if(typeof e.bash=="string")return e.bash}function Ro(e){return d(e)&&Ji(e)?.includes("session:copilot-hook")===!0}function $i(e,t,o){let n={type:"command",command:`${t} session:copilot-hook`,env:{TOOLNET_HOOK_EVENT:e},timeoutSec:o};return e==="preToolUse"&&(n.matcher=".*"),n}function _e(e={}){let t=e.hooksFile??X(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=b(t,"GitHub Copilot CLI");if(n.version!==void 0&&n.version!==1)throw new Error(`Unsupported existing GitHub Copilot CLI hooks version: ${String(n.version)}`);let r=n.hooks;if(r!==void 0&&!d(r))throw new Error("Invalid existing GitHub Copilot CLI hooks file: hooks must be an object.");let s=d(r)?{...r}:{};for(let[u,a]of $){let p=s[u];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing GitHub Copilot CLI hooks file: hooks.${u} must be an array.`);let g=Array.isArray(p)?p.filter(y=>!Ro(y)):[];s[u]=[...g,$i(u,o,a)]}let i={...n,version:1,hooks:s};if(JSON.stringify(n)===JSON.stringify(i))return{hooksFile:t,changed:!1,hookCount:$.length};N(t,i);let c=b(t,"GitHub Copilot CLI");if(c.version!==1||!d(c.hooks))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");let l=0;for(let[u]of $){let a=c.hooks[u];if(!Array.isArray(a))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");l+=a.filter(Ro).length}if(l!==$.length)throw new Error("GitHub Copilot CLI hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:$.length}}function No(e,t){return f(e)?(e.type===void 0||e.type==="local"||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&Array.isArray(e.tools)&&e.tools.length===1&&e.tools[0]==="*":!1}function He(e={}){let t=e.configFile??V(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=O(t,"GitHub Copilot CLI"),s=r.mcpServers;if(s!==void 0&&!f(s))throw new Error("Invalid existing GitHub Copilot CLI MCP config: mcpServers must be an object.");let i=f(s)?{...s}:{};if(No(i[n],o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};i[n]={type:"stdio",command:o,args:["mcp"],tools:["*"]},R(t,{...r,mcpServers:i});let l=O(t,"GitHub Copilot CLI").mcpServers;if(!f(l)||!No(l[n],o))throw new Error("GitHub Copilot CLI MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}import{mkdirSync as Gi,readFileSync as Po,renameSync as Li,rmSync as Ki,writeFileSync as Ui}from"node:fs";import{dirname as Bi}from"node:path";var De=`---
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
`;function qi(e,t){Gi(Bi(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Ui(o,t,{encoding:"utf8",mode:384}),Li(o,e)}finally{Ki(o,{force:!0})}}function Eo(e){let t=e.instructionFile??gt(e.projectRoot);try{if(Po(t,"utf8")===De)return{instructionFile:t,changed:!1}}catch{}if(qi(t,De),Po(t,"utf8")!==De)throw new Error("Copilot ToolNet project instruction verification failed.");return{instructionFile:t,changed:!0}}function To(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.instruction?.changed)}function Mo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=o==="global"?void 0:j({project:e.projectRoot}),r=E({agent:"copilot",scope:o,project:n});if(!r.canInstall)throw new Error(r.reason??"Copilot project integration scope cannot be resolved.");let s,i;if((r.surfaces.mcp.global.install||r.surfaces.hooks.global.install||r.surfaces.work.global.install)&&(s={},r.surfaces.mcp.global.install&&(s.mcp=He({binary:t,configFile:e.configFile??V()})),r.surfaces.hooks.global.install&&(s.hooks=_e({binary:t,hooksFile:e.hooksFile??X()}))),r.surfaces.mcp.project.install||r.surfaces.hooks.project.install||r.surfaces.work.project.install){if(!n?.eligible)throw new Error("Copilot project integration requires an eligible project root.");i={},r.surfaces.mcp.project.install&&(i.mcp=He({binary:t,configFile:e.projectConfigFile??ut(n.root)})),r.surfaces.hooks.project.install&&(i.hooks=_e({binary:t,hooksFile:e.projectHooksFile??pt(n.root)})),r.surfaces.work.project.install&&(i.instruction=Eo({projectRoot:n.root,instructionFile:e.projectInstructionFile}))}let c=i?.mcp??s?.mcp,l=i?.hooks??s?.hooks;if(!c||!l)throw new Error("Copilot integration did not produce effective MCP/hooks.");let u=Array.from(new Set([s?.mcp?.configFile,s?.hooks?.hooksFile,s?.instruction?.instructionFile,i?.mcp?.configFile,i?.hooks?.hooksFile,i?.instruction?.instructionFile].filter(a=>typeof a=="string")));return{installed:!0,changed:To(s)||To(i),scope:o,plan:r,project:n,global:s,projectScope:i,mcp:c,hooks:l,instruction:i?.instruction,files:u}}import{existsSync as Wi,mkdirSync as Yi,readFileSync as Ao,renameSync as Vi,rmSync as Xi,writeFileSync as zi}from"node:fs";import{dirname as Qi}from"node:path";var Je=`---
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
`;function Zi(e,t){Yi(Qi(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{zi(o,t,{encoding:"utf8",mode:384}),Vi(o,e)}finally{Xi(o,{force:!0})}}function $e(e={}){let t=e.skillFile??ee();if(Wi(t)&&Ao(t,"utf8")===Je)return{skillFile:t,changed:!1};if(Zi(t,Je),Ao(t,"utf8")!==Je)throw new Error("Grok ToolNet continuity skill was written but verification failed.");return{skillFile:t,changed:!0}}var G=[["SessionStart",10],["UserPromptSubmit",10],["PreToolUse",10],["PostToolUse",15],["Stop",30]];function _o(e){return!d(e)||!Array.isArray(e.hooks)?!1:e.hooks.some(t=>d(t)&&typeof t.command=="string"&&t.command.includes("session:grok-hook"))}function es(e,t,o){let n={hooks:[{type:"command",command:`${t} session:grok-hook`,timeout:o,env:{TOOLNET_HOOK_EVENT:e}}]};return e==="PreToolUse"&&(n.matcher=".*"),n}function Ge(e={}){let t=e.hooksFile??Z(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=b(t,"Grok Build"),r=n.hooks;if(r!==void 0&&!d(r))throw new Error("Invalid existing Grok Build hooks file: hooks must be an object.");let s=d(r)?{...r}:{};for(let[u,a]of G){let p=s[u];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing Grok Build hooks file: hooks.${u} must be an array.`);let g=Array.isArray(p)?p.filter(y=>!_o(y)):[];s[u]=[...g,es(u,o,a)]}let i={...n,hooks:s};if(JSON.stringify(n)===JSON.stringify(i))return{hooksFile:t,changed:!1,hookCount:G.length};N(t,i);let c=b(t,"Grok Build");if(!d(c.hooks))throw new Error("Grok Build hooks were written but verification failed.");let l=0;for(let[u]of G){let a=c.hooks[u];if(!Array.isArray(a))throw new Error("Grok Build hooks were written but verification failed.");l+=a.filter(_o).length}if(l!==G.length)throw new Error("Grok Build hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:G.length}}import{existsSync as ts,mkdirSync as os,readFileSync as ns,renameSync as rs,rmSync as is,writeFileSync as ss}from"node:fs";import{dirname as cs}from"node:path";function Ho(e){return ts(e)?ns(e,"utf8"):""}function ls(e,t){os(cs(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{ss(o,t,{encoding:"utf8",mode:384}),rs(o,e)}finally{is(o,{force:!0})}}function Le(e){return e.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t")}function as(e){return`[mcp_servers."${Le(e)}"]`}function us(e,t){return[as(e),`command = "${Le(t)}"`,'args = ["mcp"]',"enabled = true"].join(`
`)}function ps(e){let t=e.trim();return t.startsWith("[")&&t.includes("]")}function ae(e){return e.trim().replace(/\s+/g,"")}function gs(e){return new Set([ae(`[mcp_servers.${e}]`),ae(`[mcp_servers."${e}"]`),ae(`[mcp_servers.'${e}']`)])}function Jo(e,t){let o=e.split(/\r?\n/),n=gs(t),r=-1;for(let a=0;a<o.length;a+=1){let p=ae(o[a].replace(/\s+#.*$/,""));if(n.has(p)){r=a;break}}if(r<0)return null;let s=o.length;for(let a=r+1;a<o.length;a+=1)if(ps(o[a])){s=a;break}let i=[],c=0;for(let a of o)i.push(c),c+=a.length+1;let l=i[r]??0,u=s>=o.length?e.length:i[s]??e.length;return{start:l,end:u}}function ds(e,t,o){let n=`${us(t,o)}
`,r=Jo(e,t);if(r){let s=e.slice(0,r.start),i=e.slice(r.end);return`${s}${n}${i.replace(/^\n+/,"")}`}return e.trim()?`${e.replace(/\s*$/,"")}

${n}`:n}function Do(e,t,o){let n=Jo(e,t);if(!n)return!1;let r=e.slice(n.start,n.end);return r.includes(`command = "${Le(o)}"`)&&/args\s*=\s*\[\s*"mcp"\s*\]/.test(r)&&/enabled\s*=\s*true/.test(r)}function Ke(e={}){let t=e.configFile??Q(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=Ho(t);if(Do(r,n,o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};let s=ds(r,n,o);ls(t,s);let i=Ho(t);if(!Do(i,n,o))throw new Error("Grok Build MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}function $o(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.skill?.changed)}function Go(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=o==="global"?void 0:j({project:e.projectRoot}),r=E({agent:"grok",scope:o,project:n});if(!r.canInstall)throw new Error(r.reason??"Grok project integration scope cannot be resolved.");let s,i;if((r.surfaces.mcp.global.install||r.surfaces.hooks.global.install||r.surfaces.work.global.install)&&(s={},r.surfaces.mcp.global.install&&(s.mcp=Ke({binary:t,configFile:e.configFile??Q()})),r.surfaces.hooks.global.install&&(s.hooks=Ge({binary:t,hooksFile:e.hooksFile??Z()})),r.surfaces.work.global.install&&(s.skill=$e({skillFile:e.skillFile??ee()}))),r.surfaces.mcp.project.install||r.surfaces.hooks.project.install||r.surfaces.work.project.install){if(!n?.eligible)throw new Error("Grok project integration requires an eligible project root.");i={},r.surfaces.mcp.project.install&&(i.mcp=Ke({binary:t,configFile:e.projectConfigFile??ft(n.root)})),r.surfaces.hooks.project.install&&(i.hooks=Ge({binary:t,hooksFile:e.projectHooksFile??mt(n.root)})),r.surfaces.work.project.install&&(i.skill=$e({skillFile:e.projectSkillFile??yt(n.root)}))}let c=i?.mcp??s?.mcp,l=i?.hooks??s?.hooks,u=i?.skill??s?.skill;if(!c||!l||!u)throw new Error("Grok integration did not produce effective MCP/hooks/skill.");let a=Array.from(new Set([s?.mcp?.configFile,s?.hooks?.hooksFile,s?.skill?.skillFile,i?.mcp?.configFile,i?.hooks?.hooksFile,i?.skill?.skillFile].filter(p=>typeof p=="string")));return{installed:!0,changed:$o(s)||$o(i),scope:o,plan:r,project:n,global:s,projectScope:i,mcp:c,hooks:l,skill:u,files:a}}function Lo(e={}){if(e.scope==="global")return{scope:"global",automatic:!1,reason:"explicit-global"};if(e.scope==="project"||e.scope==="both"){let o=j({cwd:e.cwd,project:e.projectRoot});if(!o.eligible)throw new Error(`Explicit ${e.scope} integration requires an explicit project, ToolNet project, or Git repository root.`);return{scope:e.scope,automatic:!1,project:o,reason:e.scope==="project"?"explicit-project":"explicit-both"}}let t=j({cwd:e.cwd,project:e.projectRoot});return t.toolnetProject?{scope:"both",automatic:!0,project:t,reason:"toolnet-project"}:{scope:"global",automatic:!0,reason:"no-toolnet-project"}}function Ko(){return jt()}function fs(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[],n=e.detections??Ko(),r=new Map(n.map(i=>[i.agent,i.detected])),s=Lo({scope:e.scope,projectRoot:e.projectRoot,cwd:e.cwd});if(!(e.force===!0||r.get("agy")===!0))o.push({agent:"agy",detected:!1,installed:!1,targets:[]});else try{let c=xt({binary:t});o.push({agent:"agy",detected:!0,installed:!0,targets:c.files})}catch(c){o.push({agent:"agy",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("opencode")===!0))o.push({agent:"opencode",detected:!1,installed:!1,targets:[]});else try{let c=Tt({binary:t}),l=Dt({binary:t});o.push({agent:"opencode",detected:!0,installed:!0,targets:[...c,l.configFile,`mcp:${l.serverName}`]})}catch(c){o.push({agent:"opencode",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("claude")===!0))o.push({agent:"claude",detected:!1,installed:!1,targets:[]});else try{let c=ro({binary:t});o.push({agent:"claude",detected:!0,installed:!0,targets:[c.hooks.settingsFile,c.mcp.configFile,`mcp:${c.mcp.serverName}`]})}catch(c){o.push({agent:"claude",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("kiro")===!0))o.push({agent:"kiro",detected:!1,installed:!1,targets:[]});else try{let c=go({...e.kiro??{},binary:t});o.push({agent:"kiro",detected:!0,installed:!0,targets:[c.mcp.configFile,`mcp:${c.mcp.serverName}`,c.hooks.hooksFile]})}catch(c){o.push({agent:"kiro",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("cursor")===!0))o.push({agent:"cursor",detected:!1,installed:!1,targets:[]});else try{let c=e.cursor??{},l=Fo({...c,binary:t,scope:c.scope??s.scope,projectRoot:c.projectRoot??s.project?.root});o.push({agent:"cursor",detected:!0,installed:!0,scope:l.scope,projectRoot:l.project?.root,targets:[...l.files,`mcp:${l.mcp.serverName}`]})}catch(c){o.push({agent:"cursor",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("copilot")===!0))o.push({agent:"copilot",detected:!1,installed:!1,targets:[]});else try{let c=e.copilot??{},l=Mo({...c,binary:t,scope:c.scope??s.scope,projectRoot:c.projectRoot??s.project?.root});o.push({agent:"copilot",detected:!0,installed:!0,scope:l.scope,projectRoot:l.project?.root,targets:[...l.files,`mcp:${l.mcp.serverName}`]})}catch(c){o.push({agent:"copilot",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("grok")===!0))o.push({agent:"grok",detected:!1,installed:!1,targets:[]});else try{let c=e.grok??{},l=Go({...c,binary:t,scope:c.scope??s.scope,projectRoot:c.projectRoot??s.project?.root});o.push({agent:"grok",detected:!0,installed:!0,scope:l.scope,projectRoot:l.project?.root,targets:[...l.files,`mcp:${l.mcp.serverName}`]})}catch(c){o.push({agent:"grok",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("toolnet-cli")===!0))o.push({agent:"toolnet-cli",detected:!1,installed:!1,targets:[]});else try{let c=e.toolnetCli??{},l=mo({...c,binary:t});o.push({agent:"toolnet-cli",detected:!0,installed:!0,targets:[l.mcp.configFile]})}catch(c){o.push({agent:"toolnet-cli",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("kilo")===!0))o.push({agent:"kilo",detected:!1,installed:!1,targets:[]});else try{let c=e.kilo??{},l=ho({...c,binary:t});o.push({agent:"kilo",detected:!0,installed:!0,targets:[l.mcp.configFile]})}catch(c){o.push({agent:"kilo",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("codex")===!0))o.push({agent:"codex",detected:!1,installed:!1,targets:[]});else try{let c=Kt({binary:t}),l=Bt({binary:t}),u=Xt({binary:t}),a=Zt({binary:t});if(!a.installed)throw new Error(a.error??"Codex MCP registration failed");let p=[c.configFile,l,u.hooksFile,`mcp:${a.serverName}`];c.preservedPrevious&&p.push(c.previousFile),o.push({agent:"codex",detected:!0,installed:!0,targets:p})}catch(c){o.push({agent:"codex",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}return o}function Uo(e){switch(e){case"agy":return"Agy / Antigravity";case"opencode":return"OpenCode";case"claude":return"Claude Code";case"kiro":return"Kiro CLI";case"cursor":return"Cursor CLI";case"copilot":return"GitHub Copilot CLI";case"grok":return"Grok Build";case"toolnet-cli":return"ToolNet CLI";case"kilo":return"Kilo";case"codex":return"Codex";default:return e}}function ms(e){console.log(""),console.log("ToolNet Memory Integration Detection"),console.log("===================================="),console.log("");for(let t of e){let o=Uo(t.agent);if(!t.detected){console.log(`\u25CB ${o}: not detected`);continue}console.log(`\u2713 ${o}: detected`);for(let n of t.evidence)console.log(`  ${n}`)}console.log("")}var ys=["claude","cursor","copilot","grok","kiro","opencode","codex","agy"],hs={opencode:"toolnet-memory session:opencode-sync",codex:"toolnet-memory session:codex-sync",agy:"toolnet-memory session:agy-sync","toolnet-cli":"toolnet-memory session:toolnet-cli-sync"};function ks(e){if(ys.includes(e))return"ToolNet integration configured; hooks installed successfully";let t=hs[e];return t?`ToolNet integration configured; run ${t} to capture session history`:"ToolNet integration configured; capture begins when a supported hook or sync runs"}function bs(e){console.log(""),console.log("ToolNet Memory AI Integrations"),console.log("=============================="),console.log("");for(let t of e){let o=Uo(t.agent);if(!t.detected){console.log(`- ${o}: not detected`);continue}if(t.installed){let n=t.scope?` [scope=${t.scope}]`:"";console.log(`\u2713 ${o}: ${ks(t.agent)}${n}`),t.projectRoot&&console.log(`  project: ${t.projectRoot}`);continue}console.log(`\u2717 ${o}: integration failed`),t.error&&console.log(`  ${t.error}`)}console.log("")}function js(e,t){let o=e.indexOf(t);return o>=0?e[o+1]:void 0}function Is(e){return e.includes("--scope")||e.includes("--global")||e.includes("--both")?vo(e):void 0}async function Cs(){let e=process.argv.slice(2),t=e.includes("--all"),o=e.includes("--json"),n=e.includes("--detect-only"),r=Is(e),s=js(e,"--project");if(n){let c=Ko();if(o){console.log(JSON.stringify(c,null,2));return}ms(c);return}let i=fs({force:t,scope:r,projectRoot:s});if(o){console.log(JSON.stringify(i,null,2));return}bs(i)}var Os=process.argv[1]&&(process.argv[1].endsWith("auto-integrate.js")||process.argv[1].endsWith("auto-integrate.ts"));Os&&Cs().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});export{Ko as detectAutoIntegrations,fs as installAutoIntegrations,Uo as integrationDisplayName};
