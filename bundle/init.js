import{existsSync as io,statSync as qg}from"node:fs";import{resolve as Ug,join as Rs}from"node:path";import{existsSync as Ps,readFileSync as Ts}from"node:fs";import{homedir as As}from"node:os";import{join as Ns}from"node:path";function _s(e){let t=e.trim();return t.length>=2&&t.startsWith('"')&&t.endsWith('"')?(t=t.slice(1,-1),t.replace(/\\n/g,`
`).replace(/\\r/g,"\r").replace(/\\t/g,"	").replace(/\\"/g,'"').replace(/\\\\/g,"\\")):t.length>=2&&t.startsWith("'")&&t.endsWith("'")?t.slice(1,-1):t}function Ms(){let e=process.env.TOOLNET_GLOBAL_ENV??Ns(As(),".config","toolnet-memory",".env");if(!Ps(e))return;let t=Ts(e,"utf8");for(let o of t.split(/\r?\n/)){let r=o.trim();if(!r||r.startsWith("#"))continue;r.startsWith("export ")&&(r=r.slice(7));let n=r.indexOf("=");if(n<=0)continue;let i=r.slice(0,n).trim();/^[A-Za-z_][A-Za-z0-9_]*$/.test(i)&&process.env[i]===void 0&&(process.env[i]=_s(r.slice(n+1)))}}Ms();function W(e,t){return e===void 0?t:["1","true","yes","on"].includes(e.toLowerCase())}function Q(e,t){if(!e)return t;let o=Number(e);return Number.isFinite(o)?o:t}function Xe(){return{memory:{autoCapture:W(process.env.MEMORY_AUTO_CAPTURE,!0),autoRetrieve:W(process.env.MEMORY_AUTO_RETRIEVE,!0),autoSummarize:W(process.env.MEMORY_AUTO_SUMMARIZE,!0),autoSync:W(process.env.MEMORY_AUTO_SYNC,!0)},retrieval:{maxCandidates:Q(process.env.MEMORY_MAX_CANDIDATES,50),rerankTop:Q(process.env.MEMORY_RERANK_TOP,10),finalContext:Q(process.env.MEMORY_FINAL_CONTEXT,5),tokenBudget:Q(process.env.MEMORY_TOKEN_BUDGET,2e3)},storage:{provider:process.env.MEMORY_STORAGE_PROVIDER??"huggingface",r2:{accountId:process.env.R2_ACCOUNT_ID,bucket:process.env.R2_BUCKET,accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY},s3:{endpoint:process.env.S3_ENDPOINT,region:process.env.S3_REGION,bucket:process.env.S3_BUCKET,accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY,forcePathStyle:W(process.env.S3_FORCE_PATH_STYLE,!1)},huggingface:{namespace:process.env.HF_NAMESPACE,bucket:process.env.HF_BUCKET,accessKeyId:process.env.HF_S3_ACCESS_KEY_ID,secretAccessKey:process.env.HF_S3_SECRET_ACCESS_KEY},localRoot:process.env.MEMORY_LOCAL_STORAGE_PATH},cache:{maxMb:Q(process.env.MEMORY_LOCAL_CACHE_MB,200)}}}import{createHash as Ks}from"node:crypto";import{existsSync as ke,mkdirSync as Gs,readFileSync as Vs,renameSync as Bs,writeFileSync as qs}from"node:fs";import{basename as Us,dirname as be,join as Z,parse as go,resolve as F}from"node:path";import{createHash as ao}from"node:crypto";import{spawnSync as Fs}from"node:child_process";var X="git-remote-v1",$s=new Set(["github.com","gitlab.com","bitbucket.org"]);function lo(e,t){let o=t.replaceAll("\\","/").replace(/^\/+/u,"").replace(/\/+$/u,"").replace(/\.git$/iu,"").replace(/\/+/gu,"/");return!o||o==="."||o===".."||o.split("/").some(r=>!r||r==="."||r==="..")?null:($s.has(e)&&(o=o.toLowerCase()),o)}function Ds(e){let t;try{t=new URL(e)}catch{return null}if(!["https:","http:","ssh:","git:"].includes(t.protocol))return null;let o=t.hostname.trim().toLowerCase();if(!o)return null;let r=t.protocol==="https:"&&t.port==="443"||t.protocol==="http:"&&t.port==="80"||t.protocol==="ssh:"&&t.port==="22",n=t.port&&!r?`${o}:${t.port}`:o,i=lo(o,t.pathname);return i?`${n}/${i}`:null}function Hs(e){let t=e.match(/^(?:[^@\s/:]+@)?([^:/\s]+):(.+)$/u);if(!t)return null;let o=t[1]?.trim().toLowerCase();if(!o||o.length===1)return null;let r=lo(o,t[2]??"");return r?`${o}/${r}`:null}function so(e){let t=e.trim();return t?t.includes("://")?Ds(t):Hs(t):null}function Js(e){return ao("sha256").update(`${X}:${e}`).digest("hex")}function uo(e){return ao("sha256").update(`toolnet-project:${X}:${e}`).digest("hex").slice(0,16)}function Ls(e){return e.split("/").filter(Boolean).at(-1)?.trim()||null}function Ze(e,t){let o=Fs("git",["-C",e,...t],{encoding:"utf8",windowsHide:!0,stdio:["ignore","pipe","ignore"]});return o.error||o.status!==0?null:o.stdout?.trim()||null}function co(e,t){let o=Ls(e);return o?{scheme:X,canonicalRemote:e,fingerprint:Js(e),repositoryName:o,source:t}:null}function fe(e){let t=Ze(e,["remote","get-url","origin"]);if(t){let n=so(t);if(n)return co(n,"origin")}let o=Ze(e,["remote"]);if(!o)return null;let r=new Set;for(let n of o.split(/\r?\n/u).map(i=>i.trim()).filter(Boolean)){let i=Ze(e,["remote","get-url",n]);if(!i)continue;let c=so(i);c&&r.add(c)}return r.size!==1?null:co([...r][0],"unique-remote")}var mo=".toolnet",Ys="project.json";function zs(e){return Ks("sha256").update(e).digest("hex").slice(0,16)}function J(e){return Z(e,mo,Ys)}function fo(e){return ke(J(e))}function po(e,t){let o=F(e),r=go(o).root;for(;;){if(fo(o))return o;if(o===r||t&&o===F(t))break;let n=be(o);if(n===o)break;o=n}return null}function et(e){let t=F(e),o=go(t).root,r=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"];for(;;){if(r.some(i=>ke(Z(t,i))))return t;if(t===o)break;let n=be(t);if(n===t)break;t=n}return F(e)}function ye(e){let t;try{t=JSON.parse(Vs(e,"utf8"))}catch(n){throw new Error(`Invalid ToolNet project manifest: ${e}: ${n instanceof Error?n.message:String(n)}`)}if(!t||typeof t!="object")throw new Error(`Invalid ToolNet project manifest: ${e}`);let o=t;if(typeof o.id!="string"||!o.id.trim())throw new Error(`ToolNet project manifest is missing id: ${e}`);if(typeof o.name!="string"||!o.name.trim())throw new Error(`ToolNet project manifest is missing name: ${e}`);let r=new Date().toISOString();return{version:1,id:o.id,name:o.name,remote:typeof o.remote=="string"&&o.remote.trim()?o.remote:o.name,rootPath:typeof o.rootPath=="string"?o.rootPath:be(be(e)),createdAt:typeof o.createdAt=="string"?o.createdAt:r,updatedAt:typeof o.updatedAt=="string"?o.updatedAt:r,graphVersion:typeof o.graphVersion=="number"?o.graphVersion:0,memoryVersion:typeof o.memoryVersion=="number"?o.memoryVersion:0,metadata:o.metadata&&typeof o.metadata=="object"?o.metadata:void 0}}function he(e,t){let o=Z(e,mo);Gs(o,{recursive:!0});let r=J(e),n=`${r}.tmp-${process.pid}`;qs(n,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Bs(n,r)}function M(e,t){return{id:e.id,name:e.name,remote:e.remote,rootPath:t,createdAt:e.createdAt,updatedAt:e.updatedAt,graphVersion:e.graphVersion,memoryVersion:e.memoryVersion,metadata:e.metadata}}function tt(e){return{version:1,scheme:X,canonicalRemote:e.canonicalRemote,fingerprint:e.fingerprint,repositoryName:e.repositoryName}}function Ws(e){let t=e.metadata?.toolnetIdentity;if(!t||typeof t!="object"||Array.isArray(t))return null;let o=t;return typeof o.fingerprint=="string"?o.fingerprint:null}var L=class{adopt(t,o){let r=et(F(t));if(!o.id.trim())throw new Error("PROJECT_ADOPTION_INVALID_ID");if(!o.name.trim())throw new Error("PROJECT_ADOPTION_INVALID_NAME");if(!o.remote.trim())throw new Error("PROJECT_ADOPTION_INVALID_REMOTE");if(fo(r)){let s=ye(J(r));if(s.id!==o.id)throw new Error(["PROJECT_IDENTITY_ALREADY_EXISTS",`existing=${s.id}`,`requested=${o.id}`].join(" "));return M(s,r)}let n=new Date().toISOString(),i={...o.metadata};o.gitIdentity&&(i.toolnetIdentity=tt(o.gitIdentity));let c={version:1,id:o.id.trim(),name:o.name.trim(),remote:o.remote.trim(),rootPath:r,createdAt:o.createdAt??n,updatedAt:n,graphVersion:o.graphVersion??0,memoryVersion:o.memoryVersion??0,metadata:Object.keys(i).length?i:void 0};return he(r,c),M(c,r)}recordGitIdentity(t,o,r={}){let n=this.requireExisting(t),i=J(n.rootPath),c=ye(i),s=Ws(c);if(s&&s!==o.fingerprint&&!r.allowRebind)throw new Error(["PROJECT_GIT_REMOTE_CHANGED",`existing=${s}`,`current=${o.fingerprint}`,"Use explicit rebind only when this repository identity change is intentional."].join(" "));let a=c.metadata?.toolnetIdentity;return a&&typeof a=="object"&&!Array.isArray(a)&&a.fingerprint===o.fingerprint||(c.metadata={...c.metadata,toolnetIdentity:tt(o)},c.updatedAt=new Date().toISOString(),he(n.rootPath,c)),M(c,n.rootPath)}findExisting(t=process.cwd()){let o=F(t),r=et(o),i=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(a=>ke(Z(r,a))),c=po(o,i?r:void 0);if(!c)return null;let s=ye(J(c));return M(s,c)}requireExisting(t=process.cwd()){let o=this.findExisting(t);if(!o)throw new Error("PROJECT_NOT_INITIALIZED");return o}detect(t=process.cwd()){let o=F(t),r=et(o),i=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(d=>ke(Z(r,d))),c=po(o,i?r:void 0);if(c){let d=J(c),p=ye(d);return p.rootPath!==c&&(p.rootPath=c,p.updatedAt=new Date().toISOString(),he(c,p)),M(p,c)}let s=new Date().toISOString(),a=Us(r),l=fe(r),u={version:1,id:l?uo(l.canonicalRemote):zs(r),name:a,remote:l?.repositoryName??a,rootPath:r,createdAt:s,updatedAt:s,graphVersion:0,memoryVersion:0,metadata:l?{toolnetIdentity:tt(l)}:void 0};return he(r,u),M(u,r)}};var Qs=[{type:"openai_key",regex:/\bsk-[A-Za-z0-9_-]{20,}\b/g,confidence:"exact"},{type:"huggingface_token",regex:/\bhf_[A-Za-z0-9]{20,}\b/g,confidence:"exact"},{type:"hf_s3_access_key",regex:/\bHFAK[A-Za-z0-9]{8,}\b/g,confidence:"exact"},{type:"aws_access_key",regex:/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,confidence:"exact"},{type:"github_token",regex:/\b(?:gh[pousr]_[A-Za-z0-9]{30,255}|github_pat_[A-Za-z0-9_]{40,255})\b/g,confidence:"exact"},{type:"stripe_secret_key",regex:/\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g,confidence:"exact"},{type:"google_api_key",regex:/\bAIza[A-Za-z0-9_-]{30,}\b/g,confidence:"exact"},{type:"slack_token",regex:/\bxox[baprs]-[A-Za-z0-9-]{16,}\b/g,confidence:"exact"},{type:"npm_token",regex:/\bnpm_[A-Za-z0-9]{20,}\b/g,confidence:"exact"},{type:"bearer_token",regex:/\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/gi,confidence:"high"},{type:"jwt",regex:/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,confidence:"exact"},{type:"private_key",regex:/-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,confidence:"exact"},{type:"password_assignment",regex:/\b(?:password|passwd|pwd)\s*[:=]\s*["']?[^"' \t\r\n]{6,}["']?/gi,confidence:"high"},{type:"secret_assignment",regex:/\b(?:secret|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key)\s*[:=]\s*["']?[^"' \t\r\n]{8,}["']?/gi,confidence:"high"},{type:"cookie",regex:/\b(?:cookie|set-cookie)\s*[:=]\s*[^;\n]{8,}/gi,confidence:"high"},{type:"url_credentials",regex:/\bhttps?:\/\/[^:/@\s]+:[^/@\s]{4,}@[^/\s]+/gi,confidence:"high"}],Xs=new Set(["example","example-key","example-token","changeme","change-me","password","secret","your-api-key","your-token","<token>","<secret>","<password>","[redacted]"]);function yo(e){return e.normalize("NFKC").trim().toLowerCase()}function Zs(e){if(e.length===0)return 0;let t=new Map;for(let r of e)t.set(r,(t.get(r)??0)+1);let o=0;for(let r of t.values()){let n=r/e.length;o-=n*Math.log2(n)}return o}function ec(e){return/^[a-f0-9]{32}$/iu.test(e)||/^[a-f0-9]{40}$/iu.test(e)||/^[a-f0-9]{64}$/iu.test(e)}function tc(e,t,o){let r=e.slice(Math.max(0,t-48),t),n=e.slice(o,Math.min(e.length,o+16));return/\b(?:token|secret|key|credential|authorization|password|passwd|apikey|api_key|access[_-]?key)\b/iu.test(`${r} ${n}`)}function oc(e,t){return e.start<t.end&&t.start<e.end}function ho(e){return e.sort((t,o)=>t.start!==o.start?t.start-o.start:o.end-o.start-(t.end-t.start))}var Se=class{allowValues=new Set;enableEntropyHeuristic;constructor(t={}){for(let o of t.allowValues??[]){let r=yo(o);r&&this.allowValues.add(r)}this.enableEntropyHeuristic=t.enableEntropyHeuristic??!0}scan(t){let o=[];for(let i of Qs){let c=new RegExp(i.regex.source,i.regex.flags);for(let s of t.matchAll(c))s.index===void 0||!s[0]||this.allowed(s[0])||o.push({type:i.type,value:s[0],start:s.index,end:s.index+s[0].length,confidence:i.confidence})}this.enableEntropyHeuristic&&o.push(...this.entropyMatches(t));let r=ho(o),n=[];for(let i of r)n.some(c=>oc(c,i))||n.push(i);return ho(n)}hasSecrets(t){return this.scan(t).length>0}allowed(t){let o=yo(t);return Xs.has(o)?!0:this.allowValues.has(o)}entropyMatches(t){let o=[],r=/[A-Za-z0-9_+/=-]{32,160}/g;for(let n of t.matchAll(r)){if(n.index===void 0||!n[0])continue;let i=n[0];this.allowed(i)||ec(i)||!/[A-Za-z]/u.test(i)||!/[0-9]/u.test(i)||tc(t,n.index,n.index+i.length)&&(Zs(i)<3.7||o.push({type:"high_entropy_secret",value:i,start:n.index,end:n.index+i.length,confidence:"heuristic"}))}return o}};function ko(e,t,o){Object.defineProperty(e,t,{value:o,enumerable:!0,writable:!0,configurable:!0})}var Ie=class{scanner;constructor(t={}){this.scanner=new Se(t)}sanitize(t){let o=this.scanner.scan(t);if(o.length===0)return{text:t,redacted:0,secretTypes:[]};let r=t,n=[...o].sort((c,s)=>s.start-c.start),i=new Set;for(let c of n)i.add(c.type),r=r.slice(0,c.start)+`[REDACTED:${c.type}]`+r.slice(c.end);return{text:r,redacted:o.length,secretTypes:[...i].sort()}}sanitizeValue(t){if(typeof t=="string")return this.sanitize(t).text;if(Array.isArray(t))return t.map(o=>this.sanitizeValue(o));if(t&&typeof t=="object"){let o={};for(let[r,n]of Object.entries(t)){if(r==="__proto__")continue;let i=r.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g,"");if(i.includes("password")||i.includes("passwd")||i==="pwd"||i.includes("secret")||i.includes("token")||i.includes("cookie")||i.includes("authorization")||i.includes("apikey")||i.includes("accesskey")||i.includes("privatekey")||i.includes("clientsecret")||i.includes("credential")){ko(o,r,"[REDACTED]");continue}ko(o,r,this.sanitizeValue(n))}return o}return t}};var ym=new Ie;var rc={claude:"hook",cursor:"hook",copilot:"hook",grok:"hook",kiro:"hook",opencode:"hook",codex:"hook",agy:"hook","toolnet-cli":"manual-sync",kilo:"mcp-only",goose:"hook",qwen:"hook",kimi:"hook",hermes:"hook",qoder:"hook",aider:"managed-wrapper-session-end",plandex:"manual-sync",openrouter:"blocked-product-identity",bob:"hook",cline:"hook",rovo:"hook",warp:"blocked-capability",gemini:"hook",junie:"hook",codebuff:"mcp-only",freebuff:"mcp-only",continue:"manual-sync"},we={mcp:!0,continuityRead:!0,nativeCapture:!1,lifecycleHooks:!1,sharedJournalWrite:!1,level:"mcp-only"},nc={mcp:!0,continuityRead:!0,nativeCapture:!1,lifecycleHooks:!1,sharedJournalWrite:!1,level:"blocked"},ot={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!1,sharedJournalWrite:!0,level:"native-capture"},I={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!0,sharedJournalWrite:!0,level:"native-capture"},ic={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!0,sharedJournalWrite:!0,level:"native-capture"},sc={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!1,sharedJournalWrite:!0,level:"native-capture"};function m(e,t,o){return{agent:e,...t,refreshMode:o,captureMode:rc[e]}}var bo={agy:m("agy",I,"native-lifecycle"),opencode:m("opencode",ic,"persistent-plugin"),codex:m("codex",I,"native-lifecycle"),claude:m("claude",I,"native-lifecycle"),kiro:m("kiro",I,"native-lifecycle"),cursor:m("cursor",I,"native-lifecycle"),copilot:m("copilot",I,"native-lifecycle"),grok:m("grok",I,"native-lifecycle"),"toolnet-cli":m("toolnet-cli",ot,"native-session"),kilo:m("kilo",we,"mcp-only"),goose:m("goose",I,"native-lifecycle"),qwen:m("qwen",I,"native-lifecycle"),kimi:m("kimi",I,"native-lifecycle"),hermes:m("hermes",I,"native-lifecycle"),qoder:m("qoder",I,"native-lifecycle"),aider:m("aider",sc,"managed-wrapper"),plandex:m("plandex",ot,"native-session"),openrouter:m("openrouter",we,"mcp-only"),bob:m("bob",I,"native-lifecycle"),cline:m("cline",I,"native-lifecycle"),rovo:m("rovo",I,"native-lifecycle"),warp:m("warp",nc,"blocked"),gemini:m("gemini",I,"native-lifecycle"),junie:m("junie",I,"native-lifecycle"),codebuff:m("codebuff",we,"mcp-only"),freebuff:m("freebuff",we,"mcp-only"),continue:m("continue",ot,"native-session")};function cc(e){return Object.prototype.hasOwnProperty.call(bo,e)}function ac(e){if(cc(e))return bo[e]}function So(e){let t=ac(e);if(!t)return"unknown";switch(t.refreshMode){case"native-lifecycle":return"native lifecycle";case"persistent-plugin":return"persistent plugin";case"native-session":return"native session capture";case"mcp-only":return"MCP only";case"managed-wrapper":return"managed wrapper";default:return t.refreshMode}}var Io=["\u280B","\u2819","\u2839","\u2838","\u283C","\u2834","\u2826","\u2827","\u2807","\u280F"],j={clear:"\r\x1B[2K",cyan:"\x1B[36m",green:"\x1B[32m",red:"\x1B[31m",yellow:"\x1B[33m",amber:"\x1B[38;5;214m",dim:"\x1B[2m",reset:"\x1B[0m"};function wo(e,t=16){let r=Math.max(1,t-4+1),n=e%r;return"\u2500".repeat(n)+"\u2501".repeat(4)+"\u2500".repeat(Math.max(0,t-n-4))}function vo(e){let t=Date.now()-e;return t<1e3?`${t}ms`:t<1e4?`${(t/1e3).toFixed(1)}s`:`${Math.round(t/1e3)}s`}var rt=class{stream;enabled;interactive;color;intervalMs;display;label;frame=0;startedAt=0;timer;active=!1;constructor(t,o={}){this.label=t,this.stream=o.stream??process.stderr,this.enabled=o.enabled??!0,this.interactive=o.interactive??this.stream.isTTY===!0,this.color=o.color??(this.interactive&&process.env.NO_COLOR===void 0),this.intervalMs=Math.max(40,o.intervalMs??80),this.display=o.display??"spinner"}start(){return!this.enabled||this.active?this:(this.active=!0,this.startedAt=Date.now(),this.interactive?(this.render(),this.timer=setInterval(()=>{this.frame=(this.frame+1)%1e4,this.render()},this.intervalMs),this.timer.unref?.(),this):(this.stream.write(`\u2192 ${this.label}
`),this))}update(t){return this.label=t,this.enabled&&this.active&&this.interactive&&this.render(),this}succeed(t){this.finish("\u2713",t??this.label,j.green)}fail(t){this.finish("\u2717",t??this.label,j.red)}warn(t){this.finish("!",t??this.label,j.yellow)}stop(){this.active&&(this.timer&&(clearInterval(this.timer),this.timer=void 0),this.enabled&&this.interactive&&this.stream.write(j.clear),this.active=!1)}render(){if(!this.enabled||!this.active||!this.interactive)return;let t=Io[this.frame%Io.length],o=this.display==="bar"?this.color?`${j.amber}${wo(this.frame)}${j.reset}`:wo(this.frame):this.color?`${j.cyan}${t}${j.reset}`:t,r=vo(this.startedAt),n=this.color?`${j.dim}${r}${j.reset}`:r;this.stream.write(`${j.clear}${o} ${this.label} ${n}`)}finish(t,o,r){if(!this.enabled){this.active=!1;return}this.startedAt||(this.startedAt=Date.now()),this.timer&&(clearInterval(this.timer),this.timer=void 0);let n=vo(this.startedAt),i=this.color?`${r}${t}${j.reset}`:t,c=this.color?`${j.dim}${n}${j.reset}`:n;this.interactive?this.stream.write(`${j.clear}${i} ${o} ${c}
`):this.stream.write(`${i} ${o} (${n})
`),this.active=!1}};async function nt(e,t,o={}){let r=new rt(e,o).start();try{let n=await t();return r.succeed(),n}catch(n){throw r.fail(),n}}import{resolve as Bc}from"node:path";import{homedir as Hc}from"node:os";import{join as Jc}from"node:path";import{DeleteObjectCommand as lc,GetObjectCommand as uc,HeadObjectCommand as dc,ListObjectsV2Command as pc,PutObjectCommand as gc,S3Client as mc}from"@aws-sdk/client-s3";import{getSignedUrl as fc}from"@aws-sdk/s3-request-presigner";var ve=class{name="huggingface";client;bucket;constructor(t){this.bucket=t.bucket,this.client=new mc({region:"us-east-1",endpoint:`https://s3.hf.co/${t.namespace}`,forcePathStyle:!0,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:t.accessKeyId,secretAccessKey:t.secretAccessKey}})}async put(t,o,r="application/octet-stream"){let n=typeof o=="string"?Buffer.from(o,"utf8"):o;await this.client.send(new gc({Bucket:this.bucket,Key:t,Body:n,ContentType:r}))}async get(t){let o=await fc(this.client,new uc({Bucket:this.bucket,Key:t}),{expiresIn:60}),r=await fetch(o,{redirect:"follow"});if(r.status===404)return null;if(!r.ok)throw new Error(`HF download failed: ${r.status} ${r.statusText}`);return new Uint8Array(await r.arrayBuffer())}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){try{return await this.client.send(new dc({Bucket:this.bucket,Key:t})),!0}catch(o){if(typeof o=="object"&&o!==null&&"$metadata"in o&&o.$metadata?.httpStatusCode===404)return!1;throw o}}async delete(t){await this.client.send(new lc({Bucket:this.bucket,Key:t}))}async list(t=""){let o=[],r;do{let n=await this.client.send(new pc({Bucket:this.bucket,Prefix:t||void 0,ContinuationToken:r}));for(let i of n.Contents??[])i.Key&&o.push({key:i.Key,size:i.Size,updatedAt:i.LastModified?.toISOString()});r=n.IsTruncated?n.NextContinuationToken:void 0}while(r);return o}};import{access as jo,mkdir as yc,readFile as hc,readdir as kc,rm as bc,stat as xo,writeFile as Sc}from"node:fs/promises";import{dirname as Ic,join as wc,relative as Co,resolve as vc}from"node:path";var ee=class{constructor(t){this.root=t}root;name="local";path(t){let o=t.replace(/^\/+/,"");return vc(this.root,o)}async put(t,o){let r=this.path(t);await yc(Ic(r),{recursive:!0}),await Sc(r,o)}async get(t){try{return await hc(this.path(t))}catch(o){if(typeof o=="object"&&o!==null&&"code"in o&&o.code==="ENOENT")return null;throw o}}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){try{return await jo(this.path(t)),!0}catch{return!1}}async delete(t){await bc(this.path(t),{force:!0})}async list(t=""){let o=this.path(t),r=[];try{await jo(o)}catch{return r}let n=async c=>{let s=await kc(c,{withFileTypes:!0});for(let a of s){let l=wc(c,a.name);if(a.isDirectory()){await n(l);continue}let u=await xo(l);r.push({key:Co(this.root,l),size:u.size,updatedAt:u.mtime.toISOString()})}},i=await xo(o);return i.isDirectory()?await n(o):r.push({key:Co(this.root,o),size:i.size,updatedAt:i.mtime.toISOString()}),r}};import{DeleteObjectCommand as jc,GetObjectCommand as xc,HeadObjectCommand as Cc,ListObjectsV2Command as Oc,PutObjectCommand as Rc,S3Client as Ec}from"@aws-sdk/client-s3";import{getSignedUrl as Pc}from"@aws-sdk/s3-request-presigner";var te=class{name;client;bucket;constructor(t){this.name=t.name??"s3",this.bucket=t.bucket,this.client=new Ec({region:t.region??"us-east-1",endpoint:t.endpoint||void 0,forcePathStyle:t.forcePathStyle??!1,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:t.accessKeyId,secretAccessKey:t.secretAccessKey}})}async put(t,o,r="application/octet-stream"){let n=typeof o=="string"?Buffer.from(o,"utf8"):o;await this.client.send(new Rc({Bucket:this.bucket,Key:t,Body:n,ContentType:r}))}async get(t){let o=await Pc(this.client,new xc({Bucket:this.bucket,Key:t}),{expiresIn:60}),r=await fetch(o,{redirect:"follow"});if(r.status===404)return null;if(!r.ok)throw new Error(`${this.name} download failed: ${r.status} ${r.statusText}`);return new Uint8Array(await r.arrayBuffer())}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){try{return await this.client.send(new Cc({Bucket:this.bucket,Key:t})),!0}catch(o){if(typeof o=="object"&&o!==null&&"$metadata"in o&&o.$metadata?.httpStatusCode===404)return!1;throw o}}async delete(t){await this.client.send(new jc({Bucket:this.bucket,Key:t}))}async list(t=""){let o=[],r;do{let n=await this.client.send(new Oc({Bucket:this.bucket,Prefix:t||void 0,ContinuationToken:r}));for(let i of n.Contents??[])i.Key&&o.push({key:i.Key,size:i.Size,updatedAt:i.LastModified?.toISOString()});r=n.IsTruncated?n.NextContinuationToken:void 0}while(r);return o}};import{createCipheriv as Tc,createDecipheriv as Ac,createHash as Nc,randomBytes as _c,timingSafeEqual as Mc}from"node:crypto";import{readFileSync as Fc}from"node:fs";var $=Buffer.from("TNMEME01","ascii"),Ro=1,oe=8,re=12,it=16,Eo=$.length+1+oe+re+it,$c="toolnet-memory:remote-encryption:v1:",Po="aes-256-gcm",st=32,b=class extends Error{constructor(o,r){super(r);this.code=o;this.name="RemoteEncryptionError"}code};function Dc(e){return e?["1","true","yes","on","enabled"].includes(e.trim().toLowerCase()):!1}function ct(e=process.env){return Dc(e.TOOLNET_REMOTE_ENCRYPTION)}function Oo(e){let t=e.trim();if(!t)throw new b("REMOTE_ENCRYPTION_KEY_EMPTY","Remote encryption key is empty.");let o;if(t.startsWith("hex:")){let r=t.slice(4);if(!/^[0-9a-f]{64}$/iu.test(r))throw new b("REMOTE_ENCRYPTION_KEY_INVALID","hex: remote encryption key must contain exactly 64 hexadecimal characters.");o=Buffer.from(r,"hex")}else if(/^[0-9a-f]{64}$/iu.test(t))o=Buffer.from(t,"hex");else{let r=t.startsWith("base64:")?t.slice(7):t;if(!/^[A-Za-z0-9+/_-]+={0,2}$/u.test(r))throw new b("REMOTE_ENCRYPTION_KEY_INVALID","Remote encryption key must be 32 raw bytes encoded as hexadecimal or base64.");o=Buffer.from(r,r.includes("-")||r.includes("_")?"base64url":"base64")}if(o.length!==st)throw new b("REMOTE_ENCRYPTION_KEY_INVALID_LENGTH",`Remote encryption key must decode to exactly ${st} bytes.`);return o}function To(e=process.env){let t=e.TOOLNET_REMOTE_ENCRYPTION_KEY?.trim(),o=e.TOOLNET_REMOTE_ENCRYPTION_KEY_FILE?.trim();if(t&&o)throw new b("REMOTE_ENCRYPTION_KEY_AMBIGUOUS","Configure either TOOLNET_REMOTE_ENCRYPTION_KEY or TOOLNET_REMOTE_ENCRYPTION_KEY_FILE, not both.");if(t)return Oo(t);if(o){let r;try{r=Fc(o,"utf8")}catch(n){throw new b("REMOTE_ENCRYPTION_KEY_FILE_READ_FAILED",[`Unable to read remote encryption key file: ${o}.`,n instanceof Error?n.message:String(n)].join(" "))}return Oo(r)}}function Ao(e){return Nc("sha256").update(e).digest().subarray(0,oe)}function No(e){return Buffer.from(`${$c}${e}`,"utf8")}function at(e){return e.byteLength<$.length?!1:Buffer.from(e).subarray(0,$.length).equals($)}function _o(e,t,o){if(o.byteLength!==st)throw new b("REMOTE_ENCRYPTION_KEY_INVALID_LENGTH","AES-256-GCM requires a 32-byte key.");let r=typeof t=="string"?Buffer.from(t,"utf8"):Buffer.from(t),n=_c(re),i=Tc(Po,o,n);i.setAAD(No(e));let c=Buffer.concat([i.update(r),i.final()]),s=i.getAuthTag(),a=Buffer.alloc(Eo),l=0;return $.copy(a,l),l+=$.length,a.writeUInt8(Ro,l),l+=1,Ao(o).copy(a,l),l+=oe,n.copy(a,l),l+=re,s.copy(a,l),Buffer.concat([a,c])}function Mo(e,t,o){let r=Buffer.from(t);if(!at(r))throw new b("REMOTE_ENCRYPTION_ENVELOPE_REQUIRED","Payload is not a ToolNet encrypted remote object.");if(r.length<Eo)throw new b("REMOTE_ENCRYPTION_ENVELOPE_TRUNCATED","Encrypted remote payload is truncated.");let n=$.length,i=r.readUInt8(n);if(n+=1,i!==Ro)throw new b("REMOTE_ENCRYPTION_VERSION_UNSUPPORTED",`Unsupported remote encryption envelope version: ${i}.`);let c=r.subarray(n,n+oe);n+=oe;let s=Ao(o);if(!Mc(c,s))throw new b("REMOTE_ENCRYPTION_KEY_MISMATCH","Configured remote encryption key does not match this encrypted object.");let a=r.subarray(n,n+re);n+=re;let l=r.subarray(n,n+it);n+=it;let u=r.subarray(n),d=Ac(Po,o,a);d.setAAD(No(e)),d.setAuthTag(l);try{return Buffer.concat([d.update(u),d.final()])}catch{throw new b("REMOTE_ENCRYPTION_AUTH_FAILED","Encrypted remote object failed AES-GCM authentication.")}}var lt=class{constructor(t,o){this.inner=t;this.options=o;if(this.name=t.name,o.enabled&&!o.key)throw new b("REMOTE_ENCRYPTION_KEY_REQUIRED","Remote client-side encryption is enabled but no encryption key is configured.")}inner;options;name;async put(t,o,r){if(!this.options.enabled){await this.inner.put(t,o,r);return}let n=this.options.key;if(!n)throw new b("REMOTE_ENCRYPTION_KEY_REQUIRED","Remote encryption key is unavailable.");let i=_o(t,o,n);await this.inner.put(t,i,"application/octet-stream")}async get(t){let o=await this.inner.get(t);if(!o)return null;if(!at(o))return o;if(!this.options.enabled)throw new b("REMOTE_ENCRYPTION_REQUIRED",["Remote object is client-side encrypted.","Enable TOOLNET_REMOTE_ENCRYPTION and configure the matching key."].join(" "));let r=this.options.key;if(!r)throw new b("REMOTE_ENCRYPTION_KEY_REQUIRED","Remote object is encrypted but no decryption key is configured.");return Mo(t,o,r)}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){return this.inner.exists(t)}async delete(t){await this.inner.delete(t)}async list(t=""){return this.inner.list(t)}};function Fo(e,t=process.env){if(e.name==="local")return ct(t)&&console.warn("[storage] Remote encryption requested but active storage provider is local; local data remains unchanged."),e;let o=ct(t),r=o?To(t):void 0;return new lt(e,{enabled:o,key:r})}function ne(e){return Fo(e)}function ut(e,t){return console.warn(t),ne(new ee(e))}function $o(e){let t=e.localRoot??Jc(Hc(),".toolnet-memory","storage");if(e.provider==="r2"){let o=e.r2;return o?.accountId&&o.bucket&&o.accessKeyId&&o.secretAccessKey?ne(new te({name:"r2",endpoint:`https://${o.accountId}.r2.cloudflarestorage.com`,region:"auto",bucket:o.bucket,forcePathStyle:!0,accessKeyId:o.accessKeyId,secretAccessKey:o.secretAccessKey})):ut(t,"[storage] Cloudflare R2 credentials missing. Using local fallback.")}if(e.provider==="s3"){let o=e.s3;return o?.bucket&&o.accessKeyId&&o.secretAccessKey?ne(new te({name:"s3",endpoint:o.endpoint,region:o.region??"us-east-1",bucket:o.bucket,forcePathStyle:o.forcePathStyle??!1,accessKeyId:o.accessKeyId,secretAccessKey:o.secretAccessKey})):ut(t,"[storage] S3 credentials missing. Using local fallback.")}if(e.provider==="huggingface"){let o=e.huggingface;return o?.namespace&&o.bucket&&o.accessKeyId&&o.secretAccessKey?ne(new ve({namespace:o.namespace,bucket:o.bucket,accessKeyId:o.accessKeyId,secretAccessKey:o.secretAccessKey})):ut(t,"[storage] Hugging Face credentials missing. Using local fallback.")}return ne(new ee(t))}function Lc(e){return new Promise(t=>setTimeout(t,e))}async function Do(e,t={}){let o=Math.max(1,t.attempts??3),r=t.baseDelayMs??150,n=t.maxDelayMs??2e3,i;for(let c=1;c<=o;c++)try{return await e()}catch(s){if(i=s,c>=o)break;let a=Math.min(n,r*2**(c-1)),l=Math.floor(Math.random()*Math.max(1,a*.2));await Lc(a+l)}throw i}var Kc=new Set(["put","get","getText","delete","list"]);function Ho(e,t={}){return new Proxy(e,{get(o,r){let n=Reflect.get(o,r,o);return typeof n!="function"?n:Kc.has(r)?(...i)=>Do(()=>Promise.resolve(n.apply(o,i)),t):n.bind(o)}})}var R="authority: never rebuilt, never dropped",Gc=[{kind:"memory_records",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:R,legacyValueDomains:[],description:"Long-term project memory records (projects/<id>/memories/current.json)."},{kind:"task_operations",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"reject",sourceOfTruth:R,legacyValueDomains:[],description:"Immutable task operation log (.toolnet/tasks/events.jsonl)."},{kind:"task_replication_log",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"reject",sourceOfTruth:R,legacyValueDomains:[],description:"Replicated task operations from other hosts."},{kind:"retrieval_feedback",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:R,legacyValueDomains:[],description:"Retrieval feedback signals (.toolnet/retrieval/feedback.jsonl)."},{kind:"retrieval_telemetry",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:R,legacyValueDomains:[],description:"Retrieval telemetry samples (.toolnet/retrieval/telemetry.jsonl)."},{kind:"retrieval_overrides",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:R,legacyValueDomains:[],description:"Operator retrieval overrides (.toolnet/retrieval/overrides.json)."},{kind:"session_wal",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:R,legacyValueDomains:[],description:"Session write-ahead log (.toolnet/runtime/sources/)."},{kind:"adr_state",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"reject",sourceOfTruth:R,legacyValueDomains:[],description:"Architecture decision records (projects/<id>/knowledge/adr/state.v1.json)."},{kind:"project_manifest",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"backward_compatible",missingVersionPolicy:"assume_legacy",sourceOfTruth:R,legacyValueDomains:[],description:"Project identity manifest (.toolnet/project.json and the remote copy)."},{kind:"recovery_backup",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"reject",sourceOfTruth:R,legacyValueDomains:[],description:"Disaster-recovery backup manifest, version-gated on read."},{kind:"task_projection",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"task operations log",legacyValueDomains:[],description:"Materialized task state; rebuilt from the operation log."},{kind:"code_graph",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Code graph snapshot (projects/<id>/graph/current.json)."},{kind:"code_manifest",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Incremental file manifest (projects/<id>/graph/manifest.json)."},{kind:"resolution_snapshot",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"backward_compatible",missingVersionPolicy:"assume_legacy",sourceOfTruth:"repository source",legacyValueDomains:["resolution_kind_uppercase"],description:"Symbol resolution snapshot (projects/<id>/graph/resolution/current.json); the legacy kind vocabulary (CALL/REFERENCE/EXTENDS/IMPLEMENTS) is normalized in memory on read."},{kind:"graph_coverage",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code graph + resolution",legacyValueDomains:[],description:"Graph coverage snapshot (projects/<id>/graph/coverage.json)."},{kind:"cross_service",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source + service extractors",legacyValueDomains:[],description:"Cross-service linkage (projects/<id>/graph/cross-service.json)."},{kind:"fleet_export",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Fleet export view (projects/<id>/graph/fleet-export.json)."},{kind:"snapshot_archive",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"current project state",legacyValueDomains:[],description:"Point-in-time project snapshots; never part of authority backups."},{kind:"code_artifacts",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"reject",sourceOfTruth:"repository source + semantic registry",legacyValueDomains:[],description:"Portable code-intelligence artifacts, gated by the artifact fingerprint matrix."},{kind:"code_chunks",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Code chunk snapshot (projects/<id>/code/chunks/current.json)."},{kind:"code_vectors",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code chunks",legacyValueDomains:[],description:"Code vector index (projects/<id>/code/vectors/current.json)."},{kind:"memory_vectors",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"memory records",legacyValueDomains:[],description:"Deterministic memory vector index (projects/<id>/vectors/current.json)."},{kind:"architecture_snapshot",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code graph",legacyValueDomains:[],description:"Architecture snapshot (projects/<id>/code/architecture)."},{kind:"code_analysis",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code graph",legacyValueDomains:[],description:"Code analysis snapshot (projects/<id>/code/analysis)."},{kind:"visualization_graph",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code graph",legacyValueDomains:[],description:"Visualization graph (projects/<id>/code/visualization/graph.json)."},{kind:"runtime_traces",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"observed session activity",legacyValueDomains:[],description:"Runtime trace sessions plus their recomputed observation index."},{kind:"journal",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"session activity",legacyValueDomains:[],description:"Local session journal (.toolnet/journal)."},{kind:"task_replication_cursor",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"task replication log",legacyValueDomains:[],description:"Replication cursor (.toolnet/tasks/replication/cursor.json)."},{kind:"runtime_locks",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"process lifetime",legacyValueDomains:[],description:"Runtime lock files (.toolnet/runtime/locks)."},{kind:"daemon_state",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"running daemon",legacyValueDomains:[],description:"Daemon coordination state (daemon-state.json)."},{kind:"daemon_runtime_files",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"running daemon",legacyValueDomains:[],description:"Daemon socket, pid, lock and logs."},{kind:"artifact_staging",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Artifact staging area (.toolnet/cache/artifacts/staging)."},{kind:"test_run_cache",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"test execution",legacyValueDomains:[],description:"In-memory only derived test-run store."}],Vc=Object.freeze(Gc.slice().sort((e,t)=>e.kind.localeCompare(t.kind))),Df=new Map(Vc.map(e=>[e.kind,e]));var k="projects/[^/]+",Hf=[{pattern:/^\.toolnet\/tasks\/events\.jsonl$/u,kind:"task_operations"},{pattern:/^\.toolnet\/tasks\/replication\/replicated(\/|$)/u,kind:"task_replication_log"},{pattern:/^\.toolnet\/tasks\/replication\/cursor\.json$/u,kind:"task_replication_cursor"},{pattern:/^\.toolnet\/tasks\/state\.json$/u,kind:"task_projection"},{pattern:/^\.toolnet\/tasks(\/|$)/u,kind:"task_projection"},{pattern:/^\.toolnet\/retrieval\/feedback\.jsonl$/u,kind:"retrieval_feedback"},{pattern:/^\.toolnet\/retrieval\/telemetry\.jsonl$/u,kind:"retrieval_telemetry"},{pattern:/^\.toolnet\/retrieval\/overrides\.json$/u,kind:"retrieval_overrides"},{pattern:/^\.toolnet\/retrieval(\/|$)/u,kind:"retrieval_overrides"},{pattern:/^\.toolnet\/runtime\/sources(\/|$)/u,kind:"session_wal"},{pattern:/^\.toolnet\/runtime\/locks(\/|$)/u,kind:"runtime_locks"},{pattern:/^\.toolnet\/runtime(\/|$)/u,kind:"session_wal"},{pattern:/^\.toolnet\/journal(\/|$)/u,kind:"journal"},{pattern:/^\.toolnet\/cache\/artifacts\/staging(\/|$)/u,kind:"artifact_staging"},{pattern:/^\.toolnet\/cache(\/|$)/u,kind:"artifact_staging"},{pattern:/^\.toolnet\/project\.json$/u,kind:"project_manifest"},{pattern:new RegExp(`^${k}/memories(/|$)`,"u"),kind:"memory_records"},{pattern:new RegExp(`^${k}/knowledge/adr(/|$)`,"u"),kind:"adr_state"},{pattern:new RegExp(`^${k}/project\\.json$`,"u"),kind:"project_manifest"},{pattern:new RegExp(`^${k}/graph/artifacts(/|$)`,"u"),kind:"code_artifacts"},{pattern:new RegExp(`^${k}/graph/resolution(/|$)`,"u"),kind:"resolution_snapshot"},{pattern:new RegExp(`^${k}/graph/coverage\\.json$`,"u"),kind:"graph_coverage"},{pattern:new RegExp(`^${k}/graph/cross-service\\.json$`,"u"),kind:"cross_service"},{pattern:new RegExp(`^${k}/graph/fleet-export\\.json$`,"u"),kind:"fleet_export"},{pattern:new RegExp(`^${k}/graph/manifest\\.json$`,"u"),kind:"code_manifest"},{pattern:new RegExp(`^${k}/graph/current\\.json$`,"u"),kind:"code_graph"},{pattern:new RegExp(`^${k}/graph(/|$)`,"u"),kind:"code_graph"},{pattern:new RegExp(`^${k}/code/graph(/|$)`,"u"),kind:"code_graph"},{pattern:new RegExp(`^${k}/code/chunks(/|$)`,"u"),kind:"code_chunks"},{pattern:new RegExp(`^${k}/code/vectors(/|$)`,"u"),kind:"code_vectors"},{pattern:new RegExp(`^${k}/code/architecture(/|$)`,"u"),kind:"architecture_snapshot"},{pattern:new RegExp(`^${k}/code/analysis(/|$)`,"u"),kind:"code_analysis"},{pattern:new RegExp(`^${k}/code/visualization(/|$)`,"u"),kind:"visualization_graph"},{pattern:new RegExp(`^${k}/vectors(/|$)`,"u"),kind:"memory_vectors"},{pattern:new RegExp(`^${k}/memory(/|$)`,"u"),kind:"memory_records"},{pattern:new RegExp(`^${k}/runtime-traces(/|$)`,"u"),kind:"runtime_traces"},{pattern:new RegExp(`^${k}/snapshots(/|$)`,"u"),kind:"snapshot_archive"},{pattern:/(^|\/)snapshots\/[^/]+\/(memories|vectors|graph)\//u,kind:"snapshot_archive"},{pattern:/(^|\/)daemon-state\.json$/u,kind:"daemon_state"},{pattern:/(^|\/)(daemon\.lock|daemon\.pid|daemon\.sock)$/u,kind:"daemon_runtime_files"},{pattern:/(^|\/)logs\/daemon\.log$/u,kind:"daemon_runtime_files"}];function K(e){let t=e.trim().replace(/\s+/g,"_").replace(/[^A-Za-z0-9._-]/g,"_").replace(/_+/g,"_").replace(/^\.+|\.+$/g,"").slice(0,100);if(!t||t==="."||t==="..")throw new Error("Invalid project storage folder");return t}var ny=Object.freeze({CALL:"call",REFERENCE:"type",EXTENDS:"inheritance",IMPLEMENTS:"implementation"});var qc="_toolnet/registry/project-identities/v1",x=class extends Error{code="PROJECT_IDENTITY_COLLISION";constructor(t){super(t),this.name="ProjectIdentityCollisionError"}},je=class extends Error{code="PROJECT_IDENTITY_ADOPTION_REQUIRED";constructor(t,o){super(["PROJECT_IDENTITY_ADOPTION_REQUIRED",`remote=${t}`,`projectId=${o}`,"A legacy remote ToolNet project exists but has no Git fingerprint proof.",`Re-run with: toolnet-memory init --adopt-remote ${t}`].join(" ")),this.name="ProjectIdentityAdoptionRequiredError"}},ie=class extends Error{code="PROJECT_IDENTITY_REGISTRY_UNAVAILABLE";constructor(t){super(["PROJECT_IDENTITY_REGISTRY_UNAVAILABLE",t,"Refusing to create a possibly split project identity while configured remote storage cannot be checked.","Use --no-remote-identity only when local-only initialization is intentional."].join(" ")),this.name="ProjectIdentityRegistryUnavailableError"}};function Uc(){let e=Xe();if(e.storage.provider==="r2"){let t=e.storage.r2;return!!(t.accountId&&t.bucket&&t.accessKeyId&&t.secretAccessKey)}if(e.storage.provider==="s3"){let t=e.storage.s3;return!!(t.bucket&&t.accessKeyId&&t.secretAccessKey)}if(e.storage.provider==="huggingface"){let t=e.storage.huggingface;return!!(t.namespace&&t.bucket&&t.accessKeyId&&t.secretAccessKey)}return!1}function Jo(e){if(e.storage)return{storage:e.storage,crossMachine:e.storageIsCrossMachine??!0,providerName:e.storage.name};let t=Xe(),o=$o({provider:t.storage.provider,r2:t.storage.r2,s3:t.storage.s3,huggingface:t.storage.huggingface,localRoot:t.storage.localRoot}),r=Uc()&&o.name!=="local";return{storage:r?Ho(o,{attempts:Number(process.env.TOOLNET_STORAGE_RETRIES??3)}):o,crossMachine:r,providerName:o.name}}function Ko(e){return[qc,`${e.fingerprint}.json`].join("/")}function Go(e,t){let o;try{o=JSON.parse(e)}catch(i){throw new x([`Invalid ToolNet project identity registry record: ${t}.`,i instanceof Error?i.message:String(i)].join(" "))}if(!o||typeof o!="object"||Array.isArray(o))throw new x(`Invalid ToolNet project identity registry record: ${t}`);let r=o;for(let i of["fingerprint","canonicalGitRemote","projectId","projectName","projectRemote"])if(typeof r[i]!="string"||!String(r[i]).trim())throw new x(`ToolNet identity registry record ${t} is missing ${i}`);let n=new Date().toISOString();return{version:1,fingerprint:String(r.fingerprint),canonicalGitRemote:String(r.canonicalGitRemote),projectId:String(r.projectId),projectName:String(r.projectName),projectRemote:String(r.projectRemote),createdAt:typeof r.createdAt=="string"?r.createdAt:n,updatedAt:typeof r.updatedAt=="string"?r.updatedAt:n}}function Yc(e,t){let o;try{o=JSON.parse(e)}catch(c){throw new x([`Invalid remote ToolNet project manifest: ${t}.`,c instanceof Error?c.message:String(c)].join(" "))}if(!o||typeof o!="object"||Array.isArray(o))throw new x(`Invalid remote ToolNet project manifest: ${t}`);let r=o;if(typeof r.id!="string"||!r.id.trim())throw new x(`Remote ToolNet project manifest ${t} is missing id`);let n=typeof r.remote=="string"&&r.remote.trim()?r.remote:t.split("/")[1]??"project",i=typeof r.name=="string"&&r.name.trim()?r.name:n;return{version:typeof r.version=="number"?r.version:void 0,id:r.id,name:i,remote:n,createdAt:typeof r.createdAt=="string"?r.createdAt:void 0,updatedAt:typeof r.updatedAt=="string"?r.updatedAt:void 0}}async function xe(e,t){let r=`projects/${K(t)}/project.json`,n=await e.getText(r);return n?Yc(n,r):null}async function zc(e,t){let o=Ko(t),r=await e.getText(o);if(!r)return null;let n=Go(r,o);if(n.fingerprint!==t.fingerprint||n.canonicalGitRemote!==t.canonicalRemote)throw new x(["PROJECT_IDENTITY_REGISTRY_MISMATCH",`key=${o}`,`expectedFingerprint=${t.fingerprint}`,`actualFingerprint=${n.fingerprint}`].join(" "));return n}async function Wc(e,t){let o=await xe(e,t.projectRemote);if(o&&o.id!==t.projectId)throw new x(["PROJECT_IDENTITY_REMOTE_OWNERSHIP_MISMATCH",`remote=${t.projectRemote}`,`registryId=${t.projectId}`,`remoteId=${o.id}`].join(" "))}async function dt(e,t,o){let r=K(t.remote??t.name),n=await xe(e,r);if(n&&n.id!==t.id)throw new x(["PROJECT_IDENTITY_REMOTE_NAMESPACE_COLLISION",`remote=${r}`,`existing=${n.id}`,`current=${t.id}`].join(" "));let i=Ko(o),c=await e.getText(i);if(c){let l=Go(c,i);if(l.projectId!==t.id||l.canonicalGitRemote!==o.canonicalRemote)throw new x(["PROJECT_IDENTITY_REGISTRY_COLLISION",`fingerprint=${o.fingerprint}`,`existingProject=${l.projectId}`,`currentProject=${t.id}`].join(" "));return}let s=new Date().toISOString(),a={version:1,fingerprint:o.fingerprint,canonicalGitRemote:o.canonicalRemote,projectId:t.id,projectName:t.name,projectRemote:r,createdAt:t.createdAt,updatedAt:s};await e.put(i,JSON.stringify(a,null,2)+`
`,"application/json")}function Qc(e,t){return{id:e.id,name:e.name,remote:e.remote,createdAt:e.createdAt,gitIdentity:t,metadata:{adoptedFromRemote:!0,adoptedAt:new Date().toISOString()}}}function Lo(e){return e instanceof x||e instanceof je||e instanceof ie}async function Vo(e=process.cwd(),t={}){let o=Bc(e),r=new L,n=r.findExisting(o),i=fe(n?.rootPath??o);if(n){let s=n;if(i&&(s=r.recordGitIdentity(n.rootPath,i,{allowRebind:t.allowGitRebind??!1})),t.skipRemoteIdentity||!i)return{project:s,source:"existing-manifest",gitIdentity:i,registry:t.skipRemoteIdentity?"skipped":"disabled"};let a=Jo(t);if(!a.crossMachine)return{project:s,source:"existing-manifest",gitIdentity:i,registry:"disabled",registryProvider:a.providerName};try{return await dt(a.storage,s,i),{project:s,source:"existing-manifest",gitIdentity:i,registry:"registered",registryProvider:a.providerName}}catch(l){if(Lo(l))throw l;return{project:s,source:"existing-manifest",gitIdentity:i,registry:"unavailable",registryProvider:a.providerName}}}if(!i)return{project:r.detect(o),source:"legacy-path",gitIdentity:null,registry:"disabled"};if(t.skipRemoteIdentity)return{project:r.detect(o),source:"git-remote",gitIdentity:i,registry:"skipped"};let c=Jo(t);if(!c.crossMachine){if(t.adoptRemote)throw new ie("Explicit remote adoption was requested but no cross-machine storage provider is configured.");return{project:r.detect(o),source:"git-remote",gitIdentity:i,registry:"disabled",registryProvider:c.providerName}}try{let s=await zc(c.storage,i);if(s){if(t.adoptRemote&&K(t.adoptRemote)!==K(s.projectRemote))throw new x(["PROJECT_IDENTITY_EXPLICIT_ADOPTION_CONFLICT",`requested=${t.adoptRemote}`,`registered=${s.projectRemote}`].join(" "));return await Wc(c.storage,s),{project:r.adopt(o,{id:s.projectId,name:s.projectName,remote:s.projectRemote,createdAt:s.createdAt,gitIdentity:i,metadata:{adoptedFromRegistry:!0,adoptedAt:new Date().toISOString()}}),source:"remote-registry",gitIdentity:i,registry:"matched",registryProvider:c.providerName}}if(t.adoptRemote){let u=await xe(c.storage,t.adoptRemote);if(!u)throw new Error(["PROJECT_ADOPTION_REMOTE_NOT_FOUND",`remote=${t.adoptRemote}`].join(" "));let d=r.adopt(o,Qc(u,i));return await dt(c.storage,d,i),{project:d,source:"explicit-remote-adoption",gitIdentity:i,registry:"registered",registryProvider:c.providerName}}let a=await xe(c.storage,i.repositoryName);if(a)throw new je(a.remote,a.id);let l=r.detect(o);return await dt(c.storage,l,i),{project:l,source:"git-remote",gitIdentity:i,registry:"registered",registryProvider:c.providerName}}catch(s){throw Lo(s)?s:new ie(s instanceof Error?s.message:String(s))}}import{existsSync as Ar}from"node:fs";import{homedir as _a}from"node:os";import{join as v}from"node:path";import{spawnSync as Ma}from"node:child_process";import{homedir as Xc}from"node:os";import{join as G}from"node:path";function Bo(e={}){return G(e.home??Xc(),".gemini")}function qo(e={}){return G(Bo(e),"antigravity-cli")}function Uo(e={}){return G(Bo(e),"config")}function Ce(e={}){return G(Uo(e),"mcp_config.json")}function Oe(e={}){let t=e.cwd??process.cwd();return G(t,".agents","mcp_config.json")}function Re(e="toolnet-memory",t={}){return G(qo(t),"plugins",e)}function Yo(e={}){return[qo(e),Ce(e),Uo(e),Oe(e)]}import{homedir as zo}from"node:os";import{join as D}from"node:path";function V(e={}){let t=process.env.OPENCODE_CONFIG_DIR?.trim();if(t)return t;let o=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return o?D(o,"opencode"):D(e.home??zo(),".config","opencode")}function pt(e={}){let t=process.env.OPENCODE_CONFIG?.trim();if(t)return t;let o=e.home??zo(),r=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return r?D(r,"opencode","opencode.json"):D(o,".config","opencode","opencode.json")}function gt(e={}){let t=e.cwd??process.cwd();return D(t,"opencode.json")}function Wo(e={}){return D(V(e),"plugins")}function Qo(e={}){return D(V(e),"AGENTS.md")}import{homedir as Xo}from"node:os";import{join as mt}from"node:path";function ft(e={}){return mt(e.home??Xo(),".claude")}function Zo(e={}){return mt(ft(e),"settings.json")}function er(e={}){return mt(e.home??Xo(),".claude.json")}import{homedir as Zc}from"node:os";import{join as H}from"node:path";function yt(e={}){return e.kiroHome??process.env.KIRO_HOME??H(e.home??Zc(),".kiro")}function ea(e={}){return H(yt(e),"settings")}function Ee(e={}){return H(ea(e),"mcp.json")}function ht(e={}){let t=e.cwd??process.cwd();return H(t,".kiro","settings","mcp.json")}function ta(e={}){return H(yt(e),"hooks")}function kt(e={}){return H(ta(e),"toolnet-memory.json")}function bt(e={}){let t=e.cwd??process.cwd();return H(t,".kiro","hooks","toolnet-memory.json")}function tr(e={}){return[yt(e),Ee(e)]}import{homedir as oa}from"node:os";import{join as St}from"node:path";function or(e={}){return St(e.home??oa(),".toolnetcli")}function ra(e={}){return St(or(e),"config.json")}function rr(e={}){let t=e.cwd??process.cwd();return St(t,".toolnet","mcp.json")}function nr(e={}){let t=or(e),o=ra(e);return[t,o]}import{homedir as na}from"node:os";import{join as It}from"node:path";function ir(e={}){if(e.kiloHome)return e.kiloHome;if(process.env.KILO_HOME)return process.env.KILO_HOME;let t=e.xdgConfigHome??process.env.XDG_CONFIG_HOME;return t?It(t,"kilo"):It(e.home??na(),".config","kilo")}function wt(e={}){return It(ir(e),"kilo.jsonc")}function sr(e={}){let t=ir(e),o=wt(e);return[t,o]}import{homedir as ia}from"node:os";import{join as T,resolve as sa}from"node:path";function Pe(e={}){return e.cursorHome??T(e.home??ia(),".cursor")}function ca(e={}){return e.cursorConfigDir??process.env.CURSOR_CONFIG_DIR??(e.xdgConfigHome??process.env.XDG_CONFIG_HOME?T(e.xdgConfigHome??process.env.XDG_CONFIG_HOME,"cursor"):void 0)??Pe(e)}function Te(e={}){return T(Pe(e),"mcp.json")}function Ae(e={}){return T(Pe(e),"hooks.json")}function vt(e){return T(sa(e),".cursor")}function cr(e){return T(vt(e),"mcp.json")}function ar(e){return T(vt(e),"hooks.json")}function aa(e){return T(vt(e),"rules")}function lr(e){return T(aa(e),"toolnet-memory.mdc")}function ur(e={}){return Array.from(new Set([Pe(e),ca(e)]))}import{homedir as la}from"node:os";import{join as E,resolve as ua}from"node:path";function jt(e={}){return e.copilotHome??process.env.COPILOT_HOME??E(e.home??la(),".copilot")}function Ne(e={}){return E(jt(e),"mcp-config.json")}function da(e={}){return E(jt(e),"hooks")}function _e(e={}){return E(da(e),"toolnet-memory.json")}function xt(e){return E(ua(e),".github")}function dr(e){return E(xt(e),"mcp.json")}function pa(e){return E(xt(e),"hooks")}function pr(e){return E(pa(e),"toolnet-memory.json")}function ga(e){return E(xt(e),"instructions")}function gr(e){return E(ga(e),"toolnet-memory.instructions.md")}function mr(e={}){return[jt(e)]}import{homedir as ma}from"node:os";import{join as C,resolve as fa}from"node:path";function Me(e={}){return e.grokHome??process.env.GROK_HOME??C(e.home??ma(),".grok")}function Fe(e={}){return C(Me(e),"config.toml")}function ya(e={}){return C(Me(e),"hooks")}function $e(e={}){return C(ya(e),"toolnet-memory.json")}function ha(e={}){return C(Me(e),"skills")}function ka(e={}){return C(ha(e),"toolnet-continuity")}function De(e={}){return C(ka(e),"SKILL.md")}function Ct(e){return C(fa(e),".grok")}function fr(e){return C(Ct(e),"config.toml")}function ba(e){return C(Ct(e),"hooks")}function yr(e){return C(ba(e),"toolnet-memory.json")}function Sa(e){return C(Ct(e),"skills")}function Ia(e){return C(Sa(e),"toolnet-continuity")}function hr(e){return C(Ia(e),"SKILL.md")}function kr(e={}){return[Me(e)]}import{homedir as wa}from"node:os";import{join as br}from"node:path";function va(e={}){return br(e.home??wa(),".gemini")}function Ot(e={}){return br(va(e),"settings.json")}function Sr(e={}){return[Ot(e)]}import{homedir as ja}from"node:os";import{join as Ir}from"node:path";function xa(e={}){return Ir(e.home??ja(),".junie")}function Rt(e={}){return Ir(xa(e),"config.json")}function wr(e={}){return[Rt(e)]}import{homedir as vr}from"node:os";import{join as Et,resolve as Ca}from"node:path";function Oa(e={}){let t=process.env.CODEBUFF_CONFIG_DIR;return t&&t.trim()?Ca(t):Et(e.home??vr(),".config","manicode")}function jr(e={}){return Et(e.cwd??process.cwd(),".agents","mcp.json")}function Ra(e={}){return Et(e.home??vr(),".agents","mcp.json")}function xr(e={}){return[Oa(e),Ra(e)]}import{homedir as Cr}from"node:os";import{join as Pt,resolve as Ea}from"node:path";function Pa(e={}){let t=process.env.FREEBUFF_CONFIG_DIR;return t&&t.trim()?Ea(t):Pt(e.home??Cr(),".config","manicode")}function Or(e={}){return Pt(e.cwd??process.cwd(),".agents","mcp.json")}function Ta(e={}){return Pt(e.home??Cr(),".agents","mcp.json")}function Rr(e={}){return[Pa(e),Ta(e)]}import{homedir as Aa}from"node:os";import{join as Tt}from"node:path";function At(e={}){return Tt(e.home??Aa(),".continue")}function Na(e={}){return Tt(At(e),"config.yaml")}function Er(e={}){return Tt(At(e),"sessions")}function Pr(e={}){return[At(e),Na(e)]}function Fa(e){return Ma("sh",["-lc",`command -v ${JSON.stringify(e)} >/dev/null 2>&1`],{stdio:"ignore"}).status===0}function f(e){let t=e.commandExists(e.command),o=e.configPaths.filter(i=>Ar(i)),r=o.length>0,n=[];t&&n.push(`command:${e.command}`);for(let i of o)n.push(`config:${i}`);return{agent:e.agent,detected:t||r,commandDetected:t,configDetected:r,evidence:n}}function Tr(e){let t=e.commands.filter(c=>e.commandExists(c)),o=e.configPaths.filter(c=>Ar(c)),r=t.length>0,n=o.length>0,i=[...t.map(c=>`command:${c}`),...o.map(c=>`config:${c}`)];return{agent:e.agent,detected:r||n,commandDetected:r,configDetected:n,evidence:i}}function Nr(e={}){let t=e.home??_a(),o=e.commandExists??Fa,r=e.codexHome??process.env.CODEX_HOME??v(t,".codex");return[f({agent:"agy",command:"agy",commandExists:o,configPaths:Yo({home:t})}),f({agent:"gemini",command:"gemini",commandExists:o,configPaths:Sr({home:t})}),f({agent:"junie",command:"junie",commandExists:o,configPaths:wr({home:t})}),f({agent:"codebuff",command:"codebuff",commandExists:o,configPaths:xr({home:t})}),f({agent:"freebuff",command:"freebuff",commandExists:o,configPaths:Rr({home:t})}),f({agent:"continue",command:"cn",commandExists:o,configPaths:Pr({home:t})}),f({agent:"opencode",command:"opencode",commandExists:o,configPaths:[V({home:t,xdgConfigHome:e.xdgConfigHome})]}),f({agent:"claude",command:"claude",commandExists:o,configPaths:[ft({home:t})]}),f({agent:"kiro",command:"kiro-cli",commandExists:o,configPaths:tr({home:t,kiroHome:e.kiroHome})}),Tr({agent:"cursor",commands:["agent","cursor-agent"],commandExists:o,configPaths:ur({home:t,cursorHome:e.cursorHome,cursorConfigDir:e.cursorConfigDir,xdgConfigHome:e.xdgConfigHome})}),f({agent:"copilot",command:"copilot",commandExists:o,configPaths:mr({home:t,copilotHome:e.copilotHome})}),f({agent:"grok",command:"grok",commandExists:o,configPaths:kr({home:t,grokHome:e.grokHome})}),f({agent:"toolnet-cli",command:"toolnet",commandExists:o,configPaths:nr({home:t})}),Tr({agent:"kilo",commands:["kilo","kilo-code"],commandExists:o,configPaths:sr({home:t,kiloHome:e.kiloHome})}),f({agent:"codex",command:"codex",commandExists:o,configPaths:[r]}),f({agent:"goose",command:"goose",commandExists:o,configPaths:[v(t,".agents","plugins")]}),f({agent:"qwen",command:"qwen",commandExists:o,configPaths:[v(t,".qwen")]}),f({agent:"kimi",command:"kimi-code",commandExists:o,configPaths:[v(t,".kimi-code")]}),f({agent:"hermes",command:"hermes",commandExists:o,configPaths:[v(t,".hermes")]}),f({agent:"qoder",command:"qoder",commandExists:o,configPaths:[v(t,".qoder-cn"),v(t,".qoder")]}),f({agent:"aider",command:"aider",commandExists:o,configPaths:[v(t,".aider")]}),f({agent:"plandex",command:"plandex",commandExists:o,configPaths:[v(t,".plandex"),v(t,"plandex-server")]}),f({agent:"openrouter",command:"openrouter",commandExists:o,configPaths:[v(t,".openrouter")]}),f({agent:"bob",command:"bob",commandExists:o,configPaths:[v(t,".bob")]}),f({agent:"cline",command:"cline",commandExists:o,configPaths:[v(t,".cline")]}),f({agent:"rovo",command:"rovo",commandExists:o,configPaths:[v(t,".rovodev"),v(t,".rovo")]}),f({agent:"warp",command:"warp",commandExists:o,configPaths:[v(t,".warp")]})]}import{existsSync as tl,mkdirSync as Hr,readFileSync as ol,renameSync as rl,writeFileSync as nl}from"node:fs";import{dirname as il,join as Je}from"node:path";import{existsSync as $a,mkdirSync as Da,readFileSync as Ha,renameSync as Ja,rmSync as La,writeFileSync as Ka}from"node:fs";import{dirname as Ga,join as Va}from"node:path";function Ba(e){return`'${e.replace(/'/g,"'\\''")}'`}function qa(e){if(!$a(e))return{};let t;try{t=JSON.parse(Ha(e,"utf8"))}catch{throw new Error(`Invalid existing Agy hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Agy hooks.json at ${e}: root must be a JSON object.`);return t}function Ua(e,t){Da(Ga(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Ka(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Ja(o,e)}finally{La(o,{force:!0})}}function _r(e={}){let t=e.pluginName??"toolnet-memory",o=e.hooksFile??Va(Re(t),"hooks.json"),r=qa(o),n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",i=`${Ba(n)} session:agy-hook`;return r["toolnet-memory"]={enabled:!0,PreToolUse:[{matcher:"view_file|list_dir|find_by_name|grep_search|run_command",hooks:[{type:"command",command:`${i} pre-tool`,timeout:5}]}],PreInvocation:[{type:"command",command:`${i} pre`,timeout:15}],PostInvocation:[{type:"command",command:`${i} post`,timeout:15}],Stop:[{type:"command",command:`${i} stop`,timeout:30}]},Ua(o,r),o}import{existsSync as Ya,mkdirSync as za,readFileSync as Wa,renameSync as Qa,writeFileSync as Xa}from"node:fs";import{dirname as Za}from"node:path";function se(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function el(e,t){za(Za(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;Xa(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Qa(o,e)}function Mr(e){if(!Ya(e))return{};let t=Wa(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Agy MCP config at ${e}: parse error. Not overwriting.`)}if(!se(o))throw new Error(`Invalid existing Agy MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Fr(e,t){return se(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function He(e,t,o,r){let n=Mr(e),i=n.mcpServers;if(i!==void 0&&!se(i))throw new Error(`Invalid existing Agy MCP config: mcpServers must be an object in ${e}.`);let c=se(i)?{...i}:{},s=c[o];if(Fr(s,t)&&!r)return{installed:!0,changed:!1};c[o]={command:t,args:["mcp"]};let a={...n,mcpServers:c};el(e,a);let u=Mr(e).mcpServers;if(!se(u)||!Fr(u[o],t))throw new Error(`Agy MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function $r(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...He(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(r==="both"){let c=Ce(),s=Oe({cwd:e.cwd}),a=He(c,t,o,e.force??!1),l=He(s,t,o,e.force??!1);return{installed:!0,changed:a.changed||l.changed,configFile:c,serverName:o,command:t,args:["mcp"]}}let n=r==="workspace"?Oe({cwd:e.cwd}):Ce();return{...He(n,t,o,e.force??!1),configFile:n,serverName:o,command:t,args:["mcp"]}}var sl=`# ToolNet Memory Continuity

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
`;function cl(e,t){Hr(il(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;nl(o,t,{encoding:"utf8",mode:384}),rl(o,e)}function Dr(e,t){tl(e)&&ol(e,"utf8")===t||cl(e,t)}function Jr(e={}){let t=e.pluginName??"toolnet-memory",o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.pluginRoot??Re(t),n=Je(r,"plugin.json"),i=Je(r,"mcp_config.json"),c=Je(r,"hooks.json"),s=Je(r,"rules","toolnet-memory-continuity.md");return Hr(r,{recursive:!0,mode:448}),Dr(n,`${JSON.stringify({$schema:"https://antigravity.google/schemas/v1/plugin.json",name:t,description:"Persistent project continuity and memory for Antigravity coding sessions."},null,2)}
`),$r({configFile:i,binary:o,serverName:"toolnet-memory",force:e.force}),_r({hooksFile:c,binary:o,pluginName:t}),Dr(s,`${sl.trim()}
`),{installed:!0,pluginRoot:r,files:[n,i,c,s]}}import{existsSync as ll,mkdirSync as Vr,readFileSync as ul,writeFileSync as Br}from"node:fs";import{join as Kr}from"node:path";var al="memory_agent_ask";function Lr(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${al}

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
`.trim()}var Gr="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",Nt="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function dl(e={}){let t=Qo();Vr(V(),{recursive:!0});let o=`${Gr}
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


