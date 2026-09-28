import { SYNC_SERVER_URL } from '../env.generated';
import options from '../options';
import type { Roulette } from '../roulette';
import type { MapEntityState } from '../types/MapEntity.type';

type MarbleSnapshot = { id: number; x: number; y: number; angle: number };
type MarbleRosterEntry = { id: number; name: string; weight: number };

type StartMessage = {
  type: 'start';
  mapIndex: number;
  roster: MarbleRosterEntry[];
  winnerRange: { start: number; end: number };
};

type SnapshotMessage = {
  type: 'snapshot';
  marbles: MarbleSnapshot[];
  entities: MapEntityState[];
};

type NetworkMessage = StartMessage | SnapshotMessage;

const SNAPSHOT_INTERVAL_MS = 50; // 초당 20회

/**
 * 같은 Discord Activity 방(instanceId)에 있는 사람들끼리 라운드를 실시간으로
 * 공유해서 본다. 규칙은 딱 하나: 그 방에서 맨 먼저 Start를 누른 사람이 그 라운드의
 * 호스트가 된다. 호스트는 실제로 물리를 계산하며 좌표를 방송하고, 나머지는 그걸
 * 받아서 그대로 그리기만 한다 (roulette.ts의 NetworkPhysics 경로).
 *
 * 서버는 순전히 방 단위 중계기라 게임 로직을 전혀 모른다 (server/index.js 참고).
 */
export function setupDiscordMultiplayer(roulette: Roulette, room: string): void {
  const serverUrl = SYNC_SERVER_URL;
  if (!serverUrl) {
    console.warn('[multiplayer] SYNC_SERVER_URL이 없어 동기화 없이 단독 실행합니다.');
    return;
  }

  const ws = new WebSocket(`${serverUrl}?room=${encodeURIComponent(room)}`);
  let isViewingRemoteRound = false;
  let stopBroadcast: (() => void) | null = null;

  ws.addEventListener('error', (e) => {
    console.error('[multiplayer] 연결 오류', e);
  });

  ws.addEventListener('message', (event) => {
    let msg: NetworkMessage;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }

    if (msg.type === 'start') {
      // 남이 이미 시작한 라운드가 있다는 뜻이다. 내가 마침 호스트로 방송 중이었다면
      // (동시에 눌렀거나) 내 방송을 접고 상대방 라운드를 보는 쪽으로 양보한다 —
      // 한 방에 호스트가 둘이면 다들 뒤섞인 화면을 보게 된다.
      stopBroadcast?.();
      stopBroadcast = null;
      isViewingRemoteRound = true;

      options.useSkills = false; // 스킬 연출은 무작위라 호스트 쪽과 안 맞을 수 있어 끈다
      roulette.startFromNetwork(msg.mapIndex, msg.roster, msg.winnerRange);
      document.querySelector('#settings')?.classList.add('hide');
    } else if (msg.type === 'snapshot' && isViewingRemoteRound) {
      roulette.applyNetworkSnapshot({ marbles: msg.marbles, entities: msg.entities });
    }
  });

  document.querySelector('#btnStart')?.addEventListener('click', () => {
    if (isViewingRemoteRound) return; // 이미 남의 라운드를 보는 중이면 내가 새로 시작하지 않는다
    if (ws.readyState !== WebSocket.OPEN) return;

    const currentMap = roulette.getCurrentMap();
    const roster = roulette.getMarbleRoster();
    if (!currentMap || roster.length === 0) return;

    const startMsg: StartMessage = {
      type: 'start',
      mapIndex: currentMap.index,
      roster,
      winnerRange: roulette.getWinnerRange(),
    };
    ws.send(JSON.stringify(startMsg));

    const broadcast = () => {
      const snapshotMsg: SnapshotMessage = { type: 'snapshot', ...roulette.getSnapshot() };
      ws.send(JSON.stringify(snapshotMsg));
    };
    const intervalId = window.setInterval(broadcast, SNAPSHOT_INTERVAL_MS);

    const onGoal = () => {
      window.clearInterval(intervalId);
      stopBroadcast = null;
    };
    roulette.addEventListener('goal', onGoal, { once: true });

    stopBroadcast = () => {
      window.clearInterval(intervalId);
      roulette.removeEventListener('goal', onGoal);
    };
  });
}
