// js/shop-catalog.js の回帰テスト。スキン/アイコン/アイコン背景のデータ構造を検証する。
import { test, assert, summarize } from "./helpers/test-runner.js";
import { SKIN_CATALOG, ICON_BG_CATALOG, ICON_CATALOG } from "../js/shop-catalog.js";

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
  ["purple", "cyan", "blueCyanGradient", "redOrangeGradient"].forEach(id => {
    assert.equal(ICON_BG_CATALOG[id].isDefault, undefined, `${id}にisDefaultが付いている`);
    assert.ok(ICON_BG_CATALOG[id].price > 0, `${id}のpriceが0以下`);
  });
});

test("ICON_CATALOG: akasraは初期所持(isDefault:true・価格0)、mizusraは購入対象", () => {
  assert.equal(ICON_CATALOG.akasra.isDefault, true);
  assert.equal(ICON_CATALOG.akasra.price, 0);
  assert.equal(ICON_CATALOG.mizusra.isDefault, undefined);
  assert.ok(ICON_CATALOG.mizusra.price > 0);
});

summarize("tests/shop-catalog.test.js");
