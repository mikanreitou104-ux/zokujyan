// ===== 装備システム：カタログ定義 + グリッド配置の純粋ヘルパー =====
// shop-catalog.js/story-catalog.jsと同じ「データ定義+軽量な純粋ヘルパー関数」パターン。
// DOM描画・セーブデータへの読み書きはsave-data.js/main.js側の責務(このファイルは持たない)。
// 新しい装備を追加する際は、EQUIPMENT_CATALOGにエントリを足すだけでよい設計。

// 装備を配置する3×3グリッドの一辺のサイズ。
export const GRID_SIZE = 3;

// レアリティ→枠色のマッピング(グリッドセル・所持カードの--equip-cell-colorに使う)。
// common=1〜2マス級、rare=3〜4マス級、epic=5マス以上・または特殊効果級。
export const RARITY_COLORS = {
  common: "#9aa5b1",
  rare: "#a344ff",
  epic: "#ffb238",
};

// 各エントリのeffectsは「attributeBonus()/damageReduction()/battle.js側のフックに加算される」フィールド名。
// アイテムカード用のgenericAtkBonus等と衝突しないよう、装備は必ずequip接頭辞で統一する。
// 2026-07-10セッション：equipment-catalog-designメモ(装備87種+スキル54種の確定版)のうち、
// スキル(押して発動する即時効果)を除いた装備(パッシブ)87種をここに実装する。
export const EQUIPMENT_CATALOG = {
  // ===== Tier1: 1マス(8種、budget=マス数-1=0pt、形の違いなし) =====
  // 2026-07-10: 三角数カーブ(旧)から線形の「マス数-1」予算+コスト表(グー/チョキ/パー攻撃力=1pt、
  // 攻撃力/被ダメ軽減/最大パワー=3pt、最大HP=0.5pt、パー獲得パワー=5pt)に基づく調整版へ変更。
  ironCharm:        { name: "鉄のお守り",     desc: "最大HP+2、グーの攻撃力-1",           rarity: "common", shape: [[0, 0]], effects: { equipMaxHpBonus: 2, equipRockBonus: -1 } },
  powerStoneBrooch: { name: "力石のブローチ", desc: "攻撃力+1、チョキの攻撃力-3",         rarity: "common", shape: [[0, 0]], effects: { equipAtkBonus: 1, equipScissorsBonus: -3 } },
  emergencyBandage: { name: "応急の包帯",     desc: "被ダメージ-1、パーの攻撃力-3",       rarity: "common", shape: [[0, 0]], effects: { equipDefReduction: 1, equipPaperBonus: -3 } },
  smallCharm:       { name: "ちいさなお守り", desc: "最大パワー+1、最大HP-6",             rarity: "common", shape: [[0, 0]], effects: { equipMaxPowerBonus: 1, equipMaxHpBonus: -6 } },
  modestRing:       { name: "質素な指輪",     desc: "グーの攻撃力+2、パーの攻撃力-2",     rarity: "common", shape: [[0, 0]], effects: { equipRockBonus: 2, equipPaperBonus: -2 } },
  woodenShieldPiece:{ name: "木の盾のかけら", desc: "チョキの攻撃力+3、被ダメージ+1",     rarity: "common", shape: [[0, 0]], effects: { equipScissorsBonus: 3, equipDefReduction: -1 } },
  gambleRing:       { name: "賭けの指輪",     desc: "パーの攻撃力+3、最大パワー-1",       rarity: "common", shape: [[0, 0]], effects: { equipPaperBonus: 3, equipMaxPowerBonus: -1 } },
  crackedShield:    { name: "割れた盾",       desc: "攻撃力+2、最大HP-12",                rarity: "common", shape: [[0, 0]], effects: { equipAtkBonus: 2, equipMaxHpBonus: -12 } },

  // ===== Tier2: 2マス(21種、budget=マス数-1=1pt) =====
  guardPlate:          { name: "守りの板金",   desc: "最大HP+2",                              rarity: "common", shape: [[0, 0], [0, 1]], effects: { equipMaxHpBonus: 2 } },
  sturdyGauntlet:      { name: "頑丈な小手",   desc: "グーの攻撃力+1",                        rarity: "common", shape: [[0, 0], [1, 0]], effects: { equipRockBonus: 1 } },
  dragonScaleShard:    { name: "竜鱗の欠片",   desc: "チョキの攻撃力+1",                      rarity: "common", shape: [[0, 0], [1, 1]], effects: { equipScissorsBonus: 1 } },
  aggressiveGauntletSafe: { name: "猛攻の篭手", desc: "パーの攻撃力+1",                       rarity: "common", shape: [[0, 0], [0, 2]], effects: { equipPaperBonus: 1 } },
  infernoBracelet:     { name: "業火の腕輪",   desc: "攻撃力+1、グーの攻撃力-2",              rarity: "common", shape: [[0, 0], [2, 2]], effects: { equipAtkBonus: 1, equipRockBonus: -2 } },
  galeBelt:            { name: "疾風の帯",     desc: "被ダメージ-1、チョキの攻撃力-2",        rarity: "common", shape: [[0, 0], [2, 0]], effects: { equipDefReduction: 1, equipScissorsBonus: -2 } },
  lifeDropSafe:        { name: "命の雫",       desc: "最大パワー+1、パーの攻撃力-2",          rarity: "common", shape: [[0, 0], [0, 1]], effects: { equipMaxPowerBonus: 1, equipPaperBonus: -2 } },
  revivalAmulet:       { name: "蘇生の護符",   desc: "グーの攻撃力+2、パーの攻撃力-1",        rarity: "common", shape: [[0, 0], [1, 0]], effects: { equipRockBonus: 2, equipPaperBonus: -1 } },
  forestBlessing:      { name: "森の恵み",     desc: "チョキの攻撃力+2、最大HP-2",            rarity: "common", shape: [[0, 1], [1, 0]], effects: { equipScissorsBonus: 2, equipMaxHpBonus: -2 } },
  ragingScale:         { name: "猛る天秤",     desc: "パーの攻撃力+4、被ダメージ+1",          rarity: "common", shape: [[0, 0], [0, 1]], effects: { equipPaperBonus: 4, equipDefReduction: -1 } },
  infernoPrice:        { name: "業火の代償",   desc: "最大HP+4、グーの攻撃力-1",              rarity: "common", shape: [[0, 0], [1, 0]], effects: { equipMaxHpBonus: 4, equipRockBonus: -1 } },
  iceMastery:          { name: "氷の心得",     desc: "攻撃力+2、最大パワー-1、最大HP-4",      rarity: "common", shape: [[0, 0], [1, 1]], effects: { equipAtkBonus: 2, equipMaxPowerBonus: -1, equipMaxHpBonus: -4 } },
  lifePrice:           { name: "生命の代価",   desc: "被ダメージ-2、パー獲得パワー-1",        rarity: "common", shape: [[0, 1], [1, 0]], effects: { equipDefReduction: 2, equipPaperGainBonus: -1 } },
  fragileGreatsword:   { name: "脆弱の大剣",   desc: "最大パワー+2、攻撃力-1、チョキの攻撃力-2", rarity: "common", shape: [[0, 0], [0, 2]], effects: { equipMaxPowerBonus: 2, equipAtkBonus: -1, equipScissorsBonus: -2 } },
  turtleShell:         { name: "亀の甲羅",     desc: "パー獲得パワー+1、最大HP-8",            rarity: "common", shape: [[0, 0], [2, 0]], effects: { equipPaperGainBonus: 1, equipMaxHpBonus: -8 } },
  sprintPrice:         { name: "疾走の代償",   desc: "グーの攻撃力+4、被ダメージ+1",          rarity: "common", shape: [[0, 0], [2, 2]], effects: { equipRockBonus: 4, equipDefReduction: -1 } },
  balanceNecklace:     { name: "均衡の首飾り", desc: "チョキの攻撃力+4、最大パワー-1",        rarity: "common", shape: [[0, 0], [0, 1]], effects: { equipScissorsBonus: 4, equipMaxPowerBonus: -1 } },
  obsessionRing:       { name: "執念の指輪",   desc: "パーの攻撃力+4、攻撃力-1",              rarity: "common", shape: [[0, 0], [1, 0]], effects: { equipPaperBonus: 4, equipAtkBonus: -1 } },
  rustedGlove:         { name: "錆びたグローブ", desc: "攻撃力+1、最大HP-4",                  rarity: "common", shape: [[0, 0], [1, 1]], effects: { equipAtkBonus: 1, equipMaxHpBonus: -4 } },
  chippedBlade:        { name: "欠けた刃",     desc: "被ダメージ-1、グーの攻撃力-2",          rarity: "common", shape: [[0, 1], [1, 0]], effects: { equipDefReduction: 1, equipRockBonus: -2 } },
  thinPaperCharm:      { name: "薄紙のお札",   desc: "最大パワー+1、チョキの攻撃力-2",        rarity: "common", shape: [[0, 0], [0, 2]], effects: { equipMaxPowerBonus: 1, equipScissorsBonus: -2 } },

  // ===== Tier3: 3マス(15種、budget=マス数-1=2pt) =====
  vitalityBand:   { name: "活力の帯",     desc: "最大HP+4",                          rarity: "rare", shape: [[0, 0], [1, 0], [1, 1]], effects: { equipMaxHpBonus: 4 } },
  giantsPrice:    { name: "巨人の代償",   desc: "最大HP+8、グーの攻撃力-2",          rarity: "rare", shape: [[0, 0], [1, 0], [2, 0]], effects: { equipMaxHpBonus: 8, equipRockBonus: -2 } },
  mightyGauntlet: { name: "剛力の篭手",   desc: "攻撃力+1、チョキの攻撃力-1",        rarity: "rare", shape: [[0, 0], [0, 1], [0, 2]], effects: { equipAtkBonus: 1, equipScissorsBonus: -1 } },
  championsPrice: { name: "覇者の代償",   desc: "攻撃力+2、パーの攻撃力-4",          rarity: "rare", shape: [[0, 0], [1, 1], [2, 2]], effects: { equipAtkBonus: 2, equipPaperBonus: -4 } },
  ironWallArmor:  { name: "鉄壁の鎧",     desc: "被ダメージ-1、グーの攻撃力-1",      rarity: "rare", shape: [[0, 1], [0, 2], [1, 2]], effects: { equipDefReduction: 1, equipRockBonus: -1 } },
  dragonShellPrice: { name: "竜殻の代償", desc: "被ダメージ-2、チョキの攻撃力-4",    rarity: "rare", shape: [[0, 0], [0, 2], [2, 1]], effects: { equipDefReduction: 2, equipScissorsBonus: -4 } },
  spiritBlessing: { name: "精霊の加護",   desc: "最大HP+2、グーの攻撃力+1",          rarity: "rare", shape: [[0, 0], [0, 1], [1, 0]], effects: { equipMaxHpBonus: 2, equipRockBonus: 1 } },
  guardianCrest:  { name: "守護の紋章",   desc: "最大HP+2、チョキの攻撃力+1",        rarity: "rare", shape: [[0, 1], [1, 1], [2, 1]], effects: { equipMaxHpBonus: 2, equipScissorsBonus: 1 } },
  tripleAmulet:   { name: "三重の護符",   desc: "最大HP+2、パーの攻撃力+1",          rarity: "rare", shape: [[0, 0], [0, 2], [2, 1]], effects: { equipMaxHpBonus: 2, equipPaperBonus: 1 } },
  fistKingProof:  { name: "拳王の証",     desc: "最大パワー+1、グーの攻撃力-1",      rarity: "rare", shape: [[0, 0], [1, 0], [1, 1]], effects: { equipMaxPowerBonus: 1, equipRockBonus: -1 } },
  dualBladeStyle: { name: "双剣の型",     desc: "最大パワー+1、チョキの攻撃力-1",    rarity: "rare", shape: [[0, 2], [1, 1], [2, 0]], effects: { equipMaxPowerBonus: 1, equipScissorsBonus: -1 } },
  graspBracelet:  { name: "掌握の腕輪",   desc: "パー獲得パワー+1、被ダメージ+1",    rarity: "rare", shape: [[1, 0], [1, 1], [1, 2]], effects: { equipPaperGainBonus: 1, equipDefReduction: -1 } },
  hermitStaff:    { name: "隠者の杖",     desc: "最大HP+6、グーの攻撃力-1",          rarity: "rare", shape: [[0, 1], [0, 2], [1, 2]], effects: { equipMaxHpBonus: 6, equipRockBonus: -1 } },
  gamblersRing:   { name: "賭博師の指輪", desc: "攻撃力+2、チョキの攻撃力-4",        rarity: "rare", shape: [[0, 0], [0, 2], [2, 1]], effects: { equipAtkBonus: 2, equipScissorsBonus: -4 } },
  survivalPrice:  { name: "生存の代価",   desc: "被ダメージ-1、パーの攻撃力-1",      rarity: "rare", shape: [[0, 0], [1, 0], [1, 1]], effects: { equipDefReduction: 1, equipPaperBonus: -1 } },

  // ===== Tier4: 4マス(14種、budget=マス数-1=3pt) =====
  powerCore:          { name: "力の核",       desc: "最大パワー+1",                          rarity: "rare", shape: [[0, 0], [0, 1], [1, 0], [1, 1]], effects: { equipMaxPowerBonus: 1 } },
  warGodCore:         { name: "闘神の核",     desc: "被ダメージ-1",                          rarity: "rare", shape: [[0, 0], [0, 1], [0, 2], [1, 1]], effects: { equipDefReduction: 1 } },
  destructionGauntlet:{ name: "破壊の籠手",   desc: "攻撃力+1",                              rarity: "rare", shape: [[1, 1], [0, 1], [1, 0], [1, 2]], effects: { equipAtkBonus: 1 } },
  barbarianGodPrice:  { name: "蛮神の代償",   desc: "攻撃力+2、パーの攻撃力-3",              rarity: "rare", shape: [[0, 1], [0, 2], [1, 0], [1, 1]], effects: { equipAtkBonus: 2, equipPaperBonus: -3 } },
  giantBeastLife:     { name: "巨獣の生命",   desc: "最大HP+6",                              rarity: "rare", shape: [[0, 0], [1, 0], [2, 0], [2, 1]], effects: { equipMaxHpBonus: 6 } },
  phoenixPrice:       { name: "不死鳥の代償", desc: "最大HP+10、グーの攻撃力-2",             rarity: "rare", shape: [[0, 0], [0, 2], [2, 0], [2, 2]], effects: { equipMaxHpBonus: 10, equipRockBonus: -2 } },
  diamondArmor:       { name: "金剛の鎧",     desc: "被ダメージ-2、チョキの攻撃力-3",        rarity: "rare", shape: [[0, 0], [0, 1], [1, 0], [1, 1]], effects: { equipDefReduction: 2, equipScissorsBonus: -3 } },
  guardCore:          { name: "守りの核",     desc: "最大HP+2、グーの攻撃力+2",              rarity: "rare", shape: [[2, 0], [2, 1], [2, 2], [1, 1]], effects: { equipMaxHpBonus: 2, equipRockBonus: 2 } },
  lifeCore:           { name: "生命の核",     desc: "最大HP+4、チョキの攻撃力+1",            rarity: "rare", shape: [[0, 0], [0, 1], [1, 1], [2, 1]], effects: { equipMaxHpBonus: 4, equipScissorsBonus: 1 } },
  swordSaintProof:    { name: "剣聖の証",     desc: "最大パワー+2、グーの攻撃力-3",          rarity: "rare", shape: [[1, 1], [0, 1], [1, 0], [1, 2]], effects: { equipMaxPowerBonus: 2, equipRockBonus: -3 } },
  fistGodProof:       { name: "拳神の証",     desc: "パー獲得パワー+1、チョキの攻撃力-2",    rarity: "rare", shape: [[0, 0], [0, 1], [1, 1], [1, 2]], effects: { equipPaperGainBonus: 1, equipScissorsBonus: -2 } },
  sageStaff:          { name: "賢者の杖",     desc: "最大HP+2、パーの攻撃力+2",              rarity: "rare", shape: [[0, 0], [0, 1], [1, 0], [1, 1]], effects: { equipMaxHpBonus: 2, equipPaperBonus: 2 } },
  overlordGauntlet:   { name: "覇王の籠手",   desc: "グー・チョキ・パーの攻撃力+1ずつ",      rarity: "rare", shape: [[0, 0], [0, 1], [0, 2], [1, 1]], effects: { equipRockBonus: 1, equipScissorsBonus: 1, equipPaperBonus: 1 } },
  lifeInDeathRing:    { name: "死中活の指輪", desc: "攻撃力+2、最大HP-6",                    rarity: "rare", shape: [[0, 0], [0, 1], [1, 0], [2, 0]], effects: { equipAtkBonus: 2, equipMaxHpBonus: -6 } },

  // ===== Tier5: 5〜9マス(14種、budget=マス数-1=4〜8pt、9マスグリッドから欠けマスで表現) =====
  championsFullArmor: { name: "覇者の全身鎧", desc: "被ダメージ-1、最大HP+2",                        rarity: "epic", shape: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 2]], effects: { equipDefReduction: 1, equipMaxHpBonus: 2 } },
  archmageStaff:       { name: "大魔導の杖", desc: "最大パワー+1、グーの攻撃力+1",                  rarity: "epic", shape: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]], effects: { equipMaxPowerBonus: 1, equipRockBonus: 1 } },
  immortalHeart:       { name: "不滅の心臓", desc: "最大HP+8",                                      rarity: "epic", shape: [[1, 1], [1, 2], [2, 0], [2, 1], [2, 2]], effects: { equipMaxHpBonus: 8 } },
  godspeedFist:        { name: "神速の拳",   desc: "攻撃力+2、チョキの攻撃力-2",                    rarity: "epic", shape: [[0, 0], [0, 1], [0, 2], [1, 1], [1, 2]], effects: { equipAtkBonus: 2, equipScissorsBonus: -2 } },
  absoluteDefenseShield:{ name: "絶対防御の盾", desc: "被ダメージ-1、最大HP+4",                      rarity: "epic", shape: [[0, 1], [0, 2], [1, 0], [1, 2], [2, 0], [2, 1]], effects: { equipDefReduction: 1, equipMaxHpBonus: 4 } },
  dragonKingPrice:      { name: "竜王の代償",   desc: "最大HP+14、パーの攻撃力-2",                    rarity: "epic", shape: [[0, 0], [0, 2], [1, 1], [1, 2], [2, 0], [2, 1]], effects: { equipMaxHpBonus: 14, equipPaperBonus: -2 } },
  destructionGodGauntlet:{ name: "破壊神の籠手", desc: "攻撃力+2、グーの攻撃力-1",                    rarity: "epic", shape: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 0], [2, 2]], effects: { equipAtkBonus: 2, equipRockBonus: -1 } },
  omnipotentRing:       { name: "全能の指輪", desc: "最大パワー+1、最大HP+4",                       rarity: "epic", shape: [[0, 1], [0, 2], [1, 0], [1, 2], [2, 0], [2, 1]], effects: { equipMaxPowerBonus: 1, equipMaxHpBonus: 4 } },
  worldTreeDrop:        { name: "世界樹の雫", desc: "最大HP+12",                                     rarity: "epic", shape: [[0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1]], effects: { equipMaxHpBonus: 12 } },
  swordMasterSoul:      { name: "剣豪の魂",   desc: "グーの攻撃力+3、チョキの攻撃力+3",              rarity: "epic", shape: [[0, 0], [0, 1], [1, 0], [1, 1], [1, 2], [2, 1], [2, 2]], effects: { equipRockBonus: 3, equipScissorsBonus: 3 } },
  sageBook:             { name: "賢者の書",   desc: "パー獲得パワー+1、グーの攻撃力+1",              rarity: "epic", shape: [[0, 1], [0, 2], [1, 0], [1, 2], [2, 0], [2, 1], [2, 2]], effects: { equipPaperGainBonus: 1, equipRockBonus: 1 } },
  hegemonArmor:         { name: "覇道の甲冑", desc: "被ダメージ-1、最大HP+8",                        rarity: "epic", shape: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 2], [2, 0], [2, 1], [2, 2]], effects: { equipDefReduction: 1, equipMaxHpBonus: 8 } },
  chaosRing:             { name: "混沌の指輪", desc: "攻撃力+3、チョキの攻撃力-2",                    rarity: "epic", shape: [[0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]], effects: { equipAtkBonus: 3, equipScissorsBonus: -2 } },
  genesisFragment:       { name: "万物創世の欠片", desc: "被ダメージ-1、最大パワー+1、最大HP+4",       rarity: "epic", shape: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]], effects: { equipDefReduction: 1, equipMaxPowerBonus: 1, equipMaxHpBonus: 4 } },

  // ===== 特殊枠: 状態異常・条件付き(15種) =====
  luckyRing:        { name: "幸運の指輪",   desc: "あいこ時5%で追加パワー+1",                     rarity: "epic", shape: [[0, 0]],                         effects: { equipDrawBonusChance: 0.05 } },
  openingTome:      { name: "開始の書",     desc: "戦闘開始時パワー+1",                           rarity: "epic", shape: [[0, 0]],                         effects: { equipStartingPowerBonus: 1 } },
  venomFang:        { name: "猛毒の牙",     desc: "勝利時10%で相手に毒1スタック",                 rarity: "epic", shape: [[0, 0], [0, 1]],                 effects: { equipPoisonOnWinChance: 0.1 } },
  curseChain:       { name: "呪縛の鎖",     desc: "パワー消費時10%で相手に呪い+1",                rarity: "epic", shape: [[0, 0], [1, 0]],                 effects: { equipCurseOnPowerUseChance: 0.1 } },
  galeFeather:      { name: "疾風の羽根",   desc: "手を変えるたびパワー+1",                       rarity: "epic", shape: [[0, 0], [1, 1]],                 effects: { equipHandChangeBonus: 1 } },
  unyieldingHeart:  { name: "不屈の心",     desc: "致死ダメージを1戦闘に1回だけHP1で耐える",      rarity: "epic", shape: [[0, 1], [1, 0]],                 effects: { equipSurviveCharges: 1 } },
  guardianLight:    { name: "守護の光",     desc: "HPが20%以下の時、被ダメージ-2",                rarity: "epic", shape: [[0, 0], [0, 2]],                 effects: { equipLowHpDefBonus: 2 } },
  fightingSpiritCrest: { name: "闘志の紋章", desc: "連勝中、攻撃力+1",                             rarity: "epic", shape: [[0, 0], [2, 0]],                 effects: { equipWinStreakBonus: 1 } },
  silentMask:       { name: "静寂の仮面",   desc: "相手の毒/呪い効果を半減",                       rarity: "epic", shape: [[0, 0], [2, 2]],                 effects: { equipStatusResistRate: 0.5 } },
  freezingRing:     { name: "氷結の指輪",   desc: "勝利時10%で相手の次のパー獲得を無効化",        rarity: "epic", shape: [[0, 0], [0, 1], [0, 2]],         effects: { equipFreezeChanceOnWin: 0.1 } },
  lifestealSword:   { name: "生命奪取の剣", desc: "勝利ダメージの10%を自分のHPに還元",            rarity: "epic", shape: [[0, 0], [1, 0], [2, 0]],         effects: { equipLifestealRate: 0.1 } },
  counterThorn:     { name: "反撃の棘",     desc: "被弾時15%で相手に1反射",                       rarity: "epic", shape: [[0, 0], [1, 0], [1, 1]],         effects: { equipReflectChance: 0.15 } },
  gluttonousJaw:    { name: "悪食の顎",     desc: "グー勝利時、相手のパワーを1奪う",              rarity: "epic", shape: [[0, 0], [1, 1], [2, 2]],         effects: { equipPowerStealOnWin: 1 } },
  tenaciousEye:     { name: "執念の目",     desc: "HPが1の時、1戦闘に1回だけ被ダメージを完全無効化", rarity: "epic", shape: [[0, 0], [0, 2], [2, 1]],       effects: { equipDeathDefianceCharges: 1 } },
  apocalypseBlade:  { name: "終焉の刃",     desc: "相手のHPが20%以下の時、攻撃力+3",              rarity: "epic", shape: [[1, 1], [0, 1], [1, 0], [1, 2]], effects: { equipExecuteBonus: 3 } },

  // ===== スキル(type:"skill"、押して発動、手の選択とは独立の即時効果) =====
  // 常時発動のpassiveな装備とは異なり、effectsは持たず(sumEquipmentEffects/applyEquipmentBonusesは
  // effectsの中身しか見ないため、type/activateは自動的に無視され既存パイプラインは無改修で済む)、
  // 代わりにactivate(playerState, cpuState)という純粋な状態ミューテーターを持つ(アイテムカードの
  // apply(p)と同じ設計思想)。「1戦闘に1回×装備した枚数分」の残り回数はsave-data.jsのinitSkillCharges()が
  // 別枠(state.skillChargesRemaining)で管理するため、ここでは効果の中身だけを定義する。
  // フェーズA(発動基盤)の動作確認用に、まず即時ダメージ系の最小構成を1種だけ実装する。
  quickStrike: {
    name: "一撃離脱", desc: "1ダメージのみ", rarity: "common", type: "skill",
    shape: [[0, 0]], effects: {},
    activate(playerState, cpuState) {
      cpuState.hp = Math.max(0, cpuState.hp - 1);
    }
  },
};

