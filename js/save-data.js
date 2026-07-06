// ===== セーブデータ基盤 =====
// main.jsから切り出したモジュール。ショップ/MYメニュー/クエスト/ストーリーモードが共有する
// プレイヤーの永続データを扱う。DOM更新(コイン表示・クエストバッジ・プロフィール表示の再描画)は
// main.js/quests.js側の責務なので、注入されたコールバック経由で呼び出す(setUICallbacks参照)。
import { ATTR_BASE_STATUS } from "./attributes.js";

let onCoinsChanged = () => {};
let onQuestBadgeChanged = () => {};
let onProfileChanged = () => {};
export function setUICallbacks({ onCoinsChanged: coins, onQuestBadgeChanged: badge, onProfileChanged: profile } = {}) {
  if (coins) onCoinsChanged = coins;
  if (badge) onQuestBadgeChanged = badge;
  if (profile) onProfileChanged = profile;
}

export const SAVE_DATA_KEY = "saveData";

export const DEFAULT_SAVE_DATA = {
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
    onlineRoundWinCount: 0,  // オンライン対戦のみのじゃんけん勝利数(roundWinCountはCPU/ストーリーも含む合算値)
    onlineRoundLossCount: 0, // オンライン対戦のみのじゃんけん敗北数
    onlineDrawCount: 0,      // オンライン対戦のみのあいこ数
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

export function cloneDefaultSaveData() {
  return JSON.parse(JSON.stringify(DEFAULT_SAVE_DATA));
}

export function loadSaveData() {
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

export function saveSaveData() {
  localStorage.setItem(SAVE_DATA_KEY, JSON.stringify(saveData));
}

export let saveData = loadSaveData();

// "winsByAttribute.fire"のようなドット区切りパスでsaveData.statsの値を読み書きするヘルパー。
// 大量の統計連動クエスト(QUEST_CATALOGのstatPath)を、個別にupdateQuestProgress()を呼ばずとも
// この2関数だけで自動的に進捗させられるようにする。
export function getStatByPath(path) {
  const value = path.split(".").reduce((obj, key) => (obj ? obj[key] : undefined), saveData.stats);
  return value || 0;
}

export function incrementStat(path, amount = 1) {
  const keys = path.split(".");
  let obj = saveData.stats;
  for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
  const lastKey = keys[keys.length - 1];
  obj[lastKey] = (obj[lastKey] || 0) + amount;
  saveSaveData();
  onQuestBadgeChanged();
}

// 属性ごとの挑戦回数(attributePlayCount)を記録し、その属性で初めて戦った場合は
// コンプリート系クエスト用のattributesTriedCountも合わせて増やす
export function trackAttributePlay(attr) {
  if (getStatByPath(`attributePlayCount.${attr}`) === 0) {
    incrementStat("attributesTriedCount", 1);
  }
  incrementStat(`attributePlayCount.${attr}`, 1);
}

export function isAttributeUnlocked(attr) {
  return ["fire", "thunder", "ice"].includes(attr) || saveData.unlockedAttributes.includes(attr);
}

export function isStageCleared(stageId) {
  return saveData.clearedStages.includes(stageId);
}

export function markStageCleared(stageId) {
  if (!saveData.clearedStages.includes(stageId)) {
    saveData.clearedStages.push(stageId);
    saveSaveData();
  }
}

export function addCoins(amount) {
  saveData.coins += amount;
  saveData.stats.coinsEarnedTotal = (saveData.stats.coinsEarnedTotal || 0) + amount;
  saveSaveData();
  onCoinsChanged();
  onQuestBadgeChanged();
}

export function spendCoins(amount) {
  if (saveData.coins < amount) return false;
  saveData.coins -= amount;
  saveSaveData();
  onCoinsChanged();
  return true;
}

// ショップ購入・ストーリー報酬など解放経路を問わない共通処理。
// 「ショップ購入」としての集計(shopPurchaseCount)はショップの購入処理側で行う。
export function unlockAttribute(attr) {
  if (!saveData.unlockedAttributes.includes(attr)) {
    saveData.unlockedAttributes.push(attr);
    saveSaveData();
  }
}

export function ownSkin(skinId) {
  if (!saveData.ownedSkins.includes(skinId)) {
    saveData.ownedSkins.push(skinId);
    saveSaveData();
    incrementStat("shopPurchaseCount");
  }
}

export function equipSkin(skinId) {
  if (!saveData.ownedSkins.includes(skinId)) return false;
  saveData.equippedSkin = skinId;
  saveSaveData();
  return true;
}

export function ownIconBg(iconBgId) {
  if (!saveData.ownedIconBgs.includes(iconBgId)) {
    saveData.ownedIconBgs.push(iconBgId);
    saveSaveData();
    incrementStat("shopPurchaseCount");
  }
}

export function equipIconBg(iconBgId) {
  if (!saveData.ownedIconBgs.includes(iconBgId)) return false;
  saveData.equippedIconBg = iconBgId;
  saveSaveData();
  onProfileChanged();
  return true;
}

export function ownIcon(iconId) {
  if (!saveData.ownedIcons.includes(iconId)) {
    saveData.ownedIcons.push(iconId);
    saveSaveData();
    incrementStat("shopPurchaseCount");
  }
}

export function equipIcon(iconId) {
  if (!saveData.ownedIcons.includes(iconId)) return false;
  saveData.equippedIcon = iconId;
  saveSaveData();
  onProfileChanged();
  return true;
}
