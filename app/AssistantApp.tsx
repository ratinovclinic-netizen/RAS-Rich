"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Message = { id: string; role: "user" | "assistant"; content: string };
type User = { name: string; email: string } | null;

const starters = [
  ["ПЛАН", "Составь план моего дня", "С учётом приоритетов и времени"],
  ["АНАЛИЗ", "Разбери сложный вопрос", "Коротко, точно и по существу"],
  ["ТЕКСТ", "Подготовь сообщение", "Письмо, пост или деловой ответ"],
  ["ИДЕИ", "Помоги принять решение", "Сравни варианты и риски"],
];

const initialMessage: Message = {
  id: "welcome",
  role: "assistant",
  content: "Системы готовы. Я могу планировать, анализировать, писать, объяснять и удерживать контекст разговора. С чего начнём?",
};

export function AssistantApp({ user, signInPath, signOutPath }: { user: User; signInPath: string; signOutPath: string }) {
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voice, setVoice] = useState(true);
  const [status, setStatus] = useState("ГОТОВ");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    fetch("/api/chat").then((response) => response.json()).then((data: { messages?: Message[] }) => {
      if (data.messages?.length) setMessages(data.messages);
    }).catch(() => undefined);
  }, [user]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    const next: Message[] = [...messages, { id: crypto.randomUUID(), role: "user", content: clean }];
    setMessages(next); setInput(""); setBusy(true); setStatus("ДУМАЮ");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-20) }),
      });
      const data = await response.json() as { message?: string; error?: string };
      const content = data.message || data.error || "Не удалось получить ответ.";
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content }]);
      if (voice && response.ok && "speechSynthesis" in window) {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(content);
        utterance.lang = "ru-RU"; utterance.rate = 1.02;
        speechSynthesis.speak(utterance);
      }
      setStatus(response.ok ? "ГОТОВ" : "НУЖНА НАСТРОЙКА");
    } catch {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: "Связь с сервером потеряна. Попробуйте ещё раз." }]);
      setStatus("НЕТ СВЯЗИ");
    } finally { setBusy(false); }
  }

  function submit(event: FormEvent) { event.preventDefault(); void send(input); }

  function listen() {
    const SpeechRecognition = (window as unknown as { webkitSpeechRecognition?: new () => { lang: string; interimResults: boolean; start(): void; onresult: (event: { results: { 0: { 0: { transcript: string } } }[] }) => void; onend: () => void; onerror: () => void } }).webkitSpeechRecognition;
    if (!SpeechRecognition) { setStatus("ГОЛОС НЕ ПОДДЕРЖИВАЕТСЯ"); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = "ru-RU"; recognition.interimResults = false;
    recognition.onresult = (event) => { const text = event.results[0][0].transcript; setInput(text); void send(text); };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => { setListening(false); setStatus("НЕ РАССЛЫШАЛ"); };
    setListening(true); setStatus("СЛУШАЮ"); recognition.start();
  }

  return (
    <main className="ark-shell">
      <aside className="side-panel">
        <div className="identity"><div className="mark">A</div><div><strong>A.R.K.</strong><span>ASSISTANT RESPONSE KERNEL</span></div></div>
        <div className="system-card"><div className="orb small"><i /></div><div><span>СИСТЕМА</span><strong>{status}</strong></div></div>
        <nav>
          <button className="nav-active"><span>⌁</span> Диалог</button>
          <button onClick={() => setMessages([initialMessage])}><span>＋</span> Новый сеанс</button>
          <button onClick={() => setVoice((v) => !v)}><span>{voice ? "◉" : "○"}</span> Голос {voice ? "включён" : "выключен"}</button>
        </nav>
        <div className="memory-card"><span>ПАМЯТЬ</span><strong>{user ? "Синхронизирована" : "Локальный сеанс"}</strong><p>{user ? "История привязана к вашему аккаунту." : "Войдите, чтобы личность и история были доступны на всех устройствах."}</p></div>
        <div className="account">
          <div className="avatar">{user?.name?.[0]?.toUpperCase() || "Г"}</div>
          <div><strong>{user?.name || "Гостевой режим"}</strong><a href={user ? signOutPath : signInPath}>{user ? "Выйти" : "Войти с ChatGPT"}</a></div>
        </div>
      </aside>

      <section className="workspace">
        <header><div><span className="eyebrow">ПЕРСОНАЛЬНЫЙ ИНТЕЛЛЕКТ</span><h1>Чем могу помочь?</h1></div><div className="secure"><i /> ЗАЩИЩЁННЫЙ СЕАНС</div></header>
        <div className="conversation">
          {messages.length === 1 && <div className="hero-orb"><div className="orb"><i /></div><p>Онлайн и готов к работе</p></div>}
          <div className="messages">
            {messages.map((message) => <article key={message.id} className={message.role}><span>{message.role === "assistant" ? "A.R.K." : "ВЫ"}</span><p>{message.content}</p></article>)}
            {busy && <article className="assistant thinking"><span>A.R.K.</span><p><b /><b /><b /></p></article>}
            <div ref={endRef} />
          </div>
          {messages.length === 1 && <div className="starters">{starters.map(([tag, title, copy]) => <button key={tag} onClick={() => void send(title)}><span>{tag}</span><strong>{title}</strong><small>{copy}</small><i>↗</i></button>)}</div>}
        </div>
        <form className="composer" onSubmit={submit}>
          <button type="button" className={`mic ${listening ? "live" : ""}`} onClick={listen} aria-label="Голосовой ввод">{listening ? "■" : "●"}</button>
          <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }} placeholder="Спросите что угодно…" rows={1} aria-label="Сообщение" />
          <button className="send" disabled={!input.trim() || busy} aria-label="Отправить">↑</button>
          <div className="composer-note">Enter — отправить · Shift+Enter — новая строка</div>
        </form>
      </section>
    </main>
  );
}
