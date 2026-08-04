import {
  z,
} from "zod";

import type {
  MCPContext,
} from "../context.js";

import {
  SnapshotManager,
} from "../../snapshot/index.js";

export const snapshotRestoreSchema = {
  snapshotId:
    z.string().min(1),
};

export async function snapshotRestore(
  ctx: MCPContext,
  input: {
    snapshotId: string;
  },
) {
  if (
    !ctx.storage
  ) {
    throw new Error(
      "Storage unavailable",
    );
  }

  const manager =
    new SnapshotManager(
      ctx.storage,
    );

  await manager.create(
    ctx.project.id,
    "before-rollback",
  );

  return manager.restore(
    ctx.project.id,
    input.snapshotId,
  );
}
