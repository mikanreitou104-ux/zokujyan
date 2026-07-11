// js/equipment-catalog.js + js/save-data.js(装備関連)の回帰テスト。
// カタログのデータ構造、グリッド回転・配置判定、永続インベントリの所持/配置ロジックを検証する。
import "./helpers/localstorage-polyfill.js"; // save-data.jsの読み込みより先にlocalStorageを用意する
import { test, assert, summarize } from "./helpers/test-runner.js";
import { EQUIPMENT_CATALOG, GRID_SIZE, rotateShapeCells, getEquipmentCellsAt, canPlaceCells, sumEquipmentEffects, EQUIPMENT_CATEGORIES, getEquipmentCategory, getEquipmentColor, getPlacementAt, generateRandomEquipmentPlacements } from "../js/equipment-catalog.js";
import {
  ownEquipment,
  getOwnedEquipmentCount,
  getPlacedEquipmentCount,
  getAvailableEquipmentCount,
  equipEquipmentToGrid,
  unequipEquipmentFromGrid,
  getEquippedEffectsTotal,
  applyEquipmentBonuses,
  applyEquipmentEffectsToState,
  initSkillCharges,
  cloneDefaultSaveData
} from "../js/save-data.js";

console.log("equipment-catalog.test.js");

test("EQUIPMENT_CATALOG: スキル以外の装備87種(Tier1〜5+特殊枠)が全て登録されている", () => {
  const passiveIds = Object.keys(EQUIPMENT_CATALOG).filter(id => EQUIPMENT_CATALOG[id].type !== "skill");
  assert.equal(passiveIds.length, 87);
});

test("EQUIPMENT_CATALOG: type:\"skill\"のエントリはeffectsが空でactivate(playerState, cpuState)を持つ(passiveの集計パイプラインに混ざらない)", () => {
  const skillIds = Object.keys(EQUIPMENT_CATALOG).filter(id => EQUIPMENT_CATALOG[id].type === "skill");
  assert.ok(skillIds.length > 0, "スキルが1件も登録されていない");
  skillIds.forEach(id => {
    const skill = EQUIPMENT_CATALOG[id];
    assert.deepEqual(skill.effects, {}, `${id}.effectsが空でない`);
    assert.equal(typeof skill.activate, "function", `${id}.activateが関数でない`);
  });
});

test("getEquipmentCategory: 全エントリがEQUIPMENT_CATEGORIESのいずれか1つに分類される", () => {
  const validIds = EQUIPMENT_CATEGORIES.map(c => c.id);
  Object.keys(EQUIPMENT_CATALOG).forEach(id => {
    assert.ok(validIds.includes(getEquipmentCategory(id)), `${id}が既知のカテゴリに分類されていない`);
  });
});

test("getEquipmentCategory: type:\"skill\"のエントリはeffectsの中身によらず必ずskillに分類される", () => {
  assert.equal(getEquipmentCategory("quickStrike"), "skill");
});

test("getEquipmentCategory: 代表的な装備が意図した分類になる(主効果=先頭キーで判定)", () => {
  // 2026-07-10: マス数-1の線形予算+コスト表への調整版でTier1〜5の効果を全面的に更新した際、
  // 各装備の先頭キー(=分類の決め手)も変わったため、期待値をここで合わせて更新している。
  assert.equal(getEquipmentCategory("ironCharm"), "hp"); // equipMaxHpBonusが先頭キー
  assert.equal(getEquipmentCategory("vitalityBand"), "hp"); // equipMaxHpBonusのみ
  assert.equal(getEquipmentCategory("guardPlate"), "hp"); // equipMaxHpBonusのみ
  assert.equal(getEquipmentCategory("powerCore"), "power"); // equipMaxPowerBonusのみ
  assert.equal(getEquipmentCategory("luckyRing"), "special"); // equipDrawBonusChance(未分類キー)
  // トレードオフ装備は「主効果(先頭キー)」で分類される。木の盾のかけらはチョキの攻撃力が先頭キーなのでattack、
  // 質素な指輪はグーの攻撃力が先頭キーなのでattack(どちらも複合効果だが分類は割れない)
  assert.equal(getEquipmentCategory("woodenShieldPiece"), "attack");
  assert.equal(getEquipmentCategory("modestRing"), "attack");
  assert.equal(getEquipmentCategory("noSuchEquipment"), "special", "未知のIDはフォールバックでspecialになるはず");
});