${Lr()}

${Nt}`,r=ll(t)?ul(t,"utf8"):"",n=r.indexOf(Gr),i=r.indexOf(Nt);return n>=0&&i>=n?r=r.slice(0,n)+o+r.slice(i+Nt.length):(r=r.trimEnd(),r&&(r+=`

`),r+=o),Br(t,r.trimEnd()+`
`,{encoding:"utf8",mode:384}),t}function qr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[];o.push(dl({cwd:e.cwd}));let r=e.scope??"global",n=[];if((r==="global"||r==="both")&&n.push(e.directory??Wo()),r==="project"||r==="both"){let i=e.cwd??process.cwd();n.push(Kr(i,".opencode","plugins"))}for(let i of n){Vr(i,{recursive:!0});let c=Kr(i,"toolnet-memory.js"),s=`
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
`;Br(c,s.trimStart(),{encoding:"utf8",mode:384}),o.push(c)}return o}import{existsSync as zr,mkdirSync as pl,readFileSync as gl,renameSync as ml,writeFileSync as fl}from"node:fs";import{dirname as Wr,join as yl}from"node:path";function ce(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function hl(e,t){pl(Wr(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;fl(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),ml(o,e)}function Ur(e){if(!zr(e))return{};let t=gl(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing OpenCode config at ${e}: parse error. Not overwriting.`)}if(!ce(o))throw new Error(`Invalid existing OpenCode config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Yr(e,t){if(!ce(e))return!1;let o=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(o)&&o.length===2&&o[0]===t&&o[1]==="mcp"}function Le(e,t,o,r){let n=yl(Wr(e),"opencode.jsonc"),i=zr(n)?n:void 0,c=Ur(e),s=c.mcp;if(s!==void 0&&!ce(s))throw new Error(`Invalid existing OpenCode config: mcp must be an object in ${e}.`);let a=ce(s)?{...s}:{},l=a[o];if(Yr(l,t)&&!r)return{installed:!0,changed:!1,preservedJsonc:i};a[o]={type:"local",command:[t,"mcp"],enabled:!0};let u={...c,mcp:a};hl(e,u);let d=Ur(e);if(!ce(d.mcp)||!Yr(d.mcp[o],t))throw new Error(`OpenCode MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0,preservedJsonc:i}}function Qr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...Le(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:[t,"mcp"]};if(r==="both"){let c=pt(),s=gt({cwd:e.cwd}),a=Le(c,t,o,e.force??!1),l=Le(s,t,o,e.force??!1);return{installed:!0,changed:a.changed||l.changed,configFile:c,serverName:o,command:[t,"mcp"],preservedJsonc:a.preservedJsonc??l.preservedJsonc}}let n=r==="project"?gt({cwd:e.cwd}):pt();return{...Le(n,t,o,e.force??!1),configFile:n,serverName:o,command:[t,"mcp"]}}import{existsSync as kl,mkdirSync as Xr,readFileSync as bl,writeFileSync as Zr}from"node:fs";import{homedir as en}from"node:os";import{dirname as tn,join as _t}from"node:path";function Sl(e){let t=[],o=/"((?:\\.|[^"\\])*)"|'([^']*)'/g,r;for(;r=o.exec(e);){let n=r[1]??r[2]??"";try{t.push(r[1]!==void 0?JSON.parse(`"${n}"`):n)}catch{t.push(n)}}return t}function on(e={}){let t=e.configFile??_t(process.env.CODEX_HOME??_t(en(),".codex"),"config.toml"),o=e.previousFile??_t(en(),".config","toolnet-memory","codex-notify-previous.json");Xr(tn(t),{recursive:!0}),Xr(tn(o),{recursive:!0});let r=kl(t)?bl(t,"utf8"):"",n=e.binary??"toolnet-memory",i=`notify = [${JSON.stringify(n)}, "session:codex-notify"]`,c=r.split(`
`),s=c.findIndex(p=>/^\s*\[/.test(p));s<0&&(s=c.length);let a=-1,l=-1;for(let p=0;p<s;p+=1)if(/^\s*notify\s*=/.test(c[p])){if(a=p,l=p,c[p].includes("[")&&!c[p].includes("]"))for(;l+1<s&&(l+=1,!c[l].includes("]")););break}let u=[];if(a>=0){let p=c.slice(a,l+1).join(`
`);u=Sl(p),c.splice(a,l-a+1,i)}else s=c.findIndex(p=>/^\s*\[/.test(p)),s<0&&(s=c.length),c.splice(s,0,i);let d=u.length>=2&&u[u.length-1]==="session:codex-notify";return u.length>0&&!d&&Zr(o,JSON.stringify(u,null,2)+`
`,{encoding:"utf8",mode:384}),r=c.join(`
`),r.endsWith(`
`)||(r+=`
`),Zr(t,r,{encoding:"utf8",mode:384}),{configFile:t,previousFile:o,preservedPrevious:u.length>0&&!d}}import{existsSync as Il,mkdirSync as wl,readFileSync as vl,writeFileSync as jl}from"node:fs";import{homedir as xl}from"node:os";import{dirname as Cl,join as rn}from"node:path";function Ol(e){return`'${e.replace(/'/g,"'\\''")}'`}function nn(e={}){let t=e.hooksFile??rn(process.env.CODEX_HOME??rn(xl(),".codex"),"hooks.json");wl(Cl(t),{recursive:!0});let o={};if(Il(t))try{o=JSON.parse(vl(t,"utf8"))}catch(s){throw new Error(`Invalid existing Codex hooks.json: ${s instanceof Error?s.message:String(s)}`)}let r=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=r;let i=(Array.isArray(r.SessionStart)?r.SessionStart:[]).filter(s=>{try{return!JSON.stringify(s).includes("session:codex-context")}catch{return!0}}),c=e.binary??"toolnet-memory";return i.push({matcher:"startup|resume|clear|compact",hooks:[{type:"command",command:`${Ol(c)} session:codex-context`,timeout:15,additionalContextLimit:1e3,statusMessage:"Loading ToolNet project continuity"}]}),r.SessionStart=i,jl(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),t}import{existsSync as sn,mkdirSync as Rl,readFileSync as cn,writeFileSync as El}from"node:fs";import{homedir as Pl}from"node:os";import{dirname as Tl,join as an}from"node:path";function ln(e){return`'${e.replace(/'/g,"'\\''")}'`}function un(e={}){let t=e.hooksFile??an(process.env.CODEX_HOME??an(Pl(),".codex"),"hooks.json");Rl(Tl(t),{recursive:!0});let o={};if(sn(t))try{o=JSON.parse(cn(t,"utf8"))}catch{throw new Error(`Invalid existing Codex hooks.json at ${t}: parse error. Not overwriting.`)}let r=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=r;let n=e.binary??"toolnet-memory",i=`${ln(n)} session:codex-stop-hook`,c=`${ln(n)} session:codex-session-end`,s={hooks:[{type:"command",command:i,timeout:30}]},a={hooks:[{type:"command",command:c,timeout:3}]},u=(Array.isArray(r.Stop)?r.Stop:[]).filter(S=>{try{return!JSON.stringify(S).includes("session:codex-stop-hook")}catch{return!0}}),p=(Array.isArray(r.SessionEnd)?r.SessionEnd:[]).filter(S=>{try{return!JSON.stringify(S).includes("session:codex-session-end")}catch{return!0}});r.Stop=[...u,s],r.SessionEnd=[...p,a];let g=JSON.stringify(o,null,2)+`
`,y=!sn(t)||cn(t,"utf8")!==g;return El(t,g,{encoding:"utf8",mode:384}),{hooksFile:t,changed:y,stopInstalled:!0,sessionEndInstalled:!0}}import{spawnSync as Al}from"node:child_process";function Mt(e,t){return Al(e,t,{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}function dn(e,t){let o=Mt(e,["mcp","get",t,"--json"]);if(o.status!==0||!o.stdout)return null;try{return JSON.parse(o.stdout)}catch{return null}}function pn(e,t){return e.enabled!==!1&&e.transport?.type==="stdio"&&e.transport?.command===t&&Array.isArray(e.transport?.args)&&e.transport?.args.length===1&&e.transport.args[0]==="mcp"}function gn(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.codexBinary??"codex",r=e.serverName??"toolnet-memory",n=dn(o,r);if(n&&pn(n,t))return{installed:!0,changed:!1,serverName:r,command:t,args:["mcp"]};if(n){let s=Mt(o,["mcp","remove",r]);if(s.status!==0)return{installed:!1,changed:!1,serverName:r,command:t,args:["mcp"],error:(s.stderr||s.stdout||"Unable to remove old ToolNet MCP configuration.").trim()}}let i=Mt(o,["mcp","add",r,"--",t,"mcp"]);if(i.status!==0)return{installed:!1,changed:!1,serverName:r,command:t,args:["mcp"],error:(i.stderr||i.stdout||"Unable to register ToolNet MCP.").trim()};let c=dn(o,r);return!c||!pn(c,t)?{installed:!1,changed:!0,serverName:r,command:t,args:["mcp"],error:"Codex accepted MCP registration but verification did not match expected ToolNet command."}:{installed:!0,changed:!0,serverName:r,command:t,args:["mcp"]}}import{existsSync as Nl,mkdirSync as _l,readFileSync as Ml,renameSync as Fl,rmSync as $l,writeFileSync as Dl}from"node:fs";import{dirname as Hl}from"node:path";function ae(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Jl(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function Ll(e){if(!Nl(e))return{};let t;try{t=JSON.parse(Ml(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude settings.json: ${o instanceof Error?o.message:String(o)}`)}if(!ae(t))throw new Error("Invalid existing Claude settings.json: root must be a JSON object.");return t}function Ke(e){if(e===void 0)return[];if(!Array.isArray(e))throw new Error("Invalid existing Claude settings.json: hook event must be an array.");let t=[];for(let o of e){if(!ae(o)){t.push(o);continue}let r=o.hooks;if(!Array.isArray(r)){t.push(o);continue}let n=r.filter(i=>{if(!ae(i))return!0;let c=i.command;return!(typeof c=="string"&&c.includes("session:claude-hook"))});n.length!==0&&t.push({...o,hooks:n})}return t}function Ge(e,t=10){return{type:"command",command:e,timeout:t}}function Kl(e,t){_l(Hl(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Dl(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Fl(o,e)}finally{$l(o,{force:!0})}}function mn(e={}){let t=e.settingsFile??Zo(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=Ll(t),n=r.hooks;if(n!==void 0&&!ae(n))throw new Error("Invalid existing Claude settings.json: hooks must be an object.");let i=ae(n)?{...n}:{},c=`${Jl(o)} session:claude-hook`,s=Ke(i.SessionStart);s.push({matcher:"startup|resume|clear|compact",hooks:[Ge(c)]}),i.SessionStart=s;let a=Ke(i.UserPromptSubmit);a.push({hooks:[Ge(c)]}),i.UserPromptSubmit=a;let l=Ke(i.PostToolUse);l.push({matcher:"Edit|Write",hooks:[Ge(c)]}),i.PostToolUse=l;let u=Ke(i.Stop);u.push({hooks:[Ge(c,30)]}),i.Stop=u;let d={...r,hooks:i},p=JSON.stringify(r),g=JSON.stringify(d);return p===g?{settingsFile:t,changed:!1}:e.dryRun===!0?{settingsFile:t,changed:!0,dryRun:!0}:(Kl(t,d),{settingsFile:t,changed:!0})}import{existsSync as Gl,mkdirSync as Vl,readFileSync as Bl,renameSync as ql,rmSync as Ul,writeFileSync as Yl}from"node:fs";import{dirname as zl}from"node:path";function le(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function fn(e){if(!Gl(e))return{};let t;try{t=JSON.parse(Bl(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude Code config: ${o instanceof Error?o.message:String(o)}`)}if(!le(t))throw new Error("Invalid existing Claude Code config: root must be a JSON object.");return t}function yn(e,t){if(!le(e))return!1;let o=e.args;return e.type==="stdio"&&e.command===t&&Array.isArray(o)&&o.length===1&&o[0]==="mcp"}function Wl(e,t){Vl(zl(e),{recursive:!0});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Yl(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),ql(o,e)}finally{Ul(o,{force:!0})}}function hn(e={}){let t=e.stateFile??er(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=fn(t),i=n.mcpServers;if(i!==void 0&&!le(i))throw new Error("Invalid existing Claude Code config: mcpServers must be an object.");let c=le(i)?{...i}:{},s=c[r];if(yn(s,o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:[o,"mcp"],repaired:!1};let a=s!==void 0;if(c[r]={type:"stdio",command:o,args:["mcp"]},e.dryRun===!0)return{installed:!0,changed:!0,configFile:t,serverName:r,command:[o,"mcp"],repaired:a,dryRun:!0};Wl(t,{...n,mcpServers:c});let u=fn(t).mcpServers;if(!le(u)||!yn(u[r],o))throw new Error("Claude Code MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:[o,"mcp"],repaired:a}}function kn(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=mn({binary:t,settingsFile:e.settingsFile,...e.dryRun!==void 0?{dryRun:e.dryRun}:{}}),r=hn({binary:t,stateFile:e.stateFile,...e.dryRun!==void 0?{dryRun:e.dryRun}:{}});return{hooks:o,mcp:r,files:[o.settingsFile,r.configFile]}}import{existsSync as Ql,mkdirSync as Xl,readFileSync as Zl,renameSync as eu,rmSync as tu,writeFileSync as ou}from"node:fs";import{dirname as ru}from"node:path";var B="ToolNet Memory - ";function In(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function nu(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function bn(e){if(!Ql(e))return{};let t=Zl(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro hooks file at ${e}: parse error. Not overwriting.`)}if(!In(o))throw new Error(`Invalid existing Kiro hooks file at ${e}: root must be a JSON object. Not overwriting.`);return o}function Sn(e){return In(e)?typeof e.name=="string"&&e.name.startsWith(B):!1}function ue(e){return{type:"command",command:e}}function iu(e){return[{name:`${B}Session Start`,description:"Inject compact local ToolNet continuity and capture Kiro session activation.",trigger:"SessionStart",action:ue(e),timeout:10,enabled:!0},{name:`${B}Prompt Continuity`,description:"Capture prompts and refresh ToolNet guidance only for resume/continue requests.",trigger:"UserPromptSubmit",action:ue(e),timeout:10,enabled:!0},{name:`${B}Raw History Guard`,description:"Prevent Kiro from reconstructing continuity from raw ToolNet/agent session history.",trigger:"PreToolUse",matcher:"*",action:ue(e),timeout:10,enabled:!0},{name:`${B}Tool Capture`,description:"Capture durable tool activity while filtering noisy read-only events.",trigger:"PostToolUse",matcher:"*",action:ue(e),timeout:15,enabled:!0},{name:`${B}Final Flush`,description:"Flush pending Kiro WAL events when the assistant finishes a turn.",trigger:"Stop",action:ue(e),timeout:30,enabled:!0}]}function su(e,t){Xl(ru(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{ou(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),eu(o,e)}finally{tu(o,{force:!0})}}function Ve(e,t,o){let r=bn(e);if(r.version!==void 0&&r.version!=="v1")throw new Error(`Unsupported existing Kiro hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!Array.isArray(n))throw new Error("Invalid existing Kiro hooks file: hooks must be an array.");let i=Array.isArray(n)?n.filter(l=>!Sn(l)):[],c=iu(t),s={...r,version:"v1",hooks:[...i,...c]};if(!o&&JSON.stringify(r)===JSON.stringify(s))return{changed:!1,hookCount:c.length};su(e,s);let a=bn(e);if(a.version!=="v1"||!Array.isArray(a.hooks)||a.hooks.filter(Sn).length!==c.length)throw new Error("Kiro hooks were written but verification failed.");return{changed:!0,hookCount:c.length}}function wn(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=`${nu(t)} session:kiro-hook`;if(e.hooksFile){let c=Ve(e.hooksFile,r,e.force??!1);return{hooksFile:e.hooksFile,...c}}if(o==="both"){let c=kt(),s=bt({cwd:e.cwd}),a=Ve(c,r,e.force??!1),l=Ve(s,r,e.force??!1);return{hooksFile:c,changed:a.changed||l.changed,hookCount:a.hookCount}}let n=o==="project"?bt({cwd:e.cwd}):kt(),i=Ve(n,r,e.force??!1);return{hooksFile:n,...i}}import{existsSync as cu,mkdirSync as au,readFileSync as lu,renameSync as uu,rmSync as du,writeFileSync as pu}from"node:fs";import{dirname as gu}from"node:path";function de(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function vn(e){if(!cu(e))return{};let t=lu(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro MCP config at ${e}: parse error. Not overwriting.`)}if(!de(o))throw new Error(`Invalid existing Kiro MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function jn(e,t){return de(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&e.disabled===!1:!1}function mu(e,t){au(gu(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{pu(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),uu(o,e)}finally{du(o,{force:!0})}}function Be(e,t,o,r){let n=vn(e),i=n.mcpServers;if(i!==void 0&&!de(i))throw new Error(`Invalid existing Kiro MCP config: mcpServers must be an object in ${e}.`);let c=de(i)?{...i}:{},s=c[o];if(jn(s,t)&&!r)return{installed:!0,changed:!1};c[o]={command:t,args:["mcp"],disabled:!1};let a={...n,mcpServers:c};mu(e,a);let u=vn(e).mcpServers;if(!de(u)||!jn(u[o],t))throw new Error(`Kiro MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function xn(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...Be(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(r==="both"){let c=Ee(),s=ht({cwd:e.cwd}),a=Be(c,t,o,e.force??!1),l=Be(s,t,o,e.force??!1);return{installed:!0,changed:a.changed||l.changed,configFile:c,serverName:o,command:t,args:["mcp"]}}let n=r==="project"?ht({cwd:e.cwd}):Ee();return{...Be(n,t,o,e.force??!1),configFile:n,serverName:o,command:t,args:["mcp"]}}function Cn(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=xn({binary:t,configFile:e.configFile,scope:e.scope,cwd:e.cwd,force:e.force}),r=wn({binary:t,hooksFile:e.hooksFile,scope:e.scope,cwd:e.cwd,force:e.force});return{installed:o.installed,changed:o.changed||r.changed,mcp:o,hooks:r,files:[o.configFile,r.hooksFile]}}import{existsSync as fu,mkdirSync as yu,readFileSync as hu,renameSync as ku,rmSync as bu,writeFileSync as Su}from"node:fs";import{dirname as Iu}from"node:path";function Ft(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function wu(e){if(!fu(e))return{};let t=hu(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: parse error. Not overwriting.`)}if(!Ft(o))throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function vu(e,t){yu(Iu(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Su(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),ku(o,e)}finally{bu(o,{force:!0})}}function On(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??rr({cwd:e.cwd}),r=wu(o),n="toolnet-memory";if(Ft(r.mcpServers)&&r.mcpServers[n]!=null&&!e.force)return{installed:!0,changed:!1,configFile:o};let c=Ft(r.mcpServers)?{...r.mcpServers}:{};return c[n]={command:t,args:["mcp"]},r.mcpServers=c,vu(o,r),{installed:!0,changed:!0,configFile:o}}function Rn(e={}){let t=e.binary??"toolnet-memory",o=On({binary:t,configFile:e.configFile,force:e.force,cwd:e.cwd});return{installed:o.installed,changed:o.changed,mcp:{...o,configured:o.installed},files:[o.configFile]}}import{mkdirSync as Tu,existsSync as Au}from"node:fs";import{dirname as Nu}from"node:path";import{existsSync as ju,mkdirSync as xu,readFileSync as Cu,renameSync as Ou,rmSync as Ru,writeFileSync as Eu}from"node:fs";import{dirname as Pu}from"node:path";function h(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function O(e,t){if(!ju(e))return{};let o=Cu(e,"utf8").trim();if(!o)return{};let r;try{r=JSON.parse(o)}catch(n){throw new Error(`Invalid existing ${t} MCP config: ${n instanceof Error?n.message:String(n)}`)}if(!h(r))throw new Error(`Invalid existing ${t} MCP config: root must be a JSON object.`);return r}function P(e,t){xu(Pu(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Eu(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Ou(o,e)}finally{Ru(o,{force:!0})}}function En(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??wt(),r=Nu(o);Au(r)||Tu(r,{recursive:!0});let n=O(o,"Kilo"),i=n.mcp;if(i!==void 0&&!h(i))throw new Error("Invalid existing Kilo config: mcp must be an object.");let c=h(i)?{...i}:{},s="toolnet-memory";return h(c[s])&&!e.force?{installed:!0,changed:!1,configFile:o,configured:!0}:(c[s]={type:"local",command:[t,"mcp"],enabled:!0,timeout:1e4},P(o,{...n,mcp:c}),{installed:!0,changed:!0,configFile:o,configured:!0})}function Pn(e={}){let t=e.binary??"toolnet-memory",o=En({binary:t,configFile:e.configFile,force:e.force});return{installed:o.installed,changed:o.changed,mcp:o,files:[o.configFile]}}import{existsSync as _u,mkdirSync as Mu,readFileSync as Fu,renameSync as $u,rmSync as Du,writeFileSync as Hu}from"node:fs";import{dirname as Ju}from"node:path";function w(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function A(e,t){if(!_u(e))return{};let o=Fu(e,"utf8").trim();if(!o)return{};let r;try{r=JSON.parse(o)}catch(n){throw new Error(`Invalid existing ${t} hooks file: ${n instanceof Error?n.message:String(n)}`)}if(!w(r))throw new Error(`Invalid existing ${t} hooks file: root must be a JSON object.`);return r}function q(e,t){Mu(Ju(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Hu(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),$u(o,e)}finally{Du(o,{force:!0})}}function $t(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}var pe=[["sessionStart",10],["beforeSubmitPrompt",10],["preToolUse",10],["postToolUse",15],["afterAgentResponse",15],["stop",30]];function Tn(e){return w(e)&&typeof e.command=="string"&&e.command.includes("session:cursor-hook")}function Lu(e,t,o){let n={type:"command",command:`TOOLNET_HOOK_EVENT=${$t(e)} ${$t(t)} session:cursor-hook`,timeout:o};return e==="preToolUse"&&(n.matcher=".*"),n}function Dt(e={}){let t=e.hooksFile??Ae(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=A(t,"Cursor");if(r.version!==void 0&&r.version!==1)throw new Error(`Unsupported existing Cursor hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!w(n))throw new Error("Invalid existing Cursor hooks file: hooks must be an object.");let i=w(n)?{...n}:{};for(let[l,u]of pe){let d=i[l];if(d!==void 0&&!Array.isArray(d))throw new Error(`Invalid existing Cursor hooks file: hooks.${l} must be an array.`);let p=Array.isArray(d)?d.filter(g=>!Tn(g)):[];i[l]=[...p,Lu(l,o,u)]}let c={...r,version:1,hooks:i};if(JSON.stringify(r)===JSON.stringify(c))return{hooksFile:t,changed:!1,hookCount:pe.length};q(t,c);let s=A(t,"Cursor");if(s.version!==1||!w(s.hooks))throw new Error("Cursor hooks were written but verification failed.");let a=0;for(let[l]of pe){let u=s.hooks[l];if(!Array.isArray(u))throw new Error("Cursor hooks were written but verification failed.");a+=u.filter(Tn).length}if(a!==pe.length)throw new Error("Cursor hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:pe.length}}function An(e,t){return h(e)?(e.type===void 0||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function Ht(e={}){let t=e.configFile??Te(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=O(t,"Cursor"),i=n.mcpServers;if(i!==void 0&&!h(i))throw new Error("Invalid existing Cursor MCP config: mcpServers must be an object.");let c=h(i)?{...i}:{};if(An(c[r],o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};c[r]={type:"stdio",command:o,args:["mcp"]},P(t,{...n,mcpServers:c});let a=O(t,"Cursor").mcpServers;if(!h(a)||!An(a[r],o))throw new Error("Cursor MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}import{mkdirSync as Ku,readFileSync as Nn,renameSync as Gu,rmSync as Vu,writeFileSync as Bu}from"node:fs";import{dirname as qu}from"node:path";var Jt=`---
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
`;function Uu(e,t){Ku(qu(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Bu(o,t,{encoding:"utf8",mode:384}),Gu(o,e)}finally{Vu(o,{force:!0})}}function _n(e){let t=e.ruleFile??lr(e.projectRoot);try{if(Nn(t,"utf8")===Jt)return{ruleFile:t,changed:!1}}catch{}if(Uu(t,Jt),Nn(t,"utf8")!==Jt)throw new Error("Cursor ToolNet project rule was written but verification failed.");return{ruleFile:t,changed:!0}}import{spawnSync as Yu}from"node:child_process";import{existsSync as U,statSync as zu}from"node:fs";import{dirname as Wu,join as Qu,parse as Xu,resolve as Kt}from"node:path";function Mn(e){let t=Kt(e);if(!U(t))throw new Error(`Project path does not exist: ${t}`);if(!zu(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);return t}function qe(e){return Qu(e,".toolnet","project.json")}function Zu(e){let t=Kt(e),o=Xu(t).root;for(;;){if(U(qe(t)))return t;if(t===o)return;let r=Wu(t);if(r===t)return;t=r}}function Lt(e){let t=Yu("git",["rev-parse","--show-toplevel"],{cwd:e,encoding:"utf8",timeout:5e3});if(t.status!==0)return;let o=t.stdout.trim();return o?Kt(o):void 0}function N(e={}){let t=Mn(e.cwd??process.cwd());if(e.project){let n=Mn(e.project),i=qe(n),c=Lt(n);return{root:n,source:"explicit",eligible:!0,toolnetProject:U(i),manifestFile:U(i)?i:void 0,gitRoot:c}}let o=Zu(t);if(o){let n=qe(o);return{root:o,source:"toolnet",eligible:!0,toolnetProject:!0,manifestFile:n,gitRoot:Lt(o)}}let r=Lt(t);if(r){let n=qe(r);return{root:r,source:"git",eligible:!0,toolnetProject:U(n),manifestFile:U(n)?n:void 0,gitRoot:r}}return{root:t,source:"cwd",eligible:!1,toolnetProject:!1}}function Hn(e,t={}){let o=[],r=e.indexOf("--scope");if(r>=0){let i=e[r+1];if(i!=="global"&&i!=="project"&&i!=="both")throw new Error(`Invalid --scope value: ${String(i)}`);o.push(i)}e.includes("--global")&&o.push("global"),e.includes("--both")&&o.push("both");let n=Array.from(new Set(o));if(n.length>1)throw new Error(`Conflicting integration scopes: ${n.join(", ")}`);return n[0]??t.defaultScope??"global"}function Fn(e,t){return{install:e,effective:t}}function _(e,t){return{surface:e,global:Fn(t.globalInstall,t.effective==="global"||t.effective==="both"),project:Fn(t.projectInstall,t.effective==="project"||t.effective==="both"),effective:t.effective,risk:t.risk??"none",dedupeRequired:t.dedupeRequired??!1,trustRequired:t.trustRequired??t.projectInstall,note:t.note}}function ed(e){return{mcp:_("mcp",{globalInstall:!0,projectInstall:!1,effective:"global"}),hooks:_("hooks",{globalInstall:!0,projectInstall:!1,effective:"global"}),work:_("work",{globalInstall:e==="grok",projectInstall:!1,effective:e==="grok"?"global":"none",note:e==="grok"?"Grok supports a global ToolNet continuity skill.":"Cursor/Copilot work instructions remain project-scoped."})}}function $n(e){return{mcp:_("mcp",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),hooks:_("hooks",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),work:_("work",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!1,note:e==="cursor"?"Use .cursor/rules/toolnet-memory.mdc.":e==="copilot"?"Use .github/instructions/toolnet-memory.instructions.md.":"Use .grok/skills/toolnet-continuity/SKILL.md."})}}function Dn(e){return{mcp:_("mcp",{globalInstall:!0,projectInstall:!0,effective:"project",risk:e==="cursor"?"precedence-unverified":"shadowed-global",trustRequired:!0,note:e==="cursor"?"Project ToolNet MCP is the intended effective definition; native same-name precedence must be E2E certified before release.":"Global remains useful outside the project; same-name project definition wins inside the project."}),hooks:_("hooks",{globalInstall:!0,projectInstall:!0,effective:"both",risk:"additive-duplicate",dedupeRequired:!0,trustRequired:!0,note:"Global and project hook sources can both execute for the same native event."}),work:_("work",{globalInstall:e==="grok",projectInstall:!0,effective:"project",risk:e==="grok"?"shadowed-global":"none",trustRequired:!1,note:e==="cursor"?"Project rule is authoritative.":e==="copilot"?"Project instruction is authoritative.":"Project skill shadows the same-name global skill inside the project."})}}function Y(e){let{agent:t,scope:o,project:r}=e;return(o==="project"||o==="both")&&(!r||!r.eligible)?{agent:t,requestedScope:o,project:r,surfaces:o==="both"?Dn(t):$n(t),canInstall:!1,reason:"Project scope requires an explicit project, existing ToolNet project, or Git repository root."}:{agent:t,requestedScope:o,project:r,surfaces:o==="global"?ed(t):o==="project"?$n(t):Dn(t),canInstall:!0}}function Jn(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.rule?.changed)}function Ln(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:N({project:e.projectRoot}),n=Y({agent:"cursor",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Cursor project integration scope cannot be resolved.");let i,c;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(i={},n.surfaces.mcp.global.install&&(i.mcp=Ht({binary:t,configFile:e.configFile??Te()})),n.surfaces.hooks.global.install&&(i.hooks=Dt({binary:t,hooksFile:e.hooksFile??Ae()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Cursor project integration requires an eligible project root.");c={},n.surfaces.mcp.project.install&&(c.mcp=Ht({binary:t,configFile:e.projectConfigFile??cr(r.root)})),n.surfaces.hooks.project.install&&(c.hooks=Dt({binary:t,hooksFile:e.projectHooksFile??ar(r.root)})),n.surfaces.work.project.install&&(c.rule=_n({projectRoot:r.root,ruleFile:e.projectRuleFile}))}let s=c?.mcp??i?.mcp,a=c?.hooks??i?.hooks;if(!s||!a)throw new Error("Cursor integration did not produce an effective MCP/hooks installation.");let l=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.rule?.ruleFile,c?.mcp?.configFile,c?.hooks?.hooksFile,c?.rule?.ruleFile].filter(u=>typeof u=="string")));return{installed:!0,changed:Jn(i)||Jn(c),scope:o,plan:n,project:r,global:i,projectScope:c,mcp:s,hooks:a,rule:c?.rule,files:l}}var ge=[["sessionStart",10],["userPromptSubmitted",10],["userPromptTransformed",10],["preToolUse",10],["postToolUse",15],["agentStop",30]];function td(e){if(typeof e.command=="string")return e.command;if(typeof e.bash=="string")return e.bash}function Kn(e){return w(e)&&td(e)?.includes("session:copilot-hook")===!0}function od(e,t,o){let r={type:"command",command:`${t} session:copilot-hook`,env:{TOOLNET_HOOK_EVENT:e},timeoutSec:o};return e==="preToolUse"&&(r.matcher=".*"),r}function Gt(e={}){let t=e.hooksFile??_e(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=A(t,"GitHub Copilot CLI");if(r.version!==void 0&&r.version!==1)throw new Error(`Unsupported existing GitHub Copilot CLI hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!w(n))throw new Error("Invalid existing GitHub Copilot CLI hooks file: hooks must be an object.");let i=w(n)?{...n}:{};for(let[l,u]of ge){let d=i[l];if(d!==void 0&&!Array.isArray(d))throw new Error(`Invalid existing GitHub Copilot CLI hooks file: hooks.${l} must be an array.`);let p=Array.isArray(d)?d.filter(g=>!Kn(g)):[];i[l]=[...p,od(l,o,u)]}let c={...r,version:1,hooks:i};if(JSON.stringify(r)===JSON.stringify(c))return{hooksFile:t,changed:!1,hookCount:ge.length};q(t,c);let s=A(t,"GitHub Copilot CLI");if(s.version!==1||!w(s.hooks))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");let a=0;for(let[l]of ge){let u=s.hooks[l];if(!Array.isArray(u))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");a+=u.filter(Kn).length}if(a!==ge.length)throw new Error("GitHub Copilot CLI hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:ge.length}}function Gn(e,t){return h(e)?(e.type===void 0||e.type==="local"||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&Array.isArray(e.tools)&&e.tools.length===1&&e.tools[0]==="*":!1}function Vt(e={}){let t=e.configFile??Ne(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=O(t,"GitHub Copilot CLI"),i=n.mcpServers;if(i!==void 0&&!h(i))throw new Error("Invalid existing GitHub Copilot CLI MCP config: mcpServers must be an object.");let c=h(i)?{...i}:{};if(Gn(c[r],o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};c[r]={type:"stdio",command:o,args:["mcp"],tools:["*"]},P(t,{...n,mcpServers:c});let a=O(t,"GitHub Copilot CLI").mcpServers;if(!h(a)||!Gn(a[r],o))throw new Error("GitHub Copilot CLI MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}import{mkdirSync as rd,readFileSync as Vn,renameSync as nd,rmSync as id,writeFileSync as sd}from"node:fs";import{dirname as cd}from"node:path";var Bt=`---
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
`;function ad(e,t){rd(cd(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{sd(o,t,{encoding:"utf8",mode:384}),nd(o,e)}finally{id(o,{force:!0})}}function Bn(e){let t=e.instructionFile??gr(e.projectRoot);try{if(Vn(t,"utf8")===Bt)return{instructionFile:t,changed:!1}}catch{}if(ad(t,Bt),Vn(t,"utf8")!==Bt)throw new Error("Copilot ToolNet project instruction verification failed.");return{instructionFile:t,changed:!0}}function qn(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.instruction?.changed)}function Un(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:N({project:e.projectRoot}),n=Y({agent:"copilot",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Copilot project integration scope cannot be resolved.");let i,c;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(i={},n.surfaces.mcp.global.install&&(i.mcp=Vt({binary:t,configFile:e.configFile??Ne()})),n.surfaces.hooks.global.install&&(i.hooks=Gt({binary:t,hooksFile:e.hooksFile??_e()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Copilot project integration requires an eligible project root.");c={},n.surfaces.mcp.project.install&&(c.mcp=Vt({binary:t,configFile:e.projectConfigFile??dr(r.root)})),n.surfaces.hooks.project.install&&(c.hooks=Gt({binary:t,hooksFile:e.projectHooksFile??pr(r.root)})),n.surfaces.work.project.install&&(c.instruction=Bn({projectRoot:r.root,instructionFile:e.projectInstructionFile}))}let s=c?.mcp??i?.mcp,a=c?.hooks??i?.hooks;if(!s||!a)throw new Error("Copilot integration did not produce effective MCP/hooks.");let l=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.instruction?.instructionFile,c?.mcp?.configFile,c?.hooks?.hooksFile,c?.instruction?.instructionFile].filter(u=>typeof u=="string")));return{installed:!0,changed:qn(i)||qn(c),scope:o,plan:n,project:r,global:i,projectScope:c,mcp:s,hooks:a,instruction:c?.instruction,files:l}}import{existsSync as ld,mkdirSync as ud,readFileSync as Yn,renameSync as dd,rmSync as pd,writeFileSync as gd}from"node:fs";import{dirname as md}from"node:path";var qt=`---
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
`;function fd(e,t){ud(md(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{gd(o,t,{encoding:"utf8",mode:384}),dd(o,e)}finally{pd(o,{force:!0})}}function Ut(e={}){let t=e.skillFile??De();if(ld(t)&&Yn(t,"utf8")===qt)return{skillFile:t,changed:!1};if(fd(t,qt),Yn(t,"utf8")!==qt)throw new Error("Grok ToolNet continuity skill was written but verification failed.");return{skillFile:t,changed:!0}}var me=[["SessionStart",10],["UserPromptSubmit",10],["PreToolUse",10],["PostToolUse",15],["Stop",30]];function zn(e){return!w(e)||!Array.isArray(e.hooks)?!1:e.hooks.some(t=>w(t)&&typeof t.command=="string"&&t.command.includes("session:grok-hook"))}function yd(e,t,o){let r={hooks:[{type:"command",command:`${t} session:grok-hook`,timeout:o,env:{TOOLNET_HOOK_EVENT:e}}]};return e==="PreToolUse"&&(r.matcher=".*"),r}function Yt(e={}){let t=e.hooksFile??$e(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=A(t,"Grok Build"),n=r.hooks;if(n!==void 0&&!w(n))throw new Error("Invalid existing Grok Build hooks file: hooks must be an object.");let i=w(n)?{...n}:{};for(let[l,u]of me){let d=i[l];if(d!==void 0&&!Array.isArray(d))throw new Error(`Invalid existing Grok Build hooks file: hooks.${l} must be an array.`);let p=Array.isArray(d)?d.filter(g=>!zn(g)):[];i[l]=[...p,yd(l,o,u)]}let c={...r,hooks:i};if(JSON.stringify(r)===JSON.stringify(c))return{hooksFile:t,changed:!1,hookCount:me.length};q(t,c);let s=A(t,"Grok Build");if(!w(s.hooks))throw new Error("Grok Build hooks were written but verification failed.");let a=0;for(let[l]of me){let u=s.hooks[l];if(!Array.isArray(u))throw new Error("Grok Build hooks were written but verification failed.");a+=u.filter(zn).length}if(a!==me.length)throw new Error("Grok Build hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:me.length}}import{existsSync as hd,mkdirSync as kd,readFileSync as bd,renameSync as Sd,rmSync as Id,writeFileSync as wd}from"node:fs";import{dirname as vd}from"node:path";function Wn(e){return hd(e)?bd(e,"utf8"):""}function jd(e,t){kd(vd(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{wd(o,t,{encoding:"utf8",mode:384}),Sd(o,e)}finally{Id(o,{force:!0})}}function zt(e){return e.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t")}function xd(e){return`[mcp_servers."${zt(e)}"]`}function Cd(e,t){return[xd(e),`command = "${zt(t)}"`,'args = ["mcp"]',"enabled = true"].join(`
`)}function Od(e){let t=e.trim();return t.startsWith("[")&&t.includes("]")}function Ue(e){return e.trim().replace(/\s+/g,"")}function Rd(e){return new Set([Ue(`[mcp_servers.${e}]`),Ue(`[mcp_servers."${e}"]`),Ue(`[mcp_servers.'${e}']`)])}function Xn(e,t){let o=e.split(/\r?\n/),r=Rd(t),n=-1;for(let u=0;u<o.length;u+=1){let d=Ue(o[u].replace(/\s+#.*$/,""));if(r.has(d)){n=u;break}}if(n<0)return null;let i=o.length;for(let u=n+1;u<o.length;u+=1)if(Od(o[u])){i=u;break}let c=[],s=0;for(let u of o)c.push(s),s+=u.length+1;let a=c[n]??0,l=i>=o.length?e.length:c[i]??e.length;return{start:a,end:l}}function Ed(e,t,o){let r=`${Cd(t,o)}
`,n=Xn(e,t);if(n){let i=e.slice(0,n.start),c=e.slice(n.end);return`${i}${r}${c.replace(/^\n+/,"")}`}return e.trim()?`${e.replace(/\s*$/,"")}

${r}`:r}function Qn(e,t,o){let r=Xn(e,t);if(!r)return!1;let n=e.slice(r.start,r.end);return n.includes(`command = "${zt(o)}"`)&&/args\s*=\s*\[\s*"mcp"\s*\]/.test(n)&&/enabled\s*=\s*true/.test(n)}function Wt(e={}){let t=e.configFile??Fe(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=Wn(t);if(Qn(n,r,o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};let i=Ed(n,r,o);jd(t,i);let c=Wn(t);if(!Qn(c,r,o))throw new Error("Grok Build MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}function Zn(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.skill?.changed)}function ei(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:N({project:e.projectRoot}),n=Y({agent:"grok",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Grok project integration scope cannot be resolved.");let i,c;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(i={},n.surfaces.mcp.global.install&&(i.mcp=Wt({binary:t,configFile:e.configFile??Fe()})),n.surfaces.hooks.global.install&&(i.hooks=Yt({binary:t,hooksFile:e.hooksFile??$e()})),n.surfaces.work.global.install&&(i.skill=Ut({skillFile:e.skillFile??De()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Grok project integration requires an eligible project root.");c={},n.surfaces.mcp.project.install&&(c.mcp=Wt({binary:t,configFile:e.projectConfigFile??fr(r.root)})),n.surfaces.hooks.project.install&&(c.hooks=Yt({binary:t,hooksFile:e.projectHooksFile??yr(r.root)})),n.surfaces.work.project.install&&(c.skill=Ut({skillFile:e.projectSkillFile??hr(r.root)}))}let s=c?.mcp??i?.mcp,a=c?.hooks??i?.hooks,l=c?.skill??i?.skill;if(!s||!a||!l)throw new Error("Grok integration did not produce effective MCP/hooks/skill.");let u=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.skill?.skillFile,c?.mcp?.configFile,c?.hooks?.hooksFile,c?.skill?.skillFile].filter(d=>typeof d=="string")));return{installed:!0,changed:Zn(i)||Zn(c),scope:o,plan:n,project:r,global:i,projectScope:c,mcp:s,hooks:a,skill:l,files:u}}import{existsSync as ti,mkdirSync as Pd,readFileSync as oi,renameSync as Td,rmSync as Ad,writeFileSync as Nd}from"node:fs";import{dirname as _d}from"node:path";function Ye(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Md(e){return`'${e.replace(/'/g,"'\\''")}'`}function Fd(e){if(!ti(e))return{};let t=oi(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Gemini settings.json at ${e}: parse error. Not overwriting.`)}if(!Ye(o))throw new Error(`Invalid existing Gemini settings.json at ${e}: root must be an object.`);return o}function $d(e,t){Pd(_d(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Nd(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Td(o,e)}finally{Ad(o,{force:!0})}}function Dd(e){return Ye(e)?(typeof e.command=="string"?e.command:"").includes("session:gemini-hook"):!1}function ri(e={}){let t=e.settingsFile??Ot(),o=Fd(t),r=e.binary??"toolnet-memory",n=`${Md(r)} session:gemini-hook`,i=Ye(o.hooks)?{...o.hooks}:{},c=["SessionStart","SessionEnd"];for(let l of c){let d=(Array.isArray(i[l])?[...i[l]]:[]).map(p=>{if(!Ye(p)||!Array.isArray(p.hooks))return p;let g=p.hooks.filter(y=>!Dd(y));return g.length>0?{...p,hooks:g}:void 0}).filter(p=>p!==void 0);d.push({hooks:[{name:"toolnet-memory",type:"command",command:n,timeout:l==="SessionEnd"?1e4:3e4}]}),i[l]=d}o.hooks=i;let s=`${JSON.stringify(o,null,2)}
`,a=!ti(t)||oi(t,"utf8")!==s;return $d(t,o),{settingsFile:t,changed:a,events:[...c]}}import{existsSync as ni,mkdirSync as Hd,readFileSync as ii,renameSync as Jd,rmSync as Ld,writeFileSync as Kd}from"node:fs";import{dirname as Gd}from"node:path";function ze(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Qt(e){return`'${e.replace(/'/g,"'\\''")}'`}function Vd(e){if(!ni(e))return{};let t=ii(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Junie config.json at ${e}: parse error. Not overwriting.`)}if(!ze(o))throw new Error(`Invalid existing Junie config.json at ${e}: root must be an object.`);return o}function Bd(e,t){Hd(Gd(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Kd(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Jd(o,e)}finally{Ld(o,{force:!0})}}function si(e={}){let t=e.configFile??Rt(),o=Vd(t),r=e.binary??"toolnet-memory",n=e.projectRoot??process.cwd(),i=`${Qt(r)} session:junie-hook --project ${Qt(n)}`,c=ze(o.hooks)?{...o.hooks}:{},s=[{name:"SessionStart",timeout:10},{name:"Stop",timeout:30},{name:"SessionEnd",timeout:8}],a=d=>!ze(d)||typeof d.command!="string"||!d.command.includes("session:junie-hook")?!1:d.command.includes(Qt(n))||!d.command.includes("--project");for(let d of s){let g=(Array.isArray(c[d.name])?[...c[d.name]]:[]).map(y=>{if(!ze(y)||!Array.isArray(y.hooks))return y;let S=y.hooks.filter(z=>!a(z));return S.length>0?{...y,hooks:S}:void 0}).filter(y=>y!==void 0);g.push({hooks:[{type:"command",command:i,timeout:d.timeout}]}),c[d.name]=g}o.hooks=c;let l=`${JSON.stringify(o,null,2)}
`,u=!ni(t)||ii(t,"utf8")!==l;return Bd(t,o),{configFile:t,changed:u,events:s.map(d=>d.name)}}import{existsSync as FS,mkdirSync as qd}from"node:fs";import{dirname as Ud}from"node:path";function ci(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??jr({cwd:e.cwd});qd(Ud(o),{recursive:!0,mode:448});let r=O(o,"Codebuff"),n=r.mcpServers;if(n!==void 0&&!h(n))throw new Error("Invalid existing Codebuff .agents/mcp.json: mcpServers must be an object.");let i=h(n)?{...n}:{},c="toolnet-memory";return h(i[c])&&!e.force?{installed:!0,changed:!1,configFile:o,configured:!0}:(i[c]={command:t,args:["mcp"]},P(o,{...r,mcpServers:i}),{installed:!0,changed:!0,configFile:o,configured:!0})}function ai(e={}){let t=ci(e);return{installed:t.installed,changed:t.changed,mcp:t,files:[t.configFile]}}import{existsSync as VS,mkdirSync as Yd}from"node:fs";import{dirname as zd}from"node:path";function li(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??Or({cwd:e.cwd});Yd(zd(o),{recursive:!0,mode:448});let r=O(o,"Freebuff"),n=r.mcpServers;if(n!==void 0&&!h(n))throw new Error("Invalid existing Freebuff .agents/mcp.json: mcpServers must be an object.");let i=h(n)?{...n}:{},c="toolnet-memory";return h(i[c])&&!e.force?{installed:!0,changed:!1,configFile:o,configured:!0}:(i[c]={command:t,args:["mcp"]},P(o,{...r,mcpServers:i}),{installed:!0,changed:!0,configFile:o,configured:!0})}function ui(e={}){let t=li(e);return{installed:t.installed,changed:t.changed,mcp:t,files:[t.configFile]}}import{existsSync as mi,mkdirSync as tI,readFileSync as fi,renameSync as oI,rmSync as rI,writeFileSync as Xd}from"node:fs";import{homedir as Wd}from"node:os";import{join as di}from"node:path";function Qd(e="toolnet-memory",t={}){return di(t.home??Wd(),".agents","plugins",e)}function pi(e="toolnet-memory",t={}){return di(Qd(e,t),"hooks","hooks.json")}function gi(e){return`'${e.replace(/'/g,"'\\''")}'`}function Zd(e){if(!mi(e))return{};let t;try{t=JSON.parse(fi(e,"utf8"))}catch{throw new Error(`Invalid existing Goose hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Goose hooks.json at ${e}: root must be a JSON object.`);return t}function yi(e={}){let t=e.pluginName??"toolnet-memory",o=e.hooksFile??pi(t),r=Zd(o),n=e.binary??"toolnet-memory",i=`${gi(n)} session:goose-hook`,c=`${gi(n)} session:goose-hook`,s={type:"command",command:i,timeout:30},a={type:"command",command:c,timeout:3},l=r.hooks&&typeof r.hooks=="object"&&!Array.isArray(r.hooks)?r.hooks:{};r.hooks=l;let d=(Array.isArray(l.Stop)?l.Stop:[]).filter(z=>{try{return!JSON.stringify(z).includes("session:goose-hook")}catch{return!0}}),g=(Array.isArray(l.SessionEnd)?l.SessionEnd:[]).filter(z=>{try{return!JSON.stringify(z).includes("session:goose-hook")}catch{return!0}});l.Stop=[...d,{hooks:[s]}],l.SessionEnd=[...g,{hooks:[a]}];let y=JSON.stringify(r,null,2)+`
`,S=!mi(o)||fi(o,"utf8")!==y;return Xd(o,y,{encoding:"utf8",mode:384}),{hooksFile:o,changed:S,stopInstalled:!0,sessionEndInstalled:!0}}function hi(e={}){let t=yi(e);return{hooksFile:t.hooksFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as Ii,mkdirSync as tp,readFileSync as wi,renameSync as op,rmSync as rp,writeFileSync as np}from"node:fs";import{dirname as ip}from"node:path";import{homedir as ep}from"node:os";import{join as ki}from"node:path";function bi(e={}){let t=e.projectRoot;return t?ki(t,".qwen","hooks.json"):ki(e.home??ep(),".qwen","hooks.json")}function Si(e){return`'${e.replace(/'/g,"'\\''")}'`}function sp(e){if(!Ii(e))return{};let t;try{t=JSON.parse(wi(e,"utf8"))}catch{throw new Error(`Invalid existing Qwen hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Qwen hooks.json at ${e}: root must be a JSON object.`);return t}function cp(e,t){tp(ip(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{np(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),op(o,e)}finally{rp(o,{force:!0})}}function vi(e={}){let t=e.hooksFile??bi({projectRoot:e.projectRoot}),o=sp(t),r=e.binary??"toolnet-memory",n=`${Si(r)} session:qwen-hook`,i=`${Si(r)} session:qwen-hook`,c={type:"command",command:n,timeout:30},s={type:"command",command:i,timeout:3},a=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=a;let u=(Array.isArray(a.Stop)?a.Stop:[]).filter(S=>{try{return!JSON.stringify(S).includes("session:qwen-hook")}catch{return!0}}),p=(Array.isArray(a.SessionEnd)?a.SessionEnd:[]).filter(S=>{try{return!JSON.stringify(S).includes("session:qwen-hook")}catch{return!0}});a.Stop=[...u,{hooks:[c]}],a.SessionEnd=[...p,{hooks:[s]}];let g=JSON.stringify(o,null,2)+`
`,y=!Ii(t)||wi(t,"utf8")!==g;return cp(t,o),{hooksFile:t,changed:y,stopInstalled:!0,sessionEndInstalled:!0}}function ji(e={}){let t=vi(e);return{hooksFile:t.hooksFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as Ri,mkdirSync as up,readFileSync as dp,renameSync as pp,rmSync as gp,writeFileSync as mp}from"node:fs";import{dirname as fp}from"node:path";import{homedir as ap}from"node:os";import{join as lp}from"node:path";function xi(e={}){return lp(e.home??ap(),".kimi-code","config.toml")}function Ci(e){return`'${e.replace(/'/g,"'\\''")}'`}function yp(e){return Ri(e)?dp(e,"utf8"):""}function Oi(e,t){up(fp(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{mp(o,t,{encoding:"utf8",mode:384}),pp(o,e)}finally{gp(o,{force:!0})}}function Ei(e={}){let t=e.configFile??xi(),o=yp(t),r=e.binary??"toolnet-memory",n=`${Ci(r)} session:kimi-hook`,i=`${Ci(r)} session:kimi-hook`,c=`[[hooks]]
name = "toolnet-memory-stop"
event = "Stop"
command = ${n}
timeout = 30
`,s=`[[hooks]]
name = "toolnet-memory-session-end"
event = "SessionEnd"
command = ${i}
timeout = 3
`,a=!1;return o.includes("toolnet-memory-stop")||(o=o.trim()+`

`+c+`
`,a=!0),o.includes("toolnet-memory-session-end")||(o=o.trim()+`

`+s+`
`,a=!0),a?Oi(t,o):Ri(t)||(Oi(t,c+`
`+s+`
`),a=!0),{configFile:t,changed:a,stopInstalled:!0,sessionEndInstalled:!0}}function Pi(e={}){let t=Ei(e);return{configFile:t.configFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as Ai,mkdirSync as bp,readFileSync as Sp,renameSync as Ip,rmSync as wp,writeFileSync as vp}from"node:fs";import{dirname as jp}from"node:path";import{homedir as hp}from"node:os";import{join as kp}from"node:path";function Ti(e={}){return kp(e.home??hp(),".hermes","config.yaml")}function xp(e){return`'${e.replace(/'/g,"'\\''")}'`}function Cp(e){return Ai(e)?Sp(e,"utf8"):""}function Op(e,t){bp(jp(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{vp(o,t,{encoding:"utf8",mode:384}),Ip(o,e)}finally{wp(o,{force:!0})}}function Ni(e={}){let t=e.configFile??Ti(),o=Cp(t),r=e.binary??"toolnet-memory",i=`  - name: toolnet-memory-session-end
    event: on_session_end
    command: ${`${xp(r)} session:hermes-hook`}
    timeout: 30
