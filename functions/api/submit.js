import { QUESTIONS, correctIndex } from "../../lib/quiz.js";

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}

export async function onRequestPost({ request, env }) {
  if (!env.QUIZ_RESULTS) {
    return json({ error: "Хранилище ответов пока не подключено. Обратись к организатору." }, 503);
  }
  const size = Number(request.headers.get("Content-Length") || 0);
  if (size > 6000) return json({ error: "Слишком большой запрос." }, 413);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Некорректные данные." }, 400);
  }
  if (!body || typeof body !== "object" || !Array.isArray(body.answers) || body.answers.length !== QUESTIONS.length) {
    return json({ error: "Ответь на все вопросы." }, 400);
  }
  if (typeof body.name !== "string" || body.name.length > 40) {
    return json({ error: "Некорректное имя." }, 400);
  }

  const ids = new Set();
  const selections = new Map();
  for (const answer of body.answers) {
    if (!answer || typeof answer.id !== "string" || !Number.isInteger(answer.choice) || ids.has(answer.id)) {
      return json({ error: "Некорректные ответы." }, 400);
    }
    ids.add(answer.id);
    selections.set(answer.id, answer.choice);
  }
  const recorded = [];
  for (const question of QUESTIONS) {
    const choice = selections.get(question.id);
    if (!Number.isInteger(choice) || choice < 0 || choice >= question.options.length) {
      return json({ error: "Выбери вариант для каждого вопроса." }, 400);
    }
    let right;
    try {
      right = correctIndex(question, env);
    } catch {
      return json({ error: "Игра пока не настроена. Обратись к организатору." }, 503);
    }
    recorded.push({
      question: question.title,
      selected: question.options[choice],
      correct: question.options[right],
      isCorrect: choice === right
    });
  }

  const correctCount = recorded.filter((answer) => answer.isCorrect).length;
  const won = correctCount === QUESTIONS.length;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const name = body.name.trim().slice(0, 40) || "Любимая";
  const submission = {
    id,
    name,
    submittedAt: now,
    won,
    correctCount,
    total: QUESTIONS.length,
    answers: recorded
  };

  // Обратная дата делает список KV отсортированным от новых попыток к старым.
  const inverseTimestamp = String(9999999999999 - Date.now()).padStart(13, "0");
  try {
    await env.QUIZ_RESULTS.put("submission:" + inverseTimestamp + ":" + id, JSON.stringify(submission));
  } catch {
    return json({ error: "Не удалось сохранить ответы. Попробуй ещё раз." }, 503);
  }

  return json({ won, correctCount, total: QUESTIONS.length, id });
}