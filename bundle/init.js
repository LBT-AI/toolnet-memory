import{existsSync as Dt,statSync as gl}from"node:fs";import{resolve as ml,join as jn}from"node:path";import{existsSync as In,readFileSync as wn}from"node:fs";import{homedir as Cn}from"node:os";import{join as xn}from"node:path";function Rn(e){let t=e.trim();return t.length>=2&&t.startsWith('"')&&t.endsWith('"')?(t=t.slice(1,-1),t.replace(/\\n/g,`
`).replace(/\\r/g,"\r").replace(/\\t/g,"	").replace(/\\"/g,'"').replace(/\\\\/g,"\\")):t.length>=2&&t.startsWith("'")&&t.endsWith("'")?t.slice(1,-1):t}function On(){let e=process.env.TOOLNET_GLOBAL_ENV??xn(Cn(),".config","toolnet-memory",".env");if(!In(e))return;let t=wn(e,"utf8");for(let o of t.split(/\r?\n/)){let r=o.trim();if(!r||r.startsWith("#"))continue;r.startsWith("export ")&&(r=r.slice(7));let n=r.indexOf("=");if(n<=0)continue;let i=r.slice(0,n).trim();/^[A-Za-z_][A-Za-z0-9_]*$/.test(i)&&process.env[i]===void 0&&(process.env[i]=Rn(r.slice(n+1)))}}On();function B(e,t){return e===void 0?t:["1","true","yes","on"].includes(e.toLowerCase())}function Y(e,t){if(!e)return t;let o=Number(e);return Number.isFinite(o)?o:t}function Ue(){return{memory:{autoCapture:B(process.env.MEMORY_AUTO_CAPTURE,!0),autoRetrieve:B(process.env.MEMORY_AUTO_RETRIEVE,!0),autoSummarize:B(process.env.MEMORY_AUTO_SUMMARIZE,!0),autoSync:B(process.env.MEMORY_AUTO_SYNC,!0)},retrieval:{maxCandidates:Y(process.env.MEMORY_MAX_CANDIDATES,50),rerankTop:Y(process.env.MEMORY_RERANK_TOP,10),finalContext:Y(process.env.MEMORY_FINAL_CONTEXT,5),tokenBudget:Y(process.env.MEMORY_TOKEN_BUDGET,2e3)},storage:{provider:process.env.MEMORY_STORAGE_PROVIDER??"huggingface",r2:{accountId:process.env.R2_ACCOUNT_ID,bucket:process.env.R2_BUCKET,accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY},s3:{endpoint:process.env.S3_ENDPOINT,region:process.env.S3_REGION,bucket:process.env.S3_BUCKET,accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY,forcePathStyle:B(process.env.S3_FORCE_PATH_STYLE,!1)},huggingface:{namespace:process.env.HF_NAMESPACE,bucket:process.env.HF_BUCKET,accessKeyId:process.env.HF_S3_ACCESS_KEY_ID,secretAccessKey:process.env.HF_S3_SECRET_ACCESS_KEY},localRoot:process.env.MEMORY_LOCAL_STORAGE_PATH},cache:{maxMb:Y(process.env.MEMORY_LOCAL_CACHE_MB,200)}}}import{createHash as Nn}from"node:crypto";import{existsSync as fe,mkdirSync as Fn,readFileSync as $n,renameSync as Dn,writeFileSync as Ln}from"node:fs";import{basename as Kn,dirname as ye,join as q,parse as Ut,resolve as T}from"node:path";import{createHash as Ht}from"node:crypto";import{spawnSync as En}from"node:child_process";var z="git-remote-v1",Pn=new Set(["github.com","gitlab.com","bitbucket.org"]);function Vt(e,t){let o=t.replaceAll("\\","/").replace(/^\/+/u,"").replace(/\/+$/u,"").replace(/\.git$/iu,"").replace(/\/+/gu,"/");return!o||o==="."||o===".."||o.split("/").some(r=>!r||r==="."||r==="..")?null:(Pn.has(e)&&(o=o.toLowerCase()),o)}function Tn(e){let t;try{t=new URL(e)}catch{return null}if(!["https:","http:","ssh:","git:"].includes(t.protocol))return null;let o=t.hostname.trim().toLowerCase();if(!o)return null;let r=t.protocol==="https:"&&t.port==="443"||t.protocol==="http:"&&t.port==="80"||t.protocol==="ssh:"&&t.port==="22",n=t.port&&!r?`${o}:${t.port}`:o,i=Vt(o,t.pathname);return i?`${n}/${i}`:null}function _n(e){let t=e.match(/^(?:[^@\s/:]+@)?([^:/\s]+):(.+)$/u);if(!t)return null;let o=t[1]?.trim().toLowerCase();if(!o||o.length===1)return null;let r=Vt(o,t[2]??"");return r?`${o}/${r}`:null}function Lt(e){let t=e.trim();return t?t.includes("://")?Tn(t):_n(t):null}function An(e){return Ht("sha256").update(`${z}:${e}`).digest("hex")}function Jt(e){return Ht("sha256").update(`toolnet-project:${z}:${e}`).digest("hex").slice(0,16)}function Mn(e){return e.split("/").filter(Boolean).at(-1)?.trim()||null}function Be(e,t){let o=En("git",["-C",e,...t],{encoding:"utf8",windowsHide:!0,stdio:["ignore","pipe","ignore"]});return o.error||o.status!==0?null:o.stdout?.trim()||null}function Kt(e,t){let o=Mn(e);return o?{scheme:z,canonicalRemote:e,fingerprint:An(e),repositoryName:o,source:t}:null}function pe(e){let t=Be(e,["remote","get-url","origin"]);if(t){let n=Lt(t);if(n)return Kt(n,"origin")}let o=Be(e,["remote"]);if(!o)return null;let r=new Set;for(let n of o.split(/\r?\n/u).map(i=>i.trim()).filter(Boolean)){let i=Be(e,["remote","get-url",n]);if(!i)continue;let s=Lt(i);s&&r.add(s)}return r.size!==1?null:Kt([...r][0],"unique-remote")}var Bt=".toolnet",Hn="project.json";function Vn(e){return Nn("sha256").update(e).digest("hex").slice(0,16)}function F(e){return q(e,Bt,Hn)}function Yt(e){return fe(F(e))}function Gt(e,t){let o=T(e),r=Ut(o).root;for(;;){if(Yt(o))return o;if(o===r||t&&o===T(t))break;let n=ye(o);if(n===o)break;o=n}return null}function Ye(e){let t=T(e),o=Ut(t).root,r=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"];for(;;){if(r.some(i=>fe(q(t,i))))return t;if(t===o)break;let n=ye(t);if(n===t)break;t=n}return T(e)}function ge(e){let t;try{t=JSON.parse($n(e,"utf8"))}catch(n){throw new Error(`Invalid ToolNet project manifest: ${e}: ${n instanceof Error?n.message:String(n)}`)}if(!t||typeof t!="object")throw new Error(`Invalid ToolNet project manifest: ${e}`);let o=t;if(typeof o.id!="string"||!o.id.trim())throw new Error(`ToolNet project manifest is missing id: ${e}`);if(typeof o.name!="string"||!o.name.trim())throw new Error(`ToolNet project manifest is missing name: ${e}`);let r=new Date().toISOString();return{version:1,id:o.id,name:o.name,remote:typeof o.remote=="string"&&o.remote.trim()?o.remote:o.name,rootPath:typeof o.rootPath=="string"?o.rootPath:ye(ye(e)),createdAt:typeof o.createdAt=="string"?o.createdAt:r,updatedAt:typeof o.updatedAt=="string"?o.updatedAt:r,graphVersion:typeof o.graphVersion=="number"?o.graphVersion:0,memoryVersion:typeof o.memoryVersion=="number"?o.memoryVersion:0,metadata:o.metadata&&typeof o.metadata=="object"?o.metadata:void 0}}function me(e,t){let o=q(e,Bt);Fn(o,{recursive:!0});let r=F(e),n=`${r}.tmp-${process.pid}`;Ln(n,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Dn(n,r)}function P(e,t){return{id:e.id,name:e.name,remote:e.remote,rootPath:t,createdAt:e.createdAt,updatedAt:e.updatedAt,graphVersion:e.graphVersion,memoryVersion:e.memoryVersion,metadata:e.metadata}}function ze(e){return{version:1,scheme:z,canonicalRemote:e.canonicalRemote,fingerprint:e.fingerprint,repositoryName:e.repositoryName}}function Jn(e){let t=e.metadata?.toolnetIdentity;if(!t||typeof t!="object"||Array.isArray(t))return null;let o=t;return typeof o.fingerprint=="string"?o.fingerprint:null}var $=class{adopt(t,o){let r=Ye(T(t));if(!o.id.trim())throw new Error("PROJECT_ADOPTION_INVALID_ID");if(!o.name.trim())throw new Error("PROJECT_ADOPTION_INVALID_NAME");if(!o.remote.trim())throw new Error("PROJECT_ADOPTION_INVALID_REMOTE");if(Yt(r)){let c=ge(F(r));if(c.id!==o.id)throw new Error(["PROJECT_IDENTITY_ALREADY_EXISTS",`existing=${c.id}`,`requested=${o.id}`].join(" "));return P(c,r)}let n=new Date().toISOString(),i={...o.metadata};o.gitIdentity&&(i.toolnetIdentity=ze(o.gitIdentity));let s={version:1,id:o.id.trim(),name:o.name.trim(),remote:o.remote.trim(),rootPath:r,createdAt:o.createdAt??n,updatedAt:n,graphVersion:o.graphVersion??0,memoryVersion:o.memoryVersion??0,metadata:Object.keys(i).length?i:void 0};return me(r,s),P(s,r)}recordGitIdentity(t,o,r={}){let n=this.requireExisting(t),i=F(n.rootPath),s=ge(i),c=Jn(s);if(c&&c!==o.fingerprint&&!r.allowRebind)throw new Error(["PROJECT_GIT_REMOTE_CHANGED",`existing=${c}`,`current=${o.fingerprint}`,"Use explicit rebind only when this repository identity change is intentional."].join(" "));let a=s.metadata?.toolnetIdentity;return a&&typeof a=="object"&&!Array.isArray(a)&&a.fingerprint===o.fingerprint||(s.metadata={...s.metadata,toolnetIdentity:ze(o)},s.updatedAt=new Date().toISOString(),me(n.rootPath,s)),P(s,n.rootPath)}findExisting(t=process.cwd()){let o=T(t),r=Ye(o),i=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(a=>fe(q(r,a))),s=Gt(o,i?r:void 0);if(!s)return null;let c=ge(F(s));return P(c,s)}requireExisting(t=process.cwd()){let o=this.findExisting(t);if(!o)throw new Error("PROJECT_NOT_INITIALIZED");return o}detect(t=process.cwd()){let o=T(t),r=Ye(o),i=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(d=>fe(q(r,d))),s=Gt(o,i?r:void 0);if(s){let d=F(s),p=ge(d);return p.rootPath!==s&&(p.rootPath=s,p.updatedAt=new Date().toISOString(),me(s,p)),P(p,s)}let c=new Date().toISOString(),a=Kn(r),l=pe(r),u={version:1,id:l?Jt(l.canonicalRemote):Vn(r),name:a,remote:l?.repositoryName??a,rootPath:r,createdAt:c,updatedAt:c,graphVersion:0,memoryVersion:0,metadata:l?{toolnetIdentity:ze(l)}:void 0};return me(r,u),P(u,r)}};var Gn=[{type:"openai_key",regex:/\bsk-[A-Za-z0-9_-]{20,}\b/g,confidence:"exact"},{type:"huggingface_token",regex:/\bhf_[A-Za-z0-9]{20,}\b/g,confidence:"exact"},{type:"hf_s3_access_key",regex:/\bHFAK[A-Za-z0-9]{8,}\b/g,confidence:"exact"},{type:"aws_access_key",regex:/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,confidence:"exact"},{type:"github_token",regex:/\b(?:gh[pousr]_[A-Za-z0-9]{30,255}|github_pat_[A-Za-z0-9_]{40,255})\b/g,confidence:"exact"},{type:"stripe_secret_key",regex:/\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g,confidence:"exact"},{type:"google_api_key",regex:/\bAIza[A-Za-z0-9_-]{30,}\b/g,confidence:"exact"},{type:"slack_token",regex:/\bxox[baprs]-[A-Za-z0-9-]{16,}\b/g,confidence:"exact"},{type:"npm_token",regex:/\bnpm_[A-Za-z0-9]{20,}\b/g,confidence:"exact"},{type:"bearer_token",regex:/\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/gi,confidence:"high"},{type:"jwt",regex:/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,confidence:"exact"},{type:"private_key",regex:/-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,confidence:"exact"},{type:"password_assignment",regex:/\b(?:password|passwd|pwd)\s*[:=]\s*["']?[^"' \t\r\n]{6,}["']?/gi,confidence:"high"},{type:"secret_assignment",regex:/\b(?:secret|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key)\s*[:=]\s*["']?[^"' \t\r\n]{8,}["']?/gi,confidence:"high"},{type:"cookie",regex:/\b(?:cookie|set-cookie)\s*[:=]\s*[^;\n]{8,}/gi,confidence:"high"},{type:"url_credentials",regex:/\bhttps?:\/\/[^:/@\s]+:[^/@\s]{4,}@[^/\s]+/gi,confidence:"high"}],Un=new Set(["example","example-key","example-token","changeme","change-me","password","secret","your-api-key","your-token","<token>","<secret>","<password>","[redacted]"]);function zt(e){return e.normalize("NFKC").trim().toLowerCase()}function Bn(e){if(e.length===0)return 0;let t=new Map;for(let r of e)t.set(r,(t.get(r)??0)+1);let o=0;for(let r of t.values()){let n=r/e.length;o-=n*Math.log2(n)}return o}function Yn(e){return/^[a-f0-9]{32}$/iu.test(e)||/^[a-f0-9]{40}$/iu.test(e)||/^[a-f0-9]{64}$/iu.test(e)}function zn(e,t,o){let r=e.slice(Math.max(0,t-48),t),n=e.slice(o,Math.min(e.length,o+16));return/\b(?:token|secret|key|credential|authorization|password|passwd|apikey|api_key|access[_-]?key)\b/iu.test(`${r} ${n}`)}function qn(e,t){return e.start<t.end&&t.start<e.end}function qt(e){return e.sort((t,o)=>t.start!==o.start?t.start-o.start:o.end-o.start-(t.end-t.start))}var he=class{allowValues=new Set;enableEntropyHeuristic;constructor(t={}){for(let o of t.allowValues??[]){let r=zt(o);r&&this.allowValues.add(r)}this.enableEntropyHeuristic=t.enableEntropyHeuristic??!0}scan(t){let o=[];for(let i of Gn){let s=new RegExp(i.regex.source,i.regex.flags);for(let c of t.matchAll(s))c.index===void 0||!c[0]||this.allowed(c[0])||o.push({type:i.type,value:c[0],start:c.index,end:c.index+c[0].length,confidence:i.confidence})}this.enableEntropyHeuristic&&o.push(...this.entropyMatches(t));let r=qt(o),n=[];for(let i of r)n.some(s=>qn(s,i))||n.push(i);return qt(n)}hasSecrets(t){return this.scan(t).length>0}allowed(t){let o=zt(t);return Un.has(o)?!0:this.allowValues.has(o)}entropyMatches(t){let o=[],r=/[A-Za-z0-9_+/=-]{32,160}/g;for(let n of t.matchAll(r)){if(n.index===void 0||!n[0])continue;let i=n[0];this.allowed(i)||Yn(i)||!/[A-Za-z]/u.test(i)||!/[0-9]/u.test(i)||zn(t,n.index,n.index+i.length)&&(Bn(i)<3.7||o.push({type:"high_entropy_secret",value:i,start:n.index,end:n.index+i.length,confidence:"heuristic"}))}return o}};function Wt(e,t,o){Object.defineProperty(e,t,{value:o,enumerable:!0,writable:!0,configurable:!0})}var ke=class{scanner;constructor(t={}){this.scanner=new he(t)}sanitize(t){let o=this.scanner.scan(t);if(o.length===0)return{text:t,redacted:0,secretTypes:[]};let r=t,n=[...o].sort((s,c)=>c.start-s.start),i=new Set;for(let s of n)i.add(s.type),r=r.slice(0,s.start)+`[REDACTED:${s.type}]`+r.slice(s.end);return{text:r,redacted:o.length,secretTypes:[...i].sort()}}sanitizeValue(t){if(typeof t=="string")return this.sanitize(t).text;if(Array.isArray(t))return t.map(o=>this.sanitizeValue(o));if(t&&typeof t=="object"){let o={};for(let[r,n]of Object.entries(t)){if(r==="__proto__")continue;let i=r.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g,"");if(i.includes("password")||i.includes("passwd")||i==="pwd"||i.includes("secret")||i.includes("token")||i.includes("cookie")||i.includes("authorization")||i.includes("apikey")||i.includes("accesskey")||i.includes("privatekey")||i.includes("clientsecret")||i.includes("credential")){Wt(o,r,"[REDACTED]");continue}Wt(o,r,this.sanitizeValue(n))}return o}return t}};var $l=new ke;var Wn={mcp:!0,continuityRead:!0,nativeCapture:!1,lifecycleHooks:!1,sharedJournalWrite:!1,level:"mcp-only"},Qn={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!1,sharedJournalWrite:!0,level:"native-capture"},_={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!0,sharedJournalWrite:!0,level:"native-capture"},Xn={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!0,sharedJournalWrite:!0,level:"native-capture"};function v(e,t,o){return{agent:e,...t,refreshMode:o}}var Qt={agy:v("agy",_,"native-lifecycle"),opencode:v("opencode",Xn,"persistent-plugin"),codex:v("codex",_,"native-lifecycle"),claude:v("claude",_,"native-lifecycle"),kiro:v("kiro",_,"native-lifecycle"),cursor:v("cursor",_,"native-lifecycle"),copilot:v("copilot",_,"native-lifecycle"),grok:v("grok",_,"native-lifecycle"),"toolnet-cli":v("toolnet-cli",Qn,"native-session"),kilo:v("kilo",Wn,"mcp-only")};function Zn(e){return Object.prototype.hasOwnProperty.call(Qt,e)}function ei(e){if(Zn(e))return Qt[e]}function Xt(e){let t=ei(e);if(!t)return"unknown";switch(t.refreshMode){case"native-lifecycle":return"native lifecycle";case"persistent-plugin":return"persistent plugin";case"native-session":return"native session capture";case"mcp-only":return"MCP only"}}var Zt=["\u280B","\u2819","\u2839","\u2838","\u283C","\u2834","\u2826","\u2827","\u2807","\u280F"],h={clear:"\r\x1B[2K",cyan:"\x1B[36m",green:"\x1B[32m",red:"\x1B[31m",yellow:"\x1B[33m",amber:"\x1B[38;5;214m",dim:"\x1B[2m",reset:"\x1B[0m"};function eo(e,t=16){let r=Math.max(1,t-4+1),n=e%r;return"\u2500".repeat(n)+"\u2501".repeat(4)+"\u2500".repeat(Math.max(0,t-n-4))}function to(e){let t=Date.now()-e;return t<1e3?`${t}ms`:t<1e4?`${(t/1e3).toFixed(1)}s`:`${Math.round(t/1e3)}s`}var qe=class{stream;enabled;interactive;color;intervalMs;display;label;frame=0;startedAt=0;timer;active=!1;constructor(t,o={}){this.label=t,this.stream=o.stream??process.stderr,this.enabled=o.enabled??!0,this.interactive=o.interactive??this.stream.isTTY===!0,this.color=o.color??(this.interactive&&process.env.NO_COLOR===void 0),this.intervalMs=Math.max(40,o.intervalMs??80),this.display=o.display??"spinner"}start(){return!this.enabled||this.active?this:(this.active=!0,this.startedAt=Date.now(),this.interactive?(this.render(),this.timer=setInterval(()=>{this.frame=(this.frame+1)%1e4,this.render()},this.intervalMs),this.timer.unref?.(),this):(this.stream.write(`\u2192 ${this.label}
`),this))}update(t){return this.label=t,this.enabled&&this.active&&this.interactive&&this.render(),this}succeed(t){this.finish("\u2713",t??this.label,h.green)}fail(t){this.finish("\u2717",t??this.label,h.red)}warn(t){this.finish("!",t??this.label,h.yellow)}stop(){this.active&&(this.timer&&(clearInterval(this.timer),this.timer=void 0),this.enabled&&this.interactive&&this.stream.write(h.clear),this.active=!1)}render(){if(!this.enabled||!this.active||!this.interactive)return;let t=Zt[this.frame%Zt.length],o=this.display==="bar"?this.color?`${h.amber}${eo(this.frame)}${h.reset}`:eo(this.frame):this.color?`${h.cyan}${t}${h.reset}`:t,r=to(this.startedAt),n=this.color?`${h.dim}${r}${h.reset}`:r;this.stream.write(`${h.clear}${o} ${this.label} ${n}`)}finish(t,o,r){if(!this.enabled){this.active=!1;return}this.startedAt||(this.startedAt=Date.now()),this.timer&&(clearInterval(this.timer),this.timer=void 0);let n=to(this.startedAt),i=this.color?`${r}${t}${h.reset}`:t,s=this.color?`${h.dim}${n}${h.reset}`:n;this.interactive?this.stream.write(`${h.clear}${i} ${o} ${s}
`):this.stream.write(`${i} ${o} (${n})
`),this.active=!1}};async function We(e,t,o={}){let r=new qe(e,o).start();try{let n=await t();return r.succeed(),n}catch(n){throw r.fail(),n}}import{resolve as $i}from"node:path";import{homedir as Ti}from"node:os";import{join as _i}from"node:path";import{DeleteObjectCommand as ti,GetObjectCommand as oi,HeadObjectCommand as ri,ListObjectsV2Command as ni,PutObjectCommand as ii,S3Client as si}from"@aws-sdk/client-s3";import{getSignedUrl as ci}from"@aws-sdk/s3-request-presigner";var be=class{name="huggingface";client;bucket;constructor(t){this.bucket=t.bucket,this.client=new si({region:"us-east-1",endpoint:`https://s3.hf.co/${t.namespace}`,forcePathStyle:!0,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:t.accessKeyId,secretAccessKey:t.secretAccessKey}})}async put(t,o,r="application/octet-stream"){let n=typeof o=="string"?Buffer.from(o,"utf8"):o;await this.client.send(new ii({Bucket:this.bucket,Key:t,Body:n,ContentType:r}))}async get(t){let o=await ci(this.client,new oi({Bucket:this.bucket,Key:t}),{expiresIn:60}),r=await fetch(o,{redirect:"follow"});if(r.status===404)return null;if(!r.ok)throw new Error(`HF download failed: ${r.status} ${r.statusText}`);return new Uint8Array(await r.arrayBuffer())}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){try{return await this.client.send(new ri({Bucket:this.bucket,Key:t})),!0}catch(o){if(typeof o=="object"&&o!==null&&"$metadata"in o&&o.$metadata?.httpStatusCode===404)return!1;throw o}}async delete(t){await this.client.send(new ti({Bucket:this.bucket,Key:t}))}async list(t=""){let o=[],r;do{let n=await this.client.send(new ni({Bucket:this.bucket,Prefix:t||void 0,ContinuationToken:r}));for(let i of n.Contents??[])i.Key&&o.push({key:i.Key,size:i.Size,updatedAt:i.LastModified?.toISOString()});r=n.IsTruncated?n.NextContinuationToken:void 0}while(r);return o}};import{access as oo,mkdir as ai,readFile as li,readdir as ui,rm as di,stat as ro,writeFile as pi}from"node:fs/promises";import{dirname as gi,join as mi,relative as no,resolve as fi}from"node:path";var W=class{constructor(t){this.root=t}root;name="local";path(t){let o=t.replace(/^\/+/,"");return fi(this.root,o)}async put(t,o){let r=this.path(t);await ai(gi(r),{recursive:!0}),await pi(r,o)}async get(t){try{return await li(this.path(t))}catch(o){if(typeof o=="object"&&o!==null&&"code"in o&&o.code==="ENOENT")return null;throw o}}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){try{return await oo(this.path(t)),!0}catch{return!1}}async delete(t){await di(this.path(t),{force:!0})}async list(t=""){let o=this.path(t),r=[];try{await oo(o)}catch{return r}let n=async s=>{let c=await ui(s,{withFileTypes:!0});for(let a of c){let l=mi(s,a.name);if(a.isDirectory()){await n(l);continue}let u=await ro(l);r.push({key:no(this.root,l),size:u.size,updatedAt:u.mtime.toISOString()})}},i=await ro(o);return i.isDirectory()?await n(o):r.push({key:no(this.root,o),size:i.size,updatedAt:i.mtime.toISOString()}),r}};import{DeleteObjectCommand as yi,GetObjectCommand as hi,HeadObjectCommand as ki,ListObjectsV2Command as bi,PutObjectCommand as ji,S3Client as vi}from"@aws-sdk/client-s3";import{getSignedUrl as Si}from"@aws-sdk/s3-request-presigner";var Q=class{name;client;bucket;constructor(t){this.name=t.name??"s3",this.bucket=t.bucket,this.client=new vi({region:t.region??"us-east-1",endpoint:t.endpoint||void 0,forcePathStyle:t.forcePathStyle??!1,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:t.accessKeyId,secretAccessKey:t.secretAccessKey}})}async put(t,o,r="application/octet-stream"){let n=typeof o=="string"?Buffer.from(o,"utf8"):o;await this.client.send(new ji({Bucket:this.bucket,Key:t,Body:n,ContentType:r}))}async get(t){let o=await Si(this.client,new hi({Bucket:this.bucket,Key:t}),{expiresIn:60}),r=await fetch(o,{redirect:"follow"});if(r.status===404)return null;if(!r.ok)throw new Error(`${this.name} download failed: ${r.status} ${r.statusText}`);return new Uint8Array(await r.arrayBuffer())}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){try{return await this.client.send(new ki({Bucket:this.bucket,Key:t})),!0}catch(o){if(typeof o=="object"&&o!==null&&"$metadata"in o&&o.$metadata?.httpStatusCode===404)return!1;throw o}}async delete(t){await this.client.send(new yi({Bucket:this.bucket,Key:t}))}async list(t=""){let o=[],r;do{let n=await this.client.send(new bi({Bucket:this.bucket,Prefix:t||void 0,ContinuationToken:r}));for(let i of n.Contents??[])i.Key&&o.push({key:i.Key,size:i.Size,updatedAt:i.LastModified?.toISOString()});r=n.IsTruncated?n.NextContinuationToken:void 0}while(r);return o}};import{createCipheriv as Ii,createDecipheriv as wi,createHash as Ci,randomBytes as xi,timingSafeEqual as Ri}from"node:crypto";import{readFileSync as Oi}from"node:fs";var A=Buffer.from("TNMEME01","ascii"),so=1,X=8,Z=12,Qe=16,co=A.length+1+X+Z+Qe,Ei="toolnet-memory:remote-encryption:v1:",ao="aes-256-gcm",Xe=32,m=class extends Error{constructor(o,r){super(r);this.code=o;this.name="RemoteEncryptionError"}code};function Pi(e){return e?["1","true","yes","on","enabled"].includes(e.trim().toLowerCase()):!1}function Ze(e=process.env){return Pi(e.TOOLNET_REMOTE_ENCRYPTION)}function io(e){let t=e.trim();if(!t)throw new m("REMOTE_ENCRYPTION_KEY_EMPTY","Remote encryption key is empty.");let o;if(t.startsWith("hex:")){let r=t.slice(4);if(!/^[0-9a-f]{64}$/iu.test(r))throw new m("REMOTE_ENCRYPTION_KEY_INVALID","hex: remote encryption key must contain exactly 64 hexadecimal characters.");o=Buffer.from(r,"hex")}else if(/^[0-9a-f]{64}$/iu.test(t))o=Buffer.from(t,"hex");else{let r=t.startsWith("base64:")?t.slice(7):t;if(!/^[A-Za-z0-9+/_-]+={0,2}$/u.test(r))throw new m("REMOTE_ENCRYPTION_KEY_INVALID","Remote encryption key must be 32 raw bytes encoded as hexadecimal or base64.");o=Buffer.from(r,r.includes("-")||r.includes("_")?"base64url":"base64")}if(o.length!==Xe)throw new m("REMOTE_ENCRYPTION_KEY_INVALID_LENGTH",`Remote encryption key must decode to exactly ${Xe} bytes.`);return o}function lo(e=process.env){let t=e.TOOLNET_REMOTE_ENCRYPTION_KEY?.trim(),o=e.TOOLNET_REMOTE_ENCRYPTION_KEY_FILE?.trim();if(t&&o)throw new m("REMOTE_ENCRYPTION_KEY_AMBIGUOUS","Configure either TOOLNET_REMOTE_ENCRYPTION_KEY or TOOLNET_REMOTE_ENCRYPTION_KEY_FILE, not both.");if(t)return io(t);if(o){let r;try{r=Oi(o,"utf8")}catch(n){throw new m("REMOTE_ENCRYPTION_KEY_FILE_READ_FAILED",[`Unable to read remote encryption key file: ${o}.`,n instanceof Error?n.message:String(n)].join(" "))}return io(r)}}function uo(e){return Ci("sha256").update(e).digest().subarray(0,X)}function po(e){return Buffer.from(`${Ei}${e}`,"utf8")}function et(e){return e.byteLength<A.length?!1:Buffer.from(e).subarray(0,A.length).equals(A)}function go(e,t,o){if(o.byteLength!==Xe)throw new m("REMOTE_ENCRYPTION_KEY_INVALID_LENGTH","AES-256-GCM requires a 32-byte key.");let r=typeof t=="string"?Buffer.from(t,"utf8"):Buffer.from(t),n=xi(Z),i=Ii(ao,o,n);i.setAAD(po(e));let s=Buffer.concat([i.update(r),i.final()]),c=i.getAuthTag(),a=Buffer.alloc(co),l=0;return A.copy(a,l),l+=A.length,a.writeUInt8(so,l),l+=1,uo(o).copy(a,l),l+=X,n.copy(a,l),l+=Z,c.copy(a,l),Buffer.concat([a,s])}function mo(e,t,o){let r=Buffer.from(t);if(!et(r))throw new m("REMOTE_ENCRYPTION_ENVELOPE_REQUIRED","Payload is not a ToolNet encrypted remote object.");if(r.length<co)throw new m("REMOTE_ENCRYPTION_ENVELOPE_TRUNCATED","Encrypted remote payload is truncated.");let n=A.length,i=r.readUInt8(n);if(n+=1,i!==so)throw new m("REMOTE_ENCRYPTION_VERSION_UNSUPPORTED",`Unsupported remote encryption envelope version: ${i}.`);let s=r.subarray(n,n+X);n+=X;let c=uo(o);if(!Ri(s,c))throw new m("REMOTE_ENCRYPTION_KEY_MISMATCH","Configured remote encryption key does not match this encrypted object.");let a=r.subarray(n,n+Z);n+=Z;let l=r.subarray(n,n+Qe);n+=Qe;let u=r.subarray(n),d=wi(ao,o,a);d.setAAD(po(e)),d.setAuthTag(l);try{return Buffer.concat([d.update(u),d.final()])}catch{throw new m("REMOTE_ENCRYPTION_AUTH_FAILED","Encrypted remote object failed AES-GCM authentication.")}}var tt=class{constructor(t,o){this.inner=t;this.options=o;if(this.name=t.name,o.enabled&&!o.key)throw new m("REMOTE_ENCRYPTION_KEY_REQUIRED","Remote client-side encryption is enabled but no encryption key is configured.")}inner;options;name;async put(t,o,r){if(!this.options.enabled){await this.inner.put(t,o,r);return}let n=this.options.key;if(!n)throw new m("REMOTE_ENCRYPTION_KEY_REQUIRED","Remote encryption key is unavailable.");let i=go(t,o,n);await this.inner.put(t,i,"application/octet-stream")}async get(t){let o=await this.inner.get(t);if(!o)return null;if(!et(o))return o;if(!this.options.enabled)throw new m("REMOTE_ENCRYPTION_REQUIRED",["Remote object is client-side encrypted.","Enable TOOLNET_REMOTE_ENCRYPTION and configure the matching key."].join(" "));let r=this.options.key;if(!r)throw new m("REMOTE_ENCRYPTION_KEY_REQUIRED","Remote object is encrypted but no decryption key is configured.");return mo(t,o,r)}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){return this.inner.exists(t)}async delete(t){await this.inner.delete(t)}async list(t=""){return this.inner.list(t)}};function fo(e,t=process.env){if(e.name==="local")return Ze(t)&&console.warn("[storage] Remote encryption requested but active storage provider is local; local data remains unchanged."),e;let o=Ze(t),r=o?lo(t):void 0;return new tt(e,{enabled:o,key:r})}function ee(e){return fo(e)}function ot(e,t){return console.warn(t),ee(new W(e))}function yo(e){let t=e.localRoot??_i(Ti(),".toolnet-memory","storage");if(e.provider==="r2"){let o=e.r2;return o?.accountId&&o.bucket&&o.accessKeyId&&o.secretAccessKey?ee(new Q({name:"r2",endpoint:`https://${o.accountId}.r2.cloudflarestorage.com`,region:"auto",bucket:o.bucket,forcePathStyle:!0,accessKeyId:o.accessKeyId,secretAccessKey:o.secretAccessKey})):ot(t,"[storage] Cloudflare R2 credentials missing. Using local fallback.")}if(e.provider==="s3"){let o=e.s3;return o?.bucket&&o.accessKeyId&&o.secretAccessKey?ee(new Q({name:"s3",endpoint:o.endpoint,region:o.region??"us-east-1",bucket:o.bucket,forcePathStyle:o.forcePathStyle??!1,accessKeyId:o.accessKeyId,secretAccessKey:o.secretAccessKey})):ot(t,"[storage] S3 credentials missing. Using local fallback.")}if(e.provider==="huggingface"){let o=e.huggingface;return o?.namespace&&o.bucket&&o.accessKeyId&&o.secretAccessKey?ee(new be({namespace:o.namespace,bucket:o.bucket,accessKeyId:o.accessKeyId,secretAccessKey:o.secretAccessKey})):ot(t,"[storage] Hugging Face credentials missing. Using local fallback.")}return ee(new W(t))}function Ai(e){return new Promise(t=>setTimeout(t,e))}async function ho(e,t={}){let o=Math.max(1,t.attempts??3),r=t.baseDelayMs??150,n=t.maxDelayMs??2e3,i;for(let s=1;s<=o;s++)try{return await e()}catch(c){if(i=c,s>=o)break;let a=Math.min(n,r*2**(s-1)),l=Math.floor(Math.random()*Math.max(1,a*.2));await Ai(a+l)}throw i}var Mi=new Set(["put","get","getText","delete","list"]);function ko(e,t={}){return new Proxy(e,{get(o,r){let n=Reflect.get(o,r,o);return typeof n!="function"?n:Mi.has(r)?(...i)=>ho(()=>Promise.resolve(n.apply(o,i)),t):n.bind(o)}})}var S="authority: never rebuilt, never dropped",Ni=[{kind:"memory_records",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:S,legacyValueDomains:[],description:"Long-term project memory records (projects/<id>/memories/current.json)."},{kind:"task_operations",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"reject",sourceOfTruth:S,legacyValueDomains:[],description:"Immutable task operation log (.toolnet/tasks/events.jsonl)."},{kind:"task_replication_log",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"reject",sourceOfTruth:S,legacyValueDomains:[],description:"Replicated task operations from other hosts."},{kind:"retrieval_feedback",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:S,legacyValueDomains:[],description:"Retrieval feedback signals (.toolnet/retrieval/feedback.jsonl)."},{kind:"retrieval_telemetry",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:S,legacyValueDomains:[],description:"Retrieval telemetry samples (.toolnet/retrieval/telemetry.jsonl)."},{kind:"retrieval_overrides",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:S,legacyValueDomains:[],description:"Operator retrieval overrides (.toolnet/retrieval/overrides.json)."},{kind:"session_wal",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"accept",sourceOfTruth:S,legacyValueDomains:[],description:"Session write-ahead log (.toolnet/runtime/sources/)."},{kind:"adr_state",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"reject",sourceOfTruth:S,legacyValueDomains:[],description:"Architecture decision records (projects/<id>/knowledge/adr/state.v1.json)."},{kind:"project_manifest",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"backward_compatible",missingVersionPolicy:"assume_legacy",sourceOfTruth:S,legacyValueDomains:[],description:"Project identity manifest (.toolnet/project.json and the remote copy)."},{kind:"recovery_backup",storeClass:"authority",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"exact",missingVersionPolicy:"reject",sourceOfTruth:S,legacyValueDomains:[],description:"Disaster-recovery backup manifest, version-gated on read."},{kind:"task_projection",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"task operations log",legacyValueDomains:[],description:"Materialized task state; rebuilt from the operation log."},{kind:"code_graph",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Code graph snapshot (projects/<id>/graph/current.json)."},{kind:"code_manifest",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Incremental file manifest (projects/<id>/graph/manifest.json)."},{kind:"resolution_snapshot",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"backward_compatible",missingVersionPolicy:"assume_legacy",sourceOfTruth:"repository source",legacyValueDomains:["resolution_kind_uppercase"],description:"Symbol resolution snapshot (projects/<id>/graph/resolution/current.json); the legacy kind vocabulary (CALL/REFERENCE/EXTENDS/IMPLEMENTS) is normalized in memory on read."},{kind:"graph_coverage",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code graph + resolution",legacyValueDomains:[],description:"Graph coverage snapshot (projects/<id>/graph/coverage.json)."},{kind:"cross_service",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source + service extractors",legacyValueDomains:[],description:"Cross-service linkage (projects/<id>/graph/cross-service.json)."},{kind:"fleet_export",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Fleet export view (projects/<id>/graph/fleet-export.json)."},{kind:"snapshot_archive",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"current project state",legacyValueDomains:[],description:"Point-in-time project snapshots; never part of authority backups."},{kind:"code_artifacts",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"reject",sourceOfTruth:"repository source + semantic registry",legacyValueDomains:[],description:"Portable code-intelligence artifacts, gated by the artifact fingerprint matrix."},{kind:"code_chunks",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Code chunk snapshot (projects/<id>/code/chunks/current.json)."},{kind:"code_vectors",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code chunks",legacyValueDomains:[],description:"Code vector index (projects/<id>/code/vectors/current.json)."},{kind:"memory_vectors",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"memory records",legacyValueDomains:[],description:"Deterministic memory vector index (projects/<id>/vectors/current.json)."},{kind:"architecture_snapshot",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code graph",legacyValueDomains:[],description:"Architecture snapshot (projects/<id>/code/architecture)."},{kind:"code_analysis",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code graph",legacyValueDomains:[],description:"Code analysis snapshot (projects/<id>/code/analysis)."},{kind:"visualization_graph",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"code graph",legacyValueDomains:[],description:"Visualization graph (projects/<id>/code/visualization/graph.json)."},{kind:"runtime_traces",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"observed session activity",legacyValueDomains:[],description:"Runtime trace sessions plus their recomputed observation index."},{kind:"journal",storeClass:"derived",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"session activity",legacyValueDomains:[],description:"Local session journal (.toolnet/journal)."},{kind:"task_replication_cursor",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"task replication log",legacyValueDomains:[],description:"Replication cursor (.toolnet/tasks/replication/cursor.json)."},{kind:"runtime_locks",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"process lifetime",legacyValueDomains:[],description:"Runtime lock files (.toolnet/runtime/locks)."},{kind:"daemon_state",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"running daemon",legacyValueDomains:[],description:"Daemon coordination state (daemon-state.json)."},{kind:"daemon_runtime_files",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"running daemon",legacyValueDomains:[],description:"Daemon socket, pid, lock and logs."},{kind:"artifact_staging",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"repository source",legacyValueDomains:[],description:"Artifact staging area (.toolnet/cache/artifacts/staging)."},{kind:"test_run_cache",storeClass:"ephemeral",schemaVersion:1,supportedLegacyVersions:[1],compatibility:"rebuild_required",missingVersionPolicy:"accept",sourceOfTruth:"test execution",legacyValueDomains:[],description:"In-memory only derived test-run store."}],Fi=Object.freeze(Ni.slice().sort((e,t)=>e.kind.localeCompare(t.kind))),nd=new Map(Fi.map(e=>[e.kind,e]));var g="projects/[^/]+",id=[{pattern:/^\.toolnet\/tasks\/events\.jsonl$/u,kind:"task_operations"},{pattern:/^\.toolnet\/tasks\/replication\/replicated(\/|$)/u,kind:"task_replication_log"},{pattern:/^\.toolnet\/tasks\/replication\/cursor\.json$/u,kind:"task_replication_cursor"},{pattern:/^\.toolnet\/tasks\/state\.json$/u,kind:"task_projection"},{pattern:/^\.toolnet\/tasks(\/|$)/u,kind:"task_projection"},{pattern:/^\.toolnet\/retrieval\/feedback\.jsonl$/u,kind:"retrieval_feedback"},{pattern:/^\.toolnet\/retrieval\/telemetry\.jsonl$/u,kind:"retrieval_telemetry"},{pattern:/^\.toolnet\/retrieval\/overrides\.json$/u,kind:"retrieval_overrides"},{pattern:/^\.toolnet\/retrieval(\/|$)/u,kind:"retrieval_overrides"},{pattern:/^\.toolnet\/runtime\/sources(\/|$)/u,kind:"session_wal"},{pattern:/^\.toolnet\/runtime\/locks(\/|$)/u,kind:"runtime_locks"},{pattern:/^\.toolnet\/runtime(\/|$)/u,kind:"session_wal"},{pattern:/^\.toolnet\/journal(\/|$)/u,kind:"journal"},{pattern:/^\.toolnet\/cache\/artifacts\/staging(\/|$)/u,kind:"artifact_staging"},{pattern:/^\.toolnet\/cache(\/|$)/u,kind:"artifact_staging"},{pattern:/^\.toolnet\/project\.json$/u,kind:"project_manifest"},{pattern:new RegExp(`^${g}/memories(/|$)`,"u"),kind:"memory_records"},{pattern:new RegExp(`^${g}/knowledge/adr(/|$)`,"u"),kind:"adr_state"},{pattern:new RegExp(`^${g}/project\\.json$`,"u"),kind:"project_manifest"},{pattern:new RegExp(`^${g}/graph/artifacts(/|$)`,"u"),kind:"code_artifacts"},{pattern:new RegExp(`^${g}/graph/resolution(/|$)`,"u"),kind:"resolution_snapshot"},{pattern:new RegExp(`^${g}/graph/coverage\\.json$`,"u"),kind:"graph_coverage"},{pattern:new RegExp(`^${g}/graph/cross-service\\.json$`,"u"),kind:"cross_service"},{pattern:new RegExp(`^${g}/graph/fleet-export\\.json$`,"u"),kind:"fleet_export"},{pattern:new RegExp(`^${g}/graph/manifest\\.json$`,"u"),kind:"code_manifest"},{pattern:new RegExp(`^${g}/graph/current\\.json$`,"u"),kind:"code_graph"},{pattern:new RegExp(`^${g}/graph(/|$)`,"u"),kind:"code_graph"},{pattern:new RegExp(`^${g}/code/graph(/|$)`,"u"),kind:"code_graph"},{pattern:new RegExp(`^${g}/code/chunks(/|$)`,"u"),kind:"code_chunks"},{pattern:new RegExp(`^${g}/code/vectors(/|$)`,"u"),kind:"code_vectors"},{pattern:new RegExp(`^${g}/code/architecture(/|$)`,"u"),kind:"architecture_snapshot"},{pattern:new RegExp(`^${g}/code/analysis(/|$)`,"u"),kind:"code_analysis"},{pattern:new RegExp(`^${g}/code/visualization(/|$)`,"u"),kind:"visualization_graph"},{pattern:new RegExp(`^${g}/vectors(/|$)`,"u"),kind:"memory_vectors"},{pattern:new RegExp(`^${g}/memory(/|$)`,"u"),kind:"memory_records"},{pattern:new RegExp(`^${g}/runtime-traces(/|$)`,"u"),kind:"runtime_traces"},{pattern:new RegExp(`^${g}/snapshots(/|$)`,"u"),kind:"snapshot_archive"},{pattern:/(^|\/)snapshots\/[^/]+\/(memories|vectors|graph)\//u,kind:"snapshot_archive"},{pattern:/(^|\/)daemon-state\.json$/u,kind:"daemon_state"},{pattern:/(^|\/)(daemon\.lock|daemon\.pid|daemon\.sock)$/u,kind:"daemon_runtime_files"},{pattern:/(^|\/)logs\/daemon\.log$/u,kind:"daemon_runtime_files"}];function D(e){let t=e.trim().replace(/\s+/g,"_").replace(/[^A-Za-z0-9._-]/g,"_").replace(/_+/g,"_").replace(/^\.+|\.+$/g,"").slice(0,100);if(!t||t==="."||t==="..")throw new Error("Invalid project storage folder");return t}var wd=Object.freeze({CALL:"call",REFERENCE:"type",EXTENDS:"inheritance",IMPLEMENTS:"implementation"});var Di="_toolnet/registry/project-identities/v1",b=class extends Error{code="PROJECT_IDENTITY_COLLISION";constructor(t){super(t),this.name="ProjectIdentityCollisionError"}},je=class extends Error{code="PROJECT_IDENTITY_ADOPTION_REQUIRED";constructor(t,o){super(["PROJECT_IDENTITY_ADOPTION_REQUIRED",`remote=${t}`,`projectId=${o}`,"A legacy remote ToolNet project exists but has no Git fingerprint proof.",`Re-run with: toolnet-memory init --adopt-remote ${t}`].join(" ")),this.name="ProjectIdentityAdoptionRequiredError"}},te=class extends Error{code="PROJECT_IDENTITY_REGISTRY_UNAVAILABLE";constructor(t){super(["PROJECT_IDENTITY_REGISTRY_UNAVAILABLE",t,"Refusing to create a possibly split project identity while configured remote storage cannot be checked.","Use --no-remote-identity only when local-only initialization is intentional."].join(" ")),this.name="ProjectIdentityRegistryUnavailableError"}};function Li(){let e=Ue();if(e.storage.provider==="r2"){let t=e.storage.r2;return!!(t.accountId&&t.bucket&&t.accessKeyId&&t.secretAccessKey)}if(e.storage.provider==="s3"){let t=e.storage.s3;return!!(t.bucket&&t.accessKeyId&&t.secretAccessKey)}if(e.storage.provider==="huggingface"){let t=e.storage.huggingface;return!!(t.namespace&&t.bucket&&t.accessKeyId&&t.secretAccessKey)}return!1}function bo(e){if(e.storage)return{storage:e.storage,crossMachine:e.storageIsCrossMachine??!0,providerName:e.storage.name};let t=Ue(),o=yo({provider:t.storage.provider,r2:t.storage.r2,s3:t.storage.s3,huggingface:t.storage.huggingface,localRoot:t.storage.localRoot}),r=Li()&&o.name!=="local";return{storage:r?ko(o,{attempts:Number(process.env.TOOLNET_STORAGE_RETRIES??3)}):o,crossMachine:r,providerName:o.name}}function vo(e){return[Di,`${e.fingerprint}.json`].join("/")}function So(e,t){let o;try{o=JSON.parse(e)}catch(i){throw new b([`Invalid ToolNet project identity registry record: ${t}.`,i instanceof Error?i.message:String(i)].join(" "))}if(!o||typeof o!="object"||Array.isArray(o))throw new b(`Invalid ToolNet project identity registry record: ${t}`);let r=o;for(let i of["fingerprint","canonicalGitRemote","projectId","projectName","projectRemote"])if(typeof r[i]!="string"||!String(r[i]).trim())throw new b(`ToolNet identity registry record ${t} is missing ${i}`);let n=new Date().toISOString();return{version:1,fingerprint:String(r.fingerprint),canonicalGitRemote:String(r.canonicalGitRemote),projectId:String(r.projectId),projectName:String(r.projectName),projectRemote:String(r.projectRemote),createdAt:typeof r.createdAt=="string"?r.createdAt:n,updatedAt:typeof r.updatedAt=="string"?r.updatedAt:n}}function Ki(e,t){let o;try{o=JSON.parse(e)}catch(s){throw new b([`Invalid remote ToolNet project manifest: ${t}.`,s instanceof Error?s.message:String(s)].join(" "))}if(!o||typeof o!="object"||Array.isArray(o))throw new b(`Invalid remote ToolNet project manifest: ${t}`);let r=o;if(typeof r.id!="string"||!r.id.trim())throw new b(`Remote ToolNet project manifest ${t} is missing id`);let n=typeof r.remote=="string"&&r.remote.trim()?r.remote:t.split("/")[1]??"project",i=typeof r.name=="string"&&r.name.trim()?r.name:n;return{version:typeof r.version=="number"?r.version:void 0,id:r.id,name:i,remote:n,createdAt:typeof r.createdAt=="string"?r.createdAt:void 0,updatedAt:typeof r.updatedAt=="string"?r.updatedAt:void 0}}async function ve(e,t){let r=`projects/${D(t)}/project.json`,n=await e.getText(r);return n?Ki(n,r):null}async function Hi(e,t){let o=vo(t),r=await e.getText(o);if(!r)return null;let n=So(r,o);if(n.fingerprint!==t.fingerprint||n.canonicalGitRemote!==t.canonicalRemote)throw new b(["PROJECT_IDENTITY_REGISTRY_MISMATCH",`key=${o}`,`expectedFingerprint=${t.fingerprint}`,`actualFingerprint=${n.fingerprint}`].join(" "));return n}async function Vi(e,t){let o=await ve(e,t.projectRemote);if(o&&o.id!==t.projectId)throw new b(["PROJECT_IDENTITY_REMOTE_OWNERSHIP_MISMATCH",`remote=${t.projectRemote}`,`registryId=${t.projectId}`,`remoteId=${o.id}`].join(" "))}async function rt(e,t,o){let r=D(t.remote??t.name),n=await ve(e,r);if(n&&n.id!==t.id)throw new b(["PROJECT_IDENTITY_REMOTE_NAMESPACE_COLLISION",`remote=${r}`,`existing=${n.id}`,`current=${t.id}`].join(" "));let i=vo(o),s=await e.getText(i);if(s){let l=So(s,i);if(l.projectId!==t.id||l.canonicalGitRemote!==o.canonicalRemote)throw new b(["PROJECT_IDENTITY_REGISTRY_COLLISION",`fingerprint=${o.fingerprint}`,`existingProject=${l.projectId}`,`currentProject=${t.id}`].join(" "));return}let c=new Date().toISOString(),a={version:1,fingerprint:o.fingerprint,canonicalGitRemote:o.canonicalRemote,projectId:t.id,projectName:t.name,projectRemote:r,createdAt:t.createdAt,updatedAt:c};await e.put(i,JSON.stringify(a,null,2)+`
`,"application/json")}function Ji(e,t){return{id:e.id,name:e.name,remote:e.remote,createdAt:e.createdAt,gitIdentity:t,metadata:{adoptedFromRemote:!0,adoptedAt:new Date().toISOString()}}}function jo(e){return e instanceof b||e instanceof je||e instanceof te}async function Io(e=process.cwd(),t={}){let o=$i(e),r=new $,n=r.findExisting(o),i=pe(n?.rootPath??o);if(n){let c=n;if(i&&(c=r.recordGitIdentity(n.rootPath,i,{allowRebind:t.allowGitRebind??!1})),t.skipRemoteIdentity||!i)return{project:c,source:"existing-manifest",gitIdentity:i,registry:t.skipRemoteIdentity?"skipped":"disabled"};let a=bo(t);if(!a.crossMachine)return{project:c,source:"existing-manifest",gitIdentity:i,registry:"disabled",registryProvider:a.providerName};try{return await rt(a.storage,c,i),{project:c,source:"existing-manifest",gitIdentity:i,registry:"registered",registryProvider:a.providerName}}catch(l){if(jo(l))throw l;return{project:c,source:"existing-manifest",gitIdentity:i,registry:"unavailable",registryProvider:a.providerName}}}if(!i)return{project:r.detect(o),source:"legacy-path",gitIdentity:null,registry:"disabled"};if(t.skipRemoteIdentity)return{project:r.detect(o),source:"git-remote",gitIdentity:i,registry:"skipped"};let s=bo(t);if(!s.crossMachine){if(t.adoptRemote)throw new te("Explicit remote adoption was requested but no cross-machine storage provider is configured.");return{project:r.detect(o),source:"git-remote",gitIdentity:i,registry:"disabled",registryProvider:s.providerName}}try{let c=await Hi(s.storage,i);if(c){if(t.adoptRemote&&D(t.adoptRemote)!==D(c.projectRemote))throw new b(["PROJECT_IDENTITY_EXPLICIT_ADOPTION_CONFLICT",`requested=${t.adoptRemote}`,`registered=${c.projectRemote}`].join(" "));return await Vi(s.storage,c),{project:r.adopt(o,{id:c.projectId,name:c.projectName,remote:c.projectRemote,createdAt:c.createdAt,gitIdentity:i,metadata:{adoptedFromRegistry:!0,adoptedAt:new Date().toISOString()}}),source:"remote-registry",gitIdentity:i,registry:"matched",registryProvider:s.providerName}}if(t.adoptRemote){let u=await ve(s.storage,t.adoptRemote);if(!u)throw new Error(["PROJECT_ADOPTION_REMOTE_NOT_FOUND",`remote=${t.adoptRemote}`].join(" "));let d=r.adopt(o,Ji(u,i));return await rt(s.storage,d,i),{project:d,source:"explicit-remote-adoption",gitIdentity:i,registry:"registered",registryProvider:s.providerName}}let a=await ve(s.storage,i.repositoryName);if(a)throw new je(a.remote,a.id);let l=r.detect(o);return await rt(s.storage,l,i),{project:l,source:"git-remote",gitIdentity:i,registry:"registered",registryProvider:s.providerName}}catch(c){throw jo(c)?c:new te(c instanceof Error?c.message:String(c))}}import{existsSync as Zo}from"node:fs";import{homedir as ms}from"node:os";import{join as fs}from"node:path";import{spawnSync as ys}from"node:child_process";import{homedir as Gi}from"node:os";import{join as L}from"node:path";function wo(e={}){return L(e.home??Gi(),".gemini")}function Co(e={}){return L(wo(e),"antigravity-cli")}function xo(e={}){return L(wo(e),"config")}function Se(e={}){return L(xo(e),"mcp_config.json")}function Ie(e={}){let t=e.cwd??process.cwd();return L(t,".agents","mcp_config.json")}function we(e="toolnet-memory",t={}){return L(Co(t),"plugins",e)}function Ro(e={}){return[Co(e),Se(e),xo(e),Ie(e)]}import{homedir as Oo}from"node:os";import{join as M}from"node:path";function K(e={}){let t=process.env.OPENCODE_CONFIG_DIR?.trim();if(t)return t;let o=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return o?M(o,"opencode"):M(e.home??Oo(),".config","opencode")}function nt(e={}){let t=process.env.OPENCODE_CONFIG?.trim();if(t)return t;let o=e.home??Oo(),r=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return r?M(r,"opencode","opencode.json"):M(o,".config","opencode","opencode.json")}function it(e={}){let t=e.cwd??process.cwd();return M(t,"opencode.json")}function Eo(e={}){return M(K(e),"plugins")}function Po(e={}){return M(K(e),"AGENTS.md")}import{homedir as To}from"node:os";import{join as st}from"node:path";function ct(e={}){return st(e.home??To(),".claude")}function _o(e={}){return st(ct(e),"settings.json")}function Ao(e={}){return st(e.home??To(),".claude.json")}import{homedir as Ui}from"node:os";import{join as N}from"node:path";function at(e={}){return e.kiroHome??process.env.KIRO_HOME??N(e.home??Ui(),".kiro")}function Bi(e={}){return N(at(e),"settings")}function Ce(e={}){return N(Bi(e),"mcp.json")}function lt(e={}){let t=e.cwd??process.cwd();return N(t,".kiro","settings","mcp.json")}function Yi(e={}){return N(at(e),"hooks")}function ut(e={}){return N(Yi(e),"toolnet-memory.json")}function dt(e={}){let t=e.cwd??process.cwd();return N(t,".kiro","hooks","toolnet-memory.json")}function Mo(e={}){return[at(e),Ce(e)]}import{homedir as zi}from"node:os";import{join as pt}from"node:path";function No(e={}){return pt(e.home??zi(),".toolnetcli")}function qi(e={}){return pt(No(e),"config.json")}function Fo(e={}){let t=e.cwd??process.cwd();return pt(t,".toolnet","mcp.json")}function $o(e={}){let t=No(e),o=qi(e);return[t,o]}import{homedir as Wi}from"node:os";import{join as gt}from"node:path";function Do(e={}){if(e.kiloHome)return e.kiloHome;if(process.env.KILO_HOME)return process.env.KILO_HOME;let t=e.xdgConfigHome??process.env.XDG_CONFIG_HOME;return t?gt(t,"kilo"):gt(e.home??Wi(),".config","kilo")}function mt(e={}){return gt(Do(e),"kilo.jsonc")}function Lo(e={}){let t=Do(e),o=mt(e);return[t,o]}import{homedir as Qi}from"node:os";import{join as w,resolve as Xi}from"node:path";function xe(e={}){return e.cursorHome??w(e.home??Qi(),".cursor")}function Zi(e={}){return e.cursorConfigDir??process.env.CURSOR_CONFIG_DIR??(e.xdgConfigHome??process.env.XDG_CONFIG_HOME?w(e.xdgConfigHome??process.env.XDG_CONFIG_HOME,"cursor"):void 0)??xe(e)}function Re(e={}){return w(xe(e),"mcp.json")}function Oe(e={}){return w(xe(e),"hooks.json")}function ft(e){return w(Xi(e),".cursor")}function Ko(e){return w(ft(e),"mcp.json")}function Ho(e){return w(ft(e),"hooks.json")}function es(e){return w(ft(e),"rules")}function Vo(e){return w(es(e),"toolnet-memory.mdc")}function Jo(e={}){return Array.from(new Set([xe(e),Zi(e)]))}import{homedir as ts}from"node:os";import{join as I,resolve as os}from"node:path";function yt(e={}){return e.copilotHome??process.env.COPILOT_HOME??I(e.home??ts(),".copilot")}function Ee(e={}){return I(yt(e),"mcp-config.json")}function rs(e={}){return I(yt(e),"hooks")}function Pe(e={}){return I(rs(e),"toolnet-memory.json")}function ht(e){return I(os(e),".github")}function Go(e){return I(ht(e),"mcp.json")}function ns(e){return I(ht(e),"hooks")}function Uo(e){return I(ns(e),"toolnet-memory.json")}function is(e){return I(ht(e),"instructions")}function Bo(e){return I(is(e),"toolnet-memory.instructions.md")}function Yo(e={}){return[yt(e)]}import{homedir as ss}from"node:os";import{join as j,resolve as cs}from"node:path";function Te(e={}){return e.grokHome??process.env.GROK_HOME??j(e.home??ss(),".grok")}function _e(e={}){return j(Te(e),"config.toml")}function as(e={}){return j(Te(e),"hooks")}function Ae(e={}){return j(as(e),"toolnet-memory.json")}function ls(e={}){return j(Te(e),"skills")}function us(e={}){return j(ls(e),"toolnet-continuity")}function Me(e={}){return j(us(e),"SKILL.md")}function kt(e){return j(cs(e),".grok")}function zo(e){return j(kt(e),"config.toml")}function ds(e){return j(kt(e),"hooks")}function qo(e){return j(ds(e),"toolnet-memory.json")}function ps(e){return j(kt(e),"skills")}function gs(e){return j(ps(e),"toolnet-continuity")}function Wo(e){return j(gs(e),"SKILL.md")}function Qo(e={}){return[Te(e)]}function hs(e){return ys("sh",["-lc",`command -v ${JSON.stringify(e)} >/dev/null 2>&1`],{stdio:"ignore"}).status===0}function O(e){let t=e.commandExists(e.command),o=e.configPaths.filter(i=>Zo(i)),r=o.length>0,n=[];t&&n.push(`command:${e.command}`);for(let i of o)n.push(`config:${i}`);return{agent:e.agent,detected:t||r,commandDetected:t,configDetected:r,evidence:n}}function Xo(e){let t=e.commands.filter(s=>e.commandExists(s)),o=e.configPaths.filter(s=>Zo(s)),r=t.length>0,n=o.length>0,i=[...t.map(s=>`command:${s}`),...o.map(s=>`config:${s}`)];return{agent:e.agent,detected:r||n,commandDetected:r,configDetected:n,evidence:i}}function er(e={}){let t=e.home??ms(),o=e.commandExists??hs,r=e.codexHome??process.env.CODEX_HOME??fs(t,".codex");return[O({agent:"agy",command:"agy",commandExists:o,configPaths:Ro({home:t})}),O({agent:"opencode",command:"opencode",commandExists:o,configPaths:[K({home:t,xdgConfigHome:e.xdgConfigHome})]}),O({agent:"claude",command:"claude",commandExists:o,configPaths:[ct({home:t})]}),O({agent:"kiro",command:"kiro-cli",commandExists:o,configPaths:Mo({home:t,kiroHome:e.kiroHome})}),Xo({agent:"cursor",commands:["agent","cursor-agent"],commandExists:o,configPaths:Jo({home:t,cursorHome:e.cursorHome,cursorConfigDir:e.cursorConfigDir,xdgConfigHome:e.xdgConfigHome})}),O({agent:"copilot",command:"copilot",commandExists:o,configPaths:Yo({home:t,copilotHome:e.copilotHome})}),O({agent:"grok",command:"grok",commandExists:o,configPaths:Qo({home:t,grokHome:e.grokHome})}),O({agent:"toolnet-cli",command:"toolnet",commandExists:o,configPaths:$o({home:t})}),Xo({agent:"kilo",commands:["kilo","kilo-code"],commandExists:o,configPaths:Lo({home:t,kiloHome:e.kiloHome})}),O({agent:"codex",command:"codex",commandExists:o,configPaths:[r]})]}import{existsSync as Fs,mkdirSync as sr,readFileSync as $s,renameSync as Ds,writeFileSync as Ls}from"node:fs";import{dirname as Ks,join as Fe}from"node:path";import{existsSync as ks,mkdirSync as bs,readFileSync as js,renameSync as vs,rmSync as Ss,writeFileSync as Is}from"node:fs";import{dirname as ws,join as Cs}from"node:path";function xs(e){return`'${e.replace(/'/g,"'\\''")}'`}function Rs(e){if(!ks(e))return{};let t;try{t=JSON.parse(js(e,"utf8"))}catch{throw new Error(`Invalid existing Agy hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Agy hooks.json at ${e}: root must be a JSON object.`);return t}function Os(e,t){bs(ws(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Is(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),vs(o,e)}finally{Ss(o,{force:!0})}}function tr(e={}){let t=e.pluginName??"toolnet-memory",o=e.hooksFile??Cs(we(t),"hooks.json"),r=Rs(o),n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",i=`${xs(n)} session:agy-hook`;return r["toolnet-memory"]={enabled:!0,PreToolUse:[{matcher:"view_file|list_dir|find_by_name|grep_search|run_command",hooks:[{type:"command",command:`${i} pre-tool`,timeout:5}]}],PreInvocation:[{type:"command",command:`${i} pre`,timeout:15}],PostInvocation:[{type:"command",command:`${i} post`,timeout:15}],Stop:[{type:"command",command:`${i} stop`,timeout:30}]},Os(o,r),o}import{existsSync as Es,mkdirSync as Ps,readFileSync as Ts,renameSync as _s,writeFileSync as As}from"node:fs";import{dirname as Ms}from"node:path";function oe(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Ns(e,t){Ps(Ms(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;As(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),_s(o,e)}function or(e){if(!Es(e))return{};let t=Ts(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Agy MCP config at ${e}: parse error. Not overwriting.`)}if(!oe(o))throw new Error(`Invalid existing Agy MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function rr(e,t){return oe(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function Ne(e,t,o,r){let n=or(e),i=n.mcpServers;if(i!==void 0&&!oe(i))throw new Error(`Invalid existing Agy MCP config: mcpServers must be an object in ${e}.`);let s=oe(i)?{...i}:{},c=s[o];if(rr(c,t)&&!r)return{installed:!0,changed:!1};s[o]={command:t,args:["mcp"]};let a={...n,mcpServers:s};Ns(e,a);let u=or(e).mcpServers;if(!oe(u)||!rr(u[o],t))throw new Error(`Agy MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function nr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...Ne(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(r==="both"){let s=Se(),c=Ie({cwd:e.cwd}),a=Ne(s,t,o,e.force??!1),l=Ne(c,t,o,e.force??!1);return{installed:!0,changed:a.changed||l.changed,configFile:s,serverName:o,command:t,args:["mcp"]}}let n=r==="workspace"?Ie({cwd:e.cwd}):Se();return{...Ne(n,t,o,e.force??!1),configFile:n,serverName:o,command:t,args:["mcp"]}}var Hs=`# ToolNet Memory Continuity

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
`;function Vs(e,t){sr(Ks(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;Ls(o,t,{encoding:"utf8",mode:384}),Ds(o,e)}function ir(e,t){Fs(e)&&$s(e,"utf8")===t||Vs(e,t)}function cr(e={}){let t=e.pluginName??"toolnet-memory",o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.pluginRoot??we(t),n=Fe(r,"plugin.json"),i=Fe(r,"mcp_config.json"),s=Fe(r,"hooks.json"),c=Fe(r,"rules","toolnet-memory-continuity.md");return sr(r,{recursive:!0,mode:448}),ir(n,`${JSON.stringify({$schema:"https://antigravity.google/schemas/v1/plugin.json",name:t,description:"Persistent project continuity and memory for Antigravity coding sessions."},null,2)}
`),nr({configFile:i,binary:o,serverName:"toolnet-memory",force:e.force}),tr({hooksFile:s,binary:o,pluginName:t}),ir(c,`${Hs.trim()}
`),{installed:!0,pluginRoot:r,files:[n,i,s,c]}}import{existsSync as Gs,mkdirSync as dr,readFileSync as Us,writeFileSync as pr}from"node:fs";import{join as lr}from"node:path";var Js="memory_agent_ask";function ar(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${Js}

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
`.trim()}var ur="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",bt="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function Bs(e={}){let t=Po();dr(K(),{recursive:!0});let o=`${ur}
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