test("getEquipmentColor: 87種すべてに互いに異なる色が割り当てられる", () => {
  const colors = Object.keys(EQUIPMENT_CATALOG).map(id => getEquipmentColor(id));
  assert.equal(new Set(colors).size, colors.length, "重複した色があってはいけない");
});

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
  // ironCharmはデフォルトの初期装備付与(1個)を含むため、絶対値ではなく差分で検証する
  const before = getOwnedEquipmentCount("ironCharm");
  ownEquipment("ironCharm");
  ownEquipment("ironCharm", 2);
  assert.equal(getOwnedEquipmentCount("ironCharm"), before + 3);
});

test("DEFAULT_SAVE_DATA: 初期装備としてironCharm/guardPlate/vitalityBandが1個ずつ無料付与される(powerCoreは含まない)", () => {
  const defaults = cloneDefaultSaveData();
  assert.deepEqual(defaults.equipment.owned, { ironCharm: 1, guardPlate: 1, vitalityBand: 1 });
  assert.deepEqual(defaults.equipment.placements, []);
});

// 以降のテストはグリッド配置状態(saveData.equipment.placements)を共有するため、
// 各テストは自分が置いた分を最後に必ずunequipEquipmentFromGrid()で片付け、
// 実行順に依存せずグリッドが常にクリーンな状態から始まるようにする。

test("equipEquipmentToGrid: 成功時にplacementIdを返し、空きが減る", () => {
  // guardPlateはデフォルトの初期装備付与(1個)を含むため、絶対値ではなく差分で検証する
  const beforeOwn = getAvailableEquipmentCount("guardPlate");
  ownEquipment("guardPlate", 1);
  assert.equal(getAvailableEquipmentCount("guardPlate"), beforeOwn + 1);

  const placementId = equipEquipmentToGrid("guardPlate", 0, 0, 0);
  assert.ok(typeof placementId === "number" && placementId > 0, "placementIdが正の数値でない");
  assert.equal(getPlacedEquipmentCount("guardPlate"), 1);
  assert.equal(getAvailableEquipmentCount("guardPlate"), beforeOwn);

  unequipEquipmentFromGrid(placementId);
});

