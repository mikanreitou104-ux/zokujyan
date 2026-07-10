// js/story-catalog.js の回帰テスト。ステージ/アイテムカードのデータ構造とapply()の挙動を検証する。
import { test, assert, summarize } from "./helpers/test-runner.js";
import { STAGE_CATALOG, ITEM_CARD_CATALOG, pickRandomCardIds } from "../js/story-catalog.js";

console.log("story-catalog.test.js");

test("STAGE_CATALOG: stage1が存在し、必須フィールドを持つ", () => {
  const stage = STAGE_CATALOG.stage1;
  assert.ok(stage, "stage1が存在しない");
  assert.equal(typeof stage.name, "string");
  assert.equal(typeof stage.reward, "number");
  assert.ok(Array.isArray(stage.enemies), "enemiesが配列でない");
  assert.ok(stage.enemies.length > 0, "enemiesが空");
});

test("STAGE_CATALOG: 各敵がattribute/aiType/maxHp/maxPowerを持つ", () => {
  STAGE_CATALOG.stage1.enemies.forEach(enemy => {
    assert.equal(typeof enemy.name, "string");
    assert.equal(typeof enemy.attribute, "string");
    assert.ok(["aggressive", "defensive", "balanced"].includes(enemy.aiType), `未知のaiType: ${enemy.aiType}`);
    assert.equal(typeof enemy.maxHp, "number");
    assert.equal(typeof enemy.maxPower, "number");
  });
});

test("ITEM_CARD_CATALOG: hpUpのapply()はmaxHpを12上げてHPを全回復する", () => {
  const player = { hp: 5, maxHp: 25 };
  ITEM_CARD_CATALOG.hpUp.apply(player);
  assert.equal(player.maxHp, 37);
  assert.equal(player.hp, 37);
});

test("ITEM_CARD_CATALOG: powerUpのapply()はmaxPowerを1上げる", () => {
  const player = { maxPower: 3 };
  ITEM_CARD_CATALOG.powerUp.apply(player);
  assert.equal(player.maxPower, 4);
});

test("ITEM_CARD_CATALOG: fireEmberのapply()はfireItemAtkBonusを+2する(未設定なら0から、onNewBattleでリセットされない永続枠)", () => {
  const player = {};
  ITEM_CARD_CATALOG.fireEmber.apply(player);
  assert.equal(player.fireItemAtkBonus, 2);
  ITEM_CARD_CATALOG.fireEmber.apply(player);
  assert.equal(player.fireItemAtkBonus, 4);
});

test("ITEM_CARD_CATALOG: thunderCoreのapply()はthunderChargeを+2するが5でクランプする", () => {
  const player = { thunderCharge: 4 };
  ITEM_CARD_CATALOG.thunderCore.apply(player);
  assert.equal(player.thunderCharge, 5); // 4+2=6だが上限5でクランプ
});

test("ITEM_CARD_CATALOG: iceHeartのapply()はfreezeReadyをtrueにする", () => {
  const player = { freezeReady: false };
  ITEM_CARD_CATALOG.iceHeart.apply(player);
  assert.equal(player.freezeReady, true);
});

test("ITEM_CARD_CATALOG: 属性専用カード(fire/thunder/ice)にはattributeフィールドがある", () => {
  assert.equal(ITEM_CARD_CATALOG.fireEmber.attribute, "fire");
  assert.equal(ITEM_CARD_CATALOG.thunderCore.attribute, "thunder");
  assert.equal(ITEM_CARD_CATALOG.iceHeart.attribute, "ice");
  assert.equal(ITEM_CARD_CATALOG.hpUp.attribute, undefined); // 汎用カードには属性指定なし
});

test("ITEM_CARD_CATALOG: 汎用カードは合計25種(既存2種+新設18種+追加5種)ある", () => {
  const genericIds = Object.keys(ITEM_CARD_CATALOG).filter(id => !ITEM_CARD_CATALOG[id].attribute);
  assert.equal(genericIds.length, 25);
});

