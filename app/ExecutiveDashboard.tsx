"use client";

import { useEffect, useState } from "react";

type Command = {
  period:string;
  conversions:Array<{label:string;from:number;to:number;rate:number;planRate?:number}>;
  money:{received:number;expected:number;currency:"USD";receivedKgs:number;expectedKgs:number};
  planFact:{plan:number;fact:number;variance:number;varianceRate:number;forecast:number;completion:number};
  managers:Array<{name:string;leads:number;qualified:number;meetings:number;deals:number;revenue:number;efficiency:number}>;
  leadPulse:{today:number;week:number;month:number;mqlWeek:number;meetingsWeek:number;dealsWeek:number;bitrixVisible:number;checkedDate:string};
  sources:Array<{name:string;state:"ok"|"warn";detail:string}>;
  efficiency:number;
  reliability:{score:number;level:"green"|"yellow"|"red";conclusion:"confirmed"|"preliminary";issues:string[];bitrixCheckedAt:string;sheetCheckedAt:string};
};
type Metrics={generatedAt:string;deals:{total:number;active:number};command:Command;bottlenecks:Array<{funnel:string;stage:string;staleDeals:number;staleRate:number;diagnosis:string;action:string}>};
const number=new Intl.NumberFormat("ru-RU");
const usd=new Intl.NumberFormat("ru-RU",{style:"currency",currency:"USD",maximumFractionDigits:0});
const kgs=new Intl.NumberFormat("ru-RU",{style:"currency",currency:"KGS",maximumFractionDigits:0});

function managementReport(period:"week"|"month",c:Command,bottleneck:string,action:string){
  const weekly=period==="week";const leads=weekly?c.leadPulse.week:c.leadPulse.month;const mql=weekly?c.leadPulse.mqlWeek:c.conversions[0]?.to||0;const meetings=weekly?c.leadPulse.meetingsWeek:c.conversions[1]?.to||0;const deals=weekly?c.leadPulse.dealsWeek:c.conversions[2]?.to||0;
  const pct=(a:number,b:number)=>b?Math.round(a/b*1000)/10:0;const title=weekly?"НЕДЕЛЮ":"МЕСЯЦ";
  return `ОТЧЁТ РУКОВОДИТЕЛЯ ЗА ${title}\n\n1. Результат\nЛиды: ${number.format(leads)}. Качественные лиды: ${number.format(mql)}. Встречи: ${number.format(meetings)}. Сделки: ${number.format(deals)}. Поступило: ${usd.format(c.money.received)}. Выполнение плана: ${c.planFact.completion}%.\n\n2. Эффективность воронки\nЛид → качественный лид: ${pct(mql,leads)}%. Качественный лид → встреча: ${pct(meetings,mql)}%. Встреча → сделка: ${pct(deals,meetings)}%. Индекс отдела: ${c.efficiency}/100.\n\n3. Главное ограничение\n${bottleneck}. Это точка, которая сейчас сильнее всего ограничивает общий результат.\n\n4. Управленческий вывод\n${c.planFact.completion>=100?"План выполняется, но контроль конверсий и скорости обработки нельзя ослаблять.":`Отставание от плана составляет ${Math.abs(c.planFact.varianceRate)}%. Нужна ежедневная работа с причиной, а не только с итоговой цифрой.`}\n\n5. Решение\n${action}\nОтветственный: руководитель инвест-отдела. Срок первого контроля: 24 часа.\n\n6. Следующая контрольная точка\nПроверить изменение конверсии, просроченные карточки и расхождение Google Sheets с оперативным срезом Bitrix. Достоверность данных: ${c.reliability.score}%.`;
}

