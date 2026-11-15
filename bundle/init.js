import{existsSync as co,statSync as og}from"node:fs";import{resolve as rg,join as Ns}from"node:path";import{existsSync as Ds,readFileSync as Hs}from"node:fs";import{homedir as Js}from"node:os";import{join as Ls}from"node:path";function Ks(e){let t=e.trim();return t.length>=2&&t.startsWith('"')&&t.endsWith('"')?(t=t.slice(1,-1),t.replace(/\\n/g,`
`).replace(/\\r/g,"\r").replace(/\\t/g,"	").replace(/\\"/g,'"').replace(/\\\\/g,"\\")):t.length>=2&&t.startsWith("'")&&t.endsWith("'")?t.slice(1,-1):t}function Gs(){let e=process.env.TOOLNET_GLOBAL_ENV??Ls(Js(),".config","toolnet-memory",".env");if(!Ds(e))return;let t=Hs(e,"utf8");for(let o of t.split(/\r?\n/)){let r=o.trim();if(!r||r.startsWith("#"))continue;r.startsWith("export ")&&(r=r.slice(7));let n=r.indexOf("=");if(n<=0)continue;let i=r.slice(0,n).trim();/^[A-Za-z_][A-Za-z0-9_]*$/.test(i)&&process.env[i]===void 0&&(process.env[i]=Ks(r.slice(n+1)))}}Gs();var et=class extends Error{code;constructor(t,o){super(o),this.name="DurabilityPolicyError",this.code=t}};var Vs=new Set(["local-first","strict-cloud-only"]);function lo(e){if(e===void 0||e.trim()==="")return"local-first";let t=e.trim().toLowerCase();if(!Vs.has(t))throw new et("DURABILITY_MODE_INVALID",`Unknown durability mode: ${t}. Expected local-first or strict-cloud-only.`);return t}function Q(e,t){return e===void 0?t:["1","true","yes","on"].includes(e.toLowerCase())}function X(e,t){if(!e)return t;let o=Number(e);return Number.isFinite(o)?o:t}function tt(){return{durability:{mode:lo(process.env.TOOLNET_DURABILITY_MODE)},memory:{autoCapture:Q(process.env.MEMORY_AUTO_CAPTURE,!0),autoRetrieve:Q(process.env.MEMORY_AUTO_RETRIEVE,!0),autoSummarize:Q(process.env.MEMORY_AUTO_SUMMARIZE,!0),autoSync:Q(process.env.MEMORY_AUTO_SYNC,!0)},retrieval:{maxCandidates:X(process.env.MEMORY_MAX_CANDIDATES,50),rerankTop:X(process.env.MEMORY_RERANK_TOP,10),finalContext:X(process.env.MEMORY_FINAL_CONTEXT,5),tokenBudget:X(process.env.MEMORY_TOKEN_BUDGET,2e3)},storage:{provider:process.env.MEMORY_STORAGE_PROVIDER??"huggingface",r2:{accountId:process.env.R2_ACCOUNT_ID,bucket:process.env.R2_BUCKET,accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY},s3:{endpoint:process.env.S3_ENDPOINT,region:process.env.S3_REGION,bucket:process.env.S3_BUCKET,accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY,forcePathStyle:Q(process.env.S3_FORCE_PATH_STYLE,!1)},huggingface:{namespace:process.env.HF_NAMESPACE,bucket:process.env.HF_BUCKET,accessKeyId:process.env.HF_S3_ACCESS_KEY_ID,secretAccessKey:process.env.HF_S3_SECRET_ACCESS_KEY},localRoot:process.env.MEMORY_LOCAL_STORAGE_PATH},cache:{maxMb:X(process.env.MEMORY_LOCAL_CACHE_MB,200)}}}import{createHash as Qs}from"node:crypto";import{existsSync as ke,mkdirSync as Xs,readFileSync as Zs,renameSync as ea,writeFileSync as ta}from"node:fs";import{basename as oa,dirname as K,join as ee,parse as ho,resolve as F}from"node:path";import{createHash as mo}from"node:crypto";import{spawnSync as Bs}from"node:child_process";var Z="git-remote-v1",Us=new Set(["github.com","gitlab.com","bitbucket.org"]);function go(e,t){let o=t.replaceAll("\\","/").replace(/^\/+/u,"").replace(/\/+$/u,"").replace(/\.git$/iu,"").replace(/\/+/gu,"/");return!o||o==="."||o===".."||o.split("/").some(r=>!r||r==="."||r==="..")?null:(Us.has(e)&&(o=o.toLowerCase()),o)}function qs(e){let t;try{t=new URL(e)}catch{return null}if(!["https:","http:","ssh:","git:"].includes(t.protocol))return null;let o=t.hostname.trim().toLowerCase();if(!o)return null;let r=t.protocol==="https:"&&t.port==="443"||t.protocol==="http:"&&t.port==="80"||t.protocol==="ssh:"&&t.port==="22",n=t.port&&!r?`${o}:${t.port}`:o,i=go(o,t.pathname);return i?`${n}/${i}`:null}function Ys(e){let t=e.match(/^(?:[^@\s/:]+@)?([^:/\s]+):(.+)$/u);if(!t)return null;let o=t[1]?.trim().toLowerCase();if(!o||o.length===1)return null;let r=go(o,t[2]??"");return r?`${o}/${r}`:null}function uo(e){let t=e.trim();return t?t.includes("://")?qs(t):Ys(t):null}function Ws(e){return mo("sha256").update(`${Z}:${e}`).digest("hex")}function fo(e){return mo("sha256").update(`toolnet-project:${Z}:${e}`).digest("hex").slice(0,16)}function zs(e){return e.split("/").filter(Boolean).at(-1)?.trim()||null}function ot(e,t){let o=Bs("git",["-C",e,...t],{encoding:"utf8",windowsHide:!0,stdio:["ignore","pipe","ignore"]});return o.error||o.status!==0?null:o.stdout?.trim()||null}function po(e,t){let o=zs(e);return o?{scheme:Z,canonicalRemote:e,fingerprint:Ws(e),repositoryName:o,source:t}:null}function ye(e){let t=ot(e,["remote","get-url","origin"]);if(t){let n=uo(t);if(n)return po(n,"origin")}let o=ot(e,["remote"]);if(!o)return null;let r=new Set;for(let n of o.split(/\r?\n/u).map(i=>i.trim()).filter(Boolean)){let i=ot(e,["remote","get-url",n]);if(!i)continue;let a=uo(i);a&&r.add(a)}return r.size!==1?null:po([...r][0],"unique-remote")}var bo=".toolnet",ra="project.json";function na(e){return Qs("sha256").update(e).digest("hex").slice(0,16)}function L(e){return ee(e,bo,ra)}function ko(e){return ke(L(e))}function yo(e,t){let o=F(e),r=ho(o).root,n=["/tmp","/var","/usr","/opt","/etc","/boot","/sys","/proc","/dev"];for(;;){if(n.includes(o)){let a=K(o);if(a===o)break;o=a;continue}if(ko(o))return o;if(o===r||t&&o===F(t))break;let i=K(o);if(i===o)break;o=i}return null}function rt(e){let t=F(e),o=ho(t).root,r=["/tmp","/var","/usr","/opt","/etc","/boot","/sys","/proc","/dev"],n=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"];for(;;){if(r.includes(t)){let a=K(t);if(a===t)break;t=a;continue}if(n.some(a=>ke(ee(t,a))))return t;if(t===o)break;let i=K(t);if(i===t)break;t=i}return F(e)}function he(e){let t;try{t=JSON.parse(Zs(e,"utf8"))}catch(n){throw new Error(`Invalid ToolNet project manifest: ${e}: ${n instanceof Error?n.message:String(n)}`)}if(!t||typeof t!="object")throw new Error(`Invalid ToolNet project manifest: ${e}`);let o=t;if(typeof o.id!="string"||!o.id.trim())throw new Error(`ToolNet project manifest is missing id: ${e}`);if(typeof o.name!="string"||!o.name.trim())throw new Error(`ToolNet project manifest is missing name: ${e}`);let r=new Date().toISOString();return{version:1,id:o.id,name:o.name,remote:typeof o.remote=="string"&&o.remote.trim()?o.remote:o.name,rootPath:typeof o.rootPath=="string"?o.rootPath:K(K(e)),createdAt:typeof o.createdAt=="string"?o.createdAt:r,updatedAt:typeof o.updatedAt=="string"?o.updatedAt:r,graphVersion:typeof o.graphVersion=="number"?o.graphVersion:0,memoryVersion:typeof o.memoryVersion=="number"?o.memoryVersion:0,metadata:o.metadata&&typeof o.metadata=="object"?o.metadata:void 0}}function be(e,t){let o=ee(e,bo);Xs(o,{recursive:!0});let r=L(e),n=`${r}.tmp-${process.pid}`;ta(n,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),ea(n,r)}function N(e,t){return{id:e.id,name:e.name,remote:e.remote,rootPath:t,createdAt:e.createdAt,updatedAt:e.updatedAt,graphVersion:e.graphVersion,memoryVersion:e.memoryVersion,metadata:e.metadata}}function nt(e){return{version:1,scheme:Z,canonicalRemote:e.canonicalRemote,fingerprint:e.fingerprint,repositoryName:e.repositoryName}}function ia(e){let t=e.metadata?.toolnetIdentity;if(!t||typeof t!="object"||Array.isArray(t))return null;let o=t;return typeof o.fingerprint=="string"?o.fingerprint:null}var G=class{adopt(t,o){let r=rt(F(t));if(!o.id.trim())throw new Error("PROJECT_ADOPTION_INVALID_ID");if(!o.name.trim())throw new Error("PROJECT_ADOPTION_INVALID_NAME");if(!o.remote.trim())throw new Error("PROJECT_ADOPTION_INVALID_REMOTE");if(ko(r)){let s=he(L(r));if(s.id!==o.id)throw new Error(["PROJECT_IDENTITY_ALREADY_EXISTS",`existing=${s.id}`,`requested=${o.id}`].join(" "));return N(s,r)}let n=new Date().toISOString(),i={...o.metadata};o.gitIdentity&&(i.toolnetIdentity=nt(o.gitIdentity));let a={version:1,id:o.id.trim(),name:o.name.trim(),remote:o.remote.trim(),rootPath:r,createdAt:o.createdAt??n,updatedAt:n,graphVersion:o.graphVersion??0,memoryVersion:o.memoryVersion??0,metadata:Object.keys(i).length?i:void 0};return be(r,a),N(a,r)}recordGitIdentity(t,o,r={}){let n=this.requireExisting(t),i=L(n.rootPath),a=he(i),s=ia(a);if(s&&s!==o.fingerprint&&!r.allowRebind)throw new Error(["PROJECT_GIT_REMOTE_CHANGED",`existing=${s}`,`current=${o.fingerprint}`,"Use explicit rebind only when this repository identity change is intentional."].join(" "));let c=a.metadata?.toolnetIdentity;return c&&typeof c=="object"&&!Array.isArray(c)&&c.fingerprint===o.fingerprint||(a.metadata={...a.metadata,toolnetIdentity:nt(o)},a.updatedAt=new Date().toISOString(),be(n.rootPath,a)),N(a,n.rootPath)}findExisting(t=process.cwd()){let o=F(t),r=rt(o),i=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(c=>ke(ee(r,c))),a=yo(o,i?r:void 0);if(!a)return null;let s=he(L(a));return N(s,a)}requireExisting(t=process.cwd()){let o=this.findExisting(t);if(!o)throw new Error("PROJECT_NOT_INITIALIZED");return o}detect(t=process.cwd()){let o=F(t),r=rt(o),i=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(p=>ke(ee(r,p))),a=yo(o,i?r:void 0);if(a){let p=L(a),d=he(p);return d.rootPath!==a&&(d.rootPath=a,d.updatedAt=new Date().toISOString(),be(a,d)),N(d,a)}let s=new Date().toISOString(),c=oa(r),l=ye(r),u={version:1,id:l?fo(l.canonicalRemote):na(r),name:c,remote:l?.repositoryName??c,rootPath:r,createdAt:s,updatedAt:s,graphVersion:0,memoryVersion:0,metadata:l?{toolnetIdentity:nt(l)}:void 0};return be(r,u),N(u,r)}};var sa=[{type:"openai_key",regex:/\bsk-[A-Za-z0-9_-]{20,}\b/g,confidence:"exact"},{type:"huggingface_token",regex:/\bhf_[A-Za-z0-9]{20,}\b/g,confidence:"exact"},{type:"hf_s3_access_key",regex:/\bHFAK[A-Za-z0-9]{8,}\b/g,confidence:"exact"},{type:"aws_access_key",regex:/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,confidence:"exact"},{type:"github_token",regex:/\b(?:gh[pousr]_[A-Za-z0-9]{30,255}|github_pat_[A-Za-z0-9_]{40,255})\b/g,confidence:"exact"},{type:"stripe_secret_key",regex:/\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g,confidence:"exact"},{type:"google_api_key",regex:/\bAIza[A-Za-z0-9_-]{30,}\b/g,confidence:"exact"},{type:"slack_token",regex:/\bxox[baprs]-[A-Za-z0-9-]{16,}\b/g,confidence:"exact"},{type:"npm_token",regex:/\bnpm_[A-Za-z0-9]{20,}\b/g,confidence:"exact"},{type:"bearer_token",regex:/\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/gi,confidence:"high"},{type:"jwt",regex:/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,confidence:"exact"},{type:"private_key",regex:/-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,confidence:"exact"},{type:"password_assignment",regex:/\b(?:password|passwd|pwd)\s*[:=]\s*["']?[^"' \t\r\n]{6,}["']?/gi,confidence:"high"},{type:"secret_assignment",regex:/\b(?:secret|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key)\s*[:=]\s*["']?[^"' \t\r\n]{8,}["']?/gi,confidence:"high"},{type:"cookie",regex:/\b(?:cookie|set-cookie)\s*[:=]\s*[^;\n]{8,}/gi,confidence:"high"},{type:"url_credentials",regex:/\bhttps?:\/\/[^:/@\s]+:[^/@\s]{4,}@[^/\s]+/gi,confidence:"high"}],aa=new Set(["example","example-key","example-token","changeme","change-me","password","secret","your-api-key","your-token","<token>","<secret>","<password>","[redacted]"]);function So(e){return e.normalize("NFKC").trim().toLowerCase()}function ca(e){if(e.length===0)return 0;let t=new Map;for(let r of e)t.set(r,(t.get(r)??0)+1);let o=0;for(let r of t.values()){let n=r/e.length;o-=n*Math.log2(n)}return o}function la(e){return/^[a-f0-9]{32}$/iu.test(e)||/^[a-f0-9]{40}$/iu.test(e)||/^[a-f0-9]{64}$/iu.test(e)}function ua(e,t,o){let r=e.slice(Math.max(0,t-48),t),n=e.slice(o,Math.min(e.length,o+16));return/\b(?:token|secret|key|credential|authorization|password|passwd|apikey|api_key|access[_-]?key)\b/iu.test(`${r} ${n}`)}function da(e,t){return e.start<t.end&&t.start<e.end}function Io(e){return e.sort((t,o)=>t.start!==o.start?t.start-o.start:o.end-o.start-(t.end-t.start))}var Se=class{allowValues=new Set;enableEntropyHeuristic;constructor(t={}){for(let o of t.allowValues??[]){let r=So(o);r&&this.allowValues.add(r)}this.enableEntropyHeuristic=t.enableEntropyHeuristic??!0}scan(t){let o=[];for(let i of sa){let a=new RegExp(i.regex.source,i.regex.flags);for(let s of t.matchAll(a))s.index===void 0||!s[0]||this.allowed(s[0])||o.push({type:i.type,value:s[0],start:s.index,end:s.index+s[0].length,confidence:i.confidence})}this.enableEntropyHeuristic&&o.push(...this.entropyMatches(t));let r=Io(o),n=[];for(let i of r)n.some(a=>da(a,i))||n.push(i);return Io(n)}hasSecrets(t){return this.scan(t).length>0}allowed(t){let o=So(t);return aa.has(o)?!0:this.allowValues.has(o)}entropyMatches(t){let o=[],r=/[A-Za-z0-9_+/=-]{32,160}/g;for(let n of t.matchAll(r)){if(n.index===void 0||!n[0])continue;let i=n[0];this.allowed(i)||la(i)||!/[A-Za-z]/u.test(i)||!/[0-9]/u.test(i)||ua(t,n.index,n.index+i.length)&&(ca(i)<3.7||o.push({type:"high_entropy_secret",value:i,start:n.index,end:n.index+i.length,confidence:"heuristic"}))}return o}};function vo(e,t,o){Object.defineProperty(e,t,{value:o,enumerable:!0,writable:!0,configurable:!0})}var Ie=class{scanner;constructor(t={}){this.scanner=new Se(t)}sanitize(t){let o=this.scanner.scan(t);if(o.length===0)return{text:t,redacted:0,secretTypes:[]};let r=t,n=[...o].sort((a,s)=>s.start-a.start),i=new Set;for(let a of n)i.add(a.type),r=r.slice(0,a.start)+`[REDACTED:${a.type}]`+r.slice(a.end);return{text:r,redacted:o.length,secretTypes:[...i].sort()}}sanitizeValue(t){if(typeof t=="string")return this.sanitize(t).text;if(Array.isArray(t))return t.map(o=>this.sanitizeValue(o));if(t&&typeof t=="object"){let o={};for(let[r,n]of Object.entries(t)){if(r==="__proto__")continue;let i=r.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g,"");if(i.includes("password")||i.includes("passwd")||i==="pwd"||i.includes("secret")||i.includes("token")||i.includes("cookie")||i.includes("authorization")||i.includes("apikey")||i.includes("accesskey")||i.includes("privatekey")||i.includes("clientsecret")||i.includes("credential")){vo(o,r,"[REDACTED]");continue}vo(o,r,this.sanitizeValue(n))}return o}return t}};var Rg=new Ie;var pa={claude:"hook",cursor:"hook",copilot:"hook",grok:"hook",kiro:"hook",opencode:"hook",codex:"hook",agy:"hook","toolnet-cli":"manual-sync",kilo:"mcp-only",goose:"hook",qwen:"hook",kimi:"hook",hermes:"hook",qoder:"hook",aider:"managed-wrapper-session-end",plandex:"manual-sync",openrouter:"blocked-product-identity",bob:"hook",cline:"hook",rovo:"hook",warp:"blocked-capability",gemini:"hook",junie:"hook",codebuff:"mcp-only",freebuff:"mcp-only",continue:"manual-sync"},ve={mcp:!0,continuityRead:!0,nativeCapture:!1,lifecycleHooks:!1,sharedJournalWrite:!1,level:"mcp-only"},wo={mcp:!0,continuityRead:!0,nativeCapture:!1,lifecycleHooks:!1,sharedJournalWrite:!1,level:"blocked"},it={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!1,sharedJournalWrite:!0,level:"native-capture"},I={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!0,sharedJournalWrite:!0,level:"native-capture"},ma={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!0,sharedJournalWrite:!0,level:"native-capture"},ga={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!1,sharedJournalWrite:!0,level:"native-capture"};function g(e,t,o){return{agent:e,...t,refreshMode:o,captureMode:pa[e]}}var Co={agy:g("agy",I,"native-lifecycle"),opencode:g("opencode",ma,"persistent-plugin"),codex:g("codex",I,"native-lifecycle"),claude:g("claude",I,"native-lifecycle"),kiro:g("kiro",I,"native-lifecycle"),cursor:g("cursor",I,"native-lifecycle"),copilot:g("copilot",I,"native-lifecycle"),grok:g("grok",I,"native-lifecycle"),"toolnet-cli":g("toolnet-cli",it,"native-session"),kilo:g("kilo",ve,"mcp-only"),goose:g("goose",I,"native-lifecycle"),qwen:g("qwen",I,"native-lifecycle"),kimi:g("kimi",I,"native-lifecycle"),hermes:g("hermes",I,"native-lifecycle"),qoder:g("qoder",I,"native-lifecycle"),aider:g("aider",ga,"managed-wrapper"),plandex:g("plandex",it,"native-session"),openrouter:g("openrouter",ve,"mcp-only"),bob:g("bob",I,"native-lifecycle"),cline:g("cline",I,"native-lifecycle"),rovo:g("rovo",I,"native-lifecycle"),warp:g("warp",wo,"blocked"),gemini:g("gemini",I,"native-lifecycle"),junie:{...g("junie",I,"native-lifecycle"),conditionalCapture:{runtimeResolutionRequired:!0,hookChannel:"eap",stableFallback:"blocked-capability",manualRecoveryAvailable:!1,reason:"lifecycle hooks require verified EAP capability; unverified builds fail closed"}},codebuff:g("codebuff",ve,"mcp-only"),freebuff:g("freebuff",ve,"mcp-only"),continue:g("continue",it,"native-session")};function fa(e){return Object.prototype.hasOwnProperty.call(Co,e)}function ya(e){if(fa(e))return Co[e]}function jo(e){let t=ya(e);if(!t)return"unknown";switch(t.refreshMode){case"native-lifecycle":return"native lifecycle";case"persistent-plugin":return"persistent plugin";case"native-session":return"native session capture";case"mcp-only":return"MCP only";case"managed-wrapper":return"managed wrapper";default:return t.refreshMode}}var xo=["\u280B","\u2819","\u2839","\u2838","\u283C","\u2834","\u2826","\u2827","\u2807","\u280F"],C={clear:"\r\x1B[2K",cyan:"\x1B[36m",green:"\x1B[32m",red:"\x1B[31m",yellow:"\x1B[33m",amber:"\x1B[38;5;214m",dim:"\x1B[2m",reset:"\x1B[0m"};function Oo(e,t=16){let r=Math.max(1,t-4+1),n=e%r;return"\u2500".repeat(n)+"\u2501".repeat(4)+"\u2500".repeat(Math.max(0,t-n-4))}function Ro(e){let t=Date.now()-e;return t<1e3?`${t}ms`:t<1e4?`${(t/1e3).toFixed(1)}s`:`${Math.round(t/1e3)}s`}var st=class{stream;enabled;interactive;color;intervalMs;display;label;frame=0;startedAt=0;timer;active=!1;constructor(t,o={}){this.label=t,this.stream=o.stream??process.stderr,this.enabled=o.enabled??!0,this.interactive=o.interactive??this.stream.isTTY===!0,this.color=o.color??(this.interactive&&process.env.NO_COLOR===void 0),this.intervalMs=Math.max(40,o.intervalMs??80),this.display=o.display??"spinner"}start(){return!this.enabled||this.active?this:(this.active=!0,this.startedAt=Date.now(),this.interactive?(this.render(),this.timer=setInterval(()=>{this.frame=(this.frame+1)%1e4,this.render()},this.intervalMs),this.timer.unref?.(),this):(this.stream.write(`\u2192 ${this.label}
`),this))}update(t){return this.label=t,this.enabled&&this.active&&this.interactive&&this.render(),this}succeed(t){this.finish("\u2713",t??this.label,C.green)}fail(t){this.finish("\u2717",t??this.label,C.red)}warn(t){this.finish("!",t??this.label,C.yellow)}stop(){this.active&&(this.timer&&(clearInterval(this.timer),this.timer=void 0),this.enabled&&this.interactive&&this.stream.write(C.clear),this.active=!1)}render(){if(!this.enabled||!this.active||!this.interactive)return;let t=xo[this.frame%xo.length],o=this.display==="bar"?this.color?`${C.amber}${Oo(this.frame)}${C.reset}`:Oo(this.frame):this.color?`${C.cyan}${t}${C.reset}`:t,r=Ro(this.startedAt),n=this.color?`${C.dim}${r}${C.reset}`:r;this.stream.write(`${C.clear}${o} ${this.label} ${n}`)}finish(t,o,r){if(!this.enabled){this.active=!1;return}this.startedAt||(this.startedAt=Date.now()),this.timer&&(clearInterval(this.timer),this.timer=void 0);let n=Ro(this.startedAt),i=this.color?`${r}${t}${C.reset}`:t,a=this.color?`${C.dim}${n}${C.reset}`:n;this.interactive?this.stream.write(`${C.clear}${i} ${o} ${a}
`):this.stream.write(`${i} ${o} (${n})
`),this.active=!1}};async function at(e,t,o={}){let r=new st(e,o).start();try{let n=await t();return r.succeed(),n}catch(n){throw r.fail(),n}}import{resolve as Za}from"node:path";import{homedir as qa}from"node:os";import{join as Ya}from"node:path";import{DeleteObjectCommand as ha,GetObjectCommand as ba,HeadObjectCommand as ka,ListObjectsV2Command as Sa,PutObjectCommand as Ia,S3Client as va}from"@aws-sdk/client-s3";import{getSignedUrl as wa}from"@aws-sdk/s3-request-presigner";var we=class{name="huggingface";client;bucket;constructor(t){this.bucket=t.bucket,this.client=new va({region:"us-east-1",endpoint:`https://s3.hf.co/${t.namespace}`,forcePathStyle:!0,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:t.accessKeyId,secretAccessKey:t.secretAccessKey}})}async put(t,o,r="application/octet-stream"){let n=typeof o=="string"?Buffer.from(o,"utf8"):o;await this.client.send(new Ia({Bucket:this.bucket,Key:t,Body:n,ContentType:r}))}async get(t){let o=await wa(this.client,new ba({Bucket:this.bucket,Key:t}),{expiresIn:60}),r=await fetch(o,{redirect:"follow"});if(r.status===404)return null;if(!r.ok)throw new Error(`HF download failed: ${r.status} ${r.statusText}`);return new Uint8Array(await r.arrayBuffer())}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){try{return await this.client.send(new ka({Bucket:this.bucket,Key:t})),!0}catch(o){if(typeof o=="object"&&o!==null&&"$metadata"in o&&o.$metadata?.httpStatusCode===404)return!1;throw o}}async delete(t){await this.client.send(new ha({Bucket:this.bucket,Key:t}))}async list(t=""){let o=[],r;do{let n=await this.client.send(new Sa({Bucket:this.bucket,Prefix:t||void 0,ContinuationToken:r}));for(let i of n.Contents??[])i.Key&&o.push({key:i.Key,size:i.Size,updatedAt:i.LastModified?.toISOString()});r=n.IsTruncated?n.NextContinuationToken:void 0}while(r);return o}};import{access as Eo,mkdir as Ca,readFile as ja,readdir as xa,rm as Oa,stat as Po,writeFile as Ra}from"node:fs/promises";import{dirname as Ea,join as Pa,relative as To,resolve as Ta}from"node:path";var te=class{constructor(t){this.root=t}root;name="local";path(t){let o=t.replace(/^\/+/,"");return Ta(this.root,o)}async put(t,o){let r=this.path(t);await Ca(Ea(r),{recursive:!0}),await Ra(r,o)}async get(t){try{return await ja(this.path(t))}catch(o){if(typeof o=="object"&&o!==null&&"code"in o&&o.code==="ENOENT")return null;throw o}}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){try{return await Eo(this.path(t)),!0}catch{return!1}}async delete(t){await Oa(this.path(t),{force:!0})}async list(t=""){let o=this.path(t),r=[];try{await Eo(o)}catch{return r}let n=async a=>{let s=await xa(a,{withFileTypes:!0});for(let c of s){let l=Pa(a,c.name);if(c.isDirectory()){await n(l);continue}let u=await Po(l);r.push({key:To(this.root,l),size:u.size,updatedAt:u.mtime.toISOString()})}},i=await Po(o);return i.isDirectory()?await n(o):r.push({key:To(this.root,o),size:i.size,updatedAt:i.mtime.toISOString()}),r}};import{DeleteObjectCommand as Aa,GetObjectCommand as _a,HeadObjectCommand as Ma,ListObjectsV2Command as Na,PutObjectCommand as Fa,S3Client as $a}from"@aws-sdk/client-s3";import{getSignedUrl as Da}from"@aws-sdk/s3-request-presigner";var oe=class{name;client;bucket;constructor(t){this.name=t.name??"s3",this.bucket=t.bucket,this.client=new $a({region:t.region??"us-east-1",endpoint:t.endpoint||void 0,forcePathStyle:t.forcePathStyle??!1,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:t.accessKeyId,secretAccessKey:t.secretAccessKey}})}async put(t,o,r="application/octet-stream"){let n=typeof o=="string"?Buffer.from(o,"utf8"):o;await this.client.send(new Fa({Bucket:this.bucket,Key:t,Body:n,ContentType:r}))}async get(t){let o=await Da(this.client,new _a({Bucket:this.bucket,Key:t}),{expiresIn:60}),r=await fetch(o,{redirect:"follow"});if(r.status===404)return null;if(!r.ok)throw new Error(`${this.name} download failed: ${r.status} ${r.statusText}`);return new Uint8Array(await r.arrayBuffer())}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){try{return await this.client.send(new Ma({Bucket:this.bucket,Key:t})),!0}catch(o){if(typeof o=="object"&&o!==null&&"$metadata"in o&&o.$metadata?.httpStatusCode===404)return!1;throw o}}async delete(t){await this.client.send(new Aa({Bucket:this.bucket,Key:t}))}async list(t=""){let o=[],r;do{let n=await this.client.send(new Na({Bucket:this.bucket,Prefix:t||void 0,ContinuationToken:r}));for(let i of n.Contents??[])i.Key&&o.push({key:i.Key,size:i.Size,updatedAt:i.LastModified?.toISOString()});r=n.IsTruncated?n.NextContinuationToken:void 0}while(r);return o}};import{createCipheriv as Ha,createDecipheriv as Ja,createHash as La,randomBytes as Ka,timingSafeEqual as Ga}from"node:crypto";import{readFileSync as Va}from"node:fs";var $=Buffer.from("TNMEME01","ascii"),_o=1,re=8,ne=12,ct=16,Mo=$.length+1+re+ne+ct,Ba="toolnet-memory:remote-encryption:v1:",No="aes-256-gcm",lt=32,k=class extends Error{constructor(o,r){super(r);this.code=o;this.name="RemoteEncryptionError"}code};function Ua(e){return e?["1","true","yes","on","enabled"].includes(e.trim().toLowerCase()):!1}function ut(e=process.env){return Ua(e.TOOLNET_REMOTE_ENCRYPTION)}function Ao(e){let t=e.trim();if(!t)throw new k("REMOTE_ENCRYPTION_KEY_EMPTY","Remote encryption key is empty.");let o;if(t.startsWith("hex:")){let r=t.slice(4);if(!/^[0-9a-f]{64}$/iu.test(r))throw new k("REMOTE_ENCRYPTION_KEY_INVALID","hex: remote encryption key must contain exactly 64 hexadecimal characters.");o=Buffer.from(r,"hex")}else if(/^[0-9a-f]{64}$/iu.test(t))o=Buffer.from(t,"hex");else{let r=t.startsWith("base64:")?t.slice(7):t;if(!/^[A-Za-z0-9+/_-]+={0,2}$/u.test(r))throw new k("REMOTE_ENCRYPTION_KEY_INVALID","Remote encryption key must be 32 raw bytes encoded as hexadecimal or base64.");o=Buffer.from(r,r.includes("-")||r.includes("_")?"base64url":"base64")}if(o.length!==lt)throw new k("REMOTE_ENCRYPTION_KEY_INVALID_LENGTH",`Remote encryption key must decode to exactly ${lt} bytes.`);return o}function Fo(e=process.env){let t=e.TOOLNET_REMOTE_ENCRYPTION_KEY?.trim(),o=e.TOOLNET_REMOTE_ENCRYPTION_KEY_FILE?.trim();if(t&&o)throw new k("REMOTE_ENCRYPTION_KEY_AMBIGUOUS","Configure either TOOLNET_REMOTE_ENCRYPTION_KEY or TOOLNET_REMOTE_ENCRYPTION_KEY_FILE, not both.");if(t)return Ao(t);if(o){let r;try{r=Va(o,"utf8")}catch(n){throw new k("REMOTE_ENCRYPTION_KEY_FILE_READ_FAILED",[`Unable to read remote encryption key file: ${o}.`,n instanceof Error?n.message:String(n)].join(" "))}return Ao(r)}}function $o(e){return La("sha256").update(e).digest().subarray(0,re)}function Do(e){return Buffer.from(`${Ba}${e}`,"utf8")}function dt(e){return e.byteLength<$.length?!1:Buffer.from(e).subarray(0,$.length).equals($)}function Ho(e,t,o){if(o.byteLength!==lt)throw new k("REMOTE_ENCRYPTION_KEY_INVALID_LENGTH","AES-256-GCM requires a 32-byte key.");let r=typeof t=="string"?Buffer.from(t,"utf8"):Buffer.from(t),n=Ka(ne),i=Ha(No,o,n);i.setAAD(Do(e));let a=Buffer.concat([i.update(r),i.final()]),s=i.getAuthTag(),c=Buffer.alloc(Mo),l=0;return $.copy(c,l),l+=$.length,c.writeUInt8(_o,l),l+=1,$o(o).copy(c,l),l+=re,n.copy(c,l),l+=ne,s.copy(c,l),Buffer.concat([c,a])}function Jo(e,t,o){let r=Buffer.from(t);if(!dt(r))throw new k("REMOTE_ENCRYPTION_ENVELOPE_REQUIRED","Payload is not a ToolNet encrypted remote object.");if(r.length<Mo)throw new k("REMOTE_ENCRYPTION_ENVELOPE_TRUNCATED","Encrypted remote payload is truncated.");let n=$.length,i=r.readUInt8(n);if(n+=1,i!==_o)throw new k("REMOTE_ENCRYPTION_VERSION_UNSUPPORTED",`Unsupported remote encryption envelope version: ${i}.`);let a=r.subarray(n,n+re);n+=re;let s=$o(o);if(!Ga(a,s))throw new k("REMOTE_ENCRYPTION_KEY_MISMATCH","Configured remote encryption key does not match this encrypted object.");let c=r.subarray(n,n+ne);n+=ne;let l=r.subarray(n,n+ct);n+=ct;let u=r.subarray(n),p=Ja(No,o,c);p.setAAD(Do(e)),p.setAuthTag(l);try{return Buffer.concat([p.update(u),p.final()])}catch{throw new k("REMOTE_ENCRYPTION_AUTH_FAILED","Encrypted remote object failed AES-GCM authentication.")}}var pt=class{constructor(t,o){this.inner=t;this.options=o;if(this.name=t.name,o.enabled&&!o.key)throw new k("REMOTE_ENCRYPTION_KEY_REQUIRED","Remote client-side encryption is enabled but no encryption key is configured.")}inner;options;name;async put(t,o,r){if(!this.options.enabled){await this.inner.put(t,o,r);return}let n=this.options.key;if(!n)throw new k("REMOTE_ENCRYPTION_KEY_REQUIRED","Remote encryption key is unavailable.");let i=Ho(t,o,n);await this.inner.put(t,i,"application/octet-stream")}async get(t){let o=await this.inner.get(t);if(!o)return null;if(!dt(o))return o;if(!this.options.enabled)throw new k("REMOTE_ENCRYPTION_REQUIRED",["Remote object is client-side encrypted.","Enable TOOLNET_REMOTE_ENCRYPTION and configure the matching key."].join(" "));let r=this.options.key;if(!r)throw new k("REMOTE_ENCRYPTION_KEY_REQUIRED","Remote object is encrypted but no decryption key is configured.");return Jo(t,o,r)}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){return this.inner.exists(t)}async delete(t){await this.inner.delete(t)}async list(t=""){return this.inner.list(t)}};function Lo(e,t=process.env){if(e.name==="local")return ut(t)&&console.warn("[storage] Remote encryption requested but active storage provider is local; local data remains unchanged."),e;let o=ut(t),r=o?Fo(t):void 0;return new pt(e,{enabled:o,key:r})}function ie(e){return Lo(e)}function mt(e,t){return console.warn(t),ie(new te(e))}function Ko(e){let t=e.localRoot??Ya(qa(),".toolnet-memory","storage");if(e.provider==="r2"){let o=e.r2;return o?.accountId&&o.bucket&&o.accessKeyId&&o.secretAccessKey?ie(new oe({name:"r2",endpoint:`https://${o.accountId}.r2.cloudflarestorage.com`,region:"auto",bucket:o.bucket,forcePathStyle:!0,accessKeyId:o.accessKeyId,secretAccessKey:o.secretAccessKey})):mt(t,"[storage] Cloudflare R2 credentials missing. Using local fallback.")}if(e.provider==="s3"){let o=e.s3;return o?.bucket&&o.accessKeyId&&o.secretAccessKey?ie(new oe({name:"s3",endpoint:o.endpoint,region:o.region??"us-east-1",bucket:o.bucket,forcePathStyle:o.forcePathStyle??!1,accessKeyId:o.accessKeyId,secretAccessKey:o.secretAccessKey})):mt(t,"[storage] S3 credentials missing. Using local fallback.")}if(e.provider==="huggingface"){let o=e.huggingface;return o?.namespace&&o.bucket&&o.accessKeyId&&o.secretAccessKey?ie(new we({namespace:o.namespace,bucket:o.bucket,accessKeyId:o.accessKeyId,secretAccessKey:o.secretAccessKey})):mt(t,"[storage] Hugging Face credentials missing. Using local fallback.")}return ie(new te(t))}function Wa(e){return new Promise(t=>setTimeout(t,e))}async function Go(e,t={}){let o=Math.max(1,t.attempts??3),r=t.baseDelayMs??150,n=t.maxDelayMs??2e3,i;for(let a=1;a<=o;a++)try{return await e()}catch(s){if(i=s,a>=o)break;let c=Math.min(n,r*2**(a-1)),l=Math.floor(Math.random()*Math.max(1,c*.2));await Wa(c+l)}throw i}var za=new Set(["put","get","getText","delete","list"]);function Vo(e,t={}){return new Proxy(e,{get(o,r){let n=Reflect.get(o,r,o);return typeof n!="function"?n:za.has(r)?(...i)=>Go(()=>Promise.resolve(n.apply(o,i)),t):n.bind(o)}})}var R="authority: never rebuilt, never dropped",Qa=[{kind:"memory_records",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:R,legacyValueDomains:[],description:"Long-term project memory records (projects/<id>/memories/current.json)."},{kind:"task_operations",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"reject",sourceOfTruth:R,legacyValueDomains:[],description:"Immutable task operation log (.toolnet/tasks/events.jsonl)."},{kind:"task_replication_log",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"reject",sourceOfTruth:R,legacyValueDomains:[],description:"Replicated task operations from other hosts."},{kind:"retrieval_feedback",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:R,legacyValueDomains:[],description:"Retrieval feedback signals (.toolnet/retrieval/feedback.jsonl)."},{kind:"retrieval_telemetry",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:R,legacyValueDomains:[],description:"Retrieval telemetry samples (.toolnet/retrieval/telemetry.jsonl)."},{kind:"retrieval_overrides",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:R,legacyValueDomains:[],description:"Operator retrieval overrides (.toolnet/retrieval/overrides.json)."},{kind:"session_wal",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:R,legacyValueDomains:[],description:"Session write-ahead log (.toolnet/runtime/sources/)."},{kind:"adr_state",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"reject",sourceOfTruth:R,legacyValueDomains:[],description:"Architecture decision records (projects/<id>/knowledge/adr/state.v1.json)."},{kind:"project_manifest",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"backward_compatible",missingVersionPolicy:"assume_legacy",sourceOfTruth:R,legacyValueDomains:[],description:"Project identity manifest (.toolnet/project.json and the remote copy)."},{kind:"recovery_backup",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"reject",sourceOfTruth:R,legacyValueDomains:[],description:"Disaster-recovery backup manifest, version-gated on read."},{kind:"task_projection",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"task operations log",legacyValueDomains:[],description:"Materialized task state; rebuilt from the operation log."},{kind:"code_graph",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Code graph snapshot (projects/<id>/graph/current.json)."},{kind:"code_manifest",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Incremental file manifest (projects/<id>/graph/manifest.json)."},{kind:"resolution_snapshot",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"backward_compatible",missingVersionPolicy:"assume_legacy",sourceOfTruth:"repository source",legacyValueDomains:["resolution_kind_uppercase"],description:"Symbol resolution snapshot (projects/<id>/graph/resolution/current.json); the legacy kind vocabulary (CALL/REFERENCE/EXTENDS/IMPLEMENTS) is normalized in memory on read."},{kind:"graph_coverage",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code graph + resolution",legacyValueDomains:[],description:"Graph coverage snapshot (projects/<id>/graph/coverage.json)."},{kind:"cross_service",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source + service extractors",legacyValueDomains:[],description:"Cross-service linkage (projects/<id>/graph/cross-service.json)."},{kind:"fleet_export",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Fleet export view (projects/<id>/graph/fleet-export.json)."},{kind:"snapshot_archive",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"current project state",legacyValueDomains:[],description:"Point-in-time project snapshots; never part of authority backups."},{kind:"code_artifacts",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"reject",sourceOfTruth:"repository source + semantic registry",legacyValueDomains:[],description:"Portable code-intelligence artifacts, gated by the artifact fingerprint matrix."},{kind:"code_chunks",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Code chunk snapshot (projects/<id>/code/chunks/current.json)."},{kind:"code_vectors",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code chunks",legacyValueDomains:[],description:"Code vector index (projects/<id>/code/vectors/current.json)."},{kind:"memory_vectors",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"memory records",legacyValueDomains:[],description:"Deterministic memory vector index (projects/<id>/vectors/current.json)."},{kind:"architecture_snapshot",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code graph",legacyValueDomains:[],description:"Architecture snapshot (projects/<id>/code/architecture)."},{kind:"code_analysis",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code graph",legacyValueDomains:[],description:"Code analysis snapshot (projects/<id>/code/analysis)."},{kind:"visualization_graph",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code graph",legacyValueDomains:[],description:"Visualization graph (projects/<id>/code/visualization/graph.json)."},{kind:"runtime_traces",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"observed session activity",legacyValueDomains:[],description:"Runtime trace sessions plus their recomputed observation index."},{kind:"journal",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"session activity",legacyValueDomains:[],description:"Local session journal (.toolnet/journal)."},{kind:"task_replication_cursor",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"task replication log",legacyValueDomains:[],description:"Replication cursor (.toolnet/tasks/replication/cursor.json)."},{kind:"runtime_locks",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"process lifetime",legacyValueDomains:[],description:"Runtime lock files (.toolnet/runtime/locks)."},{kind:"daemon_state",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"running daemon",legacyValueDomains:[],description:"Daemon coordination state (daemon-state.json)."},{kind:"daemon_runtime_files",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"running daemon",legacyValueDomains:[],description:"Daemon socket, pid, lock and logs."},{kind:"artifact_staging",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Artifact staging area (.toolnet/cache/artifacts/staging)."},{kind:"test_run_cache",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"test execution",legacyValueDomains:[],description:"In-memory only derived test-run store."}],Xa=Object.freeze(Qa.slice().sort((e,t)=>e.kind.localeCompare(t.kind))),zf=new Map(Xa.map(e=>[e.kind,e]));var b="projects/[^/]+",Qf=[{pattern:/^\.toolnet\/tasks\/events\.jsonl$/u,kind:"task_operations"},{pattern:/^\.toolnet\/tasks\/replication\/replicated(\/|$)/u,kind:"task_replication_log"},{pattern:/^\.toolnet\/tasks\/replication\/cursor\.json$/u,kind:"task_replication_cursor"},{pattern:/^\.toolnet\/tasks\/state\.json$/u,kind:"task_projection"},{pattern:/^\.toolnet\/tasks(\/|$)/u,kind:"task_projection"},{pattern:/^\.toolnet\/retrieval\/feedback\.jsonl$/u,kind:"retrieval_feedback"},{pattern:/^\.toolnet\/retrieval\/telemetry\.jsonl$/u,kind:"retrieval_telemetry"},{pattern:/^\.toolnet\/retrieval\/overrides\.json$/u,kind:"retrieval_overrides"},{pattern:/^\.toolnet\/retrieval(\/|$)/u,kind:"retrieval_overrides"},{pattern:/^\.toolnet\/runtime\/sources(\/|$)/u,kind:"session_wal"},{pattern:/^\.toolnet\/runtime\/locks(\/|$)/u,kind:"runtime_locks"},{pattern:/^\.toolnet\/runtime(\/|$)/u,kind:"session_wal"},{pattern:/^\.toolnet\/journal(\/|$)/u,kind:"journal"},{pattern:/^\.toolnet\/cache\/artifacts\/staging(\/|$)/u,kind:"artifact_staging"},{pattern:/^\.toolnet\/cache(\/|$)/u,kind:"artifact_staging"},{pattern:/^\.toolnet\/project\.json$/u,kind:"project_manifest"},{pattern:new RegExp(`^${b}/memories(/|$)`,"u"),kind:"memory_records"},{pattern:new RegExp(`^${b}/knowledge/adr(/|$)`,"u"),kind:"adr_state"},{pattern:new RegExp(`^${b}/project\\.json$`,"u"),kind:"project_manifest"},{pattern:new RegExp(`^${b}/graph/artifacts(/|$)`,"u"),kind:"code_artifacts"},{pattern:new RegExp(`^${b}/graph/resolution(/|$)`,"u"),kind:"resolution_snapshot"},{pattern:new RegExp(`^${b}/graph/coverage\\.json$`,"u"),kind:"graph_coverage"},{pattern:new RegExp(`^${b}/graph/cross-service\\.json$`,"u"),kind:"cross_service"},{pattern:new RegExp(`^${b}/graph/fleet-export\\.json$`,"u"),kind:"fleet_export"},{pattern:new RegExp(`^${b}/graph/manifest\\.json$`,"u"),kind:"code_manifest"},{pattern:new RegExp(`^${b}/graph/current\\.json$`,"u"),kind:"code_graph"},{pattern:new RegExp(`^${b}/graph(/|$)`,"u"),kind:"code_graph"},{pattern:new RegExp(`^${b}/code/graph(/|$)`,"u"),kind:"code_graph"},{pattern:new RegExp(`^${b}/code/chunks(/|$)`,"u"),kind:"code_chunks"},{pattern:new RegExp(`^${b}/code/vectors(/|$)`,"u"),kind:"code_vectors"},{pattern:new RegExp(`^${b}/code/architecture(/|$)`,"u"),kind:"architecture_snapshot"},{pattern:new RegExp(`^${b}/code/analysis(/|$)`,"u"),kind:"code_analysis"},{pattern:new RegExp(`^${b}/code/visualization(/|$)`,"u"),kind:"visualization_graph"},{pattern:new RegExp(`^${b}/vectors(/|$)`,"u"),kind:"memory_vectors"},{pattern:new RegExp(`^${b}/memory(/|$)`,"u"),kind:"memory_records"},{pattern:new RegExp(`^${b}/runtime-traces(/|$)`,"u"),kind:"runtime_traces"},{pattern:new RegExp(`^${b}/snapshots(/|$)`,"u"),kind:"snapshot_archive"},{pattern:/(^|\/)snapshots\/[^/]+\/(memories|vectors|graph)\//u,kind:"snapshot_archive"},{pattern:/(^|\/)daemon-state\.json$/u,kind:"daemon_state"},{pattern:/(^|\/)(daemon\.lock|daemon\.pid|daemon\.sock)$/u,kind:"daemon_runtime_files"},{pattern:/(^|\/)logs\/daemon\.log$/u,kind:"daemon_runtime_files"}];function V(e){let t=e.trim().replace(/\s+/g,"_").replace(/[^A-Za-z0-9._-]/g,"_").replace(/_+/g,"_").replace(/^\.+|\.+$/g,"").slice(0,100);if(!t||t==="."||t==="..")throw new Error("Invalid project storage folder");return t}var yy=Object.freeze({CALL:"call",REFERENCE:"type",EXTENDS:"inheritance",IMPLEMENTS:"implementation"});var ec="_toolnet/registry/project-identities/v1",j=class extends Error{code="PROJECT_IDENTITY_COLLISION";constructor(t){super(t),this.name="ProjectIdentityCollisionError"}},Ce=class extends Error{code="PROJECT_IDENTITY_ADOPTION_REQUIRED";constructor(t,o){super(["PROJECT_IDENTITY_ADOPTION_REQUIRED",`remote=${t}`,`projectId=${o}`,"A legacy remote ToolNet project exists but has no Git fingerprint proof.",`Re-run with: toolnet-memory init --adopt-remote ${t}`].join(" ")),this.name="ProjectIdentityAdoptionRequiredError"}},se=class extends Error{code="PROJECT_IDENTITY_REGISTRY_UNAVAILABLE";constructor(t){super(["PROJECT_IDENTITY_REGISTRY_UNAVAILABLE",t,"Refusing to create a possibly split project identity while configured remote storage cannot be checked.","Use --no-remote-identity only when local-only initialization is intentional."].join(" ")),this.name="ProjectIdentityRegistryUnavailableError"}};function tc(){let e=tt();if(e.storage.provider==="r2"){let t=e.storage.r2;return!!(t.accountId&&t.bucket&&t.accessKeyId&&t.secretAccessKey)}if(e.storage.provider==="s3"){let t=e.storage.s3;return!!(t.bucket&&t.accessKeyId&&t.secretAccessKey)}if(e.storage.provider==="huggingface"){let t=e.storage.huggingface;return!!(t.namespace&&t.bucket&&t.accessKeyId&&t.secretAccessKey)}return!1}function Bo(e){if(e.storage)return{storage:e.storage,crossMachine:e.storageIsCrossMachine??!0,providerName:e.storage.name};let t=tt(),o=Ko({provider:t.storage.provider,r2:t.storage.r2,s3:t.storage.s3,huggingface:t.storage.huggingface,localRoot:t.storage.localRoot}),r=tc()&&o.name!=="local";return{storage:r?Vo(o,{attempts:Number(process.env.TOOLNET_STORAGE_RETRIES??3)}):o,crossMachine:r,providerName:o.name}}function qo(e){return[ec,`${e.fingerprint}.json`].join("/")}function Yo(e,t){let o;try{o=JSON.parse(e)}catch(i){throw new j([`Invalid ToolNet project identity registry record: ${t}.`,i instanceof Error?i.message:String(i)].join(" "))}if(!o||typeof o!="object"||Array.isArray(o))throw new j(`Invalid ToolNet project identity registry record: ${t}`);let r=o;for(let i of["fingerprint","canonicalGitRemote","projectId","projectName","projectRemote"])if(typeof r[i]!="string"||!String(r[i]).trim())throw new j(`ToolNet identity registry record ${t} is missing ${i}`);let n=new Date().toISOString();return{version:1,fingerprint:String(r.fingerprint),canonicalGitRemote:String(r.canonicalGitRemote),projectId:String(r.projectId),projectName:String(r.projectName),projectRemote:String(r.projectRemote),createdAt:typeof r.createdAt=="string"?r.createdAt:n,updatedAt:typeof r.updatedAt=="string"?r.updatedAt:n}}function oc(e,t){let o;try{o=JSON.parse(e)}catch(a){throw new j([`Invalid remote ToolNet project manifest: ${t}.`,a instanceof Error?a.message:String(a)].join(" "))}if(!o||typeof o!="object"||Array.isArray(o))throw new j(`Invalid remote ToolNet project manifest: ${t}`);let r=o;if(typeof r.id!="string"||!r.id.trim())throw new j(`Remote ToolNet project manifest ${t} is missing id`);let n=typeof r.remote=="string"&&r.remote.trim()?r.remote:t.split("/")[1]??"project",i=typeof r.name=="string"&&r.name.trim()?r.name:n;return{version:typeof r.version=="number"?r.version:void 0,id:r.id,name:i,remote:n,createdAt:typeof r.createdAt=="string"?r.createdAt:void 0,updatedAt:typeof r.updatedAt=="string"?r.updatedAt:void 0}}async function je(e,t){let r=`projects/${V(t)}/project.json`,n=await e.getText(r);return n?oc(n,r):null}async function rc(e,t){let o=qo(t),r=await e.getText(o);if(!r)return null;let n=Yo(r,o);if(n.fingerprint!==t.fingerprint||n.canonicalGitRemote!==t.canonicalRemote)throw new j(["PROJECT_IDENTITY_REGISTRY_MISMATCH",`key=${o}`,`expectedFingerprint=${t.fingerprint}`,`actualFingerprint=${n.fingerprint}`].join(" "));return n}async function nc(e,t){let o=await je(e,t.projectRemote);if(o&&o.id!==t.projectId)throw new j(["PROJECT_IDENTITY_REMOTE_OWNERSHIP_MISMATCH",`remote=${t.projectRemote}`,`registryId=${t.projectId}`,`remoteId=${o.id}`].join(" "))}async function gt(e,t,o){let r=V(t.remote??t.name),n=await je(e,r);if(n&&n.id!==t.id)throw new j(["PROJECT_IDENTITY_REMOTE_NAMESPACE_COLLISION",`remote=${r}`,`existing=${n.id}`,`current=${t.id}`].join(" "));let i=qo(o),a=await e.getText(i);if(a){let l=Yo(a,i);if(l.projectId!==t.id||l.canonicalGitRemote!==o.canonicalRemote)throw new j(["PROJECT_IDENTITY_REGISTRY_COLLISION",`fingerprint=${o.fingerprint}`,`existingProject=${l.projectId}`,`currentProject=${t.id}`].join(" "));return}let s=new Date().toISOString(),c={version:1,fingerprint:o.fingerprint,canonicalGitRemote:o.canonicalRemote,projectId:t.id,projectName:t.name,projectRemote:r,createdAt:t.createdAt,updatedAt:s};await e.put(i,JSON.stringify(c,null,2)+`
`,"application/json")}function ic(e,t){return{id:e.id,name:e.name,remote:e.remote,createdAt:e.createdAt,gitIdentity:t,metadata:{adoptedFromRemote:!0,adoptedAt:new Date().toISOString()}}}function Uo(e){return e instanceof j||e instanceof Ce||e instanceof se}async function Wo(e=process.cwd(),t={}){let o=Za(e),r=new G,n=r.findExisting(o),i=ye(n?.rootPath??o);if(n){let s=n;if(i&&(s=r.recordGitIdentity(n.rootPath,i,{allowRebind:t.allowGitRebind??!1})),t.skipRemoteIdentity||!i)return{project:s,source:"existing-manifest",gitIdentity:i,registry:t.skipRemoteIdentity?"skipped":"disabled"};let c=Bo(t);if(!c.crossMachine)return{project:s,source:"existing-manifest",gitIdentity:i,registry:"disabled",registryProvider:c.providerName};try{return await gt(c.storage,s,i),{project:s,source:"existing-manifest",gitIdentity:i,registry:"registered",registryProvider:c.providerName}}catch(l){if(Uo(l))throw l;return{project:s,source:"existing-manifest",gitIdentity:i,registry:"unavailable",registryProvider:c.providerName}}}if(!i)return{project:r.detect(o),source:"legacy-path",gitIdentity:null,registry:"disabled"};if(t.skipRemoteIdentity)return{project:r.detect(o),source:"git-remote",gitIdentity:i,registry:"skipped"};let a=Bo(t);if(!a.crossMachine){if(t.adoptRemote)throw new se("Explicit remote adoption was requested but no cross-machine storage provider is configured.");return{project:r.detect(o),source:"git-remote",gitIdentity:i,registry:"disabled",registryProvider:a.providerName}}try{let s=await rc(a.storage,i);if(s){if(t.adoptRemote&&V(t.adoptRemote)!==V(s.projectRemote))throw new j(["PROJECT_IDENTITY_EXPLICIT_ADOPTION_CONFLICT",`requested=${t.adoptRemote}`,`registered=${s.projectRemote}`].join(" "));return await nc(a.storage,s),{project:r.adopt(o,{id:s.projectId,name:s.projectName,remote:s.projectRemote,createdAt:s.createdAt,gitIdentity:i,metadata:{adoptedFromRegistry:!0,adoptedAt:new Date().toISOString()}}),source:"remote-registry",gitIdentity:i,registry:"matched",registryProvider:a.providerName}}if(t.adoptRemote){let u=await je(a.storage,t.adoptRemote);if(!u)throw new Error(["PROJECT_ADOPTION_REMOTE_NOT_FOUND",`remote=${t.adoptRemote}`].join(" "));let p=r.adopt(o,ic(u,i));return await gt(a.storage,p,i),{project:p,source:"explicit-remote-adoption",gitIdentity:i,registry:"registered",registryProvider:a.providerName}}let c=await je(a.storage,i.repositoryName);if(c)throw new Ce(c.remote,c.id);let l=r.detect(o);return await gt(a.storage,l,i),{project:l,source:"git-remote",gitIdentity:i,registry:"registered",registryProvider:a.providerName}}catch(s){throw Uo(s)?s:new se(s instanceof Error?s.message:String(s))}}import{existsSync as $r}from"node:fs";import{homedir as Kc}from"node:os";import{join as w}from"node:path";import{spawnSync as Gc}from"node:child_process";import{homedir as sc}from"node:os";import{join as B}from"node:path";function zo(e={}){return B(e.home??sc(),".gemini")}function Qo(e={}){return B(zo(e),"antigravity-cli")}function Xo(e={}){return B(zo(e),"config")}function xe(e={}){return B(Xo(e),"mcp_config.json")}function Oe(e={}){let t=e.cwd??process.cwd();return B(t,".agents","mcp_config.json")}function Re(e="toolnet-memory",t={}){return B(Qo(t),"plugins",e)}function Zo(e={}){return[Qo(e),xe(e),Xo(e),Oe(e)]}import{homedir as er}from"node:os";import{join as D}from"node:path";function U(e={}){let t=process.env.OPENCODE_CONFIG_DIR?.trim();if(t)return t;let o=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return o?D(o,"opencode"):D(e.home??er(),".config","opencode")}function ft(e={}){let t=process.env.OPENCODE_CONFIG?.trim();if(t)return t;let o=e.home??er(),r=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return r?D(r,"opencode","opencode.json"):D(o,".config","opencode","opencode.json")}function yt(e={}){let t=e.cwd??process.cwd();return D(t,"opencode.json")}function tr(e={}){return D(U(e),"plugins")}function or(e={}){return D(U(e),"AGENTS.md")}import{homedir as rr}from"node:os";import{join as ht}from"node:path";function bt(e={}){return ht(e.home??rr(),".claude")}function nr(e={}){return ht(bt(e),"settings.json")}function ir(e={}){return ht(e.home??rr(),".claude.json")}import{homedir as ac}from"node:os";import{join as H}from"node:path";function kt(e={}){return e.kiroHome??process.env.KIRO_HOME??H(e.home??ac(),".kiro")}function cc(e={}){return H(kt(e),"settings")}function Ee(e={}){return H(cc(e),"mcp.json")}function St(e={}){let t=e.cwd??process.cwd();return H(t,".kiro","settings","mcp.json")}function lc(e={}){return H(kt(e),"hooks")}function It(e={}){return H(lc(e),"toolnet-memory.json")}function vt(e={}){let t=e.cwd??process.cwd();return H(t,".kiro","hooks","toolnet-memory.json")}function sr(e={}){return[kt(e),Ee(e)]}import{homedir as uc}from"node:os";import{join as wt}from"node:path";function ar(e={}){return wt(e.home??uc(),".toolnetcli")}function dc(e={}){return wt(ar(e),"config.json")}function cr(e={}){let t=e.cwd??process.cwd();return wt(t,".toolnet","mcp.json")}function lr(e={}){let t=ar(e),o=dc(e);return[t,o]}import{homedir as pc}from"node:os";import{join as Ct}from"node:path";function ur(e={}){if(e.kiloHome)return e.kiloHome;if(process.env.KILO_HOME)return process.env.KILO_HOME;let t=e.xdgConfigHome??process.env.XDG_CONFIG_HOME;return t?Ct(t,"kilo"):Ct(e.home??pc(),".config","kilo")}function jt(e={}){return Ct(ur(e),"kilo.jsonc")}function dr(e={}){let t=ur(e),o=jt(e);return[t,o]}import{homedir as mc}from"node:os";import{join as T,resolve as gc}from"node:path";function Pe(e={}){return e.cursorHome??T(e.home??mc(),".cursor")}function fc(e={}){return e.cursorConfigDir??process.env.CURSOR_CONFIG_DIR??(e.xdgConfigHome??process.env.XDG_CONFIG_HOME?T(e.xdgConfigHome??process.env.XDG_CONFIG_HOME,"cursor"):void 0)??Pe(e)}function Te(e={}){return T(Pe(e),"mcp.json")}function Ae(e={}){return T(Pe(e),"hooks.json")}function xt(e){return T(gc(e),".cursor")}function pr(e){return T(xt(e),"mcp.json")}function mr(e){return T(xt(e),"hooks.json")}function yc(e){return T(xt(e),"rules")}function gr(e){return T(yc(e),"toolnet-memory.mdc")}function fr(e={}){return Array.from(new Set([Pe(e),fc(e)]))}import{homedir as hc}from"node:os";import{join as E,resolve as bc}from"node:path";function Ot(e={}){return e.copilotHome??process.env.COPILOT_HOME??E(e.home??hc(),".copilot")}function _e(e={}){return E(Ot(e),"mcp-config.json")}function kc(e={}){return E(Ot(e),"hooks")}function Me(e={}){return E(kc(e),"toolnet-memory.json")}function Rt(e){return E(bc(e),".github")}function yr(e){return E(Rt(e),"mcp.json")}function Sc(e){return E(Rt(e),"hooks")}function hr(e){return E(Sc(e),"toolnet-memory.json")}function Ic(e){return E(Rt(e),"instructions")}function br(e){return E(Ic(e),"toolnet-memory.instructions.md")}function kr(e={}){return[Ot(e)]}import{homedir as vc}from"node:os";import{join as x,resolve as wc}from"node:path";function Ne(e={}){return e.grokHome??process.env.GROK_HOME??x(e.home??vc(),".grok")}function Fe(e={}){return x(Ne(e),"config.toml")}function Cc(e={}){return x(Ne(e),"hooks")}function $e(e={}){return x(Cc(e),"toolnet-memory.json")}function jc(e={}){return x(Ne(e),"skills")}function xc(e={}){return x(jc(e),"toolnet-continuity")}function De(e={}){return x(xc(e),"SKILL.md")}function Et(e){return x(wc(e),".grok")}function Sr(e){return x(Et(e),"config.toml")}function Oc(e){return x(Et(e),"hooks")}function Ir(e){return x(Oc(e),"toolnet-memory.json")}function Rc(e){return x(Et(e),"skills")}function Ec(e){return x(Rc(e),"toolnet-continuity")}function vr(e){return x(Ec(e),"SKILL.md")}function wr(e={}){return[Ne(e)]}import{homedir as Pc}from"node:os";import{join as Cr}from"node:path";function Tc(e={}){return Cr(e.home??Pc(),".gemini")}function Pt(e={}){return Cr(Tc(e),"settings.json")}function jr(e={}){return[Pt(e)]}import{homedir as Ac}from"node:os";import{join as xr}from"node:path";function _c(e={}){return xr(e.home??Ac(),".junie")}function Tt(e={}){return xr(_c(e),"config.json")}function Or(e={}){return[Tt(e)]}import{homedir as Rr}from"node:os";import{join as At,resolve as Mc}from"node:path";function Nc(e={}){let t=process.env.CODEBUFF_CONFIG_DIR;return t&&t.trim()?Mc(t):At(e.home??Rr(),".config","manicode")}function Er(e={}){return At(e.cwd??process.cwd(),".agents","mcp.json")}function Fc(e={}){return At(e.home??Rr(),".agents","mcp.json")}function Pr(e={}){return[Nc(e),Fc(e)]}import{homedir as Tr}from"node:os";import{join as _t,resolve as $c}from"node:path";function Dc(e={}){let t=process.env.FREEBUFF_CONFIG_DIR;return t&&t.trim()?$c(t):_t(e.home??Tr(),".config","manicode")}function Ar(e={}){return _t(e.cwd??process.cwd(),".agents","mcp.json")}function Hc(e={}){return _t(e.home??Tr(),".agents","mcp.json")}function _r(e={}){return[Dc(e),Hc(e)]}import{homedir as Jc}from"node:os";import{join as Mt}from"node:path";function Nt(e={}){return Mt(e.home??Jc(),".continue")}function Lc(e={}){return Mt(Nt(e),"config.yaml")}function Mr(e={}){return Mt(Nt(e),"sessions")}function Nr(e={}){return[Nt(e),Lc(e)]}function Vc(e){return Gc("sh",["-lc",`command -v ${JSON.stringify(e)} >/dev/null 2>&1`],{stdio:"ignore"}).status===0}function f(e){let t=e.commandExists(e.command),o=e.configPaths.filter(i=>$r(i)),r=o.length>0,n=[];t&&n.push(`command:${e.command}`);for(let i of o)n.push(`config:${i}`);return{agent:e.agent,detected:t||r,commandDetected:t,configDetected:r,evidence:n}}function Fr(e){let t=e.commands.filter(a=>e.commandExists(a)),o=e.configPaths.filter(a=>$r(a)),r=t.length>0,n=o.length>0,i=[...t.map(a=>`command:${a}`),...o.map(a=>`config:${a}`)];return{agent:e.agent,detected:r||n,commandDetected:r,configDetected:n,evidence:i}}function Dr(e={}){let t=e.home??Kc(),o=e.commandExists??Vc,r=e.codexHome??process.env.CODEX_HOME??w(t,".codex");return[f({agent:"agy",command:"agy",commandExists:o,configPaths:Zo({home:t})}),f({agent:"gemini",command:"gemini",commandExists:o,configPaths:jr({home:t})}),f({agent:"junie",command:"junie",commandExists:o,configPaths:Or({home:t})}),f({agent:"codebuff",command:"codebuff",commandExists:o,configPaths:Pr({home:t})}),f({agent:"freebuff",command:"freebuff",commandExists:o,configPaths:_r({home:t})}),f({agent:"continue",command:"cn",commandExists:o,configPaths:Nr({home:t})}),f({agent:"opencode",command:"opencode",commandExists:o,configPaths:[U({home:t,xdgConfigHome:e.xdgConfigHome})]}),f({agent:"claude",command:"claude",commandExists:o,configPaths:[bt({home:t})]}),f({agent:"kiro",command:"kiro-cli",commandExists:o,configPaths:sr({home:t,kiroHome:e.kiroHome})}),Fr({agent:"cursor",commands:["agent","cursor-agent"],commandExists:o,configPaths:fr({home:t,cursorHome:e.cursorHome,cursorConfigDir:e.cursorConfigDir,xdgConfigHome:e.xdgConfigHome})}),f({agent:"copilot",command:"copilot",commandExists:o,configPaths:kr({home:t,copilotHome:e.copilotHome})}),f({agent:"grok",command:"grok",commandExists:o,configPaths:wr({home:t,grokHome:e.grokHome})}),f({agent:"toolnet-cli",command:"toolnet",commandExists:o,configPaths:lr({home:t})}),Fr({agent:"kilo",commands:["kilo","kilo-code"],commandExists:o,configPaths:dr({home:t,kiloHome:e.kiloHome})}),f({agent:"codex",command:"codex",commandExists:o,configPaths:[r]}),f({agent:"goose",command:"goose",commandExists:o,configPaths:[w(t,".agents","plugins")]}),f({agent:"qwen",command:"qwen",commandExists:o,configPaths:[w(t,".qwen")]}),f({agent:"kimi",command:"kimi-code",commandExists:o,configPaths:[w(t,".kimi-code")]}),f({agent:"hermes",command:"hermes",commandExists:o,configPaths:[w(t,".hermes")]}),f({agent:"qoder",command:"qoder",commandExists:o,configPaths:[w(t,".qoder-cn"),w(t,".qoder")]}),f({agent:"aider",command:"aider",commandExists:o,configPaths:[w(t,".aider")]}),f({agent:"plandex",command:"plandex",commandExists:o,configPaths:[w(t,".plandex"),w(t,"plandex-server")]}),f({agent:"openrouter",command:"openrouter",commandExists:o,configPaths:[w(t,".openrouter")]}),f({agent:"bob",command:"bob",commandExists:o,configPaths:[w(t,".bob")]}),f({agent:"cline",command:"cline",commandExists:o,configPaths:[w(t,".cline")]}),f({agent:"rovo",command:"rovo",commandExists:o,configPaths:[w(t,".rovodev"),w(t,".rovo")]}),f({agent:"warp",command:"warp",commandExists:o,configPaths:[w(t,".warp")]})]}import{existsSync as ll,mkdirSync as Vr,readFileSync as ul,renameSync as dl,writeFileSync as pl}from"node:fs";import{dirname as ml,join as Je}from"node:path";import{existsSync as Bc,mkdirSync as Uc,readFileSync as qc,renameSync as Yc,rmSync as Wc,writeFileSync as zc}from"node:fs";import{dirname as Qc,join as Xc}from"node:path";function Zc(e){return`'${e.replace(/'/g,"'\\''")}'`}function el(e){if(!Bc(e))return{};let t;try{t=JSON.parse(qc(e,"utf8"))}catch{throw new Error(`Invalid existing Agy hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Agy hooks.json at ${e}: root must be a JSON object.`);return t}function tl(e,t){Uc(Qc(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{zc(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Yc(o,e)}finally{Wc(o,{force:!0})}}function Hr(e={}){let t=e.pluginName??"toolnet-memory",o=e.hooksFile??Xc(Re(t),"hooks.json"),r=el(o),n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",i=`${Zc(n)} session:agy-hook`;return r["toolnet-memory"]={enabled:!0,PreToolUse:[{matcher:"view_file|list_dir|find_by_name|grep_search|run_command",hooks:[{type:"command",command:`${i} pre-tool`,timeout:5}]}],PreInvocation:[{type:"command",command:`${i} pre`,timeout:15}],PostInvocation:[{type:"command",command:`${i} post`,timeout:15}],Stop:[{type:"command",command:`${i} stop`,timeout:30}]},tl(o,r),o}import{existsSync as ol,mkdirSync as rl,readFileSync as nl,renameSync as il,writeFileSync as sl}from"node:fs";import{dirname as al}from"node:path";function ae(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function cl(e,t){rl(al(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;sl(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),il(o,e)}function Jr(e){if(!ol(e))return{};let t=nl(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Agy MCP config at ${e}: parse error. Not overwriting.`)}if(!ae(o))throw new Error(`Invalid existing Agy MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Lr(e,t){return ae(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function He(e,t,o,r){let n=Jr(e),i=n.mcpServers;if(i!==void 0&&!ae(i))throw new Error(`Invalid existing Agy MCP config: mcpServers must be an object in ${e}.`);let a=ae(i)?{...i}:{},s=a[o];if(Lr(s,t)&&!r)return{installed:!0,changed:!1};a[o]={command:t,args:["mcp"]};let c={...n,mcpServers:a};cl(e,c);let u=Jr(e).mcpServers;if(!ae(u)||!Lr(u[o],t))throw new Error(`Agy MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function Kr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...He(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(r==="both"){let a=xe(),s=Oe({cwd:e.cwd}),c=He(a,t,o,e.force??!1),l=He(s,t,o,e.force??!1);return{installed:!0,changed:c.changed||l.changed,configFile:a,serverName:o,command:t,args:["mcp"]}}let n=r==="workspace"?Oe({cwd:e.cwd}):xe();return{...He(n,t,o,e.force??!1),configFile:n,serverName:o,command:t,args:["mcp"]}}var gl=`# ToolNet Memory Continuity

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
`;function fl(e,t){Vr(ml(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;pl(o,t,{encoding:"utf8",mode:384}),dl(o,e)}function Gr(e,t){ll(e)&&ul(e,"utf8")===t||fl(e,t)}function Br(e={}){let t=e.pluginName??"toolnet-memory",o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.pluginRoot??Re(t),n=Je(r,"plugin.json"),i=Je(r,"mcp_config.json"),a=Je(r,"hooks.json"),s=Je(r,"rules","toolnet-memory-continuity.md");return Vr(r,{recursive:!0,mode:448}),Gr(n,`${JSON.stringify({$schema:"https://antigravity.google/schemas/v1/plugin.json",name:t,description:"Persistent project continuity and memory for Antigravity coding sessions."},null,2)}
`),Kr({configFile:i,binary:o,serverName:"toolnet-memory",force:e.force}),Hr({hooksFile:a,binary:o,pluginName:t}),Gr(s,`${gl.trim()}
`),{installed:!0,pluginRoot:r,files:[n,i,a,s]}}import{existsSync as hl,mkdirSync as Wr,readFileSync as bl,writeFileSync as zr}from"node:fs";import{join as qr}from"node:path";var yl="memory_agent_ask";function Ur(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${yl}

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
`.trim()}var Yr="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",Ft="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function kl(e={}){let t=or();Wr(U(),{recursive:!0});let o=`${Yr}
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


