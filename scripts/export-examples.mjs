import { compile } from "../server/compiler.js";
import { templates } from "../src/templates.js";
import { mkdir, writeFile } from "node:fs/promises";
await mkdir("examples", { recursive: true });
for (const [key, template] of Object.entries(templates)) {
  const result = await compile({ source: template.source });
  if (!result.ok) throw new Error(result.log);
  await writeFile(`examples/${key}.tex`, template.source);
  await writeFile(`examples/${key}.pdf`, Buffer.from(result.pdf, "base64"));
  console.log(`Created ${key}.tex and ${key}.pdf`);
}
