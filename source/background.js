/* A persistent DOM background page owns audio independently of compose/options tabs. */
const audio = new Audio();
audio.preload = 'auto';
let playback = Promise.resolve();
audio.addEventListener('error', () => {
  reportFailure(new Error('The selected WAV could not be played (media error ' + (audio.error?.code || 'unknown') + ').')).catch(console.error);
});
async function playSelected(preview = false) {
  const { enabled = true, sound } = await browser.storage.local.get(['enabled', 'sound']);
  if (!preview && !enabled) return;
  if (!sound?.dataUrl?.startsWith('data:audio/wav;base64,')) {
    if (preview) throw new Error('Choose a WAV file first.');
    return;
  }
  audio.pause();
  audio.src = sound.dataUrl;
  audio.load();
  await audio.play();
  await browser.storage.local.remove('playbackError');
}
function enqueue(preview) {
  const next = playback.then(() => playSelected(preview));
  playback = next.catch(() => {});
  return next;
}
async function reportFailure(error) {
  console.error('Sent Sound playback failed:', error);
  await browser.storage.local.set({ playbackError: String(error.message || error) });
}
browser.compose.onAfterSend.addListener((_tab, info) => {
  if (SentSound.successfulImmediateSend(info)) {
    enqueue(false).catch(reportFailure);
  }
});
browser.runtime.onMessage.addListener((message) => {
  if (message?.type !== 'sent-sound-preview') return;
  return enqueue(true).then(async () => {
    await browser.storage.local.remove('playbackError');
    return { ok: true };
  }, async error => {
    await reportFailure(error);
    return { ok: false, error: String(error.message || error) };
  });
});
