import { createBitrixReadOnlyClient } from "@/lib/bitrix/read-only-client";
import { parseAgentConfig } from "./config";
import { readGoogleRanges, readPublicGoogleSheets } from "./google-sheets";
import { calculateMetrics, formatDeterministicReport } from "./metrics";
import { sendTelegramMessage } from "./telegram";

type AgentEnvironment = {
  BITRIX24_WEBHOOK_URL?: string;
  BITRIX24_CATEGORY_IDS?: string;
  GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?: string;
  INVESTMENT_AGENT_CONFIG_JSON?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
};

export async function runInvestmentAgent(env: AgentEnvironment, deliver: boolean) {
  const config = parseAgentConfig(env.INVESTMENT_AGENT_CONFIG_JSON);
  const categoryIds = env.BITRIX24_CATEGORY_IDS
    ? env.BITRIX24_CATEGORY_IDS.split(",").map(Number).filter(Number.isFinite)
    : config.bitrix.categoryIds;
  if (!env.BITRIX24_WEBHOOK_URL) throw new Error("Не задан BITRIX24_WEBHOOK_URL.");

  const bitrix = createBitrixReadOnlyClient(env.BITRIX24_WEBHOOK_URL);
  const categoriesResponse = await bitrix.call<{ categories?: Array<{ id?: number; name?: string }> }>("crm.category.list", { entityTypeId: config.bitrix.entityTypeId });
  const selectedCategories = (categoriesResponse.result.categories || []).filter((category) => categoryIds.includes(Number(category.id)));
  const funnelMeta: Array<{ id: number; name: string; stages: Array<{ id: string; name: string; semantics: string }> }> = [];
  for (const category of selectedCategories) {
    const categoryId = Number(category.id);
    const stagesResponse = await bitrix.call<Array<Record<string, unknown>>>("crm.status.list", { filter: { ENTITY_ID: `DEAL_STAGE_${categoryId}` }, order: { SORT: "ASC" } });
    funnelMeta.push({
      id: categoryId,
      name: category.name || `Воронка ${categoryId}`,
      stages: stagesResponse.result.map((stage) => ({ id: String(stage.STATUS_ID || ""), name: String(stage.NAME || stage.STATUS_ID || "Стадия"), semantics: String(stage.SEMANTICS || "") })),
    });
  }
  const inferredWon = funnelMeta.flatMap((funnel) => funnel.stages.filter((stage) => stage.semantics === "S").map((stage) => stage.id));
  const inferredLost = funnelMeta.flatMap((funnel) => funnel.stages.filter((stage) => stage.semantics === "F").map((stage) => stage.id));
  const filter = categoryIds.length ? { "@categoryId": categoryIds } : {};
  const loadPage = (start: number) => bitrix.call<{ items?: Array<Record<string, unknown>> }>("crm.item.list", {
      entityTypeId: config.bitrix.entityTypeId,
      filter,
      select: ["id", "categoryId", "stageId", "opportunity", "currencyId", "assignedById", "createdTime", "updatedTime"],
      order: { updatedTime: "DESC" },
      start,
    });
  const firstPage = await loadPage(0);
  const sourceTotal = firstPage.total ?? (firstPage.result.items || []).length;
  const safeLimit = Math.min(sourceTotal, 250);
  const starts = Array.from({ length: Math.max(0, Math.ceil(safeLimit / 50) - 1) }, (_, index) => (index + 1) * 50);
  const deals: Array<Record<string, unknown>> = [...(firstPage.result.items || [])];
  for (const start of starts) {
    const page = await loadPage(start);
    deals.push(...(page.result.items || []));
  }

  const sheets = env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    ? await readGoogleRanges({
        clientEmail: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        privateKey: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
        spreadsheetId: config.google.spreadsheetId,
        ranges: config.google.ranges,
      })
    : await readPublicGoogleSheets(config.google.spreadsheetId, config.google.ranges);
  const metrics = calculateMetrics(deals, sheets, {
    wonStageIds: config.bitrix.wonStageIds.length ? config.bitrix.wonStageIds : inferredWon,
    lostStageIds: config.bitrix.lostStageIds.length ? config.bitrix.lostStageIds : inferredLost,
    amountColumnIndex: config.google.amountColumnIndex,
  }, funnelMeta);
  if (sourceTotal > deals.length) metrics.warnings.push(`Оперативный срез: ${deals.length} последних из ${sourceTotal} сделок. Полная история синхронизируется отдельно.`);
  const report = formatDeterministicReport(metrics, config.currency);
  let telegramMessageId: number | undefined;
  if (deliver) {
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) throw new Error("Не настроена отправка в Telegram.");
    telegramMessageId = await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, report);
  }
  return { metrics, report, delivered: deliver, telegramMessageId };
}
