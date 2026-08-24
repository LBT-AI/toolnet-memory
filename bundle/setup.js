import A from"node:fs";import Oe from"node:os";import v from"node:path";import Un from"node:readline/promises";import{stdin as T,stdout as Y}from"node:process";import{HeadBucketCommand as Fn,S3Client as Bn}from"@aws-sdk/client-s3";var Ie=[{id:"openai-compatible",label:"OpenAI-compatible",requiresApiKey:!0,requiresBaseUrl:!0,transport:"openai-compatible"},{id:"alibaba",label:"Alibaba / DashScope",requiresApiKey:!0,requiresBaseUrl:!0,transport:"openai-compatible"},{id:"openrouter",label:"OpenRouter",defaultBaseUrl:"https://openrouter.ai/api/v1",requiresApiKey:!0,transport:"openai-compatible"},{id:"groq",label:"Groq",defaultBaseUrl:"https://api.groq.com/openai/v1",requiresApiKey:!0,transport:"openai-compatible"},{id:"deepseek",label:"DeepSeek",defaultBaseUrl:"https://api.deepseek.com",defaultModel:"deepseek-v4-flash",requiresApiKey:!0,transport:"openai-compatible"},{id:"nvidia",label:"NVIDIA NIM",defaultBaseUrl:"https://integrate.api.nvidia.com/v1",defaultModel:"deepseek-ai/deepseek-v4-pro",requiresApiKey:!0,transport:"openai-compatible"},{id:"gemini",label:"Gemini",defaultBaseUrl:"https://generativelanguage.googleapis.com/v1beta",requiresApiKey:!0,transport:"gemini"},{id:"huggingface",label:"Hugging Face",defaultBaseUrl:"https://router.huggingface.co/v1",requiresApiKey:!0,transport:"openai-compatible"},{id:"ollama",label:"Ollama / Local",defaultBaseUrl:"http://127.0.0.1:11434/v1",requiresApiKey:!1,transport:"openai-compatible"},{id:"custom",label:"Custom endpoint",requiresApiKey:!1,requiresBaseUrl:!0,transport:"openai-compatible"},{id:"cloudflare",label:"Cloudflare Workers AI",requiresApiKey:!0,requiresAccountId:!0,transport:"cloudflare"}];function S(e){let o=Ie.find(t=>t.id===e);if(!o)throw new Error(`Unsupported AI provider: ${e}`);return o}function H(e){return Ie.some(o=>o.id===e)}function l(e){return process.env[e]?.trim()||void 0}function E(...e){return e.find(o=>!!o?.trim())}function Ce(){if(l("GROQ_API_KEY"))return"groq";if(l("DEEPSEEK_API_KEY"))return"deepseek";if(l("NVIDIA_API_KEY")||l("NVIDIA_NIM_API_KEY"))return"nvidia";if(l("OPENROUTER_API_KEY"))return"openrouter";if(l("ALIBABA_API_KEY")||l("DASHSCOPE_API_KEY"))return"alibaba";if(l("GEMINI_API_KEY")||l("GOOGLE_API_KEY"))return"gemini";if(l("CLOUDFLARE_API_TOKEN")&&l("CLOUDFLARE_ACCOUNT_ID"))return"cloudflare";if(l("HF_TOKEN"))return"huggingface";if(l("OLLAMA_MODEL")||l("OLLAMA_BASE_URL"))return"ollama"}function Ne(){let e=l("TOOLNET_LLM_PROVIDER");return e&&H(e)?e:Ce()??"openai-compatible"}function G(e){let o=S(e);switch(e){case"alibaba":return{provider:e,apiKey:E(l("ALIBABA_API_KEY"),l("DASHSCOPE_API_KEY")),baseUrl:E(l("ALIBABA_BASE_URL"),l("DASHSCOPE_BASE_URL"),o.defaultBaseUrl),model:E(l("ALIBABA_MODEL"),l("DASHSCOPE_MODEL"))};case"openrouter":return{provider:e,apiKey:l("OPENROUTER_API_KEY"),baseUrl:E(l("OPENROUTER_BASE_URL"),o.defaultBaseUrl),model:l("OPENROUTER_MODEL")};case"groq":return{provider:e,apiKey:l("GROQ_API_KEY"),baseUrl:E(l("GROQ_BASE_URL"),o.defaultBaseUrl),model:l("GROQ_MODEL")};case"deepseek":return{provider:e,apiKey:l("DEEPSEEK_API_KEY"),baseUrl:E(l("DEEPSEEK_BASE_URL"),o.defaultBaseUrl),model:E(l("DEEPSEEK_MODEL"),o.defaultModel)};case"nvidia":return{provider:e,apiKey:E(l("NVIDIA_API_KEY"),l("NVIDIA_NIM_API_KEY")),baseUrl:E(l("NVIDIA_BASE_URL"),l("NVIDIA_NIM_BASE_URL"),o.defaultBaseUrl),model:E(l("NVIDIA_MODEL"),l("NVIDIA_NIM_MODEL"),o.defaultModel)};case"gemini":return{provider:e,apiKey:E(l("GEMINI_API_KEY"),l("GOOGLE_API_KEY")),baseUrl:E(l("GEMINI_BASE_URL"),o.defaultBaseUrl),model:l("GEMINI_MODEL")};case"huggingface":return{provider:e,apiKey:l("HF_TOKEN"),baseUrl:E(l("HF_INFERENCE_BASE_URL"),o.defaultBaseUrl),model:E(l("HF_LLM_MODEL"),l("HF_MODEL"))};case"ollama":return{provider:e,apiKey:l("OLLAMA_API_KEY"),baseUrl:E(l("OLLAMA_BASE_URL"),o.defaultBaseUrl),model:l("OLLAMA_MODEL")};case"cloudflare":return{provider:e,accountId:l("CLOUDFLARE_ACCOUNT_ID"),apiKey:l("CLOUDFLARE_API_TOKEN"),baseUrl:l("CLOUDFLARE_AI_BASE_URL"),model:l("CLOUDFLARE_MODEL")};case"custom":return{provider:e,apiKey:l("CUSTOM_AI_API_KEY"),baseUrl:l("CUSTOM_AI_BASE_URL"),model:l("CUSTOM_AI_MODEL")};default:return{provider:"openai-compatible",apiKey:E(l("OPENAI_API_KEY"),l("MODEL_API_KEY")),baseUrl:E(l("OPENAI_BASE_URL"),l("MODEL_BASE_URL")),model:E(l("OPENAI_MODEL"),l("MODEL_NAME"))}}}function Go(){let e=l("TOOLNET_LLM_PROVIDER"),o=e&&H(e)?e:Ne(),t=S(o),n=G(o);return{provider:o,apiKey:E(l("TOOLNET_LLM_API_KEY"),n.apiKey),baseUrl:E(l("TOOLNET_LLM_BASE_URL"),n.baseUrl,t.defaultBaseUrl),model:E(l("TOOLNET_LLM_MODEL"),n.model,t.defaultModel),accountId:E(l("TOOLNET_LLM_ACCOUNT_ID"),n.accountId)}}function qo(){let e=l("TOOLNET_EMBEDDING_PROVIDER");return e==="local"?"local":e&&H(e)?e:l("HF_TOKEN")||l("HF_EMBEDDING_MODEL")?"huggingface":"local"}function Jo(){let e=qo();if(e==="local")return{provider:"local",model:E(l("TOOLNET_EMBEDDING_MODEL"),l("LOCAL_EMBEDDING_MODEL"))};let o=S(e),t,n,r,s;switch(e){case"huggingface":t=l("HF_TOKEN"),n=l("HF_INFERENCE_BASE_URL"),r=l("HF_EMBEDDING_MODEL");break;case"openai-compatible":t=l("OPENAI_API_KEY"),n=l("OPENAI_BASE_URL"),r=l("OPENAI_EMBEDDING_MODEL");break;case"cloudflare":t=l("CLOUDFLARE_API_TOKEN"),n=l("CLOUDFLARE_AI_BASE_URL"),r=l("CLOUDFLARE_EMBEDDING_MODEL"),s=l("CLOUDFLARE_ACCOUNT_ID");break;default:t=G(e).apiKey,n=G(e).baseUrl,r=l(`${e.toUpperCase().replace(/-/g,"_")}_EMBEDDING_MODEL`)}let i=E(l("TOOLNET_EMBEDDING_ACCOUNT_ID"),s),c=E(l("TOOLNET_EMBEDDING_BASE_URL"),n,o.defaultBaseUrl),a=e==="cloudflare"&&!c&&i?`https://api.cloudflare.com/client/v4/accounts/${i}/ai/v1`:c;return{provider:e,apiKey:E(l("TOOLNET_EMBEDDING_API_KEY"),t),baseUrl:a,model:E(l("TOOLNET_EMBEDDING_MODEL"),r),accountId:i}}function Vo(){let e=Go(),o=Jo();return{llm:e,embedding:o,legacy:{llm:!l("TOOLNET_LLM_PROVIDER")&&!!Ce(),embedding:!l("TOOLNET_EMBEDDING_PROVIDER")&&!!(l("HF_TOKEN")||l("HF_EMBEDDING_MODEL"))}}}function Se(e=Ne()){let o=Vo().llm;if(e===o.provider)return{id:e,apiKey:o.apiKey,baseUrl:o.baseUrl,model:o.model,accountId:o.accountId};let t=G(e);return{id:e,apiKey:t.apiKey,baseUrl:t.baseUrl,model:t.model,accountId:t.accountId}}var ie=class extends Error{status;constructor(o,t){super(o),this.name="AiHttpError",this.status=t}};async function h(e,o,t=3e4){let n=new AbortController,r=setTimeout(()=>n.abort(),t);r.unref?.();try{let s=await fetch(e,{...o,signal:n.signal}),i=await s.text();if(!s.ok){let c=i;try{let a=JSON.parse(i);c=a.error?.message??a.message??i}catch{}throw new ie(c||`HTTP ${s.status}`,s.status)}return i.trim()?JSON.parse(i):{}}finally{clearTimeout(r)}}function q(e,o){return`${e.replace(/\/+$/,"")}/${o.replace(/^\/+/,"")}`}var J=class{constructor(o){this.config=o}config;id="cloudflare";model(){let o=this.config.model?.trim();if(!o)throw new Error("cloudflare: MODEL is not configured");return o}async generate(o){let t=this.config.accountId?.trim(),n=this.config.apiKey?.trim();if(!t)throw new Error("cloudflare: ACCOUNT ID is not configured");if(!n)throw new Error("cloudflare: API TOKEN is not configured");let r=this.model(),i=`${(this.config.baseUrl?.trim()||`https://api.cloudflare.com/client/v4/accounts/${t}/ai/run`).replace(/\/+$/,"")}/${r}`,c=await h(i,{method:"POST",headers:{authorization:`Bearer ${n}`,"content-type":"application/json",...this.config.headers},body:JSON.stringify({messages:o.messages,temperature:o.temperature,max_tokens:o.maxTokens})}),a=c.result?.response?.trim();if(!a)throw new Error(c.errors?.[0]?.message??"cloudflare: empty model response");return{text:a,provider:"cloudflare",model:r}}async healthCheck(){let o=Date.now();try{return{ok:!0,provider:"cloudflare",model:(await this.generate({messages:[{role:"user",content:"Reply exactly: OK"}],temperature:0,maxTokens:8})).model,message:"Provider reachable",latencyMs:Date.now()-o}}catch(t){return{ok:!1,provider:"cloudflare",model:this.config.model,message:t instanceof Error?t.message:String(t),latencyMs:Date.now()-o}}}};var V=class{constructor(o){this.config=o}config;id="gemini";model(){let o=this.config.model?.trim();if(!o)throw new Error("gemini: MODEL is not configured");return o.replace(/^models\//,"")}async generate(o){let t=this.config.apiKey?.trim();if(!t)throw new Error("gemini: API KEY is not configured");let n=this.config.baseUrl?.trim()||"https://generativelanguage.googleapis.com/v1beta",r=this.model(),s=o.messages.filter(d=>d.role==="system"),i=o.messages.filter(d=>d.role!=="system").map(d=>({role:d.role==="assistant"?"model":"user",parts:[{text:d.content}]})),c=`${q(n,`models/${encodeURIComponent(r)}:generateContent`)}?key=${encodeURIComponent(t)}`,a=await h(c,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...s.length?{systemInstruction:{parts:[{text:s.map(d=>d.content).join(`

`)}]}}:{},contents:i,generationConfig:{temperature:o.temperature,maxOutputTokens:o.maxTokens}})}),g=a.candidates?.[0]?.content?.parts?.map(d=>d.text??"").join("").trim();if(!g)throw new Error("gemini: empty model response");return{text:g,provider:"gemini",model:r,usage:a.usageMetadata?{inputTokens:a.usageMetadata.promptTokenCount,outputTokens:a.usageMetadata.candidatesTokenCount,totalTokens:a.usageMetadata.totalTokenCount}:void 0}}async healthCheck(){let o=Date.now();try{return{ok:!0,provider:"gemini",model:(await this.generate({messages:[{role:"user",content:"Reply exactly: OK"}],temperature:0,maxTokens:8})).model,message:"Provider reachable",latencyMs:Date.now()-o}}catch(t){return{ok:!1,provider:"gemini",model:this.config.model,message:t instanceof Error?t.message:String(t),latencyMs:Date.now()-o}}}};var W=class{constructor(o){this.config=o;this.id=o.id}config;id;baseUrl(){let o=this.config.baseUrl?.trim();if(!o)throw new Error(`${this.id}: BASE URL is not configured`);return o}model(){let o=this.config.model?.trim();if(!o)throw new Error(`${this.id}: MODEL is not configured`);return o}headers(){let o={"content-type":"application/json",...this.config.headers};return this.config.apiKey&&(o.authorization=`Bearer ${this.config.apiKey}`),o}async generate(o){let t=this.model(),n=await h(q(this.baseUrl(),"chat/completions"),{method:"POST",headers:this.headers(),body:JSON.stringify({model:t,messages:o.messages,temperature:o.temperature,max_tokens:o.maxTokens,...this.id==="alibaba"?{enable_thinking:!1}:{}})}),r=n.choices?.[0]?.message?.content?.trim();if(!r)throw new Error(`${this.id}: empty model response`);return{text:r,provider:this.id,model:t,usage:n.usage?{inputTokens:n.usage.prompt_tokens,outputTokens:n.usage.completion_tokens,totalTokens:n.usage.total_tokens}:void 0}}async healthCheck(){let o=Date.now();try{let t=await this.generate({messages:[{role:"user",content:"Reply exactly: OK"}],temperature:0,maxTokens:8});return{ok:!0,provider:this.id,model:t.model,message:"Provider reachable",latencyMs:Date.now()-o}}catch(t){return{ok:!1,provider:this.id,model:this.config.model,message:t instanceof Error?t.message:String(t),latencyMs:Date.now()-o}}}};function he(e=Se()){switch(S(e.id).transport){case"gemini":return new V(e);case"cloudflare":return new J(e);default:return new W(e)}}import{existsSync as et}from"node:fs";import{homedir as ot}from"node:os";import{join as tt}from"node:path";import{spawnSync as nt}from"node:child_process";import{homedir as Wo}from"node:os";import{join as R}from"node:path";function Re(e={}){return R(e.home??Wo(),".gemini")}function se(e={}){return R(Re(e),"config")}function X(e={}){return R(se(e),"mcp_config.json")}function z(e={}){return R(se(e),"hooks.json")}function De(e={}){return R(Re(e),"antigravity-cli")}function be(e="toolnet-memory",o={}){return R(De(o),"plugins",e)}function Pe(e={}){return[De(e),se(e)]}import{homedir as Xo}from"node:os";import{join as w}from"node:path";function M(e={}){let o=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return o?w(o,"opencode"):w(e.home??Xo(),".config","opencode")}function we(e={}){return w(M(e),"opencode.json")}function ke(e={}){return w(M(e),"plugins")}function Ke(e={}){return w(M(e),"AGENTS.md")}import{homedir as Ue}from"node:os";import{join as ce}from"node:path";function ae(e={}){return ce(e.home??Ue(),".claude")}function Fe(e={}){return ce(ae(e),"settings.json")}function Be(e={}){return ce(e.home??Ue(),".claude.json")}import{homedir as zo}from"node:os";import{join as k}from"node:path";function le(e={}){return e.kiroHome??process.env.KIRO_HOME??k(e.home??zo(),".kiro")}function Qo(e={}){return k(le(e),"settings")}function xe(e={}){return k(Qo(e),"mcp.json")}function Zo(e={}){return k(le(e),"hooks")}function $e(e={}){return k(Zo(e),"toolnet-memory.json")}function Ye(e={}){return[le(e)]}function rt(e){return nt("sh",["-lc",`command -v ${JSON.stringify(e)} >/dev/null 2>&1`],{stdio:"ignore"}).status===0}function K(e){let o=e.commandExists(e.command),t=e.configPaths.filter(s=>et(s)),n=t.length>0,r=[];o&&r.push(`command:${e.command}`);for(let s of t)r.push(`config:${s}`);return{agent:e.agent,detected:o||n,commandDetected:o,configDetected:n,evidence:r}}function ve(e={}){let o=e.home??ot(),t=e.commandExists??rt,n=e.codexHome??process.env.CODEX_HOME??tt(o,".codex");return[K({agent:"agy",command:"agy",commandExists:t,configPaths:Pe({home:o})}),K({agent:"opencode",command:"opencode",commandExists:t,configPaths:[M({home:o,xdgConfigHome:e.xdgConfigHome})]}),K({agent:"claude",command:"claude",commandExists:t,configPaths:[ae({home:o})]}),K({agent:"kiro",command:"kiro-cli",commandExists:t,configPaths:Ye({home:o,kiroHome:e.kiroHome})}),K({agent:"codex",command:"codex",commandExists:t,configPaths:[n]})]}import{existsSync as Z,mkdirSync as Ve,readFileSync as We,renameSync as Tt,writeFileSync as At}from"node:fs";import{dirname as yt,join as Q}from"node:path";import{existsSync as it,mkdirSync as st,readFileSync as ct,renameSync as at,rmSync as lt,writeFileSync as gt}from"node:fs";import{dirname as dt}from"node:path";function ut(e){return`'${e.replace(/'/g,"'\\''")}'`}function je(e={}){let o=e.hooksFile??z();st(dt(o),{recursive:!0,mode:448});let t={};if(it(o)){let i;try{i=JSON.parse(ct(o,"utf8"))}catch(c){throw new Error(`Invalid existing Agy hooks.json: ${c instanceof Error?c.message:String(c)}`)}if(typeof i!="object"||i===null||Array.isArray(i))throw new Error("Invalid existing Agy hooks.json: root must be a JSON object.");t=i}let n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=`${ut(n)} session:agy-hook`;t["toolnet-memory"]={enabled:!0,PreToolUse:[{matcher:"view_file|list_dir|find_by_name|grep_search|run_command",hooks:[{type:"command",command:`${r} pre-tool`,timeout:5}]}],PreInvocation:[{type:"command",command:`${r} pre`,timeout:15}],PostInvocation:[{type:"command",command:`${r} post`,timeout:15}],Stop:[{type:"command",command:`${r} stop`,timeout:30}]};let s=`${o}.tmp-${process.pid}-${Date.now()}`;try{gt(s,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),at(s,o)}finally{lt(s,{force:!0})}return o}import{existsSync as mt,mkdirSync as ft,readFileSync as Et,renameSync as _t,writeFileSync as pt}from"node:fs";import{dirname as Ot}from"node:path";function U(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Lt(e,o){ft(Ot(e),{recursive:!0,mode:448});let t=`${e}.tmp-${process.pid}-${Date.now()}`;pt(t,`${JSON.stringify(o,null,2)}
`,{encoding:"utf8",mode:384}),_t(t,e)}function He(e){if(!mt(e))return{};let o=Et(e,"utf8").trim();if(!o)return{};let t;try{t=JSON.parse(o)}catch(n){throw new Error(`Invalid existing Agy MCP config: ${n instanceof Error?n.message:String(n)}`)}if(!U(t))throw new Error("Invalid existing Agy MCP config: root must be a JSON object.");return t}function Ge(e,o){return U(e)?e.command===o&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function qe(e={}){let o=e.configFile??X(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=He(o),s=r.mcpServers;if(s!==void 0&&!U(s))throw new Error("Invalid existing Agy MCP config: mcpServers must be an object.");let i=U(s)?{...s}:{},c=i[n];if(Ge(c,t))return{installed:!0,changed:!1,configFile:o,serverName:n,command:t,args:["mcp"]};i[n]={command:t,args:["mcp"]};let a={...r,mcpServers:i};Lt(o,a);let d=He(o).mcpServers;if(!U(d)||!Ge(d[n],t))throw new Error("Agy MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:o,serverName:n,command:t,args:["mcp"]}}var Mt=`# ToolNet Memory Continuity

