// ===== セーブデータ基盤 =====
// main.jsから切り出したモジュール。ショップ/MYメニュー/クエスト/ストーリーモードが共有する
// プレイヤーの永続データを扱う。DOM更新(コイン表示・クエストバッジ・プロフィール表示の再描画)は
// main.js/quests.js側の責務なので、注入されたコールバック経由で呼び出す(setUICallbacks参照)。
import { ATTR_BASE_STATUS } from "./attributes.js";
import { EQUIPMENT_CATALOG, getEquipmentCellsAt, canPlaceCells, sumEquipmentEffects } from "./equipment-catalog.js";

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
  clearedStages: [],           // クリア済みステージID一覧（ストーリーモード）
  defeatedEnemyImages: [],     // ストーリーモードで一度でも倒した敵のimgパス一覧(ショップの「倒すと購入可能」条件に使用)
  equipment: {                 // 装備システム(負けても失われない永続インベントリ、アイテムカードとは別物)
    // いったんの初期装備として3種を無料付与(フェーズ3のストーリー敵撃破ドロップが未実装のため、
    // 現状これが唯一の入手経路になっている暫定措置)。powerCoreは意図的に含めていない
    // (tests/equipment-catalog.test.jsの「未所持なら配置に失敗する」検証にそのまま使うため)。
    owned: { ironCharm: 1, guardPlate: 1, vitalityBand: 1 }, // { [equipmentId]: 所持数 }
    placements: [],            // [{ placementId, equipmentId, anchorRow, anchorCol, rotation, cells }]
    nextPlacementId: 1
  }
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
      stats: { ...DEFAULT_SAVE_DATA.stats, ...(parsed.stats || {}) },
      equipment: { ...DEFAULT_SAVE_DATA.equipment, ...(parsed.equipment || {}) }
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

// ストーリーモードで敵を倒すたびに呼ぶ。その敵をimgで記録しておき、
// ICON_CATALOG側のunlockEnemyImgと照合してショップでの購入可否を判定するのに使う
// (このカードはあくまで「購入できるようになる」だけで、無料では手に入らない)。
export function markEnemyDefeated(enemyImg) {
  if (!saveData.defeatedEnemyImages.includes(enemyImg)) {
    saveData.defeatedEnemyImages.push(enemyImg);
    saveSaveData();
  }
}

export function isEnemyDefeated(enemyImg) {
  return saveData.defeatedEnemyImages.includes(enemyImg);
}

export function equipIcon(iconId) {
  if (!saveData.ownedIcons.includes(iconId)) return false;
  saveData.equippedIcon = iconId;
  saveSaveData();
  onProfileChanged();
  return true;
}

// ===== 装備システム =====
// 他のown系(ownSkin等)は「未所持なら1個追加」だが、装備は同じIDを複数所持・複数配置できる
// 想定のため、所持数を加算する形に一般化している。
export function ownEquipment(equipmentId, amount = 1) {
  saveData.equipment.owned[equipmentId] = (saveData.equipment.owned[equipmentId] || 0) + amount;
  saveSaveData();
}

export function getOwnedEquipmentCount(equipmentId) {
  return saveData.equipment.owned[equipmentId] || 0;
}

export function getPlacedEquipmentCount(equipmentId) {
  return saveData.equipment.placements.filter(p => p.equipmentId === equipmentId).length;
}

// 所持数のうち、まだグリッドに配置していない残数(UIが「あと何個置けるか」を出すのに使う)。
export function getAvailableEquipmentCount(equipmentId) {
  return getOwnedEquipmentCount(equipmentId) - getPlacedEquipmentCount(equipmentId);
}

// 成功時は新規placementId(1以上のnumber)を返す。同じ装備を複数枚同時配置できるため、
// equipSkin等のようなboolean返却ではなく、後で特定の配置だけを外せるようidを返す設計にしている。
export function equipEquipmentToGrid(equipmentId, anchorRow, anchorCol, rotation = 0) {
  if (!EQUIPMENT_CATALOG[equipmentId]) return false;
  if (getAvailableEquipmentCount(equipmentId) <= 0) return false;

  const cells = getEquipmentCellsAt(equipmentId, anchorRow, anchorCol, rotation);
  if (!canPlaceCells(saveData.equipment.placements, cells)) return false;

  const placementId = saveData.equipment.nextPlacementId++;
  saveData.equipment.placements.push({ placementId, equipmentId, anchorRow, anchorCol, rotation, cells });
  saveSaveData();
  return placementId;
}

