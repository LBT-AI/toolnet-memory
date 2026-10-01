import{existsSync as Jt,statSync as Uu}from"node:fs";import{resolve as qu,join as ii}from"node:path";import{existsSync as ci,readFileSync as ai}from"node:fs";import{homedir as li}from"node:os";import{join as ui}from"node:path";function di(e){let t=e.trim();return t.length>=2&&t.startsWith('"')&&t.endsWith('"')?(t=t.slice(1,-1),t.replace(/\\n/g,`
`).replace(/\\r/g,"\r").replace(/\\t/g,"	").replace(/\\"/g,'"').replace(/\\\\/g,"\\")):t.length>=2&&t.startsWith("'")&&t.endsWith("'")?t.slice(1,-1):t}function pi(){let e=process.env.TOOLNET_GLOBAL_ENV??ui(li(),".config","toolnet-memory",".env");if(!ci(e))return;let t=ai(e,"utf8");for(let o of t.split(/\r?\n/)){let r=o.trim();if(!r||r.startsWith("#"))continue;r.startsWith("export ")&&(r=r.slice(7));let n=r.indexOf("=");if(n<=0)continue;let i=r.slice(0,n).trim();/^[A-Za-z_][A-Za-z0-9_]*$/.test(i)&&process.env[i]===void 0&&(process.env[i]=di(r.slice(n+1)))}}pi();function z(e,t){return e===void 0?t:["1","true","yes","on"].includes(e.toLowerCase())}function W(e,t){if(!e)return t;let o=Number(e);return Number.isFinite(o)?o:t}function Ye(){return{memory:{autoCapture:z(process.env.MEMORY_AUTO_CAPTURE,!0),autoRetrieve:z(process.env.MEMORY_AUTO_RETRIEVE,!0),autoSummarize:z(process.env.MEMORY_AUTO_SUMMARIZE,!0),autoSync:z(process.env.MEMORY_AUTO_SYNC,!0)},retrieval:{maxCandidates:W(process.env.MEMORY_MAX_CANDIDATES,50),rerankTop:W(process.env.MEMORY_RERANK_TOP,10),finalContext:W(process.env.MEMORY_FINAL_CONTEXT,5),tokenBudget:W(process.env.MEMORY_TOKEN_BUDGET,2e3)},storage:{provider:process.env.MEMORY_STORAGE_PROVIDER??"huggingface",r2:{accountId:process.env.R2_ACCOUNT_ID,bucket:process.env.R2_BUCKET,accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY},s3:{endpoint:process.env.S3_ENDPOINT,region:process.env.S3_REGION,bucket:process.env.S3_BUCKET,accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY,forcePathStyle:z(process.env.S3_FORCE_PATH_STYLE,!1)},huggingface:{namespace:process.env.HF_NAMESPACE,bucket:process.env.HF_BUCKET,accessKeyId:process.env.HF_S3_ACCESS_KEY_ID,secretAccessKey:process.env.HF_S3_SECRET_ACCESS_KEY},localRoot:process.env.MEMORY_LOCAL_STORAGE_PATH},cache:{maxMb:W(process.env.MEMORY_LOCAL_CACHE_MB,200)}}}import{createHash as bi}from"node:crypto";import{existsSync as he,mkdirSync as Si,readFileSync as Ii,renameSync as ji,writeFileSync as vi}from"node:fs";import{basename as wi,dirname as ke,join as X,parse as zt,resolve as N}from"node:path";import{createHash as Ut}from"node:crypto";import{spawnSync as gi}from"node:child_process";var Q="git-remote-v1",mi=new Set(["github.com","gitlab.com","bitbucket.org"]);function qt(e,t){let o=t.replaceAll("\\","/").replace(/^\/+/u,"").replace(/\/+$/u,"").replace(/\.git$/iu,"").replace(/\/+/gu,"/");return!o||o==="."||o===".."||o.split("/").some(r=>!r||r==="."||r==="..")?null:(mi.has(e)&&(o=o.toLowerCase()),o)}function fi(e){let t;try{t=new URL(e)}catch{return null}if(!["https:","http:","ssh:","git:"].includes(t.protocol))return null;let o=t.hostname.trim().toLowerCase();if(!o)return null;let r=t.protocol==="https:"&&t.port==="443"||t.protocol==="http:"&&t.port==="80"||t.protocol==="ssh:"&&t.port==="22",n=t.port&&!r?`${o}:${t.port}`:o,i=qt(o,t.pathname);return i?`${n}/${i}`:null}function yi(e){let t=e.match(/^(?:[^@\s/:]+@)?([^:/\s]+):(.+)$/u);if(!t)return null;let o=t[1]?.trim().toLowerCase();if(!o||o.length===1)return null;let r=qt(o,t[2]??"");return r?`${o}/${r}`:null}function Vt(e){let t=e.trim();return t?t.includes("://")?fi(t):yi(t):null}function hi(e){return Ut("sha256").update(`${Q}:${e}`).digest("hex")}function Bt(e){return Ut("sha256").update(`toolnet-project:${Q}:${e}`).digest("hex").slice(0,16)}function ki(e){return e.split("/").filter(Boolean).at(-1)?.trim()||null}function ze(e,t){let o=gi("git",["-C",e,...t],{encoding:"utf8",windowsHide:!0,stdio:["ignore","pipe","ignore"]});return o.error||o.status!==0?null:o.stdout?.trim()||null}function Gt(e,t){let o=ki(e);return o?{scheme:Q,canonicalRemote:e,fingerprint:hi(e),repositoryName:o,source:t}:null}function me(e){let t=ze(e,["remote","get-url","origin"]);if(t){let n=Vt(t);if(n)return Gt(n,"origin")}let o=ze(e,["remote"]);if(!o)return null;let r=new Set;for(let n of o.split(/\r?\n/u).map(i=>i.trim()).filter(Boolean)){let i=ze(e,["remote","get-url",n]);if(!i)continue;let s=Vt(i);s&&r.add(s)}return r.size!==1?null:Gt([...r][0],"unique-remote")}var Wt=".toolnet",Ci="project.json";function xi(e){return bi("sha256").update(e).digest("hex").slice(0,16)}function H(e){return X(e,Wt,Ci)}function Qt(e){return he(H(e))}function Yt(e,t){let o=N(e),r=zt(o).root;for(;;){if(Qt(o))return o;if(o===r||t&&o===N(t))break;let n=ke(o);if(n===o)break;o=n}return null}function We(e){let t=N(e),o=zt(t).root,r=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"];for(;;){if(r.some(i=>he(X(t,i))))return t;if(t===o)break;let n=ke(t);if(n===t)break;t=n}return N(e)}function fe(e){let t;try{t=JSON.parse(Ii(e,"utf8"))}catch(n){throw new Error(`Invalid ToolNet project manifest: ${e}: ${n instanceof Error?n.message:String(n)}`)}if(!t||typeof t!="object")throw new Error(`Invalid ToolNet project manifest: ${e}`);let o=t;if(typeof o.id!="string"||!o.id.trim())throw new Error(`ToolNet project manifest is missing id: ${e}`);if(typeof o.name!="string"||!o.name.trim())throw new Error(`ToolNet project manifest is missing name: ${e}`);let r=new Date().toISOString();return{version:1,id:o.id,name:o.name,remote:typeof o.remote=="string"&&o.remote.trim()?o.remote:o.name,rootPath:typeof o.rootPath=="string"?o.rootPath:ke(ke(e)),createdAt:typeof o.createdAt=="string"?o.createdAt:r,updatedAt:typeof o.updatedAt=="string"?o.updatedAt:r,graphVersion:typeof o.graphVersion=="number"?o.graphVersion:0,memoryVersion:typeof o.memoryVersion=="number"?o.memoryVersion:0,metadata:o.metadata&&typeof o.metadata=="object"?o.metadata:void 0}}function ye(e,t){let o=X(e,Wt);Si(o,{recursive:!0});let r=H(e),n=`${r}.tmp-${process.pid}`;vi(n,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),ji(n,r)}function _(e,t){return{id:e.id,name:e.name,remote:e.remote,rootPath:t,createdAt:e.createdAt,updatedAt:e.updatedAt,graphVersion:e.graphVersion,memoryVersion:e.memoryVersion,metadata:e.metadata}}function Qe(e){return{version:1,scheme:Q,canonicalRemote:e.canonicalRemote,fingerprint:e.fingerprint,repositoryName:e.repositoryName}}function Oi(e){let t=e.metadata?.toolnetIdentity;if(!t||typeof t!="object"||Array.isArray(t))return null;let o=t;return typeof o.fingerprint=="string"?o.fingerprint:null}var L=class{adopt(t,o){let r=We(N(t));if(!o.id.trim())throw new Error("PROJECT_ADOPTION_INVALID_ID");if(!o.name.trim())throw new Error("PROJECT_ADOPTION_INVALID_NAME");if(!o.remote.trim())throw new Error("PROJECT_ADOPTION_INVALID_REMOTE");if(Qt(r)){let c=fe(H(r));if(c.id!==o.id)throw new Error(["PROJECT_IDENTITY_ALREADY_EXISTS",`existing=${c.id}`,`requested=${o.id}`].join(" "));return _(c,r)}let n=new Date().toISOString(),i={...o.metadata};o.gitIdentity&&(i.toolnetIdentity=Qe(o.gitIdentity));let s={version:1,id:o.id.trim(),name:o.name.trim(),remote:o.remote.trim(),rootPath:r,createdAt:o.createdAt??n,updatedAt:n,graphVersion:o.graphVersion??0,memoryVersion:o.memoryVersion??0,metadata:Object.keys(i).length?i:void 0};return ye(r,s),_(s,r)}recordGitIdentity(t,o,r={}){let n=this.requireExisting(t),i=H(n.rootPath),s=fe(i),c=Oi(s);if(c&&c!==o.fingerprint&&!r.allowRebind)throw new Error(["PROJECT_GIT_REMOTE_CHANGED",`existing=${c}`,`current=${o.fingerprint}`,"Use explicit rebind only when this repository identity change is intentional."].join(" "));let a=s.metadata?.toolnetIdentity;return a&&typeof a=="object"&&!Array.isArray(a)&&a.fingerprint===o.fingerprint||(s.metadata={...s.metadata,toolnetIdentity:Qe(o)},s.updatedAt=new Date().toISOString(),ye(n.rootPath,s)),_(s,n.rootPath)}findExisting(t=process.cwd()){let o=N(t),r=We(o),i=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(a=>he(X(r,a))),s=Yt(o,i?r:void 0);if(!s)return null;let c=fe(H(s));return _(c,s)}requireExisting(t=process.cwd()){let o=this.findExisting(t);if(!o)throw new Error("PROJECT_NOT_INITIALIZED");return o}detect(t=process.cwd()){let o=N(t),r=We(o),i=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(d=>he(X(r,d))),s=Yt(o,i?r:void 0);if(s){let d=H(s),p=fe(d);return p.rootPath!==s&&(p.rootPath=s,p.updatedAt=new Date().toISOString(),ye(s,p)),_(p,s)}let c=new Date().toISOString(),a=wi(r),l=me(r),u={version:1,id:l?Bt(l.canonicalRemote):xi(r),name:a,remote:l?.repositoryName??a,rootPath:r,createdAt:c,updatedAt:c,graphVersion:0,memoryVersion:0,metadata:l?{toolnetIdentity:Qe(l)}:void 0};return ye(r,u),_(u,r)}};var Ri=[{type:"openai_key",regex:/\bsk-[A-Za-z0-9_-]{20,}\b/g,confidence:"exact"},{type:"huggingface_token",regex:/\bhf_[A-Za-z0-9]{20,}\b/g,confidence:"exact"},{type:"hf_s3_access_key",regex:/\bHFAK[A-Za-z0-9]{8,}\b/g,confidence:"exact"},{type:"aws_access_key",regex:/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,confidence:"exact"},{type:"github_token",regex:/\b(?:gh[pousr]_[A-Za-z0-9]{30,255}|github_pat_[A-Za-z0-9_]{40,255})\b/g,confidence:"exact"},{type:"stripe_secret_key",regex:/\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g,confidence:"exact"},{type:"google_api_key",regex:/\bAIza[A-Za-z0-9_-]{30,}\b/g,confidence:"exact"},{type:"slack_token",regex:/\bxox[baprs]-[A-Za-z0-9-]{16,}\b/g,confidence:"exact"},{type:"npm_token",regex:/\bnpm_[A-Za-z0-9]{20,}\b/g,confidence:"exact"},{type:"bearer_token",regex:/\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/gi,confidence:"high"},{type:"jwt",regex:/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,confidence:"exact"},{type:"private_key",regex:/-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,confidence:"exact"},{type:"password_assignment",regex:/\b(?:password|passwd|pwd)\s*[:=]\s*["']?[^"' \t\r\n]{6,}["']?/gi,confidence:"high"},{type:"secret_assignment",regex:/\b(?:secret|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key)\s*[:=]\s*["']?[^"' \t\r\n]{8,}["']?/gi,confidence:"high"},{type:"cookie",regex:/\b(?:cookie|set-cookie)\s*[:=]\s*[^;\n]{8,}/gi,confidence:"high"},{type:"url_credentials",regex:/\bhttps?:\/\/[^:/@\s]+:[^/@\s]{4,}@[^/\s]+/gi,confidence:"high"}],Ei=new Set(["example","example-key","example-token","changeme","change-me","password","secret","your-api-key","your-token","<token>","<secret>","<password>","[redacted]"]);function Xt(e){return e.normalize("NFKC").trim().toLowerCase()}function Pi(e){if(e.length===0)return 0;let t=new Map;for(let r of e)t.set(r,(t.get(r)??0)+1);let o=0;for(let r of t.values()){let n=r/e.length;o-=n*Math.log2(n)}return o}function Ti(e){return/^[a-f0-9]{32}$/iu.test(e)||/^[a-f0-9]{40}$/iu.test(e)||/^[a-f0-9]{64}$/iu.test(e)}function Ai(e,t,o){let r=e.slice(Math.max(0,t-48),t),n=e.slice(o,Math.min(e.length,o+16));return/\b(?:token|secret|key|credential|authorization|password|passwd|apikey|api_key|access[_-]?key)\b/iu.test(`${r} ${n}`)}function _i(e,t){return e.start<t.end&&t.start<e.end}function Zt(e){return e.sort((t,o)=>t.start!==o.start?t.start-o.start:o.end-o.start-(t.end-t.start))}var be=class{allowValues=new Set;enableEntropyHeuristic;constructor(t={}){for(let o of t.allowValues??[]){let r=Xt(o);r&&this.allowValues.add(r)}this.enableEntropyHeuristic=t.enableEntropyHeuristic??!0}scan(t){let o=[];for(let i of Ri){let s=new RegExp(i.regex.source,i.regex.flags);for(let c of t.matchAll(s))c.index===void 0||!c[0]||this.allowed(c[0])||o.push({type:i.type,value:c[0],start:c.index,end:c.index+c[0].length,confidence:i.confidence})}this.enableEntropyHeuristic&&o.push(...this.entropyMatches(t));let r=Zt(o),n=[];for(let i of r)n.some(s=>_i(s,i))||n.push(i);return Zt(n)}hasSecrets(t){return this.scan(t).length>0}allowed(t){let o=Xt(t);return Ei.has(o)?!0:this.allowValues.has(o)}entropyMatches(t){let o=[],r=/[A-Za-z0-9_+/=-]{32,160}/g;for(let n of t.matchAll(r)){if(n.index===void 0||!n[0])continue;let i=n[0];this.allowed(i)||Ti(i)||!/[A-Za-z]/u.test(i)||!/[0-9]/u.test(i)||Ai(t,n.index,n.index+i.length)&&(Pi(i)<3.7||o.push({type:"high_entropy_secret",value:i,start:n.index,end:n.index+i.length,confidence:"heuristic"}))}return o}};function eo(e,t,o){Object.defineProperty(e,t,{value:o,enumerable:!0,writable:!0,configurable:!0})}var Se=class{scanner;constructor(t={}){this.scanner=new be(t)}sanitize(t){let o=this.scanner.scan(t);if(o.length===0)return{text:t,redacted:0,secretTypes:[]};let r=t,n=[...o].sort((s,c)=>c.start-s.start),i=new Set;for(let s of n)i.add(s.type),r=r.slice(0,s.start)+`[REDACTED:${s.type}]`+r.slice(s.end);return{text:r,redacted:o.length,secretTypes:[...i].sort()}}sanitizeValue(t){if(typeof t=="string")return this.sanitize(t).text;if(Array.isArray(t))return t.map(o=>this.sanitizeValue(o));if(t&&typeof t=="object"){let o={};for(let[r,n]of Object.entries(t)){if(r==="__proto__")continue;let i=r.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g,"");if(i.includes("password")||i.includes("passwd")||i==="pwd"||i.includes("secret")||i.includes("token")||i.includes("cookie")||i.includes("authorization")||i.includes("apikey")||i.includes("accesskey")||i.includes("privatekey")||i.includes("clientsecret")||i.includes("credential")){eo(o,r,"[REDACTED]");continue}eo(o,r,this.sanitizeValue(n))}return o}return t}};var fd=new Se;var Ni={claude:"hook",cursor:"hook",copilot:"hook",grok:"hook",kiro:"hook",opencode:"hook",codex:"hook",agy:"hook","toolnet-cli":"manual-sync",kilo:"mcp-only",goose:"hook",qwen:"hook",kimi:"hook",hermes:"hook",qoder:"hook"},Mi={mcp:!0,continuityRead:!0,nativeCapture:!1,lifecycleHooks:!1,sharedJournalWrite:!1,level:"mcp-only"},Fi={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!1,sharedJournalWrite:!0,level:"native-capture"},v={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!0,sharedJournalWrite:!0,level:"native-capture"},$i={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!0,sharedJournalWrite:!0,level:"native-capture"};function h(e,t,o){return{agent:e,...t,refreshMode:o,captureMode:Ni[e]}}var to={agy:h("agy",v,"native-lifecycle"),opencode:h("opencode",$i,"persistent-plugin"),codex:h("codex",v,"native-lifecycle"),claude:h("claude",v,"native-lifecycle"),kiro:h("kiro",v,"native-lifecycle"),cursor:h("cursor",v,"native-lifecycle"),copilot:h("copilot",v,"native-lifecycle"),grok:h("grok",v,"native-lifecycle"),"toolnet-cli":h("toolnet-cli",Fi,"native-session"),kilo:h("kilo",Mi,"mcp-only"),goose:h("goose",v,"native-lifecycle"),qwen:h("qwen",v,"native-lifecycle"),kimi:h("kimi",v,"native-lifecycle"),hermes:h("hermes",v,"native-lifecycle"),qoder:h("qoder",v,"native-lifecycle")};function Di(e){return Object.prototype.hasOwnProperty.call(to,e)}function Hi(e){if(Di(e))return to[e]}function oo(e){let t=Hi(e);if(!t)return"unknown";switch(t.refreshMode){case"native-lifecycle":return"native lifecycle";case"persistent-plugin":return"persistent plugin";case"native-session":return"native session capture";case"mcp-only":return"MCP only"}}var ro=["\u280B","\u2819","\u2839","\u2838","\u283C","\u2834","\u2826","\u2827","\u2807","\u280F"],k={clear:"\r\x1B[2K",cyan:"\x1B[36m",green:"\x1B[32m",red:"\x1B[31m",yellow:"\x1B[33m",amber:"\x1B[38;5;214m",dim:"\x1B[2m",reset:"\x1B[0m"};function no(e,t=16){let r=Math.max(1,t-4+1),n=e%r;return"\u2500".repeat(n)+"\u2501".repeat(4)+"\u2500".repeat(Math.max(0,t-n-4))}function io(e){let t=Date.now()-e;return t<1e3?`${t}ms`:t<1e4?`${(t/1e3).toFixed(1)}s`:`${Math.round(t/1e3)}s`}var Xe=class{stream;enabled;interactive;color;intervalMs;display;label;frame=0;startedAt=0;timer;active=!1;constructor(t,o={}){this.label=t,this.stream=o.stream??process.stderr,this.enabled=o.enabled??!0,this.interactive=o.interactive??this.stream.isTTY===!0,this.color=o.color??(this.interactive&&process.env.NO_COLOR===void 0),this.intervalMs=Math.max(40,o.intervalMs??80),this.display=o.display??"spinner"}start(){return!this.enabled||this.active?this:(this.active=!0,this.startedAt=Date.now(),this.interactive?(this.render(),this.timer=setInterval(()=>{this.frame=(this.frame+1)%1e4,this.render()},this.intervalMs),this.timer.unref?.(),this):(this.stream.write(`\u2192 ${this.label}
`),this))}update(t){return this.label=t,this.enabled&&this.active&&this.interactive&&this.render(),this}succeed(t){this.finish("\u2713",t??this.label,k.green)}fail(t){this.finish("\u2717",t??this.label,k.red)}warn(t){this.finish("!",t??this.label,k.yellow)}stop(){this.active&&(this.timer&&(clearInterval(this.timer),this.timer=void 0),this.enabled&&this.interactive&&this.stream.write(k.clear),this.active=!1)}render(){if(!this.enabled||!this.active||!this.interactive)return;let t=ro[this.frame%ro.length],o=this.display==="bar"?this.color?`${k.amber}${no(this.frame)}${k.reset}`:no(this.frame):this.color?`${k.cyan}${t}${k.reset}`:t,r=io(this.startedAt),n=this.color?`${k.dim}${r}${k.reset}`:r;this.stream.write(`${k.clear}${o} ${this.label} ${n}`)}finish(t,o,r){if(!this.enabled){this.active=!1;return}this.startedAt||(this.startedAt=Date.now()),this.timer&&(clearInterval(this.timer),this.timer=void 0);let n=io(this.startedAt),i=this.color?`${r}${t}${k.reset}`:t,s=this.color?`${k.dim}${n}${k.reset}`:n;this.interactive?this.stream.write(`${k.clear}${i} ${o} ${s}
`):this.stream.write(`${i} ${o} (${n})
`),this.active=!1}};async function Ze(e,t,o={}){let r=new Xe(e,o).start();try{let n=await t();return r.succeed(),n}catch(n){throw r.fail(),n}}import{resolve as js}from"node:path";import{homedir as ys}from"node:os";import{join as hs}from"node:path";import{DeleteObjectCommand as Li,GetObjectCommand as Ki,HeadObjectCommand as Ji,ListObjectsV2Command as Vi,PutObjectCommand as Gi,S3Client as Ui}from"@aws-sdk/client-s3";import{getSignedUrl as qi}from"@aws-sdk/s3-request-presigner";var Ie=class{name="huggingface";client;bucket;constructor(t){this.bucket=t.bucket,this.client=new Ui({region:"us-east-1",endpoint:`https://s3.hf.co/${t.namespace}`,forcePathStyle:!0,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:t.accessKeyId,secretAccessKey:t.secretAccessKey}})}async put(t,o,r="application/octet-stream"){let n=typeof o=="string"?Buffer.from(o,"utf8"):o;await this.client.send(new Gi({Bucket:this.bucket,Key:t,Body:n,ContentType:r}))}async get(t){let o=await qi(this.client,new Ki({Bucket:this.bucket,Key:t}),{expiresIn:60}),r=await fetch(o,{redirect:"follow"});if(r.status===404)return null;if(!r.ok)throw new Error(`HF download failed: ${r.status} ${r.statusText}`);return new Uint8Array(await r.arrayBuffer())}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){try{return await this.client.send(new Ji({Bucket:this.bucket,Key:t})),!0}catch(o){if(typeof o=="object"&&o!==null&&"$metadata"in o&&o.$metadata?.httpStatusCode===404)return!1;throw o}}async delete(t){await this.client.send(new Li({Bucket:this.bucket,Key:t}))}async list(t=""){let o=[],r;do{let n=await this.client.send(new Vi({Bucket:this.bucket,Prefix:t||void 0,ContinuationToken:r}));for(let i of n.Contents??[])i.Key&&o.push({key:i.Key,size:i.Size,updatedAt:i.LastModified?.toISOString()});r=n.IsTruncated?n.NextContinuationToken:void 0}while(r);return o}};import{access as so,mkdir as Bi,readFile as Yi,readdir as zi,rm as Wi,stat as co,writeFile as Qi}from"node:fs/promises";import{dirname as Xi,join as Zi,relative as ao,resolve as es}from"node:path";var Z=class{constructor(t){this.root=t}root;name="local";path(t){let o=t.replace(/^\/+/,"");return es(this.root,o)}async put(t,o){let r=this.path(t);await Bi(Xi(r),{recursive:!0}),await Qi(r,o)}async get(t){try{return await Yi(this.path(t))}catch(o){if(typeof o=="object"&&o!==null&&"code"in o&&o.code==="ENOENT")return null;throw o}}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){try{return await so(this.path(t)),!0}catch{return!1}}async delete(t){await Wi(this.path(t),{force:!0})}async list(t=""){let o=this.path(t),r=[];try{await so(o)}catch{return r}let n=async s=>{let c=await zi(s,{withFileTypes:!0});for(let a of c){let l=Zi(s,a.name);if(a.isDirectory()){await n(l);continue}let u=await co(l);r.push({key:ao(this.root,l),size:u.size,updatedAt:u.mtime.toISOString()})}},i=await co(o);return i.isDirectory()?await n(o):r.push({key:ao(this.root,o),size:i.size,updatedAt:i.mtime.toISOString()}),r}};import{DeleteObjectCommand as ts,GetObjectCommand as os,HeadObjectCommand as rs,ListObjectsV2Command as ns,PutObjectCommand as is,S3Client as ss}from"@aws-sdk/client-s3";import{getSignedUrl as cs}from"@aws-sdk/s3-request-presigner";var ee=class{name;client;bucket;constructor(t){this.name=t.name??"s3",this.bucket=t.bucket,this.client=new ss({region:t.region??"us-east-1",endpoint:t.endpoint||void 0,forcePathStyle:t.forcePathStyle??!1,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:t.accessKeyId,secretAccessKey:t.secretAccessKey}})}async put(t,o,r="application/octet-stream"){let n=typeof o=="string"?Buffer.from(o,"utf8"):o;await this.client.send(new is({Bucket:this.bucket,Key:t,Body:n,ContentType:r}))}async get(t){let o=await cs(this.client,new os({Bucket:this.bucket,Key:t}),{expiresIn:60}),r=await fetch(o,{redirect:"follow"});if(r.status===404)return null;if(!r.ok)throw new Error(`${this.name} download failed: ${r.status} ${r.statusText}`);return new Uint8Array(await r.arrayBuffer())}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){try{return await this.client.send(new rs({Bucket:this.bucket,Key:t})),!0}catch(o){if(typeof o=="object"&&o!==null&&"$metadata"in o&&o.$metadata?.httpStatusCode===404)return!1;throw o}}async delete(t){await this.client.send(new ts({Bucket:this.bucket,Key:t}))}async list(t=""){let o=[],r;do{let n=await this.client.send(new ns({Bucket:this.bucket,Prefix:t||void 0,ContinuationToken:r}));for(let i of n.Contents??[])i.Key&&o.push({key:i.Key,size:i.Size,updatedAt:i.LastModified?.toISOString()});r=n.IsTruncated?n.NextContinuationToken:void 0}while(r);return o}};import{createCipheriv as as,createDecipheriv as ls,createHash as us,randomBytes as ds,timingSafeEqual as ps}from"node:crypto";import{readFileSync as gs}from"node:fs";var M=Buffer.from("TNMEME01","ascii"),uo=1,te=8,oe=12,et=16,po=M.length+1+te+oe+et,ms="toolnet-memory:remote-encryption:v1:",go="aes-256-gcm",tt=32,f=class extends Error{constructor(o,r){super(r);this.code=o;this.name="RemoteEncryptionError"}code};function fs(e){return e?["1","true","yes","on","enabled"].includes(e.trim().toLowerCase()):!1}function ot(e=process.env){return fs(e.TOOLNET_REMOTE_ENCRYPTION)}function lo(e){let t=e.trim();if(!t)throw new f("REMOTE_ENCRYPTION_KEY_EMPTY","Remote encryption key is empty.");let o;if(t.startsWith("hex:")){let r=t.slice(4);if(!/^[0-9a-f]{64}$/iu.test(r))throw new f("REMOTE_ENCRYPTION_KEY_INVALID","hex: remote encryption key must contain exactly 64 hexadecimal characters.");o=Buffer.from(r,"hex")}else if(/^[0-9a-f]{64}$/iu.test(t))o=Buffer.from(t,"hex");else{let r=t.startsWith("base64:")?t.slice(7):t;if(!/^[A-Za-z0-9+/_-]+={0,2}$/u.test(r))throw new f("REMOTE_ENCRYPTION_KEY_INVALID","Remote encryption key must be 32 raw bytes encoded as hexadecimal or base64.");o=Buffer.from(r,r.includes("-")||r.includes("_")?"base64url":"base64")}if(o.length!==tt)throw new f("REMOTE_ENCRYPTION_KEY_INVALID_LENGTH",`Remote encryption key must decode to exactly ${tt} bytes.`);return o}function mo(e=process.env){let t=e.TOOLNET_REMOTE_ENCRYPTION_KEY?.trim(),o=e.TOOLNET_REMOTE_ENCRYPTION_KEY_FILE?.trim();if(t&&o)throw new f("REMOTE_ENCRYPTION_KEY_AMBIGUOUS","Configure either TOOLNET_REMOTE_ENCRYPTION_KEY or TOOLNET_REMOTE_ENCRYPTION_KEY_FILE, not both.");if(t)return lo(t);if(o){let r;try{r=gs(o,"utf8")}catch(n){throw new f("REMOTE_ENCRYPTION_KEY_FILE_READ_FAILED",[`Unable to read remote encryption key file: ${o}.`,n instanceof Error?n.message:String(n)].join(" "))}return lo(r)}}function fo(e){return us("sha256").update(e).digest().subarray(0,te)}function yo(e){return Buffer.from(`${ms}${e}`,"utf8")}function rt(e){return e.byteLength<M.length?!1:Buffer.from(e).subarray(0,M.length).equals(M)}function ho(e,t,o){if(o.byteLength!==tt)throw new f("REMOTE_ENCRYPTION_KEY_INVALID_LENGTH","AES-256-GCM requires a 32-byte key.");let r=typeof t=="string"?Buffer.from(t,"utf8"):Buffer.from(t),n=ds(oe),i=as(go,o,n);i.setAAD(yo(e));let s=Buffer.concat([i.update(r),i.final()]),c=i.getAuthTag(),a=Buffer.alloc(po),l=0;return M.copy(a,l),l+=M.length,a.writeUInt8(uo,l),l+=1,fo(o).copy(a,l),l+=te,n.copy(a,l),l+=oe,c.copy(a,l),Buffer.concat([a,s])}function ko(e,t,o){let r=Buffer.from(t);if(!rt(r))throw new f("REMOTE_ENCRYPTION_ENVELOPE_REQUIRED","Payload is not a ToolNet encrypted remote object.");if(r.length<po)throw new f("REMOTE_ENCRYPTION_ENVELOPE_TRUNCATED","Encrypted remote payload is truncated.");let n=M.length,i=r.readUInt8(n);if(n+=1,i!==uo)throw new f("REMOTE_ENCRYPTION_VERSION_UNSUPPORTED",`Unsupported remote encryption envelope version: ${i}.`);let s=r.subarray(n,n+te);n+=te;let c=fo(o);if(!ps(s,c))throw new f("REMOTE_ENCRYPTION_KEY_MISMATCH","Configured remote encryption key does not match this encrypted object.");let a=r.subarray(n,n+oe);n+=oe;let l=r.subarray(n,n+et);n+=et;let u=r.subarray(n),d=ls(go,o,a);d.setAAD(yo(e)),d.setAuthTag(l);try{return Buffer.concat([d.update(u),d.final()])}catch{throw new f("REMOTE_ENCRYPTION_AUTH_FAILED","Encrypted remote object failed AES-GCM authentication.")}}var nt=class{constructor(t,o){this.inner=t;this.options=o;if(this.name=t.name,o.enabled&&!o.key)throw new f("REMOTE_ENCRYPTION_KEY_REQUIRED","Remote client-side encryption is enabled but no encryption key is configured.")}inner;options;name;async put(t,o,r){if(!this.options.enabled){await this.inner.put(t,o,r);return}let n=this.options.key;if(!n)throw new f("REMOTE_ENCRYPTION_KEY_REQUIRED","Remote encryption key is unavailable.");let i=ho(t,o,n);await this.inner.put(t,i,"application/octet-stream")}async get(t){let o=await this.inner.get(t);if(!o)return null;if(!rt(o))return o;if(!this.options.enabled)throw new f("REMOTE_ENCRYPTION_REQUIRED",["Remote object is client-side encrypted.","Enable TOOLNET_REMOTE_ENCRYPTION and configure the matching key."].join(" "));let r=this.options.key;if(!r)throw new f("REMOTE_ENCRYPTION_KEY_REQUIRED","Remote object is encrypted but no decryption key is configured.");return ko(t,o,r)}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){return this.inner.exists(t)}async delete(t){await this.inner.delete(t)}async list(t=""){return this.inner.list(t)}};function bo(e,t=process.env){if(e.name==="local")return ot(t)&&console.warn("[storage] Remote encryption requested but active storage provider is local; local data remains unchanged."),e;let o=ot(t),r=o?mo(t):void 0;return new nt(e,{enabled:o,key:r})}function re(e){return bo(e)}function it(e,t){return console.warn(t),re(new Z(e))}function So(e){let t=e.localRoot??hs(ys(),".toolnet-memory","storage");if(e.provider==="r2"){let o=e.r2;return o?.accountId&&o.bucket&&o.accessKeyId&&o.secretAccessKey?re(new ee({name:"r2",endpoint:`https://${o.accountId}.r2.cloudflarestorage.com`,region:"auto",bucket:o.bucket,forcePathStyle:!0,accessKeyId:o.accessKeyId,secretAccessKey:o.secretAccessKey})):it(t,"[storage] Cloudflare R2 credentials missing. Using local fallback.")}if(e.provider==="s3"){let o=e.s3;return o?.bucket&&o.accessKeyId&&o.secretAccessKey?re(new ee({name:"s3",endpoint:o.endpoint,region:o.region??"us-east-1",bucket:o.bucket,forcePathStyle:o.forcePathStyle??!1,accessKeyId:o.accessKeyId,secretAccessKey:o.secretAccessKey})):it(t,"[storage] S3 credentials missing. Using local fallback.")}if(e.provider==="huggingface"){let o=e.huggingface;return o?.namespace&&o.bucket&&o.accessKeyId&&o.secretAccessKey?re(new Ie({namespace:o.namespace,bucket:o.bucket,accessKeyId:o.accessKeyId,secretAccessKey:o.secretAccessKey})):it(t,"[storage] Hugging Face credentials missing. Using local fallback.")}return re(new Z(t))}function ks(e){return new Promise(t=>setTimeout(t,e))}async function Io(e,t={}){let o=Math.max(1,t.attempts??3),r=t.baseDelayMs??150,n=t.maxDelayMs??2e3,i;for(let s=1;s<=o;s++)try{return await e()}catch(c){if(i=c,s>=o)break;let a=Math.min(n,r*2**(s-1)),l=Math.floor(Math.random()*Math.max(1,a*.2));await ks(a+l)}throw i}var bs=new Set(["put","get","getText","delete","list"]);function jo(e,t={}){return new Proxy(e,{get(o,r){let n=Reflect.get(o,r,o);return typeof n!="function"?n:bs.has(r)?(...i)=>Io(()=>Promise.resolve(n.apply(o,i)),t):n.bind(o)}})}var x="authority: never rebuilt, never dropped",Ss=[{kind:"memory_records",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:x,legacyValueDomains:[],description:"Long-term project memory records (projects/<id>/memories/current.json)."},{kind:"task_operations",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"reject",sourceOfTruth:x,legacyValueDomains:[],description:"Immutable task operation log (.toolnet/tasks/events.jsonl)."},{kind:"task_replication_log",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"reject",sourceOfTruth:x,legacyValueDomains:[],description:"Replicated task operations from other hosts."},{kind:"retrieval_feedback",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:x,legacyValueDomains:[],description:"Retrieval feedback signals (.toolnet/retrieval/feedback.jsonl)."},{kind:"retrieval_telemetry",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:x,legacyValueDomains:[],description:"Retrieval telemetry samples (.toolnet/retrieval/telemetry.jsonl)."},{kind:"retrieval_overrides",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:x,legacyValueDomains:[],description:"Operator retrieval overrides (.toolnet/retrieval/overrides.json)."},{kind:"session_wal",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:x,legacyValueDomains:[],description:"Session write-ahead log (.toolnet/runtime/sources/)."},{kind:"adr_state",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"reject",sourceOfTruth:x,legacyValueDomains:[],description:"Architecture decision records (projects/<id>/knowledge/adr/state.v1.json)."},{kind:"project_manifest",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"backward_compatible",missingVersionPolicy:"assume_legacy",sourceOfTruth:x,legacyValueDomains:[],description:"Project identity manifest (.toolnet/project.json and the remote copy)."},{kind:"recovery_backup",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"reject",sourceOfTruth:x,legacyValueDomains:[],description:"Disaster-recovery backup manifest, version-gated on read."},{kind:"task_projection",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"task operations log",legacyValueDomains:[],description:"Materialized task state; rebuilt from the operation log."},{kind:"code_graph",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Code graph snapshot (projects/<id>/graph/current.json)."},{kind:"code_manifest",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Incremental file manifest (projects/<id>/graph/manifest.json)."},{kind:"resolution_snapshot",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"backward_compatible",missingVersionPolicy:"assume_legacy",sourceOfTruth:"repository source",legacyValueDomains:["resolution_kind_uppercase"],description:"Symbol resolution snapshot (projects/<id>/graph/resolution/current.json); the legacy kind vocabulary (CALL/REFERENCE/EXTENDS/IMPLEMENTS) is normalized in memory on read."},{kind:"graph_coverage",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code graph + resolution",legacyValueDomains:[],description:"Graph coverage snapshot (projects/<id>/graph/coverage.json)."},{kind:"cross_service",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source + service extractors",legacyValueDomains:[],description:"Cross-service linkage (projects/<id>/graph/cross-service.json)."},{kind:"fleet_export",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Fleet export view (projects/<id>/graph/fleet-export.json)."},{kind:"snapshot_archive",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"current project state",legacyValueDomains:[],description:"Point-in-time project snapshots; never part of authority backups."},{kind:"code_artifacts",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"reject",sourceOfTruth:"repository source + semantic registry",legacyValueDomains:[],description:"Portable code-intelligence artifacts, gated by the artifact fingerprint matrix."},{kind:"code_chunks",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Code chunk snapshot (projects/<id>/code/chunks/current.json)."},{kind:"code_vectors",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code chunks",legacyValueDomains:[],description:"Code vector index (projects/<id>/code/vectors/current.json)."},{kind:"memory_vectors",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"memory records",legacyValueDomains:[],description:"Deterministic memory vector index (projects/<id>/vectors/current.json)."},{kind:"architecture_snapshot",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code graph",legacyValueDomains:[],description:"Architecture snapshot (projects/<id>/code/architecture)."},{kind:"code_analysis",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code graph",legacyValueDomains:[],description:"Code analysis snapshot (projects/<id>/code/analysis)."},{kind:"visualization_graph",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code graph",legacyValueDomains:[],description:"Visualization graph (projects/<id>/code/visualization/graph.json)."},{kind:"runtime_traces",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"observed session activity",legacyValueDomains:[],description:"Runtime trace sessions plus their recomputed observation index."},{kind:"journal",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"session activity",legacyValueDomains:[],description:"Local session journal (.toolnet/journal)."},{kind:"task_replication_cursor",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"task replication log",legacyValueDomains:[],description:"Replication cursor (.toolnet/tasks/replication/cursor.json)."},{kind:"runtime_locks",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"process lifetime",legacyValueDomains:[],description:"Runtime lock files (.toolnet/runtime/locks)."},{kind:"daemon_state",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"running daemon",legacyValueDomains:[],description:"Daemon coordination state (daemon-state.json)."},{kind:"daemon_runtime_files",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"running daemon",legacyValueDomains:[],description:"Daemon socket, pid, lock and logs."},{kind:"artifact_staging",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Artifact staging area (.toolnet/cache/artifacts/staging)."},{kind:"test_run_cache",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"test execution",legacyValueDomains:[],description:"In-memory only derived test-run store."}],Is=Object.freeze(Ss.slice().sort((e,t)=>e.kind.localeCompare(t.kind))),Fp=new Map(Is.map(e=>[e.kind,e]));var m="projects/[^/]+",$p=[{pattern:/^\.toolnet\/tasks\/events\.jsonl$/u,kind:"task_operations"},{pattern:/^\.toolnet\/tasks\/replication\/replicated(\/|$)/u,kind:"task_replication_log"},{pattern:/^\.toolnet\/tasks\/replication\/cursor\.json$/u,kind:"task_replication_cursor"},{pattern:/^\.toolnet\/tasks\/state\.json$/u,kind:"task_projection"},{pattern:/^\.toolnet\/tasks(\/|$)/u,kind:"task_projection"},{pattern:/^\.toolnet\/retrieval\/feedback\.jsonl$/u,kind:"retrieval_feedback"},{pattern:/^\.toolnet\/retrieval\/telemetry\.jsonl$/u,kind:"retrieval_telemetry"},{pattern:/^\.toolnet\/retrieval\/overrides\.json$/u,kind:"retrieval_overrides"},{pattern:/^\.toolnet\/retrieval(\/|$)/u,kind:"retrieval_overrides"},{pattern:/^\.toolnet\/runtime\/sources(\/|$)/u,kind:"session_wal"},{pattern:/^\.toolnet\/runtime\/locks(\/|$)/u,kind:"runtime_locks"},{pattern:/^\.toolnet\/runtime(\/|$)/u,kind:"session_wal"},{pattern:/^\.toolnet\/journal(\/|$)/u,kind:"journal"},{pattern:/^\.toolnet\/cache\/artifacts\/staging(\/|$)/u,kind:"artifact_staging"},{pattern:/^\.toolnet\/cache(\/|$)/u,kind:"artifact_staging"},{pattern:/^\.toolnet\/project\.json$/u,kind:"project_manifest"},{pattern:new RegExp(`^${m}/memories(/|$)`,"u"),kind:"memory_records"},{pattern:new RegExp(`^${m}/knowledge/adr(/|$)`,"u"),kind:"adr_state"},{pattern:new RegExp(`^${m}/project\\.json$`,"u"),kind:"project_manifest"},{pattern:new RegExp(`^${m}/graph/artifacts(/|$)`,"u"),kind:"code_artifacts"},{pattern:new RegExp(`^${m}/graph/resolution(/|$)`,"u"),kind:"resolution_snapshot"},{pattern:new RegExp(`^${m}/graph/coverage\\.json$`,"u"),kind:"graph_coverage"},{pattern:new RegExp(`^${m}/graph/cross-service\\.json$`,"u"),kind:"cross_service"},{pattern:new RegExp(`^${m}/graph/fleet-export\\.json$`,"u"),kind:"fleet_export"},{pattern:new RegExp(`^${m}/graph/manifest\\.json$`,"u"),kind:"code_manifest"},{pattern:new RegExp(`^${m}/graph/current\\.json$`,"u"),kind:"code_graph"},{pattern:new RegExp(`^${m}/graph(/|$)`,"u"),kind:"code_graph"},{pattern:new RegExp(`^${m}/code/graph(/|$)`,"u"),kind:"code_graph"},{pattern:new RegExp(`^${m}/code/chunks(/|$)`,"u"),kind:"code_chunks"},{pattern:new RegExp(`^${m}/code/vectors(/|$)`,"u"),kind:"code_vectors"},{pattern:new RegExp(`^${m}/code/architecture(/|$)`,"u"),kind:"architecture_snapshot"},{pattern:new RegExp(`^${m}/code/analysis(/|$)`,"u"),kind:"code_analysis"},{pattern:new RegExp(`^${m}/code/visualization(/|$)`,"u"),kind:"visualization_graph"},{pattern:new RegExp(`^${m}/vectors(/|$)`,"u"),kind:"memory_vectors"},{pattern:new RegExp(`^${m}/memory(/|$)`,"u"),kind:"memory_records"},{pattern:new RegExp(`^${m}/runtime-traces(/|$)`,"u"),kind:"runtime_traces"},{pattern:new RegExp(`^${m}/snapshots(/|$)`,"u"),kind:"snapshot_archive"},{pattern:/(^|\/)snapshots\/[^/]+\/(memories|vectors|graph)\//u,kind:"snapshot_archive"},{pattern:/(^|\/)daemon-state\.json$/u,kind:"daemon_state"},{pattern:/(^|\/)(daemon\.lock|daemon\.pid|daemon\.sock)$/u,kind:"daemon_runtime_files"},{pattern:/(^|\/)logs\/daemon\.log$/u,kind:"daemon_runtime_files"}];function K(e){let t=e.trim().replace(/\s+/g,"_").replace(/[^A-Za-z0-9._-]/g,"_").replace(/_+/g,"_").replace(/^\.+|\.+$/g,"").slice(0,100);if(!t||t==="."||t==="..")throw new Error("Invalid project storage folder");return t}var og=Object.freeze({CALL:"call",REFERENCE:"type",EXTENDS:"inheritance",IMPLEMENTS:"implementation"});var vs="_toolnet/registry/project-identities/v1",S=class extends Error{code="PROJECT_IDENTITY_COLLISION";constructor(t){super(t),this.name="ProjectIdentityCollisionError"}},je=class extends Error{code="PROJECT_IDENTITY_ADOPTION_REQUIRED";constructor(t,o){super(["PROJECT_IDENTITY_ADOPTION_REQUIRED",`remote=${t}`,`projectId=${o}`,"A legacy remote ToolNet project exists but has no Git fingerprint proof.",`Re-run with: toolnet-memory init --adopt-remote ${t}`].join(" ")),this.name="ProjectIdentityAdoptionRequiredError"}},ne=class extends Error{code="PROJECT_IDENTITY_REGISTRY_UNAVAILABLE";constructor(t){super(["PROJECT_IDENTITY_REGISTRY_UNAVAILABLE",t,"Refusing to create a possibly split project identity while configured remote storage cannot be checked.","Use --no-remote-identity only when local-only initialization is intentional."].join(" ")),this.name="ProjectIdentityRegistryUnavailableError"}};function ws(){let e=Ye();if(e.storage.provider==="r2"){let t=e.storage.r2;return!!(t.accountId&&t.bucket&&t.accessKeyId&&t.secretAccessKey)}if(e.storage.provider==="s3"){let t=e.storage.s3;return!!(t.bucket&&t.accessKeyId&&t.secretAccessKey)}if(e.storage.provider==="huggingface"){let t=e.storage.huggingface;return!!(t.namespace&&t.bucket&&t.accessKeyId&&t.secretAccessKey)}return!1}function vo(e){if(e.storage)return{storage:e.storage,crossMachine:e.storageIsCrossMachine??!0,providerName:e.storage.name};let t=Ye(),o=So({provider:t.storage.provider,r2:t.storage.r2,s3:t.storage.s3,huggingface:t.storage.huggingface,localRoot:t.storage.localRoot}),r=ws()&&o.name!=="local";return{storage:r?jo(o,{attempts:Number(process.env.TOOLNET_STORAGE_RETRIES??3)}):o,crossMachine:r,providerName:o.name}}function Co(e){return[vs,`${e.fingerprint}.json`].join("/")}function xo(e,t){let o;try{o=JSON.parse(e)}catch(i){throw new S([`Invalid ToolNet project identity registry record: ${t}.`,i instanceof Error?i.message:String(i)].join(" "))}if(!o||typeof o!="object"||Array.isArray(o))throw new S(`Invalid ToolNet project identity registry record: ${t}`);let r=o;for(let i of["fingerprint","canonicalGitRemote","projectId","projectName","projectRemote"])if(typeof r[i]!="string"||!String(r[i]).trim())throw new S(`ToolNet identity registry record ${t} is missing ${i}`);let n=new Date().toISOString();return{version:1,fingerprint:String(r.fingerprint),canonicalGitRemote:String(r.canonicalGitRemote),projectId:String(r.projectId),projectName:String(r.projectName),projectRemote:String(r.projectRemote),createdAt:typeof r.createdAt=="string"?r.createdAt:n,updatedAt:typeof r.updatedAt=="string"?r.updatedAt:n}}function Cs(e,t){let o;try{o=JSON.parse(e)}catch(s){throw new S([`Invalid remote ToolNet project manifest: ${t}.`,s instanceof Error?s.message:String(s)].join(" "))}if(!o||typeof o!="object"||Array.isArray(o))throw new S(`Invalid remote ToolNet project manifest: ${t}`);let r=o;if(typeof r.id!="string"||!r.id.trim())throw new S(`Remote ToolNet project manifest ${t} is missing id`);let n=typeof r.remote=="string"&&r.remote.trim()?r.remote:t.split("/")[1]??"project",i=typeof r.name=="string"&&r.name.trim()?r.name:n;return{version:typeof r.version=="number"?r.version:void 0,id:r.id,name:i,remote:n,createdAt:typeof r.createdAt=="string"?r.createdAt:void 0,updatedAt:typeof r.updatedAt=="string"?r.updatedAt:void 0}}async function ve(e,t){let r=`projects/${K(t)}/project.json`,n=await e.getText(r);return n?Cs(n,r):null}async function xs(e,t){let o=Co(t),r=await e.getText(o);if(!r)return null;let n=xo(r,o);if(n.fingerprint!==t.fingerprint||n.canonicalGitRemote!==t.canonicalRemote)throw new S(["PROJECT_IDENTITY_REGISTRY_MISMATCH",`key=${o}`,`expectedFingerprint=${t.fingerprint}`,`actualFingerprint=${n.fingerprint}`].join(" "));return n}async function Os(e,t){let o=await ve(e,t.projectRemote);if(o&&o.id!==t.projectId)throw new S(["PROJECT_IDENTITY_REMOTE_OWNERSHIP_MISMATCH",`remote=${t.projectRemote}`,`registryId=${t.projectId}`,`remoteId=${o.id}`].join(" "))}async function st(e,t,o){let r=K(t.remote??t.name),n=await ve(e,r);if(n&&n.id!==t.id)throw new S(["PROJECT_IDENTITY_REMOTE_NAMESPACE_COLLISION",`remote=${r}`,`existing=${n.id}`,`current=${t.id}`].join(" "));let i=Co(o),s=await e.getText(i);if(s){let l=xo(s,i);if(l.projectId!==t.id||l.canonicalGitRemote!==o.canonicalRemote)throw new S(["PROJECT_IDENTITY_REGISTRY_COLLISION",`fingerprint=${o.fingerprint}`,`existingProject=${l.projectId}`,`currentProject=${t.id}`].join(" "));return}let c=new Date().toISOString(),a={version:1,fingerprint:o.fingerprint,canonicalGitRemote:o.canonicalRemote,projectId:t.id,projectName:t.name,projectRemote:r,createdAt:t.createdAt,updatedAt:c};await e.put(i,JSON.stringify(a,null,2)+`
`,"application/json")}function Rs(e,t){return{id:e.id,name:e.name,remote:e.remote,createdAt:e.createdAt,gitIdentity:t,metadata:{adoptedFromRemote:!0,adoptedAt:new Date().toISOString()}}}function wo(e){return e instanceof S||e instanceof je||e instanceof ne}async function Oo(e=process.cwd(),t={}){let o=js(e),r=new L,n=r.findExisting(o),i=me(n?.rootPath??o);if(n){let c=n;if(i&&(c=r.recordGitIdentity(n.rootPath,i,{allowRebind:t.allowGitRebind??!1})),t.skipRemoteIdentity||!i)return{project:c,source:"existing-manifest",gitIdentity:i,registry:t.skipRemoteIdentity?"skipped":"disabled"};let a=vo(t);if(!a.crossMachine)return{project:c,source:"existing-manifest",gitIdentity:i,registry:"disabled",registryProvider:a.providerName};try{return await st(a.storage,c,i),{project:c,source:"existing-manifest",gitIdentity:i,registry:"registered",registryProvider:a.providerName}}catch(l){if(wo(l))throw l;return{project:c,source:"existing-manifest",gitIdentity:i,registry:"unavailable",registryProvider:a.providerName}}}if(!i)return{project:r.detect(o),source:"legacy-path",gitIdentity:null,registry:"disabled"};if(t.skipRemoteIdentity)return{project:r.detect(o),source:"git-remote",gitIdentity:i,registry:"skipped"};let s=vo(t);if(!s.crossMachine){if(t.adoptRemote)throw new ne("Explicit remote adoption was requested but no cross-machine storage provider is configured.");return{project:r.detect(o),source:"git-remote",gitIdentity:i,registry:"disabled",registryProvider:s.providerName}}try{let c=await xs(s.storage,i);if(c){if(t.adoptRemote&&K(t.adoptRemote)!==K(c.projectRemote))throw new S(["PROJECT_IDENTITY_EXPLICIT_ADOPTION_CONFLICT",`requested=${t.adoptRemote}`,`registered=${c.projectRemote}`].join(" "));return await Os(s.storage,c),{project:r.adopt(o,{id:c.projectId,name:c.projectName,remote:c.projectRemote,createdAt:c.createdAt,gitIdentity:i,metadata:{adoptedFromRegistry:!0,adoptedAt:new Date().toISOString()}}),source:"remote-registry",gitIdentity:i,registry:"matched",registryProvider:s.providerName}}if(t.adoptRemote){let u=await ve(s.storage,t.adoptRemote);if(!u)throw new Error(["PROJECT_ADOPTION_REMOTE_NOT_FOUND",`remote=${t.adoptRemote}`].join(" "));let d=r.adopt(o,Rs(u,i));return await st(s.storage,d,i),{project:d,source:"explicit-remote-adoption",gitIdentity:i,registry:"registered",registryProvider:s.providerName}}let a=await ve(s.storage,i.repositoryName);if(a)throw new je(a.remote,a.id);let l=r.detect(o);return await st(s.storage,l,i),{project:l,source:"git-remote",gitIdentity:i,registry:"registered",registryProvider:s.providerName}}catch(c){throw wo(c)?c:new ne(c instanceof Error?c.message:String(c))}}import{existsSync as rr}from"node:fs";import{homedir as Zs}from"node:os";import{join as D}from"node:path";import{spawnSync as ec}from"node:child_process";import{homedir as Es}from"node:os";import{join as J}from"node:path";function Ro(e={}){return J(e.home??Es(),".gemini")}function Eo(e={}){return J(Ro(e),"antigravity-cli")}function Po(e={}){return J(Ro(e),"config")}function we(e={}){return J(Po(e),"mcp_config.json")}function Ce(e={}){let t=e.cwd??process.cwd();return J(t,".agents","mcp_config.json")}function xe(e="toolnet-memory",t={}){return J(Eo(t),"plugins",e)}function To(e={}){return[Eo(e),we(e),Po(e),Ce(e)]}import{homedir as Ao}from"node:os";import{join as F}from"node:path";function V(e={}){let t=process.env.OPENCODE_CONFIG_DIR?.trim();if(t)return t;let o=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return o?F(o,"opencode"):F(e.home??Ao(),".config","opencode")}function ct(e={}){let t=process.env.OPENCODE_CONFIG?.trim();if(t)return t;let o=e.home??Ao(),r=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return r?F(r,"opencode","opencode.json"):F(o,".config","opencode","opencode.json")}function at(e={}){let t=e.cwd??process.cwd();return F(t,"opencode.json")}function _o(e={}){return F(V(e),"plugins")}function No(e={}){return F(V(e),"AGENTS.md")}import{homedir as Mo}from"node:os";import{join as lt}from"node:path";function ut(e={}){return lt(e.home??Mo(),".claude")}function Fo(e={}){return lt(ut(e),"settings.json")}function $o(e={}){return lt(e.home??Mo(),".claude.json")}import{homedir as Ps}from"node:os";import{join as $}from"node:path";function dt(e={}){return e.kiroHome??process.env.KIRO_HOME??$(e.home??Ps(),".kiro")}function Ts(e={}){return $(dt(e),"settings")}function Oe(e={}){return $(Ts(e),"mcp.json")}function pt(e={}){let t=e.cwd??process.cwd();return $(t,".kiro","settings","mcp.json")}function As(e={}){return $(dt(e),"hooks")}function gt(e={}){return $(As(e),"toolnet-memory.json")}function mt(e={}){let t=e.cwd??process.cwd();return $(t,".kiro","hooks","toolnet-memory.json")}function Do(e={}){return[dt(e),Oe(e)]}import{homedir as _s}from"node:os";import{join as ft}from"node:path";function Ho(e={}){return ft(e.home??_s(),".toolnetcli")}function Ns(e={}){return ft(Ho(e),"config.json")}function Lo(e={}){let t=e.cwd??process.cwd();return ft(t,".toolnet","mcp.json")}function Ko(e={}){let t=Ho(e),o=Ns(e);return[t,o]}import{homedir as Ms}from"node:os";import{join as yt}from"node:path";function Jo(e={}){if(e.kiloHome)return e.kiloHome;if(process.env.KILO_HOME)return process.env.KILO_HOME;let t=e.xdgConfigHome??process.env.XDG_CONFIG_HOME;return t?yt(t,"kilo"):yt(e.home??Ms(),".config","kilo")}function ht(e={}){return yt(Jo(e),"kilo.jsonc")}function Vo(e={}){let t=Jo(e),o=ht(e);return[t,o]}import{homedir as Fs}from"node:os";import{join as R,resolve as $s}from"node:path";function Re(e={}){return e.cursorHome??R(e.home??Fs(),".cursor")}function Ds(e={}){return e.cursorConfigDir??process.env.CURSOR_CONFIG_DIR??(e.xdgConfigHome??process.env.XDG_CONFIG_HOME?R(e.xdgConfigHome??process.env.XDG_CONFIG_HOME,"cursor"):void 0)??Re(e)}function Ee(e={}){return R(Re(e),"mcp.json")}function Pe(e={}){return R(Re(e),"hooks.json")}function kt(e){return R($s(e),".cursor")}function Go(e){return R(kt(e),"mcp.json")}function Uo(e){return R(kt(e),"hooks.json")}function Hs(e){return R(kt(e),"rules")}function qo(e){return R(Hs(e),"toolnet-memory.mdc")}function Bo(e={}){return Array.from(new Set([Re(e),Ds(e)]))}import{homedir as Ls}from"node:os";import{join as O,resolve as Ks}from"node:path";function bt(e={}){return e.copilotHome??process.env.COPILOT_HOME??O(e.home??Ls(),".copilot")}function Te(e={}){return O(bt(e),"mcp-config.json")}function Js(e={}){return O(bt(e),"hooks")}function Ae(e={}){return O(Js(e),"toolnet-memory.json")}function St(e){return O(Ks(e),".github")}function Yo(e){return O(St(e),"mcp.json")}function Vs(e){return O(St(e),"hooks")}function zo(e){return O(Vs(e),"toolnet-memory.json")}function Gs(e){return O(St(e),"instructions")}function Wo(e){return O(Gs(e),"toolnet-memory.instructions.md")}function Qo(e={}){return[bt(e)]}import{homedir as Us}from"node:os";import{join as I,resolve as qs}from"node:path";function _e(e={}){return e.grokHome??process.env.GROK_HOME??I(e.home??Us(),".grok")}function Ne(e={}){return I(_e(e),"config.toml")}function Bs(e={}){return I(_e(e),"hooks")}function Me(e={}){return I(Bs(e),"toolnet-memory.json")}function Ys(e={}){return I(_e(e),"skills")}function zs(e={}){return I(Ys(e),"toolnet-continuity")}function Fe(e={}){return I(zs(e),"SKILL.md")}function It(e){return I(qs(e),".grok")}function Xo(e){return I(It(e),"config.toml")}function Ws(e){return I(It(e),"hooks")}function Zo(e){return I(Ws(e),"toolnet-memory.json")}function Qs(e){return I(It(e),"skills")}function Xs(e){return I(Qs(e),"toolnet-continuity")}function er(e){return I(Xs(e),"SKILL.md")}function tr(e={}){return[_e(e)]}function tc(e){return ec("sh",["-lc",`command -v ${JSON.stringify(e)} >/dev/null 2>&1`],{stdio:"ignore"}).status===0}function j(e){let t=e.commandExists(e.command),o=e.configPaths.filter(i=>rr(i)),r=o.length>0,n=[];t&&n.push(`command:${e.command}`);for(let i of o)n.push(`config:${i}`);return{agent:e.agent,detected:t||r,commandDetected:t,configDetected:r,evidence:n}}function or(e){let t=e.commands.filter(s=>e.commandExists(s)),o=e.configPaths.filter(s=>rr(s)),r=t.length>0,n=o.length>0,i=[...t.map(s=>`command:${s}`),...o.map(s=>`config:${s}`)];return{agent:e.agent,detected:r||n,commandDetected:r,configDetected:n,evidence:i}}function nr(e={}){let t=e.home??Zs(),o=e.commandExists??tc,r=e.codexHome??process.env.CODEX_HOME??D(t,".codex");return[j({agent:"agy",command:"agy",commandExists:o,configPaths:To({home:t})}),j({agent:"opencode",command:"opencode",commandExists:o,configPaths:[V({home:t,xdgConfigHome:e.xdgConfigHome})]}),j({agent:"claude",command:"claude",commandExists:o,configPaths:[ut({home:t})]}),j({agent:"kiro",command:"kiro-cli",commandExists:o,configPaths:Do({home:t,kiroHome:e.kiroHome})}),or({agent:"cursor",commands:["agent","cursor-agent"],commandExists:o,configPaths:Bo({home:t,cursorHome:e.cursorHome,cursorConfigDir:e.cursorConfigDir,xdgConfigHome:e.xdgConfigHome})}),j({agent:"copilot",command:"copilot",commandExists:o,configPaths:Qo({home:t,copilotHome:e.copilotHome})}),j({agent:"grok",command:"grok",commandExists:o,configPaths:tr({home:t,grokHome:e.grokHome})}),j({agent:"toolnet-cli",command:"toolnet",commandExists:o,configPaths:Ko({home:t})}),or({agent:"kilo",commands:["kilo","kilo-code"],commandExists:o,configPaths:Vo({home:t,kiloHome:e.kiloHome})}),j({agent:"codex",command:"codex",commandExists:o,configPaths:[r]}),j({agent:"goose",command:"goose",commandExists:o,configPaths:[D(t,".agents","plugins")]}),j({agent:"qwen",command:"qwen",commandExists:o,configPaths:[D(t,".qwen")]}),j({agent:"kimi",command:"kimi-code",commandExists:o,configPaths:[D(t,".kimi-code")]}),j({agent:"hermes",command:"hermes",commandExists:o,configPaths:[D(t,".hermes")]}),j({agent:"qoder",command:"qoder",commandExists:o,configPaths:[D(t,".qoder-cn"),D(t,".qoder")]})]}import{existsSync as Sc,mkdirSync as ur,readFileSync as Ic,renameSync as jc,writeFileSync as vc}from"node:fs";import{dirname as wc,join as De}from"node:path";import{existsSync as oc,mkdirSync as rc,readFileSync as nc,renameSync as ic,rmSync as sc,writeFileSync as cc}from"node:fs";import{dirname as ac,join as lc}from"node:path";function uc(e){return`'${e.replace(/'/g,"'\\''")}'`}function dc(e){if(!oc(e))return{};let t;try{t=JSON.parse(nc(e,"utf8"))}catch{throw new Error(`Invalid existing Agy hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Agy hooks.json at ${e}: root must be a JSON object.`);return t}function pc(e,t){rc(ac(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{cc(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),ic(o,e)}finally{sc(o,{force:!0})}}function ir(e={}){let t=e.pluginName??"toolnet-memory",o=e.hooksFile??lc(xe(t),"hooks.json"),r=dc(o),n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",i=`${uc(n)} session:agy-hook`;return r["toolnet-memory"]={enabled:!0,PreToolUse:[{matcher:"view_file|list_dir|find_by_name|grep_search|run_command",hooks:[{type:"command",command:`${i} pre-tool`,timeout:5}]}],PreInvocation:[{type:"command",command:`${i} pre`,timeout:15}],PostInvocation:[{type:"command",command:`${i} post`,timeout:15}],Stop:[{type:"command",command:`${i} stop`,timeout:30}]},pc(o,r),o}import{existsSync as gc,mkdirSync as mc,readFileSync as fc,renameSync as yc,writeFileSync as hc}from"node:fs";import{dirname as kc}from"node:path";function ie(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function bc(e,t){mc(kc(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;hc(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),yc(o,e)}function sr(e){if(!gc(e))return{};let t=fc(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Agy MCP config at ${e}: parse error. Not overwriting.`)}if(!ie(o))throw new Error(`Invalid existing Agy MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function cr(e,t){return ie(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function $e(e,t,o,r){let n=sr(e),i=n.mcpServers;if(i!==void 0&&!ie(i))throw new Error(`Invalid existing Agy MCP config: mcpServers must be an object in ${e}.`);let s=ie(i)?{...i}:{},c=s[o];if(cr(c,t)&&!r)return{installed:!0,changed:!1};s[o]={command:t,args:["mcp"]};let a={...n,mcpServers:s};bc(e,a);let u=sr(e).mcpServers;if(!ie(u)||!cr(u[o],t))throw new Error(`Agy MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function ar(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...$e(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(r==="both"){let s=we(),c=Ce({cwd:e.cwd}),a=$e(s,t,o,e.force??!1),l=$e(c,t,o,e.force??!1);return{installed:!0,changed:a.changed||l.changed,configFile:s,serverName:o,command:t,args:["mcp"]}}let n=r==="workspace"?Ce({cwd:e.cwd}):we();return{...$e(n,t,o,e.force??!1),configFile:n,serverName:o,command:t,args:["mcp"]}}var Cc=`# ToolNet Memory Continuity

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
`;function xc(e,t){ur(wc(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;vc(o,t,{encoding:"utf8",mode:384}),jc(o,e)}function lr(e,t){Sc(e)&&Ic(e,"utf8")===t||xc(e,t)}function dr(e={}){let t=e.pluginName??"toolnet-memory",o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.pluginRoot??xe(t),n=De(r,"plugin.json"),i=De(r,"mcp_config.json"),s=De(r,"hooks.json"),c=De(r,"rules","toolnet-memory-continuity.md");return ur(r,{recursive:!0,mode:448}),lr(n,`${JSON.stringify({$schema:"https://antigravity.google/schemas/v1/plugin.json",name:t,description:"Persistent project continuity and memory for Antigravity coding sessions."},null,2)}
`),ar({configFile:i,binary:o,serverName:"toolnet-memory",force:e.force}),ir({hooksFile:s,binary:o,pluginName:t}),lr(c,`${Cc.trim()}
`),{installed:!0,pluginRoot:r,files:[n,i,s,c]}}import{existsSync as Rc,mkdirSync as fr,readFileSync as Ec,writeFileSync as yr}from"node:fs";import{join as gr}from"node:path";var Oc="memory_agent_ask";function pr(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${Oc}

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
`.trim()}var mr="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",jt="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function Pc(e={}){let t=No();fr(V(),{recursive:!0});let o=`${mr}
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


