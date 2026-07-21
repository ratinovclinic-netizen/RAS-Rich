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
  const funnelMeta = await Promise.all(selectedCategories.map(async (category) => {
    const categoryId = Number(category.id);
    const stagesResponse = await bitrix.call<Array<Record<string, unknown>>>("crm.status.list", { filter: { ENTITY_ID: `DEAL_STAGE_${categoryId}` }, order: { SORT: "ASC" } });
    return {
      id: categoryId,
      name: category.name || `Воронка ${categoryId}`,
      stages: stagesResponse.result.map((stage) => ({ id: String(stage.STATUS_ID || ""), name: String(stage.NAME || stage.STATUS_ID || "Стадия"), semantics: String(stage.SEMANTICS || "") })),
    };
  }));
  const inferredWon = funnelMeta.flatMap((funnel) => funnel.stages.filter((stage) => stage.semantics === "S").map((stage) => stage.id));
  const inferredLost = funnelMeta.flatMap((funnel) => funnel.stages.filter((stage) => stage.semantics === "F").map((stage) => stage.id));
  const deals: Array<Record<string, unknown>> = [];
  let start = 0;
  do {
    const filter = categoryIds.length ? { "@categoryId": categoryIds } : {};
    const page = await bitrix.call<{ items?: Array<Record<string, unknown>> }>("crm.item.list", {
      entityTypeId: config.bitrix.entityTypeId,
      filter,
      select: ["id", "categoryId", "stageId", "opportunity", "currencyId", "assignedById", "createdTime", "updatedTime"],
      order: { id: "ASC" },
      start,
    });
    deals.push(...(page.result.items || []));
    start = typeof page.next === "number" ? page.next : -1;
  } while (start >= 0 && deals.length < 10_000);

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
  const report = formatDeterministicReport(metrics, config.currency);
  let telegramMessageId: number | undefined;
  if (deliver) {
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) throw new Error("Не настроена отправка в Telegram.");
    telegramMessageId = await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, report);
  }
  return { metrics, report, delivered: deliver, telegramMessageId };
}
