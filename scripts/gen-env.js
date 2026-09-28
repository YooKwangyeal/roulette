// 빌드 전에 .env 값을 읽어 src/env.generated.ts로 박아 넣는다.
//
// 원래는 Parcel의 process.env.X 정적 치환에 맡기려 했는데, 이 프로젝트에서는
// 원인 불명으로 치환이 안 먹혔다 (버전/캐시 문제 아님 — 최소 재현 프로젝트에서는
// 똑같은 Parcel/디펜던시로 잘 됐다). 대신 직접 파일을 만들어 심는 게 훨씬
// 확실하고 디버깅하기도 쉽다.
//
// 여기서 다루는 값(DISCORD_CLIENT_ID, SYNC_SERVER_URL)은 둘 다 클라이언트
// 번들에 그대로 노출되는 공개 값이라 파일로 박아 넣어도 안전하다.
const { readFileSync, writeFileSync, existsSync } = require('node:fs');
const path = require('node:path');

const envPath = path.join(__dirname, '..', '.env');
const env = {};

if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    env[key] = value;
  }
}

const out = `// 자동 생성 파일. scripts/gen-env.js가 빌드/개발 서버 실행 전마다 새로 만든다.
// 직접 고치지 말 것 — .env를 고치고 다시 빌드하면 된다.
export const DISCORD_CLIENT_ID = ${JSON.stringify(env.DISCORD_CLIENT_ID ?? '')};
export const SYNC_SERVER_URL = ${JSON.stringify(env.SYNC_SERVER_URL ?? '')};
`;

writeFileSync(path.join(__dirname, '..', 'src', 'env.generated.ts'), out);
console.log('[gen-env] src/env.generated.ts 생성 완료');
