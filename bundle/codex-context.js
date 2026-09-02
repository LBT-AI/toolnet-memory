import*as f from"fs";import*as d from"path";function M(e){return e?Math.ceil(e.length/3.5):0}function X(e,n){if(!e)return"";if(M(e)<=n)return e;let r=Math.floor(n*3.5),o=e.slice(0,r),s=o.lastIndexOf("."),i=o.lastIndexOf(`
`),c=Math.max(s,i);return c>r*.7?o.slice(0,c+1):o}function k(e,n){if(!e)return"";let t=e.split(`
`).filter(s=>s.trim());if(t.length<=n)return e;let r=t.slice(0,n),o=t.length-n;return[...r,`... (${o} more items omitted)`].join(`
`)}function q(e,n){let{maxTokens:t,trimMarker:r="[Context trimmed by ToolNet Memory token budget]"}=n;if(e.length===0)return"";let o=[...e].sort((a,u)=>u.priority-a.priority),s=[],i=0,c=!1;for(let a of o){let u=`# ${a.title}

`,p=M(u),l=M(a.content),h=p+l;if(i+h<=t)s.push(u+a.content),i+=h;else{let g=t-i-p;if(g>50){let v=X(a.content,g);s.push(u+v),i=t,c=!0}else c=!0;break}}return c&&s.push(`
${r}
`),s.join(`

---

`)}function T(e,n){let t=[{title:"Profile",content:k(e,10),priority:100},{title:"Current Work",content:k(n,15),priority:90}];return q(t,{maxTokens:800})}import{chmodSync as Ve,existsSync as ee,mkdirSync as ze,readFileSync as te,renameSync as He,writeFileSync as Ge}from"node:fs";import{dirname as Be,join as _}from"node:path";var j="toolnet.context-offload.v1";function ne(e){return _(e,".toolnet","offload")}function re(e){return _(ne(e),"graph.json")}function R(){return{schema:j,version:1,updatedAt:new Date(0).toISOString(),nodes:[]}}function oe(e){let n=re(e);if(!ee(n))return R();try{let t=JSON.parse(te(n,"utf8"));return t.schema!==j||t.version!==1||!Array.isArray(t.nodes)?R():t}catch{return R()}}function O(e,n){let t=e.replace(/\s+/gu," ").trim();return t.length<=n?t:t.slice(0,n-1).trimEnd()+"\u2026"}function I(e,n={}){let t=oe(e);if(t.nodes.length===0)return"";let r=Math.max(1,Math.min(12,n.maxAssets??6)),o=Math.max(320,Math.min(2400,n.maxChars??900)),s=["[TOOLNET CONTEXT OFFLOAD GRAPH]","Large tool/file payloads stay outside prompt context.","Read only a needed asset with MCP context_offload_read."];for(let i of t.nodes.slice(-r).reverse()){let c=O(i.sourceRefs.at(-1)??"unknown",72),a=i.files.length>0?` files=${O(i.files.join(","),120)}`:"",u=`event:${c} --offloads--> asset:${i.id.slice(0,12)} kind=${i.kind} bytes=${i.bytes}${a}`;if([...s,u].join(`
`).length>o)break;s.push(u)}return s.join(`
`)}import{existsSync as P,mkdirSync as Qe,readFileSync as D,renameSync as Ze,writeFileSync as Xe}from"node:fs";import{dirname as et,join as F}from"node:path";import{createHash as se}from"node:crypto";function N(e){return se("sha256").update(e).digest("hex")}function ie(e){return F(e.rootPath,".toolnet","context","handoff.md")}function ce(e){return F(e.rootPath,".toolnet","context","handoff.json")}function ae(e){let n=ie(e);if(!P(n))return null;try{let t=D(n,"utf8").trim();if(!t)return null;let r=new Date(0).toISOString(),o=ce(e);if(P(o))try{let s=JSON.parse(D(o,"utf8"));typeof s.generatedAt=="string"&&(r=s.generatedAt)}catch{}return{version:1,projectId:e.id,projectName:e.name,text:t,digest:N(t),generatedAt:r}}catch{return null}}function L(e,n=1800){let t=ae(e);if(!t?.text)return null;let r=t.text;return r.length>n&&(r=`${r.slice(0,n)}

[Fast handoff truncated]`),["[TOOLNET FAST HANDOFF]","",`Project: ${e.name}`,`Updated: ${t.generatedAt}`,"",r].join(`
`)}var A="memory_agent_ask";function $(){return`
[TOOLNET MEMORY AGENT]

Tool:
- ${A}

For resume/continue requests:

1. Use the injected ToolNet continuity handoff FIRST.
2. If the handoff is missing or ambiguous, invoke
   ${A} directly BEFORE repository/history exploration.
3. NEVER reconstruct prior work from:
   - .toolnet/journal/**, .toolnet/runtime/sources/**, and legacy .toolnet/sessions/**
   - state.json
   - events.jsonl
   - raw transcripts
4. NEVER search for the implementation/schema of
   ${A}; invoke the MCP tool directly.
5. Inspect git/source only AFTER continuity context is known.

Use:
- mode="local" for all continuity questions.
- No AI/LLM mode exists.

Current repository evidence overrides stale memory.
`.trim()}function ue(e){let n=d.resolve(e),t=d.parse(n).root;for(;n!==t;){let r=d.join(n,".toolnet");if(f.existsSync(r)&&f.statSync(r).isDirectory())return n;n=d.dirname(n)}return null}function V(e){try{return f.existsSync(e)?f.readFileSync(e,"utf-8").trim():null}catch{return null}}function z(e){return e.split(`
`).filter(r=>{let o=r.toUpperCase();return!(o.includes("SECRET")||o.includes("TOKEN")||o.includes("API_KEY")||o.includes("APIKEY")||o.includes("PASSWORD")||o.includes("PASS="))}).join(`
`)}function H(e={}){let n=e.projectPath||process.cwd(),t=ue(n);if(!t)return null;let r=d.join(t,".toolnet","project.json"),o="Unknown";try{if(f.existsSync(r)){let w=JSON.parse(f.readFileSync(r,"utf-8"));o=w.name||w.projectName||"Unknown"}}catch{}let s=d.join(t,".toolnet","profile.md"),i=d.join(t,".toolnet","current.md"),c=V(s)||"",a=V(i)||"";c=z(c),a=z(a);let u=`[TOOLNET PROJECT CONTEXT]

Project: ${o}
Root: ${t}

`,p=T(c,a),l=L({id:"",name:o,rootPath:t},1600),h=l?`

${l}
`:"",g=I(t,{maxAssets:6,maxChars:900}),v=g?`

${g}
`:"",Z=`

${$()}

Forbidden At Startup:
- Do not run session:agy-recover, handoff:latest, or brief automatically.
- Do not perform deep recovery merely because an agent starts.
- If the user asks to resume previous work and fast context is insufficient,
  use memory_agent_ask before guessing.
`;return u+p+h+v+Z}import{spawn as de}from"node:child_process";function G(e){return(e??"").trim()}function K(e,n={}){let t=G(e);if(!t)return!1;let r=G(n.binary??process.env.TOOLNET_MEMORY_BIN)||"toolnet-memory";try{let o=de(r,["background:refresh","--project",t,"--quiet"],{detached:!0,stdio:"ignore",env:process.env});return o.on("error",()=>{}),o.unref(),!0}catch{return!1}}import{existsSync as Te}from"node:fs";import{dirname as Oe,join as _e,parse as je,resolve as Ie}from"node:path";import{existsSync as le,readFileSync as fe}from"node:fs";import{homedir as pe}from"node:os";import{join as me}from"node:path";function ge(e){let n=e.trim();return n.length>=2&&n.startsWith('"')&&n.endsWith('"')?(n=n.slice(1,-1),n.replace(/\\n/g,`
`).replace(/\\r/g,"\r").replace(/\\t/g,"	").replace(/\\"/g,'"').replace(/\\\\/g,"\\")):n.length>=2&&n.startsWith("'")&&n.endsWith("'")?n.slice(1,-1):n}function ye(){let e=process.env.TOOLNET_GLOBAL_ENV??me(pe(),".config","toolnet-memory",".env");if(!le(e))return;let n=fe(e,"utf8");for(let t of n.split(/\r?\n/)){let r=t.trim();if(!r||r.startsWith("#"))continue;r.startsWith("export ")&&(r=r.slice(7));let o=r.indexOf("=");if(o<=0)continue;let s=r.slice(0,o).trim();/^[A-Za-z_][A-Za-z0-9_]*$/.test(s)&&process.env[s]===void 0&&(process.env[s]=ge(r.slice(o+1)))}}ye();import{createHash as he}from"node:crypto";import{existsSync as E,mkdirSync as Se,readFileSync as xe,renameSync as be,writeFileSync as ve}from"node:fs";import{basename as we,dirname as S,join as b,parse as W,resolve as y}from"node:path";var U=".toolnet",Me="project.json";function Re(e){return he("sha256").update(e).digest("hex").slice(0,16)}function C(e){return b(e,U,Me)}function Ae(e){return E(C(e))}function Ee(e,n){let t=y(e),r=W(t).root;for(;;){if(Ae(t))return t;if(t===r||n&&t===y(n))break;let o=S(t);if(o===t)break;t=o}return null}function Ce(e){let n=y(e),t=W(n).root,r=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"];for(;;){if(r.some(s=>E(b(n,s))))return n;if(n===t)break;let o=S(n);if(o===n)break;n=o}return y(e)}function ke(e){let n;try{n=JSON.parse(xe(e,"utf8"))}catch(o){throw new Error(`Invalid ToolNet project manifest: ${e}: ${o instanceof Error?o.message:String(o)}`)}if(!n||typeof n!="object")throw new Error(`Invalid ToolNet project manifest: ${e}`);let t=n;if(typeof t.id!="string"||!t.id.trim())throw new Error(`ToolNet project manifest is missing id: ${e}`);if(typeof t.name!="string"||!t.name.trim())throw new Error(`ToolNet project manifest is missing name: ${e}`);let r=new Date().toISOString();return{version:1,id:t.id,name:t.name,remote:typeof t.remote=="string"&&t.remote.trim()?t.remote:t.name,rootPath:typeof t.rootPath=="string"?t.rootPath:S(S(e)),createdAt:typeof t.createdAt=="string"?t.createdAt:r,updatedAt:typeof t.updatedAt=="string"?t.updatedAt:r,graphVersion:typeof t.graphVersion=="number"?t.graphVersion:0,memoryVersion:typeof t.memoryVersion=="number"?t.memoryVersion:0,metadata:t.metadata&&typeof t.metadata=="object"?t.metadata:void 0}}function B(e,n){let t=b(e,U);Se(t,{recursive:!0});let r=C(e),o=`${r}.tmp-${process.pid}`;ve(o,JSON.stringify(n,null,2)+`
`,{encoding:"utf8",mode:384}),be(o,r)}function Y(e,n){return{id:e.id,name:e.name,remote:e.remote,rootPath:n,createdAt:e.createdAt,updatedAt:e.updatedAt,graphVersion:e.graphVersion,memoryVersion:e.memoryVersion,metadata:e.metadata}}var x=class{detect(n=process.cwd()){let t=y(n),r=Ce(t),s=[".git","package.json","pyproject.toml","Cargo.toml","go.mod","composer.json"].some(p=>E(b(r,p))),i=Ee(t,s?r:void 0);if(i){let p=C(i),l=ke(p);return l.rootPath!==i&&(l.rootPath=i,l.updatedAt=new Date().toISOString(),B(i,l)),Y(l,i)}let c=new Date().toISOString(),a=we(r),u={version:1,id:Re(r),name:a,remote:a,rootPath:r,createdAt:c,updatedAt:c,graphVersion:0,memoryVersion:0};return B(r,u),Y(u,r)}};function J(e){let n=Ie(e),t=je(n).root;for(;;){if(Te(_e(n,".toolnet","project.json")))return new x().detect(n);if(n===t)break;let r=Oe(n);if(r===n)break;n=r}return null}var Q=3200;async function Ne(){let e="";for await(let n of process.stdin)e+=n.toString();if(!e.trim())return{};try{return JSON.parse(e)}catch{return{}}}function m(){process.stdout.write("{}")}function Pe(e){return e.length<=Q?e:`${e.slice(0,Q)}

[ToolNet startup context truncated]`}function De(e,n,t){if(process.env.TOOLNET_CODEX_STARTUP_DEBUG!=="1")return;let r=Date.now()-e;process.stderr.write(`[toolnet-memory] codex SessionStart ${r}ms cwd=${n} chars=${t}
`)}async function Fe(){let e=Date.now(),n=await Ne();if(n.hook_event_name!=="SessionStart"){m();return}let t=typeof n.cwd=="string"?n.cwd:"";if(!t){m();return}let r=J(t);if(!r){m();return}K(r.rootPath);try{let o=H({projectPath:t});if(!o?.trim()){m();return}let s=Pe(o),i={hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:s}};De(e,t,s.length),process.stdout.write(JSON.stringify(i))}catch{m()}}Fe().catch(()=>{m(),process.exitCode=0});
