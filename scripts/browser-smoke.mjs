import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await mkdir("artifacts", { recursive: true });
try {
  await page.goto(process.env.APP_URL || "http://127.0.0.1:3001");
  await page
    .getByRole("heading", { name: "Your ideas, beautifully set." })
    .waitFor();
  await page.screenshot({ path: "artifacts/workspace.png", fullPage: true });
  await page.getByRole("button", { name: "Recompile", exact: false }).click();
  await page.getByTitle("Compiled PDF document").waitFor({ timeout: 60000 });
  await page
    .locator(".react-pdf__Page canvas")
    .first()
    .waitFor({ timeout: 60000 });
  await page
    .locator(".react-pdf__Page__textContent")
    .first()
    .waitFor({ timeout: 60000 });
  await page.screenshot({ path: "artifacts/compiled.png", fullPage: true });
  await page.getByLabel("Open templates").click();
  await page.getByRole("button", { name: /Sinhala document/ }).click();
  await page.getByRole("button", { name: "Recompile", exact: false }).click();
  await page.getByTitle("Compiled PDF document").waitFor({ timeout: 60000 });
  await page
    .locator(".react-pdf__Page canvas")
    .first()
    .waitFor({ timeout: 60000 });
  await page
    .locator(".react-pdf__Page__textContent")
    .first()
    .waitFor({ timeout: 60000 });
  await page.screenshot({
    path: "artifacts/sinhala-workspace.png",
    fullPage: true,
  });
  const result = await page.evaluate(async () => {
    const pdf = document.querySelector("[data-pdf-url]");
    return Array.from(
      new Uint8Array(await (await fetch(pdf.dataset.pdfUrl)).arrayBuffer()),
    );
  });
  await writeFile("artifacts/sinhala.pdf", Buffer.from(result));
  await page.getByRole("button", { name: "Compiler log" }).click();
  await page.getByRole("log").waitFor();
  assert.match(
    await page.getByRole("log").innerText(),
    /Output written on main.pdf/,
  );
  await page.reload();
  assert.equal(
    await page.getByLabel("Project name").inputValue(),
    "සිංහල ලේඛනය",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "PDF preview", exact: true }).click();
  await page.screenshot({ path: "artifacts/mobile.png", fullPage: true });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "mobile layout should not overflow",
  );
  assert.deepEqual(errors, []);
  console.log(
    "Browser checks passed: editor, English and Sinhala compilation, PDF preview, logs, autosave, mobile layout.",
  );
} finally {
  await browser.close();
}
