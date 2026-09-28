// 구슬 룰렛 디스코드 Activity용 실시간 좌표 중계 서버.
//
// 게임 로직은 전혀 모른다. room(=디스코드 Activity instanceId)별로 클라이언트를
// 묶어두고, 한 명이 보낸 메시지를 같은 room의 나머지 전원에게 그대로 전달할 뿐이다.
// (보낸 사람 본인에게는 되돌려보내지 않는다 — 호스트 자신은 이미 로컬에서
// 실시간으로 보고 있으므로 자기 메시지를 또 받을 필요가 없다.)
//
// 신뢰 모델: room id는 디스코드가 발급하는 instanceId라 추측하기 어렵고, 여기엔
// 구슬 좌표 외의 민감한 데이터가 오가지 않는다. 그래서 별도 인증 없이 room 기준
// 격리만으로 충분하다고 본다.
const http = require('node:http');
const { WebSocketServer } = require('ws');

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('marble-roulette sync relay: ok\n');
});

const wss = new WebSocketServer({ server });

/** @type {Map<string, Set<import('ws').WebSocket>>} */
const rooms = new Map();

wss.on('connection', (ws, req) => {
  const url = new URL(req.url ?? '', 'http://placeholder');
  const room = url.searchParams.get('room');

  if (!room) {
    ws.close(1008, 'room query parameter is required');
    return;
  }

  let peers = rooms.get(room);
  if (!peers) {
    peers = new Set();
    rooms.set(room, peers);
  }
  peers.add(ws);

  ws.on('message', (data, isBinary) => {
    for (const peer of peers) {
      if (peer !== ws && peer.readyState === peer.OPEN) {
        peer.send(data, { binary: isBinary });
      }
    }
  });

  ws.on('close', () => {
    peers.delete(ws);
    if (peers.size === 0) rooms.delete(room);
  });

  ws.on('error', () => {
    peers.delete(ws);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`sync relay listening on :${PORT}`);
});
