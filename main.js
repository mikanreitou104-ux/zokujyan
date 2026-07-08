import {
  ATTR_BASE_STATUS,
  ATTR_DATA,
  ATTR_LOGIC,
  getRandomAttribute,
  initAttribute,
  getPowerCost,
  canUsePower,
  rollGamblerDamage,
  baseDamage,
  attributeBonus,
  damageReduction,
  roguelikeBonus,
  calcDamage,
  previewAttackDamage,
  applyPoison,
  tickPoison,
  tickGamblerKakuhen
} from "./js/attributes.js";

import {
  saveData,
  cloneDefaultSaveData,
  saveSaveData,
  getStatByPath,
  incrementStat,
  trackAttributePlay,
  isAttributeUnlocked,
  isStageCleared,
  markStageCleared,
  addCoins,
  spendCoins,
  unlockAttribute,
  ownSkin,
  equipSkin,
  ownIconBg,
  equipIconBg,
  ownIcon,
  equipIcon,
  setUICallbacks
} from "./js/save-data.js";

import {
  QUEST_CATEGORIES,
  QUEST_CATALOG,
  getQuestGroupKey,
  getQuestLinesForCategory,
  updateQuestProgress,
  getQuestProgress,
  isQuestClaimable,
  claimQuestReward,
  countClaimableQuests,
  setQuestBadgeCallback
} from "./js/quests.js";

import {
  battleTurn,
  resetBattleCounters,
  setBattleCallbacks
} from "./js/battle.js";

import { STAGE_CATALOG, ITEM_CARD_CATALOG, pickRandomCardIds } from "./js/story-catalog.js";

import {
  updateModeProfileDisplay,
  renderProfileScreen,
  recordOnlineRoundResult,
  setProfileCallbacks
} from "./js/profile.js";

import {
  resetOnlineRng,
  seedOnlineRng,
  showOnlineWaiting,
  connectOnlineSocket,
  resolveOnlineOpponentHand,
  leaveOnlineRoom,
  sendSurrender,
  sendPlayHand,
  setOnlineCallbacks
} from "./js/online.js";

import {
  currentBgmVolume,
  seClick,
  seCardFly,
  seDamage,
  winSE,
  seBigImpact,
  bgmMode,
  bgmcpuBattle,
  bgmStory,
  seSlider,
  battleBgmSlider,
  battleSeSlider,
  playCoinSE,
  playPurchaseSE,
  playCardHoverSE,
  stopBGM
} from "./js/audio.js";

import { SKIN_CATALOG, ICON_BG_CATALOG, ICON_CATALOG } from "./js/shop-catalog.js";

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

// 所持コイン表示を更新する(モード選択画面・クエスト画面など、.coins-value-displayを持つ要素全て)
function updateModeCoinsDisplay() {
  document.querySelectorAll(".coins-value-display").forEach(el => {
    el.textContent = saveData.coins;
  });
}
setUICallbacks({
  onCoinsChanged: updateModeCoinsDisplay,
  onQuestBadgeChanged: updateQuestClaimableBadge,
  onProfileChanged: updateModeProfileDisplay
});
setQuestBadgeCallback(updateQuestClaimableBadge);
setBattleCallbacks({
  hideDarkOverlay,
  renderPlayerHand,
  renderCpuHand,
  setResultText,
  showBigResultText,
  showDamageNumber,
  playCpuDamageEffect,
  playBigImpactEffect,
  playDamageEffect,
  handleCpuDefeated,
  handlePlayerDefeated,
  updateBattleUI,
  setupPlayerStatusWindow,
  setupCpuStatusWindow,
  endJankenScene,
  // recordOnlineRoundResult(profile.js)はbattleContextを持たないため、呼び出し側でmodeを渡す
  onRoundResult: (result) => recordOnlineRoundResult(battleContext.mode, result)
});

setProfileCallbacks({ showScreen, showNameEditModal });

setOnlineCallbacks({
  showScreen,
  showConfirmModal,
  exitBattleToScreen,
  beginVersusBattle,
  handleCpuDefeated,
  renderAttrCards,
  getPlayerState: () => playerState,
  getCpuState: () => cpuState,
  getBattleContext: () => battleContext
});