${Ur()}

${Ft}`,r=hl(t)?bl(t,"utf8"):"",n=r.indexOf(Yr),i=r.indexOf(Ft);return n>=0&&i>=n?r=r.slice(0,n)+o+r.slice(i+Ft.length):(r=r.trimEnd(),r&&(r+=`

`),r+=o),zr(t,r.trimEnd()+`
`,{encoding:"utf8",mode:384}),t}function Qr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[];o.push(kl({cwd:e.cwd}));let r=e.scope??"global",n=[];if((r==="global"||r==="both")&&n.push(e.directory??tr()),r==="project"||r==="both"){let i=e.cwd??process.cwd();n.push(qr(i,".opencode","plugins"))}for(let i of n){Wr(i,{recursive:!0});let a=qr(i,"toolnet-memory.js"),s=`
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
`;zr(a,s.trimStart(),{encoding:"utf8",mode:384}),o.push(a)}return o}import{existsSync as en,mkdirSync as Sl,readFileSync as Il,renameSync as vl,writeFileSync as wl}from"node:fs";import{dirname as tn,join as Cl}from"node:path";function ce(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function jl(e,t){Sl(tn(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;wl(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),vl(o,e)}function Xr(e){if(!en(e))return{};let t=Il(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing OpenCode config at ${e}: parse error. Not overwriting.`)}if(!ce(o))throw new Error(`Invalid existing OpenCode config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Zr(e,t){if(!ce(e))return!1;let o=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(o)&&o.length===2&&o[0]===t&&o[1]==="mcp"}function Le(e,t,o,r){let n=Cl(tn(e),"opencode.jsonc"),i=en(n)?n:void 0,a=Xr(e),s=a.mcp;if(s!==void 0&&!ce(s))throw new Error(`Invalid existing OpenCode config: mcp must be an object in ${e}.`);let c=ce(s)?{...s}:{},l=c[o];if(Zr(l,t)&&!r)return{installed:!0,changed:!1,preservedJsonc:i};c[o]={type:"local",command:[t,"mcp"],enabled:!0};let u={...a,mcp:c};jl(e,u);let p=Xr(e);if(!ce(p.mcp)||!Zr(p.mcp[o],t))throw new Error(`OpenCode MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0,preservedJsonc:i}}function on(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...Le(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:[t,"mcp"]};if(r==="both"){let a=ft(),s=yt({cwd:e.cwd}),c=Le(a,t,o,e.force??!1),l=Le(s,t,o,e.force??!1);return{installed:!0,changed:c.changed||l.changed,configFile:a,serverName:o,command:[t,"mcp"],preservedJsonc:c.preservedJsonc??l.preservedJsonc}}let n=r==="project"?yt({cwd:e.cwd}):ft();return{...Le(n,t,o,e.force??!1),configFile:n,serverName:o,command:[t,"mcp"]}}import{existsSync as xl,mkdirSync as rn,readFileSync as Ol,writeFileSync as nn}from"node:fs";import{homedir as sn}from"node:os";import{dirname as an,join as $t}from"node:path";function Rl(e){let t=[],o=/"((?:\\.|[^"\\])*)"|'([^']*)'/g,r;for(;r=o.exec(e);){let n=r[1]??r[2]??"";try{t.push(r[1]!==void 0?JSON.parse(`"${n}"`):n)}catch{t.push(n)}}return t}function cn(e={}){let t=e.configFile??$t(process.env.CODEX_HOME??$t(sn(),".codex"),"config.toml"),o=e.previousFile??$t(sn(),".config","toolnet-memory","codex-notify-previous.json");rn(an(t),{recursive:!0}),rn(an(o),{recursive:!0});let r=xl(t)?Ol(t,"utf8"):"",n=e.binary??"toolnet-memory",i=`notify = [${JSON.stringify(n)}, "session:codex-notify"]`,a=r.split(`
`),s=a.findIndex(d=>/^\s*\[/.test(d));s<0&&(s=a.length);let c=-1,l=-1;for(let d=0;d<s;d+=1)if(/^\s*notify\s*=/.test(a[d])){if(c=d,l=d,a[d].includes("[")&&!a[d].includes("]"))for(;l+1<s&&(l+=1,!a[l].includes("]")););break}let u=[];if(c>=0){let d=a.slice(c,l+1).join(`
`);u=Rl(d),a.splice(c,l-c+1,i)}else s=a.findIndex(d=>/^\s*\[/.test(d)),s<0&&(s=a.length),a.splice(s,0,i);let p=u.length>=2&&u[u.length-1]==="session:codex-notify";return u.length>0&&!p&&nn(o,JSON.stringify(u,null,2)+`
`,{encoding:"utf8",mode:384}),r=a.join(`
`),r.endsWith(`
`)||(r+=`
`),nn(t,r,{encoding:"utf8",mode:384}),{configFile:t,previousFile:o,preservedPrevious:u.length>0&&!p}}import{existsSync as El,mkdirSync as Pl,readFileSync as Tl,writeFileSync as Al}from"node:fs";import{homedir as _l}from"node:os";import{dirname as Ml,join as ln}from"node:path";function Nl(e){return`'${e.replace(/'/g,"'\\''")}'`}function un(e={}){let t=e.hooksFile??ln(process.env.CODEX_HOME??ln(_l(),".codex"),"hooks.json");Pl(Ml(t),{recursive:!0});let o={};if(El(t))try{o=JSON.parse(Tl(t,"utf8"))}catch(s){throw new Error(`Invalid existing Codex hooks.json: ${s instanceof Error?s.message:String(s)}`)}let r=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=r;let i=(Array.isArray(r.SessionStart)?r.SessionStart:[]).filter(s=>{try{return!JSON.stringify(s).includes("session:codex-context")}catch{return!0}}),a=e.binary??"toolnet-memory";return i.push({matcher:"startup|resume|clear|compact",hooks:[{type:"command",command:`${Nl(a)} session:codex-context`,timeout:15,additionalContextLimit:1e3,statusMessage:"Loading ToolNet project continuity"}]}),r.SessionStart=i,Al(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),t}import{existsSync as dn,mkdirSync as Fl,readFileSync as pn,writeFileSync as $l}from"node:fs";import{homedir as Dl}from"node:os";import{dirname as Hl,join as mn}from"node:path";function gn(e){return`'${e.replace(/'/g,"'\\''")}'`}function fn(e={}){let t=e.hooksFile??mn(process.env.CODEX_HOME??mn(Dl(),".codex"),"hooks.json");Fl(Hl(t),{recursive:!0});let o={};if(dn(t))try{o=JSON.parse(pn(t,"utf8"))}catch{throw new Error(`Invalid existing Codex hooks.json at ${t}: parse error. Not overwriting.`)}let r=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=r;let n=e.binary??"toolnet-memory",i=`${gn(n)} session:codex-stop-hook`,a=`${gn(n)} session:codex-session-end`,s={hooks:[{type:"command",command:i,timeout:30}]},c={hooks:[{type:"command",command:a,timeout:3}]},u=(Array.isArray(r.Stop)?r.Stop:[]).filter(y=>{try{return!JSON.stringify(y).includes("session:codex-stop-hook")}catch{return!0}}),d=(Array.isArray(r.SessionEnd)?r.SessionEnd:[]).filter(y=>{try{return!JSON.stringify(y).includes("session:codex-session-end")}catch{return!0}});r.Stop=[...u,s],r.SessionEnd=[...d,c];let m=JSON.stringify(o,null,2)+`
`,S=!dn(t)||pn(t,"utf8")!==m;return $l(t,m,{encoding:"utf8",mode:384}),{hooksFile:t,changed:S,stopInstalled:!0,sessionEndInstalled:!0}}import{spawnSync as Jl}from"node:child_process";function Dt(e,t){return Jl(e,t,{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}function yn(e,t){let o=Dt(e,["mcp","get",t,"--json"]);if(o.status!==0||!o.stdout)return null;try{return JSON.parse(o.stdout)}catch{return null}}function hn(e,t){return e.enabled!==!1&&e.transport?.type==="stdio"&&e.transport?.command===t&&Array.isArray(e.transport?.args)&&e.transport?.args.length===1&&e.transport.args[0]==="mcp"}function bn(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.codexBinary??"codex",r=e.serverName??"toolnet-memory",n=yn(o,r);if(n&&hn(n,t))return{installed:!0,changed:!1,serverName:r,command:t,args:["mcp"]};if(n){let s=Dt(o,["mcp","remove",r]);if(s.status!==0)return{installed:!1,changed:!1,serverName:r,command:t,args:["mcp"],error:(s.stderr||s.stdout||"Unable to remove old ToolNet MCP configuration.").trim()}}let i=Dt(o,["mcp","add",r,"--",t,"mcp"]);if(i.status!==0)return{installed:!1,changed:!1,serverName:r,command:t,args:["mcp"],error:(i.stderr||i.stdout||"Unable to register ToolNet MCP.").trim()};let a=yn(o,r);return!a||!hn(a,t)?{installed:!1,changed:!0,serverName:r,command:t,args:["mcp"],error:"Codex accepted MCP registration but verification did not match expected ToolNet command."}:{installed:!0,changed:!0,serverName:r,command:t,args:["mcp"]}}import{existsSync as Ll,mkdirSync as Kl,readFileSync as Gl,renameSync as Vl,rmSync as Bl,writeFileSync as Ul}from"node:fs";import{dirname as ql}from"node:path";function le(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Yl(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function Wl(e){if(!Ll(e))return{};let t;try{t=JSON.parse(Gl(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude settings.json: ${o instanceof Error?o.message:String(o)}`)}if(!le(t))throw new Error("Invalid existing Claude settings.json: root must be a JSON object.");return t}function Ke(e){if(e===void 0)return[];if(!Array.isArray(e))throw new Error("Invalid existing Claude settings.json: hook event must be an array.");let t=[];for(let o of e){if(!le(o)){t.push(o);continue}let r=o.hooks;if(!Array.isArray(r)){t.push(o);continue}let n=r.filter(i=>{if(!le(i))return!0;let a=i.command;return!(typeof a=="string"&&a.includes("session:claude-hook"))});n.length!==0&&t.push({...o,hooks:n})}return t}function Ge(e,t=10){return{type:"command",command:e,timeout:t}}function zl(e,t){Kl(ql(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Ul(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Vl(o,e)}finally{Bl(o,{force:!0})}}function kn(e={}){let t=e.settingsFile??nr(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=Wl(t),n=r.hooks;if(n!==void 0&&!le(n))throw new Error("Invalid existing Claude settings.json: hooks must be an object.");let i=le(n)?{...n}:{},a=`${Yl(o)} session:claude-hook`,s=Ke(i.SessionStart);s.push({matcher:"startup|resume|clear|compact",hooks:[Ge(a)]}),i.SessionStart=s;let c=Ke(i.UserPromptSubmit);c.push({hooks:[Ge(a)]}),i.UserPromptSubmit=c;let l=Ke(i.PostToolUse);l.push({matcher:"Edit|Write",hooks:[Ge(a)]}),i.PostToolUse=l;let u=Ke(i.Stop);u.push({hooks:[Ge(a,30)]}),i.Stop=u;let p={...r,hooks:i},d=JSON.stringify(r),m=JSON.stringify(p);return d===m?{settingsFile:t,changed:!1}:e.dryRun===!0?{settingsFile:t,changed:!0,dryRun:!0}:(zl(t,p),{settingsFile:t,changed:!0})}import{existsSync as Ql,mkdirSync as Xl,readFileSync as Zl,renameSync as eu,rmSync as tu,writeFileSync as ou}from"node:fs";import{dirname as ru}from"node:path";function ue(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Sn(e){if(!Ql(e))return{};let t;try{t=JSON.parse(Zl(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude Code config: ${o instanceof Error?o.message:String(o)}`)}if(!ue(t))throw new Error("Invalid existing Claude Code config: root must be a JSON object.");return t}function In(e,t){if(!ue(e))return!1;let o=e.args;return e.type==="stdio"&&e.command===t&&Array.isArray(o)&&o.length===1&&o[0]==="mcp"}function nu(e,t){Xl(ru(e),{recursive:!0});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{ou(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),eu(o,e)}finally{tu(o,{force:!0})}}function vn(e={}){let t=e.stateFile??ir(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=Sn(t),i=n.mcpServers;if(i!==void 0&&!ue(i))throw new Error("Invalid existing Claude Code config: mcpServers must be an object.");let a=ue(i)?{...i}:{},s=a[r];if(In(s,o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:[o,"mcp"],repaired:!1};let c=s!==void 0;if(a[r]={type:"stdio",command:o,args:["mcp"]},e.dryRun===!0)return{installed:!0,changed:!0,configFile:t,serverName:r,command:[o,"mcp"],repaired:c,dryRun:!0};nu(t,{...n,mcpServers:a});let u=Sn(t).mcpServers;if(!ue(u)||!In(u[r],o))throw new Error("Claude Code MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:[o,"mcp"],repaired:c}}function wn(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=kn({binary:t,settingsFile:e.settingsFile,...e.dryRun!==void 0?{dryRun:e.dryRun}:{}}),r=vn({binary:t,stateFile:e.stateFile,...e.dryRun!==void 0?{dryRun:e.dryRun}:{}});return{hooks:o,mcp:r,files:[o.settingsFile,r.configFile]}}import{existsSync as iu,mkdirSync as su,readFileSync as au,renameSync as cu,rmSync as lu,writeFileSync as uu}from"node:fs";import{dirname as du}from"node:path";var q="ToolNet Memory - ";function xn(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function pu(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function Cn(e){if(!iu(e))return{};let t=au(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro hooks file at ${e}: parse error. Not overwriting.`)}if(!xn(o))throw new Error(`Invalid existing Kiro hooks file at ${e}: root must be a JSON object. Not overwriting.`);return o}function jn(e){return xn(e)?typeof e.name=="string"&&e.name.startsWith(q):!1}function de(e){return{type:"command",command:e}}function mu(e){return[{name:`${q}Session Start`,description:"Inject compact local ToolNet continuity and capture Kiro session activation.",trigger:"SessionStart",action:de(e),timeout:10,enabled:!0},{name:`${q}Prompt Continuity`,description:"Capture prompts and refresh ToolNet guidance only for resume/continue requests.",trigger:"UserPromptSubmit",action:de(e),timeout:10,enabled:!0},{name:`${q}Raw History Guard`,description:"Prevent Kiro from reconstructing continuity from raw ToolNet/agent session history.",trigger:"PreToolUse",matcher:"*",action:de(e),timeout:10,enabled:!0},{name:`${q}Tool Capture`,description:"Capture durable tool activity while filtering noisy read-only events.",trigger:"PostToolUse",matcher:"*",action:de(e),timeout:15,enabled:!0},{name:`${q}Final Flush`,description:"Flush pending Kiro WAL events when the assistant finishes a turn.",trigger:"Stop",action:de(e),timeout:30,enabled:!0}]}function gu(e,t){su(du(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{uu(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),cu(o,e)}finally{lu(o,{force:!0})}}function Ve(e,t,o){let r=Cn(e);if(r.version!==void 0&&r.version!=="v1")throw new Error(`Unsupported existing Kiro hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!Array.isArray(n))throw new Error("Invalid existing Kiro hooks file: hooks must be an array.");let i=Array.isArray(n)?n.filter(l=>!jn(l)):[],a=mu(t),s={...r,version:"v1",hooks:[...i,...a]};if(!o&&JSON.stringify(r)===JSON.stringify(s))return{changed:!1,hookCount:a.length};gu(e,s);let c=Cn(e);if(c.version!=="v1"||!Array.isArray(c.hooks)||c.hooks.filter(jn).length!==a.length)throw new Error("Kiro hooks were written but verification failed.");return{changed:!0,hookCount:a.length}}function On(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=`${pu(t)} session:kiro-hook`;if(e.hooksFile){let a=Ve(e.hooksFile,r,e.force??!1);return{hooksFile:e.hooksFile,...a}}if(o==="both"){let a=It(),s=vt({cwd:e.cwd}),c=Ve(a,r,e.force??!1),l=Ve(s,r,e.force??!1);return{hooksFile:a,changed:c.changed||l.changed,hookCount:c.hookCount}}let n=o==="project"?vt({cwd:e.cwd}):It(),i=Ve(n,r,e.force??!1);return{hooksFile:n,...i}}import{existsSync as fu,mkdirSync as yu,readFileSync as hu,renameSync as bu,rmSync as ku,writeFileSync as Su}from"node:fs";import{dirname as Iu}from"node:path";function pe(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Rn(e){if(!fu(e))return{};let t=hu(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro MCP config at ${e}: parse error. Not overwriting.`)}if(!pe(o))throw new Error(`Invalid existing Kiro MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function En(e,t){return pe(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&e.disabled===!1:!1}function vu(e,t){yu(Iu(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Su(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),bu(o,e)}finally{ku(o,{force:!0})}}function Be(e,t,o,r){let n=Rn(e),i=n.mcpServers;if(i!==void 0&&!pe(i))throw new Error(`Invalid existing Kiro MCP config: mcpServers must be an object in ${e}.`);let a=pe(i)?{...i}:{},s=a[o];if(En(s,t)&&!r)return{installed:!0,changed:!1};a[o]={command:t,args:["mcp"],disabled:!1};let c={...n,mcpServers:a};vu(e,c);let u=Rn(e).mcpServers;if(!pe(u)||!En(u[o],t))throw new Error(`Kiro MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function Pn(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...Be(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(r==="both"){let a=Ee(),s=St({cwd:e.cwd}),c=Be(a,t,o,e.force??!1),l=Be(s,t,o,e.force??!1);return{installed:!0,changed:c.changed||l.changed,configFile:a,serverName:o,command:t,args:["mcp"]}}let n=r==="project"?St({cwd:e.cwd}):Ee();return{...Be(n,t,o,e.force??!1),configFile:n,serverName:o,command:t,args:["mcp"]}}function Tn(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=Pn({binary:t,configFile:e.configFile,scope:e.scope,cwd:e.cwd,force:e.force}),r=On({binary:t,hooksFile:e.hooksFile,scope:e.scope,cwd:e.cwd,force:e.force});return{installed:o.installed,changed:o.changed||r.changed,mcp:o,hooks:r,files:[o.configFile,r.hooksFile]}}import{existsSync as wu,mkdirSync as Cu,readFileSync as ju,renameSync as xu,rmSync as Ou,writeFileSync as Ru}from"node:fs";import{dirname as Eu}from"node:path";function Ht(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Pu(e){if(!wu(e))return{};let t=ju(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: parse error. Not overwriting.`)}if(!Ht(o))throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Tu(e,t){Cu(Eu(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Ru(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),xu(o,e)}finally{Ou(o,{force:!0})}}function An(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??cr({cwd:e.cwd}),r=Pu(o),n="toolnet-memory";if(Ht(r.mcpServers)&&r.mcpServers[n]!=null&&!e.force)return{installed:!0,changed:!1,configFile:o};let a=Ht(r.mcpServers)?{...r.mcpServers}:{};return a[n]={command:t,args:["mcp"]},r.mcpServers=a,Tu(o,r),{installed:!0,changed:!0,configFile:o}}function _n(e={}){let t=e.binary??"toolnet-memory",o=An({binary:t,configFile:e.configFile,force:e.force,cwd:e.cwd});return{installed:o.installed,changed:o.changed,mcp:{...o,configured:o.installed},files:[o.configFile]}}import{mkdirSync as Hu,existsSync as Ju}from"node:fs";import{dirname as Lu}from"node:path";import{existsSync as Au,mkdirSync as _u,readFileSync as Mu,renameSync as Nu,rmSync as Fu,writeFileSync as $u}from"node:fs";import{dirname as Du}from"node:path";function h(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function O(e,t){if(!Au(e))return{};let o=Mu(e,"utf8").trim();if(!o)return{};let r;try{r=JSON.parse(o)}catch(n){throw new Error(`Invalid existing ${t} MCP config: ${n instanceof Error?n.message:String(n)}`)}if(!h(r))throw new Error(`Invalid existing ${t} MCP config: root must be a JSON object.`);return r}function P(e,t){_u(Du(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{$u(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Nu(o,e)}finally{Fu(o,{force:!0})}}function Mn(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??jt(),r=Lu(o);Ju(r)||Hu(r,{recursive:!0});let n=O(o,"Kilo"),i=n.mcp;if(i!==void 0&&!h(i))throw new Error("Invalid existing Kilo config: mcp must be an object.");let a=h(i)?{...i}:{},s="toolnet-memory";return h(a[s])&&!e.force?{installed:!0,changed:!1,configFile:o,configured:!0}:(a[s]={type:"local",command:[t,"mcp"],enabled:!0,timeout:1e4},P(o,{...n,mcp:a}),{installed:!0,changed:!0,configFile:o,configured:!0})}function Nn(e={}){let t=e.binary??"toolnet-memory",o=Mn({binary:t,configFile:e.configFile,force:e.force});return{installed:o.installed,changed:o.changed,mcp:o,files:[o.configFile]}}import{existsSync as Ku,mkdirSync as Gu,readFileSync as Vu,renameSync as Bu,rmSync as Uu,writeFileSync as qu}from"node:fs";import{dirname as Yu}from"node:path";function v(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function A(e,t){if(!Ku(e))return{};let o=Vu(e,"utf8").trim();if(!o)return{};let r;try{r=JSON.parse(o)}catch(n){throw new Error(`Invalid existing ${t} hooks file: ${n instanceof Error?n.message:String(n)}`)}if(!v(r))throw new Error(`Invalid existing ${t} hooks file: root must be a JSON object.`);return r}function Y(e,t){Gu(Yu(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{qu(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Bu(o,e)}finally{Uu(o,{force:!0})}}function Jt(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}var me=[["sessionStart",10],["beforeSubmitPrompt",10],["preToolUse",10],["postToolUse",15],["afterAgentResponse",15],["stop",30]];function Fn(e){return v(e)&&typeof e.command=="string"&&e.command.includes("session:cursor-hook")}function Wu(e,t,o){let n={type:"command",command:`TOOLNET_HOOK_EVENT=${Jt(e)} ${Jt(t)} session:cursor-hook`,timeout:o};return e==="preToolUse"&&(n.matcher=".*"),n}function Lt(e={}){let t=e.hooksFile??Ae(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=A(t,"Cursor");if(r.version!==void 0&&r.version!==1)throw new Error(`Unsupported existing Cursor hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!v(n))throw new Error("Invalid existing Cursor hooks file: hooks must be an object.");let i=v(n)?{...n}:{};for(let[l,u]of me){let p=i[l];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing Cursor hooks file: hooks.${l} must be an array.`);let d=Array.isArray(p)?p.filter(m=>!Fn(m)):[];i[l]=[...d,Wu(l,o,u)]}let a={...r,version:1,hooks:i};if(JSON.stringify(r)===JSON.stringify(a))return{hooksFile:t,changed:!1,hookCount:me.length};Y(t,a);let s=A(t,"Cursor");if(s.version!==1||!v(s.hooks))throw new Error("Cursor hooks were written but verification failed.");let c=0;for(let[l]of me){let u=s.hooks[l];if(!Array.isArray(u))throw new Error("Cursor hooks were written but verification failed.");c+=u.filter(Fn).length}if(c!==me.length)throw new Error("Cursor hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:me.length}}function $n(e,t){return h(e)?(e.type===void 0||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function Kt(e={}){let t=e.configFile??Te(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=O(t,"Cursor"),i=n.mcpServers;if(i!==void 0&&!h(i))throw new Error("Invalid existing Cursor MCP config: mcpServers must be an object.");let a=h(i)?{...i}:{};if($n(a[r],o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};a[r]={type:"stdio",command:o,args:["mcp"]},P(t,{...n,mcpServers:a});let c=O(t,"Cursor").mcpServers;if(!h(c)||!$n(c[r],o))throw new Error("Cursor MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}import{mkdirSync as zu,readFileSync as Dn,renameSync as Qu,rmSync as Xu,writeFileSync as Zu}from"node:fs";import{dirname as ed}from"node:path";var Gt=`---
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
`;function td(e,t){zu(ed(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Zu(o,t,{encoding:"utf8",mode:384}),Qu(o,e)}finally{Xu(o,{force:!0})}}function Hn(e){let t=e.ruleFile??gr(e.projectRoot);try{if(Dn(t,"utf8")===Gt)return{ruleFile:t,changed:!1}}catch{}if(td(t,Gt),Dn(t,"utf8")!==Gt)throw new Error("Cursor ToolNet project rule was written but verification failed.");return{ruleFile:t,changed:!0}}import{spawnSync as od}from"node:child_process";import{existsSync as W,statSync as rd}from"node:fs";import{dirname as Jn,join as nd,parse as id,resolve as Bt}from"node:path";function Ln(e){let t=Bt(e);if(!W(t))throw new Error(`Project path does not exist: ${t}`);if(!rd(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);return t}function Ue(e){return nd(e,".toolnet","project.json")}function sd(e){let t=Bt(e),o=id(t).root,r=["/tmp","/var","/usr","/opt","/etc","/boot","/sys","/proc","/dev"];for(;;){if(r.includes(t)){let i=Jn(t);if(i===t)return;t=i;continue}if(W(Ue(t)))return t;if(t===o)return;let n=Jn(t);if(n===t)return;t=n}}function Vt(e){let t=od("git",["rev-parse","--show-toplevel"],{cwd:e,encoding:"utf8",timeout:5e3});if(t.status!==0)return;let o=t.stdout.trim();return o?Bt(o):void 0}function _(e={}){let t=Ln(e.cwd??process.cwd());if(e.project){let n=Ln(e.project),i=Ue(n),a=Vt(n);return{root:n,source:"explicit",eligible:!0,toolnetProject:W(i),manifestFile:W(i)?i:void 0,gitRoot:a}}let o=sd(t);if(o){let n=Ue(o);return{root:o,source:"toolnet",eligible:!0,toolnetProject:!0,manifestFile:n,gitRoot:Vt(o)}}let r=Vt(t);if(r){let n=Ue(r);return{root:r,source:"git",eligible:!0,toolnetProject:W(n),manifestFile:W(n)?n:void 0,gitRoot:r}}return{root:t,source:"cwd",eligible:!1,toolnetProject:!1}}function Bn(e,t={}){let o=[],r=e.indexOf("--scope");if(r>=0){let i=e[r+1];if(i!=="global"&&i!=="project"&&i!=="both")throw new Error(`Invalid --scope value: ${String(i)}`);o.push(i)}e.includes("--global")&&o.push("global"),e.includes("--both")&&o.push("both");let n=Array.from(new Set(o));if(n.length>1)throw new Error(`Conflicting integration scopes: ${n.join(", ")}`);return n[0]??t.defaultScope??"global"}function Kn(e,t){return{install:e,effective:t}}function M(e,t){return{surface:e,global:Kn(t.globalInstall,t.effective==="global"||t.effective==="both"),project:Kn(t.projectInstall,t.effective==="project"||t.effective==="both"),effective:t.effective,risk:t.risk??"none",dedupeRequired:t.dedupeRequired??!1,trustRequired:t.trustRequired??t.projectInstall,note:t.note}}function ad(e){return{mcp:M("mcp",{globalInstall:!0,projectInstall:!1,effective:"global"}),hooks:M("hooks",{globalInstall:!0,projectInstall:!1,effective:"global"}),work:M("work",{globalInstall:e==="grok",projectInstall:!1,effective:e==="grok"?"global":"none",note:e==="grok"?"Grok supports a global ToolNet continuity skill.":"Cursor/Copilot work instructions remain project-scoped."})}}function Gn(e){return{mcp:M("mcp",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),hooks:M("hooks",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),work:M("work",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!1,note:e==="cursor"?"Use .cursor/rules/toolnet-memory.mdc.":e==="copilot"?"Use .github/instructions/toolnet-memory.instructions.md.":"Use .grok/skills/toolnet-continuity/SKILL.md."})}}function Vn(e){return{mcp:M("mcp",{globalInstall:!0,projectInstall:!0,effective:"project",risk:e==="cursor"?"precedence-unverified":"shadowed-global",trustRequired:!0,note:e==="cursor"?"Project ToolNet MCP is the intended effective definition; native same-name precedence must be E2E certified before release.":"Global remains useful outside the project; same-name project definition wins inside the project."}),hooks:M("hooks",{globalInstall:!0,projectInstall:!0,effective:"both",risk:"additive-duplicate",dedupeRequired:!0,trustRequired:!0,note:"Global and project hook sources can both execute for the same native event."}),work:M("work",{globalInstall:e==="grok",projectInstall:!0,effective:"project",risk:e==="grok"?"shadowed-global":"none",trustRequired:!1,note:e==="cursor"?"Project rule is authoritative.":e==="copilot"?"Project instruction is authoritative.":"Project skill shadows the same-name global skill inside the project."})}}function z(e){let{agent:t,scope:o,project:r}=e;return(o==="project"||o==="both")&&(!r||!r.eligible)?{agent:t,requestedScope:o,project:r,surfaces:o==="both"?Vn(t):Gn(t),canInstall:!1,reason:"Project scope requires an explicit project, existing ToolNet project, or Git repository root."}:{agent:t,requestedScope:o,project:r,surfaces:o==="global"?ad(t):o==="project"?Gn(t):Vn(t),canInstall:!0}}function Un(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.rule?.changed)}function qn(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:_({project:e.projectRoot}),n=z({agent:"cursor",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Cursor project integration scope cannot be resolved.");let i,a;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(i={},n.surfaces.mcp.global.install&&(i.mcp=Kt({binary:t,configFile:e.configFile??Te()})),n.surfaces.hooks.global.install&&(i.hooks=Lt({binary:t,hooksFile:e.hooksFile??Ae()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Cursor project integration requires an eligible project root.");a={},n.surfaces.mcp.project.install&&(a.mcp=Kt({binary:t,configFile:e.projectConfigFile??pr(r.root)})),n.surfaces.hooks.project.install&&(a.hooks=Lt({binary:t,hooksFile:e.projectHooksFile??mr(r.root)})),n.surfaces.work.project.install&&(a.rule=Hn({projectRoot:r.root,ruleFile:e.projectRuleFile}))}let s=a?.mcp??i?.mcp,c=a?.hooks??i?.hooks;if(!s||!c)throw new Error("Cursor integration did not produce an effective MCP/hooks installation.");let l=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.rule?.ruleFile,a?.mcp?.configFile,a?.hooks?.hooksFile,a?.rule?.ruleFile].filter(u=>typeof u=="string")));return{installed:!0,changed:Un(i)||Un(a),scope:o,plan:n,project:r,global:i,projectScope:a,mcp:s,hooks:c,rule:a?.rule,files:l}}var ge=[["sessionStart",10],["userPromptSubmitted",10],["userPromptTransformed",10],["preToolUse",10],["postToolUse",15],["agentStop",30]];function cd(e){if(typeof e.command=="string")return e.command;if(typeof e.bash=="string")return e.bash}function Yn(e){return v(e)&&cd(e)?.includes("session:copilot-hook")===!0}function ld(e,t,o){let r={type:"command",command:`${t} session:copilot-hook`,env:{TOOLNET_HOOK_EVENT:e},timeoutSec:o};return e==="preToolUse"&&(r.matcher=".*"),r}function Ut(e={}){let t=e.hooksFile??Me(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=A(t,"GitHub Copilot CLI");if(r.version!==void 0&&r.version!==1)throw new Error(`Unsupported existing GitHub Copilot CLI hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!v(n))throw new Error("Invalid existing GitHub Copilot CLI hooks file: hooks must be an object.");let i=v(n)?{...n}:{};for(let[l,u]of ge){let p=i[l];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing GitHub Copilot CLI hooks file: hooks.${l} must be an array.`);let d=Array.isArray(p)?p.filter(m=>!Yn(m)):[];i[l]=[...d,ld(l,o,u)]}let a={...r,version:1,hooks:i};if(JSON.stringify(r)===JSON.stringify(a))return{hooksFile:t,changed:!1,hookCount:ge.length};Y(t,a);let s=A(t,"GitHub Copilot CLI");if(s.version!==1||!v(s.hooks))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");let c=0;for(let[l]of ge){let u=s.hooks[l];if(!Array.isArray(u))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");c+=u.filter(Yn).length}if(c!==ge.length)throw new Error("GitHub Copilot CLI hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:ge.length}}function Wn(e,t){return h(e)?(e.type===void 0||e.type==="local"||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&Array.isArray(e.tools)&&e.tools.length===1&&e.tools[0]==="*":!1}function qt(e={}){let t=e.configFile??_e(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=O(t,"GitHub Copilot CLI"),i=n.mcpServers;if(i!==void 0&&!h(i))throw new Error("Invalid existing GitHub Copilot CLI MCP config: mcpServers must be an object.");let a=h(i)?{...i}:{};if(Wn(a[r],o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};a[r]={type:"stdio",command:o,args:["mcp"],tools:["*"]},P(t,{...n,mcpServers:a});let c=O(t,"GitHub Copilot CLI").mcpServers;if(!h(c)||!Wn(c[r],o))throw new Error("GitHub Copilot CLI MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}import{mkdirSync as ud,readFileSync as zn,renameSync as dd,rmSync as pd,writeFileSync as md}from"node:fs";import{dirname as gd}from"node:path";var Yt=`---
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
`;function fd(e,t){ud(gd(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{md(o,t,{encoding:"utf8",mode:384}),dd(o,e)}finally{pd(o,{force:!0})}}function Qn(e){let t=e.instructionFile??br(e.projectRoot);try{if(zn(t,"utf8")===Yt)return{instructionFile:t,changed:!1}}catch{}if(fd(t,Yt),zn(t,"utf8")!==Yt)throw new Error("Copilot ToolNet project instruction verification failed.");return{instructionFile:t,changed:!0}}function Xn(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.instruction?.changed)}function Zn(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:_({project:e.projectRoot}),n=z({agent:"copilot",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Copilot project integration scope cannot be resolved.");let i,a;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(i={},n.surfaces.mcp.global.install&&(i.mcp=qt({binary:t,configFile:e.configFile??_e()})),n.surfaces.hooks.global.install&&(i.hooks=Ut({binary:t,hooksFile:e.hooksFile??Me()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Copilot project integration requires an eligible project root.");a={},n.surfaces.mcp.project.install&&(a.mcp=qt({binary:t,configFile:e.projectConfigFile??yr(r.root)})),n.surfaces.hooks.project.install&&(a.hooks=Ut({binary:t,hooksFile:e.projectHooksFile??hr(r.root)})),n.surfaces.work.project.install&&(a.instruction=Qn({projectRoot:r.root,instructionFile:e.projectInstructionFile}))}let s=a?.mcp??i?.mcp,c=a?.hooks??i?.hooks;if(!s||!c)throw new Error("Copilot integration did not produce effective MCP/hooks.");let l=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.instruction?.instructionFile,a?.mcp?.configFile,a?.hooks?.hooksFile,a?.instruction?.instructionFile].filter(u=>typeof u=="string")));return{installed:!0,changed:Xn(i)||Xn(a),scope:o,plan:n,project:r,global:i,projectScope:a,mcp:s,hooks:c,instruction:a?.instruction,files:l}}import{existsSync as yd,mkdirSync as hd,readFileSync as ei,renameSync as bd,rmSync as kd,writeFileSync as Sd}from"node:fs";import{dirname as Id}from"node:path";var Wt=`---
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
`;function vd(e,t){hd(Id(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Sd(o,t,{encoding:"utf8",mode:384}),bd(o,e)}finally{kd(o,{force:!0})}}function zt(e={}){let t=e.skillFile??De();if(yd(t)&&ei(t,"utf8")===Wt)return{skillFile:t,changed:!1};if(vd(t,Wt),ei(t,"utf8")!==Wt)throw new Error("Grok ToolNet continuity skill was written but verification failed.");return{skillFile:t,changed:!0}}var fe=[["SessionStart",10],["UserPromptSubmit",10],["PreToolUse",10],["PostToolUse",15],["Stop",30]];function ti(e){return!v(e)||!Array.isArray(e.hooks)?!1:e.hooks.some(t=>v(t)&&typeof t.command=="string"&&t.command.includes("session:grok-hook"))}function wd(e,t,o){let r={hooks:[{type:"command",command:`${t} session:grok-hook`,timeout:o,env:{TOOLNET_HOOK_EVENT:e}}]};return e==="PreToolUse"&&(r.matcher=".*"),r}function Qt(e={}){let t=e.hooksFile??$e(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=A(t,"Grok Build"),n=r.hooks;if(n!==void 0&&!v(n))throw new Error("Invalid existing Grok Build hooks file: hooks must be an object.");let i=v(n)?{...n}:{};for(let[l,u]of fe){let p=i[l];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing Grok Build hooks file: hooks.${l} must be an array.`);let d=Array.isArray(p)?p.filter(m=>!ti(m)):[];i[l]=[...d,wd(l,o,u)]}let a={...r,hooks:i};if(JSON.stringify(r)===JSON.stringify(a))return{hooksFile:t,changed:!1,hookCount:fe.length};Y(t,a);let s=A(t,"Grok Build");if(!v(s.hooks))throw new Error("Grok Build hooks were written but verification failed.");let c=0;for(let[l]of fe){let u=s.hooks[l];if(!Array.isArray(u))throw new Error("Grok Build hooks were written but verification failed.");c+=u.filter(ti).length}if(c!==fe.length)throw new Error("Grok Build hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:fe.length}}import{existsSync as Cd,mkdirSync as jd,readFileSync as xd,renameSync as Od,rmSync as Rd,writeFileSync as Ed}from"node:fs";import{dirname as Pd}from"node:path";function oi(e){return Cd(e)?xd(e,"utf8"):""}function Td(e,t){jd(Pd(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Ed(o,t,{encoding:"utf8",mode:384}),Od(o,e)}finally{Rd(o,{force:!0})}}function Xt(e){return e.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t")}function Ad(e){return`[mcp_servers."${Xt(e)}"]`}function _d(e,t){return[Ad(e),`command = "${Xt(t)}"`,'args = ["mcp"]',"enabled = true"].join(`
`)}function Md(e){let t=e.trim();return t.startsWith("[")&&t.includes("]")}function qe(e){return e.trim().replace(/\s+/g,"")}function Nd(e){return new Set([qe(`[mcp_servers.${e}]`),qe(`[mcp_servers."${e}"]`),qe(`[mcp_servers.'${e}']`)])}function ni(e,t){let o=e.split(/\r?\n/),r=Nd(t),n=-1;for(let u=0;u<o.length;u+=1){let p=qe(o[u].replace(/\s+#.*$/,""));if(r.has(p)){n=u;break}}if(n<0)return null;let i=o.length;for(let u=n+1;u<o.length;u+=1)if(Md(o[u])){i=u;break}let a=[],s=0;for(let u of o)a.push(s),s+=u.length+1;let c=a[n]??0,l=i>=o.length?e.length:a[i]??e.length;return{start:c,end:l}}function Fd(e,t,o){let r=`${_d(t,o)}
`,n=ni(e,t);if(n){let i=e.slice(0,n.start),a=e.slice(n.end);return`${i}${r}${a.replace(/^\n+/,"")}`}return e.trim()?`${e.replace(/\s*$/,"")}

${r}`:r}function ri(e,t,o){let r=ni(e,t);if(!r)return!1;let n=e.slice(r.start,r.end);return n.includes(`command = "${Xt(o)}"`)&&/args\s*=\s*\[\s*"mcp"\s*\]/.test(n)&&/enabled\s*=\s*true/.test(n)}function Zt(e={}){let t=e.configFile??Fe(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=oi(t);if(ri(n,r,o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};let i=Fd(n,r,o);Td(t,i);let a=oi(t);if(!ri(a,r,o))throw new Error("Grok Build MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}function ii(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.skill?.changed)}function si(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:_({project:e.projectRoot}),n=z({agent:"grok",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Grok project integration scope cannot be resolved.");let i,a;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(i={},n.surfaces.mcp.global.install&&(i.mcp=Zt({binary:t,configFile:e.configFile??Fe()})),n.surfaces.hooks.global.install&&(i.hooks=Qt({binary:t,hooksFile:e.hooksFile??$e()})),n.surfaces.work.global.install&&(i.skill=zt({skillFile:e.skillFile??De()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Grok project integration requires an eligible project root.");a={},n.surfaces.mcp.project.install&&(a.mcp=Zt({binary:t,configFile:e.projectConfigFile??Sr(r.root)})),n.surfaces.hooks.project.install&&(a.hooks=Qt({binary:t,hooksFile:e.projectHooksFile??Ir(r.root)})),n.surfaces.work.project.install&&(a.skill=zt({skillFile:e.projectSkillFile??vr(r.root)}))}let s=a?.mcp??i?.mcp,c=a?.hooks??i?.hooks,l=a?.skill??i?.skill;if(!s||!c||!l)throw new Error("Grok integration did not produce effective MCP/hooks/skill.");let u=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.skill?.skillFile,a?.mcp?.configFile,a?.hooks?.hooksFile,a?.skill?.skillFile].filter(p=>typeof p=="string")));return{installed:!0,changed:ii(i)||ii(a),scope:o,plan:n,project:r,global:i,projectScope:a,mcp:s,hooks:c,skill:l,files:u}}import{existsSync as ai,mkdirSync as $d,readFileSync as ci,renameSync as Dd,rmSync as Hd,writeFileSync as Jd}from"node:fs";import{dirname as Ld}from"node:path";function Ye(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Kd(e){return`'${e.replace(/'/g,"'\\''")}'`}function Gd(e){if(!ai(e))return{};let t=ci(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Gemini settings.json at ${e}: parse error. Not overwriting.`)}if(!Ye(o))throw new Error(`Invalid existing Gemini settings.json at ${e}: root must be an object.`);return o}function Vd(e,t){$d(Ld(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Jd(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Dd(o,e)}finally{Hd(o,{force:!0})}}function Bd(e){return Ye(e)?(typeof e.command=="string"?e.command:"").includes("session:gemini-hook"):!1}function li(e={}){let t=e.settingsFile??Pt(),o=Gd(t),r=e.binary??"toolnet-memory",n=`${Kd(r)} session:gemini-hook`,i=Ye(o.hooks)?{...o.hooks}:{},a=["SessionStart","SessionEnd"];for(let l of a){let p=(Array.isArray(i[l])?[...i[l]]:[]).map(d=>{if(!Ye(d)||!Array.isArray(d.hooks))return d;let m=d.hooks.filter(S=>!Bd(S));return m.length>0?{...d,hooks:m}:void 0}).filter(d=>d!==void 0);p.push({hooks:[{name:"toolnet-memory",type:"command",command:n,timeout:l==="SessionEnd"?1e4:3e4}]}),i[l]=p}o.hooks=i;let s=`${JSON.stringify(o,null,2)}
`,c=!ai(t)||ci(t,"utf8")!==s;return Vd(t,o),{settingsFile:t,changed:c,events:[...a]}}import{existsSync as di,mkdirSync as Wd,readFileSync as pi,renameSync as zd,rmSync as Qd,writeFileSync as Xd}from"node:fs";import{dirname as Zd}from"node:path";import{spawnSync as ui}from"node:child_process";var Ud=new Set(["1468.30"]);function qd(e){return e.match(/Junie version:\s*([0-9A-Za-z._+-]+)/)?.[1]??null}function Yd(){if(!(ui("sh",["-lc","command -v junie >/dev/null 2>&1"],{stdio:"ignore",timeout:5e3}).status===0))return{detected:!1,version:null};let t=ui("junie",["--version"],{stdio:["ignore","pipe","ignore"],encoding:"utf8",timeout:5e3});return t.status!==0?{detected:!0,version:null}:{detected:!0,version:qd(t.stdout)}}function We(e,t,o,r){return{detected:e,version:t,hooksAvailable:!1,hooksStability:r,automaticCaptureSupported:!1,captureMode:"blocked-capability",fallbackMode:"blocked-capability",manualRecoveryAvailable:!1,capabilityReason:o,gaClass:"BLOCKED",refreshMode:"blocked",sessionIdModel:e?"deterministic":"unknown",projectModel:e?"cwd-based":"unknown",resumeModel:e?"flag-based":"unknown",sessionStorage:e?"sessions-directory-unverified":"unknown"}}function ze(e={}){let t=e.probe??Yd,{detected:o,version:r}=t();return o?r?Ud.has(r)?We(!0,r,`lifecycle-hooks-unavailable-on-stable-build-${r}`,"stable"):e.hookEvidence==="verified-eap-hooks"?{detected:!0,version:r,hooksAvailable:!0,hooksStability:"eap",automaticCaptureSupported:!0,captureMode:"hook",fallbackMode:"blocked-capability",manualRecoveryAvailable:!1,capabilityReason:"verified-eap-hook-capability",gaClass:"AUTO_NATIVE",refreshMode:"native-lifecycle",sessionIdModel:"deterministic",projectModel:"cwd-based",resumeModel:"flag-based",sessionStorage:"sessions-directory-unverified"}:We(!0,r,"unverified-eap-hook-support","unverified"):We(!0,null,"junie-version-unparseable","unknown"):We(!1,null,"junie-binary-not-found","unknown")}function Qe(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function eo(e){return`'${e.replace(/'/g,"'\\''")}'`}function ep(e){if(!di(e))return{};let t=pi(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Junie config.json at ${e}: parse error. Not overwriting.`)}if(!Qe(o))throw new Error(`Invalid existing Junie config.json at ${e}: root must be an object.`);return o}function tp(e,t){Wd(Zd(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Xd(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),zd(o,e)}finally{Qd(o,{force:!0})}}function mi(e={}){let t=e.configFile??Tt(),o=e.capability??ze();if(!o.hooksAvailable||!o.automaticCaptureSupported)return{configFile:t,changed:!1,events:[],installed:!1,fallbackAvailable:!1,reason:o.capabilityReason};let r=ep(t),n=e.binary??"toolnet-memory",i=e.projectRoot??process.cwd(),a=`${eo(n)} session:junie-hook --project ${eo(i)}`,s=Qe(r.hooks)?{...r.hooks}:{},c=[{name:"SessionStart",timeout:10},{name:"Stop",timeout:30},{name:"SessionEnd",timeout:8}],l=d=>!Qe(d)||typeof d.command!="string"||!d.command.includes("session:junie-hook")?!1:d.command.includes(eo(i))||!d.command.includes("--project");for(let d of c){let S=(Array.isArray(s[d.name])?[...s[d.name]]:[]).map(y=>{if(!Qe(y)||!Array.isArray(y.hooks))return y;let J=y.hooks.filter($s=>!l($s));return J.length>0?{...y,hooks:J}:void 0}).filter(y=>y!==void 0);S.push({hooks:[{type:"command",command:a,timeout:d.timeout}]}),s[d.name]=S}r.hooks=s;let u=`${JSON.stringify(r,null,2)}
`,p=!di(t)||pi(t,"utf8")!==u;return tp(t,r),{configFile:t,changed:p,events:c.map(d=>d.name),installed:!0,fallbackAvailable:!1}}import{existsSync as XS,mkdirSync as op}from"node:fs";import{dirname as rp}from"node:path";function gi(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??Er({cwd:e.cwd});op(rp(o),{recursive:!0,mode:448});let r=O(o,"Codebuff"),n=r.mcpServers;if(n!==void 0&&!h(n))throw new Error("Invalid existing Codebuff .agents/mcp.json: mcpServers must be an object.");let i=h(n)?{...n}:{},a="toolnet-memory";return h(i[a])&&!e.force?{installed:!0,changed:!1,configFile:o,configured:!0}:(i[a]={command:t,args:["mcp"]},P(o,{...r,mcpServers:i}),{installed:!0,changed:!0,configFile:o,configured:!0})}function fi(e={}){let t=gi(e);return{installed:t.installed,changed:t.changed,mcp:t,files:[t.configFile]}}import{existsSync as sI,mkdirSync as np}from"node:fs";import{dirname as ip}from"node:path";function yi(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??Ar({cwd:e.cwd});np(ip(o),{recursive:!0,mode:448});let r=O(o,"Freebuff"),n=r.mcpServers;if(n!==void 0&&!h(n))throw new Error("Invalid existing Freebuff .agents/mcp.json: mcpServers must be an object.");let i=h(n)?{...n}:{},a="toolnet-memory";return h(i[a])&&!e.force?{installed:!0,changed:!1,configFile:o,configured:!0}:(i[a]={command:t,args:["mcp"]},P(o,{...r,mcpServers:i}),{installed:!0,changed:!0,configFile:o,configured:!0})}function hi(e={}){let t=yi(e);return{installed:t.installed,changed:t.changed,mcp:t,files:[t.configFile]}}import{existsSync as Ii,mkdirSync as hI,readFileSync as vi,renameSync as bI,rmSync as kI,writeFileSync as cp}from"node:fs";import{homedir as sp}from"node:os";import{join as bi}from"node:path";function ap(e="toolnet-memory",t={}){return bi(t.home??sp(),".agents","plugins",e)}function ki(e="toolnet-memory",t={}){return bi(ap(e,t),"hooks","hooks.json")}function Si(e){return`'${e.replace(/'/g,"'\\''")}'`}function lp(e){if(!Ii(e))return{};let t;try{t=JSON.parse(vi(e,"utf8"))}catch{throw new Error(`Invalid existing Goose hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Goose hooks.json at ${e}: root must be a JSON object.`);return t}function wi(e={}){let t=e.pluginName??"toolnet-memory",o=e.hooksFile??ki(t),r=lp(o),n=e.binary??"toolnet-memory",i=`${Si(n)} session:goose-hook`,a=`${Si(n)} session:goose-hook`,s={type:"command",command:i,timeout:30},c={type:"command",command:a,timeout:3},l=r.hooks&&typeof r.hooks=="object"&&!Array.isArray(r.hooks)?r.hooks:{};r.hooks=l;let p=(Array.isArray(l.Stop)?l.Stop:[]).filter(J=>{try{return!JSON.stringify(J).includes("session:goose-hook")}catch{return!0}}),m=(Array.isArray(l.SessionEnd)?l.SessionEnd:[]).filter(J=>{try{return!JSON.stringify(J).includes("session:goose-hook")}catch{return!0}});l.Stop=[...p,{hooks:[s]}],l.SessionEnd=[...m,{hooks:[c]}];let S=JSON.stringify(r,null,2)+`
`,y=!Ii(o)||vi(o,"utf8")!==S;return cp(o,S,{encoding:"utf8",mode:384}),{hooksFile:o,changed:y,stopInstalled:!0,sessionEndInstalled:!0}}function Ci(e={}){let t=wi(e);return{hooksFile:t.hooksFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as Ri,mkdirSync as dp,readFileSync as Ei,renameSync as pp,rmSync as mp,writeFileSync as gp}from"node:fs";import{dirname as fp}from"node:path";import{homedir as up}from"node:os";import{join as ji}from"node:path";function xi(e={}){let t=e.projectRoot;return t?ji(t,".qwen","hooks.json"):ji(e.home??up(),".qwen","hooks.json")}function Oi(e){return`'${e.replace(/'/g,"'\\''")}'`}function yp(e){if(!Ri(e))return{};let t;try{t=JSON.parse(Ei(e,"utf8"))}catch{throw new Error(`Invalid existing Qwen hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Qwen hooks.json at ${e}: root must be a JSON object.`);return t}function hp(e,t){dp(fp(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{gp(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),pp(o,e)}finally{mp(o,{force:!0})}}function Pi(e={}){let t=e.hooksFile??xi({projectRoot:e.projectRoot}),o=yp(t),r=e.binary??"toolnet-memory",n=`${Oi(r)} session:qwen-hook`,i=`${Oi(r)} session:qwen-hook`,a={type:"command",command:n,timeout:30},s={type:"command",command:i,timeout:3},c=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=c;let u=(Array.isArray(c.Stop)?c.Stop:[]).filter(y=>{try{return!JSON.stringify(y).includes("session:qwen-hook")}catch{return!0}}),d=(Array.isArray(c.SessionEnd)?c.SessionEnd:[]).filter(y=>{try{return!JSON.stringify(y).includes("session:qwen-hook")}catch{return!0}});c.Stop=[...u,{hooks:[a]}],c.SessionEnd=[...d,{hooks:[s]}];let m=JSON.stringify(o,null,2)+`
`,S=!Ri(t)||Ei(t,"utf8")!==m;return hp(t,o),{hooksFile:t,changed:S,stopInstalled:!0,sessionEndInstalled:!0}}function Ti(e={}){let t=Pi(e);return{hooksFile:t.hooksFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as Ni,mkdirSync as Sp,readFileSync as Ip,renameSync as vp,rmSync as wp,writeFileSync as Cp}from"node:fs";import{dirname as jp}from"node:path";import{homedir as bp}from"node:os";import{join as kp}from"node:path";function Ai(e={}){return kp(e.home??bp(),".kimi-code","config.toml")}function _i(e){return`'${e.replace(/'/g,"'\\''")}'`}function xp(e){return Ni(e)?Ip(e,"utf8"):""}function Mi(e,t){Sp(jp(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Cp(o,t,{encoding:"utf8",mode:384}),vp(o,e)}finally{wp(o,{force:!0})}}function Fi(e={}){let t=e.configFile??Ai(),o=xp(t),r=e.binary??"toolnet-memory",n=`${_i(r)} session:kimi-hook`,i=`${_i(r)} session:kimi-hook`,a=`[[hooks]]
name = "toolnet-memory-stop"
event = "Stop"
command = ${n}
timeout = 30
`,s=`[[hooks]]
name = "toolnet-memory-session-end"
event = "SessionEnd"
command = ${i}
timeout = 3
`,c=!1;return o.includes("toolnet-memory-stop")||(o=o.trim()+`

`+a+`
`,c=!0),o.includes("toolnet-memory-session-end")||(o=o.trim()+`

`+s+`
`,c=!0),c?Mi(t,o):Ni(t)||(Mi(t,a+`
`+s+`
`),c=!0),{configFile:t,changed:c,stopInstalled:!0,sessionEndInstalled:!0}}function $i(e={}){let t=Fi(e);return{configFile:t.configFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as Hi,mkdirSync as Ep,readFileSync as Pp,renameSync as Tp,rmSync as Ap,writeFileSync as _p}from"node:fs";import{dirname as Mp}from"node:path";import{homedir as Op}from"node:os";import{join as Rp}from"node:path";function Di(e={}){return Rp(e.home??Op(),".hermes","config.yaml")}function Np(e){return`'${e.replace(/'/g,"'\\''")}'`}function Fp(e){return Hi(e)?Pp(e,"utf8"):""}function $p(e,t){Ep(Mp(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{_p(o,t,{encoding:"utf8",mode:384}),Tp(o,e)}finally{Ap(o,{force:!0})}}function Ji(e={}){let t=e.configFile??Di(),o=Fp(t),r=e.binary??"toolnet-memory",i=`  - name: toolnet-memory-session-end
    event: on_session_end
    command: ${`${Np(r)} session:hermes-hook`}
    timeout: 30
`,a=!1;return o.includes("toolnet-memory-session-end")||(o.includes("hooks:")?o=o.replace(/hooks:\n/,`hooks:
${i}`):o=o.trim()+`

hooks:
`+i,a=!0),(a||!Hi(t))&&(o.endsWith(`
`)||(o+=`
`),$p(t,o)),{configFile:t,changed:a,sessionEndInstalled:!0}}function Li(e={}){let t=Ji(e);return{configFile:t.configFile,changed:t.changed,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as Vi,mkdirSync as Jp,readFileSync as Bi,renameSync as Lp,rmSync as Kp,writeFileSync as Gp}from"node:fs";import{dirname as Vp}from"node:path";import{existsSync as Dp}from"node:fs";import{homedir as Hp}from"node:os";import{join as to}from"node:path";function Ki(e={}){let t=e.home??Hp();return Dp(to(t,".qoder-cn"))?to(t,".qoder-cn","settings.json"):to(t,".qoder","settings.json")}function Gi(e){return`'${e.replace(/'/g,"'\\''")}'`}function Bp(e){if(!Vi(e))return{};let t;try{t=JSON.parse(Bi(e,"utf8"))}catch{throw new Error(`Invalid existing Qoder settings.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Qoder settings.json at ${e}: root must be a JSON object.`);return t}function Up(e,t){Jp(Vp(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Gp(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Lp(o,e)}finally{Kp(o,{force:!0})}}function Ui(e={}){let t=e.settingsFile??Ki(),o=Bp(t),r=e.binary??"toolnet-memory",n=`${Gi(r)} session:qoder-hook`,i=`${Gi(r)} session:qoder-hook`,a={type:"command",command:n,timeout:30},s={type:"command",command:i,timeout:3},c=Array.isArray(o.hooks)?[...o.hooks]:[],u=c.filter(m=>{try{return!JSON.stringify(m).includes("session:qoder-hook")}catch{return!0}}).filter(m=>{try{return!JSON.stringify(m).includes("session:qoder-hook")}catch{return!0}});c.length=0,c.push({...a,event:"Stop"},{...s,event:"SessionEnd"}),o.hooks=c;let p=JSON.stringify(o,null,2)+`
`,d=!Vi(t)||Bi(t,"utf8")!==p;return Up(t,o),{settingsFile:t,changed:d,stopInstalled:!0,sessionEndInstalled:!0}}function qi(e={}){let t=Ui(e);return{settingsFile:t.settingsFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as qp,mkdirSync as Yi,readFileSync as Yp,renameSync as Wp,rmSync as zp,writeFileSync as Qp}from"node:fs";import{dirname as Xp,join as Xe}from"node:path";import{homedir as Zp}from"node:os";function em(e,t){Yi(Xp(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Qp(o,t,{encoding:"utf8",mode:493}),Wp(o,e)}finally{zp(o,{force:!0})}}var oo=`#!/usr/bin/env node
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
`;function Wi(e={}){let t=e.cwd?Xe(e.cwd,".toolnet","bin"):Xe(process.env.TOOLNET_HOME??Xe(Zp(),".toolnet"),"bin");Yi(t,{recursive:!0,mode:448});let o=Xe(t,"aider-wrapper"),r=oo.endsWith(`
`)?oo:oo+`
`,n=!qp(o)||Yp(o,"utf8")!==r;return em(o,r),{launcherPath:o,changed:n}}import{existsSync as zi,mkdirSync as tm,readFileSync as Qi,renameSync as om,rmSync as rm,writeFileSync as nm}from"node:fs";import{dirname as im,join as Xi}from"node:path";import{homedir as sm}from"node:os";function am(){return process.env.PLANDEX_BASE_DIR??Xi(sm(),"plandex-server")}function cm(e){if(!zi(e))return{};let t;try{t=JSON.parse(Qi(e,"utf8"))}catch{throw new Error(`Invalid existing Plandex config at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Plandex config at ${e}: root must be a JSON object.`);return t}function lm(e,t){tm(im(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{nm(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),om(o,e)}finally{rm(o,{force:!0})}}function Zi(e={}){let t=am(),o=Xi(t,"toolnet-memory.json"),r=cm(o),n=r.toolnetMemory??{};n.integration="toolnet-memory",n.captureMode="manual-recovery",n.managedBy="toolnet-memory",r.toolnetMemory=n;let i=JSON.stringify(r,null,2)+`
`,a=!zi(o)||Qi(o,"utf8")!==i;return lm(o,r),{configPath:o,changed:a}}import{existsSync as es,mkdirSync as ts,readFileSync as os,renameSync as um,rmSync as dm,writeFileSync as pm}from"node:fs";import{dirname as rs,join as mm}from"node:path";import{homedir as gm}from"node:os";function fm(e){if(!es(e))return{};let t;try{t=JSON.parse(os(e,"utf8"))}catch{throw new Error(`Invalid existing OpenRouter config at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing OpenRouter config at ${e}: root must be a JSON object.`);return t}function ym(e,t){ts(rs(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{pm(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),um(o,e)}finally{dm(o,{force:!0})}}function ns(e={}){let t=gm(),o=mm(t,".config","openrouter","toolnet-memory.json");ts(rs(o),{recursive:!0,mode:448});let r=fm(o);r.toolnetMemory={integration:"toolnet-memory",captureMode:"blocked-product-identity",managedBy:"toolnet-memory",blocked:!0,reason:"OpenRouter CLI product identity is blocked for ToolNet integration."};let n=JSON.stringify(r,null,2)+`
`,i=!es(o)||os(o,"utf8")!==n;return ym(o,r),{configPath:o,blocked:!0,changed:i}}import{existsSync as ls,mkdirSync as bm,readFileSync as us,renameSync as km,rmSync as Sm,writeFileSync as Im}from"node:fs";import{dirname as vm}from"node:path";import{homedir as hm}from"node:os";import{join as is}from"node:path";function ss(e={}){return is(e.home??hm(),".bob","settings","settings.json")}function as(e){return is(e,".bob","settings.json")}function wm(e){if(!ls(e))return{};let t;try{t=JSON.parse(us(e,"utf8"))}catch{throw new Error(`Invalid existing Bob settings.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Bob settings.json at ${e}: root must be a JSON object.`);return t}function Cm(e,t){bm(vm(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Im(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),km(o,e)}finally{Sm(o,{force:!0})}}function cs(e){return`'${e.replace(/'/g,"'\\''")}'`}function ds(e={}){let t=e.projectRoot!==void 0?as(e.projectRoot):ss({home:e.home}),o=wm(t),r=e.binary??"toolnet-memory",n=`${cs(r)} hook ibm-bob`,i=`${cs(r)} hook ibm-bob`,a={type:"command",command:n,timeout:10},s={type:"command",command:i,timeout:10},c=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=c;let u=(Array.isArray(c.Stop)?c.Stop:[]).filter(y=>{try{return!JSON.stringify(y).includes("hook ibm-bob")}catch{return!0}}),d=(Array.isArray(c.SessionStart)?c.SessionStart:[]).filter(y=>{try{return!JSON.stringify(y).includes("hook ibm-bob")}catch{return!0}});c.Stop=[...u,{hooks:[a]}],c.SessionStart=[...d,{hooks:[s]}];let m=JSON.stringify(o,null,2)+`
`,S=!ls(t)||us(t,"utf8")!==m;return Cm(t,o),{settingsFile:t,changed:S,stopInstalled:!0,sessionStartInstalled:!0}}function ps(e={}){let t=ds(e);return{settingsFile:t.settingsFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionStartInstalled:t.sessionStartInstalled}}import{existsSync as ro,mkdirSync as fs,readFileSync as no,renameSync as xm,rmSync as Om,writeFileSync as Rm}from"node:fs";import{dirname as Em,join as io}from"node:path";import{homedir as jm}from"node:os";import{join as ms}from"node:path";function gs(e){return e?ms(e,".cline","hooks"):ms(jm(),"Documents","Cline","Hooks")}function Pm(e){return`'${e.replace(/'/g,"'\\''")}'`}function so(e,t){fs(Em(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Rm(o,t,{encoding:"utf8",mode:493}),xm(o,e)}finally{Om(o,{force:!0})}}function Tm(e){return`#!/bin/sh
exec ${`${Pm(e)} hook cline`}
`}function ys(e={}){let t=e.binary??"toolnet-memory",o=gs(e.projectRoot),r=io(o,"toolnet-memory.sh");fs(o,{recursive:!0,mode:448});let n=Tm(t),i=!ro(r)||no(r,"utf8")!==n;so(r,n);let a=io(o,"TaskComplete"),s=io(o,"TaskStart"),c=!1,l=!1;return(!ro(a)||no(a,"utf8")!==n)&&(so(a,n),c=!0),(!ro(s)||no(s,"utf8")!==n)&&(so(s,n),l=!0),{hooksDir:o,hooksFile:r,changed:i||c||l,taskCompleteInstalled:c,taskStartInstalled:l}}function hs(e={}){let t=ys(e);return{hooksFile:t.hooksFile,hooksDir:t.hooksDir,changed:t.changed,taskCompleteInstalled:t.taskCompleteInstalled,taskStartInstalled:t.taskStartInstalled}}import{existsSync as Ss,mkdirSync as Is,readFileSync as Mm,renameSync as Nm,rmSync as Fm,writeFileSync as $m}from"node:fs";import{dirname as vs}from"node:path";import{homedir as Am}from"node:os";import{join as _m}from"node:path";function bs(){return _m(Am(),".rovodev","config.yml")}function ws(e){return`'${e.replace(/'/g,"'\\''")}'`}function ks(e,t){Is(vs(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{$m(o,t,{encoding:"utf8",mode:384}),Nm(o,e)}finally{Fm(o,{force:!0})}}function Dm(e){return Ss(e)?Mm(e,"utf8"):""}function Hm(e){let t=`  - type: command
    command: ${ws("toolnet-memory hook rovo")}
    timeout: 10
