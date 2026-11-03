import { QUESTIONS, configured } from "../../lib/quiz.js";

export async function onRequestGet({ env }) {
  let settings = null;
  try {
    if (env.QUIZ_RESULTS) settings = await env.QUIZ_RESULTS.get("config:q7", "json");
  } catch {
    // Ошибка настроек не должна блокировать загрузку вопросов.
  }
  return new Response(JSON.stringify({
    ready: Boolean(env.QUIZ_RESULTS),
    gradingReady: configured(settings),
    questions: QUESTIONS.map(({ id, title, options }) => ({ id, title, options }))
  }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
