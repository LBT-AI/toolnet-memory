import{existsSync as Gt,statSync as Bd}from"node:fs";import{resolve as qd,join as Ri}from"node:path";import{existsSync as Pi,readFileSync as Ti}from"node:fs";import{homedir as Ai}from"node:os";import{join as _i}from"node:path";function Ni(e){let t=e.trim();return t.length>=2&&t.startsWith('"')&&t.endsWith('"')?(t=t.slice(1,-1),t.replace(/\\n/g,`
`).replace(/\\r/g,"\r").replace(/\\t/g,"	").replace(/\\"/g,'"').replace(/\\\\/g,"\\")):t.length>=2&&t.startsWith("'")&&t.endsWith("'")?t.slice(1,-1):t}function Mi(){let e=process.env.TOOLNET_GLOBAL_ENV??_i(Ai(),".config","toolnet-memory",".env");if(!Pi(e))return;let t=Ti(e,"utf8");for(let o of t.split(/\r?\n/)){let r=o.trim();if(!r||r.startsWith("#"))continue;r.startsWith("export ")&&(r=r.slice(7));let n=r.indexOf("=");if(n<=0)continue;let i=r.slice(0,n).trim();/^[A-Za-z_][A-Za-z0-9_]*$/.test(i)&&process.env[i]===void 0&&(process.env[i]=Ni(r.slice(n+1)))}}Mi();function z(e,t){return e===void 0?t:["1","true","yes","on"].includes(e.toLowerCase())}function W(e,t){if(!e)return t;let o=Number(e);return Number.isFinite(o)?o:t}function ze(){return{memory:{autoCapture:z(process.env.MEMORY_AUTO_CAPTURE,!0),autoRetrieve:z(process.env.MEMORY_AUTO_RETRIEVE,!0),autoSummarize:z(process.env.MEMORY_AUTO_SUMMARIZE,!0),autoSync:z(process.env.MEMORY_AUTO_SYNC,!0)},retrieval:{maxCandidates:W(process.env.MEMORY_MAX_CANDIDATES,50),rerankTop:W(process.env.MEMORY_RERANK_TOP,10),finalContext:W(process.env.MEMORY_FINAL_CONTEXT,5),tokenBudget:W(process.env.MEMORY_TOKEN_BUDGET,2e3)},storage:{provider:process.env.MEMORY_STORAGE_PROVIDER??"huggingface",r2:{accountId:process.env.R2_ACCOUNT_ID,bucket:process.env.R2_BUCKET,accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY},s3:{endpoint:process.env.S3_ENDPOINT,region:process.env.S3_REGION,bucket:process.env.S3_BUCKET,accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY,forcePathStyle:z(process.env.S3_FORCE_PATH_STYLE,!1)},huggingface:{namespace:process.env.HF_NAMESPACE,bucket:process.env.HF_BUCKET,accessKeyId:process.env.HF_S3_ACCESS_KEY_ID,secretAccessKey:process.env.HF_S3_SECRET_ACCESS_KEY},localRoot:process.env.MEMORY_LOCAL_STORAGE_PATH},cache:{maxMb:W(process.env.MEMORY_LOCAL_CACHE_MB,200)}}}import{createHash as Ji}from"node:crypto";import{existsSync as he,mkdirSync as Vi,readFileSync as Gi,renameSync as Bi,writeFileSync as qi}from"node:fs";import{basename as Ui,dirname as ke,join as X,parse as Qt,resolve as M}from"node:path";import{createHash as Ut}from"node:crypto";import{spawnSync as Fi}from"node:child_process";var Q="git-remote-v1",$i=new Set(["github.com","gitlab.com","bitbucket.org"]);function Yt(e,t){let o=t.replaceAll("\\","/").replace(/^\/+/u,"").replace(/\/+$/u,"").replace(/\.git$/iu,"").replace(/\/+/gu,"/");return!o||o==="."||o===".."||o.split("/").some(r=>!r||r==="."||r==="..")?null:($i.has(e)&&(o=o.toLowerCase()),o)}function Di(e){let t;try{t=new URL(e)}catch{return null}if(!["https:","http:","ssh:","git:"].includes(t.protocol))return null;let o=t.hostname.trim().toLowerCase();if(!o)return null;let r=t.protocol==="https:"&&t.port==="443"||t.protocol==="http:"&&t.port==="80"||t.protocol==="ssh:"&&t.port==="22",n=t.port&&!r?`${o}:${t.port}`:o,i=Yt(o,t.pathname);return i?`${n}/${i}`:null}function Hi(e){let t=e.match(/^(?:[^@\s/:]+@)?([^:/\s]+):(.+)$/u);if(!t)return null;let o=t[1]?.trim().toLowerCase();if(!o||o.length===1)return null;let r=Yt(o,t[2]??"");return r?`${o}/${r}`:null}function Bt(e){let t=e.trim();return t?t.includes("://")?Di(t):Hi(t):null}function Li(e){return Ut("sha256").update(`${Q}:${e}`).digest("hex")}function zt(e){return Ut("sha256").update(`toolnet-project:${Q}:${e}`).digest("hex").slice(0,16)}function Ki(e){return e.split("/").filter(Boolean).at(-1)?.trim()||null}function We(e,t){let o=Fi("git",["-C",e,...t],{encoding:"utf8",windowsHide:!0,stdio:["ignore","pipe","ignore"]});return o.error||o.status!==0?null:o.stdout?.trim()||null}function qt(e,t){let o=Ki(e);return o?{scheme:Q,canonicalRemote:e,fingerprint:Li(e),repositoryName:o,source:t}:null}function me(e){let t=We(e,["remote","get-url","origin"]);if(t){let n=Bt(t);if(n)return qt(n,"origin")}let o=We(e,["remote"]);if(!o)return null;let r=new Set;for(let n of o.split(/\r?\n/u).map(i=>i.trim()).filter(Boolean)){let i=We(e,["remote","get-url",n]);if(!i)continue;let a=Bt(i);a&&r.add(a)}return r.size!==1?null:qt([...r][0],"unique-remote")}var Xt=".toolnet",Yi="project.json";function zi(e){return Ji("sha256").update(e).digest("hex").slice(0,16)}function H(e){return X(e,Xt,Yi)}function Zt(e){return he(H(e))}function Wt(e,t){let o=M(e),r=Qt(o).root;for(;;){if(Zt(o))return o;if(o===r||t&&o===M(t))break;let n=ke(o);if(n===o)break;o=n}return null}function Qe(e){let t=M(e),o=Qt(t).root,r=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"];for(;;){if(r.some(i=>he(X(t,i))))return t;if(t===o)break;let n=ke(t);if(n===t)break;t=n}return M(e)}function fe(e){let t;try{t=JSON.parse(Gi(e,"utf8"))}catch(n){throw new Error(`Invalid ToolNet project manifest: ${e}: ${n instanceof Error?n.message:String(n)}`)}if(!t||typeof t!="object")throw new Error(`Invalid ToolNet project manifest: ${e}`);let o=t;if(typeof o.id!="string"||!o.id.trim())throw new Error(`ToolNet project manifest is missing id: ${e}`);if(typeof o.name!="string"||!o.name.trim())throw new Error(`ToolNet project manifest is missing name: ${e}`);let r=new Date().toISOString();return{version:1,id:o.id,name:o.name,remote:typeof o.remote=="string"&&o.remote.trim()?o.remote:o.name,rootPath:typeof o.rootPath=="string"?o.rootPath:ke(ke(e)),createdAt:typeof o.createdAt=="string"?o.createdAt:r,updatedAt:typeof o.updatedAt=="string"?o.updatedAt:r,graphVersion:typeof o.graphVersion=="number"?o.graphVersion:0,memoryVersion:typeof o.memoryVersion=="number"?o.memoryVersion:0,metadata:o.metadata&&typeof o.metadata=="object"?o.metadata:void 0}}function ye(e,t){let o=X(e,Xt);Vi(o,{recursive:!0});let r=H(e),n=`${r}.tmp-${process.pid}`;qi(n,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Bi(n,r)}function N(e,t){return{id:e.id,name:e.name,remote:e.remote,rootPath:t,createdAt:e.createdAt,updatedAt:e.updatedAt,graphVersion:e.graphVersion,memoryVersion:e.memoryVersion,metadata:e.metadata}}function Xe(e){return{version:1,scheme:Q,canonicalRemote:e.canonicalRemote,fingerprint:e.fingerprint,repositoryName:e.repositoryName}}function Wi(e){let t=e.metadata?.toolnetIdentity;if(!t||typeof t!="object"||Array.isArray(t))return null;let o=t;return typeof o.fingerprint=="string"?o.fingerprint:null}var L=class{adopt(t,o){let r=Qe(M(t));if(!o.id.trim())throw new Error("PROJECT_ADOPTION_INVALID_ID");if(!o.name.trim())throw new Error("PROJECT_ADOPTION_INVALID_NAME");if(!o.remote.trim())throw new Error("PROJECT_ADOPTION_INVALID_REMOTE");if(Zt(r)){let s=fe(H(r));if(s.id!==o.id)throw new Error(["PROJECT_IDENTITY_ALREADY_EXISTS",`existing=${s.id}`,`requested=${o.id}`].join(" "));return N(s,r)}let n=new Date().toISOString(),i={...o.metadata};o.gitIdentity&&(i.toolnetIdentity=Xe(o.gitIdentity));let a={version:1,id:o.id.trim(),name:o.name.trim(),remote:o.remote.trim(),rootPath:r,createdAt:o.createdAt??n,updatedAt:n,graphVersion:o.graphVersion??0,memoryVersion:o.memoryVersion??0,metadata:Object.keys(i).length?i:void 0};return ye(r,a),N(a,r)}recordGitIdentity(t,o,r={}){let n=this.requireExisting(t),i=H(n.rootPath),a=fe(i),s=Wi(a);if(s&&s!==o.fingerprint&&!r.allowRebind)throw new Error(["PROJECT_GIT_REMOTE_CHANGED",`existing=${s}`,`current=${o.fingerprint}`,"Use explicit rebind only when this repository identity change is intentional."].join(" "));let c=a.metadata?.toolnetIdentity;return c&&typeof c=="object"&&!Array.isArray(c)&&c.fingerprint===o.fingerprint||(a.metadata={...a.metadata,toolnetIdentity:Xe(o)},a.updatedAt=new Date().toISOString(),ye(n.rootPath,a)),N(a,n.rootPath)}findExisting(t=process.cwd()){let o=M(t),r=Qe(o),i=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(c=>he(X(r,c))),a=Wt(o,i?r:void 0);if(!a)return null;let s=fe(H(a));return N(s,a)}requireExisting(t=process.cwd()){let o=this.findExisting(t);if(!o)throw new Error("PROJECT_NOT_INITIALIZED");return o}detect(t=process.cwd()){let o=M(t),r=Qe(o),i=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(d=>he(X(r,d))),a=Wt(o,i?r:void 0);if(a){let d=H(a),p=fe(d);return p.rootPath!==a&&(p.rootPath=a,p.updatedAt=new Date().toISOString(),ye(a,p)),N(p,a)}let s=new Date().toISOString(),c=Ui(r),l=me(r),u={version:1,id:l?zt(l.canonicalRemote):zi(r),name:c,remote:l?.repositoryName??c,rootPath:r,createdAt:s,updatedAt:s,graphVersion:0,memoryVersion:0,metadata:l?{toolnetIdentity:Xe(l)}:void 0};return ye(r,u),N(u,r)}};var Qi=[{type:"openai_key",regex:/\bsk-[A-Za-z0-9_-]{20,}\b/g,confidence:"exact"},{type:"huggingface_token",regex:/\bhf_[A-Za-z0-9]{20,}\b/g,confidence:"exact"},{type:"hf_s3_access_key",regex:/\bHFAK[A-Za-z0-9]{8,}\b/g,confidence:"exact"},{type:"aws_access_key",regex:/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,confidence:"exact"},{type:"github_token",regex:/\b(?:gh[pousr]_[A-Za-z0-9]{30,255}|github_pat_[A-Za-z0-9_]{40,255})\b/g,confidence:"exact"},{type:"stripe_secret_key",regex:/\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g,confidence:"exact"},{type:"google_api_key",regex:/\bAIza[A-Za-z0-9_-]{30,}\b/g,confidence:"exact"},{type:"slack_token",regex:/\bxox[baprs]-[A-Za-z0-9-]{16,}\b/g,confidence:"exact"},{type:"npm_token",regex:/\bnpm_[A-Za-z0-9]{20,}\b/g,confidence:"exact"},{type:"bearer_token",regex:/\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/gi,confidence:"high"},{type:"jwt",regex:/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,confidence:"exact"},{type:"private_key",regex:/-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,confidence:"exact"},{type:"password_assignment",regex:/\b(?:password|passwd|pwd)\s*[:=]\s*["']?[^"' \t\r\n]{6,}["']?/gi,confidence:"high"},{type:"secret_assignment",regex:/\b(?:secret|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key)\s*[:=]\s*["']?[^"' \t\r\n]{8,}["']?/gi,confidence:"high"},{type:"cookie",regex:/\b(?:cookie|set-cookie)\s*[:=]\s*[^;\n]{8,}/gi,confidence:"high"},{type:"url_credentials",regex:/\bhttps?:\/\/[^:/@\s]+:[^/@\s]{4,}@[^/\s]+/gi,confidence:"high"}],Xi=new Set(["example","example-key","example-token","changeme","change-me","password","secret","your-api-key","your-token","<token>","<secret>","<password>","[redacted]"]);function eo(e){return e.normalize("NFKC").trim().toLowerCase()}function Zi(e){if(e.length===0)return 0;let t=new Map;for(let r of e)t.set(r,(t.get(r)??0)+1);let o=0;for(let r of t.values()){let n=r/e.length;o-=n*Math.log2(n)}return o}function es(e){return/^[a-f0-9]{32}$/iu.test(e)||/^[a-f0-9]{40}$/iu.test(e)||/^[a-f0-9]{64}$/iu.test(e)}function ts(e,t,o){let r=e.slice(Math.max(0,t-48),t),n=e.slice(o,Math.min(e.length,o+16));return/\b(?:token|secret|key|credential|authorization|password|passwd|apikey|api_key|access[_-]?key)\b/iu.test(`${r} ${n}`)}function os(e,t){return e.start<t.end&&t.start<e.end}function to(e){return e.sort((t,o)=>t.start!==o.start?t.start-o.start:o.end-o.start-(t.end-t.start))}var be=class{allowValues=new Set;enableEntropyHeuristic;constructor(t={}){for(let o of t.allowValues??[]){let r=eo(o);r&&this.allowValues.add(r)}this.enableEntropyHeuristic=t.enableEntropyHeuristic??!0}scan(t){let o=[];for(let i of Qi){let a=new RegExp(i.regex.source,i.regex.flags);for(let s of t.matchAll(a))s.index===void 0||!s[0]||this.allowed(s[0])||o.push({type:i.type,value:s[0],start:s.index,end:s.index+s[0].length,confidence:i.confidence})}this.enableEntropyHeuristic&&o.push(...this.entropyMatches(t));let r=to(o),n=[];for(let i of r)n.some(a=>os(a,i))||n.push(i);return to(n)}hasSecrets(t){return this.scan(t).length>0}allowed(t){let o=eo(t);return Xi.has(o)?!0:this.allowValues.has(o)}entropyMatches(t){let o=[],r=/[A-Za-z0-9_+/=-]{32,160}/g;for(let n of t.matchAll(r)){if(n.index===void 0||!n[0])continue;let i=n[0];this.allowed(i)||es(i)||!/[A-Za-z]/u.test(i)||!/[0-9]/u.test(i)||ts(t,n.index,n.index+i.length)&&(Zi(i)<3.7||o.push({type:"high_entropy_secret",value:i,start:n.index,end:n.index+i.length,confidence:"heuristic"}))}return o}};function oo(e,t,o){Object.defineProperty(e,t,{value:o,enumerable:!0,writable:!0,configurable:!0})}var Se=class{scanner;constructor(t={}){this.scanner=new be(t)}sanitize(t){let o=this.scanner.scan(t);if(o.length===0)return{text:t,redacted:0,secretTypes:[]};let r=t,n=[...o].sort((a,s)=>s.start-a.start),i=new Set;for(let a of n)i.add(a.type),r=r.slice(0,a.start)+`[REDACTED:${a.type}]`+r.slice(a.end);return{text:r,redacted:o.length,secretTypes:[...i].sort()}}sanitizeValue(t){if(typeof t=="string")return this.sanitize(t).text;if(Array.isArray(t))return t.map(o=>this.sanitizeValue(o));if(t&&typeof t=="object"){let o={};for(let[r,n]of Object.entries(t)){if(r==="__proto__")continue;let i=r.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g,"");if(i.includes("password")||i.includes("passwd")||i==="pwd"||i.includes("secret")||i.includes("token")||i.includes("cookie")||i.includes("authorization")||i.includes("apikey")||i.includes("accesskey")||i.includes("privatekey")||i.includes("clientsecret")||i.includes("credential")){oo(o,r,"[REDACTED]");continue}oo(o,r,this.sanitizeValue(n))}return o}return t}};var fp=new Se;var rs={claude:"hook",cursor:"hook",copilot:"hook",grok:"hook",kiro:"hook",opencode:"hook",codex:"hook",agy:"hook","toolnet-cli":"manual-sync",kilo:"mcp-only",goose:"hook",qwen:"hook",kimi:"hook",hermes:"hook",qoder:"hook",aider:"managed-wrapper-session-end",plandex:"manual-sync",openrouter:"blocked-product-identity",bob:"hook"},ro={mcp:!0,continuityRead:!0,nativeCapture:!1,lifecycleHooks:!1,sharedJournalWrite:!1,level:"mcp-only"},no={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!1,sharedJournalWrite:!0,level:"native-capture"},x={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!0,sharedJournalWrite:!0,level:"native-capture"},ns={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!0,sharedJournalWrite:!0,level:"native-capture"},is={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!1,sharedJournalWrite:!0,level:"native-capture"};function f(e,t,o){return{agent:e,...t,refreshMode:o,captureMode:rs[e]}}var io={agy:f("agy",x,"native-lifecycle"),opencode:f("opencode",ns,"persistent-plugin"),codex:f("codex",x,"native-lifecycle"),claude:f("claude",x,"native-lifecycle"),kiro:f("kiro",x,"native-lifecycle"),cursor:f("cursor",x,"native-lifecycle"),copilot:f("copilot",x,"native-lifecycle"),grok:f("grok",x,"native-lifecycle"),"toolnet-cli":f("toolnet-cli",no,"native-session"),kilo:f("kilo",ro,"mcp-only"),goose:f("goose",x,"native-lifecycle"),qwen:f("qwen",x,"native-lifecycle"),kimi:f("kimi",x,"native-lifecycle"),hermes:f("hermes",x,"native-lifecycle"),qoder:f("qoder",x,"native-lifecycle"),aider:f("aider",is,"managed-wrapper"),plandex:f("plandex",no,"native-session"),openrouter:f("openrouter",ro,"mcp-only"),bob:f("bob",x,"native-lifecycle")};function ss(e){return Object.prototype.hasOwnProperty.call(io,e)}function as(e){if(ss(e))return io[e]}function so(e){let t=as(e);if(!t)return"unknown";switch(t.refreshMode){case"native-lifecycle":return"native lifecycle";case"persistent-plugin":return"persistent plugin";case"native-session":return"native session capture";case"mcp-only":return"MCP only";case"managed-wrapper":return"managed wrapper";default:return t.refreshMode}}var ao=["\u280B","\u2819","\u2839","\u2838","\u283C","\u2834","\u2826","\u2827","\u2807","\u280F"],S={clear:"\r\x1B[2K",cyan:"\x1B[36m",green:"\x1B[32m",red:"\x1B[31m",yellow:"\x1B[33m",amber:"\x1B[38;5;214m",dim:"\x1B[2m",reset:"\x1B[0m"};function co(e,t=16){let r=Math.max(1,t-4+1),n=e%r;return"\u2500".repeat(n)+"\u2501".repeat(4)+"\u2500".repeat(Math.max(0,t-n-4))}function lo(e){let t=Date.now()-e;return t<1e3?`${t}ms`:t<1e4?`${(t/1e3).toFixed(1)}s`:`${Math.round(t/1e3)}s`}var Ze=class{stream;enabled;interactive;color;intervalMs;display;label;frame=0;startedAt=0;timer;active=!1;constructor(t,o={}){this.label=t,this.stream=o.stream??process.stderr,this.enabled=o.enabled??!0,this.interactive=o.interactive??this.stream.isTTY===!0,this.color=o.color??(this.interactive&&process.env.NO_COLOR===void 0),this.intervalMs=Math.max(40,o.intervalMs??80),this.display=o.display??"spinner"}start(){return!this.enabled||this.active?this:(this.active=!0,this.startedAt=Date.now(),this.interactive?(this.render(),this.timer=setInterval(()=>{this.frame=(this.frame+1)%1e4,this.render()},this.intervalMs),this.timer.unref?.(),this):(this.stream.write(`\u2192 ${this.label}
`),this))}update(t){return this.label=t,this.enabled&&this.active&&this.interactive&&this.render(),this}succeed(t){this.finish("\u2713",t??this.label,S.green)}fail(t){this.finish("\u2717",t??this.label,S.red)}warn(t){this.finish("!",t??this.label,S.yellow)}stop(){this.active&&(this.timer&&(clearInterval(this.timer),this.timer=void 0),this.enabled&&this.interactive&&this.stream.write(S.clear),this.active=!1)}render(){if(!this.enabled||!this.active||!this.interactive)return;let t=ao[this.frame%ao.length],o=this.display==="bar"?this.color?`${S.amber}${co(this.frame)}${S.reset}`:co(this.frame):this.color?`${S.cyan}${t}${S.reset}`:t,r=lo(this.startedAt),n=this.color?`${S.dim}${r}${S.reset}`:r;this.stream.write(`${S.clear}${o} ${this.label} ${n}`)}finish(t,o,r){if(!this.enabled){this.active=!1;return}this.startedAt||(this.startedAt=Date.now()),this.timer&&(clearInterval(this.timer),this.timer=void 0);let n=lo(this.startedAt),i=this.color?`${r}${t}${S.reset}`:t,a=this.color?`${S.dim}${n}${S.reset}`:n;this.interactive?this.stream.write(`${S.clear}${i} ${o} ${a}
`):this.stream.write(`${i} ${o} (${n})
`),this.active=!1}};async function et(e,t,o={}){let r=new Ze(e,o).start();try{let n=await t();return r.succeed(),n}catch(n){throw r.fail(),n}}import{resolve as Gs}from"node:path";import{homedir as Ds}from"node:os";import{join as Hs}from"node:path";import{DeleteObjectCommand as cs,GetObjectCommand as ls,HeadObjectCommand as us,ListObjectsV2Command as ds,PutObjectCommand as ps,S3Client as gs}from"@aws-sdk/client-s3";import{getSignedUrl as ms}from"@aws-sdk/s3-request-presigner";var Ie=class{name="huggingface";client;bucket;constructor(t){this.bucket=t.bucket,this.client=new gs({region:"us-east-1",endpoint:`https://s3.hf.co/${t.namespace}`,forcePathStyle:!0,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:t.accessKeyId,secretAccessKey:t.secretAccessKey}})}async put(t,o,r="application/octet-stream"){let n=typeof o=="string"?Buffer.from(o,"utf8"):o;await this.client.send(new ps({Bucket:this.bucket,Key:t,Body:n,ContentType:r}))}async get(t){let o=await ms(this.client,new ls({Bucket:this.bucket,Key:t}),{expiresIn:60}),r=await fetch(o,{redirect:"follow"});if(r.status===404)return null;if(!r.ok)throw new Error(`HF download failed: ${r.status} ${r.statusText}`);return new Uint8Array(await r.arrayBuffer())}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){try{return await this.client.send(new us({Bucket:this.bucket,Key:t})),!0}catch(o){if(typeof o=="object"&&o!==null&&"$metadata"in o&&o.$metadata?.httpStatusCode===404)return!1;throw o}}async delete(t){await this.client.send(new cs({Bucket:this.bucket,Key:t}))}async list(t=""){let o=[],r;do{let n=await this.client.send(new ds({Bucket:this.bucket,Prefix:t||void 0,ContinuationToken:r}));for(let i of n.Contents??[])i.Key&&o.push({key:i.Key,size:i.Size,updatedAt:i.LastModified?.toISOString()});r=n.IsTruncated?n.NextContinuationToken:void 0}while(r);return o}};import{access as uo,mkdir as fs,readFile as ys,readdir as hs,rm as ks,stat as po,writeFile as bs}from"node:fs/promises";import{dirname as Ss,join as Is,relative as go,resolve as ws}from"node:path";var Z=class{constructor(t){this.root=t}root;name="local";path(t){let o=t.replace(/^\/+/,"");return ws(this.root,o)}async put(t,o){let r=this.path(t);await fs(Ss(r),{recursive:!0}),await bs(r,o)}async get(t){try{return await ys(this.path(t))}catch(o){if(typeof o=="object"&&o!==null&&"code"in o&&o.code==="ENOENT")return null;throw o}}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){try{return await uo(this.path(t)),!0}catch{return!1}}async delete(t){await ks(this.path(t),{force:!0})}async list(t=""){let o=this.path(t),r=[];try{await uo(o)}catch{return r}let n=async a=>{let s=await hs(a,{withFileTypes:!0});for(let c of s){let l=Is(a,c.name);if(c.isDirectory()){await n(l);continue}let u=await po(l);r.push({key:go(this.root,l),size:u.size,updatedAt:u.mtime.toISOString()})}},i=await po(o);return i.isDirectory()?await n(o):r.push({key:go(this.root,o),size:i.size,updatedAt:i.mtime.toISOString()}),r}};import{DeleteObjectCommand as vs,GetObjectCommand as js,HeadObjectCommand as xs,ListObjectsV2Command as Cs,PutObjectCommand as Os,S3Client as Rs}from"@aws-sdk/client-s3";import{getSignedUrl as Es}from"@aws-sdk/s3-request-presigner";var ee=class{name;client;bucket;constructor(t){this.name=t.name??"s3",this.bucket=t.bucket,this.client=new Rs({region:t.region??"us-east-1",endpoint:t.endpoint||void 0,forcePathStyle:t.forcePathStyle??!1,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:t.accessKeyId,secretAccessKey:t.secretAccessKey}})}async put(t,o,r="application/octet-stream"){let n=typeof o=="string"?Buffer.from(o,"utf8"):o;await this.client.send(new Os({Bucket:this.bucket,Key:t,Body:n,ContentType:r}))}async get(t){let o=await Es(this.client,new js({Bucket:this.bucket,Key:t}),{expiresIn:60}),r=await fetch(o,{redirect:"follow"});if(r.status===404)return null;if(!r.ok)throw new Error(`${this.name} download failed: ${r.status} ${r.statusText}`);return new Uint8Array(await r.arrayBuffer())}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){try{return await this.client.send(new xs({Bucket:this.bucket,Key:t})),!0}catch(o){if(typeof o=="object"&&o!==null&&"$metadata"in o&&o.$metadata?.httpStatusCode===404)return!1;throw o}}async delete(t){await this.client.send(new vs({Bucket:this.bucket,Key:t}))}async list(t=""){let o=[],r;do{let n=await this.client.send(new Cs({Bucket:this.bucket,Prefix:t||void 0,ContinuationToken:r}));for(let i of n.Contents??[])i.Key&&o.push({key:i.Key,size:i.Size,updatedAt:i.LastModified?.toISOString()});r=n.IsTruncated?n.NextContinuationToken:void 0}while(r);return o}};import{createCipheriv as Ps,createDecipheriv as Ts,createHash as As,randomBytes as _s,timingSafeEqual as Ns}from"node:crypto";import{readFileSync as Ms}from"node:fs";var F=Buffer.from("TNMEME01","ascii"),fo=1,te=8,oe=12,tt=16,yo=F.length+1+te+oe+tt,Fs="toolnet-memory:remote-encryption:v1:",ho="aes-256-gcm",ot=32,y=class extends Error{constructor(o,r){super(r);this.code=o;this.name="RemoteEncryptionError"}code};function $s(e){return e?["1","true","yes","on","enabled"].includes(e.trim().toLowerCase()):!1}function rt(e=process.env){return $s(e.TOOLNET_REMOTE_ENCRYPTION)}function mo(e){let t=e.trim();if(!t)throw new y("REMOTE_ENCRYPTION_KEY_EMPTY","Remote encryption key is empty.");let o;if(t.startsWith("hex:")){let r=t.slice(4);if(!/^[0-9a-f]{64}$/iu.test(r))throw new y("REMOTE_ENCRYPTION_KEY_INVALID","hex: remote encryption key must contain exactly 64 hexadecimal characters.");o=Buffer.from(r,"hex")}else if(/^[0-9a-f]{64}$/iu.test(t))o=Buffer.from(t,"hex");else{let r=t.startsWith("base64:")?t.slice(7):t;if(!/^[A-Za-z0-9+/_-]+={0,2}$/u.test(r))throw new y("REMOTE_ENCRYPTION_KEY_INVALID","Remote encryption key must be 32 raw bytes encoded as hexadecimal or base64.");o=Buffer.from(r,r.includes("-")||r.includes("_")?"base64url":"base64")}if(o.length!==ot)throw new y("REMOTE_ENCRYPTION_KEY_INVALID_LENGTH",`Remote encryption key must decode to exactly ${ot} bytes.`);return o}function ko(e=process.env){let t=e.TOOLNET_REMOTE_ENCRYPTION_KEY?.trim(),o=e.TOOLNET_REMOTE_ENCRYPTION_KEY_FILE?.trim();if(t&&o)throw new y("REMOTE_ENCRYPTION_KEY_AMBIGUOUS","Configure either TOOLNET_REMOTE_ENCRYPTION_KEY or TOOLNET_REMOTE_ENCRYPTION_KEY_FILE, not both.");if(t)return mo(t);if(o){let r;try{r=Ms(o,"utf8")}catch(n){throw new y("REMOTE_ENCRYPTION_KEY_FILE_READ_FAILED",[`Unable to read remote encryption key file: ${o}.`,n instanceof Error?n.message:String(n)].join(" "))}return mo(r)}}function bo(e){return As("sha256").update(e).digest().subarray(0,te)}function So(e){return Buffer.from(`${Fs}${e}`,"utf8")}function nt(e){return e.byteLength<F.length?!1:Buffer.from(e).subarray(0,F.length).equals(F)}function Io(e,t,o){if(o.byteLength!==ot)throw new y("REMOTE_ENCRYPTION_KEY_INVALID_LENGTH","AES-256-GCM requires a 32-byte key.");let r=typeof t=="string"?Buffer.from(t,"utf8"):Buffer.from(t),n=_s(oe),i=Ps(ho,o,n);i.setAAD(So(e));let a=Buffer.concat([i.update(r),i.final()]),s=i.getAuthTag(),c=Buffer.alloc(yo),l=0;return F.copy(c,l),l+=F.length,c.writeUInt8(fo,l),l+=1,bo(o).copy(c,l),l+=te,n.copy(c,l),l+=oe,s.copy(c,l),Buffer.concat([c,a])}function wo(e,t,o){let r=Buffer.from(t);if(!nt(r))throw new y("REMOTE_ENCRYPTION_ENVELOPE_REQUIRED","Payload is not a ToolNet encrypted remote object.");if(r.length<yo)throw new y("REMOTE_ENCRYPTION_ENVELOPE_TRUNCATED","Encrypted remote payload is truncated.");let n=F.length,i=r.readUInt8(n);if(n+=1,i!==fo)throw new y("REMOTE_ENCRYPTION_VERSION_UNSUPPORTED",`Unsupported remote encryption envelope version: ${i}.`);let a=r.subarray(n,n+te);n+=te;let s=bo(o);if(!Ns(a,s))throw new y("REMOTE_ENCRYPTION_KEY_MISMATCH","Configured remote encryption key does not match this encrypted object.");let c=r.subarray(n,n+oe);n+=oe;let l=r.subarray(n,n+tt);n+=tt;let u=r.subarray(n),d=Ts(ho,o,c);d.setAAD(So(e)),d.setAuthTag(l);try{return Buffer.concat([d.update(u),d.final()])}catch{throw new y("REMOTE_ENCRYPTION_AUTH_FAILED","Encrypted remote object failed AES-GCM authentication.")}}var it=class{constructor(t,o){this.inner=t;this.options=o;if(this.name=t.name,o.enabled&&!o.key)throw new y("REMOTE_ENCRYPTION_KEY_REQUIRED","Remote client-side encryption is enabled but no encryption key is configured.")}inner;options;name;async put(t,o,r){if(!this.options.enabled){await this.inner.put(t,o,r);return}let n=this.options.key;if(!n)throw new y("REMOTE_ENCRYPTION_KEY_REQUIRED","Remote encryption key is unavailable.");let i=Io(t,o,n);await this.inner.put(t,i,"application/octet-stream")}async get(t){let o=await this.inner.get(t);if(!o)return null;if(!nt(o))return o;if(!this.options.enabled)throw new y("REMOTE_ENCRYPTION_REQUIRED",["Remote object is client-side encrypted.","Enable TOOLNET_REMOTE_ENCRYPTION and configure the matching key."].join(" "));let r=this.options.key;if(!r)throw new y("REMOTE_ENCRYPTION_KEY_REQUIRED","Remote object is encrypted but no decryption key is configured.");return wo(t,o,r)}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){return this.inner.exists(t)}async delete(t){await this.inner.delete(t)}async list(t=""){return this.inner.list(t)}};function vo(e,t=process.env){if(e.name==="local")return rt(t)&&console.warn("[storage] Remote encryption requested but active storage provider is local; local data remains unchanged."),e;let o=rt(t),r=o?ko(t):void 0;return new it(e,{enabled:o,key:r})}function re(e){return vo(e)}function st(e,t){return console.warn(t),re(new Z(e))}function jo(e){let t=e.localRoot??Hs(Ds(),".toolnet-memory","storage");if(e.provider==="r2"){let o=e.r2;return o?.accountId&&o.bucket&&o.accessKeyId&&o.secretAccessKey?re(new ee({name:"r2",endpoint:`https://${o.accountId}.r2.cloudflarestorage.com`,region:"auto",bucket:o.bucket,forcePathStyle:!0,accessKeyId:o.accessKeyId,secretAccessKey:o.secretAccessKey})):st(t,"[storage] Cloudflare R2 credentials missing. Using local fallback.")}if(e.provider==="s3"){let o=e.s3;return o?.bucket&&o.accessKeyId&&o.secretAccessKey?re(new ee({name:"s3",endpoint:o.endpoint,region:o.region??"us-east-1",bucket:o.bucket,forcePathStyle:o.forcePathStyle??!1,accessKeyId:o.accessKeyId,secretAccessKey:o.secretAccessKey})):st(t,"[storage] S3 credentials missing. Using local fallback.")}if(e.provider==="huggingface"){let o=e.huggingface;return o?.namespace&&o.bucket&&o.accessKeyId&&o.secretAccessKey?re(new Ie({namespace:o.namespace,bucket:o.bucket,accessKeyId:o.accessKeyId,secretAccessKey:o.secretAccessKey})):st(t,"[storage] Hugging Face credentials missing. Using local fallback.")}return re(new Z(t))}function Ls(e){return new Promise(t=>setTimeout(t,e))}async function xo(e,t={}){let o=Math.max(1,t.attempts??3),r=t.baseDelayMs??150,n=t.maxDelayMs??2e3,i;for(let a=1;a<=o;a++)try{return await e()}catch(s){if(i=s,a>=o)break;let c=Math.min(n,r*2**(a-1)),l=Math.floor(Math.random()*Math.max(1,c*.2));await Ls(c+l)}throw i}var Ks=new Set(["put","get","getText","delete","list"]);function Co(e,t={}){return new Proxy(e,{get(o,r){let n=Reflect.get(o,r,o);return typeof n!="function"?n:Ks.has(r)?(...i)=>xo(()=>Promise.resolve(n.apply(o,i)),t):n.bind(o)}})}var O="authority: never rebuilt, never dropped",Js=[{kind:"memory_records",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:O,legacyValueDomains:[],description:"Long-term project memory records (projects/<id>/memories/current.json)."},{kind:"task_operations",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"reject",sourceOfTruth:O,legacyValueDomains:[],description:"Immutable task operation log (.toolnet/tasks/events.jsonl)."},{kind:"task_replication_log",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"reject",sourceOfTruth:O,legacyValueDomains:[],description:"Replicated task operations from other hosts."},{kind:"retrieval_feedback",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:O,legacyValueDomains:[],description:"Retrieval feedback signals (.toolnet/retrieval/feedback.jsonl)."},{kind:"retrieval_telemetry",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:O,legacyValueDomains:[],description:"Retrieval telemetry samples (.toolnet/retrieval/telemetry.jsonl)."},{kind:"retrieval_overrides",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:O,legacyValueDomains:[],description:"Operator retrieval overrides (.toolnet/retrieval/overrides.json)."},{kind:"session_wal",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:O,legacyValueDomains:[],description:"Session write-ahead log (.toolnet/runtime/sources/)."},{kind:"adr_state",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"reject",sourceOfTruth:O,legacyValueDomains:[],description:"Architecture decision records (projects/<id>/knowledge/adr/state.v1.json)."},{kind:"project_manifest",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"backward_compatible",missingVersionPolicy:"assume_legacy",sourceOfTruth:O,legacyValueDomains:[],description:"Project identity manifest (.toolnet/project.json and the remote copy)."},{kind:"recovery_backup",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"reject",sourceOfTruth:O,legacyValueDomains:[],description:"Disaster-recovery backup manifest, version-gated on read."},{kind:"task_projection",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"task operations log",legacyValueDomains:[],description:"Materialized task state; rebuilt from the operation log."},{kind:"code_graph",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Code graph snapshot (projects/<id>/graph/current.json)."},{kind:"code_manifest",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Incremental file manifest (projects/<id>/graph/manifest.json)."},{kind:"resolution_snapshot",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"backward_compatible",missingVersionPolicy:"assume_legacy",sourceOfTruth:"repository source",legacyValueDomains:["resolution_kind_uppercase"],description:"Symbol resolution snapshot (projects/<id>/graph/resolution/current.json); the legacy kind vocabulary (CALL/REFERENCE/EXTENDS/IMPLEMENTS) is normalized in memory on read."},{kind:"graph_coverage",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code graph + resolution",legacyValueDomains:[],description:"Graph coverage snapshot (projects/<id>/graph/coverage.json)."},{kind:"cross_service",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source + service extractors",legacyValueDomains:[],description:"Cross-service linkage (projects/<id>/graph/cross-service.json)."},{kind:"fleet_export",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Fleet export view (projects/<id>/graph/fleet-export.json)."},{kind:"snapshot_archive",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"current project state",legacyValueDomains:[],description:"Point-in-time project snapshots; never part of authority backups."},{kind:"code_artifacts",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"reject",sourceOfTruth:"repository source + semantic registry",legacyValueDomains:[],description:"Portable code-intelligence artifacts, gated by the artifact fingerprint matrix."},{kind:"code_chunks",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Code chunk snapshot (projects/<id>/code/chunks/current.json)."},{kind:"code_vectors",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code chunks",legacyValueDomains:[],description:"Code vector index (projects/<id>/code/vectors/current.json)."},{kind:"memory_vectors",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"memory records",legacyValueDomains:[],description:"Deterministic memory vector index (projects/<id>/vectors/current.json)."},{kind:"architecture_snapshot",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code graph",legacyValueDomains:[],description:"Architecture snapshot (projects/<id>/code/architecture)."},{kind:"code_analysis",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code graph",legacyValueDomains:[],description:"Code analysis snapshot (projects/<id>/code/analysis)."},{kind:"visualization_graph",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code graph",legacyValueDomains:[],description:"Visualization graph (projects/<id>/code/visualization/graph.json)."},{kind:"runtime_traces",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"observed session activity",legacyValueDomains:[],description:"Runtime trace sessions plus their recomputed observation index."},{kind:"journal",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"session activity",legacyValueDomains:[],description:"Local session journal (.toolnet/journal)."},{kind:"task_replication_cursor",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"task replication log",legacyValueDomains:[],description:"Replication cursor (.toolnet/tasks/replication/cursor.json)."},{kind:"runtime_locks",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"process lifetime",legacyValueDomains:[],description:"Runtime lock files (.toolnet/runtime/locks)."},{kind:"daemon_state",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"running daemon",legacyValueDomains:[],description:"Daemon coordination state (daemon-state.json)."},{kind:"daemon_runtime_files",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"running daemon",legacyValueDomains:[],description:"Daemon socket, pid, lock and logs."},{kind:"artifact_staging",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Artifact staging area (.toolnet/cache/artifacts/staging)."},{kind:"test_run_cache",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"test execution",legacyValueDomains:[],description:"In-memory only derived test-run store."}],Vs=Object.freeze(Js.slice().sort((e,t)=>e.kind.localeCompare(t.kind))),Fg=new Map(Vs.map(e=>[e.kind,e]));var m="projects/[^/]+",$g=[{pattern:/^\.toolnet\/tasks\/events\.jsonl$/u,kind:"task_operations"},{pattern:/^\.toolnet\/tasks\/replication\/replicated(\/|$)/u,kind:"task_replication_log"},{pattern:/^\.toolnet\/tasks\/replication\/cursor\.json$/u,kind:"task_replication_cursor"},{pattern:/^\.toolnet\/tasks\/state\.json$/u,kind:"task_projection"},{pattern:/^\.toolnet\/tasks(\/|$)/u,kind:"task_projection"},{pattern:/^\.toolnet\/retrieval\/feedback\.jsonl$/u,kind:"retrieval_feedback"},{pattern:/^\.toolnet\/retrieval\/telemetry\.jsonl$/u,kind:"retrieval_telemetry"},{pattern:/^\.toolnet\/retrieval\/overrides\.json$/u,kind:"retrieval_overrides"},{pattern:/^\.toolnet\/retrieval(\/|$)/u,kind:"retrieval_overrides"},{pattern:/^\.toolnet\/runtime\/sources(\/|$)/u,kind:"session_wal"},{pattern:/^\.toolnet\/runtime\/locks(\/|$)/u,kind:"runtime_locks"},{pattern:/^\.toolnet\/runtime(\/|$)/u,kind:"session_wal"},{pattern:/^\.toolnet\/journal(\/|$)/u,kind:"journal"},{pattern:/^\.toolnet\/cache\/artifacts\/staging(\/|$)/u,kind:"artifact_staging"},{pattern:/^\.toolnet\/cache(\/|$)/u,kind:"artifact_staging"},{pattern:/^\.toolnet\/project\.json$/u,kind:"project_manifest"},{pattern:new RegExp(`^${m}/memories(/|$)`,"u"),kind:"memory_records"},{pattern:new RegExp(`^${m}/knowledge/adr(/|$)`,"u"),kind:"adr_state"},{pattern:new RegExp(`^${m}/project\\.json$`,"u"),kind:"project_manifest"},{pattern:new RegExp(`^${m}/graph/artifacts(/|$)`,"u"),kind:"code_artifacts"},{pattern:new RegExp(`^${m}/graph/resolution(/|$)`,"u"),kind:"resolution_snapshot"},{pattern:new RegExp(`^${m}/graph/coverage\\.json$`,"u"),kind:"graph_coverage"},{pattern:new RegExp(`^${m}/graph/cross-service\\.json$`,"u"),kind:"cross_service"},{pattern:new RegExp(`^${m}/graph/fleet-export\\.json$`,"u"),kind:"fleet_export"},{pattern:new RegExp(`^${m}/graph/manifest\\.json$`,"u"),kind:"code_manifest"},{pattern:new RegExp(`^${m}/graph/current\\.json$`,"u"),kind:"code_graph"},{pattern:new RegExp(`^${m}/graph(/|$)`,"u"),kind:"code_graph"},{pattern:new RegExp(`^${m}/code/graph(/|$)`,"u"),kind:"code_graph"},{pattern:new RegExp(`^${m}/code/chunks(/|$)`,"u"),kind:"code_chunks"},{pattern:new RegExp(`^${m}/code/vectors(/|$)`,"u"),kind:"code_vectors"},{pattern:new RegExp(`^${m}/code/architecture(/|$)`,"u"),kind:"architecture_snapshot"},{pattern:new RegExp(`^${m}/code/analysis(/|$)`,"u"),kind:"code_analysis"},{pattern:new RegExp(`^${m}/code/visualization(/|$)`,"u"),kind:"visualization_graph"},{pattern:new RegExp(`^${m}/vectors(/|$)`,"u"),kind:"memory_vectors"},{pattern:new RegExp(`^${m}/memory(/|$)`,"u"),kind:"memory_records"},{pattern:new RegExp(`^${m}/runtime-traces(/|$)`,"u"),kind:"runtime_traces"},{pattern:new RegExp(`^${m}/snapshots(/|$)`,"u"),kind:"snapshot_archive"},{pattern:/(^|\/)snapshots\/[^/]+\/(memories|vectors|graph)\//u,kind:"snapshot_archive"},{pattern:/(^|\/)daemon-state\.json$/u,kind:"daemon_state"},{pattern:/(^|\/)(daemon\.lock|daemon\.pid|daemon\.sock)$/u,kind:"daemon_runtime_files"},{pattern:/(^|\/)logs\/daemon\.log$/u,kind:"daemon_runtime_files"}];function K(e){let t=e.trim().replace(/\s+/g,"_").replace(/[^A-Za-z0-9._-]/g,"_").replace(/_+/g,"_").replace(/^\.+|\.+$/g,"").slice(0,100);if(!t||t==="."||t==="..")throw new Error("Invalid project storage folder");return t}var om=Object.freeze({CALL:"call",REFERENCE:"type",EXTENDS:"inheritance",IMPLEMENTS:"implementation"});var Bs="_toolnet/registry/project-identities/v1",w=class extends Error{code="PROJECT_IDENTITY_COLLISION";constructor(t){super(t),this.name="ProjectIdentityCollisionError"}},we=class extends Error{code="PROJECT_IDENTITY_ADOPTION_REQUIRED";constructor(t,o){super(["PROJECT_IDENTITY_ADOPTION_REQUIRED",`remote=${t}`,`projectId=${o}`,"A legacy remote ToolNet project exists but has no Git fingerprint proof.",`Re-run with: toolnet-memory init --adopt-remote ${t}`].join(" ")),this.name="ProjectIdentityAdoptionRequiredError"}},ne=class extends Error{code="PROJECT_IDENTITY_REGISTRY_UNAVAILABLE";constructor(t){super(["PROJECT_IDENTITY_REGISTRY_UNAVAILABLE",t,"Refusing to create a possibly split project identity while configured remote storage cannot be checked.","Use --no-remote-identity only when local-only initialization is intentional."].join(" ")),this.name="ProjectIdentityRegistryUnavailableError"}};function qs(){let e=ze();if(e.storage.provider==="r2"){let t=e.storage.r2;return!!(t.accountId&&t.bucket&&t.accessKeyId&&t.secretAccessKey)}if(e.storage.provider==="s3"){let t=e.storage.s3;return!!(t.bucket&&t.accessKeyId&&t.secretAccessKey)}if(e.storage.provider==="huggingface"){let t=e.storage.huggingface;return!!(t.namespace&&t.bucket&&t.accessKeyId&&t.secretAccessKey)}return!1}function Oo(e){if(e.storage)return{storage:e.storage,crossMachine:e.storageIsCrossMachine??!0,providerName:e.storage.name};let t=ze(),o=jo({provider:t.storage.provider,r2:t.storage.r2,s3:t.storage.s3,huggingface:t.storage.huggingface,localRoot:t.storage.localRoot}),r=qs()&&o.name!=="local";return{storage:r?Co(o,{attempts:Number(process.env.TOOLNET_STORAGE_RETRIES??3)}):o,crossMachine:r,providerName:o.name}}function Eo(e){return[Bs,`${e.fingerprint}.json`].join("/")}function Po(e,t){let o;try{o=JSON.parse(e)}catch(i){throw new w([`Invalid ToolNet project identity registry record: ${t}.`,i instanceof Error?i.message:String(i)].join(" "))}if(!o||typeof o!="object"||Array.isArray(o))throw new w(`Invalid ToolNet project identity registry record: ${t}`);let r=o;for(let i of["fingerprint","canonicalGitRemote","projectId","projectName","projectRemote"])if(typeof r[i]!="string"||!String(r[i]).trim())throw new w(`ToolNet identity registry record ${t} is missing ${i}`);let n=new Date().toISOString();return{version:1,fingerprint:String(r.fingerprint),canonicalGitRemote:String(r.canonicalGitRemote),projectId:String(r.projectId),projectName:String(r.projectName),projectRemote:String(r.projectRemote),createdAt:typeof r.createdAt=="string"?r.createdAt:n,updatedAt:typeof r.updatedAt=="string"?r.updatedAt:n}}function Us(e,t){let o;try{o=JSON.parse(e)}catch(a){throw new w([`Invalid remote ToolNet project manifest: ${t}.`,a instanceof Error?a.message:String(a)].join(" "))}if(!o||typeof o!="object"||Array.isArray(o))throw new w(`Invalid remote ToolNet project manifest: ${t}`);let r=o;if(typeof r.id!="string"||!r.id.trim())throw new w(`Remote ToolNet project manifest ${t} is missing id`);let n=typeof r.remote=="string"&&r.remote.trim()?r.remote:t.split("/")[1]??"project",i=typeof r.name=="string"&&r.name.trim()?r.name:n;return{version:typeof r.version=="number"?r.version:void 0,id:r.id,name:i,remote:n,createdAt:typeof r.createdAt=="string"?r.createdAt:void 0,updatedAt:typeof r.updatedAt=="string"?r.updatedAt:void 0}}async function ve(e,t){let r=`projects/${K(t)}/project.json`,n=await e.getText(r);return n?Us(n,r):null}async function Ys(e,t){let o=Eo(t),r=await e.getText(o);if(!r)return null;let n=Po(r,o);if(n.fingerprint!==t.fingerprint||n.canonicalGitRemote!==t.canonicalRemote)throw new w(["PROJECT_IDENTITY_REGISTRY_MISMATCH",`key=${o}`,`expectedFingerprint=${t.fingerprint}`,`actualFingerprint=${n.fingerprint}`].join(" "));return n}async function zs(e,t){let o=await ve(e,t.projectRemote);if(o&&o.id!==t.projectId)throw new w(["PROJECT_IDENTITY_REMOTE_OWNERSHIP_MISMATCH",`remote=${t.projectRemote}`,`registryId=${t.projectId}`,`remoteId=${o.id}`].join(" "))}async function at(e,t,o){let r=K(t.remote??t.name),n=await ve(e,r);if(n&&n.id!==t.id)throw new w(["PROJECT_IDENTITY_REMOTE_NAMESPACE_COLLISION",`remote=${r}`,`existing=${n.id}`,`current=${t.id}`].join(" "));let i=Eo(o),a=await e.getText(i);if(a){let l=Po(a,i);if(l.projectId!==t.id||l.canonicalGitRemote!==o.canonicalRemote)throw new w(["PROJECT_IDENTITY_REGISTRY_COLLISION",`fingerprint=${o.fingerprint}`,`existingProject=${l.projectId}`,`currentProject=${t.id}`].join(" "));return}let s=new Date().toISOString(),c={version:1,fingerprint:o.fingerprint,canonicalGitRemote:o.canonicalRemote,projectId:t.id,projectName:t.name,projectRemote:r,createdAt:t.createdAt,updatedAt:s};await e.put(i,JSON.stringify(c,null,2)+`
`,"application/json")}function Ws(e,t){return{id:e.id,name:e.name,remote:e.remote,createdAt:e.createdAt,gitIdentity:t,metadata:{adoptedFromRemote:!0,adoptedAt:new Date().toISOString()}}}function Ro(e){return e instanceof w||e instanceof we||e instanceof ne}async function To(e=process.cwd(),t={}){let o=Gs(e),r=new L,n=r.findExisting(o),i=me(n?.rootPath??o);if(n){let s=n;if(i&&(s=r.recordGitIdentity(n.rootPath,i,{allowRebind:t.allowGitRebind??!1})),t.skipRemoteIdentity||!i)return{project:s,source:"existing-manifest",gitIdentity:i,registry:t.skipRemoteIdentity?"skipped":"disabled"};let c=Oo(t);if(!c.crossMachine)return{project:s,source:"existing-manifest",gitIdentity:i,registry:"disabled",registryProvider:c.providerName};try{return await at(c.storage,s,i),{project:s,source:"existing-manifest",gitIdentity:i,registry:"registered",registryProvider:c.providerName}}catch(l){if(Ro(l))throw l;return{project:s,source:"existing-manifest",gitIdentity:i,registry:"unavailable",registryProvider:c.providerName}}}if(!i)return{project:r.detect(o),source:"legacy-path",gitIdentity:null,registry:"disabled"};if(t.skipRemoteIdentity)return{project:r.detect(o),source:"git-remote",gitIdentity:i,registry:"skipped"};let a=Oo(t);if(!a.crossMachine){if(t.adoptRemote)throw new ne("Explicit remote adoption was requested but no cross-machine storage provider is configured.");return{project:r.detect(o),source:"git-remote",gitIdentity:i,registry:"disabled",registryProvider:a.providerName}}try{let s=await Ys(a.storage,i);if(s){if(t.adoptRemote&&K(t.adoptRemote)!==K(s.projectRemote))throw new w(["PROJECT_IDENTITY_EXPLICIT_ADOPTION_CONFLICT",`requested=${t.adoptRemote}`,`registered=${s.projectRemote}`].join(" "));return await zs(a.storage,s),{project:r.adopt(o,{id:s.projectId,name:s.projectName,remote:s.projectRemote,createdAt:s.createdAt,gitIdentity:i,metadata:{adoptedFromRegistry:!0,adoptedAt:new Date().toISOString()}}),source:"remote-registry",gitIdentity:i,registry:"matched",registryProvider:a.providerName}}if(t.adoptRemote){let u=await ve(a.storage,t.adoptRemote);if(!u)throw new Error(["PROJECT_ADOPTION_REMOTE_NOT_FOUND",`remote=${t.adoptRemote}`].join(" "));let d=r.adopt(o,Ws(u,i));return await at(a.storage,d,i),{project:d,source:"explicit-remote-adoption",gitIdentity:i,registry:"registered",registryProvider:a.providerName}}let c=await ve(a.storage,i.repositoryName);if(c)throw new we(c.remote,c.id);let l=r.detect(o);return await at(a.storage,l,i),{project:l,source:"git-remote",gitIdentity:i,registry:"registered",registryProvider:a.providerName}}catch(s){throw Ro(s)?s:new ne(s instanceof Error?s.message:String(s))}}import{existsSync as ar}from"node:fs";import{homedir as Ia}from"node:os";import{join as C}from"node:path";import{spawnSync as wa}from"node:child_process";import{homedir as Qs}from"node:os";import{join as J}from"node:path";function Ao(e={}){return J(e.home??Qs(),".gemini")}function _o(e={}){return J(Ao(e),"antigravity-cli")}function No(e={}){return J(Ao(e),"config")}function je(e={}){return J(No(e),"mcp_config.json")}function xe(e={}){let t=e.cwd??process.cwd();return J(t,".agents","mcp_config.json")}function Ce(e="toolnet-memory",t={}){return J(_o(t),"plugins",e)}function Mo(e={}){return[_o(e),je(e),No(e),xe(e)]}import{homedir as Fo}from"node:os";import{join as $}from"node:path";function V(e={}){let t=process.env.OPENCODE_CONFIG_DIR?.trim();if(t)return t;let o=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return o?$(o,"opencode"):$(e.home??Fo(),".config","opencode")}function ct(e={}){let t=process.env.OPENCODE_CONFIG?.trim();if(t)return t;let o=e.home??Fo(),r=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return r?$(r,"opencode","opencode.json"):$(o,".config","opencode","opencode.json")}function lt(e={}){let t=e.cwd??process.cwd();return $(t,"opencode.json")}function $o(e={}){return $(V(e),"plugins")}function Do(e={}){return $(V(e),"AGENTS.md")}import{homedir as Ho}from"node:os";import{join as ut}from"node:path";function dt(e={}){return ut(e.home??Ho(),".claude")}function Lo(e={}){return ut(dt(e),"settings.json")}function Ko(e={}){return ut(e.home??Ho(),".claude.json")}import{homedir as Xs}from"node:os";import{join as D}from"node:path";function pt(e={}){return e.kiroHome??process.env.KIRO_HOME??D(e.home??Xs(),".kiro")}function Zs(e={}){return D(pt(e),"settings")}function Oe(e={}){return D(Zs(e),"mcp.json")}function gt(e={}){let t=e.cwd??process.cwd();return D(t,".kiro","settings","mcp.json")}function ea(e={}){return D(pt(e),"hooks")}function mt(e={}){return D(ea(e),"toolnet-memory.json")}function ft(e={}){let t=e.cwd??process.cwd();return D(t,".kiro","hooks","toolnet-memory.json")}function Jo(e={}){return[pt(e),Oe(e)]}import{homedir as ta}from"node:os";import{join as yt}from"node:path";function Vo(e={}){return yt(e.home??ta(),".toolnetcli")}function oa(e={}){return yt(Vo(e),"config.json")}function Go(e={}){let t=e.cwd??process.cwd();return yt(t,".toolnet","mcp.json")}function Bo(e={}){let t=Vo(e),o=oa(e);return[t,o]}import{homedir as ra}from"node:os";import{join as ht}from"node:path";function qo(e={}){if(e.kiloHome)return e.kiloHome;if(process.env.KILO_HOME)return process.env.KILO_HOME;let t=e.xdgConfigHome??process.env.XDG_CONFIG_HOME;return t?ht(t,"kilo"):ht(e.home??ra(),".config","kilo")}function kt(e={}){return ht(qo(e),"kilo.jsonc")}function Uo(e={}){let t=qo(e),o=kt(e);return[t,o]}import{homedir as na}from"node:os";import{join as E,resolve as ia}from"node:path";function Re(e={}){return e.cursorHome??E(e.home??na(),".cursor")}function sa(e={}){return e.cursorConfigDir??process.env.CURSOR_CONFIG_DIR??(e.xdgConfigHome??process.env.XDG_CONFIG_HOME?E(e.xdgConfigHome??process.env.XDG_CONFIG_HOME,"cursor"):void 0)??Re(e)}function Ee(e={}){return E(Re(e),"mcp.json")}function Pe(e={}){return E(Re(e),"hooks.json")}function bt(e){return E(ia(e),".cursor")}function Yo(e){return E(bt(e),"mcp.json")}function zo(e){return E(bt(e),"hooks.json")}function aa(e){return E(bt(e),"rules")}function Wo(e){return E(aa(e),"toolnet-memory.mdc")}function Qo(e={}){return Array.from(new Set([Re(e),sa(e)]))}import{homedir as ca}from"node:os";import{join as R,resolve as la}from"node:path";function St(e={}){return e.copilotHome??process.env.COPILOT_HOME??R(e.home??ca(),".copilot")}function Te(e={}){return R(St(e),"mcp-config.json")}function ua(e={}){return R(St(e),"hooks")}function Ae(e={}){return R(ua(e),"toolnet-memory.json")}function It(e){return R(la(e),".github")}function Xo(e){return R(It(e),"mcp.json")}function da(e){return R(It(e),"hooks")}function Zo(e){return R(da(e),"toolnet-memory.json")}function pa(e){return R(It(e),"instructions")}function er(e){return R(pa(e),"toolnet-memory.instructions.md")}function tr(e={}){return[St(e)]}import{homedir as ga}from"node:os";import{join as v,resolve as ma}from"node:path";function _e(e={}){return e.grokHome??process.env.GROK_HOME??v(e.home??ga(),".grok")}function Ne(e={}){return v(_e(e),"config.toml")}function fa(e={}){return v(_e(e),"hooks")}function Me(e={}){return v(fa(e),"toolnet-memory.json")}function ya(e={}){return v(_e(e),"skills")}function ha(e={}){return v(ya(e),"toolnet-continuity")}function Fe(e={}){return v(ha(e),"SKILL.md")}function wt(e){return v(ma(e),".grok")}function or(e){return v(wt(e),"config.toml")}function ka(e){return v(wt(e),"hooks")}function rr(e){return v(ka(e),"toolnet-memory.json")}function ba(e){return v(wt(e),"skills")}function Sa(e){return v(ba(e),"toolnet-continuity")}function nr(e){return v(Sa(e),"SKILL.md")}function ir(e={}){return[_e(e)]}function va(e){return wa("sh",["-lc",`command -v ${JSON.stringify(e)} >/dev/null 2>&1`],{stdio:"ignore"}).status===0}function h(e){let t=e.commandExists(e.command),o=e.configPaths.filter(i=>ar(i)),r=o.length>0,n=[];t&&n.push(`command:${e.command}`);for(let i of o)n.push(`config:${i}`);return{agent:e.agent,detected:t||r,commandDetected:t,configDetected:r,evidence:n}}function sr(e){let t=e.commands.filter(a=>e.commandExists(a)),o=e.configPaths.filter(a=>ar(a)),r=t.length>0,n=o.length>0,i=[...t.map(a=>`command:${a}`),...o.map(a=>`config:${a}`)];return{agent:e.agent,detected:r||n,commandDetected:r,configDetected:n,evidence:i}}function cr(e={}){let t=e.home??Ia(),o=e.commandExists??va,r=e.codexHome??process.env.CODEX_HOME??C(t,".codex");return[h({agent:"agy",command:"agy",commandExists:o,configPaths:Mo({home:t})}),h({agent:"opencode",command:"opencode",commandExists:o,configPaths:[V({home:t,xdgConfigHome:e.xdgConfigHome})]}),h({agent:"claude",command:"claude",commandExists:o,configPaths:[dt({home:t})]}),h({agent:"kiro",command:"kiro-cli",commandExists:o,configPaths:Jo({home:t,kiroHome:e.kiroHome})}),sr({agent:"cursor",commands:["agent","cursor-agent"],commandExists:o,configPaths:Qo({home:t,cursorHome:e.cursorHome,cursorConfigDir:e.cursorConfigDir,xdgConfigHome:e.xdgConfigHome})}),h({agent:"copilot",command:"copilot",commandExists:o,configPaths:tr({home:t,copilotHome:e.copilotHome})}),h({agent:"grok",command:"grok",commandExists:o,configPaths:ir({home:t,grokHome:e.grokHome})}),h({agent:"toolnet-cli",command:"toolnet",commandExists:o,configPaths:Bo({home:t})}),sr({agent:"kilo",commands:["kilo","kilo-code"],commandExists:o,configPaths:Uo({home:t,kiloHome:e.kiloHome})}),h({agent:"codex",command:"codex",commandExists:o,configPaths:[r]}),h({agent:"goose",command:"goose",commandExists:o,configPaths:[C(t,".agents","plugins")]}),h({agent:"qwen",command:"qwen",commandExists:o,configPaths:[C(t,".qwen")]}),h({agent:"kimi",command:"kimi-code",commandExists:o,configPaths:[C(t,".kimi-code")]}),h({agent:"hermes",command:"hermes",commandExists:o,configPaths:[C(t,".hermes")]}),h({agent:"qoder",command:"qoder",commandExists:o,configPaths:[C(t,".qoder-cn"),C(t,".qoder")]}),h({agent:"aider",command:"aider",commandExists:o,configPaths:[C(t,".aider")]}),h({agent:"plandex",command:"plandex",commandExists:o,configPaths:[C(t,".plandex"),C(t,"plandex-server")]}),h({agent:"openrouter",command:"openrouter",commandExists:o,configPaths:[C(t,".openrouter")]}),h({agent:"bob",command:"bob",commandExists:o,configPaths:[C(t,".bob")]})]}import{existsSync as Ja,mkdirSync as mr,readFileSync as Va,renameSync as Ga,writeFileSync as Ba}from"node:fs";import{dirname as qa,join as De}from"node:path";import{existsSync as ja,mkdirSync as xa,readFileSync as Ca,renameSync as Oa,rmSync as Ra,writeFileSync as Ea}from"node:fs";import{dirname as Pa,join as Ta}from"node:path";function Aa(e){return`'${e.replace(/'/g,"'\\''")}'`}function _a(e){if(!ja(e))return{};let t;try{t=JSON.parse(Ca(e,"utf8"))}catch{throw new Error(`Invalid existing Agy hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Agy hooks.json at ${e}: root must be a JSON object.`);return t}function Na(e,t){xa(Pa(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Ea(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Oa(o,e)}finally{Ra(o,{force:!0})}}function lr(e={}){let t=e.pluginName??"toolnet-memory",o=e.hooksFile??Ta(Ce(t),"hooks.json"),r=_a(o),n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",i=`${Aa(n)} session:agy-hook`;return r["toolnet-memory"]={enabled:!0,PreToolUse:[{matcher:"view_file|list_dir|find_by_name|grep_search|run_command",hooks:[{type:"command",command:`${i} pre-tool`,timeout:5}]}],PreInvocation:[{type:"command",command:`${i} pre`,timeout:15}],PostInvocation:[{type:"command",command:`${i} post`,timeout:15}],Stop:[{type:"command",command:`${i} stop`,timeout:30}]},Na(o,r),o}import{existsSync as Ma,mkdirSync as Fa,readFileSync as $a,renameSync as Da,writeFileSync as Ha}from"node:fs";import{dirname as La}from"node:path";function ie(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Ka(e,t){Fa(La(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;Ha(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Da(o,e)}function ur(e){if(!Ma(e))return{};let t=$a(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Agy MCP config at ${e}: parse error. Not overwriting.`)}if(!ie(o))throw new Error(`Invalid existing Agy MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function dr(e,t){return ie(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function $e(e,t,o,r){let n=ur(e),i=n.mcpServers;if(i!==void 0&&!ie(i))throw new Error(`Invalid existing Agy MCP config: mcpServers must be an object in ${e}.`);let a=ie(i)?{...i}:{},s=a[o];if(dr(s,t)&&!r)return{installed:!0,changed:!1};a[o]={command:t,args:["mcp"]};let c={...n,mcpServers:a};Ka(e,c);let u=ur(e).mcpServers;if(!ie(u)||!dr(u[o],t))throw new Error(`Agy MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function pr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...$e(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(r==="both"){let a=je(),s=xe({cwd:e.cwd}),c=$e(a,t,o,e.force??!1),l=$e(s,t,o,e.force??!1);return{installed:!0,changed:c.changed||l.changed,configFile:a,serverName:o,command:t,args:["mcp"]}}let n=r==="workspace"?xe({cwd:e.cwd}):je();return{...$e(n,t,o,e.force??!1),configFile:n,serverName:o,command:t,args:["mcp"]}}var Ua=`# ToolNet Memory Continuity

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
`;function Ya(e,t){mr(qa(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;Ba(o,t,{encoding:"utf8",mode:384}),Ga(o,e)}function gr(e,t){Ja(e)&&Va(e,"utf8")===t||Ya(e,t)}function fr(e={}){let t=e.pluginName??"toolnet-memory",o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.pluginRoot??Ce(t),n=De(r,"plugin.json"),i=De(r,"mcp_config.json"),a=De(r,"hooks.json"),s=De(r,"rules","toolnet-memory-continuity.md");return mr(r,{recursive:!0,mode:448}),gr(n,`${JSON.stringify({$schema:"https://antigravity.google/schemas/v1/plugin.json",name:t,description:"Persistent project continuity and memory for Antigravity coding sessions."},null,2)}
`),pr({configFile:i,binary:o,serverName:"toolnet-memory",force:e.force}),lr({hooksFile:a,binary:o,pluginName:t}),gr(s,`${Ua.trim()}
`),{installed:!0,pluginRoot:r,files:[n,i,a,s]}}import{existsSync as Wa,mkdirSync as br,readFileSync as Qa,writeFileSync as Sr}from"node:fs";import{join as hr}from"node:path";var za="memory_agent_ask";function yr(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${za}

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
`.trim()}var kr="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",vt="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function Xa(e={}){let t=Do();br(V(),{recursive:!0});let o=`${kr}
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


