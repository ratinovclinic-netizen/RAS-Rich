type GoogleTokenResponse = { access_token?: string; error_description?: string };
type GoogleBatchResponse = { valueRanges?: Array<{ range?: string; values?: unknown[][] }> };

function base64Url(value: string | ArrayBuffer): string {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemBytes(pem: string): Uint8Array {
  const body = pem.replace(/\\n/g, "\n").replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const binary = atob(body);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function accessToken(clientEmail: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(JSON.stringify({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claims}`;
  const key = await crypto.subtle.importKey("pkcs8", pemBytes(privateKey), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const assertion = `${unsigned}.${base64Url(signature)}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const payload = await response.json() as GoogleTokenResponse;
  if (!response.ok || !payload.access_token) throw new Error(payload.error_description || "Google не выдал токен доступа.");
  return payload.access_token;
}

export async function readGoogleRanges(input: { clientEmail: string; privateKey: string; spreadsheetId: string; ranges: string[] }) {
  const token = await accessToken(input.clientEmail, input.privateKey);
  const query = new URLSearchParams();
  for (const range of input.ranges) query.append("ranges", range);
  query.set("majorDimension", "ROWS");
  query.set("valueRenderOption", "UNFORMATTED_VALUE");
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(input.spreadsheetId)}/values:batchGet?${query}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const payload = await response.json() as GoogleBatchResponse & { error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message || "Не удалось прочитать Google Sheets.");
  return (payload.valueRanges || []).map((item, index) => ({ range: item.range || input.ranges[index], rows: item.values || [] }));
}

function parseCsv(csv: string): unknown[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    if (char === '"') {
      if (quoted && csv[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell); cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && csv[index + 1] === "\n") index += 1;
      row.push(cell); cell = "";
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
    } else cell += char;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export async function readPublicGoogleSheets(spreadsheetId: string, ranges: string[]) {
  return Promise.all(ranges.map(async (range) => {
    const sheet = range.split("!")[0];
    const query = new URLSearchParams({ tqx: "out:csv", sheet });
    const response = await fetch(`https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/gviz/tq?${query}`);
    if (!response.ok) throw new Error(`Не удалось прочитать лист «${sheet}» по ссылке.`);
    return { range, rows: parseCsv(await response.text()) };
  }));
}
