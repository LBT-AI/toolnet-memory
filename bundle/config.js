import i from"node:fs";import d from"node:os";import u from"node:path";import{spawnSync as p}from"node:child_process";var l=u.join(d.homedir(),".config","toolnet-memory"),s=u.join(l,".env"),E=/(SECRET|TOKEN|PASSWORD|ACCESS_KEY|API_KEY|PRIVATE_KEY)/i;function f(){i.mkdirSync(l,{recursive:!0,mode:448}),i.existsSync(s)||i.writeFileSync(s,"",{encoding:"utf8",mode:384}),i.chmodSync(l,448),i.chmodSync(s,384)}function a(){return f(),i.readFileSync(s,"utf8").split(/\r?\n/)}function m(){let o=new Map;for(let t of a()){let e=t.trim();if(!e||e.startsWith("#"))continue;let n=e.indexOf("=");n<1||o.set(e.slice(0,n).trim(),e.slice(n+1).trim())}return o}function y(o){return/^[A-Za-z_][A-Za-z0-9_]*$/.test(o)}function g(o,t){return E.test(o)?t?t.length<=8?"********":t.slice(0,4)+"\u2026"+t.slice(-4):"":t}function h(o,t){if(!y(o))throw new Error(`Invalid config key: ${o}`);let e=a(),n=!1,r=e.map(c=>c.trim().startsWith(`${o}=`)?(n=!0,`${o}=${t}`):c);n||(r.length&&r[r.length-1]!==""&&r.push(""),r.push(`${o}=${t}`)),i.writeFileSync(s,r.join(`
`),{encoding:"utf8",mode:384}),i.chmodSync(s,384)}function S(){console.log(`ToolNet Memory Config

Commands:
  toolnet-memory config path
  toolnet-memory config list
  toolnet-memory config get KEY
  toolnet-memory config get KEY --reveal
  toolnet-memory config set KEY VALUE
  toolnet-memory config open

Examples:
  toolnet-memory config get HF_NAMESPACE
  toolnet-memory config set HF_BUCKET toolnet-memory
  toolnet-memory config open`)}function v(){let[o="help",...t]=process.argv.slice(2);if(o==="path"){f(),console.log(s);return}if(o==="list"){let e=m();for(let[n,r]of e)console.log(`${n}=${g(n,r)}`);return}if(o==="get"){let e=t[0];e||(console.error("Usage: toolnet-memory config get KEY"),process.exit(1));let n=m();n.has(e)||(console.error(`Config key not found: ${e}`),process.exit(1));let r=n.get(e)??"",c=t.includes("--reveal");console.log(c?r:g(e,r));return}if(o==="set"){let e=t[0],n=t[1];(!e||n===void 0)&&(console.error("Usage: toolnet-memory config set KEY VALUE"),process.exit(1)),h(e,n),console.log(`\u2713 ${e} updated`);return}if(o==="open"){if(f(),!process.stdin.isTTY){console.log(s);return}let e=process.env.VISUAL||process.env.EDITOR||"vi",n=p(e,[s],{stdio:"inherit",shell:!0});process.exitCode=n.status??0;return}S()}try{v()}catch(o){console.error(o instanceof Error?o.message:String(o)),process.exit(1)}
