"use client";

import { useCallback, useEffect, useState } from "react";

type Metrics = {
  generatedAt: string;
  deals: { total: number; active: number; won: number; lost: number; pipelineValue: number; wonValue: number; conversionRate: number };
  sheets: { rowCount: number; ranges: Array<{ range: string; rows: number; columns:number; cells:number }> };
  funnels: Array<{ id: number; name: string; total: number; active: number; stale: number; value: number; stages: Array<{ id: string; name: string; deals: number; stale: number; value: number }> }>;
  bottlenecks: Array<{ severity: "high" | "medium"; funnel: string; stage: string; deals: number; staleDeals: number; staleRate: number; diagnosis: string; action: string }>;
};
type Deal = { id: number; title?: string; stageId?: string; opportunity?: number; currencyId?: string; updatedTime?: string };
type DealDetail = { deal: Deal; activities: Array<{ ID?: string; SUBJECT?: string; PROVIDER_TYPE_ID?: string; COMPLETED?: string; START_TIME?: string; FILES?: unknown[] }>; assessment: { probability: number; daysSilent: number; calls: number; meetings: number; recordings: number; pending: number; actions: string[] }; callAnalysisAvailable: boolean };

const number = new Intl.NumberFormat("ru-RU");
const formatAmount = (value: number) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: value >= 1_000_000 ? "KGS" : "USD", notation: "compact", maximumFractionDigits: 1 }).format(value);