// ===== ショップ / MYメニュー：カード裏スキン =====
// SKIN_CATALOGの定義はjs/shop-catalog.jsに切り出し済み(冒頭のimportを参照)。

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
    playPurchaseSE();
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
    // 前回開いた時のタブ状態が残らないよう、毎回「カードスキン」タブに戻す
    document.querySelectorAll(".shop-tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".shop-tab-panel").forEach(p => p.classList.remove("active"));
    document.querySelector(".shop-tab-btn").classList.add("active");
    document.getElementById("shop-skin-tab").classList.add("active");
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
// ICON_BG_CATALOGの定義はjs/shop-catalog.jsに切り出し済み(冒頭のimportを参照)。

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
    playPurchaseSE();
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
// ICON_CATALOGの定義はjs/shop-catalog.jsに切り出し済み(冒頭のimportを参照)。

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
    playPurchaseSE();
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

// プロフィール関連はjs/profile.jsに切り出し済み(冒頭のimportとsetProfileCallbacks()呼び出しを参照)

// オンライン対戦関連はjs/online.jsに切り出し済み(冒頭のimportとsetOnlineCallbacks()呼び出しを参照)

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

  if (claimQuestReward(node.dataset.quest)) playCoinSE();
  renderQuestList();
  updateQuestClaimableBadge();
});

