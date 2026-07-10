// js/equipment-catalog.js + js/save-data.js(装備関連)の回帰テスト。
// カタログのデータ構造、グリッド回転・配置判定、永続インベントリの所持/配置ロジックを検証する。
import "./helpers/localstorage-polyfill.js"; // save-data.jsの読み込みより先にlocalStorageを用意する
import { test, assert, summarize } from "./helpers/test-runner.js";
import { EQUIPMENT_CATALOG, GRID_SIZE, rotateShapeCells, getEquipmentCellsAt, canPlaceCells } from "../js/equipment-catalog.js";
import {
  ownEquipment,
  getOwnedEquipmentCount,
  getPlacedEquipmentCount,
  getAvailableEquipmentCount,
  equipEquipmentToGrid,
  unequipEquipmentFromGrid
} from "../js/save-data.js";

console.log("equipment-catalog.test.js");

test("EQUIPMENT_CATALOG: 全エントリがname/desc/rarity/shape/effectsを持つ", () => {
  Object.entries(EQUIPMENT_CATALOG).forEach(([id, eq]) => {
    assert.equal(typeof eq.name, "string", `${id}.nameが文字列でない`);
    assert.equal(typeof eq.desc, "string", `${id}.descが文字列でない`);
    assert.equal(typeof eq.rarity, "string", `${id}.rarityが文字列でない`);
    assert.ok(Array.isArray(eq.shape) && eq.shape.length > 0, `${id}.shapeが非空配列でない`);
    assert.equal(typeof eq.effects, "object", `${id}.effectsがオブジェクトでない`);
  });
});

test("EQUIPMENT_CATALOG: 全エントリの形状はどう回転させても3×3グリッドに収まる", () => {
  Object.entries(EQUIPMENT_CATALOG).forEach(([id, eq]) => {
    const rows = eq.shape.map(([r]) => r);
    const cols = eq.shape.map(([, c]) => c);
    const height = Math.max(...rows) - Math.min(...rows) + 1;
    const width = Math.max(...cols) - Math.min(...cols) + 1;
    assert.ok(height <= GRID_SIZE, `${id}の縦幅(${height})がグリッドサイズを超えている`);
    assert.ok(width <= GRID_SIZE, `${id}の横幅(${width})がグリッドサイズを超えている`);
  });
});

test("rotateShapeCells: L字形状を90度×4回転すると元の形状に戻る", () => {
  const lShape = [[0, 0], [1, 0], [1, 1]];
  assert.deepEqual(rotateShapeCells(lShape, 4), lShape);
  assert.deepEqual(rotateShapeCells(lShape, 0), lShape);
});

test("rotateShapeCells: 横2マスを90度回転すると縦2マスになる", () => {
  const line = [[0, 0], [0, 1]];
  const rotated = rotateShapeCells(line, 1);
  const rows = rotated.map(([r]) => r);
  const cols = rotated.map(([, c]) => c);
  assert.equal(new Set(cols).size, 1, "90度回転後に列がばらけている(縦一列になっていない)");
  assert.equal(new Set(rows).size, 2, "90度回転後に行が2種類でない");
});

test("getEquipmentCellsAt: アンカー位置ぶんオフセットされる", () => {
  const cells = getEquipmentCellsAt("guardPlate", 1, 1, 0);
  assert.deepEqual(cells, [[1, 1], [1, 2]]);
});

test("getEquipmentCellsAt: 未知の装備IDは空配列を返す", () => {
  assert.deepEqual(getEquipmentCellsAt("noSuchEquipment", 0, 0, 0), []);
});

test("canPlaceCells: グリッド外にはみ出す配置は拒否される", () => {
  assert.equal(canPlaceCells([], [[0, 0], [0, 3]]), false);
  assert.equal(canPlaceCells([], [[-1, 0]]), false);
});

