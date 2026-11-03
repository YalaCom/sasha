import { QUESTIONS } from "../../lib/quiz.js";

export async function onRequestGet() {
  return new Response(JSON.stringify({
    questions: QUESTIONS.map((q) => ({ id: q.id, title: q.title, options: q.options }))
  }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}