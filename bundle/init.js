import{existsSync as ao,statSync as Zg}from"node:fs";import{resolve as em,join as As}from"node:path";import{existsSync as Ms,readFileSync as Fs}from"node:fs";import{homedir as $s}from"node:os";import{join as Ds}from"node:path";function Hs(e){let t=e.trim();return t.length>=2&&t.startsWith('"')&&t.endsWith('"')?(t=t.slice(1,-1),t.replace(/\\n/g,`
`).replace(/\\r/g,"\r").replace(/\\t/g,"	").replace(/\\"/g,'"').replace(/\\\\/g,"\\")):t.length>=2&&t.startsWith("'")&&t.endsWith("'")?t.slice(1,-1):t}function Js(){let e=process.env.TOOLNET_GLOBAL_ENV??Ds($s(),".config","toolnet-memory",".env");if(!Ms(e))return;let t=Fs(e,"utf8");for(let o of t.split(/\r?\n/)){let r=o.trim();if(!r||r.startsWith("#"))continue;r.startsWith("export ")&&(r=r.slice(7));let n=r.indexOf("=");if(n<=0)continue;let i=r.slice(0,n).trim();/^[A-Za-z_][A-Za-z0-9_]*$/.test(i)&&process.env[i]===void 0&&(process.env[i]=Hs(r.slice(n+1)))}}Js();function W(e,t){return e===void 0?t:["1","true","yes","on"].includes(e.toLowerCase())}function Q(e,t){if(!e)return t;let o=Number(e);return Number.isFinite(o)?o:t}function et(){return{memory:{autoCapture:W(process.env.MEMORY_AUTO_CAPTURE,!0),autoRetrieve:W(process.env.MEMORY_AUTO_RETRIEVE,!0),autoSummarize:W(process.env.MEMORY_AUTO_SUMMARIZE,!0),autoSync:W(process.env.MEMORY_AUTO_SYNC,!0)},retrieval:{maxCandidates:Q(process.env.MEMORY_MAX_CANDIDATES,50),rerankTop:Q(process.env.MEMORY_RERANK_TOP,10),finalContext:Q(process.env.MEMORY_FINAL_CONTEXT,5),tokenBudget:Q(process.env.MEMORY_TOKEN_BUDGET,2e3)},storage:{provider:process.env.MEMORY_STORAGE_PROVIDER??"huggingface",r2:{accountId:process.env.R2_ACCOUNT_ID,bucket:process.env.R2_BUCKET,accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY},s3:{endpoint:process.env.S3_ENDPOINT,region:process.env.S3_REGION,bucket:process.env.S3_BUCKET,accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY,forcePathStyle:W(process.env.S3_FORCE_PATH_STYLE,!1)},huggingface:{namespace:process.env.HF_NAMESPACE,bucket:process.env.HF_BUCKET,accessKeyId:process.env.HF_S3_ACCESS_KEY_ID,secretAccessKey:process.env.HF_S3_SECRET_ACCESS_KEY},localRoot:process.env.MEMORY_LOCAL_STORAGE_PATH},cache:{maxMb:Q(process.env.MEMORY_LOCAL_CACHE_MB,200)}}}import{createHash as qs}from"node:crypto";import{existsSync as be,mkdirSync as Ys,readFileSync as zs,renameSync as Ws,writeFileSync as Qs}from"node:fs";import{basename as Xs,dirname as ke,join as Z,parse as fo,resolve as F}from"node:path";import{createHash as uo}from"node:crypto";import{spawnSync as Ls}from"node:child_process";var X="git-remote-v1",Ks=new Set(["github.com","gitlab.com","bitbucket.org"]);function po(e,t){let o=t.replaceAll("\\","/").replace(/^\/+/u,"").replace(/\/+$/u,"").replace(/\.git$/iu,"").replace(/\/+/gu,"/");return!o||o==="."||o===".."||o.split("/").some(r=>!r||r==="."||r==="..")?null:(Ks.has(e)&&(o=o.toLowerCase()),o)}function Gs(e){let t;try{t=new URL(e)}catch{return null}if(!["https:","http:","ssh:","git:"].includes(t.protocol))return null;let o=t.hostname.trim().toLowerCase();if(!o)return null;let r=t.protocol==="https:"&&t.port==="443"||t.protocol==="http:"&&t.port==="80"||t.protocol==="ssh:"&&t.port==="22",n=t.port&&!r?`${o}:${t.port}`:o,i=po(o,t.pathname);return i?`${n}/${i}`:null}function Vs(e){let t=e.match(/^(?:[^@\s/:]+@)?([^:/\s]+):(.+)$/u);if(!t)return null;let o=t[1]?.trim().toLowerCase();if(!o||o.length===1)return null;let r=po(o,t[2]??"");return r?`${o}/${r}`:null}function co(e){let t=e.trim();return t?t.includes("://")?Gs(t):Vs(t):null}function Bs(e){return uo("sha256").update(`${X}:${e}`).digest("hex")}function go(e){return uo("sha256").update(`toolnet-project:${X}:${e}`).digest("hex").slice(0,16)}function Us(e){return e.split("/").filter(Boolean).at(-1)?.trim()||null}function tt(e,t){let o=Ls("git",["-C",e,...t],{encoding:"utf8",windowsHide:!0,stdio:["ignore","pipe","ignore"]});return o.error||o.status!==0?null:o.stdout?.trim()||null}function lo(e,t){let o=Us(e);return o?{scheme:X,canonicalRemote:e,fingerprint:Bs(e),repositoryName:o,source:t}:null}function fe(e){let t=tt(e,["remote","get-url","origin"]);if(t){let n=co(t);if(n)return lo(n,"origin")}let o=tt(e,["remote"]);if(!o)return null;let r=new Set;for(let n of o.split(/\r?\n/u).map(i=>i.trim()).filter(Boolean)){let i=tt(e,["remote","get-url",n]);if(!i)continue;let a=co(i);a&&r.add(a)}return r.size!==1?null:lo([...r][0],"unique-remote")}var yo=".toolnet",Zs="project.json";function ea(e){return qs("sha256").update(e).digest("hex").slice(0,16)}function L(e){return Z(e,yo,Zs)}function ho(e){return be(L(e))}function mo(e,t){let o=F(e),r=fo(o).root;for(;;){if(ho(o))return o;if(o===r||t&&o===F(t))break;let n=ke(o);if(n===o)break;o=n}return null}function ot(e){let t=F(e),o=fo(t).root,r=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"];for(;;){if(r.some(i=>be(Z(t,i))))return t;if(t===o)break;let n=ke(t);if(n===t)break;t=n}return F(e)}function ye(e){let t;try{t=JSON.parse(zs(e,"utf8"))}catch(n){throw new Error(`Invalid ToolNet project manifest: ${e}: ${n instanceof Error?n.message:String(n)}`)}if(!t||typeof t!="object")throw new Error(`Invalid ToolNet project manifest: ${e}`);let o=t;if(typeof o.id!="string"||!o.id.trim())throw new Error(`ToolNet project manifest is missing id: ${e}`);if(typeof o.name!="string"||!o.name.trim())throw new Error(`ToolNet project manifest is missing name: ${e}`);let r=new Date().toISOString();return{version:1,id:o.id,name:o.name,remote:typeof o.remote=="string"&&o.remote.trim()?o.remote:o.name,rootPath:typeof o.rootPath=="string"?o.rootPath:ke(ke(e)),createdAt:typeof o.createdAt=="string"?o.createdAt:r,updatedAt:typeof o.updatedAt=="string"?o.updatedAt:r,graphVersion:typeof o.graphVersion=="number"?o.graphVersion:0,memoryVersion:typeof o.memoryVersion=="number"?o.memoryVersion:0,metadata:o.metadata&&typeof o.metadata=="object"?o.metadata:void 0}}function he(e,t){let o=Z(e,yo);Ys(o,{recursive:!0});let r=L(e),n=`${r}.tmp-${process.pid}`;Qs(n,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Ws(n,r)}function M(e,t){return{id:e.id,name:e.name,remote:e.remote,rootPath:t,createdAt:e.createdAt,updatedAt:e.updatedAt,graphVersion:e.graphVersion,memoryVersion:e.memoryVersion,metadata:e.metadata}}function rt(e){return{version:1,scheme:X,canonicalRemote:e.canonicalRemote,fingerprint:e.fingerprint,repositoryName:e.repositoryName}}function ta(e){let t=e.metadata?.toolnetIdentity;if(!t||typeof t!="object"||Array.isArray(t))return null;let o=t;return typeof o.fingerprint=="string"?o.fingerprint:null}var K=class{adopt(t,o){let r=ot(F(t));if(!o.id.trim())throw new Error("PROJECT_ADOPTION_INVALID_ID");if(!o.name.trim())throw new Error("PROJECT_ADOPTION_INVALID_NAME");if(!o.remote.trim())throw new Error("PROJECT_ADOPTION_INVALID_REMOTE");if(ho(r)){let s=ye(L(r));if(s.id!==o.id)throw new Error(["PROJECT_IDENTITY_ALREADY_EXISTS",`existing=${s.id}`,`requested=${o.id}`].join(" "));return M(s,r)}let n=new Date().toISOString(),i={...o.metadata};o.gitIdentity&&(i.toolnetIdentity=rt(o.gitIdentity));let a={version:1,id:o.id.trim(),name:o.name.trim(),remote:o.remote.trim(),rootPath:r,createdAt:o.createdAt??n,updatedAt:n,graphVersion:o.graphVersion??0,memoryVersion:o.memoryVersion??0,metadata:Object.keys(i).length?i:void 0};return he(r,a),M(a,r)}recordGitIdentity(t,o,r={}){let n=this.requireExisting(t),i=L(n.rootPath),a=ye(i),s=ta(a);if(s&&s!==o.fingerprint&&!r.allowRebind)throw new Error(["PROJECT_GIT_REMOTE_CHANGED",`existing=${s}`,`current=${o.fingerprint}`,"Use explicit rebind only when this repository identity change is intentional."].join(" "));let c=a.metadata?.toolnetIdentity;return c&&typeof c=="object"&&!Array.isArray(c)&&c.fingerprint===o.fingerprint||(a.metadata={...a.metadata,toolnetIdentity:rt(o)},a.updatedAt=new Date().toISOString(),he(n.rootPath,a)),M(a,n.rootPath)}findExisting(t=process.cwd()){let o=F(t),r=ot(o),i=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(c=>be(Z(r,c))),a=mo(o,i?r:void 0);if(!a)return null;let s=ye(L(a));return M(s,a)}requireExisting(t=process.cwd()){let o=this.findExisting(t);if(!o)throw new Error("PROJECT_NOT_INITIALIZED");return o}detect(t=process.cwd()){let o=F(t),r=ot(o),i=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(p=>be(Z(r,p))),a=mo(o,i?r:void 0);if(a){let p=L(a),d=ye(p);return d.rootPath!==a&&(d.rootPath=a,d.updatedAt=new Date().toISOString(),he(a,d)),M(d,a)}let s=new Date().toISOString(),c=Xs(r),l=fe(r),u={version:1,id:l?go(l.canonicalRemote):ea(r),name:c,remote:l?.repositoryName??c,rootPath:r,createdAt:s,updatedAt:s,graphVersion:0,memoryVersion:0,metadata:l?{toolnetIdentity:rt(l)}:void 0};return he(r,u),M(u,r)}};var oa=[{type:"openai_key",regex:/\bsk-[A-Za-z0-9_-]{20,}\b/g,confidence:"exact"},{type:"huggingface_token",regex:/\bhf_[A-Za-z0-9]{20,}\b/g,confidence:"exact"},{type:"hf_s3_access_key",regex:/\bHFAK[A-Za-z0-9]{8,}\b/g,confidence:"exact"},{type:"aws_access_key",regex:/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,confidence:"exact"},{type:"github_token",regex:/\b(?:gh[pousr]_[A-Za-z0-9]{30,255}|github_pat_[A-Za-z0-9_]{40,255})\b/g,confidence:"exact"},{type:"stripe_secret_key",regex:/\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g,confidence:"exact"},{type:"google_api_key",regex:/\bAIza[A-Za-z0-9_-]{30,}\b/g,confidence:"exact"},{type:"slack_token",regex:/\bxox[baprs]-[A-Za-z0-9-]{16,}\b/g,confidence:"exact"},{type:"npm_token",regex:/\bnpm_[A-Za-z0-9]{20,}\b/g,confidence:"exact"},{type:"bearer_token",regex:/\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/gi,confidence:"high"},{type:"jwt",regex:/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,confidence:"exact"},{type:"private_key",regex:/-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,confidence:"exact"},{type:"password_assignment",regex:/\b(?:password|passwd|pwd)\s*[:=]\s*["']?[^"' \t\r\n]{6,}["']?/gi,confidence:"high"},{type:"secret_assignment",regex:/\b(?:secret|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key)\s*[:=]\s*["']?[^"' \t\r\n]{8,}["']?/gi,confidence:"high"},{type:"cookie",regex:/\b(?:cookie|set-cookie)\s*[:=]\s*[^;\n]{8,}/gi,confidence:"high"},{type:"url_credentials",regex:/\bhttps?:\/\/[^:/@\s]+:[^/@\s]{4,}@[^/\s]+/gi,confidence:"high"}],ra=new Set(["example","example-key","example-token","changeme","change-me","password","secret","your-api-key","your-token","<token>","<secret>","<password>","[redacted]"]);function bo(e){return e.normalize("NFKC").trim().toLowerCase()}function na(e){if(e.length===0)return 0;let t=new Map;for(let r of e)t.set(r,(t.get(r)??0)+1);let o=0;for(let r of t.values()){let n=r/e.length;o-=n*Math.log2(n)}return o}function ia(e){return/^[a-f0-9]{32}$/iu.test(e)||/^[a-f0-9]{40}$/iu.test(e)||/^[a-f0-9]{64}$/iu.test(e)}function sa(e,t,o){let r=e.slice(Math.max(0,t-48),t),n=e.slice(o,Math.min(e.length,o+16));return/\b(?:token|secret|key|credential|authorization|password|passwd|apikey|api_key|access[_-]?key)\b/iu.test(`${r} ${n}`)}function aa(e,t){return e.start<t.end&&t.start<e.end}function ko(e){return e.sort((t,o)=>t.start!==o.start?t.start-o.start:o.end-o.start-(t.end-t.start))}var Se=class{allowValues=new Set;enableEntropyHeuristic;constructor(t={}){for(let o of t.allowValues??[]){let r=bo(o);r&&this.allowValues.add(r)}this.enableEntropyHeuristic=t.enableEntropyHeuristic??!0}scan(t){let o=[];for(let i of oa){let a=new RegExp(i.regex.source,i.regex.flags);for(let s of t.matchAll(a))s.index===void 0||!s[0]||this.allowed(s[0])||o.push({type:i.type,value:s[0],start:s.index,end:s.index+s[0].length,confidence:i.confidence})}this.enableEntropyHeuristic&&o.push(...this.entropyMatches(t));let r=ko(o),n=[];for(let i of r)n.some(a=>aa(a,i))||n.push(i);return ko(n)}hasSecrets(t){return this.scan(t).length>0}allowed(t){let o=bo(t);return ra.has(o)?!0:this.allowValues.has(o)}entropyMatches(t){let o=[],r=/[A-Za-z0-9_+/=-]{32,160}/g;for(let n of t.matchAll(r)){if(n.index===void 0||!n[0])continue;let i=n[0];this.allowed(i)||ia(i)||!/[A-Za-z]/u.test(i)||!/[0-9]/u.test(i)||sa(t,n.index,n.index+i.length)&&(na(i)<3.7||o.push({type:"high_entropy_secret",value:i,start:n.index,end:n.index+i.length,confidence:"heuristic"}))}return o}};function So(e,t,o){Object.defineProperty(e,t,{value:o,enumerable:!0,writable:!0,configurable:!0})}var Ie=class{scanner;constructor(t={}){this.scanner=new Se(t)}sanitize(t){let o=this.scanner.scan(t);if(o.length===0)return{text:t,redacted:0,secretTypes:[]};let r=t,n=[...o].sort((a,s)=>s.start-a.start),i=new Set;for(let a of n)i.add(a.type),r=r.slice(0,a.start)+`[REDACTED:${a.type}]`+r.slice(a.end);return{text:r,redacted:o.length,secretTypes:[...i].sort()}}sanitizeValue(t){if(typeof t=="string")return this.sanitize(t).text;if(Array.isArray(t))return t.map(o=>this.sanitizeValue(o));if(t&&typeof t=="object"){let o={};for(let[r,n]of Object.entries(t)){if(r==="__proto__")continue;let i=r.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g,"");if(i.includes("password")||i.includes("passwd")||i==="pwd"||i.includes("secret")||i.includes("token")||i.includes("cookie")||i.includes("authorization")||i.includes("apikey")||i.includes("accesskey")||i.includes("privatekey")||i.includes("clientsecret")||i.includes("credential")){So(o,r,"[REDACTED]");continue}So(o,r,this.sanitizeValue(n))}return o}return t}};var wm=new Ie;var ca={claude:"hook",cursor:"hook",copilot:"hook",grok:"hook",kiro:"hook",opencode:"hook",codex:"hook",agy:"hook","toolnet-cli":"manual-sync",kilo:"mcp-only",goose:"hook",qwen:"hook",kimi:"hook",hermes:"hook",qoder:"hook",aider:"managed-wrapper-session-end",plandex:"manual-sync",openrouter:"blocked-product-identity",bob:"hook",cline:"hook",rovo:"hook",warp:"blocked-capability",gemini:"hook",junie:"hook",codebuff:"mcp-only",freebuff:"mcp-only",continue:"manual-sync"},ve={mcp:!0,continuityRead:!0,nativeCapture:!1,lifecycleHooks:!1,sharedJournalWrite:!1,level:"mcp-only"},Io={mcp:!0,continuityRead:!0,nativeCapture:!1,lifecycleHooks:!1,sharedJournalWrite:!1,level:"blocked"},nt={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!1,sharedJournalWrite:!0,level:"native-capture"},I={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!0,sharedJournalWrite:!0,level:"native-capture"},la={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!0,sharedJournalWrite:!0,level:"native-capture"},ua={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!1,sharedJournalWrite:!0,level:"native-capture"};function m(e,t,o){return{agent:e,...t,refreshMode:o,captureMode:ca[e]}}var vo={agy:m("agy",I,"native-lifecycle"),opencode:m("opencode",la,"persistent-plugin"),codex:m("codex",I,"native-lifecycle"),claude:m("claude",I,"native-lifecycle"),kiro:m("kiro",I,"native-lifecycle"),cursor:m("cursor",I,"native-lifecycle"),copilot:m("copilot",I,"native-lifecycle"),grok:m("grok",I,"native-lifecycle"),"toolnet-cli":m("toolnet-cli",nt,"native-session"),kilo:m("kilo",ve,"mcp-only"),goose:m("goose",I,"native-lifecycle"),qwen:m("qwen",I,"native-lifecycle"),kimi:m("kimi",I,"native-lifecycle"),hermes:m("hermes",I,"native-lifecycle"),qoder:m("qoder",I,"native-lifecycle"),aider:m("aider",ua,"managed-wrapper"),plandex:m("plandex",nt,"native-session"),openrouter:m("openrouter",ve,"mcp-only"),bob:m("bob",I,"native-lifecycle"),cline:m("cline",I,"native-lifecycle"),rovo:m("rovo",I,"native-lifecycle"),warp:m("warp",Io,"blocked"),gemini:m("gemini",I,"native-lifecycle"),junie:{...m("junie",I,"native-lifecycle"),conditionalCapture:{runtimeResolutionRequired:!0,hookChannel:"eap",stableFallback:"blocked-capability",manualRecoveryAvailable:!1,reason:"lifecycle hooks require verified EAP capability; unverified builds fail closed"}},codebuff:m("codebuff",ve,"mcp-only"),freebuff:m("freebuff",ve,"mcp-only"),continue:m("continue",nt,"native-session")};function da(e){return Object.prototype.hasOwnProperty.call(vo,e)}function pa(e){if(da(e))return vo[e]}function wo(e){let t=pa(e);if(!t)return"unknown";switch(t.refreshMode){case"native-lifecycle":return"native lifecycle";case"persistent-plugin":return"persistent plugin";case"native-session":return"native session capture";case"mcp-only":return"MCP only";case"managed-wrapper":return"managed wrapper";default:return t.refreshMode}}var jo=["\u280B","\u2819","\u2839","\u2838","\u283C","\u2834","\u2826","\u2827","\u2807","\u280F"],j={clear:"\r\x1B[2K",cyan:"\x1B[36m",green:"\x1B[32m",red:"\x1B[31m",yellow:"\x1B[33m",amber:"\x1B[38;5;214m",dim:"\x1B[2m",reset:"\x1B[0m"};function Co(e,t=16){let r=Math.max(1,t-4+1),n=e%r;return"\u2500".repeat(n)+"\u2501".repeat(4)+"\u2500".repeat(Math.max(0,t-n-4))}function xo(e){let t=Date.now()-e;return t<1e3?`${t}ms`:t<1e4?`${(t/1e3).toFixed(1)}s`:`${Math.round(t/1e3)}s`}var it=class{stream;enabled;interactive;color;intervalMs;display;label;frame=0;startedAt=0;timer;active=!1;constructor(t,o={}){this.label=t,this.stream=o.stream??process.stderr,this.enabled=o.enabled??!0,this.interactive=o.interactive??this.stream.isTTY===!0,this.color=o.color??(this.interactive&&process.env.NO_COLOR===void 0),this.intervalMs=Math.max(40,o.intervalMs??80),this.display=o.display??"spinner"}start(){return!this.enabled||this.active?this:(this.active=!0,this.startedAt=Date.now(),this.interactive?(this.render(),this.timer=setInterval(()=>{this.frame=(this.frame+1)%1e4,this.render()},this.intervalMs),this.timer.unref?.(),this):(this.stream.write(`\u2192 ${this.label}
`),this))}update(t){return this.label=t,this.enabled&&this.active&&this.interactive&&this.render(),this}succeed(t){this.finish("\u2713",t??this.label,j.green)}fail(t){this.finish("\u2717",t??this.label,j.red)}warn(t){this.finish("!",t??this.label,j.yellow)}stop(){this.active&&(this.timer&&(clearInterval(this.timer),this.timer=void 0),this.enabled&&this.interactive&&this.stream.write(j.clear),this.active=!1)}render(){if(!this.enabled||!this.active||!this.interactive)return;let t=jo[this.frame%jo.length],o=this.display==="bar"?this.color?`${j.amber}${Co(this.frame)}${j.reset}`:Co(this.frame):this.color?`${j.cyan}${t}${j.reset}`:t,r=xo(this.startedAt),n=this.color?`${j.dim}${r}${j.reset}`:r;this.stream.write(`${j.clear}${o} ${this.label} ${n}`)}finish(t,o,r){if(!this.enabled){this.active=!1;return}this.startedAt||(this.startedAt=Date.now()),this.timer&&(clearInterval(this.timer),this.timer=void 0);let n=xo(this.startedAt),i=this.color?`${r}${t}${j.reset}`:t,a=this.color?`${j.dim}${n}${j.reset}`:n;this.interactive?this.stream.write(`${j.clear}${i} ${o} ${a}
`):this.stream.write(`${i} ${o} (${n})
`),this.active=!1}};async function st(e,t,o={}){let r=new it(e,o).start();try{let n=await t();return r.succeed(),n}catch(n){throw r.fail(),n}}import{resolve as za}from"node:path";import{homedir as Ga}from"node:os";import{join as Va}from"node:path";import{DeleteObjectCommand as ga,GetObjectCommand as ma,HeadObjectCommand as fa,ListObjectsV2Command as ya,PutObjectCommand as ha,S3Client as ba}from"@aws-sdk/client-s3";import{getSignedUrl as ka}from"@aws-sdk/s3-request-presigner";var we=class{name="huggingface";client;bucket;constructor(t){this.bucket=t.bucket,this.client=new ba({region:"us-east-1",endpoint:`https://s3.hf.co/${t.namespace}`,forcePathStyle:!0,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:t.accessKeyId,secretAccessKey:t.secretAccessKey}})}async put(t,o,r="application/octet-stream"){let n=typeof o=="string"?Buffer.from(o,"utf8"):o;await this.client.send(new ha({Bucket:this.bucket,Key:t,Body:n,ContentType:r}))}async get(t){let o=await ka(this.client,new ma({Bucket:this.bucket,Key:t}),{expiresIn:60}),r=await fetch(o,{redirect:"follow"});if(r.status===404)return null;if(!r.ok)throw new Error(`HF download failed: ${r.status} ${r.statusText}`);return new Uint8Array(await r.arrayBuffer())}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){try{return await this.client.send(new fa({Bucket:this.bucket,Key:t})),!0}catch(o){if(typeof o=="object"&&o!==null&&"$metadata"in o&&o.$metadata?.httpStatusCode===404)return!1;throw o}}async delete(t){await this.client.send(new ga({Bucket:this.bucket,Key:t}))}async list(t=""){let o=[],r;do{let n=await this.client.send(new ya({Bucket:this.bucket,Prefix:t||void 0,ContinuationToken:r}));for(let i of n.Contents??[])i.Key&&o.push({key:i.Key,size:i.Size,updatedAt:i.LastModified?.toISOString()});r=n.IsTruncated?n.NextContinuationToken:void 0}while(r);return o}};import{access as Oo,mkdir as Sa,readFile as Ia,readdir as va,rm as wa,stat as Ro,writeFile as ja}from"node:fs/promises";import{dirname as Ca,join as xa,relative as Eo,resolve as Oa}from"node:path";var ee=class{constructor(t){this.root=t}root;name="local";path(t){let o=t.replace(/^\/+/,"");return Oa(this.root,o)}async put(t,o){let r=this.path(t);await Sa(Ca(r),{recursive:!0}),await ja(r,o)}async get(t){try{return await Ia(this.path(t))}catch(o){if(typeof o=="object"&&o!==null&&"code"in o&&o.code==="ENOENT")return null;throw o}}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){try{return await Oo(this.path(t)),!0}catch{return!1}}async delete(t){await wa(this.path(t),{force:!0})}async list(t=""){let o=this.path(t),r=[];try{await Oo(o)}catch{return r}let n=async a=>{let s=await va(a,{withFileTypes:!0});for(let c of s){let l=xa(a,c.name);if(c.isDirectory()){await n(l);continue}let u=await Ro(l);r.push({key:Eo(this.root,l),size:u.size,updatedAt:u.mtime.toISOString()})}},i=await Ro(o);return i.isDirectory()?await n(o):r.push({key:Eo(this.root,o),size:i.size,updatedAt:i.mtime.toISOString()}),r}};import{DeleteObjectCommand as Ra,GetObjectCommand as Ea,HeadObjectCommand as Pa,ListObjectsV2Command as Ta,PutObjectCommand as Aa,S3Client as _a}from"@aws-sdk/client-s3";import{getSignedUrl as Na}from"@aws-sdk/s3-request-presigner";var te=class{name;client;bucket;constructor(t){this.name=t.name??"s3",this.bucket=t.bucket,this.client=new _a({region:t.region??"us-east-1",endpoint:t.endpoint||void 0,forcePathStyle:t.forcePathStyle??!1,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:t.accessKeyId,secretAccessKey:t.secretAccessKey}})}async put(t,o,r="application/octet-stream"){let n=typeof o=="string"?Buffer.from(o,"utf8"):o;await this.client.send(new Aa({Bucket:this.bucket,Key:t,Body:n,ContentType:r}))}async get(t){let o=await Na(this.client,new Ea({Bucket:this.bucket,Key:t}),{expiresIn:60}),r=await fetch(o,{redirect:"follow"});if(r.status===404)return null;if(!r.ok)throw new Error(`${this.name} download failed: ${r.status} ${r.statusText}`);return new Uint8Array(await r.arrayBuffer())}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){try{return await this.client.send(new Pa({Bucket:this.bucket,Key:t})),!0}catch(o){if(typeof o=="object"&&o!==null&&"$metadata"in o&&o.$metadata?.httpStatusCode===404)return!1;throw o}}async delete(t){await this.client.send(new Ra({Bucket:this.bucket,Key:t}))}async list(t=""){let o=[],r;do{let n=await this.client.send(new Ta({Bucket:this.bucket,Prefix:t||void 0,ContinuationToken:r}));for(let i of n.Contents??[])i.Key&&o.push({key:i.Key,size:i.Size,updatedAt:i.LastModified?.toISOString()});r=n.IsTruncated?n.NextContinuationToken:void 0}while(r);return o}};import{createCipheriv as Ma,createDecipheriv as Fa,createHash as $a,randomBytes as Da,timingSafeEqual as Ha}from"node:crypto";import{readFileSync as Ja}from"node:fs";var $=Buffer.from("TNMEME01","ascii"),To=1,oe=8,re=12,at=16,Ao=$.length+1+oe+re+at,La="toolnet-memory:remote-encryption:v1:",_o="aes-256-gcm",ct=32,k=class extends Error{constructor(o,r){super(r);this.code=o;this.name="RemoteEncryptionError"}code};function Ka(e){return e?["1","true","yes","on","enabled"].includes(e.trim().toLowerCase()):!1}function lt(e=process.env){return Ka(e.TOOLNET_REMOTE_ENCRYPTION)}function Po(e){let t=e.trim();if(!t)throw new k("REMOTE_ENCRYPTION_KEY_EMPTY","Remote encryption key is empty.");let o;if(t.startsWith("hex:")){let r=t.slice(4);if(!/^[0-9a-f]{64}$/iu.test(r))throw new k("REMOTE_ENCRYPTION_KEY_INVALID","hex: remote encryption key must contain exactly 64 hexadecimal characters.");o=Buffer.from(r,"hex")}else if(/^[0-9a-f]{64}$/iu.test(t))o=Buffer.from(t,"hex");else{let r=t.startsWith("base64:")?t.slice(7):t;if(!/^[A-Za-z0-9+/_-]+={0,2}$/u.test(r))throw new k("REMOTE_ENCRYPTION_KEY_INVALID","Remote encryption key must be 32 raw bytes encoded as hexadecimal or base64.");o=Buffer.from(r,r.includes("-")||r.includes("_")?"base64url":"base64")}if(o.length!==ct)throw new k("REMOTE_ENCRYPTION_KEY_INVALID_LENGTH",`Remote encryption key must decode to exactly ${ct} bytes.`);return o}function No(e=process.env){let t=e.TOOLNET_REMOTE_ENCRYPTION_KEY?.trim(),o=e.TOOLNET_REMOTE_ENCRYPTION_KEY_FILE?.trim();if(t&&o)throw new k("REMOTE_ENCRYPTION_KEY_AMBIGUOUS","Configure either TOOLNET_REMOTE_ENCRYPTION_KEY or TOOLNET_REMOTE_ENCRYPTION_KEY_FILE, not both.");if(t)return Po(t);if(o){let r;try{r=Ja(o,"utf8")}catch(n){throw new k("REMOTE_ENCRYPTION_KEY_FILE_READ_FAILED",[`Unable to read remote encryption key file: ${o}.`,n instanceof Error?n.message:String(n)].join(" "))}return Po(r)}}function Mo(e){return $a("sha256").update(e).digest().subarray(0,oe)}function Fo(e){return Buffer.from(`${La}${e}`,"utf8")}function ut(e){return e.byteLength<$.length?!1:Buffer.from(e).subarray(0,$.length).equals($)}function $o(e,t,o){if(o.byteLength!==ct)throw new k("REMOTE_ENCRYPTION_KEY_INVALID_LENGTH","AES-256-GCM requires a 32-byte key.");let r=typeof t=="string"?Buffer.from(t,"utf8"):Buffer.from(t),n=Da(re),i=Ma(_o,o,n);i.setAAD(Fo(e));let a=Buffer.concat([i.update(r),i.final()]),s=i.getAuthTag(),c=Buffer.alloc(Ao),l=0;return $.copy(c,l),l+=$.length,c.writeUInt8(To,l),l+=1,Mo(o).copy(c,l),l+=oe,n.copy(c,l),l+=re,s.copy(c,l),Buffer.concat([c,a])}function Do(e,t,o){let r=Buffer.from(t);if(!ut(r))throw new k("REMOTE_ENCRYPTION_ENVELOPE_REQUIRED","Payload is not a ToolNet encrypted remote object.");if(r.length<Ao)throw new k("REMOTE_ENCRYPTION_ENVELOPE_TRUNCATED","Encrypted remote payload is truncated.");let n=$.length,i=r.readUInt8(n);if(n+=1,i!==To)throw new k("REMOTE_ENCRYPTION_VERSION_UNSUPPORTED",`Unsupported remote encryption envelope version: ${i}.`);let a=r.subarray(n,n+oe);n+=oe;let s=Mo(o);if(!Ha(a,s))throw new k("REMOTE_ENCRYPTION_KEY_MISMATCH","Configured remote encryption key does not match this encrypted object.");let c=r.subarray(n,n+re);n+=re;let l=r.subarray(n,n+at);n+=at;let u=r.subarray(n),p=Fa(_o,o,c);p.setAAD(Fo(e)),p.setAuthTag(l);try{return Buffer.concat([p.update(u),p.final()])}catch{throw new k("REMOTE_ENCRYPTION_AUTH_FAILED","Encrypted remote object failed AES-GCM authentication.")}}var dt=class{constructor(t,o){this.inner=t;this.options=o;if(this.name=t.name,o.enabled&&!o.key)throw new k("REMOTE_ENCRYPTION_KEY_REQUIRED","Remote client-side encryption is enabled but no encryption key is configured.")}inner;options;name;async put(t,o,r){if(!this.options.enabled){await this.inner.put(t,o,r);return}let n=this.options.key;if(!n)throw new k("REMOTE_ENCRYPTION_KEY_REQUIRED","Remote encryption key is unavailable.");let i=$o(t,o,n);await this.inner.put(t,i,"application/octet-stream")}async get(t){let o=await this.inner.get(t);if(!o)return null;if(!ut(o))return o;if(!this.options.enabled)throw new k("REMOTE_ENCRYPTION_REQUIRED",["Remote object is client-side encrypted.","Enable TOOLNET_REMOTE_ENCRYPTION and configure the matching key."].join(" "));let r=this.options.key;if(!r)throw new k("REMOTE_ENCRYPTION_KEY_REQUIRED","Remote object is encrypted but no decryption key is configured.");return Do(t,o,r)}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){return this.inner.exists(t)}async delete(t){await this.inner.delete(t)}async list(t=""){return this.inner.list(t)}};function Ho(e,t=process.env){if(e.name==="local")return lt(t)&&console.warn("[storage] Remote encryption requested but active storage provider is local; local data remains unchanged."),e;let o=lt(t),r=o?No(t):void 0;return new dt(e,{enabled:o,key:r})}function ne(e){return Ho(e)}function pt(e,t){return console.warn(t),ne(new ee(e))}function Jo(e){let t=e.localRoot??Va(Ga(),".toolnet-memory","storage");if(e.provider==="r2"){let o=e.r2;return o?.accountId&&o.bucket&&o.accessKeyId&&o.secretAccessKey?ne(new te({name:"r2",endpoint:`https://${o.accountId}.r2.cloudflarestorage.com`,region:"auto",bucket:o.bucket,forcePathStyle:!0,accessKeyId:o.accessKeyId,secretAccessKey:o.secretAccessKey})):pt(t,"[storage] Cloudflare R2 credentials missing. Using local fallback.")}if(e.provider==="s3"){let o=e.s3;return o?.bucket&&o.accessKeyId&&o.secretAccessKey?ne(new te({name:"s3",endpoint:o.endpoint,region:o.region??"us-east-1",bucket:o.bucket,forcePathStyle:o.forcePathStyle??!1,accessKeyId:o.accessKeyId,secretAccessKey:o.secretAccessKey})):pt(t,"[storage] S3 credentials missing. Using local fallback.")}if(e.provider==="huggingface"){let o=e.huggingface;return o?.namespace&&o.bucket&&o.accessKeyId&&o.secretAccessKey?ne(new we({namespace:o.namespace,bucket:o.bucket,accessKeyId:o.accessKeyId,secretAccessKey:o.secretAccessKey})):pt(t,"[storage] Hugging Face credentials missing. Using local fallback.")}return ne(new ee(t))}function Ba(e){return new Promise(t=>setTimeout(t,e))}async function Lo(e,t={}){let o=Math.max(1,t.attempts??3),r=t.baseDelayMs??150,n=t.maxDelayMs??2e3,i;for(let a=1;a<=o;a++)try{return await e()}catch(s){if(i=s,a>=o)break;let c=Math.min(n,r*2**(a-1)),l=Math.floor(Math.random()*Math.max(1,c*.2));await Ba(c+l)}throw i}var Ua=new Set(["put","get","getText","delete","list"]);function Ko(e,t={}){return new Proxy(e,{get(o,r){let n=Reflect.get(o,r,o);return typeof n!="function"?n:Ua.has(r)?(...i)=>Lo(()=>Promise.resolve(n.apply(o,i)),t):n.bind(o)}})}var R="authority: never rebuilt, never dropped",qa=[{kind:"memory_records",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:R,legacyValueDomains:[],description:"Long-term project memory records (projects/<id>/memories/current.json)."},{kind:"task_operations",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"reject",sourceOfTruth:R,legacyValueDomains:[],description:"Immutable task operation log (.toolnet/tasks/events.jsonl)."},{kind:"task_replication_log",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"reject",sourceOfTruth:R,legacyValueDomains:[],description:"Replicated task operations from other hosts."},{kind:"retrieval_feedback",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:R,legacyValueDomains:[],description:"Retrieval feedback signals (.toolnet/retrieval/feedback.jsonl)."},{kind:"retrieval_telemetry",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:R,legacyValueDomains:[],description:"Retrieval telemetry samples (.toolnet/retrieval/telemetry.jsonl)."},{kind:"retrieval_overrides",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:R,legacyValueDomains:[],description:"Operator retrieval overrides (.toolnet/retrieval/overrides.json)."},{kind:"session_wal",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:R,legacyValueDomains:[],description:"Session write-ahead log (.toolnet/runtime/sources/)."},{kind:"adr_state",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"reject",sourceOfTruth:R,legacyValueDomains:[],description:"Architecture decision records (projects/<id>/knowledge/adr/state.v1.json)."},{kind:"project_manifest",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"backward_compatible",missingVersionPolicy:"assume_legacy",sourceOfTruth:R,legacyValueDomains:[],description:"Project identity manifest (.toolnet/project.json and the remote copy)."},{kind:"recovery_backup",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"reject",sourceOfTruth:R,legacyValueDomains:[],description:"Disaster-recovery backup manifest, version-gated on read."},{kind:"task_projection",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"task operations log",legacyValueDomains:[],description:"Materialized task state; rebuilt from the operation log."},{kind:"code_graph",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Code graph snapshot (projects/<id>/graph/current.json)."},{kind:"code_manifest",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Incremental file manifest (projects/<id>/graph/manifest.json)."},{kind:"resolution_snapshot",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"backward_compatible",missingVersionPolicy:"assume_legacy",sourceOfTruth:"repository source",legacyValueDomains:["resolution_kind_uppercase"],description:"Symbol resolution snapshot (projects/<id>/graph/resolution/current.json); the legacy kind vocabulary (CALL/REFERENCE/EXTENDS/IMPLEMENTS) is normalized in memory on read."},{kind:"graph_coverage",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code graph + resolution",legacyValueDomains:[],description:"Graph coverage snapshot (projects/<id>/graph/coverage.json)."},{kind:"cross_service",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source + service extractors",legacyValueDomains:[],description:"Cross-service linkage (projects/<id>/graph/cross-service.json)."},{kind:"fleet_export",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Fleet export view (projects/<id>/graph/fleet-export.json)."},{kind:"snapshot_archive",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"current project state",legacyValueDomains:[],description:"Point-in-time project snapshots; never part of authority backups."},{kind:"code_artifacts",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"reject",sourceOfTruth:"repository source + semantic registry",legacyValueDomains:[],description:"Portable code-intelligence artifacts, gated by the artifact fingerprint matrix."},{kind:"code_chunks",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Code chunk snapshot (projects/<id>/code/chunks/current.json)."},{kind:"code_vectors",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code chunks",legacyValueDomains:[],description:"Code vector index (projects/<id>/code/vectors/current.json)."},{kind:"memory_vectors",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"memory records",legacyValueDomains:[],description:"Deterministic memory vector index (projects/<id>/vectors/current.json)."},{kind:"architecture_snapshot",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code graph",legacyValueDomains:[],description:"Architecture snapshot (projects/<id>/code/architecture)."},{kind:"code_analysis",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code graph",legacyValueDomains:[],description:"Code analysis snapshot (projects/<id>/code/analysis)."},{kind:"visualization_graph",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code graph",legacyValueDomains:[],description:"Visualization graph (projects/<id>/code/visualization/graph.json)."},{kind:"runtime_traces",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"observed session activity",legacyValueDomains:[],description:"Runtime trace sessions plus their recomputed observation index."},{kind:"journal",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"session activity",legacyValueDomains:[],description:"Local session journal (.toolnet/journal)."},{kind:"task_replication_cursor",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"task replication log",legacyValueDomains:[],description:"Replication cursor (.toolnet/tasks/replication/cursor.json)."},{kind:"runtime_locks",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"process lifetime",legacyValueDomains:[],description:"Runtime lock files (.toolnet/runtime/locks)."},{kind:"daemon_state",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"running daemon",legacyValueDomains:[],description:"Daemon coordination state (daemon-state.json)."},{kind:"daemon_runtime_files",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"running daemon",legacyValueDomains:[],description:"Daemon socket, pid, lock and logs."},{kind:"artifact_staging",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Artifact staging area (.toolnet/cache/artifacts/staging)."},{kind:"test_run_cache",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"test execution",legacyValueDomains:[],description:"In-memory only derived test-run store."}],Ya=Object.freeze(qa.slice().sort((e,t)=>e.kind.localeCompare(t.kind))),Bf=new Map(Ya.map(e=>[e.kind,e]));var b="projects/[^/]+",Uf=[{pattern:/^\.toolnet\/tasks\/events\.jsonl$/u,kind:"task_operations"},{pattern:/^\.toolnet\/tasks\/replication\/replicated(\/|$)/u,kind:"task_replication_log"},{pattern:/^\.toolnet\/tasks\/replication\/cursor\.json$/u,kind:"task_replication_cursor"},{pattern:/^\.toolnet\/tasks\/state\.json$/u,kind:"task_projection"},{pattern:/^\.toolnet\/tasks(\/|$)/u,kind:"task_projection"},{pattern:/^\.toolnet\/retrieval\/feedback\.jsonl$/u,kind:"retrieval_feedback"},{pattern:/^\.toolnet\/retrieval\/telemetry\.jsonl$/u,kind:"retrieval_telemetry"},{pattern:/^\.toolnet\/retrieval\/overrides\.json$/u,kind:"retrieval_overrides"},{pattern:/^\.toolnet\/retrieval(\/|$)/u,kind:"retrieval_overrides"},{pattern:/^\.toolnet\/runtime\/sources(\/|$)/u,kind:"session_wal"},{pattern:/^\.toolnet\/runtime\/locks(\/|$)/u,kind:"runtime_locks"},{pattern:/^\.toolnet\/runtime(\/|$)/u,kind:"session_wal"},{pattern:/^\.toolnet\/journal(\/|$)/u,kind:"journal"},{pattern:/^\.toolnet\/cache\/artifacts\/staging(\/|$)/u,kind:"artifact_staging"},{pattern:/^\.toolnet\/cache(\/|$)/u,kind:"artifact_staging"},{pattern:/^\.toolnet\/project\.json$/u,kind:"project_manifest"},{pattern:new RegExp(`^${b}/memories(/|$)`,"u"),kind:"memory_records"},{pattern:new RegExp(`^${b}/knowledge/adr(/|$)`,"u"),kind:"adr_state"},{pattern:new RegExp(`^${b}/project\\.json$`,"u"),kind:"project_manifest"},{pattern:new RegExp(`^${b}/graph/artifacts(/|$)`,"u"),kind:"code_artifacts"},{pattern:new RegExp(`^${b}/graph/resolution(/|$)`,"u"),kind:"resolution_snapshot"},{pattern:new RegExp(`^${b}/graph/coverage\\.json$`,"u"),kind:"graph_coverage"},{pattern:new RegExp(`^${b}/graph/cross-service\\.json$`,"u"),kind:"cross_service"},{pattern:new RegExp(`^${b}/graph/fleet-export\\.json$`,"u"),kind:"fleet_export"},{pattern:new RegExp(`^${b}/graph/manifest\\.json$`,"u"),kind:"code_manifest"},{pattern:new RegExp(`^${b}/graph/current\\.json$`,"u"),kind:"code_graph"},{pattern:new RegExp(`^${b}/graph(/|$)`,"u"),kind:"code_graph"},{pattern:new RegExp(`^${b}/code/graph(/|$)`,"u"),kind:"code_graph"},{pattern:new RegExp(`^${b}/code/chunks(/|$)`,"u"),kind:"code_chunks"},{pattern:new RegExp(`^${b}/code/vectors(/|$)`,"u"),kind:"code_vectors"},{pattern:new RegExp(`^${b}/code/architecture(/|$)`,"u"),kind:"architecture_snapshot"},{pattern:new RegExp(`^${b}/code/analysis(/|$)`,"u"),kind:"code_analysis"},{pattern:new RegExp(`^${b}/code/visualization(/|$)`,"u"),kind:"visualization_graph"},{pattern:new RegExp(`^${b}/vectors(/|$)`,"u"),kind:"memory_vectors"},{pattern:new RegExp(`^${b}/memory(/|$)`,"u"),kind:"memory_records"},{pattern:new RegExp(`^${b}/runtime-traces(/|$)`,"u"),kind:"runtime_traces"},{pattern:new RegExp(`^${b}/snapshots(/|$)`,"u"),kind:"snapshot_archive"},{pattern:/(^|\/)snapshots\/[^/]+\/(memories|vectors|graph)\//u,kind:"snapshot_archive"},{pattern:/(^|\/)daemon-state\.json$/u,kind:"daemon_state"},{pattern:/(^|\/)(daemon\.lock|daemon\.pid|daemon\.sock)$/u,kind:"daemon_runtime_files"},{pattern:/(^|\/)logs\/daemon\.log$/u,kind:"daemon_runtime_files"}];function G(e){let t=e.trim().replace(/\s+/g,"_").replace(/[^A-Za-z0-9._-]/g,"_").replace(/_+/g,"_").replace(/^\.+|\.+$/g,"").slice(0,100);if(!t||t==="."||t==="..")throw new Error("Invalid project storage folder");return t}var dy=Object.freeze({CALL:"call",REFERENCE:"type",EXTENDS:"inheritance",IMPLEMENTS:"implementation"});var Wa="_toolnet/registry/project-identities/v1",C=class extends Error{code="PROJECT_IDENTITY_COLLISION";constructor(t){super(t),this.name="ProjectIdentityCollisionError"}},je=class extends Error{code="PROJECT_IDENTITY_ADOPTION_REQUIRED";constructor(t,o){super(["PROJECT_IDENTITY_ADOPTION_REQUIRED",`remote=${t}`,`projectId=${o}`,"A legacy remote ToolNet project exists but has no Git fingerprint proof.",`Re-run with: toolnet-memory init --adopt-remote ${t}`].join(" ")),this.name="ProjectIdentityAdoptionRequiredError"}},ie=class extends Error{code="PROJECT_IDENTITY_REGISTRY_UNAVAILABLE";constructor(t){super(["PROJECT_IDENTITY_REGISTRY_UNAVAILABLE",t,"Refusing to create a possibly split project identity while configured remote storage cannot be checked.","Use --no-remote-identity only when local-only initialization is intentional."].join(" ")),this.name="ProjectIdentityRegistryUnavailableError"}};function Qa(){let e=et();if(e.storage.provider==="r2"){let t=e.storage.r2;return!!(t.accountId&&t.bucket&&t.accessKeyId&&t.secretAccessKey)}if(e.storage.provider==="s3"){let t=e.storage.s3;return!!(t.bucket&&t.accessKeyId&&t.secretAccessKey)}if(e.storage.provider==="huggingface"){let t=e.storage.huggingface;return!!(t.namespace&&t.bucket&&t.accessKeyId&&t.secretAccessKey)}return!1}function Go(e){if(e.storage)return{storage:e.storage,crossMachine:e.storageIsCrossMachine??!0,providerName:e.storage.name};let t=et(),o=Jo({provider:t.storage.provider,r2:t.storage.r2,s3:t.storage.s3,huggingface:t.storage.huggingface,localRoot:t.storage.localRoot}),r=Qa()&&o.name!=="local";return{storage:r?Ko(o,{attempts:Number(process.env.TOOLNET_STORAGE_RETRIES??3)}):o,crossMachine:r,providerName:o.name}}function Bo(e){return[Wa,`${e.fingerprint}.json`].join("/")}function Uo(e,t){let o;try{o=JSON.parse(e)}catch(i){throw new C([`Invalid ToolNet project identity registry record: ${t}.`,i instanceof Error?i.message:String(i)].join(" "))}if(!o||typeof o!="object"||Array.isArray(o))throw new C(`Invalid ToolNet project identity registry record: ${t}`);let r=o;for(let i of["fingerprint","canonicalGitRemote","projectId","projectName","projectRemote"])if(typeof r[i]!="string"||!String(r[i]).trim())throw new C(`ToolNet identity registry record ${t} is missing ${i}`);let n=new Date().toISOString();return{version:1,fingerprint:String(r.fingerprint),canonicalGitRemote:String(r.canonicalGitRemote),projectId:String(r.projectId),projectName:String(r.projectName),projectRemote:String(r.projectRemote),createdAt:typeof r.createdAt=="string"?r.createdAt:n,updatedAt:typeof r.updatedAt=="string"?r.updatedAt:n}}function Xa(e,t){let o;try{o=JSON.parse(e)}catch(a){throw new C([`Invalid remote ToolNet project manifest: ${t}.`,a instanceof Error?a.message:String(a)].join(" "))}if(!o||typeof o!="object"||Array.isArray(o))throw new C(`Invalid remote ToolNet project manifest: ${t}`);let r=o;if(typeof r.id!="string"||!r.id.trim())throw new C(`Remote ToolNet project manifest ${t} is missing id`);let n=typeof r.remote=="string"&&r.remote.trim()?r.remote:t.split("/")[1]??"project",i=typeof r.name=="string"&&r.name.trim()?r.name:n;return{version:typeof r.version=="number"?r.version:void 0,id:r.id,name:i,remote:n,createdAt:typeof r.createdAt=="string"?r.createdAt:void 0,updatedAt:typeof r.updatedAt=="string"?r.updatedAt:void 0}}async function Ce(e,t){let r=`projects/${G(t)}/project.json`,n=await e.getText(r);return n?Xa(n,r):null}async function Za(e,t){let o=Bo(t),r=await e.getText(o);if(!r)return null;let n=Uo(r,o);if(n.fingerprint!==t.fingerprint||n.canonicalGitRemote!==t.canonicalRemote)throw new C(["PROJECT_IDENTITY_REGISTRY_MISMATCH",`key=${o}`,`expectedFingerprint=${t.fingerprint}`,`actualFingerprint=${n.fingerprint}`].join(" "));return n}async function ec(e,t){let o=await Ce(e,t.projectRemote);if(o&&o.id!==t.projectId)throw new C(["PROJECT_IDENTITY_REMOTE_OWNERSHIP_MISMATCH",`remote=${t.projectRemote}`,`registryId=${t.projectId}`,`remoteId=${o.id}`].join(" "))}async function gt(e,t,o){let r=G(t.remote??t.name),n=await Ce(e,r);if(n&&n.id!==t.id)throw new C(["PROJECT_IDENTITY_REMOTE_NAMESPACE_COLLISION",`remote=${r}`,`existing=${n.id}`,`current=${t.id}`].join(" "));let i=Bo(o),a=await e.getText(i);if(a){let l=Uo(a,i);if(l.projectId!==t.id||l.canonicalGitRemote!==o.canonicalRemote)throw new C(["PROJECT_IDENTITY_REGISTRY_COLLISION",`fingerprint=${o.fingerprint}`,`existingProject=${l.projectId}`,`currentProject=${t.id}`].join(" "));return}let s=new Date().toISOString(),c={version:1,fingerprint:o.fingerprint,canonicalGitRemote:o.canonicalRemote,projectId:t.id,projectName:t.name,projectRemote:r,createdAt:t.createdAt,updatedAt:s};await e.put(i,JSON.stringify(c,null,2)+`
`,"application/json")}function tc(e,t){return{id:e.id,name:e.name,remote:e.remote,createdAt:e.createdAt,gitIdentity:t,metadata:{adoptedFromRemote:!0,adoptedAt:new Date().toISOString()}}}function Vo(e){return e instanceof C||e instanceof je||e instanceof ie}async function qo(e=process.cwd(),t={}){let o=za(e),r=new K,n=r.findExisting(o),i=fe(n?.rootPath??o);if(n){let s=n;if(i&&(s=r.recordGitIdentity(n.rootPath,i,{allowRebind:t.allowGitRebind??!1})),t.skipRemoteIdentity||!i)return{project:s,source:"existing-manifest",gitIdentity:i,registry:t.skipRemoteIdentity?"skipped":"disabled"};let c=Go(t);if(!c.crossMachine)return{project:s,source:"existing-manifest",gitIdentity:i,registry:"disabled",registryProvider:c.providerName};try{return await gt(c.storage,s,i),{project:s,source:"existing-manifest",gitIdentity:i,registry:"registered",registryProvider:c.providerName}}catch(l){if(Vo(l))throw l;return{project:s,source:"existing-manifest",gitIdentity:i,registry:"unavailable",registryProvider:c.providerName}}}if(!i)return{project:r.detect(o),source:"legacy-path",gitIdentity:null,registry:"disabled"};if(t.skipRemoteIdentity)return{project:r.detect(o),source:"git-remote",gitIdentity:i,registry:"skipped"};let a=Go(t);if(!a.crossMachine){if(t.adoptRemote)throw new ie("Explicit remote adoption was requested but no cross-machine storage provider is configured.");return{project:r.detect(o),source:"git-remote",gitIdentity:i,registry:"disabled",registryProvider:a.providerName}}try{let s=await Za(a.storage,i);if(s){if(t.adoptRemote&&G(t.adoptRemote)!==G(s.projectRemote))throw new C(["PROJECT_IDENTITY_EXPLICIT_ADOPTION_CONFLICT",`requested=${t.adoptRemote}`,`registered=${s.projectRemote}`].join(" "));return await ec(a.storage,s),{project:r.adopt(o,{id:s.projectId,name:s.projectName,remote:s.projectRemote,createdAt:s.createdAt,gitIdentity:i,metadata:{adoptedFromRegistry:!0,adoptedAt:new Date().toISOString()}}),source:"remote-registry",gitIdentity:i,registry:"matched",registryProvider:a.providerName}}if(t.adoptRemote){let u=await Ce(a.storage,t.adoptRemote);if(!u)throw new Error(["PROJECT_ADOPTION_REMOTE_NOT_FOUND",`remote=${t.adoptRemote}`].join(" "));let p=r.adopt(o,tc(u,i));return await gt(a.storage,p,i),{project:p,source:"explicit-remote-adoption",gitIdentity:i,registry:"registered",registryProvider:a.providerName}}let c=await Ce(a.storage,i.repositoryName);if(c)throw new je(c.remote,c.id);let l=r.detect(o);return await gt(a.storage,l,i),{project:l,source:"git-remote",gitIdentity:i,registry:"registered",registryProvider:a.providerName}}catch(s){throw Vo(s)?s:new ie(s instanceof Error?s.message:String(s))}}import{existsSync as Mr}from"node:fs";import{homedir as Dc}from"node:os";import{join as w}from"node:path";import{spawnSync as Hc}from"node:child_process";import{homedir as oc}from"node:os";import{join as V}from"node:path";function Yo(e={}){return V(e.home??oc(),".gemini")}function zo(e={}){return V(Yo(e),"antigravity-cli")}function Wo(e={}){return V(Yo(e),"config")}function xe(e={}){return V(Wo(e),"mcp_config.json")}function Oe(e={}){let t=e.cwd??process.cwd();return V(t,".agents","mcp_config.json")}function Re(e="toolnet-memory",t={}){return V(zo(t),"plugins",e)}function Qo(e={}){return[zo(e),xe(e),Wo(e),Oe(e)]}import{homedir as Xo}from"node:os";import{join as D}from"node:path";function B(e={}){let t=process.env.OPENCODE_CONFIG_DIR?.trim();if(t)return t;let o=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return o?D(o,"opencode"):D(e.home??Xo(),".config","opencode")}function mt(e={}){let t=process.env.OPENCODE_CONFIG?.trim();if(t)return t;let o=e.home??Xo(),r=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return r?D(r,"opencode","opencode.json"):D(o,".config","opencode","opencode.json")}function ft(e={}){let t=e.cwd??process.cwd();return D(t,"opencode.json")}function Zo(e={}){return D(B(e),"plugins")}function er(e={}){return D(B(e),"AGENTS.md")}import{homedir as tr}from"node:os";import{join as yt}from"node:path";function ht(e={}){return yt(e.home??tr(),".claude")}function or(e={}){return yt(ht(e),"settings.json")}function rr(e={}){return yt(e.home??tr(),".claude.json")}import{homedir as rc}from"node:os";import{join as H}from"node:path";function bt(e={}){return e.kiroHome??process.env.KIRO_HOME??H(e.home??rc(),".kiro")}function nc(e={}){return H(bt(e),"settings")}function Ee(e={}){return H(nc(e),"mcp.json")}function kt(e={}){let t=e.cwd??process.cwd();return H(t,".kiro","settings","mcp.json")}function ic(e={}){return H(bt(e),"hooks")}function St(e={}){return H(ic(e),"toolnet-memory.json")}function It(e={}){let t=e.cwd??process.cwd();return H(t,".kiro","hooks","toolnet-memory.json")}function nr(e={}){return[bt(e),Ee(e)]}import{homedir as sc}from"node:os";import{join as vt}from"node:path";function ir(e={}){return vt(e.home??sc(),".toolnetcli")}function ac(e={}){return vt(ir(e),"config.json")}function sr(e={}){let t=e.cwd??process.cwd();return vt(t,".toolnet","mcp.json")}function ar(e={}){let t=ir(e),o=ac(e);return[t,o]}import{homedir as cc}from"node:os";import{join as wt}from"node:path";function cr(e={}){if(e.kiloHome)return e.kiloHome;if(process.env.KILO_HOME)return process.env.KILO_HOME;let t=e.xdgConfigHome??process.env.XDG_CONFIG_HOME;return t?wt(t,"kilo"):wt(e.home??cc(),".config","kilo")}function jt(e={}){return wt(cr(e),"kilo.jsonc")}function lr(e={}){let t=cr(e),o=jt(e);return[t,o]}import{homedir as lc}from"node:os";import{join as T,resolve as uc}from"node:path";function Pe(e={}){return e.cursorHome??T(e.home??lc(),".cursor")}function dc(e={}){return e.cursorConfigDir??process.env.CURSOR_CONFIG_DIR??(e.xdgConfigHome??process.env.XDG_CONFIG_HOME?T(e.xdgConfigHome??process.env.XDG_CONFIG_HOME,"cursor"):void 0)??Pe(e)}function Te(e={}){return T(Pe(e),"mcp.json")}function Ae(e={}){return T(Pe(e),"hooks.json")}function Ct(e){return T(uc(e),".cursor")}function ur(e){return T(Ct(e),"mcp.json")}function dr(e){return T(Ct(e),"hooks.json")}function pc(e){return T(Ct(e),"rules")}function pr(e){return T(pc(e),"toolnet-memory.mdc")}function gr(e={}){return Array.from(new Set([Pe(e),dc(e)]))}import{homedir as gc}from"node:os";import{join as E,resolve as mc}from"node:path";function xt(e={}){return e.copilotHome??process.env.COPILOT_HOME??E(e.home??gc(),".copilot")}function _e(e={}){return E(xt(e),"mcp-config.json")}function fc(e={}){return E(xt(e),"hooks")}function Ne(e={}){return E(fc(e),"toolnet-memory.json")}function Ot(e){return E(mc(e),".github")}function mr(e){return E(Ot(e),"mcp.json")}function yc(e){return E(Ot(e),"hooks")}function fr(e){return E(yc(e),"toolnet-memory.json")}function hc(e){return E(Ot(e),"instructions")}function yr(e){return E(hc(e),"toolnet-memory.instructions.md")}function hr(e={}){return[xt(e)]}import{homedir as bc}from"node:os";import{join as x,resolve as kc}from"node:path";function Me(e={}){return e.grokHome??process.env.GROK_HOME??x(e.home??bc(),".grok")}function Fe(e={}){return x(Me(e),"config.toml")}function Sc(e={}){return x(Me(e),"hooks")}function $e(e={}){return x(Sc(e),"toolnet-memory.json")}function Ic(e={}){return x(Me(e),"skills")}function vc(e={}){return x(Ic(e),"toolnet-continuity")}function De(e={}){return x(vc(e),"SKILL.md")}function Rt(e){return x(kc(e),".grok")}function br(e){return x(Rt(e),"config.toml")}function wc(e){return x(Rt(e),"hooks")}function kr(e){return x(wc(e),"toolnet-memory.json")}function jc(e){return x(Rt(e),"skills")}function Cc(e){return x(jc(e),"toolnet-continuity")}function Sr(e){return x(Cc(e),"SKILL.md")}function Ir(e={}){return[Me(e)]}import{homedir as xc}from"node:os";import{join as vr}from"node:path";function Oc(e={}){return vr(e.home??xc(),".gemini")}function Et(e={}){return vr(Oc(e),"settings.json")}function wr(e={}){return[Et(e)]}import{homedir as Rc}from"node:os";import{join as jr}from"node:path";function Ec(e={}){return jr(e.home??Rc(),".junie")}function Pt(e={}){return jr(Ec(e),"config.json")}function Cr(e={}){return[Pt(e)]}import{homedir as xr}from"node:os";import{join as Tt,resolve as Pc}from"node:path";function Tc(e={}){let t=process.env.CODEBUFF_CONFIG_DIR;return t&&t.trim()?Pc(t):Tt(e.home??xr(),".config","manicode")}function Or(e={}){return Tt(e.cwd??process.cwd(),".agents","mcp.json")}function Ac(e={}){return Tt(e.home??xr(),".agents","mcp.json")}function Rr(e={}){return[Tc(e),Ac(e)]}import{homedir as Er}from"node:os";import{join as At,resolve as _c}from"node:path";function Nc(e={}){let t=process.env.FREEBUFF_CONFIG_DIR;return t&&t.trim()?_c(t):At(e.home??Er(),".config","manicode")}function Pr(e={}){return At(e.cwd??process.cwd(),".agents","mcp.json")}function Mc(e={}){return At(e.home??Er(),".agents","mcp.json")}function Tr(e={}){return[Nc(e),Mc(e)]}import{homedir as Fc}from"node:os";import{join as _t}from"node:path";function Nt(e={}){return _t(e.home??Fc(),".continue")}function $c(e={}){return _t(Nt(e),"config.yaml")}function Ar(e={}){return _t(Nt(e),"sessions")}function _r(e={}){return[Nt(e),$c(e)]}function Jc(e){return Hc("sh",["-lc",`command -v ${JSON.stringify(e)} >/dev/null 2>&1`],{stdio:"ignore"}).status===0}function f(e){let t=e.commandExists(e.command),o=e.configPaths.filter(i=>Mr(i)),r=o.length>0,n=[];t&&n.push(`command:${e.command}`);for(let i of o)n.push(`config:${i}`);return{agent:e.agent,detected:t||r,commandDetected:t,configDetected:r,evidence:n}}function Nr(e){let t=e.commands.filter(a=>e.commandExists(a)),o=e.configPaths.filter(a=>Mr(a)),r=t.length>0,n=o.length>0,i=[...t.map(a=>`command:${a}`),...o.map(a=>`config:${a}`)];return{agent:e.agent,detected:r||n,commandDetected:r,configDetected:n,evidence:i}}function Fr(e={}){let t=e.home??Dc(),o=e.commandExists??Jc,r=e.codexHome??process.env.CODEX_HOME??w(t,".codex");return[f({agent:"agy",command:"agy",commandExists:o,configPaths:Qo({home:t})}),f({agent:"gemini",command:"gemini",commandExists:o,configPaths:wr({home:t})}),f({agent:"junie",command:"junie",commandExists:o,configPaths:Cr({home:t})}),f({agent:"codebuff",command:"codebuff",commandExists:o,configPaths:Rr({home:t})}),f({agent:"freebuff",command:"freebuff",commandExists:o,configPaths:Tr({home:t})}),f({agent:"continue",command:"cn",commandExists:o,configPaths:_r({home:t})}),f({agent:"opencode",command:"opencode",commandExists:o,configPaths:[B({home:t,xdgConfigHome:e.xdgConfigHome})]}),f({agent:"claude",command:"claude",commandExists:o,configPaths:[ht({home:t})]}),f({agent:"kiro",command:"kiro-cli",commandExists:o,configPaths:nr({home:t,kiroHome:e.kiroHome})}),Nr({agent:"cursor",commands:["agent","cursor-agent"],commandExists:o,configPaths:gr({home:t,cursorHome:e.cursorHome,cursorConfigDir:e.cursorConfigDir,xdgConfigHome:e.xdgConfigHome})}),f({agent:"copilot",command:"copilot",commandExists:o,configPaths:hr({home:t,copilotHome:e.copilotHome})}),f({agent:"grok",command:"grok",commandExists:o,configPaths:Ir({home:t,grokHome:e.grokHome})}),f({agent:"toolnet-cli",command:"toolnet",commandExists:o,configPaths:ar({home:t})}),Nr({agent:"kilo",commands:["kilo","kilo-code"],commandExists:o,configPaths:lr({home:t,kiloHome:e.kiloHome})}),f({agent:"codex",command:"codex",commandExists:o,configPaths:[r]}),f({agent:"goose",command:"goose",commandExists:o,configPaths:[w(t,".agents","plugins")]}),f({agent:"qwen",command:"qwen",commandExists:o,configPaths:[w(t,".qwen")]}),f({agent:"kimi",command:"kimi-code",commandExists:o,configPaths:[w(t,".kimi-code")]}),f({agent:"hermes",command:"hermes",commandExists:o,configPaths:[w(t,".hermes")]}),f({agent:"qoder",command:"qoder",commandExists:o,configPaths:[w(t,".qoder-cn"),w(t,".qoder")]}),f({agent:"aider",command:"aider",commandExists:o,configPaths:[w(t,".aider")]}),f({agent:"plandex",command:"plandex",commandExists:o,configPaths:[w(t,".plandex"),w(t,"plandex-server")]}),f({agent:"openrouter",command:"openrouter",commandExists:o,configPaths:[w(t,".openrouter")]}),f({agent:"bob",command:"bob",commandExists:o,configPaths:[w(t,".bob")]}),f({agent:"cline",command:"cline",commandExists:o,configPaths:[w(t,".cline")]}),f({agent:"rovo",command:"rovo",commandExists:o,configPaths:[w(t,".rovodev"),w(t,".rovo")]}),f({agent:"warp",command:"warp",commandExists:o,configPaths:[w(t,".warp")]})]}import{existsSync as il,mkdirSync as Kr,readFileSync as sl,renameSync as al,writeFileSync as cl}from"node:fs";import{dirname as ll,join as Je}from"node:path";import{existsSync as Lc,mkdirSync as Kc,readFileSync as Gc,renameSync as Vc,rmSync as Bc,writeFileSync as Uc}from"node:fs";import{dirname as qc,join as Yc}from"node:path";function zc(e){return`'${e.replace(/'/g,"'\\''")}'`}function Wc(e){if(!Lc(e))return{};let t;try{t=JSON.parse(Gc(e,"utf8"))}catch{throw new Error(`Invalid existing Agy hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Agy hooks.json at ${e}: root must be a JSON object.`);return t}function Qc(e,t){Kc(qc(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Uc(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Vc(o,e)}finally{Bc(o,{force:!0})}}function $r(e={}){let t=e.pluginName??"toolnet-memory",o=e.hooksFile??Yc(Re(t),"hooks.json"),r=Wc(o),n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",i=`${zc(n)} session:agy-hook`;return r["toolnet-memory"]={enabled:!0,PreToolUse:[{matcher:"view_file|list_dir|find_by_name|grep_search|run_command",hooks:[{type:"command",command:`${i} pre-tool`,timeout:5}]}],PreInvocation:[{type:"command",command:`${i} pre`,timeout:15}],PostInvocation:[{type:"command",command:`${i} post`,timeout:15}],Stop:[{type:"command",command:`${i} stop`,timeout:30}]},Qc(o,r),o}import{existsSync as Xc,mkdirSync as Zc,readFileSync as el,renameSync as tl,writeFileSync as ol}from"node:fs";import{dirname as rl}from"node:path";function se(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function nl(e,t){Zc(rl(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;ol(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),tl(o,e)}function Dr(e){if(!Xc(e))return{};let t=el(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Agy MCP config at ${e}: parse error. Not overwriting.`)}if(!se(o))throw new Error(`Invalid existing Agy MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Hr(e,t){return se(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function He(e,t,o,r){let n=Dr(e),i=n.mcpServers;if(i!==void 0&&!se(i))throw new Error(`Invalid existing Agy MCP config: mcpServers must be an object in ${e}.`);let a=se(i)?{...i}:{},s=a[o];if(Hr(s,t)&&!r)return{installed:!0,changed:!1};a[o]={command:t,args:["mcp"]};let c={...n,mcpServers:a};nl(e,c);let u=Dr(e).mcpServers;if(!se(u)||!Hr(u[o],t))throw new Error(`Agy MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function Jr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...He(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(r==="both"){let a=xe(),s=Oe({cwd:e.cwd}),c=He(a,t,o,e.force??!1),l=He(s,t,o,e.force??!1);return{installed:!0,changed:c.changed||l.changed,configFile:a,serverName:o,command:t,args:["mcp"]}}let n=r==="workspace"?Oe({cwd:e.cwd}):xe();return{...He(n,t,o,e.force??!1),configFile:n,serverName:o,command:t,args:["mcp"]}}var ul=`# ToolNet Memory Continuity

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
`;function dl(e,t){Kr(ll(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;cl(o,t,{encoding:"utf8",mode:384}),al(o,e)}function Lr(e,t){il(e)&&sl(e,"utf8")===t||dl(e,t)}function Gr(e={}){let t=e.pluginName??"toolnet-memory",o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.pluginRoot??Re(t),n=Je(r,"plugin.json"),i=Je(r,"mcp_config.json"),a=Je(r,"hooks.json"),s=Je(r,"rules","toolnet-memory-continuity.md");return Kr(r,{recursive:!0,mode:448}),Lr(n,`${JSON.stringify({$schema:"https://antigravity.google/schemas/v1/plugin.json",name:t,description:"Persistent project continuity and memory for Antigravity coding sessions."},null,2)}
`),Jr({configFile:i,binary:o,serverName:"toolnet-memory",force:e.force}),$r({hooksFile:a,binary:o,pluginName:t}),Lr(s,`${ul.trim()}
`),{installed:!0,pluginRoot:r,files:[n,i,a,s]}}import{existsSync as gl,mkdirSync as qr,readFileSync as ml,writeFileSync as Yr}from"node:fs";import{join as Br}from"node:path";var pl="memory_agent_ask";function Vr(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${pl}

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
`.trim()}var Ur="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",Mt="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function fl(e={}){let t=er();qr(B(),{recursive:!0});let o=`${Ur}
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


