import {
  existsSync,
} from "node:fs";

import {
  homedir,
} from "node:os";

import {
  join,
  resolve,
} from "node:path";

import {
  DatabaseSync,
} from "node:sqlite";

import type {
  ProjectManifest,
} from "../../core/types.js";

import type {
  StorageProvider,
} from "../../storage/types.js";

import {
  defaultAgyTranscript,
  syncAgySession,
} from "./adapter.js";

function uriToPath(
  value: string,
): string {
  if (
    value.startsWith(
      "file://",
    )
  ) {
    try {
      return decodeURIComponent(
        new URL(
          value,
        ).pathname,
      );
    } catch {
      return value;
    }
  }

  return value;
}

function workspaceList(
  value: unknown,
): string[] {
  if (
    typeof value !==
      "string" ||
    !value
  ) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(
        value,
      );

    if (
      Array.isArray(
        parsed,
      )
    ) {
      return parsed
        .filter(
          item =>
            typeof item ===
            "string",
        )
        .map(
          uriToPath,
        );
    }
  } catch {
    // continue
  }

  return [
    uriToPath(
      value,
    ),
  ];
}

function belongs(
  project:
    ProjectManifest,

  workspaces:
    string[],
): boolean {
  const root =
    resolve(
      project.rootPath,
    );

  return workspaces.some(
    workspace => {
      const path =
        resolve(
          workspace,
        );

      return (
        path === root ||
        path.startsWith(
          root +
          "/",
        ) ||
        root.startsWith(
          path +
          "/",
        )
      );
    },
  );
}

export async function recoverAgyProject(
  project:
    ProjectManifest,

  storage:
    StorageProvider,

  limit =
    10,
) {
  console.log(`Recovering Agy sessions for project: ${project.name}`);
  console.log(`Limit: ${limit} sessions`);
  console.log('');
  const summaryDb =
    process.env
      .AGY_SUMMARY_DB ??
    join(
      homedir(),
      ".gemini",
      "antigravity-cli",
      "conversation_summaries.db",
    );

  if (
    !existsSync(
      summaryDb,
    )
  ) {
    throw new Error(
      `Agy summary database not found: ${summaryDb}`,
    );
  }

  const db =
    new DatabaseSync(
      summaryDb,
      {
        readOnly:
          true,
      },
    );

  db.exec(
    "PRAGMA query_only = ON",
  );

  const rows =
    db.prepare(
      `
      SELECT
        conversation_id,
        title,
        workspace_uris,
        agent_name,
        last_user_input_time
      FROM conversation_summaries
      ORDER BY
        last_user_input_time DESC
      `,
    ).all() as
      Record<
        string,
        unknown
      >[];

  db.close();

  const results =
    [];

  let processed = 0;
  const total = Math.min(rows.length, limit);

  for (
    const row
    of rows
  ) {
    const id =
      typeof row
        .conversation_id ===
        "string"
        ? row
            .conversation_id
        : "";

    if (
      !id
    ) {
      continue;
    }

    const workspaces =
      workspaceList(
        row.workspace_uris,
      );

    if (
      !belongs(
        project,
        workspaces,
      )
    ) {
      continue;
    }

    const transcriptPath =
      defaultAgyTranscript(
        id,
      );

    if (
      !existsSync(
        transcriptPath,
      )
    ) {
      continue;
    }

    processed++;
    console.log(`[${processed}/${total}] Processing conversation: ${id.slice(0, 8)}...`);

    const result = await syncAgySession({
      project,
      storage,

      conversationId:
        id,

      transcriptPath,

      workspacePaths:
        workspaces,

      modelName:
        typeof row
          .agent_name ===
          "string"
          ? row
              .agent_name
          : undefined,

      phase:
        "recover",
    });

    console.log(`  ✓ Imported ${result.imported} events (${result.eventCount} total, ${result.chunkCount} chunks)`);

    results.push(result);

    if (
      results.length >=
      limit
    ) {
      break;
    }
  }

  console.log('');
  console.log(`✓ Recovery complete: ${results.length} sessions processed`);
  console.log(`Total events: ${results.reduce((sum, r) => sum + r.eventCount, 0)}`);
  console.log(`Total chunks: ${results.reduce((sum, r) => sum + r.chunkCount, 0)}`);

  return results;
}
