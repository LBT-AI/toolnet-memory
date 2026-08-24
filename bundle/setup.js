import A from"node:fs";import Ke from"node:os";import Q from"node:path";import hi from"node:readline/promises";import{stdin as h,stdout as z}from"node:process";import{HeadBucketCommand as Ai,S3Client as Ci}from"@aws-sdk/client-s3";var He=[{id:"openai-compatible",label:"OpenAI-compatible",requiresApiKey:!0,requiresBaseUrl:!0,transport:"openai-compatible"},{id:"alibaba",label:"Alibaba / DashScope",requiresApiKey:!0,requiresBaseUrl:!0,transport:"openai-compatible"},{id:"openrouter",label:"OpenRouter",defaultBaseUrl:"https://openrouter.ai/api/v1",requiresApiKey:!0,transport:"openai-compatible"},{id:"groq",label:"Groq",defaultBaseUrl:"https://api.groq.com/openai/v1",requiresApiKey:!0,transport:"openai-compatible"},{id:"deepseek",label:"DeepSeek",defaultBaseUrl:"https://api.deepseek.com",defaultModel:"deepseek-v4-flash",requiresApiKey:!0,transport:"openai-compatible"},{id:"nvidia",label:"NVIDIA NIM",defaultBaseUrl:"https://integrate.api.nvidia.com/v1",defaultModel:"deepseek-ai/deepseek-v4-pro",requiresApiKey:!0,transport:"openai-compatible"},{id:"gemini",label:"Gemini",defaultBaseUrl:"https://generativelanguage.googleapis.com/v1beta",requiresApiKey:!0,transport:"gemini"},{id:"huggingface",label:"Hugging Face",defaultBaseUrl:"https://router.huggingface.co/v1",requiresApiKey:!0,transport:"openai-compatible"},{id:"ollama",label:"Ollama / Local",defaultBaseUrl:"http://127.0.0.1:11434/v1",requiresApiKey:!1,transport:"openai-compatible"},{id:"custom",label:"Custom endpoint",requiresApiKey:!1,requiresBaseUrl:!0,transport:"openai-compatible"},{id:"cloudflare",label:"Cloudflare Workers AI",requiresApiKey:!0,requiresAccountId:!0,transport:"cloudflare"}];function P(e){let o=He.find(t=>t.id===e);if(!o)throw new Error(`Unsupported AI provider: ${e}`);return o}function ee(e){return He.some(o=>o.id===e)}function g(e){return process.env[e]?.trim()||void 0}function E(...e){return e.find(o=>!!o?.trim())}function je(){if(g("GROQ_API_KEY"))return"groq";if(g("DEEPSEEK_API_KEY"))return"deepseek";if(g("NVIDIA_API_KEY")||g("NVIDIA_NIM_API_KEY"))return"nvidia";if(g("OPENROUTER_API_KEY"))return"openrouter";if(g("ALIBABA_API_KEY")||g("DASHSCOPE_API_KEY"))return"alibaba";if(g("GEMINI_API_KEY")||g("GOOGLE_API_KEY"))return"gemini";if(g("CLOUDFLARE_API_TOKEN")&&g("CLOUDFLARE_ACCOUNT_ID"))return"cloudflare";if(g("HF_TOKEN"))return"huggingface";if(g("OLLAMA_MODEL")||g("OLLAMA_BASE_URL"))return"ollama"}function Ge(){let e=g("TOOLNET_LLM_PROVIDER");return e&&ee(e)?e:je()??"openai-compatible"}function oe(e){let o=P(e);switch(e){case"alibaba":return{provider:e,apiKey:E(g("ALIBABA_API_KEY"),g("DASHSCOPE_API_KEY")),baseUrl:E(g("ALIBABA_BASE_URL"),g("DASHSCOPE_BASE_URL"),o.defaultBaseUrl),model:E(g("ALIBABA_MODEL"),g("DASHSCOPE_MODEL"))};case"openrouter":return{provider:e,apiKey:g("OPENROUTER_API_KEY"),baseUrl:E(g("OPENROUTER_BASE_URL"),o.defaultBaseUrl),model:g("OPENROUTER_MODEL")};case"groq":return{provider:e,apiKey:g("GROQ_API_KEY"),baseUrl:E(g("GROQ_BASE_URL"),o.defaultBaseUrl),model:g("GROQ_MODEL")};case"deepseek":return{provider:e,apiKey:g("DEEPSEEK_API_KEY"),baseUrl:E(g("DEEPSEEK_BASE_URL"),o.defaultBaseUrl),model:E(g("DEEPSEEK_MODEL"),o.defaultModel)};case"nvidia":return{provider:e,apiKey:E(g("NVIDIA_API_KEY"),g("NVIDIA_NIM_API_KEY")),baseUrl:E(g("NVIDIA_BASE_URL"),g("NVIDIA_NIM_BASE_URL"),o.defaultBaseUrl),model:E(g("NVIDIA_MODEL"),g("NVIDIA_NIM_MODEL"),o.defaultModel)};case"gemini":return{provider:e,apiKey:E(g("GEMINI_API_KEY"),g("GOOGLE_API_KEY")),baseUrl:E(g("GEMINI_BASE_URL"),o.defaultBaseUrl),model:g("GEMINI_MODEL")};case"huggingface":return{provider:e,apiKey:g("HF_TOKEN"),baseUrl:E(g("HF_INFERENCE_BASE_URL"),o.defaultBaseUrl),model:E(g("HF_LLM_MODEL"),g("HF_MODEL"))};case"ollama":return{provider:e,apiKey:g("OLLAMA_API_KEY"),baseUrl:E(g("OLLAMA_BASE_URL"),o.defaultBaseUrl),model:g("OLLAMA_MODEL")};case"cloudflare":return{provider:e,accountId:g("CLOUDFLARE_ACCOUNT_ID"),apiKey:g("CLOUDFLARE_API_TOKEN"),baseUrl:g("CLOUDFLARE_AI_BASE_URL"),model:g("CLOUDFLARE_MODEL")};case"custom":return{provider:e,apiKey:g("CUSTOM_AI_API_KEY"),baseUrl:g("CUSTOM_AI_BASE_URL"),model:g("CUSTOM_AI_MODEL")};default:return{provider:"openai-compatible",apiKey:E(g("OPENAI_API_KEY"),g("MODEL_API_KEY")),baseUrl:E(g("OPENAI_BASE_URL"),g("MODEL_BASE_URL")),model:E(g("OPENAI_MODEL"),g("MODEL_NAME"))}}}function Bt(){let e=g("TOOLNET_LLM_PROVIDER"),o=e&&ee(e)?e:Ge(),t=P(o),n=oe(o);return{provider:o,apiKey:E(g("TOOLNET_LLM_API_KEY"),n.apiKey),baseUrl:E(g("TOOLNET_LLM_BASE_URL"),n.baseUrl,t.defaultBaseUrl),model:E(g("TOOLNET_LLM_MODEL"),n.model,t.defaultModel),accountId:E(g("TOOLNET_LLM_ACCOUNT_ID"),n.accountId)}}function $t(){let e=g("TOOLNET_EMBEDDING_PROVIDER");return e==="local"?"local":e&&ee(e)?e:g("HF_TOKEN")||g("HF_EMBEDDING_MODEL")?"huggingface":"local"}function vt(){let e=$t();if(e==="local")return{provider:"local",model:E(g("TOOLNET_EMBEDDING_MODEL"),g("LOCAL_EMBEDDING_MODEL"))};let o=P(e),t,n,r,s;switch(e){case"huggingface":t=g("HF_TOKEN"),n=g("HF_INFERENCE_BASE_URL"),r=g("HF_EMBEDDING_MODEL");break;case"openai-compatible":t=g("OPENAI_API_KEY"),n=g("OPENAI_BASE_URL"),r=g("OPENAI_EMBEDDING_MODEL");break;case"cloudflare":t=g("CLOUDFLARE_API_TOKEN"),n=g("CLOUDFLARE_AI_BASE_URL"),r=g("CLOUDFLARE_EMBEDDING_MODEL"),s=g("CLOUDFLARE_ACCOUNT_ID");break;default:t=oe(e).apiKey,n=oe(e).baseUrl,r=g(`${e.toUpperCase().replace(/-/g,"_")}_EMBEDDING_MODEL`)}let i=E(g("TOOLNET_EMBEDDING_ACCOUNT_ID"),s),c=E(g("TOOLNET_EMBEDDING_BASE_URL"),n,o.defaultBaseUrl),a=e==="cloudflare"&&!c&&i?`https://api.cloudflare.com/client/v4/accounts/${i}/ai/v1`:c;return{provider:e,apiKey:E(g("TOOLNET_EMBEDDING_API_KEY"),t),baseUrl:a,model:E(g("TOOLNET_EMBEDDING_MODEL"),r),accountId:i}}function Yt(){let e=Bt(),o=vt();return{llm:e,embedding:o,legacy:{llm:!g("TOOLNET_LLM_PROVIDER")&&!!je(),embedding:!g("TOOLNET_EMBEDDING_PROVIDER")&&!!(g("HF_TOKEN")||g("HF_EMBEDDING_MODEL"))}}}function Je(e=Ge()){let o=Yt().llm;if(e===o.provider)return{id:e,apiKey:o.apiKey,baseUrl:o.baseUrl,model:o.model,accountId:o.accountId};let t=oe(e);return{id:e,apiKey:t.apiKey,baseUrl:t.baseUrl,model:t.model,accountId:t.accountId}}var Le=class extends Error{status;constructor(o,t){super(o),this.name="AiHttpError",this.status=t}};async function w(e,o,t=3e4){let n=new AbortController,r=setTimeout(()=>n.abort(),t);r.unref?.();try{let s=await fetch(e,{...o,signal:n.signal}),i=await s.text();if(!s.ok){let c=i;try{let a=JSON.parse(i);c=a.error?.message??a.message??i}catch{}throw new Le(c||`HTTP ${s.status}`,s.status)}return i.trim()?JSON.parse(i):{}}finally{clearTimeout(r)}}function te(e,o){return`${e.replace(/\/+$/,"")}/${o.replace(/^\/+/,"")}`}var ne=class{constructor(o){this.config=o}config;id="cloudflare";model(){let o=this.config.model?.trim();if(!o)throw new Error("cloudflare: MODEL is not configured");return o}async generate(o){let t=this.config.accountId?.trim(),n=this.config.apiKey?.trim();if(!t)throw new Error("cloudflare: ACCOUNT ID is not configured");if(!n)throw new Error("cloudflare: API TOKEN is not configured");let r=this.model(),i=`${(this.config.baseUrl?.trim()||`https://api.cloudflare.com/client/v4/accounts/${t}/ai/run`).replace(/\/+$/,"")}/${r}`,c=await w(i,{method:"POST",headers:{authorization:`Bearer ${n}`,"content-type":"application/json",...this.config.headers},body:JSON.stringify({messages:o.messages,temperature:o.temperature,max_tokens:o.maxTokens})}),a=c.result?.response?.trim();if(!a)throw new Error(c.errors?.[0]?.message??"cloudflare: empty model response");return{text:a,provider:"cloudflare",model:r}}async healthCheck(){let o=Date.now();try{return{ok:!0,provider:"cloudflare",model:(await this.generate({messages:[{role:"user",content:"Reply exactly: OK"}],temperature:0,maxTokens:8})).model,message:"Provider reachable",latencyMs:Date.now()-o}}catch(t){return{ok:!1,provider:"cloudflare",model:this.config.model,message:t instanceof Error?t.message:String(t),latencyMs:Date.now()-o}}}};var re=class{constructor(o){this.config=o}config;id="gemini";model(){let o=this.config.model?.trim();if(!o)throw new Error("gemini: MODEL is not configured");return o.replace(/^models\//,"")}async generate(o){let t=this.config.apiKey?.trim();if(!t)throw new Error("gemini: API KEY is not configured");let n=this.config.baseUrl?.trim()||"https://generativelanguage.googleapis.com/v1beta",r=this.model(),s=o.messages.filter(d=>d.role==="system"),i=o.messages.filter(d=>d.role!=="system").map(d=>({role:d.role==="assistant"?"model":"user",parts:[{text:d.content}]})),c=`${te(n,`models/${encodeURIComponent(r)}:generateContent`)}?key=${encodeURIComponent(t)}`,a=await w(c,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...s.length?{systemInstruction:{parts:[{text:s.map(d=>d.content).join(`

`)}]}}:{},contents:i,generationConfig:{temperature:o.temperature,maxOutputTokens:o.maxTokens}})}),l=a.candidates?.[0]?.content?.parts?.map(d=>d.text??"").join("").trim();if(!l)throw new Error("gemini: empty model response");return{text:l,provider:"gemini",model:r,usage:a.usageMetadata?{inputTokens:a.usageMetadata.promptTokenCount,outputTokens:a.usageMetadata.candidatesTokenCount,totalTokens:a.usageMetadata.totalTokenCount}:void 0}}async healthCheck(){let o=Date.now();try{return{ok:!0,provider:"gemini",model:(await this.generate({messages:[{role:"user",content:"Reply exactly: OK"}],temperature:0,maxTokens:8})).model,message:"Provider reachable",latencyMs:Date.now()-o}}catch(t){return{ok:!1,provider:"gemini",model:this.config.model,message:t instanceof Error?t.message:String(t),latencyMs:Date.now()-o}}}};var ie=class{constructor(o){this.config=o;this.id=o.id}config;id;baseUrl(){let o=this.config.baseUrl?.trim();if(!o)throw new Error(`${this.id}: BASE URL is not configured`);return o}model(){let o=this.config.model?.trim();if(!o)throw new Error(`${this.id}: MODEL is not configured`);return o}headers(){let o={"content-type":"application/json",...this.config.headers};return this.config.apiKey&&(o.authorization=`Bearer ${this.config.apiKey}`),o}async generate(o){let t=this.model(),n=await w(te(this.baseUrl(),"chat/completions"),{method:"POST",headers:this.headers(),body:JSON.stringify({model:t,messages:o.messages,temperature:o.temperature,max_tokens:o.maxTokens,...this.id==="alibaba"?{enable_thinking:!1}:{}})}),r=n.choices?.[0]?.message?.content?.trim();if(!r)throw new Error(`${this.id}: empty model response`);return{text:r,provider:this.id,model:t,usage:n.usage?{inputTokens:n.usage.prompt_tokens,outputTokens:n.usage.completion_tokens,totalTokens:n.usage.total_tokens}:void 0}}async healthCheck(){let o=Date.now();try{let t=await this.generate({messages:[{role:"user",content:"Reply exactly: OK"}],temperature:0,maxTokens:8});return{ok:!0,provider:this.id,model:t.model,message:"Provider reachable",latencyMs:Date.now()-o}}catch(t){return{ok:!1,provider:this.id,model:this.config.model,message:t instanceof Error?t.message:String(t),latencyMs:Date.now()-o}}}};function qe(e=Je()){switch(P(e.id).transport){case"gemini":return new re(e);case"cloudflare":return new ne(e);default:return new ie(e)}}import{existsSync as tn}from"node:fs";import{homedir as nn}from"node:os";import{join as rn}from"node:path";import{spawnSync as sn}from"node:child_process";import{homedir as Ht}from"node:os";import{join as F}from"node:path";function Ve(e={}){return F(e.home??Ht(),".gemini")}function Te(e={}){return F(Ve(e),"config")}function se(e={}){return F(Te(e),"mcp_config.json")}function ce(e={}){return F(Te(e),"hooks.json")}function We(e={}){return F(Ve(e),"antigravity-cli")}function Xe(e="toolnet-memory",o={}){return F(We(o),"plugins",e)}function ze(e={}){return[We(e),Te(e)]}import{homedir as jt}from"node:os";import{join as v}from"node:path";function N(e={}){let o=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return o?v(o,"opencode"):v(e.home??jt(),".config","opencode")}function Qe(e={}){return v(N(e),"opencode.json")}function Ze(e={}){return v(N(e),"plugins")}function eo(e={}){return v(N(e),"AGENTS.md")}import{homedir as oo}from"node:os";import{join as he}from"node:path";function Ae(e={}){return he(e.home??oo(),".claude")}function to(e={}){return he(Ae(e),"settings.json")}function no(e={}){return he(e.home??oo(),".claude.json")}import{homedir as Gt}from"node:os";import{join as Y}from"node:path";function Ce(e={}){return e.kiroHome??process.env.KIRO_HOME??Y(e.home??Gt(),".kiro")}function Jt(e={}){return Y(Ce(e),"settings")}function ro(e={}){return Y(Jt(e),"mcp.json")}function qt(e={}){return Y(Ce(e),"hooks")}function io(e={}){return Y(qt(e),"toolnet-memory.json")}function so(e={}){return[Ce(e)]}import{homedir as Vt}from"node:os";import{join as ae}from"node:path";function le(e={}){return e.cursorHome??ae(e.home??Vt(),".cursor")}function Wt(e={}){return e.cursorConfigDir??process.env.CURSOR_CONFIG_DIR??(e.xdgConfigHome??process.env.XDG_CONFIG_HOME?ae(e.xdgConfigHome??process.env.XDG_CONFIG_HOME,"cursor"):void 0)??le(e)}function co(e={}){return ae(le(e),"mcp.json")}function ao(e={}){return ae(le(e),"hooks.json")}function lo(e={}){return Array.from(new Set([le(e),Wt(e)]))}import{homedir as Xt}from"node:os";import{join as ge}from"node:path";function Ie(e={}){return e.copilotHome??process.env.COPILOT_HOME??ge(e.home??Xt(),".copilot")}function go(e={}){return ge(Ie(e),"mcp-config.json")}function zt(e={}){return ge(Ie(e),"hooks")}function uo(e={}){return ge(zt(e),"toolnet-memory.json")}function fo(e={}){return[Ie(e)]}import{homedir as Qt}from"node:os";import{join as b}from"node:path";function de(e={}){return e.grokHome??process.env.GROK_HOME??b(e.home??Qt(),".grok")}function mo(e={}){return b(de(e),"config.toml")}function Zt(e={}){return b(de(e),"hooks")}function po(e={}){return b(Zt(e),"toolnet-memory.json")}function Eo(e={}){return[de(e)]}function en(e={}){return b(de(e),"skills")}function on(e={}){return b(en(e),"toolnet-continuity")}function Oo(e={}){return b(on(e),"SKILL.md")}function cn(e){return sn("sh",["-lc",`command -v ${JSON.stringify(e)} >/dev/null 2>&1`],{stdio:"ignore"}).status===0}function S(e){let o=e.commandExists(e.command),t=e.configPaths.filter(s=>tn(s)),n=t.length>0,r=[];o&&r.push(`command:${e.command}`);for(let s of t)r.push(`config:${s}`);return{agent:e.agent,detected:o||n,commandDetected:o,configDetected:n,evidence:r}}function _o(e={}){let o=e.home??nn(),t=e.commandExists??cn,n=e.codexHome??process.env.CODEX_HOME??rn(o,".codex");return[S({agent:"agy",command:"agy",commandExists:t,configPaths:ze({home:o})}),S({agent:"opencode",command:"opencode",commandExists:t,configPaths:[N({home:o,xdgConfigHome:e.xdgConfigHome})]}),S({agent:"claude",command:"claude",commandExists:t,configPaths:[Ae({home:o})]}),S({agent:"kiro",command:"kiro-cli",commandExists:t,configPaths:so({home:o,kiroHome:e.kiroHome})}),S({agent:"cursor",command:"agent",commandExists:t,configPaths:lo({home:o,cursorHome:e.cursorHome,cursorConfigDir:e.cursorConfigDir,xdgConfigHome:e.xdgConfigHome})}),S({agent:"copilot",command:"copilot",commandExists:t,configPaths:fo({home:o,copilotHome:e.copilotHome})}),S({agent:"grok",command:"grok",commandExists:t,configPaths:Eo({home:o,grokHome:e.grokHome})}),S({agent:"codex",command:"codex",commandExists:t,configPaths:[n]})]}import{existsSync as fe,mkdirSync as Co,readFileSync as Io,renameSync as An,writeFileSync as Cn}from"node:fs";import{dirname as In,join as ue}from"node:path";import{existsSync as an,mkdirSync as ln,readFileSync as gn,renameSync as dn,rmSync as un,writeFileSync as fn}from"node:fs";import{dirname as mn}from"node:path";function pn(e){return`'${e.replace(/'/g,"'\\''")}'`}function yo(e={}){let o=e.hooksFile??ce();ln(mn(o),{recursive:!0,mode:448});let t={};if(an(o)){let i;try{i=JSON.parse(gn(o,"utf8"))}catch(c){throw new Error(`Invalid existing Agy hooks.json: ${c instanceof Error?c.message:String(c)}`)}if(typeof i!="object"||i===null||Array.isArray(i))throw new Error("Invalid existing Agy hooks.json: root must be a JSON object.");t=i}let n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=`${pn(n)} session:agy-hook`;t["toolnet-memory"]={enabled:!0,PreToolUse:[{matcher:"view_file|list_dir|find_by_name|grep_search|run_command",hooks:[{type:"command",command:`${r} pre-tool`,timeout:5}]}],PreInvocation:[{type:"command",command:`${r} pre`,timeout:15}],PostInvocation:[{type:"command",command:`${r} post`,timeout:15}],Stop:[{type:"command",command:`${r} stop`,timeout:30}]};let s=`${o}.tmp-${process.pid}-${Date.now()}`;try{fn(s,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),dn(s,o)}finally{un(s,{force:!0})}return o}import{existsSync as En,mkdirSync as On,readFileSync as _n,renameSync as yn,writeFileSync as Ln}from"node:fs";import{dirname as Tn}from"node:path";function H(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function hn(e,o){On(Tn(e),{recursive:!0,mode:448});let t=`${e}.tmp-${process.pid}-${Date.now()}`;Ln(t,`${JSON.stringify(o,null,2)}
`,{encoding:"utf8",mode:384}),yn(t,e)}function Lo(e){if(!En(e))return{};let o=_n(e,"utf8").trim();if(!o)return{};let t;try{t=JSON.parse(o)}catch(n){throw new Error(`Invalid existing Agy MCP config: ${n instanceof Error?n.message:String(n)}`)}if(!H(t))throw new Error("Invalid existing Agy MCP config: root must be a JSON object.");return t}function To(e,o){return H(e)?e.command===o&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function ho(e={}){let o=e.configFile??se(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=Lo(o),s=r.mcpServers;if(s!==void 0&&!H(s))throw new Error("Invalid existing Agy MCP config: mcpServers must be an object.");let i=H(s)?{...s}:{},c=i[n];if(To(c,t))return{installed:!0,changed:!1,configFile:o,serverName:n,command:t,args:["mcp"]};i[n]={command:t,args:["mcp"]};let a={...r,mcpServers:i};hn(o,a);let d=Lo(o).mcpServers;if(!H(d)||!To(d[n],t))throw new Error("Agy MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:o,serverName:n,command:t,args:["mcp"]}}var Mn=`# ToolNet Memory Continuity

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
`;function Mo(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Me(e,o){Co(In(e),{recursive:!0});let t=`${e}.tmp-${process.pid}-${Date.now()}`;Cn(t,o,{encoding:"utf8",mode:384}),An(t,e)}function Ao(e,o){fe(e)&&Io(e,"utf8")===o||Me(e,o)}function So(e){if(!fe(e))return{};let o=Io(e,"utf8").trim();if(!o)return{};let t;try{t=JSON.parse(o)}catch(n){throw new Error(`Invalid legacy Antigravity config ${e}: ${n instanceof Error?n.message:String(n)}`)}if(!Mo(t))throw new Error(`Invalid legacy Antigravity config ${e}: root must be object`);return t}function Sn(e,o){if(!fe(e))return!1;let t=So(e);if(!Mo(t.mcpServers)||!Object.prototype.hasOwnProperty.call(t.mcpServers,o))return!1;let n={...t.mcpServers};return delete n[o],Me(e,`${JSON.stringify({...t,mcpServers:n},null,2)}
`),!0}function Nn(e){if(!fe(e))return!1;let o=So(e);if(!Object.prototype.hasOwnProperty.call(o,"toolnet-memory"))return!1;let t={...o};return delete t["toolnet-memory"],Me(e,`${JSON.stringify(t,null,2)}
`),!0}function No(e={}){let o=e.pluginName??"toolnet-memory",t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.pluginRoot??Xe(o),r=ue(n,"plugin.json"),s=ue(n,"mcp_config.json"),i=ue(n,"hooks.json"),c=ue(n,"rules","toolnet-memory-continuity.md");Co(n,{recursive:!0,mode:448}),Ao(r,`${JSON.stringify({$schema:"https://antigravity.google/schemas/v1/plugin.json",name:o,description:"Persistent project continuity and memory for Antigravity coding sessions."},null,2)}
`),ho({configFile:s,binary:t,serverName:"toolnet-memory"}),yo({hooksFile:i,binary:t}),Ao(c,`${Mn.trim()}
`);let a=e.legacyMcpFile??se(),l=e.legacyHooksFile??ce(),d=[];return a!==s&&Sn(a,"toolnet-memory")&&d.push(a),l!==i&&Nn(l)&&d.push(l),{installed:!0,pluginRoot:n,files:[r,s,i,c],migratedLegacy:d}}import{existsSync as Rn,mkdirSync as ko,readFileSync as kn,writeFileSync as Do}from"node:fs";import{join as Dn}from"node:path";var bn="memory_agent_ask";function bo(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${bn}

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
`.trim()}var Ro="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",Se="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function Pn(){let e=eo();ko(N(),{recursive:!0});let o=`${Ro}
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


