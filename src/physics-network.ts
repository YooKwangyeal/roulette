import type { StageDef } from './data/maps';
import type { IPhysics } from './IPhysics';
import type { MapEntityState } from './types/MapEntity.type';

/**
 * 실시간 동기화(뷰어)용 가짜 물리 엔진.
 *
 * 실제 시뮬레이션은 호스트 쪽 Box2dPhysics가 계산하고, 여기서는 네트워크로 받은
 * 스냅샷을 그대로 저장했다가 돌려줄 뿐이다. step()도 아무 일을 하지 않는다 —
 * 위치는 오직 applySnapshot()으로만 갱신된다. Box2D wasm 자체를 로드하지 않으므로
 * 뷰어 쪽은 초기 로딩 비용도 없다.
 */
export class NetworkPhysics implements IPhysics {
  private positions = new Map<number, { x: number; y: number; angle: number }>();
  private entities: MapEntityState[] = [];

  async init(): Promise<void> {}

  clear(): void {
    this.positions.clear();
    this.entities = [];
  }

  clearMarbles(): void {
    this.positions.clear();
  }

  createStage(_stage: StageDef): void {
    // 맵 지오메트리는 정적이지 않은(kinematic) 요소가 있을 수 있어 매 스냅샷마다
    // entities를 함께 받는다. 여기서 미리 만들어둘 필요가 없다.
  }

  createMarble(id: number, x: number, y: number): void {
    // 첫 스냅샷이 도착하기 전까지 잠깐 보일 초기 위치. 대부분 한두 프레임 안에 덮어써진다.
    this.positions.set(id, { x, y, angle: 0 });
  }

  shakeMarble(_id: number): void {}

  removeMarble(id: number): void {
    this.positions.delete(id);
  }

  getMarblePosition(id: number): { x: number; y: number; angle: number } {
    return this.positions.get(id) || { x: 0, y: 0, angle: 0 };
  }

  getEntities(): MapEntityState[] {
    return this.entities;
  }

  impact(_id: number): void {}

  start(): void {}

  step(_deltaSeconds: number): void {}

  applySnapshot(marbles: { id: number; x: number; y: number; angle: number }[], entities: MapEntityState[]): void {
    for (const m of marbles) {
      this.positions.set(m.id, { x: m.x, y: m.y, angle: m.angle });
    }
    this.entities = entities;
  }
}
