// js/story-catalog.js の回帰テスト。ステージ/アイテムカードのデータ構造とapply()の挙動を検証する。
import { test, assert, summarize } from "./helpers/test-runner.js";
import { STAGE_CATALOG, ITEM_CARD_CATALOG } from "../js/story-catalog.js";

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

test("ITEM_CARD_CATALOG: fireEmberのapply()はfireAtkBonusを+2する(未設定なら0から)", () => {
  const player = {};
  ITEM_CARD_CATALOG.fireEmber.apply(player);
  assert.equal(player.fireAtkBonus, 2);
  ITEM_CARD_CATALOG.fireEmber.apply(player);
  assert.equal(player.fireAtkBonus, 4);
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

summarize("tests/story-catalog.test.js");