${Vr()}

${Mt}`,r=gl(t)?ml(t,"utf8"):"",n=r.indexOf(Ur),i=r.indexOf(Mt);return n>=0&&i>=n?r=r.slice(0,n)+o+r.slice(i+Mt.length):(r=r.trimEnd(),r&&(r+=`

`),r+=o),Yr(t,r.trimEnd()+`
`,{encoding:"utf8",mode:384}),t}function zr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[];o.push(fl({cwd:e.cwd}));let r=e.scope??"global",n=[];if((r==="global"||r==="both")&&n.push(e.directory??Zo()),r==="project"||r==="both"){let i=e.cwd??process.cwd();n.push(Br(i,".opencode","plugins"))}for(let i of n){qr(i,{recursive:!0});let a=Br(i,"toolnet-memory.js"),s=`
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
`;Yr(a,s.trimStart(),{encoding:"utf8",mode:384}),o.push(a)}return o}import{existsSync as Xr,mkdirSync as yl,readFileSync as hl,renameSync as bl,writeFileSync as kl}from"node:fs";import{dirname as Zr,join as Sl}from"node:path";function ae(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Il(e,t){yl(Zr(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;kl(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),bl(o,e)}function Wr(e){if(!Xr(e))return{};let t=hl(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing OpenCode config at ${e}: parse error. Not overwriting.`)}if(!ae(o))throw new Error(`Invalid existing OpenCode config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Qr(e,t){if(!ae(e))return!1;let o=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(o)&&o.length===2&&o[0]===t&&o[1]==="mcp"}function Le(e,t,o,r){let n=Sl(Zr(e),"opencode.jsonc"),i=Xr(n)?n:void 0,a=Wr(e),s=a.mcp;if(s!==void 0&&!ae(s))throw new Error(`Invalid existing OpenCode config: mcp must be an object in ${e}.`);let c=ae(s)?{...s}:{},l=c[o];if(Qr(l,t)&&!r)return{installed:!0,changed:!1,preservedJsonc:i};c[o]={type:"local",command:[t,"mcp"],enabled:!0};let u={...a,mcp:c};Il(e,u);let p=Wr(e);if(!ae(p.mcp)||!Qr(p.mcp[o],t))throw new Error(`OpenCode MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0,preservedJsonc:i}}function en(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...Le(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:[t,"mcp"]};if(r==="both"){let a=mt(),s=ft({cwd:e.cwd}),c=Le(a,t,o,e.force??!1),l=Le(s,t,o,e.force??!1);return{installed:!0,changed:c.changed||l.changed,configFile:a,serverName:o,command:[t,"mcp"],preservedJsonc:c.preservedJsonc??l.preservedJsonc}}let n=r==="project"?ft({cwd:e.cwd}):mt();return{...Le(n,t,o,e.force??!1),configFile:n,serverName:o,command:[t,"mcp"]}}import{existsSync as vl,mkdirSync as tn,readFileSync as wl,writeFileSync as on}from"node:fs";import{homedir as rn}from"node:os";import{dirname as nn,join as Ft}from"node:path";function jl(e){let t=[],o=/"((?:\\.|[^"\\])*)"|'([^']*)'/g,r;for(;r=o.exec(e);){let n=r[1]??r[2]??"";try{t.push(r[1]!==void 0?JSON.parse(`"${n}"`):n)}catch{t.push(n)}}return t}function sn(e={}){let t=e.configFile??Ft(process.env.CODEX_HOME??Ft(rn(),".codex"),"config.toml"),o=e.previousFile??Ft(rn(),".config","toolnet-memory","codex-notify-previous.json");tn(nn(t),{recursive:!0}),tn(nn(o),{recursive:!0});let r=vl(t)?wl(t,"utf8"):"",n=e.binary??"toolnet-memory",i=`notify = [${JSON.stringify(n)}, "session:codex-notify"]`,a=r.split(`
`),s=a.findIndex(d=>/^\s*\[/.test(d));s<0&&(s=a.length);let c=-1,l=-1;for(let d=0;d<s;d+=1)if(/^\s*notify\s*=/.test(a[d])){if(c=d,l=d,a[d].includes("[")&&!a[d].includes("]"))for(;l+1<s&&(l+=1,!a[l].includes("]")););break}let u=[];if(c>=0){let d=a.slice(c,l+1).join(`
`);u=jl(d),a.splice(c,l-c+1,i)}else s=a.findIndex(d=>/^\s*\[/.test(d)),s<0&&(s=a.length),a.splice(s,0,i);let p=u.length>=2&&u[u.length-1]==="session:codex-notify";return u.length>0&&!p&&on(o,JSON.stringify(u,null,2)+`
`,{encoding:"utf8",mode:384}),r=a.join(`
`),r.endsWith(`
`)||(r+=`
`),on(t,r,{encoding:"utf8",mode:384}),{configFile:t,previousFile:o,preservedPrevious:u.length>0&&!p}}import{existsSync as Cl,mkdirSync as xl,readFileSync as Ol,writeFileSync as Rl}from"node:fs";import{homedir as El}from"node:os";import{dirname as Pl,join as an}from"node:path";function Tl(e){return`'${e.replace(/'/g,"'\\''")}'`}function cn(e={}){let t=e.hooksFile??an(process.env.CODEX_HOME??an(El(),".codex"),"hooks.json");xl(Pl(t),{recursive:!0});let o={};if(Cl(t))try{o=JSON.parse(Ol(t,"utf8"))}catch(s){throw new Error(`Invalid existing Codex hooks.json: ${s instanceof Error?s.message:String(s)}`)}let r=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=r;let i=(Array.isArray(r.SessionStart)?r.SessionStart:[]).filter(s=>{try{return!JSON.stringify(s).includes("session:codex-context")}catch{return!0}}),a=e.binary??"toolnet-memory";return i.push({matcher:"startup|resume|clear|compact",hooks:[{type:"command",command:`${Tl(a)} session:codex-context`,timeout:15,additionalContextLimit:1e3,statusMessage:"Loading ToolNet project continuity"}]}),r.SessionStart=i,Rl(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),t}import{existsSync as ln,mkdirSync as Al,readFileSync as un,writeFileSync as _l}from"node:fs";import{homedir as Nl}from"node:os";import{dirname as Ml,join as dn}from"node:path";function pn(e){return`'${e.replace(/'/g,"'\\''")}'`}function gn(e={}){let t=e.hooksFile??dn(process.env.CODEX_HOME??dn(Nl(),".codex"),"hooks.json");Al(Ml(t),{recursive:!0});let o={};if(ln(t))try{o=JSON.parse(un(t,"utf8"))}catch{throw new Error(`Invalid existing Codex hooks.json at ${t}: parse error. Not overwriting.`)}let r=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=r;let n=e.binary??"toolnet-memory",i=`${pn(n)} session:codex-stop-hook`,a=`${pn(n)} session:codex-session-end`,s={hooks:[{type:"command",command:i,timeout:30}]},c={hooks:[{type:"command",command:a,timeout:3}]},u=(Array.isArray(r.Stop)?r.Stop:[]).filter(y=>{try{return!JSON.stringify(y).includes("session:codex-stop-hook")}catch{return!0}}),d=(Array.isArray(r.SessionEnd)?r.SessionEnd:[]).filter(y=>{try{return!JSON.stringify(y).includes("session:codex-session-end")}catch{return!0}});r.Stop=[...u,s],r.SessionEnd=[...d,c];let g=JSON.stringify(o,null,2)+`
`,S=!ln(t)||un(t,"utf8")!==g;return _l(t,g,{encoding:"utf8",mode:384}),{hooksFile:t,changed:S,stopInstalled:!0,sessionEndInstalled:!0}}import{spawnSync as Fl}from"node:child_process";function $t(e,t){return Fl(e,t,{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}function mn(e,t){let o=$t(e,["mcp","get",t,"--json"]);if(o.status!==0||!o.stdout)return null;try{return JSON.parse(o.stdout)}catch{return null}}function fn(e,t){return e.enabled!==!1&&e.transport?.type==="stdio"&&e.transport?.command===t&&Array.isArray(e.transport?.args)&&e.transport?.args.length===1&&e.transport.args[0]==="mcp"}function yn(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.codexBinary??"codex",r=e.serverName??"toolnet-memory",n=mn(o,r);if(n&&fn(n,t))return{installed:!0,changed:!1,serverName:r,command:t,args:["mcp"]};if(n){let s=$t(o,["mcp","remove",r]);if(s.status!==0)return{installed:!1,changed:!1,serverName:r,command:t,args:["mcp"],error:(s.stderr||s.stdout||"Unable to remove old ToolNet MCP configuration.").trim()}}let i=$t(o,["mcp","add",r,"--",t,"mcp"]);if(i.status!==0)return{installed:!1,changed:!1,serverName:r,command:t,args:["mcp"],error:(i.stderr||i.stdout||"Unable to register ToolNet MCP.").trim()};let a=mn(o,r);return!a||!fn(a,t)?{installed:!1,changed:!0,serverName:r,command:t,args:["mcp"],error:"Codex accepted MCP registration but verification did not match expected ToolNet command."}:{installed:!0,changed:!0,serverName:r,command:t,args:["mcp"]}}import{existsSync as $l,mkdirSync as Dl,readFileSync as Hl,renameSync as Jl,rmSync as Ll,writeFileSync as Kl}from"node:fs";import{dirname as Gl}from"node:path";function ce(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Vl(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function Bl(e){if(!$l(e))return{};let t;try{t=JSON.parse(Hl(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude settings.json: ${o instanceof Error?o.message:String(o)}`)}if(!ce(t))throw new Error("Invalid existing Claude settings.json: root must be a JSON object.");return t}function Ke(e){if(e===void 0)return[];if(!Array.isArray(e))throw new Error("Invalid existing Claude settings.json: hook event must be an array.");let t=[];for(let o of e){if(!ce(o)){t.push(o);continue}let r=o.hooks;if(!Array.isArray(r)){t.push(o);continue}let n=r.filter(i=>{if(!ce(i))return!0;let a=i.command;return!(typeof a=="string"&&a.includes("session:claude-hook"))});n.length!==0&&t.push({...o,hooks:n})}return t}function Ge(e,t=10){return{type:"command",command:e,timeout:t}}function Ul(e,t){Dl(Gl(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Kl(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Jl(o,e)}finally{Ll(o,{force:!0})}}function hn(e={}){let t=e.settingsFile??or(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=Bl(t),n=r.hooks;if(n!==void 0&&!ce(n))throw new Error("Invalid existing Claude settings.json: hooks must be an object.");let i=ce(n)?{...n}:{},a=`${Vl(o)} session:claude-hook`,s=Ke(i.SessionStart);s.push({matcher:"startup|resume|clear|compact",hooks:[Ge(a)]}),i.SessionStart=s;let c=Ke(i.UserPromptSubmit);c.push({hooks:[Ge(a)]}),i.UserPromptSubmit=c;let l=Ke(i.PostToolUse);l.push({matcher:"Edit|Write",hooks:[Ge(a)]}),i.PostToolUse=l;let u=Ke(i.Stop);u.push({hooks:[Ge(a,30)]}),i.Stop=u;let p={...r,hooks:i},d=JSON.stringify(r),g=JSON.stringify(p);return d===g?{settingsFile:t,changed:!1}:e.dryRun===!0?{settingsFile:t,changed:!0,dryRun:!0}:(Ul(t,p),{settingsFile:t,changed:!0})}import{existsSync as ql,mkdirSync as Yl,readFileSync as zl,renameSync as Wl,rmSync as Ql,writeFileSync as Xl}from"node:fs";import{dirname as Zl}from"node:path";function le(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function bn(e){if(!ql(e))return{};let t;try{t=JSON.parse(zl(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude Code config: ${o instanceof Error?o.message:String(o)}`)}if(!le(t))throw new Error("Invalid existing Claude Code config: root must be a JSON object.");return t}function kn(e,t){if(!le(e))return!1;let o=e.args;return e.type==="stdio"&&e.command===t&&Array.isArray(o)&&o.length===1&&o[0]==="mcp"}function eu(e,t){Yl(Zl(e),{recursive:!0});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Xl(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Wl(o,e)}finally{Ql(o,{force:!0})}}function Sn(e={}){let t=e.stateFile??rr(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=bn(t),i=n.mcpServers;if(i!==void 0&&!le(i))throw new Error("Invalid existing Claude Code config: mcpServers must be an object.");let a=le(i)?{...i}:{},s=a[r];if(kn(s,o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:[o,"mcp"],repaired:!1};let c=s!==void 0;if(a[r]={type:"stdio",command:o,args:["mcp"]},e.dryRun===!0)return{installed:!0,changed:!0,configFile:t,serverName:r,command:[o,"mcp"],repaired:c,dryRun:!0};eu(t,{...n,mcpServers:a});let u=bn(t).mcpServers;if(!le(u)||!kn(u[r],o))throw new Error("Claude Code MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:[o,"mcp"],repaired:c}}function In(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=hn({binary:t,settingsFile:e.settingsFile,...e.dryRun!==void 0?{dryRun:e.dryRun}:{}}),r=Sn({binary:t,stateFile:e.stateFile,...e.dryRun!==void 0?{dryRun:e.dryRun}:{}});return{hooks:o,mcp:r,files:[o.settingsFile,r.configFile]}}import{existsSync as tu,mkdirSync as ou,readFileSync as ru,renameSync as nu,rmSync as iu,writeFileSync as su}from"node:fs";import{dirname as au}from"node:path";var U="ToolNet Memory - ";function jn(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function cu(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function vn(e){if(!tu(e))return{};let t=ru(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro hooks file at ${e}: parse error. Not overwriting.`)}if(!jn(o))throw new Error(`Invalid existing Kiro hooks file at ${e}: root must be a JSON object. Not overwriting.`);return o}function wn(e){return jn(e)?typeof e.name=="string"&&e.name.startsWith(U):!1}function ue(e){return{type:"command",command:e}}function lu(e){return[{name:`${U}Session Start`,description:"Inject compact local ToolNet continuity and capture Kiro session activation.",trigger:"SessionStart",action:ue(e),timeout:10,enabled:!0},{name:`${U}Prompt Continuity`,description:"Capture prompts and refresh ToolNet guidance only for resume/continue requests.",trigger:"UserPromptSubmit",action:ue(e),timeout:10,enabled:!0},{name:`${U}Raw History Guard`,description:"Prevent Kiro from reconstructing continuity from raw ToolNet/agent session history.",trigger:"PreToolUse",matcher:"*",action:ue(e),timeout:10,enabled:!0},{name:`${U}Tool Capture`,description:"Capture durable tool activity while filtering noisy read-only events.",trigger:"PostToolUse",matcher:"*",action:ue(e),timeout:15,enabled:!0},{name:`${U}Final Flush`,description:"Flush pending Kiro WAL events when the assistant finishes a turn.",trigger:"Stop",action:ue(e),timeout:30,enabled:!0}]}function uu(e,t){ou(au(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{su(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),nu(o,e)}finally{iu(o,{force:!0})}}function Ve(e,t,o){let r=vn(e);if(r.version!==void 0&&r.version!=="v1")throw new Error(`Unsupported existing Kiro hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!Array.isArray(n))throw new Error("Invalid existing Kiro hooks file: hooks must be an array.");let i=Array.isArray(n)?n.filter(l=>!wn(l)):[],a=lu(t),s={...r,version:"v1",hooks:[...i,...a]};if(!o&&JSON.stringify(r)===JSON.stringify(s))return{changed:!1,hookCount:a.length};uu(e,s);let c=vn(e);if(c.version!=="v1"||!Array.isArray(c.hooks)||c.hooks.filter(wn).length!==a.length)throw new Error("Kiro hooks were written but verification failed.");return{changed:!0,hookCount:a.length}}function Cn(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=`${cu(t)} session:kiro-hook`;if(e.hooksFile){let a=Ve(e.hooksFile,r,e.force??!1);return{hooksFile:e.hooksFile,...a}}if(o==="both"){let a=St(),s=It({cwd:e.cwd}),c=Ve(a,r,e.force??!1),l=Ve(s,r,e.force??!1);return{hooksFile:a,changed:c.changed||l.changed,hookCount:c.hookCount}}let n=o==="project"?It({cwd:e.cwd}):St(),i=Ve(n,r,e.force??!1);return{hooksFile:n,...i}}import{existsSync as du,mkdirSync as pu,readFileSync as gu,renameSync as mu,rmSync as fu,writeFileSync as yu}from"node:fs";import{dirname as hu}from"node:path";function de(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function xn(e){if(!du(e))return{};let t=gu(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro MCP config at ${e}: parse error. Not overwriting.`)}if(!de(o))throw new Error(`Invalid existing Kiro MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function On(e,t){return de(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&e.disabled===!1:!1}function bu(e,t){pu(hu(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{yu(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),mu(o,e)}finally{fu(o,{force:!0})}}function Be(e,t,o,r){let n=xn(e),i=n.mcpServers;if(i!==void 0&&!de(i))throw new Error(`Invalid existing Kiro MCP config: mcpServers must be an object in ${e}.`);let a=de(i)?{...i}:{},s=a[o];if(On(s,t)&&!r)return{installed:!0,changed:!1};a[o]={command:t,args:["mcp"],disabled:!1};let c={...n,mcpServers:a};bu(e,c);let u=xn(e).mcpServers;if(!de(u)||!On(u[o],t))throw new Error(`Kiro MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function Rn(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...Be(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(r==="both"){let a=Ee(),s=kt({cwd:e.cwd}),c=Be(a,t,o,e.force??!1),l=Be(s,t,o,e.force??!1);return{installed:!0,changed:c.changed||l.changed,configFile:a,serverName:o,command:t,args:["mcp"]}}let n=r==="project"?kt({cwd:e.cwd}):Ee();return{...Be(n,t,o,e.force??!1),configFile:n,serverName:o,command:t,args:["mcp"]}}function En(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=Rn({binary:t,configFile:e.configFile,scope:e.scope,cwd:e.cwd,force:e.force}),r=Cn({binary:t,hooksFile:e.hooksFile,scope:e.scope,cwd:e.cwd,force:e.force});return{installed:o.installed,changed:o.changed||r.changed,mcp:o,hooks:r,files:[o.configFile,r.hooksFile]}}import{existsSync as ku,mkdirSync as Su,readFileSync as Iu,renameSync as vu,rmSync as wu,writeFileSync as ju}from"node:fs";import{dirname as Cu}from"node:path";function Dt(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function xu(e){if(!ku(e))return{};let t=Iu(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: parse error. Not overwriting.`)}if(!Dt(o))throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Ou(e,t){Su(Cu(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{ju(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),vu(o,e)}finally{wu(o,{force:!0})}}function Pn(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??sr({cwd:e.cwd}),r=xu(o),n="toolnet-memory";if(Dt(r.mcpServers)&&r.mcpServers[n]!=null&&!e.force)return{installed:!0,changed:!1,configFile:o};let a=Dt(r.mcpServers)?{...r.mcpServers}:{};return a[n]={command:t,args:["mcp"]},r.mcpServers=a,Ou(o,r),{installed:!0,changed:!0,configFile:o}}function Tn(e={}){let t=e.binary??"toolnet-memory",o=Pn({binary:t,configFile:e.configFile,force:e.force,cwd:e.cwd});return{installed:o.installed,changed:o.changed,mcp:{...o,configured:o.installed},files:[o.configFile]}}import{mkdirSync as Mu,existsSync as Fu}from"node:fs";import{dirname as $u}from"node:path";import{existsSync as Ru,mkdirSync as Eu,readFileSync as Pu,renameSync as Tu,rmSync as Au,writeFileSync as _u}from"node:fs";import{dirname as Nu}from"node:path";function h(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function O(e,t){if(!Ru(e))return{};let o=Pu(e,"utf8").trim();if(!o)return{};let r;try{r=JSON.parse(o)}catch(n){throw new Error(`Invalid existing ${t} MCP config: ${n instanceof Error?n.message:String(n)}`)}if(!h(r))throw new Error(`Invalid existing ${t} MCP config: root must be a JSON object.`);return r}function P(e,t){Eu(Nu(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{_u(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Tu(o,e)}finally{Au(o,{force:!0})}}function An(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??jt(),r=$u(o);Fu(r)||Mu(r,{recursive:!0});let n=O(o,"Kilo"),i=n.mcp;if(i!==void 0&&!h(i))throw new Error("Invalid existing Kilo config: mcp must be an object.");let a=h(i)?{...i}:{},s="toolnet-memory";return h(a[s])&&!e.force?{installed:!0,changed:!1,configFile:o,configured:!0}:(a[s]={type:"local",command:[t,"mcp"],enabled:!0,timeout:1e4},P(o,{...n,mcp:a}),{installed:!0,changed:!0,configFile:o,configured:!0})}function _n(e={}){let t=e.binary??"toolnet-memory",o=An({binary:t,configFile:e.configFile,force:e.force});return{installed:o.installed,changed:o.changed,mcp:o,files:[o.configFile]}}import{existsSync as Du,mkdirSync as Hu,readFileSync as Ju,renameSync as Lu,rmSync as Ku,writeFileSync as Gu}from"node:fs";import{dirname as Vu}from"node:path";function v(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function A(e,t){if(!Du(e))return{};let o=Ju(e,"utf8").trim();if(!o)return{};let r;try{r=JSON.parse(o)}catch(n){throw new Error(`Invalid existing ${t} hooks file: ${n instanceof Error?n.message:String(n)}`)}if(!v(r))throw new Error(`Invalid existing ${t} hooks file: root must be a JSON object.`);return r}function q(e,t){Hu(Vu(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Gu(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Lu(o,e)}finally{Ku(o,{force:!0})}}function Ht(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}var pe=[["sessionStart",10],["beforeSubmitPrompt",10],["preToolUse",10],["postToolUse",15],["afterAgentResponse",15],["stop",30]];function Nn(e){return v(e)&&typeof e.command=="string"&&e.command.includes("session:cursor-hook")}function Bu(e,t,o){let n={type:"command",command:`TOOLNET_HOOK_EVENT=${Ht(e)} ${Ht(t)} session:cursor-hook`,timeout:o};return e==="preToolUse"&&(n.matcher=".*"),n}function Jt(e={}){let t=e.hooksFile??Ae(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=A(t,"Cursor");if(r.version!==void 0&&r.version!==1)throw new Error(`Unsupported existing Cursor hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!v(n))throw new Error("Invalid existing Cursor hooks file: hooks must be an object.");let i=v(n)?{...n}:{};for(let[l,u]of pe){let p=i[l];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing Cursor hooks file: hooks.${l} must be an array.`);let d=Array.isArray(p)?p.filter(g=>!Nn(g)):[];i[l]=[...d,Bu(l,o,u)]}let a={...r,version:1,hooks:i};if(JSON.stringify(r)===JSON.stringify(a))return{hooksFile:t,changed:!1,hookCount:pe.length};q(t,a);let s=A(t,"Cursor");if(s.version!==1||!v(s.hooks))throw new Error("Cursor hooks were written but verification failed.");let c=0;for(let[l]of pe){let u=s.hooks[l];if(!Array.isArray(u))throw new Error("Cursor hooks were written but verification failed.");c+=u.filter(Nn).length}if(c!==pe.length)throw new Error("Cursor hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:pe.length}}function Mn(e,t){return h(e)?(e.type===void 0||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function Lt(e={}){let t=e.configFile??Te(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=O(t,"Cursor"),i=n.mcpServers;if(i!==void 0&&!h(i))throw new Error("Invalid existing Cursor MCP config: mcpServers must be an object.");let a=h(i)?{...i}:{};if(Mn(a[r],o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};a[r]={type:"stdio",command:o,args:["mcp"]},P(t,{...n,mcpServers:a});let c=O(t,"Cursor").mcpServers;if(!h(c)||!Mn(c[r],o))throw new Error("Cursor MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}import{mkdirSync as Uu,readFileSync as Fn,renameSync as qu,rmSync as Yu,writeFileSync as zu}from"node:fs";import{dirname as Wu}from"node:path";var Kt=`---
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
`;function Qu(e,t){Uu(Wu(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{zu(o,t,{encoding:"utf8",mode:384}),qu(o,e)}finally{Yu(o,{force:!0})}}function $n(e){let t=e.ruleFile??pr(e.projectRoot);try{if(Fn(t,"utf8")===Kt)return{ruleFile:t,changed:!1}}catch{}if(Qu(t,Kt),Fn(t,"utf8")!==Kt)throw new Error("Cursor ToolNet project rule was written but verification failed.");return{ruleFile:t,changed:!0}}import{spawnSync as Xu}from"node:child_process";import{existsSync as Y,statSync as Zu}from"node:fs";import{dirname as ed,join as td,parse as od,resolve as Vt}from"node:path";function Dn(e){let t=Vt(e);if(!Y(t))throw new Error(`Project path does not exist: ${t}`);if(!Zu(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);return t}function Ue(e){return td(e,".toolnet","project.json")}function rd(e){let t=Vt(e),o=od(t).root;for(;;){if(Y(Ue(t)))return t;if(t===o)return;let r=ed(t);if(r===t)return;t=r}}function Gt(e){let t=Xu("git",["rev-parse","--show-toplevel"],{cwd:e,encoding:"utf8",timeout:5e3});if(t.status!==0)return;let o=t.stdout.trim();return o?Vt(o):void 0}function _(e={}){let t=Dn(e.cwd??process.cwd());if(e.project){let n=Dn(e.project),i=Ue(n),a=Gt(n);return{root:n,source:"explicit",eligible:!0,toolnetProject:Y(i),manifestFile:Y(i)?i:void 0,gitRoot:a}}let o=rd(t);if(o){let n=Ue(o);return{root:o,source:"toolnet",eligible:!0,toolnetProject:!0,manifestFile:n,gitRoot:Gt(o)}}let r=Gt(t);if(r){let n=Ue(r);return{root:r,source:"git",eligible:!0,toolnetProject:Y(n),manifestFile:Y(n)?n:void 0,gitRoot:r}}return{root:t,source:"cwd",eligible:!1,toolnetProject:!1}}function Kn(e,t={}){let o=[],r=e.indexOf("--scope");if(r>=0){let i=e[r+1];if(i!=="global"&&i!=="project"&&i!=="both")throw new Error(`Invalid --scope value: ${String(i)}`);o.push(i)}e.includes("--global")&&o.push("global"),e.includes("--both")&&o.push("both");let n=Array.from(new Set(o));if(n.length>1)throw new Error(`Conflicting integration scopes: ${n.join(", ")}`);return n[0]??t.defaultScope??"global"}function Hn(e,t){return{install:e,effective:t}}function N(e,t){return{surface:e,global:Hn(t.globalInstall,t.effective==="global"||t.effective==="both"),project:Hn(t.projectInstall,t.effective==="project"||t.effective==="both"),effective:t.effective,risk:t.risk??"none",dedupeRequired:t.dedupeRequired??!1,trustRequired:t.trustRequired??t.projectInstall,note:t.note}}function nd(e){return{mcp:N("mcp",{globalInstall:!0,projectInstall:!1,effective:"global"}),hooks:N("hooks",{globalInstall:!0,projectInstall:!1,effective:"global"}),work:N("work",{globalInstall:e==="grok",projectInstall:!1,effective:e==="grok"?"global":"none",note:e==="grok"?"Grok supports a global ToolNet continuity skill.":"Cursor/Copilot work instructions remain project-scoped."})}}function Jn(e){return{mcp:N("mcp",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),hooks:N("hooks",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),work:N("work",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!1,note:e==="cursor"?"Use .cursor/rules/toolnet-memory.mdc.":e==="copilot"?"Use .github/instructions/toolnet-memory.instructions.md.":"Use .grok/skills/toolnet-continuity/SKILL.md."})}}function Ln(e){return{mcp:N("mcp",{globalInstall:!0,projectInstall:!0,effective:"project",risk:e==="cursor"?"precedence-unverified":"shadowed-global",trustRequired:!0,note:e==="cursor"?"Project ToolNet MCP is the intended effective definition; native same-name precedence must be E2E certified before release.":"Global remains useful outside the project; same-name project definition wins inside the project."}),hooks:N("hooks",{globalInstall:!0,projectInstall:!0,effective:"both",risk:"additive-duplicate",dedupeRequired:!0,trustRequired:!0,note:"Global and project hook sources can both execute for the same native event."}),work:N("work",{globalInstall:e==="grok",projectInstall:!0,effective:"project",risk:e==="grok"?"shadowed-global":"none",trustRequired:!1,note:e==="cursor"?"Project rule is authoritative.":e==="copilot"?"Project instruction is authoritative.":"Project skill shadows the same-name global skill inside the project."})}}function z(e){let{agent:t,scope:o,project:r}=e;return(o==="project"||o==="both")&&(!r||!r.eligible)?{agent:t,requestedScope:o,project:r,surfaces:o==="both"?Ln(t):Jn(t),canInstall:!1,reason:"Project scope requires an explicit project, existing ToolNet project, or Git repository root."}:{agent:t,requestedScope:o,project:r,surfaces:o==="global"?nd(t):o==="project"?Jn(t):Ln(t),canInstall:!0}}function Gn(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.rule?.changed)}function Vn(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:_({project:e.projectRoot}),n=z({agent:"cursor",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Cursor project integration scope cannot be resolved.");let i,a;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(i={},n.surfaces.mcp.global.install&&(i.mcp=Lt({binary:t,configFile:e.configFile??Te()})),n.surfaces.hooks.global.install&&(i.hooks=Jt({binary:t,hooksFile:e.hooksFile??Ae()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Cursor project integration requires an eligible project root.");a={},n.surfaces.mcp.project.install&&(a.mcp=Lt({binary:t,configFile:e.projectConfigFile??ur(r.root)})),n.surfaces.hooks.project.install&&(a.hooks=Jt({binary:t,hooksFile:e.projectHooksFile??dr(r.root)})),n.surfaces.work.project.install&&(a.rule=$n({projectRoot:r.root,ruleFile:e.projectRuleFile}))}let s=a?.mcp??i?.mcp,c=a?.hooks??i?.hooks;if(!s||!c)throw new Error("Cursor integration did not produce an effective MCP/hooks installation.");let l=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.rule?.ruleFile,a?.mcp?.configFile,a?.hooks?.hooksFile,a?.rule?.ruleFile].filter(u=>typeof u=="string")));return{installed:!0,changed:Gn(i)||Gn(a),scope:o,plan:n,project:r,global:i,projectScope:a,mcp:s,hooks:c,rule:a?.rule,files:l}}var ge=[["sessionStart",10],["userPromptSubmitted",10],["userPromptTransformed",10],["preToolUse",10],["postToolUse",15],["agentStop",30]];function id(e){if(typeof e.command=="string")return e.command;if(typeof e.bash=="string")return e.bash}function Bn(e){return v(e)&&id(e)?.includes("session:copilot-hook")===!0}function sd(e,t,o){let r={type:"command",command:`${t} session:copilot-hook`,env:{TOOLNET_HOOK_EVENT:e},timeoutSec:o};return e==="preToolUse"&&(r.matcher=".*"),r}function Bt(e={}){let t=e.hooksFile??Ne(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=A(t,"GitHub Copilot CLI");if(r.version!==void 0&&r.version!==1)throw new Error(`Unsupported existing GitHub Copilot CLI hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!v(n))throw new Error("Invalid existing GitHub Copilot CLI hooks file: hooks must be an object.");let i=v(n)?{...n}:{};for(let[l,u]of ge){let p=i[l];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing GitHub Copilot CLI hooks file: hooks.${l} must be an array.`);let d=Array.isArray(p)?p.filter(g=>!Bn(g)):[];i[l]=[...d,sd(l,o,u)]}let a={...r,version:1,hooks:i};if(JSON.stringify(r)===JSON.stringify(a))return{hooksFile:t,changed:!1,hookCount:ge.length};q(t,a);let s=A(t,"GitHub Copilot CLI");if(s.version!==1||!v(s.hooks))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");let c=0;for(let[l]of ge){let u=s.hooks[l];if(!Array.isArray(u))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");c+=u.filter(Bn).length}if(c!==ge.length)throw new Error("GitHub Copilot CLI hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:ge.length}}function Un(e,t){return h(e)?(e.type===void 0||e.type==="local"||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&Array.isArray(e.tools)&&e.tools.length===1&&e.tools[0]==="*":!1}function Ut(e={}){let t=e.configFile??_e(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=O(t,"GitHub Copilot CLI"),i=n.mcpServers;if(i!==void 0&&!h(i))throw new Error("Invalid existing GitHub Copilot CLI MCP config: mcpServers must be an object.");let a=h(i)?{...i}:{};if(Un(a[r],o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};a[r]={type:"stdio",command:o,args:["mcp"],tools:["*"]},P(t,{...n,mcpServers:a});let c=O(t,"GitHub Copilot CLI").mcpServers;if(!h(c)||!Un(c[r],o))throw new Error("GitHub Copilot CLI MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}import{mkdirSync as ad,readFileSync as qn,renameSync as cd,rmSync as ld,writeFileSync as ud}from"node:fs";import{dirname as dd}from"node:path";var qt=`---
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
`;function pd(e,t){ad(dd(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{ud(o,t,{encoding:"utf8",mode:384}),cd(o,e)}finally{ld(o,{force:!0})}}function Yn(e){let t=e.instructionFile??yr(e.projectRoot);try{if(qn(t,"utf8")===qt)return{instructionFile:t,changed:!1}}catch{}if(pd(t,qt),qn(t,"utf8")!==qt)throw new Error("Copilot ToolNet project instruction verification failed.");return{instructionFile:t,changed:!0}}function zn(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.instruction?.changed)}function Wn(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:_({project:e.projectRoot}),n=z({agent:"copilot",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Copilot project integration scope cannot be resolved.");let i,a;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(i={},n.surfaces.mcp.global.install&&(i.mcp=Ut({binary:t,configFile:e.configFile??_e()})),n.surfaces.hooks.global.install&&(i.hooks=Bt({binary:t,hooksFile:e.hooksFile??Ne()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Copilot project integration requires an eligible project root.");a={},n.surfaces.mcp.project.install&&(a.mcp=Ut({binary:t,configFile:e.projectConfigFile??mr(r.root)})),n.surfaces.hooks.project.install&&(a.hooks=Bt({binary:t,hooksFile:e.projectHooksFile??fr(r.root)})),n.surfaces.work.project.install&&(a.instruction=Yn({projectRoot:r.root,instructionFile:e.projectInstructionFile}))}let s=a?.mcp??i?.mcp,c=a?.hooks??i?.hooks;if(!s||!c)throw new Error("Copilot integration did not produce effective MCP/hooks.");let l=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.instruction?.instructionFile,a?.mcp?.configFile,a?.hooks?.hooksFile,a?.instruction?.instructionFile].filter(u=>typeof u=="string")));return{installed:!0,changed:zn(i)||zn(a),scope:o,plan:n,project:r,global:i,projectScope:a,mcp:s,hooks:c,instruction:a?.instruction,files:l}}import{existsSync as gd,mkdirSync as md,readFileSync as Qn,renameSync as fd,rmSync as yd,writeFileSync as hd}from"node:fs";import{dirname as bd}from"node:path";var Yt=`---
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
`;function kd(e,t){md(bd(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{hd(o,t,{encoding:"utf8",mode:384}),fd(o,e)}finally{yd(o,{force:!0})}}function zt(e={}){let t=e.skillFile??De();if(gd(t)&&Qn(t,"utf8")===Yt)return{skillFile:t,changed:!1};if(kd(t,Yt),Qn(t,"utf8")!==Yt)throw new Error("Grok ToolNet continuity skill was written but verification failed.");return{skillFile:t,changed:!0}}var me=[["SessionStart",10],["UserPromptSubmit",10],["PreToolUse",10],["PostToolUse",15],["Stop",30]];function Xn(e){return!v(e)||!Array.isArray(e.hooks)?!1:e.hooks.some(t=>v(t)&&typeof t.command=="string"&&t.command.includes("session:grok-hook"))}function Sd(e,t,o){let r={hooks:[{type:"command",command:`${t} session:grok-hook`,timeout:o,env:{TOOLNET_HOOK_EVENT:e}}]};return e==="PreToolUse"&&(r.matcher=".*"),r}function Wt(e={}){let t=e.hooksFile??$e(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=A(t,"Grok Build"),n=r.hooks;if(n!==void 0&&!v(n))throw new Error("Invalid existing Grok Build hooks file: hooks must be an object.");let i=v(n)?{...n}:{};for(let[l,u]of me){let p=i[l];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing Grok Build hooks file: hooks.${l} must be an array.`);let d=Array.isArray(p)?p.filter(g=>!Xn(g)):[];i[l]=[...d,Sd(l,o,u)]}let a={...r,hooks:i};if(JSON.stringify(r)===JSON.stringify(a))return{hooksFile:t,changed:!1,hookCount:me.length};q(t,a);let s=A(t,"Grok Build");if(!v(s.hooks))throw new Error("Grok Build hooks were written but verification failed.");let c=0;for(let[l]of me){let u=s.hooks[l];if(!Array.isArray(u))throw new Error("Grok Build hooks were written but verification failed.");c+=u.filter(Xn).length}if(c!==me.length)throw new Error("Grok Build hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:me.length}}import{existsSync as Id,mkdirSync as vd,readFileSync as wd,renameSync as jd,rmSync as Cd,writeFileSync as xd}from"node:fs";import{dirname as Od}from"node:path";function Zn(e){return Id(e)?wd(e,"utf8"):""}function Rd(e,t){vd(Od(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{xd(o,t,{encoding:"utf8",mode:384}),jd(o,e)}finally{Cd(o,{force:!0})}}function Qt(e){return e.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t")}function Ed(e){return`[mcp_servers."${Qt(e)}"]`}function Pd(e,t){return[Ed(e),`command = "${Qt(t)}"`,'args = ["mcp"]',"enabled = true"].join(`
`)}function Td(e){let t=e.trim();return t.startsWith("[")&&t.includes("]")}function qe(e){return e.trim().replace(/\s+/g,"")}function Ad(e){return new Set([qe(`[mcp_servers.${e}]`),qe(`[mcp_servers."${e}"]`),qe(`[mcp_servers.'${e}']`)])}function ti(e,t){let o=e.split(/\r?\n/),r=Ad(t),n=-1;for(let u=0;u<o.length;u+=1){let p=qe(o[u].replace(/\s+#.*$/,""));if(r.has(p)){n=u;break}}if(n<0)return null;let i=o.length;for(let u=n+1;u<o.length;u+=1)if(Td(o[u])){i=u;break}let a=[],s=0;for(let u of o)a.push(s),s+=u.length+1;let c=a[n]??0,l=i>=o.length?e.length:a[i]??e.length;return{start:c,end:l}}function _d(e,t,o){let r=`${Pd(t,o)}
`,n=ti(e,t);if(n){let i=e.slice(0,n.start),a=e.slice(n.end);return`${i}${r}${a.replace(/^\n+/,"")}`}return e.trim()?`${e.replace(/\s*$/,"")}

${r}`:r}function ei(e,t,o){let r=ti(e,t);if(!r)return!1;let n=e.slice(r.start,r.end);return n.includes(`command = "${Qt(o)}"`)&&/args\s*=\s*\[\s*"mcp"\s*\]/.test(n)&&/enabled\s*=\s*true/.test(n)}function Xt(e={}){let t=e.configFile??Fe(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=Zn(t);if(ei(n,r,o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};let i=_d(n,r,o);Rd(t,i);let a=Zn(t);if(!ei(a,r,o))throw new Error("Grok Build MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}function oi(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.skill?.changed)}function ri(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:_({project:e.projectRoot}),n=z({agent:"grok",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Grok project integration scope cannot be resolved.");let i,a;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(i={},n.surfaces.mcp.global.install&&(i.mcp=Xt({binary:t,configFile:e.configFile??Fe()})),n.surfaces.hooks.global.install&&(i.hooks=Wt({binary:t,hooksFile:e.hooksFile??$e()})),n.surfaces.work.global.install&&(i.skill=zt({skillFile:e.skillFile??De()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Grok project integration requires an eligible project root.");a={},n.surfaces.mcp.project.install&&(a.mcp=Xt({binary:t,configFile:e.projectConfigFile??br(r.root)})),n.surfaces.hooks.project.install&&(a.hooks=Wt({binary:t,hooksFile:e.projectHooksFile??kr(r.root)})),n.surfaces.work.project.install&&(a.skill=zt({skillFile:e.projectSkillFile??Sr(r.root)}))}let s=a?.mcp??i?.mcp,c=a?.hooks??i?.hooks,l=a?.skill??i?.skill;if(!s||!c||!l)throw new Error("Grok integration did not produce effective MCP/hooks/skill.");let u=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.skill?.skillFile,a?.mcp?.configFile,a?.hooks?.hooksFile,a?.skill?.skillFile].filter(p=>typeof p=="string")));return{installed:!0,changed:oi(i)||oi(a),scope:o,plan:n,project:r,global:i,projectScope:a,mcp:s,hooks:c,skill:l,files:u}}import{existsSync as ni,mkdirSync as Nd,readFileSync as ii,renameSync as Md,rmSync as Fd,writeFileSync as $d}from"node:fs";import{dirname as Dd}from"node:path";function Ye(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Hd(e){return`'${e.replace(/'/g,"'\\''")}'`}function Jd(e){if(!ni(e))return{};let t=ii(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Gemini settings.json at ${e}: parse error. Not overwriting.`)}if(!Ye(o))throw new Error(`Invalid existing Gemini settings.json at ${e}: root must be an object.`);return o}function Ld(e,t){Nd(Dd(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{$d(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Md(o,e)}finally{Fd(o,{force:!0})}}function Kd(e){return Ye(e)?(typeof e.command=="string"?e.command:"").includes("session:gemini-hook"):!1}function si(e={}){let t=e.settingsFile??Et(),o=Jd(t),r=e.binary??"toolnet-memory",n=`${Hd(r)} session:gemini-hook`,i=Ye(o.hooks)?{...o.hooks}:{},a=["SessionStart","SessionEnd"];for(let l of a){let p=(Array.isArray(i[l])?[...i[l]]:[]).map(d=>{if(!Ye(d)||!Array.isArray(d.hooks))return d;let g=d.hooks.filter(S=>!Kd(S));return g.length>0?{...d,hooks:g}:void 0}).filter(d=>d!==void 0);p.push({hooks:[{name:"toolnet-memory",type:"command",command:n,timeout:l==="SessionEnd"?1e4:3e4}]}),i[l]=p}o.hooks=i;let s=`${JSON.stringify(o,null,2)}
`,c=!ni(t)||ii(t,"utf8")!==s;return Ld(t,o),{settingsFile:t,changed:c,events:[...a]}}import{existsSync as ci,mkdirSync as Ud,readFileSync as li,renameSync as qd,rmSync as Yd,writeFileSync as zd}from"node:fs";import{dirname as Wd}from"node:path";import{spawnSync as ai}from"node:child_process";var Gd=new Set(["1468.30"]);function Vd(e){return e.match(/Junie version:\s*([0-9A-Za-z._+-]+)/)?.[1]??null}function Bd(){if(!(ai("sh",["-lc","command -v junie >/dev/null 2>&1"],{stdio:"ignore",timeout:5e3}).status===0))return{detected:!1,version:null};let t=ai("junie",["--version"],{stdio:["ignore","pipe","ignore"],encoding:"utf8",timeout:5e3});return t.status!==0?{detected:!0,version:null}:{detected:!0,version:Vd(t.stdout)}}function ze(e,t,o,r){return{detected:e,version:t,hooksAvailable:!1,hooksStability:r,automaticCaptureSupported:!1,captureMode:"blocked-capability",fallbackMode:"blocked-capability",manualRecoveryAvailable:!1,capabilityReason:o,gaClass:"BLOCKED",refreshMode:"blocked",sessionIdModel:e?"deterministic":"unknown",projectModel:e?"cwd-based":"unknown",resumeModel:e?"flag-based":"unknown",sessionStorage:e?"sessions-directory-unverified":"unknown"}}function We(e={}){let t=e.probe??Bd,{detected:o,version:r}=t();return o?r?Gd.has(r)?ze(!0,r,`lifecycle-hooks-unavailable-on-stable-build-${r}`,"stable"):e.hookEvidence==="verified-eap-hooks"?{detected:!0,version:r,hooksAvailable:!0,hooksStability:"eap",automaticCaptureSupported:!0,captureMode:"hook",fallbackMode:"blocked-capability",manualRecoveryAvailable:!1,capabilityReason:"verified-eap-hook-capability",gaClass:"AUTO_NATIVE",refreshMode:"native-lifecycle",sessionIdModel:"deterministic",projectModel:"cwd-based",resumeModel:"flag-based",sessionStorage:"sessions-directory-unverified"}:ze(!0,r,"unverified-eap-hook-support","unverified"):ze(!0,null,"junie-version-unparseable","unknown"):ze(!1,null,"junie-binary-not-found","unknown")}function Qe(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Zt(e){return`'${e.replace(/'/g,"'\\''")}'`}function Qd(e){if(!ci(e))return{};let t=li(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Junie config.json at ${e}: parse error. Not overwriting.`)}if(!Qe(o))throw new Error(`Invalid existing Junie config.json at ${e}: root must be an object.`);return o}function Xd(e,t){Ud(Wd(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{zd(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),qd(o,e)}finally{Yd(o,{force:!0})}}function ui(e={}){let t=e.configFile??Pt(),o=e.capability??We();if(!o.hooksAvailable||!o.automaticCaptureSupported)return{configFile:t,changed:!1,events:[],installed:!1,fallbackAvailable:!1,reason:o.capabilityReason};let r=Qd(t),n=e.binary??"toolnet-memory",i=e.projectRoot??process.cwd(),a=`${Zt(n)} session:junie-hook --project ${Zt(i)}`,s=Qe(r.hooks)?{...r.hooks}:{},c=[{name:"SessionStart",timeout:10},{name:"Stop",timeout:30},{name:"SessionEnd",timeout:8}],l=d=>!Qe(d)||typeof d.command!="string"||!d.command.includes("session:junie-hook")?!1:d.command.includes(Zt(i))||!d.command.includes("--project");for(let d of c){let S=(Array.isArray(s[d.name])?[...s[d.name]]:[]).map(y=>{if(!Qe(y)||!Array.isArray(y.hooks))return y;let J=y.hooks.filter(Ns=>!l(Ns));return J.length>0?{...y,hooks:J}:void 0}).filter(y=>y!==void 0);S.push({hooks:[{type:"command",command:a,timeout:d.timeout}]}),s[d.name]=S}r.hooks=s;let u=`${JSON.stringify(r,null,2)}
`,p=!ci(t)||li(t,"utf8")!==u;return Xd(t,r),{configFile:t,changed:p,events:c.map(d=>d.name),installed:!0,fallbackAvailable:!1}}import{existsSync as qS,mkdirSync as Zd}from"node:fs";import{dirname as ep}from"node:path";function di(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??Or({cwd:e.cwd});Zd(ep(o),{recursive:!0,mode:448});let r=O(o,"Codebuff"),n=r.mcpServers;if(n!==void 0&&!h(n))throw new Error("Invalid existing Codebuff .agents/mcp.json: mcpServers must be an object.");let i=h(n)?{...n}:{},a="toolnet-memory";return h(i[a])&&!e.force?{installed:!0,changed:!1,configFile:o,configured:!0}:(i[a]={command:t,args:["mcp"]},P(o,{...r,mcpServers:i}),{installed:!0,changed:!0,configFile:o,configured:!0})}function pi(e={}){let t=di(e);return{installed:t.installed,changed:t.changed,mcp:t,files:[t.configFile]}}import{existsSync as tI,mkdirSync as tp}from"node:fs";import{dirname as op}from"node:path";function gi(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??Pr({cwd:e.cwd});tp(op(o),{recursive:!0,mode:448});let r=O(o,"Freebuff"),n=r.mcpServers;if(n!==void 0&&!h(n))throw new Error("Invalid existing Freebuff .agents/mcp.json: mcpServers must be an object.");let i=h(n)?{...n}:{},a="toolnet-memory";return h(i[a])&&!e.force?{installed:!0,changed:!1,configFile:o,configured:!0}:(i[a]={command:t,args:["mcp"]},P(o,{...r,mcpServers:i}),{installed:!0,changed:!0,configFile:o,configured:!0})}function mi(e={}){let t=gi(e);return{installed:t.installed,changed:t.changed,mcp:t,files:[t.configFile]}}import{existsSync as bi,mkdirSync as pI,readFileSync as ki,renameSync as gI,rmSync as mI,writeFileSync as ip}from"node:fs";import{homedir as rp}from"node:os";import{join as fi}from"node:path";function np(e="toolnet-memory",t={}){return fi(t.home??rp(),".agents","plugins",e)}function yi(e="toolnet-memory",t={}){return fi(np(e,t),"hooks","hooks.json")}function hi(e){return`'${e.replace(/'/g,"'\\''")}'`}function sp(e){if(!bi(e))return{};let t;try{t=JSON.parse(ki(e,"utf8"))}catch{throw new Error(`Invalid existing Goose hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Goose hooks.json at ${e}: root must be a JSON object.`);return t}function Si(e={}){let t=e.pluginName??"toolnet-memory",o=e.hooksFile??yi(t),r=sp(o),n=e.binary??"toolnet-memory",i=`${hi(n)} session:goose-hook`,a=`${hi(n)} session:goose-hook`,s={type:"command",command:i,timeout:30},c={type:"command",command:a,timeout:3},l=r.hooks&&typeof r.hooks=="object"&&!Array.isArray(r.hooks)?r.hooks:{};r.hooks=l;let p=(Array.isArray(l.Stop)?l.Stop:[]).filter(J=>{try{return!JSON.stringify(J).includes("session:goose-hook")}catch{return!0}}),g=(Array.isArray(l.SessionEnd)?l.SessionEnd:[]).filter(J=>{try{return!JSON.stringify(J).includes("session:goose-hook")}catch{return!0}});l.Stop=[...p,{hooks:[s]}],l.SessionEnd=[...g,{hooks:[c]}];let S=JSON.stringify(r,null,2)+`
`,y=!bi(o)||ki(o,"utf8")!==S;return ip(o,S,{encoding:"utf8",mode:384}),{hooksFile:o,changed:y,stopInstalled:!0,sessionEndInstalled:!0}}function Ii(e={}){let t=Si(e);return{hooksFile:t.hooksFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as Ci,mkdirSync as cp,readFileSync as xi,renameSync as lp,rmSync as up,writeFileSync as dp}from"node:fs";import{dirname as pp}from"node:path";import{homedir as ap}from"node:os";import{join as vi}from"node:path";function wi(e={}){let t=e.projectRoot;return t?vi(t,".qwen","hooks.json"):vi(e.home??ap(),".qwen","hooks.json")}function ji(e){return`'${e.replace(/'/g,"'\\''")}'`}function gp(e){if(!Ci(e))return{};let t;try{t=JSON.parse(xi(e,"utf8"))}catch{throw new Error(`Invalid existing Qwen hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Qwen hooks.json at ${e}: root must be a JSON object.`);return t}function mp(e,t){cp(pp(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{dp(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),lp(o,e)}finally{up(o,{force:!0})}}function Oi(e={}){let t=e.hooksFile??wi({projectRoot:e.projectRoot}),o=gp(t),r=e.binary??"toolnet-memory",n=`${ji(r)} session:qwen-hook`,i=`${ji(r)} session:qwen-hook`,a={type:"command",command:n,timeout:30},s={type:"command",command:i,timeout:3},c=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=c;let u=(Array.isArray(c.Stop)?c.Stop:[]).filter(y=>{try{return!JSON.stringify(y).includes("session:qwen-hook")}catch{return!0}}),d=(Array.isArray(c.SessionEnd)?c.SessionEnd:[]).filter(y=>{try{return!JSON.stringify(y).includes("session:qwen-hook")}catch{return!0}});c.Stop=[...u,{hooks:[a]}],c.SessionEnd=[...d,{hooks:[s]}];let g=JSON.stringify(o,null,2)+`
`,S=!Ci(t)||xi(t,"utf8")!==g;return mp(t,o),{hooksFile:t,changed:S,stopInstalled:!0,sessionEndInstalled:!0}}function Ri(e={}){let t=Oi(e);return{hooksFile:t.hooksFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as Ai,mkdirSync as hp,readFileSync as bp,renameSync as kp,rmSync as Sp,writeFileSync as Ip}from"node:fs";import{dirname as vp}from"node:path";import{homedir as fp}from"node:os";import{join as yp}from"node:path";function Ei(e={}){return yp(e.home??fp(),".kimi-code","config.toml")}function Pi(e){return`'${e.replace(/'/g,"'\\''")}'`}function wp(e){return Ai(e)?bp(e,"utf8"):""}function Ti(e,t){hp(vp(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Ip(o,t,{encoding:"utf8",mode:384}),kp(o,e)}finally{Sp(o,{force:!0})}}function _i(e={}){let t=e.configFile??Ei(),o=wp(t),r=e.binary??"toolnet-memory",n=`${Pi(r)} session:kimi-hook`,i=`${Pi(r)} session:kimi-hook`,a=`[[hooks]]
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
`,c=!0),c?Ti(t,o):Ai(t)||(Ti(t,a+`
`+s+`
`),c=!0),{configFile:t,changed:c,stopInstalled:!0,sessionEndInstalled:!0}}function Ni(e={}){let t=_i(e);return{configFile:t.configFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as Fi,mkdirSync as xp,readFileSync as Op,renameSync as Rp,rmSync as Ep,writeFileSync as Pp}from"node:fs";import{dirname as Tp}from"node:path";import{homedir as jp}from"node:os";import{join as Cp}from"node:path";function Mi(e={}){return Cp(e.home??jp(),".hermes","config.yaml")}function Ap(e){return`'${e.replace(/'/g,"'\\''")}'`}function _p(e){return Fi(e)?Op(e,"utf8"):""}function Np(e,t){xp(Tp(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Pp(o,t,{encoding:"utf8",mode:384}),Rp(o,e)}finally{Ep(o,{force:!0})}}function $i(e={}){let t=e.configFile??Mi(),o=_p(t),r=e.binary??"toolnet-memory",i=`  - name: toolnet-memory-session-end
    event: on_session_end
    command: ${`${Ap(r)} session:hermes-hook`}
    timeout: 30
`,a=!1;return o.includes("toolnet-memory-session-end")||(o.includes("hooks:")?o=o.replace(/hooks:\n/,`hooks:
${i}`):o=o.trim()+`

hooks:
`+i,a=!0),(a||!Fi(t))&&(o.endsWith(`
`)||(o+=`
`),Np(t,o)),{configFile:t,changed:a,sessionEndInstalled:!0}}function Di(e={}){let t=$i(e);return{configFile:t.configFile,changed:t.changed,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as Li,mkdirSync as $p,readFileSync as Ki,renameSync as Dp,rmSync as Hp,writeFileSync as Jp}from"node:fs";import{dirname as Lp}from"node:path";import{existsSync as Mp}from"node:fs";import{homedir as Fp}from"node:os";import{join as eo}from"node:path";function Hi(e={}){let t=e.home??Fp();return Mp(eo(t,".qoder-cn"))?eo(t,".qoder-cn","settings.json"):eo(t,".qoder","settings.json")}function Ji(e){return`'${e.replace(/'/g,"'\\''")}'`}function Kp(e){if(!Li(e))return{};let t;try{t=JSON.parse(Ki(e,"utf8"))}catch{throw new Error(`Invalid existing Qoder settings.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Qoder settings.json at ${e}: root must be a JSON object.`);return t}function Gp(e,t){$p(Lp(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Jp(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Dp(o,e)}finally{Hp(o,{force:!0})}}function Gi(e={}){let t=e.settingsFile??Hi(),o=Kp(t),r=e.binary??"toolnet-memory",n=`${Ji(r)} session:qoder-hook`,i=`${Ji(r)} session:qoder-hook`,a={type:"command",command:n,timeout:30},s={type:"command",command:i,timeout:3},c=Array.isArray(o.hooks)?[...o.hooks]:[],u=c.filter(g=>{try{return!JSON.stringify(g).includes("session:qoder-hook")}catch{return!0}}).filter(g=>{try{return!JSON.stringify(g).includes("session:qoder-hook")}catch{return!0}});c.length=0,c.push({...a,event:"Stop"},{...s,event:"SessionEnd"}),o.hooks=c;let p=JSON.stringify(o,null,2)+`
`,d=!Li(t)||Ki(t,"utf8")!==p;return Gp(t,o),{settingsFile:t,changed:d,stopInstalled:!0,sessionEndInstalled:!0}}function Vi(e={}){let t=Gi(e);return{settingsFile:t.settingsFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as Vp,mkdirSync as Bi,readFileSync as Bp,renameSync as Up,rmSync as qp,writeFileSync as Yp}from"node:fs";import{dirname as zp,join as Xe}from"node:path";import{homedir as Wp}from"node:os";function Qp(e,t){Bi(zp(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Yp(o,t,{encoding:"utf8",mode:493}),Up(o,e)}finally{qp(o,{force:!0})}}var to=`#!/usr/bin/env node
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
`;function Ui(e={}){let t=e.cwd?Xe(e.cwd,".toolnet","bin"):Xe(process.env.TOOLNET_HOME??Xe(Wp(),".toolnet"),"bin");Bi(t,{recursive:!0,mode:448});let o=Xe(t,"aider-wrapper"),r=to.endsWith(`
`)?to:to+`
`,n=!Vp(o)||Bp(o,"utf8")!==r;return Qp(o,r),{launcherPath:o,changed:n}}import{existsSync as qi,mkdirSync as Xp,readFileSync as Yi,renameSync as Zp,rmSync as eg,writeFileSync as tg}from"node:fs";import{dirname as og,join as zi}from"node:path";import{homedir as rg}from"node:os";function ng(){return process.env.PLANDEX_BASE_DIR??zi(rg(),"plandex-server")}function ig(e){if(!qi(e))return{};let t;try{t=JSON.parse(Yi(e,"utf8"))}catch{throw new Error(`Invalid existing Plandex config at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Plandex config at ${e}: root must be a JSON object.`);return t}function sg(e,t){Xp(og(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{tg(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Zp(o,e)}finally{eg(o,{force:!0})}}function Wi(e={}){let t=ng(),o=zi(t,"toolnet-memory.json"),r=ig(o),n=r.toolnetMemory??{};n.integration="toolnet-memory",n.captureMode="manual-recovery",n.managedBy="toolnet-memory",r.toolnetMemory=n;let i=JSON.stringify(r,null,2)+`
`,a=!qi(o)||Yi(o,"utf8")!==i;return sg(o,r),{configPath:o,changed:a}}import{existsSync as Qi,mkdirSync as Xi,readFileSync as Zi,renameSync as ag,rmSync as cg,writeFileSync as lg}from"node:fs";import{dirname as es,join as ug}from"node:path";import{homedir as dg}from"node:os";function pg(e){if(!Qi(e))return{};let t;try{t=JSON.parse(Zi(e,"utf8"))}catch{throw new Error(`Invalid existing OpenRouter config at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing OpenRouter config at ${e}: root must be a JSON object.`);return t}function gg(e,t){Xi(es(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{lg(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),ag(o,e)}finally{cg(o,{force:!0})}}function ts(e={}){let t=dg(),o=ug(t,".config","openrouter","toolnet-memory.json");Xi(es(o),{recursive:!0,mode:448});let r=pg(o);r.toolnetMemory={integration:"toolnet-memory",captureMode:"blocked-product-identity",managedBy:"toolnet-memory",blocked:!0,reason:"OpenRouter CLI product identity is blocked for ToolNet integration."};let n=JSON.stringify(r,null,2)+`
`,i=!Qi(o)||Zi(o,"utf8")!==n;return gg(o,r),{configPath:o,blocked:!0,changed:i}}import{existsSync as ss,mkdirSync as fg,readFileSync as as,renameSync as yg,rmSync as hg,writeFileSync as bg}from"node:fs";import{dirname as kg}from"node:path";import{homedir as mg}from"node:os";import{join as os}from"node:path";function rs(e={}){return os(e.home??mg(),".bob","settings","settings.json")}function ns(e){return os(e,".bob","settings.json")}function Sg(e){if(!ss(e))return{};let t;try{t=JSON.parse(as(e,"utf8"))}catch{throw new Error(`Invalid existing Bob settings.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Bob settings.json at ${e}: root must be a JSON object.`);return t}function Ig(e,t){fg(kg(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{bg(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),yg(o,e)}finally{hg(o,{force:!0})}}function is(e){return`'${e.replace(/'/g,"'\\''")}'`}function cs(e={}){let t=e.projectRoot!==void 0?ns(e.projectRoot):rs({home:e.home}),o=Sg(t),r=e.binary??"toolnet-memory",n=`${is(r)} hook ibm-bob`,i=`${is(r)} hook ibm-bob`,a={type:"command",command:n,timeout:10},s={type:"command",command:i,timeout:10},c=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=c;let u=(Array.isArray(c.Stop)?c.Stop:[]).filter(y=>{try{return!JSON.stringify(y).includes("hook ibm-bob")}catch{return!0}}),d=(Array.isArray(c.SessionStart)?c.SessionStart:[]).filter(y=>{try{return!JSON.stringify(y).includes("hook ibm-bob")}catch{return!0}});c.Stop=[...u,{hooks:[a]}],c.SessionStart=[...d,{hooks:[s]}];let g=JSON.stringify(o,null,2)+`
`,S=!ss(t)||as(t,"utf8")!==g;return Ig(t,o),{settingsFile:t,changed:S,stopInstalled:!0,sessionStartInstalled:!0}}function ls(e={}){let t=cs(e);return{settingsFile:t.settingsFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionStartInstalled:t.sessionStartInstalled}}import{existsSync as oo,mkdirSync as ps,readFileSync as ro,renameSync as wg,rmSync as jg,writeFileSync as Cg}from"node:fs";import{dirname as xg,join as no}from"node:path";import{homedir as vg}from"node:os";import{join as us}from"node:path";function ds(e){return e?us(e,".cline","hooks"):us(vg(),"Documents","Cline","Hooks")}function Og(e){return`'${e.replace(/'/g,"'\\''")}'`}function io(e,t){ps(xg(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Cg(o,t,{encoding:"utf8",mode:493}),wg(o,e)}finally{jg(o,{force:!0})}}function Rg(e){return`#!/bin/sh
exec ${`${Og(e)} hook cline`}
`}function gs(e={}){let t=e.binary??"toolnet-memory",o=ds(e.projectRoot),r=no(o,"toolnet-memory.sh");ps(o,{recursive:!0,mode:448});let n=Rg(t),i=!oo(r)||ro(r,"utf8")!==n;io(r,n);let a=no(o,"TaskComplete"),s=no(o,"TaskStart"),c=!1,l=!1;return(!oo(a)||ro(a,"utf8")!==n)&&(io(a,n),c=!0),(!oo(s)||ro(s,"utf8")!==n)&&(io(s,n),l=!0),{hooksDir:o,hooksFile:r,changed:i||c||l,taskCompleteInstalled:c,taskStartInstalled:l}}function ms(e={}){let t=gs(e);return{hooksFile:t.hooksFile,hooksDir:t.hooksDir,changed:t.changed,taskCompleteInstalled:t.taskCompleteInstalled,taskStartInstalled:t.taskStartInstalled}}import{existsSync as hs,mkdirSync as bs,readFileSync as Tg,renameSync as Ag,rmSync as _g,writeFileSync as Ng}from"node:fs";import{dirname as ks}from"node:path";import{homedir as Eg}from"node:os";import{join as Pg}from"node:path";function fs(){return Pg(Eg(),".rovodev","config.yml")}function Ss(e){return`'${e.replace(/'/g,"'\\''")}'`}function ys(e,t){bs(ks(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Ng(o,t,{encoding:"utf8",mode:384}),Ag(o,e)}finally{_g(o,{force:!0})}}function Mg(e){return hs(e)?Tg(e,"utf8"):""}function Fg(e){let t=`  - type: command
    command: ${Ss("toolnet-memory hook rovo")}
    timeout: 10
