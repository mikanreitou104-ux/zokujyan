// ===== 固定デザイン解像度(1920x1080) → 実ウィンドウへのレターボックス拡縮 =====
const GAME_WIDTH = 1920;
const GAME_HEIGHT = 1080;
const gameCanvas = document.getElementById("game-canvas");
let currentGameScale = 1;

function updateGameScale() {
  currentGameScale = Math.min(window.innerWidth / GAME_WIDTH, window.innerHeight / GAME_HEIGHT);
  gameCanvas.style.transform = `translate(-50%, -50%) scale(${currentGameScale})`;
}

updateGameScale();
window.addEventListener("resize", updateGameScale);
document.addEventListener("fullscreenchange", updateGameScale);
window.addEventListener("orientationchange", updateGameScale);

const ATTR_BASE_STATUS = {
  fire: {
    maxHp: 25,
    maxPower: 3
  },
  thunder: {
    maxHp: 30,
    maxPower: 4
  },
  ice: {
    maxHp: 30,
    maxPower: 3
  },
  stone: {
    maxHp: 35,
    maxPower: 3
  },
  water: {
    maxHp: 30,
    maxPower: 4
  },
  wind: {
    maxHp: 25,
    maxPower: 3
  },
  fighter: {
    maxHp: 25,
    maxPower: 5
  },
  poison: {
    maxHp: 20,
    maxPower: 3
  },
  vampire: {
    maxHp: 25,
    maxPower: 3
  },
  doppel: {
    maxHp: 25,
    maxPower: 3
  },
  curse: {
    maxHp: 25,
    maxPower: 3
  },
  cannon: {
    maxHp: 25,
    maxPower: 20
  },
  gambler: {
    maxHp: 25,
    maxPower: 3
  },
  magician: {
    maxHp: 25,
    maxPower: 3
  },
  berserker: {
    maxHp: 80,
    maxPower: 3
  },

};

// ===== セーブデータ基盤 =====
// ショップ/MYメニュー/クエスト/ストーリーモードが共有するプレイヤーの永続データ
const SAVE_DATA_KEY = "saveData";

const DEFAULT_SAVE_DATA = {
  version: 1,
  profileName: "ユーザー",     // プロフィール表示名(モード選択左上・プロフィール画面)。プレイヤーが変更可能
  coins: 0,
  unlockedAttributes: [],      // 基本3属性(fire/thunder/ice)は含めない。ショップ購入分のみ
  ownedSkins: ["default"],
  equippedSkin: "default",
  ownedIconBgs: ["red", "blue", "green"], // カットイン等のアイコン背景。初期3色は購入不要で所持
  equippedIconBg: "red",
  ownedIcons: ["akasra"], // カットイン等で使うアイコン画像本体。初期は赤スライムのみ所持
  equippedIcon: "akasra",
  statBoosts: {                // ストーリーモード用の初期ステータス強化（ショップで購入）
    hp: 0,
    power: 0
  },
  quests: {
    lastDailyReset: null,      // "YYYY-MM-DD"。デイリークエスト実装時に使用
    mainProgress: {},          // { questId: { completed, progress } }
    dailyProgress: {}
  },
  stats: {
    cpuBattlesPlayed: 0,
    cpuBattlesWon: 0,
    drawCount: 0,
    roundWinCount: 0,       // じゃんけん1回ごとの勝利数(プロフィール画面の「じゃんけんの勝率」用、cpuBattlesWonとは別)
    roundLossCount: 0,      // じゃんけん1回ごとの敗北数
    handWinCount: { rock: 0, paper: 0, scissors: 0 }, // 各手を出して勝利した回数(手ごとの勝率計算用)
    totalDamageDealt: 0,
    totalDamageTaken: 0,
    highDamageHits: 0,      // 1回で10以上のダメージを与えた回数
    freezeCount: 0,         // 氷属性で相手を凍結させた通算回数
    poisonApplyCount: 0,    // 毒属性で相手に毒を付与した通算回数
    curseApplyCount: 0,     // 呪術属性で相手に呪いを付与した通算回数
    coinsEarnedTotal: 0,    // 使った分も含む生涯獲得コイン(所持コインのsaveData.coinsとは別)
    shopPurchaseCount: 0,   // ショップで新規購入した回数(スキン/アイコン/属性など)
    itemCardsCollected: 0,  // ストーリーモードでアイテムカードを取得した通算回数
    attributesTriedCount: 0, // 1回以上戦ったことがある属性の種類数
    attributesWonCount: 0,   // 1回以上勝利したことがある属性の種類数
    handUseCount: { rock: 0, paper: 0, scissors: 0 },
    // 属性キーはATTR_BASE_STATUSと同じ15種で初期化(このオブジェクトはATTR_BASE_STATUSの後で定義されるファイル位置なので参照可能)
    winsByAttribute: Object.keys(ATTR_BASE_STATUS).reduce((o, k) => (o[k] = 0, o), {}),
    damageByAttribute: Object.keys(ATTR_BASE_STATUS).reduce((o, k) => (o[k] = 0, o), {}),
    attributePlayCount: Object.keys(ATTR_BASE_STATUS).reduce((o, k) => (o[k] = 0, o), {})
  },
  clearedStages: []            // クリア済みステージID一覧（ストーリーモード）
};

function cloneDefaultSaveData() {
  return JSON.parse(JSON.stringify(DEFAULT_SAVE_DATA));
}

function loadSaveData() {
  const raw = localStorage.getItem(SAVE_DATA_KEY);
  if (!raw) return cloneDefaultSaveData();

  try {
    const parsed = JSON.parse(raw);
    // 将来フィールドが増えても既存セーブが壊れないよう、デフォルトとマージする
    return {
      ...cloneDefaultSaveData(),
      ...parsed,
      statBoosts: { ...DEFAULT_SAVE_DATA.statBoosts, ...(parsed.statBoosts || {}) },
      quests: { ...DEFAULT_SAVE_DATA.quests, ...(parsed.quests || {}) },
      stats: { ...DEFAULT_SAVE_DATA.stats, ...(parsed.stats || {}) }
    };
  } catch (e) {
    console.warn("セーブデータの読み込みに失敗したため初期化します", e);
    return cloneDefaultSaveData();
  }
}

function saveSaveData() {
  localStorage.setItem(SAVE_DATA_KEY, JSON.stringify(saveData));
}

let saveData = loadSaveData();

// "winsByAttribute.fire"のようなドット区切りパスでsaveData.statsの値を読み書きするヘルパー。
// 大量の統計連動クエスト(QUEST_CATALOGのstatPath)を、個別にupdateQuestProgress()を呼ばずとも
// この2関数だけで自動的に進捗させられるようにする。
function getStatByPath(path) {
  const value = path.split(".").reduce((obj, key) => (obj ? obj[key] : undefined), saveData.stats);
  return value || 0;
}

function incrementStat(path, amount = 1) {
  const keys = path.split(".");
  let obj = saveData.stats;
  for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
  const lastKey = keys[keys.length - 1];
  obj[lastKey] = (obj[lastKey] || 0) + amount;
  saveSaveData();
  updateQuestClaimableBadge();
}

// 属性ごとの挑戦回数(attributePlayCount)を記録し、その属性で初めて戦った場合は
// コンプリート系クエスト用のattributesTriedCountも合わせて増やす
function trackAttributePlay(attr) {
  if (getStatByPath(`attributePlayCount.${attr}`) === 0) {
    incrementStat("attributesTriedCount", 1);
  }
  incrementStat(`attributePlayCount.${attr}`, 1);
}

function isAttributeUnlocked(attr) {
  return ["fire", "thunder", "ice"].includes(attr) || saveData.unlockedAttributes.includes(attr);
}

function isStageCleared(stageId) {
  return saveData.clearedStages.includes(stageId);
}

function markStageCleared(stageId) {
  if (!saveData.clearedStages.includes(stageId)) {
    saveData.clearedStages.push(stageId);
    saveSaveData();
  }
}

// 所持コイン表示を更新する(モード選択画面・クエスト画面など、.coins-value-displayを持つ要素全て)
function updateModeCoinsDisplay() {
  document.querySelectorAll(".coins-value-display").forEach(el => {
    el.textContent = saveData.coins;
  });
}

function addCoins(amount) {
  saveData.coins += amount;
  saveData.stats.coinsEarnedTotal = (saveData.stats.coinsEarnedTotal || 0) + amount;
  saveSaveData();
  updateModeCoinsDisplay();
  updateQuestClaimableBadge();
}

function spendCoins(amount) {
  if (saveData.coins < amount) return false;
  saveData.coins -= amount;
  saveSaveData();
  updateModeCoinsDisplay();
  return true;
}

function unlockAttribute(attr) {
  if (!saveData.unlockedAttributes.includes(attr)) {
    saveData.unlockedAttributes.push(attr);
    saveSaveData();
    incrementStat("shopPurchaseCount");
  }
}

function ownSkin(skinId) {
  if (!saveData.ownedSkins.includes(skinId)) {
    saveData.ownedSkins.push(skinId);
    saveSaveData();
    incrementStat("shopPurchaseCount");
  }
}

function equipSkin(skinId) {
  if (!saveData.ownedSkins.includes(skinId)) return false;
  saveData.equippedSkin = skinId;
  saveSaveData();
  return true;
}

function ownIconBg(iconBgId) {
  if (!saveData.ownedIconBgs.includes(iconBgId)) {
    saveData.ownedIconBgs.push(iconBgId);
    saveSaveData();
    incrementStat("shopPurchaseCount");
  }
}

function equipIconBg(iconBgId) {
  if (!saveData.ownedIconBgs.includes(iconBgId)) return false;
  saveData.equippedIconBg = iconBgId;
  saveSaveData();
  updateModeProfileDisplay();
  return true;
}

function ownIcon(iconId) {
  if (!saveData.ownedIcons.includes(iconId)) {
    saveData.ownedIcons.push(iconId);
    saveSaveData();
    incrementStat("shopPurchaseCount");
  }
}

function equipIcon(iconId) {
  if (!saveData.ownedIcons.includes(iconId)) return false;
  saveData.equippedIcon = iconId;
  saveSaveData();
  updateModeProfileDisplay();
  return true;
}
// ===== セーブデータ基盤ここまで =====

// ===== ショップ / MYメニュー：カード裏スキン =====
const SKIN_CATALOG = {
  default: { name: "デフォルト", img: "./images/card-bg/defo.png", price: 0, isDefault: true },
  skin1:   { name: "スキンA",   img: "./images/card-bg/1.png",   price: 30 },
  skin2:   { name: "スキンB",   img: "./images/card-bg/2.png",   price: 50 },
  skin3:   { name: "スキンC",   img: "./images/card-bg/3.png",   price: 80 },
};

function getSkinStatus(skinId) {
  if (saveData.equippedSkin === skinId) return "equipped";
  if (saveData.ownedSkins.includes(skinId)) return "owned";
  return "locked";
}

function skinCardHTML(skinId, mode) {
  const skin = SKIN_CATALOG[skinId];
  const status = getSkinStatus(skinId);

  let actionHtml;
  if (mode === "shop") {
    actionHtml = status === "locked"
      ? `<button class="secondary-btn skin-buy-btn" data-skin="${skinId}">購入(${skin.price}コイン)</button>`
      : `<div class="skin-status">所持済み</div>`;
  } else {
    if (status === "equipped") {
      actionHtml = `<div class="skin-status">装備中</div>`;
    } else if (status === "owned") {
      actionHtml = `<button class="secondary-btn skin-equip-btn" data-skin="${skinId}">装備する</button>`;
    } else {
      actionHtml = `<div class="skin-status">未購入</div>`;
    }
  }

  return `
    <div class="skin-card ${status === "equipped" ? "equipped" : ""}">
      <img src="${skin.img}" alt="${skin.name}">
      <div class="skin-name">${skin.name}</div>
      ${actionHtml}
    </div>
  `;
}

function renderShopSkinList() {
  document.getElementById("shopCoinsValue").textContent = saveData.coins;
  document.getElementById("shop-skin-list").innerHTML =
    Object.keys(SKIN_CATALOG)
      .filter(id => !SKIN_CATALOG[id].isDefault) // 初期所持のものだけショップから除外。購入済みのものは「所持済み」表示で残す
      .map(id => skinCardHTML(id, "shop")).join("");
}

function renderMyMenuSkinList() {
  document.getElementById("mymenu-skin-list").innerHTML =
    Object.keys(SKIN_CATALOG)
      .filter(id => getSkinStatus(id) !== "locked") // 未所持のものはMYメニューに出さない
      .map(id => skinCardHTML(id, "equip")).join("");
}

document.getElementById("shop-skin-list").addEventListener("click", (e) => {
  const btn = e.target.closest(".skin-buy-btn");
  if (!btn) return;

  const skinId = btn.dataset.skin;
  const skin = SKIN_CATALOG[skinId];
  if (spendCoins(skin.price)) {
    ownSkin(skinId);
    renderShopSkinList();
  }
});

document.getElementById("mymenu-skin-list").addEventListener("click", (e) => {
  const btn = e.target.closest(".skin-equip-btn");
  if (!btn) return;

  equipSkin(btn.dataset.skin);
  renderMyMenuSkinList();
});

const btnShop = document.querySelector(".mode-btn.shop");
if (btnShop) {
  btnShop.addEventListener("click", () => {
    renderShopSkinList();
    renderShopIconList();
    renderShopIconBgList();
    showScreen("screen-shop");
  });
}

const btnShopBack = document.getElementById("btn-shop-back");
if (btnShopBack) {
  btnShopBack.addEventListener("click", () => {
    showScreen("screen-mode");
  });
}
// ===== ショップ / MYメニューここまで =====

// ===== ショップ / MYメニュー：アイコン背景（カットイン演出等で使うプレイヤーアイコンの背景） =====
// cssプロパティにはCSSのbackground値をそのまま入れる（単色でもグラデーションでも可）
const ICON_BG_CATALOG = {
  red:               { name: "赤",                     css: "#ff2d00", price: 0, isDefault: true },
  blue:              { name: "青",                     css: "#2d6bff", price: 0, isDefault: true },
  green:             { name: "緑",                     css: "#33cc55", price: 0, isDefault: true },
  purple:            { name: "紫",                     css: "#a344ff", price: 40 },
  cyan:              { name: "水色",                   css: "#33ccff", price: 40 },
  blueCyanGradient:  { name: "青→水色グラデーション",   css: "linear-gradient(135deg, #2d6bff, #33ccff)", price: 70 },
  redOrangeGradient: { name: "赤→オレンジグラデーション", css: "linear-gradient(135deg, #ff2d00, #ff9900)", price: 70 },
};

function getIconBgStatus(iconBgId) {
  if (saveData.equippedIconBg === iconBgId) return "equipped";
  if (saveData.ownedIconBgs.includes(iconBgId)) return "owned";
  return "locked";
}

function iconBgCardHTML(iconBgId, mode) {
  const iconBg = ICON_BG_CATALOG[iconBgId];
  const status = getIconBgStatus(iconBgId);

  let actionHtml;
  if (mode === "shop") {
    actionHtml = status === "locked"
      ? `<button class="secondary-btn iconbg-buy-btn" data-iconbg="${iconBgId}">購入(${iconBg.price}コイン)</button>`
      : `<div class="skin-status">所持済み</div>`;
  } else {
    if (status === "equipped") {
      actionHtml = `<div class="skin-status">装備中</div>`;
    } else if (status === "owned") {
      actionHtml = `<button class="secondary-btn iconbg-equip-btn" data-iconbg="${iconBgId}">装備する</button>`;
    } else {
      actionHtml = `<div class="skin-status">未購入</div>`;
    }
  }

  return `
    <div class="skin-card ${status === "equipped" ? "equipped" : ""}">
      <div class="iconbg-swatch" style="background:${iconBg.css};"></div>
      <div class="skin-name">${iconBg.name}</div>
      ${actionHtml}
    </div>
  `;
}

function renderShopIconBgList() {
  document.getElementById("shopCoinsValue").textContent = saveData.coins;
  document.getElementById("shop-iconbg-list").innerHTML =
    Object.keys(ICON_BG_CATALOG)
      .filter(id => !ICON_BG_CATALOG[id].isDefault) // 初期所持のものだけショップから除外。購入済みのものは「所持済み」表示で残す
      .map(id => iconBgCardHTML(id, "shop")).join("");
}

function renderMyMenuIconBgList() {
  document.getElementById("mymenu-iconbg-list").innerHTML =
    Object.keys(ICON_BG_CATALOG)
      .filter(id => getIconBgStatus(id) !== "locked") // 未所持のものはMYメニューに出さない
      .map(id => iconBgCardHTML(id, "equip")).join("");
}

document.getElementById("shop-iconbg-list").addEventListener("click", (e) => {
  const btn = e.target.closest(".iconbg-buy-btn");
  if (!btn) return;

  const iconBgId = btn.dataset.iconbg;
  const iconBg = ICON_BG_CATALOG[iconBgId];
  if (spendCoins(iconBg.price)) {
    ownIconBg(iconBgId);
    renderShopIconBgList();
  }
});

document.getElementById("mymenu-iconbg-list").addEventListener("click", (e) => {
  const btn = e.target.closest(".iconbg-equip-btn");
  if (!btn) return;

  equipIconBg(btn.dataset.iconbg);
  renderMyMenuIconBgList();
  renderIconPreview();
});
// ===== アイコン背景ここまで =====

// ===== ショップ / MYメニュー：アイコン画像（カットイン演出等で使うプレイヤーアイコンの絵柄本体） =====
const ICON_CATALOG = {
  akasra:  { name: "赤スライム", img: "images/enemy/akasra.png",  price: 0, isDefault: true },
  mizusra: { name: "青スライム", img: "images/enemy/mizusra.png", price: 30 },
};

function getIconStatus(iconId) {
  if (saveData.equippedIcon === iconId) return "equipped";
  if (saveData.ownedIcons.includes(iconId)) return "owned";
  return "locked";
}

