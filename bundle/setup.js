import C from"node:fs";import lo from"node:os";import re from"node:path";import Ds from"node:readline/promises";import{stdin as L,stdout as ne}from"node:process";import{HeadBucketCommand as ws,S3Client as js}from"@aws-sdk/client-s3";var Eo=[{id:"openai-compatible",label:"OpenAI-compatible",requiresApiKey:!0,requiresBaseUrl:!0,transport:"openai-compatible"},{id:"alibaba",label:"Alibaba / DashScope",requiresApiKey:!0,requiresBaseUrl:!0,transport:"openai-compatible"},{id:"openrouter",label:"OpenRouter",defaultBaseUrl:"https://openrouter.ai/api/v1",requiresApiKey:!0,transport:"openai-compatible"},{id:"groq",label:"Groq",defaultBaseUrl:"https://api.groq.com/openai/v1",requiresApiKey:!0,transport:"openai-compatible"},{id:"deepseek",label:"DeepSeek",defaultBaseUrl:"https://api.deepseek.com",defaultModel:"deepseek-v4-flash",requiresApiKey:!0,transport:"openai-compatible"},{id:"nvidia",label:"NVIDIA NIM",defaultBaseUrl:"https://integrate.api.nvidia.com/v1",defaultModel:"deepseek-ai/deepseek-v4-pro",requiresApiKey:!0,transport:"openai-compatible"},{id:"gemini",label:"Gemini",defaultBaseUrl:"https://generativelanguage.googleapis.com/v1beta",requiresApiKey:!0,transport:"gemini"},{id:"huggingface",label:"Hugging Face",defaultBaseUrl:"https://router.huggingface.co/v1",requiresApiKey:!0,transport:"openai-compatible"},{id:"ollama",label:"Ollama / Local",defaultBaseUrl:"http://127.0.0.1:11434/v1",requiresApiKey:!1,transport:"openai-compatible"},{id:"custom",label:"Custom endpoint",requiresApiKey:!1,requiresBaseUrl:!0,transport:"openai-compatible"},{id:"cloudflare",label:"Cloudflare Workers AI",requiresApiKey:!0,requiresAccountId:!0,transport:"cloudflare"}];function x(e){let o=Eo.find(t=>t.id===e);if(!o)throw new Error(`Unsupported AI provider: ${e}`);return o}function se(e){return Eo.some(o=>o.id===e)}function g(e){return process.env[e]?.trim()||void 0}function E(...e){return e.find(o=>!!o?.trim())}function Oo(){if(g("GROQ_API_KEY"))return"groq";if(g("DEEPSEEK_API_KEY"))return"deepseek";if(g("NVIDIA_API_KEY")||g("NVIDIA_NIM_API_KEY"))return"nvidia";if(g("OPENROUTER_API_KEY"))return"openrouter";if(g("ALIBABA_API_KEY")||g("DASHSCOPE_API_KEY"))return"alibaba";if(g("GEMINI_API_KEY")||g("GOOGLE_API_KEY"))return"gemini";if(g("CLOUDFLARE_API_TOKEN")&&g("CLOUDFLARE_ACCOUNT_ID"))return"cloudflare";if(g("HF_TOKEN"))return"huggingface";if(g("OLLAMA_MODEL")||g("OLLAMA_BASE_URL"))return"ollama"}function _o(){let e=g("TOOLNET_LLM_PROVIDER");return e&&se(e)?e:Oo()??"openai-compatible"}function ce(e){let o=x(e);switch(e){case"alibaba":return{provider:e,apiKey:E(g("ALIBABA_API_KEY"),g("DASHSCOPE_API_KEY")),baseUrl:E(g("ALIBABA_BASE_URL"),g("DASHSCOPE_BASE_URL"),o.defaultBaseUrl),model:E(g("ALIBABA_MODEL"),g("DASHSCOPE_MODEL"))};case"openrouter":return{provider:e,apiKey:g("OPENROUTER_API_KEY"),baseUrl:E(g("OPENROUTER_BASE_URL"),o.defaultBaseUrl),model:g("OPENROUTER_MODEL")};case"groq":return{provider:e,apiKey:g("GROQ_API_KEY"),baseUrl:E(g("GROQ_BASE_URL"),o.defaultBaseUrl),model:g("GROQ_MODEL")};case"deepseek":return{provider:e,apiKey:g("DEEPSEEK_API_KEY"),baseUrl:E(g("DEEPSEEK_BASE_URL"),o.defaultBaseUrl),model:E(g("DEEPSEEK_MODEL"),o.defaultModel)};case"nvidia":return{provider:e,apiKey:E(g("NVIDIA_API_KEY"),g("NVIDIA_NIM_API_KEY")),baseUrl:E(g("NVIDIA_BASE_URL"),g("NVIDIA_NIM_BASE_URL"),o.defaultBaseUrl),model:E(g("NVIDIA_MODEL"),g("NVIDIA_NIM_MODEL"),o.defaultModel)};case"gemini":return{provider:e,apiKey:E(g("GEMINI_API_KEY"),g("GOOGLE_API_KEY")),baseUrl:E(g("GEMINI_BASE_URL"),o.defaultBaseUrl),model:g("GEMINI_MODEL")};case"huggingface":return{provider:e,apiKey:g("HF_TOKEN"),baseUrl:E(g("HF_INFERENCE_BASE_URL"),o.defaultBaseUrl),model:E(g("HF_LLM_MODEL"),g("HF_MODEL"))};case"ollama":return{provider:e,apiKey:g("OLLAMA_API_KEY"),baseUrl:E(g("OLLAMA_BASE_URL"),o.defaultBaseUrl),model:g("OLLAMA_MODEL")};case"cloudflare":return{provider:e,accountId:g("CLOUDFLARE_ACCOUNT_ID"),apiKey:g("CLOUDFLARE_API_TOKEN"),baseUrl:g("CLOUDFLARE_AI_BASE_URL"),model:g("CLOUDFLARE_MODEL")};case"custom":return{provider:e,apiKey:g("CUSTOM_AI_API_KEY"),baseUrl:g("CUSTOM_AI_BASE_URL"),model:g("CUSTOM_AI_MODEL")};default:return{provider:"openai-compatible",apiKey:E(g("OPENAI_API_KEY"),g("MODEL_API_KEY")),baseUrl:E(g("OPENAI_BASE_URL"),g("MODEL_BASE_URL")),model:E(g("OPENAI_MODEL"),g("MODEL_NAME"))}}}function In(){let e=g("TOOLNET_LLM_PROVIDER"),o=e&&se(e)?e:_o(),t=x(o),n=ce(o);return{provider:o,apiKey:E(g("TOOLNET_LLM_API_KEY"),n.apiKey),baseUrl:E(g("TOOLNET_LLM_BASE_URL"),n.baseUrl,t.defaultBaseUrl),model:E(g("TOOLNET_LLM_MODEL"),n.model,t.defaultModel),accountId:E(g("TOOLNET_LLM_ACCOUNT_ID"),n.accountId)}}function Tn(){let e=g("TOOLNET_EMBEDDING_PROVIDER");return e==="local"?"local":e&&se(e)?e:g("HF_TOKEN")||g("HF_EMBEDDING_MODEL")?"huggingface":"local"}function Ln(){let e=Tn();if(e==="local")return{provider:"local",model:E(g("TOOLNET_EMBEDDING_MODEL"),g("LOCAL_EMBEDDING_MODEL"))};let o=x(e),t,n,r,i;switch(e){case"huggingface":t=g("HF_TOKEN"),n=g("HF_INFERENCE_BASE_URL"),r=g("HF_EMBEDDING_MODEL");break;case"openai-compatible":t=g("OPENAI_API_KEY"),n=g("OPENAI_BASE_URL"),r=g("OPENAI_EMBEDDING_MODEL");break;case"cloudflare":t=g("CLOUDFLARE_API_TOKEN"),n=g("CLOUDFLARE_AI_BASE_URL"),r=g("CLOUDFLARE_EMBEDDING_MODEL"),i=g("CLOUDFLARE_ACCOUNT_ID");break;default:t=ce(e).apiKey,n=ce(e).baseUrl,r=g(`${e.toUpperCase().replace(/-/g,"_")}_EMBEDDING_MODEL`)}let s=E(g("TOOLNET_EMBEDDING_ACCOUNT_ID"),i),c=E(g("TOOLNET_EMBEDDING_BASE_URL"),n,o.defaultBaseUrl),a=e==="cloudflare"&&!c&&s?`https://api.cloudflare.com/client/v4/accounts/${s}/ai/v1`:c;return{provider:e,apiKey:E(g("TOOLNET_EMBEDDING_API_KEY"),t),baseUrl:a,model:E(g("TOOLNET_EMBEDDING_MODEL"),r),accountId:s}}function Cn(){let e=In(),o=Ln();return{llm:e,embedding:o,legacy:{llm:!g("TOOLNET_LLM_PROVIDER")&&!!Oo(),embedding:!g("TOOLNET_EMBEDDING_PROVIDER")&&!!(g("HF_TOKEN")||g("HF_EMBEDDING_MODEL"))}}}function yo(e=_o()){let o=Cn().llm;if(e===o.provider)return{id:e,apiKey:o.apiKey,baseUrl:o.baseUrl,model:o.model,accountId:o.accountId};let t=ce(e);return{id:e,apiKey:t.apiKey,baseUrl:t.baseUrl,model:t.model,accountId:t.accountId}}var Pe=class extends Error{status;constructor(o,t){super(o),this.name="AiHttpError",this.status=t}};async function v(e,o,t=3e4){let n=new AbortController,r=setTimeout(()=>n.abort(),t);r.unref?.();try{let i=await fetch(e,{...o,signal:n.signal}),s=await i.text();if(!i.ok){let c=s;try{let a=JSON.parse(s);c=a.error?.message??a.message??s}catch{}throw new Pe(c||`HTTP ${i.status}`,i.status)}return s.trim()?JSON.parse(s):{}}finally{clearTimeout(r)}}function ae(e,o){return`${e.replace(/\/+$/,"")}/${o.replace(/^\/+/,"")}`}var le=class{constructor(o){this.config=o}config;id="cloudflare";model(){let o=this.config.model?.trim();if(!o)throw new Error("cloudflare: MODEL is not configured");return o}async generate(o){let t=this.config.accountId?.trim(),n=this.config.apiKey?.trim();if(!t)throw new Error("cloudflare: ACCOUNT ID is not configured");if(!n)throw new Error("cloudflare: API TOKEN is not configured");let r=this.model(),s=`${(this.config.baseUrl?.trim()||`https://api.cloudflare.com/client/v4/accounts/${t}/ai/run`).replace(/\/+$/,"")}/${r}`,c=await v(s,{method:"POST",headers:{authorization:`Bearer ${n}`,"content-type":"application/json",...this.config.headers},body:JSON.stringify({messages:o.messages,temperature:o.temperature,max_tokens:o.maxTokens})}),a=c.result?.response?.trim();if(!a)throw new Error(c.errors?.[0]?.message??"cloudflare: empty model response");return{text:a,provider:"cloudflare",model:r}}async healthCheck(){let o=Date.now();try{return{ok:!0,provider:"cloudflare",model:(await this.generate({messages:[{role:"user",content:"Reply exactly: OK"}],temperature:0,maxTokens:8})).model,message:"Provider reachable",latencyMs:Date.now()-o}}catch(t){return{ok:!1,provider:"cloudflare",model:this.config.model,message:t instanceof Error?t.message:String(t),latencyMs:Date.now()-o}}}};var ge=class{constructor(o){this.config=o}config;id="gemini";model(){let o=this.config.model?.trim();if(!o)throw new Error("gemini: MODEL is not configured");return o.replace(/^models\//,"")}async generate(o){let t=this.config.apiKey?.trim();if(!t)throw new Error("gemini: API KEY is not configured");let n=this.config.baseUrl?.trim()||"https://generativelanguage.googleapis.com/v1beta",r=this.model(),i=o.messages.filter(u=>u.role==="system"),s=o.messages.filter(u=>u.role!=="system").map(u=>({role:u.role==="assistant"?"model":"user",parts:[{text:u.content}]})),c=`${ae(n,`models/${encodeURIComponent(r)}:generateContent`)}?key=${encodeURIComponent(t)}`,a=await v(c,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...i.length?{systemInstruction:{parts:[{text:i.map(u=>u.content).join(`

`)}]}}:{},contents:s,generationConfig:{temperature:o.temperature,maxOutputTokens:o.maxTokens}})}),l=a.candidates?.[0]?.content?.parts?.map(u=>u.text??"").join("").trim();if(!l)throw new Error("gemini: empty model response");return{text:l,provider:"gemini",model:r,usage:a.usageMetadata?{inputTokens:a.usageMetadata.promptTokenCount,outputTokens:a.usageMetadata.candidatesTokenCount,totalTokens:a.usageMetadata.totalTokenCount}:void 0}}async healthCheck(){let o=Date.now();try{return{ok:!0,provider:"gemini",model:(await this.generate({messages:[{role:"user",content:"Reply exactly: OK"}],temperature:0,maxTokens:8})).model,message:"Provider reachable",latencyMs:Date.now()-o}}catch(t){return{ok:!1,provider:"gemini",model:this.config.model,message:t instanceof Error?t.message:String(t),latencyMs:Date.now()-o}}}};var ue=class{constructor(o){this.config=o;this.id=o.id}config;id;baseUrl(){let o=this.config.baseUrl?.trim();if(!o)throw new Error(`${this.id}: BASE URL is not configured`);return o}model(){let o=this.config.model?.trim();if(!o)throw new Error(`${this.id}: MODEL is not configured`);return o}headers(){let o={"content-type":"application/json",...this.config.headers};return this.config.apiKey&&(o.authorization=`Bearer ${this.config.apiKey}`),o}async generate(o){let t=this.model(),n=await v(ae(this.baseUrl(),"chat/completions"),{method:"POST",headers:this.headers(),body:JSON.stringify({model:t,messages:o.messages,temperature:o.temperature,max_tokens:o.maxTokens,...this.id==="alibaba"?{enable_thinking:!1}:{}})}),r=n.choices?.[0]?.message?.content?.trim();if(!r)throw new Error(`${this.id}: empty model response`);return{text:r,provider:this.id,model:t,usage:n.usage?{inputTokens:n.usage.prompt_tokens,outputTokens:n.usage.completion_tokens,totalTokens:n.usage.total_tokens}:void 0}}async healthCheck(){let o=Date.now();try{let t=await this.generate({messages:[{role:"user",content:"Reply exactly: OK"}],temperature:0,maxTokens:8});return{ok:!0,provider:this.id,model:t.model,message:"Provider reachable",latencyMs:Date.now()-o}}catch(t){return{ok:!1,provider:this.id,model:this.config.model,message:t instanceof Error?t.message:String(t),latencyMs:Date.now()-o}}}};function ho(e=yo()){switch(x(e.id).transport){case"gemini":return new ge(e);case"cloudflare":return new le(e);default:return new ue(e)}}import{existsSync as Jo}from"node:fs";import{homedir as qn}from"node:os";import{join as Vn}from"node:path";import{spawnSync as Wn}from"node:child_process";import{homedir as An}from"node:os";import{join as K}from"node:path";function Io(e={}){return K(e.home??An(),".gemini")}function De(e={}){return K(Io(e),"config")}function de(e={}){return K(De(e),"mcp_config.json")}function fe(e={}){return K(De(e),"hooks.json")}function To(e={}){return K(Io(e),"antigravity-cli")}function Lo(e="toolnet-memory",o={}){return K(To(o),"plugins",e)}function Co(e={}){return[To(e),De(e)]}import{homedir as Sn}from"node:os";import{join as q}from"node:path";function P(e={}){let o=e.xdgConfigHome??process.env.XDG_CONFIG_HOME?.trim();return o?q(o,"opencode"):q(e.home??Sn(),".config","opencode")}function Ao(e={}){return q(P(e),"opencode.json")}function So(e={}){return q(P(e),"plugins")}function Mo(e={}){return q(P(e),"AGENTS.md")}import{homedir as bo}from"node:os";import{join as we}from"node:path";function je(e={}){return we(e.home??bo(),".claude")}function ko(e={}){return we(je(e),"settings.json")}function Ro(e={}){return we(e.home??bo(),".claude.json")}import{homedir as Mn}from"node:os";import{join as V}from"node:path";function Fe(e={}){return e.kiroHome??process.env.KIRO_HOME??V(e.home??Mn(),".kiro")}function bn(e={}){return V(Fe(e),"settings")}function No(e={}){return V(bn(e),"mcp.json")}function kn(e={}){return V(Fe(e),"hooks")}function Po(e={}){return V(kn(e),"toolnet-memory.json")}function Do(e={}){return[Fe(e)]}import{homedir as Rn}from"node:os";import{join as b,resolve as Nn}from"node:path";function pe(e={}){return e.cursorHome??b(e.home??Rn(),".cursor")}function Pn(e={}){return e.cursorConfigDir??process.env.CURSOR_CONFIG_DIR??(e.xdgConfigHome??process.env.XDG_CONFIG_HOME?b(e.xdgConfigHome??process.env.XDG_CONFIG_HOME,"cursor"):void 0)??pe(e)}function me(e={}){return b(pe(e),"mcp.json")}function Ee(e={}){return b(pe(e),"hooks.json")}function xe(e){return b(Nn(e),".cursor")}function wo(e){return b(xe(e),"mcp.json")}function jo(e){return b(xe(e),"hooks.json")}function Dn(e){return b(xe(e),"rules")}function Fo(e){return b(Dn(e),"toolnet-memory.mdc")}function xo(e={}){return Array.from(new Set([pe(e),Pn(e)]))}import{homedir as wn}from"node:os";import{join as A,resolve as jn}from"node:path";function ve(e={}){return e.copilotHome??process.env.COPILOT_HOME??A(e.home??wn(),".copilot")}function Oe(e={}){return A(ve(e),"mcp-config.json")}function Fn(e={}){return A(ve(e),"hooks")}function _e(e={}){return A(Fn(e),"toolnet-memory.json")}function Ke(e){return A(jn(e),".github")}function vo(e){return A(Ke(e),"mcp.json")}function xn(e){return A(Ke(e),"hooks")}function Ko(e){return A(xn(e),"toolnet-memory.json")}function vn(e){return A(Ke(e),"instructions")}function Uo(e){return A(vn(e),"toolnet-memory.instructions.md")}function $o(e={}){return[ve(e)]}import{homedir as Kn}from"node:os";import{join as y,resolve as Un}from"node:path";function ye(e={}){return e.grokHome??process.env.GROK_HOME??y(e.home??Kn(),".grok")}function he(e={}){return y(ye(e),"config.toml")}function $n(e={}){return y(ye(e),"hooks")}function Ie(e={}){return y($n(e),"toolnet-memory.json")}function Bn(e={}){return y(ye(e),"skills")}function Hn(e={}){return y(Bn(e),"toolnet-continuity")}function Te(e={}){return y(Hn(e),"SKILL.md")}function Ue(e){return y(Un(e),".grok")}function Bo(e){return y(Ue(e),"config.toml")}function Yn(e){return y(Ue(e),"hooks")}function Ho(e){return y(Yn(e),"toolnet-memory.json")}function Gn(e){return y(Ue(e),"skills")}function Jn(e){return y(Gn(e),"toolnet-continuity")}function Yo(e){return y(Jn(e),"SKILL.md")}function Go(e={}){return[ye(e)]}function Xn(e){return Wn("sh",["-lc",`command -v ${JSON.stringify(e)} >/dev/null 2>&1`],{stdio:"ignore"}).status===0}function D(e){let o=e.commandExists(e.command),t=e.configPaths.filter(i=>Jo(i)),n=t.length>0,r=[];o&&r.push(`command:${e.command}`);for(let i of t)r.push(`config:${i}`);return{agent:e.agent,detected:o||n,commandDetected:o,configDetected:n,evidence:r}}function zn(e){let o=e.commands.filter(s=>e.commandExists(s)),t=e.configPaths.filter(s=>Jo(s)),n=o.length>0,r=t.length>0,i=[...o.map(s=>`command:${s}`),...t.map(s=>`config:${s}`)];return{agent:e.agent,detected:n||r,commandDetected:n,configDetected:r,evidence:i}}function qo(e={}){let o=e.home??qn(),t=e.commandExists??Xn,n=e.codexHome??process.env.CODEX_HOME??Vn(o,".codex");return[D({agent:"agy",command:"agy",commandExists:t,configPaths:Co({home:o})}),D({agent:"opencode",command:"opencode",commandExists:t,configPaths:[P({home:o,xdgConfigHome:e.xdgConfigHome})]}),D({agent:"claude",command:"claude",commandExists:t,configPaths:[je({home:o})]}),D({agent:"kiro",command:"kiro-cli",commandExists:t,configPaths:Do({home:o,kiroHome:e.kiroHome})}),zn({agent:"cursor",commands:["agent","cursor-agent"],commandExists:t,configPaths:xo({home:o,cursorHome:e.cursorHome,cursorConfigDir:e.cursorConfigDir,xdgConfigHome:e.xdgConfigHome})}),D({agent:"copilot",command:"copilot",commandExists:t,configPaths:$o({home:o,copilotHome:e.copilotHome})}),D({agent:"grok",command:"grok",commandExists:t,configPaths:Go({home:o,grokHome:e.grokHome})}),D({agent:"codex",command:"codex",commandExists:t,configPaths:[n]})]}import{existsSync as Ce,mkdirSync as Zo,readFileSync as et,renameSync as fr,writeFileSync as pr}from"node:fs";import{dirname as mr,join as Le}from"node:path";import{existsSync as Qn,mkdirSync as Zn,readFileSync as er,renameSync as or,rmSync as tr,writeFileSync as nr}from"node:fs";import{dirname as rr}from"node:path";function ir(e){return`'${e.replace(/'/g,"'\\''")}'`}function Vo(e={}){let o=e.hooksFile??fe();Zn(rr(o),{recursive:!0,mode:448});let t={};if(Qn(o)){let s;try{s=JSON.parse(er(o,"utf8"))}catch(c){throw new Error(`Invalid existing Agy hooks.json: ${c instanceof Error?c.message:String(c)}`)}if(typeof s!="object"||s===null||Array.isArray(s))throw new Error("Invalid existing Agy hooks.json: root must be a JSON object.");t=s}let n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=`${ir(n)} session:agy-hook`;t["toolnet-memory"]={enabled:!0,PreToolUse:[{matcher:"view_file|list_dir|find_by_name|grep_search|run_command",hooks:[{type:"command",command:`${r} pre-tool`,timeout:5}]}],PreInvocation:[{type:"command",command:`${r} pre`,timeout:15}],PostInvocation:[{type:"command",command:`${r} post`,timeout:15}],Stop:[{type:"command",command:`${r} stop`,timeout:30}]};let i=`${o}.tmp-${process.pid}-${Date.now()}`;try{nr(i,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),or(i,o)}finally{tr(i,{force:!0})}return o}import{existsSync as sr,mkdirSync as cr,readFileSync as ar,renameSync as lr,writeFileSync as gr}from"node:fs";import{dirname as ur}from"node:path";function W(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function dr(e,o){cr(ur(e),{recursive:!0,mode:448});let t=`${e}.tmp-${process.pid}-${Date.now()}`;gr(t,`${JSON.stringify(o,null,2)}
`,{encoding:"utf8",mode:384}),lr(t,e)}function Wo(e){if(!sr(e))return{};let o=ar(e,"utf8").trim();if(!o)return{};let t;try{t=JSON.parse(o)}catch(n){throw new Error(`Invalid existing Agy MCP config: ${n instanceof Error?n.message:String(n)}`)}if(!W(t))throw new Error("Invalid existing Agy MCP config: root must be a JSON object.");return t}function Xo(e,o){return W(e)?e.command===o&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function zo(e={}){let o=e.configFile??de(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=Wo(o),i=r.mcpServers;if(i!==void 0&&!W(i))throw new Error("Invalid existing Agy MCP config: mcpServers must be an object.");let s=W(i)?{...i}:{},c=s[n];if(Xo(c,t))return{installed:!0,changed:!1,configFile:o,serverName:n,command:t,args:["mcp"]};s[n]={command:t,args:["mcp"]};let a={...r,mcpServers:s};dr(o,a);let u=Wo(o).mcpServers;if(!W(u)||!Xo(u[n],t))throw new Error("Agy MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:o,serverName:n,command:t,args:["mcp"]}}var Er=`# ToolNet Memory Continuity

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
`;function ot(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function $e(e,o){Zo(mr(e),{recursive:!0});let t=`${e}.tmp-${process.pid}-${Date.now()}`;pr(t,o,{encoding:"utf8",mode:384}),fr(t,e)}function Qo(e,o){Ce(e)&&et(e,"utf8")===o||$e(e,o)}function tt(e){if(!Ce(e))return{};let o=et(e,"utf8").trim();if(!o)return{};let t;try{t=JSON.parse(o)}catch(n){throw new Error(`Invalid legacy Antigravity config ${e}: ${n instanceof Error?n.message:String(n)}`)}if(!ot(t))throw new Error(`Invalid legacy Antigravity config ${e}: root must be object`);return t}function Or(e,o){if(!Ce(e))return!1;let t=tt(e);if(!ot(t.mcpServers)||!Object.prototype.hasOwnProperty.call(t.mcpServers,o))return!1;let n={...t.mcpServers};return delete n[o],$e(e,`${JSON.stringify({...t,mcpServers:n},null,2)}
`),!0}function _r(e){if(!Ce(e))return!1;let o=tt(e);if(!Object.prototype.hasOwnProperty.call(o,"toolnet-memory"))return!1;let t={...o};return delete t["toolnet-memory"],$e(e,`${JSON.stringify(t,null,2)}
`),!0}function nt(e={}){let o=e.pluginName??"toolnet-memory",t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.pluginRoot??Lo(o),r=Le(n,"plugin.json"),i=Le(n,"mcp_config.json"),s=Le(n,"hooks.json"),c=Le(n,"rules","toolnet-memory-continuity.md");Zo(n,{recursive:!0,mode:448}),Qo(r,`${JSON.stringify({$schema:"https://antigravity.google/schemas/v1/plugin.json",name:o,description:"Persistent project continuity and memory for Antigravity coding sessions."},null,2)}
`),zo({configFile:i,binary:t,serverName:"toolnet-memory"}),Vo({hooksFile:s,binary:t}),Qo(c,`${Er.trim()}
`);let a=e.legacyMcpFile??de(),l=e.legacyHooksFile??fe(),u=[];return a!==i&&Or(a,"toolnet-memory")&&u.push(a),l!==s&&_r(l)&&u.push(l),{installed:!0,pluginRoot:n,files:[r,i,s,c],migratedLegacy:u}}import{existsSync as hr,mkdirSync as st,readFileSync as Ir,writeFileSync as ct}from"node:fs";import{join as Tr}from"node:path";var yr="memory_agent_ask";function rt(){return`
[TOOLNET MEMORY AGENT]

