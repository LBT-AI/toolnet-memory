import{existsSync as fr,statSync as uc}from"node:fs";import{resolve as pc,join as dc}from"node:path";import{existsSync as gr,readFileSync as mr}from"node:fs";import{homedir as yr}from"node:os";import{join as hr}from"node:path";function kr(e){let t=e.trim();return t.length>=2&&t.startsWith('"')&&t.endsWith('"')?(t=t.slice(1,-1),t.replace(/\\n/g,`
`).replace(/\\r/g,"\r").replace(/\\t/g,"	").replace(/\\"/g,'"').replace(/\\\\/g,"\\")):t.length>=2&&t.startsWith("'")&&t.endsWith("'")?t.slice(1,-1):t}function br(){let e=process.env.TOOLNET_GLOBAL_ENV??hr(yr(),".config","toolnet-memory",".env");if(!gr(e))return;let t=mr(e,"utf8");for(let o of t.split(/\r?\n/)){let r=o.trim();if(!r||r.startsWith("#"))continue;r.startsWith("export ")&&(r=r.slice(7));let n=r.indexOf("=");if(n<=0)continue;let i=r.slice(0,n).trim();/^[A-Za-z_][A-Za-z0-9_]*$/.test(i)&&process.env[i]===void 0&&(process.env[i]=kr(r.slice(n+1)))}}br();import{createHash as Ir}from"node:crypto";import{existsSync as z,mkdirSync as Cr,readFileSync as jr,renameSync as vr,writeFileSync as wr}from"node:fs";import{basename as Sr,dirname as V,join as D,parse as lt,resolve as R}from"node:path";var ut=".toolnet",Or="project.json";function xr(e){return Ir("sha256").update(e).digest("hex").slice(0,16)}function Y(e){return D(e,ut,Or)}function Rr(e){return z(Y(e))}function it(e,t){let o=R(e),r=lt(o).root;for(;;){if(Rr(o))return o;if(o===r||t&&o===R(t))break;let n=V(o);if(n===o)break;o=n}return null}function st(e){let t=R(e),o=lt(t).root,r=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"];for(;;){if(r.some(i=>z(D(t,i))))return t;if(t===o)break;let n=V(t);if(n===t)break;t=n}return R(e)}function ct(e){let t;try{t=JSON.parse(jr(e,"utf8"))}catch(n){throw new Error(`Invalid ToolNet project manifest: ${e}: ${n instanceof Error?n.message:String(n)}`)}if(!t||typeof t!="object")throw new Error(`Invalid ToolNet project manifest: ${e}`);let o=t;if(typeof o.id!="string"||!o.id.trim())throw new Error(`ToolNet project manifest is missing id: ${e}`);if(typeof o.name!="string"||!o.name.trim())throw new Error(`ToolNet project manifest is missing name: ${e}`);let r=new Date().toISOString();return{version:1,id:o.id,name:o.name,remote:typeof o.remote=="string"&&o.remote.trim()?o.remote:o.name,rootPath:typeof o.rootPath=="string"?o.rootPath:V(V(e)),createdAt:typeof o.createdAt=="string"?o.createdAt:r,updatedAt:typeof o.updatedAt=="string"?o.updatedAt:r,graphVersion:typeof o.graphVersion=="number"?o.graphVersion:0,memoryVersion:typeof o.memoryVersion=="number"?o.memoryVersion:0,metadata:o.metadata&&typeof o.metadata=="object"?o.metadata:void 0}}function at(e,t){let o=D(e,ut);Cr(o,{recursive:!0});let r=Y(e),n=`${r}.tmp-${process.pid}`;wr(n,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),vr(n,r)}function Ie(e,t){return{id:e.id,name:e.name,remote:e.remote,rootPath:t,createdAt:e.createdAt,updatedAt:e.updatedAt,graphVersion:e.graphVersion,memoryVersion:e.memoryVersion,metadata:e.metadata}}var q=class{findExisting(t=process.cwd()){let o=R(t),r=st(o),i=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(a=>z(D(r,a))),s=it(o,i?r:void 0);if(!s)return null;let c=ct(Y(s));return Ie(c,s)}requireExisting(t=process.cwd()){let o=this.findExisting(t);if(!o)throw new Error("PROJECT_NOT_INITIALIZED");return o}detect(t=process.cwd()){let o=R(t),r=st(o),i=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(u=>z(D(r,u))),s=it(o,i?r:void 0);if(s){let u=Y(s),p=ct(u);return p.rootPath!==s&&(p.rootPath=s,p.updatedAt=new Date().toISOString(),at(s,p)),Ie(p,s)}let c=new Date().toISOString(),a=Sr(r),l={version:1,id:xr(r),name:a,remote:a,rootPath:r,createdAt:c,updatedAt:c,graphVersion:0,memoryVersion:0};return at(r,l),Ie(l,r)}};var Mr=[{type:"openai_key",regex:/\bsk-[A-Za-z0-9_-]{20,}\b/g,confidence:"exact"},{type:"huggingface_token",regex:/\bhf_[A-Za-z0-9]{20,}\b/g,confidence:"exact"},{type:"hf_s3_access_key",regex:/\bHFAK[A-Za-z0-9]{8,}\b/g,confidence:"exact"},{type:"aws_access_key",regex:/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,confidence:"exact"},{type:"github_token",regex:/\b(?:gh[pousr]_[A-Za-z0-9]{30,255}|github_pat_[A-Za-z0-9_]{40,255})\b/g,confidence:"exact"},{type:"stripe_secret_key",regex:/\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g,confidence:"exact"},{type:"google_api_key",regex:/\bAIza[A-Za-z0-9_-]{30,}\b/g,confidence:"exact"},{type:"slack_token",regex:/\bxox[baprs]-[A-Za-z0-9-]{16,}\b/g,confidence:"exact"},{type:"npm_token",regex:/\bnpm_[A-Za-z0-9]{20,}\b/g,confidence:"exact"},{type:"bearer_token",regex:/\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/gi,confidence:"high"},{type:"jwt",regex:/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,confidence:"exact"},{type:"private_key",regex:/-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,confidence:"exact"},{type:"password_assignment",regex:/\b(?:password|passwd|pwd)\s*[:=]\s*["']?[^"' \t\r\n]{6,}["']?/gi,confidence:"high"},{type:"secret_assignment",regex:/\b(?:secret|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key)\s*[:=]\s*["']?[^"' \t\r\n]{8,}["']?/gi,confidence:"high"},{type:"cookie",regex:/\b(?:cookie|set-cookie)\s*[:=]\s*[^;\n]{8,}/gi,confidence:"high"},{type:"url_credentials",regex:/\bhttps?:\/\/[^:/@\s]+:[^/@\s]{4,}@[^/\s]+/gi,confidence:"high"}],Er=new Set(["example","example-key","example-token","changeme","change-me","password","secret","your-api-key","your-token","<token>","<secret>","<password>","[redacted]"]);function pt(e){return e.normalize("NFKC").trim().toLowerCase()}function Ar(e){if(e.length===0)return 0;let t=new Map;for(let r of e)t.set(r,(t.get(r)??0)+1);let o=0;for(let r of t.values()){let n=r/e.length;o-=n*Math.log2(n)}return o}function Tr(e){return/^[a-f0-9]{32}$/iu.test(e)||/^[a-f0-9]{40}$/iu.test(e)||/^[a-f0-9]{64}$/iu.test(e)}function Pr(e,t,o){let r=e.slice(Math.max(0,t-48),t),n=e.slice(o,Math.min(e.length,o+16));return/\b(?:token|secret|key|credential|authorization|password|passwd|apikey|api_key|access[_-]?key)\b/iu.test(`${r} ${n}`)}function Fr(e,t){return e.start<t.end&&t.start<e.end}function dt(e){return e.sort((t,o)=>t.start!==o.start?t.start-o.start:o.end-o.start-(t.end-t.start))}var Z=class{allowValues=new Set;enableEntropyHeuristic;constructor(t={}){for(let o of t.allowValues??[]){let r=pt(o);r&&this.allowValues.add(r)}this.enableEntropyHeuristic=t.enableEntropyHeuristic??!0}scan(t){let o=[];for(let i of Mr){let s=new RegExp(i.regex.source,i.regex.flags);for(let c of t.matchAll(s))c.index===void 0||!c[0]||this.allowed(c[0])||o.push({type:i.type,value:c[0],start:c.index,end:c.index+c[0].length,confidence:i.confidence})}this.enableEntropyHeuristic&&o.push(...this.entropyMatches(t));let r=dt(o),n=[];for(let i of r)n.some(s=>Fr(s,i))||n.push(i);return dt(n)}hasSecrets(t){return this.scan(t).length>0}allowed(t){let o=pt(t);return Er.has(o)?!0:this.allowValues.has(o)}entropyMatches(t){let o=[],r=/[A-Za-z0-9_+/=-]{32,160}/g;for(let n of t.matchAll(r)){if(n.index===void 0||!n[0])continue;let i=n[0];this.allowed(i)||Tr(i)||!/[A-Za-z]/u.test(i)||!/[0-9]/u.test(i)||Pr(t,n.index,n.index+i.length)&&(Ar(i)<3.7||o.push({type:"high_entropy_secret",value:i,start:n.index,end:n.index+i.length,confidence:"heuristic"}))}return o}};var X=class{scanner;constructor(t={}){this.scanner=new Z(t)}sanitize(t){let o=this.scanner.scan(t);if(o.length===0)return{text:t,redacted:0,secretTypes:[]};let r=t,n=[...o].sort((s,c)=>c.start-s.start),i=new Set;for(let s of n)i.add(s.type),r=r.slice(0,s.start)+`[REDACTED:${s.type}]`+r.slice(s.end);return{text:r,redacted:o.length,secretTypes:[...i].sort()}}sanitizeValue(t){if(typeof t=="string")return this.sanitize(t).text;if(Array.isArray(t))return t.map(o=>this.sanitizeValue(o));if(t&&typeof t=="object"){let o={};for(let[r,n]of Object.entries(t)){let i=r.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g,"");if(i.includes("password")||i.includes("passwd")||i==="pwd"||i.includes("secret")||i.includes("token")||i.includes("cookie")||i.includes("authorization")||i.includes("apikey")||i.includes("accesskey")||i.includes("privatekey")||i.includes("clientsecret")||i.includes("credential")){o[r]="[REDACTED]";continue}o[r]=this.sanitizeValue(n)}return o}return t}};var Tc=new X;var Nr={mcp:!0,continuityRead:!0,nativeCapture:!1,lifecycleHooks:!1,sharedJournalWrite:!1,level:"mcp-only"},_r={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!1,sharedJournalWrite:!0,level:"native-capture"},S={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!0,sharedJournalWrite:!0,level:"native-capture"},Dr={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!0,sharedJournalWrite:!0,level:"native-capture"};function h(e,t,o){return{agent:e,...t,refreshMode:o}}var ft={agy:h("agy",S,"native-lifecycle"),opencode:h("opencode",Dr,"persistent-plugin"),codex:h("codex",S,"native-lifecycle"),claude:h("claude",S,"native-lifecycle"),kiro:h("kiro",S,"native-lifecycle"),cursor:h("cursor",S,"native-lifecycle"),copilot:h("copilot",S,"native-lifecycle"),grok:h("grok",S,"native-lifecycle"),"toolnet-cli":h("toolnet-cli",_r,"native-session"),kilo:h("kilo",Nr,"mcp-only")};function $r(e){return Object.prototype.hasOwnProperty.call(ft,e)}function Hr(e){if($r(e))return ft[e]}function gt(e){let t=Hr(e);if(!t)return"unknown";switch(t.refreshMode){case"native-lifecycle":return"native lifecycle";case"persistent-plugin":return"persistent plugin";case"native-session":return"native session capture";case"mcp-only":return"MCP only"}}var mt=["\u280B","\u2819","\u2839","\u2838","\u283C","\u2834","\u2826","\u2827","\u2807","\u280F"],g={clear:"\r\x1B[2K",cyan:"\x1B[36m",green:"\x1B[32m",red:"\x1B[31m",yellow:"\x1B[33m",amber:"\x1B[38;5;214m",dim:"\x1B[2m",reset:"\x1B[0m"};function yt(e,t=16){let r=Math.max(1,t-4+1),n=e%r;return"\u2500".repeat(n)+"\u2501".repeat(4)+"\u2500".repeat(Math.max(0,t-n-4))}function ht(e){let t=Date.now()-e;return t<1e3?`${t}ms`:t<1e4?`${(t/1e3).toFixed(1)}s`:`${Math.round(t/1e3)}s`}var Ce=class{stream;enabled;interactive;color;intervalMs;display;label;frame=0;startedAt=0;timer;active=!1;constructor(t,o={}){this.label=t,this.stream=o.stream??process.stderr,this.enabled=o.enabled??!0,this.interactive=o.interactive??this.stream.isTTY===!0,this.color=o.color??(this.interactive&&process.env.NO_COLOR===void 0),this.intervalMs=Math.max(40,o.intervalMs??80),this.display=o.display??"spinner"}start(){return!this.enabled||this.active?this:(this.active=!0,this.startedAt=Date.now(),this.interactive?(this.render(),this.timer=setInterval(()=>{this.frame=(this.frame+1)%1e4,this.render()},this.intervalMs),this.timer.unref?.(),this):(this.stream.write(`\u2192 ${this.label}
`),this))}update(t){return this.label=t,this.enabled&&this.active&&this.interactive&&this.render(),this}succeed(t){this.finish("\u2713",t??this.label,g.green)}fail(t){this.finish("\u2717",t??this.label,g.red)}warn(t){this.finish("!",t??this.label,g.yellow)}stop(){this.active&&(this.timer&&(clearInterval(this.timer),this.timer=void 0),this.enabled&&this.interactive&&this.stream.write(g.clear),this.active=!1)}render(){if(!this.enabled||!this.active||!this.interactive)return;let t=mt[this.frame%mt.length],o=this.display==="bar"?this.color?`${g.amber}${yt(this.frame)}${g.reset}`:yt(this.frame):this.color?`${g.cyan}${t}${g.reset}`:t,r=ht(this.startedAt),n=this.color?`${g.dim}${r}${g.reset}`:r;this.stream.write(`${g.clear}${o} ${this.label} ${n}`)}finish(t,o,r){if(!this.enabled){this.active=!1;return}this.startedAt||(this.startedAt=Date.now()),this.timer&&(clearInterval(this.timer),this.timer=void 0);let n=ht(this.startedAt),i=this.color?`${r}${t}${g.reset}`:t,s=this.color?`${g.dim}${n}${g.reset}`:n;this.interactive?this.stream.write(`${g.clear}${i} ${o} ${s}
`):this.stream.write(`${i} ${o} (${n})
`),this.active=!1}};async function je(e,t,o={}){let r=new Ce(e,o).start();try{let n=await t();return r.succeed(),n}catch(n){throw r.fail(),n}}import{existsSync as zt}from"node:fs";import{homedir as pn}from"node:os";import{join as dn}from"node:path";import{spawnSync as fn}from"node:child_process";import{homedir as Jr}from"node:os";import{join as M}from"node:path";function kt(e={}){return M(e.home??Jr(),".gemini")}function bt(e={}){return M(kt(e),"antigravity-cli")}function It(e={}){return M(kt(e),"config")}function Q(e={}){return M(It(e),"mcp_config.json")}function ee(e={}){let t=e.cwd??process.cwd();return M(t,".agents","mcp_config.json")}function te(e="toolnet-memory",t={}){return M(bt(t),"plugins",e)}function Ct(e={}){return[bt(e),Q(e),It(e),ee(e)]}import{homedir as jt}from"node:os";import{join as O}from"node:path";function E(e={}){let t=process.env.OPENCODE_CONFIG_DIR?.trim();if(t)return t;let o=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return o?O(o,"opencode"):O(e.home??jt(),".config","opencode")}function ve(e={}){let t=process.env.OPENCODE_CONFIG?.trim();if(t)return t;let o=e.home??jt(),r=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return r?O(r,"opencode","opencode.json"):O(o,".config","opencode","opencode.json")}function we(e={}){let t=e.cwd??process.cwd();return O(t,"opencode.json")}function vt(e={}){return O(E(e),"plugins")}function wt(e={}){return O(E(e),"AGENTS.md")}import{homedir as St}from"node:os";import{join as Se}from"node:path";function Oe(e={}){return Se(e.home??St(),".claude")}function Ot(e={}){return Se(Oe(e),"settings.json")}function xt(e={}){return Se(e.home??St(),".claude.json")}import{homedir as Lr}from"node:os";import{join as x}from"node:path";function xe(e={}){return e.kiroHome??process.env.KIRO_HOME??x(e.home??Lr(),".kiro")}function Gr(e={}){return x(xe(e),"settings")}function oe(e={}){return x(Gr(e),"mcp.json")}function Re(e={}){let t=e.cwd??process.cwd();return x(t,".kiro","settings","mcp.json")}function Kr(e={}){return x(xe(e),"hooks")}function Me(e={}){return x(Kr(e),"toolnet-memory.json")}function Ee(e={}){let t=e.cwd??process.cwd();return x(t,".kiro","hooks","toolnet-memory.json")}function Rt(e={}){return[xe(e),oe(e)]}import{homedir as Br}from"node:os";import{join as Ae}from"node:path";function Mt(e={}){return Ae(e.home??Br(),".toolnetcli")}function Ur(e={}){return Ae(Mt(e),"config.json")}function Et(e={}){let t=e.cwd??process.cwd();return Ae(t,".toolnet","mcp.json")}function At(e={}){let t=Mt(e),o=Ur(e);return[t,o]}import{homedir as Wr}from"node:os";import{join as Te}from"node:path";function Tt(e={}){if(e.kiloHome)return e.kiloHome;if(process.env.KILO_HOME)return process.env.KILO_HOME;let t=e.xdgConfigHome??process.env.XDG_CONFIG_HOME;return t?Te(t,"kilo"):Te(e.home??Wr(),".config","kilo")}function Pe(e={}){return Te(Tt(e),"kilo.jsonc")}function Pt(e={}){let t=Tt(e),o=Pe(e);return[t,o]}import{homedir as zr}from"node:os";import{join as b,resolve as Vr}from"node:path";function re(e={}){return e.cursorHome??b(e.home??zr(),".cursor")}function Yr(e={}){return e.cursorConfigDir??process.env.CURSOR_CONFIG_DIR??(e.xdgConfigHome??process.env.XDG_CONFIG_HOME?b(e.xdgConfigHome??process.env.XDG_CONFIG_HOME,"cursor"):void 0)??re(e)}function ne(e={}){return b(re(e),"mcp.json")}function ie(e={}){return b(re(e),"hooks.json")}function Fe(e){return b(Vr(e),".cursor")}function Ft(e){return b(Fe(e),"mcp.json")}function Nt(e){return b(Fe(e),"hooks.json")}function qr(e){return b(Fe(e),"rules")}function _t(e){return b(qr(e),"toolnet-memory.mdc")}function Dt(e={}){return Array.from(new Set([re(e),Yr(e)]))}import{homedir as Zr}from"node:os";import{join as k,resolve as Xr}from"node:path";function Ne(e={}){return e.copilotHome??process.env.COPILOT_HOME??k(e.home??Zr(),".copilot")}function se(e={}){return k(Ne(e),"mcp-config.json")}function Qr(e={}){return k(Ne(e),"hooks")}function ce(e={}){return k(Qr(e),"toolnet-memory.json")}function _e(e){return k(Xr(e),".github")}function $t(e){return k(_e(e),"mcp.json")}function en(e){return k(_e(e),"hooks")}function Ht(e){return k(en(e),"toolnet-memory.json")}function tn(e){return k(_e(e),"instructions")}function Jt(e){return k(tn(e),"toolnet-memory.instructions.md")}function Lt(e={}){return[Ne(e)]}import{homedir as on}from"node:os";import{join as y,resolve as rn}from"node:path";function ae(e={}){return e.grokHome??process.env.GROK_HOME??y(e.home??on(),".grok")}function le(e={}){return y(ae(e),"config.toml")}function nn(e={}){return y(ae(e),"hooks")}function ue(e={}){return y(nn(e),"toolnet-memory.json")}function sn(e={}){return y(ae(e),"skills")}function cn(e={}){return y(sn(e),"toolnet-continuity")}function pe(e={}){return y(cn(e),"SKILL.md")}function De(e){return y(rn(e),".grok")}function Gt(e){return y(De(e),"config.toml")}function an(e){return y(De(e),"hooks")}function Kt(e){return y(an(e),"toolnet-memory.json")}function ln(e){return y(De(e),"skills")}function un(e){return y(ln(e),"toolnet-continuity")}function Bt(e){return y(un(e),"SKILL.md")}function Ut(e={}){return[ae(e)]}function gn(e){return fn("sh",["-lc",`command -v ${JSON.stringify(e)} >/dev/null 2>&1`],{stdio:"ignore"}).status===0}function v(e){let t=e.commandExists(e.command),o=e.configPaths.filter(i=>zt(i)),r=o.length>0,n=[];t&&n.push(`command:${e.command}`);for(let i of o)n.push(`config:${i}`);return{agent:e.agent,detected:t||r,commandDetected:t,configDetected:r,evidence:n}}function Wt(e){let t=e.commands.filter(s=>e.commandExists(s)),o=e.configPaths.filter(s=>zt(s)),r=t.length>0,n=o.length>0,i=[...t.map(s=>`command:${s}`),...o.map(s=>`config:${s}`)];return{agent:e.agent,detected:r||n,commandDetected:r,configDetected:n,evidence:i}}function Vt(e={}){let t=e.home??pn(),o=e.commandExists??gn,r=e.codexHome??process.env.CODEX_HOME??dn(t,".codex");return[v({agent:"agy",command:"agy",commandExists:o,configPaths:Ct({home:t})}),v({agent:"opencode",command:"opencode",commandExists:o,configPaths:[E({home:t,xdgConfigHome:e.xdgConfigHome})]}),v({agent:"claude",command:"claude",commandExists:o,configPaths:[Oe({home:t})]}),v({agent:"kiro",command:"kiro-cli",commandExists:o,configPaths:Rt({home:t,kiroHome:e.kiroHome})}),Wt({agent:"cursor",commands:["agent","cursor-agent"],commandExists:o,configPaths:Dt({home:t,cursorHome:e.cursorHome,cursorConfigDir:e.cursorConfigDir,xdgConfigHome:e.xdgConfigHome})}),v({agent:"copilot",command:"copilot",commandExists:o,configPaths:Lt({home:t,copilotHome:e.copilotHome})}),v({agent:"grok",command:"grok",commandExists:o,configPaths:Ut({home:t,grokHome:e.grokHome})}),v({agent:"toolnet-cli",command:"toolnet",commandExists:o,configPaths:At({home:t})}),Wt({agent:"kilo",commands:["kilo","kilo-code"],commandExists:o,configPaths:Pt({home:t,kiloHome:e.kiloHome})}),v({agent:"codex",command:"codex",commandExists:o,configPaths:[r]})]}import{existsSync as Pn,mkdirSync as eo,readFileSync as Fn,renameSync as Nn,writeFileSync as _n}from"node:fs";import{dirname as Dn,join as fe}from"node:path";import{existsSync as mn,mkdirSync as yn,readFileSync as hn,renameSync as kn,rmSync as bn,writeFileSync as In}from"node:fs";import{dirname as Cn,join as jn}from"node:path";function vn(e){return`'${e.replace(/'/g,"'\\''")}'`}function wn(e){if(!mn(e))return{};let t;try{t=JSON.parse(hn(e,"utf8"))}catch{throw new Error(`Invalid existing Agy hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Agy hooks.json at ${e}: root must be a JSON object.`);return t}function Sn(e,t){yn(Cn(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{In(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),kn(o,e)}finally{bn(o,{force:!0})}}function Yt(e={}){let t=e.pluginName??"toolnet-memory",o=e.hooksFile??jn(te(t),"hooks.json"),r=wn(o),n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",i=`${vn(n)} session:agy-hook`;return r["toolnet-memory"]={enabled:!0,PreToolUse:[{matcher:"view_file|list_dir|find_by_name|grep_search|run_command",hooks:[{type:"command",command:`${i} pre-tool`,timeout:5}]}],PreInvocation:[{type:"command",command:`${i} pre`,timeout:15}],PostInvocation:[{type:"command",command:`${i} post`,timeout:15}],Stop:[{type:"command",command:`${i} stop`,timeout:30}]},Sn(o,r),o}import{existsSync as On,mkdirSync as xn,readFileSync as Rn,renameSync as Mn,writeFileSync as En}from"node:fs";import{dirname as An}from"node:path";function $(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Tn(e,t){xn(An(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;En(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Mn(o,e)}function qt(e){if(!On(e))return{};let t=Rn(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Agy MCP config at ${e}: parse error. Not overwriting.`)}if(!$(o))throw new Error(`Invalid existing Agy MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Zt(e,t){return $(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function de(e,t,o,r){let n=qt(e),i=n.mcpServers;if(i!==void 0&&!$(i))throw new Error(`Invalid existing Agy MCP config: mcpServers must be an object in ${e}.`);let s=$(i)?{...i}:{},c=s[o];if(Zt(c,t)&&!r)return{installed:!0,changed:!1};s[o]={command:t,args:["mcp"]};let a={...n,mcpServers:s};Tn(e,a);let u=qt(e).mcpServers;if(!$(u)||!Zt(u[o],t))throw new Error(`Agy MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function Xt(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...de(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(r==="both"){let s=Q(),c=ee({cwd:e.cwd}),a=de(s,t,o,e.force??!1),l=de(c,t,o,e.force??!1);return{installed:!0,changed:a.changed||l.changed,configFile:s,serverName:o,command:t,args:["mcp"]}}let n=r==="workspace"?ee({cwd:e.cwd}):Q();return{...de(n,t,o,e.force??!1),configFile:n,serverName:o,command:t,args:["mcp"]}}var $n=`# ToolNet Memory Continuity

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
`;function Hn(e,t){eo(Dn(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;_n(o,t,{encoding:"utf8",mode:384}),Nn(o,e)}function Qt(e,t){Pn(e)&&Fn(e,"utf8")===t||Hn(e,t)}function to(e={}){let t=e.pluginName??"toolnet-memory",o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.pluginRoot??te(t),n=fe(r,"plugin.json"),i=fe(r,"mcp_config.json"),s=fe(r,"hooks.json"),c=fe(r,"rules","toolnet-memory-continuity.md");return eo(r,{recursive:!0,mode:448}),Qt(n,`${JSON.stringify({$schema:"https://antigravity.google/schemas/v1/plugin.json",name:t,description:"Persistent project continuity and memory for Antigravity coding sessions."},null,2)}
`),Xt({configFile:i,binary:o,serverName:"toolnet-memory",force:e.force}),Yt({hooksFile:s,binary:o,pluginName:t}),Qt(c,`${$n.trim()}
`),{installed:!0,pluginRoot:r,files:[n,i,s,c]}}import{existsSync as Ln,mkdirSync as io,readFileSync as Gn,writeFileSync as so}from"node:fs";import{join as ro}from"node:path";var Jn="memory_agent_ask";function oo(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${Jn}

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
`.trim()}var no="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",$e="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function Kn(e={}){let t=wt();io(E(),{recursive:!0});let o=`${no}
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