function iconCardHTML(iconId, mode) {
  const icon = ICON_CATALOG[iconId];
  const status = getIconStatus(iconId);

  let actionHtml;
  if (mode === "shop") {
    actionHtml = status === "locked"
      ? `<button class="secondary-btn icon-buy-btn" data-icon="${iconId}">購入(${icon.price}コイン)</button>`
      : `<div class="skin-status">所持済み</div>`;
  } else {
    if (status === "equipped") {
      actionHtml = `<div class="skin-status">装備中</div>`;
    } else if (status === "owned") {
      actionHtml = `<button class="secondary-btn icon-equip-btn" data-icon="${iconId}">装備する</button>`;
    } else {
      actionHtml = `<div class="skin-status">未購入</div>`;
    }
  }

  return `
    <div class="skin-card ${status === "equipped" ? "equipped" : ""}">
      <img src="${icon.img}" alt="${icon.name}">
      <div class="skin-name">${icon.name}</div>
      ${actionHtml}
    </div>
  `;
}

function renderShopIconList() {
  document.getElementById("shopCoinsValue").textContent = saveData.coins;
  document.getElementById("shop-icon-list").innerHTML =
    Object.keys(ICON_CATALOG)
      .filter(id => !ICON_CATALOG[id].isDefault) // 初期所持のものだけショップから除外。購入済みのものは「所持済み」表示で残す
      .map(id => iconCardHTML(id, "shop")).join("");
}

function renderMyMenuIconList() {
  document.getElementById("mymenu-icon-list").innerHTML =
    Object.keys(ICON_CATALOG)
      .filter(id => getIconStatus(id) !== "locked") // 未所持のものはMYメニューに出さない
      .map(id => iconCardHTML(id, "equip")).join("");
}

// カットイン等で使う「アイコン画像＋アイコン背景」の組み合わせをMYメニュー上でプレビューする
function renderIconPreview() {
  const preview = document.getElementById("mymenuIconPreview");
  const previewImg = document.getElementById("mymenuIconPreviewImg");
  if (!preview || !previewImg) return;

  const icon = ICON_CATALOG[saveData.equippedIcon] || ICON_CATALOG.akasra;
  const iconBg = ICON_BG_CATALOG[saveData.equippedIconBg] || ICON_BG_CATALOG.red;
  preview.style.background = iconBg.css;
  previewImg.src = icon.img;
}

document.getElementById("shop-icon-list").addEventListener("click", (e) => {
  const btn = e.target.closest(".icon-buy-btn");
  if (!btn) return;

  const iconId = btn.dataset.icon;
  const icon = ICON_CATALOG[iconId];
  if (spendCoins(icon.price)) {
    ownIcon(iconId);
    renderShopIconList();
  }
});

document.getElementById("mymenu-icon-list").addEventListener("click", (e) => {
  const btn = e.target.closest(".icon-equip-btn");
  if (!btn) return;

  equipIcon(btn.dataset.icon);
  renderMyMenuIconList();
  renderIconPreview();
});
// ===== アイコン画像ここまで =====

// ===== プロフィール =====
// モード選択画面左上のアイコン＋名前チップと、それをクリックして開くプロフィール画面(#screen-profile)を管理する

// じゃんけんの勝率(手を問わない通算)。roundWinCount/roundLossCount/drawCountはbattleTurn()で更新される
function getRoundWinRatePercent() {
  const wins = getStatByPath("roundWinCount");
  const losses = getStatByPath("roundLossCount");
  const draws = getStatByPath("drawCount");
  const total = wins + losses + draws;
  return total > 0 ? Math.round((wins / total) * 100) : 0;
}

// 指定した手(rock/paper/scissors)を出した時の勝率
function getHandWinRatePercent(handKey) {
  const wins = getStatByPath(`handWinCount.${handKey}`);
  const plays = getStatByPath(`handUseCount.${handKey}`);
  return plays > 0 ? Math.round((wins / plays) * 100) : 0;
}

// モード選択画面左上のチップ(アイコン・名前)を更新する。アイコン装備変更・名前変更のたびに呼ぶ
function updateModeProfileDisplay() {
  const nameEl = document.getElementById("modeProfileName");
  if (nameEl) nameEl.textContent = saveData.profileName || "ユーザー";

  const icon = ICON_CATALOG[saveData.equippedIcon] || ICON_CATALOG.akasra;
  const iconBg = ICON_BG_CATALOG[saveData.equippedIconBg] || ICON_BG_CATALOG.red;
  const iconWrap = document.getElementById("modeProfileIconWrap");
  const iconImg = document.getElementById("modeProfileIconImg");
  if (iconWrap) iconWrap.style.background = iconBg.css;
  if (iconImg) iconImg.src = icon.img;
}

// プロフィール画面本体の中身を描画する
function renderProfileScreen() {
  updateModeProfileDisplay();

  const icon = ICON_CATALOG[saveData.equippedIcon] || ICON_CATALOG.akasra;
  const iconBg = ICON_BG_CATALOG[saveData.equippedIconBg] || ICON_BG_CATALOG.red;
  document.getElementById("profileNameDisplay").textContent = saveData.profileName || "ユーザー";
  document.getElementById("profileIconWrap").style.background = iconBg.css;
  document.getElementById("profileIconImg").src = icon.img;

  const totalStages = Object.keys(STAGE_CATALOG).length;
  document.getElementById("profileStoryClear").textContent =
    `${saveData.clearedStages.length} / ${totalStages} ステージクリア`;

  const handMeta = [["rock", "グー"], ["paper", "パー"], ["scissors", "チョキ"]];
  document.getElementById("profileHandStats").innerHTML = handMeta.map(([key, label]) => `
    <div class="profile-stat-row">
      <span>${label}</span>
      <span>${getStatByPath(`handUseCount.${key}`)}回(勝率${getHandWinRatePercent(key)}%)</span>
    </div>
  `).join("");
  document.getElementById("profileOverallWinRate").textContent = `${getRoundWinRatePercent()}%`;

  const claimedQuestCount = Object.keys(QUEST_CATALOG).filter(id => {
    const record = saveData.quests.mainProgress[id];
    return record && record.claimed;
  }).length;
  document.getElementById("profileQuestClear").textContent =
    `${claimedQuestCount} / ${Object.keys(QUEST_CATALOG).length}`;

  const totalAttrs = Object.keys(ATTR_BASE_STATUS).length;
  const unlockedAttrs = Math.min(totalAttrs, 3 + saveData.unlockedAttributes.length); // 基本3属性は常時解放
  document.getElementById("profileAttrCount").textContent = `${unlockedAttrs} / ${totalAttrs}`;
}

const modeProfileChip = document.getElementById("modeProfileChip");
if (modeProfileChip) {
  modeProfileChip.addEventListener("click", () => {
    renderProfileScreen();
    showScreen("screen-profile");
  });
}

const btnProfileBack = document.getElementById("btn-profile-back");
if (btnProfileBack) {
  btnProfileBack.addEventListener("click", () => {
    showScreen("screen-mode");
  });
}

const btnProfileEditName = document.getElementById("btn-profile-edit-name");
if (btnProfileEditName) {
  btnProfileEditName.addEventListener("click", () => {
    showNameEditModal("名前を入力してください(12文字まで)", saveData.profileName || "ユーザー", (newName) => {
      saveData.profileName = newName.slice(0, 12);
      saveSaveData();
      renderProfileScreen();
    });
  });
}
// ===== プロフィールここまで =====

// ===== オンライン対戦(友達対戦・ルームコード方式) =====
// サーバーは「2人の入力を中継するだけ」の薄い層(server/index.js)。ダメージ計算・属性ロジックは
// 一切サーバーに複製せず、両クライアントが同じ入力(お互いの属性・手)を使って既存の戦闘エンジン
// (battleTurn等)をそのまま実行する。battleContext.mode="online"に統一し、CPU戦の内部処理
// (battleContext.mode!=="story"ならendBattle()へ、等)をそのまま流用する。
//
// デプロイ後、Renderで発行される実際のURLに書き換えること(例: "https://zokujan-online-server.onrender.com")。
function getOnlineServerUrl() {
  return "https://zokujan-online-server.onrender.com";
}

let onlineSocket = null;
let onlineOpponentHandBuffer = null;   // roundResultが先に届いた場合に一時保持する
let onlineOpponentHandCallback = null; // startJankenScene側が先に待ち構えている場合のコールバック

function showOnlineWaiting(message, roomCode) {
  document.getElementById("onlineWaitingMessage").textContent = message;
  const codeBlock = document.getElementById("onlineWaitingCodeBlock");
  if (roomCode) {
    document.getElementById("onlineWaitingCode").textContent = roomCode;
    codeBlock.style.display = "block";
  } else {
    codeBlock.style.display = "none";
  }
  showScreen("screen-online-waiting");
}

// ルーム参加(roomReady)が成立した瞬間に呼ぶ。既存のCPU戦用の属性選択UIをそのまま流用する
function enterOnlineAttributeSelect() {
  battleContext.mode = "online";
  document.getElementById("cpu-attr-select-title").textContent = "オンライン対戦の属性を選択";
  renderAttrCards("cpu-attr-select-list");
  showScreen("screen-cpu-attr-select");
}

// サーバーへの接続は初回のみ行い、以降は使い回す
function connectOnlineSocket() {
  if (onlineSocket) return onlineSocket;

  onlineSocket = io(getOnlineServerUrl());

  onlineSocket.on("connect_error", () => {
    document.getElementById("online-join-error").textContent =
      "サーバーに接続できませんでした。時間をおいて再度お試しください。";
  });

  onlineSocket.on("roomCreated", ({ code }) => {
    showOnlineWaiting("この5桁のコードを友達に伝えて、参加してもらいましょう。", code);
  });

  onlineSocket.on("joinError", (message) => {
    document.getElementById("online-join-error").textContent = message;
  });

  onlineSocket.on("roomReady", () => {
    enterOnlineAttributeSelect();
  });

  onlineSocket.on("battleStart", ({ opponentAttribute }) => {
    beginVersusBattle("online", opponentAttribute, "./images/enemy/mizusra.png");
  });

  onlineSocket.on("roundResult", ({ opponentHand }) => {
    if (onlineOpponentHandCallback) {
      const cb = onlineOpponentHandCallback;
      onlineOpponentHandCallback = null;
      cb(opponentHand);
    } else {
      onlineOpponentHandBuffer = opponentHand;
    }
  });

  onlineSocket.on("rematchReady", () => {
    enterOnlineAttributeSelect();
  });

  onlineSocket.on("opponentLeft", () => {
    showConfirmModal("相手が退出しました。モード選択へ戻ります。", () => {
      showScreen("screen-mode");
    });
  });

  return onlineSocket;
}

// battleTurn()に渡す相手の手を取得する。すでにroundResultが届いていれば即座に、
// まだなら届いた瞬間にcallbackを呼ぶ(ネットワーク遅延を吸収するため)
function resolveOnlineOpponentHand(callback) {
  if (onlineOpponentHandBuffer !== null) {
    const hand = onlineOpponentHandBuffer;
    onlineOpponentHandBuffer = null;
    callback(hand);
  } else {
    onlineOpponentHandCallback = callback;
  }
}

// ルームを離れる際の後片付け(モード選択に戻る/相手の退出を検知した際などに呼ぶ)
function leaveOnlineRoom() {
  if (onlineSocket) onlineSocket.emit("leaveRoom");
  onlineOpponentHandBuffer = null;
  onlineOpponentHandCallback = null;
}

document.getElementById("btn-mode-online").addEventListener("click", () => {
  document.getElementById("online-join-error").textContent = "";
  showScreen("screen-online-lobby");
});

document.getElementById("btn-online-lobby-back").addEventListener("click", () => {
  showScreen("screen-mode");
});

document.getElementById("btn-online-create-room").addEventListener("click", () => {
  connectOnlineSocket().emit("createRoom");
});

document.getElementById("btn-online-join-room").addEventListener("click", () => {
  const code = document.getElementById("online-join-code-input").value.trim().toUpperCase();
  document.getElementById("online-join-error").textContent = "";
  if (!code) return;
  connectOnlineSocket().emit("joinRoom", code);
});

document.getElementById("btn-online-waiting-cancel").addEventListener("click", () => {
  leaveOnlineRoom();
  showScreen("screen-mode");
});
// ===== オンライン対戦ここまで =====

// ===== クエスト =====
// 手動で条件を書く6種(1戦闘内の最大値やピーク値を見る特殊条件)に加え、
// buildMilestoneQuests()でsaveData.statsの値をそのまま目標にする大量の段階クエストを生成する。
// 生成クエストはstatPathを持ち、進捗はupdateQuestProgress()を個別に呼ばなくても
// getQuestProgress()がsaveData.statsから直接読む(incrementStat()で増やすだけで自動反映)。
//
// name/descに属性名を使うクエストは、ATTR_DATA(属性の日本語名)がこのファイルの後方で定義されるため、
// このオブジェクトの構築時点ではまだ参照できない。そのため文字列ではなく関数にして、
// 実際に描画するrenderQuestList()の中で呼び出す(その頃にはATTR_DATAは初期化済み)。
//
// タブ分け・1本の進捗トラックにまとめる表示(2026-07-05)のため、同じstatPathを持つクエストは
// 「1本の連続した段階」として扱う。QUEST_LINE_METAにその行の見出し(label)と所属タブ(category)を持たせる。
const QUEST_LINE_META = {};

function buildMilestoneQuests() {
  const attrs = Object.keys(ATTR_BASE_STATUS);
  const quests = {};

  function registerLine(statPath, category, label) {
    QUEST_LINE_META[statPath] = { category, label };
  }
  function addTier(id, statPath, target, reward, name, desc) {
    quests[id] = { name, desc, target, reward, statPath };
  }

  // CPU戦プレイ回数(既存のpracticeMatters/bePreparedを補う追加段階)
  registerLine("cpuBattlesPlayed", "cpuBattle", "CPU戦をプレイする");
  [[10, 40], [30, 100], [50, 150], [75, 220], [100, 300], [150, 450], [200, 600], [300, 900]]
    .forEach(([t, r]) => addTier(`battlesPlayed_${t}`, "cpuBattlesPlayed", t, r,
      `百戦錬磨・${t}`, `CPU戦を${t}回遊ぶ`));

  // CPU戦勝利数
  registerLine("cpuBattlesWon", "cpuBattle", "CPU戦に勝利する");
  [[5, 30], [10, 60], [20, 120], [30, 180], [50, 300], [75, 450], [100, 600], [150, 900], [200, 1200], [300, 1800]]
    .forEach(([t, r]) => addTier(`battlesWon_${t}`, "cpuBattlesWon", t, r,
      `勝利の階段・${t}`, `CPU戦に${t}回勝利する`));

  // あいこ回数
  registerLine("drawCount", "cpuBattle", "あいこを経験する");
  [[5, 20], [20, 60], [50, 140], [100, 260]]
    .forEach(([t, r]) => addTier(`drawCount_${t}`, "drawCount", t, r,
      `にらみ合い・${t}`, `あいこを${t}回経験する`));

  // 属性ごとの勝利数
  const winTiers = [[5, 20], [20, 60], [50, 140], [100, 280]];
  attrs.forEach(attr => {
    registerLine(`winsByAttribute.${attr}`, "attribute", () => `${ATTR_DATA[attr].name}属性で勝利する`);
    winTiers.forEach(([t, r]) => addTier(`winsBy_${attr}_${t}`, `winsByAttribute.${attr}`, t, r,
      () => `${ATTR_DATA[attr].name}使い・${t}勝`,
      () => `${ATTR_DATA[attr].name}属性で${t}回勝利する`));
  });

  // 属性ごとの累計与ダメージ
  const dmgTiers = [[100, 30], [500, 120], [1000, 220]];
  attrs.forEach(attr => {
    registerLine(`damageByAttribute.${attr}`, "attribute", () => `${ATTR_DATA[attr].name}属性でダメージを与える`);
    dmgTiers.forEach(([t, r]) => addTier(`dmgBy_${attr}_${t}`, `damageByAttribute.${attr}`, t, r,
      () => `${ATTR_DATA[attr].name}の猛攻・${t}`,
      () => `${ATTR_DATA[attr].name}属性で通算${t}ダメージ与える`));
  });

  // 属性ごとの挑戦回数
  const playTiers = [[1, 10], [10, 50]];
  attrs.forEach(attr => {
    registerLine(`attributePlayCount.${attr}`, "attribute", () => `${ATTR_DATA[attr].name}属性で戦う`);
    playTiers.forEach(([t, r]) => addTier(`playAs_${attr}_${t}`, `attributePlayCount.${attr}`, t, r,
      () => t === 1 ? `${ATTR_DATA[attr].name}デビュー` : `${ATTR_DATA[attr].name}を使い込む`,
      () => `${ATTR_DATA[attr].name}属性で${t}回戦う`));
  });

  // 手の使用回数
  const handMeta = { rock: "グー", paper: "パー", scissors: "チョキ" };
  const handTiers = [[20, 15], [50, 35], [100, 70], [200, 130]];
  Object.keys(handMeta).forEach(handKey => {
    registerLine(`handUseCount.${handKey}`, "combat", `${handMeta[handKey]}を出す`);
    handTiers.forEach(([t, r]) => addTier(`hand_${handKey}_${t}`, `handUseCount.${handKey}`, t, r,
      `${handMeta[handKey]}使い・${t}`, `${handMeta[handKey]}を通算${t}回出す`));
  });

  // 総ダメージ(通算・全属性共通)
  registerLine("totalDamageDealt", "combat", "通算ダメージを与える");
  [[100, 20], [500, 90], [1000, 170], [3000, 400], [5000, 650]]
    .forEach(([t, r]) => addTier(`totalDamage_${t}`, "totalDamageDealt", t, r,
      `破壊の軌跡・${t}`, `通算で${t}ダメージ与える`));

  // 被ダメージ(通算・耐久)
  registerLine("totalDamageTaken", "combat", "通算ダメージに耐える");
  [[100, 20], [500, 90], [1000, 170]]
    .forEach(([t, r]) => addTier(`totalTaken_${t}`, "totalDamageTaken", t, r,
      `不屈の精神・${t}`, `通算で${t}ダメージ耐える`));

  // 高火力ヒット(1回で10以上のダメージ)
  registerLine("highDamageHits", "combat", "会心の一撃を決める");
  [[1, 15], [5, 40], [20, 100], [50, 220], [100, 400]]
    .forEach(([t, r]) => addTier(`highDamageHits_${t}`, "highDamageHits", t, r,
      `会心の一撃・${t}`, `1回で10以上のダメージを${t}回与える`));

  // 凍結(氷)通算
  registerLine("freezeCount", "combat", "相手を凍結させる");
  [[10, 30], [30, 90], [60, 180]]
    .forEach(([t, r]) => addTier(`freeze_${t}`, "freezeCount", t, r,
      `氷結の刻・${t}`, `氷属性で相手を通算${t}回凍結させる`));

  // 毒付与(毒)通算
  registerLine("poisonApplyCount", "combat", "相手に毒を付与する");
  [[10, 30], [30, 90], [60, 180]]
    .forEach(([t, r]) => addTier(`poison_${t}`, "poisonApplyCount", t, r,
      `猛毒の使者・${t}`, `毒属性で相手に通算${t}回毒を付与する`));

  // 呪い付与(呪術)通算
  registerLine("curseApplyCount", "combat", "相手に呪いを付与する");
  [[10, 30], [30, 90], [60, 180]]
    .forEach(([t, r]) => addTier(`curse_${t}`, "curseApplyCount", t, r,
      `呪詛の連鎖・${t}`, `呪術属性で相手に通算${t}回呪いを付与する`));

  // 総獲得コイン
  registerLine("coinsEarnedTotal", "economy", "コインを稼ぐ");
  [[50, 10], [100, 20], [300, 50], [500, 80], [1000, 150], [2000, 280]]
    .forEach(([t, r]) => addTier(`coinsEarned_${t}`, "coinsEarnedTotal", t, r,
      `蓄財家・${t}`, `通算${t}コイン獲得する`));

  // ショップ購入回数
  registerLine("shopPurchaseCount", "economy", "ショップで購入する");
  [[1, 10], [5, 40], [10, 90]]
    .forEach(([t, r]) => addTier(`shopPurchase_${t}`, "shopPurchaseCount", t, r,
      `お買い物上手・${t}`, `ショップで通算${t}種類購入する`));

  // ストーリーのアイテムカード取得回数
  registerLine("itemCardsCollected", "economy", "アイテムカードを集める");
  [[3, 20], [10, 60], [20, 130]]
    .forEach(([t, r]) => addTier(`itemCards_${t}`, "itemCardsCollected", t, r,
      `カードコレクター・${t}`, `ストーリーモードでアイテムカードを通算${t}枚取得する`));

  // 全属性コンプリート系
  registerLine("attributesTriedCount", "attribute", "属性コンプリート(体験)");
  addTier("attrsTried_all", "attributesTriedCount", attrs.length, 300,
    "属性コンプリート(体験)", `全${attrs.length}属性でそれぞれ1回以上戦う`);
  registerLine("attributesWonCount", "attribute", "属性コンプリート(勝利)");
  addTier("attrsWon_all", "attributesWonCount", attrs.length, 500,
    "属性コンプリート(勝利)", `全${attrs.length}属性でそれぞれ1回以上勝利する`);

  return quests;
}

