import { spawn } from "node:child_process";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const assetName =
  /^[\p{L}\p{N}_][\p{L}\p{N}_. -]{0,119}\.(png|jpe?g|pdf)$/iu;
let active = 0;
export async function compile({ source, assets = [] }) {
  if (
    typeof source !== "string" ||
    !source.trim() ||
    Buffer.byteLength(source) > 512_000
  )
    throw Object.assign(
      new Error("Provide LaTeX source smaller than 512 KB."),
      { status: 400 },
    );
  if (!Array.isArray(assets) || assets.length > 20)
    throw Object.assign(
      new Error("A project supports up to 20 images or PDFs."),
      { status: 400 },
    );
  const names = new Set();
  let total = 0;
  const files = assets.map((asset) => {
    if (
      !asset ||
      typeof asset.name !== "string" ||
      !assetName.test(asset.name) ||
      asset.name.includes("..") ||
      names.has(asset.name) ||
      typeof asset.data !== "string" ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(asset.data)
    )
      throw Object.assign(
        new Error(
          "Invalid or duplicate asset. Use a simple PNG, JPEG, or PDF filename.",
        ),
        { status: 400 },
      );
    names.add(asset.name);
    const data = Buffer.from(asset.data, "base64");
    total += data.length;
    const png = data
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpg = data[0] === 255 && data[1] === 216 && data[2] === 255;
    const pdf = data.subarray(0, 5).toString() === "%PDF-";
    if (
      !(/\.png$/i.test(asset.name)
        ? png
        : /\.pdf$/i.test(asset.name)
          ? pdf
          : jpg) ||
      total > 10_000_000
    )
      throw Object.assign(
        new Error(
          "Assets must be valid PNG, JPEG, or PDF files, totaling at most 10 MB.",
        ),
        { status: 400 },
      );
    return { name: asset.name, data };
  });
  if (active >= 2)
    throw Object.assign(new Error("The compiler is busy. Try again shortly."), {
      status: 429,
    });
  active++;
  let dir;
  try {
    dir = await mkdtemp(join(tmpdir(), "paperstudio-"));
    await writeFile(join(dir, "main.tex"), source);
    for (const file of files) await writeFile(join(dir, file.name), file.data);
    let log = "";
    for (let pass = 0; pass < 2; pass++) {
      const result = await run(dir);
      log += result.output;
      if (result.code !== 0)
        return {
          ok: false,
          log,
          duration: result.timeout ? "timeout" : undefined,
        };
    }
    const pdf = await readFile(join(dir, "main.pdf"));
    return { ok: true, pdf: pdf.toString("base64"), log };
  } finally {
    active--;
    if (dir) await rm(dir, { recursive: true, force: true });
  }
}
function run(cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "xelatex",
      [
        "-no-shell-escape",
        "-interaction=nonstopmode",
        "-halt-on-error",
        "-file-line-error",
        "main.tex",
      ],
      {
        cwd,
        detached: true,
        env: {
          ...process.env,
          openin_any: "p",
          openout_any: "p",
          TEXMFOUTPUT: cwd,
          HOME: cwd,
        },
      },
    );
    let output = "",
      timeout = false,
      done = false;
    const kill = () => {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {}
    };
    const timer = setTimeout(() => {
      timeout = true;
      kill();
    }, 30_000);
    const collect = (chunk) => {
      output += chunk.toString();
      if (output.length > 1_000_000) kill();
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    child.on("error", (err) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      reject(
        Object.assign(
          new Error(
            err.code === "ENOENT"
              ? "XeLaTeX is not installed. See README for setup."
              : "Could not start the compiler.",
          ),
          { status: 503 },
        ),
      );
    });
    child.on("close", (code) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({
        code,
        timeout,
        output:
          output.slice(-1_000_000) +
          (timeout ? "\nCompilation timed out after 30 seconds." : ""),
      });
    });
  });
}
