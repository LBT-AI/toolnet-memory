import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";

import {
  tmpdir,
} from "node:os";

import {
  join,
} from "node:path";

function processAlive(
  pid: number,
): boolean {
  try {
    process.kill(
      pid,
      0,
    );

    return true;
  } catch (
    error: any
  ) {
    return (
      error?.code ===
      "EPERM"
    );
  }
}

export class ProjectLock {
  private acquired =
    false;

  private readonly path:
    string;

  private readonly exitHandler =
    () => {
      this.releaseSync();
    };

  constructor(
    projectId: string,
  ) {
    const root =
      join(
        tmpdir(),
        "toolnet-memory-locks",
      );

    mkdirSync(
      root,
      {
        recursive: true,
      },
    );

    const safeId =
      projectId.replace(
        /[^A-Za-z0-9_.-]/g,
        "_",
      );

    this.path =
      join(
        root,
        `${safeId}.lock`,
      );
  }

  async acquire():
    Promise<void> {
    if (
      this.acquired
    ) {
      return;
    }

    for (
      let attempt = 0;
      attempt < 2;
      attempt++
    ) {
      try {
        const fd =
          openSync(
            this.path,
            "wx",
          );

        writeFileSync(
          fd,
          JSON.stringify({
            pid:
              process.pid,

            createdAt:
              new Date()
                .toISOString(),
          }),
        );

        closeSync(fd);

        this.acquired =
          true;

        process.once(
          "exit",
          this.exitHandler,
        );

        return;
      } catch (
        error: any
      ) {
        if (
          error?.code !==
          "EEXIST"
        ) {
          throw error;
        }

        let stale =
          true;

        try {
          const data =
            JSON.parse(
              readFileSync(
                this.path,
                "utf8",
              ),
            );

          if (
            Number.isInteger(
              data.pid,
            ) &&
            processAlive(
              data.pid,
            )
          ) {
            stale =
              false;
          }
        } catch {
          stale =
            true;
        }

        if (
          !stale
        ) {
          throw new Error(
            "ToolNet Memory is already running for this project",
          );
        }

        try {
          unlinkSync(
            this.path,
          );
        } catch {
          // retry once
        }
      }
    }

    throw new Error(
      "Unable to acquire ToolNet Memory project lock",
    );
  }

  async release():
    Promise<void> {
    this.releaseSync();
  }

  private releaseSync():
    void {
    if (
      !this.acquired
    ) {
      return;
    }

    try {
      unlinkSync(
        this.path,
      );
    } catch {
      // already removed
    }

    this.acquired =
      false;

    process.off(
      "exit",
      this.exitHandler,
    );
  }
}