Tool available:
- ${yr}

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
`.trim()}var it="<!-- TOOLNET_MEMORY_BOOTSTRAP_START -->",Be="<!-- TOOLNET_MEMORY_BOOTSTRAP_END -->";function Lr(){let e=Mo();st(P(),{recursive:!0});let o=`${it}
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


${rt()}

${Be}`,t=hr(e)?Ir(e,"utf8"):"",n=t.indexOf(it),r=t.indexOf(Be);return n>=0&&r>=n?t=t.slice(0,n)+o+t.slice(r+Be.length):(t=t.trimEnd(),t&&(t+=`

`),t+=o),ct(e,t.trimEnd()+`
`,{encoding:"utf8",mode:384}),e}function at(e={}){let o=e.directory??So();st(o,{recursive:!0}),Lr();let t=Tr(o,"toolnet-memory.js"),n=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",r=`
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
`;return ct(t,r.trimStart(),{encoding:"utf8",mode:384}),t}import{existsSync as ut,mkdirSync as Cr,readFileSync as Ar,renameSync as Sr,writeFileSync as Mr}from"node:fs";import{dirname as dt,join as br}from"node:path";function U(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function kr(e,o){Cr(dt(e),{recursive:!0});let t=`${e}.tmp-${process.pid}-${Date.now()}`;Mr(t,`${JSON.stringify(o,null,2)}
`,{encoding:"utf8",mode:384}),Sr(t,e)}function lt(e){if(!ut(e))return{};let o=Ar(e,"utf8").trim();if(!o)return{};let t;try{t=JSON.parse(o)}catch(n){throw new Error(`Invalid existing OpenCode opencode.json: ${n instanceof Error?n.message:String(n)}`)}if(!U(t))throw new Error("Invalid existing OpenCode opencode.json: root must be a JSON object.");return t}function gt(e,o){if(!U(e))return!1;let t=e.command;return e.type==="local"&&e.enabled!==!1&&Array.isArray(t)&&t.length===2&&t[0]===o&&t[1]==="mcp"}function Rr(e,o){let t=e.mcpServers;if(!U(t)||!Object.prototype.hasOwnProperty.call(t,o))return{root:e,changed:!1};let n={...t};return delete n[o],{root:{...e,mcpServers:n},changed:!0}}function ft(e={}){let o=e.configFile??Ao(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=br(dt(o),"opencode.jsonc"),i=ut(r)?r:void 0,s=lt(o),c=Rr(s,n),a=c.root,l=a.mcp;if(l!==void 0&&!U(l))throw new Error("Invalid existing OpenCode config: mcp must be an object.");let u=U(l)?{...l}:{},p=u[n];if(gt(p,t)&&!c.changed)return{installed:!0,changed:!1,configFile:o,serverName:n,command:[t,"mcp"],preservedJsonc:i};u[n]={type:"local",command:[t,"mcp"],enabled:!0};let f={...a,mcp:u};kr(o,f);let M=lt(o);if(!U(M.mcp)||!gt(M.mcp[n],t))throw new Error("OpenCode MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:o,serverName:n,command:[t,"mcp"],preservedJsonc:i}}import{existsSync as Nr,mkdirSync as pt,readFileSync as Pr,writeFileSync as mt}from"node:fs";import{homedir as Et}from"node:os";import{dirname as Ot,join as He}from"node:path";function Dr(e){let o=[],t=/"((?:\\.|[^"\\])*)"|'([^']*)'/g,n;for(;n=t.exec(e);){let r=n[1]??n[2]??"";try{o.push(n[1]!==void 0?JSON.parse(`"${r}"`):r)}catch{o.push(r)}}return o}function _t(e={}){let o=e.configFile??He(process.env.CODEX_HOME??He(Et(),".codex"),"config.toml"),t=e.previousFile??He(Et(),".config","toolnet-memory","codex-notify-previous.json");pt(Ot(o),{recursive:!0}),pt(Ot(t),{recursive:!0});let n=Nr(o)?Pr(o,"utf8"):"",r=e.binary??"toolnet-memory",i=`notify = [${JSON.stringify(r)}, "session:codex-notify"]`,s=n.split(`
`),c=s.findIndex(f=>/^\s*\[/.test(f));c<0&&(c=s.length);let a=-1,l=-1;for(let f=0;f<c;f+=1)if(/^\s*notify\s*=/.test(s[f])){if(a=f,l=f,s[f].includes("[")&&!s[f].includes("]"))for(;l+1<c&&(l+=1,!s[l].includes("]")););break}let u=[];if(a>=0){let f=s.slice(a,l+1).join(`
`);u=Dr(f),s.splice(a,l-a+1,i)}else c=s.findIndex(f=>/^\s*\[/.test(f)),c<0&&(c=s.length),s.splice(c,0,i);let p=u.length>=2&&u[u.length-1]==="session:codex-notify";return u.length>0&&!p&&mt(t,JSON.stringify(u,null,2)+`
`,{encoding:"utf8",mode:384}),n=s.join(`
`),n.endsWith(`
`)||(n+=`
`),mt(o,n,{encoding:"utf8",mode:384}),{configFile:o,previousFile:t,preservedPrevious:u.length>0&&!p}}import{existsSync as wr,mkdirSync as jr,readFileSync as Fr,writeFileSync as xr}from"node:fs";import{homedir as vr}from"node:os";import{dirname as Kr,join as yt}from"node:path";function Ur(e){return`'${e.replace(/'/g,"'\\''")}'`}function ht(e={}){let o=e.hooksFile??yt(process.env.CODEX_HOME??yt(vr(),".codex"),"hooks.json");jr(Kr(o),{recursive:!0});let t={};if(wr(o))try{t=JSON.parse(Fr(o,"utf8"))}catch(c){throw new Error(`Invalid existing Codex hooks.json: ${c instanceof Error?c.message:String(c)}`)}let n=t.hooks&&typeof t.hooks=="object"&&!Array.isArray(t.hooks)?t.hooks:{};t.hooks=n;let i=(Array.isArray(n.SessionStart)?n.SessionStart:[]).filter(c=>{try{return!JSON.stringify(c).includes("session:codex-context")}catch{return!0}}),s=e.binary??"toolnet-memory";return i.push({matcher:"startup|resume|clear|compact",hooks:[{type:"command",command:`${Ur(s)} session:codex-context`,timeout:15,additionalContextLimit:1e3,statusMessage:"Loading ToolNet project continuity"}]}),n.SessionStart=i,xr(o,JSON.stringify(t,null,2)+`
`,{encoding:"utf8",mode:384}),o}import{spawnSync as $r}from"node:child_process";function Ye(e,o){return $r(e,o,{encoding:"utf8",stdio:["ignore","pipe","pipe"]})}function It(e,o){let t=Ye(e,["mcp","get",o,"--json"]);if(t.status!==0||!t.stdout)return null;try{return JSON.parse(t.stdout)}catch{return null}}function Tt(e,o){return e.enabled!==!1&&e.transport?.type==="stdio"&&e.transport?.command===o&&Array.isArray(e.transport?.args)&&e.transport?.args.length===1&&e.transport.args[0]==="mcp"}function Lt(e={}){let o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=e.codexBinary??"codex",n=e.serverName??"toolnet-memory",r=It(t,n);if(r&&Tt(r,o))return{installed:!0,changed:!1,serverName:n,command:o,args:["mcp"]};if(r){let c=Ye(t,["mcp","remove",n]);if(c.status!==0)return{installed:!1,changed:!1,serverName:n,command:o,args:["mcp"],error:(c.stderr||c.stdout||"Unable to remove old ToolNet MCP configuration.").trim()}}let i=Ye(t,["mcp","add",n,"--",o,"mcp"]);if(i.status!==0)return{installed:!1,changed:!1,serverName:n,command:o,args:["mcp"],error:(i.stderr||i.stdout||"Unable to register ToolNet MCP.").trim()};let s=It(t,n);return!s||!Tt(s,o)?{installed:!1,changed:!0,serverName:n,command:o,args:["mcp"],error:"Codex accepted MCP registration but verification did not match expected ToolNet command."}:{installed:!0,changed:!0,serverName:n,command:o,args:["mcp"]}}import{existsSync as Br,mkdirSync as Hr,readFileSync as Yr,renameSync as Gr,rmSync as Jr,writeFileSync as qr}from"node:fs";import{dirname as Vr}from"node:path";function X(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Wr(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function Xr(e){if(!Br(e))return{};let o;try{o=JSON.parse(Yr(e,"utf8"))}catch(t){throw new Error(`Invalid existing Claude settings.json: ${t instanceof Error?t.message:String(t)}`)}if(!X(o))throw new Error("Invalid existing Claude settings.json: root must be a JSON object.");return o}function Ge(e){if(e===void 0)return[];if(!Array.isArray(e))throw new Error("Invalid existing Claude settings.json: hook event must be an array.");let o=[];for(let t of e){if(!X(t)){o.push(t);continue}let n=t.hooks;if(!Array.isArray(n)){o.push(t);continue}let r=n.filter(i=>{if(!X(i))return!0;let s=i.command;return!(typeof s=="string"&&s.includes("session:claude-hook"))});r.length!==0&&o.push({...t,hooks:r})}return o}function Je(e){return{type:"command",command:e,timeout:10}}function zr(e,o){Hr(Vr(e),{recursive:!0,mode:448});let t=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{qr(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),Gr(t,e)}finally{Jr(t,{force:!0})}}function Ct(e={}){let o=e.settingsFile??ko(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=Xr(o),r=n.hooks;if(r!==void 0&&!X(r))throw new Error("Invalid existing Claude settings.json: hooks must be an object.");let i=X(r)?{...r}:{},s=`${Wr(t)} session:claude-hook`,c=Ge(i.SessionStart);c.push({matcher:"startup|resume|clear|compact",hooks:[Je(s)]}),i.SessionStart=c;let a=Ge(i.PostToolUse);a.push({matcher:"Edit|Write",hooks:[Je(s)]}),i.PostToolUse=a;let l=Ge(i.Stop);l.push({hooks:[Je(s)]}),i.Stop=l;let u={...n,hooks:i},p=JSON.stringify(n),f=JSON.stringify(u);return p===f?{settingsFile:o,changed:!1}:(zr(o,u),{settingsFile:o,changed:!0})}import{existsSync as Qr,mkdirSync as Zr,readFileSync as ei,renameSync as oi,rmSync as ti,writeFileSync as ni}from"node:fs";import{dirname as ri}from"node:path";function z(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function At(e){if(!Qr(e))return{};let o;try{o=JSON.parse(ei(e,"utf8"))}catch(t){throw new Error(`Invalid existing Claude Code config: ${t instanceof Error?t.message:String(t)}`)}if(!z(o))throw new Error("Invalid existing Claude Code config: root must be a JSON object.");return o}function St(e,o){if(!z(e))return!1;let t=e.args;return e.type==="stdio"&&e.command===o&&Array.isArray(t)&&t.length===1&&t[0]==="mcp"}function ii(e,o){Zr(ri(e),{recursive:!0});let t=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{ni(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),oi(t,e)}finally{ti(t,{force:!0})}}function Mt(e={}){let o=e.stateFile??Ro(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=At(o),i=r.mcpServers;if(i!==void 0&&!z(i))throw new Error("Invalid existing Claude Code config: mcpServers must be an object.");let s=z(i)?{...i}:{},c=s[n];if(St(c,t))return{installed:!0,changed:!1,configFile:o,serverName:n,command:[t,"mcp"],repaired:!1};let a=c!==void 0;s[n]={type:"stdio",command:t,args:["mcp"]},ii(o,{...r,mcpServers:s});let u=At(o).mcpServers;if(!z(u)||!St(u[n],t))throw new Error("Claude Code MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:o,serverName:n,command:[t,"mcp"],repaired:a}}function bt(e={}){let o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=Ct({binary:o,settingsFile:e.settingsFile}),n=Mt({binary:o,stateFile:e.stateFile});return{hooks:t,mcp:n,files:[t.settingsFile,n.configFile]}}import{existsSync as si,mkdirSync as ci,readFileSync as ai,renameSync as li,rmSync as gi,writeFileSync as ui}from"node:fs";import{dirname as di}from"node:path";var $="ToolNet Memory - ";function Nt(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function fi(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}function kt(e){if(!si(e))return{};let o=ai(e,"utf8").trim();if(!o)return{};let t;try{t=JSON.parse(o)}catch(n){throw new Error(`Invalid existing Kiro hooks file: ${n instanceof Error?n.message:String(n)}`)}if(!Nt(t))throw new Error("Invalid existing Kiro hooks file: root must be a JSON object.");return t}function Rt(e){return Nt(e)?typeof e.name=="string"&&e.name.startsWith($):!1}function Q(e){return{type:"command",command:e}}function pi(e){return[{name:`${$}Session Start`,description:"Inject compact local ToolNet continuity and capture Kiro session activation.",trigger:"SessionStart",action:Q(e),timeout:10,enabled:!0},{name:`${$}Prompt Continuity`,description:"Capture prompts and refresh ToolNet guidance only for resume/continue requests.",trigger:"UserPromptSubmit",action:Q(e),timeout:10,enabled:!0},{name:`${$}Raw History Guard`,description:"Prevent Kiro from reconstructing continuity from raw ToolNet/agent session history.",trigger:"PreToolUse",matcher:"*",action:Q(e),timeout:10,enabled:!0},{name:`${$}Tool Capture`,description:"Capture durable tool activity while filtering noisy read-only events.",trigger:"PostToolUse",matcher:"*",action:Q(e),timeout:15,enabled:!0},{name:`${$}Final Flush`,description:"Flush pending Kiro WAL events when the assistant finishes a turn.",trigger:"Stop",action:Q(e),timeout:30,enabled:!0}]}function mi(e,o){ci(di(e),{recursive:!0,mode:448});let t=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{ui(t,JSON.stringify(o,null,2)+`
`,{encoding:"utf8",mode:384}),li(t,e)}finally{gi(t,{force:!0})}}function Pt(e={}){let o=e.hooksFile??Po(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=kt(o);if(n.version!==void 0&&n.version!=="v1")throw new Error(`Unsupported existing Kiro hooks version: ${String(n.version)}`);let r=n.hooks;if(r!==void 0&&!Array.isArray(r))throw new Error("Invalid existing Kiro hooks file: hooks must be an array.");let i=Array.isArray(r)?r.filter(u=>!Rt(u)):[],s=`${fi(t)} session:kiro-hook`,c=pi(s),a={...n,version:"v1",hooks:[...i,...c]};if(JSON.stringify(n)===JSON.stringify(a))return{hooksFile:o,changed:!1,hookCount:c.length};mi(o,a);let l=kt(o);if(l.version!=="v1"||!Array.isArray(l.hooks)||l.hooks.filter(Rt).length!==c.length)throw new Error("Kiro hooks were written but verification failed.");return{hooksFile:o,changed:!0,hookCount:c.length}}import{existsSync as Ei,mkdirSync as Oi,readFileSync as _i,renameSync as yi,rmSync as hi,writeFileSync as Ii}from"node:fs";import{dirname as Ti}from"node:path";function Z(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Dt(e){if(!Ei(e))return{};let o=_i(e,"utf8").trim();if(!o)return{};let t;try{t=JSON.parse(o)}catch(n){throw new Error(`Invalid existing Kiro MCP config: ${n instanceof Error?n.message:String(n)}`)}if(!Z(t))throw new Error("Invalid existing Kiro MCP config: root must be a JSON object.");return t}function wt(e,o){return Z(e)?e.command===o&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&e.disabled===!1:!1}function Li(e,o){Oi(Ti(e),{recursive:!0,mode:448});let t=`${e}.tmp-${process.pid}-${Date.now()}`;try{Ii(t,`${JSON.stringify(o,null,2)}
`,{encoding:"utf8",mode:384}),yi(t,e)}finally{hi(t,{force:!0})}}function jt(e={}){let o=e.configFile??No(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=Dt(o),i=r.mcpServers;if(i!==void 0&&!Z(i))throw new Error("Invalid existing Kiro MCP config: mcpServers must be an object.");let s=Z(i)?{...i}:{},c=s[n];if(wt(c,t))return{installed:!0,changed:!1,configFile:o,serverName:n,command:t,args:["mcp"]};s[n]={command:t,args:["mcp"],disabled:!1};let a={...r,mcpServers:s};Li(o,a);let u=Dt(o).mcpServers;if(!Z(u)||!wt(u[n],t))throw new Error("Kiro MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:o,serverName:n,command:t,args:["mcp"]}}function Ft(e={}){let o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=jt({binary:o,configFile:e.configFile}),n=Pt({binary:o,hooksFile:e.hooksFile});return{installed:t.installed,changed:t.changed||n.changed,mcp:t,hooks:n,files:[t.configFile,n.hooksFile]}}import{existsSync as Ci,mkdirSync as Ai,readFileSync as Si,renameSync as Mi,rmSync as bi,writeFileSync as ki}from"node:fs";import{dirname as Ri}from"node:path";function O(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function k(e,o){if(!Ci(e))return{};let t=Si(e,"utf8").trim();if(!t)return{};let n;try{n=JSON.parse(t)}catch(r){throw new Error(`Invalid existing ${o} hooks file: ${r instanceof Error?r.message:String(r)}`)}if(!O(n))throw new Error(`Invalid existing ${o} hooks file: root must be a JSON object.`);return n}function B(e,o){Ai(Ri(e),{recursive:!0,mode:448});let t=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{ki(t,`${JSON.stringify(o,null,2)}
`,{encoding:"utf8",mode:384}),Mi(t,e)}finally{bi(t,{force:!0})}}function qe(e){return/^[A-Za-z0-9_./:-]+$/u.test(e)?e:`'${e.replace(/'/gu,"'\\''")}'`}var ee=[["sessionStart",10],["beforeSubmitPrompt",10],["preToolUse",10],["postToolUse",15],["afterAgentResponse",15],["stop",30]];function xt(e){return O(e)&&typeof e.command=="string"&&e.command.includes("session:cursor-hook")}function Ni(e,o,t){let r={type:"command",command:`TOOLNET_HOOK_EVENT=${qe(e)} ${qe(o)} session:cursor-hook`,timeout:t};return e==="preToolUse"&&(r.matcher=".*"),r}function Ve(e={}){let o=e.hooksFile??Ee(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=k(o,"Cursor");if(n.version!==void 0&&n.version!==1)throw new Error(`Unsupported existing Cursor hooks version: ${String(n.version)}`);let r=n.hooks;if(r!==void 0&&!O(r))throw new Error("Invalid existing Cursor hooks file: hooks must be an object.");let i=O(r)?{...r}:{};for(let[l,u]of ee){let p=i[l];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing Cursor hooks file: hooks.${l} must be an array.`);let f=Array.isArray(p)?p.filter(M=>!xt(M)):[];i[l]=[...f,Ni(l,t,u)]}let s={...n,version:1,hooks:i};if(JSON.stringify(n)===JSON.stringify(s))return{hooksFile:o,changed:!1,hookCount:ee.length};B(o,s);let c=k(o,"Cursor");if(c.version!==1||!O(c.hooks))throw new Error("Cursor hooks were written but verification failed.");let a=0;for(let[l]of ee){let u=c.hooks[l];if(!Array.isArray(u))throw new Error("Cursor hooks were written but verification failed.");a+=u.filter(xt).length}if(a!==ee.length)throw new Error("Cursor hooks were written but verification failed.");return{hooksFile:o,changed:!0,hookCount:ee.length}}import{existsSync as Pi,mkdirSync as Di,readFileSync as wi,renameSync as ji,rmSync as Fi,writeFileSync as xi}from"node:fs";import{dirname as vi}from"node:path";function T(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function H(e,o){if(!Pi(e))return{};let t=wi(e,"utf8").trim();if(!t)return{};let n;try{n=JSON.parse(t)}catch(r){throw new Error(`Invalid existing ${o} MCP config: ${r instanceof Error?r.message:String(r)}`)}if(!T(n))throw new Error(`Invalid existing ${o} MCP config: root must be a JSON object.`);return n}function Ae(e,o){Di(vi(e),{recursive:!0,mode:448});let t=`${e}.tmp-${process.pid}-${Date.now()}`;try{xi(t,`${JSON.stringify(o,null,2)}
`,{encoding:"utf8",mode:384}),ji(t,e)}finally{Fi(t,{force:!0})}}function vt(e,o){return T(e)?(e.type===void 0||e.type==="stdio")&&e.command===o&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp":!1}function We(e={}){let o=e.configFile??me(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=H(o,"Cursor"),i=r.mcpServers;if(i!==void 0&&!T(i))throw new Error("Invalid existing Cursor MCP config: mcpServers must be an object.");let s=T(i)?{...i}:{};if(vt(s[n],t))return{installed:!0,changed:!1,configFile:o,serverName:n,command:t,args:["mcp"]};s[n]={type:"stdio",command:t,args:["mcp"]},Ae(o,{...r,mcpServers:s});let a=H(o,"Cursor").mcpServers;if(!T(a)||!vt(a[n],t))throw new Error("Cursor MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:o,serverName:n,command:t,args:["mcp"]}}import{mkdirSync as Ki,readFileSync as Kt,renameSync as Ui,rmSync as $i,writeFileSync as Bi}from"node:fs";import{dirname as Hi}from"node:path";var Xe=`---
description: ToolNet Memory project continuity and safety rules
alwaysApply: true
---

