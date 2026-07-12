// ===== オンライン対戦(友達対戦・ルームコード方式) =====
// main.jsから切り出したモジュール。サーバーは「2人の入力を中継するだけ」の薄い層(server/index.js)。
// ダメージ計算・属性ロジックは一切サーバーに複製せず、両クライアントが同じ入力(お互いの属性・手)を
// 使って既存の戦闘エンジン(battleTurn等)をそのまま実行する。battleContext.mode="online"に統一し、
// CPU戦の内部処理をそのまま流用する。
//
// main.js⇔online.jsの循環importを避けるため、main.js側の関数(showScreen/beginVersusBattle等)や
// 可変状態(battleContext/playerState/cpuState)は一切importせず、setOnlineCallbacks()で注入してもらう
// (battle.js/quests.js/profile.jsと同じDIパターン)。battleContextはmain.js側でlet宣言されており
// このファイルのimport時点ではまだ未初期化(TDZ)なので、値ではなくgetBattleContext()を毎回呼ぶ。
//
// デプロイ後、Renderで発行される実際のURLに書き換えること(例: "https://zokujan-online-server.onrender.com")。

import { setBattleRandom } from "./attributes.js";

let callbacks = {};

// battleContextはmain.js側でlet宣言されており、main.jsの他コードよりも先に走る
// このモジュールのimport時点ではまだ初期化されていない(TDZ)ため、値そのものではなく
// callbacks.getBattleContext()で毎回取得する(playerState/cpuStateと同じ理由)
export function setOnlineCallbacks(cb) {
  callbacks = cb;
}

function getOnlineServerUrl() {
  return "https://zokujan-online-server.onrender.com";
}

let onlineSocket = null;
let onlineOpponentHandBuffer = null;   // roundResultが先に届いた場合に一時保持する
let onlineOpponentHandCallback = null; // startJankenScene側が先に待ち構えている場合のコールバック

// サーバー側にルームが存在する状態(作成/参加成功後〜退出前)かどうか。
// disconnectイベントは接続前や退出後にも発火しうるため、「ルームにいた最中の予期しない切断」だけを
// 拾って通知するためのフラグ(意図的なleaveOnlineRoom()や、まだルームに入っていない接続エラーとは区別する)。
let socketWasInRoom = false;

// シード付き疑似乱数生成器(mulberry32)。同じseedを与えれば両クライアントで同一の乱数列を再現できる
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// オンライン対戦中、そのラウンドだけ有効な「自分側」「相手側」の乱数生成器。
// ギャンブラーのダイス目・確変抽選、マジシャンの効果抽選などは通常Math.random()を使うが、
// オンライン対戦では両クライアントが同じ入力を独立に計算するため、素のMath.random()だと
// 双方で異なる結果になってしまう(実際に「ダメージが食い違う」バグとして発生した)。
// サーバーがラウンドごとに配布するシードを使い、battleRandom()経由で決定論的な値に差し替える。
let onlineMyRoundRng = null;
let onlineOpponentRoundRng = null;

// 属性ロジック内でMath.random()の代わりに呼ぶ。actingStateは実際に行動している側のstate
// (playerState/cpuStateのどちらか)。オンライン対戦中でなければ通常のMath.random()にフォールバックする。
// actingState===playerStateかどうかで判定するのは、オンライン対戦ではplayer/cpuの役割が
// クライアントごとに入れ替わる(自分が必ずplayerState)ため、実行順に関係なく
// 「同じ人の行動」には常に同じシード由来の乱数を割り当てられるようにするため。
// playerStateはバトルのたびに丸ごと再生成されるため、参照を保持せず毎回callbacks.getPlayerState()で取得する
function battleRandom(actingState) {
  if (!onlineMyRoundRng) return Math.random();
  return actingState === callbacks.getPlayerState() ? onlineMyRoundRng() : onlineOpponentRoundRng();
}
setBattleRandom(battleRandom);

// CPU戦・ストーリーモード開始時など、オンライン対戦以外に切り替わるタイミングで呼ぶ。
// 前回オンライン対戦のシード付き乱数が残っていると、battleRandom()がそれを誤って使ってしまうため。
export function resetOnlineRng() {
  onlineMyRoundRng = null;
  onlineOpponentRoundRng = null;
}

