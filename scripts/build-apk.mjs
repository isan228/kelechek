#!/usr/bin/env node
// Builds the Flutter Android app and publishes the APK to apps/web/public/downloads,
// from where the site serves it at /downloads/kelechek.apk (page: /mobile).
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mobile = join(root, "apps", "mobile");
const outDir = join(root, "apps", "web", "public", "downloads");

const pubspec = readFileSync(join(mobile, "pubspec.yaml"), "utf8");
const match = pubspec.match(/^version:\s*([\d.]+)\+(\d+)/m);
if (!match) throw new Error("version not found in apps/mobile/pubspec.yaml");
const [, version, build] = match;

if (!existsSync(join(mobile, "android", "key.properties"))) {
  console.warn("! android/key.properties not found: APK will be signed with the debug key.");
}

const res = spawnSync(
  `flutter build apk --release --target-platform android-arm,android-arm64 --dart-define=APP_VERSION=${version}`,
  { cwd: mobile, stdio: "inherit", shell: true },
);
if (res.status !== 0) process.exit(res.status ?? 1);

const apk = join(mobile, "build", "app", "outputs", "flutter-apk", "app-release.apk");
mkdirSync(outDir, { recursive: true });
const target = join(outDir, "kelechek.apk");
copyFileSync(apk, target);

const size = statSync(target).size;
const info = { version, build: Number(build), sizeBytes: size, updatedAt: new Date().toISOString() };
writeFileSync(join(outDir, "app.json"), JSON.stringify(info, null, 2) + "\n");

console.log(`\nAPK ${version} (${build}) -> apps/web/public/downloads/kelechek.apk, ${(size / 1048576).toFixed(1)} MB`);