// 装備87種を一目で見分けられるよう、各装備に固有の色を割り当てる。
// レアリティ3色(RARITY_COLORS)だけだと同じ色の装備が大量に重なってしまうため、
// カタログの登録順にHSLの色相を「黄金角(137.508度)」ずつずらして割り振る方式にした。
// 黄金角は何個並べても隣り合う色が均等にばらけることが知られているアルゴリズムで、
// 87種という中途半端な数でも(360で割り切れる数と違い)偏りなく見分けやすい色になる。
const EQUIPMENT_COLORS = {};
Object.keys(EQUIPMENT_CATALOG).forEach((id, index) => {
  const hue = (index * 137.508) % 360;
  EQUIPMENT_COLORS[id] = `hsl(${hue.toFixed(1)}, 65%, 55%)`;
});

// 装備1種ごとの固有色を返す(グリッドセル・所持カード・戦闘HUDの--equip-cell-colorに使う)。
export function getEquipmentColor(equipmentId) {
  return EQUIPMENT_COLORS[equipmentId] || RARITY_COLORS.common;
}

// MYメニューの装備タブを分類タブに分けるためのカテゴリ定義。
// 複合効果を持つ装備(トレードオフ品等)は「その装備を選ぶ理由になっている主効果」で1つに分類する。
// effectsオブジェクトは意図的に「主効果を先頭のキーにする」書き方で統一してあるため、
// 先頭キーだけを見れば十分に分類できる(2つ目以降はおまけの副作用、というのが命名・実装の一貫した方針)。
export const EQUIPMENT_CATEGORIES = [
  { id: "attack", label: "攻撃力系" },
  { id: "hp", label: "体力系" },
  { id: "defense", label: "防御系" },
  { id: "power", label: "パワー系" },
  { id: "special", label: "特殊効果系" },
  { id: "skill", label: "スキル" },
];

