const test=require('node:test');
const assert=require('node:assert/strict');
global.SentSound=require('../source/core.js');
const {prepareAudio}=require('../source/formats.js');
function fixture(bits=16, compression=null, channels=1) {
  const sampleBytes=bits/8, commSize=compression?24:18, dataSize=4*channels*sampleBytes;
  const b=Buffer.alloc(12+8+commSize+8+8+dataSize);
  b.write('FORM');b.writeUInt32BE(b.length-8,4);b.write(compression?'AIFC':'AIFF',8);
  b.write('COMM',12);b.writeUInt32BE(commSize,16);b.writeUInt16BE(channels,20);b.writeUInt32BE(4,22);b.writeUInt16BE(bits,26);
  // IEEE extended 80-bit representation of 44100.
  Buffer.from('400eac44000000000000','hex').copy(b,28);
  if(compression)b.write(compression,38);
  const p=20+commSize;b.write('SSND',p);b.writeUInt32BE(8+dataSize,p+4);
  const expected=[-32768,-16384,0,16384];
  for(let i=0;i<4*channels;i++) {
    const value=expected[Math.floor(i/channels)]*Math.pow(2,bits-16);
    if(compression==='sowt')b.writeIntLE(value,p+16+i*sampleBytes,sampleBytes);
    else b.writeIntBE(value,p+16+i*sampleBytes,sampleBytes);
  }
  return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
}
for(const bits of [8,16,24,32])for(const compression of [null,'NONE','twos','sowt']) {
 test(`PCM ${bits}-bit ${compression||'AIFF'} converts correct sample values`,()=>{
  const result=prepareAudio(fixture(bits,compression,2),'sound.aiff');
  const b=Buffer.from(result.bytes);assert.equal(result.mime,'audio/wav');
  assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.readUInt32LE(24),44100);
  assert.equal(b.readUInt16LE(22),2);assert.equal(b.readUInt16LE(34),16);
  assert.deepEqual(Array.from({length:8},(_,i)=>b.readInt16LE(44+i*2)),[-32768,-32768,-16384,-16384,0,0,16384,16384]);
 });
}
test('MP3 MIME; native decoding is left to options',()=>assert.equal(prepareAudio(new Uint8Array([73,68,51]).buffer,'test.MP3').mime,'audio/mpeg'));
test('WAV remains unchanged',()=>{const bytes=Buffer.from('RIFF0000WAVE');const r=prepareAudio(bytes,'x.wav');assert.equal(r.bytes,bytes);});
test('reject compressed, truncated, oversized, and foreign files',()=>{
 assert.throws(()=>prepareAudio(fixture(16,'fl32'),'x.aifc'),/unsupported/i);
 const truncated=fixture().slice(0,-1);assert.throws(()=>prepareAudio(truncated,'x.aif'),/Truncated/);
 assert.throws(()=>prepareAudio(new ArrayBuffer(SentSound.MAX_BYTES+1),'x.mp3'),/3 MiB/);
 assert.throws(()=>prepareAudio(new ArrayBuffer(20),'x.aiff'),/Choose/);
});
test('honors SSND sample offset and skips odd-sized ancillary chunks',()=>{
 const original=Buffer.from(fixture());const b=Buffer.alloc(original.length+12);
 original.copy(b,0,0,38);b.write('JUNK',38);b.writeUInt32BE(1,42);b[46]=99;
 original.copy(b,48,38,54);b.writeUInt32BE(2,56);original.copy(b,66,54);
 b.writeUInt32BE(b.length-8,4);b.writeUInt32BE(18,52);
 const result=prepareAudio(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'offset.aif');
 assert.equal(new DataView(result.bytes).getInt16(44,true),-32768);
});
