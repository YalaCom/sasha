import { QUESTIONS, configured } from "../../lib/quiz.js";

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, private",
  "X-Content-Type-Options": "nosniff"
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });

function safeEqual(a, b) {
  const enc = new TextEncoder();
  const one = enc.encode(a);
  const two = enc.encode(b);
  let diff = one.length ^ two.length;
  for (let i = 0; i < Math.max(one.length, two.length); i++) {
    diff |= (one[i] || 0) ^ (two[i] || 0);
  }
  return diff === 0;
}

async function authorize(request, env) {
  if (!env.QUIZ_RESULTS || typeof env.ADMIN_PASSWORD !== "string" || env.ADMIN_PASSWORD.length < 12) {
    return { error: "Сначала настрой QUIZ_RESULTS и ADMIN_PASSWORD (не менее 12 символов) в Cloudflare.", status: 503 };
  }
  if (Number(request.headers.get("Content-Length")) > 2000) {
    return { error: "Слишком большой запрос.", status: 413 };
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return { error: "Некорректные данные.", status: 400 };
  }
  if (typeof body?.password !== "string" || body.password.length > 256 ||
      !safeEqual(body.password, env.ADMIN_PASSWORD)) {
    return { error: "Неверный пароль.", status: 401 };
  }
  return { body };
}

export async function onRequestPost({ request, env }) {
  const auth = await authorize(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);

  try {
    const [list, settings] = await Promise.all([
      env.QUIZ_RESULTS.list({ prefix: "submission:", limit: 100 }),
      env.QUIZ_RESULTS.get("config:q7", "json")
    ]);
    const submissions = (await Promise.all(
      list.keys.map((item) => env.QUIZ_RESULTS.get(item.name, "json"))
    )).filter(Boolean);
    return json({
      submissions,
      questionCount: QUESTIONS.length,
      q7Choice: configured(settings) ? settings.choice : null,
      q7Options: QUESTIONS.find(({ id }) => id === "q7").options
    });
  } catch {
    return json({ error: "Не удалось загрузить ответы из Cloudflare KV." }, 503);
  }
}

export async function onRequestPut({ request, env }) {
  const auth = await authorize(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  const choice = auth.body.q7Choice;
  const options = QUESTIONS.find(({ id }) => id === "q7").options;
  if (!Number.isInteger(choice) || choice < 0 || choice >= options.length) {
    return json({ error: "Выбери правильный вариант отчества." }, 400);
  }

  try {
    await env.QUIZ_RESULTS.put("config:q7", JSON.stringify({ choice }));
    return json({ saved: true, q7Choice: choice });
  } catch {
    return json({ error: "Не получилось сохранить правильный ответ." }, 503);
  }
}