export function unequipEquipmentFromGrid(placementId) {
  const index = saveData.equipment.placements.findIndex(p => p.placementId === placementId);
  if (index === -1) return false;
  saveData.equipment.placements.splice(index, 1);
  saveSaveData();
  return true;
}

export function getEquippedEffectsTotal() {
  return sumEquipmentEffects(saveData.equipment.placements);
}

// ベース値への累積加算(maxHp/maxPower/戦闘開始時power)が必要なフィールドは、単純な代入ではなく
// 個別の計算が要る(hpもmaxHpに追従させる、power上限でクランプする等)ため、下のループでは
// 素通ししない特別扱いにしている。
const EQUIPMENT_CUMULATIVE_FIELDS = new Set(["equipMaxHpBonus", "equipMaxPowerBonus", "equipStartingPowerBonus"]);

// 任意のplacements配列からstateへ装備効果を反映する汎用関数。playerState(saveData.equipment.placements)
// だけでなく、CPU戦のランダム生成装備・オンライン対戦相手の同期済み装備にも同じロジックを使い回すために
// 2026-07-11に切り出した(以前はapplyEquipmentBonuses(state)がsaveDataを決め打ちで読んでいた)。
// アイテムカードのapply(p)と違い、装備は永続データなので「その時点の装備構成から毎回集計し直す」
// 方式にしている。装備87種はいずれもeffectsのキー名がstateのフィールド名と1対1対応するため、新しい装備を
// 追加してもここは触らずに済む(EQUIPMENT_CUMULATIVE_FIELDSに該当しない限り、そのままコピーする)。
export function applyEquipmentEffectsToState(state, placements) {
  const totals = sumEquipmentEffects(placements);
  Object.keys(totals).forEach(key => {
    if (EQUIPMENT_CUMULATIVE_FIELDS.has(key)) return;
    state[key] = totals[key] || 0;
  });

  if (totals.equipMaxHpBonus) {
    state.maxHp += totals.equipMaxHpBonus;
    state.hp += totals.equipMaxHpBonus; // 戦闘開始時点でhpもmaxHpに合わせて底上げする
  }
  if (totals.equipMaxPowerBonus) {
    state.maxPower += totals.equipMaxPowerBonus;
  }
  if (totals.equipStartingPowerBonus) {
    state.power = Math.min(state.power + totals.equipStartingPowerBonus, state.maxPower);
  }

  // トレードオフ装備(HP-N系)を極端に積み重ねても戦闘開始時点でHPが0以下にならないようにする安全弁。
  state.maxHp = Math.max(1, state.maxHp);
  state.hp = Math.max(1, Math.min(state.hp, state.maxHp));
}

// 新しいplayerStateが作られるたびに呼ぶ(main.jsのストーリー開始/beginVersusBattle)。
// 装備の付け外しはMYメニューでいつでも行える想定のため、その時点のsaveData.equipment.placementsから
// 毎回集計し直す。cpuStateにはこちらを使わず、applyEquipmentEffectsToState(cpuState, placements)を
// 呼び出し元(main.js)で直接使う(cpuStateはsaveDataを持たないため)。
export function applyEquipmentBonuses(state) {
  applyEquipmentEffectsToState(state, saveData.equipment.placements);
}

// スキル(type:"skill"の装備、押して発動)の「1戦闘に1回×装備した枚数分」の残り回数を
// 戦闘開始のたびに構築し直す。applyEquipmentBonuses(state)の直後に呼ぶ想定(cpuStateには適用しない)。
export function initSkillCharges(state) {
  state.skillChargesRemaining = {};
  Object.keys(EQUIPMENT_CATALOG)
    .filter(id => EQUIPMENT_CATALOG[id].type === "skill")
    .forEach(id => {
      const placedCount = getPlacedEquipmentCount(id);
      if (placedCount > 0) state.skillChargesRemaining[id] = placedCount;
    });
}