${bo()}

${Se}`,t=Rn(e)?kn(e,"utf8"):"",n=t.indexOf(Ro),r=t.indexOf(Se);return n>=0&&r>=n?t=t.slice(0,n)+o+t.slice(r+Se.length):(t=t.trimEnd(),t&&(t+=`

`),t+=o),Do(e,t.trimEnd()+`
`,{encoding:"utf8",mode:384}),e}function Po(e={}){let o=e.directory??Ze();ko(o,{recursive:!0}),Pn();let t=Dn(o,"toolnet-memory.js"),n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=`
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
`;return Do(t,r.trimStart(),{encoding:"utf8",mode:384}),t}import{existsSync as xo,mkdirSync as wn,readFileSync as Fn,renameSync as xn,writeFileSync as Kn}from"node:fs";import{dirname as Ko,join as Un}from"node:path";function x(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Bn(e,o){wn(Ko(e),{recursive:!0});let t=`${e}.tmp-${process.pid}-${Date.now()}`;Kn(t,`${JSON.stringify(o,null,2)}
`,{encoding:"utf8",mode:384}),xn(t,e)}function wo(e){if(!xo(e))return{};let o=Fn(e,"utf8").trim();if(!o)return{};let t;try{t=JSON.parse(o)}catch(n){throw new Error(`Invalid existing OpenCode opencode.json: ${n instanceof Error?n.message:String(n)}`)}if(!x(t))throw new Error("Invalid existing OpenCode opencode.json: root must be a JSON object.");return t}function Fo(e,o){if(!x(e))return!1;let t=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(t)&&t.length===2&&t[0]===o&&t[1]==="mcp"}function $n(e,o){let t=e.mcpServers;if(!x(t)||!Object.prototype.hasOwnProperty.call(t,o))return{root:e,changed:!1};let n={...t};return delete n[o],{root:{...e,mcpServers:n},changed:!0}}function Uo(e={}){let o=e.configFile??Qe(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=Un(Ko(o),"opencode.jsonc"),s=xo(r)?r:void 0,i=wo(o),c=$n(i,n),a=c.root,l=a.mcp;if(l!==void 0&&!x(l))throw new Error("Invalid existing OpenCode config: mcp must be an object.");let d=x(l)?{...l}:{},m=d[n];if(Fo(m,t)&&!c.changed)return{installed:!0,changed:!1,configFile:o,serverName:n,command:[t,"mcp"],preservedJsonc:s};d[n]={type:"local",command:[t,"mcp"],enabled:!0};let f={...a,mcp:d};Bn(o,f);let I=wo(o);if(!x(I.mcp)||!Fo(I.mcp[n],t))throw new Error("OpenCode MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:o,serverName:n,command:[t,"mcp"],preservedJsonc:s}}import{existsSync as vn,mkdirSync as Bo,readFileSync as Yn,writeFileSync as $o}from"node:fs";import{homedir as vo}from"node:os";import{dirname as Yo,join as Ne}from"node:path";function Hn(e){let o=[],t=/"((?:\\.|[^"\\])*)"|'([^']*)'/g,n;for(;n=t.exec(e);){let r=n[1]??n[2]??"";try{o.push(n[1]!==void 0?JSON.parse(`"${r}"`):r)}catch{o.push(r)}}return o}function Ho(e={}){let o=e.configFile??Ne(process.env.CODEX_HOME??Ne(vo(),".codex"),"config.toml"),t=e.previousFile??Ne(vo(),".config","toolnet-memory","codex-notify-previous.json");Bo(Yo(o),{recursive:!0}),Bo(Yo(t),{recursive:!0});let n=vn(o)?Yn(o,"utf8"):"",r=e.binary??"toolnet-memory",s=`notify = [${JSON.stringify(r)}, "session:codex-notify"]`,i=n.split(`
`),c=i.findIndex(f=>/^\s*\[/.test(f));c<0&&(c=i.length);let a=-1,l=-1;for(let f=0;f<c;f+=1)if(/^\s*notify\s*=/.test(i[f])){if(a=f,l=f,i[f].includes("[")&&!i[f].includes("]"))for(;l+1<c&&(l+=1,!i[l].includes("]")););break}let d=[];if(a>=0){let f=i.slice(a,l+1).join(`
`);d=Hn(f),i.splice(a,l-a+1,s)}else c=i.findIndex(f=>/^\s*\[/.test(f)),c<0&&(c=i.length),i.splice(c,0,s);let m=d.length>=2&&d[d.length-1]==="session:codex-notify";return d.length>0&&!m&&$o(t,JSON.stringify(d,null,2)+`
`,{encoding:"utf8",mode:384}),n=i.join(`
`),n.endsWith(`
`)||(n+=`
`),$o(o,n,{encoding:"utf8",mode:384}),{configFile:o,previousFile:t,preservedPrevious:d.length>0&&!m}}import{existsSync as jn,mkdirSync as Gn,readFileSync as Jn,writeFileSync as qn}from"node:fs";import{homedir as Vn}from"node:os";import{dirname as Wn,join as jo}from"node:path";function Xn(e){return`'${e.replace(/'/g,"'\\''")}'`}function Go(e={}){let o=e.hooksFile??jo(process.env.CODEX_HOME??jo(Vn(),".codex"),"hooks.json");Gn(Wn(o),{recursive:!0});let t={};if(jn(o))try{t=JSON.parse(Jn(o,"utf8"))}catch(c){throw new Error(`Invalid existing Codex hooks.json: ${c instanceof Error?c.message:String(c)}`)}let n=t.hooks&&typeof t.hooks=="object"&&!Array.isArray(t.hooks)?t.hooks:{};t.hooks=n;let s=(Array.isArray(n.SessionStart)?n.SessionStart:[]).filter(c=>{try{return!JSON.stringify(c).includes("session:codex-context")}catch{return!0}}),i=e.binary??"toolnet-memory";return s.push({matcher:"startup|resume|clear|compact",hooks:[{type:"command",command:`${Xn(i)} session:codex-context`,timeout:15,additionalContextLimit:1e3,statusMessage:"Loading ToolNet project continuity"}]}),n.SessionStart=s,qn(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),o}import{spawnSync as zn}from"node:child_process";function be(e,o){return zn(e,o,{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}function Jo(e,o){let t=be(e,["mcp","get",o,"--json"]);if(t.status!==0||!t.stdout)return null;try{return JSON.parse(t.stdout)}catch{return null}}function qo(e,o){return e.enabled!==!1&&e.transport?.type==="stdio"&&e.transport?.command===o&&Array.isArray(e.transport?.args)&&e.transport?.args.length===1&&e.transport.args[0]==="mcp"}function Vo(e={}){let o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=e.codexBinary??"codex",n=e.serverName??"toolnet-memory",r=Jo(t,n);if(r&&qo(r,o))return{installed:!0,changed:!1,serverName:n,command:o,args:["mcp"]};if(r){let c=be(t,["mcp","remove",n]);if(c.status!==0)return{installed:!1,changed:!1,serverName:n,command:o,args:["mcp"],error:(c.stderr||c.stdout||"Unable to remove old ToolNet MCP configuration.").trim()}}let s=be(t,["mcp","add",n,"--",o,"mcp"]);if(s.status!==0)return{installed:!1,changed:!1,serverName:n,command:o,args:["mcp"],error:(s.stderr||s.stdout||"Unable to register ToolNet MCP.").trim()};let i=Jo(t,n);return!i||!qo(i,o)?{installed:!1,changed:!0,serverName:n,command:o,args:["mcp"],error:"Codex accepted MCP registration but verification did not match expected ToolNet command."}:{installed:!0,changed:!0,serverName:n,command:o,args:["mcp"]}}import{existsSync as Qn,mkdirSync as Zn,readFileSync as er,renameSync as or,rmSync as tr,writeFileSync as nr}from"node:fs";import{dirname as rr}from"node:path";function j(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function ir(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function sr(e){if(!Qn(e))return{};let o;try{o=JSON.parse(er(e,"utf8"))}catch(t){throw new Error(`Invalid existing Claude settings.json: ${t instanceof Error?t.message:String(t)}`)}if(!j(o))throw new Error("Invalid existing Claude settings.json: root must be a JSON object.");return o}function Re(e){if(e===void 0)return[];if(!Array.isArray(e))throw new Error("Invalid existing Claude settings.json: hook event must be an array.");let o=[];for(let t of e){if(!j(t)){o.push(t);continue}let n=t.hooks;if(!Array.isArray(n)){o.push(t);continue}let r=n.filter(s=>{if(!j(s))return!0;let i=s.command;return!(typeof i=="string"&&i.includes("session:claude-hook"))});r.length!==0&&o.push({...t,hooks:r})}return o}function ke(e){return{type:"command",command:e,timeout:10}}function cr(e,o){Zn(rr(e),{recursive:!0,mode:448});let t=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{nr(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),or(t,e)}finally{tr(t,{force:!0})}}function Wo(e={}){let o=e.settingsFile??to(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=sr(o),r=n.hooks;if(r!==void 0&&!j(r))throw new Error("Invalid existing Claude settings.json: hooks must be an object.");let s=j(r)?{...r}:{},i=`${ir(t)} session:claude-hook`,c=Re(s.SessionStart);c.push({matcher:"startup|resume|clear|compact",hooks:[ke(i)]}),s.SessionStart=c;let a=Re(s.PostToolUse);a.push({matcher:"Edit|Write",hooks:[ke(i)]}),s.PostToolUse=a;let l=Re(s.Stop);l.push({hooks:[ke(i)]}),s.Stop=l;let d={...n,hooks:s},m=JSON.stringify(n),f=JSON.stringify(d);return m===f?{settingsFile:o,changed:!1}:(cr(o,d),{settingsFile:o,changed:!0})}import{existsSync as ar,mkdirSync as lr,readFileSync as gr,renameSync as dr,rmSync as ur,writeFileSync as fr}from"node:fs";import{dirname as mr}from"node:path";function G(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Xo(e){if(!ar(e))return{};let o;try{o=JSON.parse(gr(e,"utf8"))}catch(t){throw new Error(`Invalid existing Claude Code config: ${t instanceof Error?t.message:String(t)}`)}if(!G(o))throw new Error("Invalid existing Claude Code config: root must be a JSON object.");return o}function zo(e,o){if(!G(e))return!1;let t=e.args;return e.type==="stdio"&&e.command===o&&Array.isArray(t)&&t.length===1&&t[0]==="mcp"}function pr(e,o){lr(mr(e),{recursive:!0});let t=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{fr(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),dr(t,e)}finally{ur(t,{force:!0})}}function Qo(e={}){let o=e.stateFile??no(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=Xo(o),s=r.mcpServers;if(s!==void 0&&!G(s))throw new Error("Invalid existing Claude Code config: mcpServers must be an object.");let i=G(s)?{...s}:{},c=i[n];if(zo(c,t))return{installed:!0,changed:!1,configFile:o,serverName:n,command:[t,"mcp"],repaired:!1};let a=c!==void 0;i[n]={type:"stdio",command:t,args:["mcp"]},pr(o,{...r,mcpServers:i});let d=Xo(o).mcpServers;if(!G(d)||!zo(d[n],t))throw new Error("Claude Code MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:o,serverName:n,command:[t,"mcp"],repaired:a}}function Zo(e={}){let o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=Wo({binary:o,settingsFile:e.settingsFile}),n=Qo({binary:o,stateFile:e.stateFile});return{hooks:t,mcp:n,files:[t.settingsFile,n.configFile]}}import{existsSync as Er,mkdirSync as Or,readFileSync as _r,renameSync as yr,rmSync as Lr,writeFileSync as Tr}from"node:fs";import{dirname as hr}from"node:path";var K="ToolNet Memory - ";function tt(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Ar(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function et(e){if(!Er(e))return{};let o=_r(e,"utf8").trim();if(!o)return{};let t;try{t=JSON.parse(o)}catch(n){throw new Error(`Invalid existing Kiro hooks file: ${n instanceof Error?n.message:String(n)}`)}if(!tt(t))throw new Error("Invalid existing Kiro hooks file: root must be a JSON object.");return t}function ot(e){return tt(e)?typeof e.name=="string"&&e.name.startsWith(K):!1}function J(e){return{type:"command",command:e}}function Cr(e){return[{name:`${K}Session Start`,description:"Inject compact local ToolNet continuity and capture Kiro session activation.",trigger:"SessionStart",action:J(e),timeout:10,enabled:!0},{name:`${K}Prompt Continuity`,description:"Capture prompts and refresh ToolNet guidance only for resume/continue requests.",trigger:"UserPromptSubmit",action:J(e),timeout:10,enabled:!0},{name:`${K}Raw History Guard`,description:"Prevent Kiro from reconstructing continuity from raw ToolNet/agent session history.",trigger:"PreToolUse",matcher:"*",action:J(e),timeout:10,enabled:!0},{name:`${K}Tool Capture`,description:"Capture durable tool activity while filtering noisy read-only events.",trigger:"PostToolUse",matcher:"*",action:J(e),timeout:15,enabled:!0},{name:`${K}Final Flush`,description:"Flush pending Kiro WAL events when the assistant finishes a turn.",trigger:"Stop",action:J(e),timeout:30,enabled:!0}]}function Ir(e,o){Or(hr(e),{recursive:!0,mode:448});let t=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Tr(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),yr(t,e)}finally{Lr(t,{force:!0})}}function nt(e={}){let o=e.hooksFile??io(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=et(o);if(n.version!==void 0&&n.version!=="v1")throw new Error(`Unsupported existing Kiro hooks version: ${String(n.version)}`);let r=n.hooks;if(r!==void 0&&!Array.isArray(r))throw new Error("Invalid existing Kiro hooks file: hooks must be an array.");let s=Array.isArray(r)?r.filter(d=>!ot(d)):[],i=`${Ar(t)} session:kiro-hook`,c=Cr(i),a={...n,version:"v1",hooks:[...s,...c]};if(JSON.stringify(n)===JSON.stringify(a))return{hooksFile:o,changed:!1,hookCount:c.length};Ir(o,a);let l=et(o);if(l.version!=="v1"||!Array.isArray(l.hooks)||l.hooks.filter(ot).length!==c.length)throw new Error("Kiro hooks were written but verification failed.");return{hooksFile:o,changed:!0,hookCount:c.length}}import{existsSync as Mr,mkdirSync as Sr,readFileSync as Nr,renameSync as br,rmSync as Rr,writeFileSync as kr}from"node:fs";import{dirname as Dr}from"node:path";function q(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function rt(e){if(!Mr(e))return{};let o=Nr(e,"utf8").trim();if(!o)return{};let t;try{t=JSON.parse(o)}catch(n){throw new Error(`Invalid existing Kiro MCP config: ${n instanceof Error?n.message:String(n)}`)}if(!q(t))throw new Error("Invalid existing Kiro MCP config: root must be a JSON object.");return t}function it(e,o){return q(e)?e.command===o&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&e.disabled===!1:!1}function Pr(e,o){Sr(Dr(e),{recursive:!0,mode:448});let t=`${e}.tmp-${process.pid}-${Date.now()}`;try{kr(t,`${JSON.stringify(o,null,2)}
`,{encoding:"utf8",mode:384}),br(t,e)}finally{Rr(t,{force:!0})}}function st(e={}){let o=e.configFile??ro(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=rt(o),s=r.mcpServers;if(s!==void 0&&!q(s))throw new Error("Invalid existing Kiro MCP config: mcpServers must be an object.");let i=q(s)?{...s}:{},c=i[n];if(it(c,t))return{installed:!0,changed:!1,configFile:o,serverName:n,command:t,args:["mcp"]};i[n]={command:t,args:["mcp"],disabled:!1};let a={...r,mcpServers:i};Pr(o,a);let d=rt(o).mcpServers;if(!q(d)||!it(d[n],t))throw new Error("Kiro MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:o,serverName:n,command:t,args:["mcp"]}}function ct(e={}){let o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=st({binary:o,configFile:e.configFile}),n=nt({binary:o,hooksFile:e.hooksFile});return{installed:t.installed,changed:t.changed||n.changed,mcp:t,hooks:n,files:[t.configFile,n.hooksFile]}}import{existsSync as wr,mkdirSync as Fr,readFileSync as xr,renameSync as Kr,rmSync as Ur,writeFileSync as Br}from"node:fs";import{dirname as $r}from"node:path";function O(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function M(e,o){if(!wr(e))return{};let t=xr(e,"utf8").trim();if(!t)return{};let n;try{n=JSON.parse(t)}catch(r){throw new Error(`Invalid existing ${o} hooks file: ${r instanceof Error?r.message:String(r)}`)}if(!O(n))throw new Error(`Invalid existing ${o} hooks file: root must be a JSON object.`);return n}function U(e,o){Fr($r(e),{recursive:!0,mode:448});let t=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Br(t,`${JSON.stringify(o,null,2)}
`,{encoding:"utf8",mode:384}),Kr(t,e)}finally{Ur(t,{force:!0})}}function De(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}var V=[["sessionStart",10],["beforeSubmitPrompt",10],["preToolUse",10],["postToolUse",15],["afterAgentResponse",15],["stop",30]];function at(e){return O(e)&&typeof e.command=="string"&&e.command.includes("session:cursor-hook")}function vr(e,o,t){let r={type:"command",command:`TOOLNET_HOOK_EVENT=${De(e)} ${De(o)} session:cursor-hook`,timeout:t};return e==="preToolUse"&&(r.matcher=".*"),r}function lt(e={}){let o=e.hooksFile??ao(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=M(o,"Cursor");if(n.version!==void 0&&n.version!==1)throw new Error(`Unsupported existing Cursor hooks version: ${String(n.version)}`);let r=n.hooks;if(r!==void 0&&!O(r))throw new Error("Invalid existing Cursor hooks file: hooks must be an object.");let s=O(r)?{...r}:{};for(let[l,d]of V){let m=s[l];if(m!==void 0&&!Array.isArray(m))throw new Error(`Invalid existing Cursor hooks file: hooks.${l} must be an array.`);let f=Array.isArray(m)?m.filter(I=>!at(I)):[];s[l]=[...f,vr(l,t,d)]}let i={...n,version:1,hooks:s};if(JSON.stringify(n)===JSON.stringify(i))return{hooksFile:o,changed:!1,hookCount:V.length};U(o,i);let c=M(o,"Cursor");if(c.version!==1||!O(c.hooks))throw new Error("Cursor hooks were written but verification failed.");let a=0;for(let[l]of V){let d=c.hooks[l];if(!Array.isArray(d))throw new Error("Cursor hooks were written but verification failed.");a+=d.filter(at).length}if(a!==V.length)throw new Error("Cursor hooks were written but verification failed.");return{hooksFile:o,changed:!0,hookCount:V.length}}import{existsSync as Yr,mkdirSync as Hr,readFileSync as jr,renameSync as Gr,rmSync as Jr,writeFileSync as qr}from"node:fs";import{dirname as Vr}from"node:path";function T(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function B(e,o){if(!Yr(e))return{};let t=jr(e,"utf8").trim();if(!t)return{};let n;try{n=JSON.parse(t)}catch(r){throw new Error(`Invalid existing ${o} MCP config: ${r instanceof Error?r.message:String(r)}`)}if(!T(n))throw new Error(`Invalid existing ${o} MCP config: root must be a JSON object.`);return n}function me(e,o){Hr(Vr(e),{recursive:!0,mode:448});let t=`${e}.tmp-${process.pid}-${Date.now()}`;try{qr(t,`${JSON.stringify(o,null,2)}
`,{encoding:"utf8",mode:384}),Gr(t,e)}finally{Jr(t,{force:!0})}}function gt(e,o){return T(e)?(e.type===void 0||e.type==="stdio")&&e.command===o&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function dt(e={}){let o=e.configFile??co(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=B(o,"Cursor"),s=r.mcpServers;if(s!==void 0&&!T(s))throw new Error("Invalid existing Cursor MCP config: mcpServers must be an object.");let i=T(s)?{...s}:{};if(gt(i[n],t))return{installed:!0,changed:!1,configFile:o,serverName:n,command:t,args:["mcp"]};i[n]={type:"stdio",command:t,args:["mcp"]},me(o,{...r,mcpServers:i});let a=B(o,"Cursor").mcpServers;if(!T(a)||!gt(a[n],t))throw new Error("Cursor MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:o,serverName:n,command:t,args:["mcp"]}}function ut(e={}){let o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=dt({binary:o,configFile:e.configFile}),n=lt({binary:o,hooksFile:e.hooksFile});return{installed:t.installed,changed:t.changed||n.changed,mcp:t,hooks:n,files:[t.configFile,n.hooksFile]}}var W=[["sessionStart",10],["userPromptSubmitted",10],["userPromptTransformed",10],["preToolUse",10],["postToolUse",15],["agentStop",30]];function Wr(e){if(typeof e.command=="string")return e.command;if(typeof e.bash=="string")return e.bash}function ft(e){return O(e)&&Wr(e)?.includes("session:copilot-hook")===!0}function Xr(e,o,t){let n={type:"command",command:`${o} session:copilot-hook`,env:{TOOLNET_HOOK_EVENT:e},timeoutSec:t};return e==="preToolUse"&&(n.matcher=".*"),n}function mt(e={}){let o=e.hooksFile??uo(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=M(o,"GitHub Copilot CLI");if(n.version!==void 0&&n.version!==1)throw new Error(`Unsupported existing GitHub Copilot CLI hooks version: ${String(n.version)}`);let r=n.hooks;if(r!==void 0&&!O(r))throw new Error("Invalid existing GitHub Copilot CLI hooks file: hooks must be an object.");let s=O(r)?{...r}:{};for(let[l,d]of W){let m=s[l];if(m!==void 0&&!Array.isArray(m))throw new Error(`Invalid existing GitHub Copilot CLI hooks file: hooks.${l} must be an array.`);let f=Array.isArray(m)?m.filter(I=>!ft(I)):[];s[l]=[...f,Xr(l,t,d)]}let i={...n,version:1,hooks:s};if(JSON.stringify(n)===JSON.stringify(i))return{hooksFile:o,changed:!1,hookCount:W.length};U(o,i);let c=M(o,"GitHub Copilot CLI");if(c.version!==1||!O(c.hooks))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");let a=0;for(let[l]of W){let d=c.hooks[l];if(!Array.isArray(d))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");a+=d.filter(ft).length}if(a!==W.length)throw new Error("GitHub Copilot CLI hooks were written but verification failed.");return{hooksFile:o,changed:!0,hookCount:W.length}}function pt(e,o){return T(e)?(e.type===void 0||e.type==="local"||e.type==="stdio")&&e.command===o&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&Array.isArray(e.tools)&&e.tools.length===1&&e.tools[0]==="*":!1}function Et(e={}){let o=e.configFile??go(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=B(o,"GitHub Copilot CLI"),s=r.mcpServers;if(s!==void 0&&!T(s))throw new Error("Invalid existing GitHub Copilot CLI MCP config: mcpServers must be an object.");let i=T(s)?{...s}:{};if(pt(i[n],t))return{installed:!0,changed:!1,configFile:o,serverName:n,command:t,args:["mcp"]};i[n]={type:"stdio",command:t,args:["mcp"],tools:["*"]},me(o,{...r,mcpServers:i});let a=B(o,"GitHub Copilot CLI").mcpServers;if(!T(a)||!pt(a[n],t))throw new Error("GitHub Copilot CLI MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:o,serverName:n,command:t,args:["mcp"]}}function Ot(e={}){let o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=Et({binary:o,configFile:e.configFile}),n=mt({binary:o,hooksFile:e.hooksFile});return{installed:t.installed,changed:t.changed||n.changed,mcp:t,hooks:n,files:[t.configFile,n.hooksFile]}}import{existsSync as zr,mkdirSync as Qr,readFileSync as _t,renameSync as Zr,rmSync as ei,writeFileSync as oi}from"node:fs";import{dirname as ti}from"node:path";var Pe=`---
name: toolnet-continuity
description: Restore previous ToolNet project work when the user asks to continue, resume, pick up, finish unfinished work, or asks where work stopped.
when-to-use: continue, resume, pick up, carry on, ti\u1EBFp t\u1EE5c, l\xE0m ti\u1EBFp, l\xE0m n\u1ED1t, \u0111ang l\xE0m \u0111\u1EBFn \u0111\xE2u, d\u1EEBng \u1EDF \u0111\xE2u
---

