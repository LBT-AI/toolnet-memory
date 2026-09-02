import{existsSync as Ct,statSync as Na}from"node:fs";import{resolve as Fa,join as qr}from"node:path";import{existsSync as Qr,readFileSync as en}from"node:fs";import{homedir as tn}from"node:os";import{join as on}from"node:path";function rn(e){let t=e.trim();return t.length>=2&&t.startsWith('"')&&t.endsWith('"')?(t=t.slice(1,-1),t.replace(/\\n/g,`
`).replace(/\\r/g,"\r").replace(/\\t/g,"	").replace(/\\"/g,'"').replace(/\\\\/g,"\\")):t.length>=2&&t.startsWith("'")&&t.endsWith("'")?t.slice(1,-1):t}function nn(){let e=process.env.TOOLNET_GLOBAL_ENV??on(tn(),".config","toolnet-memory",".env");if(!Qr(e))return;let t=en(e,"utf8");for(let o of t.split(/\r?\n/)){let r=o.trim();if(!r||r.startsWith("#"))continue;r.startsWith("export ")&&(r=r.slice(7));let n=r.indexOf("=");if(n<=0)continue;let i=r.slice(0,n).trim();/^[A-Za-z_][A-Za-z0-9_]*$/.test(i)&&process.env[i]===void 0&&(process.env[i]=rn(r.slice(n+1)))}}nn();function K(e,t){return e===void 0?t:["1","true","yes","on"].includes(e.toLowerCase())}function G(e,t){if(!e)return t;let o=Number(e);return Number.isFinite(o)?o:t}function _e(){return{memory:{autoCapture:K(process.env.MEMORY_AUTO_CAPTURE,!0),autoRetrieve:K(process.env.MEMORY_AUTO_RETRIEVE,!0),autoSummarize:K(process.env.MEMORY_AUTO_SUMMARIZE,!0),autoSync:K(process.env.MEMORY_AUTO_SYNC,!0)},retrieval:{maxCandidates:G(process.env.MEMORY_MAX_CANDIDATES,50),rerankTop:G(process.env.MEMORY_RERANK_TOP,10),finalContext:G(process.env.MEMORY_FINAL_CONTEXT,5),tokenBudget:G(process.env.MEMORY_TOKEN_BUDGET,2e3)},storage:{provider:process.env.MEMORY_STORAGE_PROVIDER??"huggingface",r2:{accountId:process.env.R2_ACCOUNT_ID,bucket:process.env.R2_BUCKET,accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY},s3:{endpoint:process.env.S3_ENDPOINT,region:process.env.S3_REGION,bucket:process.env.S3_BUCKET,accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY,forcePathStyle:K(process.env.S3_FORCE_PATH_STYLE,!1)},huggingface:{namespace:process.env.HF_NAMESPACE,bucket:process.env.HF_BUCKET,accessKeyId:process.env.HF_S3_ACCESS_KEY_ID,secretAccessKey:process.env.HF_S3_SECRET_ACCESS_KEY},localRoot:process.env.MEMORY_LOCAL_STORAGE_PATH},cache:{maxMb:G(process.env.MEMORY_LOCAL_CACHE_MB,200)}}}import{createHash as pn}from"node:crypto";import{existsSync as ae,mkdirSync as gn,readFileSync as fn,renameSync as mn,writeFileSync as yn}from"node:fs";import{basename as hn,dirname as le,join as U,parse as Mt,resolve as R}from"node:path";import{createHash as Pt}from"node:crypto";import{spawnSync as sn}from"node:child_process";var B="git-remote-v1",cn=new Set(["github.com","gitlab.com","bitbucket.org"]);function Et(e,t){let o=t.replaceAll("\\","/").replace(/^\/+/u,"").replace(/\/+$/u,"").replace(/\.git$/iu,"").replace(/\/+/gu,"/");return!o||o==="."||o===".."||o.split("/").some(r=>!r||r==="."||r==="..")?null:(cn.has(e)&&(o=o.toLowerCase()),o)}function an(e){let t;try{t=new URL(e)}catch{return null}if(!["https:","http:","ssh:","git:"].includes(t.protocol))return null;let o=t.hostname.trim().toLowerCase();if(!o)return null;let r=t.protocol==="https:"&&t.port==="443"||t.protocol==="http:"&&t.port==="80"||t.protocol==="ssh:"&&t.port==="22",n=t.port&&!r?`${o}:${t.port}`:o,i=Et(o,t.pathname);return i?`${n}/${i}`:null}function ln(e){let t=e.match(/^(?:[^@\s/:]+@)?([^:/\s]+):(.+)$/u);if(!t)return null;let o=t[1]?.trim().toLowerCase();if(!o||o.length===1)return null;let r=Et(o,t[2]??"");return r?`${o}/${r}`:null}function Ot(e){let t=e.trim();return t?t.includes("://")?an(t):ln(t):null}function un(e){return Pt("sha256").update(`${B}:${e}`).digest("hex")}function Tt(e){return Pt("sha256").update(`toolnet-project:${B}:${e}`).digest("hex").slice(0,16)}function dn(e){return e.split("/").filter(Boolean).at(-1)?.trim()||null}function $e(e,t){let o=sn("git",["-C",e,...t],{encoding:"utf8",windowsHide:!0,stdio:["ignore","pipe","ignore"]});return o.error||o.status!==0?null:o.stdout?.trim()||null}function Rt(e,t){let o=dn(e);return o?{scheme:B,canonicalRemote:e,fingerprint:un(e),repositoryName:o,source:t}:null}function ie(e){let t=$e(e,["remote","get-url","origin"]);if(t){let n=Ot(t);if(n)return Rt(n,"origin")}let o=$e(e,["remote"]);if(!o)return null;let r=new Set;for(let n of o.split(/\r?\n/u).map(i=>i.trim()).filter(Boolean)){let i=$e(e,["remote","get-url",n]);if(!i)continue;let s=Ot(i);s&&r.add(s)}return r.size!==1?null:Rt([...r][0],"unique-remote")}var Nt=".toolnet",kn="project.json";function bn(e){return pn("sha256").update(e).digest("hex").slice(0,16)}function A(e){return U(e,Nt,kn)}function Ft(e){return ae(A(e))}function At(e,t){let o=R(e),r=Mt(o).root;for(;;){if(Ft(o))return o;if(o===r||t&&o===R(t))break;let n=le(o);if(n===o)break;o=n}return null}function De(e){let t=R(e),o=Mt(t).root,r=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"];for(;;){if(r.some(i=>ae(U(t,i))))return t;if(t===o)break;let n=le(t);if(n===t)break;t=n}return R(e)}function se(e){let t;try{t=JSON.parse(fn(e,"utf8"))}catch(n){throw new Error(`Invalid ToolNet project manifest: ${e}: ${n instanceof Error?n.message:String(n)}`)}if(!t||typeof t!="object")throw new Error(`Invalid ToolNet project manifest: ${e}`);let o=t;if(typeof o.id!="string"||!o.id.trim())throw new Error(`ToolNet project manifest is missing id: ${e}`);if(typeof o.name!="string"||!o.name.trim())throw new Error(`ToolNet project manifest is missing name: ${e}`);let r=new Date().toISOString();return{version:1,id:o.id,name:o.name,remote:typeof o.remote=="string"&&o.remote.trim()?o.remote:o.name,rootPath:typeof o.rootPath=="string"?o.rootPath:le(le(e)),createdAt:typeof o.createdAt=="string"?o.createdAt:r,updatedAt:typeof o.updatedAt=="string"?o.updatedAt:r,graphVersion:typeof o.graphVersion=="number"?o.graphVersion:0,memoryVersion:typeof o.memoryVersion=="number"?o.memoryVersion:0,metadata:o.metadata&&typeof o.metadata=="object"?o.metadata:void 0}}function ce(e,t){let o=U(e,Nt);gn(o,{recursive:!0});let r=A(e),n=`${r}.tmp-${process.pid}`;yn(n,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),mn(n,r)}function O(e,t){return{id:e.id,name:e.name,remote:e.remote,rootPath:t,createdAt:e.createdAt,updatedAt:e.updatedAt,graphVersion:e.graphVersion,memoryVersion:e.memoryVersion,metadata:e.metadata}}function He(e){return{version:1,scheme:B,canonicalRemote:e.canonicalRemote,fingerprint:e.fingerprint,repositoryName:e.repositoryName}}function jn(e){let t=e.metadata?.toolnetIdentity;if(!t||typeof t!="object"||Array.isArray(t))return null;let o=t;return typeof o.fingerprint=="string"?o.fingerprint:null}var M=class{adopt(t,o){let r=De(R(t));if(!o.id.trim())throw new Error("PROJECT_ADOPTION_INVALID_ID");if(!o.name.trim())throw new Error("PROJECT_ADOPTION_INVALID_NAME");if(!o.remote.trim())throw new Error("PROJECT_ADOPTION_INVALID_REMOTE");if(Ft(r)){let c=se(A(r));if(c.id!==o.id)throw new Error(["PROJECT_IDENTITY_ALREADY_EXISTS",`existing=${c.id}`,`requested=${o.id}`].join(" "));return O(c,r)}let n=new Date().toISOString(),i={...o.metadata};o.gitIdentity&&(i.toolnetIdentity=He(o.gitIdentity));let s={version:1,id:o.id.trim(),name:o.name.trim(),remote:o.remote.trim(),rootPath:r,createdAt:o.createdAt??n,updatedAt:n,graphVersion:o.graphVersion??0,memoryVersion:o.memoryVersion??0,metadata:Object.keys(i).length?i:void 0};return ce(r,s),O(s,r)}recordGitIdentity(t,o,r={}){let n=this.requireExisting(t),i=A(n.rootPath),s=se(i),c=jn(s);if(c&&c!==o.fingerprint&&!r.allowRebind)throw new Error(["PROJECT_GIT_REMOTE_CHANGED",`existing=${c}`,`current=${o.fingerprint}`,"Use explicit rebind only when this repository identity change is intentional."].join(" "));let a=s.metadata?.toolnetIdentity;return a&&typeof a=="object"&&!Array.isArray(a)&&a.fingerprint===o.fingerprint||(s.metadata={...s.metadata,toolnetIdentity:He(o)},s.updatedAt=new Date().toISOString(),ce(n.rootPath,s)),O(s,n.rootPath)}findExisting(t=process.cwd()){let o=R(t),r=De(o),i=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(a=>ae(U(r,a))),s=At(o,i?r:void 0);if(!s)return null;let c=se(A(s));return O(c,s)}requireExisting(t=process.cwd()){let o=this.findExisting(t);if(!o)throw new Error("PROJECT_NOT_INITIALIZED");return o}detect(t=process.cwd()){let o=R(t),r=De(o),i=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(d=>ae(U(r,d))),s=At(o,i?r:void 0);if(s){let d=A(s),p=se(d);return p.rootPath!==s&&(p.rootPath=s,p.updatedAt=new Date().toISOString(),ce(s,p)),O(p,s)}let c=new Date().toISOString(),a=hn(r),l=ie(r),u={version:1,id:l?Tt(l.canonicalRemote):bn(r),name:a,remote:l?.repositoryName??a,rootPath:r,createdAt:c,updatedAt:c,graphVersion:0,memoryVersion:0,metadata:l?{toolnetIdentity:He(l)}:void 0};return ce(r,u),O(u,r)}};var In=[{type:"openai_key",regex:/\bsk-[A-Za-z0-9_-]{20,}\b/g,confidence:"exact"},{type:"huggingface_token",regex:/\bhf_[A-Za-z0-9]{20,}\b/g,confidence:"exact"},{type:"hf_s3_access_key",regex:/\bHFAK[A-Za-z0-9]{8,}\b/g,confidence:"exact"},{type:"aws_access_key",regex:/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,confidence:"exact"},{type:"github_token",regex:/\b(?:gh[pousr]_[A-Za-z0-9]{30,255}|github_pat_[A-Za-z0-9_]{40,255})\b/g,confidence:"exact"},{type:"stripe_secret_key",regex:/\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g,confidence:"exact"},{type:"google_api_key",regex:/\bAIza[A-Za-z0-9_-]{30,}\b/g,confidence:"exact"},{type:"slack_token",regex:/\bxox[baprs]-[A-Za-z0-9-]{16,}\b/g,confidence:"exact"},{type:"npm_token",regex:/\bnpm_[A-Za-z0-9]{20,}\b/g,confidence:"exact"},{type:"bearer_token",regex:/\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/gi,confidence:"high"},{type:"jwt",regex:/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,confidence:"exact"},{type:"private_key",regex:/-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,confidence:"exact"},{type:"password_assignment",regex:/\b(?:password|passwd|pwd)\s*[:=]\s*["']?[^"' \t\r\n]{6,}["']?/gi,confidence:"high"},{type:"secret_assignment",regex:/\b(?:secret|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key)\s*[:=]\s*["']?[^"' \t\r\n]{8,}["']?/gi,confidence:"high"},{type:"cookie",regex:/\b(?:cookie|set-cookie)\s*[:=]\s*[^;\n]{8,}/gi,confidence:"high"},{type:"url_credentials",regex:/\bhttps?:\/\/[^:/@\s]+:[^/@\s]{4,}@[^/\s]+/gi,confidence:"high"}],vn=new Set(["example","example-key","example-token","changeme","change-me","password","secret","your-api-key","your-token","<token>","<secret>","<password>","[redacted]"]);function _t(e){return e.normalize("NFKC").trim().toLowerCase()}function wn(e){if(e.length===0)return 0;let t=new Map;for(let r of e)t.set(r,(t.get(r)??0)+1);let o=0;for(let r of t.values()){let n=r/e.length;o-=n*Math.log2(n)}return o}function Sn(e){return/^[a-f0-9]{32}$/iu.test(e)||/^[a-f0-9]{40}$/iu.test(e)||/^[a-f0-9]{64}$/iu.test(e)}function xn(e,t,o){let r=e.slice(Math.max(0,t-48),t),n=e.slice(o,Math.min(e.length,o+16));return/\b(?:token|secret|key|credential|authorization|password|passwd|apikey|api_key|access[_-]?key)\b/iu.test(`${r} ${n}`)}function Cn(e,t){return e.start<t.end&&t.start<e.end}function $t(e){return e.sort((t,o)=>t.start!==o.start?t.start-o.start:o.end-o.start-(t.end-t.start))}var ue=class{allowValues=new Set;enableEntropyHeuristic;constructor(t={}){for(let o of t.allowValues??[]){let r=_t(o);r&&this.allowValues.add(r)}this.enableEntropyHeuristic=t.enableEntropyHeuristic??!0}scan(t){let o=[];for(let i of In){let s=new RegExp(i.regex.source,i.regex.flags);for(let c of t.matchAll(s))c.index===void 0||!c[0]||this.allowed(c[0])||o.push({type:i.type,value:c[0],start:c.index,end:c.index+c[0].length,confidence:i.confidence})}this.enableEntropyHeuristic&&o.push(...this.entropyMatches(t));let r=$t(o),n=[];for(let i of r)n.some(s=>Cn(s,i))||n.push(i);return $t(n)}hasSecrets(t){return this.scan(t).length>0}allowed(t){let o=_t(t);return vn.has(o)?!0:this.allowValues.has(o)}entropyMatches(t){let o=[],r=/[A-Za-z0-9_+/=-]{32,160}/g;for(let n of t.matchAll(r)){if(n.index===void 0||!n[0])continue;let i=n[0];this.allowed(i)||Sn(i)||!/[A-Za-z]/u.test(i)||!/[0-9]/u.test(i)||xn(t,n.index,n.index+i.length)&&(wn(i)<3.7||o.push({type:"high_entropy_secret",value:i,start:n.index,end:n.index+i.length,confidence:"heuristic"}))}return o}};var de=class{scanner;constructor(t={}){this.scanner=new ue(t)}sanitize(t){let o=this.scanner.scan(t);if(o.length===0)return{text:t,redacted:0,secretTypes:[]};let r=t,n=[...o].sort((s,c)=>c.start-s.start),i=new Set;for(let s of n)i.add(s.type),r=r.slice(0,s.start)+`[REDACTED:${s.type}]`+r.slice(s.end);return{text:r,redacted:o.length,secretTypes:[...i].sort()}}sanitizeValue(t){if(typeof t=="string")return this.sanitize(t).text;if(Array.isArray(t))return t.map(o=>this.sanitizeValue(o));if(t&&typeof t=="object"){let o={};for(let[r,n]of Object.entries(t)){let i=r.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g,"");if(i.includes("password")||i.includes("passwd")||i==="pwd"||i.includes("secret")||i.includes("token")||i.includes("cookie")||i.includes("authorization")||i.includes("apikey")||i.includes("accesskey")||i.includes("privatekey")||i.includes("clientsecret")||i.includes("credential")){o[r]="[REDACTED]";continue}o[r]=this.sanitizeValue(n)}return o}return t}};var nl=new de;var On={mcp:!0,continuityRead:!0,nativeCapture:!1,lifecycleHooks:!1,sharedJournalWrite:!1,level:"mcp-only"},Rn={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!1,sharedJournalWrite:!0,level:"native-capture"},P={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!0,sharedJournalWrite:!0,level:"native-capture"},Pn={mcp:!0,continuityRead:!0,nativeCapture:!0,lifecycleHooks:!0,sharedJournalWrite:!0,level:"native-capture"};function b(e,t,o){return{agent:e,...t,refreshMode:o}}var Dt={agy:b("agy",P,"native-lifecycle"),opencode:b("opencode",Pn,"persistent-plugin"),codex:b("codex",P,"native-lifecycle"),claude:b("claude",P,"native-lifecycle"),kiro:b("kiro",P,"native-lifecycle"),cursor:b("cursor",P,"native-lifecycle"),copilot:b("copilot",P,"native-lifecycle"),grok:b("grok",P,"native-lifecycle"),"toolnet-cli":b("toolnet-cli",Rn,"native-session"),kilo:b("kilo",On,"mcp-only")};function En(e){return Object.prototype.hasOwnProperty.call(Dt,e)}function Tn(e){if(En(e))return Dt[e]}function Ht(e){let t=Tn(e);if(!t)return"unknown";switch(t.refreshMode){case"native-lifecycle":return"native lifecycle";case"persistent-plugin":return"persistent plugin";case"native-session":return"native session capture";case"mcp-only":return"MCP only"}}var Jt=["\u280B","\u2819","\u2839","\u2838","\u283C","\u2834","\u2826","\u2827","\u2807","\u280F"],f={clear:"\r\x1B[2K",cyan:"\x1B[36m",green:"\x1B[32m",red:"\x1B[31m",yellow:"\x1B[33m",amber:"\x1B[38;5;214m",dim:"\x1B[2m",reset:"\x1B[0m"};function Lt(e,t=16){let r=Math.max(1,t-4+1),n=e%r;return"\u2500".repeat(n)+"\u2501".repeat(4)+"\u2500".repeat(Math.max(0,t-n-4))}function Kt(e){let t=Date.now()-e;return t<1e3?`${t}ms`:t<1e4?`${(t/1e3).toFixed(1)}s`:`${Math.round(t/1e3)}s`}var Je=class{stream;enabled;interactive;color;intervalMs;display;label;frame=0;startedAt=0;timer;active=!1;constructor(t,o={}){this.label=t,this.stream=o.stream??process.stderr,this.enabled=o.enabled??!0,this.interactive=o.interactive??this.stream.isTTY===!0,this.color=o.color??(this.interactive&&process.env.NO_COLOR===void 0),this.intervalMs=Math.max(40,o.intervalMs??80),this.display=o.display??"spinner"}start(){return!this.enabled||this.active?this:(this.active=!0,this.startedAt=Date.now(),this.interactive?(this.render(),this.timer=setInterval(()=>{this.frame=(this.frame+1)%1e4,this.render()},this.intervalMs),this.timer.unref?.(),this):(this.stream.write(`\u2192 ${this.label}
`),this))}update(t){return this.label=t,this.enabled&&this.active&&this.interactive&&this.render(),this}succeed(t){this.finish("\u2713",t??this.label,f.green)}fail(t){this.finish("\u2717",t??this.label,f.red)}warn(t){this.finish("!",t??this.label,f.yellow)}stop(){this.active&&(this.timer&&(clearInterval(this.timer),this.timer=void 0),this.enabled&&this.interactive&&this.stream.write(f.clear),this.active=!1)}render(){if(!this.enabled||!this.active||!this.interactive)return;let t=Jt[this.frame%Jt.length],o=this.display==="bar"?this.color?`${f.amber}${Lt(this.frame)}${f.reset}`:Lt(this.frame):this.color?`${f.cyan}${t}${f.reset}`:t,r=Kt(this.startedAt),n=this.color?`${f.dim}${r}${f.reset}`:r;this.stream.write(`${f.clear}${o} ${this.label} ${n}`)}finish(t,o,r){if(!this.enabled){this.active=!1;return}this.startedAt||(this.startedAt=Date.now()),this.timer&&(clearInterval(this.timer),this.timer=void 0);let n=Kt(this.startedAt),i=this.color?`${r}${t}${f.reset}`:t,s=this.color?`${f.dim}${n}${f.reset}`:n;this.interactive?this.stream.write(`${f.clear}${i} ${o} ${s}
`):this.stream.write(`${i} ${o} (${n})
`),this.active=!1}};async function Le(e,t,o={}){let r=new Je(e,o).start();try{let n=await t();return r.succeed(),n}catch(n){throw r.fail(),n}}import{resolve as ni}from"node:path";import{homedir as ei}from"node:os";import{join as ti}from"node:path";import{DeleteObjectCommand as An,GetObjectCommand as Mn,HeadObjectCommand as Nn,ListObjectsV2Command as Fn,PutObjectCommand as _n,S3Client as $n}from"@aws-sdk/client-s3";import{getSignedUrl as Dn}from"@aws-sdk/s3-request-presigner";var pe=class{name="huggingface";client;bucket;constructor(t){this.bucket=t.bucket,this.client=new $n({region:"us-east-1",endpoint:`https://s3.hf.co/${t.namespace}`,forcePathStyle:!0,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:t.accessKeyId,secretAccessKey:t.secretAccessKey}})}async put(t,o,r="application/octet-stream"){let n=typeof o=="string"?Buffer.from(o,"utf8"):o;await this.client.send(new _n({Bucket:this.bucket,Key:t,Body:n,ContentType:r}))}async get(t){let o=await Dn(this.client,new Mn({Bucket:this.bucket,Key:t}),{expiresIn:60}),r=await fetch(o,{redirect:"follow"});if(r.status===404)return null;if(!r.ok)throw new Error(`HF download failed: ${r.status} ${r.statusText}`);return new Uint8Array(await r.arrayBuffer())}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){try{return await this.client.send(new Nn({Bucket:this.bucket,Key:t})),!0}catch(o){if(typeof o=="object"&&o!==null&&"$metadata"in o&&o.$metadata?.httpStatusCode===404)return!1;throw o}}async delete(t){await this.client.send(new An({Bucket:this.bucket,Key:t}))}async list(t=""){let o=[],r;do{let n=await this.client.send(new Fn({Bucket:this.bucket,Prefix:t||void 0,ContinuationToken:r}));for(let i of n.Contents??[])i.Key&&o.push({key:i.Key,size:i.Size,updatedAt:i.LastModified?.toISOString()});r=n.IsTruncated?n.NextContinuationToken:void 0}while(r);return o}};import{access as Gt,mkdir as Hn,readFile as Jn,readdir as Ln,rm as Kn,stat as Bt,writeFile as Gn}from"node:fs/promises";import{dirname as Bn,join as Un,relative as Ut,resolve as Vn}from"node:path";var V=class{constructor(t){this.root=t}root;name="local";path(t){let o=t.replace(/^\/+/,"");return Vn(this.root,o)}async put(t,o){let r=this.path(t);await Hn(Bn(r),{recursive:!0}),await Gn(r,o)}async get(t){try{return await Jn(this.path(t))}catch(o){if(typeof o=="object"&&o!==null&&"code"in o&&o.code==="ENOENT")return null;throw o}}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){try{return await Gt(this.path(t)),!0}catch{return!1}}async delete(t){await Kn(this.path(t),{force:!0})}async list(t=""){let o=this.path(t),r=[];try{await Gt(o)}catch{return r}let n=async s=>{let c=await Ln(s,{withFileTypes:!0});for(let a of c){let l=Un(s,a.name);if(a.isDirectory()){await n(l);continue}let u=await Bt(l);r.push({key:Ut(this.root,l),size:u.size,updatedAt:u.mtime.toISOString()})}},i=await Bt(o);return i.isDirectory()?await n(o):r.push({key:Ut(this.root,o),size:i.size,updatedAt:i.mtime.toISOString()}),r}};import{DeleteObjectCommand as zn,GetObjectCommand as Yn,HeadObjectCommand as Wn,ListObjectsV2Command as qn,PutObjectCommand as Zn,S3Client as Xn}from"@aws-sdk/client-s3";import{getSignedUrl as Qn}from"@aws-sdk/s3-request-presigner";var z=class{name;client;bucket;constructor(t){this.name=t.name??"s3",this.bucket=t.bucket,this.client=new Xn({region:t.region??"us-east-1",endpoint:t.endpoint||void 0,forcePathStyle:t.forcePathStyle??!1,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:t.accessKeyId,secretAccessKey:t.secretAccessKey}})}async put(t,o,r="application/octet-stream"){let n=typeof o=="string"?Buffer.from(o,"utf8"):o;await this.client.send(new Zn({Bucket:this.bucket,Key:t,Body:n,ContentType:r}))}async get(t){let o=await Qn(this.client,new Yn({Bucket:this.bucket,Key:t}),{expiresIn:60}),r=await fetch(o,{redirect:"follow"});if(r.status===404)return null;if(!r.ok)throw new Error(`${this.name} download failed: ${r.status} ${r.statusText}`);return new Uint8Array(await r.arrayBuffer())}async getText(t){let o=await this.get(t);return o?Buffer.from(o).toString("utf8"):null}async exists(t){try{return await this.client.send(new Wn({Bucket:this.bucket,Key:t})),!0}catch(o){if(typeof o=="object"&&o!==null&&"$metadata"in o&&o.$metadata?.httpStatusCode===404)return!1;throw o}}async delete(t){await this.client.send(new zn({Bucket:this.bucket,Key:t}))}async list(t=""){let o=[],r;do{let n=await this.client.send(new qn({Bucket:this.bucket,Prefix:t||void 0,ContinuationToken:r}));for(let i of n.Contents??[])i.Key&&o.push({key:i.Key,size:i.Size,updatedAt:i.LastModified?.toISOString()});r=n.IsTruncated?n.NextContinuationToken:void 0}while(r);return o}};function Ke(e,t){return console.warn(t),new V(e)}function Vt(e){let t=e.localRoot??ti(ei(),".toolnet-memory","storage");if(e.provider==="r2"){let o=e.r2;return o?.accountId&&o.bucket&&o.accessKeyId&&o.secretAccessKey?new z({name:"r2",endpoint:`https://${o.accountId}.r2.cloudflarestorage.com`,region:"auto",bucket:o.bucket,forcePathStyle:!0,accessKeyId:o.accessKeyId,secretAccessKey:o.secretAccessKey}):Ke(t,"[storage] Cloudflare R2 credentials missing. Using local fallback.")}if(e.provider==="s3"){let o=e.s3;return o?.bucket&&o.accessKeyId&&o.secretAccessKey?new z({name:"s3",endpoint:o.endpoint,region:o.region??"us-east-1",bucket:o.bucket,forcePathStyle:o.forcePathStyle??!1,accessKeyId:o.accessKeyId,secretAccessKey:o.secretAccessKey}):Ke(t,"[storage] S3 credentials missing. Using local fallback.")}if(e.provider==="huggingface"){let o=e.huggingface;return o?.namespace&&o.bucket&&o.accessKeyId&&o.secretAccessKey?new pe({namespace:o.namespace,bucket:o.bucket,accessKeyId:o.accessKeyId,secretAccessKey:o.secretAccessKey}):Ke(t,"[storage] Hugging Face credentials missing. Using local fallback.")}return new V(t)}function oi(e){return new Promise(t=>setTimeout(t,e))}async function zt(e,t={}){let o=Math.max(1,t.attempts??3),r=t.baseDelayMs??150,n=t.maxDelayMs??2e3,i;for(let s=1;s<=o;s++)try{return await e()}catch(c){if(i=c,s>=o)break;let a=Math.min(n,r*2**(s-1)),l=Math.floor(Math.random()*Math.max(1,a*.2));await oi(a+l)}throw i}var ri=new Set(["put","get","getText","delete","list"]);function Yt(e,t={}){return new Proxy(e,{get(o,r){let n=Reflect.get(o,r,o);return typeof n!="function"?n:ri.has(r)?(...i)=>zt(()=>Promise.resolve(n.apply(o,i)),t):n.bind(o)}})}function N(e){let t=e.trim().replace(/\s+/g,"_").replace(/[^A-Za-z0-9._-]/g,"_").replace(/_+/g,"_").replace(/^\.+|\.+$/g,"").slice(0,100);if(!t||t==="."||t==="..")throw new Error("Invalid project storage folder");return t}var ii="_toolnet/registry/project-identities/v1",y=class extends Error{code="PROJECT_IDENTITY_COLLISION";constructor(t){super(t),this.name="ProjectIdentityCollisionError"}},ge=class extends Error{code="PROJECT_IDENTITY_ADOPTION_REQUIRED";constructor(t,o){super(["PROJECT_IDENTITY_ADOPTION_REQUIRED",`remote=${t}`,`projectId=${o}`,"A legacy remote ToolNet project exists but has no Git fingerprint proof.",`Re-run with: toolnet-memory init --adopt-remote ${t}`].join(" ")),this.name="ProjectIdentityAdoptionRequiredError"}},Y=class extends Error{code="PROJECT_IDENTITY_REGISTRY_UNAVAILABLE";constructor(t){super(["PROJECT_IDENTITY_REGISTRY_UNAVAILABLE",t,"Refusing to create a possibly split project identity while configured remote storage cannot be checked.","Use --no-remote-identity only when local-only initialization is intentional."].join(" ")),this.name="ProjectIdentityRegistryUnavailableError"}};function si(){let e=_e();if(e.storage.provider==="r2"){let t=e.storage.r2;return!!(t.accountId&&t.bucket&&t.accessKeyId&&t.secretAccessKey)}if(e.storage.provider==="s3"){let t=e.storage.s3;return!!(t.bucket&&t.accessKeyId&&t.secretAccessKey)}if(e.storage.provider==="huggingface"){let t=e.storage.huggingface;return!!(t.namespace&&t.bucket&&t.accessKeyId&&t.secretAccessKey)}return!1}function Wt(e){if(e.storage)return{storage:e.storage,crossMachine:e.storageIsCrossMachine??!0,providerName:e.storage.name};let t=_e(),o=Vt({provider:t.storage.provider,r2:t.storage.r2,s3:t.storage.s3,huggingface:t.storage.huggingface,localRoot:t.storage.localRoot}),r=si()&&o.name!=="local";return{storage:r?Yt(o,{attempts:Number(process.env.TOOLNET_STORAGE_RETRIES??3)}):o,crossMachine:r,providerName:o.name}}function Zt(e){return[ii,`${e.fingerprint}.json`].join("/")}function Xt(e,t){let o;try{o=JSON.parse(e)}catch(i){throw new y([`Invalid ToolNet project identity registry record: ${t}.`,i instanceof Error?i.message:String(i)].join(" "))}if(!o||typeof o!="object"||Array.isArray(o))throw new y(`Invalid ToolNet project identity registry record: ${t}`);let r=o;for(let i of["fingerprint","canonicalGitRemote","projectId","projectName","projectRemote"])if(typeof r[i]!="string"||!String(r[i]).trim())throw new y(`ToolNet identity registry record ${t} is missing ${i}`);let n=new Date().toISOString();return{version:1,fingerprint:String(r.fingerprint),canonicalGitRemote:String(r.canonicalGitRemote),projectId:String(r.projectId),projectName:String(r.projectName),projectRemote:String(r.projectRemote),createdAt:typeof r.createdAt=="string"?r.createdAt:n,updatedAt:typeof r.updatedAt=="string"?r.updatedAt:n}}function ci(e,t){let o;try{o=JSON.parse(e)}catch(s){throw new y([`Invalid remote ToolNet project manifest: ${t}.`,s instanceof Error?s.message:String(s)].join(" "))}if(!o||typeof o!="object"||Array.isArray(o))throw new y(`Invalid remote ToolNet project manifest: ${t}`);let r=o;if(typeof r.id!="string"||!r.id.trim())throw new y(`Remote ToolNet project manifest ${t} is missing id`);let n=typeof r.remote=="string"&&r.remote.trim()?r.remote:t.split("/")[1]??"project",i=typeof r.name=="string"&&r.name.trim()?r.name:n;return{version:typeof r.version=="number"?r.version:void 0,id:r.id,name:i,remote:n,createdAt:typeof r.createdAt=="string"?r.createdAt:void 0,updatedAt:typeof r.updatedAt=="string"?r.updatedAt:void 0}}async function fe(e,t){let r=`projects/${N(t)}/project.json`,n=await e.getText(r);return n?ci(n,r):null}async function ai(e,t){let o=Zt(t),r=await e.getText(o);if(!r)return null;let n=Xt(r,o);if(n.fingerprint!==t.fingerprint||n.canonicalGitRemote!==t.canonicalRemote)throw new y(["PROJECT_IDENTITY_REGISTRY_MISMATCH",`key=${o}`,`expectedFingerprint=${t.fingerprint}`,`actualFingerprint=${n.fingerprint}`].join(" "));return n}async function li(e,t){let o=await fe(e,t.projectRemote);if(o&&o.id!==t.projectId)throw new y(["PROJECT_IDENTITY_REMOTE_OWNERSHIP_MISMATCH",`remote=${t.projectRemote}`,`registryId=${t.projectId}`,`remoteId=${o.id}`].join(" "))}async function Ge(e,t,o){let r=N(t.remote??t.name),n=await fe(e,r);if(n&&n.id!==t.id)throw new y(["PROJECT_IDENTITY_REMOTE_NAMESPACE_COLLISION",`remote=${r}`,`existing=${n.id}`,`current=${t.id}`].join(" "));let i=Zt(o),s=await e.getText(i);if(s){let l=Xt(s,i);if(l.projectId!==t.id||l.canonicalGitRemote!==o.canonicalRemote)throw new y(["PROJECT_IDENTITY_REGISTRY_COLLISION",`fingerprint=${o.fingerprint}`,`existingProject=${l.projectId}`,`currentProject=${t.id}`].join(" "));return}let c=new Date().toISOString(),a={version:1,fingerprint:o.fingerprint,canonicalGitRemote:o.canonicalRemote,projectId:t.id,projectName:t.name,projectRemote:r,createdAt:t.createdAt,updatedAt:c};await e.put(i,JSON.stringify(a,null,2)+`
`,"application/json")}function ui(e,t){return{id:e.id,name:e.name,remote:e.remote,createdAt:e.createdAt,gitIdentity:t,metadata:{adoptedFromRemote:!0,adoptedAt:new Date().toISOString()}}}function qt(e){return e instanceof y||e instanceof ge||e instanceof Y}async function Qt(e=process.cwd(),t={}){let o=ni(e),r=new M,n=r.findExisting(o),i=ie(n?.rootPath??o);if(n){let c=n;if(i&&(c=r.recordGitIdentity(n.rootPath,i,{allowRebind:t.allowGitRebind??!1})),t.skipRemoteIdentity||!i)return{project:c,source:"existing-manifest",gitIdentity:i,registry:t.skipRemoteIdentity?"skipped":"disabled"};let a=Wt(t);if(!a.crossMachine)return{project:c,source:"existing-manifest",gitIdentity:i,registry:"disabled",registryProvider:a.providerName};try{return await Ge(a.storage,c,i),{project:c,source:"existing-manifest",gitIdentity:i,registry:"registered",registryProvider:a.providerName}}catch(l){if(qt(l))throw l;return{project:c,source:"existing-manifest",gitIdentity:i,registry:"unavailable",registryProvider:a.providerName}}}if(!i)return{project:r.detect(o),source:"legacy-path",gitIdentity:null,registry:"disabled"};if(t.skipRemoteIdentity)return{project:r.detect(o),source:"git-remote",gitIdentity:i,registry:"skipped"};let s=Wt(t);if(!s.crossMachine){if(t.adoptRemote)throw new Y("Explicit remote adoption was requested but no cross-machine storage provider is configured.");return{project:r.detect(o),source:"git-remote",gitIdentity:i,registry:"disabled",registryProvider:s.providerName}}try{let c=await ai(s.storage,i);if(c){if(t.adoptRemote&&N(t.adoptRemote)!==N(c.projectRemote))throw new y(["PROJECT_IDENTITY_EXPLICIT_ADOPTION_CONFLICT",`requested=${t.adoptRemote}`,`registered=${c.projectRemote}`].join(" "));return await li(s.storage,c),{project:r.adopt(o,{id:c.projectId,name:c.projectName,remote:c.projectRemote,createdAt:c.createdAt,gitIdentity:i,metadata:{adoptedFromRegistry:!0,adoptedAt:new Date().toISOString()}}),source:"remote-registry",gitIdentity:i,registry:"matched",registryProvider:s.providerName}}if(t.adoptRemote){let u=await fe(s.storage,t.adoptRemote);if(!u)throw new Error(["PROJECT_ADOPTION_REMOTE_NOT_FOUND",`remote=${t.adoptRemote}`].join(" "));let d=r.adopt(o,ui(u,i));return await Ge(s.storage,d,i),{project:d,source:"explicit-remote-adoption",gitIdentity:i,registry:"registered",registryProvider:s.providerName}}let a=await fe(s.storage,i.repositoryName);if(a)throw new ge(a.remote,a.id);let l=r.detect(o);return await Ge(s.storage,l,i),{project:l,source:"git-remote",gitIdentity:i,registry:"registered",registryProvider:s.providerName}}catch(c){throw qt(c)?c:new Y(c instanceof Error?c.message:String(c))}}import{existsSync as Eo}from"node:fs";import{homedir as Fi}from"node:os";import{join as _i}from"node:path";import{spawnSync as $i}from"node:child_process";import{homedir as di}from"node:os";import{join as F}from"node:path";function eo(e={}){return F(e.home??di(),".gemini")}function to(e={}){return F(eo(e),"antigravity-cli")}function oo(e={}){return F(eo(e),"config")}function me(e={}){return F(oo(e),"mcp_config.json")}function ye(e={}){let t=e.cwd??process.cwd();return F(t,".agents","mcp_config.json")}function he(e="toolnet-memory",t={}){return F(to(t),"plugins",e)}function ro(e={}){return[to(e),me(e),oo(e),ye(e)]}import{homedir as no}from"node:os";import{join as E}from"node:path";function _(e={}){let t=process.env.OPENCODE_CONFIG_DIR?.trim();if(t)return t;let o=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return o?E(o,"opencode"):E(e.home??no(),".config","opencode")}function Be(e={}){let t=process.env.OPENCODE_CONFIG?.trim();if(t)return t;let o=e.home??no(),r=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return r?E(r,"opencode","opencode.json"):E(o,".config","opencode","opencode.json")}function Ue(e={}){let t=e.cwd??process.cwd();return E(t,"opencode.json")}function io(e={}){return E(_(e),"plugins")}function so(e={}){return E(_(e),"AGENTS.md")}import{homedir as co}from"node:os";import{join as Ve}from"node:path";function ze(e={}){return Ve(e.home??co(),".claude")}function ao(e={}){return Ve(ze(e),"settings.json")}function lo(e={}){return Ve(e.home??co(),".claude.json")}import{homedir as pi}from"node:os";import{join as T}from"node:path";function Ye(e={}){return e.kiroHome??process.env.KIRO_HOME??T(e.home??pi(),".kiro")}function gi(e={}){return T(Ye(e),"settings")}function ke(e={}){return T(gi(e),"mcp.json")}function We(e={}){let t=e.cwd??process.cwd();return T(t,".kiro","settings","mcp.json")}function fi(e={}){return T(Ye(e),"hooks")}function qe(e={}){return T(fi(e),"toolnet-memory.json")}function Ze(e={}){let t=e.cwd??process.cwd();return T(t,".kiro","hooks","toolnet-memory.json")}function uo(e={}){return[Ye(e),ke(e)]}import{homedir as mi}from"node:os";import{join as Xe}from"node:path";function po(e={}){return Xe(e.home??mi(),".toolnetcli")}function yi(e={}){return Xe(po(e),"config.json")}function go(e={}){let t=e.cwd??process.cwd();return Xe(t,".toolnet","mcp.json")}function fo(e={}){let t=po(e),o=yi(e);return[t,o]}import{homedir as hi}from"node:os";import{join as Qe}from"node:path";function mo(e={}){if(e.kiloHome)return e.kiloHome;if(process.env.KILO_HOME)return process.env.KILO_HOME;let t=e.xdgConfigHome??process.env.XDG_CONFIG_HOME;return t?Qe(t,"kilo"):Qe(e.home??hi(),".config","kilo")}function et(e={}){return Qe(mo(e),"kilo.jsonc")}function yo(e={}){let t=mo(e),o=et(e);return[t,o]}import{homedir as ki}from"node:os";import{join as I,resolve as bi}from"node:path";function be(e={}){return e.cursorHome??I(e.home??ki(),".cursor")}function ji(e={}){return e.cursorConfigDir??process.env.CURSOR_CONFIG_DIR??(e.xdgConfigHome??process.env.XDG_CONFIG_HOME?I(e.xdgConfigHome??process.env.XDG_CONFIG_HOME,"cursor"):void 0)??be(e)}function je(e={}){return I(be(e),"mcp.json")}function Ie(e={}){return I(be(e),"hooks.json")}function tt(e){return I(bi(e),".cursor")}function ho(e){return I(tt(e),"mcp.json")}function ko(e){return I(tt(e),"hooks.json")}function Ii(e){return I(tt(e),"rules")}function bo(e){return I(Ii(e),"toolnet-memory.mdc")}function jo(e={}){return Array.from(new Set([be(e),ji(e)]))}import{homedir as vi}from"node:os";import{join as j,resolve as wi}from"node:path";function ot(e={}){return e.copilotHome??process.env.COPILOT_HOME??j(e.home??vi(),".copilot")}function ve(e={}){return j(ot(e),"mcp-config.json")}function Si(e={}){return j(ot(e),"hooks")}function we(e={}){return j(Si(e),"toolnet-memory.json")}function rt(e){return j(wi(e),".github")}function Io(e){return j(rt(e),"mcp.json")}function xi(e){return j(rt(e),"hooks")}function vo(e){return j(xi(e),"toolnet-memory.json")}function Ci(e){return j(rt(e),"instructions")}function wo(e){return j(Ci(e),"toolnet-memory.instructions.md")}function So(e={}){return[ot(e)]}import{homedir as Oi}from"node:os";import{join as h,resolve as Ri}from"node:path";function Se(e={}){return e.grokHome??process.env.GROK_HOME??h(e.home??Oi(),".grok")}function xe(e={}){return h(Se(e),"config.toml")}function Pi(e={}){return h(Se(e),"hooks")}function Ce(e={}){return h(Pi(e),"toolnet-memory.json")}function Ei(e={}){return h(Se(e),"skills")}function Ti(e={}){return h(Ei(e),"toolnet-continuity")}function Oe(e={}){return h(Ti(e),"SKILL.md")}function nt(e){return h(Ri(e),".grok")}function xo(e){return h(nt(e),"config.toml")}function Ai(e){return h(nt(e),"hooks")}function Co(e){return h(Ai(e),"toolnet-memory.json")}function Mi(e){return h(nt(e),"skills")}function Ni(e){return h(Mi(e),"toolnet-continuity")}function Oo(e){return h(Ni(e),"SKILL.md")}function Ro(e={}){return[Se(e)]}function Di(e){return $i("sh",["-lc",`command -v ${JSON.stringify(e)} >/dev/null 2>&1`],{stdio:"ignore"}).status===0}function x(e){let t=e.commandExists(e.command),o=e.configPaths.filter(i=>Eo(i)),r=o.length>0,n=[];t&&n.push(`command:${e.command}`);for(let i of o)n.push(`config:${i}`);return{agent:e.agent,detected:t||r,commandDetected:t,configDetected:r,evidence:n}}function Po(e){let t=e.commands.filter(s=>e.commandExists(s)),o=e.configPaths.filter(s=>Eo(s)),r=t.length>0,n=o.length>0,i=[...t.map(s=>`command:${s}`),...o.map(s=>`config:${s}`)];return{agent:e.agent,detected:r||n,commandDetected:r,configDetected:n,evidence:i}}function To(e={}){let t=e.home??Fi(),o=e.commandExists??Di,r=e.codexHome??process.env.CODEX_HOME??_i(t,".codex");return[x({agent:"agy",command:"agy",commandExists:o,configPaths:ro({home:t})}),x({agent:"opencode",command:"opencode",commandExists:o,configPaths:[_({home:t,xdgConfigHome:e.xdgConfigHome})]}),x({agent:"claude",command:"claude",commandExists:o,configPaths:[ze({home:t})]}),x({agent:"kiro",command:"kiro-cli",commandExists:o,configPaths:uo({home:t,kiroHome:e.kiroHome})}),Po({agent:"cursor",commands:["agent","cursor-agent"],commandExists:o,configPaths:jo({home:t,cursorHome:e.cursorHome,cursorConfigDir:e.cursorConfigDir,xdgConfigHome:e.xdgConfigHome})}),x({agent:"copilot",command:"copilot",commandExists:o,configPaths:So({home:t,copilotHome:e.copilotHome})}),x({agent:"grok",command:"grok",commandExists:o,configPaths:Ro({home:t,grokHome:e.grokHome})}),x({agent:"toolnet-cli",command:"toolnet",commandExists:o,configPaths:fo({home:t})}),Po({agent:"kilo",commands:["kilo","kilo-code"],commandExists:o,configPaths:yo({home:t,kiloHome:e.kiloHome})}),x({agent:"codex",command:"codex",commandExists:o,configPaths:[r]})]}import{existsSync as rs,mkdirSync as $o,readFileSync as ns,renameSync as is,writeFileSync as ss}from"node:fs";import{dirname as cs,join as Pe}from"node:path";import{existsSync as Hi,mkdirSync as Ji,readFileSync as Li,renameSync as Ki,rmSync as Gi,writeFileSync as Bi}from"node:fs";import{dirname as Ui,join as Vi}from"node:path";function zi(e){return`'${e.replace(/'/g,"'\\''")}'`}function Yi(e){if(!Hi(e))return{};let t;try{t=JSON.parse(Li(e,"utf8"))}catch{throw new Error(`Invalid existing Agy hooks.json at ${e}: parse error. Not overwriting.`)}if(typeof t!="object"||t===null||Array.isArray(t))throw new Error(`Invalid existing Agy hooks.json at ${e}: root must be a JSON object.`);return t}function Wi(e,t){Ji(Ui(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Bi(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Ki(o,e)}finally{Gi(o,{force:!0})}}function Ao(e={}){let t=e.pluginName??"toolnet-memory",o=e.hooksFile??Vi(he(t),"hooks.json"),r=Yi(o),n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",i=`${zi(n)} session:agy-hook`;return r["toolnet-memory"]={enabled:!0,PreToolUse:[{matcher:"view_file|list_dir|find_by_name|grep_search|run_command",hooks:[{type:"command",command:`${i} pre-tool`,timeout:5}]}],PreInvocation:[{type:"command",command:`${i} pre`,timeout:15}],PostInvocation:[{type:"command",command:`${i} post`,timeout:15}],Stop:[{type:"command",command:`${i} stop`,timeout:30}]},Wi(o,r),o}import{existsSync as qi,mkdirSync as Zi,readFileSync as Xi,renameSync as Qi,writeFileSync as es}from"node:fs";import{dirname as ts}from"node:path";function W(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function os(e,t){Zi(ts(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;es(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Qi(o,e)}function Mo(e){if(!qi(e))return{};let t=Xi(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Agy MCP config at ${e}: parse error. Not overwriting.`)}if(!W(o))throw new Error(`Invalid existing Agy MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function No(e,t){return W(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function Re(e,t,o,r){let n=Mo(e),i=n.mcpServers;if(i!==void 0&&!W(i))throw new Error(`Invalid existing Agy MCP config: mcpServers must be an object in ${e}.`);let s=W(i)?{...i}:{},c=s[o];if(No(c,t)&&!r)return{installed:!0,changed:!1};s[o]={command:t,args:["mcp"]};let a={...n,mcpServers:s};os(e,a);let u=Mo(e).mcpServers;if(!W(u)||!No(u[o],t))throw new Error(`Agy MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function Fo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...Re(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(r==="both"){let s=me(),c=ye({cwd:e.cwd}),a=Re(s,t,o,e.force??!1),l=Re(c,t,o,e.force??!1);return{installed:!0,changed:a.changed||l.changed,configFile:s,serverName:o,command:t,args:["mcp"]}}let n=r==="workspace"?ye({cwd:e.cwd}):me();return{...Re(n,t,o,e.force??!1),configFile:n,serverName:o,command:t,args:["mcp"]}}var as=`# ToolNet Memory Continuity

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
`;function ls(e,t){$o(cs(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;ss(o,t,{encoding:"utf8",mode:384}),is(o,e)}function _o(e,t){rs(e)&&ns(e,"utf8")===t||ls(e,t)}function Do(e={}){let t=e.pluginName??"toolnet-memory",o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.pluginRoot??he(t),n=Pe(r,"plugin.json"),i=Pe(r,"mcp_config.json"),s=Pe(r,"hooks.json"),c=Pe(r,"rules","toolnet-memory-continuity.md");return $o(r,{recursive:!0,mode:448}),_o(n,`${JSON.stringify({$schema:"https://antigravity.google/schemas/v1/plugin.json",name:t,description:"Persistent project continuity and memory for Antigravity coding sessions."},null,2)}
`),Fo({configFile:i,binary:o,serverName:"toolnet-memory",force:e.force}),Ao({hooksFile:s,binary:o,pluginName:t}),_o(c,`${as.trim()}
`),{installed:!0,pluginRoot:r,files:[n,i,s,c]}}import{existsSync as ds,mkdirSync as Ko,readFileSync as ps,writeFileSync as Go}from"node:fs";import{join as Jo}from"node:path";var us="memory_agent_ask";function Ho(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${us}

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
`.trim()}var Lo="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",it="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function gs(e={}){let t=so();Ko(_(),{recursive:!0});let o=`${Lo}
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