// タブの表示順・ラベル
const QUEST_CATEGORIES = [
  { id: "cpuBattle", label: "CPU戦" },
  { id: "attribute", label: "属性" },
  { id: "combat", label: "戦闘記録" },
  { id: "economy", label: "獲得・購入" }
];

const QUEST_CATALOG = {
  launchGame:      { name: "ようこそ",         desc: "ゲームを起動する",               target: 1,  reward: 10,  category: "cpuBattle" },
  fireBurst:       { name: "爆炎",             desc: "炎属性で攻撃力上昇を+5にする",   target: 5,  reward: 30,  category: "attribute" },
  thunderBolt:     { name: "雷騰雲奔",         desc: "雷属性で15以上のダメージを出す", target: 15, reward: 30,  category: "attribute" },
  permafrost:      { name: "永久凍土",         desc: "一度の戦闘で10回以上凍結する",   target: 10, reward: 50,  category: "combat" },
  // 属性ごとの固有クエスト(fireBurst/thunderBolt/permafrostと同じ「1戦闘内のピーク値」方式、2026-07-05追加)
  stoneGuard:      { name: "岩盤の守り",       desc: "石属性で1戦闘中にパワーを5回以上消費する",           target: 5,  reward: 30, category: "attribute" },
  waterBlessing:   { name: "泉の恵み",         desc: "水属性で1戦闘中にあいこで5回以上回復する",           target: 5,  reward: 30, category: "attribute" },
  windGust:        { name: "疾風怒濤",         desc: "風属性で風速を3にする",                              target: 3,  reward: 30, category: "attribute" },
  fighterBlade:    { name: "音速の蹴り",       desc: "格闘家属性で1戦闘中にチョキで5回勝利する",           target: 5,  reward: 30, category: "attribute" },
  poisonQueen:     { name: "猛毒の女王",       desc: "毒属性で相手の毒スタックを5まで積み上げる",          target: 5,  reward: 40, category: "attribute" },
  vampireThirst:   { name: "血の匂い",         desc: "吸血属性で1回の吸血回復量を8以上にする",             target: 8,  reward: 30, category: "attribute" },
  doppelMadness:   { name: "鏡合わせの狂気",   desc: "ドッペルゲンガー属性であいこを7回重ねて反撃ダメージを強化する", target: 7, reward: 40, category: "attribute" },
  curseAbyss:      { name: "呪いの深淵",       desc: "呪術属性で相手の呪いスタックを5まで積み上げる",      target: 5,  reward: 40, category: "attribute" },
  cannonBlast:     { name: "一撃必砲",         desc: "砲台属性で1回のグーで20以上のダメージを与える",      target: 20, reward: 40, category: "attribute" },
  gamblerJackpot:  { name: "運命の一振り",     desc: "ギャンブラー属性で1回の攻撃で15以上のダメージを出す", target: 15, reward: 40, category: "attribute" },
  magicianMastery: { name: "大魔導の極意",     desc: "マジシャン属性で永続攻撃力を+5にする",               target: 5,  reward: 40, category: "attribute" },
  berserkerRampage:{ name: "怒りの暴走",       desc: "バーサーカー属性で1戦闘中に合計30以上のダメージを与える", target: 30, reward: 40, category: "attribute" },
  // この2つはcpuBattlesPlayedの値をそのまま見るstatPath方式に統一(以前は専用のupdateQuestProgress呼び出しで管理していた)
  practiceMatters: { name: "練習は大事！",     desc: "CPU戦を5回遊ぶ",                 target: 5,  reward: 20,  statPath: "cpuBattlesPlayed", category: "cpuBattle" },
  bePrepared:      { name: "備えあれば憂いなし", desc: "CPU戦を20回遊ぶ",              target: 20, reward: 100, statPath: "cpuBattlesPlayed", category: "cpuBattle" },
  ...buildMilestoneQuests()
};

// 生成クエストにはcategoryを個別に持たせていないため、statPathからQUEST_LINE_METAを引いて補完する
Object.keys(QUEST_CATALOG).forEach(id => {
  const quest = QUEST_CATALOG[id];
  if (!quest.category && quest.statPath && QUEST_LINE_META[quest.statPath]) {
    quest.category = QUEST_LINE_META[quest.statPath].category;
  }
});

// 同じstatPath(または、statPathを持たない単独クエストは自分自身のid)を持つクエストを
// 「1本の進捗トラック」としてまとめるためのグループキー
function getQuestGroupKey(questId) {
  return QUEST_CATALOG[questId].statPath || questId;
}

// 画面に表示する行(グループ)一覧を、指定タブに属するものだけカテゴリ順・target昇順で返す
function getQuestLinesForCategory(category) {
  const groups = {};
  Object.keys(QUEST_CATALOG).forEach(id => {
    const quest = QUEST_CATALOG[id];
    if (quest.category !== category) return;
    const key = getQuestGroupKey(id);
    if (!groups[key]) groups[key] = [];
    groups[key].push(id);
  });
  const lines = Object.keys(groups).map(key => {
    const ids = groups[key].sort((a, b) => QUEST_CATALOG[a].target - QUEST_CATALOG[b].target);
    const meta = QUEST_LINE_META[key];
    const label = meta ? meta.label : QUEST_CATALOG[ids[0]].name;
    return { key, ids, label };
  });

  // 受け取り可能な段階が1つでもある行を上に表示し、すぐ見つけられるようにする(Array.sortは安定ソートなので、
  // 同じ優先度内の順序は元のまま維持される)
  lines.sort((a, b) => {
    const aClaimable = a.ids.some(isQuestClaimable) ? 0 : 1;
    const bClaimable = b.ids.some(isQuestClaimable) ? 0 : 1;
    return aClaimable - bClaimable;
  });

  return lines;
}

// 進捗だけを更新する(statPathを持たない、手動条件の少数クエスト専用)。
// 目標達成しても報酬は自動付与せず、claimQuestReward()を押すまで「獲得可能」状態で待機する
function updateQuestProgress(questId, value) {
  const record = saveData.quests.mainProgress[questId] || { progress: 0, claimed: false };
  if (value > record.progress) record.progress = value;
  saveData.quests.mainProgress[questId] = record;
  saveSaveData();
  updateQuestClaimableBadge();
}

// statPathを持つクエストはsaveData.statsから直接読み、持たない場合は従来通りmainProgressの保存値を読む
function getQuestProgress(questId) {
  const quest = QUEST_CATALOG[questId];
  if (quest.statPath) return getStatByPath(quest.statPath);
  const record = saveData.quests.mainProgress[questId];
  return record ? record.progress : 0;
}

function isQuestClaimable(questId) {
  const record = saveData.quests.mainProgress[questId];
  if (record && record.claimed) return false;
  return getQuestProgress(questId) >= QUEST_CATALOG[questId].target;
}

// クエスト画面で「獲得する」を押した時に呼ぶ。ここで初めて報酬コインが付与される
function claimQuestReward(questId) {
  if (!isQuestClaimable(questId)) return false;
  const record = saveData.quests.mainProgress[questId] || { progress: 0, claimed: false };
  record.claimed = true;
  saveData.quests.mainProgress[questId] = record;
  addCoins(QUEST_CATALOG[questId].reward); // addCoins内でsaveSaveData()される
  return true;
}

function countClaimableQuests() {
  return Object.keys(QUEST_CATALOG).filter(isQuestClaimable).length;
}

// モード選択画面の「クエスト」ボタン右上に、獲得可能なクエスト件数のバッジを出す
function updateQuestClaimableBadge() {
  const badge = document.getElementById("questClaimableBadge");
  if (!badge) return;

  const count = countClaimableQuests();
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = "flex";
  } else {
    badge.style.display = "none";
  }
}

// 現在選択中のタブ(画面を開くたびに1番目のタブへ戻す)
let currentQuestCategory = QUEST_CATEGORIES[0].id;

// resolveText: quest.name/descは文字列(既存クエスト)か、属性名を含む関数(生成クエスト)のどちらもありうる
function resolveQuestText(value) {
  return typeof value === "function" ? value() : value;
}

function renderQuestTabs() {
  document.getElementById("quest-tab-nav").innerHTML = QUEST_CATEGORIES.map(cat => `
    <button class="quest-tab-btn ${cat.id === currentQuestCategory ? "active" : ""}" data-category="${cat.id}">
      ${cat.label}
    </button>
  `).join("");
}

// 1本のクエストの列(同じstatPathの複数段階、またはstatPathを持たない単独クエスト)を
// 横一列の進捗トラックとして描画する
function renderQuestLine(line) {
  const finalTarget = QUEST_CATALOG[line.ids[line.ids.length - 1]].target;
  const current = getQuestProgress(line.ids[0]);
  const fillPct = Math.min(100, (current / finalTarget) * 100);
  const label = resolveQuestText(line.label);

  // 見出し(label)だけだと具体的な達成条件が分からない(特にstatPathを持たない単独クエスト)ため、
  // 「次に目指す段階」の説明文をタイトルの下に常時表示する。全段階を受け取り済みなら最後の段階の説明を出す
  const nextQuestId = line.ids.find(id => {
    const record = saveData.quests.mainProgress[id];
    return !(record && record.claimed);
  }) || line.ids[line.ids.length - 1];
  const activeDesc = resolveQuestText(QUEST_CATALOG[nextQuestId].desc);

  const nodesHtml = line.ids.map(id => {
    const quest = QUEST_CATALOG[id];
    const record = saveData.quests.mainProgress[id];
    const claimed = !!(record && record.claimed);
    const claimable = isQuestClaimable(id);
    const state = claimed ? "claimed" : claimable ? "claimable" : "locked";
    const desc = resolveQuestText(quest.desc);
    const posPct = Math.min(100, (quest.target / finalTarget) * 100);

    return `
      <div class="quest-node ${state}" data-quest="${id}" style="left:${posPct}%" title="${desc}">
        <div class="quest-node-dot">${claimed ? "✓" : ""}</div>
        <div class="quest-node-target">${quest.target}</div>
        <div class="quest-node-reward">${quest.reward}</div>
      </div>
    `;
  }).join("");

  return `
    <div class="quest-line">
      <div class="quest-line-header">
        <span class="quest-line-title">${label}</span>
        <span class="quest-line-count">${Math.min(current, finalTarget)} / ${finalTarget}</span>
      </div>
      <div class="quest-line-desc">${activeDesc}</div>
      <div class="quest-line-track">
        <div class="quest-line-track-fill" style="width:${fillPct}%"></div>
        ${nodesHtml}
      </div>
    </div>
  `;
}

function renderQuestList() {
  renderQuestTabs();

  const lines = getQuestLinesForCategory(currentQuestCategory);
  document.getElementById("quest-list").innerHTML = lines.map(renderQuestLine).join("");

  // このタブ内で獲得可能な数を「まとめて受け取る」ボタンのバッジに出す
  const claimableInTab = lines.reduce(
    (sum, line) => sum + line.ids.filter(isQuestClaimable).length, 0
  );
  const claimAllBadge = document.getElementById("questClaimAllBadge");
  if (claimAllBadge) {
    if (claimableInTab > 0) {
      claimAllBadge.textContent = claimableInTab;
      claimAllBadge.style.display = "inline-flex";
    } else {
      claimAllBadge.style.display = "none";
    }
  }
}

document.getElementById("quest-tab-nav").addEventListener("click", (e) => {
  const btn = e.target.closest(".quest-tab-btn");
  if (!btn) return;

  currentQuestCategory = btn.dataset.category;
  renderQuestList();
});

document.getElementById("quest-list").addEventListener("click", (e) => {
  const node = e.target.closest(".quest-node.claimable");
  if (!node) return;

  claimQuestReward(node.dataset.quest);
  renderQuestList();
  updateQuestClaimableBadge();
});

document.getElementById("quest-claim-all-btn").addEventListener("click", () => {
  const lines = getQuestLinesForCategory(currentQuestCategory);
  lines.forEach(line => {
    line.ids.forEach(id => {
      if (isQuestClaimable(id)) claimQuestReward(id);
    });
  });
  renderQuestList();
  updateQuestClaimableBadge();
});

const btnQuest = document.querySelector(".mode-btn.quest");
if (btnQuest) {
  btnQuest.addEventListener("click", () => {
    currentQuestCategory = QUEST_CATEGORIES[0].id;
    renderQuestList();
    showScreen("screen-quest");
  });
}

const btnQuestBack = document.getElementById("btn-quest-back");
if (btnQuestBack) {
  btnQuestBack.addEventListener("click", () => {
    showScreen("screen-mode");
  });
}
// ===== クエストここまで =====

// ファイルの先頭付近（既にあるなら重複させない）
let playerState = {};
let cpuState = {};
let freezeCountThisBattle = 0;
// 属性ごとの固有クエスト(fireBurst/thunderBolt/permafrostと同じ「1戦闘内のピーク値」方式)で使う、
// 1戦闘ごとにリセットする専用カウンタ
let waterHealCountThisBattle = 0;
let fighterScissorsWinCountThisBattle = 0;
let berserkerDamageThisBattle = 0;

// 汎用戦闘コンテキスト（CPU戦 / ストーリーモードで共有）
let battleContext = {
  mode: null,          // "cpu" | "story"
  stageId: null,       // ストーリーモードで選択中のステージ
  enemyIndex: 0,       // ストーリーモードで戦っている敵のインデックス
  itemCardsTaken: []   // ストーリーモードでそのランで取得したアイテムカードID
};
let selectedStageId = null;

// ===== ストーリーモード：ステージ / アイテムカード =====
const STAGE_CATALOG = {
  stage1: {
    name: "灼熱の坑道",
    intro: "火山の奥深くに眠る坑道。荒くれ者たちが巣食っている。",
    background: "./images/stage/1.png",
    reward: 100,
    // プレイヤーの基礎HP(fire25/thunder30/ice30)に合わせたスケール
    enemies: [
      { name: "はぐれ戦士", img: "./images/enemy/akasra.png",  attribute: "fire",    maxHp: 20, maxPower: 2, aiType: "aggressive" },
      { name: "氷の番人",   img: "./images/enemy/mizusra.png", attribute: "ice",     maxHp: 28, maxPower: 3, aiType: "defensive" },
      { name: "坑道の主",   img: "./images/enemy/akasra.png",  attribute: "thunder", maxHp: 40, maxPower: 4, aiType: "balanced" }
    ]
  }
};

const ITEM_CARD_CATALOG = {
  hpUp:        { name: "生命の欠片", desc: "最大HP+12（全回復）",             apply(p) { p.maxHp += 12; p.hp = p.maxHp; } },
  powerUp:     { name: "闘気の残滓", desc: "最大パワー+1",                   apply(p) { p.maxPower += 1; } },
  fireEmber:   { name: "業火の種",   desc: "（炎専用）攻撃力上昇+2",         apply(p) { p.fireAtkBonus = (p.fireAtkBonus || 0) + 2; }, attribute: "fire" },
  thunderCore: { name: "雷核",       desc: "（雷専用）チャージ+2",           apply(p) { p.thunderCharge = Math.min((p.thunderCharge || 0) + 2, 5); }, attribute: "thunder" },
  iceHeart:    { name: "氷結の心臓", desc: "（氷専用）凍結準備が発動済みに", apply(p) { p.freezeReady = true; }, attribute: "ice" }
};


function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => {
    s.classList.remove("active");
    s.style.display = "none";
  });

  const target = document.getElementById(id);
  if (target) {
    target.classList.add("active");
    target.style.display = "block";
  }
}


const titleScreen = document.getElementById("screen-title");

