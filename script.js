const STORAGE_KEY = "iacharaCharacters";
const THEME_KEY = "iacharaTheme";

const jsonInput = document.getElementById("jsonInput");
const characterList = document.getElementById("characterList");
const message = document.getElementById("message");
const clearAllButton = document.getElementById("clearAllButton");
const themeToggle = document.getElementById("themeToggle");

const PARAM_ORDER = ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU"];
const STATUS_ORDER = ["HP", "MP", "SAN"];

function loadCharacters() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("localStorageの読み込みに失敗しました:", error);
    return [];
  }
}

function saveCharacters(characters) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
}

function showMessage(text, type = "") {
  message.textContent = text;
  message.className = "message";
  if (type) {
    message.classList.add(type);
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return map[char];
  });
}

function normalizeColor(color) {
  if (typeof color !== "string") return "#888888";
  const trimmed = color.trim();
  const hexColorPattern = /^#([0-9a-fA-F]{6})$/;
  return hexColorPattern.test(trimmed) ? trimmed : "#888888";
}

function extractCharacter(rawObject) {
  if (!rawObject || rawObject.kind !== "character" || !rawObject.data) {
    throw new Error("iacharaのcharacterデータではありません。");
  }

  const data = rawObject.data;

  if (!data.name || !Array.isArray(data.params) || !Array.isArray(data.status)) {
    throw new Error("必要なデータが不足しています。");
  }

  const params = {};
  for (const item of data.params) {
    if (item && item.label) {
      params[item.label] = item.value;
    }
  }

  const status = {};
  for (const item of data.status) {
    if (item && item.label) {
      status[item.label] = item.value;
    }
  }

  const character = {
    id: String(data.externalUrl || data.name).trim(),
    name: String(data.name).trim(),
    externalUrl: String(data.externalUrl || "").trim(),
    color: normalizeColor(data.color),
    params: {},
    status: {}
  };

  for (const key of PARAM_ORDER) {
    character.params[key] = params[key] ?? "-";
  }

  for (const key of STATUS_ORDER) {
    character.status[key] = status[key] ?? "-";
  }

  return character;
}

function upsertCharacter(newCharacter) {
  const characters = loadCharacters();
  const index = characters.findIndex((item) => item.id === newCharacter.id);

  if (index >= 0) {
    characters[index] = newCharacter;
  } else {
    characters.unshift(newCharacter);
  }

  saveCharacters(characters);
}

function deleteCharacter(id) {
  const characters = loadCharacters();
  const filtered = characters.filter((item) => item.id !== id);
  saveCharacters(filtered);
  renderCharacters();
}

function clearAllCharacters() {
  const confirmed = window.confirm("保存済みキャラをすべて削除します。よろしいですか？");
  if (!confirmed) return;

  localStorage.removeItem(STORAGE_KEY);
  renderCharacters();
  showMessage("すべて削除しました。", "success");
}

function copyCharacterJson(id) {
  const characters = loadCharacters();
  const character = characters.find((item) => item.id === id);
  if (!character) return;

  const text = JSON.stringify(character, null, 2);

  navigator.clipboard.writeText(text)
    .then(() => {
      showMessage("保存データをコピーしました。", "success");
    })
    .catch(() => {
      showMessage("コピーに失敗しました。", "error");
    });
}

function renderStatBoxes(dataObject, keys) {
  return keys
    .map((key) => {
      const value = dataObject[key] ?? "-";
      return `
        <div class="stat-box">
          <span class="stat-label">${escapeHtml(key)}</span>
          <span class="stat-value">${escapeHtml(value)}</span>
        </div>
      `;
    })
    .join("");
}

function renderCharacters() {
  const characters = loadCharacters();

  if (characters.length === 0) {
    characterList.innerHTML = `
      <div class="empty">
        まだキャラが登録されていません。上の欄にJSONを貼り付けてください。
      </div>
    `;
    return;
  }

  characterList.innerHTML = characters
    .map((character) => {
      const safeName = escapeHtml(character.name);
      const safeColor = escapeHtml(character.color);
      const safeUrl = escapeHtml(character.externalUrl);

      return `
        <article class="character-card" style="border-left-color: ${safeColor};">
          <div class="card-top">
            <div>
              <h3 class="character-name" style="color: ${safeColor};">${safeName}</h3>
              <div class="meta-row">
                カラーコード: <strong>${safeColor}</strong>
              </div>
              ${
                character.externalUrl
                  ? `<div class="meta-row">出典: <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a></div>`
                  : ""
              }
            </div>

            <div class="card-actions">
              <button class="small-button" type="button" data-copy-id="${escapeHtml(character.id)}">
                コピー
              </button>
              <button class="danger-button" type="button" data-delete-id="${escapeHtml(character.id)}">
                削除
              </button>
            </div>
          </div>

          <div class="meta-row">能力値</div>
          <div class="grid-group">
            ${renderStatBoxes(character.params, PARAM_ORDER)}
          </div>

          <div class="meta-row">状態値</div>
          <div class="grid-group">
            ${renderStatBoxes(character.status, STATUS_ORDER)}
          </div>
        </article>
      `;
    })
    .join("");

  bindCardButtons();
}

function bindCardButtons() {
  const deleteButtons = document.querySelectorAll("[data-delete-id]");
  const copyButtons = document.querySelectorAll("[data-copy-id]");

  deleteButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.deleteId;
      deleteCharacter(id);
      showMessage("キャラを削除しました。", "success");
    });
  });

  copyButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.copyId;
      copyCharacterJson(id);
    });
  });
}

function handlePasteInput() {
  const text = jsonInput.value.trim();
  if (!text) return;

  try {
    const parsed = JSON.parse(text);
    const character = extractCharacter(parsed);
    upsertCharacter(character);
    renderCharacters();
    showMessage(`「${character.name}」を保存しました。`, "success");
    jsonInput.value = "";
  } catch (error) {
    console.error(error);
    showMessage(`登録に失敗しました: ${error.message}`, "error");
  }
}

function applyTheme(theme) {
  if (theme === "dark") {
    document.body.classList.add("dark-mode");
  } else {
    document.body.classList.remove("dark-mode");
  }
  localStorage.setItem(THEME_KEY, theme);
}

function loadTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);

  if (savedTheme === "dark" || savedTheme === "light") {
    applyTheme(savedTheme);
    return;
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(prefersDark ? "dark" : "light");
}

function toggleTheme() {
  const isDark = document.body.classList.contains("dark-mode");
  applyTheme(isDark ? "light" : "dark");
}

jsonInput.addEventListener("paste", () => {
  setTimeout(handlePasteInput, 50);
});

jsonInput.addEventListener("change", handlePasteInput);

clearAllButton.addEventListener("click", clearAllCharacters);
themeToggle.addEventListener("click", toggleTheme);

loadTheme();
renderCharacters();
