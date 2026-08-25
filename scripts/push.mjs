import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(ROOT);

function run(cmd) {
  return execSync(cmd, { stdio: "inherit", encoding: "utf8" });
}

function out(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

if (!existsSync(".git")) {
  run("git init -b main");
}

let remote = "";
try {
  remote = out("git remote get-url origin");
} catch {
  remote = "";
}
if (!remote) {
  run("git remote add origin https://github.com/isan228/kelechek.git");
}

run("git add -A");
const pending = out("git status --porcelain");
const message = process.argv.slice(2).join(" ").trim() || "update";
if (pending) {
  run(`git commit -m ${JSON.stringify(message)}`);
} else {
  console.log("Нет новых файлов для коммита");
}

const branch = out("git rev-parse --abbrev-ref HEAD") || "main";
run(`git push -u origin ${branch}`);
console.log(`Готово: https://github.com/isan228/kelechek  (${branch})`);
