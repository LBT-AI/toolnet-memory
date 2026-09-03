import{existsSync as Ft,statSync as al}from"node:fs";import{resolve as ll,join as hn}from"node:path";import{existsSync as In,readFileSync as jn}from"node:fs";import{homedir as wn}from"node:os";import{join as vn}from"node:path";function Sn(e){let t=e.trim();return t.length>=2&&t.startsWith('"')&&t.endsWith('"')?(t=t.slice(1,-1),t.replace(/\\n/g,`
`).replace(/\\r/g,"\r").replace(/\\t/g,"	").replace(/\\"/g,'"').replace(/\\\\/g,"\\")):t.length>=2&&t.startsWith("'")&&t.endsWith("'")?t.slice(1,-1):t}function xn(){let e=process.env.TOOLNET_GLOBAL_ENV??vn(wn(),".config","toolnet-memory",".env");if(!In(e))return;let t=jn(e,"utf8");for(let o of t.split(/\r?\n/)){let r=o.trim();if(!r||r.startsWith("#"))continue;r.startsWith("export ")&&(r=r.slice(7));let n=r.indexOf("=");if(n<=0)continue;let i=r.slice(0,n).trim();/^[A-Za-z_][A-Za-z0-9_]*$/.test(i)&&process.env[i]===void 0&&(process.env[i]=Sn(r.slice(n+1)))}}xn();function B(e,t){return e===void 0?t:["1","true","yes","on"].includes(e.toLowerCase())}function U(e,t){if(!e)return t;let o=Number(e);return Number.isFinite(o)?o:t}function Ke(){return{memory:{autoCapture:B(process.env.MEMORY_AUTO_CAPTURE,!0),autoRetrieve:B(process.env.MEMORY_AUTO_RETRIEVE,!0),autoSummarize:B(process.env.MEMORY_AUTO_SUMMARIZE,!0),autoSync:B(process.env.MEMORY_AUTO_SYNC,!0)},retrieval:{maxCandidates:U(process.env.MEMORY_MAX_CANDIDATES,50),rerankTop:U(process.env.MEMORY_RERANK_TOP,10),finalContext:U(process.env.MEMORY_FINAL_CONTEXT,5),tokenBudget:U(process.env.MEMORY_TOKEN_BUDGET,2e3)},storage:{provider:process.env.MEMORY_STORAGE_PROVIDER??"huggingface",r2:{accountId:process.env.R2_ACCOUNT_ID,bucket:process.env.R2_BUCKET,accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY},s3:{endpoint:process.env.S3_ENDPOINT,region:process.env.S3_REGION,bucket:process.env.S3_BUCKET,accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY,forcePathStyle:B(process.env.S3_FORCE_PATH_STYLE,!1)},huggingface:{namespace:process.env.HF_NAMESPACE,bucket:process.env.HF_BUCKET,accessKeyId:process.env.HF_S3_ACCESS_KEY_ID,secretAccessKey:process.env.HF_S3_SECRET_ACCESS_KEY},localRoot:process.env.MEMORY_LOCAL_STORAGE_PATH},cache:{maxMb:U(process.env.MEMORY_LOCAL_CACHE_MB,200)}}}import{createHash as An}from"node:crypto";import{existsSync as ge,mkdirSync as Mn,readFileSync as Nn,renameSync as _n,writeFileSync as Fn}from"node:fs";import{basename as $n,dirname as fe,join as V,parse as Gt,resolve as E}from"node:path";import{createHash as Ht}from"node:crypto";import{spawnSync as Cn}from"node:child_process";var Y="git-remote-v1",On=new Set(["github.com","gitlab.com","bitbucket.org"]);function Lt(e,t){let o=t.replaceAll("\\","/").replace(/^\/+/u,"").replace(/\/+$/u,"").replace(/\.git$/iu,"").replace(/\/+/gu,"/");return!o||o==="."||o===".."||o.split("/").some(r=>!r||r==="."||r==="..")?null:(On.has(e)&&(o=o.toLowerCase()),o)}function Rn(e){let t;try{t=new URL(e)}catch{return null}if(!["https:","http:","ssh:","git:"].includes(t.protocol))return null;let o=t.hostname.trim().toLowerCase();if(!o)return null;let r=t.protocol==="https:"&&t.port==="443"||t.protocol==="http:"&&t.port==="80"||t.protocol==="ssh:"&&t.port==="22",n=t.port&&!r?`${o}:${t.port}`:o,i=Lt(o,t.pathname);return i?`${n}/${i}`:null}function En(e){let t=e.match(/^(?:[^@\s/:]+@)?([^:/\s]+):(.+)$/u);if(!t)return null;let o=t[1]?.trim().toLowerCase();if(!o||o.length===1)return null;let r=Lt(o,t[2]??"");return r?`${o}/${r}`:null}function $t(e){let t=e.trim();return t?t.includes("://")?Rn(t):En(t):null}function Pn(e){return Ht("sha256").update(`${Y}:${e}`).digest("hex")}function Kt(e){return Ht("sha256").update(`toolnet-project:${Y}:${e}`).digest("hex").slice(0,16)}function Tn(e){return e.split("/").filter(Boolean).at(-1)?.trim()||null}function Je(e,t){let o=Cn("git",["-C",e,...t],{encoding:"utf8",windowsHide:!0,stdio:["ignore","pipe","ignore"]});return o.error||o.status!==0?null:o.stdout?.trim()||null}function Dt(e,t){let o=Tn(e);return o?{scheme:Y,canonicalRemote:e,fingerprint:Pn(e),repositoryName:o,source:t}:null}function ue(e){let t=Je(e,["remote","get-url","origin"]);if(t){let n=$t(t);if(n)return Dt(n,"origin")}let o=Je(e,["remote"]);if(!o)return null;let r=new Set;for(let n of o.split(/\r?\n/u).map(i=>i.trim()).filter(Boolean)){let i=Je(e,["remote","get-url",n]);if(!i)continue;let s=$t(i);s&&r.add(s)}return r.size!==1?null:Dt([...r][0],"unique-remote")}var Bt=".toolnet",Dn="project.json";function Hn(e){return An("sha256").update(e).digest("hex").slice(0,16)}function N(e){return V(e,Bt,Dn)}function Ut(e){return ge(N(e))}function Jt(e,t){let o=E(e),r=Gt(o).root;for(;;){if(Ut(o))return o;if(o===r||t&&o===E(t))break;let n=fe(o);if(n===o)break;o=n}return null}function Ge(e){let t=E(e),o=Gt(t).root,r=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"];for(;;){if(r.some(i=>ge(V(t,i))))return t;if(t===o)break;let n=fe(t);if(n===t)break;t=n}return E(e)}function de(e){let t;try{t=JSON.parse(Nn(e,"utf8"))}catch(n){throw new Error(`Invalid ToolNet project manifest: ${e}: ${n instanceof Error?n.message:String(n)}`)}if(!t||typeof t!="object")throw new Error(`Invalid ToolNet project manifest: ${e}`);let o=t;if(typeof o.id!="string"||!o.id.trim())throw new Error(`ToolNet project manifest is missing id: ${e}`);if(typeof o.name!="string"||!o.name.trim())throw new Error(`ToolNet project manifest is missing name: ${e}`);let r=new Date().toISOString();return{version:1,id:o.id,name:o.name,remote:typeof o.remote=="string"&&o.remote.trim()?o.remote:o.name,rootPath:typeof o.rootPath=="string"?o.rootPath:fe(fe(e)),createdAt:typeof o.createdAt=="string"?o.createdAt:r,updatedAt:typeof o.updatedAt=="string"?o.updatedAt:r,graphVersion:typeof o.graphVersion=="number"?o.graphVersion:0,memoryVersion:typeof o.memoryVersion=="number"?o.memoryVersion:0,metadata:o.metadata&&typeof o.metadata=="object"?o.metadata:void 0}}function pe(e,t){let o=V(e,Bt);Mn(o,{recursive:!0});let r=N(e),n=`${r}.tmp-${process.pid}`;Fn(n,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),_n(n,r)}function R(e,t){return{id:e.id,name:e.name,remote:e.remote,rootPath:t,createdAt:e.createdAt,updatedAt:e.updatedAt,graphVersion:e.graphVersion,memoryVersion:e.memoryVersion,metadata:e.metadata}}function Be(e){return{version:1,scheme:Y,canonicalRemote:e.canonicalRemote,fingerprint:e.fingerprint,repositoryName:e.repositoryName}}function Ln(e){let t=e.metadata?.toolnetIdentity;if(!t||typeof t!="object"||Array.isArray(t))return null;let o=t;return typeof o.fingerprint=="string"?o.fingerprint:null}var _=class{adopt(t,o){let r=Ge(E(t));if(!o.id.trim())throw new Error("PROJECT_ADOPTION_INVALID_ID");if(!o.name.trim())throw new Error("PROJECT_ADOPTION_INVALID_NAME");if(!o.remote.trim())throw new Error("PROJECT_ADOPTION_INVALID_REMOTE");if(Ut(r)){let c=de(N(r));if(c.id!==o.id)throw new Error(["PROJECT_IDENTITY_ALREADY_EXISTS",`existing=${c.id}`,`requested=${o.id}`].join(" "));return R(c,r)}let n=new Date().toISOString(),i={...o.metadata};o.gitIdentity&&(i.toolnetIdentity=Be(o.gitIdentity));let s={version:1,id:o.id.trim(),name:o.name.trim(),remote:o.remote.trim(),rootPath:r,createdAt:o.createdAt??n,updatedAt:n,graphVersion:o.graphVersion??0,memoryVersion:o.memoryVersion??0,metadata:Object.keys(i).length?i:void 0};return pe(r,s),R(s,r)}recordGitIdentity(t,o,r={}){let n=this.requireExisting(t),i=N(n.rootPath),s=de(i),c=Ln(s);if(c&&c!==o.fingerprint&&!r.allowRebind)throw new Error(["PROJECT_GIT_REMOTE_CHANGED",`existing=${c}`,`current=${o.fingerprint}`,"Use explicit rebind only when this repository identity change is intentional."].join(" "));let a=s.metadata?.toolnetIdentity;return a&&typeof a=="object"&&!Array.isArray(a)&&a.fingerprint===o.fingerprint||(s.metadata={...s.metadata,toolnetIdentity:Be(o)},s.updatedAt=new Date().toISOString(),pe(n.rootPath,s)),R(s,n.rootPath)}findExisting(t=process.cwd()){let o=E(t),r=Ge(o),i=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(a=>ge(V(r,a))),s=Jt(o,i?r:void 0);if(!s)return null;let c=de(N(s));return R(c,s)}requireExisting(t=process.cwd()){let o=this.findExisting(t);if(!o)throw new Error("PROJECT_NOT_INITIALIZED");return o}detect(t=process.cwd()){let o=E(t),r=Ge(o),i=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(d=>ge(V(r,d))),s=Jt(o,i?r:void 0);if(s){let d=N(s),p=de(d);return p.rootPath!==s&&(p.rootPath=s,p.updatedAt=new Date().toISOString(),pe(s,p)),R(p,s)}let c=new Date().toISOString(),a=$n(r),l=ue(r),u={version:1,id:l?Kt(l.canonicalRemote):Hn(r),name:a,remote:l?.repositoryName??a,rootPath:r,createdAt:c,updatedAt:c,graphVersion:0,memoryVersion:0,metadata:l?{toolnetIdentity:Be(l)}:void 0};return pe(r,u),R(u,r)}};var Kn=[{type:"openai_key",regex:/\bsk-[A-Za-z0-9_-]{20,}\b/g,confidence:"exact"},{type:"huggingface_token",regex:/\bhf_[A-Za-z0-9]{20,}\b/g,confidence:"exact"},{type:"hf_s3_access_key",regex:/\bHFAK[A-Za-z0-9]{8,}\b/g,confidence:"exact"},{type:"aws_access_key",regex:/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,confidence:"exact"},{type:"github_token",regex:/\b(?:gh[pousr]_[A-Za-z0-9]{30,255}|github_pat_[A-Za-z0-9_]{40,255})\b/g,confidence:"exact"},{type:"stripe_secret_key",regex:/\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g,confidence:"exact"},{type:"google_api_key",regex:/\bAIza[A-Za-z0-9_-]{30,}\b/g,confidence:"exact"},{type:"slack_token",regex:/\bxox[baprs]-[A-Za-z0-9-]{16,}\b/g,confidence:"exact"},{type:"npm_token",regex:/\bnpm_[A-Za-z0-9]{20,}\b/g,confidence:"exact"},{type:"bearer_token",regex:/\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/gi,confidence:"high"},{type:"jwt",regex:/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,confidence:"exact"},{type:"private_key",regex:/-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,confidence:"exact"},{type:"password_assignment",regex:/\b(?:password|passwd|pwd)\s*[:=]\s*["']?[^"' \t\r\n]{6,}["']?/gi,confidence:"high"},{type:"secret_assignment",regex:/\b(?:secret|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key)\s*[:=]\s*["']?[^"' \t\r\n]{8,}["']?/gi,confidence:"high"},{type:"cookie",regex:/\b(?:cookie|set-cookie)\s*[:=]\s*[^;\n]{8,}/gi,confidence:"high"},{type:"url_credentials",regex:/\bhttps?:\/\/[^:/@\s]+:[^/@\s]{4,}@[^/\s]+/gi,confidence:"high"}],Jn=new Set(["example","example-key","example-token","changeme","change-me","password","secret","your-api-key","your-token","<token>","<secret>","<password>","[redacted]"]);function Yt(e){return e.normalize("NFKC").trim().toLowerCase()}function Gn(e){if(e.length===0)return 0;let t=new Map;for(let r of e)t.set(r,(t.get(r)??0)+1);let o=0;for(let r of t.values()){let n=r/e.length;o-=n*Math.log2(n)}return o}function Bn(e){return/^[a-f0-9]{32}$/iu.test(e)||/^[a-f0-9]{40}$/iu.test(e)||/^[a-f0-9]{64}$/iu.test(e)}function Un(e,t,o){let r=e.slice(Math.max(0,t-48),t),n=e.slice(o,Math.min(e.length,o+16));return/\b(?:token|secret|key|credential|authorization|password|passwd|apikey|api_key|access[_-]?key)\b/iu.test(`${r} ${n}`)}function Yn(e,t){return e.start<t.end&&t.start<e.end}function Vt(e){return e.sort((t,o)=>t.start!==o.start?t.start-o.start:o.end-o.start-(t.end-t.start))}var me=class{allowValues=new Set;enableEntropyHeuristic;constructor(t={}){for(let o of t.allowValues??[]){let r=Yt(o);r&&this.allowValues.add(r)}this.enableEntropyHeuristic=t.enableEntropyHeuristic??!0}scan(t){let o=[];for(let i of Kn){let s=new RegExp(i.regex.source,i.regex.flags);for(let c of t.matchAll(s))c.index===void 0||!c[0]||this.allowed(c[0])||o.push({type:i.type,value:c[0],start:c.index,end:c.index+c[0].length,confidence:i.confidence})}this.enableEntropyHeuristic&&o.push(...this.entropyMatches(t));let r=Vt(o),n=[];for(let i of r)n.some(s=>Yn(s,i))||n.push(i);return Vt(n)}hasSecrets(t){return this.scan(t).length>0}allowed(t){let o=Yt(t);return Jn.has(o)?!0:this.allowValues.has(o)}entropyMatches(t){let o=[],r=/[A-Za-z0-9_+/=-]{32,160}/g;for(let n of t.matchAll(r)){if(n.index===void 0||!n[0])continue;let i=n[0];this.allowed(i)||Bn(i)||!/[A-Za-z]/u.test(i)||!/[0-9]/u.test(i)||Un(t,n.index,n.index+i.length)&&(Gn(i)<3.7||o.push({type:"high_entropy_secret",value:i,start:n.index,end:n.index+i.length,confidence:"heuristic"}))}return o}};var ye=class{scanner;constructor(t={}){this.scanner=new me(t)}sanitize(t){let o=this.scanner.scan(t);if(o.length===0)return{text:t,redacted:0,secretTypes:[]};let r=t,n=[...o].sort((s,c)=>c.start-s.start),i=new Set;for(let s of n)i.add(s.type),r=r.slice(0,s.start)+`[REDACTED:${s.type}]`+r.slice(s.end);return{text:r,redacted:o.length,secretTypes:[...i].sort()}}sanitizeValue(t){if(typeof t=="string")return this.sanitize(t).text;if(Array.isArray(t))return t.map(o=>this.sanitizeValue(o));if(t&&typeof t=="object"){let o={};for(let[r,n]of Object.entries(t)){let i=r.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g,"");if(i.includes("password")||i.includes("passwd")||i==="pwd"||i.includes("secret")||i.includes("token")||i.includes("cookie")||i.includes("authorization")||i.includes("apikey")||i.includes("accesskey")||i.includes("privatekey")||i.includes("clientsecret")||i.includes("credential")){o[r]="[REDACTED]";continue}o[r]=this.sanitizeValue(n)}return o}return t}};var Al=new ye;var Vn={mcp:!0,continuityRead:!0,nativeCapture:!1,lifecycleHooks:!1,sharedJournalWrite:!1,level:"mcp-only"},zn={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!1,sharedJournalWrite:!0,level:"native-capture"},P={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!0,sharedJournalWrite:!0,level:"native-capture"},Wn={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!0,sharedJournalWrite:!0,level:"native-capture"};function I(e,t,o){return{agent:e,...t,refreshMode:o}}var zt={agy:I("agy",P,"native-lifecycle"),opencode:I("opencode",Wn,"persistent-plugin"),codex:I("codex",P,"native-lifecycle"),claude:I("claude",P,"native-lifecycle"),kiro:I("kiro",P,"native-lifecycle"),cursor:I("cursor",P,"native-lifecycle"),copilot:I("copilot",P,"native-lifecycle"),grok:I("grok",P,"native-lifecycle"),"toolnet-cli":I("toolnet-cli",zn,"native-session"),kilo:I("kilo",Vn,"mcp-only")};function qn(e){return Object.prototype.hasOwnProperty.call(zt,e)}function Qn(e){if(qn(e))return zt[e]}function Wt(e){let t=Qn(e);if(!t)return"unknown";switch(t.refreshMode){case"native-lifecycle":return"native lifecycle";case"persistent-plugin":return"persistent plugin";case"native-session":return"native session capture";case"mcp-only":return"MCP only"}}var qt=["\u280B","\u2819","\u2839","\u2838","\u283C","\u2834","\u2826","\u2827","\u2807","\u280F"],m={clear:"\r\x1B[2K",cyan:"\x1B[36m",green:"\x1B[32m",red:"\x1B[31m",yellow:"\x1B[33m",amber:"\x1B[38;5;214m",dim:"\x1B[2m",reset:"\x1B[0m"};function Qt(e,t=16){let r=Math.max(1,t-4+1),n=e%r;return"\u2500".repeat(n)+"\u2501".repeat(4)+"\u2500".repeat(Math.max(0,t-n-4))}function Zt(e){let t=Date.now()-e;return t<1e3?`${t}ms`:t<1e4?`${(t/1e3).toFixed(1)}s`:`${Math.round(t/1e3)}s`}var Ue=class{stream;enabled;interactive;color;intervalMs;display;label;frame=0;startedAt=0;timer;active=!1;constructor(t,o={}){this.label=t,this.stream=o.stream??process.stderr,this.enabled=o.enabled??!0,this.interactive=o.interactive??this.stream.isTTY===!0,this.color=o.color??(this.interactive&&process.env.NO_COLOR===void 0),this.intervalMs=Math.max(40,o.intervalMs??80),this.display=o.display??"spinner"}start(){return!this.enabled||this.active?this:(this.active=!0,this.startedAt=Date.now(),this.interactive?(this.render(),this.timer=setInterval(()=>{this.frame=(this.frame+1)%1e4,this.render()},this.intervalMs),this.timer.unref?.(),this):(this.stream.write(`\u2192 ${this.label}
`),this))}update(t){return this.label=t,this.enabled&&this.active&&this.interactive&&this.render(),this}succeed(t){this.finish("\u2713",t??this.label,m.green)}fail(t){this.finish("\u2717",t??this.label,m.red)}warn(t){this.finish("!",t??this.label,m.yellow)}stop(){this.active&&(this.timer&&(clearInterval(this.timer),this.timer=void 0),this.enabled&&this.interactive&&this.stream.write(m.clear),this.active=!1)}render(){if(!this.enabled||!this.active||!this.interactive)return;let t=qt[this.frame%qt.length],o=this.display==="bar"?this.color?`${m.amber}${Qt(this.frame)}${m.reset}`:Qt(this.frame):this.color?`${m.cyan}${t}${m.reset}`:t,r=Zt(this.startedAt),n=this.color?`${m.dim}${r}${m.reset}`:r;this.stream.write(`${m.clear}${o} ${this.label} ${n}`)}finish(t,o,r){if(!this.enabled){this.active=!1;return}this.startedAt||(this.startedAt=Date.now()),this.timer&&(clearInterval(this.timer),this.timer=void 0);let n=Zt(this.startedAt),i=this.color?`${r}${t}${m.reset}`:t,s=this.color?`${m.dim}${n}${m.reset}`:n;this.interactive?this.stream.write(`${m.clear}${i} ${o} ${s}
`):this.stream.write(`${i} ${o} (${n})
`),this.active=!1}};async function Ye(e,t,o={}){let r=new Ue(e,o).start();try{let n=await t();return r.succeed(),n}catch(n){throw r.fail(),n}}import{resolve as Ai}from"node:path";import{homedir as Ri}from"node:os";import{join as Ei}from"node:path";import{DeleteObjectCommand as Zn,GetObjectCommand as Xn,HeadObjectCommand as ei,ListObjectsV2Command as ti,PutObjectCommand as oi,S3Client as ri}from"@aws-sdk/client-s3";import{getSignedUrl as ni}from"@aws-sdk/s3-request-presigner";var he=class{name="huggingface";client;bucket;constructor(t){this.bucket=t.bucket,this.client=new ri({region:"us-east-1",endpoint:`https://s3.hf.co/${t.namespace}`,forcePathStyle:!0,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:t.accessKeyId,secretAccessKey:t.secretAccessKey}})}async put(t,o,r="application/octet-stream"){let n=typeof o=="string"?Buffer.from(o,"utf8"):o;await this.client.send(new oi({Bucket:this.bucket,Key:t,Body:n,ContentType:r}))}async get(t){let o=await ni(this.client,new Xn({Bucket:this.bucket,Key:t}),{expiresIn:60}),r=await fetch(o,{redirect:"follow"});if(r.status===404)return null;if(!r.ok)throw new Error(`HF download failed: ${r.status} ${r.statusText}`);return new Uint8Array(await r.arrayBuffer())}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){try{return await this.client.send(new ei({Bucket:this.bucket,Key:t})),!0}catch(o){if(typeof o=="object"&&o!==null&&"$metadata"in o&&o.$metadata?.httpStatusCode===404)return!1;throw o}}async delete(t){await this.client.send(new Zn({Bucket:this.bucket,Key:t}))}async list(t=""){let o=[],r;do{let n=await this.client.send(new ti({Bucket:this.bucket,Prefix:t||void 0,ContinuationToken:r}));for(let i of n.Contents??[])i.Key&&o.push({key:i.Key,size:i.Size,updatedAt:i.LastModified?.toISOString()});r=n.IsTruncated?n.NextContinuationToken:void 0}while(r);return o}};import{access as Xt,mkdir as ii,readFile as si,readdir as ci,rm as ai,stat as eo,writeFile as li}from"node:fs/promises";import{dirname as ui,join as di,relative as to,resolve as pi}from"node:path";var z=class{constructor(t){this.root=t}root;name="local";path(t){let o=t.replace(/^\/+/,"");return pi(this.root,o)}async put(t,o){let r=this.path(t);await ii(ui(r),{recursive:!0}),await li(r,o)}async get(t){try{return await si(this.path(t))}catch(o){if(typeof o=="object"&&o!==null&&"code"in o&&o.code==="ENOENT")return null;throw o}}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){try{return await Xt(this.path(t)),!0}catch{return!1}}async delete(t){await ai(this.path(t),{force:!0})}async list(t=""){let o=this.path(t),r=[];try{await Xt(o)}catch{return r}let n=async s=>{let c=await ci(s,{withFileTypes:!0});for(let a of c){let l=di(s,a.name);if(a.isDirectory()){await n(l);continue}let u=await eo(l);r.push({key:to(this.root,l),size:u.size,updatedAt:u.mtime.toISOString()})}},i=await eo(o);return i.isDirectory()?await n(o):r.push({key:to(this.root,o),size:i.size,updatedAt:i.mtime.toISOString()}),r}};import{DeleteObjectCommand as gi,GetObjectCommand as fi,HeadObjectCommand as mi,ListObjectsV2Command as yi,PutObjectCommand as hi,S3Client as bi}from"@aws-sdk/client-s3";import{getSignedUrl as ki}from"@aws-sdk/s3-request-presigner";var W=class{name;client;bucket;constructor(t){this.name=t.name??"s3",this.bucket=t.bucket,this.client=new bi({region:t.region??"us-east-1",endpoint:t.endpoint||void 0,forcePathStyle:t.forcePathStyle??!1,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:t.accessKeyId,secretAccessKey:t.secretAccessKey}})}async put(t,o,r="application/octet-stream"){let n=typeof o=="string"?Buffer.from(o,"utf8"):o;await this.client.send(new hi({Bucket:this.bucket,Key:t,Body:n,ContentType:r}))}async get(t){let o=await ki(this.client,new fi({Bucket:this.bucket,Key:t}),{expiresIn:60}),r=await fetch(o,{redirect:"follow"});if(r.status===404)return null;if(!r.ok)throw new Error(`${this.name} download failed: ${r.status} ${r.statusText}`);return new Uint8Array(await r.arrayBuffer())}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){try{return await this.client.send(new mi({Bucket:this.bucket,Key:t})),!0}catch(o){if(typeof o=="object"&&o!==null&&"$metadata"in o&&o.$metadata?.httpStatusCode===404)return!1;throw o}}async delete(t){await this.client.send(new gi({Bucket:this.bucket,Key:t}))}async list(t=""){let o=[],r;do{let n=await this.client.send(new yi({Bucket:this.bucket,Prefix:t||void 0,ContinuationToken:r}));for(let i of n.Contents??[])i.Key&&o.push({key:i.Key,size:i.Size,updatedAt:i.LastModified?.toISOString()});r=n.IsTruncated?n.NextContinuationToken:void 0}while(r);return o}};import{createCipheriv as Ii,createDecipheriv as ji,createHash as wi,randomBytes as vi,timingSafeEqual as Si}from"node:crypto";import{readFileSync as xi}from"node:fs";var T=Buffer.from("TNMEME01","ascii"),ro=1,q=8,Q=12,Ve=16,no=T.length+1+q+Q+Ve,Ci="toolnet-memory:remote-encryption:v1:",io="aes-256-gcm",ze=32,g=class extends Error{constructor(o,r){super(r);this.code=o;this.name="RemoteEncryptionError"}code};function Oi(e){return e?["1","true","yes","on","enabled"].includes(e.trim().toLowerCase()):!1}function We(e=process.env){return Oi(e.TOOLNET_REMOTE_ENCRYPTION)}function oo(e){let t=e.trim();if(!t)throw new g("REMOTE_ENCRYPTION_KEY_EMPTY","Remote encryption key is empty.");let o;if(t.startsWith("hex:")){let r=t.slice(4);if(!/^[0-9a-f]{64}$/iu.test(r))throw new g("REMOTE_ENCRYPTION_KEY_INVALID","hex: remote encryption key must contain exactly 64 hexadecimal characters.");o=Buffer.from(r,"hex")}else if(/^[0-9a-f]{64}$/iu.test(t))o=Buffer.from(t,"hex");else{let r=t.startsWith("base64:")?t.slice(7):t;if(!/^[A-Za-z0-9+/_-]+={0,2}$/u.test(r))throw new g("REMOTE_ENCRYPTION_KEY_INVALID","Remote encryption key must be 32 raw bytes encoded as hexadecimal or base64.");o=Buffer.from(r,r.includes("-")||r.includes("_")?"base64url":"base64")}if(o.length!==ze)throw new g("REMOTE_ENCRYPTION_KEY_INVALID_LENGTH",`Remote encryption key must decode to exactly ${ze} bytes.`);return o}function so(e=process.env){let t=e.TOOLNET_REMOTE_ENCRYPTION_KEY?.trim(),o=e.TOOLNET_REMOTE_ENCRYPTION_KEY_FILE?.trim();if(t&&o)throw new g("REMOTE_ENCRYPTION_KEY_AMBIGUOUS","Configure either TOOLNET_REMOTE_ENCRYPTION_KEY or TOOLNET_REMOTE_ENCRYPTION_KEY_FILE, not both.");if(t)return oo(t);if(o){let r;try{r=xi(o,"utf8")}catch(n){throw new g("REMOTE_ENCRYPTION_KEY_FILE_READ_FAILED",[`Unable to read remote encryption key file: ${o}.`,n instanceof Error?n.message:String(n)].join(" "))}return oo(r)}}function co(e){return wi("sha256").update(e).digest().subarray(0,q)}function ao(e){return Buffer.from(`${Ci}${e}`,"utf8")}function qe(e){return e.byteLength<T.length?!1:Buffer.from(e).subarray(0,T.length).equals(T)}function lo(e,t,o){if(o.byteLength!==ze)throw new g("REMOTE_ENCRYPTION_KEY_INVALID_LENGTH","AES-256-GCM requires a 32-byte key.");let r=typeof t=="string"?Buffer.from(t,"utf8"):Buffer.from(t),n=vi(Q),i=Ii(io,o,n);i.setAAD(ao(e));let s=Buffer.concat([i.update(r),i.final()]),c=i.getAuthTag(),a=Buffer.alloc(no),l=0;return T.copy(a,l),l+=T.length,a.writeUInt8(ro,l),l+=1,co(o).copy(a,l),l+=q,n.copy(a,l),l+=Q,c.copy(a,l),Buffer.concat([a,s])}function uo(e,t,o){let r=Buffer.from(t);if(!qe(r))throw new g("REMOTE_ENCRYPTION_ENVELOPE_REQUIRED","Payload is not a ToolNet encrypted remote object.");if(r.length<no)throw new g("REMOTE_ENCRYPTION_ENVELOPE_TRUNCATED","Encrypted remote payload is truncated.");let n=T.length,i=r.readUInt8(n);if(n+=1,i!==ro)throw new g("REMOTE_ENCRYPTION_VERSION_UNSUPPORTED",`Unsupported remote encryption envelope version: ${i}.`);let s=r.subarray(n,n+q);n+=q;let c=co(o);if(!Si(s,c))throw new g("REMOTE_ENCRYPTION_KEY_MISMATCH","Configured remote encryption key does not match this encrypted object.");let a=r.subarray(n,n+Q);n+=Q;let l=r.subarray(n,n+Ve);n+=Ve;let u=r.subarray(n),d=ji(io,o,a);d.setAAD(ao(e)),d.setAuthTag(l);try{return Buffer.concat([d.update(u),d.final()])}catch{throw new g("REMOTE_ENCRYPTION_AUTH_FAILED","Encrypted remote object failed AES-GCM authentication.")}}var Qe=class{constructor(t,o){this.inner=t;this.options=o;if(this.name=t.name,o.enabled&&!o.key)throw new g("REMOTE_ENCRYPTION_KEY_REQUIRED","Remote client-side encryption is enabled but no encryption key is configured.")}inner;options;name;async put(t,o,r){if(!this.options.enabled){await this.inner.put(t,o,r);return}let n=this.options.key;if(!n)throw new g("REMOTE_ENCRYPTION_KEY_REQUIRED","Remote encryption key is unavailable.");let i=lo(t,o,n);await this.inner.put(t,i,"application/octet-stream")}async get(t){let o=await this.inner.get(t);if(!o)return null;if(!qe(o))return o;if(!this.options.enabled)throw new g("REMOTE_ENCRYPTION_REQUIRED",["Remote object is client-side encrypted.","Enable TOOLNET_REMOTE_ENCRYPTION and configure the matching key."].join(" "));let r=this.options.key;if(!r)throw new g("REMOTE_ENCRYPTION_KEY_REQUIRED","Remote object is encrypted but no decryption key is configured.");return uo(t,o,r)}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){return this.inner.exists(t)}async delete(t){await this.inner.delete(t)}async list(t=""){return this.inner.list(t)}};function po(e,t=process.env){if(e.name==="local")return We(t)&&console.warn("[storage] Remote encryption requested but active storage provider is local; local data remains unchanged."),e;let o=We(t),r=o?so(t):void 0;return new Qe(e,{enabled:o,key:r})}function Z(e){return po(e)}function Ze(e,t){return console.warn(t),Z(new z(e))}function go(e){let t=e.localRoot??Ei(Ri(),".toolnet-memory","storage");if(e.provider==="r2"){let o=e.r2;return o?.accountId&&o.bucket&&o.accessKeyId&&o.secretAccessKey?Z(new W({name:"r2",endpoint:`https://${o.accountId}.r2.cloudflarestorage.com`,region:"auto",bucket:o.bucket,forcePathStyle:!0,accessKeyId:o.accessKeyId,secretAccessKey:o.secretAccessKey})):Ze(t,"[storage] Cloudflare R2 credentials missing. Using local fallback.")}if(e.provider==="s3"){let o=e.s3;return o?.bucket&&o.accessKeyId&&o.secretAccessKey?Z(new W({name:"s3",endpoint:o.endpoint,region:o.region??"us-east-1",bucket:o.bucket,forcePathStyle:o.forcePathStyle??!1,accessKeyId:o.accessKeyId,secretAccessKey:o.secretAccessKey})):Ze(t,"[storage] S3 credentials missing. Using local fallback.")}if(e.provider==="huggingface"){let o=e.huggingface;return o?.namespace&&o.bucket&&o.accessKeyId&&o.secretAccessKey?Z(new he({namespace:o.namespace,bucket:o.bucket,accessKeyId:o.accessKeyId,secretAccessKey:o.secretAccessKey})):Ze(t,"[storage] Hugging Face credentials missing. Using local fallback.")}return Z(new z(t))}function Pi(e){return new Promise(t=>setTimeout(t,e))}async function fo(e,t={}){let o=Math.max(1,t.attempts??3),r=t.baseDelayMs??150,n=t.maxDelayMs??2e3,i;for(let s=1;s<=o;s++)try{return await e()}catch(c){if(i=c,s>=o)break;let a=Math.min(n,r*2**(s-1)),l=Math.floor(Math.random()*Math.max(1,a*.2));await Pi(a+l)}throw i}var Ti=new Set(["put","get","getText","delete","list"]);function mo(e,t={}){return new Proxy(e,{get(o,r){let n=Reflect.get(o,r,o);return typeof n!="function"?n:Ti.has(r)?(...i)=>fo(()=>Promise.resolve(n.apply(o,i)),t):n.bind(o)}})}function F(e){let t=e.trim().replace(/\s+/g,"_").replace(/[^A-Za-z0-9._-]/g,"_").replace(/_+/g,"_").replace(/^\.+|\.+$/g,"").slice(0,100);if(!t||t==="."||t==="..")throw new Error("Invalid project storage folder");return t}var Mi="_toolnet/registry/project-identities/v1",h=class extends Error{code="PROJECT_IDENTITY_COLLISION";constructor(t){super(t),this.name="ProjectIdentityCollisionError"}},be=class extends Error{code="PROJECT_IDENTITY_ADOPTION_REQUIRED";constructor(t,o){super(["PROJECT_IDENTITY_ADOPTION_REQUIRED",`remote=${t}`,`projectId=${o}`,"A legacy remote ToolNet project exists but has no Git fingerprint proof.",`Re-run with: toolnet-memory init --adopt-remote ${t}`].join(" ")),this.name="ProjectIdentityAdoptionRequiredError"}},X=class extends Error{code="PROJECT_IDENTITY_REGISTRY_UNAVAILABLE";constructor(t){super(["PROJECT_IDENTITY_REGISTRY_UNAVAILABLE",t,"Refusing to create a possibly split project identity while configured remote storage cannot be checked.","Use --no-remote-identity only when local-only initialization is intentional."].join(" ")),this.name="ProjectIdentityRegistryUnavailableError"}};function Ni(){let e=Ke();if(e.storage.provider==="r2"){let t=e.storage.r2;return!!(t.accountId&&t.bucket&&t.accessKeyId&&t.secretAccessKey)}if(e.storage.provider==="s3"){let t=e.storage.s3;return!!(t.bucket&&t.accessKeyId&&t.secretAccessKey)}if(e.storage.provider==="huggingface"){let t=e.storage.huggingface;return!!(t.namespace&&t.bucket&&t.accessKeyId&&t.secretAccessKey)}return!1}function yo(e){if(e.storage)return{storage:e.storage,crossMachine:e.storageIsCrossMachine??!0,providerName:e.storage.name};let t=Ke(),o=go({provider:t.storage.provider,r2:t.storage.r2,s3:t.storage.s3,huggingface:t.storage.huggingface,localRoot:t.storage.localRoot}),r=Ni()&&o.name!=="local";return{storage:r?mo(o,{attempts:Number(process.env.TOOLNET_STORAGE_RETRIES??3)}):o,crossMachine:r,providerName:o.name}}function bo(e){return[Mi,`${e.fingerprint}.json`].join("/")}function ko(e,t){let o;try{o=JSON.parse(e)}catch(i){throw new h([`Invalid ToolNet project identity registry record: ${t}.`,i instanceof Error?i.message:String(i)].join(" "))}if(!o||typeof o!="object"||Array.isArray(o))throw new h(`Invalid ToolNet project identity registry record: ${t}`);let r=o;for(let i of["fingerprint","canonicalGitRemote","projectId","projectName","projectRemote"])if(typeof r[i]!="string"||!String(r[i]).trim())throw new h(`ToolNet identity registry record ${t} is missing ${i}`);let n=new Date().toISOString();return{version:1,fingerprint:String(r.fingerprint),canonicalGitRemote:String(r.canonicalGitRemote),projectId:String(r.projectId),projectName:String(r.projectName),projectRemote:String(r.projectRemote),createdAt:typeof r.createdAt=="string"?r.createdAt:n,updatedAt:typeof r.updatedAt=="string"?r.updatedAt:n}}function _i(e,t){let o;try{o=JSON.parse(e)}catch(s){throw new h([`Invalid remote ToolNet project manifest: ${t}.`,s instanceof Error?s.message:String(s)].join(" "))}if(!o||typeof o!="object"||Array.isArray(o))throw new h(`Invalid remote ToolNet project manifest: ${t}`);let r=o;if(typeof r.id!="string"||!r.id.trim())throw new h(`Remote ToolNet project manifest ${t} is missing id`);let n=typeof r.remote=="string"&&r.remote.trim()?r.remote:t.split("/")[1]??"project",i=typeof r.name=="string"&&r.name.trim()?r.name:n;return{version:typeof r.version=="number"?r.version:void 0,id:r.id,name:i,remote:n,createdAt:typeof r.createdAt=="string"?r.createdAt:void 0,updatedAt:typeof r.updatedAt=="string"?r.updatedAt:void 0}}async function ke(e,t){let r=`projects/${F(t)}/project.json`,n=await e.getText(r);return n?_i(n,r):null}async function Fi(e,t){let o=bo(t),r=await e.getText(o);if(!r)return null;let n=ko(r,o);if(n.fingerprint!==t.fingerprint||n.canonicalGitRemote!==t.canonicalRemote)throw new h(["PROJECT_IDENTITY_REGISTRY_MISMATCH",`key=${o}`,`expectedFingerprint=${t.fingerprint}`,`actualFingerprint=${n.fingerprint}`].join(" "));return n}async function $i(e,t){let o=await ke(e,t.projectRemote);if(o&&o.id!==t.projectId)throw new h(["PROJECT_IDENTITY_REMOTE_OWNERSHIP_MISMATCH",`remote=${t.projectRemote}`,`registryId=${t.projectId}`,`remoteId=${o.id}`].join(" "))}async function Xe(e,t,o){let r=F(t.remote??t.name),n=await ke(e,r);if(n&&n.id!==t.id)throw new h(["PROJECT_IDENTITY_REMOTE_NAMESPACE_COLLISION",`remote=${r}`,`existing=${n.id}`,`current=${t.id}`].join(" "));let i=bo(o),s=await e.getText(i);if(s){let l=ko(s,i);if(l.projectId!==t.id||l.canonicalGitRemote!==o.canonicalRemote)throw new h(["PROJECT_IDENTITY_REGISTRY_COLLISION",`fingerprint=${o.fingerprint}`,`existingProject=${l.projectId}`,`currentProject=${t.id}`].join(" "));return}let c=new Date().toISOString(),a={version:1,fingerprint:o.fingerprint,canonicalGitRemote:o.canonicalRemote,projectId:t.id,projectName:t.name,projectRemote:r,createdAt:t.createdAt,updatedAt:c};await e.put(i,JSON.stringify(a,null,2)+`
`,"application/json")}function Di(e,t){return{id:e.id,name:e.name,remote:e.remote,createdAt:e.createdAt,gitIdentity:t,metadata:{adoptedFromRemote:!0,adoptedAt:new Date().toISOString()}}}function ho(e){return e instanceof h||e instanceof be||e instanceof X}async function Io(e=process.cwd(),t={}){let o=Ai(e),r=new _,n=r.findExisting(o),i=ue(n?.rootPath??o);if(n){let c=n;if(i&&(c=r.recordGitIdentity(n.rootPath,i,{allowRebind:t.allowGitRebind??!1})),t.skipRemoteIdentity||!i)return{project:c,source:"existing-manifest",gitIdentity:i,registry:t.skipRemoteIdentity?"skipped":"disabled"};let a=yo(t);if(!a.crossMachine)return{project:c,source:"existing-manifest",gitIdentity:i,registry:"disabled",registryProvider:a.providerName};try{return await Xe(a.storage,c,i),{project:c,source:"existing-manifest",gitIdentity:i,registry:"registered",registryProvider:a.providerName}}catch(l){if(ho(l))throw l;return{project:c,source:"existing-manifest",gitIdentity:i,registry:"unavailable",registryProvider:a.providerName}}}if(!i)return{project:r.detect(o),source:"legacy-path",gitIdentity:null,registry:"disabled"};if(t.skipRemoteIdentity)return{project:r.detect(o),source:"git-remote",gitIdentity:i,registry:"skipped"};let s=yo(t);if(!s.crossMachine){if(t.adoptRemote)throw new X("Explicit remote adoption was requested but no cross-machine storage provider is configured.");return{project:r.detect(o),source:"git-remote",gitIdentity:i,registry:"disabled",registryProvider:s.providerName}}try{let c=await Fi(s.storage,i);if(c){if(t.adoptRemote&&F(t.adoptRemote)!==F(c.projectRemote))throw new h(["PROJECT_IDENTITY_EXPLICIT_ADOPTION_CONFLICT",`requested=${t.adoptRemote}`,`registered=${c.projectRemote}`].join(" "));return await $i(s.storage,c),{project:r.adopt(o,{id:c.projectId,name:c.projectName,remote:c.projectRemote,createdAt:c.createdAt,gitIdentity:i,metadata:{adoptedFromRegistry:!0,adoptedAt:new Date().toISOString()}}),source:"remote-registry",gitIdentity:i,registry:"matched",registryProvider:s.providerName}}if(t.adoptRemote){let u=await ke(s.storage,t.adoptRemote);if(!u)throw new Error(["PROJECT_ADOPTION_REMOTE_NOT_FOUND",`remote=${t.adoptRemote}`].join(" "));let d=r.adopt(o,Di(u,i));return await Xe(s.storage,d,i),{project:d,source:"explicit-remote-adoption",gitIdentity:i,registry:"registered",registryProvider:s.providerName}}let a=await ke(s.storage,i.repositoryName);if(a)throw new be(a.remote,a.id);let l=r.detect(o);return await Xe(s.storage,l,i),{project:l,source:"git-remote",gitIdentity:i,registry:"registered",registryProvider:s.providerName}}catch(c){throw ho(c)?c:new X(c instanceof Error?c.message:String(c))}}import{existsSync as qo}from"node:fs";import{homedir as ls}from"node:os";import{join as us}from"node:path";import{spawnSync as ds}from"node:child_process";import{homedir as Hi}from"node:os";import{join as $}from"node:path";function jo(e={}){return $(e.home??Hi(),".gemini")}function wo(e={}){return $(jo(e),"antigravity-cli")}function vo(e={}){return $(jo(e),"config")}function Ie(e={}){return $(vo(e),"mcp_config.json")}function je(e={}){let t=e.cwd??process.cwd();return $(t,".agents","mcp_config.json")}function we(e="toolnet-memory",t={}){return $(wo(t),"plugins",e)}function So(e={}){return[wo(e),Ie(e),vo(e),je(e)]}import{homedir as xo}from"node:os";import{join as A}from"node:path";function D(e={}){let t=process.env.OPENCODE_CONFIG_DIR?.trim();if(t)return t;let o=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return o?A(o,"opencode"):A(e.home??xo(),".config","opencode")}function et(e={}){let t=process.env.OPENCODE_CONFIG?.trim();if(t)return t;let o=e.home??xo(),r=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return r?A(r,"opencode","opencode.json"):A(o,".config","opencode","opencode.json")}function tt(e={}){let t=e.cwd??process.cwd();return A(t,"opencode.json")}function Co(e={}){return A(D(e),"plugins")}function Oo(e={}){return A(D(e),"AGENTS.md")}import{homedir as Ro}from"node:os";import{join as ot}from"node:path";function rt(e={}){return ot(e.home??Ro(),".claude")}function Eo(e={}){return ot(rt(e),"settings.json")}function Po(e={}){return ot(e.home??Ro(),".claude.json")}import{homedir as Li}from"node:os";import{join as M}from"node:path";function nt(e={}){return e.kiroHome??process.env.KIRO_HOME??M(e.home??Li(),".kiro")}function Ki(e={}){return M(nt(e),"settings")}function ve(e={}){return M(Ki(e),"mcp.json")}function it(e={}){let t=e.cwd??process.cwd();return M(t,".kiro","settings","mcp.json")}function Ji(e={}){return M(nt(e),"hooks")}function st(e={}){return M(Ji(e),"toolnet-memory.json")}function ct(e={}){let t=e.cwd??process.cwd();return M(t,".kiro","hooks","toolnet-memory.json")}function To(e={}){return[nt(e),ve(e)]}import{homedir as Gi}from"node:os";import{join as at}from"node:path";function Ao(e={}){return at(e.home??Gi(),".toolnetcli")}function Bi(e={}){return at(Ao(e),"config.json")}function Mo(e={}){let t=e.cwd??process.cwd();return at(t,".toolnet","mcp.json")}function No(e={}){let t=Ao(e),o=Bi(e);return[t,o]}import{homedir as Ui}from"node:os";import{join as lt}from"node:path";function _o(e={}){if(e.kiloHome)return e.kiloHome;if(process.env.KILO_HOME)return process.env.KILO_HOME;let t=e.xdgConfigHome??process.env.XDG_CONFIG_HOME;return t?lt(t,"kilo"):lt(e.home??Ui(),".config","kilo")}function ut(e={}){return lt(_o(e),"kilo.jsonc")}function Fo(e={}){let t=_o(e),o=ut(e);return[t,o]}import{homedir as Yi}from"node:os";import{join as w,resolve as Vi}from"node:path";function Se(e={}){return e.cursorHome??w(e.home??Yi(),".cursor")}function zi(e={}){return e.cursorConfigDir??process.env.CURSOR_CONFIG_DIR??(e.xdgConfigHome??process.env.XDG_CONFIG_HOME?w(e.xdgConfigHome??process.env.XDG_CONFIG_HOME,"cursor"):void 0)??Se(e)}function xe(e={}){return w(Se(e),"mcp.json")}function Ce(e={}){return w(Se(e),"hooks.json")}function dt(e){return w(Vi(e),".cursor")}function $o(e){return w(dt(e),"mcp.json")}function Do(e){return w(dt(e),"hooks.json")}function Wi(e){return w(dt(e),"rules")}function Ho(e){return w(Wi(e),"toolnet-memory.mdc")}function Lo(e={}){return Array.from(new Set([Se(e),zi(e)]))}import{homedir as qi}from"node:os";import{join as j,resolve as Qi}from"node:path";function pt(e={}){return e.copilotHome??process.env.COPILOT_HOME??j(e.home??qi(),".copilot")}function Oe(e={}){return j(pt(e),"mcp-config.json")}function Zi(e={}){return j(pt(e),"hooks")}function Re(e={}){return j(Zi(e),"toolnet-memory.json")}function gt(e){return j(Qi(e),".github")}function Ko(e){return j(gt(e),"mcp.json")}function Xi(e){return j(gt(e),"hooks")}function Jo(e){return j(Xi(e),"toolnet-memory.json")}function es(e){return j(gt(e),"instructions")}function Go(e){return j(es(e),"toolnet-memory.instructions.md")}function Bo(e={}){return[pt(e)]}import{homedir as ts}from"node:os";import{join as b,resolve as os}from"node:path";function Ee(e={}){return e.grokHome??process.env.GROK_HOME??b(e.home??ts(),".grok")}function Pe(e={}){return b(Ee(e),"config.toml")}function rs(e={}){return b(Ee(e),"hooks")}function Te(e={}){return b(rs(e),"toolnet-memory.json")}function ns(e={}){return b(Ee(e),"skills")}function is(e={}){return b(ns(e),"toolnet-continuity")}function Ae(e={}){return b(is(e),"SKILL.md")}function ft(e){return b(os(e),".grok")}function Uo(e){return b(ft(e),"config.toml")}function ss(e){return b(ft(e),"hooks")}function Yo(e){return b(ss(e),"toolnet-memory.json")}function cs(e){return b(ft(e),"skills")}function as(e){return b(cs(e),"toolnet-continuity")}function Vo(e){return b(as(e),"SKILL.md")}function zo(e={}){return[Ee(e)]}function ps(e){return ds("sh",["-lc",`command -v ${JSON.stringify(e)} >/dev/null 2>&1`],{stdio:"ignore"}).status===0}function C(e){let t=e.commandExists(e.command),o=e.configPaths.filter(i=>qo(i)),r=o.length>0,n=[];t&&n.push(`command:${e.command}`);for(let i of o)n.push(`config:${i}`);return{agent:e.agent,detected:t||r,commandDetected:t,configDetected:r,evidence:n}}function Wo(e){let t=e.commands.filter(s=>e.commandExists(s)),o=e.configPaths.filter(s=>qo(s)),r=t.length>0,n=o.length>0,i=[...t.map(s=>`command:${s}`),...o.map(s=>`config:${s}`)];return{agent:e.agent,detected:r||n,commandDetected:r,configDetected:n,evidence:i}}function Qo(e={}){let t=e.home??ls(),o=e.commandExists??ps,r=e.codexHome??process.env.CODEX_HOME??us(t,".codex");return[C({agent:"agy",command:"agy",commandExists:o,configPaths:So({home:t})}),C({agent:"opencode",command:"opencode",commandExists:o,configPaths:[D({home:t,xdgConfigHome:e.xdgConfigHome})]}),C({agent:"claude",command:"claude",commandExists:o,configPaths:[rt({home:t})]}),C({agent:"kiro",command:"kiro-cli",commandExists:o,configPaths:To({home:t,kiroHome:e.kiroHome})}),Wo({agent:"cursor",commands:["agent","cursor-agent"],commandExists:o,configPaths:Lo({home:t,cursorHome:e.cursorHome,cursorConfigDir:e.cursorConfigDir,xdgConfigHome:e.xdgConfigHome})}),C({agent:"copilot",command:"copilot",commandExists:o,configPaths:Bo({home:t,copilotHome:e.copilotHome})}),C({agent:"grok",command:"grok",commandExists:o,configPaths:zo({home:t,grokHome:e.grokHome})}),C({agent:"toolnet-cli",command:"toolnet",commandExists:o,configPaths:No({home:t})}),Wo({agent:"kilo",commands:["kilo","kilo-code"],commandExists:o,configPaths:Fo({home:t,kiloHome:e.kiloHome})}),C({agent:"codex",command:"codex",commandExists:o,configPaths:[r]})]}import{existsSync as Ts,mkdirSync as rr,readFileSync as As,renameSync as Ms,writeFileSync as Ns}from"node:fs";import{dirname as _s,join as Ne}from"node:path";import{existsSync as gs,mkdirSync as fs,readFileSync as ms,renameSync as ys,rmSync as hs,writeFileSync as bs}from"node:fs";import{dirname as ks,join as Is}from"node:path";function js(e){return`'${e.replace(/'/g,"'\\''")}'`}function ws(e){if(!gs(e))return{};let t;try{t=JSON.parse(ms(e,"utf8"))}catch{throw new Error(`Invalid existing Agy hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Agy hooks.json at ${e}: root must be a JSON object.`);return t}function vs(e,t){fs(ks(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{bs(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),ys(o,e)}finally{hs(o,{force:!0})}}function Zo(e={}){let t=e.pluginName??"toolnet-memory",o=e.hooksFile??Is(we(t),"hooks.json"),r=ws(o),n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",i=`${js(n)} session:agy-hook`;return r["toolnet-memory"]={enabled:!0,PreToolUse:[{matcher:"view_file|list_dir|find_by_name|grep_search|run_command",hooks:[{type:"command",command:`${i} pre-tool`,timeout:5}]}],PreInvocation:[{type:"command",command:`${i} pre`,timeout:15}],PostInvocation:[{type:"command",command:`${i} post`,timeout:15}],Stop:[{type:"command",command:`${i} stop`,timeout:30}]},vs(o,r),o}import{existsSync as Ss,mkdirSync as xs,readFileSync as Cs,renameSync as Os,writeFileSync as Rs}from"node:fs";import{dirname as Es}from"node:path";function ee(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Ps(e,t){xs(Es(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;Rs(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Os(o,e)}function Xo(e){if(!Ss(e))return{};let t=Cs(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Agy MCP config at ${e}: parse error. Not overwriting.`)}if(!ee(o))throw new Error(`Invalid existing Agy MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function er(e,t){return ee(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function Me(e,t,o,r){let n=Xo(e),i=n.mcpServers;if(i!==void 0&&!ee(i))throw new Error(`Invalid existing Agy MCP config: mcpServers must be an object in ${e}.`);let s=ee(i)?{...i}:{},c=s[o];if(er(c,t)&&!r)return{installed:!0,changed:!1};s[o]={command:t,args:["mcp"]};let a={...n,mcpServers:s};Ps(e,a);let u=Xo(e).mcpServers;if(!ee(u)||!er(u[o],t))throw new Error(`Agy MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function tr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...Me(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(r==="both"){let s=Ie(),c=je({cwd:e.cwd}),a=Me(s,t,o,e.force??!1),l=Me(c,t,o,e.force??!1);return{installed:!0,changed:a.changed||l.changed,configFile:s,serverName:o,command:t,args:["mcp"]}}let n=r==="workspace"?je({cwd:e.cwd}):Ie();return{...Me(n,t,o,e.force??!1),configFile:n,serverName:o,command:t,args:["mcp"]}}var Fs=`# ToolNet Memory Continuity

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
`;function $s(e,t){rr(_s(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;Ns(o,t,{encoding:"utf8",mode:384}),Ms(o,e)}function or(e,t){Ts(e)&&As(e,"utf8")===t||$s(e,t)}function nr(e={}){let t=e.pluginName??"toolnet-memory",o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.pluginRoot??we(t),n=Ne(r,"plugin.json"),i=Ne(r,"mcp_config.json"),s=Ne(r,"hooks.json"),c=Ne(r,"rules","toolnet-memory-continuity.md");return rr(r,{recursive:!0,mode:448}),or(n,`${JSON.stringify({$schema:"https://antigravity.google/schemas/v1/plugin.json",name:t,description:"Persistent project continuity and memory for Antigravity coding sessions."},null,2)}
`),tr({configFile:i,binary:o,serverName:"toolnet-memory",force:e.force}),Zo({hooksFile:s,binary:o,pluginName:t}),or(c,`${Fs.trim()}
`),{installed:!0,pluginRoot:r,files:[n,i,s,c]}}import{existsSync as Hs,mkdirSync as ar,readFileSync as Ls,writeFileSync as lr}from"node:fs";import{join as sr}from"node:path";var Ds="memory_agent_ask";function ir(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${Ds}

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
`.trim()}var cr="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",mt="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function Ks(e={}){let t=Oo();ar(D(),{recursive:!0});let o=`${cr}
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