ToolNet Memory is the authoritative continuity layer for previous project work.

## Resume / continue behavior

Whenever the user asks to continue, resume, finish, pick up, return to, or complete previous work:

1. FIRST call the ToolNet Memory MCP tool \`memory_agent_ask\`.
2. Use ToolNet's compact continuity result to determine:
   - current task
   - completed work
   - current or last file
   - TODOs
   - blockers
   - next action
3. Only AFTER continuity is known may you inspect current source or git to verify repository truth.

## Forbidden continuity recovery

Do NOT reconstruct previous work by reading, listing, searching, or shelling into:

- \`.toolnet/sessions/**\`
- \`state.json\`
- \`events.jsonl\`
- raw transcripts
- \`~/.gemini/antigravity-cli/brain/**\`
- Antigravity \`transcript.jsonl\`
- another coding agent's internal session history

Do NOT run Bash/cat/tail/grep against those locations to discover previous work.

Do NOT search the filesystem for the implementation or schema of \`memory_agent_ask\`.
Invoke the MCP tool directly.

For direct continuity facts, prefer \`mode="local"\`.
Use \`mode="ai"\` only when continuity is ambiguous or requires synthesis.

Current repository evidence overrides stale memory after ToolNet has restored the working context.

Do not ask the user to repeat context already available through ToolNet Memory.
`;function Xe(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function ge(e,o){Ve(yt(e),{recursive:!0});let t=`${e}.tmp-${process.pid}-${Date.now()}`;At(t,o,{encoding:"utf8",mode:384}),Tt(t,e)}function Je(e,o){Z(e)&&We(e,"utf8")===o||ge(e,o)}function ze(e){if(!Z(e))return{};let o=We(e,"utf8").trim();if(!o)return{};let t;try{t=JSON.parse(o)}catch(n){throw new Error(`Invalid legacy Antigravity config ${e}: ${n instanceof Error?n.message:String(n)}`)}if(!Xe(t))throw new Error(`Invalid legacy Antigravity config ${e}: root must be object`);return t}function It(e,o){if(!Z(e))return!1;let t=ze(e);if(!Xe(t.mcpServers)||!Object.prototype.hasOwnProperty.call(t.mcpServers,o))return!1;let n={...t.mcpServers};return delete n[o],ge(e,`${JSON.stringify({...t,mcpServers:n},null,2)}
`),!0}function Ct(e){if(!Z(e))return!1;let o=ze(e);if(!Object.prototype.hasOwnProperty.call(o,"toolnet-memory"))return!1;let t={...o};return delete t["toolnet-memory"],ge(e,`${JSON.stringify(t,null,2)}
`),!0}function Qe(e={}){let o=e.pluginName??"toolnet-memory",t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.pluginRoot??be(o),r=Q(n,"plugin.json"),s=Q(n,"mcp_config.json"),i=Q(n,"hooks.json"),c=Q(n,"rules","toolnet-memory-continuity.md");Ve(n,{recursive:!0,mode:448}),Je(r,`${JSON.stringify({$schema:"https://antigravity.google/schemas/v1/plugin.json",name:o,description:"Persistent project continuity and memory for Antigravity coding sessions."},null,2)}
`),qe({configFile:s,binary:t,serverName:"toolnet-memory"}),je({hooksFile:i,binary:t}),Je(c,`${Mt.trim()}
`);let a=e.legacyMcpFile??X(),g=e.legacyHooksFile??z(),d=[];return a!==s&&It(a,"toolnet-memory")&&d.push(a),g!==i&&Ct(g)&&d.push(g),{installed:!0,pluginRoot:n,files:[r,s,i,c],migratedLegacy:d}}import{existsSync as St,mkdirSync as oo,readFileSync as ht,writeFileSync as to}from"node:fs";import{join as Rt}from"node:path";var Nt="memory_agent_ask";function Ze(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${Nt}

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
`.trim()}var eo="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",de="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function Dt(){let e=Ke();oo(M(),{recursive:!0});let o=`${eo}
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


${Ze()}

${de}`,t=St(e)?ht(e,"utf8"):"",n=t.indexOf(eo),r=t.indexOf(de);return n>=0&&r>=n?t=t.slice(0,n)+o+t.slice(r+de.length):(t=t.trimEnd(),t&&(t+=`

`),t+=o),to(e,t.trimEnd()+`
`,{encoding:"utf8",mode:384}),e}function no(e={}){let o=e.directory??ke();oo(o,{recursive:!0}),Dt();let t=Rt(o,"toolnet-memory.js"),n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=`
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
  ${JSON.stringify(n)}

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
`;return to(t,r.trimStart(),{encoding:"utf8",mode:384}),t}import{existsSync as so,mkdirSync as bt,readFileSync as Pt,renameSync as wt,writeFileSync as kt}from"node:fs";import{dirname as co,join as Kt}from"node:path";function D(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Ut(e,o){bt(co(e),{recursive:!0});let t=`${e}.tmp-${process.pid}-${Date.now()}`;kt(t,`${JSON.stringify(o,null,2)}
`,{encoding:"utf8",mode:384}),wt(t,e)}function ro(e){if(!so(e))return{};let o=Pt(e,"utf8").trim();if(!o)return{};let t;try{t=JSON.parse(o)}catch(n){throw new Error(`Invalid existing OpenCode opencode.json: ${n instanceof Error?n.message:String(n)}`)}if(!D(t))throw new Error("Invalid existing OpenCode opencode.json: root must be a JSON object.");return t}function io(e,o){if(!D(e))return!1;let t=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(t)&&t.length===2&&t[0]===o&&t[1]==="mcp"}function Ft(e,o){let t=e.mcpServers;if(!D(t)||!Object.prototype.hasOwnProperty.call(t,o))return{root:e,changed:!1};let n={...t};return delete n[o],{root:{...e,mcpServers:n},changed:!0}}function ao(e={}){let o=e.configFile??we(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=Kt(co(o),"opencode.jsonc"),s=so(r)?r:void 0,i=ro(o),c=Ft(i,n),a=c.root,g=a.mcp;if(g!==void 0&&!D(g))throw new Error("Invalid existing OpenCode config: mcp must be an object.");let d=D(g)?{...g}:{},_=d[n];if(io(_,t)&&!c.changed)return{installed:!0,changed:!1,configFile:o,serverName:n,command:[t,"mcp"],preservedJsonc:s};d[n]={type:"local",command:[t,"mcp"],enabled:!0};let m={...a,mcp:d};Ut(o,m);let re=ro(o);if(!D(re.mcp)||!io(re.mcp[n],t))throw new Error("OpenCode MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:o,serverName:n,command:[t,"mcp"],preservedJsonc:s}}import{existsSync as Bt,mkdirSync as lo,readFileSync as xt,writeFileSync as go}from"node:fs";import{homedir as uo}from"node:os";import{dirname as mo,join as ue}from"node:path";function $t(e){let o=[],t=/"((?:\\.|[^"\\])*)"|'([^']*)'/g,n;for(;n=t.exec(e);){let r=n[1]??n[2]??"";try{o.push(n[1]!==void 0?JSON.parse(`"${r}"`):r)}catch{o.push(r)}}return o}function fo(e={}){let o=e.configFile??ue(process.env.CODEX_HOME??ue(uo(),".codex"),"config.toml"),t=e.previousFile??ue(uo(),".config","toolnet-memory","codex-notify-previous.json");lo(mo(o),{recursive:!0}),lo(mo(t),{recursive:!0});let n=Bt(o)?xt(o,"utf8"):"",r=e.binary??"toolnet-memory",s=`notify = [${JSON.stringify(r)}, "session:codex-notify"]`,i=n.split(`
`),c=i.findIndex(m=>/^\s*\[/.test(m));c<0&&(c=i.length);let a=-1,g=-1;for(let m=0;m<c;m+=1)if(/^\s*notify\s*=/.test(i[m])){if(a=m,g=m,i[m].includes("[")&&!i[m].includes("]"))for(;g+1<c&&(g+=1,!i[g].includes("]")););break}let d=[];if(a>=0){let m=i.slice(a,g+1).join(`
`);d=$t(m),i.splice(a,g-a+1,s)}else c=i.findIndex(m=>/^\s*\[/.test(m)),c<0&&(c=i.length),i.splice(c,0,s);let _=d.length>=2&&d[d.length-1]==="session:codex-notify";return d.length>0&&!_&&go(t,JSON.stringify(d,null,2)+`
`,{encoding:"utf8",mode:384}),n=i.join(`
`),n.endsWith(`
`)||(n+=`
`),go(o,n,{encoding:"utf8",mode:384}),{configFile:o,previousFile:t,preservedPrevious:d.length>0&&!_}}import{existsSync as Yt,mkdirSync as vt,readFileSync as jt,writeFileSync as Ht}from"node:fs";import{homedir as Gt}from"node:os";import{dirname as qt,join as Eo}from"node:path";function Jt(e){return`'${e.replace(/'/g,"'\\''")}'`}function _o(e={}){let o=e.hooksFile??Eo(process.env.CODEX_HOME??Eo(Gt(),".codex"),"hooks.json");vt(qt(o),{recursive:!0});let t={};if(Yt(o))try{t=JSON.parse(jt(o,"utf8"))}catch(c){throw new Error(`Invalid existing Codex hooks.json: ${c instanceof Error?c.message:String(c)}`)}let n=t.hooks&&typeof t.hooks=="object"&&!Array.isArray(t.hooks)?t.hooks:{};t.hooks=n;let s=(Array.isArray(n.SessionStart)?n.SessionStart:[]).filter(c=>{try{return!JSON.stringify(c).includes("session:codex-context")}catch{return!0}}),i=e.binary??"toolnet-memory";return s.push({matcher:"startup|resume|clear|compact",hooks:[{type:"command",command:`${Jt(i)} session:codex-context`,timeout:15,additionalContextLimit:1e3,statusMessage:"Loading ToolNet project continuity"}]}),n.SessionStart=s,Ht(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),o}import{spawnSync as Vt}from"node:child_process";function me(e,o){return Vt(e,o,{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}function po(e,o){let t=me(e,["mcp","get",o,"--json"]);if(t.status!==0||!t.stdout)return null;try{return JSON.parse(t.stdout)}catch{return null}}function Oo(e,o){return e.enabled!==!1&&e.transport?.type==="stdio"&&e.transport?.command===o&&Array.isArray(e.transport?.args)&&e.transport?.args.length===1&&e.transport.args[0]==="mcp"}function Lo(e={}){let o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=e.codexBinary??"codex",n=e.serverName??"toolnet-memory",r=po(t,n);if(r&&Oo(r,o))return{installed:!0,changed:!1,serverName:n,command:o,args:["mcp"]};if(r){let c=me(t,["mcp","remove",n]);if(c.status!==0)return{installed:!1,changed:!1,serverName:n,command:o,args:["mcp"],error:(c.stderr||c.stdout||"Unable to remove old ToolNet MCP configuration.").trim()}}let s=me(t,["mcp","add",n,"--",o,"mcp"]);if(s.status!==0)return{installed:!1,changed:!1,serverName:n,command:o,args:["mcp"],error:(s.stderr||s.stdout||"Unable to register ToolNet MCP.").trim()};let i=po(t,n);return!i||!Oo(i,o)?{installed:!1,changed:!0,serverName:n,command:o,args:["mcp"],error:"Codex accepted MCP registration but verification did not match expected ToolNet command."}:{installed:!0,changed:!0,serverName:n,command:o,args:["mcp"]}}import{existsSync as Wt,mkdirSync as Xt,readFileSync as zt,renameSync as Qt,rmSync as Zt,writeFileSync as en}from"node:fs";import{dirname as on}from"node:path";function F(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function tn(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function nn(e){if(!Wt(e))return{};let o;try{o=JSON.parse(zt(e,"utf8"))}catch(t){throw new Error(`Invalid existing Claude settings.json: ${t instanceof Error?t.message:String(t)}`)}if(!F(o))throw new Error("Invalid existing Claude settings.json: root must be a JSON object.");return o}function fe(e){if(e===void 0)return[];if(!Array.isArray(e))throw new Error("Invalid existing Claude settings.json: hook event must be an array.");let o=[];for(let t of e){if(!F(t)){o.push(t);continue}let n=t.hooks;if(!Array.isArray(n)){o.push(t);continue}let r=n.filter(s=>{if(!F(s))return!0;let i=s.command;return!(typeof i=="string"&&i.includes("session:claude-hook"))});r.length!==0&&o.push({...t,hooks:r})}return o}function Ee(e){return{type:"command",command:e,timeout:10}}function rn(e,o){Xt(on(e),{recursive:!0,mode:448});let t=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{en(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),Qt(t,e)}finally{Zt(t,{force:!0})}}function To(e={}){let o=e.settingsFile??Fe(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=nn(o),r=n.hooks;if(r!==void 0&&!F(r))throw new Error("Invalid existing Claude settings.json: hooks must be an object.");let s=F(r)?{...r}:{},i=`${tn(t)} session:claude-hook`,c=fe(s.SessionStart);c.push({matcher:"startup|resume|clear|compact",hooks:[Ee(i)]}),s.SessionStart=c;let a=fe(s.PostToolUse);a.push({matcher:"Edit|Write",hooks:[Ee(i)]}),s.PostToolUse=a;let g=fe(s.Stop);g.push({hooks:[Ee(i)]}),s.Stop=g;let d={...n,hooks:s},_=JSON.stringify(n),m=JSON.stringify(d);return _===m?{settingsFile:o,changed:!1}:(rn(o,d),{settingsFile:o,changed:!0})}import{existsSync as sn,mkdirSync as cn,readFileSync as an,renameSync as ln,rmSync as gn,writeFileSync as dn}from"node:fs";import{dirname as un}from"node:path";function B(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Ao(e){if(!sn(e))return{};let o;try{o=JSON.parse(an(e,"utf8"))}catch(t){throw new Error(`Invalid existing Claude Code config: ${t instanceof Error?t.message:String(t)}`)}if(!B(o))throw new Error("Invalid existing Claude Code config: root must be a JSON object.");return o}function yo(e,o){if(!B(e))return!1;let t=e.args;return e.type==="stdio"&&e.command===o&&Array.isArray(t)&&t.length===1&&t[0]==="mcp"}function mn(e,o){cn(un(e),{recursive:!0});let t=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{dn(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),ln(t,e)}finally{gn(t,{force:!0})}}function Mo(e={}){let o=e.stateFile??Be(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=Ao(o),s=r.mcpServers;if(s!==void 0&&!B(s))throw new Error("Invalid existing Claude Code config: mcpServers must be an object.");let i=B(s)?{...s}:{},c=i[n];if(yo(c,t))return{installed:!0,changed:!1,configFile:o,serverName:n,command:[t,"mcp"],repaired:!1};let a=c!==void 0;i[n]={type:"stdio",command:t,args:["mcp"]},mn(o,{...r,mcpServers:i});let d=Ao(o).mcpServers;if(!B(d)||!yo(d[n],t))throw new Error("Claude Code MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:o,serverName:n,command:[t,"mcp"],repaired:a}}function Io(e={}){let o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=To({binary:o,settingsFile:e.settingsFile}),n=Mo({binary:o,stateFile:e.stateFile});return{hooks:t,mcp:n,files:[t.settingsFile,n.configFile]}}import{existsSync as fn,mkdirSync as En,readFileSync as _n,renameSync as pn,rmSync as On,writeFileSync as Ln}from"node:fs";import{dirname as Tn}from"node:path";var b="ToolNet Memory - ";function So(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function An(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function Co(e){if(!fn(e))return{};let o=_n(e,"utf8").trim();if(!o)return{};let t;try{t=JSON.parse(o)}catch(n){throw new Error(`Invalid existing Kiro hooks file: ${n instanceof Error?n.message:String(n)}`)}if(!So(t))throw new Error("Invalid existing Kiro hooks file: root must be a JSON object.");return t}function No(e){return So(e)?typeof e.name=="string"&&e.name.startsWith(b):!1}function x(e){return{type:"command",command:e}}function yn(e){return[{name:`${b}Session Start`,description:"Inject compact local ToolNet continuity and capture Kiro session activation.",trigger:"SessionStart",action:x(e),timeout:10,enabled:!0},{name:`${b}Prompt Continuity`,description:"Capture prompts and refresh ToolNet guidance only for resume/continue requests.",trigger:"UserPromptSubmit",action:x(e),timeout:10,enabled:!0},{name:`${b}Raw History Guard`,description:"Prevent Kiro from reconstructing continuity from raw ToolNet/agent session history.",trigger:"PreToolUse",matcher:"*",action:x(e),timeout:10,enabled:!0},{name:`${b}Tool Capture`,description:"Capture durable tool activity while filtering noisy read-only events.",trigger:"PostToolUse",matcher:"*",action:x(e),timeout:15,enabled:!0},{name:`${b}Final Flush`,description:"Flush pending Kiro WAL events when the assistant finishes a turn.",trigger:"Stop",action:x(e),timeout:30,enabled:!0}]}function Mn(e,o){En(Tn(e),{recursive:!0,mode:448});let t=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Ln(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),pn(t,e)}finally{On(t,{force:!0})}}function ho(e={}){let o=e.hooksFile??$e(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=Co(o);if(n.version!==void 0&&n.version!=="v1")throw new Error(`Unsupported existing Kiro hooks version: ${String(n.version)}`);let r=n.hooks;if(r!==void 0&&!Array.isArray(r))throw new Error("Invalid existing Kiro hooks file: hooks must be an array.");let s=Array.isArray(r)?r.filter(d=>!No(d)):[],i=`${An(t)} session:kiro-hook`,c=yn(i),a={...n,version:"v1",hooks:[...s,...c]};if(JSON.stringify(n)===JSON.stringify(a))return{hooksFile:o,changed:!1,hookCount:c.length};Mn(o,a);let g=Co(o);if(g.version!=="v1"||!Array.isArray(g.hooks)||g.hooks.filter(No).length!==c.length)throw new Error("Kiro hooks were written but verification failed.");return{hooksFile:o,changed:!0,hookCount:c.length}}import{existsSync as In,mkdirSync as Cn,readFileSync as Nn,renameSync as Sn,rmSync as hn,writeFileSync as Rn}from"node:fs";import{dirname as Dn}from"node:path";function $(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Ro(e){if(!In(e))return{};let o=Nn(e,"utf8").trim();if(!o)return{};let t;try{t=JSON.parse(o)}catch(n){throw new Error(`Invalid existing Kiro MCP config: ${n instanceof Error?n.message:String(n)}`)}if(!$(t))throw new Error("Invalid existing Kiro MCP config: root must be a JSON object.");return t}function Do(e,o){return $(e)?e.command===o&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&e.disabled===!1:!1}function bn(e,o){Cn(Dn(e),{recursive:!0,mode:448});let t=`${e}.tmp-${process.pid}-${Date.now()}`;try{Rn(t,`${JSON.stringify(o,null,2)}
`,{encoding:"utf8",mode:384}),Sn(t,e)}finally{hn(t,{force:!0})}}function bo(e={}){let o=e.configFile??xe(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=Ro(o),s=r.mcpServers;if(s!==void 0&&!$(s))throw new Error("Invalid existing Kiro MCP config: mcpServers must be an object.");let i=$(s)?{...s}:{},c=i[n];if(Do(c,t))return{installed:!0,changed:!1,configFile:o,serverName:n,command:t,args:["mcp"]};i[n]={command:t,args:["mcp"],disabled:!1};let a={...r,mcpServers:i};bn(o,a);let d=Ro(o).mcpServers;if(!$(d)||!Do(d[n],t))throw new Error("Kiro MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:o,serverName:n,command:t,args:["mcp"]}}function Po(e={}){let o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=bo({binary:o,configFile:e.configFile}),n=ho({binary:o,hooksFile:e.hooksFile});return{installed:t.installed,changed:t.changed||n.changed,mcp:t,hooks:n,files:[t.configFile,n.hooksFile]}}function wo(){return ve()}function _e(e={}){let o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=[],n=e.detections??wo(),r=new Map(n.map(s=>[s.agent,s.detected]));if(!(e.force===!0||r.get("agy")===!0))t.push({agent:"agy",detected:!1,installed:!1,targets:[]});else try{let i=Qe({binary:o});t.push({agent:"agy",detected:!0,installed:!0,targets:i.files})}catch(i){t.push({agent:"agy",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("opencode")===!0))t.push({agent:"opencode",detected:!1,installed:!1,targets:[]});else try{let i=no({binary:o}),c=ao({binary:o});t.push({agent:"opencode",detected:!0,installed:!0,targets:[i,c.configFile,`mcp:${c.serverName}`]})}catch(i){t.push({agent:"opencode",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("claude")===!0))t.push({agent:"claude",detected:!1,installed:!1,targets:[]});else try{let i=Io({binary:o});t.push({agent:"claude",detected:!0,installed:!0,targets:[i.hooks.settingsFile,i.mcp.configFile,`mcp:${i.mcp.serverName}`]})}catch(i){t.push({agent:"claude",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("kiro")===!0))t.push({agent:"kiro",detected:!1,installed:!1,targets:[]});else try{let i=Po({...e.kiro??{},binary:o});t.push({agent:"kiro",detected:!0,installed:!0,targets:[i.mcp.configFile,`mcp:${i.mcp.serverName}`,i.hooks.hooksFile]})}catch(i){t.push({agent:"kiro",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("codex")===!0))t.push({agent:"codex",detected:!1,installed:!1,targets:[]});else try{let i=fo({binary:o}),c=_o({binary:o}),a=Lo({binary:o});if(!a.installed)throw new Error(a.error??"Codex MCP registration failed");let g=[i.configFile,c,`mcp:${a.serverName}`];i.preservedPrevious&&g.push(i.previousFile),t.push({agent:"codex",detected:!0,installed:!0,targets:g})}catch(i){t.push({agent:"codex",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}return t}function ko(e){switch(e){case"agy":return"Agy / Antigravity";case"opencode":return"OpenCode";case"claude":return"Claude Code";case"kiro":return"Kiro CLI";case"codex":return"Codex"}}function Pn(e){console.log(""),console.log("ToolNet Memory Integration Detection"),console.log("===================================="),console.log("");for(let o of e){let t=ko(o.agent);if(!o.detected){console.log(`\u25CB ${t}: not detected`);continue}console.log(`\u2713 ${t}: detected`);for(let n of o.evidence)console.log(`  ${n}`)}console.log("")}function wn(e){console.log(""),console.log("ToolNet Memory AI Integrations"),console.log("=============================="),console.log("");for(let o of e){let t=ko(o.agent);if(!o.detected){console.log(`- ${t}: not detected`);continue}if(o.installed){console.log(`\u2713 ${t}: automatic memory enabled`);continue}console.log(`\u2717 ${t}: integration failed`),o.error&&console.log(`  ${o.error}`)}console.log("")}async function kn(){let e=process.argv.slice(2),o=e.includes("--all"),t=e.includes("--json");if(e.includes("--detect-only")){let s=wo();if(t){console.log(JSON.stringify(s,null,2));return}Pn(s);return}let r=_e({force:o});if(t){console.log(JSON.stringify(r,null,2));return}wn(r)}var Kn=process.argv[1]&&(process.argv[1].endsWith("auto-integrate.js")||process.argv[1].endsWith("auto-integrate.ts"));Kn&&kn().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});var pe=v.join(Oe.homedir(),".config","toolnet-memory"),O=v.join(pe,".env"),xn=new Set(["MEMORY_STORAGE_PROVIDER","R2_ACCOUNT_ID","R2_BUCKET","R2_ACCESS_KEY_ID","R2_SECRET_ACCESS_KEY","S3_ENDPOINT","S3_REGION","S3_BUCKET","S3_ACCESS_KEY_ID","S3_SECRET_ACCESS_KEY","S3_FORCE_PATH_STYLE","HF_NAMESPACE","HF_BUCKET","HF_S3_ACCESS_KEY_ID","HF_S3_SECRET_ACCESS_KEY","HF_URL","HF_TOKEN","HF_EMBEDDING_MODEL","TOOLNET_LLM_PROVIDER","TOOLNET_LLM_API_KEY","TOOLNET_LLM_BASE_URL","TOOLNET_LLM_MODEL","TOOLNET_LLM_FALLBACK_1_PROVIDER","TOOLNET_LLM_FALLBACK_1_API_KEY","TOOLNET_LLM_FALLBACK_1_BASE_URL","TOOLNET_LLM_FALLBACK_1_MODEL","TOOLNET_LLM_FALLBACK_1_ACCOUNT_ID","TOOLNET_LLM_FALLBACK_2_PROVIDER","TOOLNET_LLM_FALLBACK_2_API_KEY","TOOLNET_LLM_FALLBACK_2_BASE_URL","TOOLNET_LLM_FALLBACK_2_MODEL","TOOLNET_LLM_FALLBACK_2_ACCOUNT_ID","TOOLNET_LLM_FALLBACK_COOLDOWN_MS","TOOLNET_LLM_MAX_RETRIES","TOOLNET_LLM_ACCOUNT_ID","TOOLNET_EMBEDDING_PROVIDER","TOOLNET_EMBEDDING_API_KEY","TOOLNET_EMBEDDING_BASE_URL","TOOLNET_EMBEDDING_MODEL","TOOLNET_EMBEDDING_ACCOUNT_ID","MEMORY_LOCAL_STORAGE_PATH","MEMORY_LOCAL_CACHE_MB","MEMORY_AUTO_CAPTURE","MEMORY_AUTO_RETRIEVE","MEMORY_AUTO_SUMMARIZE","MEMORY_AUTO_SYNC","MEMORY_MAX_CANDIDATES","MEMORY_RERANK_TOP","MEMORY_FINAL_CONTEXT","MEMORY_TOKEN_BUDGET","TOOLNET_SESSION_LEARNING","TOOLNET_WORK_CONTINUITY","TOOLNET_SEMANTIC_CONTINUITY","TOOLNET_SMART_HANDOFF"]);function $n(e){let o=new Map;for(let t of e.split(/\r?\n/)){let n=t.trim();if(!n||n.startsWith("#"))continue;let r=n.indexOf("=");if(r===-1)continue;let s=n.slice(0,r).trim(),i=n.slice(r+1).trim();s&&o.set(s,i)}return o}function C(e){let o=e.get("MEMORY_STORAGE_PROVIDER")?.trim();return o==="r2"||o==="s3"||o==="local"||o==="huggingface"?o:e.get("R2_ACCOUNT_ID")&&e.get("R2_BUCKET")?"r2":e.get("S3_BUCKET")?"s3":e.get("HF_BUCKET")&&e.get("HF_S3_ACCESS_KEY_ID")?"huggingface":e.get("MEMORY_LOCAL_STORAGE_PATH")?"local":"r2"}function j(e){switch(e){case"r2":return"Cloudflare R2";case"s3":return"S3 / S3-compatible";case"huggingface":return"Hugging Face S3";case"local":return"Local";default:return e}}function Bo(e){switch(e){case"r2":return["R2_ACCOUNT_ID","R2_BUCKET","R2_ACCESS_KEY_ID","R2_SECRET_ACCESS_KEY"];case"s3":return["S3_BUCKET","S3_ACCESS_KEY_ID","S3_SECRET_ACCESS_KEY"];case"huggingface":return["HF_BUCKET","HF_S3_ACCESS_KEY_ID","HF_S3_SECRET_ACCESS_KEY"];case"local":return[];default:return[]}}function xo(e){let o=C(e);return o==="local"?!0:Bo(o).every(t=>!!e.get(t)?.trim())}function Le(e){return e?e.length<=8?"configured":`${e.slice(0,4)}\u2022\u2022\u2022\u2022${e.slice(-3)}`:"not configured"}function Yn(e){let t=["# ==========================================================","# TOOLNET MEMORY","# Generated by: toolnet-memory setup","# Do not commit this file.","# ==========================================================","",`MEMORY_STORAGE_PROVIDER=${C(e)}`,"","# ----------------------------------------------------------","# Cloudflare R2","# ----------------------------------------------------------",`R2_ACCOUNT_ID=${e.get("R2_ACCOUNT_ID")??""}`,`R2_BUCKET=${e.get("R2_BUCKET")??"toolnet-memory"}`,`R2_ACCESS_KEY_ID=${e.get("R2_ACCESS_KEY_ID")??""}`,`R2_SECRET_ACCESS_KEY=${e.get("R2_SECRET_ACCESS_KEY")??""}`,"","# ----------------------------------------------------------","# Generic S3 / S3-compatible","# ----------------------------------------------------------",`S3_ENDPOINT=${e.get("S3_ENDPOINT")??""}`,`S3_REGION=${e.get("S3_REGION")??"us-east-1"}`,`S3_BUCKET=${e.get("S3_BUCKET")??"toolnet-memory"}`,`S3_ACCESS_KEY_ID=${e.get("S3_ACCESS_KEY_ID")??""}`,`S3_SECRET_ACCESS_KEY=${e.get("S3_SECRET_ACCESS_KEY")??""}`,`S3_FORCE_PATH_STYLE=${e.get("S3_FORCE_PATH_STYLE")??"false"}`,"","# ----------------------------------------------------------","# Hugging Face S3","# ----------------------------------------------------------",`HF_NAMESPACE=${e.get("HF_NAMESPACE")??""}`,`HF_BUCKET=${e.get("HF_BUCKET")??"toolnet-memory"}`,`HF_S3_ACCESS_KEY_ID=${e.get("HF_S3_ACCESS_KEY_ID")??""}`,`HF_S3_SECRET_ACCESS_KEY=${e.get("HF_S3_SECRET_ACCESS_KEY")??""}`,`HF_URL=${e.get("HF_URL")??""}`,"","# ----------------------------------------------------------","# AI / LLM - canonical ToolNet configuration","# ----------------------------------------------------------",`TOOLNET_LLM_PROVIDER=${e.get("TOOLNET_LLM_PROVIDER")??""}`,`TOOLNET_LLM_API_KEY=${e.get("TOOLNET_LLM_API_KEY")??""}`,`TOOLNET_LLM_BASE_URL=${e.get("TOOLNET_LLM_BASE_URL")??""}`,`TOOLNET_LLM_MODEL=${e.get("TOOLNET_LLM_MODEL")??""}`,`TOOLNET_LLM_ACCOUNT_ID=${e.get("TOOLNET_LLM_ACCOUNT_ID")??""}`,"","# ----------------------------------------------------------","# LLM fallback chain","# ----------------------------------------------------------",`TOOLNET_LLM_FALLBACK_1_PROVIDER=${e.get("TOOLNET_LLM_FALLBACK_1_PROVIDER")??""}`,`TOOLNET_LLM_FALLBACK_1_API_KEY=${e.get("TOOLNET_LLM_FALLBACK_1_API_KEY")??""}`,`TOOLNET_LLM_FALLBACK_1_BASE_URL=${e.get("TOOLNET_LLM_FALLBACK_1_BASE_URL")??""}`,`TOOLNET_LLM_FALLBACK_1_MODEL=${e.get("TOOLNET_LLM_FALLBACK_1_MODEL")??""}`,`TOOLNET_LLM_FALLBACK_1_ACCOUNT_ID=${e.get("TOOLNET_LLM_FALLBACK_1_ACCOUNT_ID")??""}`,`TOOLNET_LLM_FALLBACK_2_PROVIDER=${e.get("TOOLNET_LLM_FALLBACK_2_PROVIDER")??""}`,`TOOLNET_LLM_FALLBACK_2_API_KEY=${e.get("TOOLNET_LLM_FALLBACK_2_API_KEY")??""}`,`TOOLNET_LLM_FALLBACK_2_BASE_URL=${e.get("TOOLNET_LLM_FALLBACK_2_BASE_URL")??""}`,`TOOLNET_LLM_FALLBACK_2_MODEL=${e.get("TOOLNET_LLM_FALLBACK_2_MODEL")??""}`,`TOOLNET_LLM_FALLBACK_2_ACCOUNT_ID=${e.get("TOOLNET_LLM_FALLBACK_2_ACCOUNT_ID")??""}`,`TOOLNET_LLM_FALLBACK_COOLDOWN_MS=${e.get("TOOLNET_LLM_FALLBACK_COOLDOWN_MS")??"60000"}`,`TOOLNET_LLM_MAX_RETRIES=${e.get("TOOLNET_LLM_MAX_RETRIES")??"1"}`,"","# ----------------------------------------------------------","# Embedding - canonical ToolNet configuration","# ----------------------------------------------------------",`TOOLNET_EMBEDDING_PROVIDER=${e.get("TOOLNET_EMBEDDING_PROVIDER")??""}`,`TOOLNET_EMBEDDING_API_KEY=${e.get("TOOLNET_EMBEDDING_API_KEY")??""}`,`TOOLNET_EMBEDDING_BASE_URL=${e.get("TOOLNET_EMBEDDING_BASE_URL")??""}`,`TOOLNET_EMBEDDING_MODEL=${e.get("TOOLNET_EMBEDDING_MODEL")??""}`,`TOOLNET_EMBEDDING_ACCOUNT_ID=${e.get("TOOLNET_EMBEDDING_ACCOUNT_ID")??""}`,"","# ----------------------------------------------------------","# Embedding - legacy/current compatibility","# ----------------------------------------------------------",`HF_TOKEN=${e.get("HF_TOKEN")??""}`,`HF_EMBEDDING_MODEL=${e.get("HF_EMBEDDING_MODEL")??"sentence-transformers/all-MiniLM-L6-v2"}`,"","# ----------------------------------------------------------","# Local storage/cache","# ----------------------------------------------------------",`MEMORY_LOCAL_STORAGE_PATH=${e.get("MEMORY_LOCAL_STORAGE_PATH")??""}`,`MEMORY_LOCAL_CACHE_MB=${e.get("MEMORY_LOCAL_CACHE_MB")??"200"}`,"","# ----------------------------------------------------------","# Automation","# ----------------------------------------------------------",`MEMORY_AUTO_CAPTURE=${e.get("MEMORY_AUTO_CAPTURE")??"true"}`,`MEMORY_AUTO_RETRIEVE=${e.get("MEMORY_AUTO_RETRIEVE")??"true"}`,`MEMORY_AUTO_SUMMARIZE=${e.get("MEMORY_AUTO_SUMMARIZE")??"true"}`,`MEMORY_AUTO_SYNC=${e.get("MEMORY_AUTO_SYNC")??"true"}`,"","# ----------------------------------------------------------","# Retrieval","# ----------------------------------------------------------",`MEMORY_MAX_CANDIDATES=${e.get("MEMORY_MAX_CANDIDATES")??"50"}`,`MEMORY_RERANK_TOP=${e.get("MEMORY_RERANK_TOP")??"10"}`,`MEMORY_FINAL_CONTEXT=${e.get("MEMORY_FINAL_CONTEXT")??"5"}`,`MEMORY_TOKEN_BUDGET=${e.get("MEMORY_TOKEN_BUDGET")??"2000"}`,"","# ----------------------------------------------------------","# Automatic Session Memory","# ----------------------------------------------------------",`TOOLNET_SESSION_LEARNING=${e.get("TOOLNET_SESSION_LEARNING")??"1"}`,`TOOLNET_WORK_CONTINUITY=${e.get("TOOLNET_WORK_CONTINUITY")??"1"}`,`TOOLNET_SEMANTIC_CONTINUITY=${e.get("TOOLNET_SEMANTIC_CONTINUITY")??"1"}`,`TOOLNET_SMART_HANDOFF=${e.get("TOOLNET_SMART_HANDOFF")??"1"}`],n=[...e.entries()].filter(([r])=>!xn.has(r));if(n.length>0){t.push("","# ----------------------------------------------------------","# Preserved settings","# ----------------------------------------------------------");for(let[r,s]of n)t.push(`${r}=${s}`)}return`${t.join(`
`)}
`}function p(e){A.mkdirSync(pe,{recursive:!0,mode:448});let o=`${O}.tmp-${process.pid}`;A.writeFileSync(o,Yn(e),{encoding:"utf8",mode:384}),A.renameSync(o,O),A.chmodSync(pe,448),A.chmodSync(O,384)}function L(e,o,t,n){let r=t.trim();if(r){e.set(o,r);return}!e.get(o)&&n!==void 0&&e.set(o,n)}async function P(e,o){return T.isTTY?(e.pause(),Y.write(o),new Promise(t=>{let n="",r=!1,s=()=>{r||(r=!0,T.off("data",i),T.setRawMode?.(!1),T.pause(),Y.write(`
`),e.resume(),t(n))},i=c=>{for(let a of c.toString("utf8")){if(a==="\r"||a===`
`){s();return}if(a===""&&(T.off("data",i),T.setRawMode?.(!1),Y.write(`
`),process.exit(130)),a==="\x7F"){n=n.slice(0,-1);continue}n+=a}};T.resume(),T.setRawMode?.(!0),T.on("data",i)})):""}function N(e){return e.trim().replace(/\/+$/,"")}function $o(e){return`https://${e}.r2.cloudflarestorage.com`}async function Te(e){let o=new AbortController,t=setTimeout(()=>o.abort(),15e3);t.unref?.();let n=new Bn({region:e.region,endpoint:e.endpoint||void 0,forcePathStyle:e.forcePathStyle??!1,credentials:{accessKeyId:e.accessKeyId,secretAccessKey:e.secretAccessKey}});try{return await n.send(new Fn({Bucket:e.bucket}),{abortSignal:o.signal}),{ok:!0,message:`Bucket "${e.bucket}" reachable`}}catch(r){return{ok:!1,message:r instanceof Error?r.message:String(r)}}finally{clearTimeout(t),n.destroy()}}async function vn(e){let o=e.get("R2_ACCOUNT_ID")?.trim()??"",t=e.get("R2_BUCKET")?.trim()??"",n=e.get("R2_ACCESS_KEY_ID")?.trim()??"",r=e.get("R2_SECRET_ACCESS_KEY")?.trim()??"";return!o||!t||!n||!r?{ok:!1,message:"R2 configuration is incomplete"}:Te({endpoint:$o(o),region:"auto",bucket:t,accessKeyId:n,secretAccessKey:r})}async function jn(e){let o=N(e.get("S3_ENDPOINT")??""),t=e.get("S3_REGION")?.trim()||"us-east-1",n=e.get("S3_BUCKET")?.trim()??"",r=e.get("S3_ACCESS_KEY_ID")?.trim()??"",s=e.get("S3_SECRET_ACCESS_KEY")?.trim()??"";return!n||!r||!s?{ok:!1,message:"S3 configuration is incomplete"}:Te({endpoint:o||void 0,region:t,bucket:n,accessKeyId:r,secretAccessKey:s,forcePathStyle:e.get("S3_FORCE_PATH_STYLE")==="true"})}async function Hn(e){let o=N(e.get("HF_URL")??""),t=e.get("HF_BUCKET")?.trim()??"",n=e.get("HF_S3_ACCESS_KEY_ID")?.trim()??"",r=e.get("HF_S3_SECRET_ACCESS_KEY")?.trim()??"";return o?!t||!n||!r?{ok:!1,message:"Hugging Face S3 configuration is incomplete"}:Te({endpoint:o,region:"us-east-1",bucket:t,accessKeyId:n,secretAccessKey:r,forcePathStyle:!0}):{ok:!1,message:"HF_URL / S3 endpoint is required for connection test"}}async function Gn(e){let o=e.get("MEMORY_LOCAL_STORAGE_PATH")?.trim()||v.join(Oe.homedir(),".local","share","toolnet-memory"),t=v.join(o,`.toolnet-test-${process.pid}-${Date.now()}`);try{return A.mkdirSync(o,{recursive:!0,mode:448}),A.writeFileSync(t,`toolnet-memory
`,{encoding:"utf8",mode:384}),A.unlinkSync(t),{ok:!0,message:`Writable: ${o}`}}catch(n){return{ok:!1,message:n instanceof Error?n.message:String(n)}}}async function qn(e,o){switch(e){case"r2":return vn(o);case"s3":return jn(o);case"huggingface":return Hn(o);case"local":return Gn(o)}}async function Jn(e,o){console.log(""),console.log(`Testing ${j(e)}...`);let t=await qn(e,o);return t.ok?console.log(`\u2713 ${t.message}`):(console.log("\u2717 Connection test failed"),console.log(`  ${t.message}`)),console.log(""),t}function Vn(){console.log(""),console.log("\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557"),console.log("\u2551         TOOLNET MEMORY SETUP         \u2551"),console.log("\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D"),console.log("")}function Wn(e){let o=C(e);console.log("Current configuration"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),console.log(`Storage : ${j(o)} ${xo(e)?"\u2713":"\u26A0 incomplete"}`);let t=e.get("TOOLNET_LLM_PROVIDER"),n=e.get("TOOLNET_LLM_MODEL"),r=e.get("TOOLNET_EMBEDDING_PROVIDER");console.log(`LLM     : ${t?`${y(t)}${n?` / ${n}`:""}`:"not configured"}`),console.log(`Embedding: ${r||"legacy/default"}`),console.log("")}async function Xn(e){console.log("Setup"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),console.log("  1. Storage"),console.log("  2. AI Model"),console.log("  3. Finish & Save"),console.log("  0. Exit without saving"),console.log("");let o=(await e.question("Choose [1-3]: ")).trim();return o==="1"?"storage":o==="2"?"ai":o==="0"?"exit":"finish"}async function zn(e,o){console.log(""),console.log("Storage"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),console.log(`  1. Cloudflare R2${o==="r2"?"  \u2713 current":""}`),console.log(`  2. S3 / S3-compatible${o==="s3"?"  \u2713 current":""}`),console.log(`  3. Hugging Face S3${o==="huggingface"?"  \u2713 current":""}`),console.log(`  4. Local${o==="local"?"  \u2713 current":""}`),console.log(""),console.log("  0. Back"),console.log("");let t=(await e.question("Choose storage: ")).trim();return t==="0"?"back":t==="2"?"s3":t==="3"?"huggingface":t==="4"?"local":"r2"}async function Qn(e,o){console.log(""),console.log("Cloudflare R2"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");let t=await e.question(o.get("R2_ACCOUNT_ID")?`ACCOUNT ID [${o.get("R2_ACCOUNT_ID")}]: `:"ACCOUNT ID: "),n=await e.question(o.get("R2_ACCESS_KEY_ID")?`ACCESS KEY ID [${Le(o.get("R2_ACCESS_KEY_ID"))}]: `:"ACCESS KEY ID: "),r=await e.question(`BUCKET [${o.get("R2_BUCKET")||"toolnet-memory"}]: `);L(o,"R2_ACCOUNT_ID",t),L(o,"R2_ACCESS_KEY_ID",n),L(o,"R2_BUCKET",r,"toolnet-memory");let s=o.get("R2_ACCOUNT_ID")?.trim();s&&console.log(`URL: ${$o(s)}`);let i=await P(e,o.get("R2_SECRET_ACCESS_KEY")?"SECRET ACCESS KEY [configured, Enter = keep]: ":"SECRET ACCESS KEY: ");i.trim()&&o.set("R2_SECRET_ACCESS_KEY",i.trim())}async function Zn(e,o){console.log(""),console.log("S3 / S3-compatible"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");let t=await e.question(o.get("S3_ENDPOINT")?`URL / ENDPOINT [${o.get("S3_ENDPOINT")}]: `:"URL / ENDPOINT [blank = AWS S3]: "),n=await e.question(`REGION [${o.get("S3_REGION")||"us-east-1"}]: `),r=await e.question(o.get("S3_ACCESS_KEY_ID")?`ACCESS KEY ID [${Le(o.get("S3_ACCESS_KEY_ID"))}]: `:"ACCESS KEY ID: "),s=await e.question(`BUCKET [${o.get("S3_BUCKET")||"toolnet-memory"}]: `),i=o.get("S3_FORCE_PATH_STYLE")==="true",c=await e.question(`FORCE PATH STYLE [${i?"Y":"N"}] (y/n): `);if(t.trim()&&o.set("S3_ENDPOINT",N(t)),L(o,"S3_REGION",n,"us-east-1"),L(o,"S3_ACCESS_KEY_ID",r),L(o,"S3_BUCKET",s,"toolnet-memory"),c.trim()){let g=c.trim().toLowerCase();o.set("S3_FORCE_PATH_STYLE",g==="y"||g==="yes"?"true":"false")}else o.has("S3_FORCE_PATH_STYLE")||o.set("S3_FORCE_PATH_STYLE","false");let a=await P(e,o.get("S3_SECRET_ACCESS_KEY")?"SECRET ACCESS KEY [configured, Enter = keep]: ":"SECRET ACCESS KEY: ");a.trim()&&o.set("S3_SECRET_ACCESS_KEY",a.trim())}async function er(e,o){console.log(""),console.log("Hugging Face S3"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");let t=await e.question(o.get("HF_NAMESPACE")?`NAMESPACE [${o.get("HF_NAMESPACE")}]: `:"NAMESPACE [optional]: "),n=await e.question(o.get("HF_S3_ACCESS_KEY_ID")?`ACCESS KEY ID [${Le(o.get("HF_S3_ACCESS_KEY_ID"))}]: `:"ACCESS KEY ID: "),r=await e.question(`BUCKET [${o.get("HF_BUCKET")||"toolnet-memory"}]: `),s=await e.question(o.get("HF_URL")?`URL [${o.get("HF_URL")}]: `:"URL / S3 ENDPOINT: ");L(o,"HF_NAMESPACE",t),L(o,"HF_S3_ACCESS_KEY_ID",n),L(o,"HF_BUCKET",r,"toolnet-memory"),s.trim()&&o.set("HF_URL",N(s));let i=await P(e,o.get("HF_S3_SECRET_ACCESS_KEY")?"SECRET ACCESS KEY [configured, Enter = keep]: ":"SECRET ACCESS KEY: ");i.trim()&&o.set("HF_S3_SECRET_ACCESS_KEY",i.trim())}async function or(e,o){console.log(""),console.log("Local Storage"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");let t=o.get("MEMORY_LOCAL_STORAGE_PATH")??v.join(Oe.homedir(),".local","share","toolnet-memory"),n=await e.question(`LOCAL PATH [${t}]: `);L(o,"MEMORY_LOCAL_STORAGE_PATH",n,t)}async function tr(e,o){let t=new Map(o);for(;;){let n=await zn(e,C(o));if(n==="back")return;let r=new Map(o);o.set("MEMORY_STORAGE_PROVIDER",n),n==="r2"?await Qn(e,o):n==="s3"?await Zn(e,o):n==="huggingface"?await er(e,o):await or(e,o);let s=Bo(n).filter(a=>!o.get(a)?.trim());if(s.length){console.log(""),console.log("\u26A0 Missing required fields:");for(let g of s)console.log(`  - ${g}`);console.log(""),console.log("  1. Retry"),console.log("  2. Save anyway"),console.log("  3. Choose another provider"),console.log("  4. Cancel"),console.log("");let a=(await e.question("Choose [1]: ")).trim()||"1";if(a==="2"){p(o),console.log(""),console.log("\u26A0 Saved with incomplete configuration"),console.log("");return}if(a==="3"){o.clear();for(let[g,d]of r)o.set(g,d);continue}if(a==="4"){o.clear();for(let[g,d]of t)o.set(g,d);console.log(""),console.log("Storage changes cancelled."),console.log("");return}continue}if((await Jn(n,o)).ok){p(o),console.log(`\u2713 ${j(n)} configuration saved`),console.log(`  ${O}`),console.log("");return}console.log("  1. Retry"),console.log("  2. Save anyway"),console.log("  3. Choose another provider"),console.log("  4. Cancel"),console.log("");let c=(await e.question("Choose [1]: ")).trim()||"1";if(c==="2"){p(o),console.log(""),console.log("\u26A0 Saved even though connection test failed"),console.log("");return}if(c==="3"){o.clear();for(let[a,g]of r)o.set(a,g);continue}if(c==="4"){o.clear();for(let[a,g]of t)o.set(a,g);console.log(""),console.log("Storage changes cancelled."),console.log("");return}}}var I=[{id:"openai-compatible",label:"OpenAI-compatible",apiKeyRequired:!0,baseUrlRequired:!0},{id:"alibaba",label:"Alibaba / DashScope",baseUrl:"https://dashscope-intl.aliyuncs.com/compatible-mode/v1",suggestedModel:"qwen3.6-flash",apiKeyRequired:!0},{id:"openrouter",label:"OpenRouter",baseUrl:"https://openrouter.ai/api/v1",apiKeyRequired:!0},{id:"groq",label:"Groq",baseUrl:"https://api.groq.com/openai/v1",apiKeyRequired:!0},{id:"deepseek",label:"DeepSeek",baseUrl:"https://api.deepseek.com",suggestedModel:"deepseek-v4-flash",apiKeyRequired:!0},{id:"nvidia",label:"NVIDIA NIM",baseUrl:"https://integrate.api.nvidia.com/v1",suggestedModel:"deepseek-ai/deepseek-v4-pro",apiKeyRequired:!0},{id:"gemini",label:"Gemini",baseUrl:"https://generativelanguage.googleapis.com/v1beta",suggestedModel:"gemini-3.6-flash",apiKeyRequired:!0},{id:"huggingface",label:"Hugging Face",baseUrl:"https://router.huggingface.co/v1",apiKeyRequired:!0},{id:"ollama",label:"Ollama / Local",baseUrl:"http://127.0.0.1:11434/v1",apiKeyRequired:!1},{id:"custom",label:"Custom endpoint",apiKeyRequired:!1,baseUrlRequired:!0},{id:"cloudflare",label:"Cloudflare Workers AI",suggestedModel:"@cf/meta/llama-3.1-8b-instruct",apiKeyRequired:!0,accountIdRequired:!0}];function nr(e){return I.find(o=>o.id===e)}function y(e){return nr(e)?.label??e??"not configured"}function Yo(e){let o=e.get("TOOLNET_LLM_PROVIDER")?.trim();return I.some(t=>t.id===o)?o:void 0}async function Ae(e,o){console.log(""),console.log("AI Model"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),I.forEach((r,s)=>{console.log(`  ${s+1}. ${r.label}${o===r.id?"  \u2713 current":""}`)}),console.log(""),console.log("  0. Back"),console.log("");let t=(await e.question("Choose provider: ")).trim();if(t==="0")return"back";let n=Number(t)-1;return Number.isInteger(n)&&n>=0&&n<I.length?I[n].id:(console.log(""),console.log("\u26A0 Invalid provider selection"),Ae(e,o))}function rr(e,o){return!(!e.get("TOOLNET_LLM_MODEL")?.trim()||o.apiKeyRequired&&!e.get("TOOLNET_LLM_API_KEY")?.trim()||o.accountIdRequired&&!e.get("TOOLNET_LLM_ACCOUNT_ID")?.trim()||o.baseUrlRequired&&!e.get("TOOLNET_LLM_BASE_URL")?.trim())}function ir(e){e.delete("TOOLNET_LLM_API_KEY"),e.delete("TOOLNET_LLM_BASE_URL"),e.delete("TOOLNET_LLM_MODEL"),e.delete("TOOLNET_LLM_ACCOUNT_ID")}async function sr(e,o,t){console.log(""),console.log(t.label),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");let n=o.get("TOOLNET_LLM_PROVIDER");if(n&&n!==t.id&&ir(o),o.set("TOOLNET_LLM_PROVIDER",t.id),t.accountIdRequired){let a=o.get("TOOLNET_LLM_ACCOUNT_ID"),g=await e.question(a?`ACCOUNT ID [${a}]: `:"ACCOUNT ID: ");L(o,"TOOLNET_LLM_ACCOUNT_ID",g)}else o.delete("TOOLNET_LLM_ACCOUNT_ID");if(t.apiKeyRequired||t.id==="custom"){let a=o.get("TOOLNET_LLM_API_KEY"),g=await P(e,a?"API KEY [configured, Enter = keep]: ":t.apiKeyRequired?"API KEY: ":"API KEY [optional]: ");g.trim()&&o.set("TOOLNET_LLM_API_KEY",g.trim())}else o.delete("TOOLNET_LLM_API_KEY");if(t.id!=="cloudflare"){let g=o.get("TOOLNET_LLM_BASE_URL")||t.baseUrl||"",_=(await e.question(g?`BASE URL [${g}]: `:t.baseUrlRequired?"BASE URL: ":"BASE URL [optional]: ")).trim()||g;_?o.set("TOOLNET_LLM_BASE_URL",N(_)):o.delete("TOOLNET_LLM_BASE_URL")}else o.delete("TOOLNET_LLM_BASE_URL");let s=o.get("TOOLNET_LLM_MODEL")||t.suggestedModel||"",c=(await e.question(s?`MODEL [${s}]: `:"MODEL: ")).trim()||s;c&&o.set("TOOLNET_LLM_MODEL",c)}function cr(e){let o=Yo(e);if(!o)throw new Error("AI provider is not configured");return{id:o,apiKey:e.get("TOOLNET_LLM_API_KEY")?.trim()||void 0,baseUrl:e.get("TOOLNET_LLM_BASE_URL")?.trim()||void 0,model:e.get("TOOLNET_LLM_MODEL")?.trim()||void 0,accountId:e.get("TOOLNET_LLM_ACCOUNT_ID")?.trim()||void 0}}async function ar(e){let o=cr(e);console.log(""),console.log(`Testing ${y(o.id)}...`);try{let n=await he(o).healthCheck();return n.ok?(console.log(`\u2713 Provider reachable${n.latencyMs?` (${n.latencyMs} ms)`:""}`),console.log(`\u2713 Model: ${n.model??o.model??"configured"}`),console.log(""),{ok:!0,message:n.message}):(console.log("\u2717 AI provider test failed"),console.log(`  ${n.message}`),console.log(""),{ok:!1,message:n.message})}catch(t){let n=t instanceof Error?t.message:String(t);return console.log("\u2717 AI provider test failed"),console.log(`  ${n}`),console.log(""),{ok:!1,message:n}}}var oe=[{id:"local",label:"Local / Hash",apiKeyRequired:!1},{id:"huggingface",label:"Hugging Face",suggestedModel:"sentence-transformers/all-MiniLM-L6-v2",apiKeyRequired:!0},{id:"openai-compatible",label:"OpenAI-compatible",apiKeyRequired:!0,baseUrlRequired:!0},{id:"alibaba",label:"Alibaba / DashScope",baseUrl:"https://dashscope-intl.aliyuncs.com/compatible-mode/v1",suggestedModel:"text-embedding-v4",apiKeyRequired:!0},{id:"openrouter",label:"OpenRouter",baseUrl:"https://openrouter.ai/api/v1",apiKeyRequired:!0},{id:"nvidia",label:"NVIDIA NIM",baseUrl:"https://integrate.api.nvidia.com/v1",apiKeyRequired:!0},{id:"ollama",label:"Ollama / Local",baseUrl:"http://127.0.0.1:11434/v1",apiKeyRequired:!1},{id:"gemini",label:"Gemini",baseUrl:"https://generativelanguage.googleapis.com/v1beta",suggestedModel:"gemini-embedding-001",apiKeyRequired:!0},{id:"cloudflare",label:"Cloudflare Workers AI",suggestedModel:"@cf/baai/bge-base-en-v1.5",apiKeyRequired:!0,accountIdRequired:!0},{id:"custom",label:"Custom OpenAI-compatible endpoint",apiKeyRequired:!1,baseUrlRequired:!0}];function ye(e){return oe.find(o=>o.id===e)?.label??e??"not configured"}async function vo(e,o){console.log(""),console.log("Embedding Model"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),oe.forEach((r,s)=>{console.log(`  ${s+1}. ${r.label}${o===r.id?"  \u2713 current":""}`)}),console.log(""),console.log("  0. Back"),console.log("");let t=(await e.question("Choose embedding provider: ")).trim();if(t==="0")return"back";let n=Number(t)-1;return Number.isInteger(n)&&n>=0&&n<oe.length?oe[n]:(console.log(""),console.log("\u26A0 Invalid selection"),vo(e,o))}function Ko(e){e.delete("TOOLNET_EMBEDDING_API_KEY"),e.delete("TOOLNET_EMBEDDING_BASE_URL"),e.delete("TOOLNET_EMBEDDING_MODEL"),e.delete("TOOLNET_EMBEDDING_ACCOUNT_ID")}async function lr(e,o,t){let n=o.get("TOOLNET_EMBEDDING_PROVIDER");if(n&&n!==t.id&&Ko(o),o.set("TOOLNET_EMBEDDING_PROVIDER",t.id),console.log(""),console.log(t.label),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),t.id==="local"){Ko(o),console.log("\u2713 Local embedding selected"),console.log("  No API key required.");return}if(t.accountIdRequired){let a=o.get("TOOLNET_EMBEDDING_ACCOUNT_ID"),g=await e.question(a?`ACCOUNT ID [${a}]: `:"ACCOUNT ID: ");L(o,"TOOLNET_EMBEDDING_ACCOUNT_ID",g)}else o.delete("TOOLNET_EMBEDDING_ACCOUNT_ID");if(t.apiKeyRequired||t.id==="custom"){let a=o.get("TOOLNET_EMBEDDING_API_KEY"),g=await P(e,a?"API KEY [configured, Enter = keep]: ":t.apiKeyRequired?"API KEY: ":"API KEY [optional]: ");g.trim()&&o.set("TOOLNET_EMBEDDING_API_KEY",g.trim())}else o.delete("TOOLNET_EMBEDDING_API_KEY");if(t.id==="cloudflare"){let a=o.get("TOOLNET_EMBEDDING_ACCOUNT_ID")?.trim();if(a){let g=`https://api.cloudflare.com/client/v4/accounts/${a}/ai/v1`;o.set("TOOLNET_EMBEDDING_BASE_URL",g),console.log(`BASE URL: ${g}`)}}else{let g=o.get("TOOLNET_EMBEDDING_BASE_URL")||t.baseUrl||"",_=(await e.question(g?`BASE URL [${g}]: `:t.baseUrlRequired?"BASE URL: ":"BASE URL [optional]: ")).trim()||g;_&&o.set("TOOLNET_EMBEDDING_BASE_URL",N(_))}let s=o.get("TOOLNET_EMBEDDING_MODEL")||t.suggestedModel||"",c=(await e.question(s?`MODEL [${s}]: `:"MODEL: ")).trim()||s;c&&o.set("TOOLNET_EMBEDDING_MODEL",c)}function gr(e,o){return o.id==="local"?!0:o.apiKeyRequired&&!e.get("TOOLNET_EMBEDDING_API_KEY")?.trim()||o.accountIdRequired&&!e.get("TOOLNET_EMBEDDING_ACCOUNT_ID")?.trim()||o.baseUrlRequired&&!e.get("TOOLNET_EMBEDDING_BASE_URL")?.trim()?!1:!!e.get("TOOLNET_EMBEDDING_MODEL")?.trim()}async function jo(e){let o=e.get("TOOLNET_EMBEDDING_PROVIDER")?.trim();if(console.log(""),console.log(`Testing embedding: ${ye(o)}...`),o==="local")return console.log("\u2713 Local embedding ready"),console.log(""),!0;let t=e.get("TOOLNET_EMBEDDING_API_KEY")?.trim(),n=e.get("TOOLNET_EMBEDDING_MODEL")?.trim(),r=e.get("TOOLNET_EMBEDDING_BASE_URL")?.trim();try{if(!n)throw new Error("Embedding model is missing");if(o==="huggingface"){if(!t)throw new Error("API key is missing");let s=await fetch(`https://router.huggingface.co/hf-inference/models/${n}/pipeline/feature-extraction`,{method:"POST",headers:{Authorization:`Bearer ${t}`,"Content-Type":"application/json"},body:JSON.stringify({inputs:["toolnet memory test"]})});if(!s.ok)throw new Error(`HTTP ${s.status}: ${await s.text()}`)}else if(o==="gemini"){if(!t)throw new Error("API key is missing");let s=n.replace(/^models\//,"");r=r||"https://generativelanguage.googleapis.com/v1beta";let i=await fetch(`${r.replace(/\/+$/,"")}/models/${encodeURIComponent(s)}:embedContent?key=${encodeURIComponent(t)}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({model:`models/${s}`,content:{parts:[{text:"toolnet memory test"}]}})});if(!i.ok)throw new Error(`HTTP ${i.status}: ${await i.text()}`)}else{if(!r)throw new Error("BASE URL is missing");let s=await fetch(`${r.replace(/\/+$/,"")}/embeddings`,{method:"POST",headers:{"content-type":"application/json",...t?{authorization:`Bearer ${t}`}:{}},body:JSON.stringify({model:n,input:["toolnet memory test"]})});if(!s.ok)throw new Error(`HTTP ${s.status}: ${await s.text()}`);let i=await s.json();if(!Array.isArray(i.data)||!Array.isArray(i.data[0]?.embedding))throw new Error("Invalid embedding response")}return console.log("\u2713 Embedding provider reachable"),console.log(`\u2713 Model: ${n}`),console.log(""),!0}catch(s){return console.log("\u2717 Embedding test failed"),console.log(`  ${s instanceof Error?s.message:String(s)}`),console.log(""),!1}}async function dr(e,o){let t=new Map(o);for(;;){let n=await vo(e,o.get("TOOLNET_EMBEDDING_PROVIDER"));if(n==="back")return;if(await lr(e,o,n),!gr(o,n)){console.log(""),console.log("\u26A0 Embedding configuration is incomplete."),console.log(""),console.log("  1. Retry"),console.log("  2. Save anyway"),console.log("  3. Choose another provider"),console.log("  4. Cancel"),console.log("");let i=(await e.question("Choose [1]: ")).trim()||"1";if(i==="2"){p(o);return}if(i==="3")continue;if(i==="4"){o.clear();for(let[c,a]of t)o.set(c,a);return}continue}if(await jo(o)){p(o),console.log(`\u2713 ${n.label} embedding configuration saved`),console.log(`  ${O}`),console.log("");return}console.log("  1. Retry"),console.log("  2. Save anyway"),console.log("  3. Choose another provider"),console.log("  4. Cancel"),console.log("");let s=(await e.question("Choose [1]: ")).trim()||"1";if(s==="2"){p(o);return}if(s!=="3"&&s==="4"){o.clear();for(let[i,c]of t)o.set(i,c);return}}}async function ur(e,o){let t=o.get("TOOLNET_LLM_PROVIDER")?.trim();if(!t){console.log(""),console.log("\u26A0 Configure LLM first."),console.log("");return}if(t==="deepseek"||t==="groq"){console.log(""),console.log(`\u26A0 ${y(t)} is configured as LLM-only.`),console.log("Choose Embedding separately."),console.log("");return}o.set("TOOLNET_EMBEDDING_PROVIDER",t);let n=o.get("TOOLNET_LLM_API_KEY"),r=o.get("TOOLNET_LLM_BASE_URL"),s=o.get("TOOLNET_LLM_ACCOUNT_ID");n&&o.set("TOOLNET_EMBEDDING_API_KEY",n),r&&o.set("TOOLNET_EMBEDDING_BASE_URL",r),s&&o.set("TOOLNET_EMBEDDING_ACCOUNT_ID",s);let i="";t==="alibaba"?i="text-embedding-v4":t==="gemini"?i="gemini-embedding-001":t==="cloudflare"?i="@cf/baai/bge-base-en-v1.5":t==="huggingface"&&(i="sentence-transformers/all-MiniLM-L6-v2");let a=(await e.question(i?`EMBEDDING MODEL [${i}]: `:"EMBEDDING MODEL: ")).trim()||i;if(!a){console.log(""),console.log("\u26A0 Embedding model is required."),console.log("");return}if(o.set("TOOLNET_EMBEDDING_MODEL",a),!await jo(o)){let d=(await e.question("Save anyway? (y/N): ")).trim().toLowerCase();if(d!=="y"&&d!=="yes")return}p(o),console.log(""),console.log("\u2713 LLM credentials reused for Embedding"),console.log(`\u2713 Embedding model: ${a}`),console.log("")}function te(e){return`TOOLNET_LLM_FALLBACK_${e}`}function ne(e,o){let t=te(o);for(let n of["PROVIDER","API_KEY","BASE_URL","MODEL","ACCOUNT_ID"])e.delete(`${t}_${n}`)}function Uo(e,o){let t=te(o),n=e.get(`${t}_PROVIDER`);if(!n)return"not configured";let r=e.get(`${t}_MODEL`);return`${y(n)}${r?` / ${r}`:""}`}async function Fo(e,o,t){console.log(""),console.log(`Fallback ${t}`),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");let n=await Ae(e,void 0);if(n==="back")return;let r=o.get("TOOLNET_LLM_PROVIDER");if(n===r){console.log(""),console.log("\u26A0 Fallback cannot be the same provider as Primary."),console.log("");return}let s=t===1?2:1,i=o.get(`${te(s)}_PROVIDER`);if(n===i){console.log(""),console.log("\u26A0 This provider is already used by the other fallback."),console.log("");return}let c=I.find(m=>m.id===n);if(!c)return;let a=te(t);if(ne(o,t),o.set(`${a}_PROVIDER`,n),c.accountIdRequired){let m=await e.question("ACCOUNT ID: ");m.trim()&&o.set(`${a}_ACCOUNT_ID`,m.trim())}if(c.apiKeyRequired||n==="custom"){let m=await P(e,c.apiKeyRequired?"API KEY: ":"API KEY [optional]: ");m.trim()&&o.set(`${a}_API_KEY`,m.trim())}if(n==="cloudflare"){let m=o.get(`${a}_ACCOUNT_ID`);m&&o.set(`${a}_BASE_URL`,`https://api.cloudflare.com/client/v4/accounts/${m}/ai`)}else{let m=c.baseUrl??"",Me=(await e.question(m?`BASE URL [${m}]: `:c.baseUrlRequired?"BASE URL: ":"BASE URL [optional]: ")).trim()||m;Me&&o.set(`${a}_BASE_URL`,N(Me))}let g=c.suggestedModel??"",_=(await e.question(g?`MODEL [${g}]: `:"MODEL: ")).trim()||g;if(!_){console.log(""),console.log("\u26A0 MODEL is required."),console.log(""),ne(o,t);return}o.set(`${a}_MODEL`,_),p(o),console.log(""),console.log(`\u2713 Fallback ${t} saved`),console.log(`  ${y(n)} / ${_}`),console.log("")}async function mr(e,o){let t=o.get("TOOLNET_LLM_FALLBACK_COOLDOWN_MS")||"60000",n=o.get("TOOLNET_LLM_MAX_RETRIES")||"1";console.log(""),console.log("Fallback Policy"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");let r=await e.question(`COOLDOWN MS [${t}]: `);if(r.trim()){let i=Number(r.trim());Number.isFinite(i)&&i>=0?o.set("TOOLNET_LLM_FALLBACK_COOLDOWN_MS",String(Math.floor(i))):console.log("\u26A0 Invalid cooldown; keeping previous value.")}let s=await e.question(`MAX RETRIES [${n}]: `);if(s.trim()){let i=Number(s.trim());Number.isFinite(i)&&i>=0&&i<=5?o.set("TOOLNET_LLM_MAX_RETRIES",String(Math.floor(i))):console.log("\u26A0 MAX RETRIES must be between 0 and 5.")}p(o),console.log(""),console.log("\u2713 Fallback policy saved"),console.log("")}async function fr(e,o){for(;;){console.log(""),console.log("LLM Fallback"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),console.log(`  Primary    : ${o.get("TOOLNET_LLM_PROVIDER")?`${y(o.get("TOOLNET_LLM_PROVIDER"))} / ${o.get("TOOLNET_LLM_MODEL")||"model not configured"}`:"not configured"}`),console.log(`  Fallback 1 : ${Uo(o,1)}`),console.log(`  Fallback 2 : ${Uo(o,2)}`),console.log(`  Cooldown   : ${o.get("TOOLNET_LLM_FALLBACK_COOLDOWN_MS")||"60000"} ms`),console.log(`  Retries    : ${o.get("TOOLNET_LLM_MAX_RETRIES")||"1"}`),console.log(""),console.log("  1. Configure Fallback 1"),console.log("  2. Configure Fallback 2"),console.log("  3. Remove Fallback 1"),console.log("  4. Remove Fallback 2"),console.log("  5. Retry / cooldown settings"),console.log("  0. Back"),console.log("");let t=(await e.question("Choose: ")).trim();if(t==="0")return;if(t==="1"){await Fo(e,o,1);continue}if(t==="2"){await Fo(e,o,2);continue}if(t==="3"){ne(o,1),p(o),console.log(""),console.log("\u2713 Fallback 1 removed"),console.log("");continue}if(t==="4"){ne(o,2),p(o),console.log(""),console.log("\u2713 Fallback 2 removed"),console.log("");continue}if(t==="5"){await mr(e,o);continue}console.log(""),console.log("\u26A0 Invalid selection")}}async function Er(e,o){for(;;){console.log(""),console.log("AI Model"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");let t=o.get("TOOLNET_LLM_PROVIDER"),n=o.get("TOOLNET_EMBEDDING_PROVIDER");console.log(`  LLM       : ${t?`${y(t)} / ${o.get("TOOLNET_LLM_MODEL")||"model not configured"}`:"not configured"}`),console.log(`  Embedding : ${n?`${ye(n)} / ${o.get("TOOLNET_EMBEDDING_MODEL")||(n==="local"?"local hash":"model not configured")}`:"legacy/default"}`),console.log(""),console.log("  1. Configure LLM"),console.log("  2. Configure Embedding"),console.log("  3. Use LLM provider credentials for Embedding"),console.log("  4. Configure LLM Fallbacks"),console.log("  0. Back"),console.log("");let r=(await e.question("Choose: ")).trim();if(r==="0")return;if(r==="1"){await _r(e,o);continue}if(r==="2"){await dr(e,o);continue}if(r==="3"){await ur(e,o);continue}if(r==="4"){await fr(e,o);continue}console.log(""),console.log("\u26A0 Invalid selection")}}async function _r(e,o){let t=new Map(o);for(;;){let n=await Ae(e,Yo(o));if(n==="back")return;let r=I.find(c=>c.id===n);if(!r)continue;if(await sr(e,o,r),!rr(o,r)){console.log(""),console.log("\u26A0 AI configuration is incomplete."),console.log(""),console.log("  1. Retry"),console.log("  2. Save anyway"),console.log("  3. Choose another provider"),console.log("  4. Cancel"),console.log("");let c=(await e.question("Choose [1]: ")).trim()||"1";if(c==="2"){p(o),console.log(""),console.log("\u26A0 AI configuration saved without validation"),console.log(`  ${O}`),console.log("");return}if(c==="3")continue;if(c==="4"){o.clear();for(let[a,g]of t)o.set(a,g);console.log(""),console.log("AI changes cancelled."),console.log("");return}continue}if((await ar(o)).ok){p(o),console.log(`\u2713 ${r.label} configuration saved`),console.log(`  ${O}`),console.log("");return}console.log("  1. Retry"),console.log("  2. Save anyway"),console.log("  3. Choose another provider"),console.log("  4. Cancel"),console.log("");let i=(await e.question("Choose [1]: ")).trim()||"1";if(i==="2"){p(o),console.log(""),console.log("\u26A0 AI configuration saved even though provider test failed"),console.log(`  ${O}`),console.log("");return}if(i!=="3"&&i==="4"){o.clear();for(let[c,a]of t)o.set(c,a);console.log(""),console.log("AI changes cancelled."),console.log("");return}}}function pr(){try{let o=_e().filter(t=>t.installed);if(o.length===0)return;console.log(""),console.log("Automatic AI memory");for(let t of o){let n=t.agent==="agy"?"Agy / Antigravity":t.agent==="opencode"?"OpenCode":t.agent==="codex"?"Codex":t.agent;console.log(`  \u2713 ${n}`)}}catch{}}function u(e,...o){for(let t of o){let n=e.get(t)?.trim();if(n)return n}}function f(e,o,t){t&&!e.get(o)?.trim()&&e.set(o,t)}function Or(e){let o=!1,t=JSON.stringify([...e.entries()]);if(!e.get("TOOLNET_LLM_PROVIDER")?.trim()){let s;u(e,"GROQ_API_KEY")?s="groq":u(e,"DEEPSEEK_API_KEY")?s="deepseek":u(e,"NVIDIA_API_KEY","NVIDIA_NIM_API_KEY")?s="nvidia":u(e,"OPENROUTER_API_KEY")?s="openrouter":u(e,"ALIBABA_API_KEY","DASHSCOPE_API_KEY")?s="alibaba":u(e,"GEMINI_API_KEY","GOOGLE_API_KEY")?s="gemini":u(e,"CLOUDFLARE_API_TOKEN")&&u(e,"CLOUDFLARE_ACCOUNT_ID")?s="cloudflare":u(e,"HF_TOKEN")?s="huggingface":u(e,"OLLAMA_MODEL","OLLAMA_BASE_URL")?s="ollama":u(e,"OPENAI_API_KEY","MODEL_API_KEY")&&(s="openai-compatible"),s&&e.set("TOOLNET_LLM_PROVIDER",s)}switch(e.get("TOOLNET_LLM_PROVIDER")?.trim()){case"groq":f(e,"TOOLNET_LLM_API_KEY",u(e,"GROQ_API_KEY")),f(e,"TOOLNET_LLM_BASE_URL",u(e,"GROQ_BASE_URL")||"https://api.groq.com/openai/v1"),f(e,"TOOLNET_LLM_MODEL",u(e,"GROQ_MODEL"));break;case"deepseek":f(e,"TOOLNET_LLM_API_KEY",u(e,"DEEPSEEK_API_KEY")),f(e,"TOOLNET_LLM_BASE_URL",u(e,"DEEPSEEK_BASE_URL")||"https://api.deepseek.com"),f(e,"TOOLNET_LLM_MODEL",u(e,"DEEPSEEK_MODEL")||"deepseek-v4-flash");break;case"nvidia":f(e,"TOOLNET_LLM_API_KEY",u(e,"NVIDIA_API_KEY","NVIDIA_NIM_API_KEY")),f(e,"TOOLNET_LLM_BASE_URL",u(e,"NVIDIA_BASE_URL","NVIDIA_NIM_BASE_URL")||"https://integrate.api.nvidia.com/v1"),f(e,"TOOLNET_LLM_MODEL",u(e,"NVIDIA_MODEL","NVIDIA_NIM_MODEL"));break;case"openrouter":f(e,"TOOLNET_LLM_API_KEY",u(e,"OPENROUTER_API_KEY")),f(e,"TOOLNET_LLM_BASE_URL",u(e,"OPENROUTER_BASE_URL")||"https://openrouter.ai/api/v1"),f(e,"TOOLNET_LLM_MODEL",u(e,"OPENROUTER_MODEL"));break;case"alibaba":f(e,"TOOLNET_LLM_API_KEY",u(e,"ALIBABA_API_KEY","DASHSCOPE_API_KEY")),f(e,"TOOLNET_LLM_BASE_URL",u(e,"ALIBABA_BASE_URL","DASHSCOPE_BASE_URL")),f(e,"TOOLNET_LLM_MODEL",u(e,"ALIBABA_MODEL","DASHSCOPE_MODEL"));break;case"gemini":f(e,"TOOLNET_LLM_API_KEY",u(e,"GEMINI_API_KEY","GOOGLE_API_KEY")),f(e,"TOOLNET_LLM_BASE_URL",u(e,"GEMINI_BASE_URL")||"https://generativelanguage.googleapis.com/v1beta"),f(e,"TOOLNET_LLM_MODEL",u(e,"GEMINI_MODEL"));break;case"huggingface":f(e,"TOOLNET_LLM_API_KEY",u(e,"HF_TOKEN")),f(e,"TOOLNET_LLM_BASE_URL",u(e,"HF_INFERENCE_BASE_URL")||"https://router.huggingface.co/v1"),f(e,"TOOLNET_LLM_MODEL",u(e,"HF_LLM_MODEL","HF_MODEL"));break;case"ollama":f(e,"TOOLNET_LLM_API_KEY",u(e,"OLLAMA_API_KEY")),f(e,"TOOLNET_LLM_BASE_URL",u(e,"OLLAMA_BASE_URL")||"http://127.0.0.1:11434/v1"),f(e,"TOOLNET_LLM_MODEL",u(e,"OLLAMA_MODEL"));break;case"cloudflare":f(e,"TOOLNET_LLM_API_KEY",u(e,"CLOUDFLARE_API_TOKEN")),f(e,"TOOLNET_LLM_ACCOUNT_ID",u(e,"CLOUDFLARE_ACCOUNT_ID")),f(e,"TOOLNET_LLM_MODEL",u(e,"CLOUDFLARE_MODEL"));break;case"openai-compatible":f(e,"TOOLNET_LLM_API_KEY",u(e,"OPENAI_API_KEY","MODEL_API_KEY")),f(e,"TOOLNET_LLM_BASE_URL",u(e,"OPENAI_BASE_URL","MODEL_BASE_URL")),f(e,"TOOLNET_LLM_MODEL",u(e,"OPENAI_MODEL","MODEL_NAME"));break}!e.get("TOOLNET_EMBEDDING_PROVIDER")?.trim()&&u(e,"HF_TOKEN")&&(e.set("TOOLNET_EMBEDDING_PROVIDER","huggingface"),f(e,"TOOLNET_EMBEDDING_API_KEY",u(e,"HF_TOKEN")),f(e,"TOOLNET_EMBEDDING_MODEL",u(e,"HF_EMBEDDING_MODEL")||"sentence-transformers/all-MiniLM-L6-v2"));let r=JSON.stringify([...e.entries()]);return o=t!==r,o}function ee(e,o="not configured"){return e?.trim()||o}function Lr(e){let o=j(C(e)),t=e.get("TOOLNET_LLM_PROVIDER"),n=e.get("TOOLNET_LLM_MODEL"),r=e.get("TOOLNET_EMBEDDING_PROVIDER"),s=e.get("TOOLNET_EMBEDDING_MODEL"),i=e.get("TOOLNET_LLM_FALLBACK_1_PROVIDER"),c=e.get("TOOLNET_LLM_FALLBACK_2_PROVIDER");console.log(""),console.log("\u25C7 ToolNet Memory Setup"),console.log(""),console.log("\u25C6 Configuration"),console.log("\u2502"),console.log(`\u251C \u25C6 Storage    \u2014 ${o}`),console.log(`\u251C \u25C6 LLM        \u2014 ${t?`${y(t)} / ${ee(n)}`:"not configured"}`),console.log(`\u251C \u25C7 Fallback 1 \u2014 ${i?`${y(i)} / ${ee(e.get("TOOLNET_LLM_FALLBACK_1_MODEL"))}`:"none"}`),console.log(`\u251C \u25C7 Fallback 2 \u2014 ${c?`${y(c)} / ${ee(e.get("TOOLNET_LLM_FALLBACK_2_MODEL"))}`:"none"}`),console.log(`\u251C \u25C6 Embedding  \u2014 ${r?`${r==="local"?"Local / Hash":ye(r)} / ${ee(s,r==="local"?"local hash":"not configured")}`:"legacy/default"}`),console.log("\u2502"),console.log(`\u251C \u25C6 Config      \u2014 ${O}`),console.log(`\u251C \u25C6 Permissions \u2014 ${A.statSync(O).mode.toString(8).slice(-3)}`),console.log("\u251C \u25C6 Secrets     \u2014 hidden"),console.log("\u251C \u25C6 Config mode \u2014 canonical TOOLNET_*"),console.log("\u2502"),console.log("\u2514 \u25C6 Setup complete")}function Ho(e){Or(e),e.has("TOOLNET_LLM_FALLBACK_COOLDOWN_MS")||e.set("TOOLNET_LLM_FALLBACK_COOLDOWN_MS","60000"),e.has("TOOLNET_LLM_MAX_RETRIES")||e.set("TOOLNET_LLM_MAX_RETRIES","1"),e.has("MEMORY_STORAGE_PROVIDER")||e.set("MEMORY_STORAGE_PROVIDER",C(e)),e.has("MEMORY_LOCAL_CACHE_MB")||e.set("MEMORY_LOCAL_CACHE_MB","200"),e.has("MEMORY_AUTO_CAPTURE")||e.set("MEMORY_AUTO_CAPTURE","true"),e.has("MEMORY_AUTO_RETRIEVE")||e.set("MEMORY_AUTO_RETRIEVE","true"),e.has("MEMORY_AUTO_SUMMARIZE")||e.set("MEMORY_AUTO_SUMMARIZE","true"),e.has("MEMORY_AUTO_SYNC")||e.set("MEMORY_AUTO_SYNC","true"),e.has("MEMORY_MAX_CANDIDATES")||e.set("MEMORY_MAX_CANDIDATES","50"),e.has("MEMORY_RERANK_TOP")||e.set("MEMORY_RERANK_TOP","10"),e.has("MEMORY_FINAL_CONTEXT")||e.set("MEMORY_FINAL_CONTEXT","5"),e.has("MEMORY_TOKEN_BUDGET")||e.set("MEMORY_TOKEN_BUDGET","2000"),e.has("TOOLNET_SESSION_LEARNING")||e.set("TOOLNET_SESSION_LEARNING","1"),e.has("TOOLNET_WORK_CONTINUITY")||e.set("TOOLNET_WORK_CONTINUITY","1"),e.has("TOOLNET_SEMANTIC_CONTINUITY")||e.set("TOOLNET_SEMANTIC_CONTINUITY","1"),e.has("TOOLNET_SMART_HANDOFF")||e.set("TOOLNET_SMART_HANDOFF","1")}async function Tr(e,o){Ho(e),o||p(e),console.log(""),console.log("\u25C7 ToolNet Memory Setup"),console.log(""),console.log("\u25C6 Non-interactive mode"),console.log("\u2502"),console.log(`\u251C \u25C6 Config   \u2014 ${O}`),console.log(`\u251C \u25C6 Storage  \u2014 ${j(C(e))}`),console.log("\u2502"),console.log("\u2514 \u25C7 Run toolnet-memory setup from an interactive terminal")}async function Ar(){let e=A.existsSync(O),o=e?$n(A.readFileSync(O,"utf8")):new Map,t=new Map(o);if(Ho(t),!T.isTTY||!Y.isTTY){await Tr(t,e);return}let n=Un.createInterface({input:T,output:Y}),r=!1;try{for(;;){Vn(),Wn(t);let s=await Xn(n);if(s==="storage"){let i=JSON.stringify([...t.entries()]);await tr(n,t),r=r||i!==JSON.stringify([...t.entries()]);continue}if(s==="ai"){let i=JSON.stringify([...t.entries()]);await Er(n,t),r=r||i!==JSON.stringify([...t.entries()]);continue}if(s==="exit"){if(!r){console.log(""),console.log("No changes made.");return}console.log("");let i=(await n.question("Discard unsaved changes? (y/N): ")).trim().toLowerCase();if(i==="y"||i==="yes"){console.log(""),console.log("Changes discarded.");return}continue}p(t),xo(t)||(console.log(""),console.log("\u26A0 Storage configuration is incomplete.")),pr(),Lr(t),console.log(""),console.log("Validate:"),console.log("  toolnet-memory provider:status"),console.log("  toolnet-memory provider:test"),console.log("  toolnet-memory doctor"),console.log("");return}}finally{n.close()}}Ar().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exit(1)});
