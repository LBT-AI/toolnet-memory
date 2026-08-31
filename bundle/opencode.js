import{existsSync as ce,readFileSync as Ls}from"node:fs";import{join as ll}from"node:path";import{spawnSync as Zt}from"node:child_process";import{existsSync as Ws,readFileSync as Ds}from"node:fs";import{homedir as zs}from"node:os";import{join as qs}from"node:path";function Bs(e){let t=e.trim();return t.length>=2&&t.startsWith('"')&&t.endsWith('"')?(t=t.slice(1,-1),t.replace(/\\n/g,`
`).replace(/\\r/g,"\r").replace(/\\t/g,"	").replace(/\\"/g,'"').replace(/\\\\/g,"\\")):t.length>=2&&t.startsWith("'")&&t.endsWith("'")?t.slice(1,-1):t}function Vs(){let e=process.env.TOOLNET_GLOBAL_ENV??qs(zs(),".config","toolnet-memory",".env");if(!Ws(e))return;let t=Ds(e,"utf8");for(let n of t.split(/\r?\n/)){let r=n.trim();if(!r||r.startsWith("#"))continue;r.startsWith("export ")&&(r=r.slice(7));let s=r.indexOf("=");if(s<=0)continue;let o=r.slice(0,s).trim();/^[A-Za-z_][A-Za-z0-9_]*$/.test(o)&&process.env[o]===void 0&&(process.env[o]=Bs(r.slice(s+1)))}}Vs();function me(e,t){return e===void 0?t:["1","true","yes","on"].includes(e.toLowerCase())}function fe(e,t){if(!e)return t;let n=Number(e);return Number.isFinite(n)?n:t}function Te(){return{memory:{autoCapture:me(process.env.MEMORY_AUTO_CAPTURE,!0),autoRetrieve:me(process.env.MEMORY_AUTO_RETRIEVE,!0),autoSummarize:me(process.env.MEMORY_AUTO_SUMMARIZE,!0),autoSync:me(process.env.MEMORY_AUTO_SYNC,!0)},retrieval:{maxCandidates:fe(process.env.MEMORY_MAX_CANDIDATES,50),rerankTop:fe(process.env.MEMORY_RERANK_TOP,10),finalContext:fe(process.env.MEMORY_FINAL_CONTEXT,5),tokenBudget:fe(process.env.MEMORY_TOKEN_BUDGET,2e3)},storage:{provider:process.env.MEMORY_STORAGE_PROVIDER??"huggingface",r2:{accountId:process.env.R2_ACCOUNT_ID,bucket:process.env.R2_BUCKET,accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY},s3:{endpoint:process.env.S3_ENDPOINT,region:process.env.S3_REGION,bucket:process.env.S3_BUCKET,accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY,forcePathStyle:me(process.env.S3_FORCE_PATH_STYLE,!1)},huggingface:{namespace:process.env.HF_NAMESPACE,bucket:process.env.HF_BUCKET,accessKeyId:process.env.HF_S3_ACCESS_KEY_ID,secretAccessKey:process.env.HF_S3_SECRET_ACCESS_KEY},localRoot:process.env.MEMORY_LOCAL_STORAGE_PATH},cache:{maxMb:fe(process.env.MEMORY_LOCAL_CACHE_MB,200)}}}import{createHash as Js}from"node:crypto";import{existsSync as xt,mkdirSync as Gs,readFileSync as Hs,renameSync as Us,writeFileSync as Ys}from"node:fs";import{basename as Xs,dirname as Re,join as _e,parse as rn,resolve as ge}from"node:path";var sn=".toolnet",Qs="project.json";function Zs(e){return Js("sha256").update(e).digest("hex").slice(0,16)}function Ct(e){return _e(e,sn,Qs)}function eo(e){return xt(Ct(e))}function to(e,t){let n=ge(e),r=rn(n).root;for(;;){if(eo(n))return n;if(n===r||t&&n===ge(t))break;let s=Re(n);if(s===n)break;n=s}return null}function no(e){let t=ge(e),n=rn(t).root,r=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"];for(;;){if(r.some(o=>xt(_e(t,o))))return t;if(t===n)break;let s=Re(t);if(s===t)break;t=s}return ge(e)}function ro(e){let t;try{t=JSON.parse(Hs(e,"utf8"))}catch(s){throw new Error(`Invalid ToolNet project manifest: ${e}: ${s instanceof Error?s.message:String(s)}`)}if(!t||typeof t!="object")throw new Error(`Invalid ToolNet project manifest: ${e}`);let n=t;if(typeof n.id!="string"||!n.id.trim())throw new Error(`ToolNet project manifest is missing id: ${e}`);if(typeof n.name!="string"||!n.name.trim())throw new Error(`ToolNet project manifest is missing name: ${e}`);let r=new Date().toISOString();return{version:1,id:n.id,name:n.name,remote:typeof n.remote=="string"&&n.remote.trim()?n.remote:n.name,rootPath:typeof n.rootPath=="string"?n.rootPath:Re(Re(e)),createdAt:typeof n.createdAt=="string"?n.createdAt:r,updatedAt:typeof n.updatedAt=="string"?n.updatedAt:r,graphVersion:typeof n.graphVersion=="number"?n.graphVersion:0,memoryVersion:typeof n.memoryVersion=="number"?n.memoryVersion:0,metadata:n.metadata&&typeof n.metadata=="object"?n.metadata:void 0}}function tn(e,t){let n=_e(e,sn);Gs(n,{recursive:!0});let r=Ct(e),s=`${r}.tmp-${process.pid}`;Ys(s,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),Us(s,r)}function nn(e,t){return{id:e.id,name:e.name,remote:e.remote,rootPath:t,createdAt:e.createdAt,updatedAt:e.updatedAt,graphVersion:e.graphVersion,memoryVersion:e.memoryVersion,metadata:e.metadata}}var Ne=class{detect(t=process.cwd()){let n=ge(t),r=no(n),o=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(p=>xt(_e(r,p))),i=to(n,o?r:void 0);if(i){let p=Ct(i),l=ro(p);return l.rootPath!==i&&(l.rootPath=i,l.updatedAt=new Date().toISOString(),tn(i,l)),nn(l,i)}let a=new Date().toISOString(),u=Xs(r),c={version:1,id:Zs(r),name:u,remote:u,rootPath:r,createdAt:a,updatedAt:a,graphVersion:0,memoryVersion:0};return tn(r,c),nn(c,r)}};var so=[{type:"openai_key",regex:/\bsk-[A-Za-z0-9_\-]{20,}\b/g},{type:"huggingface_token",regex:/\bhf_[A-Za-z0-9]{20,}\b/g},{type:"hf_s3_access_key",regex:/\bHFAK[A-Za-z0-9]{8,}\b/g},{type:"bearer_token",regex:/\bBearer\s+[A-Za-z0-9._\-]{16,}\b/gi},{type:"jwt",regex:/\beyJ[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\b/g},{type:"private_key",regex:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g},{type:"password_assignment",regex:/\b(password|passwd|pwd)\s*[:=]\s*["']?[^"'\s]{6,}["']?/gi},{type:"secret_assignment",regex:/\b(secret|api[_-]?key|access[_-]?token|refresh[_-]?token)\s*[:=]\s*["']?[^"'\s]{8,}["']?/gi},{type:"cookie",regex:/\b(cookie|set-cookie)\s*[:=]\s*[^;\n]{8,}/gi}],$e=class{scan(t){let n=[];for(let r of so){let s=new RegExp(r.regex.source,r.regex.flags);for(let o of t.matchAll(s))n.push({type:r.type,value:o[0]})}return n}hasSecrets(t){return this.scan(t).length>0}};var H=class{scanner=new $e;sanitize(t){let n=t,r=this.scanner.scan(t),s=new Set;for(let o of r)s.add(o.type),n=n.split(o.value).join(`[REDACTED:${o.type}]`);return{text:n,redacted:r.length,secretTypes:[...s]}}sanitizeValue(t){if(typeof t=="string")return this.sanitize(t).text;if(Array.isArray(t))return t.map(n=>this.sanitizeValue(n));if(t&&typeof t=="object"){let n={};for(let[r,s]of Object.entries(t)){let o=r.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g,"");o.includes("password")||o.includes("passwd")||o==="pwd"||o.includes("secret")||o.includes("token")||o.includes("cookie")||o.includes("authorization")||o.includes("apikey")||o.includes("accesskey")||o.includes("privatekey")||o.includes("clientsecret")||o.includes("credential")?n[r]="[REDACTED]":n[r]=this.sanitizeValue(s)}return n}return t}};import{homedir as Eo}from"node:os";import{join as Po}from"node:path";import{DeleteObjectCommand as oo,GetObjectCommand as io,HeadObjectCommand as ao,ListObjectsV2Command as co,PutObjectCommand as uo,S3Client as lo}from"@aws-sdk/client-s3";import{getSignedUrl as po}from"@aws-sdk/s3-request-presigner";var Ke=class{name="huggingface";client;bucket;constructor(t){this.bucket=t.bucket,this.client=new lo({region:"us-east-1",endpoint:`https://s3.hf.co/${t.namespace}`,forcePathStyle:!0,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:t.accessKeyId,secretAccessKey:t.secretAccessKey}})}async put(t,n,r="application/octet-stream"){let s=typeof n=="string"?Buffer.from(n,"utf8"):n;await this.client.send(new uo({Bucket:this.bucket,Key:t,Body:s,ContentType:r}))}async get(t){let n=await po(this.client,new io({Bucket:this.bucket,Key:t}),{expiresIn:60}),r=await fetch(n,{redirect:"follow"});if(r.status===404)return null;if(!r.ok)throw new Error(`HF download failed: ${r.status} ${r.statusText}`);return new Uint8Array(await r.arrayBuffer())}async getText(t){let n=await this.get(t);return n?Buffer.from(n).toString("utf8"):null}async exists(t){try{return await this.client.send(new ao({Bucket:this.bucket,Key:t})),!0}catch(n){if(typeof n=="object"&&n!==null&&"$metadata"in n&&n.$metadata?.httpStatusCode===404)return!1;throw n}}async delete(t){await this.client.send(new oo({Bucket:this.bucket,Key:t}))}async list(t=""){let n=[],r;do{let s=await this.client.send(new co({Bucket:this.bucket,Prefix:t||void 0,ContinuationToken:r}));for(let o of s.Contents??[])o.Key&&n.push({key:o.Key,size:o.Size,updatedAt:o.LastModified?.toISOString()});r=s.IsTruncated?s.NextContinuationToken:void 0}while(r);return n}};import{access as on,mkdir as mo,readFile as fo,readdir as go,rm as yo,stat as an,writeFile as ho}from"node:fs/promises";import{dirname as So,join as ko,relative as cn,resolve as vo}from"node:path";var ye=class{constructor(t){this.root=t}root;name="local";path(t){let n=t.replace(/^\/+/,"");return vo(this.root,n)}async put(t,n){let r=this.path(t);await mo(So(r),{recursive:!0}),await ho(r,n)}async get(t){try{return await fo(this.path(t))}catch(n){if(typeof n=="object"&&n!==null&&"code"in n&&n.code==="ENOENT")return null;throw n}}async getText(t){let n=await this.get(t);return n?Buffer.from(n).toString("utf8"):null}async exists(t){try{return await on(this.path(t)),!0}catch{return!1}}async delete(t){await yo(this.path(t),{force:!0})}async list(t=""){let n=this.path(t),r=[];try{await on(n)}catch{return r}let s=async i=>{let a=await go(i,{withFileTypes:!0});for(let u of a){let c=ko(i,u.name);if(u.isDirectory()){await s(c);continue}let p=await an(c);r.push({key:cn(this.root,c),size:p.size,updatedAt:p.mtime.toISOString()})}},o=await an(n);return o.isDirectory()?await s(n):r.push({key:cn(this.root,n),size:o.size,updatedAt:o.mtime.toISOString()}),r}};import{DeleteObjectCommand as wo,GetObjectCommand as bo,HeadObjectCommand as xo,ListObjectsV2Command as Co,PutObjectCommand as jo,S3Client as Io}from"@aws-sdk/client-s3";import{getSignedUrl as Ao}from"@aws-sdk/s3-request-presigner";var he=class{name;client;bucket;constructor(t){this.name=t.name??"s3",this.bucket=t.bucket,this.client=new Io({region:t.region??"us-east-1",endpoint:t.endpoint||void 0,forcePathStyle:t.forcePathStyle??!1,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:t.accessKeyId,secretAccessKey:t.secretAccessKey}})}async put(t,n,r="application/octet-stream"){let s=typeof n=="string"?Buffer.from(n,"utf8"):n;await this.client.send(new jo({Bucket:this.bucket,Key:t,Body:s,ContentType:r}))}async get(t){let n=await Ao(this.client,new bo({Bucket:this.bucket,Key:t}),{expiresIn:60}),r=await fetch(n,{redirect:"follow"});if(r.status===404)return null;if(!r.ok)throw new Error(`${this.name} download failed: ${r.status} ${r.statusText}`);return new Uint8Array(await r.arrayBuffer())}async getText(t){let n=await this.get(t);return n?Buffer.from(n).toString("utf8"):null}async exists(t){try{return await this.client.send(new xo({Bucket:this.bucket,Key:t})),!0}catch(n){if(typeof n=="object"&&n!==null&&"$metadata"in n&&n.$metadata?.httpStatusCode===404)return!1;throw n}}async delete(t){await this.client.send(new wo({Bucket:this.bucket,Key:t}))}async list(t=""){let n=[],r;do{let s=await this.client.send(new Co({Bucket:this.bucket,Prefix:t||void 0,ContinuationToken:r}));for(let o of s.Contents??[])o.Key&&n.push({key:o.Key,size:o.Size,updatedAt:o.LastModified?.toISOString()});r=s.IsTruncated?s.NextContinuationToken:void 0}while(r);return n}};function jt(e,t){return console.warn(t),new ye(e)}function un(e){let t=e.localRoot??Po(Eo(),".toolnet-memory","storage");if(e.provider==="r2"){let n=e.r2;return n?.accountId&&n.bucket&&n.accessKeyId&&n.secretAccessKey?new he({name:"r2",endpoint:`https://${n.accountId}.r2.cloudflarestorage.com`,region:"auto",bucket:n.bucket,forcePathStyle:!0,accessKeyId:n.accessKeyId,secretAccessKey:n.secretAccessKey}):jt(t,"[storage] Cloudflare R2 credentials missing. Using local fallback.")}if(e.provider==="s3"){let n=e.s3;return n?.bucket&&n.accessKeyId&&n.secretAccessKey?new he({name:"s3",endpoint:n.endpoint,region:n.region??"us-east-1",bucket:n.bucket,forcePathStyle:n.forcePathStyle??!1,accessKeyId:n.accessKeyId,secretAccessKey:n.secretAccessKey}):jt(t,"[storage] S3 credentials missing. Using local fallback.")}if(e.provider==="huggingface"){let n=e.huggingface;return n?.namespace&&n.bucket&&n.accessKeyId&&n.secretAccessKey?new Ke({namespace:n.namespace,bucket:n.bucket,accessKeyId:n.accessKeyId,secretAccessKey:n.secretAccessKey}):jt(t,"[storage] Hugging Face credentials missing. Using local fallback.")}return new ye(t)}function Oo(e){return new Promise(t=>setTimeout(t,e))}async function ln(e,t={}){let n=Math.max(1,t.attempts??3),r=t.baseDelayMs??150,s=t.maxDelayMs??2e3,o;for(let i=1;i<=n;i++)try{return await e()}catch(a){if(o=a,i>=n)break;let u=Math.min(s,r*2**(i-1)),c=Math.floor(Math.random()*Math.max(1,u*.2));await Oo(u+c)}throw o}var Mo=new Set(["put","get","getText","delete","list"]);function dn(e,t={}){return new Proxy(e,{get(n,r){let s=Reflect.get(n,r,n);return typeof s!="function"?s:Mo.has(r)?(...o)=>ln(()=>Promise.resolve(s.apply(n,o)),t):s.bind(n)}})}function pn(e){let t=e.trim().replace(/\s+/g,"_").replace(/[^A-Za-z0-9._-]/g,"_").replace(/_+/g,"_").replace(/^\.+|\.+$/g,"").slice(0,100);if(!t||t==="."||t==="..")throw new Error("Invalid project storage folder");return t}function mn(e){let t=e.replace(/^\/+/,"");if(t.startsWith("memories/"))return"memory/records/"+t.slice(9);if(t.startsWith("vectors/"))return"memory/vectors/"+t.slice(8);if(t.startsWith("graph/"))return"code/graph/"+t.slice(6);let n=t.match(/^(snapshots\/[^/]+\/)memories\/(.+)$/);if(n)return`${n[1]}memory/records/${n[2]}`;if(n=t.match(/^(snapshots\/[^/]+\/)vectors\/(.+)$/),n)return`${n[1]}memory/vectors/${n[2]}`;if(n=t.match(/^(snapshots\/[^/]+\/)graph\/(.+)$/),n)return`${n[1]}code/graph/${n[2]}`;let r=t.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)memories\/(.+)$/);if(r)return`${r[1]}memory/records/${r[2]}`;if(r=t.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)vectors\/(.+)$/),r)return`${r[1]}memory/vectors/${r[2]}`;if(r=t.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)graph\/(.+)$/),r)return`${r[1]}code/graph/${r[2]}`;let s=t.match(/^(projects\/[^/]+\/)memories\/(.+)$/);return s?`${s[1]}memory/records/${s[2]}`:(s=t.match(/^(projects\/[^/]+\/)vectors\/(.+)$/),s?`${s[1]}memory/vectors/${s[2]}`:(s=t.match(/^(projects\/[^/]+\/)graph\/(.+)$/),s?`${s[1]}code/graph/${s[2]}`:t))}var Fe=class{constructor(t,n,r,s){this.provider=t;this.name=t.name,this.projectId=n,this.projectName=r,this.folder=pn(s??r),this.sourcePrefix=`projects/${n}`,this.targetPrefix=`projects/${this.folder}`}provider;name;folder;sourcePrefix;targetPrefix;projectId;projectName;registryPromise;async registerProject(){let t=`${this.targetPrefix}/project.json`,n=new Date().toISOString(),r=n,s=await this.provider.getText(t);if(s){let i;try{i=JSON.parse(s)}catch(a){throw new Error(`Invalid remote ToolNet project manifest at ${t}: ${a instanceof Error?a.message:String(a)}`)}if(typeof i.id=="string"&&i.id!==this.projectId)throw new Error(["ToolNet remote project namespace collision.",`Remote folder: ${this.targetPrefix}`,`Existing project id: ${i.id}`,`Current project id: ${this.projectId}`,"Refusing to mix data from two projects."].join(" "));typeof i.createdAt=="string"&&(r=i.createdAt)}let o={version:1,id:this.projectId,name:this.projectName,remote:this.folder,createdAt:r,updatedAt:n};await this.provider.put(t,JSON.stringify(o,null,2)+`
`,"application/json")}async ensureRegistered(){return this.registryPromise||(this.registryPromise=this.registerProject()),this.registryPromise}key(t){if(t=mn(t),t===this.sourcePrefix)return this.targetPrefix;if(t.startsWith(`${this.sourcePrefix}/`))return this.targetPrefix+t.slice(this.sourcePrefix.length);if(t===this.targetPrefix||t.startsWith(`${this.targetPrefix}/`))return t;if(t.startsWith("projects/"))throw new Error(["Cross-project storage access denied.",`Current project: ${this.targetPrefix}`,`Requested key: ${t}`].join(" "));return t}async put(t,n,r){return await this.ensureRegistered(),this.provider.put(this.key(t),n,r)}async get(t){return await this.ensureRegistered(),this.provider.get(this.key(t))}async getText(t){return await this.ensureRegistered(),this.provider.getText(this.key(t))}async delete(t){return await this.ensureRegistered(),this.provider.delete(this.key(t))}async exists(t){return await this.ensureRegistered(),this.provider.exists(this.key(t))}async list(t){return await this.ensureRegistered(),this.provider.list(this.key(t))}};import{existsSync as Nu}from"node:fs";import{execFileSync as _u}from"node:child_process";import{homedir as $u}from"node:os";import{isAbsolute as Ku,join as fs,relative as Fu,resolve as gs}from"node:path";import{DatabaseSync as Lu}from"node:sqlite";import{join as Fo}from"node:path";import{createHash as To}from"node:crypto";import{dirname as Ro}from"node:path";import{mkdirSync as No,readFileSync as _o,renameSync as $o,writeFileSync as Ko}from"node:fs";function v(e){return To("sha256").update(e).digest("hex")}function It(e){if(Array.isArray(e))return e.map(It);if(e&&typeof e=="object"){let t=e,n={};for(let r of Object.keys(t).sort())n[r]=It(t[r]);return n}return e}function fn(e){return JSON.stringify(It(e))}function gn(e){try{return JSON.parse(_o(e,"utf8"))}catch{return null}}function R(e,t){No(Ro(e),{recursive:!0});let n=`${e}.${process.pid}.tmp`;Ko(n,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),$o(n,e)}function yn(e,t){let n=e.trim(),r=n.replace(/\s+/g,"_").replace(/[^A-Za-z0-9._-]/g,"_").replace(/_+/g,"_").replace(/^\.+|\.+$/g,""),s=v(n).slice(0,12);if(!r||r==="."||r==="..")return`${t}--${s}`;let o=r.slice(0,100);return o===n&&n.length<=100?o:`${o.slice(0,85)}--${s}`}function hn(e,t,n){let r=t.trim(),s=n.trim();if(!r)throw new Error("Session agent is required");if(!s)throw new Error("Native session ID is required");let o=yn(r.toLowerCase(),"agent"),i=yn(s,"session");return{projectId:e.id,projectName:e.name,projectRoot:e.rootPath,agent:r,nativeSessionId:s,sessionKey:`${r}:${s}`,remotePrefix:["projects",e.id,"runtime","sources",o,i].join("/"),localDirectory:Fo(e.rootPath,".toolnet","runtime","sources",o,i)}}function Sn(e){return String(e).padStart(12,"0")}var Le=class{constructor(t,n=100,r=512*1024){this.storage=t;this.maxEventsPerChunk=n;this.maxChunkBytes=r;if(n<1)throw new Error("maxEventsPerChunk must be positive");if(r<1024)throw new Error("maxChunkBytes is too small")}storage;maxEventsPerChunk;maxChunkBytes;async getJson(t){let n=await this.storage.getText(t);return n?JSON.parse(n):null}async putJson(t,n){await this.storage.put(t,JSON.stringify(n,null,2)+`
`,"application/json")}async scan(t){let n=`${t.remotePrefix}/events/`,r=await this.storage.list(n),s=[],o=0;for(let i of r){let a=i.key.match(/\/events\/(\d+)-(\d+)-[a-f0-9]+\.jsonl$/);if(!a)continue;let u=Number(a[1]),c=Number(a[2]);!Number.isFinite(u)||!Number.isFinite(c)||(s.push({key:i.key,start:u,end:c}),o=Math.max(o,c))}return s.sort((i,a)=>i.start-a.start),{chunks:s,maxSequence:o}}split(t){let n=[],r=[],s=0;for(let o of t){let i=Buffer.byteLength(JSON.stringify(o)+`
`,"utf8");r.length>0&&(r.length>=this.maxEventsPerChunk||s+i>this.maxChunkBytes)&&(n.push(r),r=[],s=0),r.push(o),s+=i}return r.length>0&&n.push(r),n}async loadManifest(t){return this.getJson(`${t.remotePrefix}/session.json`)}async loadCursor(t){return this.getJson(`${t.remotePrefix}/cursor.json`)}async recover(t){let n=await this.scan(t);return{maxSequence:n.maxSequence,chunkCount:n.chunks.length}}async append(t,n,r,s={}){let o=await this.loadManifest(t),i=await this.scan(t),a=n.filter(h=>h.sequence>i.maxSequence),u=0;for(let h of this.split(a)){let y=h[0],k=h[h.length-1],I=h.map(T=>JSON.stringify(T)).join(`
`)+`
`,M=v(I).slice(0,16),O=[t.remotePrefix,"events",`${Sn(y.sequence)}-${Sn(k.sequence)}-${M}.jsonl`].join("/");await this.storage.exists(O)||await this.storage.put(O,I,"application/x-ndjson"),u+=h.length}let c=await this.scan(t),p=n[n.length-1],l=o?.status??"active";p?.type==="session_end"||p?.type==="session_idle"?l="idle":p?.type==="error"?l="error":n.length>0&&(l="active");let m=new Date().toISOString(),d=n[0],g={version:1,projectId:t.projectId,projectName:t.projectName,agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,status:l,createdAt:o?.createdAt??d?.timestamp??m,updatedAt:p?.timestamp??m,firstEventAt:o?.firstEventAt??d?.timestamp,lastEventAt:p?.timestamp??o?.lastEventAt,eventCount:c.maxSequence,chunkCount:c.chunks.length,metadata:{...o?.metadata,...s.metadata}};(s.title??o?.title)&&(g.title=s.title??o?.title);let S={version:1,projectId:t.projectId,agent:t.agent,nativeSessionId:t.nativeSessionId,lastLocalSequence:n.length>0?n[n.length-1].sequence:c.maxSequence,lastRemoteSequence:c.maxSequence,sourceCursors:r,updatedAt:m};return await this.putJson(`${t.remotePrefix}/cursor.json`,S),await this.putJson(`${t.remotePrefix}/session.json`,g),{uploadedEvents:u,lastRemoteSequence:c.maxSequence,eventCount:g.eventCount,chunkCount:g.chunkCount,status:l}}};import{closeSync as Pt,existsSync as Zo,fsyncSync as ei,mkdirSync as ti,openSync as Ot,readSync as ni,rmSync as jn,statSync as In,writeSync as ri}from"node:fs";import{join as Mt}from"node:path";var Lo=new Set(["thinking","reasoning","reasoningcontent","chainofthought","cot","analysistext","internalreasoning","modelthinking"]),Wo=new Set(["reasoning","thinking","chain_of_thought","chain-of-thought","internal_reasoning","internal-reasoning"]);function Do(e){return e.toLowerCase().replace(/[^a-z0-9]+/gu,"")}function zo(e){for(let t of["type","kind"]){let n=e[t];if(typeof n=="string"){let r=n.toLowerCase();if(Wo.has(r))return n}}return null}function At(e,t=0){if(t>12)return"[ToolNet nested value omitted]";if(Array.isArray(e))return e.map(o=>At(o,t+1));if(!e||typeof e!="object")return e;let n=e,r=zo(n);if(r)return{type:r,omitted:"[private reasoning omitted]"};let s={};for(let[o,i]of Object.entries(n))Lo.has(Do(o))||(s[o]=At(i,t+1));return s}function qo(e){if(!e)return new Date().toISOString();let t=new Date(e);return Number.isNaN(t.getTime())?new Date().toISOString():t.toISOString()}function U(e){return e?.trim()||void 0}function kn(e,t={}){let n={...e.provenance??{}},r=U(e.source)??U(t.source)??U(n.source);return{...e,timestamp:qo(e.timestamp),source:r,turnId:U(e.turnId)??U(t.turnId),cwd:U(e.cwd)??U(t.cwd),data:At(e.data??{}),provenance:n}}import{closeSync as vn,existsSync as wp,fsyncSync as Bo,mkdirSync as Vo,openSync as wn,rmSync as bn,statSync as Jo,writeSync as Go}from"node:fs";import{join as Et}from"node:path";var Ho=12e4,Uo=80;function Yo(e){Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,e)}function xn(e){return Et(e,".toolnet","journal")}function Xo(e){return Et(xn(e),"events.jsonl")}function Qo(e){for(let t=0;t<Uo;t+=1)try{return wn(e,"wx",384)}catch(n){if(n.code!=="EEXIST")throw n;try{if(Date.now()-Jo(e).mtimeMs>Ho){bn(e,{force:!0});continue}}catch{}Yo(25)}throw new Error(`Shared project journal is locked: ${e}`)}function Cn(e,t){if(t.length===0)return;let n=xn(e);Vo(n,{recursive:!0,mode:448});let r=Xo(e),s=Et(n,"journal.lock"),o=Qo(s);try{let i=t.map(u=>JSON.stringify(u)).join(`
`)+`
`,a=wn(r,"a",384);try{Go(a,i,null,"utf8"),Bo(a)}finally{vn(a)}}finally{vn(o),bn(s,{force:!0})}}var si=12e4,oi=80,ii=2e3;function ai(e){Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,e)}var We=class{constructor(t,n={}){this.identity=t;this.eventContext=n;ti(t.localDirectory,{recursive:!0}),this.eventsFile=Mt(t.localDirectory,"events.jsonl"),this.stateFile=Mt(t.localDirectory,"state.json"),this.lockFile=Mt(t.localDirectory,"journal.lock")}identity;eventContext;eventsFile;stateFile;lockFile;initialState(){let t=new Date().toISOString();return{version:1,projectId:this.identity.projectId,agent:this.identity.agent,nativeSessionId:this.identity.nativeSessionId,status:"idle",createdAt:t,updatedAt:t,lastSequence:0,lastRemoteSequence:0,remoteByteOffset:0,sourceCursors:{},recentEventIds:[]}}loadStateUnsafe(){return gn(this.stateFile)??this.initialState()}loadState(){return this.withLock(()=>this.loadStateUnsafe())}saveStateUnsafe(t){R(this.stateFile,t)}acquireLock(){for(let t=0;t<oi;t+=1)try{return Ot(this.lockFile,"wx",384)}catch(n){if(n.code!=="EEXIST")throw n;try{if(Date.now()-In(this.lockFile).mtimeMs>si){jn(this.lockFile,{force:!0});continue}}catch{}ai(25)}throw new Error(`Session journal is locked: ${this.lockFile}`)}withLock(t){let n=this.acquireLock();try{return t()}finally{Pt(n),jn(this.lockFile,{force:!0})}}append(t){return t.length===0?[]:this.withLock(()=>{let n=this.loadStateUnsafe(),r=new Set(n.recentEventIds),s=n.lastSequence,o=[];for(let l of t){let m=kn(l,this.eventContext),d=m.timestamp??new Date().toISOString(),g=m.data??{},S=m.provenance?.rawDigest??v(fn(g)),h=m.sourceEventId?[this.identity.projectId,this.identity.agent,this.identity.nativeSessionId,m.sourceEventId].join("|"):[this.identity.projectId,this.identity.agent,this.identity.nativeSessionId,s+1,m.type,d,S].join("|"),y=v(h).slice(0,32);if(r.has(y))continue;s+=1;let k={version:1,id:y,sequence:s,projectId:this.identity.projectId,agent:this.identity.agent,nativeSessionId:this.identity.nativeSessionId,sessionId:this.identity.nativeSessionId,type:m.type,timestamp:d,source:m.source??m.provenance?.source??this.identity.agent,data:g,provenance:{...m.provenance,rawDigest:S}};m.role!==void 0&&(k.role=m.role),m.turnId!==void 0&&(k.turnId=m.turnId),m.cwd!==void 0&&(k.cwd=m.cwd),m.sourceEventId!==void 0&&(k.sourceEventId=m.sourceEventId),m.sourceSequence!==void 0&&(k.sourceSequence=m.sourceSequence),o.push(k),r.add(y)}if(o.length===0)return[];let i=o.map(l=>JSON.stringify(l)).join(`
`)+`
`,a=Ot(this.eventsFile,"a",384);try{ri(a,i,null,"utf8"),ei(a)}finally{Pt(a)}try{Cn(this.identity.projectRoot,o)}catch{}let u=o[o.length-1],c="active";u.type==="session_end"||u.type==="session_idle"?c="idle":u.type==="error"&&(c="error");let p=Array.from(r).slice(-ii);return this.saveStateUnsafe({...n,status:c,updatedAt:u.timestamp,lastLocalEventAt:u.timestamp,lastSequence:u.sequence,recentEventIds:p}),o})}readPending(){return this.withLock(()=>{let t=this.loadStateUnsafe();if(!Zo(this.eventsFile))return{events:[],startOffset:t.remoteByteOffset,endOffset:t.remoteByteOffset};let n=In(this.eventsFile).size,r=Math.min(t.remoteByteOffset,n);if(n<=r)return{events:[],startOffset:r,endOffset:n};let s=n-r,o=Buffer.alloc(s),i=Ot(this.eventsFile,"r");try{ni(i,o,0,s,r)}finally{Pt(i)}return{events:o.toString("utf8").split(`
`).filter(Boolean).map(c=>JSON.parse(c)),startOffset:r,endOffset:n}})}markRemote(t,n){this.withLock(()=>{let r=this.loadStateUnsafe(),s=new Date().toISOString();this.saveStateUnsafe({...r,lastRemoteSequence:Math.max(r.lastRemoteSequence,t),remoteByteOffset:Math.max(r.remoteByteOffset,n),lastRemoteAt:s,updatedAt:s})})}setSourceCursor(t,n){this.withLock(()=>{let r=this.loadStateUnsafe();this.saveStateUnsafe({...r,sourceCursors:{...r.sourceCursors,[t]:String(n)},updatedAt:new Date().toISOString()})})}};import{closeSync as Ua,existsSync as Ya,openSync as Xa,readSync as Qa,statSync as Za}from"node:fs";function An(e,t){let n=t.toLowerCase();return n.includes("kh\xF4ng \u0111\u01B0\u1EE3c")||n.includes("tuy\u1EC7t \u0111\u1ED1i")||n.includes("must not")||n.includes("never ")?"critical":e==="rule"||e==="decision"?"high":e==="todo"||n.includes("error")||n.includes("failed")||n.includes("exception")?"normal":"temporary"}var Mn=[/không được/iu,/tuyệt đối/iu,/bắt buộc/iu,/đừng\s+/iu,/must not/iu,/do not/iu,/don't/iu,/\bnever\b/iu],ci=[/từ giờ/iu,/về sau/iu,/mỗi lần/iu,/luôn luôn/iu,/\bluôn\b/iu,/quy tắc/iu,/workflow/iu,/\balways\b/iu,/\brequired\b/iu,/\bmust\b/iu,/from now on/iu],ui=[/\bchốt\b/iu,/quyết định/iu,/sẽ dùng/iu,/chọn .+ thay/iu,/đổi sang/iu,/chuyển sang/iu,/\bdecided\b/iu,/\bchosen\b/iu,/we will use/iu,/use .+ instead/iu,/switch(?:ed)? to/iu],li=[/\btodo\b/iu,/cần làm/iu,/cần thêm/iu,/cần sửa/iu,/cần kiểm tra/iu,/tiếp theo/iu,/bước tiếp theo/iu,/còn phải/iu,/còn cần/iu,/next step/iu,/\bneed to\b/iu,/\bremaining\b/iu,/follow[- ]?up/iu],di=[/đã sửa/iu,/đã fix/iu,/đã khắc phục/iu,/đã xử lý/iu,/hoàn tất/iu,/hoàn thành/iu,/\bfixed\b/iu,/\bresolved\b/iu,/\bimplemented\b/iu,/\bcompleted\b/iu,/\bpasses?\b/iu],En=[/kiến trúc/iu,/pipeline/iu,/adapter/iu,/schema/iu,/runtime/iu,/namespace/iu,/storage/iu,/lưu trữ/iu,/workflow/iu,/session core/iu,/memory engine/iu,/retrieval/iu],pi=[/\bdùng\b/iu,/\btách\b/iu,/\bthay\b/iu,/\bchuyển\b/iu,/\blưu\b/iu,/\bmap\b/iu,/\buse\b/iu,/\bsplit\b/iu,/\bstore\b/iu,/\breplace\b/iu,/\bmove\b/iu],mi=[/đường dẫn/iu,/\bpath\b/iu,/\bport\b/iu,/\bendpoint\b/iu,/\bdomain\b/iu,/\bbucket\b/iu,/\brepository\b/iu,/\brepo\b/iu,/\bbranch\b/iu,/\/[A-Za-z0-9._/-]{4,}/u],fi=[/\blà\b/iu,/\bở\b/iu,/\bdùng\b/iu,/\bnằm\b/iu,/\bis\b/iu,/\buse\b/iu,/located/iu,/runs on/iu],Pn=new Set(["content","text","message","prompt","summary","description","reason","title","last_assistant_message","lastAssistantMessage","input_messages","inputMessages"]),gi=new Set(["payload","data","content","message","messages","parts","summary"]);function N(e,t){return t.some(n=>n.test(e))}function Tn(e){return e.normalize("NFKC").replace(/\r/g,"").replace(/^[\s>*#\-•]+/u,"").replace(/\s+/g," ").trim()}function yi(e){return Tn(e).toLowerCase().replace(/[^\p{L}\p{N}:/._-]+/gu," ").replace(/\s+/g," ").trim()}function hi(e){return!(e.length<12||e.length>1e3||(e.match(new RegExp("\\p{L}","gu"))??[]).length<6||/^(?:https?:\/\/\S+|[A-Za-z0-9+/=]{80,})$/u.test(e))}function Tt(e,t,n,r=0){if(!(r>6)){if(typeof e=="string"){(!t||Pn.has(t))&&n.push(e);return}if(Array.isArray(e)){for(let s of e.slice(0,50))Tt(s,t,n,r+1);return}if(!(!e||typeof e!="object"))for(let[s,o]of Object.entries(e))(Pn.has(s)||gi.has(s))&&Tt(o,s,n,r+1)}}function Si(e){let t=[];Tt(e.data,void 0,t);let n=[],r=new Set;for(let s of t)for(let o of s.split(/\n+|(?<=[.!?])\s+/u)){let i=Tn(o);if(hi(i)&&!r.has(i)&&(r.add(i),n.push(i),n.length>=50))return n}return n}function On(e){return(e.role??(typeof e.data.role=="string"?e.data.role:"")).toLowerCase()}function ki(e,t,n){if(n.type==="decision")return{kind:"decision",confidence:1};if(n.type==="todo")return{kind:"todo",confidence:1};let r=t==="user"||n.type==="user_prompt",s=t==="assistant"||n.type==="assistant_message";return r&&N(e,Mn)?{kind:"rule",confidence:.98}:r&&N(e,ci)?{kind:"rule",confidence:.92}:N(e,ui)?{kind:N(e,En)?"architecture":"decision",confidence:r?.93:.86}:r&&N(e,li)?{kind:"todo",confidence:.87}:N(e,En)&&N(e,pi)?{kind:"architecture",confidence:r?.88:.82}:s&&N(e,di)?{kind:"fix",confidence:.8}:r&&N(e,mi)&&N(e,fi)?{kind:"context",confidence:.79}:null}function vi(e){switch(e){case"rule":return"rule";case"decision":case"architecture":return"decision";case"todo":return"todo";case"fix":case"context":return"code"}}function wi(e,t,n){return e==="rule"&&N(n,Mn)?"critical":e==="architecture"||e==="decision"||e==="rule"?"high":e==="fix"||e==="context"?"normal":An(t,n)}function Rn(e,t){let n=[],r=new Set,s=new Map;for(let o of t){let i=typeof o.data.messageId=="string"?o.data.messageId:void 0,a=On(o);i&&a&&s.set(i,a)}for(let o of t){let i=On(o),a=typeof o.data.messageId=="string"?o.data.messageId:void 0;!i&&a&&(i=s.get(a)??"");for(let u of Si(o)){let c=ki(u,i,o);if(!c||c.confidence<.75)continue;let p=vi(c.kind),l=yi(u),m=v([e.projectId,c.kind,l].join("|"));if(r.has(m))continue;r.add(m);let d=o.provenance.sourcePath?[o.provenance.sourcePath]:[],g=o.sourceEventId?[o.sourceEventId]:[];n.push({version:1,fingerprint:m,projectId:e.projectId,agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,kind:c.kind,type:p,content:u,confidence:c.confidence,importance:wi(c.kind,p,u),tags:[p],provenance:{agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,eventIds:[o.id],sourceEventIds:g,sourcePaths:d,firstSequence:o.sequence,lastSequence:o.sequence},createdAt:o.timestamp})}}return n}import{createHash as bi}from"node:crypto";var xi=["project-knowledge","implementation","continuation","session-context"],Ci={"project-knowledge":"Project knowledge",implementation:"Implementation state",continuation:"Work continuation","session-context":"Session context"};function Rt(e){return bi("sha256").update(e).digest("hex")}function De(e,t){return`${e}:${Rt(t).slice(0,24)}`}function ji(e){try{return Rt(JSON.stringify(e))}catch{return Rt(String(e))}}function Y(e){let t=new Set,n=[];for(let r of e){let s=r?.replace(/\s+/gu," ").trim();if(!s)continue;let o=s.normalize("NFKC").toLowerCase();t.has(o)||(t.add(o),n.push(s))}return n}function _n(e,t=420){let n=e.replace(/\s+/gu," ").trim();return n.length<=t?n:`${n.slice(0,Math.max(0,t-1)).trimEnd()}\u2026`}function Ii(e){return e==="rule"||e==="architecture"?"project-knowledge":e==="decision"||e==="fix"?"implementation":e==="todo"?"continuation":"session-context"}function Nn(e){return e.length===0?0:e.reduce((t,n)=>t+n,0)/e.length}function Ai(e){return e.slice().sort((t,n)=>n.importanceScore-t.importanceScore||n.confidence-t.confidence||t.id.localeCompare(n.id)).slice(0,5).map(t=>_n(t.content)).join(" | ")}function Ei(e){return e.slice().sort((t,n)=>n.importanceScore-t.importanceScore||n.confidence-t.confidence||t.id.localeCompare(n.id)).slice(0,6).map(t=>_n(t.content)).join(`
`)}function $n(e,t){let n=e.slice().sort((m,d)=>m.sequence-d.sequence||m.timestamp.localeCompare(d.timestamp)||m.id.localeCompare(d.id)),r=n.map(m=>({id:De("raw",[m.projectId,m.agent,m.nativeSessionId,m.id,String(m.sequence)].join("|")),level:"raw",eventId:m.id,sourceEventId:m.sourceEventId,sequence:m.sequence,type:m.type,role:m.role,timestamp:m.timestamp,sourcePath:m.provenance.sourcePath,payloadDigest:ji(m.data)})),s=new Map,o=new Map;n.forEach((m,d)=>{let g=r[d];g&&(s.set(m.id,g.id),m.sourceEventId&&o.set(m.sourceEventId,g.id))});let i=t.map(m=>{let d=Y([...m.provenance.eventIds.map(g=>s.get(g)),...m.provenance.sourceEventIds.map(g=>o.get(g))]);return{id:De("fact",m.fingerprint),level:"fact",fingerprint:m.fingerprint,kind:m.kind,type:m.type,content:m.content,knowledgeClass:m.knowledgeClass,importanceScore:m.importanceScore,confidence:m.confidence,tags:Y([...m.tags,"level:fact",`class:${m.knowledgeClass}`,`kind:${m.kind}`]),rawIds:d,sourcePaths:Y(m.provenance.sourcePaths)}}),a=new Map;for(let m of i){let d=Ii(m.kind),g=a.get(d)??[];g.push(m),a.set(d,g)}let u=[];for(let m of xi){let d=a.get(m);if(!d?.length)continue;let g=d.slice().sort((h,y)=>y.importanceScore-h.importanceScore||y.confidence-h.confidence||h.id.localeCompare(y.id)),S=g.map(h=>h.id);u.push({id:De("scene",`${m}|${S.join("|")}`),level:"scene",kind:m,title:Ci[m],summary:Ai(g),factIds:S,importanceScore:Math.max(...g.map(h=>h.importanceScore)),confidence:Nn(g.map(h=>h.confidence)),tags:Y(["level:scene",`scene:${m}`,...g.flatMap(h=>h.tags)]),sourcePaths:Y(g.flatMap(h=>h.sourcePaths))})}let c=new Map(i.map(m=>[m.id,m])),p=[];for(let m of u){let g=m.factIds.map(y=>c.get(y)).filter(y=>!!y).filter(y=>(y.knowledgeClass==="permanent"||y.knowledgeClass==="task")&&y.importanceScore>=.55);if(g.length===0)continue;let S=g.some(y=>y.knowledgeClass==="permanent")?"permanent":"task",h=Ei(g);p.push({id:De("knowledge",`${m.id}|${S}|${g.map(y=>y.id).join("|")}`),level:"knowledge",knowledgeClass:S,title:m.title,content:h,sceneIds:[m.id],factIds:g.map(y=>y.id),importanceScore:Math.max(...g.map(y=>y.importanceScore)),confidence:Nn(g.map(y=>y.confidence)),tags:Y(["level:knowledge",`class:${S}`,`scene:${m.kind}`,...g.flatMap(y=>y.tags)]),sourcePaths:Y(g.flatMap(y=>y.sourcePaths))})}let l=[];for(let m of i)for(let d of m.rawIds)l.push({from:d,to:m.id,type:"supports"});for(let m of u)for(let d of m.factIds)l.push({from:d,to:m.id,type:"belongs_to"});for(let m of p)for(let d of m.sceneIds)l.push({from:d,to:m.id,type:"promotes_to"});return{schema:"toolnet.memory-hierarchy.v1",version:1,raw:r,facts:i,scenes:u,knowledge:p,links:l,stats:{raw:r.length,facts:i.length,scenes:u.length,knowledge:p.length,links:l.length}}}function ze(e){return e?Math.ceil(e.length/3.5):0}function qe(e,t){if(!e)return"";if(ze(e)<=t)return e;let r=Math.floor(t*3.5),s=e.slice(0,r),o=s.lastIndexOf("."),i=s.lastIndexOf(`
`),a=Math.max(o,i);return a>r*.7?s.slice(0,a+1):s}function X(){let e=Te(),t=process.env.TOOLNET_SESSION_SAVE||"summary",n=process.env.TOOLNET_RAW_TRANSCRIPT==="on"||t==="archive"||t==="full",r=process.env.TOOLNET_MEMORY_PROMOTION||"conservative",s=parseFloat(process.env.TOOLNET_PROMOTE_MIN_SCORE||"0.65"),o=parseInt(process.env.TOOLNET_SESSION_SUMMARY_MAX_TOKENS||"700",10),i=parseInt(process.env.TOOLNET_DURABLE_MEMORY_MAX_ITEMS_PER_SESSION||"10",10),a=n,u=process.env.TOOLNET_RAW_TRANSCRIPT_REMOTE==="on"||t==="full";return{sessionSave:t,rawTranscript:n,memoryPromotion:r,promoteMinScore:s,sessionSummaryMaxTokens:o,durableMemoryMaxItemsPerSession:i,archiveLocal:a,archiveRemote:u}}function Kn(e){return(e||X()).rawTranscript}function Fn(e){return(e||X()).durableMemoryMaxItemsPerSession}function Ln(e){return(e||X()).sessionSummaryMaxTokens}function Wn(e){return(e||X()).archiveRemote}var Dn=new H;function zn(e){let t=e.trim();if(t.startsWith("{")&&t.endsWith("}")||t.startsWith("[")&&t.endsWith("]"))try{let r=JSON.parse(t);return JSON.stringify(Dn.sanitizeValue(r))}catch{}let n=Dn.sanitize(e).text;return n=n.replace(/("(?:api[_-]?key|token|secret|password|cookie|authorization)"\s*:\s*)"[^"]*"/gi,'$1"[REDACTED]"').replace(/('(?:api[_-]?key|token|secret|password|cookie|authorization)'\s*:\s*)'[^']*'/gi,"$1'[REDACTED]'").replace(/\b(api[_-]?key|token|secret|password|cookie|authorization)\b\s*[:=]\s*[^\s,;]+/gi,"$1=[REDACTED]").replace(/\bbearer\s+[A-Za-z0-9._~+/=-]+/gi,"Bearer [REDACTED]"),n}function Pi(e,t){let n=e.toLowerCase(),r=.5,s=["nh\u1EDB","remember","quy t\u1EAFc","rule","t\u1EEB gi\u1EDD","from now","kh\xF4ng \u0111\u01B0\u1EE3c","must not","lu\xF4n lu\xF4n","always","never","critical","important","blocker","deploy","production","architecture"];for(let i of s)n.includes(i)&&(r+=.15);t==="rule"||t==="architecture"||t==="blocker"?r+=.2:t==="decision"||t==="deploy"?r+=.15:(t==="fix"||t==="next_action")&&(r+=.1),e.length<20?r-=.3:e.length>500&&(r-=.1);let o=[/npm (notice|warn|ERR)/i,/\d+ packages? in \d+/i,/found \d+ vulnerabilities/i,/up to date/i,/added \d+ packages/i,/^(ok|done|success|error|warning)$/i];for(let i of o)i.test(e)&&(r-=.4);return Math.max(0,Math.min(1,r))}function Oi(e,t){let n=[],r=new Set;for(let i of e){let a=i.split(`
`).filter(u=>u.trim());for(let u of a){let c=u.trim();if(c.length<15)continue;let p=c.toLowerCase().replace(/\s+/g," ");if(r.has(p))continue;r.add(p);let l="decision";/\b(rule|quy tắc|policy|standard|convention)\b/i.test(c)||/\b(always|never|must|should|từ giờ|không được)\b/i.test(c)?l="rule":/\b(fix|fixed|bug|issue|error|lỗi)\b/i.test(c)?l="fix":/\b(blocker|blocked|stuck|cannot|không thể)\b/i.test(c)?l="blocker":/\b(next|todo|action|task|cần làm)\b/i.test(c)?l="next_action":/\b(deploy|release|publish|ship)\b/i.test(c)?l="deploy":/\b(architecture|design|structure|pattern)\b/i.test(c)?l="architecture":/\.(ts|js|py|go|rs|java|cpp|c|h)\b/i.test(c)&&(l="file");let m=Pi(c,l);if(m<.3)continue;let d=zn(c);n.push({category:l,text:d,importance:m,sourceSessionId:t})}}let s=X(),o=Fn(s);return n.sort((i,a)=>a.importance-i.importance).slice(0,o)}function Mi(e){let t=X(),n=Ln(t),o=e.join(`

`).split(`
`).filter(i=>{let a=i.trim();return a.length>20&&!a.startsWith("npm")&&!a.startsWith("\u2713")&&!a.startsWith("Error:")}).slice(0,20).map(i=>zn(i)).join(`
`);return qe(o,n)}function Be(e,t){let r=(Array.isArray(e)?e:e.split(`

`).filter(d=>d.trim())).map(d=>typeof d=="string"?d:JSON.stringify(d)).filter(d=>d.trim()),s=Oi(r,t),o=s.filter(d=>d.category==="decision").map(d=>d.text),i=s.filter(d=>d.category==="rule").map(d=>d.text),a=s.filter(d=>d.category==="file").map(d=>d.text),u=s.filter(d=>d.category==="fix").map(d=>d.text),c=s.filter(d=>d.category==="blocker").map(d=>d.text),p=s.filter(d=>d.category==="next_action").map(d=>d.text),l=s.filter(d=>d.category==="deploy").map(d=>d.text);return{summary:Mi(r),decisions:o,projectRules:i,filesChanged:a,bugsFixed:u,commands:l,blockers:c,nextActions:p,durableFacts:s}}function V(e){let t=new Set,n=[];for(let r of e){let s=r?.replace(/\s+/g," ").trim();if(!s)continue;let o=s.normalize("NFKC").toLowerCase();t.has(o)||(t.add(o),n.push(s))}return n}function Ti(e){let t=new Map;for(let n of e){if(!n||!n.id||!Number.isFinite(n.sequence))continue;let r=n.sourceEventId?`${n.agent}:${n.sourceEventId}`:n.id,s=t.get(r);(!s||n.sequence>s.sequence)&&t.set(r,n)}return[...t.values()].sort((n,r)=>n.sequence-r.sequence||n.timestamp.localeCompare(r.timestamp))}function Ri(e){switch(e){case"critical":return 1;case"high":return .85;case"normal":return .6;case"temporary":return .25}}function Ni(e){let t=Ri(e.importance);return Math.max(0,Math.min(1,t*.75+e.confidence*.25))}function _i(e){return e.importance==="temporary"||e.confidence<.78?"transient":e.kind==="rule"||e.kind==="architecture"?"permanent":e.kind==="decision"||e.kind==="todo"||e.kind==="fix"?"task":"session"}function $i(e){let t=e.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}_./:-]+/gu)??[],n=new Set;for(let r of t)if(!(r.length<2||/^\d+$/u.test(r))&&(n.add(r),n.size>=40))break;return[...n]}function Ki(e){let t=_i(e),n=Ni(e),r=$i(e.content);return{...e,knowledgeClass:t,importanceScore:n,retrievalTerms:r,tags:V([...e.tags,"level:fact",`class:${t}`,`kind:${e.kind}`])}}function Fi(e){return e.map(t=>{try{return JSON.stringify({type:t.type,role:t.role,data:t.data,provenance:{sourcePath:t.provenance.sourcePath,files:t.provenance.files}})}catch{return""}}).filter(Boolean)}function Li(e,t,n){let r=Be(Fi(t),e.nativeSessionId),s=n.filter(c=>c.kind==="todo").map(c=>c.content),o=n.flatMap(c=>c.provenance.sourcePaths),i=n.filter(c=>c.kind==="architecture").map(c=>c.content),a=V([...s,...r.nextActions]),u=V([...r.nextActions,...s]);return{summary:r.summary,state:{task:u[0]??a[0],decisions:V(r.decisions),files:V([...r.filesChanged,...o]),todos:a,completed:V(r.bugsFixed),blockers:V(r.blockers),nextActions:u,architecture:V(i)}}}function Ve(e,t){let n=Ti(t),r=Rn(e,n).map(Ki),s=r.filter(p=>p.knowledgeClass!=="transient").sort((p,l)=>l.importanceScore-p.importanceScore),{summary:o,state:i}=Li(e,n,s),a=s.map(p=>({fingerprint:p.fingerprint,kind:p.kind,knowledgeClass:p.knowledgeClass,importanceScore:p.importanceScore,content:p.content,terms:p.retrievalTerms})),u=$n(n,s),c=p=>r.filter(l=>l.knowledgeClass===p).length;return{version:2,normalizedEvents:n,summary:o,state:i,candidates:s,retrievalIndex:a,hierarchy:u,stats:{inputEvents:t.length,normalizedEvents:n.length,extractedCandidates:r.length,persistedCandidates:s.length,permanent:c("permanent"),task:c("task"),session:c("session"),transient:c("transient")}}}import{createHash as Wi}from"node:crypto";import{chmodSync as qn,existsSync as Di,mkdirSync as zi,readFileSync as qi,renameSync as Bi,writeFileSync as Bn}from"node:fs";import{dirname as Vn,join as Je}from"node:path";var $t="toolnet.context-offload.v1",Vi="toolnet.context-offload-asset.v1",Ji=256,Gi=new Set(["tool_call","tool_result","file_read","file_write","file_edit","command","test","artifact"]);function Jn(e){return Je(e,".toolnet","offload")}function Hi(e){return Je(Jn(e),"assets")}function Gn(e){return Je(Jn(e),"graph.json")}function Hn(e){zi(e,{recursive:!0,mode:448});try{qn(e,448)}catch{}}function Ui(e,t){Hn(Vn(e));let n=`${e}.${process.pid}.${Date.now()}.tmp`;Bn(n,t,{encoding:"utf8",mode:384}),Bi(n,e);try{qn(e,384)}catch{}}function _t(e){return Array.isArray(e)?e.map(_t):e&&typeof e=="object"?Object.fromEntries(Object.entries(e).sort(([t],[n])=>t.localeCompare(n)).map(([t,n])=>[t,_t(n)])):e}function Yi(e){return Wi("sha256").update(JSON.stringify(_t(e)),"utf8").digest("hex")}function Nt(){return{schema:$t,version:1,updatedAt:new Date(0).toISOString(),nodes:[]}}function Xi(e){let t=Gn(e);if(!Di(t))return Nt();try{let n=JSON.parse(qi(t,"utf8"));return n.schema!==$t||n.version!==1||!Array.isArray(n.nodes)?Nt():n}catch{return Nt()}}function Qi(e,t){Ui(Gn(e),JSON.stringify(t,null,2)+`
`)}function Zi(e,t=260){if(typeof e!="string")return null;let n=e.replace(/\s+/gu," ").trim();return n?n.slice(0,t):null}function ea(e){let t=[...e.provenance.files??[],e.provenance.sourcePath],n=[];for(let r of t){let s=Zi(r);if(!(!s||n.includes(s))&&(n.push(s),n.length===3))break}return n}function ta(e){return`${e.agent}:${e.sourceEventId??e.id}`.replace(/\s+/gu," ").trim().slice(0,120)}function na(e,t){Hn(Vn(e));try{return Bn(e,t,{encoding:"utf8",flag:"wx",mode:384}),!0}catch(n){if(n.code==="EEXIST")return!1;throw n}}function ra(e,t){let n=e.nodes.find(s=>s.id===t.id),r=n?{...n,kind:t.kind,bytes:t.bytes,sourceRefs:Array.from(new Set([...n.sourceRefs,...t.sourceRefs])).slice(-8),files:Array.from(new Set([...n.files,...t.files])).slice(0,6)}:t;return{schema:$t,version:1,updatedAt:new Date().toISOString(),nodes:[...e.nodes.filter(s=>s.id!==t.id),r].slice(-Ji)}}function Un(e,t){let n=Xi(e),r=0,s=0,o=0,i=[];for(let a of t){if(!Gi.has(a.type))continue;r+=1;let u=Yi({type:a.type,data:a.data}),c={schema:Vi,version:1,assetId:u,event:{type:a.type,agent:a.agent,nativeSessionId:a.nativeSessionId,timestamp:a.timestamp,sourceEventId:a.sourceEventId,provenance:a.provenance,data:a.data}},p=JSON.stringify(c,null,2)+`
`;na(Je(Hi(e),`${u}.json`),p)?s+=1:o+=1,i.push(u),n=ra(n,{id:u,kind:a.type,bytes:Buffer.byteLength(p,"utf8"),createdAt:a.timestamp,sourceRefs:[ta(a)],files:ea(a)})}return r>0&&Qi(e,n),{eligible:r,written:s,deduped:o,graphNodes:n.nodes.length,assetIds:i}}import{createHash as da}from"node:crypto";import{existsSync as pa,readdirSync as ma,readFileSync as fa}from"node:fs";import{basename as ga,join as pr}from"node:path";import{randomUUID as Qn}from"node:crypto";var A=class extends Error{constructor(n,r){super(n);this.statusCode=r}statusCode};function Se(e){let t=new Set,n=[];for(let r of e){let s=r.replace(/\s+/gu," ").trim();if(!s)continue;let o=s.normalize("NFKC").toLowerCase();t.has(o)||(t.add(o),n.push(s))}return n}function Z(e){let t=e.normalize("NFKD").replace(/[\u0300-\u036f]/gu,"").toLowerCase().replace(/[^a-z0-9]+/gu,"-").replace(/^-+|-+$/gu,"").slice(0,120);if(!t)throw new A("Invalid Wiki slug",400);return t}function Yn(e){let t=[];for(let n of e.matchAll(/\[\[([^\[\]]+)\]\]/gu)){let r=n[1]?.trim();r&&t.push(Z(r))}return Se(t)}function sa(e){return e.normalize("NFKC").toLowerCase().split(/[^\p{L}\p{N}_-]+/u).map(t=>t.trim()).filter(t=>t.length>=2)}function Xn(e){return{id:`revision-${Qn()}`,pageId:e.id,slug:e.slug,revision:e.revision,title:e.title,...e.summary?{summary:e.summary}:{},content:e.content,tags:[...e.tags],links:[...e.links],createdAt:e.updatedAt}}function Q(e){return structuredClone(e)}var Ge=class{constructor(t){this.store=t}store;state;queue=Promise.resolve();async initialize(){await this.ensureState()}async ensureState(){return this.state||(this.state=await this.store.load()),this.state}async mutate(t){let n,r=this.queue.then(async()=>{let s=await this.ensureState();n=t(s),s.updatedAt=new Date().toISOString(),await this.store.save(s)});return this.queue=r.then(()=>{},()=>{}),await r,n}async summary(){let t=await this.ensureState(),n=new Set(t.pages.flatMap(r=>r.links));return{schema:"toolnet.wiki-summary.v1",projectId:t.projectId,pages:t.pages.length,revisions:t.revisions.length,tags:Se(t.pages.flatMap(r=>r.tags)).sort((r,s)=>r.localeCompare(s)),links:t.pages.reduce((r,s)=>r+s.links.length,0),orphanPages:t.pages.filter(r=>r.links.length===0&&!n.has(r.slug)).length,automatedPages:t.pages.filter(r=>r.tags.some(s=>s.startsWith("toolnet-auto-"))).length,updatedAt:t.updatedAt}}async listPages(){let t=await this.ensureState();return Q([...t.pages].sort((n,r)=>n.title.localeCompare(r.title)))}async getPage(t){let n=await this.ensureState(),r=Z(t),s=n.pages.find(o=>o.slug===r||o.id===t);if(!s)throw new A(`Wiki page not found: ${t}`,404);return Q(s)}async createPage(t){return this.mutate(n=>{let r=t.title.trim(),s=t.content.trim();if(!r)throw new A("Wiki title is required",400);let o=Z(t.slug??r);if(n.pages.some(u=>u.slug===o))throw new A(`Wiki page already exists: ${o}`,409);let i=new Date().toISOString(),a={id:`wiki-${Qn()}`,slug:o,title:r,...t.summary?.trim()?{summary:t.summary.trim()}:{},content:s,tags:Se(t.tags??[]),links:Yn(s),revision:1,createdAt:i,updatedAt:i};return n.pages.push(a),n.revisions.push(Xn(a)),Q(a)})}async updatePage(t,n){return this.mutate(r=>{let s=Z(t),o=r.pages.find(i=>i.slug===s||i.id===t);if(!o)throw new A(`Wiki page not found: ${t}`,404);if(n.title!==void 0){let i=n.title.trim();if(!i)throw new A("Wiki title is required",400);o.title=i}if(n.summary!==void 0){let i=n.summary.trim();i?o.summary=i:delete o.summary}return n.content!==void 0&&(o.content=n.content.trim(),o.links=Yn(o.content)),n.tags!==void 0&&(o.tags=Se(n.tags)),o.revision+=1,o.updatedAt=new Date().toISOString(),r.revisions.push(Xn(o)),Q(o)})}async history(t){let n=await this.getPage(t),r=await this.ensureState();return Q(r.revisions.filter(s=>s.pageId===n.id).sort((s,o)=>o.revision-s.revision))}async backlinks(t){let n=await this.getPage(t),r=await this.ensureState();return Q(r.pages.filter(s=>s.links.includes(n.slug)).sort((s,o)=>s.title.localeCompare(o.title)))}async search(t,n=10){let r=await this.ensureState(),s=Se(sa(t));if(s.length===0)return[];let o=Math.max(1,Math.min(20,Math.floor(n))),i=[];for(let a of r.pages){let u=a.title.toLowerCase(),c=a.slug.toLowerCase(),p=a.summary?.toLowerCase()??"",l=a.content.toLowerCase(),m=a.tags.map(g=>g.toLowerCase()),d=0;for(let g of s)c===g&&(d+=12),u===g&&(d+=10),u.includes(g)&&(d+=6),c.includes(g)&&(d+=5),m.some(S=>S===g)?d+=5:m.some(S=>S.includes(g))&&(d+=3),p.includes(g)&&(d+=2),l.includes(g)&&(d+=1);d>0&&i.push({page:Q(a),score:d})}return i.sort((a,u)=>u.score-a.score||u.page.updatedAt.localeCompare(a.page.updatedAt)).slice(0,o)}};var Zn="wiki/state.v1.json";function oa(e){let t=new Date().toISOString();return{schema:"toolnet.wiki.v1",version:1,projectId:e.id,pages:[],revisions:[],createdAt:t,updatedAt:t}}function ia(e,t){let n=JSON.parse(e);if(n.schema!=="toolnet.wiki.v1"||n.version!==1||n.projectId!==t.id||!Array.isArray(n.pages)||!Array.isArray(n.revisions))throw new Error("Invalid ToolNet Wiki state");return n}var He=class{constructor(t,n){this.storage=t;this.project=n}storage;project;async load(){let t=await this.storage.getText(Zn);if(!t){let n=oa(this.project);return await this.save(n),n}return ia(t,this.project)}async save(t){await this.storage.put(Zn,JSON.stringify(t,null,2),"application/json")}};import{createHash as aa,randomUUID as er}from"node:crypto";var tr="wiki/governance.v1.json",or="toolnet.knowledge-governance.v1",nr=500,ke={autoApproveThreshold:.86,criticalApproveThreshold:.94,staleAfterDays:90};function ca(e,t=0,n=1){return Math.max(t,Math.min(n,e))}function Kt(e){return e.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/gu," ").trim()}function rr(e){return aa("sha256").update(e.normalize("NFKC").replace(/\s+/gu," ").trim()).digest("hex")}function ua(e){let t=[e.title,e.summary??"",e.content.slice(0,2e3),...e.tags].join(" ").toLowerCase();return/\b(?:architecture|security|authentication|authorization|auth|database|production|deploy|deployment|payment|billing|permission|permissions|acl|credential|secret|migration)\b/u.test(t)}function la(e){let t=e.sourceType==="skill"?.96:e.sourceType==="memory"?.94:.88,n=e.tags.map(r=>r.toLowerCase());return(n.includes("permanent")||n.includes("task"))&&(t+=.03),e.content.length>=200&&(t+=.02),e.content.length<80&&(t-=.05),e.title.length<4&&(t-=.05),ca(t)}function sr(e){let t=new Date().toISOString();return{schema:or,version:1,projectId:e,policy:{...ke},reviews:[],audit:[],createdAt:t,updatedAt:t}}function ir(e){let t=e.autoApproveThreshold??ke.autoApproveThreshold,n=e.criticalApproveThreshold??ke.criticalApproveThreshold,r=e.staleAfterDays??ke.staleAfterDays;if(!Number.isFinite(t)||t<.5||t>1)throw new A("Invalid autoApproveThreshold",400);if(!Number.isFinite(n)||n<.5||n>1)throw new A("Invalid criticalApproveThreshold",400);if(!Number.isInteger(r)||r<1||r>3650)throw new A("Invalid staleAfterDays",400);return{autoApproveThreshold:t,criticalApproveThreshold:n,staleAfterDays:r}}var Ue=class{constructor(t,n){this.storage=t;this.project=n}storage;project;async load(){let t=await this.storage.getText(tr);if(!t){let n=sr(this.project.id);return await this.save(n),n}try{let n=JSON.parse(t);if(n.schema!==or||n.version!==1||n.projectId!==this.project.id||!Array.isArray(n.reviews)||!Array.isArray(n.audit))throw new Error("invalid");return{...n,policy:ir(n.policy??ke)}}catch{let n=sr(this.project.id);return await this.save(n),n}}async save(t){await this.storage.put(tr,JSON.stringify(t,null,2),"application/json")}},Ye=class{constructor(t){this.store=t}store;state;queue=Promise.resolve();async initialize(){await this.ensureState()}async ensureState(){return this.state||(this.state=await this.store.load()),this.state}audit(t,n,r,s={}){t.audit.push({id:er(),action:n,principal:r,...s.reviewId?{reviewId:s.reviewId}:{},...s.sourceKey?{sourceKey:s.sourceKey}:{},timestamp:new Date().toISOString(),...s.metadata?{metadata:s.metadata}:{}}),t.audit.length>nr&&(t.audit=t.audit.slice(-nr))}async mutate(t){let n,r=this.queue.then(async()=>{let s=await this.ensureState();n=await t(s),s.updatedAt=new Date().toISOString(),await this.store.save(s)});return this.queue=r.then(()=>{},()=>{}),await r,n}async policy(){return{...(await this.ensureState()).policy}}async setPolicy(t,n){return this.mutate(r=>(r.policy=ir({...r.policy,...t}),this.audit(r,"policy:update",n,{metadata:{...r.policy}}),{...r.policy}))}async summary(){let t=await this.ensureState(),n=r=>t.reviews.filter(s=>s.status===r).length;return{schema:"toolnet.knowledge-governance-summary.v1",projectId:t.projectId,pending:n("pending"),approved:n("approved"),rejected:n("rejected"),superseded:n("superseded"),criticalPending:t.reviews.filter(r=>r.status==="pending"&&r.risk==="critical").length,conflictPending:t.reviews.filter(r=>r.status==="pending"&&r.risk==="conflict").length,auditEvents:t.audit.length,policy:{...t.policy},updatedAt:t.updatedAt}}async listReviews(t){let n=await this.ensureState();return structuredClone(n.reviews.filter(r=>!t||r.status===t).sort((r,s)=>s.updatedAt.localeCompare(r.updatedAt)))}async auditLog(t=100){let n=await this.ensureState(),r=Math.max(1,Math.min(500,Math.floor(t)));return structuredClone(n.audit.slice(-r).reverse())}async assess(t,n){let r=await this.ensureState(),s=la(t),o=Kt(t.title),i=n.filter(p=>p.slug!==t.slug&&Kt(p.title)===o&&rr(p.content)!==rr(t.content)).map(p=>p.slug),a=ua(t),u=[];s<r.policy.autoApproveThreshold&&u.push(`confidence:${s.toFixed(2)}`),a&&s<r.policy.criticalApproveThreshold&&u.push("critical-knowledge"),i.length>0&&u.push("conflicting-knowledge");let c=i.length>0?"conflict":a?"critical":"normal";return{confidence:s,risk:c,requiresReview:i.length>0||s<r.policy.autoApproveThreshold||a&&s<r.policy.criticalApproveThreshold,reasons:u,conflicts:i}}async gate(t,n){let r=await this.assess(t,n);return this.mutate(s=>{let o=s.reviews.find(u=>u.sourceKey===t.sourceKey&&u.digest===t.digest);if(o?.status==="approved")return{allowed:!0,mode:"review-approved",assessment:r,review:structuredClone(o)};if(o?.status==="rejected")return{allowed:!1,mode:"rejected",assessment:r,review:structuredClone(o)};if(!r.requiresReview)return this.audit(s,"knowledge:auto-approved","system",{sourceKey:t.sourceKey,metadata:{confidence:r.confidence,risk:r.risk}}),{allowed:!0,mode:"auto-approved",assessment:r};if(o?.status==="pending")return{allowed:!1,mode:"pending-review",assessment:r,review:structuredClone(o)};let i=new Date().toISOString(),a={id:er(),sourceKey:t.sourceKey,sourceType:t.sourceType,slug:t.slug,marker:t.marker,digest:t.digest,title:t.title,...t.summary?{summary:t.summary}:{},content:t.content,tags:[...new Set([...t.tags,t.marker])],confidence:r.confidence,risk:r.risk,reasons:[...r.reasons],conflicts:[...r.conflicts],status:"pending",createdAt:i,updatedAt:i};return s.reviews.push(a),this.audit(s,"knowledge:review-requested","system",{reviewId:a.id,sourceKey:a.sourceKey,metadata:{confidence:a.confidence,risk:a.risk}}),{allowed:!1,mode:"pending-review",assessment:r,review:structuredClone(a)}})}async markApplied(t,n){await this.mutate(r=>{let s=r.reviews.find(o=>o.sourceKey===t&&o.digest===n&&o.status==="approved");s&&(s.appliedAt=new Date().toISOString(),s.updatedAt=s.appliedAt,this.audit(r,"knowledge:applied",s.reviewedBy??"system",{reviewId:s.id,sourceKey:t}))})}async decide(t,n,r){return this.mutate(async s=>{let o=s.reviews.find(c=>c.id===t);if(!o)throw new A(`Governance review not found: ${t}`,404);if(o.status!=="pending")throw new A("Governance review is already resolved",409);let i=new Date().toISOString();if(o.reviewedAt=i,o.reviewedBy=n.principal,o.updatedAt=i,n.note?.trim()&&(o.reviewNote=n.note.trim()),n.action==="reject")return o.status="rejected",this.audit(s,"knowledge:rejected",n.principal,{reviewId:t,sourceKey:o.sourceKey}),structuredClone(o);if(n.action==="supersede")return o.status="superseded",n.targetReviewId&&(o.supersededBy=n.targetReviewId),this.audit(s,"knowledge:superseded",n.principal,{reviewId:t,sourceKey:o.sourceKey,metadata:{targetReviewId:n.targetReviewId}}),structuredClone(o);if(n.action==="merge"){if(!n.targetReviewId)throw new A("targetReviewId is required for merge",400);let c=s.reviews.find(p=>p.id===n.targetReviewId);if(!c)throw new A("Merge target review not found",404);return o.status="superseded",o.mergedInto=c.id,this.audit(s,"knowledge:merged",n.principal,{reviewId:t,sourceKey:o.sourceKey,metadata:{targetReviewId:c.id}}),structuredClone(o)}o.status="approved";let u=(await r.listPages()).find(c=>c.slug===o.slug);if(u&&!u.tags.includes(o.marker))throw new A(`Wiki page '${o.slug}' is manually managed`,409);return u?await r.updatePage(o.slug,{title:o.title,summary:o.summary??"",content:o.content,tags:o.tags}):await r.createPage({slug:o.slug,title:o.title,...o.summary?{summary:o.summary}:{},content:o.content,tags:o.tags}),o.appliedAt=i,this.audit(s,"knowledge:approved",n.principal,{reviewId:t,sourceKey:o.sourceKey}),structuredClone(o)})}async quality(t){let n=await this.ensureState(),r=await t.listPages(),s=Date.now(),o=n.policy.staleAfterDays*864e5,i=r.map(p=>{let l=s-Date.parse(p.updatedAt);return{slug:p.slug,title:p.title,updatedAt:p.updatedAt,ageDays:Math.max(0,Math.floor(l/864e5)),stale:Number.isFinite(l)&&l>o}}).filter(p=>p.stale).map(({stale:p,...l})=>l),a=new Map;for(let p of r){let l=Kt(p.title),m=a.get(l)??[];m.push(p),a.set(l,m)}let u=[...a.entries()].filter(([,p])=>p.length>1).map(([p,l])=>({title:p,pages:l.map(m=>m.slug)})),c=n.reviews.filter(p=>p.status==="pending");return{schema:"toolnet.knowledge-quality.v1",totalPages:r.length,automatedPages:r.filter(p=>p.tags.some(l=>l.startsWith("toolnet-auto-"))).length,manualPages:r.filter(p=>!p.tags.some(l=>l.startsWith("toolnet-auto-"))).length,stalePages:i,duplicateTitles:u,pendingReviews:c.length,lowConfidenceReviews:c.filter(p=>p.confidence<n.policy.autoApproveThreshold).length,conflicts:c.filter(p=>p.risk==="conflict").length,generatedAt:new Date().toISOString()}}};var mr="wiki/automation.v1.json",fr="toolnet.wiki-automation.v1",Wt=8e3,ar=new Set(["raw","rawtext","raw_text","rawtranscript","raw_transcript","transcript","messages","message","payload","prompt","response","assistantmessage","assistant_message","userprompt","user_prompt"]);function we(e){return da("sha256").update(JSON.stringify(e)).digest("hex")}function ve(e){if(!(!e||typeof e!="object"||Array.isArray(e)))return e}function cr(e){return Array.isArray(e)?e:[]}function gr(e){return typeof e!="string"?void 0:e.replace(/\s+/gu," ").trim()||void 0}function Ft(e){return Array.isArray(e)?e.map(gr).filter(t=>!!t):[]}function K(e,t){for(let n of t){let r=gr(e[n]);if(r)return r}}function be(e){let t=new Set,n=[];for(let r of e){let s=r.replace(/\s+/gu," ").trim();if(!s)continue;let o=s.normalize("NFKC").toLowerCase();t.has(o)||(t.add(o),n.push(s))}return n}function Xe(e,t=0,n=""){if(t>3)return[];let r=n.replace(/[^a-z0-9]/giu,"").toLowerCase();if(ar.has(r))return[];if(typeof e=="string"){let i=e.replace(/\s+/gu," ").trim();return i.length<8?[]:[i]}if(Array.isArray(e))return e.flatMap(i=>Xe(i,t+1,n));let s=ve(e);if(!s)return[];let o=[];for(let[i,a]of Object.entries(s)){let u=i.replace(/[^a-z0-9]/giu,"").toLowerCase();ar.has(u)||o.push(...Xe(a,t+1,i))}return o}function ur(e){let n=be(["content","summary","text","value","statement","description","decision","task","knowledge","context","outcome","reason","rationale"].flatMap(s=>Xe(e[s],0,s)));return(n.length>0?n:be(Xe(e))).join(`

`).slice(0,Wt)}function lr(e,t){return K(e,["id","key","fingerprint","knowledgeId","sceneId"])??t}function dr(e,t){return K(e,["title","name","topic","label","task","kind","type"])??t}function ya(e){return(K(e,["knowledgeClass","class","classification","scope"])??"").toLowerCase()}function ha(e){return(K(e,["kind","sceneKind","type"])??"").toLowerCase()}function Sa(e){let t=ve(e);if(!t)return[];let n=[],r=cr(t.knowledge);for(let[o,i]of r.entries()){let a=ve(i);if(!a)continue;let u=ya(a);if(u==="session"||u==="transient")continue;let c=ur(a);if(c.length<20)continue;let p=lr(a,we(a).slice(0,16)),l=dr(a,`Durable Memory ${o+1}`);n.push({sourceKey:`memory:${p}`,sourceType:"memory",title:l,summary:K(a,["summary","description"]),content:c,tags:be(["toolnet","auto","memory",...u?[u]:[]])})}let s=cr(t.scenes);for(let[o,i]of s.entries()){let a=ve(i);if(!a)continue;let u=ha(a);if(u==="session-context")continue;let c=ur(a);if(c.length<20)continue;let p=lr(a,we(a).slice(0,16)),l=dr(a,`Knowledge Scene ${o+1}`);n.push({sourceKey:`scene:${p}`,sourceType:"scene",title:l,summary:K(a,["summary","description"]),content:c,tags:be(["toolnet","auto","scene",...u?[u]:[]])})}return n}function ka(e){return pr(e,".toolnet","memory","skills")}function va(e){let t=ka(e);if(!pa(t))return{candidates:[],failed:0};let n=[],r=0,s=ma(t).filter(o=>o.endsWith(".json")).sort();for(let o of s)try{let i=JSON.parse(fa(pr(t,o),"utf8")),a=ve(i);if(!a||a.schema!=="toolnet.skill-memory.v1")continue;let u=K(a,["id","fingerprint"])??ga(o,".json"),c=K(a,["task"])??"",p=K(a,["title"])||c||`Reusable Skill ${u.slice(0,8)}`,l=K(a,["summary"])??void 0,m=Ft(a.steps),d=Ft(a.verification),g=Ft(a.files),S=[];c&&S.push(`## Task
${c}`),l&&S.push(`## Summary
${l}`),m.length>0&&S.push(`## Procedure
${m.map((y,k)=>`${k+1}. ${y}`).join(`
`)}`),d.length>0&&S.push(`## Verification
${d.map(y=>`- ${y}`).join(`
`)}`),g.length>0&&S.push(`## Relevant Files
${g.map(y=>`- \`${y}\``).join(`
`)}`);let h=S.join(`

`).slice(0,Wt);if(h.length<20)continue;n.push({sourceKey:`skill:${u}`,sourceType:"skill",title:p,summary:l,content:h,tags:["toolnet","auto","skill","sop"]})}catch{r+=1}return{candidates:n,failed:r}}function Lt(e){let t=new Date().toISOString();return{schema:fr,version:1,projectId:e,entries:[],createdAt:t,updatedAt:t}}async function wa(e,t){let n=await e.getText(mr);if(!n)return Lt(t);try{let r=JSON.parse(n);return r.schema!==fr||r.version!==1||r.projectId!==t||!Array.isArray(r.entries)?Lt(t):r}catch{return Lt(t)}}async function ba(e,t){await e.put(mr,JSON.stringify(t,null,2),"application/json")}function xa(e){return`toolnet-auto-${we(e).slice(0,12)}`}function Ca(e){let t=Z(e.title).slice(0,72),n=we(e.sourceKey).slice(0,10);return Z(`auto-${e.sourceType}-${t}-${n}`)}function ja(e){return[`> Auto-generated by ToolNet Knowledge Automation from ${e.sourceType==="skill"?"reusable Skill Memory":e.sourceType==="scene"?"semantic memory scene":"durable memory"}.`,"",e.content].join(`
`).slice(0,Wt)}function Ia(e){return we({sourceType:e.sourceType,title:e.title,summary:e.summary,content:e.content,tags:e.tags})}function Aa(e,t){return e.tags.includes(t)}async function yr(e){let t=Sa(e.hierarchy),n=va(e.project.rootPath),r=new Map;for(let d of[...t,...n.candidates])r.set(d.sourceKey,d);let s=[...r.values()].sort((d,g)=>d.sourceKey.localeCompare(g.sourceKey)),o={schema:"toolnet.wiki-automation-result.v1",scanned:t.length+n.candidates.length,eligible:s.length,created:0,updated:0,unchanged:0,skipped:0,failed:n.failed,reviewPending:0,autoApproved:0,reviewApproved:0,pages:[]},i=new Ge(new He(e.storage,e.project));await i.initialize();let a=new Ye(new Ue(e.storage,e.project));await a.initialize();let u=await wa(e.storage,e.project.id),c=await i.listPages(),p=new Map(c.map(d=>[d.slug,d])),l=new Map(u.entries.map(d=>[d.sourceKey,d]));for(let d of s)try{let g=xa(d.sourceKey),S=Ia(d),h=l.get(d.sourceKey),y=h?.slug??Ca(d),k=p.get(y);if(k&&!Aa(k,g)){o.skipped+=1;continue}let I=be([...d.tags,g]),M=ja(d),O=await a.gate({sourceKey:d.sourceKey,sourceType:d.sourceType,slug:y,marker:g,digest:S,title:d.title,...d.summary?{summary:d.summary}:{},content:M,tags:I},[...p.values()]);if(!O.allowed){O.mode==="pending-review"?o.reviewPending+=1:o.skipped+=1;continue}O.mode==="auto-approved"?o.autoApproved+=1:O.mode==="review-approved"&&(o.reviewApproved+=1),k?h?.digest!==S?(k=await i.updatePage(y,{title:d.title,summary:d.summary??"",content:M,tags:I}),p.set(k.slug,k),o.updated+=1,o.pages.push({sourceKey:d.sourceKey,sourceType:d.sourceType,slug:k.slug,action:"updated"})):(o.unchanged+=1,o.pages.push({sourceKey:d.sourceKey,sourceType:d.sourceType,slug:y,action:"unchanged"})):(k=await i.createPage({slug:y,title:d.title,summary:d.summary,content:M,tags:I}),p.set(k.slug,k),o.created+=1,o.pages.push({sourceKey:d.sourceKey,sourceType:d.sourceType,slug:k.slug,action:"created"}));let T=new Date().toISOString(),C={sourceKey:d.sourceKey,sourceType:d.sourceType,slug:y,digest:S,marker:g,updatedAt:T},w=u.entries.findIndex(D=>D.sourceKey===d.sourceKey);w>=0?u.entries[w]=C:u.entries.push(C),l.set(d.sourceKey,C),await a.markApplied(d.sourceKey,S)}catch(g){if(g instanceof A&&g.statusCode===409){o.skipped+=1;continue}o.failed+=1}let m=new Date().toISOString();return u.updatedAt=m,u.lastRunAt=m,u.entries.sort((d,g)=>d.sourceKey.localeCompare(g.sourceKey)),await ba(e.storage,u),o}import{createHash as Ea}from"node:crypto";import{chmodSync as Sr,existsSync as Pa,mkdirSync as Oa,readFileSync as ym,readdirSync as hm,renameSync as Ma,statSync as Sm,writeFileSync as Ta}from"node:fs";import{join as kr}from"node:path";var Ra="toolnet.skill-memory.v1",hr=5,Na=16,_a=24,$a=32;function Ka(e){return Ea("sha256").update(e).digest("hex")}function Ce(e,t=Number.MAX_SAFE_INTEGER){let n=new Set,r=[];for(let s of e){let o=s.replace(/\s+/gu," ").trim();if(!o)continue;let i=o.normalize("NFKC").toLowerCase();if(!n.has(i)&&(n.add(i),r.push(o),r.length>=t))break}return r}function Dt(e,t=360){let n=e.replace(/\s+/gu," ").trim();return n.length<=t?n:n.slice(0,Math.max(0,t-1)).trimEnd()+"\u2026"}function Fa(e){return e.replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/giu,"Bearer [REDACTED]").replace(/\bsk-[A-Za-z0-9_-]{8,}\b/gu,"[REDACTED]").replace(/\b(api[_-]?key|token|password|passwd|secret)\b(\s*[:=]\s*)(["']?)[^\s"'`]+/giu,"$1$2[REDACTED]")}function q(e,t=360){return e&&Dt(Fa(e),t)||void 0}function je(e,t){for(let n of t){let r=e[n];if(typeof r=="string"&&r.trim())return r}}function vr(e,t){for(let n of t){let r=e[n];if(typeof r=="number"&&Number.isFinite(r))return r;if(typeof r=="string"&&r.trim()&&Number.isFinite(Number(r)))return Number(r)}}function wr(e,t){for(let n of t){let r=e[n];if(typeof r=="boolean")return r;if(typeof r=="string"){let s=r.trim().toLowerCase();if(["true","yes","pass","passed","success","succeeded","ok"].includes(s))return!0;if(["false","no","fail","failed","error"].includes(s))return!1}}}function br(e){let t=e.data??{};if(wr(t,["passed","pass","success","succeeded","ok"])===!1)return!0;let r=vr(t,["exitCode","exit_code","code","statusCode"]);if(r!==void 0&&r!==0)return!0;let s=je(t,["status","result","outcome"]);return!!(s&&/\b(fail(?:ed)?|error|broken|cancelled)\b/iu.test(s))}function xe(e){let t=e.data??{};if(br(e))return!1;if(wr(t,["passed","pass","success","succeeded","ok"])===!0||vr(t,["exitCode","exit_code","code","statusCode"])===0)return!0;let s=je(t,["status","result","outcome"]);return s&&/\b(pass(?:ed)?|success(?:ful)?|succeeded|ok|green|complete(?:d)?)\b/iu.test(s)?!0:e.type==="commit"||e.type==="deploy"}function xr(e){let t=e.data??{},n=je(t,["path","file","filePath","filename","target"]);if(n)return q(n,260);let r=e.provenance?.files;return q(r?.[0],260)}function zt(e){return q(je(e.data??{},["command","cmd","script"]),420)}function se(e){return q(je(e.data??{},["name","test","suite","title","message","text","result","status"]),300)}function La(e){let t=[];for(let n of[...e].sort((r,s)=>r.sequence-s.sequence))if(xe(n)){if(n.type==="test"){let r=se(n)??zt(n)??"Tests passed";t.push(`Test passed: ${r}`);continue}if(n.type==="commit"){let r=se(n);t.push(r?`Commit: ${r}`:"Commit completed");continue}if(n.type==="deploy"){let r=se(n);t.push(r?`Deploy: ${r}`:"Deployment completed")}}return Ce(t,10)}function Wa(e,t){let n=[];for(let r of[...e].sort((s,o)=>s.sequence-o.sequence))switch(r.type){case"file_write":case"file_edit":{let s=xr(r);s&&n.push(`Update ${s}`);break}case"command":{if(br(r))break;let s=zt(r);s&&n.push(`Run: ${s}`);break}case"test":{if(!xe(r))break;let s=se(r)??zt(r)??"project tests";n.push(`Verify: ${s}`);break}case"commit":{if(!xe(r))break;let s=se(r);n.push(s?`Commit: ${s}`:"Commit verified changes");break}case"deploy":{if(!xe(r))break;let s=se(r);n.push(s?`Deploy: ${s}`:"Deploy verified build");break}default:break}if(n.length===0)for(let r of t.files.slice(0,8)){let s=q(r,260);s&&n.push(`Update ${s}`)}return Ce(n,Na)}function Da(e,t){let n=[...t.files];for(let r of e){let s=xr(r);s&&n.push(s);for(let o of r.provenance?.files??[]){let i=q(o,260);i&&n.push(i)}}return Ce(n,_a)}function za(e){return Ce(e.filter(t=>["file_write","file_edit","command","test","commit","deploy"].includes(t.type)).map(t=>t.id),$a)}function qa(e){return e.map(n=>n.timestamp).filter(Boolean).sort().at(-1)??new Date(0).toISOString()}function Cr(e,t,n){if(t.length===0)return[];let r=La(t),s=Ce(n.completed.map(g=>q(g,280)??""),hr);if(!(s.length>0||t.some(g=>["test","commit","deploy"].includes(g.type)&&xe(g))))return[];let i=q(n.task,280)??q(n.nextActions[0],280),a=s.length>0?s:i?[i]:[];if(a.length===0)return[];let u=Wa(t,n);if(u.length===0)return[];let c=Da(t,n),p=za(t),l=Math.min(...t.map(g=>g.sequence)),m=Math.max(...t.map(g=>g.sequence)),d=qa(t);return a.slice(0,hr).map(g=>{let S=[`Reusable procedure learned from successful task: ${g}.`,c.length>0?`Files: ${c.slice(0,6).join(", ")}.`:"",r.length>0?`Verification: ${r.slice(0,4).join("; ")}.`:""].filter(Boolean),h=JSON.stringify({projectId:e.projectId,task:g,steps:u,verification:r,files:c}),y=Ka(h);return{schema:Ra,version:1,id:`skill-${y.slice(0,24)}`,fingerprint:y,projectId:e.projectId,title:Dt(`SOP: ${g}`,180),task:g,summary:Dt(S.join(" "),900),steps:u,verification:r,files:c,source:{agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,firstSequence:l,lastSequence:m,eventIds:p},createdAt:d}})}function Ba(e){return kr(e.rootPath,".toolnet","memory","skills")}function Va(e){let t=Ba(e);return Oa(t,{recursive:!0,mode:448}),Sr(t,448),t}function jr(e,t){if(t.length===0)return{written:0,deduped:0,files:[]};let n=Va(e),r=0,s=0,o=[];for(let i of t){if(i.projectId!==e.id)throw new Error(`Skill project mismatch: ${i.projectId} != ${e.id}`);let a=kr(n,`${i.id}.json`);if(o.push(a),Pa(a)){s+=1;continue}let u=`${a}.${process.pid}.${Date.now()}.tmp`;Ta(u,JSON.stringify(i,null,2)+`
`,{encoding:"utf8",mode:384}),Ma(u,a),Sr(a,384),r+=1}return{written:r,deduped:s,files:o}}function Ir(e){return String(e).padStart(12,"0")}function Ja(e){return`projects/${e.projectId}/memory/learned`}var Qe=class{constructor(t){this.storage=t}storage;async write(t,n,r){if(r.length===0||n.length===0)return null;let s=Math.min(...n.map(l=>l.sequence)),o=Math.max(...n.map(l=>l.sequence)),i={version:1,projectId:t.projectId,agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,createdAt:new Date().toISOString(),firstSequence:s,lastSequence:o,candidateCount:r.length,candidates:r},a=JSON.stringify(i,null,2)+`
`,u=v(r.map(l=>l.fingerprint).sort().join("|")).slice(0,16),c=v(t.sessionKey).slice(0,12),p=[Ja(t),"batches",`${Ir(s)}-${Ir(o)}-${c}-${u}.json`].join("/");return await this.storage.exists(p)||await this.storage.put(p,a,"application/json"),p}};import{createHash as Ga}from"node:crypto";function Ar(e){return String(e).padStart(12,"0")}function Er(e){return Ga("sha256").update(e).digest("hex")}function Ha(e){return`projects/${e.projectId}/memory/hierarchy`}var Ze=class{constructor(t){this.storage=t}storage;async write(t,n,r){if(n.length===0||r.facts.length===0)return null;let s=Math.min(...n.map(p=>p.sequence)),o=Math.max(...n.map(p=>p.sequence)),i={schema:"toolnet.memory-hierarchy-batch.v1",version:1,projectId:t.projectId,agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,createdAt:new Date().toISOString(),firstSequence:s,lastSequence:o,hierarchy:r},a=Er([...r.facts.map(p=>p.id),...r.knowledge.map(p=>p.id)].sort().join("|")).slice(0,16),u=Er(t.sessionKey).slice(0,12),c=[Ha(t),"batches",`${Ar(s)}-${Ar(o)}-${u}-${a}.json`].join("/");return await this.storage.exists(c)||await this.storage.put(c,`${JSON.stringify(i,null,2)}
`,"application/json"),c}};function ec(e,t){if(!Ya(e))return{events:[],nextOffset:t};let n=Za(e).size,r=Number.isFinite(t)?Math.max(0,t):0;if(r>n&&(r=0),r===n)return{events:[],nextOffset:n};let s=n-r,o=Buffer.alloc(s),i=Xa(e,"r");try{Qa(i,o,0,s,r)}finally{Ua(i)}let a=o.toString("utf8"),u=a.lastIndexOf(`
`);if(u<0)return{events:[],nextOffset:r};let c=a.slice(0,u+1);return{events:c.split(`
`).filter(Boolean).flatMap(l=>{try{return[JSON.parse(l)]}catch{return[]}}),nextOffset:r+Buffer.byteLength(c,"utf8")}}var et=class{constructor(t){this.options=t;this.journal=new Qe(t.storage),this.hierarchyJournal=new Ze(t.storage)}options;journal;hierarchyJournal;async learnNew(){let t=this.options.wal.loadState(),n=Number(t.sourceCursors["memory.learner.offset"]??0),r=Number.isFinite(n)?n:0,s=ec(this.options.wal.eventsFile,r);if(s.events.length===0)return{scannedEvents:0,candidates:0,journalWritten:!1,nextOffset:s.nextOffset};let o=Ve(this.options.identity,s.events),i=o.candidates,a=!1;i.length>0&&(a=!!await this.journal.write(this.options.identity,s.events,i));let u=!1;o.hierarchy.facts.length>0&&(u=!!await this.hierarchyJournal.write(this.options.identity,s.events,o.hierarchy));let c=Cr(this.options.identity,s.events,o.state),p=jr(this.options.project,c);this.options.wal.setSourceCursor("memory.pipeline.version",2),this.options.wal.setSourceCursor("memory.pipeline.normalized_events",o.stats.normalizedEvents),this.options.wal.setSourceCursor("memory.pipeline.persisted",o.stats.persistedCandidates),this.options.wal.setSourceCursor("memory.pipeline.permanent",o.stats.permanent),this.options.wal.setSourceCursor("memory.pipeline.task",o.stats.task),this.options.wal.setSourceCursor("memory.pipeline.session",o.stats.session),this.options.wal.setSourceCursor("memory.pipeline.transient",o.stats.transient),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.version",o.hierarchy.version),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.raw",o.hierarchy.stats.raw),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.facts",o.hierarchy.stats.facts),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.scenes",o.hierarchy.stats.scenes),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.knowledge",o.hierarchy.stats.knowledge),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.journal_written",u?1:0),this.options.wal.setSourceCursor("memory.skill.assets",c.length),this.options.wal.setSourceCursor("memory.skill.written",p.written),this.options.wal.setSourceCursor("memory.skill.deduped",p.deduped);try{let l=Un(this.options.project.rootPath,s.events);this.options.wal.setSourceCursor("memory.context_offload.eligible",l.eligible),this.options.wal.setSourceCursor("memory.context_offload.written",l.written),this.options.wal.setSourceCursor("memory.context_offload.deduped",l.deduped),this.options.wal.setSourceCursor("memory.context_offload.graph_nodes",l.graphNodes),this.options.wal.setSourceCursor("memory.context_offload.failed",0)}catch{this.options.wal.setSourceCursor("memory.context_offload.failed",1)}try{let l=await yr({project:this.options.project,storage:this.options.storage,hierarchy:o.hierarchy});this.options.wal.setSourceCursor("memory.wiki_automation.scanned",l.scanned),this.options.wal.setSourceCursor("memory.wiki_automation.eligible",l.eligible),this.options.wal.setSourceCursor("memory.wiki_automation.created",l.created),this.options.wal.setSourceCursor("memory.wiki_automation.updated",l.updated),this.options.wal.setSourceCursor("memory.wiki_automation.unchanged",l.unchanged),this.options.wal.setSourceCursor("memory.wiki_automation.skipped",l.skipped),this.options.wal.setSourceCursor("memory.wiki_automation.failed",l.failed),this.options.wal.setSourceCursor("memory.wiki_automation.review_pending",l.reviewPending),this.options.wal.setSourceCursor("memory.wiki_automation.auto_approved",l.autoApproved),this.options.wal.setSourceCursor("memory.wiki_automation.review_approved",l.reviewApproved)}catch{this.options.wal.setSourceCursor("memory.wiki_automation.failed",1)}return this.options.wal.setSourceCursor("memory.learner.offset",s.nextOffset),{scannedEvents:s.events.length,candidates:i.length,journalWritten:a,nextOffset:s.nextOffset}}};import{closeSync as Sc,existsSync as kc,openSync as vc,readSync as wc,statSync as bc}from"node:fs";function Pr(e){return e&&typeof e=="object"&&!Array.isArray(e)?e:null}function Ae(e){return e.toLowerCase().replace(/[^a-z0-9]/gu,"")}function Ie(e,t,n=0){if(n>8)return;if(Array.isArray(e)){for(let s of e.slice(0,50))Ie(s,t,n+1);return}let r=Pr(e);if(r)for(let[s,o]of Object.entries(r))t(s,o,r),Ie(o,t,n+1)}function oe(e,t){let n=[];return Ie(e,(r,s)=>{t.has(Ae(r))&&typeof s=="string"&&s.trim()&&n.push(s.trim())}),n}function tc(e){let t=e.trim();if(!t.startsWith("{"))return null;try{return Pr(JSON.parse(t))}catch{return null}}function nc(e){let t=e.data;for(let r of["tool","toolName","tool_name"]){let s=t[r];if(typeof s=="string"&&s.trim())return s.trim().toLowerCase()}let n="";return Ie(t,(r,s,o)=>{if(n)return;let i=Ae(r);if(["tool","toolname"].includes(i)&&typeof s=="string"){n=s.trim().toLowerCase();return}if(i!=="name"||typeof s!="string")return;let a=typeof o.type=="string"?o.type.toLowerCase():"";(a.includes("tool")||a.includes("function")||a.includes("command"))&&(n=s.trim().toLowerCase())}),n}function rc(e){let t=oe(e.data,new Set(["command","cmd","script"])),n=oe(e.data,new Set(["arguments","args"]));for(let r of n){let s=tc(r);if(s)for(let o of oe(s,new Set(["command","cmd","script"])))t.push(o)}return Array.from(new Set(t.map(r=>r.trim()).filter(Boolean)))}function sc(e){let t=oe(e.data,new Set(["filepath","file_path","filename","file","path","target"].map(Ae)));return Array.from(new Set(t.map(n=>n.trim()).filter(n=>n.length>0&&n.length<1e3&&!n.includes(`
`))))}function oc(e,t){return e.type==="file_edit"||e.type==="file_write"?"modified":/\b(delete|remove|unlink)\b/iu.test(t)?"deleted":/\b(create|add[_-]?file|new[_-]?file)\b/iu.test(t)?"created":/\b(edit|write|patch|apply[_-]?patch|replace|update[_-]?file)\b/iu.test(t)?"modified":null}function ic(e){let t=oe(e.data,new Set(["patch","diff","arguments","input"].map(Ae))),n=[];for(let r of t){let s=[{regex:/^\*\*\* Update File:\s*(.+)$/gimu,action:"modified"},{regex:/^\*\*\* Add File:\s*(.+)$/gimu,action:"created"},{regex:/^\*\*\* Delete File:\s*(.+)$/gimu,action:"deleted"}];for(let o of s)for(let i of r.matchAll(o.regex)){let a=i[1]?.trim();a&&n.push({kind:"file",text:a,fileAction:o.action,confidence:.99})}}return n}function ac(e){let t=e.toLowerCase();return/\b(typecheck|type-check)\b/u.test(t)||/\btsc\b[\s\S]*--noemit\b/u.test(t)?"typecheck":/\b(eslint|lint)\b/u.test(t)?"lint":/\b(vitest|jest|pytest)\b/u.test(t)||/\bgo\s+test\b/u.test(t)||/\bcargo\s+test\b/u.test(t)||/\b(npm|pnpm|yarn)\s+(run\s+)?test\b/u.test(t)?"test":/\b(npm|pnpm|yarn)\s+(run\s+)?build\b/u.test(t)||/\bcargo\s+build\b/u.test(t)||/\bgo\s+build\b/u.test(t)||/\btsc\b/u.test(t)?"build":null}function cc(e){let t=null;return Ie(e,(n,r)=>{if(t===null&&["exitcode","code"].includes(Ae(n))){if(typeof r=="number"&&Number.isFinite(r)){t=r;return}if(typeof r=="string"){let s=Number(r);Number.isFinite(s)&&(t=s)}}}),t}function uc(e){return oe(e,new Set(["status","state","result","output","outputsummary","message","text"]))}function lc(e){let t=cc(e.data);if(t!==null)return t===0?"passed":"failed";let n=uc(e.data).join(`
`).toLowerCase();return/\b(error|failed|failure|failing)\b/u.test(n)&&!/\b0\s+failed\b/u.test(n)?"failed":/\b(success|successful|completed|passed|green)\b/u.test(n)||/\b\d+\s+passed\b/u.test(n)?"passed":/\b(running|started|in[_ -]?progress)\b/u.test(n)?"running":"unknown"}function dc(e){let t=[],n=new Set;for(let r of e){let s=[r.kind,r.fileAction??"",r.checkKind??"",r.checkStatus??"",r.text].join("|");n.has(s)||(n.add(s),t.push(r))}return t}function Or(e){let t=[],n=nc(e),r=oc(e,n);if(r)for(let s of sc(e))t.push({kind:"file",text:s,fileAction:r,confidence:e.type==="file_edit"||e.type==="file_write"?1:.96});t.push(...ic(e));for(let s of rc(e)){t.push({kind:"command",text:s,confidence:.98});let o=ac(s);o&&t.push({kind:"test",text:s,checkKind:o,checkStatus:lc(e),confidence:.98})}return dc(t)}var pc=new Set(["content","text","message","prompt","summary","description","title","reason","last_assistant_message","lastAssistantMessage"]);function te(e){return e.normalize("NFKC").replace(/\s+/g," ").replace(/^[\s>*#•-]+/u,"").trim()}function Tr(e){return te(e).toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim()}function ee(e,t,n=0){if(!(n>6)){if(typeof e=="string"){t.push(e);return}if(Array.isArray(e)){for(let r of e.slice(0,50))ee(r,t,n+1);return}if(!(!e||typeof e!="object"))for(let[r,s]of Object.entries(e))(pc.has(r)||["data","payload","parts","messages"].includes(r))&&ee(s,t,n+1)}}function tt(e){return/\b(cancelled|canceled)\b|đã hủy|bỏ qua/iu.test(e)?"cancelled":/\b(blocked|blocker)\b|đang vướng|bị vướng|đang kẹt|chưa thể/iu.test(e)?"blocked":/\b(completed|complete|done|finished|passed)\b|hoàn thành|hoàn tất|đã xong|đã làm xong|\bxong\b/iu.test(e)?"completed":/\bin[\s_-]*progress\b|working on|đang làm|đang thực hiện|đang xử lý|đang triển khai/iu.test(e)?"in_progress":"pending"}function Mr(e){let t=te(e);return/^(?:đang\s+làm|đang\s+thực\s+hiện|đang\s+xử\s+lý|đang\s+triển\s+khai|hoàn\s+thành|hoàn\s+tất|đã\s+xong|đã\s+làm\s+xong|xong|pending|in[\s_-]*progress|completed|complete|done|finished|blocked|cancelled|canceled)[.!]*$/iu.test(t)}function E(e,t,n,r,s={}){let o=te(r),i=s.key??Tr(o);return{version:1,id:v([e.projectId,n,i,t.id,o,s.status??"",s.fileAction??"",s.checkKind??"",s.checkStatus??"",s.order??""].join("|")).slice(0,32),projectId:e.projectId,kind:n,key:i,text:o,status:s.status,fileAction:s.fileAction,checkKind:s.checkKind,checkStatus:s.checkStatus,order:s.order,confidence:s.confidence??.85,occurredAt:t.timestamp,sequence:t.sequence,agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,eventId:t.id,sourceEventId:t.sourceEventId}}function mc(e,t,n){let r=te(n);if(r.length<5||r.length>1200)return[];let s=[],o=/^(?:next|next action|next step|tiếp theo|bước tiếp theo|cần làm tiếp)\b/iu.test(r),i=r.match(/^(?:mục tiêu|goal|objective)\s*(?::|-)\s*(.+)$/iu);i?.[1]&&s.push(E(e,t,"goal",i[1],{confidence:.97}));let a=r.match(/^(?:kế hoạch|plan)\s*(?::|-)\s*(.+)$/iu);a?.[1]&&s.push(E(e,t,"plan",a[1],{confidence:.95}));let u=/\b(?:phase|giai đoạn|giai doan|stage)\s*(\d+)\s*(?:[:\-–—]\s*)?([^.;\n]{0,220})/giu,c;for(;!o&&(c=u.exec(r));){let m=Number(c[1]),d=te(c[2]??""),g=d&&!Mr(d)?`Phase ${m} - ${d}`:`Phase ${m}`;s.push(E(e,t,"phase",g,{key:`phase:${m}`,order:m,status:tt(r),confidence:.93}))}let p=n.match(/^\s*[-*]\s*\[([ xX])\]\s*(.+)$/u);p?.[2]&&s.push(E(e,t,"task",p[2],{status:p[1].trim()?"completed":tt(p[2]),confidence:.96}));let l=r.match(/^(?:todo|task|việc)\s*(\d+)?(?:\s*[:.\-–—]\s*|\s+)(.+)$/iu);if(l?.[2]){let m=l[1]?Number(l[1]):void 0,d=te(l[2]),g=Mr(d);s.push(E(e,t,"task",g&&m!==void 0?`TODO ${m}`:d,{key:m!==void 0?`task:${m}`:Tr(d),order:m,status:tt(r),confidence:.93}))}if(/^(?:next|next action|next step|tiếp theo|bước tiếp theo|cần làm tiếp)\b/iu.test(r)){let m=r.replace(/^(?:next|next action|next step|tiếp theo|bước tiếp theo|cần làm tiếp)\s*(?::|-)?\s*/iu,"");m&&s.push(E(e,t,"next_action",m,{confidence:.9}))}return/\b(blocker|blocked)\b|đang vướng|bị vướng|đang kẹt/iu.test(r)&&s.push(E(e,t,"blocker",r,{confidence:.9})),/\b(chú ý|lưu ý|warning|attention|cẩn thận)\b/iu.test(r)&&s.push(E(e,t,"warning",r,{confidence:.88})),/\b(chốt|quyết định|decided|decision)\b/iu.test(r)&&s.push(E(e,t,"decision",r,{confidence:.9})),r.length<=300&&/^(?:đang\s+(?:sửa|cập nhật|triển khai|xử lý|làm|refactor|fix)|(?:i(?:'m| am)\s+)?(?:working on|implementing|fixing|refactoring|updating|editing)\b)/iu.test(r)&&s.push(E(e,t,"activity",r,{confidence:.86})),s}function nt(e,t){if(t.length===0)return[];let n=[],r=new Set;function s(i){r.has(i.id)||(r.add(i.id),n.push(i))}for(let i of t){if(i.type==="user_prompt"||i.role==="user"){let u=[];ee(i.data,u);let c=u.map(p=>te(p)).find(p=>p.length>=8&&p.length<=1200&&!/^\[?toolnet\b/iu.test(p));c&&s(E(e,i,"request",c,{confidence:.96}))}for(let u of Or(i))s(E(e,i,u.kind,u.text,{fileAction:u.fileAction,checkKind:u.checkKind,checkStatus:u.checkStatus,status:u.kind==="test"?u.checkStatus==="passed"?"completed":u.checkStatus==="failed"?"blocked":u.checkStatus==="running"?"in_progress":"pending":void 0,confidence:u.confidence}));if(i.type==="decision"){let u=[];ee(i.data,u);for(let c of u)s(E(e,i,"decision",c,{confidence:1}))}if(i.type==="todo"){let u=[];ee(i.data,u);for(let c of u)s(E(e,i,"task",c,{status:tt(c),confidence:1}))}if(["file_write","file_edit"].includes(i.type))for(let u of["filePath","path","file"]){let c=i.data[u];typeof c=="string"&&c&&s(E(e,i,"file",c,{fileAction:"modified",confidence:1}))}if(i.type==="test"){let u=[];ee(i.data,u);for(let c of u)s(E(e,i,"test",c,{confidence:1}))}let a=[];ee(i.data,a);for(let u of a)for(let c of u.split(/\n+/u))for(let p of mc(e,i,c))s(p)}let o=t[t.length-1];return s(E(e,o,"session",`${e.agent}:${e.nativeSessionId}`,{key:e.sessionKey,confidence:1})),n}function Rr(e){return String(e).padStart(12,"0")}var rt=class{constructor(t){this.storage=t}storage;async write(t,n){if(n.length===0)return null;let r=Math.min(...n.map(p=>p.sequence)),s=Math.max(...n.map(p=>p.sequence)),o={version:1,projectId:t.projectId,agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,createdAt:new Date().toISOString(),firstSequence:r,lastSequence:s,observations:n},i=JSON.stringify(o,null,2)+`
`,a=v(n.map(p=>p.id).sort().join("|")).slice(0,16),u=v(t.sessionKey).slice(0,12),c=[`projects/${t.projectId}`,"work","observations",`${Rr(r)}-${Rr(s)}-${u}-${a}.json`].join("/");return await this.storage.exists(c)||await this.storage.put(c,i,"application/json"),c}};import{join as Nr}from"node:path";import{mkdirSync as fc}from"node:fs";function $r(e){return e.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim()}function F(e,t=20){let n=[],r=new Set;for(let s of e.slice().reverse()){let o=$r(s);if(!(!o||r.has(o))&&(r.add(o),n.push(s),n.length>=t))break}return n.reverse()}function gc(e,t=20){let n=new Map;for(let r of e){let s=`${r.kind}|${$r(r.command)}`;n.delete(s),n.set(s,r)}return Array.from(n.values()).slice(-t)}function yc(e){return e.kind==="phase"?/^Phase\s+\d+$/iu.test(e.text):e.kind==="task"?/^(?:TODO|Task|Việc)\s+\d+$/iu.test(e.text):!1}function _r(e,t){let n=t.status??e?.status??"pending",r=n;e&&(e.status==="completed"&&n!=="completed"?r="completed":n==="pending"&&(e.status==="in_progress"||e.status==="blocked")&&(r=e.status));let s=e&&yc(t)?e.title:t.text;return{id:e?.id??v(t.key).slice(0,24),title:s,status:r,order:t.order??e?.order,confidence:Math.max(t.confidence,e?.confidence??0),updatedAt:t.occurredAt,updatedBy:{agent:t.agent,nativeSessionId:t.nativeSessionId,eventId:t.eventId}}}async function hc(e,t){let n=`projects/${e.id}/work/observations/`,r=await t.list(n),s=[];for(let o of r.filter(i=>i.key.endsWith(".json")).sort((i,a)=>i.key.localeCompare(a.key))){let i=await t.getText(o.key);if(i)try{let a=JSON.parse(i);a.version===1&&Array.isArray(a.observations)&&s.push(a)}catch{}}return s}async function st(e,t){let r=(await hc(e,t)).flatMap(f=>f.observations).sort((f,b)=>{let B=f.occurredAt.localeCompare(b.occurredAt);if(B!==0)return B;let en=f.sequence-b.sequence;return en!==0?en:f.id.localeCompare(b.id)}),s=new Map,o=new Map,i,a,u,c,p,l=[],m=[],d=[],g=[],S=[],h=new Map,y=[],k=[],I=[],M=[],O=[],T=[];for(let f of r)switch(f.kind){case"request":i=f.text;break;case"activity":a=f.text;break;case"goal":u=f.text;break;case"plan":c=f.text;break;case"phase":s.set(f.key,_r(s.get(f.key),f));break;case"task":o.set(f.key,_r(o.get(f.key),f));break;case"decision":l.push(f.text);break;case"blocker":m.push(f.text);break;case"warning":d.push(f.text);break;case"next_action":g.push(f.text);break;case"file":{S.push(f.text);let b=f.fileAction??"active";h.delete(f.text),h.set(f.text,b),b==="modified"?y.push(f.text):b==="created"?k.push(f.text):b==="deleted"&&I.push(f.text);break}case"command":M.push(f.text);break;case"test":O.push(f.text),f.checkKind&&T.push({kind:f.checkKind,command:f.text,status:f.checkStatus??"unknown",updatedAt:f.occurredAt,agent:f.agent,nativeSessionId:f.nativeSessionId});break;case"session":p={agent:f.agent,nativeSessionId:f.nativeSessionId,sessionKey:f.sessionKey,updatedAt:f.occurredAt};break}let C=Array.from(s.values()).sort((f,b)=>(f.order??Number.MAX_SAFE_INTEGER)-(b.order??Number.MAX_SAFE_INTEGER)),w=Array.from(o.values()).sort((f,b)=>(f.order??Number.MAX_SAFE_INTEGER)-(b.order??Number.MAX_SAFE_INTEGER)),D=C.find(f=>f.status==="in_progress")??C.find(f=>f.status==="blocked")??C.find(f=>f.status==="pending"),z=w.find(f=>f.status==="in_progress")??w.find(f=>f.status==="blocked")??w.find(f=>f.status==="pending"),wt=F([...g,...z?[z.title]:[],...!z&&D?[D.title]:[],...w.filter(f=>f.status==="pending").slice(0,5).map(f=>f.title)],8),bt=F([...m,...C.filter(f=>f.status==="blocked").map(f=>f.title),...w.filter(f=>f.status==="blocked").map(f=>f.title)],20),de={version:1,projectId:e.id,projectName:e.name,currentRequest:i,currentActivity:a,goal:u,plan:c,phases:C,tasks:w,decisions:F(l,20),blockers:bt,warnings:F(d,20),nextActions:wt,filesTouched:F(S,30),activeFiles:Array.from(h.entries()).filter(([,f])=>f!=="deleted").map(([f])=>f).slice(-5),modifiedFiles:F(y,30),createdFiles:F(k,30),deletedFiles:F(I,30),commands:F(M,20),tests:F(O,20),checks:gc(T,20),currentPhase:D,currentTask:z,progress:{phasesTotal:C.length,phasesCompleted:C.filter(f=>f.status==="completed").length,tasksTotal:w.length,tasksCompleted:w.filter(f=>f.status==="completed").length,blocked:C.filter(f=>f.status==="blocked").length+w.filter(f=>f.status==="blocked").length},lastSession:p,updatedAt:r.length?r[r.length-1].occurredAt:new Date().toISOString()},pe=Nr(e.rootPath,".toolnet","work");return fc(pe,{recursive:!0}),R(Nr(pe,"current.json"),de),await t.put(`projects/${e.id}/work/current.json`,JSON.stringify(de,null,2)+`
`,"application/json"),de}async function ot(e,t){let n=await t.getText(`projects/${e.id}/work/current.json`);if(!n)return null;try{return JSON.parse(n)}catch{return null}}function xc(e,t){if(!kc(e))return{events:[],nextOffset:t};let n=bc(e).size,r=Number.isFinite(t)?Math.max(0,t):0;if(r>n&&(r=0),r===n)return{events:[],nextOffset:n};let s=n-r,o=Buffer.alloc(s),i=vc(e,"r");try{wc(i,o,0,s,r)}finally{Sc(i)}let a=o.toString("utf8"),u=a.lastIndexOf(`
`);if(u<0)return{events:[],nextOffset:r};let c=a.slice(0,u+1);return{events:c.split(`
`).filter(Boolean).flatMap(l=>{try{return[JSON.parse(l)]}catch{return[]}}),nextOffset:r+Buffer.byteLength(c,"utf8")}}var it=class{constructor(t){this.options=t;this.journal=new rt(t.storage)}options;journal;async learnNew(){let t=this.options.wal.loadState(),n=Number(t.sourceCursors["work.continuity.offset"]??0),r=xc(this.options.wal.eventsFile,Number.isFinite(n)?n:0);if(r.events.length===0)return{scannedEvents:0,observations:0,journalWritten:!1,reconciled:!1,nextOffset:r.nextOffset};let s=nt(this.options.identity,r.events),o=!1,i=!1;return s.length>0&&(o=!!await this.journal.write(this.options.identity,s),o&&(await st(this.options.project,this.options.storage),i=!0)),this.options.wal.setSourceCursor("work.continuity.offset",r.nextOffset),{scannedEvents:r.events.length,observations:s.length,journalWritten:o,reconciled:i,nextOffset:r.nextOffset}}};import{closeSync as Tc,existsSync as Rc,openSync as Nc,readSync as _c,statSync as $c}from"node:fs";var Cc=new Set(["content","text","message","prompt","summary","description","title","reason","last_assistant_message","lastAssistantMessage"]);function ie(e){return e.normalize("NFKC").replace(/\s+/g," ").replace(/^[\s>*#•-]+/u,"").trim()}function qt(e,t,n=0){if(!(n>6)){if(typeof e=="string"){t.push(e);return}if(Array.isArray(e)){for(let r of e.slice(0,50))qt(r,t,n+1);return}if(!(!e||typeof e!="object"))for(let[r,s]of Object.entries(e))(Cc.has(r)||["data","payload","parts","messages"].includes(r))&&qt(s,t,n+1)}}function _(e,t,n,r,s,o=.95){let i=ie(r);return{version:1,id:v([e.projectId,n,s.type,s.key??"",i.toLowerCase(),t.id].join("|")).slice(0,32),projectId:e.projectId,kind:n,value:i,scope:s.type,scopeKey:s.key,scopeOrder:s.order,confidence:o,evidence:{agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,eventId:t.id,sourceEventId:t.sourceEventId,sequence:t.sequence,occurredAt:t.timestamp}}}function L(e,t){let n=e.toLowerCase();for(let r of t){let s=r.toLowerCase();if(n.startsWith(`${s}:`)||n.startsWith(`${s} -`)||n.startsWith(`${s} \u2014`))return ie(e.slice(r.length+1))}return null}function jc(e){let t=e.trimStart();return t.startsWith("- ")||t.startsWith("* ")||/^\d+[.)]\s+/u.test(t)}function Ic(e){return ie(e.trim().replace(/^[-*]\s+/u,"").replace(/^\d+[.)]\s+/u,""))}function Kr(e,t){let n=[],r=new Set;function s(o){!o.value||o.value.length<3||r.has(o.id)||(r.add(o.id),n.push(o))}for(let o of t){let i=[];qt(o.data,i);for(let a of i){let u={type:"project"},c=null;for(let p of a.split(/\r?\n/u)){let l=ie(p);if(!l){c=null;continue}let m=l.match(/^(?:phase|giai đoạn|giai doan|stage)\s*(\d+)\s*(?:[:\-–—]\s*)?(.*)$/iu);if(m){let w=Number(m[1]);u={type:"phase",key:`phase:${w}`,order:w,title:ie(m[2]??"")},c=null;continue}let d=l.match(/^(?:todo|task|việc)\s*(\d+)\s*(?:[:\-–—]\s*)?(.*)$/iu);if(d){let w=Number(d[1]);u={type:"task",key:`task:${w}`,order:w,title:ie(d[2]??"")},c=null;continue}let g=L(l,["mission","s\u1EE9 m\u1EC7nh","m\u1EE5c ti\xEAu t\u1ED5ng th\u1EC3","m\u1EE5c ti\xEAu project","project goal"]);if(g){s(_(e,o,"mission",g,{type:"project"},.99)),c=null;continue}let S=L(l,["current objective","active objective","m\u1EE5c ti\xEAu hi\u1EC7n t\u1EA1i","objective","m\u1EE5c ti\xEAu","m\u1EE5c \u0111\xEDch"]);if(S){s(_(e,o,u.type==="phase"?"phase_objective":"objective",S,u,.98)),c=null;continue}let h=L(l,["why","why this","why this phase","reason","rationale","v\xEC sao","l\xFD do","t\u1EA1i sao","\xFD ngh\u0129a"]);if(h){s(_(e,o,u.type==="phase"?"phase_why":"why",h,u,.98)),c=null;continue}let y=L(l,["desired outcome","final outcome","k\u1EBFt qu\u1EA3 cu\u1ED1i","k\u1EBFt qu\u1EA3 mong mu\u1ED1n","m\u1EE5c ti\xEAu cu\u1ED1i"]);if(y){s(_(e,o,"desired_outcome",y,{type:"project"},.98)),c=null;continue}let k=L(l,["plan rationale","approach rationale","why this approach","t\u1EA1i sao ch\u1ECDn h\u01B0\u1EDBng n\xE0y","l\xFD do ch\u1ECDn h\u01B0\u1EDBng n\xE0y","l\xFD do ch\u1ECDn ki\u1EBFn tr\xFAc"]);if(k){s(_(e,o,"plan_rationale",k,{type:"project"},.98)),c=null;continue}let I=L(l,["deliverable","output","k\u1EBFt qu\u1EA3 c\u1EA7n \u0111\u1EA1t","ph\u1EA3i t\u1EA1o ra","\u0111\u1EA7u ra"]);if(I){s(_(e,o,"phase_deliverable",I,u,.97)),c=null;continue}let M=L(l,["acceptance criteria","definition of done","done khi","ho\xE0n th\xE0nh khi","ti\xEAu ch\xED ho\xE0n th\xE0nh"]);if(M){s(_(e,o,"acceptance_criterion",M,u,.98)),c="acceptance_criterion";continue}let O=L(l,["depends on","dependency","dependencies","ph\u1EE5 thu\u1ED9c","c\u1EA7n c\xF3 tr\u01B0\u1EDBc"]);if(O){s(_(e,o,"dependency",O,u,.97)),c="dependency";continue}let T=L(l,["open question","open questions","c\xE2u h\u1ECFi m\u1EDF","ch\u01B0a quy\u1EBFt \u0111\u1ECBnh","ch\u01B0a r\xF5"]);if(T){s(_(e,o,"open_question",T,u,.95)),c="open_question";continue}let C=L(l,["constraint","constraints","r\xE0ng bu\u1ED9c","gi\u1EDBi h\u1EA1n"]);if(C){s(_(e,o,"constraint",C,u,.97)),c="constraint";continue}if(/^(?:acceptance criteria|definition of done|done khi|tiêu chí hoàn thành)\s*:?\s*$/iu.test(l)){c="acceptance_criterion";continue}if(/^(?:dependencies|dependency|phụ thuộc)\s*:?\s*$/iu.test(l)){c="dependency";continue}if(/^(?:open questions|open question|câu hỏi mở)\s*:?\s*$/iu.test(l)){c="open_question";continue}if(/^(?:constraints|constraint|ràng buộc)\s*:?\s*$/iu.test(l)){c="constraint";continue}if(c&&jc(p)){s(_(e,o,c,Ic(p),u,.96));continue}c=null}}}return n}function Fr(e){return String(e).padStart(12,"0")}var at=class{constructor(t){this.storage=t}storage;async write(t,n){if(n.length===0)return null;let r=Math.min(...n.map(c=>c.evidence.sequence)),s=Math.max(...n.map(c=>c.evidence.sequence)),o={version:1,projectId:t.projectId,agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,firstSequence:r,lastSequence:s,createdAt:new Date().toISOString(),observations:n},i=v(n.map(c=>c.id).sort().join("|")).slice(0,16),a=v(t.sessionKey).slice(0,12),u=[`projects/${t.projectId}`,"work","semantic","observations",`${Fr(r)}-${Fr(s)}-${a}-${i}.json`].join("/");return await this.storage.exists(u)||await this.storage.put(u,JSON.stringify(o,null,2)+`
`,"application/json"),u}};import{mkdirSync as Ac}from"node:fs";import{join as Lr}from"node:path";function Ec(e){return{value:e.value,confidence:e.confidence,evidence:e.evidence}}function Pc(e,t){if(!t)return!0;let n=e.evidence.occurredAt.localeCompare(t.evidence.occurredAt);return n!==0?n>0:e.evidence.sessionKey===t.evidence.sessionKey?e.evidence.sequence>=t.evidence.sequence:e.confidence>=t.confidence}function J(e,t){return Pc(t,e)?t:e}function G(e,t=30){let n=new Set,r=[];for(let s of e){let o=s.value.normalize("NFKC").toLowerCase().replace(/\s+/g," ").trim();!o||n.has(o)||(n.add(o),r.push(s))}return r.slice(-t)}async function Oc(e,t){let n=`projects/${e.id}/work/semantic/observations/`,r=await t.list(n),s=[];for(let o of r.filter(i=>i.key.endsWith(".json")).sort((i,a)=>i.key.localeCompare(a.key))){let i=await t.getText(o.key);if(i)try{let a=JSON.parse(i);a.version===1&&Array.isArray(a.observations)&&s.push(a)}catch{}}return s}function Mc(e){return{key:e.scopeKey??`phase:${e.scopeOrder??0}`,order:e.scopeOrder??0,acceptanceCriteria:[],dependencies:[],openQuestions:[],constraints:[],notes:[]}}async function Wr(e,t){let r=(await Oc(e,t)).flatMap(S=>S.observations).sort((S,h)=>{let y=S.evidence.occurredAt.localeCompare(h.evidence.occurredAt);return y!==0?y:S.evidence.sessionKey===h.evidence.sessionKey?S.evidence.sequence-h.evidence.sequence:S.id.localeCompare(h.id)}),s,o,i,a,u,c=new Map,p=[],l=[],m=[];for(let S of r){let h=Ec(S);if(S.scope==="phase"&&S.scopeKey){let y=c.get(S.scopeKey)??Mc(S);switch(S.kind){case"phase_objective":y.objective=J(y.objective,h);break;case"phase_why":y.why=J(y.why,h);break;case"phase_deliverable":y.deliverable=J(y.deliverable,h);break;case"acceptance_criterion":y.acceptanceCriteria.push(h);break;case"dependency":y.dependencies.push(h);break;case"open_question":y.openQuestions.push(h);break;case"constraint":y.constraints.push(h);break;case"note":y.notes.push(h);break}c.set(y.key,y);continue}switch(S.kind){case"mission":s=J(s,h);break;case"objective":o=J(o,h);break;case"why":i=J(i,h);break;case"desired_outcome":a=J(a,h);break;case"plan_rationale":u=J(u,h);break;case"open_question":p.push(h);break;case"constraint":l.push(h);break;case"note":m.push(h);break}}for(let S of c.values())S.acceptanceCriteria=G(S.acceptanceCriteria,20),S.dependencies=G(S.dependencies,15),S.openQuestions=G(S.openQuestions,15),S.constraints=G(S.constraints,15),S.notes=G(S.notes,20);let d={version:1,projectId:e.id,projectName:e.name,mission:s,activeObjective:o,why:i,desiredOutcome:a,planRationale:u,phases:Array.from(c.values()).sort((S,h)=>S.order-h.order),openQuestions:G(p,20),constraints:G(l,20),notes:G(m,20),updatedAt:r.length?r[r.length-1].evidence.occurredAt:new Date().toISOString()},g=Lr(e.rootPath,".toolnet","work");return Ac(g,{recursive:!0}),R(Lr(g,"semantic-current.json"),d),await t.put(`projects/${e.id}/work/semantic/current.json`,JSON.stringify(d,null,2)+`
`,"application/json"),d}async function Dr(e,t){let n=await t.getText(`projects/${e.id}/work/semantic/current.json`);if(!n)return null;try{return JSON.parse(n)}catch{return null}}function Kc(e,t){if(!Rc(e))return{events:[],nextOffset:t};let n=$c(e).size,r=Number.isFinite(t)?Math.max(0,t):0;if(r>n&&(r=0),r===n)return{events:[],nextOffset:n};let s=Buffer.alloc(n-r),o=Nc(e,"r");try{_c(o,s,0,s.length,r)}finally{Tc(o)}let i=s.toString("utf8"),a=i.lastIndexOf(`
`);if(a<0)return{events:[],nextOffset:r};let u=i.slice(0,a+1);return{events:u.split(`
`).filter(Boolean).flatMap(c=>{try{return[JSON.parse(c)]}catch{return[]}}),nextOffset:r+Buffer.byteLength(u,"utf8")}}var ct=class{constructor(t){this.options=t;this.journal=new at(t.storage)}options;journal;async learnNew(){let t=this.options.wal.loadState(),n=Number(t.sourceCursors["work.semantic.offset"]??0),r=Kc(this.options.wal.eventsFile,Number.isFinite(n)?n:0);if(r.events.length===0)return{scannedEvents:0,observations:0,journalWritten:!1,reconciled:!1,nextOffset:r.nextOffset};let s=Kr(this.options.identity,r.events),o=!1,i=!1;return s.length>0&&(o=!!await this.journal.write(this.options.identity,s),o&&(await Wr(this.options.project,this.options.storage),i=!0)),this.options.wal.setSourceCursor("work.semantic.offset",r.nextOffset),{scannedEvents:r.events.length,observations:s.length,journalWritten:o,reconciled:i,nextOffset:r.nextOffset}}};import{existsSync as iu,mkdirSync as au}from"node:fs";import{join as Vt}from"node:path";import{existsSync as Br,mkdirSync as Fc,readFileSync as Lc,statSync as zr,writeFileSync as Wc}from"node:fs";import{dirname as Dc,join as zc}from"node:path";var qr=64*1024,qc=`# ToolNet Project Operating Manual

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
`;function ut(e){return zc(e.rootPath,".toolnet","PROJECT.md")}function Bc(e){return e.normalize("NFKC").replace(/\s+/g," ").trim()}function Vc(e){let t=[],n=new Set,r=/^\s*[-*]\s+\[(enforce|advisory)\]\s+(.+?)\s*$/gimu,s;for(;s=r.exec(e);){let o=s[1].toLowerCase(),i=Bc(s[2]);if(!i)continue;let a=`${o}:${i.toLowerCase()}`;n.has(a)||(n.add(a),t.push({id:v(a).slice(0,24),mode:o,text:i,source:"manual"}))}return t}function Jc(e){let t=ut(e);return Br(t)||(Fc(Dc(t),{recursive:!0}),Wc(t,qc,{encoding:"utf8",mode:384})),t}function lt(e,t=!1){let n=t?Jc(e):ut(e);if(!Br(n))return null;if(zr(n).size>qr)throw new Error(`PROJECT.md exceeds ${qr} bytes`);let s=Lc(n,"utf8");return{path:n,content:s,digest:v(s),rules:Vc(s),bytes:Buffer.byteLength(s,"utf8"),updatedAt:new Date(zr(n).mtimeMs).toISOString()}}import{existsSync as Gc,mkdirSync as Hc,readFileSync as Uc,renameSync as Yc,writeFileSync as Xc}from"node:fs";import{dirname as Qc,join as Zc}from"node:path";function eu(e,t){Hc(Qc(e),{recursive:!0});let n=`${e}.tmp-${process.pid}-${Date.now()}`;Xc(n,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Yc(n,e)}function Yr(e){return Zc(e.rootPath,".toolnet","work","current.json")}function Bt(e){let t=Yr(e);if(!Gc(t))return null;try{let n=JSON.parse(Uc(t,"utf8"));return n.version!==1||n.projectId!==e.id?null:n}catch{return null}}function dt(e){return e.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim()}function $(e,t,n){let r=[],s=new Set;for(let o of[...e,...t].reverse()){let i=dt(o);if(!(!i||s.has(i))&&(s.add(i),r.push(o),r.length>=n))break}return r.reverse()}function tu(e,t,n=20){let r=new Map;for(let s of[...e,...t]){let o=`${s.kind}|${dt(s.command)}`;r.delete(o),r.set(o,s)}return Array.from(r.values()).slice(-n)}function nu(e){return e.kind==="phase"?/^Phase\s+\d+$/iu.test(e.text):e.kind==="task"?/^(?:TODO|Task|Việc)\s+\d+$/iu.test(e.text):!1}function Vr(e,t){let n=t.status??e?.status??"pending",r=n;e?.status==="completed"&&n!=="completed"&&(r="completed"),e&&n==="pending"&&(e.status==="in_progress"||e.status==="blocked")&&(r=e.status);let s=e&&nu(t)?e.title:t.text;return{id:e?.id??t.id,title:s,status:r,order:t.order??e?.order,confidence:Math.max(e?.confidence??0,t.confidence),updatedAt:t.occurredAt,updatedBy:{agent:t.agent,nativeSessionId:t.nativeSessionId,eventId:t.eventId}}}function Jr(e){let t=new Map;for(let n of e){let r=n.order!==void 0?`order:${n.order}`:dt(n.title);t.set(r,n)}return t}function Gr(e){return e.order!==void 0?`order:${e.order}`:dt(e.key||e.text)}function Hr(e){return Array.from(e).sort((t,n)=>{let r=t.order??Number.MAX_SAFE_INTEGER,s=n.order??Number.MAX_SAFE_INTEGER;return r!==s?r-s:t.updatedAt.localeCompare(n.updatedAt)})}function Ur(e){return e.find(t=>t.status==="in_progress")??e.find(t=>t.status==="blocked")??e.find(t=>t.status==="pending")}function Xr(e,t){let n=Bt(e),r=Jr(n?.phases??[]),s=Jr(n?.tasks??[]),o=n?.currentRequest,i=n?.currentActivity,a=n?.goal,u=n?.plan,c=n?.lastSession,p=[],l=[],m=[],d=[],g=[],S=[...n?.activeFiles??[]],h=[],y=[],k=[],I=[],M=[],O=[],T=[...t].sort((f,b)=>{let B=f.occurredAt.localeCompare(b.occurredAt);return B!==0?B:f.sequence-b.sequence});for(let f of T)switch(f.kind){case"request":o=f.text;break;case"activity":i=f.text;break;case"goal":a=f.text;break;case"plan":u=f.text;break;case"phase":{let b=Gr(f);r.set(b,Vr(r.get(b),f));break}case"task":{let b=Gr(f);s.set(b,Vr(s.get(b),f));break}case"decision":p.push(f.text);break;case"blocker":l.push(f.text);break;case"warning":m.push(f.text);break;case"next_action":d.push(f.text);break;case"file":{g.push(f.text);let b=f.fileAction??"active",B=S.indexOf(f.text);B>=0&&S.splice(B,1),b!=="deleted"&&S.push(f.text),b==="modified"?h.push(f.text):b==="created"?y.push(f.text):b==="deleted"&&k.push(f.text);break}case"command":I.push(f.text);break;case"test":M.push(f.text),f.checkKind&&O.push({kind:f.checkKind,command:f.text,status:f.checkStatus??"unknown",updatedAt:f.occurredAt,agent:f.agent,nativeSessionId:f.nativeSessionId});break;case"session":c={agent:f.agent,nativeSessionId:f.nativeSessionId,sessionKey:f.sessionKey,updatedAt:f.occurredAt};break}let C=Hr(r.values()),w=Hr(s.values()),D=Ur(C),z=Ur(w),wt=$(n?.nextActions??[],[...d,...z?[z.title]:[],...!z&&D?[D.title]:[],...w.filter(f=>f.status==="pending").slice(0,5).map(f=>f.title)],8),bt=$(n?.blockers??[],[...l,...C.filter(f=>f.status==="blocked").map(f=>f.title),...w.filter(f=>f.status==="blocked").map(f=>f.title)],20),de=T.length>0?T[T.length-1].occurredAt:n?.updatedAt??new Date().toISOString(),pe={version:1,projectId:e.id,projectName:e.name,currentRequest:o,currentActivity:i,goal:a,plan:u,phases:C,tasks:w,decisions:$(n?.decisions??[],p,20),blockers:bt,warnings:$(n?.warnings??[],m,20),nextActions:wt,filesTouched:$(n?.filesTouched??[],g,30),activeFiles:$([],S,5),modifiedFiles:$(n?.modifiedFiles??[],h,30),createdFiles:$(n?.createdFiles??[],y,30),deletedFiles:$(n?.deletedFiles??[],k,30),commands:$(n?.commands??[],I,20),tests:$(n?.tests??[],M,20),checks:tu(n?.checks??[],O,20),currentPhase:D,currentTask:z,progress:{phasesTotal:C.length,phasesCompleted:C.filter(f=>f.status==="completed").length,tasksTotal:w.length,tasksCompleted:w.filter(f=>f.status==="completed").length,blocked:C.filter(f=>f.status==="blocked").length+w.filter(f=>f.status==="blocked").length},lastSession:c,updatedAt:de};return eu(Yr(e),pe),pe}function P(e,t){let n=new Set,r=[];for(let s of e){let o=s.replace(/\s+/g," ").trim();if(!o)continue;let i=o.normalize("NFKC").toLowerCase();if(!n.has(i)&&(n.add(i),r.push(o),r.length>=t))break}return r}function Qr(e){if(e)return{id:e.id,title:e.title,status:e.status}}function ru(e,t=[]){let n=t.slice(-10);if(n.some(s=>s.status==="failed"))return"failing";if(n.some(s=>s.status==="passed"))return"passing";let r=e.slice(-10).join(`
`).toLowerCase();return/(?:failed|failing|failure|error|✗|❌)/u.test(r)?"failing":/(?:passed|passing|green|success|✓|✅)/u.test(r)?"passing":"unknown"}function su(e){return v(JSON.stringify(e))}function ou(e){let t=[];for(let n of e){if(!n)continue;let r=n.match(/https?:\/\/[^\s<>"'`)\]}]+/giu)??[];for(let s of r){let o=s.replace(/[.,;:!?]+$/gu,"").trim();o&&t.push(o)}}return P(t,30)}function Zr(e){let{project:t,identity:n,state:r}=e,s=r.activeFiles?.at(-1)??r.filesTouched.at(-1),o=r.phases.filter(k=>k.status==="completed").map(k=>k.title),i=r.tasks.filter(k=>k.status==="completed").map(k=>k.title),a=r.phases.filter(k=>k.status!=="completed"&&k.status!=="cancelled").map(k=>k.title),u=r.tasks.filter(k=>k.status!=="completed"&&k.status!=="cancelled").map(k=>k.title),c=new Set(r.tasks.filter(k=>k.status==="completed").map(k=>k.title.normalize("NFKC").toLowerCase().replace(/\s+/gu," ").trim())),p=P(r.nextActions.filter(k=>!c.has(k.normalize("NFKC").toLowerCase().replace(/\s+/gu," ").trim())),10),l=P([...u,...p],15),m=P(r.tests.slice().reverse(),10),d=P([...(r.activeFiles??[]).slice().reverse(),...r.filesTouched.slice().reverse()],20),g={schema:"toolnet.handoff.v2",version:2,project:{id:t.id,name:t.name},source:{agent:n.agent,nativeSessionId:n.nativeSessionId,sessionKey:n.sessionKey,sequence:e.sequence,reason:e.reason},capturedAt:e.capturedAt??new Date().toISOString(),goal:r.goal,request:r.currentRequest,activity:r.currentActivity,current:{phase:Qr(r.currentPhase),task:Qr(r.currentTask),file:s},completed:{phases:P(o,20),tasks:P(i,30)},remaining:{phases:P(a,20),tasks:P(u,30),todos:l},nextAction:p[0],blockers:P(r.blockers.slice().reverse(),10),decisions:P(r.decisions.slice().reverse(),10),files:{current:s,recent:d,active:P(r.activeFiles??[],10),modified:P(r.modifiedFiles??[],20),created:P(r.createdFiles??[],20),deleted:P(r.deletedFiles??[],20)},tests:{status:ru(r.tests,r.checks),recent:m,checks:(r.checks??[]).slice(-10).map(k=>({kind:k.kind,status:k.status,command:k.command}))},evidence:{commands:P((r.commands??[]).slice().reverse(),20),references:ou([r.currentRequest,r.currentActivity,r.goal,r.plan,...r.decisions,...r.blockers,...r.warnings,...r.nextActions,...r.filesTouched,...r.commands??[],...r.tests,...(r.checks??[]).map(k=>k.command)])},attention:P(e.attention??[],20),progress:r.progress},{capturedAt:S,source:h,...y}=g;return{...g,stateDigest:su(y)}}function cu(e){return!!(e.currentRequest||e.currentActivity||e.goal||e.plan||e.phases.length>0||e.tasks.length>0||e.nextActions.length>0||e.blockers.length>0||e.decisions.length>0||e.filesTouched.length>0)}function es(e,t,n,r,s){if(!cu(n))return null;let o=lt(e,!1),a=[...o?o.rules.filter(l=>l.mode==="enforce").map(l=>l.text):[],...n.warnings].slice(0,20),u=Zr({project:e,identity:t,state:n,reason:r,sequence:s,attention:a}),c=u.stateDigest;return{version:1,id:v([e.id,t.sessionKey,c].join("|")).slice(0,24),projectId:e.id,projectName:e.name,createdAt:new Date().toISOString(),reason:r,sourceSession:{agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,sequence:s},currentRequest:n.currentRequest,currentActivity:n.currentActivity,goal:n.goal,plan:n.plan,progress:n.progress,currentPhase:n.currentPhase,currentTask:n.currentTask,incompletePhases:n.phases.filter(l=>l.status!=="completed"&&l.status!=="cancelled"),incompleteTasks:n.tasks.filter(l=>l.status!=="completed"&&l.status!=="cancelled"),nextActions:u.remaining.todos.slice(0,10),blockers:n.blockers.slice(-10),decisions:n.decisions.slice(-10),warnings:n.warnings.slice(-10),attention:a,filesTouched:n.filesTouched.slice(-20),activeFiles:n.activeFiles?.slice(-10),modifiedFiles:n.modifiedFiles?.slice(-20),createdFiles:n.createdFiles?.slice(-20),deletedFiles:n.deletedFiles?.slice(-20),tests:n.tests.slice(-15),checks:n.checks?.slice(-10),stateDigest:c,continuity:u}}function ts(e,t){let n=Vt(e.rootPath,".toolnet","work","handoffs");au(n,{recursive:!0});let r=Vt(n,`${t.id}.json`);iu(r)||R(r,t),R(Vt(e.rootPath,".toolnet","work","handoff-latest.json"),t)}function ns(e){let t=es(e.project,e.identity,e.state,e.reason,e.sequence);return t?(ts(e.project,t),t):null}var pt=class{constructor(t){this.options=t}options;async capture(t,n){let r=Bt(this.options.project);r||(r=await ot(this.options.project,this.options.storage)),r||(r=await st(this.options.project,this.options.storage));let s=es(this.options.project,this.options.identity,r,t,n);if(!s)return null;ts(this.options.project,s);let o=`projects/${this.options.project.id}/work/handoffs/${s.id}.json`;return await this.options.storage.exists(o)||await this.options.storage.put(o,JSON.stringify(s,null,2)+`
`,"application/json"),await this.options.storage.put(`projects/${this.options.project.id}/work/handoff-latest.json`,JSON.stringify(s,null,2)+`
`,"application/json"),s}};async function rs(e,t){let n=await t.getText(`projects/${e.id}/work/handoff-latest.json`);if(!n)return null;try{return JSON.parse(n)}catch{return null}}import{existsSync as uu,readFileSync as lu,writeFileSync as du}from"node:fs";import{join as pu}from"node:path";var os="<!-- TOOLNET:STABLE-WORK:BEGIN -->",Jt="<!-- TOOLNET:STABLE-WORK:END -->";function Gt(e){switch(e.status){case"completed":return"[x]";case"in_progress":return"[~]";case"blocked":return"[!]";case"cancelled":return"[-]";default:return"[ ]"}}function W(e,t){return t.length?["",`${e}:`,...t.map(n=>`- ${n}`)]:[]}function ss(e,t){return t.length?["",`${e}:`,...t.map(n=>`- ${Gt(n)} ${n.title}`)]:[]}function mu(e){let t=[os,"# ToolNet Stable Work State","",`Updated: ${e.updatedAt}`];return e.lastSession&&t.push(`Last agent: ${e.lastSession.agent}`,`Last session: ${e.lastSession.nativeSessionId}`),e.currentRequest&&t.push("","Current request:",e.currentRequest),e.currentActivity&&t.push("","Current activity:",e.currentActivity),e.goal&&t.push("","Goal:",e.goal),e.plan&&t.push("","Plan:",e.plan),e.currentPhase&&t.push("","Current phase:",`${Gt(e.currentPhase)} ${e.currentPhase.title}`),e.currentTask&&t.push("","Current task:",`${Gt(e.currentTask)} ${e.currentTask.title}`),t.push(...ss("Phases",e.phases)),t.push(...ss("TODO / Tasks",e.tasks)),t.push(...W("Next actions",e.nextActions)),t.push(...W("Blockers",e.blockers)),t.push(...W("Important decisions",e.decisions)),t.push(...W("Active files",e.activeFiles??[])),t.push(...W("Modified files",e.modifiedFiles??[])),t.push(...W("Created files",e.createdFiles??[])),t.push(...W("Deleted files",e.deletedFiles??[])),t.push(...W("Files touched",e.filesTouched)),t.push(...W("Recent commands",e.commands??[])),t.push(...W("Checks",(e.checks??[]).map(n=>`[${n.status}] ${n.kind}: ${n.command}`))),t.push("","Progress:",`- Phases: ${e.progress.phasesCompleted}/${e.progress.phasesTotal}`,`- Tasks: ${e.progress.tasksCompleted}/${e.progress.tasksTotal}`,`- Blocked: ${e.progress.blocked}`,"","Continuation:","- Resume current unfinished task.","- Never redo completed TODO/Phase unless explicitly requested.","- Ask ToolNet Memory for deeper history only when necessary.",Jt),t.join(`
`)}function is(e,t){let n=pu(e.rootPath,".toolnet","current.md"),r="";if(uu(n))try{r=lu(n,"utf8")}catch{r=""}r=r.replace(/<!-- TOOLNET:AUTO-CURRENT:BEGIN -->[\s\S]*?<!-- TOOLNET:AUTO-CURRENT:END -->/gu,"");let s=mu(t),o=r.indexOf(os),i=r.indexOf(Jt),a;o>=0&&i>=o?a=[r.slice(0,o).trimEnd(),s,r.slice(i+Jt.length).trimStart()].filter(Boolean).join(`

`):a=r.trim()?`${r.trim()}

${s}`:s,du(n,`${a.trim()}
`,{encoding:"utf8",mode:384})}import{existsSync as Rf,mkdirSync as fu,readFileSync as Nf,renameSync as gu,writeFileSync as yu}from"node:fs";import{dirname as hu,join as Su}from"node:path";function ku(e){return Su(e.rootPath,".toolnet","context","session-origin.json")}function vu(e,t){fu(hu(e),{recursive:!0});let n=`${e}.tmp-${process.pid}-${Date.now()}`;yu(n,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),gu(n,e)}function mt(e,t){return[...e].filter(n=>n.kind===t).sort((n,r)=>{let s=n.occurredAt.localeCompare(r.occurredAt);return s!==0?s:n.sequence-r.sequence}).at(-1)}function as(e,t){let n=mt(t.observations,"file"),r=mt(t.observations,"next_action"),s=mt(t.observations,"blocker"),o=mt(t.observations,"decision"),i={version:1,projectId:e.id,agent:t.agent,nativeSessionId:t.nativeSessionId,updatedAt:t.workState.updatedAt,currentRequest:t.workState.currentRequest,currentActivity:t.workState.currentActivity,currentTask:t.workState.currentTask?.title,currentPhase:t.workState.currentPhase?.title,lastTouchedFile:n?.text??t.workState.activeFiles?.at(-1)??t.workState.filesTouched.at(-1),latestNextAction:r?.text??t.workState.nextActions.at(-1),latestBlocker:s?.text??t.workState.blockers.at(-1),latestDecision:o?.text??t.workState.decisions.at(-1)};return vu(ku(e),i),i}import{existsSync as cs,mkdirSync as wu,readFileSync as bu}from"node:fs";import{join as Ht}from"node:path";function us(e){return Ht(e.rootPath,".toolnet","memory","checkpoints")}function ls(e){return Ht(us(e),"latest.json")}function xu(e){let t=ls(e);if(!cs(t))return null;try{let n=JSON.parse(bu(t,"utf8"));return n.schema!=="toolnet.memory.checkpoint.v1"||n.project.id!==e.id?null:n}catch{return null}}function Cu(e){return["rule","architecture","decision","fix"].includes(e)}function ju(e,t){return t.length===0?[]:Ve(e,t).candidates.filter(r=>Cu(r.kind)&&r.knowledgeClass!=="transient"&&r.importanceScore>=.65).map(r=>({fingerprint:r.fingerprint,kind:r.kind,content:r.content,knowledgeClass:r.knowledgeClass,importanceScore:r.importanceScore,confidence:r.confidence,createdAt:r.createdAt,agent:e.agent,nativeSessionId:e.nativeSessionId}))}function Iu(e,t){let n=new Map;for(let r of[...e,...t]){let s=n.get(r.fingerprint);(!s||r.importanceScore>s.importanceScore)&&n.set(r.fingerprint,r)}return Array.from(n.values()).sort((r,s)=>s.importanceScore-r.importanceScore||s.createdAt.localeCompare(r.createdAt)).slice(0,80)}function Au(e){return{request:e.currentRequest,activity:e.currentActivity,goal:e.goal,phase:e.currentPhase?{title:e.currentPhase.title,status:e.currentPhase.status}:void 0,task:e.currentTask?{title:e.currentTask.title,status:e.currentTask.status}:void 0,phases:e.phases.map(t=>({title:t.title,status:t.status})),tasks:e.tasks.map(t=>({title:t.title,status:t.status})),activeFiles:e.activeFiles??[],modifiedFiles:e.modifiedFiles??[],createdFiles:e.createdFiles??[],deletedFiles:e.deletedFiles??[],checks:e.checks??[],blockers:e.blockers,decisions:e.decisions,nextActions:e.nextActions}}function ds(e,t,n,r){let s=xu(e),o=Iu(s?.durableFacts??[],ju(t,n)),i=n.at(-1)?.sequence??s?.source.sequence??0,a=r.phases.filter(h=>h.status==="completed").map(h=>h.title),u=r.tasks.filter(h=>h.status==="completed").map(h=>h.title),c=r.phases.filter(h=>h.status!=="completed"&&h.status!=="cancelled").map(h=>h.title),p=r.tasks.filter(h=>h.status!=="completed"&&h.status!=="cancelled").map(h=>h.title),l={work:Au(r),durableFacts:o.map(h=>h.fingerprint).sort()},m=v(JSON.stringify(l)).slice(0,32),d={schema:"toolnet.memory.checkpoint.v1",version:1,project:{id:e.id,name:e.name},source:{agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,sequence:i},capturedAt:new Date().toISOString(),request:r.currentRequest,activity:r.currentActivity,goal:r.goal,current:{phase:r.currentPhase,task:r.currentTask},completed:{phases:a,tasks:u},remaining:{phases:c,tasks:p},files:{active:r.activeFiles??[],modified:r.modifiedFiles??[],created:r.createdFiles??[],deleted:r.deletedFiles??[]},checks:r.checks??[],blockers:r.blockers.slice(-10),decisions:r.decisions.slice(-15),nextActions:r.nextActions.slice(0,10),durableFacts:o,stateDigest:m},g=us(e);wu(g,{recursive:!0,mode:448});let S=Ht(g,`${m}.json`);return cs(S)||R(S,d),R(ls(e),d),d}function ps(e,t,n){if(process.env.TOOLNET_LOCAL_CHECKPOINT==="0"||n.length===0)return{updated:!1,observations:0};let r=nt(t,n);if(r.length===0)return{updated:!1,observations:0};let s=Xr(e,r);is(e,s),as(e,{agent:t.agent,nativeSessionId:t.nativeSessionId,observations:r,workState:s});try{ds(e,t,n,s)}catch{}try{ns({project:e,identity:t,state:s,reason:"continuous-checkpoint",sequence:n.at(-1)?.sequence??0})}catch{}return{updated:!0,observations:r.length}}var Ee=class{identity;wal;remote;sanitizer=new H;learner;continuity;semantic;handoff;project;title;metadata;constructor(t){this.project=t.project,this.identity=hn(t.project,t.agent,t.nativeSessionId),this.title=t.title,this.metadata=this.sanitizer.sanitizeValue(t.metadata??{}),this.wal=new We(this.identity,t.eventContext),this.remote=new Le(t.storage,t.maxEventsPerChunk??100,t.maxChunkBytes??512*1024),this.learner=new et({project:t.project,storage:t.storage,identity:this.identity,wal:this.wal}),this.continuity=new it({project:t.project,storage:t.storage,identity:this.identity,wal:this.wal}),this.semantic=new ct({project:t.project,storage:t.storage,identity:this.identity,wal:this.wal}),this.handoff=new pt({project:t.project,storage:t.storage,identity:this.identity})}sanitizeEvent(t){let n=t.provenance?{...t.provenance,metadata:this.sanitizer.sanitizeValue(t.provenance.metadata)}:void 0;return{...t,data:this.sanitizer.sanitizeValue(t.data??{}),provenance:n}}checkpointLocal(t){if(t.length!==0)try{ps(this.project,this.identity,t)}catch{}}start(t={}){let n=this.wal.loadState();return this.record({type:n.lastSequence===0?"session_start":"session_resume",data:t,provenance:{source:this.identity.agent}})}record(t){let n=this.wal.append([this.sanitizeEvent(t)]);return this.checkpointLocal(n),n[0]}recordMany(t){let n=this.wal.append(t.map(r=>this.sanitizeEvent(r)));return this.checkpointLocal(n),n}setSourceCursor(t,n){this.wal.setSourceCursor(t,n)}async flush(){let t=this.wal.readPending(),n=this.wal.loadState(),r=await this.remote.append(this.identity,t.events,n.sourceCursors,{title:this.title,metadata:this.metadata});if(t.events.length>0){let s=t.events[t.events.length-1];this.wal.markRemote(s.sequence,t.endOffset)}if(process.env.TOOLNET_SESSION_LEARNING!=="0")try{await this.learner.learnNew()}catch{}if(process.env.TOOLNET_WORK_CONTINUITY!=="0")try{await this.continuity.learnNew()}catch{}if(process.env.TOOLNET_SEMANTIC_CONTINUITY!=="0")try{await this.semantic.learnNew()}catch{}if(process.env.TOOLNET_SMART_HANDOFF!=="0"&&t.events.length>0)try{let s=t.events[t.events.length-1],o=["session_idle","session_end","session_compact"].includes(s.type)?s.type:"checkpoint";await this.handoff.capture(o,s.sequence)}catch{}return r}async idle(t={}){return this.record({type:"session_idle",data:t,provenance:{source:this.identity.agent}}),this.flush()}async end(t={}){return this.record({type:"session_end",data:t,provenance:{source:this.identity.agent}}),this.flush()}status(){return this.wal.loadState()}recoverRemote(){return this.remote.recover(this.identity)}};var Eu=[/^<SYSTEM MESSAGE>/i,/^<EPHEMERAL MESSAGE>/i,/^<system>/i,/^<ephemeral>/i,/^ManageTask:/i,/^Task \d+ status:/i,/^Task \d+ killed/i,/^Task \d+ loading/i,/^Thought for \d+ tokens/i,/^Prioritizing Tool Usage/i,/^Tool call:/i,/^Tool response:/i,/^npm notice/i,/^npm WARN/i,/^added \d+ packages/i,/^removed \d+ packages/i,/^up to date/i,/^\d+ packages are looking for funding/i,/^run `npm fund` for details/i,/^[\d.]+%/,/^\[={10,}\]/,/^Loading\.\.\./i,/^Processing\.\.\./i,/^bash-\d+\.\d+\$/,/^\$ /,/^\s*$/],Pu=[/api[_-]?key[:\s=]+[^\s]+/gi,/token[:\s=]+[^\s]+/gi,/secret[:\s=]+[^\s]+/gi,/password[:\s=]+[^\s]+/gi,/bearer\s+[^\s]+/gi,/authorization:\s*[^\s]+/gi],Ou=["decision","decided","rule","convention","architecture","pattern","fixed","resolved","implemented","created","updated","deleted","deployed","blocker","blocked","issue","bug","error","next","todo","action","requirement","must","should","important"];function Mu(e){let t=e.toLowerCase();return Ou.some(n=>t.includes(n))}function Tu(e){if(!e.trim())return!0;for(let t of Eu)if(t.test(e))return!0;return Mu(e),!1}function Ru(e){let t=e;for(let n of Pu)t=t.replace(n,r=>{let s=r.split(/[:\s=]+/);return s.length>1?`${s[0]}: [REDACTED]`:"[REDACTED]"});return t}function Ut(e){let t=e.trim();return t?Tu(t)?{content:"",filtered:!0,reason:"noise"}:{content:Ru(t),filtered:!1}:{content:"",filtered:!0,reason:"empty"}}function ft(e){let t={};for(let[n,r]of Object.entries(e))if(typeof r=="string"){let s=Ut(r);s.filtered||(t[n]=s.content)}else r&&typeof r=="object"&&!Array.isArray(r)?t[n]=ft(r):Array.isArray(r)?t[n]=r.map(s=>{if(typeof s=="string"){let o=Ut(s);return o.filtered?null:o.content}return s&&typeof s=="object"?ft(s):s}).filter(s=>s!==null):t[n]=r;return t}function ms(e){let t=typeof e.type=="string"?e.type.toLowerCase():"";if(t.includes("system")||t.includes("ephemeral")||t==="tool_call"&&!e.result)return!0;if(e.data&&typeof e.data=="object"){let n=e.data,r=typeof n.content=="string"?n.content:"";if(r&&Ut(r).filtered)return!0}return!1}function vs(){try{let t=_u("opencode",["db","path"],{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:5e3}).trim();if(t)return t}catch{}if(process.env.OPENCODE_DB)return process.env.OPENCODE_DB;let e=process.env.XDG_DATA_HOME??fs($u(),".local","share");return fs(e,"opencode","opencode.db")}function x(e){return typeof e=="string"?e:""}function ne(e){if(typeof e=="number"&&Number.isFinite(e))return e;if(typeof e=="bigint")return Number(e);if(typeof e=="string"){let t=Number(e);if(Number.isFinite(t))return t}return 0}function yt(e){if(e&&typeof e=="object"&&!Buffer.isBuffer(e))return e;if(typeof e!="string")return{};try{let t=JSON.parse(e);if(t&&typeof t=="object"&&!Array.isArray(t))return t}catch{}return{}}function ae(e){let t=ne(e);if(t<=0)return new Date().toISOString();t<1e11&&(t*=1e3);let n=new Date(t);return Number.isNaN(n.getTime())?new Date().toISOString():n.toISOString()}function gt(e,t){if(!t)return!1;let n=gs(e),r=gs(t);if(n===r)return!0;let s=Fu(n,r);return s!==""&&s!==".."&&!s.startsWith(`..${process.platform==="win32"?"\\":"/"}`)&&!Ku(s)}function ys(e){if(!e)return{time:-1,id:""};try{let t=JSON.parse(e);return{time:typeof t.time=="number"?t.time:-1,id:typeof t.id=="string"?t.id:""}}catch{return{time:-1,id:""}}}function hs(e){return JSON.stringify(e)}function ws(e){if(!Nu(e))throw new Error(`OpenCode database not found: ${e}`);let t=new Lu(e,{readOnly:!0});return t.exec("PRAGMA query_only = ON"),t.exec("PRAGMA busy_timeout = 3000"),t}function Wu(e,t){let n=e.prepare(`
      SELECT *
      FROM "session"
      WHERE id = ?
      LIMIT 1
      `).get(t);if(!n)throw new Error(`OpenCode session not found: ${t}`);return n}function bs(e,t,n){let r=x(t.directory);if(r&&gt(n.rootPath,r))return!0;let s=x(t.project_id);if(s){try{let o=e.prepare(`
          SELECT *
          FROM "project"
          WHERE id = ?
          LIMIT 1
          `).get(s);if(o)for(let i of["worktree","directory","path"]){let a=x(o[i]);if(a&&gt(n.rootPath,a))return!0}}catch{}try{if(e.prepare(`
          SELECT directory
          FROM "project_directory"
          WHERE project_id = ?
          `).all(s).some(i=>gt(n.rootPath,x(i.directory))))return!0}catch{}}try{let o=e.prepare(`
        SELECT data
        FROM "message"
        WHERE session_id = ?
        ORDER BY time_created DESC
        LIMIT 20
        `).all(x(t.id));for(let i of o){let a=yt(i.data),u=a.path&&typeof a.path=="object"?a.path:{};for(let c of[x(u.cwd),x(u.root)])if(c&&gt(n.rootPath,c))return!0}}catch{}return!1}function Ss(e,t,n,r){let s=`
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
    `;return e.prepare(s).all(n,r.time,r.time,r.id)}function ks(e,t){let n=e[e.length-1];return n?{time:ne(n.__clock),id:x(n.id)}:t}function Du(e,t){let n=yt(t.data),r=x(n.role),s=ne(t.__clock),o=x(t.id),i="message";return r==="user"?i="user_prompt":r==="assistant"&&(i="assistant_message"),{clock:s,order:0,event:{type:i,timestamp:ae(s),role:r||void 0,sourceEventId:`message:${o}:${s}`,sourceSequence:`${s}:${o}`,data:{messageId:o,...n},provenance:{source:"opencode",sourcePath:e,sourceTable:"message",sourceRowId:o,sourceOffset:`${s}:${o}`}}}}function zu(e){let t={...e},n=e.state&&typeof e.state=="object"&&!Array.isArray(e.state)?{...e.state}:void 0;if(n){let r=n.output;if(typeof r=="string"){let s=r.replace(/\r\n/g,`
`),o=500;n.outputSummary=s.length<=o?s:`${s.slice(0,350)}
...[ToolNet truncated ${s.length-o} chars]...
${s.slice(-150)}`,delete n.output}else r!==void 0&&(n.outputSummary="[non-text tool output omitted]",delete n.output);if(n.input&&typeof n.input=="object"&&!Array.isArray(n.input)){let s={...n.input};for(let[o,i]of Object.entries(s))typeof i=="string"&&i.length>1e3&&(s[o]=`${i.slice(0,1e3)}...[ToolNet truncated]`);n.input=s}t.state=n}return t}function qu(e,t){let n=x(t.message_id);if(n)try{let r=e.prepare(`
        SELECT data
        FROM "message"
        WHERE id = ?
        LIMIT 1
        `).get(n);if(!r)return;let s=yt(r.data);return x(s.role)||void 0}catch{return}}function Bu(e,t,n){let r=yt(n.data),s=x(r.type),o=ne(n.__clock),i=x(n.id),a=x(n.message_id),u=qu(e,n),c="message_part";return s==="tool"?c="tool_call":s==="snapshot"&&(c="artifact"),{clock:o,order:1,event:{type:c,timestamp:ae(o),role:u,sourceEventId:`part:${i}:${o}`,sourceSequence:`${o}:${i}`,data:{partId:i,messageId:a,...s==="tool"?zu(r):r},provenance:{source:"opencode",sourcePath:t,sourceTable:"part",sourceRowId:i,sourceOffset:`${o}:${i}`}}}}async function Yt(e){let t=e.dbPath??vs(),n=ws(t);try{let r;try{r=Wu(n,e.nativeSessionId)}catch{let y=new Ee({project:e.project,storage:e.storage,agent:"opencode",nativeSessionId:e.nativeSessionId,metadata:{source:"opencode.db",deleted:!0},eventContext:{source:"opencode",cwd:e.project.rootPath}});y.status().lastSequence===0&&y.recordMany([{type:"custom",timestamp:new Date().toISOString(),sourceEventId:`session:${e.nativeSessionId}:deleted`,data:{event:"session_deleted"},provenance:{source:"opencode"}}]);let k=await y.flush();return{nativeSessionId:e.nativeSessionId,importedMessages:0,importedParts:0,recordedEvents:0,eventCount:k.eventCount,chunkCount:k.chunkCount,status:k.status,durability:e.localOnly?"local":"remote"}}if(!bs(n,r,e.project))throw new Error(["OpenCode session does not belong to current ToolNet project.",`Session: ${e.nativeSessionId}`,`Project: ${e.project.rootPath}`,`Session directory: ${x(r.directory)||"unknown"}`].join(" "));let s=new Ee({project:e.project,storage:e.storage,agent:"opencode",nativeSessionId:e.nativeSessionId,title:x(r.title)||void 0,metadata:{source:"opencode.db",openCodeProjectId:x(r.project_id)||void 0,directory:x(r.directory)||void 0},eventContext:{source:"opencode",cwd:x(r.directory)||e.project.rootPath}}),o=s.status(),i=ys(o.sourceCursors["opencode.message"]),a=ys(o.sourceCursors["opencode.part"]),u=Ss(n,"message",e.nativeSessionId,i),c=Ss(n,"part",e.nativeSessionId,a),p=[];if(o.lastSequence===0){let y=ne(r.time_created);p.push({clock:y,order:-1,event:{type:"session_start",timestamp:ae(y),sourceEventId:`session:${e.nativeSessionId}:created:${y}`,data:{title:x(r.title)||void 0,directory:x(r.directory)||void 0,openCodeProjectId:x(r.project_id)||void 0},provenance:{source:"opencode",sourcePath:t,sourceTable:"session",sourceRowId:e.nativeSessionId}}})}p.push(...u.map(y=>Du(t,y))),p.push(...c.map(y=>Bu(n,t,y)));let l=ne(r.time_updated)||ne(r.time_created);e.compacted&&p.push({clock:l,order:98,event:{type:"session_compact",timestamp:ae(l),sourceEventId:`session:${e.nativeSessionId}:compact:${l}`,data:{},provenance:{source:"opencode"}}}),e.error?p.push({clock:l,order:99,event:{type:"error",timestamp:ae(l),sourceEventId:`session:${e.nativeSessionId}:error:${l}`,data:{source:"session.error"},provenance:{source:"opencode"}}}):e.idle&&p.push({clock:l,order:100,event:{type:"session_idle",timestamp:ae(l),sourceEventId:`session:${e.nativeSessionId}:idle:${l}`,data:{},provenance:{source:"opencode"}}}),p.sort((y,k)=>y.clock-k.clock||y.order-k.order);let m=p.filter(y=>!ms(y.event.data)).map(y=>({...y,event:{...y.event,data:ft(y.event.data)}})),d=s.recordMany(m.map(y=>y.event)),g=ks(u,i),S=ks(c,a);if(s.setSourceCursor("opencode.message",hs(g)),s.setSourceCursor("opencode.part",hs(S)),m.length>0)try{let y=m.map(I=>JSON.stringify(I.event.data)),k=Be(y,e.nativeSessionId);s.setSourceCursor("opencode.session.summary",k.summary),s.setSourceCursor("opencode.session.facts_count",k.durableFacts.length),Kn()&&!Wn()&&s.setSourceCursor("opencode.raw_transcript.archived","local")}catch{}if(e.localOnly){let y=s.status();return{nativeSessionId:e.nativeSessionId,importedMessages:u.length,importedParts:c.length,recordedEvents:d.length,eventCount:y.lastSequence,chunkCount:0,status:y.status,durability:"local"}}let h=await s.flush();return{nativeSessionId:e.nativeSessionId,importedMessages:u.length,importedParts:c.length,recordedEvents:d.length,eventCount:h.eventCount,chunkCount:h.chunkCount,status:h.status,durability:"remote"}}finally{n.close()}}async function xs(e){let t=e.dbPath??vs(),n=ws(t),r=[];try{let o=n.prepare(`
        SELECT *
        FROM "session"
        ORDER BY
          COALESCE(
            time_updated,
            time_created,
            0
          ) DESC
        `).all();for(let i of o){if(!bs(n,i,e.project))continue;let a=x(i.id);if(a&&r.push(a),r.length>=(e.limit??100))break}}finally{n.close()}let s=[];for(let o of r)s.push(await Yt({project:e.project,storage:e.storage,nativeSessionId:o,dbPath:t}));return s}import{existsSync as Ju,mkdirSync as Es,readFileSync as Gu,writeFileSync as Ps}from"node:fs";import{join as Is}from"node:path";import{homedir as Cs}from"node:os";import{join as re}from"node:path";function ht(e={}){let t=process.env.OPENCODE_CONFIG_DIR?.trim();if(t)return t;let n=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return n?re(n,"opencode"):re(e.home??Cs(),".config","opencode")}function Pe(e={}){let t=process.env.OPENCODE_CONFIG?.trim();if(t)return t;let n=e.home??Cs(),r=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return r?re(r,"opencode","opencode.json"):re(n,".config","opencode","opencode.json")}function Oe(e={}){let t=e.cwd??process.cwd();return re(t,"opencode.json")}function St(e={}){return re(ht(e),"plugins")}function kt(e={}){return re(ht(e),"AGENTS.md")}var Vu="memory_agent_ask";function js(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${Vu}

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
- NEVER read/list/search .toolnet/runtime/sources/** and legacy .toolnet/sessions/**, session state.json,
  events.jsonl, or raw transcripts to discover previous-agent state.
- Do not search the filesystem for the implementation/schema of
  memory_agent_ask. Invoke the MCP tool directly when deeper
  continuity is required.
- Do not dump raw transcripts or full memory.
- After receiving the ToolNet answer, continue the task
  instead of asking the user to repeat known context.
- If ToolNet says information is not recorded, say so.
`.trim()}var As="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",Xt="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function Hu(e={}){let t=kt();Es(ht(),{recursive:!0});let n=`${As}
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


${js()}

${Xt}`,r=Ju(t)?Gu(t,"utf8"):"",s=r.indexOf(As),o=r.indexOf(Xt);return s>=0&&o>=s?r=r.slice(0,s)+n+r.slice(o+Xt.length):(r=r.trimEnd(),r&&(r+=`

`),r+=n),Ps(t,r.trimEnd()+`
`,{encoding:"utf8",mode:384}),t}function Os(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=[];n.push(Hu({cwd:e.cwd}));let r=e.scope??"global",s=[];if((r==="global"||r==="both")&&s.push(e.directory??St()),r==="project"||r==="both"){let o=e.cwd??process.cwd();s.push(Is(o,".opencode","plugins"))}for(let o of s){Es(o,{recursive:!0});let i=Is(o,"toolnet-memory.js"),a=`
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
`;Ps(i,a.trimStart(),{encoding:"utf8",mode:384}),n.push(i)}return n}import{existsSync as Rs,mkdirSync as Uu,readFileSync as Yu,renameSync as Xu,writeFileSync as Qu}from"node:fs";import{dirname as Ns,join as Zu}from"node:path";function Me(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function el(e,t){Uu(Ns(e),{recursive:!0});let n=`${e}.tmp-${process.pid}-${Date.now()}`;Qu(n,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Xu(n,e)}function Ms(e){if(!Rs(e))return{};let t=Yu(e,"utf8").trim();if(!t)return{};let n;try{n=JSON.parse(t)}catch{throw new Error(`Invalid existing OpenCode config at ${e}: parse error. Not overwriting.`)}if(!Me(n))throw new Error(`Invalid existing OpenCode config at ${e}: root must be a JSON object. Not overwriting.`);return n}function Ts(e,t){if(!Me(e))return!1;let n=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(n)&&n.length===2&&n[0]===t&&n[1]==="mcp"}function vt(e,t,n,r){let s=Zu(Ns(e),"opencode.jsonc"),o=Rs(s)?s:void 0,i=Ms(e),a=i.mcp;if(a!==void 0&&!Me(a))throw new Error(`Invalid existing OpenCode config: mcp must be an object in ${e}.`);let u=Me(a)?{...a}:{},c=u[n];if(Ts(c,t)&&!r)return{installed:!0,changed:!1,preservedJsonc:o};u[n]={type:"local",command:[t,"mcp"],enabled:!0};let p={...i,mcp:u};el(e,p);let l=Ms(e);if(!Me(l.mcp)||!Ts(l.mcp[n],t))throw new Error(`OpenCode MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0,preservedJsonc:o}}function _s(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...vt(e.configFile,t,n,e.force??!1),configFile:e.configFile,serverName:n,command:[t,"mcp"]};if(r==="both"){let i=Pe(),a=Oe({cwd:e.cwd}),u=vt(i,t,n,e.force??!1),c=vt(a,t,n,e.force??!1);return{installed:!0,changed:u.changed||c.changed,configFile:i,serverName:n,command:[t,"mcp"],preservedJsonc:u.preservedJsonc??c.preservedJsonc}}let s=r==="project"?Oe({cwd:e.cwd}):Pe();return{...vt(s,t,n,e.force??!1),configFile:s,serverName:n,command:[t,"mcp"]}}import{existsSync as $g,mkdirSync as sl,readFileSync as Kg,writeFileSync as ol}from"node:fs";import{dirname as il,join as Ks}from"node:path";function Qt(e){if(!e)return 0;let t=Array.from(e).length,n=e.trim().split(/\s+/u).filter(Boolean).length;return Math.ceil(Math.max(t/3.5,n*1.3))}function j(e,t){let n=e.replace(/\s+/g," ").trim();return n.length<=t?n:n.slice(0,Math.max(0,t-1)).trimEnd()+"\u2026"}function tl(e){let t=[],n=!1;for(let r of e.split(/\r?\n/u)){let s=r.trim();if(s.includes("<!--")&&(n=!0),n){s.includes("-->")&&(n=!1);continue}let o=s.toLowerCase();if(!(!s||s.startsWith("#")||s==="```"||o.startsWith("- [enforce]")||o.startsWith("* [enforce]")||o.startsWith("- [advisory]")||o.startsWith("* [advisory]"))&&(s=s.replace(/^[-*]\s+/u,""),s&&t.push(j(s,280)),t.length>=16))break}return t}function nl(e){let t=[],n=[];for(let r of e.split(/\\r?\\n/u)){let s=r.trim(),o=s.toLowerCase(),a=["- [enforce]","* [enforce]","- [advisory]","* [advisory]"].find(c=>o.startsWith(c));if(!a)continue;let u=s.slice(a.length).trim();u&&(a.includes("enforce")?t.push(u):n.push(u))}return{enforce:t,advisory:n}}function rl(e,t){let n=[];for(let r of e){let s=[...n,r].join(`
`);if(Qt(s)<=t){n.push(r);continue}let o=Qt(n.join(`
`)),i=Math.max(0,t-o);if(i>=16){let a=Math.floor(i*3.2),u=j(r,a);u&&n.push(u)}break}return n.join(`
`).trim()}async function $s(e){let t=Math.max(256,Math.min(2e3,e.maxTokens??1e3)),n=lt(e.project,!1),r=n?.content??"";r||(r=await e.storage.getText(`projects/${e.project.id}/project/manual.md`)??"");let s=nl(r),o=n?n.rules.filter(d=>d.mode==="enforce").map(d=>d.text):s.enforce,i=n?n.rules.filter(d=>d.mode==="advisory").map(d=>d.text):s.advisory,a=r?tl(r):[],u=await ot(e.project,e.storage),c=await Dr(e.project,e.storage),p=await rs(e.project,e.storage),l=[];if(l.push("[TOOLNET PROJECT CONTEXT]"),l.push(`Project: ${e.project.name}`),l.push("Continue existing project state. Do not restart completed work unless evidence shows it is necessary."),r&&l.push(`Full operating manual: ${ut(e.project)}`),o.length){l.push("","PROJECT RULES \u2014 MUST FOLLOW");for(let d of o.slice(0,24))l.push(`- [ENFORCE] ${j(d,240)}`)}if(i.length){l.push("","PROJECT PREFERENCES");for(let d of i.slice(0,10))l.push(`- ${j(d,220)}`)}if(c&&(c.mission&&l.push("","MISSION",j(c.mission.value,420)),c.activeObjective&&l.push("","CURRENT OBJECTIVE",j(c.activeObjective.value,420)),c.why&&l.push("","WHY THIS WORK MATTERS",j(c.why.value,420)),c.desiredOutcome&&l.push("","DESIRED OUTCOME",j(c.desiredOutcome.value,420)),c.planRationale&&l.push("","WHY THIS APPROACH",j(c.planRationale.value,420))),u){if(l.push("","ACTIVE WORK"),u.goal&&l.push(`Goal: ${j(u.goal,320)}`),u.plan&&l.push(`Plan: ${j(u.plan,320)}`),l.push(`Progress: phases ${u.progress.phasesCompleted}/${u.progress.phasesTotal}; tasks ${u.progress.tasksCompleted}/${u.progress.tasksTotal}; blocked ${u.progress.blocked}`),u.currentPhase&&l.push(`Current phase: ${u.currentPhase.title} [${u.currentPhase.status}]`),u.currentPhase&&c){let d=c.phases.find(g=>g.order===u.currentPhase?.order);d&&(d.objective&&l.push(`Phase objective: ${j(d.objective.value,340)}`),d.why?l.push(`Why this phase: ${j(d.why.value,340)}`):l.push("Why this phase: not explicitly recorded. Inspect existing implementation before assuming intent."),d.deliverable&&l.push(`Deliverable: ${j(d.deliverable.value,340)}`),d.dependencies.length&&l.push(`Depends on: ${d.dependencies.slice(0,4).map(g=>j(g.value,180)).join("; ")}`),d.acceptanceCriteria.length&&(l.push("","DEFINITION OF DONE"),d.acceptanceCriteria.slice(0,6).forEach(g=>{l.push(`- ${j(g.value,260)}`)})),d.openQuestions.length&&(l.push("","OPEN QUESTIONS FOR CURRENT PHASE"),d.openQuestions.slice(0,4).forEach(g=>{l.push(`- ${j(g.value,260)}`)})))}u.currentTask&&l.push(`Current task: ${u.currentTask.title} [${u.currentTask.status}]`),u.nextActions.length&&(l.push("","NEXT ACTIONS"),u.nextActions.slice(0,6).forEach((d,g)=>{l.push(`${g+1}. ${j(d,260)}`)})),u.blockers.length&&(l.push("","BLOCKERS"),u.blockers.slice(0,5).forEach(d=>{l.push(`- ${j(d,260)}`)})),u.warnings.length&&(l.push("","ATTENTION"),u.warnings.slice(-5).forEach(d=>{l.push(`- ${j(d,260)}`)})),u.decisions.length&&(l.push("","RECENT DECISIONS"),u.decisions.slice(-5).forEach(d=>{l.push(`- ${j(d,260)}`)})),u.lastSession&&l.push("",`Last work session: ${u.lastSession.agent} / ${u.lastSession.nativeSessionId}`)}if(c&&c.openQuestions.length&&(l.push("","UNRESOLVED QUESTIONS"),c.openQuestions.slice(0,5).forEach(d=>{l.push(`- ${j(d.value,260)}`)})),p&&l.push(`Latest handoff: ${p.reason} / ${p.sourceSession.agent}`),a.length){l.push("","OPERATING NOTES");for(let d of a)l.push(`- ${d}`)}l.push("","Before changing anything: verify the current repository state and continue from the active phase/task above.");let m=rl(l,t);return{version:1,projectId:e.project.id,projectName:e.project.name,text:m,estimatedTokens:Qt(m),maxTokens:t,hasManual:!!r,hasWorkState:!!u,hasHandoff:!!p,generatedAt:new Date().toISOString()}}function al(e){return Ks(e.rootPath,".toolnet","context","startup.md")}function cl(e){return Ks(e.rootPath,".toolnet","context","startup.json")}function ul(e,t){let n=al(e);sl(il(n),{recursive:!0}),ol(n,t.text.endsWith(`
`)?t.text:t.text+`
`,{encoding:"utf8",mode:384}),R(cl(e),t)}async function Fs(e,t,n=800){let s=(await $s({project:e,storage:t,maxTokens:n})).text;ze(s)>n&&(s=qe(s,n),s+=`

[Context trimmed by ToolNet Memory token budget]
`);let i={version:1,projectId:e.id,projectName:e.name,text:s,digest:v(s),estimatedTokens:ze(s),generatedAt:new Date().toISOString()};return ul(e,i),await t.put(`projects/${e.id}/context/startup.md`,i.text+`
`,"text/markdown"),await t.put(`projects/${e.id}/context/startup.json`,JSON.stringify(i,null,2)+`
`,"application/json"),i}function ue(e,t){let n=e.indexOf(t);if(!(n<0))return e[n+1]}function le(e,t){return e.includes(t)}function dl(e){let t=Te(),n=dn(un({provider:t.storage.provider,huggingface:t.storage.huggingface,localRoot:t.storage.localRoot}),{attempts:3});return new Fe(n,e.id,e.name,e.remote??e.name)}function pl(){return Zt("sh",["-lc","command -v opencode >/dev/null 2>&1"],{stdio:"ignore"}).status===0}function ml(){try{return Zt("opencode",["--version"],{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:5e3}).stdout?.trim()||void 0}catch{return}}function fl(){try{let e=Zt("opencode",["mcp","list","--format","json"],{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:1e4});if(e.status!==0)return{available:!1,servers:[]};let t=JSON.parse(e.stdout||"[]");return{available:!0,servers:Array.isArray(t)?t.map(r=>String(r.name||r.id||"")):[]}}catch{return{available:!1,servers:[]}}}function gl(e){let t=[],n=pl();n||t.push("opencode binary not found");let r=ml(),s=Pe(),o=ce(s),i=Oe({cwd:e}),a=ce(i),u=process.env.OPENCODE_CONFIG?.trim(),c=u?ce(u):!1,p=!1;if(o)try{p=!!JSON.parse(Ls(s,"utf8")).mcp?.["toolnet-memory"]}catch{}let l=!1;if(a)try{l=!!JSON.parse(Ls(i,"utf8")).mcp?.["toolnet-memory"]}catch{}let m=St(),d=ce(`${m}/toolnet-memory.js`),g=ll(e??process.cwd(),".opencode","plugins"),S=ce(`${g}/toolnet-memory.js`),h=kt(),y=ce(h),k;return n&&(k=fl()),{opencodeBinaryDetected:n,version:r,globalConfigExists:o,projectConfigExists:a,customConfigExists:c,globalMcpReady:p,projectMcpReady:l,globalPluginExists:d,projectPluginExists:S,continuityInstructions:y,mcpConnectionStatus:k,errors:t}}async function yl(){let[e="help",...t]=process.argv.slice(2),n=le(t,"--json"),r=le(t,"--force"),s=ue(t,"--scope")??"global",o=ue(t,"--project")??process.cwd();if(e==="status"){let c=gl(o);if(n)console.log(JSON.stringify(c,null,2));else if(console.log("OpenCode Integration"),console.log("===================="),console.log(""),console.log(`Binary detected     : ${c.opencodeBinaryDetected?"\u2713":"\u2717"}`),c.version&&console.log(`Version             : ${c.version}`),console.log(`Global config       : ${c.globalConfigExists?"\u2713":"\u2717"}`),console.log(`Project config      : ${c.projectConfigExists?"\u2713":"\u2717"}`),c.customConfigExists&&console.log(`Custom config       : \u2713 (${process.env.OPENCODE_CONFIG})`),console.log(`Global MCP          : ${c.globalMcpReady?"\u2713":"\u2717"}`),console.log(`Project MCP         : ${c.projectMcpReady?"\u2713":"\u2717"}`),console.log(`Global plugin       : ${c.globalPluginExists?"\u2713":"\u2717"}`),console.log(`Project plugin      : ${c.projectPluginExists?"\u2713":"\u2717"}`),console.log(`Continuity rules    : ${c.continuityInstructions?"\u2713":"\u2717"}`),c.mcpConnectionStatus&&(console.log(`MCP connection      : ${c.mcpConnectionStatus.available?"\u2713":"\u2717"}`),c.mcpConnectionStatus.servers.length>0&&console.log(`  Servers           : ${c.mcpConnectionStatus.servers.join(", ")}`)),c.errors.length>0){console.log("");for(let p of c.errors)console.log(`  \u26A0 ${p}`)}c.opencodeBinaryDetected||(process.exitCode=1);return}if(e==="install-plugin"){let c=_s({binary:ue(t,"--bin"),scope:s,cwd:o,force:r}),p=Os({binary:ue(t,"--bin"),scope:s,cwd:o});if(n)console.log(JSON.stringify({mcp:c,pluginFiles:p},null,2));else{console.log(`\u2705 OpenCode integration installed (scope: ${s})`),console.log(`  MCP config: ${c.configFile}`),c.changed?console.log(`  \u2713 MCP server "${c.serverName}" added`):console.log(`  \u2713 MCP server "${c.serverName}" already configured`);for(let l of p)console.log(`  \u2713 ${l}`);console.log(""),console.log("OpenCode will load plugins automatically on next start."),console.log("Verify MCP with: opencode mcp list")}return}let i=new Ne().detect(o),a=dl(i),u=ue(t,"--db");if(e==="sync"){let c=t.find(S=>!S.startsWith("--")&&S!==o&&S!==u);if(!c)throw new Error("Usage: session:opencode-sync <session-id>");let p=le(t,"--idle"),l=le(t,"--error"),m=le(t,"--compacted"),d=le(t,"--local-only"),g=await Yt({project:i,storage:a,nativeSessionId:c,dbPath:u,idle:p,error:l,compacted:m,localOnly:d});if(!d&&(p||m||l))try{await Fs(i,a,800)}catch{}console.log(JSON.stringify(g,null,2));return}if(e==="recover"){let c=ue(t,"--limit"),p=c?Number(c):100,l=await xs({project:i,storage:a,dbPath:u,limit:Number.isFinite(p)?p:100});console.log(JSON.stringify({project:i.name,sessions:l.length,importedMessages:l.reduce((m,d)=>m+d.importedMessages,0),importedParts:l.reduce((m,d)=>m+d.importedParts,0)},null,2));return}console.log(`OpenCode Session Adapter

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
`)}yl().catch(e=>{console.error(e instanceof Error?e.message:e),process.exit(1)});