// 「ぽん！」の瞬間、サーバーから届いた両者のシードで乱数を確定させる(battleTurn()の直前に呼ぶ)
export function seedOnlineRng(yourSeed, opponentSeed) {
  onlineMyRoundRng = mulberry32(yourSeed);
  onlineOpponentRoundRng = mulberry32(opponentSeed);
}

export function showOnlineWaiting(message, roomCode) {
  document.getElementById("onlineWaitingMessage").textContent = message;
  const codeBlock = document.getElementById("onlineWaitingCodeBlock");
  if (roomCode) {
    document.getElementById("onlineWaitingCode").textContent = roomCode;
    codeBlock.style.display = "block";
  } else {
    codeBlock.style.display = "none";
  }
  callbacks.showScreen("screen-online-waiting");
}

// ルーム参加(roomReady)が成立した瞬間に呼ぶ。既存のCPU戦用の属性選択UIをそのまま流用する
function enterOnlineAttributeSelect() {
  callbacks.getBattleContext().mode = "online";
  document.getElementById("cpu-attr-select-title").textContent = "オンライン対戦の属性を選択";
  callbacks.renderAttrCards("cpu-attr-select-list");
  callbacks.showScreen("screen-cpu-attr-select");
  // CPU戦の属性選択画面と共用しているため、CPU戦の入口と同じ背景クラスをここでも付ける
  // (btn-mode-cpuのクリックハンドラでのみ付与していたため、オンライン経由だと真っ白になっていた)
  document.getElementById("screen-cpu-attr-select").classList.add("bg-cpu-attr");
}

// サーバーへの接続は初回のみ行い、以降は使い回す
export function connectOnlineSocket() {
  if (onlineSocket) return onlineSocket;

  onlineSocket = io(getOnlineServerUrl());

  onlineSocket.on("connect_error", () => {
    setOnlineLobbyButtonsConnecting(false);
    document.getElementById("online-join-error").textContent =
      "サーバーに接続できませんでした。時間をおいて再度お試しください。";
  });

  onlineSocket.on("roomCreated", ({ code }) => {
    socketWasInRoom = true;
    setOnlineLobbyButtonsConnecting(false);
    showOnlineWaiting("この5桁のコードを友達に伝えて、参加してもらいましょう。", code);
  });

  onlineSocket.on("joinError", (message) => {
    setOnlineLobbyButtonsConnecting(false);
    document.getElementById("online-join-error").textContent = message;
  });

  onlineSocket.on("roomReady", () => {
    socketWasInRoom = true;
    setOnlineLobbyButtonsConnecting(false);
    enterOnlineAttributeSelect();
  });

  onlineSocket.on("battleStart", ({ opponentAttribute, opponentEquipmentPlacements, opponentProfile }) => {
    callbacks.beginVersusBattle("online", opponentAttribute, "./images/enemy/mizusra.png", opponentEquipmentPlacements, opponentProfile);
  });

  onlineSocket.on("roundResult", ({ opponentHand, yourSeed, opponentSeed }) => {
    const payload = { opponentHand, yourSeed, opponentSeed };
    if (onlineOpponentHandCallback) {
      const cb = onlineOpponentHandCallback;
      onlineOpponentHandCallback = null;
      cb(payload);
    } else {
      onlineOpponentHandBuffer = payload;
    }
  });

  onlineSocket.on("rematchReady", () => {
    enterOnlineAttributeSelect();
  });

  onlineSocket.on("opponentLeft", () => {
    socketWasInRoom = false;
    // 「いいえ」を選べても何も解決しない一方的な通知なので、okOnly(OKのみ)モーダルにする
    // (通常のはい/いいえモーダルのままだと「いいえ」でソフトロックしていた)
    callbacks.showConfirmModal("相手が退出しました。モード選択へ戻ります。", () => {
      // showScreen()だけだとBGMの切り替えや結果画面・演出のリセットが行われず、
      // 戦闘BGMが鳴りっぱなしになるバグがあったため、通常の離脱処理と同じexitBattleToScreen()に統一する
      callbacks.exitBattleToScreen("screen-mode");
    }, { okOnly: true });
  });

  // 自分側の回線切断(Wi-Fi切断・サーバー再起動等)を検知する。
  // 意図的なleaveOnlineRoom()はsocket.disconnect()を呼ばないため、このイベントは
  // 常に「予期しない切断」を意味する。再接続後もサーバー側のルーム状態は失われている
  // (サーバーのdisconnectハンドラが相手に通知した上でルームを破棄する)ため、
  // 復帰を試みず素直にモード選択へ戻す。
  onlineSocket.on("disconnect", () => {
    if (!socketWasInRoom) return;
    socketWasInRoom = false;
    callbacks.showConfirmModal("サーバーとの接続が切れました。モード選択へ戻ります。", () => {
      callbacks.exitBattleToScreen("screen-mode");
    }, { okOnly: true });
  });

  // 相手が降参した場合、こちらは勝利扱いにする(BGM切り替え・状態リセットは
  // 通常の決着時と同じhandleCpuDefeated()→endBattle()の流れにそのまま乗せる)
  onlineSocket.on("opponentSurrendered", () => {
    callbacks.getCpuState().hp = 0;
    callbacks.handleCpuDefeated();
  });

  return onlineSocket;
}

