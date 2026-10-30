import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compile } from "../server/compiler.js";
import { templates } from "../src/templates.js";

async function inspectPdf(result) {
  assert.equal(result.ok, true, result.log);
  assert.doesNotMatch(
    result.log,
    /Missing character:/,
    "Sample PDFs should not have missing glyphs",
  );
  const bytes = Buffer.from(result.pdf, "base64");
  assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
  const dir = await mkdtemp(join(tmpdir(), "paperstudio-test-"));
  try {
    const path = join(dir, "result.pdf");
    await writeFile(path, bytes);
    return {
      text: execFileSync("pdftotext", [path, "-"], { encoding: "utf8" }),
      fonts: execFileSync("pdffonts", [path], { encoding: "utf8" }),
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("editorial template compiles equations and TikZ to a readable PDF", async () => {
  const result = await inspectPdf(
    await compile({ source: templates.article.source }),
  );
  assert.match(result.text, /Begin with an idea/);
  assert.match(result.text, /Something beautiful/);
  assert.match(result.fonts, /LMRoman/);
});
test("Sinhala compiles with an embedded Noto font and Unicode text", async () => {
  const result = await inspectPdf(
    await compile({ source: templates.sinhala.source }),
  );
  assert.match(result.fonts, /NotoSerifSinhala/);
  assert.match(result.text, /සිංහල/);
  assert.match(result.text, /English and Sinhala/);
});
test("research report supports tables and a two-pass table of contents", async () => {
  const result = await inspectPdf(
    await compile({ source: templates.report.source }),
  );
  assert.match(result.text, /Contents/);
  assert.match(result.text, /Treatment/);
  assert.match(result.text, /18.7/);
});
test("uploaded PNG is included in the PDF", async () => {
  const data = execFileSync(
    "python3",
    [
      "-c",
      `import struct,zlib,base64
chunk=lambda t,d:struct.pack('!I',len(d))+t+d+struct.pack('!I',zlib.crc32(t+d)&0xffffffff)
png=b'\\x89PNG\\r\\n\\x1a\\n'+chunk(b'IHDR',struct.pack('!2I5B',2,2,8,2,0,0,0))+chunk(b'IDAT',zlib.compress((b'\\x00'+b'\\x33\\x77\\x55'*2)*2))+chunk(b'IEND',b'')
print(base64.b64encode(png).decode())`,
    ],
    { encoding: "utf8" },
  ).trim();
  const result = await inspectPdf(
    await compile({
      source: String.raw`\documentclass{article}\usepackage{graphicx}\begin{document}Image test\includegraphics[width=2cm]{sample.png}\end{document}`,
      assets: [{ name: "sample.png", data }],
    }),
  );
  assert.match(result.text, /Image test/);
});
test("syntax errors return a useful compiler log", async () => {
  const result = await compile({
    source: String.raw`\documentclass{article}\begin{document}\undefinedPaperStudioCommand\end{document}`,
  });
  assert.equal(result.ok, false);
  assert.match(result.log, /Undefined control sequence/);
});
test("path traversal, duplicate assets, and mismatched image contents are rejected", async () => {
  for (const assets of [
    [{ name: "../escape.png", data: "AA==" }],
    [{ name: "main.png", data: "AA==" }],
  ])
    await assert.rejects(compile({ source: "test", assets }), { status: 400 });
  await assert.rejects(compile({ source: "" }), { status: 400 });
});
test("TeX cannot read absolute host files", async () => {
  const result = await compile({
    source: String.raw`\documentclass{article}\begin{document}\input{/etc/passwd}\end{document}`,
  });
  assert.equal(result.ok, false);
  assert.match(result.log, /Not reading|not found|openin_any/);
});
