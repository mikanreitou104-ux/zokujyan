// js/shop-catalog.js の回帰テスト。スキン/アイコン/アイコン背景のデータ構造を検証する。
import "./helpers/localstorage-polyfill.js"; // save-data.jsの読み込みより先にlocalStorageを用意する
import { test, assert, summarize } from "./helpers/test-runner.js";
import { SKIN_CATALOG, ICON_BG_CATALOG, ICON_CATALOG } from "../js/shop-catalog.js";
import { STAGE_CATALOG } from "../js/story-catalog.js";
import { markEnemyDefeated, isEnemyDefeated } from "../js/save-data.js";

console.log("shop-catalog.test.js");

test("SKIN_CATALOG: defaultはisDefault:trueかつ価格0", () => {
  assert.equal(SKIN_CATALOG.default.isDefault, true);
  assert.equal(SKIN_CATALOG.default.price, 0);
});

test("SKIN_CATALOG: 購入可能なスキンは全てprice/img/nameを持つ", () => {
  Object.entries(SKIN_CATALOG).forEach(([id, skin]) => {
    assert.equal(typeof skin.name, "string", `${id}.nameが文字列でない`);
    assert.equal(typeof skin.img, "string", `${id}.imgが文字列でない`);
    assert.equal(typeof skin.price, "number", `${id}.priceが数値でない`);
  });
});

test("ICON_BG_CATALOG: 初期所持3色(red/blue/green)はisDefault:trueかつ価格0", () => {
  ["red", "blue", "green"].forEach(id => {
    assert.equal(ICON_BG_CATALOG[id].isDefault, true, `${id}がisDefaultでない`);
    assert.equal(ICON_BG_CATALOG[id].price, 0, `${id}のpriceが0でない`);
  });
});

test("ICON_BG_CATALOG: 購入対象の色はisDefaultを持たず価格が設定されている", () => {
  ["purple", "cyan", "blueCyanGradient", "redOrangeGradient", "greenYellowGradient"].forEach(id => {
    assert.equal(ICON_BG_CATALOG[id].isDefault, undefined, `${id}にisDefaultが付いている`);
    assert.ok(ICON_BG_CATALOG[id].price > 0, `${id}のpriceが0以下`);
  });
});

test("ICON_CATALOG: akasraのみ初期所持(isDefault:true・価格0)", () => {
  assert.equal(ICON_CATALOG.akasra.isDefault, true);
  assert.equal(ICON_CATALOG.akasra.price, 0);
});

test("ICON_CATALOG: akasra以外は全て「対応する敵を倒すまでショップの一覧に出ない」条件付き(unlockEnemyImg)で、価格も設定されている(無料付与ではない)", () => {
  ["mizusra", "kaminarisra", "goblin", "hachi"].forEach(id => {
    const icon = ICON_CATALOG[id];
    assert.ok(icon, `${id}が存在しない`);
    assert.equal(icon.isDefault, undefined, `${id}にisDefaultが付いている`);
    assert.ok(icon.price > 0, `${id}.priceが設定されていない(無料になっている)`);
    assert.equal(typeof icon.unlockEnemyImg, "string", `${id}.unlockEnemyImgが文字列でない`);
    assert.ok(icon.unlockEnemyImg.startsWith("./images/enemy/"), `${id}.unlockEnemyImgがSTAGE_CATALOGのimg形式(./images/enemy/...)と一致しない`);
  });
});

test("ICON_CATALOG: unlockEnemyImgはSTAGE_CATALOG内のどこかの敵imgと実際に一致する(タイポ・パス不一致の検知用)", () => {
  const allEnemyImgs = new Set();
  Object.values(STAGE_CATALOG).forEach(stage => {
    stage.enemies.forEach(enemy => allEnemyImgs.add(enemy.img));
  });

  ["mizusra", "kaminarisra", "goblin", "hachi"].forEach(id => {
    const unlockImg = ICON_CATALOG[id].unlockEnemyImg;
    assert.ok(allEnemyImgs.has(unlockImg), `${id}.unlockEnemyImg(${unlockImg})と一致する敵がSTAGE_CATALOGに存在しない`);
  });
});

test("save-data.js: markEnemyDefeated/isEnemyDefeatedは倒した敵のimgを記録し、購入可否の判定に使える", () => {
  const img = "./images/enemy/kaminarisra.png";
  assert.equal(isEnemyDefeated(img), false, "テスト前提: まだ倒していないはず");
  markEnemyDefeated(img);
  assert.equal(isEnemyDefeated(img), true);
  markEnemyDefeated(img); // 二重に呼んでも重複追加されない
  markEnemyDefeated(img);
  assert.equal(isEnemyDefeated(img), true);
});

summarize("tests/shop-catalog.test.js");
