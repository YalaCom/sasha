(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const start = $("start-btn");
  const next = $("next-btn");
  const back = $("back-btn");
  const optionBox = $("answer-options");
  const state = { questions: [], selected: {}, position: 0, submitting: false };

  function showError(id, message) {
    const target = $(id);
    target.textContent = message || "";
    target.hidden = !message;
  }

  function switchScene(id) {
    for (const name of ["intro", "quiz", "result"]) {
      $(name).hidden = name !== id;
      $(name).classList.toggle("is-active", name === id);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function render() {
    const question = state.questions[state.position];
    if (!question) return;
    const total = state.questions.length;
    const choice = state.selected[question.id];
    const number = String(state.position + 1).padStart(2, "0");
    $("question-number").textContent = number;
    $("question-counter").textContent = number + " / " + String(total).padStart(2, "0");
    $("progress-fill").style.width = ((state.position + 1) / total) * 100 + "%";
    $("quiz-progress").setAttribute("aria-valuemax", String(total));
    $("quiz-progress").setAttribute("aria-valuenow", String(state.position + 1));
    $("question-title").textContent = question.title;

    optionBox.replaceChildren();
    question.options.forEach((value, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "answer-button" + (choice === index ? " chosen" : "");
      button.setAttribute("aria-pressed", String(choice === index));
      const digit = document.createElement("span");
      digit.className = "answer-digit";
      digit.textContent = String(index + 1).padStart(2, "0");
      const caption = document.createElement("span");
      caption.className = "answer-label";
      caption.textContent = value;
      const marker = document.createElement("span");
      marker.className = "answer-check";
      marker.textContent = choice === index ? "✓" : "○";
      marker.setAttribute("aria-hidden", "true");
      button.append(digit, caption, marker);
      button.addEventListener("click", () => {
        if (state.submitting) return;
        state.selected[question.id] = index;
        render();
      });
      optionBox.append(button);
    });

    back.disabled = state.position === 0;
    next.disabled = choice === undefined || state.submitting;
    next.innerHTML = state.position === total - 1
      ? 'Узнать результат <span aria-hidden="true">→</span>'
      : 'Продолжить <span aria-hidden="true">→</span>';
    showError("quiz-error", "");
  }

  start.addEventListener("click", async () => {
    start.disabled = true;
    start.textContent = "Загрузка...";
    showError("intro-error", "");
    try {
      const response = await fetch("/api/questions", { cache: "no-store" });
      if (!response.ok) throw new Error("Сайт ещё не готов. Попробуй позже.");
      const data = await response.json();
      if (!Array.isArray(data.questions) || data.questions.length !== 8) {
        throw new Error("Вопросы пока недоступны.");
      }
      if (!data.ready) {
        throw new Error("Организатор ещё готовит тест. Загляни чуть позже.");
      }
      state.questions = data.questions;
      state.selected = {};
      state.position = 0;
      render();
      switchScene("quiz");
    } catch (error) {
      showError("intro-error", error.message || "Не удалось загрузить тест.");
    } finally {
      start.disabled = false;
      start.innerHTML = '<span>Начать тест</span><span aria-hidden="true">→</span>';
    }
  });

  back.addEventListener("click", () => {
    if (state.submitting || state.position === 0) return;
    state.position -= 1;
    render();
  });

  next.addEventListener("click", async () => {
    if (state.submitting) return;
    const current = state.questions[state.position];
    if (!current || state.selected[current.id] === undefined) return;
    if (state.position < state.questions.length - 1) {
      state.position += 1;
      render();
      return;
    }

    state.submitting = true;
    next.disabled = true;
    back.disabled = true;
    next.textContent = "Проверяем ответы...";
    showError("quiz-error", "");
    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: state.questions.map(({ id }) => ({ id, choice: state.selected[id] }))
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Не удалось сохранить ответы. Попробуй ещё раз.");

      $("result-title").textContent = data.won
        ? "Ты выиграла оплату маникюра!"
        : "Тест пройден";
      $("result-description").textContent = data.won
        ? "Все восемь ответов правильные. Маникюр — за мой счёт!"
        : "В этот раз не все ответы оказались правильными, поэтому приз пока не выигран.";
      $("result-score").textContent = data.correctCount + " / " + data.total;
      $("result").classList.toggle("is-winner", Boolean(data.won));

      const telegramMessage = data.won
        ? "Я прошла твой тест! ❤️\nУ меня " + data.correctCount + " из " + data.total + " правильных ответов.\nЯ выиграла оплату маникюра! 💅"
        : "Я прошла твой тест! ❤️\nУ меня " + data.correctCount + " из " + data.total + " правильных ответов.\nВ этот раз мне не удалось выиграть оплату маникюра.";
      $("telegram-link").href = "https://t.me/exquown?text=" + encodeURIComponent(telegramMessage);
      switchScene("result");
    } catch (error) {
      showError("quiz-error", error.message || "Не удалось сохранить ответы.");
    } finally {
      state.submitting = false;
      back.disabled = state.position === 0;
      next.disabled = false;
      next.innerHTML = 'Узнать результат <span aria-hidden="true">→</span>';
    }
  });
})();
