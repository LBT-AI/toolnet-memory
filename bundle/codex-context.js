import*as f from"fs";import*as d from"path";function k(e){return e?Math.ceil(e.length/3.5):0}function Q(e,n){if(!e)return"";if(k(e)<=n)return e;let r=Math.floor(n*3.5),o=e.slice(0,r),s=o.lastIndexOf("."),i=o.lastIndexOf(`
`),a=Math.max(s,i);return a>r*.7?o.slice(0,a+1):o}function R(e,n){if(!e)return"";let t=e.split(`
`).filter(s=>s.trim());if(t.length<=n)return e;let r=t.slice(0,n),o=t.length-n;return[...r,`... (${o} more items omitted)`].join(`
`)}function Z(e,n){let{maxTokens:t,trimMarker:r="[Context trimmed by ToolNet Memory token budget]"}=n;if(e.length===0)return"";let o=[...e].sort((c,u)=>u.priority-c.priority),s=[],i=0,a=!1;for(let c of o){let u=`# ${c.title}

`,p=k(u),l=k(c.content),h=p+l;if(i+h<=t)s.push(u+c.content),i+=h;else{let g=t-i-p;if(g>50){let b=Q(c.content,g);s.push(u+b),i=t,a=!0}else a=!0;break}}return a&&s.push(`
${r}
`),s.join(`

---

`)}function T(e,n){let t=[{title:"Profile",content:R(e,10),priority:100},{title:"Current Work",content:R(n,15),priority:90}];return Z(t,{maxTokens:800})}import{chmodSync as Fe,existsSync as X,mkdirSync as $e,readFileSync as q,renameSync as Le,writeFileSync as ze}from"node:fs";import{dirname as Ve,join as _}from"node:path";var I="toolnet.context-offload.v1";function ee(e){return _(e,".toolnet","offload")}function te(e){return _(ee(e),"graph.json")}function v(){return{schema:I,version:1,updatedAt:new Date(0).toISOString(),nodes:[]}}function ne(e){let n=te(e);if(!X(n))return v();try{let t=JSON.parse(q(n,"utf8"));return t.schema!==I||t.version!==1||!Array.isArray(t.nodes)?v():t}catch{return v()}}function O(e,n){let t=e.replace(/\s+/gu," ").trim();return t.length<=n?t:t.slice(0,n-1).trimEnd()+"\u2026"}function j(e,n={}){let t=ne(e);if(t.nodes.length===0)return"";let r=Math.max(1,Math.min(12,n.maxAssets??6)),o=Math.max(320,Math.min(2400,n.maxChars??900)),s=["[TOOLNET CONTEXT OFFLOAD GRAPH]","Large tool/file payloads stay outside prompt context.","Read only a needed asset with MCP context_offload_read."];for(let i of t.nodes.slice(-r).reverse()){let a=O(i.sourceRefs.at(-1)??"unknown",72),c=i.files.length>0?` files=${O(i.files.join(","),120)}`:"",u=`event:${a} --offloads--> asset:${i.id.slice(0,12)} kind=${i.kind} bytes=${i.bytes}${c}`;if([...s,u].join(`
`).length>o)break;s.push(u)}return s.join(`
`)}import{existsSync as P,mkdirSync as Je,readFileSync as D,renameSync as Ue,writeFileSync as We}from"node:fs";import{dirname as Ze,join as F}from"node:path";import{createHash as re}from"node:crypto";function N(e){return re("sha256").update(e).digest("hex")}function oe(e){return F(e.rootPath,".toolnet","context","handoff.md")}function se(e){return F(e.rootPath,".toolnet","context","handoff.json")}function ie(e){let n=oe(e);if(!P(n))return null;try{let t=D(n,"utf8").trim();if(!t)return null;let r=new Date(0).toISOString(),o=se(e);if(P(o))try{let s=JSON.parse(D(o,"utf8"));typeof s.generatedAt=="string"&&(r=s.generatedAt)}catch{}return{version:1,projectId:e.id,projectName:e.name,text:t,digest:N(t),generatedAt:r}}catch{return null}}function $(e,n=1800){let t=ie(e);if(!t?.text)return null;let r=t.text;return r.length>n&&(r=`${r.slice(0,n)}

[Fast handoff truncated]`),["[TOOLNET FAST HANDOFF]","",`Project: ${e.name}`,`Updated: ${t.generatedAt}`,"",r].join(`
`)}var C="memory_agent_ask";function L(){return`
[TOOLNET MEMORY AGENT]

Tool:
- ${C}

For resume/continue requests:

1. Use the injected ToolNet continuity handoff FIRST.
2. If the handoff is missing or ambiguous, invoke
   ${C} directly BEFORE repository/history exploration.
3. NEVER reconstruct prior work from:
   - .toolnet/runtime/sources/** and legacy .toolnet/sessions/**
   - state.json
   - events.jsonl
   - raw transcripts
4. NEVER search for the implementation/schema of
   ${C}; invoke the MCP tool directly.
5. Inspect git/source only AFTER continuity context is known.

Use:
- mode="local" for current task, last file, blocker or next action.
- mode="ai" for ambiguous or combined continuity questions.

Current repository evidence overrides stale memory.
`.trim()}function ae(e){let n=d.resolve(e),t=d.parse(n).root;for(;n!==t;){let r=d.join(n,".toolnet");if(f.existsSync(r)&&f.statSync(r).isDirectory())return n;n=d.dirname(n)}return null}function z(e){try{return f.existsSync(e)?f.readFileSync(e,"utf-8").trim():null}catch{return null}}function G(e){return e.split(`
`).filter(r=>{let o=r.toUpperCase();return!(o.includes("SECRET")||o.includes("TOKEN")||o.includes("API_KEY")||o.includes("APIKEY")||o.includes("PASSWORD")||o.includes("PASS="))}).join(`
`)}function V(e={}){let n=e.projectPath||process.cwd(),t=ae(n);if(!t)return null;let r=d.join(t,".toolnet","project.json"),o="Unknown";try{if(f.existsSync(r)){let A=JSON.parse(f.readFileSync(r,"utf-8"));o=A.name||A.projectName||"Unknown"}}catch{}let s=d.join(t,".toolnet","profile.md"),i=d.join(t,".toolnet","current.md"),a=z(s)||"",c=z(i)||"";a=G(a),c=G(c);let u=`[TOOLNET PROJECT CONTEXT]

Project: ${o}
Root: ${t}

`,p=T(a,c),l=$({id:"",name:o,rootPath:t},1600),h=l?`

${l}
`:"",g=j(t,{maxAssets:6,maxChars:900}),b=g?`

${g}
`:"",W=`

${L()}

Forbidden At Startup:
- Do not run session:agy-recover, handoff:latest, or brief automatically.
- Do not perform deep recovery merely because an agent starts.
- If the user asks to resume previous work and fast context is insufficient,
  use memory_agent_ask before guessing.
`;return u+p+h+b+W}import{existsSync as Ee}from"node:fs";import{dirname as Me,join as Re,parse as Te,resolve as Oe}from"node:path";import{existsSync as ce,readFileSync as ue}from"node:fs";import{homedir as de}from"node:os";import{join as le}from"node:path";function fe(e){let n=e.trim();return n.length>=2&&n.startsWith('"')&&n.endsWith('"')?(n=n.slice(1,-1),n.replace(/\\n/g,`
`).replace(/\\r/g,"\r").replace(/\\t/g,"	").replace(/\\"/g,'"').replace(/\\\\/g,"\\")):n.length>=2&&n.startsWith("'")&&n.endsWith("'")?n.slice(1,-1):n}function pe(){let e=process.env.TOOLNET_GLOBAL_ENV??le(de(),".config","toolnet-memory",".env");if(!ce(e))return;let n=ue(e,"utf8");for(let t of n.split(/\r?\n/)){let r=t.trim();if(!r||r.startsWith("#"))continue;r.startsWith("export ")&&(r=r.slice(7));let o=r.indexOf("=");if(o<=0)continue;let s=r.slice(0,o).trim();/^[A-Za-z_][A-Za-z0-9_]*$/.test(s)&&process.env[s]===void 0&&(process.env[s]=fe(r.slice(o+1)))}}pe();import{createHash as me}from"node:crypto";import{existsSync as E,mkdirSync as ge,readFileSync as ye,renameSync as he,writeFileSync as Se}from"node:fs";import{basename as xe,dirname as S,join as w,parse as B,resolve as y}from"node:path";var Y=".toolnet",we="project.json";function be(e){return me("sha256").update(e).digest("hex").slice(0,16)}function M(e){return w(e,Y,we)}function Ae(e){return E(M(e))}function ke(e,n){let t=y(e),r=B(t).root;for(;;){if(Ae(t))return t;if(t===r||n&&t===y(n))break;let o=S(t);if(o===t)break;t=o}return null}function ve(e){let n=y(e),t=B(n).root,r=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"];for(;;){if(r.some(s=>E(w(n,s))))return n;if(n===t)break;let o=S(n);if(o===n)break;n=o}return y(e)}function Ce(e){let n;try{n=JSON.parse(ye(e,"utf8"))}catch(o){throw new Error(`Invalid ToolNet project manifest: ${e}: ${o instanceof Error?o.message:String(o)}`)}if(!n||typeof n!="object")throw new Error(`Invalid ToolNet project manifest: ${e}`);let t=n;if(typeof t.id!="string"||!t.id.trim())throw new Error(`ToolNet project manifest is missing id: ${e}`);if(typeof t.name!="string"||!t.name.trim())throw new Error(`ToolNet project manifest is missing name: ${e}`);let r=new Date().toISOString();return{version:1,id:t.id,name:t.name,remote:typeof t.remote=="string"&&t.remote.trim()?t.remote:t.name,rootPath:typeof t.rootPath=="string"?t.rootPath:S(S(e)),createdAt:typeof t.createdAt=="string"?t.createdAt:r,updatedAt:typeof t.updatedAt=="string"?t.updatedAt:r,graphVersion:typeof t.graphVersion=="number"?t.graphVersion:0,memoryVersion:typeof t.memoryVersion=="number"?t.memoryVersion:0,metadata:t.metadata&&typeof t.metadata=="object"?t.metadata:void 0}}function H(e,n){let t=w(e,Y);ge(t,{recursive:!0});let r=M(e),o=`${r}.tmp-${process.pid}`;Se(o,JSON.stringify(n,null,2)+`
`,{encoding:"utf8",mode:384}),he(o,r)}function K(e,n){return{id:e.id,name:e.name,remote:e.remote,rootPath:n,createdAt:e.createdAt,updatedAt:e.updatedAt,graphVersion:e.graphVersion,memoryVersion:e.memoryVersion,metadata:e.metadata}}var x=class{detect(n=process.cwd()){let t=y(n),r=ve(t),s=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(p=>E(w(r,p))),i=ke(t,s?r:void 0);if(i){let p=M(i),l=Ce(p);return l.rootPath!==i&&(l.rootPath=i,l.updatedAt=new Date().toISOString(),H(i,l)),K(l,i)}let a=new Date().toISOString(),c=xe(r),u={version:1,id:be(r),name:c,remote:c,rootPath:r,createdAt:a,updatedAt:a,graphVersion:0,memoryVersion:0};return H(r,u),K(u,r)}};function J(e){let n=Oe(e),t=Te(n).root;for(;;){if(Ee(Re(n,".toolnet","project.json")))return new x().detect(n);if(n===t)break;let r=Me(n);if(r===n)break;n=r}return null}var U=3200;async function _e(){let e="";for await(let n of process.stdin)e+=n.toString();if(!e.trim())return{};try{return JSON.parse(e)}catch{return{}}}function m(){process.stdout.write("{}")}function Ie(e){return e.length<=U?e:`${e.slice(0,U)}

[ToolNet startup context truncated]`}function je(e,n,t){if(process.env.TOOLNET_CODEX_STARTUP_DEBUG!=="1")return;let r=Date.now()-e;process.stderr.write(`[toolnet-memory] codex SessionStart ${r}ms cwd=${n} chars=${t}
`)}async function Ne(){let e=Date.now(),n=await _e();if(n.hook_event_name!=="SessionStart"){m();return}let t=typeof n.cwd=="string"?n.cwd:"";if(!t){m();return}if(!J(t)){m();return}try{let o=V({projectPath:t});if(!o?.trim()){m();return}let s=Ie(o),i={hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:s}};je(e,t,s.length),process.stdout.write(JSON.stringify(i))}catch{m()}}Ne().catch(()=>{m(),process.exitCode=0});
