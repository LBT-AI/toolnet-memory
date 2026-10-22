import{existsSync as Vt}from"node:fs";import{homedir as Ri}from"node:os";import{join as b}from"node:path";import{spawnSync as Pi}from"node:child_process";import{homedir as Ur}from"node:os";import{join as P}from"node:path";function lt(e={}){return P(e.home??Ur(),".gemini")}function ut(e={}){return P(lt(e),"antigravity-cli")}function dt(e={}){return P(lt(e),"config")}function W(e={}){return P(dt(e),"mcp_config.json")}function U(e={}){let t=e.cwd??process.cwd();return P(t,".agents","mcp_config.json")}function Q(e="toolnet-memory",t={}){return P(ut(t),"plugins",e)}function pt(e={}){return[ut(e),W(e),dt(e),U(e)]}import{homedir as gt}from"node:os";import{join as F}from"node:path";function E(e={}){let t=process.env.OPENCODE_CONFIG_DIR?.trim();if(t)return t;let o=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return o?F(o,"opencode"):F(e.home??gt(),".config","opencode")}function he(e={}){let t=process.env.OPENCODE_CONFIG?.trim();if(t)return t;let o=e.home??gt(),n=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return n?F(n,"opencode","opencode.json"):F(o,".config","opencode","opencode.json")}function ke(e={}){let t=e.cwd??process.cwd();return F(t,"opencode.json")}function ft(e={}){return F(E(e),"plugins")}function mt(e={}){return F(E(e),"AGENTS.md")}import{homedir as yt}from"node:os";import{join as be}from"node:path";function Ie(e={}){return be(e.home??yt(),".claude")}function ht(e={}){return be(Ie(e),"settings.json")}function kt(e={}){return be(e.home??yt(),".claude.json")}import{homedir as Qr}from"node:os";import{join as R}from"node:path";function Oe(e={}){return e.kiroHome??process.env.KIRO_HOME??R(e.home??Qr(),".kiro")}function Yr(e={}){return R(Oe(e),"settings")}function Y(e={}){return R(Yr(e),"mcp.json")}function Se(e={}){let t=e.cwd??process.cwd();return R(t,".kiro","settings","mcp.json")}function Vr(e={}){return R(Oe(e),"hooks")}function we(e={}){return R(Vr(e),"toolnet-memory.json")}function je(e={}){let t=e.cwd??process.cwd();return R(t,".kiro","hooks","toolnet-memory.json")}function bt(e={}){return[Oe(e),Y(e)]}import{homedir as Xr}from"node:os";import{join as Ce}from"node:path";function It(e={}){return Ce(e.home??Xr(),".toolnetcli")}function zr(e={}){return Ce(It(e),"config.json")}function Ot(e={}){let t=e.cwd??process.cwd();return Ce(t,".toolnet","mcp.json")}function St(e={}){let t=It(e),o=zr(e);return[t,o]}import{homedir as Zr}from"node:os";import{join as xe}from"node:path";function wt(e={}){if(e.kiloHome)return e.kiloHome;if(process.env.KILO_HOME)return process.env.KILO_HOME;let t=e.xdgConfigHome??process.env.XDG_CONFIG_HOME;return t?xe(t,"kilo"):xe(e.home??Zr(),".config","kilo")}function ve(e={}){return xe(wt(e),"kilo.jsonc")}function jt(e={}){let t=wt(e),o=ve(e);return[t,o]}import{homedir as ei}from"node:os";import{join as j,resolve as ti}from"node:path";function V(e={}){return e.cursorHome??j(e.home??ei(),".cursor")}function oi(e={}){return e.cursorConfigDir??process.env.CURSOR_CONFIG_DIR??(e.xdgConfigHome??process.env.XDG_CONFIG_HOME?j(e.xdgConfigHome??process.env.XDG_CONFIG_HOME,"cursor"):void 0)??V(e)}function X(e={}){return j(V(e),"mcp.json")}function z(e={}){return j(V(e),"hooks.json")}function Fe(e){return j(ti(e),".cursor")}function Ct(e){return j(Fe(e),"mcp.json")}function xt(e){return j(Fe(e),"hooks.json")}function ni(e){return j(Fe(e),"rules")}function vt(e){return j(ni(e),"toolnet-memory.mdc")}function Ft(e={}){return Array.from(new Set([V(e),oi(e)]))}import{homedir as ri}from"node:os";import{join as S,resolve as ii}from"node:path";function Re(e={}){return e.copilotHome??process.env.COPILOT_HOME??S(e.home??ri(),".copilot")}function Z(e={}){return S(Re(e),"mcp-config.json")}function si(e={}){return S(Re(e),"hooks")}function ee(e={}){return S(si(e),"toolnet-memory.json")}function Pe(e){return S(ii(e),".github")}function Rt(e){return S(Pe(e),"mcp.json")}function ci(e){return S(Pe(e),"hooks")}function Pt(e){return S(ci(e),"toolnet-memory.json")}function ai(e){return S(Pe(e),"instructions")}function Et(e){return S(ai(e),"toolnet-memory.instructions.md")}function Nt(e={}){return[Re(e)]}import{homedir as li}from"node:os";import{join as I,resolve as ui}from"node:path";function te(e={}){return e.grokHome??process.env.GROK_HOME??I(e.home??li(),".grok")}function oe(e={}){return I(te(e),"config.toml")}function di(e={}){return I(te(e),"hooks")}function ne(e={}){return I(di(e),"toolnet-memory.json")}function pi(e={}){return I(te(e),"skills")}function gi(e={}){return I(pi(e),"toolnet-continuity")}function re(e={}){return I(gi(e),"SKILL.md")}function Ee(e){return I(ui(e),".grok")}function At(e){return I(Ee(e),"config.toml")}function fi(e){return I(Ee(e),"hooks")}function Tt(e){return I(fi(e),"toolnet-memory.json")}function mi(e){return I(Ee(e),"skills")}function yi(e){return I(mi(e),"toolnet-continuity")}function Mt(e){return I(yi(e),"SKILL.md")}function Ht(e={}){return[te(e)]}import{homedir as hi}from"node:os";import{join as Dt}from"node:path";function ki(e={}){return Dt(e.home??hi(),".gemini")}function Ne(e={}){return Dt(ki(e),"settings.json")}function $t(e={}){return[Ne(e)]}import{homedir as bi}from"node:os";import{join as Jt}from"node:path";function Ii(e={}){return Jt(e.home??bi(),".junie")}function Ae(e={}){return Jt(Ii(e),"config.json")}function _t(e={}){return[Ae(e)]}import{homedir as Gt}from"node:os";import{join as Te,resolve as Oi}from"node:path";function Si(e={}){let t=process.env.CODEBUFF_CONFIG_DIR;return t&&t.trim()?Oi(t):Te(e.home??Gt(),".config","manicode")}function Lt(e={}){return Te(e.cwd??process.cwd(),".agents","mcp.json")}function wi(e={}){return Te(e.home??Gt(),".agents","mcp.json")}function qt(e={}){return[Si(e),wi(e)]}import{homedir as Kt}from"node:os";import{join as Me,resolve as ji}from"node:path";function Ci(e={}){let t=process.env.FREEBUFF_CONFIG_DIR;return t&&t.trim()?ji(t):Me(e.home??Kt(),".config","manicode")}function Bt(e={}){return Me(e.cwd??process.cwd(),".agents","mcp.json")}function xi(e={}){return Me(e.home??Kt(),".agents","mcp.json")}function Wt(e={}){return[Ci(e),xi(e)]}import{homedir as vi}from"node:os";import{join as He}from"node:path";function De(e={}){return He(e.home??vi(),".continue")}function Fi(e={}){return He(De(e),"config.yaml")}function Ut(e={}){return He(De(e),"sessions")}function Qt(e={}){return[De(e),Fi(e)]}function Ei(e){return Pi("sh",["-lc",`command -v ${JSON.stringify(e)} >/dev/null 2>&1`],{stdio:"ignore"}).status===0}function f(e){let t=e.commandExists(e.command),o=e.configPaths.filter(c=>Vt(c)),n=o.length>0,i=[];t&&i.push(`command:${e.command}`);for(let c of o)i.push(`config:${c}`);return{agent:e.agent,detected:t||n,commandDetected:t,configDetected:n,evidence:i}}function Yt(e){let t=e.commands.filter(s=>e.commandExists(s)),o=e.configPaths.filter(s=>Vt(s)),n=t.length>0,i=o.length>0,c=[...t.map(s=>`command:${s}`),...o.map(s=>`config:${s}`)];return{agent:e.agent,detected:n||i,commandDetected:n,configDetected:i,evidence:c}}function Xt(e={}){let t=e.home??Ri(),o=e.commandExists??Ei,n=e.codexHome??process.env.CODEX_HOME??b(t,".codex");return[f({agent:"agy",command:"agy",commandExists:o,configPaths:pt({home:t})}),f({agent:"gemini",command:"gemini",commandExists:o,configPaths:$t({home:t})}),f({agent:"junie",command:"junie",commandExists:o,configPaths:_t({home:t})}),f({agent:"codebuff",command:"codebuff",commandExists:o,configPaths:qt({home:t})}),f({agent:"freebuff",command:"freebuff",commandExists:o,configPaths:Wt({home:t})}),f({agent:"continue",command:"cn",commandExists:o,configPaths:Qt({home:t})}),f({agent:"opencode",command:"opencode",commandExists:o,configPaths:[E({home:t,xdgConfigHome:e.xdgConfigHome})]}),f({agent:"claude",command:"claude",commandExists:o,configPaths:[Ie({home:t})]}),f({agent:"kiro",command:"kiro-cli",commandExists:o,configPaths:bt({home:t,kiroHome:e.kiroHome})}),Yt({agent:"cursor",commands:["agent","cursor-agent"],commandExists:o,configPaths:Ft({home:t,cursorHome:e.cursorHome,cursorConfigDir:e.cursorConfigDir,xdgConfigHome:e.xdgConfigHome})}),f({agent:"copilot",command:"copilot",commandExists:o,configPaths:Nt({home:t,copilotHome:e.copilotHome})}),f({agent:"grok",command:"grok",commandExists:o,configPaths:Ht({home:t,grokHome:e.grokHome})}),f({agent:"toolnet-cli",command:"toolnet",commandExists:o,configPaths:St({home:t})}),Yt({agent:"kilo",commands:["kilo","kilo-code"],commandExists:o,configPaths:jt({home:t,kiloHome:e.kiloHome})}),f({agent:"codex",command:"codex",commandExists:o,configPaths:[n]}),f({agent:"goose",command:"goose",commandExists:o,configPaths:[b(t,".agents","plugins")]}),f({agent:"qwen",command:"qwen",commandExists:o,configPaths:[b(t,".qwen")]}),f({agent:"kimi",command:"kimi-code",commandExists:o,configPaths:[b(t,".kimi-code")]}),f({agent:"hermes",command:"hermes",commandExists:o,configPaths:[b(t,".hermes")]}),f({agent:"qoder",command:"qoder",commandExists:o,configPaths:[b(t,".qoder-cn"),b(t,".qoder")]}),f({agent:"aider",command:"aider",commandExists:o,configPaths:[b(t,".aider")]}),f({agent:"plandex",command:"plandex",commandExists:o,configPaths:[b(t,".plandex"),b(t,"plandex-server")]}),f({agent:"openrouter",command:"openrouter",commandExists:o,configPaths:[b(t,".openrouter")]}),f({agent:"bob",command:"bob",commandExists:o,configPaths:[b(t,".bob")]}),f({agent:"cline",command:"cline",commandExists:o,configPaths:[b(t,".cline")]}),f({agent:"rovo",command:"rovo",commandExists:o,configPaths:[b(t,".rovodev"),b(t,".rovo")]}),f({agent:"warp",command:"warp",commandExists:o,configPaths:[b(t,".warp")]})]}import{existsSync as Vi,mkdirSync as no,readFileSync as Xi,renameSync as zi,writeFileSync as Zi}from"node:fs";import{dirname as es,join as se}from"node:path";import{existsSync as Ni,mkdirSync as Ai,readFileSync as Ti,renameSync as Mi,rmSync as Hi,writeFileSync as Di}from"node:fs";import{dirname as $i,join as Ji}from"node:path";function _i(e){return`'${e.replace(/'/g,"'\\''")}'`}function Gi(e){if(!Ni(e))return{};let t;try{t=JSON.parse(Ti(e,"utf8"))}catch{throw new Error(`Invalid existing Agy hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Agy hooks.json at ${e}: root must be a JSON object.`);return t}function Li(e,t){Ai($i(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Di(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Mi(o,e)}finally{Hi(o,{force:!0})}}function zt(e={}){let t=e.pluginName??"toolnet-memory",o=e.hooksFile??Ji(Q(t),"hooks.json"),n=Gi(o),i=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",c=`${_i(i)} session:agy-hook`;return n["toolnet-memory"]={enabled:!0,PreToolUse:[{matcher:"view_file|list_dir|find_by_name|grep_search|run_command",hooks:[{type:"command",command:`${c} pre-tool`,timeout:5}]}],PreInvocation:[{type:"command",command:`${c} pre`,timeout:15}],PostInvocation:[{type:"command",command:`${c} post`,timeout:15}],Stop:[{type:"command",command:`${c} stop`,timeout:30}]},Li(o,n),o}import{existsSync as qi,mkdirSync as Ki,readFileSync as Bi,renameSync as Wi,writeFileSync as Ui}from"node:fs";import{dirname as Qi}from"node:path";function D(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Yi(e,t){Ki(Qi(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;Ui(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Wi(o,e)}function Zt(e){if(!qi(e))return{};let t=Bi(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Agy MCP config at ${e}: parse error. Not overwriting.`)}if(!D(o))throw new Error(`Invalid existing Agy MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function eo(e,t){return D(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function ie(e,t,o,n){let i=Zt(e),c=i.mcpServers;if(c!==void 0&&!D(c))throw new Error(`Invalid existing Agy MCP config: mcpServers must be an object in ${e}.`);let s=D(c)?{...c}:{},r=s[o];if(eo(r,t)&&!n)return{installed:!0,changed:!1};s[o]={command:t,args:["mcp"]};let a={...i,mcpServers:s};Yi(e,a);let u=Zt(e).mcpServers;if(!D(u)||!eo(u[o],t))throw new Error(`Agy MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function to(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",n=e.scope??"global";if(e.configFile)return{...ie(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(n==="both"){let s=W(),r=U({cwd:e.cwd}),a=ie(s,t,o,e.force??!1),l=ie(r,t,o,e.force??!1);return{installed:!0,changed:a.changed||l.changed,configFile:s,serverName:o,command:t,args:["mcp"]}}let i=n==="workspace"?U({cwd:e.cwd}):W();return{...ie(i,t,o,e.force??!1),configFile:i,serverName:o,command:t,args:["mcp"]}}var ts=`# ToolNet Memory Continuity

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
`;function os(e,t){no(es(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;Zi(o,t,{encoding:"utf8",mode:384}),zi(o,e)}function oo(e,t){Vi(e)&&Xi(e,"utf8")===t||os(e,t)}function ro(e={}){let t=e.pluginName??"toolnet-memory",o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.pluginRoot??Q(t),i=se(n,"plugin.json"),c=se(n,"mcp_config.json"),s=se(n,"hooks.json"),r=se(n,"rules","toolnet-memory-continuity.md");return no(n,{recursive:!0,mode:448}),oo(i,`${JSON.stringify({$schema:"https://antigravity.google/schemas/v1/plugin.json",name:t,description:"Persistent project continuity and memory for Antigravity coding sessions."},null,2)}
`),to({configFile:c,binary:o,serverName:"toolnet-memory",force:e.force}),zt({hooksFile:s,binary:o,pluginName:t}),oo(r,`${ts.trim()}
`),{installed:!0,pluginRoot:n,files:[i,c,s,r]}}import{existsSync as rs,mkdirSync as ao,readFileSync as is,writeFileSync as lo}from"node:fs";import{join as so}from"node:path";var ns="memory_agent_ask";function io(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${ns}

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
`.trim()}var co="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",$e="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function ss(e={}){let t=mt();ao(E(),{recursive:!0});let o=`${co}
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


${io()}

${$e}`,n=rs(t)?is(t,"utf8"):"",i=n.indexOf(co),c=n.indexOf($e);return i>=0&&c>=i?n=n.slice(0,i)+o+n.slice(c+$e.length):(n=n.trimEnd(),n&&(n+=`

`),n+=o),lo(t,n.trimEnd()+`
`,{encoding:"utf8",mode:384}),t}function uo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[];o.push(ss({cwd:e.cwd}));let n=e.scope??"global",i=[];if((n==="global"||n==="both")&&i.push(e.directory??ft()),n==="project"||n==="both"){let c=e.cwd??process.cwd();i.push(so(c,".opencode","plugins"))}for(let c of i){ao(c,{recursive:!0});let s=so(c,"toolnet-memory.js"),r=`
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
`;lo(s,r.trimStart(),{encoding:"utf8",mode:384}),o.push(s)}return o}import{existsSync as fo,mkdirSync as cs,readFileSync as as,renameSync as ls,writeFileSync as us}from"node:fs";import{dirname as mo,join as ds}from"node:path";function $(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function ps(e,t){cs(mo(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;us(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),ls(o,e)}function po(e){if(!fo(e))return{};let t=as(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing OpenCode config at ${e}: parse error. Not overwriting.`)}if(!$(o))throw new Error(`Invalid existing OpenCode config at ${e}: root must be a JSON object. Not overwriting.`);return o}function go(e,t){if(!$(e))return!1;let o=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(o)&&o.length===2&&o[0]===t&&o[1]==="mcp"}function ce(e,t,o,n){let i=ds(mo(e),"opencode.jsonc"),c=fo(i)?i:void 0,s=po(e),r=s.mcp;if(r!==void 0&&!$(r))throw new Error(`Invalid existing OpenCode config: mcp must be an object in ${e}.`);let a=$(r)?{...r}:{},l=a[o];if(go(l,t)&&!n)return{installed:!0,changed:!1,preservedJsonc:c};a[o]={type:"local",command:[t,"mcp"],enabled:!0};let u={...s,mcp:a};ps(e,u);let d=po(e);if(!$(d.mcp)||!go(d.mcp[o],t))throw new Error(`OpenCode MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0,preservedJsonc:c}}function yo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",n=e.scope??"global";if(e.configFile)return{...ce(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:[t,"mcp"]};if(n==="both"){let s=he(),r=ke({cwd:e.cwd}),a=ce(s,t,o,e.force??!1),l=ce(r,t,o,e.force??!1);return{installed:!0,changed:a.changed||l.changed,configFile:s,serverName:o,command:[t,"mcp"],preservedJsonc:a.preservedJsonc??l.preservedJsonc}}let i=n==="project"?ke({cwd:e.cwd}):he();return{...ce(i,t,o,e.force??!1),configFile:i,serverName:o,command:[t,"mcp"]}}import{existsSync as gs,mkdirSync as ho,readFileSync as fs,writeFileSync as ko}from"node:fs";import{homedir as bo}from"node:os";import{dirname as Io,join as Je}from"node:path";function ms(e){let t=[],o=/"((?:\\.|[^"\\])*)"|'([^']*)'/g,n;for(;n=o.exec(e);){let i=n[1]??n[2]??"";try{t.push(n[1]!==void 0?JSON.parse(`"${i}"`):i)}catch{t.push(i)}}return t}function Oo(e={}){let t=e.configFile??Je(process.env.CODEX_HOME??Je(bo(),".codex"),"config.toml"),o=e.previousFile??Je(bo(),".config","toolnet-memory","codex-notify-previous.json");ho(Io(t),{recursive:!0}),ho(Io(o),{recursive:!0});let n=gs(t)?fs(t,"utf8"):"",i=e.binary??"toolnet-memory",c=`notify = [${JSON.stringify(i)}, "session:codex-notify"]`,s=n.split(`
`),r=s.findIndex(p=>/^\s*\[/.test(p));r<0&&(r=s.length);let a=-1,l=-1;for(let p=0;p<r;p+=1)if(/^\s*notify\s*=/.test(s[p])){if(a=p,l=p,s[p].includes("[")&&!s[p].includes("]"))for(;l+1<r&&(l+=1,!s[l].includes("]")););break}let u=[];if(a>=0){let p=s.slice(a,l+1).join(`
`);u=ms(p),s.splice(a,l-a+1,c)}else r=s.findIndex(p=>/^\s*\[/.test(p)),r<0&&(r=s.length),s.splice(r,0,c);let d=u.length>=2&&u[u.length-1]==="session:codex-notify";return u.length>0&&!d&&ko(o,JSON.stringify(u,null,2)+`
`,{encoding:"utf8",mode:384}),n=s.join(`
`),n.endsWith(`
`)||(n+=`
`),ko(t,n,{encoding:"utf8",mode:384}),{configFile:t,previousFile:o,preservedPrevious:u.length>0&&!d}}import{existsSync as ys,mkdirSync as hs,readFileSync as ks,writeFileSync as bs}from"node:fs";import{homedir as Is}from"node:os";import{dirname as Os,join as So}from"node:path";function Ss(e){return`'${e.replace(/'/g,"'\\''")}'`}function wo(e={}){let t=e.hooksFile??So(process.env.CODEX_HOME??So(Is(),".codex"),"hooks.json");hs(Os(t),{recursive:!0});let o={};if(ys(t))try{o=JSON.parse(ks(t,"utf8"))}catch(r){throw new Error(`Invalid existing Codex hooks.json: ${r instanceof Error?r.message:String(r)}`)}let n=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=n;let c=(Array.isArray(n.SessionStart)?n.SessionStart:[]).filter(r=>{try{return!JSON.stringify(r).includes("session:codex-context")}catch{return!0}}),s=e.binary??"toolnet-memory";return c.push({matcher:"startup|resume|clear|compact",hooks:[{type:"command",command:`${Ss(s)} session:codex-context`,timeout:15,additionalContextLimit:1e3,statusMessage:"Loading ToolNet project continuity"}]}),n.SessionStart=c,bs(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),t}import{existsSync as jo,mkdirSync as ws,readFileSync as Co,writeFileSync as js}from"node:fs";import{homedir as Cs}from"node:os";import{dirname as xs,join as xo}from"node:path";function vo(e){return`'${e.replace(/'/g,"'\\''")}'`}function Fo(e={}){let t=e.hooksFile??xo(process.env.CODEX_HOME??xo(Cs(),".codex"),"hooks.json");ws(xs(t),{recursive:!0});let o={};if(jo(t))try{o=JSON.parse(Co(t,"utf8"))}catch{throw new Error(`Invalid existing Codex hooks.json at ${t}: parse error. Not overwriting.`)}let n=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=n;let i=e.binary??"toolnet-memory",c=`${vo(i)} session:codex-stop-hook`,s=`${vo(i)} session:codex-session-end`,r={hooks:[{type:"command",command:c,timeout:30}]},a={hooks:[{type:"command",command:s,timeout:3}]},u=(Array.isArray(n.Stop)?n.Stop:[]).filter(k=>{try{return!JSON.stringify(k).includes("session:codex-stop-hook")}catch{return!0}}),p=(Array.isArray(n.SessionEnd)?n.SessionEnd:[]).filter(k=>{try{return!JSON.stringify(k).includes("session:codex-session-end")}catch{return!0}});n.Stop=[...u,r],n.SessionEnd=[...p,a];let g=JSON.stringify(o,null,2)+`
`,y=!jo(t)||Co(t,"utf8")!==g;return js(t,g,{encoding:"utf8",mode:384}),{hooksFile:t,changed:y,stopInstalled:!0,sessionEndInstalled:!0}}import{spawnSync as vs}from"node:child_process";function _e(e,t){return vs(e,t,{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}function Ro(e,t){let o=_e(e,["mcp","get",t,"--json"]);if(o.status!==0||!o.stdout)return null;try{return JSON.parse(o.stdout)}catch{return null}}function Po(e,t){return e.enabled!==!1&&e.transport?.type==="stdio"&&e.transport?.command===t&&Array.isArray(e.transport?.args)&&e.transport?.args.length===1&&e.transport.args[0]==="mcp"}function Eo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.codexBinary??"codex",n=e.serverName??"toolnet-memory",i=Ro(o,n);if(i&&Po(i,t))return{installed:!0,changed:!1,serverName:n,command:t,args:["mcp"]};if(i){let r=_e(o,["mcp","remove",n]);if(r.status!==0)return{installed:!1,changed:!1,serverName:n,command:t,args:["mcp"],error:(r.stderr||r.stdout||"Unable to remove old ToolNet MCP configuration.").trim()}}let c=_e(o,["mcp","add",n,"--",t,"mcp"]);if(c.status!==0)return{installed:!1,changed:!1,serverName:n,command:t,args:["mcp"],error:(c.stderr||c.stdout||"Unable to register ToolNet MCP.").trim()};let s=Ro(o,n);return!s||!Po(s,t)?{installed:!1,changed:!0,serverName:n,command:t,args:["mcp"],error:"Codex accepted MCP registration but verification did not match expected ToolNet command."}:{installed:!0,changed:!0,serverName:n,command:t,args:["mcp"]}}import{existsSync as Fs,mkdirSync as Rs,readFileSync as Ps,renameSync as Es,rmSync as Ns,writeFileSync as As}from"node:fs";import{dirname as Ts}from"node:path";function J(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Ms(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function Hs(e){if(!Fs(e))return{};let t;try{t=JSON.parse(Ps(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude settings.json: ${o instanceof Error?o.message:String(o)}`)}if(!J(t))throw new Error("Invalid existing Claude settings.json: root must be a JSON object.");return t}function ae(e){if(e===void 0)return[];if(!Array.isArray(e))throw new Error("Invalid existing Claude settings.json: hook event must be an array.");let t=[];for(let o of e){if(!J(o)){t.push(o);continue}let n=o.hooks;if(!Array.isArray(n)){t.push(o);continue}let i=n.filter(c=>{if(!J(c))return!0;let s=c.command;return!(typeof s=="string"&&s.includes("session:claude-hook"))});i.length!==0&&t.push({...o,hooks:i})}return t}function le(e,t=10){return{type:"command",command:e,timeout:t}}function Ds(e,t){Rs(Ts(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{As(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Es(o,e)}finally{Ns(o,{force:!0})}}function No(e={}){let t=e.settingsFile??ht(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=Hs(t),i=n.hooks;if(i!==void 0&&!J(i))throw new Error("Invalid existing Claude settings.json: hooks must be an object.");let c=J(i)?{...i}:{},s=`${Ms(o)} session:claude-hook`,r=ae(c.SessionStart);r.push({matcher:"startup|resume|clear|compact",hooks:[le(s)]}),c.SessionStart=r;let a=ae(c.UserPromptSubmit);a.push({hooks:[le(s)]}),c.UserPromptSubmit=a;let l=ae(c.PostToolUse);l.push({matcher:"Edit|Write",hooks:[le(s)]}),c.PostToolUse=l;let u=ae(c.Stop);u.push({hooks:[le(s,30)]}),c.Stop=u;let d={...n,hooks:c},p=JSON.stringify(n),g=JSON.stringify(d);return p===g?{settingsFile:t,changed:!1}:e.dryRun===!0?{settingsFile:t,changed:!0,dryRun:!0}:(Ds(t,d),{settingsFile:t,changed:!0})}import{existsSync as $s,mkdirSync as Js,readFileSync as _s,renameSync as Gs,rmSync as Ls,writeFileSync as qs}from"node:fs";import{dirname as Ks}from"node:path";function _(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Ao(e){if(!$s(e))return{};let t;try{t=JSON.parse(_s(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude Code config: ${o instanceof Error?o.message:String(o)}`)}if(!_(t))throw new Error("Invalid existing Claude Code config: root must be a JSON object.");return t}function To(e,t){if(!_(e))return!1;let o=e.args;return e.type==="stdio"&&e.command===t&&Array.isArray(o)&&o.length===1&&o[0]==="mcp"}function Bs(e,t){Js(Ks(e),{recursive:!0});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{qs(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Gs(o,e)}finally{Ls(o,{force:!0})}}function Mo(e={}){let t=e.stateFile??kt(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",i=Ao(t),c=i.mcpServers;if(c!==void 0&&!_(c))throw new Error("Invalid existing Claude Code config: mcpServers must be an object.");let s=_(c)?{...c}:{},r=s[n];if(To(r,o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:[o,"mcp"],repaired:!1};let a=r!==void 0;if(s[n]={type:"stdio",command:o,args:["mcp"]},e.dryRun===!0)return{installed:!0,changed:!0,configFile:t,serverName:n,command:[o,"mcp"],repaired:a,dryRun:!0};Bs(t,{...i,mcpServers:s});let u=Ao(t).mcpServers;if(!_(u)||!To(u[n],o))throw new Error("Claude Code MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:[o,"mcp"],repaired:a}}function Ho(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=No({binary:t,settingsFile:e.settingsFile,...e.dryRun!==void 0?{dryRun:e.dryRun}:{}}),n=Mo({binary:t,stateFile:e.stateFile,...e.dryRun!==void 0?{dryRun:e.dryRun}:{}});return{hooks:o,mcp:n,files:[o.settingsFile,n.configFile]}}import{existsSync as Ws,mkdirSync as Us,readFileSync as Qs,renameSync as Ys,rmSync as Vs,writeFileSync as Xs}from"node:fs";import{dirname as zs}from"node:path";var N="ToolNet Memory - ";function Jo(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Zs(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function Do(e){if(!Ws(e))return{};let t=Qs(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro hooks file at ${e}: parse error. Not overwriting.`)}if(!Jo(o))throw new Error(`Invalid existing Kiro hooks file at ${e}: root must be a JSON object. Not overwriting.`);return o}function $o(e){return Jo(e)?typeof e.name=="string"&&e.name.startsWith(N):!1}function G(e){return{type:"command",command:e}}function ec(e){return[{name:`${N}Session Start`,description:"Inject compact local ToolNet continuity and capture Kiro session activation.",trigger:"SessionStart",action:G(e),timeout:10,enabled:!0},{name:`${N}Prompt Continuity`,description:"Capture prompts and refresh ToolNet guidance only for resume/continue requests.",trigger:"UserPromptSubmit",action:G(e),timeout:10,enabled:!0},{name:`${N}Raw History Guard`,description:"Prevent Kiro from reconstructing continuity from raw ToolNet/agent session history.",trigger:"PreToolUse",matcher:"*",action:G(e),timeout:10,enabled:!0},{name:`${N}Tool Capture`,description:"Capture durable tool activity while filtering noisy read-only events.",trigger:"PostToolUse",matcher:"*",action:G(e),timeout:15,enabled:!0},{name:`${N}Final Flush`,description:"Flush pending Kiro WAL events when the assistant finishes a turn.",trigger:"Stop",action:G(e),timeout:30,enabled:!0}]}function tc(e,t){Us(zs(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Xs(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Ys(o,e)}finally{Vs(o,{force:!0})}}function ue(e,t,o){let n=Do(e);if(n.version!==void 0&&n.version!=="v1")throw new Error(`Unsupported existing Kiro hooks version: ${String(n.version)}`);let i=n.hooks;if(i!==void 0&&!Array.isArray(i))throw new Error("Invalid existing Kiro hooks file: hooks must be an array.");let c=Array.isArray(i)?i.filter(l=>!$o(l)):[],s=ec(t),r={...n,version:"v1",hooks:[...c,...s]};if(!o&&JSON.stringify(n)===JSON.stringify(r))return{changed:!1,hookCount:s.length};tc(e,r);let a=Do(e);if(a.version!=="v1"||!Array.isArray(a.hooks)||a.hooks.filter($o).length!==s.length)throw new Error("Kiro hooks were written but verification failed.");return{changed:!0,hookCount:s.length}}function _o(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=`${Zs(t)} session:kiro-hook`;if(e.hooksFile){let s=ue(e.hooksFile,n,e.force??!1);return{hooksFile:e.hooksFile,...s}}if(o==="both"){let s=we(),r=je({cwd:e.cwd}),a=ue(s,n,e.force??!1),l=ue(r,n,e.force??!1);return{hooksFile:s,changed:a.changed||l.changed,hookCount:a.hookCount}}let i=o==="project"?je({cwd:e.cwd}):we(),c=ue(i,n,e.force??!1);return{hooksFile:i,...c}}import{existsSync as oc,mkdirSync as nc,readFileSync as rc,renameSync as ic,rmSync as sc,writeFileSync as cc}from"node:fs";import{dirname as ac}from"node:path";function L(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Go(e){if(!oc(e))return{};let t=rc(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro MCP config at ${e}: parse error. Not overwriting.`)}if(!L(o))throw new Error(`Invalid existing Kiro MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Lo(e,t){return L(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&e.disabled===!1:!1}function lc(e,t){nc(ac(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{cc(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),ic(o,e)}finally{sc(o,{force:!0})}}function de(e,t,o,n){let i=Go(e),c=i.mcpServers;if(c!==void 0&&!L(c))throw new Error(`Invalid existing Kiro MCP config: mcpServers must be an object in ${e}.`);let s=L(c)?{...c}:{},r=s[o];if(Lo(r,t)&&!n)return{installed:!0,changed:!1};s[o]={command:t,args:["mcp"],disabled:!1};let a={...i,mcpServers:s};lc(e,a);let u=Go(e).mcpServers;if(!L(u)||!Lo(u[o],t))throw new Error(`Kiro MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function qo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",n=e.scope??"global";if(e.configFile)return{...de(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(n==="both"){let s=Y(),r=Se({cwd:e.cwd}),a=de(s,t,o,e.force??!1),l=de(r,t,o,e.force??!1);return{installed:!0,changed:a.changed||l.changed,configFile:s,serverName:o,command:t,args:["mcp"]}}let i=n==="project"?Se({cwd:e.cwd}):Y();return{...de(i,t,o,e.force??!1),configFile:i,serverName:o,command:t,args:["mcp"]}}function Ko(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=qo({binary:t,configFile:e.configFile,scope:e.scope,cwd:e.cwd,force:e.force}),n=_o({binary:t,hooksFile:e.hooksFile,scope:e.scope,cwd:e.cwd,force:e.force});return{installed:o.installed,changed:o.changed||n.changed,mcp:o,hooks:n,files:[o.configFile,n.hooksFile]}}import{existsSync as uc,mkdirSync as dc,readFileSync as pc,renameSync as gc,rmSync as fc,writeFileSync as mc}from"node:fs";import{dirname as yc}from"node:path";function Ge(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function hc(e){if(!uc(e))return{};let t=pc(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: parse error. Not overwriting.`)}if(!Ge(o))throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function kc(e,t){dc(yc(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{mc(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),gc(o,e)}finally{fc(o,{force:!0})}}function Bo(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??Ot({cwd:e.cwd}),n=hc(o),i="toolnet-memory";if(Ge(n.mcpServers)&&n.mcpServers[i]!=null&&!e.force)return{installed:!0,changed:!1,configFile:o};let s=Ge(n.mcpServers)?{...n.mcpServers}:{};return s[i]={command:t,args:["mcp"]},n.mcpServers=s,kc(o,n),{installed:!0,changed:!0,configFile:o}}function Wo(e={}){let t=e.binary??"toolnet-memory",o=Bo({binary:t,configFile:e.configFile,force:e.force,cwd:e.cwd});return{installed:o.installed,changed:o.changed,mcp:{...o,configured:o.installed},files:[o.configFile]}}import{mkdirSync as xc,existsSync as vc}from"node:fs";import{dirname as Fc}from"node:path";import{existsSync as bc,mkdirSync as Ic,readFileSync as Oc,renameSync as Sc,rmSync as wc,writeFileSync as jc}from"node:fs";import{dirname as Cc}from"node:path";function m(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function O(e,t){if(!bc(e))return{};let o=Oc(e,"utf8").trim();if(!o)return{};let n;try{n=JSON.parse(o)}catch(i){throw new Error(`Invalid existing ${t} MCP config: ${i instanceof Error?i.message:String(i)}`)}if(!m(n))throw new Error(`Invalid existing ${t} MCP config: root must be a JSON object.`);return n}function w(e,t){Ic(Cc(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{jc(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Sc(o,e)}finally{wc(o,{force:!0})}}function Uo(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??ve(),n=Fc(o);vc(n)||xc(n,{recursive:!0});let i=O(o,"Kilo"),c=i.mcp;if(c!==void 0&&!m(c))throw new Error("Invalid existing Kilo config: mcp must be an object.");let s=m(c)?{...c}:{},r="toolnet-memory";return m(s[r])&&!e.force?{installed:!0,changed:!1,configFile:o,configured:!0}:(s[r]={type:"local",command:[t,"mcp"],enabled:!0,timeout:1e4},w(o,{...i,mcp:s}),{installed:!0,changed:!0,configFile:o,configured:!0})}function Qo(e={}){let t=e.binary??"toolnet-memory",o=Uo({binary:t,configFile:e.configFile,force:e.force});return{installed:o.installed,changed:o.changed,mcp:o,files:[o.configFile]}}import{existsSync as Rc,mkdirSync as Pc,readFileSync as Ec,renameSync as Nc,rmSync as Ac,writeFileSync as Tc}from"node:fs";import{dirname as Mc}from"node:path";function h(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function C(e,t){if(!Rc(e))return{};let o=Ec(e,"utf8").trim();if(!o)return{};let n;try{n=JSON.parse(o)}catch(i){throw new Error(`Invalid existing ${t} hooks file: ${i instanceof Error?i.message:String(i)}`)}if(!h(n))throw new Error(`Invalid existing ${t} hooks file: root must be a JSON object.`);return n}function A(e,t){Pc(Mc(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Tc(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Nc(o,e)}finally{Ac(o,{force:!0})}}function Le(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}var q=[["sessionStart",10],["beforeSubmitPrompt",10],["preToolUse",10],["postToolUse",15],["afterAgentResponse",15],["stop",30]];function Yo(e){return h(e)&&typeof e.command=="string"&&e.command.includes("session:cursor-hook")}function Hc(e,t,o){let i={type:"command",command:`TOOLNET_HOOK_EVENT=${Le(e)} ${Le(t)} session:cursor-hook`,timeout:o};return e==="preToolUse"&&(i.matcher=".*"),i}function qe(e={}){let t=e.hooksFile??z(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=C(t,"Cursor");if(n.version!==void 0&&n.version!==1)throw new Error(`Unsupported existing Cursor hooks version: ${String(n.version)}`);let i=n.hooks;if(i!==void 0&&!h(i))throw new Error("Invalid existing Cursor hooks file: hooks must be an object.");let c=h(i)?{...i}:{};for(let[l,u]of q){let d=c[l];if(d!==void 0&&!Array.isArray(d))throw new Error(`Invalid existing Cursor hooks file: hooks.${l} must be an array.`);let p=Array.isArray(d)?d.filter(g=>!Yo(g)):[];c[l]=[...p,Hc(l,o,u)]}let s={...n,version:1,hooks:c};if(JSON.stringify(n)===JSON.stringify(s))return{hooksFile:t,changed:!1,hookCount:q.length};A(t,s);let r=C(t,"Cursor");if(r.version!==1||!h(r.hooks))throw new Error("Cursor hooks were written but verification failed.");let a=0;for(let[l]of q){let u=r.hooks[l];if(!Array.isArray(u))throw new Error("Cursor hooks were written but verification failed.");a+=u.filter(Yo).length}if(a!==q.length)throw new Error("Cursor hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:q.length}}function Vo(e,t){return m(e)?(e.type===void 0||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function Ke(e={}){let t=e.configFile??X(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",i=O(t,"Cursor"),c=i.mcpServers;if(c!==void 0&&!m(c))throw new Error("Invalid existing Cursor MCP config: mcpServers must be an object.");let s=m(c)?{...c}:{};if(Vo(s[n],o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};s[n]={type:"stdio",command:o,args:["mcp"]},w(t,{...i,mcpServers:s});let a=O(t,"Cursor").mcpServers;if(!m(a)||!Vo(a[n],o))throw new Error("Cursor MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}import{mkdirSync as Dc,readFileSync as Xo,renameSync as $c,rmSync as Jc,writeFileSync as _c}from"node:fs";import{dirname as Gc}from"node:path";var Be=`---
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
`;function Lc(e,t){Dc(Gc(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{_c(o,t,{encoding:"utf8",mode:384}),$c(o,e)}finally{Jc(o,{force:!0})}}function zo(e){let t=e.ruleFile??vt(e.projectRoot);try{if(Xo(t,"utf8")===Be)return{ruleFile:t,changed:!1}}catch{}if(Lc(t,Be),Xo(t,"utf8")!==Be)throw new Error("Cursor ToolNet project rule was written but verification failed.");return{ruleFile:t,changed:!0}}import{spawnSync as qc}from"node:child_process";import{existsSync as T,statSync as Kc}from"node:fs";import{dirname as Bc,join as Wc,parse as Uc,resolve as Ue}from"node:path";function Zo(e){let t=Ue(e);if(!T(t))throw new Error(`Project path does not exist: ${t}`);if(!Kc(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);return t}function pe(e){return Wc(e,".toolnet","project.json")}function Qc(e){let t=Ue(e),o=Uc(t).root;for(;;){if(T(pe(t)))return t;if(t===o)return;let n=Bc(t);if(n===t)return;t=n}}function We(e){let t=qc("git",["rev-parse","--show-toplevel"],{cwd:e,encoding:"utf8",timeout:5e3});if(t.status!==0)return;let o=t.stdout.trim();return o?Ue(o):void 0}function x(e={}){let t=Zo(e.cwd??process.cwd());if(e.project){let i=Zo(e.project),c=pe(i),s=We(i);return{root:i,source:"explicit",eligible:!0,toolnetProject:T(c),manifestFile:T(c)?c:void 0,gitRoot:s}}let o=Qc(t);if(o){let i=pe(o);return{root:o,source:"toolnet",eligible:!0,toolnetProject:!0,manifestFile:i,gitRoot:We(o)}}let n=We(t);if(n){let i=pe(n);return{root:n,source:"git",eligible:!0,toolnetProject:T(i),manifestFile:T(i)?i:void 0,gitRoot:n}}return{root:t,source:"cwd",eligible:!1,toolnetProject:!1}}function nn(e,t={}){let o=[],n=e.indexOf("--scope");if(n>=0){let c=e[n+1];if(c!=="global"&&c!=="project"&&c!=="both")throw new Error(`Invalid --scope value: ${String(c)}`);o.push(c)}e.includes("--global")&&o.push("global"),e.includes("--both")&&o.push("both");let i=Array.from(new Set(o));if(i.length>1)throw new Error(`Conflicting integration scopes: ${i.join(", ")}`);return i[0]??t.defaultScope??"global"}function en(e,t){return{install:e,effective:t}}function v(e,t){return{surface:e,global:en(t.globalInstall,t.effective==="global"||t.effective==="both"),project:en(t.projectInstall,t.effective==="project"||t.effective==="both"),effective:t.effective,risk:t.risk??"none",dedupeRequired:t.dedupeRequired??!1,trustRequired:t.trustRequired??t.projectInstall,note:t.note}}function Yc(e){return{mcp:v("mcp",{globalInstall:!0,projectInstall:!1,effective:"global"}),hooks:v("hooks",{globalInstall:!0,projectInstall:!1,effective:"global"}),work:v("work",{globalInstall:e==="grok",projectInstall:!1,effective:e==="grok"?"global":"none",note:e==="grok"?"Grok supports a global ToolNet continuity skill.":"Cursor/Copilot work instructions remain project-scoped."})}}function tn(e){return{mcp:v("mcp",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),hooks:v("hooks",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),work:v("work",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!1,note:e==="cursor"?"Use .cursor/rules/toolnet-memory.mdc.":e==="copilot"?"Use .github/instructions/toolnet-memory.instructions.md.":"Use .grok/skills/toolnet-continuity/SKILL.md."})}}function on(e){return{mcp:v("mcp",{globalInstall:!0,projectInstall:!0,effective:"project",risk:e==="cursor"?"precedence-unverified":"shadowed-global",trustRequired:!0,note:e==="cursor"?"Project ToolNet MCP is the intended effective definition; native same-name precedence must be E2E certified before release.":"Global remains useful outside the project; same-name project definition wins inside the project."}),hooks:v("hooks",{globalInstall:!0,projectInstall:!0,effective:"both",risk:"additive-duplicate",dedupeRequired:!0,trustRequired:!0,note:"Global and project hook sources can both execute for the same native event."}),work:v("work",{globalInstall:e==="grok",projectInstall:!0,effective:"project",risk:e==="grok"?"shadowed-global":"none",trustRequired:!1,note:e==="cursor"?"Project rule is authoritative.":e==="copilot"?"Project instruction is authoritative.":"Project skill shadows the same-name global skill inside the project."})}}function M(e){let{agent:t,scope:o,project:n}=e;return(o==="project"||o==="both")&&(!n||!n.eligible)?{agent:t,requestedScope:o,project:n,surfaces:o==="both"?on(t):tn(t),canInstall:!1,reason:"Project scope requires an explicit project, existing ToolNet project, or Git repository root."}:{agent:t,requestedScope:o,project:n,surfaces:o==="global"?Yc(t):o==="project"?tn(t):on(t),canInstall:!0}}function rn(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.rule?.changed)}function sn(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=o==="global"?void 0:x({project:e.projectRoot}),i=M({agent:"cursor",scope:o,project:n});if(!i.canInstall)throw new Error(i.reason??"Cursor project integration scope cannot be resolved.");let c,s;if((i.surfaces.mcp.global.install||i.surfaces.hooks.global.install||i.surfaces.work.global.install)&&(c={},i.surfaces.mcp.global.install&&(c.mcp=Ke({binary:t,configFile:e.configFile??X()})),i.surfaces.hooks.global.install&&(c.hooks=qe({binary:t,hooksFile:e.hooksFile??z()}))),i.surfaces.mcp.project.install||i.surfaces.hooks.project.install||i.surfaces.work.project.install){if(!n?.eligible)throw new Error("Cursor project integration requires an eligible project root.");s={},i.surfaces.mcp.project.install&&(s.mcp=Ke({binary:t,configFile:e.projectConfigFile??Ct(n.root)})),i.surfaces.hooks.project.install&&(s.hooks=qe({binary:t,hooksFile:e.projectHooksFile??xt(n.root)})),i.surfaces.work.project.install&&(s.rule=zo({projectRoot:n.root,ruleFile:e.projectRuleFile}))}let r=s?.mcp??c?.mcp,a=s?.hooks??c?.hooks;if(!r||!a)throw new Error("Cursor integration did not produce an effective MCP/hooks installation.");let l=Array.from(new Set([c?.mcp?.configFile,c?.hooks?.hooksFile,c?.rule?.ruleFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.rule?.ruleFile].filter(u=>typeof u=="string")));return{installed:!0,changed:rn(c)||rn(s),scope:o,plan:i,project:n,global:c,projectScope:s,mcp:r,hooks:a,rule:s?.rule,files:l}}var K=[["sessionStart",10],["userPromptSubmitted",10],["userPromptTransformed",10],["preToolUse",10],["postToolUse",15],["agentStop",30]];function Vc(e){if(typeof e.command=="string")return e.command;if(typeof e.bash=="string")return e.bash}function cn(e){return h(e)&&Vc(e)?.includes("session:copilot-hook")===!0}function Xc(e,t,o){let n={type:"command",command:`${t} session:copilot-hook`,env:{TOOLNET_HOOK_EVENT:e},timeoutSec:o};return e==="preToolUse"&&(n.matcher=".*"),n}function Qe(e={}){let t=e.hooksFile??ee(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=C(t,"GitHub Copilot CLI");if(n.version!==void 0&&n.version!==1)throw new Error(`Unsupported existing GitHub Copilot CLI hooks version: ${String(n.version)}`);let i=n.hooks;if(i!==void 0&&!h(i))throw new Error("Invalid existing GitHub Copilot CLI hooks file: hooks must be an object.");let c=h(i)?{...i}:{};for(let[l,u]of K){let d=c[l];if(d!==void 0&&!Array.isArray(d))throw new Error(`Invalid existing GitHub Copilot CLI hooks file: hooks.${l} must be an array.`);let p=Array.isArray(d)?d.filter(g=>!cn(g)):[];c[l]=[...p,Xc(l,o,u)]}let s={...n,version:1,hooks:c};if(JSON.stringify(n)===JSON.stringify(s))return{hooksFile:t,changed:!1,hookCount:K.length};A(t,s);let r=C(t,"GitHub Copilot CLI");if(r.version!==1||!h(r.hooks))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");let a=0;for(let[l]of K){let u=r.hooks[l];if(!Array.isArray(u))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");a+=u.filter(cn).length}if(a!==K.length)throw new Error("GitHub Copilot CLI hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:K.length}}function an(e,t){return m(e)?(e.type===void 0||e.type==="local"||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&Array.isArray(e.tools)&&e.tools.length===1&&e.tools[0]==="*":!1}function Ye(e={}){let t=e.configFile??Z(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",i=O(t,"GitHub Copilot CLI"),c=i.mcpServers;if(c!==void 0&&!m(c))throw new Error("Invalid existing GitHub Copilot CLI MCP config: mcpServers must be an object.");let s=m(c)?{...c}:{};if(an(s[n],o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};s[n]={type:"stdio",command:o,args:["mcp"],tools:["*"]},w(t,{...i,mcpServers:s});let a=O(t,"GitHub Copilot CLI").mcpServers;if(!m(a)||!an(a[n],o))throw new Error("GitHub Copilot CLI MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}import{mkdirSync as zc,readFileSync as ln,renameSync as Zc,rmSync as ea,writeFileSync as ta}from"node:fs";import{dirname as oa}from"node:path";var Ve=`---
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
`;function na(e,t){zc(oa(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{ta(o,t,{encoding:"utf8",mode:384}),Zc(o,e)}finally{ea(o,{force:!0})}}function un(e){let t=e.instructionFile??Et(e.projectRoot);try{if(ln(t,"utf8")===Ve)return{instructionFile:t,changed:!1}}catch{}if(na(t,Ve),ln(t,"utf8")!==Ve)throw new Error("Copilot ToolNet project instruction verification failed.");return{instructionFile:t,changed:!0}}function dn(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.instruction?.changed)}function pn(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=o==="global"?void 0:x({project:e.projectRoot}),i=M({agent:"copilot",scope:o,project:n});if(!i.canInstall)throw new Error(i.reason??"Copilot project integration scope cannot be resolved.");let c,s;if((i.surfaces.mcp.global.install||i.surfaces.hooks.global.install||i.surfaces.work.global.install)&&(c={},i.surfaces.mcp.global.install&&(c.mcp=Ye({binary:t,configFile:e.configFile??Z()})),i.surfaces.hooks.global.install&&(c.hooks=Qe({binary:t,hooksFile:e.hooksFile??ee()}))),i.surfaces.mcp.project.install||i.surfaces.hooks.project.install||i.surfaces.work.project.install){if(!n?.eligible)throw new Error("Copilot project integration requires an eligible project root.");s={},i.surfaces.mcp.project.install&&(s.mcp=Ye({binary:t,configFile:e.projectConfigFile??Rt(n.root)})),i.surfaces.hooks.project.install&&(s.hooks=Qe({binary:t,hooksFile:e.projectHooksFile??Pt(n.root)})),i.surfaces.work.project.install&&(s.instruction=un({projectRoot:n.root,instructionFile:e.projectInstructionFile}))}let r=s?.mcp??c?.mcp,a=s?.hooks??c?.hooks;if(!r||!a)throw new Error("Copilot integration did not produce effective MCP/hooks.");let l=Array.from(new Set([c?.mcp?.configFile,c?.hooks?.hooksFile,c?.instruction?.instructionFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.instruction?.instructionFile].filter(u=>typeof u=="string")));return{installed:!0,changed:dn(c)||dn(s),scope:o,plan:i,project:n,global:c,projectScope:s,mcp:r,hooks:a,instruction:s?.instruction,files:l}}import{existsSync as ra,mkdirSync as ia,readFileSync as gn,renameSync as sa,rmSync as ca,writeFileSync as aa}from"node:fs";import{dirname as la}from"node:path";var Xe=`---
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
`;function ua(e,t){ia(la(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{aa(o,t,{encoding:"utf8",mode:384}),sa(o,e)}finally{ca(o,{force:!0})}}function ze(e={}){let t=e.skillFile??re();if(ra(t)&&gn(t,"utf8")===Xe)return{skillFile:t,changed:!1};if(ua(t,Xe),gn(t,"utf8")!==Xe)throw new Error("Grok ToolNet continuity skill was written but verification failed.");return{skillFile:t,changed:!0}}var B=[["SessionStart",10],["UserPromptSubmit",10],["PreToolUse",10],["PostToolUse",15],["Stop",30]];function fn(e){return!h(e)||!Array.isArray(e.hooks)?!1:e.hooks.some(t=>h(t)&&typeof t.command=="string"&&t.command.includes("session:grok-hook"))}function da(e,t,o){let n={hooks:[{type:"command",command:`${t} session:grok-hook`,timeout:o,env:{TOOLNET_HOOK_EVENT:e}}]};return e==="PreToolUse"&&(n.matcher=".*"),n}function Ze(e={}){let t=e.hooksFile??ne(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=C(t,"Grok Build"),i=n.hooks;if(i!==void 0&&!h(i))throw new Error("Invalid existing Grok Build hooks file: hooks must be an object.");let c=h(i)?{...i}:{};for(let[l,u]of B){let d=c[l];if(d!==void 0&&!Array.isArray(d))throw new Error(`Invalid existing Grok Build hooks file: hooks.${l} must be an array.`);let p=Array.isArray(d)?d.filter(g=>!fn(g)):[];c[l]=[...p,da(l,o,u)]}let s={...n,hooks:c};if(JSON.stringify(n)===JSON.stringify(s))return{hooksFile:t,changed:!1,hookCount:B.length};A(t,s);let r=C(t,"Grok Build");if(!h(r.hooks))throw new Error("Grok Build hooks were written but verification failed.");let a=0;for(let[l]of B){let u=r.hooks[l];if(!Array.isArray(u))throw new Error("Grok Build hooks were written but verification failed.");a+=u.filter(fn).length}if(a!==B.length)throw new Error("Grok Build hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:B.length}}import{existsSync as pa,mkdirSync as ga,readFileSync as fa,renameSync as ma,rmSync as ya,writeFileSync as ha}from"node:fs";import{dirname as ka}from"node:path";function mn(e){return pa(e)?fa(e,"utf8"):""}function ba(e,t){ga(ka(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{ha(o,t,{encoding:"utf8",mode:384}),ma(o,e)}finally{ya(o,{force:!0})}}function et(e){return e.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t")}function Ia(e){return`[mcp_servers."${et(e)}"]`}function Oa(e,t){return[Ia(e),`command = "${et(t)}"`,'args = ["mcp"]',"enabled = true"].join(`
`)}function Sa(e){let t=e.trim();return t.startsWith("[")&&t.includes("]")}function ge(e){return e.trim().replace(/\s+/g,"")}function wa(e){return new Set([ge(`[mcp_servers.${e}]`),ge(`[mcp_servers."${e}"]`),ge(`[mcp_servers.'${e}']`)])}function hn(e,t){let o=e.split(/\r?\n/),n=wa(t),i=-1;for(let u=0;u<o.length;u+=1){let d=ge(o[u].replace(/\s+#.*$/,""));if(n.has(d)){i=u;break}}if(i<0)return null;let c=o.length;for(let u=i+1;u<o.length;u+=1)if(Sa(o[u])){c=u;break}let s=[],r=0;for(let u of o)s.push(r),r+=u.length+1;let a=s[i]??0,l=c>=o.length?e.length:s[c]??e.length;return{start:a,end:l}}function ja(e,t,o){let n=`${Oa(t,o)}
`,i=hn(e,t);if(i){let c=e.slice(0,i.start),s=e.slice(i.end);return`${c}${n}${s.replace(/^\n+/,"")}`}return e.trim()?`${e.replace(/\s*$/,"")}

${n}`:n}function yn(e,t,o){let n=hn(e,t);if(!n)return!1;let i=e.slice(n.start,n.end);return i.includes(`command = "${et(o)}"`)&&/args\s*=\s*\[\s*"mcp"\s*\]/.test(i)&&/enabled\s*=\s*true/.test(i)}function tt(e={}){let t=e.configFile??oe(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",i=mn(t);if(yn(i,n,o))return{installed:!0,changed:!1,configFile:t,serverName:n,command:o,args:["mcp"]};let c=ja(i,n,o);ba(t,c);let s=mn(t);if(!yn(s,n,o))throw new Error("Grok Build MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:n,command:o,args:["mcp"]}}function kn(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.skill?.changed)}function bn(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",n=o==="global"?void 0:x({project:e.projectRoot}),i=M({agent:"grok",scope:o,project:n});if(!i.canInstall)throw new Error(i.reason??"Grok project integration scope cannot be resolved.");let c,s;if((i.surfaces.mcp.global.install||i.surfaces.hooks.global.install||i.surfaces.work.global.install)&&(c={},i.surfaces.mcp.global.install&&(c.mcp=tt({binary:t,configFile:e.configFile??oe()})),i.surfaces.hooks.global.install&&(c.hooks=Ze({binary:t,hooksFile:e.hooksFile??ne()})),i.surfaces.work.global.install&&(c.skill=ze({skillFile:e.skillFile??re()}))),i.surfaces.mcp.project.install||i.surfaces.hooks.project.install||i.surfaces.work.project.install){if(!n?.eligible)throw new Error("Grok project integration requires an eligible project root.");s={},i.surfaces.mcp.project.install&&(s.mcp=tt({binary:t,configFile:e.projectConfigFile??At(n.root)})),i.surfaces.hooks.project.install&&(s.hooks=Ze({binary:t,hooksFile:e.projectHooksFile??Tt(n.root)})),i.surfaces.work.project.install&&(s.skill=ze({skillFile:e.projectSkillFile??Mt(n.root)}))}let r=s?.mcp??c?.mcp,a=s?.hooks??c?.hooks,l=s?.skill??c?.skill;if(!r||!a||!l)throw new Error("Grok integration did not produce effective MCP/hooks/skill.");let u=Array.from(new Set([c?.mcp?.configFile,c?.hooks?.hooksFile,c?.skill?.skillFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.skill?.skillFile].filter(d=>typeof d=="string")));return{installed:!0,changed:kn(c)||kn(s),scope:o,plan:i,project:n,global:c,projectScope:s,mcp:r,hooks:a,skill:l,files:u}}import{existsSync as In,mkdirSync as Ca,readFileSync as On,renameSync as xa,rmSync as va,writeFileSync as Fa}from"node:fs";import{dirname as Ra}from"node:path";function fe(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Pa(e){return`'${e.replace(/'/g,"'\\''")}'`}function Ea(e){if(!In(e))return{};let t=On(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Gemini settings.json at ${e}: parse error. Not overwriting.`)}if(!fe(o))throw new Error(`Invalid existing Gemini settings.json at ${e}: root must be an object.`);return o}function Na(e,t){Ca(Ra(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Fa(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),xa(o,e)}finally{va(o,{force:!0})}}function Aa(e){return fe(e)?(typeof e.command=="string"?e.command:"").includes("session:gemini-hook"):!1}function Sn(e={}){let t=e.settingsFile??Ne(),o=Ea(t),n=e.binary??"toolnet-memory",i=`${Pa(n)} session:gemini-hook`,c=fe(o.hooks)?{...o.hooks}:{},s=["SessionStart","SessionEnd"];for(let l of s){let d=(Array.isArray(c[l])?[...c[l]]:[]).map(p=>{if(!fe(p)||!Array.isArray(p.hooks))return p;let g=p.hooks.filter(y=>!Aa(y));return g.length>0?{...p,hooks:g}:void 0}).filter(p=>p!==void 0);d.push({hooks:[{name:"toolnet-memory",type:"command",command:i,timeout:l==="SessionEnd"?1e4:3e4}]}),c[l]=d}o.hooks=c;let r=`${JSON.stringify(o,null,2)}
`,a=!In(t)||On(t,"utf8")!==r;return Na(t,o),{settingsFile:t,changed:a,events:[...s]}}import{existsSync as wn,mkdirSync as Ta,readFileSync as jn,renameSync as Ma,rmSync as Ha,writeFileSync as Da}from"node:fs";import{dirname as $a}from"node:path";function me(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function ot(e){return`'${e.replace(/'/g,"'\\''")}'`}function Ja(e){if(!wn(e))return{};let t=jn(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Junie config.json at ${e}: parse error. Not overwriting.`)}if(!me(o))throw new Error(`Invalid existing Junie config.json at ${e}: root must be an object.`);return o}function _a(e,t){Ta($a(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Da(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Ma(o,e)}finally{Ha(o,{force:!0})}}function Cn(e={}){let t=e.configFile??Ae(),o=Ja(t),n=e.binary??"toolnet-memory",i=e.projectRoot??process.cwd(),c=`${ot(n)} session:junie-hook --project ${ot(i)}`,s=me(o.hooks)?{...o.hooks}:{},r=[{name:"SessionStart",timeout:10},{name:"Stop",timeout:30},{name:"SessionEnd",timeout:8}],a=d=>!me(d)||typeof d.command!="string"||!d.command.includes("session:junie-hook")?!1:d.command.includes(ot(i))||!d.command.includes("--project");for(let d of r){let g=(Array.isArray(s[d.name])?[...s[d.name]]:[]).map(y=>{if(!me(y)||!Array.isArray(y.hooks))return y;let k=y.hooks.filter(H=>!a(H));return k.length>0?{...y,hooks:k}:void 0}).filter(y=>y!==void 0);g.push({hooks:[{type:"command",command:c,timeout:d.timeout}]}),s[d.name]=g}o.hooks=s;let l=`${JSON.stringify(o,null,2)}
`,u=!wn(t)||jn(t,"utf8")!==l;return _a(t,o),{configFile:t,changed:u,events:r.map(d=>d.name)}}import{existsSync as Df,mkdirSync as Ga}from"node:fs";import{dirname as La}from"node:path";function xn(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??Lt({cwd:e.cwd});Ga(La(o),{recursive:!0,mode:448});let n=O(o,"Codebuff"),i=n.mcpServers;if(i!==void 0&&!m(i))throw new Error("Invalid existing Codebuff .agents/mcp.json: mcpServers must be an object.");let c=m(i)?{...i}:{},s="toolnet-memory";return m(c[s])&&!e.force?{installed:!0,changed:!1,configFile:o,configured:!0}:(c[s]={command:t,args:["mcp"]},w(o,{...n,mcpServers:c}),{installed:!0,changed:!0,configFile:o,configured:!0})}function vn(e={}){let t=xn(e);return{installed:t.installed,changed:t.changed,mcp:t,files:[t.configFile]}}import{existsSync as Bf,mkdirSync as qa}from"node:fs";import{dirname as Ka}from"node:path";function Fn(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??Bt({cwd:e.cwd});qa(Ka(o),{recursive:!0,mode:448});let n=O(o,"Freebuff"),i=n.mcpServers;if(i!==void 0&&!m(i))throw new Error("Invalid existing Freebuff .agents/mcp.json: mcpServers must be an object.");let c=m(i)?{...i}:{},s="toolnet-memory";return m(c[s])&&!e.force?{installed:!0,changed:!1,configFile:o,configured:!0}:(c[s]={command:t,args:["mcp"]},w(o,{...n,mcpServers:c}),{installed:!0,changed:!0,configFile:o,configured:!0})}function Rn(e={}){let t=Fn(e);return{installed:t.installed,changed:t.changed,mcp:t,files:[t.configFile]}}import{existsSync as An,mkdirSync as om,readFileSync as Tn,renameSync as nm,rmSync as rm,writeFileSync as Ua}from"node:fs";import{homedir as Ba}from"node:os";import{join as Pn}from"node:path";function Wa(e="toolnet-memory",t={}){return Pn(t.home??Ba(),".agents","plugins",e)}function En(e="toolnet-memory",t={}){return Pn(Wa(e,t),"hooks","hooks.json")}function Nn(e){return`'${e.replace(/'/g,"'\\''")}'`}function Qa(e){if(!An(e))return{};let t;try{t=JSON.parse(Tn(e,"utf8"))}catch{throw new Error(`Invalid existing Goose hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Goose hooks.json at ${e}: root must be a JSON object.`);return t}function Mn(e={}){let t=e.pluginName??"toolnet-memory",o=e.hooksFile??En(t),n=Qa(o),i=e.binary??"toolnet-memory",c=`${Nn(i)} session:goose-hook`,s=`${Nn(i)} session:goose-hook`,r={type:"command",command:c,timeout:30},a={type:"command",command:s,timeout:3},l=n.hooks&&typeof n.hooks=="object"&&!Array.isArray(n.hooks)?n.hooks:{};n.hooks=l;let d=(Array.isArray(l.Stop)?l.Stop:[]).filter(H=>{try{return!JSON.stringify(H).includes("session:goose-hook")}catch{return!0}}),g=(Array.isArray(l.SessionEnd)?l.SessionEnd:[]).filter(H=>{try{return!JSON.stringify(H).includes("session:goose-hook")}catch{return!0}});l.Stop=[...d,{hooks:[r]}],l.SessionEnd=[...g,{hooks:[a]}];let y=JSON.stringify(n,null,2)+`
`,k=!An(o)||Tn(o,"utf8")!==y;return Ua(o,y,{encoding:"utf8",mode:384}),{hooksFile:o,changed:k,stopInstalled:!0,sessionEndInstalled:!0}}function Hn(e={}){let t=Mn(e);return{hooksFile:t.hooksFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as _n,mkdirSync as Va,readFileSync as Gn,renameSync as Xa,rmSync as za,writeFileSync as Za}from"node:fs";import{dirname as el}from"node:path";import{homedir as Ya}from"node:os";import{join as Dn}from"node:path";function $n(e={}){let t=e.projectRoot;return t?Dn(t,".qwen","hooks.json"):Dn(e.home??Ya(),".qwen","hooks.json")}function Jn(e){return`'${e.replace(/'/g,"'\\''")}'`}function tl(e){if(!_n(e))return{};let t;try{t=JSON.parse(Gn(e,"utf8"))}catch{throw new Error(`Invalid existing Qwen hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Qwen hooks.json at ${e}: root must be a JSON object.`);return t}function ol(e,t){Va(el(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Za(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Xa(o,e)}finally{za(o,{force:!0})}}function Ln(e={}){let t=e.hooksFile??$n({projectRoot:e.projectRoot}),o=tl(t),n=e.binary??"toolnet-memory",i=`${Jn(n)} session:qwen-hook`,c=`${Jn(n)} session:qwen-hook`,s={type:"command",command:i,timeout:30},r={type:"command",command:c,timeout:3},a=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=a;let u=(Array.isArray(a.Stop)?a.Stop:[]).filter(k=>{try{return!JSON.stringify(k).includes("session:qwen-hook")}catch{return!0}}),p=(Array.isArray(a.SessionEnd)?a.SessionEnd:[]).filter(k=>{try{return!JSON.stringify(k).includes("session:qwen-hook")}catch{return!0}});a.Stop=[...u,{hooks:[s]}],a.SessionEnd=[...p,{hooks:[r]}];let g=JSON.stringify(o,null,2)+`
`,y=!_n(t)||Gn(t,"utf8")!==g;return ol(t,o),{hooksFile:t,changed:y,stopInstalled:!0,sessionEndInstalled:!0}}function qn(e={}){let t=Ln(e);return{hooksFile:t.hooksFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as Un,mkdirSync as il,readFileSync as sl,renameSync as cl,rmSync as al,writeFileSync as ll}from"node:fs";import{dirname as ul}from"node:path";import{homedir as nl}from"node:os";import{join as rl}from"node:path";function Kn(e={}){return rl(e.home??nl(),".kimi-code","config.toml")}function Bn(e){return`'${e.replace(/'/g,"'\\''")}'`}function dl(e){return Un(e)?sl(e,"utf8"):""}function Wn(e,t){il(ul(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{ll(o,t,{encoding:"utf8",mode:384}),cl(o,e)}finally{al(o,{force:!0})}}function Qn(e={}){let t=e.configFile??Kn(),o=dl(t),n=e.binary??"toolnet-memory",i=`${Bn(n)} session:kimi-hook`,c=`${Bn(n)} session:kimi-hook`,s=`[[hooks]]
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
`,a=!0),a?Wn(t,o):Un(t)||(Wn(t,s+`
`+r+`
`),a=!0),{configFile:t,changed:a,stopInstalled:!0,sessionEndInstalled:!0}}function Yn(e={}){let t=Qn(e);return{configFile:t.configFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as Xn,mkdirSync as fl,readFileSync as ml,renameSync as yl,rmSync as hl,writeFileSync as kl}from"node:fs";import{dirname as bl}from"node:path";import{homedir as pl}from"node:os";import{join as gl}from"node:path";function Vn(e={}){return gl(e.home??pl(),".hermes","config.yaml")}function Il(e){return`'${e.replace(/'/g,"'\\''")}'`}function Ol(e){return Xn(e)?ml(e,"utf8"):""}function Sl(e,t){fl(bl(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{kl(o,t,{encoding:"utf8",mode:384}),yl(o,e)}finally{hl(o,{force:!0})}}function zn(e={}){let t=e.configFile??Vn(),o=Ol(t),n=e.binary??"toolnet-memory",c=`  - name: toolnet-memory-session-end
    event: on_session_end
    command: ${`${Il(n)} session:hermes-hook`}
    timeout: 30
`,s=!1;return o.includes("toolnet-memory-session-end")||(o.includes("hooks:")?o=o.replace(/hooks:\n/,`hooks:
${c}`):o=o.trim()+`

hooks:
`+c,s=!0),(s||!Xn(t))&&(o.endsWith(`
`)||(o+=`
`),Sl(t,o)),{configFile:t,changed:s,sessionEndInstalled:!0}}function Zn(e={}){let t=zn(e);return{configFile:t.configFile,changed:t.changed,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as or,mkdirSync as Cl,readFileSync as nr,renameSync as xl,rmSync as vl,writeFileSync as Fl}from"node:fs";import{dirname as Rl}from"node:path";import{existsSync as wl}from"node:fs";import{homedir as jl}from"node:os";import{join as nt}from"node:path";function er(e={}){let t=e.home??jl();return wl(nt(t,".qoder-cn"))?nt(t,".qoder-cn","settings.json"):nt(t,".qoder","settings.json")}function tr(e){return`'${e.replace(/'/g,"'\\''")}'`}function Pl(e){if(!or(e))return{};let t;try{t=JSON.parse(nr(e,"utf8"))}catch{throw new Error(`Invalid existing Qoder settings.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Qoder settings.json at ${e}: root must be a JSON object.`);return t}function El(e,t){Cl(Rl(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Fl(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),xl(o,e)}finally{vl(o,{force:!0})}}function rr(e={}){let t=e.settingsFile??er(),o=Pl(t),n=e.binary??"toolnet-memory",i=`${tr(n)} session:qoder-hook`,c=`${tr(n)} session:qoder-hook`,s={type:"command",command:i,timeout:30},r={type:"command",command:c,timeout:3},a=Array.isArray(o.hooks)?[...o.hooks]:[],u=a.filter(g=>{try{return!JSON.stringify(g).includes("session:qoder-hook")}catch{return!0}}).filter(g=>{try{return!JSON.stringify(g).includes("session:qoder-hook")}catch{return!0}});a.length=0,a.push({...s,event:"Stop"},{...r,event:"SessionEnd"}),o.hooks=a;let d=JSON.stringify(o,null,2)+`
`,p=!or(t)||nr(t,"utf8")!==d;return El(t,o),{settingsFile:t,changed:p,stopInstalled:!0,sessionEndInstalled:!0}}function ir(e={}){let t=rr(e);return{settingsFile:t.settingsFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as Nl,mkdirSync as sr,readFileSync as Al,renameSync as Tl,rmSync as Ml,writeFileSync as Hl}from"node:fs";import{dirname as Dl,join as ye}from"node:path";import{homedir as $l}from"node:os";function Jl(e,t){sr(Dl(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Hl(o,t,{encoding:"utf8",mode:493}),Tl(o,e)}finally{Ml(o,{force:!0})}}var rt=`#!/usr/bin/env node
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
`;function cr(e={}){let t=e.cwd?ye(e.cwd,".toolnet","bin"):ye(process.env.TOOLNET_HOME??ye($l(),".toolnet"),"bin");sr(t,{recursive:!0,mode:448});let o=ye(t,"aider-wrapper"),n=rt.endsWith(`
`)?rt:rt+`
`,i=!Nl(o)||Al(o,"utf8")!==n;return Jl(o,n),{launcherPath:o,changed:i}}import{existsSync as ar,mkdirSync as _l,readFileSync as lr,renameSync as Gl,rmSync as Ll,writeFileSync as ql}from"node:fs";import{dirname as Kl,join as ur}from"node:path";import{homedir as Bl}from"node:os";function Wl(){return process.env.PLANDEX_BASE_DIR??ur(Bl(),"plandex-server")}function Ul(e){if(!ar(e))return{};let t;try{t=JSON.parse(lr(e,"utf8"))}catch{throw new Error(`Invalid existing Plandex config at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Plandex config at ${e}: root must be a JSON object.`);return t}function Ql(e,t){_l(Kl(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{ql(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Gl(o,e)}finally{Ll(o,{force:!0})}}function dr(e={}){let t=Wl(),o=ur(t,"toolnet-memory.json"),n=Ul(o),i=n.toolnetMemory??{};i.integration="toolnet-memory",i.captureMode="manual-recovery",i.managedBy="toolnet-memory",n.toolnetMemory=i;let c=JSON.stringify(n,null,2)+`
`,s=!ar(o)||lr(o,"utf8")!==c;return Ql(o,n),{configPath:o,changed:s}}import{existsSync as pr,mkdirSync as gr,readFileSync as fr,renameSync as Yl,rmSync as Vl,writeFileSync as Xl}from"node:fs";import{dirname as mr,join as zl}from"node:path";import{homedir as Zl}from"node:os";function eu(e){if(!pr(e))return{};let t;try{t=JSON.parse(fr(e,"utf8"))}catch{throw new Error(`Invalid existing OpenRouter config at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing OpenRouter config at ${e}: root must be a JSON object.`);return t}function tu(e,t){gr(mr(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Xl(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Yl(o,e)}finally{Vl(o,{force:!0})}}function yr(e={}){let t=Zl(),o=zl(t,".config","openrouter","toolnet-memory.json");gr(mr(o),{recursive:!0,mode:448});let n=eu(o);n.toolnetMemory={integration:"toolnet-memory",captureMode:"blocked-product-identity",managedBy:"toolnet-memory",blocked:!0,reason:"OpenRouter CLI product identity is blocked for ToolNet integration."};let i=JSON.stringify(n,null,2)+`
`,c=!pr(o)||fr(o,"utf8")!==i;return tu(o,n),{configPath:o,blocked:!0,changed:c}}import{existsSync as Or,mkdirSync as nu,readFileSync as Sr,renameSync as ru,rmSync as iu,writeFileSync as su}from"node:fs";import{dirname as cu}from"node:path";import{homedir as ou}from"node:os";import{join as hr}from"node:path";function kr(e={}){return hr(e.home??ou(),".bob","settings","settings.json")}function br(e){return hr(e,".bob","settings.json")}function au(e){if(!Or(e))return{};let t;try{t=JSON.parse(Sr(e,"utf8"))}catch{throw new Error(`Invalid existing Bob settings.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Bob settings.json at ${e}: root must be a JSON object.`);return t}function lu(e,t){nu(cu(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{su(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),ru(o,e)}finally{iu(o,{force:!0})}}function Ir(e){return`'${e.replace(/'/g,"'\\''")}'`}function wr(e={}){let t=e.projectRoot!==void 0?br(e.projectRoot):kr({home:e.home}),o=au(t),n=e.binary??"toolnet-memory",i=`${Ir(n)} hook ibm-bob`,c=`${Ir(n)} hook ibm-bob`,s={type:"command",command:i,timeout:10},r={type:"command",command:c,timeout:10},a=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=a;let u=(Array.isArray(a.Stop)?a.Stop:[]).filter(k=>{try{return!JSON.stringify(k).includes("hook ibm-bob")}catch{return!0}}),p=(Array.isArray(a.SessionStart)?a.SessionStart:[]).filter(k=>{try{return!JSON.stringify(k).includes("hook ibm-bob")}catch{return!0}});a.Stop=[...u,{hooks:[s]}],a.SessionStart=[...p,{hooks:[r]}];let g=JSON.stringify(o,null,2)+`
`,y=!Or(t)||Sr(t,"utf8")!==g;return lu(t,o),{settingsFile:t,changed:y,stopInstalled:!0,sessionStartInstalled:!0}}function jr(e={}){let t=wr(e);return{settingsFile:t.settingsFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionStartInstalled:t.sessionStartInstalled}}import{existsSync as it,mkdirSync as vr,readFileSync as st,renameSync as du,rmSync as pu,writeFileSync as gu}from"node:fs";import{dirname as fu,join as ct}from"node:path";import{homedir as uu}from"node:os";import{join as Cr}from"node:path";function xr(e){return e?Cr(e,".cline","hooks"):Cr(uu(),"Documents","Cline","Hooks")}function mu(e){return`'${e.replace(/'/g,"'\\''")}'`}function at(e,t){vr(fu(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{gu(o,t,{encoding:"utf8",mode:493}),du(o,e)}finally{pu(o,{force:!0})}}function yu(e){return`#!/bin/sh
exec ${`${mu(e)} hook cline`}
`}function Fr(e={}){let t=e.binary??"toolnet-memory",o=xr(e.projectRoot),n=ct(o,"toolnet-memory.sh");vr(o,{recursive:!0,mode:448});let i=yu(t),c=!it(n)||st(n,"utf8")!==i;at(n,i);let s=ct(o,"TaskComplete"),r=ct(o,"TaskStart"),a=!1,l=!1;return(!it(s)||st(s,"utf8")!==i)&&(at(s,i),a=!0),(!it(r)||st(r,"utf8")!==i)&&(at(r,i),l=!0),{hooksDir:o,hooksFile:n,changed:c||a||l,taskCompleteInstalled:a,taskStartInstalled:l}}function Rr(e={}){let t=Fr(e);return{hooksFile:t.hooksFile,hooksDir:t.hooksDir,changed:t.changed,taskCompleteInstalled:t.taskCompleteInstalled,taskStartInstalled:t.taskStartInstalled}}import{existsSync as Nr,mkdirSync as Ar,readFileSync as bu,renameSync as Iu,rmSync as Ou,writeFileSync as Su}from"node:fs";import{dirname as Tr}from"node:path";import{homedir as hu}from"node:os";import{join as ku}from"node:path";function Pr(){return ku(hu(),".rovodev","config.yml")}function Mr(e){return`'${e.replace(/'/g,"'\\''")}'`}function Er(e,t){Ar(Tr(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Su(o,t,{encoding:"utf8",mode:384}),Iu(o,e)}finally{Ou(o,{force:!0})}}function wu(e){return Nr(e)?bu(e,"utf8"):""}function ju(e){let t=`  - type: command
    command: ${Mr("toolnet-memory hook rovo")}
    timeout: 10
`;if(e.includes("hooks:")){if(e.includes("toolnet-memory hook rovo"))return e;let o=e.split(`
`),i=o.length-1;for(let c=o.length-1;c>=0&&o[c].trim()==="";c--)i=c;return o.splice(i,0,t),o.join(`
`)}return e+`
hooks:
${t}`}function Hr(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??Pr();if(Ar(Tr(o),{recursive:!0,mode:448}),!Nr(o)){let s=`hooks:
  - type: command
    command: ${Mr(`${t} hook rovo`)}
    timeout: 10
`;return Er(o,s),{configFile:o,changed:!0,hookInstalled:!0}}let n=wu(o),i=ju(n),c=n!==i;return c&&Er(o,i),{configFile:o,changed:c,hookInstalled:c}}function Dr(e={}){let t=Hr(e);return{configFile:t.configFile,changed:t.changed,hookInstalled:t.hookInstalled}}import{existsSync as Jr,mkdirSync as Gr,readFileSync as _r,renameSync as vu,rmSync as Fu,writeFileSync as Ru}from"node:fs";import{dirname as Lr,join as Pu}from"node:path";import{homedir as Cu}from"node:os";import{join as xu}from"node:path";function $r(){return[xu(Cu(),".warp")]}function Eu(e,t){Gr(Lr(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Ru(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),vu(o,e)}finally{Fu(o,{force:!0})}}function qr(e={}){let t=$r(),o=Pu(t[0],"toolnet-memory.json");Gr(Lr(o),{recursive:!0,mode:448});let n=Jr(o)?JSON.parse(_r(o,"utf8")):{};n.toolnetMemory={integration:"toolnet-memory",captureMode:"blocked-capability",managedBy:"toolnet-memory",blocked:!0,reason:"Warp Agent CLI capability is blocked for ToolNet integration."};let i=JSON.stringify(n,null,2)+`
`,c=!Jr(o)||_r(o,"utf8")!==i;return Eu(o,n),{configFile:o,blocked:!0,changed:c}}function Kr(e={}){if(e.scope==="global")return{scope:"global",automatic:!1,reason:"explicit-global"};if(e.scope==="project"||e.scope==="both"){let o=x({cwd:e.cwd,project:e.projectRoot});if(!o.eligible)throw new Error(`Explicit ${e.scope} integration requires an explicit project, ToolNet project, or Git repository root.`);return{scope:e.scope,automatic:!1,project:o,reason:e.scope==="project"?"explicit-project":"explicit-both"}}let t=x({cwd:e.cwd,project:e.projectRoot});return t.toolnetProject?{scope:"both",automatic:!0,project:t,reason:"toolnet-project"}:{scope:"global",automatic:!0,reason:"no-toolnet-project"}}function Br(){return Xt()}function Nu(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[],n=e.detections??Br(),i=new Map(n.map(s=>[s.agent,s.detected])),c=Kr({scope:e.scope,projectRoot:e.projectRoot,cwd:e.cwd});if(!(e.force===!0||i.get("agy")===!0))o.push({agent:"agy",detected:!1,installed:!1,targets:[]});else try{let r=ro({binary:t});o.push({agent:"agy",detected:!0,installed:!0,targets:r.files})}catch(r){o.push({agent:"agy",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("gemini")===!0))o.push({agent:"gemini",detected:!1,installed:!1,targets:[]});else try{let r=Sn({...e.gemini,binary:t});o.push({agent:"gemini",detected:!0,installed:!0,targets:[r.settingsFile]})}catch(r){o.push({agent:"gemini",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("junie")===!0))o.push({agent:"junie",detected:!1,installed:!1,targets:[]});else try{let r=e.junie?.projectRoot??c.project?.root??e.projectRoot??e.cwd??process.cwd(),a=Cn({...e.junie,binary:t,projectRoot:r});o.push({agent:"junie",detected:!0,installed:!0,targets:[a.configFile]})}catch(r){o.push({agent:"junie",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("opencode")===!0))o.push({agent:"opencode",detected:!1,installed:!1,targets:[]});else try{let r=uo({binary:t}),a=yo({binary:t});o.push({agent:"opencode",detected:!0,installed:!0,targets:[...r,a.configFile,`mcp:${a.serverName}`]})}catch(r){o.push({agent:"opencode",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("claude")===!0))o.push({agent:"claude",detected:!1,installed:!1,targets:[]});else try{let r=Ho({binary:t});o.push({agent:"claude",detected:!0,installed:!0,targets:[r.hooks.settingsFile,r.mcp.configFile,`mcp:${r.mcp.serverName}`]})}catch(r){o.push({agent:"claude",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("kiro")===!0))o.push({agent:"kiro",detected:!1,installed:!1,targets:[]});else try{let r=Ko({...e.kiro??{},binary:t});o.push({agent:"kiro",detected:!0,installed:!0,targets:[r.mcp.configFile,`mcp:${r.mcp.serverName}`,r.hooks.hooksFile]})}catch(r){o.push({agent:"kiro",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("cursor")===!0))o.push({agent:"cursor",detected:!1,installed:!1,targets:[]});else try{let r=e.cursor??{},a=sn({...r,binary:t,scope:r.scope??c.scope,projectRoot:r.projectRoot??c.project?.root});o.push({agent:"cursor",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(r){o.push({agent:"cursor",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("copilot")===!0))o.push({agent:"copilot",detected:!1,installed:!1,targets:[]});else try{let r=e.copilot??{},a=pn({...r,binary:t,scope:r.scope??c.scope,projectRoot:r.projectRoot??c.project?.root});o.push({agent:"copilot",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(r){o.push({agent:"copilot",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("grok")===!0))o.push({agent:"grok",detected:!1,installed:!1,targets:[]});else try{let r=e.grok??{},a=bn({...r,binary:t,scope:r.scope??c.scope,projectRoot:r.projectRoot??c.project?.root});o.push({agent:"grok",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(r){o.push({agent:"grok",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("toolnet-cli")===!0))o.push({agent:"toolnet-cli",detected:!1,installed:!1,targets:[]});else try{let r=e.toolnetCli??{},a=Wo({...r,binary:t});o.push({agent:"toolnet-cli",detected:!0,installed:!0,targets:[a.mcp.configFile]})}catch(r){o.push({agent:"toolnet-cli",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("kilo")===!0))o.push({agent:"kilo",detected:!1,installed:!1,targets:[]});else try{let r=e.kilo??{},a=Qo({...r,binary:t});o.push({agent:"kilo",detected:!0,installed:!0,targets:[a.mcp.configFile]})}catch(r){o.push({agent:"kilo",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("codebuff")===!0))o.push({agent:"codebuff",detected:!1,installed:!1,targets:[]});else try{let r=vn({...e.codebuff,binary:t,...e.codebuff?.cwd||e.cwd?{cwd:e.codebuff?.cwd??e.cwd}:{}});o.push({agent:"codebuff",detected:!0,installed:!0,targets:[r.mcp.configFile]})}catch(r){o.push({agent:"codebuff",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("freebuff")===!0))o.push({agent:"freebuff",detected:!1,installed:!1,targets:[]});else try{let r=Rn({...e.freebuff,binary:t,...e.freebuff?.cwd||e.cwd?{cwd:e.freebuff?.cwd??e.cwd}:{}});o.push({agent:"freebuff",detected:!0,installed:!0,targets:[r.mcp.configFile]})}catch(r){o.push({agent:"freebuff",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}{let s=e.force===!0||i.get("continue")===!0;o.push({agent:"continue",detected:s,installed:s,targets:s?[Ut()]:[]})}if(!(e.force===!0||i.get("codex")===!0))o.push({agent:"codex",detected:!1,installed:!1,targets:[]});else try{let r=Oo({binary:t}),a=wo({binary:t}),l=Fo({binary:t}),u=Eo({binary:t});if(!u.installed)throw new Error(u.error??"Codex MCP registration failed");let d=[r.configFile,a,l.hooksFile,`mcp:${u.serverName}`];r.preservedPrevious&&d.push(r.previousFile),o.push({agent:"codex",detected:!0,installed:!0,targets:d})}catch(r){o.push({agent:"codex",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("goose")===!0))o.push({agent:"goose",detected:!1,installed:!1,targets:[]});else try{let r=e.goose??{},a=Hn({...r,binary:t});o.push({agent:"goose",detected:!0,installed:!0,targets:[a.hooksFile]})}catch(r){o.push({agent:"goose",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("qwen")===!0))o.push({agent:"qwen",detected:!1,installed:!1,targets:[]});else try{let r=e.qwen??{},a=qn({...r,binary:t});o.push({agent:"qwen",detected:!0,installed:!0,targets:[a.hooksFile]})}catch(r){o.push({agent:"qwen",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("kimi")===!0))o.push({agent:"kimi",detected:!1,installed:!1,targets:[]});else try{let r=e.kimi??{},a=Yn({...r,binary:t});o.push({agent:"kimi",detected:!0,installed:!0,targets:[a.configFile]})}catch(r){o.push({agent:"kimi",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("hermes")===!0))o.push({agent:"hermes",detected:!1,installed:!1,targets:[]});else try{let r=e.hermes??{},a=Zn({...r,binary:t});o.push({agent:"hermes",detected:!0,installed:!0,targets:[a.configFile]})}catch(r){o.push({agent:"hermes",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("qoder")===!0))o.push({agent:"qoder",detected:!1,installed:!1,targets:[]});else try{let r=e.qoder??{},a=ir({...r,binary:t});o.push({agent:"qoder",detected:!0,installed:!0,targets:[a.settingsFile]})}catch(r){o.push({agent:"qoder",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("aider")===!0))o.push({agent:"aider",detected:!1,installed:!1,targets:[]});else try{let r=e.aider??{},a=cr({...r,binary:t});o.push({agent:"aider",detected:!0,installed:!0,targets:[a.launcherPath]})}catch(r){o.push({agent:"aider",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("plandex")===!0))o.push({agent:"plandex",detected:!1,installed:!1,targets:[]});else try{let r=e.plandex??{},a=dr({...r,binary:t});o.push({agent:"plandex",detected:!0,installed:!0,targets:[a.configPath]})}catch(r){o.push({agent:"plandex",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("openrouter")===!0))o.push({agent:"openrouter",detected:!1,installed:!1,targets:[]});else try{let r=e.openrouter??{},a=yr({...r,binary:t});o.push({agent:"openrouter",detected:!0,installed:!0,targets:[a.configPath]})}catch(r){o.push({agent:"openrouter",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("bob")===!0))o.push({agent:"bob",detected:!1,installed:!1,targets:[]});else try{let r=e.bob??{},a=jr({...r,binary:t});o.push({agent:"bob",detected:!0,installed:!0,targets:[a.settingsFile]})}catch(r){o.push({agent:"bob",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("cline")===!0))o.push({agent:"cline",detected:!1,installed:!1,targets:[]});else try{let r=e.cline??{},a=Rr({...r,binary:t});o.push({agent:"cline",detected:!0,installed:!0,targets:[a.hooksFile]})}catch(r){o.push({agent:"cline",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("rovo")===!0))o.push({agent:"rovo",detected:!1,installed:!1,targets:[]});else try{let r=e.rovo??{},a=Dr({...r,binary:t});o.push({agent:"rovo",detected:!0,installed:!0,targets:[a.configFile]})}catch(r){o.push({agent:"rovo",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}if(!(e.force===!0||i.get("warp")===!0))o.push({agent:"warp",detected:!1,installed:!1,targets:[]});else try{let r=e.warp??{},a=qr({...r,binary:t});o.push({agent:"warp",detected:!0,installed:!0,targets:[a.configFile]})}catch(r){o.push({agent:"warp",detected:!0,installed:!1,targets:[],error:r instanceof Error?r.message:String(r)})}return o}function Wr(e){switch(e){case"agy":return"Agy / Antigravity";case"opencode":return"OpenCode";case"claude":return"Claude Code";case"kiro":return"Kiro CLI";case"cursor":return"Cursor CLI";case"copilot":return"GitHub Copilot CLI";case"grok":return"Grok Build";case"toolnet-cli":return"ToolNet CLI";case"kilo":return"Kilo";case"codex":return"Codex";case"goose":return"goose";case"qwen":return"Qwen Code";case"kimi":return"Kimi Code CLI";case"hermes":return"Hermes Agent";case"qoder":return"Qoder CLI";case"aider":return"Aider";case"plandex":return"Plandex";case"openrouter":return"OpenRouter CLI";case"bob":return"IBM Bob Shell";case"cline":return"Cline CLI";case"rovo":return"Rovo Dev CLI";case"warp":return"Warp Agent CLI";case"gemini":return"Gemini CLI";case"junie":return"Junie";case"codebuff":return"Codebuff";case"freebuff":return"Freebuff";case"continue":return"Continue";default:return e}}function Au(e){console.log(""),console.log("ToolNet Memory Integration Detection"),console.log("===================================="),console.log("");for(let t of e){let o=Wr(t.agent);if(!t.detected){console.log(`\u25CB ${o}: not detected`);continue}console.log(`\u2713 ${o}: detected`);for(let n of t.evidence)console.log(`  ${n}`)}console.log("")}var Tu=["claude","cursor","copilot","grok","kiro","opencode","codex","agy"],Mu={opencode:"toolnet-memory session:opencode-sync",codex:"toolnet-memory session:codex-sync",agy:"toolnet-memory session:agy-sync","toolnet-cli":"toolnet-memory session:toolnet-cli-sync"};function Hu(e){if(Tu.includes(e))return"ToolNet integration configured; hooks installed successfully";let t=Mu[e];return t?`ToolNet integration configured; run ${t} to capture session history`:"ToolNet integration configured; capture begins when a supported hook or sync runs"}function Du(e){console.log(""),console.log("ToolNet Memory AI Integrations"),console.log("=============================="),console.log("");for(let t of e){let o=Wr(t.agent);if(!t.detected){console.log(`- ${o}: not detected`);continue}if(t.installed){let n=t.scope?` [scope=${t.scope}]`:"";console.log(`\u2713 ${o}: ${Hu(t.agent)}${n}`),t.projectRoot&&console.log(`  project: ${t.projectRoot}`);continue}console.log(`\u2717 ${o}: integration failed`),t.error&&console.log(`  ${t.error}`)}console.log("")}function $u(e,t){let o=e.indexOf(t);return o>=0?e[o+1]:void 0}function Ju(e){return e.includes("--scope")||e.includes("--global")||e.includes("--both")?nn(e):void 0}async function _u(){let e=process.argv.slice(2),t=e.includes("--all"),o=e.includes("--json"),n=e.includes("--detect-only"),i=Ju(e),c=$u(e,"--project");if(n){let r=Br();if(o){console.log(JSON.stringify(r,null,2));return}Au(r);return}let s=Nu({force:t,scope:i,projectRoot:c});if(o){console.log(JSON.stringify(s,null,2));return}Du(s)}var Gu=process.argv[1]&&(process.argv[1].endsWith("auto-integrate.js")||process.argv[1].endsWith("auto-integrate.ts"));Gu&&_u().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});export{Br as detectAutoIntegrations,Nu as installAutoIntegrations,Wr as integrationDisplayName};
