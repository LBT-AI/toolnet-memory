import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"

const CONFIG_DIR =
  path.join(
    os.homedir(),
    ".config",
    "toolnet-memory",
  )

const ENV_FILE =
  path.join(
    CONFIG_DIR,
    ".env",
  )

const SECRET_PATTERN =
  /(SECRET|TOKEN|PASSWORD|ACCESS_KEY|API_KEY|PRIVATE_KEY)/i

function ensureConfig() {
  fs.mkdirSync(
    CONFIG_DIR,
    {
      recursive: true,
      mode: 0o700,
    },
  )

  if (
    !fs.existsSync(
      ENV_FILE,
    )
  ) {
    fs.writeFileSync(
      ENV_FILE,
      "",
      {
        encoding: "utf8",
        mode: 0o600,
      },
    )
  }

  fs.chmodSync(
    CONFIG_DIR,
    0o700,
  )

  fs.chmodSync(
    ENV_FILE,
    0o600,
  )
}

function parseLines() {
  ensureConfig()

  return fs
    .readFileSync(
      ENV_FILE,
      "utf8",
    )
    .split(
      /\r?\n/,
    )
}

function parseValues() {
  const values =
    new Map<
      string,
      string
    >()

  for (
    const raw of
    parseLines()
  ) {
    const line =
      raw.trim()

    if (
      !line ||
      line.startsWith("#")
    ) {
      continue
    }

    const index =
      line.indexOf("=")

    if (
      index < 1
    ) {
      continue
    }

    values.set(
      line
        .slice(
          0,
          index,
        )
        .trim(),
      line
        .slice(
          index + 1,
        )
        .trim(),
    )
  }

  return values
}

function validKey(
  key: string,
) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(
    key,
  )
}

function masked(
  key: string,
  value: string,
) {
  if (
    !SECRET_PATTERN.test(
      key,
    )
  ) {
    return value
  }

  if (!value) {
    return ""
  }

  if (
    value.length <=
    8
  ) {
    return "********"
  }

  return (
    value.slice(
      0,
      4,
    ) +
    "…" +
    value.slice(
      -4,
    )
  )
}

function setValue(
  key: string,
  value: string,
) {
  if (
    !validKey(
      key,
    )
  ) {
    throw new Error(
      `Invalid config key: ${key}`,
    )
  }

  const lines =
    parseLines()

  let replaced =
    false

  const updated =
    lines.map(
      (line) => {
        const trimmed =
          line.trim()

        if (
          trimmed.startsWith(
            `${key}=`,
          )
        ) {
          replaced =
            true

          return `${key}=${value}`
        }

        return line
      },
    )

  if (!replaced) {
    if (
      updated.length &&
      updated[
        updated.length - 1
      ] !== ""
    ) {
      updated.push("")
    }

    updated.push(
      `${key}=${value}`,
    )
  }

  fs.writeFileSync(
    ENV_FILE,
    updated.join("\n"),
    {
      encoding: "utf8",
      mode: 0o600,
    },
  )

  fs.chmodSync(
    ENV_FILE,
    0o600,
  )
}

function usage() {
  console.log(
`ToolNet Memory Config

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
  toolnet-memory config open`
  )
}

function main() {
  const [
    command =
      "help",
    ...args
  ] =
    process.argv.slice(
      2,
    )

  if (
    command ===
    "path"
  ) {
    ensureConfig()
    console.log(
      ENV_FILE,
    )
    return
  }

  if (
    command ===
    "list"
  ) {
    const values =
      parseValues()

    for (
      const [
        key,
        value,
      ] of values
    ) {
      console.log(
        `${key}=${masked(
          key,
          value,
        )}`,
      )
    }

    return
  }

  if (
    command ===
    "get"
  ) {
    const key =
      args[0]

    if (!key) {
      console.error(
        "Usage: toolnet-memory config get KEY",
      )
      process.exit(1)
    }

    const values =
      parseValues()

    if (
      !values.has(
        key,
      )
    ) {
      console.error(
        `Config key not found: ${key}`,
      )
      process.exit(1)
    }

    const value =
      values.get(
        key,
      ) ??
      ""

    const reveal =
      args.includes(
        "--reveal",
      )

    console.log(
      reveal
        ? value
        : masked(
            key,
            value,
          ),
    )

    return
  }

  if (
    command ===
    "set"
  ) {
    const key =
      args[0]

    const value =
      args[1]

    if (
      !key ||
      value ===
        undefined
    ) {
      console.error(
        "Usage: toolnet-memory config set KEY VALUE",
      )
      process.exit(1)
    }

    setValue(
      key,
      value,
    )

    console.log(
      `✓ ${key} updated`,
    )

    return
  }

  if (
    command ===
    "open"
  ) {
    ensureConfig()

    if (
      !process.stdin.isTTY
    ) {
      console.log(
        ENV_FILE,
      )
      return
    }

    const editor =
      process.env.VISUAL ||
      process.env.EDITOR ||
      "vi"

    const result =
      spawnSync(
        editor,
        [
          ENV_FILE,
        ],
        {
          stdio:
            "inherit",
          shell:
            true,
        },
      )

    process.exitCode =
      result.status ??
      0

    return
  }

  usage()
}

try {
  main()
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : String(error),
  )

  process.exit(1)
}