// battleTurn()に渡す相手の手を取得する。すでにroundResultが届いていれば即座に、
// まだなら届いた瞬間にcallbackを呼ぶ(ネットワーク遅延を吸収するため)
export function resolveOnlineOpponentHand(callback) {
  if (onlineOpponentHandBuffer !== null) {
    const payload = onlineOpponentHandBuffer;
    onlineOpponentHandBuffer = null;
    callback(payload);
  } else {
    onlineOpponentHandCallback = callback;
  }
}

// ルームを離れる際の後片付け(モード選択に戻る/相手の退出を検知した際などに呼ぶ)
export function leaveOnlineRoom() {
  if (onlineSocket) onlineSocket.emit("leaveRoom");
  socketWasInRoom = false;
  onlineOpponentHandBuffer = null;
  onlineOpponentHandCallback = null;
}

// 降参・手の送信は、main.js側の他ハンドラから直接onlineSocketに触らせず、ここ経由にする
export function sendSurrender() {
  if (onlineSocket) onlineSocket.emit("surrender");
}

export function sendPlayHand(hand) {
  if (onlineSocket) onlineSocket.emit("playHand", { hand });
}

const onlineCreateRoomBtn = document.getElementById("btn-online-create-room");
const onlineJoinRoomBtn = document.getElementById("btn-online-join-room");
const onlineCreateRoomLabel = onlineCreateRoomBtn.textContent;
const onlineJoinRoomLabel = onlineJoinRoomBtn.textContent;

// ルーム作成/参加への応答は(サーバーがRenderの無料枠でスリープから復帰する場合など)
// 数十秒かかることがある。連打で複数ルームが作られてしまうのを防ぎつつ、ボタン自体に
// 「反応している」ことを示すため、応答が来るまで両方無効化してラベルを差し替える。
function setOnlineLobbyButtonsConnecting(connecting) {
  onlineCreateRoomBtn.disabled = connecting;
  onlineJoinRoomBtn.disabled = connecting;
  onlineCreateRoomBtn.textContent = connecting ? "接続中…" : onlineCreateRoomLabel;
  onlineJoinRoomBtn.textContent = connecting ? "接続中…" : onlineJoinRoomLabel;
}

function submitJoinRoom() {
  const code = document.getElementById("online-join-code-input").value.trim().toUpperCase();
  document.getElementById("online-join-error").textContent = "";
  if (!code) return;
  setOnlineLobbyButtonsConnecting(true);
  connectOnlineSocket().emit("joinRoom", code);
}

document.getElementById("btn-mode-online").addEventListener("click", () => {
  document.getElementById("online-join-error").textContent = "";
  setOnlineLobbyButtonsConnecting(false);
  callbacks.showScreen("screen-online-lobby");
});

document.getElementById("btn-online-lobby-back").addEventListener("click", () => {
  callbacks.showScreen("screen-mode");
});

document.getElementById("btn-online-create-room").addEventListener("click", () => {
  setOnlineLobbyButtonsConnecting(true);
  connectOnlineSocket().emit("createRoom");
});

document.getElementById("btn-online-join-room").addEventListener("click", submitJoinRoom);

document.getElementById("online-join-code-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") submitJoinRoom();
});

document.getElementById("btn-online-waiting-cancel").addEventListener("click", () => {
  leaveOnlineRoom();
  callbacks.showScreen("screen-mode");
});
// ===== オンライン対戦ここまで =====