const EFFECT_KEY_TO_CATEGORY = {
  equipAtkBonus: "attack",
  equipRockBonus: "attack",
  equipScissorsBonus: "attack",
  equipPaperBonus: "attack",
  equipMaxHpBonus: "hp",
  equipDefReduction: "defense",
  equipMaxPowerBonus: "power",
  equipPaperGainBonus: "power",
  equipStartingPowerBonus: "power",
  equipHandChangeBonus: "power",
  // 上記以外(確率発動・条件付き・状態異常系)は全て「特殊効果系」に分類される(EFFECT_KEY_TO_CATEGORYに
  // 未登録のキーはgetEquipmentCategory()側のフォールバックでspecialになる)。
};

export function getEquipmentCategory(equipmentId) {
  const equipment = EQUIPMENT_CATALOG[equipmentId];
  if (!equipment) return "special";
  if (equipment.type === "skill") return "skill";
  const primaryKey = Object.keys(equipment.effects)[0];
  return EFFECT_KEY_TO_CATEGORY[primaryKey] || "special";
}

// shapeを90度刻みで回転させる。rotation=0/1/2/3がそれぞれ0/90/180/270度に対応。
// (r,c) => (c, maxR - r) を1回転につき1回適用する(このグリッドは常に0,0起点に正規化される)。
// 現在UIからは回転操作を廃止済みだが、グリッド配置の当たり判定自体はrotation=0で内部的に使い続けるため、
// このエンジン層の関数は残してある(将来的にUIで再度使う可能性を潰さないため)。
export function rotateShapeCells(shape, rotation = 0) {
  const steps = ((rotation % 4) + 4) % 4;
  let cells = shape;
  for (let i = 0; i < steps; i++) {
    const maxR = Math.max(...cells.map(([r]) => r));
    cells = cells.map(([r, c]) => [c, maxR - r]);
  }
  return cells;
}