${oo()}

${$e}`,r=Ln(t)?Gn(t,"utf8"):"",n=r.indexOf(no),i=r.indexOf($e);return n>=0&&i>=n?r=r.slice(0,n)+o+r.slice(i+$e.length):(r=r.trimEnd(),r&&(r+=`

`),r+=o),so(t,r.trimEnd()+`
`,{encoding:"utf8",mode:384}),t}function co(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[];o.push(Kn({cwd:e.cwd}));let r=e.scope??"global",n=[];if((r==="global"||r==="both")&&n.push(e.directory??vt()),r==="project"||r==="both"){let i=e.cwd??process.cwd();n.push(ro(i,".opencode","plugins"))}for(let i of n){io(i,{recursive:!0});let s=ro(i,"toolnet-memory.js"),c=`
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
`;so(s,c.trimStart(),{encoding:"utf8",mode:384}),o.push(s)}return o}import{existsSync as uo,mkdirSync as Bn,readFileSync as Un,renameSync as Wn,writeFileSync as zn}from"node:fs";import{dirname as po,join as Vn}from"node:path";function H(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Yn(e,t){Bn(po(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;zn(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Wn(o,e)}function ao(e){if(!uo(e))return{};let t=Un(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing OpenCode config at ${e}: parse error. Not overwriting.`)}if(!H(o))throw new Error(`Invalid existing OpenCode config at ${e}: root must be a JSON object. Not overwriting.`);return o}function lo(e,t){if(!H(e))return!1;let o=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(o)&&o.length===2&&o[0]===t&&o[1]==="mcp"}function ge(e,t,o,r){let n=Vn(po(e),"opencode.jsonc"),i=uo(n)?n:void 0,s=ao(e),c=s.mcp;if(c!==void 0&&!H(c))throw new Error(`Invalid existing OpenCode config: mcp must be an object in ${e}.`);let a=H(c)?{...c}:{},l=a[o];if(lo(l,t)&&!r)return{installed:!0,changed:!1,preservedJsonc:i};a[o]={type:"local",command:[t,"mcp"],enabled:!0};let u={...s,mcp:a};Yn(e,u);let p=ao(e);if(!H(p.mcp)||!lo(p.mcp[o],t))throw new Error(`OpenCode MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0,preservedJsonc:i}}function fo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...ge(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:[t,"mcp"]};if(r==="both"){let s=ve(),c=we({cwd:e.cwd}),a=ge(s,t,o,e.force??!1),l=ge(c,t,o,e.force??!1);return{installed:!0,changed:a.changed||l.changed,configFile:s,serverName:o,command:[t,"mcp"],preservedJsonc:a.preservedJsonc??l.preservedJsonc}}let n=r==="project"?we({cwd:e.cwd}):ve();return{...ge(n,t,o,e.force??!1),configFile:n,serverName:o,command:[t,"mcp"]}}import{existsSync as qn,mkdirSync as go,readFileSync as Zn,writeFileSync as mo}from"node:fs";import{homedir as yo}from"node:os";import{dirname as ho,join as He}from"node:path";function Xn(e){let t=[],o=/"((?:\\.|[^"\\])*)"|'([^']*)'/g,r;for(;r=o.exec(e);){let n=r[1]??r[2]??"";try{t.push(r[1]!==void 0?JSON.parse(`"${n}"`):n)}catch{t.push(n)}}return t}function ko(e={}){let t=e.configFile??He(process.env.CODEX_HOME??He(yo(),".codex"),"config.toml"),o=e.previousFile??He(yo(),".config","toolnet-memory","codex-notify-previous.json");go(ho(t),{recursive:!0}),go(ho(o),{recursive:!0});let r=qn(t)?Zn(t,"utf8"):"",n=e.binary??"toolnet-memory",i=`notify = [${JSON.stringify(n)}, "session:codex-notify"]`,s=r.split(`
`),c=s.findIndex(d=>/^\s*\[/.test(d));c<0&&(c=s.length);let a=-1,l=-1;for(let d=0;d<c;d+=1)if(/^\s*notify\s*=/.test(s[d])){if(a=d,l=d,s[d].includes("[")&&!s[d].includes("]"))for(;l+1<c&&(l+=1,!s[l].includes("]")););break}let u=[];if(a>=0){let d=s.slice(a,l+1).join(`
`);u=Xn(d),s.splice(a,l-a+1,i)}else c=s.findIndex(d=>/^\s*\[/.test(d)),c<0&&(c=s.length),s.splice(c,0,i);let p=u.length>=2&&u[u.length-1]==="session:codex-notify";return u.length>0&&!p&&mo(o,JSON.stringify(u,null,2)+`
`,{encoding:"utf8",mode:384}),r=s.join(`
`),r.endsWith(`
`)||(r+=`
`),mo(t,r,{encoding:"utf8",mode:384}),{configFile:t,previousFile:o,preservedPrevious:u.length>0&&!p}}import{existsSync as Qn,mkdirSync as ei,readFileSync as ti,writeFileSync as oi}from"node:fs";import{homedir as ri}from"node:os";import{dirname as ni,join as bo}from"node:path";function ii(e){return`'${e.replace(/'/g,"'\\''")}'`}function Io(e={}){let t=e.hooksFile??bo(process.env.CODEX_HOME??bo(ri(),".codex"),"hooks.json");ei(ni(t),{recursive:!0});let o={};if(Qn(t))try{o=JSON.parse(ti(t,"utf8"))}catch(c){throw new Error(`Invalid existing Codex hooks.json: ${c instanceof Error?c.message:String(c)}`)}let r=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=r;let i=(Array.isArray(r.SessionStart)?r.SessionStart:[]).filter(c=>{try{return!JSON.stringify(c).includes("session:codex-context")}catch{return!0}}),s=e.binary??"toolnet-memory";return i.push({matcher:"startup|resume|clear|compact",hooks:[{type:"command",command:`${ii(s)} session:codex-context`,timeout:15,additionalContextLimit:1e3,statusMessage:"Loading ToolNet project continuity"}]}),r.SessionStart=i,oi(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),t}import{spawnSync as si}from"node:child_process";function Je(e,t){return si(e,t,{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}function Co(e,t){let o=Je(e,["mcp","get",t,"--json"]);if(o.status!==0||!o.stdout)return null;try{return JSON.parse(o.stdout)}catch{return null}}function jo(e,t){return e.enabled!==!1&&e.transport?.type==="stdio"&&e.transport?.command===t&&Array.isArray(e.transport?.args)&&e.transport?.args.length===1&&e.transport.args[0]==="mcp"}function vo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.codexBinary??"codex",r=e.serverName??"toolnet-memory",n=Co(o,r);if(n&&jo(n,t))return{installed:!0,changed:!1,serverName:r,command:t,args:["mcp"]};if(n){let c=Je(o,["mcp","remove",r]);if(c.status!==0)return{installed:!1,changed:!1,serverName:r,command:t,args:["mcp"],error:(c.stderr||c.stdout||"Unable to remove old ToolNet MCP configuration.").trim()}}let i=Je(o,["mcp","add",r,"--",t,"mcp"]);if(i.status!==0)return{installed:!1,changed:!1,serverName:r,command:t,args:["mcp"],error:(i.stderr||i.stdout||"Unable to register ToolNet MCP.").trim()};let s=Co(o,r);return!s||!jo(s,t)?{installed:!1,changed:!0,serverName:r,command:t,args:["mcp"],error:"Codex accepted MCP registration but verification did not match expected ToolNet command."}:{installed:!0,changed:!0,serverName:r,command:t,args:["mcp"]}}import{existsSync as ci,mkdirSync as ai,readFileSync as li,renameSync as ui,rmSync as pi,writeFileSync as di}from"node:fs";import{dirname as fi}from"node:path";function J(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function gi(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function mi(e){if(!ci(e))return{};let t;try{t=JSON.parse(li(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude settings.json: ${o instanceof Error?o.message:String(o)}`)}if(!J(t))throw new Error("Invalid existing Claude settings.json: root must be a JSON object.");return t}function Le(e){if(e===void 0)return[];if(!Array.isArray(e))throw new Error("Invalid existing Claude settings.json: hook event must be an array.");let t=[];for(let o of e){if(!J(o)){t.push(o);continue}let r=o.hooks;if(!Array.isArray(r)){t.push(o);continue}let n=r.filter(i=>{if(!J(i))return!0;let s=i.command;return!(typeof s=="string"&&s.includes("session:claude-hook"))});n.length!==0&&t.push({...o,hooks:n})}return t}function Ge(e){return{type:"command",command:e,timeout:10}}function yi(e,t){ai(fi(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{di(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),ui(o,e)}finally{pi(o,{force:!0})}}function wo(e={}){let t=e.settingsFile??Ot(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=mi(t),n=r.hooks;if(n!==void 0&&!J(n))throw new Error("Invalid existing Claude settings.json: hooks must be an object.");let i=J(n)?{...n}:{},s=`${gi(o)} session:claude-hook`,c=Le(i.SessionStart);c.push({matcher:"startup|resume|clear|compact",hooks:[Ge(s)]}),i.SessionStart=c;let a=Le(i.PostToolUse);a.push({matcher:"Edit|Write",hooks:[Ge(s)]}),i.PostToolUse=a;let l=Le(i.Stop);l.push({hooks:[Ge(s)]}),i.Stop=l;let u={...r,hooks:i},p=JSON.stringify(r),d=JSON.stringify(u);return p===d?{settingsFile:t,changed:!1}:(yi(t,u),{settingsFile:t,changed:!0})}import{existsSync as hi,mkdirSync as ki,readFileSync as bi,renameSync as Ii,rmSync as Ci,writeFileSync as ji}from"node:fs";import{dirname as vi}from"node:path";function L(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function So(e){if(!hi(e))return{};let t;try{t=JSON.parse(bi(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude Code config: ${o instanceof Error?o.message:String(o)}`)}if(!L(t))throw new Error("Invalid existing Claude Code config: root must be a JSON object.");return t}function Oo(e,t){if(!L(e))return!1;let o=e.args;return e.type==="stdio"&&e.command===t&&Array.isArray(o)&&o.length===1&&o[0]==="mcp"}function wi(e,t){ki(vi(e),{recursive:!0});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{ji(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Ii(o,e)}finally{Ci(o,{force:!0})}}function xo(e={}){let t=e.stateFile??xt(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=So(t),i=n.mcpServers;if(i!==void 0&&!L(i))throw new Error("Invalid existing Claude Code config: mcpServers must be an object.");let s=L(i)?{...i}:{},c=s[r];if(Oo(c,o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:[o,"mcp"],repaired:!1};let a=c!==void 0;s[r]={type:"stdio",command:o,args:["mcp"]},wi(t,{...n,mcpServers:s});let u=So(t).mcpServers;if(!L(u)||!Oo(u[r],o))throw new Error("Claude Code MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:[o,"mcp"],repaired:a}}function Ro(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=wo({binary:t,settingsFile:e.settingsFile}),r=xo({binary:t,stateFile:e.stateFile});return{hooks:o,mcp:r,files:[o.settingsFile,r.configFile]}}import{existsSync as Si,mkdirSync as Oi,readFileSync as xi,renameSync as Ri,rmSync as Mi,writeFileSync as Ei}from"node:fs";import{dirname as Ai}from"node:path";var A="ToolNet Memory - ";function Ao(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Ti(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function Mo(e){if(!Si(e))return{};let t=xi(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro hooks file at ${e}: parse error. Not overwriting.`)}if(!Ao(o))throw new Error(`Invalid existing Kiro hooks file at ${e}: root must be a JSON object. Not overwriting.`);return o}function Eo(e){return Ao(e)?typeof e.name=="string"&&e.name.startsWith(A):!1}function G(e){return{type:"command",command:e}}function Pi(e){return[{name:`${A}Session Start`,description:"Inject compact local ToolNet continuity and capture Kiro session activation.",trigger:"SessionStart",action:G(e),timeout:10,enabled:!0},{name:`${A}Prompt Continuity`,description:"Capture prompts and refresh ToolNet guidance only for resume/continue requests.",trigger:"UserPromptSubmit",action:G(e),timeout:10,enabled:!0},{name:`${A}Raw History Guard`,description:"Prevent Kiro from reconstructing continuity from raw ToolNet/agent session history.",trigger:"PreToolUse",matcher:"*",action:G(e),timeout:10,enabled:!0},{name:`${A}Tool Capture`,description:"Capture durable tool activity while filtering noisy read-only events.",trigger:"PostToolUse",matcher:"*",action:G(e),timeout:15,enabled:!0},{name:`${A}Final Flush`,description:"Flush pending Kiro WAL events when the assistant finishes a turn.",trigger:"Stop",action:G(e),timeout:30,enabled:!0}]}function Fi(e,t){Oi(Ai(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Ei(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Ri(o,e)}finally{Mi(o,{force:!0})}}function me(e,t,o){let r=Mo(e);if(r.version!==void 0&&r.version!=="v1")throw new Error(`Unsupported existing Kiro hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!Array.isArray(n))throw new Error("Invalid existing Kiro hooks file: hooks must be an array.");let i=Array.isArray(n)?n.filter(l=>!Eo(l)):[],s=Pi(t),c={...r,version:"v1",hooks:[...i,...s]};if(!o&&JSON.stringify(r)===JSON.stringify(c))return{changed:!1,hookCount:s.length};Fi(e,c);let a=Mo(e);if(a.version!=="v1"||!Array.isArray(a.hooks)||a.hooks.filter(Eo).length!==s.length)throw new Error("Kiro hooks were written but verification failed.");return{changed:!0,hookCount:s.length}}function To(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=`${Ti(t)} session:kiro-hook`;if(e.hooksFile){let s=me(e.hooksFile,r,e.force??!1);return{hooksFile:e.hooksFile,...s}}if(o==="both"){let s=Me(),c=Ee({cwd:e.cwd}),a=me(s,r,e.force??!1),l=me(c,r,e.force??!1);return{hooksFile:s,changed:a.changed||l.changed,hookCount:a.hookCount}}let n=o==="project"?Ee({cwd:e.cwd}):Me(),i=me(n,r,e.force??!1);return{hooksFile:n,...i}}import{existsSync as Ni,mkdirSync as _i,readFileSync as Di,renameSync as $i,rmSync as Hi,writeFileSync as Ji}from"node:fs";import{dirname as Li}from"node:path";function K(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Po(e){if(!Ni(e))return{};let t=Di(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro MCP config at ${e}: parse error. Not overwriting.`)}if(!K(o))throw new Error(`Invalid existing Kiro MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Fo(e,t){return K(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&e.disabled===!1:!1}function Gi(e,t){_i(Li(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Ji(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),$i(o,e)}finally{Hi(o,{force:!0})}}function ye(e,t,o,r){let n=Po(e),i=n.mcpServers;if(i!==void 0&&!K(i))throw new Error(`Invalid existing Kiro MCP config: mcpServers must be an object in ${e}.`);let s=K(i)?{...i}:{},c=s[o];if(Fo(c,t)&&!r)return{installed:!0,changed:!1};s[o]={command:t,args:["mcp"],disabled:!1};let a={...n,mcpServers:s};Gi(e,a);let u=Po(e).mcpServers;if(!K(u)||!Fo(u[o],t))throw new Error(`Kiro MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function No(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...ye(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(r==="both"){let s=oe(),c=Re({cwd:e.cwd}),a=ye(s,t,o,e.force??!1),l=ye(c,t,o,e.force??!1);return{installed:!0,changed:a.changed||l.changed,configFile:s,serverName:o,command:t,args:["mcp"]}}let n=r==="project"?Re({cwd:e.cwd}):oe();return{...ye(n,t,o,e.force??!1),configFile:n,serverName:o,command:t,args:["mcp"]}}function _o(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=No({binary:t,configFile:e.configFile,scope:e.scope,cwd:e.cwd,force:e.force}),r=To({binary:t,hooksFile:e.hooksFile,scope:e.scope,cwd:e.cwd,force:e.force});return{installed:o.installed,changed:o.changed||r.changed,mcp:o,hooks:r,files:[o.configFile,r.hooksFile]}}import{existsSync as Ki,mkdirSync as Bi,readFileSync as Ui,renameSync as Wi,rmSync as zi,writeFileSync as Vi}from"node:fs";import{dirname as Yi}from"node:path";function Ke(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function qi(e){if(!Ki(e))return{};let t=Ui(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: parse error. Not overwriting.`)}if(!Ke(o))throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Zi(e,t){Bi(Yi(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Vi(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Wi(o,e)}finally{zi(o,{force:!0})}}function Do(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??Et({cwd:e.cwd}),r=qi(o),n="toolnet-memory";if(Ke(r.mcpServers)&&r.mcpServers[n]!=null&&!e.force)return{installed:!0,changed:!1,configFile:o};let s=Ke(r.mcpServers)?{...r.mcpServers}:{};return s[n]={command:t,args:["mcp"]},r.mcpServers=s,Zi(o,r),{installed:!0,changed:!0,configFile:o}}function $o(e={}){let t=e.binary??"toolnet-memory",o=Do({binary:t,configFile:e.configFile,force:e.force,cwd:e.cwd});return{installed:o.installed,changed:o.changed,mcp:{...o,configured:o.installed},files:[o.configFile]}}import{mkdirSync as is,existsSync as ss}from"node:fs";import{dirname as cs}from"node:path";import{existsSync as Xi,mkdirSync as Qi,readFileSync as es,renameSync as ts,rmSync as os,writeFileSync as rs}from"node:fs";import{dirname as ns}from"node:path";function m(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function w(e,t){if(!Xi(e))return{};let o=es(e,"utf8").trim();if(!o)return{};let r;try{r=JSON.parse(o)}catch(n){throw new Error(`Invalid existing ${t} MCP config: ${n instanceof Error?n.message:String(n)}`)}if(!m(r))throw new Error(`Invalid existing ${t} MCP config: root must be a JSON object.`);return r}function T(e,t){Qi(ns(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{rs(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),ts(o,e)}finally{os(o,{force:!0})}}function Ho(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??Pe(),r=cs(o);ss(r)||is(r,{recursive:!0});let n=w(o,"Kilo"),i=n.mcp;if(i!==void 0&&!m(i))throw new Error("Invalid existing Kilo config: mcp must be an object.");let s=m(i)?{...i}:{},c="toolnet-memory";return m(s[c])&&!e.force?{installed:!0,changed:!1,configFile:o,configured:!0}:(s[c]={type:"local",command:[t,"mcp"],enabled:!0,timeout:1e4},T(o,{...n,mcp:s}),{installed:!0,changed:!0,configFile:o,configured:!0})}function Jo(e={}){let t=e.binary??"toolnet-memory",o=Ho({binary:t,configFile:e.configFile,force:e.force});return{installed:o.installed,changed:o.changed,mcp:o,files:[o.configFile]}}import{existsSync as as,mkdirSync as ls,readFileSync as us,renameSync as ps,rmSync as ds,writeFileSync as fs}from"node:fs";import{dirname as gs}from"node:path";function f(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function I(e,t){if(!as(e))return{};let o=us(e,"utf8").trim();if(!o)return{};let r;try{r=JSON.parse(o)}catch(n){throw new Error(`Invalid existing ${t} hooks file: ${n instanceof Error?n.message:String(n)}`)}if(!f(r))throw new Error(`Invalid existing ${t} hooks file: root must be a JSON object.`);return r}function P(e,t){ls(gs(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{fs(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),ps(o,e)}finally{ds(o,{force:!0})}}function Be(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}var B=[["sessionStart",10],["beforeSubmitPrompt",10],["preToolUse",10],["postToolUse",15],["afterAgentResponse",15],["stop",30]];function Lo(e){return f(e)&&typeof e.command=="string"&&e.command.includes("session:cursor-hook")}function ms(e,t,o){let n={type:"command",command:`TOOLNET_HOOK_EVENT=${Be(e)} ${Be(t)} session:cursor-hook`,timeout:o};return e==="preToolUse"&&(n.matcher=".*"),n}function Ue(e={}){let t=e.hooksFile??ie(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=I(t,"Cursor");if(r.version!==void 0&&r.version!==1)throw new Error(`Unsupported existing Cursor hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!f(n))throw new Error("Invalid existing Cursor hooks file: hooks must be an object.");let i=f(n)?{...n}:{};for(let[l,u]of B){let p=i[l];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing Cursor hooks file: hooks.${l} must be an array.`);let d=Array.isArray(p)?p.filter(_=>!Lo(_)):[];i[l]=[...d,ms(l,o,u)]}let s={...r,version:1,hooks:i};if(JSON.stringify(r)===JSON.stringify(s))return{hooksFile:t,changed:!1,hookCount:B.length};P(t,s);let c=I(t,"Cursor");if(c.version!==1||!f(c.hooks))throw new Error("Cursor hooks were written but verification failed.");let a=0;for(let[l]of B){let u=c.hooks[l];if(!Array.isArray(u))throw new Error("Cursor hooks were written but verification failed.");a+=u.filter(Lo).length}if(a!==B.length)throw new Error("Cursor hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:B.length}}function Go(e,t){return m(e)?(e.type===void 0||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function We(e={}){let t=e.configFile??ne(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=w(t,"Cursor"),i=n.mcpServers;if(i!==void 0&&!m(i))throw new Error("Invalid existing Cursor MCP config: mcpServers must be an object.");let s=m(i)?{...i}:{};if(Go(s[r],o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};s[r]={type:"stdio",command:o,args:["mcp"]},T(t,{...n,mcpServers:s});let a=w(t,"Cursor").mcpServers;if(!m(a)||!Go(a[r],o))throw new Error("Cursor MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}import{mkdirSync as ys,readFileSync as Ko,renameSync as hs,rmSync as ks,writeFileSync as bs}from"node:fs";import{dirname as Is}from"node:path";var ze=`---
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
`;function Cs(e,t){ys(Is(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{bs(o,t,{encoding:"utf8",mode:384}),hs(o,e)}finally{ks(o,{force:!0})}}function Bo(e){let t=e.ruleFile??_t(e.projectRoot);try{if(Ko(t,"utf8")===ze)return{ruleFile:t,changed:!1}}catch{}if(Cs(t,ze),Ko(t,"utf8")!==ze)throw new Error("Cursor ToolNet project rule was written but verification failed.");return{ruleFile:t,changed:!0}}import{spawnSync as js}from"node:child_process";import{existsSync as F,statSync as vs}from"node:fs";import{dirname as ws,join as Ss,parse as Os,resolve as Ye}from"node:path";function Uo(e){let t=Ye(e);if(!F(t))throw new Error(`Project path does not exist: ${t}`);if(!vs(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);return t}function he(e){return Ss(e,".toolnet","project.json")}function xs(e){let t=Ye(e),o=Os(t).root;for(;;){if(F(he(t)))return t;if(t===o)return;let r=ws(t);if(r===t)return;t=r}}function Ve(e){let t=js("git",["rev-parse","--show-toplevel"],{cwd:e,encoding:"utf8",timeout:5e3});if(t.status!==0)return;let o=t.stdout.trim();return o?Ye(o):void 0}function C(e={}){let t=Uo(e.cwd??process.cwd());if(e.project){let n=Uo(e.project),i=he(n),s=Ve(n);return{root:n,source:"explicit",eligible:!0,toolnetProject:F(i),manifestFile:F(i)?i:void 0,gitRoot:s}}let o=xs(t);if(o){let n=he(o);return{root:o,source:"toolnet",eligible:!0,toolnetProject:!0,manifestFile:n,gitRoot:Ve(o)}}let r=Ve(t);if(r){let n=he(r);return{root:r,source:"git",eligible:!0,toolnetProject:F(n),manifestFile:F(n)?n:void 0,gitRoot:r}}return{root:t,source:"cwd",eligible:!1,toolnetProject:!1}}function Yo(e,t={}){let o=[],r=e.indexOf("--scope");if(r>=0){let i=e[r+1];if(i!=="global"&&i!=="project"&&i!=="both")throw new Error(`Invalid --scope value: ${String(i)}`);o.push(i)}e.includes("--global")&&o.push("global"),e.includes("--both")&&o.push("both");let n=Array.from(new Set(o));if(n.length>1)throw new Error(`Conflicting integration scopes: ${n.join(", ")}`);return n[0]??t.defaultScope??"global"}function Wo(e,t){return{install:e,effective:t}}function j(e,t){return{surface:e,global:Wo(t.globalInstall,t.effective==="global"||t.effective==="both"),project:Wo(t.projectInstall,t.effective==="project"||t.effective==="both"),effective:t.effective,risk:t.risk??"none",dedupeRequired:t.dedupeRequired??!1,trustRequired:t.trustRequired??t.projectInstall,note:t.note}}function Rs(e){return{mcp:j("mcp",{globalInstall:!0,projectInstall:!1,effective:"global"}),hooks:j("hooks",{globalInstall:!0,projectInstall:!1,effective:"global"}),work:j("work",{globalInstall:e==="grok",projectInstall:!1,effective:e==="grok"?"global":"none",note:e==="grok"?"Grok supports a global ToolNet continuity skill.":"Cursor/Copilot work instructions remain project-scoped."})}}function zo(e){return{mcp:j("mcp",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),hooks:j("hooks",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),work:j("work",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!1,note:e==="cursor"?"Use .cursor/rules/toolnet-memory.mdc.":e==="copilot"?"Use .github/instructions/toolnet-memory.instructions.md.":"Use .grok/skills/toolnet-continuity/SKILL.md."})}}function Vo(e){return{mcp:j("mcp",{globalInstall:!0,projectInstall:!0,effective:"project",risk:e==="cursor"?"precedence-unverified":"shadowed-global",trustRequired:!0,note:e==="cursor"?"Project ToolNet MCP is the intended effective definition; native same-name precedence must be E2E certified before release.":"Global remains useful outside the project; same-name project definition wins inside the project."}),hooks:j("hooks",{globalInstall:!0,projectInstall:!0,effective:"both",risk:"additive-duplicate",dedupeRequired:!0,trustRequired:!0,note:"Global and project hook sources can both execute for the same native event."}),work:j("work",{globalInstall:e==="grok",projectInstall:!0,effective:"project",risk:e==="grok"?"shadowed-global":"none",trustRequired:!1,note:e==="cursor"?"Project rule is authoritative.":e==="copilot"?"Project instruction is authoritative.":"Project skill shadows the same-name global skill inside the project."})}}function N(e){let{agent:t,scope:o,project:r}=e;return(o==="project"||o==="both")&&(!r||!r.eligible)?{agent:t,requestedScope:o,project:r,surfaces:o==="both"?Vo(t):zo(t),canInstall:!1,reason:"Project scope requires an explicit project, existing ToolNet project, or Git repository root."}:{agent:t,requestedScope:o,project:r,surfaces:o==="global"?Rs(t):o==="project"?zo(t):Vo(t),canInstall:!0}}function qo(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.rule?.changed)}function Zo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:C({project:e.projectRoot}),n=N({agent:"cursor",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Cursor project integration scope cannot be resolved.");let i,s;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(i={},n.surfaces.mcp.global.install&&(i.mcp=We({binary:t,configFile:e.configFile??ne()})),n.surfaces.hooks.global.install&&(i.hooks=Ue({binary:t,hooksFile:e.hooksFile??ie()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Cursor project integration requires an eligible project root.");s={},n.surfaces.mcp.project.install&&(s.mcp=We({binary:t,configFile:e.projectConfigFile??Ft(r.root)})),n.surfaces.hooks.project.install&&(s.hooks=Ue({binary:t,hooksFile:e.projectHooksFile??Nt(r.root)})),n.surfaces.work.project.install&&(s.rule=Bo({projectRoot:r.root,ruleFile:e.projectRuleFile}))}let c=s?.mcp??i?.mcp,a=s?.hooks??i?.hooks;if(!c||!a)throw new Error("Cursor integration did not produce an effective MCP/hooks installation.");let l=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.rule?.ruleFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.rule?.ruleFile].filter(u=>typeof u=="string")));return{installed:!0,changed:qo(i)||qo(s),scope:o,plan:n,project:r,global:i,projectScope:s,mcp:c,hooks:a,rule:s?.rule,files:l}}var U=[["sessionStart",10],["userPromptSubmitted",10],["userPromptTransformed",10],["preToolUse",10],["postToolUse",15],["agentStop",30]];function Ms(e){if(typeof e.command=="string")return e.command;if(typeof e.bash=="string")return e.bash}function Xo(e){return f(e)&&Ms(e)?.includes("session:copilot-hook")===!0}function Es(e,t,o){let r={type:"command",command:`${t} session:copilot-hook`,env:{TOOLNET_HOOK_EVENT:e},timeoutSec:o};return e==="preToolUse"&&(r.matcher=".*"),r}function qe(e={}){let t=e.hooksFile??ce(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=I(t,"GitHub Copilot CLI");if(r.version!==void 0&&r.version!==1)throw new Error(`Unsupported existing GitHub Copilot CLI hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!f(n))throw new Error("Invalid existing GitHub Copilot CLI hooks file: hooks must be an object.");let i=f(n)?{...n}:{};for(let[l,u]of U){let p=i[l];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing GitHub Copilot CLI hooks file: hooks.${l} must be an array.`);let d=Array.isArray(p)?p.filter(_=>!Xo(_)):[];i[l]=[...d,Es(l,o,u)]}let s={...r,version:1,hooks:i};if(JSON.stringify(r)===JSON.stringify(s))return{hooksFile:t,changed:!1,hookCount:U.length};P(t,s);let c=I(t,"GitHub Copilot CLI");if(c.version!==1||!f(c.hooks))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");let a=0;for(let[l]of U){let u=c.hooks[l];if(!Array.isArray(u))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");a+=u.filter(Xo).length}if(a!==U.length)throw new Error("GitHub Copilot CLI hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:U.length}}function Qo(e,t){return m(e)?(e.type===void 0||e.type==="local"||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&Array.isArray(e.tools)&&e.tools.length===1&&e.tools[0]==="*":!1}function Ze(e={}){let t=e.configFile??se(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=w(t,"GitHub Copilot CLI"),i=n.mcpServers;if(i!==void 0&&!m(i))throw new Error("Invalid existing GitHub Copilot CLI MCP config: mcpServers must be an object.");let s=m(i)?{...i}:{};if(Qo(s[r],o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};s[r]={type:"stdio",command:o,args:["mcp"],tools:["*"]},T(t,{...n,mcpServers:s});let a=w(t,"GitHub Copilot CLI").mcpServers;if(!m(a)||!Qo(a[r],o))throw new Error("GitHub Copilot CLI MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}import{mkdirSync as As,readFileSync as er,renameSync as Ts,rmSync as Ps,writeFileSync as Fs}from"node:fs";import{dirname as Ns}from"node:path";var Xe=`---
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
`;function _s(e,t){As(Ns(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Fs(o,t,{encoding:"utf8",mode:384}),Ts(o,e)}finally{Ps(o,{force:!0})}}function tr(e){let t=e.instructionFile??Jt(e.projectRoot);try{if(er(t,"utf8")===Xe)return{instructionFile:t,changed:!1}}catch{}if(_s(t,Xe),er(t,"utf8")!==Xe)throw new Error("Copilot ToolNet project instruction verification failed.");return{instructionFile:t,changed:!0}}function or(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.instruction?.changed)}function rr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:C({project:e.projectRoot}),n=N({agent:"copilot",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Copilot project integration scope cannot be resolved.");let i,s;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(i={},n.surfaces.mcp.global.install&&(i.mcp=Ze({binary:t,configFile:e.configFile??se()})),n.surfaces.hooks.global.install&&(i.hooks=qe({binary:t,hooksFile:e.hooksFile??ce()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Copilot project integration requires an eligible project root.");s={},n.surfaces.mcp.project.install&&(s.mcp=Ze({binary:t,configFile:e.projectConfigFile??$t(r.root)})),n.surfaces.hooks.project.install&&(s.hooks=qe({binary:t,hooksFile:e.projectHooksFile??Ht(r.root)})),n.surfaces.work.project.install&&(s.instruction=tr({projectRoot:r.root,instructionFile:e.projectInstructionFile}))}let c=s?.mcp??i?.mcp,a=s?.hooks??i?.hooks;if(!c||!a)throw new Error("Copilot integration did not produce effective MCP/hooks.");let l=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.instruction?.instructionFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.instruction?.instructionFile].filter(u=>typeof u=="string")));return{installed:!0,changed:or(i)||or(s),scope:o,plan:n,project:r,global:i,projectScope:s,mcp:c,hooks:a,instruction:s?.instruction,files:l}}import{existsSync as Ds,mkdirSync as $s,readFileSync as nr,renameSync as Hs,rmSync as Js,writeFileSync as Ls}from"node:fs";import{dirname as Gs}from"node:path";var Qe=`---
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
`;function Ks(e,t){$s(Gs(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Ls(o,t,{encoding:"utf8",mode:384}),Hs(o,e)}finally{Js(o,{force:!0})}}function et(e={}){let t=e.skillFile??pe();if(Ds(t)&&nr(t,"utf8")===Qe)return{skillFile:t,changed:!1};if(Ks(t,Qe),nr(t,"utf8")!==Qe)throw new Error("Grok ToolNet continuity skill was written but verification failed.");return{skillFile:t,changed:!0}}var W=[["SessionStart",10],["UserPromptSubmit",10],["PreToolUse",10],["PostToolUse",15],["Stop",30]];function ir(e){return!f(e)||!Array.isArray(e.hooks)?!1:e.hooks.some(t=>f(t)&&typeof t.command=="string"&&t.command.includes("session:grok-hook"))}function Bs(e,t,o){let r={hooks:[{type:"command",command:`${t} session:grok-hook`,timeout:o,env:{TOOLNET_HOOK_EVENT:e}}]};return e==="PreToolUse"&&(r.matcher=".*"),r}function tt(e={}){let t=e.hooksFile??ue(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=I(t,"Grok Build"),n=r.hooks;if(n!==void 0&&!f(n))throw new Error("Invalid existing Grok Build hooks file: hooks must be an object.");let i=f(n)?{...n}:{};for(let[l,u]of W){let p=i[l];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing Grok Build hooks file: hooks.${l} must be an array.`);let d=Array.isArray(p)?p.filter(_=>!ir(_)):[];i[l]=[...d,Bs(l,o,u)]}let s={...r,hooks:i};if(JSON.stringify(r)===JSON.stringify(s))return{hooksFile:t,changed:!1,hookCount:W.length};P(t,s);let c=I(t,"Grok Build");if(!f(c.hooks))throw new Error("Grok Build hooks were written but verification failed.");let a=0;for(let[l]of W){let u=c.hooks[l];if(!Array.isArray(u))throw new Error("Grok Build hooks were written but verification failed.");a+=u.filter(ir).length}if(a!==W.length)throw new Error("Grok Build hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:W.length}}import{existsSync as Us,mkdirSync as Ws,readFileSync as zs,renameSync as Vs,rmSync as Ys,writeFileSync as qs}from"node:fs";import{dirname as Zs}from"node:path";function sr(e){return Us(e)?zs(e,"utf8"):""}function Xs(e,t){Ws(Zs(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{qs(o,t,{encoding:"utf8",mode:384}),Vs(o,e)}finally{Ys(o,{force:!0})}}function ot(e){return e.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t")}function Qs(e){return`[mcp_servers."${ot(e)}"]`}function ec(e,t){return[Qs(e),`command = "${ot(t)}"`,'args = ["mcp"]',"enabled = true"].join(`
`)}function tc(e){let t=e.trim();return t.startsWith("[")&&t.includes("]")}function ke(e){return e.trim().replace(/\s+/g,"")}function oc(e){return new Set([ke(`[mcp_servers.${e}]`),ke(`[mcp_servers."${e}"]`),ke(`[mcp_servers.'${e}']`)])}function ar(e,t){let o=e.split(/\r?\n/),r=oc(t),n=-1;for(let u=0;u<o.length;u+=1){let p=ke(o[u].replace(/\s+#.*$/,""));if(r.has(p)){n=u;break}}if(n<0)return null;let i=o.length;for(let u=n+1;u<o.length;u+=1)if(tc(o[u])){i=u;break}let s=[],c=0;for(let u of o)s.push(c),c+=u.length+1;let a=s[n]??0,l=i>=o.length?e.length:s[i]??e.length;return{start:a,end:l}}function rc(e,t,o){let r=`${ec(t,o)}
`,n=ar(e,t);if(n){let i=e.slice(0,n.start),s=e.slice(n.end);return`${i}${r}${s.replace(/^\n+/,"")}`}return e.trim()?`${e.replace(/\s*$/,"")}

${r}`:r}function cr(e,t,o){let r=ar(e,t);if(!r)return!1;let n=e.slice(r.start,r.end);return n.includes(`command = "${ot(o)}"`)&&/args\s*=\s*\[\s*"mcp"\s*\]/.test(n)&&/enabled\s*=\s*true/.test(n)}function rt(e={}){let t=e.configFile??le(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=sr(t);if(cr(n,r,o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};let i=rc(n,r,o);Xs(t,i);let s=sr(t);if(!cr(s,r,o))throw new Error("Grok Build MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}function lr(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.skill?.changed)}function ur(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:C({project:e.projectRoot}),n=N({agent:"grok",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Grok project integration scope cannot be resolved.");let i,s;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(i={},n.surfaces.mcp.global.install&&(i.mcp=rt({binary:t,configFile:e.configFile??le()})),n.surfaces.hooks.global.install&&(i.hooks=tt({binary:t,hooksFile:e.hooksFile??ue()})),n.surfaces.work.global.install&&(i.skill=et({skillFile:e.skillFile??pe()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Grok project integration requires an eligible project root.");s={},n.surfaces.mcp.project.install&&(s.mcp=rt({binary:t,configFile:e.projectConfigFile??Gt(r.root)})),n.surfaces.hooks.project.install&&(s.hooks=tt({binary:t,hooksFile:e.projectHooksFile??Kt(r.root)})),n.surfaces.work.project.install&&(s.skill=et({skillFile:e.projectSkillFile??Bt(r.root)}))}let c=s?.mcp??i?.mcp,a=s?.hooks??i?.hooks,l=s?.skill??i?.skill;if(!c||!a||!l)throw new Error("Grok integration did not produce effective MCP/hooks/skill.");let u=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.skill?.skillFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.skill?.skillFile].filter(p=>typeof p=="string")));return{installed:!0,changed:lr(i)||lr(s),scope:o,plan:n,project:r,global:i,projectScope:s,mcp:c,hooks:a,skill:l,files:u}}function pr(e={}){if(e.scope==="global")return{scope:"global",automatic:!1,reason:"explicit-global"};if(e.scope==="project"||e.scope==="both"){let o=C({cwd:e.cwd,project:e.projectRoot});if(!o.eligible)throw new Error(`Explicit ${e.scope} integration requires an explicit project, ToolNet project, or Git repository root.`);return{scope:e.scope,automatic:!1,project:o,reason:e.scope==="project"?"explicit-project":"explicit-both"}}let t=C({cwd:e.cwd,project:e.projectRoot});return t.toolnetProject?{scope:"both",automatic:!0,project:t,reason:"toolnet-project"}:{scope:"global",automatic:!0,reason:"no-toolnet-project"}}function dr(){return Vt()}function nt(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[],r=e.detections??dr(),n=new Map(r.map(s=>[s.agent,s.detected])),i=pr({scope:e.scope,projectRoot:e.projectRoot,cwd:e.cwd});if(!(e.force===!0||n.get("agy")===!0))o.push({agent:"agy",detected:!1,installed:!1,targets:[]});else try{let c=to({binary:t});o.push({agent:"agy",detected:!0,installed:!0,targets:c.files})}catch(c){o.push({agent:"agy",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("opencode")===!0))o.push({agent:"opencode",detected:!1,installed:!1,targets:[]});else try{let c=co({binary:t}),a=fo({binary:t});o.push({agent:"opencode",detected:!0,installed:!0,targets:[...c,a.configFile,`mcp:${a.serverName}`]})}catch(c){o.push({agent:"opencode",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("claude")===!0))o.push({agent:"claude",detected:!1,installed:!1,targets:[]});else try{let c=Ro({binary:t});o.push({agent:"claude",detected:!0,installed:!0,targets:[c.hooks.settingsFile,c.mcp.configFile,`mcp:${c.mcp.serverName}`]})}catch(c){o.push({agent:"claude",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("kiro")===!0))o.push({agent:"kiro",detected:!1,installed:!1,targets:[]});else try{let c=_o({...e.kiro??{},binary:t});o.push({agent:"kiro",detected:!0,installed:!0,targets:[c.mcp.configFile,`mcp:${c.mcp.serverName}`,c.hooks.hooksFile]})}catch(c){o.push({agent:"kiro",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("cursor")===!0))o.push({agent:"cursor",detected:!1,installed:!1,targets:[]});else try{let c=e.cursor??{},a=Zo({...c,binary:t,scope:c.scope??i.scope,projectRoot:c.projectRoot??i.project?.root});o.push({agent:"cursor",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(c){o.push({agent:"cursor",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("copilot")===!0))o.push({agent:"copilot",detected:!1,installed:!1,targets:[]});else try{let c=e.copilot??{},a=rr({...c,binary:t,scope:c.scope??i.scope,projectRoot:c.projectRoot??i.project?.root});o.push({agent:"copilot",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(c){o.push({agent:"copilot",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("grok")===!0))o.push({agent:"grok",detected:!1,installed:!1,targets:[]});else try{let c=e.grok??{},a=ur({...c,binary:t,scope:c.scope??i.scope,projectRoot:c.projectRoot??i.project?.root});o.push({agent:"grok",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(c){o.push({agent:"grok",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("toolnet-cli")===!0))o.push({agent:"toolnet-cli",detected:!1,installed:!1,targets:[]});else try{let c=e.toolnetCli??{},a=$o({...c,binary:t});o.push({agent:"toolnet-cli",detected:!0,installed:!0,targets:[a.mcp.configFile]})}catch(c){o.push({agent:"toolnet-cli",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("kilo")===!0))o.push({agent:"kilo",detected:!1,installed:!1,targets:[]});else try{let c=e.kilo??{},a=Jo({...c,binary:t});o.push({agent:"kilo",detected:!0,installed:!0,targets:[a.mcp.configFile]})}catch(c){o.push({agent:"kilo",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("codex")===!0))o.push({agent:"codex",detected:!1,installed:!1,targets:[]});else try{let c=ko({binary:t}),a=Io({binary:t}),l=vo({binary:t});if(!l.installed)throw new Error(l.error??"Codex MCP registration failed");let u=[c.configFile,a,`mcp:${l.serverName}`];c.preservedPrevious&&u.push(c.previousFile),o.push({agent:"codex",detected:!0,installed:!0,targets:u})}catch(c){o.push({agent:"codex",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}return o}function be(e){switch(e){case"agy":return"Agy / Antigravity";case"opencode":return"OpenCode";case"claude":return"Claude Code";case"kiro":return"Kiro CLI";case"cursor":return"Cursor CLI";case"copilot":return"GitHub Copilot CLI";case"grok":return"Grok Build";case"toolnet-cli":return"ToolNet CLI";case"kilo":return"Kilo";case"codex":return"Codex";default:return e}}function nc(e){console.log(""),console.log("ToolNet Memory Integration Detection"),console.log("===================================="),console.log("");for(let t of e){let o=be(t.agent);if(!t.detected){console.log(`\u25CB ${o}: not detected`);continue}console.log(`\u2713 ${o}: detected`);for(let r of t.evidence)console.log(`  ${r}`)}console.log("")}function ic(e){console.log(""),console.log("ToolNet Memory AI Integrations"),console.log("=============================="),console.log("");for(let t of e){let o=be(t.agent);if(!t.detected){console.log(`- ${o}: not detected`);continue}if(t.installed){let r=t.scope?` [scope=${t.scope}]`:"";console.log(`\u2713 ${o}: automatic memory enabled${r}`),t.projectRoot&&console.log(`  project: ${t.projectRoot}`);continue}console.log(`\u2717 ${o}: integration failed`),t.error&&console.log(`  ${t.error}`)}console.log("")}function sc(e,t){let o=e.indexOf(t);return o>=0?e[o+1]:void 0}function cc(e){return e.includes("--scope")||e.includes("--global")||e.includes("--both")?Yo(e):void 0}async function ac(){let e=process.argv.slice(2),t=e.includes("--all"),o=e.includes("--json"),r=e.includes("--detect-only"),n=cc(e),i=sc(e,"--project");if(r){let c=dr();if(o){console.log(JSON.stringify(c,null,2));return}nc(c);return}let s=nt({force:t,scope:n,projectRoot:i});if(o){console.log(JSON.stringify(s,null,2));return}ic(s)}var lc=process.argv[1]&&(process.argv[1].endsWith("auto-integrate.js")||process.argv[1].endsWith("auto-integrate.ts"));lc&&ac().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});function fc(e=process.cwd()){let t=pc(e);if(!fr(t))throw new Error(`Project path does not exist: ${t}`);if(!uc(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);let o=new q().detect(t),r=dc(o.rootPath,".toolnet","project.json");if(!fr(r))throw new Error(`ToolNet project initialization failed: ${r} was not created`);return{initialized:!0,project:{id:o.id,name:o.name,remote:o.remote,rootPath:o.rootPath},manifestFile:r}}function gc(e,t){let o=e.indexOf(t);return o>=0?e[o+1]:void 0}async function mc(){let e=process.argv.slice(2),t=e.includes("--json"),o=!e.includes("--no-integrate"),r=gc(e,"--project"),n=e.find((a,l)=>!a.startsWith("-")&&(l===0||e[l-1]!=="--project")),i=r??n??process.cwd(),s=await je("Initializing ToolNet project",()=>fc(i),{enabled:!t}),c=[];if(o&&(c=await je("Detecting coding agents",()=>nt({projectRoot:s.project.rootPath}),{enabled:!t})),t){console.log(JSON.stringify({...s,integrations:c},null,2));return}if(console.log(""),console.log("ToolNet Memory"),console.log("=============="),console.log(""),console.log("\u2713 Project initialized"),console.log(""),console.log(`Project:  ${s.project.name}`),console.log(`ID:       ${s.project.id}`),console.log(`Root:     ${s.project.rootPath}`),console.log(`Manifest: ${s.manifestFile}`),console.log(""),o){console.log("AI integrations:");let a=c.filter(l=>l.detected&&l.installed);if(!a.length)console.log("  \u25CB No supported coding agent detected");else for(let l of a){let u=be(l.agent),p=gt(l.agent);console.log(`  \u2713 ${u} \u2014 ${p}`)}console.log("")}console.log("Next: toolnet-memory doctor"),console.log("")}var yc=process.argv[1]?.endsWith("/init.js")||process.argv[1]?.endsWith("/init.ts");yc&&mc().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});export{fc as initializeToolNetProject};
