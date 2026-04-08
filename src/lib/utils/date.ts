export function getKoreanTimestamp() {
  const now = new Date();
  const seoulTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  return seoulTime.toISOString();
}

