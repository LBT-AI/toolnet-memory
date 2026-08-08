import {
  describe,
  expect,
  it,
} from "vitest";

describe(
  "Agy Hook Input Parser",
  () => {
    it(
      "parses nested Agy native schema with common envelope",
      async () => {
        const input = {
          common: {
            conversation_id: "test-conv-123",
            workspace_paths: ["/tmp/project"],
            transcript_path: "/tmp/transcript.jsonl",
            model_name: "gemini-2.0-flash-exp",
            artifact_directory_path: "/tmp/artifacts",
          },
          pre_invocation_hook_args: {
            invocation_num: 0,
          },
        };

        const { normalizeAgyInput } = await import(
          "../../src/session/agy/hook.js"
        );

        const normalized = normalizeAgyInput(input);

        expect(normalized.conversationId).toBe("test-conv-123");
        expect(normalized.workspacePaths).toEqual(["/tmp/project"]);
        expect(normalized.transcriptPath).toBe("/tmp/transcript.jsonl");
        expect(normalized.invocationNum).toBe(0);
        expect(normalized.modelName).toBe("gemini-2.0-flash-exp");
        expect(normalized.artifactDirectoryPath).toBe("/tmp/artifacts");
      },
    );

    it(
      "parses legacy flat camelCase schema",
      async () => {
        const input = {
          conversationId: "legacy-conv-456",
          workspacePaths: ["/home/user/project"],
          transcriptPath: "/home/user/transcript.jsonl",
          invocationNum: 5,
          modelName: "gemini-pro",
        };

        const { normalizeAgyInput } = await import(
          "../../src/session/agy/hook.js"
        );

        const normalized = normalizeAgyInput(input);

        expect(normalized.conversationId).toBe("legacy-conv-456");
        expect(normalized.workspacePaths).toEqual(["/home/user/project"]);
        expect(normalized.transcriptPath).toBe("/home/user/transcript.jsonl");
        expect(normalized.invocationNum).toBe(5);
        expect(normalized.modelName).toBe("gemini-pro");
      },
    );

    it(
      "parses legacy flat snake_case schema",
      async () => {
        const input = {
          conversation_id: "snake-conv-789",
          workspace_paths: ["/opt/app"],
          transcript_path: "/opt/transcript.jsonl",
          invocation_num: 2,
          model_name: "gemini-ultra",
        };

        const { normalizeAgyInput } = await import(
          "../../src/session/agy/hook.js"
        );

        const normalized = normalizeAgyInput(input);

        expect(normalized.conversationId).toBe("snake-conv-789");
        expect(normalized.workspacePaths).toEqual(["/opt/app"]);
        expect(normalized.transcriptPath).toBe("/opt/transcript.jsonl");
        expect(normalized.invocationNum).toBe(2);
        expect(normalized.modelName).toBe("gemini-ultra");
      },
    );

    it(
      "prefers nested schema over flat when both present",
      async () => {
        const input = {
          common: {
            conversation_id: "nested-wins",
            workspace_paths: ["/nested/path"],
            transcript_path: "/nested/transcript.jsonl",
          },
          conversationId: "flat-loses",
          workspacePaths: ["/flat/path"],
          transcriptPath: "/flat/transcript.jsonl",
        };

        const { normalizeAgyInput } = await import(
          "../../src/session/agy/hook.js"
        );

        const normalized = normalizeAgyInput(input);

        expect(normalized.conversationId).toBe("nested-wins");
        expect(normalized.workspacePaths).toEqual(["/nested/path"]);
        expect(normalized.transcriptPath).toBe("/nested/transcript.jsonl");
      },
    );

    it(
      "parses stop hook args with termination info",
      async () => {
        const input = {
          common: {
            conversation_id: "stop-test",
            workspace_paths: ["/tmp/stop"],
            transcript_path: "/tmp/stop.jsonl",
          },
          stop_hook_args: {
            fully_idle: true,
            termination_reason: "user_exit",
            error: "timeout occurred",
          },
        };

        const { normalizeAgyInput } = await import(
          "../../src/session/agy/hook.js"
        );

        const normalized = normalizeAgyInput(input);

        expect(normalized.conversationId).toBe("stop-test");
        expect(normalized.fullyIdle).toBe(true);
        expect(normalized.terminationReason).toBe("user_exit");
        expect(normalized.error).toBe("timeout occurred");
      },
    );

    it(
      "handles empty input gracefully",
      async () => {
        const input = {};

        const { normalizeAgyInput } = await import(
          "../../src/session/agy/hook.js"
        );

        const normalized = normalizeAgyInput(input);

        expect(normalized.conversationId).toBe("");
        expect(normalized.workspacePaths).toEqual([]);
        expect(normalized.transcriptPath).toBe("");
        expect(normalized.invocationNum).toBeUndefined();
      },
    );
  },
);
