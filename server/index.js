// じゃんけん×属性バトルゲームのオンライン対戦(友達対戦・ルームコード方式)用サーバー。
//
// 設計方針: このサーバーは「2人のプレイヤーの入力を中継するだけ」の薄い層に徹する。
// ダメージ計算や属性ロジックはクライアント側(main.js)の既存の戦闘エンジンをそのまま両者で
// 同じ入力(お互いの手・属性)を使って実行するので、サーバー側でゲームルールを複製しない。
// 友達同士の対戦を想定した設計であり、対戦相手のクライアント改ざんへの耐性は考慮していない。

const http = require("http");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3000;

const httpServer = http.createServer((req, res) => {
  // Renderのヘルスチェック・動作確認用に簡単な応答を返す
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("zokujan online server is running");
});

const io = new Server(httpServer, {
  cors: {
    origin: "*", // 静的サイト側のオリジンを問わず接続できるようにする(友達対戦用の簡易実装)
    methods: ["GET", "POST"]
  }
});

// ルームコードに使う文字は紛らわしい 0/O, 1/I を除外
const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 5;

// code -> { players: [socketId, socketId], attributes: {socketId: attr}, hands: {socketId: hand} }
const rooms = {};

function generateRoomCode() {
  let code;
  do {
    code = Array.from(
      { length: ROOM_CODE_LENGTH },
      () => ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
    ).join("");
  } while (rooms[code]);
  return code;
}

function getOpponentSocketId(room, socketId) {
  return room.players.find((id) => id !== socketId);
}

function cleanupRoom(code) {
  delete rooms[code];
}

io.on("connection", (socket) => {
  socket.on("createRoom", () => {
    const code = generateRoomCode();
    rooms[code] = { players: [socket.id], attributes: {}, hands: {}, rematchRequests: new Set() };
    socket.join(code);
    socket.data.roomCode = code;
    socket.emit("roomCreated", { code });
  });

  socket.on("joinRoom", (code) => {
    const normalized = String(code || "").trim().toUpperCase();
    const room = rooms[normalized];

    if (!room) {
      socket.emit("joinError", "ルームが見つかりません。コードを確認してください。");
      return;
    }
    if (room.players.length >= 2) {
      socket.emit("joinError", "そのルームはすでに満員です。");
      return;
    }

    room.players.push(socket.id);
    socket.join(normalized);
    socket.data.roomCode = normalized;

    io.to(normalized).emit("roomReady");
  });

  socket.on("chooseAttribute", ({ attribute }) => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room) return;

    room.attributes[socket.id] = attribute;
    if (Object.keys(room.attributes).length < 2) return;

    room.players.forEach((playerId) => {
      const opponentId = getOpponentSocketId(room, playerId);
      io.to(playerId).emit("battleStart", {
        yourAttribute: room.attributes[playerId],
        opponentAttribute: room.attributes[opponentId]
      });
    });
  });

  socket.on("playHand", ({ hand }) => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room) return;

    room.hands[socket.id] = hand;
    if (Object.keys(room.hands).length < 2) return;

    room.players.forEach((playerId) => {
      const opponentId = getOpponentSocketId(room, playerId);
      io.to(playerId).emit("roundResult", {
        yourHand: room.hands[playerId],
        opponentHand: room.hands[opponentId]
      });
    });
    room.hands = {};
  });

  // 降参：自分側はローカルで処理済みなので、相手にだけ知らせる(相手はこれを勝利として扱う)
  socket.on("surrender", () => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room) return;
    const opponentId = getOpponentSocketId(room, socket.id);
    if (opponentId) io.to(opponentId).emit("opponentSurrendered");
  });

  // 決着後、同じルームでもう一度戦うためのリセット(コードを新しく発行し直さなくてよいようにする)。
  // chooseAttribute/playHandと同様、両者が要求してから初めてリセットする
  socket.on("playAgain", () => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room) return;

    room.rematchRequests.add(socket.id);
    if (room.rematchRequests.size < 2) return;

    room.hands = {};
    room.attributes = {};
    room.rematchRequests.clear();
    io.to(code).emit("rematchReady");
  });

  socket.on("leaveRoom", () => {
    const code = socket.data.roomCode;
    if (!code) return;
    const room = rooms[code];
    if (room) {
      const opponentId = getOpponentSocketId(room, socket.id);
      if (opponentId) io.to(opponentId).emit("opponentLeft");
      cleanupRoom(code);
    }
    socket.leave(code);
    socket.data.roomCode = null;
  });

  socket.on("disconnect", () => {
    const code = socket.data.roomCode;
    if (!code) return;
    const room = rooms[code];
    if (room) {
      const opponentId = getOpponentSocketId(room, socket.id);
      if (opponentId) io.to(opponentId).emit("opponentLeft");
      cleanupRoom(code);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`zokujan online server listening on port ${PORT}`);
});
