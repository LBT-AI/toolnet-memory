import{existsSync as Yt,statSync as $p}from"node:fs";import{resolve as Dp,join as Qi}from"node:path";import{existsSync as Zi,readFileSync as es}from"node:fs";import{homedir as ts}from"node:os";import{join as os}from"node:path";function rs(e){let t=e.trim();return t.length>=2&&t.startsWith('"')&&t.endsWith('"')?(t=t.slice(1,-1),t.replace(/\\n/g,`
`).replace(/\\r/g,"\r").replace(/\\t/g,"	").replace(/\\"/g,'"').replace(/\\\\/g,"\\")):t.length>=2&&t.startsWith("'")&&t.endsWith("'")?t.slice(1,-1):t}function ns(){let e=process.env.TOOLNET_GLOBAL_ENV??os(ts(),".config","toolnet-memory",".env");if(!Zi(e))return;let t=es(e,"utf8");for(let o of t.split(/\r?\n/)){let r=o.trim();if(!r||r.startsWith("#"))continue;r.startsWith("export ")&&(r=r.slice(7));let n=r.indexOf("=");if(n<=0)continue;let i=r.slice(0,n).trim();/^[A-Za-z_][A-Za-z0-9_]*$/.test(i)&&process.env[i]===void 0&&(process.env[i]=rs(r.slice(n+1)))}}ns();function z(e,t){return e===void 0?t:["1","true","yes","on"].includes(e.toLowerCase())}function W(e,t){if(!e)return t;let o=Number(e);return Number.isFinite(o)?o:t}function ze(){return{memory:{autoCapture:z(process.env.MEMORY_AUTO_CAPTURE,!0),autoRetrieve:z(process.env.MEMORY_AUTO_RETRIEVE,!0),autoSummarize:z(process.env.MEMORY_AUTO_SUMMARIZE,!0),autoSync:z(process.env.MEMORY_AUTO_SYNC,!0)},retrieval:{maxCandidates:W(process.env.MEMORY_MAX_CANDIDATES,50),rerankTop:W(process.env.MEMORY_RERANK_TOP,10),finalContext:W(process.env.MEMORY_FINAL_CONTEXT,5),tokenBudget:W(process.env.MEMORY_TOKEN_BUDGET,2e3)},storage:{provider:process.env.MEMORY_STORAGE_PROVIDER??"huggingface",r2:{accountId:process.env.R2_ACCOUNT_ID,bucket:process.env.R2_BUCKET,accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY},s3:{endpoint:process.env.S3_ENDPOINT,region:process.env.S3_REGION,bucket:process.env.S3_BUCKET,accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY,forcePathStyle:z(process.env.S3_FORCE_PATH_STYLE,!1)},huggingface:{namespace:process.env.HF_NAMESPACE,bucket:process.env.HF_BUCKET,accessKeyId:process.env.HF_S3_ACCESS_KEY_ID,secretAccessKey:process.env.HF_S3_SECRET_ACCESS_KEY},localRoot:process.env.MEMORY_LOCAL_STORAGE_PATH},cache:{maxMb:W(process.env.MEMORY_LOCAL_CACHE_MB,200)}}}import{createHash as ds}from"node:crypto";import{existsSync as he,mkdirSync as ps,readFileSync as gs,renameSync as ms,writeFileSync as fs}from"node:fs";import{basename as ys,dirname as ke,join as X,parse as to,resolve as M}from"node:path";import{createHash as Qt}from"node:crypto";import{spawnSync as is}from"node:child_process";var Q="git-remote-v1",ss=new Set(["github.com","gitlab.com","bitbucket.org"]);function Xt(e,t){let o=t.replaceAll("\\","/").replace(/^\/+/u,"").replace(/\/+$/u,"").replace(/\.git$/iu,"").replace(/\/+/gu,"/");return!o||o==="."||o===".."||o.split("/").some(r=>!r||r==="."||r==="..")?null:(ss.has(e)&&(o=o.toLowerCase()),o)}function as(e){let t;try{t=new URL(e)}catch{return null}if(!["https:","http:","ssh:","git:"].includes(t.protocol))return null;let o=t.hostname.trim().toLowerCase();if(!o)return null;let r=t.protocol==="https:"&&t.port==="443"||t.protocol==="http:"&&t.port==="80"||t.protocol==="ssh:"&&t.port==="22",n=t.port&&!r?`${o}:${t.port}`:o,i=Xt(o,t.pathname);return i?`${n}/${i}`:null}function cs(e){let t=e.match(/^(?:[^@\s/:]+@)?([^:/\s]+):(.+)$/u);if(!t)return null;let o=t[1]?.trim().toLowerCase();if(!o||o.length===1)return null;let r=Xt(o,t[2]??"");return r?`${o}/${r}`:null}function zt(e){let t=e.trim();return t?t.includes("://")?as(t):cs(t):null}function ls(e){return Qt("sha256").update(`${Q}:${e}`).digest("hex")}function Zt(e){return Qt("sha256").update(`toolnet-project:${Q}:${e}`).digest("hex").slice(0,16)}function us(e){return e.split("/").filter(Boolean).at(-1)?.trim()||null}function We(e,t){let o=is("git",["-C",e,...t],{encoding:"utf8",windowsHide:!0,stdio:["ignore","pipe","ignore"]});return o.error||o.status!==0?null:o.stdout?.trim()||null}function Wt(e,t){let o=us(e);return o?{scheme:Q,canonicalRemote:e,fingerprint:ls(e),repositoryName:o,source:t}:null}function me(e){let t=We(e,["remote","get-url","origin"]);if(t){let n=zt(t);if(n)return Wt(n,"origin")}let o=We(e,["remote"]);if(!o)return null;let r=new Set;for(let n of o.split(/\r?\n/u).map(i=>i.trim()).filter(Boolean)){let i=We(e,["remote","get-url",n]);if(!i)continue;let a=zt(i);a&&r.add(a)}return r.size!==1?null:Wt([...r][0],"unique-remote")}var oo=".toolnet",hs="project.json";function ks(e){return ds("sha256").update(e).digest("hex").slice(0,16)}function H(e){return X(e,oo,hs)}function ro(e){return he(H(e))}function eo(e,t){let o=M(e),r=to(o).root;for(;;){if(ro(o))return o;if(o===r||t&&o===M(t))break;let n=ke(o);if(n===o)break;o=n}return null}function Qe(e){let t=M(e),o=to(t).root,r=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"];for(;;){if(r.some(i=>he(X(t,i))))return t;if(t===o)break;let n=ke(t);if(n===t)break;t=n}return M(e)}function fe(e){let t;try{t=JSON.parse(gs(e,"utf8"))}catch(n){throw new Error(`Invalid ToolNet project manifest: ${e}: ${n instanceof Error?n.message:String(n)}`)}if(!t||typeof t!="object")throw new Error(`Invalid ToolNet project manifest: ${e}`);let o=t;if(typeof o.id!="string"||!o.id.trim())throw new Error(`ToolNet project manifest is missing id: ${e}`);if(typeof o.name!="string"||!o.name.trim())throw new Error(`ToolNet project manifest is missing name: ${e}`);let r=new Date().toISOString();return{version:1,id:o.id,name:o.name,remote:typeof o.remote=="string"&&o.remote.trim()?o.remote:o.name,rootPath:typeof o.rootPath=="string"?o.rootPath:ke(ke(e)),createdAt:typeof o.createdAt=="string"?o.createdAt:r,updatedAt:typeof o.updatedAt=="string"?o.updatedAt:r,graphVersion:typeof o.graphVersion=="number"?o.graphVersion:0,memoryVersion:typeof o.memoryVersion=="number"?o.memoryVersion:0,metadata:o.metadata&&typeof o.metadata=="object"?o.metadata:void 0}}function ye(e,t){let o=X(e,oo);ps(o,{recursive:!0});let r=H(e),n=`${r}.tmp-${process.pid}`;fs(n,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),ms(n,r)}function N(e,t){return{id:e.id,name:e.name,remote:e.remote,rootPath:t,createdAt:e.createdAt,updatedAt:e.updatedAt,graphVersion:e.graphVersion,memoryVersion:e.memoryVersion,metadata:e.metadata}}function Xe(e){return{version:1,scheme:Q,canonicalRemote:e.canonicalRemote,fingerprint:e.fingerprint,repositoryName:e.repositoryName}}function bs(e){let t=e.metadata?.toolnetIdentity;if(!t||typeof t!="object"||Array.isArray(t))return null;let o=t;return typeof o.fingerprint=="string"?o.fingerprint:null}var L=class{adopt(t,o){let r=Qe(M(t));if(!o.id.trim())throw new Error("PROJECT_ADOPTION_INVALID_ID");if(!o.name.trim())throw new Error("PROJECT_ADOPTION_INVALID_NAME");if(!o.remote.trim())throw new Error("PROJECT_ADOPTION_INVALID_REMOTE");if(ro(r)){let s=fe(H(r));if(s.id!==o.id)throw new Error(["PROJECT_IDENTITY_ALREADY_EXISTS",`existing=${s.id}`,`requested=${o.id}`].join(" "));return N(s,r)}let n=new Date().toISOString(),i={...o.metadata};o.gitIdentity&&(i.toolnetIdentity=Xe(o.gitIdentity));let a={version:1,id:o.id.trim(),name:o.name.trim(),remote:o.remote.trim(),rootPath:r,createdAt:o.createdAt??n,updatedAt:n,graphVersion:o.graphVersion??0,memoryVersion:o.memoryVersion??0,metadata:Object.keys(i).length?i:void 0};return ye(r,a),N(a,r)}recordGitIdentity(t,o,r={}){let n=this.requireExisting(t),i=H(n.rootPath),a=fe(i),s=bs(a);if(s&&s!==o.fingerprint&&!r.allowRebind)throw new Error(["PROJECT_GIT_REMOTE_CHANGED",`existing=${s}`,`current=${o.fingerprint}`,"Use explicit rebind only when this repository identity change is intentional."].join(" "));let c=a.metadata?.toolnetIdentity;return c&&typeof c=="object"&&!Array.isArray(c)&&c.fingerprint===o.fingerprint||(a.metadata={...a.metadata,toolnetIdentity:Xe(o)},a.updatedAt=new Date().toISOString(),ye(n.rootPath,a)),N(a,n.rootPath)}findExisting(t=process.cwd()){let o=M(t),r=Qe(o),i=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(c=>he(X(r,c))),a=eo(o,i?r:void 0);if(!a)return null;let s=fe(H(a));return N(s,a)}requireExisting(t=process.cwd()){let o=this.findExisting(t);if(!o)throw new Error("PROJECT_NOT_INITIALIZED");return o}detect(t=process.cwd()){let o=M(t),r=Qe(o),i=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(d=>he(X(r,d))),a=eo(o,i?r:void 0);if(a){let d=H(a),p=fe(d);return p.rootPath!==a&&(p.rootPath=a,p.updatedAt=new Date().toISOString(),ye(a,p)),N(p,a)}let s=new Date().toISOString(),c=ys(r),l=me(r),u={version:1,id:l?Zt(l.canonicalRemote):ks(r),name:c,remote:l?.repositoryName??c,rootPath:r,createdAt:s,updatedAt:s,graphVersion:0,memoryVersion:0,metadata:l?{toolnetIdentity:Xe(l)}:void 0};return ye(r,u),N(u,r)}};var Ss=[{type:"openai_key",regex:/\bsk-[A-Za-z0-9_-]{20,}\b/g,confidence:"exact"},{type:"huggingface_token",regex:/\bhf_[A-Za-z0-9]{20,}\b/g,confidence:"exact"},{type:"hf_s3_access_key",regex:/\bHFAK[A-Za-z0-9]{8,}\b/g,confidence:"exact"},{type:"aws_access_key",regex:/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,confidence:"exact"},{type:"github_token",regex:/\b(?:gh[pousr]_[A-Za-z0-9]{30,255}|github_pat_[A-Za-z0-9_]{40,255})\b/g,confidence:"exact"},{type:"stripe_secret_key",regex:/\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g,confidence:"exact"},{type:"google_api_key",regex:/\bAIza[A-Za-z0-9_-]{30,}\b/g,confidence:"exact"},{type:"slack_token",regex:/\bxox[baprs]-[A-Za-z0-9-]{16,}\b/g,confidence:"exact"},{type:"npm_token",regex:/\bnpm_[A-Za-z0-9]{20,}\b/g,confidence:"exact"},{type:"bearer_token",regex:/\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/gi,confidence:"high"},{type:"jwt",regex:/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,confidence:"exact"},{type:"private_key",regex:/-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,confidence:"exact"},{type:"password_assignment",regex:/\b(?:password|passwd|pwd)\s*[:=]\s*["']?[^"' \t\r\n]{6,}["']?/gi,confidence:"high"},{type:"secret_assignment",regex:/\b(?:secret|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key)\s*[:=]\s*["']?[^"' \t\r\n]{8,}["']?/gi,confidence:"high"},{type:"cookie",regex:/\b(?:cookie|set-cookie)\s*[:=]\s*[^;\n]{8,}/gi,confidence:"high"},{type:"url_credentials",regex:/\bhttps?:\/\/[^:/@\s]+:[^/@\s]{4,}@[^/\s]+/gi,confidence:"high"}],Is=new Set(["example","example-key","example-token","changeme","change-me","password","secret","your-api-key","your-token","<token>","<secret>","<password>","[redacted]"]);function no(e){return e.normalize("NFKC").trim().toLowerCase()}function vs(e){if(e.length===0)return 0;let t=new Map;for(let r of e)t.set(r,(t.get(r)??0)+1);let o=0;for(let r of t.values()){let n=r/e.length;o-=n*Math.log2(n)}return o}function ws(e){return/^[a-f0-9]{32}$/iu.test(e)||/^[a-f0-9]{40}$/iu.test(e)||/^[a-f0-9]{64}$/iu.test(e)}function js(e,t,o){let r=e.slice(Math.max(0,t-48),t),n=e.slice(o,Math.min(e.length,o+16));return/\b(?:token|secret|key|credential|authorization|password|passwd|apikey|api_key|access[_-]?key)\b/iu.test(`${r} ${n}`)}function xs(e,t){return e.start<t.end&&t.start<e.end}function io(e){return e.sort((t,o)=>t.start!==o.start?t.start-o.start:o.end-o.start-(t.end-t.start))}var be=class{allowValues=new Set;enableEntropyHeuristic;constructor(t={}){for(let o of t.allowValues??[]){let r=no(o);r&&this.allowValues.add(r)}this.enableEntropyHeuristic=t.enableEntropyHeuristic??!0}scan(t){let o=[];for(let i of Ss){let a=new RegExp(i.regex.source,i.regex.flags);for(let s of t.matchAll(a))s.index===void 0||!s[0]||this.allowed(s[0])||o.push({type:i.type,value:s[0],start:s.index,end:s.index+s[0].length,confidence:i.confidence})}this.enableEntropyHeuristic&&o.push(...this.entropyMatches(t));let r=io(o),n=[];for(let i of r)n.some(a=>xs(a,i))||n.push(i);return io(n)}hasSecrets(t){return this.scan(t).length>0}allowed(t){let o=no(t);return Is.has(o)?!0:this.allowValues.has(o)}entropyMatches(t){let o=[],r=/[A-Za-z0-9_+/=-]{32,160}/g;for(let n of t.matchAll(r)){if(n.index===void 0||!n[0])continue;let i=n[0];this.allowed(i)||ws(i)||!/[A-Za-z]/u.test(i)||!/[0-9]/u.test(i)||js(t,n.index,n.index+i.length)&&(vs(i)<3.7||o.push({type:"high_entropy_secret",value:i,start:n.index,end:n.index+i.length,confidence:"heuristic"}))}return o}};function so(e,t,o){Object.defineProperty(e,t,{value:o,enumerable:!0,writable:!0,configurable:!0})}var Se=class{scanner;constructor(t={}){this.scanner=new be(t)}sanitize(t){let o=this.scanner.scan(t);if(o.length===0)return{text:t,redacted:0,secretTypes:[]};let r=t,n=[...o].sort((a,s)=>s.start-a.start),i=new Set;for(let a of n)i.add(a.type),r=r.slice(0,a.start)+`[REDACTED:${a.type}]`+r.slice(a.end);return{text:r,redacted:o.length,secretTypes:[...i].sort()}}sanitizeValue(t){if(typeof t=="string")return this.sanitize(t).text;if(Array.isArray(t))return t.map(o=>this.sanitizeValue(o));if(t&&typeof t=="object"){let o={};for(let[r,n]of Object.entries(t)){if(r==="__proto__")continue;let i=r.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g,"");if(i.includes("password")||i.includes("passwd")||i==="pwd"||i.includes("secret")||i.includes("token")||i.includes("cookie")||i.includes("authorization")||i.includes("apikey")||i.includes("accesskey")||i.includes("privatekey")||i.includes("clientsecret")||i.includes("credential")){so(o,r,"[REDACTED]");continue}so(o,r,this.sanitizeValue(n))}return o}return t}};var ag=new Se;var Cs={claude:"hook",cursor:"hook",copilot:"hook",grok:"hook",kiro:"hook",opencode:"hook",codex:"hook",agy:"hook","toolnet-cli":"manual-sync",kilo:"mcp-only",goose:"hook",qwen:"hook",kimi:"hook",hermes:"hook",qoder:"hook",aider:"managed-wrapper-session-end",plandex:"manual-sync",openrouter:"blocked-product-identity",bob:"hook",cline:"hook",rovo:"hook",warp:"blocked-capability"},ao={mcp:!0,continuityRead:!0,nativeCapture:!1,lifecycleHooks:!1,sharedJournalWrite:!1,level:"mcp-only"},Os={mcp:!0,continuityRead:!0,nativeCapture:!1,lifecycleHooks:!1,sharedJournalWrite:!1,level:"blocked"},co={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!1,sharedJournalWrite:!0,level:"native-capture"},I={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!0,sharedJournalWrite:!0,level:"native-capture"},Rs={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!0,sharedJournalWrite:!0,level:"native-capture"},Es={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!1,sharedJournalWrite:!0,level:"native-capture"};function m(e,t,o){return{agent:e,...t,refreshMode:o,captureMode:Cs[e]}}var lo={agy:m("agy",I,"native-lifecycle"),opencode:m("opencode",Rs,"persistent-plugin"),codex:m("codex",I,"native-lifecycle"),claude:m("claude",I,"native-lifecycle"),kiro:m("kiro",I,"native-lifecycle"),cursor:m("cursor",I,"native-lifecycle"),copilot:m("copilot",I,"native-lifecycle"),grok:m("grok",I,"native-lifecycle"),"toolnet-cli":m("toolnet-cli",co,"native-session"),kilo:m("kilo",ao,"mcp-only"),goose:m("goose",I,"native-lifecycle"),qwen:m("qwen",I,"native-lifecycle"),kimi:m("kimi",I,"native-lifecycle"),hermes:m("hermes",I,"native-lifecycle"),qoder:m("qoder",I,"native-lifecycle"),aider:m("aider",Es,"managed-wrapper"),plandex:m("plandex",co,"native-session"),openrouter:m("openrouter",ao,"mcp-only"),bob:m("bob",I,"native-lifecycle"),cline:m("cline",I,"native-lifecycle"),rovo:m("rovo",I,"native-lifecycle"),warp:m("warp",Os,"blocked")};function Ps(e){return Object.prototype.hasOwnProperty.call(lo,e)}function Ts(e){if(Ps(e))return lo[e]}function uo(e){let t=Ts(e);if(!t)return"unknown";switch(t.refreshMode){case"native-lifecycle":return"native lifecycle";case"persistent-plugin":return"persistent plugin";case"native-session":return"native session capture";case"mcp-only":return"MCP only";case"managed-wrapper":return"managed wrapper";default:return t.refreshMode}}var po=["\u280B","\u2819","\u2839","\u2838","\u283C","\u2834","\u2826","\u2827","\u2807","\u280F"],v={clear:"\r\x1B[2K",cyan:"\x1B[36m",green:"\x1B[32m",red:"\x1B[31m",yellow:"\x1B[33m",amber:"\x1B[38;5;214m",dim:"\x1B[2m",reset:"\x1B[0m"};function go(e,t=16){let r=Math.max(1,t-4+1),n=e%r;return"\u2500".repeat(n)+"\u2501".repeat(4)+"\u2500".repeat(Math.max(0,t-n-4))}function mo(e){let t=Date.now()-e;return t<1e3?`${t}ms`:t<1e4?`${(t/1e3).toFixed(1)}s`:`${Math.round(t/1e3)}s`}var Ze=class{stream;enabled;interactive;color;intervalMs;display;label;frame=0;startedAt=0;timer;active=!1;constructor(t,o={}){this.label=t,this.stream=o.stream??process.stderr,this.enabled=o.enabled??!0,this.interactive=o.interactive??this.stream.isTTY===!0,this.color=o.color??(this.interactive&&process.env.NO_COLOR===void 0),this.intervalMs=Math.max(40,o.intervalMs??80),this.display=o.display??"spinner"}start(){return!this.enabled||this.active?this:(this.active=!0,this.startedAt=Date.now(),this.interactive?(this.render(),this.timer=setInterval(()=>{this.frame=(this.frame+1)%1e4,this.render()},this.intervalMs),this.timer.unref?.(),this):(this.stream.write(`\u2192 ${this.label}
`),this))}update(t){return this.label=t,this.enabled&&this.active&&this.interactive&&this.render(),this}succeed(t){this.finish("\u2713",t??this.label,v.green)}fail(t){this.finish("\u2717",t??this.label,v.red)}warn(t){this.finish("!",t??this.label,v.yellow)}stop(){this.active&&(this.timer&&(clearInterval(this.timer),this.timer=void 0),this.enabled&&this.interactive&&this.stream.write(v.clear),this.active=!1)}render(){if(!this.enabled||!this.active||!this.interactive)return;let t=po[this.frame%po.length],o=this.display==="bar"?this.color?`${v.amber}${go(this.frame)}${v.reset}`:go(this.frame):this.color?`${v.cyan}${t}${v.reset}`:t,r=mo(this.startedAt),n=this.color?`${v.dim}${r}${v.reset}`:r;this.stream.write(`${v.clear}${o} ${this.label} ${n}`)}finish(t,o,r){if(!this.enabled){this.active=!1;return}this.startedAt||(this.startedAt=Date.now()),this.timer&&(clearInterval(this.timer),this.timer=void 0);let n=mo(this.startedAt),i=this.color?`${r}${t}${v.reset}`:t,a=this.color?`${v.dim}${n}${v.reset}`:n;this.interactive?this.stream.write(`${v.clear}${i} ${o} ${a}
`):this.stream.write(`${i} ${o} (${n})
`),this.active=!1}};async function et(e,t,o={}){let r=new Ze(e,o).start();try{let n=await t();return r.succeed(),n}catch(n){throw r.fail(),n}}import{resolve as ma}from"node:path";import{homedir as ca}from"node:os";import{join as la}from"node:path";import{DeleteObjectCommand as As,GetObjectCommand as _s,HeadObjectCommand as Ns,ListObjectsV2Command as Ms,PutObjectCommand as Fs,S3Client as $s}from"@aws-sdk/client-s3";import{getSignedUrl as Ds}from"@aws-sdk/s3-request-presigner";var Ie=class{name="huggingface";client;bucket;constructor(t){this.bucket=t.bucket,this.client=new $s({region:"us-east-1",endpoint:`https://s3.hf.co/${t.namespace}`,forcePathStyle:!0,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:t.accessKeyId,secretAccessKey:t.secretAccessKey}})}async put(t,o,r="application/octet-stream"){let n=typeof o=="string"?Buffer.from(o,"utf8"):o;await this.client.send(new Fs({Bucket:this.bucket,Key:t,Body:n,ContentType:r}))}async get(t){let o=await Ds(this.client,new _s({Bucket:this.bucket,Key:t}),{expiresIn:60}),r=await fetch(o,{redirect:"follow"});if(r.status===404)return null;if(!r.ok)throw new Error(`HF download failed: ${r.status} ${r.statusText}`);return new Uint8Array(await r.arrayBuffer())}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){try{return await this.client.send(new Ns({Bucket:this.bucket,Key:t})),!0}catch(o){if(typeof o=="object"&&o!==null&&"$metadata"in o&&o.$metadata?.httpStatusCode===404)return!1;throw o}}async delete(t){await this.client.send(new As({Bucket:this.bucket,Key:t}))}async list(t=""){let o=[],r;do{let n=await this.client.send(new Ms({Bucket:this.bucket,Prefix:t||void 0,ContinuationToken:r}));for(let i of n.Contents??[])i.Key&&o.push({key:i.Key,size:i.Size,updatedAt:i.LastModified?.toISOString()});r=n.IsTruncated?n.NextContinuationToken:void 0}while(r);return o}};import{access as fo,mkdir as Hs,readFile as Ls,readdir as Ks,rm as Js,stat as yo,writeFile as Vs}from"node:fs/promises";import{dirname as Gs,join as Bs,relative as ho,resolve as qs}from"node:path";var Z=class{constructor(t){this.root=t}root;name="local";path(t){let o=t.replace(/^\/+/,"");return qs(this.root,o)}async put(t,o){let r=this.path(t);await Hs(Gs(r),{recursive:!0}),await Vs(r,o)}async get(t){try{return await Ls(this.path(t))}catch(o){if(typeof o=="object"&&o!==null&&"code"in o&&o.code==="ENOENT")return null;throw o}}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){try{return await fo(this.path(t)),!0}catch{return!1}}async delete(t){await Js(this.path(t),{force:!0})}async list(t=""){let o=this.path(t),r=[];try{await fo(o)}catch{return r}let n=async a=>{let s=await Ks(a,{withFileTypes:!0});for(let c of s){let l=Bs(a,c.name);if(c.isDirectory()){await n(l);continue}let u=await yo(l);r.push({key:ho(this.root,l),size:u.size,updatedAt:u.mtime.toISOString()})}},i=await yo(o);return i.isDirectory()?await n(o):r.push({key:ho(this.root,o),size:i.size,updatedAt:i.mtime.toISOString()}),r}};import{DeleteObjectCommand as Us,GetObjectCommand as Ys,HeadObjectCommand as zs,ListObjectsV2Command as Ws,PutObjectCommand as Qs,S3Client as Xs}from"@aws-sdk/client-s3";import{getSignedUrl as Zs}from"@aws-sdk/s3-request-presigner";var ee=class{name;client;bucket;constructor(t){this.name=t.name??"s3",this.bucket=t.bucket,this.client=new Xs({region:t.region??"us-east-1",endpoint:t.endpoint||void 0,forcePathStyle:t.forcePathStyle??!1,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:t.accessKeyId,secretAccessKey:t.secretAccessKey}})}async put(t,o,r="application/octet-stream"){let n=typeof o=="string"?Buffer.from(o,"utf8"):o;await this.client.send(new Qs({Bucket:this.bucket,Key:t,Body:n,ContentType:r}))}async get(t){let o=await Zs(this.client,new Ys({Bucket:this.bucket,Key:t}),{expiresIn:60}),r=await fetch(o,{redirect:"follow"});if(r.status===404)return null;if(!r.ok)throw new Error(`${this.name} download failed: ${r.status} ${r.statusText}`);return new Uint8Array(await r.arrayBuffer())}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){try{return await this.client.send(new zs({Bucket:this.bucket,Key:t})),!0}catch(o){if(typeof o=="object"&&o!==null&&"$metadata"in o&&o.$metadata?.httpStatusCode===404)return!1;throw o}}async delete(t){await this.client.send(new Us({Bucket:this.bucket,Key:t}))}async list(t=""){let o=[],r;do{let n=await this.client.send(new Ws({Bucket:this.bucket,Prefix:t||void 0,ContinuationToken:r}));for(let i of n.Contents??[])i.Key&&o.push({key:i.Key,size:i.Size,updatedAt:i.LastModified?.toISOString()});r=n.IsTruncated?n.NextContinuationToken:void 0}while(r);return o}};import{createCipheriv as ea,createDecipheriv as ta,createHash as oa,randomBytes as ra,timingSafeEqual as na}from"node:crypto";import{readFileSync as ia}from"node:fs";var F=Buffer.from("TNMEME01","ascii"),bo=1,te=8,oe=12,tt=16,So=F.length+1+te+oe+tt,sa="toolnet-memory:remote-encryption:v1:",Io="aes-256-gcm",ot=32,h=class extends Error{constructor(o,r){super(r);this.code=o;this.name="RemoteEncryptionError"}code};function aa(e){return e?["1","true","yes","on","enabled"].includes(e.trim().toLowerCase()):!1}function rt(e=process.env){return aa(e.TOOLNET_REMOTE_ENCRYPTION)}function ko(e){let t=e.trim();if(!t)throw new h("REMOTE_ENCRYPTION_KEY_EMPTY","Remote encryption key is empty.");let o;if(t.startsWith("hex:")){let r=t.slice(4);if(!/^[0-9a-f]{64}$/iu.test(r))throw new h("REMOTE_ENCRYPTION_KEY_INVALID","hex: remote encryption key must contain exactly 64 hexadecimal characters.");o=Buffer.from(r,"hex")}else if(/^[0-9a-f]{64}$/iu.test(t))o=Buffer.from(t,"hex");else{let r=t.startsWith("base64:")?t.slice(7):t;if(!/^[A-Za-z0-9+/_-]+={0,2}$/u.test(r))throw new h("REMOTE_ENCRYPTION_KEY_INVALID","Remote encryption key must be 32 raw bytes encoded as hexadecimal or base64.");o=Buffer.from(r,r.includes("-")||r.includes("_")?"base64url":"base64")}if(o.length!==ot)throw new h("REMOTE_ENCRYPTION_KEY_INVALID_LENGTH",`Remote encryption key must decode to exactly ${ot} bytes.`);return o}function vo(e=process.env){let t=e.TOOLNET_REMOTE_ENCRYPTION_KEY?.trim(),o=e.TOOLNET_REMOTE_ENCRYPTION_KEY_FILE?.trim();if(t&&o)throw new h("REMOTE_ENCRYPTION_KEY_AMBIGUOUS","Configure either TOOLNET_REMOTE_ENCRYPTION_KEY or TOOLNET_REMOTE_ENCRYPTION_KEY_FILE, not both.");if(t)return ko(t);if(o){let r;try{r=ia(o,"utf8")}catch(n){throw new h("REMOTE_ENCRYPTION_KEY_FILE_READ_FAILED",[`Unable to read remote encryption key file: ${o}.`,n instanceof Error?n.message:String(n)].join(" "))}return ko(r)}}function wo(e){return oa("sha256").update(e).digest().subarray(0,te)}function jo(e){return Buffer.from(`${sa}${e}`,"utf8")}function nt(e){return e.byteLength<F.length?!1:Buffer.from(e).subarray(0,F.length).equals(F)}function xo(e,t,o){if(o.byteLength!==ot)throw new h("REMOTE_ENCRYPTION_KEY_INVALID_LENGTH","AES-256-GCM requires a 32-byte key.");let r=typeof t=="string"?Buffer.from(t,"utf8"):Buffer.from(t),n=ra(oe),i=ea(Io,o,n);i.setAAD(jo(e));let a=Buffer.concat([i.update(r),i.final()]),s=i.getAuthTag(),c=Buffer.alloc(So),l=0;return F.copy(c,l),l+=F.length,c.writeUInt8(bo,l),l+=1,wo(o).copy(c,l),l+=te,n.copy(c,l),l+=oe,s.copy(c,l),Buffer.concat([c,a])}function Co(e,t,o){let r=Buffer.from(t);if(!nt(r))throw new h("REMOTE_ENCRYPTION_ENVELOPE_REQUIRED","Payload is not a ToolNet encrypted remote object.");if(r.length<So)throw new h("REMOTE_ENCRYPTION_ENVELOPE_TRUNCATED","Encrypted remote payload is truncated.");let n=F.length,i=r.readUInt8(n);if(n+=1,i!==bo)throw new h("REMOTE_ENCRYPTION_VERSION_UNSUPPORTED",`Unsupported remote encryption envelope version: ${i}.`);let a=r.subarray(n,n+te);n+=te;let s=wo(o);if(!na(a,s))throw new h("REMOTE_ENCRYPTION_KEY_MISMATCH","Configured remote encryption key does not match this encrypted object.");let c=r.subarray(n,n+oe);n+=oe;let l=r.subarray(n,n+tt);n+=tt;let u=r.subarray(n),d=ta(Io,o,c);d.setAAD(jo(e)),d.setAuthTag(l);try{return Buffer.concat([d.update(u),d.final()])}catch{throw new h("REMOTE_ENCRYPTION_AUTH_FAILED","Encrypted remote object failed AES-GCM authentication.")}}var it=class{constructor(t,o){this.inner=t;this.options=o;if(this.name=t.name,o.enabled&&!o.key)throw new h("REMOTE_ENCRYPTION_KEY_REQUIRED","Remote client-side encryption is enabled but no encryption key is configured.")}inner;options;name;async put(t,o,r){if(!this.options.enabled){await this.inner.put(t,o,r);return}let n=this.options.key;if(!n)throw new h("REMOTE_ENCRYPTION_KEY_REQUIRED","Remote encryption key is unavailable.");let i=xo(t,o,n);await this.inner.put(t,i,"application/octet-stream")}async get(t){let o=await this.inner.get(t);if(!o)return null;if(!nt(o))return o;if(!this.options.enabled)throw new h("REMOTE_ENCRYPTION_REQUIRED",["Remote object is client-side encrypted.","Enable TOOLNET_REMOTE_ENCRYPTION and configure the matching key."].join(" "));let r=this.options.key;if(!r)throw new h("REMOTE_ENCRYPTION_KEY_REQUIRED","Remote object is encrypted but no decryption key is configured.");return Co(t,o,r)}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){return this.inner.exists(t)}async delete(t){await this.inner.delete(t)}async list(t=""){return this.inner.list(t)}};function Oo(e,t=process.env){if(e.name==="local")return rt(t)&&console.warn("[storage] Remote encryption requested but active storage provider is local; local data remains unchanged."),e;let o=rt(t),r=o?vo(t):void 0;return new it(e,{enabled:o,key:r})}function re(e){return Oo(e)}function st(e,t){return console.warn(t),re(new Z(e))}function Ro(e){let t=e.localRoot??la(ca(),".toolnet-memory","storage");if(e.provider==="r2"){let o=e.r2;return o?.accountId&&o.bucket&&o.accessKeyId&&o.secretAccessKey?re(new ee({name:"r2",endpoint:`https://${o.accountId}.r2.cloudflarestorage.com`,region:"auto",bucket:o.bucket,forcePathStyle:!0,accessKeyId:o.accessKeyId,secretAccessKey:o.secretAccessKey})):st(t,"[storage] Cloudflare R2 credentials missing. Using local fallback.")}if(e.provider==="s3"){let o=e.s3;return o?.bucket&&o.accessKeyId&&o.secretAccessKey?re(new ee({name:"s3",endpoint:o.endpoint,region:o.region??"us-east-1",bucket:o.bucket,forcePathStyle:o.forcePathStyle??!1,accessKeyId:o.accessKeyId,secretAccessKey:o.secretAccessKey})):st(t,"[storage] S3 credentials missing. Using local fallback.")}if(e.provider==="huggingface"){let o=e.huggingface;return o?.namespace&&o.bucket&&o.accessKeyId&&o.secretAccessKey?re(new Ie({namespace:o.namespace,bucket:o.bucket,accessKeyId:o.accessKeyId,secretAccessKey:o.secretAccessKey})):st(t,"[storage] Hugging Face credentials missing. Using local fallback.")}return re(new Z(t))}function ua(e){return new Promise(t=>setTimeout(t,e))}async function Eo(e,t={}){let o=Math.max(1,t.attempts??3),r=t.baseDelayMs??150,n=t.maxDelayMs??2e3,i;for(let a=1;a<=o;a++)try{return await e()}catch(s){if(i=s,a>=o)break;let c=Math.min(n,r*2**(a-1)),l=Math.floor(Math.random()*Math.max(1,c*.2));await ua(c+l)}throw i}var da=new Set(["put","get","getText","delete","list"]);function Po(e,t={}){return new Proxy(e,{get(o,r){let n=Reflect.get(o,r,o);return typeof n!="function"?n:da.has(r)?(...i)=>Eo(()=>Promise.resolve(n.apply(o,i)),t):n.bind(o)}})}var O="authority: never rebuilt, never dropped",pa=[{kind:"memory_records",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:O,legacyValueDomains:[],description:"Long-term project memory records (projects/<id>/memories/current.json)."},{kind:"task_operations",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"reject",sourceOfTruth:O,legacyValueDomains:[],description:"Immutable task operation log (.toolnet/tasks/events.jsonl)."},{kind:"task_replication_log",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"reject",sourceOfTruth:O,legacyValueDomains:[],description:"Replicated task operations from other hosts."},{kind:"retrieval_feedback",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:O,legacyValueDomains:[],description:"Retrieval feedback signals (.toolnet/retrieval/feedback.jsonl)."},{kind:"retrieval_telemetry",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:O,legacyValueDomains:[],description:"Retrieval telemetry samples (.toolnet/retrieval/telemetry.jsonl)."},{kind:"retrieval_overrides",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:O,legacyValueDomains:[],description:"Operator retrieval overrides (.toolnet/retrieval/overrides.json)."},{kind:"session_wal",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:O,legacyValueDomains:[],description:"Session write-ahead log (.toolnet/runtime/sources/)."},{kind:"adr_state",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"reject",sourceOfTruth:O,legacyValueDomains:[],description:"Architecture decision records (projects/<id>/knowledge/adr/state.v1.json)."},{kind:"project_manifest",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"backward_compatible",missingVersionPolicy:"assume_legacy",sourceOfTruth:O,legacyValueDomains:[],description:"Project identity manifest (.toolnet/project.json and the remote copy)."},{kind:"recovery_backup",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"reject",sourceOfTruth:O,legacyValueDomains:[],description:"Disaster-recovery backup manifest, version-gated on read."},{kind:"task_projection",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"task operations log",legacyValueDomains:[],description:"Materialized task state; rebuilt from the operation log."},{kind:"code_graph",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Code graph snapshot (projects/<id>/graph/current.json)."},{kind:"code_manifest",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Incremental file manifest (projects/<id>/graph/manifest.json)."},{kind:"resolution_snapshot",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"backward_compatible",missingVersionPolicy:"assume_legacy",sourceOfTruth:"repository source",legacyValueDomains:["resolution_kind_uppercase"],description:"Symbol resolution snapshot (projects/<id>/graph/resolution/current.json); the legacy kind vocabulary (CALL/REFERENCE/EXTENDS/IMPLEMENTS) is normalized in memory on read."},{kind:"graph_coverage",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code graph + resolution",legacyValueDomains:[],description:"Graph coverage snapshot (projects/<id>/graph/coverage.json)."},{kind:"cross_service",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source + service extractors",legacyValueDomains:[],description:"Cross-service linkage (projects/<id>/graph/cross-service.json)."},{kind:"fleet_export",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Fleet export view (projects/<id>/graph/fleet-export.json)."},{kind:"snapshot_archive",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"current project state",legacyValueDomains:[],description:"Point-in-time project snapshots; never part of authority backups."},{kind:"code_artifacts",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"reject",sourceOfTruth:"repository source + semantic registry",legacyValueDomains:[],description:"Portable code-intelligence artifacts, gated by the artifact fingerprint matrix."},{kind:"code_chunks",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Code chunk snapshot (projects/<id>/code/chunks/current.json)."},{kind:"code_vectors",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code chunks",legacyValueDomains:[],description:"Code vector index (projects/<id>/code/vectors/current.json)."},{kind:"memory_vectors",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"memory records",legacyValueDomains:[],description:"Deterministic memory vector index (projects/<id>/vectors/current.json)."},{kind:"architecture_snapshot",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code graph",legacyValueDomains:[],description:"Architecture snapshot (projects/<id>/code/architecture)."},{kind:"code_analysis",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code graph",legacyValueDomains:[],description:"Code analysis snapshot (projects/<id>/code/analysis)."},{kind:"visualization_graph",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code graph",legacyValueDomains:[],description:"Visualization graph (projects/<id>/code/visualization/graph.json)."},{kind:"runtime_traces",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"observed session activity",legacyValueDomains:[],description:"Runtime trace sessions plus their recomputed observation index."},{kind:"journal",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"session activity",legacyValueDomains:[],description:"Local session journal (.toolnet/journal)."},{kind:"task_replication_cursor",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"task replication log",legacyValueDomains:[],description:"Replication cursor (.toolnet/tasks/replication/cursor.json)."},{kind:"runtime_locks",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"process lifetime",legacyValueDomains:[],description:"Runtime lock files (.toolnet/runtime/locks)."},{kind:"daemon_state",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"running daemon",legacyValueDomains:[],description:"Daemon coordination state (daemon-state.json)."},{kind:"daemon_runtime_files",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"running daemon",legacyValueDomains:[],description:"Daemon socket, pid, lock and logs."},{kind:"artifact_staging",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Artifact staging area (.toolnet/cache/artifacts/staging)."},{kind:"test_run_cache",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"test execution",legacyValueDomains:[],description:"In-memory only derived test-run store."}],ga=Object.freeze(pa.slice().sort((e,t)=>e.kind.localeCompare(t.kind))),Rm=new Map(ga.map(e=>[e.kind,e]));var f="projects/[^/]+",Em=[{pattern:/^\.toolnet\/tasks\/events\.jsonl$/u,kind:"task_operations"},{pattern:/^\.toolnet\/tasks\/replication\/replicated(\/|$)/u,kind:"task_replication_log"},{pattern:/^\.toolnet\/tasks\/replication\/cursor\.json$/u,kind:"task_replication_cursor"},{pattern:/^\.toolnet\/tasks\/state\.json$/u,kind:"task_projection"},{pattern:/^\.toolnet\/tasks(\/|$)/u,kind:"task_projection"},{pattern:/^\.toolnet\/retrieval\/feedback\.jsonl$/u,kind:"retrieval_feedback"},{pattern:/^\.toolnet\/retrieval\/telemetry\.jsonl$/u,kind:"retrieval_telemetry"},{pattern:/^\.toolnet\/retrieval\/overrides\.json$/u,kind:"retrieval_overrides"},{pattern:/^\.toolnet\/retrieval(\/|$)/u,kind:"retrieval_overrides"},{pattern:/^\.toolnet\/runtime\/sources(\/|$)/u,kind:"session_wal"},{pattern:/^\.toolnet\/runtime\/locks(\/|$)/u,kind:"runtime_locks"},{pattern:/^\.toolnet\/runtime(\/|$)/u,kind:"session_wal"},{pattern:/^\.toolnet\/journal(\/|$)/u,kind:"journal"},{pattern:/^\.toolnet\/cache\/artifacts\/staging(\/|$)/u,kind:"artifact_staging"},{pattern:/^\.toolnet\/cache(\/|$)/u,kind:"artifact_staging"},{pattern:/^\.toolnet\/project\.json$/u,kind:"project_manifest"},{pattern:new RegExp(`^${f}/memories(/|$)`,"u"),kind:"memory_records"},{pattern:new RegExp(`^${f}/knowledge/adr(/|$)`,"u"),kind:"adr_state"},{pattern:new RegExp(`^${f}/project\\.json$`,"u"),kind:"project_manifest"},{pattern:new RegExp(`^${f}/graph/artifacts(/|$)`,"u"),kind:"code_artifacts"},{pattern:new RegExp(`^${f}/graph/resolution(/|$)`,"u"),kind:"resolution_snapshot"},{pattern:new RegExp(`^${f}/graph/coverage\\.json$`,"u"),kind:"graph_coverage"},{pattern:new RegExp(`^${f}/graph/cross-service\\.json$`,"u"),kind:"cross_service"},{pattern:new RegExp(`^${f}/graph/fleet-export\\.json$`,"u"),kind:"fleet_export"},{pattern:new RegExp(`^${f}/graph/manifest\\.json$`,"u"),kind:"code_manifest"},{pattern:new RegExp(`^${f}/graph/current\\.json$`,"u"),kind:"code_graph"},{pattern:new RegExp(`^${f}/graph(/|$)`,"u"),kind:"code_graph"},{pattern:new RegExp(`^${f}/code/graph(/|$)`,"u"),kind:"code_graph"},{pattern:new RegExp(`^${f}/code/chunks(/|$)`,"u"),kind:"code_chunks"},{pattern:new RegExp(`^${f}/code/vectors(/|$)`,"u"),kind:"code_vectors"},{pattern:new RegExp(`^${f}/code/architecture(/|$)`,"u"),kind:"architecture_snapshot"},{pattern:new RegExp(`^${f}/code/analysis(/|$)`,"u"),kind:"code_analysis"},{pattern:new RegExp(`^${f}/code/visualization(/|$)`,"u"),kind:"visualization_graph"},{pattern:new RegExp(`^${f}/vectors(/|$)`,"u"),kind:"memory_vectors"},{pattern:new RegExp(`^${f}/memory(/|$)`,"u"),kind:"memory_records"},{pattern:new RegExp(`^${f}/runtime-traces(/|$)`,"u"),kind:"runtime_traces"},{pattern:new RegExp(`^${f}/snapshots(/|$)`,"u"),kind:"snapshot_archive"},{pattern:/(^|\/)snapshots\/[^/]+\/(memories|vectors|graph)\//u,kind:"snapshot_archive"},{pattern:/(^|\/)daemon-state\.json$/u,kind:"daemon_state"},{pattern:/(^|\/)(daemon\.lock|daemon\.pid|daemon\.sock)$/u,kind:"daemon_runtime_files"},{pattern:/(^|\/)logs\/daemon\.log$/u,kind:"daemon_runtime_files"}];function K(e){let t=e.trim().replace(/\s+/g,"_").replace(/[^A-Za-z0-9._-]/g,"_").replace(/_+/g,"_").replace(/^\.+|\.+$/g,"").slice(0,100);if(!t||t==="."||t==="..")throw new Error("Invalid project storage folder");return t}var Ym=Object.freeze({CALL:"call",REFERENCE:"type",EXTENDS:"inheritance",IMPLEMENTS:"implementation"});var fa="_toolnet/registry/project-identities/v1",j=class extends Error{code="PROJECT_IDENTITY_COLLISION";constructor(t){super(t),this.name="ProjectIdentityCollisionError"}},ve=class extends Error{code="PROJECT_IDENTITY_ADOPTION_REQUIRED";constructor(t,o){super(["PROJECT_IDENTITY_ADOPTION_REQUIRED",`remote=${t}`,`projectId=${o}`,"A legacy remote ToolNet project exists but has no Git fingerprint proof.",`Re-run with: toolnet-memory init --adopt-remote ${t}`].join(" ")),this.name="ProjectIdentityAdoptionRequiredError"}},ne=class extends Error{code="PROJECT_IDENTITY_REGISTRY_UNAVAILABLE";constructor(t){super(["PROJECT_IDENTITY_REGISTRY_UNAVAILABLE",t,"Refusing to create a possibly split project identity while configured remote storage cannot be checked.","Use --no-remote-identity only when local-only initialization is intentional."].join(" ")),this.name="ProjectIdentityRegistryUnavailableError"}};function ya(){let e=ze();if(e.storage.provider==="r2"){let t=e.storage.r2;return!!(t.accountId&&t.bucket&&t.accessKeyId&&t.secretAccessKey)}if(e.storage.provider==="s3"){let t=e.storage.s3;return!!(t.bucket&&t.accessKeyId&&t.secretAccessKey)}if(e.storage.provider==="huggingface"){let t=e.storage.huggingface;return!!(t.namespace&&t.bucket&&t.accessKeyId&&t.secretAccessKey)}return!1}function To(e){if(e.storage)return{storage:e.storage,crossMachine:e.storageIsCrossMachine??!0,providerName:e.storage.name};let t=ze(),o=Ro({provider:t.storage.provider,r2:t.storage.r2,s3:t.storage.s3,huggingface:t.storage.huggingface,localRoot:t.storage.localRoot}),r=ya()&&o.name!=="local";return{storage:r?Po(o,{attempts:Number(process.env.TOOLNET_STORAGE_RETRIES??3)}):o,crossMachine:r,providerName:o.name}}function _o(e){return[fa,`${e.fingerprint}.json`].join("/")}function No(e,t){let o;try{o=JSON.parse(e)}catch(i){throw new j([`Invalid ToolNet project identity registry record: ${t}.`,i instanceof Error?i.message:String(i)].join(" "))}if(!o||typeof o!="object"||Array.isArray(o))throw new j(`Invalid ToolNet project identity registry record: ${t}`);let r=o;for(let i of["fingerprint","canonicalGitRemote","projectId","projectName","projectRemote"])if(typeof r[i]!="string"||!String(r[i]).trim())throw new j(`ToolNet identity registry record ${t} is missing ${i}`);let n=new Date().toISOString();return{version:1,fingerprint:String(r.fingerprint),canonicalGitRemote:String(r.canonicalGitRemote),projectId:String(r.projectId),projectName:String(r.projectName),projectRemote:String(r.projectRemote),createdAt:typeof r.createdAt=="string"?r.createdAt:n,updatedAt:typeof r.updatedAt=="string"?r.updatedAt:n}}function ha(e,t){let o;try{o=JSON.parse(e)}catch(a){throw new j([`Invalid remote ToolNet project manifest: ${t}.`,a instanceof Error?a.message:String(a)].join(" "))}if(!o||typeof o!="object"||Array.isArray(o))throw new j(`Invalid remote ToolNet project manifest: ${t}`);let r=o;if(typeof r.id!="string"||!r.id.trim())throw new j(`Remote ToolNet project manifest ${t} is missing id`);let n=typeof r.remote=="string"&&r.remote.trim()?r.remote:t.split("/")[1]??"project",i=typeof r.name=="string"&&r.name.trim()?r.name:n;return{version:typeof r.version=="number"?r.version:void 0,id:r.id,name:i,remote:n,createdAt:typeof r.createdAt=="string"?r.createdAt:void 0,updatedAt:typeof r.updatedAt=="string"?r.updatedAt:void 0}}async function we(e,t){let r=`projects/${K(t)}/project.json`,n=await e.getText(r);return n?ha(n,r):null}async function ka(e,t){let o=_o(t),r=await e.getText(o);if(!r)return null;let n=No(r,o);if(n.fingerprint!==t.fingerprint||n.canonicalGitRemote!==t.canonicalRemote)throw new j(["PROJECT_IDENTITY_REGISTRY_MISMATCH",`key=${o}`,`expectedFingerprint=${t.fingerprint}`,`actualFingerprint=${n.fingerprint}`].join(" "));return n}async function ba(e,t){let o=await we(e,t.projectRemote);if(o&&o.id!==t.projectId)throw new j(["PROJECT_IDENTITY_REMOTE_OWNERSHIP_MISMATCH",`remote=${t.projectRemote}`,`registryId=${t.projectId}`,`remoteId=${o.id}`].join(" "))}async function at(e,t,o){let r=K(t.remote??t.name),n=await we(e,r);if(n&&n.id!==t.id)throw new j(["PROJECT_IDENTITY_REMOTE_NAMESPACE_COLLISION",`remote=${r}`,`existing=${n.id}`,`current=${t.id}`].join(" "));let i=_o(o),a=await e.getText(i);if(a){let l=No(a,i);if(l.projectId!==t.id||l.canonicalGitRemote!==o.canonicalRemote)throw new j(["PROJECT_IDENTITY_REGISTRY_COLLISION",`fingerprint=${o.fingerprint}`,`existingProject=${l.projectId}`,`currentProject=${t.id}`].join(" "));return}let s=new Date().toISOString(),c={version:1,fingerprint:o.fingerprint,canonicalGitRemote:o.canonicalRemote,projectId:t.id,projectName:t.name,projectRemote:r,createdAt:t.createdAt,updatedAt:s};await e.put(i,JSON.stringify(c,null,2)+`
`,"application/json")}function Sa(e,t){return{id:e.id,name:e.name,remote:e.remote,createdAt:e.createdAt,gitIdentity:t,metadata:{adoptedFromRemote:!0,adoptedAt:new Date().toISOString()}}}function Ao(e){return e instanceof j||e instanceof ve||e instanceof ne}async function Mo(e=process.cwd(),t={}){let o=ma(e),r=new L,n=r.findExisting(o),i=me(n?.rootPath??o);if(n){let s=n;if(i&&(s=r.recordGitIdentity(n.rootPath,i,{allowRebind:t.allowGitRebind??!1})),t.skipRemoteIdentity||!i)return{project:s,source:"existing-manifest",gitIdentity:i,registry:t.skipRemoteIdentity?"skipped":"disabled"};let c=To(t);if(!c.crossMachine)return{project:s,source:"existing-manifest",gitIdentity:i,registry:"disabled",registryProvider:c.providerName};try{return await at(c.storage,s,i),{project:s,source:"existing-manifest",gitIdentity:i,registry:"registered",registryProvider:c.providerName}}catch(l){if(Ao(l))throw l;return{project:s,source:"existing-manifest",gitIdentity:i,registry:"unavailable",registryProvider:c.providerName}}}if(!i)return{project:r.detect(o),source:"legacy-path",gitIdentity:null,registry:"disabled"};if(t.skipRemoteIdentity)return{project:r.detect(o),source:"git-remote",gitIdentity:i,registry:"skipped"};let a=To(t);if(!a.crossMachine){if(t.adoptRemote)throw new ne("Explicit remote adoption was requested but no cross-machine storage provider is configured.");return{project:r.detect(o),source:"git-remote",gitIdentity:i,registry:"disabled",registryProvider:a.providerName}}try{let s=await ka(a.storage,i);if(s){if(t.adoptRemote&&K(t.adoptRemote)!==K(s.projectRemote))throw new j(["PROJECT_IDENTITY_EXPLICIT_ADOPTION_CONFLICT",`requested=${t.adoptRemote}`,`registered=${s.projectRemote}`].join(" "));return await ba(a.storage,s),{project:r.adopt(o,{id:s.projectId,name:s.projectName,remote:s.projectRemote,createdAt:s.createdAt,gitIdentity:i,metadata:{adoptedFromRegistry:!0,adoptedAt:new Date().toISOString()}}),source:"remote-registry",gitIdentity:i,registry:"matched",registryProvider:a.providerName}}if(t.adoptRemote){let u=await we(a.storage,t.adoptRemote);if(!u)throw new Error(["PROJECT_ADOPTION_REMOTE_NOT_FOUND",`remote=${t.adoptRemote}`].join(" "));let d=r.adopt(o,Sa(u,i));return await at(a.storage,d,i),{project:d,source:"explicit-remote-adoption",gitIdentity:i,registry:"registered",registryProvider:a.providerName}}let c=await we(a.storage,i.repositoryName);if(c)throw new ve(c.remote,c.id);let l=r.detect(o);return await at(a.storage,l,i),{project:l,source:"git-remote",gitIdentity:i,registry:"registered",registryProvider:a.providerName}}catch(s){throw Ao(s)?s:new ne(s instanceof Error?s.message:String(s))}}import{existsSync as dr}from"node:fs";import{homedir as Ba}from"node:os";import{join as b}from"node:path";import{spawnSync as qa}from"node:child_process";import{homedir as Ia}from"node:os";import{join as J}from"node:path";function Fo(e={}){return J(e.home??Ia(),".gemini")}function $o(e={}){return J(Fo(e),"antigravity-cli")}function Do(e={}){return J(Fo(e),"config")}function je(e={}){return J(Do(e),"mcp_config.json")}function xe(e={}){let t=e.cwd??process.cwd();return J(t,".agents","mcp_config.json")}function Ce(e="toolnet-memory",t={}){return J($o(t),"plugins",e)}function Ho(e={}){return[$o(e),je(e),Do(e),xe(e)]}import{homedir as Lo}from"node:os";import{join as $}from"node:path";function V(e={}){let t=process.env.OPENCODE_CONFIG_DIR?.trim();if(t)return t;let o=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return o?$(o,"opencode"):$(e.home??Lo(),".config","opencode")}function ct(e={}){let t=process.env.OPENCODE_CONFIG?.trim();if(t)return t;let o=e.home??Lo(),r=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return r?$(r,"opencode","opencode.json"):$(o,".config","opencode","opencode.json")}function lt(e={}){let t=e.cwd??process.cwd();return $(t,"opencode.json")}function Ko(e={}){return $(V(e),"plugins")}function Jo(e={}){return $(V(e),"AGENTS.md")}import{homedir as Vo}from"node:os";import{join as ut}from"node:path";function dt(e={}){return ut(e.home??Vo(),".claude")}function Go(e={}){return ut(dt(e),"settings.json")}function Bo(e={}){return ut(e.home??Vo(),".claude.json")}import{homedir as va}from"node:os";import{join as D}from"node:path";function pt(e={}){return e.kiroHome??process.env.KIRO_HOME??D(e.home??va(),".kiro")}function wa(e={}){return D(pt(e),"settings")}function Oe(e={}){return D(wa(e),"mcp.json")}function gt(e={}){let t=e.cwd??process.cwd();return D(t,".kiro","settings","mcp.json")}function ja(e={}){return D(pt(e),"hooks")}function mt(e={}){return D(ja(e),"toolnet-memory.json")}function ft(e={}){let t=e.cwd??process.cwd();return D(t,".kiro","hooks","toolnet-memory.json")}function qo(e={}){return[pt(e),Oe(e)]}import{homedir as xa}from"node:os";import{join as yt}from"node:path";function Uo(e={}){return yt(e.home??xa(),".toolnetcli")}function Ca(e={}){return yt(Uo(e),"config.json")}function Yo(e={}){let t=e.cwd??process.cwd();return yt(t,".toolnet","mcp.json")}function zo(e={}){let t=Uo(e),o=Ca(e);return[t,o]}import{homedir as Oa}from"node:os";import{join as ht}from"node:path";function Wo(e={}){if(e.kiloHome)return e.kiloHome;if(process.env.KILO_HOME)return process.env.KILO_HOME;let t=e.xdgConfigHome??process.env.XDG_CONFIG_HOME;return t?ht(t,"kilo"):ht(e.home??Oa(),".config","kilo")}function kt(e={}){return ht(Wo(e),"kilo.jsonc")}function Qo(e={}){let t=Wo(e),o=kt(e);return[t,o]}import{homedir as Ra}from"node:os";import{join as E,resolve as Ea}from"node:path";function Re(e={}){return e.cursorHome??E(e.home??Ra(),".cursor")}function Pa(e={}){return e.cursorConfigDir??process.env.CURSOR_CONFIG_DIR??(e.xdgConfigHome??process.env.XDG_CONFIG_HOME?E(e.xdgConfigHome??process.env.XDG_CONFIG_HOME,"cursor"):void 0)??Re(e)}function Ee(e={}){return E(Re(e),"mcp.json")}function Pe(e={}){return E(Re(e),"hooks.json")}function bt(e){return E(Ea(e),".cursor")}function Xo(e){return E(bt(e),"mcp.json")}function Zo(e){return E(bt(e),"hooks.json")}function Ta(e){return E(bt(e),"rules")}function er(e){return E(Ta(e),"toolnet-memory.mdc")}function tr(e={}){return Array.from(new Set([Re(e),Pa(e)]))}import{homedir as Aa}from"node:os";import{join as R,resolve as _a}from"node:path";function St(e={}){return e.copilotHome??process.env.COPILOT_HOME??R(e.home??Aa(),".copilot")}function Te(e={}){return R(St(e),"mcp-config.json")}function Na(e={}){return R(St(e),"hooks")}function Ae(e={}){return R(Na(e),"toolnet-memory.json")}function It(e){return R(_a(e),".github")}function or(e){return R(It(e),"mcp.json")}function Ma(e){return R(It(e),"hooks")}function rr(e){return R(Ma(e),"toolnet-memory.json")}function Fa(e){return R(It(e),"instructions")}function nr(e){return R(Fa(e),"toolnet-memory.instructions.md")}function ir(e={}){return[St(e)]}import{homedir as $a}from"node:os";import{join as x,resolve as Da}from"node:path";function _e(e={}){return e.grokHome??process.env.GROK_HOME??x(e.home??$a(),".grok")}function Ne(e={}){return x(_e(e),"config.toml")}function Ha(e={}){return x(_e(e),"hooks")}function Me(e={}){return x(Ha(e),"toolnet-memory.json")}function La(e={}){return x(_e(e),"skills")}function Ka(e={}){return x(La(e),"toolnet-continuity")}function Fe(e={}){return x(Ka(e),"SKILL.md")}function vt(e){return x(Da(e),".grok")}function sr(e){return x(vt(e),"config.toml")}function Ja(e){return x(vt(e),"hooks")}function ar(e){return x(Ja(e),"toolnet-memory.json")}function Va(e){return x(vt(e),"skills")}function Ga(e){return x(Va(e),"toolnet-continuity")}function cr(e){return x(Ga(e),"SKILL.md")}function lr(e={}){return[_e(e)]}function Ua(e){return qa("sh",["-lc",`command -v ${JSON.stringify(e)} >/dev/null 2>&1`],{stdio:"ignore"}).status===0}function y(e){let t=e.commandExists(e.command),o=e.configPaths.filter(i=>dr(i)),r=o.length>0,n=[];t&&n.push(`command:${e.command}`);for(let i of o)n.push(`config:${i}`);return{agent:e.agent,detected:t||r,commandDetected:t,configDetected:r,evidence:n}}function ur(e){let t=e.commands.filter(a=>e.commandExists(a)),o=e.configPaths.filter(a=>dr(a)),r=t.length>0,n=o.length>0,i=[...t.map(a=>`command:${a}`),...o.map(a=>`config:${a}`)];return{agent:e.agent,detected:r||n,commandDetected:r,configDetected:n,evidence:i}}function pr(e={}){let t=e.home??Ba(),o=e.commandExists??Ua,r=e.codexHome??process.env.CODEX_HOME??b(t,".codex");return[y({agent:"agy",command:"agy",commandExists:o,configPaths:Ho({home:t})}),y({agent:"opencode",command:"opencode",commandExists:o,configPaths:[V({home:t,xdgConfigHome:e.xdgConfigHome})]}),y({agent:"claude",command:"claude",commandExists:o,configPaths:[dt({home:t})]}),y({agent:"kiro",command:"kiro-cli",commandExists:o,configPaths:qo({home:t,kiroHome:e.kiroHome})}),ur({agent:"cursor",commands:["agent","cursor-agent"],commandExists:o,configPaths:tr({home:t,cursorHome:e.cursorHome,cursorConfigDir:e.cursorConfigDir,xdgConfigHome:e.xdgConfigHome})}),y({agent:"copilot",command:"copilot",commandExists:o,configPaths:ir({home:t,copilotHome:e.copilotHome})}),y({agent:"grok",command:"grok",commandExists:o,configPaths:lr({home:t,grokHome:e.grokHome})}),y({agent:"toolnet-cli",command:"toolnet",commandExists:o,configPaths:zo({home:t})}),ur({agent:"kilo",commands:["kilo","kilo-code"],commandExists:o,configPaths:Qo({home:t,kiloHome:e.kiloHome})}),y({agent:"codex",command:"codex",commandExists:o,configPaths:[r]}),y({agent:"goose",command:"goose",commandExists:o,configPaths:[b(t,".agents","plugins")]}),y({agent:"qwen",command:"qwen",commandExists:o,configPaths:[b(t,".qwen")]}),y({agent:"kimi",command:"kimi-code",commandExists:o,configPaths:[b(t,".kimi-code")]}),y({agent:"hermes",command:"hermes",commandExists:o,configPaths:[b(t,".hermes")]}),y({agent:"qoder",command:"qoder",commandExists:o,configPaths:[b(t,".qoder-cn"),b(t,".qoder")]}),y({agent:"aider",command:"aider",commandExists:o,configPaths:[b(t,".aider")]}),y({agent:"plandex",command:"plandex",commandExists:o,configPaths:[b(t,".plandex"),b(t,"plandex-server")]}),y({agent:"openrouter",command:"openrouter",commandExists:o,configPaths:[b(t,".openrouter")]}),y({agent:"bob",command:"bob",commandExists:o,configPaths:[b(t,".bob")]}),y({agent:"cline",command:"cline",commandExists:o,configPaths:[b(t,".cline")]}),y({agent:"rovo",command:"rovo",commandExists:o,configPaths:[b(t,".rovodev"),b(t,".rovo")]}),y({agent:"warp",command:"warp",commandExists:o,configPaths:[b(t,".warp")]})]}import{existsSync as pc,mkdirSync as kr,readFileSync as gc,renameSync as mc,writeFileSync as fc}from"node:fs";import{dirname as yc,join as De}from"node:path";import{existsSync as Ya,mkdirSync as za,readFileSync as Wa,renameSync as Qa,rmSync as Xa,writeFileSync as Za}from"node:fs";import{dirname as ec,join as tc}from"node:path";function oc(e){return`'${e.replace(/'/g,"'\\''")}'`}function rc(e){if(!Ya(e))return{};let t;try{t=JSON.parse(Wa(e,"utf8"))}catch{throw new Error(`Invalid existing Agy hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Agy hooks.json at ${e}: root must be a JSON object.`);return t}function nc(e,t){za(ec(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Za(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Qa(o,e)}finally{Xa(o,{force:!0})}}function gr(e={}){let t=e.pluginName??"toolnet-memory",o=e.hooksFile??tc(Ce(t),"hooks.json"),r=rc(o),n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",i=`${oc(n)} session:agy-hook`;return r["toolnet-memory"]={enabled:!0,PreToolUse:[{matcher:"view_file|list_dir|find_by_name|grep_search|run_command",hooks:[{type:"command",command:`${i} pre-tool`,timeout:5}]}],PreInvocation:[{type:"command",command:`${i} pre`,timeout:15}],PostInvocation:[{type:"command",command:`${i} post`,timeout:15}],Stop:[{type:"command",command:`${i} stop`,timeout:30}]},nc(o,r),o}import{existsSync as ic,mkdirSync as sc,readFileSync as ac,renameSync as cc,writeFileSync as lc}from"node:fs";import{dirname as uc}from"node:path";function ie(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function dc(e,t){sc(uc(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;lc(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),cc(o,e)}function mr(e){if(!ic(e))return{};let t=ac(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Agy MCP config at ${e}: parse error. Not overwriting.`)}if(!ie(o))throw new Error(`Invalid existing Agy MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function fr(e,t){return ie(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function $e(e,t,o,r){let n=mr(e),i=n.mcpServers;if(i!==void 0&&!ie(i))throw new Error(`Invalid existing Agy MCP config: mcpServers must be an object in ${e}.`);let a=ie(i)?{...i}:{},s=a[o];if(fr(s,t)&&!r)return{installed:!0,changed:!1};a[o]={command:t,args:["mcp"]};let c={...n,mcpServers:a};dc(e,c);let u=mr(e).mcpServers;if(!ie(u)||!fr(u[o],t))throw new Error(`Agy MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function yr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...$e(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(r==="both"){let a=je(),s=xe({cwd:e.cwd}),c=$e(a,t,o,e.force??!1),l=$e(s,t,o,e.force??!1);return{installed:!0,changed:c.changed||l.changed,configFile:a,serverName:o,command:t,args:["mcp"]}}let n=r==="workspace"?xe({cwd:e.cwd}):je();return{...$e(n,t,o,e.force??!1),configFile:n,serverName:o,command:t,args:["mcp"]}}var hc=`# ToolNet Memory Continuity

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
`;function kc(e,t){kr(yc(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;fc(o,t,{encoding:"utf8",mode:384}),mc(o,e)}function hr(e,t){pc(e)&&gc(e,"utf8")===t||kc(e,t)}function br(e={}){let t=e.pluginName??"toolnet-memory",o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.pluginRoot??Ce(t),n=De(r,"plugin.json"),i=De(r,"mcp_config.json"),a=De(r,"hooks.json"),s=De(r,"rules","toolnet-memory-continuity.md");return kr(r,{recursive:!0,mode:448}),hr(n,`${JSON.stringify({$schema:"https://antigravity.google/schemas/v1/plugin.json",name:t,description:"Persistent project continuity and memory for Antigravity coding sessions."},null,2)}
`),yr({configFile:i,binary:o,serverName:"toolnet-memory",force:e.force}),gr({hooksFile:a,binary:o,pluginName:t}),hr(s,`${hc.trim()}
`),{installed:!0,pluginRoot:r,files:[n,i,a,s]}}import{existsSync as Sc,mkdirSync as wr,readFileSync as Ic,writeFileSync as jr}from"node:fs";import{join as Ir}from"node:path";var bc="memory_agent_ask";function Sr(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${bc}

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
`.trim()}var vr="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",wt="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function vc(e={}){let t=Jo();wr(V(),{recursive:!0});let o=`${vr}
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


