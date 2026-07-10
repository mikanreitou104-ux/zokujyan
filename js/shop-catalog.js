// ===== ショップ / MYメニュー：カード裏スキン・アイコン・アイコン背景のデータ定義 =====
// main.jsから切り出したモジュール。DOM描画(renderShopSkinList等)・購入/装備ロジックはmain.js側の責務。
// 新しいスキン/アイコン/背景を追加する際は、このファイルにエントリを足すだけでよい設計になっている。

export const SKIN_CATALOG = {
  default: { name: "デフォルト", img: "./images/card-bg/defo.png", price: 0, isDefault: true },
  skin1:   { name: "スキンA",   img: "./images/card-bg/1.png",   price: 30 },
  skin2:   { name: "スキンB",   img: "./images/card-bg/2.png",   price: 50 },
  skin3:   { name: "スキンC",   img: "./images/card-bg/3.png",   price: 80 },
};

// cssプロパティにはCSSのbackground値をそのまま入れる（単色でもグラデーションでも可）
export const ICON_BG_CATALOG = {
  red:               { name: "赤",                     css: "#ff2d00", price: 0, isDefault: true },
  blue:              { name: "青",                     css: "#2d6bff", price: 0, isDefault: true },
  green:             { name: "緑",                     css: "#33cc55", price: 0, isDefault: true },
  purple:            { name: "紫",                     css: "#a344ff", price: 40 },
  cyan:              { name: "水色",                   css: "#33ccff", price: 40 },
  blueCyanGradient:  { name: "青→水色グラデーション",   css: "linear-gradient(135deg, #2d6bff, #33ccff)", price: 70 },
  redOrangeGradient: { name: "赤→オレンジグラデーション", css: "linear-gradient(135deg, #ff2d00, #ff9900)", price: 70 },
  greenYellowGradient: { name: "緑→黄色グラデーション", css: "linear-gradient(135deg, #33cc55, #ffee33)", price: 70 },
};

// akasra(赤スライム)だけ初期所持。それ以外はunlockEnemyImgと同じimgの敵をストーリーモードで
// 一度倒すまでショップの一覧自体に出てこない(倒せば通常のコイン購入として表示される、無料付与ではない)。
export const ICON_CATALOG = {
  akasra:      { name: "赤スライム", img: "images/enemy/akasra.png",      price: 0,  isDefault: true },
  mizusra:     { name: "青スライム", img: "images/enemy/mizusra.png",     price: 30, unlockEnemyImg: "./images/enemy/mizusra.png" },
  kaminarisra: { name: "雷スライム", img: "images/enemy/kaminarisra.png", price: 30, unlockEnemyImg: "./images/enemy/kaminarisra.png" },
  goblin:      { name: "ゴブリン",   img: "images/enemy/goblin.png",      price: 40, unlockEnemyImg: "./images/enemy/goblin.png" },
  hachi:       { name: "蜂",        img: "images/enemy/hachi.png",       price: 40, unlockEnemyImg: "./images/enemy/hachi.png" },
};
