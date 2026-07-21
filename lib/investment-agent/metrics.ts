type Deal = { id?: string | number; categoryId?: string | number; stageId?: string; opportunity?: string | number; currencyId?: string; assignedById?: string | number; updatedTime?: string };
type SheetRange = { range: string; rows: unknown[][] };
type FunnelMeta = { id: number; name: string; stages: Array<{ id: string; name: string; semantics?: string }> };

export type Bottleneck = { severity: "high" | "medium"; funnel: string; stage: string; deals: number; staleDeals: number; staleRate: number; diagnosis: string; action: string };

export type InvestmentMetrics = {
  generatedAt: string;
  deals: { total: number; active: number; won: number; lost: number; pipelineValue: number; wonValue: number; conversionRate: number };
  sheets: { rowCount: number; amountTotal: number; ranges: Array<{ range: string; rows: number }> };
  funnels: Array<{ id: number; name: string; total: number; active: number; stale: number; value: number; stages: Array<{ id: string; name: string; deals: number; stale: number; value: number }> }>;
  bottlenecks: Bottleneck[];
  warnings: string[];
};

function amount(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const parsed = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function recommendation(funnel: string, stage: string): { diagnosis: string; action: string } {
  const context = `${funnel} ${stage}`.toLowerCase();
  if (context.includes("lead") || context.includes("лид")) return { diagnosis: "Лиды накапливаются без своевременного первого контакта.", action: "Ввести SLA первого звонка 15 минут, автоназначение и ежедневный контроль непрозвона." };
  if (context.includes("re-engagement") || context.includes("возврат")) return { diagnosis: "База повторного прогрева перегружена и теряет приоритеты.", action: "Разделить базу по давности и потенциалу, запустить 7-дневную последовательность касаний." };
  if (context.includes("активац")) return { diagnosis: "Инвесторы задерживаются между решением и фактической активацией.", action: "Закрепить единый чек-лист документов и оплаты, владельца следующего шага и срок 24 часа." };
  if (context.includes("сопровожд")) return { diagnosis: "Есть риск задержки обязательных касаний с действующими инвесторами.", action: "Ввести календарь обязательных контактов и автоматическое напоминание ответственному." };
  if (context.includes("претенз")) return { diagnosis: "Претензии требуют отдельного SLA и персонального владельца.", action: "Назначить владельца каждой претензии, срок первого ответа 2 часа и ежедневный разбор причин." };
  return { diagnosis: "В стадии скопилась очередь сделок без обновления.", action: "Разобрать сделки старше 7 дней, зафиксировать следующий шаг и закрыть неактуальные карточки." };
}

export function calculateMetrics(deals: Deal[], sheets: SheetRange[], config: { wonStageIds: string[]; lostStageIds: string[]; amountColumnIndex: number }, funnelMeta: FunnelMeta[] = []): InvestmentMetrics {
  const won = new Set(config.wonStageIds);
  const lost = new Set(config.lostStageIds);
  const wonDeals = deals.filter((deal) => won.has(deal.stageId || ""));
  const lostDeals = deals.filter((deal) => lost.has(deal.stageId || ""));
  const activeDeals = deals.filter((deal) => !won.has(deal.stageId || "") && !lost.has(deal.stageId || ""));
  const closed = wonDeals.length + lostDeals.length;
  const rows = sheets.flatMap((sheet) => sheet.rows.slice(1));
  const warnings: string[] = [];
  if (config.wonStageIds.length === 0) warnings.push("Не настроены выигранные стадии Bitrix24.");
  if (config.lostStageIds.length === 0) warnings.push("Не настроены проигранные стадии Bitrix24.");
  if (deals.length === 0) warnings.push("Bitrix24 не вернул сделок для выбранных воронок.");
  const staleBefore = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const isStale = (deal: Deal) => {
    const timestamp = deal.updatedTime ? Date.parse(deal.updatedTime) : NaN;
    return Number.isFinite(timestamp) && timestamp < staleBefore && !won.has(deal.stageId || "") && !lost.has(deal.stageId || "");
  };
  const funnels = funnelMeta.map((funnel) => {
    const funnelDeals = deals.filter((deal) => Number(deal.categoryId) === funnel.id);
    const stages = funnel.stages.map((stage) => {
      const stageDeals = funnelDeals.filter((deal) => deal.stageId === stage.id);
      return { id: stage.id, name: stage.name, deals: stageDeals.length, stale: stageDeals.filter(isStale).length, value: stageDeals.reduce((sum, deal) => sum + amount(deal.opportunity), 0) };
    }).filter((stage) => stage.deals > 0);
    return {
      id: funnel.id,
      name: funnel.name,
      total: funnelDeals.length,
      active: funnelDeals.filter((deal) => !won.has(deal.stageId || "") && !lost.has(deal.stageId || "")).length,
      stale: funnelDeals.filter(isStale).length,
      value: funnelDeals.reduce((sum, deal) => sum + amount(deal.opportunity), 0),
      stages,
    };
  });
  const bottlenecks = funnels.flatMap((funnel) => funnel.stages.map((stage) => {
    const staleRate = stage.deals ? Math.round(stage.stale / stage.deals * 100) : 0;
    const advice = recommendation(funnel.name, stage.name);
    return { severity: staleRate >= 50 && stage.stale >= 5 ? "high" as const : "medium" as const, funnel: funnel.name, stage: stage.name, deals: stage.deals, staleDeals: stage.stale, staleRate, ...advice };
  })).filter((item) => item.staleDeals >= 3 && item.staleRate >= 20).sort((a, b) => b.staleDeals - a.staleDeals).slice(0, 6);

  return {
    generatedAt: new Date().toISOString(),
    deals: {
      total: deals.length,
      active: activeDeals.length,
      won: wonDeals.length,
      lost: lostDeals.length,
      pipelineValue: activeDeals.reduce((sum, deal) => sum + amount(deal.opportunity), 0),
      wonValue: wonDeals.reduce((sum, deal) => sum + amount(deal.opportunity), 0),
      conversionRate: closed ? Math.round((wonDeals.length / closed) * 1000) / 10 : 0,
    },
    sheets: {
      rowCount: rows.length,
      amountTotal: rows.reduce((sum, row) => sum + amount(row[config.amountColumnIndex]), 0),
      ranges: sheets.map((sheet) => ({ range: sheet.range, rows: Math.max(0, sheet.rows.length - 1) })),
    },
    funnels,
    bottlenecks,
    warnings,
  };
}

export function formatDeterministicReport(metrics: InvestmentMetrics, currency: string): string {
  const money = new Intl.NumberFormat("ru-RU", { style: "currency", currency, maximumFractionDigits: 0 });
  return [
    "📊 Инвест-отдел — контрольный отчёт",
    `Сделки: ${metrics.deals.total} · активные ${metrics.deals.active} · выиграно ${metrics.deals.won} · проиграно ${metrics.deals.lost}`,
    `Конверсия закрытых сделок: ${metrics.deals.conversionRate}%`,
    `Активный портфель: ${money.format(metrics.deals.pipelineValue)}`,
    `Объём выигранных сделок: ${money.format(metrics.deals.wonValue)}`,
    `Google Sheets: ${metrics.sheets.rowCount} строк · сумма ${money.format(metrics.sheets.amountTotal)}`,
    ...(metrics.warnings.length ? ["⚠️ " + metrics.warnings.join(" ")] : []),
  ].join("\n");
}