${yr()}

${vt}`,r=Wa(t)?Qa(t,"utf8"):"",n=r.indexOf(kr),i=r.indexOf(vt);return n>=0&&i>=n?r=r.slice(0,n)+o+r.slice(i+vt.length):(r=r.trimEnd(),r&&(r+=`

`),r+=o),Sr(t,r.trimEnd()+`
`,{encoding:"utf8",mode:384}),t}function Ir(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[];o.push(Xa({cwd:e.cwd}));let r=e.scope??"global",n=[];if((r==="global"||r==="both")&&n.push(e.directory??$o()),r==="project"||r==="both"){let i=e.cwd??process.cwd();n.push(hr(i,".opencode","plugins"))}for(let i of n){br(i,{recursive:!0});let a=hr(i,"toolnet-memory.js"),s=`
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
`;Sr(a,s.trimStart(),{encoding:"utf8",mode:384}),o.push(a)}return o}import{existsSync as jr,mkdirSync as Za,readFileSync as ec,renameSync as tc,writeFileSync as oc}from"node:fs";import{dirname as xr,join as rc}from"node:path";function se(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function nc(e,t){Za(xr(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;oc(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),tc(o,e)}function wr(e){if(!jr(e))return{};let t=ec(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing OpenCode config at ${e}: parse error. Not overwriting.`)}if(!se(o))throw new Error(`Invalid existing OpenCode config at ${e}: root must be a JSON object. Not overwriting.`);return o}function vr(e,t){if(!se(e))return!1;let o=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(o)&&o.length===2&&o[0]===t&&o[1]==="mcp"}function He(e,t,o,r){let n=rc(xr(e),"opencode.jsonc"),i=jr(n)?n:void 0,a=wr(e),s=a.mcp;if(s!==void 0&&!se(s))throw new Error(`Invalid existing OpenCode config: mcp must be an object in ${e}.`);let c=se(s)?{...s}:{},l=c[o];if(vr(l,t)&&!r)return{installed:!0,changed:!1,preservedJsonc:i};c[o]={type:"local",command:[t,"mcp"],enabled:!0};let u={...a,mcp:c};nc(e,u);let d=wr(e);if(!se(d.mcp)||!vr(d.mcp[o],t))throw new Error(`OpenCode MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0,preservedJsonc:i}}function Cr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...He(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:[t,"mcp"]};if(r==="both"){let a=ct(),s=lt({cwd:e.cwd}),c=He(a,t,o,e.force??!1),l=He(s,t,o,e.force??!1);return{installed:!0,changed:c.changed||l.changed,configFile:a,serverName:o,command:[t,"mcp"],preservedJsonc:c.preservedJsonc??l.preservedJsonc}}let n=r==="project"?lt({cwd:e.cwd}):ct();return{...He(n,t,o,e.force??!1),configFile:n,serverName:o,command:[t,"mcp"]}}import{existsSync as ic,mkdirSync as Or,readFileSync as sc,writeFileSync as Rr}from"node:fs";import{homedir as Er}from"node:os";import{dirname as Pr,join as jt}from"node:path";function ac(e){let t=[],o=/"((?:\\.|[^"\\])*)"|'([^']*)'/g,r;for(;r=o.exec(e);){let n=r[1]??r[2]??"";try{t.push(r[1]!==void 0?JSON.parse(`"${n}"`):n)}catch{t.push(n)}}return t}function Tr(e={}){let t=e.configFile??jt(process.env.CODEX_HOME??jt(Er(),".codex"),"config.toml"),o=e.previousFile??jt(Er(),".config","toolnet-memory","codex-notify-previous.json");Or(Pr(t),{recursive:!0}),Or(Pr(o),{recursive:!0});let r=ic(t)?sc(t,"utf8"):"",n=e.binary??"toolnet-memory",i=`notify = [${JSON.stringify(n)}, "session:codex-notify"]`,a=r.split(`
`),s=a.findIndex(p=>/^\s*\[/.test(p));s<0&&(s=a.length);let c=-1,l=-1;for(let p=0;p<s;p+=1)if(/^\s*notify\s*=/.test(a[p])){if(c=p,l=p,a[p].includes("[")&&!a[p].includes("]"))for(;l+1<s&&(l+=1,!a[l].includes("]")););break}let u=[];if(c>=0){let p=a.slice(c,l+1).join(`
`);u=ac(p),a.splice(c,l-c+1,i)}else s=a.findIndex(p=>/^\s*\[/.test(p)),s<0&&(s=a.length),a.splice(s,0,i);let d=u.length>=2&&u[u.length-1]==="session:codex-notify";return u.length>0&&!d&&Rr(o,JSON.stringify(u,null,2)+`
`,{encoding:"utf8",mode:384}),r=a.join(`
`),r.endsWith(`
`)||(r+=`
`),Rr(t,r,{encoding:"utf8",mode:384}),{configFile:t,previousFile:o,preservedPrevious:u.length>0&&!d}}import{existsSync as cc,mkdirSync as lc,readFileSync as uc,writeFileSync as dc}from"node:fs";import{homedir as pc}from"node:os";import{dirname as gc,join as Ar}from"node:path";function mc(e){return`'${e.replace(/'/g,"'\\''")}'`}function _r(e={}){let t=e.hooksFile??Ar(process.env.CODEX_HOME??Ar(pc(),".codex"),"hooks.json");lc(gc(t),{recursive:!0});let o={};if(cc(t))try{o=JSON.parse(uc(t,"utf8"))}catch(s){throw new Error(`Invalid existing Codex hooks.json: ${s instanceof Error?s.message:String(s)}`)}let r=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=r;let i=(Array.isArray(r.SessionStart)?r.SessionStart:[]).filter(s=>{try{return!JSON.stringify(s).includes("session:codex-context")}catch{return!0}}),a=e.binary??"toolnet-memory";return i.push({matcher:"startup|resume|clear|compact",hooks:[{type:"command",command:`${mc(a)} session:codex-context`,timeout:15,additionalContextLimit:1e3,statusMessage:"Loading ToolNet project continuity"}]}),r.SessionStart=i,dc(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),t}import{existsSync as Nr,mkdirSync as fc,readFileSync as Mr,writeFileSync as yc}from"node:fs";import{homedir as hc}from"node:os";import{dirname as kc,join as Fr}from"node:path";function $r(e){return`'${e.replace(/'/g,"'\\''")}'`}function Dr(e={}){let t=e.hooksFile??Fr(process.env.CODEX_HOME??Fr(hc(),".codex"),"hooks.json");fc(kc(t),{recursive:!0});let o={};if(Nr(t))try{o=JSON.parse(Mr(t,"utf8"))}catch{throw new Error(`Invalid existing Codex hooks.json at ${t}: parse error. Not overwriting.`)}let r=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=r;let n=e.binary??"toolnet-memory",i=`${$r(n)} session:codex-stop-hook`,a=`${$r(n)} session:codex-session-end`,s={hooks:[{type:"command",command:i,timeout:30}]},c={hooks:[{type:"command",command:a,timeout:3}]},u=(Array.isArray(r.Stop)?r.Stop:[]).filter(b=>{try{return!JSON.stringify(b).includes("session:codex-stop-hook")}catch{return!0}}),p=(Array.isArray(r.SessionEnd)?r.SessionEnd:[]).filter(b=>{try{return!JSON.stringify(b).includes("session:codex-session-end")}catch{return!0}});r.Stop=[...u,s],r.SessionEnd=[...p,c];let g=JSON.stringify(o,null,2)+`
`,j=!Nr(t)||Mr(t,"utf8")!==g;return yc(t,g,{encoding:"utf8",mode:384}),{hooksFile:t,changed:j,stopInstalled:!0,sessionEndInstalled:!0}}import{spawnSync as bc}from"node:child_process";function xt(e,t){return bc(e,t,{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}function Hr(e,t){let o=xt(e,["mcp","get",t,"--json"]);if(o.status!==0||!o.stdout)return null;try{return JSON.parse(o.stdout)}catch{return null}}function Lr(e,t){return e.enabled!==!1&&e.transport?.type==="stdio"&&e.transport?.command===t&&Array.isArray(e.transport?.args)&&e.transport?.args.length===1&&e.transport.args[0]==="mcp"}function Kr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.codexBinary??"codex",r=e.serverName??"toolnet-memory",n=Hr(o,r);if(n&&Lr(n,t))return{installed:!0,changed:!1,serverName:r,command:t,args:["mcp"]};if(n){let s=xt(o,["mcp","remove",r]);if(s.status!==0)return{installed:!1,changed:!1,serverName:r,command:t,args:["mcp"],error:(s.stderr||s.stdout||"Unable to remove old ToolNet MCP configuration.").trim()}}let i=xt(o,["mcp","add",r,"--",t,"mcp"]);if(i.status!==0)return{installed:!1,changed:!1,serverName:r,command:t,args:["mcp"],error:(i.stderr||i.stdout||"Unable to register ToolNet MCP.").trim()};let a=Hr(o,r);return!a||!Lr(a,t)?{installed:!1,changed:!0,serverName:r,command:t,args:["mcp"],error:"Codex accepted MCP registration but verification did not match expected ToolNet command."}:{installed:!0,changed:!0,serverName:r,command:t,args:["mcp"]}}import{existsSync as Sc,mkdirSync as Ic,readFileSync as wc,renameSync as vc,rmSync as jc,writeFileSync as xc}from"node:fs";import{dirname as Cc}from"node:path";function ae(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Oc(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function Rc(e){if(!Sc(e))return{};let t;try{t=JSON.parse(wc(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude settings.json: ${o instanceof Error?o.message:String(o)}`)}if(!ae(t))throw new Error("Invalid existing Claude settings.json: root must be a JSON object.");return t}function Le(e){if(e===void 0)return[];if(!Array.isArray(e))throw new Error("Invalid existing Claude settings.json: hook event must be an array.");let t=[];for(let o of e){if(!ae(o)){t.push(o);continue}let r=o.hooks;if(!Array.isArray(r)){t.push(o);continue}let n=r.filter(i=>{if(!ae(i))return!0;let a=i.command;return!(typeof a=="string"&&a.includes("session:claude-hook"))});n.length!==0&&t.push({...o,hooks:n})}return t}function Ke(e,t=10){return{type:"command",command:e,timeout:t}}function Ec(e,t){Ic(Cc(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{xc(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),vc(o,e)}finally{jc(o,{force:!0})}}function Jr(e={}){let t=e.settingsFile??Lo(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=Rc(t),n=r.hooks;if(n!==void 0&&!ae(n))throw new Error("Invalid existing Claude settings.json: hooks must be an object.");let i=ae(n)?{...n}:{},a=`${Oc(o)} session:claude-hook`,s=Le(i.SessionStart);s.push({matcher:"startup|resume|clear|compact",hooks:[Ke(a)]}),i.SessionStart=s;let c=Le(i.UserPromptSubmit);c.push({hooks:[Ke(a)]}),i.UserPromptSubmit=c;let l=Le(i.PostToolUse);l.push({matcher:"Edit|Write",hooks:[Ke(a)]}),i.PostToolUse=l;let u=Le(i.Stop);u.push({hooks:[Ke(a,30)]}),i.Stop=u;let d={...r,hooks:i},p=JSON.stringify(r),g=JSON.stringify(d);return p===g?{settingsFile:t,changed:!1}:e.dryRun===!0?{settingsFile:t,changed:!0,dryRun:!0}:(Ec(t,d),{settingsFile:t,changed:!0})}import{existsSync as Pc,mkdirSync as Tc,readFileSync as Ac,renameSync as _c,rmSync as Nc,writeFileSync as Mc}from"node:fs";import{dirname as Fc}from"node:path";function ce(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Vr(e){if(!Pc(e))return{};let t;try{t=JSON.parse(Ac(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude Code config: ${o instanceof Error?o.message:String(o)}`)}if(!ce(t))throw new Error("Invalid existing Claude Code config: root must be a JSON object.");return t}function Gr(e,t){if(!ce(e))return!1;let o=e.args;return e.type==="stdio"&&e.command===t&&Array.isArray(o)&&o.length===1&&o[0]==="mcp"}function $c(e,t){Tc(Fc(e),{recursive:!0});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Mc(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),_c(o,e)}finally{Nc(o,{force:!0})}}function Br(e={}){let t=e.stateFile??Ko(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=Vr(t),i=n.mcpServers;if(i!==void 0&&!ce(i))throw new Error("Invalid existing Claude Code config: mcpServers must be an object.");let a=ce(i)?{...i}:{},s=a[r];if(Gr(s,o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:[o,"mcp"],repaired:!1};let c=s!==void 0;if(a[r]={type:"stdio",command:o,args:["mcp"]},e.dryRun===!0)return{installed:!0,changed:!0,configFile:t,serverName:r,command:[o,"mcp"],repaired:c,dryRun:!0};$c(t,{...n,mcpServers:a});let u=Vr(t).mcpServers;if(!ce(u)||!Gr(u[r],o))throw new Error("Claude Code MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:[o,"mcp"],repaired:c}}function qr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=Jr({binary:t,settingsFile:e.settingsFile,...e.dryRun!==void 0?{dryRun:e.dryRun}:{}}),r=Br({binary:t,stateFile:e.stateFile,...e.dryRun!==void 0?{dryRun:e.dryRun}:{}});return{hooks:o,mcp:r,files:[o.settingsFile,r.configFile]}}import{existsSync as Dc,mkdirSync as Hc,readFileSync as Lc,renameSync as Kc,rmSync as Jc,writeFileSync as Vc}from"node:fs";import{dirname as Gc}from"node:path";var G="ToolNet Memory - ";function zr(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Bc(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function Ur(e){if(!Dc(e))return{};let t=Lc(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro hooks file at ${e}: parse error. Not overwriting.`)}if(!zr(o))throw new Error(`Invalid existing Kiro hooks file at ${e}: root must be a JSON object. Not overwriting.`);return o}function Yr(e){return zr(e)?typeof e.name=="string"&&e.name.startsWith(G):!1}function le(e){return{type:"command",command:e}}function qc(e){return[{name:`${G}Session Start`,description:"Inject compact local ToolNet continuity and capture Kiro session activation.",trigger:"SessionStart",action:le(e),timeout:10,enabled:!0},{name:`${G}Prompt Continuity`,description:"Capture prompts and refresh ToolNet guidance only for resume/continue requests.",trigger:"UserPromptSubmit",action:le(e),timeout:10,enabled:!0},{name:`${G}Raw History Guard`,description:"Prevent Kiro from reconstructing continuity from raw ToolNet/agent session history.",trigger:"PreToolUse",matcher:"*",action:le(e),timeout:10,enabled:!0},{name:`${G}Tool Capture`,description:"Capture durable tool activity while filtering noisy read-only events.",trigger:"PostToolUse",matcher:"*",action:le(e),timeout:15,enabled:!0},{name:`${G}Final Flush`,description:"Flush pending Kiro WAL events when the assistant finishes a turn.",trigger:"Stop",action:le(e),timeout:30,enabled:!0}]}function Uc(e,t){Hc(Gc(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Vc(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Kc(o,e)}finally{Jc(o,{force:!0})}}function Je(e,t,o){let r=Ur(e);if(r.version!==void 0&&r.version!=="v1")throw new Error(`Unsupported existing Kiro hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!Array.isArray(n))throw new Error("Invalid existing Kiro hooks file: hooks must be an array.");let i=Array.isArray(n)?n.filter(l=>!Yr(l)):[],a=qc(t),s={...r,version:"v1",hooks:[...i,...a]};if(!o&&JSON.stringify(r)===JSON.stringify(s))return{changed:!1,hookCount:a.length};Uc(e,s);let c=Ur(e);if(c.version!=="v1"||!Array.isArray(c.hooks)||c.hooks.filter(Yr).length!==a.length)throw new Error("Kiro hooks were written but verification failed.");return{changed:!0,hookCount:a.length}}function Wr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=`${Bc(t)} session:kiro-hook`;if(e.hooksFile){let a=Je(e.hooksFile,r,e.force??!1);return{hooksFile:e.hooksFile,...a}}if(o==="both"){let a=mt(),s=ft({cwd:e.cwd}),c=Je(a,r,e.force??!1),l=Je(s,r,e.force??!1);return{hooksFile:a,changed:c.changed||l.changed,hookCount:c.hookCount}}let n=o==="project"?ft({cwd:e.cwd}):mt(),i=Je(n,r,e.force??!1);return{hooksFile:n,...i}}import{existsSync as Yc,mkdirSync as zc,readFileSync as Wc,renameSync as Qc,rmSync as Xc,writeFileSync as Zc}from"node:fs";import{dirname as el}from"node:path";function ue(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Qr(e){if(!Yc(e))return{};let t=Wc(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro MCP config at ${e}: parse error. Not overwriting.`)}if(!ue(o))throw new Error(`Invalid existing Kiro MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Xr(e,t){return ue(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&e.disabled===!1:!1}function tl(e,t){zc(el(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Zc(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Qc(o,e)}finally{Xc(o,{force:!0})}}function Ve(e,t,o,r){let n=Qr(e),i=n.mcpServers;if(i!==void 0&&!ue(i))throw new Error(`Invalid existing Kiro MCP config: mcpServers must be an object in ${e}.`);let a=ue(i)?{...i}:{},s=a[o];if(Xr(s,t)&&!r)return{installed:!0,changed:!1};a[o]={command:t,args:["mcp"],disabled:!1};let c={...n,mcpServers:a};tl(e,c);let u=Qr(e).mcpServers;if(!ue(u)||!Xr(u[o],t))throw new Error(`Kiro MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function Zr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...Ve(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(r==="both"){let a=Oe(),s=gt({cwd:e.cwd}),c=Ve(a,t,o,e.force??!1),l=Ve(s,t,o,e.force??!1);return{installed:!0,changed:c.changed||l.changed,configFile:a,serverName:o,command:t,args:["mcp"]}}let n=r==="project"?gt({cwd:e.cwd}):Oe();return{...Ve(n,t,o,e.force??!1),configFile:n,serverName:o,command:t,args:["mcp"]}}function en(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=Zr({binary:t,configFile:e.configFile,scope:e.scope,cwd:e.cwd,force:e.force}),r=Wr({binary:t,hooksFile:e.hooksFile,scope:e.scope,cwd:e.cwd,force:e.force});return{installed:o.installed,changed:o.changed||r.changed,mcp:o,hooks:r,files:[o.configFile,r.hooksFile]}}import{existsSync as ol,mkdirSync as rl,readFileSync as nl,renameSync as il,rmSync as sl,writeFileSync as al}from"node:fs";import{dirname as cl}from"node:path";function Ct(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function ll(e){if(!ol(e))return{};let t=nl(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: parse error. Not overwriting.`)}if(!Ct(o))throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function ul(e,t){rl(cl(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{al(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),il(o,e)}finally{sl(o,{force:!0})}}function tn(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??Go({cwd:e.cwd}),r=ll(o),n="toolnet-memory";if(Ct(r.mcpServers)&&r.mcpServers[n]!=null&&!e.force)return{installed:!0,changed:!1,configFile:o};let a=Ct(r.mcpServers)?{...r.mcpServers}:{};return a[n]={command:t,args:["mcp"]},r.mcpServers=a,ul(o,r),{installed:!0,changed:!0,configFile:o}}function on(e={}){let t=e.binary??"toolnet-memory",o=tn({binary:t,configFile:e.configFile,force:e.force,cwd:e.cwd});return{installed:o.installed,changed:o.changed,mcp:{...o,configured:o.installed},files:[o.configFile]}}import{mkdirSync as kl,existsSync as bl}from"node:fs";import{dirname as Sl}from"node:path";import{existsSync as dl,mkdirSync as pl,readFileSync as gl,renameSync as ml,rmSync as fl,writeFileSync as yl}from"node:fs";import{dirname as hl}from"node:path";function I(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function _(e,t){if(!dl(e))return{};let o=gl(e,"utf8").trim();if(!o)return{};let r;try{r=JSON.parse(o)}catch(n){throw new Error(`Invalid existing ${t} MCP config: ${n instanceof Error?n.message:String(n)}`)}if(!I(r))throw new Error(`Invalid existing ${t} MCP config: root must be a JSON object.`);return r}function B(e,t){pl(hl(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{yl(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),ml(o,e)}finally{fl(o,{force:!0})}}function rn(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??kt(),r=Sl(o);bl(r)||kl(r,{recursive:!0});let n=_(o,"Kilo"),i=n.mcp;if(i!==void 0&&!I(i))throw new Error("Invalid existing Kilo config: mcp must be an object.");let a=I(i)?{...i}:{},s="toolnet-memory";return I(a[s])&&!e.force?{installed:!0,changed:!1,configFile:o,configured:!0}:(a[s]={type:"local",command:[t,"mcp"],enabled:!0,timeout:1e4},B(o,{...n,mcp:a}),{installed:!0,changed:!0,configFile:o,configured:!0})}function nn(e={}){let t=e.binary??"toolnet-memory",o=rn({binary:t,configFile:e.configFile,force:e.force});return{installed:o.installed,changed:o.changed,mcp:o,files:[o.configFile]}}import{existsSync as Il,mkdirSync as wl,readFileSync as vl,renameSync as jl,rmSync as xl,writeFileSync as Cl}from"node:fs";import{dirname as Ol}from"node:path";function k(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function P(e,t){if(!Il(e))return{};let o=vl(e,"utf8").trim();if(!o)return{};let r;try{r=JSON.parse(o)}catch(n){throw new Error(`Invalid existing ${t} hooks file: ${n instanceof Error?n.message:String(n)}`)}if(!k(r))throw new Error(`Invalid existing ${t} hooks file: root must be a JSON object.`);return r}function q(e,t){wl(Ol(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Cl(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),jl(o,e)}finally{xl(o,{force:!0})}}function Ot(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}var de=[["sessionStart",10],["beforeSubmitPrompt",10],["preToolUse",10],["postToolUse",15],["afterAgentResponse",15],["stop",30]];function sn(e){return k(e)&&typeof e.command=="string"&&e.command.includes("session:cursor-hook")}function Rl(e,t,o){let n={type:"command",command:`TOOLNET_HOOK_EVENT=${Ot(e)} ${Ot(t)} session:cursor-hook`,timeout:o};return e==="preToolUse"&&(n.matcher=".*"),n}function Rt(e={}){let t=e.hooksFile??Pe(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=P(t,"Cursor");if(r.version!==void 0&&r.version!==1)throw new Error(`Unsupported existing Cursor hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!k(n))throw new Error("Invalid existing Cursor hooks file: hooks must be an object.");let i=k(n)?{...n}:{};for(let[l,u]of de){let d=i[l];if(d!==void 0&&!Array.isArray(d))throw new Error(`Invalid existing Cursor hooks file: hooks.${l} must be an array.`);let p=Array.isArray(d)?d.filter(g=>!sn(g)):[];i[l]=[...p,Rl(l,o,u)]}let a={...r,version:1,hooks:i};if(JSON.stringify(r)===JSON.stringify(a))return{hooksFile:t,changed:!1,hookCount:de.length};q(t,a);let s=P(t,"Cursor");if(s.version!==1||!k(s.hooks))throw new Error("Cursor hooks were written but verification failed.");let c=0;for(let[l]of de){let u=s.hooks[l];if(!Array.isArray(u))throw new Error("Cursor hooks were written but verification failed.");c+=u.filter(sn).length}if(c!==de.length)throw new Error("Cursor hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:de.length}}function an(e,t){return I(e)?(e.type===void 0||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function Et(e={}){let t=e.configFile??Ee(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=_(t,"Cursor"),i=n.mcpServers;if(i!==void 0&&!I(i))throw new Error("Invalid existing Cursor MCP config: mcpServers must be an object.");let a=I(i)?{...i}:{};if(an(a[r],o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};a[r]={type:"stdio",command:o,args:["mcp"]},B(t,{...n,mcpServers:a});let c=_(t,"Cursor").mcpServers;if(!I(c)||!an(c[r],o))throw new Error("Cursor MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}import{mkdirSync as El,readFileSync as cn,renameSync as Pl,rmSync as Tl,writeFileSync as Al}from"node:fs";import{dirname as _l}from"node:path";var Pt=`---
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
`;function Nl(e,t){El(_l(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Al(o,t,{encoding:"utf8",mode:384}),Pl(o,e)}finally{Tl(o,{force:!0})}}function ln(e){let t=e.ruleFile??Wo(e.projectRoot);try{if(cn(t,"utf8")===Pt)return{ruleFile:t,changed:!1}}catch{}if(Nl(t,Pt),cn(t,"utf8")!==Pt)throw new Error("Cursor ToolNet project rule was written but verification failed.");return{ruleFile:t,changed:!0}}import{spawnSync as Ml}from"node:child_process";import{existsSync as U,statSync as Fl}from"node:fs";import{dirname as $l,join as Dl,parse as Hl,resolve as At}from"node:path";function un(e){let t=At(e);if(!U(t))throw new Error(`Project path does not exist: ${t}`);if(!Fl(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);return t}function Ge(e){return Dl(e,".toolnet","project.json")}function Ll(e){let t=At(e),o=Hl(t).root;for(;;){if(U(Ge(t)))return t;if(t===o)return;let r=$l(t);if(r===t)return;t=r}}function Tt(e){let t=Ml("git",["rev-parse","--show-toplevel"],{cwd:e,encoding:"utf8",timeout:5e3});if(t.status!==0)return;let o=t.stdout.trim();return o?At(o):void 0}function T(e={}){let t=un(e.cwd??process.cwd());if(e.project){let n=un(e.project),i=Ge(n),a=Tt(n);return{root:n,source:"explicit",eligible:!0,toolnetProject:U(i),manifestFile:U(i)?i:void 0,gitRoot:a}}let o=Ll(t);if(o){let n=Ge(o);return{root:o,source:"toolnet",eligible:!0,toolnetProject:!0,manifestFile:n,gitRoot:Tt(o)}}let r=Tt(t);if(r){let n=Ge(r);return{root:r,source:"git",eligible:!0,toolnetProject:U(n),manifestFile:U(n)?n:void 0,gitRoot:r}}return{root:t,source:"cwd",eligible:!1,toolnetProject:!1}}function mn(e,t={}){let o=[],r=e.indexOf("--scope");if(r>=0){let i=e[r+1];if(i!=="global"&&i!=="project"&&i!=="both")throw new Error(`Invalid --scope value: ${String(i)}`);o.push(i)}e.includes("--global")&&o.push("global"),e.includes("--both")&&o.push("both");let n=Array.from(new Set(o));if(n.length>1)throw new Error(`Conflicting integration scopes: ${n.join(", ")}`);return n[0]??t.defaultScope??"global"}function dn(e,t){return{install:e,effective:t}}function A(e,t){return{surface:e,global:dn(t.globalInstall,t.effective==="global"||t.effective==="both"),project:dn(t.projectInstall,t.effective==="project"||t.effective==="both"),effective:t.effective,risk:t.risk??"none",dedupeRequired:t.dedupeRequired??!1,trustRequired:t.trustRequired??t.projectInstall,note:t.note}}function Kl(e){return{mcp:A("mcp",{globalInstall:!0,projectInstall:!1,effective:"global"}),hooks:A("hooks",{globalInstall:!0,projectInstall:!1,effective:"global"}),work:A("work",{globalInstall:e==="grok",projectInstall:!1,effective:e==="grok"?"global":"none",note:e==="grok"?"Grok supports a global ToolNet continuity skill.":"Cursor/Copilot work instructions remain project-scoped."})}}function pn(e){return{mcp:A("mcp",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),hooks:A("hooks",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),work:A("work",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!1,note:e==="cursor"?"Use .cursor/rules/toolnet-memory.mdc.":e==="copilot"?"Use .github/instructions/toolnet-memory.instructions.md.":"Use .grok/skills/toolnet-continuity/SKILL.md."})}}function gn(e){return{mcp:A("mcp",{globalInstall:!0,projectInstall:!0,effective:"project",risk:e==="cursor"?"precedence-unverified":"shadowed-global",trustRequired:!0,note:e==="cursor"?"Project ToolNet MCP is the intended effective definition; native same-name precedence must be E2E certified before release.":"Global remains useful outside the project; same-name project definition wins inside the project."}),hooks:A("hooks",{globalInstall:!0,projectInstall:!0,effective:"both",risk:"additive-duplicate",dedupeRequired:!0,trustRequired:!0,note:"Global and project hook sources can both execute for the same native event."}),work:A("work",{globalInstall:e==="grok",projectInstall:!0,effective:"project",risk:e==="grok"?"shadowed-global":"none",trustRequired:!1,note:e==="cursor"?"Project rule is authoritative.":e==="copilot"?"Project instruction is authoritative.":"Project skill shadows the same-name global skill inside the project."})}}function Y(e){let{agent:t,scope:o,project:r}=e;return(o==="project"||o==="both")&&(!r||!r.eligible)?{agent:t,requestedScope:o,project:r,surfaces:o==="both"?gn(t):pn(t),canInstall:!1,reason:"Project scope requires an explicit project, existing ToolNet project, or Git repository root."}:{agent:t,requestedScope:o,project:r,surfaces:o==="global"?Kl(t):o==="project"?pn(t):gn(t),canInstall:!0}}function fn(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.rule?.changed)}function yn(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:T({project:e.projectRoot}),n=Y({agent:"cursor",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Cursor project integration scope cannot be resolved.");let i,a;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(i={},n.surfaces.mcp.global.install&&(i.mcp=Et({binary:t,configFile:e.configFile??Ee()})),n.surfaces.hooks.global.install&&(i.hooks=Rt({binary:t,hooksFile:e.hooksFile??Pe()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Cursor project integration requires an eligible project root.");a={},n.surfaces.mcp.project.install&&(a.mcp=Et({binary:t,configFile:e.projectConfigFile??Yo(r.root)})),n.surfaces.hooks.project.install&&(a.hooks=Rt({binary:t,hooksFile:e.projectHooksFile??zo(r.root)})),n.surfaces.work.project.install&&(a.rule=ln({projectRoot:r.root,ruleFile:e.projectRuleFile}))}let s=a?.mcp??i?.mcp,c=a?.hooks??i?.hooks;if(!s||!c)throw new Error("Cursor integration did not produce an effective MCP/hooks installation.");let l=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.rule?.ruleFile,a?.mcp?.configFile,a?.hooks?.hooksFile,a?.rule?.ruleFile].filter(u=>typeof u=="string")));return{installed:!0,changed:fn(i)||fn(a),scope:o,plan:n,project:r,global:i,projectScope:a,mcp:s,hooks:c,rule:a?.rule,files:l}}var pe=[["sessionStart",10],["userPromptSubmitted",10],["userPromptTransformed",10],["preToolUse",10],["postToolUse",15],["agentStop",30]];function Jl(e){if(typeof e.command=="string")return e.command;if(typeof e.bash=="string")return e.bash}function hn(e){return k(e)&&Jl(e)?.includes("session:copilot-hook")===!0}function Vl(e,t,o){let r={type:"command",command:`${t} session:copilot-hook`,env:{TOOLNET_HOOK_EVENT:e},timeoutSec:o};return e==="preToolUse"&&(r.matcher=".*"),r}function _t(e={}){let t=e.hooksFile??Ae(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=P(t,"GitHub Copilot CLI");if(r.version!==void 0&&r.version!==1)throw new Error(`Unsupported existing GitHub Copilot CLI hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!k(n))throw new Error("Invalid existing GitHub Copilot CLI hooks file: hooks must be an object.");let i=k(n)?{...n}:{};for(let[l,u]of pe){let d=i[l];if(d!==void 0&&!Array.isArray(d))throw new Error(`Invalid existing GitHub Copilot CLI hooks file: hooks.${l} must be an array.`);let p=Array.isArray(d)?d.filter(g=>!hn(g)):[];i[l]=[...p,Vl(l,o,u)]}let a={...r,version:1,hooks:i};if(JSON.stringify(r)===JSON.stringify(a))return{hooksFile:t,changed:!1,hookCount:pe.length};q(t,a);let s=P(t,"GitHub Copilot CLI");if(s.version!==1||!k(s.hooks))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");let c=0;for(let[l]of pe){let u=s.hooks[l];if(!Array.isArray(u))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");c+=u.filter(hn).length}if(c!==pe.length)throw new Error("GitHub Copilot CLI hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:pe.length}}function kn(e,t){return I(e)?(e.type===void 0||e.type==="local"||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&Array.isArray(e.tools)&&e.tools.length===1&&e.tools[0]==="*":!1}function Nt(e={}){let t=e.configFile??Te(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=_(t,"GitHub Copilot CLI"),i=n.mcpServers;if(i!==void 0&&!I(i))throw new Error("Invalid existing GitHub Copilot CLI MCP config: mcpServers must be an object.");let a=I(i)?{...i}:{};if(kn(a[r],o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};a[r]={type:"stdio",command:o,args:["mcp"],tools:["*"]},B(t,{...n,mcpServers:a});let c=_(t,"GitHub Copilot CLI").mcpServers;if(!I(c)||!kn(c[r],o))throw new Error("GitHub Copilot CLI MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}import{mkdirSync as Gl,readFileSync as bn,renameSync as Bl,rmSync as ql,writeFileSync as Ul}from"node:fs";import{dirname as Yl}from"node:path";var Mt=`---
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
`;function zl(e,t){Gl(Yl(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Ul(o,t,{encoding:"utf8",mode:384}),Bl(o,e)}finally{ql(o,{force:!0})}}function Sn(e){let t=e.instructionFile??er(e.projectRoot);try{if(bn(t,"utf8")===Mt)return{instructionFile:t,changed:!1}}catch{}if(zl(t,Mt),bn(t,"utf8")!==Mt)throw new Error("Copilot ToolNet project instruction verification failed.");return{instructionFile:t,changed:!0}}function In(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.instruction?.changed)}function wn(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:T({project:e.projectRoot}),n=Y({agent:"copilot",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Copilot project integration scope cannot be resolved.");let i,a;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(i={},n.surfaces.mcp.global.install&&(i.mcp=Nt({binary:t,configFile:e.configFile??Te()})),n.surfaces.hooks.global.install&&(i.hooks=_t({binary:t,hooksFile:e.hooksFile??Ae()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Copilot project integration requires an eligible project root.");a={},n.surfaces.mcp.project.install&&(a.mcp=Nt({binary:t,configFile:e.projectConfigFile??Xo(r.root)})),n.surfaces.hooks.project.install&&(a.hooks=_t({binary:t,hooksFile:e.projectHooksFile??Zo(r.root)})),n.surfaces.work.project.install&&(a.instruction=Sn({projectRoot:r.root,instructionFile:e.projectInstructionFile}))}let s=a?.mcp??i?.mcp,c=a?.hooks??i?.hooks;if(!s||!c)throw new Error("Copilot integration did not produce effective MCP/hooks.");let l=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.instruction?.instructionFile,a?.mcp?.configFile,a?.hooks?.hooksFile,a?.instruction?.instructionFile].filter(u=>typeof u=="string")));return{installed:!0,changed:In(i)||In(a),scope:o,plan:n,project:r,global:i,projectScope:a,mcp:s,hooks:c,instruction:a?.instruction,files:l}}import{existsSync as Wl,mkdirSync as Ql,readFileSync as vn,renameSync as Xl,rmSync as Zl,writeFileSync as eu}from"node:fs";import{dirname as tu}from"node:path";var Ft=`---
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
`;function ou(e,t){Ql(tu(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{eu(o,t,{encoding:"utf8",mode:384}),Xl(o,e)}finally{Zl(o,{force:!0})}}function $t(e={}){let t=e.skillFile??Fe();if(Wl(t)&&vn(t,"utf8")===Ft)return{skillFile:t,changed:!1};if(ou(t,Ft),vn(t,"utf8")!==Ft)throw new Error("Grok ToolNet continuity skill was written but verification failed.");return{skillFile:t,changed:!0}}var ge=[["SessionStart",10],["UserPromptSubmit",10],["PreToolUse",10],["PostToolUse",15],["Stop",30]];function jn(e){return!k(e)||!Array.isArray(e.hooks)?!1:e.hooks.some(t=>k(t)&&typeof t.command=="string"&&t.command.includes("session:grok-hook"))}function ru(e,t,o){let r={hooks:[{type:"command",command:`${t} session:grok-hook`,timeout:o,env:{TOOLNET_HOOK_EVENT:e}}]};return e==="PreToolUse"&&(r.matcher=".*"),r}function Dt(e={}){let t=e.hooksFile??Me(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=P(t,"Grok Build"),n=r.hooks;if(n!==void 0&&!k(n))throw new Error("Invalid existing Grok Build hooks file: hooks must be an object.");let i=k(n)?{...n}:{};for(let[l,u]of ge){let d=i[l];if(d!==void 0&&!Array.isArray(d))throw new Error(`Invalid existing Grok Build hooks file: hooks.${l} must be an array.`);let p=Array.isArray(d)?d.filter(g=>!jn(g)):[];i[l]=[...p,ru(l,o,u)]}let a={...r,hooks:i};if(JSON.stringify(r)===JSON.stringify(a))return{hooksFile:t,changed:!1,hookCount:ge.length};q(t,a);let s=P(t,"Grok Build");if(!k(s.hooks))throw new Error("Grok Build hooks were written but verification failed.");let c=0;for(let[l]of ge){let u=s.hooks[l];if(!Array.isArray(u))throw new Error("Grok Build hooks were written but verification failed.");c+=u.filter(jn).length}if(c!==ge.length)throw new Error("Grok Build hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:ge.length}}import{existsSync as nu,mkdirSync as iu,readFileSync as su,renameSync as au,rmSync as cu,writeFileSync as lu}from"node:fs";import{dirname as uu}from"node:path";function xn(e){return nu(e)?su(e,"utf8"):""}function du(e,t){iu(uu(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{lu(o,t,{encoding:"utf8",mode:384}),au(o,e)}finally{cu(o,{force:!0})}}function Ht(e){return e.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t")}function pu(e){return`[mcp_servers."${Ht(e)}"]`}function gu(e,t){return[pu(e),`command = "${Ht(t)}"`,'args = ["mcp"]',"enabled = true"].join(`
`)}function mu(e){let t=e.trim();return t.startsWith("[")&&t.includes("]")}function Be(e){return e.trim().replace(/\s+/g,"")}function fu(e){return new Set([Be(`[mcp_servers.${e}]`),Be(`[mcp_servers."${e}"]`),Be(`[mcp_servers.'${e}']`)])}function On(e,t){let o=e.split(/\r?\n/),r=fu(t),n=-1;for(let u=0;u<o.length;u+=1){let d=Be(o[u].replace(/\s+#.*$/,""));if(r.has(d)){n=u;break}}if(n<0)return null;let i=o.length;for(let u=n+1;u<o.length;u+=1)if(mu(o[u])){i=u;break}let a=[],s=0;for(let u of o)a.push(s),s+=u.length+1;let c=a[n]??0,l=i>=o.length?e.length:a[i]??e.length;return{start:c,end:l}}function yu(e,t,o){let r=`${gu(t,o)}
`,n=On(e,t);if(n){let i=e.slice(0,n.start),a=e.slice(n.end);return`${i}${r}${a.replace(/^\n+/,"")}`}return e.trim()?`${e.replace(/\s*$/,"")}

${r}`:r}function Cn(e,t,o){let r=On(e,t);if(!r)return!1;let n=e.slice(r.start,r.end);return n.includes(`command = "${Ht(o)}"`)&&/args\s*=\s*\[\s*"mcp"\s*\]/.test(n)&&/enabled\s*=\s*true/.test(n)}function Lt(e={}){let t=e.configFile??Ne(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=xn(t);if(Cn(n,r,o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};let i=yu(n,r,o);du(t,i);let a=xn(t);if(!Cn(a,r,o))throw new Error("Grok Build MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}function Rn(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.skill?.changed)}function En(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:T({project:e.projectRoot}),n=Y({agent:"grok",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Grok project integration scope cannot be resolved.");let i,a;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(i={},n.surfaces.mcp.global.install&&(i.mcp=Lt({binary:t,configFile:e.configFile??Ne()})),n.surfaces.hooks.global.install&&(i.hooks=Dt({binary:t,hooksFile:e.hooksFile??Me()})),n.surfaces.work.global.install&&(i.skill=$t({skillFile:e.skillFile??Fe()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Grok project integration requires an eligible project root.");a={},n.surfaces.mcp.project.install&&(a.mcp=Lt({binary:t,configFile:e.projectConfigFile??or(r.root)})),n.surfaces.hooks.project.install&&(a.hooks=Dt({binary:t,hooksFile:e.projectHooksFile??rr(r.root)})),n.surfaces.work.project.install&&(a.skill=$t({skillFile:e.projectSkillFile??nr(r.root)}))}let s=a?.mcp??i?.mcp,c=a?.hooks??i?.hooks,l=a?.skill??i?.skill;if(!s||!c||!l)throw new Error("Grok integration did not produce effective MCP/hooks/skill.");let u=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.skill?.skillFile,a?.mcp?.configFile,a?.hooks?.hooksFile,a?.skill?.skillFile].filter(d=>typeof d=="string")));return{installed:!0,changed:Rn(i)||Rn(a),scope:o,plan:n,project:r,global:i,projectScope:a,mcp:s,hooks:c,skill:l,files:u}}import{existsSync as _n,mkdirSync as uk,readFileSync as Nn,renameSync as dk,rmSync as pk,writeFileSync as bu}from"node:fs";import{homedir as hu}from"node:os";import{join as Pn}from"node:path";function ku(e="toolnet-memory",t={}){return Pn(t.home??hu(),".agents","plugins",e)}function Tn(e="toolnet-memory",t={}){return Pn(ku(e,t),"hooks","hooks.json")}function An(e){return`'${e.replace(/'/g,"'\\''")}'`}function Su(e){if(!_n(e))return{};let t;try{t=JSON.parse(Nn(e,"utf8"))}catch{throw new Error(`Invalid existing Goose hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Goose hooks.json at ${e}: root must be a JSON object.`);return t}function Mn(e={}){let t=e.pluginName??"toolnet-memory",o=e.hooksFile??Tn(t),r=Su(o),n=e.binary??"toolnet-memory",i=`${An(n)} session:goose-hook`,a=`${An(n)} session:goose-hook`,s={type:"command",command:i,timeout:30},c={type:"command",command:a,timeout:3},l=r.hooks&&typeof r.hooks=="object"&&!Array.isArray(r.hooks)?r.hooks:{};r.hooks=l;let d=(Array.isArray(l.Stop)?l.Stop:[]).filter(Ye=>{try{return!JSON.stringify(Ye).includes("session:goose-hook")}catch{return!0}}),g=(Array.isArray(l.SessionEnd)?l.SessionEnd:[]).filter(Ye=>{try{return!JSON.stringify(Ye).includes("session:goose-hook")}catch{return!0}});l.Stop=[...d,{hooks:[s]}],l.SessionEnd=[...g,{hooks:[c]}];let j=JSON.stringify(r,null,2)+`
`,b=!_n(o)||Nn(o,"utf8")!==j;return bu(o,j,{encoding:"utf8",mode:384}),{hooksFile:o,changed:b,stopInstalled:!0,sessionEndInstalled:!0}}function Fn(e={}){let t=Mn(e);return{hooksFile:t.hooksFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as Ln,mkdirSync as wu,readFileSync as Kn,renameSync as vu,rmSync as ju,writeFileSync as xu}from"node:fs";import{dirname as Cu}from"node:path";import{homedir as Iu}from"node:os";import{join as $n}from"node:path";function Dn(e={}){let t=e.projectRoot;return t?$n(t,".qwen","hooks.json"):$n(e.home??Iu(),".qwen","hooks.json")}function Hn(e){return`'${e.replace(/'/g,"'\\''")}'`}function Ou(e){if(!Ln(e))return{};let t;try{t=JSON.parse(Kn(e,"utf8"))}catch{throw new Error(`Invalid existing Qwen hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Qwen hooks.json at ${e}: root must be a JSON object.`);return t}function Ru(e,t){wu(Cu(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{xu(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),vu(o,e)}finally{ju(o,{force:!0})}}function Jn(e={}){let t=e.hooksFile??Dn({projectRoot:e.projectRoot}),o=Ou(t),r=e.binary??"toolnet-memory",n=`${Hn(r)} session:qwen-hook`,i=`${Hn(r)} session:qwen-hook`,a={type:"command",command:n,timeout:30},s={type:"command",command:i,timeout:3},c=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=c;let u=(Array.isArray(c.Stop)?c.Stop:[]).filter(b=>{try{return!JSON.stringify(b).includes("session:qwen-hook")}catch{return!0}}),p=(Array.isArray(c.SessionEnd)?c.SessionEnd:[]).filter(b=>{try{return!JSON.stringify(b).includes("session:qwen-hook")}catch{return!0}});c.Stop=[...u,{hooks:[a]}],c.SessionEnd=[...p,{hooks:[s]}];let g=JSON.stringify(o,null,2)+`
`,j=!Ln(t)||Kn(t,"utf8")!==g;return Ru(t,o),{hooksFile:t,changed:j,stopInstalled:!0,sessionEndInstalled:!0}}function Vn(e={}){let t=Jn(e);return{hooksFile:t.hooksFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as Un,mkdirSync as Tu,readFileSync as Au,renameSync as _u,rmSync as Nu,writeFileSync as Mu}from"node:fs";import{dirname as Fu}from"node:path";import{homedir as Eu}from"node:os";import{join as Pu}from"node:path";function Gn(e={}){return Pu(e.home??Eu(),".kimi-code","config.toml")}function Bn(e){return`'${e.replace(/'/g,"'\\''")}'`}function $u(e){return Un(e)?Au(e,"utf8"):""}function qn(e,t){Tu(Fu(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Mu(o,t,{encoding:"utf8",mode:384}),_u(o,e)}finally{Nu(o,{force:!0})}}function Yn(e={}){let t=e.configFile??Gn(),o=$u(t),r=e.binary??"toolnet-memory",n=`${Bn(r)} session:kimi-hook`,i=`${Bn(r)} session:kimi-hook`,a=`[[hooks]]
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
`,c=!0),c?qn(t,o):Un(t)||(qn(t,a+`
`+s+`
`),c=!0),{configFile:t,changed:c,stopInstalled:!0,sessionEndInstalled:!0}}function zn(e={}){let t=Yn(e);return{configFile:t.configFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as Qn,mkdirSync as Lu,readFileSync as Ku,renameSync as Ju,rmSync as Vu,writeFileSync as Gu}from"node:fs";import{dirname as Bu}from"node:path";import{homedir as Du}from"node:os";import{join as Hu}from"node:path";function Wn(e={}){return Hu(e.home??Du(),".hermes","config.yaml")}function qu(e){return`'${e.replace(/'/g,"'\\''")}'`}function Uu(e){return Qn(e)?Ku(e,"utf8"):""}function Yu(e,t){Lu(Bu(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Gu(o,t,{encoding:"utf8",mode:384}),Ju(o,e)}finally{Vu(o,{force:!0})}}function Xn(e={}){let t=e.configFile??Wn(),o=Uu(t),r=e.binary??"toolnet-memory",i=`  - name: toolnet-memory-session-end
    event: on_session_end
    command: ${`${qu(r)} session:hermes-hook`}
    timeout: 30
`,a=!1;return o.includes("toolnet-memory-session-end")||(o.includes("hooks:")?o=o.replace(/hooks:\n/,`hooks:
${i}`):o=o.trim()+`

hooks:
`+i,a=!0),(a||!Qn(t))&&(o.endsWith(`
`)||(o+=`
`),Yu(t,o)),{configFile:t,changed:a,sessionEndInstalled:!0}}function Zn(e={}){let t=Xn(e);return{configFile:t.configFile,changed:t.changed,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as oi,mkdirSync as Qu,readFileSync as ri,renameSync as Xu,rmSync as Zu,writeFileSync as ed}from"node:fs";import{dirname as td}from"node:path";import{existsSync as zu}from"node:fs";import{homedir as Wu}from"node:os";import{join as Kt}from"node:path";function ei(e={}){let t=e.home??Wu();return zu(Kt(t,".qoder-cn"))?Kt(t,".qoder-cn","settings.json"):Kt(t,".qoder","settings.json")}function ti(e){return`'${e.replace(/'/g,"'\\''")}'`}function od(e){if(!oi(e))return{};let t;try{t=JSON.parse(ri(e,"utf8"))}catch{throw new Error(`Invalid existing Qoder settings.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Qoder settings.json at ${e}: root must be a JSON object.`);return t}function rd(e,t){Qu(td(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{ed(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Xu(o,e)}finally{Zu(o,{force:!0})}}function ni(e={}){let t=e.settingsFile??ei(),o=od(t),r=e.binary??"toolnet-memory",n=`${ti(r)} session:qoder-hook`,i=`${ti(r)} session:qoder-hook`,a={type:"command",command:n,timeout:30},s={type:"command",command:i,timeout:3},c=Array.isArray(o.hooks)?[...o.hooks]:[],u=c.filter(g=>{try{return!JSON.stringify(g).includes("session:qoder-hook")}catch{return!0}}).filter(g=>{try{return!JSON.stringify(g).includes("session:qoder-hook")}catch{return!0}});c.length=0,c.push({...a,event:"Stop"},{...s,event:"SessionEnd"}),o.hooks=c;let d=JSON.stringify(o,null,2)+`
`,p=!oi(t)||ri(t,"utf8")!==d;return rd(t,o),{settingsFile:t,changed:p,stopInstalled:!0,sessionEndInstalled:!0}}function ii(e={}){let t=ni(e);return{settingsFile:t.settingsFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as nd,mkdirSync as si,readFileSync as id,renameSync as sd,rmSync as ad,writeFileSync as cd}from"node:fs";import{dirname as ld,join as qe}from"node:path";import{homedir as ud}from"node:os";function dd(e,t){si(ld(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{cd(o,t,{encoding:"utf8",mode:493}),sd(o,e)}finally{ad(o,{force:!0})}}var Jt=`#!/usr/bin/env node
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
`;function ai(e={}){let t=e.cwd?qe(e.cwd,".toolnet","bin"):qe(process.env.TOOLNET_HOME??qe(ud(),".toolnet"),"bin");si(t,{recursive:!0,mode:448});let o=qe(t,"aider-wrapper"),r=Jt.endsWith(`
`)?Jt:Jt+`
`,n=!nd(o)||id(o,"utf8")!==r;return dd(o,r),{launcherPath:o,changed:n}}import{existsSync as ci,mkdirSync as pd,readFileSync as li,renameSync as gd,rmSync as md,writeFileSync as fd}from"node:fs";import{dirname as yd,join as ui}from"node:path";import{homedir as hd}from"node:os";function kd(){return process.env.PLANDEX_BASE_DIR??ui(hd(),"plandex-server")}function bd(e){if(!ci(e))return{};let t;try{t=JSON.parse(li(e,"utf8"))}catch{throw new Error(`Invalid existing Plandex config at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Plandex config at ${e}: root must be a JSON object.`);return t}function Sd(e,t){pd(yd(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{fd(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),gd(o,e)}finally{md(o,{force:!0})}}function di(e={}){let t=kd(),o=ui(t,"toolnet-memory.json"),r=bd(o),n=r.toolnetMemory??{};n.integration="toolnet-memory",n.captureMode="manual-recovery",n.managedBy="toolnet-memory",r.toolnetMemory=n;let i=JSON.stringify(r,null,2)+`
`,a=!ci(o)||li(o,"utf8")!==i;return Sd(o,r),{configPath:o,changed:a}}import{existsSync as pi,mkdirSync as gi,readFileSync as mi,renameSync as Id,rmSync as wd,writeFileSync as vd}from"node:fs";import{dirname as fi,join as jd}from"node:path";import{homedir as xd}from"node:os";function Cd(e){if(!pi(e))return{};let t;try{t=JSON.parse(mi(e,"utf8"))}catch{throw new Error(`Invalid existing OpenRouter config at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing OpenRouter config at ${e}: root must be a JSON object.`);return t}function Od(e,t){gi(fi(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{vd(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Id(o,e)}finally{wd(o,{force:!0})}}function yi(e={}){let t=xd(),o=jd(t,".config","openrouter","toolnet-memory.json");gi(fi(o),{recursive:!0,mode:448});let r=Cd(o);r.toolnetMemory={integration:"toolnet-memory",captureMode:"blocked-product-identity",managedBy:"toolnet-memory",blocked:!0,reason:"OpenRouter CLI product identity is blocked for ToolNet integration."};let n=JSON.stringify(r,null,2)+`
`,i=!pi(o)||mi(o,"utf8")!==n;return Od(o,r),{configPath:o,blocked:!0,changed:i}}import{existsSync as Ii,mkdirSync as Ed,readFileSync as wi,renameSync as Pd,rmSync as Td,writeFileSync as Ad}from"node:fs";import{dirname as _d}from"node:path";import{homedir as Rd}from"node:os";import{join as hi}from"node:path";function ki(e={}){return hi(e.home??Rd(),".bob","settings","settings.json")}function bi(e){return hi(e,".bob","settings.json")}function Nd(e){if(!Ii(e))return{};let t;try{t=JSON.parse(wi(e,"utf8"))}catch{throw new Error(`Invalid existing Bob settings.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Bob settings.json at ${e}: root must be a JSON object.`);return t}function Md(e,t){Ed(_d(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Ad(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Pd(o,e)}finally{Td(o,{force:!0})}}function Si(e){return`'${e.replace(/'/g,"'\\''")}'`}function vi(e={}){let t=e.projectRoot!==void 0?bi(e.projectRoot):ki({home:e.home}),o=Nd(t),r=e.binary??"toolnet-memory",n=`${Si(r)} hook ibm-bob`,i=`${Si(r)} hook ibm-bob`,a={type:"command",command:n,timeout:10},s={type:"command",command:i,timeout:10},c=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=c;let u=(Array.isArray(c.Stop)?c.Stop:[]).filter(b=>{try{return!JSON.stringify(b).includes("hook ibm-bob")}catch{return!0}}),p=(Array.isArray(c.SessionStart)?c.SessionStart:[]).filter(b=>{try{return!JSON.stringify(b).includes("hook ibm-bob")}catch{return!0}});c.Stop=[...u,{hooks:[a]}],c.SessionStart=[...p,{hooks:[s]}];let g=JSON.stringify(o,null,2)+`
`,j=!Ii(t)||wi(t,"utf8")!==g;return Md(t,o),{settingsFile:t,changed:j,stopInstalled:!0,sessionStartInstalled:!0}}function ji(e={}){let t=vi(e);return{settingsFile:t.settingsFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionStartInstalled:t.sessionStartInstalled}}function xi(e={}){if(e.scope==="global")return{scope:"global",automatic:!1,reason:"explicit-global"};if(e.scope==="project"||e.scope==="both"){let o=T({cwd:e.cwd,project:e.projectRoot});if(!o.eligible)throw new Error(`Explicit ${e.scope} integration requires an explicit project, ToolNet project, or Git repository root.`);return{scope:e.scope,automatic:!1,project:o,reason:e.scope==="project"?"explicit-project":"explicit-both"}}let t=T({cwd:e.cwd,project:e.projectRoot});return t.toolnetProject?{scope:"both",automatic:!0,project:t,reason:"toolnet-project"}:{scope:"global",automatic:!0,reason:"no-toolnet-project"}}function Ci(){return cr()}function Vt(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[],r=e.detections??Ci(),n=new Map(r.map(a=>[a.agent,a.detected])),i=xi({scope:e.scope,projectRoot:e.projectRoot,cwd:e.cwd});if(!(e.force===!0||n.get("agy")===!0))o.push({agent:"agy",detected:!1,installed:!1,targets:[]});else try{let s=fr({binary:t});o.push({agent:"agy",detected:!0,installed:!0,targets:s.files})}catch(s){o.push({agent:"agy",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("opencode")===!0))o.push({agent:"opencode",detected:!1,installed:!1,targets:[]});else try{let s=Ir({binary:t}),c=Cr({binary:t});o.push({agent:"opencode",detected:!0,installed:!0,targets:[...s,c.configFile,`mcp:${c.serverName}`]})}catch(s){o.push({agent:"opencode",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("claude")===!0))o.push({agent:"claude",detected:!1,installed:!1,targets:[]});else try{let s=qr({binary:t});o.push({agent:"claude",detected:!0,installed:!0,targets:[s.hooks.settingsFile,s.mcp.configFile,`mcp:${s.mcp.serverName}`]})}catch(s){o.push({agent:"claude",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("kiro")===!0))o.push({agent:"kiro",detected:!1,installed:!1,targets:[]});else try{let s=en({...e.kiro??{},binary:t});o.push({agent:"kiro",detected:!0,installed:!0,targets:[s.mcp.configFile,`mcp:${s.mcp.serverName}`,s.hooks.hooksFile]})}catch(s){o.push({agent:"kiro",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("cursor")===!0))o.push({agent:"cursor",detected:!1,installed:!1,targets:[]});else try{let s=e.cursor??{},c=yn({...s,binary:t,scope:s.scope??i.scope,projectRoot:s.projectRoot??i.project?.root});o.push({agent:"cursor",detected:!0,installed:!0,scope:c.scope,projectRoot:c.project?.root,targets:[...c.files,`mcp:${c.mcp.serverName}`]})}catch(s){o.push({agent:"cursor",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("copilot")===!0))o.push({agent:"copilot",detected:!1,installed:!1,targets:[]});else try{let s=e.copilot??{},c=wn({...s,binary:t,scope:s.scope??i.scope,projectRoot:s.projectRoot??i.project?.root});o.push({agent:"copilot",detected:!0,installed:!0,scope:c.scope,projectRoot:c.project?.root,targets:[...c.files,`mcp:${c.mcp.serverName}`]})}catch(s){o.push({agent:"copilot",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("grok")===!0))o.push({agent:"grok",detected:!1,installed:!1,targets:[]});else try{let s=e.grok??{},c=En({...s,binary:t,scope:s.scope??i.scope,projectRoot:s.projectRoot??i.project?.root});o.push({agent:"grok",detected:!0,installed:!0,scope:c.scope,projectRoot:c.project?.root,targets:[...c.files,`mcp:${c.mcp.serverName}`]})}catch(s){o.push({agent:"grok",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("toolnet-cli")===!0))o.push({agent:"toolnet-cli",detected:!1,installed:!1,targets:[]});else try{let s=e.toolnetCli??{},c=on({...s,binary:t});o.push({agent:"toolnet-cli",detected:!0,installed:!0,targets:[c.mcp.configFile]})}catch(s){o.push({agent:"toolnet-cli",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("kilo")===!0))o.push({agent:"kilo",detected:!1,installed:!1,targets:[]});else try{let s=e.kilo??{},c=nn({...s,binary:t});o.push({agent:"kilo",detected:!0,installed:!0,targets:[c.mcp.configFile]})}catch(s){o.push({agent:"kilo",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("codex")===!0))o.push({agent:"codex",detected:!1,installed:!1,targets:[]});else try{let s=Tr({binary:t}),c=_r({binary:t}),l=Dr({binary:t}),u=Kr({binary:t});if(!u.installed)throw new Error(u.error??"Codex MCP registration failed");let d=[s.configFile,c,l.hooksFile,`mcp:${u.serverName}`];s.preservedPrevious&&d.push(s.previousFile),o.push({agent:"codex",detected:!0,installed:!0,targets:d})}catch(s){o.push({agent:"codex",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("goose")===!0))o.push({agent:"goose",detected:!1,installed:!1,targets:[]});else try{let s=e.goose??{},c=Fn({...s,binary:t});o.push({agent:"goose",detected:!0,installed:!0,targets:[c.hooksFile]})}catch(s){o.push({agent:"goose",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("qwen")===!0))o.push({agent:"qwen",detected:!1,installed:!1,targets:[]});else try{let s=e.qwen??{},c=Vn({...s,binary:t});o.push({agent:"qwen",detected:!0,installed:!0,targets:[c.hooksFile]})}catch(s){o.push({agent:"qwen",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("kimi")===!0))o.push({agent:"kimi",detected:!1,installed:!1,targets:[]});else try{let s=e.kimi??{},c=zn({...s,binary:t});o.push({agent:"kimi",detected:!0,installed:!0,targets:[c.configFile]})}catch(s){o.push({agent:"kimi",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("hermes")===!0))o.push({agent:"hermes",detected:!1,installed:!1,targets:[]});else try{let s=e.hermes??{},c=Zn({...s,binary:t});o.push({agent:"hermes",detected:!0,installed:!0,targets:[c.configFile]})}catch(s){o.push({agent:"hermes",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("qoder")===!0))o.push({agent:"qoder",detected:!1,installed:!1,targets:[]});else try{let s=e.qoder??{},c=ii({...s,binary:t});o.push({agent:"qoder",detected:!0,installed:!0,targets:[c.settingsFile]})}catch(s){o.push({agent:"qoder",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("aider")===!0))o.push({agent:"aider",detected:!1,installed:!1,targets:[]});else try{let s=e.aider??{},c=ai({...s,binary:t});o.push({agent:"aider",detected:!0,installed:!0,targets:[c.launcherPath]})}catch(s){o.push({agent:"aider",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("plandex")===!0))o.push({agent:"plandex",detected:!1,installed:!1,targets:[]});else try{let s=e.plandex??{},c=di({...s,binary:t});o.push({agent:"plandex",detected:!0,installed:!0,targets:[c.configPath]})}catch(s){o.push({agent:"plandex",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("openrouter")===!0))o.push({agent:"openrouter",detected:!1,installed:!1,targets:[]});else try{let s=e.openrouter??{},c=yi({...s,binary:t});o.push({agent:"openrouter",detected:!0,installed:!0,targets:[c.configPath]})}catch(s){o.push({agent:"openrouter",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}if(!(e.force===!0||n.get("bob")===!0))o.push({agent:"bob",detected:!1,installed:!1,targets:[]});else try{let s=e.bob??{},c=ji({...s,binary:t});o.push({agent:"bob",detected:!0,installed:!0,targets:[c.settingsFile]})}catch(s){o.push({agent:"bob",detected:!0,installed:!1,targets:[],error:s instanceof Error?s.message:String(s)})}return o}function Ue(e){switch(e){case"agy":return"Agy / Antigravity";case"opencode":return"OpenCode";case"claude":return"Claude Code";case"kiro":return"Kiro CLI";case"cursor":return"Cursor CLI";case"copilot":return"GitHub Copilot CLI";case"grok":return"Grok Build";case"toolnet-cli":return"ToolNet CLI";case"kilo":return"Kilo";case"codex":return"Codex";case"goose":return"goose";case"qwen":return"Qwen Code";case"kimi":return"Kimi Code CLI";case"hermes":return"Hermes Agent";case"qoder":return"Qoder CLI";case"aider":return"Aider";case"plandex":return"Plandex";case"openrouter":return"OpenRouter CLI";case"bob":return"IBM Bob Shell";default:return e}}function Fd(e){console.log(""),console.log("ToolNet Memory Integration Detection"),console.log("===================================="),console.log("");for(let t of e){let o=Ue(t.agent);if(!t.detected){console.log(`\u25CB ${o}: not detected`);continue}console.log(`\u2713 ${o}: detected`);for(let r of t.evidence)console.log(`  ${r}`)}console.log("")}var $d=["claude","cursor","copilot","grok","kiro","opencode","codex","agy"],Dd={opencode:"toolnet-memory session:opencode-sync",codex:"toolnet-memory session:codex-sync",agy:"toolnet-memory session:agy-sync","toolnet-cli":"toolnet-memory session:toolnet-cli-sync"};function Hd(e){if($d.includes(e))return"ToolNet integration configured; hooks installed successfully";let t=Dd[e];return t?`ToolNet integration configured; run ${t} to capture session history`:"ToolNet integration configured; capture begins when a supported hook or sync runs"}function Ld(e){console.log(""),console.log("ToolNet Memory AI Integrations"),console.log("=============================="),console.log("");for(let t of e){let o=Ue(t.agent);if(!t.detected){console.log(`- ${o}: not detected`);continue}if(t.installed){let r=t.scope?` [scope=${t.scope}]`:"";console.log(`\u2713 ${o}: ${Hd(t.agent)}${r}`),t.projectRoot&&console.log(`  project: ${t.projectRoot}`);continue}console.log(`\u2717 ${o}: integration failed`),t.error&&console.log(`  ${t.error}`)}console.log("")}function Kd(e,t){let o=e.indexOf(t);return o>=0?e[o+1]:void 0}function Jd(e){return e.includes("--scope")||e.includes("--global")||e.includes("--both")?mn(e):void 0}async function Vd(){let e=process.argv.slice(2),t=e.includes("--all"),o=e.includes("--json"),r=e.includes("--detect-only"),n=Jd(e),i=Kd(e,"--project");if(r){let s=Ci();if(o){console.log(JSON.stringify(s,null,2));return}Fd(s);return}let a=Vt({force:t,scope:n,projectRoot:i});if(o){console.log(JSON.stringify(a,null,2));return}Ld(a)}var Gd=process.argv[1]&&(process.argv[1].endsWith("auto-integrate.js")||process.argv[1].endsWith("auto-integrate.ts"));Gd&&Vd().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});function Ei(e){let t=qd(e);if(!Gt(t))throw new Error(`Project path does not exist: ${t}`);if(!Bd(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);return t}function cS(e=process.cwd()){let t=Ei(e),o=new L().detect(t),r=Ri(o.rootPath,".toolnet","project.json");if(!Gt(r))throw new Error(`ToolNet project initialization failed: ${r} was not created`);return{initialized:!0,project:{id:o.id,name:o.name,remote:o.remote,rootPath:o.rootPath},manifestFile:r}}async function Ud(e=process.cwd(),t={}){let o=Ei(e),r={skipRemoteIdentity:t.skipRemoteIdentity,adoptRemote:t.adoptRemote,allowGitRebind:t.allowGitRebind},n=await To(o,r),i=n.project,a=Ri(i.rootPath,".toolnet","project.json");if(!Gt(a))throw new Error(`ToolNet project initialization failed: ${a} was not created`);return{initialized:!0,project:{id:i.id,name:i.name,remote:i.remote,rootPath:i.rootPath},manifestFile:a,identity:{source:n.source,registry:n.registry,registryProvider:n.registryProvider,gitRemote:n.gitIdentity?.canonicalRemote,fingerprint:n.gitIdentity?.fingerprint}}}function Oi(e,t){let o=e.indexOf(t);if(o<0)return;let r=e[o+1];if(!(!r||r.startsWith("-")))return r}async function Yd(){let e=process.argv.slice(2),t=e.includes("--json"),o=!e.includes("--no-integrate"),r=e.includes("--no-remote-identity"),n=e.includes("--rebind-git-identity"),i=Oi(e,"--adopt-remote"),a=Oi(e,"--project"),s=new Set(["--project","--adopt-remote"]),c=e.find((p,g)=>{if(p.startsWith("-"))return!1;let j=e[g-1];return!(j&&s.has(j))}),l=a??c??process.cwd(),u=await et("Resolving ToolNet project identity",()=>Ud(l,{skipRemoteIdentity:r,adoptRemote:i,allowGitRebind:n}),{enabled:!t}),d=[];if(o&&(d=await et("Detecting coding agents",()=>Vt({projectRoot:u.project.rootPath}),{enabled:!t})),t){console.log(JSON.stringify({...u,integrations:d},null,2));return}if(console.log(""),console.log("ToolNet Memory"),console.log("=============="),console.log(""),console.log("\u2713 Project initialized"),console.log(""),console.log(`Project:  ${u.project.name}`),console.log(`ID:       ${u.project.id}`),console.log(`Remote:   ${u.project.remote??u.project.name}`),console.log(`Root:     ${u.project.rootPath}`),console.log(`Manifest: ${u.manifestFile}`),u.identity&&(console.log(`Identity: ${u.identity.source}`),console.log(`Registry: ${u.identity.registry}`),u.identity.gitRemote&&console.log(`Git:      ${u.identity.gitRemote}`)),console.log(""),o){console.log("AI integrations:");let p=d.filter(g=>g.detected&&g.installed);if(!p.length)console.log("  \u25CB No supported coding agent detected");else for(let g of p){let j=Ue(g.agent),b=so(g.agent);console.log(`  \u2713 ${j} \u2014 ${b}`)}console.log("")}console.log("Next: toolnet-memory doctor"),console.log("")}var zd=process.argv[1]?.endsWith("/init.js")||process.argv[1]?.endsWith("/init.ts");zd&&Yd().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});export{cS as initializeToolNetProject,Ud as initializeToolNetProjectCrossMachine};
