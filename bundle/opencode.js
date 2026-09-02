import{existsSync as ye,readFileSync as $s}from"node:fs";import{join as Gd}from"node:path";import{spawnSync as En}from"node:child_process";import{existsSync as Ls,readFileSync as Ks}from"node:fs";import{homedir as Fs}from"node:os";import{join as Ds}from"node:path";function Ws(t){let e=t.trim();return e.length>=2&&e.startsWith('"')&&e.endsWith('"')?(e=e.slice(1,-1),e.replace(/\\n/g,`
`).replace(/\\r/g,"\r").replace(/\\t/g,"	").replace(/\\"/g,'"').replace(/\\\\/g,"\\")):e.length>=2&&e.startsWith("'")&&e.endsWith("'")?e.slice(1,-1):e}function zs(){let t=process.env.TOOLNET_GLOBAL_ENV??Ds(Fs(),".config","toolnet-memory",".env");if(!Ls(t))return;let e=Ks(t,"utf8");for(let n of e.split(/\r?\n/)){let r=n.trim();if(!r||r.startsWith("#"))continue;r.startsWith("export ")&&(r=r.slice(7));let o=r.indexOf("=");if(o<=0)continue;let s=r.slice(0,o).trim();/^[A-Za-z_][A-Za-z0-9_]*$/.test(s)&&process.env[s]===void 0&&(process.env[s]=Ws(r.slice(o+1)))}}zs();function ve(t,e){return t===void 0?e:["1","true","yes","on"].includes(t.toLowerCase())}function we(t,e){if(!t)return e;let n=Number(t);return Number.isFinite(n)?n:e}function He(){return{memory:{autoCapture:ve(process.env.MEMORY_AUTO_CAPTURE,!0),autoRetrieve:ve(process.env.MEMORY_AUTO_RETRIEVE,!0),autoSummarize:ve(process.env.MEMORY_AUTO_SUMMARIZE,!0),autoSync:ve(process.env.MEMORY_AUTO_SYNC,!0)},retrieval:{maxCandidates:we(process.env.MEMORY_MAX_CANDIDATES,50),rerankTop:we(process.env.MEMORY_RERANK_TOP,10),finalContext:we(process.env.MEMORY_FINAL_CONTEXT,5),tokenBudget:we(process.env.MEMORY_TOKEN_BUDGET,2e3)},storage:{provider:process.env.MEMORY_STORAGE_PROVIDER??"huggingface",r2:{accountId:process.env.R2_ACCOUNT_ID,bucket:process.env.R2_BUCKET,accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY},s3:{endpoint:process.env.S3_ENDPOINT,region:process.env.S3_REGION,bucket:process.env.S3_BUCKET,accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY,forcePathStyle:ve(process.env.S3_FORCE_PATH_STYLE,!1)},huggingface:{namespace:process.env.HF_NAMESPACE,bucket:process.env.HF_BUCKET,accessKeyId:process.env.HF_S3_ACCESS_KEY_ID,secretAccessKey:process.env.HF_S3_SECRET_ACCESS_KEY},localRoot:process.env.MEMORY_LOCAL_STORAGE_PATH},cache:{maxMb:we(process.env.MEMORY_LOCAL_CACHE_MB,200)}}}import{createHash as Us}from"node:crypto";import{existsSync as Ye,mkdirSync as Ys,readFileSync as Xs,renameSync as Qs,writeFileSync as Zs}from"node:fs";import{basename as ei,dirname as Xe,join as xe,parse as Ln,resolve as Q}from"node:path";import{createHash as Tn}from"node:crypto";import{spawnSync as qs}from"node:child_process";var be="git-remote-v1",Bs=new Set(["github.com","gitlab.com","bitbucket.org"]);function Rn(t,e){let n=e.replaceAll("\\","/").replace(/^\/+/u,"").replace(/\/+$/u,"").replace(/\.git$/iu,"").replace(/\/+/gu,"/");return!n||n==="."||n===".."||n.split("/").some(r=>!r||r==="."||r==="..")?null:(Bs.has(t)&&(n=n.toLowerCase()),n)}function Vs(t){let e;try{e=new URL(t)}catch{return null}if(!["https:","http:","ssh:","git:"].includes(e.protocol))return null;let n=e.hostname.trim().toLowerCase();if(!n)return null;let r=e.protocol==="https:"&&e.port==="443"||e.protocol==="http:"&&e.port==="80"||e.protocol==="ssh:"&&e.port==="22",o=e.port&&!r?`${n}:${e.port}`:n,s=Rn(n,e.pathname);return s?`${o}/${s}`:null}function Js(t){let e=t.match(/^(?:[^@\s/:]+@)?([^:/\s]+):(.+)$/u);if(!e)return null;let n=e[1]?.trim().toLowerCase();if(!n||n.length===1)return null;let r=Rn(n,e[2]??"");return r?`${n}/${r}`:null}function Pn(t){let e=t.trim();return e?e.includes("://")?Vs(e):Js(e):null}function Hs(t){return Tn("sha256").update(`${be}:${t}`).digest("hex")}function Nn(t){return Tn("sha256").update(`toolnet-project:${be}:${t}`).digest("hex").slice(0,16)}function Gs(t){return t.split("/").filter(Boolean).at(-1)?.trim()||null}function Bt(t,e){let n=qs("git",["-C",t,...e],{encoding:"utf8",windowsHide:!0,stdio:["ignore","pipe","ignore"]});return n.error||n.status!==0?null:n.stdout?.trim()||null}function On(t,e){let n=Gs(t);return n?{scheme:be,canonicalRemote:t,fingerprint:Hs(t),repositoryName:n,source:e}:null}function _n(t){let e=Bt(t,["remote","get-url","origin"]);if(e){let o=Pn(e);if(o)return On(o,"origin")}let n=Bt(t,["remote"]);if(!n)return null;let r=new Set;for(let o of n.split(/\r?\n/u).map(s=>s.trim()).filter(Boolean)){let s=Bt(t,["remote","get-url",o]);if(!s)continue;let i=Pn(s);i&&r.add(i)}return r.size!==1?null:On([...r][0],"unique-remote")}var Kn=".toolnet",ti="project.json";function ni(t){return Us("sha256").update(t).digest("hex").slice(0,16)}function ce(t){return xe(t,Kn,ti)}function Fn(t){return Ye(ce(t))}function $n(t,e){let n=Q(t),r=Ln(n).root;for(;;){if(Fn(n))return n;if(n===r||e&&n===Q(e))break;let o=Xe(n);if(o===n)break;n=o}return null}function Vt(t){let e=Q(t),n=Ln(e).root,r=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"];for(;;){if(r.some(s=>Ye(xe(e,s))))return e;if(e===n)break;let o=Xe(e);if(o===e)break;e=o}return Q(t)}function Ge(t){let e;try{e=JSON.parse(Xs(t,"utf8"))}catch(o){throw new Error(`Invalid ToolNet project manifest: ${t}: ${o instanceof Error?o.message:String(o)}`)}if(!e||typeof e!="object")throw new Error(`Invalid ToolNet project manifest: ${t}`);let n=e;if(typeof n.id!="string"||!n.id.trim())throw new Error(`ToolNet project manifest is missing id: ${t}`);if(typeof n.name!="string"||!n.name.trim())throw new Error(`ToolNet project manifest is missing name: ${t}`);let r=new Date().toISOString();return{version:1,id:n.id,name:n.name,remote:typeof n.remote=="string"&&n.remote.trim()?n.remote:n.name,rootPath:typeof n.rootPath=="string"?n.rootPath:Xe(Xe(t)),createdAt:typeof n.createdAt=="string"?n.createdAt:r,updatedAt:typeof n.updatedAt=="string"?n.updatedAt:r,graphVersion:typeof n.graphVersion=="number"?n.graphVersion:0,memoryVersion:typeof n.memoryVersion=="number"?n.memoryVersion:0,metadata:n.metadata&&typeof n.metadata=="object"?n.metadata:void 0}}function Ue(t,e){let n=xe(t,Kn);Ys(n,{recursive:!0});let r=ce(t),o=`${r}.tmp-${process.pid}`;Zs(o,JSON.stringify(e,null,2)+`
`,{encoding:"utf8",mode:384}),Qs(o,r)}function X(t,e){return{id:t.id,name:t.name,remote:t.remote,rootPath:e,createdAt:t.createdAt,updatedAt:t.updatedAt,graphVersion:t.graphVersion,memoryVersion:t.memoryVersion,metadata:t.metadata}}function Jt(t){return{version:1,scheme:be,canonicalRemote:t.canonicalRemote,fingerprint:t.fingerprint,repositoryName:t.repositoryName}}function ri(t){let e=t.metadata?.toolnetIdentity;if(!e||typeof e!="object"||Array.isArray(e))return null;let n=e;return typeof n.fingerprint=="string"?n.fingerprint:null}var Qe=class{adopt(e,n){let r=Vt(Q(e));if(!n.id.trim())throw new Error("PROJECT_ADOPTION_INVALID_ID");if(!n.name.trim())throw new Error("PROJECT_ADOPTION_INVALID_NAME");if(!n.remote.trim())throw new Error("PROJECT_ADOPTION_INVALID_REMOTE");if(Fn(r)){let a=Ge(ce(r));if(a.id!==n.id)throw new Error(["PROJECT_IDENTITY_ALREADY_EXISTS",`existing=${a.id}`,`requested=${n.id}`].join(" "));return X(a,r)}let o=new Date().toISOString(),s={...n.metadata};n.gitIdentity&&(s.toolnetIdentity=Jt(n.gitIdentity));let i={version:1,id:n.id.trim(),name:n.name.trim(),remote:n.remote.trim(),rootPath:r,createdAt:n.createdAt??o,updatedAt:o,graphVersion:n.graphVersion??0,memoryVersion:n.memoryVersion??0,metadata:Object.keys(s).length?s:void 0};return Ue(r,i),X(i,r)}recordGitIdentity(e,n,r={}){let o=this.requireExisting(e),s=ce(o.rootPath),i=Ge(s),a=ri(i);if(a&&a!==n.fingerprint&&!r.allowRebind)throw new Error(["PROJECT_GIT_REMOTE_CHANGED",`existing=${a}`,`current=${n.fingerprint}`,"Use explicit rebind only when this repository identity change is intentional."].join(" "));let c=i.metadata?.toolnetIdentity;return c&&typeof c=="object"&&!Array.isArray(c)&&c.fingerprint===n.fingerprint||(i.metadata={...i.metadata,toolnetIdentity:Jt(n)},i.updatedAt=new Date().toISOString(),Ue(o.rootPath,i)),X(i,o.rootPath)}findExisting(e=process.cwd()){let n=Q(e),r=Vt(n),s=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(c=>Ye(xe(r,c))),i=$n(n,s?r:void 0);if(!i)return null;let a=Ge(ce(i));return X(a,i)}requireExisting(e=process.cwd()){let n=this.findExisting(e);if(!n)throw new Error("PROJECT_NOT_INITIALIZED");return n}detect(e=process.cwd()){let n=Q(e),r=Vt(n),s=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(l=>Ye(xe(r,l))),i=$n(n,s?r:void 0);if(i){let l=ce(i),f=Ge(l);return f.rootPath!==i&&(f.rootPath=i,f.updatedAt=new Date().toISOString(),Ue(i,f)),X(f,i)}let a=new Date().toISOString(),c=ei(r),u=_n(r),p={version:1,id:u?Nn(u.canonicalRemote):ni(r),name:c,remote:u?.repositoryName??c,rootPath:r,createdAt:a,updatedAt:a,graphVersion:0,memoryVersion:0,metadata:u?{toolnetIdentity:Jt(u)}:void 0};return Ue(r,p),X(p,r)}};var oi=[{type:"openai_key",regex:/\bsk-[A-Za-z0-9_-]{20,}\b/g,confidence:"exact"},{type:"huggingface_token",regex:/\bhf_[A-Za-z0-9]{20,}\b/g,confidence:"exact"},{type:"hf_s3_access_key",regex:/\bHFAK[A-Za-z0-9]{8,}\b/g,confidence:"exact"},{type:"aws_access_key",regex:/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,confidence:"exact"},{type:"github_token",regex:/\b(?:gh[pousr]_[A-Za-z0-9]{30,255}|github_pat_[A-Za-z0-9_]{40,255})\b/g,confidence:"exact"},{type:"stripe_secret_key",regex:/\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g,confidence:"exact"},{type:"google_api_key",regex:/\bAIza[A-Za-z0-9_-]{30,}\b/g,confidence:"exact"},{type:"slack_token",regex:/\bxox[baprs]-[A-Za-z0-9-]{16,}\b/g,confidence:"exact"},{type:"npm_token",regex:/\bnpm_[A-Za-z0-9]{20,}\b/g,confidence:"exact"},{type:"bearer_token",regex:/\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/gi,confidence:"high"},{type:"jwt",regex:/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,confidence:"exact"},{type:"private_key",regex:/-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,confidence:"exact"},{type:"password_assignment",regex:/\b(?:password|passwd|pwd)\s*[:=]\s*["']?[^"' \t\r\n]{6,}["']?/gi,confidence:"high"},{type:"secret_assignment",regex:/\b(?:secret|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key)\s*[:=]\s*["']?[^"' \t\r\n]{8,}["']?/gi,confidence:"high"},{type:"cookie",regex:/\b(?:cookie|set-cookie)\s*[:=]\s*[^;\n]{8,}/gi,confidence:"high"},{type:"url_credentials",regex:/\bhttps?:\/\/[^:/@\s]+:[^/@\s]{4,}@[^/\s]+/gi,confidence:"high"}],si=new Set(["example","example-key","example-token","changeme","change-me","password","secret","your-api-key","your-token","<token>","<secret>","<password>","[redacted]"]);function Dn(t){return t.normalize("NFKC").trim().toLowerCase()}function ii(t){if(t.length===0)return 0;let e=new Map;for(let r of t)e.set(r,(e.get(r)??0)+1);let n=0;for(let r of e.values()){let o=r/t.length;n-=o*Math.log2(o)}return n}function ai(t){return/^[a-f0-9]{32}$/iu.test(t)||/^[a-f0-9]{40}$/iu.test(t)||/^[a-f0-9]{64}$/iu.test(t)}function ci(t,e,n){let r=t.slice(Math.max(0,e-48),e),o=t.slice(n,Math.min(t.length,n+16));return/\b(?:token|secret|key|credential|authorization|password|passwd|apikey|api_key|access[_-]?key)\b/iu.test(`${r} ${o}`)}function ui(t,e){return t.start<e.end&&e.start<t.end}function Wn(t){return t.sort((e,n)=>e.start!==n.start?e.start-n.start:n.end-n.start-(e.end-e.start))}var Ze=class{allowValues=new Set;enableEntropyHeuristic;constructor(e={}){for(let n of e.allowValues??[]){let r=Dn(n);r&&this.allowValues.add(r)}this.enableEntropyHeuristic=e.enableEntropyHeuristic??!0}scan(e){let n=[];for(let s of oi){let i=new RegExp(s.regex.source,s.regex.flags);for(let a of e.matchAll(i))a.index===void 0||!a[0]||this.allowed(a[0])||n.push({type:s.type,value:a[0],start:a.index,end:a.index+a[0].length,confidence:s.confidence})}this.enableEntropyHeuristic&&n.push(...this.entropyMatches(e));let r=Wn(n),o=[];for(let s of r)o.some(i=>ui(i,s))||o.push(s);return Wn(o)}hasSecrets(e){return this.scan(e).length>0}allowed(e){let n=Dn(e);return si.has(n)?!0:this.allowValues.has(n)}entropyMatches(e){let n=[],r=/[A-Za-z0-9_+/=-]{32,160}/g;for(let o of e.matchAll(r)){if(o.index===void 0||!o[0])continue;let s=o[0];this.allowed(s)||ai(s)||!/[A-Za-z]/u.test(s)||!/[0-9]/u.test(s)||ci(e,o.index,o.index+s.length)&&(ii(s)<3.7||n.push({type:"high_entropy_secret",value:s,start:o.index,end:o.index+s.length,confidence:"heuristic"}))}return n}};var J=class{scanner;constructor(e={}){this.scanner=new Ze(e)}sanitize(e){let n=this.scanner.scan(e);if(n.length===0)return{text:e,redacted:0,secretTypes:[]};let r=e,o=[...n].sort((i,a)=>a.start-i.start),s=new Set;for(let i of o)s.add(i.type),r=r.slice(0,i.start)+`[REDACTED:${i.type}]`+r.slice(i.end);return{text:r,redacted:n.length,secretTypes:[...s].sort()}}sanitizeValue(e){if(typeof e=="string")return this.sanitize(e).text;if(Array.isArray(e))return e.map(n=>this.sanitizeValue(n));if(e&&typeof e=="object"){let n={};for(let[r,o]of Object.entries(e)){let s=r.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g,"");if(s.includes("password")||s.includes("passwd")||s==="pwd"||s.includes("secret")||s.includes("token")||s.includes("cookie")||s.includes("authorization")||s.includes("apikey")||s.includes("accesskey")||s.includes("privatekey")||s.includes("clientsecret")||s.includes("credential")){n[r]="[REDACTED]";continue}n[r]=this.sanitizeValue(o)}return n}return e}};var li=new J;function Ce(t){return li.sanitizeValue(t)}import{homedir as Ri}from"node:os";import{join as Ni}from"node:path";import{DeleteObjectCommand as di,GetObjectCommand as pi,HeadObjectCommand as fi,ListObjectsV2Command as mi,PutObjectCommand as gi,S3Client as yi}from"@aws-sdk/client-s3";import{getSignedUrl as hi}from"@aws-sdk/s3-request-presigner";var et=class{name="huggingface";client;bucket;constructor(e){this.bucket=e.bucket,this.client=new yi({region:"us-east-1",endpoint:`https://s3.hf.co/${e.namespace}`,forcePathStyle:!0,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:e.accessKeyId,secretAccessKey:e.secretAccessKey}})}async put(e,n,r="application/octet-stream"){let o=typeof n=="string"?Buffer.from(n,"utf8"):n;await this.client.send(new gi({Bucket:this.bucket,Key:e,Body:o,ContentType:r}))}async get(e){let n=await hi(this.client,new pi({Bucket:this.bucket,Key:e}),{expiresIn:60}),r=await fetch(n,{redirect:"follow"});if(r.status===404)return null;if(!r.ok)throw new Error(`HF download failed: ${r.status} ${r.statusText}`);return new Uint8Array(await r.arrayBuffer())}async getText(e){let n=await this.get(e);return n?Buffer.from(n).toString("utf8"):null}async exists(e){try{return await this.client.send(new fi({Bucket:this.bucket,Key:e})),!0}catch(n){if(typeof n=="object"&&n!==null&&"$metadata"in n&&n.$metadata?.httpStatusCode===404)return!1;throw n}}async delete(e){await this.client.send(new di({Bucket:this.bucket,Key:e}))}async list(e=""){let n=[],r;do{let o=await this.client.send(new mi({Bucket:this.bucket,Prefix:e||void 0,ContinuationToken:r}));for(let s of o.Contents??[])s.Key&&n.push({key:s.Key,size:s.Size,updatedAt:s.LastModified?.toISOString()});r=o.IsTruncated?o.NextContinuationToken:void 0}while(r);return n}};import{access as zn,mkdir as Si,readFile as ki,readdir as vi,rm as wi,stat as qn,writeFile as bi}from"node:fs/promises";import{dirname as xi,join as Ci,relative as Bn,resolve as ji}from"node:path";var je=class{constructor(e){this.root=e}root;name="local";path(e){let n=e.replace(/^\/+/,"");return ji(this.root,n)}async put(e,n){let r=this.path(e);await Si(xi(r),{recursive:!0}),await bi(r,n)}async get(e){try{return await ki(this.path(e))}catch(n){if(typeof n=="object"&&n!==null&&"code"in n&&n.code==="ENOENT")return null;throw n}}async getText(e){let n=await this.get(e);return n?Buffer.from(n).toString("utf8"):null}async exists(e){try{return await zn(this.path(e)),!0}catch{return!1}}async delete(e){await wi(this.path(e),{force:!0})}async list(e=""){let n=this.path(e),r=[];try{await zn(n)}catch{return r}let o=async i=>{let a=await vi(i,{withFileTypes:!0});for(let c of a){let u=Ci(i,c.name);if(c.isDirectory()){await o(u);continue}let p=await qn(u);r.push({key:Bn(this.root,u),size:p.size,updatedAt:p.mtime.toISOString()})}},s=await qn(n);return s.isDirectory()?await o(n):r.push({key:Bn(this.root,n),size:s.size,updatedAt:s.mtime.toISOString()}),r}};import{DeleteObjectCommand as Ii,GetObjectCommand as Mi,HeadObjectCommand as Ai,ListObjectsV2Command as Ei,PutObjectCommand as Pi,S3Client as Oi}from"@aws-sdk/client-s3";import{getSignedUrl as Ti}from"@aws-sdk/s3-request-presigner";var Ie=class{name;client;bucket;constructor(e){this.name=e.name??"s3",this.bucket=e.bucket,this.client=new Oi({region:e.region??"us-east-1",endpoint:e.endpoint||void 0,forcePathStyle:e.forcePathStyle??!1,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:e.accessKeyId,secretAccessKey:e.secretAccessKey}})}async put(e,n,r="application/octet-stream"){let o=typeof n=="string"?Buffer.from(n,"utf8"):n;await this.client.send(new Pi({Bucket:this.bucket,Key:e,Body:o,ContentType:r}))}async get(e){let n=await Ti(this.client,new Mi({Bucket:this.bucket,Key:e}),{expiresIn:60}),r=await fetch(n,{redirect:"follow"});if(r.status===404)return null;if(!r.ok)throw new Error(`${this.name} download failed: ${r.status} ${r.statusText}`);return new Uint8Array(await r.arrayBuffer())}async getText(e){let n=await this.get(e);return n?Buffer.from(n).toString("utf8"):null}async exists(e){try{return await this.client.send(new Ai({Bucket:this.bucket,Key:e})),!0}catch(n){if(typeof n=="object"&&n!==null&&"$metadata"in n&&n.$metadata?.httpStatusCode===404)return!1;throw n}}async delete(e){await this.client.send(new Ii({Bucket:this.bucket,Key:e}))}async list(e=""){let n=[],r;do{let o=await this.client.send(new Ei({Bucket:this.bucket,Prefix:e||void 0,ContinuationToken:r}));for(let s of o.Contents??[])s.Key&&n.push({key:s.Key,size:s.Size,updatedAt:s.LastModified?.toISOString()});r=o.IsTruncated?o.NextContinuationToken:void 0}while(r);return n}};function Ht(t,e){return console.warn(e),new je(t)}function Vn(t){let e=t.localRoot??Ni(Ri(),".toolnet-memory","storage");if(t.provider==="r2"){let n=t.r2;return n?.accountId&&n.bucket&&n.accessKeyId&&n.secretAccessKey?new Ie({name:"r2",endpoint:`https://${n.accountId}.r2.cloudflarestorage.com`,region:"auto",bucket:n.bucket,forcePathStyle:!0,accessKeyId:n.accessKeyId,secretAccessKey:n.secretAccessKey}):Ht(e,"[storage] Cloudflare R2 credentials missing. Using local fallback.")}if(t.provider==="s3"){let n=t.s3;return n?.bucket&&n.accessKeyId&&n.secretAccessKey?new Ie({name:"s3",endpoint:n.endpoint,region:n.region??"us-east-1",bucket:n.bucket,forcePathStyle:n.forcePathStyle??!1,accessKeyId:n.accessKeyId,secretAccessKey:n.secretAccessKey}):Ht(e,"[storage] S3 credentials missing. Using local fallback.")}if(t.provider==="huggingface"){let n=t.huggingface;return n?.namespace&&n.bucket&&n.accessKeyId&&n.secretAccessKey?new et({namespace:n.namespace,bucket:n.bucket,accessKeyId:n.accessKeyId,secretAccessKey:n.secretAccessKey}):Ht(e,"[storage] Hugging Face credentials missing. Using local fallback.")}return new je(e)}function _i(t){return new Promise(e=>setTimeout(e,t))}async function Jn(t,e={}){let n=Math.max(1,e.attempts??3),r=e.baseDelayMs??150,o=e.maxDelayMs??2e3,s;for(let i=1;i<=n;i++)try{return await t()}catch(a){if(s=a,i>=n)break;let c=Math.min(o,r*2**(i-1)),u=Math.floor(Math.random()*Math.max(1,c*.2));await _i(c+u)}throw s}var $i=new Set(["put","get","getText","delete","list"]);function Hn(t,e={}){return new Proxy(t,{get(n,r){let o=Reflect.get(n,r,n);return typeof o!="function"?o:$i.has(r)?(...s)=>Jn(()=>Promise.resolve(o.apply(n,s)),e):o.bind(n)}})}function Gn(t){let e=t.trim().replace(/\s+/g,"_").replace(/[^A-Za-z0-9._-]/g,"_").replace(/_+/g,"_").replace(/^\.+|\.+$/g,"").slice(0,100);if(!e||e==="."||e==="..")throw new Error("Invalid project storage folder");return e}function Un(t){let e=t.replace(/^\/+/,"");if(e.startsWith("memories/"))return"memory/records/"+e.slice(9);if(e.startsWith("vectors/"))return"memory/vectors/"+e.slice(8);if(e.startsWith("graph/"))return"code/graph/"+e.slice(6);let n=e.match(/^(snapshots\/[^/]+\/)memories\/(.+)$/);if(n)return`${n[1]}memory/records/${n[2]}`;if(n=e.match(/^(snapshots\/[^/]+\/)vectors\/(.+)$/),n)return`${n[1]}memory/vectors/${n[2]}`;if(n=e.match(/^(snapshots\/[^/]+\/)graph\/(.+)$/),n)return`${n[1]}code/graph/${n[2]}`;let r=e.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)memories\/(.+)$/);if(r)return`${r[1]}memory/records/${r[2]}`;if(r=e.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)vectors\/(.+)$/),r)return`${r[1]}memory/vectors/${r[2]}`;if(r=e.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)graph\/(.+)$/),r)return`${r[1]}code/graph/${r[2]}`;let o=e.match(/^(projects\/[^/]+\/)memories\/(.+)$/);return o?`${o[1]}memory/records/${o[2]}`:(o=e.match(/^(projects\/[^/]+\/)vectors\/(.+)$/),o?`${o[1]}memory/vectors/${o[2]}`:(o=e.match(/^(projects\/[^/]+\/)graph\/(.+)$/),o?`${o[1]}code/graph/${o[2]}`:e))}var tt=class{constructor(e,n,r,o){this.provider=e;this.name=e.name,this.projectId=n,this.projectName=r,this.folder=Gn(o??r),this.sourcePrefix=`projects/${n}`,this.targetPrefix=`projects/${this.folder}`}provider;name;folder;sourcePrefix;targetPrefix;projectId;projectName;registryPromise;async registerProject(){let e=`${this.targetPrefix}/project.json`,n=new Date().toISOString(),r=n,o=await this.provider.getText(e);if(o){let i;try{i=JSON.parse(o)}catch(a){throw new Error(`Invalid remote ToolNet project manifest at ${e}: ${a instanceof Error?a.message:String(a)}`)}if(typeof i.id=="string"&&i.id!==this.projectId)throw new Error(["ToolNet remote project namespace collision.",`Remote folder: ${this.targetPrefix}`,`Existing project id: ${i.id}`,`Current project id: ${this.projectId}`,"Refusing to mix data from two projects."].join(" "));typeof i.createdAt=="string"&&(r=i.createdAt)}let s={version:1,id:this.projectId,name:this.projectName,remote:this.folder,createdAt:r,updatedAt:n};await this.provider.put(e,JSON.stringify(s,null,2)+`
`,"application/json")}async ensureRegistered(){return this.registryPromise||(this.registryPromise=this.registerProject()),this.registryPromise}key(e){if(e=Un(e),e===this.sourcePrefix)return this.targetPrefix;if(e.startsWith(`${this.sourcePrefix}/`))return this.targetPrefix+e.slice(this.sourcePrefix.length);if(e===this.targetPrefix||e.startsWith(`${this.targetPrefix}/`))return e;if(e.startsWith("projects/"))throw new Error(["Cross-project storage access denied.",`Current project: ${this.targetPrefix}`,`Requested key: ${e}`].join(" "));return e}async put(e,n,r){return await this.ensureRegistered(),this.provider.put(this.key(e),n,r)}async get(e){return await this.ensureRegistered(),this.provider.get(this.key(e))}async getText(e){return await this.ensureRegistered(),this.provider.getText(this.key(e))}async delete(e){return await this.ensureRegistered(),this.provider.delete(this.key(e))}async exists(e){return await this.ensureRegistered(),this.provider.exists(this.key(e))}async list(e){return await this.ensureRegistered(),this.provider.list(this.key(e))}};import{existsSync as Sd}from"node:fs";import{execFileSync as kd}from"node:child_process";import{homedir as vd}from"node:os";import{isAbsolute as wd,join as ds,relative as bd,resolve as ps}from"node:path";import{DatabaseSync as xd}from"node:sqlite";import{join as qi}from"node:path";import{createHash as Li}from"node:crypto";import{dirname as Ki}from"node:path";import{mkdirSync as Fi,readFileSync as Di,renameSync as Wi,writeFileSync as zi}from"node:fs";function w(t){return Li("sha256").update(t).digest("hex")}function Gt(t){if(Array.isArray(t))return t.map(Gt);if(t&&typeof t=="object"){let e=t,n={};for(let r of Object.keys(e).sort())n[r]=Gt(e[r]);return n}return t}function Yn(t){return JSON.stringify(Gt(t))}function Xn(t){try{return JSON.parse(Di(t,"utf8"))}catch{return null}}function N(t,e){Fi(Ki(t),{recursive:!0});let n=`${t}.${process.pid}.tmp`;zi(n,JSON.stringify(e,null,2)+`
`,{encoding:"utf8",mode:384}),Wi(n,t)}function Qn(t,e){let n=t.trim(),r=n.replace(/\s+/g,"_").replace(/[^A-Za-z0-9._-]/g,"_").replace(/_+/g,"_").replace(/^\.+|\.+$/g,""),o=w(n).slice(0,12);if(!r||r==="."||r==="..")return`${e}--${o}`;let s=r.slice(0,100);return s===n&&n.length<=100?s:`${s.slice(0,85)}--${o}`}function Zn(t,e,n){let r=e.trim(),o=n.trim();if(!r)throw new Error("Session agent is required");if(!o)throw new Error("Native session ID is required");let s=Qn(r.toLowerCase(),"agent"),i=Qn(o,"session");return{projectId:t.id,projectName:t.name,projectRoot:t.rootPath,agent:r,nativeSessionId:o,sessionKey:`${r}:${o}`,remotePrefix:["projects",t.id,"runtime","sources",s,i].join("/"),localDirectory:qi(t.rootPath,".toolnet","runtime","sources",s,i)}}function er(t){return String(t).padStart(12,"0")}var nt=class{constructor(e,n=100,r=512*1024){this.storage=e;this.maxEventsPerChunk=n;this.maxChunkBytes=r;if(n<1)throw new Error("maxEventsPerChunk must be positive");if(r<1024)throw new Error("maxChunkBytes is too small")}storage;maxEventsPerChunk;maxChunkBytes;async getJson(e){let n=await this.storage.getText(e);return n?JSON.parse(n):null}async putJson(e,n){await this.storage.put(e,JSON.stringify(n,null,2)+`
`,"application/json")}async scan(e){let n=`${e.remotePrefix}/events/`,r=await this.storage.list(n),o=[],s=0;for(let i of r){let a=i.key.match(/\/events\/(\d+)-(\d+)-[a-f0-9]+\.jsonl$/);if(!a)continue;let c=Number(a[1]),u=Number(a[2]);!Number.isFinite(c)||!Number.isFinite(u)||(o.push({key:i.key,start:c,end:u}),s=Math.max(s,u))}return o.sort((i,a)=>i.start-a.start),{chunks:o,maxSequence:s}}split(e){let n=[],r=[],o=0;for(let s of e){let i=Buffer.byteLength(JSON.stringify(s)+`
`,"utf8");r.length>0&&(r.length>=this.maxEventsPerChunk||o+i>this.maxChunkBytes)&&(n.push(r),r=[],o=0),r.push(s),o+=i}return r.length>0&&n.push(r),n}async loadManifest(e){return this.getJson(`${e.remotePrefix}/session.json`)}async loadCursor(e){return this.getJson(`${e.remotePrefix}/cursor.json`)}async recover(e){let n=await this.scan(e);return{maxSequence:n.maxSequence,chunkCount:n.chunks.length}}async append(e,n,r,o={}){let s=await this.loadManifest(e),i=await this.scan(e),a=n.filter(y=>y.sequence>i.maxSequence),c=0;for(let y of this.split(a)){let g=y[0],k=y[y.length-1],b=y.map(R=>JSON.stringify(R)).join(`
`)+`
`,T=w(b).slice(0,16),P=[e.remotePrefix,"events",`${er(g.sequence)}-${er(k.sequence)}-${T}.jsonl`].join("/");await this.storage.exists(P)||await this.storage.put(P,b,"application/x-ndjson"),c+=y.length}let u=await this.scan(e),p=n[n.length-1],l=s?.status??"active";p?.type==="session_end"||p?.type==="session_idle"?l="idle":p?.type==="error"?l="error":n.length>0&&(l="active");let f=new Date().toISOString(),d=n[0],m={version:1,projectId:e.projectId,projectName:e.projectName,agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,status:l,createdAt:s?.createdAt??d?.timestamp??f,updatedAt:p?.timestamp??f,firstEventAt:s?.firstEventAt??d?.timestamp,lastEventAt:p?.timestamp??s?.lastEventAt,eventCount:u.maxSequence,chunkCount:u.chunks.length,metadata:{...s?.metadata,...o.metadata}};(o.title??s?.title)&&(m.title=o.title??s?.title);let S={version:1,projectId:e.projectId,agent:e.agent,nativeSessionId:e.nativeSessionId,lastLocalSequence:n.length>0?n[n.length-1].sequence:u.maxSequence,lastRemoteSequence:u.maxSequence,sourceCursors:r,updatedAt:f};return await this.putJson(`${e.remotePrefix}/cursor.json`,S),await this.putJson(`${e.remotePrefix}/session.json`,m),{uploadedEvents:c,lastRemoteSequence:u.maxSequence,eventCount:m.eventCount,chunkCount:m.chunkCount,status:l}}};import{closeSync as Ee,existsSync as at,fsyncSync as nn,mkdirSync as ia,openSync as Pe,readFileSync as gr,readSync as aa,rmSync as pr,statSync as en,truncateSync as ca,writeSync as ua}from"node:fs";import{join as tn}from"node:path";var Bi=new Set(["thinking","reasoning","reasoningcontent","chainofthought","cot","analysistext","internalreasoning","modelthinking"]),Vi=new Set(["reasoning","thinking","chain_of_thought","chain-of-thought","internal_reasoning","internal-reasoning"]);function Ji(t){return t.toLowerCase().replace(/[^a-z0-9]+/gu,"")}function Hi(t){for(let e of["type","kind"]){let n=t[e];if(typeof n=="string"){let r=n.toLowerCase();if(Vi.has(r))return n}}return null}function Ut(t,e=0){if(e>12)return"[ToolNet nested value omitted]";if(Array.isArray(t))return t.map(s=>Ut(s,e+1));if(!t||typeof t!="object")return t;let n=t,r=Hi(n);if(r)return{type:r,omitted:"[private reasoning omitted]"};let o={};for(let[s,i]of Object.entries(n))Bi.has(Ji(s))||(o[s]=Ut(i,e+1));return o}function Gi(t){if(!t)return new Date().toISOString();let e=new Date(t);return Number.isNaN(e.getTime())?new Date().toISOString():e.toISOString()}function Z(t){return t?.trim()||void 0}function tr(t,e={}){let n={...t.provenance??{}},r=Z(t.source)??Z(e.source)??Z(n.source);return{...t,timestamp:Gi(t.timestamp),source:r,turnId:Z(t.turnId)??Z(e.turnId),cwd:Z(t.cwd)??Z(e.cwd),data:Ut(t.data??{}),provenance:n}}import{randomUUID as Yt}from"node:crypto";import{closeSync as ue,existsSync as le,fsyncSync as Me,mkdirSync as Xt,openSync as Ae,readFileSync as Qt,readdirSync as Ui,renameSync as Yi,rmSync as rt,statSync as Xi,writeSync as ot}from"node:fs";import{join as H}from"node:path";var Qi=12e4,Zi=80,ea="reconcile-required";function ta(t){t<=0||Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,t)}function de(t){return H(t,".toolnet","journal")}function or(t){return H(de(t),"events.jsonl")}function st(t){return H(de(t),ea)}function na(t){if(!Number.isInteger(t)||t<=0)return!1;try{return process.kill(t,0),!0}catch(e){return e?.code!=="ESRCH"}}function sr(t){if(!le(t))return null;try{let e=JSON.parse(Qt(t,"utf8"));return e.version!==1||typeof e.token!="string"||typeof e.pid!="number"||typeof e.acquiredAt!="string"?null:{version:1,token:e.token,pid:e.pid,acquiredAt:e.acquiredAt}}catch{return null}}function ra(t){if(!le(t))return!1;let e=0;try{e=Date.now()-Xi(t).mtimeMs}catch{return!1}if(e<=Qi)return!1;let n=sr(t);return n?!na(n.pid):!0}function oa(t){if(!ra(t))return!1;try{return rt(t,{force:!0}),!0}catch{return!1}}function ir(t){for(let e=0;e<Zi;e+=1){let n=Yt();try{let r=Ae(t,"wx",384),o={version:1,token:n,pid:process.pid,acquiredAt:new Date().toISOString()};try{return ot(r,`${JSON.stringify(o)}
`,null,"utf8"),Me(r),{fd:r,token:n}}catch(s){throw ue(r),rt(t,{force:!0}),s}}catch(r){if(r?.code!=="EEXIST")throw r;if(oa(t))continue;ta(25)}}throw new Error(`Shared project journal is locked: ${t}`)}function ar(t,e){ue(e.fd),sr(t)?.token===e.token&&rt(t,{force:!0})}function nr(t){if(!le(t))return[];let e="";try{e=Qt(t,"utf8")}catch{return[]}let n=[];for(let r of e.split(/\r?\n/)){let o=r.trim();if(o)try{let s=JSON.parse(o);if(s.version!==1||typeof s.id!="string"||s.id.length===0||typeof s.projectId!="string"||s.projectId.length===0)continue;n.push(s)}catch{}}return n}function cr(t){if(!le(t))return[];let e=[];for(let n of Ui(t,{withFileTypes:!0})){let r=H(t,n.name);if(n.isDirectory()){e.push(...cr(r));continue}n.isFile()&&n.name==="events.jsonl"&&e.push(r)}return e.sort()}function it(t){let e=null;try{e=Ae(t,"r"),Me(e)}catch{}finally{if(e===null)return;ue(e)}}function rr(t){let e=st(t);if(!le(e))return null;try{return Qt(e,"utf8").trim()||null}catch{return null}}function Zt(t){let e=de(t);Xt(e,{recursive:!0,mode:448});let n=st(t),r=[Yt(),new Date().toISOString()].join("|"),o=Ae(n,"w",384);try{ot(o,`${r}
`,null,"utf8"),Me(o)}finally{ue(o)}it(e)}function sa(t,e,n){let r=H(t,`.events.jsonl.tmp-${process.pid}-${Yt()}`),o=Ae(r,"w",384);try{let s=n.length===0?"":`${n.map(i=>JSON.stringify(i)).join(`
`)}
`;s&&ot(o,s,null,"utf8"),Me(o)}finally{ue(o)}Yi(r,e),it(t)}function ur(t){let e=de(t),n=or(t),r=H(t,".toolnet","runtime","sources"),o=rr(t),s=cr(r),i=[],a=new Set;for(let l of nr(n))a.has(l.id)||(a.add(l.id),i.push(l));let c=i.length,u=[];for(let l of s)for(let f of nr(l))a.has(f.id)||(a.add(f.id),u.push(f));u.sort((l,f)=>{let d=l.timestamp.localeCompare(f.timestamp);return d!==0?d:l.id.localeCompare(f.id)}),i.push(...u),sa(e,n,i);let p=rr(t);return o&&p===o&&(rt(st(t),{force:!0}),it(e)),{filesScanned:s.length,existingEvents:c,recoveredEvents:u.length,totalEvents:i.length}}function lr(t){let e=de(t);Xt(e,{recursive:!0,mode:448});let n=H(e,"journal.lock"),r=ir(n);try{return ur(t)}finally{ar(n,r)}}function dr(t,e){if(e.length===0)return;let n=de(t);Xt(n,{recursive:!0,mode:448});let r=or(t),o=H(n,"journal.lock"),s=ir(o);try{if(le(st(t))){ur(t);return}let i=`${e.map(c=>JSON.stringify(c)).join(`
`)}
`,a=Ae(r,"a",384);try{ot(a,i,null,"utf8"),Me(a)}finally{ue(a)}it(n)}finally{ar(o,s)}}var la=12e4,da=80,fr=2e3;function pa(t){Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,t)}function yr(t,e){let n=Buffer.isBuffer(e)?e:Buffer.from(e,"utf8"),r=0;for(;r<n.length;){let o=ua(t,n,r,n.length-r);if(o<=0)throw new Error("Unable to write session WAL");r+=o}}function rn(t){let e=t.trim();if(!e)return null;try{let n=JSON.parse(e);return n.version!==1||typeof n.id!="string"||!n.id||typeof n.sequence!="number"||!Number.isFinite(n.sequence)||typeof n.projectId!="string"||!n.projectId||typeof n.timestamp!="string"?null:n}catch{return null}}function fa(t){if(!at(t))return[];let e="";try{e=gr(t,"utf8")}catch{return[]}let n=[];for(let r of e.split(/\r?\n/)){let o=rn(r);o&&n.push(o)}return n}function mr(t){return t.type==="session_end"||t.type==="session_idle"?"idle":t.type==="error"?"error":"active"}function ma(t){if(!at(t))return!1;let e;try{e=gr(t)}catch{return!1}if(e.length===0||e[e.length-1]===10)return!1;let n=e.lastIndexOf(10),r=n>=0?n+1:0,o=e.subarray(r).toString("utf8").trim();if(rn(o)){let i=Pe(t,"a");try{yr(i,`
`),nn(i)}finally{Ee(i)}return!0}ca(t,r);let s=Pe(t,"a");try{nn(s)}finally{Ee(s)}return!0}function ga(t,e){if(t.length!==e.length)return!1;for(let n=0;n<t.length;n+=1)if(t[n]!==e[n])return!1;return!0}var ct=class{constructor(e,n={}){this.identity=e;this.eventContext=n;ia(e.localDirectory,{recursive:!0}),this.eventsFile=tn(e.localDirectory,"events.jsonl"),this.stateFile=tn(e.localDirectory,"state.json"),this.lockFile=tn(e.localDirectory,"journal.lock")}identity;eventContext;eventsFile;stateFile;lockFile;initialState(){let e=new Date().toISOString();return{version:1,projectId:this.identity.projectId,agent:this.identity.agent,nativeSessionId:this.identity.nativeSessionId,status:"idle",createdAt:e,updatedAt:e,lastSequence:0,lastRemoteSequence:0,remoteByteOffset:0,sourceCursors:{},recentEventIds:[]}}loadStateUnsafe(){return Xn(this.stateFile)??this.initialState()}recoverStateUnsafe(){ma(this.eventsFile);let e=this.loadStateUnsafe(),n=fa(this.eventsFile);if(n.length===0)return e;let r=n[0];for(let l of n)l.sequence<=r.sequence||(r=l);let o=n.slice(-fr).map(l=>l.id),s=at(this.eventsFile)?en(this.eventsFile).size:0,i=Math.max(e.lastSequence,r.sequence),a=Math.min(e.remoteByteOffset,s),c=r.sequence>e.lastSequence;if(!(c||a!==e.remoteByteOffset||!ga(e.recentEventIds,o)||e.lastLocalEventAt!==r.timestamp))return e;let p={...e,status:mr(r),updatedAt:r.timestamp,lastLocalEventAt:r.timestamp,lastSequence:i,remoteByteOffset:a,recentEventIds:o};if(this.saveStateUnsafe(p),!c)return p;try{Zt(this.identity.projectRoot)}catch{return p}try{lr(this.identity.projectRoot)}catch{}return p}loadState(){return this.withLock(()=>this.recoverStateUnsafe())}saveStateUnsafe(e){N(this.stateFile,e)}acquireLock(){for(let e=0;e<da;e+=1)try{return Pe(this.lockFile,"wx",384)}catch(n){if(n.code!=="EEXIST")throw n;try{if(Date.now()-en(this.lockFile).mtimeMs>la){pr(this.lockFile,{force:!0});continue}}catch{}pa(25)}throw new Error(`Session journal is locked: ${this.lockFile}`)}withLock(e){let n=this.acquireLock();try{return e()}finally{Ee(n),pr(this.lockFile,{force:!0})}}append(e){return e.length===0?[]:this.withLock(()=>{let n=this.recoverStateUnsafe(),r=new Set(n.recentEventIds),o=n.lastSequence,s=[];for(let l of e){let f=tr(l,this.eventContext),d=f.timestamp??new Date().toISOString(),m=f.data??{},S=f.provenance?.rawDigest??w(Yn(m)),y=Ce(m),g=f.sourceEventId?[this.identity.projectId,this.identity.agent,this.identity.nativeSessionId,f.sourceEventId].join("|"):[this.identity.projectId,this.identity.agent,this.identity.nativeSessionId,o+1,f.type,d,S].join("|"),k=w(g).slice(0,32);if(r.has(k))continue;o+=1;let b={version:1,id:k,sequence:o,projectId:this.identity.projectId,agent:this.identity.agent,nativeSessionId:this.identity.nativeSessionId,sessionId:this.identity.nativeSessionId,type:f.type,timestamp:d,source:f.source??f.provenance?.source??this.identity.agent,data:y,provenance:{...f.provenance,rawDigest:S}};f.role!==void 0&&(b.role=f.role),f.turnId!==void 0&&(b.turnId=f.turnId),f.cwd!==void 0&&(b.cwd=f.cwd),f.sourceEventId!==void 0&&(b.sourceEventId=f.sourceEventId),f.sourceSequence!==void 0&&(b.sourceSequence=f.sourceSequence),s.push(b),r.add(k)}if(s.length===0)return[];let i=s.map(l=>JSON.stringify(l)).join(`
`)+`
`,a=Pe(this.eventsFile,"a",384);try{yr(a,i),nn(a)}finally{Ee(a)}try{dr(this.identity.projectRoot,s)}catch{try{Zt(this.identity.projectRoot)}catch{}}let c=s[s.length-1],u=mr(c),p=Array.from(r).slice(-fr);return this.saveStateUnsafe({...n,status:u,updatedAt:c.timestamp,lastLocalEventAt:c.timestamp,lastSequence:c.sequence,recentEventIds:p}),s})}readPending(){return this.withLock(()=>{let e=this.recoverStateUnsafe();if(!at(this.eventsFile))return{events:[],startOffset:e.remoteByteOffset,endOffset:e.remoteByteOffset};let n=en(this.eventsFile).size,r=Math.min(e.remoteByteOffset,n);if(n<=r)return{events:[],startOffset:r,endOffset:n};let o=n-r,s=Buffer.alloc(o),i=Pe(this.eventsFile,"r");try{aa(i,s,0,o,r)}finally{Ee(i)}let a=[];for(let c of s.toString("utf8").split(/\r?\n/)){let u=rn(c);u&&a.push(u)}return{events:a,startOffset:r,endOffset:n}})}markRemote(e,n){this.withLock(()=>{let r=this.recoverStateUnsafe(),o=new Date().toISOString();this.saveStateUnsafe({...r,lastRemoteSequence:Math.max(r.lastRemoteSequence,e),remoteByteOffset:Math.max(r.remoteByteOffset,n),lastRemoteAt:o,updatedAt:o})})}setSourceCursor(e,n){this.withLock(()=>{let r=this.recoverStateUnsafe();this.saveStateUnsafe({...r,sourceCursors:{...r.sourceCursors,[e]:String(n)},updatedAt:new Date().toISOString()})})}};import{closeSync as lu,existsSync as du,openSync as pu,readSync as fu,statSync as mu}from"node:fs";var ya=new Set(["rule","blocker","architecture","deploy"]),ha=new Set(["fix","todo","context","next_action"]);function on(t){return t<0?0:t>1?1:t}function hr(t,e){let n=Number.parseFloat(t??"");return Number.isFinite(n)?n:e}function Sa(t){return t==="off"?"off":t==="balanced"?"balanced":t==="aggressive"?"aggressive":"conservative"}function sn(){return{mode:Sa(process.env.TOOLNET_MEMORY_PROMOTION),minScore:on(hr(process.env.TOOLNET_PROMOTE_MIN_SCORE,.65)),minConfidence:on(hr(process.env.TOOLNET_PROMOTE_MIN_CONFIDENCE,.78))}}function ka(t){switch(t){case"critical":return 1;case"high":return .85;case"normal":return .6;case"temporary":return .25}}function va(t){let e=on(ka(t.importance)*.75+t.confidence*.25);return Math.round(e*1e6)/1e6}function wa(t){return t.evidence?t.evidence:{userExplicit:!1,sourceVerified:!1,testVerified:!1,crossSessionConfirmations:0,assistantDerived:!1}}function ba(t,e=sn()){if(t.importance==="temporary"||t.confidence<e.minConfidence)return"transient";let n=wa(t);return t.kind==="rule"&&n.userExplicit?"permanent":t.kind==="rule"?"session":t.kind==="architecture"&&(n.userExplicit||n.sourceVerified||n.testVerified||n.crossSessionConfirmations>=2)?"permanent":t.kind==="architecture"?"session":t.kind==="decision"||t.kind==="todo"||t.kind==="next_action"||t.kind==="fix"?"task":"session"}function xa(t,e=sn()){if(e.mode==="off")return Number.POSITIVE_INFINITY;let n=0;e.mode==="balanced"&&(n=.1),e.mode==="aggressive"&&(n=.15);let r=Math.max(e.mode==="aggressive"?.5:.55,e.minScore-n);return ya.has(t)&&(r=Math.max(.5,r-.1)),ha.has(t)&&(r=Math.max(.5,r-.05)),r}function an(t,e=sn()){let n=ba(t,e),r=va(t),o=xa(t.kind,e);return n==="transient"?{knowledgeClass:n,score:r,threshold:o,persist:!1}:e.mode==="off"?{knowledgeClass:n,score:r,threshold:o,persist:!1}:{knowledgeClass:n,score:r,threshold:o,persist:r>=o}}function Sr(t,e){let n=e.toLowerCase();return n.includes("kh\xF4ng \u0111\u01B0\u1EE3c")||n.includes("tuy\u1EC7t \u0111\u1ED1i")||n.includes("must not")||n.includes("never ")?"critical":t==="rule"||t==="decision"?"high":t==="todo"||n.includes("error")||n.includes("failed")||n.includes("exception")?"normal":"temporary"}var br=[/không được/iu,/tuyệt đối/iu,/bắt buộc/iu,/đừng\s+/iu,/must not/iu,/do not/iu,/don't/iu,/\bnever\b/iu],Ca=[/từ giờ/iu,/về sau/iu,/mỗi lần/iu,/luôn luôn/iu,/\bluôn\b/iu,/quy tắc/iu,/workflow/iu,/\balways\b/iu,/\brequired\b/iu,/\bmust\b/iu,/from now on/iu],ja=[/\bchốt\b/iu,/quyết định/iu,/sẽ dùng/iu,/chọn .+ thay/iu,/đổi sang/iu,/chuyển sang/iu,/\bdecided\b/iu,/\bchosen\b/iu,/we will use/iu,/use .+ instead/iu,/switch(?:ed)? to/iu],Ia=[/\btodo\b/iu,/cần làm/iu,/cần thêm/iu,/cần sửa/iu,/cần kiểm tra/iu,/tiếp theo/iu,/bước tiếp theo/iu,/còn phải/iu,/còn cần/iu,/next step/iu,/\bneed to\b/iu,/\bremaining\b/iu,/follow[- ]?up/iu],Ma=[/tiếp theo/iu,/bước tiếp theo/iu,/việc tiếp theo/iu,/sau đó cần/iu,/next step/iu,/next action/iu,/follow[- ]?up/iu],Aa=[/đã sửa/iu,/đã fix/iu,/đã khắc phục/iu,/đã xử lý/iu,/hoàn tất/iu,/hoàn thành/iu,/\bfixed\b/iu,/\bresolved\b/iu,/\bimplemented\b/iu,/\bcompleted\b/iu,/\bpasses?\b/iu],kr=[/kiến trúc/iu,/pipeline/iu,/adapter/iu,/schema/iu,/runtime/iu,/namespace/iu,/storage/iu,/lưu trữ/iu,/workflow/iu,/session core/iu,/memory engine/iu,/retrieval/iu],Ea=[/\bdùng\b/iu,/\btách\b/iu,/\bthay\b/iu,/\bchuyển\b/iu,/\blưu\b/iu,/\bmap\b/iu,/\buse\b/iu,/\bsplit\b/iu,/\bstore\b/iu,/\breplace\b/iu,/\bmove\b/iu],Pa=[/đường dẫn/iu,/\bpath\b/iu,/\bport\b/iu,/\bendpoint\b/iu,/\bdomain\b/iu,/\bbucket\b/iu,/\brepository\b/iu,/\brepo\b/iu,/\bbranch\b/iu,/\/[A-Za-z0-9._/-]{4,}/u],Oa=[/\blà\b/iu,/\bở\b/iu,/\bdùng\b/iu,/\bnằm\b/iu,/\bis\b/iu,/\buse\b/iu,/located/iu,/runs on/iu],vr=new Set(["content","text","message","prompt","summary","description","reason","title","last_assistant_message","lastAssistantMessage","input_messages","inputMessages"]),Ta=new Set(["payload","data","content","message","messages","parts","summary"]);function _(t,e){return e.some(n=>n.test(t))}function xr(t){return t.normalize("NFKC").replace(/\r/g,"").replace(/^[\s>*#\-•]+/u,"").replace(/\s+/g," ").trim()}function Ra(t){return xr(t).toLowerCase().replace(/[^\p{L}\p{N}:/._-]+/gu," ").replace(/\s+/g," ").trim()}function Na(t){return!(t.length<12||t.length>1e3||(t.match(new RegExp("\\p{L}","gu"))??[]).length<6||/^(?:https?:\/\/\S+|[A-Za-z0-9+/=]{80,})$/u.test(t))}function cn(t,e,n,r=0){if(!(r>6)&&!(typeof t=="string"&&e&&!vr.has(e))){if(typeof t=="string"){n.push(t);return}if(Array.isArray(t)){for(let o of t.slice(0,50))cn(o,e,n,r+1);return}if(!(!t||typeof t!="object"))for(let[o,s]of Object.entries(t))(vr.has(o)||Ta.has(o))&&cn(s,o,n,r+1)}}function _a(t){let e=[];cn(t.data,void 0,e);let n=[],r=new Set;for(let o of e)for(let s of o.split(/\n+|(?<=[.!?])\s+/u)){let i=xr(s);if(Na(i)&&!r.has(i)&&(r.add(i),n.push(i),n.length>=50))return n}return n}function wr(t){return(t.role??(typeof t.data.role=="string"?t.data.role:"")).toLowerCase()}function $a(t,e,n){if(n.type==="decision")return{kind:"decision",confidence:1};if(n.type==="todo")return{kind:"todo",confidence:1};let r=e==="user"||n.type==="user_prompt",o=e==="assistant"||n.type==="assistant_message";return r&&_(t,br)?{kind:"rule",confidence:.98}:r&&_(t,Ca)?{kind:"rule",confidence:.92}:_(t,ja)?{kind:_(t,kr)?"architecture":"decision",confidence:r?.93:.86}:r&&_(t,Ma)?{kind:"next_action",confidence:.88}:r&&_(t,Ia)?{kind:"todo",confidence:.87}:_(t,kr)&&_(t,Ea)?{kind:"architecture",confidence:r?.88:.82}:o&&_(t,Aa)?{kind:"fix",confidence:.8}:r&&_(t,Pa)&&_(t,Oa)?{kind:"context",confidence:.79}:null}function La(t,e,n){let r=e==="user"||n.type==="user_prompt",o=e==="assistant"||n.type==="assistant_message",s=!!n.provenance.sourcePath&&(t==="architecture"||t==="context"||t==="fix"),i=t==="fix"&&/(?:test|tests|pass|passed|passing)/iu.test(JSON.stringify(n.data));return{userExplicit:r,sourceVerified:s,testVerified:i,crossSessionConfirmations:1,assistantDerived:o}}function Ka(t){switch(t){case"rule":return"rule";case"decision":case"architecture":return"decision";case"todo":case"next_action":return"todo";case"fix":case"context":return"code"}}function Fa(t,e,n){return t==="rule"&&_(n,br)?"critical":t==="architecture"||t==="decision"||t==="rule"?"high":t==="fix"||t==="context"?"normal":Sr(e,n)}function Cr(t,e){let n=[],r=new Set,o=new Map;for(let s of e){let i=typeof s.data.messageId=="string"?s.data.messageId:void 0,a=wr(s);i&&a&&o.set(i,a)}for(let s of e){let i=wr(s),a=typeof s.data.messageId=="string"?s.data.messageId:void 0;!i&&a&&(i=o.get(a)??"");for(let c of _a(s)){let u=$a(c,i,s);if(!u||u.confidence<.75)continue;let p=Ka(u.kind),l=Ra(c),f=w([t.projectId,u.kind,l].join("|"));if(r.has(f))continue;r.add(f);let d=s.provenance.sourcePath?[s.provenance.sourcePath]:[],m=s.sourceEventId?[s.sourceEventId]:[];n.push({version:1,fingerprint:f,projectId:t.projectId,agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,kind:u.kind,type:p,content:c,confidence:u.confidence,importance:Fa(u.kind,p,c),evidence:La(u.kind,i,s),tags:[p],provenance:{agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,eventIds:[s.id],sourceEventIds:m,sourcePaths:d,firstSequence:s.sequence,lastSequence:s.sequence},createdAt:s.timestamp})}}return n}import{createHash as Da}from"node:crypto";var Wa=["project-knowledge","implementation","continuation","session-context"],za={"project-knowledge":"Project knowledge",implementation:"Implementation state",continuation:"Work continuation","session-context":"Session context"};function un(t){return Da("sha256").update(t).digest("hex")}function ut(t,e){return`${t}:${un(e).slice(0,24)}`}function qa(t){try{return un(JSON.stringify(t))}catch{return un(String(t))}}function ee(t){let e=new Set,n=[];for(let r of t){let o=r?.replace(/\s+/gu," ").trim();if(!o)continue;let s=o.normalize("NFKC").toLowerCase();e.has(s)||(e.add(s),n.push(o))}return n}function Ir(t,e=420){let n=t.replace(/\s+/gu," ").trim();return n.length<=e?n:`${n.slice(0,Math.max(0,e-1)).trimEnd()}\u2026`}function Ba(t){return t==="rule"||t==="architecture"?"project-knowledge":t==="decision"||t==="fix"?"implementation":t==="todo"?"continuation":"session-context"}function jr(t){return t.length===0?0:t.reduce((e,n)=>e+n,0)/t.length}function Va(t){return t.slice().sort((e,n)=>n.importanceScore-e.importanceScore||n.confidence-e.confidence||e.id.localeCompare(n.id)).slice(0,5).map(e=>Ir(e.content)).join(" | ")}function Ja(t){return t.slice().sort((e,n)=>n.importanceScore-e.importanceScore||n.confidence-e.confidence||e.id.localeCompare(n.id)).slice(0,6).map(e=>Ir(e.content)).join(`
`)}function Mr(t,e){let n=t.slice().sort((f,d)=>f.sequence-d.sequence||f.timestamp.localeCompare(d.timestamp)||f.id.localeCompare(d.id)),r=n.map(f=>({id:ut("raw",[f.projectId,f.agent,f.nativeSessionId,f.id,String(f.sequence)].join("|")),level:"raw",eventId:f.id,sourceEventId:f.sourceEventId,sequence:f.sequence,type:f.type,role:f.role,timestamp:f.timestamp,sourcePath:f.provenance.sourcePath,payloadDigest:qa(f.data)})),o=new Map,s=new Map;n.forEach((f,d)=>{let m=r[d];m&&(o.set(f.id,m.id),f.sourceEventId&&s.set(f.sourceEventId,m.id))});let i=e.map(f=>{let d=ee([...f.provenance.eventIds.map(m=>o.get(m)),...f.provenance.sourceEventIds.map(m=>s.get(m))]);return{id:ut("fact",f.fingerprint),level:"fact",fingerprint:f.fingerprint,kind:f.kind,type:f.type,content:f.content,knowledgeClass:f.knowledgeClass,importanceScore:f.importanceScore,confidence:f.confidence,tags:ee([...f.tags,"level:fact",`class:${f.knowledgeClass}`,`kind:${f.kind}`]),rawIds:d,sourcePaths:ee(f.provenance.sourcePaths)}}),a=new Map;for(let f of i){let d=Ba(f.kind),m=a.get(d)??[];m.push(f),a.set(d,m)}let c=[];for(let f of Wa){let d=a.get(f);if(!d?.length)continue;let m=d.slice().sort((y,g)=>g.importanceScore-y.importanceScore||g.confidence-y.confidence||y.id.localeCompare(g.id)),S=m.map(y=>y.id);c.push({id:ut("scene",`${f}|${S.join("|")}`),level:"scene",kind:f,title:za[f],summary:Va(m),factIds:S,importanceScore:Math.max(...m.map(y=>y.importanceScore)),confidence:jr(m.map(y=>y.confidence)),tags:ee(["level:scene",`scene:${f}`,...m.flatMap(y=>y.tags)]),sourcePaths:ee(m.flatMap(y=>y.sourcePaths))})}let u=new Map(i.map(f=>[f.id,f])),p=[];for(let f of c){let m=f.factIds.map(g=>u.get(g)).filter(g=>!!g).filter(g=>(g.knowledgeClass==="permanent"||g.knowledgeClass==="task")&&g.importanceScore>=.55);if(m.length===0)continue;let S=m.some(g=>g.knowledgeClass==="permanent")?"permanent":"task",y=Ja(m);p.push({id:ut("knowledge",`${f.id}|${S}|${m.map(g=>g.id).join("|")}`),level:"knowledge",knowledgeClass:S,title:f.title,content:y,sceneIds:[f.id],factIds:m.map(g=>g.id),importanceScore:Math.max(...m.map(g=>g.importanceScore)),confidence:jr(m.map(g=>g.confidence)),tags:ee(["level:knowledge",`class:${S}`,`scene:${f.kind}`,...m.flatMap(g=>g.tags)]),sourcePaths:ee(m.flatMap(g=>g.sourcePaths))})}let l=[];for(let f of i)for(let d of f.rawIds)l.push({from:d,to:f.id,type:"supports"});for(let f of c)for(let d of f.factIds)l.push({from:d,to:f.id,type:"belongs_to"});for(let f of p)for(let d of f.sceneIds)l.push({from:d,to:f.id,type:"promotes_to"});return{schema:"toolnet.memory-hierarchy.v1",version:1,raw:r,facts:i,scenes:c,knowledge:p,links:l,stats:{raw:r.length,facts:i.length,scenes:c.length,knowledge:p.length,links:l.length}}}function lt(t){return t?Math.ceil(t.length/3.5):0}function dt(t,e){if(!t)return"";if(lt(t)<=e)return t;let r=Math.floor(e*3.5),o=t.slice(0,r),s=o.lastIndexOf("."),i=o.lastIndexOf(`
`),a=Math.max(s,i);return a>r*.7?o.slice(0,a+1):o}function te(){let t=He(),e=process.env.TOOLNET_SESSION_SAVE||"summary",n=process.env.TOOLNET_RAW_TRANSCRIPT==="on"||e==="archive"||e==="full",r=process.env.TOOLNET_MEMORY_PROMOTION||"conservative",o=parseFloat(process.env.TOOLNET_PROMOTE_MIN_SCORE||"0.65"),s=parseInt(process.env.TOOLNET_SESSION_SUMMARY_MAX_TOKENS||"700",10),i=parseInt(process.env.TOOLNET_DURABLE_MEMORY_MAX_ITEMS_PER_SESSION||"10",10),a=n,c=process.env.TOOLNET_RAW_TRANSCRIPT_REMOTE==="on"||e==="full";return{sessionSave:e,rawTranscript:n,memoryPromotion:r,promoteMinScore:o,sessionSummaryMaxTokens:s,durableMemoryMaxItemsPerSession:i,archiveLocal:a,archiveRemote:c}}function Ar(t){return(t||te()).rawTranscript}function Er(t){return(t||te()).durableMemoryMaxItemsPerSession}function Pr(t){return(t||te()).sessionSummaryMaxTokens}function Or(t){return(t||te()).archiveRemote}var Tr=new J;function Rr(t){let e=t.trim();if(e.startsWith("{")&&e.endsWith("}")||e.startsWith("[")&&e.endsWith("]"))try{let r=JSON.parse(e);return JSON.stringify(Tr.sanitizeValue(r))}catch{}let n=Tr.sanitize(t).text;return n=n.replace(/("(?:api[_-]?key|token|secret|password|cookie|authorization)"\s*:\s*)"[^"]*"/gi,'$1"[REDACTED]"').replace(/('(?:api[_-]?key|token|secret|password|cookie|authorization)'\s*:\s*)'[^']*'/gi,"$1'[REDACTED]'").replace(/\b(api[_-]?key|token|secret|password|cookie|authorization)\b\s*[:=]\s*[^\s,;]+/gi,"$1=[REDACTED]").replace(/\bbearer\s+[A-Za-z0-9._~+/=-]+/gi,"Bearer [REDACTED]"),n}function Ha(t,e){let n=t.toLowerCase(),r=.5,o=["nh\u1EDB","remember","quy t\u1EAFc","rule","t\u1EEB gi\u1EDD","from now","kh\xF4ng \u0111\u01B0\u1EE3c","must not","lu\xF4n lu\xF4n","always","never","critical","important","blocker","deploy","production","architecture"];for(let i of o)n.includes(i)&&(r+=.15);e==="rule"||e==="architecture"||e==="blocker"?r+=.2:e==="decision"||e==="deploy"?r+=.15:(e==="fix"||e==="next_action")&&(r+=.1),t.length<20?r-=.3:t.length>500&&(r-=.1);let s=[/npm (notice|warn|ERR)/i,/\d+ packages? in \d+/i,/found \d+ vulnerabilities/i,/up to date/i,/added \d+ packages/i,/^(ok|done|success|error|warning)$/i];for(let i of s)i.test(t)&&(r-=.4);return Math.max(0,Math.min(1,r))}function Ga(t,e){let n=[],r=new Set;for(let i of t){let a=i.split(`
`).filter(c=>c.trim());for(let c of a){let u=c.trim();if(u.length<15)continue;let p=u.toLowerCase().replace(/\s+/g," ");if(r.has(p))continue;r.add(p);let l="decision";/\b(rule|quy tắc|policy|standard|convention)\b/i.test(u)||/\b(always|never|must|should|từ giờ|không được)\b/i.test(u)?l="rule":/\b(fix|fixed|bug|issue|error|lỗi)\b/i.test(u)?l="fix":/\b(blocker|blocked|stuck|cannot|không thể)\b/i.test(u)?l="blocker":/\b(next|todo|action|task|cần làm)\b/i.test(u)?l="next_action":/\b(deploy|release|publish|ship)\b/i.test(u)?l="deploy":/\b(architecture|design|structure|pattern)\b/i.test(u)?l="architecture":/\.(ts|js|py|go|rs|java|cpp|c|h)\b/i.test(u)&&(l="file");let f=Ha(u,l);if(f<.3)continue;let d=Rr(u);n.push({category:l,text:d,importance:f,sourceSessionId:e})}}let o=te(),s=Er(o);return n.sort((i,a)=>a.importance-i.importance).slice(0,s)}function Ua(t){let e=te(),n=Pr(e),s=t.join(`

`).split(`
`).filter(i=>{let a=i.trim();return a.length>20&&!a.startsWith("npm")&&!a.startsWith("\u2713")&&!a.startsWith("Error:")}).slice(0,20).map(i=>Rr(i)).join(`
`);return dt(s,n)}function pt(t,e){let r=(Array.isArray(t)?t:t.split(`

`).filter(d=>d.trim())).map(d=>typeof d=="string"?d:JSON.stringify(d)).filter(d=>d.trim()),o=Ga(r,e),s=o.filter(d=>d.category==="decision").map(d=>d.text),i=o.filter(d=>d.category==="rule").map(d=>d.text),a=o.filter(d=>d.category==="file").map(d=>d.text),c=o.filter(d=>d.category==="fix").map(d=>d.text),u=o.filter(d=>d.category==="blocker").map(d=>d.text),p=o.filter(d=>d.category==="next_action").map(d=>d.text),l=o.filter(d=>d.category==="deploy").map(d=>d.text);return{summary:Ua(r),decisions:s,projectRules:i,filesChanged:a,bugsFixed:c,commands:l,blockers:u,nextActions:p,durableFacts:o}}function G(t){let e=new Set,n=[];for(let r of t){let o=r?.replace(/\s+/g," ").trim();if(!o)continue;let s=o.normalize("NFKC").toLowerCase();e.has(s)||(e.add(s),n.push(o))}return n}function Ya(t){let e=new Map;for(let n of t){if(!n||!n.id||!Number.isFinite(n.sequence))continue;let r=n.sourceEventId?`${n.agent}:${n.sourceEventId}`:n.id,o=e.get(r);(!o||n.sequence>o.sequence)&&e.set(r,n)}return[...e.values()].sort((n,r)=>n.sequence-r.sequence||n.timestamp.localeCompare(r.timestamp))}function Xa(t){let e=t.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}_./:-]+/gu)??[],n=new Set;for(let r of e)if(!(r.length<2||/^\d+$/u.test(r))&&(n.add(r),n.size>=40))break;return[...n]}function Qa(t){let e=an(t);return{...t,knowledgeClass:e.knowledgeClass,importanceScore:e.score,retrievalTerms:Xa(t.content),tags:G([...t.tags,"level:fact",`class:${e.knowledgeClass}`,`kind:${t.kind}`])}}function Za(t){return t.map(e=>{try{return JSON.stringify({type:e.type,role:e.role,data:e.data,provenance:{sourcePath:e.provenance.sourcePath,files:e.provenance.files}})}catch{return""}}).filter(Boolean)}function ec(t,e,n){let r=pt(Za(e),t.nativeSessionId),o=n.filter(u=>u.kind==="todo"||u.kind==="next_action").map(u=>u.content),s=n.flatMap(u=>u.provenance.sourcePaths),i=n.filter(u=>u.kind==="architecture").map(u=>u.content),a=G([...o,...r.nextActions]),c=G([...r.nextActions,...o]);return{summary:r.summary,state:{task:c[0]??a[0],decisions:G(r.decisions),files:G([...r.filesChanged,...s]),todos:a,completed:G(r.bugsFixed),blockers:G(r.blockers),nextActions:c,architecture:G(i)}}}function ft(t,e){let n=Ya(e),r=Cr(t,n).map(Qa),o=r.filter(p=>an(p).persist).sort((p,l)=>l.importanceScore-p.importanceScore),{summary:s,state:i}=ec(t,n,o),a=o.map(p=>({fingerprint:p.fingerprint,kind:p.kind,knowledgeClass:p.knowledgeClass,importanceScore:p.importanceScore,content:p.content,terms:p.retrievalTerms})),c=Mr(n,o),u=p=>r.filter(l=>l.knowledgeClass===p).length;return{version:2,normalizedEvents:n,summary:s,state:i,candidates:o,retrievalIndex:a,hierarchy:c,stats:{inputEvents:e.length,normalizedEvents:n.length,extractedCandidates:r.length,persistedCandidates:o.length,permanent:u("permanent"),task:u("task"),session:u("session"),transient:u("transient")}}}import{createHash as tc}from"node:crypto";import{chmodSync as Nr,existsSync as nc,mkdirSync as rc,readFileSync as oc,renameSync as sc,writeFileSync as _r}from"node:fs";import{dirname as $r,join as mt}from"node:path";var pn="toolnet.context-offload.v1",ic="toolnet.context-offload-asset.v1",ac=256,cc=new Set(["tool_call","tool_result","file_read","file_write","file_edit","command","test","artifact"]);function Lr(t){return mt(t,".toolnet","offload")}function uc(t){return mt(Lr(t),"assets")}function Kr(t){return mt(Lr(t),"graph.json")}function Fr(t){rc(t,{recursive:!0,mode:448});try{Nr(t,448)}catch{}}function lc(t,e){Fr($r(t));let n=`${t}.${process.pid}.${Date.now()}.tmp`;_r(n,e,{encoding:"utf8",mode:384}),sc(n,t);try{Nr(t,384)}catch{}}function dn(t){return Array.isArray(t)?t.map(dn):t&&typeof t=="object"?Object.fromEntries(Object.entries(t).sort(([e],[n])=>e.localeCompare(n)).map(([e,n])=>[e,dn(n)])):t}function dc(t){return tc("sha256").update(JSON.stringify(dn(t)),"utf8").digest("hex")}function ln(){return{schema:pn,version:1,updatedAt:new Date(0).toISOString(),nodes:[]}}function pc(t){let e=Kr(t);if(!nc(e))return ln();try{let n=JSON.parse(oc(e,"utf8"));return n.schema!==pn||n.version!==1||!Array.isArray(n.nodes)?ln():n}catch{return ln()}}function fc(t,e){lc(Kr(t),JSON.stringify(e,null,2)+`
`)}function mc(t,e=260){if(typeof t!="string")return null;let n=t.replace(/\s+/gu," ").trim();return n?n.slice(0,e):null}function gc(t){let e=[...t.provenance.files??[],t.provenance.sourcePath],n=[];for(let r of e){let o=mc(r);if(!(!o||n.includes(o))&&(n.push(o),n.length===3))break}return n}function yc(t){return`${t.agent}:${t.sourceEventId??t.id}`.replace(/\s+/gu," ").trim().slice(0,120)}function hc(t,e){Fr($r(t));try{return _r(t,e,{encoding:"utf8",flag:"wx",mode:384}),!0}catch(n){if(n.code==="EEXIST")return!1;throw n}}function Sc(t,e){let n=t.nodes.find(o=>o.id===e.id),r=n?{...n,kind:e.kind,bytes:e.bytes,sourceRefs:Array.from(new Set([...n.sourceRefs,...e.sourceRefs])).slice(-8),files:Array.from(new Set([...n.files,...e.files])).slice(0,6)}:e;return{schema:pn,version:1,updatedAt:new Date().toISOString(),nodes:[...t.nodes.filter(o=>o.id!==e.id),r].slice(-ac)}}function Dr(t,e){let n=pc(t),r=0,o=0,s=0,i=[];for(let a of e){if(!cc.has(a.type))continue;r+=1;let c=dc({type:a.type,data:a.data}),u={schema:ic,version:1,assetId:c,event:{type:a.type,agent:a.agent,nativeSessionId:a.nativeSessionId,timestamp:a.timestamp,sourceEventId:a.sourceEventId,provenance:a.provenance,data:a.data}},p=JSON.stringify(u,null,2)+`
`;hc(mt(uc(t),`${c}.json`),p)?o+=1:s+=1,i.push(c),n=Sc(n,{id:c,kind:a.type,bytes:Buffer.byteLength(p,"utf8"),createdAt:a.timestamp,sourceRefs:[yc(a)],files:gc(a)})}return r>0&&fc(t,n),{eligible:r,written:o,deduped:s,graphNodes:n.nodes.length,assetIds:i}}import{createHash as Ic}from"node:crypto";import{existsSync as Mc,readdirSync as Ac,readFileSync as Ec}from"node:fs";import{basename as Pc,join as ro}from"node:path";import{randomUUID as qr}from"node:crypto";var M=class extends Error{constructor(n,r){super(n);this.statusCode=r}statusCode};function Oe(t){let e=new Set,n=[];for(let r of t){let o=r.replace(/\s+/gu," ").trim();if(!o)continue;let s=o.normalize("NFKC").toLowerCase();e.has(s)||(e.add(s),n.push(o))}return n}function re(t){let e=t.normalize("NFKD").replace(/[\u0300-\u036f]/gu,"").toLowerCase().replace(/[^a-z0-9]+/gu,"-").replace(/^-+|-+$/gu,"").slice(0,120);if(!e)throw new M("Invalid Wiki slug",400);return e}function Wr(t){let e=[];for(let n of t.matchAll(/\[\[([^\[\]]+)\]\]/gu)){let r=n[1]?.trim();r&&e.push(re(r))}return Oe(e)}function kc(t){return t.normalize("NFKC").toLowerCase().split(/[^\p{L}\p{N}_-]+/u).map(e=>e.trim()).filter(e=>e.length>=2)}function zr(t){return{id:`revision-${qr()}`,pageId:t.id,slug:t.slug,revision:t.revision,title:t.title,...t.summary?{summary:t.summary}:{},content:t.content,tags:[...t.tags],links:[...t.links],createdAt:t.updatedAt}}function ne(t){return structuredClone(t)}var gt=class{constructor(e){this.store=e}store;state;queue=Promise.resolve();async initialize(){await this.ensureState()}async ensureState(){return this.state||(this.state=await this.store.load()),this.state}async mutate(e){let n,r=this.queue.then(async()=>{let o=await this.ensureState();n=e(o),o.updatedAt=new Date().toISOString(),await this.store.save(o)});return this.queue=r.then(()=>{},()=>{}),await r,n}async summary(){let e=await this.ensureState(),n=new Set(e.pages.flatMap(r=>r.links));return{schema:"toolnet.wiki-summary.v1",projectId:e.projectId,pages:e.pages.length,revisions:e.revisions.length,tags:Oe(e.pages.flatMap(r=>r.tags)).sort((r,o)=>r.localeCompare(o)),links:e.pages.reduce((r,o)=>r+o.links.length,0),orphanPages:e.pages.filter(r=>r.links.length===0&&!n.has(r.slug)).length,automatedPages:e.pages.filter(r=>r.tags.some(o=>o.startsWith("toolnet-auto-"))).length,updatedAt:e.updatedAt}}async listPages(){let e=await this.ensureState();return ne([...e.pages].sort((n,r)=>n.title.localeCompare(r.title)))}async getPage(e){let n=await this.ensureState(),r=re(e),o=n.pages.find(s=>s.slug===r||s.id===e);if(!o)throw new M(`Wiki page not found: ${e}`,404);return ne(o)}async createPage(e){return this.mutate(n=>{let r=e.title.trim(),o=e.content.trim();if(!r)throw new M("Wiki title is required",400);let s=re(e.slug??r);if(n.pages.some(c=>c.slug===s))throw new M(`Wiki page already exists: ${s}`,409);let i=new Date().toISOString(),a={id:`wiki-${qr()}`,slug:s,title:r,...e.summary?.trim()?{summary:e.summary.trim()}:{},content:o,tags:Oe(e.tags??[]),links:Wr(o),revision:1,createdAt:i,updatedAt:i};return n.pages.push(a),n.revisions.push(zr(a)),ne(a)})}async updatePage(e,n){return this.mutate(r=>{let o=re(e),s=r.pages.find(i=>i.slug===o||i.id===e);if(!s)throw new M(`Wiki page not found: ${e}`,404);if(n.title!==void 0){let i=n.title.trim();if(!i)throw new M("Wiki title is required",400);s.title=i}if(n.summary!==void 0){let i=n.summary.trim();i?s.summary=i:delete s.summary}return n.content!==void 0&&(s.content=n.content.trim(),s.links=Wr(s.content)),n.tags!==void 0&&(s.tags=Oe(n.tags)),s.revision+=1,s.updatedAt=new Date().toISOString(),r.revisions.push(zr(s)),ne(s)})}async history(e){let n=await this.getPage(e),r=await this.ensureState();return ne(r.revisions.filter(o=>o.pageId===n.id).sort((o,s)=>s.revision-o.revision))}async backlinks(e){let n=await this.getPage(e),r=await this.ensureState();return ne(r.pages.filter(o=>o.links.includes(n.slug)).sort((o,s)=>o.title.localeCompare(s.title)))}async search(e,n=10){let r=await this.ensureState(),o=Oe(kc(e));if(o.length===0)return[];let s=Math.max(1,Math.min(20,Math.floor(n))),i=[];for(let a of r.pages){let c=a.title.toLowerCase(),u=a.slug.toLowerCase(),p=a.summary?.toLowerCase()??"",l=a.content.toLowerCase(),f=a.tags.map(m=>m.toLowerCase()),d=0;for(let m of o)u===m&&(d+=12),c===m&&(d+=10),c.includes(m)&&(d+=6),u.includes(m)&&(d+=5),f.some(S=>S===m)?d+=5:f.some(S=>S.includes(m))&&(d+=3),p.includes(m)&&(d+=2),l.includes(m)&&(d+=1);d>0&&i.push({page:ne(a),score:d})}return i.sort((a,c)=>c.score-a.score||c.page.updatedAt.localeCompare(a.page.updatedAt)).slice(0,s)}};var Br="wiki/state.v1.json";function vc(t){let e=new Date().toISOString();return{schema:"toolnet.wiki.v1",version:1,projectId:t.id,pages:[],revisions:[],createdAt:e,updatedAt:e}}function wc(t,e){let n=JSON.parse(t);if(n.schema!=="toolnet.wiki.v1"||n.version!==1||n.projectId!==e.id||!Array.isArray(n.pages)||!Array.isArray(n.revisions))throw new Error("Invalid ToolNet Wiki state");return n}var yt=class{constructor(e,n){this.storage=e;this.project=n}storage;project;async load(){let e=await this.storage.getText(Br);if(!e){let n=vc(this.project);return await this.save(n),n}return wc(e,this.project)}async save(e){await this.storage.put(Br,JSON.stringify(e,null,2),"application/json")}};import{createHash as bc,randomUUID as Vr}from"node:crypto";var Jr="wiki/governance.v1.json",Yr="toolnet.knowledge-governance.v1",Hr=500,Te={autoApproveThreshold:.86,criticalApproveThreshold:.94,staleAfterDays:90};function xc(t,e=0,n=1){return Math.max(e,Math.min(n,t))}function fn(t){return t.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/gu," ").trim()}function Gr(t){return bc("sha256").update(t.normalize("NFKC").replace(/\s+/gu," ").trim()).digest("hex")}function Cc(t){let e=[t.title,t.summary??"",t.content.slice(0,2e3),...t.tags].join(" ").toLowerCase();return/\b(?:architecture|security|authentication|authorization|auth|database|production|deploy|deployment|payment|billing|permission|permissions|acl|credential|secret|migration)\b/u.test(e)}function jc(t){let e=t.sourceType==="skill"?.96:t.sourceType==="memory"?.94:.88,n=t.tags.map(r=>r.toLowerCase());return(n.includes("permanent")||n.includes("task"))&&(e+=.03),t.content.length>=200&&(e+=.02),t.content.length<80&&(e-=.05),t.title.length<4&&(e-=.05),xc(e)}function Ur(t){let e=new Date().toISOString();return{schema:Yr,version:1,projectId:t,policy:{...Te},reviews:[],audit:[],createdAt:e,updatedAt:e}}function Xr(t){let e=t.autoApproveThreshold??Te.autoApproveThreshold,n=t.criticalApproveThreshold??Te.criticalApproveThreshold,r=t.staleAfterDays??Te.staleAfterDays;if(!Number.isFinite(e)||e<.5||e>1)throw new M("Invalid autoApproveThreshold",400);if(!Number.isFinite(n)||n<.5||n>1)throw new M("Invalid criticalApproveThreshold",400);if(!Number.isInteger(r)||r<1||r>3650)throw new M("Invalid staleAfterDays",400);return{autoApproveThreshold:e,criticalApproveThreshold:n,staleAfterDays:r}}var ht=class{constructor(e,n){this.storage=e;this.project=n}storage;project;async load(){let e=await this.storage.getText(Jr);if(!e){let n=Ur(this.project.id);return await this.save(n),n}try{let n=JSON.parse(e);if(n.schema!==Yr||n.version!==1||n.projectId!==this.project.id||!Array.isArray(n.reviews)||!Array.isArray(n.audit))throw new Error("invalid");return{...n,policy:Xr(n.policy??Te)}}catch{let n=Ur(this.project.id);return await this.save(n),n}}async save(e){await this.storage.put(Jr,JSON.stringify(e,null,2),"application/json")}},St=class{constructor(e){this.store=e}store;state;queue=Promise.resolve();async initialize(){await this.ensureState()}async ensureState(){return this.state||(this.state=await this.store.load()),this.state}audit(e,n,r,o={}){e.audit.push({id:Vr(),action:n,principal:r,...o.reviewId?{reviewId:o.reviewId}:{},...o.sourceKey?{sourceKey:o.sourceKey}:{},timestamp:new Date().toISOString(),...o.metadata?{metadata:o.metadata}:{}}),e.audit.length>Hr&&(e.audit=e.audit.slice(-Hr))}async mutate(e){let n,r=this.queue.then(async()=>{let o=await this.ensureState();n=await e(o),o.updatedAt=new Date().toISOString(),await this.store.save(o)});return this.queue=r.then(()=>{},()=>{}),await r,n}async policy(){return{...(await this.ensureState()).policy}}async setPolicy(e,n){return this.mutate(r=>(r.policy=Xr({...r.policy,...e}),this.audit(r,"policy:update",n,{metadata:{...r.policy}}),{...r.policy}))}async summary(){let e=await this.ensureState(),n=r=>e.reviews.filter(o=>o.status===r).length;return{schema:"toolnet.knowledge-governance-summary.v1",projectId:e.projectId,pending:n("pending"),approved:n("approved"),rejected:n("rejected"),superseded:n("superseded"),criticalPending:e.reviews.filter(r=>r.status==="pending"&&r.risk==="critical").length,conflictPending:e.reviews.filter(r=>r.status==="pending"&&r.risk==="conflict").length,auditEvents:e.audit.length,policy:{...e.policy},updatedAt:e.updatedAt}}async listReviews(e){let n=await this.ensureState();return structuredClone(n.reviews.filter(r=>!e||r.status===e).sort((r,o)=>o.updatedAt.localeCompare(r.updatedAt)))}async auditLog(e=100){let n=await this.ensureState(),r=Math.max(1,Math.min(500,Math.floor(e)));return structuredClone(n.audit.slice(-r).reverse())}async assess(e,n){let r=await this.ensureState(),o=jc(e),s=fn(e.title),i=n.filter(p=>p.slug!==e.slug&&fn(p.title)===s&&Gr(p.content)!==Gr(e.content)).map(p=>p.slug),a=Cc(e),c=[];o<r.policy.autoApproveThreshold&&c.push(`confidence:${o.toFixed(2)}`),a&&o<r.policy.criticalApproveThreshold&&c.push("critical-knowledge"),i.length>0&&c.push("conflicting-knowledge");let u=i.length>0?"conflict":a?"critical":"normal";return{confidence:o,risk:u,requiresReview:i.length>0||o<r.policy.autoApproveThreshold||a&&o<r.policy.criticalApproveThreshold,reasons:c,conflicts:i}}async gate(e,n){let r=await this.assess(e,n);return this.mutate(o=>{let s=o.reviews.find(c=>c.sourceKey===e.sourceKey&&c.digest===e.digest);if(s?.status==="approved")return{allowed:!0,mode:"review-approved",assessment:r,review:structuredClone(s)};if(s?.status==="rejected")return{allowed:!1,mode:"rejected",assessment:r,review:structuredClone(s)};if(!r.requiresReview)return this.audit(o,"knowledge:auto-approved","system",{sourceKey:e.sourceKey,metadata:{confidence:r.confidence,risk:r.risk}}),{allowed:!0,mode:"auto-approved",assessment:r};if(s?.status==="pending")return{allowed:!1,mode:"pending-review",assessment:r,review:structuredClone(s)};let i=new Date().toISOString(),a={id:Vr(),sourceKey:e.sourceKey,sourceType:e.sourceType,slug:e.slug,marker:e.marker,digest:e.digest,title:e.title,...e.summary?{summary:e.summary}:{},content:e.content,tags:[...new Set([...e.tags,e.marker])],confidence:r.confidence,risk:r.risk,reasons:[...r.reasons],conflicts:[...r.conflicts],status:"pending",createdAt:i,updatedAt:i};return o.reviews.push(a),this.audit(o,"knowledge:review-requested","system",{reviewId:a.id,sourceKey:a.sourceKey,metadata:{confidence:a.confidence,risk:a.risk}}),{allowed:!1,mode:"pending-review",assessment:r,review:structuredClone(a)}})}async markApplied(e,n){await this.mutate(r=>{let o=r.reviews.find(s=>s.sourceKey===e&&s.digest===n&&s.status==="approved");o&&(o.appliedAt=new Date().toISOString(),o.updatedAt=o.appliedAt,this.audit(r,"knowledge:applied",o.reviewedBy??"system",{reviewId:o.id,sourceKey:e}))})}async decide(e,n,r){return this.mutate(async o=>{let s=o.reviews.find(u=>u.id===e);if(!s)throw new M(`Governance review not found: ${e}`,404);if(s.status!=="pending")throw new M("Governance review is already resolved",409);let i=new Date().toISOString();if(s.reviewedAt=i,s.reviewedBy=n.principal,s.updatedAt=i,n.note?.trim()&&(s.reviewNote=n.note.trim()),n.action==="reject")return s.status="rejected",this.audit(o,"knowledge:rejected",n.principal,{reviewId:e,sourceKey:s.sourceKey}),structuredClone(s);if(n.action==="supersede")return s.status="superseded",n.targetReviewId&&(s.supersededBy=n.targetReviewId),this.audit(o,"knowledge:superseded",n.principal,{reviewId:e,sourceKey:s.sourceKey,metadata:{targetReviewId:n.targetReviewId}}),structuredClone(s);if(n.action==="merge"){if(!n.targetReviewId)throw new M("targetReviewId is required for merge",400);let u=o.reviews.find(p=>p.id===n.targetReviewId);if(!u)throw new M("Merge target review not found",404);return s.status="superseded",s.mergedInto=u.id,this.audit(o,"knowledge:merged",n.principal,{reviewId:e,sourceKey:s.sourceKey,metadata:{targetReviewId:u.id}}),structuredClone(s)}s.status="approved";let c=(await r.listPages()).find(u=>u.slug===s.slug);if(c&&!c.tags.includes(s.marker))throw new M(`Wiki page '${s.slug}' is manually managed`,409);return c?await r.updatePage(s.slug,{title:s.title,summary:s.summary??"",content:s.content,tags:s.tags}):await r.createPage({slug:s.slug,title:s.title,...s.summary?{summary:s.summary}:{},content:s.content,tags:s.tags}),s.appliedAt=i,this.audit(o,"knowledge:approved",n.principal,{reviewId:e,sourceKey:s.sourceKey}),structuredClone(s)})}async quality(e){let n=await this.ensureState(),r=await e.listPages(),o=Date.now(),s=n.policy.staleAfterDays*864e5,i=r.map(p=>{let l=o-Date.parse(p.updatedAt);return{slug:p.slug,title:p.title,updatedAt:p.updatedAt,ageDays:Math.max(0,Math.floor(l/864e5)),stale:Number.isFinite(l)&&l>s}}).filter(p=>p.stale).map(({stale:p,...l})=>l),a=new Map;for(let p of r){let l=fn(p.title),f=a.get(l)??[];f.push(p),a.set(l,f)}let c=[...a.entries()].filter(([,p])=>p.length>1).map(([p,l])=>({title:p,pages:l.map(f=>f.slug)})),u=n.reviews.filter(p=>p.status==="pending");return{schema:"toolnet.knowledge-quality.v1",totalPages:r.length,automatedPages:r.filter(p=>p.tags.some(l=>l.startsWith("toolnet-auto-"))).length,manualPages:r.filter(p=>!p.tags.some(l=>l.startsWith("toolnet-auto-"))).length,stalePages:i,duplicateTitles:c,pendingReviews:u.length,lowConfidenceReviews:u.filter(p=>p.confidence<n.policy.autoApproveThreshold).length,conflicts:u.filter(p=>p.risk==="conflict").length,generatedAt:new Date().toISOString()}}};var oo="wiki/automation.v1.json",so="toolnet.wiki-automation.v1",yn=8e3,Qr=new Set(["raw","rawtext","raw_text","rawtranscript","raw_transcript","transcript","messages","message","payload","prompt","response","assistantmessage","assistant_message","userprompt","user_prompt"]);function Ne(t){return Ic("sha256").update(JSON.stringify(t)).digest("hex")}function Re(t){if(!(!t||typeof t!="object"||Array.isArray(t)))return t}function Zr(t){return Array.isArray(t)?t:[]}function io(t){return typeof t!="string"?void 0:t.replace(/\s+/gu," ").trim()||void 0}function mn(t){return Array.isArray(t)?t.map(io).filter(e=>!!e):[]}function K(t,e){for(let n of e){let r=io(t[n]);if(r)return r}}function _e(t){let e=new Set,n=[];for(let r of t){let o=r.replace(/\s+/gu," ").trim();if(!o)continue;let s=o.normalize("NFKC").toLowerCase();e.has(s)||(e.add(s),n.push(o))}return n}function kt(t,e=0,n=""){if(e>3)return[];let r=n.replace(/[^a-z0-9]/giu,"").toLowerCase();if(Qr.has(r))return[];if(typeof t=="string"){let i=t.replace(/\s+/gu," ").trim();return i.length<8?[]:[i]}if(Array.isArray(t))return t.flatMap(i=>kt(i,e+1,n));let o=Re(t);if(!o)return[];let s=[];for(let[i,a]of Object.entries(o)){let c=i.replace(/[^a-z0-9]/giu,"").toLowerCase();Qr.has(c)||s.push(...kt(a,e+1,i))}return s}function eo(t){let n=_e(["content","summary","text","value","statement","description","decision","task","knowledge","context","outcome","reason","rationale"].flatMap(o=>kt(t[o],0,o)));return(n.length>0?n:_e(kt(t))).join(`

`).slice(0,yn)}function to(t,e){return K(t,["id","key","fingerprint","knowledgeId","sceneId"])??e}function no(t,e){return K(t,["title","name","topic","label","task","kind","type"])??e}function Oc(t){return(K(t,["knowledgeClass","class","classification","scope"])??"").toLowerCase()}function Tc(t){return(K(t,["kind","sceneKind","type"])??"").toLowerCase()}function Rc(t){let e=Re(t);if(!e)return[];let n=[],r=Zr(e.knowledge);for(let[s,i]of r.entries()){let a=Re(i);if(!a)continue;let c=Oc(a);if(c==="session"||c==="transient")continue;let u=eo(a);if(u.length<20)continue;let p=to(a,Ne(a).slice(0,16)),l=no(a,`Durable Memory ${s+1}`);n.push({sourceKey:`memory:${p}`,sourceType:"memory",title:l,summary:K(a,["summary","description"]),content:u,tags:_e(["toolnet","auto","memory",...c?[c]:[]])})}let o=Zr(e.scenes);for(let[s,i]of o.entries()){let a=Re(i);if(!a)continue;let c=Tc(a);if(c==="session-context")continue;let u=eo(a);if(u.length<20)continue;let p=to(a,Ne(a).slice(0,16)),l=no(a,`Knowledge Scene ${s+1}`);n.push({sourceKey:`scene:${p}`,sourceType:"scene",title:l,summary:K(a,["summary","description"]),content:u,tags:_e(["toolnet","auto","scene",...c?[c]:[]])})}return n}function Nc(t){return ro(t,".toolnet","memory","skills")}function _c(t){let e=Nc(t);if(!Mc(e))return{candidates:[],failed:0};let n=[],r=0,o=Ac(e).filter(s=>s.endsWith(".json")).sort();for(let s of o)try{let i=JSON.parse(Ec(ro(e,s),"utf8")),a=Re(i);if(!a||a.schema!=="toolnet.skill-memory.v1")continue;let c=K(a,["id","fingerprint"])??Pc(s,".json"),u=K(a,["task"])??"",p=K(a,["title"])||u||`Reusable Skill ${c.slice(0,8)}`,l=K(a,["summary"])??void 0,f=mn(a.steps),d=mn(a.verification),m=mn(a.files),S=[];u&&S.push(`## Task
${u}`),l&&S.push(`## Summary
${l}`),f.length>0&&S.push(`## Procedure
${f.map((g,k)=>`${k+1}. ${g}`).join(`
`)}`),d.length>0&&S.push(`## Verification
${d.map(g=>`- ${g}`).join(`
`)}`),m.length>0&&S.push(`## Relevant Files
${m.map(g=>`- \`${g}\``).join(`
`)}`);let y=S.join(`

`).slice(0,yn);if(y.length<20)continue;n.push({sourceKey:`skill:${c}`,sourceType:"skill",title:p,summary:l,content:y,tags:["toolnet","auto","skill","sop"]})}catch{r+=1}return{candidates:n,failed:r}}function gn(t){let e=new Date().toISOString();return{schema:so,version:1,projectId:t,entries:[],createdAt:e,updatedAt:e}}async function $c(t,e){let n=await t.getText(oo);if(!n)return gn(e);try{let r=JSON.parse(n);return r.schema!==so||r.version!==1||r.projectId!==e||!Array.isArray(r.entries)?gn(e):r}catch{return gn(e)}}async function Lc(t,e){await t.put(oo,JSON.stringify(e,null,2),"application/json")}function Kc(t){return`toolnet-auto-${Ne(t).slice(0,12)}`}function Fc(t){let e=re(t.title).slice(0,72),n=Ne(t.sourceKey).slice(0,10);return re(`auto-${t.sourceType}-${e}-${n}`)}function Dc(t){return[`> Auto-generated by ToolNet Knowledge Automation from ${t.sourceType==="skill"?"reusable Skill Memory":t.sourceType==="scene"?"semantic memory scene":"durable memory"}.`,"",t.content].join(`
`).slice(0,yn)}function Wc(t){return Ne({sourceType:t.sourceType,title:t.title,summary:t.summary,content:t.content,tags:t.tags})}function zc(t,e){return t.tags.includes(e)}async function ao(t){let e=Rc(t.hierarchy),n=_c(t.project.rootPath),r=new Map;for(let d of[...e,...n.candidates])r.set(d.sourceKey,d);let o=[...r.values()].sort((d,m)=>d.sourceKey.localeCompare(m.sourceKey)),s={schema:"toolnet.wiki-automation-result.v1",scanned:e.length+n.candidates.length,eligible:o.length,created:0,updated:0,unchanged:0,skipped:0,failed:n.failed,reviewPending:0,autoApproved:0,reviewApproved:0,pages:[]},i=new gt(new yt(t.storage,t.project));await i.initialize();let a=new St(new ht(t.storage,t.project));await a.initialize();let c=await $c(t.storage,t.project.id),u=await i.listPages(),p=new Map(u.map(d=>[d.slug,d])),l=new Map(c.entries.map(d=>[d.sourceKey,d]));for(let d of o)try{let m=Kc(d.sourceKey),S=Wc(d),y=l.get(d.sourceKey),g=y?.slug??Fc(d),k=p.get(g);if(k&&!zc(k,m)){s.skipped+=1;continue}let b=_e([...d.tags,m]),T=Dc(d),P=await a.gate({sourceKey:d.sourceKey,sourceType:d.sourceType,slug:g,marker:m,digest:S,title:d.title,...d.summary?{summary:d.summary}:{},content:T,tags:b},[...p.values()]);if(!P.allowed){P.mode==="pending-review"?s.reviewPending+=1:s.skipped+=1;continue}P.mode==="auto-approved"?s.autoApproved+=1:P.mode==="review-approved"&&(s.reviewApproved+=1),k?y?.digest!==S?(k=await i.updatePage(g,{title:d.title,summary:d.summary??"",content:T,tags:b}),p.set(k.slug,k),s.updated+=1,s.pages.push({sourceKey:d.sourceKey,sourceType:d.sourceType,slug:k.slug,action:"updated"})):(s.unchanged+=1,s.pages.push({sourceKey:d.sourceKey,sourceType:d.sourceType,slug:g,action:"unchanged"})):(k=await i.createPage({slug:g,title:d.title,summary:d.summary,content:T,tags:b}),p.set(k.slug,k),s.created+=1,s.pages.push({sourceKey:d.sourceKey,sourceType:d.sourceType,slug:k.slug,action:"created"}));let R=new Date().toISOString(),j={sourceKey:d.sourceKey,sourceType:d.sourceType,slug:g,digest:S,marker:m,updatedAt:R},x=c.entries.findIndex(z=>z.sourceKey===d.sourceKey);x>=0?c.entries[x]=j:c.entries.push(j),l.set(d.sourceKey,j),await a.markApplied(d.sourceKey,S)}catch(m){if(m instanceof M&&m.statusCode===409){s.skipped+=1;continue}s.failed+=1}let f=new Date().toISOString();return c.updatedAt=f,c.lastRunAt=f,c.entries.sort((d,m)=>d.sourceKey.localeCompare(m.sourceKey)),await Lc(t.storage,c),s}import{createHash as qc}from"node:crypto";import{chmodSync as uo,existsSync as Bc,mkdirSync as Vc,readFileSync as gg,readdirSync as yg,renameSync as Jc,statSync as hg,writeFileSync as Hc}from"node:fs";import{join as lo}from"node:path";var Gc="toolnet.skill-memory.v1",co=5,Uc=16,Yc=24,Xc=32;function Qc(t){return qc("sha256").update(t).digest("hex")}function Le(t,e=Number.MAX_SAFE_INTEGER){let n=new Set,r=[];for(let o of t){let s=o.replace(/\s+/gu," ").trim();if(!s)continue;let i=s.normalize("NFKC").toLowerCase();if(!n.has(i)&&(n.add(i),r.push(s),r.length>=e))break}return r}function hn(t,e=360){let n=t.replace(/\s+/gu," ").trim();return n.length<=e?n:n.slice(0,Math.max(0,e-1)).trimEnd()+"\u2026"}function Zc(t){return t.replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/giu,"Bearer [REDACTED]").replace(/\bsk-[A-Za-z0-9_-]{8,}\b/gu,"[REDACTED]").replace(/\b(api[_-]?key|token|password|passwd|secret)\b(\s*[:=]\s*)(["']?)[^\s"'`]+/giu,"$1$2[REDACTED]")}function B(t,e=360){return t&&hn(Zc(t),e)||void 0}function Ke(t,e){for(let n of e){let r=t[n];if(typeof r=="string"&&r.trim())return r}}function po(t,e){for(let n of e){let r=t[n];if(typeof r=="number"&&Number.isFinite(r))return r;if(typeof r=="string"&&r.trim()&&Number.isFinite(Number(r)))return Number(r)}}function fo(t,e){for(let n of e){let r=t[n];if(typeof r=="boolean")return r;if(typeof r=="string"){let o=r.trim().toLowerCase();if(["true","yes","pass","passed","success","succeeded","ok"].includes(o))return!0;if(["false","no","fail","failed","error"].includes(o))return!1}}}function mo(t){let e=t.data??{};if(fo(e,["passed","pass","success","succeeded","ok"])===!1)return!0;let r=po(e,["exitCode","exit_code","code","statusCode"]);if(r!==void 0&&r!==0)return!0;let o=Ke(e,["status","result","outcome"]);return!!(o&&/\b(fail(?:ed)?|error|broken|cancelled)\b/iu.test(o))}function $e(t){let e=t.data??{};if(mo(t))return!1;if(fo(e,["passed","pass","success","succeeded","ok"])===!0||po(e,["exitCode","exit_code","code","statusCode"])===0)return!0;let o=Ke(e,["status","result","outcome"]);return o&&/\b(pass(?:ed)?|success(?:ful)?|succeeded|ok|green|complete(?:d)?)\b/iu.test(o)?!0:t.type==="commit"||t.type==="deploy"}function go(t){let e=t.data??{},n=Ke(e,["path","file","filePath","filename","target"]);if(n)return B(n,260);let r=t.provenance?.files;return B(r?.[0],260)}function Sn(t){return B(Ke(t.data??{},["command","cmd","script"]),420)}function pe(t){return B(Ke(t.data??{},["name","test","suite","title","message","text","result","status"]),300)}function eu(t){let e=[];for(let n of[...t].sort((r,o)=>r.sequence-o.sequence))if($e(n)){if(n.type==="test"){let r=pe(n)??Sn(n)??"Tests passed";e.push(`Test passed: ${r}`);continue}if(n.type==="commit"){let r=pe(n);e.push(r?`Commit: ${r}`:"Commit completed");continue}if(n.type==="deploy"){let r=pe(n);e.push(r?`Deploy: ${r}`:"Deployment completed")}}return Le(e,10)}function tu(t,e){let n=[];for(let r of[...t].sort((o,s)=>o.sequence-s.sequence))switch(r.type){case"file_write":case"file_edit":{let o=go(r);o&&n.push(`Update ${o}`);break}case"command":{if(mo(r))break;let o=Sn(r);o&&n.push(`Run: ${o}`);break}case"test":{if(!$e(r))break;let o=pe(r)??Sn(r)??"project tests";n.push(`Verify: ${o}`);break}case"commit":{if(!$e(r))break;let o=pe(r);n.push(o?`Commit: ${o}`:"Commit verified changes");break}case"deploy":{if(!$e(r))break;let o=pe(r);n.push(o?`Deploy: ${o}`:"Deploy verified build");break}default:break}if(n.length===0)for(let r of e.files.slice(0,8)){let o=B(r,260);o&&n.push(`Update ${o}`)}return Le(n,Uc)}function nu(t,e){let n=[...e.files];for(let r of t){let o=go(r);o&&n.push(o);for(let s of r.provenance?.files??[]){let i=B(s,260);i&&n.push(i)}}return Le(n,Yc)}function ru(t){return Le(t.filter(e=>["file_write","file_edit","command","test","commit","deploy"].includes(e.type)).map(e=>e.id),Xc)}function ou(t){return t.map(n=>n.timestamp).filter(Boolean).sort().at(-1)??new Date(0).toISOString()}function yo(t,e,n){if(e.length===0)return[];let r=eu(e),o=Le(n.completed.map(m=>B(m,280)??""),co);if(!(o.length>0||e.some(m=>["test","commit","deploy"].includes(m.type)&&$e(m))))return[];let i=B(n.task,280)??B(n.nextActions[0],280),a=o.length>0?o:i?[i]:[];if(a.length===0)return[];let c=tu(e,n);if(c.length===0)return[];let u=nu(e,n),p=ru(e),l=Math.min(...e.map(m=>m.sequence)),f=Math.max(...e.map(m=>m.sequence)),d=ou(e);return a.slice(0,co).map(m=>{let S=[`Reusable procedure learned from successful task: ${m}.`,u.length>0?`Files: ${u.slice(0,6).join(", ")}.`:"",r.length>0?`Verification: ${r.slice(0,4).join("; ")}.`:""].filter(Boolean),y=JSON.stringify({projectId:t.projectId,task:m,steps:c,verification:r,files:u}),g=Qc(y);return{schema:Gc,version:1,id:`skill-${g.slice(0,24)}`,fingerprint:g,projectId:t.projectId,title:hn(`SOP: ${m}`,180),task:m,summary:hn(S.join(" "),900),steps:c,verification:r,files:u,source:{agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,firstSequence:l,lastSequence:f,eventIds:p},createdAt:d}})}function su(t){return lo(t.rootPath,".toolnet","memory","skills")}function iu(t){let e=su(t);return Vc(e,{recursive:!0,mode:448}),uo(e,448),e}function ho(t,e){if(e.length===0)return{written:0,deduped:0,files:[]};let n=iu(t),r=0,o=0,s=[];for(let i of e){if(i.projectId!==t.id)throw new Error(`Skill project mismatch: ${i.projectId} != ${t.id}`);let a=lo(n,`${i.id}.json`);if(s.push(a),Bc(a)){o+=1;continue}let c=`${a}.${process.pid}.${Date.now()}.tmp`;Hc(c,JSON.stringify(i,null,2)+`
`,{encoding:"utf8",mode:384}),Jc(c,a),uo(a,384),r+=1}return{written:r,deduped:o,files:s}}function So(t){return String(t).padStart(12,"0")}function au(t){return`projects/${t.projectId}/memory/learned`}var vt=class{constructor(e){this.storage=e}storage;async write(e,n,r){if(r.length===0||n.length===0)return null;let o=Math.min(...n.map(l=>l.sequence)),s=Math.max(...n.map(l=>l.sequence)),i={version:1,projectId:e.projectId,agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,createdAt:new Date().toISOString(),firstSequence:o,lastSequence:s,candidateCount:r.length,candidates:r},a=JSON.stringify(i,null,2)+`
`,c=w(r.map(l=>l.fingerprint).sort().join("|")).slice(0,16),u=w(e.sessionKey).slice(0,12),p=[au(e),"batches",`${So(o)}-${So(s)}-${u}-${c}.json`].join("/");return await this.storage.exists(p)||await this.storage.put(p,a,"application/json"),p}};import{createHash as cu}from"node:crypto";function ko(t){return String(t).padStart(12,"0")}function vo(t){return cu("sha256").update(t).digest("hex")}function uu(t){return`projects/${t.projectId}/memory/hierarchy`}var wt=class{constructor(e){this.storage=e}storage;async write(e,n,r){if(n.length===0||r.facts.length===0)return null;let o=Math.min(...n.map(p=>p.sequence)),s=Math.max(...n.map(p=>p.sequence)),i={schema:"toolnet.memory-hierarchy-batch.v1",version:1,projectId:e.projectId,agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,createdAt:new Date().toISOString(),firstSequence:o,lastSequence:s,hierarchy:r},a=vo([...r.facts.map(p=>p.id),...r.knowledge.map(p=>p.id)].sort().join("|")).slice(0,16),c=vo(e.sessionKey).slice(0,12),u=[uu(e),"batches",`${ko(o)}-${ko(s)}-${c}-${a}.json`].join("/");return await this.storage.exists(u)||await this.storage.put(u,`${JSON.stringify(i,null,2)}
`,"application/json"),u}};function gu(t,e){if(!du(t))return{events:[],nextOffset:e};let n=mu(t).size,r=Number.isFinite(e)?Math.max(0,e):0;if(r>n&&(r=0),r===n)return{events:[],nextOffset:n};let o=n-r,s=Buffer.alloc(o),i=pu(t,"r");try{fu(i,s,0,o,r)}finally{lu(i)}let a=s.toString("utf8"),c=a.lastIndexOf(`
`);if(c<0)return{events:[],nextOffset:r};let u=a.slice(0,c+1);return{events:u.split(`
`).filter(Boolean).flatMap(l=>{try{return[JSON.parse(l)]}catch{return[]}}),nextOffset:r+Buffer.byteLength(u,"utf8")}}var bt=class{constructor(e){this.options=e;this.journal=new vt(e.storage),this.hierarchyJournal=new wt(e.storage)}options;journal;hierarchyJournal;async learnNew(){let e=this.options.wal.loadState(),n=Number(e.sourceCursors["memory.learner.offset"]??0),r=Number.isFinite(n)?n:0,o=gu(this.options.wal.eventsFile,r);if(o.events.length===0)return{scannedEvents:0,candidates:0,journalWritten:!1,nextOffset:o.nextOffset};let s=ft(this.options.identity,o.events),i=s.candidates,a=!1;i.length>0&&(a=!!await this.journal.write(this.options.identity,o.events,i));let c=!1;s.hierarchy.facts.length>0&&(c=!!await this.hierarchyJournal.write(this.options.identity,o.events,s.hierarchy));let u=yo(this.options.identity,o.events,s.state),p=ho(this.options.project,u);this.options.wal.setSourceCursor("memory.pipeline.version",2),this.options.wal.setSourceCursor("memory.pipeline.normalized_events",s.stats.normalizedEvents),this.options.wal.setSourceCursor("memory.pipeline.persisted",s.stats.persistedCandidates),this.options.wal.setSourceCursor("memory.pipeline.permanent",s.stats.permanent),this.options.wal.setSourceCursor("memory.pipeline.task",s.stats.task),this.options.wal.setSourceCursor("memory.pipeline.session",s.stats.session),this.options.wal.setSourceCursor("memory.pipeline.transient",s.stats.transient),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.version",s.hierarchy.version),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.raw",s.hierarchy.stats.raw),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.facts",s.hierarchy.stats.facts),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.scenes",s.hierarchy.stats.scenes),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.knowledge",s.hierarchy.stats.knowledge),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.journal_written",c?1:0),this.options.wal.setSourceCursor("memory.skill.assets",u.length),this.options.wal.setSourceCursor("memory.skill.written",p.written),this.options.wal.setSourceCursor("memory.skill.deduped",p.deduped);try{let l=Dr(this.options.project.rootPath,o.events);this.options.wal.setSourceCursor("memory.context_offload.eligible",l.eligible),this.options.wal.setSourceCursor("memory.context_offload.written",l.written),this.options.wal.setSourceCursor("memory.context_offload.deduped",l.deduped),this.options.wal.setSourceCursor("memory.context_offload.graph_nodes",l.graphNodes),this.options.wal.setSourceCursor("memory.context_offload.failed",0)}catch{this.options.wal.setSourceCursor("memory.context_offload.failed",1)}try{let l=await ao({project:this.options.project,storage:this.options.storage,hierarchy:s.hierarchy});this.options.wal.setSourceCursor("memory.wiki_automation.scanned",l.scanned),this.options.wal.setSourceCursor("memory.wiki_automation.eligible",l.eligible),this.options.wal.setSourceCursor("memory.wiki_automation.created",l.created),this.options.wal.setSourceCursor("memory.wiki_automation.updated",l.updated),this.options.wal.setSourceCursor("memory.wiki_automation.unchanged",l.unchanged),this.options.wal.setSourceCursor("memory.wiki_automation.skipped",l.skipped),this.options.wal.setSourceCursor("memory.wiki_automation.failed",l.failed),this.options.wal.setSourceCursor("memory.wiki_automation.review_pending",l.reviewPending),this.options.wal.setSourceCursor("memory.wiki_automation.auto_approved",l.autoApproved),this.options.wal.setSourceCursor("memory.wiki_automation.review_approved",l.reviewApproved)}catch{this.options.wal.setSourceCursor("memory.wiki_automation.failed",1)}return this.options.wal.setSourceCursor("memory.learner.offset",o.nextOffset),{scannedEvents:o.events.length,candidates:i.length,journalWritten:a,nextOffset:o.nextOffset}}};import{closeSync as Tu,existsSync as Ru,openSync as Nu,readSync as _u,statSync as $u}from"node:fs";function wo(t){return t&&typeof t=="object"&&!Array.isArray(t)?t:null}function De(t){return t.toLowerCase().replace(/[^a-z0-9]/gu,"")}function Fe(t,e,n=0){if(n>8)return;if(Array.isArray(t)){for(let o of t.slice(0,50))Fe(o,e,n+1);return}let r=wo(t);if(r)for(let[o,s]of Object.entries(r))e(o,s,r),Fe(s,e,n+1)}function fe(t,e){let n=[];return Fe(t,(r,o)=>{e.has(De(r))&&typeof o=="string"&&o.trim()&&n.push(o.trim())}),n}function yu(t){let e=t.trim();if(!e.startsWith("{"))return null;try{return wo(JSON.parse(e))}catch{return null}}function hu(t){let e=t.data;for(let r of["tool","toolName","tool_name"]){let o=e[r];if(typeof o=="string"&&o.trim())return o.trim().toLowerCase()}let n="";return Fe(e,(r,o,s)=>{if(n)return;let i=De(r);if(["tool","toolname"].includes(i)&&typeof o=="string"){n=o.trim().toLowerCase();return}if(i!=="name"||typeof o!="string")return;let a=typeof s.type=="string"?s.type.toLowerCase():"";(a.includes("tool")||a.includes("function")||a.includes("command"))&&(n=o.trim().toLowerCase())}),n}function Su(t){let e=fe(t.data,new Set(["command","cmd","script"])),n=fe(t.data,new Set(["arguments","args"]));for(let r of n){let o=yu(r);if(o)for(let s of fe(o,new Set(["command","cmd","script"])))e.push(s)}return Array.from(new Set(e.map(r=>r.trim()).filter(Boolean)))}function ku(t){let e=fe(t.data,new Set(["filepath","file_path","filename","file","path","target"].map(De)));return Array.from(new Set(e.map(n=>n.trim()).filter(n=>n.length>0&&n.length<1e3&&!n.includes(`
`))))}function vu(t,e){return t.type==="file_edit"||t.type==="file_write"?"modified":/\b(delete|remove|unlink)\b/iu.test(e)?"deleted":/\b(create|add[_-]?file|new[_-]?file)\b/iu.test(e)?"created":/\b(edit|write|patch|apply[_-]?patch|replace|update[_-]?file)\b/iu.test(e)?"modified":null}function wu(t){let e=fe(t.data,new Set(["patch","diff","arguments","input"].map(De))),n=[];for(let r of e){let o=[{regex:/^\*\*\* Update File:\s*(.+)$/gimu,action:"modified"},{regex:/^\*\*\* Add File:\s*(.+)$/gimu,action:"created"},{regex:/^\*\*\* Delete File:\s*(.+)$/gimu,action:"deleted"}];for(let s of o)for(let i of r.matchAll(s.regex)){let a=i[1]?.trim();a&&n.push({kind:"file",text:a,fileAction:s.action,confidence:.99})}}return n}function bu(t){let e=t.toLowerCase();return/\b(typecheck|type-check)\b/u.test(e)||/\btsc\b[\s\S]*--noemit\b/u.test(e)?"typecheck":/\b(eslint|lint)\b/u.test(e)?"lint":/\b(vitest|jest|pytest)\b/u.test(e)||/\bgo\s+test\b/u.test(e)||/\bcargo\s+test\b/u.test(e)||/\b(npm|pnpm|yarn)\s+(run\s+)?test\b/u.test(e)?"test":/\b(npm|pnpm|yarn)\s+(run\s+)?build\b/u.test(e)||/\bcargo\s+build\b/u.test(e)||/\bgo\s+build\b/u.test(e)||/\btsc\b/u.test(e)?"build":null}function xu(t){let e=null;return Fe(t,(n,r)=>{if(e===null&&["exitcode","code"].includes(De(n))){if(typeof r=="number"&&Number.isFinite(r)){e=r;return}if(typeof r=="string"){let o=Number(r);Number.isFinite(o)&&(e=o)}}}),e}function Cu(t){return fe(t,new Set(["status","state","result","output","outputsummary","message","text"]))}function ju(t){let e=xu(t.data);if(e!==null)return e===0?"passed":"failed";let n=Cu(t.data).join(`
`).toLowerCase();return/\b(error|failed|failure|failing)\b/u.test(n)&&!/\b0\s+failed\b/u.test(n)?"failed":/\b(success|successful|completed|passed|green)\b/u.test(n)||/\b\d+\s+passed\b/u.test(n)?"passed":/\b(running|started|in[_ -]?progress)\b/u.test(n)?"running":"unknown"}function Iu(t){let e=[],n=new Set;for(let r of t){let o=[r.kind,r.fileAction??"",r.checkKind??"",r.checkStatus??"",r.text].join("|");n.has(o)||(n.add(o),e.push(r))}return e}function bo(t){let e=[],n=hu(t),r=vu(t,n);if(r)for(let o of ku(t))e.push({kind:"file",text:o,fileAction:r,confidence:t.type==="file_edit"||t.type==="file_write"?1:.96});e.push(...wu(t));for(let o of Su(t)){e.push({kind:"command",text:o,confidence:.98});let s=bu(o);s&&e.push({kind:"test",text:o,checkKind:s,checkStatus:ju(t),confidence:.98})}return Iu(e)}var Mu=new Set(["content","text","message","prompt","summary","description","title","reason","last_assistant_message","lastAssistantMessage"]);function se(t){return t.normalize("NFKC").replace(/\s+/g," ").replace(/^[\s>*#•-]+/u,"").trim()}function Co(t){return se(t).toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim()}function oe(t,e,n=0){if(!(n>6)){if(typeof t=="string"){e.push(t);return}if(Array.isArray(t)){for(let r of t.slice(0,50))oe(r,e,n+1);return}if(!(!t||typeof t!="object"))for(let[r,o]of Object.entries(t))(Mu.has(r)||["data","payload","parts","messages"].includes(r))&&oe(o,e,n+1)}}function xt(t){return/\b(cancelled|canceled)\b|đã hủy|bỏ qua/iu.test(t)?"cancelled":/\b(blocked|blocker)\b|đang vướng|bị vướng|đang kẹt|chưa thể/iu.test(t)?"blocked":/\b(completed|complete|done|finished|passed)\b|hoàn thành|hoàn tất|đã xong|đã làm xong|\bxong\b/iu.test(t)?"completed":/\bin[\s_-]*progress\b|working on|đang làm|đang thực hiện|đang xử lý|đang triển khai/iu.test(t)?"in_progress":"pending"}function xo(t){let e=se(t);return/^(?:đang\s+làm|đang\s+thực\s+hiện|đang\s+xử\s+lý|đang\s+triển\s+khai|hoàn\s+thành|hoàn\s+tất|đã\s+xong|đã\s+làm\s+xong|xong|pending|in[\s_-]*progress|completed|complete|done|finished|blocked|cancelled|canceled)[.!]*$/iu.test(e)}function A(t,e,n,r,o={}){let s=se(r),i=o.key??Co(s);return{version:1,id:w([t.projectId,n,i,e.id,s,o.status??"",o.fileAction??"",o.checkKind??"",o.checkStatus??"",o.order??""].join("|")).slice(0,32),projectId:t.projectId,kind:n,key:i,text:s,status:o.status,fileAction:o.fileAction,checkKind:o.checkKind,checkStatus:o.checkStatus,order:o.order,confidence:o.confidence??.85,occurredAt:e.timestamp,sequence:e.sequence,agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,eventId:e.id,sourceEventId:e.sourceEventId}}function Au(t,e,n){let r=se(n);if(r.length<5||r.length>1200)return[];let o=[],s=/^(?:next|next action|next step|tiếp theo|bước tiếp theo|cần làm tiếp)\b/iu.test(r),i=r.match(/^(?:mục tiêu|goal|objective)\s*(?::|-)\s*(.+)$/iu);i?.[1]&&o.push(A(t,e,"goal",i[1],{confidence:.97}));let a=r.match(/^(?:kế hoạch|plan)\s*(?::|-)\s*(.+)$/iu);a?.[1]&&o.push(A(t,e,"plan",a[1],{confidence:.95}));let c=/\b(?:phase|giai đoạn|giai doan|stage)\s*(\d+)\s*(?:[:\-–—]\s*)?([^.;\n]{0,220})/giu,u;for(;!s&&(u=c.exec(r));){let f=Number(u[1]),d=se(u[2]??""),m=d&&!xo(d)?`Phase ${f} - ${d}`:`Phase ${f}`;o.push(A(t,e,"phase",m,{key:`phase:${f}`,order:f,status:xt(r),confidence:.93}))}let p=n.match(/^\s*[-*]\s*\[([ xX])\]\s*(.+)$/u);p?.[2]&&o.push(A(t,e,"task",p[2],{status:p[1].trim()?"completed":xt(p[2]),confidence:.96}));let l=r.match(/^(?:todo|task|việc)\s*(\d+)?(?:\s*[:.\-–—]\s*|\s+)(.+)$/iu);if(l?.[2]){let f=l[1]?Number(l[1]):void 0,d=se(l[2]),m=xo(d);o.push(A(t,e,"task",m&&f!==void 0?`TODO ${f}`:d,{key:f!==void 0?`task:${f}`:Co(d),order:f,status:xt(r),confidence:.93}))}if(/^(?:next|next action|next step|tiếp theo|bước tiếp theo|cần làm tiếp)\b/iu.test(r)){let f=r.replace(/^(?:next|next action|next step|tiếp theo|bước tiếp theo|cần làm tiếp)\s*(?::|-)?\s*/iu,"");f&&o.push(A(t,e,"next_action",f,{confidence:.9}))}return/\b(blocker|blocked)\b|đang vướng|bị vướng|đang kẹt/iu.test(r)&&o.push(A(t,e,"blocker",r,{confidence:.9})),/\b(chú ý|lưu ý|warning|attention|cẩn thận)\b/iu.test(r)&&o.push(A(t,e,"warning",r,{confidence:.88})),/\b(chốt|quyết định|decided|decision)\b/iu.test(r)&&o.push(A(t,e,"decision",r,{confidence:.9})),r.length<=300&&/^(?:đang\s+(?:sửa|cập nhật|triển khai|xử lý|làm|refactor|fix)|(?:i(?:'m| am)\s+)?(?:working on|implementing|fixing|refactoring|updating|editing)\b)/iu.test(r)&&o.push(A(t,e,"activity",r,{confidence:.86})),o}function Ct(t,e){if(e.length===0)return[];let n=[],r=new Set;function o(i){r.has(i.id)||(r.add(i.id),n.push(i))}for(let i of e){if(i.type==="user_prompt"||i.role==="user"){let c=[];oe(i.data,c);let u=c.map(p=>se(p)).find(p=>p.length>=8&&p.length<=1200&&!/^\[?toolnet\b/iu.test(p));u&&o(A(t,i,"request",u,{confidence:.96}))}for(let c of bo(i))o(A(t,i,c.kind,c.text,{fileAction:c.fileAction,checkKind:c.checkKind,checkStatus:c.checkStatus,status:c.kind==="test"?c.checkStatus==="passed"?"completed":c.checkStatus==="failed"?"blocked":c.checkStatus==="running"?"in_progress":"pending":void 0,confidence:c.confidence}));if(i.type==="decision"){let c=[];oe(i.data,c);for(let u of c)o(A(t,i,"decision",u,{confidence:1}))}if(i.type==="todo"){let c=[];oe(i.data,c);for(let u of c)o(A(t,i,"task",u,{status:xt(u),confidence:1}))}if(["file_write","file_edit"].includes(i.type))for(let c of["filePath","path","file"]){let u=i.data[c];typeof u=="string"&&u&&o(A(t,i,"file",u,{fileAction:"modified",confidence:1}))}if(i.type==="test"){let c=[];oe(i.data,c);for(let u of c)o(A(t,i,"test",u,{confidence:1}))}let a=[];oe(i.data,a);for(let c of a)for(let u of c.split(/\n+/u))for(let p of Au(t,i,u))o(p)}let s=e[e.length-1];return o(A(t,s,"session",`${t.agent}:${t.nativeSessionId}`,{key:t.sessionKey,confidence:1})),n}function jo(t){return String(t).padStart(12,"0")}var jt=class{constructor(e){this.storage=e}storage;async write(e,n){if(n.length===0)return null;let r=Math.min(...n.map(p=>p.sequence)),o=Math.max(...n.map(p=>p.sequence)),s={version:1,projectId:e.projectId,agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,createdAt:n.map(p=>p.occurredAt).sort().at(-1)??new Date().toISOString(),firstSequence:r,lastSequence:o,observations:n},i=JSON.stringify(s,null,2)+`
`,a=w(n.map(p=>JSON.stringify(p)).sort().join(`
`)).slice(0,24),c=w(e.sessionKey).slice(0,12),u=[`projects/${e.projectId}`,"work","observations",`${jo(r)}-${jo(o)}-${c}-${a}.json`].join("/");return await this.storage.put(u,i,"application/json"),u}};import{join as Io}from"node:path";import{mkdirSync as Eu}from"node:fs";function Ao(t){return t.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim()}function F(t,e=20){let n=[],r=new Set;for(let o of t.slice().reverse()){let s=Ao(o);if(!(!s||r.has(s))&&(r.add(s),n.push(o),n.length>=e))break}return n.reverse()}function Pu(t,e=20){let n=new Map;for(let r of t){let o=`${r.kind}|${Ao(r.command)}`;n.delete(o),n.set(o,r)}return Array.from(n.values()).slice(-e)}function Ou(t){return t.kind==="phase"?/^Phase\s+\d+$/iu.test(t.text):t.kind==="task"?/^(?:TODO|Task|Việc)\s+\d+$/iu.test(t.text):!1}function Mo(t,e){let n=e.status??t?.status??"pending",r=n;t&&(t.status==="completed"&&n!=="completed"?r="completed":n==="pending"&&(t.status==="in_progress"||t.status==="blocked")&&(r=t.status));let o=t&&Ou(e)?t.title:e.text;return{id:t?.id??w(e.key).slice(0,24),title:o,status:r,order:e.order??t?.order,confidence:Math.max(e.confidence,t?.confidence??0),updatedAt:e.occurredAt,updatedBy:{agent:e.agent,nativeSessionId:e.nativeSessionId,eventId:e.eventId}}}async function Eo(t,e){let n=`projects/${t.id}/work/observations/`,r=await e.list(n),o=[];for(let s of r.filter(i=>i.key.endsWith(".json")).sort((i,a)=>i.key.localeCompare(a.key))){let i=await e.getText(s.key);if(i)try{let a=JSON.parse(i);a.version===1&&Array.isArray(a.observations)&&o.push(a)}catch{}}return o}async function We(t,e){let r=(await Eo(t,e)).flatMap(h=>h.observations).sort((h,v)=>{let O=h.occurredAt.localeCompare(v.occurredAt);if(O!==0)return O;let V=h.sequence-v.sequence;return V!==0?V:h.id.localeCompare(v.id)}),o=new Map,s=new Map,i,a,c,u,p,l=[],f=[],d=[],m=[],S=[],y=new Map,g=[],k=[],b=[],T=[],P=[],R=[];for(let h of r)switch(h.kind){case"request":i=h.text;break;case"activity":a=h.text;break;case"goal":c=h.text;break;case"plan":u=h.text;break;case"phase":o.set(h.key,Mo(o.get(h.key),h));break;case"task":s.set(h.key,Mo(s.get(h.key),h));break;case"decision":l.push(h.text);break;case"blocker":f.push(h.text);break;case"warning":d.push(h.text);break;case"next_action":m.push(h.text);break;case"file":{S.push(h.text);let v=h.fileAction??"active";y.delete(h.text),y.set(h.text,v),v==="modified"?g.push(h.text):v==="created"?k.push(h.text):v==="deleted"&&b.push(h.text);break}case"command":T.push(h.text);break;case"test":P.push(h.text),h.checkKind&&R.push({kind:h.checkKind,command:h.text,status:h.checkStatus??"unknown",updatedAt:h.occurredAt,agent:h.agent,nativeSessionId:h.nativeSessionId});break;case"session":p={agent:h.agent,nativeSessionId:h.nativeSessionId,sessionKey:h.sessionKey,updatedAt:h.occurredAt};break}let j=Array.from(o.values()).sort((h,v)=>(h.order??Number.MAX_SAFE_INTEGER)-(v.order??Number.MAX_SAFE_INTEGER)),x=Array.from(s.values()).sort((h,v)=>(h.order??Number.MAX_SAFE_INTEGER)-(v.order??Number.MAX_SAFE_INTEGER)),z=j.find(h=>h.status==="in_progress")??j.find(h=>h.status==="blocked")??j.find(h=>h.status==="pending"),q=x.find(h=>h.status==="in_progress")??x.find(h=>h.status==="blocked")??x.find(h=>h.status==="pending"),zt=F([...m,...q?[q.title]:[],...!q&&z?[z.title]:[],...x.filter(h=>h.status==="pending").slice(0,5).map(h=>h.title)],8),qt=F([...f,...j.filter(h=>h.status==="blocked").map(h=>h.title),...x.filter(h=>h.status==="blocked").map(h=>h.title)],20),ke={version:1,projectId:t.id,projectName:t.name,currentRequest:i,currentActivity:a,goal:c,plan:u,phases:j,tasks:x,decisions:F(l,20),blockers:qt,warnings:F(d,20),nextActions:zt,filesTouched:F(S,30),activeFiles:Array.from(y.entries()).filter(([,h])=>h!=="deleted").map(([h])=>h).slice(-5),modifiedFiles:F(g,30),createdFiles:F(k,30),deletedFiles:F(b,30),commands:F(T,20),tests:F(P,20),checks:Pu(R,20),currentPhase:z,currentTask:q,progress:{phasesTotal:j.length,phasesCompleted:j.filter(h=>h.status==="completed").length,tasksTotal:x.length,tasksCompleted:x.filter(h=>h.status==="completed").length,blocked:j.filter(h=>h.status==="blocked").length+x.filter(h=>h.status==="blocked").length},lastSession:p,updatedAt:r.length?r[r.length-1].occurredAt:new Date().toISOString()},Je=Io(t.rootPath,".toolnet","work");return Eu(Je,{recursive:!0}),N(Io(Je,"current.json"),ke),await e.put(`projects/${t.id}/work/current.json`,JSON.stringify(ke,null,2)+`
`,"application/json"),ke}async function It(t,e){if((await Eo(t,e)).length>0)return We(t,e);let r=await e.getText(`projects/${t.id}/work/current.json`);if(!r)return null;try{return JSON.parse(r)}catch{return null}}function Lu(t,e){if(!Ru(t))return{events:[],nextOffset:e};let n=$u(t).size,r=Number.isFinite(e)?Math.max(0,e):0;if(r>n&&(r=0),r===n)return{events:[],nextOffset:n};let o=n-r,s=Buffer.alloc(o),i=Nu(t,"r");try{_u(i,s,0,o,r)}finally{Tu(i)}let a=s.toString("utf8"),c=a.lastIndexOf(`
`);if(c<0)return{events:[],nextOffset:r};let u=a.slice(0,c+1);return{events:u.split(`
`).filter(Boolean).flatMap(l=>{try{return[JSON.parse(l)]}catch{return[]}}),nextOffset:r+Buffer.byteLength(u,"utf8")}}var Mt=class{constructor(e){this.options=e;this.journal=new jt(e.storage)}options;journal;async learnNew(){let e=this.options.wal.loadState(),n=Number(e.sourceCursors["work.continuity.offset"]??0),r=Lu(this.options.wal.eventsFile,Number.isFinite(n)?n:0);if(r.events.length===0)return{scannedEvents:0,observations:0,journalWritten:!1,reconciled:!1,nextOffset:r.nextOffset};let o=Ct(this.options.identity,r.events),s=!1,i=!1;return o.length>0&&(s=!!await this.journal.write(this.options.identity,o),s&&(await We(this.options.project,this.options.storage),i=!0)),this.options.wal.setSourceCursor("work.continuity.offset",r.nextOffset),{scannedEvents:r.events.length,observations:o.length,journalWritten:s,reconciled:i,nextOffset:r.nextOffset}}};import{closeSync as Ju,existsSync as Hu,openSync as Gu,readSync as Uu,statSync as Yu}from"node:fs";var Ku=new Set(["content","text","message","prompt","summary","description","title","reason","last_assistant_message","lastAssistantMessage"]);function me(t){return t.normalize("NFKC").replace(/\s+/g," ").replace(/^[\s>*#•-]+/u,"").trim()}function kn(t,e,n=0){if(!(n>6)){if(typeof t=="string"){e.push(t);return}if(Array.isArray(t)){for(let r of t.slice(0,50))kn(r,e,n+1);return}if(!(!t||typeof t!="object"))for(let[r,o]of Object.entries(t))(Ku.has(r)||["data","payload","parts","messages"].includes(r))&&kn(o,e,n+1)}}function $(t,e,n,r,o,s=.95){let i=me(r);return{version:1,id:w([t.projectId,n,o.type,o.key??"",i.toLowerCase(),e.id].join("|")).slice(0,32),projectId:t.projectId,kind:n,value:i,scope:o.type,scopeKey:o.key,scopeOrder:o.order,confidence:s,evidence:{agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,eventId:e.id,sourceEventId:e.sourceEventId,sequence:e.sequence,occurredAt:e.timestamp}}}function D(t,e){let n=t.toLowerCase();for(let r of e){let o=r.toLowerCase();if(n.startsWith(`${o}:`)||n.startsWith(`${o} -`)||n.startsWith(`${o} \u2014`))return me(t.slice(r.length+1))}return null}function Fu(t){let e=t.trimStart();return e.startsWith("- ")||e.startsWith("* ")||/^\d+[.)]\s+/u.test(e)}function Du(t){return me(t.trim().replace(/^[-*]\s+/u,"").replace(/^\d+[.)]\s+/u,""))}function Po(t,e){let n=[],r=new Set;function o(s){!s.value||s.value.length<3||r.has(s.id)||(r.add(s.id),n.push(s))}for(let s of e){let i=[];kn(s.data,i);for(let a of i){let c={type:"project"},u=null;for(let p of a.split(/\r?\n/u)){let l=me(p);if(!l){u=null;continue}let f=l.match(/^(?:phase|giai đoạn|giai doan|stage)\s*(\d+)\s*(?:[:\-–—]\s*)?(.*)$/iu);if(f){let x=Number(f[1]);c={type:"phase",key:`phase:${x}`,order:x,title:me(f[2]??"")},u=null;continue}let d=l.match(/^(?:todo|task|việc)\s*(\d+)\s*(?:[:\-–—]\s*)?(.*)$/iu);if(d){let x=Number(d[1]);c={type:"task",key:`task:${x}`,order:x,title:me(d[2]??"")},u=null;continue}let m=D(l,["mission","s\u1EE9 m\u1EC7nh","m\u1EE5c ti\xEAu t\u1ED5ng th\u1EC3","m\u1EE5c ti\xEAu project","project goal"]);if(m){o($(t,s,"mission",m,{type:"project"},.99)),u=null;continue}let S=D(l,["current objective","active objective","m\u1EE5c ti\xEAu hi\u1EC7n t\u1EA1i","objective","m\u1EE5c ti\xEAu","m\u1EE5c \u0111\xEDch"]);if(S){o($(t,s,c.type==="phase"?"phase_objective":"objective",S,c,.98)),u=null;continue}let y=D(l,["why","why this","why this phase","reason","rationale","v\xEC sao","l\xFD do","t\u1EA1i sao","\xFD ngh\u0129a"]);if(y){o($(t,s,c.type==="phase"?"phase_why":"why",y,c,.98)),u=null;continue}let g=D(l,["desired outcome","final outcome","k\u1EBFt qu\u1EA3 cu\u1ED1i","k\u1EBFt qu\u1EA3 mong mu\u1ED1n","m\u1EE5c ti\xEAu cu\u1ED1i"]);if(g){o($(t,s,"desired_outcome",g,{type:"project"},.98)),u=null;continue}let k=D(l,["plan rationale","approach rationale","why this approach","t\u1EA1i sao ch\u1ECDn h\u01B0\u1EDBng n\xE0y","l\xFD do ch\u1ECDn h\u01B0\u1EDBng n\xE0y","l\xFD do ch\u1ECDn ki\u1EBFn tr\xFAc"]);if(k){o($(t,s,"plan_rationale",k,{type:"project"},.98)),u=null;continue}let b=D(l,["deliverable","output","k\u1EBFt qu\u1EA3 c\u1EA7n \u0111\u1EA1t","ph\u1EA3i t\u1EA1o ra","\u0111\u1EA7u ra"]);if(b){o($(t,s,"phase_deliverable",b,c,.97)),u=null;continue}let T=D(l,["acceptance criteria","definition of done","done khi","ho\xE0n th\xE0nh khi","ti\xEAu ch\xED ho\xE0n th\xE0nh"]);if(T){o($(t,s,"acceptance_criterion",T,c,.98)),u="acceptance_criterion";continue}let P=D(l,["depends on","dependency","dependencies","ph\u1EE5 thu\u1ED9c","c\u1EA7n c\xF3 tr\u01B0\u1EDBc"]);if(P){o($(t,s,"dependency",P,c,.97)),u="dependency";continue}let R=D(l,["open question","open questions","c\xE2u h\u1ECFi m\u1EDF","ch\u01B0a quy\u1EBFt \u0111\u1ECBnh","ch\u01B0a r\xF5"]);if(R){o($(t,s,"open_question",R,c,.95)),u="open_question";continue}let j=D(l,["constraint","constraints","r\xE0ng bu\u1ED9c","gi\u1EDBi h\u1EA1n"]);if(j){o($(t,s,"constraint",j,c,.97)),u="constraint";continue}if(/^(?:acceptance criteria|definition of done|done khi|tiêu chí hoàn thành)\s*:?\s*$/iu.test(l)){u="acceptance_criterion";continue}if(/^(?:dependencies|dependency|phụ thuộc)\s*:?\s*$/iu.test(l)){u="dependency";continue}if(/^(?:open questions|open question|câu hỏi mở)\s*:?\s*$/iu.test(l)){u="open_question";continue}if(/^(?:constraints|constraint|ràng buộc)\s*:?\s*$/iu.test(l)){u="constraint";continue}if(u&&Fu(p)){o($(t,s,u,Du(p),c,.96));continue}u=null}}}return n}function Oo(t){return String(t).padStart(12,"0")}var At=class{constructor(e){this.storage=e}storage;async write(e,n){if(n.length===0)return null;let r=Math.min(...n.map(u=>u.evidence.sequence)),o=Math.max(...n.map(u=>u.evidence.sequence)),s={version:1,projectId:e.projectId,agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,firstSequence:r,lastSequence:o,createdAt:new Date().toISOString(),observations:n},i=w(n.map(u=>u.id).sort().join("|")).slice(0,16),a=w(e.sessionKey).slice(0,12),c=[`projects/${e.projectId}`,"work","semantic","observations",`${Oo(r)}-${Oo(o)}-${a}-${i}.json`].join("/");return await this.storage.exists(c)||await this.storage.put(c,JSON.stringify(s,null,2)+`
`,"application/json"),c}};import{mkdirSync as Wu}from"node:fs";import{join as To}from"node:path";function zu(t){return{value:t.value,confidence:t.confidence,evidence:t.evidence}}function qu(t,e){if(!e)return!0;let n=t.evidence.occurredAt.localeCompare(e.evidence.occurredAt);return n!==0?n>0:t.evidence.sessionKey===e.evidence.sessionKey?t.evidence.sequence>=e.evidence.sequence:t.confidence>=e.confidence}function U(t,e){return qu(e,t)?e:t}function Y(t,e=30){let n=new Set,r=[];for(let o of t){let s=o.value.normalize("NFKC").toLowerCase().replace(/\s+/g," ").trim();!s||n.has(s)||(n.add(s),r.push(o))}return r.slice(-e)}async function Bu(t,e){let n=`projects/${t.id}/work/semantic/observations/`,r=await e.list(n),o=[];for(let s of r.filter(i=>i.key.endsWith(".json")).sort((i,a)=>i.key.localeCompare(a.key))){let i=await e.getText(s.key);if(i)try{let a=JSON.parse(i);a.version===1&&Array.isArray(a.observations)&&o.push(a)}catch{}}return o}function Vu(t){return{key:t.scopeKey??`phase:${t.scopeOrder??0}`,order:t.scopeOrder??0,acceptanceCriteria:[],dependencies:[],openQuestions:[],constraints:[],notes:[]}}async function Ro(t,e){let r=(await Bu(t,e)).flatMap(S=>S.observations).sort((S,y)=>{let g=S.evidence.occurredAt.localeCompare(y.evidence.occurredAt);return g!==0?g:S.evidence.sessionKey===y.evidence.sessionKey?S.evidence.sequence-y.evidence.sequence:S.id.localeCompare(y.id)}),o,s,i,a,c,u=new Map,p=[],l=[],f=[];for(let S of r){let y=zu(S);if(S.scope==="phase"&&S.scopeKey){let g=u.get(S.scopeKey)??Vu(S);switch(S.kind){case"phase_objective":g.objective=U(g.objective,y);break;case"phase_why":g.why=U(g.why,y);break;case"phase_deliverable":g.deliverable=U(g.deliverable,y);break;case"acceptance_criterion":g.acceptanceCriteria.push(y);break;case"dependency":g.dependencies.push(y);break;case"open_question":g.openQuestions.push(y);break;case"constraint":g.constraints.push(y);break;case"note":g.notes.push(y);break}u.set(g.key,g);continue}switch(S.kind){case"mission":o=U(o,y);break;case"objective":s=U(s,y);break;case"why":i=U(i,y);break;case"desired_outcome":a=U(a,y);break;case"plan_rationale":c=U(c,y);break;case"open_question":p.push(y);break;case"constraint":l.push(y);break;case"note":f.push(y);break}}for(let S of u.values())S.acceptanceCriteria=Y(S.acceptanceCriteria,20),S.dependencies=Y(S.dependencies,15),S.openQuestions=Y(S.openQuestions,15),S.constraints=Y(S.constraints,15),S.notes=Y(S.notes,20);let d={version:1,projectId:t.id,projectName:t.name,mission:o,activeObjective:s,why:i,desiredOutcome:a,planRationale:c,phases:Array.from(u.values()).sort((S,y)=>S.order-y.order),openQuestions:Y(p,20),constraints:Y(l,20),notes:Y(f,20),updatedAt:r.length?r[r.length-1].evidence.occurredAt:new Date().toISOString()},m=To(t.rootPath,".toolnet","work");return Wu(m,{recursive:!0}),N(To(m,"semantic-current.json"),d),await e.put(`projects/${t.id}/work/semantic/current.json`,JSON.stringify(d,null,2)+`
`,"application/json"),d}async function No(t,e){let n=await e.getText(`projects/${t.id}/work/semantic/current.json`);if(!n)return null;try{return JSON.parse(n)}catch{return null}}function Xu(t,e){if(!Hu(t))return{events:[],nextOffset:e};let n=Yu(t).size,r=Number.isFinite(e)?Math.max(0,e):0;if(r>n&&(r=0),r===n)return{events:[],nextOffset:n};let o=Buffer.alloc(n-r),s=Gu(t,"r");try{Uu(s,o,0,o.length,r)}finally{Ju(s)}let i=o.toString("utf8"),a=i.lastIndexOf(`
`);if(a<0)return{events:[],nextOffset:r};let c=i.slice(0,a+1);return{events:c.split(`
`).filter(Boolean).flatMap(u=>{try{return[JSON.parse(u)]}catch{return[]}}),nextOffset:r+Buffer.byteLength(c,"utf8")}}var Et=class{constructor(e){this.options=e;this.journal=new At(e.storage)}options;journal;async learnNew(){let e=this.options.wal.loadState(),n=Number(e.sourceCursors["work.semantic.offset"]??0),r=Xu(this.options.wal.eventsFile,Number.isFinite(n)?n:0);if(r.events.length===0)return{scannedEvents:0,observations:0,journalWritten:!1,reconciled:!1,nextOffset:r.nextOffset};let o=Po(this.options.identity,r.events),s=!1,i=!1;return o.length>0&&(s=!!await this.journal.write(this.options.identity,o),s&&(await Ro(this.options.project,this.options.storage),i=!0)),this.options.wal.setSourceCursor("work.semantic.offset",r.nextOffset),{scannedEvents:r.events.length,observations:o.length,journalWritten:s,reconciled:i,nextOffset:r.nextOffset}}};import{existsSync as Bl,mkdirSync as Vl}from"node:fs";import{join as wn}from"node:path";import{existsSync as Lo,mkdirSync as Qu,readFileSync as Zu,statSync as _o,writeFileSync as el}from"node:fs";import{dirname as tl,join as nl}from"node:path";var $o=64*1024,rl=`# ToolNet Project Operating Manual

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
`;function Pt(t){return nl(t.rootPath,".toolnet","PROJECT.md")}function ol(t){return t.normalize("NFKC").replace(/\s+/g," ").trim()}function sl(t){let e=[],n=new Set,r=/^\s*[-*]\s+\[(enforce|advisory)\]\s+(.+?)\s*$/gimu,o;for(;o=r.exec(t);){let s=o[1].toLowerCase(),i=ol(o[2]);if(!i)continue;let a=`${s}:${i.toLowerCase()}`;n.has(a)||(n.add(a),e.push({id:w(a).slice(0,24),mode:s,text:i,source:"manual"}))}return e}function il(t){let e=Pt(t);return Lo(e)||(Qu(tl(e),{recursive:!0}),el(e,rl,{encoding:"utf8",mode:384})),e}function Ot(t,e=!1){let n=e?il(t):Pt(t);if(!Lo(n))return null;if(_o(n).size>$o)throw new Error(`PROJECT.md exceeds ${$o} bytes`);let o=Zu(n,"utf8");return{path:n,content:o,digest:w(o),rules:sl(o),bytes:Buffer.byteLength(o,"utf8"),updatedAt:new Date(_o(n).mtimeMs).toISOString()}}import{randomUUID as al}from"node:crypto";import{closeSync as cl,existsSync as Ko,fsyncSync as ul,mkdirSync as ll,openSync as dl,readFileSync as pl,statSync as fl,unlinkSync as Fo,writeFileSync as ml}from"node:fs";import{dirname as gl,join as yl}from"node:path";var hl=new Int32Array(new SharedArrayBuffer(4));function Sl(t){t<=0||Atomics.wait(hl,0,0,t)}function kl(t){return yl(t.rootPath,".toolnet","work",".current.lock")}function vl(t){if(!Number.isInteger(t)||t<=0)return!1;try{return process.kill(t,0),!0}catch(e){return e?.code!=="ESRCH"}}function Do(t){if(!Ko(t))return null;try{let e=JSON.parse(pl(t,"utf8"));return e.version!==1||typeof e.token!="string"||typeof e.pid!="number"||typeof e.acquiredAt!="string"?null:{version:1,token:e.token,pid:e.pid,acquiredAt:e.acquiredAt}}catch{return null}}function wl(t){try{return Date.now()-fl(t).mtimeMs}catch{return 0}}function bl(t,e){if(!Ko(t)||wl(t)<e)return!1;let n=Do(t);return n?!vl(n.pid):!0}function xl(t,e){if(!bl(t,e))return!1;try{return Fo(t),!0}catch{return!1}}function Cl(t,e){let n={version:1,token:e,pid:process.pid,acquiredAt:new Date().toISOString()},r=dl(t,"wx",384);try{ml(r,`${JSON.stringify(n,null,2)}
`,{encoding:"utf8"}),ul(r)}finally{cl(r)}}function jl(t,e){if(Do(t)?.token===e)try{Fo(t)}catch{}}function Il(t,e={}){let n=Math.max(100,e.timeoutMs??5e3),r=Math.max(5,e.retryMs??20),o=Math.max(n*2,e.staleMs??3e4),s=kl(t);ll(gl(s),{recursive:!0});let i=al(),a=Date.now()+n;for(;;)try{Cl(s,i);let c=!1;return()=>{c||(c=!0,jl(s,i))}}catch(c){if(c?.code!=="EEXIST")throw c;if(xl(s,o))continue;if(Date.now()>=a)throw new Error(`Timed out acquiring project work lock: ${s}`);Sl(r)}}function Wo(t,e,n={}){let r=Il(t,n);try{return e()}finally{r()}}import{closeSync as Ml,existsSync as Al,fsyncSync as El,mkdirSync as Pl,openSync as Ol,readFileSync as Tl,renameSync as Rl,writeFileSync as Nl}from"node:fs";import{dirname as _l,join as $l}from"node:path";function Ll(t,e){Pl(_l(t),{recursive:!0});let n=`${t}.tmp-${process.pid}-${Date.now()}`,r=Ol(n,"w",384);try{Nl(r,`${JSON.stringify(e,null,2)}
`,{encoding:"utf8"}),El(r)}finally{Ml(r)}Rl(n,t)}function Ho(t){return $l(t.rootPath,".toolnet","work","current.json")}function vn(t){let e=Ho(t);if(!Al(e))return null;try{let n=JSON.parse(Tl(e,"utf8"));return n.version!==1||n.projectId!==t.id?null:n}catch{return null}}function Tt(t){return t.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim()}function L(t,e,n){let r=[],o=new Set;for(let s of[...t,...e].reverse()){let i=Tt(s);if(!(!i||o.has(i))&&(o.add(i),r.push(s),r.length>=n))break}return r.reverse()}function Kl(t,e,n=20){let r=new Map;for(let o of[...t,...e]){let s=`${o.kind}|${Tt(o.command)}`;r.delete(s),r.set(s,o)}return Array.from(r.values()).slice(-n)}function Fl(t){return t.kind==="phase"?/^Phase\s+\d+$/iu.test(t.text):t.kind==="task"?/^(?:TODO|Task|Việc)\s+\d+$/iu.test(t.text):!1}function zo(t,e){let n=e.status??t?.status??"pending",r=n;t?.status==="completed"&&n!=="completed"&&(r="completed"),t&&n==="pending"&&(t.status==="in_progress"||t.status==="blocked")&&(r=t.status);let o=t&&Fl(e)?t.title:e.text;return{id:t?.id??e.id,title:o,status:r,order:e.order??t?.order,confidence:Math.max(t?.confidence??0,e.confidence),updatedAt:e.occurredAt,updatedBy:{agent:e.agent,nativeSessionId:e.nativeSessionId,eventId:e.eventId}}}function qo(t){let e=new Map;for(let n of t){let r=n.order!==void 0?`order:${n.order}`:Tt(n.title);e.set(r,n)}return e}function Bo(t){return t.order!==void 0?`order:${t.order}`:Tt(t.key||t.text)}function Vo(t){return Array.from(t).sort((e,n)=>{let r=e.order??Number.MAX_SAFE_INTEGER,o=n.order??Number.MAX_SAFE_INTEGER;return r!==o?r-o:e.updatedAt.localeCompare(n.updatedAt)})}function Jo(t){return t.find(e=>e.status==="in_progress")??t.find(e=>e.status==="blocked")??t.find(e=>e.status==="pending")}function Dl(t,e){let n=vn(t),r=qo(n?.phases??[]),o=qo(n?.tasks??[]),s=n?.currentRequest,i=n?.currentActivity,a=n?.goal,c=n?.plan,u=n?.lastSession,p=[],l=[],f=[],d=[],m=[],S=[...n?.activeFiles??[]],y=[],g=[],k=[],b=[],T=[],P=[],R=[...e].sort((v,O)=>{let V=v.occurredAt.localeCompare(O.occurredAt);return V!==0?V:v.sequence-O.sequence});for(let v of R)switch(v.kind){case"request":s=v.text;break;case"activity":i=v.text;break;case"goal":a=v.text;break;case"plan":c=v.text;break;case"phase":{let O=Bo(v);r.set(O,zo(r.get(O),v));break}case"task":{let O=Bo(v);o.set(O,zo(o.get(O),v));break}case"decision":p.push(v.text);break;case"blocker":l.push(v.text);break;case"warning":f.push(v.text);break;case"next_action":d.push(v.text);break;case"file":{m.push(v.text);let O=v.fileAction??"active",V=S.indexOf(v.text);V>=0&&S.splice(V,1),O!=="deleted"&&S.push(v.text),O==="modified"?y.push(v.text):O==="created"?g.push(v.text):O==="deleted"&&k.push(v.text);break}case"command":b.push(v.text);break;case"test":T.push(v.text),v.checkKind&&P.push({kind:v.checkKind,command:v.text,status:v.checkStatus??"unknown",updatedAt:v.occurredAt,agent:v.agent,nativeSessionId:v.nativeSessionId});break;case"session":u={agent:v.agent,nativeSessionId:v.nativeSessionId,sessionKey:v.sessionKey,updatedAt:v.occurredAt};break}let j=Vo(r.values()),x=Vo(o.values()),z=Jo(j),q=Jo(x),zt=L(n?.nextActions??[],[...d,...q?[q.title]:[],...!q&&z?[z.title]:[],...x.filter(v=>v.status==="pending").slice(0,5).map(v=>v.title)],8),qt=L(n?.blockers??[],[...l,...j.filter(v=>v.status==="blocked").map(v=>v.title),...x.filter(v=>v.status==="blocked").map(v=>v.title)],20),ke=R.length>0?R[R.length-1].occurredAt:n?.updatedAt??new Date().toISOString(),Je={version:1,projectId:t.id,projectName:t.name,currentRequest:s,currentActivity:i,goal:a,plan:c,phases:j,tasks:x,decisions:L(n?.decisions??[],p,20),blockers:qt,warnings:L(n?.warnings??[],f,20),nextActions:zt,filesTouched:L(n?.filesTouched??[],m,30),activeFiles:L([],S,5),modifiedFiles:L(n?.modifiedFiles??[],y,30),createdFiles:L(n?.createdFiles??[],g,30),deletedFiles:L(n?.deletedFiles??[],k,30),commands:L(n?.commands??[],b,20),tests:L(n?.tests??[],T,20),checks:Kl(n?.checks??[],P,20),currentPhase:z,currentTask:q,progress:{phasesTotal:j.length,phasesCompleted:j.filter(v=>v.status==="completed").length,tasksTotal:x.length,tasksCompleted:x.filter(v=>v.status==="completed").length,blocked:j.filter(v=>v.status==="blocked").length+x.filter(v=>v.status==="blocked").length},lastSession:u,updatedAt:ke},h=Ce(Je);return Ll(Ho(t),h),h}function Go(t,e){return Wo(t,()=>Dl(t,e))}function E(t,e){let n=new Set,r=[];for(let o of t){let s=o.replace(/\s+/g," ").trim();if(!s)continue;let i=s.normalize("NFKC").toLowerCase();if(!n.has(i)&&(n.add(i),r.push(s),r.length>=e))break}return r}function Uo(t){if(t)return{id:t.id,title:t.title,status:t.status}}function Wl(t,e=[]){let n=e.slice(-10);if(n.some(o=>o.status==="failed"))return"failing";if(n.some(o=>o.status==="passed"))return"passing";let r=t.slice(-10).join(`
`).toLowerCase();return/(?:failed|failing|failure|error|✗|❌)/u.test(r)?"failing":/(?:passed|passing|green|success|✓|✅)/u.test(r)?"passing":"unknown"}function zl(t){return w(JSON.stringify(t))}function ql(t){let e=[];for(let n of t){if(!n)continue;let r=n.match(/https?:\/\/[^\s<>"'`)\]}]+/giu)??[];for(let o of r){let s=o.replace(/[.,;:!?]+$/gu,"").trim();s&&e.push(s)}}return E(e,30)}function Yo(t){let{project:e,identity:n,state:r}=t,o=r.activeFiles?.at(-1)??r.filesTouched.at(-1),s=r.phases.filter(k=>k.status==="completed").map(k=>k.title),i=r.tasks.filter(k=>k.status==="completed").map(k=>k.title),a=r.phases.filter(k=>k.status!=="completed"&&k.status!=="cancelled").map(k=>k.title),c=r.tasks.filter(k=>k.status!=="completed"&&k.status!=="cancelled").map(k=>k.title),u=new Set(r.tasks.filter(k=>k.status==="completed").map(k=>k.title.normalize("NFKC").toLowerCase().replace(/\s+/gu," ").trim())),p=E(r.nextActions.filter(k=>!u.has(k.normalize("NFKC").toLowerCase().replace(/\s+/gu," ").trim())),10),l=E([...c,...p],15),f=E(r.tests.slice().reverse(),10),d=E([...(r.activeFiles??[]).slice().reverse(),...r.filesTouched.slice().reverse()],20),m={schema:"toolnet.handoff.v2",version:2,project:{id:e.id,name:e.name},source:{agent:n.agent,nativeSessionId:n.nativeSessionId,sessionKey:n.sessionKey,sequence:t.sequence,reason:t.reason},capturedAt:t.capturedAt??new Date().toISOString(),goal:r.goal,request:r.currentRequest,activity:r.currentActivity,current:{phase:Uo(r.currentPhase),task:Uo(r.currentTask),file:o},completed:{phases:E(s,20),tasks:E(i,30)},remaining:{phases:E(a,20),tasks:E(c,30),todos:l},nextAction:p[0],blockers:E(r.blockers.slice().reverse(),10),decisions:E(r.decisions.slice().reverse(),10),files:{current:o,recent:d,active:E(r.activeFiles??[],10),modified:E(r.modifiedFiles??[],20),created:E(r.createdFiles??[],20),deleted:E(r.deletedFiles??[],20)},tests:{status:Wl(r.tests,r.checks),recent:f,checks:(r.checks??[]).slice(-10).map(k=>({kind:k.kind,status:k.status,command:k.command}))},evidence:{commands:E((r.commands??[]).slice().reverse(),20),references:ql([r.currentRequest,r.currentActivity,r.goal,r.plan,...r.decisions,...r.blockers,...r.warnings,...r.nextActions,...r.filesTouched,...r.commands??[],...r.tests,...(r.checks??[]).map(k=>k.command)])},attention:E(t.attention??[],20),progress:r.progress},{capturedAt:S,source:y,...g}=m;return{...m,stateDigest:zl(g)}}function Jl(t){return!!(t.currentRequest||t.currentActivity||t.goal||t.plan||t.phases.length>0||t.tasks.length>0||t.nextActions.length>0||t.blockers.length>0||t.decisions.length>0||t.filesTouched.length>0)}function Xo(t,e,n,r,o){if(!Jl(n))return null;let s=Ot(t,!1),a=[...s?s.rules.filter(l=>l.mode==="enforce").map(l=>l.text):[],...n.warnings].slice(0,20),c=Yo({project:t,identity:e,state:n,reason:r,sequence:o,attention:a}),u=c.stateDigest;return{version:1,id:w([t.id,e.sessionKey,u].join("|")).slice(0,24),projectId:t.id,projectName:t.name,createdAt:new Date().toISOString(),reason:r,sourceSession:{agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,sequence:o},currentRequest:n.currentRequest,currentActivity:n.currentActivity,goal:n.goal,plan:n.plan,progress:n.progress,currentPhase:n.currentPhase,currentTask:n.currentTask,incompletePhases:n.phases.filter(l=>l.status!=="completed"&&l.status!=="cancelled"),incompleteTasks:n.tasks.filter(l=>l.status!=="completed"&&l.status!=="cancelled"),nextActions:c.remaining.todos.slice(0,10),blockers:n.blockers.slice(-10),decisions:n.decisions.slice(-10),warnings:n.warnings.slice(-10),attention:a,filesTouched:n.filesTouched.slice(-20),activeFiles:n.activeFiles?.slice(-10),modifiedFiles:n.modifiedFiles?.slice(-20),createdFiles:n.createdFiles?.slice(-20),deletedFiles:n.deletedFiles?.slice(-20),tests:n.tests.slice(-15),checks:n.checks?.slice(-10),stateDigest:u,continuity:c}}function Qo(t,e){let n=wn(t.rootPath,".toolnet","work","handoffs");Vl(n,{recursive:!0});let r=wn(n,`${e.id}.json`);Bl(r)||N(r,e),N(wn(t.rootPath,".toolnet","work","handoff-latest.json"),e)}function Zo(t){let e=Xo(t.project,t.identity,t.state,t.reason,t.sequence);return e?(Qo(t.project,e),e):null}var Rt=class{constructor(e){this.options=e}options;async capture(e,n){let r=vn(this.options.project);r||(r=await It(this.options.project,this.options.storage)),r||(r=await We(this.options.project,this.options.storage));let o=Xo(this.options.project,this.options.identity,r,e,n);if(!o)return null;Qo(this.options.project,o);let s=`projects/${this.options.project.id}/work/handoffs/${o.id}.json`;return await this.options.storage.exists(s)||await this.options.storage.put(s,JSON.stringify(o,null,2)+`
`,"application/json"),await this.options.storage.put(`projects/${this.options.project.id}/work/handoff-latest.json`,JSON.stringify(o,null,2)+`
`,"application/json"),o}};async function es(t,e){let n=await e.getText(`projects/${t.id}/work/handoff-latest.json`);if(!n)return null;try{return JSON.parse(n)}catch{return null}}import{existsSync as Hl,readFileSync as Gl,writeFileSync as Ul}from"node:fs";import{join as Yl}from"node:path";var ns="<!-- TOOLNET:STABLE-WORK:BEGIN -->",bn="<!-- TOOLNET:STABLE-WORK:END -->";function xn(t){switch(t.status){case"completed":return"[x]";case"in_progress":return"[~]";case"blocked":return"[!]";case"cancelled":return"[-]";default:return"[ ]"}}function W(t,e){return e.length?["",`${t}:`,...e.map(n=>`- ${n}`)]:[]}function ts(t,e){return e.length?["",`${t}:`,...e.map(n=>`- ${xn(n)} ${n.title}`)]:[]}function Xl(t){let e=[ns,"# ToolNet Stable Work State","",`Updated: ${t.updatedAt}`];return t.lastSession&&e.push(`Last agent: ${t.lastSession.agent}`,`Last session: ${t.lastSession.nativeSessionId}`),t.currentRequest&&e.push("","Current request:",t.currentRequest),t.currentActivity&&e.push("","Current activity:",t.currentActivity),t.goal&&e.push("","Goal:",t.goal),t.plan&&e.push("","Plan:",t.plan),t.currentPhase&&e.push("","Current phase:",`${xn(t.currentPhase)} ${t.currentPhase.title}`),t.currentTask&&e.push("","Current task:",`${xn(t.currentTask)} ${t.currentTask.title}`),e.push(...ts("Phases",t.phases)),e.push(...ts("TODO / Tasks",t.tasks)),e.push(...W("Next actions",t.nextActions)),e.push(...W("Blockers",t.blockers)),e.push(...W("Important decisions",t.decisions)),e.push(...W("Active files",t.activeFiles??[])),e.push(...W("Modified files",t.modifiedFiles??[])),e.push(...W("Created files",t.createdFiles??[])),e.push(...W("Deleted files",t.deletedFiles??[])),e.push(...W("Files touched",t.filesTouched)),e.push(...W("Recent commands",t.commands??[])),e.push(...W("Checks",(t.checks??[]).map(n=>`[${n.status}] ${n.kind}: ${n.command}`))),e.push("","Progress:",`- Phases: ${t.progress.phasesCompleted}/${t.progress.phasesTotal}`,`- Tasks: ${t.progress.tasksCompleted}/${t.progress.tasksTotal}`,`- Blocked: ${t.progress.blocked}`,"","Continuation:","- Resume current unfinished task.","- Never redo completed TODO/Phase unless explicitly requested.","- Ask ToolNet Memory for deeper history only when necessary.",bn),e.join(`
`)}function rs(t,e){let n=Yl(t.rootPath,".toolnet","current.md"),r="";if(Hl(n))try{r=Gl(n,"utf8")}catch{r=""}r=r.replace(/<!-- TOOLNET:AUTO-CURRENT:BEGIN -->[\s\S]*?<!-- TOOLNET:AUTO-CURRENT:END -->/gu,"");let o=Xl(e),s=r.indexOf(ns),i=r.indexOf(bn),a;s>=0&&i>=s?a=[r.slice(0,s).trimEnd(),o,r.slice(i+bn.length).trimStart()].filter(Boolean).join(`

`):a=r.trim()?`${r.trim()}

${o}`:o,Ul(n,`${a.trim()}
`,{encoding:"utf8",mode:384})}import{existsSync as Vy,mkdirSync as Ql,readFileSync as Jy,renameSync as Zl,writeFileSync as ed}from"node:fs";import{dirname as td,join as nd}from"node:path";function rd(t){return nd(t.rootPath,".toolnet","context","session-origin.json")}function od(t,e){Ql(td(t),{recursive:!0});let n=`${t}.tmp-${process.pid}-${Date.now()}`;ed(n,`${JSON.stringify(e,null,2)}
`,{encoding:"utf8",mode:384}),Zl(n,t)}function Nt(t,e){return[...t].filter(n=>n.kind===e).sort((n,r)=>{let o=n.occurredAt.localeCompare(r.occurredAt);return o!==0?o:n.sequence-r.sequence}).at(-1)}function os(t,e){let n=Nt(e.observations,"file"),r=Nt(e.observations,"next_action"),o=Nt(e.observations,"blocker"),s=Nt(e.observations,"decision"),i={version:1,projectId:t.id,agent:e.agent,nativeSessionId:e.nativeSessionId,updatedAt:e.workState.updatedAt,currentRequest:e.workState.currentRequest,currentActivity:e.workState.currentActivity,currentTask:e.workState.currentTask?.title,currentPhase:e.workState.currentPhase?.title,lastTouchedFile:n?.text??e.workState.activeFiles?.at(-1)??e.workState.filesTouched.at(-1),latestNextAction:r?.text??e.workState.nextActions.at(-1),latestBlocker:o?.text??e.workState.blockers.at(-1),latestDecision:s?.text??e.workState.decisions.at(-1)};return od(rd(t),i),i}import{existsSync as ss,mkdirSync as sd,readFileSync as id}from"node:fs";import{join as Cn}from"node:path";function is(t){return Cn(t.rootPath,".toolnet","memory","checkpoints")}function as(t){return Cn(is(t),"latest.json")}function ad(t){let e=as(t);if(!ss(e))return null;try{let n=JSON.parse(id(e,"utf8"));return n.schema!=="toolnet.memory.checkpoint.v1"||n.project.id!==t.id?null:n}catch{return null}}function cd(t){return["rule","architecture","decision","fix"].includes(t)}function ud(t,e){return e.length===0?[]:ft(t,e).candidates.filter(r=>cd(r.kind)&&r.knowledgeClass!=="transient"&&r.importanceScore>=.65).map(r=>({fingerprint:r.fingerprint,kind:r.kind,content:r.content,knowledgeClass:r.knowledgeClass,importanceScore:r.importanceScore,confidence:r.confidence,createdAt:r.createdAt,agent:t.agent,nativeSessionId:t.nativeSessionId}))}function ld(t,e){let n=new Map;for(let r of[...t,...e]){let o=n.get(r.fingerprint);(!o||r.importanceScore>o.importanceScore)&&n.set(r.fingerprint,r)}return Array.from(n.values()).sort((r,o)=>o.importanceScore-r.importanceScore||o.createdAt.localeCompare(r.createdAt)).slice(0,80)}function dd(t){return{request:t.currentRequest,activity:t.currentActivity,goal:t.goal,phase:t.currentPhase?{title:t.currentPhase.title,status:t.currentPhase.status}:void 0,task:t.currentTask?{title:t.currentTask.title,status:t.currentTask.status}:void 0,phases:t.phases.map(e=>({title:e.title,status:e.status})),tasks:t.tasks.map(e=>({title:e.title,status:e.status})),activeFiles:t.activeFiles??[],modifiedFiles:t.modifiedFiles??[],createdFiles:t.createdFiles??[],deletedFiles:t.deletedFiles??[],checks:t.checks??[],blockers:t.blockers,decisions:t.decisions,nextActions:t.nextActions}}function cs(t,e,n,r){let o=ad(t),s=ld(o?.durableFacts??[],ud(e,n)),i=n.at(-1)?.sequence??o?.source.sequence??0,a=r.phases.filter(y=>y.status==="completed").map(y=>y.title),c=r.tasks.filter(y=>y.status==="completed").map(y=>y.title),u=r.phases.filter(y=>y.status!=="completed"&&y.status!=="cancelled").map(y=>y.title),p=r.tasks.filter(y=>y.status!=="completed"&&y.status!=="cancelled").map(y=>y.title),l={work:dd(r),durableFacts:s.map(y=>y.fingerprint).sort()},f=w(JSON.stringify(l)).slice(0,32),d={schema:"toolnet.memory.checkpoint.v1",version:1,project:{id:t.id,name:t.name},source:{agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,sequence:i},capturedAt:new Date().toISOString(),request:r.currentRequest,activity:r.currentActivity,goal:r.goal,current:{phase:r.currentPhase,task:r.currentTask},completed:{phases:a,tasks:c},remaining:{phases:u,tasks:p},files:{active:r.activeFiles??[],modified:r.modifiedFiles??[],created:r.createdFiles??[],deleted:r.deletedFiles??[]},checks:r.checks??[],blockers:r.blockers.slice(-10),decisions:r.decisions.slice(-15),nextActions:r.nextActions.slice(0,10),durableFacts:s,stateDigest:f},m=is(t);sd(m,{recursive:!0,mode:448});let S=Cn(m,`${f}.json`);return ss(S)||N(S,d),N(as(t),d),d}function us(t,e,n){if(process.env.TOOLNET_LOCAL_CHECKPOINT==="0"||n.length===0)return{updated:!1,observations:0};let r=Ct(e,n);if(r.length===0)return{updated:!1,observations:0};let o=Go(t,r);rs(t,o),os(t,{agent:e.agent,nativeSessionId:e.nativeSessionId,observations:r,workState:o});try{cs(t,e,n,o)}catch{}try{Zo({project:t,identity:e,state:o,reason:"continuous-checkpoint",sequence:n.at(-1)?.sequence??0})}catch{}return{updated:!0,observations:r.length}}var ze=class{identity;wal;remote;sanitizer=new J;learner;continuity;semantic;handoff;project;title;metadata;constructor(e){this.project=e.project,this.identity=Zn(e.project,e.agent,e.nativeSessionId),this.title=e.title,this.metadata=this.sanitizer.sanitizeValue(e.metadata??{}),this.wal=new ct(this.identity,e.eventContext),this.remote=new nt(e.storage,e.maxEventsPerChunk??100,e.maxChunkBytes??512*1024),this.learner=new bt({project:e.project,storage:e.storage,identity:this.identity,wal:this.wal}),this.continuity=new Mt({project:e.project,storage:e.storage,identity:this.identity,wal:this.wal}),this.semantic=new Et({project:e.project,storage:e.storage,identity:this.identity,wal:this.wal}),this.handoff=new Rt({project:e.project,storage:e.storage,identity:this.identity})}sanitizeEvent(e){let n=e.provenance?{...e.provenance,metadata:this.sanitizer.sanitizeValue(e.provenance.metadata)}:void 0;return{...e,data:this.sanitizer.sanitizeValue(e.data??{}),provenance:n}}checkpointLocal(e){if(e.length!==0)try{us(this.project,this.identity,e)}catch{}}start(e={}){let n=this.wal.loadState();return this.record({type:n.lastSequence===0?"session_start":"session_resume",data:e,provenance:{source:this.identity.agent}})}record(e){let n=this.wal.append([this.sanitizeEvent(e)]);return this.checkpointLocal(n),n[0]}recordMany(e){let n=this.wal.append(e.map(r=>this.sanitizeEvent(r)));return this.checkpointLocal(n),n}setSourceCursor(e,n){this.wal.setSourceCursor(e,n)}async flush(){let e=this.wal.readPending(),n=this.wal.loadState(),r=await this.remote.append(this.identity,e.events,n.sourceCursors,{title:this.title,metadata:this.metadata});if(e.events.length>0){let o=e.events[e.events.length-1];this.wal.markRemote(o.sequence,e.endOffset)}if(process.env.TOOLNET_SESSION_LEARNING!=="0")try{await this.learner.learnNew()}catch{}if(process.env.TOOLNET_WORK_CONTINUITY!=="0")try{await this.continuity.learnNew()}catch{}if(process.env.TOOLNET_SEMANTIC_CONTINUITY!=="0")try{await this.semantic.learnNew()}catch{}if(process.env.TOOLNET_SMART_HANDOFF!=="0"&&e.events.length>0)try{let o=e.events[e.events.length-1],s=["session_idle","session_end","session_compact"].includes(o.type)?o.type:"checkpoint";await this.handoff.capture(s,o.sequence)}catch{}return r}async idle(e={}){return this.record({type:"session_idle",data:e,provenance:{source:this.identity.agent}}),this.flush()}async end(e={}){return this.record({type:"session_end",data:e,provenance:{source:this.identity.agent}}),this.flush()}status(){return this.wal.loadState()}recoverRemote(){return this.remote.recover(this.identity)}};var pd=[/^<SYSTEM MESSAGE>/i,/^<EPHEMERAL MESSAGE>/i,/^<system>/i,/^<ephemeral>/i,/^ManageTask:/i,/^Task \d+ status:/i,/^Task \d+ killed/i,/^Task \d+ loading/i,/^Thought for \d+ tokens/i,/^Prioritizing Tool Usage/i,/^Tool call:/i,/^Tool response:/i,/^npm notice/i,/^npm WARN/i,/^added \d+ packages/i,/^removed \d+ packages/i,/^up to date/i,/^\d+ packages are looking for funding/i,/^run `npm fund` for details/i,/^[\d.]+%/,/^\[={10,}\]/,/^Loading\.\.\./i,/^Processing\.\.\./i,/^bash-\d+\.\d+\$/,/^\$ /,/^\s*$/],fd=[/api[_-]?key[:\s=]+[^\s]+/gi,/token[:\s=]+[^\s]+/gi,/secret[:\s=]+[^\s]+/gi,/password[:\s=]+[^\s]+/gi,/bearer\s+[^\s]+/gi,/authorization:\s*[^\s]+/gi],md=["decision","decided","rule","convention","architecture","pattern","fixed","resolved","implemented","created","updated","deleted","deployed","blocker","blocked","issue","bug","error","next","todo","action","requirement","must","should","important"];function gd(t){let e=t.toLowerCase();return md.some(n=>e.includes(n))}function yd(t){if(!t.trim())return!0;for(let e of pd)if(e.test(t))return!0;return gd(t),!1}function hd(t){let e=t;for(let n of fd)e=e.replace(n,r=>{let o=r.split(/[:\s=]+/);return o.length>1?`${o[0]}: [REDACTED]`:"[REDACTED]"});return e}function jn(t){let e=t.trim();return e?yd(e)?{content:"",filtered:!0,reason:"noise"}:{content:hd(e),filtered:!1}:{content:"",filtered:!0,reason:"empty"}}function _t(t){let e={};for(let[n,r]of Object.entries(t))if(typeof r=="string"){let o=jn(r);o.filtered||(e[n]=o.content)}else r&&typeof r=="object"&&!Array.isArray(r)?e[n]=_t(r):Array.isArray(r)?e[n]=r.map(o=>{if(typeof o=="string"){let s=jn(o);return s.filtered?null:s.content}return o&&typeof o=="object"?_t(o):o}).filter(o=>o!==null):e[n]=r;return e}function ls(t){let e=typeof t.type=="string"?t.type.toLowerCase():"";if(e.includes("system")||e.includes("ephemeral")||e==="tool_call"&&!t.result)return!0;if(t.data&&typeof t.data=="object"){let n=t.data,r=typeof n.content=="string"?n.content:"";if(r&&jn(r).filtered)return!0}return!1}function hs(){try{let e=kd("opencode",["db","path"],{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:5e3}).trim();if(e)return e}catch{}if(process.env.OPENCODE_DB)return process.env.OPENCODE_DB;let t=process.env.XDG_DATA_HOME??ds(vd(),".local","share");return ds(t,"opencode","opencode.db")}function C(t){return typeof t=="string"?t:""}function ie(t){if(typeof t=="number"&&Number.isFinite(t))return t;if(typeof t=="bigint")return Number(t);if(typeof t=="string"){let e=Number(t);if(Number.isFinite(e))return e}return 0}function Lt(t){if(t&&typeof t=="object"&&!Buffer.isBuffer(t))return t;if(typeof t!="string")return{};try{let e=JSON.parse(t);if(e&&typeof e=="object"&&!Array.isArray(e))return e}catch{}return{}}function ge(t){let e=ie(t);if(e<=0)return new Date().toISOString();e<1e11&&(e*=1e3);let n=new Date(e);return Number.isNaN(n.getTime())?new Date().toISOString():n.toISOString()}function $t(t,e){if(!e)return!1;let n=ps(t),r=ps(e);if(n===r)return!0;let o=bd(n,r);return o!==""&&o!==".."&&!o.startsWith(`..${process.platform==="win32"?"\\":"/"}`)&&!wd(o)}function fs(t){if(!t)return{time:-1,id:""};try{let e=JSON.parse(t);return{time:typeof e.time=="number"?e.time:-1,id:typeof e.id=="string"?e.id:""}}catch{return{time:-1,id:""}}}function ms(t){return JSON.stringify(t)}function Ss(t){if(!Sd(t))throw new Error(`OpenCode database not found: ${t}`);let e=new xd(t,{readOnly:!0});return e.exec("PRAGMA query_only = ON"),e.exec("PRAGMA busy_timeout = 3000"),e}function Cd(t,e){let n=t.prepare(`
      SELECT *
      FROM "session"
      WHERE id = ?
      LIMIT 1
      `).get(e);if(!n)throw new Error(`OpenCode session not found: ${e}`);return n}function ks(t,e,n){let r=C(e.directory);if(r&&$t(n.rootPath,r))return!0;let o=C(e.project_id);if(o){try{let s=t.prepare(`
          SELECT *
          FROM "project"
          WHERE id = ?
          LIMIT 1
          `).get(o);if(s)for(let i of["worktree","directory","path"]){let a=C(s[i]);if(a&&$t(n.rootPath,a))return!0}}catch{}try{if(t.prepare(`
          SELECT directory
          FROM "project_directory"
          WHERE project_id = ?
          `).all(o).some(i=>$t(n.rootPath,C(i.directory))))return!0}catch{}}try{let s=t.prepare(`
        SELECT data
        FROM "message"
        WHERE session_id = ?
        ORDER BY time_created DESC
        LIMIT 20
        `).all(C(e.id));for(let i of s){let a=Lt(i.data),c=a.path&&typeof a.path=="object"?a.path:{};for(let u of[C(c.cwd),C(c.root)])if(u&&$t(n.rootPath,u))return!0}}catch{}return!1}function gs(t,e,n,r){let o=`
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
    `;return t.prepare(o).all(n,r.time,r.time,r.id)}function ys(t,e){let n=t[t.length-1];return n?{time:ie(n.__clock),id:C(n.id)}:e}function jd(t,e){let n=Lt(e.data),r=C(n.role),o=ie(e.__clock),s=C(e.id),i="message";return r==="user"?i="user_prompt":r==="assistant"&&(i="assistant_message"),{clock:o,order:0,event:{type:i,timestamp:ge(o),role:r||void 0,sourceEventId:`message:${s}:${o}`,sourceSequence:`${o}:${s}`,data:{messageId:s,...n},provenance:{source:"opencode",sourcePath:t,sourceTable:"message",sourceRowId:s,sourceOffset:`${o}:${s}`}}}}function Id(t){let e={...t},n=t.state&&typeof t.state=="object"&&!Array.isArray(t.state)?{...t.state}:void 0;if(n){let r=n.output;if(typeof r=="string"){let o=r.replace(/\r\n/g,`
`),s=500;n.outputSummary=o.length<=s?o:`${o.slice(0,350)}
...[ToolNet truncated ${o.length-s} chars]...
${o.slice(-150)}`,delete n.output}else r!==void 0&&(n.outputSummary="[non-text tool output omitted]",delete n.output);if(n.input&&typeof n.input=="object"&&!Array.isArray(n.input)){let o={...n.input};for(let[s,i]of Object.entries(o))typeof i=="string"&&i.length>1e3&&(o[s]=`${i.slice(0,1e3)}...[ToolNet truncated]`);n.input=o}e.state=n}return e}function Md(t,e){let n=C(e.message_id);if(n)try{let r=t.prepare(`
        SELECT data
        FROM "message"
        WHERE id = ?
        LIMIT 1
        `).get(n);if(!r)return;let o=Lt(r.data);return C(o.role)||void 0}catch{return}}function Ad(t,e,n){let r=Lt(n.data),o=C(r.type),s=ie(n.__clock),i=C(n.id),a=C(n.message_id),c=Md(t,n),u="message_part";return o==="tool"?u="tool_call":o==="snapshot"&&(u="artifact"),{clock:s,order:1,event:{type:u,timestamp:ge(s),role:c,sourceEventId:`part:${i}:${s}`,sourceSequence:`${s}:${i}`,data:{partId:i,messageId:a,...o==="tool"?Id(r):r},provenance:{source:"opencode",sourcePath:e,sourceTable:"part",sourceRowId:i,sourceOffset:`${s}:${i}`}}}}async function In(t){let e=t.dbPath??hs(),n=Ss(e);try{let r;try{r=Cd(n,t.nativeSessionId)}catch{let g=new ze({project:t.project,storage:t.storage,agent:"opencode",nativeSessionId:t.nativeSessionId,metadata:{source:"opencode.db",deleted:!0},eventContext:{source:"opencode",cwd:t.project.rootPath}});g.status().lastSequence===0&&g.recordMany([{type:"custom",timestamp:new Date().toISOString(),sourceEventId:`session:${t.nativeSessionId}:deleted`,data:{event:"session_deleted"},provenance:{source:"opencode"}}]);let k=await g.flush();return{nativeSessionId:t.nativeSessionId,importedMessages:0,importedParts:0,recordedEvents:0,eventCount:k.eventCount,chunkCount:k.chunkCount,status:k.status,durability:t.localOnly?"local":"remote"}}if(!ks(n,r,t.project))throw new Error(["OpenCode session does not belong to current ToolNet project.",`Session: ${t.nativeSessionId}`,`Project: ${t.project.rootPath}`,`Session directory: ${C(r.directory)||"unknown"}`].join(" "));let o=new ze({project:t.project,storage:t.storage,agent:"opencode",nativeSessionId:t.nativeSessionId,title:C(r.title)||void 0,metadata:{source:"opencode.db",openCodeProjectId:C(r.project_id)||void 0,directory:C(r.directory)||void 0},eventContext:{source:"opencode",cwd:C(r.directory)||t.project.rootPath}}),s=o.status(),i=fs(s.sourceCursors["opencode.message"]),a=fs(s.sourceCursors["opencode.part"]),c=gs(n,"message",t.nativeSessionId,i),u=gs(n,"part",t.nativeSessionId,a),p=[];if(s.lastSequence===0){let g=ie(r.time_created);p.push({clock:g,order:-1,event:{type:"session_start",timestamp:ge(g),sourceEventId:`session:${t.nativeSessionId}:created:${g}`,data:{title:C(r.title)||void 0,directory:C(r.directory)||void 0,openCodeProjectId:C(r.project_id)||void 0},provenance:{source:"opencode",sourcePath:e,sourceTable:"session",sourceRowId:t.nativeSessionId}}})}p.push(...c.map(g=>jd(e,g))),p.push(...u.map(g=>Ad(n,e,g)));let l=ie(r.time_updated)||ie(r.time_created);t.compacted&&p.push({clock:l,order:98,event:{type:"session_compact",timestamp:ge(l),sourceEventId:`session:${t.nativeSessionId}:compact:${l}`,data:{},provenance:{source:"opencode"}}}),t.error?p.push({clock:l,order:99,event:{type:"error",timestamp:ge(l),sourceEventId:`session:${t.nativeSessionId}:error:${l}`,data:{source:"session.error"},provenance:{source:"opencode"}}}):t.idle&&p.push({clock:l,order:100,event:{type:"session_idle",timestamp:ge(l),sourceEventId:`session:${t.nativeSessionId}:idle:${l}`,data:{},provenance:{source:"opencode"}}}),p.sort((g,k)=>g.clock-k.clock||g.order-k.order);let f=p.filter(g=>!ls(g.event.data)).map(g=>({...g,event:{...g.event,data:_t(g.event.data)}})),d=o.recordMany(f.map(g=>g.event)),m=ys(c,i),S=ys(u,a);if(o.setSourceCursor("opencode.message",ms(m)),o.setSourceCursor("opencode.part",ms(S)),f.length>0)try{let g=f.map(b=>JSON.stringify(b.event.data)),k=pt(g,t.nativeSessionId);o.setSourceCursor("opencode.session.summary",k.summary),o.setSourceCursor("opencode.session.facts_count",k.durableFacts.length),Ar()&&!Or()&&o.setSourceCursor("opencode.raw_transcript.archived","local")}catch{}if(t.localOnly){let g=o.status();return{nativeSessionId:t.nativeSessionId,importedMessages:c.length,importedParts:u.length,recordedEvents:d.length,eventCount:g.lastSequence,chunkCount:0,status:g.status,durability:"local"}}let y=await o.flush();return{nativeSessionId:t.nativeSessionId,importedMessages:c.length,importedParts:u.length,recordedEvents:d.length,eventCount:y.eventCount,chunkCount:y.chunkCount,status:y.status,durability:"remote"}}finally{n.close()}}async function vs(t){let e=t.dbPath??hs(),n=Ss(e),r=[];try{let s=n.prepare(`
        SELECT *
        FROM "session"
        ORDER BY
          COALESCE(
            time_updated,
            time_created,
            0
          ) DESC
        `).all();for(let i of s){if(!ks(n,i,t.project))continue;let a=C(i.id);if(a&&r.push(a),r.length>=(t.limit??100))break}}finally{n.close()}let o=[];for(let s of r)o.push(await In({project:t.project,storage:t.storage,nativeSessionId:s,dbPath:e}));return o}import{existsSync as Pd,mkdirSync as js,readFileSync as Od,writeFileSync as Is}from"node:fs";import{join as xs}from"node:path";import{homedir as ws}from"node:os";import{join as ae}from"node:path";function Kt(t={}){let e=process.env.OPENCODE_CONFIG_DIR?.trim();if(e)return e;let n=t.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return n?ae(n,"opencode"):ae(t.home??ws(),".config","opencode")}function qe(t={}){let e=process.env.OPENCODE_CONFIG?.trim();if(e)return e;let n=t.home??ws(),r=t.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return r?ae(r,"opencode","opencode.json"):ae(n,".config","opencode","opencode.json")}function Be(t={}){let e=t.cwd??process.cwd();return ae(e,"opencode.json")}function Ft(t={}){return ae(Kt(t),"plugins")}function Dt(t={}){return ae(Kt(t),"AGENTS.md")}var Ed="memory_agent_ask";function bs(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${Ed}

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
`.trim()}var Cs="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",Mn="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function Td(t={}){let e=Dt();js(Kt(),{recursive:!0});let n=`${Cs}
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


${bs()}

${Mn}`,r=Pd(e)?Od(e,"utf8"):"",o=r.indexOf(Cs),s=r.indexOf(Mn);return o>=0&&s>=o?r=r.slice(0,o)+n+r.slice(s+Mn.length):(r=r.trimEnd(),r&&(r+=`

`),r+=n),Is(e,r.trimEnd()+`
`,{encoding:"utf8",mode:384}),e}function Ms(t={}){let e=t.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=[];n.push(Td({cwd:t.cwd}));let r=t.scope??"global",o=[];if((r==="global"||r==="both")&&o.push(t.directory??Ft()),r==="project"||r==="both"){let s=t.cwd??process.cwd();o.push(xs(s,".opencode","plugins"))}for(let s of o){js(s,{recursive:!0});let i=xs(s,"toolnet-memory.js"),a=`
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
`;Is(i,a.trimStart(),{encoding:"utf8",mode:384}),n.push(i)}return n}import{existsSync as Ps,mkdirSync as Rd,readFileSync as Nd,renameSync as _d,writeFileSync as $d}from"node:fs";import{dirname as Os,join as Ld}from"node:path";function Ve(t){return typeof t=="object"&&t!==null&&!Array.isArray(t)}function Kd(t,e){Rd(Os(t),{recursive:!0});let n=`${t}.tmp-${process.pid}-${Date.now()}`;$d(n,`${JSON.stringify(e,null,2)}
`,{encoding:"utf8",mode:384}),_d(n,t)}function As(t){if(!Ps(t))return{};let e=Nd(t,"utf8").trim();if(!e)return{};let n;try{n=JSON.parse(e)}catch{throw new Error(`Invalid existing OpenCode config at ${t}: parse error. Not overwriting.`)}if(!Ve(n))throw new Error(`Invalid existing OpenCode config at ${t}: root must be a JSON object. Not overwriting.`);return n}function Es(t,e){if(!Ve(t))return!1;let n=t.command;return t.type==="local"&&t.enabled!==!1&&Array.isArray(n)&&n.length===2&&n[0]===e&&n[1]==="mcp"}function Wt(t,e,n,r){let o=Ld(Os(t),"opencode.jsonc"),s=Ps(o)?o:void 0,i=As(t),a=i.mcp;if(a!==void 0&&!Ve(a))throw new Error(`Invalid existing OpenCode config: mcp must be an object in ${t}.`);let c=Ve(a)?{...a}:{},u=c[n];if(Es(u,e)&&!r)return{installed:!0,changed:!1,preservedJsonc:s};c[n]={type:"local",command:[e,"mcp"],enabled:!0};let p={...i,mcp:c};Kd(t,p);let l=As(t);if(!Ve(l.mcp)||!Es(l.mcp[n],e))throw new Error(`OpenCode MCP configuration was written but verification failed for ${t}.`);return{installed:!0,changed:!0,preservedJsonc:s}}function Ts(t={}){let e=t.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=t.serverName??"toolnet-memory",r=t.scope??"global";if(t.configFile)return{...Wt(t.configFile,e,n,t.force??!1),configFile:t.configFile,serverName:n,command:[e,"mcp"]};if(r==="both"){let i=qe(),a=Be({cwd:t.cwd}),c=Wt(i,e,n,t.force??!1),u=Wt(a,e,n,t.force??!1);return{installed:!0,changed:c.changed||u.changed,configFile:i,serverName:n,command:[e,"mcp"],preservedJsonc:c.preservedJsonc??u.preservedJsonc}}let o=r==="project"?Be({cwd:t.cwd}):qe();return{...Wt(o,e,n,t.force??!1),configFile:o,serverName:n,command:[e,"mcp"]}}import{existsSync as Gh,mkdirSync as zd,readFileSync as Uh,writeFileSync as qd}from"node:fs";import{dirname as Bd,join as Ns}from"node:path";function An(t){if(!t)return 0;let e=Array.from(t).length,n=t.trim().split(/\s+/u).filter(Boolean).length;return Math.ceil(Math.max(e/3.5,n*1.3))}function I(t,e){let n=t.replace(/\s+/g," ").trim();return n.length<=e?n:n.slice(0,Math.max(0,e-1)).trimEnd()+"\u2026"}function Fd(t){let e=[],n=!1;for(let r of t.split(/\r?\n/u)){let o=r.trim();if(o.includes("<!--")&&(n=!0),n){o.includes("-->")&&(n=!1);continue}let s=o.toLowerCase();if(!(!o||o.startsWith("#")||o==="```"||s.startsWith("- [enforce]")||s.startsWith("* [enforce]")||s.startsWith("- [advisory]")||s.startsWith("* [advisory]"))&&(o=o.replace(/^[-*]\s+/u,""),o&&e.push(I(o,280)),e.length>=16))break}return e}function Dd(t){let e=[],n=[];for(let r of t.split(/\\r?\\n/u)){let o=r.trim(),s=o.toLowerCase(),a=["- [enforce]","* [enforce]","- [advisory]","* [advisory]"].find(u=>s.startsWith(u));if(!a)continue;let c=o.slice(a.length).trim();c&&(a.includes("enforce")?e.push(c):n.push(c))}return{enforce:e,advisory:n}}function Wd(t,e){let n=[];for(let r of t){let o=[...n,r].join(`
`);if(An(o)<=e){n.push(r);continue}let s=An(n.join(`
`)),i=Math.max(0,e-s);if(i>=16){let a=Math.floor(i*3.2),c=I(r,a);c&&n.push(c)}break}return n.join(`
`).trim()}async function Rs(t){let e=Math.max(256,Math.min(2e3,t.maxTokens??1e3)),n=Ot(t.project,!1),r=n?.content??"";r||(r=await t.storage.getText(`projects/${t.project.id}/project/manual.md`)??"");let o=Dd(r),s=n?n.rules.filter(d=>d.mode==="enforce").map(d=>d.text):o.enforce,i=n?n.rules.filter(d=>d.mode==="advisory").map(d=>d.text):o.advisory,a=r?Fd(r):[],c=await It(t.project,t.storage),u=await No(t.project,t.storage),p=await es(t.project,t.storage),l=[];if(l.push("[TOOLNET PROJECT CONTEXT]"),l.push(`Project: ${t.project.name}`),l.push("Continue existing project state. Do not restart completed work unless evidence shows it is necessary."),r&&l.push(`Full operating manual: ${Pt(t.project)}`),s.length){l.push("","PROJECT RULES \u2014 MUST FOLLOW");for(let d of s.slice(0,24))l.push(`- [ENFORCE] ${I(d,240)}`)}if(i.length){l.push("","PROJECT PREFERENCES");for(let d of i.slice(0,10))l.push(`- ${I(d,220)}`)}if(u&&(u.mission&&l.push("","MISSION",I(u.mission.value,420)),u.activeObjective&&l.push("","CURRENT OBJECTIVE",I(u.activeObjective.value,420)),u.why&&l.push("","WHY THIS WORK MATTERS",I(u.why.value,420)),u.desiredOutcome&&l.push("","DESIRED OUTCOME",I(u.desiredOutcome.value,420)),u.planRationale&&l.push("","WHY THIS APPROACH",I(u.planRationale.value,420))),c){if(l.push("","ACTIVE WORK"),c.goal&&l.push(`Goal: ${I(c.goal,320)}`),c.plan&&l.push(`Plan: ${I(c.plan,320)}`),l.push(`Progress: phases ${c.progress.phasesCompleted}/${c.progress.phasesTotal}; tasks ${c.progress.tasksCompleted}/${c.progress.tasksTotal}; blocked ${c.progress.blocked}`),c.currentPhase&&l.push(`Current phase: ${c.currentPhase.title} [${c.currentPhase.status}]`),c.currentPhase&&u){let d=u.phases.find(m=>m.order===c.currentPhase?.order);d&&(d.objective&&l.push(`Phase objective: ${I(d.objective.value,340)}`),d.why?l.push(`Why this phase: ${I(d.why.value,340)}`):l.push("Why this phase: not explicitly recorded. Inspect existing implementation before assuming intent."),d.deliverable&&l.push(`Deliverable: ${I(d.deliverable.value,340)}`),d.dependencies.length&&l.push(`Depends on: ${d.dependencies.slice(0,4).map(m=>I(m.value,180)).join("; ")}`),d.acceptanceCriteria.length&&(l.push("","DEFINITION OF DONE"),d.acceptanceCriteria.slice(0,6).forEach(m=>{l.push(`- ${I(m.value,260)}`)})),d.openQuestions.length&&(l.push("","OPEN QUESTIONS FOR CURRENT PHASE"),d.openQuestions.slice(0,4).forEach(m=>{l.push(`- ${I(m.value,260)}`)})))}c.currentTask&&l.push(`Current task: ${c.currentTask.title} [${c.currentTask.status}]`),c.nextActions.length&&(l.push("","NEXT ACTIONS"),c.nextActions.slice(0,6).forEach((d,m)=>{l.push(`${m+1}. ${I(d,260)}`)})),c.blockers.length&&(l.push("","BLOCKERS"),c.blockers.slice(0,5).forEach(d=>{l.push(`- ${I(d,260)}`)})),c.warnings.length&&(l.push("","ATTENTION"),c.warnings.slice(-5).forEach(d=>{l.push(`- ${I(d,260)}`)})),c.decisions.length&&(l.push("","RECENT DECISIONS"),c.decisions.slice(-5).forEach(d=>{l.push(`- ${I(d,260)}`)})),c.lastSession&&l.push("",`Last work session: ${c.lastSession.agent} / ${c.lastSession.nativeSessionId}`)}if(u&&u.openQuestions.length&&(l.push("","UNRESOLVED QUESTIONS"),u.openQuestions.slice(0,5).forEach(d=>{l.push(`- ${I(d.value,260)}`)})),p&&l.push(`Latest handoff: ${p.reason} / ${p.sourceSession.agent}`),a.length){l.push("","OPERATING NOTES");for(let d of a)l.push(`- ${d}`)}l.push("","Before changing anything: verify the current repository state and continue from the active phase/task above.");let f=Wd(l,e);return{version:1,projectId:t.project.id,projectName:t.project.name,text:f,estimatedTokens:An(f),maxTokens:e,hasManual:!!r,hasWorkState:!!c,hasHandoff:!!p,generatedAt:new Date().toISOString()}}function Vd(t){return Ns(t.rootPath,".toolnet","context","startup.md")}function Jd(t){return Ns(t.rootPath,".toolnet","context","startup.json")}function Hd(t,e){let n=Vd(t);zd(Bd(n),{recursive:!0}),qd(n,e.text.endsWith(`
`)?e.text:e.text+`
`,{encoding:"utf8",mode:384}),N(Jd(t),e)}async function _s(t,e,n=800){let o=(await Rs({project:t,storage:e,maxTokens:n})).text;lt(o)>n&&(o=dt(o,n),o+=`

[Context trimmed by ToolNet Memory token budget]
`);let i={version:1,projectId:t.id,projectName:t.name,text:o,digest:w(o),estimatedTokens:lt(o),generatedAt:new Date().toISOString()};return Hd(t,i),await e.put(`projects/${t.id}/context/startup.md`,i.text+`
`,"text/markdown"),await e.put(`projects/${t.id}/context/startup.json`,JSON.stringify(i,null,2)+`
`,"application/json"),i}function he(t,e){let n=t.indexOf(e);if(!(n<0))return t[n+1]}function Se(t,e){return t.includes(e)}function Ud(t){let e=He(),n=Hn(Vn({provider:e.storage.provider,huggingface:e.storage.huggingface,localRoot:e.storage.localRoot}),{attempts:3});return new tt(n,t.id,t.name,t.remote??t.name)}function Yd(){return En("sh",["-lc","command -v opencode >/dev/null 2>&1"],{stdio:"ignore"}).status===0}function Xd(){try{return En("opencode",["--version"],{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:5e3}).stdout?.trim()||void 0}catch{return}}function Qd(){try{let t=En("opencode",["mcp","list","--format","json"],{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:1e4});if(t.status!==0)return{available:!1,servers:[]};let e=JSON.parse(t.stdout||"[]");return{available:!0,servers:Array.isArray(e)?e.map(r=>String(r.name||r.id||"")):[]}}catch{return{available:!1,servers:[]}}}function Zd(t){let e=[],n=Yd();n||e.push("opencode binary not found");let r=Xd(),o=qe(),s=ye(o),i=Be({cwd:t}),a=ye(i),c=process.env.OPENCODE_CONFIG?.trim(),u=c?ye(c):!1,p=!1;if(s)try{p=!!JSON.parse($s(o,"utf8")).mcp?.["toolnet-memory"]}catch{}let l=!1;if(a)try{l=!!JSON.parse($s(i,"utf8")).mcp?.["toolnet-memory"]}catch{}let f=Ft(),d=ye(`${f}/toolnet-memory.js`),m=Gd(t??process.cwd(),".opencode","plugins"),S=ye(`${m}/toolnet-memory.js`),y=Dt(),g=ye(y),k;return n&&(k=Qd()),{opencodeBinaryDetected:n,version:r,globalConfigExists:s,projectConfigExists:a,customConfigExists:u,globalMcpReady:p,projectMcpReady:l,globalPluginExists:d,projectPluginExists:S,continuityInstructions:g,mcpConnectionStatus:k,errors:e}}async function ep(){let[t="help",...e]=process.argv.slice(2),n=Se(e,"--json"),r=Se(e,"--force"),o=he(e,"--scope")??"global",s=he(e,"--project")??process.cwd();if(t==="status"){let u=Zd(s);if(n)console.log(JSON.stringify(u,null,2));else if(console.log("OpenCode Integration"),console.log("===================="),console.log(""),console.log(`Binary detected     : ${u.opencodeBinaryDetected?"\u2713":"\u2717"}`),u.version&&console.log(`Version             : ${u.version}`),console.log(`Global config       : ${u.globalConfigExists?"\u2713":"\u2717"}`),console.log(`Project config      : ${u.projectConfigExists?"\u2713":"\u2717"}`),u.customConfigExists&&console.log(`Custom config       : \u2713 (${process.env.OPENCODE_CONFIG})`),console.log(`Global MCP          : ${u.globalMcpReady?"\u2713":"\u2717"}`),console.log(`Project MCP         : ${u.projectMcpReady?"\u2713":"\u2717"}`),console.log(`Global plugin       : ${u.globalPluginExists?"\u2713":"\u2717"}`),console.log(`Project plugin      : ${u.projectPluginExists?"\u2713":"\u2717"}`),console.log(`Continuity rules    : ${u.continuityInstructions?"\u2713":"\u2717"}`),u.mcpConnectionStatus&&(console.log(`MCP connection      : ${u.mcpConnectionStatus.available?"\u2713":"\u2717"}`),u.mcpConnectionStatus.servers.length>0&&console.log(`  Servers           : ${u.mcpConnectionStatus.servers.join(", ")}`)),u.errors.length>0){console.log("");for(let p of u.errors)console.log(`  \u26A0 ${p}`)}u.opencodeBinaryDetected||(process.exitCode=1);return}if(t==="install-plugin"){let u=Ts({binary:he(e,"--bin"),scope:o,cwd:s,force:r}),p=Ms({binary:he(e,"--bin"),scope:o,cwd:s});if(n)console.log(JSON.stringify({mcp:u,pluginFiles:p},null,2));else{console.log(`\u2705 OpenCode integration installed (scope: ${o})`),console.log(`  MCP config: ${u.configFile}`),u.changed?console.log(`  \u2713 MCP server "${u.serverName}" added`):console.log(`  \u2713 MCP server "${u.serverName}" already configured`);for(let l of p)console.log(`  \u2713 ${l}`);console.log(""),console.log("OpenCode will load plugins automatically on next start."),console.log("Verify MCP with: opencode mcp list")}return}let i=new Qe().detect(s),a=Ud(i),c=he(e,"--db");if(t==="sync"){let u=e.find(S=>!S.startsWith("--")&&S!==s&&S!==c);if(!u)throw new Error("Usage: session:opencode-sync <session-id>");let p=Se(e,"--idle"),l=Se(e,"--error"),f=Se(e,"--compacted"),d=Se(e,"--local-only"),m=await In({project:i,storage:a,nativeSessionId:u,dbPath:c,idle:p,error:l,compacted:f,localOnly:d});if(!d&&(p||f||l))try{await _s(i,a,800)}catch{}console.log(JSON.stringify(m,null,2));return}if(t==="recover"){let u=he(e,"--limit"),p=u?Number(u):100,l=await vs({project:i,storage:a,dbPath:c,limit:Number.isFinite(p)?p:100});console.log(JSON.stringify({project:i.name,sessions:l.length,importedMessages:l.reduce((f,d)=>f+d.importedMessages,0),importedParts:l.reduce((f,d)=>f+d.importedParts,0)},null,2));return}console.log(`OpenCode Session Adapter

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
`)}ep().catch(t=>{console.error(t instanceof Error?t.message:t),process.exit(1)});