# ToolNet Continuity

When the user asks to continue or resume previous work:

1. Use the ToolNet Memory MCP server as the continuity source.
2. Invoke \`memory_agent_ask\` before exploring old history if the current
   ToolNet handoff is missing, stale, or ambiguous.
3. Prefer \`mode="local"\` for current task, last file, blocker, completed
   work, TODOs, and next action.
4. Use \`mode="ai"\` only when continuity requires synthesis.
5. Do not reconstruct previous work from:
   - \`.toolnet/sessions/**\`
   - ToolNet \`events.jsonl\` or \`state.json\`
   - raw transcripts
   - another coding agent's private session/history files
6. After ToolNet continuity is known, verify current git and repository
   source truth before changing code.
7. Do not ask the user to repeat context ToolNet already provides.

Current repository evidence overrides stale memory.
`;function ni(e,o){Qr(ti(e),{recursive:!0,mode:448});let t=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{oi(t,o,{encoding:"utf8",mode:384}),Zr(t,e)}finally{ei(t,{force:!0})}}function yt(e={}){let o=e.skillFile??Oo();if(zr(o)&&_t(o,"utf8")===Pe)return{skillFile:o,changed:!1};if(ni(o,Pe),_t(o,"utf8")!==Pe)throw new Error("Grok ToolNet continuity skill was written but verification failed.");return{skillFile:o,changed:!0}}var X=[["SessionStart",10],["UserPromptSubmit",10],["PreToolUse",10],["PostToolUse",15],["Stop",30]];function Lt(e){return!O(e)||!Array.isArray(e.hooks)?!1:e.hooks.some(o=>O(o)&&typeof o.command=="string"&&o.command.includes("session:grok-hook"))}function ri(e,o,t){let n={hooks:[{type:"command",command:`${o} session:grok-hook`,timeout:t,env:{TOOLNET_HOOK_EVENT:e}}]};return e==="PreToolUse"&&(n.matcher=".*"),n}function Tt(e={}){let o=e.hooksFile??po(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=M(o,"Grok Build"),r=n.hooks;if(r!==void 0&&!O(r))throw new Error("Invalid existing Grok Build hooks file: hooks must be an object.");let s=O(r)?{...r}:{};for(let[l,d]of X){let m=s[l];if(m!==void 0&&!Array.isArray(m))throw new Error(`Invalid existing Grok Build hooks file: hooks.${l} must be an array.`);let f=Array.isArray(m)?m.filter(I=>!Lt(I)):[];s[l]=[...f,ri(l,t,d)]}let i={...n,hooks:s};if(JSON.stringify(n)===JSON.stringify(i))return{hooksFile:o,changed:!1,hookCount:X.length};U(o,i);let c=M(o,"Grok Build");if(!O(c.hooks))throw new Error("Grok Build hooks were written but verification failed.");let a=0;for(let[l]of X){let d=c.hooks[l];if(!Array.isArray(d))throw new Error("Grok Build hooks were written but verification failed.");a+=d.filter(Lt).length}if(a!==X.length)throw new Error("Grok Build hooks were written but verification failed.");return{hooksFile:o,changed:!0,hookCount:X.length}}import{existsSync as ii,mkdirSync as si,readFileSync as ci,renameSync as ai,rmSync as li,writeFileSync as gi}from"node:fs";import{dirname as di}from"node:path";function ht(e){return ii(e)?ci(e,"utf8"):""}function ui(e,o){si(di(e),{recursive:!0,mode:448});let t=`${e}.tmp-${process.pid}-${Date.now()}`;try{gi(t,o,{encoding:"utf8",mode:384}),ai(t,e)}finally{li(t,{force:!0})}}function we(e){return e.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t")}function fi(e){return`[mcp_servers."${we(e)}"]`}function mi(e,o){return[fi(e),`command = "${we(o)}"`,'args = ["mcp"]',"enabled = true"].join(`
`)}function pi(e){let o=e.trim();return o.startsWith("[")&&o.includes("]")}function pe(e){return e.trim().replace(/\s+/g,"")}function Ei(e){return new Set([pe(`[mcp_servers.${e}]`),pe(`[mcp_servers."${e}"]`),pe(`[mcp_servers.'${e}']`)])}function Ct(e,o){let t=e.split(/\r?\n/),n=Ei(o),r=-1;for(let d=0;d<t.length;d+=1){let m=pe(t[d].replace(/\s+#.*$/,""));if(n.has(m)){r=d;break}}if(r<0)return null;let s=t.length;for(let d=r+1;d<t.length;d+=1)if(pi(t[d])){s=d;break}let i=[],c=0;for(let d of t)i.push(c),c+=d.length+1;let a=i[r]??0,l=s>=t.length?e.length:i[s]??e.length;return{start:a,end:l}}function Oi(e,o,t){let n=`${mi(o,t)}
`,r=Ct(e,o);if(r){let s=e.slice(0,r.start),i=e.slice(r.end);return`${s}${n}${i.replace(/^\n+/,"")}`}return e.trim()?`${e.replace(/\s*$/,"")}

${n}`:n}function At(e,o,t){let n=Ct(e,o);if(!n)return!1;let r=e.slice(n.start,n.end);return r.includes(`command = "${we(t)}"`)&&/args\s*=\s*\[\s*"mcp"\s*\]/.test(r)&&/enabled\s*=\s*true/.test(r)}function It(e={}){let o=e.configFile??mo(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=ht(o);if(At(r,n,t))return{installed:!0,changed:!1,configFile:o,serverName:n,command:t,args:["mcp"]};let s=Oi(r,n,t);ui(o,s);let i=ht(o);if(!At(i,n,t))throw new Error("Grok Build MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:o,serverName:n,command:t,args:["mcp"]}}function Mt(e={}){let o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=It({binary:o,configFile:e.configFile}),n=Tt({binary:o,hooksFile:e.hooksFile}),r=yt({skillFile:e.skillFile});return{installed:t.installed,changed:t.changed||n.changed||r.changed,mcp:t,hooks:n,skill:r,files:[t.configFile,n.hooksFile,r.skillFile]}}function St(){return _o()}function Fe(e={}){let o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=[],n=e.detections??St(),r=new Map(n.map(s=>[s.agent,s.detected]));if(!(e.force===!0||r.get("agy")===!0))t.push({agent:"agy",detected:!1,installed:!1,targets:[]});else try{let i=No({binary:o});t.push({agent:"agy",detected:!0,installed:!0,targets:i.files})}catch(i){t.push({agent:"agy",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("opencode")===!0))t.push({agent:"opencode",detected:!1,installed:!1,targets:[]});else try{let i=Po({binary:o}),c=Uo({binary:o});t.push({agent:"opencode",detected:!0,installed:!0,targets:[i,c.configFile,`mcp:${c.serverName}`]})}catch(i){t.push({agent:"opencode",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("claude")===!0))t.push({agent:"claude",detected:!1,installed:!1,targets:[]});else try{let i=Zo({binary:o});t.push({agent:"claude",detected:!0,installed:!0,targets:[i.hooks.settingsFile,i.mcp.configFile,`mcp:${i.mcp.serverName}`]})}catch(i){t.push({agent:"claude",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("kiro")===!0))t.push({agent:"kiro",detected:!1,installed:!1,targets:[]});else try{let i=ct({...e.kiro??{},binary:o});t.push({agent:"kiro",detected:!0,installed:!0,targets:[i.mcp.configFile,`mcp:${i.mcp.serverName}`,i.hooks.hooksFile]})}catch(i){t.push({agent:"kiro",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("cursor")===!0))t.push({agent:"cursor",detected:!1,installed:!1,targets:[]});else try{let i=ut({...e.cursor??{},binary:o});t.push({agent:"cursor",detected:!0,installed:!0,targets:[i.mcp.configFile,`mcp:${i.mcp.serverName}`,i.hooks.hooksFile]})}catch(i){t.push({agent:"cursor",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("copilot")===!0))t.push({agent:"copilot",detected:!1,installed:!1,targets:[]});else try{let i=Ot({...e.copilot??{},binary:o});t.push({agent:"copilot",detected:!0,installed:!0,targets:[i.mcp.configFile,`mcp:${i.mcp.serverName}`,i.hooks.hooksFile]})}catch(i){t.push({agent:"copilot",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("grok")===!0))t.push({agent:"grok",detected:!1,installed:!1,targets:[]});else try{let i=Mt({...e.grok??{},binary:o});t.push({agent:"grok",detected:!0,installed:!0,targets:[i.mcp.configFile,`mcp:${i.mcp.serverName}`,i.hooks.hooksFile,i.skill.skillFile]})}catch(i){t.push({agent:"grok",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}if(!(e.force===!0||r.get("codex")===!0))t.push({agent:"codex",detected:!1,installed:!1,targets:[]});else try{let i=Ho({binary:o}),c=Go({binary:o}),a=Vo({binary:o});if(!a.installed)throw new Error(a.error??"Codex MCP registration failed");let l=[i.configFile,c,`mcp:${a.serverName}`];i.preservedPrevious&&l.push(i.previousFile),t.push({agent:"codex",detected:!0,installed:!0,targets:l})}catch(i){t.push({agent:"codex",detected:!0,installed:!1,targets:[],error:i instanceof Error?i.message:String(i)})}return t}function Nt(e){switch(e){case"agy":return"Agy / Antigravity";case"opencode":return"OpenCode";case"claude":return"Claude Code";case"kiro":return"Kiro CLI";case"cursor":return"Cursor CLI";case"copilot":return"GitHub Copilot CLI";case"grok":return"Grok Build";case"codex":return"Codex"}}function _i(e){console.log(""),console.log("ToolNet Memory Integration Detection"),console.log("===================================="),console.log("");for(let o of e){let t=Nt(o.agent);if(!o.detected){console.log(`\u25CB ${t}: not detected`);continue}console.log(`\u2713 ${t}: detected`);for(let n of o.evidence)console.log(`  ${n}`)}console.log("")}function yi(e){console.log(""),console.log("ToolNet Memory AI Integrations"),console.log("=============================="),console.log("");for(let o of e){let t=Nt(o.agent);if(!o.detected){console.log(`- ${t}: not detected`);continue}if(o.installed){console.log(`\u2713 ${t}: automatic memory enabled`);continue}console.log(`\u2717 ${t}: integration failed`),o.error&&console.log(`  ${o.error}`)}console.log("")}async function Li(){let e=process.argv.slice(2),o=e.includes("--all"),t=e.includes("--json");if(e.includes("--detect-only")){let s=St();if(t){console.log(JSON.stringify(s,null,2));return}_i(s);return}let r=Fe({force:o});if(t){console.log(JSON.stringify(r,null,2));return}yi(r)}var Ti=process.argv[1]&&(process.argv[1].endsWith("auto-integrate.js")||process.argv[1].endsWith("auto-integrate.ts"));Ti&&Li().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});var xe=Q.join(Ke.homedir(),".config","toolnet-memory"),y=Q.join(xe,".env"),Ii=new Set(["MEMORY_STORAGE_PROVIDER","R2_ACCOUNT_ID","R2_BUCKET","R2_ACCESS_KEY_ID","R2_SECRET_ACCESS_KEY","S3_ENDPOINT","S3_REGION","S3_BUCKET","S3_ACCESS_KEY_ID","S3_SECRET_ACCESS_KEY","S3_FORCE_PATH_STYLE","HF_NAMESPACE","HF_BUCKET","HF_S3_ACCESS_KEY_ID","HF_S3_SECRET_ACCESS_KEY","HF_URL","HF_TOKEN","HF_EMBEDDING_MODEL","TOOLNET_LLM_PROVIDER","TOOLNET_LLM_API_KEY","TOOLNET_LLM_BASE_URL","TOOLNET_LLM_MODEL","TOOLNET_LLM_FALLBACK_1_PROVIDER","TOOLNET_LLM_FALLBACK_1_API_KEY","TOOLNET_LLM_FALLBACK_1_BASE_URL","TOOLNET_LLM_FALLBACK_1_MODEL","TOOLNET_LLM_FALLBACK_1_ACCOUNT_ID","TOOLNET_LLM_FALLBACK_2_PROVIDER","TOOLNET_LLM_FALLBACK_2_API_KEY","TOOLNET_LLM_FALLBACK_2_BASE_URL","TOOLNET_LLM_FALLBACK_2_MODEL","TOOLNET_LLM_FALLBACK_2_ACCOUNT_ID","TOOLNET_LLM_FALLBACK_COOLDOWN_MS","TOOLNET_LLM_MAX_RETRIES","TOOLNET_LLM_ACCOUNT_ID","TOOLNET_EMBEDDING_PROVIDER","TOOLNET_EMBEDDING_API_KEY","TOOLNET_EMBEDDING_BASE_URL","TOOLNET_EMBEDDING_MODEL","TOOLNET_EMBEDDING_ACCOUNT_ID","MEMORY_LOCAL_STORAGE_PATH","MEMORY_LOCAL_CACHE_MB","MEMORY_AUTO_CAPTURE","MEMORY_AUTO_RETRIEVE","MEMORY_AUTO_SUMMARIZE","MEMORY_AUTO_SYNC","MEMORY_MAX_CANDIDATES","MEMORY_RERANK_TOP","MEMORY_FINAL_CONTEXT","MEMORY_TOKEN_BUDGET","TOOLNET_SESSION_LEARNING","TOOLNET_WORK_CONTINUITY","TOOLNET_SEMANTIC_CONTINUITY","TOOLNET_SMART_HANDOFF"]);function Mi(e){let o=new Map;for(let t of e.split(/\r?\n/)){let n=t.trim();if(!n||n.startsWith("#"))continue;let r=n.indexOf("=");if(r===-1)continue;let s=n.slice(0,r).trim(),i=n.slice(r+1).trim();s&&o.set(s,i)}return o}function k(e){let o=e.get("MEMORY_STORAGE_PROVIDER")?.trim();return o==="r2"||o==="s3"||o==="local"||o==="huggingface"?o:e.get("R2_ACCOUNT_ID")&&e.get("R2_BUCKET")?"r2":e.get("S3_BUCKET")?"s3":e.get("HF_BUCKET")&&e.get("HF_S3_ACCESS_KEY_ID")?"huggingface":e.get("MEMORY_LOCAL_STORAGE_PATH")?"local":"r2"}function Z(e){switch(e){case"r2":return"Cloudflare R2";case"s3":return"S3 / S3-compatible";case"huggingface":return"Hugging Face S3";case"local":return"Local";default:return e}}function Dt(e){switch(e){case"r2":return["R2_ACCOUNT_ID","R2_BUCKET","R2_ACCESS_KEY_ID","R2_SECRET_ACCESS_KEY"];case"s3":return["S3_BUCKET","S3_ACCESS_KEY_ID","S3_SECRET_ACCESS_KEY"];case"huggingface":return["HF_BUCKET","HF_S3_ACCESS_KEY_ID","HF_S3_SECRET_ACCESS_KEY"];case"local":return[];default:return[]}}function Pt(e){let o=k(e);return o==="local"?!0:Dt(o).every(t=>!!e.get(t)?.trim())}function Ue(e){return e?e.length<=8?"configured":`${e.slice(0,4)}\u2022\u2022\u2022\u2022${e.slice(-3)}`:"not configured"}function Si(e){let t=["# ==========================================================","# TOOLNET MEMORY","# Generated by: toolnet-memory setup","# Do not commit this file.","# ==========================================================","",`MEMORY_STORAGE_PROVIDER=${k(e)}`,"","# ----------------------------------------------------------","# Cloudflare R2","# ----------------------------------------------------------",`R2_ACCOUNT_ID=${e.get("R2_ACCOUNT_ID")??""}`,`R2_BUCKET=${e.get("R2_BUCKET")??"toolnet-memory"}`,`R2_ACCESS_KEY_ID=${e.get("R2_ACCESS_KEY_ID")??""}`,`R2_SECRET_ACCESS_KEY=${e.get("R2_SECRET_ACCESS_KEY")??""}`,"","# ----------------------------------------------------------","# Generic S3 / S3-compatible","# ----------------------------------------------------------",`S3_ENDPOINT=${e.get("S3_ENDPOINT")??""}`,`S3_REGION=${e.get("S3_REGION")??"us-east-1"}`,`S3_BUCKET=${e.get("S3_BUCKET")??"toolnet-memory"}`,`S3_ACCESS_KEY_ID=${e.get("S3_ACCESS_KEY_ID")??""}`,`S3_SECRET_ACCESS_KEY=${e.get("S3_SECRET_ACCESS_KEY")??""}`,`S3_FORCE_PATH_STYLE=${e.get("S3_FORCE_PATH_STYLE")??"false"}`,"","# ----------------------------------------------------------","# Hugging Face S3","# ----------------------------------------------------------",`HF_NAMESPACE=${e.get("HF_NAMESPACE")??""}`,`HF_BUCKET=${e.get("HF_BUCKET")??"toolnet-memory"}`,`HF_S3_ACCESS_KEY_ID=${e.get("HF_S3_ACCESS_KEY_ID")??""}`,`HF_S3_SECRET_ACCESS_KEY=${e.get("HF_S3_SECRET_ACCESS_KEY")??""}`,`HF_URL=${e.get("HF_URL")??""}`,"","# ----------------------------------------------------------","# AI / LLM - canonical ToolNet configuration","# ----------------------------------------------------------",`TOOLNET_LLM_PROVIDER=${e.get("TOOLNET_LLM_PROVIDER")??""}`,`TOOLNET_LLM_API_KEY=${e.get("TOOLNET_LLM_API_KEY")??""}`,`TOOLNET_LLM_BASE_URL=${e.get("TOOLNET_LLM_BASE_URL")??""}`,`TOOLNET_LLM_MODEL=${e.get("TOOLNET_LLM_MODEL")??""}`,`TOOLNET_LLM_ACCOUNT_ID=${e.get("TOOLNET_LLM_ACCOUNT_ID")??""}`,"","# ----------------------------------------------------------","# LLM fallback chain","# ----------------------------------------------------------",`TOOLNET_LLM_FALLBACK_1_PROVIDER=${e.get("TOOLNET_LLM_FALLBACK_1_PROVIDER")??""}`,`TOOLNET_LLM_FALLBACK_1_API_KEY=${e.get("TOOLNET_LLM_FALLBACK_1_API_KEY")??""}`,`TOOLNET_LLM_FALLBACK_1_BASE_URL=${e.get("TOOLNET_LLM_FALLBACK_1_BASE_URL")??""}`,`TOOLNET_LLM_FALLBACK_1_MODEL=${e.get("TOOLNET_LLM_FALLBACK_1_MODEL")??""}`,`TOOLNET_LLM_FALLBACK_1_ACCOUNT_ID=${e.get("TOOLNET_LLM_FALLBACK_1_ACCOUNT_ID")??""}`,`TOOLNET_LLM_FALLBACK_2_PROVIDER=${e.get("TOOLNET_LLM_FALLBACK_2_PROVIDER")??""}`,`TOOLNET_LLM_FALLBACK_2_API_KEY=${e.get("TOOLNET_LLM_FALLBACK_2_API_KEY")??""}`,`TOOLNET_LLM_FALLBACK_2_BASE_URL=${e.get("TOOLNET_LLM_FALLBACK_2_BASE_URL")??""}`,`TOOLNET_LLM_FALLBACK_2_MODEL=${e.get("TOOLNET_LLM_FALLBACK_2_MODEL")??""}`,`TOOLNET_LLM_FALLBACK_2_ACCOUNT_ID=${e.get("TOOLNET_LLM_FALLBACK_2_ACCOUNT_ID")??""}`,`TOOLNET_LLM_FALLBACK_COOLDOWN_MS=${e.get("TOOLNET_LLM_FALLBACK_COOLDOWN_MS")??"60000"}`,`TOOLNET_LLM_MAX_RETRIES=${e.get("TOOLNET_LLM_MAX_RETRIES")??"1"}`,"","# ----------------------------------------------------------","# Embedding - canonical ToolNet configuration","# ----------------------------------------------------------",`TOOLNET_EMBEDDING_PROVIDER=${e.get("TOOLNET_EMBEDDING_PROVIDER")??""}`,`TOOLNET_EMBEDDING_API_KEY=${e.get("TOOLNET_EMBEDDING_API_KEY")??""}`,`TOOLNET_EMBEDDING_BASE_URL=${e.get("TOOLNET_EMBEDDING_BASE_URL")??""}`,`TOOLNET_EMBEDDING_MODEL=${e.get("TOOLNET_EMBEDDING_MODEL")??""}`,`TOOLNET_EMBEDDING_ACCOUNT_ID=${e.get("TOOLNET_EMBEDDING_ACCOUNT_ID")??""}`,"","# ----------------------------------------------------------","# Embedding - legacy/current compatibility","# ----------------------------------------------------------",`HF_TOKEN=${e.get("HF_TOKEN")??""}`,`HF_EMBEDDING_MODEL=${e.get("HF_EMBEDDING_MODEL")??"sentence-transformers/all-MiniLM-L6-v2"}`,"","# ----------------------------------------------------------","# Local storage/cache","# ----------------------------------------------------------",`MEMORY_LOCAL_STORAGE_PATH=${e.get("MEMORY_LOCAL_STORAGE_PATH")??""}`,`MEMORY_LOCAL_CACHE_MB=${e.get("MEMORY_LOCAL_CACHE_MB")??"200"}`,"","# ----------------------------------------------------------","# Automation","# ----------------------------------------------------------",`MEMORY_AUTO_CAPTURE=${e.get("MEMORY_AUTO_CAPTURE")??"true"}`,`MEMORY_AUTO_RETRIEVE=${e.get("MEMORY_AUTO_RETRIEVE")??"true"}`,`MEMORY_AUTO_SUMMARIZE=${e.get("MEMORY_AUTO_SUMMARIZE")??"true"}`,`MEMORY_AUTO_SYNC=${e.get("MEMORY_AUTO_SYNC")??"true"}`,"","# ----------------------------------------------------------","# Retrieval","# ----------------------------------------------------------",`MEMORY_MAX_CANDIDATES=${e.get("MEMORY_MAX_CANDIDATES")??"50"}`,`MEMORY_RERANK_TOP=${e.get("MEMORY_RERANK_TOP")??"10"}`,`MEMORY_FINAL_CONTEXT=${e.get("MEMORY_FINAL_CONTEXT")??"5"}`,`MEMORY_TOKEN_BUDGET=${e.get("MEMORY_TOKEN_BUDGET")??"2000"}`,"","# ----------------------------------------------------------","# Automatic Session Memory","# ----------------------------------------------------------",`TOOLNET_SESSION_LEARNING=${e.get("TOOLNET_SESSION_LEARNING")??"1"}`,`TOOLNET_WORK_CONTINUITY=${e.get("TOOLNET_WORK_CONTINUITY")??"1"}`,`TOOLNET_SEMANTIC_CONTINUITY=${e.get("TOOLNET_SEMANTIC_CONTINUITY")??"1"}`,`TOOLNET_SMART_HANDOFF=${e.get("TOOLNET_SMART_HANDOFF")??"1"}`],n=[...e.entries()].filter(([r])=>!Ii.has(r));if(n.length>0){t.push("","# ----------------------------------------------------------","# Preserved settings","# ----------------------------------------------------------");for(let[r,s]of n)t.push(`${r}=${s}`)}return`${t.join(`
`)}
`}function _(e){A.mkdirSync(xe,{recursive:!0,mode:448});let o=`${y}.tmp-${process.pid}`;A.writeFileSync(o,Si(e),{encoding:"utf8",mode:384}),A.renameSync(o,y),A.chmodSync(xe,448),A.chmodSync(y,384)}function L(e,o,t,n){let r=t.trim();if(r){e.set(o,r);return}!e.get(o)&&n!==void 0&&e.set(o,n)}async function $(e,o){return h.isTTY?(e.pause(),z.write(o),new Promise(t=>{let n="",r=!1,s=()=>{r||(r=!0,h.off("data",i),h.setRawMode?.(!1),h.pause(),z.write(`
`),e.resume(),t(n))},i=c=>{for(let a of c.toString("utf8")){if(a==="\r"||a===`
`){s();return}if(a===""&&(h.off("data",i),h.setRawMode?.(!1),z.write(`
`),process.exit(130)),a==="\x7F"){n=n.slice(0,-1);continue}n+=a}};h.resume(),h.setRawMode?.(!0),h.on("data",i)})):""}function D(e){return e.trim().replace(/\/+$/,"")}function wt(e){return`https://${e}.r2.cloudflarestorage.com`}async function Be(e){let o=new AbortController,t=setTimeout(()=>o.abort(),15e3);t.unref?.();let n=new Ci({region:e.region,endpoint:e.endpoint||void 0,forcePathStyle:e.forcePathStyle??!1,credentials:{accessKeyId:e.accessKeyId,secretAccessKey:e.secretAccessKey}});try{return await n.send(new Ai({Bucket:e.bucket}),{abortSignal:o.signal}),{ok:!0,message:`Bucket "${e.bucket}" reachable`}}catch(r){return{ok:!1,message:r instanceof Error?r.message:String(r)}}finally{clearTimeout(t),n.destroy()}}async function Ni(e){let o=e.get("R2_ACCOUNT_ID")?.trim()??"",t=e.get("R2_BUCKET")?.trim()??"",n=e.get("R2_ACCESS_KEY_ID")?.trim()??"",r=e.get("R2_SECRET_ACCESS_KEY")?.trim()??"";return!o||!t||!n||!r?{ok:!1,message:"R2 configuration is incomplete"}:Be({endpoint:wt(o),region:"auto",bucket:t,accessKeyId:n,secretAccessKey:r})}async function bi(e){let o=D(e.get("S3_ENDPOINT")??""),t=e.get("S3_REGION")?.trim()||"us-east-1",n=e.get("S3_BUCKET")?.trim()??"",r=e.get("S3_ACCESS_KEY_ID")?.trim()??"",s=e.get("S3_SECRET_ACCESS_KEY")?.trim()??"";return!n||!r||!s?{ok:!1,message:"S3 configuration is incomplete"}:Be({endpoint:o||void 0,region:t,bucket:n,accessKeyId:r,secretAccessKey:s,forcePathStyle:e.get("S3_FORCE_PATH_STYLE")==="true"})}async function Ri(e){let o=D(e.get("HF_URL")??""),t=e.get("HF_BUCKET")?.trim()??"",n=e.get("HF_S3_ACCESS_KEY_ID")?.trim()??"",r=e.get("HF_S3_SECRET_ACCESS_KEY")?.trim()??"";return o?!t||!n||!r?{ok:!1,message:"Hugging Face S3 configuration is incomplete"}:Be({endpoint:o,region:"us-east-1",bucket:t,accessKeyId:n,secretAccessKey:r,forcePathStyle:!0}):{ok:!1,message:"HF_URL / S3 endpoint is required for connection test"}}async function ki(e){let o=e.get("MEMORY_LOCAL_STORAGE_PATH")?.trim()||Q.join(Ke.homedir(),".local","share","toolnet-memory"),t=Q.join(o,`.toolnet-test-${process.pid}-${Date.now()}`);try{return A.mkdirSync(o,{recursive:!0,mode:448}),A.writeFileSync(t,`toolnet-memory
`,{encoding:"utf8",mode:384}),A.unlinkSync(t),{ok:!0,message:`Writable: ${o}`}}catch(n){return{ok:!1,message:n instanceof Error?n.message:String(n)}}}async function Di(e,o){switch(e){case"r2":return Ni(o);case"s3":return bi(o);case"huggingface":return Ri(o);case"local":return ki(o)}}async function Pi(e,o){console.log(""),console.log(`Testing ${Z(e)}...`);let t=await Di(e,o);return t.ok?console.log(`\u2713 ${t.message}`):(console.log("\u2717 Connection test failed"),console.log(`  ${t.message}`)),console.log(""),t}function wi(){console.log(""),console.log("\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557"),console.log("\u2551         TOOLNET MEMORY SETUP         \u2551"),console.log("\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D"),console.log("")}function Fi(e){let o=k(e);console.log("Current configuration"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),console.log(`Storage : ${Z(o)} ${Pt(e)?"\u2713":"\u26A0 incomplete"}`);let t=e.get("TOOLNET_LLM_PROVIDER"),n=e.get("TOOLNET_LLM_MODEL"),r=e.get("TOOLNET_EMBEDDING_PROVIDER");console.log(`LLM     : ${t?`${C(t)}${n?` / ${n}`:""}`:"not configured"}`),console.log(`Embedding: ${r||"legacy/default"}`),console.log("")}async function xi(e){console.log("Setup"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),console.log("  1. Storage"),console.log("  2. AI Model"),console.log("  3. Finish & Save"),console.log("  0. Exit without saving"),console.log("");let o=(await e.question("Choose [1-3]: ")).trim();return o==="1"?"storage":o==="2"?"ai":o==="0"?"exit":"finish"}async function Ki(e,o){console.log(""),console.log("Storage"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),console.log(`  1. Cloudflare R2${o==="r2"?"  \u2713 current":""}`),console.log(`  2. S3 / S3-compatible${o==="s3"?"  \u2713 current":""}`),console.log(`  3. Hugging Face S3${o==="huggingface"?"  \u2713 current":""}`),console.log(`  4. Local${o==="local"?"  \u2713 current":""}`),console.log(""),console.log("  0. Back"),console.log("");let t=(await e.question("Choose storage: ")).trim();return t==="0"?"back":t==="2"?"s3":t==="3"?"huggingface":t==="4"?"local":"r2"}async function Ui(e,o){console.log(""),console.log("Cloudflare R2"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");let t=await e.question(o.get("R2_ACCOUNT_ID")?`ACCOUNT ID [${o.get("R2_ACCOUNT_ID")}]: `:"ACCOUNT ID: "),n=await e.question(o.get("R2_ACCESS_KEY_ID")?`ACCESS KEY ID [${Ue(o.get("R2_ACCESS_KEY_ID"))}]: `:"ACCESS KEY ID: "),r=await e.question(`BUCKET [${o.get("R2_BUCKET")||"toolnet-memory"}]: `);L(o,"R2_ACCOUNT_ID",t),L(o,"R2_ACCESS_KEY_ID",n),L(o,"R2_BUCKET",r,"toolnet-memory");let s=o.get("R2_ACCOUNT_ID")?.trim();s&&console.log(`URL: ${wt(s)}`);let i=await $(e,o.get("R2_SECRET_ACCESS_KEY")?"SECRET ACCESS KEY [configured, Enter = keep]: ":"SECRET ACCESS KEY: ");i.trim()&&o.set("R2_SECRET_ACCESS_KEY",i.trim())}async function Bi(e,o){console.log(""),console.log("S3 / S3-compatible"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");let t=await e.question(o.get("S3_ENDPOINT")?`URL / ENDPOINT [${o.get("S3_ENDPOINT")}]: `:"URL / ENDPOINT [blank = AWS S3]: "),n=await e.question(`REGION [${o.get("S3_REGION")||"us-east-1"}]: `),r=await e.question(o.get("S3_ACCESS_KEY_ID")?`ACCESS KEY ID [${Ue(o.get("S3_ACCESS_KEY_ID"))}]: `:"ACCESS KEY ID: "),s=await e.question(`BUCKET [${o.get("S3_BUCKET")||"toolnet-memory"}]: `),i=o.get("S3_FORCE_PATH_STYLE")==="true",c=await e.question(`FORCE PATH STYLE [${i?"Y":"N"}] (y/n): `);if(t.trim()&&o.set("S3_ENDPOINT",D(t)),L(o,"S3_REGION",n,"us-east-1"),L(o,"S3_ACCESS_KEY_ID",r),L(o,"S3_BUCKET",s,"toolnet-memory"),c.trim()){let l=c.trim().toLowerCase();o.set("S3_FORCE_PATH_STYLE",l==="y"||l==="yes"?"true":"false")}else o.has("S3_FORCE_PATH_STYLE")||o.set("S3_FORCE_PATH_STYLE","false");let a=await $(e,o.get("S3_SECRET_ACCESS_KEY")?"SECRET ACCESS KEY [configured, Enter = keep]: ":"SECRET ACCESS KEY: ");a.trim()&&o.set("S3_SECRET_ACCESS_KEY",a.trim())}async function $i(e,o){console.log(""),console.log("Hugging Face S3"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");let t=await e.question(o.get("HF_NAMESPACE")?`NAMESPACE [${o.get("HF_NAMESPACE")}]: `:"NAMESPACE [optional]: "),n=await e.question(o.get("HF_S3_ACCESS_KEY_ID")?`ACCESS KEY ID [${Ue(o.get("HF_S3_ACCESS_KEY_ID"))}]: `:"ACCESS KEY ID: "),r=await e.question(`BUCKET [${o.get("HF_BUCKET")||"toolnet-memory"}]: `),s=await e.question(o.get("HF_URL")?`URL [${o.get("HF_URL")}]: `:"URL / S3 ENDPOINT: ");L(o,"HF_NAMESPACE",t),L(o,"HF_S3_ACCESS_KEY_ID",n),L(o,"HF_BUCKET",r,"toolnet-memory"),s.trim()&&o.set("HF_URL",D(s));let i=await $(e,o.get("HF_S3_SECRET_ACCESS_KEY")?"SECRET ACCESS KEY [configured, Enter = keep]: ":"SECRET ACCESS KEY: ");i.trim()&&o.set("HF_S3_SECRET_ACCESS_KEY",i.trim())}async function vi(e,o){console.log(""),console.log("Local Storage"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");let t=o.get("MEMORY_LOCAL_STORAGE_PATH")??Q.join(Ke.homedir(),".local","share","toolnet-memory"),n=await e.question(`LOCAL PATH [${t}]: `);L(o,"MEMORY_LOCAL_STORAGE_PATH",n,t)}async function Yi(e,o){let t=new Map(o);for(;;){let n=await Ki(e,k(o));if(n==="back")return;let r=new Map(o);o.set("MEMORY_STORAGE_PROVIDER",n),n==="r2"?await Ui(e,o):n==="s3"?await Bi(e,o):n==="huggingface"?await $i(e,o):await vi(e,o);let s=Dt(n).filter(a=>!o.get(a)?.trim());if(s.length){console.log(""),console.log("\u26A0 Missing required fields:");for(let l of s)console.log(`  - ${l}`);console.log(""),console.log("  1. Retry"),console.log("  2. Save anyway"),console.log("  3. Choose another provider"),console.log("  4. Cancel"),console.log("");let a=(await e.question("Choose [1]: ")).trim()||"1";if(a==="2"){_(o),console.log(""),console.log("\u26A0 Saved with incomplete configuration"),console.log("");return}if(a==="3"){o.clear();for(let[l,d]of r)o.set(l,d);continue}if(a==="4"){o.clear();for(let[l,d]of t)o.set(l,d);console.log(""),console.log("Storage changes cancelled."),console.log("");return}continue}if((await Pi(n,o)).ok){_(o),console.log(`\u2713 ${Z(n)} configuration saved`),console.log(`  ${y}`),console.log("");return}console.log("  1. Retry"),console.log("  2. Save anyway"),console.log("  3. Choose another provider"),console.log("  4. Cancel"),console.log("");let c=(await e.question("Choose [1]: ")).trim()||"1";if(c==="2"){_(o),console.log(""),console.log("\u26A0 Saved even though connection test failed"),console.log("");return}if(c==="3"){o.clear();for(let[a,l]of r)o.set(a,l);continue}if(c==="4"){o.clear();for(let[a,l]of t)o.set(a,l);console.log(""),console.log("Storage changes cancelled."),console.log("");return}}}var R=[{id:"openai-compatible",label:"OpenAI-compatible",apiKeyRequired:!0,baseUrlRequired:!0},{id:"alibaba",label:"Alibaba / DashScope",baseUrl:"https://dashscope-intl.aliyuncs.com/compatible-mode/v1",suggestedModel:"qwen3.6-flash",apiKeyRequired:!0},{id:"openrouter",label:"OpenRouter",baseUrl:"https://openrouter.ai/api/v1",apiKeyRequired:!0},{id:"groq",label:"Groq",baseUrl:"https://api.groq.com/openai/v1",apiKeyRequired:!0},{id:"deepseek",label:"DeepSeek",baseUrl:"https://api.deepseek.com",suggestedModel:"deepseek-v4-flash",apiKeyRequired:!0},{id:"nvidia",label:"NVIDIA NIM",baseUrl:"https://integrate.api.nvidia.com/v1",suggestedModel:"deepseek-ai/deepseek-v4-pro",apiKeyRequired:!0},{id:"gemini",label:"Gemini",baseUrl:"https://generativelanguage.googleapis.com/v1beta",suggestedModel:"gemini-3.6-flash",apiKeyRequired:!0},{id:"huggingface",label:"Hugging Face",baseUrl:"https://router.huggingface.co/v1",apiKeyRequired:!0},{id:"ollama",label:"Ollama / Local",baseUrl:"http://127.0.0.1:11434/v1",apiKeyRequired:!1},{id:"custom",label:"Custom endpoint",apiKeyRequired:!1,baseUrlRequired:!0},{id:"cloudflare",label:"Cloudflare Workers AI",suggestedModel:"@cf/meta/llama-3.1-8b-instruct",apiKeyRequired:!0,accountIdRequired:!0}];function Hi(e){return R.find(o=>o.id===e)}function C(e){return Hi(e)?.label??e??"not configured"}function Ft(e){let o=e.get("TOOLNET_LLM_PROVIDER")?.trim();return R.some(t=>t.id===o)?o:void 0}async function $e(e,o){console.log(""),console.log("AI Model"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),R.forEach((r,s)=>{console.log(`  ${s+1}. ${r.label}${o===r.id?"  \u2713 current":""}`)}),console.log(""),console.log("  0. Back"),console.log("");let t=(await e.question("Choose provider: ")).trim();if(t==="0")return"back";let n=Number(t)-1;return Number.isInteger(n)&&n>=0&&n<R.length?R[n].id:(console.log(""),console.log("\u26A0 Invalid provider selection"),$e(e,o))}function ji(e,o){return!(!e.get("TOOLNET_LLM_MODEL")?.trim()||o.apiKeyRequired&&!e.get("TOOLNET_LLM_API_KEY")?.trim()||o.accountIdRequired&&!e.get("TOOLNET_LLM_ACCOUNT_ID")?.trim()||o.baseUrlRequired&&!e.get("TOOLNET_LLM_BASE_URL")?.trim())}function Gi(e){e.delete("TOOLNET_LLM_API_KEY"),e.delete("TOOLNET_LLM_BASE_URL"),e.delete("TOOLNET_LLM_MODEL"),e.delete("TOOLNET_LLM_ACCOUNT_ID")}async function Ji(e,o,t){console.log(""),console.log(t.label),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");let n=o.get("TOOLNET_LLM_PROVIDER");if(n&&n!==t.id&&Gi(o),o.set("TOOLNET_LLM_PROVIDER",t.id),t.accountIdRequired){let a=o.get("TOOLNET_LLM_ACCOUNT_ID"),l=await e.question(a?`ACCOUNT ID [${a}]: `:"ACCOUNT ID: ");L(o,"TOOLNET_LLM_ACCOUNT_ID",l)}else o.delete("TOOLNET_LLM_ACCOUNT_ID");if(t.apiKeyRequired||t.id==="custom"){let a=o.get("TOOLNET_LLM_API_KEY"),l=await $(e,a?"API KEY [configured, Enter = keep]: ":t.apiKeyRequired?"API KEY: ":"API KEY [optional]: ");l.trim()&&o.set("TOOLNET_LLM_API_KEY",l.trim())}else o.delete("TOOLNET_LLM_API_KEY");if(t.id!=="cloudflare"){let l=o.get("TOOLNET_LLM_BASE_URL")||t.baseUrl||"",m=(await e.question(l?`BASE URL [${l}]: `:t.baseUrlRequired?"BASE URL: ":"BASE URL [optional]: ")).trim()||l;m?o.set("TOOLNET_LLM_BASE_URL",D(m)):o.delete("TOOLNET_LLM_BASE_URL")}else o.delete("TOOLNET_LLM_BASE_URL");let s=o.get("TOOLNET_LLM_MODEL")||t.suggestedModel||"",c=(await e.question(s?`MODEL [${s}]: `:"MODEL: ")).trim()||s;c&&o.set("TOOLNET_LLM_MODEL",c)}function qi(e){let o=Ft(e);if(!o)throw new Error("AI provider is not configured");return{id:o,apiKey:e.get("TOOLNET_LLM_API_KEY")?.trim()||void 0,baseUrl:e.get("TOOLNET_LLM_BASE_URL")?.trim()||void 0,model:e.get("TOOLNET_LLM_MODEL")?.trim()||void 0,accountId:e.get("TOOLNET_LLM_ACCOUNT_ID")?.trim()||void 0}}async function Vi(e){let o=qi(e);console.log(""),console.log(`Testing ${C(o.id)}...`);try{let n=await qe(o).healthCheck();return n.ok?(console.log(`\u2713 Provider reachable${n.latencyMs?` (${n.latencyMs} ms)`:""}`),console.log(`\u2713 Model: ${n.model??o.model??"configured"}`),console.log(""),{ok:!0,message:n.message}):(console.log("\u2717 AI provider test failed"),console.log(`  ${n.message}`),console.log(""),{ok:!1,message:n.message})}catch(t){let n=t instanceof Error?t.message:String(t);return console.log("\u2717 AI provider test failed"),console.log(`  ${n}`),console.log(""),{ok:!1,message:n}}}var Oe=[{id:"local",label:"Local / Hash",apiKeyRequired:!1},{id:"huggingface",label:"Hugging Face",suggestedModel:"sentence-transformers/all-MiniLM-L6-v2",apiKeyRequired:!0},{id:"openai-compatible",label:"OpenAI-compatible",apiKeyRequired:!0,baseUrlRequired:!0},{id:"alibaba",label:"Alibaba / DashScope",baseUrl:"https://dashscope-intl.aliyuncs.com/compatible-mode/v1",suggestedModel:"text-embedding-v4",apiKeyRequired:!0},{id:"openrouter",label:"OpenRouter",baseUrl:"https://openrouter.ai/api/v1",apiKeyRequired:!0},{id:"nvidia",label:"NVIDIA NIM",baseUrl:"https://integrate.api.nvidia.com/v1",apiKeyRequired:!0},{id:"ollama",label:"Ollama / Local",baseUrl:"http://127.0.0.1:11434/v1",apiKeyRequired:!1},{id:"gemini",label:"Gemini",baseUrl:"https://generativelanguage.googleapis.com/v1beta",suggestedModel:"gemini-embedding-001",apiKeyRequired:!0},{id:"cloudflare",label:"Cloudflare Workers AI",suggestedModel:"@cf/baai/bge-base-en-v1.5",apiKeyRequired:!0,accountIdRequired:!0},{id:"custom",label:"Custom OpenAI-compatible endpoint",apiKeyRequired:!1,baseUrlRequired:!0}];function ve(e){return Oe.find(o=>o.id===e)?.label??e??"not configured"}async function xt(e,o){console.log(""),console.log("Embedding Model"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),Oe.forEach((r,s)=>{console.log(`  ${s+1}. ${r.label}${o===r.id?"  \u2713 current":""}`)}),console.log(""),console.log("  0. Back"),console.log("");let t=(await e.question("Choose embedding provider: ")).trim();if(t==="0")return"back";let n=Number(t)-1;return Number.isInteger(n)&&n>=0&&n<Oe.length?Oe[n]:(console.log(""),console.log("\u26A0 Invalid selection"),xt(e,o))}function bt(e){e.delete("TOOLNET_EMBEDDING_API_KEY"),e.delete("TOOLNET_EMBEDDING_BASE_URL"),e.delete("TOOLNET_EMBEDDING_MODEL"),e.delete("TOOLNET_EMBEDDING_ACCOUNT_ID")}async function Wi(e,o,t){let n=o.get("TOOLNET_EMBEDDING_PROVIDER");if(n&&n!==t.id&&bt(o),o.set("TOOLNET_EMBEDDING_PROVIDER",t.id),console.log(""),console.log(t.label),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),t.id==="local"){bt(o),console.log("\u2713 Local embedding selected"),console.log("  No API key required.");return}if(t.accountIdRequired){let a=o.get("TOOLNET_EMBEDDING_ACCOUNT_ID"),l=await e.question(a?`ACCOUNT ID [${a}]: `:"ACCOUNT ID: ");L(o,"TOOLNET_EMBEDDING_ACCOUNT_ID",l)}else o.delete("TOOLNET_EMBEDDING_ACCOUNT_ID");if(t.apiKeyRequired||t.id==="custom"){let a=o.get("TOOLNET_EMBEDDING_API_KEY"),l=await $(e,a?"API KEY [configured, Enter = keep]: ":t.apiKeyRequired?"API KEY: ":"API KEY [optional]: ");l.trim()&&o.set("TOOLNET_EMBEDDING_API_KEY",l.trim())}else o.delete("TOOLNET_EMBEDDING_API_KEY");if(t.id==="cloudflare"){let a=o.get("TOOLNET_EMBEDDING_ACCOUNT_ID")?.trim();if(a){let l=`https://api.cloudflare.com/client/v4/accounts/${a}/ai/v1`;o.set("TOOLNET_EMBEDDING_BASE_URL",l),console.log(`BASE URL: ${l}`)}}else{let l=o.get("TOOLNET_EMBEDDING_BASE_URL")||t.baseUrl||"",m=(await e.question(l?`BASE URL [${l}]: `:t.baseUrlRequired?"BASE URL: ":"BASE URL [optional]: ")).trim()||l;m&&o.set("TOOLNET_EMBEDDING_BASE_URL",D(m))}let s=o.get("TOOLNET_EMBEDDING_MODEL")||t.suggestedModel||"",c=(await e.question(s?`MODEL [${s}]: `:"MODEL: ")).trim()||s;c&&o.set("TOOLNET_EMBEDDING_MODEL",c)}function Xi(e,o){return o.id==="local"?!0:o.apiKeyRequired&&!e.get("TOOLNET_EMBEDDING_API_KEY")?.trim()||o.accountIdRequired&&!e.get("TOOLNET_EMBEDDING_ACCOUNT_ID")?.trim()||o.baseUrlRequired&&!e.get("TOOLNET_EMBEDDING_BASE_URL")?.trim()?!1:!!e.get("TOOLNET_EMBEDDING_MODEL")?.trim()}async function Kt(e){let o=e.get("TOOLNET_EMBEDDING_PROVIDER")?.trim();if(console.log(""),console.log(`Testing embedding: ${ve(o)}...`),o==="local")return console.log("\u2713 Local embedding ready"),console.log(""),!0;let t=e.get("TOOLNET_EMBEDDING_API_KEY")?.trim(),n=e.get("TOOLNET_EMBEDDING_MODEL")?.trim(),r=e.get("TOOLNET_EMBEDDING_BASE_URL")?.trim();try{if(!n)throw new Error("Embedding model is missing");if(o==="huggingface"){if(!t)throw new Error("API key is missing");let s=await fetch(`https://router.huggingface.co/hf-inference/models/${n}/pipeline/feature-extraction`,{method:"POST",headers:{Authorization:`Bearer ${t}`,"Content-Type":"application/json"},body:JSON.stringify({inputs:["toolnet memory test"]})});if(!s.ok)throw new Error(`HTTP ${s.status}: ${await s.text()}`)}else if(o==="gemini"){if(!t)throw new Error("API key is missing");let s=n.replace(/^models\//,"");r=r||"https://generativelanguage.googleapis.com/v1beta";let i=await fetch(`${r.replace(/\/+$/,"")}/models/${encodeURIComponent(s)}:embedContent?key=${encodeURIComponent(t)}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({model:`models/${s}`,content:{parts:[{text:"toolnet memory test"}]}})});if(!i.ok)throw new Error(`HTTP ${i.status}: ${await i.text()}`)}else{if(!r)throw new Error("BASE URL is missing");let s=await fetch(`${r.replace(/\/+$/,"")}/embeddings`,{method:"POST",headers:{"content-type":"application/json",...t?{authorization:`Bearer ${t}`}:{}},body:JSON.stringify({model:n,input:["toolnet memory test"]})});if(!s.ok)throw new Error(`HTTP ${s.status}: ${await s.text()}`);let i=await s.json();if(!Array.isArray(i.data)||!Array.isArray(i.data[0]?.embedding))throw new Error("Invalid embedding response")}return console.log("\u2713 Embedding provider reachable"),console.log(`\u2713 Model: ${n}`),console.log(""),!0}catch(s){return console.log("\u2717 Embedding test failed"),console.log(`  ${s instanceof Error?s.message:String(s)}`),console.log(""),!1}}async function zi(e,o){let t=new Map(o);for(;;){let n=await xt(e,o.get("TOOLNET_EMBEDDING_PROVIDER"));if(n==="back")return;if(await Wi(e,o,n),!Xi(o,n)){console.log(""),console.log("\u26A0 Embedding configuration is incomplete."),console.log(""),console.log("  1. Retry"),console.log("  2. Save anyway"),console.log("  3. Choose another provider"),console.log("  4. Cancel"),console.log("");let i=(await e.question("Choose [1]: ")).trim()||"1";if(i==="2"){_(o);return}if(i==="3")continue;if(i==="4"){o.clear();for(let[c,a]of t)o.set(c,a);return}continue}if(await Kt(o)){_(o),console.log(`\u2713 ${n.label} embedding configuration saved`),console.log(`  ${y}`),console.log("");return}console.log("  1. Retry"),console.log("  2. Save anyway"),console.log("  3. Choose another provider"),console.log("  4. Cancel"),console.log("");let s=(await e.question("Choose [1]: ")).trim()||"1";if(s==="2"){_(o);return}if(s!=="3"&&s==="4"){o.clear();for(let[i,c]of t)o.set(i,c);return}}}async function Qi(e,o){let t=o.get("TOOLNET_LLM_PROVIDER")?.trim();if(!t){console.log(""),console.log("\u26A0 Configure LLM first."),console.log("");return}if(t==="deepseek"||t==="groq"){console.log(""),console.log(`\u26A0 ${C(t)} is configured as LLM-only.`),console.log("Choose Embedding separately."),console.log("");return}o.set("TOOLNET_EMBEDDING_PROVIDER",t);let n=o.get("TOOLNET_LLM_API_KEY"),r=o.get("TOOLNET_LLM_BASE_URL"),s=o.get("TOOLNET_LLM_ACCOUNT_ID");n&&o.set("TOOLNET_EMBEDDING_API_KEY",n),r&&o.set("TOOLNET_EMBEDDING_BASE_URL",r),s&&o.set("TOOLNET_EMBEDDING_ACCOUNT_ID",s);let i="";t==="alibaba"?i="text-embedding-v4":t==="gemini"?i="gemini-embedding-001":t==="cloudflare"?i="@cf/baai/bge-base-en-v1.5":t==="huggingface"&&(i="sentence-transformers/all-MiniLM-L6-v2");let a=(await e.question(i?`EMBEDDING MODEL [${i}]: `:"EMBEDDING MODEL: ")).trim()||i;if(!a){console.log(""),console.log("\u26A0 Embedding model is required."),console.log("");return}if(o.set("TOOLNET_EMBEDDING_MODEL",a),!await Kt(o)){let d=(await e.question("Save anyway? (y/N): ")).trim().toLowerCase();if(d!=="y"&&d!=="yes")return}_(o),console.log(""),console.log("\u2713 LLM credentials reused for Embedding"),console.log(`\u2713 Embedding model: ${a}`),console.log("")}function _e(e){return`TOOLNET_LLM_FALLBACK_${e}`}function ye(e,o){let t=_e(o);for(let n of["PROVIDER","API_KEY","BASE_URL","MODEL","ACCOUNT_ID"])e.delete(`${t}_${n}`)}function Rt(e,o){let t=_e(o),n=e.get(`${t}_PROVIDER`);if(!n)return"not configured";let r=e.get(`${t}_MODEL`);return`${C(n)}${r?` / ${r}`:""}`}async function kt(e,o,t){console.log(""),console.log(`Fallback ${t}`),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");let n=await $e(e,void 0);if(n==="back")return;let r=o.get("TOOLNET_LLM_PROVIDER");if(n===r){console.log(""),console.log("\u26A0 Fallback cannot be the same provider as Primary."),console.log("");return}let s=t===1?2:1,i=o.get(`${_e(s)}_PROVIDER`);if(n===i){console.log(""),console.log("\u26A0 This provider is already used by the other fallback."),console.log("");return}let c=R.find(f=>f.id===n);if(!c)return;let a=_e(t);if(ye(o,t),o.set(`${a}_PROVIDER`,n),c.accountIdRequired){let f=await e.question("ACCOUNT ID: ");f.trim()&&o.set(`${a}_ACCOUNT_ID`,f.trim())}if(c.apiKeyRequired||n==="custom"){let f=await $(e,c.apiKeyRequired?"API KEY: ":"API KEY [optional]: ");f.trim()&&o.set(`${a}_API_KEY`,f.trim())}if(n==="cloudflare"){let f=o.get(`${a}_ACCOUNT_ID`);f&&o.set(`${a}_BASE_URL`,`https://api.cloudflare.com/client/v4/accounts/${f}/ai`)}else{let f=c.baseUrl??"",Ye=(await e.question(f?`BASE URL [${f}]: `:c.baseUrlRequired?"BASE URL: ":"BASE URL [optional]: ")).trim()||f;Ye&&o.set(`${a}_BASE_URL`,D(Ye))}let l=c.suggestedModel??"",m=(await e.question(l?`MODEL [${l}]: `:"MODEL: ")).trim()||l;if(!m){console.log(""),console.log("\u26A0 MODEL is required."),console.log(""),ye(o,t);return}o.set(`${a}_MODEL`,m),_(o),console.log(""),console.log(`\u2713 Fallback ${t} saved`),console.log(`  ${C(n)} / ${m}`),console.log("")}async function Zi(e,o){let t=o.get("TOOLNET_LLM_FALLBACK_COOLDOWN_MS")||"60000",n=o.get("TOOLNET_LLM_MAX_RETRIES")||"1";console.log(""),console.log("Fallback Policy"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");let r=await e.question(`COOLDOWN MS [${t}]: `);if(r.trim()){let i=Number(r.trim());Number.isFinite(i)&&i>=0?o.set("TOOLNET_LLM_FALLBACK_COOLDOWN_MS",String(Math.floor(i))):console.log("\u26A0 Invalid cooldown; keeping previous value.")}let s=await e.question(`MAX RETRIES [${n}]: `);if(s.trim()){let i=Number(s.trim());Number.isFinite(i)&&i>=0&&i<=5?o.set("TOOLNET_LLM_MAX_RETRIES",String(Math.floor(i))):console.log("\u26A0 MAX RETRIES must be between 0 and 5.")}_(o),console.log(""),console.log("\u2713 Fallback policy saved"),console.log("")}async function es(e,o){for(;;){console.log(""),console.log("LLM Fallback"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),console.log(`  Primary    : ${o.get("TOOLNET_LLM_PROVIDER")?`${C(o.get("TOOLNET_LLM_PROVIDER"))} / ${o.get("TOOLNET_LLM_MODEL")||"model not configured"}`:"not configured"}`),console.log(`  Fallback 1 : ${Rt(o,1)}`),console.log(`  Fallback 2 : ${Rt(o,2)}`),console.log(`  Cooldown   : ${o.get("TOOLNET_LLM_FALLBACK_COOLDOWN_MS")||"60000"} ms`),console.log(`  Retries    : ${o.get("TOOLNET_LLM_MAX_RETRIES")||"1"}`),console.log(""),console.log("  1. Configure Fallback 1"),console.log("  2. Configure Fallback 2"),console.log("  3. Remove Fallback 1"),console.log("  4. Remove Fallback 2"),console.log("  5. Retry / cooldown settings"),console.log("  0. Back"),console.log("");let t=(await e.question("Choose: ")).trim();if(t==="0")return;if(t==="1"){await kt(e,o,1);continue}if(t==="2"){await kt(e,o,2);continue}if(t==="3"){ye(o,1),_(o),console.log(""),console.log("\u2713 Fallback 1 removed"),console.log("");continue}if(t==="4"){ye(o,2),_(o),console.log(""),console.log("\u2713 Fallback 2 removed"),console.log("");continue}if(t==="5"){await Zi(e,o);continue}console.log(""),console.log("\u26A0 Invalid selection")}}async function os(e,o){for(;;){console.log(""),console.log("AI Model"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");let t=o.get("TOOLNET_LLM_PROVIDER"),n=o.get("TOOLNET_EMBEDDING_PROVIDER");console.log(`  LLM       : ${t?`${C(t)} / ${o.get("TOOLNET_LLM_MODEL")||"model not configured"}`:"not configured"}`),console.log(`  Embedding : ${n?`${ve(n)} / ${o.get("TOOLNET_EMBEDDING_MODEL")||(n==="local"?"local hash":"model not configured")}`:"legacy/default"}`),console.log(""),console.log("  1. Configure LLM"),console.log("  2. Configure Embedding"),console.log("  3. Use LLM provider credentials for Embedding"),console.log("  4. Configure LLM Fallbacks"),console.log("  0. Back"),console.log("");let r=(await e.question("Choose: ")).trim();if(r==="0")return;if(r==="1"){await ts(e,o);continue}if(r==="2"){await zi(e,o);continue}if(r==="3"){await Qi(e,o);continue}if(r==="4"){await es(e,o);continue}console.log(""),console.log("\u26A0 Invalid selection")}}async function ts(e,o){let t=new Map(o);for(;;){let n=await $e(e,Ft(o));if(n==="back")return;let r=R.find(c=>c.id===n);if(!r)continue;if(await Ji(e,o,r),!ji(o,r)){console.log(""),console.log("\u26A0 AI configuration is incomplete."),console.log(""),console.log("  1. Retry"),console.log("  2. Save anyway"),console.log("  3. Choose another provider"),console.log("  4. Cancel"),console.log("");let c=(await e.question("Choose [1]: ")).trim()||"1";if(c==="2"){_(o),console.log(""),console.log("\u26A0 AI configuration saved without validation"),console.log(`  ${y}`),console.log("");return}if(c==="3")continue;if(c==="4"){o.clear();for(let[a,l]of t)o.set(a,l);console.log(""),console.log("AI changes cancelled."),console.log("");return}continue}if((await Vi(o)).ok){_(o),console.log(`\u2713 ${r.label} configuration saved`),console.log(`  ${y}`),console.log("");return}console.log("  1. Retry"),console.log("  2. Save anyway"),console.log("  3. Choose another provider"),console.log("  4. Cancel"),console.log("");let i=(await e.question("Choose [1]: ")).trim()||"1";if(i==="2"){_(o),console.log(""),console.log("\u26A0 AI configuration saved even though provider test failed"),console.log(`  ${y}`),console.log("");return}if(i!=="3"&&i==="4"){o.clear();for(let[c,a]of t)o.set(c,a);console.log(""),console.log("AI changes cancelled."),console.log("");return}}}function ns(){try{let o=Fe().filter(t=>t.installed);if(o.length===0)return;console.log(""),console.log("Automatic AI memory");for(let t of o){let n=t.agent==="agy"?"Agy / Antigravity":t.agent==="opencode"?"OpenCode":t.agent==="codex"?"Codex":t.agent;console.log(`  \u2713 ${n}`)}}catch{}}function u(e,...o){for(let t of o){let n=e.get(t)?.trim();if(n)return n}}function p(e,o,t){t&&!e.get(o)?.trim()&&e.set(o,t)}function rs(e){let o=!1,t=JSON.stringify([...e.entries()]);if(!e.get("TOOLNET_LLM_PROVIDER")?.trim()){let s;u(e,"GROQ_API_KEY")?s="groq":u(e,"DEEPSEEK_API_KEY")?s="deepseek":u(e,"NVIDIA_API_KEY","NVIDIA_NIM_API_KEY")?s="nvidia":u(e,"OPENROUTER_API_KEY")?s="openrouter":u(e,"ALIBABA_API_KEY","DASHSCOPE_API_KEY")?s="alibaba":u(e,"GEMINI_API_KEY","GOOGLE_API_KEY")?s="gemini":u(e,"CLOUDFLARE_API_TOKEN")&&u(e,"CLOUDFLARE_ACCOUNT_ID")?s="cloudflare":u(e,"HF_TOKEN")?s="huggingface":u(e,"OLLAMA_MODEL","OLLAMA_BASE_URL")?s="ollama":u(e,"OPENAI_API_KEY","MODEL_API_KEY")&&(s="openai-compatible"),s&&e.set("TOOLNET_LLM_PROVIDER",s)}switch(e.get("TOOLNET_LLM_PROVIDER")?.trim()){case"groq":p(e,"TOOLNET_LLM_API_KEY",u(e,"GROQ_API_KEY")),p(e,"TOOLNET_LLM_BASE_URL",u(e,"GROQ_BASE_URL")||"https://api.groq.com/openai/v1"),p(e,"TOOLNET_LLM_MODEL",u(e,"GROQ_MODEL"));break;case"deepseek":p(e,"TOOLNET_LLM_API_KEY",u(e,"DEEPSEEK_API_KEY")),p(e,"TOOLNET_LLM_BASE_URL",u(e,"DEEPSEEK_BASE_URL")||"https://api.deepseek.com"),p(e,"TOOLNET_LLM_MODEL",u(e,"DEEPSEEK_MODEL")||"deepseek-v4-flash");break;case"nvidia":p(e,"TOOLNET_LLM_API_KEY",u(e,"NVIDIA_API_KEY","NVIDIA_NIM_API_KEY")),p(e,"TOOLNET_LLM_BASE_URL",u(e,"NVIDIA_BASE_URL","NVIDIA_NIM_BASE_URL")||"https://integrate.api.nvidia.com/v1"),p(e,"TOOLNET_LLM_MODEL",u(e,"NVIDIA_MODEL","NVIDIA_NIM_MODEL"));break;case"openrouter":p(e,"TOOLNET_LLM_API_KEY",u(e,"OPENROUTER_API_KEY")),p(e,"TOOLNET_LLM_BASE_URL",u(e,"OPENROUTER_BASE_URL")||"https://openrouter.ai/api/v1"),p(e,"TOOLNET_LLM_MODEL",u(e,"OPENROUTER_MODEL"));break;case"alibaba":p(e,"TOOLNET_LLM_API_KEY",u(e,"ALIBABA_API_KEY","DASHSCOPE_API_KEY")),p(e,"TOOLNET_LLM_BASE_URL",u(e,"ALIBABA_BASE_URL","DASHSCOPE_BASE_URL")),p(e,"TOOLNET_LLM_MODEL",u(e,"ALIBABA_MODEL","DASHSCOPE_MODEL"));break;case"gemini":p(e,"TOOLNET_LLM_API_KEY",u(e,"GEMINI_API_KEY","GOOGLE_API_KEY")),p(e,"TOOLNET_LLM_BASE_URL",u(e,"GEMINI_BASE_URL")||"https://generativelanguage.googleapis.com/v1beta"),p(e,"TOOLNET_LLM_MODEL",u(e,"GEMINI_MODEL"));break;case"huggingface":p(e,"TOOLNET_LLM_API_KEY",u(e,"HF_TOKEN")),p(e,"TOOLNET_LLM_BASE_URL",u(e,"HF_INFERENCE_BASE_URL")||"https://router.huggingface.co/v1"),p(e,"TOOLNET_LLM_MODEL",u(e,"HF_LLM_MODEL","HF_MODEL"));break;case"ollama":p(e,"TOOLNET_LLM_API_KEY",u(e,"OLLAMA_API_KEY")),p(e,"TOOLNET_LLM_BASE_URL",u(e,"OLLAMA_BASE_URL")||"http://127.0.0.1:11434/v1"),p(e,"TOOLNET_LLM_MODEL",u(e,"OLLAMA_MODEL"));break;case"cloudflare":p(e,"TOOLNET_LLM_API_KEY",u(e,"CLOUDFLARE_API_TOKEN")),p(e,"TOOLNET_LLM_ACCOUNT_ID",u(e,"CLOUDFLARE_ACCOUNT_ID")),p(e,"TOOLNET_LLM_MODEL",u(e,"CLOUDFLARE_MODEL"));break;case"openai-compatible":p(e,"TOOLNET_LLM_API_KEY",u(e,"OPENAI_API_KEY","MODEL_API_KEY")),p(e,"TOOLNET_LLM_BASE_URL",u(e,"OPENAI_BASE_URL","MODEL_BASE_URL")),p(e,"TOOLNET_LLM_MODEL",u(e,"OPENAI_MODEL","MODEL_NAME"));break}!e.get("TOOLNET_EMBEDDING_PROVIDER")?.trim()&&u(e,"HF_TOKEN")&&(e.set("TOOLNET_EMBEDDING_PROVIDER","huggingface"),p(e,"TOOLNET_EMBEDDING_API_KEY",u(e,"HF_TOKEN")),p(e,"TOOLNET_EMBEDDING_MODEL",u(e,"HF_EMBEDDING_MODEL")||"sentence-transformers/all-MiniLM-L6-v2"));let r=JSON.stringify([...e.entries()]);return o=t!==r,o}function Ee(e,o="not configured"){return e?.trim()||o}function is(e){let o=Z(k(e)),t=e.get("TOOLNET_LLM_PROVIDER"),n=e.get("TOOLNET_LLM_MODEL"),r=e.get("TOOLNET_EMBEDDING_PROVIDER"),s=e.get("TOOLNET_EMBEDDING_MODEL"),i=e.get("TOOLNET_LLM_FALLBACK_1_PROVIDER"),c=e.get("TOOLNET_LLM_FALLBACK_2_PROVIDER");console.log(""),console.log("\u25C7 ToolNet Memory Setup"),console.log(""),console.log("\u25C6 Configuration"),console.log("\u2502"),console.log(`\u251C \u25C6 Storage    \u2014 ${o}`),console.log(`\u251C \u25C6 LLM        \u2014 ${t?`${C(t)} / ${Ee(n)}`:"not configured"}`),console.log(`\u251C \u25C7 Fallback 1 \u2014 ${i?`${C(i)} / ${Ee(e.get("TOOLNET_LLM_FALLBACK_1_MODEL"))}`:"none"}`),console.log(`\u251C \u25C7 Fallback 2 \u2014 ${c?`${C(c)} / ${Ee(e.get("TOOLNET_LLM_FALLBACK_2_MODEL"))}`:"none"}`),console.log(`\u251C \u25C6 Embedding  \u2014 ${r?`${r==="local"?"Local / Hash":ve(r)} / ${Ee(s,r==="local"?"local hash":"not configured")}`:"legacy/default"}`),console.log("\u2502"),console.log(`\u251C \u25C6 Config      \u2014 ${y}`),console.log(`\u251C \u25C6 Permissions \u2014 ${A.statSync(y).mode.toString(8).slice(-3)}`),console.log("\u251C \u25C6 Secrets     \u2014 hidden"),console.log("\u251C \u25C6 Config mode \u2014 canonical TOOLNET_*"),console.log("\u2502"),console.log("\u2514 \u25C6 Setup complete")}function Ut(e){rs(e),e.has("TOOLNET_LLM_FALLBACK_COOLDOWN_MS")||e.set("TOOLNET_LLM_FALLBACK_COOLDOWN_MS","60000"),e.has("TOOLNET_LLM_MAX_RETRIES")||e.set("TOOLNET_LLM_MAX_RETRIES","1"),e.has("MEMORY_STORAGE_PROVIDER")||e.set("MEMORY_STORAGE_PROVIDER",k(e)),e.has("MEMORY_LOCAL_CACHE_MB")||e.set("MEMORY_LOCAL_CACHE_MB","200"),e.has("MEMORY_AUTO_CAPTURE")||e.set("MEMORY_AUTO_CAPTURE","true"),e.has("MEMORY_AUTO_RETRIEVE")||e.set("MEMORY_AUTO_RETRIEVE","true"),e.has("MEMORY_AUTO_SUMMARIZE")||e.set("MEMORY_AUTO_SUMMARIZE","true"),e.has("MEMORY_AUTO_SYNC")||e.set("MEMORY_AUTO_SYNC","true"),e.has("MEMORY_MAX_CANDIDATES")||e.set("MEMORY_MAX_CANDIDATES","50"),e.has("MEMORY_RERANK_TOP")||e.set("MEMORY_RERANK_TOP","10"),e.has("MEMORY_FINAL_CONTEXT")||e.set("MEMORY_FINAL_CONTEXT","5"),e.has("MEMORY_TOKEN_BUDGET")||e.set("MEMORY_TOKEN_BUDGET","2000"),e.has("TOOLNET_SESSION_LEARNING")||e.set("TOOLNET_SESSION_LEARNING","1"),e.has("TOOLNET_WORK_CONTINUITY")||e.set("TOOLNET_WORK_CONTINUITY","1"),e.has("TOOLNET_SEMANTIC_CONTINUITY")||e.set("TOOLNET_SEMANTIC_CONTINUITY","1"),e.has("TOOLNET_SMART_HANDOFF")||e.set("TOOLNET_SMART_HANDOFF","1")}async function ss(e,o){Ut(e),o||_(e),console.log(""),console.log("\u25C7 ToolNet Memory Setup"),console.log(""),console.log("\u25C6 Non-interactive mode"),console.log("\u2502"),console.log(`\u251C \u25C6 Config   \u2014 ${y}`),console.log(`\u251C \u25C6 Storage  \u2014 ${Z(k(e))}`),console.log("\u2502"),console.log("\u2514 \u25C7 Run toolnet-memory setup from an interactive terminal")}async function cs(){let e=A.existsSync(y),o=e?Mi(A.readFileSync(y,"utf8")):new Map,t=new Map(o);if(Ut(t),!h.isTTY||!z.isTTY){await ss(t,e);return}let n=hi.createInterface({input:h,output:z}),r=!1;try{for(;;){wi(),Fi(t);let s=await xi(n);if(s==="storage"){let i=JSON.stringify([...t.entries()]);await Yi(n,t),r=r||i!==JSON.stringify([...t.entries()]);continue}if(s==="ai"){let i=JSON.stringify([...t.entries()]);await os(n,t),r=r||i!==JSON.stringify([...t.entries()]);continue}if(s==="exit"){if(!r){console.log(""),console.log("No changes made.");return}console.log("");let i=(await n.question("Discard unsaved changes? (y/N): ")).trim().toLowerCase();if(i==="y"||i==="yes"){console.log(""),console.log("Changes discarded.");return}continue}_(t),Pt(t)||(console.log(""),console.log("\u26A0 Storage configuration is incomplete.")),ns(),is(t),console.log(""),console.log("Validate:"),console.log("  toolnet-memory provider:status"),console.log("  toolnet-memory provider:test"),console.log("  toolnet-memory doctor"),console.log("");return}}finally{n.close()}}cs().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exit(1)});
