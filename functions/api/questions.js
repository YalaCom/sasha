import { QUESTIONS, configured } from "../../lib/quiz.js";

export async function onRequestGet({ env }) {
  let configuration = null;
  try {
    if (env.QUIZ_RESULTS) configuration = await env.QUIZ_RESULTS.get("config:q7", "json");
  } catch {
    // Настройки недоступны — не обещаем, что тест можно завершить.
  }

  return new Response(JSON.stringify({
    ready: Boolean(env.QUIZ_RESULTS && configured(configuration)),
    questions: QUESTIONS.map(({ id, title, options }) => ({ id, title, options }))
  }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
