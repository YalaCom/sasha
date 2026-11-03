(() => {
  "use strict";
  const byId = (id) => document.getElementById(id);
  const loginPanel = byId("login-panel");
  const dashboard = byId("dashboard");
  const attemptsEl = byId("attempt-list");
  let currentPassword = "";

  function errorAt(elementId, message) {
    const el = byId(elementId);
    el.textContent = message || "";
    el.hidden = !message;
  }

  function el(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = String(value);
    return node;
  }

  function render(records) {
    byId("total-count").textContent = records.length;
    byId("wins-count").textContent = records.filter((record) => record.won).length;
    byId("losses-count").textContent = records.filter((record) => !record.won).length;
    attemptsEl.replaceChildren();

    if (!records.length) {
      attemptsEl.append(el("div", "empty-state", "Пока нет ответов. Как только игра будет пройдена, результаты появятся здесь. ♡"));
      return;
    }
    records.forEach((record) => {
      const card = el("article", "attempt-card");
      const header = el("div", "attempt-header");
      const time = record.submittedAt ? new Date(record.submittedAt).toLocaleString("ru-RU") : "Дата неизвестна";
      header.append(el("strong", "attempt-name", record.name || "Любимая"));
      header.append(el("span", "attempt-date", time));
      header.append(el("span", "status " + (record.won ? "status-won" : "status-lost"), record.won ? "💅 ВЫИГРАЛА" : "НЕ ВЫИГРАЛА"));
      card.append(header);
      card.append(el("p", "attempt-score", "Правильных ответов: " + record.correctCount + " из " + record.total));

      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = "Посмотреть все ответы";
      details.append(summary);
      (record.answers || []).forEach((answer, index) => {
        const row = el("div", "answer-record");
        row.append(el("p", "", (index + 1) + ". " + answer.question));
        row.append(el("div", "selected-answer", "Её ответ: " + answer.selected + (answer.isCorrect ? " ✓" : " ✗")));
        if (!answer.isCorrect) row.append(el("div", "correct-answer", "Правильный ответ: " + answer.correct));
        details.append(row);
      });
      card.append(details);
      attemptsEl.append(card);
    });
  }

  async function load(password) {
    errorAt("login-error", "");
    errorAt("dashboard-error", "");
    const response = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ password })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) throw new Error("Неверный пароль администратора.");
      throw new Error(body.error || "Не удалось загрузить данные из Cloudflare.");
    }
    render(Array.isArray(body.submissions) ? body.submissions : []);
  }

  byId("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = byId("admin-password").value;
    const button = byId("login-button");
    button.disabled = true;
    button.textContent = "Проверяем...";
    try {
      await load(value);
      currentPassword = value;
      byId("admin-password").value = "";
      loginPanel.hidden = true;
      dashboard.hidden = false;
    } catch (error) {
      errorAt("login-error", error.message);
    } finally {
      button.disabled = false;
      button.textContent = "Посмотреть ответы →";
    }
  });

  byId("refresh-button").addEventListener("click", async () => {
    const button = byId("refresh-button");
    button.disabled = true;
    try {
      await load(currentPassword);
    } catch (error) {
      errorAt("dashboard-error", error.message);
    } finally {
      button.disabled = false;
    }
  });

  byId("logout-button").addEventListener("click", () => {
    currentPassword = "";
    attemptsEl.replaceChildren();
    dashboard.hidden = true;
    loginPanel.hidden = false;
  });
})();