`,c=!1;return o.includes("toolnet-memory-session-end")||(o.includes("hooks:")?o=o.replace(/hooks:\n/,`hooks:
${i}`):o=o.trim()+`

hooks:
`+i,c=!0),(c||!Ai(t))&&(o.endsWith(`
`)||(o+=`
`),Op(t,o)),{configFile:t,changed:c,sessionEndInstalled:!0}}function _i(e={}){let t=Ni(e);return{configFile:t.configFile,changed:t.changed,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as $i,mkdirSync as Pp,readFileSync as Di,renameSync as Tp,rmSync as Ap,writeFileSync as Np}from"node:fs";import{dirname as _p}from"node:path";import{existsSync as Rp}from"node:fs";import{homedir as Ep}from"node:os";import{join as Xt}from"node:path";function Mi(e={}){let t=e.home??Ep();return Rp(Xt(t,".qoder-cn"))?Xt(t,".qoder-cn","settings.json"):Xt(t,".qoder","settings.json")}function Fi(e){return`'${e.replace(/'/g,"'\\''")}'`}function Mp(e){if(!$i(e))return{};let t;try{t=JSON.parse(Di(e,"utf8"))}catch{throw new Error(`Invalid existing Qoder settings.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Qoder settings.json at ${e}: root must be a JSON object.`);return t}function Fp(e,t){Pp(_p(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Np(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Tp(o,e)}finally{Ap(o,{force:!0})}}function Hi(e={}){let t=e.settingsFile??Mi(),o=Mp(t),r=e.binary??"toolnet-memory",n=`${Fi(r)} session:qoder-hook`,i=`${Fi(r)} session:qoder-hook`,c={type:"command",command:n,timeout:30},s={type:"command",command:i,timeout:3},a=Array.isArray(o.hooks)?[...o.hooks]:[],u=a.filter(g=>{try{return!JSON.stringify(g).includes("session:qoder-hook")}catch{return!0}}).filter(g=>{try{return!JSON.stringify(g).includes("session:qoder-hook")}catch{return!0}});a.length=0,a.push({...c,event:"Stop"},{...s,event:"SessionEnd"}),o.hooks=a;let d=JSON.stringify(o,null,2)+`
`,p=!$i(t)||Di(t,"utf8")!==d;return Fp(t,o),{settingsFile:t,changed:p,stopInstalled:!0,sessionEndInstalled:!0}}function Ji(e={}){let t=Hi(e);return{settingsFile:t.settingsFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as $p,mkdirSync as Li,readFileSync as Dp,renameSync as Hp,rmSync as Jp,writeFileSync as Lp}from"node:fs";import{dirname as Kp,join as We}from"node:path";import{homedir as Gp}from"node:os";function Vp(e,t){Li(Kp(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Lp(o,t,{encoding:"utf8",mode:493}),Hp(o,e)}finally{Jp(o,{force:!0})}}var Zt=`#!/usr/bin/env node
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
`;function Ki(e={}){let t=e.cwd?We(e.cwd,".toolnet","bin"):We(process.env.TOOLNET_HOME??We(Gp(),".toolnet"),"bin");Li(t,{recursive:!0,mode:448});let o=We(t,"aider-wrapper"),r=Zt.endsWith(`
`)?Zt:Zt+`
`,n=!$p(o)||Dp(o,"utf8")!==r;return Vp(o,r),{launcherPath:o,changed:n}}import{existsSync as Gi,mkdirSync as Bp,readFileSync as Vi,renameSync as qp,rmSync as Up,writeFileSync as Yp}from"node:fs";import{dirname as zp,join as Bi}from"node:path";import{homedir as Wp}from"node:os";function Qp(){return process.env.PLANDEX_BASE_DIR??Bi(Wp(),"plandex-server")}function Xp(e){if(!Gi(e))return{};let t;try{t=JSON.parse(Vi(e,"utf8"))}catch{throw new Error(`Invalid existing Plandex config at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Plandex config at ${e}: root must be a JSON object.`);return t}function Zp(e,t){Bp(zp(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Yp(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),qp(o,e)}finally{Up(o,{force:!0})}}function qi(e={}){let t=Qp(),o=Bi(t,"toolnet-memory.json"),r=Xp(o),n=r.toolnetMemory??{};n.integration="toolnet-memory",n.captureMode="manual-recovery",n.managedBy="toolnet-memory",r.toolnetMemory=n;let i=JSON.stringify(r,null,2)+`
`,c=!Gi(o)||Vi(o,"utf8")!==i;return Zp(o,r),{configPath:o,changed:c}}import{existsSync as Ui,mkdirSync as Yi,readFileSync as zi,renameSync as eg,rmSync as tg,writeFileSync as og}from"node:fs";import{dirname as Wi,join as rg}from"node:path";import{homedir as ng}from"node:os";function ig(e){if(!Ui(e))return{};let t;try{t=JSON.parse(zi(e,"utf8"))}catch{throw new Error(`Invalid existing OpenRouter config at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing OpenRouter config at ${e}: root must be a JSON object.`);return t}function sg(e,t){Yi(Wi(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{og(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),eg(o,e)}finally{tg(o,{force:!0})}}function Qi(e={}){let t=ng(),o=rg(t,".config","openrouter","toolnet-memory.json");Yi(Wi(o),{recursive:!0,mode:448});let r=ig(o);r.toolnetMemory={integration:"toolnet-memory",captureMode:"blocked-product-identity",managedBy:"toolnet-memory",blocked:!0,reason:"OpenRouter CLI product identity is blocked for ToolNet integration."};let n=JSON.stringify(r,null,2)+`
`,i=!Ui(o)||zi(o,"utf8")!==n;return sg(o,r),{configPath:o,blocked:!0,changed:i}}import{existsSync as os,mkdirSync as ag,readFileSync as rs,renameSync as lg,rmSync as ug,writeFileSync as dg}from"node:fs";import{dirname as pg}from"node:path";import{homedir as cg}from"node:os";import{join as Xi}from"node:path";function Zi(e={}){return Xi(e.home??cg(),".bob","settings","settings.json")}function es(e){return Xi(e,".bob","settings.json")}function gg(e){if(!os(e))return{};let t;try{t=JSON.parse(rs(e,"utf8"))}catch{throw new Error(`Invalid existing Bob settings.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Bob settings.json at ${e}: root must be a JSON object.`);return t}function mg(e,t){ag(pg(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{dg(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),lg(o,e)}finally{ug(o,{force:!0})}}function ts(e){return`'${e.replace(/'/g,"'\\''")}'`}function ns(e={}){let t=e.projectRoot!==void 0?es(e.projectRoot):Zi({home:e.home}),o=gg(t),r=e.binary??"toolnet-memory",n=`${ts(r)} hook ibm-bob`,i=`${ts(r)} hook ibm-bob`,c={type:"command",command:n,timeout:10},s={type:"command",command:i,timeout:10},a=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=a;let u=(Array.isArray(a.Stop)?a.Stop:[]).filter(S=>{try{return!JSON.stringify(S).includes("hook ibm-bob")}catch{return!0}}),p=(Array.isArray(a.SessionStart)?a.SessionStart:[]).filter(S=>{try{return!JSON.stringify(S).includes("hook ibm-bob")}catch{return!0}});a.Stop=[...u,{hooks:[c]}],a.SessionStart=[...p,{hooks:[s]}];let g=JSON.stringify(o,null,2)+`
`,y=!os(t)||rs(t,"utf8")!==g;return mg(t,o),{settingsFile:t,changed:y,stopInstalled:!0,sessionStartInstalled:!0}}function is(e={}){let t=ns(e);return{settingsFile:t.settingsFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionStartInstalled:t.sessionStartInstalled}}import{existsSync as eo,mkdirSync as as,readFileSync as to,renameSync as yg,rmSync as hg,writeFileSync as kg}from"node:fs";import{dirname as bg,join as oo}from"node:path";import{homedir as fg}from"node:os";import{join as ss}from"node:path";function cs(e){return e?ss(e,".cline","hooks"):ss(fg(),"Documents","Cline","Hooks")}function Sg(e){return`'${e.replace(/'/g,"'\\''")}'`}function ro(e,t){as(bg(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{kg(o,t,{encoding:"utf8",mode:493}),yg(o,e)}finally{hg(o,{force:!0})}}function Ig(e){return`#!/bin/sh
exec ${`${Sg(e)} hook cline`}
`}function ls(e={}){let t=e.binary??"toolnet-memory",o=cs(e.projectRoot),r=oo(o,"toolnet-memory.sh");as(o,{recursive:!0,mode:448});let n=Ig(t),i=!eo(r)||to(r,"utf8")!==n;ro(r,n);let c=oo(o,"TaskComplete"),s=oo(o,"TaskStart"),a=!1,l=!1;return(!eo(c)||to(c,"utf8")!==n)&&(ro(c,n),a=!0),(!eo(s)||to(s,"utf8")!==n)&&(ro(s,n),l=!0),{hooksDir:o,hooksFile:r,changed:i||a||l,taskCompleteInstalled:a,taskStartInstalled:l}}function us(e={}){let t=ls(e);return{hooksFile:t.hooksFile,hooksDir:t.hooksDir,changed:t.changed,taskCompleteInstalled:t.taskCompleteInstalled,taskStartInstalled:t.taskStartInstalled}}import{existsSync as gs,mkdirSync as ms,readFileSync as jg,renameSync as xg,rmSync as Cg,writeFileSync as Og}from"node:fs";import{dirname as fs}from"node:path";import{homedir as wg}from"node:os";import{join as vg}from"node:path";function ds(){return vg(wg(),".rovodev","config.yml")}function ys(e){return`'${e.replace(/'/g,"'\\''")}'`}function ps(e,t){ms(fs(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Og(o,t,{encoding:"utf8",mode:384}),xg(o,e)}finally{Cg(o,{force:!0})}}function Rg(e){return gs(e)?jg(e,"utf8"):""}function Eg(e){let t=`  - type: command
    command: ${ys("toolnet-memory hook rovo")}
    timeout: 10