test("canPlaceCells: 既存配置と重なるセルは拒否される", () => {
  const existing = [{ cells: [[0, 0], [0, 1]] }];
  assert.equal(canPlaceCells(existing, [[0, 1], [1, 1]]), false);
  assert.equal(canPlaceCells(existing, [[1, 0], [1, 1]]), true);
});

test("ownEquipment/getOwnedEquipmentCount: 複数回呼び出しで所持数が加算される", () => {
  assert.equal(getOwnedEquipmentCount("ironCharm"), 0, "テスト前提: まだ所持していないはず");
  ownEquipment("ironCharm");
  ownEquipment("ironCharm", 2);
  assert.equal(getOwnedEquipmentCount("ironCharm"), 3);
});

// 以降のテストはグリッド配置状態(saveData.equipment.placements)を共有するため、
// 各テストは自分が置いた分を最後に必ずunequipEquipmentFromGrid()で片付け、
// 実行順に依存せずグリッドが常にクリーンな状態から始まるようにする。

test("equipEquipmentToGrid: 成功時にplacementIdを返し、空きが減る", () => {
  ownEquipment("guardPlate", 1);
  assert.equal(getAvailableEquipmentCount("guardPlate"), 1);

  const placementId = equipEquipmentToGrid("guardPlate", 0, 0, 0);
  assert.ok(typeof placementId === "number" && placementId > 0, "placementIdが正の数値でない");
  assert.equal(getPlacedEquipmentCount("guardPlate"), 1);
  assert.equal(getAvailableEquipmentCount("guardPlate"), 0);

  unequipEquipmentFromGrid(placementId);
});

test("equipEquipmentToGrid: 未所持/空きなしの場合は失敗する", () => {
  assert.equal(equipEquipmentToGrid("vitalityBand", 0, 0, 0), false, "未所持のはずが配置できてしまった");

  ownEquipment("powerCore", 1);
  const placementId = equipEquipmentToGrid("powerCore", 1, 1, 0);
  assert.ok(placementId > 0);
  // 所持数1をすでに使い切っているので、2個目の配置は失敗するはず
  assert.equal(equipEquipmentToGrid("powerCore", 1, 1, 0), false);

  unequipEquipmentFromGrid(placementId);
});

test("equipEquipmentToGrid: グリッド外にはみ出す配置は失敗する", () => {
  ownEquipment("vitalityBand", 1);
  assert.equal(equipEquipmentToGrid("vitalityBand", 2, 2, 0), false);
});

test("equipEquipmentToGrid: 既存の配置と重なる場合は失敗する", () => {
  ownEquipment("ironCharm", 5);
  const first = equipEquipmentToGrid("ironCharm", 2, 0, 0);
  assert.ok(first > 0);
  assert.equal(equipEquipmentToGrid("ironCharm", 2, 0, 0), false, "同じマスへの重複配置が成功してしまった");

  unequipEquipmentFromGrid(first);
});

test("unequipEquipmentFromGrid: 削除に成功すると空きが戻り、存在しないIDはfalseを返す", () => {
  // vitalityBandは前のテストでも所持数を加算しているため、絶対値ではなく差分で検証する
  ownEquipment("vitalityBand", 1);
  const availableBeforePlace = getAvailableEquipmentCount("vitalityBand");

  const placementId = equipEquipmentToGrid("vitalityBand", 0, 0, 0);
  assert.ok(placementId > 0);
  assert.equal(getAvailableEquipmentCount("vitalityBand"), availableBeforePlace - 1);

  assert.equal(unequipEquipmentFromGrid(placementId), true);
  assert.equal(getAvailableEquipmentCount("vitalityBand"), availableBeforePlace);
  assert.equal(unequipEquipmentFromGrid(placementId), false, "既に外した配置を再度外せてしまった");
  assert.equal(unequipEquipmentFromGrid(999999), false, "存在しないplacementIdでtrueが返ってしまった");
});

summarize("tests/equipment-catalog.test.js");