`;if(e.includes("hooks:")){if(e.includes("toolnet-memory hook rovo"))return e;let o=e.split(`
`),n=o.length-1;for(let i=o.length-1;i>=0&&o[i].trim()==="";i--)n=i;return o.splice(n,0,t),o.join(`
`)}return e+`
hooks:
${t}`}function Cs(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??bs();if(Is(vs(o),{recursive:!0,mode:448}),!Ss(o)){let a=`hooks:
  - type: command
    command: ${ws(`${t} hook rovo`)}
    timeout: 10
`;return ks(o,a),{configFile:o,changed:!0,hookInstalled:!0}}let r=Dm(o),n=Hm(r),i=r!==n;return i&&ks(o,n),{configFile:o,changed:i,hookInstalled:i}}function js(e={}){let t=Cs(e);return{configFile:t.configFile,changed:t.changed,hookInstalled:t.hookInstalled}}import{existsSync as Os,mkdirSync as Es,readFileSync as Rs,renameSync as Km,rmSync as Gm,writeFileSync as Vm}from"node:fs";import{dirname as Ps,join as Bm}from"node:path";import{homedir as Jm}from"node:os";import{join as Lm}from"node:path";function xs(){return[Lm(Jm(),".warp")]}function Um(e,t){Es(Ps(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Vm(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Km(o,e)}finally{Gm(o,{force:!0})}}function Ts(e={}){let t=xs(),o=Bm(t[0],"toolnet-memory.json");Es(Ps(o),{recursive:!0,mode:448});let r=Os(o)?JSON.parse(Rs(o,"utf8")):{};r.toolnetMemory={integration:"toolnet-memory",captureMode:"blocked-capability",managedBy:"toolnet-memory",blocked:!0,reason:"Warp Agent CLI capability is blocked for ToolNet integration."};let n=JSON.stringify(r,null,2)+`
`,i=!Os(o)||Rs(o,"utf8")!==n;return Um(o,r),{configFile:o,blocked:!0,changed:i}}function As(e={}){if(e.scope==="global")return{scope:"global",automatic:!1,reason:"explicit-global"};if(e.scope==="project"||e.scope==="both"){let o=_({cwd:e.cwd,project:e.projectRoot});if(!o.eligible)throw new Error(`Explicit ${e.scope} integration requires an explicit project, ToolNet project, or Git repository root.`);return{scope:e.scope,automatic:!1,project:o,reason:e.scope==="project"?"explicit-project":"explicit-both"}}let t=_({cwd:e.cwd,project:e.projectRoot});return t.toolnetProject?{scope:"both",automatic:!0,project:t,reason:"toolnet-project"}:{scope:"global",automatic:!0,reason:"no-toolnet-project"}}function _s(){return Dr()}function ao(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[],r=e.detections??_s(),n=new Map(r.map(a=>[a.agent,a.detected])),i=As({scope:e.scope,projectRoot:e.projectRoot,cwd:e.cwd});if(!(e.force===!0||n.get("agy")===!0))o.push({agent:"agy",detected:!1,installed:!1,targets:[]});else try{let s=Br({binary:t});o.push({agent:"agy",detected:!0,installed:!0,targets:s.files})}catch(s){o.push({agent:"agy",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("gemini")===!0))o.push({agent:"gemini",detected:!1,installed:!1,targets:[]});else try{let s=li({...e.gemini,binary:t});o.push({agent:"gemini",detected:!0,installed:!0,targets:[s.settingsFile]})}catch(s){o.push({agent:"gemini",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("junie")===!0))o.push({agent:"junie",detected:!1,installed:!1,targets:[]});else{let s=e.junie?.capability??ze();if(!s.hooksAvailable||!s.automaticCaptureSupported)o.push({agent:"junie",detected:!0,installed:!1,targets:[],error:`Junie capture blocked: ${s.capabilityReason}. Capture mode: ${s.captureMode}`});else try{let c=e.junie?.projectRoot??i.project?.root??e.projectRoot??e.cwd??process.cwd(),l=mi({...e.junie?.configFile?{configFile:e.junie.configFile}:{},capability:s,binary:t,projectRoot:c});o.push({agent:"junie",detected:!0,installed:l.installed,targets:l.installed?[l.configFile]:[],...l.installed?{}:{error:l.reason}})}catch(c){o.push({agent:"junie",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}}if(!(e.force===!0||n.get("opencode")===!0))o.push({agent:"opencode",detected:!1,installed:!1,targets:[]});else try{let s=Qr({binary:t}),c=on({binary:t});o.push({agent:"opencode",detected:!0,installed:!0,targets:[...s,c.configFile,`mcp:${c.serverName}`]})}catch(s){o.push({agent:"opencode",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("claude")===!0))o.push({agent:"claude",detected:!1,installed:!1,targets:[]});else try{let s=wn({binary:t});o.push({agent:"claude",detected:!0,installed:!0,targets:[s.hooks.settingsFile,s.mcp.configFile,`mcp:${s.mcp.serverName}`]})}catch(s){o.push({agent:"claude",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("kiro")===!0))o.push({agent:"kiro",detected:!1,installed:!1,targets:[]});else try{let s=Tn({...e.kiro??{},binary:t});o.push({agent:"kiro",detected:!0,installed:!0,targets:[s.mcp.configFile,`mcp:${s.mcp.serverName}`,s.hooks.hooksFile]})}catch(s){o.push({agent:"kiro",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("cursor")===!0))o.push({agent:"cursor",detected:!1,installed:!1,targets:[]});else try{let s=e.cursor??{},c=qn({...s,binary:t,scope:s.scope??i.scope,projectRoot:s.projectRoot??i.project?.root});o.push({agent:"cursor",detected:!0,installed:!0,scope:c.scope,projectRoot:c.project?.root,targets:[...c.files,`mcp:${c.mcp.serverName}`]})}catch(s){o.push({agent:"cursor",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("copilot")===!0))o.push({agent:"copilot",detected:!1,installed:!1,targets:[]});else try{let s=e.copilot??{},c=Zn({...s,binary:t,scope:s.scope??i.scope,projectRoot:s.projectRoot??i.project?.root});o.push({agent:"copilot",detected:!0,installed:!0,scope:c.scope,projectRoot:c.project?.root,targets:[...c.files,`mcp:${c.mcp.serverName}`]})}catch(s){o.push({agent:"copilot",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("grok")===!0))o.push({agent:"grok",detected:!1,installed:!1,targets:[]});else try{let s=e.grok??{},c=si({...s,binary:t,scope:s.scope??i.scope,projectRoot:s.projectRoot??i.project?.root});o.push({agent:"grok",detected:!0,installed:!0,scope:c.scope,projectRoot:c.project?.root,targets:[...c.files,`mcp:${c.mcp.serverName}`]})}catch(s){o.push({agent:"grok",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("toolnet-cli")===!0))o.push({agent:"toolnet-cli",detected:!1,installed:!1,targets:[]});else try{let s=e.toolnetCli??{},c=_n({...s,binary:t});o.push({agent:"toolnet-cli",detected:!0,installed:!0,targets:[c.mcp.configFile]})}catch(s){o.push({agent:"toolnet-cli",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("kilo")===!0))o.push({agent:"kilo",detected:!1,installed:!1,targets:[]});else try{let s=e.kilo??{},c=Nn({...s,binary:t});o.push({agent:"kilo",detected:!0,installed:!0,targets:[c.mcp.configFile]})}catch(s){o.push({agent:"kilo",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("codebuff")===!0))o.push({agent:"codebuff",detected:!1,installed:!1,targets:[]});else try{let s=fi({...e.codebuff,binary:t,...e.codebuff?.cwd||e.cwd?{cwd:e.codebuff?.cwd??e.cwd}:{}});o.push({agent:"codebuff",detected:!0,installed:!0,targets:[s.mcp.configFile]})}catch(s){o.push({agent:"codebuff",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("freebuff")===!0))o.push({agent:"freebuff",detected:!1,installed:!1,targets:[]});else try{let s=hi({...e.freebuff,binary:t,...e.freebuff?.cwd||e.cwd?{cwd:e.freebuff?.cwd??e.cwd}:{}});o.push({agent:"freebuff",detected:!0,installed:!0,targets:[s.mcp.configFile]})}catch(s){o.push({agent:"freebuff",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}{let a=e.force===!0||n.get("continue")===!0;o.push({agent:"continue",detected:a,installed:a,targets:a?[Mr()]:[]})}if(!(e.force===!0||n.get("codex")===!0))o.push({agent:"codex",detected:!1,installed:!1,targets:[]});else try{let s=cn({binary:t}),c=un({binary:t}),l=fn({binary:t}),u=bn({binary:t});if(!u.installed)throw new Error(u.error??"Codex MCP registration failed");let p=[s.configFile,c,l.hooksFile,`mcp:${u.serverName}`];s.preservedPrevious&&p.push(s.previousFile),o.push({agent:"codex",detected:!0,installed:!0,targets:p})}catch(s){o.push({agent:"codex",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("goose")===!0))o.push({agent:"goose",detected:!1,installed:!1,targets:[]});else try{let s=e.goose??{},c=Ci({...s,binary:t});o.push({agent:"goose",detected:!0,installed:!0,targets:[c.hooksFile]})}catch(s){o.push({agent:"goose",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("qwen")===!0))o.push({agent:"qwen",detected:!1,installed:!1,targets:[]});else try{let s=e.qwen??{},c=Ti({...s,binary:t});o.push({agent:"qwen",detected:!0,installed:!0,targets:[c.hooksFile]})}catch(s){o.push({agent:"qwen",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("kimi")===!0))o.push({agent:"kimi",detected:!1,installed:!1,targets:[]});else try{let s=e.kimi??{},c=$i({...s,binary:t});o.push({agent:"kimi",detected:!0,installed:!0,targets:[c.configFile]})}catch(s){o.push({agent:"kimi",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("hermes")===!0))o.push({agent:"hermes",detected:!1,installed:!1,targets:[]});else try{let s=e.hermes??{},c=Li({...s,binary:t});o.push({agent:"hermes",detected:!0,installed:!0,targets:[c.configFile]})}catch(s){o.push({agent:"hermes",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("qoder")===!0))o.push({agent:"qoder",detected:!1,installed:!1,targets:[]});else try{let s=e.qoder??{},c=qi({...s,binary:t});o.push({agent:"qoder",detected:!0,installed:!0,targets:[c.settingsFile]})}catch(s){o.push({agent:"qoder",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("aider")===!0))o.push({agent:"aider",detected:!1,installed:!1,targets:[]});else try{let s=e.aider??{},c=Wi({...s,binary:t});o.push({agent:"aider",detected:!0,installed:!0,targets:[c.launcherPath]})}catch(s){o.push({agent:"aider",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("plandex")===!0))o.push({agent:"plandex",detected:!1,installed:!1,targets:[]});else try{let s=e.plandex??{},c=Zi({...s,binary:t});o.push({agent:"plandex",detected:!0,installed:!0,targets:[c.configPath]})}catch(s){o.push({agent:"plandex",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("openrouter")===!0))o.push({agent:"openrouter",detected:!1,installed:!1,targets:[]});else try{let s=e.openrouter??{},c=ns({...s,binary:t});o.push({agent:"openrouter",detected:!0,installed:!0,targets:[c.configPath]})}catch(s){o.push({agent:"openrouter",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("bob")===!0))o.push({agent:"bob",detected:!1,installed:!1,targets:[]});else try{let s=e.bob??{},c=ps({...s,binary:t});o.push({agent:"bob",detected:!0,installed:!0,targets:[c.settingsFile]})}catch(s){o.push({agent:"bob",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("cline")===!0))o.push({agent:"cline",detected:!1,installed:!1,targets:[]});else try{let s=e.cline??{},c=hs({...s,binary:t});o.push({agent:"cline",detected:!0,installed:!0,targets:[c.hooksFile]})}catch(s){o.push({agent:"cline",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("rovo")===!0))o.push({agent:"rovo",detected:!1,installed:!1,targets:[]});else try{let s=e.rovo??{},c=js({...s,binary:t});o.push({agent:"rovo",detected:!0,installed:!0,targets:[c.configFile]})}catch(s){o.push({agent:"rovo",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("warp")===!0))o.push({agent:"warp",detected:!1,installed:!1,targets:[]});else try{let s=e.warp??{},c=Ts({...s,binary:t});o.push({agent:"warp",detected:!0,installed:!0,targets:[c.configFile]})}catch(s){o.push({agent:"warp",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}return o}function Ze(e){switch(e){case"agy":return"Agy / Antigravity";case"opencode":return"OpenCode";case"claude":return"Claude Code";case"kiro":return"Kiro CLI";case"cursor":return"Cursor CLI";case"copilot":return"GitHub Copilot CLI";case"grok":return"Grok Build";case"toolnet-cli":return"ToolNet CLI";case"kilo":return"Kilo";case"codex":return"Codex";case"goose":return"goose";case"qwen":return"Qwen Code";case"kimi":return"Kimi Code CLI";case"hermes":return"Hermes Agent";case"qoder":return"Qoder CLI";case"aider":return"Aider";case"plandex":return"Plandex";case"openrouter":return"OpenRouter CLI";case"bob":return"IBM Bob Shell";case"cline":return"Cline CLI";case"rovo":return"Rovo Dev CLI";case"warp":return"Warp Agent CLI";case"gemini":return"Gemini CLI";case"junie":return"Junie";case"codebuff":return"Codebuff";case"freebuff":return"Freebuff";case"continue":return"Continue";default:return e}}function qm(e){console.log(""),console.log("ToolNet Memory Integration Detection"),console.log("===================================="),console.log("");for(let t of e){let o=Ze(t.agent);if(!t.detected){console.log(`\u25CB ${o}: not detected`);continue}console.log(`\u2713 ${o}: detected`);for(let r of t.evidence)console.log(`  ${r}`)}console.log("")}var Ym=["claude","cursor","copilot","grok","kiro","opencode","codex","agy"],Wm={opencode:"toolnet-memory session:opencode-sync",codex:"toolnet-memory session:codex-sync",agy:"toolnet-memory session:agy-sync","toolnet-cli":"toolnet-memory session:toolnet-cli-sync"};function zm(e){if(Ym.includes(e))return"ToolNet integration configured; hooks installed successfully";let t=Wm[e];return t?`ToolNet integration configured; run ${t} to capture session history`:"ToolNet integration configured; capture begins when a supported hook or sync runs"}function Qm(e){console.log(""),console.log("ToolNet Memory AI Integrations"),console.log("=============================="),console.log("");for(let t of e){let o=Ze(t.agent);if(!t.detected){console.log(`- ${o}: not detected`);continue}if(t.installed){let r=t.scope?` [scope=${t.scope}]`:"";console.log(`\u2713 ${o}: ${zm(t.agent)}${r}`),t.projectRoot&&console.log(`  project: ${t.projectRoot}`);continue}console.log(`\u2717 ${o}: integration failed`),t.error&&console.log(`  ${t.error}`)}console.log("")}function Xm(e,t){let o=e.indexOf(t);return o>=0?e[o+1]:void 0}function Zm(e){return e.includes("--scope")||e.includes("--global")||e.includes("--both")?Bn(e):void 0}async function eg(){let e=process.argv.slice(2),t=e.includes("--all"),o=e.includes("--json"),r=e.includes("--detect-only"),n=Zm(e),i=Xm(e,"--project");if(r){let s=_s();if(o){console.log(JSON.stringify(s,null,2));return}qm(s);return}let a=ao({force:t,scope:n,projectRoot:i});if(o){console.log(JSON.stringify(a,null,2));return}Qm(a)}var tg=process.argv[1]&&(process.argv[1].endsWith("auto-integrate.js")||process.argv[1].endsWith("auto-integrate.ts"));tg&&eg().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});function Fs(e){let t=rg(e);if(!co(t))throw new Error(`Project path does not exist: ${t}`);if(!og(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);return t}function Ww(e=process.cwd()){let t=Fs(e),o=new G().detect(t),r=Ns(o.rootPath,".toolnet","project.json");if(!co(r))throw new Error(`ToolNet project initialization failed: ${r} was not created`);return{initialized:!0,project:{id:o.id,name:o.name,remote:o.remote,rootPath:o.rootPath},manifestFile:r}}async function ng(e=process.cwd(),t={}){let o=Fs(e),r={skipRemoteIdentity:t.skipRemoteIdentity,adoptRemote:t.adoptRemote,allowGitRebind:t.allowGitRebind},n=await Wo(o,r),i=n.project,a=Ns(i.rootPath,".toolnet","project.json");if(!co(a))throw new Error(`ToolNet project initialization failed: ${a} was not created`);return{initialized:!0,project:{id:i.id,name:i.name,remote:i.remote,rootPath:i.rootPath},manifestFile:a,identity:{source:n.source,registry:n.registry,registryProvider:n.registryProvider,gitRemote:n.gitIdentity?.canonicalRemote,fingerprint:n.gitIdentity?.fingerprint}}}function Ms(e,t){let o=e.indexOf(t);if(o<0)return;let r=e[o+1];if(!(!r||r.startsWith("-")))return r}async function ig(){let e=process.argv.slice(2),t=e.includes("--json"),o=!e.includes("--no-integrate"),r=e.includes("--no-remote-identity"),n=e.includes("--rebind-git-identity"),i=Ms(e,"--adopt-remote"),a=Ms(e,"--project"),s=new Set(["--project","--adopt-remote"]),c=e.find((d,m)=>{if(d.startsWith("-"))return!1;let S=e[m-1];return!(S&&s.has(S))}),l=a??c??process.cwd(),u=await at("Resolving ToolNet project identity",()=>ng(l,{skipRemoteIdentity:r,adoptRemote:i,allowGitRebind:n}),{enabled:!t}),p=[];if(o&&(p=await at("Detecting coding agents",()=>ao({projectRoot:u.project.rootPath}),{enabled:!t})),t){console.log(JSON.stringify({...u,integrations:p},null,2));return}if(console.log(""),console.log("ToolNet Memory"),console.log("=============="),console.log(""),console.log("\u2713 Project initialized"),console.log(""),console.log(`Project:  ${u.project.name}`),console.log(`ID:       ${u.project.id}`),console.log(`Remote:   ${u.project.remote??u.project.name}`),console.log(`Root:     ${u.project.rootPath}`),console.log(`Manifest: ${u.manifestFile}`),u.identity&&(console.log(`Identity: ${u.identity.source}`),console.log(`Registry: ${u.identity.registry}`),u.identity.gitRemote&&console.log(`Git:      ${u.identity.gitRemote}`)),console.log(""),o){console.log("AI integrations:");let d=p.filter(m=>m.detected&&m.installed);if(!d.length)console.log("  \u25CB No supported coding agent detected");else for(let m of d){let S=Ze(m.agent),y=jo(m.agent);console.log(`  \u2713 ${S} \u2014 ${y}`)}console.log("")}console.log("Next: toolnet-memory doctor"),console.log("")}var sg=process.argv[1]?.endsWith("/init.js")||process.argv[1]?.endsWith("/init.ts");sg&&ig().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});export{Ww as initializeToolNetProject,ng as initializeToolNetProjectCrossMachine};
