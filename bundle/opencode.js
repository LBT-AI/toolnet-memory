import{existsSync as ks,readFileSync as vs}from"node:fs";import{homedir as ws}from"node:os";import{join as bs}from"node:path";function xs(t){let e=t.trim();return e.length>=2&&e.startsWith('"')&&e.endsWith('"')?(e=e.slice(1,-1),e.replace(/\\n/g,`
`).replace(/\\r/g,"\r").replace(/\\t/g,"	").replace(/\\"/g,'"').replace(/\\\\/g,"\\")):e.length>=2&&e.startsWith("'")&&e.endsWith("'")?e.slice(1,-1):e}function Cs(){let t=process.env.TOOLNET_GLOBAL_ENV??bs(ws(),".config","toolnet-memory",".env");if(!ks(t))return;let e=vs(t,"utf8");for(let n of e.split(/\r?\n/)){let r=n.trim();if(!r||r.startsWith("#"))continue;r.startsWith("export ")&&(r=r.slice(7));let s=r.indexOf("=");if(s<=0)continue;let o=r.slice(0,s).trim();/^[A-Za-z_][A-Za-z0-9_]*$/.test(o)&&process.env[o]===void 0&&(process.env[o]=xs(r.slice(s+1)))}}Cs();function ue(t,e){return t===void 0?e:["1","true","yes","on"].includes(t.toLowerCase())}function le(t,e){if(!t)return e;let n=Number(t);return Number.isFinite(n)?n:e}function Ce(){return{memory:{autoCapture:ue(process.env.MEMORY_AUTO_CAPTURE,!0),autoRetrieve:ue(process.env.MEMORY_AUTO_RETRIEVE,!0),autoSummarize:ue(process.env.MEMORY_AUTO_SUMMARIZE,!0),autoSync:ue(process.env.MEMORY_AUTO_SYNC,!0)},retrieval:{maxCandidates:le(process.env.MEMORY_MAX_CANDIDATES,50),rerankTop:le(process.env.MEMORY_RERANK_TOP,10),finalContext:le(process.env.MEMORY_FINAL_CONTEXT,5),tokenBudget:le(process.env.MEMORY_TOKEN_BUDGET,2e3)},storage:{provider:process.env.MEMORY_STORAGE_PROVIDER??"huggingface",r2:{accountId:process.env.R2_ACCOUNT_ID,bucket:process.env.R2_BUCKET,accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY},s3:{endpoint:process.env.S3_ENDPOINT,region:process.env.S3_REGION,bucket:process.env.S3_BUCKET,accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY,forcePathStyle:ue(process.env.S3_FORCE_PATH_STYLE,!1)},huggingface:{namespace:process.env.HF_NAMESPACE,bucket:process.env.HF_BUCKET,accessKeyId:process.env.HF_S3_ACCESS_KEY_ID,secretAccessKey:process.env.HF_S3_SECRET_ACCESS_KEY},localRoot:process.env.MEMORY_LOCAL_STORAGE_PATH},cache:{maxMb:le(process.env.MEMORY_LOCAL_CACHE_MB,200)}}}import{createHash as js}from"node:crypto";import{existsSync as yt,mkdirSync as Is,readFileSync as As,renameSync as Es,writeFileSync as Ps}from"node:fs";import{basename as Ts,dirname as je,join as Ae,parse as Ht,resolve as de}from"node:path";var Ut=".toolnet",Ms="project.json";function Os(t){return js("sha256").update(t).digest("hex").slice(0,16)}function ht(t){return Ae(t,Ut,Ms)}function Rs(t){return yt(ht(t))}function Ns(t,e){let n=de(t),r=Ht(n).root;for(;;){if(Rs(n))return n;if(n===r||e&&n===de(e))break;let s=je(n);if(s===n)break;n=s}return null}function _s(t){let e=de(t),n=Ht(e).root,r=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"];for(;;){if(r.some(o=>yt(Ae(e,o))))return e;if(e===n)break;let s=je(e);if(s===e)break;e=s}return de(t)}function $s(t){let e;try{e=JSON.parse(As(t,"utf8"))}catch(s){throw new Error(`Invalid ToolNet project manifest: ${t}: ${s instanceof Error?s.message:String(s)}`)}if(!e||typeof e!="object")throw new Error(`Invalid ToolNet project manifest: ${t}`);let n=e;if(typeof n.id!="string"||!n.id.trim())throw new Error(`ToolNet project manifest is missing id: ${t}`);if(typeof n.name!="string"||!n.name.trim())throw new Error(`ToolNet project manifest is missing name: ${t}`);let r=new Date().toISOString();return{version:1,id:n.id,name:n.name,remote:typeof n.remote=="string"&&n.remote.trim()?n.remote:n.name,rootPath:typeof n.rootPath=="string"?n.rootPath:je(je(t)),createdAt:typeof n.createdAt=="string"?n.createdAt:r,updatedAt:typeof n.updatedAt=="string"?n.updatedAt:r,graphVersion:typeof n.graphVersion=="number"?n.graphVersion:0,memoryVersion:typeof n.memoryVersion=="number"?n.memoryVersion:0,metadata:n.metadata&&typeof n.metadata=="object"?n.metadata:void 0}}function Jt(t,e){let n=Ae(t,Ut);Is(n,{recursive:!0});let r=ht(t),s=`${r}.tmp-${process.pid}`;Ps(s,JSON.stringify(e,null,2)+`
`,{encoding:"utf8",mode:384}),Es(s,r)}function Gt(t,e){return{id:t.id,name:t.name,remote:t.remote,rootPath:e,createdAt:t.createdAt,updatedAt:t.updatedAt,graphVersion:t.graphVersion,memoryVersion:t.memoryVersion,metadata:t.metadata}}var Ie=class{detect(e=process.cwd()){let n=de(e),r=_s(n),o=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(p=>yt(Ae(r,p))),i=Ns(n,o?r:void 0);if(i){let p=ht(i),l=$s(p);return l.rootPath!==i&&(l.rootPath=i,l.updatedAt=new Date().toISOString(),Jt(i,l)),Gt(l,i)}let a=new Date().toISOString(),c=Ts(r),u={version:1,id:Os(r),name:c,remote:c,rootPath:r,createdAt:a,updatedAt:a,graphVersion:0,memoryVersion:0};return Jt(r,u),Gt(u,r)}};var Ks=[{type:"openai_key",regex:/\bsk-[A-Za-z0-9_\-]{20,}\b/g},{type:"huggingface_token",regex:/\bhf_[A-Za-z0-9]{20,}\b/g},{type:"hf_s3_access_key",regex:/\bHFAK[A-Za-z0-9]{8,}\b/g},{type:"bearer_token",regex:/\bBearer\s+[A-Za-z0-9._\-]{16,}\b/gi},{type:"jwt",regex:/\beyJ[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\b/g},{type:"private_key",regex:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g},{type:"password_assignment",regex:/\b(password|passwd|pwd)\s*[:=]\s*["']?[^"'\s]{6,}["']?/gi},{type:"secret_assignment",regex:/\b(secret|api[_-]?key|access[_-]?token|refresh[_-]?token)\s*[:=]\s*["']?[^"'\s]{8,}["']?/gi},{type:"cookie",regex:/\b(cookie|set-cookie)\s*[:=]\s*[^;\n]{8,}/gi}],Ee=class{scan(e){let n=[];for(let r of Ks){let s=new RegExp(r.regex.source,r.regex.flags);for(let o of e.matchAll(s))n.push({type:r.type,value:o[0]})}return n}hasSecrets(e){return this.scan(e).length>0}};var H=class{scanner=new Ee;sanitize(e){let n=e,r=this.scanner.scan(e),s=new Set;for(let o of r)s.add(o.type),n=n.split(o.value).join(`[REDACTED:${o.type}]`);return{text:n,redacted:r.length,secretTypes:[...s]}}sanitizeValue(e){if(typeof e=="string")return this.sanitize(e).text;if(Array.isArray(e))return e.map(n=>this.sanitizeValue(n));if(e&&typeof e=="object"){let n={};for(let[r,s]of Object.entries(e)){let o=r.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g,"");o.includes("password")||o.includes("passwd")||o==="pwd"||o.includes("secret")||o.includes("token")||o.includes("cookie")||o.includes("authorization")||o.includes("apikey")||o.includes("accesskey")||o.includes("privatekey")||o.includes("clientsecret")||o.includes("credential")?n[r]="[REDACTED]":n[r]=this.sanitizeValue(s)}return n}return e}};import{homedir as io}from"node:os";import{join as ao}from"node:path";import{DeleteObjectCommand as Ws,GetObjectCommand as Ls,HeadObjectCommand as Fs,ListObjectsV2Command as Ds,PutObjectCommand as zs,S3Client as qs}from"@aws-sdk/client-s3";import{getSignedUrl as Bs}from"@aws-sdk/s3-request-presigner";var Pe=class{name="huggingface";client;bucket;constructor(e){this.bucket=e.bucket,this.client=new qs({region:"us-east-1",endpoint:`https://s3.hf.co/${e.namespace}`,forcePathStyle:!0,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:e.accessKeyId,secretAccessKey:e.secretAccessKey}})}async put(e,n,r="application/octet-stream"){let s=typeof n=="string"?Buffer.from(n,"utf8"):n;await this.client.send(new zs({Bucket:this.bucket,Key:e,Body:s,ContentType:r}))}async get(e){let n=await Bs(this.client,new Ls({Bucket:this.bucket,Key:e}),{expiresIn:60}),r=await fetch(n,{redirect:"follow"});if(r.status===404)return null;if(!r.ok)throw new Error(`HF download failed: ${r.status} ${r.statusText}`);return new Uint8Array(await r.arrayBuffer())}async getText(e){let n=await this.get(e);return n?Buffer.from(n).toString("utf8"):null}async exists(e){try{return await this.client.send(new Fs({Bucket:this.bucket,Key:e})),!0}catch(n){if(typeof n=="object"&&n!==null&&"$metadata"in n&&n.$metadata?.httpStatusCode===404)return!1;throw n}}async delete(e){await this.client.send(new Ws({Bucket:this.bucket,Key:e}))}async list(e=""){let n=[],r;do{let s=await this.client.send(new Ds({Bucket:this.bucket,Prefix:e||void 0,ContinuationToken:r}));for(let o of s.Contents??[])o.Key&&n.push({key:o.Key,size:o.Size,updatedAt:o.LastModified?.toISOString()});r=s.IsTruncated?s.NextContinuationToken:void 0}while(r);return n}};import{access as Yt,mkdir as Vs,readFile as Js,readdir as Gs,rm as Hs,stat as Xt,writeFile as Us}from"node:fs/promises";import{dirname as Ys,join as Xs,relative as Qt,resolve as Qs}from"node:path";var pe=class{constructor(e){this.root=e}root;name="local";path(e){let n=e.replace(/^\/+/,"");return Qs(this.root,n)}async put(e,n){let r=this.path(e);await Vs(Ys(r),{recursive:!0}),await Us(r,n)}async get(e){try{return await Js(this.path(e))}catch(n){if(typeof n=="object"&&n!==null&&"code"in n&&n.code==="ENOENT")return null;throw n}}async getText(e){let n=await this.get(e);return n?Buffer.from(n).toString("utf8"):null}async exists(e){try{return await Yt(this.path(e)),!0}catch{return!1}}async delete(e){await Hs(this.path(e),{force:!0})}async list(e=""){let n=this.path(e),r=[];try{await Yt(n)}catch{return r}let s=async i=>{let a=await Gs(i,{withFileTypes:!0});for(let c of a){let u=Xs(i,c.name);if(c.isDirectory()){await s(u);continue}let p=await Xt(u);r.push({key:Qt(this.root,u),size:p.size,updatedAt:p.mtime.toISOString()})}},o=await Xt(n);return o.isDirectory()?await s(n):r.push({key:Qt(this.root,n),size:o.size,updatedAt:o.mtime.toISOString()}),r}};import{DeleteObjectCommand as Zs,GetObjectCommand as eo,HeadObjectCommand as to,ListObjectsV2Command as no,PutObjectCommand as ro,S3Client as so}from"@aws-sdk/client-s3";import{getSignedUrl as oo}from"@aws-sdk/s3-request-presigner";var me=class{name;client;bucket;constructor(e){this.name=e.name??"s3",this.bucket=e.bucket,this.client=new so({region:e.region??"us-east-1",endpoint:e.endpoint||void 0,forcePathStyle:e.forcePathStyle??!1,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:e.accessKeyId,secretAccessKey:e.secretAccessKey}})}async put(e,n,r="application/octet-stream"){let s=typeof n=="string"?Buffer.from(n,"utf8"):n;await this.client.send(new ro({Bucket:this.bucket,Key:e,Body:s,ContentType:r}))}async get(e){let n=await oo(this.client,new eo({Bucket:this.bucket,Key:e}),{expiresIn:60}),r=await fetch(n,{redirect:"follow"});if(r.status===404)return null;if(!r.ok)throw new Error(`${this.name} download failed: ${r.status} ${r.statusText}`);return new Uint8Array(await r.arrayBuffer())}async getText(e){let n=await this.get(e);return n?Buffer.from(n).toString("utf8"):null}async exists(e){try{return await this.client.send(new to({Bucket:this.bucket,Key:e})),!0}catch(n){if(typeof n=="object"&&n!==null&&"$metadata"in n&&n.$metadata?.httpStatusCode===404)return!1;throw n}}async delete(e){await this.client.send(new Zs({Bucket:this.bucket,Key:e}))}async list(e=""){let n=[],r;do{let s=await this.client.send(new no({Bucket:this.bucket,Prefix:e||void 0,ContinuationToken:r}));for(let o of s.Contents??[])o.Key&&n.push({key:o.Key,size:o.Size,updatedAt:o.LastModified?.toISOString()});r=s.IsTruncated?s.NextContinuationToken:void 0}while(r);return n}};function St(t,e){return console.warn(e),new pe(t)}function Zt(t){let e=t.localRoot??ao(io(),".toolnet-memory","storage");if(t.provider==="r2"){let n=t.r2;return n?.accountId&&n.bucket&&n.accessKeyId&&n.secretAccessKey?new me({name:"r2",endpoint:`https://${n.accountId}.r2.cloudflarestorage.com`,region:"auto",bucket:n.bucket,forcePathStyle:!0,accessKeyId:n.accessKeyId,secretAccessKey:n.secretAccessKey}):St(e,"[storage] Cloudflare R2 credentials missing. Using local fallback.")}if(t.provider==="s3"){let n=t.s3;return n?.bucket&&n.accessKeyId&&n.secretAccessKey?new me({name:"s3",endpoint:n.endpoint,region:n.region??"us-east-1",bucket:n.bucket,forcePathStyle:n.forcePathStyle??!1,accessKeyId:n.accessKeyId,secretAccessKey:n.secretAccessKey}):St(e,"[storage] S3 credentials missing. Using local fallback.")}if(t.provider==="huggingface"){let n=t.huggingface;return n?.namespace&&n.bucket&&n.accessKeyId&&n.secretAccessKey?new Pe({namespace:n.namespace,bucket:n.bucket,accessKeyId:n.accessKeyId,secretAccessKey:n.secretAccessKey}):St(e,"[storage] Hugging Face credentials missing. Using local fallback.")}return new pe(e)}function co(t){return new Promise(e=>setTimeout(e,t))}async function en(t,e={}){let n=Math.max(1,e.attempts??3),r=e.baseDelayMs??150,s=e.maxDelayMs??2e3,o;for(let i=1;i<=n;i++)try{return await t()}catch(a){if(o=a,i>=n)break;let c=Math.min(s,r*2**(i-1)),u=Math.floor(Math.random()*Math.max(1,c*.2));await co(c+u)}throw o}var uo=new Set(["put","get","getText","delete","list"]);function tn(t,e={}){return new Proxy(t,{get(n,r){let s=Reflect.get(n,r,n);return typeof s!="function"?s:uo.has(r)?(...o)=>en(()=>Promise.resolve(s.apply(n,o)),e):s.bind(n)}})}function nn(t){let e=t.trim().replace(/\s+/g,"_").replace(/[^A-Za-z0-9._-]/g,"_").replace(/_+/g,"_").replace(/^\.+|\.+$/g,"").slice(0,100);if(!e||e==="."||e==="..")throw new Error("Invalid project storage folder");return e}function rn(t){let e=t.replace(/^\/+/,"");if(e.startsWith("memories/"))return"memory/records/"+e.slice(9);if(e.startsWith("vectors/"))return"memory/vectors/"+e.slice(8);if(e.startsWith("graph/"))return"code/graph/"+e.slice(6);let n=e.match(/^(snapshots\/[^/]+\/)memories\/(.+)$/);if(n)return`${n[1]}memory/records/${n[2]}`;if(n=e.match(/^(snapshots\/[^/]+\/)vectors\/(.+)$/),n)return`${n[1]}memory/vectors/${n[2]}`;if(n=e.match(/^(snapshots\/[^/]+\/)graph\/(.+)$/),n)return`${n[1]}code/graph/${n[2]}`;let r=e.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)memories\/(.+)$/);if(r)return`${r[1]}memory/records/${r[2]}`;if(r=e.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)vectors\/(.+)$/),r)return`${r[1]}memory/vectors/${r[2]}`;if(r=e.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)graph\/(.+)$/),r)return`${r[1]}code/graph/${r[2]}`;let s=e.match(/^(projects\/[^/]+\/)memories\/(.+)$/);return s?`${s[1]}memory/records/${s[2]}`:(s=e.match(/^(projects\/[^/]+\/)vectors\/(.+)$/),s?`${s[1]}memory/vectors/${s[2]}`:(s=e.match(/^(projects\/[^/]+\/)graph\/(.+)$/),s?`${s[1]}code/graph/${s[2]}`:e))}var Te=class{constructor(e,n,r,s){this.provider=e;this.name=e.name,this.projectId=n,this.projectName=r,this.folder=nn(s??r),this.sourcePrefix=`projects/${n}`,this.targetPrefix=`projects/${this.folder}`}provider;name;folder;sourcePrefix;targetPrefix;projectId;projectName;registryPromise;async registerProject(){let e=`${this.targetPrefix}/project.json`,n=new Date().toISOString(),r=n,s=await this.provider.getText(e);if(s){let i;try{i=JSON.parse(s)}catch(a){throw new Error(`Invalid remote ToolNet project manifest at ${e}: ${a instanceof Error?a.message:String(a)}`)}if(typeof i.id=="string"&&i.id!==this.projectId)throw new Error(["ToolNet remote project namespace collision.",`Remote folder: ${this.targetPrefix}`,`Existing project id: ${i.id}`,`Current project id: ${this.projectId}`,"Refusing to mix data from two projects."].join(" "));typeof i.createdAt=="string"&&(r=i.createdAt)}let o={version:1,id:this.projectId,name:this.projectName,remote:this.folder,createdAt:r,updatedAt:n};await this.provider.put(e,JSON.stringify(o,null,2)+`
`,"application/json")}async ensureRegistered(){return this.registryPromise||(this.registryPromise=this.registerProject()),this.registryPromise}key(e){if(e=rn(e),e===this.sourcePrefix)return this.targetPrefix;if(e.startsWith(`${this.sourcePrefix}/`))return this.targetPrefix+e.slice(this.sourcePrefix.length);if(e===this.targetPrefix||e.startsWith(`${this.targetPrefix}/`))return e;if(e.startsWith("projects/"))throw new Error(["Cross-project storage access denied.",`Current project: ${this.targetPrefix}`,`Requested key: ${e}`].join(" "));return e}async put(e,n,r){return await this.ensureRegistered(),this.provider.put(this.key(e),n,r)}async get(e){return await this.ensureRegistered(),this.provider.get(this.key(e))}async getText(e){return await this.ensureRegistered(),this.provider.getText(this.key(e))}async delete(e){return await this.ensureRegistered(),this.provider.delete(this.key(e))}async exists(e){return await this.ensureRegistered(),this.provider.exists(this.key(e))}async list(e){return await this.ensureRegistered(),this.provider.list(this.key(e))}};import{existsSync as ou}from"node:fs";import{execFileSync as iu}from"node:child_process";import{homedir as au}from"node:os";import{isAbsolute as cu,join as Zr,relative as uu,resolve as es}from"node:path";import{DatabaseSync as lu}from"node:sqlite";import{join as ho}from"node:path";import{createHash as lo}from"node:crypto";import{dirname as po}from"node:path";import{mkdirSync as mo,readFileSync as fo,renameSync as go,writeFileSync as yo}from"node:fs";function v(t){return lo("sha256").update(t).digest("hex")}function kt(t){if(Array.isArray(t))return t.map(kt);if(t&&typeof t=="object"){let e=t,n={};for(let r of Object.keys(e).sort())n[r]=kt(e[r]);return n}return t}function sn(t){return JSON.stringify(kt(t))}function on(t){try{return JSON.parse(fo(t,"utf8"))}catch{return null}}function R(t,e){mo(po(t),{recursive:!0});let n=`${t}.${process.pid}.tmp`;yo(n,JSON.stringify(e,null,2)+`
`,{encoding:"utf8",mode:384}),go(n,t)}function an(t,e){let n=t.trim(),r=n.replace(/\s+/g,"_").replace(/[^A-Za-z0-9._-]/g,"_").replace(/_+/g,"_").replace(/^\.+|\.+$/g,""),s=v(n).slice(0,12);if(!r||r==="."||r==="..")return`${e}--${s}`;let o=r.slice(0,100);return o===n&&n.length<=100?o:`${o.slice(0,85)}--${s}`}function cn(t,e,n){let r=e.trim(),s=n.trim();if(!r)throw new Error("Session agent is required");if(!s)throw new Error("Native session ID is required");let o=an(r.toLowerCase(),"agent"),i=an(s,"session");return{projectId:t.id,projectName:t.name,projectRoot:t.rootPath,agent:r,nativeSessionId:s,sessionKey:`${r}:${s}`,remotePrefix:["projects",t.id,"sessions",o,i].join("/"),localDirectory:ho(t.rootPath,".toolnet","sessions",o,i)}}function un(t){return String(t).padStart(12,"0")}var Me=class{constructor(e,n=100,r=512*1024){this.storage=e;this.maxEventsPerChunk=n;this.maxChunkBytes=r;if(n<1)throw new Error("maxEventsPerChunk must be positive");if(r<1024)throw new Error("maxChunkBytes is too small")}storage;maxEventsPerChunk;maxChunkBytes;async getJson(e){let n=await this.storage.getText(e);return n?JSON.parse(n):null}async putJson(e,n){await this.storage.put(e,JSON.stringify(n,null,2)+`
`,"application/json")}async scan(e){let n=`${e.remotePrefix}/events/`,r=await this.storage.list(n),s=[],o=0;for(let i of r){let a=i.key.match(/\/events\/(\d+)-(\d+)-[a-f0-9]+\.jsonl$/);if(!a)continue;let c=Number(a[1]),u=Number(a[2]);!Number.isFinite(c)||!Number.isFinite(u)||(s.push({key:i.key,start:c,end:u}),o=Math.max(o,u))}return s.sort((i,a)=>i.start-a.start),{chunks:s,maxSequence:o}}split(e){let n=[],r=[],s=0;for(let o of e){let i=Buffer.byteLength(JSON.stringify(o)+`
`,"utf8");r.length>0&&(r.length>=this.maxEventsPerChunk||s+i>this.maxChunkBytes)&&(n.push(r),r=[],s=0),r.push(o),s+=i}return r.length>0&&n.push(r),n}async loadManifest(e){return this.getJson(`${e.remotePrefix}/session.json`)}async loadCursor(e){return this.getJson(`${e.remotePrefix}/cursor.json`)}async recover(e){let n=await this.scan(e);return{maxSequence:n.maxSequence,chunkCount:n.chunks.length}}async append(e,n,r,s={}){let o=await this.loadManifest(e),i=await this.scan(e),a=n.filter(h=>h.sequence>i.maxSequence),c=0;for(let h of this.split(a)){let y=h[0],k=h[h.length-1],A=h.map(O=>JSON.stringify(O)).join(`
`)+`
`,M=v(A).slice(0,16),T=[e.remotePrefix,"events",`${un(y.sequence)}-${un(k.sequence)}-${M}.jsonl`].join("/");await this.storage.exists(T)||await this.storage.put(T,A,"application/x-ndjson"),c+=h.length}let u=await this.scan(e),p=n[n.length-1],l=o?.status??"active";p?.type==="session_end"||p?.type==="session_idle"?l="idle":p?.type==="error"?l="error":n.length>0&&(l="active");let m=new Date().toISOString(),d=n[0],g={version:1,projectId:e.projectId,projectName:e.projectName,agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,status:l,createdAt:o?.createdAt??d?.timestamp??m,updatedAt:p?.timestamp??m,firstEventAt:o?.firstEventAt??d?.timestamp,lastEventAt:p?.timestamp??o?.lastEventAt,eventCount:u.maxSequence,chunkCount:u.chunks.length,metadata:{...o?.metadata,...s.metadata}};(s.title??o?.title)&&(g.title=s.title??o?.title);let S={version:1,projectId:e.projectId,agent:e.agent,nativeSessionId:e.nativeSessionId,lastLocalSequence:n.length>0?n[n.length-1].sequence:u.maxSequence,lastRemoteSequence:u.maxSequence,sourceCursors:r,updatedAt:m};return await this.putJson(`${e.remotePrefix}/cursor.json`,S),await this.putJson(`${e.remotePrefix}/session.json`,g),{uploadedEvents:c,lastRemoteSequence:u.maxSequence,eventCount:g.eventCount,chunkCount:g.chunkCount,status:l}}};import{closeSync as wt,existsSync as xo,fsyncSync as Co,mkdirSync as jo,openSync as bt,readSync as Io,rmSync as dn,statSync as pn,writeSync as Ao}from"node:fs";import{join as xt}from"node:path";var So=new Set(["thinking","reasoning","reasoningcontent","chainofthought","cot","analysistext","internalreasoning","modelthinking"]),ko=new Set(["reasoning","thinking","chain_of_thought","chain-of-thought","internal_reasoning","internal-reasoning"]);function vo(t){return t.toLowerCase().replace(/[^a-z0-9]+/gu,"")}function wo(t){for(let e of["type","kind"]){let n=t[e];if(typeof n=="string"){let r=n.toLowerCase();if(ko.has(r))return n}}return null}function vt(t,e=0){if(e>12)return"[ToolNet nested value omitted]";if(Array.isArray(t))return t.map(o=>vt(o,e+1));if(!t||typeof t!="object")return t;let n=t,r=wo(n);if(r)return{type:r,omitted:"[private reasoning omitted]"};let s={};for(let[o,i]of Object.entries(n))So.has(vo(o))||(s[o]=vt(i,e+1));return s}function bo(t){if(!t)return new Date().toISOString();let e=new Date(t);return Number.isNaN(e.getTime())?new Date().toISOString():e.toISOString()}function U(t){return t?.trim()||void 0}function ln(t,e={}){let n={...t.provenance??{}},r=U(t.source)??U(e.source)??U(n.source);return{...t,timestamp:bo(t.timestamp),source:r,turnId:U(t.turnId)??U(e.turnId),cwd:U(t.cwd)??U(e.cwd),data:vt(t.data??{}),provenance:n}}var Eo=12e4,Po=80,To=2e3;function Mo(t){Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,t)}var Oe=class{constructor(e,n={}){this.identity=e;this.eventContext=n;jo(e.localDirectory,{recursive:!0}),this.eventsFile=xt(e.localDirectory,"events.jsonl"),this.stateFile=xt(e.localDirectory,"state.json"),this.lockFile=xt(e.localDirectory,"journal.lock")}identity;eventContext;eventsFile;stateFile;lockFile;initialState(){let e=new Date().toISOString();return{version:1,projectId:this.identity.projectId,agent:this.identity.agent,nativeSessionId:this.identity.nativeSessionId,status:"idle",createdAt:e,updatedAt:e,lastSequence:0,lastRemoteSequence:0,remoteByteOffset:0,sourceCursors:{},recentEventIds:[]}}loadStateUnsafe(){return on(this.stateFile)??this.initialState()}loadState(){return this.withLock(()=>this.loadStateUnsafe())}saveStateUnsafe(e){R(this.stateFile,e)}acquireLock(){for(let e=0;e<Po;e+=1)try{return bt(this.lockFile,"wx",384)}catch(n){if(n.code!=="EEXIST")throw n;try{if(Date.now()-pn(this.lockFile).mtimeMs>Eo){dn(this.lockFile,{force:!0});continue}}catch{}Mo(25)}throw new Error(`Session journal is locked: ${this.lockFile}`)}withLock(e){let n=this.acquireLock();try{return e()}finally{wt(n),dn(this.lockFile,{force:!0})}}append(e){return e.length===0?[]:this.withLock(()=>{let n=this.loadStateUnsafe(),r=new Set(n.recentEventIds),s=n.lastSequence,o=[];for(let l of e){let m=ln(l,this.eventContext),d=m.timestamp??new Date().toISOString(),g=m.data??{},S=m.provenance?.rawDigest??v(sn(g)),h=m.sourceEventId?[this.identity.projectId,this.identity.agent,this.identity.nativeSessionId,m.sourceEventId].join("|"):[this.identity.projectId,this.identity.agent,this.identity.nativeSessionId,s+1,m.type,d,S].join("|"),y=v(h).slice(0,32);if(r.has(y))continue;s+=1;let k={version:1,id:y,sequence:s,projectId:this.identity.projectId,agent:this.identity.agent,nativeSessionId:this.identity.nativeSessionId,sessionId:this.identity.nativeSessionId,type:m.type,timestamp:d,source:m.source??m.provenance?.source??this.identity.agent,data:g,provenance:{...m.provenance,rawDigest:S}};m.role!==void 0&&(k.role=m.role),m.turnId!==void 0&&(k.turnId=m.turnId),m.cwd!==void 0&&(k.cwd=m.cwd),m.sourceEventId!==void 0&&(k.sourceEventId=m.sourceEventId),m.sourceSequence!==void 0&&(k.sourceSequence=m.sourceSequence),o.push(k),r.add(y)}if(o.length===0)return[];let i=o.map(l=>JSON.stringify(l)).join(`
`)+`
`,a=bt(this.eventsFile,"a",384);try{Ao(a,i,null,"utf8"),Co(a)}finally{wt(a)}let c=o[o.length-1],u="active";c.type==="session_end"||c.type==="session_idle"?u="idle":c.type==="error"&&(u="error");let p=Array.from(r).slice(-To);return this.saveStateUnsafe({...n,status:u,updatedAt:c.timestamp,lastLocalEventAt:c.timestamp,lastSequence:c.sequence,recentEventIds:p}),o})}readPending(){return this.withLock(()=>{let e=this.loadStateUnsafe();if(!xo(this.eventsFile))return{events:[],startOffset:e.remoteByteOffset,endOffset:e.remoteByteOffset};let n=pn(this.eventsFile).size,r=Math.min(e.remoteByteOffset,n);if(n<=r)return{events:[],startOffset:r,endOffset:n};let s=n-r,o=Buffer.alloc(s),i=bt(this.eventsFile,"r");try{Io(i,o,0,s,r)}finally{wt(i)}return{events:o.toString("utf8").split(`
`).filter(Boolean).map(u=>JSON.parse(u)),startOffset:r,endOffset:n}})}markRemote(e,n){this.withLock(()=>{let r=this.loadStateUnsafe(),s=new Date().toISOString();this.saveStateUnsafe({...r,lastRemoteSequence:Math.max(r.lastRemoteSequence,e),remoteByteOffset:Math.max(r.remoteByteOffset,n),lastRemoteAt:s,updatedAt:s})})}setSourceCursor(e,n){this.withLock(()=>{let r=this.loadStateUnsafe();this.saveStateUnsafe({...r,sourceCursors:{...r.sourceCursors,[e]:String(n)},updatedAt:new Date().toISOString()})})}};import{closeSync as va,existsSync as wa,openSync as ba,readSync as xa,statSync as Ca}from"node:fs";function mn(t,e){let n=e.toLowerCase();return n.includes("kh\xF4ng \u0111\u01B0\u1EE3c")||n.includes("tuy\u1EC7t \u0111\u1ED1i")||n.includes("must not")||n.includes("never ")?"critical":t==="rule"||t==="decision"?"high":t==="todo"||n.includes("error")||n.includes("failed")||n.includes("exception")?"normal":"temporary"}var hn=[/không được/iu,/tuyệt đối/iu,/bắt buộc/iu,/đừng\s+/iu,/must not/iu,/do not/iu,/don't/iu,/\bnever\b/iu],Oo=[/từ giờ/iu,/về sau/iu,/mỗi lần/iu,/luôn luôn/iu,/\bluôn\b/iu,/quy tắc/iu,/workflow/iu,/\balways\b/iu,/\brequired\b/iu,/\bmust\b/iu,/from now on/iu],Ro=[/\bchốt\b/iu,/quyết định/iu,/sẽ dùng/iu,/chọn .+ thay/iu,/đổi sang/iu,/chuyển sang/iu,/\bdecided\b/iu,/\bchosen\b/iu,/we will use/iu,/use .+ instead/iu,/switch(?:ed)? to/iu],No=[/\btodo\b/iu,/cần làm/iu,/cần thêm/iu,/cần sửa/iu,/cần kiểm tra/iu,/tiếp theo/iu,/bước tiếp theo/iu,/còn phải/iu,/còn cần/iu,/next step/iu,/\bneed to\b/iu,/\bremaining\b/iu,/follow[- ]?up/iu],_o=[/đã sửa/iu,/đã fix/iu,/đã khắc phục/iu,/đã xử lý/iu,/hoàn tất/iu,/hoàn thành/iu,/\bfixed\b/iu,/\bresolved\b/iu,/\bimplemented\b/iu,/\bcompleted\b/iu,/\bpasses?\b/iu],fn=[/kiến trúc/iu,/pipeline/iu,/adapter/iu,/schema/iu,/runtime/iu,/namespace/iu,/storage/iu,/lưu trữ/iu,/workflow/iu,/session core/iu,/memory engine/iu,/retrieval/iu],$o=[/\bdùng\b/iu,/\btách\b/iu,/\bthay\b/iu,/\bchuyển\b/iu,/\blưu\b/iu,/\bmap\b/iu,/\buse\b/iu,/\bsplit\b/iu,/\bstore\b/iu,/\breplace\b/iu,/\bmove\b/iu],Ko=[/đường dẫn/iu,/\bpath\b/iu,/\bport\b/iu,/\bendpoint\b/iu,/\bdomain\b/iu,/\bbucket\b/iu,/\brepository\b/iu,/\brepo\b/iu,/\bbranch\b/iu,/\/[A-Za-z0-9._/-]{4,}/u],Wo=[/\blà\b/iu,/\bở\b/iu,/\bdùng\b/iu,/\bnằm\b/iu,/\bis\b/iu,/\buse\b/iu,/located/iu,/runs on/iu],gn=new Set(["content","text","message","prompt","summary","description","reason","title","last_assistant_message","lastAssistantMessage","input_messages","inputMessages"]),Lo=new Set(["payload","data","content","message","messages","parts","summary"]);function N(t,e){return e.some(n=>n.test(t))}function Sn(t){return t.normalize("NFKC").replace(/\r/g,"").replace(/^[\s>*#\-•]+/u,"").replace(/\s+/g," ").trim()}function Fo(t){return Sn(t).toLowerCase().replace(/[^\p{L}\p{N}:/._-]+/gu," ").replace(/\s+/g," ").trim()}function Do(t){return!(t.length<12||t.length>1e3||(t.match(new RegExp("\\p{L}","gu"))??[]).length<6||/^(?:https?:\/\/\S+|[A-Za-z0-9+/=]{80,})$/u.test(t))}function Ct(t,e,n,r=0){if(!(r>6)){if(typeof t=="string"){(!e||gn.has(e))&&n.push(t);return}if(Array.isArray(t)){for(let s of t.slice(0,50))Ct(s,e,n,r+1);return}if(!(!t||typeof t!="object"))for(let[s,o]of Object.entries(t))(gn.has(s)||Lo.has(s))&&Ct(o,s,n,r+1)}}function zo(t){let e=[];Ct(t.data,void 0,e);let n=[],r=new Set;for(let s of e)for(let o of s.split(/\n+|(?<=[.!?])\s+/u)){let i=Sn(o);if(Do(i)&&!r.has(i)&&(r.add(i),n.push(i),n.length>=50))return n}return n}function yn(t){return(t.role??(typeof t.data.role=="string"?t.data.role:"")).toLowerCase()}function qo(t,e,n){if(n.type==="decision")return{kind:"decision",confidence:1};if(n.type==="todo")return{kind:"todo",confidence:1};let r=e==="user"||n.type==="user_prompt",s=e==="assistant"||n.type==="assistant_message";return r&&N(t,hn)?{kind:"rule",confidence:.98}:r&&N(t,Oo)?{kind:"rule",confidence:.92}:N(t,Ro)?{kind:N(t,fn)?"architecture":"decision",confidence:r?.93:.86}:r&&N(t,No)?{kind:"todo",confidence:.87}:N(t,fn)&&N(t,$o)?{kind:"architecture",confidence:r?.88:.82}:s&&N(t,_o)?{kind:"fix",confidence:.8}:r&&N(t,Ko)&&N(t,Wo)?{kind:"context",confidence:.79}:null}function Bo(t){switch(t){case"rule":return"rule";case"decision":case"architecture":return"decision";case"todo":return"todo";case"fix":case"context":return"code"}}function Vo(t,e,n){return t==="rule"&&N(n,hn)?"critical":t==="architecture"||t==="decision"||t==="rule"?"high":t==="fix"||t==="context"?"normal":mn(e,n)}function kn(t,e){let n=[],r=new Set,s=new Map;for(let o of e){let i=typeof o.data.messageId=="string"?o.data.messageId:void 0,a=yn(o);i&&a&&s.set(i,a)}for(let o of e){let i=yn(o),a=typeof o.data.messageId=="string"?o.data.messageId:void 0;!i&&a&&(i=s.get(a)??"");for(let c of zo(o)){let u=qo(c,i,o);if(!u||u.confidence<.75)continue;let p=Bo(u.kind),l=Fo(c),m=v([t.projectId,u.kind,l].join("|"));if(r.has(m))continue;r.add(m);let d=o.provenance.sourcePath?[o.provenance.sourcePath]:[],g=o.sourceEventId?[o.sourceEventId]:[];n.push({version:1,fingerprint:m,projectId:t.projectId,agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,kind:u.kind,type:p,content:c,confidence:u.confidence,importance:Vo(u.kind,p,c),tags:[p],provenance:{agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,eventIds:[o.id],sourceEventIds:g,sourcePaths:d,firstSequence:o.sequence,lastSequence:o.sequence},createdAt:o.timestamp})}}return n}import{createHash as Jo}from"node:crypto";var Go=["project-knowledge","implementation","continuation","session-context"],Ho={"project-knowledge":"Project knowledge",implementation:"Implementation state",continuation:"Work continuation","session-context":"Session context"};function jt(t){return Jo("sha256").update(t).digest("hex")}function Re(t,e){return`${t}:${jt(e).slice(0,24)}`}function Uo(t){try{return jt(JSON.stringify(t))}catch{return jt(String(t))}}function Y(t){let e=new Set,n=[];for(let r of t){let s=r?.replace(/\s+/gu," ").trim();if(!s)continue;let o=s.normalize("NFKC").toLowerCase();e.has(o)||(e.add(o),n.push(s))}return n}function wn(t,e=420){let n=t.replace(/\s+/gu," ").trim();return n.length<=e?n:`${n.slice(0,Math.max(0,e-1)).trimEnd()}\u2026`}function Yo(t){return t==="rule"||t==="architecture"?"project-knowledge":t==="decision"||t==="fix"?"implementation":t==="todo"?"continuation":"session-context"}function vn(t){return t.length===0?0:t.reduce((e,n)=>e+n,0)/t.length}function Xo(t){return t.slice().sort((e,n)=>n.importanceScore-e.importanceScore||n.confidence-e.confidence||e.id.localeCompare(n.id)).slice(0,5).map(e=>wn(e.content)).join(" | ")}function Qo(t){return t.slice().sort((e,n)=>n.importanceScore-e.importanceScore||n.confidence-e.confidence||e.id.localeCompare(n.id)).slice(0,6).map(e=>wn(e.content)).join(`
`)}function bn(t,e){let n=t.slice().sort((m,d)=>m.sequence-d.sequence||m.timestamp.localeCompare(d.timestamp)||m.id.localeCompare(d.id)),r=n.map(m=>({id:Re("raw",[m.projectId,m.agent,m.nativeSessionId,m.id,String(m.sequence)].join("|")),level:"raw",eventId:m.id,sourceEventId:m.sourceEventId,sequence:m.sequence,type:m.type,role:m.role,timestamp:m.timestamp,sourcePath:m.provenance.sourcePath,payloadDigest:Uo(m.data)})),s=new Map,o=new Map;n.forEach((m,d)=>{let g=r[d];g&&(s.set(m.id,g.id),m.sourceEventId&&o.set(m.sourceEventId,g.id))});let i=e.map(m=>{let d=Y([...m.provenance.eventIds.map(g=>s.get(g)),...m.provenance.sourceEventIds.map(g=>o.get(g))]);return{id:Re("fact",m.fingerprint),level:"fact",fingerprint:m.fingerprint,kind:m.kind,type:m.type,content:m.content,knowledgeClass:m.knowledgeClass,importanceScore:m.importanceScore,confidence:m.confidence,tags:Y([...m.tags,"level:fact",`class:${m.knowledgeClass}`,`kind:${m.kind}`]),rawIds:d,sourcePaths:Y(m.provenance.sourcePaths)}}),a=new Map;for(let m of i){let d=Yo(m.kind),g=a.get(d)??[];g.push(m),a.set(d,g)}let c=[];for(let m of Go){let d=a.get(m);if(!d?.length)continue;let g=d.slice().sort((h,y)=>y.importanceScore-h.importanceScore||y.confidence-h.confidence||h.id.localeCompare(y.id)),S=g.map(h=>h.id);c.push({id:Re("scene",`${m}|${S.join("|")}`),level:"scene",kind:m,title:Ho[m],summary:Xo(g),factIds:S,importanceScore:Math.max(...g.map(h=>h.importanceScore)),confidence:vn(g.map(h=>h.confidence)),tags:Y(["level:scene",`scene:${m}`,...g.flatMap(h=>h.tags)]),sourcePaths:Y(g.flatMap(h=>h.sourcePaths))})}let u=new Map(i.map(m=>[m.id,m])),p=[];for(let m of c){let g=m.factIds.map(y=>u.get(y)).filter(y=>!!y).filter(y=>(y.knowledgeClass==="permanent"||y.knowledgeClass==="task")&&y.importanceScore>=.55);if(g.length===0)continue;let S=g.some(y=>y.knowledgeClass==="permanent")?"permanent":"task",h=Qo(g);p.push({id:Re("knowledge",`${m.id}|${S}|${g.map(y=>y.id).join("|")}`),level:"knowledge",knowledgeClass:S,title:m.title,content:h,sceneIds:[m.id],factIds:g.map(y=>y.id),importanceScore:Math.max(...g.map(y=>y.importanceScore)),confidence:vn(g.map(y=>y.confidence)),tags:Y(["level:knowledge",`class:${S}`,`scene:${m.kind}`,...g.flatMap(y=>y.tags)]),sourcePaths:Y(g.flatMap(y=>y.sourcePaths))})}let l=[];for(let m of i)for(let d of m.rawIds)l.push({from:d,to:m.id,type:"supports"});for(let m of c)for(let d of m.factIds)l.push({from:d,to:m.id,type:"belongs_to"});for(let m of p)for(let d of m.sceneIds)l.push({from:d,to:m.id,type:"promotes_to"});return{schema:"toolnet.memory-hierarchy.v1",version:1,raw:r,facts:i,scenes:c,knowledge:p,links:l,stats:{raw:r.length,facts:i.length,scenes:c.length,knowledge:p.length,links:l.length}}}function Ne(t){return t?Math.ceil(t.length/3.5):0}function _e(t,e){if(!t)return"";if(Ne(t)<=e)return t;let r=Math.floor(e*3.5),s=t.slice(0,r),o=s.lastIndexOf("."),i=s.lastIndexOf(`
`),a=Math.max(o,i);return a>r*.7?s.slice(0,a+1):s}function X(){let t=Ce(),e=process.env.TOOLNET_SESSION_SAVE||"summary",n=process.env.TOOLNET_RAW_TRANSCRIPT==="on"||e==="archive"||e==="full",r=process.env.TOOLNET_MEMORY_PROMOTION||"conservative",s=parseFloat(process.env.TOOLNET_PROMOTE_MIN_SCORE||"0.65"),o=parseInt(process.env.TOOLNET_SESSION_SUMMARY_MAX_TOKENS||"700",10),i=parseInt(process.env.TOOLNET_DURABLE_MEMORY_MAX_ITEMS_PER_SESSION||"10",10),a=n,c=process.env.TOOLNET_RAW_TRANSCRIPT_REMOTE==="on"||e==="full";return{sessionSave:e,rawTranscript:n,memoryPromotion:r,promoteMinScore:s,sessionSummaryMaxTokens:o,durableMemoryMaxItemsPerSession:i,archiveLocal:a,archiveRemote:c}}function xn(t){return(t||X()).rawTranscript}function Cn(t){return(t||X()).durableMemoryMaxItemsPerSession}function jn(t){return(t||X()).sessionSummaryMaxTokens}function In(t){return(t||X()).archiveRemote}var An=new H;function En(t){let e=t.trim();if(e.startsWith("{")&&e.endsWith("}")||e.startsWith("[")&&e.endsWith("]"))try{let r=JSON.parse(e);return JSON.stringify(An.sanitizeValue(r))}catch{}let n=An.sanitize(t).text;return n=n.replace(/("(?:api[_-]?key|token|secret|password|cookie|authorization)"\s*:\s*)"[^"]*"/gi,'$1"[REDACTED]"').replace(/('(?:api[_-]?key|token|secret|password|cookie|authorization)'\s*:\s*)'[^']*'/gi,"$1'[REDACTED]'").replace(/\b(api[_-]?key|token|secret|password|cookie|authorization)\b\s*[:=]\s*[^\s,;]+/gi,"$1=[REDACTED]").replace(/\bbearer\s+[A-Za-z0-9._~+/=-]+/gi,"Bearer [REDACTED]"),n}function Zo(t,e){let n=t.toLowerCase(),r=.5,s=["nh\u1EDB","remember","quy t\u1EAFc","rule","t\u1EEB gi\u1EDD","from now","kh\xF4ng \u0111\u01B0\u1EE3c","must not","lu\xF4n lu\xF4n","always","never","critical","important","blocker","deploy","production","architecture"];for(let i of s)n.includes(i)&&(r+=.15);e==="rule"||e==="architecture"||e==="blocker"?r+=.2:e==="decision"||e==="deploy"?r+=.15:(e==="fix"||e==="next_action")&&(r+=.1),t.length<20?r-=.3:t.length>500&&(r-=.1);let o=[/npm (notice|warn|ERR)/i,/\d+ packages? in \d+/i,/found \d+ vulnerabilities/i,/up to date/i,/added \d+ packages/i,/^(ok|done|success|error|warning)$/i];for(let i of o)i.test(t)&&(r-=.4);return Math.max(0,Math.min(1,r))}function ei(t,e){let n=[],r=new Set;for(let i of t){let a=i.split(`
`).filter(c=>c.trim());for(let c of a){let u=c.trim();if(u.length<15)continue;let p=u.toLowerCase().replace(/\s+/g," ");if(r.has(p))continue;r.add(p);let l="decision";/\b(rule|quy tắc|policy|standard|convention)\b/i.test(u)||/\b(always|never|must|should|từ giờ|không được)\b/i.test(u)?l="rule":/\b(fix|fixed|bug|issue|error|lỗi)\b/i.test(u)?l="fix":/\b(blocker|blocked|stuck|cannot|không thể)\b/i.test(u)?l="blocker":/\b(next|todo|action|task|cần làm)\b/i.test(u)?l="next_action":/\b(deploy|release|publish|ship)\b/i.test(u)?l="deploy":/\b(architecture|design|structure|pattern)\b/i.test(u)?l="architecture":/\.(ts|js|py|go|rs|java|cpp|c|h)\b/i.test(u)&&(l="file");let m=Zo(u,l);if(m<.3)continue;let d=En(u);n.push({category:l,text:d,importance:m,sourceSessionId:e})}}let s=X(),o=Cn(s);return n.sort((i,a)=>a.importance-i.importance).slice(0,o)}function ti(t){let e=X(),n=jn(e),o=t.join(`

`).split(`
`).filter(i=>{let a=i.trim();return a.length>20&&!a.startsWith("npm")&&!a.startsWith("\u2713")&&!a.startsWith("Error:")}).slice(0,20).map(i=>En(i)).join(`
`);return _e(o,n)}function $e(t,e){let r=(Array.isArray(t)?t:t.split(`

`).filter(d=>d.trim())).map(d=>typeof d=="string"?d:JSON.stringify(d)).filter(d=>d.trim()),s=ei(r,e),o=s.filter(d=>d.category==="decision").map(d=>d.text),i=s.filter(d=>d.category==="rule").map(d=>d.text),a=s.filter(d=>d.category==="file").map(d=>d.text),c=s.filter(d=>d.category==="fix").map(d=>d.text),u=s.filter(d=>d.category==="blocker").map(d=>d.text),p=s.filter(d=>d.category==="next_action").map(d=>d.text),l=s.filter(d=>d.category==="deploy").map(d=>d.text);return{summary:ti(r),decisions:o,projectRules:i,filesChanged:a,bugsFixed:c,commands:l,blockers:u,nextActions:p,durableFacts:s}}function V(t){let e=new Set,n=[];for(let r of t){let s=r?.replace(/\s+/g," ").trim();if(!s)continue;let o=s.normalize("NFKC").toLowerCase();e.has(o)||(e.add(o),n.push(s))}return n}function ni(t){let e=new Map;for(let n of t){if(!n||!n.id||!Number.isFinite(n.sequence))continue;let r=n.sourceEventId?`${n.agent}:${n.sourceEventId}`:n.id,s=e.get(r);(!s||n.sequence>s.sequence)&&e.set(r,n)}return[...e.values()].sort((n,r)=>n.sequence-r.sequence||n.timestamp.localeCompare(r.timestamp))}function ri(t){switch(t){case"critical":return 1;case"high":return .85;case"normal":return .6;case"temporary":return .25}}function si(t){let e=ri(t.importance);return Math.max(0,Math.min(1,e*.75+t.confidence*.25))}function oi(t){return t.importance==="temporary"||t.confidence<.78?"transient":t.kind==="rule"||t.kind==="architecture"?"permanent":t.kind==="decision"||t.kind==="todo"||t.kind==="fix"?"task":"session"}function ii(t){let e=t.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}_./:-]+/gu)??[],n=new Set;for(let r of e)if(!(r.length<2||/^\d+$/u.test(r))&&(n.add(r),n.size>=40))break;return[...n]}function ai(t){let e=oi(t),n=si(t),r=ii(t.content);return{...t,knowledgeClass:e,importanceScore:n,retrievalTerms:r,tags:V([...t.tags,"level:fact",`class:${e}`,`kind:${t.kind}`])}}function ci(t){return t.map(e=>{try{return JSON.stringify({type:e.type,role:e.role,data:e.data,provenance:{sourcePath:e.provenance.sourcePath,files:e.provenance.files}})}catch{return""}}).filter(Boolean)}function ui(t,e,n){let r=$e(ci(e),t.nativeSessionId),s=n.filter(u=>u.kind==="todo").map(u=>u.content),o=n.flatMap(u=>u.provenance.sourcePaths),i=n.filter(u=>u.kind==="architecture").map(u=>u.content),a=V([...s,...r.nextActions]),c=V([...r.nextActions,...s]);return{summary:r.summary,state:{task:c[0]??a[0],decisions:V(r.decisions),files:V([...r.filesChanged,...o]),todos:a,completed:V(r.bugsFixed),blockers:V(r.blockers),nextActions:c,architecture:V(i)}}}function Ke(t,e){let n=ni(e),r=kn(t,n).map(ai),s=r.filter(p=>p.knowledgeClass!=="transient").sort((p,l)=>l.importanceScore-p.importanceScore),{summary:o,state:i}=ui(t,n,s),a=s.map(p=>({fingerprint:p.fingerprint,kind:p.kind,knowledgeClass:p.knowledgeClass,importanceScore:p.importanceScore,content:p.content,terms:p.retrievalTerms})),c=bn(n,s),u=p=>r.filter(l=>l.knowledgeClass===p).length;return{version:2,normalizedEvents:n,summary:o,state:i,candidates:s,retrievalIndex:a,hierarchy:c,stats:{inputEvents:e.length,normalizedEvents:n.length,extractedCandidates:r.length,persistedCandidates:s.length,permanent:u("permanent"),task:u("task"),session:u("session"),transient:u("transient")}}}import{createHash as li}from"node:crypto";import{chmodSync as Pn,existsSync as di,mkdirSync as pi,readFileSync as mi,renameSync as fi,writeFileSync as Tn}from"node:fs";import{dirname as Mn,join as We}from"node:path";var Et="toolnet.context-offload.v1",gi="toolnet.context-offload-asset.v1",yi=256,hi=new Set(["tool_call","tool_result","file_read","file_write","file_edit","command","test","artifact"]);function On(t){return We(t,".toolnet","offload")}function Si(t){return We(On(t),"assets")}function Rn(t){return We(On(t),"graph.json")}function Nn(t){pi(t,{recursive:!0,mode:448});try{Pn(t,448)}catch{}}function ki(t,e){Nn(Mn(t));let n=`${t}.${process.pid}.${Date.now()}.tmp`;Tn(n,e,{encoding:"utf8",mode:384}),fi(n,t);try{Pn(t,384)}catch{}}function At(t){return Array.isArray(t)?t.map(At):t&&typeof t=="object"?Object.fromEntries(Object.entries(t).sort(([e],[n])=>e.localeCompare(n)).map(([e,n])=>[e,At(n)])):t}function vi(t){return li("sha256").update(JSON.stringify(At(t)),"utf8").digest("hex")}function It(){return{schema:Et,version:1,updatedAt:new Date(0).toISOString(),nodes:[]}}function wi(t){let e=Rn(t);if(!di(e))return It();try{let n=JSON.parse(mi(e,"utf8"));return n.schema!==Et||n.version!==1||!Array.isArray(n.nodes)?It():n}catch{return It()}}function bi(t,e){ki(Rn(t),JSON.stringify(e,null,2)+`
`)}function xi(t,e=260){if(typeof t!="string")return null;let n=t.replace(/\s+/gu," ").trim();return n?n.slice(0,e):null}function Ci(t){let e=[...t.provenance.files??[],t.provenance.sourcePath],n=[];for(let r of e){let s=xi(r);if(!(!s||n.includes(s))&&(n.push(s),n.length===3))break}return n}function ji(t){return`${t.agent}:${t.sourceEventId??t.id}`.replace(/\s+/gu," ").trim().slice(0,120)}function Ii(t,e){Nn(Mn(t));try{return Tn(t,e,{encoding:"utf8",flag:"wx",mode:384}),!0}catch(n){if(n.code==="EEXIST")return!1;throw n}}function Ai(t,e){let n=t.nodes.find(s=>s.id===e.id),r=n?{...n,kind:e.kind,bytes:e.bytes,sourceRefs:Array.from(new Set([...n.sourceRefs,...e.sourceRefs])).slice(-8),files:Array.from(new Set([...n.files,...e.files])).slice(0,6)}:e;return{schema:Et,version:1,updatedAt:new Date().toISOString(),nodes:[...t.nodes.filter(s=>s.id!==e.id),r].slice(-yi)}}function _n(t,e){let n=wi(t),r=0,s=0,o=0,i=[];for(let a of e){if(!hi.has(a.type))continue;r+=1;let c=vi({type:a.type,data:a.data}),u={schema:gi,version:1,assetId:c,event:{type:a.type,agent:a.agent,nativeSessionId:a.nativeSessionId,timestamp:a.timestamp,sourceEventId:a.sourceEventId,provenance:a.provenance,data:a.data}},p=JSON.stringify(u,null,2)+`
`;Ii(We(Si(t),`${c}.json`),p)?s+=1:o+=1,i.push(c),n=Ai(n,{id:c,kind:a.type,bytes:Buffer.byteLength(p,"utf8"),createdAt:a.timestamp,sourceRefs:[ji(a)],files:Ci(a)})}return r>0&&bi(t,n),{eligible:r,written:s,deduped:o,graphNodes:n.nodes.length,assetIds:i}}import{createHash as _i}from"node:crypto";import{existsSync as $i,readdirSync as Ki,readFileSync as Wi}from"node:fs";import{basename as Li,join as Qn}from"node:path";import{randomUUID as Wn}from"node:crypto";var I=class extends Error{constructor(n,r){super(n);this.statusCode=r}statusCode};function fe(t){let e=new Set,n=[];for(let r of t){let s=r.replace(/\s+/gu," ").trim();if(!s)continue;let o=s.normalize("NFKC").toLowerCase();e.has(o)||(e.add(o),n.push(s))}return n}function Z(t){let e=t.normalize("NFKD").replace(/[\u0300-\u036f]/gu,"").toLowerCase().replace(/[^a-z0-9]+/gu,"-").replace(/^-+|-+$/gu,"").slice(0,120);if(!e)throw new I("Invalid Wiki slug",400);return e}function $n(t){let e=[];for(let n of t.matchAll(/\[\[([^\[\]]+)\]\]/gu)){let r=n[1]?.trim();r&&e.push(Z(r))}return fe(e)}function Ei(t){return t.normalize("NFKC").toLowerCase().split(/[^\p{L}\p{N}_-]+/u).map(e=>e.trim()).filter(e=>e.length>=2)}function Kn(t){return{id:`revision-${Wn()}`,pageId:t.id,slug:t.slug,revision:t.revision,title:t.title,...t.summary?{summary:t.summary}:{},content:t.content,tags:[...t.tags],links:[...t.links],createdAt:t.updatedAt}}function Q(t){return structuredClone(t)}var Le=class{constructor(e){this.store=e}store;state;queue=Promise.resolve();async initialize(){await this.ensureState()}async ensureState(){return this.state||(this.state=await this.store.load()),this.state}async mutate(e){let n,r=this.queue.then(async()=>{let s=await this.ensureState();n=e(s),s.updatedAt=new Date().toISOString(),await this.store.save(s)});return this.queue=r.then(()=>{},()=>{}),await r,n}async summary(){let e=await this.ensureState(),n=new Set(e.pages.flatMap(r=>r.links));return{schema:"toolnet.wiki-summary.v1",projectId:e.projectId,pages:e.pages.length,revisions:e.revisions.length,tags:fe(e.pages.flatMap(r=>r.tags)).sort((r,s)=>r.localeCompare(s)),links:e.pages.reduce((r,s)=>r+s.links.length,0),orphanPages:e.pages.filter(r=>r.links.length===0&&!n.has(r.slug)).length,automatedPages:e.pages.filter(r=>r.tags.some(s=>s.startsWith("toolnet-auto-"))).length,updatedAt:e.updatedAt}}async listPages(){let e=await this.ensureState();return Q([...e.pages].sort((n,r)=>n.title.localeCompare(r.title)))}async getPage(e){let n=await this.ensureState(),r=Z(e),s=n.pages.find(o=>o.slug===r||o.id===e);if(!s)throw new I(`Wiki page not found: ${e}`,404);return Q(s)}async createPage(e){return this.mutate(n=>{let r=e.title.trim(),s=e.content.trim();if(!r)throw new I("Wiki title is required",400);let o=Z(e.slug??r);if(n.pages.some(c=>c.slug===o))throw new I(`Wiki page already exists: ${o}`,409);let i=new Date().toISOString(),a={id:`wiki-${Wn()}`,slug:o,title:r,...e.summary?.trim()?{summary:e.summary.trim()}:{},content:s,tags:fe(e.tags??[]),links:$n(s),revision:1,createdAt:i,updatedAt:i};return n.pages.push(a),n.revisions.push(Kn(a)),Q(a)})}async updatePage(e,n){return this.mutate(r=>{let s=Z(e),o=r.pages.find(i=>i.slug===s||i.id===e);if(!o)throw new I(`Wiki page not found: ${e}`,404);if(n.title!==void 0){let i=n.title.trim();if(!i)throw new I("Wiki title is required",400);o.title=i}if(n.summary!==void 0){let i=n.summary.trim();i?o.summary=i:delete o.summary}return n.content!==void 0&&(o.content=n.content.trim(),o.links=$n(o.content)),n.tags!==void 0&&(o.tags=fe(n.tags)),o.revision+=1,o.updatedAt=new Date().toISOString(),r.revisions.push(Kn(o)),Q(o)})}async history(e){let n=await this.getPage(e),r=await this.ensureState();return Q(r.revisions.filter(s=>s.pageId===n.id).sort((s,o)=>o.revision-s.revision))}async backlinks(e){let n=await this.getPage(e),r=await this.ensureState();return Q(r.pages.filter(s=>s.links.includes(n.slug)).sort((s,o)=>s.title.localeCompare(o.title)))}async search(e,n=10){let r=await this.ensureState(),s=fe(Ei(e));if(s.length===0)return[];let o=Math.max(1,Math.min(20,Math.floor(n))),i=[];for(let a of r.pages){let c=a.title.toLowerCase(),u=a.slug.toLowerCase(),p=a.summary?.toLowerCase()??"",l=a.content.toLowerCase(),m=a.tags.map(g=>g.toLowerCase()),d=0;for(let g of s)u===g&&(d+=12),c===g&&(d+=10),c.includes(g)&&(d+=6),u.includes(g)&&(d+=5),m.some(S=>S===g)?d+=5:m.some(S=>S.includes(g))&&(d+=3),p.includes(g)&&(d+=2),l.includes(g)&&(d+=1);d>0&&i.push({page:Q(a),score:d})}return i.sort((a,c)=>c.score-a.score||c.page.updatedAt.localeCompare(a.page.updatedAt)).slice(0,o)}};var Ln="wiki/state.v1.json";function Pi(t){let e=new Date().toISOString();return{schema:"toolnet.wiki.v1",version:1,projectId:t.id,pages:[],revisions:[],createdAt:e,updatedAt:e}}function Ti(t,e){let n=JSON.parse(t);if(n.schema!=="toolnet.wiki.v1"||n.version!==1||n.projectId!==e.id||!Array.isArray(n.pages)||!Array.isArray(n.revisions))throw new Error("Invalid ToolNet Wiki state");return n}var Fe=class{constructor(e,n){this.storage=e;this.project=n}storage;project;async load(){let e=await this.storage.getText(Ln);if(!e){let n=Pi(this.project);return await this.save(n),n}return Ti(e,this.project)}async save(e){await this.storage.put(Ln,JSON.stringify(e,null,2),"application/json")}};import{createHash as Mi,randomUUID as Fn}from"node:crypto";var Dn="wiki/governance.v1.json",Vn="toolnet.knowledge-governance.v1",zn=500,ge={autoApproveThreshold:.86,criticalApproveThreshold:.94,staleAfterDays:90};function Oi(t,e=0,n=1){return Math.max(e,Math.min(n,t))}function Pt(t){return t.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/gu," ").trim()}function qn(t){return Mi("sha256").update(t.normalize("NFKC").replace(/\s+/gu," ").trim()).digest("hex")}function Ri(t){let e=[t.title,t.summary??"",t.content.slice(0,2e3),...t.tags].join(" ").toLowerCase();return/\b(?:architecture|security|authentication|authorization|auth|database|production|deploy|deployment|payment|billing|permission|permissions|acl|credential|secret|migration)\b/u.test(e)}function Ni(t){let e=t.sourceType==="skill"?.96:t.sourceType==="memory"?.94:.88,n=t.tags.map(r=>r.toLowerCase());return(n.includes("permanent")||n.includes("task"))&&(e+=.03),t.content.length>=200&&(e+=.02),t.content.length<80&&(e-=.05),t.title.length<4&&(e-=.05),Oi(e)}function Bn(t){let e=new Date().toISOString();return{schema:Vn,version:1,projectId:t,policy:{...ge},reviews:[],audit:[],createdAt:e,updatedAt:e}}function Jn(t){let e=t.autoApproveThreshold??ge.autoApproveThreshold,n=t.criticalApproveThreshold??ge.criticalApproveThreshold,r=t.staleAfterDays??ge.staleAfterDays;if(!Number.isFinite(e)||e<.5||e>1)throw new I("Invalid autoApproveThreshold",400);if(!Number.isFinite(n)||n<.5||n>1)throw new I("Invalid criticalApproveThreshold",400);if(!Number.isInteger(r)||r<1||r>3650)throw new I("Invalid staleAfterDays",400);return{autoApproveThreshold:e,criticalApproveThreshold:n,staleAfterDays:r}}var De=class{constructor(e,n){this.storage=e;this.project=n}storage;project;async load(){let e=await this.storage.getText(Dn);if(!e){let n=Bn(this.project.id);return await this.save(n),n}try{let n=JSON.parse(e);if(n.schema!==Vn||n.version!==1||n.projectId!==this.project.id||!Array.isArray(n.reviews)||!Array.isArray(n.audit))throw new Error("invalid");return{...n,policy:Jn(n.policy??ge)}}catch{let n=Bn(this.project.id);return await this.save(n),n}}async save(e){await this.storage.put(Dn,JSON.stringify(e,null,2),"application/json")}},ze=class{constructor(e){this.store=e}store;state;queue=Promise.resolve();async initialize(){await this.ensureState()}async ensureState(){return this.state||(this.state=await this.store.load()),this.state}audit(e,n,r,s={}){e.audit.push({id:Fn(),action:n,principal:r,...s.reviewId?{reviewId:s.reviewId}:{},...s.sourceKey?{sourceKey:s.sourceKey}:{},timestamp:new Date().toISOString(),...s.metadata?{metadata:s.metadata}:{}}),e.audit.length>zn&&(e.audit=e.audit.slice(-zn))}async mutate(e){let n,r=this.queue.then(async()=>{let s=await this.ensureState();n=await e(s),s.updatedAt=new Date().toISOString(),await this.store.save(s)});return this.queue=r.then(()=>{},()=>{}),await r,n}async policy(){return{...(await this.ensureState()).policy}}async setPolicy(e,n){return this.mutate(r=>(r.policy=Jn({...r.policy,...e}),this.audit(r,"policy:update",n,{metadata:{...r.policy}}),{...r.policy}))}async summary(){let e=await this.ensureState(),n=r=>e.reviews.filter(s=>s.status===r).length;return{schema:"toolnet.knowledge-governance-summary.v1",projectId:e.projectId,pending:n("pending"),approved:n("approved"),rejected:n("rejected"),superseded:n("superseded"),criticalPending:e.reviews.filter(r=>r.status==="pending"&&r.risk==="critical").length,conflictPending:e.reviews.filter(r=>r.status==="pending"&&r.risk==="conflict").length,auditEvents:e.audit.length,policy:{...e.policy},updatedAt:e.updatedAt}}async listReviews(e){let n=await this.ensureState();return structuredClone(n.reviews.filter(r=>!e||r.status===e).sort((r,s)=>s.updatedAt.localeCompare(r.updatedAt)))}async auditLog(e=100){let n=await this.ensureState(),r=Math.max(1,Math.min(500,Math.floor(e)));return structuredClone(n.audit.slice(-r).reverse())}async assess(e,n){let r=await this.ensureState(),s=Ni(e),o=Pt(e.title),i=n.filter(p=>p.slug!==e.slug&&Pt(p.title)===o&&qn(p.content)!==qn(e.content)).map(p=>p.slug),a=Ri(e),c=[];s<r.policy.autoApproveThreshold&&c.push(`confidence:${s.toFixed(2)}`),a&&s<r.policy.criticalApproveThreshold&&c.push("critical-knowledge"),i.length>0&&c.push("conflicting-knowledge");let u=i.length>0?"conflict":a?"critical":"normal";return{confidence:s,risk:u,requiresReview:i.length>0||s<r.policy.autoApproveThreshold||a&&s<r.policy.criticalApproveThreshold,reasons:c,conflicts:i}}async gate(e,n){let r=await this.assess(e,n);return this.mutate(s=>{let o=s.reviews.find(c=>c.sourceKey===e.sourceKey&&c.digest===e.digest);if(o?.status==="approved")return{allowed:!0,mode:"review-approved",assessment:r,review:structuredClone(o)};if(o?.status==="rejected")return{allowed:!1,mode:"rejected",assessment:r,review:structuredClone(o)};if(!r.requiresReview)return this.audit(s,"knowledge:auto-approved","system",{sourceKey:e.sourceKey,metadata:{confidence:r.confidence,risk:r.risk}}),{allowed:!0,mode:"auto-approved",assessment:r};if(o?.status==="pending")return{allowed:!1,mode:"pending-review",assessment:r,review:structuredClone(o)};let i=new Date().toISOString(),a={id:Fn(),sourceKey:e.sourceKey,sourceType:e.sourceType,slug:e.slug,marker:e.marker,digest:e.digest,title:e.title,...e.summary?{summary:e.summary}:{},content:e.content,tags:[...new Set([...e.tags,e.marker])],confidence:r.confidence,risk:r.risk,reasons:[...r.reasons],conflicts:[...r.conflicts],status:"pending",createdAt:i,updatedAt:i};return s.reviews.push(a),this.audit(s,"knowledge:review-requested","system",{reviewId:a.id,sourceKey:a.sourceKey,metadata:{confidence:a.confidence,risk:a.risk}}),{allowed:!1,mode:"pending-review",assessment:r,review:structuredClone(a)}})}async markApplied(e,n){await this.mutate(r=>{let s=r.reviews.find(o=>o.sourceKey===e&&o.digest===n&&o.status==="approved");s&&(s.appliedAt=new Date().toISOString(),s.updatedAt=s.appliedAt,this.audit(r,"knowledge:applied",s.reviewedBy??"system",{reviewId:s.id,sourceKey:e}))})}async decide(e,n,r){return this.mutate(async s=>{let o=s.reviews.find(u=>u.id===e);if(!o)throw new I(`Governance review not found: ${e}`,404);if(o.status!=="pending")throw new I("Governance review is already resolved",409);let i=new Date().toISOString();if(o.reviewedAt=i,o.reviewedBy=n.principal,o.updatedAt=i,n.note?.trim()&&(o.reviewNote=n.note.trim()),n.action==="reject")return o.status="rejected",this.audit(s,"knowledge:rejected",n.principal,{reviewId:e,sourceKey:o.sourceKey}),structuredClone(o);if(n.action==="supersede")return o.status="superseded",n.targetReviewId&&(o.supersededBy=n.targetReviewId),this.audit(s,"knowledge:superseded",n.principal,{reviewId:e,sourceKey:o.sourceKey,metadata:{targetReviewId:n.targetReviewId}}),structuredClone(o);if(n.action==="merge"){if(!n.targetReviewId)throw new I("targetReviewId is required for merge",400);let u=s.reviews.find(p=>p.id===n.targetReviewId);if(!u)throw new I("Merge target review not found",404);return o.status="superseded",o.mergedInto=u.id,this.audit(s,"knowledge:merged",n.principal,{reviewId:e,sourceKey:o.sourceKey,metadata:{targetReviewId:u.id}}),structuredClone(o)}o.status="approved";let c=(await r.listPages()).find(u=>u.slug===o.slug);if(c&&!c.tags.includes(o.marker))throw new I(`Wiki page '${o.slug}' is manually managed`,409);return c?await r.updatePage(o.slug,{title:o.title,summary:o.summary??"",content:o.content,tags:o.tags}):await r.createPage({slug:o.slug,title:o.title,...o.summary?{summary:o.summary}:{},content:o.content,tags:o.tags}),o.appliedAt=i,this.audit(s,"knowledge:approved",n.principal,{reviewId:e,sourceKey:o.sourceKey}),structuredClone(o)})}async quality(e){let n=await this.ensureState(),r=await e.listPages(),s=Date.now(),o=n.policy.staleAfterDays*864e5,i=r.map(p=>{let l=s-Date.parse(p.updatedAt);return{slug:p.slug,title:p.title,updatedAt:p.updatedAt,ageDays:Math.max(0,Math.floor(l/864e5)),stale:Number.isFinite(l)&&l>o}}).filter(p=>p.stale).map(({stale:p,...l})=>l),a=new Map;for(let p of r){let l=Pt(p.title),m=a.get(l)??[];m.push(p),a.set(l,m)}let c=[...a.entries()].filter(([,p])=>p.length>1).map(([p,l])=>({title:p,pages:l.map(m=>m.slug)})),u=n.reviews.filter(p=>p.status==="pending");return{schema:"toolnet.knowledge-quality.v1",totalPages:r.length,automatedPages:r.filter(p=>p.tags.some(l=>l.startsWith("toolnet-auto-"))).length,manualPages:r.filter(p=>!p.tags.some(l=>l.startsWith("toolnet-auto-"))).length,stalePages:i,duplicateTitles:c,pendingReviews:u.length,lowConfidenceReviews:u.filter(p=>p.confidence<n.policy.autoApproveThreshold).length,conflicts:u.filter(p=>p.risk==="conflict").length,generatedAt:new Date().toISOString()}}};var Zn="wiki/automation.v1.json",er="toolnet.wiki-automation.v1",Ot=8e3,Gn=new Set(["raw","rawtext","raw_text","rawtranscript","raw_transcript","transcript","messages","message","payload","prompt","response","assistantmessage","assistant_message","userprompt","user_prompt"]);function he(t){return _i("sha256").update(JSON.stringify(t)).digest("hex")}function ye(t){if(!(!t||typeof t!="object"||Array.isArray(t)))return t}function Hn(t){return Array.isArray(t)?t:[]}function tr(t){return typeof t!="string"?void 0:t.replace(/\s+/gu," ").trim()||void 0}function Tt(t){return Array.isArray(t)?t.map(tr).filter(e=>!!e):[]}function K(t,e){for(let n of e){let r=tr(t[n]);if(r)return r}}function Se(t){let e=new Set,n=[];for(let r of t){let s=r.replace(/\s+/gu," ").trim();if(!s)continue;let o=s.normalize("NFKC").toLowerCase();e.has(o)||(e.add(o),n.push(s))}return n}function qe(t,e=0,n=""){if(e>3)return[];let r=n.replace(/[^a-z0-9]/giu,"").toLowerCase();if(Gn.has(r))return[];if(typeof t=="string"){let i=t.replace(/\s+/gu," ").trim();return i.length<8?[]:[i]}if(Array.isArray(t))return t.flatMap(i=>qe(i,e+1,n));let s=ye(t);if(!s)return[];let o=[];for(let[i,a]of Object.entries(s)){let c=i.replace(/[^a-z0-9]/giu,"").toLowerCase();Gn.has(c)||o.push(...qe(a,e+1,i))}return o}function Un(t){let n=Se(["content","summary","text","value","statement","description","decision","task","knowledge","context","outcome","reason","rationale"].flatMap(s=>qe(t[s],0,s)));return(n.length>0?n:Se(qe(t))).join(`

`).slice(0,Ot)}function Yn(t,e){return K(t,["id","key","fingerprint","knowledgeId","sceneId"])??e}function Xn(t,e){return K(t,["title","name","topic","label","task","kind","type"])??e}function Fi(t){return(K(t,["knowledgeClass","class","classification","scope"])??"").toLowerCase()}function Di(t){return(K(t,["kind","sceneKind","type"])??"").toLowerCase()}function zi(t){let e=ye(t);if(!e)return[];let n=[],r=Hn(e.knowledge);for(let[o,i]of r.entries()){let a=ye(i);if(!a)continue;let c=Fi(a);if(c==="session"||c==="transient")continue;let u=Un(a);if(u.length<20)continue;let p=Yn(a,he(a).slice(0,16)),l=Xn(a,`Durable Memory ${o+1}`);n.push({sourceKey:`memory:${p}`,sourceType:"memory",title:l,summary:K(a,["summary","description"]),content:u,tags:Se(["toolnet","auto","memory",...c?[c]:[]])})}let s=Hn(e.scenes);for(let[o,i]of s.entries()){let a=ye(i);if(!a)continue;let c=Di(a);if(c==="session-context")continue;let u=Un(a);if(u.length<20)continue;let p=Yn(a,he(a).slice(0,16)),l=Xn(a,`Knowledge Scene ${o+1}`);n.push({sourceKey:`scene:${p}`,sourceType:"scene",title:l,summary:K(a,["summary","description"]),content:u,tags:Se(["toolnet","auto","scene",...c?[c]:[]])})}return n}function qi(t){return Qn(t,".toolnet","memory","skills")}function Bi(t){let e=qi(t);if(!$i(e))return{candidates:[],failed:0};let n=[],r=0,s=Ki(e).filter(o=>o.endsWith(".json")).sort();for(let o of s)try{let i=JSON.parse(Wi(Qn(e,o),"utf8")),a=ye(i);if(!a||a.schema!=="toolnet.skill-memory.v1")continue;let c=K(a,["id","fingerprint"])??Li(o,".json"),u=K(a,["task"])??"",p=K(a,["title"])||u||`Reusable Skill ${c.slice(0,8)}`,l=K(a,["summary"])??void 0,m=Tt(a.steps),d=Tt(a.verification),g=Tt(a.files),S=[];u&&S.push(`## Task
${u}`),l&&S.push(`## Summary
${l}`),m.length>0&&S.push(`## Procedure
${m.map((y,k)=>`${k+1}. ${y}`).join(`
`)}`),d.length>0&&S.push(`## Verification
${d.map(y=>`- ${y}`).join(`
`)}`),g.length>0&&S.push(`## Relevant Files
${g.map(y=>`- \`${y}\``).join(`
`)}`);let h=S.join(`

`).slice(0,Ot);if(h.length<20)continue;n.push({sourceKey:`skill:${c}`,sourceType:"skill",title:p,summary:l,content:h,tags:["toolnet","auto","skill","sop"]})}catch{r+=1}return{candidates:n,failed:r}}function Mt(t){let e=new Date().toISOString();return{schema:er,version:1,projectId:t,entries:[],createdAt:e,updatedAt:e}}async function Vi(t,e){let n=await t.getText(Zn);if(!n)return Mt(e);try{let r=JSON.parse(n);return r.schema!==er||r.version!==1||r.projectId!==e||!Array.isArray(r.entries)?Mt(e):r}catch{return Mt(e)}}async function Ji(t,e){await t.put(Zn,JSON.stringify(e,null,2),"application/json")}function Gi(t){return`toolnet-auto-${he(t).slice(0,12)}`}function Hi(t){let e=Z(t.title).slice(0,72),n=he(t.sourceKey).slice(0,10);return Z(`auto-${t.sourceType}-${e}-${n}`)}function Ui(t){return[`> Auto-generated by ToolNet Knowledge Automation from ${t.sourceType==="skill"?"reusable Skill Memory":t.sourceType==="scene"?"semantic memory scene":"durable memory"}.`,"",t.content].join(`
`).slice(0,Ot)}function Yi(t){return he({sourceType:t.sourceType,title:t.title,summary:t.summary,content:t.content,tags:t.tags})}function Xi(t,e){return t.tags.includes(e)}async function nr(t){let e=zi(t.hierarchy),n=Bi(t.project.rootPath),r=new Map;for(let d of[...e,...n.candidates])r.set(d.sourceKey,d);let s=[...r.values()].sort((d,g)=>d.sourceKey.localeCompare(g.sourceKey)),o={schema:"toolnet.wiki-automation-result.v1",scanned:e.length+n.candidates.length,eligible:s.length,created:0,updated:0,unchanged:0,skipped:0,failed:n.failed,reviewPending:0,autoApproved:0,reviewApproved:0,pages:[]},i=new Le(new Fe(t.storage,t.project));await i.initialize();let a=new ze(new De(t.storage,t.project));await a.initialize();let c=await Vi(t.storage,t.project.id),u=await i.listPages(),p=new Map(u.map(d=>[d.slug,d])),l=new Map(c.entries.map(d=>[d.sourceKey,d]));for(let d of s)try{let g=Gi(d.sourceKey),S=Yi(d),h=l.get(d.sourceKey),y=h?.slug??Hi(d),k=p.get(y);if(k&&!Xi(k,g)){o.skipped+=1;continue}let A=Se([...d.tags,g]),M=Ui(d),T=await a.gate({sourceKey:d.sourceKey,sourceType:d.sourceType,slug:y,marker:g,digest:S,title:d.title,...d.summary?{summary:d.summary}:{},content:M,tags:A},[...p.values()]);if(!T.allowed){T.mode==="pending-review"?o.reviewPending+=1:o.skipped+=1;continue}T.mode==="auto-approved"?o.autoApproved+=1:T.mode==="review-approved"&&(o.reviewApproved+=1),k?h?.digest!==S?(k=await i.updatePage(y,{title:d.title,summary:d.summary??"",content:M,tags:A}),p.set(k.slug,k),o.updated+=1,o.pages.push({sourceKey:d.sourceKey,sourceType:d.sourceType,slug:k.slug,action:"updated"})):(o.unchanged+=1,o.pages.push({sourceKey:d.sourceKey,sourceType:d.sourceType,slug:y,action:"unchanged"})):(k=await i.createPage({slug:y,title:d.title,summary:d.summary,content:M,tags:A}),p.set(k.slug,k),o.created+=1,o.pages.push({sourceKey:d.sourceKey,sourceType:d.sourceType,slug:k.slug,action:"created"}));let O=new Date().toISOString(),C={sourceKey:d.sourceKey,sourceType:d.sourceType,slug:y,digest:S,marker:g,updatedAt:O},w=c.entries.findIndex(D=>D.sourceKey===d.sourceKey);w>=0?c.entries[w]=C:c.entries.push(C),l.set(d.sourceKey,C),await a.markApplied(d.sourceKey,S)}catch(g){if(g instanceof I&&g.statusCode===409){o.skipped+=1;continue}o.failed+=1}let m=new Date().toISOString();return c.updatedAt=m,c.lastRunAt=m,c.entries.sort((d,g)=>d.sourceKey.localeCompare(g.sourceKey)),await Ji(t.storage,c),o}import{createHash as Qi}from"node:crypto";import{chmodSync as sr,existsSync as Zi,mkdirSync as ea,readFileSync as Ap,readdirSync as Ep,renameSync as ta,statSync as Pp,writeFileSync as na}from"node:fs";import{join as or}from"node:path";var ra="toolnet.skill-memory.v1",rr=5,sa=16,oa=24,ia=32;function aa(t){return Qi("sha256").update(t).digest("hex")}function ve(t,e=Number.MAX_SAFE_INTEGER){let n=new Set,r=[];for(let s of t){let o=s.replace(/\s+/gu," ").trim();if(!o)continue;let i=o.normalize("NFKC").toLowerCase();if(!n.has(i)&&(n.add(i),r.push(o),r.length>=e))break}return r}function Rt(t,e=360){let n=t.replace(/\s+/gu," ").trim();return n.length<=e?n:n.slice(0,Math.max(0,e-1)).trimEnd()+"\u2026"}function ca(t){return t.replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/giu,"Bearer [REDACTED]").replace(/\bsk-[A-Za-z0-9_-]{8,}\b/gu,"[REDACTED]").replace(/\b(api[_-]?key|token|password|passwd|secret)\b(\s*[:=]\s*)(["']?)[^\s"'`]+/giu,"$1$2[REDACTED]")}function q(t,e=360){return t&&Rt(ca(t),e)||void 0}function we(t,e){for(let n of e){let r=t[n];if(typeof r=="string"&&r.trim())return r}}function ir(t,e){for(let n of e){let r=t[n];if(typeof r=="number"&&Number.isFinite(r))return r;if(typeof r=="string"&&r.trim()&&Number.isFinite(Number(r)))return Number(r)}}function ar(t,e){for(let n of e){let r=t[n];if(typeof r=="boolean")return r;if(typeof r=="string"){let s=r.trim().toLowerCase();if(["true","yes","pass","passed","success","succeeded","ok"].includes(s))return!0;if(["false","no","fail","failed","error"].includes(s))return!1}}}function cr(t){let e=t.data??{};if(ar(e,["passed","pass","success","succeeded","ok"])===!1)return!0;let r=ir(e,["exitCode","exit_code","code","statusCode"]);if(r!==void 0&&r!==0)return!0;let s=we(e,["status","result","outcome"]);return!!(s&&/\b(fail(?:ed)?|error|broken|cancelled)\b/iu.test(s))}function ke(t){let e=t.data??{};if(cr(t))return!1;if(ar(e,["passed","pass","success","succeeded","ok"])===!0||ir(e,["exitCode","exit_code","code","statusCode"])===0)return!0;let s=we(e,["status","result","outcome"]);return s&&/\b(pass(?:ed)?|success(?:ful)?|succeeded|ok|green|complete(?:d)?)\b/iu.test(s)?!0:t.type==="commit"||t.type==="deploy"}function ur(t){let e=t.data??{},n=we(e,["path","file","filePath","filename","target"]);if(n)return q(n,260);let r=t.provenance?.files;return q(r?.[0],260)}function Nt(t){return q(we(t.data??{},["command","cmd","script"]),420)}function re(t){return q(we(t.data??{},["name","test","suite","title","message","text","result","status"]),300)}function ua(t){let e=[];for(let n of[...t].sort((r,s)=>r.sequence-s.sequence))if(ke(n)){if(n.type==="test"){let r=re(n)??Nt(n)??"Tests passed";e.push(`Test passed: ${r}`);continue}if(n.type==="commit"){let r=re(n);e.push(r?`Commit: ${r}`:"Commit completed");continue}if(n.type==="deploy"){let r=re(n);e.push(r?`Deploy: ${r}`:"Deployment completed")}}return ve(e,10)}function la(t,e){let n=[];for(let r of[...t].sort((s,o)=>s.sequence-o.sequence))switch(r.type){case"file_write":case"file_edit":{let s=ur(r);s&&n.push(`Update ${s}`);break}case"command":{if(cr(r))break;let s=Nt(r);s&&n.push(`Run: ${s}`);break}case"test":{if(!ke(r))break;let s=re(r)??Nt(r)??"project tests";n.push(`Verify: ${s}`);break}case"commit":{if(!ke(r))break;let s=re(r);n.push(s?`Commit: ${s}`:"Commit verified changes");break}case"deploy":{if(!ke(r))break;let s=re(r);n.push(s?`Deploy: ${s}`:"Deploy verified build");break}default:break}if(n.length===0)for(let r of e.files.slice(0,8)){let s=q(r,260);s&&n.push(`Update ${s}`)}return ve(n,sa)}function da(t,e){let n=[...e.files];for(let r of t){let s=ur(r);s&&n.push(s);for(let o of r.provenance?.files??[]){let i=q(o,260);i&&n.push(i)}}return ve(n,oa)}function pa(t){return ve(t.filter(e=>["file_write","file_edit","command","test","commit","deploy"].includes(e.type)).map(e=>e.id),ia)}function ma(t){return t.map(n=>n.timestamp).filter(Boolean).sort().at(-1)??new Date(0).toISOString()}function lr(t,e,n){if(e.length===0)return[];let r=ua(e),s=ve(n.completed.map(g=>q(g,280)??""),rr);if(!(s.length>0||e.some(g=>["test","commit","deploy"].includes(g.type)&&ke(g))))return[];let i=q(n.task,280)??q(n.nextActions[0],280),a=s.length>0?s:i?[i]:[];if(a.length===0)return[];let c=la(e,n);if(c.length===0)return[];let u=da(e,n),p=pa(e),l=Math.min(...e.map(g=>g.sequence)),m=Math.max(...e.map(g=>g.sequence)),d=ma(e);return a.slice(0,rr).map(g=>{let S=[`Reusable procedure learned from successful task: ${g}.`,u.length>0?`Files: ${u.slice(0,6).join(", ")}.`:"",r.length>0?`Verification: ${r.slice(0,4).join("; ")}.`:""].filter(Boolean),h=JSON.stringify({projectId:t.projectId,task:g,steps:c,verification:r,files:u}),y=aa(h);return{schema:ra,version:1,id:`skill-${y.slice(0,24)}`,fingerprint:y,projectId:t.projectId,title:Rt(`SOP: ${g}`,180),task:g,summary:Rt(S.join(" "),900),steps:c,verification:r,files:u,source:{agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,firstSequence:l,lastSequence:m,eventIds:p},createdAt:d}})}function fa(t){return or(t.rootPath,".toolnet","memory","skills")}function ga(t){let e=fa(t);return ea(e,{recursive:!0,mode:448}),sr(e,448),e}function dr(t,e){if(e.length===0)return{written:0,deduped:0,files:[]};let n=ga(t),r=0,s=0,o=[];for(let i of e){if(i.projectId!==t.id)throw new Error(`Skill project mismatch: ${i.projectId} != ${t.id}`);let a=or(n,`${i.id}.json`);if(o.push(a),Zi(a)){s+=1;continue}let c=`${a}.${process.pid}.${Date.now()}.tmp`;na(c,JSON.stringify(i,null,2)+`
`,{encoding:"utf8",mode:384}),ta(c,a),sr(a,384),r+=1}return{written:r,deduped:s,files:o}}function pr(t){return String(t).padStart(12,"0")}function ya(t){return t.remotePrefix.replace("/sessions/","/memory/learned/")}var Be=class{constructor(e){this.storage=e}storage;async write(e,n,r){if(r.length===0||n.length===0)return null;let s=Math.min(...n.map(p=>p.sequence)),o=Math.max(...n.map(p=>p.sequence)),i={version:1,projectId:e.projectId,agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,createdAt:new Date().toISOString(),firstSequence:s,lastSequence:o,candidateCount:r.length,candidates:r},a=JSON.stringify(i,null,2)+`
`,c=v(r.map(p=>p.fingerprint).sort().join("|")).slice(0,16),u=[ya(e),"batches",`${pr(s)}-${pr(o)}-${c}.json`].join("/");return await this.storage.exists(u)||await this.storage.put(u,a,"application/json"),u}};import{createHash as ha}from"node:crypto";function mr(t){return String(t).padStart(12,"0")}function Sa(t){return ha("sha256").update(t).digest("hex")}function ka(t){return t.remotePrefix.replace("/sessions/","/memory/hierarchy/")}var Ve=class{constructor(e){this.storage=e}storage;async write(e,n,r){if(n.length===0||r.facts.length===0)return null;let s=Math.min(...n.map(u=>u.sequence)),o=Math.max(...n.map(u=>u.sequence)),i={schema:"toolnet.memory-hierarchy-batch.v1",version:1,projectId:e.projectId,agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,createdAt:new Date().toISOString(),firstSequence:s,lastSequence:o,hierarchy:r},a=Sa([...r.facts.map(u=>u.id),...r.knowledge.map(u=>u.id)].sort().join("|")).slice(0,16),c=[ka(e),"batches",`${mr(s)}-${mr(o)}-${a}.json`].join("/");return await this.storage.exists(c)||await this.storage.put(c,`${JSON.stringify(i,null,2)}
`,"application/json"),c}};function ja(t,e){if(!wa(t))return{events:[],nextOffset:e};let n=Ca(t).size,r=Number.isFinite(e)?Math.max(0,e):0;if(r>n&&(r=0),r===n)return{events:[],nextOffset:n};let s=n-r,o=Buffer.alloc(s),i=ba(t,"r");try{xa(i,o,0,s,r)}finally{va(i)}let a=o.toString("utf8"),c=a.lastIndexOf(`
`);if(c<0)return{events:[],nextOffset:r};let u=a.slice(0,c+1);return{events:u.split(`
`).filter(Boolean).flatMap(l=>{try{return[JSON.parse(l)]}catch{return[]}}),nextOffset:r+Buffer.byteLength(u,"utf8")}}var Je=class{constructor(e){this.options=e;this.journal=new Be(e.storage),this.hierarchyJournal=new Ve(e.storage)}options;journal;hierarchyJournal;async learnNew(){let e=this.options.wal.loadState(),n=Number(e.sourceCursors["memory.learner.offset"]??0),r=Number.isFinite(n)?n:0,s=ja(this.options.wal.eventsFile,r);if(s.events.length===0)return{scannedEvents:0,candidates:0,journalWritten:!1,nextOffset:s.nextOffset};let o=Ke(this.options.identity,s.events),i=o.candidates,a=!1;i.length>0&&(a=!!await this.journal.write(this.options.identity,s.events,i));let c=!1;o.hierarchy.facts.length>0&&(c=!!await this.hierarchyJournal.write(this.options.identity,s.events,o.hierarchy));let u=lr(this.options.identity,s.events,o.state),p=dr(this.options.project,u);this.options.wal.setSourceCursor("memory.pipeline.version",2),this.options.wal.setSourceCursor("memory.pipeline.normalized_events",o.stats.normalizedEvents),this.options.wal.setSourceCursor("memory.pipeline.persisted",o.stats.persistedCandidates),this.options.wal.setSourceCursor("memory.pipeline.permanent",o.stats.permanent),this.options.wal.setSourceCursor("memory.pipeline.task",o.stats.task),this.options.wal.setSourceCursor("memory.pipeline.session",o.stats.session),this.options.wal.setSourceCursor("memory.pipeline.transient",o.stats.transient),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.version",o.hierarchy.version),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.raw",o.hierarchy.stats.raw),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.facts",o.hierarchy.stats.facts),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.scenes",o.hierarchy.stats.scenes),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.knowledge",o.hierarchy.stats.knowledge),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.journal_written",c?1:0),this.options.wal.setSourceCursor("memory.skill.assets",u.length),this.options.wal.setSourceCursor("memory.skill.written",p.written),this.options.wal.setSourceCursor("memory.skill.deduped",p.deduped);try{let l=_n(this.options.project.rootPath,s.events);this.options.wal.setSourceCursor("memory.context_offload.eligible",l.eligible),this.options.wal.setSourceCursor("memory.context_offload.written",l.written),this.options.wal.setSourceCursor("memory.context_offload.deduped",l.deduped),this.options.wal.setSourceCursor("memory.context_offload.graph_nodes",l.graphNodes),this.options.wal.setSourceCursor("memory.context_offload.failed",0)}catch{this.options.wal.setSourceCursor("memory.context_offload.failed",1)}try{let l=await nr({project:this.options.project,storage:this.options.storage,hierarchy:o.hierarchy});this.options.wal.setSourceCursor("memory.wiki_automation.scanned",l.scanned),this.options.wal.setSourceCursor("memory.wiki_automation.eligible",l.eligible),this.options.wal.setSourceCursor("memory.wiki_automation.created",l.created),this.options.wal.setSourceCursor("memory.wiki_automation.updated",l.updated),this.options.wal.setSourceCursor("memory.wiki_automation.unchanged",l.unchanged),this.options.wal.setSourceCursor("memory.wiki_automation.skipped",l.skipped),this.options.wal.setSourceCursor("memory.wiki_automation.failed",l.failed),this.options.wal.setSourceCursor("memory.wiki_automation.review_pending",l.reviewPending),this.options.wal.setSourceCursor("memory.wiki_automation.auto_approved",l.autoApproved),this.options.wal.setSourceCursor("memory.wiki_automation.review_approved",l.reviewApproved)}catch{this.options.wal.setSourceCursor("memory.wiki_automation.failed",1)}return this.options.wal.setSourceCursor("memory.learner.offset",s.nextOffset),{scannedEvents:s.events.length,candidates:i.length,journalWritten:a,nextOffset:s.nextOffset}}};import{closeSync as qa,existsSync as Ba,openSync as Va,readSync as Ja,statSync as Ga}from"node:fs";function fr(t){return t&&typeof t=="object"&&!Array.isArray(t)?t:null}function xe(t){return t.toLowerCase().replace(/[^a-z0-9]/gu,"")}function be(t,e,n=0){if(n>8)return;if(Array.isArray(t)){for(let s of t.slice(0,50))be(s,e,n+1);return}let r=fr(t);if(r)for(let[s,o]of Object.entries(r))e(s,o,r),be(o,e,n+1)}function se(t,e){let n=[];return be(t,(r,s)=>{e.has(xe(r))&&typeof s=="string"&&s.trim()&&n.push(s.trim())}),n}function Ia(t){let e=t.trim();if(!e.startsWith("{"))return null;try{return fr(JSON.parse(e))}catch{return null}}function Aa(t){let e=t.data;for(let r of["tool","toolName","tool_name"]){let s=e[r];if(typeof s=="string"&&s.trim())return s.trim().toLowerCase()}let n="";return be(e,(r,s,o)=>{if(n)return;let i=xe(r);if(["tool","toolname"].includes(i)&&typeof s=="string"){n=s.trim().toLowerCase();return}if(i!=="name"||typeof s!="string")return;let a=typeof o.type=="string"?o.type.toLowerCase():"";(a.includes("tool")||a.includes("function")||a.includes("command"))&&(n=s.trim().toLowerCase())}),n}function Ea(t){let e=se(t.data,new Set(["command","cmd","script"])),n=se(t.data,new Set(["arguments","args"]));for(let r of n){let s=Ia(r);if(s)for(let o of se(s,new Set(["command","cmd","script"])))e.push(o)}return Array.from(new Set(e.map(r=>r.trim()).filter(Boolean)))}function Pa(t){let e=se(t.data,new Set(["filepath","file_path","filename","file","path","target"].map(xe)));return Array.from(new Set(e.map(n=>n.trim()).filter(n=>n.length>0&&n.length<1e3&&!n.includes(`
`))))}function Ta(t,e){return t.type==="file_edit"||t.type==="file_write"?"modified":/\b(delete|remove|unlink)\b/iu.test(e)?"deleted":/\b(create|add[_-]?file|new[_-]?file)\b/iu.test(e)?"created":/\b(edit|write|patch|apply[_-]?patch|replace|update[_-]?file)\b/iu.test(e)?"modified":null}function Ma(t){let e=se(t.data,new Set(["patch","diff","arguments","input"].map(xe))),n=[];for(let r of e){let s=[{regex:/^\*\*\* Update File:\s*(.+)$/gimu,action:"modified"},{regex:/^\*\*\* Add File:\s*(.+)$/gimu,action:"created"},{regex:/^\*\*\* Delete File:\s*(.+)$/gimu,action:"deleted"}];for(let o of s)for(let i of r.matchAll(o.regex)){let a=i[1]?.trim();a&&n.push({kind:"file",text:a,fileAction:o.action,confidence:.99})}}return n}function Oa(t){let e=t.toLowerCase();return/\b(typecheck|type-check)\b/u.test(e)||/\btsc\b[\s\S]*--noemit\b/u.test(e)?"typecheck":/\b(eslint|lint)\b/u.test(e)?"lint":/\b(vitest|jest|pytest)\b/u.test(e)||/\bgo\s+test\b/u.test(e)||/\bcargo\s+test\b/u.test(e)||/\b(npm|pnpm|yarn)\s+(run\s+)?test\b/u.test(e)?"test":/\b(npm|pnpm|yarn)\s+(run\s+)?build\b/u.test(e)||/\bcargo\s+build\b/u.test(e)||/\bgo\s+build\b/u.test(e)||/\btsc\b/u.test(e)?"build":null}function Ra(t){let e=null;return be(t,(n,r)=>{if(e===null&&["exitcode","code"].includes(xe(n))){if(typeof r=="number"&&Number.isFinite(r)){e=r;return}if(typeof r=="string"){let s=Number(r);Number.isFinite(s)&&(e=s)}}}),e}function Na(t){return se(t,new Set(["status","state","result","output","outputsummary","message","text"]))}function _a(t){let e=Ra(t.data);if(e!==null)return e===0?"passed":"failed";let n=Na(t.data).join(`
`).toLowerCase();return/\b(error|failed|failure|failing)\b/u.test(n)&&!/\b0\s+failed\b/u.test(n)?"failed":/\b(success|successful|completed|passed|green)\b/u.test(n)||/\b\d+\s+passed\b/u.test(n)?"passed":/\b(running|started|in[_ -]?progress)\b/u.test(n)?"running":"unknown"}function $a(t){let e=[],n=new Set;for(let r of t){let s=[r.kind,r.fileAction??"",r.checkKind??"",r.checkStatus??"",r.text].join("|");n.has(s)||(n.add(s),e.push(r))}return e}function gr(t){let e=[],n=Aa(t),r=Ta(t,n);if(r)for(let s of Pa(t))e.push({kind:"file",text:s,fileAction:r,confidence:t.type==="file_edit"||t.type==="file_write"?1:.96});e.push(...Ma(t));for(let s of Ea(t)){e.push({kind:"command",text:s,confidence:.98});let o=Oa(s);o&&e.push({kind:"test",text:s,checkKind:o,checkStatus:_a(t),confidence:.98})}return $a(e)}var Ka=new Set(["content","text","message","prompt","summary","description","title","reason","last_assistant_message","lastAssistantMessage"]);function te(t){return t.normalize("NFKC").replace(/\s+/g," ").replace(/^[\s>*#•-]+/u,"").trim()}function hr(t){return te(t).toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim()}function ee(t,e,n=0){if(!(n>6)){if(typeof t=="string"){e.push(t);return}if(Array.isArray(t)){for(let r of t.slice(0,50))ee(r,e,n+1);return}if(!(!t||typeof t!="object"))for(let[r,s]of Object.entries(t))(Ka.has(r)||["data","payload","parts","messages"].includes(r))&&ee(s,e,n+1)}}function Ge(t){return/\b(cancelled|canceled)\b|đã hủy|bỏ qua/iu.test(t)?"cancelled":/\b(blocked|blocker)\b|đang vướng|bị vướng|đang kẹt|chưa thể/iu.test(t)?"blocked":/\b(completed|complete|done|finished|passed)\b|hoàn thành|hoàn tất|đã xong|đã làm xong|\bxong\b/iu.test(t)?"completed":/\bin[\s_-]*progress\b|working on|đang làm|đang thực hiện|đang xử lý|đang triển khai/iu.test(t)?"in_progress":"pending"}function yr(t){let e=te(t);return/^(?:đang\s+làm|đang\s+thực\s+hiện|đang\s+xử\s+lý|đang\s+triển\s+khai|hoàn\s+thành|hoàn\s+tất|đã\s+xong|đã\s+làm\s+xong|xong|pending|in[\s_-]*progress|completed|complete|done|finished|blocked|cancelled|canceled)[.!]*$/iu.test(e)}function E(t,e,n,r,s={}){let o=te(r),i=s.key??hr(o);return{version:1,id:v([t.projectId,n,i,e.id,o,s.status??"",s.fileAction??"",s.checkKind??"",s.checkStatus??"",s.order??""].join("|")).slice(0,32),projectId:t.projectId,kind:n,key:i,text:o,status:s.status,fileAction:s.fileAction,checkKind:s.checkKind,checkStatus:s.checkStatus,order:s.order,confidence:s.confidence??.85,occurredAt:e.timestamp,sequence:e.sequence,agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,eventId:e.id,sourceEventId:e.sourceEventId}}function Wa(t,e,n){let r=te(n);if(r.length<5||r.length>1200)return[];let s=[],o=/^(?:next|next action|next step|tiếp theo|bước tiếp theo|cần làm tiếp)\b/iu.test(r),i=r.match(/^(?:mục tiêu|goal|objective)\s*(?::|-)\s*(.+)$/iu);i?.[1]&&s.push(E(t,e,"goal",i[1],{confidence:.97}));let a=r.match(/^(?:kế hoạch|plan)\s*(?::|-)\s*(.+)$/iu);a?.[1]&&s.push(E(t,e,"plan",a[1],{confidence:.95}));let c=/\b(?:phase|giai đoạn|giai doan|stage)\s*(\d+)\s*(?:[:\-–—]\s*)?([^.;\n]{0,220})/giu,u;for(;!o&&(u=c.exec(r));){let m=Number(u[1]),d=te(u[2]??""),g=d&&!yr(d)?`Phase ${m} - ${d}`:`Phase ${m}`;s.push(E(t,e,"phase",g,{key:`phase:${m}`,order:m,status:Ge(r),confidence:.93}))}let p=n.match(/^\s*[-*]\s*\[([ xX])\]\s*(.+)$/u);p?.[2]&&s.push(E(t,e,"task",p[2],{status:p[1].trim()?"completed":Ge(p[2]),confidence:.96}));let l=r.match(/^(?:todo|task|việc)\s*(\d+)?(?:\s*[:.\-–—]\s*|\s+)(.+)$/iu);if(l?.[2]){let m=l[1]?Number(l[1]):void 0,d=te(l[2]),g=yr(d);s.push(E(t,e,"task",g&&m!==void 0?`TODO ${m}`:d,{key:m!==void 0?`task:${m}`:hr(d),order:m,status:Ge(r),confidence:.93}))}if(/^(?:next|next action|next step|tiếp theo|bước tiếp theo|cần làm tiếp)\b/iu.test(r)){let m=r.replace(/^(?:next|next action|next step|tiếp theo|bước tiếp theo|cần làm tiếp)\s*(?::|-)?\s*/iu,"");m&&s.push(E(t,e,"next_action",m,{confidence:.9}))}return/\b(blocker|blocked)\b|đang vướng|bị vướng|đang kẹt/iu.test(r)&&s.push(E(t,e,"blocker",r,{confidence:.9})),/\b(chú ý|lưu ý|warning|attention|cẩn thận)\b/iu.test(r)&&s.push(E(t,e,"warning",r,{confidence:.88})),/\b(chốt|quyết định|decided|decision)\b/iu.test(r)&&s.push(E(t,e,"decision",r,{confidence:.9})),r.length<=300&&/^(?:đang\s+(?:sửa|cập nhật|triển khai|xử lý|làm|refactor|fix)|(?:i(?:'m| am)\s+)?(?:working on|implementing|fixing|refactoring|updating|editing)\b)/iu.test(r)&&s.push(E(t,e,"activity",r,{confidence:.86})),s}function He(t,e){if(e.length===0)return[];let n=[],r=new Set;function s(i){r.has(i.id)||(r.add(i.id),n.push(i))}for(let i of e){if(i.type==="user_prompt"||i.role==="user"){let c=[];ee(i.data,c);let u=c.map(p=>te(p)).find(p=>p.length>=8&&p.length<=1200&&!/^\[?toolnet\b/iu.test(p));u&&s(E(t,i,"request",u,{confidence:.96}))}for(let c of gr(i))s(E(t,i,c.kind,c.text,{fileAction:c.fileAction,checkKind:c.checkKind,checkStatus:c.checkStatus,status:c.kind==="test"?c.checkStatus==="passed"?"completed":c.checkStatus==="failed"?"blocked":c.checkStatus==="running"?"in_progress":"pending":void 0,confidence:c.confidence}));if(i.type==="decision"){let c=[];ee(i.data,c);for(let u of c)s(E(t,i,"decision",u,{confidence:1}))}if(i.type==="todo"){let c=[];ee(i.data,c);for(let u of c)s(E(t,i,"task",u,{status:Ge(u),confidence:1}))}if(["file_write","file_edit"].includes(i.type))for(let c of["filePath","path","file"]){let u=i.data[c];typeof u=="string"&&u&&s(E(t,i,"file",u,{fileAction:"modified",confidence:1}))}if(i.type==="test"){let c=[];ee(i.data,c);for(let u of c)s(E(t,i,"test",u,{confidence:1}))}let a=[];ee(i.data,a);for(let c of a)for(let u of c.split(/\n+/u))for(let p of Wa(t,i,u))s(p)}let o=e[e.length-1];return s(E(t,o,"session",`${t.agent}:${t.nativeSessionId}`,{key:t.sessionKey,confidence:1})),n}function Sr(t){return String(t).padStart(12,"0")}var Ue=class{constructor(e){this.storage=e}storage;async write(e,n){if(n.length===0)return null;let r=Math.min(...n.map(u=>u.sequence)),s=Math.max(...n.map(u=>u.sequence)),o={version:1,projectId:e.projectId,agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,createdAt:new Date().toISOString(),firstSequence:r,lastSequence:s,observations:n},i=JSON.stringify(o,null,2)+`
`,a=v(n.map(u=>u.id).sort().join("|")).slice(0,16),c=[`projects/${e.projectId}`,"work","observations",e.agent,e.nativeSessionId,`${Sr(r)}-${Sr(s)}-${a}.json`].join("/");return await this.storage.exists(c)||await this.storage.put(c,i,"application/json"),c}};import{join as kr}from"node:path";import{mkdirSync as La}from"node:fs";function wr(t){return t.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim()}function W(t,e=20){let n=[],r=new Set;for(let s of t.slice().reverse()){let o=wr(s);if(!(!o||r.has(o))&&(r.add(o),n.push(s),n.length>=e))break}return n.reverse()}function Fa(t,e=20){let n=new Map;for(let r of t){let s=`${r.kind}|${wr(r.command)}`;n.delete(s),n.set(s,r)}return Array.from(n.values()).slice(-e)}function Da(t){return t.kind==="phase"?/^Phase\s+\d+$/iu.test(t.text):t.kind==="task"?/^(?:TODO|Task|Việc)\s+\d+$/iu.test(t.text):!1}function vr(t,e){let n=e.status??t?.status??"pending",r=n;t&&(t.status==="completed"&&n!=="completed"?r="completed":n==="pending"&&(t.status==="in_progress"||t.status==="blocked")&&(r=t.status));let s=t&&Da(e)?t.title:e.text;return{id:t?.id??v(e.key).slice(0,24),title:s,status:r,order:e.order??t?.order,confidence:Math.max(e.confidence,t?.confidence??0),updatedAt:e.occurredAt,updatedBy:{agent:e.agent,nativeSessionId:e.nativeSessionId,eventId:e.eventId}}}async function za(t,e){let n=`projects/${t.id}/work/observations/`,r=await e.list(n),s=[];for(let o of r.filter(i=>i.key.endsWith(".json")).sort((i,a)=>i.key.localeCompare(a.key))){let i=await e.getText(o.key);if(i)try{let a=JSON.parse(i);a.version===1&&Array.isArray(a.observations)&&s.push(a)}catch{}}return s}async function Ye(t,e){let r=(await za(t,e)).flatMap(f=>f.observations).sort((f,b)=>{let B=f.occurredAt.localeCompare(b.occurredAt);if(B!==0)return B;let Vt=f.sequence-b.sequence;return Vt!==0?Vt:f.id.localeCompare(b.id)}),s=new Map,o=new Map,i,a,c,u,p,l=[],m=[],d=[],g=[],S=[],h=new Map,y=[],k=[],A=[],M=[],T=[],O=[];for(let f of r)switch(f.kind){case"request":i=f.text;break;case"activity":a=f.text;break;case"goal":c=f.text;break;case"plan":u=f.text;break;case"phase":s.set(f.key,vr(s.get(f.key),f));break;case"task":o.set(f.key,vr(o.get(f.key),f));break;case"decision":l.push(f.text);break;case"blocker":m.push(f.text);break;case"warning":d.push(f.text);break;case"next_action":g.push(f.text);break;case"file":{S.push(f.text);let b=f.fileAction??"active";h.delete(f.text),h.set(f.text,b),b==="modified"?y.push(f.text):b==="created"?k.push(f.text):b==="deleted"&&A.push(f.text);break}case"command":M.push(f.text);break;case"test":T.push(f.text),f.checkKind&&O.push({kind:f.checkKind,command:f.text,status:f.checkStatus??"unknown",updatedAt:f.occurredAt,agent:f.agent,nativeSessionId:f.nativeSessionId});break;case"session":p={agent:f.agent,nativeSessionId:f.nativeSessionId,sessionKey:f.sessionKey,updatedAt:f.occurredAt};break}let C=Array.from(s.values()).sort((f,b)=>(f.order??Number.MAX_SAFE_INTEGER)-(b.order??Number.MAX_SAFE_INTEGER)),w=Array.from(o.values()).sort((f,b)=>(f.order??Number.MAX_SAFE_INTEGER)-(b.order??Number.MAX_SAFE_INTEGER)),D=C.find(f=>f.status==="in_progress")??C.find(f=>f.status==="blocked")??C.find(f=>f.status==="pending"),z=w.find(f=>f.status==="in_progress")??w.find(f=>f.status==="blocked")??w.find(f=>f.status==="pending"),ft=W([...g,...z?[z.title]:[],...!z&&D?[D.title]:[],...w.filter(f=>f.status==="pending").slice(0,5).map(f=>f.title)],8),gt=W([...m,...C.filter(f=>f.status==="blocked").map(f=>f.title),...w.filter(f=>f.status==="blocked").map(f=>f.title)],20),ae={version:1,projectId:t.id,projectName:t.name,currentRequest:i,currentActivity:a,goal:c,plan:u,phases:C,tasks:w,decisions:W(l,20),blockers:gt,warnings:W(d,20),nextActions:ft,filesTouched:W(S,30),activeFiles:Array.from(h.entries()).filter(([,f])=>f!=="deleted").map(([f])=>f).slice(-5),modifiedFiles:W(y,30),createdFiles:W(k,30),deletedFiles:W(A,30),commands:W(M,20),tests:W(T,20),checks:Fa(O,20),currentPhase:D,currentTask:z,progress:{phasesTotal:C.length,phasesCompleted:C.filter(f=>f.status==="completed").length,tasksTotal:w.length,tasksCompleted:w.filter(f=>f.status==="completed").length,blocked:C.filter(f=>f.status==="blocked").length+w.filter(f=>f.status==="blocked").length},lastSession:p,updatedAt:r.length?r[r.length-1].occurredAt:new Date().toISOString()},ce=kr(t.rootPath,".toolnet","work");return La(ce,{recursive:!0}),R(kr(ce,"current.json"),ae),await e.put(`projects/${t.id}/work/current.json`,JSON.stringify(ae,null,2)+`
`,"application/json"),ae}async function Xe(t,e){let n=await e.getText(`projects/${t.id}/work/current.json`);if(!n)return null;try{return JSON.parse(n)}catch{return null}}function Ha(t,e){if(!Ba(t))return{events:[],nextOffset:e};let n=Ga(t).size,r=Number.isFinite(e)?Math.max(0,e):0;if(r>n&&(r=0),r===n)return{events:[],nextOffset:n};let s=n-r,o=Buffer.alloc(s),i=Va(t,"r");try{Ja(i,o,0,s,r)}finally{qa(i)}let a=o.toString("utf8"),c=a.lastIndexOf(`
`);if(c<0)return{events:[],nextOffset:r};let u=a.slice(0,c+1);return{events:u.split(`
`).filter(Boolean).flatMap(l=>{try{return[JSON.parse(l)]}catch{return[]}}),nextOffset:r+Buffer.byteLength(u,"utf8")}}var Qe=class{constructor(e){this.options=e;this.journal=new Ue(e.storage)}options;journal;async learnNew(){let e=this.options.wal.loadState(),n=Number(e.sourceCursors["work.continuity.offset"]??0),r=Ha(this.options.wal.eventsFile,Number.isFinite(n)?n:0);if(r.events.length===0)return{scannedEvents:0,observations:0,journalWritten:!1,reconciled:!1,nextOffset:r.nextOffset};let s=He(this.options.identity,r.events),o=!1,i=!1;return s.length>0&&(o=!!await this.journal.write(this.options.identity,s),o&&(await Ye(this.options.project,this.options.storage),i=!0)),this.options.wal.setSourceCursor("work.continuity.offset",r.nextOffset),{scannedEvents:r.events.length,observations:s.length,journalWritten:o,reconciled:i,nextOffset:r.nextOffset}}};import{closeSync as rc,existsSync as sc,openSync as oc,readSync as ic,statSync as ac}from"node:fs";var Ua=new Set(["content","text","message","prompt","summary","description","title","reason","last_assistant_message","lastAssistantMessage"]);function oe(t){return t.normalize("NFKC").replace(/\s+/g," ").replace(/^[\s>*#•-]+/u,"").trim()}function _t(t,e,n=0){if(!(n>6)){if(typeof t=="string"){e.push(t);return}if(Array.isArray(t)){for(let r of t.slice(0,50))_t(r,e,n+1);return}if(!(!t||typeof t!="object"))for(let[r,s]of Object.entries(t))(Ua.has(r)||["data","payload","parts","messages"].includes(r))&&_t(s,e,n+1)}}function _(t,e,n,r,s,o=.95){let i=oe(r);return{version:1,id:v([t.projectId,n,s.type,s.key??"",i.toLowerCase(),e.id].join("|")).slice(0,32),projectId:t.projectId,kind:n,value:i,scope:s.type,scopeKey:s.key,scopeOrder:s.order,confidence:o,evidence:{agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,eventId:e.id,sourceEventId:e.sourceEventId,sequence:e.sequence,occurredAt:e.timestamp}}}function L(t,e){let n=t.toLowerCase();for(let r of e){let s=r.toLowerCase();if(n.startsWith(`${s}:`)||n.startsWith(`${s} -`)||n.startsWith(`${s} \u2014`))return oe(t.slice(r.length+1))}return null}function Ya(t){let e=t.trimStart();return e.startsWith("- ")||e.startsWith("* ")||/^\d+[.)]\s+/u.test(e)}function Xa(t){return oe(t.trim().replace(/^[-*]\s+/u,"").replace(/^\d+[.)]\s+/u,""))}function br(t,e){let n=[],r=new Set;function s(o){!o.value||o.value.length<3||r.has(o.id)||(r.add(o.id),n.push(o))}for(let o of e){let i=[];_t(o.data,i);for(let a of i){let c={type:"project"},u=null;for(let p of a.split(/\r?\n/u)){let l=oe(p);if(!l){u=null;continue}let m=l.match(/^(?:phase|giai đoạn|giai doan|stage)\s*(\d+)\s*(?:[:\-–—]\s*)?(.*)$/iu);if(m){let w=Number(m[1]);c={type:"phase",key:`phase:${w}`,order:w,title:oe(m[2]??"")},u=null;continue}let d=l.match(/^(?:todo|task|việc)\s*(\d+)\s*(?:[:\-–—]\s*)?(.*)$/iu);if(d){let w=Number(d[1]);c={type:"task",key:`task:${w}`,order:w,title:oe(d[2]??"")},u=null;continue}let g=L(l,["mission","s\u1EE9 m\u1EC7nh","m\u1EE5c ti\xEAu t\u1ED5ng th\u1EC3","m\u1EE5c ti\xEAu project","project goal"]);if(g){s(_(t,o,"mission",g,{type:"project"},.99)),u=null;continue}let S=L(l,["current objective","active objective","m\u1EE5c ti\xEAu hi\u1EC7n t\u1EA1i","objective","m\u1EE5c ti\xEAu","m\u1EE5c \u0111\xEDch"]);if(S){s(_(t,o,c.type==="phase"?"phase_objective":"objective",S,c,.98)),u=null;continue}let h=L(l,["why","why this","why this phase","reason","rationale","v\xEC sao","l\xFD do","t\u1EA1i sao","\xFD ngh\u0129a"]);if(h){s(_(t,o,c.type==="phase"?"phase_why":"why",h,c,.98)),u=null;continue}let y=L(l,["desired outcome","final outcome","k\u1EBFt qu\u1EA3 cu\u1ED1i","k\u1EBFt qu\u1EA3 mong mu\u1ED1n","m\u1EE5c ti\xEAu cu\u1ED1i"]);if(y){s(_(t,o,"desired_outcome",y,{type:"project"},.98)),u=null;continue}let k=L(l,["plan rationale","approach rationale","why this approach","t\u1EA1i sao ch\u1ECDn h\u01B0\u1EDBng n\xE0y","l\xFD do ch\u1ECDn h\u01B0\u1EDBng n\xE0y","l\xFD do ch\u1ECDn ki\u1EBFn tr\xFAc"]);if(k){s(_(t,o,"plan_rationale",k,{type:"project"},.98)),u=null;continue}let A=L(l,["deliverable","output","k\u1EBFt qu\u1EA3 c\u1EA7n \u0111\u1EA1t","ph\u1EA3i t\u1EA1o ra","\u0111\u1EA7u ra"]);if(A){s(_(t,o,"phase_deliverable",A,c,.97)),u=null;continue}let M=L(l,["acceptance criteria","definition of done","done khi","ho\xE0n th\xE0nh khi","ti\xEAu ch\xED ho\xE0n th\xE0nh"]);if(M){s(_(t,o,"acceptance_criterion",M,c,.98)),u="acceptance_criterion";continue}let T=L(l,["depends on","dependency","dependencies","ph\u1EE5 thu\u1ED9c","c\u1EA7n c\xF3 tr\u01B0\u1EDBc"]);if(T){s(_(t,o,"dependency",T,c,.97)),u="dependency";continue}let O=L(l,["open question","open questions","c\xE2u h\u1ECFi m\u1EDF","ch\u01B0a quy\u1EBFt \u0111\u1ECBnh","ch\u01B0a r\xF5"]);if(O){s(_(t,o,"open_question",O,c,.95)),u="open_question";continue}let C=L(l,["constraint","constraints","r\xE0ng bu\u1ED9c","gi\u1EDBi h\u1EA1n"]);if(C){s(_(t,o,"constraint",C,c,.97)),u="constraint";continue}if(/^(?:acceptance criteria|definition of done|done khi|tiêu chí hoàn thành)\s*:?\s*$/iu.test(l)){u="acceptance_criterion";continue}if(/^(?:dependencies|dependency|phụ thuộc)\s*:?\s*$/iu.test(l)){u="dependency";continue}if(/^(?:open questions|open question|câu hỏi mở)\s*:?\s*$/iu.test(l)){u="open_question";continue}if(/^(?:constraints|constraint|ràng buộc)\s*:?\s*$/iu.test(l)){u="constraint";continue}if(u&&Ya(p)){s(_(t,o,u,Xa(p),c,.96));continue}u=null}}}return n}function xr(t){return String(t).padStart(12,"0")}var Ze=class{constructor(e){this.storage=e}storage;async write(e,n){if(n.length===0)return null;let r=Math.min(...n.map(c=>c.evidence.sequence)),s=Math.max(...n.map(c=>c.evidence.sequence)),o={version:1,projectId:e.projectId,agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,firstSequence:r,lastSequence:s,createdAt:new Date().toISOString(),observations:n},i=v(n.map(c=>c.id).sort().join("|")).slice(0,16),a=[`projects/${e.projectId}`,"work","semantic","observations",e.agent,e.nativeSessionId,`${xr(r)}-${xr(s)}-${i}.json`].join("/");return await this.storage.exists(a)||await this.storage.put(a,JSON.stringify(o,null,2)+`
`,"application/json"),a}};import{mkdirSync as Qa}from"node:fs";import{join as Cr}from"node:path";function Za(t){return{value:t.value,confidence:t.confidence,evidence:t.evidence}}function ec(t,e){if(!e)return!0;let n=t.evidence.occurredAt.localeCompare(e.evidence.occurredAt);return n!==0?n>0:t.evidence.sessionKey===e.evidence.sessionKey?t.evidence.sequence>=e.evidence.sequence:t.confidence>=e.confidence}function J(t,e){return ec(e,t)?e:t}function G(t,e=30){let n=new Set,r=[];for(let s of t){let o=s.value.normalize("NFKC").toLowerCase().replace(/\s+/g," ").trim();!o||n.has(o)||(n.add(o),r.push(s))}return r.slice(-e)}async function tc(t,e){let n=`projects/${t.id}/work/semantic/observations/`,r=await e.list(n),s=[];for(let o of r.filter(i=>i.key.endsWith(".json")).sort((i,a)=>i.key.localeCompare(a.key))){let i=await e.getText(o.key);if(i)try{let a=JSON.parse(i);a.version===1&&Array.isArray(a.observations)&&s.push(a)}catch{}}return s}function nc(t){return{key:t.scopeKey??`phase:${t.scopeOrder??0}`,order:t.scopeOrder??0,acceptanceCriteria:[],dependencies:[],openQuestions:[],constraints:[],notes:[]}}async function jr(t,e){let r=(await tc(t,e)).flatMap(S=>S.observations).sort((S,h)=>{let y=S.evidence.occurredAt.localeCompare(h.evidence.occurredAt);return y!==0?y:S.evidence.sessionKey===h.evidence.sessionKey?S.evidence.sequence-h.evidence.sequence:S.id.localeCompare(h.id)}),s,o,i,a,c,u=new Map,p=[],l=[],m=[];for(let S of r){let h=Za(S);if(S.scope==="phase"&&S.scopeKey){let y=u.get(S.scopeKey)??nc(S);switch(S.kind){case"phase_objective":y.objective=J(y.objective,h);break;case"phase_why":y.why=J(y.why,h);break;case"phase_deliverable":y.deliverable=J(y.deliverable,h);break;case"acceptance_criterion":y.acceptanceCriteria.push(h);break;case"dependency":y.dependencies.push(h);break;case"open_question":y.openQuestions.push(h);break;case"constraint":y.constraints.push(h);break;case"note":y.notes.push(h);break}u.set(y.key,y);continue}switch(S.kind){case"mission":s=J(s,h);break;case"objective":o=J(o,h);break;case"why":i=J(i,h);break;case"desired_outcome":a=J(a,h);break;case"plan_rationale":c=J(c,h);break;case"open_question":p.push(h);break;case"constraint":l.push(h);break;case"note":m.push(h);break}}for(let S of u.values())S.acceptanceCriteria=G(S.acceptanceCriteria,20),S.dependencies=G(S.dependencies,15),S.openQuestions=G(S.openQuestions,15),S.constraints=G(S.constraints,15),S.notes=G(S.notes,20);let d={version:1,projectId:t.id,projectName:t.name,mission:s,activeObjective:o,why:i,desiredOutcome:a,planRationale:c,phases:Array.from(u.values()).sort((S,h)=>S.order-h.order),openQuestions:G(p,20),constraints:G(l,20),notes:G(m,20),updatedAt:r.length?r[r.length-1].evidence.occurredAt:new Date().toISOString()},g=Cr(t.rootPath,".toolnet","work");return Qa(g,{recursive:!0}),R(Cr(g,"semantic-current.json"),d),await e.put(`projects/${t.id}/work/semantic/current.json`,JSON.stringify(d,null,2)+`
`,"application/json"),d}async function Ir(t,e){let n=await e.getText(`projects/${t.id}/work/semantic/current.json`);if(!n)return null;try{return JSON.parse(n)}catch{return null}}function cc(t,e){if(!sc(t))return{events:[],nextOffset:e};let n=ac(t).size,r=Number.isFinite(e)?Math.max(0,e):0;if(r>n&&(r=0),r===n)return{events:[],nextOffset:n};let s=Buffer.alloc(n-r),o=oc(t,"r");try{ic(o,s,0,s.length,r)}finally{rc(o)}let i=s.toString("utf8"),a=i.lastIndexOf(`
`);if(a<0)return{events:[],nextOffset:r};let c=i.slice(0,a+1);return{events:c.split(`
`).filter(Boolean).flatMap(u=>{try{return[JSON.parse(u)]}catch{return[]}}),nextOffset:r+Buffer.byteLength(c,"utf8")}}var et=class{constructor(e){this.options=e;this.journal=new Ze(e.storage)}options;journal;async learnNew(){let e=this.options.wal.loadState(),n=Number(e.sourceCursors["work.semantic.offset"]??0),r=cc(this.options.wal.eventsFile,Number.isFinite(n)?n:0);if(r.events.length===0)return{scannedEvents:0,observations:0,journalWritten:!1,reconciled:!1,nextOffset:r.nextOffset};let s=br(this.options.identity,r.events),o=!1,i=!1;return s.length>0&&(o=!!await this.journal.write(this.options.identity,s),o&&(await jr(this.options.project,this.options.storage),i=!0)),this.options.wal.setSourceCursor("work.semantic.offset",r.nextOffset),{scannedEvents:r.events.length,observations:s.length,journalWritten:o,reconciled:i,nextOffset:r.nextOffset}}};import{existsSync as Mc,mkdirSync as Oc}from"node:fs";import{join as Kt}from"node:path";import{existsSync as Pr,mkdirSync as uc,readFileSync as lc,statSync as Ar,writeFileSync as dc}from"node:fs";import{dirname as pc,join as mc}from"node:path";var Er=64*1024,fc=`# ToolNet Project Operating Manual

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
`;function tt(t){return mc(t.rootPath,".toolnet","PROJECT.md")}function gc(t){return t.normalize("NFKC").replace(/\s+/g," ").trim()}function yc(t){let e=[],n=new Set,r=/^\s*[-*]\s+\[(enforce|advisory)\]\s+(.+?)\s*$/gimu,s;for(;s=r.exec(t);){let o=s[1].toLowerCase(),i=gc(s[2]);if(!i)continue;let a=`${o}:${i.toLowerCase()}`;n.has(a)||(n.add(a),e.push({id:v(a).slice(0,24),mode:o,text:i,source:"manual"}))}return e}function hc(t){let e=tt(t);return Pr(e)||(uc(pc(e),{recursive:!0}),dc(e,fc,{encoding:"utf8",mode:384})),e}function nt(t,e=!1){let n=e?hc(t):tt(t);if(!Pr(n))return null;if(Ar(n).size>Er)throw new Error(`PROJECT.md exceeds ${Er} bytes`);let s=lc(n,"utf8");return{path:n,content:s,digest:v(s),rules:yc(s),bytes:Buffer.byteLength(s,"utf8"),updatedAt:new Date(Ar(n).mtimeMs).toISOString()}}import{existsSync as Sc,mkdirSync as kc,readFileSync as vc,renameSync as wc,writeFileSync as bc}from"node:fs";import{dirname as xc,join as Cc}from"node:path";function jc(t,e){kc(xc(t),{recursive:!0});let n=`${t}.tmp-${process.pid}-${Date.now()}`;bc(n,`${JSON.stringify(e,null,2)}
`,{encoding:"utf8",mode:384}),wc(n,t)}function _r(t){return Cc(t.rootPath,".toolnet","work","current.json")}function $t(t){let e=_r(t);if(!Sc(e))return null;try{let n=JSON.parse(vc(e,"utf8"));return n.version!==1||n.projectId!==t.id?null:n}catch{return null}}function rt(t){return t.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim()}function $(t,e,n){let r=[],s=new Set;for(let o of[...t,...e].reverse()){let i=rt(o);if(!(!i||s.has(i))&&(s.add(i),r.push(o),r.length>=n))break}return r.reverse()}function Ic(t,e,n=20){let r=new Map;for(let s of[...t,...e]){let o=`${s.kind}|${rt(s.command)}`;r.delete(o),r.set(o,s)}return Array.from(r.values()).slice(-n)}function Ac(t){return t.kind==="phase"?/^Phase\s+\d+$/iu.test(t.text):t.kind==="task"?/^(?:TODO|Task|Việc)\s+\d+$/iu.test(t.text):!1}function Tr(t,e){let n=e.status??t?.status??"pending",r=n;t?.status==="completed"&&n!=="completed"&&(r="completed"),t&&n==="pending"&&(t.status==="in_progress"||t.status==="blocked")&&(r=t.status);let s=t&&Ac(e)?t.title:e.text;return{id:t?.id??e.id,title:s,status:r,order:e.order??t?.order,confidence:Math.max(t?.confidence??0,e.confidence),updatedAt:e.occurredAt,updatedBy:{agent:e.agent,nativeSessionId:e.nativeSessionId,eventId:e.eventId}}}function Mr(t){let e=new Map;for(let n of t){let r=n.order!==void 0?`order:${n.order}`:rt(n.title);e.set(r,n)}return e}function Or(t){return t.order!==void 0?`order:${t.order}`:rt(t.key||t.text)}function Rr(t){return Array.from(t).sort((e,n)=>{let r=e.order??Number.MAX_SAFE_INTEGER,s=n.order??Number.MAX_SAFE_INTEGER;return r!==s?r-s:e.updatedAt.localeCompare(n.updatedAt)})}function Nr(t){return t.find(e=>e.status==="in_progress")??t.find(e=>e.status==="blocked")??t.find(e=>e.status==="pending")}function $r(t,e){let n=$t(t),r=Mr(n?.phases??[]),s=Mr(n?.tasks??[]),o=n?.currentRequest,i=n?.currentActivity,a=n?.goal,c=n?.plan,u=n?.lastSession,p=[],l=[],m=[],d=[],g=[],S=[...n?.activeFiles??[]],h=[],y=[],k=[],A=[],M=[],T=[],O=[...e].sort((f,b)=>{let B=f.occurredAt.localeCompare(b.occurredAt);return B!==0?B:f.sequence-b.sequence});for(let f of O)switch(f.kind){case"request":o=f.text;break;case"activity":i=f.text;break;case"goal":a=f.text;break;case"plan":c=f.text;break;case"phase":{let b=Or(f);r.set(b,Tr(r.get(b),f));break}case"task":{let b=Or(f);s.set(b,Tr(s.get(b),f));break}case"decision":p.push(f.text);break;case"blocker":l.push(f.text);break;case"warning":m.push(f.text);break;case"next_action":d.push(f.text);break;case"file":{g.push(f.text);let b=f.fileAction??"active",B=S.indexOf(f.text);B>=0&&S.splice(B,1),b!=="deleted"&&S.push(f.text),b==="modified"?h.push(f.text):b==="created"?y.push(f.text):b==="deleted"&&k.push(f.text);break}case"command":A.push(f.text);break;case"test":M.push(f.text),f.checkKind&&T.push({kind:f.checkKind,command:f.text,status:f.checkStatus??"unknown",updatedAt:f.occurredAt,agent:f.agent,nativeSessionId:f.nativeSessionId});break;case"session":u={agent:f.agent,nativeSessionId:f.nativeSessionId,sessionKey:f.sessionKey,updatedAt:f.occurredAt};break}let C=Rr(r.values()),w=Rr(s.values()),D=Nr(C),z=Nr(w),ft=$(n?.nextActions??[],[...d,...z?[z.title]:[],...!z&&D?[D.title]:[],...w.filter(f=>f.status==="pending").slice(0,5).map(f=>f.title)],8),gt=$(n?.blockers??[],[...l,...C.filter(f=>f.status==="blocked").map(f=>f.title),...w.filter(f=>f.status==="blocked").map(f=>f.title)],20),ae=O.length>0?O[O.length-1].occurredAt:n?.updatedAt??new Date().toISOString(),ce={version:1,projectId:t.id,projectName:t.name,currentRequest:o,currentActivity:i,goal:a,plan:c,phases:C,tasks:w,decisions:$(n?.decisions??[],p,20),blockers:gt,warnings:$(n?.warnings??[],m,20),nextActions:ft,filesTouched:$(n?.filesTouched??[],g,30),activeFiles:$([],S,5),modifiedFiles:$(n?.modifiedFiles??[],h,30),createdFiles:$(n?.createdFiles??[],y,30),deletedFiles:$(n?.deletedFiles??[],k,30),commands:$(n?.commands??[],A,20),tests:$(n?.tests??[],M,20),checks:Ic(n?.checks??[],T,20),currentPhase:D,currentTask:z,progress:{phasesTotal:C.length,phasesCompleted:C.filter(f=>f.status==="completed").length,tasksTotal:w.length,tasksCompleted:w.filter(f=>f.status==="completed").length,blocked:C.filter(f=>f.status==="blocked").length+w.filter(f=>f.status==="blocked").length},lastSession:u,updatedAt:ae};return jc(_r(t),ce),ce}function P(t,e){let n=new Set,r=[];for(let s of t){let o=s.replace(/\s+/g," ").trim();if(!o)continue;let i=o.normalize("NFKC").toLowerCase();if(!n.has(i)&&(n.add(i),r.push(o),r.length>=e))break}return r}function Kr(t){if(t)return{id:t.id,title:t.title,status:t.status}}function Ec(t,e=[]){let n=e.slice(-10);if(n.some(s=>s.status==="failed"))return"failing";if(n.some(s=>s.status==="passed"))return"passing";let r=t.slice(-10).join(`
`).toLowerCase();return/(?:failed|failing|failure|error|✗|❌)/u.test(r)?"failing":/(?:passed|passing|green|success|✓|✅)/u.test(r)?"passing":"unknown"}function Pc(t){return v(JSON.stringify(t))}function Tc(t){let e=[];for(let n of t){if(!n)continue;let r=n.match(/https?:\/\/[^\s<>"'`)\]}]+/giu)??[];for(let s of r){let o=s.replace(/[.,;:!?]+$/gu,"").trim();o&&e.push(o)}}return P(e,30)}function Wr(t){let{project:e,identity:n,state:r}=t,s=r.activeFiles?.at(-1)??r.filesTouched.at(-1),o=r.phases.filter(k=>k.status==="completed").map(k=>k.title),i=r.tasks.filter(k=>k.status==="completed").map(k=>k.title),a=r.phases.filter(k=>k.status!=="completed"&&k.status!=="cancelled").map(k=>k.title),c=r.tasks.filter(k=>k.status!=="completed"&&k.status!=="cancelled").map(k=>k.title),u=new Set(r.tasks.filter(k=>k.status==="completed").map(k=>k.title.normalize("NFKC").toLowerCase().replace(/\s+/gu," ").trim())),p=P(r.nextActions.filter(k=>!u.has(k.normalize("NFKC").toLowerCase().replace(/\s+/gu," ").trim())),10),l=P([...c,...p],15),m=P(r.tests.slice().reverse(),10),d=P([...(r.activeFiles??[]).slice().reverse(),...r.filesTouched.slice().reverse()],20),g={schema:"toolnet.handoff.v2",version:2,project:{id:e.id,name:e.name},source:{agent:n.agent,nativeSessionId:n.nativeSessionId,sessionKey:n.sessionKey,sequence:t.sequence,reason:t.reason},capturedAt:t.capturedAt??new Date().toISOString(),goal:r.goal,request:r.currentRequest,activity:r.currentActivity,current:{phase:Kr(r.currentPhase),task:Kr(r.currentTask),file:s},completed:{phases:P(o,20),tasks:P(i,30)},remaining:{phases:P(a,20),tasks:P(c,30),todos:l},nextAction:p[0],blockers:P(r.blockers.slice().reverse(),10),decisions:P(r.decisions.slice().reverse(),10),files:{current:s,recent:d,active:P(r.activeFiles??[],10),modified:P(r.modifiedFiles??[],20),created:P(r.createdFiles??[],20),deleted:P(r.deletedFiles??[],20)},tests:{status:Ec(r.tests,r.checks),recent:m,checks:(r.checks??[]).slice(-10).map(k=>({kind:k.kind,status:k.status,command:k.command}))},evidence:{commands:P((r.commands??[]).slice().reverse(),20),references:Tc([r.currentRequest,r.currentActivity,r.goal,r.plan,...r.decisions,...r.blockers,...r.warnings,...r.nextActions,...r.filesTouched,...r.commands??[],...r.tests,...(r.checks??[]).map(k=>k.command)])},attention:P(t.attention??[],20),progress:r.progress},{capturedAt:S,source:h,...y}=g;return{...g,stateDigest:Pc(y)}}function Rc(t){return!!(t.currentRequest||t.currentActivity||t.goal||t.plan||t.phases.length>0||t.tasks.length>0||t.nextActions.length>0||t.blockers.length>0||t.decisions.length>0||t.filesTouched.length>0)}function Lr(t,e,n,r,s){if(!Rc(n))return null;let o=nt(t,!1),a=[...o?o.rules.filter(l=>l.mode==="enforce").map(l=>l.text):[],...n.warnings].slice(0,20),c=Wr({project:t,identity:e,state:n,reason:r,sequence:s,attention:a}),u=c.stateDigest;return{version:1,id:v([t.id,e.sessionKey,u].join("|")).slice(0,24),projectId:t.id,projectName:t.name,createdAt:new Date().toISOString(),reason:r,sourceSession:{agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,sequence:s},currentRequest:n.currentRequest,currentActivity:n.currentActivity,goal:n.goal,plan:n.plan,progress:n.progress,currentPhase:n.currentPhase,currentTask:n.currentTask,incompletePhases:n.phases.filter(l=>l.status!=="completed"&&l.status!=="cancelled"),incompleteTasks:n.tasks.filter(l=>l.status!=="completed"&&l.status!=="cancelled"),nextActions:c.remaining.todos.slice(0,10),blockers:n.blockers.slice(-10),decisions:n.decisions.slice(-10),warnings:n.warnings.slice(-10),attention:a,filesTouched:n.filesTouched.slice(-20),activeFiles:n.activeFiles?.slice(-10),modifiedFiles:n.modifiedFiles?.slice(-20),createdFiles:n.createdFiles?.slice(-20),deletedFiles:n.deletedFiles?.slice(-20),tests:n.tests.slice(-15),checks:n.checks?.slice(-10),stateDigest:u,continuity:c}}function Fr(t,e){let n=Kt(t.rootPath,".toolnet","work","handoffs");Oc(n,{recursive:!0});let r=Kt(n,`${e.id}.json`);Mc(r)||R(r,e),R(Kt(t.rootPath,".toolnet","work","handoff-latest.json"),e)}function Dr(t){let e=Lr(t.project,t.identity,t.state,t.reason,t.sequence);return e?(Fr(t.project,e),e):null}var st=class{constructor(e){this.options=e}options;async capture(e,n){let r=$t(this.options.project);r||(r=await Xe(this.options.project,this.options.storage)),r||(r=await Ye(this.options.project,this.options.storage));let s=Lr(this.options.project,this.options.identity,r,e,n);if(!s)return null;Fr(this.options.project,s);let o=`projects/${this.options.project.id}/work/handoffs/${s.id}.json`;return await this.options.storage.exists(o)||await this.options.storage.put(o,JSON.stringify(s,null,2)+`
`,"application/json"),await this.options.storage.put(`projects/${this.options.project.id}/work/handoff-latest.json`,JSON.stringify(s,null,2)+`
`,"application/json"),s}};async function zr(t,e){let n=await e.getText(`projects/${t.id}/work/handoff-latest.json`);if(!n)return null;try{return JSON.parse(n)}catch{return null}}import{existsSync as Nc,readFileSync as _c,writeFileSync as $c}from"node:fs";import{join as Kc}from"node:path";var Br="<!-- TOOLNET:STABLE-WORK:BEGIN -->",Wt="<!-- TOOLNET:STABLE-WORK:END -->";function Lt(t){switch(t.status){case"completed":return"[x]";case"in_progress":return"[~]";case"blocked":return"[!]";case"cancelled":return"[-]";default:return"[ ]"}}function F(t,e){return e.length?["",`${t}:`,...e.map(n=>`- ${n}`)]:[]}function qr(t,e){return e.length?["",`${t}:`,...e.map(n=>`- ${Lt(n)} ${n.title}`)]:[]}function Wc(t){let e=[Br,"# ToolNet Stable Work State","",`Updated: ${t.updatedAt}`];return t.lastSession&&e.push(`Last agent: ${t.lastSession.agent}`,`Last session: ${t.lastSession.nativeSessionId}`),t.currentRequest&&e.push("","Current request:",t.currentRequest),t.currentActivity&&e.push("","Current activity:",t.currentActivity),t.goal&&e.push("","Goal:",t.goal),t.plan&&e.push("","Plan:",t.plan),t.currentPhase&&e.push("","Current phase:",`${Lt(t.currentPhase)} ${t.currentPhase.title}`),t.currentTask&&e.push("","Current task:",`${Lt(t.currentTask)} ${t.currentTask.title}`),e.push(...qr("Phases",t.phases)),e.push(...qr("TODO / Tasks",t.tasks)),e.push(...F("Next actions",t.nextActions)),e.push(...F("Blockers",t.blockers)),e.push(...F("Important decisions",t.decisions)),e.push(...F("Active files",t.activeFiles??[])),e.push(...F("Modified files",t.modifiedFiles??[])),e.push(...F("Created files",t.createdFiles??[])),e.push(...F("Deleted files",t.deletedFiles??[])),e.push(...F("Files touched",t.filesTouched)),e.push(...F("Recent commands",t.commands??[])),e.push(...F("Checks",(t.checks??[]).map(n=>`[${n.status}] ${n.kind}: ${n.command}`))),e.push("","Progress:",`- Phases: ${t.progress.phasesCompleted}/${t.progress.phasesTotal}`,`- Tasks: ${t.progress.tasksCompleted}/${t.progress.tasksTotal}`,`- Blocked: ${t.progress.blocked}`,"","Continuation:","- Resume current unfinished task.","- Never redo completed TODO/Phase unless explicitly requested.","- Ask ToolNet Memory for deeper history only when necessary.",Wt),e.join(`
`)}function Vr(t,e){let n=Kc(t.rootPath,".toolnet","current.md"),r="";if(Nc(n))try{r=_c(n,"utf8")}catch{r=""}r=r.replace(/<!-- TOOLNET:AUTO-CURRENT:BEGIN -->[\s\S]*?<!-- TOOLNET:AUTO-CURRENT:END -->/gu,"");let s=Wc(e),o=r.indexOf(Br),i=r.indexOf(Wt),a;o>=0&&i>=o?a=[r.slice(0,o).trimEnd(),s,r.slice(i+Wt.length).trimStart()].filter(Boolean).join(`

`):a=r.trim()?`${r.trim()}

${s}`:s,$c(n,`${a.trim()}
`,{encoding:"utf8",mode:384})}import{existsSync as qm,mkdirSync as Lc,readFileSync as Bm,renameSync as Fc,writeFileSync as Dc}from"node:fs";import{dirname as zc,join as qc}from"node:path";function Bc(t){return qc(t.rootPath,".toolnet","context","session-origin.json")}function Vc(t,e){Lc(zc(t),{recursive:!0});let n=`${t}.tmp-${process.pid}-${Date.now()}`;Dc(n,`${JSON.stringify(e,null,2)}
`,{encoding:"utf8",mode:384}),Fc(n,t)}function ot(t,e){return[...t].filter(n=>n.kind===e).sort((n,r)=>{let s=n.occurredAt.localeCompare(r.occurredAt);return s!==0?s:n.sequence-r.sequence}).at(-1)}function Jr(t,e){let n=ot(e.observations,"file"),r=ot(e.observations,"next_action"),s=ot(e.observations,"blocker"),o=ot(e.observations,"decision"),i={version:1,projectId:t.id,agent:e.agent,nativeSessionId:e.nativeSessionId,updatedAt:e.workState.updatedAt,currentRequest:e.workState.currentRequest,currentActivity:e.workState.currentActivity,currentTask:e.workState.currentTask?.title,currentPhase:e.workState.currentPhase?.title,lastTouchedFile:n?.text??e.workState.activeFiles?.at(-1)??e.workState.filesTouched.at(-1),latestNextAction:r?.text??e.workState.nextActions.at(-1),latestBlocker:s?.text??e.workState.blockers.at(-1),latestDecision:o?.text??e.workState.decisions.at(-1)};return Vc(Bc(t),i),i}import{existsSync as Gr,mkdirSync as Jc,readFileSync as Gc}from"node:fs";import{join as Ft}from"node:path";function Hr(t){return Ft(t.rootPath,".toolnet","memory","checkpoints")}function Ur(t){return Ft(Hr(t),"latest.json")}function Hc(t){let e=Ur(t);if(!Gr(e))return null;try{let n=JSON.parse(Gc(e,"utf8"));return n.schema!=="toolnet.memory.checkpoint.v1"||n.project.id!==t.id?null:n}catch{return null}}function Uc(t){return["rule","architecture","decision","fix"].includes(t)}function Yc(t,e){return e.length===0?[]:Ke(t,e).candidates.filter(r=>Uc(r.kind)&&r.knowledgeClass!=="transient"&&r.importanceScore>=.65).map(r=>({fingerprint:r.fingerprint,kind:r.kind,content:r.content,knowledgeClass:r.knowledgeClass,importanceScore:r.importanceScore,confidence:r.confidence,createdAt:r.createdAt,agent:t.agent,nativeSessionId:t.nativeSessionId}))}function Xc(t,e){let n=new Map;for(let r of[...t,...e]){let s=n.get(r.fingerprint);(!s||r.importanceScore>s.importanceScore)&&n.set(r.fingerprint,r)}return Array.from(n.values()).sort((r,s)=>s.importanceScore-r.importanceScore||s.createdAt.localeCompare(r.createdAt)).slice(0,80)}function Qc(t){return{request:t.currentRequest,activity:t.currentActivity,goal:t.goal,phase:t.currentPhase?{title:t.currentPhase.title,status:t.currentPhase.status}:void 0,task:t.currentTask?{title:t.currentTask.title,status:t.currentTask.status}:void 0,phases:t.phases.map(e=>({title:e.title,status:e.status})),tasks:t.tasks.map(e=>({title:e.title,status:e.status})),activeFiles:t.activeFiles??[],modifiedFiles:t.modifiedFiles??[],createdFiles:t.createdFiles??[],deletedFiles:t.deletedFiles??[],checks:t.checks??[],blockers:t.blockers,decisions:t.decisions,nextActions:t.nextActions}}function Yr(t,e,n,r){let s=Hc(t),o=Xc(s?.durableFacts??[],Yc(e,n)),i=n.at(-1)?.sequence??s?.source.sequence??0,a=r.phases.filter(h=>h.status==="completed").map(h=>h.title),c=r.tasks.filter(h=>h.status==="completed").map(h=>h.title),u=r.phases.filter(h=>h.status!=="completed"&&h.status!=="cancelled").map(h=>h.title),p=r.tasks.filter(h=>h.status!=="completed"&&h.status!=="cancelled").map(h=>h.title),l={work:Qc(r),durableFacts:o.map(h=>h.fingerprint).sort()},m=v(JSON.stringify(l)).slice(0,32),d={schema:"toolnet.memory.checkpoint.v1",version:1,project:{id:t.id,name:t.name},source:{agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,sequence:i},capturedAt:new Date().toISOString(),request:r.currentRequest,activity:r.currentActivity,goal:r.goal,current:{phase:r.currentPhase,task:r.currentTask},completed:{phases:a,tasks:c},remaining:{phases:u,tasks:p},files:{active:r.activeFiles??[],modified:r.modifiedFiles??[],created:r.createdFiles??[],deleted:r.deletedFiles??[]},checks:r.checks??[],blockers:r.blockers.slice(-10),decisions:r.decisions.slice(-15),nextActions:r.nextActions.slice(0,10),durableFacts:o,stateDigest:m},g=Hr(t);Jc(g,{recursive:!0,mode:448});let S=Ft(g,`${m}.json`);return Gr(S)||R(S,d),R(Ur(t),d),d}function Xr(t,e,n){if(process.env.TOOLNET_LOCAL_CHECKPOINT==="0"||n.length===0)return{updated:!1,observations:0};let r=He(e,n);if(r.length===0)return{updated:!1,observations:0};let s=$r(t,r);Vr(t,s),Jr(t,{agent:e.agent,nativeSessionId:e.nativeSessionId,observations:r,workState:s});try{Yr(t,e,n,s)}catch{}try{Dr({project:t,identity:e,state:s,reason:"continuous-checkpoint",sequence:n.at(-1)?.sequence??0})}catch{}return{updated:!0,observations:r.length}}var it=class{identity;wal;remote;sanitizer=new H;learner;continuity;semantic;handoff;project;title;metadata;constructor(e){this.project=e.project,this.identity=cn(e.project,e.agent,e.nativeSessionId),this.title=e.title,this.metadata=this.sanitizer.sanitizeValue(e.metadata??{}),this.wal=new Oe(this.identity,e.eventContext),this.remote=new Me(e.storage,e.maxEventsPerChunk??100,e.maxChunkBytes??512*1024),this.learner=new Je({project:e.project,storage:e.storage,identity:this.identity,wal:this.wal}),this.continuity=new Qe({project:e.project,storage:e.storage,identity:this.identity,wal:this.wal}),this.semantic=new et({project:e.project,storage:e.storage,identity:this.identity,wal:this.wal}),this.handoff=new st({project:e.project,storage:e.storage,identity:this.identity})}sanitizeEvent(e){let n=e.provenance?{...e.provenance,metadata:this.sanitizer.sanitizeValue(e.provenance.metadata)}:void 0;return{...e,data:this.sanitizer.sanitizeValue(e.data??{}),provenance:n}}checkpointLocal(e){if(e.length!==0)try{Xr(this.project,this.identity,e)}catch{}}start(e={}){let n=this.wal.loadState();return this.record({type:n.lastSequence===0?"session_start":"session_resume",data:e,provenance:{source:this.identity.agent}})}record(e){let n=this.wal.append([this.sanitizeEvent(e)]);return this.checkpointLocal(n),n[0]}recordMany(e){let n=this.wal.append(e.map(r=>this.sanitizeEvent(r)));return this.checkpointLocal(n),n}setSourceCursor(e,n){this.wal.setSourceCursor(e,n)}async flush(){let e=this.wal.readPending(),n=this.wal.loadState(),r=await this.remote.append(this.identity,e.events,n.sourceCursors,{title:this.title,metadata:this.metadata});if(e.events.length>0){let s=e.events[e.events.length-1];this.wal.markRemote(s.sequence,e.endOffset)}if(process.env.TOOLNET_SESSION_LEARNING!=="0")try{await this.learner.learnNew()}catch{}if(process.env.TOOLNET_WORK_CONTINUITY!=="0")try{await this.continuity.learnNew()}catch{}if(process.env.TOOLNET_SEMANTIC_CONTINUITY!=="0")try{await this.semantic.learnNew()}catch{}if(process.env.TOOLNET_SMART_HANDOFF!=="0"&&e.events.length>0)try{let s=e.events[e.events.length-1],o=["session_idle","session_end","session_compact"].includes(s.type)?s.type:"checkpoint";await this.handoff.capture(o,s.sequence)}catch{}return r}async idle(e={}){return this.record({type:"session_idle",data:e,provenance:{source:this.identity.agent}}),this.flush()}async end(e={}){return this.record({type:"session_end",data:e,provenance:{source:this.identity.agent}}),this.flush()}status(){return this.wal.loadState()}recoverRemote(){return this.remote.recover(this.identity)}};var Zc=[/^<SYSTEM MESSAGE>/i,/^<EPHEMERAL MESSAGE>/i,/^<system>/i,/^<ephemeral>/i,/^ManageTask:/i,/^Task \d+ status:/i,/^Task \d+ killed/i,/^Task \d+ loading/i,/^Thought for \d+ tokens/i,/^Prioritizing Tool Usage/i,/^Tool call:/i,/^Tool response:/i,/^npm notice/i,/^npm WARN/i,/^added \d+ packages/i,/^removed \d+ packages/i,/^up to date/i,/^\d+ packages are looking for funding/i,/^run `npm fund` for details/i,/^[\d.]+%/,/^\[={10,}\]/,/^Loading\.\.\./i,/^Processing\.\.\./i,/^bash-\d+\.\d+\$/,/^\$ /,/^\s*$/],eu=[/api[_-]?key[:\s=]+[^\s]+/gi,/token[:\s=]+[^\s]+/gi,/secret[:\s=]+[^\s]+/gi,/password[:\s=]+[^\s]+/gi,/bearer\s+[^\s]+/gi,/authorization:\s*[^\s]+/gi],tu=["decision","decided","rule","convention","architecture","pattern","fixed","resolved","implemented","created","updated","deleted","deployed","blocker","blocked","issue","bug","error","next","todo","action","requirement","must","should","important"];function nu(t){let e=t.toLowerCase();return tu.some(n=>e.includes(n))}function ru(t){if(!t.trim())return!0;for(let e of Zc)if(e.test(t))return!0;return nu(t),!1}function su(t){let e=t;for(let n of eu)e=e.replace(n,r=>{let s=r.split(/[:\s=]+/);return s.length>1?`${s[0]}: [REDACTED]`:"[REDACTED]"});return e}function Dt(t){let e=t.trim();return e?ru(e)?{content:"",filtered:!0,reason:"noise"}:{content:su(e),filtered:!1}:{content:"",filtered:!0,reason:"empty"}}function at(t){let e={};for(let[n,r]of Object.entries(t))if(typeof r=="string"){let s=Dt(r);s.filtered||(e[n]=s.content)}else r&&typeof r=="object"&&!Array.isArray(r)?e[n]=at(r):Array.isArray(r)?e[n]=r.map(s=>{if(typeof s=="string"){let o=Dt(s);return o.filtered?null:o.content}return s&&typeof s=="object"?at(s):s}).filter(s=>s!==null):e[n]=r;return e}function Qr(t){let e=typeof t.type=="string"?t.type.toLowerCase():"";if(e.includes("system")||e.includes("ephemeral")||e==="tool_call"&&!t.result)return!0;if(t.data&&typeof t.data=="object"){let n=t.data,r=typeof n.content=="string"?n.content:"";if(r&&Dt(r).filtered)return!0}return!1}function os(){try{let e=iu("opencode",["db","path"],{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:5e3}).trim();if(e)return e}catch{}if(process.env.OPENCODE_DB)return process.env.OPENCODE_DB;let t=process.env.XDG_DATA_HOME??Zr(au(),".local","share");return Zr(t,"opencode","opencode.db")}function x(t){return typeof t=="string"?t:""}function ne(t){if(typeof t=="number"&&Number.isFinite(t))return t;if(typeof t=="bigint")return Number(t);if(typeof t=="string"){let e=Number(t);if(Number.isFinite(e))return e}return 0}function ut(t){if(t&&typeof t=="object"&&!Buffer.isBuffer(t))return t;if(typeof t!="string")return{};try{let e=JSON.parse(t);if(e&&typeof e=="object"&&!Array.isArray(e))return e}catch{}return{}}function ie(t){let e=ne(t);if(e<=0)return new Date().toISOString();e<1e11&&(e*=1e3);let n=new Date(e);return Number.isNaN(n.getTime())?new Date().toISOString():n.toISOString()}function ct(t,e){if(!e)return!1;let n=es(t),r=es(e);if(n===r)return!0;let s=uu(n,r);return s!==""&&s!==".."&&!s.startsWith(`..${process.platform==="win32"?"\\":"/"}`)&&!cu(s)}function ts(t){if(!t)return{time:-1,id:""};try{let e=JSON.parse(t);return{time:typeof e.time=="number"?e.time:-1,id:typeof e.id=="string"?e.id:""}}catch{return{time:-1,id:""}}}function ns(t){return JSON.stringify(t)}function is(t){if(!ou(t))throw new Error(`OpenCode database not found: ${t}`);let e=new lu(t,{readOnly:!0});return e.exec("PRAGMA query_only = ON"),e.exec("PRAGMA busy_timeout = 3000"),e}function du(t,e){let n=t.prepare(`
      SELECT *
      FROM "session"
      WHERE id = ?
      LIMIT 1
      `).get(e);if(!n)throw new Error(`OpenCode session not found: ${e}`);return n}function as(t,e,n){let r=x(e.directory);if(r&&ct(n.rootPath,r))return!0;let s=x(e.project_id);if(s){try{let o=t.prepare(`
          SELECT *
          FROM "project"
          WHERE id = ?
          LIMIT 1
          `).get(s);if(o)for(let i of["worktree","directory","path"]){let a=x(o[i]);if(a&&ct(n.rootPath,a))return!0}}catch{}try{if(t.prepare(`
          SELECT directory
          FROM "project_directory"
          WHERE project_id = ?
          `).all(s).some(i=>ct(n.rootPath,x(i.directory))))return!0}catch{}}try{let o=t.prepare(`
        SELECT data
        FROM "message"
        WHERE session_id = ?
        ORDER BY time_created DESC
        LIMIT 20
        `).all(x(e.id));for(let i of o){let a=ut(i.data),c=a.path&&typeof a.path=="object"?a.path:{};for(let u of[x(c.cwd),x(c.root)])if(u&&ct(n.rootPath,u))return!0}}catch{}return!1}function rs(t,e,n,r){let s=`
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
    `;return t.prepare(s).all(n,r.time,r.time,r.id)}function ss(t,e){let n=t[t.length-1];return n?{time:ne(n.__clock),id:x(n.id)}:e}function pu(t,e){let n=ut(e.data),r=x(n.role),s=ne(e.__clock),o=x(e.id),i="message";return r==="user"?i="user_prompt":r==="assistant"&&(i="assistant_message"),{clock:s,order:0,event:{type:i,timestamp:ie(s),role:r||void 0,sourceEventId:`message:${o}:${s}`,sourceSequence:`${s}:${o}`,data:{messageId:o,...n},provenance:{source:"opencode",sourcePath:t,sourceTable:"message",sourceRowId:o,sourceOffset:`${s}:${o}`}}}}function mu(t){let e={...t},n=t.state&&typeof t.state=="object"&&!Array.isArray(t.state)?{...t.state}:void 0;if(n){let r=n.output;if(typeof r=="string"){let s=r.replace(/\r\n/g,`
`),o=500;n.outputSummary=s.length<=o?s:`${s.slice(0,350)}
...[ToolNet truncated ${s.length-o} chars]...
${s.slice(-150)}`,delete n.output}else r!==void 0&&(n.outputSummary="[non-text tool output omitted]",delete n.output);if(n.input&&typeof n.input=="object"&&!Array.isArray(n.input)){let s={...n.input};for(let[o,i]of Object.entries(s))typeof i=="string"&&i.length>1e3&&(s[o]=`${i.slice(0,1e3)}...[ToolNet truncated]`);n.input=s}e.state=n}return e}function fu(t,e){let n=x(e.message_id);if(n)try{let r=t.prepare(`
        SELECT data
        FROM "message"
        WHERE id = ?
        LIMIT 1
        `).get(n);if(!r)return;let s=ut(r.data);return x(s.role)||void 0}catch{return}}function gu(t,e,n){let r=ut(n.data),s=x(r.type),o=ne(n.__clock),i=x(n.id),a=x(n.message_id),c=fu(t,n),u="message_part";return s==="tool"?u="tool_call":s==="snapshot"&&(u="artifact"),{clock:o,order:1,event:{type:u,timestamp:ie(o),role:c,sourceEventId:`part:${i}:${o}`,sourceSequence:`${o}:${i}`,data:{partId:i,messageId:a,...s==="tool"?mu(r):r},provenance:{source:"opencode",sourcePath:e,sourceTable:"part",sourceRowId:i,sourceOffset:`${o}:${i}`}}}}async function zt(t){let e=t.dbPath??os(),n=is(e);try{let r=du(n,t.nativeSessionId);if(!as(n,r,t.project))throw new Error(["OpenCode session does not belong to current ToolNet project.",`Session: ${t.nativeSessionId}`,`Project: ${t.project.rootPath}`,`Session directory: ${x(r.directory)||"unknown"}`].join(" "));let s=new it({project:t.project,storage:t.storage,agent:"opencode",nativeSessionId:t.nativeSessionId,title:x(r.title)||void 0,metadata:{source:"opencode.db",openCodeProjectId:x(r.project_id)||void 0,directory:x(r.directory)||void 0},eventContext:{source:"opencode",cwd:x(r.directory)||t.project.rootPath}}),o=s.status(),i=ts(o.sourceCursors["opencode.message"]),a=ts(o.sourceCursors["opencode.part"]),c=rs(n,"message",t.nativeSessionId,i),u=rs(n,"part",t.nativeSessionId,a),p=[];if(o.lastSequence===0){let y=ne(r.time_created);p.push({clock:y,order:-1,event:{type:"session_start",timestamp:ie(y),sourceEventId:`session:${t.nativeSessionId}:created:${y}`,data:{title:x(r.title)||void 0,directory:x(r.directory)||void 0,openCodeProjectId:x(r.project_id)||void 0},provenance:{source:"opencode",sourcePath:e,sourceTable:"session",sourceRowId:t.nativeSessionId}}})}p.push(...c.map(y=>pu(e,y))),p.push(...u.map(y=>gu(n,e,y)));let l=ne(r.time_updated)||ne(r.time_created);t.compacted&&p.push({clock:l,order:98,event:{type:"session_compact",timestamp:ie(l),sourceEventId:`session:${t.nativeSessionId}:compact:${l}`,data:{},provenance:{source:"opencode"}}}),t.error?p.push({clock:l,order:99,event:{type:"error",timestamp:ie(l),sourceEventId:`session:${t.nativeSessionId}:error:${l}`,data:{source:"session.error"},provenance:{source:"opencode"}}}):t.idle&&p.push({clock:l,order:100,event:{type:"session_idle",timestamp:ie(l),sourceEventId:`session:${t.nativeSessionId}:idle:${l}`,data:{},provenance:{source:"opencode"}}}),p.sort((y,k)=>y.clock-k.clock||y.order-k.order);let m=p.filter(y=>!Qr(y.event.data)).map(y=>({...y,event:{...y.event,data:at(y.event.data)}})),d=s.recordMany(m.map(y=>y.event)),g=ss(c,i),S=ss(u,a);if(s.setSourceCursor("opencode.message",ns(g)),s.setSourceCursor("opencode.part",ns(S)),m.length>0)try{let y=m.map(A=>JSON.stringify(A.event.data)),k=$e(y,t.nativeSessionId);s.setSourceCursor("opencode.session.summary",k.summary),s.setSourceCursor("opencode.session.facts_count",k.durableFacts.length),xn()&&!In()&&s.setSourceCursor("opencode.raw_transcript.archived","local")}catch{}if(t.localOnly){let y=s.status();return{nativeSessionId:t.nativeSessionId,importedMessages:c.length,importedParts:u.length,recordedEvents:d.length,eventCount:y.lastSequence,chunkCount:0,status:y.status,durability:"local"}}let h=await s.flush();return{nativeSessionId:t.nativeSessionId,importedMessages:c.length,importedParts:u.length,recordedEvents:d.length,eventCount:h.eventCount,chunkCount:h.chunkCount,status:h.status,durability:"remote"}}finally{n.close()}}async function cs(t){let e=t.dbPath??os(),n=is(e),r=[];try{let o=n.prepare(`
        SELECT *
        FROM "session"
        ORDER BY
          COALESCE(
            time_updated,
            time_created,
            0
          ) DESC
        `).all();for(let i of o){if(!as(n,i,t.project))continue;let a=x(i.id);if(a&&r.push(a),r.length>=(t.limit??100))break}}finally{n.close()}let s=[];for(let o of r)s.push(await zt({project:t.project,storage:t.storage,nativeSessionId:o,dbPath:e}));return s}import{existsSync as Su,mkdirSync as ms,readFileSync as ku,writeFileSync as fs}from"node:fs";import{join as vu}from"node:path";import{homedir as yu}from"node:os";import{join as lt}from"node:path";function dt(t={}){let e=t.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return e?lt(e,"opencode"):lt(t.home??yu(),".config","opencode")}function us(t={}){return lt(dt(t),"plugins")}function ls(t={}){return lt(dt(t),"AGENTS.md")}var hu="memory_agent_ask";function ds(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${hu}

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

Preferred mode:

- mode="local"
  for direct factual questions such as:
  current task, last file, blocker, completed TODOs.

- mode="ai"
  for composite or ambiguous continuity questions
  that benefit from ToolNet Memory Agent reasoning.

Do NOT call it automatically when:

- Normal startup context already gives enough information.
- The question is unrelated to previous project work.
- The answer is obvious from current repository evidence.

Rules:

- Never invent previous work.
- Current repository evidence overrides stale memory.
- NEVER reconstruct previous work by reading ToolNet internal session files.
- NEVER read/list/search .toolnet/sessions/**, session state.json,
  events.jsonl, or raw transcripts to discover previous-agent state.
- Do not search the filesystem for the implementation/schema of
  memory_agent_ask. Invoke the MCP tool directly when deeper
  continuity is required.
- Do not dump raw transcripts or full memory.
- After receiving the ToolNet answer, continue the task
  instead of asking the user to repeat known context.
- If ToolNet says information is not recorded, say so.
`.trim()}var ps="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",qt="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function wu(){let t=ls();ms(dt(),{recursive:!0});let e=`${ps}
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


${ds()}

${qt}`,n=Su(t)?ku(t,"utf8"):"",r=n.indexOf(ps),s=n.indexOf(qt);return r>=0&&s>=r?n=n.slice(0,r)+e+n.slice(s+qt.length):(n=n.trimEnd(),n&&(n+=`

`),n+=e),fs(t,n.trimEnd()+`
`,{encoding:"utf8",mode:384}),t}function gs(t={}){let e=t.directory??us();ms(e,{recursive:!0}),wu();let n=vu(e,"toolnet-memory.js"),r=t.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",s=`
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
  ${JSON.stringify(r)}

const CONTEXT_MAX_TOKENS = 700

const CONTEXT_CACHE_MS = 5000

const LOCAL_CAPTURE_MS = 15000

const REMOTE_SYNC_MS = 60000

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

    if (
      parent === current
    ) {
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

    for (
      const timer of [
        localPeriodic,
        remotePeriodic,
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

        if (
          event.type ===
          "session.idle"
        ) {
          await queueCapture(
            sessionId,
            "--idle",
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
      },

      /*
       * VERIFIED on OpenCode 1.18.14:
       * this hook fires on real model turns.
       *
       * It remains experimental, therefore
       * AGENTS.md + MCP stay as fallbacks.
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

          if (
            Array.isArray(
              output?.system
            )
          ) {
            output.system.push(
              context
            )

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
                    "\\n\\n" +
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
       */
      dispose: async () => {
        clearInterval(
          localPeriodic
        )

        clearInterval(
          remotePeriodic
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
         */
        if (
          lastSessionId
        ) {
          await queueCapture(
            lastSessionId,
            "--idle",
            "dispose:capture"
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
`;return fs(n,s.trimStart(),{encoding:"utf8",mode:384}),n}import{existsSync as Vf,mkdirSync as ju,readFileSync as Jf,writeFileSync as Iu}from"node:fs";import{dirname as Au,join as hs}from"node:path";function Bt(t){if(!t)return 0;let e=Array.from(t).length,n=t.trim().split(/\s+/u).filter(Boolean).length;return Math.ceil(Math.max(e/3.5,n*1.3))}function j(t,e){let n=t.replace(/\s+/g," ").trim();return n.length<=e?n:n.slice(0,Math.max(0,e-1)).trimEnd()+"\u2026"}function bu(t){let e=[],n=!1;for(let r of t.split(/\r?\n/u)){let s=r.trim();if(s.includes("<!--")&&(n=!0),n){s.includes("-->")&&(n=!1);continue}let o=s.toLowerCase();if(!(!s||s.startsWith("#")||s==="```"||o.startsWith("- [enforce]")||o.startsWith("* [enforce]")||o.startsWith("- [advisory]")||o.startsWith("* [advisory]"))&&(s=s.replace(/^[-*]\s+/u,""),s&&e.push(j(s,280)),e.length>=16))break}return e}function xu(t){let e=[],n=[];for(let r of t.split(/\\r?\\n/u)){let s=r.trim(),o=s.toLowerCase(),a=["- [enforce]","* [enforce]","- [advisory]","* [advisory]"].find(u=>o.startsWith(u));if(!a)continue;let c=s.slice(a.length).trim();c&&(a.includes("enforce")?e.push(c):n.push(c))}return{enforce:e,advisory:n}}function Cu(t,e){let n=[];for(let r of t){let s=[...n,r].join(`
`);if(Bt(s)<=e){n.push(r);continue}let o=Bt(n.join(`
`)),i=Math.max(0,e-o);if(i>=16){let a=Math.floor(i*3.2),c=j(r,a);c&&n.push(c)}break}return n.join(`
`).trim()}async function ys(t){let e=Math.max(256,Math.min(2e3,t.maxTokens??1e3)),n=nt(t.project,!1),r=n?.content??"";r||(r=await t.storage.getText(`projects/${t.project.id}/project/manual.md`)??"");let s=xu(r),o=n?n.rules.filter(d=>d.mode==="enforce").map(d=>d.text):s.enforce,i=n?n.rules.filter(d=>d.mode==="advisory").map(d=>d.text):s.advisory,a=r?bu(r):[],c=await Xe(t.project,t.storage),u=await Ir(t.project,t.storage),p=await zr(t.project,t.storage),l=[];if(l.push("[TOOLNET PROJECT CONTEXT]"),l.push(`Project: ${t.project.name}`),l.push("Continue existing project state. Do not restart completed work unless evidence shows it is necessary."),r&&l.push(`Full operating manual: ${tt(t.project)}`),o.length){l.push("","PROJECT RULES \u2014 MUST FOLLOW");for(let d of o.slice(0,24))l.push(`- [ENFORCE] ${j(d,240)}`)}if(i.length){l.push("","PROJECT PREFERENCES");for(let d of i.slice(0,10))l.push(`- ${j(d,220)}`)}if(u&&(u.mission&&l.push("","MISSION",j(u.mission.value,420)),u.activeObjective&&l.push("","CURRENT OBJECTIVE",j(u.activeObjective.value,420)),u.why&&l.push("","WHY THIS WORK MATTERS",j(u.why.value,420)),u.desiredOutcome&&l.push("","DESIRED OUTCOME",j(u.desiredOutcome.value,420)),u.planRationale&&l.push("","WHY THIS APPROACH",j(u.planRationale.value,420))),c){if(l.push("","ACTIVE WORK"),c.goal&&l.push(`Goal: ${j(c.goal,320)}`),c.plan&&l.push(`Plan: ${j(c.plan,320)}`),l.push(`Progress: phases ${c.progress.phasesCompleted}/${c.progress.phasesTotal}; tasks ${c.progress.tasksCompleted}/${c.progress.tasksTotal}; blocked ${c.progress.blocked}`),c.currentPhase&&l.push(`Current phase: ${c.currentPhase.title} [${c.currentPhase.status}]`),c.currentPhase&&u){let d=u.phases.find(g=>g.order===c.currentPhase?.order);d&&(d.objective&&l.push(`Phase objective: ${j(d.objective.value,340)}`),d.why?l.push(`Why this phase: ${j(d.why.value,340)}`):l.push("Why this phase: not explicitly recorded. Inspect existing implementation before assuming intent."),d.deliverable&&l.push(`Deliverable: ${j(d.deliverable.value,340)}`),d.dependencies.length&&l.push(`Depends on: ${d.dependencies.slice(0,4).map(g=>j(g.value,180)).join("; ")}`),d.acceptanceCriteria.length&&(l.push("","DEFINITION OF DONE"),d.acceptanceCriteria.slice(0,6).forEach(g=>{l.push(`- ${j(g.value,260)}`)})),d.openQuestions.length&&(l.push("","OPEN QUESTIONS FOR CURRENT PHASE"),d.openQuestions.slice(0,4).forEach(g=>{l.push(`- ${j(g.value,260)}`)})))}c.currentTask&&l.push(`Current task: ${c.currentTask.title} [${c.currentTask.status}]`),c.nextActions.length&&(l.push("","NEXT ACTIONS"),c.nextActions.slice(0,6).forEach((d,g)=>{l.push(`${g+1}. ${j(d,260)}`)})),c.blockers.length&&(l.push("","BLOCKERS"),c.blockers.slice(0,5).forEach(d=>{l.push(`- ${j(d,260)}`)})),c.warnings.length&&(l.push("","ATTENTION"),c.warnings.slice(-5).forEach(d=>{l.push(`- ${j(d,260)}`)})),c.decisions.length&&(l.push("","RECENT DECISIONS"),c.decisions.slice(-5).forEach(d=>{l.push(`- ${j(d,260)}`)})),c.lastSession&&l.push("",`Last work session: ${c.lastSession.agent} / ${c.lastSession.nativeSessionId}`)}if(u&&u.openQuestions.length&&(l.push("","UNRESOLVED QUESTIONS"),u.openQuestions.slice(0,5).forEach(d=>{l.push(`- ${j(d.value,260)}`)})),p&&l.push(`Latest handoff: ${p.reason} / ${p.sourceSession.agent}`),a.length){l.push("","OPERATING NOTES");for(let d of a)l.push(`- ${d}`)}l.push("","Before changing anything: verify the current repository state and continue from the active phase/task above.");let m=Cu(l,e);return{version:1,projectId:t.project.id,projectName:t.project.name,text:m,estimatedTokens:Bt(m),maxTokens:e,hasManual:!!r,hasWorkState:!!c,hasHandoff:!!p,generatedAt:new Date().toISOString()}}function Eu(t){return hs(t.rootPath,".toolnet","context","startup.md")}function Pu(t){return hs(t.rootPath,".toolnet","context","startup.json")}function Tu(t,e){let n=Eu(t);ju(Au(n),{recursive:!0}),Iu(n,e.text.endsWith(`
`)?e.text:e.text+`
`,{encoding:"utf8",mode:384}),R(Pu(t),e)}async function Ss(t,e,n=800){let s=(await ys({project:t,storage:e,maxTokens:n})).text;Ne(s)>n&&(s=_e(s,n),s+=`

[Context trimmed by ToolNet Memory token budget]
`);let i={version:1,projectId:t.id,projectName:t.name,text:s,digest:v(s),estimatedTokens:Ne(s),generatedAt:new Date().toISOString()};return Tu(t,i),await e.put(`projects/${t.id}/context/startup.md`,i.text+`
`,"text/markdown"),await e.put(`projects/${t.id}/context/startup.json`,JSON.stringify(i,null,2)+`
`,"application/json"),i}function pt(t,e){let n=t.indexOf(e);if(!(n<0))return t[n+1]}function mt(t,e){return t.includes(e)}function Mu(t){let e=Ce(),n=tn(Zt({provider:e.storage.provider,huggingface:e.storage.huggingface,localRoot:e.storage.localRoot}),{attempts:3});return new Te(n,t.id,t.name,t.remote??t.name)}async function Ou(){let[t="help",...e]=process.argv.slice(2);if(t==="install-plugin"){let i=gs({binary:pt(e,"--bin")});console.log(`\u2705 OpenCode plugin installed: ${i}`),console.log("OpenCode will load it automatically on next start.");return}let n=pt(e,"--project")??process.cwd(),r=new Ie().detect(n),s=Mu(r),o=pt(e,"--db");if(t==="sync"){let i=e.find(m=>!m.startsWith("--")&&m!==n&&m!==o);if(!i)throw new Error("Usage: session:opencode-sync <session-id>");let a=mt(e,"--idle"),c=mt(e,"--error"),u=mt(e,"--compacted"),p=mt(e,"--local-only"),l=await zt({project:r,storage:s,nativeSessionId:i,dbPath:o,idle:a,error:c,compacted:u,localOnly:p});if(!p&&(a||u||c))try{await Ss(r,s,800)}catch{}console.log(JSON.stringify(l,null,2));return}if(t==="recover"){let i=pt(e,"--limit"),a=i?Number(i):100,c=await cs({project:r,storage:s,dbPath:o,limit:Number.isFinite(a)?a:100});console.log(JSON.stringify({project:r.name,sessions:c.length,importedMessages:c.reduce((u,p)=>u+p.importedMessages,0),importedParts:c.reduce((u,p)=>u+p.importedParts,0)},null,2));return}console.log(`OpenCode Session Adapter

Commands:
  sync <session-id> [--project PATH] [--idle] [--local-only]
  recover [--project PATH] [--limit N]
  install-plugin [--bin PATH]
`)}Ou().catch(t=>{console.error(t instanceof Error?t.message:t),process.exit(1)});
