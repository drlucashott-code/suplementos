/**
 * Dispatcher CLI
 * Escolhe qual script rodar baseado no modo
 */

import { spawn } from "child_process";

type Mode = "getItem" | "getVariation";

type Params = {
  asins: string[];
  mode: Mode;
  titleTemplate: string;
  dose: number;
  proteinPerDose: number;
};

export function runAmazonImport(params: Params) {
  return new Promise<void>((resolve, reject) => {
    const script =
      params.mode === "getItem"
        ? "ImportAmazonGetItem.ts"
        : "ImportAmazonGetVariation.ts";

    const proc = spawn(
      "node",
      [
        "--loader",
        "ts-node/esm",
        `scripts/${script}`,
        JSON.stringify(params),
      ],
      { stdio: "inherit" }
    );

    proc.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Script falhou (${code})`));
    });
  });
}
