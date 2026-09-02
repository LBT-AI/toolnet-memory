import{existsSync as pe,readFileSync as vs}from"node:fs";import{join as bd}from"node:path";import{spawnSync as vn}from"node:child_process";import{existsSync as ws,readFileSync as bs}from"node:fs";import{homedir as xs}from"node:os";import{join as Cs}from"node:path";function js(e){let t=e.trim();return t.length>=2&&t.startsWith('"')&&t.endsWith('"')?(t=t.slice(1,-1),t.replace(/\\n/g,`
`).replace(/\\r/g,"\r").replace(/\\t/g,"	").replace(/\\"/g,'"').replace(/\\\\/g,"\\")):t.length>=2&&t.startsWith("'")&&t.endsWith("'")?t.slice(1,-1):t}function Is(){let e=process.env.TOOLNET_GLOBAL_ENV??Cs(xs(),".config","toolnet-memory",".env");if(!ws(e))return;let t=bs(e,"utf8");for(let n of t.split(/\r?\n/)){let r=n.trim();if(!r||r.startsWith("#"))continue;r.startsWith("export ")&&(r=r.slice(7));let o=r.indexOf("=");if(o<=0)continue;let s=r.slice(0,o).trim();/^[A-Za-z_][A-Za-z0-9_]*$/.test(s)&&process.env[s]===void 0&&(process.env[s]=js(r.slice(o+1)))}}Is();function he(e,t){return e===void 0?t:["1","true","yes","on"].includes(e.toLowerCase())}function Se(e,t){if(!e)return t;let n=Number(e);return Number.isFinite(n)?n:t}function De(){return{memory:{autoCapture:he(process.env.MEMORY_AUTO_CAPTURE,!0),autoRetrieve:he(process.env.MEMORY_AUTO_RETRIEVE,!0),autoSummarize:he(process.env.MEMORY_AUTO_SUMMARIZE,!0),autoSync:he(process.env.MEMORY_AUTO_SYNC,!0)},retrieval:{maxCandidates:Se(process.env.MEMORY_MAX_CANDIDATES,50),rerankTop:Se(process.env.MEMORY_RERANK_TOP,10),finalContext:Se(process.env.MEMORY_FINAL_CONTEXT,5),tokenBudget:Se(process.env.MEMORY_TOKEN_BUDGET,2e3)},storage:{provider:process.env.MEMORY_STORAGE_PROVIDER??"huggingface",r2:{accountId:process.env.R2_ACCOUNT_ID,bucket:process.env.R2_BUCKET,accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY},s3:{endpoint:process.env.S3_ENDPOINT,region:process.env.S3_REGION,bucket:process.env.S3_BUCKET,accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY,forcePathStyle:he(process.env.S3_FORCE_PATH_STYLE,!1)},huggingface:{namespace:process.env.HF_NAMESPACE,bucket:process.env.HF_BUCKET,accessKeyId:process.env.HF_S3_ACCESS_KEY_ID,secretAccessKey:process.env.HF_S3_SECRET_ACCESS_KEY},localRoot:process.env.MEMORY_LOCAL_STORAGE_PATH},cache:{maxMb:Se(process.env.MEMORY_LOCAL_CACHE_MB,200)}}}import{createHash as Ms}from"node:crypto";import{existsSync as $t,mkdirSync as Es,readFileSync as As,renameSync as Ps,writeFileSync as Os}from"node:fs";import{basename as Ts,dirname as ze,join as Be,parse as Cn,resolve as ke}from"node:path";var jn=".toolnet",Rs="project.json";function Ns(e){return Ms("sha256").update(e).digest("hex").slice(0,16)}function Lt(e){return Be(e,jn,Rs)}function _s(e){return $t(Lt(e))}function $s(e,t){let n=ke(e),r=Cn(n).root;for(;;){if(_s(n))return n;if(n===r||t&&n===ke(t))break;let o=ze(n);if(o===n)break;n=o}return null}function Ls(e){let t=ke(e),n=Cn(t).root,r=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"];for(;;){if(r.some(s=>$t(Be(t,s))))return t;if(t===n)break;let o=ze(t);if(o===t)break;t=o}return ke(e)}function Fs(e){let t;try{t=JSON.parse(As(e,"utf8"))}catch(o){throw new Error(`Invalid ToolNet project manifest: ${e}: ${o instanceof Error?o.message:String(o)}`)}if(!t||typeof t!="object")throw new Error(`Invalid ToolNet project manifest: ${e}`);let n=t;if(typeof n.id!="string"||!n.id.trim())throw new Error(`ToolNet project manifest is missing id: ${e}`);if(typeof n.name!="string"||!n.name.trim())throw new Error(`ToolNet project manifest is missing name: ${e}`);let r=new Date().toISOString();return{version:1,id:n.id,name:n.name,remote:typeof n.remote=="string"&&n.remote.trim()?n.remote:n.name,rootPath:typeof n.rootPath=="string"?n.rootPath:ze(ze(e)),createdAt:typeof n.createdAt=="string"?n.createdAt:r,updatedAt:typeof n.updatedAt=="string"?n.updatedAt:r,graphVersion:typeof n.graphVersion=="number"?n.graphVersion:0,memoryVersion:typeof n.memoryVersion=="number"?n.memoryVersion:0,metadata:n.metadata&&typeof n.metadata=="object"?n.metadata:void 0}}function bn(e,t){let n=Be(e,jn);Es(n,{recursive:!0});let r=Lt(e),o=`${r}.tmp-${process.pid}`;Os(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Ps(o,r)}function xn(e,t){return{id:e.id,name:e.name,remote:e.remote,rootPath:t,createdAt:e.createdAt,updatedAt:e.updatedAt,graphVersion:e.graphVersion,memoryVersion:e.memoryVersion,metadata:e.metadata}}var qe=class{detect(t=process.cwd()){let n=ke(t),r=Ls(n),s=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(p=>$t(Be(r,p))),i=$s(n,s?r:void 0);if(i){let p=Lt(i),l=Fs(p);return l.rootPath!==i&&(l.rootPath=i,l.updatedAt=new Date().toISOString(),bn(i,l)),xn(l,i)}let a=new Date().toISOString(),u=Ts(r),c={version:1,id:Ns(r),name:u,remote:u,rootPath:r,createdAt:a,updatedAt:a,graphVersion:0,memoryVersion:0};return bn(r,c),xn(c,r)}};var Ks=[{type:"openai_key",regex:/\bsk-[A-Za-z0-9_\-]{20,}\b/g},{type:"huggingface_token",regex:/\bhf_[A-Za-z0-9]{20,}\b/g},{type:"hf_s3_access_key",regex:/\bHFAK[A-Za-z0-9]{8,}\b/g},{type:"bearer_token",regex:/\bBearer\s+[A-Za-z0-9._\-]{16,}\b/gi},{type:"jwt",regex:/\beyJ[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\b/g},{type:"private_key",regex:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g},{type:"password_assignment",regex:/\b(password|passwd|pwd)\s*[:=]\s*["']?[^"'\s]{6,}["']?/gi},{type:"secret_assignment",regex:/\b(secret|api[_-]?key|access[_-]?token|refresh[_-]?token)\s*[:=]\s*["']?[^"'\s]{8,}["']?/gi},{type:"cookie",regex:/\b(cookie|set-cookie)\s*[:=]\s*[^;\n]{8,}/gi}],Je=class{scan(t){let n=[];for(let r of Ks){let o=new RegExp(r.regex.source,r.regex.flags);for(let s of t.matchAll(o))n.push({type:r.type,value:s[0]})}return n}hasSecrets(t){return this.scan(t).length>0}};var U=class{scanner=new Je;sanitize(t){let n=t,r=this.scanner.scan(t),o=new Set;for(let s of r)o.add(s.type),n=n.split(s.value).join(`[REDACTED:${s.type}]`);return{text:n,redacted:r.length,secretTypes:[...o]}}sanitizeValue(t){if(typeof t=="string")return this.sanitize(t).text;if(Array.isArray(t))return t.map(n=>this.sanitizeValue(n));if(t&&typeof t=="object"){let n={};for(let[r,o]of Object.entries(t)){let s=r.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g,"");s.includes("password")||s.includes("passwd")||s==="pwd"||s.includes("secret")||s.includes("token")||s.includes("cookie")||s.includes("authorization")||s.includes("apikey")||s.includes("accesskey")||s.includes("privatekey")||s.includes("clientsecret")||s.includes("credential")?n[r]="[REDACTED]":n[r]=this.sanitizeValue(o)}return n}return t}};import{homedir as ci}from"node:os";import{join as ui}from"node:path";import{DeleteObjectCommand as Ws,GetObjectCommand as Ds,HeadObjectCommand as zs,ListObjectsV2Command as qs,PutObjectCommand as Bs,S3Client as Js}from"@aws-sdk/client-s3";import{getSignedUrl as Vs}from"@aws-sdk/s3-request-presigner";var Ve=class{name="huggingface";client;bucket;constructor(t){this.bucket=t.bucket,this.client=new Js({region:"us-east-1",endpoint:`https://s3.hf.co/${t.namespace}`,forcePathStyle:!0,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:t.accessKeyId,secretAccessKey:t.secretAccessKey}})}async put(t,n,r="application/octet-stream"){let o=typeof n=="string"?Buffer.from(n,"utf8"):n;await this.client.send(new Bs({Bucket:this.bucket,Key:t,Body:o,ContentType:r}))}async get(t){let n=await Vs(this.client,new Ds({Bucket:this.bucket,Key:t}),{expiresIn:60}),r=await fetch(n,{redirect:"follow"});if(r.status===404)return null;if(!r.ok)throw new Error(`HF download failed: ${r.status} ${r.statusText}`);return new Uint8Array(await r.arrayBuffer())}async getText(t){let n=await this.get(t);return n?Buffer.from(n).toString("utf8"):null}async exists(t){try{return await this.client.send(new zs({Bucket:this.bucket,Key:t})),!0}catch(n){if(typeof n=="object"&&n!==null&&"$metadata"in n&&n.$metadata?.httpStatusCode===404)return!1;throw n}}async delete(t){await this.client.send(new Ws({Bucket:this.bucket,Key:t}))}async list(t=""){let n=[],r;do{let o=await this.client.send(new qs({Bucket:this.bucket,Prefix:t||void 0,ContinuationToken:r}));for(let s of o.Contents??[])s.Key&&n.push({key:s.Key,size:s.Size,updatedAt:s.LastModified?.toISOString()});r=o.IsTruncated?o.NextContinuationToken:void 0}while(r);return n}};import{access as In,mkdir as Hs,readFile as Gs,readdir as Us,rm as Ys,stat as Mn,writeFile as Xs}from"node:fs/promises";import{dirname as Qs,join as Zs,relative as En,resolve as ei}from"node:path";var ve=class{constructor(t){this.root=t}root;name="local";path(t){let n=t.replace(/^\/+/,"");return ei(this.root,n)}async put(t,n){let r=this.path(t);await Hs(Qs(r),{recursive:!0}),await Xs(r,n)}async get(t){try{return await Gs(this.path(t))}catch(n){if(typeof n=="object"&&n!==null&&"code"in n&&n.code==="ENOENT")return null;throw n}}async getText(t){let n=await this.get(t);return n?Buffer.from(n).toString("utf8"):null}async exists(t){try{return await In(this.path(t)),!0}catch{return!1}}async delete(t){await Ys(this.path(t),{force:!0})}async list(t=""){let n=this.path(t),r=[];try{await In(n)}catch{return r}let o=async i=>{let a=await Us(i,{withFileTypes:!0});for(let u of a){let c=Zs(i,u.name);if(u.isDirectory()){await o(c);continue}let p=await Mn(c);r.push({key:En(this.root,c),size:p.size,updatedAt:p.mtime.toISOString()})}},s=await Mn(n);return s.isDirectory()?await o(n):r.push({key:En(this.root,n),size:s.size,updatedAt:s.mtime.toISOString()}),r}};import{DeleteObjectCommand as ti,GetObjectCommand as ni,HeadObjectCommand as ri,ListObjectsV2Command as oi,PutObjectCommand as si,S3Client as ii}from"@aws-sdk/client-s3";import{getSignedUrl as ai}from"@aws-sdk/s3-request-presigner";var we=class{name;client;bucket;constructor(t){this.name=t.name??"s3",this.bucket=t.bucket,this.client=new ii({region:t.region??"us-east-1",endpoint:t.endpoint||void 0,forcePathStyle:t.forcePathStyle??!1,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:t.accessKeyId,secretAccessKey:t.secretAccessKey}})}async put(t,n,r="application/octet-stream"){let o=typeof n=="string"?Buffer.from(n,"utf8"):n;await this.client.send(new si({Bucket:this.bucket,Key:t,Body:o,ContentType:r}))}async get(t){let n=await ai(this.client,new ni({Bucket:this.bucket,Key:t}),{expiresIn:60}),r=await fetch(n,{redirect:"follow"});if(r.status===404)return null;if(!r.ok)throw new Error(`${this.name} download failed: ${r.status} ${r.statusText}`);return new Uint8Array(await r.arrayBuffer())}async getText(t){let n=await this.get(t);return n?Buffer.from(n).toString("utf8"):null}async exists(t){try{return await this.client.send(new ri({Bucket:this.bucket,Key:t})),!0}catch(n){if(typeof n=="object"&&n!==null&&"$metadata"in n&&n.$metadata?.httpStatusCode===404)return!1;throw n}}async delete(t){await this.client.send(new ti({Bucket:this.bucket,Key:t}))}async list(t=""){let n=[],r;do{let o=await this.client.send(new oi({Bucket:this.bucket,Prefix:t||void 0,ContinuationToken:r}));for(let s of o.Contents??[])s.Key&&n.push({key:s.Key,size:s.Size,updatedAt:s.LastModified?.toISOString()});r=o.IsTruncated?o.NextContinuationToken:void 0}while(r);return n}};function Ft(e,t){return console.warn(t),new ve(e)}function An(e){let t=e.localRoot??ui(ci(),".toolnet-memory","storage");if(e.provider==="r2"){let n=e.r2;return n?.accountId&&n.bucket&&n.accessKeyId&&n.secretAccessKey?new we({name:"r2",endpoint:`https://${n.accountId}.r2.cloudflarestorage.com`,region:"auto",bucket:n.bucket,forcePathStyle:!0,accessKeyId:n.accessKeyId,secretAccessKey:n.secretAccessKey}):Ft(t,"[storage] Cloudflare R2 credentials missing. Using local fallback.")}if(e.provider==="s3"){let n=e.s3;return n?.bucket&&n.accessKeyId&&n.secretAccessKey?new we({name:"s3",endpoint:n.endpoint,region:n.region??"us-east-1",bucket:n.bucket,forcePathStyle:n.forcePathStyle??!1,accessKeyId:n.accessKeyId,secretAccessKey:n.secretAccessKey}):Ft(t,"[storage] S3 credentials missing. Using local fallback.")}if(e.provider==="huggingface"){let n=e.huggingface;return n?.namespace&&n.bucket&&n.accessKeyId&&n.secretAccessKey?new Ve({namespace:n.namespace,bucket:n.bucket,accessKeyId:n.accessKeyId,secretAccessKey:n.secretAccessKey}):Ft(t,"[storage] Hugging Face credentials missing. Using local fallback.")}return new ve(t)}function li(e){return new Promise(t=>setTimeout(t,e))}async function Pn(e,t={}){let n=Math.max(1,t.attempts??3),r=t.baseDelayMs??150,o=t.maxDelayMs??2e3,s;for(let i=1;i<=n;i++)try{return await e()}catch(a){if(s=a,i>=n)break;let u=Math.min(o,r*2**(i-1)),c=Math.floor(Math.random()*Math.max(1,u*.2));await li(u+c)}throw s}var di=new Set(["put","get","getText","delete","list"]);function On(e,t={}){return new Proxy(e,{get(n,r){let o=Reflect.get(n,r,n);return typeof o!="function"?o:di.has(r)?(...s)=>Pn(()=>Promise.resolve(o.apply(n,s)),t):o.bind(n)}})}function Tn(e){let t=e.trim().replace(/\s+/g,"_").replace(/[^A-Za-z0-9._-]/g,"_").replace(/_+/g,"_").replace(/^\.+|\.+$/g,"").slice(0,100);if(!t||t==="."||t==="..")throw new Error("Invalid project storage folder");return t}function Rn(e){let t=e.replace(/^\/+/,"");if(t.startsWith("memories/"))return"memory/records/"+t.slice(9);if(t.startsWith("vectors/"))return"memory/vectors/"+t.slice(8);if(t.startsWith("graph/"))return"code/graph/"+t.slice(6);let n=t.match(/^(snapshots\/[^/]+\/)memories\/(.+)$/);if(n)return`${n[1]}memory/records/${n[2]}`;if(n=t.match(/^(snapshots\/[^/]+\/)vectors\/(.+)$/),n)return`${n[1]}memory/vectors/${n[2]}`;if(n=t.match(/^(snapshots\/[^/]+\/)graph\/(.+)$/),n)return`${n[1]}code/graph/${n[2]}`;let r=t.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)memories\/(.+)$/);if(r)return`${r[1]}memory/records/${r[2]}`;if(r=t.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)vectors\/(.+)$/),r)return`${r[1]}memory/vectors/${r[2]}`;if(r=t.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)graph\/(.+)$/),r)return`${r[1]}code/graph/${r[2]}`;let o=t.match(/^(projects\/[^/]+\/)memories\/(.+)$/);return o?`${o[1]}memory/records/${o[2]}`:(o=t.match(/^(projects\/[^/]+\/)vectors\/(.+)$/),o?`${o[1]}memory/vectors/${o[2]}`:(o=t.match(/^(projects\/[^/]+\/)graph\/(.+)$/),o?`${o[1]}code/graph/${o[2]}`:t))}var He=class{constructor(t,n,r,o){this.provider=t;this.name=t.name,this.projectId=n,this.projectName=r,this.folder=Tn(o??r),this.sourcePrefix=`projects/${n}`,this.targetPrefix=`projects/${this.folder}`}provider;name;folder;sourcePrefix;targetPrefix;projectId;projectName;registryPromise;async registerProject(){let t=`${this.targetPrefix}/project.json`,n=new Date().toISOString(),r=n,o=await this.provider.getText(t);if(o){let i;try{i=JSON.parse(o)}catch(a){throw new Error(`Invalid remote ToolNet project manifest at ${t}: ${a instanceof Error?a.message:String(a)}`)}if(typeof i.id=="string"&&i.id!==this.projectId)throw new Error(["ToolNet remote project namespace collision.",`Remote folder: ${this.targetPrefix}`,`Existing project id: ${i.id}`,`Current project id: ${this.projectId}`,"Refusing to mix data from two projects."].join(" "));typeof i.createdAt=="string"&&(r=i.createdAt)}let s={version:1,id:this.projectId,name:this.projectName,remote:this.folder,createdAt:r,updatedAt:n};await this.provider.put(t,JSON.stringify(s,null,2)+`
`,"application/json")}async ensureRegistered(){return this.registryPromise||(this.registryPromise=this.registerProject()),this.registryPromise}key(t){if(t=Rn(t),t===this.sourcePrefix)return this.targetPrefix;if(t.startsWith(`${this.sourcePrefix}/`))return this.targetPrefix+t.slice(this.sourcePrefix.length);if(t===this.targetPrefix||t.startsWith(`${this.targetPrefix}/`))return t;if(t.startsWith("projects/"))throw new Error(["Cross-project storage access denied.",`Current project: ${this.targetPrefix}`,`Requested key: ${t}`].join(" "));return t}async put(t,n,r){return await this.ensureRegistered(),this.provider.put(this.key(t),n,r)}async get(t){return await this.ensureRegistered(),this.provider.get(this.key(t))}async getText(t){return await this.ensureRegistered(),this.provider.getText(this.key(t))}async delete(t){return await this.ensureRegistered(),this.provider.delete(this.key(t))}async exists(t){return await this.ensureRegistered(),this.provider.exists(this.key(t))}async list(t){return await this.ensureRegistered(),this.provider.list(this.key(t))}};import{existsSync as Vl}from"node:fs";import{execFileSync as Hl}from"node:child_process";import{homedir as Gl}from"node:os";import{isAbsolute as Ul,join as Uo,relative as Yl,resolve as Yo}from"node:path";import{DatabaseSync as Xl}from"node:sqlite";import{join as Si}from"node:path";import{createHash as pi}from"node:crypto";import{dirname as fi}from"node:path";import{mkdirSync as mi,readFileSync as gi,renameSync as yi,writeFileSync as hi}from"node:fs";function v(e){return pi("sha256").update(e).digest("hex")}function Kt(e){if(Array.isArray(e))return e.map(Kt);if(e&&typeof e=="object"){let t=e,n={};for(let r of Object.keys(t).sort())n[r]=Kt(t[r]);return n}return e}function Nn(e){return JSON.stringify(Kt(e))}function _n(e){try{return JSON.parse(gi(e,"utf8"))}catch{return null}}function R(e,t){mi(fi(e),{recursive:!0});let n=`${e}.${process.pid}.tmp`;hi(n,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),yi(n,e)}function $n(e,t){let n=e.trim(),r=n.replace(/\s+/g,"_").replace(/[^A-Za-z0-9._-]/g,"_").replace(/_+/g,"_").replace(/^\.+|\.+$/g,""),o=v(n).slice(0,12);if(!r||r==="."||r==="..")return`${t}--${o}`;let s=r.slice(0,100);return s===n&&n.length<=100?s:`${s.slice(0,85)}--${o}`}function Ln(e,t,n){let r=t.trim(),o=n.trim();if(!r)throw new Error("Session agent is required");if(!o)throw new Error("Native session ID is required");let s=$n(r.toLowerCase(),"agent"),i=$n(o,"session");return{projectId:e.id,projectName:e.name,projectRoot:e.rootPath,agent:r,nativeSessionId:o,sessionKey:`${r}:${o}`,remotePrefix:["projects",e.id,"runtime","sources",s,i].join("/"),localDirectory:Si(e.rootPath,".toolnet","runtime","sources",s,i)}}function Fn(e){return String(e).padStart(12,"0")}var Ge=class{constructor(t,n=100,r=512*1024){this.storage=t;this.maxEventsPerChunk=n;this.maxChunkBytes=r;if(n<1)throw new Error("maxEventsPerChunk must be positive");if(r<1024)throw new Error("maxChunkBytes is too small")}storage;maxEventsPerChunk;maxChunkBytes;async getJson(t){let n=await this.storage.getText(t);return n?JSON.parse(n):null}async putJson(t,n){await this.storage.put(t,JSON.stringify(n,null,2)+`
`,"application/json")}async scan(t){let n=`${t.remotePrefix}/events/`,r=await this.storage.list(n),o=[],s=0;for(let i of r){let a=i.key.match(/\/events\/(\d+)-(\d+)-[a-f0-9]+\.jsonl$/);if(!a)continue;let u=Number(a[1]),c=Number(a[2]);!Number.isFinite(u)||!Number.isFinite(c)||(o.push({key:i.key,start:u,end:c}),s=Math.max(s,c))}return o.sort((i,a)=>i.start-a.start),{chunks:o,maxSequence:s}}split(t){let n=[],r=[],o=0;for(let s of t){let i=Buffer.byteLength(JSON.stringify(s)+`
`,"utf8");r.length>0&&(r.length>=this.maxEventsPerChunk||o+i>this.maxChunkBytes)&&(n.push(r),r=[],o=0),r.push(s),o+=i}return r.length>0&&n.push(r),n}async loadManifest(t){return this.getJson(`${t.remotePrefix}/session.json`)}async loadCursor(t){return this.getJson(`${t.remotePrefix}/cursor.json`)}async recover(t){let n=await this.scan(t);return{maxSequence:n.maxSequence,chunkCount:n.chunks.length}}async append(t,n,r,o={}){let s=await this.loadManifest(t),i=await this.scan(t),a=n.filter(h=>h.sequence>i.maxSequence),u=0;for(let h of this.split(a)){let y=h[0],k=h[h.length-1],I=h.map(T=>JSON.stringify(T)).join(`
`)+`
`,O=v(I).slice(0,16),P=[t.remotePrefix,"events",`${Fn(y.sequence)}-${Fn(k.sequence)}-${O}.jsonl`].join("/");await this.storage.exists(P)||await this.storage.put(P,I,"application/x-ndjson"),u+=h.length}let c=await this.scan(t),p=n[n.length-1],l=s?.status??"active";p?.type==="session_end"||p?.type==="session_idle"?l="idle":p?.type==="error"?l="error":n.length>0&&(l="active");let f=new Date().toISOString(),d=n[0],g={version:1,projectId:t.projectId,projectName:t.projectName,agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,status:l,createdAt:s?.createdAt??d?.timestamp??f,updatedAt:p?.timestamp??f,firstEventAt:s?.firstEventAt??d?.timestamp,lastEventAt:p?.timestamp??s?.lastEventAt,eventCount:c.maxSequence,chunkCount:c.chunks.length,metadata:{...s?.metadata,...o.metadata}};(o.title??s?.title)&&(g.title=o.title??s?.title);let S={version:1,projectId:t.projectId,agent:t.agent,nativeSessionId:t.nativeSessionId,lastLocalSequence:n.length>0?n[n.length-1].sequence:c.maxSequence,lastRemoteSequence:c.maxSequence,sourceCursors:r,updatedAt:f};return await this.putJson(`${t.remotePrefix}/cursor.json`,S),await this.putJson(`${t.remotePrefix}/session.json`,g),{uploadedEvents:u,lastRemoteSequence:c.maxSequence,eventCount:g.eventCount,chunkCount:g.chunkCount,status:l}}};import{closeSync as Ce,existsSync as Ze,fsyncSync as Ht,mkdirSync as _i,openSync as je,readFileSync as Zn,readSync as $i,rmSync as Yn,statSync as Jt,truncateSync as Li,writeSync as Fi}from"node:fs";import{join as Vt}from"node:path";var ki=new Set(["thinking","reasoning","reasoningcontent","chainofthought","cot","analysistext","internalreasoning","modelthinking"]),vi=new Set(["reasoning","thinking","chain_of_thought","chain-of-thought","internal_reasoning","internal-reasoning"]);function wi(e){return e.toLowerCase().replace(/[^a-z0-9]+/gu,"")}function bi(e){for(let t of["type","kind"]){let n=e[t];if(typeof n=="string"){let r=n.toLowerCase();if(vi.has(r))return n}}return null}function Wt(e,t=0){if(t>12)return"[ToolNet nested value omitted]";if(Array.isArray(e))return e.map(s=>Wt(s,t+1));if(!e||typeof e!="object")return e;let n=e,r=bi(n);if(r)return{type:r,omitted:"[private reasoning omitted]"};let o={};for(let[s,i]of Object.entries(n))ki.has(wi(s))||(o[s]=Wt(i,t+1));return o}function xi(e){if(!e)return new Date().toISOString();let t=new Date(e);return Number.isNaN(t.getTime())?new Date().toISOString():t.toISOString()}function Y(e){return e?.trim()||void 0}function Kn(e,t={}){let n={...e.provenance??{}},r=Y(e.source)??Y(t.source)??Y(n.source);return{...e,timestamp:xi(e.timestamp),source:r,turnId:Y(e.turnId)??Y(t.turnId),cwd:Y(e.cwd)??Y(t.cwd),data:Wt(e.data??{}),provenance:n}}import{randomUUID as Dt}from"node:crypto";import{closeSync as se,existsSync as ie,fsyncSync as be,mkdirSync as zt,openSync as xe,readFileSync as qt,readdirSync as Ci,renameSync as ji,rmSync as Ue,statSync as Ii,writeSync as Ye}from"node:fs";import{join as J}from"node:path";var Mi=12e4,Ei=80,Ai="reconcile-required";function Pi(e){e<=0||Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,e)}function ae(e){return J(e,".toolnet","journal")}function zn(e){return J(ae(e),"events.jsonl")}function Xe(e){return J(ae(e),Ai)}function Oi(e){if(!Number.isInteger(e)||e<=0)return!1;try{return process.kill(e,0),!0}catch(t){return t?.code!=="ESRCH"}}function qn(e){if(!ie(e))return null;try{let t=JSON.parse(qt(e,"utf8"));return t.version!==1||typeof t.token!="string"||typeof t.pid!="number"||typeof t.acquiredAt!="string"?null:{version:1,token:t.token,pid:t.pid,acquiredAt:t.acquiredAt}}catch{return null}}function Ti(e){if(!ie(e))return!1;let t=0;try{t=Date.now()-Ii(e).mtimeMs}catch{return!1}if(t<=Mi)return!1;let n=qn(e);return n?!Oi(n.pid):!0}function Ri(e){if(!Ti(e))return!1;try{return Ue(e,{force:!0}),!0}catch{return!1}}function Bn(e){for(let t=0;t<Ei;t+=1){let n=Dt();try{let r=xe(e,"wx",384),o={version:1,token:n,pid:process.pid,acquiredAt:new Date().toISOString()};try{return Ye(r,`${JSON.stringify(o)}
`,null,"utf8"),be(r),{fd:r,token:n}}catch(s){throw se(r),Ue(e,{force:!0}),s}}catch(r){if(r?.code!=="EEXIST")throw r;if(Ri(e))continue;Pi(25)}}throw new Error(`Shared project journal is locked: ${e}`)}function Jn(e,t){se(t.fd),qn(e)?.token===t.token&&Ue(e,{force:!0})}function Wn(e){if(!ie(e))return[];let t="";try{t=qt(e,"utf8")}catch{return[]}let n=[];for(let r of t.split(/\r?\n/)){let o=r.trim();if(o)try{let s=JSON.parse(o);if(s.version!==1||typeof s.id!="string"||s.id.length===0||typeof s.projectId!="string"||s.projectId.length===0)continue;n.push(s)}catch{}}return n}function Vn(e){if(!ie(e))return[];let t=[];for(let n of Ci(e,{withFileTypes:!0})){let r=J(e,n.name);if(n.isDirectory()){t.push(...Vn(r));continue}n.isFile()&&n.name==="events.jsonl"&&t.push(r)}return t.sort()}function Qe(e){let t=null;try{t=xe(e,"r"),be(t)}catch{}finally{if(t===null)return;se(t)}}function Dn(e){let t=Xe(e);if(!ie(t))return null;try{return qt(t,"utf8").trim()||null}catch{return null}}function Bt(e){let t=ae(e);zt(t,{recursive:!0,mode:448});let n=Xe(e),r=[Dt(),new Date().toISOString()].join("|"),o=xe(n,"w",384);try{Ye(o,`${r}
`,null,"utf8"),be(o)}finally{se(o)}Qe(t)}function Ni(e,t,n){let r=J(e,`.events.jsonl.tmp-${process.pid}-${Dt()}`),o=xe(r,"w",384);try{let s=n.length===0?"":`${n.map(i=>JSON.stringify(i)).join(`
`)}
`;s&&Ye(o,s,null,"utf8"),be(o)}finally{se(o)}ji(r,t),Qe(e)}function Hn(e){let t=ae(e),n=zn(e),r=J(e,".toolnet","runtime","sources"),o=Dn(e),s=Vn(r),i=[],a=new Set;for(let l of Wn(n))a.has(l.id)||(a.add(l.id),i.push(l));let u=i.length,c=[];for(let l of s)for(let f of Wn(l))a.has(f.id)||(a.add(f.id),c.push(f));c.sort((l,f)=>{let d=l.timestamp.localeCompare(f.timestamp);return d!==0?d:l.id.localeCompare(f.id)}),i.push(...c),Ni(t,n,i);let p=Dn(e);return o&&p===o&&(Ue(Xe(e),{force:!0}),Qe(t)),{filesScanned:s.length,existingEvents:u,recoveredEvents:c.length,totalEvents:i.length}}function Gn(e){let t=ae(e);zt(t,{recursive:!0,mode:448});let n=J(t,"journal.lock"),r=Bn(n);try{return Hn(e)}finally{Jn(n,r)}}function Un(e,t){if(t.length===0)return;let n=ae(e);zt(n,{recursive:!0,mode:448});let r=zn(e),o=J(n,"journal.lock"),s=Bn(o);try{if(ie(Xe(e))){Hn(e);return}let i=`${t.map(u=>JSON.stringify(u)).join(`
`)}
`,a=xe(r,"a",384);try{Ye(a,i,null,"utf8"),be(a)}finally{se(a)}Qe(n)}finally{Jn(o,s)}}var Ki=12e4,Wi=80,Xn=2e3;function Di(e){Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,e)}function er(e,t){let n=Buffer.isBuffer(t)?t:Buffer.from(t,"utf8"),r=0;for(;r<n.length;){let o=Fi(e,n,r,n.length-r);if(o<=0)throw new Error("Unable to write session WAL");r+=o}}function Gt(e){let t=e.trim();if(!t)return null;try{let n=JSON.parse(t);return n.version!==1||typeof n.id!="string"||!n.id||typeof n.sequence!="number"||!Number.isFinite(n.sequence)||typeof n.projectId!="string"||!n.projectId||typeof n.timestamp!="string"?null:n}catch{return null}}function zi(e){if(!Ze(e))return[];let t="";try{t=Zn(e,"utf8")}catch{return[]}let n=[];for(let r of t.split(/\r?\n/)){let o=Gt(r);o&&n.push(o)}return n}function Qn(e){return e.type==="session_end"||e.type==="session_idle"?"idle":e.type==="error"?"error":"active"}function qi(e){if(!Ze(e))return!1;let t;try{t=Zn(e)}catch{return!1}if(t.length===0||t[t.length-1]===10)return!1;let n=t.lastIndexOf(10),r=n>=0?n+1:0,o=t.subarray(r).toString("utf8").trim();if(Gt(o)){let i=je(e,"a");try{er(i,`
`),Ht(i)}finally{Ce(i)}return!0}Li(e,r);let s=je(e,"a");try{Ht(s)}finally{Ce(s)}return!0}function Bi(e,t){if(e.length!==t.length)return!1;for(let n=0;n<e.length;n+=1)if(e[n]!==t[n])return!1;return!0}var et=class{constructor(t,n={}){this.identity=t;this.eventContext=n;_i(t.localDirectory,{recursive:!0}),this.eventsFile=Vt(t.localDirectory,"events.jsonl"),this.stateFile=Vt(t.localDirectory,"state.json"),this.lockFile=Vt(t.localDirectory,"journal.lock")}identity;eventContext;eventsFile;stateFile;lockFile;initialState(){let t=new Date().toISOString();return{version:1,projectId:this.identity.projectId,agent:this.identity.agent,nativeSessionId:this.identity.nativeSessionId,status:"idle",createdAt:t,updatedAt:t,lastSequence:0,lastRemoteSequence:0,remoteByteOffset:0,sourceCursors:{},recentEventIds:[]}}loadStateUnsafe(){return _n(this.stateFile)??this.initialState()}recoverStateUnsafe(){qi(this.eventsFile);let t=this.loadStateUnsafe(),n=zi(this.eventsFile);if(n.length===0)return t;let r=n[0];for(let l of n)l.sequence<=r.sequence||(r=l);let o=n.slice(-Xn).map(l=>l.id),s=Ze(this.eventsFile)?Jt(this.eventsFile).size:0,i=Math.max(t.lastSequence,r.sequence),a=Math.min(t.remoteByteOffset,s),u=r.sequence>t.lastSequence;if(!(u||a!==t.remoteByteOffset||!Bi(t.recentEventIds,o)||t.lastLocalEventAt!==r.timestamp))return t;let p={...t,status:Qn(r),updatedAt:r.timestamp,lastLocalEventAt:r.timestamp,lastSequence:i,remoteByteOffset:a,recentEventIds:o};if(this.saveStateUnsafe(p),!u)return p;try{Bt(this.identity.projectRoot)}catch{return p}try{Gn(this.identity.projectRoot)}catch{}return p}loadState(){return this.withLock(()=>this.recoverStateUnsafe())}saveStateUnsafe(t){R(this.stateFile,t)}acquireLock(){for(let t=0;t<Wi;t+=1)try{return je(this.lockFile,"wx",384)}catch(n){if(n.code!=="EEXIST")throw n;try{if(Date.now()-Jt(this.lockFile).mtimeMs>Ki){Yn(this.lockFile,{force:!0});continue}}catch{}Di(25)}throw new Error(`Session journal is locked: ${this.lockFile}`)}withLock(t){let n=this.acquireLock();try{return t()}finally{Ce(n),Yn(this.lockFile,{force:!0})}}append(t){return t.length===0?[]:this.withLock(()=>{let n=this.recoverStateUnsafe(),r=new Set(n.recentEventIds),o=n.lastSequence,s=[];for(let l of t){let f=Kn(l,this.eventContext),d=f.timestamp??new Date().toISOString(),g=f.data??{},S=f.provenance?.rawDigest??v(Nn(g)),h=f.sourceEventId?[this.identity.projectId,this.identity.agent,this.identity.nativeSessionId,f.sourceEventId].join("|"):[this.identity.projectId,this.identity.agent,this.identity.nativeSessionId,o+1,f.type,d,S].join("|"),y=v(h).slice(0,32);if(r.has(y))continue;o+=1;let k={version:1,id:y,sequence:o,projectId:this.identity.projectId,agent:this.identity.agent,nativeSessionId:this.identity.nativeSessionId,sessionId:this.identity.nativeSessionId,type:f.type,timestamp:d,source:f.source??f.provenance?.source??this.identity.agent,data:g,provenance:{...f.provenance,rawDigest:S}};f.role!==void 0&&(k.role=f.role),f.turnId!==void 0&&(k.turnId=f.turnId),f.cwd!==void 0&&(k.cwd=f.cwd),f.sourceEventId!==void 0&&(k.sourceEventId=f.sourceEventId),f.sourceSequence!==void 0&&(k.sourceSequence=f.sourceSequence),s.push(k),r.add(y)}if(s.length===0)return[];let i=s.map(l=>JSON.stringify(l)).join(`
`)+`
`,a=je(this.eventsFile,"a",384);try{er(a,i),Ht(a)}finally{Ce(a)}try{Un(this.identity.projectRoot,s)}catch{try{Bt(this.identity.projectRoot)}catch{}}let u=s[s.length-1],c=Qn(u),p=Array.from(r).slice(-Xn);return this.saveStateUnsafe({...n,status:c,updatedAt:u.timestamp,lastLocalEventAt:u.timestamp,lastSequence:u.sequence,recentEventIds:p}),s})}readPending(){return this.withLock(()=>{let t=this.recoverStateUnsafe();if(!Ze(this.eventsFile))return{events:[],startOffset:t.remoteByteOffset,endOffset:t.remoteByteOffset};let n=Jt(this.eventsFile).size,r=Math.min(t.remoteByteOffset,n);if(n<=r)return{events:[],startOffset:r,endOffset:n};let o=n-r,s=Buffer.alloc(o),i=je(this.eventsFile,"r");try{$i(i,s,0,o,r)}finally{Ce(i)}let a=[];for(let u of s.toString("utf8").split(/\r?\n/)){let c=Gt(u);c&&a.push(c)}return{events:a,startOffset:r,endOffset:n}})}markRemote(t,n){this.withLock(()=>{let r=this.recoverStateUnsafe(),o=new Date().toISOString();this.saveStateUnsafe({...r,lastRemoteSequence:Math.max(r.lastRemoteSequence,t),remoteByteOffset:Math.max(r.remoteByteOffset,n),lastRemoteAt:o,updatedAt:o})})}setSourceCursor(t,n){this.withLock(()=>{let r=this.recoverStateUnsafe();this.saveStateUnsafe({...r,sourceCursors:{...r.sourceCursors,[t]:String(n)},updatedAt:new Date().toISOString()})})}};import{closeSync as Fc,existsSync as Kc,openSync as Wc,readSync as Dc,statSync as zc}from"node:fs";var Ji=new Set(["rule","blocker","architecture","deploy"]),Vi=new Set(["fix","todo","context","next_action"]);function Ut(e){return e<0?0:e>1?1:e}function tr(e,t){let n=Number.parseFloat(e??"");return Number.isFinite(n)?n:t}function Hi(e){return e==="off"?"off":e==="balanced"?"balanced":e==="aggressive"?"aggressive":"conservative"}function Yt(){return{mode:Hi(process.env.TOOLNET_MEMORY_PROMOTION),minScore:Ut(tr(process.env.TOOLNET_PROMOTE_MIN_SCORE,.65)),minConfidence:Ut(tr(process.env.TOOLNET_PROMOTE_MIN_CONFIDENCE,.78))}}function Gi(e){switch(e){case"critical":return 1;case"high":return .85;case"normal":return .6;case"temporary":return .25}}function Ui(e){let t=Ut(Gi(e.importance)*.75+e.confidence*.25);return Math.round(t*1e6)/1e6}function Yi(e){return e.evidence?e.evidence:{userExplicit:!1,sourceVerified:!1,testVerified:!1,crossSessionConfirmations:0,assistantDerived:!1}}function Xi(e,t=Yt()){if(e.importance==="temporary"||e.confidence<t.minConfidence)return"transient";let n=Yi(e);return e.kind==="rule"&&n.userExplicit?"permanent":e.kind==="rule"?"session":e.kind==="architecture"&&(n.userExplicit||n.sourceVerified||n.testVerified||n.crossSessionConfirmations>=2)?"permanent":e.kind==="architecture"?"session":e.kind==="decision"||e.kind==="todo"||e.kind==="fix"?"task":"session"}function Qi(e,t=Yt()){if(t.mode==="off")return Number.POSITIVE_INFINITY;let n=0;t.mode==="balanced"&&(n=.1),t.mode==="aggressive"&&(n=.15);let r=Math.max(t.mode==="aggressive"?.5:.55,t.minScore-n);return Ji.has(e)&&(r=Math.max(.5,r-.1)),Vi.has(e)&&(r=Math.max(.5,r-.05)),r}function Xt(e,t=Yt()){let n=Xi(e,t),r=Ui(e),o=Qi(e.kind,t);return n==="transient"?{knowledgeClass:n,score:r,threshold:o,persist:!1}:t.mode==="off"?{knowledgeClass:n,score:r,threshold:o,persist:!1}:{knowledgeClass:n,score:r,threshold:o,persist:r>=o}}function nr(e,t){let n=t.toLowerCase();return n.includes("kh\xF4ng \u0111\u01B0\u1EE3c")||n.includes("tuy\u1EC7t \u0111\u1ED1i")||n.includes("must not")||n.includes("never ")?"critical":e==="rule"||e==="decision"?"high":e==="todo"||n.includes("error")||n.includes("failed")||n.includes("exception")?"normal":"temporary"}var ir=[/không được/iu,/tuyệt đối/iu,/bắt buộc/iu,/đừng\s+/iu,/must not/iu,/do not/iu,/don't/iu,/\bnever\b/iu],Zi=[/từ giờ/iu,/về sau/iu,/mỗi lần/iu,/luôn luôn/iu,/\bluôn\b/iu,/quy tắc/iu,/workflow/iu,/\balways\b/iu,/\brequired\b/iu,/\bmust\b/iu,/from now on/iu],ea=[/\bchốt\b/iu,/quyết định/iu,/sẽ dùng/iu,/chọn .+ thay/iu,/đổi sang/iu,/chuyển sang/iu,/\bdecided\b/iu,/\bchosen\b/iu,/we will use/iu,/use .+ instead/iu,/switch(?:ed)? to/iu],ta=[/\btodo\b/iu,/cần làm/iu,/cần thêm/iu,/cần sửa/iu,/cần kiểm tra/iu,/tiếp theo/iu,/bước tiếp theo/iu,/còn phải/iu,/còn cần/iu,/next step/iu,/\bneed to\b/iu,/\bremaining\b/iu,/follow[- ]?up/iu],na=[/đã sửa/iu,/đã fix/iu,/đã khắc phục/iu,/đã xử lý/iu,/hoàn tất/iu,/hoàn thành/iu,/\bfixed\b/iu,/\bresolved\b/iu,/\bimplemented\b/iu,/\bcompleted\b/iu,/\bpasses?\b/iu],rr=[/kiến trúc/iu,/pipeline/iu,/adapter/iu,/schema/iu,/runtime/iu,/namespace/iu,/storage/iu,/lưu trữ/iu,/workflow/iu,/session core/iu,/memory engine/iu,/retrieval/iu],ra=[/\bdùng\b/iu,/\btách\b/iu,/\bthay\b/iu,/\bchuyển\b/iu,/\blưu\b/iu,/\bmap\b/iu,/\buse\b/iu,/\bsplit\b/iu,/\bstore\b/iu,/\breplace\b/iu,/\bmove\b/iu],oa=[/đường dẫn/iu,/\bpath\b/iu,/\bport\b/iu,/\bendpoint\b/iu,/\bdomain\b/iu,/\bbucket\b/iu,/\brepository\b/iu,/\brepo\b/iu,/\bbranch\b/iu,/\/[A-Za-z0-9._/-]{4,}/u],sa=[/\blà\b/iu,/\bở\b/iu,/\bdùng\b/iu,/\bnằm\b/iu,/\bis\b/iu,/\buse\b/iu,/located/iu,/runs on/iu],or=new Set(["content","text","message","prompt","summary","description","reason","title","last_assistant_message","lastAssistantMessage","input_messages","inputMessages"]),ia=new Set(["payload","data","content","message","messages","parts","summary"]);function N(e,t){return t.some(n=>n.test(e))}function ar(e){return e.normalize("NFKC").replace(/\r/g,"").replace(/^[\s>*#\-•]+/u,"").replace(/\s+/g," ").trim()}function aa(e){return ar(e).toLowerCase().replace(/[^\p{L}\p{N}:/._-]+/gu," ").replace(/\s+/g," ").trim()}function ca(e){return!(e.length<12||e.length>1e3||(e.match(new RegExp("\\p{L}","gu"))??[]).length<6||/^(?:https?:\/\/\S+|[A-Za-z0-9+/=]{80,})$/u.test(e))}function Qt(e,t,n,r=0){if(!(r>6)&&!(typeof e=="string"&&t&&!or.has(t))){if(typeof e=="string"){n.push(e);return}if(Array.isArray(e)){for(let o of e.slice(0,50))Qt(o,t,n,r+1);return}if(!(!e||typeof e!="object"))for(let[o,s]of Object.entries(e))(or.has(o)||ia.has(o))&&Qt(s,o,n,r+1)}}function ua(e){let t=[];Qt(e.data,void 0,t);let n=[],r=new Set;for(let o of t)for(let s of o.split(/\n+|(?<=[.!?])\s+/u)){let i=ar(s);if(ca(i)&&!r.has(i)&&(r.add(i),n.push(i),n.length>=50))return n}return n}function sr(e){return(e.role??(typeof e.data.role=="string"?e.data.role:"")).toLowerCase()}function la(e,t,n){if(n.type==="decision")return{kind:"decision",confidence:1};if(n.type==="todo")return{kind:"todo",confidence:1};let r=t==="user"||n.type==="user_prompt",o=t==="assistant"||n.type==="assistant_message";return r&&N(e,ir)?{kind:"rule",confidence:.98}:r&&N(e,Zi)?{kind:"rule",confidence:.92}:N(e,ea)?{kind:N(e,rr)?"architecture":"decision",confidence:r?.93:.86}:r&&N(e,ta)?{kind:"todo",confidence:.87}:N(e,rr)&&N(e,ra)?{kind:"architecture",confidence:r?.88:.82}:o&&N(e,na)?{kind:"fix",confidence:.8}:r&&N(e,oa)&&N(e,sa)?{kind:"context",confidence:.79}:null}function da(e,t,n){let r=t==="user"||n.type==="user_prompt",o=t==="assistant"||n.type==="assistant_message",s=!!n.provenance.sourcePath&&(e==="architecture"||e==="context"||e==="fix"),i=e==="fix"&&/(?:test|tests|pass|passed|passing)/iu.test(JSON.stringify(n.data));return{userExplicit:r,sourceVerified:s,testVerified:i,crossSessionConfirmations:1,assistantDerived:o}}function pa(e){switch(e){case"rule":return"rule";case"decision":case"architecture":return"decision";case"todo":return"todo";case"fix":case"context":return"code"}}function fa(e,t,n){return e==="rule"&&N(n,ir)?"critical":e==="architecture"||e==="decision"||e==="rule"?"high":e==="fix"||e==="context"?"normal":nr(t,n)}function cr(e,t){let n=[],r=new Set,o=new Map;for(let s of t){let i=typeof s.data.messageId=="string"?s.data.messageId:void 0,a=sr(s);i&&a&&o.set(i,a)}for(let s of t){let i=sr(s),a=typeof s.data.messageId=="string"?s.data.messageId:void 0;!i&&a&&(i=o.get(a)??"");for(let u of ua(s)){let c=la(u,i,s);if(!c||c.confidence<.75)continue;let p=pa(c.kind),l=aa(u),f=v([e.projectId,c.kind,l].join("|"));if(r.has(f))continue;r.add(f);let d=s.provenance.sourcePath?[s.provenance.sourcePath]:[],g=s.sourceEventId?[s.sourceEventId]:[];n.push({version:1,fingerprint:f,projectId:e.projectId,agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,kind:c.kind,type:p,content:u,confidence:c.confidence,importance:fa(c.kind,p,u),evidence:da(c.kind,i,s),tags:[p],provenance:{agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,eventIds:[s.id],sourceEventIds:g,sourcePaths:d,firstSequence:s.sequence,lastSequence:s.sequence},createdAt:s.timestamp})}}return n}import{createHash as ma}from"node:crypto";var ga=["project-knowledge","implementation","continuation","session-context"],ya={"project-knowledge":"Project knowledge",implementation:"Implementation state",continuation:"Work continuation","session-context":"Session context"};function Zt(e){return ma("sha256").update(e).digest("hex")}function tt(e,t){return`${e}:${Zt(t).slice(0,24)}`}function ha(e){try{return Zt(JSON.stringify(e))}catch{return Zt(String(e))}}function X(e){let t=new Set,n=[];for(let r of e){let o=r?.replace(/\s+/gu," ").trim();if(!o)continue;let s=o.normalize("NFKC").toLowerCase();t.has(s)||(t.add(s),n.push(o))}return n}function lr(e,t=420){let n=e.replace(/\s+/gu," ").trim();return n.length<=t?n:`${n.slice(0,Math.max(0,t-1)).trimEnd()}\u2026`}function Sa(e){return e==="rule"||e==="architecture"?"project-knowledge":e==="decision"||e==="fix"?"implementation":e==="todo"?"continuation":"session-context"}function ur(e){return e.length===0?0:e.reduce((t,n)=>t+n,0)/e.length}function ka(e){return e.slice().sort((t,n)=>n.importanceScore-t.importanceScore||n.confidence-t.confidence||t.id.localeCompare(n.id)).slice(0,5).map(t=>lr(t.content)).join(" | ")}function va(e){return e.slice().sort((t,n)=>n.importanceScore-t.importanceScore||n.confidence-t.confidence||t.id.localeCompare(n.id)).slice(0,6).map(t=>lr(t.content)).join(`
`)}function dr(e,t){let n=e.slice().sort((f,d)=>f.sequence-d.sequence||f.timestamp.localeCompare(d.timestamp)||f.id.localeCompare(d.id)),r=n.map(f=>({id:tt("raw",[f.projectId,f.agent,f.nativeSessionId,f.id,String(f.sequence)].join("|")),level:"raw",eventId:f.id,sourceEventId:f.sourceEventId,sequence:f.sequence,type:f.type,role:f.role,timestamp:f.timestamp,sourcePath:f.provenance.sourcePath,payloadDigest:ha(f.data)})),o=new Map,s=new Map;n.forEach((f,d)=>{let g=r[d];g&&(o.set(f.id,g.id),f.sourceEventId&&s.set(f.sourceEventId,g.id))});let i=t.map(f=>{let d=X([...f.provenance.eventIds.map(g=>o.get(g)),...f.provenance.sourceEventIds.map(g=>s.get(g))]);return{id:tt("fact",f.fingerprint),level:"fact",fingerprint:f.fingerprint,kind:f.kind,type:f.type,content:f.content,knowledgeClass:f.knowledgeClass,importanceScore:f.importanceScore,confidence:f.confidence,tags:X([...f.tags,"level:fact",`class:${f.knowledgeClass}`,`kind:${f.kind}`]),rawIds:d,sourcePaths:X(f.provenance.sourcePaths)}}),a=new Map;for(let f of i){let d=Sa(f.kind),g=a.get(d)??[];g.push(f),a.set(d,g)}let u=[];for(let f of ga){let d=a.get(f);if(!d?.length)continue;let g=d.slice().sort((h,y)=>y.importanceScore-h.importanceScore||y.confidence-h.confidence||h.id.localeCompare(y.id)),S=g.map(h=>h.id);u.push({id:tt("scene",`${f}|${S.join("|")}`),level:"scene",kind:f,title:ya[f],summary:ka(g),factIds:S,importanceScore:Math.max(...g.map(h=>h.importanceScore)),confidence:ur(g.map(h=>h.confidence)),tags:X(["level:scene",`scene:${f}`,...g.flatMap(h=>h.tags)]),sourcePaths:X(g.flatMap(h=>h.sourcePaths))})}let c=new Map(i.map(f=>[f.id,f])),p=[];for(let f of u){let g=f.factIds.map(y=>c.get(y)).filter(y=>!!y).filter(y=>(y.knowledgeClass==="permanent"||y.knowledgeClass==="task")&&y.importanceScore>=.55);if(g.length===0)continue;let S=g.some(y=>y.knowledgeClass==="permanent")?"permanent":"task",h=va(g);p.push({id:tt("knowledge",`${f.id}|${S}|${g.map(y=>y.id).join("|")}`),level:"knowledge",knowledgeClass:S,title:f.title,content:h,sceneIds:[f.id],factIds:g.map(y=>y.id),importanceScore:Math.max(...g.map(y=>y.importanceScore)),confidence:ur(g.map(y=>y.confidence)),tags:X(["level:knowledge",`class:${S}`,`scene:${f.kind}`,...g.flatMap(y=>y.tags)]),sourcePaths:X(g.flatMap(y=>y.sourcePaths))})}let l=[];for(let f of i)for(let d of f.rawIds)l.push({from:d,to:f.id,type:"supports"});for(let f of u)for(let d of f.factIds)l.push({from:d,to:f.id,type:"belongs_to"});for(let f of p)for(let d of f.sceneIds)l.push({from:d,to:f.id,type:"promotes_to"});return{schema:"toolnet.memory-hierarchy.v1",version:1,raw:r,facts:i,scenes:u,knowledge:p,links:l,stats:{raw:r.length,facts:i.length,scenes:u.length,knowledge:p.length,links:l.length}}}function nt(e){return e?Math.ceil(e.length/3.5):0}function rt(e,t){if(!e)return"";if(nt(e)<=t)return e;let r=Math.floor(t*3.5),o=e.slice(0,r),s=o.lastIndexOf("."),i=o.lastIndexOf(`
`),a=Math.max(s,i);return a>r*.7?o.slice(0,a+1):o}function Q(){let e=De(),t=process.env.TOOLNET_SESSION_SAVE||"summary",n=process.env.TOOLNET_RAW_TRANSCRIPT==="on"||t==="archive"||t==="full",r=process.env.TOOLNET_MEMORY_PROMOTION||"conservative",o=parseFloat(process.env.TOOLNET_PROMOTE_MIN_SCORE||"0.65"),s=parseInt(process.env.TOOLNET_SESSION_SUMMARY_MAX_TOKENS||"700",10),i=parseInt(process.env.TOOLNET_DURABLE_MEMORY_MAX_ITEMS_PER_SESSION||"10",10),a=n,u=process.env.TOOLNET_RAW_TRANSCRIPT_REMOTE==="on"||t==="full";return{sessionSave:t,rawTranscript:n,memoryPromotion:r,promoteMinScore:o,sessionSummaryMaxTokens:s,durableMemoryMaxItemsPerSession:i,archiveLocal:a,archiveRemote:u}}function pr(e){return(e||Q()).rawTranscript}function fr(e){return(e||Q()).durableMemoryMaxItemsPerSession}function mr(e){return(e||Q()).sessionSummaryMaxTokens}function gr(e){return(e||Q()).archiveRemote}var yr=new U;function hr(e){let t=e.trim();if(t.startsWith("{")&&t.endsWith("}")||t.startsWith("[")&&t.endsWith("]"))try{let r=JSON.parse(t);return JSON.stringify(yr.sanitizeValue(r))}catch{}let n=yr.sanitize(e).text;return n=n.replace(/("(?:api[_-]?key|token|secret|password|cookie|authorization)"\s*:\s*)"[^"]*"/gi,'$1"[REDACTED]"').replace(/('(?:api[_-]?key|token|secret|password|cookie|authorization)'\s*:\s*)'[^']*'/gi,"$1'[REDACTED]'").replace(/\b(api[_-]?key|token|secret|password|cookie|authorization)\b\s*[:=]\s*[^\s,;]+/gi,"$1=[REDACTED]").replace(/\bbearer\s+[A-Za-z0-9._~+/=-]+/gi,"Bearer [REDACTED]"),n}function wa(e,t){let n=e.toLowerCase(),r=.5,o=["nh\u1EDB","remember","quy t\u1EAFc","rule","t\u1EEB gi\u1EDD","from now","kh\xF4ng \u0111\u01B0\u1EE3c","must not","lu\xF4n lu\xF4n","always","never","critical","important","blocker","deploy","production","architecture"];for(let i of o)n.includes(i)&&(r+=.15);t==="rule"||t==="architecture"||t==="blocker"?r+=.2:t==="decision"||t==="deploy"?r+=.15:(t==="fix"||t==="next_action")&&(r+=.1),e.length<20?r-=.3:e.length>500&&(r-=.1);let s=[/npm (notice|warn|ERR)/i,/\d+ packages? in \d+/i,/found \d+ vulnerabilities/i,/up to date/i,/added \d+ packages/i,/^(ok|done|success|error|warning)$/i];for(let i of s)i.test(e)&&(r-=.4);return Math.max(0,Math.min(1,r))}function ba(e,t){let n=[],r=new Set;for(let i of e){let a=i.split(`
`).filter(u=>u.trim());for(let u of a){let c=u.trim();if(c.length<15)continue;let p=c.toLowerCase().replace(/\s+/g," ");if(r.has(p))continue;r.add(p);let l="decision";/\b(rule|quy tắc|policy|standard|convention)\b/i.test(c)||/\b(always|never|must|should|từ giờ|không được)\b/i.test(c)?l="rule":/\b(fix|fixed|bug|issue|error|lỗi)\b/i.test(c)?l="fix":/\b(blocker|blocked|stuck|cannot|không thể)\b/i.test(c)?l="blocker":/\b(next|todo|action|task|cần làm)\b/i.test(c)?l="next_action":/\b(deploy|release|publish|ship)\b/i.test(c)?l="deploy":/\b(architecture|design|structure|pattern)\b/i.test(c)?l="architecture":/\.(ts|js|py|go|rs|java|cpp|c|h)\b/i.test(c)&&(l="file");let f=wa(c,l);if(f<.3)continue;let d=hr(c);n.push({category:l,text:d,importance:f,sourceSessionId:t})}}let o=Q(),s=fr(o);return n.sort((i,a)=>a.importance-i.importance).slice(0,s)}function xa(e){let t=Q(),n=mr(t),s=e.join(`

`).split(`
`).filter(i=>{let a=i.trim();return a.length>20&&!a.startsWith("npm")&&!a.startsWith("\u2713")&&!a.startsWith("Error:")}).slice(0,20).map(i=>hr(i)).join(`
`);return rt(s,n)}function ot(e,t){let r=(Array.isArray(e)?e:e.split(`

`).filter(d=>d.trim())).map(d=>typeof d=="string"?d:JSON.stringify(d)).filter(d=>d.trim()),o=ba(r,t),s=o.filter(d=>d.category==="decision").map(d=>d.text),i=o.filter(d=>d.category==="rule").map(d=>d.text),a=o.filter(d=>d.category==="file").map(d=>d.text),u=o.filter(d=>d.category==="fix").map(d=>d.text),c=o.filter(d=>d.category==="blocker").map(d=>d.text),p=o.filter(d=>d.category==="next_action").map(d=>d.text),l=o.filter(d=>d.category==="deploy").map(d=>d.text);return{summary:xa(r),decisions:s,projectRules:i,filesChanged:a,bugsFixed:u,commands:l,blockers:c,nextActions:p,durableFacts:o}}function V(e){let t=new Set,n=[];for(let r of e){let o=r?.replace(/\s+/g," ").trim();if(!o)continue;let s=o.normalize("NFKC").toLowerCase();t.has(s)||(t.add(s),n.push(o))}return n}function Ca(e){let t=new Map;for(let n of e){if(!n||!n.id||!Number.isFinite(n.sequence))continue;let r=n.sourceEventId?`${n.agent}:${n.sourceEventId}`:n.id,o=t.get(r);(!o||n.sequence>o.sequence)&&t.set(r,n)}return[...t.values()].sort((n,r)=>n.sequence-r.sequence||n.timestamp.localeCompare(r.timestamp))}function ja(e){let t=e.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}_./:-]+/gu)??[],n=new Set;for(let r of t)if(!(r.length<2||/^\d+$/u.test(r))&&(n.add(r),n.size>=40))break;return[...n]}function Ia(e){let t=Xt(e);return{...e,knowledgeClass:t.knowledgeClass,importanceScore:t.score,retrievalTerms:ja(e.content),tags:V([...e.tags,"level:fact",`class:${t.knowledgeClass}`,`kind:${e.kind}`])}}function Ma(e){return e.map(t=>{try{return JSON.stringify({type:t.type,role:t.role,data:t.data,provenance:{sourcePath:t.provenance.sourcePath,files:t.provenance.files}})}catch{return""}}).filter(Boolean)}function Ea(e,t,n){let r=ot(Ma(t),e.nativeSessionId),o=n.filter(c=>c.kind==="todo").map(c=>c.content),s=n.flatMap(c=>c.provenance.sourcePaths),i=n.filter(c=>c.kind==="architecture").map(c=>c.content),a=V([...o,...r.nextActions]),u=V([...r.nextActions,...o]);return{summary:r.summary,state:{task:u[0]??a[0],decisions:V(r.decisions),files:V([...r.filesChanged,...s]),todos:a,completed:V(r.bugsFixed),blockers:V(r.blockers),nextActions:u,architecture:V(i)}}}function st(e,t){let n=Ca(t),r=cr(e,n).map(Ia),o=r.filter(p=>Xt(p).persist).sort((p,l)=>l.importanceScore-p.importanceScore),{summary:s,state:i}=Ea(e,n,o),a=o.map(p=>({fingerprint:p.fingerprint,kind:p.kind,knowledgeClass:p.knowledgeClass,importanceScore:p.importanceScore,content:p.content,terms:p.retrievalTerms})),u=dr(n,o),c=p=>r.filter(l=>l.knowledgeClass===p).length;return{version:2,normalizedEvents:n,summary:s,state:i,candidates:o,retrievalIndex:a,hierarchy:u,stats:{inputEvents:t.length,normalizedEvents:n.length,extractedCandidates:r.length,persistedCandidates:o.length,permanent:c("permanent"),task:c("task"),session:c("session"),transient:c("transient")}}}import{createHash as Aa}from"node:crypto";import{chmodSync as Sr,existsSync as Pa,mkdirSync as Oa,readFileSync as Ta,renameSync as Ra,writeFileSync as kr}from"node:fs";import{dirname as vr,join as it}from"node:path";var nn="toolnet.context-offload.v1",Na="toolnet.context-offload-asset.v1",_a=256,$a=new Set(["tool_call","tool_result","file_read","file_write","file_edit","command","test","artifact"]);function wr(e){return it(e,".toolnet","offload")}function La(e){return it(wr(e),"assets")}function br(e){return it(wr(e),"graph.json")}function xr(e){Oa(e,{recursive:!0,mode:448});try{Sr(e,448)}catch{}}function Fa(e,t){xr(vr(e));let n=`${e}.${process.pid}.${Date.now()}.tmp`;kr(n,t,{encoding:"utf8",mode:384}),Ra(n,e);try{Sr(e,384)}catch{}}function tn(e){return Array.isArray(e)?e.map(tn):e&&typeof e=="object"?Object.fromEntries(Object.entries(e).sort(([t],[n])=>t.localeCompare(n)).map(([t,n])=>[t,tn(n)])):e}function Ka(e){return Aa("sha256").update(JSON.stringify(tn(e)),"utf8").digest("hex")}function en(){return{schema:nn,version:1,updatedAt:new Date(0).toISOString(),nodes:[]}}function Wa(e){let t=br(e);if(!Pa(t))return en();try{let n=JSON.parse(Ta(t,"utf8"));return n.schema!==nn||n.version!==1||!Array.isArray(n.nodes)?en():n}catch{return en()}}function Da(e,t){Fa(br(e),JSON.stringify(t,null,2)+`
`)}function za(e,t=260){if(typeof e!="string")return null;let n=e.replace(/\s+/gu," ").trim();return n?n.slice(0,t):null}function qa(e){let t=[...e.provenance.files??[],e.provenance.sourcePath],n=[];for(let r of t){let o=za(r);if(!(!o||n.includes(o))&&(n.push(o),n.length===3))break}return n}function Ba(e){return`${e.agent}:${e.sourceEventId??e.id}`.replace(/\s+/gu," ").trim().slice(0,120)}function Ja(e,t){xr(vr(e));try{return kr(e,t,{encoding:"utf8",flag:"wx",mode:384}),!0}catch(n){if(n.code==="EEXIST")return!1;throw n}}function Va(e,t){let n=e.nodes.find(o=>o.id===t.id),r=n?{...n,kind:t.kind,bytes:t.bytes,sourceRefs:Array.from(new Set([...n.sourceRefs,...t.sourceRefs])).slice(-8),files:Array.from(new Set([...n.files,...t.files])).slice(0,6)}:t;return{schema:nn,version:1,updatedAt:new Date().toISOString(),nodes:[...e.nodes.filter(o=>o.id!==t.id),r].slice(-_a)}}function Cr(e,t){let n=Wa(e),r=0,o=0,s=0,i=[];for(let a of t){if(!$a.has(a.type))continue;r+=1;let u=Ka({type:a.type,data:a.data}),c={schema:Na,version:1,assetId:u,event:{type:a.type,agent:a.agent,nativeSessionId:a.nativeSessionId,timestamp:a.timestamp,sourceEventId:a.sourceEventId,provenance:a.provenance,data:a.data}},p=JSON.stringify(c,null,2)+`
`;Ja(it(La(e),`${u}.json`),p)?o+=1:s+=1,i.push(u),n=Va(n,{id:u,kind:a.type,bytes:Buffer.byteLength(p,"utf8"),createdAt:a.timestamp,sourceRefs:[Ba(a)],files:qa(a)})}return r>0&&Da(e,n),{eligible:r,written:o,deduped:s,graphNodes:n.nodes.length,assetIds:i}}import{createHash as ec}from"node:crypto";import{existsSync as tc,readdirSync as nc,readFileSync as rc}from"node:fs";import{basename as oc,join as Dr}from"node:path";import{randomUUID as Mr}from"node:crypto";var M=class extends Error{constructor(n,r){super(n);this.statusCode=r}statusCode};function Ie(e){let t=new Set,n=[];for(let r of e){let o=r.replace(/\s+/gu," ").trim();if(!o)continue;let s=o.normalize("NFKC").toLowerCase();t.has(s)||(t.add(s),n.push(o))}return n}function ee(e){let t=e.normalize("NFKD").replace(/[\u0300-\u036f]/gu,"").toLowerCase().replace(/[^a-z0-9]+/gu,"-").replace(/^-+|-+$/gu,"").slice(0,120);if(!t)throw new M("Invalid Wiki slug",400);return t}function jr(e){let t=[];for(let n of e.matchAll(/\[\[([^\[\]]+)\]\]/gu)){let r=n[1]?.trim();r&&t.push(ee(r))}return Ie(t)}function Ha(e){return e.normalize("NFKC").toLowerCase().split(/[^\p{L}\p{N}_-]+/u).map(t=>t.trim()).filter(t=>t.length>=2)}function Ir(e){return{id:`revision-${Mr()}`,pageId:e.id,slug:e.slug,revision:e.revision,title:e.title,...e.summary?{summary:e.summary}:{},content:e.content,tags:[...e.tags],links:[...e.links],createdAt:e.updatedAt}}function Z(e){return structuredClone(e)}var at=class{constructor(t){this.store=t}store;state;queue=Promise.resolve();async initialize(){await this.ensureState()}async ensureState(){return this.state||(this.state=await this.store.load()),this.state}async mutate(t){let n,r=this.queue.then(async()=>{let o=await this.ensureState();n=t(o),o.updatedAt=new Date().toISOString(),await this.store.save(o)});return this.queue=r.then(()=>{},()=>{}),await r,n}async summary(){let t=await this.ensureState(),n=new Set(t.pages.flatMap(r=>r.links));return{schema:"toolnet.wiki-summary.v1",projectId:t.projectId,pages:t.pages.length,revisions:t.revisions.length,tags:Ie(t.pages.flatMap(r=>r.tags)).sort((r,o)=>r.localeCompare(o)),links:t.pages.reduce((r,o)=>r+o.links.length,0),orphanPages:t.pages.filter(r=>r.links.length===0&&!n.has(r.slug)).length,automatedPages:t.pages.filter(r=>r.tags.some(o=>o.startsWith("toolnet-auto-"))).length,updatedAt:t.updatedAt}}async listPages(){let t=await this.ensureState();return Z([...t.pages].sort((n,r)=>n.title.localeCompare(r.title)))}async getPage(t){let n=await this.ensureState(),r=ee(t),o=n.pages.find(s=>s.slug===r||s.id===t);if(!o)throw new M(`Wiki page not found: ${t}`,404);return Z(o)}async createPage(t){return this.mutate(n=>{let r=t.title.trim(),o=t.content.trim();if(!r)throw new M("Wiki title is required",400);let s=ee(t.slug??r);if(n.pages.some(u=>u.slug===s))throw new M(`Wiki page already exists: ${s}`,409);let i=new Date().toISOString(),a={id:`wiki-${Mr()}`,slug:s,title:r,...t.summary?.trim()?{summary:t.summary.trim()}:{},content:o,tags:Ie(t.tags??[]),links:jr(o),revision:1,createdAt:i,updatedAt:i};return n.pages.push(a),n.revisions.push(Ir(a)),Z(a)})}async updatePage(t,n){return this.mutate(r=>{let o=ee(t),s=r.pages.find(i=>i.slug===o||i.id===t);if(!s)throw new M(`Wiki page not found: ${t}`,404);if(n.title!==void 0){let i=n.title.trim();if(!i)throw new M("Wiki title is required",400);s.title=i}if(n.summary!==void 0){let i=n.summary.trim();i?s.summary=i:delete s.summary}return n.content!==void 0&&(s.content=n.content.trim(),s.links=jr(s.content)),n.tags!==void 0&&(s.tags=Ie(n.tags)),s.revision+=1,s.updatedAt=new Date().toISOString(),r.revisions.push(Ir(s)),Z(s)})}async history(t){let n=await this.getPage(t),r=await this.ensureState();return Z(r.revisions.filter(o=>o.pageId===n.id).sort((o,s)=>s.revision-o.revision))}async backlinks(t){let n=await this.getPage(t),r=await this.ensureState();return Z(r.pages.filter(o=>o.links.includes(n.slug)).sort((o,s)=>o.title.localeCompare(s.title)))}async search(t,n=10){let r=await this.ensureState(),o=Ie(Ha(t));if(o.length===0)return[];let s=Math.max(1,Math.min(20,Math.floor(n))),i=[];for(let a of r.pages){let u=a.title.toLowerCase(),c=a.slug.toLowerCase(),p=a.summary?.toLowerCase()??"",l=a.content.toLowerCase(),f=a.tags.map(g=>g.toLowerCase()),d=0;for(let g of o)c===g&&(d+=12),u===g&&(d+=10),u.includes(g)&&(d+=6),c.includes(g)&&(d+=5),f.some(S=>S===g)?d+=5:f.some(S=>S.includes(g))&&(d+=3),p.includes(g)&&(d+=2),l.includes(g)&&(d+=1);d>0&&i.push({page:Z(a),score:d})}return i.sort((a,u)=>u.score-a.score||u.page.updatedAt.localeCompare(a.page.updatedAt)).slice(0,s)}};var Er="wiki/state.v1.json";function Ga(e){let t=new Date().toISOString();return{schema:"toolnet.wiki.v1",version:1,projectId:e.id,pages:[],revisions:[],createdAt:t,updatedAt:t}}function Ua(e,t){let n=JSON.parse(e);if(n.schema!=="toolnet.wiki.v1"||n.version!==1||n.projectId!==t.id||!Array.isArray(n.pages)||!Array.isArray(n.revisions))throw new Error("Invalid ToolNet Wiki state");return n}var ct=class{constructor(t,n){this.storage=t;this.project=n}storage;project;async load(){let t=await this.storage.getText(Er);if(!t){let n=Ga(this.project);return await this.save(n),n}return Ua(t,this.project)}async save(t){await this.storage.put(Er,JSON.stringify(t,null,2),"application/json")}};import{createHash as Ya,randomUUID as Ar}from"node:crypto";var Pr="wiki/governance.v1.json",Nr="toolnet.knowledge-governance.v1",Or=500,Me={autoApproveThreshold:.86,criticalApproveThreshold:.94,staleAfterDays:90};function Xa(e,t=0,n=1){return Math.max(t,Math.min(n,e))}function rn(e){return e.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/gu," ").trim()}function Tr(e){return Ya("sha256").update(e.normalize("NFKC").replace(/\s+/gu," ").trim()).digest("hex")}function Qa(e){let t=[e.title,e.summary??"",e.content.slice(0,2e3),...e.tags].join(" ").toLowerCase();return/\b(?:architecture|security|authentication|authorization|auth|database|production|deploy|deployment|payment|billing|permission|permissions|acl|credential|secret|migration)\b/u.test(t)}function Za(e){let t=e.sourceType==="skill"?.96:e.sourceType==="memory"?.94:.88,n=e.tags.map(r=>r.toLowerCase());return(n.includes("permanent")||n.includes("task"))&&(t+=.03),e.content.length>=200&&(t+=.02),e.content.length<80&&(t-=.05),e.title.length<4&&(t-=.05),Xa(t)}function Rr(e){let t=new Date().toISOString();return{schema:Nr,version:1,projectId:e,policy:{...Me},reviews:[],audit:[],createdAt:t,updatedAt:t}}function _r(e){let t=e.autoApproveThreshold??Me.autoApproveThreshold,n=e.criticalApproveThreshold??Me.criticalApproveThreshold,r=e.staleAfterDays??Me.staleAfterDays;if(!Number.isFinite(t)||t<.5||t>1)throw new M("Invalid autoApproveThreshold",400);if(!Number.isFinite(n)||n<.5||n>1)throw new M("Invalid criticalApproveThreshold",400);if(!Number.isInteger(r)||r<1||r>3650)throw new M("Invalid staleAfterDays",400);return{autoApproveThreshold:t,criticalApproveThreshold:n,staleAfterDays:r}}var ut=class{constructor(t,n){this.storage=t;this.project=n}storage;project;async load(){let t=await this.storage.getText(Pr);if(!t){let n=Rr(this.project.id);return await this.save(n),n}try{let n=JSON.parse(t);if(n.schema!==Nr||n.version!==1||n.projectId!==this.project.id||!Array.isArray(n.reviews)||!Array.isArray(n.audit))throw new Error("invalid");return{...n,policy:_r(n.policy??Me)}}catch{let n=Rr(this.project.id);return await this.save(n),n}}async save(t){await this.storage.put(Pr,JSON.stringify(t,null,2),"application/json")}},lt=class{constructor(t){this.store=t}store;state;queue=Promise.resolve();async initialize(){await this.ensureState()}async ensureState(){return this.state||(this.state=await this.store.load()),this.state}audit(t,n,r,o={}){t.audit.push({id:Ar(),action:n,principal:r,...o.reviewId?{reviewId:o.reviewId}:{},...o.sourceKey?{sourceKey:o.sourceKey}:{},timestamp:new Date().toISOString(),...o.metadata?{metadata:o.metadata}:{}}),t.audit.length>Or&&(t.audit=t.audit.slice(-Or))}async mutate(t){let n,r=this.queue.then(async()=>{let o=await this.ensureState();n=await t(o),o.updatedAt=new Date().toISOString(),await this.store.save(o)});return this.queue=r.then(()=>{},()=>{}),await r,n}async policy(){return{...(await this.ensureState()).policy}}async setPolicy(t,n){return this.mutate(r=>(r.policy=_r({...r.policy,...t}),this.audit(r,"policy:update",n,{metadata:{...r.policy}}),{...r.policy}))}async summary(){let t=await this.ensureState(),n=r=>t.reviews.filter(o=>o.status===r).length;return{schema:"toolnet.knowledge-governance-summary.v1",projectId:t.projectId,pending:n("pending"),approved:n("approved"),rejected:n("rejected"),superseded:n("superseded"),criticalPending:t.reviews.filter(r=>r.status==="pending"&&r.risk==="critical").length,conflictPending:t.reviews.filter(r=>r.status==="pending"&&r.risk==="conflict").length,auditEvents:t.audit.length,policy:{...t.policy},updatedAt:t.updatedAt}}async listReviews(t){let n=await this.ensureState();return structuredClone(n.reviews.filter(r=>!t||r.status===t).sort((r,o)=>o.updatedAt.localeCompare(r.updatedAt)))}async auditLog(t=100){let n=await this.ensureState(),r=Math.max(1,Math.min(500,Math.floor(t)));return structuredClone(n.audit.slice(-r).reverse())}async assess(t,n){let r=await this.ensureState(),o=Za(t),s=rn(t.title),i=n.filter(p=>p.slug!==t.slug&&rn(p.title)===s&&Tr(p.content)!==Tr(t.content)).map(p=>p.slug),a=Qa(t),u=[];o<r.policy.autoApproveThreshold&&u.push(`confidence:${o.toFixed(2)}`),a&&o<r.policy.criticalApproveThreshold&&u.push("critical-knowledge"),i.length>0&&u.push("conflicting-knowledge");let c=i.length>0?"conflict":a?"critical":"normal";return{confidence:o,risk:c,requiresReview:i.length>0||o<r.policy.autoApproveThreshold||a&&o<r.policy.criticalApproveThreshold,reasons:u,conflicts:i}}async gate(t,n){let r=await this.assess(t,n);return this.mutate(o=>{let s=o.reviews.find(u=>u.sourceKey===t.sourceKey&&u.digest===t.digest);if(s?.status==="approved")return{allowed:!0,mode:"review-approved",assessment:r,review:structuredClone(s)};if(s?.status==="rejected")return{allowed:!1,mode:"rejected",assessment:r,review:structuredClone(s)};if(!r.requiresReview)return this.audit(o,"knowledge:auto-approved","system",{sourceKey:t.sourceKey,metadata:{confidence:r.confidence,risk:r.risk}}),{allowed:!0,mode:"auto-approved",assessment:r};if(s?.status==="pending")return{allowed:!1,mode:"pending-review",assessment:r,review:structuredClone(s)};let i=new Date().toISOString(),a={id:Ar(),sourceKey:t.sourceKey,sourceType:t.sourceType,slug:t.slug,marker:t.marker,digest:t.digest,title:t.title,...t.summary?{summary:t.summary}:{},content:t.content,tags:[...new Set([...t.tags,t.marker])],confidence:r.confidence,risk:r.risk,reasons:[...r.reasons],conflicts:[...r.conflicts],status:"pending",createdAt:i,updatedAt:i};return o.reviews.push(a),this.audit(o,"knowledge:review-requested","system",{reviewId:a.id,sourceKey:a.sourceKey,metadata:{confidence:a.confidence,risk:a.risk}}),{allowed:!1,mode:"pending-review",assessment:r,review:structuredClone(a)}})}async markApplied(t,n){await this.mutate(r=>{let o=r.reviews.find(s=>s.sourceKey===t&&s.digest===n&&s.status==="approved");o&&(o.appliedAt=new Date().toISOString(),o.updatedAt=o.appliedAt,this.audit(r,"knowledge:applied",o.reviewedBy??"system",{reviewId:o.id,sourceKey:t}))})}async decide(t,n,r){return this.mutate(async o=>{let s=o.reviews.find(c=>c.id===t);if(!s)throw new M(`Governance review not found: ${t}`,404);if(s.status!=="pending")throw new M("Governance review is already resolved",409);let i=new Date().toISOString();if(s.reviewedAt=i,s.reviewedBy=n.principal,s.updatedAt=i,n.note?.trim()&&(s.reviewNote=n.note.trim()),n.action==="reject")return s.status="rejected",this.audit(o,"knowledge:rejected",n.principal,{reviewId:t,sourceKey:s.sourceKey}),structuredClone(s);if(n.action==="supersede")return s.status="superseded",n.targetReviewId&&(s.supersededBy=n.targetReviewId),this.audit(o,"knowledge:superseded",n.principal,{reviewId:t,sourceKey:s.sourceKey,metadata:{targetReviewId:n.targetReviewId}}),structuredClone(s);if(n.action==="merge"){if(!n.targetReviewId)throw new M("targetReviewId is required for merge",400);let c=o.reviews.find(p=>p.id===n.targetReviewId);if(!c)throw new M("Merge target review not found",404);return s.status="superseded",s.mergedInto=c.id,this.audit(o,"knowledge:merged",n.principal,{reviewId:t,sourceKey:s.sourceKey,metadata:{targetReviewId:c.id}}),structuredClone(s)}s.status="approved";let u=(await r.listPages()).find(c=>c.slug===s.slug);if(u&&!u.tags.includes(s.marker))throw new M(`Wiki page '${s.slug}' is manually managed`,409);return u?await r.updatePage(s.slug,{title:s.title,summary:s.summary??"",content:s.content,tags:s.tags}):await r.createPage({slug:s.slug,title:s.title,...s.summary?{summary:s.summary}:{},content:s.content,tags:s.tags}),s.appliedAt=i,this.audit(o,"knowledge:approved",n.principal,{reviewId:t,sourceKey:s.sourceKey}),structuredClone(s)})}async quality(t){let n=await this.ensureState(),r=await t.listPages(),o=Date.now(),s=n.policy.staleAfterDays*864e5,i=r.map(p=>{let l=o-Date.parse(p.updatedAt);return{slug:p.slug,title:p.title,updatedAt:p.updatedAt,ageDays:Math.max(0,Math.floor(l/864e5)),stale:Number.isFinite(l)&&l>s}}).filter(p=>p.stale).map(({stale:p,...l})=>l),a=new Map;for(let p of r){let l=rn(p.title),f=a.get(l)??[];f.push(p),a.set(l,f)}let u=[...a.entries()].filter(([,p])=>p.length>1).map(([p,l])=>({title:p,pages:l.map(f=>f.slug)})),c=n.reviews.filter(p=>p.status==="pending");return{schema:"toolnet.knowledge-quality.v1",totalPages:r.length,automatedPages:r.filter(p=>p.tags.some(l=>l.startsWith("toolnet-auto-"))).length,manualPages:r.filter(p=>!p.tags.some(l=>l.startsWith("toolnet-auto-"))).length,stalePages:i,duplicateTitles:u,pendingReviews:c.length,lowConfidenceReviews:c.filter(p=>p.confidence<n.policy.autoApproveThreshold).length,conflicts:c.filter(p=>p.risk==="conflict").length,generatedAt:new Date().toISOString()}}};var zr="wiki/automation.v1.json",qr="toolnet.wiki-automation.v1",an=8e3,$r=new Set(["raw","rawtext","raw_text","rawtranscript","raw_transcript","transcript","messages","message","payload","prompt","response","assistantmessage","assistant_message","userprompt","user_prompt"]);function Ae(e){return ec("sha256").update(JSON.stringify(e)).digest("hex")}function Ee(e){if(!(!e||typeof e!="object"||Array.isArray(e)))return e}function Lr(e){return Array.isArray(e)?e:[]}function Br(e){return typeof e!="string"?void 0:e.replace(/\s+/gu," ").trim()||void 0}function on(e){return Array.isArray(e)?e.map(Br).filter(t=>!!t):[]}function L(e,t){for(let n of t){let r=Br(e[n]);if(r)return r}}function Pe(e){let t=new Set,n=[];for(let r of e){let o=r.replace(/\s+/gu," ").trim();if(!o)continue;let s=o.normalize("NFKC").toLowerCase();t.has(s)||(t.add(s),n.push(o))}return n}function dt(e,t=0,n=""){if(t>3)return[];let r=n.replace(/[^a-z0-9]/giu,"").toLowerCase();if($r.has(r))return[];if(typeof e=="string"){let i=e.replace(/\s+/gu," ").trim();return i.length<8?[]:[i]}if(Array.isArray(e))return e.flatMap(i=>dt(i,t+1,n));let o=Ee(e);if(!o)return[];let s=[];for(let[i,a]of Object.entries(o)){let u=i.replace(/[^a-z0-9]/giu,"").toLowerCase();$r.has(u)||s.push(...dt(a,t+1,i))}return s}function Fr(e){let n=Pe(["content","summary","text","value","statement","description","decision","task","knowledge","context","outcome","reason","rationale"].flatMap(o=>dt(e[o],0,o)));return(n.length>0?n:Pe(dt(e))).join(`

`).slice(0,an)}function Kr(e,t){return L(e,["id","key","fingerprint","knowledgeId","sceneId"])??t}function Wr(e,t){return L(e,["title","name","topic","label","task","kind","type"])??t}function sc(e){return(L(e,["knowledgeClass","class","classification","scope"])??"").toLowerCase()}function ic(e){return(L(e,["kind","sceneKind","type"])??"").toLowerCase()}function ac(e){let t=Ee(e);if(!t)return[];let n=[],r=Lr(t.knowledge);for(let[s,i]of r.entries()){let a=Ee(i);if(!a)continue;let u=sc(a);if(u==="session"||u==="transient")continue;let c=Fr(a);if(c.length<20)continue;let p=Kr(a,Ae(a).slice(0,16)),l=Wr(a,`Durable Memory ${s+1}`);n.push({sourceKey:`memory:${p}`,sourceType:"memory",title:l,summary:L(a,["summary","description"]),content:c,tags:Pe(["toolnet","auto","memory",...u?[u]:[]])})}let o=Lr(t.scenes);for(let[s,i]of o.entries()){let a=Ee(i);if(!a)continue;let u=ic(a);if(u==="session-context")continue;let c=Fr(a);if(c.length<20)continue;let p=Kr(a,Ae(a).slice(0,16)),l=Wr(a,`Knowledge Scene ${s+1}`);n.push({sourceKey:`scene:${p}`,sourceType:"scene",title:l,summary:L(a,["summary","description"]),content:c,tags:Pe(["toolnet","auto","scene",...u?[u]:[]])})}return n}function cc(e){return Dr(e,".toolnet","memory","skills")}function uc(e){let t=cc(e);if(!tc(t))return{candidates:[],failed:0};let n=[],r=0,o=nc(t).filter(s=>s.endsWith(".json")).sort();for(let s of o)try{let i=JSON.parse(rc(Dr(t,s),"utf8")),a=Ee(i);if(!a||a.schema!=="toolnet.skill-memory.v1")continue;let u=L(a,["id","fingerprint"])??oc(s,".json"),c=L(a,["task"])??"",p=L(a,["title"])||c||`Reusable Skill ${u.slice(0,8)}`,l=L(a,["summary"])??void 0,f=on(a.steps),d=on(a.verification),g=on(a.files),S=[];c&&S.push(`## Task
${c}`),l&&S.push(`## Summary
${l}`),f.length>0&&S.push(`## Procedure
${f.map((y,k)=>`${k+1}. ${y}`).join(`
`)}`),d.length>0&&S.push(`## Verification
${d.map(y=>`- ${y}`).join(`
`)}`),g.length>0&&S.push(`## Relevant Files
${g.map(y=>`- \`${y}\``).join(`
`)}`);let h=S.join(`

`).slice(0,an);if(h.length<20)continue;n.push({sourceKey:`skill:${u}`,sourceType:"skill",title:p,summary:l,content:h,tags:["toolnet","auto","skill","sop"]})}catch{r+=1}return{candidates:n,failed:r}}function sn(e){let t=new Date().toISOString();return{schema:qr,version:1,projectId:e,entries:[],createdAt:t,updatedAt:t}}async function lc(e,t){let n=await e.getText(zr);if(!n)return sn(t);try{let r=JSON.parse(n);return r.schema!==qr||r.version!==1||r.projectId!==t||!Array.isArray(r.entries)?sn(t):r}catch{return sn(t)}}async function dc(e,t){await e.put(zr,JSON.stringify(t,null,2),"application/json")}function pc(e){return`toolnet-auto-${Ae(e).slice(0,12)}`}function fc(e){let t=ee(e.title).slice(0,72),n=Ae(e.sourceKey).slice(0,10);return ee(`auto-${e.sourceType}-${t}-${n}`)}function mc(e){return[`> Auto-generated by ToolNet Knowledge Automation from ${e.sourceType==="skill"?"reusable Skill Memory":e.sourceType==="scene"?"semantic memory scene":"durable memory"}.`,"",e.content].join(`
`).slice(0,an)}function gc(e){return Ae({sourceType:e.sourceType,title:e.title,summary:e.summary,content:e.content,tags:e.tags})}function yc(e,t){return e.tags.includes(t)}async function Jr(e){let t=ac(e.hierarchy),n=uc(e.project.rootPath),r=new Map;for(let d of[...t,...n.candidates])r.set(d.sourceKey,d);let o=[...r.values()].sort((d,g)=>d.sourceKey.localeCompare(g.sourceKey)),s={schema:"toolnet.wiki-automation-result.v1",scanned:t.length+n.candidates.length,eligible:o.length,created:0,updated:0,unchanged:0,skipped:0,failed:n.failed,reviewPending:0,autoApproved:0,reviewApproved:0,pages:[]},i=new at(new ct(e.storage,e.project));await i.initialize();let a=new lt(new ut(e.storage,e.project));await a.initialize();let u=await lc(e.storage,e.project.id),c=await i.listPages(),p=new Map(c.map(d=>[d.slug,d])),l=new Map(u.entries.map(d=>[d.sourceKey,d]));for(let d of o)try{let g=pc(d.sourceKey),S=gc(d),h=l.get(d.sourceKey),y=h?.slug??fc(d),k=p.get(y);if(k&&!yc(k,g)){s.skipped+=1;continue}let I=Pe([...d.tags,g]),O=mc(d),P=await a.gate({sourceKey:d.sourceKey,sourceType:d.sourceType,slug:y,marker:g,digest:S,title:d.title,...d.summary?{summary:d.summary}:{},content:O,tags:I},[...p.values()]);if(!P.allowed){P.mode==="pending-review"?s.reviewPending+=1:s.skipped+=1;continue}P.mode==="auto-approved"?s.autoApproved+=1:P.mode==="review-approved"&&(s.reviewApproved+=1),k?h?.digest!==S?(k=await i.updatePage(y,{title:d.title,summary:d.summary??"",content:O,tags:I}),p.set(k.slug,k),s.updated+=1,s.pages.push({sourceKey:d.sourceKey,sourceType:d.sourceType,slug:k.slug,action:"updated"})):(s.unchanged+=1,s.pages.push({sourceKey:d.sourceKey,sourceType:d.sourceType,slug:y,action:"unchanged"})):(k=await i.createPage({slug:y,title:d.title,summary:d.summary,content:O,tags:I}),p.set(k.slug,k),s.created+=1,s.pages.push({sourceKey:d.sourceKey,sourceType:d.sourceType,slug:k.slug,action:"created"}));let T=new Date().toISOString(),C={sourceKey:d.sourceKey,sourceType:d.sourceType,slug:y,digest:S,marker:g,updatedAt:T},w=u.entries.findIndex(D=>D.sourceKey===d.sourceKey);w>=0?u.entries[w]=C:u.entries.push(C),l.set(d.sourceKey,C),await a.markApplied(d.sourceKey,S)}catch(g){if(g instanceof M&&g.statusCode===409){s.skipped+=1;continue}s.failed+=1}let f=new Date().toISOString();return u.updatedAt=f,u.lastRunAt=f,u.entries.sort((d,g)=>d.sourceKey.localeCompare(g.sourceKey)),await dc(e.storage,u),s}import{createHash as hc}from"node:crypto";import{chmodSync as Hr,existsSync as Sc,mkdirSync as kc,readFileSync as Om,readdirSync as Tm,renameSync as vc,statSync as Rm,writeFileSync as wc}from"node:fs";import{join as Gr}from"node:path";var bc="toolnet.skill-memory.v1",Vr=5,xc=16,Cc=24,jc=32;function Ic(e){return hc("sha256").update(e).digest("hex")}function Te(e,t=Number.MAX_SAFE_INTEGER){let n=new Set,r=[];for(let o of e){let s=o.replace(/\s+/gu," ").trim();if(!s)continue;let i=s.normalize("NFKC").toLowerCase();if(!n.has(i)&&(n.add(i),r.push(s),r.length>=t))break}return r}function cn(e,t=360){let n=e.replace(/\s+/gu," ").trim();return n.length<=t?n:n.slice(0,Math.max(0,t-1)).trimEnd()+"\u2026"}function Mc(e){return e.replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/giu,"Bearer [REDACTED]").replace(/\bsk-[A-Za-z0-9_-]{8,}\b/gu,"[REDACTED]").replace(/\b(api[_-]?key|token|password|passwd|secret)\b(\s*[:=]\s*)(["']?)[^\s"'`]+/giu,"$1$2[REDACTED]")}function q(e,t=360){return e&&cn(Mc(e),t)||void 0}function Re(e,t){for(let n of t){let r=e[n];if(typeof r=="string"&&r.trim())return r}}function Ur(e,t){for(let n of t){let r=e[n];if(typeof r=="number"&&Number.isFinite(r))return r;if(typeof r=="string"&&r.trim()&&Number.isFinite(Number(r)))return Number(r)}}function Yr(e,t){for(let n of t){let r=e[n];if(typeof r=="boolean")return r;if(typeof r=="string"){let o=r.trim().toLowerCase();if(["true","yes","pass","passed","success","succeeded","ok"].includes(o))return!0;if(["false","no","fail","failed","error"].includes(o))return!1}}}function Xr(e){let t=e.data??{};if(Yr(t,["passed","pass","success","succeeded","ok"])===!1)return!0;let r=Ur(t,["exitCode","exit_code","code","statusCode"]);if(r!==void 0&&r!==0)return!0;let o=Re(t,["status","result","outcome"]);return!!(o&&/\b(fail(?:ed)?|error|broken|cancelled)\b/iu.test(o))}function Oe(e){let t=e.data??{};if(Xr(e))return!1;if(Yr(t,["passed","pass","success","succeeded","ok"])===!0||Ur(t,["exitCode","exit_code","code","statusCode"])===0)return!0;let o=Re(t,["status","result","outcome"]);return o&&/\b(pass(?:ed)?|success(?:ful)?|succeeded|ok|green|complete(?:d)?)\b/iu.test(o)?!0:e.type==="commit"||e.type==="deploy"}function Qr(e){let t=e.data??{},n=Re(t,["path","file","filePath","filename","target"]);if(n)return q(n,260);let r=e.provenance?.files;return q(r?.[0],260)}function un(e){return q(Re(e.data??{},["command","cmd","script"]),420)}function ce(e){return q(Re(e.data??{},["name","test","suite","title","message","text","result","status"]),300)}function Ec(e){let t=[];for(let n of[...e].sort((r,o)=>r.sequence-o.sequence))if(Oe(n)){if(n.type==="test"){let r=ce(n)??un(n)??"Tests passed";t.push(`Test passed: ${r}`);continue}if(n.type==="commit"){let r=ce(n);t.push(r?`Commit: ${r}`:"Commit completed");continue}if(n.type==="deploy"){let r=ce(n);t.push(r?`Deploy: ${r}`:"Deployment completed")}}return Te(t,10)}function Ac(e,t){let n=[];for(let r of[...e].sort((o,s)=>o.sequence-s.sequence))switch(r.type){case"file_write":case"file_edit":{let o=Qr(r);o&&n.push(`Update ${o}`);break}case"command":{if(Xr(r))break;let o=un(r);o&&n.push(`Run: ${o}`);break}case"test":{if(!Oe(r))break;let o=ce(r)??un(r)??"project tests";n.push(`Verify: ${o}`);break}case"commit":{if(!Oe(r))break;let o=ce(r);n.push(o?`Commit: ${o}`:"Commit verified changes");break}case"deploy":{if(!Oe(r))break;let o=ce(r);n.push(o?`Deploy: ${o}`:"Deploy verified build");break}default:break}if(n.length===0)for(let r of t.files.slice(0,8)){let o=q(r,260);o&&n.push(`Update ${o}`)}return Te(n,xc)}function Pc(e,t){let n=[...t.files];for(let r of e){let o=Qr(r);o&&n.push(o);for(let s of r.provenance?.files??[]){let i=q(s,260);i&&n.push(i)}}return Te(n,Cc)}function Oc(e){return Te(e.filter(t=>["file_write","file_edit","command","test","commit","deploy"].includes(t.type)).map(t=>t.id),jc)}function Tc(e){return e.map(n=>n.timestamp).filter(Boolean).sort().at(-1)??new Date(0).toISOString()}function Zr(e,t,n){if(t.length===0)return[];let r=Ec(t),o=Te(n.completed.map(g=>q(g,280)??""),Vr);if(!(o.length>0||t.some(g=>["test","commit","deploy"].includes(g.type)&&Oe(g))))return[];let i=q(n.task,280)??q(n.nextActions[0],280),a=o.length>0?o:i?[i]:[];if(a.length===0)return[];let u=Ac(t,n);if(u.length===0)return[];let c=Pc(t,n),p=Oc(t),l=Math.min(...t.map(g=>g.sequence)),f=Math.max(...t.map(g=>g.sequence)),d=Tc(t);return a.slice(0,Vr).map(g=>{let S=[`Reusable procedure learned from successful task: ${g}.`,c.length>0?`Files: ${c.slice(0,6).join(", ")}.`:"",r.length>0?`Verification: ${r.slice(0,4).join("; ")}.`:""].filter(Boolean),h=JSON.stringify({projectId:e.projectId,task:g,steps:u,verification:r,files:c}),y=Ic(h);return{schema:bc,version:1,id:`skill-${y.slice(0,24)}`,fingerprint:y,projectId:e.projectId,title:cn(`SOP: ${g}`,180),task:g,summary:cn(S.join(" "),900),steps:u,verification:r,files:c,source:{agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,firstSequence:l,lastSequence:f,eventIds:p},createdAt:d}})}function Rc(e){return Gr(e.rootPath,".toolnet","memory","skills")}function Nc(e){let t=Rc(e);return kc(t,{recursive:!0,mode:448}),Hr(t,448),t}function eo(e,t){if(t.length===0)return{written:0,deduped:0,files:[]};let n=Nc(e),r=0,o=0,s=[];for(let i of t){if(i.projectId!==e.id)throw new Error(`Skill project mismatch: ${i.projectId} != ${e.id}`);let a=Gr(n,`${i.id}.json`);if(s.push(a),Sc(a)){o+=1;continue}let u=`${a}.${process.pid}.${Date.now()}.tmp`;wc(u,JSON.stringify(i,null,2)+`
`,{encoding:"utf8",mode:384}),vc(u,a),Hr(a,384),r+=1}return{written:r,deduped:o,files:s}}function to(e){return String(e).padStart(12,"0")}function _c(e){return`projects/${e.projectId}/memory/learned`}var pt=class{constructor(t){this.storage=t}storage;async write(t,n,r){if(r.length===0||n.length===0)return null;let o=Math.min(...n.map(l=>l.sequence)),s=Math.max(...n.map(l=>l.sequence)),i={version:1,projectId:t.projectId,agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,createdAt:new Date().toISOString(),firstSequence:o,lastSequence:s,candidateCount:r.length,candidates:r},a=JSON.stringify(i,null,2)+`
`,u=v(r.map(l=>l.fingerprint).sort().join("|")).slice(0,16),c=v(t.sessionKey).slice(0,12),p=[_c(t),"batches",`${to(o)}-${to(s)}-${c}-${u}.json`].join("/");return await this.storage.exists(p)||await this.storage.put(p,a,"application/json"),p}};import{createHash as $c}from"node:crypto";function no(e){return String(e).padStart(12,"0")}function ro(e){return $c("sha256").update(e).digest("hex")}function Lc(e){return`projects/${e.projectId}/memory/hierarchy`}var ft=class{constructor(t){this.storage=t}storage;async write(t,n,r){if(n.length===0||r.facts.length===0)return null;let o=Math.min(...n.map(p=>p.sequence)),s=Math.max(...n.map(p=>p.sequence)),i={schema:"toolnet.memory-hierarchy-batch.v1",version:1,projectId:t.projectId,agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,createdAt:new Date().toISOString(),firstSequence:o,lastSequence:s,hierarchy:r},a=ro([...r.facts.map(p=>p.id),...r.knowledge.map(p=>p.id)].sort().join("|")).slice(0,16),u=ro(t.sessionKey).slice(0,12),c=[Lc(t),"batches",`${no(o)}-${no(s)}-${u}-${a}.json`].join("/");return await this.storage.exists(c)||await this.storage.put(c,`${JSON.stringify(i,null,2)}
`,"application/json"),c}};function qc(e,t){if(!Kc(e))return{events:[],nextOffset:t};let n=zc(e).size,r=Number.isFinite(t)?Math.max(0,t):0;if(r>n&&(r=0),r===n)return{events:[],nextOffset:n};let o=n-r,s=Buffer.alloc(o),i=Wc(e,"r");try{Dc(i,s,0,o,r)}finally{Fc(i)}let a=s.toString("utf8"),u=a.lastIndexOf(`
`);if(u<0)return{events:[],nextOffset:r};let c=a.slice(0,u+1);return{events:c.split(`
`).filter(Boolean).flatMap(l=>{try{return[JSON.parse(l)]}catch{return[]}}),nextOffset:r+Buffer.byteLength(c,"utf8")}}var mt=class{constructor(t){this.options=t;this.journal=new pt(t.storage),this.hierarchyJournal=new ft(t.storage)}options;journal;hierarchyJournal;async learnNew(){let t=this.options.wal.loadState(),n=Number(t.sourceCursors["memory.learner.offset"]??0),r=Number.isFinite(n)?n:0,o=qc(this.options.wal.eventsFile,r);if(o.events.length===0)return{scannedEvents:0,candidates:0,journalWritten:!1,nextOffset:o.nextOffset};let s=st(this.options.identity,o.events),i=s.candidates,a=!1;i.length>0&&(a=!!await this.journal.write(this.options.identity,o.events,i));let u=!1;s.hierarchy.facts.length>0&&(u=!!await this.hierarchyJournal.write(this.options.identity,o.events,s.hierarchy));let c=Zr(this.options.identity,o.events,s.state),p=eo(this.options.project,c);this.options.wal.setSourceCursor("memory.pipeline.version",2),this.options.wal.setSourceCursor("memory.pipeline.normalized_events",s.stats.normalizedEvents),this.options.wal.setSourceCursor("memory.pipeline.persisted",s.stats.persistedCandidates),this.options.wal.setSourceCursor("memory.pipeline.permanent",s.stats.permanent),this.options.wal.setSourceCursor("memory.pipeline.task",s.stats.task),this.options.wal.setSourceCursor("memory.pipeline.session",s.stats.session),this.options.wal.setSourceCursor("memory.pipeline.transient",s.stats.transient),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.version",s.hierarchy.version),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.raw",s.hierarchy.stats.raw),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.facts",s.hierarchy.stats.facts),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.scenes",s.hierarchy.stats.scenes),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.knowledge",s.hierarchy.stats.knowledge),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.journal_written",u?1:0),this.options.wal.setSourceCursor("memory.skill.assets",c.length),this.options.wal.setSourceCursor("memory.skill.written",p.written),this.options.wal.setSourceCursor("memory.skill.deduped",p.deduped);try{let l=Cr(this.options.project.rootPath,o.events);this.options.wal.setSourceCursor("memory.context_offload.eligible",l.eligible),this.options.wal.setSourceCursor("memory.context_offload.written",l.written),this.options.wal.setSourceCursor("memory.context_offload.deduped",l.deduped),this.options.wal.setSourceCursor("memory.context_offload.graph_nodes",l.graphNodes),this.options.wal.setSourceCursor("memory.context_offload.failed",0)}catch{this.options.wal.setSourceCursor("memory.context_offload.failed",1)}try{let l=await Jr({project:this.options.project,storage:this.options.storage,hierarchy:s.hierarchy});this.options.wal.setSourceCursor("memory.wiki_automation.scanned",l.scanned),this.options.wal.setSourceCursor("memory.wiki_automation.eligible",l.eligible),this.options.wal.setSourceCursor("memory.wiki_automation.created",l.created),this.options.wal.setSourceCursor("memory.wiki_automation.updated",l.updated),this.options.wal.setSourceCursor("memory.wiki_automation.unchanged",l.unchanged),this.options.wal.setSourceCursor("memory.wiki_automation.skipped",l.skipped),this.options.wal.setSourceCursor("memory.wiki_automation.failed",l.failed),this.options.wal.setSourceCursor("memory.wiki_automation.review_pending",l.reviewPending),this.options.wal.setSourceCursor("memory.wiki_automation.auto_approved",l.autoApproved),this.options.wal.setSourceCursor("memory.wiki_automation.review_approved",l.reviewApproved)}catch{this.options.wal.setSourceCursor("memory.wiki_automation.failed",1)}return this.options.wal.setSourceCursor("memory.learner.offset",o.nextOffset),{scannedEvents:o.events.length,candidates:i.length,journalWritten:a,nextOffset:o.nextOffset}}};import{closeSync as iu,existsSync as au,openSync as cu,readSync as uu,statSync as lu}from"node:fs";function oo(e){return e&&typeof e=="object"&&!Array.isArray(e)?e:null}function _e(e){return e.toLowerCase().replace(/[^a-z0-9]/gu,"")}function Ne(e,t,n=0){if(n>8)return;if(Array.isArray(e)){for(let o of e.slice(0,50))Ne(o,t,n+1);return}let r=oo(e);if(r)for(let[o,s]of Object.entries(r))t(o,s,r),Ne(s,t,n+1)}function ue(e,t){let n=[];return Ne(e,(r,o)=>{t.has(_e(r))&&typeof o=="string"&&o.trim()&&n.push(o.trim())}),n}function Bc(e){let t=e.trim();if(!t.startsWith("{"))return null;try{return oo(JSON.parse(t))}catch{return null}}function Jc(e){let t=e.data;for(let r of["tool","toolName","tool_name"]){let o=t[r];if(typeof o=="string"&&o.trim())return o.trim().toLowerCase()}let n="";return Ne(t,(r,o,s)=>{if(n)return;let i=_e(r);if(["tool","toolname"].includes(i)&&typeof o=="string"){n=o.trim().toLowerCase();return}if(i!=="name"||typeof o!="string")return;let a=typeof s.type=="string"?s.type.toLowerCase():"";(a.includes("tool")||a.includes("function")||a.includes("command"))&&(n=o.trim().toLowerCase())}),n}function Vc(e){let t=ue(e.data,new Set(["command","cmd","script"])),n=ue(e.data,new Set(["arguments","args"]));for(let r of n){let o=Bc(r);if(o)for(let s of ue(o,new Set(["command","cmd","script"])))t.push(s)}return Array.from(new Set(t.map(r=>r.trim()).filter(Boolean)))}function Hc(e){let t=ue(e.data,new Set(["filepath","file_path","filename","file","path","target"].map(_e)));return Array.from(new Set(t.map(n=>n.trim()).filter(n=>n.length>0&&n.length<1e3&&!n.includes(`
`))))}function Gc(e,t){return e.type==="file_edit"||e.type==="file_write"?"modified":/\b(delete|remove|unlink)\b/iu.test(t)?"deleted":/\b(create|add[_-]?file|new[_-]?file)\b/iu.test(t)?"created":/\b(edit|write|patch|apply[_-]?patch|replace|update[_-]?file)\b/iu.test(t)?"modified":null}function Uc(e){let t=ue(e.data,new Set(["patch","diff","arguments","input"].map(_e))),n=[];for(let r of t){let o=[{regex:/^\*\*\* Update File:\s*(.+)$/gimu,action:"modified"},{regex:/^\*\*\* Add File:\s*(.+)$/gimu,action:"created"},{regex:/^\*\*\* Delete File:\s*(.+)$/gimu,action:"deleted"}];for(let s of o)for(let i of r.matchAll(s.regex)){let a=i[1]?.trim();a&&n.push({kind:"file",text:a,fileAction:s.action,confidence:.99})}}return n}function Yc(e){let t=e.toLowerCase();return/\b(typecheck|type-check)\b/u.test(t)||/\btsc\b[\s\S]*--noemit\b/u.test(t)?"typecheck":/\b(eslint|lint)\b/u.test(t)?"lint":/\b(vitest|jest|pytest)\b/u.test(t)||/\bgo\s+test\b/u.test(t)||/\bcargo\s+test\b/u.test(t)||/\b(npm|pnpm|yarn)\s+(run\s+)?test\b/u.test(t)?"test":/\b(npm|pnpm|yarn)\s+(run\s+)?build\b/u.test(t)||/\bcargo\s+build\b/u.test(t)||/\bgo\s+build\b/u.test(t)||/\btsc\b/u.test(t)?"build":null}function Xc(e){let t=null;return Ne(e,(n,r)=>{if(t===null&&["exitcode","code"].includes(_e(n))){if(typeof r=="number"&&Number.isFinite(r)){t=r;return}if(typeof r=="string"){let o=Number(r);Number.isFinite(o)&&(t=o)}}}),t}function Qc(e){return ue(e,new Set(["status","state","result","output","outputsummary","message","text"]))}function Zc(e){let t=Xc(e.data);if(t!==null)return t===0?"passed":"failed";let n=Qc(e.data).join(`
`).toLowerCase();return/\b(error|failed|failure|failing)\b/u.test(n)&&!/\b0\s+failed\b/u.test(n)?"failed":/\b(success|successful|completed|passed|green)\b/u.test(n)||/\b\d+\s+passed\b/u.test(n)?"passed":/\b(running|started|in[_ -]?progress)\b/u.test(n)?"running":"unknown"}function eu(e){let t=[],n=new Set;for(let r of e){let o=[r.kind,r.fileAction??"",r.checkKind??"",r.checkStatus??"",r.text].join("|");n.has(o)||(n.add(o),t.push(r))}return t}function so(e){let t=[],n=Jc(e),r=Gc(e,n);if(r)for(let o of Hc(e))t.push({kind:"file",text:o,fileAction:r,confidence:e.type==="file_edit"||e.type==="file_write"?1:.96});t.push(...Uc(e));for(let o of Vc(e)){t.push({kind:"command",text:o,confidence:.98});let s=Yc(o);s&&t.push({kind:"test",text:o,checkKind:s,checkStatus:Zc(e),confidence:.98})}return eu(t)}var tu=new Set(["content","text","message","prompt","summary","description","title","reason","last_assistant_message","lastAssistantMessage"]);function ne(e){return e.normalize("NFKC").replace(/\s+/g," ").replace(/^[\s>*#•-]+/u,"").trim()}function ao(e){return ne(e).toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim()}function te(e,t,n=0){if(!(n>6)){if(typeof e=="string"){t.push(e);return}if(Array.isArray(e)){for(let r of e.slice(0,50))te(r,t,n+1);return}if(!(!e||typeof e!="object"))for(let[r,o]of Object.entries(e))(tu.has(r)||["data","payload","parts","messages"].includes(r))&&te(o,t,n+1)}}function gt(e){return/\b(cancelled|canceled)\b|đã hủy|bỏ qua/iu.test(e)?"cancelled":/\b(blocked|blocker)\b|đang vướng|bị vướng|đang kẹt|chưa thể/iu.test(e)?"blocked":/\b(completed|complete|done|finished|passed)\b|hoàn thành|hoàn tất|đã xong|đã làm xong|\bxong\b/iu.test(e)?"completed":/\bin[\s_-]*progress\b|working on|đang làm|đang thực hiện|đang xử lý|đang triển khai/iu.test(e)?"in_progress":"pending"}function io(e){let t=ne(e);return/^(?:đang\s+làm|đang\s+thực\s+hiện|đang\s+xử\s+lý|đang\s+triển\s+khai|hoàn\s+thành|hoàn\s+tất|đã\s+xong|đã\s+làm\s+xong|xong|pending|in[\s_-]*progress|completed|complete|done|finished|blocked|cancelled|canceled)[.!]*$/iu.test(t)}function E(e,t,n,r,o={}){let s=ne(r),i=o.key??ao(s);return{version:1,id:v([e.projectId,n,i,t.id,s,o.status??"",o.fileAction??"",o.checkKind??"",o.checkStatus??"",o.order??""].join("|")).slice(0,32),projectId:e.projectId,kind:n,key:i,text:s,status:o.status,fileAction:o.fileAction,checkKind:o.checkKind,checkStatus:o.checkStatus,order:o.order,confidence:o.confidence??.85,occurredAt:t.timestamp,sequence:t.sequence,agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,eventId:t.id,sourceEventId:t.sourceEventId}}function nu(e,t,n){let r=ne(n);if(r.length<5||r.length>1200)return[];let o=[],s=/^(?:next|next action|next step|tiếp theo|bước tiếp theo|cần làm tiếp)\b/iu.test(r),i=r.match(/^(?:mục tiêu|goal|objective)\s*(?::|-)\s*(.+)$/iu);i?.[1]&&o.push(E(e,t,"goal",i[1],{confidence:.97}));let a=r.match(/^(?:kế hoạch|plan)\s*(?::|-)\s*(.+)$/iu);a?.[1]&&o.push(E(e,t,"plan",a[1],{confidence:.95}));let u=/\b(?:phase|giai đoạn|giai doan|stage)\s*(\d+)\s*(?:[:\-–—]\s*)?([^.;\n]{0,220})/giu,c;for(;!s&&(c=u.exec(r));){let f=Number(c[1]),d=ne(c[2]??""),g=d&&!io(d)?`Phase ${f} - ${d}`:`Phase ${f}`;o.push(E(e,t,"phase",g,{key:`phase:${f}`,order:f,status:gt(r),confidence:.93}))}let p=n.match(/^\s*[-*]\s*\[([ xX])\]\s*(.+)$/u);p?.[2]&&o.push(E(e,t,"task",p[2],{status:p[1].trim()?"completed":gt(p[2]),confidence:.96}));let l=r.match(/^(?:todo|task|việc)\s*(\d+)?(?:\s*[:.\-–—]\s*|\s+)(.+)$/iu);if(l?.[2]){let f=l[1]?Number(l[1]):void 0,d=ne(l[2]),g=io(d);o.push(E(e,t,"task",g&&f!==void 0?`TODO ${f}`:d,{key:f!==void 0?`task:${f}`:ao(d),order:f,status:gt(r),confidence:.93}))}if(/^(?:next|next action|next step|tiếp theo|bước tiếp theo|cần làm tiếp)\b/iu.test(r)){let f=r.replace(/^(?:next|next action|next step|tiếp theo|bước tiếp theo|cần làm tiếp)\s*(?::|-)?\s*/iu,"");f&&o.push(E(e,t,"next_action",f,{confidence:.9}))}return/\b(blocker|blocked)\b|đang vướng|bị vướng|đang kẹt/iu.test(r)&&o.push(E(e,t,"blocker",r,{confidence:.9})),/\b(chú ý|lưu ý|warning|attention|cẩn thận)\b/iu.test(r)&&o.push(E(e,t,"warning",r,{confidence:.88})),/\b(chốt|quyết định|decided|decision)\b/iu.test(r)&&o.push(E(e,t,"decision",r,{confidence:.9})),r.length<=300&&/^(?:đang\s+(?:sửa|cập nhật|triển khai|xử lý|làm|refactor|fix)|(?:i(?:'m| am)\s+)?(?:working on|implementing|fixing|refactoring|updating|editing)\b)/iu.test(r)&&o.push(E(e,t,"activity",r,{confidence:.86})),o}function yt(e,t){if(t.length===0)return[];let n=[],r=new Set;function o(i){r.has(i.id)||(r.add(i.id),n.push(i))}for(let i of t){if(i.type==="user_prompt"||i.role==="user"){let u=[];te(i.data,u);let c=u.map(p=>ne(p)).find(p=>p.length>=8&&p.length<=1200&&!/^\[?toolnet\b/iu.test(p));c&&o(E(e,i,"request",c,{confidence:.96}))}for(let u of so(i))o(E(e,i,u.kind,u.text,{fileAction:u.fileAction,checkKind:u.checkKind,checkStatus:u.checkStatus,status:u.kind==="test"?u.checkStatus==="passed"?"completed":u.checkStatus==="failed"?"blocked":u.checkStatus==="running"?"in_progress":"pending":void 0,confidence:u.confidence}));if(i.type==="decision"){let u=[];te(i.data,u);for(let c of u)o(E(e,i,"decision",c,{confidence:1}))}if(i.type==="todo"){let u=[];te(i.data,u);for(let c of u)o(E(e,i,"task",c,{status:gt(c),confidence:1}))}if(["file_write","file_edit"].includes(i.type))for(let u of["filePath","path","file"]){let c=i.data[u];typeof c=="string"&&c&&o(E(e,i,"file",c,{fileAction:"modified",confidence:1}))}if(i.type==="test"){let u=[];te(i.data,u);for(let c of u)o(E(e,i,"test",c,{confidence:1}))}let a=[];te(i.data,a);for(let u of a)for(let c of u.split(/\n+/u))for(let p of nu(e,i,c))o(p)}let s=t[t.length-1];return o(E(e,s,"session",`${e.agent}:${e.nativeSessionId}`,{key:e.sessionKey,confidence:1})),n}function co(e){return String(e).padStart(12,"0")}var ht=class{constructor(t){this.storage=t}storage;async write(t,n){if(n.length===0)return null;let r=Math.min(...n.map(p=>p.sequence)),o=Math.max(...n.map(p=>p.sequence)),s={version:1,projectId:t.projectId,agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,createdAt:n.map(p=>p.occurredAt).sort().at(-1)??new Date().toISOString(),firstSequence:r,lastSequence:o,observations:n},i=JSON.stringify(s,null,2)+`
`,a=v(n.map(p=>JSON.stringify(p)).sort().join(`
`)).slice(0,24),u=v(t.sessionKey).slice(0,12),c=[`projects/${t.projectId}`,"work","observations",`${co(r)}-${co(o)}-${u}-${a}.json`].join("/");return await this.storage.put(c,i,"application/json"),c}};import{join as uo}from"node:path";import{mkdirSync as ru}from"node:fs";function po(e){return e.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim()}function F(e,t=20){let n=[],r=new Set;for(let o of e.slice().reverse()){let s=po(o);if(!(!s||r.has(s))&&(r.add(s),n.push(o),n.length>=t))break}return n.reverse()}function ou(e,t=20){let n=new Map;for(let r of e){let o=`${r.kind}|${po(r.command)}`;n.delete(o),n.set(o,r)}return Array.from(n.values()).slice(-t)}function su(e){return e.kind==="phase"?/^Phase\s+\d+$/iu.test(e.text):e.kind==="task"?/^(?:TODO|Task|Việc)\s+\d+$/iu.test(e.text):!1}function lo(e,t){let n=t.status??e?.status??"pending",r=n;e&&(e.status==="completed"&&n!=="completed"?r="completed":n==="pending"&&(e.status==="in_progress"||e.status==="blocked")&&(r=e.status));let o=e&&su(t)?e.title:t.text;return{id:e?.id??v(t.key).slice(0,24),title:o,status:r,order:t.order??e?.order,confidence:Math.max(t.confidence,e?.confidence??0),updatedAt:t.occurredAt,updatedBy:{agent:t.agent,nativeSessionId:t.nativeSessionId,eventId:t.eventId}}}async function fo(e,t){let n=`projects/${e.id}/work/observations/`,r=await t.list(n),o=[];for(let s of r.filter(i=>i.key.endsWith(".json")).sort((i,a)=>i.key.localeCompare(a.key))){let i=await t.getText(s.key);if(i)try{let a=JSON.parse(i);a.version===1&&Array.isArray(a.observations)&&o.push(a)}catch{}}return o}async function $e(e,t){let r=(await fo(e,t)).flatMap(m=>m.observations).sort((m,b)=>{let B=m.occurredAt.localeCompare(b.occurredAt);if(B!==0)return B;let wn=m.sequence-b.sequence;return wn!==0?wn:m.id.localeCompare(b.id)}),o=new Map,s=new Map,i,a,u,c,p,l=[],f=[],d=[],g=[],S=[],h=new Map,y=[],k=[],I=[],O=[],P=[],T=[];for(let m of r)switch(m.kind){case"request":i=m.text;break;case"activity":a=m.text;break;case"goal":u=m.text;break;case"plan":c=m.text;break;case"phase":o.set(m.key,lo(o.get(m.key),m));break;case"task":s.set(m.key,lo(s.get(m.key),m));break;case"decision":l.push(m.text);break;case"blocker":f.push(m.text);break;case"warning":d.push(m.text);break;case"next_action":g.push(m.text);break;case"file":{S.push(m.text);let b=m.fileAction??"active";h.delete(m.text),h.set(m.text,b),b==="modified"?y.push(m.text):b==="created"?k.push(m.text):b==="deleted"&&I.push(m.text);break}case"command":O.push(m.text);break;case"test":P.push(m.text),m.checkKind&&T.push({kind:m.checkKind,command:m.text,status:m.checkStatus??"unknown",updatedAt:m.occurredAt,agent:m.agent,nativeSessionId:m.nativeSessionId});break;case"session":p={agent:m.agent,nativeSessionId:m.nativeSessionId,sessionKey:m.sessionKey,updatedAt:m.occurredAt};break}let C=Array.from(o.values()).sort((m,b)=>(m.order??Number.MAX_SAFE_INTEGER)-(b.order??Number.MAX_SAFE_INTEGER)),w=Array.from(s.values()).sort((m,b)=>(m.order??Number.MAX_SAFE_INTEGER)-(b.order??Number.MAX_SAFE_INTEGER)),D=C.find(m=>m.status==="in_progress")??C.find(m=>m.status==="blocked")??C.find(m=>m.status==="pending"),z=w.find(m=>m.status==="in_progress")??w.find(m=>m.status==="blocked")??w.find(m=>m.status==="pending"),Nt=F([...g,...z?[z.title]:[],...!z&&D?[D.title]:[],...w.filter(m=>m.status==="pending").slice(0,5).map(m=>m.title)],8),_t=F([...f,...C.filter(m=>m.status==="blocked").map(m=>m.title),...w.filter(m=>m.status==="blocked").map(m=>m.title)],20),ge={version:1,projectId:e.id,projectName:e.name,currentRequest:i,currentActivity:a,goal:u,plan:c,phases:C,tasks:w,decisions:F(l,20),blockers:_t,warnings:F(d,20),nextActions:Nt,filesTouched:F(S,30),activeFiles:Array.from(h.entries()).filter(([,m])=>m!=="deleted").map(([m])=>m).slice(-5),modifiedFiles:F(y,30),createdFiles:F(k,30),deletedFiles:F(I,30),commands:F(O,20),tests:F(P,20),checks:ou(T,20),currentPhase:D,currentTask:z,progress:{phasesTotal:C.length,phasesCompleted:C.filter(m=>m.status==="completed").length,tasksTotal:w.length,tasksCompleted:w.filter(m=>m.status==="completed").length,blocked:C.filter(m=>m.status==="blocked").length+w.filter(m=>m.status==="blocked").length},lastSession:p,updatedAt:r.length?r[r.length-1].occurredAt:new Date().toISOString()},ye=uo(e.rootPath,".toolnet","work");return ru(ye,{recursive:!0}),R(uo(ye,"current.json"),ge),await t.put(`projects/${e.id}/work/current.json`,JSON.stringify(ge,null,2)+`
`,"application/json"),ge}async function St(e,t){if((await fo(e,t)).length>0)return $e(e,t);let r=await t.getText(`projects/${e.id}/work/current.json`);if(!r)return null;try{return JSON.parse(r)}catch{return null}}function du(e,t){if(!au(e))return{events:[],nextOffset:t};let n=lu(e).size,r=Number.isFinite(t)?Math.max(0,t):0;if(r>n&&(r=0),r===n)return{events:[],nextOffset:n};let o=n-r,s=Buffer.alloc(o),i=cu(e,"r");try{uu(i,s,0,o,r)}finally{iu(i)}let a=s.toString("utf8"),u=a.lastIndexOf(`
`);if(u<0)return{events:[],nextOffset:r};let c=a.slice(0,u+1);return{events:c.split(`
`).filter(Boolean).flatMap(l=>{try{return[JSON.parse(l)]}catch{return[]}}),nextOffset:r+Buffer.byteLength(c,"utf8")}}var kt=class{constructor(t){this.options=t;this.journal=new ht(t.storage)}options;journal;async learnNew(){let t=this.options.wal.loadState(),n=Number(t.sourceCursors["work.continuity.offset"]??0),r=du(this.options.wal.eventsFile,Number.isFinite(n)?n:0);if(r.events.length===0)return{scannedEvents:0,observations:0,journalWritten:!1,reconciled:!1,nextOffset:r.nextOffset};let o=yt(this.options.identity,r.events),s=!1,i=!1;return o.length>0&&(s=!!await this.journal.write(this.options.identity,o),s&&(await $e(this.options.project,this.options.storage),i=!0)),this.options.wal.setSourceCursor("work.continuity.offset",r.nextOffset),{scannedEvents:r.events.length,observations:o.length,journalWritten:s,reconciled:i,nextOffset:r.nextOffset}}};import{closeSync as vu,existsSync as wu,openSync as bu,readSync as xu,statSync as Cu}from"node:fs";var pu=new Set(["content","text","message","prompt","summary","description","title","reason","last_assistant_message","lastAssistantMessage"]);function le(e){return e.normalize("NFKC").replace(/\s+/g," ").replace(/^[\s>*#•-]+/u,"").trim()}function ln(e,t,n=0){if(!(n>6)){if(typeof e=="string"){t.push(e);return}if(Array.isArray(e)){for(let r of e.slice(0,50))ln(r,t,n+1);return}if(!(!e||typeof e!="object"))for(let[r,o]of Object.entries(e))(pu.has(r)||["data","payload","parts","messages"].includes(r))&&ln(o,t,n+1)}}function _(e,t,n,r,o,s=.95){let i=le(r);return{version:1,id:v([e.projectId,n,o.type,o.key??"",i.toLowerCase(),t.id].join("|")).slice(0,32),projectId:e.projectId,kind:n,value:i,scope:o.type,scopeKey:o.key,scopeOrder:o.order,confidence:s,evidence:{agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,eventId:t.id,sourceEventId:t.sourceEventId,sequence:t.sequence,occurredAt:t.timestamp}}}function K(e,t){let n=e.toLowerCase();for(let r of t){let o=r.toLowerCase();if(n.startsWith(`${o}:`)||n.startsWith(`${o} -`)||n.startsWith(`${o} \u2014`))return le(e.slice(r.length+1))}return null}function fu(e){let t=e.trimStart();return t.startsWith("- ")||t.startsWith("* ")||/^\d+[.)]\s+/u.test(t)}function mu(e){return le(e.trim().replace(/^[-*]\s+/u,"").replace(/^\d+[.)]\s+/u,""))}function mo(e,t){let n=[],r=new Set;function o(s){!s.value||s.value.length<3||r.has(s.id)||(r.add(s.id),n.push(s))}for(let s of t){let i=[];ln(s.data,i);for(let a of i){let u={type:"project"},c=null;for(let p of a.split(/\r?\n/u)){let l=le(p);if(!l){c=null;continue}let f=l.match(/^(?:phase|giai đoạn|giai doan|stage)\s*(\d+)\s*(?:[:\-–—]\s*)?(.*)$/iu);if(f){let w=Number(f[1]);u={type:"phase",key:`phase:${w}`,order:w,title:le(f[2]??"")},c=null;continue}let d=l.match(/^(?:todo|task|việc)\s*(\d+)\s*(?:[:\-–—]\s*)?(.*)$/iu);if(d){let w=Number(d[1]);u={type:"task",key:`task:${w}`,order:w,title:le(d[2]??"")},c=null;continue}let g=K(l,["mission","s\u1EE9 m\u1EC7nh","m\u1EE5c ti\xEAu t\u1ED5ng th\u1EC3","m\u1EE5c ti\xEAu project","project goal"]);if(g){o(_(e,s,"mission",g,{type:"project"},.99)),c=null;continue}let S=K(l,["current objective","active objective","m\u1EE5c ti\xEAu hi\u1EC7n t\u1EA1i","objective","m\u1EE5c ti\xEAu","m\u1EE5c \u0111\xEDch"]);if(S){o(_(e,s,u.type==="phase"?"phase_objective":"objective",S,u,.98)),c=null;continue}let h=K(l,["why","why this","why this phase","reason","rationale","v\xEC sao","l\xFD do","t\u1EA1i sao","\xFD ngh\u0129a"]);if(h){o(_(e,s,u.type==="phase"?"phase_why":"why",h,u,.98)),c=null;continue}let y=K(l,["desired outcome","final outcome","k\u1EBFt qu\u1EA3 cu\u1ED1i","k\u1EBFt qu\u1EA3 mong mu\u1ED1n","m\u1EE5c ti\xEAu cu\u1ED1i"]);if(y){o(_(e,s,"desired_outcome",y,{type:"project"},.98)),c=null;continue}let k=K(l,["plan rationale","approach rationale","why this approach","t\u1EA1i sao ch\u1ECDn h\u01B0\u1EDBng n\xE0y","l\xFD do ch\u1ECDn h\u01B0\u1EDBng n\xE0y","l\xFD do ch\u1ECDn ki\u1EBFn tr\xFAc"]);if(k){o(_(e,s,"plan_rationale",k,{type:"project"},.98)),c=null;continue}let I=K(l,["deliverable","output","k\u1EBFt qu\u1EA3 c\u1EA7n \u0111\u1EA1t","ph\u1EA3i t\u1EA1o ra","\u0111\u1EA7u ra"]);if(I){o(_(e,s,"phase_deliverable",I,u,.97)),c=null;continue}let O=K(l,["acceptance criteria","definition of done","done khi","ho\xE0n th\xE0nh khi","ti\xEAu ch\xED ho\xE0n th\xE0nh"]);if(O){o(_(e,s,"acceptance_criterion",O,u,.98)),c="acceptance_criterion";continue}let P=K(l,["depends on","dependency","dependencies","ph\u1EE5 thu\u1ED9c","c\u1EA7n c\xF3 tr\u01B0\u1EDBc"]);if(P){o(_(e,s,"dependency",P,u,.97)),c="dependency";continue}let T=K(l,["open question","open questions","c\xE2u h\u1ECFi m\u1EDF","ch\u01B0a quy\u1EBFt \u0111\u1ECBnh","ch\u01B0a r\xF5"]);if(T){o(_(e,s,"open_question",T,u,.95)),c="open_question";continue}let C=K(l,["constraint","constraints","r\xE0ng bu\u1ED9c","gi\u1EDBi h\u1EA1n"]);if(C){o(_(e,s,"constraint",C,u,.97)),c="constraint";continue}if(/^(?:acceptance criteria|definition of done|done khi|tiêu chí hoàn thành)\s*:?\s*$/iu.test(l)){c="acceptance_criterion";continue}if(/^(?:dependencies|dependency|phụ thuộc)\s*:?\s*$/iu.test(l)){c="dependency";continue}if(/^(?:open questions|open question|câu hỏi mở)\s*:?\s*$/iu.test(l)){c="open_question";continue}if(/^(?:constraints|constraint|ràng buộc)\s*:?\s*$/iu.test(l)){c="constraint";continue}if(c&&fu(p)){o(_(e,s,c,mu(p),u,.96));continue}c=null}}}return n}function go(e){return String(e).padStart(12,"0")}var vt=class{constructor(t){this.storage=t}storage;async write(t,n){if(n.length===0)return null;let r=Math.min(...n.map(c=>c.evidence.sequence)),o=Math.max(...n.map(c=>c.evidence.sequence)),s={version:1,projectId:t.projectId,agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,firstSequence:r,lastSequence:o,createdAt:new Date().toISOString(),observations:n},i=v(n.map(c=>c.id).sort().join("|")).slice(0,16),a=v(t.sessionKey).slice(0,12),u=[`projects/${t.projectId}`,"work","semantic","observations",`${go(r)}-${go(o)}-${a}-${i}.json`].join("/");return await this.storage.exists(u)||await this.storage.put(u,JSON.stringify(s,null,2)+`
`,"application/json"),u}};import{mkdirSync as gu}from"node:fs";import{join as yo}from"node:path";function yu(e){return{value:e.value,confidence:e.confidence,evidence:e.evidence}}function hu(e,t){if(!t)return!0;let n=e.evidence.occurredAt.localeCompare(t.evidence.occurredAt);return n!==0?n>0:e.evidence.sessionKey===t.evidence.sessionKey?e.evidence.sequence>=t.evidence.sequence:e.confidence>=t.confidence}function H(e,t){return hu(t,e)?t:e}function G(e,t=30){let n=new Set,r=[];for(let o of e){let s=o.value.normalize("NFKC").toLowerCase().replace(/\s+/g," ").trim();!s||n.has(s)||(n.add(s),r.push(o))}return r.slice(-t)}async function Su(e,t){let n=`projects/${e.id}/work/semantic/observations/`,r=await t.list(n),o=[];for(let s of r.filter(i=>i.key.endsWith(".json")).sort((i,a)=>i.key.localeCompare(a.key))){let i=await t.getText(s.key);if(i)try{let a=JSON.parse(i);a.version===1&&Array.isArray(a.observations)&&o.push(a)}catch{}}return o}function ku(e){return{key:e.scopeKey??`phase:${e.scopeOrder??0}`,order:e.scopeOrder??0,acceptanceCriteria:[],dependencies:[],openQuestions:[],constraints:[],notes:[]}}async function ho(e,t){let r=(await Su(e,t)).flatMap(S=>S.observations).sort((S,h)=>{let y=S.evidence.occurredAt.localeCompare(h.evidence.occurredAt);return y!==0?y:S.evidence.sessionKey===h.evidence.sessionKey?S.evidence.sequence-h.evidence.sequence:S.id.localeCompare(h.id)}),o,s,i,a,u,c=new Map,p=[],l=[],f=[];for(let S of r){let h=yu(S);if(S.scope==="phase"&&S.scopeKey){let y=c.get(S.scopeKey)??ku(S);switch(S.kind){case"phase_objective":y.objective=H(y.objective,h);break;case"phase_why":y.why=H(y.why,h);break;case"phase_deliverable":y.deliverable=H(y.deliverable,h);break;case"acceptance_criterion":y.acceptanceCriteria.push(h);break;case"dependency":y.dependencies.push(h);break;case"open_question":y.openQuestions.push(h);break;case"constraint":y.constraints.push(h);break;case"note":y.notes.push(h);break}c.set(y.key,y);continue}switch(S.kind){case"mission":o=H(o,h);break;case"objective":s=H(s,h);break;case"why":i=H(i,h);break;case"desired_outcome":a=H(a,h);break;case"plan_rationale":u=H(u,h);break;case"open_question":p.push(h);break;case"constraint":l.push(h);break;case"note":f.push(h);break}}for(let S of c.values())S.acceptanceCriteria=G(S.acceptanceCriteria,20),S.dependencies=G(S.dependencies,15),S.openQuestions=G(S.openQuestions,15),S.constraints=G(S.constraints,15),S.notes=G(S.notes,20);let d={version:1,projectId:e.id,projectName:e.name,mission:o,activeObjective:s,why:i,desiredOutcome:a,planRationale:u,phases:Array.from(c.values()).sort((S,h)=>S.order-h.order),openQuestions:G(p,20),constraints:G(l,20),notes:G(f,20),updatedAt:r.length?r[r.length-1].evidence.occurredAt:new Date().toISOString()},g=yo(e.rootPath,".toolnet","work");return gu(g,{recursive:!0}),R(yo(g,"semantic-current.json"),d),await t.put(`projects/${e.id}/work/semantic/current.json`,JSON.stringify(d,null,2)+`
`,"application/json"),d}async function So(e,t){let n=await t.getText(`projects/${e.id}/work/semantic/current.json`);if(!n)return null;try{return JSON.parse(n)}catch{return null}}function ju(e,t){if(!wu(e))return{events:[],nextOffset:t};let n=Cu(e).size,r=Number.isFinite(t)?Math.max(0,t):0;if(r>n&&(r=0),r===n)return{events:[],nextOffset:n};let o=Buffer.alloc(n-r),s=bu(e,"r");try{xu(s,o,0,o.length,r)}finally{vu(s)}let i=o.toString("utf8"),a=i.lastIndexOf(`
`);if(a<0)return{events:[],nextOffset:r};let u=i.slice(0,a+1);return{events:u.split(`
`).filter(Boolean).flatMap(c=>{try{return[JSON.parse(c)]}catch{return[]}}),nextOffset:r+Buffer.byteLength(u,"utf8")}}var wt=class{constructor(t){this.options=t;this.journal=new vt(t.storage)}options;journal;async learnNew(){let t=this.options.wal.loadState(),n=Number(t.sourceCursors["work.semantic.offset"]??0),r=ju(this.options.wal.eventsFile,Number.isFinite(n)?n:0);if(r.events.length===0)return{scannedEvents:0,observations:0,journalWritten:!1,reconciled:!1,nextOffset:r.nextOffset};let o=mo(this.options.identity,r.events),s=!1,i=!1;return o.length>0&&(s=!!await this.journal.write(this.options.identity,o),s&&(await ho(this.options.project,this.options.storage),i=!0)),this.options.wal.setSourceCursor("work.semantic.offset",r.nextOffset),{scannedEvents:r.events.length,observations:o.length,journalWritten:s,reconciled:i,nextOffset:r.nextOffset}}};import{existsSync as Sl,mkdirSync as kl}from"node:fs";import{join as pn}from"node:path";import{existsSync as wo,mkdirSync as Iu,readFileSync as Mu,statSync as ko,writeFileSync as Eu}from"node:fs";import{dirname as Au,join as Pu}from"node:path";var vo=64*1024,Ou=`# ToolNet Project Operating Manual

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
`;function bt(e){return Pu(e.rootPath,".toolnet","PROJECT.md")}function Tu(e){return e.normalize("NFKC").replace(/\s+/g," ").trim()}function Ru(e){let t=[],n=new Set,r=/^\s*[-*]\s+\[(enforce|advisory)\]\s+(.+?)\s*$/gimu,o;for(;o=r.exec(e);){let s=o[1].toLowerCase(),i=Tu(o[2]);if(!i)continue;let a=`${s}:${i.toLowerCase()}`;n.has(a)||(n.add(a),t.push({id:v(a).slice(0,24),mode:s,text:i,source:"manual"}))}return t}function Nu(e){let t=bt(e);return wo(t)||(Iu(Au(t),{recursive:!0}),Eu(t,Ou,{encoding:"utf8",mode:384})),t}function xt(e,t=!1){let n=t?Nu(e):bt(e);if(!wo(n))return null;if(ko(n).size>vo)throw new Error(`PROJECT.md exceeds ${vo} bytes`);let o=Mu(n,"utf8");return{path:n,content:o,digest:v(o),rules:Ru(o),bytes:Buffer.byteLength(o,"utf8"),updatedAt:new Date(ko(n).mtimeMs).toISOString()}}import{randomUUID as _u}from"node:crypto";import{closeSync as $u,existsSync as bo,fsyncSync as Lu,mkdirSync as Fu,openSync as Ku,readFileSync as Wu,statSync as Du,unlinkSync as xo,writeFileSync as zu}from"node:fs";import{dirname as qu,join as Bu}from"node:path";var Ju=new Int32Array(new SharedArrayBuffer(4));function Vu(e){e<=0||Atomics.wait(Ju,0,0,e)}function Hu(e){return Bu(e.rootPath,".toolnet","work",".current.lock")}function Gu(e){if(!Number.isInteger(e)||e<=0)return!1;try{return process.kill(e,0),!0}catch(t){return t?.code!=="ESRCH"}}function Co(e){if(!bo(e))return null;try{let t=JSON.parse(Wu(e,"utf8"));return t.version!==1||typeof t.token!="string"||typeof t.pid!="number"||typeof t.acquiredAt!="string"?null:{version:1,token:t.token,pid:t.pid,acquiredAt:t.acquiredAt}}catch{return null}}function Uu(e){try{return Date.now()-Du(e).mtimeMs}catch{return 0}}function Yu(e,t){if(!bo(e)||Uu(e)<t)return!1;let n=Co(e);return n?!Gu(n.pid):!0}function Xu(e,t){if(!Yu(e,t))return!1;try{return xo(e),!0}catch{return!1}}function Qu(e,t){let n={version:1,token:t,pid:process.pid,acquiredAt:new Date().toISOString()},r=Ku(e,"wx",384);try{zu(r,`${JSON.stringify(n,null,2)}
`,{encoding:"utf8"}),Lu(r)}finally{$u(r)}}function Zu(e,t){if(Co(e)?.token===t)try{xo(e)}catch{}}function el(e,t={}){let n=Math.max(100,t.timeoutMs??5e3),r=Math.max(5,t.retryMs??20),o=Math.max(n*2,t.staleMs??3e4),s=Hu(e);Fu(qu(s),{recursive:!0});let i=_u(),a=Date.now()+n;for(;;)try{Qu(s,i);let u=!1;return()=>{u||(u=!0,Zu(s,i))}}catch(u){if(u?.code!=="EEXIST")throw u;if(Xu(s,o))continue;if(Date.now()>=a)throw new Error(`Timed out acquiring project work lock: ${s}`);Vu(r)}}function jo(e,t,n={}){let r=el(e,n);try{return t()}finally{r()}}import{closeSync as tl,existsSync as nl,fsyncSync as rl,mkdirSync as ol,openSync as sl,readFileSync as il,renameSync as al,writeFileSync as cl}from"node:fs";import{dirname as ul,join as ll}from"node:path";function dl(e,t){ol(ul(e),{recursive:!0});let n=`${e}.tmp-${process.pid}-${Date.now()}`,r=sl(n,"w",384);try{cl(r,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8"}),rl(r)}finally{tl(r)}al(n,e)}function Oo(e){return ll(e.rootPath,".toolnet","work","current.json")}function dn(e){let t=Oo(e);if(!nl(t))return null;try{let n=JSON.parse(il(t,"utf8"));return n.version!==1||n.projectId!==e.id?null:n}catch{return null}}function Ct(e){return e.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim()}function $(e,t,n){let r=[],o=new Set;for(let s of[...e,...t].reverse()){let i=Ct(s);if(!(!i||o.has(i))&&(o.add(i),r.push(s),r.length>=n))break}return r.reverse()}function pl(e,t,n=20){let r=new Map;for(let o of[...e,...t]){let s=`${o.kind}|${Ct(o.command)}`;r.delete(s),r.set(s,o)}return Array.from(r.values()).slice(-n)}function fl(e){return e.kind==="phase"?/^Phase\s+\d+$/iu.test(e.text):e.kind==="task"?/^(?:TODO|Task|Việc)\s+\d+$/iu.test(e.text):!1}function Io(e,t){let n=t.status??e?.status??"pending",r=n;e?.status==="completed"&&n!=="completed"&&(r="completed"),e&&n==="pending"&&(e.status==="in_progress"||e.status==="blocked")&&(r=e.status);let o=e&&fl(t)?e.title:t.text;return{id:e?.id??t.id,title:o,status:r,order:t.order??e?.order,confidence:Math.max(e?.confidence??0,t.confidence),updatedAt:t.occurredAt,updatedBy:{agent:t.agent,nativeSessionId:t.nativeSessionId,eventId:t.eventId}}}function Mo(e){let t=new Map;for(let n of e){let r=n.order!==void 0?`order:${n.order}`:Ct(n.title);t.set(r,n)}return t}function Eo(e){return e.order!==void 0?`order:${e.order}`:Ct(e.key||e.text)}function Ao(e){return Array.from(e).sort((t,n)=>{let r=t.order??Number.MAX_SAFE_INTEGER,o=n.order??Number.MAX_SAFE_INTEGER;return r!==o?r-o:t.updatedAt.localeCompare(n.updatedAt)})}function Po(e){return e.find(t=>t.status==="in_progress")??e.find(t=>t.status==="blocked")??e.find(t=>t.status==="pending")}function ml(e,t){let n=dn(e),r=Mo(n?.phases??[]),o=Mo(n?.tasks??[]),s=n?.currentRequest,i=n?.currentActivity,a=n?.goal,u=n?.plan,c=n?.lastSession,p=[],l=[],f=[],d=[],g=[],S=[...n?.activeFiles??[]],h=[],y=[],k=[],I=[],O=[],P=[],T=[...t].sort((m,b)=>{let B=m.occurredAt.localeCompare(b.occurredAt);return B!==0?B:m.sequence-b.sequence});for(let m of T)switch(m.kind){case"request":s=m.text;break;case"activity":i=m.text;break;case"goal":a=m.text;break;case"plan":u=m.text;break;case"phase":{let b=Eo(m);r.set(b,Io(r.get(b),m));break}case"task":{let b=Eo(m);o.set(b,Io(o.get(b),m));break}case"decision":p.push(m.text);break;case"blocker":l.push(m.text);break;case"warning":f.push(m.text);break;case"next_action":d.push(m.text);break;case"file":{g.push(m.text);let b=m.fileAction??"active",B=S.indexOf(m.text);B>=0&&S.splice(B,1),b!=="deleted"&&S.push(m.text),b==="modified"?h.push(m.text):b==="created"?y.push(m.text):b==="deleted"&&k.push(m.text);break}case"command":I.push(m.text);break;case"test":O.push(m.text),m.checkKind&&P.push({kind:m.checkKind,command:m.text,status:m.checkStatus??"unknown",updatedAt:m.occurredAt,agent:m.agent,nativeSessionId:m.nativeSessionId});break;case"session":c={agent:m.agent,nativeSessionId:m.nativeSessionId,sessionKey:m.sessionKey,updatedAt:m.occurredAt};break}let C=Ao(r.values()),w=Ao(o.values()),D=Po(C),z=Po(w),Nt=$(n?.nextActions??[],[...d,...z?[z.title]:[],...!z&&D?[D.title]:[],...w.filter(m=>m.status==="pending").slice(0,5).map(m=>m.title)],8),_t=$(n?.blockers??[],[...l,...C.filter(m=>m.status==="blocked").map(m=>m.title),...w.filter(m=>m.status==="blocked").map(m=>m.title)],20),ge=T.length>0?T[T.length-1].occurredAt:n?.updatedAt??new Date().toISOString(),ye={version:1,projectId:e.id,projectName:e.name,currentRequest:s,currentActivity:i,goal:a,plan:u,phases:C,tasks:w,decisions:$(n?.decisions??[],p,20),blockers:_t,warnings:$(n?.warnings??[],f,20),nextActions:Nt,filesTouched:$(n?.filesTouched??[],g,30),activeFiles:$([],S,5),modifiedFiles:$(n?.modifiedFiles??[],h,30),createdFiles:$(n?.createdFiles??[],y,30),deletedFiles:$(n?.deletedFiles??[],k,30),commands:$(n?.commands??[],I,20),tests:$(n?.tests??[],O,20),checks:pl(n?.checks??[],P,20),currentPhase:D,currentTask:z,progress:{phasesTotal:C.length,phasesCompleted:C.filter(m=>m.status==="completed").length,tasksTotal:w.length,tasksCompleted:w.filter(m=>m.status==="completed").length,blocked:C.filter(m=>m.status==="blocked").length+w.filter(m=>m.status==="blocked").length},lastSession:c,updatedAt:ge};return dl(Oo(e),ye),ye}function To(e,t){return jo(e,()=>ml(e,t))}function A(e,t){let n=new Set,r=[];for(let o of e){let s=o.replace(/\s+/g," ").trim();if(!s)continue;let i=s.normalize("NFKC").toLowerCase();if(!n.has(i)&&(n.add(i),r.push(s),r.length>=t))break}return r}function Ro(e){if(e)return{id:e.id,title:e.title,status:e.status}}function gl(e,t=[]){let n=t.slice(-10);if(n.some(o=>o.status==="failed"))return"failing";if(n.some(o=>o.status==="passed"))return"passing";let r=e.slice(-10).join(`
`).toLowerCase();return/(?:failed|failing|failure|error|✗|❌)/u.test(r)?"failing":/(?:passed|passing|green|success|✓|✅)/u.test(r)?"passing":"unknown"}function yl(e){return v(JSON.stringify(e))}function hl(e){let t=[];for(let n of e){if(!n)continue;let r=n.match(/https?:\/\/[^\s<>"'`)\]}]+/giu)??[];for(let o of r){let s=o.replace(/[.,;:!?]+$/gu,"").trim();s&&t.push(s)}}return A(t,30)}function No(e){let{project:t,identity:n,state:r}=e,o=r.activeFiles?.at(-1)??r.filesTouched.at(-1),s=r.phases.filter(k=>k.status==="completed").map(k=>k.title),i=r.tasks.filter(k=>k.status==="completed").map(k=>k.title),a=r.phases.filter(k=>k.status!=="completed"&&k.status!=="cancelled").map(k=>k.title),u=r.tasks.filter(k=>k.status!=="completed"&&k.status!=="cancelled").map(k=>k.title),c=new Set(r.tasks.filter(k=>k.status==="completed").map(k=>k.title.normalize("NFKC").toLowerCase().replace(/\s+/gu," ").trim())),p=A(r.nextActions.filter(k=>!c.has(k.normalize("NFKC").toLowerCase().replace(/\s+/gu," ").trim())),10),l=A([...u,...p],15),f=A(r.tests.slice().reverse(),10),d=A([...(r.activeFiles??[]).slice().reverse(),...r.filesTouched.slice().reverse()],20),g={schema:"toolnet.handoff.v2",version:2,project:{id:t.id,name:t.name},source:{agent:n.agent,nativeSessionId:n.nativeSessionId,sessionKey:n.sessionKey,sequence:e.sequence,reason:e.reason},capturedAt:e.capturedAt??new Date().toISOString(),goal:r.goal,request:r.currentRequest,activity:r.currentActivity,current:{phase:Ro(r.currentPhase),task:Ro(r.currentTask),file:o},completed:{phases:A(s,20),tasks:A(i,30)},remaining:{phases:A(a,20),tasks:A(u,30),todos:l},nextAction:p[0],blockers:A(r.blockers.slice().reverse(),10),decisions:A(r.decisions.slice().reverse(),10),files:{current:o,recent:d,active:A(r.activeFiles??[],10),modified:A(r.modifiedFiles??[],20),created:A(r.createdFiles??[],20),deleted:A(r.deletedFiles??[],20)},tests:{status:gl(r.tests,r.checks),recent:f,checks:(r.checks??[]).slice(-10).map(k=>({kind:k.kind,status:k.status,command:k.command}))},evidence:{commands:A((r.commands??[]).slice().reverse(),20),references:hl([r.currentRequest,r.currentActivity,r.goal,r.plan,...r.decisions,...r.blockers,...r.warnings,...r.nextActions,...r.filesTouched,...r.commands??[],...r.tests,...(r.checks??[]).map(k=>k.command)])},attention:A(e.attention??[],20),progress:r.progress},{capturedAt:S,source:h,...y}=g;return{...g,stateDigest:yl(y)}}function vl(e){return!!(e.currentRequest||e.currentActivity||e.goal||e.plan||e.phases.length>0||e.tasks.length>0||e.nextActions.length>0||e.blockers.length>0||e.decisions.length>0||e.filesTouched.length>0)}function _o(e,t,n,r,o){if(!vl(n))return null;let s=xt(e,!1),a=[...s?s.rules.filter(l=>l.mode==="enforce").map(l=>l.text):[],...n.warnings].slice(0,20),u=No({project:e,identity:t,state:n,reason:r,sequence:o,attention:a}),c=u.stateDigest;return{version:1,id:v([e.id,t.sessionKey,c].join("|")).slice(0,24),projectId:e.id,projectName:e.name,createdAt:new Date().toISOString(),reason:r,sourceSession:{agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,sequence:o},currentRequest:n.currentRequest,currentActivity:n.currentActivity,goal:n.goal,plan:n.plan,progress:n.progress,currentPhase:n.currentPhase,currentTask:n.currentTask,incompletePhases:n.phases.filter(l=>l.status!=="completed"&&l.status!=="cancelled"),incompleteTasks:n.tasks.filter(l=>l.status!=="completed"&&l.status!=="cancelled"),nextActions:u.remaining.todos.slice(0,10),blockers:n.blockers.slice(-10),decisions:n.decisions.slice(-10),warnings:n.warnings.slice(-10),attention:a,filesTouched:n.filesTouched.slice(-20),activeFiles:n.activeFiles?.slice(-10),modifiedFiles:n.modifiedFiles?.slice(-20),createdFiles:n.createdFiles?.slice(-20),deletedFiles:n.deletedFiles?.slice(-20),tests:n.tests.slice(-15),checks:n.checks?.slice(-10),stateDigest:c,continuity:u}}function $o(e,t){let n=pn(e.rootPath,".toolnet","work","handoffs");kl(n,{recursive:!0});let r=pn(n,`${t.id}.json`);Sl(r)||R(r,t),R(pn(e.rootPath,".toolnet","work","handoff-latest.json"),t)}function Lo(e){let t=_o(e.project,e.identity,e.state,e.reason,e.sequence);return t?($o(e.project,t),t):null}var jt=class{constructor(t){this.options=t}options;async capture(t,n){let r=dn(this.options.project);r||(r=await St(this.options.project,this.options.storage)),r||(r=await $e(this.options.project,this.options.storage));let o=_o(this.options.project,this.options.identity,r,t,n);if(!o)return null;$o(this.options.project,o);let s=`projects/${this.options.project.id}/work/handoffs/${o.id}.json`;return await this.options.storage.exists(s)||await this.options.storage.put(s,JSON.stringify(o,null,2)+`
`,"application/json"),await this.options.storage.put(`projects/${this.options.project.id}/work/handoff-latest.json`,JSON.stringify(o,null,2)+`
`,"application/json"),o}};async function Fo(e,t){let n=await t.getText(`projects/${e.id}/work/handoff-latest.json`);if(!n)return null;try{return JSON.parse(n)}catch{return null}}import{existsSync as wl,readFileSync as bl,writeFileSync as xl}from"node:fs";import{join as Cl}from"node:path";var Wo="<!-- TOOLNET:STABLE-WORK:BEGIN -->",fn="<!-- TOOLNET:STABLE-WORK:END -->";function mn(e){switch(e.status){case"completed":return"[x]";case"in_progress":return"[~]";case"blocked":return"[!]";case"cancelled":return"[-]";default:return"[ ]"}}function W(e,t){return t.length?["",`${e}:`,...t.map(n=>`- ${n}`)]:[]}function Ko(e,t){return t.length?["",`${e}:`,...t.map(n=>`- ${mn(n)} ${n.title}`)]:[]}function jl(e){let t=[Wo,"# ToolNet Stable Work State","",`Updated: ${e.updatedAt}`];return e.lastSession&&t.push(`Last agent: ${e.lastSession.agent}`,`Last session: ${e.lastSession.nativeSessionId}`),e.currentRequest&&t.push("","Current request:",e.currentRequest),e.currentActivity&&t.push("","Current activity:",e.currentActivity),e.goal&&t.push("","Goal:",e.goal),e.plan&&t.push("","Plan:",e.plan),e.currentPhase&&t.push("","Current phase:",`${mn(e.currentPhase)} ${e.currentPhase.title}`),e.currentTask&&t.push("","Current task:",`${mn(e.currentTask)} ${e.currentTask.title}`),t.push(...Ko("Phases",e.phases)),t.push(...Ko("TODO / Tasks",e.tasks)),t.push(...W("Next actions",e.nextActions)),t.push(...W("Blockers",e.blockers)),t.push(...W("Important decisions",e.decisions)),t.push(...W("Active files",e.activeFiles??[])),t.push(...W("Modified files",e.modifiedFiles??[])),t.push(...W("Created files",e.createdFiles??[])),t.push(...W("Deleted files",e.deletedFiles??[])),t.push(...W("Files touched",e.filesTouched)),t.push(...W("Recent commands",e.commands??[])),t.push(...W("Checks",(e.checks??[]).map(n=>`[${n.status}] ${n.kind}: ${n.command}`))),t.push("","Progress:",`- Phases: ${e.progress.phasesCompleted}/${e.progress.phasesTotal}`,`- Tasks: ${e.progress.tasksCompleted}/${e.progress.tasksTotal}`,`- Blocked: ${e.progress.blocked}`,"","Continuation:","- Resume current unfinished task.","- Never redo completed TODO/Phase unless explicitly requested.","- Ask ToolNet Memory for deeper history only when necessary.",fn),t.join(`
`)}function Do(e,t){let n=Cl(e.rootPath,".toolnet","current.md"),r="";if(wl(n))try{r=bl(n,"utf8")}catch{r=""}r=r.replace(/<!-- TOOLNET:AUTO-CURRENT:BEGIN -->[\s\S]*?<!-- TOOLNET:AUTO-CURRENT:END -->/gu,"");let o=jl(t),s=r.indexOf(Wo),i=r.indexOf(fn),a;s>=0&&i>=s?a=[r.slice(0,s).trimEnd(),o,r.slice(i+fn.length).trimStart()].filter(Boolean).join(`

`):a=r.trim()?`${r.trim()}

${o}`:o,xl(n,`${a.trim()}
`,{encoding:"utf8",mode:384})}import{existsSync as iy,mkdirSync as Il,readFileSync as ay,renameSync as Ml,writeFileSync as El}from"node:fs";import{dirname as Al,join as Pl}from"node:path";function Ol(e){return Pl(e.rootPath,".toolnet","context","session-origin.json")}function Tl(e,t){Il(Al(e),{recursive:!0});let n=`${e}.tmp-${process.pid}-${Date.now()}`;El(n,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Ml(n,e)}function It(e,t){return[...e].filter(n=>n.kind===t).sort((n,r)=>{let o=n.occurredAt.localeCompare(r.occurredAt);return o!==0?o:n.sequence-r.sequence}).at(-1)}function zo(e,t){let n=It(t.observations,"file"),r=It(t.observations,"next_action"),o=It(t.observations,"blocker"),s=It(t.observations,"decision"),i={version:1,projectId:e.id,agent:t.agent,nativeSessionId:t.nativeSessionId,updatedAt:t.workState.updatedAt,currentRequest:t.workState.currentRequest,currentActivity:t.workState.currentActivity,currentTask:t.workState.currentTask?.title,currentPhase:t.workState.currentPhase?.title,lastTouchedFile:n?.text??t.workState.activeFiles?.at(-1)??t.workState.filesTouched.at(-1),latestNextAction:r?.text??t.workState.nextActions.at(-1),latestBlocker:o?.text??t.workState.blockers.at(-1),latestDecision:s?.text??t.workState.decisions.at(-1)};return Tl(Ol(e),i),i}import{existsSync as qo,mkdirSync as Rl,readFileSync as Nl}from"node:fs";import{join as gn}from"node:path";function Bo(e){return gn(e.rootPath,".toolnet","memory","checkpoints")}function Jo(e){return gn(Bo(e),"latest.json")}function _l(e){let t=Jo(e);if(!qo(t))return null;try{let n=JSON.parse(Nl(t,"utf8"));return n.schema!=="toolnet.memory.checkpoint.v1"||n.project.id!==e.id?null:n}catch{return null}}function $l(e){return["rule","architecture","decision","fix"].includes(e)}function Ll(e,t){return t.length===0?[]:st(e,t).candidates.filter(r=>$l(r.kind)&&r.knowledgeClass!=="transient"&&r.importanceScore>=.65).map(r=>({fingerprint:r.fingerprint,kind:r.kind,content:r.content,knowledgeClass:r.knowledgeClass,importanceScore:r.importanceScore,confidence:r.confidence,createdAt:r.createdAt,agent:e.agent,nativeSessionId:e.nativeSessionId}))}function Fl(e,t){let n=new Map;for(let r of[...e,...t]){let o=n.get(r.fingerprint);(!o||r.importanceScore>o.importanceScore)&&n.set(r.fingerprint,r)}return Array.from(n.values()).sort((r,o)=>o.importanceScore-r.importanceScore||o.createdAt.localeCompare(r.createdAt)).slice(0,80)}function Kl(e){return{request:e.currentRequest,activity:e.currentActivity,goal:e.goal,phase:e.currentPhase?{title:e.currentPhase.title,status:e.currentPhase.status}:void 0,task:e.currentTask?{title:e.currentTask.title,status:e.currentTask.status}:void 0,phases:e.phases.map(t=>({title:t.title,status:t.status})),tasks:e.tasks.map(t=>({title:t.title,status:t.status})),activeFiles:e.activeFiles??[],modifiedFiles:e.modifiedFiles??[],createdFiles:e.createdFiles??[],deletedFiles:e.deletedFiles??[],checks:e.checks??[],blockers:e.blockers,decisions:e.decisions,nextActions:e.nextActions}}function Vo(e,t,n,r){let o=_l(e),s=Fl(o?.durableFacts??[],Ll(t,n)),i=n.at(-1)?.sequence??o?.source.sequence??0,a=r.phases.filter(h=>h.status==="completed").map(h=>h.title),u=r.tasks.filter(h=>h.status==="completed").map(h=>h.title),c=r.phases.filter(h=>h.status!=="completed"&&h.status!=="cancelled").map(h=>h.title),p=r.tasks.filter(h=>h.status!=="completed"&&h.status!=="cancelled").map(h=>h.title),l={work:Kl(r),durableFacts:s.map(h=>h.fingerprint).sort()},f=v(JSON.stringify(l)).slice(0,32),d={schema:"toolnet.memory.checkpoint.v1",version:1,project:{id:e.id,name:e.name},source:{agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,sequence:i},capturedAt:new Date().toISOString(),request:r.currentRequest,activity:r.currentActivity,goal:r.goal,current:{phase:r.currentPhase,task:r.currentTask},completed:{phases:a,tasks:u},remaining:{phases:c,tasks:p},files:{active:r.activeFiles??[],modified:r.modifiedFiles??[],created:r.createdFiles??[],deleted:r.deletedFiles??[]},checks:r.checks??[],blockers:r.blockers.slice(-10),decisions:r.decisions.slice(-15),nextActions:r.nextActions.slice(0,10),durableFacts:s,stateDigest:f},g=Bo(e);Rl(g,{recursive:!0,mode:448});let S=gn(g,`${f}.json`);return qo(S)||R(S,d),R(Jo(e),d),d}function Ho(e,t,n){if(process.env.TOOLNET_LOCAL_CHECKPOINT==="0"||n.length===0)return{updated:!1,observations:0};let r=yt(t,n);if(r.length===0)return{updated:!1,observations:0};let o=To(e,r);Do(e,o),zo(e,{agent:t.agent,nativeSessionId:t.nativeSessionId,observations:r,workState:o});try{Vo(e,t,n,o)}catch{}try{Lo({project:e,identity:t,state:o,reason:"continuous-checkpoint",sequence:n.at(-1)?.sequence??0})}catch{}return{updated:!0,observations:r.length}}var Le=class{identity;wal;remote;sanitizer=new U;learner;continuity;semantic;handoff;project;title;metadata;constructor(t){this.project=t.project,this.identity=Ln(t.project,t.agent,t.nativeSessionId),this.title=t.title,this.metadata=this.sanitizer.sanitizeValue(t.metadata??{}),this.wal=new et(this.identity,t.eventContext),this.remote=new Ge(t.storage,t.maxEventsPerChunk??100,t.maxChunkBytes??512*1024),this.learner=new mt({project:t.project,storage:t.storage,identity:this.identity,wal:this.wal}),this.continuity=new kt({project:t.project,storage:t.storage,identity:this.identity,wal:this.wal}),this.semantic=new wt({project:t.project,storage:t.storage,identity:this.identity,wal:this.wal}),this.handoff=new jt({project:t.project,storage:t.storage,identity:this.identity})}sanitizeEvent(t){let n=t.provenance?{...t.provenance,metadata:this.sanitizer.sanitizeValue(t.provenance.metadata)}:void 0;return{...t,data:this.sanitizer.sanitizeValue(t.data??{}),provenance:n}}checkpointLocal(t){if(t.length!==0)try{Ho(this.project,this.identity,t)}catch{}}start(t={}){let n=this.wal.loadState();return this.record({type:n.lastSequence===0?"session_start":"session_resume",data:t,provenance:{source:this.identity.agent}})}record(t){let n=this.wal.append([this.sanitizeEvent(t)]);return this.checkpointLocal(n),n[0]}recordMany(t){let n=this.wal.append(t.map(r=>this.sanitizeEvent(r)));return this.checkpointLocal(n),n}setSourceCursor(t,n){this.wal.setSourceCursor(t,n)}async flush(){let t=this.wal.readPending(),n=this.wal.loadState(),r=await this.remote.append(this.identity,t.events,n.sourceCursors,{title:this.title,metadata:this.metadata});if(t.events.length>0){let o=t.events[t.events.length-1];this.wal.markRemote(o.sequence,t.endOffset)}if(process.env.TOOLNET_SESSION_LEARNING!=="0")try{await this.learner.learnNew()}catch{}if(process.env.TOOLNET_WORK_CONTINUITY!=="0")try{await this.continuity.learnNew()}catch{}if(process.env.TOOLNET_SEMANTIC_CONTINUITY!=="0")try{await this.semantic.learnNew()}catch{}if(process.env.TOOLNET_SMART_HANDOFF!=="0"&&t.events.length>0)try{let o=t.events[t.events.length-1],s=["session_idle","session_end","session_compact"].includes(o.type)?o.type:"checkpoint";await this.handoff.capture(s,o.sequence)}catch{}return r}async idle(t={}){return this.record({type:"session_idle",data:t,provenance:{source:this.identity.agent}}),this.flush()}async end(t={}){return this.record({type:"session_end",data:t,provenance:{source:this.identity.agent}}),this.flush()}status(){return this.wal.loadState()}recoverRemote(){return this.remote.recover(this.identity)}};var Wl=[/^<SYSTEM MESSAGE>/i,/^<EPHEMERAL MESSAGE>/i,/^<system>/i,/^<ephemeral>/i,/^ManageTask:/i,/^Task \d+ status:/i,/^Task \d+ killed/i,/^Task \d+ loading/i,/^Thought for \d+ tokens/i,/^Prioritizing Tool Usage/i,/^Tool call:/i,/^Tool response:/i,/^npm notice/i,/^npm WARN/i,/^added \d+ packages/i,/^removed \d+ packages/i,/^up to date/i,/^\d+ packages are looking for funding/i,/^run `npm fund` for details/i,/^[\d.]+%/,/^\[={10,}\]/,/^Loading\.\.\./i,/^Processing\.\.\./i,/^bash-\d+\.\d+\$/,/^\$ /,/^\s*$/],Dl=[/api[_-]?key[:\s=]+[^\s]+/gi,/token[:\s=]+[^\s]+/gi,/secret[:\s=]+[^\s]+/gi,/password[:\s=]+[^\s]+/gi,/bearer\s+[^\s]+/gi,/authorization:\s*[^\s]+/gi],zl=["decision","decided","rule","convention","architecture","pattern","fixed","resolved","implemented","created","updated","deleted","deployed","blocker","blocked","issue","bug","error","next","todo","action","requirement","must","should","important"];function ql(e){let t=e.toLowerCase();return zl.some(n=>t.includes(n))}function Bl(e){if(!e.trim())return!0;for(let t of Wl)if(t.test(e))return!0;return ql(e),!1}function Jl(e){let t=e;for(let n of Dl)t=t.replace(n,r=>{let o=r.split(/[:\s=]+/);return o.length>1?`${o[0]}: [REDACTED]`:"[REDACTED]"});return t}function yn(e){let t=e.trim();return t?Bl(t)?{content:"",filtered:!0,reason:"noise"}:{content:Jl(t),filtered:!1}:{content:"",filtered:!0,reason:"empty"}}function Mt(e){let t={};for(let[n,r]of Object.entries(e))if(typeof r=="string"){let o=yn(r);o.filtered||(t[n]=o.content)}else r&&typeof r=="object"&&!Array.isArray(r)?t[n]=Mt(r):Array.isArray(r)?t[n]=r.map(o=>{if(typeof o=="string"){let s=yn(o);return s.filtered?null:s.content}return o&&typeof o=="object"?Mt(o):o}).filter(o=>o!==null):t[n]=r;return t}function Go(e){let t=typeof e.type=="string"?e.type.toLowerCase():"";if(t.includes("system")||t.includes("ephemeral")||t==="tool_call"&&!e.result)return!0;if(e.data&&typeof e.data=="object"){let n=e.data,r=typeof n.content=="string"?n.content:"";if(r&&yn(r).filtered)return!0}return!1}function ts(){try{let t=Hl("opencode",["db","path"],{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:5e3}).trim();if(t)return t}catch{}if(process.env.OPENCODE_DB)return process.env.OPENCODE_DB;let e=process.env.XDG_DATA_HOME??Uo(Gl(),".local","share");return Uo(e,"opencode","opencode.db")}function x(e){return typeof e=="string"?e:""}function re(e){if(typeof e=="number"&&Number.isFinite(e))return e;if(typeof e=="bigint")return Number(e);if(typeof e=="string"){let t=Number(e);if(Number.isFinite(t))return t}return 0}function At(e){if(e&&typeof e=="object"&&!Buffer.isBuffer(e))return e;if(typeof e!="string")return{};try{let t=JSON.parse(e);if(t&&typeof t=="object"&&!Array.isArray(t))return t}catch{}return{}}function de(e){let t=re(e);if(t<=0)return new Date().toISOString();t<1e11&&(t*=1e3);let n=new Date(t);return Number.isNaN(n.getTime())?new Date().toISOString():n.toISOString()}function Et(e,t){if(!t)return!1;let n=Yo(e),r=Yo(t);if(n===r)return!0;let o=Yl(n,r);return o!==""&&o!==".."&&!o.startsWith(`..${process.platform==="win32"?"\\":"/"}`)&&!Ul(o)}function Xo(e){if(!e)return{time:-1,id:""};try{let t=JSON.parse(e);return{time:typeof t.time=="number"?t.time:-1,id:typeof t.id=="string"?t.id:""}}catch{return{time:-1,id:""}}}function Qo(e){return JSON.stringify(e)}function ns(e){if(!Vl(e))throw new Error(`OpenCode database not found: ${e}`);let t=new Xl(e,{readOnly:!0});return t.exec("PRAGMA query_only = ON"),t.exec("PRAGMA busy_timeout = 3000"),t}function Ql(e,t){let n=e.prepare(`
      SELECT *
      FROM "session"
      WHERE id = ?
      LIMIT 1
      `).get(t);if(!n)throw new Error(`OpenCode session not found: ${t}`);return n}function rs(e,t,n){let r=x(t.directory);if(r&&Et(n.rootPath,r))return!0;let o=x(t.project_id);if(o){try{let s=e.prepare(`
          SELECT *
          FROM "project"
          WHERE id = ?
          LIMIT 1
          `).get(o);if(s)for(let i of["worktree","directory","path"]){let a=x(s[i]);if(a&&Et(n.rootPath,a))return!0}}catch{}try{if(e.prepare(`
          SELECT directory
          FROM "project_directory"
          WHERE project_id = ?
          `).all(o).some(i=>Et(n.rootPath,x(i.directory))))return!0}catch{}}try{let s=e.prepare(`
        SELECT data
        FROM "message"
        WHERE session_id = ?
        ORDER BY time_created DESC
        LIMIT 20
        `).all(x(t.id));for(let i of s){let a=At(i.data),u=a.path&&typeof a.path=="object"?a.path:{};for(let c of[x(u.cwd),x(u.root)])if(c&&Et(n.rootPath,c))return!0}}catch{}return!1}function Zo(e,t,n,r){let o=`
    SELECT *,
      COALESCE(
        time_updated,
        time_created,
        0
      ) AS __clock
    FROM "${t}"
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
    `;return e.prepare(o).all(n,r.time,r.time,r.id)}function es(e,t){let n=e[e.length-1];return n?{time:re(n.__clock),id:x(n.id)}:t}function Zl(e,t){let n=At(t.data),r=x(n.role),o=re(t.__clock),s=x(t.id),i="message";return r==="user"?i="user_prompt":r==="assistant"&&(i="assistant_message"),{clock:o,order:0,event:{type:i,timestamp:de(o),role:r||void 0,sourceEventId:`message:${s}:${o}`,sourceSequence:`${o}:${s}`,data:{messageId:s,...n},provenance:{source:"opencode",sourcePath:e,sourceTable:"message",sourceRowId:s,sourceOffset:`${o}:${s}`}}}}function ed(e){let t={...e},n=e.state&&typeof e.state=="object"&&!Array.isArray(e.state)?{...e.state}:void 0;if(n){let r=n.output;if(typeof r=="string"){let o=r.replace(/\r\n/g,`
`),s=500;n.outputSummary=o.length<=s?o:`${o.slice(0,350)}
...[ToolNet truncated ${o.length-s} chars]...
${o.slice(-150)}`,delete n.output}else r!==void 0&&(n.outputSummary="[non-text tool output omitted]",delete n.output);if(n.input&&typeof n.input=="object"&&!Array.isArray(n.input)){let o={...n.input};for(let[s,i]of Object.entries(o))typeof i=="string"&&i.length>1e3&&(o[s]=`${i.slice(0,1e3)}...[ToolNet truncated]`);n.input=o}t.state=n}return t}function td(e,t){let n=x(t.message_id);if(n)try{let r=e.prepare(`
        SELECT data
        FROM "message"
        WHERE id = ?
        LIMIT 1
        `).get(n);if(!r)return;let o=At(r.data);return x(o.role)||void 0}catch{return}}function nd(e,t,n){let r=At(n.data),o=x(r.type),s=re(n.__clock),i=x(n.id),a=x(n.message_id),u=td(e,n),c="message_part";return o==="tool"?c="tool_call":o==="snapshot"&&(c="artifact"),{clock:s,order:1,event:{type:c,timestamp:de(s),role:u,sourceEventId:`part:${i}:${s}`,sourceSequence:`${s}:${i}`,data:{partId:i,messageId:a,...o==="tool"?ed(r):r},provenance:{source:"opencode",sourcePath:t,sourceTable:"part",sourceRowId:i,sourceOffset:`${s}:${i}`}}}}async function hn(e){let t=e.dbPath??ts(),n=ns(t);try{let r;try{r=Ql(n,e.nativeSessionId)}catch{let y=new Le({project:e.project,storage:e.storage,agent:"opencode",nativeSessionId:e.nativeSessionId,metadata:{source:"opencode.db",deleted:!0},eventContext:{source:"opencode",cwd:e.project.rootPath}});y.status().lastSequence===0&&y.recordMany([{type:"custom",timestamp:new Date().toISOString(),sourceEventId:`session:${e.nativeSessionId}:deleted`,data:{event:"session_deleted"},provenance:{source:"opencode"}}]);let k=await y.flush();return{nativeSessionId:e.nativeSessionId,importedMessages:0,importedParts:0,recordedEvents:0,eventCount:k.eventCount,chunkCount:k.chunkCount,status:k.status,durability:e.localOnly?"local":"remote"}}if(!rs(n,r,e.project))throw new Error(["OpenCode session does not belong to current ToolNet project.",`Session: ${e.nativeSessionId}`,`Project: ${e.project.rootPath}`,`Session directory: ${x(r.directory)||"unknown"}`].join(" "));let o=new Le({project:e.project,storage:e.storage,agent:"opencode",nativeSessionId:e.nativeSessionId,title:x(r.title)||void 0,metadata:{source:"opencode.db",openCodeProjectId:x(r.project_id)||void 0,directory:x(r.directory)||void 0},eventContext:{source:"opencode",cwd:x(r.directory)||e.project.rootPath}}),s=o.status(),i=Xo(s.sourceCursors["opencode.message"]),a=Xo(s.sourceCursors["opencode.part"]),u=Zo(n,"message",e.nativeSessionId,i),c=Zo(n,"part",e.nativeSessionId,a),p=[];if(s.lastSequence===0){let y=re(r.time_created);p.push({clock:y,order:-1,event:{type:"session_start",timestamp:de(y),sourceEventId:`session:${e.nativeSessionId}:created:${y}`,data:{title:x(r.title)||void 0,directory:x(r.directory)||void 0,openCodeProjectId:x(r.project_id)||void 0},provenance:{source:"opencode",sourcePath:t,sourceTable:"session",sourceRowId:e.nativeSessionId}}})}p.push(...u.map(y=>Zl(t,y))),p.push(...c.map(y=>nd(n,t,y)));let l=re(r.time_updated)||re(r.time_created);e.compacted&&p.push({clock:l,order:98,event:{type:"session_compact",timestamp:de(l),sourceEventId:`session:${e.nativeSessionId}:compact:${l}`,data:{},provenance:{source:"opencode"}}}),e.error?p.push({clock:l,order:99,event:{type:"error",timestamp:de(l),sourceEventId:`session:${e.nativeSessionId}:error:${l}`,data:{source:"session.error"},provenance:{source:"opencode"}}}):e.idle&&p.push({clock:l,order:100,event:{type:"session_idle",timestamp:de(l),sourceEventId:`session:${e.nativeSessionId}:idle:${l}`,data:{},provenance:{source:"opencode"}}}),p.sort((y,k)=>y.clock-k.clock||y.order-k.order);let f=p.filter(y=>!Go(y.event.data)).map(y=>({...y,event:{...y.event,data:Mt(y.event.data)}})),d=o.recordMany(f.map(y=>y.event)),g=es(u,i),S=es(c,a);if(o.setSourceCursor("opencode.message",Qo(g)),o.setSourceCursor("opencode.part",Qo(S)),f.length>0)try{let y=f.map(I=>JSON.stringify(I.event.data)),k=ot(y,e.nativeSessionId);o.setSourceCursor("opencode.session.summary",k.summary),o.setSourceCursor("opencode.session.facts_count",k.durableFacts.length),pr()&&!gr()&&o.setSourceCursor("opencode.raw_transcript.archived","local")}catch{}if(e.localOnly){let y=o.status();return{nativeSessionId:e.nativeSessionId,importedMessages:u.length,importedParts:c.length,recordedEvents:d.length,eventCount:y.lastSequence,chunkCount:0,status:y.status,durability:"local"}}let h=await o.flush();return{nativeSessionId:e.nativeSessionId,importedMessages:u.length,importedParts:c.length,recordedEvents:d.length,eventCount:h.eventCount,chunkCount:h.chunkCount,status:h.status,durability:"remote"}}finally{n.close()}}async function os(e){let t=e.dbPath??ts(),n=ns(t),r=[];try{let s=n.prepare(`
        SELECT *
        FROM "session"
        ORDER BY
          COALESCE(
            time_updated,
            time_created,
            0
          ) DESC
        `).all();for(let i of s){if(!rs(n,i,e.project))continue;let a=x(i.id);if(a&&r.push(a),r.length>=(e.limit??100))break}}finally{n.close()}let o=[];for(let s of r)o.push(await hn({project:e.project,storage:e.storage,nativeSessionId:s,dbPath:t}));return o}import{existsSync as od,mkdirSync as us,readFileSync as sd,writeFileSync as ls}from"node:fs";import{join as as}from"node:path";import{homedir as ss}from"node:os";import{join as oe}from"node:path";function Pt(e={}){let t=process.env.OPENCODE_CONFIG_DIR?.trim();if(t)return t;let n=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return n?oe(n,"opencode"):oe(e.home??ss(),".config","opencode")}function Fe(e={}){let t=process.env.OPENCODE_CONFIG?.trim();if(t)return t;let n=e.home??ss(),r=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return r?oe(r,"opencode","opencode.json"):oe(n,".config","opencode","opencode.json")}function Ke(e={}){let t=e.cwd??process.cwd();return oe(t,"opencode.json")}function Ot(e={}){return oe(Pt(e),"plugins")}function Tt(e={}){return oe(Pt(e),"AGENTS.md")}var rd="memory_agent_ask";function is(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${rd}

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
`.trim()}var cs="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",Sn="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function id(e={}){let t=Tt();us(Pt(),{recursive:!0});let n=`${cs}
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


${is()}

${Sn}`,r=od(t)?sd(t,"utf8"):"",o=r.indexOf(cs),s=r.indexOf(Sn);return o>=0&&s>=o?r=r.slice(0,o)+n+r.slice(s+Sn.length):(r=r.trimEnd(),r&&(r+=`

`),r+=n),ls(t,r.trimEnd()+`
`,{encoding:"utf8",mode:384}),t}function ds(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=[];n.push(id({cwd:e.cwd}));let r=e.scope??"global",o=[];if((r==="global"||r==="both")&&o.push(e.directory??Ot()),r==="project"||r==="both"){let s=e.cwd??process.cwd();o.push(as(s,".opencode","plugins"))}for(let s of o){us(s,{recursive:!0});let i=as(s,"toolnet-memory.js"),a=`
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
`;ls(i,a.trimStart(),{encoding:"utf8",mode:384}),n.push(i)}return n}import{existsSync as ms,mkdirSync as ad,readFileSync as cd,renameSync as ud,writeFileSync as ld}from"node:fs";import{dirname as gs,join as dd}from"node:path";function We(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function pd(e,t){ad(gs(e),{recursive:!0});let n=`${e}.tmp-${process.pid}-${Date.now()}`;ld(n,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),ud(n,e)}function ps(e){if(!ms(e))return{};let t=cd(e,"utf8").trim();if(!t)return{};let n;try{n=JSON.parse(t)}catch{throw new Error(`Invalid existing OpenCode config at ${e}: parse error. Not overwriting.`)}if(!We(n))throw new Error(`Invalid existing OpenCode config at ${e}: root must be a JSON object. Not overwriting.`);return n}function fs(e,t){if(!We(e))return!1;let n=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(n)&&n.length===2&&n[0]===t&&n[1]==="mcp"}function Rt(e,t,n,r){let o=dd(gs(e),"opencode.jsonc"),s=ms(o)?o:void 0,i=ps(e),a=i.mcp;if(a!==void 0&&!We(a))throw new Error(`Invalid existing OpenCode config: mcp must be an object in ${e}.`);let u=We(a)?{...a}:{},c=u[n];if(fs(c,t)&&!r)return{installed:!0,changed:!1,preservedJsonc:s};u[n]={type:"local",command:[t,"mcp"],enabled:!0};let p={...i,mcp:u};pd(e,p);let l=ps(e);if(!We(l.mcp)||!fs(l.mcp[n],t))throw new Error(`OpenCode MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0,preservedJsonc:s}}function ys(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...Rt(e.configFile,t,n,e.force??!1),configFile:e.configFile,serverName:n,command:[t,"mcp"]};if(r==="both"){let i=Fe(),a=Ke({cwd:e.cwd}),u=Rt(i,t,n,e.force??!1),c=Rt(a,t,n,e.force??!1);return{installed:!0,changed:u.changed||c.changed,configFile:i,serverName:n,command:[t,"mcp"],preservedJsonc:u.preservedJsonc??c.preservedJsonc}}let o=r==="project"?Ke({cwd:e.cwd}):Fe();return{...Rt(o,t,n,e.force??!1),configFile:o,serverName:n,command:[t,"mcp"]}}import{existsSync as uh,mkdirSync as yd,readFileSync as lh,writeFileSync as hd}from"node:fs";import{dirname as Sd,join as Ss}from"node:path";function kn(e){if(!e)return 0;let t=Array.from(e).length,n=e.trim().split(/\s+/u).filter(Boolean).length;return Math.ceil(Math.max(t/3.5,n*1.3))}function j(e,t){let n=e.replace(/\s+/g," ").trim();return n.length<=t?n:n.slice(0,Math.max(0,t-1)).trimEnd()+"\u2026"}function fd(e){let t=[],n=!1;for(let r of e.split(/\r?\n/u)){let o=r.trim();if(o.includes("<!--")&&(n=!0),n){o.includes("-->")&&(n=!1);continue}let s=o.toLowerCase();if(!(!o||o.startsWith("#")||o==="```"||s.startsWith("- [enforce]")||s.startsWith("* [enforce]")||s.startsWith("- [advisory]")||s.startsWith("* [advisory]"))&&(o=o.replace(/^[-*]\s+/u,""),o&&t.push(j(o,280)),t.length>=16))break}return t}function md(e){let t=[],n=[];for(let r of e.split(/\\r?\\n/u)){let o=r.trim(),s=o.toLowerCase(),a=["- [enforce]","* [enforce]","- [advisory]","* [advisory]"].find(c=>s.startsWith(c));if(!a)continue;let u=o.slice(a.length).trim();u&&(a.includes("enforce")?t.push(u):n.push(u))}return{enforce:t,advisory:n}}function gd(e,t){let n=[];for(let r of e){let o=[...n,r].join(`
`);if(kn(o)<=t){n.push(r);continue}let s=kn(n.join(`
`)),i=Math.max(0,t-s);if(i>=16){let a=Math.floor(i*3.2),u=j(r,a);u&&n.push(u)}break}return n.join(`
`).trim()}async function hs(e){let t=Math.max(256,Math.min(2e3,e.maxTokens??1e3)),n=xt(e.project,!1),r=n?.content??"";r||(r=await e.storage.getText(`projects/${e.project.id}/project/manual.md`)??"");let o=md(r),s=n?n.rules.filter(d=>d.mode==="enforce").map(d=>d.text):o.enforce,i=n?n.rules.filter(d=>d.mode==="advisory").map(d=>d.text):o.advisory,a=r?fd(r):[],u=await St(e.project,e.storage),c=await So(e.project,e.storage),p=await Fo(e.project,e.storage),l=[];if(l.push("[TOOLNET PROJECT CONTEXT]"),l.push(`Project: ${e.project.name}`),l.push("Continue existing project state. Do not restart completed work unless evidence shows it is necessary."),r&&l.push(`Full operating manual: ${bt(e.project)}`),s.length){l.push("","PROJECT RULES \u2014 MUST FOLLOW");for(let d of s.slice(0,24))l.push(`- [ENFORCE] ${j(d,240)}`)}if(i.length){l.push("","PROJECT PREFERENCES");for(let d of i.slice(0,10))l.push(`- ${j(d,220)}`)}if(c&&(c.mission&&l.push("","MISSION",j(c.mission.value,420)),c.activeObjective&&l.push("","CURRENT OBJECTIVE",j(c.activeObjective.value,420)),c.why&&l.push("","WHY THIS WORK MATTERS",j(c.why.value,420)),c.desiredOutcome&&l.push("","DESIRED OUTCOME",j(c.desiredOutcome.value,420)),c.planRationale&&l.push("","WHY THIS APPROACH",j(c.planRationale.value,420))),u){if(l.push("","ACTIVE WORK"),u.goal&&l.push(`Goal: ${j(u.goal,320)}`),u.plan&&l.push(`Plan: ${j(u.plan,320)}`),l.push(`Progress: phases ${u.progress.phasesCompleted}/${u.progress.phasesTotal}; tasks ${u.progress.tasksCompleted}/${u.progress.tasksTotal}; blocked ${u.progress.blocked}`),u.currentPhase&&l.push(`Current phase: ${u.currentPhase.title} [${u.currentPhase.status}]`),u.currentPhase&&c){let d=c.phases.find(g=>g.order===u.currentPhase?.order);d&&(d.objective&&l.push(`Phase objective: ${j(d.objective.value,340)}`),d.why?l.push(`Why this phase: ${j(d.why.value,340)}`):l.push("Why this phase: not explicitly recorded. Inspect existing implementation before assuming intent."),d.deliverable&&l.push(`Deliverable: ${j(d.deliverable.value,340)}`),d.dependencies.length&&l.push(`Depends on: ${d.dependencies.slice(0,4).map(g=>j(g.value,180)).join("; ")}`),d.acceptanceCriteria.length&&(l.push("","DEFINITION OF DONE"),d.acceptanceCriteria.slice(0,6).forEach(g=>{l.push(`- ${j(g.value,260)}`)})),d.openQuestions.length&&(l.push("","OPEN QUESTIONS FOR CURRENT PHASE"),d.openQuestions.slice(0,4).forEach(g=>{l.push(`- ${j(g.value,260)}`)})))}u.currentTask&&l.push(`Current task: ${u.currentTask.title} [${u.currentTask.status}]`),u.nextActions.length&&(l.push("","NEXT ACTIONS"),u.nextActions.slice(0,6).forEach((d,g)=>{l.push(`${g+1}. ${j(d,260)}`)})),u.blockers.length&&(l.push("","BLOCKERS"),u.blockers.slice(0,5).forEach(d=>{l.push(`- ${j(d,260)}`)})),u.warnings.length&&(l.push("","ATTENTION"),u.warnings.slice(-5).forEach(d=>{l.push(`- ${j(d,260)}`)})),u.decisions.length&&(l.push("","RECENT DECISIONS"),u.decisions.slice(-5).forEach(d=>{l.push(`- ${j(d,260)}`)})),u.lastSession&&l.push("",`Last work session: ${u.lastSession.agent} / ${u.lastSession.nativeSessionId}`)}if(c&&c.openQuestions.length&&(l.push("","UNRESOLVED QUESTIONS"),c.openQuestions.slice(0,5).forEach(d=>{l.push(`- ${j(d.value,260)}`)})),p&&l.push(`Latest handoff: ${p.reason} / ${p.sourceSession.agent}`),a.length){l.push("","OPERATING NOTES");for(let d of a)l.push(`- ${d}`)}l.push("","Before changing anything: verify the current repository state and continue from the active phase/task above.");let f=gd(l,t);return{version:1,projectId:e.project.id,projectName:e.project.name,text:f,estimatedTokens:kn(f),maxTokens:t,hasManual:!!r,hasWorkState:!!u,hasHandoff:!!p,generatedAt:new Date().toISOString()}}function kd(e){return Ss(e.rootPath,".toolnet","context","startup.md")}function vd(e){return Ss(e.rootPath,".toolnet","context","startup.json")}function wd(e,t){let n=kd(e);yd(Sd(n),{recursive:!0}),hd(n,t.text.endsWith(`
`)?t.text:t.text+`
`,{encoding:"utf8",mode:384}),R(vd(e),t)}async function ks(e,t,n=800){let o=(await hs({project:e,storage:t,maxTokens:n})).text;nt(o)>n&&(o=rt(o,n),o+=`

[Context trimmed by ToolNet Memory token budget]
`);let i={version:1,projectId:e.id,projectName:e.name,text:o,digest:v(o),estimatedTokens:nt(o),generatedAt:new Date().toISOString()};return wd(e,i),await t.put(`projects/${e.id}/context/startup.md`,i.text+`
`,"text/markdown"),await t.put(`projects/${e.id}/context/startup.json`,JSON.stringify(i,null,2)+`
`,"application/json"),i}function fe(e,t){let n=e.indexOf(t);if(!(n<0))return e[n+1]}function me(e,t){return e.includes(t)}function xd(e){let t=De(),n=On(An({provider:t.storage.provider,huggingface:t.storage.huggingface,localRoot:t.storage.localRoot}),{attempts:3});return new He(n,e.id,e.name,e.remote??e.name)}function Cd(){return vn("sh",["-lc","command -v opencode >/dev/null 2>&1"],{stdio:"ignore"}).status===0}function jd(){try{return vn("opencode",["--version"],{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:5e3}).stdout?.trim()||void 0}catch{return}}function Id(){try{let e=vn("opencode",["mcp","list","--format","json"],{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:1e4});if(e.status!==0)return{available:!1,servers:[]};let t=JSON.parse(e.stdout||"[]");return{available:!0,servers:Array.isArray(t)?t.map(r=>String(r.name||r.id||"")):[]}}catch{return{available:!1,servers:[]}}}function Md(e){let t=[],n=Cd();n||t.push("opencode binary not found");let r=jd(),o=Fe(),s=pe(o),i=Ke({cwd:e}),a=pe(i),u=process.env.OPENCODE_CONFIG?.trim(),c=u?pe(u):!1,p=!1;if(s)try{p=!!JSON.parse(vs(o,"utf8")).mcp?.["toolnet-memory"]}catch{}let l=!1;if(a)try{l=!!JSON.parse(vs(i,"utf8")).mcp?.["toolnet-memory"]}catch{}let f=Ot(),d=pe(`${f}/toolnet-memory.js`),g=bd(e??process.cwd(),".opencode","plugins"),S=pe(`${g}/toolnet-memory.js`),h=Tt(),y=pe(h),k;return n&&(k=Id()),{opencodeBinaryDetected:n,version:r,globalConfigExists:s,projectConfigExists:a,customConfigExists:c,globalMcpReady:p,projectMcpReady:l,globalPluginExists:d,projectPluginExists:S,continuityInstructions:y,mcpConnectionStatus:k,errors:t}}async function Ed(){let[e="help",...t]=process.argv.slice(2),n=me(t,"--json"),r=me(t,"--force"),o=fe(t,"--scope")??"global",s=fe(t,"--project")??process.cwd();if(e==="status"){let c=Md(s);if(n)console.log(JSON.stringify(c,null,2));else if(console.log("OpenCode Integration"),console.log("===================="),console.log(""),console.log(`Binary detected     : ${c.opencodeBinaryDetected?"\u2713":"\u2717"}`),c.version&&console.log(`Version             : ${c.version}`),console.log(`Global config       : ${c.globalConfigExists?"\u2713":"\u2717"}`),console.log(`Project config      : ${c.projectConfigExists?"\u2713":"\u2717"}`),c.customConfigExists&&console.log(`Custom config       : \u2713 (${process.env.OPENCODE_CONFIG})`),console.log(`Global MCP          : ${c.globalMcpReady?"\u2713":"\u2717"}`),console.log(`Project MCP         : ${c.projectMcpReady?"\u2713":"\u2717"}`),console.log(`Global plugin       : ${c.globalPluginExists?"\u2713":"\u2717"}`),console.log(`Project plugin      : ${c.projectPluginExists?"\u2713":"\u2717"}`),console.log(`Continuity rules    : ${c.continuityInstructions?"\u2713":"\u2717"}`),c.mcpConnectionStatus&&(console.log(`MCP connection      : ${c.mcpConnectionStatus.available?"\u2713":"\u2717"}`),c.mcpConnectionStatus.servers.length>0&&console.log(`  Servers           : ${c.mcpConnectionStatus.servers.join(", ")}`)),c.errors.length>0){console.log("");for(let p of c.errors)console.log(`  \u26A0 ${p}`)}c.opencodeBinaryDetected||(process.exitCode=1);return}if(e==="install-plugin"){let c=ys({binary:fe(t,"--bin"),scope:o,cwd:s,force:r}),p=ds({binary:fe(t,"--bin"),scope:o,cwd:s});if(n)console.log(JSON.stringify({mcp:c,pluginFiles:p},null,2));else{console.log(`\u2705 OpenCode integration installed (scope: ${o})`),console.log(`  MCP config: ${c.configFile}`),c.changed?console.log(`  \u2713 MCP server "${c.serverName}" added`):console.log(`  \u2713 MCP server "${c.serverName}" already configured`);for(let l of p)console.log(`  \u2713 ${l}`);console.log(""),console.log("OpenCode will load plugins automatically on next start."),console.log("Verify MCP with: opencode mcp list")}return}let i=new qe().detect(s),a=xd(i),u=fe(t,"--db");if(e==="sync"){let c=t.find(S=>!S.startsWith("--")&&S!==s&&S!==u);if(!c)throw new Error("Usage: session:opencode-sync <session-id>");let p=me(t,"--idle"),l=me(t,"--error"),f=me(t,"--compacted"),d=me(t,"--local-only"),g=await hn({project:i,storage:a,nativeSessionId:c,dbPath:u,idle:p,error:l,compacted:f,localOnly:d});if(!d&&(p||f||l))try{await ks(i,a,800)}catch{}console.log(JSON.stringify(g,null,2));return}if(e==="recover"){let c=fe(t,"--limit"),p=c?Number(c):100,l=await os({project:i,storage:a,dbPath:u,limit:Number.isFinite(p)?p:100});console.log(JSON.stringify({project:i.name,sessions:l.length,importedMessages:l.reduce((f,d)=>f+d.importedMessages,0),importedParts:l.reduce((f,d)=>f+d.importedParts,0)},null,2));return}console.log(`OpenCode Session Adapter

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
`)}Ed().catch(e=>{console.error(e instanceof Error?e.message:e),process.exit(1)});
