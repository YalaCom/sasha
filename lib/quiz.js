// ДЕМОНСТРАЦИОННЫЕ ВОПРОСЫ: перед настоящей игрой замени на свои.
// Для секретных ответов укажи правильные индексы в Cloudflare Secret QUIZ_ANSWERS:
// {"q1":0,"q2":1,"q3":1,"q4":0}
export const QUESTIONS = [
  {
    id: "q1",
    title: "Какой главный приз ждёт тебя сегодня?",
    options: ["Маникюр за мой счёт 💅", "Пачка макарон", "Новый будильник"],
    correct: 0
  },
  {
    id: "q2",
    title: "Кто здесь самая главная героиня?",
    options: ["Наш сосед", "Ты, конечно! ❤️", "Человек-паук"],
    correct: 1
  },
  {
    id: "q3",
    title: "Что нужно для победы в этой игре?",
    options: ["Угадать один ответ", "Ответить правильно на всё", "Просто закрыть сайт"],
    correct: 1
  },
  {
    id: "q4",
    title: "Кто оплатит ноготочки после победы?",
    options: ["Любимый муж 💗", "Случайный прохожий", "Курьер"],
    correct: 0
  }
];

export function correctIndex(question, env) {
  if (env && env.QUIZ_ANSWERS) {
    let overrides;
    try {
      overrides = JSON.parse(env.QUIZ_ANSWERS);
    } catch {
      throw new Error("Неправильный формат Cloudflare Secret QUIZ_ANSWERS");
    }
    const index = overrides && overrides[question.id];
    if (!Number.isInteger(index) || index < 0 || index >= question.options.length) {
      throw new Error("Не настроен правильный ответ: " + question.id);
    }
    return index;
  }
  if (Number.isInteger(question.correct) && question.correct >= 0 && question.correct < question.options.length) {
    return question.correct;
  }
  throw new Error("Не настроен правильный ответ: " + question.id);
}