// 装備を指定のアンカー位置・回転でグリッドに置いた場合の、絶対座標セル一覧を返す。
export function getEquipmentCellsAt(equipmentId, anchorRow, anchorCol, rotation = 0) {
  const equipment = EQUIPMENT_CATALOG[equipmentId];
  if (!equipment) return [];
  return rotateShapeCells(equipment.shape, rotation).map(([r, c]) => [anchorRow + r, anchorCol + c]);
}

// cellsがグリッド範囲内に収まり、かつexistingPlacements(それぞれ{cells:[[r,c],...]}を持つ)の
// どのセルとも重複しないかを判定する。
export function canPlaceCells(existingPlacements, cells) {
  const occupied = new Set();
  existingPlacements.forEach(placement => {
    placement.cells.forEach(([r, c]) => occupied.add(`${r},${c}`));
  });

  return cells.every(([r, c]) => {
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
    return !occupied.has(`${r},${c}`);
  });
}

// placements(それぞれ{equipmentId,...}を持つ)が持つ装備のeffectsを全て合算して返す。
// 同じ装備を複数枚配置している場合はその分だけ加算される。存在しないequipmentIdは無視する。
export function sumEquipmentEffects(placements) {
  const totals = {};
  placements.forEach(placement => {
    const equipment = EQUIPMENT_CATALOG[placement.equipmentId];
    if (!equipment) return;
    Object.entries(equipment.effects).forEach(([key, value]) => {
      totals[key] = (totals[key] || 0) + value;
    });
  });
  return totals;
}

