import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";

const out = "bundle";

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const entries = {
  "full-index": "src/production/full-index.ts",
  "doctor": "src/production/doctor.ts",
  "setup": "src/production/setup.ts",
  "mcp": "src/mcp/bootstrap.ts",
  "snapshot": "src/production/snapshot-cli.ts",

  "opencode": "src/session/opencode/cli.ts",
  "agy": "src/session/agy/cli.ts",
  "codex": "src/session/codex/cli.ts",

  "learner": "src/session/learner/cli.ts",
  "project-manual": "src/project-manual/cli.ts",

  "work-continuity": "src/work-continuity/cli.ts",
  "context": "src/work-continuity/context-cli.ts",
  "context-runtime": "src/work-continuity/context-runtime-cli.ts"
};

await build({
  entryPoints: entries,
  outdir: out,
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  packages: "external",
  sourcemap: false,
  minify: true,
  legalComments: "none"
});

console.log("✓ production bundles created");