titleScreen.addEventListener("click", () => {

   // タイトルの文字を消す
  document.querySelector(".title-content").style.opacity = 0;

  // 黒帯を閉じる（中央に寄せる）
  closeCurtain();

  // 閉じ切って見えなくなってから画面を切り替える（戦闘画面への遷移と同じ手順）
  setTimeout(() => {
    resetCurtain();
    closeCurtain();
    showScreen("screen-mode");

    setTimeout(() => {
      openCurtain();
    }, 50);
  }, 600);
});

const screenMode = document.getElementById("screen-mode");

// 汎用 hover 関数
function addHoverEffect(btnSelector, bgClass) {
  const btn = document.querySelector(btnSelector);
  if (!btn) return;

  btn.addEventListener("mouseenter", () => {
    screenMode.classList.add(bgClass);
  });

  btn.addEventListener("mouseleave", () => {
    screenMode.classList.remove(bgClass);
  });
}

//汎用画像
function setBattleBackground(path) {
  const battle = document.getElementById("screen-battle");
  battle.style.backgroundImage = `url(${path})`;
}
function setEnemyImage(path) {
  document.getElementById("enemy-img").src = path;
}

//汎用画面
function closeCurtain() {
  document.querySelector(".curtain-top").classList.add("close");
  document.querySelector(".curtain-bottom").classList.add("close");
}
function openCurtain() {
  document.querySelector(".curtain-top").classList.add("open-top");
  document.querySelector(".curtain-bottom").classList.add("open-bottom");
}
function resetCurtain() {
  const top = document.querySelector(".curtain-top");
  const bottom = document.querySelector(".curtain-bottom");

  top.classList.remove("close", "open-top");
  bottom.classList.remove("close", "open-bottom");
}

function endJankenScene() {
    const overlay = document.getElementById("darkOverlay");
  overlay.classList.remove("show");
  const scene = document.getElementById("jankenScene");
  const battle = document.getElementById("battleScene");

  // 演出画面をフェードアウト
  scene.classList.remove("show");

  // 少し遅らせて戦闘画面を戻す
  setTimeout(() => {
    scene.style.display = "none";
    battle.style.display = "block";

    resetHandCards(); // ← 手札を初期状態に戻す
  }, 400);
}

// 前回の戦闘のカットイン・勝敗表示・出した手の表示は「show」クラスやsrcが残ったままになるため、
// 新しい戦闘画面に入る前に必ず消しておく（そのままだと#screen-battleがdisplay:noneから
// 表示された瞬間にアニメーションが最初から再生され、前回の演出が一瞬映ってしまう）
function resetBattleEffectsUI() {
  const bigResult = document.getElementById("bigResultText");
  bigResult.classList.remove("show", "win", "lose", "draw");
  bigResult.textContent = "";

  document.getElementById("bigAttackCutIn").classList.remove("show");

  document.getElementById("playerHandImg").src = "";
  document.getElementById("playerHandText").innerText = "";
  document.getElementById("cpuHandImg").src = "";
  document.getElementById("cpuHandText").innerText = "";
}

function resetHandCards() {
  document.querySelectorAll(".hand-card").forEach(card => {

    // アニメーション系クラスをリセット
    card.classList.remove("fly-away");
    card.classList.remove("selected");
    card.classList.remove("deal");

    // transform を JS で触らない（これが重要）
    card.style.opacity = 1;

    // 少し遅らせて deal を付け直す
    setTimeout(() => {
      card.classList.add("deal");
    }, 10);
  });
}

function playDamageEffect(damage) {
  const flash = document.getElementById("damageFlashLayer");

  // ★ ダメージSE
  seDamage.currentTime = 0;
  seDamage.play();

  // 赤フラッシュ
  flash.classList.add("damage-flash");

  // シェイク（画面全体を揺らす）
  // ※ document.body ではなく#screen-battleを揺らす。
  //   #game-canvasはposition:fixedで自身のtransformにより中央寄せされているため、
  //   bodyにtransformを付けるとbodyがfixed要素の基準(containing block)になってしまい、
  //   アニメーション中だけ#game-canvasが一瞬吹き飛んで画面が真っ暗に見える不具合があった。
  const battleScreen = document.getElementById("screen-battle");
  battleScreen.classList.add("shake");

  // ダメージ数字ポップ（プレイヤー側）
  if (damage) showDamageNumber("player", damage);

  // 終わったら元に戻す
  setTimeout(() => {
    flash.classList.remove("damage-flash");
    battleScreen.classList.remove("shake");
  }, 400);
}

function playCpuDamageEffect(damage) {
  const enemy = document.getElementById("enemy-img");

  // 赤フラッシュ
  enemy.classList.add("enemy-flash");

  // シェイク
  enemy.classList.add("enemy-shake");

  // ダメージ数字ポップ
  if (damage) showDamageNumber("cpu", damage);

  // ダメージSE
  seDamage.currentTime = 0;
  seDamage.play();

  // 終了処理
  setTimeout(() => {
    enemy.classList.remove("enemy-flash");
    enemy.classList.remove("enemy-shake");
  }, 400);
}

// プレイヤー/CPUどちらの上にもダメージ・回復の数字をポップさせる汎用関数
// side: "player" | "cpu"、opts.heal: trueなら回復("+N"・緑)として表示
function showDamageNumber(side, amount, opts = {}) {
  const layer = document.getElementById(
    side === "player" ? "playerDamageNumberLayer" : "cpuDamageNumberLayer"
  );
  if (!layer) return;

  const num = document.createElement("div");
  num.classList.add(side === "player" ? "player-damage-number" : "cpu-damage-number");
  if (opts.heal) num.classList.add("heal-number");
  num.innerText = `${opts.heal ? "+" : "-"}${amount}`;
  layer.appendChild(num);

  setTimeout(() => {
    num.remove();
  }, 600);
}

// じゃんけんの勝敗が決まった瞬間に画面中央へ大きく「WIN!/LOSE!/DRAW!」を出す演出
// type: "win" | "lose" | "draw"（プレイヤー視点）
function showBigResultText(type) {
  const el = document.getElementById("bigResultText");
  if (!el) return;

  const labels = { win: "WIN!", lose: "LOSE!", draw: "DRAW!" };
  el.textContent = labels[type];

  // 連続で出すときもアニメーションが再生されるよう、一度クラスを外して再付与する
  el.classList.remove("show", "win", "lose", "draw");
  void el.offsetWidth; // リフロー強制でアニメーションをリスタート
  el.classList.add("show", type);
}

// 10ダメージ以上になりそうな攻撃を出した時、「ぽん!」の前に流すカットイン演出
function showBigAttackCutIn() {
  const el = document.getElementById("bigAttackCutIn");
  if (!el) return;

  // アイコン画像・背景ともショップ/MYメニューで購入・装備できる（ICON_CATALOG/ICON_BG_CATALOG）
  const icon = document.getElementById("cutinIcon");
  const equippedIcon = ICON_CATALOG[saveData.equippedIcon] || ICON_CATALOG.akasra;
  if (icon) icon.src = equippedIcon.img;

  // 帯とアイコンの両方に同じ背景を適用する
  const iconBg = ICON_BG_CATALOG[saveData.equippedIconBg] || ICON_BG_CATALOG.red;
  el.style.background = iconBg.css;
  if (icon) icon.style.background = iconBg.css;

  el.classList.remove("show");
  void el.offsetWidth; // リフロー強制でアニメーションをリスタート
  el.classList.add("show");
}

// 10ダメージ以上が実際に着弾した瞬間の派手な演出（フラッシュ・大きめシェイク・SE）
function playBigImpactEffect() {
  const flash = document.getElementById("damageFlashLayer");
  flash.classList.add("damage-flash", "big-impact");
  // document.bodyではなく#screen-battleを揺らす（理由はplayDamageEffect内のコメント参照）
  const battleScreen = document.getElementById("screen-battle");
  battleScreen.classList.add("big-shake");

  if (seBigImpact) {
    seBigImpact.currentTime = 0;
    const playPromise = seBigImpact.play();
    // TODO: sounds/se/big_impact.mp3 を用意するまでは再生に失敗するので、静かに無視する
    if (playPromise && playPromise.catch) playPromise.catch(() => {});
  }

  setTimeout(() => {
    flash.classList.remove("damage-flash", "big-impact");
    battleScreen.classList.remove("big-shake");
  }, 500);
}

function endBattle(winner) {
  closeBattleMenu();

  // 決着時は通常ターンの endJankenScene() を経由しないため、
  // じゃんけん演出（暗幕・カード演出）が残ったままになる。ここで必ず片付ける。
  document.getElementById("darkOverlay").classList.remove("show");
  const jankenScene = document.getElementById("jankenScene");
  jankenScene.classList.remove("show");
  jankenScene.style.display = "none";

  // CPU戦を1回終えるたびにカウントする(practiceMatters/bePrepared等のstatPathクエストが自動追従する)
  incrementStat("cpuBattlesPlayed");

  // リザルトメッセージ
  if (winner === "player") {
    document.getElementById("resultMessage").innerText = "勝利！";
    incrementStat("cpuBattlesWon");
  } else {
    document.getElementById("resultMessage").innerText = "敗北…";
  }

  // 演出をリセットしてリザルト画面を表示
  document.getElementById("winLayer").style.opacity = 0;
  document.getElementById("enemy-img").classList.remove("enemyFadeOut");

  // resultScreen は screen-battle の内側にあるため showScreen() は使わず直接表示する
  document.getElementById("resultScreen").style.display = "flex";
}

// もう一度同じ相手と戦い直す
function rematchBattle() {
  document.getElementById("resultScreen").style.display = "none";
  resetBattleEffectsUI();
  trackAttributePlay(playerAttribute);

  playerState.hp = playerState.maxHp;
  playerState.power = 0;
  cpuState.hp = cpuState.maxHp;
  cpuState.power = 0;

  initAttribute(playerState, playerAttribute);
  initAttribute(cpuState, cpuAttribute);

  freezeCountThisBattle = 0;
  waterHealCountThisBattle = 0;
  fighterScissorsWinCountThisBattle = 0;
  berserkerDamageThisBattle = 0;

  document.getElementById("resultText").innerText = "";

  updateBattleUI();
  setupPlayerStatusWindow();
  setupCpuStatusWindow();

  resetHandCards();
}

// 戦闘を中断してモード選択 / CPU属性選択画面へ戻る
function exitBattleToScreen(targetScreenId) {
  // オンライン対戦中に途中で抜ける場合は、相手側にも通知してルームを片付ける
  if (battleContext.mode === "online") leaveOnlineRoom();

  document.getElementById("resultScreen").style.display = "none";
  document.getElementById("winLayer").style.opacity = 0;
  document.getElementById("enemy-img").classList.remove("enemyFadeOut");
  document.getElementById("resultText").innerText = "";

  stopBGM(bgmcpuBattle);
  bgmMode.volume = currentBgmVolume;
  bgmMode.play();

  showScreen(targetScreenId);
}

document.getElementById("restartBtn").addEventListener("click", () => {
  if (battleContext.mode === "online") {
    // オンライン対戦：サーバーへ再戦リクエストを送り、相手の準備を待つ(rematchReadyで属性選択に戻る)
    document.getElementById("resultScreen").style.display = "none";
    connectOnlineSocket().emit("playAgain");
    showOnlineWaiting("相手の再戦準備を待っています…");
    return;
  }
  rematchBattle();
});

document.getElementById("btn-result-to-attr").addEventListener("click", () => {
  exitBattleToScreen("screen-cpu-attr-select");
});

document.getElementById("btn-result-to-mode").addEventListener("click", () => {
  exitBattleToScreen("screen-mode");
});

// ===== ストーリーモード：画面ロジック =====
function renderStageList() {
  document.getElementById("stage-list").innerHTML = Object.keys(STAGE_CATALOG).map(id => {
    const stage = STAGE_CATALOG[id];
    const cleared = isStageCleared(id);
    return `
      <div class="stage-card clickable stage-option ${cleared ? "cleared" : ""}" data-stage="${id}">
        <div class="stage-card-info">
          <div class="stage-card-name">
            ${stage.name}
            ${cleared ? `<span class="stage-cleared-badge">クリア済み</span>` : ""}
          </div>
          <div class="stage-card-desc">${stage.intro}</div>
          <div class="stage-card-reward">クリア報酬：${stage.reward}コイン</div>
        </div>
        <div class="stage-card-image">
          <img src="${stage.background}" alt="${stage.name}">
        </div>
      </div>
    `;
  }).join("");
}

document.getElementById("stage-list").addEventListener("click", (e) => {
  const el = e.target.closest(".stage-option");
  if (!el) return;

  selectedStageId = el.dataset.stage;
  renderStageConfirm();
  showScreen("screen-stage-confirm");
});

function renderStageConfirm() {
  const stage = STAGE_CATALOG[selectedStageId];
  document.getElementById("stageConfirmName").innerText = stage.name;
  document.getElementById("stageConfirmIntro").innerText = stage.intro;
  document.getElementById("stageConfirmEnemies").innerText =
    "登場する敵の属性：" + stage.enemies.map(e => ATTR_DATA[e.attribute].name).join("・");
  document.getElementById("stageConfirmReward").innerText = `クリア報酬：${stage.reward}コイン`;
}

document.getElementById("btn-stage-select-back").addEventListener("click", () => {
  showScreen("screen-story-intro");
});

document.getElementById("btn-stage-confirm-back").addEventListener("click", () => {
  showScreen("screen-stage-select");
});

document.getElementById("btn-stage-confirm-enter").addEventListener("click", () => {
  renderAttrCards("attr-select-list");
  showScreen("screen-attr-select");
});

// 敵1体分をセットアップし、黒帯演出とともに戦闘画面へ（初回・2体目以降で共通利用）
function startStoryEnemy() {
  // 前の敵を倒した際は endJankenScene() を経由しないため、
  // じゃんけん演出（暗幕・カードオーバーレイ）が残ったままになる。ここで必ず片付ける。
  document.getElementById("darkOverlay").classList.remove("show");
  const jankenScene = document.getElementById("jankenScene");
  jankenScene.classList.remove("show");
  jankenScene.style.display = "none";
  document.getElementById("winLayer").style.opacity = 0;
  resetBattleEffectsUI();
  trackAttributePlay(playerAttribute);

  const stage = STAGE_CATALOG[battleContext.stageId];
  const enemy = stage.enemies[battleContext.enemyIndex];

  cpuAttribute = enemy.attribute;
  cpuState = {
    hp: enemy.maxHp,
    maxHp: enemy.maxHp,
    power: 0,
    maxPower: enemy.maxPower
  };
  initAttribute(cpuState, cpuAttribute);

  freezeCountThisBattle = 0;
  waterHealCountThisBattle = 0;
  fighterScissorsWinCountThisBattle = 0;
  berserkerDamageThisBattle = 0;

  setBattleBackground(stage.background);
  setEnemyImage(enemy.img);
  document.getElementById("enemy-img").classList.remove("enemyFadeOut");
  document.getElementById("cpu-attr-icon").src = ATTR_DATA[cpuAttribute].img;
  document.getElementById("player-attr-icon").src = ATTR_DATA[playerAttribute].img;

  updateBattleUI();
  setupPlayerStatusWindow();
  setupCpuStatusWindow();

  closeCurtain();

  setTimeout(() => {
    resetCurtain();
    closeCurtain();

    showScreen("screen-battle");

    setTimeout(() => {
      openCurtain();
      playEnemyZoomIn();

      setTimeout(() => {
        dealHandCards();
      }, 300);
    }, 50);
  }, 600);
}

function renderItemCardChoice() {
  const pool = Object.keys(ITEM_CARD_CATALOG).filter(id => {
    const card = ITEM_CARD_CATALOG[id];
    return !card.attribute || card.attribute === playerAttribute;
  });

  document.getElementById("item-card-list").innerHTML = pool.map(id => {
    const card = ITEM_CARD_CATALOG[id];
    return `
      <div class="skin-card clickable item-card-option" data-card="${id}">
        <div class="skin-name">${card.name}</div>
        <div class="skin-status">${card.desc}</div>
      </div>
    `;
  }).join("");
}

document.getElementById("item-card-list").addEventListener("click", (e) => {
  const el = e.target.closest(".item-card-option");
  if (!el) return;

  const cardId = el.dataset.card;
  ITEM_CARD_CATALOG[cardId].apply(playerState);
  battleContext.itemCardsTaken.push(cardId);
  incrementStat("itemCardsCollected");
  battleContext.enemyIndex++;

  startStoryEnemy();
});

// 敵を倒した直後の分岐：次の敵がいればアイテムカード選択、いなければステージクリア
function handleStoryEnemyDefeated() {
  const stage = STAGE_CATALOG[battleContext.stageId];
  const hasNextEnemy = battleContext.enemyIndex + 1 < stage.enemies.length;

  if (hasNextEnemy) {
    renderItemCardChoice();
    showScreen("screen-item-card-select");
  } else {
    endStoryRun(true);
  }
}

function endStoryRun(success) {
  closeBattleMenu();

  // じゃんけん演出の後片付け（endBattle()と同様の処理）
  document.getElementById("darkOverlay").classList.remove("show");
  const jankenScene = document.getElementById("jankenScene");
  jankenScene.classList.remove("show");
  jankenScene.style.display = "none";
  document.getElementById("winLayer").style.opacity = 0;
  document.getElementById("enemy-img").classList.remove("enemyFadeOut");

  const stage = STAGE_CATALOG[battleContext.stageId];
  const titleEl = document.getElementById("storyResultTitle");
  const bodyEl = document.getElementById("storyResultBody");

  if (success) {
    addCoins(stage.reward);
    markStageCleared(battleContext.stageId);
    titleEl.innerText = "ステージクリア！";
    const cardNames = battleContext.itemCardsTaken.map(id => ITEM_CARD_CATALOG[id].name);
    bodyEl.innerHTML = `
      <p>報酬：${stage.reward}コイン</p>
      <p>獲得したアイテムカード：${cardNames.length ? cardNames.join("、") : "なし"}</p>
    `;
  } else {
    titleEl.innerText = "敗北…";
    bodyEl.innerHTML = `<p>このランで得た成果は失われた。</p>`;
  }

  showScreen("screen-story-result");
}

document.getElementById("btn-story-result-to-stage-select").addEventListener("click", () => {
  exitBattleToScreen("screen-stage-select");
});

