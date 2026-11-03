(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  let password = "";

  function notify(id, message) {
    const node = $(id);
    node.textContent = message || "";
    node.hidden = !message;
  }

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }

  async function api(method, extra = {}) {
    const response = await fetch("/api/admin", {
      method,
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, ...extra })
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.error || "Ошибка соединения с сервером.");
    return json;
  }

  function renderSettings(data) {
    const select = $("q7-choice");
    select.replaceChildren();
    const placeholder = make("option", "", "Выбери правильный ответ");
    placeholder.value = "";
    select.append(placeholder);
    (data.q7Options || []).forEach((label, index) => {
      const option = make("option", "", label);
      option.value = String(index);
      select.append(option);
    });
    const configured = Number.isInteger(data.q7Choice);
    select.value = configured ? String(data.q7Choice) : "";
    $("setup-status").textContent = configured ? "ГОТОВО" : "НЕ НАСТРОЕН";
    $("setup-status").classList.toggle("is-set", configured);
    $("settings-info").textContent = configured
      ? "Правильный вариант сохранён. Тест готов к прохождению."
      : "Укажи правильный вариант до того, как отправишь ссылку жене.";
  }

  function renderAttempts(records) {
    $("total-count").textContent = records.length;
    $("wins-count").textContent = records.filter((item) => item.won).length;
    $("losses-count").textContent = records.filter((item) => !item.won).length;
    const list = $("attempt-list");
    list.replaceChildren();

    if (!records.length) {
      list.append(make("div", "empty-history", "Пока ответов нет. После прохождения теста здесь появятся дата, ответы и результат."));
      return;
    }

    for (const record of records) {
      const article = make("article", "attempt-card");
      const top = make("div", "attempt-top");
      const identity = make("div", "attempt-identity");
      identity.append(make("h3", "", "Любимая жена"));
      const date = new Date(record.submittedAt);
      const timestamp = Number.isNaN(date.getTime())
        ? "Время неизвестно"
        : date.toLocaleString("ru-RU", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
      identity.append(make("p", "attempt-date", "Ответила: " + timestamp));
      top.append(identity);
      top.append(make("span", "result-pill " + (record.won ? "result-win" : "result-loss"), record.won ? "ПОБЕДА" : "БЕЗ ПОБЕДЫ"));
      article.append(top);
      article.append(make("div", "attempt-score", "Правильно: " + record.correctCount + " из " + record.total));

      const details = make("details", "answer-details");
      details.append(make("summary", "", "Показать все ответы"));
      const answers = make("div", "admin-answers");
      (record.answers || []).forEach((answer, index) => {
        const row = make("div", "answer-record");
        row.append(make("div", "answer-record-title", (index + 1) + ". " + answer.question));
        const answerChoice = make("div", "answer-record-choice", "Её ответ: " + answer.selected);
        answerChoice.append(make("span", "answer-indicator " + (answer.isCorrect ? "correct" : "wrong"), answer.isCorrect ? "Верно" : "Неверно"));
        row.append(answerChoice);
        if (!answer.isCorrect) row.append(make("p", "expected-answer", "Правильный ответ: " + answer.correct));
        answers.append(row);
      });
      details.append(answers);
      article.append(details);
      list.append(article);
    }
  }

  async function refresh() {
    notify("dashboard-error", "");
    const data = await api("POST");
    renderSettings(data);
    renderAttempts(Array.isArray(data.submissions) ? data.submissions : []);
  }

  $("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    password = $("admin-password").value;
    const button = $("login-button");
    button.disabled = true;
    button.textContent = "Проверяем...";
    notify("login-error", "");
    try {
      await refresh();
      $("login-panel").hidden = true;
      $("dashboard").hidden = false;
      $("admin-password").value = "";
    } catch (error) {
      password = "";
      notify("login-error", error.message);
    } finally {
      button.disabled = false;
      button.innerHTML = 'Войти <span aria-hidden="true">→</span>';
    }
  });

  $("settings-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = $("q7-choice").value;
    if (value === "") return;
    const button = $("save-settings-button");
    notify("settings-error", "");
    $("settings-info").textContent = "";
    button.disabled = true;
    button.textContent = "Сохраняем...";
    try {
      await api("PUT", { q7Choice: Number(value) });
      await refresh();
      $("settings-info").textContent = "Сохранено. Жена может проходить тест.";
    } catch (error) {
      notify("settings-error", error.message);
    } finally {
      button.disabled = false;
      button.textContent = "Сохранить";
    }
  });

  $("refresh-button").addEventListener("click", async () => {
    const button = $("refresh-button");
    button.disabled = true;
    try {
      await refresh();
    } catch (error) {
      notify("dashboard-error", error.message);
    } finally {
      button.disabled = false;
    }
  });

  $("logout-button").addEventListener("click", () => {
    password = "";
    $("dashboard").hidden = true;
    $("login-panel").hidden = false;
    $("attempt-list").replaceChildren();
  });
})();
