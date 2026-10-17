const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const core = require('../source/core.js');
function harness(initial = {}) {
  const state = {...initial}; let sent, message, plays = 0, fail = false;
  const context = {
    SentSound: core, console: {error() {}},
    Audio: class { addEventListener() {} pause() {} load() {} async play() { if (fail) throw Error('Audio unavailable'); plays++; } },
    browser: {
      storage: {local: {
        async get() { return {...state}; }, async set(v) { Object.assign(state, v); },
        async remove(k) { delete state[k]; }
      }},
      compose: {onAfterSend: {addListener(fn) { sent = fn; }}},
      runtime: {onMessage: {addListener(fn) { message = fn; }}}
    }
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../source/background.js'), 'utf8'), context);
  return {state, sent: (...args) => sent(...args), message: v => message(v), plays: () => plays, fail: () => {fail = true;}};
}
const sound = {name: 'test.wav', dataUrl: 'data:audio/wav;base64,AAAA'};
const settle = () => new Promise(resolve => setImmediate(resolve));
test('only successful immediate events qualify, including with no FCC copies', () => {
  for (const info of [undefined, {}, {mode:'sendLater'}, {mode:'sendNow', error:'failed'}, {mode:'sendNow',error:''}]) assert.equal(core.successfulImmediateSend(info), false);
  assert.equal(core.successfulImmediateSend({mode:'sendNow', messages:[]}), true);
});
test('WAV signature and size validation', () => {
  assert.equal(core.isWav(Buffer.from('RIFF0000WAVE')), true);
  assert.equal(core.isWav(Buffer.from('not a WAV')), false);
  assert.equal(core.isWav(Buffer.alloc(core.MAX_BYTES+1)), false);
});
test('event listener plays after success; ignores queue/failure/unknown', async () => {
  const h = harness({sound});
  for (const info of [{mode:'sendLater'}, {mode:'sendNow',error:'SMTP rejected'}, {}, {mode:'sendNow',messages:[]}]) h.sent({},info);
  await settle(); assert.equal(h.plays(),1);
});
test('disabled/missing sound stay silent; preview bypasses disabled', async () => {
  const h = harness({enabled:false,sound}); h.sent({}, {mode:'sendNow'});
  await settle(); assert.equal(h.plays(),0);
  assert.equal((await h.message({type:'sent-sound-preview'})).ok,true);
  assert.equal(h.plays(),1);
  delete h.state.sound;
  h.sent({}, {mode:'sendNow'}); await settle(); assert.equal(h.plays(),1);
  assert.equal((await h.message({type:'sent-sound-preview'})).ok,false);
});
test('playback failures recorded; subsequent changed sound can play', async () => {
  const h = harness({sound}); h.fail(); h.sent({}, {mode:'sendNow'});
  await settle(); assert.match(h.state.playbackError,/Audio unavailable/);
  const fresh = harness({sound}); fresh.state.sound = {...sound,name:'changed.wav'};
  fresh.sent({}, {mode:'sendNow'}); await settle(); assert.equal(fresh.plays(),1);
});
test('rapid events are handled without unhandled rejection', async () => {
  const h = harness({sound}); for(let i=0;i<5;i++) h.sent({}, {mode:'sendNow'});
  await settle(); assert.equal(h.plays(),5);
});
