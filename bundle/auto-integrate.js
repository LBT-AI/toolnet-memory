import{existsSync as oo}from"node:fs";import{homedir as $i}from"node:os";import{join as I}from"node:path";import{spawnSync as _i}from"node:child_process";import{homedir as ni}from"node:os";import{join as A}from"node:path";function mt(e={}){return A(e.home??ni(),".gemini")}function yt(e={}){return A(mt(e),"antigravity-cli")}function ht(e={}){return A(mt(e),"config")}function Q(e={}){return A(ht(e),"mcp_config.json")}function Y(e={}){let t=e.cwd??process.cwd();return A(t,".agents","mcp_config.json")}function V(e="toolnet-memory",t={}){return A(yt(t),"plugins",e)}function kt(e={}){return[yt(e),Q(e),ht(e),Y(e)]}import{homedir as bt}from"node:os";import{join as E}from"node:path";function T(e={}){let t=process.env.OPENCODE_CONFIG_DIR?.trim();if(t)return t;let o=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return o?E(o,"opencode"):E(e.home??bt(),".config","opencode")}function Oe(e={}){let t=process.env.OPENCODE_CONFIG?.trim();if(t)return t;let o=e.home??bt(),n=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return n?E(n,"opencode","opencode.json"):E(o,".config","opencode","opencode.json")}function Ce(e={}){let t=e.cwd??process.cwd();return E(t,"opencode.json")}function It(e={}){return E(T(e),"plugins")}function St(e={}){return E(T(e),"AGENTS.md")}import{homedir as Ot}from"node:os";import{join as we}from"node:path";function je(e={}){return we(e.home??Ot(),".claude")}function Ct(e={}){return we(je(e),"settings.json")}function wt(e={}){return we(e.home??Ot(),".claude.json")}import{homedir as ri}from"node:os";import{join as P}from"node:path";function ve(e={}){return e.kiroHome??process.env.KIRO_HOME??P(e.home??ri(),".kiro")}function ii(e={}){return P(ve(e),"settings")}function X(e={}){return P(ii(e),"mcp.json")}function xe(e={}){let t=e.cwd??process.cwd();return P(t,".kiro","settings","mcp.json")}function si(e={}){return P(ve(e),"hooks")}function Fe(e={}){return P(si(e),"toolnet-memory.json")}function Re(e={}){let t=e.cwd??process.cwd();return P(t,".kiro","hooks","toolnet-memory.json")}function jt(e={}){return[ve(e),X(e)]}import{homedir as ci}from"node:os";import{join as Ee}from"node:path";function vt(e={}){return Ee(e.home??ci(),".toolnetcli")}function ai(e={}){return Ee(vt(e),"config.json")}function xt(e={}){let t=e.cwd??process.cwd();return Ee(t,".toolnet","mcp.json")}function Ft(e={}){let t=vt(e),o=ai(e);return[t,o]}import{homedir as li}from"node:os";import{join as Pe}from"node:path";function Rt(e={}){if(e.kiloHome)return e.kiloHome;if(process.env.KILO_HOME)return process.env.KILO_HOME;let t=e.xdgConfigHome??process.env.XDG_CONFIG_HOME;return t?Pe(t,"kilo"):Pe(e.home??li(),".config","kilo")}function Ne(e={}){return Pe(Rt(e),"kilo.jsonc")}function Et(e={}){let t=Rt(e),o=Ne(e);return[t,o]}import{homedir as ui}from"node:os";import{join as v,resolve as di}from"node:path";function z(e={}){return e.cursorHome??v(e.home??ui(),".cursor")}function pi(e={}){return e.cursorConfigDir??process.env.CURSOR_CONFIG_DIR??(e.xdgConfigHome??process.env.XDG_CONFIG_HOME?v(e.xdgConfigHome??process.env.XDG_CONFIG_HOME,"cursor"):void 0)??z(e)}function Z(e={}){return v(z(e),"mcp.json")}function ee(e={}){return v(z(e),"hooks.json")}function Ae(e){return v(di(e),".cursor")}function Pt(e){return v(Ae(e),"mcp.json")}function Nt(e){return v(Ae(e),"hooks.json")}function gi(e){return v(Ae(e),"rules")}function At(e){return v(gi(e),"toolnet-memory.mdc")}function Tt(e={}){return Array.from(new Set([z(e),pi(e)]))}import{homedir as fi}from"node:os";import{join as w,resolve as mi}from"node:path";function Te(e={}){return e.copilotHome??process.env.COPILOT_HOME??w(e.home??fi(),".copilot")}function te(e={}){return w(Te(e),"mcp-config.json")}function yi(e={}){return w(Te(e),"hooks")}function oe(e={}){return w(yi(e),"toolnet-memory.json")}function Me(e){return w(mi(e),".github")}function Mt(e){return w(Me(e),"mcp.json")}function hi(e){return w(Me(e),"hooks")}function Ht(e){return w(hi(e),"toolnet-memory.json")}function ki(e){return w(Me(e),"instructions")}function Jt(e){return w(ki(e),"toolnet-memory.instructions.md")}function Dt(e={}){return[Te(e)]}import{homedir as bi}from"node:os";import{join as S,resolve as Ii}from"node:path";function ne(e={}){return e.grokHome??process.env.GROK_HOME??S(e.home??bi(),".grok")}function re(e={}){return S(ne(e),"config.toml")}function Si(e={}){return S(ne(e),"hooks")}function ie(e={}){return S(Si(e),"toolnet-memory.json")}function Oi(e={}){return S(ne(e),"skills")}function Ci(e={}){return S(Oi(e),"toolnet-continuity")}function se(e={}){return S(Ci(e),"SKILL.md")}function He(e){return S(Ii(e),".grok")}function $t(e){return S(He(e),"config.toml")}function wi(e){return S(He(e),"hooks")}function _t(e){return S(wi(e),"toolnet-memory.json")}function ji(e){return S(He(e),"skills")}function vi(e){return S(ji(e),"toolnet-continuity")}function Gt(e){return S(vi(e),"SKILL.md")}function Lt(e={}){return[ne(e)]}import{homedir as xi}from"node:os";import{join as qt}from"node:path";function Fi(e={}){return qt(e.home??xi(),".gemini")}function Je(e={}){return qt(Fi(e),"settings.json")}function Kt(e={}){return[Je(e)]}import{homedir as Ri}from"node:os";import{join as Bt}from"node:path";function Ei(e={}){return Bt(e.home??Ri(),".junie")}function De(e={}){return Bt(Ei(e),"config.json")}function Ut(e={}){return[De(e)]}import{homedir as Wt}from"node:os";import{join as $e,resolve as Pi}from"node:path";function Ni(e={}){let t=process.env.CODEBUFF_CONFIG_DIR;return t&&t.trim()?Pi(t):$e(e.home??Wt(),".config","manicode")}function Qt(e={}){return $e(e.cwd??process.cwd(),".agents","mcp.json")}function Ai(e={}){return $e(e.home??Wt(),".agents","mcp.json")}function Yt(e={}){return[Ni(e),Ai(e)]}import{homedir as Vt}from"node:os";import{join as _e,resolve as Ti}from"node:path";function Mi(e={}){let t=process.env.FREEBUFF_CONFIG_DIR;return t&&t.trim()?Ti(t):_e(e.home??Vt(),".config","manicode")}function Xt(e={}){return _e(e.cwd??process.cwd(),".agents","mcp.json")}function Hi(e={}){return _e(e.home??Vt(),".agents","mcp.json")}function zt(e={}){return[Mi(e),Hi(e)]}import{homedir as Ji}from"node:os";import{join as Ge}from"node:path";function Le(e={}){return Ge(e.home??Ji(),".continue")}function Di(e={}){return Ge(Le(e),"config.yaml")}function Zt(e={}){return Ge(Le(e),"sessions")}function eo(e={}){return[Le(e),Di(e)]}function Gi(e){return _i("sh",["-lc",`command -v ${JSON.stringify(e)} >/dev/null 2>&1`],{stdio:"ignore"}).status===0}function f(e){let t=e.commandExists(e.command),o=e.configPaths.filter(c=>oo(c)),n=o.length>0,i=[];t&&i.push(`command:${e.command}`);for(let c of o)i.push(`config:${c}`);return{agent:e.agent,detected:t||n,commandDetected:t,configDetected:n,evidence:i}}function to(e){let t=e.commands.filter(s=>e.commandExists(s)),o=e.configPaths.filter(s=>oo(s)),n=t.length>0,i=o.length>0,c=[...t.map(s=>`command:${s}`),...o.map(s=>`config:${s}`)];return{agent:e.agent,detected:n||i,commandDetected:n,configDetected:i,evidence:c}}function no(e={}){let t=e.home??$i(),o=e.commandExists??Gi,n=e.codexHome??process.env.CODEX_HOME??I(t,".codex");return[f({agent:"agy",command:"agy",commandExists:o,configPaths:kt({home:t})}),f({agent:"gemini",command:"gemini",commandExists:o,configPaths:Kt({home:t})}),f({agent:"junie",command:"junie",commandExists:o,configPaths:Ut({home:t})}),f({agent:"codebuff",command:"codebuff",commandExists:o,configPaths:Yt({home:t})}),f({agent:"freebuff",command:"freebuff",commandExists:o,configPaths:zt({home:t})}),f({agent:"continue",command:"cn",commandExists:o,configPaths:eo({home:t})}),f({agent:"opencode",command:"opencode",commandExists:o,configPaths:[T({home:t,xdgConfigHome:e.xdgConfigHome})]}),f({agent:"claude",command:"claude",commandExists:o,configPaths:[je({home:t})]}),f({agent:"kiro",command:"kiro-cli",commandExists:o,configPaths:jt({home:t,kiroHome:e.kiroHome})}),to({agent:"cursor",commands:["agent","cursor-agent"],commandExists:o,configPaths:Tt({home:t,cursorHome:e.cursorHome,cursorConfigDir:e.cursorConfigDir,xdgConfigHome:e.xdgConfigHome})}),f({agent:"copilot",command:"copilot",commandExists:o,configPaths:Dt({home:t,copilotHome:e.copilotHome})}),f({agent:"grok",command:"grok",commandExists:o,configPaths:Lt({home:t,grokHome:e.grokHome})}),f({agent:"toolnet-cli",command:"toolnet",commandExists:o,configPaths:Ft({home:t})}),to({agent:"kilo",commands:["kilo","kilo-code"],commandExists:o,configPaths:Et({home:t,kiloHome:e.kiloHome})}),f({agent:"codex",command:"codex",commandExists:o,configPaths:[n]}),f({agent:"goose",command:"goose",commandExists:o,configPaths:[I(t,".agents","plugins")]}),f({agent:"qwen",command:"qwen",commandExists:o,configPaths:[I(t,".qwen")]}),f({agent:"kimi",command:"kimi-code",commandExists:o,configPaths:[I(t,".kimi-code")]}),f({agent:"hermes",command:"hermes",commandExists:o,configPaths:[I(t,".hermes")]}),f({agent:"qoder",command:"qoder",commandExists:o,configPaths:[I(t,".qoder-cn"),I(t,".qoder")]}),f({agent:"aider",command:"aider",commandExists:o,configPaths:[I(t,".aider")]}),f({agent:"plandex",command:"plandex",commandExists:o,configPaths:[I(t,".plandex"),I(t,"plandex-server")]}),f({agent:"openrouter",command:"openrouter",commandExists:o,configPaths:[I(t,".openrouter")]}),f({agent:"bob",command:"bob",commandExists:o,configPaths:[I(t,".bob")]}),f({agent:"cline",command:"cline",commandExists:o,configPaths:[I(t,".cline")]}),f({agent:"rovo",command:"rovo",commandExists:o,configPaths:[I(t,".rovodev"),I(t,".rovo")]}),f({agent:"warp",command:"warp",commandExists:o,configPaths:[I(t,".warp")]})]}import{existsSync as ss,mkdirSync as lo,readFileSync as cs,renameSync as as,writeFileSync as ls}from"node:fs";import{dirname as us,join as ae}from"node:path";import{existsSync as Li,mkdirSync as qi,readFileSync as Ki,renameSync as Bi,rmSync as Ui,writeFileSync as Wi}from"node:fs";import{dirname as Qi,join as Yi}from"node:path";function Vi(e){return`'${e.replace(/'/g,"'\\''")}'`}function Xi(e){if(!Li(e))return{};let t;try{t=JSON.parse(Ki(e,"utf8"))}catch{throw new Error(`Invalid existing Agy hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Agy hooks.json at ${e}: root must be a JSON object.`);return t}function zi(e,t){qi(Qi(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Wi(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Bi(o,e)}finally{Ui(o,{force:!0})}}function ro(e={}){let t=e.pluginName??"toolnet-memory",o=e.hooksFile??Yi(V(t),"hooks.json"),n=Xi(o),i=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",c=`${Vi(i)} session:agy-hook`;return n["toolnet-memory"]={enabled:!0,PreToolUse:[{matcher:"view_file|list_dir|find_by_name|grep_search|run_command",hooks:[{type:"command",command:`${c} pre-tool`,timeout:5}]}],PreInvocation:[{type:"command",command:`${c} pre`,timeout:15}],PostInvocation:[{type:"command",command:`${c} post`,timeout:15}],Stop:[{type:"command",command:`${c} stop`,timeout:30}]},zi(o,n),o}import{existsSync as Zi,mkdirSync as es,readFileSync as ts,renameSync as os,writeFileSync as ns}from"node:fs";import{dirname as rs}from"node:path";function $(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function is(e,t){es(rs(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;ns(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),os(o,e)}function io(e){if(!Zi(e))return{};let t=ts(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Agy MCP config at ${e}: parse error. Not overwriting.`)}if(!$(o))throw new Error(`Invalid existing Agy MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function so(e,t){return $(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function ce(e,t,o,n){let i=io(e),c=i.mcpServers;if(c!==void 0&&!$(c))throw new Error(`Invalid existing Agy MCP config: mcpServers must be an object in ${e}.`);let s=$(c)?{...c}:{},r=s[o];if(so(r,t)&&!n)return{installed:!0,changed:!1};s[o]={command:t,args:["mcp"]};let a={...i,mcpServers:s};is(e,a);let u=io(e).mcpServers;if(!$(u)||!so(u[o],t))throw new Error(`Agy MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function co(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",n=e.scope??"global";if(e.configFile)return{...ce(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(n==="both"){let s=Q(),r=Y({cwd:e.cwd}),a=ce(s,t,o,e.force??!1),l=ce(r,t,o,e.force??!1);return{installed:!0,changed:a.changed||l.changed,configFile:s,serverName:o,command:t,args:["mcp"]}}let i=n==="workspace"?Y({cwd:e.cwd}):Q();return{...ce(i,t,o,e.force??!1),configFile:i,serverName:o,command:t,args:["mcp"]}}var ds=`# ToolNet Memory Continuity

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
`;function ps(e,t){lo(us(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;ls(o,t,{encoding:"utf8",mode:384}),as(o,e)}function ao(e,t){ss(e)&&cs(e,"utf8")===t||ps(e,t)}function uo(e={}){let t=e.pluginName??"toolnet-memory",o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.pluginRoot??V(t),i=ae(n,"plugin.json"),c=ae(n,"mcp_config.json"),s=ae(n,"hooks.json"),r=ae(n,"rules","toolnet-memory-continuity.md");return lo(n,{recursive:!0,mode:448}),ao(i,`${JSON.stringify({$schema:"https://antigravity.google/schemas/v1/plugin.json",name:t,description:"Persistent project continuity and memory for Antigravity coding sessions."},null,2)}
`),co({configFile:c,binary:o,serverName:"toolnet-memory",force:e.force}),ro({hooksFile:s,binary:o,pluginName:t}),ao(r,`${ds.trim()}
`),{installed:!0,pluginRoot:n,files:[i,c,s,r]}}import{existsSync as fs,mkdirSync as mo,readFileSync as ms,writeFileSync as yo}from"node:fs";import{join as go}from"node:path";var gs="memory_agent_ask";function po(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${gs}

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
`.trim()}var fo="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",qe="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function ys(e={}){let t=St();mo(T(),{recursive:!0});let o=`${fo}
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


${po()}

${qe}`,n=fs(t)?ms(t,"utf8"):"",i=n.indexOf(fo),c=n.indexOf(qe);return i>=0&&c>=i?n=n.slice(0,i)+o+n.slice(c+qe.length):(n=n.trimEnd(),n&&(n+=`

`),n+=o),yo(t,n.trimEnd()+`
`,{encoding:"utf8",mode:384}),t}function ho(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[];o.push(ys({cwd:e.cwd}));let n=e.scope??"global",i=[];if((n==="global"||n==="both")&&i.push(e.directory??It()),n==="project"||n==="both"){let c=e.cwd??process.cwd();i.push(go(c,".opencode","plugins"))}for(let c of i){mo(c,{recursive:!0});let s=go(c,"toolnet-memory.js"),r=`
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
`;yo(s,r.trimStart(),{encoding:"utf8",mode:384}),o.push(s)}return o}import{existsSync as Io,mkdirSync as hs,readFileSync as ks,renameSync as bs,writeFileSync as Is}from"node:fs";import{dirname as So,join as Ss}from"node:path";function _(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Os(e,t){hs(So(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;Is(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),bs(o,e)}function ko(e){if(!Io(e))return{};let t=ks(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing OpenCode config at ${e}: parse error. Not overwriting.`)}if(!_(o))throw new Error(`Invalid existing OpenCode config at ${e}: root must be a JSON object. Not overwriting.`);return o}function bo(e,t){if(!_(e))return!1;let o=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(o)&&o.length===2&&o[0]===t&&o[1]==="mcp"}function le(e,t,o,n){let i=Ss(So(e),"opencode.jsonc"),c=Io(i)?i:void 0,s=ko(e),r=s.mcp;if(r!==void 0&&!_(r))throw new Error(`Invalid existing OpenCode config: mcp must be an object in ${e}.`);let a=_(r)?{...r}:{},l=a[o];if(bo(l,t)&&!n)return{installed:!0,changed:!1,preservedJsonc:c};a[o]={type:"local",command:[t,"mcp"],enabled:!0};let u={...s,mcp:a};Os(e,u);let p=ko(e);if(!_(p.mcp)||!bo(p.mcp[o],t))throw new Error(`OpenCode MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0,preservedJsonc:c}}function Oo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",n=e.scope??"global";if(e.configFile)return{...le(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:[t,"mcp"]};if(n==="both"){let s=Oe(),r=Ce({cwd:e.cwd}),a=le(s,t,o,e.force??!1),l=le(r,t,o,e.force??!1);return{installed:!0,changed:a.changed||l.changed,configFile:s,serverName:o,command:[t,"mcp"],preservedJsonc:a.preservedJsonc??l.preservedJsonc}}let i=n==="project"?Ce({cwd:e.cwd}):Oe();return{...le(i,t,o,e.force??!1),configFile:i,serverName:o,command:[t,"mcp"]}}import{existsSync as Cs,mkdirSync as Co,readFileSync as ws,writeFileSync as wo}from"node:fs";import{homedir as jo}from"node:os";import{dirname as vo,join as Ke}from"node:path";function js(e){let t=[],o=/"((?:\\.|[^"\\])*)"|'([^']*)'/g,n;for(;n=o.exec(e);){let i=n[1]??n[2]??"";try{t.push(n[1]!==void 0?JSON.parse(`"${i}"`):i)}catch{t.push(i)}}return t}function xo(e={}){let t=e.configFile??Ke(process.env.CODEX_HOME??Ke(jo(),".codex"),"config.toml"),o=e.previousFile??Ke(jo(),".config","toolnet-memory","codex-notify-previous.json");Co(vo(t),{recursive:!0}),Co(vo(o),{recursive:!0});let n=Cs(t)?ws(t,"utf8"):"",i=e.binary??"toolnet-memory",c=`notify = [${JSON.stringify(i)}, "session:codex-notify"]`,s=n.split(`
`),r=s.findIndex(d=>/^\s*\[/.test(d));r<0&&(r=s.length);let a=-1,l=-1;for(let d=0;d<r;d+=1)if(/^\s*notify\s*=/.test(s[d])){if(a=d,l=d,s[d].includes("[")&&!s[d].includes("]"))for(;l+1<r&&(l+=1,!s[l].includes("]")););break}let u=[];if(a>=0){let d=s.slice(a,l+1).join(`
`);u=js(d),s.splice(a,l-a+1,c)}else r=s.findIndex(d=>/^\s*\[/.test(d)),r<0&&(r=s.length),s.splice(r,0,c);let p=u.length>=2&&u[u.length-1]==="session:codex-notify";return u.length>0&&!p&&wo(o,JSON.stringify(u,null,2)+`
`,{encoding:"utf8",mode:384}),n=s.join(`
`),n.endsWith(`
`)||(n+=`
`),wo(t,n,{encoding:"utf8",mode:384}),{configFile:t,previousFile:o,preservedPrevious:u.length>0&&!p}}import{existsSync as vs,mkdirSync as xs,readFileSync as Fs,writeFileSync as Rs}from"node:fs";import{homedir as Es}from"node:os";import{dirname as Ps,join as Fo}from"node:path";function Ns(e){return`'${e.replace(/'/g,"'\\''")}'`}function Ro(e={}){let t=e.hooksFile??Fo(process.env.CODEX_HOME??Fo(Es(),".codex"),"hooks.json");xs(Ps(t),{recursive:!0});let o={};if(vs(t))try{o=JSON.parse(Fs(t,"utf8"))}catch(r){throw new Error(`Invalid existing Codex hooks.json: ${r instanceof Error?r.message:String(r)}`)}let n=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=n;let c=(Array.isArray(n.SessionStart)?n.SessionStart:[]).filter(r=>{try{return!JSON.stringify(r).includes("session:codex-context")}catch{return!0}}),s=e.binary??"toolnet-memory";return c.push({matcher:"startup|resume|clear|compact",hooks:[{type:"command",command:`${Ns(s)} session:codex-context`,timeout:15,additionalContextLimit:1e3,statusMessage:"Loading ToolNet project continuity"}]}),n.SessionStart=c,Rs(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),t}import{existsSync as Eo,mkdirSync as As,readFileSync as Po,writeFileSync as Ts}from"node:fs";import{homedir as Ms}from"node:os";import{dirname as Hs,join as No}from"node:path";function Ao(e){return`'${e.replace(/'/g,"'\\''")}'`}function To(e={}){let t=e.hooksFile??No(process.env.CODEX_HOME??No(Ms(),".codex"),"hooks.json");As(Hs(t),{recursive:!0});let o={};if(Eo(t))try{o=JSON.parse(Po(t,"utf8"))}catch{throw new Error(`Invalid existing Codex hooks.json at ${t}: parse error. Not overwriting.`)}let n=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=n;let i=e.binary??"toolnet-memory",c=`${Ao(i)} session:codex-stop-hook`,s=`${Ao(i)} session:codex-session-end`,r={hooks:[{type:"command",command:c,timeout:30}]},a={hooks:[{type:"command",command:s,timeout:3}]},u=(Array.isArray(n.Stop)?n.Stop:[]).filter(h=>{try{return!JSON.stringify(h).includes("session:codex-stop-hook")}catch{return!0}}),d=(Array.isArray(n.SessionEnd)?n.SessionEnd:[]).filter(h=>{try{return!JSON.stringify(h).includes("session:codex-session-end")}catch{return!0}});n.Stop=[...u,r],n.SessionEnd=[...d,a];let m=JSON.stringify(o,null,2)+`
`,O=!Eo(t)||Po(t,"utf8")!==m;return Ts(t,m,{encoding:"utf8",mode:384}),{hooksFile:t,changed:O,stopInstalled:!0,sessionEndInstalled:!0}}import{spawnSync as Js}from"node:child_process";function Be(e,t){return Js(e,t,{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}function Mo(e,t){let o=Be(e,["mcp","get",t,"--json"]);if(o.status!==0||!o.stdout)return null;try{return JSON.parse(o.stdout)}catch{return null}}function Ho(e,t){return e.enabled!==!1&&e.transport?.type==="stdio"&&e.transport?.command===t&&Array.isArray(e.transport?.args)&&e.transport?.args.length===1&&e.transport.args[0]==="mcp"}function Jo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.codexBinary??"codex",n=e.serverName??"toolnet-memory",i=Mo(o,n);if(i&&Ho(i,t))return{installed:!0,changed:!1,serverName:n,command:t,args:["mcp"]};if(i){let r=Be(o,["mcp","remove",n]);if(r.status!==0)return{installed:!1,changed:!1,serverName:n,command:t,args:["mcp"],error:(r.stderr||r.stdout||"Unable to remove old ToolNet MCP configuration.").trim()}}let c=Be(o,["mcp","add",n,"--",t,"mcp"]);if(c.status!==0)return{installed:!1,changed:!1,serverName:n,command:t,args:["mcp"],error:(c.stderr||c.stdout||"Unable to register ToolNet MCP.").trim()};let s=Mo(o,n);return!s||!Ho(s,t)?{installed:!1,changed:!0,serverName:n,command:t,args:["mcp"],error:"Codex accepted MCP registration but verification did not match expected ToolNet command."}:{installed:!0,changed:!0,serverName:n,command:t,args:["mcp"]}}import{existsSync as Ds,mkdirSync as $s,readFileSync as _s,renameSync as Gs,rmSync as Ls,writeFileSync as qs}from"node:fs";import{dirname as Ks}from"node:path";function G(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Bs(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function Us(e){if(!Ds(e))return{};let t;try{t=JSON.parse(_s(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude settings.json: ${o instanceof Error?o.message:String(o)}`)}if(!G(t))throw new Error("Invalid existing Claude settings.json: root must be a JSON object.");return t}function ue(e){if(e===void 0)return[];if(!Array.isArray(e))throw new Error("Invalid existing Claude settings.json: hook event must be an array.");let t=[];for(let o of e){if(!G(o)){t.push(o);continue}let n=o.hooks;if(!Array.isArray(n)){t.push(o);continue}let i=n.filter(c=>{if(!G(c))return!0;let s=c.command;return!(typeof s=="string"&&s.includes("session:claude-hook"))});i.length!==0&&t.push({...o,hooks:i})}return t}function de(e,t=10){return{type:"command",command:e,timeout:t}}function Ws(e,t){$s(Ks(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{qs(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Gs(o,e)}finally{Ls(o,{force:!0})}}function Do(e={}){let t=e.settingsFile??Ct(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=Us(t),i=n.hooks;if(i!==void 0&&!G(i))throw new Error("Invalid existing Claude settings.json: hooks must be an object.");let c=G(i)?{...i}:{},s=`${Bs(o)} session:claude-hook`,r=ue(c.SessionStart);r.push({matcher:"startup|resume|clear|compact",hooks:[de(s)]}),c.SessionStart=r;let a=ue(c.UserPromptSubmit);a.push({hooks:[de(s)]}),c.UserPromptSubmit=a;let l=ue(c.PostToolUse);l.push({matcher:"Edit|Write",hooks:[de(s)]}),c.PostToolUse=l;let u=ue(c.Stop);u.push({hooks:[de(s,30)]}),c.Stop=u;let p={...n,hooks:c},d=JSON.stringify(n),m=JSON.stringify(p);return d===m?{settingsFile:t,changed:!1}:e.dryRun===!0?{settingsFile:t,changed:!0,dryRun:!0}:(Ws(t,p),{settingsFile:t,changed:!0})}import{existsSync as Qs,mkdirSync as Ys,readFileSync as Vs,renameSync as Xs,rmSync as zs,writeFileSync as Zs}from"node:fs";import{dirname as ec}from"node:path";function L(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function $o(e){if(!Qs(e))return{};let t;try{t=JSON.parse(Vs(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude Code config: ${o instanceof Error?o.message:String(o)}`)}if(!L(t))throw new Error("Invalid existing Claude Code config: root must be a JSON object.");return t}function _o(e,t){if(!L(e))return!1;let o=e.args;return e.type==="stdio"&&e.command===t&&Array.isArray(o)&&o.length===1&&o[0]==="mcp"}function tc(e,t){Ys(ec(e),{recursive:!0});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Zs(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Xs(o,e)}finally{zs(o,{force:!0})}}function Go(e={}){let t=e.stateFile??wt(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",i=$o(t),c=i.mcpServers;if(c!==void 0&&!L(c))throw new Error("Invalid existing Claude Code config: mcpServers must be an object.");let s=L(c)?{...c}:{},r=s[n];if(_o(r,o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:[o,"mcp"],repaired:!1};let a=r!==void 0;if(s[n]={type:"stdio",command:o,args:["mcp"]},e.dryRun===!0)return{installed:!0,changed:!0,configFile:t,serverName:n,command:[o,"mcp"],repaired:a,dryRun:!0};tc(t,{...i,mcpServers:s});let u=$o(t).mcpServers;if(!L(u)||!_o(u[n],o))throw new Error("Claude Code MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:[o,"mcp"],repaired:a}}function Lo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=Do({binary:t,settingsFile:e.settingsFile,...e.dryRun!==void 0?{dryRun:e.dryRun}:{}}),n=Go({binary:t,stateFile:e.stateFile,...e.dryRun!==void 0?{dryRun:e.dryRun}:{}});return{hooks:o,mcp:n,files:[o.settingsFile,n.configFile]}}import{existsSync as oc,mkdirSync as nc,readFileSync as rc,renameSync as ic,rmSync as sc,writeFileSync as cc}from"node:fs";import{dirname as ac}from"node:path";var M="ToolNet Memory - ";function Bo(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function lc(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function qo(e){if(!oc(e))return{};let t=rc(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro hooks file at ${e}: parse error. Not overwriting.`)}if(!Bo(o))throw new Error(`Invalid existing Kiro hooks file at ${e}: root must be a JSON object. Not overwriting.`);return o}function Ko(e){return Bo(e)?typeof e.name=="string"&&e.name.startsWith(M):!1}function q(e){return{type:"command",command:e}}function uc(e){return[{name:`${M}Session Start`,description:"Inject compact local ToolNet continuity and capture Kiro session activation.",trigger:"SessionStart",action:q(e),timeout:10,enabled:!0},{name:`${M}Prompt Continuity`,description:"Capture prompts and refresh ToolNet guidance only for resume/continue requests.",trigger:"UserPromptSubmit",action:q(e),timeout:10,enabled:!0},{name:`${M}Raw History Guard`,description:"Prevent Kiro from reconstructing continuity from raw ToolNet/agent session history.",trigger:"PreToolUse",matcher:"*",action:q(e),timeout:10,enabled:!0},{name:`${M}Tool Capture`,description:"Capture durable tool activity while filtering noisy read-only events.",trigger:"PostToolUse",matcher:"*",action:q(e),timeout:15,enabled:!0},{name:`${M}Final Flush`,description:"Flush pending Kiro WAL events when the assistant finishes a turn.",trigger:"Stop",action:q(e),timeout:30,enabled:!0}]}function dc(e,t){nc(ac(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{cc(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),ic(o,e)}finally{sc(o,{force:!0})}}function pe(e,t,o){let n=qo(e);if(n.version!==void 0&&n.version!=="v1")throw new Error(`Unsupported existing Kiro hooks version: ${String(n.version)}`);let i=n.hooks;if(i!==void 0&&!Array.isArray(i))throw new Error("Invalid existing Kiro hooks file: hooks must be an array.");let c=Array.isArray(i)?i.filter(l=>!Ko(l)):[],s=uc(t),r={...n,version:"v1",hooks:[...c,...s]};if(!o&&JSON.stringify(n)===JSON.stringify(r))return{changed:!1,hookCount:s.length};dc(e,r);let a=qo(e);if(a.version!=="v1"||!Array.isArray(a.hooks)||a.hooks.filter(Ko).length!==s.length)throw new Error("Kiro hooks were written but verification failed.");return{changed:!0,hookCount:s.length}}function Uo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=`${lc(t)} session:kiro-hook`;if(e.hooksFile){let s=pe(e.hooksFile,n,e.force??!1);return{hooksFile:e.hooksFile,...s}}if(o==="both"){let s=Fe(),r=Re({cwd:e.cwd}),a=pe(s,n,e.force??!1),l=pe(r,n,e.force??!1);return{hooksFile:s,changed:a.changed||l.changed,hookCount:a.hookCount}}let i=o==="project"?Re({cwd:e.cwd}):Fe(),c=pe(i,n,e.force??!1);return{hooksFile:i,...c}}import{existsSync as pc,mkdirSync as gc,readFileSync as fc,renameSync as mc,rmSync as yc,writeFileSync as hc}from"node:fs";import{dirname as kc}from"node:path";function K(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Wo(e){if(!pc(e))return{};let t=fc(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro MCP config at ${e}: parse error. Not overwriting.`)}if(!K(o))throw new Error(`Invalid existing Kiro MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Qo(e,t){return K(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&e.disabled===!1:!1}function bc(e,t){gc(kc(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{hc(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),mc(o,e)}finally{yc(o,{force:!0})}}function ge(e,t,o,n){let i=Wo(e),c=i.mcpServers;if(c!==void 0&&!K(c))throw new Error(`Invalid existing Kiro MCP config: mcpServers must be an object in ${e}.`);let s=K(c)?{...c}:{},r=s[o];if(Qo(r,t)&&!n)return{installed:!0,changed:!1};s[o]={command:t,args:["mcp"],disabled:!1};let a={...i,mcpServers:s};bc(e,a);let u=Wo(e).mcpServers;if(!K(u)||!Qo(u[o],t))throw new Error(`Kiro MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function Yo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",n=e.scope??"global";if(e.configFile)return{...ge(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(n==="both"){let s=X(),r=xe({cwd:e.cwd}),a=ge(s,t,o,e.force??!1),l=ge(r,t,o,e.force??!1);return{installed:!0,changed:a.changed||l.changed,configFile:s,serverName:o,command:t,args:["mcp"]}}let i=n==="project"?xe({cwd:e.cwd}):X();return{...ge(i,t,o,e.force??!1),configFile:i,serverName:o,command:t,args:["mcp"]}}function Vo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=Yo({binary:t,configFile:e.configFile,scope:e.scope,cwd:e.cwd,force:e.force}),n=Uo({binary:t,hooksFile:e.hooksFile,scope:e.scope,cwd:e.cwd,force:e.force});return{installed:o.installed,changed:o.changed||n.changed,mcp:o,hooks:n,files:[o.configFile,n.hooksFile]}}import{existsSync as Ic,mkdirSync as Sc,readFileSync as Oc,renameSync as Cc,rmSync as wc,writeFileSync as jc}from"node:fs";import{dirname as vc}from"node:path";function Ue(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function xc(e){if(!Ic(e))return{};let t=Oc(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: parse error. Not overwriting.`)}if(!Ue(o))throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Fc(e,t){Sc(vc(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{jc(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Cc(o,e)}finally{wc(o,{force:!0})}}function Xo(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??xt({cwd:e.cwd}),n=xc(o),i="toolnet-memory";if(Ue(n.mcpServers)&&n.mcpServers[i]!=null&&!e.force)return{installed:!0,changed:!1,configFile:o};let s=Ue(n.mcpServers)?{...n.mcpServers}:{};return s[i]={command:t,args:["mcp"]},n.mcpServers=s,Fc(o,n),{installed:!0,changed:!0,configFile:o}}function zo(e={}){let t=e.binary??"toolnet-memory",o=Xo({binary:t,configFile:e.configFile,force:e.force,cwd:e.cwd});return{installed:o.installed,changed:o.changed,mcp:{...o,configured:o.installed},files:[o.configFile]}}import{mkdirSync as Hc,existsSync as Jc}from"node:fs";import{dirname as Dc}from"node:path";import{existsSync as Rc,mkdirSync as Ec,readFileSync as Pc,renameSync as Nc,rmSync as Ac,writeFileSync as Tc}from"node:fs";import{dirname as Mc}from"node:path";function y(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function C(e,t){if(!Rc(e))return{};let o=Pc(e,"utf8").trim();if(!o)return{};let n;try{n=JSON.parse(o)}catch(i){throw new Error(`Invalid existing ${t} MCP config: ${i instanceof Error?i.message:String(i)}`)}if(!y(n))throw new Error(`Invalid existing ${t} MCP config: root must be a JSON object.`);return n}function j(e,t){Ec(Mc(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Tc(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Nc(o,e)}finally{Ac(o,{force:!0})}}function Zo(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??Ne(),n=Dc(o);Jc(n)||Hc(n,{recursive:!0});let i=C(o,"Kilo"),c=i.mcp;if(c!==void 0&&!y(c))throw new Error("Invalid existing Kilo config: mcp must be an object.");let s=y(c)?{...c}:{},r="toolnet-memory";return y(s[r])&&!e.force?{installed:!0,changed:!1,configFile:o,configured:!0}:(s[r]={type:"local",command:[t,"mcp"],enabled:!0,timeout:1e4},j(o,{...i,mcp:s}),{installed:!0,changed:!0,configFile:o,configured:!0})}function en(e={}){let t=e.binary??"toolnet-memory",o=Zo({binary:t,configFile:e.configFile,force:e.force});return{installed:o.installed,changed:o.changed,mcp:o,files:[o.configFile]}}import{existsSync as $c,mkdirSync as _c,readFileSync as Gc,renameSync as Lc,rmSync as qc,writeFileSync as Kc}from"node:fs";import{dirname as Bc}from"node:path";function b(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function x(e,t){if(!$c(e))return{};let o=Gc(e,"utf8").trim();if(!o)return{};let n;try{n=JSON.parse(o)}catch(i){throw new Error(`Invalid existing ${t} hooks file: ${i instanceof Error?i.message:String(i)}`)}if(!b(n))throw new Error(`Invalid existing ${t} hooks file: root must be a JSON object.`);return n}function H(e,t){_c(Bc(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Kc(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Lc(o,e)}finally{qc(o,{force:!0})}}function We(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}var B=[["sessionStart",10],["beforeSubmitPrompt",10],["preToolUse",10],["postToolUse",15],["afterAgentResponse",15],["stop",30]];function tn(e){return b(e)&&typeof e.command=="string"&&e.command.includes("session:cursor-hook")}function Uc(e,t,o){let i={type:"command",command:`TOOLNET_HOOK_EVENT=${We(e)} ${We(t)} session:cursor-hook`,timeout:o};return e==="preToolUse"&&(i.matcher=".*"),i}function Qe(e={}){let t=e.hooksFile??ee(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=x(t,"Cursor");if(n.version!==void 0&&n.version!==1)throw new Error(`Unsupported existing Cursor hooks version: ${String(n.version)}`);let i=n.hooks;if(i!==void 0&&!b(i))throw new Error("Invalid existing Cursor hooks file: hooks must be an object.");let c=b(i)?{...i}:{};for(let[l,u]of B){let p=c[l];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing Cursor hooks file: hooks.${l} must be an array.`);let d=Array.isArray(p)?p.filter(m=>!tn(m)):[];c[l]=[...d,Uc(l,o,u)]}let s={...n,version:1,hooks:c};if(JSON.stringify(n)===JSON.stringify(s))return{hooksFile:t,changed:!1,hookCount:B.length};H(t,s);let r=x(t,"Cursor");if(r.version!==1||!b(r.hooks))throw new Error("Cursor hooks were written but verification failed.");let a=0;for(let[l]of B){let u=r.hooks[l];if(!Array.isArray(u))throw new Error("Cursor hooks were written but verification failed.");a+=u.filter(tn).length}if(a!==B.length)throw new Error("Cursor hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:B.length}}function on(e,t){return y(e)?(e.type===void 0||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function Ye(e={}){let t=e.configFile??Z(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",i=C(t,"Cursor"),c=i.mcpServers;if(c!==void 0&&!y(c))throw new Error("Invalid existing Cursor MCP config: mcpServers must be an object.");let s=y(c)?{...c}:{};if(on(s[n],o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};s[n]={type:"stdio",command:o,args:["mcp"]},j(t,{...i,mcpServers:s});let a=C(t,"Cursor").mcpServers;if(!y(a)||!on(a[n],o))throw new Error("Cursor MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}import{mkdirSync as Wc,readFileSync as nn,renameSync as Qc,rmSync as Yc,writeFileSync as Vc}from"node:fs";import{dirname as Xc}from"node:path";var Ve=`---
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
`;function zc(e,t){Wc(Xc(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Vc(o,t,{encoding:"utf8",mode:384}),Qc(o,e)}finally{Yc(o,{force:!0})}}function rn(e){let t=e.ruleFile??At(e.projectRoot);try{if(nn(t,"utf8")===Ve)return{ruleFile:t,changed:!1}}catch{}if(zc(t,Ve),nn(t,"utf8")!==Ve)throw new Error("Cursor ToolNet project rule was written but verification failed.");return{ruleFile:t,changed:!0}}import{spawnSync as Zc}from"node:child_process";import{existsSync as J,statSync as ea}from"node:fs";import{dirname as sn,join as ta,parse as oa,resolve as ze}from"node:path";function cn(e){let t=ze(e);if(!J(t))throw new Error(`Project path does not exist: ${t}`);if(!ea(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);return t}function fe(e){return ta(e,".toolnet","project.json")}function na(e){let t=ze(e),o=oa(t).root,n=["/tmp","/var","/usr","/opt","/etc","/boot","/sys","/proc","/dev"];for(;;){if(n.includes(t)){let c=sn(t);if(c===t)return;t=c;continue}if(J(fe(t)))return t;if(t===o)return;let i=sn(t);if(i===t)return;t=i}}function Xe(e){let t=Zc("git",["rev-parse","--show-toplevel"],{cwd:e,encoding:"utf8",timeout:5e3});if(t.status!==0)return;let o=t.stdout.trim();return o?ze(o):void 0}function F(e={}){let t=cn(e.cwd??process.cwd());if(e.project){let i=cn(e.project),c=fe(i),s=Xe(i);return{root:i,source:"explicit",eligible:!0,toolnetProject:J(c),manifestFile:J(c)?c:void 0,gitRoot:s}}let o=na(t);if(o){let i=fe(o);return{root:o,source:"toolnet",eligible:!0,toolnetProject:!0,manifestFile:i,gitRoot:Xe(o)}}let n=Xe(t);if(n){let i=fe(n);return{root:n,source:"git",eligible:!0,toolnetProject:J(i),manifestFile:J(i)?i:void 0,gitRoot:n}}return{root:t,source:"cwd",eligible:!1,toolnetProject:!1}}function dn(e,t={}){let o=[],n=e.indexOf("--scope");if(n>=0){let c=e[n+1];if(c!=="global"&&c!=="project"&&c!=="both")throw new Error(`Invalid --scope value: ${String(c)}`);o.push(c)}e.includes("--global")&&o.push("global"),e.includes("--both")&&o.push("both");let i=Array.from(new Set(o));if(i.length>1)throw new Error(`Conflicting integration scopes: ${i.join(", ")}`);return i[0]??t.defaultScope??"global"}function an(e,t){return{install:e,effective:t}}function R(e,t){return{surface:e,global:an(t.globalInstall,t.effective==="global"||t.effective==="both"),project:an(t.projectInstall,t.effective==="project"||t.effective==="both"),effective:t.effective,risk:t.risk??"none",dedupeRequired:t.dedupeRequired??!1,trustRequired:t.trustRequired??t.projectInstall,note:t.note}}function ra(e){return{mcp:R("mcp",{globalInstall:!0,projectInstall:!1,effective:"global"}),hooks:R("hooks",{globalInstall:!0,projectInstall:!1,effective:"global"}),work:R("work",{globalInstall:e==="grok",projectInstall:!1,effective:e==="grok"?"global":"none",note:e==="grok"?"Grok supports a global ToolNet continuity skill.":"Cursor/Copilot work instructions remain project-scoped."})}}function ln(e){return{mcp:R("mcp",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),hooks:R("hooks",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),work:R("work",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!1,note:e==="cursor"?"Use .cursor/rules/toolnet-memory.mdc.":e==="copilot"?"Use .github/instructions/toolnet-memory.instructions.md.":"Use .grok/skills/toolnet-continuity/SKILL.md."})}}function un(e){return{mcp:R("mcp",{globalInstall:!0,projectInstall:!0,effective:"project",risk:e==="cursor"?"precedence-unverified":"shadowed-global",trustRequired:!0,note:e==="cursor"?"Project ToolNet MCP is the intended effective definition; native same-name precedence must be E2E certified before release.":"Global remains useful outside the project; same-name project definition wins inside the project."}),hooks:R("hooks",{globalInstall:!0,projectInstall:!0,effective:"both",risk:"additive-duplicate",dedupeRequired:!0,trustRequired:!0,note:"Global and project hook sources can both execute for the same native event."}),work:R("work",{globalInstall:e==="grok",projectInstall:!0,effective:"project",risk:e==="grok"?"shadowed-global":"none",trustRequired:!1,note:e==="cursor"?"Project rule is authoritative.":e==="copilot"?"Project instruction is authoritative.":"Project skill shadows the same-name global skill inside the project."})}}function D(e){let{agent:t,scope:o,project:n}=e;return(o==="project"||o==="both")&&(!n||!n.eligible)?{agent:t,requestedScope:o,project:n,surfaces:o==="both"?un(t):ln(t),canInstall:!1,reason:"Project scope requires an explicit project, existing ToolNet project, or Git repository root."}:{agent:t,requestedScope:o,project:n,surfaces:o==="global"?ra(t):o==="project"?ln(t):un(t),canInstall:!0}}function pn(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.rule?.changed)}function gn(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=o==="global"?void 0:F({project:e.projectRoot}),i=D({agent:"cursor",scope:o,project:n});if(!i.canInstall)throw new Error(i.reason??"Cursor project integration scope cannot be resolved.");let c,s;if((i.surfaces.mcp.global.install||i.surfaces.hooks.global.install||i.surfaces.work.global.install)&&(c={},i.surfaces.mcp.global.install&&(c.mcp=Ye({binary:t,configFile:e.configFile??Z()})),i.surfaces.hooks.global.install&&(c.hooks=Qe({binary:t,hooksFile:e.hooksFile??ee()}))),i.surfaces.mcp.project.install||i.surfaces.hooks.project.install||i.surfaces.work.project.install){if(!n?.eligible)throw new Error("Cursor project integration requires an eligible project root.");s={},i.surfaces.mcp.project.install&&(s.mcp=Ye({binary:t,configFile:e.projectConfigFile??Pt(n.root)})),i.surfaces.hooks.project.install&&(s.hooks=Qe({binary:t,hooksFile:e.projectHooksFile??Nt(n.root)})),i.surfaces.work.project.install&&(s.rule=rn({projectRoot:n.root,ruleFile:e.projectRuleFile}))}let r=s?.mcp??c?.mcp,a=s?.hooks??c?.hooks;if(!r||!a)throw new Error("Cursor integration did not produce an effective MCP/hooks installation.");let l=Array.from(new Set([c?.mcp?.configFile,c?.hooks?.hooksFile,c?.rule?.ruleFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.rule?.ruleFile].filter(u=>typeof u=="string")));return{installed:!0,changed:pn(c)||pn(s),scope:o,plan:i,project:n,global:c,projectScope:s,mcp:r,hooks:a,rule:s?.rule,files:l}}var U=[["sessionStart",10],["userPromptSubmitted",10],["userPromptTransformed",10],["preToolUse",10],["postToolUse",15],["agentStop",30]];function ia(e){if(typeof e.command=="string")return e.command;if(typeof e.bash=="string")return e.bash}function fn(e){return b(e)&&ia(e)?.includes("session:copilot-hook")===!0}function sa(e,t,o){let n={type:"command",command:`${t} session:copilot-hook`,env:{TOOLNET_HOOK_EVENT:e},timeoutSec:o};return e==="preToolUse"&&(n.matcher=".*"),n}function Ze(e={}){let t=e.hooksFile??oe(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=x(t,"GitHub Copilot CLI");if(n.version!==void 0&&n.version!==1)throw new Error(`Unsupported existing GitHub Copilot CLI hooks version: ${String(n.version)}`);let i=n.hooks;if(i!==void 0&&!b(i))throw new Error("Invalid existing GitHub Copilot CLI hooks file: hooks must be an object.");let c=b(i)?{...i}:{};for(let[l,u]of U){let p=c[l];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing GitHub Copilot CLI hooks file: hooks.${l} must be an array.`);let d=Array.isArray(p)?p.filter(m=>!fn(m)):[];c[l]=[...d,sa(l,o,u)]}let s={...n,version:1,hooks:c};if(JSON.stringify(n)===JSON.stringify(s))return{hooksFile:t,changed:!1,hookCount:U.length};H(t,s);let r=x(t,"GitHub Copilot CLI");if(r.version!==1||!b(r.hooks))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");let a=0;for(let[l]of U){let u=r.hooks[l];if(!Array.isArray(u))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");a+=u.filter(fn).length}if(a!==U.length)throw new Error("GitHub Copilot CLI hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:U.length}}function mn(e,t){return y(e)?(e.type===void 0||e.type==="local"||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&Array.isArray(e.tools)&&e.tools.length===1&&e.tools[0]==="*":!1}function et(e={}){let t=e.configFile??te(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",i=C(t,"GitHub Copilot CLI"),c=i.mcpServers;if(c!==void 0&&!y(c))throw new Error("Invalid existing GitHub Copilot CLI MCP config: mcpServers must be an object.");let s=y(c)?{...c}:{};if(mn(s[n],o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};s[n]={type:"stdio",command:o,args:["mcp"],tools:["*"]},j(t,{...i,mcpServers:s});let a=C(t,"GitHub Copilot CLI").mcpServers;if(!y(a)||!mn(a[n],o))throw new Error("GitHub Copilot CLI MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}import{mkdirSync as ca,readFileSync as yn,renameSync as aa,rmSync as la,writeFileSync as ua}from"node:fs";import{dirname as da}from"node:path";var tt=`---
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
`;function pa(e,t){ca(da(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{ua(o,t,{encoding:"utf8",mode:384}),aa(o,e)}finally{la(o,{force:!0})}}function hn(e){let t=e.instructionFile??Jt(e.projectRoot);try{if(yn(t,"utf8")===tt)return{instructionFile:t,changed:!1}}catch{}if(pa(t,tt),yn(t,"utf8")!==tt)throw new Error("Copilot ToolNet project instruction verification failed.");return{instructionFile:t,changed:!0}}function kn(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.instruction?.changed)}function bn(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=o==="global"?void 0:F({project:e.projectRoot}),i=D({agent:"copilot",scope:o,project:n});if(!i.canInstall)throw new Error(i.reason??"Copilot project integration scope cannot be resolved.");let c,s;if((i.surfaces.mcp.global.install||i.surfaces.hooks.global.install||i.surfaces.work.global.install)&&(c={},i.surfaces.mcp.global.install&&(c.mcp=et({binary:t,configFile:e.configFile??te()})),i.surfaces.hooks.global.install&&(c.hooks=Ze({binary:t,hooksFile:e.hooksFile??oe()}))),i.surfaces.mcp.project.install||i.surfaces.hooks.project.install||i.surfaces.work.project.install){if(!n?.eligible)throw new Error("Copilot project integration requires an eligible project root.");s={},i.surfaces.mcp.project.install&&(s.mcp=et({binary:t,configFile:e.projectConfigFile??Mt(n.root)})),i.surfaces.hooks.project.install&&(s.hooks=Ze({binary:t,hooksFile:e.projectHooksFile??Ht(n.root)})),i.surfaces.work.project.install&&(s.instruction=hn({projectRoot:n.root,instructionFile:e.projectInstructionFile}))}let r=s?.mcp??c?.mcp,a=s?.hooks??c?.hooks;if(!r||!a)throw new Error("Copilot integration did not produce effective MCP/hooks.");let l=Array.from(new Set([c?.mcp?.configFile,c?.hooks?.hooksFile,c?.instruction?.instructionFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.instruction?.instructionFile].filter(u=>typeof u=="string")));return{installed:!0,changed:kn(c)||kn(s),scope:o,plan:i,project:n,global:c,projectScope:s,mcp:r,hooks:a,instruction:s?.instruction,files:l}}import{existsSync as ga,mkdirSync as fa,readFileSync as In,renameSync as ma,rmSync as ya,writeFileSync as ha}from"node:fs";import{dirname as ka}from"node:path";var ot=`---
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
`;function ba(e,t){fa(ka(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{ha(o,t,{encoding:"utf8",mode:384}),ma(o,e)}finally{ya(o,{force:!0})}}function nt(e={}){let t=e.skillFile??se();if(ga(t)&&In(t,"utf8")===ot)return{skillFile:t,changed:!1};if(ba(t,ot),In(t,"utf8")!==ot)throw new Error("Grok ToolNet continuity skill was written but verification failed.");return{skillFile:t,changed:!0}}var W=[["SessionStart",10],["UserPromptSubmit",10],["PreToolUse",10],["PostToolUse",15],["Stop",30]];function Sn(e){return!b(e)||!Array.isArray(e.hooks)?!1:e.hooks.some(t=>b(t)&&typeof t.command=="string"&&t.command.includes("session:grok-hook"))}function Ia(e,t,o){let n={hooks:[{type:"command",command:`${t} session:grok-hook`,timeout:o,env:{TOOLNET_HOOK_EVENT:e}}]};return e==="PreToolUse"&&(n.matcher=".*"),n}function rt(e={}){let t=e.hooksFile??ie(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=x(t,"Grok Build"),i=n.hooks;if(i!==void 0&&!b(i))throw new Error("Invalid existing Grok Build hooks file: hooks must be an object.");let c=b(i)?{...i}:{};for(let[l,u]of W){let p=c[l];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing Grok Build hooks file: hooks.${l} must be an array.`);let d=Array.isArray(p)?p.filter(m=>!Sn(m)):[];c[l]=[...d,Ia(l,o,u)]}let s={...n,hooks:c};if(JSON.stringify(n)===JSON.stringify(s))return{hooksFile:t,changed:!1,hookCount:W.length};H(t,s);let r=x(t,"Grok Build");if(!b(r.hooks))throw new Error("Grok Build hooks were written but verification failed.");let a=0;for(let[l]of W){let u=r.hooks[l];if(!Array.isArray(u))throw new Error("Grok Build hooks were written but verification failed.");a+=u.filter(Sn).length}if(a!==W.length)throw new Error("Grok Build hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:W.length}}import{existsSync as Sa,mkdirSync as Oa,readFileSync as Ca,renameSync as wa,rmSync as ja,writeFileSync as va}from"node:fs";import{dirname as xa}from"node:path";function On(e){return Sa(e)?Ca(e,"utf8"):""}function Fa(e,t){Oa(xa(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{va(o,t,{encoding:"utf8",mode:384}),wa(o,e)}finally{ja(o,{force:!0})}}function it(e){return e.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t")}function Ra(e){return`[mcp_servers."${it(e)}"]`}function Ea(e,t){return[Ra(e),`command = "${it(t)}"`,'args = ["mcp"]',"enabled = true"].join(`
`)}function Pa(e){let t=e.trim();return t.startsWith("[")&&t.includes("]")}function me(e){return e.trim().replace(/\s+/g,"")}function Na(e){return new Set([me(`[mcp_servers.${e}]`),me(`[mcp_servers."${e}"]`),me(`[mcp_servers.'${e}']`)])}function wn(e,t){let o=e.split(/\r?\n/),n=Na(t),i=-1;for(let u=0;u<o.length;u+=1){let p=me(o[u].replace(/\s+#.*$/,""));if(n.has(p)){i=u;break}}if(i<0)return null;let c=o.length;for(let u=i+1;u<o.length;u+=1)if(Pa(o[u])){c=u;break}let s=[],r=0;for(let u of o)s.push(r),r+=u.length+1;let a=s[i]??0,l=c>=o.length?e.length:s[c]??e.length;return{start:a,end:l}}function Aa(e,t,o){let n=`${Ea(t,o)}
`,i=wn(e,t);if(i){let c=e.slice(0,i.start),s=e.slice(i.end);return`${c}${n}${s.replace(/^\n+/,"")}`}return e.trim()?`${e.replace(/\s*$/,"")}

${n}`:n}function Cn(e,t,o){let n=wn(e,t);if(!n)return!1;let i=e.slice(n.start,n.end);return i.includes(`command = "${it(o)}"`)&&/args\s*=\s*\[\s*"mcp"\s*\]/.test(i)&&/enabled\s*=\s*true/.test(i)}function st(e={}){let t=e.configFile??re(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",i=On(t);if(Cn(i,n,o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};let c=Aa(i,n,o);Fa(t,c);let s=On(t);if(!Cn(s,n,o))throw new Error("Grok Build MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}function jn(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.skill?.changed)}function vn(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=o==="global"?void 0:F({project:e.projectRoot}),i=D({agent:"grok",scope:o,project:n});if(!i.canInstall)throw new Error(i.reason??"Grok project integration scope cannot be resolved.");let c,s;if((i.surfaces.mcp.global.install||i.surfaces.hooks.global.install||i.surfaces.work.global.install)&&(c={},i.surfaces.mcp.global.install&&(c.mcp=st({binary:t,configFile:e.configFile??re()})),i.surfaces.hooks.global.install&&(c.hooks=rt({binary:t,hooksFile:e.hooksFile??ie()})),i.surfaces.work.global.install&&(c.skill=nt({skillFile:e.skillFile??se()}))),i.surfaces.mcp.project.install||i.surfaces.hooks.project.install||i.surfaces.work.project.install){if(!n?.eligible)throw new Error("Grok project integration requires an eligible project root.");s={},i.surfaces.mcp.project.install&&(s.mcp=st({binary:t,configFile:e.projectConfigFile??$t(n.root)})),i.surfaces.hooks.project.install&&(s.hooks=rt({binary:t,hooksFile:e.projectHooksFile??_t(n.root)})),i.surfaces.work.project.install&&(s.skill=nt({skillFile:e.projectSkillFile??Gt(n.root)}))}let r=s?.mcp??c?.mcp,a=s?.hooks??c?.hooks,l=s?.skill??c?.skill;if(!r||!a||!l)throw new Error("Grok integration did not produce effective MCP/hooks/skill.");let u=Array.from(new Set([c?.mcp?.configFile,c?.hooks?.hooksFile,c?.skill?.skillFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.skill?.skillFile].filter(p=>typeof p=="string")));return{installed:!0,changed:jn(c)||jn(s),scope:o,plan:i,project:n,global:c,projectScope:s,mcp:r,hooks:a,skill:l,files:u}}import{existsSync as xn,mkdirSync as Ta,readFileSync as Fn,renameSync as Ma,rmSync as Ha,writeFileSync as Ja}from"node:fs";import{dirname as Da}from"node:path";function ye(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function $a(e){return`'${e.replace(/'/g,"'\\''")}'`}function _a(e){if(!xn(e))return{};let t=Fn(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Gemini settings.json at ${e}: parse error. Not overwriting.`)}if(!ye(o))throw new Error(`Invalid existing Gemini settings.json at ${e}: root must be an object.`);return o}function Ga(e,t){Ta(Da(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Ja(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Ma(o,e)}finally{Ha(o,{force:!0})}}function La(e){return ye(e)?(typeof e.command=="string"?e.command:"").includes("session:gemini-hook"):!1}function Rn(e={}){let t=e.settingsFile??Je(),o=_a(t),n=e.binary??"toolnet-memory",i=`${$a(n)} session:gemini-hook`,c=ye(o.hooks)?{...o.hooks}:{},s=["SessionStart","SessionEnd"];for(let l of s){let p=(Array.isArray(c[l])?[...c[l]]:[]).map(d=>{if(!ye(d)||!Array.isArray(d.hooks))return d;let m=d.hooks.filter(O=>!La(O));return m.length>0?{...d,hooks:m}:void 0}).filter(d=>d!==void 0);p.push({hooks:[{name:"toolnet-memory",type:"command",command:i,timeout:l==="SessionEnd"?1e4:3e4}]}),c[l]=p}o.hooks=c;let r=`${JSON.stringify(o,null,2)}
`,a=!xn(t)||Fn(t,"utf8")!==r;return Ga(t,o),{settingsFile:t,changed:a,events:[...s]}}import{existsSync as Nn,mkdirSync as Ya,readFileSync as An,renameSync as Va,rmSync as Xa,writeFileSync as za}from"node:fs";import{dirname as Za}from"node:path";import{spawnSync as Pn}from"node:child_process";var qa={claude:"hook",cursor:"hook",copilot:"hook",grok:"hook",kiro:"hook",opencode:"hook",codex:"hook",agy:"hook","toolnet-cli":"manual-sync",kilo:"mcp-only",goose:"hook",qwen:"hook",kimi:"hook",hermes:"hook",qoder:"hook",aider:"managed-wrapper-session-end",plandex:"manual-sync",openrouter:"blocked-product-identity",bob:"hook",cline:"hook",rovo:"hook",warp:"blocked-capability",gemini:"hook",junie:"hook",codebuff:"mcp-only",freebuff:"mcp-only",continue:"manual-sync"},he={mcp:!0,continuityRead:!0,nativeCapture:!1,lifecycleHooks:!1,sharedJournalWrite:!1,level:"mcp-only"},En={mcp:!0,continuityRead:!0,nativeCapture:!1,lifecycleHooks:!1,sharedJournalWrite:!1,level:"blocked"},ct={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!1,sharedJournalWrite:!0,level:"native-capture"},k={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!0,sharedJournalWrite:!0,level:"native-capture"},Ka={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!0,sharedJournalWrite:!0,level:"native-capture"},Ba={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!1,sharedJournalWrite:!0,level:"native-capture"};function g(e,t,o){return{agent:e,...t,refreshMode:o,captureMode:qa[e]}}var Wf={agy:g("agy",k,"native-lifecycle"),opencode:g("opencode",Ka,"persistent-plugin"),codex:g("codex",k,"native-lifecycle"),claude:g("claude",k,"native-lifecycle"),kiro:g("kiro",k,"native-lifecycle"),cursor:g("cursor",k,"native-lifecycle"),copilot:g("copilot",k,"native-lifecycle"),grok:g("grok",k,"native-lifecycle"),"toolnet-cli":g("toolnet-cli",ct,"native-session"),kilo:g("kilo",he,"mcp-only"),goose:g("goose",k,"native-lifecycle"),qwen:g("qwen",k,"native-lifecycle"),kimi:g("kimi",k,"native-lifecycle"),hermes:g("hermes",k,"native-lifecycle"),qoder:g("qoder",k,"native-lifecycle"),aider:g("aider",Ba,"managed-wrapper"),plandex:g("plandex",ct,"native-session"),openrouter:g("openrouter",he,"mcp-only"),bob:g("bob",k,"native-lifecycle"),cline:g("cline",k,"native-lifecycle"),rovo:g("rovo",k,"native-lifecycle"),warp:g("warp",En,"blocked"),gemini:g("gemini",k,"native-lifecycle"),junie:{...g("junie",k,"native-lifecycle"),conditionalCapture:{runtimeResolutionRequired:!0,hookChannel:"eap",stableFallback:"blocked-capability",manualRecoveryAvailable:!1,reason:"lifecycle hooks require verified EAP capability; unverified builds fail closed"}},codebuff:g("codebuff",he,"mcp-only"),freebuff:g("freebuff",he,"mcp-only"),continue:g("continue",ct,"native-session")};var Ua=new Set(["1468.30"]);function Wa(e){return e.match(/Junie version:\s*([0-9A-Za-z._+-]+)/)?.[1]??null}function Qa(){if(!(Pn("sh",["-lc","command -v junie >/dev/null 2>&1"],{stdio:"ignore",timeout:5e3}).status===0))return{detected:!1,version:null};let t=Pn("junie",["--version"],{stdio:["ignore","pipe","ignore"],encoding:"utf8",timeout:5e3});return t.status!==0?{detected:!0,version:null}:{detected:!0,version:Wa(t.stdout)}}function ke(e,t,o,n){return{detected:e,version:t,hooksAvailable:!1,hooksStability:n,automaticCaptureSupported:!1,captureMode:"blocked-capability",fallbackMode:"blocked-capability",manualRecoveryAvailable:!1,capabilityReason:o,gaClass:"BLOCKED",refreshMode:"blocked",sessionIdModel:e?"deterministic":"unknown",projectModel:e?"cwd-based":"unknown",resumeModel:e?"flag-based":"unknown",sessionStorage:e?"sessions-directory-unverified":"unknown"}}function be(e={}){let t=e.probe??Qa,{detected:o,version:n}=t();return o?n?Ua.has(n)?ke(!0,n,`lifecycle-hooks-unavailable-on-stable-build-${n}`,"stable"):e.hookEvidence==="verified-eap-hooks"?{detected:!0,version:n,hooksAvailable:!0,hooksStability:"eap",automaticCaptureSupported:!0,captureMode:"hook",fallbackMode:"blocked-capability",manualRecoveryAvailable:!1,capabilityReason:"verified-eap-hook-capability",gaClass:"AUTO_NATIVE",refreshMode:"native-lifecycle",sessionIdModel:"deterministic",projectModel:"cwd-based",resumeModel:"flag-based",sessionStorage:"sessions-directory-unverified"}:ke(!0,n,"unverified-eap-hook-support","unverified"):ke(!0,null,"junie-version-unparseable","unknown"):ke(!1,null,"junie-binary-not-found","unknown")}function Ie(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function at(e){return`'${e.replace(/'/g,"'\\''")}'`}function el(e){if(!Nn(e))return{};let t=An(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Junie config.json at ${e}: parse error. Not overwriting.`)}if(!Ie(o))throw new Error(`Invalid existing Junie config.json at ${e}: root must be an object.`);return o}function tl(e,t){Ya(Za(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{za(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Va(o,e)}finally{Xa(o,{force:!0})}}function Tn(e={}){let t=e.configFile??De(),o=e.capability??be();if(!o.hooksAvailable||!o.automaticCaptureSupported)return{configFile:t,changed:!1,events:[],installed:!1,fallbackAvailable:!1,reason:o.capabilityReason};let n=el(t),i=e.binary??"toolnet-memory",c=e.projectRoot??process.cwd(),s=`${at(i)} session:junie-hook --project ${at(c)}`,r=Ie(n.hooks)?{...n.hooks}:{},a=[{name:"SessionStart",timeout:10},{name:"Stop",timeout:30},{name:"SessionEnd",timeout:8}],l=d=>!Ie(d)||typeof d.command!="string"||!d.command.includes("session:junie-hook")?!1:d.command.includes(at(c))||!d.command.includes("--project");for(let d of a){let O=(Array.isArray(r[d.name])?[...r[d.name]]:[]).map(h=>{if(!Ie(h)||!Array.isArray(h.hooks))return h;let N=h.hooks.filter(oi=>!l(oi));return N.length>0?{...h,hooks:N}:void 0}).filter(h=>h!==void 0);O.push({hooks:[{type:"command",command:s,timeout:d.timeout}]}),r[d.name]=O}n.hooks=r;let u=`${JSON.stringify(n,null,2)}
`,p=!Nn(t)||An(t,"utf8")!==u;return tl(t,n),{configFile:t,changed:p,events:a.map(d=>d.name),installed:!0,fallbackAvailable:!1}}import{existsSync as rm,mkdirSync as ol}from"node:fs";import{dirname as nl}from"node:path";function Mn(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??Qt({cwd:e.cwd});ol(nl(o),{recursive:!0,mode:448});let n=C(o,"Codebuff"),i=n.mcpServers;if(i!==void 0&&!y(i))throw new Error("Invalid existing Codebuff .agents/mcp.json: mcpServers must be an object.");let c=y(i)?{...i}:{},s="toolnet-memory";return y(c[s])&&!e.force?{installed:!0,changed:!1,configFile:o,configured:!0}:(c[s]={command:t,args:["mcp"]},j(o,{...n,mcpServers:c}),{installed:!0,changed:!0,configFile:o,configured:!0})}function Hn(e={}){let t=Mn(e);return{installed:t.installed,changed:t.changed,mcp:t,files:[t.configFile]}}import{existsSync as pm,mkdirSync as rl}from"node:fs";import{dirname as il}from"node:path";function Jn(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??Xt({cwd:e.cwd});rl(il(o),{recursive:!0,mode:448});let n=C(o,"Freebuff"),i=n.mcpServers;if(i!==void 0&&!y(i))throw new Error("Invalid existing Freebuff .agents/mcp.json: mcpServers must be an object.");let c=y(i)?{...i}:{},s="toolnet-memory";return y(c[s])&&!e.force?{installed:!0,changed:!1,configFile:o,configured:!0}:(c[s]={command:t,args:["mcp"]},j(o,{...n,mcpServers:c}),{installed:!0,changed:!0,configFile:o,configured:!0})}function Dn(e={}){let t=Jn(e);return{installed:t.installed,changed:t.changed,mcp:t,files:[t.configFile]}}import{existsSync as Ln,mkdirSync as Cm,readFileSync as qn,renameSync as wm,rmSync as jm,writeFileSync as al}from"node:fs";import{homedir as sl}from"node:os";import{join as $n}from"node:path";function cl(e="toolnet-memory",t={}){return $n(t.home??sl(),".agents","plugins",e)}function _n(e="toolnet-memory",t={}){return $n(cl(e,t),"hooks","hooks.json")}function Gn(e){return`'${e.replace(/'/g,"'\\''")}'`}function ll(e){if(!Ln(e))return{};let t;try{t=JSON.parse(qn(e,"utf8"))}catch{throw new Error(`Invalid existing Goose hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Goose hooks.json at ${e}: root must be a JSON object.`);return t}function Kn(e={}){let t=e.pluginName??"toolnet-memory",o=e.hooksFile??_n(t),n=ll(o),i=e.binary??"toolnet-memory",c=`${Gn(i)} session:goose-hook`,s=`${Gn(i)} session:goose-hook`,r={type:"command",command:c,timeout:30},a={type:"command",command:s,timeout:3},l=n.hooks&&typeof n.hooks=="object"&&!Array.isArray(n.hooks)?n.hooks:{};n.hooks=l;let p=(Array.isArray(l.Stop)?l.Stop:[]).filter(N=>{try{return!JSON.stringify(N).includes("session:goose-hook")}catch{return!0}}),m=(Array.isArray(l.SessionEnd)?l.SessionEnd:[]).filter(N=>{try{return!JSON.stringify(N).includes("session:goose-hook")}catch{return!0}});l.Stop=[...p,{hooks:[r]}],l.SessionEnd=[...m,{hooks:[a]}];let O=JSON.stringify(n,null,2)+`
`,h=!Ln(o)||qn(o,"utf8")!==O;return al(o,O,{encoding:"utf8",mode:384}),{hooksFile:o,changed:h,stopInstalled:!0,sessionEndInstalled:!0}}function Bn(e={}){let t=Kn(e);return{hooksFile:t.hooksFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as Yn,mkdirSync as dl,readFileSync as Vn,renameSync as pl,rmSync as gl,writeFileSync as fl}from"node:fs";import{dirname as ml}from"node:path";import{homedir as ul}from"node:os";import{join as Un}from"node:path";function Wn(e={}){let t=e.projectRoot;return t?Un(t,".qwen","hooks.json"):Un(e.home??ul(),".qwen","hooks.json")}function Qn(e){return`'${e.replace(/'/g,"'\\''")}'`}function yl(e){if(!Yn(e))return{};let t;try{t=JSON.parse(Vn(e,"utf8"))}catch{throw new Error(`Invalid existing Qwen hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Qwen hooks.json at ${e}: root must be a JSON object.`);return t}function hl(e,t){dl(ml(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{fl(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),pl(o,e)}finally{gl(o,{force:!0})}}function Xn(e={}){let t=e.hooksFile??Wn({projectRoot:e.projectRoot}),o=yl(t),n=e.binary??"toolnet-memory",i=`${Qn(n)} session:qwen-hook`,c=`${Qn(n)} session:qwen-hook`,s={type:"command",command:i,timeout:30},r={type:"command",command:c,timeout:3},a=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=a;let u=(Array.isArray(a.Stop)?a.Stop:[]).filter(h=>{try{return!JSON.stringify(h).includes("session:qwen-hook")}catch{return!0}}),d=(Array.isArray(a.SessionEnd)?a.SessionEnd:[]).filter(h=>{try{return!JSON.stringify(h).includes("session:qwen-hook")}catch{return!0}});a.Stop=[...u,{hooks:[s]}],a.SessionEnd=[...d,{hooks:[r]}];let m=JSON.stringify(o,null,2)+`
`,O=!Yn(t)||Vn(t,"utf8")!==m;return hl(t,o),{hooksFile:t,changed:O,stopInstalled:!0,sessionEndInstalled:!0}}function zn(e={}){let t=Xn(e);return{hooksFile:t.hooksFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as or,mkdirSync as Il,readFileSync as Sl,renameSync as Ol,rmSync as Cl,writeFileSync as wl}from"node:fs";import{dirname as jl}from"node:path";import{homedir as kl}from"node:os";import{join as bl}from"node:path";function Zn(e={}){return bl(e.home??kl(),".kimi-code","config.toml")}function er(e){return`'${e.replace(/'/g,"'\\''")}'`}function vl(e){return or(e)?Sl(e,"utf8"):""}function tr(e,t){Il(jl(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{wl(o,t,{encoding:"utf8",mode:384}),Ol(o,e)}finally{Cl(o,{force:!0})}}function nr(e={}){let t=e.configFile??Zn(),o=vl(t),n=e.binary??"toolnet-memory",i=`${er(n)} session:kimi-hook`,c=`${er(n)} session:kimi-hook`,s=`[[hooks]]
name = "toolnet-memory-stop"
event = "Stop"
command = ${i}
timeout = 30
`,r=`[[hooks]]
name = "toolnet-memory-session-end"
event = "SessionEnd"
command = ${c}
timeout = 3
`,a=!1;return o.includes("toolnet-memory-stop")||(o=o.trim()+`

`+s+`
`,a=!0),o.includes("toolnet-memory-session-end")||(o=o.trim()+`

`+r+`
`,a=!0),a?tr(t,o):or(t)||(tr(t,s+`
`+r+`
`),a=!0),{configFile:t,changed:a,stopInstalled:!0,sessionEndInstalled:!0}}function rr(e={}){let t=nr(e);return{configFile:t.configFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as sr,mkdirSync as Rl,readFileSync as El,renameSync as Pl,rmSync as Nl,writeFileSync as Al}from"node:fs";import{dirname as Tl}from"node:path";import{homedir as xl}from"node:os";import{join as Fl}from"node:path";function ir(e={}){return Fl(e.home??xl(),".hermes","config.yaml")}function Ml(e){return`'${e.replace(/'/g,"'\\''")}'`}function Hl(e){return sr(e)?El(e,"utf8"):""}function Jl(e,t){Rl(Tl(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Al(o,t,{encoding:"utf8",mode:384}),Pl(o,e)}finally{Nl(o,{force:!0})}}function cr(e={}){let t=e.configFile??ir(),o=Hl(t),n=e.binary??"toolnet-memory",c=`  - name: toolnet-memory-session-end
    event: on_session_end
    command: ${`${Ml(n)} session:hermes-hook`}
    timeout: 30
`,s=!1;return o.includes("toolnet-memory-session-end")||(o.includes("hooks:")?o=o.replace(/hooks:\n/,`hooks:
${c}`):o=o.trim()+`

hooks:
`+c,s=!0),(s||!sr(t))&&(o.endsWith(`
`)||(o+=`
`),Jl(t,o)),{configFile:t,changed:s,sessionEndInstalled:!0}}function ar(e={}){let t=cr(e);return{configFile:t.configFile,changed:t.changed,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as dr,mkdirSync as _l,readFileSync as pr,renameSync as Gl,rmSync as Ll,writeFileSync as ql}from"node:fs";import{dirname as Kl}from"node:path";import{existsSync as Dl}from"node:fs";import{homedir as $l}from"node:os";import{join as lt}from"node:path";function lr(e={}){let t=e.home??$l();return Dl(lt(t,".qoder-cn"))?lt(t,".qoder-cn","settings.json"):lt(t,".qoder","settings.json")}function ur(e){return`'${e.replace(/'/g,"'\\''")}'`}function Bl(e){if(!dr(e))return{};let t;try{t=JSON.parse(pr(e,"utf8"))}catch{throw new Error(`Invalid existing Qoder settings.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Qoder settings.json at ${e}: root must be a JSON object.`);return t}function Ul(e,t){_l(Kl(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{ql(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Gl(o,e)}finally{Ll(o,{force:!0})}}function gr(e={}){let t=e.settingsFile??lr(),o=Bl(t),n=e.binary??"toolnet-memory",i=`${ur(n)} session:qoder-hook`,c=`${ur(n)} session:qoder-hook`,s={type:"command",command:i,timeout:30},r={type:"command",command:c,timeout:3},a=Array.isArray(o.hooks)?[...o.hooks]:[],u=a.filter(m=>{try{return!JSON.stringify(m).includes("session:qoder-hook")}catch{return!0}}).filter(m=>{try{return!JSON.stringify(m).includes("session:qoder-hook")}catch{return!0}});a.length=0,a.push({...s,event:"Stop"},{...r,event:"SessionEnd"}),o.hooks=a;let p=JSON.stringify(o,null,2)+`
`,d=!dr(t)||pr(t,"utf8")!==p;return Ul(t,o),{settingsFile:t,changed:d,stopInstalled:!0,sessionEndInstalled:!0}}function fr(e={}){let t=gr(e);return{settingsFile:t.settingsFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as Wl,mkdirSync as mr,readFileSync as Ql,renameSync as Yl,rmSync as Vl,writeFileSync as Xl}from"node:fs";import{dirname as zl,join as Se}from"node:path";import{homedir as Zl}from"node:os";function eu(e,t){mr(zl(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Xl(o,t,{encoding:"utf8",mode:493}),Yl(o,e)}finally{Vl(o,{force:!0})}}var ut=`#!/usr/bin/env node
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
`;function yr(e={}){let t=e.cwd?Se(e.cwd,".toolnet","bin"):Se(process.env.TOOLNET_HOME??Se(Zl(),".toolnet"),"bin");mr(t,{recursive:!0,mode:448});let o=Se(t,"aider-wrapper"),n=ut.endsWith(`
`)?ut:ut+`
`,i=!Wl(o)||Ql(o,"utf8")!==n;return eu(o,n),{launcherPath:o,changed:i}}import{existsSync as hr,mkdirSync as tu,readFileSync as kr,renameSync as ou,rmSync as nu,writeFileSync as ru}from"node:fs";import{dirname as iu,join as br}from"node:path";import{homedir as su}from"node:os";function cu(){return process.env.PLANDEX_BASE_DIR??br(su(),"plandex-server")}function au(e){if(!hr(e))return{};let t;try{t=JSON.parse(kr(e,"utf8"))}catch{throw new Error(`Invalid existing Plandex config at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Plandex config at ${e}: root must be a JSON object.`);return t}function lu(e,t){tu(iu(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{ru(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),ou(o,e)}finally{nu(o,{force:!0})}}function Ir(e={}){let t=cu(),o=br(t,"toolnet-memory.json"),n=au(o),i=n.toolnetMemory??{};i.integration="toolnet-memory",i.captureMode="manual-recovery",i.managedBy="toolnet-memory",n.toolnetMemory=i;let c=JSON.stringify(n,null,2)+`
`,s=!hr(o)||kr(o,"utf8")!==c;return lu(o,n),{configPath:o,changed:s}}import{existsSync as Sr,mkdirSync as Or,readFileSync as Cr,renameSync as uu,rmSync as du,writeFileSync as pu}from"node:fs";import{dirname as wr,join as gu}from"node:path";import{homedir as fu}from"node:os";function mu(e){if(!Sr(e))return{};let t;try{t=JSON.parse(Cr(e,"utf8"))}catch{throw new Error(`Invalid existing OpenRouter config at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing OpenRouter config at ${e}: root must be a JSON object.`);return t}function yu(e,t){Or(wr(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{pu(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),uu(o,e)}finally{du(o,{force:!0})}}function jr(e={}){let t=fu(),o=gu(t,".config","openrouter","toolnet-memory.json");Or(wr(o),{recursive:!0,mode:448});let n=mu(o);n.toolnetMemory={integration:"toolnet-memory",captureMode:"blocked-product-identity",managedBy:"toolnet-memory",blocked:!0,reason:"OpenRouter CLI product identity is blocked for ToolNet integration."};let i=JSON.stringify(n,null,2)+`
`,c=!Sr(o)||Cr(o,"utf8")!==i;return yu(o,n),{configPath:o,blocked:!0,changed:c}}import{existsSync as Er,mkdirSync as ku,readFileSync as Pr,renameSync as bu,rmSync as Iu,writeFileSync as Su}from"node:fs";import{dirname as Ou}from"node:path";import{homedir as hu}from"node:os";import{join as vr}from"node:path";function xr(e={}){return vr(e.home??hu(),".bob","settings","settings.json")}function Fr(e){return vr(e,".bob","settings.json")}function Cu(e){if(!Er(e))return{};let t;try{t=JSON.parse(Pr(e,"utf8"))}catch{throw new Error(`Invalid existing Bob settings.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Bob settings.json at ${e}: root must be a JSON object.`);return t}function wu(e,t){ku(Ou(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Su(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),bu(o,e)}finally{Iu(o,{force:!0})}}function Rr(e){return`'${e.replace(/'/g,"'\\''")}'`}function Nr(e={}){let t=e.projectRoot!==void 0?Fr(e.projectRoot):xr({home:e.home}),o=Cu(t),n=e.binary??"toolnet-memory",i=`${Rr(n)} hook ibm-bob`,c=`${Rr(n)} hook ibm-bob`,s={type:"command",command:i,timeout:10},r={type:"command",command:c,timeout:10},a=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=a;let u=(Array.isArray(a.Stop)?a.Stop:[]).filter(h=>{try{return!JSON.stringify(h).includes("hook ibm-bob")}catch{return!0}}),d=(Array.isArray(a.SessionStart)?a.SessionStart:[]).filter(h=>{try{return!JSON.stringify(h).includes("hook ibm-bob")}catch{return!0}});a.Stop=[...u,{hooks:[s]}],a.SessionStart=[...d,{hooks:[r]}];let m=JSON.stringify(o,null,2)+`
`,O=!Er(t)||Pr(t,"utf8")!==m;return wu(t,o),{settingsFile:t,changed:O,stopInstalled:!0,sessionStartInstalled:!0}}function Ar(e={}){let t=Nr(e);return{settingsFile:t.settingsFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionStartInstalled:t.sessionStartInstalled}}import{existsSync as dt,mkdirSync as Hr,readFileSync as pt,renameSync as vu,rmSync as xu,writeFileSync as Fu}from"node:fs";import{dirname as Ru,join as gt}from"node:path";import{homedir as ju}from"node:os";import{join as Tr}from"node:path";function Mr(e){return e?Tr(e,".cline","hooks"):Tr(ju(),"Documents","Cline","Hooks")}function Eu(e){return`'${e.replace(/'/g,"'\\''")}'`}function ft(e,t){Hr(Ru(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Fu(o,t,{encoding:"utf8",mode:493}),vu(o,e)}finally{xu(o,{force:!0})}}function Pu(e){return`#!/bin/sh
exec ${`${Eu(e)} hook cline`}
`}function Jr(e={}){let t=e.binary??"toolnet-memory",o=Mr(e.projectRoot),n=gt(o,"toolnet-memory.sh");Hr(o,{recursive:!0,mode:448});let i=Pu(t),c=!dt(n)||pt(n,"utf8")!==i;ft(n,i);let s=gt(o,"TaskComplete"),r=gt(o,"TaskStart"),a=!1,l=!1;return(!dt(s)||pt(s,"utf8")!==i)&&(ft(s,i),a=!0),(!dt(r)||pt(r,"utf8")!==i)&&(ft(r,i),l=!0),{hooksDir:o,hooksFile:n,changed:c||a||l,taskCompleteInstalled:a,taskStartInstalled:l}}function Dr(e={}){let t=Jr(e);return{hooksFile:t.hooksFile,hooksDir:t.hooksDir,changed:t.changed,taskCompleteInstalled:t.taskCompleteInstalled,taskStartInstalled:t.taskStartInstalled}}import{existsSync as Gr,mkdirSync as Lr,readFileSync as Tu,renameSync as Mu,rmSync as Hu,writeFileSync as Ju}from"node:fs";import{dirname as qr}from"node:path";import{homedir as Nu}from"node:os";import{join as Au}from"node:path";function $r(){return Au(Nu(),".rovodev","config.yml")}function Kr(e){return`'${e.replace(/'/g,"'\\''")}'`}function _r(e,t){Lr(qr(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Ju(o,t,{encoding:"utf8",mode:384}),Mu(o,e)}finally{Hu(o,{force:!0})}}function Du(e){return Gr(e)?Tu(e,"utf8"):""}function $u(e){let t=`  - type: command
    command: ${Kr("toolnet-memory hook rovo")}
    timeout: 10
`;if(e.includes("hooks:")){if(e.includes("toolnet-memory hook rovo"))return e;let o=e.split(`
`),i=o.length-1;for(let c=o.length-1;c>=0&&o[c].trim()==="";c--)i=c;return o.splice(i,0,t),o.join(`
`)}return e+`
hooks:
${t}`}function Br(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??$r();if(Lr(qr(o),{recursive:!0,mode:448}),!Gr(o)){let s=`hooks:
  - type: command
    command: ${Kr(`${t} hook rovo`)}
    timeout: 10
`;return _r(o,s),{configFile:o,changed:!0,hookInstalled:!0}}let n=Du(o),i=$u(n),c=n!==i;return c&&_r(o,i),{configFile:o,changed:c,hookInstalled:c}}function Ur(e={}){let t=Br(e);return{configFile:t.configFile,changed:t.changed,hookInstalled:t.hookInstalled}}import{existsSync as Qr,mkdirSync as Vr,readFileSync as Yr,renameSync as Lu,rmSync as qu,writeFileSync as Ku}from"node:fs";import{dirname as Xr,join as Bu}from"node:path";import{homedir as _u}from"node:os";import{join as Gu}from"node:path";function Wr(){return[Gu(_u(),".warp")]}function Uu(e,t){Vr(Xr(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Ku(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Lu(o,e)}finally{qu(o,{force:!0})}}function zr(e={}){let t=Wr(),o=Bu(t[0],"toolnet-memory.json");Vr(Xr(o),{recursive:!0,mode:448});let n=Qr(o)?JSON.parse(Yr(o,"utf8")):{};n.toolnetMemory={integration:"toolnet-memory",captureMode:"blocked-capability",managedBy:"toolnet-memory",blocked:!0,reason:"Warp Agent CLI capability is blocked for ToolNet integration."};let i=JSON.stringify(n,null,2)+`
`,c=!Qr(o)||Yr(o,"utf8")!==i;return Uu(o,n),{configFile:o,blocked:!0,changed:c}}function Zr(e={}){if(e.scope==="global")return{scope:"global",automatic:!1,reason:"explicit-global"};if(e.scope==="project"||e.scope==="both"){let o=F({cwd:e.cwd,project:e.projectRoot});if(!o.eligible)throw new Error(`Explicit ${e.scope} integration requires an explicit project, ToolNet project, or Git repository root.`);return{scope:e.scope,automatic:!1,project:o,reason:e.scope==="project"?"explicit-project":"explicit-both"}}let t=F({cwd:e.cwd,project:e.projectRoot});return t.toolnetProject?{scope:"both",automatic:!0,project:t,reason:"toolnet-project"}:{scope:"global",automatic:!0,reason:"no-toolnet-project"}}function ei(){return no()}function Wu(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[],n=e.detections??ei(),i=new Map(n.map(s=>[s.agent,s.detected])),c=Zr({scope:e.scope,projectRoot:e.projectRoot,cwd:e.cwd});if(!(e.force===!0||i.get("agy")===!0))o.push({agent:"agy",detected:!1,installed:!1,targets:[]});else try{let r=uo({binary:t});o.push({agent:"agy",detected:!0,installed:!0,targets:r.files})}catch(r){o.push({agent:"agy",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("gemini")===!0))o.push({agent:"gemini",detected:!1,installed:!1,targets:[]});else try{let r=Rn({...e.gemini,binary:t});o.push({agent:"gemini",detected:!0,installed:!0,targets:[r.settingsFile]})}catch(r){o.push({agent:"gemini",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("junie")===!0))o.push({agent:"junie",detected:!1,installed:!1,targets:[]});else{let r=e.junie?.capability??be();if(!r.hooksAvailable||!r.automaticCaptureSupported)o.push({agent:"junie",detected:!0,installed:!1,targets:[],error:`Junie capture blocked: ${r.capabilityReason}. Capture mode: ${r.captureMode}`});else try{let a=e.junie?.projectRoot??c.project?.root??e.projectRoot??e.cwd??process.cwd(),l=Tn({...e.junie?.configFile?{configFile:e.junie.configFile}:{},capability:r,binary:t,projectRoot:a});o.push({agent:"junie",detected:!0,installed:l.installed,targets:l.installed?[l.configFile]:[],...l.installed?{}:{error:l.reason}})}catch(a){o.push({agent:"junie",detected:!0,installed:!1,targets:[],error:a instanceof Error?a.message:String(a)})}}if(!(e.force===!0||i.get("opencode")===!0))o.push({agent:"opencode",detected:!1,installed:!1,targets:[]});else try{let r=ho({binary:t}),a=Oo({binary:t});o.push({agent:"opencode",detected:!0,installed:!0,targets:[...r,a.configFile,`mcp:${a.serverName}`]})}catch(r){o.push({agent:"opencode",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("claude")===!0))o.push({agent:"claude",detected:!1,installed:!1,targets:[]});else try{let r=Lo({binary:t});o.push({agent:"claude",detected:!0,installed:!0,targets:[r.hooks.settingsFile,r.mcp.configFile,`mcp:${r.mcp.serverName}`]})}catch(r){o.push({agent:"claude",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("kiro")===!0))o.push({agent:"kiro",detected:!1,installed:!1,targets:[]});else try{let r=Vo({...e.kiro??{},binary:t});o.push({agent:"kiro",detected:!0,installed:!0,targets:[r.mcp.configFile,`mcp:${r.mcp.serverName}`,r.hooks.hooksFile]})}catch(r){o.push({agent:"kiro",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("cursor")===!0))o.push({agent:"cursor",detected:!1,installed:!1,targets:[]});else try{let r=e.cursor??{},a=gn({...r,binary:t,scope:r.scope??c.scope,projectRoot:r.projectRoot??c.project?.root});o.push({agent:"cursor",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(r){o.push({agent:"cursor",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("copilot")===!0))o.push({agent:"copilot",detected:!1,installed:!1,targets:[]});else try{let r=e.copilot??{},a=bn({...r,binary:t,scope:r.scope??c.scope,projectRoot:r.projectRoot??c.project?.root});o.push({agent:"copilot",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(r){o.push({agent:"copilot",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("grok")===!0))o.push({agent:"grok",detected:!1,installed:!1,targets:[]});else try{let r=e.grok??{},a=vn({...r,binary:t,scope:r.scope??c.scope,projectRoot:r.projectRoot??c.project?.root});o.push({agent:"grok",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(r){o.push({agent:"grok",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("toolnet-cli")===!0))o.push({agent:"toolnet-cli",detected:!1,installed:!1,targets:[]});else try{let r=e.toolnetCli??{},a=zo({...r,binary:t});o.push({agent:"toolnet-cli",detected:!0,installed:!0,targets:[a.mcp.configFile]})}catch(r){o.push({agent:"toolnet-cli",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("kilo")===!0))o.push({agent:"kilo",detected:!1,installed:!1,targets:[]});else try{let r=e.kilo??{},a=en({...r,binary:t});o.push({agent:"kilo",detected:!0,installed:!0,targets:[a.mcp.configFile]})}catch(r){o.push({agent:"kilo",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("codebuff")===!0))o.push({agent:"codebuff",detected:!1,installed:!1,targets:[]});else try{let r=Hn({...e.codebuff,binary:t,...e.codebuff?.cwd||e.cwd?{cwd:e.codebuff?.cwd??e.cwd}:{}});o.push({agent:"codebuff",detected:!0,installed:!0,targets:[r.mcp.configFile]})}catch(r){o.push({agent:"codebuff",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("freebuff")===!0))o.push({agent:"freebuff",detected:!1,installed:!1,targets:[]});else try{let r=Dn({...e.freebuff,binary:t,...e.freebuff?.cwd||e.cwd?{cwd:e.freebuff?.cwd??e.cwd}:{}});o.push({agent:"freebuff",detected:!0,installed:!0,targets:[r.mcp.configFile]})}catch(r){o.push({agent:"freebuff",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}{let s=e.force===!0||i.get("continue")===!0;o.push({agent:"continue",detected:s,installed:s,targets:s?[Zt()]:[]})}if(!(e.force===!0||i.get("codex")===!0))o.push({agent:"codex",detected:!1,installed:!1,targets:[]});else try{let r=xo({binary:t}),a=Ro({binary:t}),l=To({binary:t}),u=Jo({binary:t});if(!u.installed)throw new Error(u.error??"Codex MCP registration failed");let p=[r.configFile,a,l.hooksFile,`mcp:${u.serverName}`];r.preservedPrevious&&p.push(r.previousFile),o.push({agent:"codex",detected:!0,installed:!0,targets:p})}catch(r){o.push({agent:"codex",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("goose")===!0))o.push({agent:"goose",detected:!1,installed:!1,targets:[]});else try{let r=e.goose??{},a=Bn({...r,binary:t});o.push({agent:"goose",detected:!0,installed:!0,targets:[a.hooksFile]})}catch(r){o.push({agent:"goose",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("qwen")===!0))o.push({agent:"qwen",detected:!1,installed:!1,targets:[]});else try{let r=e.qwen??{},a=zn({...r,binary:t});o.push({agent:"qwen",detected:!0,installed:!0,targets:[a.hooksFile]})}catch(r){o.push({agent:"qwen",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("kimi")===!0))o.push({agent:"kimi",detected:!1,installed:!1,targets:[]});else try{let r=e.kimi??{},a=rr({...r,binary:t});o.push({agent:"kimi",detected:!0,installed:!0,targets:[a.configFile]})}catch(r){o.push({agent:"kimi",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("hermes")===!0))o.push({agent:"hermes",detected:!1,installed:!1,targets:[]});else try{let r=e.hermes??{},a=ar({...r,binary:t});o.push({agent:"hermes",detected:!0,installed:!0,targets:[a.configFile]})}catch(r){o.push({agent:"hermes",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("qoder")===!0))o.push({agent:"qoder",detected:!1,installed:!1,targets:[]});else try{let r=e.qoder??{},a=fr({...r,binary:t});o.push({agent:"qoder",detected:!0,installed:!0,targets:[a.settingsFile]})}catch(r){o.push({agent:"qoder",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("aider")===!0))o.push({agent:"aider",detected:!1,installed:!1,targets:[]});else try{let r=e.aider??{},a=yr({...r,binary:t});o.push({agent:"aider",detected:!0,installed:!0,targets:[a.launcherPath]})}catch(r){o.push({agent:"aider",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("plandex")===!0))o.push({agent:"plandex",detected:!1,installed:!1,targets:[]});else try{let r=e.plandex??{},a=Ir({...r,binary:t});o.push({agent:"plandex",detected:!0,installed:!0,targets:[a.configPath]})}catch(r){o.push({agent:"plandex",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("openrouter")===!0))o.push({agent:"openrouter",detected:!1,installed:!1,targets:[]});else try{let r=e.openrouter??{},a=jr({...r,binary:t});o.push({agent:"openrouter",detected:!0,installed:!0,targets:[a.configPath]})}catch(r){o.push({agent:"openrouter",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("bob")===!0))o.push({agent:"bob",detected:!1,installed:!1,targets:[]});else try{let r=e.bob??{},a=Ar({...r,binary:t});o.push({agent:"bob",detected:!0,installed:!0,targets:[a.settingsFile]})}catch(r){o.push({agent:"bob",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("cline")===!0))o.push({agent:"cline",detected:!1,installed:!1,targets:[]});else try{let r=e.cline??{},a=Dr({...r,binary:t});o.push({agent:"cline",detected:!0,installed:!0,targets:[a.hooksFile]})}catch(r){o.push({agent:"cline",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("rovo")===!0))o.push({agent:"rovo",detected:!1,installed:!1,targets:[]});else try{let r=e.rovo??{},a=Ur({...r,binary:t});o.push({agent:"rovo",detected:!0,installed:!0,targets:[a.configFile]})}catch(r){o.push({agent:"rovo",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("warp")===!0))o.push({agent:"warp",detected:!1,installed:!1,targets:[]});else try{let r=e.warp??{},a=zr({...r,binary:t});o.push({agent:"warp",detected:!0,installed:!0,targets:[a.configFile]})}catch(r){o.push({agent:"warp",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}return o}function ti(e){switch(e){case"agy":return"Agy / Antigravity";case"opencode":return"OpenCode";case"claude":return"Claude Code";case"kiro":return"Kiro CLI";case"cursor":return"Cursor CLI";case"copilot":return"GitHub Copilot CLI";case"grok":return"Grok Build";case"toolnet-cli":return"ToolNet CLI";case"kilo":return"Kilo";case"codex":return"Codex";case"goose":return"goose";case"qwen":return"Qwen Code";case"kimi":return"Kimi Code CLI";case"hermes":return"Hermes Agent";case"qoder":return"Qoder CLI";case"aider":return"Aider";case"plandex":return"Plandex";case"openrouter":return"OpenRouter CLI";case"bob":return"IBM Bob Shell";case"cline":return"Cline CLI";case"rovo":return"Rovo Dev CLI";case"warp":return"Warp Agent CLI";case"gemini":return"Gemini CLI";case"junie":return"Junie";case"codebuff":return"Codebuff";case"freebuff":return"Freebuff";case"continue":return"Continue";default:return e}}function Qu(e){console.log(""),console.log("ToolNet Memory Integration Detection"),console.log("===================================="),console.log("");for(let t of e){let o=ti(t.agent);if(!t.detected){console.log(`\u25CB ${o}: not detected`);continue}console.log(`\u2713 ${o}: detected`);for(let n of t.evidence)console.log(`  ${n}`)}console.log("")}var Yu=["claude","cursor","copilot","grok","kiro","opencode","codex","agy"],Vu={opencode:"toolnet-memory session:opencode-sync",codex:"toolnet-memory session:codex-sync",agy:"toolnet-memory session:agy-sync","toolnet-cli":"toolnet-memory session:toolnet-cli-sync"};function Xu(e){if(Yu.includes(e))return"ToolNet integration configured; hooks installed successfully";let t=Vu[e];return t?`ToolNet integration configured; run ${t} to capture session history`:"ToolNet integration configured; capture begins when a supported hook or sync runs"}function zu(e){console.log(""),console.log("ToolNet Memory AI Integrations"),console.log("=============================="),console.log("");for(let t of e){let o=ti(t.agent);if(!t.detected){console.log(`- ${o}: not detected`);continue}if(t.installed){let n=t.scope?` [scope=${t.scope}]`:"";console.log(`\u2713 ${o}: ${Xu(t.agent)}${n}`),t.projectRoot&&console.log(`  project: ${t.projectRoot}`);continue}console.log(`\u2717 ${o}: integration failed`),t.error&&console.log(`  ${t.error}`)}console.log("")}function Zu(e,t){let o=e.indexOf(t);return o>=0?e[o+1]:void 0}function ed(e){return e.includes("--scope")||e.includes("--global")||e.includes("--both")?dn(e):void 0}async function td(){let e=process.argv.slice(2),t=e.includes("--all"),o=e.includes("--json"),n=e.includes("--detect-only"),i=ed(e),c=Zu(e,"--project");if(n){let r=ei();if(o){console.log(JSON.stringify(r,null,2));return}Qu(r);return}let s=Wu({force:t,scope:i,projectRoot:c});if(o){console.log(JSON.stringify(s,null,2));return}zu(s)}var od=process.argv[1]&&(process.argv[1].endsWith("auto-integrate.js")||process.argv[1].endsWith("auto-integrate.ts"));od&&td().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});export{ei as detectAutoIntegrations,Wu as installAutoIntegrations,ti as integrationDisplayName};