`;if(e.includes("hooks:")){if(e.includes("toolnet-memory hook rovo"))return e;let o=e.split(`
`),n=o.length-1;for(let i=o.length-1;i>=0&&o[i].trim()==="";i--)n=i;return o.splice(n,0,t),o.join(`
`)}return e+`
hooks:
${t}`}function Is(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??fs();if(bs(ks(o),{recursive:!0,mode:448}),!hs(o)){let a=`hooks:
  - type: command
    command: ${Ss(`${t} hook rovo`)}
    timeout: 10
`;return ys(o,a),{configFile:o,changed:!0,hookInstalled:!0}}let r=Mg(o),n=Fg(r),i=r!==n;return i&&ys(o,n),{configFile:o,changed:i,hookInstalled:i}}function vs(e={}){let t=Is(e);return{configFile:t.configFile,changed:t.changed,hookInstalled:t.hookInstalled}}import{existsSync as js,mkdirSync as xs,readFileSync as Cs,renameSync as Hg,rmSync as Jg,writeFileSync as Lg}from"node:fs";import{dirname as Os,join as Kg}from"node:path";import{homedir as $g}from"node:os";import{join as Dg}from"node:path";function ws(){return[Dg($g(),".warp")]}function Gg(e,t){xs(Os(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Lg(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Hg(o,e)}finally{Jg(o,{force:!0})}}function Rs(e={}){let t=ws(),o=Kg(t[0],"toolnet-memory.json");xs(Os(o),{recursive:!0,mode:448});let r=js(o)?JSON.parse(Cs(o,"utf8")):{};r.toolnetMemory={integration:"toolnet-memory",captureMode:"blocked-capability",managedBy:"toolnet-memory",blocked:!0,reason:"Warp Agent CLI capability is blocked for ToolNet integration."};let n=JSON.stringify(r,null,2)+`
`,i=!js(o)||Cs(o,"utf8")!==n;return Gg(o,r),{configFile:o,blocked:!0,changed:i}}function Es(e={}){if(e.scope==="global")return{scope:"global",automatic:!1,reason:"explicit-global"};if(e.scope==="project"||e.scope==="both"){let o=_({cwd:e.cwd,project:e.projectRoot});if(!o.eligible)throw new Error(`Explicit ${e.scope} integration requires an explicit project, ToolNet project, or Git repository root.`);return{scope:e.scope,automatic:!1,project:o,reason:e.scope==="project"?"explicit-project":"explicit-both"}}let t=_({cwd:e.cwd,project:e.projectRoot});return t.toolnetProject?{scope:"both",automatic:!0,project:t,reason:"toolnet-project"}:{scope:"global",automatic:!0,reason:"no-toolnet-project"}}function Ps(){return Fr()}function so(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[],r=e.detections??Ps(),n=new Map(r.map(a=>[a.agent,a.detected])),i=Es({scope:e.scope,projectRoot:e.projectRoot,cwd:e.cwd});if(!(e.force===!0||n.get("agy")===!0))o.push({agent:"agy",detected:!1,installed:!1,targets:[]});else try{let s=Gr({binary:t});o.push({agent:"agy",detected:!0,installed:!0,targets:s.files})}catch(s){o.push({agent:"agy",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("gemini")===!0))o.push({agent:"gemini",detected:!1,installed:!1,targets:[]});else try{let s=si({...e.gemini,binary:t});o.push({agent:"gemini",detected:!0,installed:!0,targets:[s.settingsFile]})}catch(s){o.push({agent:"gemini",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("junie")===!0))o.push({agent:"junie",detected:!1,installed:!1,targets:[]});else{let s=e.junie?.capability??We();if(!s.hooksAvailable||!s.automaticCaptureSupported)o.push({agent:"junie",detected:!0,installed:!1,targets:[],error:`Junie capture blocked: ${s.capabilityReason}. Capture mode: ${s.captureMode}`});else try{let c=e.junie?.projectRoot??i.project?.root??e.projectRoot??e.cwd??process.cwd(),l=ui({...e.junie?.configFile?{configFile:e.junie.configFile}:{},capability:s,binary:t,projectRoot:c});o.push({agent:"junie",detected:!0,installed:l.installed,targets:l.installed?[l.configFile]:[],...l.installed?{}:{error:l.reason}})}catch(c){o.push({agent:"junie",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}}if(!(e.force===!0||n.get("opencode")===!0))o.push({agent:"opencode",detected:!1,installed:!1,targets:[]});else try{let s=zr({binary:t}),c=en({binary:t});o.push({agent:"opencode",detected:!0,installed:!0,targets:[...s,c.configFile,`mcp:${c.serverName}`]})}catch(s){o.push({agent:"opencode",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("claude")===!0))o.push({agent:"claude",detected:!1,installed:!1,targets:[]});else try{let s=In({binary:t});o.push({agent:"claude",detected:!0,installed:!0,targets:[s.hooks.settingsFile,s.mcp.configFile,`mcp:${s.mcp.serverName}`]})}catch(s){o.push({agent:"claude",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("kiro")===!0))o.push({agent:"kiro",detected:!1,installed:!1,targets:[]});else try{let s=En({...e.kiro??{},binary:t});o.push({agent:"kiro",detected:!0,installed:!0,targets:[s.mcp.configFile,`mcp:${s.mcp.serverName}`,s.hooks.hooksFile]})}catch(s){o.push({agent:"kiro",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("cursor")===!0))o.push({agent:"cursor",detected:!1,installed:!1,targets:[]});else try{let s=e.cursor??{},c=Vn({...s,binary:t,scope:s.scope??i.scope,projectRoot:s.projectRoot??i.project?.root});o.push({agent:"cursor",detected:!0,installed:!0,scope:c.scope,projectRoot:c.project?.root,targets:[...c.files,`mcp:${c.mcp.serverName}`]})}catch(s){o.push({agent:"cursor",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("copilot")===!0))o.push({agent:"copilot",detected:!1,installed:!1,targets:[]});else try{let s=e.copilot??{},c=Wn({...s,binary:t,scope:s.scope??i.scope,projectRoot:s.projectRoot??i.project?.root});o.push({agent:"copilot",detected:!0,installed:!0,scope:c.scope,projectRoot:c.project?.root,targets:[...c.files,`mcp:${c.mcp.serverName}`]})}catch(s){o.push({agent:"copilot",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("grok")===!0))o.push({agent:"grok",detected:!1,installed:!1,targets:[]});else try{let s=e.grok??{},c=ri({...s,binary:t,scope:s.scope??i.scope,projectRoot:s.projectRoot??i.project?.root});o.push({agent:"grok",detected:!0,installed:!0,scope:c.scope,projectRoot:c.project?.root,targets:[...c.files,`mcp:${c.mcp.serverName}`]})}catch(s){o.push({agent:"grok",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("toolnet-cli")===!0))o.push({agent:"toolnet-cli",detected:!1,installed:!1,targets:[]});else try{let s=e.toolnetCli??{},c=Tn({...s,binary:t});o.push({agent:"toolnet-cli",detected:!0,installed:!0,targets:[c.mcp.configFile]})}catch(s){o.push({agent:"toolnet-cli",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("kilo")===!0))o.push({agent:"kilo",detected:!1,installed:!1,targets:[]});else try{let s=e.kilo??{},c=_n({...s,binary:t});o.push({agent:"kilo",detected:!0,installed:!0,targets:[c.mcp.configFile]})}catch(s){o.push({agent:"kilo",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("codebuff")===!0))o.push({agent:"codebuff",detected:!1,installed:!1,targets:[]});else try{let s=pi({...e.codebuff,binary:t,...e.codebuff?.cwd||e.cwd?{cwd:e.codebuff?.cwd??e.cwd}:{}});o.push({agent:"codebuff",detected:!0,installed:!0,targets:[s.mcp.configFile]})}catch(s){o.push({agent:"codebuff",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("freebuff")===!0))o.push({agent:"freebuff",detected:!1,installed:!1,targets:[]});else try{let s=mi({...e.freebuff,binary:t,...e.freebuff?.cwd||e.cwd?{cwd:e.freebuff?.cwd??e.cwd}:{}});o.push({agent:"freebuff",detected:!0,installed:!0,targets:[s.mcp.configFile]})}catch(s){o.push({agent:"freebuff",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}{let a=e.force===!0||n.get("continue")===!0;o.push({agent:"continue",detected:a,installed:a,targets:a?[Ar()]:[]})}if(!(e.force===!0||n.get("codex")===!0))o.push({agent:"codex",detected:!1,installed:!1,targets:[]});else try{let s=sn({binary:t}),c=cn({binary:t}),l=gn({binary:t}),u=yn({binary:t});if(!u.installed)throw new Error(u.error??"Codex MCP registration failed");let p=[s.configFile,c,l.hooksFile,`mcp:${u.serverName}`];s.preservedPrevious&&p.push(s.previousFile),o.push({agent:"codex",detected:!0,installed:!0,targets:p})}catch(s){o.push({agent:"codex",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("goose")===!0))o.push({agent:"goose",detected:!1,installed:!1,targets:[]});else try{let s=e.goose??{},c=Ii({...s,binary:t});o.push({agent:"goose",detected:!0,installed:!0,targets:[c.hooksFile]})}catch(s){o.push({agent:"goose",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("qwen")===!0))o.push({agent:"qwen",detected:!1,installed:!1,targets:[]});else try{let s=e.qwen??{},c=Ri({...s,binary:t});o.push({agent:"qwen",detected:!0,installed:!0,targets:[c.hooksFile]})}catch(s){o.push({agent:"qwen",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("kimi")===!0))o.push({agent:"kimi",detected:!1,installed:!1,targets:[]});else try{let s=e.kimi??{},c=Ni({...s,binary:t});o.push({agent:"kimi",detected:!0,installed:!0,targets:[c.configFile]})}catch(s){o.push({agent:"kimi",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("hermes")===!0))o.push({agent:"hermes",detected:!1,installed:!1,targets:[]});else try{let s=e.hermes??{},c=Di({...s,binary:t});o.push({agent:"hermes",detected:!0,installed:!0,targets:[c.configFile]})}catch(s){o.push({agent:"hermes",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("qoder")===!0))o.push({agent:"qoder",detected:!1,installed:!1,targets:[]});else try{let s=e.qoder??{},c=Vi({...s,binary:t});o.push({agent:"qoder",detected:!0,installed:!0,targets:[c.settingsFile]})}catch(s){o.push({agent:"qoder",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("aider")===!0))o.push({agent:"aider",detected:!1,installed:!1,targets:[]});else try{let s=e.aider??{},c=Ui({...s,binary:t});o.push({agent:"aider",detected:!0,installed:!0,targets:[c.launcherPath]})}catch(s){o.push({agent:"aider",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("plandex")===!0))o.push({agent:"plandex",detected:!1,installed:!1,targets:[]});else try{let s=e.plandex??{},c=Wi({...s,binary:t});o.push({agent:"plandex",detected:!0,installed:!0,targets:[c.configPath]})}catch(s){o.push({agent:"plandex",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("openrouter")===!0))o.push({agent:"openrouter",detected:!1,installed:!1,targets:[]});else try{let s=e.openrouter??{},c=ts({...s,binary:t});o.push({agent:"openrouter",detected:!0,installed:!0,targets:[c.configPath]})}catch(s){o.push({agent:"openrouter",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("bob")===!0))o.push({agent:"bob",detected:!1,installed:!1,targets:[]});else try{let s=e.bob??{},c=ls({...s,binary:t});o.push({agent:"bob",detected:!0,installed:!0,targets:[c.settingsFile]})}catch(s){o.push({agent:"bob",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("cline")===!0))o.push({agent:"cline",detected:!1,installed:!1,targets:[]});else try{let s=e.cline??{},c=ms({...s,binary:t});o.push({agent:"cline",detected:!0,installed:!0,targets:[c.hooksFile]})}catch(s){o.push({agent:"cline",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("rovo")===!0))o.push({agent:"rovo",detected:!1,installed:!1,targets:[]});else try{let s=e.rovo??{},c=vs({...s,binary:t});o.push({agent:"rovo",detected:!0,installed:!0,targets:[c.configFile]})}catch(s){o.push({agent:"rovo",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("warp")===!0))o.push({agent:"warp",detected:!1,installed:!1,targets:[]});else try{let s=e.warp??{},c=Rs({...s,binary:t});o.push({agent:"warp",detected:!0,installed:!0,targets:[c.configFile]})}catch(s){o.push({agent:"warp",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}return o}function Ze(e){switch(e){case"agy":return"Agy / Antigravity";case"opencode":return"OpenCode";case"claude":return"Claude Code";case"kiro":return"Kiro CLI";case"cursor":return"Cursor CLI";case"copilot":return"GitHub Copilot CLI";case"grok":return"Grok Build";case"toolnet-cli":return"ToolNet CLI";case"kilo":return"Kilo";case"codex":return"Codex";case"goose":return"goose";case"qwen":return"Qwen Code";case"kimi":return"Kimi Code CLI";case"hermes":return"Hermes Agent";case"qoder":return"Qoder CLI";case"aider":return"Aider";case"plandex":return"Plandex";case"openrouter":return"OpenRouter CLI";case"bob":return"IBM Bob Shell";case"cline":return"Cline CLI";case"rovo":return"Rovo Dev CLI";case"warp":return"Warp Agent CLI";case"gemini":return"Gemini CLI";case"junie":return"Junie";case"codebuff":return"Codebuff";case"freebuff":return"Freebuff";case"continue":return"Continue";default:return e}}function Vg(e){console.log(""),console.log("ToolNet Memory Integration Detection"),console.log("===================================="),console.log("");for(let t of e){let o=Ze(t.agent);if(!t.detected){console.log(`\u25CB ${o}: not detected`);continue}console.log(`\u2713 ${o}: detected`);for(let r of t.evidence)console.log(`  ${r}`)}console.log("")}var Bg=["claude","cursor","copilot","grok","kiro","opencode","codex","agy"],Ug={opencode:"toolnet-memory session:opencode-sync",codex:"toolnet-memory session:codex-sync",agy:"toolnet-memory session:agy-sync","toolnet-cli":"toolnet-memory session:toolnet-cli-sync"};function qg(e){if(Bg.includes(e))return"ToolNet integration configured; hooks installed successfully";let t=Ug[e];return t?`ToolNet integration configured; run ${t} to capture session history`:"ToolNet integration configured; capture begins when a supported hook or sync runs"}function Yg(e){console.log(""),console.log("ToolNet Memory AI Integrations"),console.log("=============================="),console.log("");for(let t of e){let o=Ze(t.agent);if(!t.detected){console.log(`- ${o}: not detected`);continue}if(t.installed){let r=t.scope?` [scope=${t.scope}]`:"";console.log(`\u2713 ${o}: ${qg(t.agent)}${r}`),t.projectRoot&&console.log(`  project: ${t.projectRoot}`);continue}console.log(`\u2717 ${o}: integration failed`),t.error&&console.log(`  ${t.error}`)}console.log("")}function zg(e,t){let o=e.indexOf(t);return o>=0?e[o+1]:void 0}function Wg(e){return e.includes("--scope")||e.includes("--global")||e.includes("--both")?Kn(e):void 0}async function Qg(){let e=process.argv.slice(2),t=e.includes("--all"),o=e.includes("--json"),r=e.includes("--detect-only"),n=Wg(e),i=zg(e,"--project");if(r){let s=Ps();if(o){console.log(JSON.stringify(s,null,2));return}Vg(s);return}let a=so({force:t,scope:n,projectRoot:i});if(o){console.log(JSON.stringify(a,null,2));return}Yg(a)}var Xg=process.argv[1]&&(process.argv[1].endsWith("auto-integrate.js")||process.argv[1].endsWith("auto-integrate.ts"));Xg&&Qg().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});function _s(e){let t=em(e);if(!ao(t))throw new Error(`Project path does not exist: ${t}`);if(!Zg(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);return t}function Vw(e=process.cwd()){let t=_s(e),o=new K().detect(t),r=As(o.rootPath,".toolnet","project.json");if(!ao(r))throw new Error(`ToolNet project initialization failed: ${r} was not created`);return{initialized:!0,project:{id:o.id,name:o.name,remote:o.remote,rootPath:o.rootPath},manifestFile:r}}async function tm(e=process.cwd(),t={}){let o=_s(e),r={skipRemoteIdentity:t.skipRemoteIdentity,adoptRemote:t.adoptRemote,allowGitRebind:t.allowGitRebind},n=await qo(o,r),i=n.project,a=As(i.rootPath,".toolnet","project.json");if(!ao(a))throw new Error(`ToolNet project initialization failed: ${a} was not created`);return{initialized:!0,project:{id:i.id,name:i.name,remote:i.remote,rootPath:i.rootPath},manifestFile:a,identity:{source:n.source,registry:n.registry,registryProvider:n.registryProvider,gitRemote:n.gitIdentity?.canonicalRemote,fingerprint:n.gitIdentity?.fingerprint}}}function Ts(e,t){let o=e.indexOf(t);if(o<0)return;let r=e[o+1];if(!(!r||r.startsWith("-")))return r}async function om(){let e=process.argv.slice(2),t=e.includes("--json"),o=!e.includes("--no-integrate"),r=e.includes("--no-remote-identity"),n=e.includes("--rebind-git-identity"),i=Ts(e,"--adopt-remote"),a=Ts(e,"--project"),s=new Set(["--project","--adopt-remote"]),c=e.find((d,g)=>{if(d.startsWith("-"))return!1;let S=e[g-1];return!(S&&s.has(S))}),l=a??c??process.cwd(),u=await st("Resolving ToolNet project identity",()=>tm(l,{skipRemoteIdentity:r,adoptRemote:i,allowGitRebind:n}),{enabled:!t}),p=[];if(o&&(p=await st("Detecting coding agents",()=>so({projectRoot:u.project.rootPath}),{enabled:!t})),t){console.log(JSON.stringify({...u,integrations:p},null,2));return}if(console.log(""),console.log("ToolNet Memory"),console.log("=============="),console.log(""),console.log("\u2713 Project initialized"),console.log(""),console.log(`Project:  ${u.project.name}`),console.log(`ID:       ${u.project.id}`),console.log(`Remote:   ${u.project.remote??u.project.name}`),console.log(`Root:     ${u.project.rootPath}`),console.log(`Manifest: ${u.manifestFile}`),u.identity&&(console.log(`Identity: ${u.identity.source}`),console.log(`Registry: ${u.identity.registry}`),u.identity.gitRemote&&console.log(`Git:      ${u.identity.gitRemote}`)),console.log(""),o){console.log("AI integrations:");let d=p.filter(g=>g.detected&&g.installed);if(!d.length)console.log("  \u25CB No supported coding agent detected");else for(let g of d){let S=Ze(g.agent),y=wo(g.agent);console.log(`  \u2713 ${S} \u2014 ${y}`)}console.log("")}console.log("Next: toolnet-memory doctor"),console.log("")}var rm=process.argv[1]?.endsWith("/init.js")||process.argv[1]?.endsWith("/init.ts");rm&&om().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});export{Vw as initializeToolNetProject,tm as initializeToolNetProjectCrossMachine};