export function ExecutiveDashboard({userName,signOutPath}:{userName:string;signOutPath?:string}){
  const [data,setData]=useState<Metrics|null>(null);const [error,setError]=useState("");const [refreshing,setRefreshing]=useState(false);
  const [reportPeriod,setReportPeriod]=useState<"week"|"month">("week");const [reportOpen,setReportOpen]=useState(false);
  const load=()=>{setRefreshing(true);setError("");fetch("/api/investment-agent/run",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({deliver:false})}).then(async r=>{const j=await r.json();if(!r.ok)throw new Error(j.error);setData(j.metrics)}).catch(e=>setError(e.message||"Ошибка загрузки")).finally(()=>setRefreshing(false))};
  useEffect(load,[]);
  if(!data)return <main className="exec-loading"><div className="exec-mark">R</div><strong>{error||"Сверяю Bitrix24 и Google Sheets…"}</strong></main>;
  const c=data.command;const weakest=[...c.conversions].sort((a,b)=>a.rate-b.rate)[0];const top=data.bottlenecks[0];
  const bottleneck=top?`${top.funnel}: ${top.stage}`:`${weakest.label} — самая низкая конверсия ${weakest.rate}%`;
  return <main className="exec-shell">
    <header className="exec-top"><div className="exec-brand"><div className="exec-mark">R</div><div><b>R.I.C.H.</b><small>INVESTMENT INTELLIGENCE</small></div></div><div className="exec-crumb">Командный центр <span>/ Инвестиционный отдел</span></div><div className={`exec-trust ${c.reliability.level}`}><i/>{c.reliability.score}% · {c.reliability.conclusion==="confirmed"?"данные подтверждены":"выводы предварительные"}</div><div className="exec-user">{userName}{signOutPath&&<a href={signOutPath}>Выйти</a>}</div></header>
    <section className="exec-main">
      <div className="exec-title"><div><span className="exec-overline">{c.period} · ОБНОВЛЕНО {new Date(data.generatedAt).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})}</span><h1>Главное за сегодня</h1><p>Деньги, сквозные конверсии, эффективность команды и контроль качества данных</p></div><button onClick={load} disabled={refreshing}>{refreshing?"Сверяю…":"Обновить данные"}</button></div>
      <section className="exec-kpis exec-kpis-money">
        <article><span>УЖЕ ЗАШЛО</span><strong>{usd.format(c.money.received)}</strong><small>{c.money.receivedKgs?kgs.format(c.money.receivedKgs):"USD · факт из таблицы"}</small></article>
        <article><span>ОЖИДАЕМ</span><strong>{usd.format(c.money.expected)}</strong><small>{c.money.expectedKgs?kgs.format(c.money.expectedKgs):"прогноз текущего месяца"}</small></article>
        <article className={c.planFact.completion<80?"danger":"good"}><span>ПЛАН / ФАКТ</span><strong>{c.planFact.completion}%</strong><small>{usd.format(c.planFact.fact)} из {usd.format(c.planFact.plan)}</small></article>
        <article><span>ЭФФЕКТИВНОСТЬ ОТДЕЛА</span><strong>{c.efficiency}/100</strong><small>{c.planFact.varianceRate>=0?"выше":"отставание"} от плана: {Math.abs(c.planFact.varianceRate)}%</small></article>
      </section>
      <article className="exec-card" style={{marginBottom:24}}><div className="exec-cardhead"><div><span className="exec-overline">ЕЖЕДНЕВНЫЙ ПУЛЬС ЛИДОВ · {c.leadPulse.checkedDate}</span><h3>Новые лиды из дневной сводки</h3></div><a href="https://docs.google.com/spreadsheets/d/1mGO5bZcJMqqNrRFD2ljeW3h0pbWA0H791_O5A4pAgEg/edit?usp=sharing" target="_blank" rel="noreferrer">Открыть таблицу →</a></div><div className="exec-numbers" style={{gridTemplateColumns:"repeat(5,minmax(0,1fr))"}}><div><strong>{c.leadPulse.today}</strong><span>сегодня</span></div><div><strong>{c.leadPulse.week}</strong><span>7 дней</span></div><div><strong>{c.leadPulse.month}</strong><span>месяц</span></div><div><strong>{c.leadPulse.mqlWeek}</strong><span>MQL за 7 дней</span></div><div><strong>{c.leadPulse.bitrixVisible}</strong><span>видно в срезе Bitrix</span></div></div><p className="daily-note">Google Sheets — твёрдый управленческий факт. Bitrix — оперативный контроль карточек; расхождения подсвечиваются в блоке надёжности.</p></article>
      <section className="exec-grid exec-grid-wide">
        <article className="exec-card exec-conversions"><div className="exec-cardhead"><div><em>СКВОЗНАЯ ВОРОНКА</em><h3>Все ключевые конверсии</h3></div><a href="/rich#funnels">В глубину →</a></div>{c.conversions.map((item,i)=><div className="conversion-row" key={item.label}><b>0{i+1}</b><div><strong>{item.label}</strong><span>{number.format(item.from)} → {number.format(item.to)} · ориентир {item.planRate}%</span><i><u style={{width:`${Math.min(100,item.rate)}%`}}/></i></div><em className={item.rate<(item.planRate||0)?"bad":"ok"}>{item.rate}%</em></div>)}</article>
        <article className="exec-card exec-alert"><div className="exec-cardhead"><em>ГЛАВНОЕ УЗКОЕ МЕСТО</em><a href="/rich#bottlenecks">Разобрать →</a></div><h2>{bottleneck}</h2><p>{top?.diagnosis||"Здесь теряется наибольшая доля потока текущего месяца."}</p><div className="exec-numbers"><div><strong>{top?.staleDeals||weakest.from-weakest.to}</strong><span>потеря / очередь</span></div><div><strong>{top?.staleRate||100-weakest.rate}%</strong><span>разрыв</span></div></div><div className="exec-solution"><span>РЕШЕНИЕ</span>{top?.action||"Разобрать непройденные карточки по менеджерам, закрепить следующий шаг и ежедневный SLA контроля."}</div></article>
      </section>
      <section className="exec-bottom exec-bottom-managers">
        <article className="exec-card"><div className="exec-cardhead"><div><span className="exec-overline">КОМАНДА</span><h3>Показатели всех менеджеров</h3></div><a href="/rich">Карточки →</a></div><div className="manager-table"><div className="manager-head"><span>Менеджер</span><span>Лиды</span><span>Квалиф.</span><span>Встречи</span><span>Сделки</span><span>Поступило</span><span>Индекс</span></div>{c.managers.map((m,i)=><div className="manager-row" key={m.name}><strong>{m.name}</strong><span>{m.leads}</span><span>{m.qualified}</span><span>{m.meetings}</span><span>{m.deals}</span><span>{usd.format(m.revenue)}</span><em className={m.efficiency<60?"bad":"ok"}>{m.efficiency}</em></div>)}</div></article>
        <article className="exec-card"><div className="exec-cardhead"><div><span className="exec-overline">НАДЁЖНОСТЬ</span><h3>Контроль источников</h3></div><strong className={`trust-score ${c.reliability.level}`}>{c.reliability.score}%</strong></div><div className="source-stack">{c.sources.map(s=><div key={s.name}><i className={s.state}/><p><strong>{s.name}</strong><span>{s.detail}</span></p><b>{s.state==="ok"?"ПРОВЕРЕН":"КОНТРОЛЬ"}</b></div>)}</div>{c.reliability.issues.length?<div className="data-issues"><span>ТРЕБУЕТ ВНИМАНИЯ</span>{c.reliability.issues.map(issue=><p key={issue}>• {issue}</p>)}</div>:<p className="daily-note">Расхождений и критичных пропусков не найдено. Управленческие выводы подтверждены.</p>}</article>
      </section>
      <article className="exec-card" style={{marginTop:24,marginBottom:36}}><div className="exec-cardhead"><div><span className="exec-overline">РУКА НА ПУЛЬСЕ</span><h3>Управленческий отчёт с выводами и решениями</h3></div><div style={{display:"flex",gap:8}}><button onClick={()=>{setReportPeriod("week");setReportOpen(true)}}>За неделю</button><button onClick={()=>{setReportPeriod("month");setReportOpen(true)}}>За месяц</button></div></div><p className="daily-note">Собирает показатели по циклу: План → Факт → Отклонение → Причина → Решение → Ответственный → Срок.</p>{reportOpen&&<div className="exec-solution" style={{whiteSpace:"pre-wrap",lineHeight:1.65,marginTop:18}}>{managementReport(reportPeriod,c,bottleneck,top?.action||"Провести разбор карточек без следующего шага и закрепить ежедневный SLA контроля.")}</div>}</article>
    </section>
  </main>
}
