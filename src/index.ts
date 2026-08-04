import {
  createToolNetMemoryRuntime,
} from "./runtime/index.js";

async function main() {
  const runtime =
    createToolNetMemoryRuntime();

  const startup =
    await runtime.start();

  const prepared =
    await runtime.preparePrompt(
      "Tiếp tục công việc hiện tại",
    );

  console.log({
    started: true,
    ...startup,

    contextCharacters:
      prepared.context.length,
  });

  const shutdown =
    await runtime.stop();

  console.log({
    stopped: true,

    memories:
      shutdown.memories,

    codeParsed:
      shutdown.code.parsed,

    vectorsIndexed:
      shutdown.vectors.indexed,
  });
}

main().catch(
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
