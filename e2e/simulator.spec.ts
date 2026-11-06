import { test, expect } from "@playwright/test";
import { defaultConfig } from "../src/materials.ts";
import { readFile } from "node:fs/promises";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".validation-strip")).toContainText(
    "relative error",
  );
});
test("initial film, playback, timeline and charts render without browser errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await expect(page.locator(".layer-card")).toHaveCount(3);
  await expect(
    page.getByRole("img", { name: /Film cross-section/ }),
  ).toBeVisible();
  await expect(page.locator(".metric-card").nth(2)).toContainText("100.0");
  await page
    .getByRole("button", { name: "Run simulation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pause animation", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  await page.getByRole("slider", { name: "Simulation time" }).fill("180");
  await expect(page.locator(".time-badge")).toContainText("72.0");
  await expect(page.locator(".metric-card").first()).not.toContainText("0.00");
  await expect(
    page.getByRole("img", { name: /Concentration profile/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: /Surface accumulation/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Restart timeline", exact: true })
    .click();
  await expect(page.locator(".time-badge")).toContainText("0.0");
  expect(errors).toEqual([]);
});
test("layer selection, HSP editing, duplication, reordering and deletion work", async ({
  page,
}) => {
  await page.getByLabel("Polymer for layer 1").selectOption("PET");
  await expect(page.locator(".stale-banner")).toBeVisible();
  await page
    .getByRole("button", { name: /HSP & transport/ })
    .first()
    .click();
  const layer = page.locator(".layer-card").first();
  await expect(layer.getByRole("spinbutton", { name: /δD/ })).toHaveValue(
    "18.2",
  );
  await layer.getByRole("spinbutton", { name: /δP/ }).fill("5");
  await layer.getByRole("spinbutton", { name: /AF concentration/ }).fill("0.8");
  await page
    .getByRole("button", { name: "Move layer 1 down", exact: true })
    .click();
  await expect(page.getByLabel("Polymer for layer 2")).toHaveValue("PET");
  await page
    .getByRole("button", { name: "Duplicate layer 2", exact: true })
    .click();
  await expect(page.locator(".layer-card")).toHaveCount(4);
  await page
    .getByRole("button", { name: "Remove layer 3", exact: true })
    .click();
  await expect(page.locator(".layer-card")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Add polymer layer", exact: true })
    .click();
  await expect(page.locator(".layer-card")).toHaveCount(4);
  await page
    .getByRole("button", { name: "Run simulation", exact: true })
    .click();
  await expect(page.locator(".stale-banner")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Pause animation", exact: true }),
  ).toBeVisible();
});
test("HSP map uses edited surfactant values and model notes are keyboard accessible", async ({
  page,
}) => {
  await page.getByRole("tab", { name: "HSP compatibility" }).click();
  await expect(
    page.getByRole("img", { name: /Hansen parameter projection/ }),
  ).toBeVisible();
  const surfactant = page.locator(".config-section").nth(1);
  await surfactant.getByRole("spinbutton", { name: /δH/ }).fill("12");
  await expect(surfactant.getByRole("combobox")).toHaveValue(
    "Custom surfactant",
  );
  await expect(page.locator(".stale-banner")).toBeVisible();
  await page.getByRole("button", { name: "Model & assumptions" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText(
    "not a universal HSP-to-solubility law",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("invalid inputs block running and recovery works", async ({ page }) => {
  const thickness = page.getByRole("spinbutton", { name: /Thickness/ }).first();
  await thickness.fill("0");
  await expect(
    page.getByRole("button", { name: "Run simulation", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("alert")).toContainText("thickness");
  await thickness.fill("20");
  await expect(
    page.getByRole("button", { name: "Run simulation", exact: true }),
  ).toBeEnabled();
  await expect(page.getByRole("alert")).toHaveCount(0);
});
test("project import/export, continuous wash, CSV and persistence round trip", async ({
  page,
}) => {
  const config = defaultConfig();
  config.left = "wash";
  config.right = "sealed";
  config.hours = 48;
  await page
    .getByLabel("Import AF project JSON")
    .setInputFiles({
      name: "scenario.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({ schemaVersion: 1, config })),
    });
  await expect(page.getByRole("status")).toContainText("imported");
  await page.getByRole("slider", { name: "Simulation time" }).fill("180");
  await expect(page.locator(".metric-card").nth(2)).not.toContainText(
    "0.00 mg/m² removed",
  );
  await expect(page.locator(".metric-card").nth(1)).toContainText("0.00");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const jsonDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /Project settings/ }).click();
  const json = JSON.parse(
    await readFile((await (await jsonDownload).path())!, "utf8"),
  );
  expect(json.schemaVersion).toBe(1);
  expect(json.config).toEqual(config);
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const csvDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /Simulation results/ }).click();
  const csv = await readFile((await (await csvDownload).path())!, "utf8");
  expect(csv.split("\n")).toHaveLength(1 + 181 * 72);
  expect(csv).toContain("mass_balance_relative_error");
  const last = csv.split("\n").at(-1)!.split(",");
  expect(Number(last[0])).toBe(48);
  expect(Number(last[8])).toBeGreaterThan(0);
  expect(Number(last[9])).toBe(0);
  await page.reload();
  await expect(page.locator(".validation-strip")).toContainText(
    "relative error",
  );
  await expect(page.getByRole("spinbutton", { name: /Duration/ })).toHaveValue(
    "48",
  );
  await page
    .getByLabel("Import AF project JSON")
    .setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"schemaVersion":1,"config":{}}'),
    });
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: /Duration/ })).toHaveValue(
    "48",
  );
});
test("mobile layout fits the viewport and controls remain usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("spinbutton", { name: /AF concentration/ })
    .first()
    .fill("0.3");
  await page
    .getByRole("button", { name: "Run simulation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pause animation", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  await page.screenshot({ path: "/tmp/af-mobile.png", fullPage: true });
});