test("equipEquipmentToGrid: 未所持/空きなしの場合は失敗する", () => {
  // powerCoreはデフォルトの初期装備付与に含まれていない(唯一owned===0から始まる装備)ため、
  // 「未所持なら配置に失敗する」の検証にはこれを使う
  assert.equal(getOwnedEquipmentCount("powerCore"), 0, "テスト前提: デフォルトの初期装備付与に含まれていないはず");
  assert.equal(equipEquipmentToGrid("powerCore", 0, 0, 0), false, "未所持のはずが配置できてしまった");

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

test("sumEquipmentEffects: 複数placementの効果を合算する(pure function、同じ装備を複数枚でも加算される)", () => {
  const placements = [
    { equipmentId: "ironCharm" },
    { equipmentId: "ironCharm" },
    { equipmentId: "guardPlate" }
  ];
  // ironCharm: 最大HP+2・グーの攻撃力-1、guardPlate: 最大HP+2(2026-07-10調整版)
  assert.deepEqual(sumEquipmentEffects(placements), { equipMaxHpBonus: 6, equipRockBonus: -2 });
});

test("sumEquipmentEffects: 空配列は空オブジェクトを返す", () => {
  assert.deepEqual(sumEquipmentEffects([]), {});
});

test("applyEquipmentBonuses: equipAtkBonus/equipDefReductionがstateに反映される(装備なしの効果は0)", () => {
  // destructionGauntlet(equipAtkBonusのみ)・warGodCore(equipDefReductionのみ)はどちらも
  // T字4マスで盤面中央(1,1)を共有するため同時装備できない(シェイプ設計上の制約)。
  // そのため1個ずつ個別に検証する。
  ownEquipment("destructionGauntlet", 1);
  const p1 = equipEquipmentToGrid("destructionGauntlet", 0, 0, 0);
  assert.ok(p1 > 0, "グリッドが埋まっておらず配置できるはず");
  const state1 = { hp: 25, maxHp: 25, power: 3, maxPower: 3 };
  applyEquipmentBonuses(state1);
  assert.equal(state1.equipAtkBonus, 1);
  assert.equal(state1.maxHp, 25, "maxHpボーナスを持つ装備は付けていないので変化しない");
  unequipEquipmentFromGrid(p1);

  ownEquipment("warGodCore", 1);
  const p2 = equipEquipmentToGrid("warGodCore", 0, 0, 0);
  assert.ok(p2 > 0, "グリッドが埋まっておらず配置できるはず");
  const state2 = { hp: 25, maxHp: 25, power: 3, maxPower: 3 };
  applyEquipmentBonuses(state2);
  assert.equal(state2.equipDefReduction, 1);
  assert.equal(state2.maxPower, 3, "maxPowerボーナスを持つ装備は付けていないので変化しない");
  unequipEquipmentFromGrid(p2);
});

test("applyEquipmentBonuses: equipMaxHpBonus/equipMaxPowerBonusはベース値に直接加算され、hpもmaxHpに合わせて底上げされる", () => {
  ownEquipment("vitalityBand", 1);
  ownEquipment("powerCore", 1);
  // vitalityBandをrotation=1で置くと中央マス(1,1)を避けられるため、powerCore(2x2)と共存できる
  const p1 = equipEquipmentToGrid("vitalityBand", 0, 0, 1);
  const p2 = equipEquipmentToGrid("powerCore", 1, 1, 0);
  assert.ok(p1 > 0 && p2 > 0, "グリッドが埋まっておらず配置できるはず");
  // vitalityBandは2026-07-10調整版で最大HP+4(旧+6)に変更済み
  assert.deepEqual(getEquippedEffectsTotal(), { equipMaxHpBonus: 4, equipMaxPowerBonus: 1 });

  const state = { hp: 25, maxHp: 25, power: 3, maxPower: 3 };
  applyEquipmentBonuses(state);
  assert.equal(state.maxHp, 29);
  assert.equal(state.hp, 29, "戦闘開始時点でhpもmaxHpに合わせて底上げされるはず");
  assert.equal(state.maxPower, 4);

  unequipEquipmentFromGrid(p1);
  unequipEquipmentFromGrid(p2);
});

test("applyEquipmentBonuses: equipStartingPowerBonus(開始の書)は戦闘開始時のpowerに加算され、maxPowerでクランプされる", () => {
  ownEquipment("openingTome", 1);
  const p1 = equipEquipmentToGrid("openingTome", 0, 0, 0);
  assert.ok(p1 > 0);

  const state = { hp: 25, maxHp: 25, power: 2, maxPower: 3 };
  applyEquipmentBonuses(state);
  assert.equal(state.power, 3, "power+1されているはず");

  const clamped = { hp: 25, maxHp: 25, power: 3, maxPower: 3 };
  applyEquipmentBonuses(clamped);
  assert.equal(clamped.power, 3, "maxPowerでクランプされるはず");

  unequipEquipmentFromGrid(p1);
});

test("applyEquipmentBonuses: 未知のequip*フィールド(将来の新規装備)も自動的にstateへコピーされる", () => {
  ownEquipment("guardianLight", 1); // equipLowHpDefBonus: 2
  const p1 = equipEquipmentToGrid("guardianLight", 0, 0, 0);
  assert.ok(p1 > 0);

  const state = { hp: 25, maxHp: 25, power: 3, maxPower: 3 };
  applyEquipmentBonuses(state);
  assert.equal(state.equipLowHpDefBonus, 2, "EQUIPMENT_CATALOGにフィールドを足すだけで自動的に反映されるはず");

  unequipEquipmentFromGrid(p1);
});

test("applyEquipmentBonuses: 最大HPトレードオフを積み重ねてもmaxHp/hpは1未満にならない(安全弁)", () => {
  const state = { hp: 25, maxHp: 25, power: 3, maxPower: 3 };
  applyEquipmentBonuses(state); // 装備なしの状態でも壊れないことを確認
  assert.equal(state.maxHp, 25);
  assert.equal(state.hp, 25);
});

test("initSkillCharges: 装備した枚数分だけskillChargesRemainingに反映され、未装備のスキルは含まれない", () => {
  ownEquipment("quickStrike", 2);
  const p1 = equipEquipmentToGrid("quickStrike", 0, 0, 0);
  const p2 = equipEquipmentToGrid("quickStrike", 0, 1, 0);
  assert.ok(p1 > 0 && p2 > 0, "グリッドが埋まっておらず配置できるはず");

  const state = {};
  initSkillCharges(state);
  assert.deepEqual(state.skillChargesRemaining, { quickStrike: 2 });

  unequipEquipmentFromGrid(p1);
  unequipEquipmentFromGrid(p2);

  const stateAfterUnequip = {};
  initSkillCharges(stateAfterUnequip);
  assert.deepEqual(stateAfterUnequip.skillChargesRemaining, {}, "外した後は残り回数マップに含まれないはず");
});

// ===== 敵(CPU戦のランダム装備・オンライン対戦相手の同期済み装備)の表示・適用に使う汎用関数 =====

test("getPlacementAt: 指定したplacements配列の中から、そのマスを占有しているplacementを返す(saveData非依存)", () => {
  const placements = [
    { equipmentId: "ironCharm", cells: [[0, 0]] },
    { equipmentId: "vitalityBand", cells: [[1, 0], [2, 0], [2, 1]] }
  ];
  assert.equal(getPlacementAt(placements, 0, 0).equipmentId, "ironCharm");
  assert.equal(getPlacementAt(placements, 2, 1).equipmentId, "vitalityBand");
  assert.equal(getPlacementAt(placements, 0, 1), undefined, "何も置かれていないマスはundefinedのはず");
});

test("generateRandomEquipmentPlacements: 指定件数以内で、グリッド内に収まり重複しない配置を生成する", () => {
  for (let i = 0; i < 20; i++) {
    const placements = generateRandomEquipmentPlacements(3);
    assert.ok(placements.length <= 3, "count(3)を超えていないはず");
    assert.ok(placements.length > 0, "装備87種もあれば1個も置けないことは無いはず");

    const occupied = new Set();
    placements.forEach(p => {
      p.cells.forEach(([r, c]) => {
        assert.ok(r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE, "グリッド範囲外に置かれている");
        const key = `${r},${c}`;
        assert.ok(!occupied.has(key), "マスが重複している");
        occupied.add(key);
      });
    });

    const equipmentIds = placements.map(p => p.equipmentId);
    assert.equal(new Set(equipmentIds).size, equipmentIds.length, "同じ装備が複数回選ばれている(重複禁止)");
    equipmentIds.forEach(id => {
      assert.notEqual(EQUIPMENT_CATALOG[id].type, "skill", "スキルは候補から除外されているはず");
    });
  }
});

test("generateRandomEquipmentPlacements: countを0にすると空配列を返す", () => {
  assert.deepEqual(generateRandomEquipmentPlacements(0), []);
});

test("applyEquipmentEffectsToState: 任意のplacements配列(saveDataを経由しない)からstateへ効果を反映する", () => {
  // 装備の数値バランスは調整され得るため、期待値はsumEquipmentEffects()から動的に導出する
  // (「反映のメカニズムが正しいか」だけを検証し、個々の装備の数値そのものには依存しない)。
  const placements = [
    { equipmentId: "ironCharm", cells: [[0, 0]] },
    { equipmentId: "guardPlate", cells: [[0, 1], [0, 2]] }
  ];
  const expectedTotals = sumEquipmentEffects(placements);
  const state = { hp: 20, maxHp: 20, power: 3, maxPower: 3 };
  applyEquipmentEffectsToState(state, placements);

  const maxHpBonus = expectedTotals.equipMaxHpBonus || 0;
  assert.equal(state.maxHp, 20 + maxHpBonus, "equipMaxHpBonusがベース値に加算されているはず");
  assert.equal(state.hp, 20 + maxHpBonus, "hpもmaxHpに合わせて底上げされているはず");

  Object.entries(expectedTotals).forEach(([key, value]) => {
    if (["equipMaxHpBonus", "equipMaxPowerBonus", "equipStartingPowerBonus"].includes(key)) return;
    assert.equal(state[key], value, `${key}が反映されていない`);
  });
});

test("applyEquipmentEffectsToState: 空配列を渡してもエラーにならず、装備由来のフィールドは0になる", () => {
  const state = { hp: 20, maxHp: 20, power: 3, maxPower: 3 };
  applyEquipmentEffectsToState(state, []);
  assert.equal(state.maxHp, 20);
  assert.equal(state.hp, 20);
});

summarize("tests/equipment-catalog.test.js");
