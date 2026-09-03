import{existsSync as ke,readFileSync as ni}from"node:fs";import{join as bp}from"node:path";import{spawnSync as Dn}from"node:child_process";import{existsSync as ri,readFileSync as oi}from"node:fs";import{homedir as si}from"node:os";import{join as ii}from"node:path";function ai(t){let e=t.trim();return e.length>=2&&e.startsWith('"')&&e.endsWith('"')?(e=e.slice(1,-1),e.replace(/\\n/g,`
`).replace(/\\r/g,"\r").replace(/\\t/g,"	").replace(/\\"/g,'"').replace(/\\\\/g,"\\")):e.length>=2&&e.startsWith("'")&&e.endsWith("'")?e.slice(1,-1):e}function ci(){let t=process.env.TOOLNET_GLOBAL_ENV??ii(si(),".config","toolnet-memory",".env");if(!ri(t))return;let e=oi(t,"utf8");for(let n of e.split(/\r?\n/)){let r=n.trim();if(!r||r.startsWith("#"))continue;r.startsWith("export ")&&(r=r.slice(7));let o=r.indexOf("=");if(o<=0)continue;let s=r.slice(0,o).trim();/^[A-Za-z_][A-Za-z0-9_]*$/.test(s)&&process.env[s]===void 0&&(process.env[s]=ai(r.slice(o+1)))}}ci();function xe(t,e){return t===void 0?e:["1","true","yes","on"].includes(t.toLowerCase())}function Ee(t,e){if(!t)return e;let n=Number(t);return Number.isFinite(n)?n:e}function Qe(){return{memory:{autoCapture:xe(process.env.MEMORY_AUTO_CAPTURE,!0),autoRetrieve:xe(process.env.MEMORY_AUTO_RETRIEVE,!0),autoSummarize:xe(process.env.MEMORY_AUTO_SUMMARIZE,!0),autoSync:xe(process.env.MEMORY_AUTO_SYNC,!0)},retrieval:{maxCandidates:Ee(process.env.MEMORY_MAX_CANDIDATES,50),rerankTop:Ee(process.env.MEMORY_RERANK_TOP,10),finalContext:Ee(process.env.MEMORY_FINAL_CONTEXT,5),tokenBudget:Ee(process.env.MEMORY_TOKEN_BUDGET,2e3)},storage:{provider:process.env.MEMORY_STORAGE_PROVIDER??"huggingface",r2:{accountId:process.env.R2_ACCOUNT_ID,bucket:process.env.R2_BUCKET,accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY},s3:{endpoint:process.env.S3_ENDPOINT,region:process.env.S3_REGION,bucket:process.env.S3_BUCKET,accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY,forcePathStyle:xe(process.env.S3_FORCE_PATH_STYLE,!1)},huggingface:{namespace:process.env.HF_NAMESPACE,bucket:process.env.HF_BUCKET,accessKeyId:process.env.HF_S3_ACCESS_KEY_ID,secretAccessKey:process.env.HF_S3_SECRET_ACCESS_KEY},localRoot:process.env.MEMORY_LOCAL_STORAGE_PATH},cache:{maxMb:Ee(process.env.MEMORY_LOCAL_CACHE_MB,200)}}}import{createHash as gi}from"node:crypto";import{existsSync as tt,mkdirSync as yi,readFileSync as hi,renameSync as Si,writeFileSync as ki}from"node:fs";import{basename as vi,dirname as nt,join as Ie,parse as Jn,resolve as Z}from"node:path";import{createHash as zn}from"node:crypto";import{spawnSync as ui}from"node:child_process";var Ce="git-remote-v1",li=new Set(["github.com","gitlab.com","bitbucket.org"]);function qn(t,e){let n=e.replaceAll("\\","/").replace(/^\/+/u,"").replace(/\/+$/u,"").replace(/\.git$/iu,"").replace(/\/+/gu,"/");return!n||n==="."||n===".."||n.split("/").some(r=>!r||r==="."||r==="..")?null:(li.has(t)&&(n=n.toLowerCase()),n)}function di(t){let e;try{e=new URL(t)}catch{return null}if(!["https:","http:","ssh:","git:"].includes(e.protocol))return null;let n=e.hostname.trim().toLowerCase();if(!n)return null;let r=e.protocol==="https:"&&e.port==="443"||e.protocol==="http:"&&e.port==="80"||e.protocol==="ssh:"&&e.port==="22",o=e.port&&!r?`${n}:${e.port}`:n,s=qn(n,e.pathname);return s?`${o}/${s}`:null}function pi(t){let e=t.match(/^(?:[^@\s/:]+@)?([^:/\s]+):(.+)$/u);if(!e)return null;let n=e[1]?.trim().toLowerCase();if(!n||n.length===1)return null;let r=qn(n,e[2]??"");return r?`${n}/${r}`:null}function Fn(t){let e=t.trim();return e?e.includes("://")?di(e):pi(e):null}function fi(t){return zn("sha256").update(`${Ce}:${t}`).digest("hex")}function Bn(t){return zn("sha256").update(`toolnet-project:${Ce}:${t}`).digest("hex").slice(0,16)}function mi(t){return t.split("/").filter(Boolean).at(-1)?.trim()||null}function Ut(t,e){let n=ui("git",["-C",t,...e],{encoding:"utf8",windowsHide:!0,stdio:["ignore","pipe","ignore"]});return n.error||n.status!==0?null:n.stdout?.trim()||null}function Wn(t,e){let n=mi(t);return n?{scheme:Ce,canonicalRemote:t,fingerprint:fi(t),repositoryName:n,source:e}:null}function Vn(t){let e=Ut(t,["remote","get-url","origin"]);if(e){let o=Fn(e);if(o)return Wn(o,"origin")}let n=Ut(t,["remote"]);if(!n)return null;let r=new Set;for(let o of n.split(/\r?\n/u).map(s=>s.trim()).filter(Boolean)){let s=Ut(t,["remote","get-url",o]);if(!s)continue;let i=Fn(s);i&&r.add(i)}return r.size!==1?null:Wn([...r][0],"unique-remote")}var Gn=".toolnet",wi="project.json";function bi(t){return gi("sha256").update(t).digest("hex").slice(0,16)}function le(t){return Ie(t,Gn,wi)}function Un(t){return tt(le(t))}function Hn(t,e){let n=Z(t),r=Jn(n).root;for(;;){if(Un(n))return n;if(n===r||e&&n===Z(e))break;let o=nt(n);if(o===n)break;n=o}return null}function Yt(t){let e=Z(t),n=Jn(e).root,r=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"];for(;;){if(r.some(s=>tt(Ie(e,s))))return e;if(e===n)break;let o=nt(e);if(o===e)break;e=o}return Z(t)}function Ze(t){let e;try{e=JSON.parse(hi(t,"utf8"))}catch(o){throw new Error(`Invalid ToolNet project manifest: ${t}: ${o instanceof Error?o.message:String(o)}`)}if(!e||typeof e!="object")throw new Error(`Invalid ToolNet project manifest: ${t}`);let n=e;if(typeof n.id!="string"||!n.id.trim())throw new Error(`ToolNet project manifest is missing id: ${t}`);if(typeof n.name!="string"||!n.name.trim())throw new Error(`ToolNet project manifest is missing name: ${t}`);let r=new Date().toISOString();return{version:1,id:n.id,name:n.name,remote:typeof n.remote=="string"&&n.remote.trim()?n.remote:n.name,rootPath:typeof n.rootPath=="string"?n.rootPath:nt(nt(t)),createdAt:typeof n.createdAt=="string"?n.createdAt:r,updatedAt:typeof n.updatedAt=="string"?n.updatedAt:r,graphVersion:typeof n.graphVersion=="number"?n.graphVersion:0,memoryVersion:typeof n.memoryVersion=="number"?n.memoryVersion:0,metadata:n.metadata&&typeof n.metadata=="object"?n.metadata:void 0}}function et(t,e){let n=Ie(t,Gn);yi(n,{recursive:!0});let r=le(t),o=`${r}.tmp-${process.pid}`;ki(o,JSON.stringify(e,null,2)+`
`,{encoding:"utf8",mode:384}),Si(o,r)}function Q(t,e){return{id:t.id,name:t.name,remote:t.remote,rootPath:e,createdAt:t.createdAt,updatedAt:t.updatedAt,graphVersion:t.graphVersion,memoryVersion:t.memoryVersion,metadata:t.metadata}}function Xt(t){return{version:1,scheme:Ce,canonicalRemote:t.canonicalRemote,fingerprint:t.fingerprint,repositoryName:t.repositoryName}}function xi(t){let e=t.metadata?.toolnetIdentity;if(!e||typeof e!="object"||Array.isArray(e))return null;let n=e;return typeof n.fingerprint=="string"?n.fingerprint:null}var rt=class{adopt(e,n){let r=Yt(Z(e));if(!n.id.trim())throw new Error("PROJECT_ADOPTION_INVALID_ID");if(!n.name.trim())throw new Error("PROJECT_ADOPTION_INVALID_NAME");if(!n.remote.trim())throw new Error("PROJECT_ADOPTION_INVALID_REMOTE");if(Un(r)){let a=Ze(le(r));if(a.id!==n.id)throw new Error(["PROJECT_IDENTITY_ALREADY_EXISTS",`existing=${a.id}`,`requested=${n.id}`].join(" "));return Q(a,r)}let o=new Date().toISOString(),s={...n.metadata};n.gitIdentity&&(s.toolnetIdentity=Xt(n.gitIdentity));let i={version:1,id:n.id.trim(),name:n.name.trim(),remote:n.remote.trim(),rootPath:r,createdAt:n.createdAt??o,updatedAt:o,graphVersion:n.graphVersion??0,memoryVersion:n.memoryVersion??0,metadata:Object.keys(s).length?s:void 0};return et(r,i),Q(i,r)}recordGitIdentity(e,n,r={}){let o=this.requireExisting(e),s=le(o.rootPath),i=Ze(s),a=xi(i);if(a&&a!==n.fingerprint&&!r.allowRebind)throw new Error(["PROJECT_GIT_REMOTE_CHANGED",`existing=${a}`,`current=${n.fingerprint}`,"Use explicit rebind only when this repository identity change is intentional."].join(" "));let u=i.metadata?.toolnetIdentity;return u&&typeof u=="object"&&!Array.isArray(u)&&u.fingerprint===n.fingerprint||(i.metadata={...i.metadata,toolnetIdentity:Xt(n)},i.updatedAt=new Date().toISOString(),et(o.rootPath,i)),Q(i,o.rootPath)}findExisting(e=process.cwd()){let n=Z(e),r=Yt(n),s=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(u=>tt(Ie(r,u))),i=Hn(n,s?r:void 0);if(!i)return null;let a=Ze(le(i));return Q(a,i)}requireExisting(e=process.cwd()){let n=this.findExisting(e);if(!n)throw new Error("PROJECT_NOT_INITIALIZED");return n}detect(e=process.cwd()){let n=Z(e),r=Yt(n),s=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(l=>tt(Ie(r,l))),i=Hn(n,s?r:void 0);if(i){let l=le(i),f=Ze(l);return f.rootPath!==i&&(f.rootPath=i,f.updatedAt=new Date().toISOString(),et(i,f)),Q(f,i)}let a=new Date().toISOString(),u=vi(r),c=Vn(r),p={version:1,id:c?Bn(c.canonicalRemote):bi(r),name:u,remote:c?.repositoryName??u,rootPath:r,createdAt:a,updatedAt:a,graphVersion:0,memoryVersion:0,metadata:c?{toolnetIdentity:Xt(c)}:void 0};return et(r,p),Q(p,r)}};var Ei=[{type:"openai_key",regex:/\bsk-[A-Za-z0-9_-]{20,}\b/g,confidence:"exact"},{type:"huggingface_token",regex:/\bhf_[A-Za-z0-9]{20,}\b/g,confidence:"exact"},{type:"hf_s3_access_key",regex:/\bHFAK[A-Za-z0-9]{8,}\b/g,confidence:"exact"},{type:"aws_access_key",regex:/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,confidence:"exact"},{type:"github_token",regex:/\b(?:gh[pousr]_[A-Za-z0-9]{30,255}|github_pat_[A-Za-z0-9_]{40,255})\b/g,confidence:"exact"},{type:"stripe_secret_key",regex:/\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g,confidence:"exact"},{type:"google_api_key",regex:/\bAIza[A-Za-z0-9_-]{30,}\b/g,confidence:"exact"},{type:"slack_token",regex:/\bxox[baprs]-[A-Za-z0-9-]{16,}\b/g,confidence:"exact"},{type:"npm_token",regex:/\bnpm_[A-Za-z0-9]{20,}\b/g,confidence:"exact"},{type:"bearer_token",regex:/\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/gi,confidence:"high"},{type:"jwt",regex:/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,confidence:"exact"},{type:"private_key",regex:/-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,confidence:"exact"},{type:"password_assignment",regex:/\b(?:password|passwd|pwd)\s*[:=]\s*["']?[^"' \t\r\n]{6,}["']?/gi,confidence:"high"},{type:"secret_assignment",regex:/\b(?:secret|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key)\s*[:=]\s*["']?[^"' \t\r\n]{8,}["']?/gi,confidence:"high"},{type:"cookie",regex:/\b(?:cookie|set-cookie)\s*[:=]\s*[^;\n]{8,}/gi,confidence:"high"},{type:"url_credentials",regex:/\bhttps?:\/\/[^:/@\s]+:[^/@\s]{4,}@[^/\s]+/gi,confidence:"high"}],Ci=new Set(["example","example-key","example-token","changeme","change-me","password","secret","your-api-key","your-token","<token>","<secret>","<password>","[redacted]"]);function Yn(t){return t.normalize("NFKC").trim().toLowerCase()}function Ii(t){if(t.length===0)return 0;let e=new Map;for(let r of t)e.set(r,(e.get(r)??0)+1);let n=0;for(let r of e.values()){let o=r/t.length;n-=o*Math.log2(o)}return n}function ji(t){return/^[a-f0-9]{32}$/iu.test(t)||/^[a-f0-9]{40}$/iu.test(t)||/^[a-f0-9]{64}$/iu.test(t)}function Ai(t,e,n){let r=t.slice(Math.max(0,e-48),e),o=t.slice(n,Math.min(t.length,n+16));return/\b(?:token|secret|key|credential|authorization|password|passwd|apikey|api_key|access[_-]?key)\b/iu.test(`${r} ${o}`)}function Mi(t,e){return t.start<e.end&&e.start<t.end}function Xn(t){return t.sort((e,n)=>e.start!==n.start?e.start-n.start:n.end-n.start-(e.end-e.start))}var ot=class{allowValues=new Set;enableEntropyHeuristic;constructor(e={}){for(let n of e.allowValues??[]){let r=Yn(n);r&&this.allowValues.add(r)}this.enableEntropyHeuristic=e.enableEntropyHeuristic??!0}scan(e){let n=[];for(let s of Ei){let i=new RegExp(s.regex.source,s.regex.flags);for(let a of e.matchAll(i))a.index===void 0||!a[0]||this.allowed(a[0])||n.push({type:s.type,value:a[0],start:a.index,end:a.index+a[0].length,confidence:s.confidence})}this.enableEntropyHeuristic&&n.push(...this.entropyMatches(e));let r=Xn(n),o=[];for(let s of r)o.some(i=>Mi(i,s))||o.push(s);return Xn(o)}hasSecrets(e){return this.scan(e).length>0}allowed(e){let n=Yn(e);return Ci.has(n)?!0:this.allowValues.has(n)}entropyMatches(e){let n=[],r=/[A-Za-z0-9_+/=-]{32,160}/g;for(let o of e.matchAll(r)){if(o.index===void 0||!o[0])continue;let s=o[0];this.allowed(s)||ji(s)||!/[A-Za-z]/u.test(s)||!/[0-9]/u.test(s)||Ai(e,o.index,o.index+s.length)&&(Ii(s)<3.7||n.push({type:"high_entropy_secret",value:s,start:o.index,end:o.index+s.length,confidence:"heuristic"}))}return n}};var J=class{scanner;constructor(e={}){this.scanner=new ot(e)}sanitize(e){let n=this.scanner.scan(e);if(n.length===0)return{text:e,redacted:0,secretTypes:[]};let r=e,o=[...n].sort((i,a)=>a.start-i.start),s=new Set;for(let i of o)s.add(i.type),r=r.slice(0,i.start)+`[REDACTED:${i.type}]`+r.slice(i.end);return{text:r,redacted:n.length,secretTypes:[...s].sort()}}sanitizeValue(e){if(typeof e=="string")return this.sanitize(e).text;if(Array.isArray(e))return e.map(n=>this.sanitizeValue(n));if(e&&typeof e=="object"){let n={};for(let[r,o]of Object.entries(e)){let s=r.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g,"");if(s.includes("password")||s.includes("passwd")||s==="pwd"||s.includes("secret")||s.includes("token")||s.includes("cookie")||s.includes("authorization")||s.includes("apikey")||s.includes("accesskey")||s.includes("privatekey")||s.includes("clientsecret")||s.includes("credential")){n[r]="[REDACTED]";continue}n[r]=this.sanitizeValue(o)}return n}return e}};var Pi=new J;function de(t){return Pi.sanitizeValue(t)}import{homedir as aa}from"node:os";import{join as ca}from"node:path";import{DeleteObjectCommand as Oi,GetObjectCommand as Ti,HeadObjectCommand as Ri,ListObjectsV2Command as Ni,PutObjectCommand as _i,S3Client as Li}from"@aws-sdk/client-s3";import{getSignedUrl as $i}from"@aws-sdk/s3-request-presigner";var st=class{name="huggingface";client;bucket;constructor(e){this.bucket=e.bucket,this.client=new Li({region:"us-east-1",endpoint:`https://s3.hf.co/${e.namespace}`,forcePathStyle:!0,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:e.accessKeyId,secretAccessKey:e.secretAccessKey}})}async put(e,n,r="application/octet-stream"){let o=typeof n=="string"?Buffer.from(n,"utf8"):n;await this.client.send(new _i({Bucket:this.bucket,Key:e,Body:o,ContentType:r}))}async get(e){let n=await $i(this.client,new Ti({Bucket:this.bucket,Key:e}),{expiresIn:60}),r=await fetch(n,{redirect:"follow"});if(r.status===404)return null;if(!r.ok)throw new Error(`HF download failed: ${r.status} ${r.statusText}`);return new Uint8Array(await r.arrayBuffer())}async getText(e){let n=await this.get(e);return n?Buffer.from(n).toString("utf8"):null}async exists(e){try{return await this.client.send(new Ri({Bucket:this.bucket,Key:e})),!0}catch(n){if(typeof n=="object"&&n!==null&&"$metadata"in n&&n.$metadata?.httpStatusCode===404)return!1;throw n}}async delete(e){await this.client.send(new Oi({Bucket:this.bucket,Key:e}))}async list(e=""){let n=[],r;do{let o=await this.client.send(new Ni({Bucket:this.bucket,Prefix:e||void 0,ContinuationToken:r}));for(let s of o.Contents??[])s.Key&&n.push({key:s.Key,size:s.Size,updatedAt:s.LastModified?.toISOString()});r=o.IsTruncated?o.NextContinuationToken:void 0}while(r);return n}};import{access as Qn,mkdir as Ki,readFile as Di,readdir as Fi,rm as Wi,stat as Zn,writeFile as zi}from"node:fs/promises";import{dirname as qi,join as Bi,relative as er,resolve as Vi}from"node:path";var je=class{constructor(e){this.root=e}root;name="local";path(e){let n=e.replace(/^\/+/,"");return Vi(this.root,n)}async put(e,n){let r=this.path(e);await Ki(qi(r),{recursive:!0}),await zi(r,n)}async get(e){try{return await Di(this.path(e))}catch(n){if(typeof n=="object"&&n!==null&&"code"in n&&n.code==="ENOENT")return null;throw n}}async getText(e){let n=await this.get(e);return n?Buffer.from(n).toString("utf8"):null}async exists(e){try{return await Qn(this.path(e)),!0}catch{return!1}}async delete(e){await Wi(this.path(e),{force:!0})}async list(e=""){let n=this.path(e),r=[];try{await Qn(n)}catch{return r}let o=async i=>{let a=await Fi(i,{withFileTypes:!0});for(let u of a){let c=Bi(i,u.name);if(u.isDirectory()){await o(c);continue}let p=await Zn(c);r.push({key:er(this.root,c),size:p.size,updatedAt:p.mtime.toISOString()})}},s=await Zn(n);return s.isDirectory()?await o(n):r.push({key:er(this.root,n),size:s.size,updatedAt:s.mtime.toISOString()}),r}};import{DeleteObjectCommand as Hi,GetObjectCommand as Ji,HeadObjectCommand as Gi,ListObjectsV2Command as Ui,PutObjectCommand as Yi,S3Client as Xi}from"@aws-sdk/client-s3";import{getSignedUrl as Qi}from"@aws-sdk/s3-request-presigner";var Ae=class{name;client;bucket;constructor(e){this.name=e.name??"s3",this.bucket=e.bucket,this.client=new Xi({region:e.region??"us-east-1",endpoint:e.endpoint||void 0,forcePathStyle:e.forcePathStyle??!1,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:e.accessKeyId,secretAccessKey:e.secretAccessKey}})}async put(e,n,r="application/octet-stream"){let o=typeof n=="string"?Buffer.from(n,"utf8"):n;await this.client.send(new Yi({Bucket:this.bucket,Key:e,Body:o,ContentType:r}))}async get(e){let n=await Qi(this.client,new Ji({Bucket:this.bucket,Key:e}),{expiresIn:60}),r=await fetch(n,{redirect:"follow"});if(r.status===404)return null;if(!r.ok)throw new Error(`${this.name} download failed: ${r.status} ${r.statusText}`);return new Uint8Array(await r.arrayBuffer())}async getText(e){let n=await this.get(e);return n?Buffer.from(n).toString("utf8"):null}async exists(e){try{return await this.client.send(new Gi({Bucket:this.bucket,Key:e})),!0}catch(n){if(typeof n=="object"&&n!==null&&"$metadata"in n&&n.$metadata?.httpStatusCode===404)return!1;throw n}}async delete(e){await this.client.send(new Hi({Bucket:this.bucket,Key:e}))}async list(e=""){let n=[],r;do{let o=await this.client.send(new Ui({Bucket:this.bucket,Prefix:e||void 0,ContinuationToken:r}));for(let s of o.Contents??[])s.Key&&n.push({key:s.Key,size:s.Size,updatedAt:s.LastModified?.toISOString()});r=o.IsTruncated?o.NextContinuationToken:void 0}while(r);return n}};import{createCipheriv as Zi,createDecipheriv as ea,createHash as ta,randomBytes as na,timingSafeEqual as ra}from"node:crypto";import{readFileSync as oa}from"node:fs";var ee=Buffer.from("TNMEME01","ascii"),nr=1,Me=8,Pe=12,Qt=16,rr=ee.length+1+Me+Pe+Qt,sa="toolnet-memory:remote-encryption:v1:",or="aes-256-gcm",Zt=32,j=class extends Error{constructor(n,r){super(r);this.code=n;this.name="RemoteEncryptionError"}code};function ia(t){return t?["1","true","yes","on","enabled"].includes(t.trim().toLowerCase()):!1}function en(t=process.env){return ia(t.TOOLNET_REMOTE_ENCRYPTION)}function tr(t){let e=t.trim();if(!e)throw new j("REMOTE_ENCRYPTION_KEY_EMPTY","Remote encryption key is empty.");let n;if(e.startsWith("hex:")){let r=e.slice(4);if(!/^[0-9a-f]{64}$/iu.test(r))throw new j("REMOTE_ENCRYPTION_KEY_INVALID","hex: remote encryption key must contain exactly 64 hexadecimal characters.");n=Buffer.from(r,"hex")}else if(/^[0-9a-f]{64}$/iu.test(e))n=Buffer.from(e,"hex");else{let r=e.startsWith("base64:")?e.slice(7):e;if(!/^[A-Za-z0-9+/_-]+={0,2}$/u.test(r))throw new j("REMOTE_ENCRYPTION_KEY_INVALID","Remote encryption key must be 32 raw bytes encoded as hexadecimal or base64.");n=Buffer.from(r,r.includes("-")||r.includes("_")?"base64url":"base64")}if(n.length!==Zt)throw new j("REMOTE_ENCRYPTION_KEY_INVALID_LENGTH",`Remote encryption key must decode to exactly ${Zt} bytes.`);return n}function sr(t=process.env){let e=t.TOOLNET_REMOTE_ENCRYPTION_KEY?.trim(),n=t.TOOLNET_REMOTE_ENCRYPTION_KEY_FILE?.trim();if(e&&n)throw new j("REMOTE_ENCRYPTION_KEY_AMBIGUOUS","Configure either TOOLNET_REMOTE_ENCRYPTION_KEY or TOOLNET_REMOTE_ENCRYPTION_KEY_FILE, not both.");if(e)return tr(e);if(n){let r;try{r=oa(n,"utf8")}catch(o){throw new j("REMOTE_ENCRYPTION_KEY_FILE_READ_FAILED",[`Unable to read remote encryption key file: ${n}.`,o instanceof Error?o.message:String(o)].join(" "))}return tr(r)}}function ir(t){return ta("sha256").update(t).digest().subarray(0,Me)}function ar(t){return Buffer.from(`${sa}${t}`,"utf8")}function tn(t){return t.byteLength<ee.length?!1:Buffer.from(t).subarray(0,ee.length).equals(ee)}function cr(t,e,n){if(n.byteLength!==Zt)throw new j("REMOTE_ENCRYPTION_KEY_INVALID_LENGTH","AES-256-GCM requires a 32-byte key.");let r=typeof e=="string"?Buffer.from(e,"utf8"):Buffer.from(e),o=na(Pe),s=Zi(or,n,o);s.setAAD(ar(t));let i=Buffer.concat([s.update(r),s.final()]),a=s.getAuthTag(),u=Buffer.alloc(rr),c=0;return ee.copy(u,c),c+=ee.length,u.writeUInt8(nr,c),c+=1,ir(n).copy(u,c),c+=Me,o.copy(u,c),c+=Pe,a.copy(u,c),Buffer.concat([u,i])}function ur(t,e,n){let r=Buffer.from(e);if(!tn(r))throw new j("REMOTE_ENCRYPTION_ENVELOPE_REQUIRED","Payload is not a ToolNet encrypted remote object.");if(r.length<rr)throw new j("REMOTE_ENCRYPTION_ENVELOPE_TRUNCATED","Encrypted remote payload is truncated.");let o=ee.length,s=r.readUInt8(o);if(o+=1,s!==nr)throw new j("REMOTE_ENCRYPTION_VERSION_UNSUPPORTED",`Unsupported remote encryption envelope version: ${s}.`);let i=r.subarray(o,o+Me);o+=Me;let a=ir(n);if(!ra(i,a))throw new j("REMOTE_ENCRYPTION_KEY_MISMATCH","Configured remote encryption key does not match this encrypted object.");let u=r.subarray(o,o+Pe);o+=Pe;let c=r.subarray(o,o+Qt);o+=Qt;let p=r.subarray(o),l=ea(or,n,u);l.setAAD(ar(t)),l.setAuthTag(c);try{return Buffer.concat([l.update(p),l.final()])}catch{throw new j("REMOTE_ENCRYPTION_AUTH_FAILED","Encrypted remote object failed AES-GCM authentication.")}}var nn=class{constructor(e,n){this.inner=e;this.options=n;if(this.name=e.name,n.enabled&&!n.key)throw new j("REMOTE_ENCRYPTION_KEY_REQUIRED","Remote client-side encryption is enabled but no encryption key is configured.")}inner;options;name;async put(e,n,r){if(!this.options.enabled){await this.inner.put(e,n,r);return}let o=this.options.key;if(!o)throw new j("REMOTE_ENCRYPTION_KEY_REQUIRED","Remote encryption key is unavailable.");let s=cr(e,n,o);await this.inner.put(e,s,"application/octet-stream")}async get(e){let n=await this.inner.get(e);if(!n)return null;if(!tn(n))return n;if(!this.options.enabled)throw new j("REMOTE_ENCRYPTION_REQUIRED",["Remote object is client-side encrypted.","Enable TOOLNET_REMOTE_ENCRYPTION and configure the matching key."].join(" "));let r=this.options.key;if(!r)throw new j("REMOTE_ENCRYPTION_KEY_REQUIRED","Remote object is encrypted but no decryption key is configured.");return ur(e,n,r)}async getText(e){let n=await this.get(e);return n?Buffer.from(n).toString("utf8"):null}async exists(e){return this.inner.exists(e)}async delete(e){await this.inner.delete(e)}async list(e=""){return this.inner.list(e)}};function lr(t,e=process.env){if(t.name==="local")return en(e)&&console.warn("[storage] Remote encryption requested but active storage provider is local; local data remains unchanged."),t;let n=en(e),r=n?sr(e):void 0;return new nn(t,{enabled:n,key:r})}function Oe(t){return lr(t)}function rn(t,e){return console.warn(e),Oe(new je(t))}function dr(t){let e=t.localRoot??ca(aa(),".toolnet-memory","storage");if(t.provider==="r2"){let n=t.r2;return n?.accountId&&n.bucket&&n.accessKeyId&&n.secretAccessKey?Oe(new Ae({name:"r2",endpoint:`https://${n.accountId}.r2.cloudflarestorage.com`,region:"auto",bucket:n.bucket,forcePathStyle:!0,accessKeyId:n.accessKeyId,secretAccessKey:n.secretAccessKey})):rn(e,"[storage] Cloudflare R2 credentials missing. Using local fallback.")}if(t.provider==="s3"){let n=t.s3;return n?.bucket&&n.accessKeyId&&n.secretAccessKey?Oe(new Ae({name:"s3",endpoint:n.endpoint,region:n.region??"us-east-1",bucket:n.bucket,forcePathStyle:n.forcePathStyle??!1,accessKeyId:n.accessKeyId,secretAccessKey:n.secretAccessKey})):rn(e,"[storage] S3 credentials missing. Using local fallback.")}if(t.provider==="huggingface"){let n=t.huggingface;return n?.namespace&&n.bucket&&n.accessKeyId&&n.secretAccessKey?Oe(new st({namespace:n.namespace,bucket:n.bucket,accessKeyId:n.accessKeyId,secretAccessKey:n.secretAccessKey})):rn(e,"[storage] Hugging Face credentials missing. Using local fallback.")}return Oe(new je(e))}function ua(t){return new Promise(e=>setTimeout(e,t))}async function pr(t,e={}){let n=Math.max(1,e.attempts??3),r=e.baseDelayMs??150,o=e.maxDelayMs??2e3,s;for(let i=1;i<=n;i++)try{return await t()}catch(a){if(s=a,i>=n)break;let u=Math.min(o,r*2**(i-1)),c=Math.floor(Math.random()*Math.max(1,u*.2));await ua(u+c)}throw s}var la=new Set(["put","get","getText","delete","list"]);function fr(t,e={}){return new Proxy(t,{get(n,r){let o=Reflect.get(n,r,n);return typeof o!="function"?o:la.has(r)?(...s)=>pr(()=>Promise.resolve(o.apply(n,s)),e):o.bind(n)}})}function mr(t){let e=t.trim().replace(/\s+/g,"_").replace(/[^A-Za-z0-9._-]/g,"_").replace(/_+/g,"_").replace(/^\.+|\.+$/g,"").slice(0,100);if(!e||e==="."||e==="..")throw new Error("Invalid project storage folder");return e}function gr(t){let e=t.replace(/^\/+/,"");if(e.startsWith("memories/"))return"memory/records/"+e.slice(9);if(e.startsWith("vectors/"))return"memory/vectors/"+e.slice(8);if(e.startsWith("graph/"))return"code/graph/"+e.slice(6);let n=e.match(/^(snapshots\/[^/]+\/)memories\/(.+)$/);if(n)return`${n[1]}memory/records/${n[2]}`;if(n=e.match(/^(snapshots\/[^/]+\/)vectors\/(.+)$/),n)return`${n[1]}memory/vectors/${n[2]}`;if(n=e.match(/^(snapshots\/[^/]+\/)graph\/(.+)$/),n)return`${n[1]}code/graph/${n[2]}`;let r=e.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)memories\/(.+)$/);if(r)return`${r[1]}memory/records/${r[2]}`;if(r=e.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)vectors\/(.+)$/),r)return`${r[1]}memory/vectors/${r[2]}`;if(r=e.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)graph\/(.+)$/),r)return`${r[1]}code/graph/${r[2]}`;let o=e.match(/^(projects\/[^/]+\/)memories\/(.+)$/);return o?`${o[1]}memory/records/${o[2]}`:(o=e.match(/^(projects\/[^/]+\/)vectors\/(.+)$/),o?`${o[1]}memory/vectors/${o[2]}`:(o=e.match(/^(projects\/[^/]+\/)graph\/(.+)$/),o?`${o[1]}code/graph/${o[2]}`:e))}var it=class{constructor(e,n,r,o){this.provider=e;this.name=e.name,this.projectId=n,this.projectName=r,this.folder=mr(o??r),this.sourcePrefix=`projects/${n}`,this.targetPrefix=`projects/${this.folder}`}provider;name;folder;sourcePrefix;targetPrefix;projectId;projectName;registryPromise;async registerProject(){let e=`${this.targetPrefix}/project.json`,n=new Date().toISOString(),r=n,o=await this.provider.getText(e);if(o){let i;try{i=JSON.parse(o)}catch(a){throw new Error(`Invalid remote ToolNet project manifest at ${e}: ${a instanceof Error?a.message:String(a)}`)}if(typeof i.id=="string"&&i.id!==this.projectId)throw new Error(["ToolNet remote project namespace collision.",`Remote folder: ${this.targetPrefix}`,`Existing project id: ${i.id}`,`Current project id: ${this.projectId}`,"Refusing to mix data from two projects."].join(" "));typeof i.createdAt=="string"&&(r=i.createdAt)}let s={version:1,id:this.projectId,name:this.projectName,remote:this.folder,createdAt:r,updatedAt:n};await this.provider.put(e,JSON.stringify(s,null,2)+`
`,"application/json")}async ensureRegistered(){return this.registryPromise||(this.registryPromise=this.registerProject()),this.registryPromise}key(e){if(e=gr(e),e===this.sourcePrefix)return this.targetPrefix;if(e.startsWith(`${this.sourcePrefix}/`))return this.targetPrefix+e.slice(this.sourcePrefix.length);if(e===this.targetPrefix||e.startsWith(`${this.targetPrefix}/`))return e;if(e.startsWith("projects/"))throw new Error(["Cross-project storage access denied.",`Current project: ${this.targetPrefix}`,`Requested key: ${e}`].join(" "));return e}async put(e,n,r){return await this.ensureRegistered(),this.provider.put(this.key(e),n,r)}async get(e){return await this.ensureRegistered(),this.provider.get(this.key(e))}async getText(e){return await this.ensureRegistered(),this.provider.getText(this.key(e))}async delete(e){return await this.ensureRegistered(),this.provider.delete(this.key(e))}async exists(e){return await this.ensureRegistered(),this.provider.exists(this.key(e))}async list(e){return await this.ensureRegistered(),this.provider.list(this.key(e))}};import{existsSync as Hd}from"node:fs";import{execFileSync as Jd}from"node:child_process";import{homedir as Gd}from"node:os";import{isAbsolute as Ud,join as Os,relative as Yd,resolve as Ts}from"node:path";import{DatabaseSync as Xd}from"node:sqlite";import{join as ha}from"node:path";import{createHash as da}from"node:crypto";import{dirname as pa}from"node:path";import{mkdirSync as fa,readFileSync as ma,renameSync as ga,writeFileSync as ya}from"node:fs";function w(t){return da("sha256").update(t).digest("hex")}function on(t){if(Array.isArray(t))return t.map(on);if(t&&typeof t=="object"){let e=t,n={};for(let r of Object.keys(e).sort())n[r]=on(e[r]);return n}return t}function yr(t){return JSON.stringify(on(t))}function hr(t){try{return JSON.parse(ma(t,"utf8"))}catch{return null}}function _(t,e){fa(pa(t),{recursive:!0});let n=`${t}.${process.pid}.tmp`;ya(n,JSON.stringify(e,null,2)+`
`,{encoding:"utf8",mode:384}),ga(n,t)}function Sr(t,e){let n=t.trim(),r=n.replace(/\s+/g,"_").replace(/[^A-Za-z0-9._-]/g,"_").replace(/_+/g,"_").replace(/^\.+|\.+$/g,""),o=w(n).slice(0,12);if(!r||r==="."||r==="..")return`${e}--${o}`;let s=r.slice(0,100);return s===n&&n.length<=100?s:`${s.slice(0,85)}--${o}`}function kr(t,e,n){let r=e.trim(),o=n.trim();if(!r)throw new Error("Session agent is required");if(!o)throw new Error("Native session ID is required");let s=Sr(r.toLowerCase(),"agent"),i=Sr(o,"session");return{projectId:t.id,projectName:t.name,projectRoot:t.rootPath,agent:r,nativeSessionId:o,sessionKey:`${r}:${o}`,remotePrefix:["projects",t.id,"runtime","sources",s,i].join("/"),localDirectory:ha(t.rootPath,".toolnet","runtime","sources",s,i)}}function vr(t){return String(t).padStart(12,"0")}var at=class{constructor(e,n=100,r=512*1024){this.storage=e;this.maxEventsPerChunk=n;this.maxChunkBytes=r;if(n<1)throw new Error("maxEventsPerChunk must be positive");if(r<1024)throw new Error("maxChunkBytes is too small")}storage;maxEventsPerChunk;maxChunkBytes;async getJson(e){let n=await this.storage.getText(e);return n?JSON.parse(n):null}async putJson(e,n){await this.storage.put(e,JSON.stringify(n,null,2)+`
`,"application/json")}async scan(e){let n=`${e.remotePrefix}/events/`,r=await this.storage.list(n),o=[],s=0;for(let i of r){let a=i.key.match(/\/events\/(\d+)-(\d+)-[a-f0-9]+\.jsonl$/);if(!a)continue;let u=Number(a[1]),c=Number(a[2]);!Number.isFinite(u)||!Number.isFinite(c)||(o.push({key:i.key,start:u,end:c}),s=Math.max(s,c))}return o.sort((i,a)=>i.start-a.start),{chunks:o,maxSequence:s}}split(e){let n=[],r=[],o=0;for(let s of e){let i=Buffer.byteLength(JSON.stringify(s)+`
`,"utf8");r.length>0&&(r.length>=this.maxEventsPerChunk||o+i>this.maxChunkBytes)&&(n.push(r),r=[],o=0),r.push(s),o+=i}return r.length>0&&n.push(r),n}async loadManifest(e){return this.getJson(`${e.remotePrefix}/session.json`)}async loadCursor(e){return this.getJson(`${e.remotePrefix}/cursor.json`)}async recover(e){let n=await this.scan(e);return{maxSequence:n.maxSequence,chunkCount:n.chunks.length}}async append(e,n,r,o={}){let s=await this.loadManifest(e),i=await this.scan(e),a=n.filter(y=>y.sequence>i.maxSequence),u=0;for(let y of this.split(a)){let g=y[0],k=y[y.length-1],b=y.map(N=>JSON.stringify(N)).join(`
`)+`
`,R=w(b).slice(0,16),O=[e.remotePrefix,"events",`${vr(g.sequence)}-${vr(k.sequence)}-${R}.jsonl`].join("/");await this.storage.exists(O)||await this.storage.put(O,b,"application/x-ndjson"),u+=y.length}let c=await this.scan(e),p=n[n.length-1],l=s?.status??"active";p?.type==="session_end"||p?.type==="session_idle"?l="idle":p?.type==="error"?l="error":n.length>0&&(l="active");let f=new Date().toISOString(),d=n[0],m={version:1,projectId:e.projectId,projectName:e.projectName,agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,status:l,createdAt:s?.createdAt??d?.timestamp??f,updatedAt:p?.timestamp??f,firstEventAt:s?.firstEventAt??d?.timestamp,lastEventAt:p?.timestamp??s?.lastEventAt,eventCount:c.maxSequence,chunkCount:c.chunks.length,metadata:{...s?.metadata,...o.metadata}};(o.title??s?.title)&&(m.title=o.title??s?.title);let S={version:1,projectId:e.projectId,agent:e.agent,nativeSessionId:e.nativeSessionId,lastLocalSequence:n.length>0?n[n.length-1].sequence:c.maxSequence,lastRemoteSequence:c.maxSequence,sourceCursors:r,updatedAt:f};return await this.putJson(`${e.remotePrefix}/cursor.json`,S),await this.putJson(`${e.remotePrefix}/session.json`,m),{uploadedEvents:u,lastRemoteSequence:c.maxSequence,eventCount:m.eventCount,chunkCount:m.chunkCount,status:l}}};import{closeSync as Ne,existsSync as pt,fsyncSync as fn,mkdirSync as Na,openSync as _e,readFileSync as _r,readSync as _a,rmSync as Tr,statSync as dn,truncateSync as La,writeSync as $a}from"node:fs";import{join as pn}from"node:path";var Sa=new Set(["thinking","reasoning","reasoningcontent","chainofthought","cot","analysistext","internalreasoning","modelthinking"]),ka=new Set(["reasoning","thinking","chain_of_thought","chain-of-thought","internal_reasoning","internal-reasoning"]);function va(t){return t.toLowerCase().replace(/[^a-z0-9]+/gu,"")}function wa(t){for(let e of["type","kind"]){let n=t[e];if(typeof n=="string"){let r=n.toLowerCase();if(ka.has(r))return n}}return null}function sn(t,e=0){if(e>12)return"[ToolNet nested value omitted]";if(Array.isArray(t))return t.map(s=>sn(s,e+1));if(!t||typeof t!="object")return t;let n=t,r=wa(n);if(r)return{type:r,omitted:"[private reasoning omitted]"};let o={};for(let[s,i]of Object.entries(n))Sa.has(va(s))||(o[s]=sn(i,e+1));return o}function ba(t){if(!t)return new Date().toISOString();let e=new Date(t);return Number.isNaN(e.getTime())?new Date().toISOString():e.toISOString()}function te(t){return t?.trim()||void 0}function wr(t,e={}){let n={...t.provenance??{}},r=te(t.source)??te(e.source)??te(n.source);return{...t,timestamp:ba(t.timestamp),source:r,turnId:te(t.turnId)??te(e.turnId),cwd:te(t.cwd)??te(e.cwd),data:sn(t.data??{}),provenance:n}}import{randomUUID as an}from"node:crypto";import{closeSync as pe,existsSync as fe,fsyncSync as Te,mkdirSync as cn,openSync as Re,readFileSync as un,readdirSync as xa,renameSync as Ea,rmSync as ct,statSync as Ca,writeSync as ut}from"node:fs";import{join as G}from"node:path";var Ia=12e4,ja=80,Aa="reconcile-required";function Ma(t){t<=0||Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,t)}function me(t){return G(t,".toolnet","journal")}function Er(t){return G(me(t),"events.jsonl")}function lt(t){return G(me(t),Aa)}function Pa(t){if(!Number.isInteger(t)||t<=0)return!1;try{return process.kill(t,0),!0}catch(e){return e?.code!=="ESRCH"}}function Cr(t){if(!fe(t))return null;try{let e=JSON.parse(un(t,"utf8"));return e.version!==1||typeof e.token!="string"||typeof e.pid!="number"||typeof e.acquiredAt!="string"?null:{version:1,token:e.token,pid:e.pid,acquiredAt:e.acquiredAt}}catch{return null}}function Oa(t){if(!fe(t))return!1;let e=0;try{e=Date.now()-Ca(t).mtimeMs}catch{return!1}if(e<=Ia)return!1;let n=Cr(t);return n?!Pa(n.pid):!0}function Ta(t){if(!Oa(t))return!1;try{return ct(t,{force:!0}),!0}catch{return!1}}function Ir(t){for(let e=0;e<ja;e+=1){let n=an();try{let r=Re(t,"wx",384),o={version:1,token:n,pid:process.pid,acquiredAt:new Date().toISOString()};try{return ut(r,`${JSON.stringify(o)}
`,null,"utf8"),Te(r),{fd:r,token:n}}catch(s){throw pe(r),ct(t,{force:!0}),s}}catch(r){if(r?.code!=="EEXIST")throw r;if(Ta(t))continue;Ma(25)}}throw new Error(`Shared project journal is locked: ${t}`)}function jr(t,e){pe(e.fd),Cr(t)?.token===e.token&&ct(t,{force:!0})}function br(t){if(!fe(t))return[];let e="";try{e=un(t,"utf8")}catch{return[]}let n=[];for(let r of e.split(/\r?\n/)){let o=r.trim();if(o)try{let s=JSON.parse(o);if(s.version!==1||typeof s.id!="string"||s.id.length===0||typeof s.projectId!="string"||s.projectId.length===0)continue;n.push(s)}catch{}}return n}function Ar(t){if(!fe(t))return[];let e=[];for(let n of xa(t,{withFileTypes:!0})){let r=G(t,n.name);if(n.isDirectory()){e.push(...Ar(r));continue}n.isFile()&&n.name==="events.jsonl"&&e.push(r)}return e.sort()}function dt(t){let e=null;try{e=Re(t,"r"),Te(e)}catch{}finally{if(e===null)return;pe(e)}}function xr(t){let e=lt(t);if(!fe(e))return null;try{return un(e,"utf8").trim()||null}catch{return null}}function ln(t){let e=me(t);cn(e,{recursive:!0,mode:448});let n=lt(t),r=[an(),new Date().toISOString()].join("|"),o=Re(n,"w",384);try{ut(o,`${r}
`,null,"utf8"),Te(o)}finally{pe(o)}dt(e)}function Ra(t,e,n){let r=G(t,`.events.jsonl.tmp-${process.pid}-${an()}`),o=Re(r,"w",384);try{let s=n.length===0?"":`${n.map(i=>JSON.stringify(i)).join(`
`)}
`;s&&ut(o,s,null,"utf8"),Te(o)}finally{pe(o)}Ea(r,e),dt(t)}function Mr(t){let e=me(t),n=Er(t),r=G(t,".toolnet","runtime","sources"),o=xr(t),s=Ar(r),i=[],a=new Set;for(let l of br(n))a.has(l.id)||(a.add(l.id),i.push(l));let u=i.length,c=[];for(let l of s)for(let f of br(l))a.has(f.id)||(a.add(f.id),c.push(f));c.sort((l,f)=>{let d=l.timestamp.localeCompare(f.timestamp);return d!==0?d:l.id.localeCompare(f.id)}),i.push(...c),Ra(e,n,i);let p=xr(t);return o&&p===o&&(ct(lt(t),{force:!0}),dt(e)),{filesScanned:s.length,existingEvents:u,recoveredEvents:c.length,totalEvents:i.length}}function Pr(t){let e=me(t);cn(e,{recursive:!0,mode:448});let n=G(e,"journal.lock"),r=Ir(n);try{return Mr(t)}finally{jr(n,r)}}function Or(t,e){if(e.length===0)return;let n=me(t);cn(n,{recursive:!0,mode:448});let r=Er(t),o=G(n,"journal.lock"),s=Ir(o);try{if(fe(lt(t))){Mr(t);return}let i=`${e.map(u=>JSON.stringify(u)).join(`
`)}
`,a=Re(r,"a",384);try{ut(a,i,null,"utf8"),Te(a)}finally{pe(a)}dt(n)}finally{jr(o,s)}}var Ka=12e4,Da=80,Rr=2e3;function Fa(t){Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,t)}function Lr(t,e){let n=Buffer.isBuffer(e)?e:Buffer.from(e,"utf8"),r=0;for(;r<n.length;){let o=$a(t,n,r,n.length-r);if(o<=0)throw new Error("Unable to write session WAL");r+=o}}function mn(t){let e=t.trim();if(!e)return null;try{let n=JSON.parse(e);return n.version!==1||typeof n.id!="string"||!n.id||typeof n.sequence!="number"||!Number.isFinite(n.sequence)||typeof n.projectId!="string"||!n.projectId||typeof n.timestamp!="string"?null:n}catch{return null}}function Wa(t){if(!pt(t))return[];let e="";try{e=_r(t,"utf8")}catch{return[]}let n=[];for(let r of e.split(/\r?\n/)){let o=mn(r);o&&n.push(o)}return n}function Nr(t){return t.type==="session_end"||t.type==="session_idle"?"idle":t.type==="error"?"error":"active"}function za(t){if(!pt(t))return!1;let e;try{e=_r(t)}catch{return!1}if(e.length===0||e[e.length-1]===10)return!1;let n=e.lastIndexOf(10),r=n>=0?n+1:0,o=e.subarray(r).toString("utf8").trim();if(mn(o)){let i=_e(t,"a");try{Lr(i,`
`),fn(i)}finally{Ne(i)}return!0}La(t,r);let s=_e(t,"a");try{fn(s)}finally{Ne(s)}return!0}function qa(t,e){if(t.length!==e.length)return!1;for(let n=0;n<t.length;n+=1)if(t[n]!==e[n])return!1;return!0}var ft=class{constructor(e,n={}){this.identity=e;this.eventContext=n;Na(e.localDirectory,{recursive:!0}),this.eventsFile=pn(e.localDirectory,"events.jsonl"),this.stateFile=pn(e.localDirectory,"state.json"),this.lockFile=pn(e.localDirectory,"journal.lock")}identity;eventContext;eventsFile;stateFile;lockFile;initialState(){let e=new Date().toISOString();return{version:1,projectId:this.identity.projectId,agent:this.identity.agent,nativeSessionId:this.identity.nativeSessionId,status:"idle",createdAt:e,updatedAt:e,lastSequence:0,lastRemoteSequence:0,remoteByteOffset:0,sourceCursors:{},recentEventIds:[]}}loadStateUnsafe(){return hr(this.stateFile)??this.initialState()}recoverStateUnsafe(){za(this.eventsFile);let e=this.loadStateUnsafe(),n=Wa(this.eventsFile);if(n.length===0)return e;let r=n[0];for(let l of n)l.sequence<=r.sequence||(r=l);let o=n.slice(-Rr).map(l=>l.id),s=pt(this.eventsFile)?dn(this.eventsFile).size:0,i=Math.max(e.lastSequence,r.sequence),a=Math.min(e.remoteByteOffset,s),u=r.sequence>e.lastSequence;if(!(u||a!==e.remoteByteOffset||!qa(e.recentEventIds,o)||e.lastLocalEventAt!==r.timestamp))return e;let p={...e,status:Nr(r),updatedAt:r.timestamp,lastLocalEventAt:r.timestamp,lastSequence:i,remoteByteOffset:a,recentEventIds:o};if(this.saveStateUnsafe(p),!u)return p;try{ln(this.identity.projectRoot)}catch{return p}try{Pr(this.identity.projectRoot)}catch{}return p}loadState(){return this.withLock(()=>this.recoverStateUnsafe())}saveStateUnsafe(e){_(this.stateFile,e)}acquireLock(){for(let e=0;e<Da;e+=1)try{return _e(this.lockFile,"wx",384)}catch(n){if(n.code!=="EEXIST")throw n;try{if(Date.now()-dn(this.lockFile).mtimeMs>Ka){Tr(this.lockFile,{force:!0});continue}}catch{}Fa(25)}throw new Error(`Session journal is locked: ${this.lockFile}`)}withLock(e){let n=this.acquireLock();try{return e()}finally{Ne(n),Tr(this.lockFile,{force:!0})}}append(e){return e.length===0?[]:this.withLock(()=>{let n=this.recoverStateUnsafe(),r=new Set(n.recentEventIds),o=n.lastSequence,s=[];for(let l of e){let f=wr(l,this.eventContext),d=f.timestamp??new Date().toISOString(),m=f.data??{},S=f.provenance?.rawDigest??w(yr(m)),y=de(m),g=f.sourceEventId?[this.identity.projectId,this.identity.agent,this.identity.nativeSessionId,f.sourceEventId].join("|"):[this.identity.projectId,this.identity.agent,this.identity.nativeSessionId,o+1,f.type,d,S].join("|"),k=w(g).slice(0,32);if(r.has(k))continue;o+=1;let b={version:1,id:k,sequence:o,projectId:this.identity.projectId,agent:this.identity.agent,nativeSessionId:this.identity.nativeSessionId,sessionId:this.identity.nativeSessionId,type:f.type,timestamp:d,source:f.source??f.provenance?.source??this.identity.agent,data:y,provenance:{...f.provenance,rawDigest:S}};f.role!==void 0&&(b.role=f.role),f.turnId!==void 0&&(b.turnId=f.turnId),f.cwd!==void 0&&(b.cwd=f.cwd),f.sourceEventId!==void 0&&(b.sourceEventId=f.sourceEventId),f.sourceSequence!==void 0&&(b.sourceSequence=f.sourceSequence),s.push(b),r.add(k)}if(s.length===0)return[];let i=s.map(l=>JSON.stringify(l)).join(`
`)+`
`,a=_e(this.eventsFile,"a",384);try{Lr(a,i),fn(a)}finally{Ne(a)}try{Or(this.identity.projectRoot,s)}catch{try{ln(this.identity.projectRoot)}catch{}}let u=s[s.length-1],c=Nr(u),p=Array.from(r).slice(-Rr);return this.saveStateUnsafe({...n,status:c,updatedAt:u.timestamp,lastLocalEventAt:u.timestamp,lastSequence:u.sequence,recentEventIds:p}),s})}readPending(){return this.withLock(()=>{let e=this.recoverStateUnsafe();if(!pt(this.eventsFile))return{events:[],startOffset:e.remoteByteOffset,endOffset:e.remoteByteOffset};let n=dn(this.eventsFile).size,r=Math.min(e.remoteByteOffset,n);if(n<=r)return{events:[],startOffset:r,endOffset:n};let o=n-r,s=Buffer.alloc(o),i=_e(this.eventsFile,"r");try{_a(i,s,0,o,r)}finally{Ne(i)}let a=[];for(let u of s.toString("utf8").split(/\r?\n/)){let c=mn(u);c&&a.push(c)}return{events:a,startOffset:r,endOffset:n}})}markRemote(e,n){this.withLock(()=>{let r=this.recoverStateUnsafe(),o=new Date().toISOString();this.saveStateUnsafe({...r,lastRemoteSequence:Math.max(r.lastRemoteSequence,e),remoteByteOffset:Math.max(r.remoteByteOffset,n),lastRemoteAt:o,updatedAt:o})})}setSourceCursor(e,n){this.withLock(()=>{let r=this.recoverStateUnsafe();this.saveStateUnsafe({...r,sourceCursors:{...r.sourceCursors,[e]:String(n)},updatedAt:new Date().toISOString()})})}};import{closeSync as Ku,existsSync as Du,openSync as Fu,readSync as Wu,statSync as zu}from"node:fs";var Ba=new Set(["rule","blocker","architecture","deploy"]),Va=new Set(["fix","todo","context","next_action"]);function gn(t){return t<0?0:t>1?1:t}function $r(t,e){let n=Number.parseFloat(t??"");return Number.isFinite(n)?n:e}function Ha(t){return t==="off"?"off":t==="balanced"?"balanced":t==="aggressive"?"aggressive":"conservative"}function yn(){return{mode:Ha(process.env.TOOLNET_MEMORY_PROMOTION),minScore:gn($r(process.env.TOOLNET_PROMOTE_MIN_SCORE,.65)),minConfidence:gn($r(process.env.TOOLNET_PROMOTE_MIN_CONFIDENCE,.78))}}function Ja(t){switch(t){case"critical":return 1;case"high":return .85;case"normal":return .6;case"temporary":return .25}}function Ga(t){let e=gn(Ja(t.importance)*.75+t.confidence*.25);return Math.round(e*1e6)/1e6}function Ua(t){return t.evidence?t.evidence:{userExplicit:!1,sourceVerified:!1,testVerified:!1,crossSessionConfirmations:0,assistantDerived:!1}}function Ya(t,e=yn()){if(t.importance==="temporary"||t.confidence<e.minConfidence)return"transient";let n=Ua(t);return t.kind==="rule"&&n.userExplicit?"permanent":t.kind==="rule"?"session":t.kind==="architecture"&&(n.userExplicit||n.sourceVerified||n.testVerified||n.crossSessionConfirmations>=2)?"permanent":t.kind==="architecture"?"session":t.kind==="decision"||t.kind==="todo"||t.kind==="next_action"||t.kind==="fix"?"task":"session"}function Xa(t,e=yn()){if(e.mode==="off")return Number.POSITIVE_INFINITY;let n=0;e.mode==="balanced"&&(n=.1),e.mode==="aggressive"&&(n=.15);let r=Math.max(e.mode==="aggressive"?.5:.55,e.minScore-n);return Ba.has(t)&&(r=Math.max(.5,r-.1)),Va.has(t)&&(r=Math.max(.5,r-.05)),r}function hn(t,e=yn()){let n=Ya(t,e),r=Ga(t),o=Xa(t.kind,e);return n==="transient"?{knowledgeClass:n,score:r,threshold:o,persist:!1}:e.mode==="off"?{knowledgeClass:n,score:r,threshold:o,persist:!1}:{knowledgeClass:n,score:r,threshold:o,persist:r>=o}}function Kr(t,e){let n=e.toLowerCase();return n.includes("kh\xF4ng \u0111\u01B0\u1EE3c")||n.includes("tuy\u1EC7t \u0111\u1ED1i")||n.includes("must not")||n.includes("never ")?"critical":t==="rule"||t==="decision"?"high":t==="todo"||n.includes("error")||n.includes("failed")||n.includes("exception")?"normal":"temporary"}var zr=[/không được/iu,/tuyệt đối/iu,/bắt buộc/iu,/đừng\s+/iu,/must not/iu,/do not/iu,/don't/iu,/\bnever\b/iu],Qa=[/từ giờ/iu,/về sau/iu,/mỗi lần/iu,/luôn luôn/iu,/\bluôn\b/iu,/quy tắc/iu,/workflow/iu,/\balways\b/iu,/\brequired\b/iu,/\bmust\b/iu,/from now on/iu],Za=[/\bchốt\b/iu,/quyết định/iu,/sẽ dùng/iu,/chọn .+ thay/iu,/đổi sang/iu,/chuyển sang/iu,/\bdecided\b/iu,/\bchosen\b/iu,/we will use/iu,/use .+ instead/iu,/switch(?:ed)? to/iu],ec=[/\btodo\b/iu,/cần làm/iu,/cần thêm/iu,/cần sửa/iu,/cần kiểm tra/iu,/tiếp theo/iu,/bước tiếp theo/iu,/còn phải/iu,/còn cần/iu,/next step/iu,/\bneed to\b/iu,/\bremaining\b/iu,/follow[- ]?up/iu],tc=[/tiếp theo/iu,/bước tiếp theo/iu,/việc tiếp theo/iu,/sau đó cần/iu,/next step/iu,/next action/iu,/follow[- ]?up/iu],nc=[/đã sửa/iu,/đã fix/iu,/đã khắc phục/iu,/đã xử lý/iu,/hoàn tất/iu,/hoàn thành/iu,/\bfixed\b/iu,/\bresolved\b/iu,/\bimplemented\b/iu,/\bcompleted\b/iu,/\bpasses?\b/iu],Dr=[/kiến trúc/iu,/pipeline/iu,/adapter/iu,/schema/iu,/runtime/iu,/namespace/iu,/storage/iu,/lưu trữ/iu,/workflow/iu,/session core/iu,/memory engine/iu,/retrieval/iu],rc=[/\bdùng\b/iu,/\btách\b/iu,/\bthay\b/iu,/\bchuyển\b/iu,/\blưu\b/iu,/\bmap\b/iu,/\buse\b/iu,/\bsplit\b/iu,/\bstore\b/iu,/\breplace\b/iu,/\bmove\b/iu],oc=[/đường dẫn/iu,/\bpath\b/iu,/\bport\b/iu,/\bendpoint\b/iu,/\bdomain\b/iu,/\bbucket\b/iu,/\brepository\b/iu,/\brepo\b/iu,/\bbranch\b/iu,/\/[A-Za-z0-9._/-]{4,}/u],sc=[/\blà\b/iu,/\bở\b/iu,/\bdùng\b/iu,/\bnằm\b/iu,/\bis\b/iu,/\buse\b/iu,/located/iu,/runs on/iu],Fr=new Set(["content","text","message","prompt","summary","description","reason","title","last_assistant_message","lastAssistantMessage","input_messages","inputMessages"]),ic=new Set(["payload","data","content","message","messages","parts","summary"]);function L(t,e){return e.some(n=>n.test(t))}function qr(t){return t.normalize("NFKC").replace(/\r/g,"").replace(/^[\s>*#\-•]+/u,"").replace(/\s+/g," ").trim()}function ac(t){return qr(t).toLowerCase().replace(/[^\p{L}\p{N}:/._-]+/gu," ").replace(/\s+/g," ").trim()}function cc(t){return!(t.length<12||t.length>1e3||(t.match(new RegExp("\\p{L}","gu"))??[]).length<6||/^(?:https?:\/\/\S+|[A-Za-z0-9+/=]{80,})$/u.test(t))}function Sn(t,e,n,r=0){if(!(r>6)&&!(typeof t=="string"&&e&&!Fr.has(e))){if(typeof t=="string"){n.push(t);return}if(Array.isArray(t)){for(let o of t.slice(0,50))Sn(o,e,n,r+1);return}if(!(!t||typeof t!="object"))for(let[o,s]of Object.entries(t))(Fr.has(o)||ic.has(o))&&Sn(s,o,n,r+1)}}function uc(t){let e=[];Sn(t.data,void 0,e);let n=[],r=new Set;for(let o of e)for(let s of o.split(/\n+|(?<=[.!?])\s+/u)){let i=qr(s);if(cc(i)&&!r.has(i)&&(r.add(i),n.push(i),n.length>=50))return n}return n}function Wr(t){return(t.role??(typeof t.data.role=="string"?t.data.role:"")).toLowerCase()}function lc(t,e,n){if(n.type==="decision")return{kind:"decision",confidence:1};if(n.type==="todo")return{kind:"todo",confidence:1};let r=e==="user"||n.type==="user_prompt",o=e==="assistant"||n.type==="assistant_message";return r&&L(t,zr)?{kind:"rule",confidence:.98}:r&&L(t,Qa)?{kind:"rule",confidence:.92}:L(t,Za)?{kind:L(t,Dr)?"architecture":"decision",confidence:r?.93:.86}:r&&L(t,tc)?{kind:"next_action",confidence:.88}:r&&L(t,ec)?{kind:"todo",confidence:.87}:L(t,Dr)&&L(t,rc)?{kind:"architecture",confidence:r?.88:.82}:o&&L(t,nc)?{kind:"fix",confidence:.8}:r&&L(t,oc)&&L(t,sc)?{kind:"context",confidence:.79}:null}function dc(t,e,n){let r=e==="user"||n.type==="user_prompt",o=e==="assistant"||n.type==="assistant_message",s=!!n.provenance.sourcePath&&(t==="architecture"||t==="context"||t==="fix"),i=t==="fix"&&/(?:test|tests|pass|passed|passing)/iu.test(JSON.stringify(n.data));return{userExplicit:r,sourceVerified:s,testVerified:i,crossSessionConfirmations:1,assistantDerived:o}}function pc(t){switch(t){case"rule":return"rule";case"decision":case"architecture":return"decision";case"todo":case"next_action":return"todo";case"fix":case"context":return"code"}}function fc(t,e,n){return t==="rule"&&L(n,zr)?"critical":t==="architecture"||t==="decision"||t==="rule"?"high":t==="fix"||t==="context"?"normal":Kr(e,n)}function Br(t,e){let n=[],r=new Set,o=new Map;for(let s of e){let i=typeof s.data.messageId=="string"?s.data.messageId:void 0,a=Wr(s);i&&a&&o.set(i,a)}for(let s of e){let i=Wr(s),a=typeof s.data.messageId=="string"?s.data.messageId:void 0;!i&&a&&(i=o.get(a)??"");for(let u of uc(s)){let c=lc(u,i,s);if(!c||c.confidence<.75)continue;let p=pc(c.kind),l=ac(u),f=w([t.projectId,c.kind,l].join("|"));if(r.has(f))continue;r.add(f);let d=s.provenance.sourcePath?[s.provenance.sourcePath]:[],m=s.sourceEventId?[s.sourceEventId]:[];n.push({version:1,fingerprint:f,projectId:t.projectId,agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,kind:c.kind,type:p,content:u,confidence:c.confidence,importance:fc(c.kind,p,u),evidence:dc(c.kind,i,s),tags:[p],provenance:{agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,eventIds:[s.id],sourceEventIds:m,sourcePaths:d,firstSequence:s.sequence,lastSequence:s.sequence},createdAt:s.timestamp})}}return n}import{createHash as mc}from"node:crypto";var gc=["project-knowledge","implementation","continuation","session-context"],yc={"project-knowledge":"Project knowledge",implementation:"Implementation state",continuation:"Work continuation","session-context":"Session context"};function kn(t){return mc("sha256").update(t).digest("hex")}function mt(t,e){return`${t}:${kn(e).slice(0,24)}`}function hc(t){try{return kn(JSON.stringify(t))}catch{return kn(String(t))}}function ne(t){let e=new Set,n=[];for(let r of t){let o=r?.replace(/\s+/gu," ").trim();if(!o)continue;let s=o.normalize("NFKC").toLowerCase();e.has(s)||(e.add(s),n.push(o))}return n}function Hr(t,e=420){let n=t.replace(/\s+/gu," ").trim();return n.length<=e?n:`${n.slice(0,Math.max(0,e-1)).trimEnd()}\u2026`}function Sc(t){return t==="rule"||t==="architecture"?"project-knowledge":t==="decision"||t==="fix"?"implementation":t==="todo"?"continuation":"session-context"}function Vr(t){return t.length===0?0:t.reduce((e,n)=>e+n,0)/t.length}function kc(t){return t.slice().sort((e,n)=>n.importanceScore-e.importanceScore||n.confidence-e.confidence||e.id.localeCompare(n.id)).slice(0,5).map(e=>Hr(e.content)).join(" | ")}function vc(t){return t.slice().sort((e,n)=>n.importanceScore-e.importanceScore||n.confidence-e.confidence||e.id.localeCompare(n.id)).slice(0,6).map(e=>Hr(e.content)).join(`
`)}function Jr(t,e){let n=t.slice().sort((f,d)=>f.sequence-d.sequence||f.timestamp.localeCompare(d.timestamp)||f.id.localeCompare(d.id)),r=n.map(f=>({id:mt("raw",[f.projectId,f.agent,f.nativeSessionId,f.id,String(f.sequence)].join("|")),level:"raw",eventId:f.id,sourceEventId:f.sourceEventId,sequence:f.sequence,type:f.type,role:f.role,timestamp:f.timestamp,sourcePath:f.provenance.sourcePath,payloadDigest:hc(f.data)})),o=new Map,s=new Map;n.forEach((f,d)=>{let m=r[d];m&&(o.set(f.id,m.id),f.sourceEventId&&s.set(f.sourceEventId,m.id))});let i=e.map(f=>{let d=ne([...f.provenance.eventIds.map(m=>o.get(m)),...f.provenance.sourceEventIds.map(m=>s.get(m))]);return{id:mt("fact",f.fingerprint),level:"fact",fingerprint:f.fingerprint,kind:f.kind,type:f.type,content:f.content,knowledgeClass:f.knowledgeClass,importanceScore:f.importanceScore,confidence:f.confidence,tags:ne([...f.tags,"level:fact",`class:${f.knowledgeClass}`,`kind:${f.kind}`]),rawIds:d,sourcePaths:ne(f.provenance.sourcePaths)}}),a=new Map;for(let f of i){let d=Sc(f.kind),m=a.get(d)??[];m.push(f),a.set(d,m)}let u=[];for(let f of gc){let d=a.get(f);if(!d?.length)continue;let m=d.slice().sort((y,g)=>g.importanceScore-y.importanceScore||g.confidence-y.confidence||y.id.localeCompare(g.id)),S=m.map(y=>y.id);u.push({id:mt("scene",`${f}|${S.join("|")}`),level:"scene",kind:f,title:yc[f],summary:kc(m),factIds:S,importanceScore:Math.max(...m.map(y=>y.importanceScore)),confidence:Vr(m.map(y=>y.confidence)),tags:ne(["level:scene",`scene:${f}`,...m.flatMap(y=>y.tags)]),sourcePaths:ne(m.flatMap(y=>y.sourcePaths))})}let c=new Map(i.map(f=>[f.id,f])),p=[];for(let f of u){let m=f.factIds.map(g=>c.get(g)).filter(g=>!!g).filter(g=>(g.knowledgeClass==="permanent"||g.knowledgeClass==="task")&&g.importanceScore>=.55);if(m.length===0)continue;let S=m.some(g=>g.knowledgeClass==="permanent")?"permanent":"task",y=vc(m);p.push({id:mt("knowledge",`${f.id}|${S}|${m.map(g=>g.id).join("|")}`),level:"knowledge",knowledgeClass:S,title:f.title,content:y,sceneIds:[f.id],factIds:m.map(g=>g.id),importanceScore:Math.max(...m.map(g=>g.importanceScore)),confidence:Vr(m.map(g=>g.confidence)),tags:ne(["level:knowledge",`class:${S}`,`scene:${f.kind}`,...m.flatMap(g=>g.tags)]),sourcePaths:ne(m.flatMap(g=>g.sourcePaths))})}let l=[];for(let f of i)for(let d of f.rawIds)l.push({from:d,to:f.id,type:"supports"});for(let f of u)for(let d of f.factIds)l.push({from:d,to:f.id,type:"belongs_to"});for(let f of p)for(let d of f.sceneIds)l.push({from:d,to:f.id,type:"promotes_to"});return{schema:"toolnet.memory-hierarchy.v1",version:1,raw:r,facts:i,scenes:u,knowledge:p,links:l,stats:{raw:r.length,facts:i.length,scenes:u.length,knowledge:p.length,links:l.length}}}function gt(t){return t?Math.ceil(t.length/3.5):0}function yt(t,e){if(!t)return"";if(gt(t)<=e)return t;let r=Math.floor(e*3.5),o=t.slice(0,r),s=o.lastIndexOf("."),i=o.lastIndexOf(`
`),a=Math.max(s,i);return a>r*.7?o.slice(0,a+1):o}function re(){let t=Qe(),e=process.env.TOOLNET_SESSION_SAVE||"summary",n=process.env.TOOLNET_RAW_TRANSCRIPT==="on"||e==="archive"||e==="full",r=process.env.TOOLNET_MEMORY_PROMOTION||"conservative",o=parseFloat(process.env.TOOLNET_PROMOTE_MIN_SCORE||"0.65"),s=parseInt(process.env.TOOLNET_SESSION_SUMMARY_MAX_TOKENS||"700",10),i=parseInt(process.env.TOOLNET_DURABLE_MEMORY_MAX_ITEMS_PER_SESSION||"10",10),a=n,u=process.env.TOOLNET_RAW_TRANSCRIPT_REMOTE==="on"||e==="full";return{sessionSave:e,rawTranscript:n,memoryPromotion:r,promoteMinScore:o,sessionSummaryMaxTokens:s,durableMemoryMaxItemsPerSession:i,archiveLocal:a,archiveRemote:u}}function Gr(t){return(t||re()).rawTranscript}function Ur(t){return(t||re()).durableMemoryMaxItemsPerSession}function Yr(t){return(t||re()).sessionSummaryMaxTokens}function Xr(t){return(t||re()).archiveRemote}var Qr=new J;function Zr(t){let e=t.trim();if(e.startsWith("{")&&e.endsWith("}")||e.startsWith("[")&&e.endsWith("]"))try{let r=JSON.parse(e);return JSON.stringify(Qr.sanitizeValue(r))}catch{}let n=Qr.sanitize(t).text;return n=n.replace(/("(?:api[_-]?key|token|secret|password|cookie|authorization)"\s*:\s*)"[^"]*"/gi,'$1"[REDACTED]"').replace(/('(?:api[_-]?key|token|secret|password|cookie|authorization)'\s*:\s*)'[^']*'/gi,"$1'[REDACTED]'").replace(/\b(api[_-]?key|token|secret|password|cookie|authorization)\b\s*[:=]\s*[^\s,;]+/gi,"$1=[REDACTED]").replace(/\bbearer\s+[A-Za-z0-9._~+/=-]+/gi,"Bearer [REDACTED]"),n}function wc(t,e){let n=t.toLowerCase(),r=.5,o=["nh\u1EDB","remember","quy t\u1EAFc","rule","t\u1EEB gi\u1EDD","from now","kh\xF4ng \u0111\u01B0\u1EE3c","must not","lu\xF4n lu\xF4n","always","never","critical","important","blocker","deploy","production","architecture"];for(let i of o)n.includes(i)&&(r+=.15);e==="rule"||e==="architecture"||e==="blocker"?r+=.2:e==="decision"||e==="deploy"?r+=.15:(e==="fix"||e==="next_action")&&(r+=.1),t.length<20?r-=.3:t.length>500&&(r-=.1);let s=[/npm (notice|warn|ERR)/i,/\d+ packages? in \d+/i,/found \d+ vulnerabilities/i,/up to date/i,/added \d+ packages/i,/^(ok|done|success|error|warning)$/i];for(let i of s)i.test(t)&&(r-=.4);return Math.max(0,Math.min(1,r))}function bc(t,e){let n=[],r=new Set;for(let i of t){let a=i.split(`
`).filter(u=>u.trim());for(let u of a){let c=u.trim();if(c.length<15)continue;let p=c.toLowerCase().replace(/\s+/g," ");if(r.has(p))continue;r.add(p);let l="decision";/\b(rule|quy tắc|policy|standard|convention)\b/i.test(c)||/\b(always|never|must|should|từ giờ|không được)\b/i.test(c)?l="rule":/\b(fix|fixed|bug|issue|error|lỗi)\b/i.test(c)?l="fix":/\b(blocker|blocked|stuck|cannot|không thể)\b/i.test(c)?l="blocker":/\b(next|todo|action|task|cần làm)\b/i.test(c)?l="next_action":/\b(deploy|release|publish|ship)\b/i.test(c)?l="deploy":/\b(architecture|design|structure|pattern)\b/i.test(c)?l="architecture":/\.(ts|js|py|go|rs|java|cpp|c|h)\b/i.test(c)&&(l="file");let f=wc(c,l);if(f<.3)continue;let d=Zr(c);n.push({category:l,text:d,importance:f,sourceSessionId:e})}}let o=re(),s=Ur(o);return n.sort((i,a)=>a.importance-i.importance).slice(0,s)}function xc(t){let e=re(),n=Yr(e),s=t.join(`

`).split(`
`).filter(i=>{let a=i.trim();return a.length>20&&!a.startsWith("npm")&&!a.startsWith("\u2713")&&!a.startsWith("Error:")}).slice(0,20).map(i=>Zr(i)).join(`
`);return yt(s,n)}function ht(t,e){let r=(Array.isArray(t)?t:t.split(`

`).filter(d=>d.trim())).map(d=>typeof d=="string"?d:JSON.stringify(d)).filter(d=>d.trim()),o=bc(r,e),s=o.filter(d=>d.category==="decision").map(d=>d.text),i=o.filter(d=>d.category==="rule").map(d=>d.text),a=o.filter(d=>d.category==="file").map(d=>d.text),u=o.filter(d=>d.category==="fix").map(d=>d.text),c=o.filter(d=>d.category==="blocker").map(d=>d.text),p=o.filter(d=>d.category==="next_action").map(d=>d.text),l=o.filter(d=>d.category==="deploy").map(d=>d.text);return{summary:xc(r),decisions:s,projectRules:i,filesChanged:a,bugsFixed:u,commands:l,blockers:c,nextActions:p,durableFacts:o}}function U(t){let e=new Set,n=[];for(let r of t){let o=r?.replace(/\s+/g," ").trim();if(!o)continue;let s=o.normalize("NFKC").toLowerCase();e.has(s)||(e.add(s),n.push(o))}return n}function Ec(t){let e=new Map;for(let n of t){if(!n||!n.id||!Number.isFinite(n.sequence))continue;let r=n.sourceEventId?`${n.agent}:${n.sourceEventId}`:n.id,o=e.get(r);(!o||n.sequence>o.sequence)&&e.set(r,n)}return[...e.values()].sort((n,r)=>n.sequence-r.sequence||n.timestamp.localeCompare(r.timestamp))}function Cc(t){let e=t.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}_./:-]+/gu)??[],n=new Set;for(let r of e)if(!(r.length<2||/^\d+$/u.test(r))&&(n.add(r),n.size>=40))break;return[...n]}function Ic(t){let e=hn(t);return{...t,knowledgeClass:e.knowledgeClass,importanceScore:e.score,retrievalTerms:Cc(t.content),tags:U([...t.tags,"level:fact",`class:${e.knowledgeClass}`,`kind:${t.kind}`])}}function jc(t){return t.map(e=>{try{return JSON.stringify({type:e.type,role:e.role,data:e.data,provenance:{sourcePath:e.provenance.sourcePath,files:e.provenance.files}})}catch{return""}}).filter(Boolean)}function Ac(t,e,n){let r=ht(jc(e),t.nativeSessionId),o=n.filter(c=>c.kind==="todo"||c.kind==="next_action").map(c=>c.content),s=n.flatMap(c=>c.provenance.sourcePaths),i=n.filter(c=>c.kind==="architecture").map(c=>c.content),a=U([...o,...r.nextActions]),u=U([...r.nextActions,...o]);return{summary:r.summary,state:{task:u[0]??a[0],decisions:U(r.decisions),files:U([...r.filesChanged,...s]),todos:a,completed:U(r.bugsFixed),blockers:U(r.blockers),nextActions:u,architecture:U(i)}}}function St(t,e){let n=Ec(e),r=Br(t,n).map(Ic),o=r.filter(p=>hn(p).persist).sort((p,l)=>l.importanceScore-p.importanceScore),{summary:s,state:i}=Ac(t,n,o),a=o.map(p=>({fingerprint:p.fingerprint,kind:p.kind,knowledgeClass:p.knowledgeClass,importanceScore:p.importanceScore,content:p.content,terms:p.retrievalTerms})),u=Jr(n,o),c=p=>r.filter(l=>l.knowledgeClass===p).length;return{version:2,normalizedEvents:n,summary:s,state:i,candidates:o,retrievalIndex:a,hierarchy:u,stats:{inputEvents:e.length,normalizedEvents:n.length,extractedCandidates:r.length,persistedCandidates:o.length,permanent:c("permanent"),task:c("task"),session:c("session"),transient:c("transient")}}}import{createHash as Mc}from"node:crypto";import{chmodSync as eo,existsSync as Pc,mkdirSync as Oc,readFileSync as Tc,renameSync as Rc,writeFileSync as to}from"node:fs";import{dirname as no,join as kt}from"node:path";var bn="toolnet.context-offload.v1",Nc="toolnet.context-offload-asset.v1",_c=256,Lc=new Set(["tool_call","tool_result","file_read","file_write","file_edit","command","test","artifact"]);function ro(t){return kt(t,".toolnet","offload")}function $c(t){return kt(ro(t),"assets")}function oo(t){return kt(ro(t),"graph.json")}function so(t){Oc(t,{recursive:!0,mode:448});try{eo(t,448)}catch{}}function Kc(t,e){so(no(t));let n=`${t}.${process.pid}.${Date.now()}.tmp`;to(n,e,{encoding:"utf8",mode:384}),Rc(n,t);try{eo(t,384)}catch{}}function wn(t){return Array.isArray(t)?t.map(wn):t&&typeof t=="object"?Object.fromEntries(Object.entries(t).sort(([e],[n])=>e.localeCompare(n)).map(([e,n])=>[e,wn(n)])):t}function Dc(t){return Mc("sha256").update(JSON.stringify(wn(t)),"utf8").digest("hex")}function vn(){return{schema:bn,version:1,updatedAt:new Date(0).toISOString(),nodes:[]}}function Fc(t){let e=oo(t);if(!Pc(e))return vn();try{let n=JSON.parse(Tc(e,"utf8"));return n.schema!==bn||n.version!==1||!Array.isArray(n.nodes)?vn():n}catch{return vn()}}function Wc(t,e){Kc(oo(t),JSON.stringify(e,null,2)+`
`)}function zc(t,e=260){if(typeof t!="string")return null;let n=t.replace(/\s+/gu," ").trim();return n?n.slice(0,e):null}function qc(t){let e=[...t.provenance.files??[],t.provenance.sourcePath],n=[];for(let r of e){let o=zc(r);if(!(!o||n.includes(o))&&(n.push(o),n.length===3))break}return n}function Bc(t){return`${t.agent}:${t.sourceEventId??t.id}`.replace(/\s+/gu," ").trim().slice(0,120)}function Vc(t,e){so(no(t));try{return to(t,e,{encoding:"utf8",flag:"wx",mode:384}),!0}catch(n){if(n.code==="EEXIST")return!1;throw n}}function Hc(t,e){let n=t.nodes.find(o=>o.id===e.id),r=n?{...n,kind:e.kind,bytes:e.bytes,sourceRefs:Array.from(new Set([...n.sourceRefs,...e.sourceRefs])).slice(-8),files:Array.from(new Set([...n.files,...e.files])).slice(0,6)}:e;return{schema:bn,version:1,updatedAt:new Date().toISOString(),nodes:[...t.nodes.filter(o=>o.id!==e.id),r].slice(-_c)}}function io(t,e){let n=Fc(t),r=0,o=0,s=0,i=[];for(let a of e){if(!Lc.has(a.type))continue;r+=1;let u=Dc({type:a.type,data:a.data}),c={schema:Nc,version:1,assetId:u,event:{type:a.type,agent:a.agent,nativeSessionId:a.nativeSessionId,timestamp:a.timestamp,sourceEventId:a.sourceEventId,provenance:a.provenance,data:a.data}},p=JSON.stringify(c,null,2)+`
`;Vc(kt($c(t),`${u}.json`),p)?o+=1:s+=1,i.push(u),n=Hc(n,{id:u,kind:a.type,bytes:Buffer.byteLength(p,"utf8"),createdAt:a.timestamp,sourceRefs:[Bc(a)],files:qc(a)})}return r>0&&Wc(t,n),{eligible:r,written:o,deduped:s,graphNodes:n.nodes.length,assetIds:i}}import{createHash as eu}from"node:crypto";import{existsSync as tu,readdirSync as nu,readFileSync as ru}from"node:fs";import{basename as ou,join as Eo}from"node:path";import{randomUUID as uo}from"node:crypto";var A=class extends Error{constructor(n,r){super(n);this.statusCode=r}statusCode};function Le(t){let e=new Set,n=[];for(let r of t){let o=r.replace(/\s+/gu," ").trim();if(!o)continue;let s=o.normalize("NFKC").toLowerCase();e.has(s)||(e.add(s),n.push(o))}return n}function se(t){let e=t.normalize("NFKD").replace(/[\u0300-\u036f]/gu,"").toLowerCase().replace(/[^a-z0-9]+/gu,"-").replace(/^-+|-+$/gu,"").slice(0,120);if(!e)throw new A("Invalid Wiki slug",400);return e}function ao(t){let e=[];for(let n of t.matchAll(/\[\[([^\[\]]+)\]\]/gu)){let r=n[1]?.trim();r&&e.push(se(r))}return Le(e)}function Jc(t){return t.normalize("NFKC").toLowerCase().split(/[^\p{L}\p{N}_-]+/u).map(e=>e.trim()).filter(e=>e.length>=2)}function co(t){return{id:`revision-${uo()}`,pageId:t.id,slug:t.slug,revision:t.revision,title:t.title,...t.summary?{summary:t.summary}:{},content:t.content,tags:[...t.tags],links:[...t.links],createdAt:t.updatedAt}}function oe(t){return structuredClone(t)}var vt=class{constructor(e){this.store=e}store;state;queue=Promise.resolve();async initialize(){await this.ensureState()}async ensureState(){return this.state||(this.state=await this.store.load()),this.state}async mutate(e){let n,r=this.queue.then(async()=>{let o=await this.ensureState();n=e(o),o.updatedAt=new Date().toISOString(),await this.store.save(o)});return this.queue=r.then(()=>{},()=>{}),await r,n}async summary(){let e=await this.ensureState(),n=new Set(e.pages.flatMap(r=>r.links));return{schema:"toolnet.wiki-summary.v1",projectId:e.projectId,pages:e.pages.length,revisions:e.revisions.length,tags:Le(e.pages.flatMap(r=>r.tags)).sort((r,o)=>r.localeCompare(o)),links:e.pages.reduce((r,o)=>r+o.links.length,0),orphanPages:e.pages.filter(r=>r.links.length===0&&!n.has(r.slug)).length,automatedPages:e.pages.filter(r=>r.tags.some(o=>o.startsWith("toolnet-auto-"))).length,updatedAt:e.updatedAt}}async listPages(){let e=await this.ensureState();return oe([...e.pages].sort((n,r)=>n.title.localeCompare(r.title)))}async getPage(e){let n=await this.ensureState(),r=se(e),o=n.pages.find(s=>s.slug===r||s.id===e);if(!o)throw new A(`Wiki page not found: ${e}`,404);return oe(o)}async createPage(e){return this.mutate(n=>{let r=e.title.trim(),o=e.content.trim();if(!r)throw new A("Wiki title is required",400);let s=se(e.slug??r);if(n.pages.some(u=>u.slug===s))throw new A(`Wiki page already exists: ${s}`,409);let i=new Date().toISOString(),a={id:`wiki-${uo()}`,slug:s,title:r,...e.summary?.trim()?{summary:e.summary.trim()}:{},content:o,tags:Le(e.tags??[]),links:ao(o),revision:1,createdAt:i,updatedAt:i};return n.pages.push(a),n.revisions.push(co(a)),oe(a)})}async updatePage(e,n){return this.mutate(r=>{let o=se(e),s=r.pages.find(i=>i.slug===o||i.id===e);if(!s)throw new A(`Wiki page not found: ${e}`,404);if(n.title!==void 0){let i=n.title.trim();if(!i)throw new A("Wiki title is required",400);s.title=i}if(n.summary!==void 0){let i=n.summary.trim();i?s.summary=i:delete s.summary}return n.content!==void 0&&(s.content=n.content.trim(),s.links=ao(s.content)),n.tags!==void 0&&(s.tags=Le(n.tags)),s.revision+=1,s.updatedAt=new Date().toISOString(),r.revisions.push(co(s)),oe(s)})}async history(e){let n=await this.getPage(e),r=await this.ensureState();return oe(r.revisions.filter(o=>o.pageId===n.id).sort((o,s)=>s.revision-o.revision))}async backlinks(e){let n=await this.getPage(e),r=await this.ensureState();return oe(r.pages.filter(o=>o.links.includes(n.slug)).sort((o,s)=>o.title.localeCompare(s.title)))}async search(e,n=10){let r=await this.ensureState(),o=Le(Jc(e));if(o.length===0)return[];let s=Math.max(1,Math.min(20,Math.floor(n))),i=[];for(let a of r.pages){let u=a.title.toLowerCase(),c=a.slug.toLowerCase(),p=a.summary?.toLowerCase()??"",l=a.content.toLowerCase(),f=a.tags.map(m=>m.toLowerCase()),d=0;for(let m of o)c===m&&(d+=12),u===m&&(d+=10),u.includes(m)&&(d+=6),c.includes(m)&&(d+=5),f.some(S=>S===m)?d+=5:f.some(S=>S.includes(m))&&(d+=3),p.includes(m)&&(d+=2),l.includes(m)&&(d+=1);d>0&&i.push({page:oe(a),score:d})}return i.sort((a,u)=>u.score-a.score||u.page.updatedAt.localeCompare(a.page.updatedAt)).slice(0,s)}};var lo="wiki/state.v1.json";function Gc(t){let e=new Date().toISOString();return{schema:"toolnet.wiki.v1",version:1,projectId:t.id,pages:[],revisions:[],createdAt:e,updatedAt:e}}function Uc(t,e){let n=JSON.parse(t);if(n.schema!=="toolnet.wiki.v1"||n.version!==1||n.projectId!==e.id||!Array.isArray(n.pages)||!Array.isArray(n.revisions))throw new Error("Invalid ToolNet Wiki state");return n}var wt=class{constructor(e,n){this.storage=e;this.project=n}storage;project;async load(){let e=await this.storage.getText(lo);if(!e){let n=Gc(this.project);return await this.save(n),n}return Uc(e,this.project)}async save(e){await this.storage.put(lo,JSON.stringify(e,null,2),"application/json")}};import{createHash as Yc,randomUUID as po}from"node:crypto";var fo="wiki/governance.v1.json",ho="toolnet.knowledge-governance.v1",mo=500,$e={autoApproveThreshold:.86,criticalApproveThreshold:.94,staleAfterDays:90};function Xc(t,e=0,n=1){return Math.max(e,Math.min(n,t))}function xn(t){return t.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/gu," ").trim()}function go(t){return Yc("sha256").update(t.normalize("NFKC").replace(/\s+/gu," ").trim()).digest("hex")}function Qc(t){let e=[t.title,t.summary??"",t.content.slice(0,2e3),...t.tags].join(" ").toLowerCase();return/\b(?:architecture|security|authentication|authorization|auth|database|production|deploy|deployment|payment|billing|permission|permissions|acl|credential|secret|migration)\b/u.test(e)}function Zc(t){let e=t.sourceType==="skill"?.96:t.sourceType==="memory"?.94:.88,n=t.tags.map(r=>r.toLowerCase());return(n.includes("permanent")||n.includes("task"))&&(e+=.03),t.content.length>=200&&(e+=.02),t.content.length<80&&(e-=.05),t.title.length<4&&(e-=.05),Xc(e)}function yo(t){let e=new Date().toISOString();return{schema:ho,version:1,projectId:t,policy:{...$e},reviews:[],audit:[],createdAt:e,updatedAt:e}}function So(t){let e=t.autoApproveThreshold??$e.autoApproveThreshold,n=t.criticalApproveThreshold??$e.criticalApproveThreshold,r=t.staleAfterDays??$e.staleAfterDays;if(!Number.isFinite(e)||e<.5||e>1)throw new A("Invalid autoApproveThreshold",400);if(!Number.isFinite(n)||n<.5||n>1)throw new A("Invalid criticalApproveThreshold",400);if(!Number.isInteger(r)||r<1||r>3650)throw new A("Invalid staleAfterDays",400);return{autoApproveThreshold:e,criticalApproveThreshold:n,staleAfterDays:r}}var bt=class{constructor(e,n){this.storage=e;this.project=n}storage;project;async load(){let e=await this.storage.getText(fo);if(!e){let n=yo(this.project.id);return await this.save(n),n}try{let n=JSON.parse(e);if(n.schema!==ho||n.version!==1||n.projectId!==this.project.id||!Array.isArray(n.reviews)||!Array.isArray(n.audit))throw new Error("invalid");return{...n,policy:So(n.policy??$e)}}catch{let n=yo(this.project.id);return await this.save(n),n}}async save(e){await this.storage.put(fo,JSON.stringify(e,null,2),"application/json")}},xt=class{constructor(e){this.store=e}store;state;queue=Promise.resolve();async initialize(){await this.ensureState()}async ensureState(){return this.state||(this.state=await this.store.load()),this.state}audit(e,n,r,o={}){e.audit.push({id:po(),action:n,principal:r,...o.reviewId?{reviewId:o.reviewId}:{},...o.sourceKey?{sourceKey:o.sourceKey}:{},timestamp:new Date().toISOString(),...o.metadata?{metadata:o.metadata}:{}}),e.audit.length>mo&&(e.audit=e.audit.slice(-mo))}async mutate(e){let n,r=this.queue.then(async()=>{let o=await this.ensureState();n=await e(o),o.updatedAt=new Date().toISOString(),await this.store.save(o)});return this.queue=r.then(()=>{},()=>{}),await r,n}async policy(){return{...(await this.ensureState()).policy}}async setPolicy(e,n){return this.mutate(r=>(r.policy=So({...r.policy,...e}),this.audit(r,"policy:update",n,{metadata:{...r.policy}}),{...r.policy}))}async summary(){let e=await this.ensureState(),n=r=>e.reviews.filter(o=>o.status===r).length;return{schema:"toolnet.knowledge-governance-summary.v1",projectId:e.projectId,pending:n("pending"),approved:n("approved"),rejected:n("rejected"),superseded:n("superseded"),criticalPending:e.reviews.filter(r=>r.status==="pending"&&r.risk==="critical").length,conflictPending:e.reviews.filter(r=>r.status==="pending"&&r.risk==="conflict").length,auditEvents:e.audit.length,policy:{...e.policy},updatedAt:e.updatedAt}}async listReviews(e){let n=await this.ensureState();return structuredClone(n.reviews.filter(r=>!e||r.status===e).sort((r,o)=>o.updatedAt.localeCompare(r.updatedAt)))}async auditLog(e=100){let n=await this.ensureState(),r=Math.max(1,Math.min(500,Math.floor(e)));return structuredClone(n.audit.slice(-r).reverse())}async assess(e,n){let r=await this.ensureState(),o=Zc(e),s=xn(e.title),i=n.filter(p=>p.slug!==e.slug&&xn(p.title)===s&&go(p.content)!==go(e.content)).map(p=>p.slug),a=Qc(e),u=[];o<r.policy.autoApproveThreshold&&u.push(`confidence:${o.toFixed(2)}`),a&&o<r.policy.criticalApproveThreshold&&u.push("critical-knowledge"),i.length>0&&u.push("conflicting-knowledge");let c=i.length>0?"conflict":a?"critical":"normal";return{confidence:o,risk:c,requiresReview:i.length>0||o<r.policy.autoApproveThreshold||a&&o<r.policy.criticalApproveThreshold,reasons:u,conflicts:i}}async gate(e,n){let r=await this.assess(e,n);return this.mutate(o=>{let s=o.reviews.find(u=>u.sourceKey===e.sourceKey&&u.digest===e.digest);if(s?.status==="approved")return{allowed:!0,mode:"review-approved",assessment:r,review:structuredClone(s)};if(s?.status==="rejected")return{allowed:!1,mode:"rejected",assessment:r,review:structuredClone(s)};if(!r.requiresReview)return this.audit(o,"knowledge:auto-approved","system",{sourceKey:e.sourceKey,metadata:{confidence:r.confidence,risk:r.risk}}),{allowed:!0,mode:"auto-approved",assessment:r};if(s?.status==="pending")return{allowed:!1,mode:"pending-review",assessment:r,review:structuredClone(s)};let i=new Date().toISOString(),a={id:po(),sourceKey:e.sourceKey,sourceType:e.sourceType,slug:e.slug,marker:e.marker,digest:e.digest,title:e.title,...e.summary?{summary:e.summary}:{},content:e.content,tags:[...new Set([...e.tags,e.marker])],confidence:r.confidence,risk:r.risk,reasons:[...r.reasons],conflicts:[...r.conflicts],status:"pending",createdAt:i,updatedAt:i};return o.reviews.push(a),this.audit(o,"knowledge:review-requested","system",{reviewId:a.id,sourceKey:a.sourceKey,metadata:{confidence:a.confidence,risk:a.risk}}),{allowed:!1,mode:"pending-review",assessment:r,review:structuredClone(a)}})}async markApplied(e,n){await this.mutate(r=>{let o=r.reviews.find(s=>s.sourceKey===e&&s.digest===n&&s.status==="approved");o&&(o.appliedAt=new Date().toISOString(),o.updatedAt=o.appliedAt,this.audit(r,"knowledge:applied",o.reviewedBy??"system",{reviewId:o.id,sourceKey:e}))})}async decide(e,n,r){return this.mutate(async o=>{let s=o.reviews.find(c=>c.id===e);if(!s)throw new A(`Governance review not found: ${e}`,404);if(s.status!=="pending")throw new A("Governance review is already resolved",409);let i=new Date().toISOString();if(s.reviewedAt=i,s.reviewedBy=n.principal,s.updatedAt=i,n.note?.trim()&&(s.reviewNote=n.note.trim()),n.action==="reject")return s.status="rejected",this.audit(o,"knowledge:rejected",n.principal,{reviewId:e,sourceKey:s.sourceKey}),structuredClone(s);if(n.action==="supersede")return s.status="superseded",n.targetReviewId&&(s.supersededBy=n.targetReviewId),this.audit(o,"knowledge:superseded",n.principal,{reviewId:e,sourceKey:s.sourceKey,metadata:{targetReviewId:n.targetReviewId}}),structuredClone(s);if(n.action==="merge"){if(!n.targetReviewId)throw new A("targetReviewId is required for merge",400);let c=o.reviews.find(p=>p.id===n.targetReviewId);if(!c)throw new A("Merge target review not found",404);return s.status="superseded",s.mergedInto=c.id,this.audit(o,"knowledge:merged",n.principal,{reviewId:e,sourceKey:s.sourceKey,metadata:{targetReviewId:c.id}}),structuredClone(s)}s.status="approved";let u=(await r.listPages()).find(c=>c.slug===s.slug);if(u&&!u.tags.includes(s.marker))throw new A(`Wiki page '${s.slug}' is manually managed`,409);return u?await r.updatePage(s.slug,{title:s.title,summary:s.summary??"",content:s.content,tags:s.tags}):await r.createPage({slug:s.slug,title:s.title,...s.summary?{summary:s.summary}:{},content:s.content,tags:s.tags}),s.appliedAt=i,this.audit(o,"knowledge:approved",n.principal,{reviewId:e,sourceKey:s.sourceKey}),structuredClone(s)})}async quality(e){let n=await this.ensureState(),r=await e.listPages(),o=Date.now(),s=n.policy.staleAfterDays*864e5,i=r.map(p=>{let l=o-Date.parse(p.updatedAt);return{slug:p.slug,title:p.title,updatedAt:p.updatedAt,ageDays:Math.max(0,Math.floor(l/864e5)),stale:Number.isFinite(l)&&l>s}}).filter(p=>p.stale).map(({stale:p,...l})=>l),a=new Map;for(let p of r){let l=xn(p.title),f=a.get(l)??[];f.push(p),a.set(l,f)}let u=[...a.entries()].filter(([,p])=>p.length>1).map(([p,l])=>({title:p,pages:l.map(f=>f.slug)})),c=n.reviews.filter(p=>p.status==="pending");return{schema:"toolnet.knowledge-quality.v1",totalPages:r.length,automatedPages:r.filter(p=>p.tags.some(l=>l.startsWith("toolnet-auto-"))).length,manualPages:r.filter(p=>!p.tags.some(l=>l.startsWith("toolnet-auto-"))).length,stalePages:i,duplicateTitles:u,pendingReviews:c.length,lowConfidenceReviews:c.filter(p=>p.confidence<n.policy.autoApproveThreshold).length,conflicts:c.filter(p=>p.risk==="conflict").length,generatedAt:new Date().toISOString()}}};var Co="wiki/automation.v1.json",Io="toolnet.wiki-automation.v1",In=8e3,ko=new Set(["raw","rawtext","raw_text","rawtranscript","raw_transcript","transcript","messages","message","payload","prompt","response","assistantmessage","assistant_message","userprompt","user_prompt"]);function De(t){return eu("sha256").update(JSON.stringify(t)).digest("hex")}function Ke(t){if(!(!t||typeof t!="object"||Array.isArray(t)))return t}function vo(t){return Array.isArray(t)?t:[]}function jo(t){return typeof t!="string"?void 0:t.replace(/\s+/gu," ").trim()||void 0}function En(t){return Array.isArray(t)?t.map(jo).filter(e=>!!e):[]}function D(t,e){for(let n of e){let r=jo(t[n]);if(r)return r}}function Fe(t){let e=new Set,n=[];for(let r of t){let o=r.replace(/\s+/gu," ").trim();if(!o)continue;let s=o.normalize("NFKC").toLowerCase();e.has(s)||(e.add(s),n.push(o))}return n}function Et(t,e=0,n=""){if(e>3)return[];let r=n.replace(/[^a-z0-9]/giu,"").toLowerCase();if(ko.has(r))return[];if(typeof t=="string"){let i=t.replace(/\s+/gu," ").trim();return i.length<8?[]:[i]}if(Array.isArray(t))return t.flatMap(i=>Et(i,e+1,n));let o=Ke(t);if(!o)return[];let s=[];for(let[i,a]of Object.entries(o)){let u=i.replace(/[^a-z0-9]/giu,"").toLowerCase();ko.has(u)||s.push(...Et(a,e+1,i))}return s}function wo(t){let n=Fe(["content","summary","text","value","statement","description","decision","task","knowledge","context","outcome","reason","rationale"].flatMap(o=>Et(t[o],0,o)));return(n.length>0?n:Fe(Et(t))).join(`

`).slice(0,In)}function bo(t,e){return D(t,["id","key","fingerprint","knowledgeId","sceneId"])??e}function xo(t,e){return D(t,["title","name","topic","label","task","kind","type"])??e}function su(t){return(D(t,["knowledgeClass","class","classification","scope"])??"").toLowerCase()}function iu(t){return(D(t,["kind","sceneKind","type"])??"").toLowerCase()}function au(t){let e=Ke(t);if(!e)return[];let n=[],r=vo(e.knowledge);for(let[s,i]of r.entries()){let a=Ke(i);if(!a)continue;let u=su(a);if(u==="session"||u==="transient")continue;let c=wo(a);if(c.length<20)continue;let p=bo(a,De(a).slice(0,16)),l=xo(a,`Durable Memory ${s+1}`);n.push({sourceKey:`memory:${p}`,sourceType:"memory",title:l,summary:D(a,["summary","description"]),content:c,tags:Fe(["toolnet","auto","memory",...u?[u]:[]])})}let o=vo(e.scenes);for(let[s,i]of o.entries()){let a=Ke(i);if(!a)continue;let u=iu(a);if(u==="session-context")continue;let c=wo(a);if(c.length<20)continue;let p=bo(a,De(a).slice(0,16)),l=xo(a,`Knowledge Scene ${s+1}`);n.push({sourceKey:`scene:${p}`,sourceType:"scene",title:l,summary:D(a,["summary","description"]),content:c,tags:Fe(["toolnet","auto","scene",...u?[u]:[]])})}return n}function cu(t){return Eo(t,".toolnet","memory","skills")}function uu(t){let e=cu(t);if(!tu(e))return{candidates:[],failed:0};let n=[],r=0,o=nu(e).filter(s=>s.endsWith(".json")).sort();for(let s of o)try{let i=JSON.parse(ru(Eo(e,s),"utf8")),a=Ke(i);if(!a||a.schema!=="toolnet.skill-memory.v1")continue;let u=D(a,["id","fingerprint"])??ou(s,".json"),c=D(a,["task"])??"",p=D(a,["title"])||c||`Reusable Skill ${u.slice(0,8)}`,l=D(a,["summary"])??void 0,f=En(a.steps),d=En(a.verification),m=En(a.files),S=[];c&&S.push(`## Task
${c}`),l&&S.push(`## Summary
${l}`),f.length>0&&S.push(`## Procedure
${f.map((g,k)=>`${k+1}. ${g}`).join(`
`)}`),d.length>0&&S.push(`## Verification
${d.map(g=>`- ${g}`).join(`
`)}`),m.length>0&&S.push(`## Relevant Files
${m.map(g=>`- \`${g}\``).join(`
`)}`);let y=S.join(`

`).slice(0,In);if(y.length<20)continue;n.push({sourceKey:`skill:${u}`,sourceType:"skill",title:p,summary:l,content:y,tags:["toolnet","auto","skill","sop"]})}catch{r+=1}return{candidates:n,failed:r}}function Cn(t){let e=new Date().toISOString();return{schema:Io,version:1,projectId:t,entries:[],createdAt:e,updatedAt:e}}async function lu(t,e){let n=await t.getText(Co);if(!n)return Cn(e);try{let r=JSON.parse(n);return r.schema!==Io||r.version!==1||r.projectId!==e||!Array.isArray(r.entries)?Cn(e):r}catch{return Cn(e)}}async function du(t,e){await t.put(Co,JSON.stringify(e,null,2),"application/json")}function pu(t){return`toolnet-auto-${De(t).slice(0,12)}`}function fu(t){let e=se(t.title).slice(0,72),n=De(t.sourceKey).slice(0,10);return se(`auto-${t.sourceType}-${e}-${n}`)}function mu(t){return[`> Auto-generated by ToolNet Knowledge Automation from ${t.sourceType==="skill"?"reusable Skill Memory":t.sourceType==="scene"?"semantic memory scene":"durable memory"}.`,"",t.content].join(`
`).slice(0,In)}function gu(t){return De({sourceType:t.sourceType,title:t.title,summary:t.summary,content:t.content,tags:t.tags})}function yu(t,e){return t.tags.includes(e)}async function Ao(t){let e=au(t.hierarchy),n=uu(t.project.rootPath),r=new Map;for(let d of[...e,...n.candidates])r.set(d.sourceKey,d);let o=[...r.values()].sort((d,m)=>d.sourceKey.localeCompare(m.sourceKey)),s={schema:"toolnet.wiki-automation-result.v1",scanned:e.length+n.candidates.length,eligible:o.length,created:0,updated:0,unchanged:0,skipped:0,failed:n.failed,reviewPending:0,autoApproved:0,reviewApproved:0,pages:[]},i=new vt(new wt(t.storage,t.project));await i.initialize();let a=new xt(new bt(t.storage,t.project));await a.initialize();let u=await lu(t.storage,t.project.id),c=await i.listPages(),p=new Map(c.map(d=>[d.slug,d])),l=new Map(u.entries.map(d=>[d.sourceKey,d]));for(let d of o)try{let m=pu(d.sourceKey),S=gu(d),y=l.get(d.sourceKey),g=y?.slug??fu(d),k=p.get(g);if(k&&!yu(k,m)){s.skipped+=1;continue}let b=Fe([...d.tags,m]),R=mu(d),O=await a.gate({sourceKey:d.sourceKey,sourceType:d.sourceType,slug:g,marker:m,digest:S,title:d.title,...d.summary?{summary:d.summary}:{},content:R,tags:b},[...p.values()]);if(!O.allowed){O.mode==="pending-review"?s.reviewPending+=1:s.skipped+=1;continue}O.mode==="auto-approved"?s.autoApproved+=1:O.mode==="review-approved"&&(s.reviewApproved+=1),k?y?.digest!==S?(k=await i.updatePage(g,{title:d.title,summary:d.summary??"",content:R,tags:b}),p.set(k.slug,k),s.updated+=1,s.pages.push({sourceKey:d.sourceKey,sourceType:d.sourceType,slug:k.slug,action:"updated"})):(s.unchanged+=1,s.pages.push({sourceKey:d.sourceKey,sourceType:d.sourceType,slug:g,action:"unchanged"})):(k=await i.createPage({slug:g,title:d.title,summary:d.summary,content:R,tags:b}),p.set(k.slug,k),s.created+=1,s.pages.push({sourceKey:d.sourceKey,sourceType:d.sourceType,slug:k.slug,action:"created"}));let N=new Date().toISOString(),C={sourceKey:d.sourceKey,sourceType:d.sourceType,slug:g,digest:S,marker:m,updatedAt:N},x=u.entries.findIndex(q=>q.sourceKey===d.sourceKey);x>=0?u.entries[x]=C:u.entries.push(C),l.set(d.sourceKey,C),await a.markApplied(d.sourceKey,S)}catch(m){if(m instanceof A&&m.statusCode===409){s.skipped+=1;continue}s.failed+=1}let f=new Date().toISOString();return u.updatedAt=f,u.lastRunAt=f,u.entries.sort((d,m)=>d.sourceKey.localeCompare(m.sourceKey)),await du(t.storage,u),s}import{createHash as hu}from"node:crypto";import{chmodSync as Po,existsSync as Su,mkdirSync as ku,readFileSync as Yg,readdirSync as Xg,renameSync as vu,statSync as Qg,writeFileSync as wu}from"node:fs";import{join as Oo}from"node:path";var bu="toolnet.skill-memory.v1",Mo=5,xu=16,Eu=24,Cu=32;function Iu(t){return hu("sha256").update(t).digest("hex")}function ze(t,e=Number.MAX_SAFE_INTEGER){let n=new Set,r=[];for(let o of t){let s=o.replace(/\s+/gu," ").trim();if(!s)continue;let i=s.normalize("NFKC").toLowerCase();if(!n.has(i)&&(n.add(i),r.push(s),r.length>=e))break}return r}function jn(t,e=360){let n=t.replace(/\s+/gu," ").trim();return n.length<=e?n:n.slice(0,Math.max(0,e-1)).trimEnd()+"\u2026"}function ju(t){return t.replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/giu,"Bearer [REDACTED]").replace(/\bsk-[A-Za-z0-9_-]{8,}\b/gu,"[REDACTED]").replace(/\b(api[_-]?key|token|password|passwd|secret)\b(\s*[:=]\s*)(["']?)[^\s"'`]+/giu,"$1$2[REDACTED]")}function V(t,e=360){return t&&jn(ju(t),e)||void 0}function qe(t,e){for(let n of e){let r=t[n];if(typeof r=="string"&&r.trim())return r}}function To(t,e){for(let n of e){let r=t[n];if(typeof r=="number"&&Number.isFinite(r))return r;if(typeof r=="string"&&r.trim()&&Number.isFinite(Number(r)))return Number(r)}}function Ro(t,e){for(let n of e){let r=t[n];if(typeof r=="boolean")return r;if(typeof r=="string"){let o=r.trim().toLowerCase();if(["true","yes","pass","passed","success","succeeded","ok"].includes(o))return!0;if(["false","no","fail","failed","error"].includes(o))return!1}}}function No(t){let e=t.data??{};if(Ro(e,["passed","pass","success","succeeded","ok"])===!1)return!0;let r=To(e,["exitCode","exit_code","code","statusCode"]);if(r!==void 0&&r!==0)return!0;let o=qe(e,["status","result","outcome"]);return!!(o&&/\b(fail(?:ed)?|error|broken|cancelled)\b/iu.test(o))}function We(t){let e=t.data??{};if(No(t))return!1;if(Ro(e,["passed","pass","success","succeeded","ok"])===!0||To(e,["exitCode","exit_code","code","statusCode"])===0)return!0;let o=qe(e,["status","result","outcome"]);return o&&/\b(pass(?:ed)?|success(?:ful)?|succeeded|ok|green|complete(?:d)?)\b/iu.test(o)?!0:t.type==="commit"||t.type==="deploy"}function _o(t){let e=t.data??{},n=qe(e,["path","file","filePath","filename","target"]);if(n)return V(n,260);let r=t.provenance?.files;return V(r?.[0],260)}function An(t){return V(qe(t.data??{},["command","cmd","script"]),420)}function ge(t){return V(qe(t.data??{},["name","test","suite","title","message","text","result","status"]),300)}function Au(t){let e=[];for(let n of[...t].sort((r,o)=>r.sequence-o.sequence))if(We(n)){if(n.type==="test"){let r=ge(n)??An(n)??"Tests passed";e.push(`Test passed: ${r}`);continue}if(n.type==="commit"){let r=ge(n);e.push(r?`Commit: ${r}`:"Commit completed");continue}if(n.type==="deploy"){let r=ge(n);e.push(r?`Deploy: ${r}`:"Deployment completed")}}return ze(e,10)}function Mu(t,e){let n=[];for(let r of[...t].sort((o,s)=>o.sequence-s.sequence))switch(r.type){case"file_write":case"file_edit":{let o=_o(r);o&&n.push(`Update ${o}`);break}case"command":{if(No(r))break;let o=An(r);o&&n.push(`Run: ${o}`);break}case"test":{if(!We(r))break;let o=ge(r)??An(r)??"project tests";n.push(`Verify: ${o}`);break}case"commit":{if(!We(r))break;let o=ge(r);n.push(o?`Commit: ${o}`:"Commit verified changes");break}case"deploy":{if(!We(r))break;let o=ge(r);n.push(o?`Deploy: ${o}`:"Deploy verified build");break}default:break}if(n.length===0)for(let r of e.files.slice(0,8)){let o=V(r,260);o&&n.push(`Update ${o}`)}return ze(n,xu)}function Pu(t,e){let n=[...e.files];for(let r of t){let o=_o(r);o&&n.push(o);for(let s of r.provenance?.files??[]){let i=V(s,260);i&&n.push(i)}}return ze(n,Eu)}function Ou(t){return ze(t.filter(e=>["file_write","file_edit","command","test","commit","deploy"].includes(e.type)).map(e=>e.id),Cu)}function Tu(t){return t.map(n=>n.timestamp).filter(Boolean).sort().at(-1)??new Date(0).toISOString()}function Lo(t,e,n){if(e.length===0)return[];let r=Au(e),o=ze(n.completed.map(m=>V(m,280)??""),Mo);if(!(o.length>0||e.some(m=>["test","commit","deploy"].includes(m.type)&&We(m))))return[];let i=V(n.task,280)??V(n.nextActions[0],280),a=o.length>0?o:i?[i]:[];if(a.length===0)return[];let u=Mu(e,n);if(u.length===0)return[];let c=Pu(e,n),p=Ou(e),l=Math.min(...e.map(m=>m.sequence)),f=Math.max(...e.map(m=>m.sequence)),d=Tu(e);return a.slice(0,Mo).map(m=>{let S=[`Reusable procedure learned from successful task: ${m}.`,c.length>0?`Files: ${c.slice(0,6).join(", ")}.`:"",r.length>0?`Verification: ${r.slice(0,4).join("; ")}.`:""].filter(Boolean),y=JSON.stringify({projectId:t.projectId,task:m,steps:u,verification:r,files:c}),g=Iu(y);return{schema:bu,version:1,id:`skill-${g.slice(0,24)}`,fingerprint:g,projectId:t.projectId,title:jn(`SOP: ${m}`,180),task:m,summary:jn(S.join(" "),900),steps:u,verification:r,files:c,source:{agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,firstSequence:l,lastSequence:f,eventIds:p},createdAt:d}})}function Ru(t){return Oo(t.rootPath,".toolnet","memory","skills")}function Nu(t){let e=Ru(t);return ku(e,{recursive:!0,mode:448}),Po(e,448),e}function $o(t,e){if(e.length===0)return{written:0,deduped:0,files:[]};let n=Nu(t),r=0,o=0,s=[];for(let i of e){if(i.projectId!==t.id)throw new Error(`Skill project mismatch: ${i.projectId} != ${t.id}`);let a=Oo(n,`${i.id}.json`);if(s.push(a),Su(a)){o+=1;continue}let u=`${a}.${process.pid}.${Date.now()}.tmp`;wu(u,JSON.stringify(i,null,2)+`
`,{encoding:"utf8",mode:384}),vu(u,a),Po(a,384),r+=1}return{written:r,deduped:o,files:s}}var ly="0".repeat(64);function Ko(t){return String(t).padStart(12,"0")}function _u(t){return`projects/${t.projectId}/memory/learned`}var Ct=class{constructor(e){this.storage=e}storage;async write(e,n,r){if(r.length===0||n.length===0)return null;let o=Math.min(...n.map(l=>l.sequence)),s=Math.max(...n.map(l=>l.sequence)),i={version:1,projectId:e.projectId,agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,createdAt:new Date().toISOString(),firstSequence:o,lastSequence:s,candidateCount:r.length,candidates:r},a=JSON.stringify(i,null,2)+`
`,u=w(r.map(l=>l.fingerprint).sort().join("|")).slice(0,16),c=w(e.sessionKey).slice(0,12),p=[_u(e),"batches",`${Ko(o)}-${Ko(s)}-${c}-${u}.json`].join("/");return await this.storage.exists(p)||await this.storage.put(p,a,"application/json"),p}};import{createHash as Lu}from"node:crypto";function Do(t){return String(t).padStart(12,"0")}function Fo(t){return Lu("sha256").update(t).digest("hex")}function $u(t){return`projects/${t.projectId}/memory/hierarchy`}var It=class{constructor(e){this.storage=e}storage;async write(e,n,r){if(n.length===0||r.facts.length===0)return null;let o=Math.min(...n.map(p=>p.sequence)),s=Math.max(...n.map(p=>p.sequence)),i={schema:"toolnet.memory-hierarchy-batch.v1",version:1,projectId:e.projectId,agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,createdAt:new Date().toISOString(),firstSequence:o,lastSequence:s,hierarchy:r},a=Fo([...r.facts.map(p=>p.id),...r.knowledge.map(p=>p.id)].sort().join("|")).slice(0,16),u=Fo(e.sessionKey).slice(0,12),c=[$u(e),"batches",`${Do(o)}-${Do(s)}-${u}-${a}.json`].join("/");return await this.storage.exists(c)||await this.storage.put(c,`${JSON.stringify(i,null,2)}
`,"application/json"),c}};function qu(t,e){if(!Du(t))return{events:[],nextOffset:e};let n=zu(t).size,r=Number.isFinite(e)?Math.max(0,e):0;if(r>n&&(r=0),r===n)return{events:[],nextOffset:n};let o=n-r,s=Buffer.alloc(o),i=Fu(t,"r");try{Wu(i,s,0,o,r)}finally{Ku(i)}let a=s.toString("utf8"),u=a.lastIndexOf(`
`);if(u<0)return{events:[],nextOffset:r};let c=a.slice(0,u+1);return{events:c.split(`
`).filter(Boolean).flatMap(l=>{try{return[JSON.parse(l)]}catch{return[]}}),nextOffset:r+Buffer.byteLength(c,"utf8")}}var jt=class{constructor(e){this.options=e;this.journal=new Ct(e.storage),this.hierarchyJournal=new It(e.storage)}options;journal;hierarchyJournal;async learnNew(){let e=this.options.wal.loadState(),n=Number(e.sourceCursors["memory.learner.offset"]??0),r=Number.isFinite(n)?n:0,o=qu(this.options.wal.eventsFile,r);if(o.events.length===0)return{scannedEvents:0,candidates:0,journalWritten:!1,nextOffset:o.nextOffset};let s=St(this.options.identity,o.events),i=s.candidates,a=!1;i.length>0&&(a=!!await this.journal.write(this.options.identity,o.events,i));let u=!1;s.hierarchy.facts.length>0&&(u=!!await this.hierarchyJournal.write(this.options.identity,o.events,s.hierarchy));let c=Lo(this.options.identity,o.events,s.state),p=$o(this.options.project,c);this.options.wal.setSourceCursor("memory.pipeline.version",2),this.options.wal.setSourceCursor("memory.pipeline.normalized_events",s.stats.normalizedEvents),this.options.wal.setSourceCursor("memory.pipeline.persisted",s.stats.persistedCandidates),this.options.wal.setSourceCursor("memory.pipeline.permanent",s.stats.permanent),this.options.wal.setSourceCursor("memory.pipeline.task",s.stats.task),this.options.wal.setSourceCursor("memory.pipeline.session",s.stats.session),this.options.wal.setSourceCursor("memory.pipeline.transient",s.stats.transient),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.version",s.hierarchy.version),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.raw",s.hierarchy.stats.raw),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.facts",s.hierarchy.stats.facts),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.scenes",s.hierarchy.stats.scenes),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.knowledge",s.hierarchy.stats.knowledge),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.journal_written",u?1:0),this.options.wal.setSourceCursor("memory.skill.assets",c.length),this.options.wal.setSourceCursor("memory.skill.written",p.written),this.options.wal.setSourceCursor("memory.skill.deduped",p.deduped);try{let l=io(this.options.project.rootPath,o.events);this.options.wal.setSourceCursor("memory.context_offload.eligible",l.eligible),this.options.wal.setSourceCursor("memory.context_offload.written",l.written),this.options.wal.setSourceCursor("memory.context_offload.deduped",l.deduped),this.options.wal.setSourceCursor("memory.context_offload.graph_nodes",l.graphNodes),this.options.wal.setSourceCursor("memory.context_offload.failed",0)}catch{this.options.wal.setSourceCursor("memory.context_offload.failed",1)}try{let l=await Ao({project:this.options.project,storage:this.options.storage,hierarchy:s.hierarchy});this.options.wal.setSourceCursor("memory.wiki_automation.scanned",l.scanned),this.options.wal.setSourceCursor("memory.wiki_automation.eligible",l.eligible),this.options.wal.setSourceCursor("memory.wiki_automation.created",l.created),this.options.wal.setSourceCursor("memory.wiki_automation.updated",l.updated),this.options.wal.setSourceCursor("memory.wiki_automation.unchanged",l.unchanged),this.options.wal.setSourceCursor("memory.wiki_automation.skipped",l.skipped),this.options.wal.setSourceCursor("memory.wiki_automation.failed",l.failed),this.options.wal.setSourceCursor("memory.wiki_automation.review_pending",l.reviewPending),this.options.wal.setSourceCursor("memory.wiki_automation.auto_approved",l.autoApproved),this.options.wal.setSourceCursor("memory.wiki_automation.review_approved",l.reviewApproved)}catch{this.options.wal.setSourceCursor("memory.wiki_automation.failed",1)}return this.options.wal.setSourceCursor("memory.learner.offset",o.nextOffset),{scannedEvents:o.events.length,candidates:i.length,journalWritten:a,nextOffset:o.nextOffset}}};import{closeSync as il,existsSync as al,openSync as cl,readSync as ul,statSync as ll}from"node:fs";function Wo(t){return t&&typeof t=="object"&&!Array.isArray(t)?t:null}function Ve(t){return t.toLowerCase().replace(/[^a-z0-9]/gu,"")}function Be(t,e,n=0){if(n>8)return;if(Array.isArray(t)){for(let o of t.slice(0,50))Be(o,e,n+1);return}let r=Wo(t);if(r)for(let[o,s]of Object.entries(r))e(o,s,r),Be(s,e,n+1)}function ye(t,e){let n=[];return Be(t,(r,o)=>{e.has(Ve(r))&&typeof o=="string"&&o.trim()&&n.push(o.trim())}),n}function Bu(t){let e=t.trim();if(!e.startsWith("{"))return null;try{return Wo(JSON.parse(e))}catch{return null}}function Vu(t){let e=t.data;for(let r of["tool","toolName","tool_name"]){let o=e[r];if(typeof o=="string"&&o.trim())return o.trim().toLowerCase()}let n="";return Be(e,(r,o,s)=>{if(n)return;let i=Ve(r);if(["tool","toolname"].includes(i)&&typeof o=="string"){n=o.trim().toLowerCase();return}if(i!=="name"||typeof o!="string")return;let a=typeof s.type=="string"?s.type.toLowerCase():"";(a.includes("tool")||a.includes("function")||a.includes("command"))&&(n=o.trim().toLowerCase())}),n}function Hu(t){let e=ye(t.data,new Set(["command","cmd","script"])),n=ye(t.data,new Set(["arguments","args"]));for(let r of n){let o=Bu(r);if(o)for(let s of ye(o,new Set(["command","cmd","script"])))e.push(s)}return Array.from(new Set(e.map(r=>r.trim()).filter(Boolean)))}function Ju(t){let e=ye(t.data,new Set(["filepath","file_path","filename","file","path","target"].map(Ve)));return Array.from(new Set(e.map(n=>n.trim()).filter(n=>n.length>0&&n.length<1e3&&!n.includes(`
`))))}function Gu(t,e){return t.type==="file_edit"||t.type==="file_write"?"modified":/\b(delete|remove|unlink)\b/iu.test(e)?"deleted":/\b(create|add[_-]?file|new[_-]?file)\b/iu.test(e)?"created":/\b(edit|write|patch|apply[_-]?patch|replace|update[_-]?file)\b/iu.test(e)?"modified":null}function Uu(t){let e=ye(t.data,new Set(["patch","diff","arguments","input"].map(Ve))),n=[];for(let r of e){let o=[{regex:/^\*\*\* Update File:\s*(.+)$/gimu,action:"modified"},{regex:/^\*\*\* Add File:\s*(.+)$/gimu,action:"created"},{regex:/^\*\*\* Delete File:\s*(.+)$/gimu,action:"deleted"}];for(let s of o)for(let i of r.matchAll(s.regex)){let a=i[1]?.trim();a&&n.push({kind:"file",text:a,fileAction:s.action,confidence:.99})}}return n}function Yu(t){let e=t.toLowerCase();return/\b(typecheck|type-check)\b/u.test(e)||/\btsc\b[\s\S]*--noemit\b/u.test(e)?"typecheck":/\b(eslint|lint)\b/u.test(e)?"lint":/\b(vitest|jest|pytest)\b/u.test(e)||/\bgo\s+test\b/u.test(e)||/\bcargo\s+test\b/u.test(e)||/\b(npm|pnpm|yarn)\s+(run\s+)?test\b/u.test(e)?"test":/\b(npm|pnpm|yarn)\s+(run\s+)?build\b/u.test(e)||/\bcargo\s+build\b/u.test(e)||/\bgo\s+build\b/u.test(e)||/\btsc\b/u.test(e)?"build":null}function Xu(t){let e=null;return Be(t,(n,r)=>{if(e===null&&["exitcode","code"].includes(Ve(n))){if(typeof r=="number"&&Number.isFinite(r)){e=r;return}if(typeof r=="string"){let o=Number(r);Number.isFinite(o)&&(e=o)}}}),e}function Qu(t){return ye(t,new Set(["status","state","result","output","outputsummary","message","text"]))}function Zu(t){let e=Xu(t.data);if(e!==null)return e===0?"passed":"failed";let n=Qu(t.data).join(`
`).toLowerCase();return/\b(error|failed|failure|failing)\b/u.test(n)&&!/\b0\s+failed\b/u.test(n)?"failed":/\b(success|successful|completed|passed|green)\b/u.test(n)||/\b\d+\s+passed\b/u.test(n)?"passed":/\b(running|started|in[_ -]?progress)\b/u.test(n)?"running":"unknown"}function el(t){let e=[],n=new Set;for(let r of t){let o=[r.kind,r.fileAction??"",r.checkKind??"",r.checkStatus??"",r.text].join("|");n.has(o)||(n.add(o),e.push(r))}return e}function zo(t){let e=[],n=Vu(t),r=Gu(t,n);if(r)for(let o of Ju(t))e.push({kind:"file",text:o,fileAction:r,confidence:t.type==="file_edit"||t.type==="file_write"?1:.96});e.push(...Uu(t));for(let o of Hu(t)){e.push({kind:"command",text:o,confidence:.98});let s=Yu(o);s&&e.push({kind:"test",text:o,checkKind:s,checkStatus:Zu(t),confidence:.98})}return el(e)}var tl=new Set(["content","text","message","prompt","summary","description","title","reason","last_assistant_message","lastAssistantMessage"]);function ae(t){return t.normalize("NFKC").replace(/\s+/g," ").replace(/^[\s>*#•-]+/u,"").trim()}function Bo(t){return ae(t).toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim()}function ie(t,e,n=0){if(!(n>6)){if(typeof t=="string"){e.push(t);return}if(Array.isArray(t)){for(let r of t.slice(0,50))ie(r,e,n+1);return}if(!(!t||typeof t!="object"))for(let[r,o]of Object.entries(t))(tl.has(r)||["data","payload","parts","messages"].includes(r))&&ie(o,e,n+1)}}function At(t){return/\b(cancelled|canceled)\b|đã hủy|bỏ qua/iu.test(t)?"cancelled":/\b(blocked|blocker)\b|đang vướng|bị vướng|đang kẹt|chưa thể/iu.test(t)?"blocked":/\b(completed|complete|done|finished|passed)\b|hoàn thành|hoàn tất|đã xong|đã làm xong|\bxong\b/iu.test(t)?"completed":/\bin[\s_-]*progress\b|working on|đang làm|đang thực hiện|đang xử lý|đang triển khai/iu.test(t)?"in_progress":"pending"}function qo(t){let e=ae(t);return/^(?:đang\s+làm|đang\s+thực\s+hiện|đang\s+xử\s+lý|đang\s+triển\s+khai|hoàn\s+thành|hoàn\s+tất|đã\s+xong|đã\s+làm\s+xong|xong|pending|in[\s_-]*progress|completed|complete|done|finished|blocked|cancelled|canceled)[.!]*$/iu.test(e)}function M(t,e,n,r,o={}){let s=ae(r),i=o.key??Bo(s);return{version:1,id:w([t.projectId,n,i,e.id,s,o.status??"",o.fileAction??"",o.checkKind??"",o.checkStatus??"",o.order??""].join("|")).slice(0,32),projectId:t.projectId,kind:n,key:i,text:s,status:o.status,fileAction:o.fileAction,checkKind:o.checkKind,checkStatus:o.checkStatus,order:o.order,confidence:o.confidence??.85,occurredAt:e.timestamp,sequence:e.sequence,agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,eventId:e.id,sourceEventId:e.sourceEventId}}function nl(t,e,n){let r=ae(n);if(r.length<5||r.length>1200)return[];let o=[],s=/^(?:next|next action|next step|tiếp theo|bước tiếp theo|cần làm tiếp)\b/iu.test(r),i=r.match(/^(?:mục tiêu|goal|objective)\s*(?::|-)\s*(.+)$/iu);i?.[1]&&o.push(M(t,e,"goal",i[1],{confidence:.97}));let a=r.match(/^(?:kế hoạch|plan)\s*(?::|-)\s*(.+)$/iu);a?.[1]&&o.push(M(t,e,"plan",a[1],{confidence:.95}));let u=/\b(?:phase|giai đoạn|giai doan|stage)\s*(\d+)\s*(?:[:\-–—]\s*)?([^.;\n]{0,220})/giu,c;for(;!s&&(c=u.exec(r));){let f=Number(c[1]),d=ae(c[2]??""),m=d&&!qo(d)?`Phase ${f} - ${d}`:`Phase ${f}`;o.push(M(t,e,"phase",m,{key:`phase:${f}`,order:f,status:At(r),confidence:.93}))}let p=n.match(/^\s*[-*]\s*\[([ xX])\]\s*(.+)$/u);p?.[2]&&o.push(M(t,e,"task",p[2],{status:p[1].trim()?"completed":At(p[2]),confidence:.96}));let l=r.match(/^(?:todo|task|việc)\s*(\d+)?(?:\s*[:.\-–—]\s*|\s+)(.+)$/iu);if(l?.[2]){let f=l[1]?Number(l[1]):void 0,d=ae(l[2]),m=qo(d);o.push(M(t,e,"task",m&&f!==void 0?`TODO ${f}`:d,{key:f!==void 0?`task:${f}`:Bo(d),order:f,status:At(r),confidence:.93}))}if(/^(?:next|next action|next step|tiếp theo|bước tiếp theo|cần làm tiếp)\b/iu.test(r)){let f=r.replace(/^(?:next|next action|next step|tiếp theo|bước tiếp theo|cần làm tiếp)\s*(?::|-)?\s*/iu,"");f&&o.push(M(t,e,"next_action",f,{confidence:.9}))}return/\b(blocker|blocked)\b|đang vướng|bị vướng|đang kẹt/iu.test(r)&&o.push(M(t,e,"blocker",r,{confidence:.9})),/\b(chú ý|lưu ý|warning|attention|cẩn thận)\b/iu.test(r)&&o.push(M(t,e,"warning",r,{confidence:.88})),/\b(chốt|quyết định|decided|decision)\b/iu.test(r)&&o.push(M(t,e,"decision",r,{confidence:.9})),r.length<=300&&/^(?:đang\s+(?:sửa|cập nhật|triển khai|xử lý|làm|refactor|fix)|(?:i(?:'m| am)\s+)?(?:working on|implementing|fixing|refactoring|updating|editing)\b)/iu.test(r)&&o.push(M(t,e,"activity",r,{confidence:.86})),o}function Mt(t,e){if(e.length===0)return[];let n=[],r=new Set;function o(i){r.has(i.id)||(r.add(i.id),n.push(i))}for(let i of e){if(i.type==="user_prompt"||i.role==="user"){let u=[];ie(i.data,u);let c=u.map(p=>ae(p)).find(p=>p.length>=8&&p.length<=1200&&!/^\[?toolnet\b/iu.test(p));c&&o(M(t,i,"request",c,{confidence:.96}))}for(let u of zo(i))o(M(t,i,u.kind,u.text,{fileAction:u.fileAction,checkKind:u.checkKind,checkStatus:u.checkStatus,status:u.kind==="test"?u.checkStatus==="passed"?"completed":u.checkStatus==="failed"?"blocked":u.checkStatus==="running"?"in_progress":"pending":void 0,confidence:u.confidence}));if(i.type==="decision"){let u=[];ie(i.data,u);for(let c of u)o(M(t,i,"decision",c,{confidence:1}))}if(i.type==="todo"){let u=[];ie(i.data,u);for(let c of u)o(M(t,i,"task",c,{status:At(c),confidence:1}))}if(["file_write","file_edit"].includes(i.type))for(let u of["filePath","path","file"]){let c=i.data[u];typeof c=="string"&&c&&o(M(t,i,"file",c,{fileAction:"modified",confidence:1}))}if(i.type==="test"){let u=[];ie(i.data,u);for(let c of u)o(M(t,i,"test",c,{confidence:1}))}let a=[];ie(i.data,a);for(let u of a)for(let c of u.split(/\n+/u))for(let p of nl(t,i,c))o(p)}let s=e[e.length-1];return o(M(t,s,"session",`${t.agent}:${t.nativeSessionId}`,{key:t.sessionKey,confidence:1})),n}function Vo(t){return String(t).padStart(12,"0")}var Pt=class{constructor(e){this.storage=e}storage;async write(e,n){if(n.length===0)return null;let r=Math.min(...n.map(p=>p.sequence)),o=Math.max(...n.map(p=>p.sequence)),s={version:1,projectId:e.projectId,agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,createdAt:n.map(p=>p.occurredAt).sort().at(-1)??new Date().toISOString(),firstSequence:r,lastSequence:o,observations:n},i=JSON.stringify(s,null,2)+`
`,a=w(n.map(p=>JSON.stringify(p)).sort().join(`
`)).slice(0,24),u=w(e.sessionKey).slice(0,12),c=[`projects/${e.projectId}`,"work","observations",`${Vo(r)}-${Vo(o)}-${u}-${a}.json`].join("/");return await this.storage.put(c,i,"application/json"),c}};import{join as Ho}from"node:path";import{mkdirSync as rl}from"node:fs";function Go(t){return t.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim()}function F(t,e=20){let n=[],r=new Set;for(let o of t.slice().reverse()){let s=Go(o);if(!(!s||r.has(s))&&(r.add(s),n.push(o),n.length>=e))break}return n.reverse()}function ol(t,e=20){let n=new Map;for(let r of t){let o=`${r.kind}|${Go(r.command)}`;n.delete(o),n.set(o,r)}return Array.from(n.values()).slice(-e)}function sl(t){return t.kind==="phase"?/^Phase\s+\d+$/iu.test(t.text):t.kind==="task"?/^(?:TODO|Task|Việc)\s+\d+$/iu.test(t.text):!1}function Jo(t,e){let n=e.status??t?.status??"pending",r=n;t&&(t.status==="completed"&&n!=="completed"?r="completed":n==="pending"&&(t.status==="in_progress"||t.status==="blocked")&&(r=t.status));let o=t&&sl(e)?t.title:e.text;return{id:t?.id??w(e.key).slice(0,24),title:o,status:r,order:e.order??t?.order,confidence:Math.max(e.confidence,t?.confidence??0),updatedAt:e.occurredAt,updatedBy:{agent:e.agent,nativeSessionId:e.nativeSessionId,eventId:e.eventId}}}async function Uo(t,e){let n=`projects/${t.id}/work/observations/`,r=await e.list(n),o=[];for(let s of r.filter(i=>i.key.endsWith(".json")).sort((i,a)=>i.key.localeCompare(a.key))){let i=await e.getText(s.key);if(i)try{let a=JSON.parse(i);a.version===1&&Array.isArray(a.observations)&&o.push(a)}catch{}}return o}async function He(t,e){let r=(await Uo(t,e)).flatMap(h=>h.observations).sort((h,v)=>{let T=h.occurredAt.localeCompare(v.occurredAt);if(T!==0)return T;let H=h.sequence-v.sequence;return H!==0?H:h.id.localeCompare(v.id)}),o=new Map,s=new Map,i,a,u,c,p,l=[],f=[],d=[],m=[],S=[],y=new Map,g=[],k=[],b=[],R=[],O=[],N=[];for(let h of r)switch(h.kind){case"request":i=h.text;break;case"activity":a=h.text;break;case"goal":u=h.text;break;case"plan":c=h.text;break;case"phase":o.set(h.key,Jo(o.get(h.key),h));break;case"task":s.set(h.key,Jo(s.get(h.key),h));break;case"decision":l.push(h.text);break;case"blocker":f.push(h.text);break;case"warning":d.push(h.text);break;case"next_action":m.push(h.text);break;case"file":{S.push(h.text);let v=h.fileAction??"active";y.delete(h.text),y.set(h.text,v),v==="modified"?g.push(h.text):v==="created"?k.push(h.text):v==="deleted"&&b.push(h.text);break}case"command":R.push(h.text);break;case"test":O.push(h.text),h.checkKind&&N.push({kind:h.checkKind,command:h.text,status:h.checkStatus??"unknown",updatedAt:h.occurredAt,agent:h.agent,nativeSessionId:h.nativeSessionId});break;case"session":p={agent:h.agent,nativeSessionId:h.nativeSessionId,sessionKey:h.sessionKey,updatedAt:h.occurredAt};break}let C=Array.from(o.values()).sort((h,v)=>(h.order??Number.MAX_SAFE_INTEGER)-(v.order??Number.MAX_SAFE_INTEGER)),x=Array.from(s.values()).sort((h,v)=>(h.order??Number.MAX_SAFE_INTEGER)-(v.order??Number.MAX_SAFE_INTEGER)),q=C.find(h=>h.status==="in_progress")??C.find(h=>h.status==="blocked")??C.find(h=>h.status==="pending"),B=x.find(h=>h.status==="in_progress")??x.find(h=>h.status==="blocked")??x.find(h=>h.status==="pending"),Jt=F([...m,...B?[B.title]:[],...!B&&q?[q.title]:[],...x.filter(h=>h.status==="pending").slice(0,5).map(h=>h.title)],8),Gt=F([...f,...C.filter(h=>h.status==="blocked").map(h=>h.title),...x.filter(h=>h.status==="blocked").map(h=>h.title)],20),be={version:1,projectId:t.id,projectName:t.name,currentRequest:i,currentActivity:a,goal:u,plan:c,phases:C,tasks:x,decisions:F(l,20),blockers:Gt,warnings:F(d,20),nextActions:Jt,filesTouched:F(S,30),activeFiles:Array.from(y.entries()).filter(([,h])=>h!=="deleted").map(([h])=>h).slice(-5),modifiedFiles:F(g,30),createdFiles:F(k,30),deletedFiles:F(b,30),commands:F(R,20),tests:F(O,20),checks:ol(N,20),currentPhase:q,currentTask:B,progress:{phasesTotal:C.length,phasesCompleted:C.filter(h=>h.status==="completed").length,tasksTotal:x.length,tasksCompleted:x.filter(h=>h.status==="completed").length,blocked:C.filter(h=>h.status==="blocked").length+x.filter(h=>h.status==="blocked").length},lastSession:p,updatedAt:r.length?r[r.length-1].occurredAt:new Date().toISOString()},Xe=Ho(t.rootPath,".toolnet","work");return rl(Xe,{recursive:!0}),_(Ho(Xe,"current.json"),be),await e.put(`projects/${t.id}/work/current.json`,JSON.stringify(be,null,2)+`
`,"application/json"),be}async function Ot(t,e){if((await Uo(t,e)).length>0)return He(t,e);let r=await e.getText(`projects/${t.id}/work/current.json`);if(!r)return null;try{return JSON.parse(r)}catch{return null}}function dl(t,e){if(!al(t))return{events:[],nextOffset:e};let n=ll(t).size,r=Number.isFinite(e)?Math.max(0,e):0;if(r>n&&(r=0),r===n)return{events:[],nextOffset:n};let o=n-r,s=Buffer.alloc(o),i=cl(t,"r");try{ul(i,s,0,o,r)}finally{il(i)}let a=s.toString("utf8"),u=a.lastIndexOf(`
`);if(u<0)return{events:[],nextOffset:r};let c=a.slice(0,u+1);return{events:c.split(`
`).filter(Boolean).flatMap(l=>{try{return[JSON.parse(l)]}catch{return[]}}),nextOffset:r+Buffer.byteLength(c,"utf8")}}var Tt=class{constructor(e){this.options=e;this.journal=new Pt(e.storage)}options;journal;async learnNew(){let e=this.options.wal.loadState(),n=Number(e.sourceCursors["work.continuity.offset"]??0),r=dl(this.options.wal.eventsFile,Number.isFinite(n)?n:0);if(r.events.length===0)return{scannedEvents:0,observations:0,journalWritten:!1,reconciled:!1,nextOffset:r.nextOffset};let o=Mt(this.options.identity,r.events),s=!1,i=!1;return o.length>0&&(s=!!await this.journal.write(this.options.identity,o),s&&(await He(this.options.project,this.options.storage),i=!0)),this.options.wal.setSourceCursor("work.continuity.offset",r.nextOffset),{scannedEvents:r.events.length,observations:o.length,journalWritten:s,reconciled:i,nextOffset:r.nextOffset}}};import{closeSync as vl,existsSync as wl,openSync as bl,readSync as xl,statSync as El}from"node:fs";var pl=new Set(["content","text","message","prompt","summary","description","title","reason","last_assistant_message","lastAssistantMessage"]);function he(t){return t.normalize("NFKC").replace(/\s+/g," ").replace(/^[\s>*#•-]+/u,"").trim()}function Mn(t,e,n=0){if(!(n>6)){if(typeof t=="string"){e.push(t);return}if(Array.isArray(t)){for(let r of t.slice(0,50))Mn(r,e,n+1);return}if(!(!t||typeof t!="object"))for(let[r,o]of Object.entries(t))(pl.has(r)||["data","payload","parts","messages"].includes(r))&&Mn(o,e,n+1)}}function $(t,e,n,r,o,s=.95){let i=he(r);return{version:1,id:w([t.projectId,n,o.type,o.key??"",i.toLowerCase(),e.id].join("|")).slice(0,32),projectId:t.projectId,kind:n,value:i,scope:o.type,scopeKey:o.key,scopeOrder:o.order,confidence:s,evidence:{agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,eventId:e.id,sourceEventId:e.sourceEventId,sequence:e.sequence,occurredAt:e.timestamp}}}function W(t,e){let n=t.toLowerCase();for(let r of e){let o=r.toLowerCase();if(n.startsWith(`${o}:`)||n.startsWith(`${o} -`)||n.startsWith(`${o} \u2014`))return he(t.slice(r.length+1))}return null}function fl(t){let e=t.trimStart();return e.startsWith("- ")||e.startsWith("* ")||/^\d+[.)]\s+/u.test(e)}function ml(t){return he(t.trim().replace(/^[-*]\s+/u,"").replace(/^\d+[.)]\s+/u,""))}function Yo(t,e){let n=[],r=new Set;function o(s){!s.value||s.value.length<3||r.has(s.id)||(r.add(s.id),n.push(s))}for(let s of e){let i=[];Mn(s.data,i);for(let a of i){let u={type:"project"},c=null;for(let p of a.split(/\r?\n/u)){let l=he(p);if(!l){c=null;continue}let f=l.match(/^(?:phase|giai đoạn|giai doan|stage)\s*(\d+)\s*(?:[:\-–—]\s*)?(.*)$/iu);if(f){let x=Number(f[1]);u={type:"phase",key:`phase:${x}`,order:x,title:he(f[2]??"")},c=null;continue}let d=l.match(/^(?:todo|task|việc)\s*(\d+)\s*(?:[:\-–—]\s*)?(.*)$/iu);if(d){let x=Number(d[1]);u={type:"task",key:`task:${x}`,order:x,title:he(d[2]??"")},c=null;continue}let m=W(l,["mission","s\u1EE9 m\u1EC7nh","m\u1EE5c ti\xEAu t\u1ED5ng th\u1EC3","m\u1EE5c ti\xEAu project","project goal"]);if(m){o($(t,s,"mission",m,{type:"project"},.99)),c=null;continue}let S=W(l,["current objective","active objective","m\u1EE5c ti\xEAu hi\u1EC7n t\u1EA1i","objective","m\u1EE5c ti\xEAu","m\u1EE5c \u0111\xEDch"]);if(S){o($(t,s,u.type==="phase"?"phase_objective":"objective",S,u,.98)),c=null;continue}let y=W(l,["why","why this","why this phase","reason","rationale","v\xEC sao","l\xFD do","t\u1EA1i sao","\xFD ngh\u0129a"]);if(y){o($(t,s,u.type==="phase"?"phase_why":"why",y,u,.98)),c=null;continue}let g=W(l,["desired outcome","final outcome","k\u1EBFt qu\u1EA3 cu\u1ED1i","k\u1EBFt qu\u1EA3 mong mu\u1ED1n","m\u1EE5c ti\xEAu cu\u1ED1i"]);if(g){o($(t,s,"desired_outcome",g,{type:"project"},.98)),c=null;continue}let k=W(l,["plan rationale","approach rationale","why this approach","t\u1EA1i sao ch\u1ECDn h\u01B0\u1EDBng n\xE0y","l\xFD do ch\u1ECDn h\u01B0\u1EDBng n\xE0y","l\xFD do ch\u1ECDn ki\u1EBFn tr\xFAc"]);if(k){o($(t,s,"plan_rationale",k,{type:"project"},.98)),c=null;continue}let b=W(l,["deliverable","output","k\u1EBFt qu\u1EA3 c\u1EA7n \u0111\u1EA1t","ph\u1EA3i t\u1EA1o ra","\u0111\u1EA7u ra"]);if(b){o($(t,s,"phase_deliverable",b,u,.97)),c=null;continue}let R=W(l,["acceptance criteria","definition of done","done khi","ho\xE0n th\xE0nh khi","ti\xEAu ch\xED ho\xE0n th\xE0nh"]);if(R){o($(t,s,"acceptance_criterion",R,u,.98)),c="acceptance_criterion";continue}let O=W(l,["depends on","dependency","dependencies","ph\u1EE5 thu\u1ED9c","c\u1EA7n c\xF3 tr\u01B0\u1EDBc"]);if(O){o($(t,s,"dependency",O,u,.97)),c="dependency";continue}let N=W(l,["open question","open questions","c\xE2u h\u1ECFi m\u1EDF","ch\u01B0a quy\u1EBFt \u0111\u1ECBnh","ch\u01B0a r\xF5"]);if(N){o($(t,s,"open_question",N,u,.95)),c="open_question";continue}let C=W(l,["constraint","constraints","r\xE0ng bu\u1ED9c","gi\u1EDBi h\u1EA1n"]);if(C){o($(t,s,"constraint",C,u,.97)),c="constraint";continue}if(/^(?:acceptance criteria|definition of done|done khi|tiêu chí hoàn thành)\s*:?\s*$/iu.test(l)){c="acceptance_criterion";continue}if(/^(?:dependencies|dependency|phụ thuộc)\s*:?\s*$/iu.test(l)){c="dependency";continue}if(/^(?:open questions|open question|câu hỏi mở)\s*:?\s*$/iu.test(l)){c="open_question";continue}if(/^(?:constraints|constraint|ràng buộc)\s*:?\s*$/iu.test(l)){c="constraint";continue}if(c&&fl(p)){o($(t,s,c,ml(p),u,.96));continue}c=null}}}return n}function Xo(t){return String(t).padStart(12,"0")}var Rt=class{constructor(e){this.storage=e}storage;async write(e,n){if(n.length===0)return null;let r=Math.min(...n.map(c=>c.evidence.sequence)),o=Math.max(...n.map(c=>c.evidence.sequence)),s={version:1,projectId:e.projectId,agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,firstSequence:r,lastSequence:o,createdAt:new Date().toISOString(),observations:n},i=w(n.map(c=>c.id).sort().join("|")).slice(0,16),a=w(e.sessionKey).slice(0,12),u=[`projects/${e.projectId}`,"work","semantic","observations",`${Xo(r)}-${Xo(o)}-${a}-${i}.json`].join("/");return await this.storage.exists(u)||await this.storage.put(u,JSON.stringify(s,null,2)+`
`,"application/json"),u}};import{mkdirSync as gl}from"node:fs";import{join as Qo}from"node:path";function yl(t){return{value:t.value,confidence:t.confidence,evidence:t.evidence}}function hl(t,e){if(!e)return!0;let n=t.evidence.occurredAt.localeCompare(e.evidence.occurredAt);return n!==0?n>0:t.evidence.sessionKey===e.evidence.sessionKey?t.evidence.sequence>=e.evidence.sequence:t.confidence>=e.confidence}function Y(t,e){return hl(e,t)?e:t}function X(t,e=30){let n=new Set,r=[];for(let o of t){let s=o.value.normalize("NFKC").toLowerCase().replace(/\s+/g," ").trim();!s||n.has(s)||(n.add(s),r.push(o))}return r.slice(-e)}async function Sl(t,e){let n=`projects/${t.id}/work/semantic/observations/`,r=await e.list(n),o=[];for(let s of r.filter(i=>i.key.endsWith(".json")).sort((i,a)=>i.key.localeCompare(a.key))){let i=await e.getText(s.key);if(i)try{let a=JSON.parse(i);a.version===1&&Array.isArray(a.observations)&&o.push(a)}catch{}}return o}function kl(t){return{key:t.scopeKey??`phase:${t.scopeOrder??0}`,order:t.scopeOrder??0,acceptanceCriteria:[],dependencies:[],openQuestions:[],constraints:[],notes:[]}}async function Zo(t,e){let r=(await Sl(t,e)).flatMap(S=>S.observations).sort((S,y)=>{let g=S.evidence.occurredAt.localeCompare(y.evidence.occurredAt);return g!==0?g:S.evidence.sessionKey===y.evidence.sessionKey?S.evidence.sequence-y.evidence.sequence:S.id.localeCompare(y.id)}),o,s,i,a,u,c=new Map,p=[],l=[],f=[];for(let S of r){let y=yl(S);if(S.scope==="phase"&&S.scopeKey){let g=c.get(S.scopeKey)??kl(S);switch(S.kind){case"phase_objective":g.objective=Y(g.objective,y);break;case"phase_why":g.why=Y(g.why,y);break;case"phase_deliverable":g.deliverable=Y(g.deliverable,y);break;case"acceptance_criterion":g.acceptanceCriteria.push(y);break;case"dependency":g.dependencies.push(y);break;case"open_question":g.openQuestions.push(y);break;case"constraint":g.constraints.push(y);break;case"note":g.notes.push(y);break}c.set(g.key,g);continue}switch(S.kind){case"mission":o=Y(o,y);break;case"objective":s=Y(s,y);break;case"why":i=Y(i,y);break;case"desired_outcome":a=Y(a,y);break;case"plan_rationale":u=Y(u,y);break;case"open_question":p.push(y);break;case"constraint":l.push(y);break;case"note":f.push(y);break}}for(let S of c.values())S.acceptanceCriteria=X(S.acceptanceCriteria,20),S.dependencies=X(S.dependencies,15),S.openQuestions=X(S.openQuestions,15),S.constraints=X(S.constraints,15),S.notes=X(S.notes,20);let d={version:1,projectId:t.id,projectName:t.name,mission:o,activeObjective:s,why:i,desiredOutcome:a,planRationale:u,phases:Array.from(c.values()).sort((S,y)=>S.order-y.order),openQuestions:X(p,20),constraints:X(l,20),notes:X(f,20),updatedAt:r.length?r[r.length-1].evidence.occurredAt:new Date().toISOString()},m=Qo(t.rootPath,".toolnet","work");return gl(m,{recursive:!0}),_(Qo(m,"semantic-current.json"),d),await e.put(`projects/${t.id}/work/semantic/current.json`,JSON.stringify(d,null,2)+`
`,"application/json"),d}async function es(t,e){let n=await e.getText(`projects/${t.id}/work/semantic/current.json`);if(!n)return null;try{return JSON.parse(n)}catch{return null}}function Cl(t,e){if(!wl(t))return{events:[],nextOffset:e};let n=El(t).size,r=Number.isFinite(e)?Math.max(0,e):0;if(r>n&&(r=0),r===n)return{events:[],nextOffset:n};let o=Buffer.alloc(n-r),s=bl(t,"r");try{xl(s,o,0,o.length,r)}finally{vl(s)}let i=o.toString("utf8"),a=i.lastIndexOf(`
`);if(a<0)return{events:[],nextOffset:r};let u=i.slice(0,a+1);return{events:u.split(`
`).filter(Boolean).flatMap(c=>{try{return[JSON.parse(c)]}catch{return[]}}),nextOffset:r+Buffer.byteLength(u,"utf8")}}var Nt=class{constructor(e){this.options=e;this.journal=new Rt(e.storage)}options;journal;async learnNew(){let e=this.options.wal.loadState(),n=Number(e.sourceCursors["work.semantic.offset"]??0),r=Cl(this.options.wal.eventsFile,Number.isFinite(n)?n:0);if(r.events.length===0)return{scannedEvents:0,observations:0,journalWritten:!1,reconciled:!1,nextOffset:r.nextOffset};let o=Yo(this.options.identity,r.events),s=!1,i=!1;return o.length>0&&(s=!!await this.journal.write(this.options.identity,o),s&&(await Zo(this.options.project,this.options.storage),i=!0)),this.options.wal.setSourceCursor("work.semantic.offset",r.nextOffset),{scannedEvents:r.events.length,observations:o.length,journalWritten:s,reconciled:i,nextOffset:r.nextOffset}}};import{existsSync as Sd,mkdirSync as kd}from"node:fs";import{join as On}from"node:path";import{existsSync as rs,mkdirSync as Il,readFileSync as jl,statSync as ts,writeFileSync as Al}from"node:fs";import{dirname as Ml,join as Pl}from"node:path";var ns=64*1024,Ol=`# ToolNet Project Operating Manual

This file contains persistent instructions for AI agents working on this project.

## Critical Rules

<!--
Examples:

- [enforce] Never edit production files directly.
- [enforce] Edit source only in /path/to/source.
- [enforce] Deploy only with ./deploy.sh --apply
-->

## Workflow

<!--
Describe the correct working process.
-->

## Architecture

<!--
Important architecture conventions.
-->

## Verification

<!--
Tests / QA required after changes.
-->

## Known Gotchas

<!--
Things an AI agent should always remember.
-->

## Preferences

<!--
- [advisory] Prefer small focused files.
-->
`;function _t(t){return Pl(t.rootPath,".toolnet","PROJECT.md")}function Tl(t){return t.normalize("NFKC").replace(/\s+/g," ").trim()}function Rl(t){let e=[],n=new Set,r=/^\s*[-*]\s+\[(enforce|advisory)\]\s+(.+?)\s*$/gimu,o;for(;o=r.exec(t);){let s=o[1].toLowerCase(),i=Tl(o[2]);if(!i)continue;let a=`${s}:${i.toLowerCase()}`;n.has(a)||(n.add(a),e.push({id:w(a).slice(0,24),mode:s,text:i,source:"manual"}))}return e}function Nl(t){let e=_t(t);return rs(e)||(Il(Ml(e),{recursive:!0}),Al(e,Ol,{encoding:"utf8",mode:384})),e}function Lt(t,e=!1){let n=e?Nl(t):_t(t);if(!rs(n))return null;if(ts(n).size>ns)throw new Error(`PROJECT.md exceeds ${ns} bytes`);let o=jl(n,"utf8");return{path:n,content:o,digest:w(o),rules:Rl(o),bytes:Buffer.byteLength(o,"utf8"),updatedAt:new Date(ts(n).mtimeMs).toISOString()}}import{randomUUID as _l}from"node:crypto";import{closeSync as Ll,existsSync as os,fsyncSync as $l,mkdirSync as Kl,openSync as Dl,readFileSync as Fl,statSync as Wl,unlinkSync as ss,writeFileSync as zl}from"node:fs";import{dirname as ql,join as Bl}from"node:path";var Vl=new Int32Array(new SharedArrayBuffer(4));function Hl(t){t<=0||Atomics.wait(Vl,0,0,t)}function Jl(t){return Bl(t.rootPath,".toolnet","work",".current.lock")}function Gl(t){if(!Number.isInteger(t)||t<=0)return!1;try{return process.kill(t,0),!0}catch(e){return e?.code!=="ESRCH"}}function is(t){if(!os(t))return null;try{let e=JSON.parse(Fl(t,"utf8"));return e.version!==1||typeof e.token!="string"||typeof e.pid!="number"||typeof e.acquiredAt!="string"?null:{version:1,token:e.token,pid:e.pid,acquiredAt:e.acquiredAt}}catch{return null}}function Ul(t){try{return Date.now()-Wl(t).mtimeMs}catch{return 0}}function Yl(t,e){if(!os(t)||Ul(t)<e)return!1;let n=is(t);return n?!Gl(n.pid):!0}function Xl(t,e){if(!Yl(t,e))return!1;try{return ss(t),!0}catch{return!1}}function Ql(t,e){let n={version:1,token:e,pid:process.pid,acquiredAt:new Date().toISOString()},r=Dl(t,"wx",384);try{zl(r,`${JSON.stringify(n,null,2)}
`,{encoding:"utf8"}),$l(r)}finally{Ll(r)}}function Zl(t,e){if(is(t)?.token===e)try{ss(t)}catch{}}function ed(t,e={}){let n=Math.max(100,e.timeoutMs??5e3),r=Math.max(5,e.retryMs??20),o=Math.max(n*2,e.staleMs??3e4),s=Jl(t);Kl(ql(s),{recursive:!0});let i=_l(),a=Date.now()+n;for(;;)try{Ql(s,i);let u=!1;return()=>{u||(u=!0,Zl(s,i))}}catch(u){if(u?.code!=="EEXIST")throw u;if(Xl(s,o))continue;if(Date.now()>=a)throw new Error(`Timed out acquiring project work lock: ${s}`);Hl(r)}}function as(t,e,n={}){let r=ed(t,n);try{return e()}finally{r()}}import{closeSync as td,existsSync as nd,fsyncSync as rd,mkdirSync as od,openSync as sd,readFileSync as id,renameSync as ad,writeFileSync as cd}from"node:fs";import{dirname as ud,join as ld}from"node:path";function dd(t,e){od(ud(t),{recursive:!0});let n=`${t}.tmp-${process.pid}-${Date.now()}`,r=sd(n,"w",384);try{cd(r,`${JSON.stringify(e,null,2)}
`,{encoding:"utf8"}),rd(r)}finally{td(r)}ad(n,t)}function fs(t){return ld(t.rootPath,".toolnet","work","current.json")}function Pn(t){let e=fs(t);if(!nd(e))return null;try{let n=JSON.parse(id(e,"utf8"));return n.version!==1||n.projectId!==t.id?null:n}catch{return null}}function $t(t){return t.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim()}function K(t,e,n){let r=[],o=new Set;for(let s of[...t,...e].reverse()){let i=$t(s);if(!(!i||o.has(i))&&(o.add(i),r.push(s),r.length>=n))break}return r.reverse()}function pd(t,e,n=20){let r=new Map;for(let o of[...t,...e]){let s=`${o.kind}|${$t(o.command)}`;r.delete(s),r.set(s,o)}return Array.from(r.values()).slice(-n)}function fd(t){return t.kind==="phase"?/^Phase\s+\d+$/iu.test(t.text):t.kind==="task"?/^(?:TODO|Task|Việc)\s+\d+$/iu.test(t.text):!1}function cs(t,e){let n=e.status??t?.status??"pending",r=n;t?.status==="completed"&&n!=="completed"&&(r="completed"),t&&n==="pending"&&(t.status==="in_progress"||t.status==="blocked")&&(r=t.status);let o=t&&fd(e)?t.title:e.text;return{id:t?.id??e.id,title:o,status:r,order:e.order??t?.order,confidence:Math.max(t?.confidence??0,e.confidence),updatedAt:e.occurredAt,updatedBy:{agent:e.agent,nativeSessionId:e.nativeSessionId,eventId:e.eventId}}}function us(t){let e=new Map;for(let n of t){let r=n.order!==void 0?`order:${n.order}`:$t(n.title);e.set(r,n)}return e}function ls(t){return t.order!==void 0?`order:${t.order}`:$t(t.key||t.text)}function ds(t){return Array.from(t).sort((e,n)=>{let r=e.order??Number.MAX_SAFE_INTEGER,o=n.order??Number.MAX_SAFE_INTEGER;return r!==o?r-o:e.updatedAt.localeCompare(n.updatedAt)})}function ps(t){return t.find(e=>e.status==="in_progress")??t.find(e=>e.status==="blocked")??t.find(e=>e.status==="pending")}function md(t,e){let n=Pn(t),r=us(n?.phases??[]),o=us(n?.tasks??[]),s=n?.currentRequest,i=n?.currentActivity,a=n?.goal,u=n?.plan,c=n?.lastSession,p=[],l=[],f=[],d=[],m=[],S=[...n?.activeFiles??[]],y=[],g=[],k=[],b=[],R=[],O=[],N=[...e].sort((v,T)=>{let H=v.occurredAt.localeCompare(T.occurredAt);return H!==0?H:v.sequence-T.sequence});for(let v of N)switch(v.kind){case"request":s=v.text;break;case"activity":i=v.text;break;case"goal":a=v.text;break;case"plan":u=v.text;break;case"phase":{let T=ls(v);r.set(T,cs(r.get(T),v));break}case"task":{let T=ls(v);o.set(T,cs(o.get(T),v));break}case"decision":p.push(v.text);break;case"blocker":l.push(v.text);break;case"warning":f.push(v.text);break;case"next_action":d.push(v.text);break;case"file":{m.push(v.text);let T=v.fileAction??"active",H=S.indexOf(v.text);H>=0&&S.splice(H,1),T!=="deleted"&&S.push(v.text),T==="modified"?y.push(v.text):T==="created"?g.push(v.text):T==="deleted"&&k.push(v.text);break}case"command":b.push(v.text);break;case"test":R.push(v.text),v.checkKind&&O.push({kind:v.checkKind,command:v.text,status:v.checkStatus??"unknown",updatedAt:v.occurredAt,agent:v.agent,nativeSessionId:v.nativeSessionId});break;case"session":c={agent:v.agent,nativeSessionId:v.nativeSessionId,sessionKey:v.sessionKey,updatedAt:v.occurredAt};break}let C=ds(r.values()),x=ds(o.values()),q=ps(C),B=ps(x),Jt=K(n?.nextActions??[],[...d,...B?[B.title]:[],...!B&&q?[q.title]:[],...x.filter(v=>v.status==="pending").slice(0,5).map(v=>v.title)],8),Gt=K(n?.blockers??[],[...l,...C.filter(v=>v.status==="blocked").map(v=>v.title),...x.filter(v=>v.status==="blocked").map(v=>v.title)],20),be=N.length>0?N[N.length-1].occurredAt:n?.updatedAt??new Date().toISOString(),Xe={version:1,projectId:t.id,projectName:t.name,currentRequest:s,currentActivity:i,goal:a,plan:u,phases:C,tasks:x,decisions:K(n?.decisions??[],p,20),blockers:Gt,warnings:K(n?.warnings??[],f,20),nextActions:Jt,filesTouched:K(n?.filesTouched??[],m,30),activeFiles:K([],S,5),modifiedFiles:K(n?.modifiedFiles??[],y,30),createdFiles:K(n?.createdFiles??[],g,30),deletedFiles:K(n?.deletedFiles??[],k,30),commands:K(n?.commands??[],b,20),tests:K(n?.tests??[],R,20),checks:pd(n?.checks??[],O,20),currentPhase:q,currentTask:B,progress:{phasesTotal:C.length,phasesCompleted:C.filter(v=>v.status==="completed").length,tasksTotal:x.length,tasksCompleted:x.filter(v=>v.status==="completed").length,blocked:C.filter(v=>v.status==="blocked").length+x.filter(v=>v.status==="blocked").length},lastSession:c,updatedAt:be},h=de(Xe);return dd(fs(t),h),h}function ms(t,e){return as(t,()=>md(t,e))}function P(t,e){let n=new Set,r=[];for(let o of t){let s=o.replace(/\s+/g," ").trim();if(!s)continue;let i=s.normalize("NFKC").toLowerCase();if(!n.has(i)&&(n.add(i),r.push(s),r.length>=e))break}return r}function gs(t){if(t)return{id:t.id,title:t.title,status:t.status}}function gd(t,e=[]){let n=e.slice(-10);if(n.some(o=>o.status==="failed"))return"failing";if(n.some(o=>o.status==="passed"))return"passing";let r=t.slice(-10).join(`
`).toLowerCase();return/(?:failed|failing|failure|error|✗|❌)/u.test(r)?"failing":/(?:passed|passing|green|success|✓|✅)/u.test(r)?"passing":"unknown"}function yd(t){return w(JSON.stringify(t))}function hd(t){let e=[];for(let n of t){if(!n)continue;let r=n.match(/https?:\/\/[^\s<>"'`)\]}]+/giu)??[];for(let o of r){let s=o.replace(/[.,;:!?]+$/gu,"").trim();s&&e.push(s)}}return P(e,30)}function ys(t){let{project:e,identity:n,state:r}=t,o=r.activeFiles?.at(-1)??r.filesTouched.at(-1),s=r.phases.filter(k=>k.status==="completed").map(k=>k.title),i=r.tasks.filter(k=>k.status==="completed").map(k=>k.title),a=r.phases.filter(k=>k.status!=="completed"&&k.status!=="cancelled").map(k=>k.title),u=r.tasks.filter(k=>k.status!=="completed"&&k.status!=="cancelled").map(k=>k.title),c=new Set(r.tasks.filter(k=>k.status==="completed").map(k=>k.title.normalize("NFKC").toLowerCase().replace(/\s+/gu," ").trim())),p=P(r.nextActions.filter(k=>!c.has(k.normalize("NFKC").toLowerCase().replace(/\s+/gu," ").trim())),10),l=P([...u,...p],15),f=P(r.tests.slice().reverse(),10),d=P([...(r.activeFiles??[]).slice().reverse(),...r.filesTouched.slice().reverse()],20),m={schema:"toolnet.handoff.v2",version:2,project:{id:e.id,name:e.name},source:{agent:n.agent,nativeSessionId:n.nativeSessionId,sessionKey:n.sessionKey,sequence:t.sequence,reason:t.reason},capturedAt:t.capturedAt??new Date().toISOString(),goal:r.goal,request:r.currentRequest,activity:r.currentActivity,current:{phase:gs(r.currentPhase),task:gs(r.currentTask),file:o},completed:{phases:P(s,20),tasks:P(i,30)},remaining:{phases:P(a,20),tasks:P(u,30),todos:l},nextAction:p[0],blockers:P(r.blockers.slice().reverse(),10),decisions:P(r.decisions.slice().reverse(),10),files:{current:o,recent:d,active:P(r.activeFiles??[],10),modified:P(r.modifiedFiles??[],20),created:P(r.createdFiles??[],20),deleted:P(r.deletedFiles??[],20)},tests:{status:gd(r.tests,r.checks),recent:f,checks:(r.checks??[]).slice(-10).map(k=>({kind:k.kind,status:k.status,command:k.command}))},evidence:{commands:P((r.commands??[]).slice().reverse(),20),references:hd([r.currentRequest,r.currentActivity,r.goal,r.plan,...r.decisions,...r.blockers,...r.warnings,...r.nextActions,...r.filesTouched,...r.commands??[],...r.tests,...(r.checks??[]).map(k=>k.command)])},attention:P(t.attention??[],20),progress:r.progress},{capturedAt:S,source:y,...g}=m;return{...m,stateDigest:yd(g)}}function vd(t){return!!(t.currentRequest||t.currentActivity||t.goal||t.plan||t.phases.length>0||t.tasks.length>0||t.nextActions.length>0||t.blockers.length>0||t.decisions.length>0||t.filesTouched.length>0)}function hs(t,e,n,r,o){if(!vd(n))return null;let s=Lt(t,!1),a=[...s?s.rules.filter(l=>l.mode==="enforce").map(l=>l.text):[],...n.warnings].slice(0,20),u=ys({project:t,identity:e,state:n,reason:r,sequence:o,attention:a}),c=u.stateDigest;return{version:1,id:w([t.id,e.sessionKey,c].join("|")).slice(0,24),projectId:t.id,projectName:t.name,createdAt:new Date().toISOString(),reason:r,sourceSession:{agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,sequence:o},currentRequest:n.currentRequest,currentActivity:n.currentActivity,goal:n.goal,plan:n.plan,progress:n.progress,currentPhase:n.currentPhase,currentTask:n.currentTask,incompletePhases:n.phases.filter(l=>l.status!=="completed"&&l.status!=="cancelled"),incompleteTasks:n.tasks.filter(l=>l.status!=="completed"&&l.status!=="cancelled"),nextActions:u.remaining.todos.slice(0,10),blockers:n.blockers.slice(-10),decisions:n.decisions.slice(-10),warnings:n.warnings.slice(-10),attention:a,filesTouched:n.filesTouched.slice(-20),activeFiles:n.activeFiles?.slice(-10),modifiedFiles:n.modifiedFiles?.slice(-20),createdFiles:n.createdFiles?.slice(-20),deletedFiles:n.deletedFiles?.slice(-20),tests:n.tests.slice(-15),checks:n.checks?.slice(-10),stateDigest:c,continuity:u}}function Ss(t,e){let n=On(t.rootPath,".toolnet","work","handoffs");kd(n,{recursive:!0});let r=On(n,`${e.id}.json`);Sd(r)||_(r,e),_(On(t.rootPath,".toolnet","work","handoff-latest.json"),e)}function ks(t){let e=hs(t.project,t.identity,t.state,t.reason,t.sequence);return e?(Ss(t.project,e),e):null}var Kt=class{constructor(e){this.options=e}options;async capture(e,n){let r=Pn(this.options.project);r||(r=await Ot(this.options.project,this.options.storage)),r||(r=await He(this.options.project,this.options.storage));let o=hs(this.options.project,this.options.identity,r,e,n);if(!o)return null;Ss(this.options.project,o);let s=`projects/${this.options.project.id}/work/handoffs/${o.id}.json`;return await this.options.storage.exists(s)||await this.options.storage.put(s,JSON.stringify(o,null,2)+`
`,"application/json"),await this.options.storage.put(`projects/${this.options.project.id}/work/handoff-latest.json`,JSON.stringify(o,null,2)+`
`,"application/json"),o}};async function vs(t,e){let n=await e.getText(`projects/${t.id}/work/handoff-latest.json`);if(!n)return null;try{return JSON.parse(n)}catch{return null}}import{existsSync as wd,readFileSync as bd,writeFileSync as xd}from"node:fs";import{join as Ed}from"node:path";var bs="<!-- TOOLNET:STABLE-WORK:BEGIN -->",Tn="<!-- TOOLNET:STABLE-WORK:END -->";function Rn(t){switch(t.status){case"completed":return"[x]";case"in_progress":return"[~]";case"blocked":return"[!]";case"cancelled":return"[-]";default:return"[ ]"}}function z(t,e){return e.length?["",`${t}:`,...e.map(n=>`- ${n}`)]:[]}function ws(t,e){return e.length?["",`${t}:`,...e.map(n=>`- ${Rn(n)} ${n.title}`)]:[]}function Cd(t){let e=[bs,"# ToolNet Stable Work State","",`Updated: ${t.updatedAt}`];return t.lastSession&&e.push(`Last agent: ${t.lastSession.agent}`,`Last session: ${t.lastSession.nativeSessionId}`),t.currentRequest&&e.push("","Current request:",t.currentRequest),t.currentActivity&&e.push("","Current activity:",t.currentActivity),t.goal&&e.push("","Goal:",t.goal),t.plan&&e.push("","Plan:",t.plan),t.currentPhase&&e.push("","Current phase:",`${Rn(t.currentPhase)} ${t.currentPhase.title}`),t.currentTask&&e.push("","Current task:",`${Rn(t.currentTask)} ${t.currentTask.title}`),e.push(...ws("Phases",t.phases)),e.push(...ws("TODO / Tasks",t.tasks)),e.push(...z("Next actions",t.nextActions)),e.push(...z("Blockers",t.blockers)),e.push(...z("Important decisions",t.decisions)),e.push(...z("Active files",t.activeFiles??[])),e.push(...z("Modified files",t.modifiedFiles??[])),e.push(...z("Created files",t.createdFiles??[])),e.push(...z("Deleted files",t.deletedFiles??[])),e.push(...z("Files touched",t.filesTouched)),e.push(...z("Recent commands",t.commands??[])),e.push(...z("Checks",(t.checks??[]).map(n=>`[${n.status}] ${n.kind}: ${n.command}`))),e.push("","Progress:",`- Phases: ${t.progress.phasesCompleted}/${t.progress.phasesTotal}`,`- Tasks: ${t.progress.tasksCompleted}/${t.progress.tasksTotal}`,`- Blocked: ${t.progress.blocked}`,"","Continuation:","- Resume current unfinished task.","- Never redo completed TODO/Phase unless explicitly requested.","- Ask ToolNet Memory for deeper history only when necessary.",Tn),e.join(`
`)}function xs(t,e){let n=Ed(t.rootPath,".toolnet","current.md"),r="";if(wd(n))try{r=bd(n,"utf8")}catch{r=""}r=r.replace(/<!-- TOOLNET:AUTO-CURRENT:BEGIN -->[\s\S]*?<!-- TOOLNET:AUTO-CURRENT:END -->/gu,"");let o=Cd(e),s=r.indexOf(bs),i=r.indexOf(Tn),a;s>=0&&i>=s?a=[r.slice(0,s).trimEnd(),o,r.slice(i+Tn.length).trimStart()].filter(Boolean).join(`

`):a=r.trim()?`${r.trim()}

${o}`:o,xd(n,`${a.trim()}
`,{encoding:"utf8",mode:384})}import{existsSync as Oh,mkdirSync as Id,readFileSync as Th,renameSync as jd,writeFileSync as Ad}from"node:fs";import{dirname as Md,join as Pd}from"node:path";function Od(t){return Pd(t.rootPath,".toolnet","context","session-origin.json")}function Td(t,e){Id(Md(t),{recursive:!0});let n=`${t}.tmp-${process.pid}-${Date.now()}`;Ad(n,`${JSON.stringify(e,null,2)}
`,{encoding:"utf8",mode:384}),jd(n,t)}function Dt(t,e){return[...t].filter(n=>n.kind===e).sort((n,r)=>{let o=n.occurredAt.localeCompare(r.occurredAt);return o!==0?o:n.sequence-r.sequence}).at(-1)}function Es(t,e){let n=Dt(e.observations,"file"),r=Dt(e.observations,"next_action"),o=Dt(e.observations,"blocker"),s=Dt(e.observations,"decision"),i={version:1,projectId:t.id,agent:e.agent,nativeSessionId:e.nativeSessionId,updatedAt:e.workState.updatedAt,currentRequest:e.workState.currentRequest,currentActivity:e.workState.currentActivity,currentTask:e.workState.currentTask?.title,currentPhase:e.workState.currentPhase?.title,lastTouchedFile:n?.text??e.workState.activeFiles?.at(-1)??e.workState.filesTouched.at(-1),latestNextAction:r?.text??e.workState.nextActions.at(-1),latestBlocker:o?.text??e.workState.blockers.at(-1),latestDecision:s?.text??e.workState.decisions.at(-1)};return Td(Od(t),i),i}import{existsSync as Cs,mkdirSync as Rd,readFileSync as Nd}from"node:fs";import{join as Nn}from"node:path";function Is(t){return Nn(t.rootPath,".toolnet","memory","checkpoints")}function js(t){return Nn(Is(t),"latest.json")}function _d(t){let e=js(t);if(!Cs(e))return null;try{let n=JSON.parse(Nd(e,"utf8"));return n.schema!=="toolnet.memory.checkpoint.v1"||n.project.id!==t.id?null:n}catch{return null}}function Ld(t){return["rule","architecture","decision","fix"].includes(t)}function $d(t,e){return e.length===0?[]:St(t,e).candidates.filter(r=>Ld(r.kind)&&r.knowledgeClass!=="transient"&&r.importanceScore>=.65).map(r=>({fingerprint:r.fingerprint,kind:r.kind,content:r.content,knowledgeClass:r.knowledgeClass,importanceScore:r.importanceScore,confidence:r.confidence,createdAt:r.createdAt,agent:t.agent,nativeSessionId:t.nativeSessionId}))}function Kd(t,e){let n=new Map;for(let r of[...t,...e]){let o=n.get(r.fingerprint);(!o||r.importanceScore>o.importanceScore)&&n.set(r.fingerprint,r)}return Array.from(n.values()).sort((r,o)=>o.importanceScore-r.importanceScore||o.createdAt.localeCompare(r.createdAt)).slice(0,80)}function Dd(t){return{request:t.currentRequest,activity:t.currentActivity,goal:t.goal,phase:t.currentPhase?{title:t.currentPhase.title,status:t.currentPhase.status}:void 0,task:t.currentTask?{title:t.currentTask.title,status:t.currentTask.status}:void 0,phases:t.phases.map(e=>({title:e.title,status:e.status})),tasks:t.tasks.map(e=>({title:e.title,status:e.status})),activeFiles:t.activeFiles??[],modifiedFiles:t.modifiedFiles??[],createdFiles:t.createdFiles??[],deletedFiles:t.deletedFiles??[],checks:t.checks??[],blockers:t.blockers,decisions:t.decisions,nextActions:t.nextActions}}function As(t,e,n,r){let o=_d(t),s=Kd(o?.durableFacts??[],$d(e,n)),i=n.at(-1)?.sequence??o?.source.sequence??0,a=r.phases.filter(y=>y.status==="completed").map(y=>y.title),u=r.tasks.filter(y=>y.status==="completed").map(y=>y.title),c=r.phases.filter(y=>y.status!=="completed"&&y.status!=="cancelled").map(y=>y.title),p=r.tasks.filter(y=>y.status!=="completed"&&y.status!=="cancelled").map(y=>y.title),l={work:Dd(r),durableFacts:s.map(y=>y.fingerprint).sort()},f=w(JSON.stringify(l)).slice(0,32),d={schema:"toolnet.memory.checkpoint.v1",version:1,project:{id:t.id,name:t.name},source:{agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,sequence:i},capturedAt:new Date().toISOString(),request:r.currentRequest,activity:r.currentActivity,goal:r.goal,current:{phase:r.currentPhase,task:r.currentTask},completed:{phases:a,tasks:u},remaining:{phases:c,tasks:p},files:{active:r.activeFiles??[],modified:r.modifiedFiles??[],created:r.createdFiles??[],deleted:r.deletedFiles??[]},checks:r.checks??[],blockers:r.blockers.slice(-10),decisions:r.decisions.slice(-15),nextActions:r.nextActions.slice(0,10),durableFacts:s,stateDigest:f},m=Is(t);Rd(m,{recursive:!0,mode:448});let S=Nn(m,`${f}.json`);return Cs(S)||_(S,d),_(js(t),d),d}function Ms(t,e,n){if(process.env.TOOLNET_LOCAL_CHECKPOINT==="0"||n.length===0)return{updated:!1,observations:0};let r=Mt(e,n);if(r.length===0)return{updated:!1,observations:0};let o=ms(t,r);xs(t,o),Es(t,{agent:e.agent,nativeSessionId:e.nativeSessionId,observations:r,workState:o});try{As(t,e,n,o)}catch{}try{ks({project:t,identity:e,state:o,reason:"continuous-checkpoint",sequence:n.at(-1)?.sequence??0})}catch{}return{updated:!0,observations:r.length}}var Je=class{identity;wal;remote;sanitizer=new J;learner;continuity;semantic;handoff;project;title;metadata;constructor(e){this.project=e.project,this.identity=kr(e.project,e.agent,e.nativeSessionId),this.title=e.title,this.metadata=this.sanitizer.sanitizeValue(e.metadata??{}),this.wal=new ft(this.identity,e.eventContext),this.remote=new at(e.storage,e.maxEventsPerChunk??100,e.maxChunkBytes??512*1024),this.learner=new jt({project:e.project,storage:e.storage,identity:this.identity,wal:this.wal}),this.continuity=new Tt({project:e.project,storage:e.storage,identity:this.identity,wal:this.wal}),this.semantic=new Nt({project:e.project,storage:e.storage,identity:this.identity,wal:this.wal}),this.handoff=new Kt({project:e.project,storage:e.storage,identity:this.identity})}sanitizeEvent(e){let n=e.provenance?{...e.provenance,metadata:this.sanitizer.sanitizeValue(e.provenance.metadata)}:void 0;return{...e,data:this.sanitizer.sanitizeValue(e.data??{}),provenance:n}}checkpointLocal(e){if(e.length!==0)try{Ms(this.project,this.identity,e)}catch{}}start(e={}){let n=this.wal.loadState();return this.record({type:n.lastSequence===0?"session_start":"session_resume",data:e,provenance:{source:this.identity.agent}})}record(e){let n=this.wal.append([this.sanitizeEvent(e)]);return this.checkpointLocal(n),n[0]}recordMany(e){let n=this.wal.append(e.map(r=>this.sanitizeEvent(r)));return this.checkpointLocal(n),n}setSourceCursor(e,n){this.wal.setSourceCursor(e,n)}async flush(){let e=this.wal.readPending(),n=this.wal.loadState(),r=await this.remote.append(this.identity,e.events,n.sourceCursors,{title:this.title,metadata:this.metadata});if(e.events.length>0){let o=e.events[e.events.length-1];this.wal.markRemote(o.sequence,e.endOffset)}if(process.env.TOOLNET_SESSION_LEARNING!=="0")try{await this.learner.learnNew()}catch{}if(process.env.TOOLNET_WORK_CONTINUITY!=="0")try{await this.continuity.learnNew()}catch{}if(process.env.TOOLNET_SEMANTIC_CONTINUITY!=="0")try{await this.semantic.learnNew()}catch{}if(process.env.TOOLNET_SMART_HANDOFF!=="0"&&e.events.length>0)try{let o=e.events[e.events.length-1],s=["session_idle","session_end","session_compact"].includes(o.type)?o.type:"checkpoint";await this.handoff.capture(s,o.sequence)}catch{}return r}async idle(e={}){return this.record({type:"session_idle",data:e,provenance:{source:this.identity.agent}}),this.flush()}async end(e={}){return this.record({type:"session_end",data:e,provenance:{source:this.identity.agent}}),this.flush()}status(){return this.wal.loadState()}recoverRemote(){return this.remote.recover(this.identity)}};var Fd=[/^<SYSTEM MESSAGE>/i,/^<EPHEMERAL MESSAGE>/i,/^<system>/i,/^<ephemeral>/i,/^ManageTask:/i,/^Task \d+ status:/i,/^Task \d+ killed/i,/^Task \d+ loading/i,/^Thought for \d+ tokens/i,/^Prioritizing Tool Usage/i,/^Tool call:/i,/^Tool response:/i,/^npm notice/i,/^npm WARN/i,/^added \d+ packages/i,/^removed \d+ packages/i,/^up to date/i,/^\d+ packages are looking for funding/i,/^run `npm fund` for details/i,/^[\d.]+%/,/^\[={10,}\]/,/^Loading\.\.\./i,/^Processing\.\.\./i,/^bash-\d+\.\d+\$/,/^\$ /,/^\s*$/],Wd=[/api[_-]?key[:\s=]+[^\s]+/gi,/token[:\s=]+[^\s]+/gi,/secret[:\s=]+[^\s]+/gi,/password[:\s=]+[^\s]+/gi,/bearer\s+[^\s]+/gi,/authorization:\s*[^\s]+/gi],zd=["decision","decided","rule","convention","architecture","pattern","fixed","resolved","implemented","created","updated","deleted","deployed","blocker","blocked","issue","bug","error","next","todo","action","requirement","must","should","important"];function qd(t){let e=t.toLowerCase();return zd.some(n=>e.includes(n))}function Bd(t){if(!t.trim())return!0;for(let e of Fd)if(e.test(t))return!0;return qd(t),!1}function Vd(t){let e=t;for(let n of Wd)e=e.replace(n,r=>{let o=r.split(/[:\s=]+/);return o.length>1?`${o[0]}: [REDACTED]`:"[REDACTED]"});return e}function _n(t){let e=t.trim();return e?Bd(e)?{content:"",filtered:!0,reason:"noise"}:{content:Vd(e),filtered:!1}:{content:"",filtered:!0,reason:"empty"}}function Ft(t){let e={};for(let[n,r]of Object.entries(t))if(typeof r=="string"){let o=_n(r);o.filtered||(e[n]=o.content)}else r&&typeof r=="object"&&!Array.isArray(r)?e[n]=Ft(r):Array.isArray(r)?e[n]=r.map(o=>{if(typeof o=="string"){let s=_n(o);return s.filtered?null:s.content}return o&&typeof o=="object"?Ft(o):o}).filter(o=>o!==null):e[n]=r;return e}function Ps(t){let e=typeof t.type=="string"?t.type.toLowerCase():"";if(e.includes("system")||e.includes("ephemeral")||e==="tool_call"&&!t.result)return!0;if(t.data&&typeof t.data=="object"){let n=t.data,r=typeof n.content=="string"?n.content:"";if(r&&_n(r).filtered)return!0}return!1}function $s(){try{let e=Jd("opencode",["db","path"],{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:5e3}).trim();if(e)return e}catch{}if(process.env.OPENCODE_DB)return process.env.OPENCODE_DB;let t=process.env.XDG_DATA_HOME??Os(Gd(),".local","share");return Os(t,"opencode","opencode.db")}function E(t){return typeof t=="string"?t:""}function ce(t){if(typeof t=="number"&&Number.isFinite(t))return t;if(typeof t=="bigint")return Number(t);if(typeof t=="string"){let e=Number(t);if(Number.isFinite(e))return e}return 0}function zt(t){if(t&&typeof t=="object"&&!Buffer.isBuffer(t))return t;if(typeof t!="string")return{};try{let e=JSON.parse(t);if(e&&typeof e=="object"&&!Array.isArray(e))return e}catch{}return{}}function Se(t){let e=ce(t);if(e<=0)return new Date().toISOString();e<1e11&&(e*=1e3);let n=new Date(e);return Number.isNaN(n.getTime())?new Date().toISOString():n.toISOString()}function Wt(t,e){if(!e)return!1;let n=Ts(t),r=Ts(e);if(n===r)return!0;let o=Yd(n,r);return o!==""&&o!==".."&&!o.startsWith(`..${process.platform==="win32"?"\\":"/"}`)&&!Ud(o)}function Rs(t){if(!t)return{time:-1,id:""};try{let e=JSON.parse(t);return{time:typeof e.time=="number"?e.time:-1,id:typeof e.id=="string"?e.id:""}}catch{return{time:-1,id:""}}}function Ns(t){return JSON.stringify(t)}function Ks(t){if(!Hd(t))throw new Error(`OpenCode database not found: ${t}`);let e=new Xd(t,{readOnly:!0});return e.exec("PRAGMA query_only = ON"),e.exec("PRAGMA busy_timeout = 3000"),e}function Qd(t,e){let n=t.prepare(`
      SELECT *
      FROM "session"
      WHERE id = ?
      LIMIT 1
      `).get(e);if(!n)throw new Error(`OpenCode session not found: ${e}`);return n}function Ds(t,e,n){let r=E(e.directory);if(r&&Wt(n.rootPath,r))return!0;let o=E(e.project_id);if(o){try{let s=t.prepare(`
          SELECT *
          FROM "project"
          WHERE id = ?
          LIMIT 1
          `).get(o);if(s)for(let i of["worktree","directory","path"]){let a=E(s[i]);if(a&&Wt(n.rootPath,a))return!0}}catch{}try{if(t.prepare(`
          SELECT directory
          FROM "project_directory"
          WHERE project_id = ?
          `).all(o).some(i=>Wt(n.rootPath,E(i.directory))))return!0}catch{}}try{let s=t.prepare(`
        SELECT data
        FROM "message"
        WHERE session_id = ?
        ORDER BY time_created DESC
        LIMIT 20
        `).all(E(e.id));for(let i of s){let a=zt(i.data),u=a.path&&typeof a.path=="object"?a.path:{};for(let c of[E(u.cwd),E(u.root)])if(c&&Wt(n.rootPath,c))return!0}}catch{}return!1}function _s(t,e,n,r){let o=`
    SELECT *,
      COALESCE(
        time_updated,
        time_created,
        0
      ) AS __clock
    FROM "${e}"
    WHERE session_id = ?
      AND (
        COALESCE(
          time_updated,
          time_created,
          0
        ) > ?
        OR (
          COALESCE(
            time_updated,
            time_created,
            0
          ) = ?
          AND id > ?
        )
      )
    ORDER BY
      COALESCE(
        time_updated,
        time_created,
        0
      ) ASC,
      id ASC
    `;return t.prepare(o).all(n,r.time,r.time,r.id)}function Ls(t,e){let n=t[t.length-1];return n?{time:ce(n.__clock),id:E(n.id)}:e}function Zd(t,e){let n=zt(e.data),r=E(n.role),o=ce(e.__clock),s=E(e.id),i="message";return r==="user"?i="user_prompt":r==="assistant"&&(i="assistant_message"),{clock:o,order:0,event:{type:i,timestamp:Se(o),role:r||void 0,sourceEventId:`message:${s}:${o}`,sourceSequence:`${o}:${s}`,data:{messageId:s,...n},provenance:{source:"opencode",sourcePath:t,sourceTable:"message",sourceRowId:s,sourceOffset:`${o}:${s}`}}}}function ep(t){let e={...t},n=t.state&&typeof t.state=="object"&&!Array.isArray(t.state)?{...t.state}:void 0;if(n){let r=n.output;if(typeof r=="string"){let o=r.replace(/\r\n/g,`
`),s=500;n.outputSummary=o.length<=s?o:`${o.slice(0,350)}
...[ToolNet truncated ${o.length-s} chars]...
${o.slice(-150)}`,delete n.output}else r!==void 0&&(n.outputSummary="[non-text tool output omitted]",delete n.output);if(n.input&&typeof n.input=="object"&&!Array.isArray(n.input)){let o={...n.input};for(let[s,i]of Object.entries(o))typeof i=="string"&&i.length>1e3&&(o[s]=`${i.slice(0,1e3)}...[ToolNet truncated]`);n.input=o}e.state=n}return e}function tp(t,e){let n=E(e.message_id);if(n)try{let r=t.prepare(`
        SELECT data
        FROM "message"
        WHERE id = ?
        LIMIT 1
        `).get(n);if(!r)return;let o=zt(r.data);return E(o.role)||void 0}catch{return}}function np(t,e,n){let r=zt(n.data),o=E(r.type),s=ce(n.__clock),i=E(n.id),a=E(n.message_id),u=tp(t,n),c="message_part";return o==="tool"?c="tool_call":o==="snapshot"&&(c="artifact"),{clock:s,order:1,event:{type:c,timestamp:Se(s),role:u,sourceEventId:`part:${i}:${s}`,sourceSequence:`${s}:${i}`,data:{partId:i,messageId:a,...o==="tool"?ep(r):r},provenance:{source:"opencode",sourcePath:e,sourceTable:"part",sourceRowId:i,sourceOffset:`${s}:${i}`}}}}async function Ln(t){let e=t.dbPath??$s(),n=Ks(e);try{let r;try{r=Qd(n,t.nativeSessionId)}catch{let g=new Je({project:t.project,storage:t.storage,agent:"opencode",nativeSessionId:t.nativeSessionId,metadata:{source:"opencode.db",deleted:!0},eventContext:{source:"opencode",cwd:t.project.rootPath}});g.status().lastSequence===0&&g.recordMany([{type:"custom",timestamp:new Date().toISOString(),sourceEventId:`session:${t.nativeSessionId}:deleted`,data:{event:"session_deleted"},provenance:{source:"opencode"}}]);let k=await g.flush();return{nativeSessionId:t.nativeSessionId,importedMessages:0,importedParts:0,recordedEvents:0,eventCount:k.eventCount,chunkCount:k.chunkCount,status:k.status,durability:t.localOnly?"local":"remote"}}if(!Ds(n,r,t.project))throw new Error(["OpenCode session does not belong to current ToolNet project.",`Session: ${t.nativeSessionId}`,`Project: ${t.project.rootPath}`,`Session directory: ${E(r.directory)||"unknown"}`].join(" "));let o=new Je({project:t.project,storage:t.storage,agent:"opencode",nativeSessionId:t.nativeSessionId,title:E(r.title)||void 0,metadata:{source:"opencode.db",openCodeProjectId:E(r.project_id)||void 0,directory:E(r.directory)||void 0},eventContext:{source:"opencode",cwd:E(r.directory)||t.project.rootPath}}),s=o.status(),i=Rs(s.sourceCursors["opencode.message"]),a=Rs(s.sourceCursors["opencode.part"]),u=_s(n,"message",t.nativeSessionId,i),c=_s(n,"part",t.nativeSessionId,a),p=[];if(s.lastSequence===0){let g=ce(r.time_created);p.push({clock:g,order:-1,event:{type:"session_start",timestamp:Se(g),sourceEventId:`session:${t.nativeSessionId}:created:${g}`,data:{title:E(r.title)||void 0,directory:E(r.directory)||void 0,openCodeProjectId:E(r.project_id)||void 0},provenance:{source:"opencode",sourcePath:e,sourceTable:"session",sourceRowId:t.nativeSessionId}}})}p.push(...u.map(g=>Zd(e,g))),p.push(...c.map(g=>np(n,e,g)));let l=ce(r.time_updated)||ce(r.time_created);t.compacted&&p.push({clock:l,order:98,event:{type:"session_compact",timestamp:Se(l),sourceEventId:`session:${t.nativeSessionId}:compact:${l}`,data:{},provenance:{source:"opencode"}}}),t.error?p.push({clock:l,order:99,event:{type:"error",timestamp:Se(l),sourceEventId:`session:${t.nativeSessionId}:error:${l}`,data:{source:"session.error"},provenance:{source:"opencode"}}}):t.idle&&p.push({clock:l,order:100,event:{type:"session_idle",timestamp:Se(l),sourceEventId:`session:${t.nativeSessionId}:idle:${l}`,data:{},provenance:{source:"opencode"}}}),p.sort((g,k)=>g.clock-k.clock||g.order-k.order);let f=p.filter(g=>!Ps(g.event.data)).map(g=>({...g,event:{...g.event,data:Ft(g.event.data)}})),d=o.recordMany(f.map(g=>g.event)),m=Ls(u,i),S=Ls(c,a);if(o.setSourceCursor("opencode.message",Ns(m)),o.setSourceCursor("opencode.part",Ns(S)),f.length>0)try{let g=f.map(b=>JSON.stringify(b.event.data)),k=ht(g,t.nativeSessionId);o.setSourceCursor("opencode.session.summary",k.summary),o.setSourceCursor("opencode.session.facts_count",k.durableFacts.length),Gr()&&!Xr()&&o.setSourceCursor("opencode.raw_transcript.archived","local")}catch{}if(t.localOnly){let g=o.status();return{nativeSessionId:t.nativeSessionId,importedMessages:u.length,importedParts:c.length,recordedEvents:d.length,eventCount:g.lastSequence,chunkCount:0,status:g.status,durability:"local"}}let y=await o.flush();return{nativeSessionId:t.nativeSessionId,importedMessages:u.length,importedParts:c.length,recordedEvents:d.length,eventCount:y.eventCount,chunkCount:y.chunkCount,status:y.status,durability:"remote"}}finally{n.close()}}async function Fs(t){let e=t.dbPath??$s(),n=Ks(e),r=[];try{let s=n.prepare(`
        SELECT *
        FROM "session"
        ORDER BY
          COALESCE(
            time_updated,
            time_created,
            0
          ) DESC
        `).all();for(let i of s){if(!Ds(n,i,t.project))continue;let a=E(i.id);if(a&&r.push(a),r.length>=(t.limit??100))break}}finally{n.close()}let o=[];for(let s of r)o.push(await Ln({project:t.project,storage:t.storage,nativeSessionId:s,dbPath:e}));return o}import{existsSync as op,mkdirSync as Vs,readFileSync as sp,writeFileSync as Hs}from"node:fs";import{join as qs}from"node:path";import{homedir as Ws}from"node:os";import{join as ue}from"node:path";function qt(t={}){let e=process.env.OPENCODE_CONFIG_DIR?.trim();if(e)return e;let n=t.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return n?ue(n,"opencode"):ue(t.home??Ws(),".config","opencode")}function Ge(t={}){let e=process.env.OPENCODE_CONFIG?.trim();if(e)return e;let n=t.home??Ws(),r=t.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return r?ue(r,"opencode","opencode.json"):ue(n,".config","opencode","opencode.json")}function Ue(t={}){let e=t.cwd??process.cwd();return ue(e,"opencode.json")}function Bt(t={}){return ue(qt(t),"plugins")}function Vt(t={}){return ue(qt(t),"AGENTS.md")}var rp="memory_agent_ask";function zs(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${rp}

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
`.trim()}var Bs="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",$n="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function ip(t={}){let e=Vt();Vs(qt(),{recursive:!0});let n=`${Bs}
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


${zs()}

${$n}`,r=op(e)?sp(e,"utf8"):"",o=r.indexOf(Bs),s=r.indexOf($n);return o>=0&&s>=o?r=r.slice(0,o)+n+r.slice(s+$n.length):(r=r.trimEnd(),r&&(r+=`

`),r+=n),Hs(e,r.trimEnd()+`
`,{encoding:"utf8",mode:384}),e}function Js(t={}){let e=t.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=[];n.push(ip({cwd:t.cwd}));let r=t.scope??"global",o=[];if((r==="global"||r==="both")&&o.push(t.directory??Bt()),r==="project"||r==="both"){let s=t.cwd??process.cwd();o.push(qs(s,".opencode","plugins"))}for(let s of o){Vs(s,{recursive:!0});let i=qs(s,"toolnet-memory.js"),a=`
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
  ${JSON.stringify(e)}

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
`;Hs(i,a.trimStart(),{encoding:"utf8",mode:384}),n.push(i)}return n}import{existsSync as Ys,mkdirSync as ap,readFileSync as cp,renameSync as up,writeFileSync as lp}from"node:fs";import{dirname as Xs,join as dp}from"node:path";function Ye(t){return typeof t=="object"&&t!==null&&!Array.isArray(t)}function pp(t,e){ap(Xs(t),{recursive:!0});let n=`${t}.tmp-${process.pid}-${Date.now()}`;lp(n,`${JSON.stringify(e,null,2)}
`,{encoding:"utf8",mode:384}),up(n,t)}function Gs(t){if(!Ys(t))return{};let e=cp(t,"utf8").trim();if(!e)return{};let n;try{n=JSON.parse(e)}catch{throw new Error(`Invalid existing OpenCode config at ${t}: parse error. Not overwriting.`)}if(!Ye(n))throw new Error(`Invalid existing OpenCode config at ${t}: root must be a JSON object. Not overwriting.`);return n}function Us(t,e){if(!Ye(t))return!1;let n=t.command;return t.type==="local"&&t.enabled!==!1&&Array.isArray(n)&&n.length===2&&n[0]===e&&n[1]==="mcp"}function Ht(t,e,n,r){let o=dp(Xs(t),"opencode.jsonc"),s=Ys(o)?o:void 0,i=Gs(t),a=i.mcp;if(a!==void 0&&!Ye(a))throw new Error(`Invalid existing OpenCode config: mcp must be an object in ${t}.`);let u=Ye(a)?{...a}:{},c=u[n];if(Us(c,e)&&!r)return{installed:!0,changed:!1,preservedJsonc:s};u[n]={type:"local",command:[e,"mcp"],enabled:!0};let p={...i,mcp:u};pp(t,p);let l=Gs(t);if(!Ye(l.mcp)||!Us(l.mcp[n],e))throw new Error(`OpenCode MCP configuration was written but verification failed for ${t}.`);return{installed:!0,changed:!0,preservedJsonc:s}}function Qs(t={}){let e=t.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=t.serverName??"toolnet-memory",r=t.scope??"global";if(t.configFile)return{...Ht(t.configFile,e,n,t.force??!1),configFile:t.configFile,serverName:n,command:[e,"mcp"]};if(r==="both"){let i=Ge(),a=Ue({cwd:t.cwd}),u=Ht(i,e,n,t.force??!1),c=Ht(a,e,n,t.force??!1);return{installed:!0,changed:u.changed||c.changed,configFile:i,serverName:n,command:[e,"mcp"],preservedJsonc:u.preservedJsonc??c.preservedJsonc}}let o=r==="project"?Ue({cwd:t.cwd}):Ge();return{...Ht(o,e,n,t.force??!1),configFile:o,serverName:n,command:[e,"mcp"]}}import{existsSync as NS,mkdirSync as yp,readFileSync as _S,writeFileSync as hp}from"node:fs";import{dirname as Sp,join as ei}from"node:path";function Kn(t){if(!t)return 0;let e=Array.from(t).length,n=t.trim().split(/\s+/u).filter(Boolean).length;return Math.ceil(Math.max(e/3.5,n*1.3))}function I(t,e){let n=t.replace(/\s+/g," ").trim();return n.length<=e?n:n.slice(0,Math.max(0,e-1)).trimEnd()+"\u2026"}function fp(t){let e=[],n=!1;for(let r of t.split(/\r?\n/u)){let o=r.trim();if(o.includes("<!--")&&(n=!0),n){o.includes("-->")&&(n=!1);continue}let s=o.toLowerCase();if(!(!o||o.startsWith("#")||o==="```"||s.startsWith("- [enforce]")||s.startsWith("* [enforce]")||s.startsWith("- [advisory]")||s.startsWith("* [advisory]"))&&(o=o.replace(/^[-*]\s+/u,""),o&&e.push(I(o,280)),e.length>=16))break}return e}function mp(t){let e=[],n=[];for(let r of t.split(/\\r?\\n/u)){let o=r.trim(),s=o.toLowerCase(),a=["- [enforce]","* [enforce]","- [advisory]","* [advisory]"].find(c=>s.startsWith(c));if(!a)continue;let u=o.slice(a.length).trim();u&&(a.includes("enforce")?e.push(u):n.push(u))}return{enforce:e,advisory:n}}function gp(t,e){let n=[];for(let r of t){let o=[...n,r].join(`
`);if(Kn(o)<=e){n.push(r);continue}let s=Kn(n.join(`
`)),i=Math.max(0,e-s);if(i>=16){let a=Math.floor(i*3.2),u=I(r,a);u&&n.push(u)}break}return n.join(`
`).trim()}async function Zs(t){let e=Math.max(256,Math.min(2e3,t.maxTokens??1e3)),n=Lt(t.project,!1),r=n?.content??"";r||(r=await t.storage.getText(`projects/${t.project.id}/project/manual.md`)??"");let o=mp(r),s=n?n.rules.filter(d=>d.mode==="enforce").map(d=>d.text):o.enforce,i=n?n.rules.filter(d=>d.mode==="advisory").map(d=>d.text):o.advisory,a=r?fp(r):[],u=await Ot(t.project,t.storage),c=await es(t.project,t.storage),p=await vs(t.project,t.storage),l=[];if(l.push("[TOOLNET PROJECT CONTEXT]"),l.push(`Project: ${t.project.name}`),l.push("Continue existing project state. Do not restart completed work unless evidence shows it is necessary."),r&&l.push(`Full operating manual: ${_t(t.project)}`),s.length){l.push("","PROJECT RULES \u2014 MUST FOLLOW");for(let d of s.slice(0,24))l.push(`- [ENFORCE] ${I(d,240)}`)}if(i.length){l.push("","PROJECT PREFERENCES");for(let d of i.slice(0,10))l.push(`- ${I(d,220)}`)}if(c&&(c.mission&&l.push("","MISSION",I(c.mission.value,420)),c.activeObjective&&l.push("","CURRENT OBJECTIVE",I(c.activeObjective.value,420)),c.why&&l.push("","WHY THIS WORK MATTERS",I(c.why.value,420)),c.desiredOutcome&&l.push("","DESIRED OUTCOME",I(c.desiredOutcome.value,420)),c.planRationale&&l.push("","WHY THIS APPROACH",I(c.planRationale.value,420))),u){if(l.push("","ACTIVE WORK"),u.goal&&l.push(`Goal: ${I(u.goal,320)}`),u.plan&&l.push(`Plan: ${I(u.plan,320)}`),l.push(`Progress: phases ${u.progress.phasesCompleted}/${u.progress.phasesTotal}; tasks ${u.progress.tasksCompleted}/${u.progress.tasksTotal}; blocked ${u.progress.blocked}`),u.currentPhase&&l.push(`Current phase: ${u.currentPhase.title} [${u.currentPhase.status}]`),u.currentPhase&&c){let d=c.phases.find(m=>m.order===u.currentPhase?.order);d&&(d.objective&&l.push(`Phase objective: ${I(d.objective.value,340)}`),d.why?l.push(`Why this phase: ${I(d.why.value,340)}`):l.push("Why this phase: not explicitly recorded. Inspect existing implementation before assuming intent."),d.deliverable&&l.push(`Deliverable: ${I(d.deliverable.value,340)}`),d.dependencies.length&&l.push(`Depends on: ${d.dependencies.slice(0,4).map(m=>I(m.value,180)).join("; ")}`),d.acceptanceCriteria.length&&(l.push("","DEFINITION OF DONE"),d.acceptanceCriteria.slice(0,6).forEach(m=>{l.push(`- ${I(m.value,260)}`)})),d.openQuestions.length&&(l.push("","OPEN QUESTIONS FOR CURRENT PHASE"),d.openQuestions.slice(0,4).forEach(m=>{l.push(`- ${I(m.value,260)}`)})))}u.currentTask&&l.push(`Current task: ${u.currentTask.title} [${u.currentTask.status}]`),u.nextActions.length&&(l.push("","NEXT ACTIONS"),u.nextActions.slice(0,6).forEach((d,m)=>{l.push(`${m+1}. ${I(d,260)}`)})),u.blockers.length&&(l.push("","BLOCKERS"),u.blockers.slice(0,5).forEach(d=>{l.push(`- ${I(d,260)}`)})),u.warnings.length&&(l.push("","ATTENTION"),u.warnings.slice(-5).forEach(d=>{l.push(`- ${I(d,260)}`)})),u.decisions.length&&(l.push("","RECENT DECISIONS"),u.decisions.slice(-5).forEach(d=>{l.push(`- ${I(d,260)}`)})),u.lastSession&&l.push("",`Last work session: ${u.lastSession.agent} / ${u.lastSession.nativeSessionId}`)}if(c&&c.openQuestions.length&&(l.push("","UNRESOLVED QUESTIONS"),c.openQuestions.slice(0,5).forEach(d=>{l.push(`- ${I(d.value,260)}`)})),p&&l.push(`Latest handoff: ${p.reason} / ${p.sourceSession.agent}`),a.length){l.push("","OPERATING NOTES");for(let d of a)l.push(`- ${d}`)}l.push("","Before changing anything: verify the current repository state and continue from the active phase/task above.");let f=gp(l,e);return{version:1,projectId:t.project.id,projectName:t.project.name,text:f,estimatedTokens:Kn(f),maxTokens:e,hasManual:!!r,hasWorkState:!!u,hasHandoff:!!p,generatedAt:new Date().toISOString()}}function kp(t){return ei(t.rootPath,".toolnet","context","startup.md")}function vp(t){return ei(t.rootPath,".toolnet","context","startup.json")}function wp(t,e){let n=kp(t);yp(Sp(n),{recursive:!0}),hp(n,e.text.endsWith(`
`)?e.text:e.text+`
`,{encoding:"utf8",mode:384}),_(vp(t),e)}async function ti(t,e,n=800){let o=(await Zs({project:t,storage:e,maxTokens:n})).text;gt(o)>n&&(o=yt(o,n),o+=`

[Context trimmed by ToolNet Memory token budget]
`);let i={version:1,projectId:t.id,projectName:t.name,text:o,digest:w(o),estimatedTokens:gt(o),generatedAt:new Date().toISOString()};return wp(t,i),await e.put(`projects/${t.id}/context/startup.md`,i.text+`
`,"text/markdown"),await e.put(`projects/${t.id}/context/startup.json`,JSON.stringify(i,null,2)+`
`,"application/json"),i}function ve(t,e){let n=t.indexOf(e);if(!(n<0))return t[n+1]}function we(t,e){return t.includes(e)}function xp(t){let e=Qe(),n=fr(dr({provider:e.storage.provider,huggingface:e.storage.huggingface,localRoot:e.storage.localRoot}),{attempts:3});return new it(n,t.id,t.name,t.remote??t.name)}function Ep(){return Dn("sh",["-lc","command -v opencode >/dev/null 2>&1"],{stdio:"ignore"}).status===0}function Cp(){try{return Dn("opencode",["--version"],{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:5e3}).stdout?.trim()||void 0}catch{return}}function Ip(){try{let t=Dn("opencode",["mcp","list","--format","json"],{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:1e4});if(t.status!==0)return{available:!1,servers:[]};let e=JSON.parse(t.stdout||"[]");return{available:!0,servers:Array.isArray(e)?e.map(r=>String(r.name||r.id||"")):[]}}catch{return{available:!1,servers:[]}}}function jp(t){let e=[],n=Ep();n||e.push("opencode binary not found");let r=Cp(),o=Ge(),s=ke(o),i=Ue({cwd:t}),a=ke(i),u=process.env.OPENCODE_CONFIG?.trim(),c=u?ke(u):!1,p=!1;if(s)try{p=!!JSON.parse(ni(o,"utf8")).mcp?.["toolnet-memory"]}catch{}let l=!1;if(a)try{l=!!JSON.parse(ni(i,"utf8")).mcp?.["toolnet-memory"]}catch{}let f=Bt(),d=ke(`${f}/toolnet-memory.js`),m=bp(t??process.cwd(),".opencode","plugins"),S=ke(`${m}/toolnet-memory.js`),y=Vt(),g=ke(y),k;return n&&(k=Ip()),{opencodeBinaryDetected:n,version:r,globalConfigExists:s,projectConfigExists:a,customConfigExists:c,globalMcpReady:p,projectMcpReady:l,globalPluginExists:d,projectPluginExists:S,continuityInstructions:g,mcpConnectionStatus:k,errors:e}}async function Ap(){let[t="help",...e]=process.argv.slice(2),n=we(e,"--json"),r=we(e,"--force"),o=ve(e,"--scope")??"global",s=ve(e,"--project")??process.cwd();if(t==="status"){let c=jp(s);if(n)console.log(JSON.stringify(c,null,2));else if(console.log("OpenCode Integration"),console.log("===================="),console.log(""),console.log(`Binary detected     : ${c.opencodeBinaryDetected?"\u2713":"\u2717"}`),c.version&&console.log(`Version             : ${c.version}`),console.log(`Global config       : ${c.globalConfigExists?"\u2713":"\u2717"}`),console.log(`Project config      : ${c.projectConfigExists?"\u2713":"\u2717"}`),c.customConfigExists&&console.log(`Custom config       : \u2713 (${process.env.OPENCODE_CONFIG})`),console.log(`Global MCP          : ${c.globalMcpReady?"\u2713":"\u2717"}`),console.log(`Project MCP         : ${c.projectMcpReady?"\u2713":"\u2717"}`),console.log(`Global plugin       : ${c.globalPluginExists?"\u2713":"\u2717"}`),console.log(`Project plugin      : ${c.projectPluginExists?"\u2713":"\u2717"}`),console.log(`Continuity rules    : ${c.continuityInstructions?"\u2713":"\u2717"}`),c.mcpConnectionStatus&&(console.log(`MCP connection      : ${c.mcpConnectionStatus.available?"\u2713":"\u2717"}`),c.mcpConnectionStatus.servers.length>0&&console.log(`  Servers           : ${c.mcpConnectionStatus.servers.join(", ")}`)),c.errors.length>0){console.log("");for(let p of c.errors)console.log(`  \u26A0 ${p}`)}c.opencodeBinaryDetected||(process.exitCode=1);return}if(t==="install-plugin"){let c=Qs({binary:ve(e,"--bin"),scope:o,cwd:s,force:r}),p=Js({binary:ve(e,"--bin"),scope:o,cwd:s});if(n)console.log(JSON.stringify({mcp:c,pluginFiles:p},null,2));else{console.log(`\u2705 OpenCode integration installed (scope: ${o})`),console.log(`  MCP config: ${c.configFile}`),c.changed?console.log(`  \u2713 MCP server "${c.serverName}" added`):console.log(`  \u2713 MCP server "${c.serverName}" already configured`);for(let l of p)console.log(`  \u2713 ${l}`);console.log(""),console.log("OpenCode will load plugins automatically on next start."),console.log("Verify MCP with: opencode mcp list")}return}let i=new rt().detect(s),a=xp(i),u=ve(e,"--db");if(t==="sync"){let c=e.find(S=>!S.startsWith("--")&&S!==s&&S!==u);if(!c)throw new Error("Usage: session:opencode-sync <session-id>");let p=we(e,"--idle"),l=we(e,"--error"),f=we(e,"--compacted"),d=we(e,"--local-only"),m=await Ln({project:i,storage:a,nativeSessionId:c,dbPath:u,idle:p,error:l,compacted:f,localOnly:d});if(!d&&(p||f||l))try{await ti(i,a,800)}catch{}console.log(JSON.stringify(m,null,2));return}if(t==="recover"){let c=ve(e,"--limit"),p=c?Number(c):100,l=await Fs({project:i,storage:a,dbPath:u,limit:Number.isFinite(p)?p:100});console.log(JSON.stringify({project:i.name,sessions:l.length,importedMessages:l.reduce((f,d)=>f+d.importedMessages,0),importedParts:l.reduce((f,d)=>f+d.importedParts,0)},null,2));return}console.log(`OpenCode Session Adapter

Commands:
  install-plugin
    --scope global|project|both   MCP + plugin scope (default: global)
    --project PATH                Project root
    --force                       Force reinstall
    --json                        JSON output

  status
    --json                        JSON output
    --project PATH                Project root

  sync <session-id>
    --project PATH                Project root
    --db PATH                     Custom DB path
    --idle                        Mark session idle
    --compacted                   Mark session compacted
    --error                       Mark session error
    --local-only                  Local flush only

  recover
    --project PATH                Project root
    --db PATH                     Custom DB path
    --limit N                     Max sessions (default: 100)
`)}Ap().catch(t=>{console.error(t instanceof Error?t.message:t),process.exit(1)});