document.getElementById("quest-claim-all-btn").addEventListener("click", () => {
  const lines = getQuestLinesForCategory(currentQuestCategory);
  let claimedAny = false;
  lines.forEach(line => {
    line.ids.forEach(id => {
      if (isQuestClaimable(id) && claimQuestReward(id)) claimedAny = true;
    });
  });
  renderQuestList();
  updateQuestClaimableBadge();
  if (claimedAny) playCoinSE();
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
// 1戦闘中のピーク値をクエスト進捗に使うカウンタ(freezeCountThisBattle等)はjs/battle.js側の
// 非公開stateに移動済み。戦闘開始時はresetBattleCounters()を呼ぶ。

// 汎用戦闘コンテキスト（CPU戦 / ストーリーモードで共有）
let battleContext = {
  mode: null,          // "cpu" | "story"
  stageId: null,       // ストーリーモードで選択中のステージ
  enemyIndex: 0,       // ストーリーモードで戦っている敵のインデックス
  itemCardsTaken: []   // ストーリーモードでそのランで取得したアイテムカードID
};
let selectedStageId = null;

// ===== ストーリーモード：ステージ / アイテムカード =====
// STAGE_CATALOG/ITEM_CARD_CATALOGの定義はjs/story-catalog.jsに切り出し済み(冒頭のimportを参照)。


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
  handCommitted = false;

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

  resetBattleCounters();

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
  stopBGM(bgmStory);
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
// ステージは前のステージをクリアしないと挑戦できない(順番に解放していく方式)。
// 最初のステージ(配列の先頭)だけは常に解放済み扱い。
function isStageLocked(stageIndex, stageIds) {
  if (stageIndex === 0) return false;
  return !isStageCleared(stageIds[stageIndex - 1]);
}

function renderStageList() {
  const stageIds = Object.keys(STAGE_CATALOG);
  document.getElementById("stage-list").innerHTML = stageIds.map((id, index) => {
    const stage = STAGE_CATALOG[id];
    const cleared = isStageCleared(id);
    const locked = isStageLocked(index, stageIds);
    return `
      <div class="stage-card ${locked ? "locked" : "clickable stage-option"} ${cleared ? "cleared" : ""}" data-stage="${id}">
        <div class="stage-card-info">
          <div class="stage-card-name">
            ${stage.name}
            ${cleared ? `<span class="stage-cleared-badge">クリア済み</span>` : ""}
            ${locked ? `<span class="stage-locked-badge">🔒 未解放</span>` : ""}
          </div>
          <div class="stage-card-desc">${locked ? `「${STAGE_CATALOG[stageIds[index - 1]].name}」をクリアすると挑戦できます。` : stage.intro}</div>
          ${locked ? "" : `<div class="stage-card-reward">クリア報酬：${stage.reward}コイン${stage.unlocksAttribute ? `＋属性「${ATTR_DATA[stage.unlocksAttribute].name}」解放` : ""}</div>`}
        </div>
        <div class="stage-card-image">
          <img src="${stage.background}" alt="${stage.name}" ${locked ? 'class="stage-image-locked"' : ""}>
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
  document.getElementById("stageConfirmReward").innerText = `クリア報酬：${stage.reward}コイン${stage.unlocksAttribute ? `＋属性「${ATTR_DATA[stage.unlocksAttribute].name}」解放` : ""}`;
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

// 敵に入る前の共通入口。enemy.story がある敵の直前だけ読み物画面を挟み、
// ない敵はこれまで通りstartStoryEnemy()へ直行する。
function enterStoryEnemy() {
  const stage = STAGE_CATALOG[battleContext.stageId];
  const enemy = stage.enemies[battleContext.enemyIndex];

  if (enemy.story) {
    // 読み物シーンの間だけ専用BGMに切り替え、戦闘開始時に戦闘BGMへ戻す
    stopBGM(bgmcpuBattle);
    bgmStory.volume = currentBgmVolume;
    bgmStory.currentTime = 0;
    bgmStory.play();

    showStoryReadScreen(enemy.story, () => {
      stopBGM(bgmStory);
      bgmcpuBattle.volume = currentBgmVolume;
      bgmcpuBattle.currentTime = 0;
      bgmcpuBattle.play();
      startStoryEnemy();
    });
  } else {
    startStoryEnemy();
  }
}

// VN風の読み物画面。story = { title?, background?, lines: [{ speaker?, text, portraits? }] }
// 立ち絵(portraits)はキャラ素材ができてから行ごとに追加する想定。今は指定がなければ何も描画しない。
function showStoryReadScreen(story, onContinue) {
  const screenEl = document.getElementById("screen-story-read");
  const bgUrl = story.background || (STAGE_CATALOG[battleContext.stageId] || {}).background || "";
  document.getElementById("vn-bg").style.backgroundImage = bgUrl ? `url("${bgUrl}")` : "none";

  const titleCard = document.getElementById("vn-title-card");
  const dialogueBox = document.getElementById("vn-dialogue-box");
  const namePlate = document.getElementById("vn-name-plate");
  const dialogueText = document.getElementById("vn-dialogue-text");
  const portraitsEl = document.getElementById("vn-portraits");

  let showingTitle = Boolean(story.title);
  let lineIndex = 0;

  function renderPortraits(portraits) {
    portraitsEl.innerHTML = (portraits || []).map(p => `
      <img class="vn-portrait vn-portrait-${p.position || "center"} ${p.active === false ? "vn-portrait-dim" : ""}" src="${p.img}" alt="">
    `).join("");
  }

  function renderTitleCard() {
    titleCard.textContent = story.title;
    titleCard.classList.add("show");
    dialogueBox.classList.remove("show");
    portraitsEl.innerHTML = "";
  }

  function renderLine() {
    const line = story.lines[lineIndex];
    titleCard.classList.remove("show");
    dialogueBox.classList.add("show");

    // 行ごとの背景差し替え（会話の途中でシーンが切り替わる演出用。指定が無い行は直前の背景を維持する）
    if (line.background) {
      document.getElementById("vn-bg").style.backgroundImage = `url("${line.background}")`;
    }

    if (line.speaker) {
      namePlate.textContent = line.speaker.replace(/\{name\}/g, saveData.profileName);
      namePlate.style.display = "";
    } else {
      namePlate.style.display = "none";
    }
    dialogueText.textContent = line.text.replace(/\{name\}/g, saveData.profileName);
    renderPortraits(line.portraits);
  }

  function onClick() {
    if (showingTitle) {
      showingTitle = false;
      renderLine();
      return;
    }
    lineIndex++;
    if (lineIndex >= story.lines.length) {
      cleanup();
      onContinue();
      return;
    }
    renderLine();
  }

  function onSkipClick(e) {
    e.stopPropagation();
    cleanup();
    onContinue();
  }

  function cleanup() {
    screenEl.removeEventListener("click", onClick);
    skipBtn.removeEventListener("click", onSkipClick);
  }

  const skipBtn = document.getElementById("vn-skip-btn");
  skipBtn.addEventListener("click", onSkipClick);
  screenEl.addEventListener("click", onClick);

  if (showingTitle) {
    renderTitleCard();
  } else {
    renderLine();
  }
  showScreen("screen-story-read");
}

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
  resetHandCards(); // handCommittedをリセットしないと2体目以降でカードが出せなくなるバグがあった
  trackAttributePlay(playerAttribute);
  // 前回オンライン対戦のシード付き乱数が残っていると、ストーリーモードでもbattleRandom()が
  // 誤ってそれを使ってしまうため、通常のMath.random()に戻す
  resetOnlineRng();

  // プレイヤーは(CPU側と違って)敵が変わってもinitAttribute()を呼び直していないため、
  // 炎のfireAtkBonus/fireRageのようにターン経過で無制限に積み上がるステータスがあると、
  // 連戦が長引くほど炎だけがどんどん有利になってしまう。属性ごとにonNewBattle()を
  // 定義しておけば、次の敵に切り替わるたびにここでリセットできる(炎以外は今のところ未定義)。
  if (ATTR_LOGIC[playerAttribute].onNewBattle) {
    ATTR_LOGIC[playerAttribute].onNewBattle(playerState);
  }

  // 次の敵に切り替わる際、体力が減ったまま連戦が続くと詰みやすくなるため、
  // 減っている分の半分だけ回復する（全回復にはしない）。
  const missingHp = playerState.maxHp - playerState.hp;
  if (missingHp > 0) {
    playerState.hp = Math.min(playerState.maxHp, playerState.hp + Math.ceil(missingHp / 2));
  }

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

  resetBattleCounters();

  // 敵ごとに戦闘背景を差し替えたい場合はenemy.backgroundを指定する(未指定ならステージ共通の背景)
  setBattleBackground(enemy.background || stage.background);
  setEnemyImage(enemy.img);
  document.getElementById("enemy-img").classList.remove("enemyFadeOut");
  document.getElementById("cpu-attr-icon").src = ATTR_DATA[cpuAttribute].img;
  document.getElementById("player-attr-icon").src = ATTR_DATA[playerAttribute].img;
  applyAttributeHudColors(playerAttribute, cpuAttribute);
  updateItemCardTab();

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

// 選択直後に画面が切り替わるまで数百msかかるため、その間に連打されると
// enemyIndexが複数回進んでしまい配列範囲外になるバグがあった。ロックで二重発火を防ぐ。
let itemCardChoiceLocked = false;

// trueの間はitem-card-list選択後にenemyIndexを進めない(1戦目開始前の選択のため、
// まだどの敵も倒していない)。btn-to-stageでtrueにし、選択完了時にfalseへ戻す。
let awaitingInitialItemCard = false;

function renderItemCardChoice() {
  itemCardChoiceLocked = false;

  const pool = Object.keys(ITEM_CARD_CATALOG).filter(id => {
    const card = ITEM_CARD_CATALOG[id];
    return !card.attribute || card.attribute === playerAttribute;
  });

  // 「商人の目利き」適用中は選択肢を1枚増やす(1回のみ、使ったら必ずfalseへ戻す)
  const choiceCount = playerState.itemExtraCardChoicePending ? 4 : 3;
  playerState.itemExtraCardChoicePending = false;
  const offeredIds = pickRandomCardIds(pool, choiceCount);

  document.getElementById("item-card-list").innerHTML = offeredIds.map(id => {
    const card = ITEM_CARD_CATALOG[id];
    return `
      <div class="skin-card clickable item-card-option" data-card="${id}">
        <div class="skin-name">${card.name}</div>
        <div class="skin-status">${card.desc}</div>
      </div>
    `;
  }).join("");
}

// ストーリーモードのバトル中、HUDの「カード」タブに現在の取得数を反映する。
// CPU戦/オンライン対戦にはアイテムカードが存在しないため、その場合はタブごと隠す。
function updateItemCardTab() {
  const tab = document.getElementById("btn-item-card-tab");
  if (!tab) return;
  if (battleContext.mode !== "story") {
    tab.style.display = "none";
    return;
  }
  tab.style.display = "";
  document.getElementById("itemCardTabCount").textContent = battleContext.itemCardsTaken.length;
}

document.getElementById("btn-item-card-tab").addEventListener("click", () => {
  const body = document.getElementById("itemCardListModalBody");
  if (battleContext.itemCardsTaken.length === 0) {
    body.innerHTML = `<p class="item-card-list-empty">まだアイテムカードを取得していません。</p>`;
  } else {
    body.innerHTML = battleContext.itemCardsTaken.map(id => {
      const card = ITEM_CARD_CATALOG[id];
      return `
        <div class="skin-card">
          <div class="skin-name">${card.name}</div>
          <div class="skin-status">${card.desc}</div>
        </div>
      `;
    }).join("");
  }
  document.getElementById("itemCardListModal").classList.add("show");
});

document.getElementById("itemCardListModalClose").addEventListener("click", () => {
  document.getElementById("itemCardListModal").classList.remove("show");
});

document.getElementById("item-card-list").addEventListener("click", (e) => {
  const el = e.target.closest(".item-card-option");
  if (!el) return;
  if (itemCardChoiceLocked) return;
  itemCardChoiceLocked = true;

  const cardId = el.dataset.card;
  ITEM_CARD_CATALOG[cardId].apply(playerState);
  battleContext.itemCardsTaken.push(cardId);
  incrementStat("itemCardsCollected");
  updateItemCardTab();

  if (awaitingInitialItemCard) {
    awaitingInitialItemCard = false;
    stopBGM(bgmMode);
    // 最初の敵に読み物(story)があれば、enterStoryEnemy()側でstory用BGMに切り替える。
    // 無ければここで戦闘BGMを開始する。
    const firstEnemy = STAGE_CATALOG[battleContext.stageId].enemies[0];
    if (!firstEnemy.story) {
      bgmcpuBattle.volume = currentBgmVolume;
      bgmcpuBattle.currentTime = 0;
      bgmcpuBattle.play();
    }
  } else {
    battleContext.enemyIndex++;
  }

  enterStoryEnemy();
});

// 敵を倒した直後の分岐：次の敵がいればアイテムカード選択、いなければステージクリア
function handleStoryEnemyDefeated() {
  const stage = STAGE_CATALOG[battleContext.stageId];
  const hasNextEnemy = battleContext.enemyIndex + 1 < stage.enemies.length;

  if (hasNextEnemy) {
    renderItemCardChoice();
    showScreen("screen-item-card-select");
  } else if (stage.clearStory) {
    // ステージクリア後の読み物。終わったらリザルト画面へ進む。
    // 「YOU WIN」の暗幕演出はendJankenScene()を経由せず残ったままなので先に片付ける。
    document.getElementById("darkOverlay").classList.remove("show");
    const jankenScene = document.getElementById("jankenScene");
    jankenScene.classList.remove("show");
    jankenScene.style.display = "none";
    document.getElementById("winLayer").style.opacity = 0;
    document.getElementById("enemy-img").classList.remove("enemyFadeOut");

    stopBGM(bgmcpuBattle);
    bgmStory.volume = currentBgmVolume;
    bgmStory.currentTime = 0;
    bgmStory.play();

    showStoryReadScreen(stage.clearStory, () => {
      stopBGM(bgmStory);
      endStoryRun(true);
    });
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
    // ステージ報酬(コイン・属性解放)は初回クリアのみ。周回でのファーミングを防ぐ。
    const isFirstClear = !isStageCleared(battleContext.stageId);
    markStageCleared(battleContext.stageId);
    titleEl.innerText = "ステージクリア！";
    const cardNames = battleContext.itemCardsTaken.map(id => ITEM_CARD_CATALOG[id].name);

    let rewardHtml;
    if (isFirstClear) {
      addCoins(stage.reward);
      let unlockHtml = "";
      if (stage.unlocksAttribute && !isAttributeUnlocked(stage.unlocksAttribute)) {
        unlockAttribute(stage.unlocksAttribute);
        const unlockedData = ATTR_DATA[stage.unlocksAttribute];
        unlockHtml = `<p class="story-attr-unlock">新しい属性「${unlockedData.name}」が解放された！</p>`;
      }
      rewardHtml = `<p>報酬：${stage.reward}コイン(初回クリア報酬)</p>${unlockHtml}`;
    } else {
      rewardHtml = `<p>このステージは既にクリア済みのため、追加の報酬はありません。</p>`;
    }

    bodyEl.innerHTML = `
      <p>獲得したアイテムカード：${cardNames.length ? cardNames.join("、") : "なし"}</p>
      ${rewardHtml}
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

// 戦闘開始時、黒帯が開いた瞬間に「自分の属性 VS 相手の属性」を一瞬見せる演出
function showBattleStartSplash(playerAttr, cpuAttr) {
  const el = document.getElementById("battleStartSplash");
  if (!el) return;

  document.getElementById("battleStartPlayerIcon").src = ATTR_DATA[playerAttr].img;
  document.getElementById("battleStartPlayerName").textContent = ATTR_DATA[playerAttr].name;
  document.getElementById("battleStartCpuIcon").src = ATTR_DATA[cpuAttr].img;
  document.getElementById("battleStartCpuName").textContent = ATTR_DATA[cpuAttr].name;

  el.classList.remove("show");
  void el.offsetWidth; // リフロー強制でアニメーションをリスタート(showBigAttackCutInと同じ手法)
  el.classList.add("show");
}

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

// ショップのタブ切り替え(MYメニューとは別クラス・別data属性にして、お互いのactive状態に影響しないようにしている)
document.querySelectorAll(".shop-tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".shop-tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".shop-tab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.shopTabTarget).classList.add("active");
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
// battleBgmSlider/battleSeSliderはjs/audio.jsで宣言・配線済み(スライダー自体の
// input配線はaudio.js側の責務)。ここではパネルを開いた瞬間の値同期のためだけに使う。
const battleMenuBtn = document.getElementById("battle-menu-btn");
const battleMenuPanel = document.getElementById("battleMenuPanel");

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

document.getElementById("battle-menu-restart").addEventListener("click", () => {
  closeBattleMenu();
  showConfirmModal("戦闘をリスタートしますか？", () => {
    rematchBattle();
  });
});

document.getElementById("battle-menu-surrender").addEventListener("click", () => {
  closeBattleMenu();
  showConfirmModal("降参しますか？この戦闘は敗北扱いになります。", () => {
    if (battleContext.mode === "online") sendSurrender();
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
let cpuAttribute = null;

// 属性選択画面のカードをATTR_DATAから生成する（属性を足すたびにHTMLを触らなくて済むように）
function renderAttrCards(containerId) {
  document.getElementById(containerId).innerHTML = Object.keys(ATTR_DATA).filter(isAttributeUnlocked).map(attr => {
    const data = ATTR_DATA[attr];
    return `
      <div class="attr-card" data-attr="${attr}" style="--attr-color:${data.color}">
        <img src="${data.img}" alt="${attr}">
        <h3>${data.name}</h3>
        <p>${data.shortDesc}</p>
      </div>
    `;
  }).join("");
}

// バトル開始時にプレイヤー/CPUの属性色をHUD(属性アイコンの光彩・HPバー)へ反映する。
// --attr-color/--hp-color-defaultはCSSカスタムプロパティなので、.player-hud/.cpu-hudに
// 設定するだけで子要素(.player-attr-box, .bar div)に自動的に継承される
function applyAttributeHudColors(playerAttr, cpuAttr) {
  const playerHud = document.querySelector(".player-hud");
  const cpuHud = document.querySelector(".cpu-hud");
  const playerColor = ATTR_DATA[playerAttr] ? ATTR_DATA[playerAttr].color : "";
  const cpuColor = ATTR_DATA[cpuAttr] ? ATTR_DATA[cpuAttr].color : "";

  if (playerHud) {
    playerHud.style.setProperty("--attr-color", playerColor);
    playerHud.style.setProperty("--hp-color-default", playerColor);
  }
  if (cpuHud) {
    cpuHud.style.setProperty("--attr-color", cpuColor);
    cpuHud.style.setProperty("--hp-color-default", cpuColor);
  }
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

  // 1戦目が始まる前にもアイテムカードを1枚選ばせる(以降の「敵撃破後」の選択と同じ画面を流用)。
  // BGMの切り替え(bgmMode停止→bgm選択)はitem-card-listの選択完了時にまとめて行う。
  awaitingInitialItemCard = true;
  renderItemCardChoice();
  showScreen("screen-item-card-select");
});


document.getElementById("btn-mode-cpu").addEventListener("click", () => {
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

  // 前回オンライン対戦で使ったシード付き乱数が残っていると、CPU戦でもbattleRandom()が
  // それを誤って使ってしまう(オンライン対戦なら「ぽん！」のタイミングで必ず再シードされるので、
  // ここでnullに戻しておいても支障はない)
  resetOnlineRng();

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

  resetBattleCounters();

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
    applyAttributeHudColors(playerAttribute, cpuAttribute);
    updateItemCardTab(); // CPU戦/オンラインにはカードが無いため、ここでタブを隠す

    // ⑤ 戦闘画面が表示された瞬間に黒帯を開く
    setTimeout(() => {
      openCurtain();
      playEnemyZoomIn();
      showBattleStartSplash(playerAttribute, cpuAttribute);

      // ⑥ VSスプラッシュ(1s)が表示し終わってから手札を配る
      setTimeout(() => {
        dealHandCards();
      }, 1000);
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

// MYメニュー設定タブ：コイン・クエスト達成状況・属性解放・ステージクリア状況・購入状況(スキン/アイコン)を全てリセットする
const btnResetCoinsQuests = document.getElementById("btn-reset-coins-quests");
if (btnResetCoinsQuests) {
  btnResetCoinsQuests.addEventListener("click", () => {
    showConfirmModal("コイン・クエスト達成状況・解放済み属性・ステージクリア状況・購入状況(スキン/アイコン)をリセットしますか？", () => {
      const defaults = cloneDefaultSaveData();
      saveData.coins = 0;
      saveData.quests = defaults.quests;
      saveData.stats = defaults.stats;
      saveData.unlockedAttributes = [];
      saveData.clearedStages = [];
      saveData.ownedSkins = defaults.ownedSkins;
      saveData.equippedSkin = defaults.equippedSkin;
      saveData.ownedIconBgs = defaults.ownedIconBgs;
      saveData.equippedIconBg = defaults.equippedIconBg;
      saveData.ownedIcons = defaults.ownedIcons;
      saveData.equippedIcon = defaults.equippedIcon;
      saveSaveData();
      updateModeCoinsDisplay();
      updateQuestClaimableBadge();
      renderQuestList();
      updateModeProfileDisplay();
      renderMyMenuSkinList();
      renderMyMenuIconList();
      renderMyMenuIconBgList();
      renderIconPreview();
    });
  });
}

applyHandInputMode();

// カードを確定して出す（クリック確定・ドラッグ&ドロップ共通の着地点）
// 手を出してからstartJankenScene()が呼ばれるまで600ms空くため、その間に連打されると
// 二重に手が確定してじゃんけんが2回発生するバグがあった。ロックで二重発火を防ぐ。
let handCommitted = false;

function commitHand(card, hand) {
  if (handCommitted) return;
  handCommitted = true;

  card.classList.add("fly-away");
  seCardFly.currentTime = 0;
  seCardFly.play();

  // オンライン対戦は、自分の手が決まった瞬間(演出開始前)に送っておくことで
  // 相手の応答を待つ時間を極力減らす
  if (battleContext.mode === "online") sendPlayHand(hand);

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
    if (handCommitted) return;

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
      resolveOnlineOpponentHand(({ opponentHand: cpuHand, yourSeed, opponentSeed }) => {
        // このラウンドの乱数を両クライアントで一致させるため、battleTurn()を呼ぶ前に必ずシードし直す
        seedOnlineRng(yourSeed, opponentSeed);

        playerCard.src = `./images/hands/${handImg[playerHand]}.png`;
        cpuCard.src = `./images/hands/${handImg[cpuHand]}.png`;
        battleTurn(playerHand, cpuHand, playerState, cpuState, playerAttribute, cpuAttribute);
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
    battleTurn(playerHand, cpuHand, playerState, cpuState, playerAttribute, cpuAttribute);

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



// ▼ battleTurn()(js/battle.js)にDIで渡すための小さなDOM操作(元はbattleTurn内にインラインで書かれていた)
function hideDarkOverlay() {
  document.getElementById("darkOverlay").classList.remove("show");
}
function renderPlayerHand(hand) {
  document.getElementById("playerHandImg").src = `./images/hands/${["R", "P", "S"][hand]}.png`;
  document.getElementById("playerHandText").innerText = `あなた：${["グー", "パー", "チョキ"][hand]}`;
}
function renderCpuHand(hand) {
  document.getElementById("cpuHandImg").src = `./images/hands/${["R", "P", "S"][hand]}.png`;
  document.getElementById("cpuHandText").innerText = `CPU：${["グー", "パー", "チョキ"][hand]}`;
}
function setResultText(text) {
  document.getElementById("resultText").innerText = text;
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