document.getElementById("btn-story-result-to-mode").addEventListener("click", () => {
  exitBattleToScreen("screen-mode");
});
// ===== ストーリーモードここまで =====

function getRandomAttribute() {
  const keys = Object.keys(ATTR_DATA);
  const index = Math.floor(Math.random() * keys.length);
  return keys[index];
}


//ステータス更新表示（ATTR_LOGIC[attr].getStatus() を使って属性ごとの分岐をなくす）
function renderStatusWindow(win, attribute, state) {
  const rows = ATTR_LOGIC[attribute].getStatus(state);

  // 毒・呪いなどの状態異常は、付与された側の属性に関わらず表示する
  if (state.poisonTurnsLeft > 0) {
    rows.push({ label: "毒ダメージ", value: `${state.poisonDamage}` });
    rows.push({ label: "毒の残りターン", value: `${state.poisonTurnsLeft}` });
  }
  if (state.curseStacks > 0) {
    rows.push({ label: "呪いスタック", value: `${state.curseStacks}` });
  }

  win.innerHTML = rows
    .map(row => `<div class="status-row"><span>${row.label}：</span><span>${row.value}</span></div>`)
    .join("");
}

function setupPlayerStatusWindow() {
  renderStatusWindow(document.getElementById("player-status-window"), playerAttribute, playerState);
}

function setupCpuStatusWindow() {
  renderStatusWindow(document.getElementById("cpu-status-window"), cpuAttribute, cpuState);
}

// グーのパワー消費量を求める。ATTR_LOGIC[attr].powerCostは固定値(数値)でも、
// 現在のパワー残量に応じて変わる関数(state => 消費量)でもよい（未指定なら2）
function getPowerCost(attribute, state) {
    const logic = ATTR_LOGIC[attribute];
    const cost = logic && logic.powerCost !== undefined ? logic.powerCost : 2;
    return typeof cost === "function" ? cost(state) : cost;
}

// グーでパワーを使った攻撃ができるかどうかを判定する。
// デフォルトは「コスト>0 かつ 現在パワーがコスト以上」。
// ATTR_LOGIC[attr].canUsePower(state, cost)を定義すれば上書き可能
// （ギャンブラーの確変中はパワー0でも攻撃できる、など）
function canUsePower(attribute, state, cost) {
    const logic = ATTR_LOGIC[attribute];
    if (logic && logic.canUsePower) return logic.canUsePower(state, cost);
    return cost > 0 && state.power >= cost;
}

// ギャンブラーのダイスロールダメージ（消費量1〜3に応じてダイス数が変わり、3以上は+5される）
function rollGamblerDamage(stacks) {
    if (stacks <= 0) return 0;
    const diceCount = Math.min(stacks, 3);
    let total = 0;
    for (let i = 0; i < diceCount; i++) {
        total += Math.floor(Math.random() * 5) + 1; // 1〜5のダイス
    }
    if (stacks >= 3) total += 5;
    return total;
}

function baseDamage(hand, usedPower, attribute, attackerState, powerCost) {
    // 属性ごとに基礎ダメージを上書きしたい場合はATTR_LOGIC[attr].getBaseDamageで対応
    const logic = ATTR_LOGIC[attribute];
    if (logic && logic.getBaseDamage) {
        const override = logic.getBaseDamage(hand, usedPower, attackerState, powerCost);
        if (override !== null && override !== undefined) return override;
    }

    if (hand === 2) return 4;      // チョキ
    if (hand === 1) return 2;      // パー
    if (hand === 0) return usedPower ? 7 : 1; // グー
}


// 属性補正計算

function attributeBonus(state, hand, attribute) {
    let bonus = 0;

    // ▼ 炎
    if (attribute === "fire") {

        // グー限定 fireAtkBonus
        if (hand === 0) {
            bonus += (state.fireAtkBonus || 0);
        }

        // 全手に乗る fireRage
        if (state.fireRage) {
            bonus += 2;
        }
    }

    // ▼ 雷
    if (attribute === "thunder") {
        if (state.thunderCharge >= 3 && state.thunderCharge < 5) {
            bonus += 1;
        }
        if (state.thunderCharge === 5) {
            bonus += 10;
        }
    }

    // ▼ 石（段階強化で積み上がる攻撃力上昇）
    if (attribute === "stone") {
        bonus += (state.stoneAtkBonus || 0);
    }

    // ▼ 風（風速3のとき火力上昇）
    if (attribute === "wind" && state.windSpeed === 3) {
        bonus += 4;
    }

    // ▼ マジシャン（パワー消費でランダムに積み上がる永続攻撃力）
    if (attribute === "magician") {
        bonus += (state.magicianAtkBonus || 0);
    }

    return bonus;
}

// 防御側の被ダメージ軽減計算
function damageReduction(state, attribute) {
    let reduction = 0;

    // ▼ 石
    if (attribute === "stone") {
        reduction += (state.stoneDefenseReduction || 0);
    }

    // ▼ マジシャン（パワー消費でランダムに積み上がる永続防御力、上限3）
    if (attribute === "magician") {
        reduction += (state.magicianDefBonus || 0);
    }

    return reduction;
}

// ローグライク補正計算（今はまだ0）
function roguelikeBonus(state) {
    return 0;
}


//ダメージ計算関数
function calcDamage(
    attackerState,
    defenderState,
    attackerHand,
    defenderHand,
    attackerAttribute,
    usedPower,   // ★ 追加
    defenderAttribute,
    attackerPowerCost   // ★ 追加（今回消費したパワー量。砲台のような可変ダメージ属性用）
) {

   // 勝敗判定
    const result = (attackerHand - defenderHand + 3) % 3;
    if (result !== 1) return 0;

    // ① 基礎ダメージ
    let damage = baseDamage(attackerHand, usedPower, attackerAttribute, attackerState, attackerPowerCost);

    // ② 属性補正
    damage += attributeBonus(attackerState, attackerHand, attackerAttribute);

    // ③ ローグライク補正（今はまだ0）
    damage += roguelikeBonus(attackerState);

    // ④ 防御側の被ダメージ軽減
    damage -= damageReduction(defenderState, defenderAttribute);

    return Math.max(0, damage);
}

// 実際に勝つかどうかに関わらず、この手を出したら何ダメージになるかを事前計算する
// （10ダメージ以上になりそうな攻撃を検知して、ぽん!前のカットイン演出を出すために使う）
function previewAttackDamage(attackerState, defenderState, hand, attackerAttribute, defenderAttribute) {
    const cost = getPowerCost(attackerAttribute, attackerState);
    const usedPower = hand === 0 && canUsePower(attackerAttribute, attackerState, cost);

    let damage = baseDamage(hand, usedPower, attackerAttribute, attackerState, cost);
    damage += attributeBonus(attackerState, hand, attackerAttribute);
    damage += roguelikeBonus(attackerState);
    damage -= damageReduction(defenderState, defenderAttribute);

    return Math.max(0, damage);
}

// CPUの性格（手の出し方の傾向）
const AI_TYPES = {
  aggressive: { rock: 0.6, scissors: 0.25, paper: 0.15 }, // 攻撃型
  defensive:  { rock: 0.2, scissors: 0.3,  paper: 0.5  }, // 防御型
  balanced:   { rock: 0.33, scissors: 0.33, paper: 0.34 }, // バランス型
};

function cpuChooseHand(aiType) {
  const ai = AI_TYPES[aiType];
  const r = Math.random();

  if (r < ai.rock) return 0; // グー
  if (r < ai.rock + ai.scissors) return 2; // チョキ
  return 1; // パー
}


//============================================================

function playEnemyZoomIn() {
  const enemy = document.getElementById("enemy-img");

  // 初期サイズに戻す（小さくしておく）
  enemy.classList.remove("zoom-in");

  // 少し待ってからズームイン（黒帯開いた瞬間に合わせる）
  setTimeout(() => {
    enemy.classList.add("zoom-in");
  }, 50);
}
function dealHandCards() {
  const cards = document.querySelectorAll(".hand-card");

  cards.forEach((card, index) => {
    // 初期状態に戻す（前回の対戦で fly-away したカードも戻す）
    card.classList.remove("deal", "fly-away", "selected");
    card.style.opacity = 1;

    // 少し遅らせて順番に配る
    setTimeout(() => {
      card.classList.add("deal");
    }, index * 120); // 120msずつ遅らせる
  });
}



// ストーリー
addHoverEffect(".mode-btn.story", "bg-story");
// オンライン
addHoverEffect(".mode-btn.online", "bg-online");
// ショップ
addHoverEffect(".mode-btn.shop", "bg-shop");
// クエスト
addHoverEffect(".mode-btn.quest", "bg-quest");
// CPU
addHoverEffect(".mode-btn.cpu", "bg-cpu");
// MYメニュー
addHoverEffect(".mode-btn.mymenu", "bg-mymenu");

const descriptions = {
  story: "ストーリーモード：物語を進めながら敵を倒していくモード",
  online: "オンライン対戦：ルームコードで友達と対戦できます。",
  shop: "ショップ：スキンや属性を購入できます。",
  quest: "クエスト：日替わりミッションに挑戦しよう。",
  cpu: "CPUバトル：コンピューターと練習できます。",
  mymenu: "マイメニュー：設定やプロフィールを確認できます。"
};

const modeButtons = document.querySelectorAll(".mode-btn");
const box = document.getElementById("mode-description");

modeButtons.forEach(btn => {
  btn.addEventListener("mouseenter", () => {
    const mode = btn.dataset.mode;  // story / online / shop など（クラス順に依存しないdata-mode属性から取得）
    box.textContent = descriptions[mode];
    box.style.bottom = "0px";       // ← 黒帯が上がってくる
  });

  btn.addEventListener("mouseleave", () => {
    box.style.bottom = "-180px";    // ← 黒帯が下に戻る
  });
});




let currentBgmVolume = 0.6;  // 初期値は好きに設定

const seClick = document.getElementById("se-click");
const seStart = document.getElementById("se-cancel");
const seCardFly = document.getElementById("se-card-fly");
const seDamage = document.getElementById("se-damage");
    const winSE = document.getElementById("se-gekiha");
const seBigImpact = document.getElementById("se-big-impact");


function playClick() {
  seClick.currentTime = 0; // 連打でも鳴るように
  seClick.play();
}

document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", playClick);
});
document.querySelectorAll(".primary-btn").forEach(btn => {
  btn.addEventListener("click", playClick);
});
document.querySelectorAll(".secondary-btn").forEach(btn => {
  btn.addEventListener("click", playClick);
});

document.querySelectorAll("#btn-attr-back").forEach(btn => {
  btn.addEventListener("click", playClick);
});
const seHover = document.getElementById("se-hover");


function playHover() {
  seHover.currentTime = 0;
  seHover.play();
}
document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("mouseenter", playHover);
});

document.querySelectorAll(".primary-btn").forEach(btn => {
  btn.addEventListener("mouseenter", playHover);
});

document.querySelectorAll(".secondary-btn").forEach(btn => {
  btn.addEventListener("mouseenter", playHover);
});

const seHoverCard = document.getElementById("se-HoverCard");

function playCardHoverSE() {
  seHoverCard.currentTime = 0;
  seHoverCard.play();
}


// ▼ 音源の取得
const bgmMode = document.getElementById("bgm-mode");
const bgmcpuBattle = document.getElementById("bgm-cpu-battle");

// ▼ 音量スライダー取得
const bgmSlider = document.getElementById("bgm-volume");
const seSlider = document.getElementById("se-volume");

// ▼ 起動時に保存された音量を読み込む
const savedBgm = localStorage.getItem("bgmVolume");
const savedSe  = localStorage.getItem("seVolume");

// BGM
if (savedBgm !== null) {
  const vol = Number(savedBgm);
  bgmSlider.value = vol;
  currentBgmVolume = vol;   // ← これが最重要
  bgmMode.volume = vol;
  bgmcpuBattle.volume = vol;
}

// SE
if (savedSe !== null) {
  const vol = Number(savedSe);
  seSlider.value = vol;
  seStart.volume = vol;
  seClick.volume = vol;
  seHover.volume = vol;
  seHoverCard.volume = vol;
  seCardFly.volume = vol;
  seDamage.volume = vol;
  winSE.volume = vol;
}


// ▼ モード画面BGMを流す
function playModeBGM() {
  bgmMode.volume = 0.6;
  bgmMode.play();
}

// ▼ BGMを止める（フェードアウト付き）
function stopBGM(bgm) {
  let vol = bgm.volume;
  const fade = setInterval(() => {
    vol -= 0.05;
    if (vol <= 0) {
      bgm.pause();
      bgm.currentTime = 0;
      clearInterval(fade);
    } else {
      bgm.volume = vol;
    }
  }, 50);
}

document.addEventListener("DOMContentLoaded", () => {

  const screenMode = document.getElementById("screen-mode");
  const screenMyMenu = document.getElementById("screen-mymenu");
  const btnMyMenu = document.querySelector(".mode-btn.mymenu");

 btnMyMenu.addEventListener("click", () => {
  renderMyMenuSkinList();
  renderMyMenuIconList();
  renderMyMenuIconBgList();
  renderIconPreview();
  showScreen("screen-mymenu");
});

// MYメニューのタブ切り替え（クリックしたタブのパネルだけ.activeにする）
document.querySelectorAll(".mymenu-tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".mymenu-tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".mymenu-tab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tabTarget).classList.add("active");
  });
});

  // 「ゲームを起動する」クエストの進捗を記録し、クエストボタンのバッジを初期表示する
  updateQuestProgress("launchGame", 1);
  updateModeCoinsDisplay();
  updateModeProfileDisplay();

});


// ▼ タイトル画面クリックで処理
document.getElementById("screen-title").addEventListener("click", () => {

  // 画面の向きを横に固定（対応ブラウザのみ。iOS Safari等は非対応なので
  // 失敗しても無視する。縦向きの案内は.rotate-overlay（CSS）が担当）
  screen.orientation?.lock?.("landscape").catch(() => {});

  // SE 再生
  seClick.currentTime = 0;
  seClick.play();

  // モード画面BGMを再生（カーテンの遷移でモード画面に切り替わるタイミングに合わせる）
 setTimeout(() => {
    bgmMode.volume = currentBgmVolume
    bgmMode.play();
  }, 650); // ← ここを変えれば遅延時間を調整できる
});


// 音量調整はMYメニュー設定タブ・戦闘画面メニューの両方から呼べるよう、変更処理を共通化する
// （両方のスライダーの見た目もここで一緒に同期する）
function setBgmVolume(vol) {
  currentBgmVolume = vol;
  localStorage.setItem("bgmVolume", vol);
  bgmMode.volume = vol;
  bgmcpuBattle.volume = vol;
  bgmSlider.value = vol;
  if (battleBgmSlider) battleBgmSlider.value = vol;
}

function setSeVolume(vol) {
  localStorage.setItem("seVolume", vol);
  seStart.volume = vol;
  seClick.volume = vol;
  seHover.volume = vol;
  seHoverCard.volume = vol;
  seCardFly.volume = vol;
  seDamage.volume = vol;
  winSE.volume = vol;
  seSlider.value = vol;
  if (battleSeSlider) battleSeSlider.value = vol;
}

// ▼ BGM音量変更
bgmSlider.addEventListener("input", () => {
  setBgmVolume(Number(bgmSlider.value));
});

// ▼ SE音量変更
seSlider.addEventListener("input", () => {
  setSeVolume(Number(seSlider.value));
});

// ===== 汎用確認モーダル（window.confirm()の代わりにゲーム内デザインで確認を挟む） =====
const confirmModal = document.getElementById("confirmModal");
const confirmModalMessage = document.getElementById("confirmModalMessage");
const confirmModalYes = document.getElementById("confirmModalYes");
const confirmModalNo = document.getElementById("confirmModalNo");

// message: 表示する確認文言 / onConfirm: 「はい」を押したときだけ呼ばれる処理
function showConfirmModal(message, onConfirm) {
  confirmModalMessage.textContent = message;
  confirmModal.classList.add("show");

  const onYes = () => {
    cleanup();
    onConfirm();
  };
  const onNo = () => {
    cleanup();
  };
  function cleanup() {
    confirmModal.classList.remove("show");
    confirmModalYes.removeEventListener("click", onYes);
    confirmModalNo.removeEventListener("click", onNo);
  }

  confirmModalYes.addEventListener("click", onYes);
  confirmModalNo.addEventListener("click", onNo);
}

// ===== 名前入力モーダル（window.prompt()の代わりにゲーム内デザインでテキスト入力を挟む） =====
const nameEditModal = document.getElementById("nameEditModal");
const nameEditModalMessage = document.getElementById("nameEditModalMessage");
const nameEditModalInput = document.getElementById("nameEditModalInput");
const nameEditModalSave = document.getElementById("nameEditModalSave");
const nameEditModalCancel = document.getElementById("nameEditModalCancel");

// message: 見出し文言 / currentValue: 入力欄の初期値 / onSave: 「保存」を押した時だけ、トリム後の文字列を受け取って呼ばれる
function showNameEditModal(message, currentValue, onSave) {
  nameEditModalMessage.textContent = message;
  nameEditModalInput.value = currentValue;
  nameEditModal.classList.add("show");
  nameEditModalInput.focus();
  nameEditModalInput.select();

  const onSaveClick = () => {
    const trimmed = nameEditModalInput.value.trim();
    cleanup();
    if (trimmed) onSave(trimmed);
  };
  const onCancelClick = () => {
    cleanup();
  };
  const onKeydown = (e) => {
    if (e.key === "Enter") onSaveClick();
    if (e.key === "Escape") onCancelClick();
  };
  function cleanup() {
    nameEditModal.classList.remove("show");
    nameEditModalSave.removeEventListener("click", onSaveClick);
    nameEditModalCancel.removeEventListener("click", onCancelClick);
    nameEditModalInput.removeEventListener("keydown", onKeydown);
  }

  nameEditModalSave.addEventListener("click", onSaveClick);
  nameEditModalCancel.addEventListener("click", onCancelClick);
  nameEditModalInput.addEventListener("keydown", onKeydown);
}

// ===== 戦闘画面：左上メニュー（音量調整・リスタート・降参） =====
const battleMenuBtn = document.getElementById("battle-menu-btn");
const battleMenuPanel = document.getElementById("battleMenuPanel");
const battleBgmSlider = document.getElementById("battle-bgm-volume");
const battleSeSlider = document.getElementById("battle-se-volume");

