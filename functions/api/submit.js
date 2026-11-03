import { QUESTIONS, correctIndex, configured } from "../../lib/quiz.js";

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });

export async function onRequestPost({ request, env }) {
  if (!env.QUIZ_RESULTS) {
    return json({ error: "Организатор ещё не подключил сохранение результатов." }, 503);
  }
  if (Number(request.headers.get("Content-Length")) > 6000) {
    return json({ error: "Слишком большой запрос." }, 413);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Не удалось прочитать ответы." }, 400);
  }
  if (!body || !Array.isArray(body.answers) || body.answers.length !== QUESTIONS.length) {
    return json({ error: "Нужно ответить на все восемь вопросов." }, 400);
  }

  const selected = new Map();
  for (const answer of body.answers) {
    if (!answer || typeof answer.id !== "string" ||
        !Number.isInteger(answer.choice) || selected.has(answer.id)) {
      return json({ error: "Ответы заполнены неверно." }, 400);
    }
    selected.set(answer.id, answer.choice);
  }
  const selectedAnswers = [];
  for (const question of QUESTIONS) {
    const choice = selected.get(question.id);
    if (!Number.isInteger(choice) || choice < 0 || choice >= question.options.length) {
      return json({ error: "Выбери по одному варианту ответа на каждый вопрос." }, 400);
    }
    selectedAnswers.push({ question, choice });
  }

  try {
    const settings = await env.QUIZ_RESULTS.get("config:q7", "json");
    if (!configured(settings)) {
      return json({ error: "Тест пока не готов: организатор должен указать правильный ответ на вопрос об отчестве." }, 503);
    }

    const answers = selectedAnswers.map(({ question, choice }) => {
      const correct = correctIndex(question, settings);
      return {
        id: question.id,
        question: question.title,
        selected: question.options[choice],
        correct: question.options[correct],
        isCorrect: choice === correct
      };
    });
    const correctCount = answers.filter(({ isCorrect }) => isCorrect).length;
    const won = correctCount === QUESTIONS.length;
    const id = crypto.randomUUID();
    const submittedAt = new Date().toISOString();
    const record = {
      id,
      name: "Любимая жена",
      submittedAt,
      won,
      correctCount,
      total: QUESTIONS.length,
      answers
    };
    const reverseTimestamp = String(9999999999999 - Date.now()).padStart(13, "0");
    await env.QUIZ_RESULTS.put("submission:" + reverseTimestamp + ":" + id, JSON.stringify(record));
    return json({ won, correctCount, total: QUESTIONS.length, submittedAt });
  } catch {
    return json({ error: "Не удалось сохранить ответы. Попробуй ещё раз." }, 503);
  }
}