test("ITEM_CARD_CATALOG: 新設の汎用カードは全てname/desc/apply()を持つ", () => {
  const newGenericIds = [
    "emberEcho", "ironWard", "swiftFeather",
    "doubleEdgedCharm", "allInToken", "desperateVow", "selfSacrificeStrike", "wagerToken",
    "poisonVial", "curseDoll", "freezingBreath", "spiderThread", "shadowWhisper",
    "veteranWisdom", "windSprintBoots", "merchantsEye", "savingsCreed", "pilgrimsStaff",
    "winStreakBadge", "doubleBladeStyle", "indomitableTalisman", "thornArmor", "collectorsMedal"
  ];
  newGenericIds.forEach(id => {
    const card = ITEM_CARD_CATALOG[id];
    assert.ok(card, `${id}が存在しない`);
    assert.equal(typeof card.name, "string", `${id}.nameが文字列でない`);
    assert.equal(typeof card.desc, "string", `${id}.descが文字列でない`);
    assert.equal(typeof card.apply, "function", `${id}.applyが関数でない`);
    assert.equal(card.attribute, undefined, `${id}に属性指定が付いている`);
  });
});

test("ITEM_CARD_CATALOG: emberEcho/ironWard/swiftFeatherは汎用ボーナスを加算式で積み上げる", () => {
  const player = {};
  ITEM_CARD_CATALOG.emberEcho.apply(player);
  ITEM_CARD_CATALOG.emberEcho.apply(player);
  assert.equal(player.genericAtkBonus, 2);

  ITEM_CARD_CATALOG.ironWard.apply(player);
  assert.equal(player.genericDefReduction, 1);

  ITEM_CARD_CATALOG.swiftFeather.apply(player);
  assert.equal(player.itemPaperGainBonus, 1);
});

test("ITEM_CARD_CATALOG: doubleEdgedCharmは最大HPを8下げHPをクランプしつつ攻撃力+3する", () => {
  const player = { hp: 5, maxHp: 10 };
  ITEM_CARD_CATALOG.doubleEdgedCharm.apply(player);
  assert.equal(player.maxHp, 2);
  assert.equal(player.hp, 2); // 5だったHPが新maxHp(2)にクランプされる
  assert.equal(player.genericAtkBonus, 3);
});

test("ITEM_CARD_CATALOG: allInTokenは最大パワーを1下げパワーをクランプしつつパワー消費ダメージ+3する", () => {
  const player = { power: 3, maxPower: 3 };
  ITEM_CARD_CATALOG.allInToken.apply(player);
  assert.equal(player.maxPower, 2);
  assert.equal(player.power, 2);
  assert.equal(player.itemPowerAtkBonus, 3);
});

test("ITEM_CARD_CATALOG: 属性専用カードは合計30種(既存3種+新設27種、15属性×2種)ある", () => {
  const attrCardsByAttribute = {};
  Object.values(ITEM_CARD_CATALOG).forEach(card => {
    if (!card.attribute) return;
    attrCardsByAttribute[card.attribute] = (attrCardsByAttribute[card.attribute] || 0) + 1;
  });
  const attributes = [
    "fire", "thunder", "ice", "stone", "water", "wind", "fighter", "poison",
    "vampire", "doppel", "curse", "cannon", "gambler", "magician", "berserker"
  ];
  assert.equal(Object.keys(attrCardsByAttribute).length, 15, "属性種類数が15でない");
  attributes.forEach(attr => {
    assert.equal(attrCardsByAttribute[attr], 2, `${attr}のカード枚数が2枚でない`);
  });
});

test("ITEM_CARD_CATALOG: 新設の属性専用カードは全てname/desc/apply()/attributeを持つ", () => {
  const newAttrIds = [
    "fireRageUnlock", "thunderSpareCell", "iceEcho",
    "stoneMemory", "stoneBoulder", "waterSpringBlessing", "waterFrostMemory",
    "windTailwind", "windTempestAsh", "fighterSaintFist", "fighterFlurry",
    "poisonElixir", "poisonHerb", "vampireCrimsonThirst", "vampireFangMark",
    "doppelMirrorVow", "doppelPhantomBlade", "curseAmplify", "curseOldTome",
    "cannonArmorUp", "cannonBoreUp", "gamblerCheatCard", "gamblerBigBet",
    "magicianGloves", "magicianLuckyCoin", "berserkerDiscipline", "berserkerRageBlow"
  ];
  assert.equal(newAttrIds.length, 27);
  newAttrIds.forEach(id => {
    const card = ITEM_CARD_CATALOG[id];
    assert.ok(card, `${id}が存在しない`);
    assert.equal(typeof card.name, "string", `${id}.nameが文字列でない`);
    assert.equal(typeof card.desc, "string", `${id}.descが文字列でない`);
    assert.equal(typeof card.apply, "function", `${id}.applyが関数でない`);
    assert.equal(typeof card.attribute, "string", `${id}.attributeが文字列でない`);
  });
});

