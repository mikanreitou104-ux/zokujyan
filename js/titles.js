// ===== 称号(二つ名)システム =====
// js/quests.js(統計ベースの段階クエスト)と同じ設計思想で、saveData.statsの値から
// 条件を満たしているかをその場で判定する。クエストと違い「達成記録」を別途persistしない
// (所持リストを持たず、常に現在の統計から動的に算出する)。
import { saveData, getStatByPath, saveSaveData } from "./save-data.js";
import { ATTR_BASE_STATUS } from "./attributes.js";

export const TITLE_CATALOG = {
  beginner:        { name: "見習い",           hint: "初期称号",                    condition: () => true },
  // 参考画像の「強き者」への軽いオマージュ。じゃんけん通算勝利数(CPU/ストーリー/オンライン合算)で判定
  strongOne:       { name: "強き者",           hint: "じゃんけん通算300勝",          condition: () => getStatByPath("roundWinCount") >= 300 },
  cpuChampion:     { name: "CPU戦の覇者",      hint: "CPU戦100勝",                  condition: () => getStatByPath("cpuBattlesWon") >= 100 },
  onlineWarrior:   { name: "対戦相手泣かせ",    hint: "オンライン対戦30勝",           condition: () => getStatByPath("onlineRoundWinCount") >= 30 },
  onlineVeteran:   { name: "オンラインの猛者",  hint: "オンライン対戦通算100戦",       condition: () => (getStatByPath("onlineRoundWinCount") + getStatByPath("onlineRoundLossCount") + getStatByPath("onlineDrawCount")) >= 100 },
  rockMaster:      { name: "グーの達人",        hint: "グーで50勝",                  condition: () => getStatByPath("handWinCount.rock") >= 50 },
  paperMaster:     { name: "パーの達人",        hint: "パーで50勝",                  condition: () => getStatByPath("handWinCount.paper") >= 50 },
  scissorsMaster:  { name: "チョキの達人",      hint: "チョキで50勝",                 condition: () => getStatByPath("handWinCount.scissors") >= 50 },
  bigHitter:       { name: "会心の一撃",        hint: "10ダメージ以上の攻撃を50回",    condition: () => getStatByPath("highDamageHits") >= 50 },
  iceMaster:       { name: "氷結の支配者",      hint: "相手を30回凍結させる",          condition: () => getStatByPath("freezeCount") >= 30 },
  poisonMaster:    { name: "猛毒の使い手",      hint: "相手に30回毒を付与",            condition: () => getStatByPath("poisonApplyCount") >= 30 },
  curseMaster:     { name: "呪術師",           hint: "相手に30回呪いを付与",          condition: () => getStatByPath("curseApplyCount") >= 30 },
  attributeMaster: { name: "属性コレクター",    hint: "全属性を解放する",              condition: () => saveData.unlockedAttributes.length + 3 >= Object.keys(ATTR_BASE_STATUS).length },
  richPlayer:      { name: "コインコレクター",  hint: "生涯獲得コイン5000枚",          condition: () => getStatByPath("coinsEarnedTotal") >= 5000 }
};

export function isTitleUnlocked(id) {
  return !!TITLE_CATALOG[id] && TITLE_CATALOG[id].condition();
}

export function getUnlockedTitleIds() {
  return Object.keys(TITLE_CATALOG).filter(isTitleUnlocked);
}

// 未装備、または装備中の称号が条件を満たさなくなった場合(理論上は起こらないが安全のため)はbeginnerへ
export function getEquippedTitleId() {
  return saveData.equippedTitle && isTitleUnlocked(saveData.equippedTitle) ? saveData.equippedTitle : "beginner";
}

export function getEquippedTitleName() {
  return TITLE_CATALOG[getEquippedTitleId()].name;
}

export function equipTitle(id) {
  if (!isTitleUnlocked(id)) return false;
  saveData.equippedTitle = id;
  saveSaveData();
  return true;
}