# ToolNet Memory

Use ToolNet Memory as the continuity source for this project.

- When the user asks to continue, resume, pick up, finish unfinished work,
  or asks where work stopped, use ToolNet continuity before reconstructing
  context from old chat/session history.
- Use the ToolNet MCP server and \`memory_agent_ask\` when fast project context
  is missing, stale, or ambiguous.
- Prefer \`mode="local"\` for current task, current file, blockers, TODOs,
  completed work, and next action.
- Use \`mode="ai"\` only when synthesis is actually required.
- Do not reconstruct continuity by reading:
  - \`.toolnet/sessions/**\`
  - ToolNet raw \`events.jsonl\`
  - ToolNet raw \`state.json\`
  - another coding agent's private transcript/history files.
- After continuity is recovered, verify current repository source and git
  state before changing code.
- Do not ask the user to repeat project context that ToolNet already provides.

Current repository evidence overrides stale memory.
`;function Yi(e,o){Ki(Hi(e),{recursive:!0,mode:448});let t=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{Bi(t,o,{encoding:"utf8",mode:384}),Ui(t,e)}finally{$i(t,{force:!0})}}function Ut(e){let o=e.ruleFile??Fo(e.projectRoot);try{if(Kt(o,"utf8")===Xe)return{ruleFile:o,changed:!1}}catch{}if(Yi(o,Xe),Kt(o,"utf8")!==Xe)throw new Error("Cursor ToolNet project rule was written but verification failed.");return{ruleFile:o,changed:!0}}import{spawnSync as Gi}from"node:child_process";import{existsSync as Y,statSync as Ji}from"node:fs";import{dirname as qi,join as Vi,parse as Wi,resolve as Qe}from"node:path";function $t(e){let o=Qe(e);if(!Y(o))throw new Error(`Project path does not exist: ${o}`);if(!Ji(o).isDirectory())throw new Error(`Project path is not a directory: ${o}`);return o}function Se(e){return Vi(e,".toolnet","project.json")}function Xi(e){let o=Qe(e),t=Wi(o).root;for(;;){if(Y(Se(o)))return o;if(o===t)return;let n=qi(o);if(n===o)return;o=n}}function ze(e){let o=Gi("git",["rev-parse","--show-toplevel"],{cwd:e,encoding:"utf8",timeout:5e3});if(o.status!==0)return;let t=o.stdout.trim();return t?Qe(t):void 0}function R(e={}){let o=$t(e.cwd??process.cwd());if(e.project){let r=$t(e.project),i=Se(r),s=ze(r);return{root:r,source:"explicit",eligible:!0,toolnetProject:Y(i),manifestFile:Y(i)?i:void 0,gitRoot:s}}let t=Xi(o);if(t){let r=Se(t);return{root:t,source:"toolnet",eligible:!0,toolnetProject:!0,manifestFile:r,gitRoot:ze(t)}}let n=ze(o);if(n){let r=Se(n);return{root:n,source:"git",eligible:!0,toolnetProject:Y(r),manifestFile:Y(r)?r:void 0,gitRoot:n}}return{root:o,source:"cwd",eligible:!1,toolnetProject:!1}}function Gt(e,o={}){let t=[],n=e.indexOf("--scope");if(n>=0){let i=e[n+1];if(i!=="global"&&i!=="project"&&i!=="both")throw new Error(`Invalid --scope value: ${String(i)}`);t.push(i)}e.includes("--global")&&t.push("global"),e.includes("--both")&&t.push("both");let r=Array.from(new Set(t));if(r.length>1)throw new Error(`Conflicting integration scopes: ${r.join(", ")}`);return r[0]??o.defaultScope??"global"}function Bt(e,o){return{install:e,effective:o}}function N(e,o){return{surface:e,global:Bt(o.globalInstall,o.effective==="global"||o.effective==="both"),project:Bt(o.projectInstall,o.effective==="project"||o.effective==="both"),effective:o.effective,risk:o.risk??"none",dedupeRequired:o.dedupeRequired??!1,trustRequired:o.trustRequired??o.projectInstall,note:o.note}}function zi(e){return{mcp:N("mcp",{globalInstall:!0,projectInstall:!1,effective:"global"}),hooks:N("hooks",{globalInstall:!0,projectInstall:!1,effective:"global"}),work:N("work",{globalInstall:e==="grok",projectInstall:!1,effective:e==="grok"?"global":"none",note:e==="grok"?"Grok supports a global ToolNet continuity skill.":"Cursor/Copilot work instructions remain project-scoped."})}}function Ht(e){return{mcp:N("mcp",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),hooks:N("hooks",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!0}),work:N("work",{globalInstall:!1,projectInstall:!0,effective:"project",trustRequired:!1,note:e==="cursor"?"Use .cursor/rules/toolnet-memory.mdc.":e==="copilot"?"Use .github/instructions/toolnet-memory.instructions.md.":"Use .grok/skills/toolnet-continuity/SKILL.md."})}}function Yt(e){return{mcp:N("mcp",{globalInstall:!0,projectInstall:!0,effective:"project",risk:e==="cursor"?"precedence-unverified":"shadowed-global",trustRequired:!0,note:e==="cursor"?"Project ToolNet MCP is the intended effective definition; native same-name precedence must be E2E certified before release.":"Global remains useful outside the project; same-name project definition wins inside the project."}),hooks:N("hooks",{globalInstall:!0,projectInstall:!0,effective:"both",risk:"additive-duplicate",dedupeRequired:!0,trustRequired:!0,note:"Global and project hook sources can both execute for the same native event."}),work:N("work",{globalInstall:e==="grok",projectInstall:!0,effective:"project",risk:e==="grok"?"shadowed-global":"none",trustRequired:!1,note:e==="cursor"?"Project rule is authoritative.":e==="copilot"?"Project instruction is authoritative.":"Project skill shadows the same-name global skill inside the project."})}}function G(e){let{agent:o,scope:t,project:n}=e;return(t==="project"||t==="both")&&(!n||!n.eligible)?{agent:o,requestedScope:t,project:n,surfaces:t==="both"?Yt(o):Ht(o),canInstall:!1,reason:"Project scope requires an explicit project, existing ToolNet project, or Git repository root."}:{agent:o,requestedScope:t,project:n,surfaces:t==="global"?zi(o):t==="project"?Ht(o):Yt(o),canInstall:!0}}function Jt(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.rule?.changed)}function qt(e={}){let o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=e.scope??"global",n=t==="global"?void 0:R({project:e.projectRoot}),r=G({agent:"cursor",scope:t,project:n});if(!r.canInstall)throw new Error(r.reason??"Cursor project integration scope cannot be resolved.");let i,s;if((r.surfaces.mcp.global.install||r.surfaces.hooks.global.install||r.surfaces.work.global.install)&&(i={},r.surfaces.mcp.global.install&&(i.mcp=We({binary:o,configFile:e.configFile??me()})),r.surfaces.hooks.global.install&&(i.hooks=Ve({binary:o,hooksFile:e.hooksFile??Ee()}))),r.surfaces.mcp.project.install||r.surfaces.hooks.project.install||r.surfaces.work.project.install){if(!n?.eligible)throw new Error("Cursor project integration requires an eligible project root.");s={},r.surfaces.mcp.project.install&&(s.mcp=We({binary:o,configFile:e.projectConfigFile??wo(n.root)})),r.surfaces.hooks.project.install&&(s.hooks=Ve({binary:o,hooksFile:e.projectHooksFile??jo(n.root)})),r.surfaces.work.project.install&&(s.rule=Ut({projectRoot:n.root,ruleFile:e.projectRuleFile}))}let c=s?.mcp??i?.mcp,a=s?.hooks??i?.hooks;if(!c||!a)throw new Error("Cursor integration did not produce an effective MCP/hooks installation.");let l=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.rule?.ruleFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.rule?.ruleFile].filter(u=>typeof u=="string")));return{installed:!0,changed:Jt(i)||Jt(s),scope:t,plan:r,project:n,global:i,projectScope:s,mcp:c,hooks:a,rule:s?.rule,files:l}}var oe=[["sessionStart",10],["userPromptSubmitted",10],["userPromptTransformed",10],["preToolUse",10],["postToolUse",15],["agentStop",30]];function Qi(e){if(typeof e.command=="string")return e.command;if(typeof e.bash=="string")return e.bash}function Vt(e){return O(e)&&Qi(e)?.includes("session:copilot-hook")===!0}function Zi(e,o,t){let n={type:"command",command:`${o} session:copilot-hook`,env:{TOOLNET_HOOK_EVENT:e},timeoutSec:t};return e==="preToolUse"&&(n.matcher=".*"),n}function Ze(e={}){let o=e.hooksFile??_e(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=k(o,"GitHub Copilot CLI");if(n.version!==void 0&&n.version!==1)throw new Error(`Unsupported existing GitHub Copilot CLI hooks version: ${String(n.version)}`);let r=n.hooks;if(r!==void 0&&!O(r))throw new Error("Invalid existing GitHub Copilot CLI hooks file: hooks must be an object.");let i=O(r)?{...r}:{};for(let[l,u]of oe){let p=i[l];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing GitHub Copilot CLI hooks file: hooks.${l} must be an array.`);let f=Array.isArray(p)?p.filter(M=>!Vt(M)):[];i[l]=[...f,Zi(l,t,u)]}let s={...n,version:1,hooks:i};if(JSON.stringify(n)===JSON.stringify(s))return{hooksFile:o,changed:!1,hookCount:oe.length};B(o,s);let c=k(o,"GitHub Copilot CLI");if(c.version!==1||!O(c.hooks))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");let a=0;for(let[l]of oe){let u=c.hooks[l];if(!Array.isArray(u))throw new Error("GitHub Copilot CLI hooks were written but verification failed.");a+=u.filter(Vt).length}if(a!==oe.length)throw new Error("GitHub Copilot CLI hooks were written but verification failed.");return{hooksFile:o,changed:!0,hookCount:oe.length}}function Wt(e,o){return T(e)?(e.type===void 0||e.type==="local"||e.type==="stdio")&&e.command===o&&Array.isArray(e.args)&&e.args.length===1&&e.args[0]==="mcp"&&Array.isArray(e.tools)&&e.tools.length===1&&e.tools[0]==="*":!1}function eo(e={}){let o=e.configFile??Oe(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=H(o,"GitHub Copilot CLI"),i=r.mcpServers;if(i!==void 0&&!T(i))throw new Error("Invalid existing GitHub Copilot CLI MCP config: mcpServers must be an object.");let s=T(i)?{...i}:{};if(Wt(s[n],t))return{installed:!0,changed:!1,configFile:o,serverName:n,command:t,args:["mcp"]};s[n]={type:"stdio",command:t,args:["mcp"],tools:["*"]},Ae(o,{...r,mcpServers:s});let a=H(o,"GitHub Copilot CLI").mcpServers;if(!T(a)||!Wt(a[n],t))throw new Error("GitHub Copilot CLI MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:o,serverName:n,command:t,args:["mcp"]}}import{mkdirSync as es,readFileSync as Xt,renameSync as os,rmSync as ts,writeFileSync as ns}from"node:fs";import{dirname as rs}from"node:path";var oo=`---
applyTo: "**"
---

# ToolNet Memory project continuity

Use ToolNet Memory as the continuity source for this repository.

- When the user asks to continue, resume, pick up, finish unfinished work,
  or asks where work stopped, recover ToolNet continuity before reconstructing
  state from chat/session history.
- Use the ToolNet MCP server and \`memory_agent_ask\` when fast project context
  is missing, stale, or ambiguous.
- Prefer \`mode="local"\` for current task, current file, blockers, TODOs,
  completed work, and next action.
- Use \`mode="ai"\` only when continuity needs synthesis.
- Do not reconstruct continuity by reading:
  - \`.toolnet/sessions/**\`
  - ToolNet raw \`events.jsonl\`
  - ToolNet raw \`state.json\`
  - another coding agent's private transcript/history files.
- After continuity is recovered, verify current repository source and git
  state before changing code.
- Do not ask the user to repeat context ToolNet already provides.

Current repository evidence overrides stale memory.
`;function is(e,o){es(rs(e),{recursive:!0,mode:448});let t=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{ns(t,o,{encoding:"utf8",mode:384}),os(t,e)}finally{ts(t,{force:!0})}}function zt(e){let o=e.instructionFile??Uo(e.projectRoot);try{if(Xt(o,"utf8")===oo)return{instructionFile:o,changed:!1}}catch{}if(is(o,oo),Xt(o,"utf8")!==oo)throw new Error("Copilot ToolNet project instruction verification failed.");return{instructionFile:o,changed:!0}}function Qt(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.instruction?.changed)}function Zt(e={}){let o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=e.scope??"global",n=t==="global"?void 0:R({project:e.projectRoot}),r=G({agent:"copilot",scope:t,project:n});if(!r.canInstall)throw new Error(r.reason??"Copilot project integration scope cannot be resolved.");let i,s;if((r.surfaces.mcp.global.install||r.surfaces.hooks.global.install||r.surfaces.work.global.install)&&(i={},r.surfaces.mcp.global.install&&(i.mcp=eo({binary:o,configFile:e.configFile??Oe()})),r.surfaces.hooks.global.install&&(i.hooks=Ze({binary:o,hooksFile:e.hooksFile??_e()}))),r.surfaces.mcp.project.install||r.surfaces.hooks.project.install||r.surfaces.work.project.install){if(!n?.eligible)throw new Error("Copilot project integration requires an eligible project root.");s={},r.surfaces.mcp.project.install&&(s.mcp=eo({binary:o,configFile:e.projectConfigFile??vo(n.root)})),r.surfaces.hooks.project.install&&(s.hooks=Ze({binary:o,hooksFile:e.projectHooksFile??Ko(n.root)})),r.surfaces.work.project.install&&(s.instruction=zt({projectRoot:n.root,instructionFile:e.projectInstructionFile}))}let c=s?.mcp??i?.mcp,a=s?.hooks??i?.hooks;if(!c||!a)throw new Error("Copilot integration did not produce effective MCP/hooks.");let l=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.instruction?.instructionFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.instruction?.instructionFile].filter(u=>typeof u=="string")));return{installed:!0,changed:Qt(i)||Qt(s),scope:t,plan:r,project:n,global:i,projectScope:s,mcp:c,hooks:a,instruction:s?.instruction,files:l}}import{existsSync as ss,mkdirSync as cs,readFileSync as en,renameSync as as,rmSync as ls,writeFileSync as gs}from"node:fs";import{dirname as us}from"node:path";var to=`---
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
`;function ds(e,o){cs(us(e),{recursive:!0,mode:448});let t=`${e}.toolnet-${process.pid}-${Date.now()}.tmp`;try{gs(t,o,{encoding:"utf8",mode:384}),as(t,e)}finally{ls(t,{force:!0})}}function no(e={}){let o=e.skillFile??Te();if(ss(o)&&en(o,"utf8")===to)return{skillFile:o,changed:!1};if(ds(o,to),en(o,"utf8")!==to)throw new Error("Grok ToolNet continuity skill was written but verification failed.");return{skillFile:o,changed:!0}}var te=[["SessionStart",10],["UserPromptSubmit",10],["PreToolUse",10],["PostToolUse",15],["Stop",30]];function on(e){return!O(e)||!Array.isArray(e.hooks)?!1:e.hooks.some(o=>O(o)&&typeof o.command=="string"&&o.command.includes("session:grok-hook"))}function fs(e,o,t){let n={hooks:[{type:"command",command:`${o} session:grok-hook`,timeout:t,env:{TOOLNET_HOOK_EVENT:e}}]};return e==="PreToolUse"&&(n.matcher=".*"),n}function ro(e={}){let o=e.hooksFile??Ie(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=k(o,"Grok Build"),r=n.hooks;if(r!==void 0&&!O(r))throw new Error("Invalid existing Grok Build hooks file: hooks must be an object.");let i=O(r)?{...r}:{};for(let[l,u]of te){let p=i[l];if(p!==void 0&&!Array.isArray(p))throw new Error(`Invalid existing Grok Build hooks file: hooks.${l} must be an array.`);let f=Array.isArray(p)?p.filter(M=>!on(M)):[];i[l]=[...f,fs(l,t,u)]}let s={...n,hooks:i};if(JSON.stringify(n)===JSON.stringify(s))return{hooksFile:o,changed:!1,hookCount:te.length};B(o,s);let c=k(o,"Grok Build");if(!O(c.hooks))throw new Error("Grok Build hooks were written but verification failed.");let a=0;for(let[l]of te){let u=c.hooks[l];if(!Array.isArray(u))throw new Error("Grok Build hooks were written but verification failed.");a+=u.filter(on).length}if(a!==te.length)throw new Error("Grok Build hooks were written but verification failed.");return{hooksFile:o,changed:!0,hookCount:te.length}}import{existsSync as ps,mkdirSync as ms,readFileSync as Es,renameSync as Os,rmSync as _s,writeFileSync as ys}from"node:fs";import{dirname as hs}from"node:path";function tn(e){return ps(e)?Es(e,"utf8"):""}function Is(e,o){ms(hs(e),{recursive:!0,mode:448});let t=`${e}.tmp-${process.pid}-${Date.now()}`;try{ys(t,o,{encoding:"utf8",mode:384}),Os(t,e)}finally{_s(t,{force:!0})}}function io(e){return e.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t")}function Ts(e){return`[mcp_servers."${io(e)}"]`}function Ls(e,o){return[Ts(e),`command = "${io(o)}"`,'args = ["mcp"]',"enabled = true"].join(`
`)}function Cs(e){let o=e.trim();return o.startsWith("[")&&o.includes("]")}function Me(e){return e.trim().replace(/\s+/g,"")}function As(e){return new Set([Me(`[mcp_servers.${e}]`),Me(`[mcp_servers."${e}"]`),Me(`[mcp_servers.'${e}']`)])}function rn(e,o){let t=e.split(/\r?\n/),n=As(o),r=-1;for(let u=0;u<t.length;u+=1){let p=Me(t[u].replace(/\s+#.*$/,""));if(n.has(p)){r=u;break}}if(r<0)return null;let i=t.length;for(let u=r+1;u<t.length;u+=1)if(Cs(t[u])){i=u;break}let s=[],c=0;for(let u of t)s.push(c),c+=u.length+1;let a=s[r]??0,l=i>=t.length?e.length:s[i]??e.length;return{start:a,end:l}}function Ss(e,o,t){let n=`${Ls(o,t)}
`,r=rn(e,o);if(r){let i=e.slice(0,r.start),s=e.slice(r.end);return`${i}${n}${s.replace(/^\n+/,"")}`}return e.trim()?`${e.replace(/\s*$/,"")}

${n}`:n}function nn(e,o,t){let n=rn(e,o);if(!n)return!1;let r=e.slice(n.start,n.end);return r.includes(`command = "${io(t)}"`)&&/args\s*=\s*\[\s*"mcp"\s*\]/.test(r)&&/enabled\s*=\s*true/.test(r)}function so(e={}){let o=e.configFile??he(),t=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",n=e.serverName??"toolnet-memory",r=tn(o);if(nn(r,n,t))return{installed:!0,changed:!1,configFile:o,serverName:n,command:t,args:["mcp"]};let i=Ss(r,n,t);Is(o,i);let s=tn(o);if(!nn(s,n,t))throw new Error("Grok Build MCP configuration was written but verification failed.");return{installed:!0,changed:!0,configFile:o,serverName:n,command:t,args:["mcp"]}}function sn(e){return!!(e?.mcp?.changed||e?.hooks?.changed||e?.skill?.changed)}function cn(e={}){let o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=e.scope??"global",n=t==="global"?void 0:R({project:e.projectRoot}),r=G({agent:"grok",scope:t,project:n});if(!r.canInstall)throw new Error(r.reason??"Grok project integration scope cannot be resolved.");let i,s;if((r.surfaces.mcp.global.install||r.surfaces.hooks.global.install||r.surfaces.work.global.install)&&(i={},r.surfaces.mcp.global.install&&(i.mcp=so({binary:o,configFile:e.configFile??he()})),r.surfaces.hooks.global.install&&(i.hooks=ro({binary:o,hooksFile:e.hooksFile??Ie()})),r.surfaces.work.global.install&&(i.skill=no({skillFile:e.skillFile??Te()}))),r.surfaces.mcp.project.install||r.surfaces.hooks.project.install||r.surfaces.work.project.install){if(!n?.eligible)throw new Error("Grok project integration requires an eligible project root.");s={},r.surfaces.mcp.project.install&&(s.mcp=so({binary:o,configFile:e.projectConfigFile??Bo(n.root)})),r.surfaces.hooks.project.install&&(s.hooks=ro({binary:o,hooksFile:e.projectHooksFile??Ho(n.root)})),r.surfaces.work.project.install&&(s.skill=no({skillFile:e.projectSkillFile??Yo(n.root)}))}let c=s?.mcp??i?.mcp,a=s?.hooks??i?.hooks,l=s?.skill??i?.skill;if(!c||!a||!l)throw new Error("Grok integration did not produce effective MCP/hooks/skill.");let u=Array.from(new Set([i?.mcp?.configFile,i?.hooks?.hooksFile,i?.skill?.skillFile,s?.mcp?.configFile,s?.hooks?.hooksFile,s?.skill?.skillFile].filter(p=>typeof p=="string")));return{installed:!0,changed:sn(i)||sn(s),scope:t,plan:r,project:n,global:i,projectScope:s,mcp:c,hooks:a,skill:l,files:u}}function an(e={}){if(e.scope==="global")return{scope:"global",automatic:!1,reason:"explicit-global"};if(e.scope==="project"||e.scope==="both"){let t=R({cwd:e.cwd,project:e.projectRoot});if(!t.eligible)throw new Error(`Explicit ${e.scope} integration requires an explicit project, ToolNet project, or Git repository root.`);return{scope:e.scope,automatic:!1,project:t,reason:e.scope==="project"?"explicit-project":"explicit-both"}}let o=R({cwd:e.cwd,project:e.projectRoot});return o.toolnetProject?{scope:"both",automatic:!0,project:o,reason:"toolnet-project"}:{scope:"global",automatic:!0,reason:"no-toolnet-project"}}function ln(){return qo()}function co(e={}){let o=e.binary??process.env.TOOLNET_MEMORY_BIN??"toolnet-memory",t=[],n=e.detections??ln(),r=new Map(n.map(s=>[s.agent,s.detected])),i=an({scope:e.scope,projectRoot:e.projectRoot,cwd:e.cwd});if(!(e.force===!0||r.get("agy")===!0))t.push({agent:"agy",detected:!1,installed:!1,targets:[]});else try{let c=nt({binary:o});t.push({agent:"agy",detected:!0,installed:!0,targets:c.files})}catch(c){t.push({agent:"agy",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("opencode")===!0))t.push({agent:"opencode",detected:!1,installed:!1,targets:[]});else try{let c=at({binary:o}),a=ft({binary:o});t.push({agent:"opencode",detected:!0,installed:!0,targets:[c,a.configFile,`mcp:${a.serverName}`]})}catch(c){t.push({agent:"opencode",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("claude")===!0))t.push({agent:"claude",detected:!1,installed:!1,targets:[]});else try{let c=bt({binary:o});t.push({agent:"claude",detected:!0,installed:!0,targets:[c.hooks.settingsFile,c.mcp.configFile,`mcp:${c.mcp.serverName}`]})}catch(c){t.push({agent:"claude",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("kiro")===!0))t.push({agent:"kiro",detected:!1,installed:!1,targets:[]});else try{let c=Ft({...e.kiro??{},binary:o});t.push({agent:"kiro",detected:!0,installed:!0,targets:[c.mcp.configFile,`mcp:${c.mcp.serverName}`,c.hooks.hooksFile]})}catch(c){t.push({agent:"kiro",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("cursor")===!0))t.push({agent:"cursor",detected:!1,installed:!1,targets:[]});else try{let c=e.cursor??{},a=qt({...c,binary:o,scope:c.scope??i.scope,projectRoot:c.projectRoot??i.project?.root});t.push({agent:"cursor",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(c){t.push({agent:"cursor",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("copilot")===!0))t.push({agent:"copilot",detected:!1,installed:!1,targets:[]});else try{let c=e.copilot??{},a=Zt({...c,binary:o,scope:c.scope??i.scope,projectRoot:c.projectRoot??i.project?.root});t.push({agent:"copilot",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(c){t.push({agent:"copilot",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("grok")===!0))t.push({agent:"grok",detected:!1,installed:!1,targets:[]});else try{let c=e.grok??{},a=cn({...c,binary:o,scope:c.scope??i.scope,projectRoot:c.projectRoot??i.project?.root});t.push({agent:"grok",detected:!0,installed:!0,scope:a.scope,projectRoot:a.project?.root,targets:[...a.files,`mcp:${a.mcp.serverName}`]})}catch(c){t.push({agent:"grok",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}if(!(e.force===!0||r.get("codex")===!0))t.push({agent:"codex",detected:!1,installed:!1,targets:[]});else try{let c=_t({binary:o}),a=ht({binary:o}),l=Lt({binary:o});if(!l.installed)throw new Error(l.error??"Codex MCP registration failed");let u=[c.configFile,a,`mcp:${l.serverName}`];c.preservedPrevious&&u.push(c.previousFile),t.push({agent:"codex",detected:!0,installed:!0,targets:u})}catch(c){t.push({agent:"codex",detected:!0,installed:!1,targets:[],error:c instanceof Error?c.message:String(c)})}return t}function gn(e){switch(e){case"agy":return"Agy / Antigravity";case"opencode":return"OpenCode";case"claude":return"Claude Code";case"kiro":return"Kiro CLI";case"cursor":return"Cursor CLI";case"copilot":return"GitHub Copilot CLI";case"grok":return"Grok Build";case"codex":return"Codex"}}function Ms(e){console.log(""),console.log("ToolNet Memory Integration Detection"),console.log("===================================="),console.log("");for(let o of e){let t=gn(o.agent);if(!o.detected){console.log(`\u25CB ${t}: not detected`);continue}console.log(`\u2713 ${t}: detected`);for(let n of o.evidence)console.log(`  ${n}`)}console.log("")}function bs(e){console.log(""),console.log("ToolNet Memory AI Integrations"),console.log("=============================="),console.log("");for(let o of e){let t=gn(o.agent);if(!o.detected){console.log(`- ${t}: not detected`);continue}if(o.installed){let n=o.scope?` [scope=${o.scope}]`:"";console.log(`\u2713 ${t}: automatic memory enabled${n}`),o.projectRoot&&console.log(`  project: ${o.projectRoot}`);continue}console.log(`\u2717 ${t}: integration failed`),o.error&&console.log(`  ${o.error}`)}console.log("")}function ks(e,o){let t=e.indexOf(o);return t>=0?e[t+1]:void 0}function Rs(e){return e.includes("--scope")||e.includes("--global")||e.includes("--both")?Gt(e):void 0}async function Ns(){let e=process.argv.slice(2),o=e.includes("--all"),t=e.includes("--json"),n=e.includes("--detect-only"),r=Rs(e),i=ks(e,"--project");if(n){let c=ln();if(t){console.log(JSON.stringify(c,null,2));return}Ms(c);return}let s=co({force:o,scope:r,projectRoot:i});if(t){console.log(JSON.stringify(s,null,2));return}bs(s)}var Ps=process.argv[1]&&(process.argv[1].endsWith("auto-integrate.js")||process.argv[1].endsWith("auto-integrate.ts"));Ps&&Ns().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});var ao=re.join(lo.homedir(),".config","toolnet-memory"),h=re.join(ao,".env"),Fs=new Set(["MEMORY_STORAGE_PROVIDER","R2_ACCOUNT_ID","R2_BUCKET","R2_ACCESS_KEY_ID","R2_SECRET_ACCESS_KEY","S3_ENDPOINT","S3_REGION","S3_BUCKET","S3_ACCESS_KEY_ID","S3_SECRET_ACCESS_KEY","S3_FORCE_PATH_STYLE","HF_NAMESPACE","HF_BUCKET","HF_S3_ACCESS_KEY_ID","HF_S3_SECRET_ACCESS_KEY","HF_URL","HF_TOKEN","HF_EMBEDDING_MODEL","TOOLNET_LLM_PROVIDER","TOOLNET_LLM_API_KEY","TOOLNET_LLM_BASE_URL","TOOLNET_LLM_MODEL","TOOLNET_LLM_FALLBACK_1_PROVIDER","TOOLNET_LLM_FALLBACK_1_API_KEY","TOOLNET_LLM_FALLBACK_1_BASE_URL","TOOLNET_LLM_FALLBACK_1_MODEL","TOOLNET_LLM_FALLBACK_1_ACCOUNT_ID","TOOLNET_LLM_FALLBACK_2_PROVIDER","TOOLNET_LLM_FALLBACK_2_API_KEY","TOOLNET_LLM_FALLBACK_2_BASE_URL","TOOLNET_LLM_FALLBACK_2_MODEL","TOOLNET_LLM_FALLBACK_2_ACCOUNT_ID","TOOLNET_LLM_FALLBACK_COOLDOWN_MS","TOOLNET_LLM_MAX_RETRIES","TOOLNET_LLM_ACCOUNT_ID","TOOLNET_EMBEDDING_PROVIDER","TOOLNET_EMBEDDING_API_KEY","TOOLNET_EMBEDDING_BASE_URL","TOOLNET_EMBEDDING_MODEL","TOOLNET_EMBEDDING_ACCOUNT_ID","MEMORY_LOCAL_STORAGE_PATH","MEMORY_LOCAL_CACHE_MB","MEMORY_AUTO_CAPTURE","MEMORY_AUTO_RETRIEVE","MEMORY_AUTO_SUMMARIZE","MEMORY_AUTO_SYNC","MEMORY_MAX_CANDIDATES","MEMORY_RERANK_TOP","MEMORY_FINAL_CONTEXT","MEMORY_TOKEN_BUDGET","TOOLNET_SESSION_LEARNING","TOOLNET_WORK_CONTINUITY","TOOLNET_SEMANTIC_CONTINUITY","TOOLNET_SMART_HANDOFF"]);function xs(e){let o=new Map;for(let t of e.split(/\r?\n/)){let n=t.trim();if(!n||n.startsWith("#"))continue;let r=n.indexOf("=");if(r===-1)continue;let i=n.slice(0,r).trim(),s=n.slice(r+1).trim();i&&o.set(i,s)}return o}function j(e){let o=e.get("MEMORY_STORAGE_PROVIDER")?.trim();return o==="r2"||o==="s3"||o==="local"||o==="huggingface"?o:e.get("R2_ACCOUNT_ID")&&e.get("R2_BUCKET")?"r2":e.get("S3_BUCKET")?"s3":e.get("HF_BUCKET")&&e.get("HF_S3_ACCESS_KEY_ID")?"huggingface":e.get("MEMORY_LOCAL_STORAGE_PATH")?"local":"r2"}function ie(e){switch(e){case"r2":return"Cloudflare R2";case"s3":return"S3 / S3-compatible";case"huggingface":return"Hugging Face S3";case"local":return"Local";default:return e}}function pn(e){switch(e){case"r2":return["R2_ACCOUNT_ID","R2_BUCKET","R2_ACCESS_KEY_ID","R2_SECRET_ACCESS_KEY"];case"s3":return["S3_BUCKET","S3_ACCESS_KEY_ID","S3_SECRET_ACCESS_KEY"];case"huggingface":return["HF_BUCKET","HF_S3_ACCESS_KEY_ID","HF_S3_SECRET_ACCESS_KEY"];case"local":return[];default:return[]}}function mn(e){let o=j(e);return o==="local"?!0:pn(o).every(t=>!!e.get(t)?.trim())}function go(e){return e?e.length<=8?"configured":`${e.slice(0,4)}\u2022\u2022\u2022\u2022${e.slice(-3)}`:"not configured"}function vs(e){let t=["# ==========================================================","# TOOLNET MEMORY","# Generated by: toolnet-memory setup","# Do not commit this file.","# ==========================================================","",`MEMORY_STORAGE_PROVIDER=${j(e)}`,"","# ----------------------------------------------------------","# Cloudflare R2","# ----------------------------------------------------------",`R2_ACCOUNT_ID=${e.get("R2_ACCOUNT_ID")??""}`,`R2_BUCKET=${e.get("R2_BUCKET")??"toolnet-memory"}`,`R2_ACCESS_KEY_ID=${e.get("R2_ACCESS_KEY_ID")??""}`,`R2_SECRET_ACCESS_KEY=${e.get("R2_SECRET_ACCESS_KEY")??""}`,"","# ----------------------------------------------------------","# Generic S3 / S3-compatible","# ----------------------------------------------------------",`S3_ENDPOINT=${e.get("S3_ENDPOINT")??""}`,`S3_REGION=${e.get("S3_REGION")??"us-east-1"}`,`S3_BUCKET=${e.get("S3_BUCKET")??"toolnet-memory"}`,`S3_ACCESS_KEY_ID=${e.get("S3_ACCESS_KEY_ID")??""}`,`S3_SECRET_ACCESS_KEY=${e.get("S3_SECRET_ACCESS_KEY")??""}`,`S3_FORCE_PATH_STYLE=${e.get("S3_FORCE_PATH_STYLE")??"false"}`,"","# ----------------------------------------------------------","# Hugging Face S3","# ----------------------------------------------------------",`HF_NAMESPACE=${e.get("HF_NAMESPACE")??""}`,`HF_BUCKET=${e.get("HF_BUCKET")??"toolnet-memory"}`,`HF_S3_ACCESS_KEY_ID=${e.get("HF_S3_ACCESS_KEY_ID")??""}`,`HF_S3_SECRET_ACCESS_KEY=${e.get("HF_S3_SECRET_ACCESS_KEY")??""}`,`HF_URL=${e.get("HF_URL")??""}`,"","# ----------------------------------------------------------","# AI / LLM - canonical ToolNet configuration","# ----------------------------------------------------------",`TOOLNET_LLM_PROVIDER=${e.get("TOOLNET_LLM_PROVIDER")??""}`,`TOOLNET_LLM_API_KEY=${e.get("TOOLNET_LLM_API_KEY")??""}`,`TOOLNET_LLM_BASE_URL=${e.get("TOOLNET_LLM_BASE_URL")??""}`,`TOOLNET_LLM_MODEL=${e.get("TOOLNET_LLM_MODEL")??""}`,`TOOLNET_LLM_ACCOUNT_ID=${e.get("TOOLNET_LLM_ACCOUNT_ID")??""}`,"","# ----------------------------------------------------------","# LLM fallback chain","# ----------------------------------------------------------",`TOOLNET_LLM_FALLBACK_1_PROVIDER=${e.get("TOOLNET_LLM_FALLBACK_1_PROVIDER")??""}`,`TOOLNET_LLM_FALLBACK_1_API_KEY=${e.get("TOOLNET_LLM_FALLBACK_1_API_KEY")??""}`,`TOOLNET_LLM_FALLBACK_1_BASE_URL=${e.get("TOOLNET_LLM_FALLBACK_1_BASE_URL")??""}`,`TOOLNET_LLM_FALLBACK_1_MODEL=${e.get("TOOLNET_LLM_FALLBACK_1_MODEL")??""}`,`TOOLNET_LLM_FALLBACK_1_ACCOUNT_ID=${e.get("TOOLNET_LLM_FALLBACK_1_ACCOUNT_ID")??""}`,`TOOLNET_LLM_FALLBACK_2_PROVIDER=${e.get("TOOLNET_LLM_FALLBACK_2_PROVIDER")??""}`,`TOOLNET_LLM_FALLBACK_2_API_KEY=${e.get("TOOLNET_LLM_FALLBACK_2_API_KEY")??""}`,`TOOLNET_LLM_FALLBACK_2_BASE_URL=${e.get("TOOLNET_LLM_FALLBACK_2_BASE_URL")??""}`,`TOOLNET_LLM_FALLBACK_2_MODEL=${e.get("TOOLNET_LLM_FALLBACK_2_MODEL")??""}`,`TOOLNET_LLM_FALLBACK_2_ACCOUNT_ID=${e.get("TOOLNET_LLM_FALLBACK_2_ACCOUNT_ID")??""}`,`TOOLNET_LLM_FALLBACK_COOLDOWN_MS=${e.get("TOOLNET_LLM_FALLBACK_COOLDOWN_MS")??"60000"}`,`TOOLNET_LLM_MAX_RETRIES=${e.get("TOOLNET_LLM_MAX_RETRIES")??"1"}`,"","# ----------------------------------------------------------","# Embedding - canonical ToolNet configuration","# ----------------------------------------------------------",`TOOLNET_EMBEDDING_PROVIDER=${e.get("TOOLNET_EMBEDDING_PROVIDER")??""}`,`TOOLNET_EMBEDDING_API_KEY=${e.get("TOOLNET_EMBEDDING_API_KEY")??""}`,`TOOLNET_EMBEDDING_BASE_URL=${e.get("TOOLNET_EMBEDDING_BASE_URL")??""}`,`TOOLNET_EMBEDDING_MODEL=${e.get("TOOLNET_EMBEDDING_MODEL")??""}`,`TOOLNET_EMBEDDING_ACCOUNT_ID=${e.get("TOOLNET_EMBEDDING_ACCOUNT_ID")??""}`,"","# ----------------------------------------------------------","# Embedding - legacy/current compatibility","# ----------------------------------------------------------",`HF_TOKEN=${e.get("HF_TOKEN")??""}`,`HF_EMBEDDING_MODEL=${e.get("HF_EMBEDDING_MODEL")??"sentence-transformers/all-MiniLM-L6-v2"}`,"","# ----------------------------------------------------------","# Local storage/cache","# ----------------------------------------------------------",`MEMORY_LOCAL_STORAGE_PATH=${e.get("MEMORY_LOCAL_STORAGE_PATH")??""}`,`MEMORY_LOCAL_CACHE_MB=${e.get("MEMORY_LOCAL_CACHE_MB")??"200"}`,"","# ----------------------------------------------------------","# Automation","# ----------------------------------------------------------",`MEMORY_AUTO_CAPTURE=${e.get("MEMORY_AUTO_CAPTURE")??"true"}`,`MEMORY_AUTO_RETRIEVE=${e.get("MEMORY_AUTO_RETRIEVE")??"true"}`,`MEMORY_AUTO_SUMMARIZE=${e.get("MEMORY_AUTO_SUMMARIZE")??"true"}`,`MEMORY_AUTO_SYNC=${e.get("MEMORY_AUTO_SYNC")??"true"}`,"","# ----------------------------------------------------------","# Retrieval","# ----------------------------------------------------------",`MEMORY_MAX_CANDIDATES=${e.get("MEMORY_MAX_CANDIDATES")??"50"}`,`MEMORY_RERANK_TOP=${e.get("MEMORY_RERANK_TOP")??"10"}`,`MEMORY_FINAL_CONTEXT=${e.get("MEMORY_FINAL_CONTEXT")??"5"}`,`MEMORY_TOKEN_BUDGET=${e.get("MEMORY_TOKEN_BUDGET")??"2000"}`,"","# ----------------------------------------------------------","# Automatic Session Memory","# ----------------------------------------------------------",`TOOLNET_SESSION_LEARNING=${e.get("TOOLNET_SESSION_LEARNING")??"1"}`,`TOOLNET_WORK_CONTINUITY=${e.get("TOOLNET_WORK_CONTINUITY")??"1"}`,`TOOLNET_SEMANTIC_CONTINUITY=${e.get("TOOLNET_SEMANTIC_CONTINUITY")??"1"}`,`TOOLNET_SMART_HANDOFF=${e.get("TOOLNET_SMART_HANDOFF")??"1"}`],n=[...e.entries()].filter(([r])=>!Fs.has(r));if(n.length>0){t.push("","# ----------------------------------------------------------","# Preserved settings","# ----------------------------------------------------------");for(let[r,i]of n)t.push(`${r}=${i}`)}return`${t.join(`
`)}
`}function _(e){C.mkdirSync(ao,{recursive:!0,mode:448});let o=`${h}.tmp-${process.pid}`;C.writeFileSync(o,vs(e),{encoding:"utf8",mode:384}),C.renameSync(o,h),C.chmodSync(ao,448),C.chmodSync(h,384)}function I(e,o,t,n){let r=t.trim();if(r){e.set(o,r);return}!e.get(o)&&n!==void 0&&e.set(o,n)}async function J(e,o){return L.isTTY?(e.pause(),ne.write(o),new Promise(t=>{let n="",r=!1,i=()=>{r||(r=!0,L.off("data",s),L.setRawMode?.(!1),L.pause(),ne.write(`
`),e.resume(),t(n))},s=c=>{for(let a of c.toString("utf8")){if(a==="\r"||a===`
`){i();return}if(a===""&&(L.off("data",s),L.setRawMode?.(!1),ne.write(`
`),process.exit(130)),a==="\x7F"){n=n.slice(0,-1);continue}n+=a}};L.resume(),L.setRawMode?.(!0),L.on("data",s)})):""}function F(e){return e.trim().replace(/\/+$/,"")}function En(e){return`https://${e}.r2.cloudflarestorage.com`}async function uo(e){let o=new AbortController,t=setTimeout(()=>o.abort(),15e3);t.unref?.();let n=new js({region:e.region,endpoint:e.endpoint||void 0,forcePathStyle:e.forcePathStyle??!1,credentials:{accessKeyId:e.accessKeyId,secretAccessKey:e.secretAccessKey}});try{return await n.send(new ws({Bucket:e.bucket}),{abortSignal:o.signal}),{ok:!0,message:`Bucket "${e.bucket}" reachable`}}catch(r){return{ok:!1,message:r instanceof Error?r.message:String(r)}}finally{clearTimeout(t),n.destroy()}}async function Ks(e){let o=e.get("R2_ACCOUNT_ID")?.trim()??"",t=e.get("R2_BUCKET")?.trim()??"",n=e.get("R2_ACCESS_KEY_ID")?.trim()??"",r=e.get("R2_SECRET_ACCESS_KEY")?.trim()??"";return!o||!t||!n||!r?{ok:!1,message:"R2 configuration is incomplete"}:uo({endpoint:En(o),region:"auto",bucket:t,accessKeyId:n,secretAccessKey:r})}async function Us(e){let o=F(e.get("S3_ENDPOINT")??""),t=e.get("S3_REGION")?.trim()||"us-east-1",n=e.get("S3_BUCKET")?.trim()??"",r=e.get("S3_ACCESS_KEY_ID")?.trim()??"",i=e.get("S3_SECRET_ACCESS_KEY")?.trim()??"";return!n||!r||!i?{ok:!1,message:"S3 configuration is incomplete"}:uo({endpoint:o||void 0,region:t,bucket:n,accessKeyId:r,secretAccessKey:i,forcePathStyle:e.get("S3_FORCE_PATH_STYLE")==="true"})}async function $s(e){let o=F(e.get("HF_URL")??""),t=e.get("HF_BUCKET")?.trim()??"",n=e.get("HF_S3_ACCESS_KEY_ID")?.trim()??"",r=e.get("HF_S3_SECRET_ACCESS_KEY")?.trim()??"";return o?!t||!n||!r?{ok:!1,message:"Hugging Face S3 configuration is incomplete"}:uo({endpoint:o,region:"us-east-1",bucket:t,accessKeyId:n,secretAccessKey:r,forcePathStyle:!0}):{ok:!1,message:"HF_URL / S3 endpoint is required for connection test"}}async function Bs(e){let o=e.get("MEMORY_LOCAL_STORAGE_PATH")?.trim()||re.join(lo.homedir(),".local","share","toolnet-memory"),t=re.join(o,`.toolnet-test-${process.pid}-${Date.now()}`);try{return C.mkdirSync(o,{recursive:!0,mode:448}),C.writeFileSync(t,`toolnet-memory
`,{encoding:"utf8",mode:384}),C.unlinkSync(t),{ok:!0,message:`Writable: ${o}`}}catch(n){return{ok:!1,message:n instanceof Error?n.message:String(n)}}}async function Hs(e,o){switch(e){case"r2":return Ks(o);case"s3":return Us(o);case"huggingface":return $s(o);case"local":return Bs(o)}}async function Ys(e,o){console.log(""),console.log(`Testing ${ie(e)}...`);let t=await Hs(e,o);return t.ok?console.log(`\u2713 ${t.message}`):(console.log("\u2717 Connection test failed"),console.log(`  ${t.message}`)),console.log(""),t}function Gs(){console.log(""),console.log("\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557"),console.log("\u2551         TOOLNET MEMORY SETUP         \u2551"),console.log("\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D"),console.log("")}function Js(e){let o=j(e);console.log("Current configuration"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),console.log(`Storage : ${ie(o)} ${mn(e)?"\u2713":"\u26A0 incomplete"}`);let t=e.get("TOOLNET_LLM_PROVIDER"),n=e.get("TOOLNET_LLM_MODEL"),r=e.get("TOOLNET_EMBEDDING_PROVIDER");console.log(`LLM     : ${t?`${S(t)}${n?` / ${n}`:""}`:"not configured"}`),console.log(`Embedding: ${r||"legacy/default"}`),console.log("")}async function qs(e){console.log("Setup"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),console.log("  1. Storage"),console.log("  2. AI Model"),console.log("  3. Finish & Save"),console.log("  0. Exit without saving"),console.log("");let o=(await e.question("Choose [1-3]: ")).trim();return o==="1"?"storage":o==="2"?"ai":o==="0"?"exit":"finish"}async function Vs(e,o){console.log(""),console.log("Storage"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),console.log(`  1. Cloudflare R2${o==="r2"?"  \u2713 current":""}`),console.log(`  2. S3 / S3-compatible${o==="s3"?"  \u2713 current":""}`),console.log(`  3. Hugging Face S3${o==="huggingface"?"  \u2713 current":""}`),console.log(`  4. Local${o==="local"?"  \u2713 current":""}`),console.log(""),console.log("  0. Back"),console.log("");let t=(await e.question("Choose storage: ")).trim();return t==="0"?"back":t==="2"?"s3":t==="3"?"huggingface":t==="4"?"local":"r2"}async function Ws(e,o){console.log(""),console.log("Cloudflare R2"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");let t=await e.question(o.get("R2_ACCOUNT_ID")?`ACCOUNT ID [${o.get("R2_ACCOUNT_ID")}]: `:"ACCOUNT ID: "),n=await e.question(o.get("R2_ACCESS_KEY_ID")?`ACCESS KEY ID [${go(o.get("R2_ACCESS_KEY_ID"))}]: `:"ACCESS KEY ID: "),r=await e.question(`BUCKET [${o.get("R2_BUCKET")||"toolnet-memory"}]: `);I(o,"R2_ACCOUNT_ID",t),I(o,"R2_ACCESS_KEY_ID",n),I(o,"R2_BUCKET",r,"toolnet-memory");let i=o.get("R2_ACCOUNT_ID")?.trim();i&&console.log(`URL: ${En(i)}`);let s=await J(e,o.get("R2_SECRET_ACCESS_KEY")?"SECRET ACCESS KEY [configured, Enter = keep]: ":"SECRET ACCESS KEY: ");s.trim()&&o.set("R2_SECRET_ACCESS_KEY",s.trim())}async function Xs(e,o){console.log(""),console.log("S3 / S3-compatible"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");let t=await e.question(o.get("S3_ENDPOINT")?`URL / ENDPOINT [${o.get("S3_ENDPOINT")}]: `:"URL / ENDPOINT [blank = AWS S3]: "),n=await e.question(`REGION [${o.get("S3_REGION")||"us-east-1"}]: `),r=await e.question(o.get("S3_ACCESS_KEY_ID")?`ACCESS KEY ID [${go(o.get("S3_ACCESS_KEY_ID"))}]: `:"ACCESS KEY ID: "),i=await e.question(`BUCKET [${o.get("S3_BUCKET")||"toolnet-memory"}]: `),s=o.get("S3_FORCE_PATH_STYLE")==="true",c=await e.question(`FORCE PATH STYLE [${s?"Y":"N"}] (y/n): `);if(t.trim()&&o.set("S3_ENDPOINT",F(t)),I(o,"S3_REGION",n,"us-east-1"),I(o,"S3_ACCESS_KEY_ID",r),I(o,"S3_BUCKET",i,"toolnet-memory"),c.trim()){let l=c.trim().toLowerCase();o.set("S3_FORCE_PATH_STYLE",l==="y"||l==="yes"?"true":"false")}else o.has("S3_FORCE_PATH_STYLE")||o.set("S3_FORCE_PATH_STYLE","false");let a=await J(e,o.get("S3_SECRET_ACCESS_KEY")?"SECRET ACCESS KEY [configured, Enter = keep]: ":"SECRET ACCESS KEY: ");a.trim()&&o.set("S3_SECRET_ACCESS_KEY",a.trim())}async function zs(e,o){console.log(""),console.log("Hugging Face S3"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");let t=await e.question(o.get("HF_NAMESPACE")?`NAMESPACE [${o.get("HF_NAMESPACE")}]: `:"NAMESPACE [optional]: "),n=await e.question(o.get("HF_S3_ACCESS_KEY_ID")?`ACCESS KEY ID [${go(o.get("HF_S3_ACCESS_KEY_ID"))}]: `:"ACCESS KEY ID: "),r=await e.question(`BUCKET [${o.get("HF_BUCKET")||"toolnet-memory"}]: `),i=await e.question(o.get("HF_URL")?`URL [${o.get("HF_URL")}]: `:"URL / S3 ENDPOINT: ");I(o,"HF_NAMESPACE",t),I(o,"HF_S3_ACCESS_KEY_ID",n),I(o,"HF_BUCKET",r,"toolnet-memory"),i.trim()&&o.set("HF_URL",F(i));let s=await J(e,o.get("HF_S3_SECRET_ACCESS_KEY")?"SECRET ACCESS KEY [configured, Enter = keep]: ":"SECRET ACCESS KEY: ");s.trim()&&o.set("HF_S3_SECRET_ACCESS_KEY",s.trim())}async function Qs(e,o){console.log(""),console.log("Local Storage"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");let t=o.get("MEMORY_LOCAL_STORAGE_PATH")??re.join(lo.homedir(),".local","share","toolnet-memory"),n=await e.question(`LOCAL PATH [${t}]: `);I(o,"MEMORY_LOCAL_STORAGE_PATH",n,t)}async function Zs(e,o){let t=new Map(o);for(;;){let n=await Vs(e,j(o));if(n==="back")return;let r=new Map(o);o.set("MEMORY_STORAGE_PROVIDER",n),n==="r2"?await Ws(e,o):n==="s3"?await Xs(e,o):n==="huggingface"?await zs(e,o):await Qs(e,o);let i=pn(n).filter(a=>!o.get(a)?.trim());if(i.length){console.log(""),console.log("\u26A0 Missing required fields:");for(let l of i)console.log(`  - ${l}`);console.log(""),console.log("  1. Retry"),console.log("  2. Save anyway"),console.log("  3. Choose another provider"),console.log("  4. Cancel"),console.log("");let a=(await e.question("Choose [1]: ")).trim()||"1";if(a==="2"){_(o),console.log(""),console.log("\u26A0 Saved with incomplete configuration"),console.log("");return}if(a==="3"){o.clear();for(let[l,u]of r)o.set(l,u);continue}if(a==="4"){o.clear();for(let[l,u]of t)o.set(l,u);console.log(""),console.log("Storage changes cancelled."),console.log("");return}continue}if((await Ys(n,o)).ok){_(o),console.log(`\u2713 ${ie(n)} configuration saved`),console.log(`  ${h}`),console.log("");return}console.log("  1. Retry"),console.log("  2. Save anyway"),console.log("  3. Choose another provider"),console.log("  4. Cancel"),console.log("");let c=(await e.question("Choose [1]: ")).trim()||"1";if(c==="2"){_(o),console.log(""),console.log("\u26A0 Saved even though connection test failed"),console.log("");return}if(c==="3"){o.clear();for(let[a,l]of r)o.set(a,l);continue}if(c==="4"){o.clear();for(let[a,l]of t)o.set(a,l);console.log(""),console.log("Storage changes cancelled."),console.log("");return}}}var w=[{id:"openai-compatible",label:"OpenAI-compatible",apiKeyRequired:!0,baseUrlRequired:!0},{id:"alibaba",label:"Alibaba / DashScope",baseUrl:"https://dashscope-intl.aliyuncs.com/compatible-mode/v1",suggestedModel:"qwen3.6-flash",apiKeyRequired:!0},{id:"openrouter",label:"OpenRouter",baseUrl:"https://openrouter.ai/api/v1",apiKeyRequired:!0},{id:"groq",label:"Groq",baseUrl:"https://api.groq.com/openai/v1",apiKeyRequired:!0},{id:"deepseek",label:"DeepSeek",baseUrl:"https://api.deepseek.com",suggestedModel:"deepseek-v4-flash",apiKeyRequired:!0},{id:"nvidia",label:"NVIDIA NIM",baseUrl:"https://integrate.api.nvidia.com/v1",suggestedModel:"deepseek-ai/deepseek-v4-pro",apiKeyRequired:!0},{id:"gemini",label:"Gemini",baseUrl:"https://generativelanguage.googleapis.com/v1beta",suggestedModel:"gemini-3.6-flash",apiKeyRequired:!0},{id:"huggingface",label:"Hugging Face",baseUrl:"https://router.huggingface.co/v1",apiKeyRequired:!0},{id:"ollama",label:"Ollama / Local",baseUrl:"http://127.0.0.1:11434/v1",apiKeyRequired:!1},{id:"custom",label:"Custom endpoint",apiKeyRequired:!1,baseUrlRequired:!0},{id:"cloudflare",label:"Cloudflare Workers AI",suggestedModel:"@cf/meta/llama-3.1-8b-instruct",apiKeyRequired:!0,accountIdRequired:!0}];function ec(e){return w.find(o=>o.id===e)}function S(e){return ec(e)?.label??e??"not configured"}function On(e){let o=e.get("TOOLNET_LLM_PROVIDER")?.trim();return w.some(t=>t.id===o)?o:void 0}async function fo(e,o){console.log(""),console.log("AI Model"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),w.forEach((r,i)=>{console.log(`  ${i+1}. ${r.label}${o===r.id?"  \u2713 current":""}`)}),console.log(""),console.log("  0. Back"),console.log("");let t=(await e.question("Choose provider: ")).trim();if(t==="0")return"back";let n=Number(t)-1;return Number.isInteger(n)&&n>=0&&n<w.length?w[n].id:(console.log(""),console.log("\u26A0 Invalid provider selection"),fo(e,o))}function oc(e,o){return!(!e.get("TOOLNET_LLM_MODEL")?.trim()||o.apiKeyRequired&&!e.get("TOOLNET_LLM_API_KEY")?.trim()||o.accountIdRequired&&!e.get("TOOLNET_LLM_ACCOUNT_ID")?.trim()||o.baseUrlRequired&&!e.get("TOOLNET_LLM_BASE_URL")?.trim())}function tc(e){e.delete("TOOLNET_LLM_API_KEY"),e.delete("TOOLNET_LLM_BASE_URL"),e.delete("TOOLNET_LLM_MODEL"),e.delete("TOOLNET_LLM_ACCOUNT_ID")}async function nc(e,o,t){console.log(""),console.log(t.label),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");let n=o.get("TOOLNET_LLM_PROVIDER");if(n&&n!==t.id&&tc(o),o.set("TOOLNET_LLM_PROVIDER",t.id),t.accountIdRequired){let a=o.get("TOOLNET_LLM_ACCOUNT_ID"),l=await e.question(a?`ACCOUNT ID [${a}]: `:"ACCOUNT ID: ");I(o,"TOOLNET_LLM_ACCOUNT_ID",l)}else o.delete("TOOLNET_LLM_ACCOUNT_ID");if(t.apiKeyRequired||t.id==="custom"){let a=o.get("TOOLNET_LLM_API_KEY"),l=await J(e,a?"API KEY [configured, Enter = keep]: ":t.apiKeyRequired?"API KEY: ":"API KEY [optional]: ");l.trim()&&o.set("TOOLNET_LLM_API_KEY",l.trim())}else o.delete("TOOLNET_LLM_API_KEY");if(t.id!=="cloudflare"){let l=o.get("TOOLNET_LLM_BASE_URL")||t.baseUrl||"",p=(await e.question(l?`BASE URL [${l}]: `:t.baseUrlRequired?"BASE URL: ":"BASE URL [optional]: ")).trim()||l;p?o.set("TOOLNET_LLM_BASE_URL",F(p)):o.delete("TOOLNET_LLM_BASE_URL")}else o.delete("TOOLNET_LLM_BASE_URL");let i=o.get("TOOLNET_LLM_MODEL")||t.suggestedModel||"",c=(await e.question(i?`MODEL [${i}]: `:"MODEL: ")).trim()||i;c&&o.set("TOOLNET_LLM_MODEL",c)}function rc(e){let o=On(e);if(!o)throw new Error("AI provider is not configured");return{id:o,apiKey:e.get("TOOLNET_LLM_API_KEY")?.trim()||void 0,baseUrl:e.get("TOOLNET_LLM_BASE_URL")?.trim()||void 0,model:e.get("TOOLNET_LLM_MODEL")?.trim()||void 0,accountId:e.get("TOOLNET_LLM_ACCOUNT_ID")?.trim()||void 0}}async function ic(e){let o=rc(e);console.log(""),console.log(`Testing ${S(o.id)}...`);try{let n=await ho(o).healthCheck();return n.ok?(console.log(`\u2713 Provider reachable${n.latencyMs?` (${n.latencyMs} ms)`:""}`),console.log(`\u2713 Model: ${n.model??o.model??"configured"}`),console.log(""),{ok:!0,message:n.message}):(console.log("\u2717 AI provider test failed"),console.log(`  ${n.message}`),console.log(""),{ok:!1,message:n.message})}catch(t){let n=t instanceof Error?t.message:String(t);return console.log("\u2717 AI provider test failed"),console.log(`  ${n}`),console.log(""),{ok:!1,message:n}}}var ke=[{id:"local",label:"Local / Hash",apiKeyRequired:!1},{id:"huggingface",label:"Hugging Face",suggestedModel:"sentence-transformers/all-MiniLM-L6-v2",apiKeyRequired:!0},{id:"openai-compatible",label:"OpenAI-compatible",apiKeyRequired:!0,baseUrlRequired:!0},{id:"alibaba",label:"Alibaba / DashScope",baseUrl:"https://dashscope-intl.aliyuncs.com/compatible-mode/v1",suggestedModel:"text-embedding-v4",apiKeyRequired:!0},{id:"openrouter",label:"OpenRouter",baseUrl:"https://openrouter.ai/api/v1",apiKeyRequired:!0},{id:"nvidia",label:"NVIDIA NIM",baseUrl:"https://integrate.api.nvidia.com/v1",apiKeyRequired:!0},{id:"ollama",label:"Ollama / Local",baseUrl:"http://127.0.0.1:11434/v1",apiKeyRequired:!1},{id:"gemini",label:"Gemini",baseUrl:"https://generativelanguage.googleapis.com/v1beta",suggestedModel:"gemini-embedding-001",apiKeyRequired:!0},{id:"cloudflare",label:"Cloudflare Workers AI",suggestedModel:"@cf/baai/bge-base-en-v1.5",apiKeyRequired:!0,accountIdRequired:!0},{id:"custom",label:"Custom OpenAI-compatible endpoint",apiKeyRequired:!1,baseUrlRequired:!0}];function po(e){return ke.find(o=>o.id===e)?.label??e??"not configured"}async function _n(e,o){console.log(""),console.log("Embedding Model"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),ke.forEach((r,i)=>{console.log(`  ${i+1}. ${r.label}${o===r.id?"  \u2713 current":""}`)}),console.log(""),console.log("  0. Back"),console.log("");let t=(await e.question("Choose embedding provider: ")).trim();if(t==="0")return"back";let n=Number(t)-1;return Number.isInteger(n)&&n>=0&&n<ke.length?ke[n]:(console.log(""),console.log("\u26A0 Invalid selection"),_n(e,o))}function un(e){e.delete("TOOLNET_EMBEDDING_API_KEY"),e.delete("TOOLNET_EMBEDDING_BASE_URL"),e.delete("TOOLNET_EMBEDDING_MODEL"),e.delete("TOOLNET_EMBEDDING_ACCOUNT_ID")}async function sc(e,o,t){let n=o.get("TOOLNET_EMBEDDING_PROVIDER");if(n&&n!==t.id&&un(o),o.set("TOOLNET_EMBEDDING_PROVIDER",t.id),console.log(""),console.log(t.label),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),t.id==="local"){un(o),console.log("\u2713 Local embedding selected"),console.log("  No API key required.");return}if(t.accountIdRequired){let a=o.get("TOOLNET_EMBEDDING_ACCOUNT_ID"),l=await e.question(a?`ACCOUNT ID [${a}]: `:"ACCOUNT ID: ");I(o,"TOOLNET_EMBEDDING_ACCOUNT_ID",l)}else o.delete("TOOLNET_EMBEDDING_ACCOUNT_ID");if(t.apiKeyRequired||t.id==="custom"){let a=o.get("TOOLNET_EMBEDDING_API_KEY"),l=await J(e,a?"API KEY [configured, Enter = keep]: ":t.apiKeyRequired?"API KEY: ":"API KEY [optional]: ");l.trim()&&o.set("TOOLNET_EMBEDDING_API_KEY",l.trim())}else o.delete("TOOLNET_EMBEDDING_API_KEY");if(t.id==="cloudflare"){let a=o.get("TOOLNET_EMBEDDING_ACCOUNT_ID")?.trim();if(a){let l=`https://api.cloudflare.com/client/v4/accounts/${a}/ai/v1`;o.set("TOOLNET_EMBEDDING_BASE_URL",l),console.log(`BASE URL: ${l}`)}}else{let l=o.get("TOOLNET_EMBEDDING_BASE_URL")||t.baseUrl||"",p=(await e.question(l?`BASE URL [${l}]: `:t.baseUrlRequired?"BASE URL: ":"BASE URL [optional]: ")).trim()||l;p&&o.set("TOOLNET_EMBEDDING_BASE_URL",F(p))}let i=o.get("TOOLNET_EMBEDDING_MODEL")||t.suggestedModel||"",c=(await e.question(i?`MODEL [${i}]: `:"MODEL: ")).trim()||i;c&&o.set("TOOLNET_EMBEDDING_MODEL",c)}function cc(e,o){return o.id==="local"?!0:o.apiKeyRequired&&!e.get("TOOLNET_EMBEDDING_API_KEY")?.trim()||o.accountIdRequired&&!e.get("TOOLNET_EMBEDDING_ACCOUNT_ID")?.trim()||o.baseUrlRequired&&!e.get("TOOLNET_EMBEDDING_BASE_URL")?.trim()?!1:!!e.get("TOOLNET_EMBEDDING_MODEL")?.trim()}async function yn(e){let o=e.get("TOOLNET_EMBEDDING_PROVIDER")?.trim();if(console.log(""),console.log(`Testing embedding: ${po(o)}...`),o==="local")return console.log("\u2713 Local embedding ready"),console.log(""),!0;let t=e.get("TOOLNET_EMBEDDING_API_KEY")?.trim(),n=e.get("TOOLNET_EMBEDDING_MODEL")?.trim(),r=e.get("TOOLNET_EMBEDDING_BASE_URL")?.trim();try{if(!n)throw new Error("Embedding model is missing");if(o==="huggingface"){if(!t)throw new Error("API key is missing");let i=await fetch(`https://router.huggingface.co/hf-inference/models/${n}/pipeline/feature-extraction`,{method:"POST",headers:{Authorization:`Bearer ${t}`,"Content-Type":"application/json"},body:JSON.stringify({inputs:["toolnet memory test"]})});if(!i.ok)throw new Error(`HTTP ${i.status}: ${await i.text()}`)}else if(o==="gemini"){if(!t)throw new Error("API key is missing");let i=n.replace(/^models\//,"");r=r||"https://generativelanguage.googleapis.com/v1beta";let s=await fetch(`${r.replace(/\/+$/,"")}/models/${encodeURIComponent(i)}:embedContent?key=${encodeURIComponent(t)}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({model:`models/${i}`,content:{parts:[{text:"toolnet memory test"}]}})});if(!s.ok)throw new Error(`HTTP ${s.status}: ${await s.text()}`)}else{if(!r)throw new Error("BASE URL is missing");let i=await fetch(`${r.replace(/\/+$/,"")}/embeddings`,{method:"POST",headers:{"content-type":"application/json",...t?{authorization:`Bearer ${t}`}:{}},body:JSON.stringify({model:n,input:["toolnet memory test"]})});if(!i.ok)throw new Error(`HTTP ${i.status}: ${await i.text()}`);let s=await i.json();if(!Array.isArray(s.data)||!Array.isArray(s.data[0]?.embedding))throw new Error("Invalid embedding response")}return console.log("\u2713 Embedding provider reachable"),console.log(`\u2713 Model: ${n}`),console.log(""),!0}catch(i){return console.log("\u2717 Embedding test failed"),console.log(`  ${i instanceof Error?i.message:String(i)}`),console.log(""),!1}}async function ac(e,o){let t=new Map(o);for(;;){let n=await _n(e,o.get("TOOLNET_EMBEDDING_PROVIDER"));if(n==="back")return;if(await sc(e,o,n),!cc(o,n)){console.log(""),console.log("\u26A0 Embedding configuration is incomplete."),console.log(""),console.log("  1. Retry"),console.log("  2. Save anyway"),console.log("  3. Choose another provider"),console.log("  4. Cancel"),console.log("");let s=(await e.question("Choose [1]: ")).trim()||"1";if(s==="2"){_(o);return}if(s==="3")continue;if(s==="4"){o.clear();for(let[c,a]of t)o.set(c,a);return}continue}if(await yn(o)){_(o),console.log(`\u2713 ${n.label} embedding configuration saved`),console.log(`  ${h}`),console.log("");return}console.log("  1. Retry"),console.log("  2. Save anyway"),console.log("  3. Choose another provider"),console.log("  4. Cancel"),console.log("");let i=(await e.question("Choose [1]: ")).trim()||"1";if(i==="2"){_(o);return}if(i!=="3"&&i==="4"){o.clear();for(let[s,c]of t)o.set(s,c);return}}}async function lc(e,o){let t=o.get("TOOLNET_LLM_PROVIDER")?.trim();if(!t){console.log(""),console.log("\u26A0 Configure LLM first."),console.log("");return}if(t==="deepseek"||t==="groq"){console.log(""),console.log(`\u26A0 ${S(t)} is configured as LLM-only.`),console.log("Choose Embedding separately."),console.log("");return}o.set("TOOLNET_EMBEDDING_PROVIDER",t);let n=o.get("TOOLNET_LLM_API_KEY"),r=o.get("TOOLNET_LLM_BASE_URL"),i=o.get("TOOLNET_LLM_ACCOUNT_ID");n&&o.set("TOOLNET_EMBEDDING_API_KEY",n),r&&o.set("TOOLNET_EMBEDDING_BASE_URL",r),i&&o.set("TOOLNET_EMBEDDING_ACCOUNT_ID",i);let s="";t==="alibaba"?s="text-embedding-v4":t==="gemini"?s="gemini-embedding-001":t==="cloudflare"?s="@cf/baai/bge-base-en-v1.5":t==="huggingface"&&(s="sentence-transformers/all-MiniLM-L6-v2");let a=(await e.question(s?`EMBEDDING MODEL [${s}]: `:"EMBEDDING MODEL: ")).trim()||s;if(!a){console.log(""),console.log("\u26A0 Embedding model is required."),console.log("");return}if(o.set("TOOLNET_EMBEDDING_MODEL",a),!await yn(o)){let u=(await e.question("Save anyway? (y/N): ")).trim().toLowerCase();if(u!=="y"&&u!=="yes")return}_(o),console.log(""),console.log("\u2713 LLM credentials reused for Embedding"),console.log(`\u2713 Embedding model: ${a}`),console.log("")}function Re(e){return`TOOLNET_LLM_FALLBACK_${e}`}function Ne(e,o){let t=Re(o);for(let n of["PROVIDER","API_KEY","BASE_URL","MODEL","ACCOUNT_ID"])e.delete(`${t}_${n}`)}function dn(e,o){let t=Re(o),n=e.get(`${t}_PROVIDER`);if(!n)return"not configured";let r=e.get(`${t}_MODEL`);return`${S(n)}${r?` / ${r}`:""}`}async function fn(e,o,t){console.log(""),console.log(`Fallback ${t}`),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");let n=await fo(e,void 0);if(n==="back")return;let r=o.get("TOOLNET_LLM_PROVIDER");if(n===r){console.log(""),console.log("\u26A0 Fallback cannot be the same provider as Primary."),console.log("");return}let i=t===1?2:1,s=o.get(`${Re(i)}_PROVIDER`);if(n===s){console.log(""),console.log("\u26A0 This provider is already used by the other fallback."),console.log("");return}let c=w.find(f=>f.id===n);if(!c)return;let a=Re(t);if(Ne(o,t),o.set(`${a}_PROVIDER`,n),c.accountIdRequired){let f=await e.question("ACCOUNT ID: ");f.trim()&&o.set(`${a}_ACCOUNT_ID`,f.trim())}if(c.apiKeyRequired||n==="custom"){let f=await J(e,c.apiKeyRequired?"API KEY: ":"API KEY [optional]: ");f.trim()&&o.set(`${a}_API_KEY`,f.trim())}if(n==="cloudflare"){let f=o.get(`${a}_ACCOUNT_ID`);f&&o.set(`${a}_BASE_URL`,`https://api.cloudflare.com/client/v4/accounts/${f}/ai`)}else{let f=c.baseUrl??"",mo=(await e.question(f?`BASE URL [${f}]: `:c.baseUrlRequired?"BASE URL: ":"BASE URL [optional]: ")).trim()||f;mo&&o.set(`${a}_BASE_URL`,F(mo))}let l=c.suggestedModel??"",p=(await e.question(l?`MODEL [${l}]: `:"MODEL: ")).trim()||l;if(!p){console.log(""),console.log("\u26A0 MODEL is required."),console.log(""),Ne(o,t);return}o.set(`${a}_MODEL`,p),_(o),console.log(""),console.log(`\u2713 Fallback ${t} saved`),console.log(`  ${S(n)} / ${p}`),console.log("")}async function gc(e,o){let t=o.get("TOOLNET_LLM_FALLBACK_COOLDOWN_MS")||"60000",n=o.get("TOOLNET_LLM_MAX_RETRIES")||"1";console.log(""),console.log("Fallback Policy"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");let r=await e.question(`COOLDOWN MS [${t}]: `);if(r.trim()){let s=Number(r.trim());Number.isFinite(s)&&s>=0?o.set("TOOLNET_LLM_FALLBACK_COOLDOWN_MS",String(Math.floor(s))):console.log("\u26A0 Invalid cooldown; keeping previous value.")}let i=await e.question(`MAX RETRIES [${n}]: `);if(i.trim()){let s=Number(i.trim());Number.isFinite(s)&&s>=0&&s<=5?o.set("TOOLNET_LLM_MAX_RETRIES",String(Math.floor(s))):console.log("\u26A0 MAX RETRIES must be between 0 and 5.")}_(o),console.log(""),console.log("\u2713 Fallback policy saved"),console.log("")}async function uc(e,o){for(;;){console.log(""),console.log("LLM Fallback"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),console.log(`  Primary    : ${o.get("TOOLNET_LLM_PROVIDER")?`${S(o.get("TOOLNET_LLM_PROVIDER"))} / ${o.get("TOOLNET_LLM_MODEL")||"model not configured"}`:"not configured"}`),console.log(`  Fallback 1 : ${dn(o,1)}`),console.log(`  Fallback 2 : ${dn(o,2)}`),console.log(`  Cooldown   : ${o.get("TOOLNET_LLM_FALLBACK_COOLDOWN_MS")||"60000"} ms`),console.log(`  Retries    : ${o.get("TOOLNET_LLM_MAX_RETRIES")||"1"}`),console.log(""),console.log("  1. Configure Fallback 1"),console.log("  2. Configure Fallback 2"),console.log("  3. Remove Fallback 1"),console.log("  4. Remove Fallback 2"),console.log("  5. Retry / cooldown settings"),console.log("  0. Back"),console.log("");let t=(await e.question("Choose: ")).trim();if(t==="0")return;if(t==="1"){await fn(e,o,1);continue}if(t==="2"){await fn(e,o,2);continue}if(t==="3"){Ne(o,1),_(o),console.log(""),console.log("\u2713 Fallback 1 removed"),console.log("");continue}if(t==="4"){Ne(o,2),_(o),console.log(""),console.log("\u2713 Fallback 2 removed"),console.log("");continue}if(t==="5"){await gc(e,o);continue}console.log(""),console.log("\u26A0 Invalid selection")}}async function dc(e,o){for(;;){console.log(""),console.log("AI Model"),console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");let t=o.get("TOOLNET_LLM_PROVIDER"),n=o.get("TOOLNET_EMBEDDING_PROVIDER");console.log(`  LLM       : ${t?`${S(t)} / ${o.get("TOOLNET_LLM_MODEL")||"model not configured"}`:"not configured"}`),console.log(`  Embedding : ${n?`${po(n)} / ${o.get("TOOLNET_EMBEDDING_MODEL")||(n==="local"?"local hash":"model not configured")}`:"legacy/default"}`),console.log(""),console.log("  1. Configure LLM"),console.log("  2. Configure Embedding"),console.log("  3. Use LLM provider credentials for Embedding"),console.log("  4. Configure LLM Fallbacks"),console.log("  0. Back"),console.log("");let r=(await e.question("Choose: ")).trim();if(r==="0")return;if(r==="1"){await fc(e,o);continue}if(r==="2"){await ac(e,o);continue}if(r==="3"){await lc(e,o);continue}if(r==="4"){await uc(e,o);continue}console.log(""),console.log("\u26A0 Invalid selection")}}async function fc(e,o){let t=new Map(o);for(;;){let n=await fo(e,On(o));if(n==="back")return;let r=w.find(c=>c.id===n);if(!r)continue;if(await nc(e,o,r),!oc(o,r)){console.log(""),console.log("\u26A0 AI configuration is incomplete."),console.log(""),console.log("  1. Retry"),console.log("  2. Save anyway"),console.log("  3. Choose another provider"),console.log("  4. Cancel"),console.log("");let c=(await e.question("Choose [1]: ")).trim()||"1";if(c==="2"){_(o),console.log(""),console.log("\u26A0 AI configuration saved without validation"),console.log(`  ${h}`),console.log("");return}if(c==="3")continue;if(c==="4"){o.clear();for(let[a,l]of t)o.set(a,l);console.log(""),console.log("AI changes cancelled."),console.log("");return}continue}if((await ic(o)).ok){_(o),console.log(`\u2713 ${r.label} configuration saved`),console.log(`  ${h}`),console.log("");return}console.log("  1. Retry"),console.log("  2. Save anyway"),console.log("  3. Choose another provider"),console.log("  4. Cancel"),console.log("");let s=(await e.question("Choose [1]: ")).trim()||"1";if(s==="2"){_(o),console.log(""),console.log("\u26A0 AI configuration saved even though provider test failed"),console.log(`  ${h}`),console.log("");return}if(s!=="3"&&s==="4"){o.clear();for(let[c,a]of t)o.set(c,a);console.log(""),console.log("AI changes cancelled."),console.log("");return}}}function pc(){try{let o=co().filter(t=>t.installed);if(o.length===0)return;console.log(""),console.log("Automatic AI memory");for(let t of o){let n=t.agent==="agy"?"Agy / Antigravity":t.agent==="opencode"?"OpenCode":t.agent==="codex"?"Codex":t.agent;console.log(`  \u2713 ${n}`)}}catch{}}function d(e,...o){for(let t of o){let n=e.get(t)?.trim();if(n)return n}}function m(e,o,t){t&&!e.get(o)?.trim()&&e.set(o,t)}function mc(e){let o=!1,t=JSON.stringify([...e.entries()]);if(!e.get("TOOLNET_LLM_PROVIDER")?.trim()){let i;d(e,"GROQ_API_KEY")?i="groq":d(e,"DEEPSEEK_API_KEY")?i="deepseek":d(e,"NVIDIA_API_KEY","NVIDIA_NIM_API_KEY")?i="nvidia":d(e,"OPENROUTER_API_KEY")?i="openrouter":d(e,"ALIBABA_API_KEY","DASHSCOPE_API_KEY")?i="alibaba":d(e,"GEMINI_API_KEY","GOOGLE_API_KEY")?i="gemini":d(e,"CLOUDFLARE_API_TOKEN")&&d(e,"CLOUDFLARE_ACCOUNT_ID")?i="cloudflare":d(e,"HF_TOKEN")?i="huggingface":d(e,"OLLAMA_MODEL","OLLAMA_BASE_URL")?i="ollama":d(e,"OPENAI_API_KEY","MODEL_API_KEY")&&(i="openai-compatible"),i&&e.set("TOOLNET_LLM_PROVIDER",i)}switch(e.get("TOOLNET_LLM_PROVIDER")?.trim()){case"groq":m(e,"TOOLNET_LLM_API_KEY",d(e,"GROQ_API_KEY")),m(e,"TOOLNET_LLM_BASE_URL",d(e,"GROQ_BASE_URL")||"https://api.groq.com/openai/v1"),m(e,"TOOLNET_LLM_MODEL",d(e,"GROQ_MODEL"));break;case"deepseek":m(e,"TOOLNET_LLM_API_KEY",d(e,"DEEPSEEK_API_KEY")),m(e,"TOOLNET_LLM_BASE_URL",d(e,"DEEPSEEK_BASE_URL")||"https://api.deepseek.com"),m(e,"TOOLNET_LLM_MODEL",d(e,"DEEPSEEK_MODEL")||"deepseek-v4-flash");break;case"nvidia":m(e,"TOOLNET_LLM_API_KEY",d(e,"NVIDIA_API_KEY","NVIDIA_NIM_API_KEY")),m(e,"TOOLNET_LLM_BASE_URL",d(e,"NVIDIA_BASE_URL","NVIDIA_NIM_BASE_URL")||"https://integrate.api.nvidia.com/v1"),m(e,"TOOLNET_LLM_MODEL",d(e,"NVIDIA_MODEL","NVIDIA_NIM_MODEL"));break;case"openrouter":m(e,"TOOLNET_LLM_API_KEY",d(e,"OPENROUTER_API_KEY")),m(e,"TOOLNET_LLM_BASE_URL",d(e,"OPENROUTER_BASE_URL")||"https://openrouter.ai/api/v1"),m(e,"TOOLNET_LLM_MODEL",d(e,"OPENROUTER_MODEL"));break;case"alibaba":m(e,"TOOLNET_LLM_API_KEY",d(e,"ALIBABA_API_KEY","DASHSCOPE_API_KEY")),m(e,"TOOLNET_LLM_BASE_URL",d(e,"ALIBABA_BASE_URL","DASHSCOPE_BASE_URL")),m(e,"TOOLNET_LLM_MODEL",d(e,"ALIBABA_MODEL","DASHSCOPE_MODEL"));break;case"gemini":m(e,"TOOLNET_LLM_API_KEY",d(e,"GEMINI_API_KEY","GOOGLE_API_KEY")),m(e,"TOOLNET_LLM_BASE_URL",d(e,"GEMINI_BASE_URL")||"https://generativelanguage.googleapis.com/v1beta"),m(e,"TOOLNET_LLM_MODEL",d(e,"GEMINI_MODEL"));break;case"huggingface":m(e,"TOOLNET_LLM_API_KEY",d(e,"HF_TOKEN")),m(e,"TOOLNET_LLM_BASE_URL",d(e,"HF_INFERENCE_BASE_URL")||"https://router.huggingface.co/v1"),m(e,"TOOLNET_LLM_MODEL",d(e,"HF_LLM_MODEL","HF_MODEL"));break;case"ollama":m(e,"TOOLNET_LLM_API_KEY",d(e,"OLLAMA_API_KEY")),m(e,"TOOLNET_LLM_BASE_URL",d(e,"OLLAMA_BASE_URL")||"http://127.0.0.1:11434/v1"),m(e,"TOOLNET_LLM_MODEL",d(e,"OLLAMA_MODEL"));break;case"cloudflare":m(e,"TOOLNET_LLM_API_KEY",d(e,"CLOUDFLARE_API_TOKEN")),m(e,"TOOLNET_LLM_ACCOUNT_ID",d(e,"CLOUDFLARE_ACCOUNT_ID")),m(e,"TOOLNET_LLM_MODEL",d(e,"CLOUDFLARE_MODEL"));break;case"openai-compatible":m(e,"TOOLNET_LLM_API_KEY",d(e,"OPENAI_API_KEY","MODEL_API_KEY")),m(e,"TOOLNET_LLM_BASE_URL",d(e,"OPENAI_BASE_URL","MODEL_BASE_URL")),m(e,"TOOLNET_LLM_MODEL",d(e,"OPENAI_MODEL","MODEL_NAME"));break}!e.get("TOOLNET_EMBEDDING_PROVIDER")?.trim()&&d(e,"HF_TOKEN")&&(e.set("TOOLNET_EMBEDDING_PROVIDER","huggingface"),m(e,"TOOLNET_EMBEDDING_API_KEY",d(e,"HF_TOKEN")),m(e,"TOOLNET_EMBEDDING_MODEL",d(e,"HF_EMBEDDING_MODEL")||"sentence-transformers/all-MiniLM-L6-v2"));let r=JSON.stringify([...e.entries()]);return o=t!==r,o}function be(e,o="not configured"){return e?.trim()||o}function Ec(e){let o=ie(j(e)),t=e.get("TOOLNET_LLM_PROVIDER"),n=e.get("TOOLNET_LLM_MODEL"),r=e.get("TOOLNET_EMBEDDING_PROVIDER"),i=e.get("TOOLNET_EMBEDDING_MODEL"),s=e.get("TOOLNET_LLM_FALLBACK_1_PROVIDER"),c=e.get("TOOLNET_LLM_FALLBACK_2_PROVIDER");console.log(""),console.log("\u25C7 ToolNet Memory Setup"),console.log(""),console.log("\u25C6 Configuration"),console.log("\u2502"),console.log(`\u251C \u25C6 Storage    \u2014 ${o}`),console.log(`\u251C \u25C6 LLM        \u2014 ${t?`${S(t)} / ${be(n)}`:"not configured"}`),console.log(`\u251C \u25C7 Fallback 1 \u2014 ${s?`${S(s)} / ${be(e.get("TOOLNET_LLM_FALLBACK_1_MODEL"))}`:"none"}`),console.log(`\u251C \u25C7 Fallback 2 \u2014 ${c?`${S(c)} / ${be(e.get("TOOLNET_LLM_FALLBACK_2_MODEL"))}`:"none"}`),console.log(`\u251C \u25C6 Embedding  \u2014 ${r?`${r==="local"?"Local / Hash":po(r)} / ${be(i,r==="local"?"local hash":"not configured")}`:"legacy/default"}`),console.log("\u2502"),console.log(`\u251C \u25C6 Config      \u2014 ${h}`),console.log(`\u251C \u25C6 Permissions \u2014 ${C.statSync(h).mode.toString(8).slice(-3)}`),console.log("\u251C \u25C6 Secrets     \u2014 hidden"),console.log("\u251C \u25C6 Config mode \u2014 canonical TOOLNET_*"),console.log("\u2502"),console.log("\u2514 \u25C6 Setup complete")}function hn(e){mc(e),e.has("TOOLNET_LLM_FALLBACK_COOLDOWN_MS")||e.set("TOOLNET_LLM_FALLBACK_COOLDOWN_MS","60000"),e.has("TOOLNET_LLM_MAX_RETRIES")||e.set("TOOLNET_LLM_MAX_RETRIES","1"),e.has("MEMORY_STORAGE_PROVIDER")||e.set("MEMORY_STORAGE_PROVIDER",j(e)),e.has("MEMORY_LOCAL_CACHE_MB")||e.set("MEMORY_LOCAL_CACHE_MB","200"),e.has("MEMORY_AUTO_CAPTURE")||e.set("MEMORY_AUTO_CAPTURE","true"),e.has("MEMORY_AUTO_RETRIEVE")||e.set("MEMORY_AUTO_RETRIEVE","true"),e.has("MEMORY_AUTO_SUMMARIZE")||e.set("MEMORY_AUTO_SUMMARIZE","true"),e.has("MEMORY_AUTO_SYNC")||e.set("MEMORY_AUTO_SYNC","true"),e.has("MEMORY_MAX_CANDIDATES")||e.set("MEMORY_MAX_CANDIDATES","50"),e.has("MEMORY_RERANK_TOP")||e.set("MEMORY_RERANK_TOP","10"),e.has("MEMORY_FINAL_CONTEXT")||e.set("MEMORY_FINAL_CONTEXT","5"),e.has("MEMORY_TOKEN_BUDGET")||e.set("MEMORY_TOKEN_BUDGET","2000"),e.has("TOOLNET_SESSION_LEARNING")||e.set("TOOLNET_SESSION_LEARNING","1"),e.has("TOOLNET_WORK_CONTINUITY")||e.set("TOOLNET_WORK_CONTINUITY","1"),e.has("TOOLNET_SEMANTIC_CONTINUITY")||e.set("TOOLNET_SEMANTIC_CONTINUITY","1"),e.has("TOOLNET_SMART_HANDOFF")||e.set("TOOLNET_SMART_HANDOFF","1")}async function Oc(e,o){hn(e),o||_(e),console.log(""),console.log("\u25C7 ToolNet Memory Setup"),console.log(""),console.log("\u25C6 Non-interactive mode"),console.log("\u2502"),console.log(`\u251C \u25C6 Config   \u2014 ${h}`),console.log(`\u251C \u25C6 Storage  \u2014 ${ie(j(e))}`),console.log("\u2502"),console.log("\u2514 \u25C7 Run toolnet-memory setup from an interactive terminal")}async function _c(){let e=C.existsSync(h),o=e?xs(C.readFileSync(h,"utf8")):new Map,t=new Map(o);if(hn(t),!L.isTTY||!ne.isTTY){await Oc(t,e);return}let n=Ds.createInterface({input:L,output:ne}),r=!1;try{for(;;){Gs(),Js(t);let i=await qs(n);if(i==="storage"){let s=JSON.stringify([...t.entries()]);await Zs(n,t),r=r||s!==JSON.stringify([...t.entries()]);continue}if(i==="ai"){let s=JSON.stringify([...t.entries()]);await dc(n,t),r=r||s!==JSON.stringify([...t.entries()]);continue}if(i==="exit"){if(!r){console.log(""),console.log("No changes made.");return}console.log("");let s=(await n.question("Discard unsaved changes? (y/N): ")).trim().toLowerCase();if(s==="y"||s==="yes"){console.log(""),console.log("Changes discarded.");return}continue}_(t),mn(t)||(console.log(""),console.log("\u26A0 Storage configuration is incomplete.")),pc(),Ec(t),console.log(""),console.log("Validate:"),console.log("  toolnet-memory provider:status"),console.log("  toolnet-memory provider:test"),console.log("  toolnet-memory doctor"),console.log("");return}}finally{n.close()}}_c().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exit(1)});
