import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the complete R.I.C.H. investor flow", async () => {
  const response = await render("/som-usd");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>R\.I\.C\.H\. — калькулятор в сомах и долларах<\/title>/i);
  assert.match(html, /rich-logo-gold\.png/i);
  assert.match(html, /Выберите инвестиционный продукт/i);
  assert.match(html, /Зачем вам увеличивать капитал\?/i);
  assert.match(html, /Доходный капитал/i);
  assert.match(html, /36%/i);
  assert.match(html, /Три шага к цели быстрее/i);
  assert.match(html, /График роста/i);
  assert.match(html, /Протокол инвестиционных намерений/i);
  assert.doesNotMatch(html, /Codex is working|Your site is taking shape/i);
});

test("keeps branded assets and fixed-income rules in source", async () => {
  const componentUrl = new URL("../app/InvestmentCalculator.tsx", import.meta.url);
  const cssUrl = new URL("../app/globals.css", import.meta.url);
  const [component, css] = await Promise.all([
    readFile(componentUrl, "utf8"),
    readFile(cssUrl, "utf8"),
    access(new URL("../public/brand/rich-logo-gold.png", import.meta.url)),
    access(new URL("../public/brand/rich-pattern.jpg", import.meta.url)),
  ]);

  assert.match(component, /6:\s*24/);
  assert.match(component, /12:\s*26/);
  assert.match(component, /24:\s*28/);
  assert.match(component, /36:\s*30/);
  assert.match(component, /const RETENTION_BONUS = 6/);
  assert.match(component, /const BANK_RATE_BENCHMARK = 14/);
  assert.match(css, /--green:\s*#0f3526/i);
  assert.match(css, /--gold:\s*#d6a266/i);
  assert.match(css, /@media print/i);
});
