export async function sendTelegramMessage(token: string, chatId: string, text: string) {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  const payload = await response.json() as { ok?: boolean; description?: string; result?: { message_id?: number } };
  if (!response.ok || !payload.ok) throw new Error(payload.description || "Telegram не принял сообщение.");
  return payload.result?.message_id;
}