${Ho()}

${it}`,r=ds(t)?ps(t,"utf8"):"",n=r.indexOf(Lo),i=r.indexOf(it);return n>=0&&i>=n?r=r.slice(0,n)+o+r.slice(i+it.length):(r=r.trimEnd(),r&&(r+=`

`),r+=o),Go(t,r.trimEnd()+`
`,{encoding:"utf8",mode:384}),t}function Bo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[];o.push(gs({cwd:e.cwd}));let r=e.scope??"global",n=[];if((r==="global"||r==="both")&&n.push(e.directory??io()),r==="project"||r==="both"){let i=e.cwd??process.cwd();n.push(Jo(i,".opencode","plugins"))}for(let i of n){Ko(i,{recursive:!0});let s=Jo(i,"toolnet-memory.js"),c=`
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
`;Go(s,c.trimStart(),{encoding:"utf8",mode:384}),o.push(s)}return o}import{existsSync as zo,mkdirSync as fs,readFileSync as ms,renameSync as ys,writeFileSync as hs}from"node:fs";import{dirname as Yo,join as ks}from"node:path";function q(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function bs(e,t){fs(Yo(e),{recursive:!0});let o=`${e}.tmp-${process.pid}-${Date.now()}`;hs(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),ys(o,e)}function Uo(e){if(!zo(e))return{};let t=ms(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing OpenCode config at ${e}: parse error. Not overwriting.`)}if(!q(o))throw new Error(`Invalid existing OpenCode config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Vo(e,t){if(!q(e))return!1;let o=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(o)&&o.length===2&&o[0]===t&&o[1]==="mcp"}function Ee(e,t,o,r){let n=ks(Yo(e),"opencode.jsonc"),i=zo(n)?n:void 0,s=Uo(e),c=s.mcp;if(c!==void 0&&!q(c))throw new Error(`Invalid existing OpenCode config: mcp must be an object in ${e}.`);let a=q(c)?{...c}:{},l=a[o];if(Vo(l,t)&&!r)return{installed:!0,changed:!1,preservedJsonc:i};a[o]={type:"local",command:[t,"mcp"],enabled:!0};let u={...s,mcp:a};bs(e,u);let d=Uo(e);if(!q(d.mcp)||!Vo(d.mcp[o],t))throw new Error(`OpenCode MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0,preservedJsonc:i}}function Wo(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...Ee(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:[t,"mcp"]};if(r==="both"){let s=Be(),c=Ue({cwd:e.cwd}),a=Ee(s,t,o,e.force??!1),l=Ee(c,t,o,e.force??!1);return{installed:!0,changed:a.changed||l.changed,configFile:s,serverName:o,command:[t,"mcp"],preservedJsonc:a.preservedJsonc??l.preservedJsonc}}let n=r==="project"?Ue({cwd:e.cwd}):Be();return{...Ee(n,t,o,e.force??!1),configFile:n,serverName:o,command:[t,"mcp"]}}import{existsSync as js,mkdirSync as qo,readFileSync as Is,writeFileSync as Zo}from"node:fs";import{homedir as Xo}from"node:os";import{dirname as Qo,join as st}from"node:path";function vs(e){let t=[],o=/"((?:\\.|[^"\\])*)"|'([^']*)'/g,r;for(;r=o.exec(e);){let n=r[1]??r[2]??"";try{t.push(r[1]!==void 0?JSON.parse(`"${n}"`):n)}catch{t.push(n)}}return t}function er(e={}){let t=e.configFile??st(process.env.CODEX_HOME??st(Xo(),".codex"),"config.toml"),o=e.previousFile??st(Xo(),".config","toolnet-memory","codex-notify-previous.json");qo(Qo(t),{recursive:!0}),qo(Qo(o),{recursive:!0});let r=js(t)?Is(t,"utf8"):"",n=e.binary??"toolnet-memory",i=`notify = [${JSON.stringify(n)}, "session:codex-notify"]`,s=r.split(`
`),c=s.findIndex(p=>/^\s*\[/.test(p));c<0&&(c=s.length);let a=-1,l=-1;for(let p=0;p<c;p+=1)if(/^\s*notify\s*=/.test(s[p])){if(a=p,l=p,s[p].includes("[")&&!s[p].includes("]"))for(;l+1<c&&(l+=1,!s[l].includes("]")););break}let u=[];if(a>=0){let p=s.slice(a,l+1).join(`
`);u=vs(p),s.splice(a,l-a+1,i)}else c=s.findIndex(p=>/^\s*\[/.test(p)),c<0&&(c=s.length),s.splice(c,0,i);let d=u.length>=2&&u[u.length-1]==="session:codex-notify";return u.length>0&&!d&&Zo(o,JSON.stringify(u,null,2)+`
`,{encoding:"utf8",mode:384}),r=s.join(`
`),r.endsWith(`
`)||(r+=`
`),Zo(t,r,{encoding:"utf8",mode:384}),{configFile:t,previousFile:o,preservedPrevious:u.length>0&&!d}}import{existsSync as ws,mkdirSync as Ss,readFileSync as xs,writeFileSync as Cs}from"node:fs";import{homedir as Os}from"node:os";import{dirname as Rs,join as tr}from"node:path";function Ps(e){return`'${e.replace(/'/g,"'\\''")}'`}function or(e={}){let t=e.hooksFile??tr(process.env.CODEX_HOME??tr(Os(),".codex"),"hooks.json");Ss(Rs(t),{recursive:!0});let o={};if(ws(t))try{o=JSON.parse(xs(t,"utf8"))}catch(c){throw new Error(`Invalid existing Codex hooks.json: ${c instanceof Error?c.message:String(c)}`)}let r=o.hooks&&typeof o.hooks=="object"&&!Array.isArray(o.hooks)?o.hooks:{};o.hooks=r;let i=(Array.isArray(r.SessionStart)?r.SessionStart:[]).filter(c=>{try{return!JSON.stringify(c).includes("session:codex-context")}catch{return!0}}),s=e.binary??"toolnet-memory";return i.push({matcher:"startup|resume|clear|compact",hooks:[{type:"command",command:`${Ps(s)} session:codex-context`,timeout:15,additionalContextLimit:1e3,statusMessage:"Loading ToolNet project continuity"}]}),r.SessionStart=i,Cs(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),t}import{spawnSync as Es}from"node:child_process";function ct(e,t){return Es(e,t,{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}function rr(e,t){let o=ct(e,["mcp","get",t,"--json"]);if(o.status!==0||!o.stdout)return null;try{return JSON.parse(o.stdout)}catch{return null}}function nr(e,t){return e.enabled!==!1&&e.transport?.type==="stdio"&&e.transport?.command===t&&Array.isArray(e.transport?.args)&&e.transport?.args.length===1&&e.transport.args[0]==="mcp"}function ir(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.codexBinary??"codex",r=e.serverName??"toolnet-memory",n=rr(o,r);if(n&&nr(n,t))return{installed:!0,changed:!1,serverName:r,command:t,args:["mcp"]};if(n){let c=ct(o,["mcp","remove",r]);if(c.status!==0)return{installed:!1,changed:!1,serverName:r,command:t,args:["mcp"],error:(c.stderr||c.stdout||"Unable to remove old ToolNet MCP configuration.").trim()}}let i=ct(o,["mcp","add",r,"--",t,"mcp"]);if(i.status!==0)return{installed:!1,changed:!1,serverName:r,command:t,args:["mcp"],error:(i.stderr||i.stdout||"Unable to register ToolNet MCP.").trim()};let s=rr(o,r);return!s||!nr(s,t)?{installed:!1,changed:!0,serverName:r,command:t,args:["mcp"],error:"Codex accepted MCP registration but verification did not match expected ToolNet command."}:{installed:!0,changed:!0,serverName:r,command:t,args:["mcp"]}}import{existsSync as Ts,mkdirSync as As,readFileSync as Ms,renameSync as Ns,rmSync as Fs,writeFileSync as _s}from"node:fs";import{dirname as $s}from"node:path";function Z(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Ds(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function Hs(e){if(!Ts(e))return{};let t;try{t=JSON.parse(Ms(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude settings.json: ${o instanceof Error?o.message:String(o)}`)}if(!Z(t))throw new Error("Invalid existing Claude settings.json: root must be a JSON object.");return t}function at(e){if(e===void 0)return[];if(!Array.isArray(e))throw new Error("Invalid existing Claude settings.json: hook event must be an array.");let t=[];for(let o of e){if(!Z(o)){t.push(o);continue}let r=o.hooks;if(!Array.isArray(r)){t.push(o);continue}let n=r.filter(i=>{if(!Z(i))return!0;let s=i.command;return!(typeof s=="string"&&s.includes("session:claude-hook"))});n.length!==0&&t.push({...o,hooks:n})}return t}function lt(e){return{type:"command",command:e,timeout:10}}function Js(e,t){As($s(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{_s(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Ns(o,e)}finally{Fs(o,{force:!0})}}function sr(e={}){let t=e.settingsFile??ao(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=Hs(t),n=r.hooks;if(n!==void 0&&!Z(n))throw new Error("Invalid existing Claude settings.json: hooks must be an object.");let i=Z(n)?{...n}:{},s=`${Ds(o)} session:claude-hook`,c=at(i.SessionStart);c.push({matcher:"startup|resume|clear|compact",hooks:[lt(s)]}),i.SessionStart=c;let a=at(i.PostToolUse);a.push({matcher:"Edit|Write",hooks:[lt(s)]}),i.PostToolUse=a;let l=at(i.Stop);l.push({hooks:[lt(s)]}),i.Stop=l;let u={...r,hooks:i},d=JSON.stringify(r),p=JSON.stringify(u);return d===p?{settingsFile:t,changed:!1}:(Js(t,u),{settingsFile:t,changed:!0})}import{existsSync as Ls,mkdirSync as Ks,readFileSync as Gs,renameSync as Bs,rmSync as Us,writeFileSync as Vs}from"node:fs";import{dirname as zs}from"node:path";function X(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function cr(e){if(!Ls(e))return{};let t;try{t=JSON.parse(Gs(e,"utf8"))}catch(o){throw new Error(`Invalid existing Claude Code config: ${o instanceof Error?o.message:String(o)}`)}if(!X(t))throw new Error("Invalid existing Claude Code config: root must be a JSON object.");return t}function ar(e,t){if(!X(e))return!1;let o=e.args;return e.type==="stdio"&&e.command===t&&Array.isArray(o)&&o.length===1&&o[0]==="mcp"}function Ys(e,t){Ks(zs(e),{recursive:!0});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Vs(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Bs(o,e)}finally{Us(o,{force:!0})}}function lr(e={}){let t=e.stateFile??lo(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=cr(t),i=n.mcpServers;if(i!==void 0&&!X(i))throw new Error("Invalid existing Claude Code config: mcpServers must be an object.");let s=X(i)?{...i}:{},c=s[r];if(ar(c,o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:[o,"mcp"],repaired:!1};let a=c!==void 0;s[r]={type:"stdio",command:o,args:["mcp"]},Ys(t,{...n,mcpServers:s});let u=cr(t).mcpServers;if(!X(u)||!ar(u[r],o))throw new Error("Claude Code MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:[o,"mcp"],repaired:a}}function ur(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=sr({binary:t,settingsFile:e.settingsFile}),r=lr({binary:t,stateFile:e.stateFile});return{hooks:o,mcp:r,files:[o.settingsFile,r.configFile]}}import{existsSync as Ws,mkdirSync as qs,readFileSync as Zs,renameSync as Xs,rmSync as Qs,writeFileSync as ec}from"node:fs";import{dirname as tc}from"node:path";var $="ToolNet Memory - ";function gr(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function oc(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function dr(e){if(!Ws(e))return{};let t=Zs(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro hooks file at ${e}: parse error. Not overwriting.`)}if(!gr(o))throw new Error(`Invalid existing Kiro hooks file at ${e}: root must be a JSON object. Not overwriting.`);return o}function pr(e){return gr(e)?typeof e.name=="string"&&e.name.startsWith($):!1}function Q(e){return{type:"command",command:e}}function rc(e){return[{name:`${$}Session Start`,description:"Inject compact local ToolNet continuity and capture Kiro session activation.",trigger:"SessionStart",action:Q(e),timeout:10,enabled:!0},{name:`${$}Prompt Continuity`,description:"Capture prompts and refresh ToolNet guidance only for resume/continue requests.",trigger:"UserPromptSubmit",action:Q(e),timeout:10,enabled:!0},{name:`${$}Raw History Guard`,description:"Prevent Kiro from reconstructing continuity from raw ToolNet/agent session history.",trigger:"PreToolUse",matcher:"*",action:Q(e),timeout:10,enabled:!0},{name:`${$}Tool Capture`,description:"Capture durable tool activity while filtering noisy read-only events.",trigger:"PostToolUse",matcher:"*",action:Q(e),timeout:15,enabled:!0},{name:`${$}Final Flush`,description:"Flush pending Kiro WAL events when the assistant finishes a turn.",trigger:"Stop",action:Q(e),timeout:30,enabled:!0}]}function nc(e,t){qs(tc(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{ec(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Xs(o,e)}finally{Qs(o,{force:!0})}}function Te(e,t,o){let r=dr(e);if(r.version!==void 0&&r.version!=="v1")throw new Error(`Unsupported existing Kiro hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!Array.isArray(n))throw new Error("Invalid existing Kiro hooks file: hooks must be an array.");let i=Array.isArray(n)?n.filter(l=>!pr(l)):[],s=rc(t),c={...r,version:"v1",hooks:[...i,...s]};if(!o&&JSON.stringify(r)===JSON.stringify(c))return{changed:!1,hookCount:s.length};nc(e,c);let a=dr(e);if(a.version!=="v1"||!Array.isArray(a.hooks)||a.hooks.filter(pr).length!==s.length)throw new Error("Kiro hooks were written but verification failed.");return{changed:!0,hookCount:s.length}}function fr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=`${oc(t)} session:kiro-hook`;if(e.hooksFile){let s=Te(e.hooksFile,r,e.force??!1);return{hooksFile:e.hooksFile,...s}}if(o==="both"){let s=qe(),c=Ze({cwd:e.cwd}),a=Te(s,r,e.force??!1),l=Te(c,r,e.force??!1);return{hooksFile:s,changed:a.changed||l.changed,hookCount:a.hookCount}}let n=o==="project"?Ze({cwd:e.cwd}):qe(),i=Te(n,r,e.force??!1);return{hooksFile:n,...i}}import{existsSync as ic,mkdirSync as sc,readFileSync as cc,renameSync as ac,rmSync as lc,writeFileSync as uc}from"node:fs";import{dirname as dc}from"node:path";function ee(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function mr(e){if(!ic(e))return{};let t=cc(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing Kiro MCP config at ${e}: parse error. Not overwriting.`)}if(!ee(o))throw new Error(`Invalid existing Kiro MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function yr(e,t){return ee(e)?e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&e.disabled===!1:!1}function pc(e,t){sc(dc(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{uc(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),ac(o,e)}finally{lc(o,{force:!0})}}function Ae(e,t,o,r){let n=mr(e),i=n.mcpServers;if(i!==void 0&&!ee(i))throw new Error(`Invalid existing Kiro MCP config: mcpServers must be an object in ${e}.`);let s=ee(i)?{...i}:{},c=s[o];if(yr(c,t)&&!r)return{installed:!0,changed:!1};s[o]={command:t,args:["mcp"],disabled:!1};let a={...n,mcpServers:s};pc(e,a);let u=mr(e).mcpServers;if(!ee(u)||!yr(u[o],t))throw new Error(`Kiro MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0}}function hr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...Ae(e.configFile,t,o,e.force??!1),configFile:e.configFile,serverName:o,command:t,args:["mcp"]};if(r==="both"){let s=ke(),c=We({cwd:e.cwd}),a=Ae(s,t,o,e.force??!1),l=Ae(c,t,o,e.force??!1);return{installed:!0,changed:a.changed||l.changed,configFile:s,serverName:o,command:t,args:["mcp"]}}let n=r==="project"?We({cwd:e.cwd}):ke();return{...Ae(n,t,o,e.force??!1),configFile:n,serverName:o,command:t,args:["mcp"]}}function kr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=hr({binary:t,configFile:e.configFile,scope:e.scope,cwd:e.cwd,force:e.force}),r=fr({binary:t,hooksFile:e.hooksFile,scope:e.scope,cwd:e.cwd,force:e.force});return{installed:o.installed,changed:o.changed||r.changed,mcp:o,hooks:r,files:[o.configFile,r.hooksFile]}}import{existsSync as gc,mkdirSync as fc,readFileSync as mc,renameSync as yc,rmSync as hc,writeFileSync as kc}from"node:fs";import{dirname as bc}from"node:path";function ut(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function jc(e){if(!gc(e))return{};let t=mc(e,"utf8").trim();if(!t)return{};let o;try{o=JSON.parse(t)}catch{throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: parse error. Not overwriting.`)}if(!ut(o))throw new Error(`Invalid existing ToolNet CLI MCP config at ${e}: root must be a JSON object. Not overwriting.`);return o}function Ic(e,t){fc(bc(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{kc(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),yc(o,e)}finally{hc(o,{force:!0})}}function br(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??go({cwd:e.cwd}),r=jc(o),n="toolnet-memory";if(ut(r.mcpServers)&&r.mcpServers[n]!=null&&!e.force)return{installed:!0,changed:!1,configFile:o};let s=ut(r.mcpServers)?{...r.mcpServers}:{};return s[n]={command:t,args:["mcp"]},r.mcpServers=s,Ic(o,r),{installed:!0,changed:!0,configFile:o}}function jr(e={}){let t=e.binary??"toolnet-memory",o=br({binary:t,configFile:e.configFile,force:e.force,cwd:e.cwd});return{installed:o.installed,changed:o.changed,mcp:{...o,configured:o.installed},files:[o.configFile]}}import{mkdirSync as Pc,existsSync as Ec}from"node:fs";import{dirname as Tc}from"node:path";import{existsSync as vc,mkdirSync as wc,readFileSync as Sc,renameSync as xc,rmSync as Cc,writeFileSync as Oc}from"node:fs";import{dirname as Rc}from"node:path";function m(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function C(e,t){if(!vc(e))return{};let o=Sc(e,"utf8").trim();if(!o)return{};let r;try{r=JSON.parse(o)}catch(n){throw new Error(`Invalid existing ${t} MCP config: ${n instanceof Error?n.message:String(n)}`)}if(!m(r))throw new Error(`Invalid existing ${t} MCP config: root must be a JSON object.`);return r}function D(e,t){wc(Rc(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{Oc(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),xc(o,e)}finally{Cc(o,{force:!0})}}function Ir(e={}){let t=e.binary??"toolnet-memory",o=e.configFile??et(),r=Tc(o);Ec(r)||Pc(r,{recursive:!0});let n=C(o,"Kilo"),i=n.mcp;if(i!==void 0&&!m(i))throw new Error("Invalid existing Kilo config: mcp must be an object.");let s=m(i)?{...i}:{},c="toolnet-memory";return m(s[c])&&!e.force?{installed:!0,changed:!1,configFile:o,configured:!0}:(s[c]={type:"local",command:[t,"mcp"],enabled:!0,timeout:1e4},D(o,{...n,mcp:s}),{installed:!0,changed:!0,configFile:o,configured:!0})}function vr(e={}){let t=e.binary??"toolnet-memory",o=Ir({binary:t,configFile:e.configFile,force:e.force});return{installed:o.installed,changed:o.changed,mcp:o,files:[o.configFile]}}import{existsSync as Ac,mkdirSync as Mc,readFileSync as Nc,renameSync as Fc,rmSync as _c,writeFileSync as $c}from"node:fs";import{dirname as Dc}from"node:path";function g(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function v(e,t){if(!Ac(e))return{};let o=Nc(e,"utf8").trim();if(!o)return{};let r;try{r=JSON.parse(o)}catch(n){throw new Error(`Invalid existing ${t} hooks file: ${n instanceof Error?n.message:String(n)}`)}if(!g(r))throw new Error(`Invalid existing ${t} hooks file: root must be a JSON object.`);return r}function H(e,t){Mc(Dc(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{$c(o,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Fc(o,e)}finally{_c(o,{force:!0})}}function dt(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}var te=[["sessionStart",10],["beforeSubmitPrompt",10],["preToolUse",10],["postToolUse",15],["afterAgentResponse",15],["stop",30]];function wr(e){return g(e)&&typeof e.command=="string"&&e.command.includes("session:cursor-hook")}function Hc(e,t,o){let n={type:"command",command:`TOOLNET_HOOK_EVENT=${dt(e)} ${dt(t)} session:cursor-hook`,timeout:o};return e==="preToolUse"&&(n.matcher=".*"),n}function pt(e={}){let t=e.hooksFile??Ie(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=v(t,"Cursor");if(r.version!==void 0&&r.version!==1)throw new Error(`Unsupported existing Cursor hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!g(n))throw new Error("Invalid existing Cursor hooks file: hooks must be an object.");let i=g(n)?{...n}:{};for(let[l,u]of te){let d=i[l];if(d!==void 0&&!Array.isArray(d))throw new Error(`Invalid existing Cursor hooks file: hooks.${l} must be an array.`);let p=Array.isArray(d)?d.filter(k=>!wr(k)):[];i[l]=[...p,Hc(l,o,u)]}let s={...r,version:1,hooks:i};if(JSON.stringify(r)===JSON.stringify(s))return{hooksFile:t,changed:!1,hookCount:te.length};H(t,s);let c=v(t,"Cursor");if(c.version!==1||!g(c.hooks))throw new Error("Cursor hooks were written but verification failed.");let a=0;for(let[l]of te){let u=c.hooks[l];if(!Array.isArray(u))throw new Error("Cursor hooks were written but verification failed.");a+=u.filter(wr).length}if(a!==te.length)throw new Error("Cursor hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:te.length}}function Sr(e,t){return m(e)?(e.type===void 0||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function gt(e={}){let t=e.configFile??je(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=C(t,"Cursor"),i=n.mcpServers;if(i!==void 0&&!m(i))throw new Error("Invalid existing Cursor MCP config: mcpServers must be an object.");let s=m(i)?{...i}:{};if(Sr(s[r],o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};s[r]={type:"stdio",command:o,args:["mcp"]},D(t,{...n,mcpServers:s});let a=C(t,"Cursor").mcpServers;if(!m(a)||!Sr(a[r],o))throw new Error("Cursor MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}import{mkdirSync as Jc,readFileSync as xr,renameSync as Lc,rmSync as Kc,writeFileSync as Gc}from"node:fs";import{dirname as Bc}from"node:path";var ft=`---
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
`;function Uc(e,t){Jc(Bc(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Gc(o,t,{encoding:"utf8",mode:384}),Lc(o,e)}finally{Kc(o,{force:!0})}}function Cr(e){let t=e.ruleFile??bo(e.projectRoot);try{if(xr(t,"utf8")===ft)return{ruleFile:t,changed:!1}}catch{}if(Uc(t,ft),xr(t,"utf8")!==ft)throw new Error("Cursor ToolNet project rule was written but verification failed.");return{ruleFile:t,changed:!0}}import{spawnSync as Vc}from"node:child_process";import{existsSync as J,statSync as zc}from"node:fs";import{dirname as Yc,join as Wc,parse as qc,resolve as yt}from"node:path";function Or(e){let t=yt(e);if(!J(t))throw new Error(`Project path does not exist: ${t}`);if(!zc(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);return t}function Me(e){return Wc(e,".toolnet","project.json")}function Zc(e){let t=yt(e),o=qc(t).root;for(;;){if(J(Me(t)))return t;if(t===o)return;let r=Yc(t);if(r===t)return;t=r}}function mt(e){let t=Vc("git",["rev-parse","--show-toplevel"],{cwd:e,encoding:"utf8",timeout:5e3});if(t.status!==0)return;let o=t.stdout.trim();return o?yt(o):void 0}function w(e={}){let t=Or(e.cwd??process.cwd());if(e.project){let n=Or(e.project),i=Me(n),s=mt(n);return{root:n,source:"explicit",eligible:!0,toolnetProject:J(i),manifestFile:J(i)?i:void 0,gitRoot:s}}let o=Zc(t);if(o){let n=Me(o);return{root:o,source:"toolnet",eligible:!0,toolnetProject:!0,manifestFile:n,gitRoot:mt(o)}}let r=mt(t);if(r){let n=Me(r);return{root:r,source:"git",eligible:!0,toolnetProject:J(n),manifestFile:J(n)?n:void 0,gitRoot:r}}return{root:t,source:"cwd",eligible:!1,toolnetProject:!1}}function Tr(e,t={}){let o=[],r=e.indexOf("--scope");if(r>=0){let i=e[r+1];if(i!=="global"&&i!=="project"&&i!=="both")throw new Error(`Invalid --scope value: ${String(i)}`);o.push(i)}e.includes("--global")&&o.push("global"),e.includes("--both")&&o.push("both");let n=Array.from(new Set(o));if(n.length>1)throw new Error(`Conflicting integration scopes: ${n.join(", ")}`);return n[0]??t.defaultScope??"global"}function Rr(e,t){return{install:e,effective:t}}function S(e,t){return{surface:e,global:Rr(t.globalInstall,t.effective==="global"||t.effective==="both"),project:Rr(t.projectInstall,t.effective==="project"||t.effective==="both"),effective:t.effective,risk:t.risk??"none",dedupeRequired:t.dedupeRequired??!1,trustRequired:t.trustRequired??t.projectInstall,note:t.note}}function Xc(e){return{mcp:S("mcp",{globalInstall:!0,projectInstall:!1,effective:"global"}),hooks:S("hooks",{globalInstall:!0,projectInstall:!1,effective:"global"}),work:S("work",{globalInstall:e==="grok",projectInstall:!1,effective:e==="grok"?"global":"none",note:e==="grok"?"Grok supports a global ToolNet continuity skill.":"Cursor/Copilot work instructions remain project-scoped."})}}function Pr(e){return{mcp:S("mcp",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),hooks:S("hooks",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),work:S("work",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!1,note:e==="cursor"?"Use .cursor/rules/toolnet-memory.mdc.":e==="copilot"?"Use .github/instructions/toolnet-memory.instructions.md.":"Use .grok/skills/toolnet-continuity/SKILL.md."})}}function Er(e){return{mcp:S("mcp",{globalInstall:!0,projectInstall:!0,effective:"project",risk:e==="cursor"?"precedence-unverified":"shadowed-global",trustRequired:!0,note:e==="cursor"?"Project ToolNet MCP is the intended effective definition; native same-name precedence must be E2E certified before release.":"Global remains useful outside the project; same-name project definition wins inside the project."}),hooks:S("hooks",{globalInstall:!0,projectInstall:!0,effective:"both",risk:"additive-duplicate",dedupeRequired:!0,trustRequired:!0,note:"Global and project hook sources can both execute for the same native event."}),work:S("work",{globalInstall:e==="grok",projectInstall:!0,effective:"project",risk:e==="grok"?"shadowed-global":"none",trustRequired:!1,note:e==="cursor"?"Project rule is authoritative.":e==="copilot"?"Project instruction is authoritative.":"Project skill shadows the same-name global skill inside the project."})}}function L(e){let{agent:t,scope:o,project:r}=e;return(o==="project"||o==="both")&&(!r||!r.eligible)?{agent:t,requestedScope:o,project:r,surfaces:o==="both"?Er(t):Pr(t),canInstall:!1,reason:"Project scope requires an explicit project, existing ToolNet project, or Git repository root."}:{agent:t,requestedScope:o,project:r,surfaces:o==="global"?Xc(t):o==="project"?Pr(t):Er(t),canInstall:!0}}function Ar(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.rule?.changed)}function Mr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:w({project:e.projectRoot}),n=L({agent:"cursor",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Cursor project integration scope cannot be resolved.");let i,s;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(i={},n.surfaces.mcp.global.install&&(i.mcp=gt({binary:t,configFile:e.configFile??je()})),n.surfaces.hooks.global.install&&(i.hooks=pt({binary:t,hooksFile:e.hooksFile??Ie()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Cursor project integration requires an eligible project root.");s={},n.surfaces.mcp.project.install&&(s.mcp=gt({binary:t,configFile:e.projectConfigFile??ho(r.root)})),n.surfaces.hooks.project.install&&(s.hooks=pt({binary:t,hooksFile:e.projectHooksFile??ko(r.root)})),n.surfaces.work.project.install&&(s.rule=Cr({projectRoot:r.root,ruleFile:e.projectRuleFile}))}let c=s?.mcp??i?.mcp,a=s?.hooks??i?.hooks;if(!c||!a)throw new Error("Cursor integration did not produce an effective MCP/hooks installation.");let l=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.rule?.ruleFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.rule?.ruleFile].filter(u=>typeof u=="string")));return{installed:!0,changed:Ar(i)||Ar(s),scope:o,plan:n,project:r,global:i,projectScope:s,mcp:c,hooks:a,rule:s?.rule,files:l}}var oe=[["sessionStart",10],["userPromptSubmitted",10],["userPromptTransformed",10],["preToolUse",10],["postToolUse",15],["agentStop",30]];function Qc(e){if(typeof e.command=="string")return e.command;if(typeof e.bash=="string")return e.bash}function Nr(e){return g(e)&&Qc(e)?.includes("session:copilot-hook")===!0}function ea(e,t,o){let r={type:"command",command:`${t} session:copilot-hook`,env:{TOOLNET_HOOK_EVENT:e},timeoutSec:o};return e==="preToolUse"&&(r.matcher=".*"),r}function ht(e={}){let t=e.hooksFile??we(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=v(t,"GitHub Copilot CLI");if(r.version!==void 0&&r.version!==1)throw new Error(`Unsupported existing GitHub Copilot CLI hooks version: ${String(r.version)}`);let n=r.hooks;if(n!==void 0&&!g(n))throw new Error("Invalid existing GitHub Copilot CLI hooks file: hooks must be an object.");let i=g(n)?{...n}:{};for(let[l,u]of oe){let d=i[l];if(d!==void 0&&!Array.isArray(d))throw new Error(`Invalid existing GitHub Copilot CLI hooks file: hooks.${l} must be an array.`);let p=Array.isArray(d)?d.filter(k=>!Nr(k)):[];i[l]=[...p,ea(l,o,u)]}let s={...r,version:1,hooks:i};if(JSON.stringify(r)===JSON.stringify(s))return{hooksFile:t,changed:!1,hookCount:oe.length};H(t,s);let c=v(t,"GitHub Copilot CLI");if(c.version!==1||!g(c.hooks))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");let a=0;for(let[l]of oe){let u=c.hooks[l];if(!Array.isArray(u))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");a+=u.filter(Nr).length}if(a!==oe.length)throw new Error("GitHub Copilot CLI hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:oe.length}}function Fr(e,t){return m(e)?(e.type===void 0||e.type==="local"||e.type==="stdio")&&e.command===t&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&Array.isArray(e.tools)&&e.tools.length===1&&e.tools[0]==="*":!1}function kt(e={}){let t=e.configFile??ve(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=C(t,"GitHub Copilot CLI"),i=n.mcpServers;if(i!==void 0&&!m(i))throw new Error("Invalid existing GitHub Copilot CLI MCP config: mcpServers must be an object.");let s=m(i)?{...i}:{};if(Fr(s[r],o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};s[r]={type:"stdio",command:o,args:["mcp"],tools:["*"]},D(t,{...n,mcpServers:s});let a=C(t,"GitHub Copilot CLI").mcpServers;if(!m(a)||!Fr(a[r],o))throw new Error("GitHub Copilot CLI MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}import{mkdirSync as ta,readFileSync as _r,renameSync as oa,rmSync as ra,writeFileSync as na}from"node:fs";import{dirname as ia}from"node:path";var bt=`---
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
`;function sa(e,t){ta(ia(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{na(o,t,{encoding:"utf8",mode:384}),oa(o,e)}finally{ra(o,{force:!0})}}function $r(e){let t=e.instructionFile??wo(e.projectRoot);try{if(_r(t,"utf8")===bt)return{instructionFile:t,changed:!1}}catch{}if(sa(t,bt),_r(t,"utf8")!==bt)throw new Error("Copilot ToolNet project instruction verification failed.");return{instructionFile:t,changed:!0}}function Dr(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.instruction?.changed)}function Hr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:w({project:e.projectRoot}),n=L({agent:"copilot",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Copilot project integration scope cannot be resolved.");let i,s;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(i={},n.surfaces.mcp.global.install&&(i.mcp=kt({binary:t,configFile:e.configFile??ve()})),n.surfaces.hooks.global.install&&(i.hooks=ht({binary:t,hooksFile:e.hooksFile??we()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Copilot project integration requires an eligible project root.");s={},n.surfaces.mcp.project.install&&(s.mcp=kt({binary:t,configFile:e.projectConfigFile??Io(r.root)})),n.surfaces.hooks.project.install&&(s.hooks=ht({binary:t,hooksFile:e.projectHooksFile??vo(r.root)})),n.surfaces.work.project.install&&(s.instruction=$r({projectRoot:r.root,instructionFile:e.projectInstructionFile}))}let c=s?.mcp??i?.mcp,a=s?.hooks??i?.hooks;if(!c||!a)throw new Error("Copilot integration did not produce effective MCP/hooks.");let l=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.instruction?.instructionFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.instruction?.instructionFile].filter(u=>typeof u=="string")));return{installed:!0,changed:Dr(i)||Dr(s),scope:o,plan:n,project:r,global:i,projectScope:s,mcp:c,hooks:a,instruction:s?.instruction,files:l}}import{existsSync as ca,mkdirSync as aa,readFileSync as Jr,renameSync as la,rmSync as ua,writeFileSync as da}from"node:fs";import{dirname as pa}from"node:path";var jt=`---
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
`;function ga(e,t){aa(pa(e),{recursive:!0,mode:448});let o=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{da(o,t,{encoding:"utf8",mode:384}),la(o,e)}finally{ua(o,{force:!0})}}function It(e={}){let t=e.skillFile??Oe();if(ca(t)&&Jr(t,"utf8")===jt)return{skillFile:t,changed:!1};if(ga(t,jt),Jr(t,"utf8")!==jt)throw new Error("Grok ToolNet continuity skill was written but verification failed.");return{skillFile:t,changed:!0}}var re=[["SessionStart",10],["UserPromptSubmit",10],["PreToolUse",10],["PostToolUse",15],["Stop",30]];function Lr(e){return!g(e)||!Array.isArray(e.hooks)?!1:e.hooks.some(t=>g(t)&&typeof t.command=="string"&&t.command.includes("session:grok-hook"))}function fa(e,t,o){let r={hooks:[{type:"command",command:`${t} session:grok-hook`,timeout:o,env:{TOOLNET_HOOK_EVENT:e}}]};return e==="PreToolUse"&&(r.matcher=".*"),r}function vt(e={}){let t=e.hooksFile??Ce(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=v(t,"Grok Build"),n=r.hooks;if(n!==void 0&&!g(n))throw new Error("Invalid existing Grok Build hooks file: hooks must be an object.");let i=g(n)?{...n}:{};for(let[l,u]of re){let d=i[l];if(d!==void 0&&!Array.isArray(d))throw new Error(`Invalid existing Grok Build hooks file: hooks.${l} must be an array.`);let p=Array.isArray(d)?d.filter(k=>!Lr(k)):[];i[l]=[...p,fa(l,o,u)]}let s={...r,hooks:i};if(JSON.stringify(r)===JSON.stringify(s))return{hooksFile:t,changed:!1,hookCount:re.length};H(t,s);let c=v(t,"Grok Build");if(!g(c.hooks))throw new Error("Grok Build hooks were written but verification failed.");let a=0;for(let[l]of re){let u=c.hooks[l];if(!Array.isArray(u))throw new Error("Grok Build hooks were written but verification failed.");a+=u.filter(Lr).length}if(a!==re.length)throw new Error("Grok Build hooks were written but verification failed.");return{hooksFile:t,changed:!0,hookCount:re.length}}import{existsSync as ma,mkdirSync as ya,readFileSync as ha,renameSync as ka,rmSync as ba,writeFileSync as ja}from"node:fs";import{dirname as Ia}from"node:path";function Kr(e){return ma(e)?ha(e,"utf8"):""}function va(e,t){ya(Ia(e),{recursive:!0,mode:448});let o=`${e}.tmp-${process.pid}-${Date.now()}`;try{ja(o,t,{encoding:"utf8",mode:384}),ka(o,e)}finally{ba(o,{force:!0})}}function wt(e){return e.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t")}function wa(e){return`[mcp_servers."${wt(e)}"]`}function Sa(e,t){return[wa(e),`command = "${wt(t)}"`,'args = ["mcp"]',"enabled = true"].join(`
`)}function xa(e){let t=e.trim();return t.startsWith("[")&&t.includes("]")}function Ne(e){return e.trim().replace(/\s+/g,"")}function Ca(e){return new Set([Ne(`[mcp_servers.${e}]`),Ne(`[mcp_servers."${e}"]`),Ne(`[mcp_servers.'${e}']`)])}function Br(e,t){let o=e.split(/\r?\n/),r=Ca(t),n=-1;for(let u=0;u<o.length;u+=1){let d=Ne(o[u].replace(/\s+#.*$/,""));if(r.has(d)){n=u;break}}if(n<0)return null;let i=o.length;for(let u=n+1;u<o.length;u+=1)if(xa(o[u])){i=u;break}let s=[],c=0;for(let u of o)s.push(c),c+=u.length+1;let a=s[n]??0,l=i>=o.length?e.length:s[i]??e.length;return{start:a,end:l}}function Oa(e,t,o){let r=`${Sa(t,o)}
`,n=Br(e,t);if(n){let i=e.slice(0,n.start),s=e.slice(n.end);return`${i}${r}${s.replace(/^\n+/,"")}`}return e.trim()?`${e.replace(/\s*$/,"")}