test("ITEM_CARD_CATALOG: fireRageUnlock/thunderSpareCell/iceEchoのapply()", () => {
  const p1 = { hp: 20 };
  ITEM_CARD_CATALOG.fireRageUnlock.apply(p1);
  assert.equal(p1.fireRage, true);
  assert.equal(p1.fireRagePermanent, true, "onNewBattle()でリセットされない永続フラグも立つはず");

  const p2 = {};
  ITEM_CARD_CATALOG.thunderSpareCell.apply(p2);
  assert.equal(p2.thunderChargeMax, 7);
  ITEM_CARD_CATALOG.thunderSpareCell.apply(p2);
  assert.equal(p2.thunderChargeMax, 9);

  const p3 = {};
  ITEM_CARD_CATALOG.iceEcho.apply(p3);
  assert.equal(p3.iceEchoCharges, 1);
});

test("ITEM_CARD_CATALOG: iceHeartは2枚目以降freezeReadyではなくiceEchoChargesに積み上がる", () => {
  const player = {};
  ITEM_CARD_CATALOG.iceHeart.apply(player);
  assert.equal(player.freezeReady, true);
  assert.equal(player.iceEchoCharges, undefined);

  ITEM_CARD_CATALOG.iceHeart.apply(player);
  assert.equal(player.freezeReady, true, "2枚目でfreezeReadyがfalseに戻ってはいけない");
  assert.equal(player.iceEchoCharges, 1);

  ITEM_CARD_CATALOG.iceHeart.apply(player);
  assert.equal(player.iceEchoCharges, 2);
});

test("ITEM_CARD_CATALOG: wagerToken/poisonVial/curseDoll/spiderThread/veteranWisdom/windSprintBoots/pilgrimsStaffは枚数分カウンタが積み上がる", () => {
  const player = {};
  ITEM_CARD_CATALOG.wagerToken.apply(player);
  ITEM_CARD_CATALOG.wagerToken.apply(player);
  assert.equal(player.itemFreeCostCharges, 2);

  ITEM_CARD_CATALOG.poisonVial.apply(player);
  ITEM_CARD_CATALOG.poisonVial.apply(player);
  assert.equal(player.itemPoisonOnWinStacks, 2);

  ITEM_CARD_CATALOG.curseDoll.apply(player);
  assert.equal(player.itemCurseOnPowerUseStacks, 1);

  ITEM_CARD_CATALOG.spiderThread.apply(player);
  ITEM_CARD_CATALOG.spiderThread.apply(player);
  ITEM_CARD_CATALOG.spiderThread.apply(player);
  assert.equal(player.itemPowerStealOnDrawStacks, 3);

  ITEM_CARD_CATALOG.veteranWisdom.apply(player);
  assert.equal(player.itemPowerOnDrawStacks, 1);

  ITEM_CARD_CATALOG.windSprintBoots.apply(player);
  ITEM_CARD_CATALOG.windSprintBoots.apply(player);
  assert.equal(player.itemPowerOnHandChangeStacks, 2);

  ITEM_CARD_CATALOG.pilgrimsStaff.apply(player);
  ITEM_CARD_CATALOG.pilgrimsStaff.apply(player);
  assert.equal(player.itemPilgrimStaffStacks, 2);
  assert.equal(player.itemPilgrimStaffTurns, 0);
});

test("ITEM_CARD_CATALOG: winStreakBadge/doubleBladeStyle/indomitableTalisman/thornArmorは枚数分積み上がる", () => {
  const player = {};
  ITEM_CARD_CATALOG.winStreakBadge.apply(player);
  ITEM_CARD_CATALOG.winStreakBadge.apply(player);
  assert.equal(player.itemWinStreakBonusPerWin, 2);
  assert.equal(player.itemWinStreakCount, 0);

  ITEM_CARD_CATALOG.doubleBladeStyle.apply(player);
  assert.equal(player.itemScissorsAtkBonus, 1);

  ITEM_CARD_CATALOG.indomitableTalisman.apply(player);
  ITEM_CARD_CATALOG.indomitableTalisman.apply(player);
  ITEM_CARD_CATALOG.indomitableTalisman.apply(player);
  assert.equal(player.itemSurviveCharges, 3);

  ITEM_CARD_CATALOG.thornArmor.apply(player);
  assert.equal(player.itemThornReflectRate, 0.2);
});