${pr()}

${jt}`,r=Rc(t)?Ec(t,"utf8"):"",n=r.indexOf(mr),i=r.indexOf(jt);return n>=0&&i>=n?r=r.slice(0,n)+o+r.slice(i+jt.length):(r=r.trimEnd(),r&&(r+=`

`),r+=o),yr(t,r.trimEnd()+`
`,{encoding:"utf8",mode:384}),t}function hr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[];o.push(Pc({cwd:e.cwd}));let r=e.scope??"global",n=[];if((r==="global"||r==="both")&&n.push(e.directory??_o()),r==="project"||r==="both"){let i=e.cwd??process.cwd();n.push(gr(i,".opencode","plugins"))}for(let i of n){fr(i,{recursive:!0});let s=gr(i,"toolnet-memory.js"),c=`
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
`;yr(s,c.trimStart(),{encoding:"utf8",mode:384}),o.push(s)}return o}import{existsSync as Sr,mkdirSync as Tc,readFileSync as Ac,renameSync as _c,writeFileSync as Nc}from"node:fs";import{dirname as Ir,join as Mc}from"node:path";function se(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Fc(e,t){Tc(Ir(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;Nc(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),_c(o,e)}function kr(e){if(!Sr(e))return{};let t=Ac(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing OpenCode config at ${e}: parse error. Not overwriting.`)}if(!se(o))throw new Error(`Invalid existing OpenCode config at ${e}: root must be a JSON object. Not overwriting.`);return o}function br(e,t){if(!se(e))return!1;let o=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(o)&&o.length===2&&o[0]===t&&o[1]==="mcp"}function He(e,t,o,r){let n=Mc(Ir(e),"opencode.jsonc"),i=Sr(n)?n:void 0,s=kr(e),c=s.mcp;if(c!==void 0&&!se(c))throw new Error(`Invalid existing OpenCode config: mcp must be an object in ${e}.`);let a=se(c)?{...c}:{},l=a[o];if(br(l,t)&&!r)return{installed:!0,changed:!1,preservedJsonc:i};a[o]={type:"local",command:[t,"mcp"],enabled:!0};let u={...s,mcp:a};Fc(e,u);let d=kr(e);if(!se(d.mcp)||!br(d.mcp[o],t))throw new Error(`OpenCode MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0,preservedJsonc:i}}function jr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...He(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:[t,"mcp"]};if(r==="both"){let s=ct(),c=at({cwd:e.cwd}),a=He(s,t,o,e.force??!1),l=He(c,t,o,e.force??!1);return{installed:!0,changed:a.changed||l.changed,configFile:s,serverName:o,command:[t,"mcp"],preservedJsonc:a.preservedJsonc??l.preservedJsonc}}let n=r==="project"?at({cwd:e.cwd}):ct();return{...He(n,t,o,e.force??!1),configFile:n,serverName:o,command:[t,"mcp"]}}import{existsSync as $c,mkdirSync as vr,readFileSync as Dc,writeFileSync as wr}from"node:fs";import{homedir as Cr}from"node:os";import{dirname as xr,join as vt}from"node:path";function Hc(e){let t=[],o=/"((?:\\.|[^"\\])*)"|'([^']*)'/g,r;for(;r=o.exec(e);){let n=r[1]??r[2]??"";try{t.push(r[1]!==void 0?JSON.parse(`"${n}"`):n)}catch{t.push(n)}}return t}function Or(e={}){let t=e.configFile??vt(process.env.CODEX_HOME??vt(Cr(),".codex"),"config.toml"),o=e.previousFile??vt(Cr(),".config","toolnet-memory","codex-notify-previous.json");vr(xr(t),{recursive:!0}),vr(xr(o),{recursive:!0});let r=$c(t)?Dc(t,"utf8"):"",n=e.binary??"toolnet-memory",i=`notify = [${JSON.stringify(n)}, "session:codex-notify"]`,s=r.split(`
`),c=s.findIndex(p=>/^\s*\[/.test(p));c<0&&(c=s.length);let a=-1,l=-1;for(let p=0;p<c;p+=1)if(/^\s*notify\s*=/.test(s[p])){if(a=p,l=p,s[p].includes("[")&&!s[p].includes("]"))for(;l+1<c&&(l+=1,!s[l].includes("]")););break}let u=[];if(a>=0){let p=s.slice(a,l+1).join(`
`);u=Hc(p),s.splice(a,l-a+1,i)}else c=s.findIndex(p=>/^\s*\[/.test(p)),c<0&&(c=s.length),s.splice(c,0,i);let d=u.length>=2&&u[u.length-1]==="session:codex-notify";return u.length>0&&!d&&wr(o,JSON.stringify(u,null,2)+`
`,{encoding:"utf8",mode:384}),r=s.join(`
`),r.endsWith(`
`)||(r+=`
`),wr(t,r,{encoding:"utf8",mode:384}),{configFile:t,previousFile:o,preservedPrevious:u.length>0&&!d}}import{existsSync as Lc,mkdirSync as Kc,readFileSync as Jc,writeFileSync as Vc}from"node:fs";import{homedir as Gc}from"node:os";import{dirname as Uc,join as Rr}from"node:path";function qc(e){return`'${e.replace(/'/g,"'\\''")}'`}function Er(e={}){let t=e.hooksFile??Rr(process.env.CODEX_HOME??Rr(Gc(),".codex"),"hooks.json");Kc(Uc(t),{recursive:!0});let o={};if(Lc(t))try{o=JSON.parse(Jc(t,"utf8"))}catch(c){throw new Error(`Invalid existing Codex hooks.json: ${c instanceof Error?c.message:String(c)}`)}let r=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=r;let i=(Array.isArray(r.SessionStart)?r.SessionStart:[]).filter(c=>{try{return!JSON.stringify(c).includes("session:codex-context")}catch{return!0}}),s=e.binary??"toolnet-memory";return i.push({matcher:"startup|resume|clear|compact",hooks:[{type:"command",command:`${qc(s)} session:codex-context`,timeout:15,additionalContextLimit:1e3,statusMessage:"Loading ToolNet project continuity"}]}),r.SessionStart=i,Vc(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),t}import{existsSync as Pr,mkdirSync as Bc,readFileSync as Tr,writeFileSync as Yc}from"node:fs";import{homedir as zc}from"node:os";import{dirname as Wc,join as Ar}from"node:path";function _r(e){return`'${e.replace(/'/g,"'\\''")}'`}function Nr(e={}){let t=e.hooksFile??Ar(process.env.CODEX_HOME??Ar(zc(),".codex"),"hooks.json");Bc(Wc(t),{recursive:!0});let o={};if(Pr(t))try{o=JSON.parse(Tr(t,"utf8"))}catch{throw new Error(`Invalid existing Codex hooks.json at ${t}: parse error. Not overwriting.`)}let r=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=r;let n=e.binary??"toolnet-memory",i=`${_r(n)} session:codex-stop-hook`,s=`${_r(n)} session:codex-session-end`,c={hooks:[{type:"command",command:i,timeout:30}]},a={hooks:[{type:"command",command:s,timeout:3}]},u=(Array.isArray(r.Stop)?r.Stop:[]).filter(C=>{try{return!JSON.stringify(C).includes("session:codex-stop-hook")}catch{return!0}}),p=(Array.isArray(r.SessionEnd)?r.SessionEnd:[]).filter(C=>{try{return!JSON.stringify(C).includes("session:codex-session-end")}catch{return!0}});r.Stop=[...u,c],r.SessionEnd=[...p,a];let g=JSON.stringify(o,null,2)+`
`,w=!Pr(t)||Tr(t,"utf8")!==g;return Yc(t,g,{encoding:"utf8",mode:384}),{hooksFile:t,changed:w,stopInstalled:!0,sessionEndInstalled:!0}}import{spawnSync as Qc}from"node:child_process";function wt(e,t){return Qc(e,t,{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}function Mr(e,t){let o=wt(e,["mcp","get",t,"--json"]);if(o.status!==0||!o.stdout)return null;try{return JSON.parse(o.stdout)}catch{return null}}function Fr(e,t){return e.enabled!==!1&&e.transport?.type==="stdio"&&e.transport?.command===t&&Array.isArray(e.transport?.args)&&e.transport?.args.length===1&&e.transport.args[0]==="mcp"}function $r(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.codexBinary??"codex",r=e.serverName??"toolnet-memory",n=Mr(o,r);if(n&&Fr(n,t))return{installed:!0,changed:!1,serverName:r,command:t,args:["mcp"]};if(n){let c=wt(o,["mcp","remove",r]);if(c.status!==0)return{installed:!1,changed:!1,serverName:r,command:t,args:["mcp"],error:(c.stderr||c.stdout||"Unable to remove old ToolNet MCP configuration.").trim()}}let i=wt(o,["mcp","add",r,"--",t,"mcp"]);if(i.status!==0)return{installed:!1,changed:!1,serverName:r,command:t,args:["mcp"],error:(i.stderr||i.stdout||"Unable to register ToolNet MCP.").trim()};let s=Mr(o,r);return!s||!Fr(s,t)?{installed:!1,changed:!0,serverName:r,command:t,args:["mcp"],error:"Codex accepted MCP registration but verification did not match expected ToolNet command."}:{installed:!0,changed:!0,serverName:r,command:t,args:["mcp"]}}import{existsSync as Xc,mkdirSync as Zc,readFileSync as ea,renameSync as ta,rmSync as oa,writeFileSync as ra}from"node:fs";import{dirname as na}from"node:path";function ce(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function ia(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function sa(e){if(!Xc(e))return{};let t;try{t=JSON.parse(ea(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude settings.json: ${o instanceof Error?o.message:String(o)}`)}if(!ce(t))throw new Error("Invalid existing Claude settings.json: root must be a JSON object.");return t}function Le(e){if(e===void 0)return[];if(!Array.isArray(e))throw new Error("Invalid existing Claude settings.json: hook event must be an array.");let t=[];for(let o of e){if(!ce(o)){t.push(o);continue}let r=o.hooks;if(!Array.isArray(r)){t.push(o);continue}let n=r.filter(i=>{if(!ce(i))return!0;let s=i.command;return!(typeof s=="string"&&s.includes("session:claude-hook"))});n.length!==0&&t.push({...o,hooks:n})}return t}function Ke(e,t=10){return{type:"command",command:e,timeout:t}}function ca(e,t){Zc(na(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{ra(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),ta(o,e)}finally{oa(o,{force:!0})}}function Dr(e={}){let t=e.settingsFile??Fo(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=sa(t),n=r.hooks;if(n!==void 0&&!ce(n))throw new Error("Invalid existing Claude settings.json: hooks must be an object.");let i=ce(n)?{...n}:{},s=`${ia(o)} session:claude-hook`,c=Le(i.SessionStart);c.push({matcher:"startup|resume|clear|compact",hooks:[Ke(s)]}),i.SessionStart=c;let a=Le(i.UserPromptSubmit);a.push({hooks:[Ke(s)]}),i.UserPromptSubmit=a;let l=Le(i.PostToolUse);l.push({matcher:"Edit|Write",hooks:[Ke(s)]}),i.PostToolUse=l;let u=Le(i.Stop);u.push({hooks:[Ke(s,30)]}),i.Stop=u;let d={...r,hooks:i},p=JSON.stringify(r),g=JSON.stringify(d);return p===g?{settingsFile:t,changed:!1}:e.dryRun===!0?{settingsFile:t,changed:!0,dryRun:!0}:(ca(t,d),{settingsFile:t,changed:!0})}import{existsSync as aa,mkdirSync as la,readFileSync as ua,renameSync as da,rmSync as pa,writeFileSync as ga}from"node:fs";import{dirname as ma}from"node:path";function ae(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Hr(e){if(!aa(e))return{};let t;try{t=JSON.parse(ua(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude Code config: ${o instanceof Error?o.message:String(o)}`)}if(!ae(t))throw new Error("Invalid existing Claude Code config: root must be a JSON object.");return t}function Lr(e,t){if(!ae(e))return!1;let o=e.args;return e.type==="stdio"&&e.command===t&&Array.isArray(o)&&o.length===1&&o[0]==="mcp"}function fa(e,t){la(ma(e),{recursive:!0});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{ga(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),da(o,e)}finally{pa(o,{force:!0})}}function Kr(e={}){let t=e.stateFile??$o(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=Hr(t),i=n.mcpServers;if(i!==void 0&&!ae(i))throw new Error("Invalid existing Claude Code config: mcpServers must be an object.");let s=ae(i)?{...i}:{},c=s[r];if(Lr(c,o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:[o,"mcp"],repaired:!1};let a=c!==void 0;if(s[r]={type:"stdio",command:o,args:["mcp"]},e.dryRun===!0)return{installed:!0,changed:!0,configFile:t,serverName:r,command:[o,"mcp"],repaired:a,dryRun:!0};fa(t,{...n,mcpServers:s});let u=Hr(t).mcpServers;if(!ae(u)||!Lr(u[r],o))throw new Error("Claude Code MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:[o,"mcp"],repaired:a}}function Jr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=Dr({binary:t,settingsFile:e.settingsFile,...e.dryRun!==void 0?{dryRun:e.dryRun}:{}}),r=Kr({binary:t,stateFile:e.stateFile,...e.dryRun!==void 0?{dryRun:e.dryRun}:{}});return{hooks:o,mcp:r,files:[o.settingsFile,r.configFile]}}import{existsSync as ya,mkdirSync as ha,readFileSync as ka,renameSync as ba,rmSync as Sa,writeFileSync as Ia}from"node:fs";import{dirname as ja}from"node:path";var G="ToolNet Memory - ";function Ur(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function va(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function Vr(e){if(!ya(e))return{};let t=ka(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro hooks file at ${e}: parse error. Not overwriting.`)}if(!Ur(o))throw new Error(`Invalid existing Kiro hooks file at ${e}: root must be a JSON object. Not overwriting.`);return o}function Gr(e){return Ur(e)?typeof e.name=="string"&&e.name.startsWith(G):!1}function le(e){return{type:"command",command:e}}function wa(e){return[{name:`${G}Session Start`,description:"Inject compact local ToolNet continuity and capture Kiro session activation.",trigger:"SessionStart",action:le(e),timeout:10,enabled:!0},{name:`${G}Prompt Continuity`,description:"Capture prompts and refresh ToolNet guidance only for resume/continue requests.",trigger:"UserPromptSubmit",action:le(e),timeout:10,enabled:!0},{name:`${G}Raw History Guard`,description:"Prevent Kiro from reconstructing continuity from raw ToolNet/agent session history.",trigger:"PreToolUse",matcher:"*",action:le(e),timeout:10,enabled:!0},{name:`${G}Tool Capture`,description:"Capture durable tool activity while filtering noisy read-only events.",trigger:"PostToolUse",matcher:"*",action:le(e),timeout:15,enabled:!0},{name:`${G}Final Flush`,description:"Flush pending Kiro WAL events when the assistant finishes a turn.",trigger:"Stop",action:le(e),timeout:30,enabled:!0}]}function Ca(e,t){ha(ja(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Ia(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),ba(o,e)}finally{Sa(o,{force:!0})}}function Je(e,t,o){let r=Vr(e);if(r.version!==void 0&&r.version!=="v1")throw new Error(`Unsupported existing Kiro hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!Array.isArray(n))throw new Error("Invalid existing Kiro hooks file: hooks must be an array.");let i=Array.isArray(n)?n.filter(l=>!Gr(l)):[],s=wa(t),c={...r,version:"v1",hooks:[...i,...s]};if(!o&&JSON.stringify(r)===JSON.stringify(c))return{changed:!1,hookCount:s.length};Ca(e,c);let a=Vr(e);if(a.version!=="v1"||!Array.isArray(a.hooks)||a.hooks.filter(Gr).length!==s.length)throw new Error("Kiro hooks were written but verification failed.");return{changed:!0,hookCount:s.length}}function qr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=`${va(t)} session:kiro-hook`;if(e.hooksFile){let s=Je(e.hooksFile,r,e.force??!1);return{hooksFile:e.hooksFile,...s}}if(o==="both"){let s=gt(),c=mt({cwd:e.cwd}),a=Je(s,r,e.force??!1),l=Je(c,r,e.force??!1);return{hooksFile:s,changed:a.changed||l.changed,hookCount:a.hookCount}}let n=o==="project"?mt({cwd:e.cwd}):gt(),i=Je(n,r,e.force??!1);return{hooksFile:n,...i}}import{existsSync as xa,mkdirSync as Oa,readFileSync as Ra,renameSync as Ea,rmSync as Pa,writeFileSync as Ta}from"node:fs";import{dirname as Aa}from"node:path";function ue(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Br(e){if(!xa(e))return{};let t=Ra(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro MCP config at ${e}: parse error. Not overwriting.`)}if(!ue(o))throw new Error(`Invalid existing Kiro MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Yr(e,t){return ue(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&e.disabled===!1:!1}function _a(e,t){Oa(Aa(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Ta(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Ea(o,e)}finally{Pa(o,{force:!0})}}function Ve(e,t,o,r){let n=Br(e),i=n.mcpServers;if(i!==void 0&&!ue(i))throw new Error(`Invalid existing Kiro MCP config: mcpServers must be an object in ${e}.`);let s=ue(i)?{...i}:{},c=s[o];if(Yr(c,t)&&!r)return{installed:!0,changed:!1};s[o]={command:t,args:["mcp"],disabled:!1};let a={...n,mcpServers:s};_a(e,a);let u=Br(e).mcpServers;if(!ue(u)||!Yr(u[o],t))throw new Error(`Kiro MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function zr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...Ve(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(r==="both"){let s=Oe(),c=pt({cwd:e.cwd}),a=Ve(s,t,o,e.force??!1),l=Ve(c,t,o,e.force??!1);return{installed:!0,changed:a.changed||l.changed,configFile:s,serverName:o,command:t,args:["mcp"]}}let n=r==="project"?pt({cwd:e.cwd}):Oe();return{...Ve(n,t,o,e.force??!1),configFile:n,serverName:o,command:t,args:["mcp"]}}function Wr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=zr({binary:t,configFile:e.configFile,scope:e.scope,cwd:e.cwd,force:e.force}),r=qr({binary:t,hooksFile:e.hooksFile,scope:e.scope,cwd:e.cwd,force:e.force});return{installed:o.installed,changed:o.changed||r.changed,mcp:o,hooks:r,files:[o.configFile,r.hooksFile]}}import{existsSync as Na,mkdirSync as Ma,readFileSync as Fa,renameSync as $a,rmSync as Da,writeFileSync as Ha}from"node:fs";import{dirname as La}from"node:path";function Ct(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Ka(e){if(!Na(e))return{};let t=Fa(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: parse error. Not overwriting.`)}if(!Ct(o))throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Ja(e,t){Ma(La(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Ha(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),$a(o,e)}finally{Da(o,{force:!0})}}function Qr(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??Lo({cwd:e.cwd}),r=Ka(o),n="toolnet-memory";if(Ct(r.mcpServers)&&r.mcpServers[n]!=null&&!e.force)return{installed:!0,changed:!1,configFile:o};let s=Ct(r.mcpServers)?{...r.mcpServers}:{};return s[n]={command:t,args:["mcp"]},r.mcpServers=s,Ja(o,r),{installed:!0,changed:!0,configFile:o}}function Xr(e={}){let t=e.binary??"toolnet-memory",o=Qr({binary:t,configFile:e.configFile,force:e.force,cwd:e.cwd});return{installed:o.installed,changed:o.changed,mcp:{...o,configured:o.installed},files:[o.configFile]}}import{mkdirSync as Wa,existsSync as Qa}from"node:fs";import{dirname as Xa}from"node:path";import{existsSync as Va,mkdirSync as Ga,readFileSync as Ua,renameSync as qa,rmSync as Ba,writeFileSync as Ya}from"node:fs";import{dirname as za}from"node:path";function b(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function A(e,t){if(!Va(e))return{};let o=Ua(e,"utf8").trim();if(!o)return{};let r;try{r=JSON.parse(o)}catch(n){throw new Error(`Invalid existing ${t} MCP config: ${n instanceof Error?n.message:String(n)}`)}if(!b(r))throw new Error(`Invalid existing ${t} MCP config: root must be a JSON object.`);return r}function U(e,t){Ga(za(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Ya(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),qa(o,e)}finally{Ba(o,{force:!0})}}function Zr(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??ht(),r=Xa(o);Qa(r)||Wa(r,{recursive:!0});let n=A(o,"Kilo"),i=n.mcp;if(i!==void 0&&!b(i))throw new Error("Invalid existing Kilo config: mcp must be an object.");let s=b(i)?{...i}:{},c="toolnet-memory";return b(s[c])&&!e.force?{installed:!0,changed:!1,configFile:o,configured:!0}:(s[c]={type:"local",command:[t,"mcp"],enabled:!0,timeout:1e4},U(o,{...n,mcp:s}),{installed:!0,changed:!0,configFile:o,configured:!0})}function en(e={}){let t=e.binary??"toolnet-memory",o=Zr({binary:t,configFile:e.configFile,force:e.force});return{installed:o.installed,changed:o.changed,mcp:o,files:[o.configFile]}}import{existsSync as Za,mkdirSync as el,readFileSync as tl,renameSync as ol,rmSync as rl,writeFileSync as nl}from"node:fs";import{dirname as il}from"node:path";function y(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function E(e,t){if(!Za(e))return{};let o=tl(e,"utf8").trim();if(!o)return{};let r;try{r=JSON.parse(o)}catch(n){throw new Error(`Invalid existing ${t} hooks file: ${n instanceof Error?n.message:String(n)}`)}if(!y(r))throw new Error(`Invalid existing ${t} hooks file: root must be a JSON object.`);return r}function q(e,t){el(il(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{nl(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),ol(o,e)}finally{rl(o,{force:!0})}}function xt(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}var de=[["sessionStart",10],["beforeSubmitPrompt",10],["preToolUse",10],["postToolUse",15],["afterAgentResponse",15],["stop",30]];function tn(e){return y(e)&&typeof e.command=="string"&&e.command.includes("session:cursor-hook")}function sl(e,t,o){let n={type:"command",command:`TOOLNET_HOOK_EVENT=${xt(e)} ${xt(t)} session:cursor-hook`,timeout:o};return e==="preToolUse"&&(n.matcher=".*"),n}function Ot(e={}){let t=e.hooksFile??Pe(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=E(t,"Cursor");if(r.version!==void 0&&r.version!==1)throw new Error(`Unsupported existing Cursor hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!y(n))throw new Error("Invalid existing Cursor hooks file: hooks must be an object.");let i=y(n)?{...n}:{};for(let[l,u]of de){let d=i[l];if(d!==void 0&&!Array.isArray(d))throw new Error(`Invalid existing Cursor hooks file: hooks.${l} must be an array.`);let p=Array.isArray(d)?d.filter(g=>!tn(g)):[];i[l]=[...p,sl(l,o,u)]}let s={...r,version:1,hooks:i};if(JSON.stringify(r)===JSON.stringify(s))return{hooksFile:t,changed:!1,hookCount:de.length};q(t,s);let c=E(t,"Cursor");if(c.version!==1||!y(c.hooks))throw new Error("Cursor hooks were written but verification failed.");let a=0;for(let[l]of de){let u=c.hooks[l];if(!Array.isArray(u))throw new Error("Cursor hooks were written but verification failed.");a+=u.filter(tn).length}if(a!==de.length)throw new Error("Cursor hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:de.length}}function on(e,t){return b(e)?(e.type===void 0||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function Rt(e={}){let t=e.configFile??Ee(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=A(t,"Cursor"),i=n.mcpServers;if(i!==void 0&&!b(i))throw new Error("Invalid existing Cursor MCP config: mcpServers must be an object.");let s=b(i)?{...i}:{};if(on(s[r],o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};s[r]={type:"stdio",command:o,args:["mcp"]},U(t,{...n,mcpServers:s});let a=A(t,"Cursor").mcpServers;if(!b(a)||!on(a[r],o))throw new Error("Cursor MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}import{mkdirSync as cl,readFileSync as rn,renameSync as al,rmSync as ll,writeFileSync as ul}from"node:fs";import{dirname as dl}from"node:path";var Et=`---
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
`;function pl(e,t){cl(dl(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{ul(o,t,{encoding:"utf8",mode:384}),al(o,e)}finally{ll(o,{force:!0})}}function nn(e){let t=e.ruleFile??qo(e.projectRoot);try{if(rn(t,"utf8")===Et)return{ruleFile:t,changed:!1}}catch{}if(pl(t,Et),rn(t,"utf8")!==Et)throw new Error("Cursor ToolNet project rule was written but verification failed.");return{ruleFile:t,changed:!0}}import{spawnSync as gl}from"node:child_process";import{existsSync as B,statSync as ml}from"node:fs";import{dirname as fl,join as yl,parse as hl,resolve as Tt}from"node:path";function sn(e){let t=Tt(e);if(!B(t))throw new Error(`Project path does not exist: ${t}`);if(!ml(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);return t}function Ge(e){return yl(e,".toolnet","project.json")}function kl(e){let t=Tt(e),o=hl(t).root;for(;;){if(B(Ge(t)))return t;if(t===o)return;let r=fl(t);if(r===t)return;t=r}}function Pt(e){let t=gl("git",["rev-parse","--show-toplevel"],{cwd:e,encoding:"utf8",timeout:5e3});if(t.status!==0)return;let o=t.stdout.trim();return o?Tt(o):void 0}function P(e={}){let t=sn(e.cwd??process.cwd());if(e.project){let n=sn(e.project),i=Ge(n),s=Pt(n);return{root:n,source:"explicit",eligible:!0,toolnetProject:B(i),manifestFile:B(i)?i:void 0,gitRoot:s}}let o=kl(t);if(o){let n=Ge(o);return{root:o,source:"toolnet",eligible:!0,toolnetProject:!0,manifestFile:n,gitRoot:Pt(o)}}let r=Pt(t);if(r){let n=Ge(r);return{root:r,source:"git",eligible:!0,toolnetProject:B(n),manifestFile:B(n)?n:void 0,gitRoot:r}}return{root:t,source:"cwd",eligible:!1,toolnetProject:!1}}function un(e,t={}){let o=[],r=e.indexOf("--scope");if(r>=0){let i=e[r+1];if(i!=="global"&&i!=="project"&&i!=="both")throw new Error(`Invalid --scope value: ${String(i)}`);o.push(i)}e.includes("--global")&&o.push("global"),e.includes("--both")&&o.push("both");let n=Array.from(new Set(o));if(n.length>1)throw new Error(`Conflicting integration scopes: ${n.join(", ")}`);return n[0]??t.defaultScope??"global"}function cn(e,t){return{install:e,effective:t}}function T(e,t){return{surface:e,global:cn(t.globalInstall,t.effective==="global"||t.effective==="both"),project:cn(t.projectInstall,t.effective==="project"||t.effective==="both"),effective:t.effective,risk:t.risk??"none",dedupeRequired:t.dedupeRequired??!1,trustRequired:t.trustRequired??t.projectInstall,note:t.note}}function bl(e){return{mcp:T("mcp",{globalInstall:!0,projectInstall:!1,effective:"global"}),hooks:T("hooks",{globalInstall:!0,projectInstall:!1,effective:"global"}),work:T("work",{globalInstall:e==="grok",projectInstall:!1,effective:e==="grok"?"global":"none",note:e==="grok"?"Grok supports a global ToolNet continuity skill.":"Cursor/Copilot work instructions remain project-scoped."})}}function an(e){return{mcp:T("mcp",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),hooks:T("hooks",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),work:T("work",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!1,note:e==="cursor"?"Use .cursor/rules/toolnet-memory.mdc.":e==="copilot"?"Use .github/instructions/toolnet-memory.instructions.md.":"Use .grok/skills/toolnet-continuity/SKILL.md."})}}function ln(e){return{mcp:T("mcp",{globalInstall:!0,projectInstall:!0,effective:"project",risk:e==="cursor"?"precedence-unverified":"shadowed-global",trustRequired:!0,note:e==="cursor"?"Project ToolNet MCP is the intended effective definition; native same-name precedence must be E2E certified before release.":"Global remains useful outside the project; same-name project definition wins inside the project."}),hooks:T("hooks",{globalInstall:!0,projectInstall:!0,effective:"both",risk:"additive-duplicate",dedupeRequired:!0,trustRequired:!0,note:"Global and project hook sources can both execute for the same native event."}),work:T("work",{globalInstall:e==="grok",projectInstall:!0,effective:"project",risk:e==="grok"?"shadowed-global":"none",trustRequired:!1,note:e==="cursor"?"Project rule is authoritative.":e==="copilot"?"Project instruction is authoritative.":"Project skill shadows the same-name global skill inside the project."})}}function Y(e){let{agent:t,scope:o,project:r}=e;return(o==="project"||o==="both")&&(!r||!r.eligible)?{agent:t,requestedScope:o,project:r,surfaces:o==="both"?ln(t):an(t),canInstall:!1,reason:"Project scope requires an explicit project, existing ToolNet project, or Git repository root."}:{agent:t,requestedScope:o,project:r,surfaces:o==="global"?bl(t):o==="project"?an(t):ln(t),canInstall:!0}}function dn(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.rule?.changed)}function pn(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:P({project:e.projectRoot}),n=Y({agent:"cursor",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Cursor project integration scope cannot be resolved.");let i,s;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(i={},n.surfaces.mcp.global.install&&(i.mcp=Rt({binary:t,configFile:e.configFile??Ee()})),n.surfaces.hooks.global.install&&(i.hooks=Ot({binary:t,hooksFile:e.hooksFile??Pe()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Cursor project integration requires an eligible project root.");s={},n.surfaces.mcp.project.install&&(s.mcp=Rt({binary:t,configFile:e.projectConfigFile??Go(r.root)})),n.surfaces.hooks.project.install&&(s.hooks=Ot({binary:t,hooksFile:e.projectHooksFile??Uo(r.root)})),n.surfaces.work.project.install&&(s.rule=nn({projectRoot:r.root,ruleFile:e.projectRuleFile}))}let c=s?.mcp??i?.mcp,a=s?.hooks??i?.hooks;if(!c||!a)throw new Error("Cursor integration did not produce an effective MCP/hooks installation.");let l=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.rule?.ruleFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.rule?.ruleFile].filter(u=>typeof u=="string")));return{installed:!0,changed:dn(i)||dn(s),scope:o,plan:n,project:r,global:i,projectScope:s,mcp:c,hooks:a,rule:s?.rule,files:l}}var pe=[["sessionStart",10],["userPromptSubmitted",10],["userPromptTransformed",10],["preToolUse",10],["postToolUse",15],["agentStop",30]];function Sl(e){if(typeof e.command=="string")return e.command;if(typeof e.bash=="string")return e.bash}function gn(e){return y(e)&&Sl(e)?.includes("session:copilot-hook")===!0}function Il(e,t,o){let r={type:"command",command:`${t} session:copilot-hook`,env:{TOOLNET_HOOK_EVENT:e},timeoutSec:o};return e==="preToolUse"&&(r.matcher=".*"),r}function At(e={}){let t=e.hooksFile??Ae(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=E(t,"GitHub Copilot CLI");if(r.version!==void 0&&r.version!==1)throw new Error(`Unsupported existing GitHub Copilot CLI hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!y(n))throw new Error("Invalid existing GitHub Copilot CLI hooks file: hooks must be an object.");let i=y(n)?{...n}:{};for(let[l,u]of pe){let d=i[l];if(d!==void 0&&!Array.isArray(d))throw new Error(`Invalid existing GitHub Copilot CLI hooks file: hooks.${l} must be an array.`);let p=Array.isArray(d)?d.filter(g=>!gn(g)):[];i[l]=[...p,Il(l,o,u)]}let s={...r,version:1,hooks:i};if(JSON.stringify(r)===JSON.stringify(s))return{hooksFile:t,changed:!1,hookCount:pe.length};q(t,s);let c=E(t,"GitHub Copilot CLI");if(c.version!==1||!y(c.hooks))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");let a=0;for(let[l]of pe){let u=c.hooks[l];if(!Array.isArray(u))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");a+=u.filter(gn).length}if(a!==pe.length)throw new Error("GitHub Copilot CLI hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:pe.length}}function mn(e,t){return b(e)?(e.type===void 0||e.type==="local"||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&Array.isArray(e.tools)&&e.tools.length===1&&e.tools[0]==="*":!1}function _t(e={}){let t=e.configFile??Te(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=A(t,"GitHub Copilot CLI"),i=n.mcpServers;if(i!==void 0&&!b(i))throw new Error("Invalid existing GitHub Copilot CLI MCP config: mcpServers must be an object.");let s=b(i)?{...i}:{};if(mn(s[r],o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};s[r]={type:"stdio",command:o,args:["mcp"],tools:["*"]},U(t,{...n,mcpServers:s});let a=A(t,"GitHub Copilot CLI").mcpServers;if(!b(a)||!mn(a[r],o))throw new Error("GitHub Copilot CLI MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}import{mkdirSync as jl,readFileSync as fn,renameSync as vl,rmSync as wl,writeFileSync as Cl}from"node:fs";import{dirname as xl}from"node:path";var Nt=`---
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
`;function Ol(e,t){jl(xl(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Cl(o,t,{encoding:"utf8",mode:384}),vl(o,e)}finally{wl(o,{force:!0})}}function yn(e){let t=e.instructionFile??Wo(e.projectRoot);try{if(fn(t,"utf8")===Nt)return{instructionFile:t,changed:!1}}catch{}if(Ol(t,Nt),fn(t,"utf8")!==Nt)throw new Error("Copilot ToolNet project instruction verification failed.");return{instructionFile:t,changed:!0}}function hn(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.instruction?.changed)}function kn(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:P({project:e.projectRoot}),n=Y({agent:"copilot",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Copilot project integration scope cannot be resolved.");let i,s;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(i={},n.surfaces.mcp.global.install&&(i.mcp=_t({binary:t,configFile:e.configFile??Te()})),n.surfaces.hooks.global.install&&(i.hooks=At({binary:t,hooksFile:e.hooksFile??Ae()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Copilot project integration requires an eligible project root.");s={},n.surfaces.mcp.project.install&&(s.mcp=_t({binary:t,configFile:e.projectConfigFile??Yo(r.root)})),n.surfaces.hooks.project.install&&(s.hooks=At({binary:t,hooksFile:e.projectHooksFile??zo(r.root)})),n.surfaces.work.project.install&&(s.instruction=yn({projectRoot:r.root,instructionFile:e.projectInstructionFile}))}let c=s?.mcp??i?.mcp,a=s?.hooks??i?.hooks;if(!c||!a)throw new Error("Copilot integration did not produce effective MCP/hooks.");let l=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.instruction?.instructionFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.instruction?.instructionFile].filter(u=>typeof u=="string")));return{installed:!0,changed:hn(i)||hn(s),scope:o,plan:n,project:r,global:i,projectScope:s,mcp:c,hooks:a,instruction:s?.instruction,files:l}}import{existsSync as Rl,mkdirSync as El,readFileSync as bn,renameSync as Pl,rmSync as Tl,writeFileSync as Al}from"node:fs";import{dirname as _l}from"node:path";var Mt=`---
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
`;function Nl(e,t){El(_l(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Al(o,t,{encoding:"utf8",mode:384}),Pl(o,e)}finally{Tl(o,{force:!0})}}function Ft(e={}){let t=e.skillFile??Fe();if(Rl(t)&&bn(t,"utf8")===Mt)return{skillFile:t,changed:!1};if(Nl(t,Mt),bn(t,"utf8")!==Mt)throw new Error("Grok ToolNet continuity skill was written but verification failed.");return{skillFile:t,changed:!0}}var ge=[["SessionStart",10],["UserPromptSubmit",10],["PreToolUse",10],["PostToolUse",15],["Stop",30]];function Sn(e){return!y(e)||!Array.isArray(e.hooks)?!1:e.hooks.some(t=>y(t)&&typeof t.command=="string"&&t.command.includes("session:grok-hook"))}function Ml(e,t,o){let r={hooks:[{type:"command",command:`${t} session:grok-hook`,timeout:o,env:{TOOLNET_HOOK_EVENT:e}}]};return e==="PreToolUse"&&(r.matcher=".*"),r}function $t(e={}){let t=e.hooksFile??Me(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=E(t,"Grok Build"),n=r.hooks;if(n!==void 0&&!y(n))throw new Error("Invalid existing Grok Build hooks file: hooks must be an object.");let i=y(n)?{...n}:{};for(let[l,u]of ge){let d=i[l];if(d!==void 0&&!Array.isArray(d))throw new Error(`Invalid existing Grok Build hooks file: hooks.${l} must be an array.`);let p=Array.isArray(d)?d.filter(g=>!Sn(g)):[];i[l]=[...p,Ml(l,o,u)]}let s={...r,hooks:i};if(JSON.stringify(r)===JSON.stringify(s))return{hooksFile:t,changed:!1,hookCount:ge.length};q(t,s);let c=E(t,"Grok Build");if(!y(c.hooks))throw new Error("Grok Build hooks were written but verification failed.");let a=0;for(let[l]of ge){let u=c.hooks[l];if(!Array.isArray(u))throw new Error("Grok Build hooks were written but verification failed.");a+=u.filter(Sn).length}if(a!==ge.length)throw new Error("Grok Build hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:ge.length}}import{existsSync as Fl,mkdirSync as $l,readFileSync as Dl,renameSync as Hl,rmSync as Ll,writeFileSync as Kl}from"node:fs";import{dirname as Jl}from"node:path";function In(e){return Fl(e)?Dl(e,"utf8"):""}function Vl(e,t){$l(Jl(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Kl(o,t,{encoding:"utf8",mode:384}),Hl(o,e)}finally{Ll(o,{force:!0})}}function Dt(e){return e.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t")}function Gl(e){return`[mcp_servers."${Dt(e)}"]`}function Ul(e,t){return[Gl(e),`command = "${Dt(t)}"`,'args = ["mcp"]',"enabled = true"].join(`
`)}function ql(e){let t=e.trim();return t.startsWith("[")&&t.includes("]")}function Ue(e){return e.trim().replace(/\s+/g,"")}function Bl(e){return new Set([Ue(`[mcp_servers.${e}]`),Ue(`[mcp_servers."${e}"]`),Ue(`[mcp_servers.'${e}']`)])}function vn(e,t){let o=e.split(/\r?\n/),r=Bl(t),n=-1;for(let u=0;u<o.length;u+=1){let d=Ue(o[u].replace(/\s+#.*$/,""));if(r.has(d)){n=u;break}}if(n<0)return null;let i=o.length;for(let u=n+1;u<o.length;u+=1)if(ql(o[u])){i=u;break}let s=[],c=0;for(let u of o)s.push(c),c+=u.length+1;let a=s[n]??0,l=i>=o.length?e.length:s[i]??e.length;return{start:a,end:l}}function Yl(e,t,o){let r=`${Ul(t,o)}
`,n=vn(e,t);if(n){let i=e.slice(0,n.start),s=e.slice(n.end);return`${i}${r}${s.replace(/^\n+/,"")}`}return e.trim()?`${e.replace(/\s*$/,"")}

${r}`:r}function jn(e,t,o){let r=vn(e,t);if(!r)return!1;let n=e.slice(r.start,r.end);return n.includes(`command = "${Dt(o)}"`)&&/args\s*=\s*\[\s*"mcp"\s*\]/.test(n)&&/enabled\s*=\s*true/.test(n)}function Ht(e={}){let t=e.configFile??Ne(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=In(t);if(jn(n,r,o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};let i=Yl(n,r,o);Vl(t,i);let s=In(t);if(!jn(s,r,o))throw new Error("Grok Build MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}function wn(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.skill?.changed)}function Cn(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:P({project:e.projectRoot}),n=Y({agent:"grok",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Grok project integration scope cannot be resolved.");let i,s;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(i={},n.surfaces.mcp.global.install&&(i.mcp=Ht({binary:t,configFile:e.configFile??Ne()})),n.surfaces.hooks.global.install&&(i.hooks=$t({binary:t,hooksFile:e.hooksFile??Me()})),n.surfaces.work.global.install&&(i.skill=Ft({skillFile:e.skillFile??Fe()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Grok project integration requires an eligible project root.");s={},n.surfaces.mcp.project.install&&(s.mcp=Ht({binary:t,configFile:e.projectConfigFile??Xo(r.root)})),n.surfaces.hooks.project.install&&(s.hooks=$t({binary:t,hooksFile:e.projectHooksFile??Zo(r.root)})),n.surfaces.work.project.install&&(s.skill=Ft({skillFile:e.projectSkillFile??er(r.root)}))}let c=s?.mcp??i?.mcp,a=s?.hooks??i?.hooks,l=s?.skill??i?.skill;if(!c||!a||!l)throw new Error("Grok integration did not produce effective MCP/hooks/skill.");let u=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.skill?.skillFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.skill?.skillFile].filter(d=>typeof d=="string")));return{installed:!0,changed:wn(i)||wn(s),scope:o,plan:n,project:r,global:i,projectScope:s,mcp:c,hooks:a,skill:l,files:u}}import{existsSync as En,mkdirSync as uh,readFileSync as Pn,renameSync as dh,rmSync as ph,writeFileSync as Ql}from"node:fs";import{homedir as zl}from"node:os";import{join as xn}from"node:path";function Wl(e="toolnet-memory",t={}){return xn(t.home??zl(),".agents","plugins",e)}function On(e="toolnet-memory",t={}){return xn(Wl(e,t),"hooks","hooks.json")}function Rn(e){return`'${e.replace(/'/g,"'\\''")}'`}function Xl(e){if(!En(e))return{};let t;try{t=JSON.parse(Pn(e,"utf8"))}catch{throw new Error(`Invalid existing Goose hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Goose hooks.json at ${e}: root must be a JSON object.`);return t}function Tn(e={}){let t=e.pluginName??"toolnet-memory",o=e.hooksFile??On(t),r=Xl(o),n=e.binary??"toolnet-memory",i=`${Rn(n)} session:goose-hook`,s=`${Rn(n)} session:goose-hook`,c={type:"command",command:i,timeout:30},a={type:"command",command:s,timeout:3},l=r.hooks&&typeof r.hooks=="object"&&!Array.isArray(r.hooks)?r.hooks:{};r.hooks=l;let d=(Array.isArray(l.Stop)?l.Stop:[]).filter(Be=>{try{return!JSON.stringify(Be).includes("session:goose-hook")}catch{return!0}}),g=(Array.isArray(l.SessionEnd)?l.SessionEnd:[]).filter(Be=>{try{return!JSON.stringify(Be).includes("session:goose-hook")}catch{return!0}});l.Stop=[...d,{hooks:[c]}],l.SessionEnd=[...g,{hooks:[a]}];let w=JSON.stringify(r,null,2)+`
`,C=!En(o)||Pn(o,"utf8")!==w;return Ql(o,w,{encoding:"utf8",mode:384}),{hooksFile:o,changed:C,stopInstalled:!0,sessionEndInstalled:!0}}function An(e={}){let t=Tn(e);return{hooksFile:t.hooksFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as Fn,mkdirSync as eu,readFileSync as $n,renameSync as tu,rmSync as ou,writeFileSync as ru}from"node:fs";import{dirname as nu}from"node:path";import{homedir as Zl}from"node:os";import{join as _n}from"node:path";function Nn(e={}){let t=e.projectRoot;return t?_n(t,".qwen","hooks.json"):_n(e.home??Zl(),".qwen","hooks.json")}function Mn(e){return`'${e.replace(/'/g,"'\\''")}'`}function iu(e){if(!Fn(e))return{};let t;try{t=JSON.parse($n(e,"utf8"))}catch{throw new Error(`Invalid existing Qwen hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Qwen hooks.json at ${e}: root must be a JSON object.`);return t}function su(e,t){eu(nu(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{ru(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),tu(o,e)}finally{ou(o,{force:!0})}}function Dn(e={}){let t=e.hooksFile??Nn({projectRoot:e.projectRoot}),o=iu(t),r=e.binary??"toolnet-memory",n=`${Mn(r)} session:qwen-hook`,i=`${Mn(r)} session:qwen-hook`,s={type:"command",command:n,timeout:30},c={type:"command",command:i,timeout:3},a=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=a;let u=(Array.isArray(a.Stop)?a.Stop:[]).filter(C=>{try{return!JSON.stringify(C).includes("session:qwen-hook")}catch{return!0}}),p=(Array.isArray(a.SessionEnd)?a.SessionEnd:[]).filter(C=>{try{return!JSON.stringify(C).includes("session:qwen-hook")}catch{return!0}});a.Stop=[...u,{hooks:[s]}],a.SessionEnd=[...p,{hooks:[c]}];let g=JSON.stringify(o,null,2)+`
`,w=!Fn(t)||$n(t,"utf8")!==g;return su(t,o),{hooksFile:t,changed:w,stopInstalled:!0,sessionEndInstalled:!0}}function Hn(e={}){let t=Dn(e);return{hooksFile:t.hooksFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as Vn,mkdirSync as lu,readFileSync as uu,renameSync as du,rmSync as pu,writeFileSync as gu}from"node:fs";import{dirname as mu}from"node:path";import{homedir as cu}from"node:os";import{join as au}from"node:path";function Ln(e={}){return au(e.home??cu(),".kimi-code","config.toml")}function Kn(e){return`'${e.replace(/'/g,"'\\''")}'`}function fu(e){return Vn(e)?uu(e,"utf8"):""}function Jn(e,t){lu(mu(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{gu(o,t,{encoding:"utf8",mode:384}),du(o,e)}finally{pu(o,{force:!0})}}function Gn(e={}){let t=e.configFile??Ln(),o=fu(t),r=e.binary??"toolnet-memory",n=`${Kn(r)} session:kimi-hook`,i=`${Kn(r)} session:kimi-hook`,s=`[[hooks]]
name = "toolnet-memory-stop"
event = "Stop"
command = ${n}
timeout = 30
`,c=`[[hooks]]
name = "toolnet-memory-session-end"
event = "SessionEnd"
command = ${i}
timeout = 3
`,a=!1;return o.includes("toolnet-memory-stop")||(o=o.trim()+`

`+s+`
`,a=!0),o.includes("toolnet-memory-session-end")||(o=o.trim()+`

`+c+`
`,a=!0),a?Jn(t,o):Vn(t)||(Jn(t,s+`
`+c+`
`),a=!0),{configFile:t,changed:a,stopInstalled:!0,sessionEndInstalled:!0}}function Un(e={}){let t=Gn(e);return{configFile:t.configFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as Bn,mkdirSync as ku,readFileSync as bu,renameSync as Su,rmSync as Iu,writeFileSync as ju}from"node:fs";import{dirname as vu}from"node:path";import{homedir as yu}from"node:os";import{join as hu}from"node:path";function qn(e={}){return hu(e.home??yu(),".hermes","config.yaml")}function wu(e){return`'${e.replace(/'/g,"'\\''")}'`}function Cu(e){return Bn(e)?bu(e,"utf8"):""}function xu(e,t){ku(vu(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{ju(o,t,{encoding:"utf8",mode:384}),Su(o,e)}finally{Iu(o,{force:!0})}}function Yn(e={}){let t=e.configFile??qn(),o=Cu(t),r=e.binary??"toolnet-memory",i=`  - name: toolnet-memory-session-end
    event: on_session_end
    command: ${`${wu(r)} session:hermes-hook`}
    timeout: 30
`,s=!1;return o.includes("toolnet-memory-session-end")||(o.includes("hooks:")?o=o.replace(/hooks:\n/,`hooks:
${i}`):o=o.trim()+`

hooks:
`+i,s=!0),(s||!Bn(t))&&(o.endsWith(`
`)||(o+=`
`),xu(t,o)),{configFile:t,changed:s,sessionEndInstalled:!0}}function zn(e={}){let t=Yn(e);return{configFile:t.configFile,changed:t.changed,sessionEndInstalled:t.sessionEndInstalled}}import{existsSync as Xn,mkdirSync as Eu,readFileSync as Zn,renameSync as Pu,rmSync as Tu,writeFileSync as Au}from"node:fs";import{dirname as _u}from"node:path";import{existsSync as Ou}from"node:fs";import{homedir as Ru}from"node:os";import{join as Lt}from"node:path";function Wn(e={}){let t=e.home??Ru();return Ou(Lt(t,".qoder-cn"))?Lt(t,".qoder-cn","settings.json"):Lt(t,".qoder","settings.json")}function Qn(e){return`'${e.replace(/'/g,"'\\''")}'`}function Nu(e){if(!Xn(e))return{};let t;try{t=JSON.parse(Zn(e,"utf8"))}catch{throw new Error(`Invalid existing Qoder settings.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Qoder settings.json at ${e}: root must be a JSON object.`);return t}function Mu(e,t){Eu(_u(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Au(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Pu(o,e)}finally{Tu(o,{force:!0})}}function ei(e={}){let t=e.settingsFile??Wn(),o=Nu(t),r=e.binary??"toolnet-memory",n=`${Qn(r)} session:qoder-hook`,i=`${Qn(r)} session:qoder-hook`,s={type:"command",command:n,timeout:30},c={type:"command",command:i,timeout:3},a=Array.isArray(o.hooks)?[...o.hooks]:[],u=a.filter(g=>{try{return!JSON.stringify(g).includes("session:qoder-hook")}catch{return!0}}).filter(g=>{try{return!JSON.stringify(g).includes("session:qoder-hook")}catch{return!0}});a.length=0,a.push({...s,event:"Stop"},{...c,event:"SessionEnd"}),o.hooks=a;let d=JSON.stringify(o,null,2)+`
`,p=!Xn(t)||Zn(t,"utf8")!==d;return Mu(t,o),{settingsFile:t,changed:p,stopInstalled:!0,sessionEndInstalled:!0}}function ti(e={}){let t=ei(e);return{settingsFile:t.settingsFile,changed:t.changed,stopInstalled:t.stopInstalled,sessionEndInstalled:t.sessionEndInstalled}}function oi(e={}){if(e.scope==="global")return{scope:"global",automatic:!1,reason:"explicit-global"};if(e.scope==="project"||e.scope==="both"){let o=P({cwd:e.cwd,project:e.projectRoot});if(!o.eligible)throw new Error(`Explicit ${e.scope} integration requires an explicit project, ToolNet project, or Git repository root.`);return{scope:e.scope,automatic:!1,project:o,reason:e.scope==="project"?"explicit-project":"explicit-both"}}let t=P({cwd:e.cwd,project:e.projectRoot});return t.toolnetProject?{scope:"both",automatic:!0,project:t,reason:"toolnet-project"}:{scope:"global",automatic:!0,reason:"no-toolnet-project"}}function ri(){return nr()}function Kt(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[],r=e.detections??ri(),n=new Map(r.map(s=>[s.agent,s.detected])),i=oi({scope:e.scope,projectRoot:e.projectRoot,cwd:e.cwd});if(!(e.force===!0||n.get("agy")===!0))o.push({agent:"agy",detected:!1,installed:!1,targets:[]});else try{let c=dr({binary:t});o.push({agent:"agy",detected:!0,installed:!0,targets:c.files})}catch(c){o.push({agent:"agy",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("opencode")===!0))o.push({agent:"opencode",detected:!1,installed:!1,targets:[]});else try{let c=hr({binary:t}),a=jr({binary:t});o.push({agent:"opencode",detected:!0,installed:!0,targets:[...c,a.configFile,`mcp:${a.serverName}`]})}catch(c){o.push({agent:"opencode",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("claude")===!0))o.push({agent:"claude",detected:!1,installed:!1,targets:[]});else try{let c=Jr({binary:t});o.push({agent:"claude",detected:!0,installed:!0,targets:[c.hooks.settingsFile,c.mcp.configFile,`mcp:${c.mcp.serverName}`]})}catch(c){o.push({agent:"claude",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("kiro")===!0))o.push({agent:"kiro",detected:!1,installed:!1,targets:[]});else try{let c=Wr({...e.kiro??{},binary:t});o.push({agent:"kiro",detected:!0,installed:!0,targets:[c.mcp.configFile,`mcp:${c.mcp.serverName}`,c.hooks.hooksFile]})}catch(c){o.push({agent:"kiro",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("cursor")===!0))o.push({agent:"cursor",detected:!1,installed:!1,targets:[]});else try{let c=e.cursor??{},a=pn({...c,binary:t,scope:c.scope??i.scope,projectRoot:c.projectRoot??i.project?.root});o.push({agent:"cursor",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(c){o.push({agent:"cursor",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("copilot")===!0))o.push({agent:"copilot",detected:!1,installed:!1,targets:[]});else try{let c=e.copilot??{},a=kn({...c,binary:t,scope:c.scope??i.scope,projectRoot:c.projectRoot??i.project?.root});o.push({agent:"copilot",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(c){o.push({agent:"copilot",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("grok")===!0))o.push({agent:"grok",detected:!1,installed:!1,targets:[]});else try{let c=e.grok??{},a=Cn({...c,binary:t,scope:c.scope??i.scope,projectRoot:c.projectRoot??i.project?.root});o.push({agent:"grok",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(c){o.push({agent:"grok",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("toolnet-cli")===!0))o.push({agent:"toolnet-cli",detected:!1,installed:!1,targets:[]});else try{let c=e.toolnetCli??{},a=Xr({...c,binary:t});o.push({agent:"toolnet-cli",detected:!0,installed:!0,targets:[a.mcp.configFile]})}catch(c){o.push({agent:"toolnet-cli",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("kilo")===!0))o.push({agent:"kilo",detected:!1,installed:!1,targets:[]});else try{let c=e.kilo??{},a=en({...c,binary:t});o.push({agent:"kilo",detected:!0,installed:!0,targets:[a.mcp.configFile]})}catch(c){o.push({agent:"kilo",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("codex")===!0))o.push({agent:"codex",detected:!1,installed:!1,targets:[]});else try{let c=Or({binary:t}),a=Er({binary:t}),l=Nr({binary:t}),u=$r({binary:t});if(!u.installed)throw new Error(u.error??"Codex MCP registration failed");let d=[c.configFile,a,l.hooksFile,`mcp:${u.serverName}`];c.preservedPrevious&&d.push(c.previousFile),o.push({agent:"codex",detected:!0,installed:!0,targets:d})}catch(c){o.push({agent:"codex",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("goose")===!0))o.push({agent:"goose",detected:!1,installed:!1,targets:[]});else try{let c=e.goose??{},a=An({...c,binary:t});o.push({agent:"goose",detected:!0,installed:!0,targets:[a.hooksFile]})}catch(c){o.push({agent:"goose",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("qwen")===!0))o.push({agent:"qwen",detected:!1,installed:!1,targets:[]});else try{let c=e.qwen??{},a=Hn({...c,binary:t});o.push({agent:"qwen",detected:!0,installed:!0,targets:[a.hooksFile]})}catch(c){o.push({agent:"qwen",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("kimi")===!0))o.push({agent:"kimi",detected:!1,installed:!1,targets:[]});else try{let c=e.kimi??{},a=Un({...c,binary:t});o.push({agent:"kimi",detected:!0,installed:!0,targets:[a.configFile]})}catch(c){o.push({agent:"kimi",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("hermes")===!0))o.push({agent:"hermes",detected:!1,installed:!1,targets:[]});else try{let c=e.hermes??{},a=zn({...c,binary:t});o.push({agent:"hermes",detected:!0,installed:!0,targets:[a.configFile]})}catch(c){o.push({agent:"hermes",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("qoder")===!0))o.push({agent:"qoder",detected:!1,installed:!1,targets:[]});else try{let c=e.qoder??{},a=ti({...c,binary:t});o.push({agent:"qoder",detected:!0,installed:!0,targets:[a.settingsFile]})}catch(c){o.push({agent:"qoder",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}return o}function qe(e){switch(e){case"agy":return"Agy / Antigravity";case"opencode":return"OpenCode";case"claude":return"Claude Code";case"kiro":return"Kiro CLI";case"cursor":return"Cursor CLI";case"copilot":return"GitHub Copilot CLI";case"grok":return"Grok Build";case"toolnet-cli":return"ToolNet CLI";case"kilo":return"Kilo";case"codex":return"Codex";case"goose":return"goose";case"qwen":return"Qwen Code";case"kimi":return"Kimi Code CLI";case"hermes":return"Hermes Agent";case"qoder":return"Qoder CLI";default:return e}}function Fu(e){console.log(""),console.log("ToolNet Memory Integration Detection"),console.log("===================================="),console.log("");for(let t of e){let o=qe(t.agent);if(!t.detected){console.log(`\u25CB ${o}: not detected`);continue}console.log(`\u2713 ${o}: detected`);for(let r of t.evidence)console.log(`  ${r}`)}console.log("")}var $u=["claude","cursor","copilot","grok","kiro","opencode","codex","agy"],Du={opencode:"toolnet-memory session:opencode-sync",codex:"toolnet-memory session:codex-sync",agy:"toolnet-memory session:agy-sync","toolnet-cli":"toolnet-memory session:toolnet-cli-sync"};function Hu(e){if($u.includes(e))return"ToolNet integration configured; hooks installed successfully";let t=Du[e];return t?`ToolNet integration configured; run ${t} to capture session history`:"ToolNet integration configured; capture begins when a supported hook or sync runs"}function Lu(e){console.log(""),console.log("ToolNet Memory AI Integrations"),console.log("=============================="),console.log("");for(let t of e){let o=qe(t.agent);if(!t.detected){console.log(`- ${o}: not detected`);continue}if(t.installed){let r=t.scope?` [scope=${t.scope}]`:"";console.log(`\u2713 ${o}: ${Hu(t.agent)}${r}`),t.projectRoot&&console.log(`  project: ${t.projectRoot}`);continue}console.log(`\u2717 ${o}: integration failed`),t.error&&console.log(`  ${t.error}`)}console.log("")}function Ku(e,t){let o=e.indexOf(t);return o>=0?e[o+1]:void 0}function Ju(e){return e.includes("--scope")||e.includes("--global")||e.includes("--both")?un(e):void 0}async function Vu(){let e=process.argv.slice(2),t=e.includes("--all"),o=e.includes("--json"),r=e.includes("--detect-only"),n=Ju(e),i=Ku(e,"--project");if(r){let c=ri();if(o){console.log(JSON.stringify(c,null,2));return}Fu(c);return}let s=Kt({force:t,scope:n,projectRoot:i});if(o){console.log(JSON.stringify(s,null,2));return}Lu(s)}var Gu=process.argv[1]&&(process.argv[1].endsWith("auto-integrate.js")||process.argv[1].endsWith("auto-integrate.ts"));Gu&&Vu().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});function si(e){let t=qu(e);if(!Jt(t))throw new Error(`Project path does not exist: ${t}`);if(!Uu(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);return t}function Fk(e=process.cwd()){let t=si(e),o=new L().detect(t),r=ii(o.rootPath,".toolnet","project.json");if(!Jt(r))throw new Error(`ToolNet project initialization failed: ${r} was not created`);return{initialized:!0,project:{id:o.id,name:o.name,remote:o.remote,rootPath:o.rootPath},manifestFile:r}}async function Bu(e=process.cwd(),t={}){let o=si(e),r={skipRemoteIdentity:t.skipRemoteIdentity,adoptRemote:t.adoptRemote,allowGitRebind:t.allowGitRebind},n=await Oo(o,r),i=n.project,s=ii(i.rootPath,".toolnet","project.json");if(!Jt(s))throw new Error(`ToolNet project initialization failed: ${s} was not created`);return{initialized:!0,project:{id:i.id,name:i.name,remote:i.remote,rootPath:i.rootPath},manifestFile:s,identity:{source:n.source,registry:n.registry,registryProvider:n.registryProvider,gitRemote:n.gitIdentity?.canonicalRemote,fingerprint:n.gitIdentity?.fingerprint}}}function ni(e,t){let o=e.indexOf(t);if(o<0)return;let r=e[o+1];if(!(!r||r.startsWith("-")))return r}async function Yu(){let e=process.argv.slice(2),t=e.includes("--json"),o=!e.includes("--no-integrate"),r=e.includes("--no-remote-identity"),n=e.includes("--rebind-git-identity"),i=ni(e,"--adopt-remote"),s=ni(e,"--project"),c=new Set(["--project","--adopt-remote"]),a=e.find((p,g)=>{if(p.startsWith("-"))return!1;let w=e[g-1];return!(w&&c.has(w))}),l=s??a??process.cwd(),u=await Ze("Resolving ToolNet project identity",()=>Bu(l,{skipRemoteIdentity:r,adoptRemote:i,allowGitRebind:n}),{enabled:!t}),d=[];if(o&&(d=await Ze("Detecting coding agents",()=>Kt({projectRoot:u.project.rootPath}),{enabled:!t})),t){console.log(JSON.stringify({...u,integrations:d},null,2));return}if(console.log(""),console.log("ToolNet Memory"),console.log("=============="),console.log(""),console.log("\u2713 Project initialized"),console.log(""),console.log(`Project:  ${u.project.name}`),console.log(`ID:       ${u.project.id}`),console.log(`Remote:   ${u.project.remote??u.project.name}`),console.log(`Root:     ${u.project.rootPath}`),console.log(`Manifest: ${u.manifestFile}`),u.identity&&(console.log(`Identity: ${u.identity.source}`),console.log(`Registry: ${u.identity.registry}`),u.identity.gitRemote&&console.log(`Git:      ${u.identity.gitRemote}`)),console.log(""),o){console.log("AI integrations:");let p=d.filter(g=>g.detected&&g.installed);if(!p.length)console.log("  \u25CB No supported coding agent detected");else for(let g of p){let w=qe(g.agent),C=oo(g.agent);console.log(`  \u2713 ${w} \u2014 ${C}`)}console.log("")}console.log("Next: toolnet-memory doctor"),console.log("")}var zu=process.argv[1]?.endsWith("/init.js")||process.argv[1]?.endsWith("/init.ts");zu&&Yu().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});export{Fk as initializeToolNetProject,Bu as initializeToolNetProjectCrossMachine};
