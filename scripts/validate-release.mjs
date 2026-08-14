import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const excludedDirectories = new Set([
  ".git",
  ".hermes-lab",
  "dist",
  "node_modules",
]);

async function filesUnder(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await filesUnder(absolute)));
    else if (entry.isFile()) result.push(absolute);
  }
  return result;
}

const files = await filesUnder(root);
const markdownFiles = files.filter((file) => file.endsWith(".md"));
const missingLinks = [];
const linkPattern = /!?(?:\[[^\]]*\])\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

for (const markdownFile of markdownFiles) {
  const source = await readFile(markdownFile, "utf8");
  for (const match of source.matchAll(linkPattern)) {
    const target = match[1];
    if (
      !target ||
      /^(?:https?:|mailto:|#)/i.test(target) ||
      target.includes("<run-id>")
    )
      continue;
    const withoutFragment = decodeURIComponent(target.split("#", 1)[0]);
    if (!withoutFragment) continue;
    const resolved = path.resolve(path.dirname(markdownFile), withoutFragment);
    try {
      await stat(resolved);
    } catch {
      missingLinks.push(`${path.relative(root, markdownFile)} -> ${target}`);
    }
  }
}

if (missingLinks.length)
  throw new Error(`Missing local links:\n${missingLinks.join("\n")}`);

const reportRoots = ["indirect-instruction", "tool-misuse", "path-boundary"];
let checksumCount = 0;
for (const scenario of reportRoots) {
  const directory = path.join(root, "examples", "reports", scenario);
  for (const name of ["evidence", "report"]) {
    const extension = name === "evidence" ? "json" : "json";
    const artifact = path.join(directory, `${name}.${extension}`);
    const sidecar = path.join(directory, `${name}.sha256`);
    const observed = createHash("sha256")
      .update(await readFile(artifact))
      .digest("hex");
    const expected = (await readFile(sidecar, "utf8")).trim().split(/\s+/)[0];
    if (observed !== expected)
      throw new Error(`Checksum mismatch: ${path.relative(root, artifact)}`);
    checksumCount += 1;
  }
}

const gif = await readFile(
  path.join(root, "docs", "assets", "hermes-lab-demo.gif"),
);
if (!["GIF87a", "GIF89a"].includes(gif.subarray(0, 6).toString("ascii"))) {
  throw new Error("Invalid demo GIF header");
}
const png = await readFile(
  path.join(root, "docs", "assets", "hermes-lab-social-card.png"),
);
if (
  !png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
) {
  throw new Error("Invalid social card PNG header");
}

const secretPatterns = [
  /sk-[A-Za-z0-9_-]{20,}/g,
  /AKIA[0-9A-Z]{16}/g,
  /Bearer\s+[A-Za-z0-9._-]{24,}/gi,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
];
const secretHits = [];
for (const file of files.filter((item) => !/\.(?:gif|png)$/i.test(item))) {
  const source = await readFile(file, "utf8");
  if (
    secretPatterns.some(
      (pattern) => ((pattern.lastIndex = 0), pattern.test(source)),
    )
  ) {
    secretHits.push(path.relative(root, file));
  }
}
if (secretHits.length)
  throw new Error(`Secret-shaped value found in: ${secretHits.join(", ")}`);

process.stdout.write(`LOCAL_LINKS=OK MARKDOWN_FILES=${markdownFiles.length}\n`);
process.stdout.write(`CHECKSUMS=OK SIDECARS=${checksumCount}\n`);
process.stdout.write(
  `ASSETS=OK GIF_BYTES=${gif.length} PNG_BYTES=${png.length}\n`,
);
process.stdout.write("SECRET_SCAN=OK\n");
