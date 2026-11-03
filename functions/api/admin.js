const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, private",
  "X-Content-Type-Options": "nosniff"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}

// Сравнение занимает одинаковое количество шагов для верного и неверного значения.
function safeEqual(a, b) {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  let difference = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    difference |= (left[i] || 0) ^ (right[i] || 0);
  }
  return difference === 0;
}

export async function onRequestPost({ request, env }) {
  if (!env.QUIZ_RESULTS || typeof env.ADMIN_PASSWORD !== "string" || env.ADMIN_PASSWORD.length < 12) {
    return json({ error: "Админка ещё не настроена в Cloudflare (QUIZ_RESULTS и ADMIN_PASSWORD от 12 символов)." }, 503);
  }
  const size = Number(request.headers.get("Content-Length") || 0);
  if (size > 2000) return json({ error: "Некорректный запрос." }, 413);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Некорректные данные." }, 400);
  }
  const password = body && body.password;
  if (typeof password !== "string" || password.length > 256 || !safeEqual(password, env.ADMIN_PASSWORD)) {
    return json({ error: "Неверный пароль." }, 401);
  }

  try {
    const list = await env.QUIZ_RESULTS.list({ prefix: "submission:", limit: 100 });
    const records = await Promise.all(list.keys.map((key) => env.QUIZ_RESULTS.get(key.name, "json")));
    return json({ submissions: records.filter((record) => record && typeof record === "object") });
  } catch {
    return json({ error: "Ошибка чтения сохранённых ответов." }, 503);
  }
}