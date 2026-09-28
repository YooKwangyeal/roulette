import { DiscordSDK } from '@discord/embedded-app-sdk';
import { DISCORD_CLIENT_ID } from './env.generated';

// Discord가 Activity를 iframe으로 띄울 때 URL에 frame_id 등의 쿼리스트링을 붙여준다.
// 이게 없으면 일반 브라우저(원본 사이트, 개발 서버)에서 열린 것이므로 SDK를 건드리지 않는다.
// SDK.ready()는 Discord와의 핸드셰이크라 Discord 프레임 밖에서 부르면 영원히 대기 상태로 멈춘다.
export function isInsideDiscord(): boolean {
  return new URLSearchParams(window.location.search).has('frame_id');
}

let readySdk: DiscordSDK | null = null;

/**
 * Discord Activity 프레임 안에서 실행 중이면 SDK를 초기화하고 준비 완료를 알린다.
 * 그 외의 경우(원본 웹사이트, 로컬 개발) 아무것도 하지 않는다.
 *
 * 준비가 끝난 SDK 인스턴스를 반환한다 (실패했거나 Discord 밖이면 null).
 * instanceId 등 이후 멀티플레이 방 구분에 필요한 값을 여기서 얻는다.
 */
export async function initDiscordSdkIfEmbedded(): Promise<DiscordSDK | null> {
  if (!isInsideDiscord()) return null;

  const clientId = DISCORD_CLIENT_ID;
  if (!clientId) {
    console.error('[discord] DISCORD_CLIENT_ID가 설정되지 않았습니다. .env 파일을 확인하세요.');
    return null;
  }

  try {
    const sdk = new DiscordSDK(clientId);
    await sdk.ready();
    readySdk = sdk;
    console.log('[discord] SDK ready — Activity 프레임 연결 완료');
    return sdk;
  } catch (e) {
    console.error('[discord] SDK 초기화 실패', e);
    return null;
  }
}

/** 같은 Activity를 함께 보고 있는 사람들을 묶는 고유 식별자. ready() 이전엔 없다 */
export function getDiscordInstanceId(): string | null {
  return readySdk?.instanceId ?? null;
}
