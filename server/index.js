import express from "express";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { compile } from "./compiler.js";
const app = express();
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method === "POST" && !req.is("application/json"))
    return res.status(415).json({ error: "Use application/json." });
  next();
});
app.use(express.json({ limit: "16mb" }));
app.get("/api/health", (_req, res) => {
  const ready = spawnSync("xelatex", ["--version"]).status === 0;
  res
    .status(ready ? 200 : 503)
    .json({ ready, engine: "XeLaTeX", unicode: true });
});
app.post("/api/compile", async (req, res, next) => {
  try {
    res.setHeader("Cache-Control", "no-store");
    res.json(await compile(req.body));
  } catch (e) {
    next(e);
  }
});
const dist = fileURLToPath(new URL("../dist", import.meta.url));
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get("/{*path}", (req, res) => {
    if (req.path.startsWith("/api/"))
      return res.status(404).json({ error: "API route not found." });
    res.sendFile(join(dist, "index.html"));
  });
}
app.use((err, _req, res, _next) =>
  res.status(err.status || 500).json({
    error:
      err.status === 413
        ? "Project exceeds the 16 MB request limit."
        : err.status === 400 && err.type === "entity.parse.failed"
          ? "Invalid JSON."
          : err.message || "Compilation failed.",
  }),
);
const port = Number(process.env.PORT) || 3001;
app.listen(port, process.env.HOST || "127.0.0.1", () =>
  console.log(`PaperStudio running on port ${port}`),
);
