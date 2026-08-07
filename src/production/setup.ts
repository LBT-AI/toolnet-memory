import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import readline from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"

import {
  installAutoIntegrations,
} from "./auto-integrate.js"

const CONFIG_DIR = path.join(os.homedir(), ".config", "toolnet-memory")
const ENV_FILE = path.join(CONFIG_DIR, ".env")

function parseEnv(text: string): Map<string, string> {
  const values = new Map<string, string>()

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith("#")) continue

    const i = line.indexOf("=")
    if (i === -1) continue

    values.set(
      line.slice(0, i).trim(),
      line.slice(i + 1).trim()
    )
  }

  return values
}

function saveEnv(values: Map<string, string>) {
  fs.mkdirSync(CONFIG_DIR, {
    recursive: true,
    mode: 0o700
  })

  const content = `# ==========================================================
# TOOLNET MEMORY
# ==========================================================

MEMORY_STORAGE_PROVIDER=huggingface

# Hugging Face
HF_NAMESPACE=${values.get("HF_NAMESPACE") ?? ""}
HF_BUCKET=${values.get("HF_BUCKET") ?? "toolnet-memory"}
HF_S3_ACCESS_KEY_ID=${values.get("HF_S3_ACCESS_KEY_ID") ?? ""}
HF_S3_SECRET_ACCESS_KEY=${values.get("HF_S3_SECRET_ACCESS_KEY") ?? ""}

# Local cache
MEMORY_LOCAL_STORAGE_PATH=${values.get("MEMORY_LOCAL_STORAGE_PATH") ?? ""}
MEMORY_LOCAL_CACHE_MB=${values.get("MEMORY_LOCAL_CACHE_MB") ?? "200"}

# Automation
MEMORY_AUTO_CAPTURE=${values.get("MEMORY_AUTO_CAPTURE") ?? "true"}
MEMORY_AUTO_RETRIEVE=${values.get("MEMORY_AUTO_RETRIEVE") ?? "true"}
MEMORY_AUTO_SUMMARIZE=${values.get("MEMORY_AUTO_SUMMARIZE") ?? "true"}
MEMORY_AUTO_SYNC=${values.get("MEMORY_AUTO_SYNC") ?? "true"}

# Retrieval
MEMORY_MAX_CANDIDATES=${values.get("MEMORY_MAX_CANDIDATES") ?? "50"}
MEMORY_RERANK_TOP=${values.get("MEMORY_RERANK_TOP") ?? "10"}
MEMORY_FINAL_CONTEXT=${values.get("MEMORY_FINAL_CONTEXT") ?? "5"}
MEMORY_TOKEN_BUDGET=${values.get("MEMORY_TOKEN_BUDGET") ?? "2000"}
`

  fs.writeFileSync(ENV_FILE, content, {
    encoding: "utf8",
    mode: 0o600
  })

  fs.chmodSync(CONFIG_DIR, 0o700)
  fs.chmodSync(ENV_FILE, 0o600)
}

function yes(answer: string, defaultYes = true) {
  const value = answer.trim().toLowerCase()

  if (!value) return defaultYes
  return value === "y" || value === "yes"
}

async function hiddenQuestion(label: string): Promise<string> {
  if (!input.isTTY) return ""

  output.write(label)

  return new Promise(resolve => {
    let value = ""

    const finish = () => {
      input.off("data", onData)
      input.setRawMode?.(false)
      input.pause()
      output.write("\n")
      resolve(value)
    }

    const onData = (chunk: Buffer) => {
      for (const ch of chunk.toString("utf8")) {
        if (ch === "\r" || ch === "\n") {
          finish()
          return
        }

        if (ch === "\u0003") {
          input.setRawMode?.(false)
          output.write("\n")
          process.exit(130)
        }

        if (ch === "\u007f") {
          value = value.slice(0, -1)
          continue
        }

        value += ch
      }
    }

    input.resume()
    input.setRawMode?.(true)
    input.on("data", onData)
  })
}


function enableAutomaticAgentMemory() {
  try {
    const results =
      installAutoIntegrations()

    const installed =
      results.filter(
        item =>
          item.installed,
      )

    if (
      installed.length >
      0
    ) {
      console.log("")
      console.log("Automatic AI memory:")

      for (
        const item
        of installed
      ) {
        const name =
          item.agent === "agy"
            ? "Agy / Antigravity"
            : item.agent === "opencode"
              ? "OpenCode"
              : "Codex"

        console.log(
          `  ✓ ${name}`,
        )
      }
    }
  } catch {
    /*
     * Agent integration is optional.
     * Setup/storage configuration must still succeed.
     */
  }
}