function closeBattleMenu() {
  battleMenuPanel.classList.remove("show");
}

if (battleMenuBtn && battleMenuPanel) {
  battleMenuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    // 開いた瞬間、現在の音量をパネルのスライダーに反映する
    battleBgmSlider.value = currentBgmVolume;
    battleSeSlider.value = seSlider.value;
    battleMenuPanel.classList.toggle("show");
  });

  // パネルの外側をクリックしたら閉じる
  document.addEventListener("click", (e) => {
    if (!battleMenuPanel.classList.contains("show")) return;
    if (battleMenuPanel.contains(e.target)) return;
    closeBattleMenu();
  });
}

if (battleBgmSlider) {
  battleBgmSlider.addEventListener("input", () => {
    setBgmVolume(Number(battleBgmSlider.value));
  });
}

if (battleSeSlider) {
  battleSeSlider.addEventListener("input", () => {
    setSeVolume(Number(battleSeSlider.value));
  });
}

document.getElementById("battle-menu-restart").addEventListener("click", () => {
  closeBattleMenu();
  showConfirmModal("戦闘をリスタートしますか？", () => {
    rematchBattle();
  });
});

document.getElementById("battle-menu-surrender").addEventListener("click", () => {
  closeBattleMenu();
  showConfirmModal("降参しますか？この戦闘は敗北扱いになります。", () => {
    playerState.hp = 0;
    handlePlayerDefeated();
  });
});


// DOMContentLoaded 内に既にあるならその中に追加
const btnBack = document.getElementById("btn-back-to-mode");
if (btnBack) {
  btnBack.addEventListener("click", () => {
    // 効果音（あれば）
    if (typeof seClick !== "undefined" && seClick) {
      seClick.currentTime = 0;
      seClick.play();
    }
    // モード画面へ戻す
    showScreen("screen-mode");
  });
}


document.addEventListener("DOMContentLoaded", () => {
  // 汎用 showScreen 関数は既に定義済みなのでここでは使うだけ
  

  // ボタン参照（存在チェックあり）
  const btnStory = document.querySelector(".mode-btn.story");
  const btnStoryBack = document.getElementById("btn-story-back");
  const btnToAttr = document.getElementById("btn-to-attr");

  if (btnStory) {
    btnStory.addEventListener("click", () => {
      showScreen("screen-story-intro");
    });
  }

  if (btnStoryBack) {
    btnStoryBack.addEventListener("click", () => {
      showScreen("screen-mode"); // screen-mode が存在すること
    });
  }

  if (btnToAttr) {
    btnToAttr.addEventListener("click", () => {
      renderStageList();
      showScreen("screen-stage-select");
    });
  }

  // 初期画面をタイトルにする場合
  // showScreen("screen-title");
});

// 戻るボタン
document.getElementById("btn-attr-back").addEventListener("click", () => {
  showScreen("screen-story-intro");
});

let playerAttribute = null;

const ATTR_DATA = {
  fire: {
    name: "炎",
    img: "images/attr/fire.png",
    shortDesc: "パワー消費で火力上昇。HP10以下でさらに強化。",
    desc: "攻撃的で高火力の属性。パワーを消費するたびに攻撃力が上昇し、体力が10以下になると攻撃力がさらに上昇する。体力が少し少ない"
  },
  ice: {
    name: "氷",
    img: "images/attr/ice.png",
    shortDesc: "勝利で相手のパワー獲得を封じる。",
    desc: "冷気で相手の動きを鈍らせる属性。じゃんけんに勝利することで相手のパワー獲得を阻害することができる。"
  },
  thunder: {
    name: "雷",
    img: "images/attr/thunder.png",
    shortDesc: "チャージを溜めて大技を狙う一撃属性。",
    desc: "素早く強烈な一撃を放つ属性。チャージ３回で攻撃力が上昇し、チャージ５回で大ダメージを与えることができる。"
  },
  stone: {
    name: "石",
    img: "images/attr/stone.png",
    shortDesc: "パワー消費で防御と攻撃を積み上げる。",
    desc: "パワーを消費するたびに段階的に強化される、腰を据えた防御型の属性。被ダメージ軽減と攻撃力上昇を積み重ねていく。"
  },
  water: {
    name: "水",
    img: "images/attr/water.png",
    shortDesc: "あいこでHPとパワーが回復する。",
    desc: "あいこになるとHPが回復し、パワーも溜まっていく持久戦向けの属性。"
  },
  wind: {
    name: "風",
    img: "images/attr/wind.png",
    shortDesc: "手を変えて風速を稼ぎ火力を上げる。",
    desc: "手を切り替えて風速を稼ぎ、風速が3になると一気に火力が跳ね上がるテクニカルな属性。"
  },
  fighter: {
    name: "格闘家",
    img: "images/attr/fighter.png",
    shortDesc: "低コストで手数を稼ぐ接近戦特化。",
    desc: "パワー上限が高く、グーのパワー消費が1と軽い接近戦特化の属性。パーでパワーを大きく獲得でき、チョキは常に固定5ダメージを与える。"
  },
  poison: {
    name: "毒",
    img: "images/attr/poison.png",
    shortDesc: "勝利で毒を付与し継続ダメージを与える。",
    desc: "じゃんけんに勝利すると相手に毒を付与し、3ターンの間毎ターンダメージを与え続ける。毒が残っている間に再度勝利すると、毒ダメージが積み重なる。その分HPは低め。"
  },
  vampire: {
    name: "吸血",
    img: "images/attr/vampire.png",
    shortDesc: "与ダメージの半分を吸収して回復する。",
    desc: "与えたダメージの半分を自分のHPとして吸収する属性。パワーを消費したグーの攻撃は固定5ダメージ。"
  },
  doppel: {
    name: "ドッペルゲンガー",
    img: "images/attr/doppel.png",
    shortDesc: "あいこで相手に反撃ダメージを与える。",
    desc: "あいこになると相手に反撃ダメージを与える異形の属性。じゃんけんに勝利した際のダメージは手の種類に関わらず一律2固定。あいこを7回重ねると反撃ダメージが強化される。"
  },
  curse: {
    name: "呪術",
    img: "images/attr/curse.png",
    shortDesc: "パワー消費で相手に呪いを蓄積させる。",
    desc: "グーが命中したかどうかに関わらず、パワーを消費すると相手に呪いを付与する属性。呪われた相手はパーを出すたびにスタック数分のダメージを受ける。呪いは重複して積み重なる。"
  },
  cannon: {
    name: "砲台",
    img: "images/attr/cannon.png",
    shortDesc: "被弾でパワーが溜まる高火力な砲台。",
    desc: "パワー上限20の重火力型属性。被ダメージ時にパワーが+5溜まり、グーを出すと現在のパワーを全消費してその2倍のダメージを与える。"
  },
  gambler: {
    name: "ギャンブラー",
    img: "images/attr/gambler.png",
    shortDesc: "全パワー消費でダイス勝負の一撃を放つ。",
    desc: "グーを出すと所持パワーを全消費し、消費量に応じたダイスロールでダメージが変動する一発逆転型の属性。パワー消費時に25%の確率で「確変」に突入し、4ターンの間パワー消費なしで攻撃できる。"
  },
  magician: {
    name: "マジシャン",
    img: "images/attr/magician.png",
    shortDesc: "パワー消費でランダムに成長していく。",
    desc: "パワーを2消費すると「永続攻撃力+1」「永続防御力+1(上限3)」「HP4回復」のいずれかがランダムに発動する成長型の属性。"
  },
  berserker: {
    name: "バーサーカー",
    img: "images/attr/berserker.png",
    shortDesc: "自傷しつつ固定高火力で殴り続ける。",
    desc: "HP80の高耐久だが毎ターンHPが5ずつ減っていく属性。どの手を出しても6ダメージの固定火力を持ち、パワーを消費したグーはさらに+3ダメージを与える。"
  }
};



function initAttribute(player, attr) {
  ATTR_LOGIC[attr].init(player);
}

// 属性選択画面のカードをATTR_DATAから生成する（属性を足すたびにHTMLを触らなくて済むように）
function renderAttrCards(containerId) {
  document.getElementById(containerId).innerHTML = Object.keys(ATTR_DATA).map(attr => {
    const data = ATTR_DATA[attr];
    return `
      <div class="attr-card" data-attr="${attr}">
        <img src="${data.img}" alt="${attr}">
        <h3>${data.name}</h3>
        <p>${data.shortDesc}</p>
      </div>
    `;
  }).join("");
}

document.getElementById("attr-select-list").addEventListener("click", (e) => {
  const card = e.target.closest(".attr-card");
  if (!card) return;

  const attr = card.dataset.attr;
  playerAttribute = attr;

  // 属性確認画面に情報を流し込む
  const data = ATTR_DATA[attr];
  document.getElementById("attr-confirm-img").src = data.img;
  document.getElementById("attr-confirm-name").textContent = data.name;
  document.getElementById("attr-confirm-desc").textContent = data.desc;

  showScreen("screen-attr-confirm");
});

document.getElementById("btn-confirm-back").addEventListener("click", () => {

  showScreen("screen-attr-select");
});

document.getElementById("btn-to-stage").addEventListener("click", () => {
  battleContext.mode = "story";
  battleContext.stageId = selectedStageId;
  battleContext.enemyIndex = 0;
  battleContext.itemCardsTaken = [];

  playerState = {
    hp: ATTR_BASE_STATUS[playerAttribute].maxHp,
    maxHp: ATTR_BASE_STATUS[playerAttribute].maxHp,
    power: 0,
    maxPower: ATTR_BASE_STATUS[playerAttribute].maxPower
  };
  initAttribute(playerState, playerAttribute);

  stopBGM(bgmMode);
  bgmcpuBattle.volume = currentBgmVolume;
  bgmcpuBattle.currentTime = 0;
  bgmcpuBattle.play();

  startStoryEnemy();
});


document.getElementById("btn-mode-cpu").addEventListener("click", () => {
  gameMode = "cpu";
  battleContext.mode = "cpu"; // オンライン対戦と属性選択/確認画面を共用するため、この時点で確定させておく
  renderAttrCards("cpu-attr-select-list");
  document.getElementById("cpu-attr-select-title").textContent = "CPU戦の属性を選択";
  showScreen("screen-cpu-attr-select");

  document.getElementById("screen-cpu-attr-select").classList.add("bg-cpu-attr");
});

document.getElementById("cpu-attr-select-list").addEventListener("click", (e) => {
  const card = e.target.closest(".attr-card");
  if (!card) return;

  const attr = card.dataset.attr;
  playerAttribute = attr;

  // CPU専用の属性確認画面へ(オンライン対戦でも同じ画面を流用する)
  showScreen("screen-cpu-attr-confirm");
  document.getElementById("cpu-attr-confirm-title").textContent =
    battleContext.mode === "online" ? "オンライン対戦 属性確認" : "CPU戦 属性確認";

  const data = ATTR_DATA[attr];

  document.getElementById("cpu-attr-confirm-img").src = data.img;
  document.getElementById("cpu-attr-confirm-text").textContent = data.desc;

  document.getElementById("screen-cpu-attr-confirm").classList.add("bg-cpu-attr");
});

  const btnCpuAttrBack = document.getElementById("btn-cpu-attr-back");

if (btnCpuAttrBack) {
  btnCpuAttrBack.addEventListener("click", () => {
    if (battleContext.mode === "online") leaveOnlineRoom();
    showScreen("screen-mode");
  });
}

const btnCpuAttrConfirmBack = document.getElementById("btn-cpu-attr-confirm-back");

if (btnCpuAttrConfirmBack) {
  btnCpuAttrConfirmBack.addEventListener("click", () => {
    showScreen("screen-cpu-attr-select");
  });
}

// CPU戦・オンライン対戦共通の「戦闘準備」処理。オンラインではattributeが確定した後(battleStart受信時)に呼ぶ
function beginVersusBattle(mode, opponentAttribute, enemyImgPath) {
  battleContext.mode = mode;

  if (!playerAttribute) {
    playerAttribute = "fire"; // デフォルト（何でもいい）
  }

  // CPU戦背景セット（自由に変えられる）
  setBattleBackground("./images/ui/cpu_buttle.png");
  cpuAttribute = opponentAttribute;
  resetBattleEffectsUI();
  trackAttributePlay(playerAttribute);

  playerState = {
    hp: ATTR_BASE_STATUS[playerAttribute].maxHp,
    maxHp: ATTR_BASE_STATUS[playerAttribute].maxHp,
    power: 0,
    maxPower: ATTR_BASE_STATUS[playerAttribute].maxPower
  };

  cpuState = {
    hp: ATTR_BASE_STATUS[cpuAttribute].maxHp,
    maxHp: ATTR_BASE_STATUS[cpuAttribute].maxHp,
    power: 0,
    maxPower: ATTR_BASE_STATUS[cpuAttribute].maxPower
  };

  initAttribute(playerState, playerAttribute);
  initAttribute(cpuState, cpuAttribute);

  freezeCountThisBattle = 0;
  waterHealCountThisBattle = 0;
  fighterScissorsWinCountThisBattle = 0;
  berserkerDamageThisBattle = 0;

  updateBattleUI();

  stopBGM(bgmMode);

  bgmcpuBattle.volume = currentBgmVolume;
  bgmcpuBattle.currentTime = 0;
  bgmcpuBattle.play();

  setEnemyImage(enemyImgPath);

  // ① CPU属性確認画面の黒帯を閉じる
  closeCurtain();

  // ② 黒帯が閉じるまで待つ（0.6s）
  setTimeout(() => {

    // ③ 戦闘画面の黒帯を閉じた状態にリセット
    resetCurtain();
    closeCurtain(); // ← 戦闘画面は閉じた状態で待機

    // ④ 戦闘画面へ切り替え
    showScreen("screen-battle");
    // プレイヤー属性アイコンをセット
  document.getElementById("player-attr-icon").src = ATTR_DATA[playerAttribute].img;


    // CPU属性アイコン
   document.getElementById("cpu-attr-icon").src =
    ATTR_DATA[cpuAttribute].img;

    // ⑤ 戦闘画面が表示された瞬間に黒帯を開く
    setTimeout(() => {
      openCurtain();
      playEnemyZoomIn();

      setTimeout(() => {
        dealHandCards();
      },300 );
    }, 50);

  }, 600); // ← CSS の transition と同じ 0.6s

  setupPlayerStatusWindow();
  setupCpuStatusWindow();
}

document.getElementById("btn-cpu-attr-confirm-next").addEventListener("click", () => {
  if (battleContext.mode === "online") {
    // オンライン対戦：自分の属性をサーバーに送り、相手の選択を待つ(battleStart受信でbeginVersusBattleが呼ばれる)
    connectOnlineSocket().emit("chooseAttribute", { attribute: playerAttribute });
    showOnlineWaiting("相手の属性選択を待っています…");
    return;
  }

  beginVersusBattle("cpu", getRandomAttribute(), "./images/enemy/mizusra.png");
});