${r}`:r}function Gr(e,t,o){let r=Br(e,t);if(!r)return!1;let n=e.slice(r.start,r.end);return n.includes(`command = "${wt(o)}"`)&&/args\s*=\s*\[\s*"mcp"\s*\]/.test(n)&&/enabled\s*=\s*true/.test(n)}function St(e={}){let t=e.configFile??xe(),o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=e.serverName??"toolnet-memory",n=Kr(t);if(Gr(n,r,o))return{installed:!0,changed:!1,configFile:t,serverName:r,command:o,args:["mcp"]};let i=Oa(n,r,o);va(t,i);let s=Kr(t);if(!Gr(s,r,o))throw new Error("Grok Build MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:t,serverName:r,command:o,args:["mcp"]}}function Ur(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.skill?.changed)}function Vr(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=e.scope??"global",r=o==="global"?void 0:w({project:e.projectRoot}),n=L({agent:"grok",scope:o,project:r});if(!n.canInstall)throw new Error(n.reason??"Grok project integration scope cannot be resolved.");let i,s;if((n.surfaces.mcp.global.install||n.surfaces.hooks.global.install||n.surfaces.work.global.install)&&(i={},n.surfaces.mcp.global.install&&(i.mcp=St({binary:t,configFile:e.configFile??xe()})),n.surfaces.hooks.global.install&&(i.hooks=vt({binary:t,hooksFile:e.hooksFile??Ce()})),n.surfaces.work.global.install&&(i.skill=It({skillFile:e.skillFile??Oe()}))),n.surfaces.mcp.project.install||n.surfaces.hooks.project.install||n.surfaces.work.project.install){if(!r?.eligible)throw new Error("Grok project integration requires an eligible project root.");s={},n.surfaces.mcp.project.install&&(s.mcp=St({binary:t,configFile:e.projectConfigFile??xo(r.root)})),n.surfaces.hooks.project.install&&(s.hooks=vt({binary:t,hooksFile:e.projectHooksFile??Co(r.root)})),n.surfaces.work.project.install&&(s.skill=It({skillFile:e.projectSkillFile??Oo(r.root)}))}let c=s?.mcp??i?.mcp,a=s?.hooks??i?.hooks,l=s?.skill??i?.skill;if(!c||!a||!l)throw new Error("Grok integration did not produce effective MCP/hooks/skill.");let u=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.skill?.skillFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.skill?.skillFile].filter(d=>typeof d=="string")));return{installed:!0,changed:Ur(i)||Ur(s),scope:o,plan:n,project:r,global:i,projectScope:s,mcp:c,hooks:a,skill:l,files:u}}function zr(e={}){if(e.scope==="global")return{scope:"global",automatic:!1,reason:"explicit-global"};if(e.scope==="project"||e.scope==="both"){let o=w({cwd:e.cwd,project:e.projectRoot});if(!o.eligible)throw new Error(`Explicit ${e.scope} integration requires an explicit project, ToolNet project, or Git repository root.`);return{scope:e.scope,automatic:!1,project:o,reason:e.scope==="project"?"explicit-project":"explicit-both"}}let t=w({cwd:e.cwd,project:e.projectRoot});return t.toolnetProject?{scope:"both",automatic:!0,project:t,reason:"toolnet-project"}:{scope:"global",automatic:!0,reason:"no-toolnet-project"}}function Yr(){return To()}function xt(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",o=[],r=e.detections??Yr(),n=new Map(r.map(s=>[s.agent,s.detected])),i=zr({scope:e.scope,projectRoot:e.projectRoot,cwd:e.cwd});if(!(e.force===!0||n.get("agy")===!0))o.push({agent:"agy",detected:!1,installed:!1,targets:[]});else try{let c=Do({binary:t});o.push({agent:"agy",detected:!0,installed:!0,targets:c.files})}catch(c){o.push({agent:"agy",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("opencode")===!0))o.push({agent:"opencode",detected:!1,installed:!1,targets:[]});else try{let c=Bo({binary:t}),a=Wo({binary:t});o.push({agent:"opencode",detected:!0,installed:!0,targets:[...c,a.configFile,`mcp:${a.serverName}`]})}catch(c){o.push({agent:"opencode",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("claude")===!0))o.push({agent:"claude",detected:!1,installed:!1,targets:[]});else try{let c=ur({binary:t});o.push({agent:"claude",detected:!0,installed:!0,targets:[c.hooks.settingsFile,c.mcp.configFile,`mcp:${c.mcp.serverName}`]})}catch(c){o.push({agent:"claude",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("kiro")===!0))o.push({agent:"kiro",detected:!1,installed:!1,targets:[]});else try{let c=kr({...e.kiro??{},binary:t});o.push({agent:"kiro",detected:!0,installed:!0,targets:[c.mcp.configFile,`mcp:${c.mcp.serverName}`,c.hooks.hooksFile]})}catch(c){o.push({agent:"kiro",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("cursor")===!0))o.push({agent:"cursor",detected:!1,installed:!1,targets:[]});else try{let c=e.cursor??{},a=Mr({...c,binary:t,scope:c.scope??i.scope,projectRoot:c.projectRoot??i.project?.root});o.push({agent:"cursor",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(c){o.push({agent:"cursor",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("copilot")===!0))o.push({agent:"copilot",detected:!1,installed:!1,targets:[]});else try{let c=e.copilot??{},a=Hr({...c,binary:t,scope:c.scope??i.scope,projectRoot:c.projectRoot??i.project?.root});o.push({agent:"copilot",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(c){o.push({agent:"copilot",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("grok")===!0))o.push({agent:"grok",detected:!1,installed:!1,targets:[]});else try{let c=e.grok??{},a=Vr({...c,binary:t,scope:c.scope??i.scope,projectRoot:c.projectRoot??i.project?.root});o.push({agent:"grok",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(c){o.push({agent:"grok",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("toolnet-cli")===!0))o.push({agent:"toolnet-cli",detected:!1,installed:!1,targets:[]});else try{let c=e.toolnetCli??{},a=jr({...c,binary:t});o.push({agent:"toolnet-cli",detected:!0,installed:!0,targets:[a.mcp.configFile]})}catch(c){o.push({agent:"toolnet-cli",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("kilo")===!0))o.push({agent:"kilo",detected:!1,installed:!1,targets:[]});else try{let c=e.kilo??{},a=vr({...c,binary:t});o.push({agent:"kilo",detected:!0,installed:!0,targets:[a.mcp.configFile]})}catch(c){o.push({agent:"kilo",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||n.get("codex")===!0))o.push({agent:"codex",detected:!1,installed:!1,targets:[]});else try{let c=er({binary:t}),a=or({binary:t}),l=ir({binary:t});if(!l.installed)throw new Error(l.error??"Codex MCP registration failed");let u=[c.configFile,a,`mcp:${l.serverName}`];c.preservedPrevious&&u.push(c.previousFile),o.push({agent:"codex",detected:!0,installed:!0,targets:u})}catch(c){o.push({agent:"codex",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}return o}function Fe(e){switch(e){case"agy":return"Agy / Antigravity";case"opencode":return"OpenCode";case"claude":return"Claude Code";case"kiro":return"Kiro CLI";case"cursor":return"Cursor CLI";case"copilot":return"GitHub Copilot CLI";case"grok":return"Grok Build";case"toolnet-cli":return"ToolNet CLI";case"kilo":return"Kilo";case"codex":return"Codex";default:return e}}function Ra(e){console.log(""),console.log("ToolNet Memory Integration Detection"),console.log("===================================="),console.log("");for(let t of e){let o=Fe(t.agent);if(!t.detected){console.log(`\u25CB ${o}: not detected`);continue}console.log(`\u2713 ${o}: detected`);for(let r of t.evidence)console.log(`  ${r}`)}console.log("")}function Pa(e){console.log(""),console.log("ToolNet Memory AI Integrations"),console.log("=============================="),console.log("");for(let t of e){let o=Fe(t.agent);if(!t.detected){console.log(`- ${o}: not detected`);continue}if(t.installed){let r=t.scope?` [scope=${t.scope}]`:"";console.log(`\u2713 ${o}: automatic memory enabled${r}`),t.projectRoot&&console.log(`  project: ${t.projectRoot}`);continue}console.log(`\u2717 ${o}: integration failed`),t.error&&console.log(`  ${t.error}`)}console.log("")}function Ea(e,t){let o=e.indexOf(t);return o>=0?e[o+1]:void 0}function Ta(e){return e.includes("--scope")||e.includes("--global")||e.includes("--both")?Tr(e):void 0}async function Aa(){let e=process.argv.slice(2),t=e.includes("--all"),o=e.includes("--json"),r=e.includes("--detect-only"),n=Ta(e),i=Ea(e,"--project");if(r){let c=Yr();if(o){console.log(JSON.stringify(c,null,2));return}Ra(c);return}let s=xt({force:t,scope:n,projectRoot:i});if(o){console.log(JSON.stringify(s,null,2));return}Pa(s)}var Ma=process.argv[1]&&(process.argv[1].endsWith("auto-integrate.js")||process.argv[1].endsWith("auto-integrate.ts"));Ma&&Aa().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});function Zr(e){let t=Fa(e);if(!Ct(t))throw new Error(`Project path does not exist: ${t}`);if(!Na(t).isDirectory())throw new Error(`Project path is not a directory: ${t}`);return t}function Jf(e=process.cwd()){let t=Zr(e),o=new M().detect(t),r=qr(o.rootPath,".toolnet","project.json");if(!Ct(r))throw new Error(`ToolNet project initialization failed: ${r} was not created`);return{initialized:!0,project:{id:o.id,name:o.name,remote:o.remote,rootPath:o.rootPath},manifestFile:r}}async function _a(e=process.cwd(),t={}){let o=Zr(e),r={skipRemoteIdentity:t.skipRemoteIdentity,adoptRemote:t.adoptRemote,allowGitRebind:t.allowGitRebind},n=await Qt(o,r),i=n.project,s=qr(i.rootPath,".toolnet","project.json");if(!Ct(s))throw new Error(`ToolNet project initialization failed: ${s} was not created`);return{initialized:!0,project:{id:i.id,name:i.name,remote:i.remote,rootPath:i.rootPath},manifestFile:s,identity:{source:n.source,registry:n.registry,registryProvider:n.registryProvider,gitRemote:n.gitIdentity?.canonicalRemote,fingerprint:n.gitIdentity?.fingerprint}}}function Wr(e,t){let o=e.indexOf(t);if(o<0)return;let r=e[o+1];if(!(!r||r.startsWith("-")))return r}async function $a(){let e=process.argv.slice(2),t=e.includes("--json"),o=!e.includes("--no-integrate"),r=e.includes("--no-remote-identity"),n=e.includes("--rebind-git-identity"),i=Wr(e,"--adopt-remote"),s=Wr(e,"--project"),c=new Set(["--project","--adopt-remote"]),a=e.find((p,k)=>{if(p.startsWith("-"))return!1;let ne=e[k-1];return!(ne&&c.has(ne))}),l=s??a??process.cwd(),u=await Le("Resolving ToolNet project identity",()=>_a(l,{skipRemoteIdentity:r,adoptRemote:i,allowGitRebind:n}),{enabled:!t}),d=[];if(o&&(d=await Le("Detecting coding agents",()=>xt({projectRoot:u.project.rootPath}),{enabled:!t})),t){console.log(JSON.stringify({...u,integrations:d},null,2));return}if(console.log(""),console.log("ToolNet Memory"),console.log("=============="),console.log(""),console.log("\u2713 Project initialized"),console.log(""),console.log(`Project:  ${u.project.name}`),console.log(`ID:       ${u.project.id}`),console.log(`Remote:   ${u.project.remote??u.project.name}`),console.log(`Root:     ${u.project.rootPath}`),console.log(`Manifest: ${u.manifestFile}`),u.identity&&(console.log(`Identity: ${u.identity.source}`),console.log(`Registry: ${u.identity.registry}`),u.identity.gitRemote&&console.log(`Git:      ${u.identity.gitRemote}`)),console.log(""),o){console.log("AI integrations:");let p=d.filter(k=>k.detected&&k.installed);if(!p.length)console.log("  \u25CB No supported coding agent detected");else for(let k of p){let ne=Fe(k.agent),Xr=Ht(k.agent);console.log(`  \u2713 ${ne} \u2014 ${Xr}`)}console.log("")}console.log("Next: toolnet-memory doctor"),console.log("")}var Da=process.argv[1]?.endsWith("/init.js")||process.argv[1]?.endsWith("/init.ts");Da&&$a().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});export{Jf as initializeToolNetProject,_a as initializeToolNetProjectCrossMachine};