${Sr()}

${wt}`,r=Sc(t)?Ic(t,"utf8"):"",n=r.indexOf(vr),i=r.indexOf(wt);return n>=0&&i>=n?r=r.slice(0,n)+o+r.slice(i+wt.length):(r=r.trimEnd(),r&&(r+=`

`),r+=o),jr(t,r.trimEnd()+`
`,{encoding:"utf8",mode:384}),t}function xr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[];o.push(vc({cwd:e.cwd}));let r=e.scope??"global",n=[];if((r==="global"||r==="both")&&n.push(e.directory??Ko()),r==="project"||r==="both"){let i=e.cwd??process.cwd();n.push(Ir(i,".opencode","plugins"))}for(let i of n){wr(i,{recursive:!0});let a=Ir(i,"toolnet-memory.js"),s=`
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
`;jr(a,s.trimStart(),{encoding:"utf8",mode:384}),o.push(a)}return o}import{existsSync as Rr,mkdirSync as wc,readFileSync as jc,renameSync as xc,writeFileSync as Cc}from"node:fs";import{dirname as Er,join as Oc}from"node:path";function se(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Rc(e,t){wc(Er(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;Cc(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),xc(o,e)}function Cr(e){if(!Rr(e))return{};let t=jc(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing OpenCode config at ${e}: parse error. Not overwriting.`)}if(!se(o))throw new Error(`Invalid existing OpenCode config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Or(e,t){if(!se(e))return!1;let o=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(o)&&o.length===2&&o[0]===t&&o[1]==="mcp"}function He(e,t,o,r){let n=Oc(Er(e),"opencode.jsonc"),i=Rr(n)?n:void 0,a=Cr(e),s=a.mcp;if(s!==void 0&&!se(s))throw new Error(`Invalid existing OpenCode config: mcp must be an object in ${e}.`);let c=se(s)?{...s}:{},l=c[o];if(Or(l,t)&&!r)return{installed:!0,changed:!1,preservedJsonc:i};c[o]={type:"local",command:[t,"mcp"],enabled:!0};let u={...a,mcp:c};Rc(e,u);let d=Cr(e);if(!se(d.mcp)||!Or(d.mcp[o],t))throw new Error(`OpenCode MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0,preservedJsonc:i}}function Pr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...He(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:[t,"mcp"]};if(r==="both"){let a=ct(),s=lt({cwd:e.cwd}),c=He(a,t,o,e.force??!1),l=He(s,t,o,e.force??!1);return{installed:!0,changed:c.changed||l.changed,configFile:a,serverName:o,command:[t,"mcp"],preservedJsonc:c.preservedJsonc??l.preservedJsonc}}let n=r==="project"?lt({cwd:e.cwd}):ct();return{...He(n,t,o,e.force??!1),configFile:n,serverName:o,command:[t,"mcp"]}}import{existsSync as Ec,mkdirSync as Tr,readFileSync as Pc,writeFileSync as Ar}from"node:fs";import{homedir as _r}from"node:os";import{dirname as Nr,join as jt}from"node:path";function Tc(e){let t=[],o=/"((?:\\.|[^"\\])*)"|'([^']*)'/g,r;for(;r=o.exec(e);){let n=r[1]??r[2]??"";try{t.push(r[1]!==void 0?JSON.parse(`"${n}"`):n)}catch{t.push(n)}}return t}function Mr(e={}){let t=e.configFile??jt(process.env.CODEX_HOME??jt(_r(),".codex"),"config.toml"),o=e.previousFile??jt(_r(),".config","toolnet-memory","codex-notify-previous.json");Tr(Nr(t),{recursive:!0}),Tr(Nr(o),{recursive:!0});let r=Ec(t)?Pc(t,"utf8"):"",n=e.binary??"toolnet-memory",i=`notify = [${JSON.stringify(n)}, "session:codex-notify"]`,a=r.split(`
`),s=a.findIndex(p=>/^\s*\[/.test(p));s<0&&(s=a.length);let c=-1,l=-1;for(let p=0;p<s;p+=1)if(/^\s*notify\s*=/.test(a[p])){if(c=p,l=p,a[p].includes("[")&&!a[p].includes("]"))for(;l+1<s&&(l+=1,!a[l].includes("]")););break}let u=[];if(c>=0){let p=a.slice(c,l+1).join(`
`);u=Tc(p),a.splice(c,l-c+1,i)}else s=a.findIndex(p=>/^\s*\[/.test(p)),s<0&&(s=a.length),a.splice(s,0,i);let d=u.length>=2&&u[u.length-1]==="session:codex-notify";return u.length>0&&!d&&Ar(o,JSON.stringify(u,null,2)+`
`,{encoding:"utf8",mode:384}),r=a.join(`
`),r.endsWith(`
`)||(r+=`
`),Ar(t,r,{encoding:"utf8",mode:384}),{configFile:t,previousFile:o,preservedPrevious:u.length>0&&!d}}import{existsSync as Ac,mkdirSync as _c,readFileSync as Nc,writeFileSync as Mc}from"node:fs";import{homedir as Fc}from"node:os";import{dirname as $c,join as Fr}from"node:path";function Dc(e){return`'${e.replace(/'/g,"'\\''")}'`}function $r(e={}){let t=e.hooksFile??Fr(process.env.CODEX_HOME??Fr(Fc(),".codex"),"hooks.json");_c($c(t),{recursive:!0});let o={};if(Ac(t))try{o=JSON.parse(Nc(t,"utf8"))}catch(s){throw new Error(`Invalid existing Codex hooks.json: ${s instanceof Error?s.message:String(s)}`)}let r=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=r;let i=(Array.isArray(r.SessionStart)?r.SessionStart:[]).filter(s=>{try{return!JSON.stringify(s).includes("session:codex-context")}catch{return!0}}),a=e.binary??"toolnet-memory";return i.push({matcher:"startup|resume|clear|compact",hooks:[{type:"command",command:`${Dc(a)} session:codex-context`,timeout:15,additionalContextLimit:1e3,statusMessage:"Loading ToolNet project continuity"}]}),r.SessionStart=i,Mc(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),t}import{existsSync as Dr,mkdirSync as Hc,readFileSync as Hr,writeFileSync as Lc}from"node:fs";import{homedir as Kc}from"node:os";import{dirname as Jc,join as Lr}from"node:path";function Kr(e){return`'${e.replace(/'/g,"'\\''")}'`}function Jr(e={}){let t=e.hooksFile??Lr(process.env.CODEX_HOME??Lr(Kc(),".codex"),"hooks.json");Hc(Jc(t),{recursive:!0});let o={};if(Dr(t))try{o=JSON.parse(Hr(t,"utf8"))}catch{throw new Error(`Invalid existing Codex hooks.json at ${t}: parse error. Not overwriting.`)}let r=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=r;let n=e.binary??"toolnet-memory",i=`${Kr(n)} session:codex-stop-hook`,a=`${Kr(n)} session:codex-session-end`,s={hooks:[{type:"command",command:i,timeout:30}]},c={hooks:[{type:"command",command:a,timeout:3}]},u=(Array.isArray(r.Stop)?r.Stop:[]).filter(S=>{try{return!JSON.stringify(S).includes("session:codex-stop-hook")}catch{return!0}}),p=(Array.isArray(r.SessionEnd)?r.SessionEnd:[]).filter(S=>{try{return!JSON.stringify(S).includes("session:codex-session-end")}catch{return!0}});r.Stop=[...u,s],r.SessionEnd=[...p,c];let g=JSON.stringify(o,null,2)+`
`,C=!Dr(t)||Hr(t,"utf8")!==g;return Lc(t,g,{encoding:"utf8",mode:384}),{hooksFile:t,changed:C,stopInstalled:!0,sessionEndInstalled:!0}}import{spawnSync as Vc}from"node:child_process";function xt(e,t){return Vc(e,t,{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}function Vr(e,t){let o=xt(e,["mcp","get",t,"--json"]);if(o.status!==0||!o.stdout)return null;try{return JSON.parse(o.stdout)}catch{return null}}function Gr(e,t){return e.enabled!==!1&&e.transport?.type==="stdio"&&e.transport?.command===t&&Array.isArray(e.transport?.args)&&e.transport?.args.length===1&&e.transport.args[0]==="mcp"}function Br(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.codexBinary??"codex",r=e.serverName??"toolnet-memory",n=Vr(o,r);if(n&&Gr(n,t))return{installed:!0,changed:!1,serverName:r,command:t,args:["mcp"]};if(n){let s=xt(o,["mcp","remove",r]);if(s.status!==0)return{installed:!1,changed:!1,serverName:r,command:t,args:["mcp"],error:(s.stderr||s.stdout||"Unable to remove old ToolNet MCP configuration.").trim()}}let i=xt(o,["mcp","add",r,"--",t,"mcp"]);if(i.status!==0)return{installed:!1,changed:!1,serverName:r,command:t,args:["mcp"],error:(i.stderr||i.stdout||"Unable to register ToolNet MCP.").trim()};let a=Vr(o,r);return!a||!Gr(a,t)?{installed:!1,changed:!0,serverName:r,command:t,args:["mcp"],error:"Codex accepted MCP registration but verification did not match expected ToolNet command."}:{installed:!0,changed:!0,serverName:r,command:t,args:["mcp"]}}import{existsSync as Gc,mkdirSync as Bc,readFileSync as qc,renameSync as Uc,rmSync as Yc,writeFileSync as zc}from"node:fs";import{dirname as Wc}from"node:path";function ae(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Qc(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function Xc(e){if(!Gc(e))return{};let t;try{t=JSON.parse(qc(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude settings.json: ${o instanceof Error?o.message:String(o)}`)}if(!ae(t))throw new Error("Invalid existing Claude settings.json: root must be a JSON object.");return t}function Le(e){if(e===void 0)return[];if(!Array.isArray(e))throw new Error("Invalid existing Claude settings.json: hook event must be an array.");let t=[];for(let o of e){if(!ae(o)){t.push(o);continue}let r=o.hooks;if(!Array.isArray(r)){t.push(o);continue}let n=r.filter(i=>{if(!ae(i))return!0;let a=i.command;return!(typeof a=="string"&&a.includes("session:claude-hook"))});n.length!==0&&t.push({...o,hooks:n})}return t}function Ke(e,t=10){return{type:"command",command:e,timeout:t}}function Zc(e,t){Bc(Wc(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{zc(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Uc(o,e)}finally{Yc(o,{force:!0})}}function qr(e={}){let t=e.settingsFile??Go(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=Xc(t),n=r.hooks;if(n!==void 0&&!ae(n))throw new Error("Invalid existing Claude settings.json: hooks must be an object.");let i=ae(n)?{...n}:{},a=`${Qc(o)} session:claude-hook`,s=Le(i.SessionStart);s.push({matcher:"startup|resume|clear|compact",hooks:[Ke(a)]}),i.SessionStart=s;let c=Le(i.UserPromptSubmit);c.push({hooks:[Ke(a)]}),i.UserPromptSubmit=c;let l=Le(i.PostToolUse);l.push({matcher:"Edit|Write",hooks:[Ke(a)]}),i.PostToolUse=l;let u=Le(i.Stop);u.push({hooks:[Ke(a,30)]}),i.Stop=u;let d={...r,hooks:i},p=JSON.stringify(r),g=JSON.stringify(d);return p===g?{settingsFile:t,changed:!1}:e.dryRun===!0?{settingsFile:t,changed:!0,dryRun:!0}:(Zc(t,d),{settingsFile:t,changed:!0})}import{existsSync as el,mkdirSync as tl,readFileSync as ol,renameSync as rl,rmSync as nl,writeFileSync as il}from"node:fs";import{dirname as sl}from"node:path";function ce(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Ur(e){if(!el(e))return{};let t;try{t=JSON.parse(ol(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude Code config: ${o instanceof Error?o.message:String(o)}`)}if(!ce(t))throw new Error("Invalid existing Claude Code config: root must be a JSON object.");return t}function Yr(e,t){if(!ce(e))return!1;let o=e.args;return e.type==="stdio"&&e.command===t&&Array.isArray(o)&&o.length===1&&o[0]==="mcp"}function al(e,t){tl(sl(e),{recursive:!0});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{il(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),rl(o,e)}finally{nl(o,{force:!0})}}function zr(e={}){let t=e.stateFile??Bo(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=Ur(t),i=n.mcpServers;if(i!==void 0&&!ce(i))throw new Error("Invalid existing Claude Code config: mcpServers must be an object.");let a=ce(i)?{...i}:{},s=a[r];if(Yr(s,o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:[o,"mcp"],repaired:!1};let c=s!==void 0;if(a[r]={type:"stdio",command:o,args:["mcp"]},e.dryRun===!0)return{installed:!0,changed:!0,configFile:t,serverName:r,command:[o,"mcp"],repaired:c,dryRun:!0};al(t,{...n,mcpServers:a});let u=Ur(t).mcpServers;if(!ce(u)||!Yr(u[r],o))throw new Error("Claude Code MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:[o,"mcp"],repaired:c}}function Wr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=qr({binary:t,settingsFile:e.settingsFile,...e.dryRun!==void 0?{dryRun:e.dryRun}:{}}),r=zr({binary:t,stateFile:e.stateFile,...e.dryRun!==void 0?{dryRun:e.dryRun}:{}});return{hooks:o,mcp:r,files:[o.settingsFile,r.configFile]}}import{existsSync as cl,mkdirSync as ll,readFileSync as ul,renameSync as dl,rmSync as pl,writeFileSync as gl}from"node:fs";import{dirname as ml}from"node:path";var G="ToolNet Memory - ";function Zr(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function fl(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function Qr(e){if(!cl(e))return{};let t=ul(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro hooks file at ${e}: parse error. Not overwriting.`)}if(!Zr(o))throw new Error(`Invalid existing Kiro hooks file at ${e}: root must be a JSON object. Not overwriting.`);return o}function Xr(e){return Zr(e)?typeof e.name=="string"&&e.name.startsWith(G):!1}function le(e){return{type:"command",command:e}}function yl(e){return[{name:`${G}Session Start`,description:"Inject compact local ToolNet continuity and capture Kiro session activation.",trigger:"SessionStart",action:le(e),timeout:10,enabled:!0},{name:`${G}Prompt Continuity`,description:"Capture prompts and refresh ToolNet guidance only for resume/continue requests.",trigger:"UserPromptSubmit",action:le(e),timeout:10,enabled:!0},{name:`${G}Raw History Guard`,description:"Prevent Kiro from reconstructing continuity from raw ToolNet/agent session history.",trigger:"PreToolUse",matcher:"*",action:le(e),timeout:10,enabled:!0},{name:`${G}Tool Capture`,description:"Capture durable tool activity while filtering noisy read-only events.",trigger:"PostToolUse",matcher:"*",action:le(e),timeout:15,enabled:!0},{name:`${G}Final Flush`,description:"Flush pending Kiro WAL events when the assistant finishes a turn.",trigger:"Stop",action:le(e),timeout:30,enabled:!0}]}function hl(e,t){ll(ml(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{gl(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),dl(o,e)}finally{pl(o,{force:!0})}}function Je(e,t,o){let r=Qr(e);if(r.version!==void 0&&r.version!=="v1")throw new Error(`Unsupported existing Kiro hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!Array.isArray(n))throw new Error("Invalid existing Kiro hooks file: hooks must be an array.");let i=Array.isArray(n)?n.filter(l=>!Xr(l)):[],a=yl(t),s={...r,version:"v1",hooks:[...i,...a]};if(!o&&JSON.stringify(r)===JSON.stringify(s))return{changed:!1,hookCount:a.length};hl(e,s);let c=Qr(e);if(c.version!=="v1"||!Array.isArray(c.hooks)||c.hooks.filter(Xr).length!==a.length)throw new Error("Kiro hooks were written but verification failed.");return{changed:!0,hookCount:a.length}}function en(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=`${fl(t)} session:kiro-hook`;if(e.hooksFile){let a=Je(e.hooksFile,r,e.force??!1);return{hooksFile:e.hooksFile,...a}}if(o==="both"){let a=mt(),s=ft({cwd:e.cwd}),c=Je(a,r,e.force??!1),l=Je(s,r,e.force??!1);return{hooksFile:a,changed:c.changed||l.changed,hookCount:c.hookCount}}let n=o==="project"?ft({cwd:e.cwd}):mt(),i=Je(n,r,e.force??!1);return{hooksFile:n,...i}}import{existsSync as kl,mkdirSync as bl,readFileSync as Sl,renameSync as Il,rmSync as vl,writeFileSync as wl}from"node:fs";import{dirname as jl}from"node:path";function ue(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function tn(e){if(!kl(e))return{};let t=Sl(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro MCP config at ${e}: parse error. Not overwriting.`)}if(!ue(o))throw new Error(`Invalid existing Kiro MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function on(e,t){return ue(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&e.disabled===!1:!1}function xl(e,t){bl(jl(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{wl(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Il(o,e)}finally{vl(o,{force:!0})}}function Ve(e,t,o,r){let n=tn(e),i=n.mcpServers;if(i!==void 0&&!ue(i))throw new Error(`Invalid existing Kiro MCP config: mcpServers must be an object in ${e}.`);let a=ue(i)?{...i}:{},s=a[o];if(on(s,t)&&!r)return{installed:!0,changed:!1};a[o]={command:t,args:["mcp"],disabled:!1};let c={...n,mcpServers:a};xl(e,c);let u=tn(e).mcpServers;if(!ue(u)||!on(u[o],t))throw new Error(`Kiro MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function rn(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...Ve(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(r==="both"){let a=Oe(),s=gt({cwd:e.cwd}),c=Ve(a,t,o,e.force??!1),l=Ve(s,t,o,e.force??!1);return{installed:!0,changed:c.changed||l.changed,configFile:a,serverName:o,command:t,args:["mcp"]}}let n=r==="project"?gt({cwd:e.cwd}):Oe();return{...Ve(n,t,o,e.force??!1),configFile:n,serverName:o,command:t,args:["mcp"]}}function nn(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=rn({binary:t,configFile:e.configFile,scope:e.scope,cwd:e.cwd,force:e.force}),r=en({binary:t,hooksFile:e.hooksFile,scope:e.scope,cwd:e.cwd,force:e.force});return{installed:o.installed,changed:o.changed||r.changed,mcp:o,hooks:r,files:[o.configFile,r.hooksFile]}}import{existsSync as Cl,mkdirSync as Ol,readFileSync as Rl,renameSync as El,rmSync as Pl,writeFileSync as Tl}from"node:fs";import{dirname as Al}from"node:path";function Ct(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function _l(e){if(!Cl(e))return{};let t=Rl(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: parse error. Not overwriting.`)}if(!Ct(o))throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Nl(e,t){Ol(Al(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Tl(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),El(o,e)}finally{Pl(o,{force:!0})}}function sn(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??Yo({cwd:e.cwd}),r=_l(o),n="toolnet-memory";if(Ct(r.mcpServers)&&r.mcpServers[n]!=null&&!e.force)return{installed:!0,changed:!1,configFile:o};let a=Ct(r.mcpServers)?{...r.mcpServers}:{};return a[n]={command:t,args:["mcp"]},r.mcpServers=a,Nl(o,r),{installed:!0,changed:!0,configFile:o}}function an(e={}){let t=e.binary??"toolnet-memory",o=sn({binary:t,configFile:e.configFile,force:e.force,cwd:e.cwd});return{installed:o.installed,changed:o.changed,mcp:{...o,configured:o.installed},files:[o.configFile]}}import{mkdirSync as Jl,existsSync as Vl}from"node:fs";import{dirname as Gl}from"node:path";import{existsSync as Ml,mkdirSync as Fl,readFileSync as $l,renameSync as Dl,rmSync as Hl,writeFileSync as Ll}from"node:fs";import{dirname as Kl}from"node:path";function w(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function _(e,t){if(!Ml(e))return{};let o=$l(e,"utf8").trim();if(!o)return{};let r;try{r=JSON.parse(o)}catch(n){throw new Error(`Invalid existing ${t} MCP config: ${n instanceof Error?n.message:String(n)}`)}if(!w(r))throw new Error(`Invalid existing ${t} MCP config: root must be a JSON object.`);return r}function B(e,t){Fl(Kl(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Ll(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Dl(o,e)}finally{Hl(o,{force:!0})}}function cn(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??kt(),r=Gl(o);Vl(r)||Jl(r,{recursive:!0});let n=_(o,"Kilo"),i=n.mcp;if(i!==void 0&&!w(i))throw new Error("Invalid existing Kilo config: mcp must be an object.");let a=w(i)?{...i}:{},s="toolnet-memory";return w(a[s])&&!e.force?{installed:!0,changed:!1,configFile:o,configured:!0}:(a[s]={type:"local",command:[t,"mcp"],enabled:!0,timeout:1e4},B(o,{...n,mcp:a}),{installed:!0,changed:!0,configFile:o,configured:!0})}function ln(e={}){let t=e.binary??"toolnet-memory",o=cn({binary:t,configFile:e.configFile,force:e.force});return{installed:o.installed,changed:o.changed,mcp:o,files:[o.configFile]}}import{existsSync as Bl,mkdirSync as ql,readFileSync as Ul,renameSync as Yl,rmSync as zl,writeFileSync as Wl}from"node:fs";import{dirname as Ql}from"node:path";function k(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function P(e,t){if(!Bl(e))return{};let o=Ul(e,"utf8").trim();if(!o)return{};let r;try{r=JSON.parse(o)}catch(n){throw new Error(`Invalid existing ${t} hooks file: ${n instanceof Error?n.message:String(n)}`)}if(!k(r))throw new Error(`Invalid existing ${t} hooks file: root must be a JSON object.`);return r}function q(e,t){ql(Ql(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Wl(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Yl(o,e)}finally{zl(o,{force:!0})}}function Ot(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}var de=[["sessionStart",10],["beforeSubmitPrompt",10],["preToolUse",10],["postToolUse",15],["afterAgentResponse",15],["stop",30]];function un(e){return k(e)&&typeof e.command=="string"&&e.command.includes("session:cursor-hook")}function Xl(e,t,o){let n={type:"command",command:`TOOLNET_HOOK_EVENT=${Ot(e)} ${Ot(t)} session:cursor-hook`,timeout:o};return e==="preToolUse"&&(n.matcher=".*"),n}function Rt(e={}){let t=e.hooksFile??Pe(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=P(t,"Cursor");if(r.version!==void 0&&r.version!==1)throw new Error(`Unsupported existing Cursor hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!k(n))throw new Error("Invalid existing Cursor hooks file: hooks must be an object.");let i=k(n)?{...n}:{};for(let[l,u]of de){let d=i[l];if(d!==void 0&&!Array.isArray(d))throw new Error(`Invalid existing Cursor hooks file: hooks.${l} must be an array.`);let p=Array.isArray(d)?d.filter(g=>!un(g)):[];i[l]=[...p,Xl(l,o,u)]}let a={...r,version:1,hooks:i};if(JSON.stringify(r)===JSON.stringify(a))return{hooksFile:t,changed:!1,hookCount:de.length};q(t,a);let s=P(t,"Cursor");if(s.version!==1||!k(s.hooks))throw new Error("Cursor hooks were written but verification failed.");let c=0;for(let[l]of de){let u=s.hooks[l];if(!Array.isArray(u))throw new Error("Cursor hooks were written but verification failed.");c+=u.filter(un).length}if(c!==de.length)throw new Error("Cursor hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:de.length}}function dn(e,t){return w(e)?(e.type===void 0||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function Et(e={}){let t=e.configFile??Ee(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=_(t,"Cursor"),i=n.mcpServers;if(i!==void 0&&!w(i))throw new Error("Invalid existing Cursor MCP config: mcpServers must be an object.");let a=w(i)?{...i}:{};if(dn(a[r],o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};a[r]={type:"stdio",command:o,args:["mcp"]},B(t,{...n,mcpServers:a});let c=_(t,"Cursor").mcpServers;if(!w(c)||!dn(c[r],o))throw new Error("Cursor MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}import{mkdirSync as Zl,readFileSync as pn,renameSync as eu,rmSync as tu,writeFileSync as ou}from"node:fs";import{dirname as ru}from"node:path";var Pt=`---
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
`;function nu(e,t){Zl(ru(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{ou(o,t,{encoding:"utf8",mode:384}),eu(o,e)}finally{tu(o,{force:!0})}}function gn(e){let t=e.ruleFile??er(e.projectRoot);try{if(pn(t,"utf8")===Pt)return{ruleFile:t,changed:!1}}catch{}if(nu(t,Pt),pn(t,"utf8")!==Pt)throw new Error("Cursor ToolNet project rule was written but verification failed.");return{ruleFile:t,changed:!0}}import{spawnSync as iu}from"node:child_process";import{existsSync as U,statSync as su}from"node:fs";import{dirname as au,join as cu,parse as lu,resolve as At}from"node:path";function mn(e){let t=At(e);if(!U(t))throw new Error(`Project path does not exist: ${t}`);if(!su(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);return t}function Ge(e){return cu(e,".toolnet","project.json")}function uu(e){let t=At(e),o=lu(t).root;for(;;){if(U(Ge(t)))return t;if(t===o)return;let r=au(t);if(r===t)return;t=r}}function Tt(e){let t=iu("git",["rev-parse","--show-toplevel"],{cwd:e,encoding:"utf8",timeout:5e3});if(t.status!==0)return;let o=t.stdout.trim();return o?At(o):void 0}function T(e={}){let t=mn(e.cwd??process.cwd());if(e.project){let n=mn(e.project),i=Ge(n),a=Tt(n);return{root:n,source:"explicit",eligible:!0,toolnetProject:U(i),manifestFile:U(i)?i:void 0,gitRoot:a}}let o=uu(t);if(o){let n=Ge(o);return{root:o,source:"toolnet",eligible:!0,toolnetProject:!0,manifestFile:n,gitRoot:Tt(o)}}let r=Tt(t);if(r){let n=Ge(r);return{root:r,source:"git",eligible:!0,toolnetProject:U(n),manifestFile:U(n)?n:void 0,gitRoot:r}}return{root:t,source:"cwd",eligible:!1,toolnetProject:!1}}function kn(e,t={}){let o=[],r=e.indexOf("--scope");if(r>=0){let i=e[r+1];if(i!=="global"&&i!=="project"&&i!=="both")throw new Error(`Invalid --scope value: ${String(i)}`);o.push(i)}e.includes("--global")&&o.push("global"),e.includes("--both")&&o.push("both");let n=Array.from(new Set(o));if(n.length>1)throw new Error(`Conflicting integration scopes: ${n.join(", ")}`);return n[0]??t.defaultScope??"global"}function fn(e,t){return{install:e,effective:t}}function A(e,t){return{surface:e,global:fn(t.globalInstall,t.effective==="global"||t.effective==="both"),project:fn(t.projectInstall,t.effective==="project"||t.effective==="both"),effective:t.effective,risk:t.risk??"none",dedupeRequired:t.dedupeRequired??!1,trustRequired:t.trustRequired??t.projectInstall,note:t.note}}function du(e){return{mcp:A("mcp",{globalInstall:!0,projectInstall:!1,effective:"global"}),hooks:A("hooks",{globalInstall:!0,projectInstall:!1,effective:"global"}),work:A("work",{globalInstall:e==="grok",projectInstall:!1,effective:e==="grok"?"global":"none",note:e==="grok"?"Grok supports a global ToolNet continuity skill.":"Cursor/Copilot work instructions remain project-scoped."})}}function yn(e){return{mcp:A("mcp",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),hooks:A("hooks",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),work:A("work",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!1,note:e==="cursor"?"Use .cursor/rules/toolnet-memory.mdc.":e==="copilot"?"Use .github/instructions/toolnet-memory.instructions.md.":"Use .grok/skills/toolnet-continuity/SKILL.md."})}}function hn(e){return{mcp:A("mcp",{globalInstall:!0,projectInstall:!0,effective:"project",risk:e==="cursor"?"precedence-unverified":"shadowed-global",trustRequired:!0,note:e==="cursor"?"Project ToolNet MCP is the intended effective definition; native same-name precedence must be E2E certified before release.":"Global remains useful outside the project; same-name project definition wins inside the project."}),hooks:A("hooks",{globalInstall:!0,projectInstall:!0,effective:"both",risk:"additive-duplicate",dedupeRequired:!0,trustRequired:!0,note:"Global and project hook sources can both execute for the same native event."}),work:A("work",{globalInstall:e==="grok",projectInstall:!0,effective:"project",risk:e==="grok"?"shadowed-global":"none",trustRequired:!1,note:e==="cursor"?"Project rule is authoritative.":e==="copilot"?"Project instruction is authoritative.":"Project skill shadows the same-name global skill inside the project."})}}function Y(e){let{agent:t,scope:o,project:r}=e;return(o==="project"||o==="both")&&(!r||!r.eligible)?{agent:t,requestedScope:o,project:r,surfaces:o==="both"?hn(t):yn(t),canInstall:!1,reason:"Project scope requires an explicit project, existing ToolNet project, or Git repository root."}:{agent:t,requestedScope:o,project:r,surfaces:o==="global"?du(t):o==="project"?yn(t):hn(t),canInstall:!0}}function bn(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.rule?.changed)}function Sn(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:T({project:e.projectRoot}),n=Y({agent:"cursor",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Cursor project integration scope cannot be resolved.");let i,a;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(i={},n.surfaces.mcp.global.install&&(i.mcp=Et({binary:t,configFile:e.configFile??Ee()})),n.surfaces.hooks.global.install&&(i.hooks=Rt({binary:t,hooksFile:e.hooksFile??Pe()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Cursor project integration requires an eligible project root.");a={},n.surfaces.mcp.project.install&&(a.mcp=Et({binary:t,configFile:e.projectConfigFile??Xo(r.root)})),n.surfaces.hooks.project.install&&(a.hooks=Rt({binary:t,hooksFile:e.projectHooksFile??Zo(r.root)})),n.surfaces.work.project.install&&(a.rule=gn({projectRoot:r.root,ruleFile:e.projectRuleFile}))}let s=a?.mcp??i?.mcp,c=a?.hooks??i?.hooks;if(!s||!c)throw new Error("Cursor integration did not produce an effective MCP/hooks installation.");let l=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.rule?.ruleFile,a?.mcp?.configFile,a?.hooks?.hooksFile,a?.rule?.ruleFile].filter(u=>typeof u=="string")));return{installed:!0,changed:bn(i)||bn(a),scope:o,plan:n,project:r,global:i,projectScope:a,mcp:s,hooks:c,rule:a?.rule,files:l}}var pe=[["sessionStart",10],["userPromptSubmitted",10],["userPromptTransformed",10],["preToolUse",10],["postToolUse",15],["agentStop",30]];function pu(e){if(typeof e.command=="string")return e.command;if(typeof e.bash=="string")return e.bash}function In(e){return k(e)&&pu(e)?.includes("session:copilot-hook")===!0}function gu(e,t,o){let r={type:"command",command:`${t} session:copilot-hook`,env:{TOOLNET_HOOK_EVENT:e},timeoutSec:o};return e==="preToolUse"&&(r.matcher=".*"),r}function _t(e={}){let t=e.hooksFile??Ae(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=P(t,"GitHub Copilot CLI");if(r.version!==void 0&&r.version!==1)throw new Error(`Unsupported existing GitHub Copilot CLI hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!k(n))throw new Error("Invalid existing GitHub Copilot CLI hooks file: hooks must be an object.");let i=k(n)?{...n}:{};for(let[l,u]of pe){let d=i[l];if(d!==void 0&&!Array.isArray(d))throw new Error(`Invalid existing GitHub Copilot CLI hooks file: hooks.${l} must be an array.`);let p=Array.isArray(d)?d.filter(g=>!In(g)):[];i[l]=[...p,gu(l,o,u)]}let a={...r,version:1,hooks:i};if(JSON.stringify(r)===JSON.stringify(a))return{hooksFile:t,changed:!1,hookCount:pe.length};q(t,a);let s=P(t,"GitHub Copilot CLI");if(s.version!==1||!k(s.hooks))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");let c=0;for(let[l]of pe){let u=s.hooks[l];if(!Array.isArray(u))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");c+=u.filter(In).length}if(c!==pe.length)throw new Error("GitHub Copilot CLI hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:pe.length}}function vn(e,t){return w(e)?(e.type===void 0||e.type==="local"||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&Array.isArray(e.tools)&&e.tools.length===1&&e.tools[0]==="*":!1}function Nt(e={}){let t=e.configFile??Te(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=_(t,"GitHub Copilot CLI"),i=n.mcpServers;if(i!==void 0&&!w(i))throw new Error("Invalid existing GitHub Copilot CLI MCP config: mcpServers must be an object.");let a=w(i)?{...i}:{};if(vn(a[r],o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};a[r]={type:"stdio",command:o,args:["mcp"],tools:["*"]},B(t,{...n,mcpServers:a});let c=_(t,"GitHub Copilot CLI").mcpServers;if(!w(c)||!vn(c[r],o))throw new Error("GitHub Copilot CLI MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}import{mkdirSync as mu,readFileSync as wn,renameSync as fu,rmSync as yu,writeFileSync as hu}from"node:fs";import{dirname as ku}from"node:path";var Mt=`---
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
`;function bu(e,t){mu(ku(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{hu(o,t,{encoding:"utf8",mode:384}),fu(o,e)}finally{yu(o,{force:!0})}}function jn(e){let t=e.instructionFile??nr(e.projectRoot);try{if(wn(t,"utf8")===Mt)return{instructionFile:t,changed:!1}}catch{}if(bu(t,Mt),wn(t,"utf8")!==Mt)throw new Error("Copilot ToolNet project instruction verification failed.");return{instructionFile:t,changed:!0}}function xn(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.instruction?.changed)}function Cn(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:T({project:e.projectRoot}),n=Y({agent:"copilot",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Copilot project integration scope cannot be resolved.");let i,a;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(i={},n.surfaces.mcp.global.install&&(i.mcp=Nt({binary:t,configFile:e.configFile??Te()})),n.surfaces.hooks.global.install&&(i.hooks=_t({binary:t,hooksFile:e.hooksFile??Ae()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Copilot project integration requires an eligible project root.");a={},n.surfaces.mcp.project.install&&(a.mcp=Nt({binary:t,configFile:e.projectConfigFile??or(r.root)})),n.surfaces.hooks.project.install&&(a.hooks=_t({binary:t,hooksFile:e.projectHooksFile??rr(r.root)})),n.surfaces.work.project.install&&(a.instruction=jn({projectRoot:r.root,instructionFile:e.projectInstructionFile}))}let s=a?.mcp??i?.mcp,c=a?.hooks??i?.hooks;if(!s||!c)throw new Error("Copilot integration did not produce effective MCP/hooks.");let l=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.instruction?.instructionFile,a?.mcp?.configFile,a?.hooks?.hooksFile,a?.instruction?.instructionFile].filter(u=>typeof u=="string")));return{installed:!0,changed:xn(i)||xn(a),scope:o,plan:n,project:r,global:i,projectScope:a,mcp:s,hooks:c,instruction:a?.instruction,files:l}}import{existsSync as Su,mkdirSync as Iu,readFileSync as On,renameSync as vu,rmSync as wu,writeFileSync as ju}from"node:fs";import{dirname as xu}from"node:path";var Ft=`---
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
`;function Cu(e,t){Iu(xu(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{ju(o,t,{encoding:"utf8",mode:384}),vu(o,e)}finally{wu(o,{force:!0})}}function $t(e={}){let t=e.skillFile??Fe();if(Su(t)&&On(t,"utf8")===Ft)return{skillFile:t,changed:!1};if(Cu(t,Ft),On(t,"utf8")!==Ft)throw new Error("Grok ToolNet continuity skill was written but verification failed.");return{skillFile:t,changed:!0}}var ge=[["SessionStart",10],["UserPromptSubmit",10],["PreToolUse",10],["PostToolUse",15],["Stop",30]];function Rn(e){return!k(e)||!Array.isArray(e.hooks)?!1:e.hooks.some(t=>k(t)&&typeof t.command=="string"&&t.command.includes("session:grok-hook"))}function Ou(e,t,o){let r={hooks:[{type:"command",command:`${t} session:grok-hook`,timeout:o,env:{TOOLNET_HOOK_EVENT:e}}]};return e==="PreToolUse"&&(r.matcher=".*"),r}function Dt(e={}){let t=e.hooksFile??Me(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=P(t,"Grok Build"),n=r.hooks;if(n!==void 0&&!k(n))throw new Error("Invalid existing Grok Build hooks file: hooks must be an object.");let i=k(n)?{...n}:{};for(let[l,u]of ge){let d=i[l];if(d!==void 0&&!Array.isArray(d))throw new Error(`Invalid existing Grok Build hooks file: hooks.${l} must be an array.`);let p=Array.isArray(d)?d.filter(g=>!Rn(g)):[];i[l]=[...p,Ou(l,o,u)]}let a={...r,hooks:i};if(JSON.stringify(r)===JSON.stringify(a))return{hooksFile:t,changed:!1,hookCount:ge.length};q(t,a);let s=P(t,"Grok Build");if(!k(s.hooks))throw new Error("Grok Build hooks were written but verification failed.");let c=0;for(let[l]of ge){let u=s.hooks[l];if(!Array.isArray(u))throw new Error("Grok Build hooks were written but verification failed.");c+=u.filter(Rn).length}if(c!==ge.length)throw new Error("Grok Build hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:ge.length}}import{existsSync as Ru,mkdirSync as Eu,readFileSync as Pu,renameSync as Tu,rmSync as Au,writeFileSync as _u}from"node:fs";import{dirname as Nu}from"node:path";function En(e){return Ru(e)?Pu(e,"utf8"):""}function Mu(e,t){Eu(Nu(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{_u(o,t,{encoding:"utf8",mode:384}),Tu(o,e)}finally{Au(o,{force:!0})}}function Ht(e){return e.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t")}function Fu(e){return`[mcp_servers."${Ht(e)}"]`}function $u(e,t){return[Fu(e),`command = "${Ht(t)}"`,'args = ["mcp"]',"enabled = true"].join(`
`)}function Du(e){let t=e.trim();return t.startsWith("[")&&t.includes("]")}function Be(e){return e.trim().replace(/\s+/g,"")}function Hu(e){return new Set([Be(`[mcp_servers.${e}]`),Be(`[mcp_servers."${e}"]`),Be(`[mcp_servers.'${e}']`)])}function Tn(e,t){let o=e.split(/\r?\n/),r=Hu(t),n=-1;for(let u=0;u<o.length;u+=1){let d=Be(o[u].replace(/\s+#.*$/,""));if(r.has(d)){n=u;break}}if(n<0)return null;let i=o.length;for(let u=n+1;u<o.length;u+=1)if(Du(o[u])){i=u;break}let a=[],s=0;for(let u of o)a.push(s),s+=u.length+1;let c=a[n]??0,l=i>=o.length?e.length:a[i]??e.length;return{start:c,end:l}}function Lu(e,t,o){let r=`${$u(t,o)}
`,n=Tn(e,t);if(n){let i=e.slice(0,n.start),a=e.slice(n.end);return`${i}${r}${a.replace(/^\n+/,"")}`}return e.trim()?`${e.replace(/\s*$/,"")}

${r}`:r}function Pn(e,t,o){let r=Tn(e,t);if(!r)return!1;let n=e.slice(r.start,r.end);return n.includes(`command = "${Ht(o)}"`)&&/args\s*=\s*\[\s*"mcp"\s*\]/.test(n)&&/enabled\s*=\s*true/.test(n)}function Lt(e={}){let t=e.configFile??Ne(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=En(t);if(Pn(n,r,o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};let i=Lu(n,r,o);Mu(t,i);let a=En(t);if(!Pn(a,r,o))throw new Error("Grok Build MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}function An(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.skill?.changed)}function _n(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:T({project:e.projectRoot}),n=Y({agent:"grok",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Grok project integration scope cannot be resolved.");let i,a;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(i={},n.surfaces.mcp.global.install&&(i.mcp=Lt({binary:t,configFile:e.configFile??Ne()})),n.surfaces.hooks.global.install&&(i.hooks=Dt({binary:t,hooksFile:e.hooksFile??Me()})),n.surfaces.work.global.install&&(i.skill=$t({skillFile:e.skillFile??Fe()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Grok project integration requires an eligible project root.");a={},n.surfaces.mcp.project.install&&(a.mcp=Lt({binary:t,configFile:e.projectConfigFile??sr(r.root)})),n.surfaces.hooks.project.install&&(a.hooks=Dt({binary:t,hooksFile:e.projectHooksFile??ar(r.root)})),n.surfaces.work.project.install&&(a.skill=$t({skillFile:e.projectSkillFile??cr(r.root)}))}let s=a?.mcp??i?.mcp,c=a?.hooks??i?.hooks,l=a?.skill??i?.skill;if(!s||!c||!l)throw new Error("Grok integration did not produce effective MCP/hooks/skill.");let u=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.skill?.skillFile,a?.mcp?.configFile,a?.hooks?.hooksFile,a?.skill?.skillFile].filter(d=>typeof d=="string")));return{installed:!0,changed:An(i)||An(a),scope:o,plan:n,project:r,global:i,projectScope:a,mcp:s,hooks:c,skill:l,files:u}}import{existsSync as $n,mkdirSync as ob,readFileSync as Dn,renameSync as rb,rmSync as nb,writeFileSync as Vu}from"node:fs";import{homedir as Ku}from"node:os";import{join as Nn}from"node:path";function Ju(e="toolnet-memory",t={}){return Nn(t.home??Ku(),".agents","plugins",e)}function Mn(e="toolnet-memory",t={}){return Nn(Ju(e,t),"hooks","hooks.json")}function Fn(e){return`'${e.replace(/'/g,"'\\''")}'`}function Gu(e){if(!$n(e))return{};let t;try{t=JSON.parse(Dn(e,"utf8"))}catch{throw new Error(`Invalid existing Goose hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Goose hooks.json at ${e}: root must be a JSON object.`);return t}function Hn(e={}){let t=e.pluginName??"toolnet-memory",o=e.hooksFile??Mn(t),r=Gu(o),n=e.binary??"toolnet-memory",i=`${Fn(n)} session:goose-hook`,a=`${Fn(n)} session:goose-hook`,s={type:"command",command:i,timeout:30},c={type:"command",command:a,timeout:3},l=r.hooks&&typeof r.hooks=="object"&&!Array.isArray(r.hooks)?r.hooks:{};r.hooks=l;let d=(Array.isArray(l.Stop)?l.Stop:[]).filter(Ye=>{try{return!JSON.stringify(Ye).includes("session:goose-hook")}catch{return!0}}),g=(Array.isArray(l.SessionEnd)?l.SessionEnd:[]).filter(Ye=>{try{return!JSON.stringify(Ye).includes("session:goose-hook")}catch{return!0}});l.Stop=[...d,{hooks:[s]}],l.SessionEnd=[...g,{hooks:[c]}];let C=JSON.stringify(r,null,2)+`
`,S=!$n(o)||Dn(o,"utf8")!==C;return Vu(o,C,{encoding:"utf8",mode:384}),{hooksFile:o,changed:S,stopInstalled:!0,sessionEndInstalled:!0}}function Ln(e={}){let t=Hn(e);return{hooksFile:t.hooksFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as Gn,mkdirSync as qu,readFileSync as Bn,renameSync as Uu,rmSync as Yu,writeFileSync as zu}from"node:fs";import{dirname as Wu}from"node:path";import{homedir as Bu}from"node:os";import{join as Kn}from"node:path";function Jn(e={}){let t=e.projectRoot;return t?Kn(t,".qwen","hooks.json"):Kn(e.home??Bu(),".qwen","hooks.json")}function Vn(e){return`'${e.replace(/'/g,"'\\''")}'`}function Qu(e){if(!Gn(e))return{};let t;try{t=JSON.parse(Bn(e,"utf8"))}catch{throw new Error(`Invalid existing Qwen hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Qwen hooks.json at ${e}: root must be a JSON object.`);return t}function Xu(e,t){qu(Wu(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{zu(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Uu(o,e)}finally{Yu(o,{force:!0})}}function qn(e={}){let t=e.hooksFile??Jn({projectRoot:e.projectRoot}),o=Qu(t),r=e.binary??"toolnet-memory",n=`${Vn(r)} session:qwen-hook`,i=`${Vn(r)} session:qwen-hook`,a={type:"command",command:n,timeout:30},s={type:"command",command:i,timeout:3},c=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=c;let u=(Array.isArray(c.Stop)?c.Stop:[]).filter(S=>{try{return!JSON.stringify(S).includes("session:qwen-hook")}catch{return!0}}),p=(Array.isArray(c.SessionEnd)?c.SessionEnd:[]).filter(S=>{try{return!JSON.stringify(S).includes("session:qwen-hook")}catch{return!0}});c.Stop=[...u,{hooks:[a]}],c.SessionEnd=[...p,{hooks:[s]}];let g=JSON.stringify(o,null,2)+`
`,C=!Gn(t)||Bn(t,"utf8")!==g;return Xu(t,o),{hooksFile:t,changed:C,stopInstalled:!0,sessionEndInstalled:!0}}function Un(e={}){let t=qn(e);return{hooksFile:t.hooksFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as Qn,mkdirSync as td,readFileSync as od,renameSync as rd,rmSync as nd,writeFileSync as id}from"node:fs";import{dirname as sd}from"node:path";import{homedir as Zu}from"node:os";import{join as ed}from"node:path";function Yn(e={}){return ed(e.home??Zu(),".kimi-code","config.toml")}function zn(e){return`'${e.replace(/'/g,"'\\''")}'`}function ad(e){return Qn(e)?od(e,"utf8"):""}function Wn(e,t){td(sd(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{id(o,t,{encoding:"utf8",mode:384}),rd(o,e)}finally{nd(o,{force:!0})}}function Xn(e={}){let t=e.configFile??Yn(),o=ad(t),r=e.binary??"toolnet-memory",n=`${zn(r)} session:kimi-hook`,i=`${zn(r)} session:kimi-hook`,a=`[[hooks]]
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
`,c=!0),c?Wn(t,o):Qn(t)||(Wn(t,a+`
`+s+`
`),c=!0),{configFile:t,changed:c,stopInstalled:!0,sessionEndInstalled:!0}}function Zn(e={}){let t=Xn(e);return{configFile:t.configFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as ti,mkdirSync as ud,readFileSync as dd,renameSync as pd,rmSync as gd,writeFileSync as md}from"node:fs";import{dirname as fd}from"node:path";import{homedir as cd}from"node:os";import{join as ld}from"node:path";function ei(e={}){return ld(e.home??cd(),".hermes","config.yaml")}function yd(e){return`'${e.replace(/'/g,"'\\''")}'`}function hd(e){return ti(e)?dd(e,"utf8"):""}function kd(e,t){ud(fd(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{md(o,t,{encoding:"utf8",mode:384}),pd(o,e)}finally{gd(o,{force:!0})}}function oi(e={}){let t=e.configFile??ei(),o=hd(t),r=e.binary??"toolnet-memory",i=`  - name: toolnet-memory-session-end
    event: on_session_end
    command: ${`${yd(r)} session:hermes-hook`}
    timeout: 30
`,a=!1;return o.includes("toolnet-memory-session-end")||(o.includes("hooks:")?o=o.replace(/hooks:\n/,`hooks:
${i}`):o=o.trim()+`

hooks:
`+i,a=!0),(a||!ti(t))&&(o.endsWith(`
`)||(o+=`
`),kd(t,o)),{configFile:t,changed:a,sessionEndInstalled:!0}}function ri(e={}){let t=oi(e);return{configFile:t.configFile,changed:t.changed,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as si,mkdirSync as Id,readFileSync as ai,renameSync as vd,rmSync as wd,writeFileSync as jd}from"node:fs";import{dirname as xd}from"node:path";import{existsSync as bd}from"node:fs";import{homedir as Sd}from"node:os";import{join as Kt}from"node:path";function ni(e={}){let t=e.home??Sd();return bd(Kt(t,".qoder-cn"))?Kt(t,".qoder-cn","settings.json"):Kt(t,".qoder","settings.json")}function ii(e){return`'${e.replace(/'/g,"'\\''")}'`}function Cd(e){if(!si(e))return{};let t;try{t=JSON.parse(ai(e,"utf8"))}catch{throw new Error(`Invalid existing Qoder settings.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Qoder settings.json at ${e}: root must be a JSON object.`);return t}function Od(e,t){Id(xd(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{jd(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),vd(o,e)}finally{wd(o,{force:!0})}}function ci(e={}){let t=e.settingsFile??ni(),o=Cd(t),r=e.binary??"toolnet-memory",n=`${ii(r)} session:qoder-hook`,i=`${ii(r)} session:qoder-hook`,a={type:"command",command:n,timeout:30},s={type:"command",command:i,timeout:3},c=Array.isArray(o.hooks)?[...o.hooks]:[],u=c.filter(g=>{try{return!JSON.stringify(g).includes("session:qoder-hook")}catch{return!0}}).filter(g=>{try{return!JSON.stringify(g).includes("session:qoder-hook")}catch{return!0}});c.length=0,c.push({...a,event:"Stop"},{...s,event:"SessionEnd"}),o.hooks=c;let d=JSON.stringify(o,null,2)+`
`,p=!si(t)||ai(t,"utf8")!==d;return Od(t,o),{settingsFile:t,changed:p,stopInstalled:!0,sessionEndInstalled:!0}}function li(e={}){let t=ci(e);return{settingsFile:t.settingsFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as Rd,mkdirSync as ui,readFileSync as Ed,renameSync as Pd,rmSync as Td,writeFileSync as Ad}from"node:fs";import{dirname as _d,join as qe}from"node:path";import{homedir as Nd}from"node:os";function Md(e,t){ui(_d(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Ad(o,t,{encoding:"utf8",mode:493}),Pd(o,e)}finally{Td(o,{force:!0})}}var Jt=`#!/usr/bin/env node
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
`;function di(e={}){let t=e.cwd?qe(e.cwd,".toolnet","bin"):qe(process.env.TOOLNET_HOME??qe(Nd(),".toolnet"),"bin");ui(t,{recursive:!0,mode:448});let o=qe(t,"aider-wrapper"),r=Jt.endsWith(`
`)?Jt:Jt+`
`,n=!Rd(o)||Ed(o,"utf8")!==r;return Md(o,r),{launcherPath:o,changed:n}}import{existsSync as pi,mkdirSync as Fd,readFileSync as gi,renameSync as $d,rmSync as Dd,writeFileSync as Hd}from"node:fs";import{dirname as Ld,join as mi}from"node:path";import{homedir as Kd}from"node:os";function Jd(){return process.env.PLANDEX_BASE_DIR??mi(Kd(),"plandex-server")}function Vd(e){if(!pi(e))return{};let t;try{t=JSON.parse(gi(e,"utf8"))}catch{throw new Error(`Invalid existing Plandex config at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Plandex config at ${e}: root must be a JSON object.`);return t}function Gd(e,t){Fd(Ld(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Hd(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),$d(o,e)}finally{Dd(o,{force:!0})}}function fi(e={}){let t=Jd(),o=mi(t,"toolnet-memory.json"),r=Vd(o),n=r.toolnetMemory??{};n.integration="toolnet-memory",n.captureMode="manual-recovery",n.managedBy="toolnet-memory",r.toolnetMemory=n;let i=JSON.stringify(r,null,2)+`
`,a=!pi(o)||gi(o,"utf8")!==i;return Gd(o,r),{configPath:o,changed:a}}import{existsSync as yi,mkdirSync as hi,readFileSync as ki,renameSync as Bd,rmSync as qd,writeFileSync as Ud}from"node:fs";import{dirname as bi,join as Yd}from"node:path";import{homedir as zd}from"node:os";function Wd(e){if(!yi(e))return{};let t;try{t=JSON.parse(ki(e,"utf8"))}catch{throw new Error(`Invalid existing OpenRouter config at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing OpenRouter config at ${e}: root must be a JSON object.`);return t}function Qd(e,t){hi(bi(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Ud(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Bd(o,e)}finally{qd(o,{force:!0})}}function Si(e={}){let t=zd(),o=Yd(t,".config","openrouter","toolnet-memory.json");hi(bi(o),{recursive:!0,mode:448});let r=Wd(o);r.toolnetMemory={integration:"toolnet-memory",captureMode:"blocked-product-identity",managedBy:"toolnet-memory",blocked:!0,reason:"OpenRouter CLI product identity is blocked for ToolNet integration."};let n=JSON.stringify(r,null,2)+`
`,i=!yi(o)||ki(o,"utf8")!==n;return Qd(o,r),{configPath:o,blocked:!0,changed:i}}import{existsSync as xi,mkdirSync as Zd,readFileSync as Ci,renameSync as ep,rmSync as tp,writeFileSync as op}from"node:fs";import{dirname as rp}from"node:path";import{homedir as Xd}from"node:os";import{join as Ii}from"node:path";function vi(e={}){return Ii(e.home??Xd(),".bob","settings","settings.json")}function wi(e){return Ii(e,".bob","settings.json")}function np(e){if(!xi(e))return{};let t;try{t=JSON.parse(Ci(e,"utf8"))}catch{throw new Error(`Invalid existing Bob settings.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Bob settings.json at ${e}: root must be a JSON object.`);return t}function ip(e,t){Zd(rp(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{op(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),ep(o,e)}finally{tp(o,{force:!0})}}function ji(e){return`'${e.replace(/'/g,"'\\''")}'`}function Oi(e={}){let t=e.projectRoot!==void 0?wi(e.projectRoot):vi({home:e.home}),o=np(t),r=e.binary??"toolnet-memory",n=`${ji(r)} hook ibm-bob`,i=`${ji(r)} hook ibm-bob`,a={type:"command",command:n,timeout:10},s={type:"command",command:i,timeout:10},c=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=c;let u=(Array.isArray(c.Stop)?c.Stop:[]).filter(S=>{try{return!JSON.stringify(S).includes("hook ibm-bob")}catch{return!0}}),p=(Array.isArray(c.SessionStart)?c.SessionStart:[]).filter(S=>{try{return!JSON.stringify(S).includes("hook ibm-bob")}catch{return!0}});c.Stop=[...u,{hooks:[a]}],c.SessionStart=[...p,{hooks:[s]}];let g=JSON.stringify(o,null,2)+`
`,C=!xi(t)||Ci(t,"utf8")!==g;return ip(t,o),{settingsFile:t,changed:C,stopInstalled:!0,sessionStartInstalled:!0}}function Ri(e={}){let t=Oi(e);return{settingsFile:t.settingsFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionStartInstalled:t.sessionStartInstalled}}import{existsSync as Vt,mkdirSync as Ti,readFileSync as Gt,renameSync as ap,rmSync as cp,writeFileSync as lp}from"node:fs";import{dirname as up,join as Bt}from"node:path";import{homedir as sp}from"node:os";import{join as Ei}from"node:path";function Pi(e){return e?Ei(e,".cline","hooks"):Ei(sp(),"Documents","Cline","Hooks")}function dp(e){return`'${e.replace(/'/g,"'\\''")}'`}function qt(e,t){Ti(up(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{lp(o,t,{encoding:"utf8",mode:493}),ap(o,e)}finally{cp(o,{force:!0})}}function pp(e){return`#!/bin/sh
exec ${`${dp(e)} hook cline`}
`}function Ai(e={}){let t=e.binary??"toolnet-memory",o=Pi(e.projectRoot),r=Bt(o,"toolnet-memory.sh");Ti(o,{recursive:!0,mode:448});let n=pp(t),i=!Vt(r)||Gt(r,"utf8")!==n;qt(r,n);let a=Bt(o,"TaskComplete"),s=Bt(o,"TaskStart"),c=!1,l=!1;return(!Vt(a)||Gt(a,"utf8")!==n)&&(qt(a,n),c=!0),(!Vt(s)||Gt(s,"utf8")!==n)&&(qt(s,n),l=!0),{hooksDir:o,hooksFile:r,changed:i||c||l,taskCompleteInstalled:c,taskStartInstalled:l}}function _i(e={}){let t=Ai(e);return{hooksFile:t.hooksFile,hooksDir:t.hooksDir,changed:t.changed,taskCompleteInstalled:t.taskCompleteInstalled,taskStartInstalled:t.taskStartInstalled}}import{existsSync as Fi,mkdirSync as $i,readFileSync as fp,renameSync as yp,rmSync as hp,writeFileSync as kp}from"node:fs";import{dirname as Di}from"node:path";import{homedir as gp}from"node:os";import{join as mp}from"node:path";function Ni(){return mp(gp(),".rovodev","config.yml")}function Hi(e){return`'${e.replace(/'/g,"'\\''")}'`}function Mi(e,t){$i(Di(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{kp(o,t,{encoding:"utf8",mode:384}),yp(o,e)}finally{hp(o,{force:!0})}}function bp(e){return Fi(e)?fp(e,"utf8"):""}function Sp(e){let t=`  - type: command
    command: ${Hi("toolnet-memory hook rovo")}
    timeout: 10
