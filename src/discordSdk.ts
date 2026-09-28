import { DiscordSDK } from '@discord/embedded-app-sdk';

// Parcel이 빌드 시 process.env.DISCORD_CLIENT_ID 를 .env 값으로 정적 치환해준다.
// tsconfig의 include가 src/index.ts만 가리켜 @types/node 전체를 끌어올 필요는 없어
// 여기서 쓰는 변수만 최소로 선언한다.
declare const process: { env: { DISCORD_CLIENT_ID?: string } };

// Discord가 Activity를 iframe으로 띄울 때 URL에 frame_id 등의 쿼리스트링을 붙여준다.
// 이게 없으면 일반 브라우저(원본 사이트, 개발 서버)에서 열린 것이므로 SDK를 건드리지 않는다.
// SDK.ready()는 Discord와의 핸드셰이크라 Discord 프레임 밖에서 부르면 영원히 대기 상태로 멈춘다.
export function isInsideDiscord(): boolean {
  return new URLSearchParams(window.location.search).has('frame_id');
}

/**
 * Discord Activity 프레임 안에서 실행 중이면 SDK를 초기화하고 준비 완료를 알린다.
 * 그 외의 경우(원본 웹사이트, 로컬 개발) 아무것도 하지 않는다.
 */
export async function initDiscordSdkIfEmbedded(): Promise<void> {
  if (!isInsideDiscord()) return;

  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    console.error('[discord] DISCORD_CLIENT_ID가 설정되지 않았습니다. .env 파일을 확인하세요.');
    return;
  }

  try {
    const sdk = new DiscordSDK(clientId);
    await sdk.ready();
    console.log('[discord] SDK ready — Activity 프레임 연결 완료');
  } catch (e) {
    console.error('[discord] SDK 초기화 실패', e);
  }
}
