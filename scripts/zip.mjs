import { createWriteStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const archiver = require("archiver");
const output = createWriteStream("priceradar.zip");
const archive = archiver("zip", { zlib: { level: 9 } });
archive.pipe(output);
async function addDirectory(directory, prefix = "") {
  for (const entry of await readdir(directory)) {
    const path = join(directory, entry);
    if ((await stat(path)).isDirectory()) await addDirectory(path, join(prefix, entry));
    else archive.file(path, { name: join(prefix, entry) });
  }
}
await addDirectory("dist");
await archive.finalize();