// 指定したplacements配列の中から、(row, col)のマスを占有しているplacementを1つ返す(無ければundefined)。
// 元はmain.js側にsaveData.equipment.placements決め打ちで実装されていたが、CPU戦のランダム生成装備・
// オンライン対戦相手の同期済み装備でも同じロジックが要るため、2026-07-11に汎用の純粋関数として
// こちらへ移設した(MYメニューの装備タブ・プレイヤー/CPU側の戦闘HUDが同じ関数をplacementsだけ変えて呼ぶ)。
export function getPlacementAt(placements, row, col) {
  return placements.find(p => p.cells.some(([r, c]) => r === row && c === col));
}

// CPU戦の敵にランダムな装備構成を与えるための生成関数(呼び出すたびに毎回新しく組む、保存はしない)。
// スキル(type:"skill")はプレイヤーが押して発動する前提の別カテゴリで、CPUが自発的に使う導線を
// 今回作らないため候補から除外する。難易度に応じた重み付けはせず、単純にランダムなcount個を
// グリッドに収まる範囲で詰め込むだけ(将来、敵の強さに応じて個数やレアリティを調整する余地を残す)。
export function generateRandomEquipmentPlacements(count = 3) {
  const candidateIds = Object.keys(EQUIPMENT_CATALOG).filter(id => EQUIPMENT_CATALOG[id].type !== "skill");
  const shuffledIds = [...candidateIds].sort(() => Math.random() - 0.5);

  const allPositions = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      allPositions.push([r, c]);
    }
  }

  const placements = [];
  let nextPlacementId = 1;

  for (const equipmentId of shuffledIds) {
    if (placements.length >= count) break;

    const shuffledPositions = [...allPositions].sort(() => Math.random() - 0.5);
    for (const [anchorRow, anchorCol] of shuffledPositions) {
      const cells = getEquipmentCellsAt(equipmentId, anchorRow, anchorCol, 0);
      if (canPlaceCells(placements, cells)) {
        placements.push({ placementId: nextPlacementId++, equipmentId, anchorRow, anchorCol, rotation: 0, cells });
        break;
      }
    }
  }

  return placements;
}