async function main() {
  const exists = fs.existsSync(ENV_FILE)

  const values = exists
    ? parseEnv(fs.readFileSync(ENV_FILE, "utf8"))
    : new Map<string, string>()

  const required = [
    "HF_NAMESPACE",
    "HF_BUCKET",
    "HF_S3_ACCESS_KEY_ID",
    "HF_S3_SECRET_ACCESS_KEY"
  ]

  const configured = required.every(
    key => Boolean(values.get(key)?.trim())
  )

  console.log("")
  console.log("TOOLNET MEMORY SETUP")
  console.log("====================")
  console.log("")
  console.log(`Config: ${ENV_FILE}`)
  console.log("")

  // curl | bash hoặc môi trường không interactive
  if (!input.isTTY || !output.isTTY) {
    if (!exists) saveEnv(values)

    if (configured) {
      console.log("✓ Hugging Face storage already configured")
    } else {
      console.log("Configuration pending.")
      console.log("Run:")
      console.log("  toolnet-memory setup")
    }

    enableAutomaticAgentMemory()

    return
  }

  const rl = readline.createInterface({ input, output })

  if (configured) {
    console.log("✓ Hugging Face storage already configured")
    console.log("")

    const keep = await rl.question(
      "Use existing configuration? (Y/n) [Y]: "
    )

    if (yes(keep)) {
      rl.close()

      console.log("")
      console.log("✓ Existing Hugging Face configuration kept")
      console.log("")
      enableAutomaticAgentMemory()

      console.log("Next:")
      console.log("  toolnet-memory doctor")
      return
    }

    console.log("")
  } else {
    const configure = await rl.question(
      "Configure Hugging Face storage now? (Y/n) [Y]: "
    )

    if (!yes(configure)) {
      rl.close()

      if (!exists) saveEnv(values)

      console.log("")
      console.log("Configuration pending.")
      console.log("Run later:")
      console.log("  toolnet-memory setup")
      return
    }

    console.log("")
  }

  const oldNamespace = values.get("HF_NAMESPACE") || ""
  const oldBucket = values.get("HF_BUCKET") || "toolnet-memory"

  const namespace = await rl.question(
    oldNamespace
      ? `Hugging Face namespace [${oldNamespace}]: `
      : "Hugging Face namespace: "
  )

  const bucket = await rl.question(
    `Bucket [${oldBucket}]: `
  )

  const access = await rl.question(
    values.get("HF_S3_ACCESS_KEY_ID")
      ? "S3 Access Key ID [configured]: "
      : "S3 Access Key ID: "
  )

  rl.close()

  const secret = await hiddenQuestion(
    values.get("HF_S3_SECRET_ACCESS_KEY")
      ? "S3 Secret Access Key [configured]: "
      : "S3 Secret Access Key: "
  )

  if (namespace.trim()) {
    values.set("HF_NAMESPACE", namespace.trim())
  }

  if (bucket.trim()) {
    values.set("HF_BUCKET", bucket.trim())
  } else if (!values.get("HF_BUCKET")) {
    values.set("HF_BUCKET", "toolnet-memory")
  }

  if (access.trim()) {
    values.set("HF_S3_ACCESS_KEY_ID", access.trim())
  }

  if (secret.trim()) {
    values.set("HF_S3_SECRET_ACCESS_KEY", secret.trim())
  }

  saveEnv(values)

  const missing = required.filter(
    key => !values.get(key)?.trim()
  )

  console.log("")
  console.log("✓ Configuration saved")
  console.log(`  ${ENV_FILE}`)
  console.log("")

  if (missing.length) {
    console.log("Missing configuration:")

    for (const key of missing) {
      console.log(`  - ${key}`)
    }

    console.log("")
    console.log("Run setup again:")
    console.log("  toolnet-memory setup")
    return
  }

  console.log("✓ Hugging Face configuration complete")
  console.log("")
  enableAutomaticAgentMemory()

  console.log("Next:")
  console.log("  toolnet-memory doctor")
}

main().catch(error => {
  console.error(
    error instanceof Error
      ? error.message
      : String(error)
  )
  process.exit(1)
})
