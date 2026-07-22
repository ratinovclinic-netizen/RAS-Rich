type Deal = { id?: string | number; categoryId?: string | number; stageId?: string; opportunity?: string | number; currencyId?: string; assignedById?: string | number; createdTime?: string; updatedTime?: string };
type SheetRange = { range: string; rows: unknown[][] };
type FunnelMeta = { id: number; name: string; stages: Array<{ id: string; name: string; semantics?: string }> };

export type Bottleneck = { severity: "high" | "medium"; funnel: string; stage: string; deals: number; staleDeals: number; staleRate: number; diagnosis: string; action: string };

export type InvestmentMetrics = {
  generatedAt: string;
  deals: { total: number; active: number; won: number; lost: number; pipelineValue: number; wonValue: number; conversionRate: number };
  sheets: { rowCount: number; amountTotal: number; ranges: Array<{ range: string; rows: number; columns: number; cells: number }> };
  funnels: Array<{ id: number; name: string; total: number; active: number; stale: number; value: number; stages: Array<{ id: string; name: string; deals: number; stale: number; value: number }> }>;
  bottlenecks: Bottleneck[];
  warnings: string[];
  command: {
    period: string;
    conversions: Array<{ label: string; from: number; to: number; rate: number; planRate?: number }>;
    money: { received: number; expected: number; currency: "USD"; receivedKgs: number; expectedKgs: number };
    planFact: { plan: number; fact: number; variance: number; varianceRate: number; forecast: number; completion: number };
    managers: Array<{ name: string; leads: number; qualified: number; meetings: number; deals: number; revenue: number; efficiency: number }>;
    leadPulse: { today: number; week: number; month: number; mqlWeek: number; meetingsWeek: number; dealsWeek: number; bitrixVisible: number; checkedDate: string };
    sources: Array<{ name: string; state: "ok" | "warn"; detail: string }>;
    efficiency: number;
    reliability: { score: number; level: "green" | "yellow" | "red"; conclusion: "confirmed" | "preliminary"; issues: string[]; bitrixCheckedAt: string; sheetCheckedAt: string };
  };
};