`;if(e.includes("hooks:")){if(e.includes("toolnet-memory hook rovo"))return e;let o=e.split(`
`),n=o.length-1;for(let i=o.length-1;i>=0&&o[i].trim()==="";i--)n=i;return o.splice(n,0,t),o.join(`
`)}return e+`
hooks:
${t}`}function Li(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??Ni();if($i(Di(o),{recursive:!0,mode:448}),!Fi(o)){let a=`hooks:
  - type: command
    command: ${Hi(`${t} hook rovo`)}
    timeout: 10
`;return Mi(o,a),{configFile:o,changed:!0,hookInstalled:!0}}let r=bp(o),n=Sp(r),i=r!==n;return i&&Mi(o,n),{configFile:o,changed:i,hookInstalled:i}}function Ki(e={}){let t=Li(e);return{configFile:t.configFile,changed:t.changed,hookInstalled:t.hookInstalled}}import{existsSync as Vi,mkdirSync as Bi,readFileSync as Gi,renameSync as wp,rmSync as jp,writeFileSync as xp}from"node:fs";import{dirname as qi,join as Cp}from"node:path";import{homedir as Ip}from"node:os";import{join as vp}from"node:path";function Ji(){return[vp(Ip(),".warp")]}function Op(e,t){Bi(qi(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{xp(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),wp(o,e)}finally{jp(o,{force:!0})}}function Ui(e={}){let t=Ji(),o=Cp(t[0],"toolnet-memory.json");Bi(qi(o),{recursive:!0,mode:448});let r=Vi(o)?JSON.parse(Gi(o,"utf8")):{};r.toolnetMemory={integration:"toolnet-memory",captureMode:"blocked-capability",managedBy:"toolnet-memory",blocked:!0,reason:"Warp Agent CLI capability is blocked for ToolNet integration."};let n=JSON.stringify(r,null,2)+`
`,i=!Vi(o)||Gi(o,"utf8")!==n;return Op(o,r),{configFile:o,blocked:!0,changed:i}}function Yi(e={}){if(e.scope==="global")return{scope:"global",automatic:!1,reason:"explicit-global"};if(e.scope==="project"||e.scope==="both"){let o=T({cwd:e.cwd,project:e.projectRoot});if(!o.eligible)throw new Error(`Explicit ${e.scope} integration requires an explicit project, ToolNet project, or Git repository root.`);return{scope:e.scope,automatic:!1,project:o,reason:e.scope==="project"?"explicit-project":"explicit-both"}}let t=T({cwd:e.cwd,project:e.projectRoot});return t.toolnetProject?{scope:"both",automatic:!0,project:t,reason:"toolnet-project"}:{scope:"global",automatic:!0,reason:"no-toolnet-project"}}function zi(){return pr()}function Ut(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[],r=e.detections??zi(),n=new Map(r.map(a=>[a.agent,a.detected])),i=Yi({scope:e.scope,projectRoot:e.projectRoot,cwd:e.cwd});if(!(e.force===!0||n.get("agy")===!0))o.push({agent:"agy",detected:!1,installed:!1,targets:[]});else try{let s=br({binary:t});o.push({agent:"agy",detected:!0,installed:!0,targets:s.files})}catch(s){o.push({agent:"agy",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("opencode")===!0))o.push({agent:"opencode",detected:!1,installed:!1,targets:[]});else try{let s=xr({binary:t}),c=Pr({binary:t});o.push({agent:"opencode",detected:!0,installed:!0,targets:[...s,c.configFile,`mcp:${c.serverName}`]})}catch(s){o.push({agent:"opencode",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("claude")===!0))o.push({agent:"claude",detected:!1,installed:!1,targets:[]});else try{let s=Wr({binary:t});o.push({agent:"claude",detected:!0,installed:!0,targets:[s.hooks.settingsFile,s.mcp.configFile,`mcp:${s.mcp.serverName}`]})}catch(s){o.push({agent:"claude",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("kiro")===!0))o.push({agent:"kiro",detected:!1,installed:!1,targets:[]});else try{let s=nn({...e.kiro??{},binary:t});o.push({agent:"kiro",detected:!0,installed:!0,targets:[s.mcp.configFile,`mcp:${s.mcp.serverName}`,s.hooks.hooksFile]})}catch(s){o.push({agent:"kiro",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("cursor")===!0))o.push({agent:"cursor",detected:!1,installed:!1,targets:[]});else try{let s=e.cursor??{},c=Sn({...s,binary:t,scope:s.scope??i.scope,projectRoot:s.projectRoot??i.project?.root});o.push({agent:"cursor",detected:!0,installed:!0,scope:c.scope,projectRoot:c.project?.root,targets:[...c.files,`mcp:${c.mcp.serverName}`]})}catch(s){o.push({agent:"cursor",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("copilot")===!0))o.push({agent:"copilot",detected:!1,installed:!1,targets:[]});else try{let s=e.copilot??{},c=Cn({...s,binary:t,scope:s.scope??i.scope,projectRoot:s.projectRoot??i.project?.root});o.push({agent:"copilot",detected:!0,installed:!0,scope:c.scope,projectRoot:c.project?.root,targets:[...c.files,`mcp:${c.mcp.serverName}`]})}catch(s){o.push({agent:"copilot",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("grok")===!0))o.push({agent:"grok",detected:!1,installed:!1,targets:[]});else try{let s=e.grok??{},c=_n({...s,binary:t,scope:s.scope??i.scope,projectRoot:s.projectRoot??i.project?.root});o.push({agent:"grok",detected:!0,installed:!0,scope:c.scope,projectRoot:c.project?.root,targets:[...c.files,`mcp:${c.mcp.serverName}`]})}catch(s){o.push({agent:"grok",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("toolnet-cli")===!0))o.push({agent:"toolnet-cli",detected:!1,installed:!1,targets:[]});else try{let s=e.toolnetCli??{},c=an({...s,binary:t});o.push({agent:"toolnet-cli",detected:!0,installed:!0,targets:[c.mcp.configFile]})}catch(s){o.push({agent:"toolnet-cli",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("kilo")===!0))o.push({agent:"kilo",detected:!1,installed:!1,targets:[]});else try{let s=e.kilo??{},c=ln({...s,binary:t});o.push({agent:"kilo",detected:!0,installed:!0,targets:[c.mcp.configFile]})}catch(s){o.push({agent:"kilo",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("codex")===!0))o.push({agent:"codex",detected:!1,installed:!1,targets:[]});else try{let s=Mr({binary:t}),c=$r({binary:t}),l=Jr({binary:t}),u=Br({binary:t});if(!u.installed)throw new Error(u.error??"Codex MCP registration failed");let d=[s.configFile,c,l.hooksFile,`mcp:${u.serverName}`];s.preservedPrevious&&d.push(s.previousFile),o.push({agent:"codex",detected:!0,installed:!0,targets:d})}catch(s){o.push({agent:"codex",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("goose")===!0))o.push({agent:"goose",detected:!1,installed:!1,targets:[]});else try{let s=e.goose??{},c=Ln({...s,binary:t});o.push({agent:"goose",detected:!0,installed:!0,targets:[c.hooksFile]})}catch(s){o.push({agent:"goose",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("qwen")===!0))o.push({agent:"qwen",detected:!1,installed:!1,targets:[]});else try{let s=e.qwen??{},c=Un({...s,binary:t});o.push({agent:"qwen",detected:!0,installed:!0,targets:[c.hooksFile]})}catch(s){o.push({agent:"qwen",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("kimi")===!0))o.push({agent:"kimi",detected:!1,installed:!1,targets:[]});else try{let s=e.kimi??{},c=Zn({...s,binary:t});o.push({agent:"kimi",detected:!0,installed:!0,targets:[c.configFile]})}catch(s){o.push({agent:"kimi",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("hermes")===!0))o.push({agent:"hermes",detected:!1,installed:!1,targets:[]});else try{let s=e.hermes??{},c=ri({...s,binary:t});o.push({agent:"hermes",detected:!0,installed:!0,targets:[c.configFile]})}catch(s){o.push({agent:"hermes",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("qoder")===!0))o.push({agent:"qoder",detected:!1,installed:!1,targets:[]});else try{let s=e.qoder??{},c=li({...s,binary:t});o.push({agent:"qoder",detected:!0,installed:!0,targets:[c.settingsFile]})}catch(s){o.push({agent:"qoder",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("aider")===!0))o.push({agent:"aider",detected:!1,installed:!1,targets:[]});else try{let s=e.aider??{},c=di({...s,binary:t});o.push({agent:"aider",detected:!0,installed:!0,targets:[c.launcherPath]})}catch(s){o.push({agent:"aider",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("plandex")===!0))o.push({agent:"plandex",detected:!1,installed:!1,targets:[]});else try{let s=e.plandex??{},c=fi({...s,binary:t});o.push({agent:"plandex",detected:!0,installed:!0,targets:[c.configPath]})}catch(s){o.push({agent:"plandex",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("openrouter")===!0))o.push({agent:"openrouter",detected:!1,installed:!1,targets:[]});else try{let s=e.openrouter??{},c=Si({...s,binary:t});o.push({agent:"openrouter",detected:!0,installed:!0,targets:[c.configPath]})}catch(s){o.push({agent:"openrouter",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("bob")===!0))o.push({agent:"bob",detected:!1,installed:!1,targets:[]});else try{let s=e.bob??{},c=Ri({...s,binary:t});o.push({agent:"bob",detected:!0,installed:!0,targets:[c.settingsFile]})}catch(s){o.push({agent:"bob",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("cline")===!0))o.push({agent:"cline",detected:!1,installed:!1,targets:[]});else try{let s=e.cline??{},c=_i({...s,binary:t});o.push({agent:"cline",detected:!0,installed:!0,targets:[c.hooksFile]})}catch(s){o.push({agent:"cline",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("rovo")===!0))o.push({agent:"rovo",detected:!1,installed:!1,targets:[]});else try{let s=e.rovo??{},c=Ki({...s,binary:t});o.push({agent:"rovo",detected:!0,installed:!0,targets:[c.configFile]})}catch(s){o.push({agent:"rovo",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("warp")===!0))o.push({agent:"warp",detected:!1,installed:!1,targets:[]});else try{let s=e.warp??{},c=Ui({...s,binary:t});o.push({agent:"warp",detected:!0,installed:!0,targets:[c.configFile]})}catch(s){o.push({agent:"warp",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}return o}function Ue(e){switch(e){case"agy":return"Agy / Antigravity";case"opencode":return"OpenCode";case"claude":return"Claude Code";case"kiro":return"Kiro CLI";case"cursor":return"Cursor CLI";case"copilot":return"GitHub Copilot CLI";case"grok":return"Grok Build";case"toolnet-cli":return"ToolNet CLI";case"kilo":return"Kilo";case"codex":return"Codex";case"goose":return"goose";case"qwen":return"Qwen Code";case"kimi":return"Kimi Code CLI";case"hermes":return"Hermes Agent";case"qoder":return"Qoder CLI";case"aider":return"Aider";case"plandex":return"Plandex";case"openrouter":return"OpenRouter CLI";case"bob":return"IBM Bob Shell";case"cline":return"Cline CLI";case"rovo":return"Rovo Dev CLI";case"warp":return"Warp Agent CLI";default:return e}}function Rp(e){console.log(""),console.log("ToolNet Memory Integration Detection"),console.log("===================================="),console.log("");for(let t of e){let o=Ue(t.agent);if(!t.detected){console.log(`\u25CB ${o}: not detected`);continue}console.log(`\u2713 ${o}: detected`);for(let r of t.evidence)console.log(`  ${r}`)}console.log("")}var Ep=["claude","cursor","copilot","grok","kiro","opencode","codex","agy"],Pp={opencode:"toolnet-memory session:opencode-sync",codex:"toolnet-memory session:codex-sync",agy:"toolnet-memory session:agy-sync","toolnet-cli":"toolnet-memory session:toolnet-cli-sync"};function Tp(e){if(Ep.includes(e))return"ToolNet integration configured; hooks installed successfully";let t=Pp[e];return t?`ToolNet integration configured; run ${t} to capture session history`:"ToolNet integration configured; capture begins when a supported hook or sync runs"}function Ap(e){console.log(""),console.log("ToolNet Memory AI Integrations"),console.log("=============================="),console.log("");for(let t of e){let o=Ue(t.agent);if(!t.detected){console.log(`- ${o}: not detected`);continue}if(t.installed){let r=t.scope?` [scope=${t.scope}]`:"";console.log(`\u2713 ${o}: ${Tp(t.agent)}${r}`),t.projectRoot&&console.log(`  project: ${t.projectRoot}`);continue}console.log(`\u2717 ${o}: integration failed`),t.error&&console.log(`  ${t.error}`)}console.log("")}function _p(e,t){let o=e.indexOf(t);return o>=0?e[o+1]:void 0}function Np(e){return e.includes("--scope")||e.includes("--global")||e.includes("--both")?kn(e):void 0}async function Mp(){let e=process.argv.slice(2),t=e.includes("--all"),o=e.includes("--json"),r=e.includes("--detect-only"),n=Np(e),i=_p(e,"--project");if(r){let s=zi();if(o){console.log(JSON.stringify(s,null,2));return}Rp(s);return}let a=Ut({force:t,scope:n,projectRoot:i});if(o){console.log(JSON.stringify(a,null,2));return}Ap(a)}var Fp=process.argv[1]&&(process.argv[1].endsWith("auto-integrate.js")||process.argv[1].endsWith("auto-integrate.ts"));Fp&&Mp().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});function Xi(e){let t=Dp(e);if(!Yt(t))throw new Error(`Project path does not exist: ${t}`);if(!$p(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);return t}function RI(e=process.cwd()){let t=Xi(e),o=new L().detect(t),r=Qi(o.rootPath,".toolnet","project.json");if(!Yt(r))throw new Error(`ToolNet project initialization failed: ${r} was not created`);return{initialized:!0,project:{id:o.id,name:o.name,remote:o.remote,rootPath:o.rootPath},manifestFile:r}}async function Hp(e=process.cwd(),t={}){let o=Xi(e),r={skipRemoteIdentity:t.skipRemoteIdentity,adoptRemote:t.adoptRemote,allowGitRebind:t.allowGitRebind},n=await Mo(o,r),i=n.project,a=Qi(i.rootPath,".toolnet","project.json");if(!Yt(a))throw new Error(`ToolNet project initialization failed: ${a} was not created`);return{initialized:!0,project:{id:i.id,name:i.name,remote:i.remote,rootPath:i.rootPath},manifestFile:a,identity:{source:n.source,registry:n.registry,registryProvider:n.registryProvider,gitRemote:n.gitIdentity?.canonicalRemote,fingerprint:n.gitIdentity?.fingerprint}}}function Wi(e,t){let o=e.indexOf(t);if(o<0)return;let r=e[o+1];if(!(!r||r.startsWith("-")))return r}async function Lp(){let e=process.argv.slice(2),t=e.includes("--json"),o=!e.includes("--no-integrate"),r=e.includes("--no-remote-identity"),n=e.includes("--rebind-git-identity"),i=Wi(e,"--adopt-remote"),a=Wi(e,"--project"),s=new Set(["--project","--adopt-remote"]),c=e.find((p,g)=>{if(p.startsWith("-"))return!1;let C=e[g-1];return!(C&&s.has(C))}),l=a??c??process.cwd(),u=await et("Resolving ToolNet project identity",()=>Hp(l,{skipRemoteIdentity:r,adoptRemote:i,allowGitRebind:n}),{enabled:!t}),d=[];if(o&&(d=await et("Detecting coding agents",()=>Ut({projectRoot:u.project.rootPath}),{enabled:!t})),t){console.log(JSON.stringify({...u,integrations:d},null,2));return}if(console.log(""),console.log("ToolNet Memory"),console.log("=============="),console.log(""),console.log("\u2713 Project initialized"),console.log(""),console.log(`Project:  ${u.project.name}`),console.log(`ID:       ${u.project.id}`),console.log(`Remote:   ${u.project.remote??u.project.name}`),console.log(`Root:     ${u.project.rootPath}`),console.log(`Manifest: ${u.manifestFile}`),u.identity&&(console.log(`Identity: ${u.identity.source}`),console.log(`Registry: ${u.identity.registry}`),u.identity.gitRemote&&console.log(`Git:      ${u.identity.gitRemote}`)),console.log(""),o){console.log("AI integrations:");let p=d.filter(g=>g.detected&&g.installed);if(!p.length)console.log("  \u25CB No supported coding agent detected");else for(let g of p){let C=Ue(g.agent),S=uo(g.agent);console.log(`  \u2713 ${C} \u2014 ${S}`)}console.log("")}console.log("Next: toolnet-memory doctor"),console.log("")}var Kp=process.argv[1]?.endsWith("/init.js")||process.argv[1]?.endsWith("/init.ts");Kp&&Lp().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});export{RI as initializeToolNetProject,Hp as initializeToolNetProjectCrossMachine};