test("ITEM_CARD_CATALOG: collectorsMedalはapply()自体は目印を立てるだけ(実際の計算はmain.js側)", () => {
  const player = {};
  ITEM_CARD_CATALOG.collectorsMedal.apply(player);
  assert.equal(player.itemCollectorActive, true);
  assert.equal(player.itemCollectorAtkBonus, undefined, "この時点ではまだ計算されていないはず");
});

test("ITEM_CARD_CATALOG: doppelMirrorVow/curseOldTomeは1枚目の値から2枚目以降さらに-2され下限2でクランプされる", () => {
  const doppel = {};
  ITEM_CARD_CATALOG.doppelMirrorVow.apply(doppel);
  assert.equal(doppel.itemDoppelThreshold, 4);
  ITEM_CARD_CATALOG.doppelMirrorVow.apply(doppel);
  assert.equal(doppel.itemDoppelThreshold, 2);
  ITEM_CARD_CATALOG.doppelMirrorVow.apply(doppel);
  assert.equal(doppel.itemDoppelThreshold, 2, "下限2でクランプされるはず");

  const curse = {};
  ITEM_CARD_CATALOG.curseOldTome.apply(curse);
  assert.equal(curse.itemCurseAnyHandThreshold, 5);
  ITEM_CARD_CATALOG.curseOldTome.apply(curse);
  assert.equal(curse.itemCurseAnyHandThreshold, 3);
  ITEM_CARD_CATALOG.curseOldTome.apply(curse);
  assert.equal(curse.itemCurseAnyHandThreshold, 2, "下限2でクランプされるはず");
});

test("ITEM_CARD_CATALOG: freezingBreath/shadowWhisperは確率ではなく確定発動サイクル制で、重複取得でサイクルが短縮される(下限2)", () => {
  const freeze = {};
  ITEM_CARD_CATALOG.freezingBreath.apply(freeze);
  assert.equal(freeze.itemFreezeCycleLength, 4);
  assert.equal(freeze.itemFreezeWinCounter, 0);
  ITEM_CARD_CATALOG.freezingBreath.apply(freeze);
  assert.equal(freeze.itemFreezeCycleLength, 3);
  ITEM_CARD_CATALOG.freezingBreath.apply(freeze);
  ITEM_CARD_CATALOG.freezingBreath.apply(freeze);
  assert.equal(freeze.itemFreezeCycleLength, 2, "下限2でクランプされるはず");

  const shadow = {};
  ITEM_CARD_CATALOG.shadowWhisper.apply(shadow);
  assert.equal(shadow.itemShadowCycleLength, 4);
  assert.equal(shadow.itemShadowDmgBonus, 2);
  ITEM_CARD_CATALOG.shadowWhisper.apply(shadow);
  assert.equal(shadow.itemShadowCycleLength, 3);
  assert.equal(shadow.itemShadowDmgBonus, 4, "ダメージ量は枚数分加算される");
});

test("ITEM_CARD_CATALOG: stoneMemory/stoneBoulderは既存の蓄積値に加算する", () => {
  const player = { stoneDefenseReduction: 2, stoneAtkBonus: 1 };
  ITEM_CARD_CATALOG.stoneMemory.apply(player);
  ITEM_CARD_CATALOG.stoneBoulder.apply(player);
  assert.equal(player.stoneDefenseReduction, 3);
  assert.equal(player.stoneAtkBonus, 2);
});

test("pickRandomCardIds: 指定した枚数だけ重複なく返す", () => {
  const pool = ["a", "b", "c", "d", "e"];
  const picked = pickRandomCardIds(pool, 3);
  assert.equal(picked.length, 3);
  assert.equal(new Set(picked).size, 3, "重複がある");
  picked.forEach(id => assert.ok(pool.includes(id), `プールに無いid: ${id}`));
});

test("pickRandomCardIds: プールより多い枚数を要求してもプール件数でクランプされる", () => {
  const pool = ["a", "b"];
  const picked = pickRandomCardIds(pool, 5);
  assert.equal(picked.length, 2);
});

test("pickRandomCardIds: 元のプール配列を書き換えない", () => {
  const pool = ["a", "b", "c"];
  const original = [...pool];
  pickRandomCardIds(pool, 2);
  assert.deepEqual(pool, original);
});

summarize("tests/story-catalog.test.js");
