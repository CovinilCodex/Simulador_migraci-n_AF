import { test, expect } from "@playwright/test";
import { defaultConfig } from "../src/materials.ts";
import { readFile } from "node:fs/promises";
const caseA = (page: any) =>
  page.getByRole("region", { name: "Formulation A", exact: true });
const caseB = (page: any) =>
  page.getByRole("region", { name: "Formulation B", exact: true });
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".validation-strip")).toContainText(
    "A mass residual:",
  );
});
test("two independent simulations use shared physical time, hue scale and unique SVG resources", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await expect(page.locator(".scenario-panel")).toHaveCount(2);
  await expect(
    caseA(page).getByRole("spinbutton", { name: /Temperature A/ }),
  ).toHaveValue("25");
  await expect(
    caseB(page).getByRole("spinbutton", { name: /Temperature B/ }),
  ).toHaveValue("45");
  await page.getByRole("button", { name: "Run both simulations" }).click();
  await expect(
    page.getByRole("button", { name: "Pause animation", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  await page.getByRole("slider", { name: "Simulation time" }).fill("180");
  for (const panel of [caseA(page), caseB(page)]) {
    await expect(panel.locator(".time-badge")).toContainText("72.0");
    await expect(panel.locator(".case-inventories")).not.toContainText("100.0");
  }
  const fills = await page
    .locator(".film-svg rect")
    .evaluateAll((els) =>
      els
        .map((el) => el.getAttribute("fill"))
        .filter((v) => v?.startsWith("hsl(")),
    );
  expect(fills.length).toBeGreaterThan(100);
  expect(fills.every((v) => v!.startsWith("hsl(280,"))).toBe(true);
  const ids = await page
    .locator("clipPath")
    .evaluateAll((els) => els.map((el) => el.id));
  expect(new Set(ids).size).toBe(ids.length);
  await page.getByLabel("Surfactant hue").selectOption("195");
  await expect(page.locator(".stale-banner")).toHaveCount(0);
  const cyan = await page
    .locator(".film-svg rect")
    .evaluateAll((els) =>
      els
        .map((el) => el.getAttribute("fill"))
        .filter((v) => v?.startsWith("hsl(")),
    );
  expect(cyan.every((v) => v!.startsWith("hsl(195,"))).toBe(true);
  expect(errors).toEqual([]);
});
test("research library exposes all 19 candidates and edits only the selected formulation", async ({
  page,
}) => {
  const select = page.getByLabel("AF surfactant", { exact: true });
  await expect(select.locator("option")).toHaveCount(20);
  await select.selectOption("Sorbitan monooleate");
  await expect(select).toHaveValue("Sorbitan monooleate");
  await expect(page.locator(".assumption-note")).toContainText("HVK/Fedors");
  await page
    .getByRole("button", { name: "Edit formulation B", exact: true })
    .click();
  await expect(page.getByLabel("AF surfactant", { exact: true })).toHaveValue(
    "Glyceryl monostearate",
  );
  await page
    .getByLabel("AF surfactant", { exact: true })
    .selectOption("Laureth-4");
  await page
    .getByRole("button", { name: "Edit formulation A", exact: true })
    .click();
  await expect(page.getByLabel("AF surfactant", { exact: true })).toHaveValue(
    "Sorbitan monooleate",
  );
  await page.getByRole("button", { name: "Run both simulations" }).click();
  await expect(
    page.getByRole("button", { name: "Pause animation", exact: true }),
  ).toBeVisible();
  await expect(caseA(page).locator(".case-material")).toContainText("Span 80");
  await expect(caseB(page).locator(".case-material")).toContainText(
    "Laureth-4",
  );
});
test("layer operations and polymer transition controls persist and affect transport", async ({
  page,
}) => {
  await page.getByLabel("Polymer for layer 1").selectOption("HDPE");
  await page
    .getByRole("button", { name: /HSP & transport/ })
    .first()
    .click();
  const layer = page.locator(".layer-card").first();
  await expect(
    layer.getByRole("spinbutton", { name: /Glass transition Tg/ }),
  ).toHaveValue("-110");
  await expect(
    layer.getByRole("spinbutton", { name: /Melting transition Tm/ }),
  ).toHaveValue("133");
  await layer
    .getByRole("spinbutton", { name: /Glass transition Tg/ })
    .fill("40");
  await layer
    .getByRole("spinbutton", { name: /Melting transition Tm/ })
    .fill("100");
  await page
    .getByRole("button", { name: "Move layer 1 down", exact: true })
    .click();
  await expect(page.getByLabel("Polymer for layer 2")).toHaveValue("HDPE");
  await page
    .getByRole("button", { name: "Duplicate layer 2", exact: true })
    .click();
  await expect(page.locator(".layer-card")).toHaveCount(4);
  await page
    .getByRole("button", { name: "Remove layer 3", exact: true })
    .click();
  await page.getByRole("button", { name: "Run both simulations" }).click();
  await expect(page.locator(".stale-banner")).toHaveCount(0);
  await expect(caseA(page).locator(".transport-readout")).toContainText(
    "40 / 100",
  );
  await page.reload();
  await expect(page.getByLabel("Polymer for layer 2")).toHaveValue("HDPE");
});
test("temperature edits remain independent and synchronized duration updates both", async ({
  page,
}) => {
  await caseB(page)
    .getByRole("spinbutton", { name: /Temperature B/ })
    .fill("60");
  await expect(
    caseA(page).getByRole("spinbutton", { name: /Temperature A/ }),
  ).toHaveValue("25");
  await page.getByRole("spinbutton", { name: /Duration/ }).fill("48");
  await page.getByRole("button", { name: "Run both simulations" }).click();
  await expect(
    page.getByRole("button", { name: "Pause animation", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  await page.getByRole("slider", { name: "Simulation time" }).fill("180");
  for (const panel of [caseA(page), caseB(page)])
    await expect(panel.locator(".time-badge")).toContainText("48.0");
  const cold = Number(
    await caseA(page)
      .locator(".transport-readout tbody tr")
      .first()
      .locator("td")
      .last()
      .innerText(),
  );
  const warm = Number(
    await caseB(page)
      .locator(".transport-readout tbody tr")
      .first()
      .locator("td")
      .last()
      .innerText(),
  );
  expect(warm).toBeGreaterThan(cold);
});
test("invalid inputs disable both runs, corrected inputs recover, custom HSP and notes work", async ({
  page,
}) => {
  const thickness = page.getByRole("spinbutton", { name: /Thickness/ }).first();
  await thickness.fill("0");
  await expect(
    page.getByRole("button", { name: "Run both simulations" }),
  ).toBeDisabled();
  await expect(page.getByRole("alert")).toContainText("Formulation A:");
  await thickness.fill("15");
  await expect(
    page.getByRole("button", { name: "Run both simulations" }),
  ).toBeEnabled();
  const surf = page.locator(".config-section").nth(1);
  await surf.getByRole("spinbutton", { name: /δH/ }).fill("10");
  await expect(surf.getByRole("combobox")).toHaveValue("Custom surfactant");
  await page.getByRole("tab", { name: "HSP compatibility" }).click();
  await expect(page.locator(".hansen-svg")).toHaveCount(2);
  await page.getByRole("button", { name: "Model & research" }).click();
  await expect(page.getByRole("dialog")).toContainText("Polymer transitions");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("v3 JSON and comparison CSV round trip; legacy imports remain supported", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const j = page.waitForEvent("download");
  await page.getByRole("button", { name: /Project settings/ }).click();
  const project = JSON.parse(await readFile((await (await j).path())!, "utf8"));
  expect(project.schemaVersion).toBe(3);
  expect(project.configs).toHaveLength(2);
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const d = page.waitForEvent("download");
  await page.getByRole("button", { name: /Simulation results/ }).click();
  const csv = await readFile((await (await d).path())!, "utf8");
  expect(csv.split("\n")).toHaveLength(1 + 2 * 181 * 72);
  expect(csv).toContain("D_effective_m2_s");
  expect(csv).toContain("\nB,45,");
  project.configs[1].surfactant.name = "Custom imported";
  project.configs[1].temperature = 50;
  await page.getByLabel("Import AF project JSON").setInputFiles({
    name: "comparison.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await expect(page.getByRole("status")).toContainText("imported");
  await expect(
    caseB(page).getByRole("spinbutton", { name: /Temperature B/ }),
  ).toHaveValue("50");
  const old: any = defaultConfig();
  old.hours = 24;
  old.transportModel = "arrhenius";
  for (const l of old.layers)
    for (const k of ["tm", "tg", "eaRubbery", "eaMelt"]) delete l[k];
  await page.getByLabel("Import AF project JSON").setInputFiles({
    name: "legacy.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ schemaVersion: 1, config: old })),
  });
  await expect(page.getByLabel("Transport model")).toHaveCount(0);
  await expect(page.getByRole("spinbutton", { name: /Duration/ })).toHaveValue(
    "24",
  );
  await page.getByLabel("Import AF project JSON").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"schemaVersion":2,"configs":[]}'),
  });
  await expect(page.getByRole("alert")).toContainText("two formulations");
  await expect(page.getByRole("spinbutton", { name: /Duration/ })).toHaveValue(
    "24",
  );
});
test("copy A to B creates equal outputs, then changing B leaves A untouched", async ({
  page,
}) => {
  await page.getByRole("button", { name: "A → B", exact: true }).click();
  await expect(
    caseB(page).getByRole("spinbutton", { name: /Temperature B/ }),
  ).toHaveValue("25");
  await page.getByRole("button", { name: "Run both simulations" }).click();
  await expect(
    page.getByRole("button", { name: "Pause animation", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  await page.getByRole("slider", { name: "Simulation time" }).fill("180");
  expect(await caseA(page).locator(".case-inventories").innerText()).toBe(
    await caseB(page).locator(".case-inventories").innerText(),
  );
  await page
    .getByRole("button", { name: "Edit formulation B", exact: true })
    .click();
  await page
    .getByRole("spinbutton", { name: /AF concentration/ })
    .nth(1)
    .fill("2");
  await page
    .getByRole("button", { name: "Edit formulation A", exact: true })
    .click();
  await expect(
    page.getByRole("spinbutton", { name: /AF concentration/ }).nth(1),
  ).toHaveValue("1");
});
test("mobile fits viewport and both visualizations remain available", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Run both simulations" }).click();
  await expect(
    page.getByRole("button", { name: "Pause animation", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  await expect(caseA(page).locator(".film-svg")).toBeVisible();
  await expect(caseB(page).locator(".film-svg")).toBeVisible();
  await page.screenshot({
    path: "/tmp/af-comparison-mobile.png",
    fullPage: true,
  });
});

test("crossing Tg and Tm changes the active regime without a free-volume editor", async ({
  page,
}) => {
  await page.getByLabel("Polymer for layer 1").selectOption("EVA");
  await page
    .getByRole("button", { name: /HSP & transport/ })
    .first()
    .click();
  const layer = page.locator(".layer-card").first();
  await layer
    .getByRole("spinbutton", { name: /Glass transition Tg/ })
    .fill("40");
  await layer
    .getByRole("spinbutton", { name: /Melting transition Tm/ })
    .fill("80");
  await expect(
    page.getByRole("spinbutton", { name: /Free volume/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Run both simulations" }).click();
  await expect(
    page.getByRole("button", { name: "Pause animation", exact: true }),
  ).toBeVisible();
  await expect(
    caseA(page).locator(".transport-readout tbody tr").first(),
  ).toContainText("Glassy");
  await caseA(page)
    .getByRole("spinbutton", { name: /Temperature A/ })
    .fill("60");
  await page.getByRole("button", { name: "Run both simulations" }).click();
  await expect(
    page.getByRole("button", { name: "Pause animation", exact: true }),
  ).toBeVisible();
  await expect(
    caseA(page).locator(".transport-readout tbody tr").first(),
  ).toContainText("Above Tg");
  await caseA(page)
    .getByRole("spinbutton", { name: /Temperature A/ })
    .fill("85");
  await page.getByRole("button", { name: "Run both simulations" }).click();
  await expect(
    page.getByRole("button", { name: "Pause animation", exact: true }),
  ).toBeVisible();
  await expect(
    caseA(page).locator(".transport-readout tbody tr").first(),
  ).toContainText("Molten");
  await expect(caseA(page).locator(".phase-note")).toContainText(
    "geometry is held fixed",
  );
  await layer
    .getByRole("checkbox", { name: "Has a melting transition" })
    .uncheck();
  await expect(
    layer.getByRole("spinbutton", { name: /Melting transition Tm/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Run both simulations" }).click();
  await expect(
    page.getByRole("button", { name: "Pause animation", exact: true }),
  ).toBeVisible();
  await expect(
    caseA(page).locator(".transport-readout tbody tr").first(),
  ).toContainText("Rubbery");
  await expect(caseA(page).locator(".phase-note")).toHaveCount(0);
});
test("v2 free-volume pair imports show conversion and remove obsolete inputs", async ({
  page,
}) => {
  const config: any = defaultConfig();
  config.transportModel = "freeVolume";
  config.freeVolumeB = 0.15;
  config.tortuosity = 1.5;
  for (const l of config.layers) {
    l.freeVolume25 = 0.12;
    l.crystallinity = 0.4;
    l.alphaGlassy = 0.0001;
    l.alphaRubbery = 0.0004;
    delete l.eaRubbery;
    delete l.eaMelt;
    delete l.tm;
  }
  await page
    .getByLabel("Import AF project JSON")
    .setInputFiles({
      name: "v2.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          schemaVersion: 2,
          configs: [config, structuredClone(config)],
          hue: 280,
        }),
      ),
    });
  await expect(page.getByRole("status")).toContainText("imported");
  await expect(page.locator(".migration-banner")).toContainText("converted");
  await expect(page.getByLabel("Transport model")).toHaveCount(0);
  await page.getByRole("button", { name: "Dismiss conversion note" }).click();
  await page.reload();
  await expect(page.locator(".validation-strip")).toContainText(
    "A mass residual:",
  );
  await expect(page.locator(".migration-banner")).toHaveCount(0);
});
