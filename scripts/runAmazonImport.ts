import { spawn } from "child_process";

const input = JSON.parse(process.argv[2]);

const script =
  input.mode === "getItem"
    ? "ImportAmazonGetItem.ts"
    : "ImportAmazonGetVariation.ts";

spawn(
  "node",
  ["--loader", "ts-node/esm", `scripts/${script}`, JSON.stringify(input)],
  { stdio: "inherit" }
).on("exit", (code: number | null) => {
  if (code !== 0) process.exit(1);
});