export function RichDashboard({ userName, signOutPath }: { userName: string; signOutPath?: string }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedFunnel, setSelectedFunnel] = useState<number | null>(null);
  const [selectedStage, setSelectedStage] = useState("");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [dealDetail, setDealDetail] = useState<DealDetail | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/investment-agent/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ deliver: false }) });
      const data = await response.json() as { metrics?: Metrics; error?: string };
      if (!response.ok || !data.metrics) throw new Error(data.error || "Не удалось обновить данные.");
      setMetrics(data.metrics);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Не удалось обновить данные."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const maxFunnel = Math.max(1, ...(metrics?.funnels.map((funnel) => funnel.active) || [1]));
  const staleTotal = metrics?.funnels.reduce((sum, funnel) => sum + funnel.stale, 0) || 0;
  const funnel = metrics?.funnels.find((item) => item.id === selectedFunnel);
  const largestFunnel = metrics?.funnels.reduce((best, item) => item.active > best.active ? item : best, metrics.funnels[0]);
  const priority = metrics?.bottlenecks[0] || (largestFunnel ? { severity: "medium" as const, funnel: largestFunnel.name, stage: "Самая большая активная очередь", deals: largestFunnel.active, staleDeals: largestFunnel.active, staleRate: metrics?.deals.active ? Math.round(largestFunnel.active / metrics.deals.active * 100) : 0, diagnosis: "Даже без просрочки самая крупная очередь ограничивает скорость всей системы.", action: "Разобрать верхние сделки очереди, проверить следующий шаг и перераспределить нагрузку между менеджерами." } : null);
  async function openStage(categoryId: number, stageId: string) {
    setSelectedFunnel(categoryId); setSelectedStage(stageId); setDealDetail(null); setDrillLoading(true);
    const response = await fetch(`/api/investment-agent/deals?categoryId=${categoryId}&stageId=${encodeURIComponent(stageId)}`);
    const data = await response.json() as { deals?: Deal[] };
    setDeals(data.deals || []); setDrillLoading(false);
  }
  async function openDeal(id: number) {
    setDrillLoading(true);
    const response = await fetch("/api/investment-agent/deal", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
    const data = await response.json() as DealDetail;
    setDealDetail(data); setDrillLoading(false);
  }

  return <main className="rich-app">
    <aside className="rich-sidebar">
      <div className="rich-brand"><img src="/brand/rich-logo-gold.png" alt="R.I.C.H." /><div><strong>R.I.C.H.</strong><span>CONTROL CENTER</span></div></div>
      <nav className="rich-nav"><a className="active" href="#overview">Обзор</a><a href="#funnels">Воронки</a><a href="#bottlenecks">Узкие места</a><a href="#sources">Источники</a></nav>
      <div className="rich-source-state"><i /><div><span>ДАННЫЕ</span><strong>{error ? "ТРЕБУЮТ ВНИМАНИЯ" : loading ? "ОБНОВЛЯЮТСЯ" : "АКТУАЛЬНЫ"}</strong></div></div>
      <div className="rich-account"><span>{userName}</span>{signOutPath && <a href={signOutPath}>Выйти</a>}</div>
    </aside>
    <section className="rich-main">
      <header className="rich-header" id="overview"><div><span className="rich-kicker">ЕЖЕДНЕВНЫЙ КОНТРОЛЬ ИНВЕСТ-ОТДЕЛА</span><h1>Главное на сегодня</h1><p>{metrics ? `Обновлено ${new Date(metrics.generatedAt).toLocaleString("ru-RU")}` : "Bitrix24 · Google Sheets · аналитика R.I.C.H."}</p></div><button onClick={() => void refresh()} disabled={loading}>{loading ? "Обновляю…" : "Обновить данные"}</button></header>
      {error && <div className="rich-error"><strong>Не удалось загрузить живые данные</strong><span>{error}</span></div>}
      {loading && !metrics && <div className="rich-loading"><i /><span>Собираю сделки и ищу узкие места…</span></div>}
      {metrics && <>
        <section className="rich-kpis"><article><span>АКТИВНЫЕ СДЕЛКИ</span><strong>{number.format(metrics.deals.active)}</strong><small>из {number.format(metrics.deals.total)} в R.I.C.H.</small></article><article><span>АКТИВНЫЙ ПОРТФЕЛЬ</span><strong>{formatAmount(metrics.deals.pipelineValue)}</strong><small>миллионы — KGS · тысячи — USD</small></article><article><span>КОНВЕРСИЯ ЗАКРЫТИЙ</span><strong>{metrics.deals.conversionRate}%</strong><small>{metrics.deals.won} успешно · {metrics.deals.lost} отказ</small></article><article className={staleTotal ? "risk" : "good"}><span>БЕЗ ДВИЖЕНИЯ 7+ ДНЕЙ</span><strong>{number.format(staleTotal)}</strong><small>{staleTotal ? "требуют следующего шага" : "просрочек нет"}</small></article></section>
        <section className="rich-focus"><div><span>ВЫВОД КОНТРОЛЁРА</span><h2>Главное ограничение определено</h2><p>{priority ? `${priority.funnel}: ${priority.stage}. ${priority.diagnosis}` : "Требуется восстановить полноту данных, чтобы определить ограничение."}</p></div><div className="rich-focus-score"><strong>{staleTotal ? Math.max(0, 100 - Math.round(staleTotal / Math.max(1, metrics.deals.active) * 100)) : 82}</strong><span>ИНДЕКС ЗДОРОВЬЯ</span></div></section>
        <section className="rich-grid" id="funnels"><article className="rich-panel rich-funnels"><div className="panel-title"><div><span>КАРТА НАГРУЗКИ</span><h2>Воронки R.I.C.H.</h2></div><small>нажмите для детализации</small></div><div className="funnel-list">{metrics.funnels.map((funnel) => <button className="funnel-row" key={funnel.id} onClick={() => { setSelectedFunnel(funnel.id); setSelectedStage(""); setDeals([]); setDealDetail(null); }}><div><strong>{funnel.name.replace("R.I.C.H. ", "")}</strong><span>{funnel.stale} без движения</span></div><div className="bar"><i style={{ width: `${Math.max(2, funnel.active / maxFunnel * 100)}%` }} /></div><b>{number.format(funnel.active)} →</b></button>)}</div></article>
          <article className="rich-panel rich-priority" id="bottlenecks"><div className="panel-title"><div><span>ПРИОРИТЕТ №1</span><h2>Что расшить сегодня</h2></div></div>{priority && <><div className="priority-badge">{priority.severity === "high" ? "ВЫСОКИЙ РИСК" : "ТРЕБУЕТ ВНИМАНИЯ"}</div><h3>{priority.funnel}<br />→ {priority.stage}</h3><div className="priority-stats"><div><strong>{priority.staleDeals}</strong><span>в очереди</span></div><div><strong>{priority.staleRate}%</strong><span>потока</span></div></div><p>{priority.diagnosis}</p><div className="solution"><span>РЕШЕНИЕ</span>{priority.action}</div></>}</article></section>
        <section className="rich-panel rich-actions"><div className="panel-title"><div><span>ПЛАН ДЕЙСТВИЙ</span><h2>Рекомендации по устранению ограничений</h2></div><small>по приоритету</small></div><div className="action-list">{metrics.bottlenecks.slice(0, 5).map((item, index) => <article key={`${item.funnel}-${item.stage}`}><b>0{index + 1}</b><div><span>{item.funnel} · {item.stage}</span><h3>{item.diagnosis}</h3><p>{item.action}</p></div><strong>{item.staleDeals}<small> сделок</small></strong></article>)}</div></section>
        <section className="rich-panel rich-sources" id="sources"><div className="panel-title"><div><span>ПОЛНЫЙ РЕЕСТР ДАННЫХ</span><h2>Все листы и источники без фильтрации</h2></div></div><div className="source-cards"><div><i /><strong>Bitrix24</strong><span>{number.format(metrics.deals.total)} сделок · полная загрузка · только чтение</span></div>{metrics.sheets.ranges.map((range) => <div key={range.range}><i /><strong>{range.range.split("!")[0]}</strong><span>{number.format(range.rows)} строк · {number.format(range.columns)} колонок · {number.format(range.cells)} значений</span></div>)}</div></section>
        {funnel && <section className="rich-panel rich-drill"><div className="drill-head"><div><span>ГЛУБОКИЙ ПРОВАЛ</span><h2>{funnel.name}</h2><p>ЦКП → воронка → стадия → сделка → контакты</p></div><button onClick={() => { setSelectedFunnel(null); setDealDetail(null); }}>Закрыть</button></div>
          <div className="stage-grid">{funnel.stages.map((stage) => <button className={selectedStage === stage.id ? "selected" : ""} key={stage.id} onClick={() => void openStage(funnel.id, stage.id)}><span>{stage.name}</span><strong>{stage.deals}</strong><small>{stage.stale} без движения</small></button>)}</div>
          {drillLoading && <div className="drill-wait">Загружаю детали…</div>}
          {!drillLoading && selectedStage && <div className="deal-grid"><div className="deal-list"><h3>Сделки стадии</h3>{deals.map((deal) => <button key={deal.id} onClick={() => void openDeal(deal.id)}><div><strong>{deal.title || `Сделка №${deal.id}`}</strong><span>Обновлено {deal.updatedTime ? new Date(deal.updatedTime).toLocaleDateString("ru-RU") : "—"}</span></div><b>{deal.opportunity ? formatAmount(deal.opportunity) : "→"}</b></button>)}</div>
            {dealDetail && <article className="deal-insight"><div className="probability"><strong>{dealDetail.assessment.probability}%</strong><span>вероятность сделки</span></div><div className="signal-row"><span>{dealDetail.assessment.calls} звонков</span><span>{dealDetail.assessment.meetings} встреч</span><span>{dealDetail.assessment.recordings} записей</span><span>{dealDetail.assessment.pending} задач</span></div><h3>Подсказки по сделке</h3><ol>{dealDetail.assessment.actions.map((action) => <li key={action}>{action}</li>)}</ol><h3>Последние контакты</h3><div className="activity-list">{dealDetail.activities.slice(0, 8).map((activity) => <div key={activity.ID}><i className={activity.COMPLETED === "Y" ? "done" : ""} /><div><strong>{activity.SUBJECT || "Активность"}</strong><span>{activity.START_TIME ? new Date(activity.START_TIME).toLocaleString("ru-RU") : ""}</span></div>{Array.isArray(activity.FILES) && activity.FILES.length > 0 && <b>есть запись</b>}</div>)}</div><button className="analyze-call" disabled={!dealDetail.callAnalysisAvailable}>{dealDetail.callAnalysisAvailable ? "Анализировать записи звонков" : "Анализ звонков — подключить ключ ИИ"}</button></article>}
          </div>}
        </section>}
      </>}
    </section>
  </main>;
}
