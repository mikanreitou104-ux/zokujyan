// ===== プロフィール =====
// main.jsから切り出したモジュール。モード選択画面左上のアイコン＋名前チップと、
// それをクリックして開くプロフィール画面(#screen-profile)を管理する。
// showScreen/showNameEditModalはmain.js側の汎用UI関数で、profile.js→main.jsの
// 循環importを避けるためimportせず、setProfileCallbacks()で注入してもらう
// (battle.js/quests.jsのsetBattleCallbacks/setQuestBadgeCallbackと同じDIパターン)。

import { saveData, saveSaveData, getStatByPath, incrementStat } from "./save-data.js";
import { ICON_CATALOG, ICON_BG_CATALOG } from "./shop-catalog.js";
import { STAGE_CATALOG } from "./story-catalog.js";
import { QUEST_CATALOG } from "./quests.js";
import { ATTR_BASE_STATUS } from "./attributes.js";
import { TITLE_CATALOG, isTitleUnlocked, getEquippedTitleId, getEquippedTitleName, equipTitle } from "./titles.js";

let callbacks = {};
export function setProfileCallbacks({ showScreen, showNameEditModal }) {
  callbacks = { showScreen, showNameEditModal };
}

// じゃんけんの勝率(手を問わない通算)。roundWinCount/roundLossCount/drawCountはbattleTurn()で更新される
function getRoundWinRatePercent() {
  const wins = getStatByPath("roundWinCount");
  const losses = getStatByPath("roundLossCount");
  const draws = getStatByPath("drawCount");
  const total = wins + losses + draws;
  return total > 0 ? Math.round((wins / total) * 100) : 0;
}

// battle.js(setBattleCallbacks)から毎ターン呼ばれる。roundWinCount等はCPU/ストーリーも合算されるため、
// オンライン対戦のみの勝率を分けて見たい場合はこちらのonline専用カウンタを使う。
// battleContextはmain.js側のグローバルなので、循環importを避けるため呼び出し側からmode文字列を渡してもらう
export function recordOnlineRoundResult(battleMode, result) {
  if (battleMode !== "online") return;
  if (result === "win") incrementStat("onlineRoundWinCount");
  else if (result === "loss") incrementStat("onlineRoundLossCount");
  else incrementStat("onlineDrawCount");
}

// オンライン対戦のみのじゃんけん勝率
function getOnlineRoundWinRatePercent() {
  const wins = getStatByPath("onlineRoundWinCount");
  const losses = getStatByPath("onlineRoundLossCount");
  const draws = getStatByPath("onlineDrawCount");
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
export function updateModeProfileDisplay() {
  const nameEl = document.getElementById("modeProfileName");
  if (nameEl) nameEl.textContent = saveData.profileName || "ユーザー";

  const icon = ICON_CATALOG[saveData.equippedIcon] || ICON_CATALOG.akasra;
  const iconBg = ICON_BG_CATALOG[saveData.equippedIconBg] || ICON_BG_CATALOG.red;
  const iconWrap = document.getElementById("modeProfileIconWrap");
  const iconImg = document.getElementById("modeProfileIconImg");
  if (iconWrap) iconWrap.style.background = iconBg.css;
  if (iconImg) iconImg.src = icon.img;
}

// 称号カード1枚分のHTML(skinCardHTML等と同じ「カード+ステータス+ボタン」パターン)。
// 未解放は.depleted(既存のスキル残り回数0カードと同じグレーアウト見た目)を流用し、条件文(hint)を表示する。
function titleCardHTML(id) {
  const title = TITLE_CATALOG[id];
  const unlocked = isTitleUnlocked(id);
  const equipped = getEquippedTitleId() === id;

  let actionHtml;
  if (equipped) {
    actionHtml = `<div class="skin-status">装備中</div>`;
  } else if (unlocked) {
    actionHtml = `<button class="secondary-btn title-equip-btn" data-title="${id}">装備する</button>`;
  } else {
    actionHtml = `<div class="skin-status">${title.hint}</div>`;
  }

  return `
    <div class="skin-card ${equipped ? "equipped" : ""} ${unlocked ? "" : "depleted"}">
      <div class="skin-name">${title.name}</div>
      ${actionHtml}
    </div>
  `;
}

function renderProfileTitleList() {
  const listEl = document.getElementById("profile-title-list");
  if (listEl) listEl.innerHTML = Object.keys(TITLE_CATALOG).map(id => titleCardHTML(id)).join("");
}

// プロフィール画面本体の中身を描画する
export function renderProfileScreen() {
  updateModeProfileDisplay();

  const icon = ICON_CATALOG[saveData.equippedIcon] || ICON_CATALOG.akasra;
  const iconBg = ICON_BG_CATALOG[saveData.equippedIconBg] || ICON_BG_CATALOG.red;
  document.getElementById("profileNameDisplay").textContent = saveData.profileName || "ユーザー";
  document.getElementById("profileTitleDisplay").textContent = getEquippedTitleName();
  document.getElementById("profileIconWrap").style.background = iconBg.css;
  document.getElementById("profileIconImg").src = icon.img;
  renderProfileTitleList();

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

  const onlineWins = getStatByPath("onlineRoundWinCount");
  const onlineLosses = getStatByPath("onlineRoundLossCount");
  const onlineDraws = getStatByPath("onlineDrawCount");
  const onlineTotal = onlineWins + onlineLosses + onlineDraws;
  document.getElementById("profileOnlineWinRate").textContent = onlineTotal > 0
    ? `${onlineWins}勝${onlineLosses}敗${onlineDraws}分(勝率${getOnlineRoundWinRatePercent()}%)`
    : "まだ対戦していません";

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
    // 前回開いた時のタブ状態が残らないよう、毎回「バトル成績」タブに戻す(MYメニュー/ショップと同じ方針)
    document.querySelectorAll(".profile-tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".profile-tab-panel").forEach(p => p.classList.remove("active"));
    document.querySelector(".profile-tab-btn").classList.add("active");
    document.getElementById("profile-tab-battle").classList.add("active");
    callbacks.showScreen("screen-profile");
  });
}

// プロフィール専用のタブ切り替え(MYメニュー/ショップとは別クラスにして、お互いのactive状態に影響しないようにしている)
document.querySelectorAll(".profile-tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".profile-tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".profile-tab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.profileTabTarget).classList.add("active");
  });
});

const profileTitleList = document.getElementById("profile-title-list");
if (profileTitleList) {
  profileTitleList.addEventListener("click", (e) => {
    const btn = e.target.closest(".title-equip-btn");
    if (!btn) return;

    equipTitle(btn.dataset.title);
    renderProfileScreen(); // ヘッダーの称号バッジ・一覧の装備中表示を両方更新する
  });
}

const btnProfileBack = document.getElementById("btn-profile-back");
if (btnProfileBack) {
  btnProfileBack.addEventListener("click", () => {
    callbacks.showScreen("screen-mode");
  });
}

const btnProfileEditName = document.getElementById("btn-profile-edit-name");
if (btnProfileEditName) {
  btnProfileEditName.addEventListener("click", () => {
    callbacks.showNameEditModal("名前を入力してください(12文字まで)", saveData.profileName || "ユーザー", (newName) => {
      saveData.profileName = newName.slice(0, 12);
      saveSaveData();
      renderProfileScreen();
    });
  });
}
// ===== プロフィールここまで =====
