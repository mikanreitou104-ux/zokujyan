// ===== 装備システム：カタログ定義 + グリッド配置の純粋ヘルパー =====
// shop-catalog.js/story-catalog.jsと同じ「データ定義+軽量な純粋ヘルパー関数」パターン。
// DOM描画・セーブデータへの読み書きはsave-data.js/main.js側の責務(このファイルは持たない)。
// 新しい装備を追加する際は、EQUIPMENT_CATALOGにエントリを足すだけでよい設計。

// 装備を配置する3×3グリッドの一辺のサイズ。
export const GRID_SIZE = 3;

// 各エントリのeffectsは「フェーズ2でattributeBonus()/damageReduction()に加算される予定のフィールド名」。
// アイテムカード用のgenericAtkBonus等と衝突しないよう、装備は必ずequip接頭辞で統一する。
export const EQUIPMENT_CATALOG = {
  ironCharm:    { name: "鉄のお守り",   desc: "攻撃力+1",           rarity: "common", shape: [[0, 0]],                         effects: { equipAtkBonus: 1 } },
  guardPlate:   { name: "守りの板金",   desc: "被ダメージ-1",        rarity: "common", shape: [[0, 0], [0, 1]],                 effects: { equipDefReduction: 1 } },
  vitalityBand: { name: "活力の帯",     desc: "最大HP+6",           rarity: "rare",   shape: [[0, 0], [1, 0], [1, 1]],         effects: { equipMaxHpBonus: 6 } },
  powerCore:    { name: "力の核",       desc: "最大パワー+1",        rarity: "rare",   shape: [[0, 0], [0, 1], [1, 0], [1, 1]], effects: { equipMaxPowerBonus: 1 } },
};

// shapeを90度刻みで回転させる。rotation=0/1/2/3がそれぞれ0/90/180/270度に対応。
// (r,c) => (c, maxR - r) を1回転につき1回適用する(このグリッドは常に0,0起点に正規化される)。
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
