import{spawnSync as g}from"node:child_process";import r from"node:fs";import m from"node:os";import s from"node:path";import{fileURLToPath as v}from"node:url";import{createInterface as h}from"node:readline/promises";var l=s.join(m.homedir(),".config","toolnet-memory"),i=s.join(l,".env"),d=new Set(["local","r2","s3","huggingface"]);function p(){r.mkdirSync(l,{recursive:!0,mode:448}),r.existsSync(i)||r.writeFileSync(i,"",{encoding:"utf8",mode:384}),r.chmodSync(l,448),r.chmodSync(i,384)}function E(){p();let e=new Map;for(let o of r.readFileSync(i,"utf8").split(/\r?\n/u)){let n=o.trim();if(!n||n.startsWith("#"))continue;let t=n.indexOf("=");t>0&&e.set(n.slice(0,t).trim(),n.slice(t+1).trim())}return e}function f(e,o){p();let n=r.readFileSync(i,"utf8").split(/\r?\n/u),t=!1,c=n.map(a=>a.trim().startsWith(`${e}=`)?(t=!0,`${e}=${o}`):a);t||(c.length>0&&c.at(-1)!==""&&c.push(""),c.push(`${e}=${o}`)),r.writeFileSync(i,`${c.join(`
`).replace(/\n+$/u,"")}
`,{encoding:"utf8",mode:384}),r.chmodSync(i,384)}function u(e){let o=process.argv.indexOf(e),n=o>=0?process.argv[o+1]:void 0;return n&&!n.startsWith("--")?n:void 0}function O(){let e=u("--section")??"all";if(e==="all"||e==="storage"||e==="integrations"||e==="health")return e;throw new Error(`SETUP_SECTION_INVALID value=${e}`)}function T(){let e=u("--provider");if(e){if(d.has(e))return e;throw new Error(`SETUP_STORAGE_PROVIDER_INVALID value=${e}`)}}function y(){let e=T(),o=u("--local-root");return{section:O(),...e?{provider:e}:{},...o?{localRoot:o}:{},nonInteractive:process.argv.includes("--non-interactive")||!process.stdin.isTTY}}function P(){let e=s.dirname(v(import.meta.url));for(let o of[process.cwd(),s.resolve(e,".."),s.resolve(e,"../..")]){let n=s.join(o,"package.json");if(r.existsSync(n))try{if(JSON.parse(r.readFileSync(n,"utf8")).name==="toolnet-memory")return o}catch{}}}function S(e,o=[]){if(process.env.TOOLNET_STANDALONE==="1")return g(process.execPath,[e,...o],{stdio:"inherit",env:process.env}).status??1;let n=P();if(!n)throw new Error("SETUP_PACKAGE_ROOT_NOT_FOUND");let t=s.join(n,"bin","toolnet-memory");if(!r.existsSync(t))throw new Error("SETUP_CLI_NOT_FOUND");return g(t,[e,...o],{stdio:"inherit",env:process.env}).status??1}async function w(e){if(e.provider)return e.provider;let o=E().get("MEMORY_STORAGE_PROVIDER");if(o&&d.has(o))return o;if(e.nonInteractive)return"local";let n=h({input:process.stdin,output:process.stdout});try{console.log(`
Storage provider
  1. local
  2. r2
  3. s3
  4. huggingface
`);let t=(await n.question("Choose [1]: ")).trim().toLowerCase();if(!t||t==="1"||t==="local")return"local";if(t==="2"||t==="r2")return"r2";if(t==="3"||t==="s3")return"s3";if(t==="4"||t==="huggingface")return"huggingface";throw new Error(`SETUP_STORAGE_PROVIDER_INVALID value=${t}`)}finally{n.close()}}async function R(e){let o=await w(e);f("MEMORY_STORAGE_PROVIDER",o),o==="local"&&e.localRoot&&f("MEMORY_LOCAL_ROOT",e.localRoot),console.log(`
\u2713 Storage: ${o}`),console.log(o==="local"?"  Local-first storage requires no cloud credentials.":"  Provider selected. Add credentials with `toolnet-memory config set KEY VALUE`.")}function _(){console.log(`
\u25C7 Detecting coding-agent integrations...`);let e=S("integrate:auto");if(e!==0)throw new Error(`SETUP_INTEGRATIONS_FAILED status=${e}`)}function I(){console.log(`
\u25C7 Running health check...`);let e=S("doctor");if(e!==0)throw new Error(`SETUP_HEALTH_FAILED status=${e}`)}function A(){console.log(`ToolNet Memory Setup
Usage:
  toolnet-memory setup
  toolnet-memory setup --section storage
  toolnet-memory setup --section integrations
  toolnet-memory setup --section health
Storage:
  --provider local|r2|s3|huggingface
  --local-root PATH
Automation:
  --non-interactive

ToolNet Memory does not require an LLM or embedding provider.`)}async function L(){if(process.argv.includes("--help")||process.argv.includes("-h")){A();return}let e=y();console.log(`
\u25C7 ToolNet Memory Setup
  Local-first runtime \xB7 no LLM required`),(e.section==="storage"||e.section==="all")&&await R(e),(e.section==="integrations"||e.section==="all")&&_(),(e.section==="health"||e.section==="all")&&I(),console.log(`
\u2713 Setup complete
  Config: ${i}
`)}L().catch(e=>{console.error(e instanceof Error?e.message:String(e)),process.exitCode=1});
