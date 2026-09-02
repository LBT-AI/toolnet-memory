import{existsSync as me,readFileSync as Is}from"node:fs";import{join as Od}from"node:path";import{spawnSync as xn}from"node:child_process";import{existsSync as Ms,readFileSync as As}from"node:fs";import{homedir as Es}from"node:os";import{join as Ps}from"node:path";function Os(e){let t=e.trim();return t.length>=2&&t.startsWith('"')&&t.endsWith('"')?(t=t.slice(1,-1),t.replace(/\\n/g,`
`).replace(/\\r/g,"\r").replace(/\\t/g,"	").replace(/\\"/g,'"').replace(/\\\\/g,"\\")):t.length>=2&&t.startsWith("'")&&t.endsWith("'")?t.slice(1,-1):t}function Ts(){let e=process.env.TOOLNET_GLOBAL_ENV??Ps(Es(),".config","toolnet-memory",".env");if(!Ms(e))return;let t=As(e,"utf8");for(let n of t.split(/\r?\n/)){let r=n.trim();if(!r||r.startsWith("#"))continue;r.startsWith("export ")&&(r=r.slice(7));let o=r.indexOf("=");if(o<=0)continue;let s=r.slice(0,o).trim();/^[A-Za-z_][A-Za-z0-9_]*$/.test(s)&&process.env[s]===void 0&&(process.env[s]=Os(r.slice(o+1)))}}Ts();function Se(e,t){return e===void 0?t:["1","true","yes","on"].includes(e.toLowerCase())}function ke(e,t){if(!e)return t;let n=Number(e);return Number.isFinite(n)?n:t}function Be(){return{memory:{autoCapture:Se(process.env.MEMORY_AUTO_CAPTURE,!0),autoRetrieve:Se(process.env.MEMORY_AUTO_RETRIEVE,!0),autoSummarize:Se(process.env.MEMORY_AUTO_SUMMARIZE,!0),autoSync:Se(process.env.MEMORY_AUTO_SYNC,!0)},retrieval:{maxCandidates:ke(process.env.MEMORY_MAX_CANDIDATES,50),rerankTop:ke(process.env.MEMORY_RERANK_TOP,10),finalContext:ke(process.env.MEMORY_FINAL_CONTEXT,5),tokenBudget:ke(process.env.MEMORY_TOKEN_BUDGET,2e3)},storage:{provider:process.env.MEMORY_STORAGE_PROVIDER??"huggingface",r2:{accountId:process.env.R2_ACCOUNT_ID,bucket:process.env.R2_BUCKET,accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY},s3:{endpoint:process.env.S3_ENDPOINT,region:process.env.S3_REGION,bucket:process.env.S3_BUCKET,accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY,forcePathStyle:Se(process.env.S3_FORCE_PATH_STYLE,!1)},huggingface:{namespace:process.env.HF_NAMESPACE,bucket:process.env.HF_BUCKET,accessKeyId:process.env.HF_S3_ACCESS_KEY_ID,secretAccessKey:process.env.HF_S3_SECRET_ACCESS_KEY},localRoot:process.env.MEMORY_LOCAL_STORAGE_PATH},cache:{maxMb:ke(process.env.MEMORY_LOCAL_CACHE_MB,200)}}}import{createHash as Rs}from"node:crypto";import{existsSync as Ve,mkdirSync as Ns,readFileSync as _s,renameSync as $s,writeFileSync as Ls}from"node:fs";import{basename as Fs,dirname as Je,join as ve,parse as An,resolve as ie}from"node:path";var En=".toolnet",Ks="project.json";function Ds(e){return Rs("sha256").update(e).digest("hex").slice(0,16)}function He(e){return ve(e,En,Ks)}function Ws(e){return Ve(He(e))}function Cn(e,t){let n=ie(e),r=An(n).root;for(;;){if(Ws(n))return n;if(n===r||t&&n===ie(t))break;let o=Je(n);if(o===n)break;n=o}return null}function jn(e){let t=ie(e),n=An(t).root,r=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"];for(;;){if(r.some(s=>Ve(ve(t,s))))return t;if(t===n)break;let o=Je(t);if(o===t)break;t=o}return ie(e)}function In(e){let t;try{t=JSON.parse(_s(e,"utf8"))}catch(o){throw new Error(`Invalid ToolNet project manifest: ${e}: ${o instanceof Error?o.message:String(o)}`)}if(!t||typeof t!="object")throw new Error(`Invalid ToolNet project manifest: ${e}`);let n=t;if(typeof n.id!="string"||!n.id.trim())throw new Error(`ToolNet project manifest is missing id: ${e}`);if(typeof n.name!="string"||!n.name.trim())throw new Error(`ToolNet project manifest is missing name: ${e}`);let r=new Date().toISOString();return{version:1,id:n.id,name:n.name,remote:typeof n.remote=="string"&&n.remote.trim()?n.remote:n.name,rootPath:typeof n.rootPath=="string"?n.rootPath:Je(Je(e)),createdAt:typeof n.createdAt=="string"?n.createdAt:r,updatedAt:typeof n.updatedAt=="string"?n.updatedAt:r,graphVersion:typeof n.graphVersion=="number"?n.graphVersion:0,memoryVersion:typeof n.memoryVersion=="number"?n.memoryVersion:0,metadata:n.metadata&&typeof n.metadata=="object"?n.metadata:void 0}}function Mn(e,t){let n=ve(e,En);Ns(n,{recursive:!0});let r=He(e),o=`${r}.tmp-${process.pid}`;Ls(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),$s(o,r)}function Dt(e,t){return{id:e.id,name:e.name,remote:e.remote,rootPath:t,createdAt:e.createdAt,updatedAt:e.updatedAt,graphVersion:e.graphVersion,memoryVersion:e.memoryVersion,metadata:e.metadata}}var Ge=class{findExisting(t=process.cwd()){let n=ie(t),r=jn(n),s=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(c=>Ve(ve(r,c))),i=Cn(n,s?r:void 0);if(!i)return null;let a=In(He(i));return Dt(a,i)}requireExisting(t=process.cwd()){let n=this.findExisting(t);if(!n)throw new Error("PROJECT_NOT_INITIALIZED");return n}detect(t=process.cwd()){let n=ie(t),r=jn(n),s=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(p=>Ve(ve(r,p))),i=Cn(n,s?r:void 0);if(i){let p=He(i),l=In(p);return l.rootPath!==i&&(l.rootPath=i,l.updatedAt=new Date().toISOString(),Mn(i,l)),Dt(l,i)}let a=new Date().toISOString(),c=Fs(r),u={version:1,id:Ds(r),name:c,remote:c,rootPath:r,createdAt:a,updatedAt:a,graphVersion:0,memoryVersion:0};return Mn(r,u),Dt(u,r)}};var zs=[{type:"openai_key",regex:/\bsk-[A-Za-z0-9_-]{20,}\b/g,confidence:"exact"},{type:"huggingface_token",regex:/\bhf_[A-Za-z0-9]{20,}\b/g,confidence:"exact"},{type:"hf_s3_access_key",regex:/\bHFAK[A-Za-z0-9]{8,}\b/g,confidence:"exact"},{type:"aws_access_key",regex:/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,confidence:"exact"},{type:"github_token",regex:/\b(?:gh[pousr]_[A-Za-z0-9]{30,255}|github_pat_[A-Za-z0-9_]{40,255})\b/g,confidence:"exact"},{type:"stripe_secret_key",regex:/\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g,confidence:"exact"},{type:"google_api_key",regex:/\bAIza[A-Za-z0-9_-]{30,}\b/g,confidence:"exact"},{type:"slack_token",regex:/\bxox[baprs]-[A-Za-z0-9-]{16,}\b/g,confidence:"exact"},{type:"npm_token",regex:/\bnpm_[A-Za-z0-9]{20,}\b/g,confidence:"exact"},{type:"bearer_token",regex:/\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/gi,confidence:"high"},{type:"jwt",regex:/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,confidence:"exact"},{type:"private_key",regex:/-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,confidence:"exact"},{type:"password_assignment",regex:/\b(?:password|passwd|pwd)\s*[:=]\s*["']?[^"' \t\r\n]{6,}["']?/gi,confidence:"high"},{type:"secret_assignment",regex:/\b(?:secret|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key)\s*[:=]\s*["']?[^"' \t\r\n]{8,}["']?/gi,confidence:"high"},{type:"cookie",regex:/\b(?:cookie|set-cookie)\s*[:=]\s*[^;\n]{8,}/gi,confidence:"high"},{type:"url_credentials",regex:/\bhttps?:\/\/[^:/@\s]+:[^/@\s]{4,}@[^/\s]+/gi,confidence:"high"}],qs=new Set(["example","example-key","example-token","changeme","change-me","password","secret","your-api-key","your-token","<token>","<secret>","<password>","[redacted]"]);function Pn(e){return e.normalize("NFKC").trim().toLowerCase()}function Bs(e){if(e.length===0)return 0;let t=new Map;for(let r of e)t.set(r,(t.get(r)??0)+1);let n=0;for(let r of t.values()){let o=r/e.length;n-=o*Math.log2(o)}return n}function Vs(e){return/^[a-f0-9]{32}$/iu.test(e)||/^[a-f0-9]{40}$/iu.test(e)||/^[a-f0-9]{64}$/iu.test(e)}function Js(e,t,n){let r=e.slice(Math.max(0,t-48),t),o=e.slice(n,Math.min(e.length,n+16));return/\b(?:token|secret|key|credential|authorization|password|passwd|apikey|api_key|access[_-]?key)\b/iu.test(`${r} ${o}`)}function Hs(e,t){return e.start<t.end&&t.start<e.end}function On(e){return e.sort((t,n)=>t.start!==n.start?t.start-n.start:n.end-n.start-(t.end-t.start))}var Ue=class{allowValues=new Set;enableEntropyHeuristic;constructor(t={}){for(let n of t.allowValues??[]){let r=Pn(n);r&&this.allowValues.add(r)}this.enableEntropyHeuristic=t.enableEntropyHeuristic??!0}scan(t){let n=[];for(let s of zs){let i=new RegExp(s.regex.source,s.regex.flags);for(let a of t.matchAll(i))a.index===void 0||!a[0]||this.allowed(a[0])||n.push({type:s.type,value:a[0],start:a.index,end:a.index+a[0].length,confidence:s.confidence})}this.enableEntropyHeuristic&&n.push(...this.entropyMatches(t));let r=On(n),o=[];for(let s of r)o.some(i=>Hs(i,s))||o.push(s);return On(o)}hasSecrets(t){return this.scan(t).length>0}allowed(t){let n=Pn(t);return qs.has(n)?!0:this.allowValues.has(n)}entropyMatches(t){let n=[],r=/[A-Za-z0-9_+/=-]{32,160}/g;for(let o of t.matchAll(r)){if(o.index===void 0||!o[0])continue;let s=o[0];this.allowed(s)||Vs(s)||!/[A-Za-z]/u.test(s)||!/[0-9]/u.test(s)||Js(t,o.index,o.index+s.length)&&(Bs(s)<3.7||n.push({type:"high_entropy_secret",value:s,start:o.index,end:o.index+s.length,confidence:"heuristic"}))}return n}};var J=class{scanner;constructor(t={}){this.scanner=new Ue(t)}sanitize(t){let n=this.scanner.scan(t);if(n.length===0)return{text:t,redacted:0,secretTypes:[]};let r=t,o=[...n].sort((i,a)=>a.start-i.start),s=new Set;for(let i of o)s.add(i.type),r=r.slice(0,i.start)+`[REDACTED:${i.type}]`+r.slice(i.end);return{text:r,redacted:n.length,secretTypes:[...s].sort()}}sanitizeValue(t){if(typeof t=="string")return this.sanitize(t).text;if(Array.isArray(t))return t.map(n=>this.sanitizeValue(n));if(t&&typeof t=="object"){let n={};for(let[r,o]of Object.entries(t)){let s=r.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g,"");if(s.includes("password")||s.includes("passwd")||s==="pwd"||s.includes("secret")||s.includes("token")||s.includes("cookie")||s.includes("authorization")||s.includes("apikey")||s.includes("accesskey")||s.includes("privatekey")||s.includes("clientsecret")||s.includes("credential")){n[r]="[REDACTED]";continue}n[r]=this.sanitizeValue(o)}return n}return t}};var Gs=new J;function we(e){return Gs.sanitizeValue(e)}import{homedir as hi}from"node:os";import{join as Si}from"node:path";import{DeleteObjectCommand as Us,GetObjectCommand as Ys,HeadObjectCommand as Xs,ListObjectsV2Command as Qs,PutObjectCommand as Zs,S3Client as ei}from"@aws-sdk/client-s3";import{getSignedUrl as ti}from"@aws-sdk/s3-request-presigner";var Ye=class{name="huggingface";client;bucket;constructor(t){this.bucket=t.bucket,this.client=new ei({region:"us-east-1",endpoint:`https://s3.hf.co/${t.namespace}`,forcePathStyle:!0,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:t.accessKeyId,secretAccessKey:t.secretAccessKey}})}async put(t,n,r="application/octet-stream"){let o=typeof n=="string"?Buffer.from(n,"utf8"):n;await this.client.send(new Zs({Bucket:this.bucket,Key:t,Body:o,ContentType:r}))}async get(t){let n=await ti(this.client,new Ys({Bucket:this.bucket,Key:t}),{expiresIn:60}),r=await fetch(n,{redirect:"follow"});if(r.status===404)return null;if(!r.ok)throw new Error(`HF download failed: ${r.status} ${r.statusText}`);return new Uint8Array(await r.arrayBuffer())}async getText(t){let n=await this.get(t);return n?Buffer.from(n).toString("utf8"):null}async exists(t){try{return await this.client.send(new Xs({Bucket:this.bucket,Key:t})),!0}catch(n){if(typeof n=="object"&&n!==null&&"$metadata"in n&&n.$metadata?.httpStatusCode===404)return!1;throw n}}async delete(t){await this.client.send(new Us({Bucket:this.bucket,Key:t}))}async list(t=""){let n=[],r;do{let o=await this.client.send(new Qs({Bucket:this.bucket,Prefix:t||void 0,ContinuationToken:r}));for(let s of o.Contents??[])s.Key&&n.push({key:s.Key,size:s.Size,updatedAt:s.LastModified?.toISOString()});r=o.IsTruncated?o.NextContinuationToken:void 0}while(r);return n}};import{access as Tn,mkdir as ni,readFile as ri,readdir as oi,rm as si,stat as Rn,writeFile as ii}from"node:fs/promises";import{dirname as ai,join as ci,relative as Nn,resolve as ui}from"node:path";var be=class{constructor(t){this.root=t}root;name="local";path(t){let n=t.replace(/^\/+/,"");return ui(this.root,n)}async put(t,n){let r=this.path(t);await ni(ai(r),{recursive:!0}),await ii(r,n)}async get(t){try{return await ri(this.path(t))}catch(n){if(typeof n=="object"&&n!==null&&"code"in n&&n.code==="ENOENT")return null;throw n}}async getText(t){let n=await this.get(t);return n?Buffer.from(n).toString("utf8"):null}async exists(t){try{return await Tn(this.path(t)),!0}catch{return!1}}async delete(t){await si(this.path(t),{force:!0})}async list(t=""){let n=this.path(t),r=[];try{await Tn(n)}catch{return r}let o=async i=>{let a=await oi(i,{withFileTypes:!0});for(let c of a){let u=ci(i,c.name);if(c.isDirectory()){await o(u);continue}let p=await Rn(u);r.push({key:Nn(this.root,u),size:p.size,updatedAt:p.mtime.toISOString()})}},s=await Rn(n);return s.isDirectory()?await o(n):r.push({key:Nn(this.root,n),size:s.size,updatedAt:s.mtime.toISOString()}),r}};import{DeleteObjectCommand as li,GetObjectCommand as di,HeadObjectCommand as pi,ListObjectsV2Command as fi,PutObjectCommand as mi,S3Client as gi}from"@aws-sdk/client-s3";import{getSignedUrl as yi}from"@aws-sdk/s3-request-presigner";var xe=class{name;client;bucket;constructor(t){this.name=t.name??"s3",this.bucket=t.bucket,this.client=new gi({region:t.region??"us-east-1",endpoint:t.endpoint||void 0,forcePathStyle:t.forcePathStyle??!1,requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:t.accessKeyId,secretAccessKey:t.secretAccessKey}})}async put(t,n,r="application/octet-stream"){let o=typeof n=="string"?Buffer.from(n,"utf8"):n;await this.client.send(new mi({Bucket:this.bucket,Key:t,Body:o,ContentType:r}))}async get(t){let n=await yi(this.client,new di({Bucket:this.bucket,Key:t}),{expiresIn:60}),r=await fetch(n,{redirect:"follow"});if(r.status===404)return null;if(!r.ok)throw new Error(`${this.name} download failed: ${r.status} ${r.statusText}`);return new Uint8Array(await r.arrayBuffer())}async getText(t){let n=await this.get(t);return n?Buffer.from(n).toString("utf8"):null}async exists(t){try{return await this.client.send(new pi({Bucket:this.bucket,Key:t})),!0}catch(n){if(typeof n=="object"&&n!==null&&"$metadata"in n&&n.$metadata?.httpStatusCode===404)return!1;throw n}}async delete(t){await this.client.send(new li({Bucket:this.bucket,Key:t}))}async list(t=""){let n=[],r;do{let o=await this.client.send(new fi({Bucket:this.bucket,Prefix:t||void 0,ContinuationToken:r}));for(let s of o.Contents??[])s.Key&&n.push({key:s.Key,size:s.Size,updatedAt:s.LastModified?.toISOString()});r=o.IsTruncated?o.NextContinuationToken:void 0}while(r);return n}};function Wt(e,t){return console.warn(t),new be(e)}function _n(e){let t=e.localRoot??Si(hi(),".toolnet-memory","storage");if(e.provider==="r2"){let n=e.r2;return n?.accountId&&n.bucket&&n.accessKeyId&&n.secretAccessKey?new xe({name:"r2",endpoint:`https://${n.accountId}.r2.cloudflarestorage.com`,region:"auto",bucket:n.bucket,forcePathStyle:!0,accessKeyId:n.accessKeyId,secretAccessKey:n.secretAccessKey}):Wt(t,"[storage] Cloudflare R2 credentials missing. Using local fallback.")}if(e.provider==="s3"){let n=e.s3;return n?.bucket&&n.accessKeyId&&n.secretAccessKey?new xe({name:"s3",endpoint:n.endpoint,region:n.region??"us-east-1",bucket:n.bucket,forcePathStyle:n.forcePathStyle??!1,accessKeyId:n.accessKeyId,secretAccessKey:n.secretAccessKey}):Wt(t,"[storage] S3 credentials missing. Using local fallback.")}if(e.provider==="huggingface"){let n=e.huggingface;return n?.namespace&&n.bucket&&n.accessKeyId&&n.secretAccessKey?new Ye({namespace:n.namespace,bucket:n.bucket,accessKeyId:n.accessKeyId,secretAccessKey:n.secretAccessKey}):Wt(t,"[storage] Hugging Face credentials missing. Using local fallback.")}return new be(t)}function ki(e){return new Promise(t=>setTimeout(t,e))}async function $n(e,t={}){let n=Math.max(1,t.attempts??3),r=t.baseDelayMs??150,o=t.maxDelayMs??2e3,s;for(let i=1;i<=n;i++)try{return await e()}catch(a){if(s=a,i>=n)break;let c=Math.min(o,r*2**(i-1)),u=Math.floor(Math.random()*Math.max(1,c*.2));await ki(c+u)}throw s}var vi=new Set(["put","get","getText","delete","list"]);function Ln(e,t={}){return new Proxy(e,{get(n,r){let o=Reflect.get(n,r,n);return typeof o!="function"?o:vi.has(r)?(...s)=>$n(()=>Promise.resolve(o.apply(n,s)),t):o.bind(n)}})}function Fn(e){let t=e.trim().replace(/\s+/g,"_").replace(/[^A-Za-z0-9._-]/g,"_").replace(/_+/g,"_").replace(/^\.+|\.+$/g,"").slice(0,100);if(!t||t==="."||t==="..")throw new Error("Invalid project storage folder");return t}function Kn(e){let t=e.replace(/^\/+/,"");if(t.startsWith("memories/"))return"memory/records/"+t.slice(9);if(t.startsWith("vectors/"))return"memory/vectors/"+t.slice(8);if(t.startsWith("graph/"))return"code/graph/"+t.slice(6);let n=t.match(/^(snapshots\/[^/]+\/)memories\/(.+)$/);if(n)return`${n[1]}memory/records/${n[2]}`;if(n=t.match(/^(snapshots\/[^/]+\/)vectors\/(.+)$/),n)return`${n[1]}memory/vectors/${n[2]}`;if(n=t.match(/^(snapshots\/[^/]+\/)graph\/(.+)$/),n)return`${n[1]}code/graph/${n[2]}`;let r=t.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)memories\/(.+)$/);if(r)return`${r[1]}memory/records/${r[2]}`;if(r=t.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)vectors\/(.+)$/),r)return`${r[1]}memory/vectors/${r[2]}`;if(r=t.match(/^(projects\/[^/]+\/snapshots\/[^/]+\/)graph\/(.+)$/),r)return`${r[1]}code/graph/${r[2]}`;let o=t.match(/^(projects\/[^/]+\/)memories\/(.+)$/);return o?`${o[1]}memory/records/${o[2]}`:(o=t.match(/^(projects\/[^/]+\/)vectors\/(.+)$/),o?`${o[1]}memory/vectors/${o[2]}`:(o=t.match(/^(projects\/[^/]+\/)graph\/(.+)$/),o?`${o[1]}code/graph/${o[2]}`:t))}var Xe=class{constructor(t,n,r,o){this.provider=t;this.name=t.name,this.projectId=n,this.projectName=r,this.folder=Fn(o??r),this.sourcePrefix=`projects/${n}`,this.targetPrefix=`projects/${this.folder}`}provider;name;folder;sourcePrefix;targetPrefix;projectId;projectName;registryPromise;async registerProject(){let t=`${this.targetPrefix}/project.json`,n=new Date().toISOString(),r=n,o=await this.provider.getText(t);if(o){let i;try{i=JSON.parse(o)}catch(a){throw new Error(`Invalid remote ToolNet project manifest at ${t}: ${a instanceof Error?a.message:String(a)}`)}if(typeof i.id=="string"&&i.id!==this.projectId)throw new Error(["ToolNet remote project namespace collision.",`Remote folder: ${this.targetPrefix}`,`Existing project id: ${i.id}`,`Current project id: ${this.projectId}`,"Refusing to mix data from two projects."].join(" "));typeof i.createdAt=="string"&&(r=i.createdAt)}let s={version:1,id:this.projectId,name:this.projectName,remote:this.folder,createdAt:r,updatedAt:n};await this.provider.put(t,JSON.stringify(s,null,2)+`
`,"application/json")}async ensureRegistered(){return this.registryPromise||(this.registryPromise=this.registerProject()),this.registryPromise}key(t){if(t=Kn(t),t===this.sourcePrefix)return this.targetPrefix;if(t.startsWith(`${this.sourcePrefix}/`))return this.targetPrefix+t.slice(this.sourcePrefix.length);if(t===this.targetPrefix||t.startsWith(`${this.targetPrefix}/`))return t;if(t.startsWith("projects/"))throw new Error(["Cross-project storage access denied.",`Current project: ${this.targetPrefix}`,`Requested key: ${t}`].join(" "));return t}async put(t,n,r){return await this.ensureRegistered(),this.provider.put(this.key(t),n,r)}async get(t){return await this.ensureRegistered(),this.provider.get(this.key(t))}async getText(t){return await this.ensureRegistered(),this.provider.getText(this.key(t))}async delete(t){return await this.ensureRegistered(),this.provider.delete(this.key(t))}async exists(t){return await this.ensureRegistered(),this.provider.exists(this.key(t))}async list(t){return await this.ensureRegistered(),this.provider.list(this.key(t))}};import{existsSync as td}from"node:fs";import{execFileSync as nd}from"node:child_process";import{homedir as rd}from"node:os";import{isAbsolute as od,join as ts,relative as sd,resolve as ns}from"node:path";import{DatabaseSync as id}from"node:sqlite";import{join as Mi}from"node:path";import{createHash as wi}from"node:crypto";import{dirname as bi}from"node:path";import{mkdirSync as xi,readFileSync as Ci,renameSync as ji,writeFileSync as Ii}from"node:fs";function w(e){return wi("sha256").update(e).digest("hex")}function zt(e){if(Array.isArray(e))return e.map(zt);if(e&&typeof e=="object"){let t=e,n={};for(let r of Object.keys(t).sort())n[r]=zt(t[r]);return n}return e}function Dn(e){return JSON.stringify(zt(e))}function Wn(e){try{return JSON.parse(Ci(e,"utf8"))}catch{return null}}function N(e,t){xi(bi(e),{recursive:!0});let n=`${e}.${process.pid}.tmp`;Ii(n,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),ji(n,e)}function zn(e,t){let n=e.trim(),r=n.replace(/\s+/g,"_").replace(/[^A-Za-z0-9._-]/g,"_").replace(/_+/g,"_").replace(/^\.+|\.+$/g,""),o=w(n).slice(0,12);if(!r||r==="."||r==="..")return`${t}--${o}`;let s=r.slice(0,100);return s===n&&n.length<=100?s:`${s.slice(0,85)}--${o}`}function qn(e,t,n){let r=t.trim(),o=n.trim();if(!r)throw new Error("Session agent is required");if(!o)throw new Error("Native session ID is required");let s=zn(r.toLowerCase(),"agent"),i=zn(o,"session");return{projectId:e.id,projectName:e.name,projectRoot:e.rootPath,agent:r,nativeSessionId:o,sessionKey:`${r}:${o}`,remotePrefix:["projects",e.id,"runtime","sources",s,i].join("/"),localDirectory:Mi(e.rootPath,".toolnet","runtime","sources",s,i)}}function Bn(e){return String(e).padStart(12,"0")}var Qe=class{constructor(t,n=100,r=512*1024){this.storage=t;this.maxEventsPerChunk=n;this.maxChunkBytes=r;if(n<1)throw new Error("maxEventsPerChunk must be positive");if(r<1024)throw new Error("maxChunkBytes is too small")}storage;maxEventsPerChunk;maxChunkBytes;async getJson(t){let n=await this.storage.getText(t);return n?JSON.parse(n):null}async putJson(t,n){await this.storage.put(t,JSON.stringify(n,null,2)+`
`,"application/json")}async scan(t){let n=`${t.remotePrefix}/events/`,r=await this.storage.list(n),o=[],s=0;for(let i of r){let a=i.key.match(/\/events\/(\d+)-(\d+)-[a-f0-9]+\.jsonl$/);if(!a)continue;let c=Number(a[1]),u=Number(a[2]);!Number.isFinite(c)||!Number.isFinite(u)||(o.push({key:i.key,start:c,end:u}),s=Math.max(s,u))}return o.sort((i,a)=>i.start-a.start),{chunks:o,maxSequence:s}}split(t){let n=[],r=[],o=0;for(let s of t){let i=Buffer.byteLength(JSON.stringify(s)+`
`,"utf8");r.length>0&&(r.length>=this.maxEventsPerChunk||o+i>this.maxChunkBytes)&&(n.push(r),r=[],o=0),r.push(s),o+=i}return r.length>0&&n.push(r),n}async loadManifest(t){return this.getJson(`${t.remotePrefix}/session.json`)}async loadCursor(t){return this.getJson(`${t.remotePrefix}/cursor.json`)}async recover(t){let n=await this.scan(t);return{maxSequence:n.maxSequence,chunkCount:n.chunks.length}}async append(t,n,r,o={}){let s=await this.loadManifest(t),i=await this.scan(t),a=n.filter(y=>y.sequence>i.maxSequence),c=0;for(let y of this.split(a)){let g=y[0],k=y[y.length-1],b=y.map(R=>JSON.stringify(R)).join(`
`)+`
`,T=w(b).slice(0,16),P=[t.remotePrefix,"events",`${Bn(g.sequence)}-${Bn(k.sequence)}-${T}.jsonl`].join("/");await this.storage.exists(P)||await this.storage.put(P,b,"application/x-ndjson"),c+=y.length}let u=await this.scan(t),p=n[n.length-1],l=s?.status??"active";p?.type==="session_end"||p?.type==="session_idle"?l="idle":p?.type==="error"?l="error":n.length>0&&(l="active");let f=new Date().toISOString(),d=n[0],m={version:1,projectId:t.projectId,projectName:t.projectName,agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,status:l,createdAt:s?.createdAt??d?.timestamp??f,updatedAt:p?.timestamp??f,firstEventAt:s?.firstEventAt??d?.timestamp,lastEventAt:p?.timestamp??s?.lastEventAt,eventCount:u.maxSequence,chunkCount:u.chunks.length,metadata:{...s?.metadata,...o.metadata}};(o.title??s?.title)&&(m.title=o.title??s?.title);let S={version:1,projectId:t.projectId,agent:t.agent,nativeSessionId:t.nativeSessionId,lastLocalSequence:n.length>0?n[n.length-1].sequence:u.maxSequence,lastRemoteSequence:u.maxSequence,sourceCursors:r,updatedAt:f};return await this.putJson(`${t.remotePrefix}/cursor.json`,S),await this.putJson(`${t.remotePrefix}/session.json`,m),{uploadedEvents:c,lastRemoteSequence:u.maxSequence,eventCount:m.eventCount,chunkCount:m.chunkCount,status:l}}};import{closeSync as Ie,existsSync as rt,fsyncSync as Yt,mkdirSync as Bi,openSync as Me,readFileSync as sr,readSync as Vi,rmSync as nr,statSync as Gt,truncateSync as Ji,writeSync as Hi}from"node:fs";import{join as Ut}from"node:path";var Ai=new Set(["thinking","reasoning","reasoningcontent","chainofthought","cot","analysistext","internalreasoning","modelthinking"]),Ei=new Set(["reasoning","thinking","chain_of_thought","chain-of-thought","internal_reasoning","internal-reasoning"]);function Pi(e){return e.toLowerCase().replace(/[^a-z0-9]+/gu,"")}function Oi(e){for(let t of["type","kind"]){let n=e[t];if(typeof n=="string"){let r=n.toLowerCase();if(Ei.has(r))return n}}return null}function qt(e,t=0){if(t>12)return"[ToolNet nested value omitted]";if(Array.isArray(e))return e.map(s=>qt(s,t+1));if(!e||typeof e!="object")return e;let n=e,r=Oi(n);if(r)return{type:r,omitted:"[private reasoning omitted]"};let o={};for(let[s,i]of Object.entries(n))Ai.has(Pi(s))||(o[s]=qt(i,t+1));return o}function Ti(e){if(!e)return new Date().toISOString();let t=new Date(e);return Number.isNaN(t.getTime())?new Date().toISOString():t.toISOString()}function X(e){return e?.trim()||void 0}function Vn(e,t={}){let n={...e.provenance??{}},r=X(e.source)??X(t.source)??X(n.source);return{...e,timestamp:Ti(e.timestamp),source:r,turnId:X(e.turnId)??X(t.turnId),cwd:X(e.cwd)??X(t.cwd),data:qt(e.data??{}),provenance:n}}import{randomUUID as Bt}from"node:crypto";import{closeSync as ae,existsSync as ce,fsyncSync as Ce,mkdirSync as Vt,openSync as je,readFileSync as Jt,readdirSync as Ri,renameSync as Ni,rmSync as Ze,statSync as _i,writeSync as et}from"node:fs";import{join as H}from"node:path";var $i=12e4,Li=80,Fi="reconcile-required";function Ki(e){e<=0||Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,e)}function ue(e){return H(e,".toolnet","journal")}function Gn(e){return H(ue(e),"events.jsonl")}function tt(e){return H(ue(e),Fi)}function Di(e){if(!Number.isInteger(e)||e<=0)return!1;try{return process.kill(e,0),!0}catch(t){return t?.code!=="ESRCH"}}function Un(e){if(!ce(e))return null;try{let t=JSON.parse(Jt(e,"utf8"));return t.version!==1||typeof t.token!="string"||typeof t.pid!="number"||typeof t.acquiredAt!="string"?null:{version:1,token:t.token,pid:t.pid,acquiredAt:t.acquiredAt}}catch{return null}}function Wi(e){if(!ce(e))return!1;let t=0;try{t=Date.now()-_i(e).mtimeMs}catch{return!1}if(t<=$i)return!1;let n=Un(e);return n?!Di(n.pid):!0}function zi(e){if(!Wi(e))return!1;try{return Ze(e,{force:!0}),!0}catch{return!1}}function Yn(e){for(let t=0;t<Li;t+=1){let n=Bt();try{let r=je(e,"wx",384),o={version:1,token:n,pid:process.pid,acquiredAt:new Date().toISOString()};try{return et(r,`${JSON.stringify(o)}
`,null,"utf8"),Ce(r),{fd:r,token:n}}catch(s){throw ae(r),Ze(e,{force:!0}),s}}catch(r){if(r?.code!=="EEXIST")throw r;if(zi(e))continue;Ki(25)}}throw new Error(`Shared project journal is locked: ${e}`)}function Xn(e,t){ae(t.fd),Un(e)?.token===t.token&&Ze(e,{force:!0})}function Jn(e){if(!ce(e))return[];let t="";try{t=Jt(e,"utf8")}catch{return[]}let n=[];for(let r of t.split(/\r?\n/)){let o=r.trim();if(o)try{let s=JSON.parse(o);if(s.version!==1||typeof s.id!="string"||s.id.length===0||typeof s.projectId!="string"||s.projectId.length===0)continue;n.push(s)}catch{}}return n}function Qn(e){if(!ce(e))return[];let t=[];for(let n of Ri(e,{withFileTypes:!0})){let r=H(e,n.name);if(n.isDirectory()){t.push(...Qn(r));continue}n.isFile()&&n.name==="events.jsonl"&&t.push(r)}return t.sort()}function nt(e){let t=null;try{t=je(e,"r"),Ce(t)}catch{}finally{if(t===null)return;ae(t)}}function Hn(e){let t=tt(e);if(!ce(t))return null;try{return Jt(t,"utf8").trim()||null}catch{return null}}function Ht(e){let t=ue(e);Vt(t,{recursive:!0,mode:448});let n=tt(e),r=[Bt(),new Date().toISOString()].join("|"),o=je(n,"w",384);try{et(o,`${r}
`,null,"utf8"),Ce(o)}finally{ae(o)}nt(t)}function qi(e,t,n){let r=H(e,`.events.jsonl.tmp-${process.pid}-${Bt()}`),o=je(r,"w",384);try{let s=n.length===0?"":`${n.map(i=>JSON.stringify(i)).join(`
`)}
`;s&&et(o,s,null,"utf8"),Ce(o)}finally{ae(o)}Ni(r,t),nt(e)}function Zn(e){let t=ue(e),n=Gn(e),r=H(e,".toolnet","runtime","sources"),o=Hn(e),s=Qn(r),i=[],a=new Set;for(let l of Jn(n))a.has(l.id)||(a.add(l.id),i.push(l));let c=i.length,u=[];for(let l of s)for(let f of Jn(l))a.has(f.id)||(a.add(f.id),u.push(f));u.sort((l,f)=>{let d=l.timestamp.localeCompare(f.timestamp);return d!==0?d:l.id.localeCompare(f.id)}),i.push(...u),qi(t,n,i);let p=Hn(e);return o&&p===o&&(Ze(tt(e),{force:!0}),nt(t)),{filesScanned:s.length,existingEvents:c,recoveredEvents:u.length,totalEvents:i.length}}function er(e){let t=ue(e);Vt(t,{recursive:!0,mode:448});let n=H(t,"journal.lock"),r=Yn(n);try{return Zn(e)}finally{Xn(n,r)}}function tr(e,t){if(t.length===0)return;let n=ue(e);Vt(n,{recursive:!0,mode:448});let r=Gn(e),o=H(n,"journal.lock"),s=Yn(o);try{if(ce(tt(e))){Zn(e);return}let i=`${t.map(c=>JSON.stringify(c)).join(`
`)}
`,a=je(r,"a",384);try{et(a,i,null,"utf8"),Ce(a)}finally{ae(a)}nt(n)}finally{Xn(o,s)}}var Gi=12e4,Ui=80,rr=2e3;function Yi(e){Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,e)}function ir(e,t){let n=Buffer.isBuffer(t)?t:Buffer.from(t,"utf8"),r=0;for(;r<n.length;){let o=Hi(e,n,r,n.length-r);if(o<=0)throw new Error("Unable to write session WAL");r+=o}}function Xt(e){let t=e.trim();if(!t)return null;try{let n=JSON.parse(t);return n.version!==1||typeof n.id!="string"||!n.id||typeof n.sequence!="number"||!Number.isFinite(n.sequence)||typeof n.projectId!="string"||!n.projectId||typeof n.timestamp!="string"?null:n}catch{return null}}function Xi(e){if(!rt(e))return[];let t="";try{t=sr(e,"utf8")}catch{return[]}let n=[];for(let r of t.split(/\r?\n/)){let o=Xt(r);o&&n.push(o)}return n}function or(e){return e.type==="session_end"||e.type==="session_idle"?"idle":e.type==="error"?"error":"active"}function Qi(e){if(!rt(e))return!1;let t;try{t=sr(e)}catch{return!1}if(t.length===0||t[t.length-1]===10)return!1;let n=t.lastIndexOf(10),r=n>=0?n+1:0,o=t.subarray(r).toString("utf8").trim();if(Xt(o)){let i=Me(e,"a");try{ir(i,`
`),Yt(i)}finally{Ie(i)}return!0}Ji(e,r);let s=Me(e,"a");try{Yt(s)}finally{Ie(s)}return!0}function Zi(e,t){if(e.length!==t.length)return!1;for(let n=0;n<e.length;n+=1)if(e[n]!==t[n])return!1;return!0}var ot=class{constructor(t,n={}){this.identity=t;this.eventContext=n;Bi(t.localDirectory,{recursive:!0}),this.eventsFile=Ut(t.localDirectory,"events.jsonl"),this.stateFile=Ut(t.localDirectory,"state.json"),this.lockFile=Ut(t.localDirectory,"journal.lock")}identity;eventContext;eventsFile;stateFile;lockFile;initialState(){let t=new Date().toISOString();return{version:1,projectId:this.identity.projectId,agent:this.identity.agent,nativeSessionId:this.identity.nativeSessionId,status:"idle",createdAt:t,updatedAt:t,lastSequence:0,lastRemoteSequence:0,remoteByteOffset:0,sourceCursors:{},recentEventIds:[]}}loadStateUnsafe(){return Wn(this.stateFile)??this.initialState()}recoverStateUnsafe(){Qi(this.eventsFile);let t=this.loadStateUnsafe(),n=Xi(this.eventsFile);if(n.length===0)return t;let r=n[0];for(let l of n)l.sequence<=r.sequence||(r=l);let o=n.slice(-rr).map(l=>l.id),s=rt(this.eventsFile)?Gt(this.eventsFile).size:0,i=Math.max(t.lastSequence,r.sequence),a=Math.min(t.remoteByteOffset,s),c=r.sequence>t.lastSequence;if(!(c||a!==t.remoteByteOffset||!Zi(t.recentEventIds,o)||t.lastLocalEventAt!==r.timestamp))return t;let p={...t,status:or(r),updatedAt:r.timestamp,lastLocalEventAt:r.timestamp,lastSequence:i,remoteByteOffset:a,recentEventIds:o};if(this.saveStateUnsafe(p),!c)return p;try{Ht(this.identity.projectRoot)}catch{return p}try{er(this.identity.projectRoot)}catch{}return p}loadState(){return this.withLock(()=>this.recoverStateUnsafe())}saveStateUnsafe(t){N(this.stateFile,t)}acquireLock(){for(let t=0;t<Ui;t+=1)try{return Me(this.lockFile,"wx",384)}catch(n){if(n.code!=="EEXIST")throw n;try{if(Date.now()-Gt(this.lockFile).mtimeMs>Gi){nr(this.lockFile,{force:!0});continue}}catch{}Yi(25)}throw new Error(`Session journal is locked: ${this.lockFile}`)}withLock(t){let n=this.acquireLock();try{return t()}finally{Ie(n),nr(this.lockFile,{force:!0})}}append(t){return t.length===0?[]:this.withLock(()=>{let n=this.recoverStateUnsafe(),r=new Set(n.recentEventIds),o=n.lastSequence,s=[];for(let l of t){let f=Vn(l,this.eventContext),d=f.timestamp??new Date().toISOString(),m=f.data??{},S=f.provenance?.rawDigest??w(Dn(m)),y=we(m),g=f.sourceEventId?[this.identity.projectId,this.identity.agent,this.identity.nativeSessionId,f.sourceEventId].join("|"):[this.identity.projectId,this.identity.agent,this.identity.nativeSessionId,o+1,f.type,d,S].join("|"),k=w(g).slice(0,32);if(r.has(k))continue;o+=1;let b={version:1,id:k,sequence:o,projectId:this.identity.projectId,agent:this.identity.agent,nativeSessionId:this.identity.nativeSessionId,sessionId:this.identity.nativeSessionId,type:f.type,timestamp:d,source:f.source??f.provenance?.source??this.identity.agent,data:y,provenance:{...f.provenance,rawDigest:S}};f.role!==void 0&&(b.role=f.role),f.turnId!==void 0&&(b.turnId=f.turnId),f.cwd!==void 0&&(b.cwd=f.cwd),f.sourceEventId!==void 0&&(b.sourceEventId=f.sourceEventId),f.sourceSequence!==void 0&&(b.sourceSequence=f.sourceSequence),s.push(b),r.add(k)}if(s.length===0)return[];let i=s.map(l=>JSON.stringify(l)).join(`
`)+`
`,a=Me(this.eventsFile,"a",384);try{ir(a,i),Yt(a)}finally{Ie(a)}try{tr(this.identity.projectRoot,s)}catch{try{Ht(this.identity.projectRoot)}catch{}}let c=s[s.length-1],u=or(c),p=Array.from(r).slice(-rr);return this.saveStateUnsafe({...n,status:u,updatedAt:c.timestamp,lastLocalEventAt:c.timestamp,lastSequence:c.sequence,recentEventIds:p}),s})}readPending(){return this.withLock(()=>{let t=this.recoverStateUnsafe();if(!rt(this.eventsFile))return{events:[],startOffset:t.remoteByteOffset,endOffset:t.remoteByteOffset};let n=Gt(this.eventsFile).size,r=Math.min(t.remoteByteOffset,n);if(n<=r)return{events:[],startOffset:r,endOffset:n};let o=n-r,s=Buffer.alloc(o),i=Me(this.eventsFile,"r");try{Vi(i,s,0,o,r)}finally{Ie(i)}let a=[];for(let c of s.toString("utf8").split(/\r?\n/)){let u=Xt(c);u&&a.push(u)}return{events:a,startOffset:r,endOffset:n}})}markRemote(t,n){this.withLock(()=>{let r=this.recoverStateUnsafe(),o=new Date().toISOString();this.saveStateUnsafe({...r,lastRemoteSequence:Math.max(r.lastRemoteSequence,t),remoteByteOffset:Math.max(r.remoteByteOffset,n),lastRemoteAt:o,updatedAt:o})})}setSourceCursor(t,n){this.withLock(()=>{let r=this.recoverStateUnsafe();this.saveStateUnsafe({...r,sourceCursors:{...r.sourceCursors,[t]:String(n)},updatedAt:new Date().toISOString()})})}};import{closeSync as Hc,existsSync as Gc,openSync as Uc,readSync as Yc,statSync as Xc}from"node:fs";var ea=new Set(["rule","blocker","architecture","deploy"]),ta=new Set(["fix","todo","context","next_action"]);function Qt(e){return e<0?0:e>1?1:e}function ar(e,t){let n=Number.parseFloat(e??"");return Number.isFinite(n)?n:t}function na(e){return e==="off"?"off":e==="balanced"?"balanced":e==="aggressive"?"aggressive":"conservative"}function Zt(){return{mode:na(process.env.TOOLNET_MEMORY_PROMOTION),minScore:Qt(ar(process.env.TOOLNET_PROMOTE_MIN_SCORE,.65)),minConfidence:Qt(ar(process.env.TOOLNET_PROMOTE_MIN_CONFIDENCE,.78))}}function ra(e){switch(e){case"critical":return 1;case"high":return .85;case"normal":return .6;case"temporary":return .25}}function oa(e){let t=Qt(ra(e.importance)*.75+e.confidence*.25);return Math.round(t*1e6)/1e6}function sa(e){return e.evidence?e.evidence:{userExplicit:!1,sourceVerified:!1,testVerified:!1,crossSessionConfirmations:0,assistantDerived:!1}}function ia(e,t=Zt()){if(e.importance==="temporary"||e.confidence<t.minConfidence)return"transient";let n=sa(e);return e.kind==="rule"&&n.userExplicit?"permanent":e.kind==="rule"?"session":e.kind==="architecture"&&(n.userExplicit||n.sourceVerified||n.testVerified||n.crossSessionConfirmations>=2)?"permanent":e.kind==="architecture"?"session":e.kind==="decision"||e.kind==="todo"||e.kind==="fix"?"task":"session"}function aa(e,t=Zt()){if(t.mode==="off")return Number.POSITIVE_INFINITY;let n=0;t.mode==="balanced"&&(n=.1),t.mode==="aggressive"&&(n=.15);let r=Math.max(t.mode==="aggressive"?.5:.55,t.minScore-n);return ea.has(e)&&(r=Math.max(.5,r-.1)),ta.has(e)&&(r=Math.max(.5,r-.05)),r}function en(e,t=Zt()){let n=ia(e,t),r=oa(e),o=aa(e.kind,t);return n==="transient"?{knowledgeClass:n,score:r,threshold:o,persist:!1}:t.mode==="off"?{knowledgeClass:n,score:r,threshold:o,persist:!1}:{knowledgeClass:n,score:r,threshold:o,persist:r>=o}}function cr(e,t){let n=t.toLowerCase();return n.includes("kh\xF4ng \u0111\u01B0\u1EE3c")||n.includes("tuy\u1EC7t \u0111\u1ED1i")||n.includes("must not")||n.includes("never ")?"critical":e==="rule"||e==="decision"?"high":e==="todo"||n.includes("error")||n.includes("failed")||n.includes("exception")?"normal":"temporary"}var pr=[/không được/iu,/tuyệt đối/iu,/bắt buộc/iu,/đừng\s+/iu,/must not/iu,/do not/iu,/don't/iu,/\bnever\b/iu],ca=[/từ giờ/iu,/về sau/iu,/mỗi lần/iu,/luôn luôn/iu,/\bluôn\b/iu,/quy tắc/iu,/workflow/iu,/\balways\b/iu,/\brequired\b/iu,/\bmust\b/iu,/from now on/iu],ua=[/\bchốt\b/iu,/quyết định/iu,/sẽ dùng/iu,/chọn .+ thay/iu,/đổi sang/iu,/chuyển sang/iu,/\bdecided\b/iu,/\bchosen\b/iu,/we will use/iu,/use .+ instead/iu,/switch(?:ed)? to/iu],la=[/\btodo\b/iu,/cần làm/iu,/cần thêm/iu,/cần sửa/iu,/cần kiểm tra/iu,/tiếp theo/iu,/bước tiếp theo/iu,/còn phải/iu,/còn cần/iu,/next step/iu,/\bneed to\b/iu,/\bremaining\b/iu,/follow[- ]?up/iu],da=[/đã sửa/iu,/đã fix/iu,/đã khắc phục/iu,/đã xử lý/iu,/hoàn tất/iu,/hoàn thành/iu,/\bfixed\b/iu,/\bresolved\b/iu,/\bimplemented\b/iu,/\bcompleted\b/iu,/\bpasses?\b/iu],ur=[/kiến trúc/iu,/pipeline/iu,/adapter/iu,/schema/iu,/runtime/iu,/namespace/iu,/storage/iu,/lưu trữ/iu,/workflow/iu,/session core/iu,/memory engine/iu,/retrieval/iu],pa=[/\bdùng\b/iu,/\btách\b/iu,/\bthay\b/iu,/\bchuyển\b/iu,/\blưu\b/iu,/\bmap\b/iu,/\buse\b/iu,/\bsplit\b/iu,/\bstore\b/iu,/\breplace\b/iu,/\bmove\b/iu],fa=[/đường dẫn/iu,/\bpath\b/iu,/\bport\b/iu,/\bendpoint\b/iu,/\bdomain\b/iu,/\bbucket\b/iu,/\brepository\b/iu,/\brepo\b/iu,/\bbranch\b/iu,/\/[A-Za-z0-9._/-]{4,}/u],ma=[/\blà\b/iu,/\bở\b/iu,/\bdùng\b/iu,/\bnằm\b/iu,/\bis\b/iu,/\buse\b/iu,/located/iu,/runs on/iu],lr=new Set(["content","text","message","prompt","summary","description","reason","title","last_assistant_message","lastAssistantMessage","input_messages","inputMessages"]),ga=new Set(["payload","data","content","message","messages","parts","summary"]);function _(e,t){return t.some(n=>n.test(e))}function fr(e){return e.normalize("NFKC").replace(/\r/g,"").replace(/^[\s>*#\-•]+/u,"").replace(/\s+/g," ").trim()}function ya(e){return fr(e).toLowerCase().replace(/[^\p{L}\p{N}:/._-]+/gu," ").replace(/\s+/g," ").trim()}function ha(e){return!(e.length<12||e.length>1e3||(e.match(new RegExp("\\p{L}","gu"))??[]).length<6||/^(?:https?:\/\/\S+|[A-Za-z0-9+/=]{80,})$/u.test(e))}function tn(e,t,n,r=0){if(!(r>6)&&!(typeof e=="string"&&t&&!lr.has(t))){if(typeof e=="string"){n.push(e);return}if(Array.isArray(e)){for(let o of e.slice(0,50))tn(o,t,n,r+1);return}if(!(!e||typeof e!="object"))for(let[o,s]of Object.entries(e))(lr.has(o)||ga.has(o))&&tn(s,o,n,r+1)}}function Sa(e){let t=[];tn(e.data,void 0,t);let n=[],r=new Set;for(let o of t)for(let s of o.split(/\n+|(?<=[.!?])\s+/u)){let i=fr(s);if(ha(i)&&!r.has(i)&&(r.add(i),n.push(i),n.length>=50))return n}return n}function dr(e){return(e.role??(typeof e.data.role=="string"?e.data.role:"")).toLowerCase()}function ka(e,t,n){if(n.type==="decision")return{kind:"decision",confidence:1};if(n.type==="todo")return{kind:"todo",confidence:1};let r=t==="user"||n.type==="user_prompt",o=t==="assistant"||n.type==="assistant_message";return r&&_(e,pr)?{kind:"rule",confidence:.98}:r&&_(e,ca)?{kind:"rule",confidence:.92}:_(e,ua)?{kind:_(e,ur)?"architecture":"decision",confidence:r?.93:.86}:r&&_(e,la)?{kind:"todo",confidence:.87}:_(e,ur)&&_(e,pa)?{kind:"architecture",confidence:r?.88:.82}:o&&_(e,da)?{kind:"fix",confidence:.8}:r&&_(e,fa)&&_(e,ma)?{kind:"context",confidence:.79}:null}function va(e,t,n){let r=t==="user"||n.type==="user_prompt",o=t==="assistant"||n.type==="assistant_message",s=!!n.provenance.sourcePath&&(e==="architecture"||e==="context"||e==="fix"),i=e==="fix"&&/(?:test|tests|pass|passed|passing)/iu.test(JSON.stringify(n.data));return{userExplicit:r,sourceVerified:s,testVerified:i,crossSessionConfirmations:1,assistantDerived:o}}function wa(e){switch(e){case"rule":return"rule";case"decision":case"architecture":return"decision";case"todo":return"todo";case"fix":case"context":return"code"}}function ba(e,t,n){return e==="rule"&&_(n,pr)?"critical":e==="architecture"||e==="decision"||e==="rule"?"high":e==="fix"||e==="context"?"normal":cr(t,n)}function mr(e,t){let n=[],r=new Set,o=new Map;for(let s of t){let i=typeof s.data.messageId=="string"?s.data.messageId:void 0,a=dr(s);i&&a&&o.set(i,a)}for(let s of t){let i=dr(s),a=typeof s.data.messageId=="string"?s.data.messageId:void 0;!i&&a&&(i=o.get(a)??"");for(let c of Sa(s)){let u=ka(c,i,s);if(!u||u.confidence<.75)continue;let p=wa(u.kind),l=ya(c),f=w([e.projectId,u.kind,l].join("|"));if(r.has(f))continue;r.add(f);let d=s.provenance.sourcePath?[s.provenance.sourcePath]:[],m=s.sourceEventId?[s.sourceEventId]:[];n.push({version:1,fingerprint:f,projectId:e.projectId,agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,kind:u.kind,type:p,content:c,confidence:u.confidence,importance:ba(u.kind,p,c),evidence:va(u.kind,i,s),tags:[p],provenance:{agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,eventIds:[s.id],sourceEventIds:m,sourcePaths:d,firstSequence:s.sequence,lastSequence:s.sequence},createdAt:s.timestamp})}}return n}import{createHash as xa}from"node:crypto";var Ca=["project-knowledge","implementation","continuation","session-context"],ja={"project-knowledge":"Project knowledge",implementation:"Implementation state",continuation:"Work continuation","session-context":"Session context"};function nn(e){return xa("sha256").update(e).digest("hex")}function st(e,t){return`${e}:${nn(t).slice(0,24)}`}function Ia(e){try{return nn(JSON.stringify(e))}catch{return nn(String(e))}}function Q(e){let t=new Set,n=[];for(let r of e){let o=r?.replace(/\s+/gu," ").trim();if(!o)continue;let s=o.normalize("NFKC").toLowerCase();t.has(s)||(t.add(s),n.push(o))}return n}function yr(e,t=420){let n=e.replace(/\s+/gu," ").trim();return n.length<=t?n:`${n.slice(0,Math.max(0,t-1)).trimEnd()}\u2026`}function Ma(e){return e==="rule"||e==="architecture"?"project-knowledge":e==="decision"||e==="fix"?"implementation":e==="todo"?"continuation":"session-context"}function gr(e){return e.length===0?0:e.reduce((t,n)=>t+n,0)/e.length}function Aa(e){return e.slice().sort((t,n)=>n.importanceScore-t.importanceScore||n.confidence-t.confidence||t.id.localeCompare(n.id)).slice(0,5).map(t=>yr(t.content)).join(" | ")}function Ea(e){return e.slice().sort((t,n)=>n.importanceScore-t.importanceScore||n.confidence-t.confidence||t.id.localeCompare(n.id)).slice(0,6).map(t=>yr(t.content)).join(`
`)}function hr(e,t){let n=e.slice().sort((f,d)=>f.sequence-d.sequence||f.timestamp.localeCompare(d.timestamp)||f.id.localeCompare(d.id)),r=n.map(f=>({id:st("raw",[f.projectId,f.agent,f.nativeSessionId,f.id,String(f.sequence)].join("|")),level:"raw",eventId:f.id,sourceEventId:f.sourceEventId,sequence:f.sequence,type:f.type,role:f.role,timestamp:f.timestamp,sourcePath:f.provenance.sourcePath,payloadDigest:Ia(f.data)})),o=new Map,s=new Map;n.forEach((f,d)=>{let m=r[d];m&&(o.set(f.id,m.id),f.sourceEventId&&s.set(f.sourceEventId,m.id))});let i=t.map(f=>{let d=Q([...f.provenance.eventIds.map(m=>o.get(m)),...f.provenance.sourceEventIds.map(m=>s.get(m))]);return{id:st("fact",f.fingerprint),level:"fact",fingerprint:f.fingerprint,kind:f.kind,type:f.type,content:f.content,knowledgeClass:f.knowledgeClass,importanceScore:f.importanceScore,confidence:f.confidence,tags:Q([...f.tags,"level:fact",`class:${f.knowledgeClass}`,`kind:${f.kind}`]),rawIds:d,sourcePaths:Q(f.provenance.sourcePaths)}}),a=new Map;for(let f of i){let d=Ma(f.kind),m=a.get(d)??[];m.push(f),a.set(d,m)}let c=[];for(let f of Ca){let d=a.get(f);if(!d?.length)continue;let m=d.slice().sort((y,g)=>g.importanceScore-y.importanceScore||g.confidence-y.confidence||y.id.localeCompare(g.id)),S=m.map(y=>y.id);c.push({id:st("scene",`${f}|${S.join("|")}`),level:"scene",kind:f,title:ja[f],summary:Aa(m),factIds:S,importanceScore:Math.max(...m.map(y=>y.importanceScore)),confidence:gr(m.map(y=>y.confidence)),tags:Q(["level:scene",`scene:${f}`,...m.flatMap(y=>y.tags)]),sourcePaths:Q(m.flatMap(y=>y.sourcePaths))})}let u=new Map(i.map(f=>[f.id,f])),p=[];for(let f of c){let m=f.factIds.map(g=>u.get(g)).filter(g=>!!g).filter(g=>(g.knowledgeClass==="permanent"||g.knowledgeClass==="task")&&g.importanceScore>=.55);if(m.length===0)continue;let S=m.some(g=>g.knowledgeClass==="permanent")?"permanent":"task",y=Ea(m);p.push({id:st("knowledge",`${f.id}|${S}|${m.map(g=>g.id).join("|")}`),level:"knowledge",knowledgeClass:S,title:f.title,content:y,sceneIds:[f.id],factIds:m.map(g=>g.id),importanceScore:Math.max(...m.map(g=>g.importanceScore)),confidence:gr(m.map(g=>g.confidence)),tags:Q(["level:knowledge",`class:${S}`,`scene:${f.kind}`,...m.flatMap(g=>g.tags)]),sourcePaths:Q(m.flatMap(g=>g.sourcePaths))})}let l=[];for(let f of i)for(let d of f.rawIds)l.push({from:d,to:f.id,type:"supports"});for(let f of c)for(let d of f.factIds)l.push({from:d,to:f.id,type:"belongs_to"});for(let f of p)for(let d of f.sceneIds)l.push({from:d,to:f.id,type:"promotes_to"});return{schema:"toolnet.memory-hierarchy.v1",version:1,raw:r,facts:i,scenes:c,knowledge:p,links:l,stats:{raw:r.length,facts:i.length,scenes:c.length,knowledge:p.length,links:l.length}}}function it(e){return e?Math.ceil(e.length/3.5):0}function at(e,t){if(!e)return"";if(it(e)<=t)return e;let r=Math.floor(t*3.5),o=e.slice(0,r),s=o.lastIndexOf("."),i=o.lastIndexOf(`
`),a=Math.max(s,i);return a>r*.7?o.slice(0,a+1):o}function Z(){let e=Be(),t=process.env.TOOLNET_SESSION_SAVE||"summary",n=process.env.TOOLNET_RAW_TRANSCRIPT==="on"||t==="archive"||t==="full",r=process.env.TOOLNET_MEMORY_PROMOTION||"conservative",o=parseFloat(process.env.TOOLNET_PROMOTE_MIN_SCORE||"0.65"),s=parseInt(process.env.TOOLNET_SESSION_SUMMARY_MAX_TOKENS||"700",10),i=parseInt(process.env.TOOLNET_DURABLE_MEMORY_MAX_ITEMS_PER_SESSION||"10",10),a=n,c=process.env.TOOLNET_RAW_TRANSCRIPT_REMOTE==="on"||t==="full";return{sessionSave:t,rawTranscript:n,memoryPromotion:r,promoteMinScore:o,sessionSummaryMaxTokens:s,durableMemoryMaxItemsPerSession:i,archiveLocal:a,archiveRemote:c}}function Sr(e){return(e||Z()).rawTranscript}function kr(e){return(e||Z()).durableMemoryMaxItemsPerSession}function vr(e){return(e||Z()).sessionSummaryMaxTokens}function wr(e){return(e||Z()).archiveRemote}var br=new J;function xr(e){let t=e.trim();if(t.startsWith("{")&&t.endsWith("}")||t.startsWith("[")&&t.endsWith("]"))try{let r=JSON.parse(t);return JSON.stringify(br.sanitizeValue(r))}catch{}let n=br.sanitize(e).text;return n=n.replace(/("(?:api[_-]?key|token|secret|password|cookie|authorization)"\s*:\s*)"[^"]*"/gi,'$1"[REDACTED]"').replace(/('(?:api[_-]?key|token|secret|password|cookie|authorization)'\s*:\s*)'[^']*'/gi,"$1'[REDACTED]'").replace(/\b(api[_-]?key|token|secret|password|cookie|authorization)\b\s*[:=]\s*[^\s,;]+/gi,"$1=[REDACTED]").replace(/\bbearer\s+[A-Za-z0-9._~+/=-]+/gi,"Bearer [REDACTED]"),n}function Pa(e,t){let n=e.toLowerCase(),r=.5,o=["nh\u1EDB","remember","quy t\u1EAFc","rule","t\u1EEB gi\u1EDD","from now","kh\xF4ng \u0111\u01B0\u1EE3c","must not","lu\xF4n lu\xF4n","always","never","critical","important","blocker","deploy","production","architecture"];for(let i of o)n.includes(i)&&(r+=.15);t==="rule"||t==="architecture"||t==="blocker"?r+=.2:t==="decision"||t==="deploy"?r+=.15:(t==="fix"||t==="next_action")&&(r+=.1),e.length<20?r-=.3:e.length>500&&(r-=.1);let s=[/npm (notice|warn|ERR)/i,/\d+ packages? in \d+/i,/found \d+ vulnerabilities/i,/up to date/i,/added \d+ packages/i,/^(ok|done|success|error|warning)$/i];for(let i of s)i.test(e)&&(r-=.4);return Math.max(0,Math.min(1,r))}function Oa(e,t){let n=[],r=new Set;for(let i of e){let a=i.split(`
`).filter(c=>c.trim());for(let c of a){let u=c.trim();if(u.length<15)continue;let p=u.toLowerCase().replace(/\s+/g," ");if(r.has(p))continue;r.add(p);let l="decision";/\b(rule|quy tắc|policy|standard|convention)\b/i.test(u)||/\b(always|never|must|should|từ giờ|không được)\b/i.test(u)?l="rule":/\b(fix|fixed|bug|issue|error|lỗi)\b/i.test(u)?l="fix":/\b(blocker|blocked|stuck|cannot|không thể)\b/i.test(u)?l="blocker":/\b(next|todo|action|task|cần làm)\b/i.test(u)?l="next_action":/\b(deploy|release|publish|ship)\b/i.test(u)?l="deploy":/\b(architecture|design|structure|pattern)\b/i.test(u)?l="architecture":/\.(ts|js|py|go|rs|java|cpp|c|h)\b/i.test(u)&&(l="file");let f=Pa(u,l);if(f<.3)continue;let d=xr(u);n.push({category:l,text:d,importance:f,sourceSessionId:t})}}let o=Z(),s=kr(o);return n.sort((i,a)=>a.importance-i.importance).slice(0,s)}function Ta(e){let t=Z(),n=vr(t),s=e.join(`

`).split(`
`).filter(i=>{let a=i.trim();return a.length>20&&!a.startsWith("npm")&&!a.startsWith("\u2713")&&!a.startsWith("Error:")}).slice(0,20).map(i=>xr(i)).join(`
`);return at(s,n)}function ct(e,t){let r=(Array.isArray(e)?e:e.split(`

`).filter(d=>d.trim())).map(d=>typeof d=="string"?d:JSON.stringify(d)).filter(d=>d.trim()),o=Oa(r,t),s=o.filter(d=>d.category==="decision").map(d=>d.text),i=o.filter(d=>d.category==="rule").map(d=>d.text),a=o.filter(d=>d.category==="file").map(d=>d.text),c=o.filter(d=>d.category==="fix").map(d=>d.text),u=o.filter(d=>d.category==="blocker").map(d=>d.text),p=o.filter(d=>d.category==="next_action").map(d=>d.text),l=o.filter(d=>d.category==="deploy").map(d=>d.text);return{summary:Ta(r),decisions:s,projectRules:i,filesChanged:a,bugsFixed:c,commands:l,blockers:u,nextActions:p,durableFacts:o}}function G(e){let t=new Set,n=[];for(let r of e){let o=r?.replace(/\s+/g," ").trim();if(!o)continue;let s=o.normalize("NFKC").toLowerCase();t.has(s)||(t.add(s),n.push(o))}return n}function Ra(e){let t=new Map;for(let n of e){if(!n||!n.id||!Number.isFinite(n.sequence))continue;let r=n.sourceEventId?`${n.agent}:${n.sourceEventId}`:n.id,o=t.get(r);(!o||n.sequence>o.sequence)&&t.set(r,n)}return[...t.values()].sort((n,r)=>n.sequence-r.sequence||n.timestamp.localeCompare(r.timestamp))}function Na(e){let t=e.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}_./:-]+/gu)??[],n=new Set;for(let r of t)if(!(r.length<2||/^\d+$/u.test(r))&&(n.add(r),n.size>=40))break;return[...n]}function _a(e){let t=en(e);return{...e,knowledgeClass:t.knowledgeClass,importanceScore:t.score,retrievalTerms:Na(e.content),tags:G([...e.tags,"level:fact",`class:${t.knowledgeClass}`,`kind:${e.kind}`])}}function $a(e){return e.map(t=>{try{return JSON.stringify({type:t.type,role:t.role,data:t.data,provenance:{sourcePath:t.provenance.sourcePath,files:t.provenance.files}})}catch{return""}}).filter(Boolean)}function La(e,t,n){let r=ct($a(t),e.nativeSessionId),o=n.filter(u=>u.kind==="todo").map(u=>u.content),s=n.flatMap(u=>u.provenance.sourcePaths),i=n.filter(u=>u.kind==="architecture").map(u=>u.content),a=G([...o,...r.nextActions]),c=G([...r.nextActions,...o]);return{summary:r.summary,state:{task:c[0]??a[0],decisions:G(r.decisions),files:G([...r.filesChanged,...s]),todos:a,completed:G(r.bugsFixed),blockers:G(r.blockers),nextActions:c,architecture:G(i)}}}function ut(e,t){let n=Ra(t),r=mr(e,n).map(_a),o=r.filter(p=>en(p).persist).sort((p,l)=>l.importanceScore-p.importanceScore),{summary:s,state:i}=La(e,n,o),a=o.map(p=>({fingerprint:p.fingerprint,kind:p.kind,knowledgeClass:p.knowledgeClass,importanceScore:p.importanceScore,content:p.content,terms:p.retrievalTerms})),c=hr(n,o),u=p=>r.filter(l=>l.knowledgeClass===p).length;return{version:2,normalizedEvents:n,summary:s,state:i,candidates:o,retrievalIndex:a,hierarchy:c,stats:{inputEvents:t.length,normalizedEvents:n.length,extractedCandidates:r.length,persistedCandidates:o.length,permanent:u("permanent"),task:u("task"),session:u("session"),transient:u("transient")}}}import{createHash as Fa}from"node:crypto";import{chmodSync as Cr,existsSync as Ka,mkdirSync as Da,readFileSync as Wa,renameSync as za,writeFileSync as jr}from"node:fs";import{dirname as Ir,join as lt}from"node:path";var sn="toolnet.context-offload.v1",qa="toolnet.context-offload-asset.v1",Ba=256,Va=new Set(["tool_call","tool_result","file_read","file_write","file_edit","command","test","artifact"]);function Mr(e){return lt(e,".toolnet","offload")}function Ja(e){return lt(Mr(e),"assets")}function Ar(e){return lt(Mr(e),"graph.json")}function Er(e){Da(e,{recursive:!0,mode:448});try{Cr(e,448)}catch{}}function Ha(e,t){Er(Ir(e));let n=`${e}.${process.pid}.${Date.now()}.tmp`;jr(n,t,{encoding:"utf8",mode:384}),za(n,e);try{Cr(e,384)}catch{}}function on(e){return Array.isArray(e)?e.map(on):e&&typeof e=="object"?Object.fromEntries(Object.entries(e).sort(([t],[n])=>t.localeCompare(n)).map(([t,n])=>[t,on(n)])):e}function Ga(e){return Fa("sha256").update(JSON.stringify(on(e)),"utf8").digest("hex")}function rn(){return{schema:sn,version:1,updatedAt:new Date(0).toISOString(),nodes:[]}}function Ua(e){let t=Ar(e);if(!Ka(t))return rn();try{let n=JSON.parse(Wa(t,"utf8"));return n.schema!==sn||n.version!==1||!Array.isArray(n.nodes)?rn():n}catch{return rn()}}function Ya(e,t){Ha(Ar(e),JSON.stringify(t,null,2)+`
`)}function Xa(e,t=260){if(typeof e!="string")return null;let n=e.replace(/\s+/gu," ").trim();return n?n.slice(0,t):null}function Qa(e){let t=[...e.provenance.files??[],e.provenance.sourcePath],n=[];for(let r of t){let o=Xa(r);if(!(!o||n.includes(o))&&(n.push(o),n.length===3))break}return n}function Za(e){return`${e.agent}:${e.sourceEventId??e.id}`.replace(/\s+/gu," ").trim().slice(0,120)}function ec(e,t){Er(Ir(e));try{return jr(e,t,{encoding:"utf8",flag:"wx",mode:384}),!0}catch(n){if(n.code==="EEXIST")return!1;throw n}}function tc(e,t){let n=e.nodes.find(o=>o.id===t.id),r=n?{...n,kind:t.kind,bytes:t.bytes,sourceRefs:Array.from(new Set([...n.sourceRefs,...t.sourceRefs])).slice(-8),files:Array.from(new Set([...n.files,...t.files])).slice(0,6)}:t;return{schema:sn,version:1,updatedAt:new Date().toISOString(),nodes:[...e.nodes.filter(o=>o.id!==t.id),r].slice(-Ba)}}function Pr(e,t){let n=Ua(e),r=0,o=0,s=0,i=[];for(let a of t){if(!Va.has(a.type))continue;r+=1;let c=Ga({type:a.type,data:a.data}),u={schema:qa,version:1,assetId:c,event:{type:a.type,agent:a.agent,nativeSessionId:a.nativeSessionId,timestamp:a.timestamp,sourceEventId:a.sourceEventId,provenance:a.provenance,data:a.data}},p=JSON.stringify(u,null,2)+`
`;ec(lt(Ja(e),`${c}.json`),p)?o+=1:s+=1,i.push(c),n=tc(n,{id:c,kind:a.type,bytes:Buffer.byteLength(p,"utf8"),createdAt:a.timestamp,sourceRefs:[Za(a)],files:Qa(a)})}return r>0&&Ya(e,n),{eligible:r,written:o,deduped:s,graphNodes:n.nodes.length,assetIds:i}}import{createHash as uc}from"node:crypto";import{existsSync as lc,readdirSync as dc,readFileSync as pc}from"node:fs";import{basename as fc,join as Hr}from"node:path";import{randomUUID as Rr}from"node:crypto";var M=class extends Error{constructor(n,r){super(n);this.statusCode=r}statusCode};function Ae(e){let t=new Set,n=[];for(let r of e){let o=r.replace(/\s+/gu," ").trim();if(!o)continue;let s=o.normalize("NFKC").toLowerCase();t.has(s)||(t.add(s),n.push(o))}return n}function te(e){let t=e.normalize("NFKD").replace(/[\u0300-\u036f]/gu,"").toLowerCase().replace(/[^a-z0-9]+/gu,"-").replace(/^-+|-+$/gu,"").slice(0,120);if(!t)throw new M("Invalid Wiki slug",400);return t}function Or(e){let t=[];for(let n of e.matchAll(/\[\[([^\[\]]+)\]\]/gu)){let r=n[1]?.trim();r&&t.push(te(r))}return Ae(t)}function nc(e){return e.normalize("NFKC").toLowerCase().split(/[^\p{L}\p{N}_-]+/u).map(t=>t.trim()).filter(t=>t.length>=2)}function Tr(e){return{id:`revision-${Rr()}`,pageId:e.id,slug:e.slug,revision:e.revision,title:e.title,...e.summary?{summary:e.summary}:{},content:e.content,tags:[...e.tags],links:[...e.links],createdAt:e.updatedAt}}function ee(e){return structuredClone(e)}var dt=class{constructor(t){this.store=t}store;state;queue=Promise.resolve();async initialize(){await this.ensureState()}async ensureState(){return this.state||(this.state=await this.store.load()),this.state}async mutate(t){let n,r=this.queue.then(async()=>{let o=await this.ensureState();n=t(o),o.updatedAt=new Date().toISOString(),await this.store.save(o)});return this.queue=r.then(()=>{},()=>{}),await r,n}async summary(){let t=await this.ensureState(),n=new Set(t.pages.flatMap(r=>r.links));return{schema:"toolnet.wiki-summary.v1",projectId:t.projectId,pages:t.pages.length,revisions:t.revisions.length,tags:Ae(t.pages.flatMap(r=>r.tags)).sort((r,o)=>r.localeCompare(o)),links:t.pages.reduce((r,o)=>r+o.links.length,0),orphanPages:t.pages.filter(r=>r.links.length===0&&!n.has(r.slug)).length,automatedPages:t.pages.filter(r=>r.tags.some(o=>o.startsWith("toolnet-auto-"))).length,updatedAt:t.updatedAt}}async listPages(){let t=await this.ensureState();return ee([...t.pages].sort((n,r)=>n.title.localeCompare(r.title)))}async getPage(t){let n=await this.ensureState(),r=te(t),o=n.pages.find(s=>s.slug===r||s.id===t);if(!o)throw new M(`Wiki page not found: ${t}`,404);return ee(o)}async createPage(t){return this.mutate(n=>{let r=t.title.trim(),o=t.content.trim();if(!r)throw new M("Wiki title is required",400);let s=te(t.slug??r);if(n.pages.some(c=>c.slug===s))throw new M(`Wiki page already exists: ${s}`,409);let i=new Date().toISOString(),a={id:`wiki-${Rr()}`,slug:s,title:r,...t.summary?.trim()?{summary:t.summary.trim()}:{},content:o,tags:Ae(t.tags??[]),links:Or(o),revision:1,createdAt:i,updatedAt:i};return n.pages.push(a),n.revisions.push(Tr(a)),ee(a)})}async updatePage(t,n){return this.mutate(r=>{let o=te(t),s=r.pages.find(i=>i.slug===o||i.id===t);if(!s)throw new M(`Wiki page not found: ${t}`,404);if(n.title!==void 0){let i=n.title.trim();if(!i)throw new M("Wiki title is required",400);s.title=i}if(n.summary!==void 0){let i=n.summary.trim();i?s.summary=i:delete s.summary}return n.content!==void 0&&(s.content=n.content.trim(),s.links=Or(s.content)),n.tags!==void 0&&(s.tags=Ae(n.tags)),s.revision+=1,s.updatedAt=new Date().toISOString(),r.revisions.push(Tr(s)),ee(s)})}async history(t){let n=await this.getPage(t),r=await this.ensureState();return ee(r.revisions.filter(o=>o.pageId===n.id).sort((o,s)=>s.revision-o.revision))}async backlinks(t){let n=await this.getPage(t),r=await this.ensureState();return ee(r.pages.filter(o=>o.links.includes(n.slug)).sort((o,s)=>o.title.localeCompare(s.title)))}async search(t,n=10){let r=await this.ensureState(),o=Ae(nc(t));if(o.length===0)return[];let s=Math.max(1,Math.min(20,Math.floor(n))),i=[];for(let a of r.pages){let c=a.title.toLowerCase(),u=a.slug.toLowerCase(),p=a.summary?.toLowerCase()??"",l=a.content.toLowerCase(),f=a.tags.map(m=>m.toLowerCase()),d=0;for(let m of o)u===m&&(d+=12),c===m&&(d+=10),c.includes(m)&&(d+=6),u.includes(m)&&(d+=5),f.some(S=>S===m)?d+=5:f.some(S=>S.includes(m))&&(d+=3),p.includes(m)&&(d+=2),l.includes(m)&&(d+=1);d>0&&i.push({page:ee(a),score:d})}return i.sort((a,c)=>c.score-a.score||c.page.updatedAt.localeCompare(a.page.updatedAt)).slice(0,s)}};var Nr="wiki/state.v1.json";function rc(e){let t=new Date().toISOString();return{schema:"toolnet.wiki.v1",version:1,projectId:e.id,pages:[],revisions:[],createdAt:t,updatedAt:t}}function oc(e,t){let n=JSON.parse(e);if(n.schema!=="toolnet.wiki.v1"||n.version!==1||n.projectId!==t.id||!Array.isArray(n.pages)||!Array.isArray(n.revisions))throw new Error("Invalid ToolNet Wiki state");return n}var pt=class{constructor(t,n){this.storage=t;this.project=n}storage;project;async load(){let t=await this.storage.getText(Nr);if(!t){let n=rc(this.project);return await this.save(n),n}return oc(t,this.project)}async save(t){await this.storage.put(Nr,JSON.stringify(t,null,2),"application/json")}};import{createHash as sc,randomUUID as _r}from"node:crypto";var $r="wiki/governance.v1.json",Dr="toolnet.knowledge-governance.v1",Lr=500,Ee={autoApproveThreshold:.86,criticalApproveThreshold:.94,staleAfterDays:90};function ic(e,t=0,n=1){return Math.max(t,Math.min(n,e))}function an(e){return e.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/gu," ").trim()}function Fr(e){return sc("sha256").update(e.normalize("NFKC").replace(/\s+/gu," ").trim()).digest("hex")}function ac(e){let t=[e.title,e.summary??"",e.content.slice(0,2e3),...e.tags].join(" ").toLowerCase();return/\b(?:architecture|security|authentication|authorization|auth|database|production|deploy|deployment|payment|billing|permission|permissions|acl|credential|secret|migration)\b/u.test(t)}function cc(e){let t=e.sourceType==="skill"?.96:e.sourceType==="memory"?.94:.88,n=e.tags.map(r=>r.toLowerCase());return(n.includes("permanent")||n.includes("task"))&&(t+=.03),e.content.length>=200&&(t+=.02),e.content.length<80&&(t-=.05),e.title.length<4&&(t-=.05),ic(t)}function Kr(e){let t=new Date().toISOString();return{schema:Dr,version:1,projectId:e,policy:{...Ee},reviews:[],audit:[],createdAt:t,updatedAt:t}}function Wr(e){let t=e.autoApproveThreshold??Ee.autoApproveThreshold,n=e.criticalApproveThreshold??Ee.criticalApproveThreshold,r=e.staleAfterDays??Ee.staleAfterDays;if(!Number.isFinite(t)||t<.5||t>1)throw new M("Invalid autoApproveThreshold",400);if(!Number.isFinite(n)||n<.5||n>1)throw new M("Invalid criticalApproveThreshold",400);if(!Number.isInteger(r)||r<1||r>3650)throw new M("Invalid staleAfterDays",400);return{autoApproveThreshold:t,criticalApproveThreshold:n,staleAfterDays:r}}var ft=class{constructor(t,n){this.storage=t;this.project=n}storage;project;async load(){let t=await this.storage.getText($r);if(!t){let n=Kr(this.project.id);return await this.save(n),n}try{let n=JSON.parse(t);if(n.schema!==Dr||n.version!==1||n.projectId!==this.project.id||!Array.isArray(n.reviews)||!Array.isArray(n.audit))throw new Error("invalid");return{...n,policy:Wr(n.policy??Ee)}}catch{let n=Kr(this.project.id);return await this.save(n),n}}async save(t){await this.storage.put($r,JSON.stringify(t,null,2),"application/json")}},mt=class{constructor(t){this.store=t}store;state;queue=Promise.resolve();async initialize(){await this.ensureState()}async ensureState(){return this.state||(this.state=await this.store.load()),this.state}audit(t,n,r,o={}){t.audit.push({id:_r(),action:n,principal:r,...o.reviewId?{reviewId:o.reviewId}:{},...o.sourceKey?{sourceKey:o.sourceKey}:{},timestamp:new Date().toISOString(),...o.metadata?{metadata:o.metadata}:{}}),t.audit.length>Lr&&(t.audit=t.audit.slice(-Lr))}async mutate(t){let n,r=this.queue.then(async()=>{let o=await this.ensureState();n=await t(o),o.updatedAt=new Date().toISOString(),await this.store.save(o)});return this.queue=r.then(()=>{},()=>{}),await r,n}async policy(){return{...(await this.ensureState()).policy}}async setPolicy(t,n){return this.mutate(r=>(r.policy=Wr({...r.policy,...t}),this.audit(r,"policy:update",n,{metadata:{...r.policy}}),{...r.policy}))}async summary(){let t=await this.ensureState(),n=r=>t.reviews.filter(o=>o.status===r).length;return{schema:"toolnet.knowledge-governance-summary.v1",projectId:t.projectId,pending:n("pending"),approved:n("approved"),rejected:n("rejected"),superseded:n("superseded"),criticalPending:t.reviews.filter(r=>r.status==="pending"&&r.risk==="critical").length,conflictPending:t.reviews.filter(r=>r.status==="pending"&&r.risk==="conflict").length,auditEvents:t.audit.length,policy:{...t.policy},updatedAt:t.updatedAt}}async listReviews(t){let n=await this.ensureState();return structuredClone(n.reviews.filter(r=>!t||r.status===t).sort((r,o)=>o.updatedAt.localeCompare(r.updatedAt)))}async auditLog(t=100){let n=await this.ensureState(),r=Math.max(1,Math.min(500,Math.floor(t)));return structuredClone(n.audit.slice(-r).reverse())}async assess(t,n){let r=await this.ensureState(),o=cc(t),s=an(t.title),i=n.filter(p=>p.slug!==t.slug&&an(p.title)===s&&Fr(p.content)!==Fr(t.content)).map(p=>p.slug),a=ac(t),c=[];o<r.policy.autoApproveThreshold&&c.push(`confidence:${o.toFixed(2)}`),a&&o<r.policy.criticalApproveThreshold&&c.push("critical-knowledge"),i.length>0&&c.push("conflicting-knowledge");let u=i.length>0?"conflict":a?"critical":"normal";return{confidence:o,risk:u,requiresReview:i.length>0||o<r.policy.autoApproveThreshold||a&&o<r.policy.criticalApproveThreshold,reasons:c,conflicts:i}}async gate(t,n){let r=await this.assess(t,n);return this.mutate(o=>{let s=o.reviews.find(c=>c.sourceKey===t.sourceKey&&c.digest===t.digest);if(s?.status==="approved")return{allowed:!0,mode:"review-approved",assessment:r,review:structuredClone(s)};if(s?.status==="rejected")return{allowed:!1,mode:"rejected",assessment:r,review:structuredClone(s)};if(!r.requiresReview)return this.audit(o,"knowledge:auto-approved","system",{sourceKey:t.sourceKey,metadata:{confidence:r.confidence,risk:r.risk}}),{allowed:!0,mode:"auto-approved",assessment:r};if(s?.status==="pending")return{allowed:!1,mode:"pending-review",assessment:r,review:structuredClone(s)};let i=new Date().toISOString(),a={id:_r(),sourceKey:t.sourceKey,sourceType:t.sourceType,slug:t.slug,marker:t.marker,digest:t.digest,title:t.title,...t.summary?{summary:t.summary}:{},content:t.content,tags:[...new Set([...t.tags,t.marker])],confidence:r.confidence,risk:r.risk,reasons:[...r.reasons],conflicts:[...r.conflicts],status:"pending",createdAt:i,updatedAt:i};return o.reviews.push(a),this.audit(o,"knowledge:review-requested","system",{reviewId:a.id,sourceKey:a.sourceKey,metadata:{confidence:a.confidence,risk:a.risk}}),{allowed:!1,mode:"pending-review",assessment:r,review:structuredClone(a)}})}async markApplied(t,n){await this.mutate(r=>{let o=r.reviews.find(s=>s.sourceKey===t&&s.digest===n&&s.status==="approved");o&&(o.appliedAt=new Date().toISOString(),o.updatedAt=o.appliedAt,this.audit(r,"knowledge:applied",o.reviewedBy??"system",{reviewId:o.id,sourceKey:t}))})}async decide(t,n,r){return this.mutate(async o=>{let s=o.reviews.find(u=>u.id===t);if(!s)throw new M(`Governance review not found: ${t}`,404);if(s.status!=="pending")throw new M("Governance review is already resolved",409);let i=new Date().toISOString();if(s.reviewedAt=i,s.reviewedBy=n.principal,s.updatedAt=i,n.note?.trim()&&(s.reviewNote=n.note.trim()),n.action==="reject")return s.status="rejected",this.audit(o,"knowledge:rejected",n.principal,{reviewId:t,sourceKey:s.sourceKey}),structuredClone(s);if(n.action==="supersede")return s.status="superseded",n.targetReviewId&&(s.supersededBy=n.targetReviewId),this.audit(o,"knowledge:superseded",n.principal,{reviewId:t,sourceKey:s.sourceKey,metadata:{targetReviewId:n.targetReviewId}}),structuredClone(s);if(n.action==="merge"){if(!n.targetReviewId)throw new M("targetReviewId is required for merge",400);let u=o.reviews.find(p=>p.id===n.targetReviewId);if(!u)throw new M("Merge target review not found",404);return s.status="superseded",s.mergedInto=u.id,this.audit(o,"knowledge:merged",n.principal,{reviewId:t,sourceKey:s.sourceKey,metadata:{targetReviewId:u.id}}),structuredClone(s)}s.status="approved";let c=(await r.listPages()).find(u=>u.slug===s.slug);if(c&&!c.tags.includes(s.marker))throw new M(`Wiki page '${s.slug}' is manually managed`,409);return c?await r.updatePage(s.slug,{title:s.title,summary:s.summary??"",content:s.content,tags:s.tags}):await r.createPage({slug:s.slug,title:s.title,...s.summary?{summary:s.summary}:{},content:s.content,tags:s.tags}),s.appliedAt=i,this.audit(o,"knowledge:approved",n.principal,{reviewId:t,sourceKey:s.sourceKey}),structuredClone(s)})}async quality(t){let n=await this.ensureState(),r=await t.listPages(),o=Date.now(),s=n.policy.staleAfterDays*864e5,i=r.map(p=>{let l=o-Date.parse(p.updatedAt);return{slug:p.slug,title:p.title,updatedAt:p.updatedAt,ageDays:Math.max(0,Math.floor(l/864e5)),stale:Number.isFinite(l)&&l>s}}).filter(p=>p.stale).map(({stale:p,...l})=>l),a=new Map;for(let p of r){let l=an(p.title),f=a.get(l)??[];f.push(p),a.set(l,f)}let c=[...a.entries()].filter(([,p])=>p.length>1).map(([p,l])=>({title:p,pages:l.map(f=>f.slug)})),u=n.reviews.filter(p=>p.status==="pending");return{schema:"toolnet.knowledge-quality.v1",totalPages:r.length,automatedPages:r.filter(p=>p.tags.some(l=>l.startsWith("toolnet-auto-"))).length,manualPages:r.filter(p=>!p.tags.some(l=>l.startsWith("toolnet-auto-"))).length,stalePages:i,duplicateTitles:c,pendingReviews:u.length,lowConfidenceReviews:u.filter(p=>p.confidence<n.policy.autoApproveThreshold).length,conflicts:u.filter(p=>p.risk==="conflict").length,generatedAt:new Date().toISOString()}}};var Gr="wiki/automation.v1.json",Ur="toolnet.wiki-automation.v1",ln=8e3,zr=new Set(["raw","rawtext","raw_text","rawtranscript","raw_transcript","transcript","messages","message","payload","prompt","response","assistantmessage","assistant_message","userprompt","user_prompt"]);function Oe(e){return uc("sha256").update(JSON.stringify(e)).digest("hex")}function Pe(e){if(!(!e||typeof e!="object"||Array.isArray(e)))return e}function qr(e){return Array.isArray(e)?e:[]}function Yr(e){return typeof e!="string"?void 0:e.replace(/\s+/gu," ").trim()||void 0}function cn(e){return Array.isArray(e)?e.map(Yr).filter(t=>!!t):[]}function F(e,t){for(let n of t){let r=Yr(e[n]);if(r)return r}}function Te(e){let t=new Set,n=[];for(let r of e){let o=r.replace(/\s+/gu," ").trim();if(!o)continue;let s=o.normalize("NFKC").toLowerCase();t.has(s)||(t.add(s),n.push(o))}return n}function gt(e,t=0,n=""){if(t>3)return[];let r=n.replace(/[^a-z0-9]/giu,"").toLowerCase();if(zr.has(r))return[];if(typeof e=="string"){let i=e.replace(/\s+/gu," ").trim();return i.length<8?[]:[i]}if(Array.isArray(e))return e.flatMap(i=>gt(i,t+1,n));let o=Pe(e);if(!o)return[];let s=[];for(let[i,a]of Object.entries(o)){let c=i.replace(/[^a-z0-9]/giu,"").toLowerCase();zr.has(c)||s.push(...gt(a,t+1,i))}return s}function Br(e){let n=Te(["content","summary","text","value","statement","description","decision","task","knowledge","context","outcome","reason","rationale"].flatMap(o=>gt(e[o],0,o)));return(n.length>0?n:Te(gt(e))).join(`

`).slice(0,ln)}function Vr(e,t){return F(e,["id","key","fingerprint","knowledgeId","sceneId"])??t}function Jr(e,t){return F(e,["title","name","topic","label","task","kind","type"])??t}function mc(e){return(F(e,["knowledgeClass","class","classification","scope"])??"").toLowerCase()}function gc(e){return(F(e,["kind","sceneKind","type"])??"").toLowerCase()}function yc(e){let t=Pe(e);if(!t)return[];let n=[],r=qr(t.knowledge);for(let[s,i]of r.entries()){let a=Pe(i);if(!a)continue;let c=mc(a);if(c==="session"||c==="transient")continue;let u=Br(a);if(u.length<20)continue;let p=Vr(a,Oe(a).slice(0,16)),l=Jr(a,`Durable Memory ${s+1}`);n.push({sourceKey:`memory:${p}`,sourceType:"memory",title:l,summary:F(a,["summary","description"]),content:u,tags:Te(["toolnet","auto","memory",...c?[c]:[]])})}let o=qr(t.scenes);for(let[s,i]of o.entries()){let a=Pe(i);if(!a)continue;let c=gc(a);if(c==="session-context")continue;let u=Br(a);if(u.length<20)continue;let p=Vr(a,Oe(a).slice(0,16)),l=Jr(a,`Knowledge Scene ${s+1}`);n.push({sourceKey:`scene:${p}`,sourceType:"scene",title:l,summary:F(a,["summary","description"]),content:u,tags:Te(["toolnet","auto","scene",...c?[c]:[]])})}return n}function hc(e){return Hr(e,".toolnet","memory","skills")}function Sc(e){let t=hc(e);if(!lc(t))return{candidates:[],failed:0};let n=[],r=0,o=dc(t).filter(s=>s.endsWith(".json")).sort();for(let s of o)try{let i=JSON.parse(pc(Hr(t,s),"utf8")),a=Pe(i);if(!a||a.schema!=="toolnet.skill-memory.v1")continue;let c=F(a,["id","fingerprint"])??fc(s,".json"),u=F(a,["task"])??"",p=F(a,["title"])||u||`Reusable Skill ${c.slice(0,8)}`,l=F(a,["summary"])??void 0,f=cn(a.steps),d=cn(a.verification),m=cn(a.files),S=[];u&&S.push(`## Task
${u}`),l&&S.push(`## Summary
${l}`),f.length>0&&S.push(`## Procedure
${f.map((g,k)=>`${k+1}. ${g}`).join(`
`)}`),d.length>0&&S.push(`## Verification
${d.map(g=>`- ${g}`).join(`
`)}`),m.length>0&&S.push(`## Relevant Files
${m.map(g=>`- \`${g}\``).join(`
`)}`);let y=S.join(`

`).slice(0,ln);if(y.length<20)continue;n.push({sourceKey:`skill:${c}`,sourceType:"skill",title:p,summary:l,content:y,tags:["toolnet","auto","skill","sop"]})}catch{r+=1}return{candidates:n,failed:r}}function un(e){let t=new Date().toISOString();return{schema:Ur,version:1,projectId:e,entries:[],createdAt:t,updatedAt:t}}async function kc(e,t){let n=await e.getText(Gr);if(!n)return un(t);try{let r=JSON.parse(n);return r.schema!==Ur||r.version!==1||r.projectId!==t||!Array.isArray(r.entries)?un(t):r}catch{return un(t)}}async function vc(e,t){await e.put(Gr,JSON.stringify(t,null,2),"application/json")}function wc(e){return`toolnet-auto-${Oe(e).slice(0,12)}`}function bc(e){let t=te(e.title).slice(0,72),n=Oe(e.sourceKey).slice(0,10);return te(`auto-${e.sourceType}-${t}-${n}`)}function xc(e){return[`> Auto-generated by ToolNet Knowledge Automation from ${e.sourceType==="skill"?"reusable Skill Memory":e.sourceType==="scene"?"semantic memory scene":"durable memory"}.`,"",e.content].join(`
`).slice(0,ln)}function Cc(e){return Oe({sourceType:e.sourceType,title:e.title,summary:e.summary,content:e.content,tags:e.tags})}function jc(e,t){return e.tags.includes(t)}async function Xr(e){let t=yc(e.hierarchy),n=Sc(e.project.rootPath),r=new Map;for(let d of[...t,...n.candidates])r.set(d.sourceKey,d);let o=[...r.values()].sort((d,m)=>d.sourceKey.localeCompare(m.sourceKey)),s={schema:"toolnet.wiki-automation-result.v1",scanned:t.length+n.candidates.length,eligible:o.length,created:0,updated:0,unchanged:0,skipped:0,failed:n.failed,reviewPending:0,autoApproved:0,reviewApproved:0,pages:[]},i=new dt(new pt(e.storage,e.project));await i.initialize();let a=new mt(new ft(e.storage,e.project));await a.initialize();let c=await kc(e.storage,e.project.id),u=await i.listPages(),p=new Map(u.map(d=>[d.slug,d])),l=new Map(c.entries.map(d=>[d.sourceKey,d]));for(let d of o)try{let m=wc(d.sourceKey),S=Cc(d),y=l.get(d.sourceKey),g=y?.slug??bc(d),k=p.get(g);if(k&&!jc(k,m)){s.skipped+=1;continue}let b=Te([...d.tags,m]),T=xc(d),P=await a.gate({sourceKey:d.sourceKey,sourceType:d.sourceType,slug:g,marker:m,digest:S,title:d.title,...d.summary?{summary:d.summary}:{},content:T,tags:b},[...p.values()]);if(!P.allowed){P.mode==="pending-review"?s.reviewPending+=1:s.skipped+=1;continue}P.mode==="auto-approved"?s.autoApproved+=1:P.mode==="review-approved"&&(s.reviewApproved+=1),k?y?.digest!==S?(k=await i.updatePage(g,{title:d.title,summary:d.summary??"",content:T,tags:b}),p.set(k.slug,k),s.updated+=1,s.pages.push({sourceKey:d.sourceKey,sourceType:d.sourceType,slug:k.slug,action:"updated"})):(s.unchanged+=1,s.pages.push({sourceKey:d.sourceKey,sourceType:d.sourceType,slug:g,action:"unchanged"})):(k=await i.createPage({slug:g,title:d.title,summary:d.summary,content:T,tags:b}),p.set(k.slug,k),s.created+=1,s.pages.push({sourceKey:d.sourceKey,sourceType:d.sourceType,slug:k.slug,action:"created"}));let R=new Date().toISOString(),j={sourceKey:d.sourceKey,sourceType:d.sourceType,slug:g,digest:S,marker:m,updatedAt:R},x=c.entries.findIndex(z=>z.sourceKey===d.sourceKey);x>=0?c.entries[x]=j:c.entries.push(j),l.set(d.sourceKey,j),await a.markApplied(d.sourceKey,S)}catch(m){if(m instanceof M&&m.statusCode===409){s.skipped+=1;continue}s.failed+=1}let f=new Date().toISOString();return c.updatedAt=f,c.lastRunAt=f,c.entries.sort((d,m)=>d.sourceKey.localeCompare(m.sourceKey)),await vc(e.storage,c),s}import{createHash as Ic}from"node:crypto";import{chmodSync as Zr,existsSync as Mc,mkdirSync as Ac,readFileSync as Bm,readdirSync as Vm,renameSync as Ec,statSync as Jm,writeFileSync as Pc}from"node:fs";import{join as eo}from"node:path";var Oc="toolnet.skill-memory.v1",Qr=5,Tc=16,Rc=24,Nc=32;function _c(e){return Ic("sha256").update(e).digest("hex")}function Ne(e,t=Number.MAX_SAFE_INTEGER){let n=new Set,r=[];for(let o of e){let s=o.replace(/\s+/gu," ").trim();if(!s)continue;let i=s.normalize("NFKC").toLowerCase();if(!n.has(i)&&(n.add(i),r.push(s),r.length>=t))break}return r}function dn(e,t=360){let n=e.replace(/\s+/gu," ").trim();return n.length<=t?n:n.slice(0,Math.max(0,t-1)).trimEnd()+"\u2026"}function $c(e){return e.replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/giu,"Bearer [REDACTED]").replace(/\bsk-[A-Za-z0-9_-]{8,}\b/gu,"[REDACTED]").replace(/\b(api[_-]?key|token|password|passwd|secret)\b(\s*[:=]\s*)(["']?)[^\s"'`]+/giu,"$1$2[REDACTED]")}function B(e,t=360){return e&&dn($c(e),t)||void 0}function _e(e,t){for(let n of t){let r=e[n];if(typeof r=="string"&&r.trim())return r}}function to(e,t){for(let n of t){let r=e[n];if(typeof r=="number"&&Number.isFinite(r))return r;if(typeof r=="string"&&r.trim()&&Number.isFinite(Number(r)))return Number(r)}}function no(e,t){for(let n of t){let r=e[n];if(typeof r=="boolean")return r;if(typeof r=="string"){let o=r.trim().toLowerCase();if(["true","yes","pass","passed","success","succeeded","ok"].includes(o))return!0;if(["false","no","fail","failed","error"].includes(o))return!1}}}function ro(e){let t=e.data??{};if(no(t,["passed","pass","success","succeeded","ok"])===!1)return!0;let r=to(t,["exitCode","exit_code","code","statusCode"]);if(r!==void 0&&r!==0)return!0;let o=_e(t,["status","result","outcome"]);return!!(o&&/\b(fail(?:ed)?|error|broken|cancelled)\b/iu.test(o))}function Re(e){let t=e.data??{};if(ro(e))return!1;if(no(t,["passed","pass","success","succeeded","ok"])===!0||to(t,["exitCode","exit_code","code","statusCode"])===0)return!0;let o=_e(t,["status","result","outcome"]);return o&&/\b(pass(?:ed)?|success(?:ful)?|succeeded|ok|green|complete(?:d)?)\b/iu.test(o)?!0:e.type==="commit"||e.type==="deploy"}function oo(e){let t=e.data??{},n=_e(t,["path","file","filePath","filename","target"]);if(n)return B(n,260);let r=e.provenance?.files;return B(r?.[0],260)}function pn(e){return B(_e(e.data??{},["command","cmd","script"]),420)}function le(e){return B(_e(e.data??{},["name","test","suite","title","message","text","result","status"]),300)}function Lc(e){let t=[];for(let n of[...e].sort((r,o)=>r.sequence-o.sequence))if(Re(n)){if(n.type==="test"){let r=le(n)??pn(n)??"Tests passed";t.push(`Test passed: ${r}`);continue}if(n.type==="commit"){let r=le(n);t.push(r?`Commit: ${r}`:"Commit completed");continue}if(n.type==="deploy"){let r=le(n);t.push(r?`Deploy: ${r}`:"Deployment completed")}}return Ne(t,10)}function Fc(e,t){let n=[];for(let r of[...e].sort((o,s)=>o.sequence-s.sequence))switch(r.type){case"file_write":case"file_edit":{let o=oo(r);o&&n.push(`Update ${o}`);break}case"command":{if(ro(r))break;let o=pn(r);o&&n.push(`Run: ${o}`);break}case"test":{if(!Re(r))break;let o=le(r)??pn(r)??"project tests";n.push(`Verify: ${o}`);break}case"commit":{if(!Re(r))break;let o=le(r);n.push(o?`Commit: ${o}`:"Commit verified changes");break}case"deploy":{if(!Re(r))break;let o=le(r);n.push(o?`Deploy: ${o}`:"Deploy verified build");break}default:break}if(n.length===0)for(let r of t.files.slice(0,8)){let o=B(r,260);o&&n.push(`Update ${o}`)}return Ne(n,Tc)}function Kc(e,t){let n=[...t.files];for(let r of e){let o=oo(r);o&&n.push(o);for(let s of r.provenance?.files??[]){let i=B(s,260);i&&n.push(i)}}return Ne(n,Rc)}function Dc(e){return Ne(e.filter(t=>["file_write","file_edit","command","test","commit","deploy"].includes(t.type)).map(t=>t.id),Nc)}function Wc(e){return e.map(n=>n.timestamp).filter(Boolean).sort().at(-1)??new Date(0).toISOString()}function so(e,t,n){if(t.length===0)return[];let r=Lc(t),o=Ne(n.completed.map(m=>B(m,280)??""),Qr);if(!(o.length>0||t.some(m=>["test","commit","deploy"].includes(m.type)&&Re(m))))return[];let i=B(n.task,280)??B(n.nextActions[0],280),a=o.length>0?o:i?[i]:[];if(a.length===0)return[];let c=Fc(t,n);if(c.length===0)return[];let u=Kc(t,n),p=Dc(t),l=Math.min(...t.map(m=>m.sequence)),f=Math.max(...t.map(m=>m.sequence)),d=Wc(t);return a.slice(0,Qr).map(m=>{let S=[`Reusable procedure learned from successful task: ${m}.`,u.length>0?`Files: ${u.slice(0,6).join(", ")}.`:"",r.length>0?`Verification: ${r.slice(0,4).join("; ")}.`:""].filter(Boolean),y=JSON.stringify({projectId:e.projectId,task:m,steps:c,verification:r,files:u}),g=_c(y);return{schema:Oc,version:1,id:`skill-${g.slice(0,24)}`,fingerprint:g,projectId:e.projectId,title:dn(`SOP: ${m}`,180),task:m,summary:dn(S.join(" "),900),steps:c,verification:r,files:u,source:{agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,firstSequence:l,lastSequence:f,eventIds:p},createdAt:d}})}function zc(e){return eo(e.rootPath,".toolnet","memory","skills")}function qc(e){let t=zc(e);return Ac(t,{recursive:!0,mode:448}),Zr(t,448),t}function io(e,t){if(t.length===0)return{written:0,deduped:0,files:[]};let n=qc(e),r=0,o=0,s=[];for(let i of t){if(i.projectId!==e.id)throw new Error(`Skill project mismatch: ${i.projectId} != ${e.id}`);let a=eo(n,`${i.id}.json`);if(s.push(a),Mc(a)){o+=1;continue}let c=`${a}.${process.pid}.${Date.now()}.tmp`;Pc(c,JSON.stringify(i,null,2)+`
`,{encoding:"utf8",mode:384}),Ec(c,a),Zr(a,384),r+=1}return{written:r,deduped:o,files:s}}function ao(e){return String(e).padStart(12,"0")}function Bc(e){return`projects/${e.projectId}/memory/learned`}var yt=class{constructor(t){this.storage=t}storage;async write(t,n,r){if(r.length===0||n.length===0)return null;let o=Math.min(...n.map(l=>l.sequence)),s=Math.max(...n.map(l=>l.sequence)),i={version:1,projectId:t.projectId,agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,createdAt:new Date().toISOString(),firstSequence:o,lastSequence:s,candidateCount:r.length,candidates:r},a=JSON.stringify(i,null,2)+`
`,c=w(r.map(l=>l.fingerprint).sort().join("|")).slice(0,16),u=w(t.sessionKey).slice(0,12),p=[Bc(t),"batches",`${ao(o)}-${ao(s)}-${u}-${c}.json`].join("/");return await this.storage.exists(p)||await this.storage.put(p,a,"application/json"),p}};import{createHash as Vc}from"node:crypto";function co(e){return String(e).padStart(12,"0")}function uo(e){return Vc("sha256").update(e).digest("hex")}function Jc(e){return`projects/${e.projectId}/memory/hierarchy`}var ht=class{constructor(t){this.storage=t}storage;async write(t,n,r){if(n.length===0||r.facts.length===0)return null;let o=Math.min(...n.map(p=>p.sequence)),s=Math.max(...n.map(p=>p.sequence)),i={schema:"toolnet.memory-hierarchy-batch.v1",version:1,projectId:t.projectId,agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,createdAt:new Date().toISOString(),firstSequence:o,lastSequence:s,hierarchy:r},a=uo([...r.facts.map(p=>p.id),...r.knowledge.map(p=>p.id)].sort().join("|")).slice(0,16),c=uo(t.sessionKey).slice(0,12),u=[Jc(t),"batches",`${co(o)}-${co(s)}-${c}-${a}.json`].join("/");return await this.storage.exists(u)||await this.storage.put(u,`${JSON.stringify(i,null,2)}
`,"application/json"),u}};function Qc(e,t){if(!Gc(e))return{events:[],nextOffset:t};let n=Xc(e).size,r=Number.isFinite(t)?Math.max(0,t):0;if(r>n&&(r=0),r===n)return{events:[],nextOffset:n};let o=n-r,s=Buffer.alloc(o),i=Uc(e,"r");try{Yc(i,s,0,o,r)}finally{Hc(i)}let a=s.toString("utf8"),c=a.lastIndexOf(`
`);if(c<0)return{events:[],nextOffset:r};let u=a.slice(0,c+1);return{events:u.split(`
`).filter(Boolean).flatMap(l=>{try{return[JSON.parse(l)]}catch{return[]}}),nextOffset:r+Buffer.byteLength(u,"utf8")}}var St=class{constructor(t){this.options=t;this.journal=new yt(t.storage),this.hierarchyJournal=new ht(t.storage)}options;journal;hierarchyJournal;async learnNew(){let t=this.options.wal.loadState(),n=Number(t.sourceCursors["memory.learner.offset"]??0),r=Number.isFinite(n)?n:0,o=Qc(this.options.wal.eventsFile,r);if(o.events.length===0)return{scannedEvents:0,candidates:0,journalWritten:!1,nextOffset:o.nextOffset};let s=ut(this.options.identity,o.events),i=s.candidates,a=!1;i.length>0&&(a=!!await this.journal.write(this.options.identity,o.events,i));let c=!1;s.hierarchy.facts.length>0&&(c=!!await this.hierarchyJournal.write(this.options.identity,o.events,s.hierarchy));let u=so(this.options.identity,o.events,s.state),p=io(this.options.project,u);this.options.wal.setSourceCursor("memory.pipeline.version",2),this.options.wal.setSourceCursor("memory.pipeline.normalized_events",s.stats.normalizedEvents),this.options.wal.setSourceCursor("memory.pipeline.persisted",s.stats.persistedCandidates),this.options.wal.setSourceCursor("memory.pipeline.permanent",s.stats.permanent),this.options.wal.setSourceCursor("memory.pipeline.task",s.stats.task),this.options.wal.setSourceCursor("memory.pipeline.session",s.stats.session),this.options.wal.setSourceCursor("memory.pipeline.transient",s.stats.transient),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.version",s.hierarchy.version),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.raw",s.hierarchy.stats.raw),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.facts",s.hierarchy.stats.facts),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.scenes",s.hierarchy.stats.scenes),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.knowledge",s.hierarchy.stats.knowledge),this.options.wal.setSourceCursor("memory.pipeline.hierarchy.journal_written",c?1:0),this.options.wal.setSourceCursor("memory.skill.assets",u.length),this.options.wal.setSourceCursor("memory.skill.written",p.written),this.options.wal.setSourceCursor("memory.skill.deduped",p.deduped);try{let l=Pr(this.options.project.rootPath,o.events);this.options.wal.setSourceCursor("memory.context_offload.eligible",l.eligible),this.options.wal.setSourceCursor("memory.context_offload.written",l.written),this.options.wal.setSourceCursor("memory.context_offload.deduped",l.deduped),this.options.wal.setSourceCursor("memory.context_offload.graph_nodes",l.graphNodes),this.options.wal.setSourceCursor("memory.context_offload.failed",0)}catch{this.options.wal.setSourceCursor("memory.context_offload.failed",1)}try{let l=await Xr({project:this.options.project,storage:this.options.storage,hierarchy:s.hierarchy});this.options.wal.setSourceCursor("memory.wiki_automation.scanned",l.scanned),this.options.wal.setSourceCursor("memory.wiki_automation.eligible",l.eligible),this.options.wal.setSourceCursor("memory.wiki_automation.created",l.created),this.options.wal.setSourceCursor("memory.wiki_automation.updated",l.updated),this.options.wal.setSourceCursor("memory.wiki_automation.unchanged",l.unchanged),this.options.wal.setSourceCursor("memory.wiki_automation.skipped",l.skipped),this.options.wal.setSourceCursor("memory.wiki_automation.failed",l.failed),this.options.wal.setSourceCursor("memory.wiki_automation.review_pending",l.reviewPending),this.options.wal.setSourceCursor("memory.wiki_automation.auto_approved",l.autoApproved),this.options.wal.setSourceCursor("memory.wiki_automation.review_approved",l.reviewApproved)}catch{this.options.wal.setSourceCursor("memory.wiki_automation.failed",1)}return this.options.wal.setSourceCursor("memory.learner.offset",o.nextOffset),{scannedEvents:o.events.length,candidates:i.length,journalWritten:a,nextOffset:o.nextOffset}}};import{closeSync as gu,existsSync as yu,openSync as hu,readSync as Su,statSync as ku}from"node:fs";function lo(e){return e&&typeof e=="object"&&!Array.isArray(e)?e:null}function Le(e){return e.toLowerCase().replace(/[^a-z0-9]/gu,"")}function $e(e,t,n=0){if(n>8)return;if(Array.isArray(e)){for(let o of e.slice(0,50))$e(o,t,n+1);return}let r=lo(e);if(r)for(let[o,s]of Object.entries(r))t(o,s,r),$e(s,t,n+1)}function de(e,t){let n=[];return $e(e,(r,o)=>{t.has(Le(r))&&typeof o=="string"&&o.trim()&&n.push(o.trim())}),n}function Zc(e){let t=e.trim();if(!t.startsWith("{"))return null;try{return lo(JSON.parse(t))}catch{return null}}function eu(e){let t=e.data;for(let r of["tool","toolName","tool_name"]){let o=t[r];if(typeof o=="string"&&o.trim())return o.trim().toLowerCase()}let n="";return $e(t,(r,o,s)=>{if(n)return;let i=Le(r);if(["tool","toolname"].includes(i)&&typeof o=="string"){n=o.trim().toLowerCase();return}if(i!=="name"||typeof o!="string")return;let a=typeof s.type=="string"?s.type.toLowerCase():"";(a.includes("tool")||a.includes("function")||a.includes("command"))&&(n=o.trim().toLowerCase())}),n}function tu(e){let t=de(e.data,new Set(["command","cmd","script"])),n=de(e.data,new Set(["arguments","args"]));for(let r of n){let o=Zc(r);if(o)for(let s of de(o,new Set(["command","cmd","script"])))t.push(s)}return Array.from(new Set(t.map(r=>r.trim()).filter(Boolean)))}function nu(e){let t=de(e.data,new Set(["filepath","file_path","filename","file","path","target"].map(Le)));return Array.from(new Set(t.map(n=>n.trim()).filter(n=>n.length>0&&n.length<1e3&&!n.includes(`
`))))}function ru(e,t){return e.type==="file_edit"||e.type==="file_write"?"modified":/\b(delete|remove|unlink)\b/iu.test(t)?"deleted":/\b(create|add[_-]?file|new[_-]?file)\b/iu.test(t)?"created":/\b(edit|write|patch|apply[_-]?patch|replace|update[_-]?file)\b/iu.test(t)?"modified":null}function ou(e){let t=de(e.data,new Set(["patch","diff","arguments","input"].map(Le))),n=[];for(let r of t){let o=[{regex:/^\*\*\* Update File:\s*(.+)$/gimu,action:"modified"},{regex:/^\*\*\* Add File:\s*(.+)$/gimu,action:"created"},{regex:/^\*\*\* Delete File:\s*(.+)$/gimu,action:"deleted"}];for(let s of o)for(let i of r.matchAll(s.regex)){let a=i[1]?.trim();a&&n.push({kind:"file",text:a,fileAction:s.action,confidence:.99})}}return n}function su(e){let t=e.toLowerCase();return/\b(typecheck|type-check)\b/u.test(t)||/\btsc\b[\s\S]*--noemit\b/u.test(t)?"typecheck":/\b(eslint|lint)\b/u.test(t)?"lint":/\b(vitest|jest|pytest)\b/u.test(t)||/\bgo\s+test\b/u.test(t)||/\bcargo\s+test\b/u.test(t)||/\b(npm|pnpm|yarn)\s+(run\s+)?test\b/u.test(t)?"test":/\b(npm|pnpm|yarn)\s+(run\s+)?build\b/u.test(t)||/\bcargo\s+build\b/u.test(t)||/\bgo\s+build\b/u.test(t)||/\btsc\b/u.test(t)?"build":null}function iu(e){let t=null;return $e(e,(n,r)=>{if(t===null&&["exitcode","code"].includes(Le(n))){if(typeof r=="number"&&Number.isFinite(r)){t=r;return}if(typeof r=="string"){let o=Number(r);Number.isFinite(o)&&(t=o)}}}),t}function au(e){return de(e,new Set(["status","state","result","output","outputsummary","message","text"]))}function cu(e){let t=iu(e.data);if(t!==null)return t===0?"passed":"failed";let n=au(e.data).join(`
`).toLowerCase();return/\b(error|failed|failure|failing)\b/u.test(n)&&!/\b0\s+failed\b/u.test(n)?"failed":/\b(success|successful|completed|passed|green)\b/u.test(n)||/\b\d+\s+passed\b/u.test(n)?"passed":/\b(running|started|in[_ -]?progress)\b/u.test(n)?"running":"unknown"}function uu(e){let t=[],n=new Set;for(let r of e){let o=[r.kind,r.fileAction??"",r.checkKind??"",r.checkStatus??"",r.text].join("|");n.has(o)||(n.add(o),t.push(r))}return t}function po(e){let t=[],n=eu(e),r=ru(e,n);if(r)for(let o of nu(e))t.push({kind:"file",text:o,fileAction:r,confidence:e.type==="file_edit"||e.type==="file_write"?1:.96});t.push(...ou(e));for(let o of tu(e)){t.push({kind:"command",text:o,confidence:.98});let s=su(o);s&&t.push({kind:"test",text:o,checkKind:s,checkStatus:cu(e),confidence:.98})}return uu(t)}var lu=new Set(["content","text","message","prompt","summary","description","title","reason","last_assistant_message","lastAssistantMessage"]);function re(e){return e.normalize("NFKC").replace(/\s+/g," ").replace(/^[\s>*#•-]+/u,"").trim()}function mo(e){return re(e).toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim()}function ne(e,t,n=0){if(!(n>6)){if(typeof e=="string"){t.push(e);return}if(Array.isArray(e)){for(let r of e.slice(0,50))ne(r,t,n+1);return}if(!(!e||typeof e!="object"))for(let[r,o]of Object.entries(e))(lu.has(r)||["data","payload","parts","messages"].includes(r))&&ne(o,t,n+1)}}function kt(e){return/\b(cancelled|canceled)\b|đã hủy|bỏ qua/iu.test(e)?"cancelled":/\b(blocked|blocker)\b|đang vướng|bị vướng|đang kẹt|chưa thể/iu.test(e)?"blocked":/\b(completed|complete|done|finished|passed)\b|hoàn thành|hoàn tất|đã xong|đã làm xong|\bxong\b/iu.test(e)?"completed":/\bin[\s_-]*progress\b|working on|đang làm|đang thực hiện|đang xử lý|đang triển khai/iu.test(e)?"in_progress":"pending"}function fo(e){let t=re(e);return/^(?:đang\s+làm|đang\s+thực\s+hiện|đang\s+xử\s+lý|đang\s+triển\s+khai|hoàn\s+thành|hoàn\s+tất|đã\s+xong|đã\s+làm\s+xong|xong|pending|in[\s_-]*progress|completed|complete|done|finished|blocked|cancelled|canceled)[.!]*$/iu.test(t)}function A(e,t,n,r,o={}){let s=re(r),i=o.key??mo(s);return{version:1,id:w([e.projectId,n,i,t.id,s,o.status??"",o.fileAction??"",o.checkKind??"",o.checkStatus??"",o.order??""].join("|")).slice(0,32),projectId:e.projectId,kind:n,key:i,text:s,status:o.status,fileAction:o.fileAction,checkKind:o.checkKind,checkStatus:o.checkStatus,order:o.order,confidence:o.confidence??.85,occurredAt:t.timestamp,sequence:t.sequence,agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,eventId:t.id,sourceEventId:t.sourceEventId}}function du(e,t,n){let r=re(n);if(r.length<5||r.length>1200)return[];let o=[],s=/^(?:next|next action|next step|tiếp theo|bước tiếp theo|cần làm tiếp)\b/iu.test(r),i=r.match(/^(?:mục tiêu|goal|objective)\s*(?::|-)\s*(.+)$/iu);i?.[1]&&o.push(A(e,t,"goal",i[1],{confidence:.97}));let a=r.match(/^(?:kế hoạch|plan)\s*(?::|-)\s*(.+)$/iu);a?.[1]&&o.push(A(e,t,"plan",a[1],{confidence:.95}));let c=/\b(?:phase|giai đoạn|giai doan|stage)\s*(\d+)\s*(?:[:\-–—]\s*)?([^.;\n]{0,220})/giu,u;for(;!s&&(u=c.exec(r));){let f=Number(u[1]),d=re(u[2]??""),m=d&&!fo(d)?`Phase ${f} - ${d}`:`Phase ${f}`;o.push(A(e,t,"phase",m,{key:`phase:${f}`,order:f,status:kt(r),confidence:.93}))}let p=n.match(/^\s*[-*]\s*\[([ xX])\]\s*(.+)$/u);p?.[2]&&o.push(A(e,t,"task",p[2],{status:p[1].trim()?"completed":kt(p[2]),confidence:.96}));let l=r.match(/^(?:todo|task|việc)\s*(\d+)?(?:\s*[:.\-–—]\s*|\s+)(.+)$/iu);if(l?.[2]){let f=l[1]?Number(l[1]):void 0,d=re(l[2]),m=fo(d);o.push(A(e,t,"task",m&&f!==void 0?`TODO ${f}`:d,{key:f!==void 0?`task:${f}`:mo(d),order:f,status:kt(r),confidence:.93}))}if(/^(?:next|next action|next step|tiếp theo|bước tiếp theo|cần làm tiếp)\b/iu.test(r)){let f=r.replace(/^(?:next|next action|next step|tiếp theo|bước tiếp theo|cần làm tiếp)\s*(?::|-)?\s*/iu,"");f&&o.push(A(e,t,"next_action",f,{confidence:.9}))}return/\b(blocker|blocked)\b|đang vướng|bị vướng|đang kẹt/iu.test(r)&&o.push(A(e,t,"blocker",r,{confidence:.9})),/\b(chú ý|lưu ý|warning|attention|cẩn thận)\b/iu.test(r)&&o.push(A(e,t,"warning",r,{confidence:.88})),/\b(chốt|quyết định|decided|decision)\b/iu.test(r)&&o.push(A(e,t,"decision",r,{confidence:.9})),r.length<=300&&/^(?:đang\s+(?:sửa|cập nhật|triển khai|xử lý|làm|refactor|fix)|(?:i(?:'m| am)\s+)?(?:working on|implementing|fixing|refactoring|updating|editing)\b)/iu.test(r)&&o.push(A(e,t,"activity",r,{confidence:.86})),o}function vt(e,t){if(t.length===0)return[];let n=[],r=new Set;function o(i){r.has(i.id)||(r.add(i.id),n.push(i))}for(let i of t){if(i.type==="user_prompt"||i.role==="user"){let c=[];ne(i.data,c);let u=c.map(p=>re(p)).find(p=>p.length>=8&&p.length<=1200&&!/^\[?toolnet\b/iu.test(p));u&&o(A(e,i,"request",u,{confidence:.96}))}for(let c of po(i))o(A(e,i,c.kind,c.text,{fileAction:c.fileAction,checkKind:c.checkKind,checkStatus:c.checkStatus,status:c.kind==="test"?c.checkStatus==="passed"?"completed":c.checkStatus==="failed"?"blocked":c.checkStatus==="running"?"in_progress":"pending":void 0,confidence:c.confidence}));if(i.type==="decision"){let c=[];ne(i.data,c);for(let u of c)o(A(e,i,"decision",u,{confidence:1}))}if(i.type==="todo"){let c=[];ne(i.data,c);for(let u of c)o(A(e,i,"task",u,{status:kt(u),confidence:1}))}if(["file_write","file_edit"].includes(i.type))for(let c of["filePath","path","file"]){let u=i.data[c];typeof u=="string"&&u&&o(A(e,i,"file",u,{fileAction:"modified",confidence:1}))}if(i.type==="test"){let c=[];ne(i.data,c);for(let u of c)o(A(e,i,"test",u,{confidence:1}))}let a=[];ne(i.data,a);for(let c of a)for(let u of c.split(/\n+/u))for(let p of du(e,i,u))o(p)}let s=t[t.length-1];return o(A(e,s,"session",`${e.agent}:${e.nativeSessionId}`,{key:e.sessionKey,confidence:1})),n}function go(e){return String(e).padStart(12,"0")}var wt=class{constructor(t){this.storage=t}storage;async write(t,n){if(n.length===0)return null;let r=Math.min(...n.map(p=>p.sequence)),o=Math.max(...n.map(p=>p.sequence)),s={version:1,projectId:t.projectId,agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,createdAt:n.map(p=>p.occurredAt).sort().at(-1)??new Date().toISOString(),firstSequence:r,lastSequence:o,observations:n},i=JSON.stringify(s,null,2)+`
`,a=w(n.map(p=>JSON.stringify(p)).sort().join(`
`)).slice(0,24),c=w(t.sessionKey).slice(0,12),u=[`projects/${t.projectId}`,"work","observations",`${go(r)}-${go(o)}-${c}-${a}.json`].join("/");return await this.storage.put(u,i,"application/json"),u}};import{join as yo}from"node:path";import{mkdirSync as pu}from"node:fs";function So(e){return e.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim()}function K(e,t=20){let n=[],r=new Set;for(let o of e.slice().reverse()){let s=So(o);if(!(!s||r.has(s))&&(r.add(s),n.push(o),n.length>=t))break}return n.reverse()}function fu(e,t=20){let n=new Map;for(let r of e){let o=`${r.kind}|${So(r.command)}`;n.delete(o),n.set(o,r)}return Array.from(n.values()).slice(-t)}function mu(e){return e.kind==="phase"?/^Phase\s+\d+$/iu.test(e.text):e.kind==="task"?/^(?:TODO|Task|Việc)\s+\d+$/iu.test(e.text):!1}function ho(e,t){let n=t.status??e?.status??"pending",r=n;e&&(e.status==="completed"&&n!=="completed"?r="completed":n==="pending"&&(e.status==="in_progress"||e.status==="blocked")&&(r=e.status));let o=e&&mu(t)?e.title:t.text;return{id:e?.id??w(t.key).slice(0,24),title:o,status:r,order:t.order??e?.order,confidence:Math.max(t.confidence,e?.confidence??0),updatedAt:t.occurredAt,updatedBy:{agent:t.agent,nativeSessionId:t.nativeSessionId,eventId:t.eventId}}}async function ko(e,t){let n=`projects/${e.id}/work/observations/`,r=await t.list(n),o=[];for(let s of r.filter(i=>i.key.endsWith(".json")).sort((i,a)=>i.key.localeCompare(a.key))){let i=await t.getText(s.key);if(i)try{let a=JSON.parse(i);a.version===1&&Array.isArray(a.observations)&&o.push(a)}catch{}}return o}async function Fe(e,t){let r=(await ko(e,t)).flatMap(h=>h.observations).sort((h,v)=>{let O=h.occurredAt.localeCompare(v.occurredAt);if(O!==0)return O;let V=h.sequence-v.sequence;return V!==0?V:h.id.localeCompare(v.id)}),o=new Map,s=new Map,i,a,c,u,p,l=[],f=[],d=[],m=[],S=[],y=new Map,g=[],k=[],b=[],T=[],P=[],R=[];for(let h of r)switch(h.kind){case"request":i=h.text;break;case"activity":a=h.text;break;case"goal":c=h.text;break;case"plan":u=h.text;break;case"phase":o.set(h.key,ho(o.get(h.key),h));break;case"task":s.set(h.key,ho(s.get(h.key),h));break;case"decision":l.push(h.text);break;case"blocker":f.push(h.text);break;case"warning":d.push(h.text);break;case"next_action":m.push(h.text);break;case"file":{S.push(h.text);let v=h.fileAction??"active";y.delete(h.text),y.set(h.text,v),v==="modified"?g.push(h.text):v==="created"?k.push(h.text):v==="deleted"&&b.push(h.text);break}case"command":T.push(h.text);break;case"test":P.push(h.text),h.checkKind&&R.push({kind:h.checkKind,command:h.text,status:h.checkStatus??"unknown",updatedAt:h.occurredAt,agent:h.agent,nativeSessionId:h.nativeSessionId});break;case"session":p={agent:h.agent,nativeSessionId:h.nativeSessionId,sessionKey:h.sessionKey,updatedAt:h.occurredAt};break}let j=Array.from(o.values()).sort((h,v)=>(h.order??Number.MAX_SAFE_INTEGER)-(v.order??Number.MAX_SAFE_INTEGER)),x=Array.from(s.values()).sort((h,v)=>(h.order??Number.MAX_SAFE_INTEGER)-(v.order??Number.MAX_SAFE_INTEGER)),z=j.find(h=>h.status==="in_progress")??j.find(h=>h.status==="blocked")??j.find(h=>h.status==="pending"),q=x.find(h=>h.status==="in_progress")??x.find(h=>h.status==="blocked")??x.find(h=>h.status==="pending"),Ft=K([...m,...q?[q.title]:[],...!q&&z?[z.title]:[],...x.filter(h=>h.status==="pending").slice(0,5).map(h=>h.title)],8),Kt=K([...f,...j.filter(h=>h.status==="blocked").map(h=>h.title),...x.filter(h=>h.status==="blocked").map(h=>h.title)],20),he={version:1,projectId:e.id,projectName:e.name,currentRequest:i,currentActivity:a,goal:c,plan:u,phases:j,tasks:x,decisions:K(l,20),blockers:Kt,warnings:K(d,20),nextActions:Ft,filesTouched:K(S,30),activeFiles:Array.from(y.entries()).filter(([,h])=>h!=="deleted").map(([h])=>h).slice(-5),modifiedFiles:K(g,30),createdFiles:K(k,30),deletedFiles:K(b,30),commands:K(T,20),tests:K(P,20),checks:fu(R,20),currentPhase:z,currentTask:q,progress:{phasesTotal:j.length,phasesCompleted:j.filter(h=>h.status==="completed").length,tasksTotal:x.length,tasksCompleted:x.filter(h=>h.status==="completed").length,blocked:j.filter(h=>h.status==="blocked").length+x.filter(h=>h.status==="blocked").length},lastSession:p,updatedAt:r.length?r[r.length-1].occurredAt:new Date().toISOString()},qe=yo(e.rootPath,".toolnet","work");return pu(qe,{recursive:!0}),N(yo(qe,"current.json"),he),await t.put(`projects/${e.id}/work/current.json`,JSON.stringify(he,null,2)+`
`,"application/json"),he}async function bt(e,t){if((await ko(e,t)).length>0)return Fe(e,t);let r=await t.getText(`projects/${e.id}/work/current.json`);if(!r)return null;try{return JSON.parse(r)}catch{return null}}function vu(e,t){if(!yu(e))return{events:[],nextOffset:t};let n=ku(e).size,r=Number.isFinite(t)?Math.max(0,t):0;if(r>n&&(r=0),r===n)return{events:[],nextOffset:n};let o=n-r,s=Buffer.alloc(o),i=hu(e,"r");try{Su(i,s,0,o,r)}finally{gu(i)}let a=s.toString("utf8"),c=a.lastIndexOf(`
`);if(c<0)return{events:[],nextOffset:r};let u=a.slice(0,c+1);return{events:u.split(`
`).filter(Boolean).flatMap(l=>{try{return[JSON.parse(l)]}catch{return[]}}),nextOffset:r+Buffer.byteLength(u,"utf8")}}var xt=class{constructor(t){this.options=t;this.journal=new wt(t.storage)}options;journal;async learnNew(){let t=this.options.wal.loadState(),n=Number(t.sourceCursors["work.continuity.offset"]??0),r=vu(this.options.wal.eventsFile,Number.isFinite(n)?n:0);if(r.events.length===0)return{scannedEvents:0,observations:0,journalWritten:!1,reconciled:!1,nextOffset:r.nextOffset};let o=vt(this.options.identity,r.events),s=!1,i=!1;return o.length>0&&(s=!!await this.journal.write(this.options.identity,o),s&&(await Fe(this.options.project,this.options.storage),i=!0)),this.options.wal.setSourceCursor("work.continuity.offset",r.nextOffset),{scannedEvents:r.events.length,observations:o.length,journalWritten:s,reconciled:i,nextOffset:r.nextOffset}}};import{closeSync as Eu,existsSync as Pu,openSync as Ou,readSync as Tu,statSync as Ru}from"node:fs";var wu=new Set(["content","text","message","prompt","summary","description","title","reason","last_assistant_message","lastAssistantMessage"]);function pe(e){return e.normalize("NFKC").replace(/\s+/g," ").replace(/^[\s>*#•-]+/u,"").trim()}function fn(e,t,n=0){if(!(n>6)){if(typeof e=="string"){t.push(e);return}if(Array.isArray(e)){for(let r of e.slice(0,50))fn(r,t,n+1);return}if(!(!e||typeof e!="object"))for(let[r,o]of Object.entries(e))(wu.has(r)||["data","payload","parts","messages"].includes(r))&&fn(o,t,n+1)}}function $(e,t,n,r,o,s=.95){let i=pe(r);return{version:1,id:w([e.projectId,n,o.type,o.key??"",i.toLowerCase(),t.id].join("|")).slice(0,32),projectId:e.projectId,kind:n,value:i,scope:o.type,scopeKey:o.key,scopeOrder:o.order,confidence:s,evidence:{agent:e.agent,nativeSessionId:e.nativeSessionId,sessionKey:e.sessionKey,eventId:t.id,sourceEventId:t.sourceEventId,sequence:t.sequence,occurredAt:t.timestamp}}}function D(e,t){let n=e.toLowerCase();for(let r of t){let o=r.toLowerCase();if(n.startsWith(`${o}:`)||n.startsWith(`${o} -`)||n.startsWith(`${o} \u2014`))return pe(e.slice(r.length+1))}return null}function bu(e){let t=e.trimStart();return t.startsWith("- ")||t.startsWith("* ")||/^\d+[.)]\s+/u.test(t)}function xu(e){return pe(e.trim().replace(/^[-*]\s+/u,"").replace(/^\d+[.)]\s+/u,""))}function vo(e,t){let n=[],r=new Set;function o(s){!s.value||s.value.length<3||r.has(s.id)||(r.add(s.id),n.push(s))}for(let s of t){let i=[];fn(s.data,i);for(let a of i){let c={type:"project"},u=null;for(let p of a.split(/\r?\n/u)){let l=pe(p);if(!l){u=null;continue}let f=l.match(/^(?:phase|giai đoạn|giai doan|stage)\s*(\d+)\s*(?:[:\-–—]\s*)?(.*)$/iu);if(f){let x=Number(f[1]);c={type:"phase",key:`phase:${x}`,order:x,title:pe(f[2]??"")},u=null;continue}let d=l.match(/^(?:todo|task|việc)\s*(\d+)\s*(?:[:\-–—]\s*)?(.*)$/iu);if(d){let x=Number(d[1]);c={type:"task",key:`task:${x}`,order:x,title:pe(d[2]??"")},u=null;continue}let m=D(l,["mission","s\u1EE9 m\u1EC7nh","m\u1EE5c ti\xEAu t\u1ED5ng th\u1EC3","m\u1EE5c ti\xEAu project","project goal"]);if(m){o($(e,s,"mission",m,{type:"project"},.99)),u=null;continue}let S=D(l,["current objective","active objective","m\u1EE5c ti\xEAu hi\u1EC7n t\u1EA1i","objective","m\u1EE5c ti\xEAu","m\u1EE5c \u0111\xEDch"]);if(S){o($(e,s,c.type==="phase"?"phase_objective":"objective",S,c,.98)),u=null;continue}let y=D(l,["why","why this","why this phase","reason","rationale","v\xEC sao","l\xFD do","t\u1EA1i sao","\xFD ngh\u0129a"]);if(y){o($(e,s,c.type==="phase"?"phase_why":"why",y,c,.98)),u=null;continue}let g=D(l,["desired outcome","final outcome","k\u1EBFt qu\u1EA3 cu\u1ED1i","k\u1EBFt qu\u1EA3 mong mu\u1ED1n","m\u1EE5c ti\xEAu cu\u1ED1i"]);if(g){o($(e,s,"desired_outcome",g,{type:"project"},.98)),u=null;continue}let k=D(l,["plan rationale","approach rationale","why this approach","t\u1EA1i sao ch\u1ECDn h\u01B0\u1EDBng n\xE0y","l\xFD do ch\u1ECDn h\u01B0\u1EDBng n\xE0y","l\xFD do ch\u1ECDn ki\u1EBFn tr\xFAc"]);if(k){o($(e,s,"plan_rationale",k,{type:"project"},.98)),u=null;continue}let b=D(l,["deliverable","output","k\u1EBFt qu\u1EA3 c\u1EA7n \u0111\u1EA1t","ph\u1EA3i t\u1EA1o ra","\u0111\u1EA7u ra"]);if(b){o($(e,s,"phase_deliverable",b,c,.97)),u=null;continue}let T=D(l,["acceptance criteria","definition of done","done khi","ho\xE0n th\xE0nh khi","ti\xEAu ch\xED ho\xE0n th\xE0nh"]);if(T){o($(e,s,"acceptance_criterion",T,c,.98)),u="acceptance_criterion";continue}let P=D(l,["depends on","dependency","dependencies","ph\u1EE5 thu\u1ED9c","c\u1EA7n c\xF3 tr\u01B0\u1EDBc"]);if(P){o($(e,s,"dependency",P,c,.97)),u="dependency";continue}let R=D(l,["open question","open questions","c\xE2u h\u1ECFi m\u1EDF","ch\u01B0a quy\u1EBFt \u0111\u1ECBnh","ch\u01B0a r\xF5"]);if(R){o($(e,s,"open_question",R,c,.95)),u="open_question";continue}let j=D(l,["constraint","constraints","r\xE0ng bu\u1ED9c","gi\u1EDBi h\u1EA1n"]);if(j){o($(e,s,"constraint",j,c,.97)),u="constraint";continue}if(/^(?:acceptance criteria|definition of done|done khi|tiêu chí hoàn thành)\s*:?\s*$/iu.test(l)){u="acceptance_criterion";continue}if(/^(?:dependencies|dependency|phụ thuộc)\s*:?\s*$/iu.test(l)){u="dependency";continue}if(/^(?:open questions|open question|câu hỏi mở)\s*:?\s*$/iu.test(l)){u="open_question";continue}if(/^(?:constraints|constraint|ràng buộc)\s*:?\s*$/iu.test(l)){u="constraint";continue}if(u&&bu(p)){o($(e,s,u,xu(p),c,.96));continue}u=null}}}return n}function wo(e){return String(e).padStart(12,"0")}var Ct=class{constructor(t){this.storage=t}storage;async write(t,n){if(n.length===0)return null;let r=Math.min(...n.map(u=>u.evidence.sequence)),o=Math.max(...n.map(u=>u.evidence.sequence)),s={version:1,projectId:t.projectId,agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,firstSequence:r,lastSequence:o,createdAt:new Date().toISOString(),observations:n},i=w(n.map(u=>u.id).sort().join("|")).slice(0,16),a=w(t.sessionKey).slice(0,12),c=[`projects/${t.projectId}`,"work","semantic","observations",`${wo(r)}-${wo(o)}-${a}-${i}.json`].join("/");return await this.storage.exists(c)||await this.storage.put(c,JSON.stringify(s,null,2)+`
`,"application/json"),c}};import{mkdirSync as Cu}from"node:fs";import{join as bo}from"node:path";function ju(e){return{value:e.value,confidence:e.confidence,evidence:e.evidence}}function Iu(e,t){if(!t)return!0;let n=e.evidence.occurredAt.localeCompare(t.evidence.occurredAt);return n!==0?n>0:e.evidence.sessionKey===t.evidence.sessionKey?e.evidence.sequence>=t.evidence.sequence:e.confidence>=t.confidence}function U(e,t){return Iu(t,e)?t:e}function Y(e,t=30){let n=new Set,r=[];for(let o of e){let s=o.value.normalize("NFKC").toLowerCase().replace(/\s+/g," ").trim();!s||n.has(s)||(n.add(s),r.push(o))}return r.slice(-t)}async function Mu(e,t){let n=`projects/${e.id}/work/semantic/observations/`,r=await t.list(n),o=[];for(let s of r.filter(i=>i.key.endsWith(".json")).sort((i,a)=>i.key.localeCompare(a.key))){let i=await t.getText(s.key);if(i)try{let a=JSON.parse(i);a.version===1&&Array.isArray(a.observations)&&o.push(a)}catch{}}return o}function Au(e){return{key:e.scopeKey??`phase:${e.scopeOrder??0}`,order:e.scopeOrder??0,acceptanceCriteria:[],dependencies:[],openQuestions:[],constraints:[],notes:[]}}async function xo(e,t){let r=(await Mu(e,t)).flatMap(S=>S.observations).sort((S,y)=>{let g=S.evidence.occurredAt.localeCompare(y.evidence.occurredAt);return g!==0?g:S.evidence.sessionKey===y.evidence.sessionKey?S.evidence.sequence-y.evidence.sequence:S.id.localeCompare(y.id)}),o,s,i,a,c,u=new Map,p=[],l=[],f=[];for(let S of r){let y=ju(S);if(S.scope==="phase"&&S.scopeKey){let g=u.get(S.scopeKey)??Au(S);switch(S.kind){case"phase_objective":g.objective=U(g.objective,y);break;case"phase_why":g.why=U(g.why,y);break;case"phase_deliverable":g.deliverable=U(g.deliverable,y);break;case"acceptance_criterion":g.acceptanceCriteria.push(y);break;case"dependency":g.dependencies.push(y);break;case"open_question":g.openQuestions.push(y);break;case"constraint":g.constraints.push(y);break;case"note":g.notes.push(y);break}u.set(g.key,g);continue}switch(S.kind){case"mission":o=U(o,y);break;case"objective":s=U(s,y);break;case"why":i=U(i,y);break;case"desired_outcome":a=U(a,y);break;case"plan_rationale":c=U(c,y);break;case"open_question":p.push(y);break;case"constraint":l.push(y);break;case"note":f.push(y);break}}for(let S of u.values())S.acceptanceCriteria=Y(S.acceptanceCriteria,20),S.dependencies=Y(S.dependencies,15),S.openQuestions=Y(S.openQuestions,15),S.constraints=Y(S.constraints,15),S.notes=Y(S.notes,20);let d={version:1,projectId:e.id,projectName:e.name,mission:o,activeObjective:s,why:i,desiredOutcome:a,planRationale:c,phases:Array.from(u.values()).sort((S,y)=>S.order-y.order),openQuestions:Y(p,20),constraints:Y(l,20),notes:Y(f,20),updatedAt:r.length?r[r.length-1].evidence.occurredAt:new Date().toISOString()},m=bo(e.rootPath,".toolnet","work");return Cu(m,{recursive:!0}),N(bo(m,"semantic-current.json"),d),await t.put(`projects/${e.id}/work/semantic/current.json`,JSON.stringify(d,null,2)+`
`,"application/json"),d}async function Co(e,t){let n=await t.getText(`projects/${e.id}/work/semantic/current.json`);if(!n)return null;try{return JSON.parse(n)}catch{return null}}function Nu(e,t){if(!Pu(e))return{events:[],nextOffset:t};let n=Ru(e).size,r=Number.isFinite(t)?Math.max(0,t):0;if(r>n&&(r=0),r===n)return{events:[],nextOffset:n};let o=Buffer.alloc(n-r),s=Ou(e,"r");try{Tu(s,o,0,o.length,r)}finally{Eu(s)}let i=o.toString("utf8"),a=i.lastIndexOf(`
`);if(a<0)return{events:[],nextOffset:r};let c=i.slice(0,a+1);return{events:c.split(`
`).filter(Boolean).flatMap(u=>{try{return[JSON.parse(u)]}catch{return[]}}),nextOffset:r+Buffer.byteLength(c,"utf8")}}var jt=class{constructor(t){this.options=t;this.journal=new Ct(t.storage)}options;journal;async learnNew(){let t=this.options.wal.loadState(),n=Number(t.sourceCursors["work.semantic.offset"]??0),r=Nu(this.options.wal.eventsFile,Number.isFinite(n)?n:0);if(r.events.length===0)return{scannedEvents:0,observations:0,journalWritten:!1,reconciled:!1,nextOffset:r.nextOffset};let o=vo(this.options.identity,r.events),s=!1,i=!1;return o.length>0&&(s=!!await this.journal.write(this.options.identity,o),s&&(await xo(this.options.project,this.options.storage),i=!0)),this.options.wal.setSourceCursor("work.semantic.offset",r.nextOffset),{scannedEvents:r.events.length,observations:o.length,journalWritten:s,reconciled:i,nextOffset:r.nextOffset}}};import{existsSync as Ml,mkdirSync as Al}from"node:fs";import{join as gn}from"node:path";import{existsSync as Mo,mkdirSync as _u,readFileSync as $u,statSync as jo,writeFileSync as Lu}from"node:fs";import{dirname as Fu,join as Ku}from"node:path";var Io=64*1024,Du=`# ToolNet Project Operating Manual

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
`;function It(e){return Ku(e.rootPath,".toolnet","PROJECT.md")}function Wu(e){return e.normalize("NFKC").replace(/\s+/g," ").trim()}function zu(e){let t=[],n=new Set,r=/^\s*[-*]\s+\[(enforce|advisory)\]\s+(.+?)\s*$/gimu,o;for(;o=r.exec(e);){let s=o[1].toLowerCase(),i=Wu(o[2]);if(!i)continue;let a=`${s}:${i.toLowerCase()}`;n.has(a)||(n.add(a),t.push({id:w(a).slice(0,24),mode:s,text:i,source:"manual"}))}return t}function qu(e){let t=It(e);return Mo(t)||(_u(Fu(t),{recursive:!0}),Lu(t,Du,{encoding:"utf8",mode:384})),t}function Mt(e,t=!1){let n=t?qu(e):It(e);if(!Mo(n))return null;if(jo(n).size>Io)throw new Error(`PROJECT.md exceeds ${Io} bytes`);let o=$u(n,"utf8");return{path:n,content:o,digest:w(o),rules:zu(o),bytes:Buffer.byteLength(o,"utf8"),updatedAt:new Date(jo(n).mtimeMs).toISOString()}}import{randomUUID as Bu}from"node:crypto";import{closeSync as Vu,existsSync as Ao,fsyncSync as Ju,mkdirSync as Hu,openSync as Gu,readFileSync as Uu,statSync as Yu,unlinkSync as Eo,writeFileSync as Xu}from"node:fs";import{dirname as Qu,join as Zu}from"node:path";var el=new Int32Array(new SharedArrayBuffer(4));function tl(e){e<=0||Atomics.wait(el,0,0,e)}function nl(e){return Zu(e.rootPath,".toolnet","work",".current.lock")}function rl(e){if(!Number.isInteger(e)||e<=0)return!1;try{return process.kill(e,0),!0}catch(t){return t?.code!=="ESRCH"}}function Po(e){if(!Ao(e))return null;try{let t=JSON.parse(Uu(e,"utf8"));return t.version!==1||typeof t.token!="string"||typeof t.pid!="number"||typeof t.acquiredAt!="string"?null:{version:1,token:t.token,pid:t.pid,acquiredAt:t.acquiredAt}}catch{return null}}function ol(e){try{return Date.now()-Yu(e).mtimeMs}catch{return 0}}function sl(e,t){if(!Ao(e)||ol(e)<t)return!1;let n=Po(e);return n?!rl(n.pid):!0}function il(e,t){if(!sl(e,t))return!1;try{return Eo(e),!0}catch{return!1}}function al(e,t){let n={version:1,token:t,pid:process.pid,acquiredAt:new Date().toISOString()},r=Gu(e,"wx",384);try{Xu(r,`${JSON.stringify(n,null,2)}
`,{encoding:"utf8"}),Ju(r)}finally{Vu(r)}}function cl(e,t){if(Po(e)?.token===t)try{Eo(e)}catch{}}function ul(e,t={}){let n=Math.max(100,t.timeoutMs??5e3),r=Math.max(5,t.retryMs??20),o=Math.max(n*2,t.staleMs??3e4),s=nl(e);Hu(Qu(s),{recursive:!0});let i=Bu(),a=Date.now()+n;for(;;)try{al(s,i);let c=!1;return()=>{c||(c=!0,cl(s,i))}}catch(c){if(c?.code!=="EEXIST")throw c;if(il(s,o))continue;if(Date.now()>=a)throw new Error(`Timed out acquiring project work lock: ${s}`);tl(r)}}function Oo(e,t,n={}){let r=ul(e,n);try{return t()}finally{r()}}import{closeSync as ll,existsSync as dl,fsyncSync as pl,mkdirSync as fl,openSync as ml,readFileSync as gl,renameSync as yl,writeFileSync as hl}from"node:fs";import{dirname as Sl,join as kl}from"node:path";function vl(e,t){fl(Sl(e),{recursive:!0});let n=`${e}.tmp-${process.pid}-${Date.now()}`,r=ml(n,"w",384);try{hl(r,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8"}),pl(r)}finally{ll(r)}yl(n,e)}function Lo(e){return kl(e.rootPath,".toolnet","work","current.json")}function mn(e){let t=Lo(e);if(!dl(t))return null;try{let n=JSON.parse(gl(t,"utf8"));return n.version!==1||n.projectId!==e.id?null:n}catch{return null}}function At(e){return e.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim()}function L(e,t,n){let r=[],o=new Set;for(let s of[...e,...t].reverse()){let i=At(s);if(!(!i||o.has(i))&&(o.add(i),r.push(s),r.length>=n))break}return r.reverse()}function wl(e,t,n=20){let r=new Map;for(let o of[...e,...t]){let s=`${o.kind}|${At(o.command)}`;r.delete(s),r.set(s,o)}return Array.from(r.values()).slice(-n)}function bl(e){return e.kind==="phase"?/^Phase\s+\d+$/iu.test(e.text):e.kind==="task"?/^(?:TODO|Task|Việc)\s+\d+$/iu.test(e.text):!1}function To(e,t){let n=t.status??e?.status??"pending",r=n;e?.status==="completed"&&n!=="completed"&&(r="completed"),e&&n==="pending"&&(e.status==="in_progress"||e.status==="blocked")&&(r=e.status);let o=e&&bl(t)?e.title:t.text;return{id:e?.id??t.id,title:o,status:r,order:t.order??e?.order,confidence:Math.max(e?.confidence??0,t.confidence),updatedAt:t.occurredAt,updatedBy:{agent:t.agent,nativeSessionId:t.nativeSessionId,eventId:t.eventId}}}function Ro(e){let t=new Map;for(let n of e){let r=n.order!==void 0?`order:${n.order}`:At(n.title);t.set(r,n)}return t}function No(e){return e.order!==void 0?`order:${e.order}`:At(e.key||e.text)}function _o(e){return Array.from(e).sort((t,n)=>{let r=t.order??Number.MAX_SAFE_INTEGER,o=n.order??Number.MAX_SAFE_INTEGER;return r!==o?r-o:t.updatedAt.localeCompare(n.updatedAt)})}function $o(e){return e.find(t=>t.status==="in_progress")??e.find(t=>t.status==="blocked")??e.find(t=>t.status==="pending")}function xl(e,t){let n=mn(e),r=Ro(n?.phases??[]),o=Ro(n?.tasks??[]),s=n?.currentRequest,i=n?.currentActivity,a=n?.goal,c=n?.plan,u=n?.lastSession,p=[],l=[],f=[],d=[],m=[],S=[...n?.activeFiles??[]],y=[],g=[],k=[],b=[],T=[],P=[],R=[...t].sort((v,O)=>{let V=v.occurredAt.localeCompare(O.occurredAt);return V!==0?V:v.sequence-O.sequence});for(let v of R)switch(v.kind){case"request":s=v.text;break;case"activity":i=v.text;break;case"goal":a=v.text;break;case"plan":c=v.text;break;case"phase":{let O=No(v);r.set(O,To(r.get(O),v));break}case"task":{let O=No(v);o.set(O,To(o.get(O),v));break}case"decision":p.push(v.text);break;case"blocker":l.push(v.text);break;case"warning":f.push(v.text);break;case"next_action":d.push(v.text);break;case"file":{m.push(v.text);let O=v.fileAction??"active",V=S.indexOf(v.text);V>=0&&S.splice(V,1),O!=="deleted"&&S.push(v.text),O==="modified"?y.push(v.text):O==="created"?g.push(v.text):O==="deleted"&&k.push(v.text);break}case"command":b.push(v.text);break;case"test":T.push(v.text),v.checkKind&&P.push({kind:v.checkKind,command:v.text,status:v.checkStatus??"unknown",updatedAt:v.occurredAt,agent:v.agent,nativeSessionId:v.nativeSessionId});break;case"session":u={agent:v.agent,nativeSessionId:v.nativeSessionId,sessionKey:v.sessionKey,updatedAt:v.occurredAt};break}let j=_o(r.values()),x=_o(o.values()),z=$o(j),q=$o(x),Ft=L(n?.nextActions??[],[...d,...q?[q.title]:[],...!q&&z?[z.title]:[],...x.filter(v=>v.status==="pending").slice(0,5).map(v=>v.title)],8),Kt=L(n?.blockers??[],[...l,...j.filter(v=>v.status==="blocked").map(v=>v.title),...x.filter(v=>v.status==="blocked").map(v=>v.title)],20),he=R.length>0?R[R.length-1].occurredAt:n?.updatedAt??new Date().toISOString(),qe={version:1,projectId:e.id,projectName:e.name,currentRequest:s,currentActivity:i,goal:a,plan:c,phases:j,tasks:x,decisions:L(n?.decisions??[],p,20),blockers:Kt,warnings:L(n?.warnings??[],f,20),nextActions:Ft,filesTouched:L(n?.filesTouched??[],m,30),activeFiles:L([],S,5),modifiedFiles:L(n?.modifiedFiles??[],y,30),createdFiles:L(n?.createdFiles??[],g,30),deletedFiles:L(n?.deletedFiles??[],k,30),commands:L(n?.commands??[],b,20),tests:L(n?.tests??[],T,20),checks:wl(n?.checks??[],P,20),currentPhase:z,currentTask:q,progress:{phasesTotal:j.length,phasesCompleted:j.filter(v=>v.status==="completed").length,tasksTotal:x.length,tasksCompleted:x.filter(v=>v.status==="completed").length,blocked:j.filter(v=>v.status==="blocked").length+x.filter(v=>v.status==="blocked").length},lastSession:u,updatedAt:he},h=we(qe);return vl(Lo(e),h),h}function Fo(e,t){return Oo(e,()=>xl(e,t))}function E(e,t){let n=new Set,r=[];for(let o of e){let s=o.replace(/\s+/g," ").trim();if(!s)continue;let i=s.normalize("NFKC").toLowerCase();if(!n.has(i)&&(n.add(i),r.push(s),r.length>=t))break}return r}function Ko(e){if(e)return{id:e.id,title:e.title,status:e.status}}function Cl(e,t=[]){let n=t.slice(-10);if(n.some(o=>o.status==="failed"))return"failing";if(n.some(o=>o.status==="passed"))return"passing";let r=e.slice(-10).join(`
`).toLowerCase();return/(?:failed|failing|failure|error|✗|❌)/u.test(r)?"failing":/(?:passed|passing|green|success|✓|✅)/u.test(r)?"passing":"unknown"}function jl(e){return w(JSON.stringify(e))}function Il(e){let t=[];for(let n of e){if(!n)continue;let r=n.match(/https?:\/\/[^\s<>"'`)\]}]+/giu)??[];for(let o of r){let s=o.replace(/[.,;:!?]+$/gu,"").trim();s&&t.push(s)}}return E(t,30)}function Do(e){let{project:t,identity:n,state:r}=e,o=r.activeFiles?.at(-1)??r.filesTouched.at(-1),s=r.phases.filter(k=>k.status==="completed").map(k=>k.title),i=r.tasks.filter(k=>k.status==="completed").map(k=>k.title),a=r.phases.filter(k=>k.status!=="completed"&&k.status!=="cancelled").map(k=>k.title),c=r.tasks.filter(k=>k.status!=="completed"&&k.status!=="cancelled").map(k=>k.title),u=new Set(r.tasks.filter(k=>k.status==="completed").map(k=>k.title.normalize("NFKC").toLowerCase().replace(/\s+/gu," ").trim())),p=E(r.nextActions.filter(k=>!u.has(k.normalize("NFKC").toLowerCase().replace(/\s+/gu," ").trim())),10),l=E([...c,...p],15),f=E(r.tests.slice().reverse(),10),d=E([...(r.activeFiles??[]).slice().reverse(),...r.filesTouched.slice().reverse()],20),m={schema:"toolnet.handoff.v2",version:2,project:{id:t.id,name:t.name},source:{agent:n.agent,nativeSessionId:n.nativeSessionId,sessionKey:n.sessionKey,sequence:e.sequence,reason:e.reason},capturedAt:e.capturedAt??new Date().toISOString(),goal:r.goal,request:r.currentRequest,activity:r.currentActivity,current:{phase:Ko(r.currentPhase),task:Ko(r.currentTask),file:o},completed:{phases:E(s,20),tasks:E(i,30)},remaining:{phases:E(a,20),tasks:E(c,30),todos:l},nextAction:p[0],blockers:E(r.blockers.slice().reverse(),10),decisions:E(r.decisions.slice().reverse(),10),files:{current:o,recent:d,active:E(r.activeFiles??[],10),modified:E(r.modifiedFiles??[],20),created:E(r.createdFiles??[],20),deleted:E(r.deletedFiles??[],20)},tests:{status:Cl(r.tests,r.checks),recent:f,checks:(r.checks??[]).slice(-10).map(k=>({kind:k.kind,status:k.status,command:k.command}))},evidence:{commands:E((r.commands??[]).slice().reverse(),20),references:Il([r.currentRequest,r.currentActivity,r.goal,r.plan,...r.decisions,...r.blockers,...r.warnings,...r.nextActions,...r.filesTouched,...r.commands??[],...r.tests,...(r.checks??[]).map(k=>k.command)])},attention:E(e.attention??[],20),progress:r.progress},{capturedAt:S,source:y,...g}=m;return{...m,stateDigest:jl(g)}}function El(e){return!!(e.currentRequest||e.currentActivity||e.goal||e.plan||e.phases.length>0||e.tasks.length>0||e.nextActions.length>0||e.blockers.length>0||e.decisions.length>0||e.filesTouched.length>0)}function Wo(e,t,n,r,o){if(!El(n))return null;let s=Mt(e,!1),a=[...s?s.rules.filter(l=>l.mode==="enforce").map(l=>l.text):[],...n.warnings].slice(0,20),c=Do({project:e,identity:t,state:n,reason:r,sequence:o,attention:a}),u=c.stateDigest;return{version:1,id:w([e.id,t.sessionKey,u].join("|")).slice(0,24),projectId:e.id,projectName:e.name,createdAt:new Date().toISOString(),reason:r,sourceSession:{agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,sequence:o},currentRequest:n.currentRequest,currentActivity:n.currentActivity,goal:n.goal,plan:n.plan,progress:n.progress,currentPhase:n.currentPhase,currentTask:n.currentTask,incompletePhases:n.phases.filter(l=>l.status!=="completed"&&l.status!=="cancelled"),incompleteTasks:n.tasks.filter(l=>l.status!=="completed"&&l.status!=="cancelled"),nextActions:c.remaining.todos.slice(0,10),blockers:n.blockers.slice(-10),decisions:n.decisions.slice(-10),warnings:n.warnings.slice(-10),attention:a,filesTouched:n.filesTouched.slice(-20),activeFiles:n.activeFiles?.slice(-10),modifiedFiles:n.modifiedFiles?.slice(-20),createdFiles:n.createdFiles?.slice(-20),deletedFiles:n.deletedFiles?.slice(-20),tests:n.tests.slice(-15),checks:n.checks?.slice(-10),stateDigest:u,continuity:c}}function zo(e,t){let n=gn(e.rootPath,".toolnet","work","handoffs");Al(n,{recursive:!0});let r=gn(n,`${t.id}.json`);Ml(r)||N(r,t),N(gn(e.rootPath,".toolnet","work","handoff-latest.json"),t)}function qo(e){let t=Wo(e.project,e.identity,e.state,e.reason,e.sequence);return t?(zo(e.project,t),t):null}var Et=class{constructor(t){this.options=t}options;async capture(t,n){let r=mn(this.options.project);r||(r=await bt(this.options.project,this.options.storage)),r||(r=await Fe(this.options.project,this.options.storage));let o=Wo(this.options.project,this.options.identity,r,t,n);if(!o)return null;zo(this.options.project,o);let s=`projects/${this.options.project.id}/work/handoffs/${o.id}.json`;return await this.options.storage.exists(s)||await this.options.storage.put(s,JSON.stringify(o,null,2)+`
`,"application/json"),await this.options.storage.put(`projects/${this.options.project.id}/work/handoff-latest.json`,JSON.stringify(o,null,2)+`
`,"application/json"),o}};async function Bo(e,t){let n=await t.getText(`projects/${e.id}/work/handoff-latest.json`);if(!n)return null;try{return JSON.parse(n)}catch{return null}}import{existsSync as Pl,readFileSync as Ol,writeFileSync as Tl}from"node:fs";import{join as Rl}from"node:path";var Jo="<!-- TOOLNET:STABLE-WORK:BEGIN -->",yn="<!-- TOOLNET:STABLE-WORK:END -->";function hn(e){switch(e.status){case"completed":return"[x]";case"in_progress":return"[~]";case"blocked":return"[!]";case"cancelled":return"[-]";default:return"[ ]"}}function W(e,t){return t.length?["",`${e}:`,...t.map(n=>`- ${n}`)]:[]}function Vo(e,t){return t.length?["",`${e}:`,...t.map(n=>`- ${hn(n)} ${n.title}`)]:[]}function Nl(e){let t=[Jo,"# ToolNet Stable Work State","",`Updated: ${e.updatedAt}`];return e.lastSession&&t.push(`Last agent: ${e.lastSession.agent}`,`Last session: ${e.lastSession.nativeSessionId}`),e.currentRequest&&t.push("","Current request:",e.currentRequest),e.currentActivity&&t.push("","Current activity:",e.currentActivity),e.goal&&t.push("","Goal:",e.goal),e.plan&&t.push("","Plan:",e.plan),e.currentPhase&&t.push("","Current phase:",`${hn(e.currentPhase)} ${e.currentPhase.title}`),e.currentTask&&t.push("","Current task:",`${hn(e.currentTask)} ${e.currentTask.title}`),t.push(...Vo("Phases",e.phases)),t.push(...Vo("TODO / Tasks",e.tasks)),t.push(...W("Next actions",e.nextActions)),t.push(...W("Blockers",e.blockers)),t.push(...W("Important decisions",e.decisions)),t.push(...W("Active files",e.activeFiles??[])),t.push(...W("Modified files",e.modifiedFiles??[])),t.push(...W("Created files",e.createdFiles??[])),t.push(...W("Deleted files",e.deletedFiles??[])),t.push(...W("Files touched",e.filesTouched)),t.push(...W("Recent commands",e.commands??[])),t.push(...W("Checks",(e.checks??[]).map(n=>`[${n.status}] ${n.kind}: ${n.command}`))),t.push("","Progress:",`- Phases: ${e.progress.phasesCompleted}/${e.progress.phasesTotal}`,`- Tasks: ${e.progress.tasksCompleted}/${e.progress.tasksTotal}`,`- Blocked: ${e.progress.blocked}`,"","Continuation:","- Resume current unfinished task.","- Never redo completed TODO/Phase unless explicitly requested.","- Ask ToolNet Memory for deeper history only when necessary.",yn),t.join(`
`)}function Ho(e,t){let n=Rl(e.rootPath,".toolnet","current.md"),r="";if(Pl(n))try{r=Ol(n,"utf8")}catch{r=""}r=r.replace(/<!-- TOOLNET:AUTO-CURRENT:BEGIN -->[\s\S]*?<!-- TOOLNET:AUTO-CURRENT:END -->/gu,"");let o=Nl(t),s=r.indexOf(Jo),i=r.indexOf(yn),a;s>=0&&i>=s?a=[r.slice(0,s).trimEnd(),o,r.slice(i+yn.length).trimStart()].filter(Boolean).join(`

`):a=r.trim()?`${r.trim()}

${o}`:o,Tl(n,`${a.trim()}
`,{encoding:"utf8",mode:384})}import{existsSync as vy,mkdirSync as _l,readFileSync as wy,renameSync as $l,writeFileSync as Ll}from"node:fs";import{dirname as Fl,join as Kl}from"node:path";function Dl(e){return Kl(e.rootPath,".toolnet","context","session-origin.json")}function Wl(e,t){_l(Fl(e),{recursive:!0});let n=`${e}.tmp-${process.pid}-${Date.now()}`;Ll(n,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),$l(n,e)}function Pt(e,t){return[...e].filter(n=>n.kind===t).sort((n,r)=>{let o=n.occurredAt.localeCompare(r.occurredAt);return o!==0?o:n.sequence-r.sequence}).at(-1)}function Go(e,t){let n=Pt(t.observations,"file"),r=Pt(t.observations,"next_action"),o=Pt(t.observations,"blocker"),s=Pt(t.observations,"decision"),i={version:1,projectId:e.id,agent:t.agent,nativeSessionId:t.nativeSessionId,updatedAt:t.workState.updatedAt,currentRequest:t.workState.currentRequest,currentActivity:t.workState.currentActivity,currentTask:t.workState.currentTask?.title,currentPhase:t.workState.currentPhase?.title,lastTouchedFile:n?.text??t.workState.activeFiles?.at(-1)??t.workState.filesTouched.at(-1),latestNextAction:r?.text??t.workState.nextActions.at(-1),latestBlocker:o?.text??t.workState.blockers.at(-1),latestDecision:s?.text??t.workState.decisions.at(-1)};return Wl(Dl(e),i),i}import{existsSync as Uo,mkdirSync as zl,readFileSync as ql}from"node:fs";import{join as Sn}from"node:path";function Yo(e){return Sn(e.rootPath,".toolnet","memory","checkpoints")}function Xo(e){return Sn(Yo(e),"latest.json")}function Bl(e){let t=Xo(e);if(!Uo(t))return null;try{let n=JSON.parse(ql(t,"utf8"));return n.schema!=="toolnet.memory.checkpoint.v1"||n.project.id!==e.id?null:n}catch{return null}}function Vl(e){return["rule","architecture","decision","fix"].includes(e)}function Jl(e,t){return t.length===0?[]:ut(e,t).candidates.filter(r=>Vl(r.kind)&&r.knowledgeClass!=="transient"&&r.importanceScore>=.65).map(r=>({fingerprint:r.fingerprint,kind:r.kind,content:r.content,knowledgeClass:r.knowledgeClass,importanceScore:r.importanceScore,confidence:r.confidence,createdAt:r.createdAt,agent:e.agent,nativeSessionId:e.nativeSessionId}))}function Hl(e,t){let n=new Map;for(let r of[...e,...t]){let o=n.get(r.fingerprint);(!o||r.importanceScore>o.importanceScore)&&n.set(r.fingerprint,r)}return Array.from(n.values()).sort((r,o)=>o.importanceScore-r.importanceScore||o.createdAt.localeCompare(r.createdAt)).slice(0,80)}function Gl(e){return{request:e.currentRequest,activity:e.currentActivity,goal:e.goal,phase:e.currentPhase?{title:e.currentPhase.title,status:e.currentPhase.status}:void 0,task:e.currentTask?{title:e.currentTask.title,status:e.currentTask.status}:void 0,phases:e.phases.map(t=>({title:t.title,status:t.status})),tasks:e.tasks.map(t=>({title:t.title,status:t.status})),activeFiles:e.activeFiles??[],modifiedFiles:e.modifiedFiles??[],createdFiles:e.createdFiles??[],deletedFiles:e.deletedFiles??[],checks:e.checks??[],blockers:e.blockers,decisions:e.decisions,nextActions:e.nextActions}}function Qo(e,t,n,r){let o=Bl(e),s=Hl(o?.durableFacts??[],Jl(t,n)),i=n.at(-1)?.sequence??o?.source.sequence??0,a=r.phases.filter(y=>y.status==="completed").map(y=>y.title),c=r.tasks.filter(y=>y.status==="completed").map(y=>y.title),u=r.phases.filter(y=>y.status!=="completed"&&y.status!=="cancelled").map(y=>y.title),p=r.tasks.filter(y=>y.status!=="completed"&&y.status!=="cancelled").map(y=>y.title),l={work:Gl(r),durableFacts:s.map(y=>y.fingerprint).sort()},f=w(JSON.stringify(l)).slice(0,32),d={schema:"toolnet.memory.checkpoint.v1",version:1,project:{id:e.id,name:e.name},source:{agent:t.agent,nativeSessionId:t.nativeSessionId,sessionKey:t.sessionKey,sequence:i},capturedAt:new Date().toISOString(),request:r.currentRequest,activity:r.currentActivity,goal:r.goal,current:{phase:r.currentPhase,task:r.currentTask},completed:{phases:a,tasks:c},remaining:{phases:u,tasks:p},files:{active:r.activeFiles??[],modified:r.modifiedFiles??[],created:r.createdFiles??[],deleted:r.deletedFiles??[]},checks:r.checks??[],blockers:r.blockers.slice(-10),decisions:r.decisions.slice(-15),nextActions:r.nextActions.slice(0,10),durableFacts:s,stateDigest:f},m=Yo(e);zl(m,{recursive:!0,mode:448});let S=Sn(m,`${f}.json`);return Uo(S)||N(S,d),N(Xo(e),d),d}function Zo(e,t,n){if(process.env.TOOLNET_LOCAL_CHECKPOINT==="0"||n.length===0)return{updated:!1,observations:0};let r=vt(t,n);if(r.length===0)return{updated:!1,observations:0};let o=Fo(e,r);Ho(e,o),Go(e,{agent:t.agent,nativeSessionId:t.nativeSessionId,observations:r,workState:o});try{Qo(e,t,n,o)}catch{}try{qo({project:e,identity:t,state:o,reason:"continuous-checkpoint",sequence:n.at(-1)?.sequence??0})}catch{}return{updated:!0,observations:r.length}}var Ke=class{identity;wal;remote;sanitizer=new J;learner;continuity;semantic;handoff;project;title;metadata;constructor(t){this.project=t.project,this.identity=qn(t.project,t.agent,t.nativeSessionId),this.title=t.title,this.metadata=this.sanitizer.sanitizeValue(t.metadata??{}),this.wal=new ot(this.identity,t.eventContext),this.remote=new Qe(t.storage,t.maxEventsPerChunk??100,t.maxChunkBytes??512*1024),this.learner=new St({project:t.project,storage:t.storage,identity:this.identity,wal:this.wal}),this.continuity=new xt({project:t.project,storage:t.storage,identity:this.identity,wal:this.wal}),this.semantic=new jt({project:t.project,storage:t.storage,identity:this.identity,wal:this.wal}),this.handoff=new Et({project:t.project,storage:t.storage,identity:this.identity})}sanitizeEvent(t){let n=t.provenance?{...t.provenance,metadata:this.sanitizer.sanitizeValue(t.provenance.metadata)}:void 0;return{...t,data:this.sanitizer.sanitizeValue(t.data??{}),provenance:n}}checkpointLocal(t){if(t.length!==0)try{Zo(this.project,this.identity,t)}catch{}}start(t={}){let n=this.wal.loadState();return this.record({type:n.lastSequence===0?"session_start":"session_resume",data:t,provenance:{source:this.identity.agent}})}record(t){let n=this.wal.append([this.sanitizeEvent(t)]);return this.checkpointLocal(n),n[0]}recordMany(t){let n=this.wal.append(t.map(r=>this.sanitizeEvent(r)));return this.checkpointLocal(n),n}setSourceCursor(t,n){this.wal.setSourceCursor(t,n)}async flush(){let t=this.wal.readPending(),n=this.wal.loadState(),r=await this.remote.append(this.identity,t.events,n.sourceCursors,{title:this.title,metadata:this.metadata});if(t.events.length>0){let o=t.events[t.events.length-1];this.wal.markRemote(o.sequence,t.endOffset)}if(process.env.TOOLNET_SESSION_LEARNING!=="0")try{await this.learner.learnNew()}catch{}if(process.env.TOOLNET_WORK_CONTINUITY!=="0")try{await this.continuity.learnNew()}catch{}if(process.env.TOOLNET_SEMANTIC_CONTINUITY!=="0")try{await this.semantic.learnNew()}catch{}if(process.env.TOOLNET_SMART_HANDOFF!=="0"&&t.events.length>0)try{let o=t.events[t.events.length-1],s=["session_idle","session_end","session_compact"].includes(o.type)?o.type:"checkpoint";await this.handoff.capture(s,o.sequence)}catch{}return r}async idle(t={}){return this.record({type:"session_idle",data:t,provenance:{source:this.identity.agent}}),this.flush()}async end(t={}){return this.record({type:"session_end",data:t,provenance:{source:this.identity.agent}}),this.flush()}status(){return this.wal.loadState()}recoverRemote(){return this.remote.recover(this.identity)}};var Ul=[/^<SYSTEM MESSAGE>/i,/^<EPHEMERAL MESSAGE>/i,/^<system>/i,/^<ephemeral>/i,/^ManageTask:/i,/^Task \d+ status:/i,/^Task \d+ killed/i,/^Task \d+ loading/i,/^Thought for \d+ tokens/i,/^Prioritizing Tool Usage/i,/^Tool call:/i,/^Tool response:/i,/^npm notice/i,/^npm WARN/i,/^added \d+ packages/i,/^removed \d+ packages/i,/^up to date/i,/^\d+ packages are looking for funding/i,/^run `npm fund` for details/i,/^[\d.]+%/,/^\[={10,}\]/,/^Loading\.\.\./i,/^Processing\.\.\./i,/^bash-\d+\.\d+\$/,/^\$ /,/^\s*$/],Yl=[/api[_-]?key[:\s=]+[^\s]+/gi,/token[:\s=]+[^\s]+/gi,/secret[:\s=]+[^\s]+/gi,/password[:\s=]+[^\s]+/gi,/bearer\s+[^\s]+/gi,/authorization:\s*[^\s]+/gi],Xl=["decision","decided","rule","convention","architecture","pattern","fixed","resolved","implemented","created","updated","deleted","deployed","blocker","blocked","issue","bug","error","next","todo","action","requirement","must","should","important"];function Ql(e){let t=e.toLowerCase();return Xl.some(n=>t.includes(n))}function Zl(e){if(!e.trim())return!0;for(let t of Ul)if(t.test(e))return!0;return Ql(e),!1}function ed(e){let t=e;for(let n of Yl)t=t.replace(n,r=>{let o=r.split(/[:\s=]+/);return o.length>1?`${o[0]}: [REDACTED]`:"[REDACTED]"});return t}function kn(e){let t=e.trim();return t?Zl(t)?{content:"",filtered:!0,reason:"noise"}:{content:ed(t),filtered:!1}:{content:"",filtered:!0,reason:"empty"}}function Ot(e){let t={};for(let[n,r]of Object.entries(e))if(typeof r=="string"){let o=kn(r);o.filtered||(t[n]=o.content)}else r&&typeof r=="object"&&!Array.isArray(r)?t[n]=Ot(r):Array.isArray(r)?t[n]=r.map(o=>{if(typeof o=="string"){let s=kn(o);return s.filtered?null:s.content}return o&&typeof o=="object"?Ot(o):o}).filter(o=>o!==null):t[n]=r;return t}function es(e){let t=typeof e.type=="string"?e.type.toLowerCase():"";if(t.includes("system")||t.includes("ephemeral")||t==="tool_call"&&!e.result)return!0;if(e.data&&typeof e.data=="object"){let n=e.data,r=typeof n.content=="string"?n.content:"";if(r&&kn(r).filtered)return!0}return!1}function as(){try{let t=nd("opencode",["db","path"],{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:5e3}).trim();if(t)return t}catch{}if(process.env.OPENCODE_DB)return process.env.OPENCODE_DB;let e=process.env.XDG_DATA_HOME??ts(rd(),".local","share");return ts(e,"opencode","opencode.db")}function C(e){return typeof e=="string"?e:""}function oe(e){if(typeof e=="number"&&Number.isFinite(e))return e;if(typeof e=="bigint")return Number(e);if(typeof e=="string"){let t=Number(e);if(Number.isFinite(t))return t}return 0}function Rt(e){if(e&&typeof e=="object"&&!Buffer.isBuffer(e))return e;if(typeof e!="string")return{};try{let t=JSON.parse(e);if(t&&typeof t=="object"&&!Array.isArray(t))return t}catch{}return{}}function fe(e){let t=oe(e);if(t<=0)return new Date().toISOString();t<1e11&&(t*=1e3);let n=new Date(t);return Number.isNaN(n.getTime())?new Date().toISOString():n.toISOString()}function Tt(e,t){if(!t)return!1;let n=ns(e),r=ns(t);if(n===r)return!0;let o=sd(n,r);return o!==""&&o!==".."&&!o.startsWith(`..${process.platform==="win32"?"\\":"/"}`)&&!od(o)}function rs(e){if(!e)return{time:-1,id:""};try{let t=JSON.parse(e);return{time:typeof t.time=="number"?t.time:-1,id:typeof t.id=="string"?t.id:""}}catch{return{time:-1,id:""}}}function os(e){return JSON.stringify(e)}function cs(e){if(!td(e))throw new Error(`OpenCode database not found: ${e}`);let t=new id(e,{readOnly:!0});return t.exec("PRAGMA query_only = ON"),t.exec("PRAGMA busy_timeout = 3000"),t}function ad(e,t){let n=e.prepare(`
      SELECT *
      FROM "session"
      WHERE id = ?
      LIMIT 1
      `).get(t);if(!n)throw new Error(`OpenCode session not found: ${t}`);return n}function us(e,t,n){let r=C(t.directory);if(r&&Tt(n.rootPath,r))return!0;let o=C(t.project_id);if(o){try{let s=e.prepare(`
          SELECT *
          FROM "project"
          WHERE id = ?
          LIMIT 1
          `).get(o);if(s)for(let i of["worktree","directory","path"]){let a=C(s[i]);if(a&&Tt(n.rootPath,a))return!0}}catch{}try{if(e.prepare(`
          SELECT directory
          FROM "project_directory"
          WHERE project_id = ?
          `).all(o).some(i=>Tt(n.rootPath,C(i.directory))))return!0}catch{}}try{let s=e.prepare(`
        SELECT data
        FROM "message"
        WHERE session_id = ?
        ORDER BY time_created DESC
        LIMIT 20
        `).all(C(t.id));for(let i of s){let a=Rt(i.data),c=a.path&&typeof a.path=="object"?a.path:{};for(let u of[C(c.cwd),C(c.root)])if(u&&Tt(n.rootPath,u))return!0}}catch{}return!1}function ss(e,t,n,r){let o=`
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
    `;return e.prepare(o).all(n,r.time,r.time,r.id)}function is(e,t){let n=e[e.length-1];return n?{time:oe(n.__clock),id:C(n.id)}:t}function cd(e,t){let n=Rt(t.data),r=C(n.role),o=oe(t.__clock),s=C(t.id),i="message";return r==="user"?i="user_prompt":r==="assistant"&&(i="assistant_message"),{clock:o,order:0,event:{type:i,timestamp:fe(o),role:r||void 0,sourceEventId:`message:${s}:${o}`,sourceSequence:`${o}:${s}`,data:{messageId:s,...n},provenance:{source:"opencode",sourcePath:e,sourceTable:"message",sourceRowId:s,sourceOffset:`${o}:${s}`}}}}function ud(e){let t={...e},n=e.state&&typeof e.state=="object"&&!Array.isArray(e.state)?{...e.state}:void 0;if(n){let r=n.output;if(typeof r=="string"){let o=r.replace(/\r\n/g,`
`),s=500;n.outputSummary=o.length<=s?o:`${o.slice(0,350)}
...[ToolNet truncated ${o.length-s} chars]...
${o.slice(-150)}`,delete n.output}else r!==void 0&&(n.outputSummary="[non-text tool output omitted]",delete n.output);if(n.input&&typeof n.input=="object"&&!Array.isArray(n.input)){let o={...n.input};for(let[s,i]of Object.entries(o))typeof i=="string"&&i.length>1e3&&(o[s]=`${i.slice(0,1e3)}...[ToolNet truncated]`);n.input=o}t.state=n}return t}function ld(e,t){let n=C(t.message_id);if(n)try{let r=e.prepare(`
        SELECT data
        FROM "message"
        WHERE id = ?
        LIMIT 1
        `).get(n);if(!r)return;let o=Rt(r.data);return C(o.role)||void 0}catch{return}}function dd(e,t,n){let r=Rt(n.data),o=C(r.type),s=oe(n.__clock),i=C(n.id),a=C(n.message_id),c=ld(e,n),u="message_part";return o==="tool"?u="tool_call":o==="snapshot"&&(u="artifact"),{clock:s,order:1,event:{type:u,timestamp:fe(s),role:c,sourceEventId:`part:${i}:${s}`,sourceSequence:`${s}:${i}`,data:{partId:i,messageId:a,...o==="tool"?ud(r):r},provenance:{source:"opencode",sourcePath:t,sourceTable:"part",sourceRowId:i,sourceOffset:`${s}:${i}`}}}}async function vn(e){let t=e.dbPath??as(),n=cs(t);try{let r;try{r=ad(n,e.nativeSessionId)}catch{let g=new Ke({project:e.project,storage:e.storage,agent:"opencode",nativeSessionId:e.nativeSessionId,metadata:{source:"opencode.db",deleted:!0},eventContext:{source:"opencode",cwd:e.project.rootPath}});g.status().lastSequence===0&&g.recordMany([{type:"custom",timestamp:new Date().toISOString(),sourceEventId:`session:${e.nativeSessionId}:deleted`,data:{event:"session_deleted"},provenance:{source:"opencode"}}]);let k=await g.flush();return{nativeSessionId:e.nativeSessionId,importedMessages:0,importedParts:0,recordedEvents:0,eventCount:k.eventCount,chunkCount:k.chunkCount,status:k.status,durability:e.localOnly?"local":"remote"}}if(!us(n,r,e.project))throw new Error(["OpenCode session does not belong to current ToolNet project.",`Session: ${e.nativeSessionId}`,`Project: ${e.project.rootPath}`,`Session directory: ${C(r.directory)||"unknown"}`].join(" "));let o=new Ke({project:e.project,storage:e.storage,agent:"opencode",nativeSessionId:e.nativeSessionId,title:C(r.title)||void 0,metadata:{source:"opencode.db",openCodeProjectId:C(r.project_id)||void 0,directory:C(r.directory)||void 0},eventContext:{source:"opencode",cwd:C(r.directory)||e.project.rootPath}}),s=o.status(),i=rs(s.sourceCursors["opencode.message"]),a=rs(s.sourceCursors["opencode.part"]),c=ss(n,"message",e.nativeSessionId,i),u=ss(n,"part",e.nativeSessionId,a),p=[];if(s.lastSequence===0){let g=oe(r.time_created);p.push({clock:g,order:-1,event:{type:"session_start",timestamp:fe(g),sourceEventId:`session:${e.nativeSessionId}:created:${g}`,data:{title:C(r.title)||void 0,directory:C(r.directory)||void 0,openCodeProjectId:C(r.project_id)||void 0},provenance:{source:"opencode",sourcePath:t,sourceTable:"session",sourceRowId:e.nativeSessionId}}})}p.push(...c.map(g=>cd(t,g))),p.push(...u.map(g=>dd(n,t,g)));let l=oe(r.time_updated)||oe(r.time_created);e.compacted&&p.push({clock:l,order:98,event:{type:"session_compact",timestamp:fe(l),sourceEventId:`session:${e.nativeSessionId}:compact:${l}`,data:{},provenance:{source:"opencode"}}}),e.error?p.push({clock:l,order:99,event:{type:"error",timestamp:fe(l),sourceEventId:`session:${e.nativeSessionId}:error:${l}`,data:{source:"session.error"},provenance:{source:"opencode"}}}):e.idle&&p.push({clock:l,order:100,event:{type:"session_idle",timestamp:fe(l),sourceEventId:`session:${e.nativeSessionId}:idle:${l}`,data:{},provenance:{source:"opencode"}}}),p.sort((g,k)=>g.clock-k.clock||g.order-k.order);let f=p.filter(g=>!es(g.event.data)).map(g=>({...g,event:{...g.event,data:Ot(g.event.data)}})),d=o.recordMany(f.map(g=>g.event)),m=is(c,i),S=is(u,a);if(o.setSourceCursor("opencode.message",os(m)),o.setSourceCursor("opencode.part",os(S)),f.length>0)try{let g=f.map(b=>JSON.stringify(b.event.data)),k=ct(g,e.nativeSessionId);o.setSourceCursor("opencode.session.summary",k.summary),o.setSourceCursor("opencode.session.facts_count",k.durableFacts.length),Sr()&&!wr()&&o.setSourceCursor("opencode.raw_transcript.archived","local")}catch{}if(e.localOnly){let g=o.status();return{nativeSessionId:e.nativeSessionId,importedMessages:c.length,importedParts:u.length,recordedEvents:d.length,eventCount:g.lastSequence,chunkCount:0,status:g.status,durability:"local"}}let y=await o.flush();return{nativeSessionId:e.nativeSessionId,importedMessages:c.length,importedParts:u.length,recordedEvents:d.length,eventCount:y.eventCount,chunkCount:y.chunkCount,status:y.status,durability:"remote"}}finally{n.close()}}async function ls(e){let t=e.dbPath??as(),n=cs(t),r=[];try{let s=n.prepare(`
        SELECT *
        FROM "session"
        ORDER BY
          COALESCE(
            time_updated,
            time_created,
            0
          ) DESC
        `).all();for(let i of s){if(!us(n,i,e.project))continue;let a=C(i.id);if(a&&r.push(a),r.length>=(e.limit??100))break}}finally{n.close()}let o=[];for(let s of r)o.push(await vn({project:e.project,storage:e.storage,nativeSessionId:s,dbPath:t}));return o}import{existsSync as fd,mkdirSync as gs,readFileSync as md,writeFileSync as ys}from"node:fs";import{join as fs}from"node:path";import{homedir as ds}from"node:os";import{join as se}from"node:path";function Nt(e={}){let t=process.env.OPENCODE_CONFIG_DIR?.trim();if(t)return t;let n=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return n?se(n,"opencode"):se(e.home??ds(),".config","opencode")}function De(e={}){let t=process.env.OPENCODE_CONFIG?.trim();if(t)return t;let n=e.home??ds(),r=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return r?se(r,"opencode","opencode.json"):se(n,".config","opencode","opencode.json")}function We(e={}){let t=e.cwd??process.cwd();return se(t,"opencode.json")}function _t(e={}){return se(Nt(e),"plugins")}function $t(e={}){return se(Nt(e),"AGENTS.md")}var pd="memory_agent_ask";function ps(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${pd}

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
`.trim()}var ms="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",wn="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function gd(e={}){let t=$t();gs(Nt(),{recursive:!0});let n=`${ms}
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


${ps()}

${wn}`,r=fd(t)?md(t,"utf8"):"",o=r.indexOf(ms),s=r.indexOf(wn);return o>=0&&s>=o?r=r.slice(0,o)+n+r.slice(s+wn.length):(r=r.trimEnd(),r&&(r+=`

`),r+=n),ys(t,r.trimEnd()+`
`,{encoding:"utf8",mode:384}),t}function hs(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=[];n.push(gd({cwd:e.cwd}));let r=e.scope??"global",o=[];if((r==="global"||r==="both")&&o.push(e.directory??_t()),r==="project"||r==="both"){let s=e.cwd??process.cwd();o.push(fs(s,".opencode","plugins"))}for(let s of o){gs(s,{recursive:!0});let i=fs(s,"toolnet-memory.js"),a=`
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
`;ys(i,a.trimStart(),{encoding:"utf8",mode:384}),n.push(i)}return n}import{existsSync as vs,mkdirSync as yd,readFileSync as hd,renameSync as Sd,writeFileSync as kd}from"node:fs";import{dirname as ws,join as vd}from"node:path";function ze(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function wd(e,t){yd(ws(e),{recursive:!0});let n=`${e}.tmp-${process.pid}-${Date.now()}`;kd(n,`${JSON.stringify(t,null,2)}
`,{encoding:"utf8",mode:384}),Sd(n,e)}function Ss(e){if(!vs(e))return{};let t=hd(e,"utf8").trim();if(!t)return{};let n;try{n=JSON.parse(t)}catch{throw new Error(`Invalid existing OpenCode config at ${e}: parse error. Not overwriting.`)}if(!ze(n))throw new Error(`Invalid existing OpenCode config at ${e}: root must be a JSON object. Not overwriting.`);return n}function ks(e,t){if(!ze(e))return!1;let n=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(n)&&n.length===2&&n[0]===t&&n[1]==="mcp"}function Lt(e,t,n,r){let o=vd(ws(e),"opencode.jsonc"),s=vs(o)?o:void 0,i=Ss(e),a=i.mcp;if(a!==void 0&&!ze(a))throw new Error(`Invalid existing OpenCode config: mcp must be an object in ${e}.`);let c=ze(a)?{...a}:{},u=c[n];if(ks(u,t)&&!r)return{installed:!0,changed:!1,preservedJsonc:s};c[n]={type:"local",command:[t,"mcp"],enabled:!0};let p={...i,mcp:c};wd(e,p);let l=Ss(e);if(!ze(l.mcp)||!ks(l.mcp[n],t))throw new Error(`OpenCode MCP configuration was written but verification failed for ${e}.`);return{installed:!0,changed:!0,preservedJsonc:s}}function bs(e={}){let t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=e.scope??"global";if(e.configFile)return{...Lt(e.configFile,t,n,e.force??!1),configFile:e.configFile,serverName:n,command:[t,"mcp"]};if(r==="both"){let i=De(),a=We({cwd:e.cwd}),c=Lt(i,t,n,e.force??!1),u=Lt(a,t,n,e.force??!1);return{installed:!0,changed:c.changed||u.changed,configFile:i,serverName:n,command:[t,"mcp"],preservedJsonc:c.preservedJsonc??u.preservedJsonc}}let o=r==="project"?We({cwd:e.cwd}):De();return{...Lt(o,t,n,e.force??!1),configFile:o,serverName:n,command:[t,"mcp"]}}import{existsSync as xh,mkdirSync as jd,readFileSync as Ch,writeFileSync as Id}from"node:fs";import{dirname as Md,join as Cs}from"node:path";function bn(e){if(!e)return 0;let t=Array.from(e).length,n=e.trim().split(/\s+/u).filter(Boolean).length;return Math.ceil(Math.max(t/3.5,n*1.3))}function I(e,t){let n=e.replace(/\s+/g," ").trim();return n.length<=t?n:n.slice(0,Math.max(0,t-1)).trimEnd()+"\u2026"}function bd(e){let t=[],n=!1;for(let r of e.split(/\r?\n/u)){let o=r.trim();if(o.includes("<!--")&&(n=!0),n){o.includes("-->")&&(n=!1);continue}let s=o.toLowerCase();if(!(!o||o.startsWith("#")||o==="```"||s.startsWith("- [enforce]")||s.startsWith("* [enforce]")||s.startsWith("- [advisory]")||s.startsWith("* [advisory]"))&&(o=o.replace(/^[-*]\s+/u,""),o&&t.push(I(o,280)),t.length>=16))break}return t}function xd(e){let t=[],n=[];for(let r of e.split(/\\r?\\n/u)){let o=r.trim(),s=o.toLowerCase(),a=["- [enforce]","* [enforce]","- [advisory]","* [advisory]"].find(u=>s.startsWith(u));if(!a)continue;let c=o.slice(a.length).trim();c&&(a.includes("enforce")?t.push(c):n.push(c))}return{enforce:t,advisory:n}}function Cd(e,t){let n=[];for(let r of e){let o=[...n,r].join(`
`);if(bn(o)<=t){n.push(r);continue}let s=bn(n.join(`
`)),i=Math.max(0,t-s);if(i>=16){let a=Math.floor(i*3.2),c=I(r,a);c&&n.push(c)}break}return n.join(`
`).trim()}async function xs(e){let t=Math.max(256,Math.min(2e3,e.maxTokens??1e3)),n=Mt(e.project,!1),r=n?.content??"";r||(r=await e.storage.getText(`projects/${e.project.id}/project/manual.md`)??"");let o=xd(r),s=n?n.rules.filter(d=>d.mode==="enforce").map(d=>d.text):o.enforce,i=n?n.rules.filter(d=>d.mode==="advisory").map(d=>d.text):o.advisory,a=r?bd(r):[],c=await bt(e.project,e.storage),u=await Co(e.project,e.storage),p=await Bo(e.project,e.storage),l=[];if(l.push("[TOOLNET PROJECT CONTEXT]"),l.push(`Project: ${e.project.name}`),l.push("Continue existing project state. Do not restart completed work unless evidence shows it is necessary."),r&&l.push(`Full operating manual: ${It(e.project)}`),s.length){l.push("","PROJECT RULES \u2014 MUST FOLLOW");for(let d of s.slice(0,24))l.push(`- [ENFORCE] ${I(d,240)}`)}if(i.length){l.push("","PROJECT PREFERENCES");for(let d of i.slice(0,10))l.push(`- ${I(d,220)}`)}if(u&&(u.mission&&l.push("","MISSION",I(u.mission.value,420)),u.activeObjective&&l.push("","CURRENT OBJECTIVE",I(u.activeObjective.value,420)),u.why&&l.push("","WHY THIS WORK MATTERS",I(u.why.value,420)),u.desiredOutcome&&l.push("","DESIRED OUTCOME",I(u.desiredOutcome.value,420)),u.planRationale&&l.push("","WHY THIS APPROACH",I(u.planRationale.value,420))),c){if(l.push("","ACTIVE WORK"),c.goal&&l.push(`Goal: ${I(c.goal,320)}`),c.plan&&l.push(`Plan: ${I(c.plan,320)}`),l.push(`Progress: phases ${c.progress.phasesCompleted}/${c.progress.phasesTotal}; tasks ${c.progress.tasksCompleted}/${c.progress.tasksTotal}; blocked ${c.progress.blocked}`),c.currentPhase&&l.push(`Current phase: ${c.currentPhase.title} [${c.currentPhase.status}]`),c.currentPhase&&u){let d=u.phases.find(m=>m.order===c.currentPhase?.order);d&&(d.objective&&l.push(`Phase objective: ${I(d.objective.value,340)}`),d.why?l.push(`Why this phase: ${I(d.why.value,340)}`):l.push("Why this phase: not explicitly recorded. Inspect existing implementation before assuming intent."),d.deliverable&&l.push(`Deliverable: ${I(d.deliverable.value,340)}`),d.dependencies.length&&l.push(`Depends on: ${d.dependencies.slice(0,4).map(m=>I(m.value,180)).join("; ")}`),d.acceptanceCriteria.length&&(l.push("","DEFINITION OF DONE"),d.acceptanceCriteria.slice(0,6).forEach(m=>{l.push(`- ${I(m.value,260)}`)})),d.openQuestions.length&&(l.push("","OPEN QUESTIONS FOR CURRENT PHASE"),d.openQuestions.slice(0,4).forEach(m=>{l.push(`- ${I(m.value,260)}`)})))}c.currentTask&&l.push(`Current task: ${c.currentTask.title} [${c.currentTask.status}]`),c.nextActions.length&&(l.push("","NEXT ACTIONS"),c.nextActions.slice(0,6).forEach((d,m)=>{l.push(`${m+1}. ${I(d,260)}`)})),c.blockers.length&&(l.push("","BLOCKERS"),c.blockers.slice(0,5).forEach(d=>{l.push(`- ${I(d,260)}`)})),c.warnings.length&&(l.push("","ATTENTION"),c.warnings.slice(-5).forEach(d=>{l.push(`- ${I(d,260)}`)})),c.decisions.length&&(l.push("","RECENT DECISIONS"),c.decisions.slice(-5).forEach(d=>{l.push(`- ${I(d,260)}`)})),c.lastSession&&l.push("",`Last work session: ${c.lastSession.agent} / ${c.lastSession.nativeSessionId}`)}if(u&&u.openQuestions.length&&(l.push("","UNRESOLVED QUESTIONS"),u.openQuestions.slice(0,5).forEach(d=>{l.push(`- ${I(d.value,260)}`)})),p&&l.push(`Latest handoff: ${p.reason} / ${p.sourceSession.agent}`),a.length){l.push("","OPERATING NOTES");for(let d of a)l.push(`- ${d}`)}l.push("","Before changing anything: verify the current repository state and continue from the active phase/task above.");let f=Cd(l,t);return{version:1,projectId:e.project.id,projectName:e.project.name,text:f,estimatedTokens:bn(f),maxTokens:t,hasManual:!!r,hasWorkState:!!c,hasHandoff:!!p,generatedAt:new Date().toISOString()}}function Ad(e){return Cs(e.rootPath,".toolnet","context","startup.md")}function Ed(e){return Cs(e.rootPath,".toolnet","context","startup.json")}function Pd(e,t){let n=Ad(e);jd(Md(n),{recursive:!0}),Id(n,t.text.endsWith(`
`)?t.text:t.text+`
`,{encoding:"utf8",mode:384}),N(Ed(e),t)}async function js(e,t,n=800){let o=(await xs({project:e,storage:t,maxTokens:n})).text;it(o)>n&&(o=at(o,n),o+=`

[Context trimmed by ToolNet Memory token budget]
`);let i={version:1,projectId:e.id,projectName:e.name,text:o,digest:w(o),estimatedTokens:it(o),generatedAt:new Date().toISOString()};return Pd(e,i),await t.put(`projects/${e.id}/context/startup.md`,i.text+`
`,"text/markdown"),await t.put(`projects/${e.id}/context/startup.json`,JSON.stringify(i,null,2)+`
`,"application/json"),i}function ge(e,t){let n=e.indexOf(t);if(!(n<0))return e[n+1]}function ye(e,t){return e.includes(t)}function Td(e){let t=Be(),n=Ln(_n({provider:t.storage.provider,huggingface:t.storage.huggingface,localRoot:t.storage.localRoot}),{attempts:3});return new Xe(n,e.id,e.name,e.remote??e.name)}function Rd(){return xn("sh",["-lc","command -v opencode >/dev/null 2>&1"],{stdio:"ignore"}).status===0}function Nd(){try{return xn("opencode",["--version"],{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:5e3}).stdout?.trim()||void 0}catch{return}}function _d(){try{let e=xn("opencode",["mcp","list","--format","json"],{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:1e4});if(e.status!==0)return{available:!1,servers:[]};let t=JSON.parse(e.stdout||"[]");return{available:!0,servers:Array.isArray(t)?t.map(r=>String(r.name||r.id||"")):[]}}catch{return{available:!1,servers:[]}}}function $d(e){let t=[],n=Rd();n||t.push("opencode binary not found");let r=Nd(),o=De(),s=me(o),i=We({cwd:e}),a=me(i),c=process.env.OPENCODE_CONFIG?.trim(),u=c?me(c):!1,p=!1;if(s)try{p=!!JSON.parse(Is(o,"utf8")).mcp?.["toolnet-memory"]}catch{}let l=!1;if(a)try{l=!!JSON.parse(Is(i,"utf8")).mcp?.["toolnet-memory"]}catch{}let f=_t(),d=me(`${f}/toolnet-memory.js`),m=Od(e??process.cwd(),".opencode","plugins"),S=me(`${m}/toolnet-memory.js`),y=$t(),g=me(y),k;return n&&(k=_d()),{opencodeBinaryDetected:n,version:r,globalConfigExists:s,projectConfigExists:a,customConfigExists:u,globalMcpReady:p,projectMcpReady:l,globalPluginExists:d,projectPluginExists:S,continuityInstructions:g,mcpConnectionStatus:k,errors:t}}async function Ld(){let[e="help",...t]=process.argv.slice(2),n=ye(t,"--json"),r=ye(t,"--force"),o=ge(t,"--scope")??"global",s=ge(t,"--project")??process.cwd();if(e==="status"){let u=$d(s);if(n)console.log(JSON.stringify(u,null,2));else if(console.log("OpenCode Integration"),console.log("===================="),console.log(""),console.log(`Binary detected     : ${u.opencodeBinaryDetected?"\u2713":"\u2717"}`),u.version&&console.log(`Version             : ${u.version}`),console.log(`Global config       : ${u.globalConfigExists?"\u2713":"\u2717"}`),console.log(`Project config      : ${u.projectConfigExists?"\u2713":"\u2717"}`),u.customConfigExists&&console.log(`Custom config       : \u2713 (${process.env.OPENCODE_CONFIG})`),console.log(`Global MCP          : ${u.globalMcpReady?"\u2713":"\u2717"}`),console.log(`Project MCP         : ${u.projectMcpReady?"\u2713":"\u2717"}`),console.log(`Global plugin       : ${u.globalPluginExists?"\u2713":"\u2717"}`),console.log(`Project plugin      : ${u.projectPluginExists?"\u2713":"\u2717"}`),console.log(`Continuity rules    : ${u.continuityInstructions?"\u2713":"\u2717"}`),u.mcpConnectionStatus&&(console.log(`MCP connection      : ${u.mcpConnectionStatus.available?"\u2713":"\u2717"}`),u.mcpConnectionStatus.servers.length>0&&console.log(`  Servers           : ${u.mcpConnectionStatus.servers.join(", ")}`)),u.errors.length>0){console.log("");for(let p of u.errors)console.log(`  \u26A0 ${p}`)}u.opencodeBinaryDetected||(process.exitCode=1);return}if(e==="install-plugin"){let u=bs({binary:ge(t,"--bin"),scope:o,cwd:s,force:r}),p=hs({binary:ge(t,"--bin"),scope:o,cwd:s});if(n)console.log(JSON.stringify({mcp:u,pluginFiles:p},null,2));else{console.log(`\u2705 OpenCode integration installed (scope: ${o})`),console.log(`  MCP config: ${u.configFile}`),u.changed?console.log(`  \u2713 MCP server "${u.serverName}" added`):console.log(`  \u2713 MCP server "${u.serverName}" already configured`);for(let l of p)console.log(`  \u2713 ${l}`);console.log(""),console.log("OpenCode will load plugins automatically on next start."),console.log("Verify MCP with: opencode mcp list")}return}let i=new Ge().detect(s),a=Td(i),c=ge(t,"--db");if(e==="sync"){let u=t.find(S=>!S.startsWith("--")&&S!==s&&S!==c);if(!u)throw new Error("Usage: session:opencode-sync <session-id>");let p=ye(t,"--idle"),l=ye(t,"--error"),f=ye(t,"--compacted"),d=ye(t,"--local-only"),m=await vn({project:i,storage:a,nativeSessionId:u,dbPath:c,idle:p,error:l,compacted:f,localOnly:d});if(!d&&(p||f||l))try{await js(i,a,800)}catch{}console.log(JSON.stringify(m,null,2));return}if(e==="recover"){let u=ge(t,"--limit"),p=u?Number(u):100,l=await ls({project:i,storage:a,dbPath:c,limit:Number.isFinite(p)?p:100});console.log(JSON.stringify({project:i.name,sessions:l.length,importedMessages:l.reduce((f,d)=>f+d.importedMessages,0),importedParts:l.reduce((f,d)=>f+d.importedParts,0)},null,2));return}console.log(`OpenCode Session Adapter

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
`)}Ld().catch(e=>{console.error(e instanceof Error?e.message:e),process.exit(1)});