${ir()}

${mt}`,r=Hs(t)?Ls(t,"utf8"):"",n=r.indexOf(cr),i=r.indexOf(mt);return n>=0&&i>=n?r=r.slice(0,n)+o+r.slice(i+mt.length):(r=r.trimEnd(),r&&(r+=`

`),r+=o),lr(t,r.trimEnd()+`
`,{encoding:"utf8",mode:384}),t}function ur(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[];o.push(Ks({cwd:e.cwd}));let r=e.scope??"global",n=[];if((r==="global"||r==="both")&&n.push(e.directory??Co()),r==="project"||r==="both"){let i=e.cwd??process.cwd();n.push(sr(i,".opencode","plugins"))}for(let i of n){ar(i,{recursive:!0});let s=sr(i,"toolnet-memory.js"),c=`
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
`;lr(s,c.trimStart(),{encoding:"utf8",mode:384}),o.push(s)}return o}import{existsSync as gr,mkdirSync as Js,readFileSync as Gs,renameSync as Bs,writeFileSync as Us}from"node:fs";import{dirname as fr,join as Ys}from"node:path";function te(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Vs(e,t){Js(fr(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;Us(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Bs(o,e)}function dr(e){if(!gr(e))return{};let t=Gs(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing OpenCode config at ${e}: parse error. Not overwriting.`)}if(!te(o))throw new Error(`Invalid existing OpenCode config at ${e}: root must be a JSON object. Not overwriting.`);return o}function pr(e,t){if(!te(e))return!1;let o=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(o)&&o.length===2&&o[0]===t&&o[1]==="mcp"}function _e(e,t,o,r){let n=Ys(fr(e),"opencode.jsonc"),i=gr(n)?n:void 0,s=dr(e),c=s.mcp;if(c!==void 0&&!te(c))throw new Error(`Invalid existing OpenCode config: mcp must be an object in ${e}.`);let a=te(c)?{...c}:{},l=a[o];if(pr(l,t)&&!r)return{installed:!0,changed:!1,preservedJsonc:i};a[o]={type:"local",command:[t,"mcp"],enabled:!0};let u={...s,mcp:a};Vs(e,u);let d=dr(e);if(!te(d.mcp)||!pr(d.mcp[o],t))throw new Error(`OpenCode MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0,preservedJsonc:i}}function mr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{..._e(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:[t,"mcp"]};if(r==="both"){let s=et(),c=tt({cwd:e.cwd}),a=_e(s,t,o,e.force??!1),l=_e(c,t,o,e.force??!1);return{installed:!0,changed:a.changed||l.changed,configFile:s,serverName:o,command:[t,"mcp"],preservedJsonc:a.preservedJsonc??l.preservedJsonc}}let n=r==="project"?tt({cwd:e.cwd}):et();return{..._e(n,t,o,e.force??!1),configFile:n,serverName:o,command:[t,"mcp"]}}import{existsSync as zs,mkdirSync as yr,readFileSync as Ws,writeFileSync as hr}from"node:fs";import{homedir as br}from"node:os";import{dirname as kr,join as yt}from"node:path";function qs(e){let t=[],o=/"((?:\\.|[^"\\])*)"|'([^']*)'/g,r;for(;r=o.exec(e);){let n=r[1]??r[2]??"";try{t.push(r[1]!==void 0?JSON.parse(`"${n}"`):n)}catch{t.push(n)}}return t}function Ir(e={}){let t=e.configFile??yt(process.env.CODEX_HOME??yt(br(),".codex"),"config.toml"),o=e.previousFile??yt(br(),".config","toolnet-memory","codex-notify-previous.json");yr(kr(t),{recursive:!0}),yr(kr(o),{recursive:!0});let r=zs(t)?Ws(t,"utf8"):"",n=e.binary??"toolnet-memory",i=`notify = [${JSON.stringify(n)}, "session:codex-notify"]`,s=r.split(`
`),c=s.findIndex(p=>/^\s*\[/.test(p));c<0&&(c=s.length);let a=-1,l=-1;for(let p=0;p<c;p+=1)if(/^\s*notify\s*=/.test(s[p])){if(a=p,l=p,s[p].includes("[")&&!s[p].includes("]"))for(;l+1<c&&(l+=1,!s[l].includes("]")););break}let u=[];if(a>=0){let p=s.slice(a,l+1).join(`
`);u=qs(p),s.splice(a,l-a+1,i)}else c=s.findIndex(p=>/^\s*\[/.test(p)),c<0&&(c=s.length),s.splice(c,0,i);let d=u.length>=2&&u[u.length-1]==="session:codex-notify";return u.length>0&&!d&&hr(o,JSON.stringify(u,null,2)+`
`,{encoding:"utf8",mode:384}),r=s.join(`
`),r.endsWith(`
`)||(r+=`
`),hr(t,r,{encoding:"utf8",mode:384}),{configFile:t,previousFile:o,preservedPrevious:u.length>0&&!d}}import{existsSync as Qs,mkdirSync as Zs,readFileSync as Xs,writeFileSync as ec}from"node:fs";import{homedir as tc}from"node:os";import{dirname as oc,join as jr}from"node:path";function rc(e){return`'${e.replace(/'/g,"'\\''")}'`}function wr(e={}){let t=e.hooksFile??jr(process.env.CODEX_HOME??jr(tc(),".codex"),"hooks.json");Zs(oc(t),{recursive:!0});let o={};if(Qs(t))try{o=JSON.parse(Xs(t,"utf8"))}catch(c){throw new Error(`Invalid existing Codex hooks.json: ${c instanceof Error?c.message:String(c)}`)}let r=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=r;let i=(Array.isArray(r.SessionStart)?r.SessionStart:[]).filter(c=>{try{return!JSON.stringify(c).includes("session:codex-context")}catch{return!0}}),s=e.binary??"toolnet-memory";return i.push({matcher:"startup|resume|clear|compact",hooks:[{type:"command",command:`${rc(s)} session:codex-context`,timeout:15,additionalContextLimit:1e3,statusMessage:"Loading ToolNet project continuity"}]}),r.SessionStart=i,ec(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),t}import{spawnSync as nc}from"node:child_process";function ht(e,t){return nc(e,t,{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}function vr(e,t){let o=ht(e,["mcp","get",t,"--json"]);if(o.status!==0||!o.stdout)return null;try{return JSON.parse(o.stdout)}catch{return null}}function Sr(e,t){return e.enabled!==!1&&e.transport?.type==="stdio"&&e.transport?.command===t&&Array.isArray(e.transport?.args)&&e.transport?.args.length===1&&e.transport.args[0]==="mcp"}function xr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.codexBinary??"codex",r=e.serverName??"toolnet-memory",n=vr(o,r);if(n&&Sr(n,t))return{installed:!0,changed:!1,serverName:r,command:t,args:["mcp"]};if(n){let c=ht(o,["mcp","remove",r]);if(c.status!==0)return{installed:!1,changed:!1,serverName:r,command:t,args:["mcp"],error:(c.stderr||c.stdout||"Unable to remove old ToolNet MCP configuration.").trim()}}let i=ht(o,["mcp","add",r,"--",t,"mcp"]);if(i.status!==0)return{installed:!1,changed:!1,serverName:r,command:t,args:["mcp"],error:(i.stderr||i.stdout||"Unable to register ToolNet MCP.").trim()};let s=vr(o,r);return!s||!Sr(s,t)?{installed:!1,changed:!0,serverName:r,command:t,args:["mcp"],error:"Codex accepted MCP registration but verification did not match expected ToolNet command."}:{installed:!0,changed:!0,serverName:r,command:t,args:["mcp"]}}import{existsSync as ic,mkdirSync as sc,readFileSync as cc,renameSync as ac,rmSync as lc,writeFileSync as uc}from"node:fs";import{dirname as dc}from"node:path";function oe(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function pc(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function gc(e){if(!ic(e))return{};let t;try{t=JSON.parse(cc(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude settings.json: ${o instanceof Error?o.message:String(o)}`)}if(!oe(t))throw new Error("Invalid existing Claude settings.json: root must be a JSON object.");return t}function bt(e){if(e===void 0)return[];if(!Array.isArray(e))throw new Error("Invalid existing Claude settings.json: hook event must be an array.");let t=[];for(let o of e){if(!oe(o)){t.push(o);continue}let r=o.hooks;if(!Array.isArray(r)){t.push(o);continue}let n=r.filter(i=>{if(!oe(i))return!0;let s=i.command;return!(typeof s=="string"&&s.includes("session:claude-hook"))});n.length!==0&&t.push({...o,hooks:n})}return t}function kt(e){return{type:"command",command:e,timeout:10}}function fc(e,t){sc(dc(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{uc(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),ac(o,e)}finally{lc(o,{force:!0})}}function Cr(e={}){let t=e.settingsFile??Eo(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=gc(t),n=r.hooks;if(n!==void 0&&!oe(n))throw new Error("Invalid existing Claude settings.json: hooks must be an object.");let i=oe(n)?{...n}:{},s=`${pc(o)} session:claude-hook`,c=bt(i.SessionStart);c.push({matcher:"startup|resume|clear|compact",hooks:[kt(s)]}),i.SessionStart=c;let a=bt(i.PostToolUse);a.push({matcher:"Edit|Write",hooks:[kt(s)]}),i.PostToolUse=a;let l=bt(i.Stop);l.push({hooks:[kt(s)]}),i.Stop=l;let u={...r,hooks:i},d=JSON.stringify(r),p=JSON.stringify(u);return d===p?{settingsFile:t,changed:!1}:(fc(t,u),{settingsFile:t,changed:!0})}import{existsSync as mc,mkdirSync as yc,readFileSync as hc,renameSync as bc,rmSync as kc,writeFileSync as Ic}from"node:fs";import{dirname as jc}from"node:path";function re(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Or(e){if(!mc(e))return{};let t;try{t=JSON.parse(hc(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude Code config: ${o instanceof Error?o.message:String(o)}`)}if(!re(t))throw new Error("Invalid existing Claude Code config: root must be a JSON object.");return t}function Rr(e,t){if(!re(e))return!1;let o=e.args;return e.type==="stdio"&&e.command===t&&Array.isArray(o)&&o.length===1&&o[0]==="mcp"}function wc(e,t){yc(jc(e),{recursive:!0});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Ic(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),bc(o,e)}finally{kc(o,{force:!0})}}function Er(e={}){let t=e.stateFile??Po(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=Or(t),i=n.mcpServers;if(i!==void 0&&!re(i))throw new Error("Invalid existing Claude Code config: mcpServers must be an object.");let s=re(i)?{...i}:{},c=s[r];if(Rr(c,o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:[o,"mcp"],repaired:!1};let a=c!==void 0;s[r]={type:"stdio",command:o,args:["mcp"]},wc(t,{...n,mcpServers:s});let u=Or(t).mcpServers;if(!re(u)||!Rr(u[r],o))throw new Error("Claude Code MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:[o,"mcp"],repaired:a}}function Pr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=Cr({binary:t,settingsFile:e.settingsFile}),r=Er({binary:t,stateFile:e.stateFile});return{hooks:o,mcp:r,files:[o.settingsFile,r.configFile]}}import{existsSync as vc,mkdirSync as Sc,readFileSync as xc,renameSync as Cc,rmSync as Oc,writeFileSync as Rc}from"node:fs";import{dirname as Ec}from"node:path";var H="ToolNet Memory - ";function Mr(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Pc(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function Tr(e){if(!vc(e))return{};let t=xc(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro hooks file at ${e}: parse error. Not overwriting.`)}if(!Mr(o))throw new Error(`Invalid existing Kiro hooks file at ${e}: root must be a JSON object. Not overwriting.`);return o}function Ar(e){return Mr(e)?typeof e.name=="string"&&e.name.startsWith(H):!1}function ne(e){return{type:"command",command:e}}function Tc(e){return[{name:`${H}Session Start`,description:"Inject compact local ToolNet continuity and capture Kiro session activation.",trigger:"SessionStart",action:ne(e),timeout:10,enabled:!0},{name:`${H}Prompt Continuity`,description:"Capture prompts and refresh ToolNet guidance only for resume/continue requests.",trigger:"UserPromptSubmit",action:ne(e),timeout:10,enabled:!0},{name:`${H}Raw History Guard`,description:"Prevent Kiro from reconstructing continuity from raw ToolNet/agent session history.",trigger:"PreToolUse",matcher:"*",action:ne(e),timeout:10,enabled:!0},{name:`${H}Tool Capture`,description:"Capture durable tool activity while filtering noisy read-only events.",trigger:"PostToolUse",matcher:"*",action:ne(e),timeout:15,enabled:!0},{name:`${H}Final Flush`,description:"Flush pending Kiro WAL events when the assistant finishes a turn.",trigger:"Stop",action:ne(e),timeout:30,enabled:!0}]}function Ac(e,t){Sc(Ec(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Rc(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Cc(o,e)}finally{Oc(o,{force:!0})}}function Fe(e,t,o){let r=Tr(e);if(r.version!==void 0&&r.version!=="v1")throw new Error(`Unsupported existing Kiro hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!Array.isArray(n))throw new Error("Invalid existing Kiro hooks file: hooks must be an array.");let i=Array.isArray(n)?n.filter(l=>!Ar(l)):[],s=Tc(t),c={...r,version:"v1",hooks:[...i,...s]};if(!o&&JSON.stringify(r)===JSON.stringify(c))return{changed:!1,hookCount:s.length};Ac(e,c);let a=Tr(e);if(a.version!=="v1"||!Array.isArray(a.hooks)||a.hooks.filter(Ar).length!==s.length)throw new Error("Kiro hooks were written but verification failed.");return{changed:!0,hookCount:s.length}}function Nr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=`${Pc(t)} session:kiro-hook`;if(e.hooksFile){let s=Fe(e.hooksFile,r,e.force??!1);return{hooksFile:e.hooksFile,...s}}if(o==="both"){let s=st(),c=ct({cwd:e.cwd}),a=Fe(s,r,e.force??!1),l=Fe(c,r,e.force??!1);return{hooksFile:s,changed:a.changed||l.changed,hookCount:a.hookCount}}let n=o==="project"?ct({cwd:e.cwd}):st(),i=Fe(n,r,e.force??!1);return{hooksFile:n,...i}}import{existsSync as Mc,mkdirSync as Nc,readFileSync as _c,renameSync as Fc,rmSync as $c,writeFileSync as Dc}from"node:fs";import{dirname as Hc}from"node:path";function ie(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function _r(e){if(!Mc(e))return{};let t=_c(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro MCP config at ${e}: parse error. Not overwriting.`)}if(!ie(o))throw new Error(`Invalid existing Kiro MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Fr(e,t){return ie(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&e.disabled===!1:!1}function Lc(e,t){Nc(Hc(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Dc(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Fc(o,e)}finally{$c(o,{force:!0})}}function $e(e,t,o,r){let n=_r(e),i=n.mcpServers;if(i!==void 0&&!ie(i))throw new Error(`Invalid existing Kiro MCP config: mcpServers must be an object in ${e}.`);let s=ie(i)?{...i}:{},c=s[o];if(Fr(c,t)&&!r)return{installed:!0,changed:!1};s[o]={command:t,args:["mcp"],disabled:!1};let a={...n,mcpServers:s};Lc(e,a);let u=_r(e).mcpServers;if(!ie(u)||!Fr(u[o],t))throw new Error(`Kiro MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function $r(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...$e(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(r==="both"){let s=ve(),c=it({cwd:e.cwd}),a=$e(s,t,o,e.force??!1),l=$e(c,t,o,e.force??!1);return{installed:!0,changed:a.changed||l.changed,configFile:s,serverName:o,command:t,args:["mcp"]}}let n=r==="project"?it({cwd:e.cwd}):ve();return{...$e(n,t,o,e.force??!1),configFile:n,serverName:o,command:t,args:["mcp"]}}function Dr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=$r({binary:t,configFile:e.configFile,scope:e.scope,cwd:e.cwd,force:e.force}),r=Nr({binary:t,hooksFile:e.hooksFile,scope:e.scope,cwd:e.cwd,force:e.force});return{installed:o.installed,changed:o.changed||r.changed,mcp:o,hooks:r,files:[o.configFile,r.hooksFile]}}import{existsSync as Kc,mkdirSync as Jc,readFileSync as Gc,renameSync as Bc,rmSync as Uc,writeFileSync as Yc}from"node:fs";import{dirname as Vc}from"node:path";function It(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function zc(e){if(!Kc(e))return{};let t=Gc(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: parse error. Not overwriting.`)}if(!It(o))throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Wc(e,t){Jc(Vc(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Yc(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Bc(o,e)}finally{Uc(o,{force:!0})}}function Hr(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??Mo({cwd:e.cwd}),r=zc(o),n="toolnet-memory";if(It(r.mcpServers)&&r.mcpServers[n]!=null&&!e.force)return{installed:!0,changed:!1,configFile:o};let s=It(r.mcpServers)?{...r.mcpServers}:{};return s[n]={command:t,args:["mcp"]},r.mcpServers=s,Wc(o,r),{installed:!0,changed:!0,configFile:o}}function Lr(e={}){let t=e.binary??"toolnet-memory",o=Hr({binary:t,configFile:e.configFile,force:e.force,cwd:e.cwd});return{installed:o.installed,changed:o.changed,mcp:{...o,configured:o.installed},files:[o.configFile]}}import{mkdirSync as ra,existsSync as na}from"node:fs";import{dirname as ia}from"node:path";import{existsSync as qc,mkdirSync as Qc,readFileSync as Zc,renameSync as Xc,rmSync as ea,writeFileSync as ta}from"node:fs";import{dirname as oa}from"node:path";function y(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function O(e,t){if(!qc(e))return{};let o=Zc(e,"utf8").trim();if(!o)return{};let r;try{r=JSON.parse(o)}catch(n){throw new Error(`Invalid existing ${t} MCP config: ${n instanceof Error?n.message:String(n)}`)}if(!y(r))throw new Error(`Invalid existing ${t} MCP config: root must be a JSON object.`);return r}function L(e,t){Qc(oa(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{ta(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Xc(o,e)}finally{ea(o,{force:!0})}}function Kr(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??ut(),r=ia(o);na(r)||ra(r,{recursive:!0});let n=O(o,"Kilo"),i=n.mcp;if(i!==void 0&&!y(i))throw new Error("Invalid existing Kilo config: mcp must be an object.");let s=y(i)?{...i}:{},c="toolnet-memory";return y(s[c])&&!e.force?{installed:!0,changed:!1,configFile:o,configured:!0}:(s[c]={type:"local",command:[t,"mcp"],enabled:!0,timeout:1e4},L(o,{...n,mcp:s}),{installed:!0,changed:!0,configFile:o,configured:!0})}function Jr(e={}){let t=e.binary??"toolnet-memory",o=Kr({binary:t,configFile:e.configFile,force:e.force});return{installed:o.installed,changed:o.changed,mcp:o,files:[o.configFile]}}import{existsSync as sa,mkdirSync as ca,readFileSync as aa,renameSync as la,rmSync as ua,writeFileSync as da}from"node:fs";import{dirname as pa}from"node:path";function f(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function v(e,t){if(!sa(e))return{};let o=aa(e,"utf8").trim();if(!o)return{};let r;try{r=JSON.parse(o)}catch(n){throw new Error(`Invalid existing ${t} hooks file: ${n instanceof Error?n.message:String(n)}`)}if(!f(r))throw new Error(`Invalid existing ${t} hooks file: root must be a JSON object.`);return r}function K(e,t){ca(pa(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{da(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),la(o,e)}finally{ua(o,{force:!0})}}function jt(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}var se=[["sessionStart",10],["beforeSubmitPrompt",10],["preToolUse",10],["postToolUse",15],["afterAgentResponse",15],["stop",30]];function Gr(e){return f(e)&&typeof e.command=="string"&&e.command.includes("session:cursor-hook")}function ga(e,t,o){let n={type:"command",command:`TOOLNET_HOOK_EVENT=${jt(e)} ${jt(t)} session:cursor-hook`,timeout:o};return e==="preToolUse"&&(n.matcher=".*"),n}function wt(e={}){let t=e.hooksFile??Ce(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=v(t,"Cursor");if(r.version!==void 0&&r.version!==1)throw new Error(`Unsupported existing Cursor hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!f(n))throw new Error("Invalid existing Cursor hooks file: hooks must be an object.");let i=f(n)?{...n}:{};for(let[l,u]of se){let d=i[l];if(d!==void 0&&!Array.isArray(d))throw new Error(`Invalid existing Cursor hooks file: hooks.${l} must be an array.`);let p=Array.isArray(d)?d.filter(k=>!Gr(k)):[];i[l]=[...p,ga(l,o,u)]}let s={...r,version:1,hooks:i};if(JSON.stringify(r)===JSON.stringify(s))return{hooksFile:t,changed:!1,hookCount:se.length};K(t,s);let c=v(t,"Cursor");if(c.version!==1||!f(c.hooks))throw new Error("Cursor hooks were written but verification failed.");let a=0;for(let[l]of se){let u=c.hooks[l];if(!Array.isArray(u))throw new Error("Cursor hooks were written but verification failed.");a+=u.filter(Gr).length}if(a!==se.length)throw new Error("Cursor hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:se.length}}function Br(e,t){return y(e)?(e.type===void 0||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function vt(e={}){let t=e.configFile??xe(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=O(t,"Cursor"),i=n.mcpServers;if(i!==void 0&&!y(i))throw new Error("Invalid existing Cursor MCP config: mcpServers must be an object.");let s=y(i)?{...i}:{};if(Br(s[r],o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};s[r]={type:"stdio",command:o,args:["mcp"]},L(t,{...n,mcpServers:s});let a=O(t,"Cursor").mcpServers;if(!y(a)||!Br(a[r],o))throw new Error("Cursor MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}import{mkdirSync as fa,readFileSync as Ur,renameSync as ma,rmSync as ya,writeFileSync as ha}from"node:fs";import{dirname as ba}from"node:path";var St=`---
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
`;function ka(e,t){fa(ba(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{ha(o,t,{encoding:"utf8",mode:384}),ma(o,e)}finally{ya(o,{force:!0})}}function Yr(e){let t=e.ruleFile??Ho(e.projectRoot);try{if(Ur(t,"utf8")===St)return{ruleFile:t,changed:!1}}catch{}if(ka(t,St),Ur(t,"utf8")!==St)throw new Error("Cursor ToolNet project rule was written but verification failed.");return{ruleFile:t,changed:!0}}import{spawnSync as Ia}from"node:child_process";import{existsSync as J,statSync as ja}from"node:fs";import{dirname as wa,join as va,parse as Sa,resolve as Ct}from"node:path";function Vr(e){let t=Ct(e);if(!J(t))throw new Error(`Project path does not exist: ${t}`);if(!ja(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);return t}function De(e){return va(e,".toolnet","project.json")}function xa(e){let t=Ct(e),o=Sa(t).root;for(;;){if(J(De(t)))return t;if(t===o)return;let r=wa(t);if(r===t)return;t=r}}function xt(e){let t=Ia("git",["rev-parse","--show-toplevel"],{cwd:e,encoding:"utf8",timeout:5e3});if(t.status!==0)return;let o=t.stdout.trim();return o?Ct(o):void 0}function S(e={}){let t=Vr(e.cwd??process.cwd());if(e.project){let n=Vr(e.project),i=De(n),s=xt(n);return{root:n,source:"explicit",eligible:!0,toolnetProject:J(i),manifestFile:J(i)?i:void 0,gitRoot:s}}let o=xa(t);if(o){let n=De(o);return{root:o,source:"toolnet",eligible:!0,toolnetProject:!0,manifestFile:n,gitRoot:xt(o)}}let r=xt(t);if(r){let n=De(r);return{root:r,source:"git",eligible:!0,toolnetProject:J(n),manifestFile:J(n)?n:void 0,gitRoot:r}}return{root:t,source:"cwd",eligible:!1,toolnetProject:!1}}function Qr(e,t={}){let o=[],r=e.indexOf("--scope");if(r>=0){let i=e[r+1];if(i!=="global"&&i!=="project"&&i!=="both")throw new Error(`Invalid --scope value: ${String(i)}`);o.push(i)}e.includes("--global")&&o.push("global"),e.includes("--both")&&o.push("both");let n=Array.from(new Set(o));if(n.length>1)throw new Error(`Conflicting integration scopes: ${n.join(", ")}`);return n[0]??t.defaultScope??"global"}function zr(e,t){return{install:e,effective:t}}function x(e,t){return{surface:e,global:zr(t.globalInstall,t.effective==="global"||t.effective==="both"),project:zr(t.projectInstall,t.effective==="project"||t.effective==="both"),effective:t.effective,risk:t.risk??"none",dedupeRequired:t.dedupeRequired??!1,trustRequired:t.trustRequired??t.projectInstall,note:t.note}}function Ca(e){return{mcp:x("mcp",{globalInstall:!0,projectInstall:!1,effective:"global"}),hooks:x("hooks",{globalInstall:!0,projectInstall:!1,effective:"global"}),work:x("work",{globalInstall:e==="grok",projectInstall:!1,effective:e==="grok"?"global":"none",note:e==="grok"?"Grok supports a global ToolNet continuity skill.":"Cursor/Copilot work instructions remain project-scoped."})}}function Wr(e){return{mcp:x("mcp",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),hooks:x("hooks",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),work:x("work",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!1,note:e==="cursor"?"Use .cursor/rules/toolnet-memory.mdc.":e==="copilot"?"Use .github/instructions/toolnet-memory.instructions.md.":"Use .grok/skills/toolnet-continuity/SKILL.md."})}}function qr(e){return{mcp:x("mcp",{globalInstall:!0,projectInstall:!0,effective:"project",risk:e==="cursor"?"precedence-unverified":"shadowed-global",trustRequired:!0,note:e==="cursor"?"Project ToolNet MCP is the intended effective definition; native same-name precedence must be E2E certified before release.":"Global remains useful outside the project; same-name project definition wins inside the project."}),hooks:x("hooks",{globalInstall:!0,projectInstall:!0,effective:"both",risk:"additive-duplicate",dedupeRequired:!0,trustRequired:!0,note:"Global and project hook sources can both execute for the same native event."}),work:x("work",{globalInstall:e==="grok",projectInstall:!0,effective:"project",risk:e==="grok"?"shadowed-global":"none",trustRequired:!1,note:e==="cursor"?"Project rule is authoritative.":e==="copilot"?"Project instruction is authoritative.":"Project skill shadows the same-name global skill inside the project."})}}function G(e){let{agent:t,scope:o,project:r}=e;return(o==="project"||o==="both")&&(!r||!r.eligible)?{agent:t,requestedScope:o,project:r,surfaces:o==="both"?qr(t):Wr(t),canInstall:!1,reason:"Project scope requires an explicit project, existing ToolNet project, or Git repository root."}:{agent:t,requestedScope:o,project:r,surfaces:o==="global"?Ca(t):o==="project"?Wr(t):qr(t),canInstall:!0}}function Zr(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.rule?.changed)}function Xr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:S({project:e.projectRoot}),n=G({agent:"cursor",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Cursor project integration scope cannot be resolved.");let i,s;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(i={},n.surfaces.mcp.global.install&&(i.mcp=vt({binary:t,configFile:e.configFile??xe()})),n.surfaces.hooks.global.install&&(i.hooks=wt({binary:t,hooksFile:e.hooksFile??Ce()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Cursor project integration requires an eligible project root.");s={},n.surfaces.mcp.project.install&&(s.mcp=vt({binary:t,configFile:e.projectConfigFile??$o(r.root)})),n.surfaces.hooks.project.install&&(s.hooks=wt({binary:t,hooksFile:e.projectHooksFile??Do(r.root)})),n.surfaces.work.project.install&&(s.rule=Yr({projectRoot:r.root,ruleFile:e.projectRuleFile}))}let c=s?.mcp??i?.mcp,a=s?.hooks??i?.hooks;if(!c||!a)throw new Error("Cursor integration did not produce an effective MCP/hooks installation.");let l=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.rule?.ruleFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.rule?.ruleFile].filter(u=>typeof u=="string")));return{installed:!0,changed:Zr(i)||Zr(s),scope:o,plan:n,project:r,global:i,projectScope:s,mcp:c,hooks:a,rule:s?.rule,files:l}}var ce=[["sessionStart",10],["userPromptSubmitted",10],["userPromptTransformed",10],["preToolUse",10],["postToolUse",15],["agentStop",30]];function Oa(e){if(typeof e.command=="string")return e.command;if(typeof e.bash=="string")return e.bash}function en(e){return f(e)&&Oa(e)?.includes("session:copilot-hook")===!0}function Ra(e,t,o){let r={type:"command",command:`${t} session:copilot-hook`,env:{TOOLNET_HOOK_EVENT:e},timeoutSec:o};return e==="preToolUse"&&(r.matcher=".*"),r}function Ot(e={}){let t=e.hooksFile??Re(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=v(t,"GitHub Copilot CLI");if(r.version!==void 0&&r.version!==1)throw new Error(`Unsupported existing GitHub Copilot CLI hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!f(n))throw new Error("Invalid existing GitHub Copilot CLI hooks file: hooks must be an object.");let i=f(n)?{...n}:{};for(let[l,u]of ce){let d=i[l];if(d!==void 0&&!Array.isArray(d))throw new Error(`Invalid existing GitHub Copilot CLI hooks file: hooks.${l} must be an array.`);let p=Array.isArray(d)?d.filter(k=>!en(k)):[];i[l]=[...p,Ra(l,o,u)]}let s={...r,version:1,hooks:i};if(JSON.stringify(r)===JSON.stringify(s))return{hooksFile:t,changed:!1,hookCount:ce.length};K(t,s);let c=v(t,"GitHub Copilot CLI");if(c.version!==1||!f(c.hooks))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");let a=0;for(let[l]of ce){let u=c.hooks[l];if(!Array.isArray(u))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");a+=u.filter(en).length}if(a!==ce.length)throw new Error("GitHub Copilot CLI hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:ce.length}}function tn(e,t){return y(e)?(e.type===void 0||e.type==="local"||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&Array.isArray(e.tools)&&e.tools.length===1&&e.tools[0]==="*":!1}function Rt(e={}){let t=e.configFile??Oe(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=O(t,"GitHub Copilot CLI"),i=n.mcpServers;if(i!==void 0&&!y(i))throw new Error("Invalid existing GitHub Copilot CLI MCP config: mcpServers must be an object.");let s=y(i)?{...i}:{};if(tn(s[r],o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};s[r]={type:"stdio",command:o,args:["mcp"],tools:["*"]},L(t,{...n,mcpServers:s});let a=O(t,"GitHub Copilot CLI").mcpServers;if(!y(a)||!tn(a[r],o))throw new Error("GitHub Copilot CLI MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}import{mkdirSync as Ea,readFileSync as on,renameSync as Pa,rmSync as Ta,writeFileSync as Aa}from"node:fs";import{dirname as Ma}from"node:path";var Et=`---
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
`;function Na(e,t){Ea(Ma(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Aa(o,t,{encoding:"utf8",mode:384}),Pa(o,e)}finally{Ta(o,{force:!0})}}function rn(e){let t=e.instructionFile??Go(e.projectRoot);try{if(on(t,"utf8")===Et)return{instructionFile:t,changed:!1}}catch{}if(Na(t,Et),on(t,"utf8")!==Et)throw new Error("Copilot ToolNet project instruction verification failed.");return{instructionFile:t,changed:!0}}function nn(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.instruction?.changed)}function sn(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:S({project:e.projectRoot}),n=G({agent:"copilot",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Copilot project integration scope cannot be resolved.");let i,s;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(i={},n.surfaces.mcp.global.install&&(i.mcp=Rt({binary:t,configFile:e.configFile??Oe()})),n.surfaces.hooks.global.install&&(i.hooks=Ot({binary:t,hooksFile:e.hooksFile??Re()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Copilot project integration requires an eligible project root.");s={},n.surfaces.mcp.project.install&&(s.mcp=Rt({binary:t,configFile:e.projectConfigFile??Ko(r.root)})),n.surfaces.hooks.project.install&&(s.hooks=Ot({binary:t,hooksFile:e.projectHooksFile??Jo(r.root)})),n.surfaces.work.project.install&&(s.instruction=rn({projectRoot:r.root,instructionFile:e.projectInstructionFile}))}let c=s?.mcp??i?.mcp,a=s?.hooks??i?.hooks;if(!c||!a)throw new Error("Copilot integration did not produce effective MCP/hooks.");let l=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.instruction?.instructionFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.instruction?.instructionFile].filter(u=>typeof u=="string")));return{installed:!0,changed:nn(i)||nn(s),scope:o,plan:n,project:r,global:i,projectScope:s,mcp:c,hooks:a,instruction:s?.instruction,files:l}}import{existsSync as _a,mkdirSync as Fa,readFileSync as cn,renameSync as $a,rmSync as Da,writeFileSync as Ha}from"node:fs";import{dirname as La}from"node:path";var Pt=`---
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
`;function Ka(e,t){Fa(La(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Ha(o,t,{encoding:"utf8",mode:384}),$a(o,e)}finally{Da(o,{force:!0})}}function Tt(e={}){let t=e.skillFile??Ae();if(_a(t)&&cn(t,"utf8")===Pt)return{skillFile:t,changed:!1};if(Ka(t,Pt),cn(t,"utf8")!==Pt)throw new Error("Grok ToolNet continuity skill was written but verification failed.");return{skillFile:t,changed:!0}}var ae=[["SessionStart",10],["UserPromptSubmit",10],["PreToolUse",10],["PostToolUse",15],["Stop",30]];function an(e){return!f(e)||!Array.isArray(e.hooks)?!1:e.hooks.some(t=>f(t)&&typeof t.command=="string"&&t.command.includes("session:grok-hook"))}function Ja(e,t,o){let r={hooks:[{type:"command",command:`${t} session:grok-hook`,timeout:o,env:{TOOLNET_HOOK_EVENT:e}}]};return e==="PreToolUse"&&(r.matcher=".*"),r}function At(e={}){let t=e.hooksFile??Te(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=v(t,"Grok Build"),n=r.hooks;if(n!==void 0&&!f(n))throw new Error("Invalid existing Grok Build hooks file: hooks must be an object.");let i=f(n)?{...n}:{};for(let[l,u]of ae){let d=i[l];if(d!==void 0&&!Array.isArray(d))throw new Error(`Invalid existing Grok Build hooks file: hooks.${l} must be an array.`);let p=Array.isArray(d)?d.filter(k=>!an(k)):[];i[l]=[...p,Ja(l,o,u)]}let s={...r,hooks:i};if(JSON.stringify(r)===JSON.stringify(s))return{hooksFile:t,changed:!1,hookCount:ae.length};K(t,s);let c=v(t,"Grok Build");if(!f(c.hooks))throw new Error("Grok Build hooks were written but verification failed.");let a=0;for(let[l]of ae){let u=c.hooks[l];if(!Array.isArray(u))throw new Error("Grok Build hooks were written but verification failed.");a+=u.filter(an).length}if(a!==ae.length)throw new Error("Grok Build hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:ae.length}}import{existsSync as Ga,mkdirSync as Ba,readFileSync as Ua,renameSync as Ya,rmSync as Va,writeFileSync as za}from"node:fs";import{dirname as Wa}from"node:path";function ln(e){return Ga(e)?Ua(e,"utf8"):""}function qa(e,t){Ba(Wa(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{za(o,t,{encoding:"utf8",mode:384}),Ya(o,e)}finally{Va(o,{force:!0})}}function Mt(e){return e.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t")}function Qa(e){return`[mcp_servers."${Mt(e)}"]`}function Za(e,t){return[Qa(e),`command = "${Mt(t)}"`,'args = ["mcp"]',"enabled = true"].join(`
`)}function Xa(e){let t=e.trim();return t.startsWith("[")&&t.includes("]")}function He(e){return e.trim().replace(/\s+/g,"")}function el(e){return new Set([He(`[mcp_servers.${e}]`),He(`[mcp_servers."${e}"]`),He(`[mcp_servers.'${e}']`)])}function dn(e,t){let o=e.split(/\r?\n/),r=el(t),n=-1;for(let u=0;u<o.length;u+=1){let d=He(o[u].replace(/\s+#.*$/,""));if(r.has(d)){n=u;break}}if(n<0)return null;let i=o.length;for(let u=n+1;u<o.length;u+=1)if(Xa(o[u])){i=u;break}let s=[],c=0;for(let u of o)s.push(c),c+=u.length+1;let a=s[n]??0,l=i>=o.length?e.length:s[i]??e.length;return{start:a,end:l}}function tl(e,t,o){let r=`${Za(t,o)}
`,n=dn(e,t);if(n){let i=e.slice(0,n.start),s=e.slice(n.end);return`${i}${r}${s.replace(/^\n+/,"")}`}return e.trim()?`${e.replace(/\s*$/,"")}

${r}`:r}function un(e,t,o){let r=dn(e,t);if(!r)return!1;let n=e.slice(r.start,r.end);return n.includes(`command = "${Mt(o)}"`)&&/args\s*=\s*\[\s*"mcp"\s*\]/.test(n)&&/enabled\s*=\s*true/.test(n)}function Nt(e={}){let t=e.configFile??Pe(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=ln(t);if(un(n,r,o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};let i=tl(n,r,o);qa(t,i);let s=ln(t);if(!un(s,r,o))throw new Error("Grok Build MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}function pn(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.skill?.changed)}function gn(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:S({project:e.projectRoot}),n=G({agent:"grok",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Grok project integration scope cannot be resolved.");let i,s;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(i={},n.surfaces.mcp.global.install&&(i.mcp=Nt({binary:t,configFile:e.configFile??Pe()})),n.surfaces.hooks.global.install&&(i.hooks=At({binary:t,hooksFile:e.hooksFile??Te()})),n.surfaces.work.global.install&&(i.skill=Tt({skillFile:e.skillFile??Ae()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Grok project integration requires an eligible project root.");s={},n.surfaces.mcp.project.install&&(s.mcp=Nt({binary:t,configFile:e.projectConfigFile??Uo(r.root)})),n.surfaces.hooks.project.install&&(s.hooks=At({binary:t,hooksFile:e.projectHooksFile??Yo(r.root)})),n.surfaces.work.project.install&&(s.skill=Tt({skillFile:e.projectSkillFile??Vo(r.root)}))}let c=s?.mcp??i?.mcp,a=s?.hooks??i?.hooks,l=s?.skill??i?.skill;if(!c||!a||!l)throw new Error("Grok integration did not produce effective MCP/hooks/skill.");let u=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.skill?.skillFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.skill?.skillFile].filter(d=>typeof d=="string")));return{installed:!0,changed:pn(i)||pn(s),scope:o,plan:n,project:r,global:i,projectScope:s,mcp:c,hooks:a,skill:l,files:u}}function fn(e={}){if(e.scope==="global")return{scope:"global",automatic:!1,reason:"explicit-global"};if(e.scope==="project"||e.scope==="both"){let o=S({cwd:e.cwd,project:e.projectRoot});if(!o.eligible)throw new Error(`Explicit ${e.scope} integration requires an explicit project, ToolNet project, or Git repository root.`);return{scope:e.scope,automatic:!1,project:o,reason:e.scope==="project"?"explicit-project":"explicit-both"}}let t=S({cwd:e.cwd,project:e.projectRoot});return t.toolnetProject?{scope:"both",automatic:!0,project:t,reason:"toolnet-project"}:{scope:"global",automatic:!0,reason:"no-toolnet-project"}}function mn(){return Qo()}function _t(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[],r=e.detections??mn(),n=new Map(r.map(s=>[s.agent,s.detected])),i=fn({scope:e.scope,projectRoot:e.projectRoot,cwd:e.cwd});if(!(e.force===!0||n.get("agy")===!0))o.push({agent:"agy",detected:!1,installed:!1,targets:[]});else try{let c=nr({binary:t});o.push({agent:"agy",detected:!0,installed:!0,targets:c.files})}catch(c){o.push({agent:"agy",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("opencode")===!0))o.push({agent:"opencode",detected:!1,installed:!1,targets:[]});else try{let c=ur({binary:t}),a=mr({binary:t});o.push({agent:"opencode",detected:!0,installed:!0,targets:[...c,a.configFile,`mcp:${a.serverName}`]})}catch(c){o.push({agent:"opencode",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("claude")===!0))o.push({agent:"claude",detected:!1,installed:!1,targets:[]});else try{let c=Pr({binary:t});o.push({agent:"claude",detected:!0,installed:!0,targets:[c.hooks.settingsFile,c.mcp.configFile,`mcp:${c.mcp.serverName}`]})}catch(c){o.push({agent:"claude",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("kiro")===!0))o.push({agent:"kiro",detected:!1,installed:!1,targets:[]});else try{let c=Dr({...e.kiro??{},binary:t});o.push({agent:"kiro",detected:!0,installed:!0,targets:[c.mcp.configFile,`mcp:${c.mcp.serverName}`,c.hooks.hooksFile]})}catch(c){o.push({agent:"kiro",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("cursor")===!0))o.push({agent:"cursor",detected:!1,installed:!1,targets:[]});else try{let c=e.cursor??{},a=Xr({...c,binary:t,scope:c.scope??i.scope,projectRoot:c.projectRoot??i.project?.root});o.push({agent:"cursor",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(c){o.push({agent:"cursor",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("copilot")===!0))o.push({agent:"copilot",detected:!1,installed:!1,targets:[]});else try{let c=e.copilot??{},a=sn({...c,binary:t,scope:c.scope??i.scope,projectRoot:c.projectRoot??i.project?.root});o.push({agent:"copilot",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(c){o.push({agent:"copilot",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("grok")===!0))o.push({agent:"grok",detected:!1,installed:!1,targets:[]});else try{let c=e.grok??{},a=gn({...c,binary:t,scope:c.scope??i.scope,projectRoot:c.projectRoot??i.project?.root});o.push({agent:"grok",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(c){o.push({agent:"grok",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("toolnet-cli")===!0))o.push({agent:"toolnet-cli",detected:!1,installed:!1,targets:[]});else try{let c=e.toolnetCli??{},a=Lr({...c,binary:t});o.push({agent:"toolnet-cli",detected:!0,installed:!0,targets:[a.mcp.configFile]})}catch(c){o.push({agent:"toolnet-cli",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("kilo")===!0))o.push({agent:"kilo",detected:!1,installed:!1,targets:[]});else try{let c=e.kilo??{},a=Jr({...c,binary:t});o.push({agent:"kilo",detected:!0,installed:!0,targets:[a.mcp.configFile]})}catch(c){o.push({agent:"kilo",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("codex")===!0))o.push({agent:"codex",detected:!1,installed:!1,targets:[]});else try{let c=Ir({binary:t}),a=wr({binary:t}),l=xr({binary:t});if(!l.installed)throw new Error(l.error??"Codex MCP registration failed");let u=[c.configFile,a,`mcp:${l.serverName}`];c.preservedPrevious&&u.push(c.previousFile),o.push({agent:"codex",detected:!0,installed:!0,targets:u})}catch(c){o.push({agent:"codex",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}return o}function Le(e){switch(e){case"agy":return"Agy / Antigravity";case"opencode":return"OpenCode";case"claude":return"Claude Code";case"kiro":return"Kiro CLI";case"cursor":return"Cursor CLI";case"copilot":return"GitHub Copilot CLI";case"grok":return"Grok Build";case"toolnet-cli":return"ToolNet CLI";case"kilo":return"Kilo";case"codex":return"Codex";default:return e}}function ol(e){console.log(""),console.log("ToolNet Memory Integration Detection"),console.log("===================================="),console.log("");for(let t of e){let o=Le(t.agent);if(!t.detected){console.log(`\u25CB ${o}: not detected`);continue}console.log(`\u2713 ${o}: detected`);for(let r of t.evidence)console.log(`  ${r}`)}console.log("")}function rl(e){console.log(""),console.log("ToolNet Memory AI Integrations"),console.log("=============================="),console.log("");for(let t of e){let o=Le(t.agent);if(!t.detected){console.log(`- ${o}: not detected`);continue}if(t.installed){let r=t.scope?` [scope=${t.scope}]`:"";console.log(`\u2713 ${o}: automatic memory enabled${r}`),t.projectRoot&&console.log(`  project: ${t.projectRoot}`);continue}console.log(`\u2717 ${o}: integration failed`),t.error&&console.log(`  ${t.error}`)}console.log("")}function nl(e,t){let o=e.indexOf(t);return o>=0?e[o+1]:void 0}function il(e){return e.includes("--scope")||e.includes("--global")||e.includes("--both")?Qr(e):void 0}async function sl(){let e=process.argv.slice(2),t=e.includes("--all"),o=e.includes("--json"),r=e.includes("--detect-only"),n=il(e),i=nl(e,"--project");if(r){let c=mn();if(o){console.log(JSON.stringify(c,null,2));return}ol(c);return}let s=_t({force:t,scope:n,projectRoot:i});if(o){console.log(JSON.stringify(s,null,2));return}rl(s)}var cl=process.argv[1]&&(process.argv[1].endsWith("auto-integrate.js")||process.argv[1].endsWith("auto-integrate.ts"));cl&&sl().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});function bn(e){let t=ll(e);if(!Ft(t))throw new Error(`Project path does not exist: ${t}`);if(!al(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);return t}function jm(e=process.cwd()){let t=bn(e),o=new _().detect(t),r=hn(o.rootPath,".toolnet","project.json");if(!Ft(r))throw new Error(`ToolNet project initialization failed: ${r} was not created`);return{initialized:!0,project:{id:o.id,name:o.name,remote:o.remote,rootPath:o.rootPath},manifestFile:r}}async function ul(e=process.cwd(),t={}){let o=bn(e),r={skipRemoteIdentity:t.skipRemoteIdentity,adoptRemote:t.adoptRemote,allowGitRebind:t.allowGitRebind},n=await Io(o,r),i=n.project,s=hn(i.rootPath,".toolnet","project.json");if(!Ft(s))throw new Error(`ToolNet project initialization failed: ${s} was not created`);return{initialized:!0,project:{id:i.id,name:i.name,remote:i.remote,rootPath:i.rootPath},manifestFile:s,identity:{source:n.source,registry:n.registry,registryProvider:n.registryProvider,gitRemote:n.gitIdentity?.canonicalRemote,fingerprint:n.gitIdentity?.fingerprint}}}function yn(e,t){let o=e.indexOf(t);if(o<0)return;let r=e[o+1];if(!(!r||r.startsWith("-")))return r}async function dl(){let e=process.argv.slice(2),t=e.includes("--json"),o=!e.includes("--no-integrate"),r=e.includes("--no-remote-identity"),n=e.includes("--rebind-git-identity"),i=yn(e,"--adopt-remote"),s=yn(e,"--project"),c=new Set(["--project","--adopt-remote"]),a=e.find((p,k)=>{if(p.startsWith("-"))return!1;let le=e[k-1];return!(le&&c.has(le))}),l=s??a??process.cwd(),u=await Ye("Resolving ToolNet project identity",()=>ul(l,{skipRemoteIdentity:r,adoptRemote:i,allowGitRebind:n}),{enabled:!t}),d=[];if(o&&(d=await Ye("Detecting coding agents",()=>_t({projectRoot:u.project.rootPath}),{enabled:!t})),t){console.log(JSON.stringify({...u,integrations:d},null,2));return}if(console.log(""),console.log("ToolNet Memory"),console.log("=============="),console.log(""),console.log("\u2713 Project initialized"),console.log(""),console.log(`Project:  ${u.project.name}`),console.log(`ID:       ${u.project.id}`),console.log(`Remote:   ${u.project.remote??u.project.name}`),console.log(`Root:     ${u.project.rootPath}`),console.log(`Manifest: ${u.manifestFile}`),u.identity&&(console.log(`Identity: ${u.identity.source}`),console.log(`Registry: ${u.identity.registry}`),u.identity.gitRemote&&console.log(`Git:      ${u.identity.gitRemote}`)),console.log(""),o){console.log("AI integrations:");let p=d.filter(k=>k.detected&&k.installed);if(!p.length)console.log("  \u25CB No supported coding agent detected");else for(let k of p){let le=Le(k.agent),kn=Wt(k.agent);console.log(`  \u2713 ${le} \u2014 ${kn}`)}console.log("")}console.log("Next: toolnet-memory doctor"),console.log("")}var pl=process.argv[1]?.endsWith("/init.js")||process.argv[1]?.endsWith("/init.ts");pl&&dl().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});export{jm as initializeToolNetProject,ul as initializeToolNetProjectCrossMachine};
