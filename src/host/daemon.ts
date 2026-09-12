import { startLocalServer } from "./server.js";

const directory = process.argv[2];
if (!directory) throw new Error("Usage: node dist/host/daemon.js PRIVATE_DIRECTORY");
const server = await startLocalServer({ directory });
process.stdout.write(`${server.path}\n`);
let stopping = false;
const stop = () => {
  if (stopping) return;
  stopping = true;
  void server.close().catch(() => {
    process.exitCode = 1;
  });
};
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
