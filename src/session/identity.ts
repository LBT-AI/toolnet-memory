import {
  join,
} from "node:path";

import type {
  ProjectManifest,
} from "../core/types.js";

import type {
  SessionAgent,
  SessionIdentity,
} from "./types.js";

import {
  sha256,
} from "./utils.js";

function safeSegment(
  value: string,
  fallback: string,
): string {
  const trimmed =
    value.trim();

  const readable =
    trimmed
      .replace(
        /\s+/g,
        "_",
      )
      .replace(
        /[^A-Za-z0-9._-]/g,
        "_",
      )
      .replace(
        /_+/g,
        "_",
      )
      .replace(
        /^\.+|\.+$/g,
        "",
      );

  const digest =
    sha256(
      trimmed,
    ).slice(
      0,
      12,
    );

  if (
    !readable ||
    readable === "." ||
    readable === ".."
  ) {
    return `${fallback}--${digest}`;
  }

  const limited =
    readable.slice(
      0,
      100,
    );

  /*
   * Preserve normal UUID/OpenCode IDs exactly.
   * Add hash only when sanitization changed the value.
   */
  if (
    limited ===
      trimmed &&
    trimmed.length <=
      100
  ) {
    return limited;
  }

  return `${
    limited.slice(
      0,
      85,
    )
  }--${digest}`;
}

export function createSessionIdentity(
  project:
    ProjectManifest,

  agent:
    SessionAgent,

  nativeSessionId:
    string,
): SessionIdentity {
  const cleanAgent =
    agent.trim();

  const cleanSessionId =
    nativeSessionId.trim();

  if (
    !cleanAgent
  ) {
    throw new Error(
      "Session agent is required",
    );
  }

  if (
    !cleanSessionId
  ) {
    throw new Error(
      "Native session ID is required",
    );
  }

  const agentFolder =
    safeSegment(
      cleanAgent
        .toLowerCase(),
      "agent",
    );

  const sessionFolder =
    safeSegment(
      cleanSessionId,
      "session",
    );

  return {
    projectId:
      project.id,

    projectName:
      project.name,

    projectRoot:
      project.rootPath,

    agent:
      cleanAgent,

    nativeSessionId:
      cleanSessionId,

    sessionKey:
      `${cleanAgent}:${cleanSessionId}`,

    remotePrefix:
      [
        "projects",
        project.id,
        "sessions",
        agentFolder,
        sessionFolder,
      ].join(
        "/",
      ),

    localDirectory:
      join(
        project.rootPath,
        ".toolnet",
        "sessions",
        agentFolder,
        sessionFolder,
      ),
  };
}
