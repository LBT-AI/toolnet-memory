import{existsSync as ue,readFileSync as Us}from"node:fs";import{join as kl}from"node:path";import{spawnSync as un}from"node:child_process";import{existsSync as Ys,readFileSync as Xs}from"node:fs";import{homedir as Qs}from"node:os";import{join as Zs}from"node:path";function eo(e){let t=e.trim();return t.length>=2&&t.startsWith('"')&&t.endsWith('"')?(t=t.slice(1,-1),t.replace(/\\n/g,`
`).replace(/\\r/g,"\r").replace(/\\t/g,"	").replace(/\\"/g,'"').replace(/\\\\/g,"\\")):t.length>=2&&t.startsWith("'")&&t.endsWith("'")?t.slice(1,-1):t}function to(){let e=process.env.TOOLNET_GLOBAL_ENV??Zs(Qs(),".config","toolnet-memory",".env");if(!Ys(e))return;let t=Xs(e,"utf8");for(let n of t.split(/\r?\n/)){let r=n.trim();if(!r||r.startsWith("#"))continue;r.startsWith("export ")&&(r=r.slice(7));let s=r.indexOf("=");if(s<=0)continue;let o=r.slice(0,s).trim();/^[A-Za-z_][A-Za-z0-9_]*$/.test(o)&&process.env[o]===void 0&&(process.env[o]=eo(r.slice(s+1)))}}to();function fe(e,t){return e===void 0?t:["1","true","yes","on"].includes(e.toLowerCase())}function ge(e,t){if(!e)return t;let n=Number(e);return Number.isFinite(n)?n:t}function _e(){return{memory:{autoCapture:fe(process.env.MEMORY_AUTO_CAPTURE,!0),autoRetrieve:fe(process.env.MEMORY_AUTO_RETRIEVE,!0),autoSummarize:fe(process.env.MEMORY_AUTO_SUMMARIZE,!0),autoSync:fe(process.env.MEMORY_AUTO_SYNC,!0)},retrieval:{maxCandidates:ge(process.env.MEMORY_MAX_CANDIDATES,50),rerankTop:ge(process.env.MEMORY_RERANK_TOP,10),finalContext:ge(process.env.MEMORY_FINAL_CONTEXT,5),tokenBudget:ge(process.env.MEMORY_TOKEN_BUDGET,2e3)},storage:{provider:process.env.MEMORY_STORAGE_PROVIDER??"huggingface",r2:{accountId:process.env.R2_ACCOUNT_ID,bucket:process.env.R2_BUCKET,accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY},s3:{endpoint:process.env.S3_ENDPOINT,region:process.env.S3_REGION,bucket:process.env.S3_BUCKET,accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY,forcePathStyle:fe(process.env.S3_FORCE_PATH_STYLE,!1)},huggingface:{namespace:process.env.HF_NAMESPACE,bucket:process.env.HF_BUCKET,accessKeyId:process.env.HF_S3_ACCESS_KEY_ID,secretAccessKey:process.env.HF_S3_SECRET_ACCESS_KEY},localRoot:process.env.MEMORY_LOCAL_STORAGE_PATH},cache:{maxMb:ge(process.env.MEMORY_LOCAL_CACHE_MB,200)}}}import{createHash as no}from"node:crypto";import{existsSync as Et,mkdirSync as ro,readFileSync as so,renameSync as oo,writeFileSync as io}from"node:fs";import{basename as ao,dirname as $e,join as Ke,parse as mn,resolve as ye}from"node:path";var fn=".toolnet",co="project.json";function uo(e){return no("sha256").update(e).digest("hex").slice(0,16)}function Pt(e){return Ke(e,fn,co)}function lo(e){return Et(Pt(e))}function po(e,t){let n=ye(e),r=mn(n).root;for(;;){if(lo(n))return n;if(n===r||t&&n===ye(t))break;let s=$e(n);if(s===n)break;n=s}return null}function mo(e){let t=ye(e),n=mn(t).root,r=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"];for(;;){if(r.some(o=>Et(Ke(t,o))))return t;if(t===n)break;let s=$e(t);if(s===t)break;t=s}return ye(e)}function fo(e){let t;try{t=JSON.parse(so(e,"utf8"))}catch(s){throw new Error(`Invalid ToolNet project manifest: ${e}: ${s instanceof Error?s.message:String(s)}`)}if(!t||typeof t!="object")throw new Error(`Invalid ToolNet project manifest: ${e}`);let n=t;if(typeof n.id!="string"||!n.id.trim())throw new Error(`ToolNet project manifest is missing id: ${e}`);if(typeof n.name!="string"||!n.name.trim())throw new Error(`ToolNet project manifest is missing name: ${e}`);let r=new Date().toISOString();return{version:1,id:n.id,name:n.name,remote:typeof n.remote=="string"&&n.remote.trim()?n.remote:n.name,rootPath:typeof n.rootPath=="string"?n.rootPath:$e($e(e)),createdAt:typeof n.createdAt=="string"?n.createdAt:r,updatedAt:typeof n.updatedAt=="string"?n.updatedAt:r,graphVersion:typeof n.graphVersion=="number"?n.graphVersion:0,memoryVersion:typeof n.memoryVersion=="number"?n.memoryVersion:0,metadata:n.metadata&&typeof n.metadata=="object"?n.metadata:void 0}}function dn(e,t){let n=Ke(e,fn);ro(n,{recursive:!0});let r=Pt(e),s=`${r}.tmp-${process.pid}`;io(s,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),oo(s,r)}function pn(e,t){return{id:e.id,name:e.name,remote:e.remote,rootPath:t,createdAt:e.createdAt,updatedAt:e.updatedAt,graphVersion:e.graphVersion,memoryVersion:e.memoryVersion,metadata:e.metadata}}var Fe=class{detect(t=process.cwd()){let n=ye(t),r=mo(n),o=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(p=>Et(Ke(r,p))),i=po(n,o?r:void 0);if(i){let p=Pt(i),l=fo(p);return l.rootPath!==i&&(l.rootPath=i,l.updatedAt=new Date().toISOString(),dn(i,l)),pn(l,i)}let a=new Date().toISOString(),u=ao(r),c={version:1,id:uo(r),name:u,remote:u,rootPath:r,createdAt:a,updatedAt:a,graphVersion:0,memoryVersion:0};return dn(r,c),pn(c,r)}};var go=[{type:"openai_key",regex:/\bsk-[A-Za-z0-9_\-]{20,}\b/g},{type:"huggingface_token",regex:/\bhf_[A-Za-z0-9]{20,}\b/g},{type:"hf_s3_access_key",regex:/\bHFAK[A-Za-z0-9]{8,}\b/g},{type:"bearer_token",regex:/\bBearer\s+[A-Za-z0-9._\-]{16,}\b/gi},{type:"jwt",regex:/\beyJ[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\b/g},{type:"private_key",regex:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g},{type:"password_assignment",regex:/\b(password|passwd|pwd)\s*[:=]\s*["']?[^"'\s]{6,}["']?/gi},{type:"secret_assignment",regex:/\b(secret|api[_-]?key|access[_-]?token|refresh[_-]?token)\s*[:=]\s*["']?[^"'\s]{8,}["']?/gi},{type:"cookie",regex:/\b(cookie|set-cookie)\s*[:=]\s*[^;\n]{8,}/gi}],Le=class{scan(t){let n=[];for(let r of go){let s=new RegExp(r.regex.source,r.regex.flags);for(let o of t.matchAll(s))n.push({type:r.type,value:o[0]})}return n}hasSecrets(t){return this.scan(t).length>0}};var H=class{scanner=new Le;sanitize(t){let n=t,r=this.scanner.scan(t),s=new Set;for(let o of r)s.add(o.type),n=n.split(o.value).join(`[REDACTED:${o.type}]`);return{text:n,redacted:r.length,secretTypes:[...s]}}sanitizeValue(t){if(typeof t=="string")return this.sanitize(t).text;if(Array.isArray(t))return t.map(n=>this.sanitizeValue(n));if(t&&typeof t=="object"){let n={};for(let[r,s]of Object.entries(t)){let o=r.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g,"");o.includes("password")||o.includes("passwd")||o==="pwd"||o.includes("secret")||o.includes("token")||o.includes("cookie")||o.includes("authorization")||o.includes("apikey")||o.includes("accesskey")||o.includes("privatekey")||o.includes("clientsecret")||o.includes("credential")?n[r]="[REDACTED]":n[r]=this.sanitizeValue(s)}return n}return t}};import{homedir as Ko}from"node:os";import{join as Lo}from"node:path";import{DeleteObjectCommand as yo,GetObjectCommand as ho,HeadObjectCommand as So,ListObjectsV2Command as ko,PutObjectCommand as vo,S3Client as wo}from"@aws-sdk/client-s3";import{getSignedUrl as bo}from"@aws-sdk/s3-request-presigner";var We=class{name="huggingface";client;bucket;constructor(t){this.bucket=t.bucket,this.client=new wo({region:"us-east-1",endpoint:`https://s3.hf.co/${t.namespace}`,forcePathStyle:!0,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:t.accessKeyId,secretAccessKey:t.secretAccessKey}})}async put(t,n,r="application/octet-stream"){let s=typeof n=="string"?Buffer.from(n,"utf8"):n;await this.client.send(new vo({Bucket:this.bucket,Key:t,Body:s,ContentType:r}))}async get(t){let n=await bo(this.client,new ho({Bucket:this.bucket,Key:t}),{expiresIn:60}),r=await fetch(n,{redirect:"follow"});if(r.status===404)return null;if(!r.ok)throw new Error(`HF download failed: ${r.status} ${r.statusText}`);return new Uint8Array(await r.arrayBuffer())}async getText(t){let n=await this.get(t);return n?Buffer.from(n).toString("utf8"):null}async exists(t){try{return await this.client.send(new So({Bucket:this.bucket,Key:t})),!0}catch(n){if(typeof n=="object"&&n!==null&&"$metadata"in n&&n.$metadata?.httpStatusCode===404)return!1;throw n}}async delete(t){await this.client.send(new yo({Bucket:this.bucket,Key:t}))}async list(t=""){let n=[],r;do{let s=await this.client.send(new ko({Bucket:this.bucket,Prefix:t||void 0,ContinuationToken:r}));for(let o of s.Contents??[])o.Key&&n.push({key:o.Key,size:o.Size,updatedAt:o.LastModified?.toISOString()});r=s.IsTruncated?s.NextContinuationToken:void 0}while(r);return n}};import{access as gn,mkdir as xo,readFile as Co,readdir as jo,rm as Io,stat as yn,writeFile as Ao}from"node:fs/promises";import{dirname as Eo,join as Po,relative as hn,resolve as Oo}from"node:path";var he=class{constructor(t){this.root=t}root;name="local";path(t){let n=t.replace(/^\/+/,"");return Oo(this.root,n)}async put(t,n){let r=this.path(t);await xo(Eo(r),{recursive:!0}),await Ao(r,n)}async get(t){try{return await Co(this.path(t))}catch(n){if(typeof n=="object"&&n!==null&&"code"in n&&n.code==="ENOENT")return null;throw n}}async getText(t){let n=await this.get(t);return n?Buffer.from(n).toString("utf8"):null}async exists(t){try{return await gn(this.path(t)),!0}catch{return!1}}async delete(t){await Io(this.path(t),{force:!0})}async list(t=""){let n=this.path(t),r=[];try{await gn(n)}catch{return r}let s=async i=>{let a=await jo(i,{withFileTypes:!0});for(let u of a){let c=Po(i,u.name);if(u.isDirectory()){await s(c);continue}let p=await yn(c);r.push({key:hn(this.root,c),size:p.size,updatedAt:p.mtime.toISOString()})}},o=await yn(n);return o.isDirectory()?await s(n):r.push({key:hn(this.root,n),size:o.size,updatedAt:o.mtime.toISOString()}),r}};import{DeleteObjectCommand as Mo,GetObjectCommand as To,HeadObjectCommand as Ro,ListObjectsV2Command as No,PutObjectCommand as _o,S3Client as $o}from"@aws-sdk/client-s3";import{getSignedUrl as Fo}from"@aws-sdk/s3-request-presigner";var Se=class{name;client;bucket;constructor(t){this.name=t.name??"s3",this.bucket=t.bucket,this.client=new $o({region:t.region??"us-east-1",endpoint:t.endpoint||void 0,forcePathStyle:t.forcePathStyle??!1,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:t.accessKeyId,secretAccessKey:t.secretAccessKey}})}async put(t,n,r="application/octet-stream"){let s=typeof n=="string"?Buffer.from(n,"utf8"):n;await this.client.send(new _o({Bucket:this.bucket,Key:t,Body:s,ContentType:r}))}async get(t){let n=await Fo(this.client,new To({Bucket:this.bucket,Key:t}),{expiresIn:60}),r=await fetch(n,{redirect:"follow"});if(r.status===404)return null;if(!r.ok)throw new Error(`${this.name} download failed: ${r.status} ${r.statusText}`);return new Uint8Array(await r.arrayBuffer())}async getText(t){let n=await this.get(t);return n?Buffer.from(n).toString("utf8"):null}async exists(t){try{return await this.client.send(new Ro({Bucket:this.bucket,Key:t})),!0}catch(n){if(typeof n=="object"&&n!==null&&"$metadata"in n&&n.$metadata?.httpStatusCode===404)return!1;throw n}}async delete(t){await this.client.send(new Mo({Bucket:this.bucket,Key:t}))}async list(t=""){let n=[],r;do{let s=await this.client.send(new No({Bucket:this.bucket,Prefix:t||void 0,ContinuationToken:r}));for(let o of s.Contents??[])o.Key&&n.push({key:o.Key,size:o.Size,updatedAt:o.LastModified?.toISOString()});r=s.IsTruncated?s.NextContinuationToken:void 0}while(r);return n}};function Ot(e,t){return console.warn(t),new he(e)}function Sn(e){let t=e.localRoot??Lo(Ko(),".toolnet-memory","storage");if(e.provider==="r2"){let n=e.r2;return n?.accountId&&n.bucket&&n.accessKeyId&&n.secretAccessKey?new Se({name:"r2",endpoint:`https://${n.accountId}.r2.cloudflarestorage.com`,region:"auto",bucket:n.bucket,forcePathStyle:!0,accessKeyId:n.accessKeyId,secretAccessKey:n.secretAccessKey}):Ot(t,"[storage] Cloudflare R2 credentials missing. Using local fallback.")}if(e.provider==="s3"){let n=e.s3;return n?.bucket&&n.accessKeyId&&n.secretAccessKey?new Se({name:"s3",endpoint:n.endpoint,region:n.region??"us-east-1",bucket:n.bucket,forcePathStyle:n.forcePathStyle??!1,accessKeyId:n.accessKeyId,secretAccessKey:n.secretAccessKey}):Ot(t,"[storage] S3 credentials missing. Using local fallback.")}if(e.provider==="huggingface"){let n=e.huggingface;return n?.namespace&&n.bucket&&n.accessKeyId&&n.secretAccessKey?new We({namespace:n.namespace,bucket:n.bucket,accessKeyId:n.accessKeyId,secretAccessKey:n.secretAccessKey}):Ot(t,"[storage] Hugging Face credentials missing. Using local fallback.")}return new he(t)}function Wo(e){return new Promise(t=>setTimeout(t,e))}async function kn(e,t={}){let n=Math.max(1,t.attempts??3),r=t.baseDelayMs??150,s=t.maxDelayMs??2e3,o;for(let i=1;i<=n;i++)try{return await e()}catch(a){if(o=a,i>=n)break;let u=Math.min(s,r*2**(i-1)),c=Math.floor(Math.random()*Math.max(1,u*.2));await Wo(u+c)}throw o}var Do=new Set(["put","get","getText","delete","list"]);function vn(e,t={}){return new Proxy(e,{get(n,r){let s=Reflect.get(n,r,n);return typeof s!="function"?s:Do.has(r)?(...o)=>kn(()=>Promise.resolve(s.apply(n,o)),t):s.bind(n)}})}function wn(e){let t=e.trim().replace(/\s+/g,"_").replace(/[^A-Za-z0-9._-]/g,"_").replace(/_+/g,"_").replace(/^\.+|\.+$/g,"").slice(0,100);if(!t||t==="."||t==="..")throw new Error("Invalid project storage folder");return t}function bn(e){let t=e.replace(/^\/+/,"");if(t.startsWith("memories/"))return"memory/records/"+t.slice(9);if(t.startsWith("vectors/"))return"memory/vectors/"+t.slice(8);if(t.startsWith("graph/"))return"code/graph/"+t.slice(6);let n=t.match(/^(snapshots\/[^/]+\/)memories\/(.+)$/);if(n)return`${n[1]}memory/records/${n[2]}`;if(n=t.match(/^(snapshots\/[^/]+\/)vectors\/(.+)$/),n)return`${n[1]}memory/vectors/${n[2]}`;if(n=t.match(/^(snapshots\/[^/]+\/)graph\/(.+)$/),n)return`${n[1]}code/graph/${n[2]}`;let r=t.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)memories\/(.+)$/);if(r)return`${r[1]}memory/records/${r[2]}`;if(r=t.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)vectors\/(.+)$/),r)return`${r[1]}memory/vectors/${r[2]}`;if(r=t.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)graph\/(.+)$/),r)return`${r[1]}code/graph/${r[2]}`;let s=t.match(/^(projects\/[^/]+\/)memories\/(.+)$/);return s?`${s[1]}memory/records/${s[2]}`:(s=t.match(/^(projects\/[^/]+\/)vectors\/(.+)$/),s?`${s[1]}memory/vectors/${s[2]}`:(s=t.match(/^(projects\/[^/]+\/)graph\/(.+)$/),s?`${s[1]}code/graph/${s[2]}`:t))}var De=class{constructor(t,n,r,s){this.provider=t;this.name=t.name,this.projectId=n,this.projectName=r,this.folder=wn(s??r),this.sourcePrefix=`projects/${n}`,this.targetPrefix=`projects/${this.folder}`}provider;name;folder;sourcePrefix;targetPrefix;projectId;projectName;registryPromise;async registerProject(){let t=`${this.targetPrefix}/project.json`,n=new Date().toISOString(),r=n,s=await this.provider.getText(t);if(s){let i;try{i=JSON.parse(s)}catch(a){throw new Error(`Invalid remote ToolNet project manifest at ${t}: ${a instanceof Error?a.message:String(a)}`)}if(typeof i.id=="string"&&i.id!==this.projectId)throw new Error(["ToolNet remote project namespace collision.",`Remote folder: ${this.targetPrefix}`,`Existing project id: ${i.id}`,`Current project id: ${this.projectId}`,"Refusing to mix data from two projects."].join(" "));typeof i.createdAt=="string"&&(r=i.createdAt)}let o={version:1,id:this.projectId,name:this.projectName,remote:this.folder,createdAt:r,updatedAt:n};await this.provider.put(t,JSON.stringify(o,null,2)+`
`,"application/json")}async ensureRegistered(){return this.registryPromise||(this.registryPromise=this.registerProject()),this.registryPromise}key(t){if(t=bn(t),t===this.sourcePrefix)return this.targetPrefix;if(t.startsWith(`${this.sourcePrefix}/`))return this.targetPrefix+t.slice(this.sourcePrefix.length);if(t===this.targetPrefix||t.startsWith(`${this.targetPrefix}/`))return t;if(t.startsWith("projects/"))throw new Error(["Cross-project storage access denied.",`Current project: ${this.targetPrefix}`,`Requested key: ${t}`].join(" "));return t}async put(t,n,r){return await this.ensureRegistered(),this.provider.put(this.key(t),n,r)}async get(t){return await this.ensureRegistered(),this.provider.get(this.key(t))}async getText(t){return await this.ensureRegistered(),this.provider.getText(this.key(t))}async delete(t){return await this.ensureRegistered(),this.provider.delete(this.key(t))}async exists(t){return await this.ensureRegistered(),this.provider.exists(this.key(t))}async list(t){return await this.ensureRegistered(),this.provider.list(this.key(t))}};import{existsSync as qu}from"node:fs";import{execFileSync as Bu}from"node:child_process";import{homedir as Ju}from"node:os";import{isAbsolute as Vu,join as Cs,relative as Gu,resolve as js}from"node:path";import{DatabaseSync as Hu}from"node:sqlite";import{join as Ho}from"node:path";import{createHash as zo}from"node:crypto";import{dirname as qo}from"node:path";import{mkdirSync as Bo,readFileSync as Jo,renameSync as Vo,writeFileSync as Go}from"node:fs";function v(e){return zo("sha256").update(e).digest("hex")}function Mt(e){if(Array.isArray(e))return e.map(Mt);if(e&&typeof e=="object"){let t=e,n={};for(let r of Object.keys(t).sort())n[r]=Mt(t[r]);return n}return e}function xn(e){return JSON.stringify(Mt(e))}function Cn(e){try{return JSON.parse(Jo(e,"utf8"))}catch{return null}}function R(e,t){Bo(qo(e),{recursive:!0});let n=`${e}.${process.pid}.tmp`;Go(n,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Vo(n,e)}function jn(e,t){let n=e.trim(),r=n.replace(/\s+/g,"_").replace(/[^A-Za-z0-9._-]/g,"_").replace(/_+/g,"_").replace(/^\.+|\.+$/g,""),s=v(n).slice(0,12);if(!r||r==="."||r==="..")return`${t}--${s}`;let o=r.slice(0,100);return o===n&&n.length<=100?o:`${o.slice(0,85)}--${s}`}function In(e,t,n){let r=t.trim(),s=n.trim();if(!r)throw new Error("Session agent is required");if(!s)throw new Error("Native session ID is required");let o=jn(r.toLowerCase(),"agent"),i=jn(s,"session");return{projectId:e.id,projectName:e.name,projectRoot:e.rootPath,agent:r,nativeSessionId:s,sessionKey:`${r}:${s}`,remotePrefix:["projects",e.id,"runtime","sources",o,i].join("/"),localDirectory:Ho(e.rootPath,".toolnet","runtime","sources",o,i)}}function An(e){return String(e).padStart(12,"0")}var ze=class{constructor(t,n=100,r=512*1024){this.storage=t;this.maxEventsPerChunk=n;this.maxChunkBytes=r;if(n<1)throw new Error("maxEventsPerChunk must be positive");if(r<1024)throw new Error("maxChunkBytes is too small")}storage;maxEventsPerChunk;maxChunkBytes;async getJson(t){let n=await this.storage.getText(t);return n?JSON.parse(n):null}async putJson(t,n){await this.storage.put(t,JSON.stringify(n,null,2)+`
`,"application/json")}async scan(t){let n=`${t.remotePrefix}/events/`,r=await this.storage.list(n),s=[],o=0;for(let i of r){let a=i.key.match(/\/events\/(\d+)-(\d+)-[a-f0-9]+\.jsonl$/);if(!a)continue;let u=Number(a[1]),c=Number(a[2]);!Number.isFinite(u)||!Number.isFinite(c)||(s.push({key:i.key,start:u,end:c}),o=Math.max(o,c))}return s.sort((i,a)=>i.start-a.start),{chunks:s,maxSequence:o}}split(t){let n=[],r=[],s=0;for(let o of t){let i=Buffer.byteLength(JSON.stringify(o)+`
`,"utf8");r.length>0&&(r.length>=this.maxEventsPerChunk||s+i>this.maxChunkBytes)&&(n.push(r),r=[],s=0),r.push(o),s+=i}return r.length>0&&n.push(r),n}async loadManifest(t){return this.getJson(`${t.remotePrefix}/session.json`)}async loadCursor(t){return this.getJson(`${t.remotePrefix}/cursor.json`)}async recover(t){let n=await this.scan(t);return{maxSequence:n.maxSequence,chunkCount:n.chunks.length}}async append(t,n,r,s={}){let o=await this.loadManifest(t),i=await this.scan(t),a=n.filter(h=>h.sequence>i.maxSequence),u=0;for(let h of this.split(a)){let y=h[0],k=h[h.length-1],I=h.map(T=>JSON.stringify(T)).join(`
`)+`
`,M=v(I).slice(0,16),O=[t.remotePrefix,"events",`${An(y.sequence)}-${An(k.sequence)}-${M}.jsonl`].join("/");await this.storage.exists(O)||await this.storage.put(O,I,"application/x-ndjson"),u+=h.length}let c=await this.scan(t),p=n[n.length-1],l=o?.status??"active";p?.type==="session_end"||p?.type==="session_idle"?l="idle":p?.type==="error"?l="error":n.length>0&&(l="active");let m=new Date().toISOString(),d=n[0],g={version:1,projectId:t.projectId,projectName:t.projectName,agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,status:l,createdAt:o?.createdAt??d?.timestamp??m,updatedAt:p?.timestamp??m,firstEventAt:o?.firstEventAt??d?.timestamp,lastEventAt:p?.timestamp??o?.lastEventAt,eventCount:c.maxSequence,chunkCount:c.chunks.length,metadata:{...o?.metadata,...s.metadata}};(s.title??o?.title)&&(g.title=s.title??o?.title);let S={version:1,projectId:t.projectId,agent:t.agent,nativeSessionId:t.nativeSessionId,lastLocalSequence:n.length>0?n[n.length-1].sequence:c.maxSequence,lastRemoteSequence:c.maxSequence,sourceCursors:r,updatedAt:m};return await this.putJson(`${t.remotePrefix}/cursor.json`,S),await this.putJson(`${t.remotePrefix}/session.json`,g),{uploadedEvents:u,lastRemoteSequence:c.maxSequence,eventCount:g.eventCount,chunkCount:g.chunkCount,status:l}}};import{closeSync as Kt,existsSync as ci,fsyncSync as ui,mkdirSync as li,openSync as Lt,readSync as di,rmSync as _n,statSync as $n,writeSync as pi}from"node:fs";import{join as Wt}from"node:path";var Uo=new Set(["thinking","reasoning","reasoningcontent","chainofthought","cot","analysistext","internalreasoning","modelthinking"]),Yo=new Set(["reasoning","thinking","chain_of_thought","chain-of-thought","internal_reasoning","internal-reasoning"]);function Xo(e){return e.toLowerCase().replace(/[^a-z0-9]+/gu,"")}function Qo(e){for(let t of["type","kind"]){let n=e[t];if(typeof n=="string"){let r=n.toLowerCase();if(Yo.has(r))return n}}return null}function Tt(e,t=0){if(t>12)return"[ToolNet nested value omitted]";if(Array.isArray(e))return e.map(o=>Tt(o,t+1));if(!e||typeof e!="object")return e;let n=e,r=Qo(n);if(r)return{type:r,omitted:"[private reasoning omitted]"};let s={};for(let[o,i]of Object.entries(n))Uo.has(Xo(o))||(s[o]=Tt(i,t+1));return s}function Zo(e){if(!e)return new Date().toISOString();let t=new Date(e);return Number.isNaN(t.getTime())?new Date().toISOString():t.toISOString()}function U(e){return e?.trim()||void 0}function En(e,t={}){let n={...e.provenance??{}},r=U(e.source)??U(t.source)??U(n.source);return{...e,timestamp:Zo(e.timestamp),source:r,turnId:U(e.turnId)??U(t.turnId),cwd:U(e.cwd)??U(t.cwd),data:Tt(e.data??{}),provenance:n}}import{closeSync as ke,existsSync as Rt,fsyncSync as Nt,mkdirSync as _t,openSync as Be,readFileSync as ei,readdirSync as ti,rmSync as qe,statSync as ni,writeSync as $t}from"node:fs";import{join as Y}from"node:path";var ri=12e4,si=80,oi="reconcile-required";function ii(e){Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,e)}function ve(e){return Y(e,".toolnet","journal")}function On(e){return Y(ve(e),"events.jsonl")}function Ft(e){return Y(ve(e),oi)}function Mn(e){for(let t=0;t<si;t+=1)try{return Be(e,"wx",384)}catch(n){if(n.code!=="EEXIST")throw n;try{if(Date.now()-ni(e).mtimeMs>ri){qe(e,{force:!0});continue}}catch{}ii(25)}throw new Error(`Shared project journal is locked: ${e}`)}function Pn(e){if(!Rt(e))return[];let t;try{t=ei(e,"utf8")}catch{return[]}let n=[];for(let r of t.split(/\r?\n/)){let s=r.trim();if(s)try{let o=JSON.parse(s);if(o.version!==1||typeof o.id!="string"||o.id.length===0||typeof o.projectId!="string"||o.projectId.length===0)continue;n.push(o)}catch{}}return n}function Tn(e){if(!Rt(e))return[];let t=[];for(let n of ti(e,{withFileTypes:!0})){let r=Y(e,n.name);if(n.isDirectory()){t.push(...Tn(r));continue}n.isFile()&&n.name==="events.jsonl"&&t.push(r)}return t.sort()}function Rn(e){let t=ve(e);_t(t,{recursive:!0,mode:448});let n=Ft(e),r=Be(n,"w",384);try{$t(r,`${new Date().toISOString()}
`,null,"utf8"),Nt(r)}finally{ke(r)}}function ai(e){let t=ve(e);_t(t,{recursive:!0,mode:448});let n=On(e),r=Y(t,"journal.lock"),s=Y(e,".toolnet","runtime","sources"),o=Tn(s),i=[],a=new Set;for(let l of Pn(n))a.has(l.id)||(a.add(l.id),i.push(l));let u=i.length,c=[];for(let l of o)for(let m of Pn(l))a.has(m.id)||(a.add(m.id),c.push(m));c.sort((l,m)=>{let d=l.timestamp.localeCompare(m.timestamp);return d!==0?d:l.id.localeCompare(m.id)}),i.push(...c);let p=Mn(r);try{let l=Be(n,"w",384);try{let m=i.length>0?i.map(d=>JSON.stringify(d)).join(`
`)+`
`:"";m&&$t(l,m,null,"utf8"),Nt(l)}finally{ke(l)}qe(Ft(e),{force:!0})}finally{ke(p),qe(r,{force:!0})}return{filesScanned:o.length,existingEvents:u,recoveredEvents:c.length,totalEvents:i.length}}function Nn(e,t){if(t.length===0)return;let n=ve(e);if(_t(n,{recursive:!0,mode:448}),Rt(Ft(e))){ai(e);return}let r=On(e),s=Y(n,"journal.lock"),o=Mn(s);try{let i=t.map(u=>JSON.stringify(u)).join(`
`)+`
`,a=Be(r,"a",384);try{$t(a,i,null,"utf8"),Nt(a)}finally{ke(a)}}finally{ke(o),qe(s,{force:!0})}}var mi=12e4,fi=80,gi=2e3;function yi(e){Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,e)}var Je=class{constructor(t,n={}){this.identity=t;this.eventContext=n;li(t.localDirectory,{recursive:!0}),this.eventsFile=Wt(t.localDirectory,"events.jsonl"),this.stateFile=Wt(t.localDirectory,"state.json"),this.lockFile=Wt(t.localDirectory,"journal.lock")}identity;eventContext;eventsFile;stateFile;lockFile;initialState(){let t=new Date().toISOString();return{version:1,projectId:this.identity.projectId,agent:this.identity.agent,nativeSessionId:this.identity.nativeSessionId,status:"idle",createdAt:t,updatedAt:t,lastSequence:0,lastRemoteSequence:0,remoteByteOffset:0,sourceCursors:{},recentEventIds:[]}}loadStateUnsafe(){return Cn(this.stateFile)??this.initialState()}loadState(){return this.withLock(()=>this.loadStateUnsafe())}saveStateUnsafe(t){R(this.stateFile,t)}acquireLock(){for(let t=0;t<fi;t+=1)try{return Lt(this.lockFile,"wx",384)}catch(n){if(n.code!=="EEXIST")throw n;try{if(Date.now()-$n(this.lockFile).mtimeMs>mi){_n(this.lockFile,{force:!0});continue}}catch{}yi(25)}throw new Error(`Session journal is locked: ${this.lockFile}`)}withLock(t){let n=this.acquireLock();try{return t()}finally{Kt(n),_n(this.lockFile,{force:!0})}}append(t){return t.length===0?[]:this.withLock(()=>{let n=this.loadStateUnsafe(),r=new Set(n.recentEventIds),s=n.lastSequence,o=[];for(let l of t){let m=En(l,this.eventContext),d=m.timestamp??new Date().toISOString(),g=m.data??{},S=m.provenance?.rawDigest??v(xn(g)),h=m.sourceEventId?[this.identity.projectId,this.identity.agent,this.identity.nativeSessionId,m.sourceEventId].join("|"):[this.identity.projectId,this.identity.agent,this.identity.nativeSessionId,s+1,m.type,d,S].join("|"),y=v(h).slice(0,32);if(r.has(y))continue;s+=1;let k={version:1,id:y,sequence:s,projectId:this.identity.projectId,agent:this.identity.agent,nativeSessionId:this.identity.nativeSessionId,sessionId:this.identity.nativeSessionId,type:m.type,timestamp:d,source:m.source??m.provenance?.source??this.identity.agent,data:g,provenance:{...m.provenance,rawDigest:S}};m.role!==void 0&&(k.role=m.role),m.turnId!==void 0&&(k.turnId=m.turnId),m.cwd!==void 0&&(k.cwd=m.cwd),m.sourceEventId!==void 0&&(k.sourceEventId=m.sourceEventId),m.sourceSequence!==void 0&&(k.sourceSequence=m.sourceSequence),o.push(k),r.add(y)}if(o.length===0)return[];let i=o.map(l=>JSON.stringify(l)).join(`
`)+`
`,a=Lt(this.eventsFile,"a",384);try{pi(a,i,null,"utf8"),ui(a)}finally{Kt(a)}try{Nn(this.identity.projectRoot,o)}catch{try{Rn(this.identity.projectRoot)}catch{}}let u=o[o.length-1],c="active";u.type==="session_end"||u.type==="session_idle"?c="idle":u.type==="error"&&(c="error");let p=Array.from(r).slice(-gi);return this.saveStateUnsafe({...n,status:c,updatedAt:u.timestamp,lastLocalEventAt:u.timestamp,lastSequence:u.sequence,recentEventIds:p}),o})}readPending(){return this.withLock(()=>{let t=this.loadStateUnsafe();if(!ci(this.eventsFile))return{events:[],startOffset:t.remoteByteOffset,endOffset:t.remoteByteOffset};let n=$n(this.eventsFile).size,r=Math.min(t.remoteByteOffset,n);if(n<=r)return{events:[],startOffset:r,endOffset:n};let s=n-r,o=Buffer.alloc(s),i=Lt(this.eventsFile,"r");try{di(i,o,0,s,r)}finally{Kt(i)}return{events:o.toString("utf8").split(`
`).filter(Boolean).map(c=>JSON.parse(c)),startOffset:r,endOffset:n}})}markRemote(t,n){this.withLock(()=>{let r=this.loadStateUnsafe(),s=new Date().toISOString();this.saveStateUnsafe({...r,lastRemoteSequence:Math.max(r.lastRemoteSequence,t),remoteByteOffset:Math.max(r.remoteByteOffset,n),lastRemoteAt:s,updatedAt:s})})}setSourceCursor(t,n){this.withLock(()=>{let r=this.loadStateUnsafe();this.saveStateUnsafe({...r,sourceCursors:{...r.sourceCursors,[t]:String(n)},updatedAt:new Date().toISOString()})})}};import{closeSync as sc,existsSync as oc,openSync as ic,readSync as ac,statSync as cc}from"node:fs";function Fn(e,t){let n=t.toLowerCase();return n.includes("kh\xF4ng \u0111\u01B0\u1EE3c")||n.includes("tuy\u1EC7t \u0111\u1ED1i")||n.includes("must not")||n.includes("never ")?"critical":e==="rule"||e==="decision"?"high":e==="todo"||n.includes("error")||n.includes("failed")||n.includes("exception")?"normal":"temporary"}var Dn=[/không được/iu,/tuyệt đối/iu,/bắt buộc/iu,/đừng\s+/iu,/must not/iu,/do not/iu,/don't/iu,/\bnever\b/iu],hi=[/từ giờ/iu,/về sau/iu,/mỗi lần/iu,/luôn luôn/iu,/\bluôn\b/iu,/quy tắc/iu,/workflow/iu,/\balways\b/iu,/\brequired\b/iu,/\bmust\b/iu,/from now on/iu],Si=[/\bchốt\b/iu,/quyết định/iu,/sẽ dùng/iu,/chọn .+ thay/iu,/đổi sang/iu,/chuyển sang/iu,/\bdecided\b/iu,/\bchosen\b/iu,/we will use/iu,/use .+ instead/iu,/switch(?:ed)? to/iu],ki=[/\btodo\b/iu,/cần làm/iu,/cần thêm/iu,/cần sửa/iu,/cần kiểm tra/iu,/tiếp theo/iu,/bước tiếp theo/iu,/còn phải/iu,/còn cần/iu,/next step/iu,/\bneed to\b/iu,/\bremaining\b/iu,/follow[- ]?up/iu],vi=[/đã sửa/iu,/đã fix/iu,/đã khắc phục/iu,/đã xử lý/iu,/hoàn tất/iu,/hoàn thành/iu,/\bfixed\b/iu,/\bresolved\b/iu,/\bimplemented\b/iu,/\bcompleted\b/iu,/\bpasses?\b/iu],Kn=[/kiến trúc/iu,/pipeline/iu,/adapter/iu,/schema/iu,/runtime/iu,/namespace/iu,/storage/iu,/lưu trữ/iu,/workflow/iu,/session core/iu,/memory engine/iu,/retrieval/iu],wi=[/\bdùng\b/iu,/\btách\b/iu,/\bthay\b/iu,/\bchuyển\b/iu,/\blưu\b/iu,/\bmap\b/iu,/\buse\b/iu,/\bsplit\b/iu,/\bstore\b/iu,/\breplace\b/iu,/\bmove\b/iu],bi=[/đường dẫn/iu,/\bpath\b/iu,/\bport\b/iu,/\bendpoint\b/iu,/\bdomain\b/iu,/\bbucket\b/iu,/\brepository\b/iu,/\brepo\b/iu,/\bbranch\b/iu,/\/[A-Za-z0-9._/-]{4,}/u],xi=[/\blà\b/iu,/\bở\b/iu,/\bdùng\b/iu,/\bnằm\b/iu,/\bis\b/iu,/\buse\b/iu,/located/iu,/runs on/iu],Ln=new Set(["content","text","message","prompt","summary","description","reason","title","last_assistant_message","lastAssistantMessage","input_messages","inputMessages"]),Ci=new Set(["payload","data","content","message","messages","parts","summary"]);function N(e,t){return t.some(n=>n.test(e))}function zn(e){return e.normalize("NFKC").replace(/\r/g,"").replace(/^[\s>*#\-•]+/u,"").replace(/\s+/g," ").trim()}function ji(e){return zn(e).toLowerCase().replace(/[^\p{L}\p{N}:/._-]+/gu," ").replace(/\s+/g," ").trim()}function Ii(e){return!(e.length<12||e.length>1e3||(e.match(new RegExp("\\p{L}","gu"))??[]).length<6||/^(?:https?:\/\/\S+|[A-Za-z0-9+/=]{80,})$/u.test(e))}function Dt(e,t,n,r=0){if(!(r>6)){if(typeof e=="string"){(!t||Ln.has(t))&&n.push(e);return}if(Array.isArray(e)){for(let s of e.slice(0,50))Dt(s,t,n,r+1);return}if(!(!e||typeof e!="object"))for(let[s,o]of Object.entries(e))(Ln.has(s)||Ci.has(s))&&Dt(o,s,n,r+1)}}function Ai(e){let t=[];Dt(e.data,void 0,t);let n=[],r=new Set;for(let s of t)for(let o of s.split(/\n+|(?<=[.!?])\s+/u)){let i=zn(o);if(Ii(i)&&!r.has(i)&&(r.add(i),n.push(i),n.length>=50))return n}return n}function Wn(e){return(e.role??(typeof e.data.role=="string"?e.data.role:"")).toLowerCase()}function Ei(e,t,n){if(n.type==="decision")return{kind:"decision",confidence:1};if(n.type==="todo")return{kind:"todo",confidence:1};let r=t==="user"||n.type==="user_prompt",s=t==="assistant"||n.type==="assistant_message";return r&&N(e,Dn)?{kind:"rule",confidence:.98}:r&&N(e,hi)?{kind:"rule",confidence:.92}:N(e,Si)?{kind:N(e,Kn)?"architecture":"decision",confidence:r?.93:.86}:r&&N(e,ki)?{kind:"todo",confidence:.87}:N(e,Kn)&&N(e,wi)?{kind:"architecture",confidence:r?.88:.82}:s&&N(e,vi)?{kind:"fix",confidence:.8}:r&&N(e,bi)&&N(e,xi)?{kind:"context",confidence:.79}:null}function Pi(e){switch(e){case"rule":return"rule";case"decision":case"architecture":return"decision";case"todo":return"todo";case"fix":case"context":return"code"}}function Oi(e,t,n){return e==="rule"&&N(n,Dn)?"critical":e==="architecture"||e==="decision"||e==="rule"?"high":e==="fix"||e==="context"?"normal":Fn(t,n)}function qn(e,t){let n=[],r=new Set,s=new Map;for(let o of t){let i=typeof o.data.messageId=="string"?o.data.messageId:void 0,a=Wn(o);i&&a&&s.set(i,a)}for(let o of t){let i=Wn(o),a=typeof o.data.messageId=="string"?o.data.messageId:void 0;!i&&a&&(i=s.get(a)??"");for(let u of Ai(o)){let c=Ei(u,i,o);if(!c||c.confidence<.75)continue;let p=Pi(c.kind),l=ji(u),m=v([e.projectId,c.kind,l].join("|"));if(r.has(m))continue;r.add(m);let d=o.provenance.sourcePath?[o.provenance.sourcePath]:[],g=o.sourceEventId?[o.sourceEventId]:[];n.push({version:1,fingerprint:m,projectId:e.projectId,agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,kind:c.kind,type:p,content:u,confidence:c.confidence,importance:Oi(c.kind,p,u),tags:[p],provenance:{agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,eventIds:[o.id],sourceEventIds:g,sourcePaths:d,firstSequence:o.sequence,lastSequence:o.sequence},createdAt:o.timestamp})}}return n}import{createHash as Mi}from"node:crypto";var Ti=["project-knowledge","implementation","continuation","session-context"],Ri={"project-knowledge":"Project knowledge",implementation:"Implementation state",continuation:"Work continuation","session-context":"Session context"};function zt(e){return Mi("sha256").update(e).digest("hex")}function Ve(e,t){return`${e}:${zt(t).slice(0,24)}`}function Ni(e){try{return zt(JSON.stringify(e))}catch{return zt(String(e))}}function X(e){let t=new Set,n=[];for(let r of e){let s=r?.replace(/\s+/gu," ").trim();if(!s)continue;let o=s.normalize("NFKC").toLowerCase();t.has(o)||(t.add(o),n.push(s))}return n}function Jn(e,t=420){let n=e.replace(/\s+/gu," ").trim();return n.length<=t?n:`${n.slice(0,Math.max(0,t-1)).trimEnd()}\u2026`}function _i(e){return e==="rule"||e==="architecture"?"project-knowledge":e==="decision"||e==="fix"?"implementation":e==="todo"?"continuation":"session-context"}function Bn(e){return e.length===0?0:e.reduce((t,n)=>t+n,0)/e.length}function $i(e){return e.slice().sort((t,n)=>n.importanceScore-t.importanceScore||n.confidence-t.confidence||t.id.localeCompare(n.id)).slice(0,5).map(t=>Jn(t.content)).join(" | ")}function Fi(e){return e.slice().sort((t,n)=>n.importanceScore-t.importanceScore||n.confidence-t.confidence||t.id.localeCompare(n.id)).slice(0,6).map(t=>Jn(t.content)).join(`
`)}function Vn(e,t){let n=e.slice().sort((m,d)=>m.sequence-d.sequence||m.timestamp.localeCompare(d.timestamp)||m.id.localeCompare(d.id)),r=n.map(m=>({id:Ve("raw",[m.projectId,m.agent,m.nativeSessionId,m.id,String(m.sequence)].join("|")),level:"raw",eventId:m.id,sourceEventId:m.sourceEventId,sequence:m.sequence,type:m.type,role:m.role,timestamp:m.timestamp,sourcePath:m.provenance.sourcePath,payloadDigest:Ni(m.data)})),s=new Map,o=new Map;n.forEach((m,d)=>{let g=r[d];g&&(s.set(m.id,g.id),m.sourceEventId&&o.set(m.sourceEventId,g.id))});let i=t.map(m=>{let d=X([...m.provenance.eventIds.map(g=>s.get(g)),...m.provenance.sourceEventIds.map(g=>o.get(g))]);return{id:Ve("fact",m.fingerprint),level:"fact",fingerprint:m.fingerprint,kind:m.kind,type:m.type,content:m.content,knowledgeClass:m.knowledgeClass,importanceScore:m.importanceScore,confidence:m.confidence,tags:X([...m.tags,"level:fact",`class:${m.knowledgeClass}`,`kind:${m.kind}`]),rawIds:d,sourcePaths:X(m.provenance.sourcePaths)}}),a=new Map;for(let m of i){let d=_i(m.kind),g=a.get(d)??[];g.push(m),a.set(d,g)}let u=[];for(let m of Ti){let d=a.get(m);if(!d?.length)continue;let g=d.slice().sort((h,y)=>y.importanceScore-h.importanceScore||y.confidence-h.confidence||h.id.localeCompare(y.id)),S=g.map(h=>h.id);u.push({id:Ve("scene",`${m}|${S.join("|")}`),level:"scene",kind:m,title:Ri[m],summary:$i(g),factIds:S,importanceScore:Math.max(...g.map(h=>h.importanceScore)),confidence:Bn(g.map(h=>h.confidence)),tags:X(["level:scene",`scene:${m}`,...g.flatMap(h=>h.tags)]),sourcePaths:X(g.flatMap(h=>h.sourcePaths))})}let c=new Map(i.map(m=>[m.id,m])),p=[];for(let m of u){let g=m.factIds.map(y=>c.get(y)).filter(y=>!!y).filter(y=>(y.knowledgeClass==="permanent"||y.knowledgeClass==="task")&&y.importanceScore>=.55);if(g.length===0)continue;let S=g.some(y=>y.knowledgeClass==="permanent")?"permanent":"task",h=Fi(g);p.push({id:Ve("knowledge",`${m.id}|${S}|${g.map(y=>y.id).join("|")}`),level:"knowledge",knowledgeClass:S,title:m.title,content:h,sceneIds:[m.id],factIds:g.map(y=>y.id),importanceScore:Math.max(...g.map(y=>y.importanceScore)),confidence:Bn(g.map(y=>y.confidence)),tags:X(["level:knowledge",`class:${S}`,`scene:${m.kind}`,...g.flatMap(y=>y.tags)]),sourcePaths:X(g.flatMap(y=>y.sourcePaths))})}let l=[];for(let m of i)for(let d of m.rawIds)l.push({from:d,to:m.id,type:"supports"});for(let m of u)for(let d of m.factIds)l.push({from:d,to:m.id,type:"belongs_to"});for(let m of p)for(let d of m.sceneIds)l.push({from:d,to:m.id,type:"promotes_to"});return{schema:"toolnet.memory-hierarchy.v1",version:1,raw:r,facts:i,scenes:u,knowledge:p,links:l,stats:{raw:r.length,facts:i.length,scenes:u.length,knowledge:p.length,links:l.length}}}function Ge(e){return e?Math.ceil(e.length/3.5):0}function He(e,t){if(!e)return"";if(Ge(e)<=t)return e;let r=Math.floor(t*3.5),s=e.slice(0,r),o=s.lastIndexOf("."),i=s.lastIndexOf(`
`),a=Math.max(o,i);return a>r*.7?s.slice(0,a+1):s}function Q(){let e=_e(),t=process.env.TOOLNET_SESSION_SAVE||"summary",n=process.env.TOOLNET_RAW_TRANSCRIPT==="on"||t==="archive"||t==="full",r=process.env.TOOLNET_MEMORY_PROMOTION||"conservative",s=parseFloat(process.env.TOOLNET_PROMOTE_MIN_SCORE||"0.65"),o=parseInt(process.env.TOOLNET_SESSION_SUMMARY_MAX_TOKENS||"700",10),i=parseInt(process.env.TOOLNET_DURABLE_MEMORY_MAX_ITEMS_PER_SESSION||"10",10),a=n,u=process.env.TOOLNET_RAW_TRANSCRIPT_REMOTE==="on"||t==="full";return{sessionSave:t,rawTranscript:n,memoryPromotion:r,promoteMinScore:s,sessionSummaryMaxTokens:o,durableMemoryMaxItemsPerSession:i,archiveLocal:a,archiveRemote:u}}function Gn(e){return(e||Q()).rawTranscript}function Hn(e){return(e||Q()).durableMemoryMaxItemsPerSession}function Un(e){return(e||Q()).sessionSummaryMaxTokens}function Yn(e){return(e||Q()).archiveRemote}var Xn=new H;function Qn(e){let t=e.trim();if(t.startsWith("{")&&t.endsWith("}")||t.startsWith("[")&&t.endsWith("]"))try{let r=JSON.parse(t);return JSON.stringify(Xn.sanitizeValue(r))}catch{}let n=Xn.sanitize(e).text;return n=n.replace(/("(?:api[_-]?key|token|secret|password|cookie|authorization)"\s*:\s*)"[^"]*"/gi,'$1"[REDACTED]"').replace(/('(?:api[_-]?key|token|secret|password|cookie|authorization)'\s*:\s*)'[^']*'/gi,"$1'[REDACTED]'").replace(/\b(api[_-]?key|token|secret|password|cookie|authorization)\b\s*[:=]\s*[^\s,;]+/gi,"$1=[REDACTED]").replace(/\bbearer\s+[A-Za-z0-9._~+/=-]+/gi,"Bearer [REDACTED]"),n}function Ki(e,t){let n=e.toLowerCase(),r=.5,s=["nh\u1EDB","remember","quy t\u1EAFc","rule","t\u1EEB gi\u1EDD","from now","kh\xF4ng \u0111\u01B0\u1EE3c","must not","lu\xF4n lu\xF4n","always","never","critical","important","blocker","deploy","production","architecture"];for(let i of s)n.includes(i)&&(r+=.15);t==="rule"||t==="architecture"||t==="blocker"?r+=.2:t==="decision"||t==="deploy"?r+=.15:(t==="fix"||t==="next_action")&&(r+=.1),e.length<20?r-=.3:e.length>500&&(r-=.1);let o=[/npm (notice|warn|ERR)/i,/\d+ packages? in \d+/i,/found \d+ vulnerabilities/i,/up to date/i,/added \d+ packages/i,/^(ok|done|success|error|warning)$/i];for(let i of o)i.test(e)&&(r-=.4);return Math.max(0,Math.min(1,r))}function Li(e,t){let n=[],r=new Set;for(let i of e){let a=i.split(`
`).filter(u=>u.trim());for(let u of a){let c=u.trim();if(c.length<15)continue;let p=c.toLowerCase().replace(/\s+/g," ");if(r.has(p))continue;r.add(p);let l="decision";/\b(rule|quy tắc|policy|standard|convention)\b/i.test(c)||/\b(always|never|must|should|từ giờ|không được)\b/i.test(c)?l="rule":/\b(fix|fixed|bug|issue|error|lỗi)\b/i.test(c)?l="fix":/\b(blocker|blocked|stuck|cannot|không thể)\b/i.test(c)?l="blocker":/\b(next|todo|action|task|cần làm)\b/i.test(c)?l="next_action":/\b(deploy|release|publish|ship)\b/i.test(c)?l="deploy":/\b(architecture|design|structure|pattern)\b/i.test(c)?l="architecture":/\.(ts|js|py|go|rs|java|cpp|c|h)\b/i.test(c)&&(l="file");let m=Ki(c,l);if(m<.3)continue;let d=Qn(c);n.push({category:l,text:d,importance:m,sourceSessionId:t})}}let s=Q(),o=Hn(s);return n.sort((i,a)=>a.importance-i.importance).slice(0,o)}function Wi(e){let t=Q(),n=Un(t),o=e.join(`

`).split(`
`).filter(i=>{let a=i.trim();return a.length>20&&!a.startsWith("npm")&&!a.startsWith("\u2713")&&!a.startsWith("Error:")}).slice(0,20).map(i=>Qn(i)).join(`
`);return He(o,n)}function Ue(e,t){let r=(Array.isArray(e)?e:e.split(`

`).filter(d=>d.trim())).map(d=>typeof d=="string"?d:JSON.stringify(d)).filter(d=>d.trim()),s=Li(r,t),o=s.filter(d=>d.category==="decision").map(d=>d.text),i=s.filter(d=>d.category==="rule").map(d=>d.text),a=s.filter(d=>d.category==="file").map(d=>d.text),u=s.filter(d=>d.category==="fix").map(d=>d.text),c=s.filter(d=>d.category==="blocker").map(d=>d.text),p=s.filter(d=>d.category==="next_action").map(d=>d.text),l=s.filter(d=>d.category==="deploy").map(d=>d.text);return{summary:Wi(r),decisions:o,projectRules:i,filesChanged:a,bugsFixed:u,commands:l,blockers:c,nextActions:p,durableFacts:s}}function J(e){let t=new Set,n=[];for(let r of e){let s=r?.replace(/\s+/g," ").trim();if(!s)continue;let o=s.normalize("NFKC").toLowerCase();t.has(o)||(t.add(o),n.push(s))}return n}function Di(e){let t=new Map;for(let n of e){if(!n||!n.id||!Number.isFinite(n.sequence))continue;let r=n.sourceEventId?`${n.agent}:${n.sourceEventId}`:n.id,s=t.get(r);(!s||n.sequence>s.sequence)&&t.set(r,n)}return[...t.values()].sort((n,r)=>n.sequence-r.sequence||n.timestamp.localeCompare(r.timestamp))}function zi(e){switch(e){case"critical":return 1;case"high":return .85;case"normal":return .6;case"temporary":return .25}}function qi(e){let t=zi(e.importance);return Math.max(0,Math.min(1,t*.75+e.confidence*.25))}function Bi(e){return e.importance==="temporary"||e.confidence<.78?"transient":e.kind==="rule"||e.kind==="architecture"?"permanent":e.kind==="decision"||e.kind==="todo"||e.kind==="fix"?"task":"session"}function Ji(e){let t=e.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}_./:-]+/gu)??[],n=new Set;for(let r of t)if(!(r.length<2||/^\d+$/u.test(r))&&(n.add(r),n.size>=40))break;return[...n]}function Vi(e){let t=Bi(e),n=qi(e),r=Ji(e.content);return{...e,knowledgeClass:t,importanceScore:n,retrievalTerms:r,tags:J([...e.tags,"level:fact",`class:${t}`,`kind:${e.kind}`])}}function Gi(e){return e.map(t=>{try{return JSON.stringify({type:t.type,role:t.role,data:t.data,provenance:{sourcePath:t.provenance.sourcePath,files:t.provenance.files}})}catch{return""}}).filter(Boolean)}function Hi(e,t,n){let r=Ue(Gi(t),e.nativeSessionId),s=n.filter(c=>c.kind==="todo").map(c=>c.content),o=n.flatMap(c=>c.provenance.sourcePaths),i=n.filter(c=>c.kind==="architecture").map(c=>c.content),a=J([...s,...r.nextActions]),u=J([...r.nextActions,...s]);return{summary:r.summary,state:{task:u[0]??a[0],decisions:J(r.decisions),files:J([...r.filesChanged,...o]),todos:a,completed:J(r.bugsFixed),blockers:J(r.blockers),nextActions:u,architecture:J(i)}}}function Ye(e,t){let n=Di(t),r=qn(e,n).map(Vi),s=r.filter(p=>p.knowledgeClass!=="transient").sort((p,l)=>l.importanceScore-p.importanceScore),{summary:o,state:i}=Hi(e,n,s),a=s.map(p=>({fingerprint:p.fingerprint,kind:p.kind,knowledgeClass:p.knowledgeClass,importanceScore:p.importanceScore,content:p.content,terms:p.retrievalTerms})),u=Vn(n,s),c=p=>r.filter(l=>l.knowledgeClass===p).length;return{version:2,normalizedEvents:n,summary:o,state:i,candidates:s,retrievalIndex:a,hierarchy:u,stats:{inputEvents:t.length,normalizedEvents:n.length,extractedCandidates:r.length,persistedCandidates:s.length,permanent:c("permanent"),task:c("task"),session:c("session"),transient:c("transient")}}}import{createHash as Ui}from"node:crypto";import{chmodSync as Zn,existsSync as Yi,mkdirSync as Xi,readFileSync as Qi,renameSync as Zi,writeFileSync as er}from"node:fs";import{dirname as tr,join as Xe}from"node:path";var Jt="toolnet.context-offload.v1",ea="toolnet.context-offload-asset.v1",ta=256,na=new Set(["tool_call","tool_result","file_read","file_write","file_edit","command","test","artifact"]);function nr(e){return Xe(e,".toolnet","offload")}function ra(e){return Xe(nr(e),"assets")}function rr(e){return Xe(nr(e),"graph.json")}function sr(e){Xi(e,{recursive:!0,mode:448});try{Zn(e,448)}catch{}}function sa(e,t){sr(tr(e));let n=`${e}.${process.pid}.${Date.now()}.tmp`;er(n,t,{encoding:"utf8",mode:384}),Zi(n,e);try{Zn(e,384)}catch{}}function Bt(e){return Array.isArray(e)?e.map(Bt):e&&typeof e=="object"?Object.fromEntries(Object.entries(e).sort(([t],[n])=>t.localeCompare(n)).map(([t,n])=>[t,Bt(n)])):e}function oa(e){return Ui("sha256").update(JSON.stringify(Bt(e)),"utf8").digest("hex")}function qt(){return{schema:Jt,version:1,updatedAt:new Date(0).toISOString(),nodes:[]}}function ia(e){let t=rr(e);if(!Yi(t))return qt();try{let n=JSON.parse(Qi(t,"utf8"));return n.schema!==Jt||n.version!==1||!Array.isArray(n.nodes)?qt():n}catch{return qt()}}function aa(e,t){sa(rr(e),JSON.stringify(t,null,2)+`
`)}function ca(e,t=260){if(typeof e!="string")return null;let n=e.replace(/\s+/gu," ").trim();return n?n.slice(0,t):null}function ua(e){let t=[...e.provenance.files??[],e.provenance.sourcePath],n=[];for(let r of t){let s=ca(r);if(!(!s||n.includes(s))&&(n.push(s),n.length===3))break}return n}function la(e){return`${e.agent}:${e.sourceEventId??e.id}`.replace(/\s+/gu," ").trim().slice(0,120)}function da(e,t){sr(tr(e));try{return er(e,t,{encoding:"utf8",flag:"wx",mode:384}),!0}catch(n){if(n.code==="EEXIST")return!1;throw n}}function pa(e,t){let n=e.nodes.find(s=>s.id===t.id),r=n?{...n,kind:t.kind,bytes:t.bytes,sourceRefs:Array.from(new Set([...n.sourceRefs,...t.sourceRefs])).slice(-8),files:Array.from(new Set([...n.files,...t.files])).slice(0,6)}:t;return{schema:Jt,version:1,updatedAt:new Date().toISOString(),nodes:[...e.nodes.filter(s=>s.id!==t.id),r].slice(-ta)}}function or(e,t){let n=ia(e),r=0,s=0,o=0,i=[];for(let a of t){if(!na.has(a.type))continue;r+=1;let u=oa({type:a.type,data:a.data}),c={schema:ea,version:1,assetId:u,event:{type:a.type,agent:a.agent,nativeSessionId:a.nativeSessionId,timestamp:a.timestamp,sourceEventId:a.sourceEventId,provenance:a.provenance,data:a.data}},p=JSON.stringify(c,null,2)+`
`;da(Xe(ra(e),`${u}.json`),p)?s+=1:o+=1,i.push(u),n=pa(n,{id:u,kind:a.type,bytes:Buffer.byteLength(p,"utf8"),createdAt:a.timestamp,sourceRefs:[la(a)],files:ua(a)})}return r>0&&aa(e,n),{eligible:r,written:s,deduped:o,graphNodes:n.nodes.length,assetIds:i}}import{createHash as va}from"node:crypto";import{existsSync as wa,readdirSync as ba,readFileSync as xa}from"node:fs";import{basename as Ca,join as br}from"node:path";import{randomUUID as cr}from"node:crypto";var A=class extends Error{constructor(n,r){super(n);this.statusCode=r}statusCode};function we(e){let t=new Set,n=[];for(let r of e){let s=r.replace(/\s+/gu," ").trim();if(!s)continue;let o=s.normalize("NFKC").toLowerCase();t.has(o)||(t.add(o),n.push(s))}return n}function ee(e){let t=e.normalize("NFKD").replace(/[\u0300-\u036f]/gu,"").toLowerCase().replace(/[^a-z0-9]+/gu,"-").replace(/^-+|-+$/gu,"").slice(0,120);if(!t)throw new A("Invalid Wiki slug",400);return t}function ir(e){let t=[];for(let n of e.matchAll(/\[\[([^\[\]]+)\]\]/gu)){let r=n[1]?.trim();r&&t.push(ee(r))}return we(t)}function ma(e){return e.normalize("NFKC").toLowerCase().split(/[^\p{L}\p{N}_-]+/u).map(t=>t.trim()).filter(t=>t.length>=2)}function ar(e){return{id:`revision-${cr()}`,pageId:e.id,slug:e.slug,revision:e.revision,title:e.title,...e.summary?{summary:e.summary}:{},content:e.content,tags:[...e.tags],links:[...e.links],createdAt:e.updatedAt}}function Z(e){return structuredClone(e)}var Qe=class{constructor(t){this.store=t}store;state;queue=Promise.resolve();async initialize(){await this.ensureState()}async ensureState(){return this.state||(this.state=await this.store.load()),this.state}async mutate(t){let n,r=this.queue.then(async()=>{let s=await this.ensureState();n=t(s),s.updatedAt=new Date().toISOString(),await this.store.save(s)});return this.queue=r.then(()=>{},()=>{}),await r,n}async summary(){let t=await this.ensureState(),n=new Set(t.pages.flatMap(r=>r.links));return{schema:"toolnet.wiki-summary.v1",projectId:t.projectId,pages:t.pages.length,revisions:t.revisions.length,tags:we(t.pages.flatMap(r=>r.tags)).sort((r,s)=>r.localeCompare(s)),links:t.pages.reduce((r,s)=>r+s.links.length,0),orphanPages:t.pages.filter(r=>r.links.length===0&&!n.has(r.slug)).length,automatedPages:t.pages.filter(r=>r.tags.some(s=>s.startsWith("toolnet-auto-"))).length,updatedAt:t.updatedAt}}async listPages(){let t=await this.ensureState();return Z([...t.pages].sort((n,r)=>n.title.localeCompare(r.title)))}async getPage(t){let n=await this.ensureState(),r=ee(t),s=n.pages.find(o=>o.slug===r||o.id===t);if(!s)throw new A(`Wiki page not found: ${t}`,404);return Z(s)}async createPage(t){return this.mutate(n=>{let r=t.title.trim(),s=t.content.trim();if(!r)throw new A("Wiki title is required",400);let o=ee(t.slug??r);if(n.pages.some(u=>u.slug===o))throw new A(`Wiki page already exists: ${o}`,409);let i=new Date().toISOString(),a={id:`wiki-${cr()}`,slug:o,title:r,...t.summary?.trim()?{summary:t.summary.trim()}:{},content:s,tags:we(t.tags??[]),links:ir(s),revision:1,createdAt:i,updatedAt:i};return n.pages.push(a),n.revisions.push(ar(a)),Z(a)})}async updatePage(t,n){return this.mutate(r=>{let s=ee(t),o=r.pages.find(i=>i.slug===s||i.id===t);if(!o)throw new A(`Wiki page not found: ${t}`,404);if(n.title!==void 0){let i=n.title.trim();if(!i)throw new A("Wiki title is required",400);o.title=i}if(n.summary!==void 0){let i=n.summary.trim();i?o.summary=i:delete o.summary}return n.content!==void 0&&(o.content=n.content.trim(),o.links=ir(o.content)),n.tags!==void 0&&(o.tags=we(n.tags)),o.revision+=1,o.updatedAt=new Date().toISOString(),r.revisions.push(ar(o)),Z(o)})}async history(t){let n=await this.getPage(t),r=await this.ensureState();return Z(r.revisions.filter(s=>s.pageId===n.id).sort((s,o)=>o.revision-s.revision))}async backlinks(t){let n=await this.getPage(t),r=await this.ensureState();return Z(r.pages.filter(s=>s.links.includes(n.slug)).sort((s,o)=>s.title.localeCompare(o.title)))}async search(t,n=10){let r=await this.ensureState(),s=we(ma(t));if(s.length===0)return[];let o=Math.max(1,Math.min(20,Math.floor(n))),i=[];for(let a of r.pages){let u=a.title.toLowerCase(),c=a.slug.toLowerCase(),p=a.summary?.toLowerCase()??"",l=a.content.toLowerCase(),m=a.tags.map(g=>g.toLowerCase()),d=0;for(let g of s)c===g&&(d+=12),u===g&&(d+=10),u.includes(g)&&(d+=6),c.includes(g)&&(d+=5),m.some(S=>S===g)?d+=5:m.some(S=>S.includes(g))&&(d+=3),p.includes(g)&&(d+=2),l.includes(g)&&(d+=1);d>0&&i.push({page:Z(a),score:d})}return i.sort((a,u)=>u.score-a.score||u.page.updatedAt.localeCompare(a.page.updatedAt)).slice(0,o)}};var ur="wiki/state.v1.json";function fa(e){let t=new Date().toISOString();return{schema:"toolnet.wiki.v1",version:1,projectId:e.id,pages:[],revisions:[],createdAt:t,updatedAt:t}}function ga(e,t){let n=JSON.parse(e);if(n.schema!=="toolnet.wiki.v1"||n.version!==1||n.projectId!==t.id||!Array.isArray(n.pages)||!Array.isArray(n.revisions))throw new Error("Invalid ToolNet Wiki state");return n}var Ze=class{constructor(t,n){this.storage=t;this.project=n}storage;project;async load(){let t=await this.storage.getText(ur);if(!t){let n=fa(this.project);return await this.save(n),n}return ga(t,this.project)}async save(t){await this.storage.put(ur,JSON.stringify(t,null,2),"application/json")}};import{createHash as ya,randomUUID as lr}from"node:crypto";var dr="wiki/governance.v1.json",gr="toolnet.knowledge-governance.v1",pr=500,be={autoApproveThreshold:.86,criticalApproveThreshold:.94,staleAfterDays:90};function ha(e,t=0,n=1){return Math.max(t,Math.min(n,e))}function Vt(e){return e.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/gu," ").trim()}function mr(e){return ya("sha256").update(e.normalize("NFKC").replace(/\s+/gu," ").trim()).digest("hex")}function Sa(e){let t=[e.title,e.summary??"",e.content.slice(0,2e3),...e.tags].join(" ").toLowerCase();return/\b(?:architecture|security|authentication|authorization|auth|database|production|deploy|deployment|payment|billing|permission|permissions|acl|credential|secret|migration)\b/u.test(t)}function ka(e){let t=e.sourceType==="skill"?.96:e.sourceType==="memory"?.94:.88,n=e.tags.map(r=>r.toLowerCase());return(n.includes("permanent")||n.includes("task"))&&(t+=.03),e.content.length>=200&&(t+=.02),e.content.length<80&&(t-=.05),e.title.length<4&&(t-=.05),ha(t)}function fr(e){let t=new Date().toISOString();return{schema:gr,version:1,projectId:e,policy:{...be},reviews:[],audit:[],createdAt:t,updatedAt:t}}function yr(e){let t=e.autoApproveThreshold??be.autoApproveThreshold,n=e.criticalApproveThreshold??be.criticalApproveThreshold,r=e.staleAfterDays??be.staleAfterDays;if(!Number.isFinite(t)||t<.5||t>1)throw new A("Invalid autoApproveThreshold",400);if(!Number.isFinite(n)||n<.5||n>1)throw new A("Invalid criticalApproveThreshold",400);if(!Number.isInteger(r)||r<1||r>3650)throw new A("Invalid staleAfterDays",400);return{autoApproveThreshold:t,criticalApproveThreshold:n,staleAfterDays:r}}var et=class{constructor(t,n){this.storage=t;this.project=n}storage;project;async load(){let t=await this.storage.getText(dr);if(!t){let n=fr(this.project.id);return await this.save(n),n}try{let n=JSON.parse(t);if(n.schema!==gr||n.version!==1||n.projectId!==this.project.id||!Array.isArray(n.reviews)||!Array.isArray(n.audit))throw new Error("invalid");return{...n,policy:yr(n.policy??be)}}catch{let n=fr(this.project.id);return await this.save(n),n}}async save(t){await this.storage.put(dr,JSON.stringify(t,null,2),"application/json")}},tt=class{constructor(t){this.store=t}store;state;queue=Promise.resolve();async initialize(){await this.ensureState()}async ensureState(){return this.state||(this.state=await this.store.load()),this.state}audit(t,n,r,s={}){t.audit.push({id:lr(),action:n,principal:r,...s.reviewId?{reviewId:s.reviewId}:{},...s.sourceKey?{sourceKey:s.sourceKey}:{},timestamp:new Date().toISOString(),...s.metadata?{metadata:s.metadata}:{}}),t.audit.length>pr&&(t.audit=t.audit.slice(-pr))}async mutate(t){let n,r=this.queue.then(async()=>{let s=await this.ensureState();n=await t(s),s.updatedAt=new Date().toISOString(),await this.store.save(s)});return this.queue=r.then(()=>{},()=>{}),await r,n}async policy(){return{...(await this.ensureState()).policy}}async setPolicy(t,n){return this.mutate(r=>(r.policy=yr({...r.policy,...t}),this.audit(r,"policy:update",n,{metadata:{...r.policy}}),{...r.policy}))}async summary(){let t=await this.ensureState(),n=r=>t.reviews.filter(s=>s.status===r).length;return{schema:"toolnet.knowledge-governance-summary.v1",projectId:t.projectId,pending:n("pending"),approved:n("approved"),rejected:n("rejected"),superseded:n("superseded"),criticalPending:t.reviews.filter(r=>r.status==="pending"&&r.risk==="critical").length,conflictPending:t.reviews.filter(r=>r.status==="pending"&&r.risk==="conflict").length,auditEvents:t.audit.length,policy:{...t.policy},updatedAt:t.updatedAt}}async listReviews(t){let n=await this.ensureState();return structuredClone(n.reviews.filter(r=>!t||r.status===t).sort((r,s)=>s.updatedAt.localeCompare(r.updatedAt)))}async auditLog(t=100){let n=await this.ensureState(),r=Math.max(1,Math.min(500,Math.floor(t)));return structuredClone(n.audit.slice(-r).reverse())}async assess(t,n){let r=await this.ensureState(),s=ka(t),o=Vt(t.title),i=n.filter(p=>p.slug!==t.slug&&Vt(p.title)===o&&mr(p.content)!==mr(t.content)).map(p=>p.slug),a=Sa(t),u=[];s<r.policy.autoApproveThreshold&&u.push(`confidence:${s.toFixed(2)}`),a&&s<r.policy.criticalApproveThreshold&&u.push("critical-knowledge"),i.length>0&&u.push("conflicting-knowledge");let c=i.length>0?"conflict":a?"critical":"normal";return{confidence:s,risk:c,requiresReview:i.length>0||s<r.policy.autoApproveThreshold||a&&s<r.policy.criticalApproveThreshold,reasons:u,conflicts:i}}async gate(t,n){let r=await this.assess(t,n);return this.mutate(s=>{let o=s.reviews.find(u=>u.sourceKey===t.sourceKey&&u.digest===t.digest);if(o?.status==="approved")return{allowed:!0,mode:"review-approved",assessment:r,review:structuredClone(o)};if(o?.status==="rejected")return{allowed:!1,mode:"rejected",assessment:r,review:structuredClone(o)};if(!r.requiresReview)return this.audit(s,"knowledge:auto-approved","system",{sourceKey:t.sourceKey,metadata:{confidence:r.confidence,risk:r.risk}}),{allowed:!0,mode:"auto-approved",assessment:r};if(o?.status==="pending")return{allowed:!1,mode:"pending-review",assessment:r,review:structuredClone(o)};let i=new Date().toISOString(),a={id:lr(),sourceKey:t.sourceKey,sourceType:t.sourceType,slug:t.slug,marker:t.marker,digest:t.digest,title:t.title,...t.summary?{summary:t.summary}:{},content:t.content,tags:[...new Set([...t.tags,t.marker])],confidence:r.confidence,risk:r.risk,reasons:[...r.reasons],conflicts:[...r.conflicts],status:"pending",createdAt:i,updatedAt:i};return s.reviews.push(a),this.audit(s,"knowledge:review-requested","system",{reviewId:a.id,sourceKey:a.sourceKey,metadata:{confidence:a.confidence,risk:a.risk}}),{allowed:!1,mode:"pending-review",assessment:r,review:structuredClone(a)}})}async markApplied(t,n){await this.mutate(r=>{let s=r.reviews.find(o=>o.sourceKey===t&&o.digest===n&&o.status==="approved");s&&(s.appliedAt=new Date().toISOString(),s.updatedAt=s.appliedAt,this.audit(r,"knowledge:applied",s.reviewedBy??"system",{reviewId:s.id,sourceKey:t}))})}async decide(t,n,r){return this.mutate(async s=>{let o=s.reviews.find(c=>c.id===t);if(!o)throw new A(`Governance review not found: ${t}`,404);if(o.status!=="pending")throw new A("Governance review is already resolved",409);let i=new Date().toISOString();if(o.reviewedAt=i,o.reviewedBy=n.principal,o.updatedAt=i,n.note?.trim()&&(o.reviewNote=n.note.trim()),n.action==="reject")return o.status="rejected",this.audit(s,"knowledge:rejected",n.principal,{reviewId:t,sourceKey:o.sourceKey}),structuredClone(o);if(n.action==="supersede")return o.status="superseded",n.targetReviewId&&(o.supersededBy=n.targetReviewId),this.audit(s,"knowledge:superseded",n.principal,{reviewId:t,sourceKey:o.sourceKey,metadata:{targetReviewId:n.targetReviewId}}),structuredClone(o);if(n.action==="merge"){if(!n.targetReviewId)throw new A("targetReviewId is required for merge",400);let c=s.reviews.find(p=>p.id===n.targetReviewId);if(!c)throw new A("Merge target review not found",404);return o.status="superseded",o.mergedInto=c.id,this.audit(s,"knowledge:merged",n.principal,{reviewId:t,sourceKey:o.sourceKey,metadata:{targetReviewId:c.id}}),structuredClone(o)}o.status="approved";let u=(await r.listPages()).find(c=>c.slug===o.slug);if(u&&!u.tags.includes(o.marker))throw new A(`Wiki page '${o.slug}' is manually managed`,409);return u?await r.updatePage(o.slug,{title:o.title,summary:o.summary??"",content:o.content,tags:o.tags}):await r.createPage({slug:o.slug,title:o.title,...o.summary?{summary:o.summary}:{},content:o.content,tags:o.tags}),o.appliedAt=i,this.audit(s,"knowledge:approved",n.principal,{reviewId:t,sourceKey:o.sourceKey}),structuredClone(o)})}async quality(t){let n=await this.ensureState(),r=await t.listPages(),s=Date.now(),o=n.policy.staleAfterDays*864e5,i=r.map(p=>{let l=s-Date.parse(p.updatedAt);return{slug:p.slug,title:p.title,updatedAt:p.updatedAt,ageDays:Math.max(0,Math.floor(l/864e5)),stale:Number.isFinite(l)&&l>o}}).filter(p=>p.stale).map(({stale:p,...l})=>l),a=new Map;for(let p of r){let l=Vt(p.title),m=a.get(l)??[];m.push(p),a.set(l,m)}let u=[...a.entries()].filter(([,p])=>p.length>1).map(([p,l])=>({title:p,pages:l.map(m=>m.slug)})),c=n.reviews.filter(p=>p.status==="pending");return{schema:"toolnet.knowledge-quality.v1",totalPages:r.length,automatedPages:r.filter(p=>p.tags.some(l=>l.startsWith("toolnet-auto-"))).length,manualPages:r.filter(p=>!p.tags.some(l=>l.startsWith("toolnet-auto-"))).length,stalePages:i,duplicateTitles:u,pendingReviews:c.length,lowConfidenceReviews:c.filter(p=>p.confidence<n.policy.autoApproveThreshold).length,conflicts:c.filter(p=>p.risk==="conflict").length,generatedAt:new Date().toISOString()}}};var xr="wiki/automation.v1.json",Cr="toolnet.wiki-automation.v1",Ut=8e3,hr=new Set(["raw","rawtext","raw_text","rawtranscript","raw_transcript","transcript","messages","message","payload","prompt","response","assistantmessage","assistant_message","userprompt","user_prompt"]);function Ce(e){return va("sha256").update(JSON.stringify(e)).digest("hex")}function xe(e){if(!(!e||typeof e!="object"||Array.isArray(e)))return e}function Sr(e){return Array.isArray(e)?e:[]}function jr(e){return typeof e!="string"?void 0:e.replace(/\s+/gu," ").trim()||void 0}function Gt(e){return Array.isArray(e)?e.map(jr).filter(t=>!!t):[]}function F(e,t){for(let n of t){let r=jr(e[n]);if(r)return r}}function je(e){let t=new Set,n=[];for(let r of e){let s=r.replace(/\s+/gu," ").trim();if(!s)continue;let o=s.normalize("NFKC").toLowerCase();t.has(o)||(t.add(o),n.push(s))}return n}function nt(e,t=0,n=""){if(t>3)return[];let r=n.replace(/[^a-z0-9]/giu,"").toLowerCase();if(hr.has(r))return[];if(typeof e=="string"){let i=e.replace(/\s+/gu," ").trim();return i.length<8?[]:[i]}if(Array.isArray(e))return e.flatMap(i=>nt(i,t+1,n));let s=xe(e);if(!s)return[];let o=[];for(let[i,a]of Object.entries(s)){let u=i.replace(/[^a-z0-9]/giu,"").toLowerCase();hr.has(u)||o.push(...nt(a,t+1,i))}return o}function kr(e){let n=je(["content","summary","text","value","statement","description","decision","task","knowledge","context","outcome","reason","rationale"].flatMap(s=>nt(e[s],0,s)));return(n.length>0?n:je(nt(e))).join(`

`).slice(0,Ut)}function vr(e,t){return F(e,["id","key","fingerprint","knowledgeId","sceneId"])??t}function wr(e,t){return F(e,["title","name","topic","label","task","kind","type"])??t}function ja(e){return(F(e,["knowledgeClass","class","classification","scope"])??"").toLowerCase()}function Ia(e){return(F(e,["kind","sceneKind","type"])??"").toLowerCase()}function Aa(e){let t=xe(e);if(!t)return[];let n=[],r=Sr(t.knowledge);for(let[o,i]of r.entries()){let a=xe(i);if(!a)continue;let u=ja(a);if(u==="session"||u==="transient")continue;let c=kr(a);if(c.length<20)continue;let p=vr(a,Ce(a).slice(0,16)),l=wr(a,`Durable Memory ${o+1}`);n.push({sourceKey:`memory:${p}`,sourceType:"memory",title:l,summary:F(a,["summary","description"]),content:c,tags:je(["toolnet","auto","memory",...u?[u]:[]])})}let s=Sr(t.scenes);for(let[o,i]of s.entries()){let a=xe(i);if(!a)continue;let u=Ia(a);if(u==="session-context")continue;let c=kr(a);if(c.length<20)continue;let p=vr(a,Ce(a).slice(0,16)),l=wr(a,`Knowledge Scene ${o+1}`);n.push({sourceKey:`scene:${p}`,sourceType:"scene",title:l,summary:F(a,["summary","description"]),content:c,tags:je(["toolnet","auto","scene",...u?[u]:[]])})}return n}function Ea(e){return br(e,".toolnet","memory","skills")}function Pa(e){let t=Ea(e);if(!wa(t))return{candidates:[],failed:0};let n=[],r=0,s=ba(t).filter(o=>o.endsWith(".json")).sort();for(let o of s)try{let i=JSON.parse(xa(br(t,o),"utf8")),a=xe(i);if(!a||a.schema!=="toolnet.skill-memory.v1")continue;let u=F(a,["id","fingerprint"])??Ca(o,".json"),c=F(a,["task"])??"",p=F(a,["title"])||c||`Reusable Skill ${u.slice(0,8)}`,l=F(a,["summary"])??void 0,m=Gt(a.steps),d=Gt(a.verification),g=Gt(a.files),S=[];c&&S.push(`## Task
${c}`),l&&S.push(`## Summary
${l}`),m.length>0&&S.push(`## Procedure
${m.map((y,k)=>`${k+1}. ${y}`).join(`
`)}`),d.length>0&&S.push(`## Verification
${d.map(y=>`- ${y}`).join(`
`)}`),g.length>0&&S.push(`## Relevant Files
${g.map(y=>`- \`${y}\``).join(`
`)}`);let h=S.join(`

`).slice(0,Ut);if(h.length<20)continue;n.push({sourceKey:`skill:${u}`,sourceType:"skill",title:p,summary:l,content:h,tags:["toolnet","auto","skill","sop"]})}catch{r+=1}return{candidates:n,failed:r}}function Ht(e){let t=new Date().toISOString();return{schema:Cr,version:1,projectId:e,entries:[],createdAt:t,updatedAt:t}}async function Oa(e,t){let n=await e.getText(xr);if(!n)return Ht(t);try{let r=JSON.parse(n);return r.schema!==Cr||r.version!==1||r.projectId!==t||!Array.isArray(r.entries)?Ht(t):r}catch{return Ht(t)}}async function Ma(e,t){await e.put(xr,JSON.stringify(t,null,2),"application/json")}function Ta(e){return`toolnet-auto-${Ce(e).slice(0,12)}`}function Ra(e){let t=ee(e.title).slice(0,72),n=Ce(e.sourceKey).slice(0,10);return ee(`auto-${e.sourceType}-${t}-${n}`)}function Na(e){return[`> Auto-generated by ToolNet Knowledge Automation from ${e.sourceType==="skill"?"reusable Skill Memory":e.sourceType==="scene"?"semantic memory scene":"durable memory"}.`,"",e.content].join(`
`).slice(0,Ut)}function _a(e){return Ce({sourceType:e.sourceType,title:e.title,summary:e.summary,content:e.content,tags:e.tags})}function $a(e,t){return e.tags.includes(t)}async function Ir(e){let t=Aa(e.hierarchy),n=Pa(e.project.rootPath),r=new Map;for(let d of[...t,...n.candidates])r.set(d.sourceKey,d);let s=[...r.values()].sort((d,g)=>d.sourceKey.localeCompare(g.sourceKey)),o={schema:"toolnet.wiki-automation-result.v1",scanned:t.length+n.candidates.length,eligible:s.length,created:0,updated:0,unchanged:0,skipped:0,failed:n.failed,reviewPending:0,autoApproved:0,reviewApproved:0,pages:[]},i=new Qe(new Ze(e.storage,e.project));await i.initialize();let a=new tt(new et(e.storage,e.project));await a.initialize();let u=await Oa(e.storage,e.project.id),c=await i.listPages(),p=new Map(c.map(d=>[d.slug,d])),l=new Map(u.entries.map(d=>[d.sourceKey,d]));for(let d of s)try{let g=Ta(d.sourceKey),S=_a(d),h=l.get(d.sourceKey),y=h?.slug??Ra(d),k=p.get(y);if(k&&!$a(k,g)){o.skipped+=1;continue}let I=je([...d.tags,g]),M=Na(d),O=await a.gate({sourceKey:d.sourceKey,sourceType:d.sourceType,slug:y,marker:g,digest:S,title:d.title,...d.summary?{summary:d.summary}:{},content:M,tags:I},[...p.values()]);if(!O.allowed){O.mode==="pending-review"?o.reviewPending+=1:o.skipped+=1;continue}O.mode==="auto-approved"?o.autoApproved+=1:O.mode==="review-approved"&&(o.reviewApproved+=1),k?h?.digest!==S?(k=await i.updatePage(y,{title:d.title,summary:d.summary??"",content:M,tags:I}),p.set(k.slug,k),o.updated+=1,o.pages.push({sourceKey:d.sourceKey,sourceType:d.sourceType,slug:k.slug,action:"updated"})):(o.unchanged+=1,o.pages.push({sourceKey:d.sourceKey,sourceType:d.sourceType,slug:y,action:"unchanged"})):(k=await i.createPage({slug:y,title:d.title,summary:d.summary,content:M,tags:I}),p.set(k.slug,k),o.created+=1,o.pages.push({sourceKey:d.sourceKey,sourceType:d.sourceType,slug:k.slug,action:"created"}));let T=new Date().toISOString(),C={sourceKey:d.sourceKey,sourceType:d.sourceType,slug:y,digest:S,marker:g,updatedAt:T},w=u.entries.findIndex(D=>D.sourceKey===d.sourceKey);w>=0?u.entries[w]=C:u.entries.push(C),l.set(d.sourceKey,C),await a.markApplied(d.sourceKey,S)}catch(g){if(g instanceof A&&g.statusCode===409){o.skipped+=1;continue}o.failed+=1}let m=new Date().toISOString();return u.updatedAt=m,u.lastRunAt=m,u.entries.sort((d,g)=>d.sourceKey.localeCompare(g.sourceKey)),await Ma(e.storage,u),o}import{createHash as Fa}from"node:crypto";import{chmodSync as Er,existsSync as Ka,mkdirSync as La,readFileSync as bm,readdirSync as xm,renameSync as Wa,statSync as Cm,writeFileSync as Da}from"node:fs";import{join as Pr}from"node:path";var za="toolnet.skill-memory.v1",Ar=5,qa=16,Ba=24,Ja=32;function Va(e){return Fa("sha256").update(e).digest("hex")}function Ae(e,t=Number.MAX_SAFE_INTEGER){let n=new Set,r=[];for(let s of e){let o=s.replace(/\s+/gu," ").trim();if(!o)continue;let i=o.normalize("NFKC").toLowerCase();if(!n.has(i)&&(n.add(i),r.push(o),r.length>=t))break}return r}function Yt(e,t=360){let n=e.replace(/\s+/gu," ").trim();return n.length<=t?n:n.slice(0,Math.max(0,t-1)).trimEnd()+"\u2026"}function Ga(e){return e.replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/giu,"Bearer [REDACTED]").replace(/\bsk-[A-Za-z0-9_-]{8,}\b/gu,"[REDACTED]").replace(/\b(api[_-]?key|token|password|passwd|secret)\b(\s*[:=]\s*)(["']?)[^\s"'`]+/giu,"$1$2[REDACTED]")}function q(e,t=360){return e&&Yt(Ga(e),t)||void 0}function Ee(e,t){for(let n of t){let r=e[n];if(typeof r=="string"&&r.trim())return r}}function Or(e,t){for(let n of t){let r=e[n];if(typeof r=="number"&&Number.isFinite(r))return r;if(typeof r=="string"&&r.trim()&&Number.isFinite(Number(r)))return Number(r)}}function Mr(e,t){for(let n of t){let r=e[n];if(typeof r=="boolean")return r;if(typeof r=="string"){let s=r.trim().toLowerCase();if(["true","yes","pass","passed","success","succeeded","ok"].includes(s))return!0;if(["false","no","fail","failed","error"].includes(s))return!1}}}function Tr(e){let t=e.data??{};if(Mr(t,["passed","pass","success","succeeded","ok"])===!1)return!0;let r=Or(t,["exitCode","exit_code","code","statusCode"]);if(r!==void 0&&r!==0)return!0;let s=Ee(t,["status","result","outcome"]);return!!(s&&/\b(fail(?:ed)?|error|broken|cancelled)\b/iu.test(s))}function Ie(e){let t=e.data??{};if(Tr(e))return!1;if(Mr(t,["passed","pass","success","succeeded","ok"])===!0||Or(t,["exitCode","exit_code","code","statusCode"])===0)return!0;let s=Ee(t,["status","result","outcome"]);return s&&/\b(pass(?:ed)?|success(?:ful)?|succeeded|ok|green|complete(?:d)?)\b/iu.test(s)?!0:e.type==="commit"||e.type==="deploy"}function Rr(e){let t=e.data??{},n=Ee(t,["path","file","filePath","filename","target"]);if(n)return q(n,260);let r=e.provenance?.files;return q(r?.[0],260)}function Xt(e){return q(Ee(e.data??{},["command","cmd","script"]),420)}function oe(e){return q(Ee(e.data??{},["name","test","suite","title","message","text","result","status"]),300)}function Ha(e){let t=[];for(let n of[...e].sort((r,s)=>r.sequence-s.sequence))if(Ie(n)){if(n.type==="test"){let r=oe(n)??Xt(n)??"Tests passed";t.push(`Test passed: ${r}`);continue}if(n.type==="commit"){let r=oe(n);t.push(r?`Commit: ${r}`:"Commit completed");continue}if(n.type==="deploy"){let r=oe(n);t.push(r?`Deploy: ${r}`:"Deployment completed")}}return Ae(t,10)}function Ua(e,t){let n=[];for(let r of[...e].sort((s,o)=>s.sequence-o.sequence))switch(r.type){case"file_write":case"file_edit":{let s=Rr(r);s&&n.push(`Update ${s}`);break}case"command":{if(Tr(r))break;let s=Xt(r);s&&n.push(`Run: ${s}`);break}case"test":{if(!Ie(r))break;let s=oe(r)??Xt(r)??"project tests";n.push(`Verify: ${s}`);break}case"commit":{if(!Ie(r))break;let s=oe(r);n.push(s?`Commit: ${s}`:"Commit verified changes");break}case"deploy":{if(!Ie(r))break;let s=oe(r);n.push(s?`Deploy: ${s}`:"Deploy verified build");break}default:break}if(n.length===0)for(let r of t.files.slice(0,8)){let s=q(r,260);s&&n.push(`Update ${s}`)}return Ae(n,qa)}function Ya(e,t){let n=[...t.files];for(let r of e){let s=Rr(r);s&&n.push(s);for(let o of r.provenance?.files??[]){let i=q(o,260);i&&n.push(i)}}return Ae(n,Ba)}function Xa(e){return Ae(e.filter(t=>["file_write","file_edit","command","test","commit","deploy"].includes(t.type)).map(t=>t.id),Ja)}function Qa(e){return e.map(n=>n.timestamp).filter(Boolean).sort().at(-1)??new Date(0).toISOString()}function Nr(e,t,n){if(t.length===0)return[];let r=Ha(t),s=Ae(n.completed.map(g=>q(g,280)??""),Ar);if(!(s.length>0||t.some(g=>["test","commit","deploy"].includes(g.type)&&Ie(g))))return[];let i=q(n.task,280)??q(n.nextActions[0],280),a=s.length>0?s:i?[i]:[];if(a.length===0)return[];let u=Ua(t,n);if(u.length===0)return[];let c=Ya(t,n),p=Xa(t),l=Math.min(...t.map(g=>g.sequence)),m=Math.max(...t.map(g=>g.sequence)),d=Qa(t);return a.slice(0,Ar).map(g=>{let S=[`Reusable procedure learned from successful task: ${g}.`,c.length>0?`Files: ${c.slice(0,6).join(", ")}.`:"",r.length>0?`Verification: ${r.slice(0,4).join("; ")}.`:""].filter(Boolean),h=JSON.stringify({projectId:e.projectId,task:g,steps:u,verification:r,files:c}),y=Va(h);return{schema:za,version:1,id:`skill-${y.slice(0,24)}`,fingerprint:y,projectId:e.projectId,title:Yt(`SOP: ${g}`,180),task:g,summary:Yt(S.join(" "),900),steps:u,verification:r,files:c,source:{agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,firstSequence:l,lastSequence:m,eventIds:p},createdAt:d}})}function Za(e){return Pr(e.rootPath,".toolnet","memory","skills")}function ec(e){let t=Za(e);return La(t,{recursive:!0,mode:448}),Er(t,448),t}function _r(e,t){if(t.length===0)return{written:0,deduped:0,files:[]};let n=ec(e),r=0,s=0,o=[];for(let i of t){if(i.projectId!==e.id)throw new Error(`Skill project mismatch: ${i.projectId} != ${e.id}`);let a=Pr(n,`${i.id}.json`);if(o.push(a),Ka(a)){s+=1;continue}let u=`${a}.${process.pid}.${Date.now()}.tmp`;Da(u,JSON.stringify(i,null,2)+`
`,{encoding:"utf8",mode:384}),Wa(u,a),Er(a,384),r+=1}return{written:r,deduped:s,files:o}}function $r(e){return String(e).padStart(12,"0")}function tc(e){return`projects/${e.projectId}/memory/learned`}var rt=class{constructor(t){this.storage=t}storage;async write(t,n,r){if(r.length===0||n.length===0)return null;let s=Math.min(...n.map(l=>l.sequence)),o=Math.max(...n.map(l=>l.sequence)),i={version:1,projectId:t.projectId,agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,createdAt:new Date().toISOString(),firstSequence:s,lastSequence:o,candidateCount:r.length,candidates:r},a=JSON.stringify(i,null,2)+`
`,u=v(r.map(l=>l.fingerprint).sort().join("|")).slice(0,16),c=v(t.sessionKey).slice(0,12),p=[tc(t),"batches",`${$r(s)}-${$r(o)}-${c}-${u}.json`].join("/");return await this.storage.exists(p)||await this.storage.put(p,a,"application/json"),p}};import{createHash as nc}from"node:crypto";function Fr(e){return String(e).padStart(12,"0")}function Kr(e){return nc("sha256").update(e).digest("hex")}function rc(e){return`projects/${e.projectId}/memory/hierarchy`}var st=class{constructor(t){this.storage=t}storage;async write(t,n,r){if(n.length===0||r.facts.length===0)return null;let s=Math.min(...n.map(p=>p.sequence)),o=Math.max(...n.map(p=>p.sequence)),i={schema:"toolnet.memory-hierarchy-batch.v1",version:1,projectId:t.projectId,agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,createdAt:new Date().toISOString(),firstSequence:s,lastSequence:o,hierarchy:r},a=Kr([...r.facts.map(p=>p.id),...r.knowledge.map(p=>p.id)].sort().join("|")).slice(0,16),u=Kr(t.sessionKey).slice(0,12),c=[rc(t),"batches",`${Fr(s)}-${Fr(o)}-${u}-${a}.json`].join("/");return await this.storage.exists(c)||await this.storage.put(c,`${JSON.stringify(i,null,2)}
`,"application/json"),c}};function uc(e,t){if(!oc(e))return{events:[],nextOffset:t};let n=cc(e).size,r=Number.isFinite(t)?Math.max(0,t):0;if(r>n&&(r=0),r===n)return{events:[],nextOffset:n};let s=n-r,o=Buffer.alloc(s),i=ic(e,"r");try{ac(i,o,0,s,r)}finally{sc(i)}let a=o.toString("utf8"),u=a.lastIndexOf(`
`);if(u<0)return{events:[],nextOffset:r};let c=a.slice(0,u+1);return{events:c.split(`
`).filter(Boolean).flatMap(l=>{try{return[JSON.parse(l)]}catch{return[]}}),nextOffset:r+Buffer.byteLength(c,"utf8")}}var ot=class{constructor(t){this.options=t;this.journal=new rt(t.storage),this.hierarchyJournal=new st(t.storage)}options;journal;hierarchyJournal;async learnNew(){let t=this.options.wal.loadState(),n=Number(t.sourceCursors["memory.learner.offset"]??0),r=Number.isFinite(n)?n:0,s=uc(this.options.wal.eventsFile,r);if(s.events.length===0)return{scannedEvents:0,candidates:0,journalWritten:!1,nextOffset:s.nextOffset};let o=Ye(this.options.identity,s.events),i=o.candidates,a=!1;i.length>0&&(a=!!await this.journal.write(this.options.identity,s.events,i));let u=!1;o.hierarchy.facts.length>0&&(u=!!await this.hierarchyJournal.write(this.options.identity,s.events,o.hierarchy));let c=Nr(this.options.identity,s.events,o.state),p=_r(this.options.project,c);this.options.wal.setSourceCursor("memory.pipeline.version",2),this.options.wal.setSourceCursor("memory.pipeline.normalized_events",o.stats.normalizedEvents),this.options.wal.setSourceCursor("memory.pipeline.persisted",o.stats.persistedCandidates),this.options.wal.setSourceCursor("memory.pipeline.permanent",o.stats.permanent),this.options.wal.setSourceCursor("memory.pipeline.task",o.stats.task),this.options.wal.setSourceCursor("memory.pipeline.session",o.stats.session),this.options.wal.setSourceCursor("memory.pipeline.transient",o.stats.transient),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.version",o.hierarchy.version),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.raw",o.hierarchy.stats.raw),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.facts",o.hierarchy.stats.facts),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.scenes",o.hierarchy.stats.scenes),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.knowledge",o.hierarchy.stats.knowledge),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.journal_written",u?1:0),this.options.wal.setSourceCursor("memory.skill.assets",c.length),this.options.wal.setSourceCursor("memory.skill.written",p.written),this.options.wal.setSourceCursor("memory.skill.deduped",p.deduped);try{let l=or(this.options.project.rootPath,s.events);this.options.wal.setSourceCursor("memory.context_offload.eligible",l.eligible),this.options.wal.setSourceCursor("memory.context_offload.written",l.written),this.options.wal.setSourceCursor("memory.context_offload.deduped",l.deduped),this.options.wal.setSourceCursor("memory.context_offload.graph_nodes",l.graphNodes),this.options.wal.setSourceCursor("memory.context_offload.failed",0)}catch{this.options.wal.setSourceCursor("memory.context_offload.failed",1)}try{let l=await Ir({project:this.options.project,storage:this.options.storage,hierarchy:o.hierarchy});this.options.wal.setSourceCursor("memory.wiki_automation.scanned",l.scanned),this.options.wal.setSourceCursor("memory.wiki_automation.eligible",l.eligible),this.options.wal.setSourceCursor("memory.wiki_automation.created",l.created),this.options.wal.setSourceCursor("memory.wiki_automation.updated",l.updated),this.options.wal.setSourceCursor("memory.wiki_automation.unchanged",l.unchanged),this.options.wal.setSourceCursor("memory.wiki_automation.skipped",l.skipped),this.options.wal.setSourceCursor("memory.wiki_automation.failed",l.failed),this.options.wal.setSourceCursor("memory.wiki_automation.review_pending",l.reviewPending),this.options.wal.setSourceCursor("memory.wiki_automation.auto_approved",l.autoApproved),this.options.wal.setSourceCursor("memory.wiki_automation.review_approved",l.reviewApproved)}catch{this.options.wal.setSourceCursor("memory.wiki_automation.failed",1)}return this.options.wal.setSourceCursor("memory.learner.offset",s.nextOffset),{scannedEvents:s.events.length,candidates:i.length,journalWritten:a,nextOffset:s.nextOffset}}};import{closeSync as Ac,existsSync as Ec,openSync as Pc,readSync as Oc,statSync as Mc}from"node:fs";function Lr(e){return e&&typeof e=="object"&&!Array.isArray(e)?e:null}function Oe(e){return e.toLowerCase().replace(/[^a-z0-9]/gu,"")}function Pe(e,t,n=0){if(n>8)return;if(Array.isArray(e)){for(let s of e.slice(0,50))Pe(s,t,n+1);return}let r=Lr(e);if(r)for(let[s,o]of Object.entries(r))t(s,o,r),Pe(o,t,n+1)}function ie(e,t){let n=[];return Pe(e,(r,s)=>{t.has(Oe(r))&&typeof s=="string"&&s.trim()&&n.push(s.trim())}),n}function lc(e){let t=e.trim();if(!t.startsWith("{"))return null;try{return Lr(JSON.parse(t))}catch{return null}}function dc(e){let t=e.data;for(let r of["tool","toolName","tool_name"]){let s=t[r];if(typeof s=="string"&&s.trim())return s.trim().toLowerCase()}let n="";return Pe(t,(r,s,o)=>{if(n)return;let i=Oe(r);if(["tool","toolname"].includes(i)&&typeof s=="string"){n=s.trim().toLowerCase();return}if(i!=="name"||typeof s!="string")return;let a=typeof o.type=="string"?o.type.toLowerCase():"";(a.includes("tool")||a.includes("function")||a.includes("command"))&&(n=s.trim().toLowerCase())}),n}function pc(e){let t=ie(e.data,new Set(["command","cmd","script"])),n=ie(e.data,new Set(["arguments","args"]));for(let r of n){let s=lc(r);if(s)for(let o of ie(s,new Set(["command","cmd","script"])))t.push(o)}return Array.from(new Set(t.map(r=>r.trim()).filter(Boolean)))}function mc(e){let t=ie(e.data,new Set(["filepath","file_path","filename","file","path","target"].map(Oe)));return Array.from(new Set(t.map(n=>n.trim()).filter(n=>n.length>0&&n.length<1e3&&!n.includes(`
`))))}function fc(e,t){return e.type==="file_edit"||e.type==="file_write"?"modified":/\b(delete|remove|unlink)\b/iu.test(t)?"deleted":/\b(create|add[_-]?file|new[_-]?file)\b/iu.test(t)?"created":/\b(edit|write|patch|apply[_-]?patch|replace|update[_-]?file)\b/iu.test(t)?"modified":null}function gc(e){let t=ie(e.data,new Set(["patch","diff","arguments","input"].map(Oe))),n=[];for(let r of t){let s=[{regex:/^\*\*\* Update File:\s*(.+)$/gimu,action:"modified"},{regex:/^\*\*\* Add File:\s*(.+)$/gimu,action:"created"},{regex:/^\*\*\* Delete File:\s*(.+)$/gimu,action:"deleted"}];for(let o of s)for(let i of r.matchAll(o.regex)){let a=i[1]?.trim();a&&n.push({kind:"file",text:a,fileAction:o.action,confidence:.99})}}return n}function yc(e){let t=e.toLowerCase();return/\b(typecheck|type-check)\b/u.test(t)||/\btsc\b[\s\S]*--noemit\b/u.test(t)?"typecheck":/\b(eslint|lint)\b/u.test(t)?"lint":/\b(vitest|jest|pytest)\b/u.test(t)||/\bgo\s+test\b/u.test(t)||/\bcargo\s+test\b/u.test(t)||/\b(npm|pnpm|yarn)\s+(run\s+)?test\b/u.test(t)?"test":/\b(npm|pnpm|yarn)\s+(run\s+)?build\b/u.test(t)||/\bcargo\s+build\b/u.test(t)||/\bgo\s+build\b/u.test(t)||/\btsc\b/u.test(t)?"build":null}function hc(e){let t=null;return Pe(e,(n,r)=>{if(t===null&&["exitcode","code"].includes(Oe(n))){if(typeof r=="number"&&Number.isFinite(r)){t=r;return}if(typeof r=="string"){let s=Number(r);Number.isFinite(s)&&(t=s)}}}),t}function Sc(e){return ie(e,new Set(["status","state","result","output","outputsummary","message","text"]))}function kc(e){let t=hc(e.data);if(t!==null)return t===0?"passed":"failed";let n=Sc(e.data).join(`
`).toLowerCase();return/\b(error|failed|failure|failing)\b/u.test(n)&&!/\b0\s+failed\b/u.test(n)?"failed":/\b(success|successful|completed|passed|green)\b/u.test(n)||/\b\d+\s+passed\b/u.test(n)?"passed":/\b(running|started|in[_ -]?progress)\b/u.test(n)?"running":"unknown"}function vc(e){let t=[],n=new Set;for(let r of e){let s=[r.kind,r.fileAction??"",r.checkKind??"",r.checkStatus??"",r.text].join("|");n.has(s)||(n.add(s),t.push(r))}return t}function Wr(e){let t=[],n=dc(e),r=fc(e,n);if(r)for(let s of mc(e))t.push({kind:"file",text:s,fileAction:r,confidence:e.type==="file_edit"||e.type==="file_write"?1:.96});t.push(...gc(e));for(let s of pc(e)){t.push({kind:"command",text:s,confidence:.98});let o=yc(s);o&&t.push({kind:"test",text:s,checkKind:o,checkStatus:kc(e),confidence:.98})}return vc(t)}var wc=new Set(["content","text","message","prompt","summary","description","title","reason","last_assistant_message","lastAssistantMessage"]);function ne(e){return e.normalize("NFKC").replace(/\s+/g," ").replace(/^[\s>*#•-]+/u,"").trim()}function zr(e){return ne(e).toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim()}function te(e,t,n=0){if(!(n>6)){if(typeof e=="string"){t.push(e);return}if(Array.isArray(e)){for(let r of e.slice(0,50))te(r,t,n+1);return}if(!(!e||typeof e!="object"))for(let[r,s]of Object.entries(e))(wc.has(r)||["data","payload","parts","messages"].includes(r))&&te(s,t,n+1)}}function it(e){return/\b(cancelled|canceled)\b|đã hủy|bỏ qua/iu.test(e)?"cancelled":/\b(blocked|blocker)\b|đang vướng|bị vướng|đang kẹt|chưa thể/iu.test(e)?"blocked":/\b(completed|complete|done|finished|passed)\b|hoàn thành|hoàn tất|đã xong|đã làm xong|\bxong\b/iu.test(e)?"completed":/\bin[\s_-]*progress\b|working on|đang làm|đang thực hiện|đang xử lý|đang triển khai/iu.test(e)?"in_progress":"pending"}function Dr(e){let t=ne(e);return/^(?:đang\s+làm|đang\s+thực\s+hiện|đang\s+xử\s+lý|đang\s+triển\s+khai|hoàn\s+thành|hoàn\s+tất|đã\s+xong|đã\s+làm\s+xong|xong|pending|in[\s_-]*progress|completed|complete|done|finished|blocked|cancelled|canceled)[.!]*$/iu.test(t)}function E(e,t,n,r,s={}){let o=ne(r),i=s.key??zr(o);return{version:1,id:v([e.projectId,n,i,t.id,o,s.status??"",s.fileAction??"",s.checkKind??"",s.checkStatus??"",s.order??""].join("|")).slice(0,32),projectId:e.projectId,kind:n,key:i,text:o,status:s.status,fileAction:s.fileAction,checkKind:s.checkKind,checkStatus:s.checkStatus,order:s.order,confidence:s.confidence??.85,occurredAt:t.timestamp,sequence:t.sequence,agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,eventId:t.id,sourceEventId:t.sourceEventId}}function bc(e,t,n){let r=ne(n);if(r.length<5||r.length>1200)return[];let s=[],o=/^(?:next|next action|next step|tiếp theo|bước tiếp theo|cần làm tiếp)\b/iu.test(r),i=r.match(/^(?:mục tiêu|goal|objective)\s*(?::|-)\s*(.+)$/iu);i?.[1]&&s.push(E(e,t,"goal",i[1],{confidence:.97}));let a=r.match(/^(?:kế hoạch|plan)\s*(?::|-)\s*(.+)$/iu);a?.[1]&&s.push(E(e,t,"plan",a[1],{confidence:.95}));let u=/\b(?:phase|giai đoạn|giai doan|stage)\s*(\d+)\s*(?:[:\-–—]\s*)?([^.;\n]{0,220})/giu,c;for(;!o&&(c=u.exec(r));){let m=Number(c[1]),d=ne(c[2]??""),g=d&&!Dr(d)?`Phase ${m} - ${d}`:`Phase ${m}`;s.push(E(e,t,"phase",g,{key:`phase:${m}`,order:m,status:it(r),confidence:.93}))}let p=n.match(/^\s*[-*]\s*\[([ xX])\]\s*(.+)$/u);p?.[2]&&s.push(E(e,t,"task",p[2],{status:p[1].trim()?"completed":it(p[2]),confidence:.96}));let l=r.match(/^(?:todo|task|việc)\s*(\d+)?(?:\s*[:.\-–—]\s*|\s+)(.+)$/iu);if(l?.[2]){let m=l[1]?Number(l[1]):void 0,d=ne(l[2]),g=Dr(d);s.push(E(e,t,"task",g&&m!==void 0?`TODO ${m}`:d,{key:m!==void 0?`task:${m}`:zr(d),order:m,status:it(r),confidence:.93}))}if(/^(?:next|next action|next step|tiếp theo|bước tiếp theo|cần làm tiếp)\b/iu.test(r)){let m=r.replace(/^(?:next|next action|next step|tiếp theo|bước tiếp theo|cần làm tiếp)\s*(?::|-)?\s*/iu,"");m&&s.push(E(e,t,"next_action",m,{confidence:.9}))}return/\b(blocker|blocked)\b|đang vướng|bị vướng|đang kẹt/iu.test(r)&&s.push(E(e,t,"blocker",r,{confidence:.9})),/\b(chú ý|lưu ý|warning|attention|cẩn thận)\b/iu.test(r)&&s.push(E(e,t,"warning",r,{confidence:.88})),/\b(chốt|quyết định|decided|decision)\b/iu.test(r)&&s.push(E(e,t,"decision",r,{confidence:.9})),r.length<=300&&/^(?:đang\s+(?:sửa|cập nhật|triển khai|xử lý|làm|refactor|fix)|(?:i(?:'m| am)\s+)?(?:working on|implementing|fixing|refactoring|updating|editing)\b)/iu.test(r)&&s.push(E(e,t,"activity",r,{confidence:.86})),s}function at(e,t){if(t.length===0)return[];let n=[],r=new Set;function s(i){r.has(i.id)||(r.add(i.id),n.push(i))}for(let i of t){if(i.type==="user_prompt"||i.role==="user"){let u=[];te(i.data,u);let c=u.map(p=>ne(p)).find(p=>p.length>=8&&p.length<=1200&&!/^\[?toolnet\b/iu.test(p));c&&s(E(e,i,"request",c,{confidence:.96}))}for(let u of Wr(i))s(E(e,i,u.kind,u.text,{fileAction:u.fileAction,checkKind:u.checkKind,checkStatus:u.checkStatus,status:u.kind==="test"?u.checkStatus==="passed"?"completed":u.checkStatus==="failed"?"blocked":u.checkStatus==="running"?"in_progress":"pending":void 0,confidence:u.confidence}));if(i.type==="decision"){let u=[];te(i.data,u);for(let c of u)s(E(e,i,"decision",c,{confidence:1}))}if(i.type==="todo"){let u=[];te(i.data,u);for(let c of u)s(E(e,i,"task",c,{status:it(c),confidence:1}))}if(["file_write","file_edit"].includes(i.type))for(let u of["filePath","path","file"]){let c=i.data[u];typeof c=="string"&&c&&s(E(e,i,"file",c,{fileAction:"modified",confidence:1}))}if(i.type==="test"){let u=[];te(i.data,u);for(let c of u)s(E(e,i,"test",c,{confidence:1}))}let a=[];te(i.data,a);for(let u of a)for(let c of u.split(/\n+/u))for(let p of bc(e,i,c))s(p)}let o=t[t.length-1];return s(E(e,o,"session",`${e.agent}:${e.nativeSessionId}`,{key:e.sessionKey,confidence:1})),n}function qr(e){return String(e).padStart(12,"0")}var ct=class{constructor(t){this.storage=t}storage;async write(t,n){if(n.length===0)return null;let r=Math.min(...n.map(p=>p.sequence)),s=Math.max(...n.map(p=>p.sequence)),o={version:1,projectId:t.projectId,agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,createdAt:new Date().toISOString(),firstSequence:r,lastSequence:s,observations:n},i=JSON.stringify(o,null,2)+`
`,a=v(n.map(p=>p.id).sort().join("|")).slice(0,16),u=v(t.sessionKey).slice(0,12),c=[`projects/${t.projectId}`,"work","observations",`${qr(r)}-${qr(s)}-${u}-${a}.json`].join("/");return await this.storage.exists(c)||await this.storage.put(c,i,"application/json"),c}};import{join as Br}from"node:path";import{mkdirSync as xc}from"node:fs";function Vr(e){return e.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim()}function K(e,t=20){let n=[],r=new Set;for(let s of e.slice().reverse()){let o=Vr(s);if(!(!o||r.has(o))&&(r.add(o),n.push(s),n.length>=t))break}return n.reverse()}function Cc(e,t=20){let n=new Map;for(let r of e){let s=`${r.kind}|${Vr(r.command)}`;n.delete(s),n.set(s,r)}return Array.from(n.values()).slice(-t)}function jc(e){return e.kind==="phase"?/^Phase\s+\d+$/iu.test(e.text):e.kind==="task"?/^(?:TODO|Task|Việc)\s+\d+$/iu.test(e.text):!1}function Jr(e,t){let n=t.status??e?.status??"pending",r=n;e&&(e.status==="completed"&&n!=="completed"?r="completed":n==="pending"&&(e.status==="in_progress"||e.status==="blocked")&&(r=e.status));let s=e&&jc(t)?e.title:t.text;return{id:e?.id??v(t.key).slice(0,24),title:s,status:r,order:t.order??e?.order,confidence:Math.max(t.confidence,e?.confidence??0),updatedAt:t.occurredAt,updatedBy:{agent:t.agent,nativeSessionId:t.nativeSessionId,eventId:t.eventId}}}async function Ic(e,t){let n=`projects/${e.id}/work/observations/`,r=await t.list(n),s=[];for(let o of r.filter(i=>i.key.endsWith(".json")).sort((i,a)=>i.key.localeCompare(a.key))){let i=await t.getText(o.key);if(i)try{let a=JSON.parse(i);a.version===1&&Array.isArray(a.observations)&&s.push(a)}catch{}}return s}async function ut(e,t){let r=(await Ic(e,t)).flatMap(f=>f.observations).sort((f,b)=>{let B=f.occurredAt.localeCompare(b.occurredAt);if(B!==0)return B;let ln=f.sequence-b.sequence;return ln!==0?ln:f.id.localeCompare(b.id)}),s=new Map,o=new Map,i,a,u,c,p,l=[],m=[],d=[],g=[],S=[],h=new Map,y=[],k=[],I=[],M=[],O=[],T=[];for(let f of r)switch(f.kind){case"request":i=f.text;break;case"activity":a=f.text;break;case"goal":u=f.text;break;case"plan":c=f.text;break;case"phase":s.set(f.key,Jr(s.get(f.key),f));break;case"task":o.set(f.key,Jr(o.get(f.key),f));break;case"decision":l.push(f.text);break;case"blocker":m.push(f.text);break;case"warning":d.push(f.text);break;case"next_action":g.push(f.text);break;case"file":{S.push(f.text);let b=f.fileAction??"active";h.delete(f.text),h.set(f.text,b),b==="modified"?y.push(f.text):b==="created"?k.push(f.text):b==="deleted"&&I.push(f.text);break}case"command":M.push(f.text);break;case"test":O.push(f.text),f.checkKind&&T.push({kind:f.checkKind,command:f.text,status:f.checkStatus??"unknown",updatedAt:f.occurredAt,agent:f.agent,nativeSessionId:f.nativeSessionId});break;case"session":p={agent:f.agent,nativeSessionId:f.nativeSessionId,sessionKey:f.sessionKey,updatedAt:f.occurredAt};break}let C=Array.from(s.values()).sort((f,b)=>(f.order??Number.MAX_SAFE_INTEGER)-(b.order??Number.MAX_SAFE_INTEGER)),w=Array.from(o.values()).sort((f,b)=>(f.order??Number.MAX_SAFE_INTEGER)-(b.order??Number.MAX_SAFE_INTEGER)),D=C.find(f=>f.status==="in_progress")??C.find(f=>f.status==="blocked")??C.find(f=>f.status==="pending"),z=w.find(f=>f.status==="in_progress")??w.find(f=>f.status==="blocked")??w.find(f=>f.status==="pending"),It=K([...g,...z?[z.title]:[],...!z&&D?[D.title]:[],...w.filter(f=>f.status==="pending").slice(0,5).map(f=>f.title)],8),At=K([...m,...C.filter(f=>f.status==="blocked").map(f=>f.title),...w.filter(f=>f.status==="blocked").map(f=>f.title)],20),pe={version:1,projectId:e.id,projectName:e.name,currentRequest:i,currentActivity:a,goal:u,plan:c,phases:C,tasks:w,decisions:K(l,20),blockers:At,warnings:K(d,20),nextActions:It,filesTouched:K(S,30),activeFiles:Array.from(h.entries()).filter(([,f])=>f!=="deleted").map(([f])=>f).slice(-5),modifiedFiles:K(y,30),createdFiles:K(k,30),deletedFiles:K(I,30),commands:K(M,20),tests:K(O,20),checks:Cc(T,20),currentPhase:D,currentTask:z,progress:{phasesTotal:C.length,phasesCompleted:C.filter(f=>f.status==="completed").length,tasksTotal:w.length,tasksCompleted:w.filter(f=>f.status==="completed").length,blocked:C.filter(f=>f.status==="blocked").length+w.filter(f=>f.status==="blocked").length},lastSession:p,updatedAt:r.length?r[r.length-1].occurredAt:new Date().toISOString()},me=Br(e.rootPath,".toolnet","work");return xc(me,{recursive:!0}),R(Br(me,"current.json"),pe),await t.put(`projects/${e.id}/work/current.json`,JSON.stringify(pe,null,2)+`
`,"application/json"),pe}async function lt(e,t){let n=await t.getText(`projects/${e.id}/work/current.json`);if(!n)return null;try{return JSON.parse(n)}catch{return null}}function Tc(e,t){if(!Ec(e))return{events:[],nextOffset:t};let n=Mc(e).size,r=Number.isFinite(t)?Math.max(0,t):0;if(r>n&&(r=0),r===n)return{events:[],nextOffset:n};let s=n-r,o=Buffer.alloc(s),i=Pc(e,"r");try{Oc(i,o,0,s,r)}finally{Ac(i)}let a=o.toString("utf8"),u=a.lastIndexOf(`
`);if(u<0)return{events:[],nextOffset:r};let c=a.slice(0,u+1);return{events:c.split(`
`).filter(Boolean).flatMap(l=>{try{return[JSON.parse(l)]}catch{return[]}}),nextOffset:r+Buffer.byteLength(c,"utf8")}}var dt=class{constructor(t){this.options=t;this.journal=new ct(t.storage)}options;journal;async learnNew(){let t=this.options.wal.loadState(),n=Number(t.sourceCursors["work.continuity.offset"]??0),r=Tc(this.options.wal.eventsFile,Number.isFinite(n)?n:0);if(r.events.length===0)return{scannedEvents:0,observations:0,journalWritten:!1,reconciled:!1,nextOffset:r.nextOffset};let s=at(this.options.identity,r.events),o=!1,i=!1;return s.length>0&&(o=!!await this.journal.write(this.options.identity,s),o&&(await ut(this.options.project,this.options.storage),i=!0)),this.options.wal.setSourceCursor("work.continuity.offset",r.nextOffset),{scannedEvents:r.events.length,observations:s.length,journalWritten:o,reconciled:i,nextOffset:r.nextOffset}}};import{closeSync as Dc,existsSync as zc,openSync as qc,readSync as Bc,statSync as Jc}from"node:fs";var Rc=new Set(["content","text","message","prompt","summary","description","title","reason","last_assistant_message","lastAssistantMessage"]);function ae(e){return e.normalize("NFKC").replace(/\s+/g," ").replace(/^[\s>*#•-]+/u,"").trim()}function Qt(e,t,n=0){if(!(n>6)){if(typeof e=="string"){t.push(e);return}if(Array.isArray(e)){for(let r of e.slice(0,50))Qt(r,t,n+1);return}if(!(!e||typeof e!="object"))for(let[r,s]of Object.entries(e))(Rc.has(r)||["data","payload","parts","messages"].includes(r))&&Qt(s,t,n+1)}}function _(e,t,n,r,s,o=.95){let i=ae(r);return{version:1,id:v([e.projectId,n,s.type,s.key??"",i.toLowerCase(),t.id].join("|")).slice(0,32),projectId:e.projectId,kind:n,value:i,scope:s.type,scopeKey:s.key,scopeOrder:s.order,confidence:o,evidence:{agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,eventId:t.id,sourceEventId:t.sourceEventId,sequence:t.sequence,occurredAt:t.timestamp}}}function L(e,t){let n=e.toLowerCase();for(let r of t){let s=r.toLowerCase();if(n.startsWith(`${s}:`)||n.startsWith(`${s} -`)||n.startsWith(`${s} \u2014`))return ae(e.slice(r.length+1))}return null}function Nc(e){let t=e.trimStart();return t.startsWith("- ")||t.startsWith("* ")||/^\d+[.)]\s+/u.test(t)}function _c(e){return ae(e.trim().replace(/^[-*]\s+/u,"").replace(/^\d+[.)]\s+/u,""))}function Gr(e,t){let n=[],r=new Set;function s(o){!o.value||o.value.length<3||r.has(o.id)||(r.add(o.id),n.push(o))}for(let o of t){let i=[];Qt(o.data,i);for(let a of i){let u={type:"project"},c=null;for(let p of a.split(/\r?\n/u)){let l=ae(p);if(!l){c=null;continue}let m=l.match(/^(?:phase|giai đoạn|giai doan|stage)\s*(\d+)\s*(?:[:\-–—]\s*)?(.*)$/iu);if(m){let w=Number(m[1]);u={type:"phase",key:`phase:${w}`,order:w,title:ae(m[2]??"")},c=null;continue}let d=l.match(/^(?:todo|task|việc)\s*(\d+)\s*(?:[:\-–—]\s*)?(.*)$/iu);if(d){let w=Number(d[1]);u={type:"task",key:`task:${w}`,order:w,title:ae(d[2]??"")},c=null;continue}let g=L(l,["mission","s\u1EE9 m\u1EC7nh","m\u1EE5c ti\xEAu t\u1ED5ng th\u1EC3","m\u1EE5c ti\xEAu project","project goal"]);if(g){s(_(e,o,"mission",g,{type:"project"},.99)),c=null;continue}let S=L(l,["current objective","active objective","m\u1EE5c ti\xEAu hi\u1EC7n t\u1EA1i","objective","m\u1EE5c ti\xEAu","m\u1EE5c \u0111\xEDch"]);if(S){s(_(e,o,u.type==="phase"?"phase_objective":"objective",S,u,.98)),c=null;continue}let h=L(l,["why","why this","why this phase","reason","rationale","v\xEC sao","l\xFD do","t\u1EA1i sao","\xFD ngh\u0129a"]);if(h){s(_(e,o,u.type==="phase"?"phase_why":"why",h,u,.98)),c=null;continue}let y=L(l,["desired outcome","final outcome","k\u1EBFt qu\u1EA3 cu\u1ED1i","k\u1EBFt qu\u1EA3 mong mu\u1ED1n","m\u1EE5c ti\xEAu cu\u1ED1i"]);if(y){s(_(e,o,"desired_outcome",y,{type:"project"},.98)),c=null;continue}let k=L(l,["plan rationale","approach rationale","why this approach","t\u1EA1i sao ch\u1ECDn h\u01B0\u1EDBng n\xE0y","l\xFD do ch\u1ECDn h\u01B0\u1EDBng n\xE0y","l\xFD do ch\u1ECDn ki\u1EBFn tr\xFAc"]);if(k){s(_(e,o,"plan_rationale",k,{type:"project"},.98)),c=null;continue}let I=L(l,["deliverable","output","k\u1EBFt qu\u1EA3 c\u1EA7n \u0111\u1EA1t","ph\u1EA3i t\u1EA1o ra","\u0111\u1EA7u ra"]);if(I){s(_(e,o,"phase_deliverable",I,u,.97)),c=null;continue}let M=L(l,["acceptance criteria","definition of done","done khi","ho\xE0n th\xE0nh khi","ti\xEAu ch\xED ho\xE0n th\xE0nh"]);if(M){s(_(e,o,"acceptance_criterion",M,u,.98)),c="acceptance_criterion";continue}let O=L(l,["depends on","dependency","dependencies","ph\u1EE5 thu\u1ED9c","c\u1EA7n c\xF3 tr\u01B0\u1EDBc"]);if(O){s(_(e,o,"dependency",O,u,.97)),c="dependency";continue}let T=L(l,["open question","open questions","c\xE2u h\u1ECFi m\u1EDF","ch\u01B0a quy\u1EBFt \u0111\u1ECBnh","ch\u01B0a r\xF5"]);if(T){s(_(e,o,"open_question",T,u,.95)),c="open_question";continue}let C=L(l,["constraint","constraints","r\xE0ng bu\u1ED9c","gi\u1EDBi h\u1EA1n"]);if(C){s(_(e,o,"constraint",C,u,.97)),c="constraint";continue}if(/^(?:acceptance criteria|definition of done|done khi|tiêu chí hoàn thành)\s*:?\s*$/iu.test(l)){c="acceptance_criterion";continue}if(/^(?:dependencies|dependency|phụ thuộc)\s*:?\s*$/iu.test(l)){c="dependency";continue}if(/^(?:open questions|open question|câu hỏi mở)\s*:?\s*$/iu.test(l)){c="open_question";continue}if(/^(?:constraints|constraint|ràng buộc)\s*:?\s*$/iu.test(l)){c="constraint";continue}if(c&&Nc(p)){s(_(e,o,c,_c(p),u,.96));continue}c=null}}}return n}function Hr(e){return String(e).padStart(12,"0")}var pt=class{constructor(t){this.storage=t}storage;async write(t,n){if(n.length===0)return null;let r=Math.min(...n.map(c=>c.evidence.sequence)),s=Math.max(...n.map(c=>c.evidence.sequence)),o={version:1,projectId:t.projectId,agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,firstSequence:r,lastSequence:s,createdAt:new Date().toISOString(),observations:n},i=v(n.map(c=>c.id).sort().join("|")).slice(0,16),a=v(t.sessionKey).slice(0,12),u=[`projects/${t.projectId}`,"work","semantic","observations",`${Hr(r)}-${Hr(s)}-${a}-${i}.json`].join("/");return await this.storage.exists(u)||await this.storage.put(u,JSON.stringify(o,null,2)+`
`,"application/json"),u}};import{mkdirSync as $c}from"node:fs";import{join as Ur}from"node:path";function Fc(e){return{value:e.value,confidence:e.confidence,evidence:e.evidence}}function Kc(e,t){if(!t)return!0;let n=e.evidence.occurredAt.localeCompare(t.evidence.occurredAt);return n!==0?n>0:e.evidence.sessionKey===t.evidence.sessionKey?e.evidence.sequence>=t.evidence.sequence:e.confidence>=t.confidence}function V(e,t){return Kc(t,e)?t:e}function G(e,t=30){let n=new Set,r=[];for(let s of e){let o=s.value.normalize("NFKC").toLowerCase().replace(/\s+/g," ").trim();!o||n.has(o)||(n.add(o),r.push(s))}return r.slice(-t)}async function Lc(e,t){let n=`projects/${e.id}/work/semantic/observations/`,r=await t.list(n),s=[];for(let o of r.filter(i=>i.key.endsWith(".json")).sort((i,a)=>i.key.localeCompare(a.key))){let i=await t.getText(o.key);if(i)try{let a=JSON.parse(i);a.version===1&&Array.isArray(a.observations)&&s.push(a)}catch{}}return s}function Wc(e){return{key:e.scopeKey??`phase:${e.scopeOrder??0}`,order:e.scopeOrder??0,acceptanceCriteria:[],dependencies:[],openQuestions:[],constraints:[],notes:[]}}async function Yr(e,t){let r=(await Lc(e,t)).flatMap(S=>S.observations).sort((S,h)=>{let y=S.evidence.occurredAt.localeCompare(h.evidence.occurredAt);return y!==0?y:S.evidence.sessionKey===h.evidence.sessionKey?S.evidence.sequence-h.evidence.sequence:S.id.localeCompare(h.id)}),s,o,i,a,u,c=new Map,p=[],l=[],m=[];for(let S of r){let h=Fc(S);if(S.scope==="phase"&&S.scopeKey){let y=c.get(S.scopeKey)??Wc(S);switch(S.kind){case"phase_objective":y.objective=V(y.objective,h);break;case"phase_why":y.why=V(y.why,h);break;case"phase_deliverable":y.deliverable=V(y.deliverable,h);break;case"acceptance_criterion":y.acceptanceCriteria.push(h);break;case"dependency":y.dependencies.push(h);break;case"open_question":y.openQuestions.push(h);break;case"constraint":y.constraints.push(h);break;case"note":y.notes.push(h);break}c.set(y.key,y);continue}switch(S.kind){case"mission":s=V(s,h);break;case"objective":o=V(o,h);break;case"why":i=V(i,h);break;case"desired_outcome":a=V(a,h);break;case"plan_rationale":u=V(u,h);break;case"open_question":p.push(h);break;case"constraint":l.push(h);break;case"note":m.push(h);break}}for(let S of c.values())S.acceptanceCriteria=G(S.acceptanceCriteria,20),S.dependencies=G(S.dependencies,15),S.openQuestions=G(S.openQuestions,15),S.constraints=G(S.constraints,15),S.notes=G(S.notes,20);let d={version:1,projectId:e.id,projectName:e.name,mission:s,activeObjective:o,why:i,desiredOutcome:a,planRationale:u,phases:Array.from(c.values()).sort((S,h)=>S.order-h.order),openQuestions:G(p,20),constraints:G(l,20),notes:G(m,20),updatedAt:r.length?r[r.length-1].evidence.occurredAt:new Date().toISOString()},g=Ur(e.rootPath,".toolnet","work");return $c(g,{recursive:!0}),R(Ur(g,"semantic-current.json"),d),await t.put(`projects/${e.id}/work/semantic/current.json`,JSON.stringify(d,null,2)+`
`,"application/json"),d}async function Xr(e,t){let n=await t.getText(`projects/${e.id}/work/semantic/current.json`);if(!n)return null;try{return JSON.parse(n)}catch{return null}}function Vc(e,t){if(!zc(e))return{events:[],nextOffset:t};let n=Jc(e).size,r=Number.isFinite(t)?Math.max(0,t):0;if(r>n&&(r=0),r===n)return{events:[],nextOffset:n};let s=Buffer.alloc(n-r),o=qc(e,"r");try{Bc(o,s,0,s.length,r)}finally{Dc(o)}let i=s.toString("utf8"),a=i.lastIndexOf(`
`);if(a<0)return{events:[],nextOffset:r};let u=i.slice(0,a+1);return{events:u.split(`
`).filter(Boolean).flatMap(c=>{try{return[JSON.parse(c)]}catch{return[]}}),nextOffset:r+Buffer.byteLength(u,"utf8")}}var mt=class{constructor(t){this.options=t;this.journal=new pt(t.storage)}options;journal;async learnNew(){let t=this.options.wal.loadState(),n=Number(t.sourceCursors["work.semantic.offset"]??0),r=Vc(this.options.wal.eventsFile,Number.isFinite(n)?n:0);if(r.events.length===0)return{scannedEvents:0,observations:0,journalWritten:!1,reconciled:!1,nextOffset:r.nextOffset};let s=Gr(this.options.identity,r.events),o=!1,i=!1;return s.length>0&&(o=!!await this.journal.write(this.options.identity,s),o&&(await Yr(this.options.project,this.options.storage),i=!0)),this.options.wal.setSourceCursor("work.semantic.offset",r.nextOffset),{scannedEvents:r.events.length,observations:s.length,journalWritten:o,reconciled:i,nextOffset:r.nextOffset}}};import{existsSync as gu,mkdirSync as yu}from"node:fs";import{join as en}from"node:path";import{existsSync as es,mkdirSync as Gc,readFileSync as Hc,statSync as Qr,writeFileSync as Uc}from"node:fs";import{dirname as Yc,join as Xc}from"node:path";var Zr=64*1024,Qc=`# ToolNet Project Operating Manual

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
`;function ft(e){return Xc(e.rootPath,".toolnet","PROJECT.md")}function Zc(e){return e.normalize("NFKC").replace(/\s+/g," ").trim()}function eu(e){let t=[],n=new Set,r=/^\s*[-*]\s+\[(enforce|advisory)\]\s+(.+?)\s*$/gimu,s;for(;s=r.exec(e);){let o=s[1].toLowerCase(),i=Zc(s[2]);if(!i)continue;let a=`${o}:${i.toLowerCase()}`;n.has(a)||(n.add(a),t.push({id:v(a).slice(0,24),mode:o,text:i,source:"manual"}))}return t}function tu(e){let t=ft(e);return es(t)||(Gc(Yc(t),{recursive:!0}),Uc(t,Qc,{encoding:"utf8",mode:384})),t}function gt(e,t=!1){let n=t?tu(e):ft(e);if(!es(n))return null;if(Qr(n).size>Zr)throw new Error(`PROJECT.md exceeds ${Zr} bytes`);let s=Hc(n,"utf8");return{path:n,content:s,digest:v(s),rules:eu(s),bytes:Buffer.byteLength(s,"utf8"),updatedAt:new Date(Qr(n).mtimeMs).toISOString()}}import{existsSync as nu,mkdirSync as ru,readFileSync as su,renameSync as ou,writeFileSync as iu}from"node:fs";import{dirname as au,join as cu}from"node:path";function uu(e,t){ru(au(e),{recursive:!0});let n=`${e}.tmp-${process.pid}-${Date.now()}`;iu(n,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),ou(n,e)}function is(e){return cu(e.rootPath,".toolnet","work","current.json")}function Zt(e){let t=is(e);if(!nu(t))return null;try{let n=JSON.parse(su(t,"utf8"));return n.version!==1||n.projectId!==e.id?null:n}catch{return null}}function yt(e){return e.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim()}function $(e,t,n){let r=[],s=new Set;for(let o of[...e,...t].reverse()){let i=yt(o);if(!(!i||s.has(i))&&(s.add(i),r.push(o),r.length>=n))break}return r.reverse()}function lu(e,t,n=20){let r=new Map;for(let s of[...e,...t]){let o=`${s.kind}|${yt(s.command)}`;r.delete(o),r.set(o,s)}return Array.from(r.values()).slice(-n)}function du(e){return e.kind==="phase"?/^Phase\s+\d+$/iu.test(e.text):e.kind==="task"?/^(?:TODO|Task|Việc)\s+\d+$/iu.test(e.text):!1}function ts(e,t){let n=t.status??e?.status??"pending",r=n;e?.status==="completed"&&n!=="completed"&&(r="completed"),e&&n==="pending"&&(e.status==="in_progress"||e.status==="blocked")&&(r=e.status);let s=e&&du(t)?e.title:t.text;return{id:e?.id??t.id,title:s,status:r,order:t.order??e?.order,confidence:Math.max(e?.confidence??0,t.confidence),updatedAt:t.occurredAt,updatedBy:{agent:t.agent,nativeSessionId:t.nativeSessionId,eventId:t.eventId}}}function ns(e){let t=new Map;for(let n of e){let r=n.order!==void 0?`order:${n.order}`:yt(n.title);t.set(r,n)}return t}function rs(e){return e.order!==void 0?`order:${e.order}`:yt(e.key||e.text)}function ss(e){return Array.from(e).sort((t,n)=>{let r=t.order??Number.MAX_SAFE_INTEGER,s=n.order??Number.MAX_SAFE_INTEGER;return r!==s?r-s:t.updatedAt.localeCompare(n.updatedAt)})}function os(e){return e.find(t=>t.status==="in_progress")??e.find(t=>t.status==="blocked")??e.find(t=>t.status==="pending")}function as(e,t){let n=Zt(e),r=ns(n?.phases??[]),s=ns(n?.tasks??[]),o=n?.currentRequest,i=n?.currentActivity,a=n?.goal,u=n?.plan,c=n?.lastSession,p=[],l=[],m=[],d=[],g=[],S=[...n?.activeFiles??[]],h=[],y=[],k=[],I=[],M=[],O=[],T=[...t].sort((f,b)=>{let B=f.occurredAt.localeCompare(b.occurredAt);return B!==0?B:f.sequence-b.sequence});for(let f of T)switch(f.kind){case"request":o=f.text;break;case"activity":i=f.text;break;case"goal":a=f.text;break;case"plan":u=f.text;break;case"phase":{let b=rs(f);r.set(b,ts(r.get(b),f));break}case"task":{let b=rs(f);s.set(b,ts(s.get(b),f));break}case"decision":p.push(f.text);break;case"blocker":l.push(f.text);break;case"warning":m.push(f.text);break;case"next_action":d.push(f.text);break;case"file":{g.push(f.text);let b=f.fileAction??"active",B=S.indexOf(f.text);B>=0&&S.splice(B,1),b!=="deleted"&&S.push(f.text),b==="modified"?h.push(f.text):b==="created"?y.push(f.text):b==="deleted"&&k.push(f.text);break}case"command":I.push(f.text);break;case"test":M.push(f.text),f.checkKind&&O.push({kind:f.checkKind,command:f.text,status:f.checkStatus??"unknown",updatedAt:f.occurredAt,agent:f.agent,nativeSessionId:f.nativeSessionId});break;case"session":c={agent:f.agent,nativeSessionId:f.nativeSessionId,sessionKey:f.sessionKey,updatedAt:f.occurredAt};break}let C=ss(r.values()),w=ss(s.values()),D=os(C),z=os(w),It=$(n?.nextActions??[],[...d,...z?[z.title]:[],...!z&&D?[D.title]:[],...w.filter(f=>f.status==="pending").slice(0,5).map(f=>f.title)],8),At=$(n?.blockers??[],[...l,...C.filter(f=>f.status==="blocked").map(f=>f.title),...w.filter(f=>f.status==="blocked").map(f=>f.title)],20),pe=T.length>0?T[T.length-1].occurredAt:n?.updatedAt??new Date().toISOString(),me={version:1,projectId:e.id,projectName:e.name,currentRequest:o,currentActivity:i,goal:a,plan:u,phases:C,tasks:w,decisions:$(n?.decisions??[],p,20),blockers:At,warnings:$(n?.warnings??[],m,20),nextActions:It,filesTouched:$(n?.filesTouched??[],g,30),activeFiles:$([],S,5),modifiedFiles:$(n?.modifiedFiles??[],h,30),createdFiles:$(n?.createdFiles??[],y,30),deletedFiles:$(n?.deletedFiles??[],k,30),commands:$(n?.commands??[],I,20),tests:$(n?.tests??[],M,20),checks:lu(n?.checks??[],O,20),currentPhase:D,currentTask:z,progress:{phasesTotal:C.length,phasesCompleted:C.filter(f=>f.status==="completed").length,tasksTotal:w.length,tasksCompleted:w.filter(f=>f.status==="completed").length,blocked:C.filter(f=>f.status==="blocked").length+w.filter(f=>f.status==="blocked").length},lastSession:c,updatedAt:pe};return uu(is(e),me),me}function P(e,t){let n=new Set,r=[];for(let s of e){let o=s.replace(/\s+/g," ").trim();if(!o)continue;let i=o.normalize("NFKC").toLowerCase();if(!n.has(i)&&(n.add(i),r.push(o),r.length>=t))break}return r}function cs(e){if(e)return{id:e.id,title:e.title,status:e.status}}function pu(e,t=[]){let n=t.slice(-10);if(n.some(s=>s.status==="failed"))return"failing";if(n.some(s=>s.status==="passed"))return"passing";let r=e.slice(-10).join(`
`).toLowerCase();return/(?:failed|failing|failure|error|✗|❌)/u.test(r)?"failing":/(?:passed|passing|green|success|✓|✅)/u.test(r)?"passing":"unknown"}function mu(e){return v(JSON.stringify(e))}function fu(e){let t=[];for(let n of e){if(!n)continue;let r=n.match(/https?:\/\/[^\s<>"'`)\]}]+/giu)??[];for(let s of r){let o=s.replace(/[.,;:!?]+$/gu,"").trim();o&&t.push(o)}}return P(t,30)}function us(e){let{project:t,identity:n,state:r}=e,s=r.activeFiles?.at(-1)??r.filesTouched.at(-1),o=r.phases.filter(k=>k.status==="completed").map(k=>k.title),i=r.tasks.filter(k=>k.status==="completed").map(k=>k.title),a=r.phases.filter(k=>k.status!=="completed"&&k.status!=="cancelled").map(k=>k.title),u=r.tasks.filter(k=>k.status!=="completed"&&k.status!=="cancelled").map(k=>k.title),c=new Set(r.tasks.filter(k=>k.status==="completed").map(k=>k.title.normalize("NFKC").toLowerCase().replace(/\s+/gu," ").trim())),p=P(r.nextActions.filter(k=>!c.has(k.normalize("NFKC").toLowerCase().replace(/\s+/gu," ").trim())),10),l=P([...u,...p],15),m=P(r.tests.slice().reverse(),10),d=P([...(r.activeFiles??[]).slice().reverse(),...r.filesTouched.slice().reverse()],20),g={schema:"toolnet.handoff.v2",version:2,project:{id:t.id,name:t.name},source:{agent:n.agent,nativeSessionId:n.nativeSessionId,sessionKey:n.sessionKey,sequence:e.sequence,reason:e.reason},capturedAt:e.capturedAt??new Date().toISOString(),goal:r.goal,request:r.currentRequest,activity:r.currentActivity,current:{phase:cs(r.currentPhase),task:cs(r.currentTask),file:s},completed:{phases:P(o,20),tasks:P(i,30)},remaining:{phases:P(a,20),tasks:P(u,30),todos:l},nextAction:p[0],blockers:P(r.blockers.slice().reverse(),10),decisions:P(r.decisions.slice().reverse(),10),files:{current:s,recent:d,active:P(r.activeFiles??[],10),modified:P(r.modifiedFiles??[],20),created:P(r.createdFiles??[],20),deleted:P(r.deletedFiles??[],20)},tests:{status:pu(r.tests,r.checks),recent:m,checks:(r.checks??[]).slice(-10).map(k=>({kind:k.kind,status:k.status,command:k.command}))},evidence:{commands:P((r.commands??[]).slice().reverse(),20),references:fu([r.currentRequest,r.currentActivity,r.goal,r.plan,...r.decisions,...r.blockers,...r.warnings,...r.nextActions,...r.filesTouched,...r.commands??[],...r.tests,...(r.checks??[]).map(k=>k.command)])},attention:P(e.attention??[],20),progress:r.progress},{capturedAt:S,source:h,...y}=g;return{...g,stateDigest:mu(y)}}function hu(e){return!!(e.currentRequest||e.currentActivity||e.goal||e.plan||e.phases.length>0||e.tasks.length>0||e.nextActions.length>0||e.blockers.length>0||e.decisions.length>0||e.filesTouched.length>0)}function ls(e,t,n,r,s){if(!hu(n))return null;let o=gt(e,!1),a=[...o?o.rules.filter(l=>l.mode==="enforce").map(l=>l.text):[],...n.warnings].slice(0,20),u=us({project:e,identity:t,state:n,reason:r,sequence:s,attention:a}),c=u.stateDigest;return{version:1,id:v([e.id,t.sessionKey,c].join("|")).slice(0,24),projectId:e.id,projectName:e.name,createdAt:new Date().toISOString(),reason:r,sourceSession:{agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,sequence:s},currentRequest:n.currentRequest,currentActivity:n.currentActivity,goal:n.goal,plan:n.plan,progress:n.progress,currentPhase:n.currentPhase,currentTask:n.currentTask,incompletePhases:n.phases.filter(l=>l.status!=="completed"&&l.status!=="cancelled"),incompleteTasks:n.tasks.filter(l=>l.status!=="completed"&&l.status!=="cancelled"),nextActions:u.remaining.todos.slice(0,10),blockers:n.blockers.slice(-10),decisions:n.decisions.slice(-10),warnings:n.warnings.slice(-10),attention:a,filesTouched:n.filesTouched.slice(-20),activeFiles:n.activeFiles?.slice(-10),modifiedFiles:n.modifiedFiles?.slice(-20),createdFiles:n.createdFiles?.slice(-20),deletedFiles:n.deletedFiles?.slice(-20),tests:n.tests.slice(-15),checks:n.checks?.slice(-10),stateDigest:c,continuity:u}}function ds(e,t){let n=en(e.rootPath,".toolnet","work","handoffs");yu(n,{recursive:!0});let r=en(n,`${t.id}.json`);gu(r)||R(r,t),R(en(e.rootPath,".toolnet","work","handoff-latest.json"),t)}function ps(e){let t=ls(e.project,e.identity,e.state,e.reason,e.sequence);return t?(ds(e.project,t),t):null}var ht=class{constructor(t){this.options=t}options;async capture(t,n){let r=Zt(this.options.project);r||(r=await lt(this.options.project,this.options.storage)),r||(r=await ut(this.options.project,this.options.storage));let s=ls(this.options.project,this.options.identity,r,t,n);if(!s)return null;ds(this.options.project,s);let o=`projects/${this.options.project.id}/work/handoffs/${s.id}.json`;return await this.options.storage.exists(o)||await this.options.storage.put(o,JSON.stringify(s,null,2)+`
`,"application/json"),await this.options.storage.put(`projects/${this.options.project.id}/work/handoff-latest.json`,JSON.stringify(s,null,2)+`
`,"application/json"),s}};async function ms(e,t){let n=await t.getText(`projects/${e.id}/work/handoff-latest.json`);if(!n)return null;try{return JSON.parse(n)}catch{return null}}import{existsSync as Su,readFileSync as ku,writeFileSync as vu}from"node:fs";import{join as wu}from"node:path";var gs="<!-- TOOLNET:STABLE-WORK:BEGIN -->",tn="<!-- TOOLNET:STABLE-WORK:END -->";function nn(e){switch(e.status){case"completed":return"[x]";case"in_progress":return"[~]";case"blocked":return"[!]";case"cancelled":return"[-]";default:return"[ ]"}}function W(e,t){return t.length?["",`${e}:`,...t.map(n=>`- ${n}`)]:[]}function fs(e,t){return t.length?["",`${e}:`,...t.map(n=>`- ${nn(n)} ${n.title}`)]:[]}function bu(e){let t=[gs,"# ToolNet Stable Work State","",`Updated: ${e.updatedAt}`];return e.lastSession&&t.push(`Last agent: ${e.lastSession.agent}`,`Last session: ${e.lastSession.nativeSessionId}`),e.currentRequest&&t.push("","Current request:",e.currentRequest),e.currentActivity&&t.push("","Current activity:",e.currentActivity),e.goal&&t.push("","Goal:",e.goal),e.plan&&t.push("","Plan:",e.plan),e.currentPhase&&t.push("","Current phase:",`${nn(e.currentPhase)} ${e.currentPhase.title}`),e.currentTask&&t.push("","Current task:",`${nn(e.currentTask)} ${e.currentTask.title}`),t.push(...fs("Phases",e.phases)),t.push(...fs("TODO / Tasks",e.tasks)),t.push(...W("Next actions",e.nextActions)),t.push(...W("Blockers",e.blockers)),t.push(...W("Important decisions",e.decisions)),t.push(...W("Active files",e.activeFiles??[])),t.push(...W("Modified files",e.modifiedFiles??[])),t.push(...W("Created files",e.createdFiles??[])),t.push(...W("Deleted files",e.deletedFiles??[])),t.push(...W("Files touched",e.filesTouched)),t.push(...W("Recent commands",e.commands??[])),t.push(...W("Checks",(e.checks??[]).map(n=>`[${n.status}] ${n.kind}: ${n.command}`))),t.push("","Progress:",`- Phases: ${e.progress.phasesCompleted}/${e.progress.phasesTotal}`,`- Tasks: ${e.progress.tasksCompleted}/${e.progress.tasksTotal}`,`- Blocked: ${e.progress.blocked}`,"","Continuation:","- Resume current unfinished task.","- Never redo completed TODO/Phase unless explicitly requested.","- Ask ToolNet Memory for deeper history only when necessary.",tn),t.join(`
`)}function ys(e,t){let n=wu(e.rootPath,".toolnet","current.md"),r="";if(Su(n))try{r=ku(n,"utf8")}catch{r=""}r=r.replace(/<!-- TOOLNET:AUTO-CURRENT:BEGIN -->[\s\S]*?<!-- TOOLNET:AUTO-CURRENT:END -->/gu,"");let s=bu(t),o=r.indexOf(gs),i=r.indexOf(tn),a;o>=0&&i>=o?a=[r.slice(0,o).trimEnd(),s,r.slice(i+tn.length).trimStart()].filter(Boolean).join(`

`):a=r.trim()?`${r.trim()}

${s}`:s,vu(n,`${a.trim()}
`,{encoding:"utf8",mode:384})}import{existsSync as Lf,mkdirSync as xu,readFileSync as Wf,renameSync as Cu,writeFileSync as ju}from"node:fs";import{dirname as Iu,join as Au}from"node:path";function Eu(e){return Au(e.rootPath,".toolnet","context","session-origin.json")}function Pu(e,t){xu(Iu(e),{recursive:!0});let n=`${e}.tmp-${process.pid}-${Date.now()}`;ju(n,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Cu(n,e)}function St(e,t){return[...e].filter(n=>n.kind===t).sort((n,r)=>{let s=n.occurredAt.localeCompare(r.occurredAt);return s!==0?s:n.sequence-r.sequence}).at(-1)}function hs(e,t){let n=St(t.observations,"file"),r=St(t.observations,"next_action"),s=St(t.observations,"blocker"),o=St(t.observations,"decision"),i={version:1,projectId:e.id,agent:t.agent,nativeSessionId:t.nativeSessionId,updatedAt:t.workState.updatedAt,currentRequest:t.workState.currentRequest,currentActivity:t.workState.currentActivity,currentTask:t.workState.currentTask?.title,currentPhase:t.workState.currentPhase?.title,lastTouchedFile:n?.text??t.workState.activeFiles?.at(-1)??t.workState.filesTouched.at(-1),latestNextAction:r?.text??t.workState.nextActions.at(-1),latestBlocker:s?.text??t.workState.blockers.at(-1),latestDecision:o?.text??t.workState.decisions.at(-1)};return Pu(Eu(e),i),i}import{existsSync as Ss,mkdirSync as Ou,readFileSync as Mu}from"node:fs";import{join as rn}from"node:path";function ks(e){return rn(e.rootPath,".toolnet","memory","checkpoints")}function vs(e){return rn(ks(e),"latest.json")}function Tu(e){let t=vs(e);if(!Ss(t))return null;try{let n=JSON.parse(Mu(t,"utf8"));return n.schema!=="toolnet.memory.checkpoint.v1"||n.project.id!==e.id?null:n}catch{return null}}function Ru(e){return["rule","architecture","decision","fix"].includes(e)}function Nu(e,t){return t.length===0?[]:Ye(e,t).candidates.filter(r=>Ru(r.kind)&&r.knowledgeClass!=="transient"&&r.importanceScore>=.65).map(r=>({fingerprint:r.fingerprint,kind:r.kind,content:r.content,knowledgeClass:r.knowledgeClass,importanceScore:r.importanceScore,confidence:r.confidence,createdAt:r.createdAt,agent:e.agent,nativeSessionId:e.nativeSessionId}))}function _u(e,t){let n=new Map;for(let r of[...e,...t]){let s=n.get(r.fingerprint);(!s||r.importanceScore>s.importanceScore)&&n.set(r.fingerprint,r)}return Array.from(n.values()).sort((r,s)=>s.importanceScore-r.importanceScore||s.createdAt.localeCompare(r.createdAt)).slice(0,80)}function $u(e){return{request:e.currentRequest,activity:e.currentActivity,goal:e.goal,phase:e.currentPhase?{title:e.currentPhase.title,status:e.currentPhase.status}:void 0,task:e.currentTask?{title:e.currentTask.title,status:e.currentTask.status}:void 0,phases:e.phases.map(t=>({title:t.title,status:t.status})),tasks:e.tasks.map(t=>({title:t.title,status:t.status})),activeFiles:e.activeFiles??[],modifiedFiles:e.modifiedFiles??[],createdFiles:e.createdFiles??[],deletedFiles:e.deletedFiles??[],checks:e.checks??[],blockers:e.blockers,decisions:e.decisions,nextActions:e.nextActions}}function ws(e,t,n,r){let s=Tu(e),o=_u(s?.durableFacts??[],Nu(t,n)),i=n.at(-1)?.sequence??s?.source.sequence??0,a=r.phases.filter(h=>h.status==="completed").map(h=>h.title),u=r.tasks.filter(h=>h.status==="completed").map(h=>h.title),c=r.phases.filter(h=>h.status!=="completed"&&h.status!=="cancelled").map(h=>h.title),p=r.tasks.filter(h=>h.status!=="completed"&&h.status!=="cancelled").map(h=>h.title),l={work:$u(r),durableFacts:o.map(h=>h.fingerprint).sort()},m=v(JSON.stringify(l)).slice(0,32),d={schema:"toolnet.memory.checkpoint.v1",version:1,project:{id:e.id,name:e.name},source:{agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,sequence:i},capturedAt:new Date().toISOString(),request:r.currentRequest,activity:r.currentActivity,goal:r.goal,current:{phase:r.currentPhase,task:r.currentTask},completed:{phases:a,tasks:u},remaining:{phases:c,tasks:p},files:{active:r.activeFiles??[],modified:r.modifiedFiles??[],created:r.createdFiles??[],deleted:r.deletedFiles??[]},checks:r.checks??[],blockers:r.blockers.slice(-10),decisions:r.decisions.slice(-15),nextActions:r.nextActions.slice(0,10),durableFacts:o,stateDigest:m},g=ks(e);Ou(g,{recursive:!0,mode:448});let S=rn(g,`${m}.json`);return Ss(S)||R(S,d),R(vs(e),d),d}function bs(e,t,n){if(process.env.TOOLNET_LOCAL_CHECKPOINT==="0"||n.length===0)return{updated:!1,observations:0};let r=at(t,n);if(r.length===0)return{updated:!1,observations:0};let s=as(e,r);ys(e,s),hs(e,{agent:t.agent,nativeSessionId:t.nativeSessionId,observations:r,workState:s});try{ws(e,t,n,s)}catch{}try{ps({project:e,identity:t,state:s,reason:"continuous-checkpoint",sequence:n.at(-1)?.sequence??0})}catch{}return{updated:!0,observations:r.length}}var Me=class{identity;wal;remote;sanitizer=new H;learner;continuity;semantic;handoff;project;title;metadata;constructor(t){this.project=t.project,this.identity=In(t.project,t.agent,t.nativeSessionId),this.title=t.title,this.metadata=this.sanitizer.sanitizeValue(t.metadata??{}),this.wal=new Je(this.identity,t.eventContext),this.remote=new ze(t.storage,t.maxEventsPerChunk??100,t.maxChunkBytes??512*1024),this.learner=new ot({project:t.project,storage:t.storage,identity:this.identity,wal:this.wal}),this.continuity=new dt({project:t.project,storage:t.storage,identity:this.identity,wal:this.wal}),this.semantic=new mt({project:t.project,storage:t.storage,identity:this.identity,wal:this.wal}),this.handoff=new ht({project:t.project,storage:t.storage,identity:this.identity})}sanitizeEvent(t){let n=t.provenance?{...t.provenance,metadata:this.sanitizer.sanitizeValue(t.provenance.metadata)}:void 0;return{...t,data:this.sanitizer.sanitizeValue(t.data??{}),provenance:n}}checkpointLocal(t){if(t.length!==0)try{bs(this.project,this.identity,t)}catch{}}start(t={}){let n=this.wal.loadState();return this.record({type:n.lastSequence===0?"session_start":"session_resume",data:t,provenance:{source:this.identity.agent}})}record(t){let n=this.wal.append([this.sanitizeEvent(t)]);return this.checkpointLocal(n),n[0]}recordMany(t){let n=this.wal.append(t.map(r=>this.sanitizeEvent(r)));return this.checkpointLocal(n),n}setSourceCursor(t,n){this.wal.setSourceCursor(t,n)}async flush(){let t=this.wal.readPending(),n=this.wal.loadState(),r=await this.remote.append(this.identity,t.events,n.sourceCursors,{title:this.title,metadata:this.metadata});if(t.events.length>0){let s=t.events[t.events.length-1];this.wal.markRemote(s.sequence,t.endOffset)}if(process.env.TOOLNET_SESSION_LEARNING!=="0")try{await this.learner.learnNew()}catch{}if(process.env.TOOLNET_WORK_CONTINUITY!=="0")try{await this.continuity.learnNew()}catch{}if(process.env.TOOLNET_SEMANTIC_CONTINUITY!=="0")try{await this.semantic.learnNew()}catch{}if(process.env.TOOLNET_SMART_HANDOFF!=="0"&&t.events.length>0)try{let s=t.events[t.events.length-1],o=["session_idle","session_end","session_compact"].includes(s.type)?s.type:"checkpoint";await this.handoff.capture(o,s.sequence)}catch{}return r}async idle(t={}){return this.record({type:"session_idle",data:t,provenance:{source:this.identity.agent}}),this.flush()}async end(t={}){return this.record({type:"session_end",data:t,provenance:{source:this.identity.agent}}),this.flush()}status(){return this.wal.loadState()}recoverRemote(){return this.remote.recover(this.identity)}};var Fu=[/^<SYSTEM MESSAGE>/i,/^<EPHEMERAL MESSAGE>/i,/^<system>/i,/^<ephemeral>/i,/^ManageTask:/i,/^Task \d+ status:/i,/^Task \d+ killed/i,/^Task \d+ loading/i,/^Thought for \d+ tokens/i,/^Prioritizing Tool Usage/i,/^Tool call:/i,/^Tool response:/i,/^npm notice/i,/^npm WARN/i,/^added \d+ packages/i,/^removed \d+ packages/i,/^up to date/i,/^\d+ packages are looking for funding/i,/^run `npm fund` for details/i,/^[\d.]+%/,/^\[={10,}\]/,/^Loading\.\.\./i,/^Processing\.\.\./i,/^bash-\d+\.\d+\$/,/^\$ /,/^\s*$/],Ku=[/api[_-]?key[:\s=]+[^\s]+/gi,/token[:\s=]+[^\s]+/gi,/secret[:\s=]+[^\s]+/gi,/password[:\s=]+[^\s]+/gi,/bearer\s+[^\s]+/gi,/authorization:\s*[^\s]+/gi],Lu=["decision","decided","rule","convention","architecture","pattern","fixed","resolved","implemented","created","updated","deleted","deployed","blocker","blocked","issue","bug","error","next","todo","action","requirement","must","should","important"];function Wu(e){let t=e.toLowerCase();return Lu.some(n=>t.includes(n))}function Du(e){if(!e.trim())return!0;for(let t of Fu)if(t.test(e))return!0;return Wu(e),!1}function zu(e){let t=e;for(let n of Ku)t=t.replace(n,r=>{let s=r.split(/[:\s=]+/);return s.length>1?`${s[0]}: [REDACTED]`:"[REDACTED]"});return t}function sn(e){let t=e.trim();return t?Du(t)?{content:"",filtered:!0,reason:"noise"}:{content:zu(t),filtered:!1}:{content:"",filtered:!0,reason:"empty"}}function kt(e){let t={};for(let[n,r]of Object.entries(e))if(typeof r=="string"){let s=sn(r);s.filtered||(t[n]=s.content)}else r&&typeof r=="object"&&!Array.isArray(r)?t[n]=kt(r):Array.isArray(r)?t[n]=r.map(s=>{if(typeof s=="string"){let o=sn(s);return o.filtered?null:o.content}return s&&typeof s=="object"?kt(s):s}).filter(s=>s!==null):t[n]=r;return t}function xs(e){let t=typeof e.type=="string"?e.type.toLowerCase():"";if(t.includes("system")||t.includes("ephemeral")||t==="tool_call"&&!e.result)return!0;if(e.data&&typeof e.data=="object"){let n=e.data,r=typeof n.content=="string"?n.content:"";if(r&&sn(r).filtered)return!0}return!1}function Os(){try{let t=Bu("opencode",["db","path"],{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:5e3}).trim();if(t)return t}catch{}if(process.env.OPENCODE_DB)return process.env.OPENCODE_DB;let e=process.env.XDG_DATA_HOME??Cs(Ju(),".local","share");return Cs(e,"opencode","opencode.db")}function x(e){return typeof e=="string"?e:""}function re(e){if(typeof e=="number"&&Number.isFinite(e))return e;if(typeof e=="bigint")return Number(e);if(typeof e=="string"){let t=Number(e);if(Number.isFinite(t))return t}return 0}function wt(e){if(e&&typeof e=="object"&&!Buffer.isBuffer(e))return e;if(typeof e!="string")return{};try{let t=JSON.parse(e);if(t&&typeof t=="object"&&!Array.isArray(t))return t}catch{}return{}}function ce(e){let t=re(e);if(t<=0)return new Date().toISOString();t<1e11&&(t*=1e3);let n=new Date(t);return Number.isNaN(n.getTime())?new Date().toISOString():n.toISOString()}function vt(e,t){if(!t)return!1;let n=js(e),r=js(t);if(n===r)return!0;let s=Gu(n,r);return s!==""&&s!==".."&&!s.startsWith(`..${process.platform==="win32"?"\\":"/"}`)&&!Vu(s)}function Is(e){if(!e)return{time:-1,id:""};try{let t=JSON.parse(e);return{time:typeof t.time=="number"?t.time:-1,id:typeof t.id=="string"?t.id:""}}catch{return{time:-1,id:""}}}function As(e){return JSON.stringify(e)}function Ms(e){if(!qu(e))throw new Error(`OpenCode database not found: ${e}`);let t=new Hu(e,{readOnly:!0});return t.exec("PRAGMA query_only = ON"),t.exec("PRAGMA busy_timeout = 3000"),t}function Uu(e,t){let n=e.prepare(`
      SELECT *
      FROM "session"
      WHERE id = ?
      LIMIT 1
      `).get(t);if(!n)throw new Error(`OpenCode session not found: ${t}`);return n}function Ts(e,t,n){let r=x(t.directory);if(r&&vt(n.rootPath,r))return!0;let s=x(t.project_id);if(s){try{let o=e.prepare(`
          SELECT *
          FROM "project"
          WHERE id = ?
          LIMIT 1
          `).get(s);if(o)for(let i of["worktree","directory","path"]){let a=x(o[i]);if(a&&vt(n.rootPath,a))return!0}}catch{}try{if(e.prepare(`
          SELECT directory
          FROM "project_directory"
          WHERE project_id = ?
          `).all(s).some(i=>vt(n.rootPath,x(i.directory))))return!0}catch{}}try{let o=e.prepare(`
        SELECT data
        FROM "message"
        WHERE session_id = ?
        ORDER BY time_created DESC
        LIMIT 20
        `).all(x(t.id));for(let i of o){let a=wt(i.data),u=a.path&&typeof a.path=="object"?a.path:{};for(let c of[x(u.cwd),x(u.root)])if(c&&vt(n.rootPath,c))return!0}}catch{}return!1}function Es(e,t,n,r){let s=`
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
    `;return e.prepare(s).all(n,r.time,r.time,r.id)}function Ps(e,t){let n=e[e.length-1];return n?{time:re(n.__clock),id:x(n.id)}:t}function Yu(e,t){let n=wt(t.data),r=x(n.role),s=re(t.__clock),o=x(t.id),i="message";return r==="user"?i="user_prompt":r==="assistant"&&(i="assistant_message"),{clock:s,order:0,event:{type:i,timestamp:ce(s),role:r||void 0,sourceEventId:`message:${o}:${s}`,sourceSequence:`${s}:${o}`,data:{messageId:o,...n},provenance:{source:"opencode",sourcePath:e,sourceTable:"message",sourceRowId:o,sourceOffset:`${s}:${o}`}}}}function Xu(e){let t={...e},n=e.state&&typeof e.state=="object"&&!Array.isArray(e.state)?{...e.state}:void 0;if(n){let r=n.output;if(typeof r=="string"){let s=r.replace(/\r\n/g,`
`),o=500;n.outputSummary=s.length<=o?s:`${s.slice(0,350)}
...[ToolNet truncated ${s.length-o} chars]...
${s.slice(-150)}`,delete n.output}else r!==void 0&&(n.outputSummary="[non-text tool output omitted]",delete n.output);if(n.input&&typeof n.input=="object"&&!Array.isArray(n.input)){let s={...n.input};for(let[o,i]of Object.entries(s))typeof i=="string"&&i.length>1e3&&(s[o]=`${i.slice(0,1e3)}...[ToolNet truncated]`);n.input=s}t.state=n}return t}function Qu(e,t){let n=x(t.message_id);if(n)try{let r=e.prepare(`
        SELECT data
        FROM "message"
        WHERE id = ?
        LIMIT 1
        `).get(n);if(!r)return;let s=wt(r.data);return x(s.role)||void 0}catch{return}}function Zu(e,t,n){let r=wt(n.data),s=x(r.type),o=re(n.__clock),i=x(n.id),a=x(n.message_id),u=Qu(e,n),c="message_part";return s==="tool"?c="tool_call":s==="snapshot"&&(c="artifact"),{clock:o,order:1,event:{type:c,timestamp:ce(o),role:u,sourceEventId:`part:${i}:${o}`,sourceSequence:`${o}:${i}`,data:{partId:i,messageId:a,...s==="tool"?Xu(r):r},provenance:{source:"opencode",sourcePath:t,sourceTable:"part",sourceRowId:i,sourceOffset:`${o}:${i}`}}}}async function on(e){let t=e.dbPath??Os(),n=Ms(t);try{let r;try{r=Uu(n,e.nativeSessionId)}catch{let y=new Me({project:e.project,storage:e.storage,agent:"opencode",nativeSessionId:e.nativeSessionId,metadata:{source:"opencode.db",deleted:!0},eventContext:{source:"opencode",cwd:e.project.rootPath}});y.status().lastSequence===0&&y.recordMany([{type:"custom",timestamp:new Date().toISOString(),sourceEventId:`session:${e.nativeSessionId}:deleted`,data:{event:"session_deleted"},provenance:{source:"opencode"}}]);let k=await y.flush();return{nativeSessionId:e.nativeSessionId,importedMessages:0,importedParts:0,recordedEvents:0,eventCount:k.eventCount,chunkCount:k.chunkCount,status:k.status,durability:e.localOnly?"local":"remote"}}if(!Ts(n,r,e.project))throw new Error(["OpenCode session does not belong to current ToolNet project.",`Session: ${e.nativeSessionId}`,`Project: ${e.project.rootPath}`,`Session directory: ${x(r.directory)||"unknown"}`].join(" "));let s=new Me({project:e.project,storage:e.storage,agent:"opencode",nativeSessionId:e.nativeSessionId,title:x(r.title)||void 0,metadata:{source:"opencode.db",openCodeProjectId:x(r.project_id)||void 0,directory:x(r.directory)||void 0},eventContext:{source:"opencode",cwd:x(r.directory)||e.project.rootPath}}),o=s.status(),i=Is(o.sourceCursors["opencode.message"]),a=Is(o.sourceCursors["opencode.part"]),u=Es(n,"message",e.nativeSessionId,i),c=Es(n,"part",e.nativeSessionId,a),p=[];if(o.lastSequence===0){let y=re(r.time_created);p.push({clock:y,order:-1,event:{type:"session_start",timestamp:ce(y),sourceEventId:`session:${e.nativeSessionId}:created:${y}`,data:{title:x(r.title)||void 0,directory:x(r.directory)||void 0,openCodeProjectId:x(r.project_id)||void 0},provenance:{source:"opencode",sourcePath:t,sourceTable:"session",sourceRowId:e.nativeSessionId}}})}p.push(...u.map(y=>Yu(t,y))),p.push(...c.map(y=>Zu(n,t,y)));let l=re(r.time_updated)||re(r.time_created);e.compacted&&p.push({clock:l,order:98,event:{type:"session_compact",timestamp:ce(l),sourceEventId:`session:${e.nativeSessionId}:compact:${l}`,data:{},provenance:{source:"opencode"}}}),e.error?p.push({clock:l,order:99,event:{type:"error",timestamp:ce(l),sourceEventId:`session:${e.nativeSessionId}:error:${l}`,data:{source:"session.error"},provenance:{source:"opencode"}}}):e.idle&&p.push({clock:l,order:100,event:{type:"session_idle",timestamp:ce(l),sourceEventId:`session:${e.nativeSessionId}:idle:${l}`,data:{},provenance:{source:"opencode"}}}),p.sort((y,k)=>y.clock-k.clock||y.order-k.order);let m=p.filter(y=>!xs(y.event.data)).map(y=>({...y,event:{...y.event,data:kt(y.event.data)}})),d=s.recordMany(m.map(y=>y.event)),g=Ps(u,i),S=Ps(c,a);if(s.setSourceCursor("opencode.message",As(g)),s.setSourceCursor("opencode.part",As(S)),m.length>0)try{let y=m.map(I=>JSON.stringify(I.event.data)),k=Ue(y,e.nativeSessionId);s.setSourceCursor("opencode.session.summary",k.summary),s.setSourceCursor("opencode.session.facts_count",k.durableFacts.length),Gn()&&!Yn()&&s.setSourceCursor("opencode.raw_transcript.archived","local")}catch{}if(e.localOnly){let y=s.status();return{nativeSessionId:e.nativeSessionId,importedMessages:u.length,importedParts:c.length,recordedEvents:d.length,eventCount:y.lastSequence,chunkCount:0,status:y.status,durability:"local"}}let h=await s.flush();return{nativeSessionId:e.nativeSessionId,importedMessages:u.length,importedParts:c.length,recordedEvents:d.length,eventCount:h.eventCount,chunkCount:h.chunkCount,status:h.status,durability:"remote"}}finally{n.close()}}async function Rs(e){let t=e.dbPath??Os(),n=Ms(t),r=[];try{let o=n.prepare(`
        SELECT *
        FROM "session"
        ORDER BY
          COALESCE(
            time_updated,
            time_created,
            0
          ) DESC
        `).all();for(let i of o){if(!Ts(n,i,e.project))continue;let a=x(i.id);if(a&&r.push(a),r.length>=(e.limit??100))break}}finally{n.close()}let s=[];for(let o of r)s.push(await on({project:e.project,storage:e.storage,nativeSessionId:o,dbPath:t}));return s}import{existsSync as tl,mkdirSync as Ks,readFileSync as nl,writeFileSync as Ls}from"node:fs";import{join as $s}from"node:path";import{homedir as Ns}from"node:os";import{join as se}from"node:path";function bt(e={}){let t=process.env.OPENCODE_CONFIG_DIR?.trim();if(t)return t;let n=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return n?se(n,"opencode"):se(e.home??Ns(),".config","opencode")}function Te(e={}){let t=process.env.OPENCODE_CONFIG?.trim();if(t)return t;let n=e.home??Ns(),r=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return r?se(r,"opencode","opencode.json"):se(n,".config","opencode","opencode.json")}function Re(e={}){let t=e.cwd??process.cwd();return se(t,"opencode.json")}function xt(e={}){return se(bt(e),"plugins")}function Ct(e={}){return se(bt(e),"AGENTS.md")}var el="memory_agent_ask";function _s(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${el}

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
`.trim()}var Fs="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",an="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function rl(e={}){let t=Ct();Ks(bt(),{recursive:!0});let n=`${Fs}
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


${_s()}

${an}`,r=tl(t)?nl(t,"utf8"):"",s=r.indexOf(Fs),o=r.indexOf(an);return s>=0&&o>=s?r=r.slice(0,s)+n+r.slice(o+an.length):(r=r.trimEnd(),r&&(r+=`

`),r+=n),Ls(t,r.trimEnd()+`
`,{encoding:"utf8",mode:384}),t}function Ws(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=[];n.push(rl({cwd:e.cwd}));let r=e.scope??"global",s=[];if((r==="global"||r==="both")&&s.push(e.directory??xt()),r==="project"||r==="both"){let o=e.cwd??process.cwd();s.push($s(o,".opencode","plugins"))}for(let o of s){Ks(o,{recursive:!0});let i=$s(o,"toolnet-memory.js"),a=`
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
`;Ls(i,a.trimStart(),{encoding:"utf8",mode:384}),n.push(i)}return n}import{existsSync as qs,mkdirSync as sl,readFileSync as ol,renameSync as il,writeFileSync as al}from"node:fs";import{dirname as Bs,join as cl}from"node:path";function Ne(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function ul(e,t){sl(Bs(e),{recursive:!0});let n=`${e}.tmp-${process.pid}-${Date.now()}`;al(n,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),il(n,e)}function Ds(e){if(!qs(e))return{};let t=ol(e,"utf8").trim();if(!t)return{};let n;try{n=JSON.parse(t)}catch{throw new Error(`Invalid existing OpenCode config at ${e}: parse error. Not overwriting.`)}if(!Ne(n))throw new Error(`Invalid existing OpenCode config at ${e}: root must be a JSON object. Not overwriting.`);return n}function zs(e,t){if(!Ne(e))return!1;let n=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(n)&&n.length===2&&n[0]===t&&n[1]==="mcp"}function jt(e,t,n,r){let s=cl(Bs(e),"opencode.jsonc"),o=qs(s)?s:void 0,i=Ds(e),a=i.mcp;if(a!==void 0&&!Ne(a))throw new Error(`Invalid existing OpenCode config: mcp must be an object in ${e}.`);let u=Ne(a)?{...a}:{},c=u[n];if(zs(c,t)&&!r)return{installed:!0,changed:!1,preservedJsonc:o};u[n]={type:"local",command:[t,"mcp"],enabled:!0};let p={...i,mcp:u};ul(e,p);let l=Ds(e);if(!Ne(l.mcp)||!zs(l.mcp[n],t))throw new Error(`OpenCode MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0,preservedJsonc:o}}function Js(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...jt(e.configFile,t,n,e.force??!1),configFile:e.configFile,serverName:n,command:[t,"mcp"]};if(r==="both"){let i=Te(),a=Re({cwd:e.cwd}),u=jt(i,t,n,e.force??!1),c=jt(a,t,n,e.force??!1);return{installed:!0,changed:u.changed||c.changed,configFile:i,serverName:n,command:[t,"mcp"],preservedJsonc:u.preservedJsonc??c.preservedJsonc}}let s=r==="project"?Re({cwd:e.cwd}):Te();return{...jt(s,t,n,e.force??!1),configFile:s,serverName:n,command:[t,"mcp"]}}import{existsSync as zg,mkdirSync as ml,readFileSync as qg,writeFileSync as fl}from"node:fs";import{dirname as gl,join as Gs}from"node:path";function cn(e){if(!e)return 0;let t=Array.from(e).length,n=e.trim().split(/\s+/u).filter(Boolean).length;return Math.ceil(Math.max(t/3.5,n*1.3))}function j(e,t){let n=e.replace(/\s+/g," ").trim();return n.length<=t?n:n.slice(0,Math.max(0,t-1)).trimEnd()+"\u2026"}function ll(e){let t=[],n=!1;for(let r of e.split(/\r?\n/u)){let s=r.trim();if(s.includes("<!--")&&(n=!0),n){s.includes("-->")&&(n=!1);continue}let o=s.toLowerCase();if(!(!s||s.startsWith("#")||s==="```"||o.startsWith("- [enforce]")||o.startsWith("* [enforce]")||o.startsWith("- [advisory]")||o.startsWith("* [advisory]"))&&(s=s.replace(/^[-*]\s+/u,""),s&&t.push(j(s,280)),t.length>=16))break}return t}function dl(e){let t=[],n=[];for(let r of e.split(/\\r?\\n/u)){let s=r.trim(),o=s.toLowerCase(),a=["- [enforce]","* [enforce]","- [advisory]","* [advisory]"].find(c=>o.startsWith(c));if(!a)continue;let u=s.slice(a.length).trim();u&&(a.includes("enforce")?t.push(u):n.push(u))}return{enforce:t,advisory:n}}function pl(e,t){let n=[];for(let r of e){let s=[...n,r].join(`
`);if(cn(s)<=t){n.push(r);continue}let o=cn(n.join(`
`)),i=Math.max(0,t-o);if(i>=16){let a=Math.floor(i*3.2),u=j(r,a);u&&n.push(u)}break}return n.join(`
`).trim()}async function Vs(e){let t=Math.max(256,Math.min(2e3,e.maxTokens??1e3)),n=gt(e.project,!1),r=n?.content??"";r||(r=await e.storage.getText(`projects/${e.project.id}/project/manual.md`)??"");let s=dl(r),o=n?n.rules.filter(d=>d.mode==="enforce").map(d=>d.text):s.enforce,i=n?n.rules.filter(d=>d.mode==="advisory").map(d=>d.text):s.advisory,a=r?ll(r):[],u=await lt(e.project,e.storage),c=await Xr(e.project,e.storage),p=await ms(e.project,e.storage),l=[];if(l.push("[TOOLNET PROJECT CONTEXT]"),l.push(`Project: ${e.project.name}`),l.push("Continue existing project state. Do not restart completed work unless evidence shows it is necessary."),r&&l.push(`Full operating manual: ${ft(e.project)}`),o.length){l.push("","PROJECT RULES \u2014 MUST FOLLOW");for(let d of o.slice(0,24))l.push(`- [ENFORCE] ${j(d,240)}`)}if(i.length){l.push("","PROJECT PREFERENCES");for(let d of i.slice(0,10))l.push(`- ${j(d,220)}`)}if(c&&(c.mission&&l.push("","MISSION",j(c.mission.value,420)),c.activeObjective&&l.push("","CURRENT OBJECTIVE",j(c.activeObjective.value,420)),c.why&&l.push("","WHY THIS WORK MATTERS",j(c.why.value,420)),c.desiredOutcome&&l.push("","DESIRED OUTCOME",j(c.desiredOutcome.value,420)),c.planRationale&&l.push("","WHY THIS APPROACH",j(c.planRationale.value,420))),u){if(l.push("","ACTIVE WORK"),u.goal&&l.push(`Goal: ${j(u.goal,320)}`),u.plan&&l.push(`Plan: ${j(u.plan,320)}`),l.push(`Progress: phases ${u.progress.phasesCompleted}/${u.progress.phasesTotal}; tasks ${u.progress.tasksCompleted}/${u.progress.tasksTotal}; blocked ${u.progress.blocked}`),u.currentPhase&&l.push(`Current phase: ${u.currentPhase.title} [${u.currentPhase.status}]`),u.currentPhase&&c){let d=c.phases.find(g=>g.order===u.currentPhase?.order);d&&(d.objective&&l.push(`Phase objective: ${j(d.objective.value,340)}`),d.why?l.push(`Why this phase: ${j(d.why.value,340)}`):l.push("Why this phase: not explicitly recorded. Inspect existing implementation before assuming intent."),d.deliverable&&l.push(`Deliverable: ${j(d.deliverable.value,340)}`),d.dependencies.length&&l.push(`Depends on: ${d.dependencies.slice(0,4).map(g=>j(g.value,180)).join("; ")}`),d.acceptanceCriteria.length&&(l.push("","DEFINITION OF DONE"),d.acceptanceCriteria.slice(0,6).forEach(g=>{l.push(`- ${j(g.value,260)}`)})),d.openQuestions.length&&(l.push("","OPEN QUESTIONS FOR CURRENT PHASE"),d.openQuestions.slice(0,4).forEach(g=>{l.push(`- ${j(g.value,260)}`)})))}u.currentTask&&l.push(`Current task: ${u.currentTask.title} [${u.currentTask.status}]`),u.nextActions.length&&(l.push("","NEXT ACTIONS"),u.nextActions.slice(0,6).forEach((d,g)=>{l.push(`${g+1}. ${j(d,260)}`)})),u.blockers.length&&(l.push("","BLOCKERS"),u.blockers.slice(0,5).forEach(d=>{l.push(`- ${j(d,260)}`)})),u.warnings.length&&(l.push("","ATTENTION"),u.warnings.slice(-5).forEach(d=>{l.push(`- ${j(d,260)}`)})),u.decisions.length&&(l.push("","RECENT DECISIONS"),u.decisions.slice(-5).forEach(d=>{l.push(`- ${j(d,260)}`)})),u.lastSession&&l.push("",`Last work session: ${u.lastSession.agent} / ${u.lastSession.nativeSessionId}`)}if(c&&c.openQuestions.length&&(l.push("","UNRESOLVED QUESTIONS"),c.openQuestions.slice(0,5).forEach(d=>{l.push(`- ${j(d.value,260)}`)})),p&&l.push(`Latest handoff: ${p.reason} / ${p.sourceSession.agent}`),a.length){l.push("","OPERATING NOTES");for(let d of a)l.push(`- ${d}`)}l.push("","Before changing anything: verify the current repository state and continue from the active phase/task above.");let m=pl(l,t);return{version:1,projectId:e.project.id,projectName:e.project.name,text:m,estimatedTokens:cn(m),maxTokens:t,hasManual:!!r,hasWorkState:!!u,hasHandoff:!!p,generatedAt:new Date().toISOString()}}function yl(e){return Gs(e.rootPath,".toolnet","context","startup.md")}function hl(e){return Gs(e.rootPath,".toolnet","context","startup.json")}function Sl(e,t){let n=yl(e);ml(gl(n),{recursive:!0}),fl(n,t.text.endsWith(`
`)?t.text:t.text+`
`,{encoding:"utf8",mode:384}),R(hl(e),t)}async function Hs(e,t,n=800){let s=(await Vs({project:e,storage:t,maxTokens:n})).text;Ge(s)>n&&(s=He(s,n),s+=`

[Context trimmed by ToolNet Memory token budget]
`);let i={version:1,projectId:e.id,projectName:e.name,text:s,digest:v(s),estimatedTokens:Ge(s),generatedAt:new Date().toISOString()};return Sl(e,i),await t.put(`projects/${e.id}/context/startup.md`,i.text+`
`,"text/markdown"),await t.put(`projects/${e.id}/context/startup.json`,JSON.stringify(i,null,2)+`
`,"application/json"),i}function le(e,t){let n=e.indexOf(t);if(!(n<0))return e[n+1]}function de(e,t){return e.includes(t)}function vl(e){let t=_e(),n=vn(Sn({provider:t.storage.provider,huggingface:t.storage.huggingface,localRoot:t.storage.localRoot}),{attempts:3});return new De(n,e.id,e.name,e.remote??e.name)}function wl(){return un("sh",["-lc","command -v opencode >/dev/null 2>&1"],{stdio:"ignore"}).status===0}function bl(){try{return un("opencode",["--version"],{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:5e3}).stdout?.trim()||void 0}catch{return}}function xl(){try{let e=un("opencode",["mcp","list","--format","json"],{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:1e4});if(e.status!==0)return{available:!1,servers:[]};let t=JSON.parse(e.stdout||"[]");return{available:!0,servers:Array.isArray(t)?t.map(r=>String(r.name||r.id||"")):[]}}catch{return{available:!1,servers:[]}}}function Cl(e){let t=[],n=wl();n||t.push("opencode binary not found");let r=bl(),s=Te(),o=ue(s),i=Re({cwd:e}),a=ue(i),u=process.env.OPENCODE_CONFIG?.trim(),c=u?ue(u):!1,p=!1;if(o)try{p=!!JSON.parse(Us(s,"utf8")).mcp?.["toolnet-memory"]}catch{}let l=!1;if(a)try{l=!!JSON.parse(Us(i,"utf8")).mcp?.["toolnet-memory"]}catch{}let m=xt(),d=ue(`${m}/toolnet-memory.js`),g=kl(e??process.cwd(),".opencode","plugins"),S=ue(`${g}/toolnet-memory.js`),h=Ct(),y=ue(h),k;return n&&(k=xl()),{opencodeBinaryDetected:n,version:r,globalConfigExists:o,projectConfigExists:a,customConfigExists:c,globalMcpReady:p,projectMcpReady:l,globalPluginExists:d,projectPluginExists:S,continuityInstructions:y,mcpConnectionStatus:k,errors:t}}async function jl(){let[e="help",...t]=process.argv.slice(2),n=de(t,"--json"),r=de(t,"--force"),s=le(t,"--scope")??"global",o=le(t,"--project")??process.cwd();if(e==="status"){let c=Cl(o);if(n)console.log(JSON.stringify(c,null,2));else if(console.log("OpenCode Integration"),console.log("===================="),console.log(""),console.log(`Binary detected     : ${c.opencodeBinaryDetected?"\u2713":"\u2717"}`),c.version&&console.log(`Version             : ${c.version}`),console.log(`Global config       : ${c.globalConfigExists?"\u2713":"\u2717"}`),console.log(`Project config      : ${c.projectConfigExists?"\u2713":"\u2717"}`),c.customConfigExists&&console.log(`Custom config       : \u2713 (${process.env.OPENCODE_CONFIG})`),console.log(`Global MCP          : ${c.globalMcpReady?"\u2713":"\u2717"}`),console.log(`Project MCP         : ${c.projectMcpReady?"\u2713":"\u2717"}`),console.log(`Global plugin       : ${c.globalPluginExists?"\u2713":"\u2717"}`),console.log(`Project plugin      : ${c.projectPluginExists?"\u2713":"\u2717"}`),console.log(`Continuity rules    : ${c.continuityInstructions?"\u2713":"\u2717"}`),c.mcpConnectionStatus&&(console.log(`MCP connection      : ${c.mcpConnectionStatus.available?"\u2713":"\u2717"}`),c.mcpConnectionStatus.servers.length>0&&console.log(`  Servers           : ${c.mcpConnectionStatus.servers.join(", ")}`)),c.errors.length>0){console.log("");for(let p of c.errors)console.log(`  \u26A0 ${p}`)}c.opencodeBinaryDetected||(process.exitCode=1);return}if(e==="install-plugin"){let c=Js({binary:le(t,"--bin"),scope:s,cwd:o,force:r}),p=Ws({binary:le(t,"--bin"),scope:s,cwd:o});if(n)console.log(JSON.stringify({mcp:c,pluginFiles:p},null,2));else{console.log(`\u2705 OpenCode integration installed (scope: ${s})`),console.log(`  MCP config: ${c.configFile}`),c.changed?console.log(`  \u2713 MCP server "${c.serverName}" added`):console.log(`  \u2713 MCP server "${c.serverName}" already configured`);for(let l of p)console.log(`  \u2713 ${l}`);console.log(""),console.log("OpenCode will load plugins automatically on next start."),console.log("Verify MCP with: opencode mcp list")}return}let i=new Fe().detect(o),a=vl(i),u=le(t,"--db");if(e==="sync"){let c=t.find(S=>!S.startsWith("--")&&S!==o&&S!==u);if(!c)throw new Error("Usage: session:opencode-sync <session-id>");let p=de(t,"--idle"),l=de(t,"--error"),m=de(t,"--compacted"),d=de(t,"--local-only"),g=await on({project:i,storage:a,nativeSessionId:c,dbPath:u,idle:p,error:l,compacted:m,localOnly:d});if(!d&&(p||m||l))try{await Hs(i,a,800)}catch{}console.log(JSON.stringify(g,null,2));return}if(e==="recover"){let c=le(t,"--limit"),p=c?Number(c):100,l=await Rs({project:i,storage:a,dbPath:u,limit:Number.isFinite(p)?p:100});console.log(JSON.stringify({project:i.name,sessions:l.length,importedMessages:l.reduce((m,d)=>m+d.importedMessages,0),importedParts:l.reduce((m,d)=>m+d.importedParts,0)},null,2));return}console.log(`OpenCode Session Adapter

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
`)}jl().catch(e=>{console.error(e instanceof Error?e.message:e),process.exit(1)});
