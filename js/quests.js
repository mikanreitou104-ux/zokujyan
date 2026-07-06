// ===== クエスト(データ・進捗計算) =====
// main.jsから切り出したモジュール。DOM描画(renderQuestList等)やタブ選択状態は main.js 側の責務。
// 手動で条件を書く6種(1戦闘内の最大値やピーク値を見る特殊条件)に加え、
// buildMilestoneQuests()でsaveData.statsの値をそのまま目標にする大量の段階クエストを生成する。
// 生成クエストはstatPathを持ち、進捗はupdateQuestProgress()を個別に呼ばなくても
// getQuestProgress()がsaveData.statsから直接読む(incrementStat()で増やすだけで自動反映)。
//
// name/descに属性名を使うクエストは、文字列ではなく関数にしてある(呼び出し側のresolveQuestTextで評価する)。
//
// タブ分け・1本の進捗トラックにまとめる表示のため、同じstatPathを持つクエストは
// 「1本の連続した段階」として扱う。QUEST_LINE_METAにその行の見出し(label)と所属タブ(category)を持たせる。
import { ATTR_BASE_STATUS, ATTR_DATA } from "./attributes.js";
import { saveData, getStatByPath, addCoins, saveSaveData } from "./save-data.js";

// updateQuestProgressが呼ぶバッジ更新はDOM操作なのでmain.js側から注入してもらう
let onQuestBadgeChanged = () => {};
export function setQuestBadgeCallback(fn) {
  onQuestBadgeChanged = fn;
}

export const QUEST_LINE_META = {};

export function buildMilestoneQuests() {
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
export const QUEST_CATEGORIES = [
  { id: "cpuBattle", label: "CPU戦" },
  { id: "attribute", label: "属性" },
  { id: "combat", label: "戦闘記録" },
  { id: "economy", label: "獲得・購入" }
];

export const QUEST_CATALOG = {
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
export function getQuestGroupKey(questId) {
  return QUEST_CATALOG[questId].statPath || questId;
}

// 画面に表示する行(グループ)一覧を、指定タブに属するものだけカテゴリ順・target昇順で返す
export function getQuestLinesForCategory(category) {
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
export function updateQuestProgress(questId, value) {
  const record = saveData.quests.mainProgress[questId] || { progress: 0, claimed: false };
  if (value > record.progress) record.progress = value;
  saveData.quests.mainProgress[questId] = record;
  saveSaveData();
  onQuestBadgeChanged();
}

// statPathを持つクエストはsaveData.statsから直接読み、持たない場合は従来通りmainProgressの保存値を読む
export function getQuestProgress(questId) {
  const quest = QUEST_CATALOG[questId];
  if (quest.statPath) return getStatByPath(quest.statPath);
  const record = saveData.quests.mainProgress[questId];
  return record ? record.progress : 0;
}

export function isQuestClaimable(questId) {
  const record = saveData.quests.mainProgress[questId];
  if (record && record.claimed) return false;
  return getQuestProgress(questId) >= QUEST_CATALOG[questId].target;
}

// クエスト画面で「獲得する」を押した時に呼ぶ。ここで初めて報酬コインが付与される
export function claimQuestReward(questId) {
  if (!isQuestClaimable(questId)) return false;
  const record = saveData.quests.mainProgress[questId] || { progress: 0, claimed: false };
  record.claimed = true;
  saveData.quests.mainProgress[questId] = record;
  addCoins(QUEST_CATALOG[questId].reward); // addCoins内でsaveSaveData()される
  return true;
}

export function countClaimableQuests() {
  return Object.keys(QUEST_CATALOG).filter(isQuestClaimable).length;
}
