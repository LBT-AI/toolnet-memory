#!/usr/bin/env node

const https = require("https");
const { spawn } = require("child_process");

const URL = "https://memory.toolnet.tech/install";

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

https.get(
  URL,
  {
    headers: {
      "User-Agent": "toolnet-memory-install"
    }
  },
  (res) => {
    if (
      res.statusCode >= 300 &&
      res.statusCode < 400 &&
      res.headers.location
    ) {
      fail(`Unexpected redirect: ${res.headers.location}`);
    }

    if (res.statusCode !== 200) {
      fail(`Installer server returned HTTP ${res.statusCode}`);
    }

    let script = "";

    res.setEncoding("utf8");

    res.on("data", chunk => {
      script += chunk;
    });

    res.on("end", () => {
      if (!script.startsWith("#!/usr/bin/env bash")) {
        fail("Invalid installer response");
      }

      const bash = spawn("bash", [], {
        stdio: ["pipe", "inherit", "inherit"]
      });

      bash.on("error", () => {
        fail("Bash is required");
      });

      bash.on("close", code => {
        process.exit(code ?? 1);
      });

      bash.stdin.end(script);
    });
  }
).on("error", err => {
  fail(`Unable to download installer: ${err.message}`);
});
