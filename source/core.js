/* Shared pure validation; no mail content is inspected. */
(function (root) {
  const MAX_BYTES = 3 * 1024 * 1024;
  function successfulImmediateSend(info) {
    return !!info && info.mode === 'sendNow' &&
      !Object.prototype.hasOwnProperty.call(info, 'error');
  }
  function isWav(buffer) {
    const b = new Uint8Array(buffer);
    const text = (offset, length) => String.fromCharCode(...b.slice(offset, offset + length));
    return b.length >= 12 && b.length <= MAX_BYTES &&
      text(0, 4) === 'RIFF' && text(8, 4) === 'WAVE';
  }
  const api = { MAX_BYTES, successfulImmediateSend, isWav };
  root.SentSound = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