${ar()}

${bt}`,r=Gs(t)?Us(t,"utf8"):"",n=r.indexOf(ur),i=r.indexOf(bt);return n>=0&&i>=n?r=r.slice(0,n)+o+r.slice(i+bt.length):(r=r.trimEnd(),r&&(r+=`

`),r+=o),pr(t,r.trimEnd()+`
`,{encoding:"utf8",mode:384}),t}function gr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[];o.push(Bs({cwd:e.cwd}));let r=e.scope??"global",n=[];if((r==="global"||r==="both")&&n.push(e.directory??Eo()),r==="project"||r==="both"){let i=e.cwd??process.cwd();n.push(lr(i,".opencode","plugins"))}for(let i of n){dr(i,{recursive:!0});let s=lr(i,"toolnet-memory.js"),c=`
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
`;pr(s,c.trimStart(),{encoding:"utf8",mode:384}),o.push(s)}return o}import{existsSync as yr,mkdirSync as Ys,readFileSync as zs,renameSync as qs,writeFileSync as Ws}from"node:fs";import{dirname as hr,join as Qs}from"node:path";function re(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Xs(e,t){Ys(hr(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;Ws(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),qs(o,e)}function mr(e){if(!yr(e))return{};let t=zs(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing OpenCode config at ${e}: parse error. Not overwriting.`)}if(!re(o))throw new Error(`Invalid existing OpenCode config at ${e}: root must be a JSON object. Not overwriting.`);return o}function fr(e,t){if(!re(e))return!1;let o=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(o)&&o.length===2&&o[0]===t&&o[1]==="mcp"}function $e(e,t,o,r){let n=Qs(hr(e),"opencode.jsonc"),i=yr(n)?n:void 0,s=mr(e),c=s.mcp;if(c!==void 0&&!re(c))throw new Error(`Invalid existing OpenCode config: mcp must be an object in ${e}.`);let a=re(c)?{...c}:{},l=a[o];if(fr(l,t)&&!r)return{installed:!0,changed:!1,preservedJsonc:i};a[o]={type:"local",command:[t,"mcp"],enabled:!0};let u={...s,mcp:a};Xs(e,u);let d=mr(e);if(!re(d.mcp)||!fr(d.mcp[o],t))throw new Error(`OpenCode MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0,preservedJsonc:i}}function kr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...$e(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:[t,"mcp"]};if(r==="both"){let s=nt(),c=it({cwd:e.cwd}),a=$e(s,t,o,e.force??!1),l=$e(c,t,o,e.force??!1);return{installed:!0,changed:a.changed||l.changed,configFile:s,serverName:o,command:[t,"mcp"],preservedJsonc:a.preservedJsonc??l.preservedJsonc}}let n=r==="project"?it({cwd:e.cwd}):nt();return{...$e(n,t,o,e.force??!1),configFile:n,serverName:o,command:[t,"mcp"]}}import{existsSync as Zs,mkdirSync as br,readFileSync as ec,writeFileSync as jr}from"node:fs";import{homedir as vr}from"node:os";import{dirname as Sr,join as jt}from"node:path";function tc(e){let t=[],o=/"((?:\\.|[^"\\])*)"|'([^']*)'/g,r;for(;r=o.exec(e);){let n=r[1]??r[2]??"";try{t.push(r[1]!==void 0?JSON.parse(`"${n}"`):n)}catch{t.push(n)}}return t}function Ir(e={}){let t=e.configFile??jt(process.env.CODEX_HOME??jt(vr(),".codex"),"config.toml"),o=e.previousFile??jt(vr(),".config","toolnet-memory","codex-notify-previous.json");br(Sr(t),{recursive:!0}),br(Sr(o),{recursive:!0});let r=Zs(t)?ec(t,"utf8"):"",n=e.binary??"toolnet-memory",i=`notify = [${JSON.stringify(n)}, "session:codex-notify"]`,s=r.split(`
`),c=s.findIndex(p=>/^\s*\[/.test(p));c<0&&(c=s.length);let a=-1,l=-1;for(let p=0;p<c;p+=1)if(/^\s*notify\s*=/.test(s[p])){if(a=p,l=p,s[p].includes("[")&&!s[p].includes("]"))for(;l+1<c&&(l+=1,!s[l].includes("]")););break}let u=[];if(a>=0){let p=s.slice(a,l+1).join(`
`);u=tc(p),s.splice(a,l-a+1,i)}else c=s.findIndex(p=>/^\s*\[/.test(p)),c<0&&(c=s.length),s.splice(c,0,i);let d=u.length>=2&&u[u.length-1]==="session:codex-notify";return u.length>0&&!d&&jr(o,JSON.stringify(u,null,2)+`
`,{encoding:"utf8",mode:384}),r=s.join(`
`),r.endsWith(`
`)||(r+=`
`),jr(t,r,{encoding:"utf8",mode:384}),{configFile:t,previousFile:o,preservedPrevious:u.length>0&&!d}}import{existsSync as oc,mkdirSync as rc,readFileSync as nc,writeFileSync as ic}from"node:fs";import{homedir as sc}from"node:os";import{dirname as cc,join as wr}from"node:path";function ac(e){return`'${e.replace(/'/g,"'\\''")}'`}function Cr(e={}){let t=e.hooksFile??wr(process.env.CODEX_HOME??wr(sc(),".codex"),"hooks.json");rc(cc(t),{recursive:!0});let o={};if(oc(t))try{o=JSON.parse(nc(t,"utf8"))}catch(c){throw new Error(`Invalid existing Codex hooks.json: ${c instanceof Error?c.message:String(c)}`)}let r=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=r;let i=(Array.isArray(r.SessionStart)?r.SessionStart:[]).filter(c=>{try{return!JSON.stringify(c).includes("session:codex-context")}catch{return!0}}),s=e.binary??"toolnet-memory";return i.push({matcher:"startup|resume|clear|compact",hooks:[{type:"command",command:`${ac(s)} session:codex-context`,timeout:15,additionalContextLimit:1e3,statusMessage:"Loading ToolNet project continuity"}]}),r.SessionStart=i,ic(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),t}import{spawnSync as lc}from"node:child_process";function vt(e,t){return lc(e,t,{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}function xr(e,t){let o=vt(e,["mcp","get",t,"--json"]);if(o.status!==0||!o.stdout)return null;try{return JSON.parse(o.stdout)}catch{return null}}function Rr(e,t){return e.enabled!==!1&&e.transport?.type==="stdio"&&e.transport?.command===t&&Array.isArray(e.transport?.args)&&e.transport?.args.length===1&&e.transport.args[0]==="mcp"}function Or(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.codexBinary??"codex",r=e.serverName??"toolnet-memory",n=xr(o,r);if(n&&Rr(n,t))return{installed:!0,changed:!1,serverName:r,command:t,args:["mcp"]};if(n){let c=vt(o,["mcp","remove",r]);if(c.status!==0)return{installed:!1,changed:!1,serverName:r,command:t,args:["mcp"],error:(c.stderr||c.stdout||"Unable to remove old ToolNet MCP configuration.").trim()}}let i=vt(o,["mcp","add",r,"--",t,"mcp"]);if(i.status!==0)return{installed:!1,changed:!1,serverName:r,command:t,args:["mcp"],error:(i.stderr||i.stdout||"Unable to register ToolNet MCP.").trim()};let s=xr(o,r);return!s||!Rr(s,t)?{installed:!1,changed:!0,serverName:r,command:t,args:["mcp"],error:"Codex accepted MCP registration but verification did not match expected ToolNet command."}:{installed:!0,changed:!0,serverName:r,command:t,args:["mcp"]}}import{existsSync as uc,mkdirSync as dc,readFileSync as pc,renameSync as gc,rmSync as mc,writeFileSync as fc}from"node:fs";import{dirname as yc}from"node:path";function ne(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function hc(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function kc(e){if(!uc(e))return{};let t;try{t=JSON.parse(pc(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude settings.json: ${o instanceof Error?o.message:String(o)}`)}if(!ne(t))throw new Error("Invalid existing Claude settings.json: root must be a JSON object.");return t}function De(e){if(e===void 0)return[];if(!Array.isArray(e))throw new Error("Invalid existing Claude settings.json: hook event must be an array.");let t=[];for(let o of e){if(!ne(o)){t.push(o);continue}let r=o.hooks;if(!Array.isArray(r)){t.push(o);continue}let n=r.filter(i=>{if(!ne(i))return!0;let s=i.command;return!(typeof s=="string"&&s.includes("session:claude-hook"))});n.length!==0&&t.push({...o,hooks:n})}return t}function Le(e,t=10){return{type:"command",command:e,timeout:t}}function bc(e,t){dc(yc(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{fc(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),gc(o,e)}finally{mc(o,{force:!0})}}function Er(e={}){let t=e.settingsFile??_o(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=kc(t),n=r.hooks;if(n!==void 0&&!ne(n))throw new Error("Invalid existing Claude settings.json: hooks must be an object.");let i=ne(n)?{...n}:{},s=`${hc(o)} session:claude-hook`,c=De(i.SessionStart);c.push({matcher:"startup|resume|clear|compact",hooks:[Le(s)]}),i.SessionStart=c;let a=De(i.UserPromptSubmit);a.push({hooks:[Le(s)]}),i.UserPromptSubmit=a;let l=De(i.PostToolUse);l.push({matcher:"Edit|Write",hooks:[Le(s)]}),i.PostToolUse=l;let u=De(i.Stop);u.push({hooks:[Le(s,30)]}),i.Stop=u;let d={...r,hooks:i},p=JSON.stringify(r),y=JSON.stringify(d);return p===y?{settingsFile:t,changed:!1}:(bc(t,d),{settingsFile:t,changed:!0})}import{existsSync as jc,mkdirSync as vc,readFileSync as Sc,renameSync as Ic,rmSync as wc,writeFileSync as Cc}from"node:fs";import{dirname as xc}from"node:path";function ie(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Pr(e){if(!jc(e))return{};let t;try{t=JSON.parse(Sc(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude Code config: ${o instanceof Error?o.message:String(o)}`)}if(!ie(t))throw new Error("Invalid existing Claude Code config: root must be a JSON object.");return t}function Tr(e,t){if(!ie(e))return!1;let o=e.args;return e.type==="stdio"&&e.command===t&&Array.isArray(o)&&o.length===1&&o[0]==="mcp"}function Rc(e,t){vc(xc(e),{recursive:!0});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Cc(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Ic(o,e)}finally{wc(o,{force:!0})}}function _r(e={}){let t=e.stateFile??Ao(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=Pr(t),i=n.mcpServers;if(i!==void 0&&!ie(i))throw new Error("Invalid existing Claude Code config: mcpServers must be an object.");let s=ie(i)?{...i}:{},c=s[r];if(Tr(c,o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:[o,"mcp"],repaired:!1};let a=c!==void 0;s[r]={type:"stdio",command:o,args:["mcp"]},Rc(t,{...n,mcpServers:s});let u=Pr(t).mcpServers;if(!ie(u)||!Tr(u[r],o))throw new Error("Claude Code MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:[o,"mcp"],repaired:a}}function Ar(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=Er({binary:t,settingsFile:e.settingsFile}),r=_r({binary:t,stateFile:e.stateFile});return{hooks:o,mcp:r,files:[o.settingsFile,r.configFile]}}import{existsSync as Oc,mkdirSync as Ec,readFileSync as Pc,renameSync as Tc,rmSync as _c,writeFileSync as Ac}from"node:fs";import{dirname as Mc}from"node:path";var H="ToolNet Memory - ";function Fr(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Nc(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function Mr(e){if(!Oc(e))return{};let t=Pc(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro hooks file at ${e}: parse error. Not overwriting.`)}if(!Fr(o))throw new Error(`Invalid existing Kiro hooks file at ${e}: root must be a JSON object. Not overwriting.`);return o}function Nr(e){return Fr(e)?typeof e.name=="string"&&e.name.startsWith(H):!1}function se(e){return{type:"command",command:e}}function Fc(e){return[{name:`${H}Session Start`,description:"Inject compact local ToolNet continuity and capture Kiro session activation.",trigger:"SessionStart",action:se(e),timeout:10,enabled:!0},{name:`${H}Prompt Continuity`,description:"Capture prompts and refresh ToolNet guidance only for resume/continue requests.",trigger:"UserPromptSubmit",action:se(e),timeout:10,enabled:!0},{name:`${H}Raw History Guard`,description:"Prevent Kiro from reconstructing continuity from raw ToolNet/agent session history.",trigger:"PreToolUse",matcher:"*",action:se(e),timeout:10,enabled:!0},{name:`${H}Tool Capture`,description:"Capture durable tool activity while filtering noisy read-only events.",trigger:"PostToolUse",matcher:"*",action:se(e),timeout:15,enabled:!0},{name:`${H}Final Flush`,description:"Flush pending Kiro WAL events when the assistant finishes a turn.",trigger:"Stop",action:se(e),timeout:30,enabled:!0}]}function $c(e,t){Ec(Mc(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Ac(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Tc(o,e)}finally{_c(o,{force:!0})}}function Ke(e,t,o){let r=Mr(e);if(r.version!==void 0&&r.version!=="v1")throw new Error(`Unsupported existing Kiro hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!Array.isArray(n))throw new Error("Invalid existing Kiro hooks file: hooks must be an array.");let i=Array.isArray(n)?n.filter(l=>!Nr(l)):[],s=Fc(t),c={...r,version:"v1",hooks:[...i,...s]};if(!o&&JSON.stringify(r)===JSON.stringify(c))return{changed:!1,hookCount:s.length};$c(e,c);let a=Mr(e);if(a.version!=="v1"||!Array.isArray(a.hooks)||a.hooks.filter(Nr).length!==s.length)throw new Error("Kiro hooks were written but verification failed.");return{changed:!0,hookCount:s.length}}function $r(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=`${Nc(t)} session:kiro-hook`;if(e.hooksFile){let s=Ke(e.hooksFile,r,e.force??!1);return{hooksFile:e.hooksFile,...s}}if(o==="both"){let s=ut(),c=dt({cwd:e.cwd}),a=Ke(s,r,e.force??!1),l=Ke(c,r,e.force??!1);return{hooksFile:s,changed:a.changed||l.changed,hookCount:a.hookCount}}let n=o==="project"?dt({cwd:e.cwd}):ut(),i=Ke(n,r,e.force??!1);return{hooksFile:n,...i}}import{existsSync as Dc,mkdirSync as Lc,readFileSync as Kc,renameSync as Hc,rmSync as Vc,writeFileSync as Jc}from"node:fs";import{dirname as Gc}from"node:path";function ce(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Dr(e){if(!Dc(e))return{};let t=Kc(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro MCP config at ${e}: parse error. Not overwriting.`)}if(!ce(o))throw new Error(`Invalid existing Kiro MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Lr(e,t){return ce(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&e.disabled===!1:!1}function Uc(e,t){Lc(Gc(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Jc(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Hc(o,e)}finally{Vc(o,{force:!0})}}function He(e,t,o,r){let n=Dr(e),i=n.mcpServers;if(i!==void 0&&!ce(i))throw new Error(`Invalid existing Kiro MCP config: mcpServers must be an object in ${e}.`);let s=ce(i)?{...i}:{},c=s[o];if(Lr(c,t)&&!r)return{installed:!0,changed:!1};s[o]={command:t,args:["mcp"],disabled:!1};let a={...n,mcpServers:s};Uc(e,a);let u=Dr(e).mcpServers;if(!ce(u)||!Lr(u[o],t))throw new Error(`Kiro MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function Kr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...He(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(r==="both"){let s=Ce(),c=lt({cwd:e.cwd}),a=He(s,t,o,e.force??!1),l=He(c,t,o,e.force??!1);return{installed:!0,changed:a.changed||l.changed,configFile:s,serverName:o,command:t,args:["mcp"]}}let n=r==="project"?lt({cwd:e.cwd}):Ce();return{...He(n,t,o,e.force??!1),configFile:n,serverName:o,command:t,args:["mcp"]}}function Hr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=Kr({binary:t,configFile:e.configFile,scope:e.scope,cwd:e.cwd,force:e.force}),r=$r({binary:t,hooksFile:e.hooksFile,scope:e.scope,cwd:e.cwd,force:e.force});return{installed:o.installed,changed:o.changed||r.changed,mcp:o,hooks:r,files:[o.configFile,r.hooksFile]}}import{existsSync as Bc,mkdirSync as Yc,readFileSync as zc,renameSync as qc,rmSync as Wc,writeFileSync as Qc}from"node:fs";import{dirname as Xc}from"node:path";function St(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Zc(e){if(!Bc(e))return{};let t=zc(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: parse error. Not overwriting.`)}if(!St(o))throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function ea(e,t){Yc(Xc(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Qc(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),qc(o,e)}finally{Wc(o,{force:!0})}}function Vr(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??Fo({cwd:e.cwd}),r=Zc(o),n="toolnet-memory";if(St(r.mcpServers)&&r.mcpServers[n]!=null&&!e.force)return{installed:!0,changed:!1,configFile:o};let s=St(r.mcpServers)?{...r.mcpServers}:{};return s[n]={command:t,args:["mcp"]},r.mcpServers=s,ea(o,r),{installed:!0,changed:!0,configFile:o}}function Jr(e={}){let t=e.binary??"toolnet-memory",o=Vr({binary:t,configFile:e.configFile,force:e.force,cwd:e.cwd});return{installed:o.installed,changed:o.changed,mcp:{...o,configured:o.installed},files:[o.configFile]}}import{mkdirSync as aa,existsSync as la}from"node:fs";import{dirname as ua}from"node:path";import{existsSync as ta,mkdirSync as oa,readFileSync as ra,renameSync as na,rmSync as ia,writeFileSync as sa}from"node:fs";import{dirname as ca}from"node:path";function k(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function E(e,t){if(!ta(e))return{};let o=ra(e,"utf8").trim();if(!o)return{};let r;try{r=JSON.parse(o)}catch(n){throw new Error(`Invalid existing ${t} MCP config: ${n instanceof Error?n.message:String(n)}`)}if(!k(r))throw new Error(`Invalid existing ${t} MCP config: root must be a JSON object.`);return r}function V(e,t){oa(ca(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{sa(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),na(o,e)}finally{ia(o,{force:!0})}}function Gr(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??mt(),r=ua(o);la(r)||aa(r,{recursive:!0});let n=E(o,"Kilo"),i=n.mcp;if(i!==void 0&&!k(i))throw new Error("Invalid existing Kilo config: mcp must be an object.");let s=k(i)?{...i}:{},c="toolnet-memory";return k(s[c])&&!e.force?{installed:!0,changed:!1,configFile:o,configured:!0}:(s[c]={type:"local",command:[t,"mcp"],enabled:!0,timeout:1e4},V(o,{...n,mcp:s}),{installed:!0,changed:!0,configFile:o,configured:!0})}function Ur(e={}){let t=e.binary??"toolnet-memory",o=Gr({binary:t,configFile:e.configFile,force:e.force});return{installed:o.installed,changed:o.changed,mcp:o,files:[o.configFile]}}import{existsSync as da,mkdirSync as pa,readFileSync as ga,renameSync as ma,rmSync as fa,writeFileSync as ya}from"node:fs";import{dirname as ha}from"node:path";function f(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function C(e,t){if(!da(e))return{};let o=ga(e,"utf8").trim();if(!o)return{};let r;try{r=JSON.parse(o)}catch(n){throw new Error(`Invalid existing ${t} hooks file: ${n instanceof Error?n.message:String(n)}`)}if(!f(r))throw new Error(`Invalid existing ${t} hooks file: root must be a JSON object.`);return r}function J(e,t){pa(ha(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{ya(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),ma(o,e)}finally{fa(o,{force:!0})}}function It(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}var ae=[["sessionStart",10],["beforeSubmitPrompt",10],["preToolUse",10],["postToolUse",15],["afterAgentResponse",15],["stop",30]];function Br(e){return f(e)&&typeof e.command=="string"&&e.command.includes("session:cursor-hook")}function ka(e,t,o){let n={type:"command",command:`TOOLNET_HOOK_EVENT=${It(e)} ${It(t)} session:cursor-hook`,timeout:o};return e==="preToolUse"&&(n.matcher=".*"),n}function wt(e={}){let t=e.hooksFile??Oe(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=C(t,"Cursor");if(r.version!==void 0&&r.version!==1)throw new Error(`Unsupported existing Cursor hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!f(n))throw new Error("Invalid existing Cursor hooks file: hooks must be an object.");let i=f(n)?{...n}:{};for(let[l,u]of ae){let d=i[l];if(d!==void 0&&!Array.isArray(d))throw new Error(`Invalid existing Cursor hooks file: hooks.${l} must be an array.`);let p=Array.isArray(d)?d.filter(y=>!Br(y)):[];i[l]=[...p,ka(l,o,u)]}let s={...r,version:1,hooks:i};if(JSON.stringify(r)===JSON.stringify(s))return{hooksFile:t,changed:!1,hookCount:ae.length};J(t,s);let c=C(t,"Cursor");if(c.version!==1||!f(c.hooks))throw new Error("Cursor hooks were written but verification failed.");let a=0;for(let[l]of ae){let u=c.hooks[l];if(!Array.isArray(u))throw new Error("Cursor hooks were written but verification failed.");a+=u.filter(Br).length}if(a!==ae.length)throw new Error("Cursor hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:ae.length}}function Yr(e,t){return k(e)?(e.type===void 0||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function Ct(e={}){let t=e.configFile??Re(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=E(t,"Cursor"),i=n.mcpServers;if(i!==void 0&&!k(i))throw new Error("Invalid existing Cursor MCP config: mcpServers must be an object.");let s=k(i)?{...i}:{};if(Yr(s[r],o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};s[r]={type:"stdio",command:o,args:["mcp"]},V(t,{...n,mcpServers:s});let a=E(t,"Cursor").mcpServers;if(!k(a)||!Yr(a[r],o))throw new Error("Cursor MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}import{mkdirSync as ba,readFileSync as zr,renameSync as ja,rmSync as va,writeFileSync as Sa}from"node:fs";import{dirname as Ia}from"node:path";var xt=`---
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
`;function wa(e,t){ba(Ia(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Sa(o,t,{encoding:"utf8",mode:384}),ja(o,e)}finally{va(o,{force:!0})}}function qr(e){let t=e.ruleFile??Vo(e.projectRoot);try{if(zr(t,"utf8")===xt)return{ruleFile:t,changed:!1}}catch{}if(wa(t,xt),zr(t,"utf8")!==xt)throw new Error("Cursor ToolNet project rule was written but verification failed.");return{ruleFile:t,changed:!0}}import{spawnSync as Ca}from"node:child_process";import{existsSync as G,statSync as xa}from"node:fs";import{dirname as Ra,join as Oa,parse as Ea,resolve as Ot}from"node:path";function Wr(e){let t=Ot(e);if(!G(t))throw new Error(`Project path does not exist: ${t}`);if(!xa(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);return t}function Ve(e){return Oa(e,".toolnet","project.json")}function Pa(e){let t=Ot(e),o=Ea(t).root;for(;;){if(G(Ve(t)))return t;if(t===o)return;let r=Ra(t);if(r===t)return;t=r}}function Rt(e){let t=Ca("git",["rev-parse","--show-toplevel"],{cwd:e,encoding:"utf8",timeout:5e3});if(t.status!==0)return;let o=t.stdout.trim();return o?Ot(o):void 0}function x(e={}){let t=Wr(e.cwd??process.cwd());if(e.project){let n=Wr(e.project),i=Ve(n),s=Rt(n);return{root:n,source:"explicit",eligible:!0,toolnetProject:G(i),manifestFile:G(i)?i:void 0,gitRoot:s}}let o=Pa(t);if(o){let n=Ve(o);return{root:o,source:"toolnet",eligible:!0,toolnetProject:!0,manifestFile:n,gitRoot:Rt(o)}}let r=Rt(t);if(r){let n=Ve(r);return{root:r,source:"git",eligible:!0,toolnetProject:G(n),manifestFile:G(n)?n:void 0,gitRoot:r}}return{root:t,source:"cwd",eligible:!1,toolnetProject:!1}}function en(e,t={}){let o=[],r=e.indexOf("--scope");if(r>=0){let i=e[r+1];if(i!=="global"&&i!=="project"&&i!=="both")throw new Error(`Invalid --scope value: ${String(i)}`);o.push(i)}e.includes("--global")&&o.push("global"),e.includes("--both")&&o.push("both");let n=Array.from(new Set(o));if(n.length>1)throw new Error(`Conflicting integration scopes: ${n.join(", ")}`);return n[0]??t.defaultScope??"global"}function Qr(e,t){return{install:e,effective:t}}function R(e,t){return{surface:e,global:Qr(t.globalInstall,t.effective==="global"||t.effective==="both"),project:Qr(t.projectInstall,t.effective==="project"||t.effective==="both"),effective:t.effective,risk:t.risk??"none",dedupeRequired:t.dedupeRequired??!1,trustRequired:t.trustRequired??t.projectInstall,note:t.note}}function Ta(e){return{mcp:R("mcp",{globalInstall:!0,projectInstall:!1,effective:"global"}),hooks:R("hooks",{globalInstall:!0,projectInstall:!1,effective:"global"}),work:R("work",{globalInstall:e==="grok",projectInstall:!1,effective:e==="grok"?"global":"none",note:e==="grok"?"Grok supports a global ToolNet continuity skill.":"Cursor/Copilot work instructions remain project-scoped."})}}function Xr(e){return{mcp:R("mcp",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),hooks:R("hooks",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),work:R("work",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!1,note:e==="cursor"?"Use .cursor/rules/toolnet-memory.mdc.":e==="copilot"?"Use .github/instructions/toolnet-memory.instructions.md.":"Use .grok/skills/toolnet-continuity/SKILL.md."})}}function Zr(e){return{mcp:R("mcp",{globalInstall:!0,projectInstall:!0,effective:"project",risk:e==="cursor"?"precedence-unverified":"shadowed-global",trustRequired:!0,note:e==="cursor"?"Project ToolNet MCP is the intended effective definition; native same-name precedence must be E2E certified before release.":"Global remains useful outside the project; same-name project definition wins inside the project."}),hooks:R("hooks",{globalInstall:!0,projectInstall:!0,effective:"both",risk:"additive-duplicate",dedupeRequired:!0,trustRequired:!0,note:"Global and project hook sources can both execute for the same native event."}),work:R("work",{globalInstall:e==="grok",projectInstall:!0,effective:"project",risk:e==="grok"?"shadowed-global":"none",trustRequired:!1,note:e==="cursor"?"Project rule is authoritative.":e==="copilot"?"Project instruction is authoritative.":"Project skill shadows the same-name global skill inside the project."})}}function U(e){let{agent:t,scope:o,project:r}=e;return(o==="project"||o==="both")&&(!r||!r.eligible)?{agent:t,requestedScope:o,project:r,surfaces:o==="both"?Zr(t):Xr(t),canInstall:!1,reason:"Project scope requires an explicit project, existing ToolNet project, or Git repository root."}:{agent:t,requestedScope:o,project:r,surfaces:o==="global"?Ta(t):o==="project"?Xr(t):Zr(t),canInstall:!0}}function tn(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.rule?.changed)}function on(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:x({project:e.projectRoot}),n=U({agent:"cursor",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Cursor project integration scope cannot be resolved.");let i,s;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(i={},n.surfaces.mcp.global.install&&(i.mcp=Ct({binary:t,configFile:e.configFile??Re()})),n.surfaces.hooks.global.install&&(i.hooks=wt({binary:t,hooksFile:e.hooksFile??Oe()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Cursor project integration requires an eligible project root.");s={},n.surfaces.mcp.project.install&&(s.mcp=Ct({binary:t,configFile:e.projectConfigFile??Ko(r.root)})),n.surfaces.hooks.project.install&&(s.hooks=wt({binary:t,hooksFile:e.projectHooksFile??Ho(r.root)})),n.surfaces.work.project.install&&(s.rule=qr({projectRoot:r.root,ruleFile:e.projectRuleFile}))}let c=s?.mcp??i?.mcp,a=s?.hooks??i?.hooks;if(!c||!a)throw new Error("Cursor integration did not produce an effective MCP/hooks installation.");let l=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.rule?.ruleFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.rule?.ruleFile].filter(u=>typeof u=="string")));return{installed:!0,changed:tn(i)||tn(s),scope:o,plan:n,project:r,global:i,projectScope:s,mcp:c,hooks:a,rule:s?.rule,files:l}}var le=[["sessionStart",10],["userPromptSubmitted",10],["userPromptTransformed",10],["preToolUse",10],["postToolUse",15],["agentStop",30]];function _a(e){if(typeof e.command=="string")return e.command;if(typeof e.bash=="string")return e.bash}function rn(e){return f(e)&&_a(e)?.includes("session:copilot-hook")===!0}function Aa(e,t,o){let r={type:"command",command:`${t} session:copilot-hook`,env:{TOOLNET_HOOK_EVENT:e},timeoutSec:o};return e==="preToolUse"&&(r.matcher=".*"),r}function Et(e={}){let t=e.hooksFile??Pe(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=C(t,"GitHub Copilot CLI");if(r.version!==void 0&&r.version!==1)throw new Error(`Unsupported existing GitHub Copilot CLI hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!f(n))throw new Error("Invalid existing GitHub Copilot CLI hooks file: hooks must be an object.");let i=f(n)?{...n}:{};for(let[l,u]of le){let d=i[l];if(d!==void 0&&!Array.isArray(d))throw new Error(`Invalid existing GitHub Copilot CLI hooks file: hooks.${l} must be an array.`);let p=Array.isArray(d)?d.filter(y=>!rn(y)):[];i[l]=[...p,Aa(l,o,u)]}let s={...r,version:1,hooks:i};if(JSON.stringify(r)===JSON.stringify(s))return{hooksFile:t,changed:!1,hookCount:le.length};J(t,s);let c=C(t,"GitHub Copilot CLI");if(c.version!==1||!f(c.hooks))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");let a=0;for(let[l]of le){let u=c.hooks[l];if(!Array.isArray(u))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");a+=u.filter(rn).length}if(a!==le.length)throw new Error("GitHub Copilot CLI hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:le.length}}function nn(e,t){return k(e)?(e.type===void 0||e.type==="local"||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&Array.isArray(e.tools)&&e.tools.length===1&&e.tools[0]==="*":!1}function Pt(e={}){let t=e.configFile??Ee(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=E(t,"GitHub Copilot CLI"),i=n.mcpServers;if(i!==void 0&&!k(i))throw new Error("Invalid existing GitHub Copilot CLI MCP config: mcpServers must be an object.");let s=k(i)?{...i}:{};if(nn(s[r],o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};s[r]={type:"stdio",command:o,args:["mcp"],tools:["*"]},V(t,{...n,mcpServers:s});let a=E(t,"GitHub Copilot CLI").mcpServers;if(!k(a)||!nn(a[r],o))throw new Error("GitHub Copilot CLI MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}import{mkdirSync as Ma,readFileSync as sn,renameSync as Na,rmSync as Fa,writeFileSync as $a}from"node:fs";import{dirname as Da}from"node:path";var Tt=`---
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
`;function La(e,t){Ma(Da(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{$a(o,t,{encoding:"utf8",mode:384}),Na(o,e)}finally{Fa(o,{force:!0})}}function cn(e){let t=e.instructionFile??Bo(e.projectRoot);try{if(sn(t,"utf8")===Tt)return{instructionFile:t,changed:!1}}catch{}if(La(t,Tt),sn(t,"utf8")!==Tt)throw new Error("Copilot ToolNet project instruction verification failed.");return{instructionFile:t,changed:!0}}function an(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.instruction?.changed)}function ln(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:x({project:e.projectRoot}),n=U({agent:"copilot",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Copilot project integration scope cannot be resolved.");let i,s;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(i={},n.surfaces.mcp.global.install&&(i.mcp=Pt({binary:t,configFile:e.configFile??Ee()})),n.surfaces.hooks.global.install&&(i.hooks=Et({binary:t,hooksFile:e.hooksFile??Pe()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Copilot project integration requires an eligible project root.");s={},n.surfaces.mcp.project.install&&(s.mcp=Pt({binary:t,configFile:e.projectConfigFile??Go(r.root)})),n.surfaces.hooks.project.install&&(s.hooks=Et({binary:t,hooksFile:e.projectHooksFile??Uo(r.root)})),n.surfaces.work.project.install&&(s.instruction=cn({projectRoot:r.root,instructionFile:e.projectInstructionFile}))}let c=s?.mcp??i?.mcp,a=s?.hooks??i?.hooks;if(!c||!a)throw new Error("Copilot integration did not produce effective MCP/hooks.");let l=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.instruction?.instructionFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.instruction?.instructionFile].filter(u=>typeof u=="string")));return{installed:!0,changed:an(i)||an(s),scope:o,plan:n,project:r,global:i,projectScope:s,mcp:c,hooks:a,instruction:s?.instruction,files:l}}import{existsSync as Ka,mkdirSync as Ha,readFileSync as un,renameSync as Va,rmSync as Ja,writeFileSync as Ga}from"node:fs";import{dirname as Ua}from"node:path";var _t=`---
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
`;function Ba(e,t){Ha(Ua(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Ga(o,t,{encoding:"utf8",mode:384}),Va(o,e)}finally{Ja(o,{force:!0})}}function At(e={}){let t=e.skillFile??Me();if(Ka(t)&&un(t,"utf8")===_t)return{skillFile:t,changed:!1};if(Ba(t,_t),un(t,"utf8")!==_t)throw new Error("Grok ToolNet continuity skill was written but verification failed.");return{skillFile:t,changed:!0}}var ue=[["SessionStart",10],["UserPromptSubmit",10],["PreToolUse",10],["PostToolUse",15],["Stop",30]];function dn(e){return!f(e)||!Array.isArray(e.hooks)?!1:e.hooks.some(t=>f(t)&&typeof t.command=="string"&&t.command.includes("session:grok-hook"))}function Ya(e,t,o){let r={hooks:[{type:"command",command:`${t} session:grok-hook`,timeout:o,env:{TOOLNET_HOOK_EVENT:e}}]};return e==="PreToolUse"&&(r.matcher=".*"),r}function Mt(e={}){let t=e.hooksFile??Ae(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=C(t,"Grok Build"),n=r.hooks;if(n!==void 0&&!f(n))throw new Error("Invalid existing Grok Build hooks file: hooks must be an object.");let i=f(n)?{...n}:{};for(let[l,u]of ue){let d=i[l];if(d!==void 0&&!Array.isArray(d))throw new Error(`Invalid existing Grok Build hooks file: hooks.${l} must be an array.`);let p=Array.isArray(d)?d.filter(y=>!dn(y)):[];i[l]=[...p,Ya(l,o,u)]}let s={...r,hooks:i};if(JSON.stringify(r)===JSON.stringify(s))return{hooksFile:t,changed:!1,hookCount:ue.length};J(t,s);let c=C(t,"Grok Build");if(!f(c.hooks))throw new Error("Grok Build hooks were written but verification failed.");let a=0;for(let[l]of ue){let u=c.hooks[l];if(!Array.isArray(u))throw new Error("Grok Build hooks were written but verification failed.");a+=u.filter(dn).length}if(a!==ue.length)throw new Error("Grok Build hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:ue.length}}import{existsSync as za,mkdirSync as qa,readFileSync as Wa,renameSync as Qa,rmSync as Xa,writeFileSync as Za}from"node:fs";import{dirname as el}from"node:path";function pn(e){return za(e)?Wa(e,"utf8"):""}function tl(e,t){qa(el(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Za(o,t,{encoding:"utf8",mode:384}),Qa(o,e)}finally{Xa(o,{force:!0})}}function Nt(e){return e.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t")}function ol(e){return`[mcp_servers."${Nt(e)}"]`}function rl(e,t){return[ol(e),`command = "${Nt(t)}"`,'args = ["mcp"]',"enabled = true"].join(`
`)}function nl(e){let t=e.trim();return t.startsWith("[")&&t.includes("]")}function Je(e){return e.trim().replace(/\s+/g,"")}function il(e){return new Set([Je(`[mcp_servers.${e}]`),Je(`[mcp_servers."${e}"]`),Je(`[mcp_servers.'${e}']`)])}function mn(e,t){let o=e.split(/\r?\n/),r=il(t),n=-1;for(let u=0;u<o.length;u+=1){let d=Je(o[u].replace(/\s+#.*$/,""));if(r.has(d)){n=u;break}}if(n<0)return null;let i=o.length;for(let u=n+1;u<o.length;u+=1)if(nl(o[u])){i=u;break}let s=[],c=0;for(let u of o)s.push(c),c+=u.length+1;let a=s[n]??0,l=i>=o.length?e.length:s[i]??e.length;return{start:a,end:l}}function sl(e,t,o){let r=`${rl(t,o)}
`,n=mn(e,t);if(n){let i=e.slice(0,n.start),s=e.slice(n.end);return`${i}${r}${s.replace(/^\n+/,"")}`}return e.trim()?`${e.replace(/\s*$/,"")}

${r}`:r}function gn(e,t,o){let r=mn(e,t);if(!r)return!1;let n=e.slice(r.start,r.end);return n.includes(`command = "${Nt(o)}"`)&&/args\s*=\s*\[\s*"mcp"\s*\]/.test(n)&&/enabled\s*=\s*true/.test(n)}function Ft(e={}){let t=e.configFile??_e(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=pn(t);if(gn(n,r,o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};let i=sl(n,r,o);tl(t,i);let s=pn(t);if(!gn(s,r,o))throw new Error("Grok Build MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}function fn(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.skill?.changed)}function yn(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:x({project:e.projectRoot}),n=U({agent:"grok",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Grok project integration scope cannot be resolved.");let i,s;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(i={},n.surfaces.mcp.global.install&&(i.mcp=Ft({binary:t,configFile:e.configFile??_e()})),n.surfaces.hooks.global.install&&(i.hooks=Mt({binary:t,hooksFile:e.hooksFile??Ae()})),n.surfaces.work.global.install&&(i.skill=At({skillFile:e.skillFile??Me()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Grok project integration requires an eligible project root.");s={},n.surfaces.mcp.project.install&&(s.mcp=Ft({binary:t,configFile:e.projectConfigFile??zo(r.root)})),n.surfaces.hooks.project.install&&(s.hooks=Mt({binary:t,hooksFile:e.projectHooksFile??qo(r.root)})),n.surfaces.work.project.install&&(s.skill=At({skillFile:e.projectSkillFile??Wo(r.root)}))}let c=s?.mcp??i?.mcp,a=s?.hooks??i?.hooks,l=s?.skill??i?.skill;if(!c||!a||!l)throw new Error("Grok integration did not produce effective MCP/hooks/skill.");let u=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.skill?.skillFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.skill?.skillFile].filter(d=>typeof d=="string")));return{installed:!0,changed:fn(i)||fn(s),scope:o,plan:n,project:r,global:i,projectScope:s,mcp:c,hooks:a,skill:l,files:u}}function hn(e={}){if(e.scope==="global")return{scope:"global",automatic:!1,reason:"explicit-global"};if(e.scope==="project"||e.scope==="both"){let o=x({cwd:e.cwd,project:e.projectRoot});if(!o.eligible)throw new Error(`Explicit ${e.scope} integration requires an explicit project, ToolNet project, or Git repository root.`);return{scope:e.scope,automatic:!1,project:o,reason:e.scope==="project"?"explicit-project":"explicit-both"}}let t=x({cwd:e.cwd,project:e.projectRoot});return t.toolnetProject?{scope:"both",automatic:!0,project:t,reason:"toolnet-project"}:{scope:"global",automatic:!0,reason:"no-toolnet-project"}}function kn(){return er()}function $t(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[],r=e.detections??kn(),n=new Map(r.map(s=>[s.agent,s.detected])),i=hn({scope:e.scope,projectRoot:e.projectRoot,cwd:e.cwd});if(!(e.force===!0||n.get("agy")===!0))o.push({agent:"agy",detected:!1,installed:!1,targets:[]});else try{let c=cr({binary:t});o.push({agent:"agy",detected:!0,installed:!0,targets:c.files})}catch(c){o.push({agent:"agy",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("opencode")===!0))o.push({agent:"opencode",detected:!1,installed:!1,targets:[]});else try{let c=gr({binary:t}),a=kr({binary:t});o.push({agent:"opencode",detected:!0,installed:!0,targets:[...c,a.configFile,`mcp:${a.serverName}`]})}catch(c){o.push({agent:"opencode",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("claude")===!0))o.push({agent:"claude",detected:!1,installed:!1,targets:[]});else try{let c=Ar({binary:t});o.push({agent:"claude",detected:!0,installed:!0,targets:[c.hooks.settingsFile,c.mcp.configFile,`mcp:${c.mcp.serverName}`]})}catch(c){o.push({agent:"claude",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("kiro")===!0))o.push({agent:"kiro",detected:!1,installed:!1,targets:[]});else try{let c=Hr({...e.kiro??{},binary:t});o.push({agent:"kiro",detected:!0,installed:!0,targets:[c.mcp.configFile,`mcp:${c.mcp.serverName}`,c.hooks.hooksFile]})}catch(c){o.push({agent:"kiro",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("cursor")===!0))o.push({agent:"cursor",detected:!1,installed:!1,targets:[]});else try{let c=e.cursor??{},a=on({...c,binary:t,scope:c.scope??i.scope,projectRoot:c.projectRoot??i.project?.root});o.push({agent:"cursor",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(c){o.push({agent:"cursor",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("copilot")===!0))o.push({agent:"copilot",detected:!1,installed:!1,targets:[]});else try{let c=e.copilot??{},a=ln({...c,binary:t,scope:c.scope??i.scope,projectRoot:c.projectRoot??i.project?.root});o.push({agent:"copilot",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(c){o.push({agent:"copilot",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("grok")===!0))o.push({agent:"grok",detected:!1,installed:!1,targets:[]});else try{let c=e.grok??{},a=yn({...c,binary:t,scope:c.scope??i.scope,projectRoot:c.projectRoot??i.project?.root});o.push({agent:"grok",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(c){o.push({agent:"grok",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("toolnet-cli")===!0))o.push({agent:"toolnet-cli",detected:!1,installed:!1,targets:[]});else try{let c=e.toolnetCli??{},a=Jr({...c,binary:t});o.push({agent:"toolnet-cli",detected:!0,installed:!0,targets:[a.mcp.configFile]})}catch(c){o.push({agent:"toolnet-cli",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("kilo")===!0))o.push({agent:"kilo",detected:!1,installed:!1,targets:[]});else try{let c=e.kilo??{},a=Ur({...c,binary:t});o.push({agent:"kilo",detected:!0,installed:!0,targets:[a.mcp.configFile]})}catch(c){o.push({agent:"kilo",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("codex")===!0))o.push({agent:"codex",detected:!1,installed:!1,targets:[]});else try{let c=Ir({binary:t}),a=Cr({binary:t}),l=Or({binary:t});if(!l.installed)throw new Error(l.error??"Codex MCP registration failed");let u=[c.configFile,a,`mcp:${l.serverName}`];c.preservedPrevious&&u.push(c.previousFile),o.push({agent:"codex",detected:!0,installed:!0,targets:u})}catch(c){o.push({agent:"codex",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}return o}function Ge(e){switch(e){case"agy":return"Agy / Antigravity";case"opencode":return"OpenCode";case"claude":return"Claude Code";case"kiro":return"Kiro CLI";case"cursor":return"Cursor CLI";case"copilot":return"GitHub Copilot CLI";case"grok":return"Grok Build";case"toolnet-cli":return"ToolNet CLI";case"kilo":return"Kilo";case"codex":return"Codex";default:return e}}function cl(e){console.log(""),console.log("ToolNet Memory Integration Detection"),console.log("===================================="),console.log("");for(let t of e){let o=Ge(t.agent);if(!t.detected){console.log(`\u25CB ${o}: not detected`);continue}console.log(`\u2713 ${o}: detected`);for(let r of t.evidence)console.log(`  ${r}`)}console.log("")}function al(e){console.log(""),console.log("ToolNet Memory AI Integrations"),console.log("=============================="),console.log("");for(let t of e){let o=Ge(t.agent);if(!t.detected){console.log(`- ${o}: not detected`);continue}if(t.installed){let r=t.scope?` [scope=${t.scope}]`:"";console.log(`\u2713 ${o}: automatic memory enabled${r}`),t.projectRoot&&console.log(`  project: ${t.projectRoot}`);continue}console.log(`\u2717 ${o}: integration failed`),t.error&&console.log(`  ${t.error}`)}console.log("")}function ll(e,t){let o=e.indexOf(t);return o>=0?e[o+1]:void 0}function ul(e){return e.includes("--scope")||e.includes("--global")||e.includes("--both")?en(e):void 0}async function dl(){let e=process.argv.slice(2),t=e.includes("--all"),o=e.includes("--json"),r=e.includes("--detect-only"),n=ul(e),i=ll(e,"--project");if(r){let c=kn();if(o){console.log(JSON.stringify(c,null,2));return}cl(c);return}let s=$t({force:t,scope:n,projectRoot:i});if(o){console.log(JSON.stringify(s,null,2));return}al(s)}var pl=process.argv[1]&&(process.argv[1].endsWith("auto-integrate.js")||process.argv[1].endsWith("auto-integrate.ts"));pl&&dl().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});function vn(e){let t=ml(e);if(!Dt(t))throw new Error(`Project path does not exist: ${t}`);if(!gl(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);return t}function Wf(e=process.cwd()){let t=vn(e),o=new $().detect(t),r=jn(o.rootPath,".toolnet","project.json");if(!Dt(r))throw new Error(`ToolNet project initialization failed: ${r} was not created`);return{initialized:!0,project:{id:o.id,name:o.name,remote:o.remote,rootPath:o.rootPath},manifestFile:r}}async function fl(e=process.cwd(),t={}){let o=vn(e),r={skipRemoteIdentity:t.skipRemoteIdentity,adoptRemote:t.adoptRemote,allowGitRebind:t.allowGitRebind},n=await Io(o,r),i=n.project,s=jn(i.rootPath,".toolnet","project.json");if(!Dt(s))throw new Error(`ToolNet project initialization failed: ${s} was not created`);return{initialized:!0,project:{id:i.id,name:i.name,remote:i.remote,rootPath:i.rootPath},manifestFile:s,identity:{source:n.source,registry:n.registry,registryProvider:n.registryProvider,gitRemote:n.gitIdentity?.canonicalRemote,fingerprint:n.gitIdentity?.fingerprint}}}function bn(e,t){let o=e.indexOf(t);if(o<0)return;let r=e[o+1];if(!(!r||r.startsWith("-")))return r}async function yl(){let e=process.argv.slice(2),t=e.includes("--json"),o=!e.includes("--no-integrate"),r=e.includes("--no-remote-identity"),n=e.includes("--rebind-git-identity"),i=bn(e,"--adopt-remote"),s=bn(e,"--project"),c=new Set(["--project","--adopt-remote"]),a=e.find((p,y)=>{if(p.startsWith("-"))return!1;let de=e[y-1];return!(de&&c.has(de))}),l=s??a??process.cwd(),u=await We("Resolving ToolNet project identity",()=>fl(l,{skipRemoteIdentity:r,adoptRemote:i,allowGitRebind:n}),{enabled:!t}),d=[];if(o&&(d=await We("Detecting coding agents",()=>$t({projectRoot:u.project.rootPath}),{enabled:!t})),t){console.log(JSON.stringify({...u,integrations:d},null,2));return}if(console.log(""),console.log("ToolNet Memory"),console.log("=============="),console.log(""),console.log("\u2713 Project initialized"),console.log(""),console.log(`Project:  ${u.project.name}`),console.log(`ID:       ${u.project.id}`),console.log(`Remote:   ${u.project.remote??u.project.name}`),console.log(`Root:     ${u.project.rootPath}`),console.log(`Manifest: ${u.manifestFile}`),u.identity&&(console.log(`Identity: ${u.identity.source}`),console.log(`Registry: ${u.identity.registry}`),u.identity.gitRemote&&console.log(`Git:      ${u.identity.gitRemote}`)),console.log(""),o){console.log("AI integrations:");let p=d.filter(y=>y.detected&&y.installed);if(!p.length)console.log("  \u25CB No supported coding agent detected");else for(let y of p){let de=Ge(y.agent),Sn=Xt(y.agent);console.log(`  \u2713 ${de} \u2014 ${Sn}`)}console.log("")}console.log("Next: toolnet-memory doctor"),console.log("")}var hl=process.argv[1]?.endsWith("/init.js")||process.argv[1]?.endsWith("/init.ts");hl&&yl().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});export{Wf as initializeToolNetProject,fl as initializeToolNetProjectCrossMachine};