//属性処理
const ATTR_LOGIC = {
  fire: {
    name: "炎",
    init(player) {
      player.fireAtkBonus = 0;
      player.fireRage = false;
    },

    onPowerUse(player) {
      player.fireAtkBonus++;
    },
    onHpChange(player) {
      if (player.hp <= 10) {
        player.fireRage = true;
      }
    },
    getStatus(player) {
      return [
        { label: "攻撃力上昇", value: `+${player.fireAtkBonus}` },
        { label: "怒り状態", value: player.fireRage ? "ON" : "OFF" }
      ];
    }
  },

  thunder: {
    name: "雷",
    init(player) {
      player.thunderCharge = 0;
    },
    onPowerUse(player) {
      player.thunderCharge++;
      if (player.thunderCharge > 5) player.thunderCharge = 5;
    },
    getStatus(player) {
      return [
        { label: "チャージ", value: `${player.thunderCharge} / 5` }
      ];
    }
  },

  ice: {
    name: "氷",
    init(player) {
      player.freezeReady = false;
    },
    onWin(player) {
      player.freezeReady = true;
    },
    getStatus(player) {
      return [
        { label: "凍結準備", value: player.freezeReady ? "READY" : "NO" }
      ];
    }
  },

  stone: {
    name: "石",
    init(player) {
      player.stoneUseCount = 0;
      player.stoneDefenseReduction = 0;
      player.stoneAtkBonus = 0;
    },
    onPowerUse(player) {
      player.stoneUseCount++;

      if (player.stoneUseCount === 1) {
        player.stoneDefenseReduction += 1;
      } else if (player.stoneUseCount === 2) {
        player.stoneAtkBonus += 1;
      } else if (player.stoneUseCount === 3) {
        player.stoneDefenseReduction += 1;
      } else if (player.stoneUseCount > 3 && (player.stoneUseCount - 3) % 2 === 0) {
        player.maxPower += 1;
      }
    },
    getStatus(player) {
      return [
        { label: "被ダメージ軽減", value: `-${player.stoneDefenseReduction}` },
        { label: "攻撃力上昇", value: `+${player.stoneAtkBonus}` }
      ];
    }
  },

  water: {
    name: "水",
    init(player) {
      // 追加の状態は持たない（hp/powerは既存フィールドを流用）
    },
    onDraw(player) {
      const healAmount = Math.min(3, player.maxHp - player.hp);
      player.hp = Math.min(player.hp + 3, player.maxHp);
      player.power = Math.min(player.power + 1, player.maxPower);
      return { heal: healAmount }; // UIのポップアップ表示に使う
    },
    getBaseDamage(hand, usedPower) {
      if (hand === 0 && usedPower) return 6; // グー(パワー消費時)は固定6ダメージ
      return null;
    },
    getStatus(player) {
      return [
        { label: "あいこ時の恩恵", value: "HP+3 / パワー+1" }
      ];
    }
  },

  wind: {
    name: "風",
    init(player) {
      player.windSpeed = 0;
      player.windLastHand = null;
    },
    onHandPlayed(player, hand) {
      if (player.windSpeed === 3) {
        player.windSpeed = 0;
      } else if (player.windLastHand !== null) {
        if (hand === player.windLastHand) {
          player.windSpeed = Math.max(0, player.windSpeed - 1);
        } else {
          player.windSpeed = Math.min(player.windSpeed + 1, 3);
        }
      }
      player.windLastHand = hand;
    },
    onWin(player, hand, usedPower) {
      if (hand === 0 && usedPower) {
        player.windSpeed = Math.min(player.windSpeed + 2, 3);
      }
    },
    getStatus(player) {
      return [
        { label: "風速", value: `${player.windSpeed} / 3` }
      ];
    }
  },

  fighter: {
    name: "格闘家",
    init(player) {
      // 追加の状態は持たない（hp/powerは既存フィールドを流用）
    },
    powerCost: 1,   // グーのパワー消費量（通常は2）
    paperGain: 2,   // パーで得るパワー量（通常は1）
    getBaseDamage(hand, usedPower) {
      if (hand === 2) return 5; // チョキは固定5ダメージ
      return null; // グー・パーは通常計算に任せる
    },
    getStatus(player) {
      return [
        { label: "グー消費パワー", value: "1" },
        { label: "パー獲得パワー", value: "+2" }
      ];
    }
  },

  poison: {
    name: "毒",
    init(player) {
      player.poisonDamage = 0;
      player.poisonTurnsLeft = 0;
    },
    onWin(player, hand, usedPower, damage, defenderState) {
      applyPoison(defenderState);
    },
    getStatus(player) {
      return [
        { label: "毒付与", value: "1ダメージ/3ターン(重複で+1)" }
      ];
    }
  },

  vampire: {
    name: "吸血",
    init(player) {
      // 追加の状態は持たない（hp/powerは既存フィールドを流用）
    },
    getBaseDamage(hand, usedPower) {
      if (hand === 0 && usedPower) return 5; // グー(パワー消費時)は固定5ダメージ
      return null;
    },
    onWin(player, hand, usedPower, damage) {
      const healAmount = Math.floor(damage / 2);
      const actualHeal = Math.min(healAmount, player.maxHp - player.hp);
      player.hp = Math.min(player.hp + healAmount, player.maxHp);
      return actualHeal; // 実際に回復した量を返し、UIのポップアップ表示に使う
    },
    getStatus(player) {
      return [
        { label: "吸血", value: "与ダメージの50%を回復" }
      ];
    }
  },

  doppel: {
    name: "ドッペルゲンガー",
    init(player) {
      player.doppelDrawCount = 0;
    },
    onDraw(player, opponent) {
      player.doppelDrawCount++;
      const dmg = player.doppelDrawCount >= 7 ? 5 : 3;
      opponent.hp = Math.max(0, opponent.hp - dmg);
      return { damage: dmg }; // UIのポップアップ表示に使う
    },
    getBaseDamage(hand, usedPower) {
      return 2; // 勝利時のダメージは手の種類に関わらず一律2固定
    },
    getStatus(player) {
      return [
        { label: "あいこ回数", value: `${player.doppelDrawCount}` },
        { label: "あいこ反撃ダメージ", value: player.doppelDrawCount >= 7 ? "5" : "3" }
      ];
    }
  },

  curse: {
    name: "呪術",
    init(player) {
      // 呪いスタック(curseStacks)は呪われた側に付与される汎用フィールドなので、
      // 呪術属性自身は特別な初期状態を持たない
    },
    onPowerUse(player, opponent) {
      // グーが当たったかどうかに関わらず、パワーを消費した時点で相手に呪いを付与する
      opponent.curseStacks = (opponent.curseStacks || 0) + 1;
    },
    getStatus(player) {
      return [
        { label: "呪い付与条件", value: "パワー消費で相手に+1スタック" }
      ];
    }
  },

  cannon: {
    name: "砲台",
    init(player) {
      // 追加の状態は持たない（hp/powerは既存フィールドを流用）
    },
    powerCost(state) {
      return state.power; // 現在パワーを全消費
    },
    onHpChange(player) {
      // 被ダメージ時にパワーが溜まる
      player.power = Math.min(player.power + 5, player.maxPower);
    },
    getBaseDamage(hand, usedPower, attackerState, powerCost) {
      if (hand === 0 && usedPower) return powerCost * 2; // 消費量×2ダメージ
      return null;
    },
    getStatus(player) {
      return [
        { label: "被弾時パワー獲得", value: "+5" },
        { label: "グー消費量", value: "現在パワー全て" }
      ];
    }
  },

  gambler: {
    name: "ギャンブラー",
    init(player) {
      player.gamblerKakuhenTurns = 0;
    },
    // 確変中はパワー0でも攻撃可能。それ以外は通常通りパワーが1以上必要
    canUsePower(state, cost) {
      return state.gamblerKakuhenTurns > 0 || state.power > 0;
    },
    // 確変中はパワー消費0。それ以外は所持パワーを全消費
    powerCost(state) {
      return state.gamblerKakuhenTurns > 0 ? 0 : state.power;
    },
    getBaseDamage(hand, usedPower, attackerState, powerCost) {
      if (hand !== 0 || !usedPower) return null;
      // 確変中は消費量に関わらず最強の式(3d5+5)固定、それ以外は消費量に応じたダイス
      const stacks = attackerState.gamblerKakuhenTurns > 0 ? 3 : powerCost;
      return rollGamblerDamage(stacks);
    },
    onPowerUse(player) {
      if (Math.random() < 0.25) {
        player.gamblerKakuhenTurns = (player.gamblerKakuhenTurns || 0) + 4;
      }
    },
    getStatus(player) {
      return [
        {
          label: "確変",
          value: player.gamblerKakuhenTurns > 0 ? `ON（残り${player.gamblerKakuhenTurns}ターン）` : "OFF"
        }
      ];
    }
  },

  magician: {
    name: "マジシャン",
    init(player) {
      player.magicianAtkBonus = 0;
      player.magicianDefBonus = 0;
    },
    onPowerUse(player) {
      // パワー消費のたびに3つの効果からランダムに1つ発動
      const roll = Math.floor(Math.random() * 3);
      if (roll === 0) {
        player.magicianAtkBonus++; // 永続攻撃力+1（上限なし）
      } else if (roll === 1) {
        player.magicianDefBonus = Math.min(player.magicianDefBonus + 1, 3); // 永続防御力+1（上限3）
      } else {
        const healAmount = Math.min(4, player.maxHp - player.hp); // HP4回復
        player.hp = Math.min(player.hp + 4, player.maxHp);
        return { heal: healAmount }; // UIのポップアップ表示に使う
      }
    },
    getStatus(player) {
      return [
        { label: "永続攻撃力", value: `+${player.magicianAtkBonus}` },
        { label: "永続防御力", value: `+${player.magicianDefBonus} / 3` }
      ];
    }
  },

  berserker: {
    name: "バーサーカー",
    init(player) {
      // 追加の状態は持たない（hp/powerは既存フィールドを流用）
    },
    onTurnEnd(player) {
      const dealt = Math.min(5, player.hp);
      player.hp = Math.max(0, player.hp - 5); // 毎ターン自傷
      return dealt; // UIのポップアップ表示に使う
    },
    getBaseDamage(hand, usedPower) {
      let dmg = 6; // どの手でも固定6ダメージ
      if (hand === 0 && usedPower) dmg += 3; // パワー消費したグーはさらに+3
      return dmg;
    },
    getStatus(player) {
      return [
        { label: "毎ターンHP減少", value: "-5" },
        { label: "固定ダメージ", value: "6（パワー消費グーは+3）" }
      ];
    }
  }
};

// 戦闘の処理

// ▼ じゃんけんカードの出し方（クリック／ドラッグ＆ドロップ）。設定タブで切り替え、localStorageに保存する
let handInputMode = localStorage.getItem("handInputMode") || "click";

function applyHandInputMode() {
  const handCardsContainer = document.querySelector(".hand-cards");
  handCardsContainer.classList.toggle("mode-dragdrop", handInputMode === "dragdrop");
  handCardsContainer.classList.toggle("mode-click", handInputMode === "click");

  document.querySelectorAll(".hand-input-mode-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mode === handInputMode);
  });
}

document.querySelectorAll(".hand-input-mode-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    handInputMode = btn.dataset.mode;
    localStorage.setItem("handInputMode", handInputMode);
    applyHandInputMode();

    // モード切り替え中にカードを選択・ドラッグしていた場合に備えて手札を初期状態へ戻す
    selectedCard = null;
    resetHandCards();
  });
});

// MYメニュー設定タブ：コイン・クエスト達成状況だけをリセットする(所持スキン・解放済み属性・クリア済みステージ等は維持)
const btnResetCoinsQuests = document.getElementById("btn-reset-coins-quests");
if (btnResetCoinsQuests) {
  btnResetCoinsQuests.addEventListener("click", () => {
    showConfirmModal("コインとクエスト達成状況をリセットしますか？(所持スキンや属性解放、ステージクリア状況は残ります)", () => {
      saveData.coins = 0;
      saveData.quests = cloneDefaultSaveData().quests;
      saveData.stats = cloneDefaultSaveData().stats;
      saveSaveData();
      updateModeCoinsDisplay();
      updateQuestClaimableBadge();
      renderQuestList();
    });
  });
}

applyHandInputMode();

// カードを確定して出す（クリック確定・ドラッグ&ドロップ共通の着地点）
function commitHand(card, hand) {
  card.classList.add("fly-away");
  seCardFly.currentTime = 0;
  seCardFly.play();

  // オンライン対戦は、自分の手が決まった瞬間(演出開始前)に送っておくことで
  // 相手の応答を待つ時間を極力減らす
  if (battleContext.mode === "online" && onlineSocket) {
    onlineSocket.emit("playHand", { hand });
  }

  // 飛び終わったらじゃんけん画面へ切り替え
  setTimeout(() => {
    startJankenScene(hand);
  }, 600);
}

//手札カードクリック処理
let selectedCard = null;

document.querySelectorAll(".hand-card").forEach(card => {

    // ホバーした瞬間に音を鳴らす
  card.addEventListener("mouseenter", () => {
    // 選択状態のカードはホバー音を鳴らさない
    if (!card.classList.contains("selected")) {
      playCardHoverSE();
    }
  });


  // カードを押したとき（クリックモードのときだけ有効）
  card.addEventListener("click", () => {
    if (handInputMode !== "click") return;

    const hand = Number(card.dataset.hand);

    // すでに選択されているカードをもう一度押したら戦闘開始
    if (selectedCard === card) {
      commitHand(card, hand);
      selectedCard = null;
      return;
    }

    // 他のカードが選択されていたら解除
    if (selectedCard) {
      selectedCard.classList.remove("selected");
    }

    // このカードを選択状態にする
    selectedCard = card;
    card.classList.add("selected");
  });

  // ホバーが外れたら選択解除
  card.addEventListener("mouseleave", () => {
    if (handInputMode !== "click") return;
    if (selectedCard === card) {
      card.classList.remove("selected");
      selectedCard = null;
    }
  });

});

// ▼ 手札カードのドラッグ＆ドロップ処理（Pointer Eventsでマウス・タッチ両対応）
(() => {
  const dropTarget = document.querySelector(".enemy-area");
  let dragState = null; // { card, hand, startX, startY, pointerId }

  // 敵画像の実際の位置に依存すると画面サイズ次第でシビアになるため、
  // 画面全体を基準にした中央の広いエリアをドロップ判定にする
  const DROP_ZONE_WIDTH_RATIO = 0.7;  // 画面幅の中央70%
  const DROP_ZONE_TOP_RATIO = 0.05;   // 上端から5%より下
  const DROP_ZONE_BOTTOM_RATIO = 0.75; // 上端から75%より上（手札の少し上まで）

  function isOverDropTarget(clientX, clientY) {
    // #game-canvasは実ウィンドウに合わせてscale()されているため、
    // window.innerWidth/innerHeightではなくキャンバス自体の実表示範囲(getBoundingClientRect)を基準にする
    const rect = gameCanvas.getBoundingClientRect();
    const marginX = rect.width * (1 - DROP_ZONE_WIDTH_RATIO) / 2;
    return (
      clientX >= rect.left + marginX &&
      clientX <= rect.left + rect.width - marginX &&
      clientY >= rect.top + rect.height * DROP_ZONE_TOP_RATIO &&
      clientY <= rect.top + rect.height * DROP_ZONE_BOTTOM_RATIO
    );
  }

  function endDrag(card) {
    card.classList.remove("dragging");
    card.style.transform = "";
    card.releasePointerCapture?.(dragState?.pointerId);
    dropTarget.classList.remove("drag-over");
    dragState = null;
  }

  document.querySelectorAll(".hand-card").forEach(card => {
    // 画像のネイティブドラッグが独自のドラッグ操作と競合するのを防ぐ（保険）
    card.addEventListener("dragstart", (e) => e.preventDefault());

    card.addEventListener("pointerdown", (e) => {
      if (handInputMode !== "dragdrop") return;
      if (card.classList.contains("fly-away")) return;

      e.preventDefault(); // テキスト/画像選択が始まるのを防ぐ
      dragState = {
        card,
        hand: Number(card.dataset.hand),
        startX: e.clientX,
        startY: e.clientY,
        pointerId: e.pointerId,
      };
      card.classList.add("dragging");
      card.setPointerCapture(e.pointerId);
    });

    card.addEventListener("pointermove", (e) => {
      if (!dragState || dragState.card !== card) return;

      // カードは#game-canvasのscale()の影響を二重に受けるため、
      // 実ピクセルの移動量(dx/dy)をcurrentGameScaleで割ってから適用し、ポインターに正確に追従させる
      const dx = (e.clientX - dragState.startX) / currentGameScale;
      const dy = (e.clientY - dragState.startY) / currentGameScale;
      card.style.transform = `translate(${dx}px, ${dy}px) scale(1.08)`;

      dropTarget.classList.toggle("drag-over", isOverDropTarget(e.clientX, e.clientY));
    });

    card.addEventListener("pointerup", (e) => {
      if (!dragState || dragState.card !== card) return;

      const dropped = isOverDropTarget(e.clientX, e.clientY);
      const { hand } = dragState;
      endDrag(card);

      if (dropped) {
        commitHand(card, hand);
      }
      // ドロップ先の外で離した場合はendDrag()でtransformを消しており、
      // .hand-card本来のtransition（0.4s ease）でdeal位置へ自然に戻る
    });

    card.addEventListener("pointercancel", () => {
      if (!dragState || dragState.card !== card) return;
      endDrag(card);
    });
  });
})();

function startJankenScene(playerHand) {
  const scene = document.getElementById("jankenScene");
  const playerCard = document.getElementById("jankenPlayerCard");
  const cpuCard = document.getElementById("jankenCpuCard");
  const jankenText = document.getElementById("jankenText");
 const overlay = document.getElementById("darkOverlay");
  overlay.classList.add("show");
  // 画面切り替え
  scene.style.display = "block";
 scene.classList.add("show");
  // 裏面セット（プレイヤーは装備中のカードスキン、CPUは常にデフォルト）
  playerCard.src = SKIN_CATALOG[saveData.equippedSkin].img;
  cpuCard.src = SKIN_CATALOG.default.img;

  // 初期位置に戻す
  playerCard.classList.remove("show");
  cpuCard.classList.remove("show");

  // 10ダメージ以上になりそうな攻撃なら、ぽん!前にカットイン演出を挟んで少し間を伸ばす
  const potentialDamage = previewAttackDamage(playerState, cpuState, playerHand, playerAttribute, cpuAttribute);
  const isBigAttack = potentialDamage >= 10;
  const cutInDelay = isBigAttack ? 700 : 0;
  if (isBigAttack) {
    showBigAttackCutIn();
  }

  // 少し遅らせて飛ばす
  setTimeout(() => {
    playerCard.classList.add("show");
    cpuCard.classList.add("show");
  }, 50 + cutInDelay);

  // 「じゃんけん」
  setTimeout(() => {
    jankenText.innerText = "じゃんけん…";
    jankenText.style.opacity = 1;
  }, 600 + cutInDelay);

  // 「ぽん！」で表にする
  setTimeout(() => {
    jankenText.innerText = "ぽん！";
    const handImg = ["R","P","S"];

    if (battleContext.mode === "online") {
      // オンライン対戦：相手の手は既にcommitHand()で送信済みのroundResultから取得する
      // (相手の応答がまだ届いていなければ、届いた瞬間にこのコールバックが呼ばれる)
      resolveOnlineOpponentHand((cpuHand) => {
        playerCard.src = `./images/hands/${handImg[playerHand]}.png`;
        cpuCard.src = `./images/hands/${handImg[cpuHand]}.png`;
        battleTurn(playerHand, cpuHand);
      });
      return;
    }

    const aiType = battleContext.mode === "story"
      ? STAGE_CATALOG[battleContext.stageId].enemies[battleContext.enemyIndex].aiType
      : "balanced";
    const cpuHand = cpuChooseHand(aiType); // ← CPUの手を決定（ストーリーモードは敵ごとのaiTypeを使用）

    playerCard.src = `./images/hands/${handImg[playerHand]}.png`;
    cpuCard.src = `./images/hands/${handImg[cpuHand]}.png`;

    // 勝敗処理へ
    battleTurn(playerHand, cpuHand);

  }, 1400 + cutInDelay);
}

// CPUの撃破演出＋勝敗遷移（通常攻撃・毒のDOTどちらから呼ばれても同じ処理にする）
function handleCpuDefeated() {
  // 倒した瞬間のHP(0など)を画面遷移前に反映する（これまでは更新前に次画面へ移っていた）
  updateBattleUI();
  setupPlayerStatusWindow();
  setupCpuStatusWindow();

  if (winSE) {
    winSE.currentTime = 0;
    winSE.play();
  }
  const enemyImg = document.getElementById("enemy-img");
  enemyImg.classList.add("enemyFadeOut");

  const winLayer = document.getElementById("winLayer");
  winLayer.style.opacity = 1;

  setTimeout(() => {
    if (battleContext.mode === "story") {
      handleStoryEnemyDefeated();
    } else {
      endBattle("player");
    }
  }, 1200);
}

// プレイヤーの敗北遷移（通常攻撃・毒のDOTどちらから呼ばれても同じ処理にする）
function handlePlayerDefeated() {
  // 倒された瞬間のHP(0など)を画面遷移前に反映する（これまでは更新前に次画面へ移っていた）
  updateBattleUI();
  setupPlayerStatusWindow();
  setupCpuStatusWindow();

  setTimeout(() => {
    if (battleContext.mode === "story") {
      endStoryRun(false);
    } else {
      endBattle("cpu");
    }
  }, 500);
}

