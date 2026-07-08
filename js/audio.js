// ===== BGM/SE再生・音量管理 =====
// main.jsから切り出したモジュール。音声要素の参照・再生・音量調整(MYメニュー設定タブ/
// 戦闘画面メニューの両方のスライダー)をここに集約する。
// DOM要素はモジュール読み込み時(main.jsの他コードより先にimportされるタイミング)に取得する。

export let currentBgmVolume = 0.6;  // 初期値は好きに設定

export const seClick = document.getElementById("se-click");
export const seStart = document.getElementById("se-cancel");
export const seCardFly = document.getElementById("se-card-fly");
export const seDamage = document.getElementById("se-damage");
export const winSE = document.getElementById("se-gekiha");
export const seBigImpact = document.getElementById("se-big-impact");
export const seCoin = document.getElementById("se-coin");
export const sePurchase = document.getElementById("se-purchase");
export const seHover = document.getElementById("se-hover");
export const seHoverCard = document.getElementById("se-HoverCard");

// ▼ 音源の取得
export const bgmMode = document.getElementById("bgm-mode");
export const bgmcpuBattle = document.getElementById("bgm-cpu-battle");
export const bgmStory = document.getElementById("bgm-story"); // ストーリーの読み物シーン(screen-story-read)専用BGM

// ▼ 音量スライダー取得(MYメニュー設定タブ + 戦闘画面メニューの2箇所ぶん)
export const bgmSlider = document.getElementById("bgm-volume");
export const seSlider = document.getElementById("se-volume");
export const battleBgmSlider = document.getElementById("battle-bgm-volume");
export const battleSeSlider = document.getElementById("battle-se-volume");

// ▼ 起動時に保存された音量を読み込む
const savedBgm = localStorage.getItem("bgmVolume");
const savedSe  = localStorage.getItem("seVolume");

// BGM
if (savedBgm !== null) {
  const vol = Number(savedBgm);
  bgmSlider.value = vol;
  currentBgmVolume = vol;   // ← これが最重要
  bgmMode.volume = vol;
  bgmcpuBattle.volume = vol;
  bgmStory.volume = vol;
}

// SE
if (savedSe !== null) {
  const vol = Number(savedSe);
  seSlider.value = vol;
  seStart.volume = vol;
  seClick.volume = vol;
  seHover.volume = vol;
  seHoverCard.volume = vol;
  seCardFly.volume = vol;
  seDamage.volume = vol;
  winSE.volume = vol;
  seCoin.volume = vol;
  sePurchase.volume = vol;
}

// クエスト報酬受け取り時のSE(連打・まとめて受け取り時も鳴らせるよう毎回currentTimeを巻き戻す)
export function playCoinSE() {
  seCoin.currentTime = 0;
  seCoin.play();
}

// ショップで購入が成立した時のSE
export function playPurchaseSE() {
  sePurchase.currentTime = 0;
  sePurchase.play();
}

export function playClick() {
  seClick.currentTime = 0; // 連打でも鳴るように
  seClick.play();
}

document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", playClick);
});
document.querySelectorAll(".primary-btn").forEach(btn => {
  btn.addEventListener("click", playClick);
});
document.querySelectorAll(".secondary-btn").forEach(btn => {
  btn.addEventListener("click", playClick);
});

document.querySelectorAll("#btn-attr-back").forEach(btn => {
  btn.addEventListener("click", playClick);
});

export function playHover() {
  seHover.currentTime = 0;
  seHover.play();
}
document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("mouseenter", playHover);
});

document.querySelectorAll(".primary-btn").forEach(btn => {
  btn.addEventListener("mouseenter", playHover);
});

document.querySelectorAll(".secondary-btn").forEach(btn => {
  btn.addEventListener("mouseenter", playHover);
});

export function playCardHoverSE() {
  seHoverCard.currentTime = 0;
  seHoverCard.play();
}

// ▼ モード画面BGMを流す
export function playModeBGM() {
  bgmMode.volume = 0.6;
  bgmMode.play();
}

// ▼ BGMを止める（フェードアウト付き）
export function stopBGM(bgm) {
  let vol = bgm.volume;
  const fade = setInterval(() => {
    vol -= 0.05;
    if (vol <= 0) {
      bgm.pause();
      bgm.currentTime = 0;
      clearInterval(fade);
    } else {
      bgm.volume = vol;
    }
  }, 50);
}

// 音量調整はMYメニュー設定タブ・戦闘画面メニューの両方から呼べるよう、変更処理を共通化する
// （両方のスライダーの見た目もここで一緒に同期する）
export function setBgmVolume(vol) {
  currentBgmVolume = vol;
  localStorage.setItem("bgmVolume", vol);
  bgmMode.volume = vol;
  bgmcpuBattle.volume = vol;
  bgmStory.volume = vol;
  bgmSlider.value = vol;
  if (battleBgmSlider) battleBgmSlider.value = vol;
}

export function setSeVolume(vol) {
  localStorage.setItem("seVolume", vol);
  seStart.volume = vol;
  seClick.volume = vol;
  seHover.volume = vol;
  seHoverCard.volume = vol;
  seCardFly.volume = vol;
  seDamage.volume = vol;
  winSE.volume = vol;
  seCoin.volume = vol;
  sePurchase.volume = vol;
  seSlider.value = vol;
  if (battleSeSlider) battleSeSlider.value = vol;
}

// ▼ BGM音量変更
bgmSlider.addEventListener("input", () => {
  setBgmVolume(Number(bgmSlider.value));
});

// ▼ SE音量変更
seSlider.addEventListener("input", () => {
  setSeVolume(Number(seSlider.value));
});

if (battleBgmSlider) {
  battleBgmSlider.addEventListener("input", () => {
    setBgmVolume(Number(battleBgmSlider.value));
  });
}

if (battleSeSlider) {
  battleSeSlider.addEventListener("input", () => {
    setSeVolume(Number(battleSeSlider.value));
  });
}
