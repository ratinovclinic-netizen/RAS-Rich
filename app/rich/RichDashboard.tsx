"use client";

import { useCallback, useEffect, useState } from "react";

type Metrics = {
  generatedAt: string;
  deals: { total: number; active: number; won: number; lost: number; pipelineValue: number; wonValue: number; conversionRate: number };
  sheets: { rowCount: number; ranges: Array<{ range: string; rows: number }> };
  funnels: Array<{ id: number; name: string; total: number; active: number; stale: number; value: number; stages: Array<{ id: string; name: string; deals: number; stale: number; value: number }> }>;
  bottlenecks: Array<{ severity: "high" | "medium"; funnel: string; stage: string; deals: number; staleDeals: number; staleRate: number; diagnosis: string; action: string }>;
};

const money = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", notation: "compact", maximumFractionDigits: 1 });
const number = new Intl.NumberFormat("ru-RU");

export function RichDashboard({ userName, signOutPath }: { userName: string; signOutPath: string }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
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

  return <main className="rich-app">
    <aside className="rich-sidebar">
      <div className="rich-brand"><img src="/brand/rich-logo-gold.png" alt="R.I.C.H." /><div><strong>R.I.C.H.</strong><span>CONTROL CENTER</span></div></div>
      <nav className="rich-nav"><a className="active" href="#overview">Обзор</a><a href="#funnels">Воронки</a><a href="#bottlenecks">Узкие места</a><a href="#sources">Источники</a></nav>
      <div className="rich-source-state"><i /><div><span>ДАННЫЕ</span><strong>{error ? "ТРЕБУЮТ ВНИМАНИЯ" : loading ? "ОБНОВЛЯЮТСЯ" : "АКТУАЛЬНЫ"}</strong></div></div>
      <div className="rich-account"><span>{userName}</span><a href={signOutPath}>Выйти</a></div>
    </aside>
    <section className="rich-main">
      <header className="rich-header" id="overview"><div><span className="rich-kicker">ЕЖЕДНЕВНЫЙ КОНТРОЛЬ ИНВЕСТ-ОТДЕЛА</span><h1>Главное на сегодня</h1><p>{metrics ? `Обновлено ${new Date(metrics.generatedAt).toLocaleString("ru-RU")}` : "Bitrix24 · Google Sheets · аналитика R.I.C.H."}</p></div><button onClick={() => void refresh()} disabled={loading}>{loading ? "Обновляю…" : "Обновить данные"}</button></header>
      {error && <div className="rich-error"><strong>Не удалось загрузить живые данные</strong><span>{error}</span></div>}
      {loading && !metrics && <div className="rich-loading"><i /><span>Собираю сделки и ищу узкие места…</span></div>}
      {metrics && <>
        <section className="rich-kpis"><article><span>АКТИВНЫЕ СДЕЛКИ</span><strong>{number.format(metrics.deals.active)}</strong><small>из {number.format(metrics.deals.total)} в R.I.C.H.</small></article><article><span>АКТИВНЫЙ ПОРТФЕЛЬ</span><strong>{money.format(metrics.deals.pipelineValue)}</strong><small>сумма открытых сделок</small></article><article><span>КОНВЕРСИЯ ЗАКРЫТИЙ</span><strong>{metrics.deals.conversionRate}%</strong><small>{metrics.deals.won} успешно · {metrics.deals.lost} отказ</small></article><article className={staleTotal ? "risk" : "good"}><span>БЕЗ ДВИЖЕНИЯ 7+ ДНЕЙ</span><strong>{number.format(staleTotal)}</strong><small>{staleTotal ? "требуют следующего шага" : "просрочек нет"}</small></article></section>
        <section className="rich-focus"><div><span>ВЫВОД КОНТРОЛЁРА</span><h2>{metrics.bottlenecks.length ? `Обнаружено ${metrics.bottlenecks.length} приоритетных узких мест` : "Критических узких мест не обнаружено"}</h2><p>{metrics.bottlenecks.length ? `Главный резерв роста — разобрать ${metrics.bottlenecks[0].staleDeals} залежавшихся сделок на стадии «${metrics.bottlenecks[0].stage}» в ${metrics.bottlenecks[0].funnel}.` : "Продолжайте контролировать скорость первого контакта и соблюдение следующего шага."}</p></div><div className="rich-focus-score"><strong>{staleTotal ? Math.max(0, 100 - Math.round(staleTotal / Math.max(1, metrics.deals.active) * 100)) : 100}</strong><span>ИНДЕКС ЗДОРОВЬЯ</span></div></section>
        <section className="rich-grid" id="funnels"><article className="rich-panel rich-funnels"><div className="panel-title"><div><span>КАРТА НАГРУЗКИ</span><h2>Воронки R.I.C.H.</h2></div><small>активные сделки</small></div><div className="funnel-list">{metrics.funnels.map((funnel) => <div className="funnel-row" key={funnel.id}><div><strong>{funnel.name.replace("R.I.C.H. ", "")}</strong><span>{funnel.stale} без движения</span></div><div className="bar"><i style={{ width: `${Math.max(2, funnel.active / maxFunnel * 100)}%` }} /></div><b>{number.format(funnel.active)}</b></div>)}</div></article>
          <article className="rich-panel rich-priority" id="bottlenecks"><div className="panel-title"><div><span>ПРИОРИТЕТ №1</span><h2>Что расшить сегодня</h2></div></div>{metrics.bottlenecks[0] ? <><div className="priority-badge">{metrics.bottlenecks[0].severity === "high" ? "ВЫСОКИЙ РИСК" : "ТРЕБУЕТ ВНИМАНИЯ"}</div><h3>{metrics.bottlenecks[0].funnel}<br />→ {metrics.bottlenecks[0].stage}</h3><div className="priority-stats"><div><strong>{metrics.bottlenecks[0].staleDeals}</strong><span>залежалось</span></div><div><strong>{metrics.bottlenecks[0].staleRate}%</strong><span>стадии</span></div></div><p>{metrics.bottlenecks[0].diagnosis}</p><div className="solution"><span>РЕШЕНИЕ</span>{metrics.bottlenecks[0].action}</div></> : <p>Очередей с критичной долей просроченных сделок сейчас нет.</p>}</article></section>
        <section className="rich-panel rich-actions"><div className="panel-title"><div><span>ПЛАН ДЕЙСТВИЙ</span><h2>Рекомендации по устранению ограничений</h2></div><small>по приоритету</small></div><div className="action-list">{metrics.bottlenecks.slice(0, 5).map((item, index) => <article key={`${item.funnel}-${item.stage}`}><b>0{index + 1}</b><div><span>{item.funnel} · {item.stage}</span><h3>{item.diagnosis}</h3><p>{item.action}</p></div><strong>{item.staleDeals}<small> сделок</small></strong></article>)}</div></section>
        <section className="rich-panel rich-sources" id="sources"><div className="panel-title"><div><span>КОНТРОЛЬ ИСТОЧНИКОВ</span><h2>Свежесть данных</h2></div></div><div className="source-cards"><div><i /><strong>Bitrix24</strong><span>{number.format(metrics.deals.total)} сделок · только чтение</span></div>{metrics.sheets.ranges.map((range) => <div key={range.range}><i /><strong>{range.range.split("!")[0]}</strong><span>{number.format(range.rows)} строк</span></div>)}</div></section>
      </>}
    </section>
  </main>;
}
