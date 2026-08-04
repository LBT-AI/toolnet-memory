import "dotenv/config";
import { loadConfig } from "../core/index.js";
import {
  createStorageProvider,
  withStorageRetry,
} from "./index.js";

const config = loadConfig();

const storage = withStorageRetry(
  createStorageProvider({
    provider: config.storage.provider,
    huggingface: config.storage.huggingface,
    localRoot: config.storage.localRoot,
  }),
  { attempts: 3 },
);

const objects = await storage.list("");

console.log(`TOTAL: ${objects.length}\n`);

for (const object of objects.sort((a, b) => a.key.localeCompare(b.key))) {
  console.log(object.key);
}
