import g from"node:fs";import T from"node:os";import R from"node:path";import O from"node:readline/promises";import{stdin as s,stdout as l}from"node:process";var u=R.join(T.homedir(),".config","toolnet-memory"),E=R.join(u,".env");function Y(o){let e=new Map;for(let n of o.split(/\r?\n/)){let i=n.trim();if(!i||i.startsWith("#"))continue;let t=i.indexOf("=");t!==-1&&e.set(i.slice(0,t).trim(),i.slice(t+1).trim())}return e}function a(o){g.mkdirSync(u,{recursive:!0,mode:448});let e=`# ==========================================================
# TOOLNET MEMORY
# ==========================================================

MEMORY_STORAGE_PROVIDER=huggingface

# Hugging Face
HF_NAMESPACE=${o.get("HF_NAMESPACE")??""}
HF_BUCKET=${o.get("HF_BUCKET")??"toolnet-memory"}
HF_S3_ACCESS_KEY_ID=${o.get("HF_S3_ACCESS_KEY_ID")??""}
HF_S3_SECRET_ACCESS_KEY=${o.get("HF_S3_SECRET_ACCESS_KEY")??""}

# Local cache
MEMORY_LOCAL_STORAGE_PATH=${o.get("MEMORY_LOCAL_STORAGE_PATH")??""}
MEMORY_LOCAL_CACHE_MB=${o.get("MEMORY_LOCAL_CACHE_MB")??"200"}

# Automation
MEMORY_AUTO_CAPTURE=${o.get("MEMORY_AUTO_CAPTURE")??"true"}
MEMORY_AUTO_RETRIEVE=${o.get("MEMORY_AUTO_RETRIEVE")??"true"}
MEMORY_AUTO_SUMMARIZE=${o.get("MEMORY_AUTO_SUMMARIZE")??"true"}
MEMORY_AUTO_SYNC=${o.get("MEMORY_AUTO_SYNC")??"true"}

# Retrieval
MEMORY_MAX_CANDIDATES=${o.get("MEMORY_MAX_CANDIDATES")??"50"}
MEMORY_RERANK_TOP=${o.get("MEMORY_RERANK_TOP")??"10"}
MEMORY_FINAL_CONTEXT=${o.get("MEMORY_FINAL_CONTEXT")??"5"}
MEMORY_TOKEN_BUDGET=${o.get("MEMORY_TOKEN_BUDGET")??"2000"}
`;g.writeFileSync(E,e,{encoding:"utf8",mode:384}),g.chmodSync(u,448),g.chmodSync(E,384)}function A(o,e=!0){let n=o.trim().toLowerCase();return n?n==="y"||n==="yes":e}async function F(o){return s.isTTY?(l.write(o),new Promise(e=>{let n="",i=()=>{s.off("data",t),s.setRawMode?.(!1),s.pause(),l.write(`
`),e(n)},t=_=>{for(let r of _.toString("utf8")){if(r==="\r"||r===`
`){i();return}if(r===""&&(s.setRawMode?.(!1),l.write(`
`),process.exit(130)),r==="\x7F"){n=n.slice(0,-1);continue}n+=r}};s.resume(),s.setRawMode?.(!0),s.on("data",t)})):""}async function d(){let o=g.existsSync(E),e=o?Y(g.readFileSync(E,"utf8")):new Map,n=["HF_NAMESPACE","HF_BUCKET","HF_S3_ACCESS_KEY_ID","HF_S3_SECRET_ACCESS_KEY"],i=n.every(c=>!!e.get(c)?.trim());if(console.log(""),console.log("TOOLNET MEMORY SETUP"),console.log("===================="),console.log(""),console.log(`Config: ${E}`),console.log(""),!s.isTTY||!l.isTTY){o||a(e),i?console.log("\u2713 Hugging Face storage already configured"):(console.log("Configuration pending."),console.log("Run:"),console.log("  toolnet-memory setup"));return}let t=O.createInterface({input:s,output:l});if(i){console.log("\u2713 Hugging Face storage already configured"),console.log("");let c=await t.question("Use existing configuration? (Y/n) [Y]: ");if(A(c)){t.close(),console.log(""),console.log("\u2713 Existing Hugging Face configuration kept"),console.log(""),console.log("Next:"),console.log("  toolnet-memory doctor");return}console.log("")}else{let c=await t.question("Configure Hugging Face storage now? (Y/n) [Y]: ");if(!A(c)){t.close(),o||a(e),console.log(""),console.log("Configuration pending."),console.log("Run later:"),console.log("  toolnet-memory setup");return}console.log("")}let _=e.get("HF_NAMESPACE")||"",r=e.get("HF_BUCKET")||"toolnet-memory",f=await t.question(_?`Hugging Face namespace [${_}]: `:"Hugging Face namespace: "),M=await t.question(`Bucket [${r}]: `),S=await t.question(e.get("HF_S3_ACCESS_KEY_ID")?"S3 Access Key ID [configured]: ":"S3 Access Key ID: ");t.close();let m=await F(e.get("HF_S3_SECRET_ACCESS_KEY")?"S3 Secret Access Key [configured]: ":"S3 Secret Access Key: ");f.trim()&&e.set("HF_NAMESPACE",f.trim()),M.trim()?e.set("HF_BUCKET",M.trim()):e.get("HF_BUCKET")||e.set("HF_BUCKET","toolnet-memory"),S.trim()&&e.set("HF_S3_ACCESS_KEY_ID",S.trim()),m.trim()&&e.set("HF_S3_SECRET_ACCESS_KEY",m.trim()),a(e);let C=n.filter(c=>!e.get(c)?.trim());if(console.log(""),console.log("\u2713 Configuration saved"),console.log(`  ${E}`),console.log(""),C.length){console.log("Missing configuration:");for(let c of C)console.log(`  - ${c}`);console.log(""),console.log("Run setup again:"),console.log("  toolnet-memory setup");return}console.log("\u2713 Hugging Face configuration complete"),console.log(""),console.log("Next:"),console.log("  toolnet-memory doctor")}d().catch(o=>{console.error(o instanceof Error?o.message:String(o)),process.exit(1)});