`;if(e.includes("hooks:")){if(e.includes("toolnet-memory hook rovo"))return e;let o=e.split(`
`),n=o.length-1;for(let i=o.length-1;i>=0&&o[i].trim()==="";i--)n=i;return o.splice(n,0,t),o.join(`
`)}return e+`
hooks:
${t}`}function hs(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??ds();if(ms(fs(o),{recursive:!0,mode:448}),!gs(o)){let c=`hooks:
  - type: command
    command: ${ys(`${t} hook rovo`)}
    timeout: 10
`;return ps(o,c),{configFile:o,changed:!0,hookInstalled:!0}}let r=Rg(o),n=Eg(r),i=r!==n;return i&&ps(o,n),{configFile:o,changed:i,hookInstalled:i}}function ks(e={}){let t=hs(e);return{configFile:t.configFile,changed:t.changed,hookInstalled:t.hookInstalled}}import{existsSync as Ss,mkdirSync as ws,readFileSync as Is,renameSync as Ag,rmSync as Ng,writeFileSync as _g}from"node:fs";import{dirname as vs,join as Mg}from"node:path";import{homedir as Pg}from"node:os";import{join as Tg}from"node:path";function bs(){return[Tg(Pg(),".warp")]}function Fg(e,t){ws(vs(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{_g(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Ag(o,e)}finally{Ng(o,{force:!0})}}function js(e={}){let t=bs(),o=Mg(t[0],"toolnet-memory.json");ws(vs(o),{recursive:!0,mode:448});let r=Ss(o)?JSON.parse(Is(o,"utf8")):{};r.toolnetMemory={integration:"toolnet-memory",captureMode:"blocked-capability",managedBy:"toolnet-memory",blocked:!0,reason:"Warp Agent CLI capability is blocked for ToolNet integration."};let n=JSON.stringify(r,null,2)+`
`,i=!Ss(o)||Is(o,"utf8")!==n;return Fg(o,r),{configFile:o,blocked:!0,changed:i}}function xs(e={}){if(e.scope==="global")return{scope:"global",automatic:!1,reason:"explicit-global"};if(e.scope==="project"||e.scope==="both"){let o=N({cwd:e.cwd,project:e.projectRoot});if(!o.eligible)throw new Error(`Explicit ${e.scope} integration requires an explicit project, ToolNet project, or Git repository root.`);return{scope:e.scope,automatic:!1,project:o,reason:e.scope==="project"?"explicit-project":"explicit-both"}}let t=N({cwd:e.cwd,project:e.projectRoot});return t.toolnetProject?{scope:"both",automatic:!0,project:t,reason:"toolnet-project"}:{scope:"global",automatic:!0,reason:"no-toolnet-project"}}function Cs(){return Nr()}function no(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[],r=e.detections??Cs(),n=new Map(r.map(c=>[c.agent,c.detected])),i=xs({scope:e.scope,projectRoot:e.projectRoot,cwd:e.cwd});if(!(e.force===!0||n.get("agy")===!0))o.push({agent:"agy",detected:!1,installed:!1,targets:[]});else try{let s=Jr({binary:t});o.push({agent:"agy",detected:!0,installed:!0,targets:s.files})}catch(s){o.push({agent:"agy",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("gemini")===!0))o.push({agent:"gemini",detected:!1,installed:!1,targets:[]});else try{let s=ri({...e.gemini,binary:t});o.push({agent:"gemini",detected:!0,installed:!0,targets:[s.settingsFile]})}catch(s){o.push({agent:"gemini",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("junie")===!0))o.push({agent:"junie",detected:!1,installed:!1,targets:[]});else try{let s=e.junie?.projectRoot??i.project?.root??e.projectRoot??e.cwd??process.cwd(),a=si({...e.junie,binary:t,projectRoot:s});o.push({agent:"junie",detected:!0,installed:!0,targets:[a.configFile]})}catch(s){o.push({agent:"junie",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("opencode")===!0))o.push({agent:"opencode",detected:!1,installed:!1,targets:[]});else try{let s=qr({binary:t}),a=Qr({binary:t});o.push({agent:"opencode",detected:!0,installed:!0,targets:[...s,a.configFile,`mcp:${a.serverName}`]})}catch(s){o.push({agent:"opencode",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("claude")===!0))o.push({agent:"claude",detected:!1,installed:!1,targets:[]});else try{let s=kn({binary:t});o.push({agent:"claude",detected:!0,installed:!0,targets:[s.hooks.settingsFile,s.mcp.configFile,`mcp:${s.mcp.serverName}`]})}catch(s){o.push({agent:"claude",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("kiro")===!0))o.push({agent:"kiro",detected:!1,installed:!1,targets:[]});else try{let s=Cn({...e.kiro??{},binary:t});o.push({agent:"kiro",detected:!0,installed:!0,targets:[s.mcp.configFile,`mcp:${s.mcp.serverName}`,s.hooks.hooksFile]})}catch(s){o.push({agent:"kiro",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("cursor")===!0))o.push({agent:"cursor",detected:!1,installed:!1,targets:[]});else try{let s=e.cursor??{},a=Ln({...s,binary:t,scope:s.scope??i.scope,projectRoot:s.projectRoot??i.project?.root});o.push({agent:"cursor",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(s){o.push({agent:"cursor",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("copilot")===!0))o.push({agent:"copilot",detected:!1,installed:!1,targets:[]});else try{let s=e.copilot??{},a=Un({...s,binary:t,scope:s.scope??i.scope,projectRoot:s.projectRoot??i.project?.root});o.push({agent:"copilot",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(s){o.push({agent:"copilot",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("grok")===!0))o.push({agent:"grok",detected:!1,installed:!1,targets:[]});else try{let s=e.grok??{},a=ei({...s,binary:t,scope:s.scope??i.scope,projectRoot:s.projectRoot??i.project?.root});o.push({agent:"grok",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(s){o.push({agent:"grok",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("toolnet-cli")===!0))o.push({agent:"toolnet-cli",detected:!1,installed:!1,targets:[]});else try{let s=e.toolnetCli??{},a=Rn({...s,binary:t});o.push({agent:"toolnet-cli",detected:!0,installed:!0,targets:[a.mcp.configFile]})}catch(s){o.push({agent:"toolnet-cli",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("kilo")===!0))o.push({agent:"kilo",detected:!1,installed:!1,targets:[]});else try{let s=e.kilo??{},a=Pn({...s,binary:t});o.push({agent:"kilo",detected:!0,installed:!0,targets:[a.mcp.configFile]})}catch(s){o.push({agent:"kilo",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("codebuff")===!0))o.push({agent:"codebuff",detected:!1,installed:!1,targets:[]});else try{let s=ai({...e.codebuff,binary:t,...e.codebuff?.cwd||e.cwd?{cwd:e.codebuff?.cwd??e.cwd}:{}});o.push({agent:"codebuff",detected:!0,installed:!0,targets:[s.mcp.configFile]})}catch(s){o.push({agent:"codebuff",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("freebuff")===!0))o.push({agent:"freebuff",detected:!1,installed:!1,targets:[]});else try{let s=ui({...e.freebuff,binary:t,...e.freebuff?.cwd||e.cwd?{cwd:e.freebuff?.cwd??e.cwd}:{}});o.push({agent:"freebuff",detected:!0,installed:!0,targets:[s.mcp.configFile]})}catch(s){o.push({agent:"freebuff",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}{let c=e.force===!0||n.get("continue")===!0;o.push({agent:"continue",detected:c,installed:c,targets:c?[Er()]:[]})}if(!(e.force===!0||n.get("codex")===!0))o.push({agent:"codex",detected:!1,installed:!1,targets:[]});else try{let s=on({binary:t}),a=nn({binary:t}),l=un({binary:t}),u=gn({binary:t});if(!u.installed)throw new Error(u.error??"Codex MCP registration failed");let d=[s.configFile,a,l.hooksFile,`mcp:${u.serverName}`];s.preservedPrevious&&d.push(s.previousFile),o.push({agent:"codex",detected:!0,installed:!0,targets:d})}catch(s){o.push({agent:"codex",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("goose")===!0))o.push({agent:"goose",detected:!1,installed:!1,targets:[]});else try{let s=e.goose??{},a=hi({...s,binary:t});o.push({agent:"goose",detected:!0,installed:!0,targets:[a.hooksFile]})}catch(s){o.push({agent:"goose",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("qwen")===!0))o.push({agent:"qwen",detected:!1,installed:!1,targets:[]});else try{let s=e.qwen??{},a=ji({...s,binary:t});o.push({agent:"qwen",detected:!0,installed:!0,targets:[a.hooksFile]})}catch(s){o.push({agent:"qwen",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("kimi")===!0))o.push({agent:"kimi",detected:!1,installed:!1,targets:[]});else try{let s=e.kimi??{},a=Pi({...s,binary:t});o.push({agent:"kimi",detected:!0,installed:!0,targets:[a.configFile]})}catch(s){o.push({agent:"kimi",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("hermes")===!0))o.push({agent:"hermes",detected:!1,installed:!1,targets:[]});else try{let s=e.hermes??{},a=_i({...s,binary:t});o.push({agent:"hermes",detected:!0,installed:!0,targets:[a.configFile]})}catch(s){o.push({agent:"hermes",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("qoder")===!0))o.push({agent:"qoder",detected:!1,installed:!1,targets:[]});else try{let s=e.qoder??{},a=Ji({...s,binary:t});o.push({agent:"qoder",detected:!0,installed:!0,targets:[a.settingsFile]})}catch(s){o.push({agent:"qoder",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("aider")===!0))o.push({agent:"aider",detected:!1,installed:!1,targets:[]});else try{let s=e.aider??{},a=Ki({...s,binary:t});o.push({agent:"aider",detected:!0,installed:!0,targets:[a.launcherPath]})}catch(s){o.push({agent:"aider",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("plandex")===!0))o.push({agent:"plandex",detected:!1,installed:!1,targets:[]});else try{let s=e.plandex??{},a=qi({...s,binary:t});o.push({agent:"plandex",detected:!0,installed:!0,targets:[a.configPath]})}catch(s){o.push({agent:"plandex",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("openrouter")===!0))o.push({agent:"openrouter",detected:!1,installed:!1,targets:[]});else try{let s=e.openrouter??{},a=Qi({...s,binary:t});o.push({agent:"openrouter",detected:!0,installed:!0,targets:[a.configPath]})}catch(s){o.push({agent:"openrouter",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("bob")===!0))o.push({agent:"bob",detected:!1,installed:!1,targets:[]});else try{let s=e.bob??{},a=is({...s,binary:t});o.push({agent:"bob",detected:!0,installed:!0,targets:[a.settingsFile]})}catch(s){o.push({agent:"bob",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("cline")===!0))o.push({agent:"cline",detected:!1,installed:!1,targets:[]});else try{let s=e.cline??{},a=us({...s,binary:t});o.push({agent:"cline",detected:!0,installed:!0,targets:[a.hooksFile]})}catch(s){o.push({agent:"cline",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("rovo")===!0))o.push({agent:"rovo",detected:!1,installed:!1,targets:[]});else try{let s=e.rovo??{},a=ks({...s,binary:t});o.push({agent:"rovo",detected:!0,installed:!0,targets:[a.configFile]})}catch(s){o.push({agent:"rovo",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("warp")===!0))o.push({agent:"warp",detected:!1,installed:!1,targets:[]});else try{let s=e.warp??{},a=js({...s,binary:t});o.push({agent:"warp",detected:!0,installed:!0,targets:[a.configFile]})}catch(s){o.push({agent:"warp",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}return o}function Qe(e){switch(e){case"agy":return"Agy / Antigravity";case"opencode":return"OpenCode";case"claude":return"Claude Code";case"kiro":return"Kiro CLI";case"cursor":return"Cursor CLI";case"copilot":return"GitHub Copilot CLI";case"grok":return"Grok Build";case"toolnet-cli":return"ToolNet CLI";case"kilo":return"Kilo";case"codex":return"Codex";case"goose":return"goose";case"qwen":return"Qwen Code";case"kimi":return"Kimi Code CLI";case"hermes":return"Hermes Agent";case"qoder":return"Qoder CLI";case"aider":return"Aider";case"plandex":return"Plandex";case"openrouter":return"OpenRouter CLI";case"bob":return"IBM Bob Shell";case"cline":return"Cline CLI";case"rovo":return"Rovo Dev CLI";case"warp":return"Warp Agent CLI";case"gemini":return"Gemini CLI";case"junie":return"Junie";case"codebuff":return"Codebuff";case"freebuff":return"Freebuff";case"continue":return"Continue";default:return e}}function $g(e){console.log(""),console.log("ToolNet Memory Integration Detection"),console.log("===================================="),console.log("");for(let t of e){let o=Qe(t.agent);if(!t.detected){console.log(`\u25CB ${o}: not detected`);continue}console.log(`\u2713 ${o}: detected`);for(let r of t.evidence)console.log(`  ${r}`)}console.log("")}var Dg=["claude","cursor","copilot","grok","kiro","opencode","codex","agy"],Hg={opencode:"toolnet-memory session:opencode-sync",codex:"toolnet-memory session:codex-sync",agy:"toolnet-memory session:agy-sync","toolnet-cli":"toolnet-memory session:toolnet-cli-sync"};function Jg(e){if(Dg.includes(e))return"ToolNet integration configured; hooks installed successfully";let t=Hg[e];return t?`ToolNet integration configured; run ${t} to capture session history`:"ToolNet integration configured; capture begins when a supported hook or sync runs"}function Lg(e){console.log(""),console.log("ToolNet Memory AI Integrations"),console.log("=============================="),console.log("");for(let t of e){let o=Qe(t.agent);if(!t.detected){console.log(`- ${o}: not detected`);continue}if(t.installed){let r=t.scope?` [scope=${t.scope}]`:"";console.log(`\u2713 ${o}: ${Jg(t.agent)}${r}`),t.projectRoot&&console.log(`  project: ${t.projectRoot}`);continue}console.log(`\u2717 ${o}: integration failed`),t.error&&console.log(`  ${t.error}`)}console.log("")}function Kg(e,t){let o=e.indexOf(t);return o>=0?e[o+1]:void 0}function Gg(e){return e.includes("--scope")||e.includes("--global")||e.includes("--both")?Hn(e):void 0}async function Vg(){let e=process.argv.slice(2),t=e.includes("--all"),o=e.includes("--json"),r=e.includes("--detect-only"),n=Gg(e),i=Kg(e,"--project");if(r){let s=Cs();if(o){console.log(JSON.stringify(s,null,2));return}$g(s);return}let c=no({force:t,scope:n,projectRoot:i});if(o){console.log(JSON.stringify(c,null,2));return}Lg(c)}var Bg=process.argv[1]&&(process.argv[1].endsWith("auto-integrate.js")||process.argv[1].endsWith("auto-integrate.ts"));Bg&&Vg().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});function Es(e){let t=Ug(e);if(!io(t))throw new Error(`Project path does not exist: ${t}`);if(!qg(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);return t}function Av(e=process.cwd()){let t=Es(e),o=new L().detect(t),r=Rs(o.rootPath,".toolnet","project.json");if(!io(r))throw new Error(`ToolNet project initialization failed: ${r} was not created`);return{initialized:!0,project:{id:o.id,name:o.name,remote:o.remote,rootPath:o.rootPath},manifestFile:r}}async function Yg(e=process.cwd(),t={}){let o=Es(e),r={skipRemoteIdentity:t.skipRemoteIdentity,adoptRemote:t.adoptRemote,allowGitRebind:t.allowGitRebind},n=await Vo(o,r),i=n.project,c=Rs(i.rootPath,".toolnet","project.json");if(!io(c))throw new Error(`ToolNet project initialization failed: ${c} was not created`);return{initialized:!0,project:{id:i.id,name:i.name,remote:i.remote,rootPath:i.rootPath},manifestFile:c,identity:{source:n.source,registry:n.registry,registryProvider:n.registryProvider,gitRemote:n.gitIdentity?.canonicalRemote,fingerprint:n.gitIdentity?.fingerprint}}}function Os(e,t){let o=e.indexOf(t);if(o<0)return;let r=e[o+1];if(!(!r||r.startsWith("-")))return r}async function zg(){let e=process.argv.slice(2),t=e.includes("--json"),o=!e.includes("--no-integrate"),r=e.includes("--no-remote-identity"),n=e.includes("--rebind-git-identity"),i=Os(e,"--adopt-remote"),c=Os(e,"--project"),s=new Set(["--project","--adopt-remote"]),a=e.find((p,g)=>{if(p.startsWith("-"))return!1;let y=e[g-1];return!(y&&s.has(y))}),l=c??a??process.cwd(),u=await nt("Resolving ToolNet project identity",()=>Yg(l,{skipRemoteIdentity:r,adoptRemote:i,allowGitRebind:n}),{enabled:!t}),d=[];if(o&&(d=await nt("Detecting coding agents",()=>no({projectRoot:u.project.rootPath}),{enabled:!t})),t){console.log(JSON.stringify({...u,integrations:d},null,2));return}if(console.log(""),console.log("ToolNet Memory"),console.log("=============="),console.log(""),console.log("\u2713 Project initialized"),console.log(""),console.log(`Project:  ${u.project.name}`),console.log(`ID:       ${u.project.id}`),console.log(`Remote:   ${u.project.remote??u.project.name}`),console.log(`Root:     ${u.project.rootPath}`),console.log(`Manifest: ${u.manifestFile}`),u.identity&&(console.log(`Identity: ${u.identity.source}`),console.log(`Registry: ${u.identity.registry}`),u.identity.gitRemote&&console.log(`Git:      ${u.identity.gitRemote}`)),console.log(""),o){console.log("AI integrations:");let p=d.filter(g=>g.detected&&g.installed);if(!p.length)console.log("  \u25CB No supported coding agent detected");else for(let g of p){let y=Qe(g.agent),S=So(g.agent);console.log(`  \u2713 ${y} \u2014 ${S}`)}console.log("")}console.log("Next: toolnet-memory doctor"),console.log("")}var Wg=process.argv[1]?.endsWith("/init.js")||process.argv[1]?.endsWith("/init.ts");Wg&&zg().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});export{Av as initializeToolNetProject,Yg as initializeToolNetProjectCrossMachine};
