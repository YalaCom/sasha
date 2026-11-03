// Вопросы для викторины «Любимая жена».
// Для вопроса q7 правильный ответ устанавливается только владельцем в /admin.html.
export const QUESTIONS = [
  {
    id: "q1",
    title: "Что я люблю кушать?",
    options: ["Багет со сметаной", "Кабачки, жаренные в яйце", "Жареную фасоль"],
    correct: 1
  },
  {
    id: "q2",
    title: "Когда у меня день рождения?",
    options: ["26 апреля", "27 апреля", "28 апреля"],
    correct: 1
  },
  {
    id: "q3",
    title: "Какой у меня рост?",
    options: ["170 см", "187 см", "197 см"],
    correct: 1
  },
  {
    id: "q4",
    title: "Кого я люблю больше?",
    options: ["Тебя", "Киру", "Обеих"],
    correct: 2
  },
  {
    id: "q5",
    title: "Как я люблю проводить выходной?",
    options: [
      "Гулять с вами",
      "За компьютером, но это не значит, что я не люблю проводить время с вами",
      "Выпить пиво"
    ],
    correct: 1
  },
  {
    id: "q6",
    title: "Какое отчество у моей мамы?",
    options: ["Ефимовна", "Анатольевна", "Евгеньевна"],
    correct: 0
  },
  {
    id: "q7",
    title: "Какое у меня было бы отчество?",
    options: ["Владимирович", "Владиславович", "Витальевич"],
    correct: null
  },
  {
    id: "q8",
    title: "В какую игру я играю почти всегда?",
    options: ["Аризона РП", "Радмир РП", "Даймонд РП"],
    correct: 0
  }
];

export function correctIndex(question, savedConfig) {
  if (question.id === "q7") {
    const choice = savedConfig?.choice;
    if (Number.isInteger(choice) && choice >= 0 && choice < question.options.length) {
      return choice;
    }
    throw new Error("Вопрос об отчестве пока не настроен");
  }
  return question.correct;
}

export function configured(savedConfig) {
  try {
    return QUESTIONS.every((question) => Number.isInteger(correctIndex(question, savedConfig)));
  } catch {
    return false;
  }
}