// 毒(DOT)の状態を防御側に付与/更新する。既に毒が残っている場合はダメージ+1・継続ターン数を3にリセットする
function applyPoison(defenderState) {
  defenderState.poisonDamage = defenderState.poisonTurnsLeft > 0
    ? (defenderState.poisonDamage || 0) + 1
    : 1;
  defenderState.poisonTurnsLeft = 3;
}

// 毒のDOTを1ターン分ティックする（毎ターン両者に対して呼ぶ）
function tickPoison(state) {
  if (!state.poisonTurnsLeft) return 0;
  const dealt = Math.min(state.poisonDamage, state.hp);
  state.hp = Math.max(0, state.hp - state.poisonDamage);
  state.poisonTurnsLeft--;
  if (state.poisonTurnsLeft <= 0) {
    state.poisonDamage = 0;
  }
  return dealt; // 実際に削れたHP量を返し、UIのポップアップ表示に使う
}

// ギャンブラーの確変（パワー消費なしの4ターン）の残りターンを1ターン分減らす
function tickGamblerKakuhen(state) {
  if (state.gamblerKakuhenTurns > 0) {
    state.gamblerKakuhenTurns--;
  }
}

function battleTurn(playerHand, cpuHand) {
  console.log("playerHand:", playerHand, "cpuHand:", cpuHand, "result:", (playerHand - cpuHand + 3) % 3);

  // 「ぽん！」と同時に暗転(darkOverlay)を解除し、HPバーの変化がすぐ見えるようにする。
  // これまでは800ms後のendJankenScene()まで暗転が残り、HP更新が遅れて見えていた。
  // じゃんけんの手札カード演出自体(jankenScene)は従来どおりendJankenScene()で片付ける。
  document.getElementById("darkOverlay").classList.remove("show");

  // ★ ターン開始時のチャージを記録
  const playerChargeAtStart = playerState.thunderCharge;
  const cpuChargeAtStart = cpuState.thunderCharge;

  // 手の名前
  const handName = ["グー", "パー", "チョキ"];

  // 手を出した回数のクエスト用トラッキング(グー/パー/チョキ)
  incrementStat(`handUseCount.${["rock", "paper", "scissors"][playerHand]}`);

  // プレイヤーの手表示
  document.getElementById("playerHandImg").src =
    `./images/hands/${["R","P","S"][playerHand]}.png`;
  document.getElementById("playerHandText").innerText =
    `あなた：${handName[playerHand]}`;

  // CPUの手表示
  document.getElementById("cpuHandImg").src =
    `./images/hands/${["R","P","S"][cpuHand]}.png`;
  document.getElementById("cpuHandText").innerText =
    `CPU：${handName[cpuHand]}`;

  // 手を出すたびに発火する属性フック（風の風速計算などに使用）
  if (ATTR_LOGIC[playerAttribute].onHandPlayed) {
    ATTR_LOGIC[playerAttribute].onHandPlayed(playerState, playerHand);
  }
  if (ATTR_LOGIC[cpuAttribute].onHandPlayed) {
    ATTR_LOGIC[cpuAttribute].onHandPlayed(cpuState, cpuHand);
  }

  // 「疾風怒濤」クエスト：風属性の風速(0〜3)のピーク値
  if (playerAttribute === "wind") {
    updateQuestProgress("windGust", playerState.windSpeed);
  }

  // 呪いを受けている側がパーを出すと、呪いスタック数分のダメージ（付与した側の属性に関わらず発動）
  if (playerHand === 1 && playerState.curseStacks > 0) {
    playerState.hp = Math.max(0, playerState.hp - playerState.curseStacks);
    showDamageNumber("player", playerState.curseStacks);
  }
  if (cpuHand === 1 && cpuState.curseStacks > 0) {
    cpuState.hp = Math.max(0, cpuState.hp - cpuState.curseStacks);
    showDamageNumber("cpu", cpuState.curseStacks);
  }

  // ▼ パーならパワー+1（最大値でストップ）
  // 相手が氷属性で凍結準備(freezeReady)中なら、パワー上昇を無効化して凍結を消費する
  let playerPowerFrozen = false;
  let cpuPowerFrozen = false;

  if (playerHand === 1) {
    if (cpuAttribute === "ice" && cpuState.freezeReady) {
      playerPowerFrozen = true;
      cpuState.freezeReady = false;
    } else {
      const paperGain = ATTR_LOGIC[playerAttribute].paperGain || 1;
      playerState.power = Math.min(playerState.power + paperGain, playerState.maxPower);
    }
  }
  if (cpuHand === 1) {
    if (playerAttribute === "ice" && playerState.freezeReady) {
      cpuPowerFrozen = true;
      playerState.freezeReady = false;
    } else {
      const cpuPaperGain = ATTR_LOGIC[cpuAttribute].paperGain || 1;
      cpuState.power = Math.min(cpuState.power + cpuPaperGain, cpuState.maxPower);
    }
  }

  // 「永久凍土」クエスト：自分(氷属性)がCPUを凍結させた回数(1戦闘内の最大値)
  if (cpuPowerFrozen) {
    freezeCountThisBattle++;
    updateQuestProgress("permafrost", freezeCountThisBattle);
    incrementStat("freezeCount"); // 通算の凍結回数クエスト用
  }

  // ▼ グーでパワー消費できるか判定（消費量は属性ごとにATTR_LOGIC[attr].powerCostで上書き可能、未指定なら2。固定値でも現在パワーに応じた関数でもよい）
  let playerUsedPower = false;
  let cpuUsedPower = false;

  const playerPowerCost = getPowerCost(playerAttribute, playerState);
  const cpuPowerCost = getPowerCost(cpuAttribute, cpuState);

  // 判定はcanUsePower()に集約（ギャンブラーの確変中などデフォルト条件と異なる属性はここで上書きされる）
  if (playerHand === 0 && canUsePower(playerAttribute, playerState, playerPowerCost)) playerUsedPower = true;
  if (cpuHand === 0 && canUsePower(cpuAttribute, cpuState, cpuPowerCost)) cpuUsedPower = true;

  // ▼ 勝敗判定
  const result = (playerHand - cpuHand + 3) % 3;

  // 勝敗が決まった瞬間に画面中央へ大きくWIN!/LOSE!/DRAW!を出す
  showBigResultText(result === 1 ? "win" : result === 2 ? "lose" : "draw");

  if (result === 1) {
    let damage = calcDamage(
      playerState,
      cpuState,
      playerHand,
      cpuHand,
      playerAttribute,
      playerUsedPower,
      cpuAttribute,
      playerPowerCost
    );

     if (playerAttribute === "thunder" && playerChargeAtStart === 5) {
      playerState.thunderCharge = 3;
  }
  
     if (cpuAttribute === "thunder" && cpuChargeAtStart === 5) {
      cpuState.thunderCharge = 3;
  }



    cpuState.hp -= damage;
   

    if (ATTR_LOGIC[cpuAttribute].onHpChange) {
      ATTR_LOGIC[cpuAttribute].onHpChange(cpuState);
    }

    if (ATTR_LOGIC[playerAttribute].onWin) {
      const playerHeal = ATTR_LOGIC[playerAttribute].onWin(playerState, playerHand, playerUsedPower, damage, cpuState);
      if (playerHeal) showDamageNumber("player", playerHeal, { heal: true });

      // 「血の匂い」クエスト：吸血属性の1回の回復量のピーク値
      if (playerAttribute === "vampire" && playerHeal) {
        updateQuestProgress("vampireThirst", playerHeal);
      }
    }

    // 「雷騰雲奔」クエスト：雷属性での一撃ダメージ
    if (playerAttribute === "thunder") {
      updateQuestProgress("thunderBolt", damage);
    }

    // 属性ごとの固有クエスト(1戦闘内のピーク値方式)
    if (playerAttribute === "poison") {
      updateQuestProgress("poisonQueen", cpuState.poisonDamage);
    }
    if (playerAttribute === "fighter" && playerHand === 2) {
      fighterScissorsWinCountThisBattle++;
      updateQuestProgress("fighterBlade", fighterScissorsWinCountThisBattle);
    }
    if (playerAttribute === "cannon") {
      updateQuestProgress("cannonBlast", damage);
    }
    if (playerAttribute === "gambler") {
      updateQuestProgress("gamblerJackpot", damage);
    }
    if (playerAttribute === "berserker") {
      berserkerDamageThisBattle += damage;
      updateQuestProgress("berserkerRampage", berserkerDamageThisBattle);
    }

    // 属性別・通算系の統計クエスト用トラッキング(勝利数・与ダメージ・高火力ヒット)
    if (getStatByPath(`winsByAttribute.${playerAttribute}`) === 0) {
      incrementStat("attributesWonCount");
    }
    incrementStat(`winsByAttribute.${playerAttribute}`);
    incrementStat(`damageByAttribute.${playerAttribute}`, damage);
    incrementStat("totalDamageDealt", damage);
    if (damage >= 10) incrementStat("highDamageHits");
    if (playerAttribute === "poison") incrementStat("poisonApplyCount");

    // プロフィール画面用：じゃんけん1回ごとの勝敗・手ごとの勝率トラッキング
    incrementStat("roundWinCount");
    incrementStat(`handWinCount.${["rock", "paper", "scissors"][playerHand]}`);

    playCpuDamageEffect(damage);

    // 10ダメージ以上を与えた瞬間は、通常の演出に加えてさらに派手なフラッシュ・シェイク・SEを重ねる
    if (damage >= 10) {
      playBigImpactEffect();
    }

    if (cpuState.hp <= 0) {
      handleCpuDefeated();
      return;
    }

    document.getElementById("resultText").innerText =
      `勝ち！ CPUに${damage}ダメージ！` +
      (cpuPowerFrozen ? "（CPUは氷で凍結され、パワー上昇が無効化された）" : "");

  } else if (result === 2) {

    let cpudamage = calcDamage(
      cpuState,
      playerState,
      cpuHand,
      playerHand,
      cpuAttribute,
      cpuUsedPower,
      playerAttribute,
      cpuPowerCost
    );

     if (cpuAttribute === "thunder" && cpuChargeAtStart === 5) {
      cpuState.thunderCharge = 3;
  }
     if (playerAttribute === "thunder" && playerChargeAtStart === 5) {
      playerState.thunderCharge = 3;
  }

    playerState.hp -= cpudamage;

    if (ATTR_LOGIC[playerAttribute].onHpChange) {
      ATTR_LOGIC[playerAttribute].onHpChange(playerState);
    }

    if (ATTR_LOGIC[cpuAttribute].onWin) {
      const cpuHeal = ATTR_LOGIC[cpuAttribute].onWin(cpuState, cpuHand, cpuUsedPower, cpudamage, playerState);
      if (cpuHeal) showDamageNumber("cpu", cpuHeal, { heal: true });
    }

    incrementStat("totalDamageTaken", cpudamage);
    incrementStat("roundLossCount");

    playDamageEffect(cpudamage);

    if (playerState.hp <= 0) {
      handlePlayerDefeated();
      return;
    }

    document.getElementById("resultText").innerText =
      `負け… あなたに${cpudamage}ダメージ` +
      (playerPowerFrozen ? "（あなたは氷で凍結され、パワー上昇が無効化された）" : "");



  } else {
    incrementStat("drawCount");

    let drawNote = "";
    if (playerPowerFrozen) drawNote += "（あなたは氷で凍結され、パワー上昇が無効化された）";
    if (cpuPowerFrozen) drawNote += "（CPUは氷で凍結され、パワー上昇が無効化された）";
    document.getElementById("resultText").innerText = "あいこ" + drawNote;

    // あいこ時に発火する属性フック（水のHP回復/パワー増加、ドッペルゲンガーの反撃ダメージなど）
    // 戻り値は { damage: 相手へのダメージ } か { heal: 自分の回復量 } のどちらか
    if (ATTR_LOGIC[playerAttribute].onDraw) {
      const result = ATTR_LOGIC[playerAttribute].onDraw(playerState, cpuState);
      if (result && result.damage) showDamageNumber("cpu", result.damage);
      if (result && result.heal) showDamageNumber("player", result.heal, { heal: true });

      // 「泉の恵み」クエスト：水属性が1戦闘中にあいこで回復した回数
      if (playerAttribute === "water" && result && result.heal) {
        waterHealCountThisBattle++;
        updateQuestProgress("waterBlessing", waterHealCountThisBattle);
      }
      // 「鏡合わせの狂気」クエスト：ドッペルゲンガー属性のあいこ回数のピーク値
      if (playerAttribute === "doppel") {
        updateQuestProgress("doppelMadness", playerState.doppelDrawCount);
      }
    }
    if (ATTR_LOGIC[cpuAttribute].onDraw) {
      const result = ATTR_LOGIC[cpuAttribute].onDraw(cpuState, playerState);
      if (result && result.damage) showDamageNumber("player", result.damage);
      if (result && result.heal) showDamageNumber("cpu", result.heal, { heal: true });
    }

    if (playerAttribute === "thunder" && playerChargeAtStart === 5) {
    playerState.thunderCharge = 3;
}
if (cpuAttribute === "thunder" && cpuChargeAtStart === 5) {
    cpuState.thunderCharge = 3;
}


  }

  // ▼ 毒のDOT処理（このターンの勝敗に関わらず、毎ターン両者に対して発動）
  const playerPoisonDmg = tickPoison(playerState);
  const cpuPoisonDmg = tickPoison(cpuState);
  if (playerPoisonDmg) showDamageNumber("player", playerPoisonDmg);
  if (cpuPoisonDmg) showDamageNumber("cpu", cpuPoisonDmg);

  // ▼ ギャンブラーの確変ターン経過（このターンの勝敗に関わらず、毎ターン両者に対して発動）
  tickGamblerKakuhen(playerState);
  tickGamblerKakuhen(cpuState);

  // ▼ 属性固有の毎ターン処理（バーサーカーの自傷など、このターンの勝敗に関わらず発動）
  if (ATTR_LOGIC[playerAttribute].onTurnEnd) {
    const playerTurnEndDmg = ATTR_LOGIC[playerAttribute].onTurnEnd(playerState);
    if (playerTurnEndDmg) showDamageNumber("player", playerTurnEndDmg);
  }
  if (ATTR_LOGIC[cpuAttribute].onTurnEnd) {
    const cpuTurnEndDmg = ATTR_LOGIC[cpuAttribute].onTurnEnd(cpuState);
    if (cpuTurnEndDmg) showDamageNumber("cpu", cpuTurnEndDmg);
  }

  // ▼ 毒のDOTやあいこ時の反撃（ドッペルゲンガー等）、バーサーカーの自傷でHPが0以下になっていないか確認
  if (cpuState.hp <= 0) {
    handleCpuDefeated();
    return;
  }
  if (playerState.hp <= 0) {
    handlePlayerDefeated();
    return;
  }

  // ▼ パワー消費
  if (playerUsedPower) playerState.power -= playerPowerCost;
  if (cpuUsedPower) cpuState.power -= cpuPowerCost;

  // ▼ チャージ増加（ターン終了時）
  if (playerUsedPower && ATTR_LOGIC[playerAttribute].onPowerUse) {
    const playerPowerUseResult = ATTR_LOGIC[playerAttribute].onPowerUse(playerState, cpuState);
    if (playerPowerUseResult && playerPowerUseResult.heal) {
      showDamageNumber("player", playerPowerUseResult.heal, { heal: true });
    }

    // 「爆炎」クエスト：炎属性の攻撃力上昇
    if (playerAttribute === "fire") {
      updateQuestProgress("fireBurst", playerState.fireAtkBonus);
    }

    // 呪術：パワー消費のたびに相手へ呪いを付与するため、通算の付与回数クエスト用にカウント
    if (playerAttribute === "curse") {
      incrementStat("curseApplyCount");
      // 「呪いの深淵」クエスト：相手の呪いスタックのピーク値
      updateQuestProgress("curseAbyss", cpuState.curseStacks);
    }

    // 「岩盤の守り」クエスト：石属性が1戦闘中にパワーを消費した回数のピーク値
    if (playerAttribute === "stone") {
      updateQuestProgress("stoneGuard", playerState.stoneUseCount);
    }

    // 「大魔導の極意」クエスト：マジシャン属性の永続攻撃力上昇のピーク値
    if (playerAttribute === "magician") {
      updateQuestProgress("magicianMastery", playerState.magicianAtkBonus);
    }
  }
  if (cpuUsedPower && ATTR_LOGIC[cpuAttribute].onPowerUse) {
    const cpuPowerUseResult = ATTR_LOGIC[cpuAttribute].onPowerUse(cpuState, playerState);
    if (cpuPowerUseResult && cpuPowerUseResult.heal) {
      showDamageNumber("cpu", cpuPowerUseResult.heal, { heal: true });
    }
  }

  // ▼ UI更新
  updateBattleUI();
  setupPlayerStatusWindow();
  setupCpuStatusWindow();

  // ▼ ターン終了処理
  setTimeout(() => {
    endJankenScene();

  

  }, 800);
}



//ui更新
function updateBattleUI() {
  if (!playerState || !cpuState) return;

  // オーバーキル等でhpが負の値になっても、バーの幅は0〜100%にクランプする
  // （負のwidthはCSS上無効な値としてブラウザに無視され、古い表示のまま固まってしまうため）
  const playerHpDisplay = Math.max(0, playerState.hp);
  const cpuHpDisplay = Math.max(0, cpuState.hp);

  document.getElementById("playerHpBar").style.width =
    Math.min(100, playerHpDisplay / playerState.maxHp * 100) + "%";
  document.getElementById("cpuHpBar").style.width =
    Math.min(100, cpuHpDisplay / cpuState.maxHp * 100) + "%";

  document.getElementById("playerHpText").innerText =
    `${playerHpDisplay} / ${playerState.maxHp}`;
  document.getElementById("cpuHpText").innerText =
    `${cpuHpDisplay} / ${cpuState.maxHp}`;

  document.getElementById("playerPowerBar").style.width =
    (playerState.power / playerState.maxPower * 100) + "%";
  document.getElementById("cpuPowerBar").style.width =
    (cpuState.power / cpuState.maxPower * 100) + "%";
}
