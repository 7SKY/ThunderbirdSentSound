const $ = id => document.getElementById(id);
function status(text) { $('status').textContent = text; }
async function refresh() {
  const { enabled = true, sound, playbackError } = await browser.storage.local.get(['enabled', 'sound', 'playbackError']);
  $('enabled').checked = enabled;
  $('filename').textContent = sound?.name || 'No sound selected';
  $('preview').disabled = !sound;
  if (playbackError) status('Last playback error: ' + playbackError);
}
$('enabled').addEventListener('change', async () => {
  try {
    await browser.storage.local.set({ enabled: $('enabled').checked });
    status('Saved.');
  } catch (e) { status('Could not save: ' + e.message); await refresh(); }
});
$('choose').addEventListener('click', () => $('file').click());
$('file').addEventListener('change', async () => {
  const file = $('file').files[0];
  if (!file) return;
  $('choose').disabled = true;
  try {
    if (file.size > SentSound.MAX_BYTES) throw new Error('Choose a sound no larger than 3 MiB.');
    const prepared = SentSoundFormats.prepareAudio(await file.arrayBuffer(), file.name);
    const bytes = prepared.bytes;
    // Verify decoding before replacing the last working selection. No autoplay needed.
    const context = new AudioContext();
    try { await context.decodeAudioData(bytes.slice(0)); }
    catch { throw new Error('Thunderbird cannot decode this sound. Try another file or a standard PCM WAV.'); }
    finally { await context.close(); }
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not read the file.'));
      reader.readAsDataURL(new Blob([bytes], { type: prepared.mime }));
    });
    await browser.storage.local.set({ sound: { name: file.name, dataUrl } });
    await browser.storage.local.remove('playbackError');
    await refresh();
    status('Sound saved. Click Play to preview.');
  } catch (e) { status(e.message); }
  finally { $('choose').disabled = false; $('file').value = ''; }
});
$('preview').addEventListener('click', async () => {
  $('preview').disabled = true;
  try {
    const result = await browser.runtime.sendMessage({ type: 'sent-sound-preview' });
    status(result?.ok ? 'Playing preview.' : 'Could not play: ' + (result?.error || 'Background unavailable.'));
  } catch (e) { status('Could not play: ' + e.message); }
  finally { $('preview').disabled = false; }
});
refresh().catch(e => status('Could not load preferences: ' + e.message));
