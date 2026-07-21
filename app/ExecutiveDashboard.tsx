"use client";

import { useEffect, useState } from "react";

type Command = {
  period:string;
  conversions:Array<{label:string;from:number;to:number;rate:number;planRate?:number}>;
  money:{received:number;expected:number;currency:"USD";receivedKgs:number;expectedKgs:number};
  planFact:{plan:number;fact:number;variance:number;varianceRate:number;forecast:number;completion:number};
  managers:Array<{name:string;leads:number;qualified:number;meetings:number;deals:number;revenue:number;efficiency:number}>;
  sources:Array<{name:string;state:"ok"|"warn";detail:string}>;
  efficiency:number;
};
type Metrics={generatedAt:string;deals:{total:number;active:number};command:Command;bottlenecks:Array<{funnel:string;stage:string;staleDeals:number;staleRate:number;diagnosis:string;action:string}>};
const number=new Intl.NumberFormat("ru-RU");
const usd=new Intl.NumberFormat("ru-RU",{style:"currency",currency:"USD",maximumFractionDigits:0});
const kgs=new Intl.NumberFormat("ru-RU",{style:"currency",currency:"KGS",maximumFractionDigits:0});

export function ExecutiveDashboard({userName,signOutPath}:{userName:string;signOutPath:string}){
  const [data,setData]=useState<Metrics|null>(null);const [error,setError]=useState("");const [refreshing,setRefreshing]=useState(false);
  const load=()=>{setRefreshing(true);setError("");fetch("/api/investment-agent/run",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({deliver:false})}).then(async r=>{const j=await r.json();if(!r.ok)throw new Error(j.error);setData(j.metrics)}).catch(e=>setError(e.message||"Ошибка загрузки")).finally(()=>setRefreshing(false))};
  useEffect(load,[]);
  if(!data)return <main className="exec-loading"><div className="exec-mark">R</div><strong>{error||"Сверяю Bitrix24 и Google Sheets…"}</strong></main>;
  const c=data.command;const weakest=[...c.conversions].sort((a,b)=>a.rate-b.rate)[0];const top=data.bottlenecks[0];
  const bottleneck=top?`${top.funnel}: ${top.stage}`:`${weakest.label} — самая низкая конверсия ${weakest.rate}%`;
  return <main className="exec-shell">
    <header className="exec-top"><div className="exec-brand"><div className="exec-mark">R</div><div><b>R.I.C.H.</b><small>INVESTMENT INTELLIGENCE</small></div></div><div className="exec-crumb">Командный центр <span>/ Инвестиционный отдел</span></div><div className="exec-live"><i/>Bitrix + таблица подключены</div><div className="exec-user">{userName}<a href={signOutPath}>Выйти</a></div></header>
    <section className="exec-main">
      <div className="exec-title"><div><span className="exec-overline">{c.period} · ОБНОВЛЕНО {new Date(data.generatedAt).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})}</span><h1>Главное за сегодня</h1><p>Деньги, сквозные конверсии, эффективность команды и контроль качества данных</p></div><button onClick={load} disabled={refreshing}>{refreshing?"Сверяю…":"Обновить данные"}</button></div>
      <section className="exec-kpis exec-kpis-money">
        <article><span>УЖЕ ЗАШЛО</span><strong>{usd.format(c.money.received)}</strong><small>{c.money.receivedKgs?kgs.format(c.money.receivedKgs):"USD · факт из таблицы"}</small></article>
        <article><span>ОЖИДАЕМ</span><strong>{usd.format(c.money.expected)}</strong><small>{c.money.expectedKgs?kgs.format(c.money.expectedKgs):"прогноз текущего месяца"}</small></article>
        <article className={c.planFact.completion<80?"danger":"good"}><span>ПЛАН / ФАКТ</span><strong>{c.planFact.completion}%</strong><small>{usd.format(c.planFact.fact)} из {usd.format(c.planFact.plan)}</small></article>
        <article><span>ЭФФЕКТИВНОСТЬ ОТДЕЛА</span><strong>{c.efficiency}/100</strong><small>{c.planFact.varianceRate>=0?"выше":"отставание"} от плана: {Math.abs(c.planFact.varianceRate)}%</small></article>
      </section>
      <section className="exec-grid exec-grid-wide">
        <article className="exec-card exec-conversions"><div className="exec-cardhead"><div><em>СКВОЗНАЯ ВОРОНКА</em><h3>Все ключевые конверсии</h3></div><a href="/rich#funnels">В глубину →</a></div>{c.conversions.map((item,i)=><div className="conversion-row" key={item.label}><b>0{i+1}</b><div><strong>{item.label}</strong><span>{number.format(item.from)} → {number.format(item.to)} · ориентир {item.planRate}%</span><i><u style={{width:`${Math.min(100,item.rate)}%`}}/></i></div><em className={item.rate<(item.planRate||0)?"bad":"ok"}>{item.rate}%</em></div>)}</article>
        <article className="exec-card exec-alert"><div className="exec-cardhead"><em>ГЛАВНОЕ УЗКОЕ МЕСТО</em><a href="/rich#bottlenecks">Разобрать →</a></div><h2>{bottleneck}</h2><p>{top?.diagnosis||"Здесь теряется наибольшая доля потока текущего месяца."}</p><div className="exec-numbers"><div><strong>{top?.staleDeals||weakest.from-weakest.to}</strong><span>потеря / очередь</span></div><div><strong>{top?.staleRate||100-weakest.rate}%</strong><span>разрыв</span></div></div><div className="exec-solution"><span>РЕШЕНИЕ</span>{top?.action||"Разобрать непройденные карточки по менеджерам, закрепить следующий шаг и ежедневный SLA контроля."}</div></article>
      </section>
      <section className="exec-bottom exec-bottom-managers">
        <article className="exec-card"><div className="exec-cardhead"><div><span className="exec-overline">КОМАНДА</span><h3>Показатели всех менеджеров</h3></div><a href="/rich">Карточки →</a></div><div className="manager-table"><div className="manager-head"><span>Менеджер</span><span>Лиды</span><span>Квалиф.</span><span>Встречи</span><span>Сделки</span><span>Поступило</span><span>Индекс</span></div>{c.managers.map((m,i)=><div className="manager-row" key={m.name}><strong>{m.name}</strong><span>{m.leads}</span><span>{m.qualified}</span><span>{m.meetings}</span><span>{m.deals}</span><span>{usd.format(m.revenue)}</span><em className={m.efficiency<60?"bad":"ok"}>{m.efficiency}</em></div>)}</div></article>
        <article className="exec-card"><div className="exec-cardhead"><div><span className="exec-overline">НАДЁЖНОСТЬ</span><h3>Контроль источников</h3></div></div><div className="source-stack">{c.sources.map(s=><div key={s.name}><i className={s.state}/><p><strong>{s.name}</strong><span>{s.detail}</span></p><b>{s.state==="ok"?"АКТУАЛЬНО":"КОНТРОЛЬ"}</b></div>)}</div><p className="daily-note">Ежедневная сверка подсвечивает расхождения, пропущенные поля и карточки без движения. Даже при чистых данных система показывает самое слабое звено.</p></article>
      </section>
    </section>
  </main>
}