function numeric(value: unknown): number {
  const text = String(value ?? "").replace(/[$₽₸₴€%]/g, "").replace(/[\s\u00a0]/g, "").replace(",", ".");
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sheetCommand(sheets: SheetRange[]) {
  const plan = sheets.find(s => s.range.toLowerCase().includes("план-факт"))?.rows || sheets[0]?.rows || [];
  const managers = sheets.find(s => s.range.toLowerCase().includes("менеджер"))?.rows || [];
  const daily = sheets.find(s => s.range.toLowerCase().includes("дням"))?.rows || [];
  const labels = new Map(plan.map(row => [String(row[0] || "").trim().toLowerCase(), row]));
  const val = (label: string, column = 12) => numeric(labels.get(label.toLowerCase())?.[column]);
  const rate = (label: string, column = 12) => numeric(labels.get(label.toLowerCase())?.[column]);
  const leads = val("Все новые созданные лиды");
  const mql = val("Целевые лиды (MQL)");
  const qualified = val("Квалифицированные сделки");
  const meetings = val("1я встреча проведенна");
  const deals = val("Заключенне сделки (количество)");
  const planMoney = val("Фактическое поступление", 10) || val("Общая сумма заключенных сделок", 10);
  const factMoney = val("Фактическое поступление");
  const expected = val("Прогноз");
  const pct = (a:number,b:number) => b ? Math.round(a / b * 1000) / 10 : 0;
  const managerRows = new Map(managers.map(row => [String(row[0] || "").trim().toLowerCase(), row]));
  const managerValue = (label:string, col:number) => numeric(managerRows.get(label.toLowerCase())?.[col]);
  const managerNames = ["Менеджер 1", "Менеджер 2", "Менеджер 3"];
  const managerColumns = [8,9,10];
  const managerData = managerColumns.map((col,index) => {
    const ml = managerValue("Все новые созданные лиды",col);
    const mq = managerValue("Квалифицированные сделки",col);
    const mm = managerValue("1я встреча проведенна",col);
    const md = managerValue("Заключенне сделки (количество)",col);
    const mr = managerValue("Фактическое поступление",col);
    const efficiency = Math.round((pct(mq,ml)*.25 + pct(mm,mq)*.35 + pct(md,mm)*.4));
    return { name: managerNames[index], leads: ml, qualified: mq, meetings: mm, deals: md, revenue: mr, efficiency };
  });
  const dailyHeader = daily[0] || [];
  const dailyRows = new Map(daily.slice(1).map(row => [String(row[0] || "").trim().toLowerCase(), row]));
  const now = new Date();
  const dateKey = (date: Date) => `${String(date.getDate()).padStart(2,"0")}.${String(date.getMonth()+1).padStart(2,"0")}.${date.getFullYear()}`;
  const indexes = (days: number) => Array.from({length:days},(_,offset) => {
    const date = new Date(now); date.setDate(now.getDate()-offset);
    return dailyHeader.findIndex(cell => String(cell).trim() === dateKey(date));
  }).filter(index => index > 0);
  const sumDaily = (label:string, days:number) => {
    const row = dailyRows.get(label.toLowerCase()) || [];
    return indexes(days).reduce((sum,index) => sum + numeric(row[index]),0);
  };
  const monthSuffix = `.${String(now.getMonth()+1).padStart(2,"0")}.${now.getFullYear()}`;
  const monthIndexes = dailyHeader.map((cell,index) => ({cell:String(cell),index})).filter(({cell,index}) => index > 0 && cell.endsWith(monthSuffix)).map(item => item.index);
  const sumMonth = (label:string) => { const row=dailyRows.get(label.toLowerCase())||[]; return monthIndexes.reduce((sum,index)=>sum+numeric(row[index]),0); };
  const dailyLeadLabel = "Все новые созданные лиды";
  return {
    period: "Июль 2026",
    conversions: [
      { label:"Лид → качественный лид", from:leads, to:mql, rate:pct(mql,leads), planRate:80 },
      { label:"Качественный лид → встреча", from:mql, to:meetings, rate:pct(meetings,mql), planRate:18 },
      { label:"Встреча → сделка", from:meetings, to:deals, rate:pct(deals,meetings), planRate:35 },
    ],
    money: { received:factMoney, expected, currency:"USD" as const, receivedKgs:0, expectedKgs:0 },
    planFact: { plan:planMoney, fact:factMoney, variance:factMoney-planMoney, varianceRate:pct(factMoney-planMoney,planMoney), forecast:expected, completion:pct(factMoney,planMoney) },
    managers: managerData,
    leadPulse: { today:sumDaily(dailyLeadLabel,1), week:sumDaily(dailyLeadLabel,7), month:sumMonth(dailyLeadLabel)||leads, mqlWeek:sumDaily("Целевые лиды (MQL)",7), meetingsWeek:sumDaily("1я встреча проведенна",7), dealsWeek:sumDaily("Заключенне сделки (количество)",7), bitrixVisible:0, checkedDate:dateKey(now) },
    efficiency: Math.max(0,Math.min(100,Math.round(pct(deals,leads)*8 + pct(meetings,mql)*.35 + pct(factMoney,planMoney)*.45))),
    sources: [
      { name:"Bitrix24 · R.I.C.H.", state:"ok" as const, detail:"карточки, стадии, суммы и активность" },
      { name:"Google Sheets", state:"ok" as const, detail:`план-факт и KPI · ${plan.length} строк` },
      { name:"Контроль качества", state:"warn" as const, detail:"ежедневная сверка расхождений" },
    ],
    reliability: { score: 0, level: "red" as const, conclusion: "preliminary" as const, issues: [] as string[], bitrixCheckedAt: "", sheetCheckedAt: "" },
  };
}

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

export function calculateMetrics(deals: Deal[], sheets: SheetRange[], config: { wonStageIds: string[]; lostStageIds: string[]; amountColumnIndex: number; sourceTotal?: number }, funnelMeta: FunnelMeta[] = []): InvestmentMetrics {
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

  const command = sheetCommand(sheets);
  command.leadPulse.bitrixVisible = deals.filter(deal => [144,152].includes(Number(deal.categoryId))).length;
  const staleCount = funnels.reduce((sum, funnel) => sum + funnel.stale, 0);
  const issues: string[] = [];
  if (warnings.length) issues.push(...warnings);
  if (staleCount) issues.push(`${staleCount} карточек Bitrix без движения более 7 дней.`);
  if (!sheets.length || rows.length === 0) issues.push("Google-таблица не вернула данные для контрольного расчёта.");
  const incompleteBitrix = typeof config.sourceTotal === "number" && deals.length < config.sourceTotal;
  if (incompleteBitrix) issues.push(`Bitrix загружен не полностью: ${deals.length} из ${config.sourceTotal} карточек.`);
  const score = Math.max(0, 99 - warnings.length * 20 - (incompleteBitrix ? 25 : 0) - (!rows.length ? 35 : 0));
  command.reliability = {
    score,
    level: score >= 95 ? "green" : score >= 60 ? "yellow" : "red",
    conclusion: score >= 95 ? "confirmed" : "preliminary",
    issues: issues.slice(0, 5),
    bitrixCheckedAt: new Date().toISOString(),
    sheetCheckedAt: new Date().toISOString(),
  };
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
      ranges: sheets.map((sheet) => ({ range: sheet.range, rows: Math.max(0, sheet.rows.length - 1), columns: Math.max(0,...sheet.rows.map(row=>row.length)), cells: sheet.rows.reduce((sum,row)=>sum+row.filter(cell=>cell!==""&&cell!==null&&cell!==undefined).length,0) })),
    },
    funnels,
    bottlenecks,
    warnings,
    command,
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
    `Лиды: сегодня ${metrics.command.leadPulse.today} · 7 дней ${metrics.command.leadPulse.week} · месяц ${metrics.command.leadPulse.month} · MQL за 7 дней ${metrics.command.leadPulse.mqlWeek}`,
    ...(metrics.warnings.length ? ["⚠️ " + metrics.warnings.join(" ")] : []),
  ].join("\n");
}
