(() => {
  "use strict";

  const byId = (id) => document.getElementById(id);
  const intro = byId("intro");
  const quiz = byId("quiz");
  const result = byId("result");
  const startButton = byId("start-btn");
  const nextButton = byId("next-btn");
  const backButton = byId("back-btn");
  const optionsContainer = byId("answer-options");
  const state = { questions: [], choices: {}, current: 0, name: "" };

  function setError(id, message) {
    const element = byId(id);
    element.textContent = message || "";
    element.hidden = !message;
  }

  function show(section) {
    intro.hidden = section !== "intro";
    quiz.hidden = section !== "quiz";
    result.hidden = section !== "result";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderQuestion() {
    const question = state.questions[state.current];
    const total = state.questions.length;
    const selected = state.choices[question.id];
    byId("question-counter").textContent = String(state.current + 1).padStart(2, "0") + " / " + String(total).padStart(2, "0");
    byId("progress-fill").style.width = Math.round(((state.current + 1) / total) * 100) + "%";
    byId("question-number").textContent = String(state.current + 1);
    byId("question-title").textContent = question.title;

    optionsContainer.replaceChildren();
    question.options.forEach((answer, index) => {
      const button = document.createElement("button");
      const marker = document.createElement("span");
      const label = document.createElement("span");
      button.type = "button";
      button.className = "answer-option" + (selected === index ? " is-selected" : "");
      button.setAttribute("aria-pressed", String(selected === index));
      marker.className = "option-marker";
      marker.textContent = selected === index ? "✓" : String.fromCharCode(65 + index);
      label.textContent = answer;
      button.append(marker, label);
      button.addEventListener("click", () => {
        state.choices[question.id] = index;
        renderQuestion();
      });
      optionsContainer.append(button);
    });

    backButton.disabled = state.current === 0;
    nextButton.disabled = selected === undefined;
    nextButton.textContent = state.current === total - 1 ? "Узнать результат ✨" : "Дальше →";
    setError("quiz-error", "");
  }

  startButton.addEventListener("click", async () => {
    startButton.disabled = true;
    startButton.textContent = "Готовим вопросы...";
    setError("intro-error", "");
    try {
      const response = await fetch("/api/questions", { cache: "no-store" });
      if (!response.ok) throw new Error("Не удалось загрузить вопросы");
      const data = await response.json();
      if (!Array.isArray(data.questions) || !data.questions.length) throw new Error("Вопросы ещё не добавлены");
      state.questions = data.questions;
      state.name = byId("player-name").value.trim().slice(0, 40) || "Любимая";
      state.current = 0;
      state.choices = {};
      renderQuestion();
      show("quiz");
    } catch {
      setError("intro-error", "Пока не удалось открыть игру. Проверь, что сайт подключён к Cloudflare Pages.");
    } finally {
      startButton.disabled = false;
      startButton.textContent = "Принимаю вызов ↗";
    }
  });

  backButton.addEventListener("click", () => {
    if (state.current > 0) {
      state.current -= 1;
      renderQuestion();
    }
  });

  nextButton.addEventListener("click", async () => {
    const current = state.questions[state.current];
    if (state.choices[current.id] === undefined) return;
    if (state.current < state.questions.length - 1) {
      state.current += 1;
      renderQuestion();
      return;
    }

    nextButton.disabled = true;
    nextButton.textContent = "Проверяем...";
    setError("quiz-error", "");
    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.name,
          answers: state.questions.map((question) => ({
            id: question.id,
            choice: state.choices[question.id]
          }))
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось сохранить ответы");
      byId("result-icon").textContent = data.won ? "🎉" : "💌";
      byId("result-title").textContent = data.won ? "Ты выиграла, любимая!" : "Совсем чуть-чуть не хватило!";
      byId("result-description").textContent = data.won
        ? "Все ответы верные! Твой приз — маникюр за мой счёт. Поздравляю, красотка! 💅"
        : "В этот раз не все ответы правильные. Но твои ответы уже сохранены — организатор всё увидит. ♡";
      byId("result-score").textContent = data.correctCount + " / " + data.total;
      show("result");
    } catch (error) {
      setError("quiz-error", error.message || "Ошибка сохранения. Попробуй ещё раз.");
    } finally {
      nextButton.disabled = false;
      nextButton.textContent = "Узнать результат ✨";
    }
  });
})();