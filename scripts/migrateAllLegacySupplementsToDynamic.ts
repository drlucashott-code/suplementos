import { execSync } from "node:child_process";

const commands = [
  "migrate:legacy:cafe-funcional",
  "migrate:legacy:bebida-proteica",
  "migrate:legacy:barra",
  "migrate:legacy:whey",
  "migrate:legacy:creatina",
  "migrate:legacy:pre-treino",
];

function run(command: string) {
  execSync(`npm run ${command}`, {
    stdio: "inherit",
    shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh",
  });
}

async function main() {
  console.log("Iniciando migracao completa dos suplementos...");

  for (const command of commands) {
    console.log("");
    console.log(`Executando ${command}...`);
    run(command);
  }

  console.log("");
  console.log("Migracao completa dos suplementos finalizada.");
}

main().catch((error) => {
  console.error("Erro na migracao completa dos suplementos:", error);
  process.exit(1);
});
