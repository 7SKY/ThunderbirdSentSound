/* Convert PCM AIFF/AIFF-C locally; Thunderbird need only decode the resulting WAV. */
(function(root) {
  function prepareAudio(buffer, name) {
    const b = new Uint8Array(buffer);
    const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
    const text = (p,n) => String.fromCharCode(...b.slice(p,p+n));
    if (!b.length || b.length > SentSound.MAX_BYTES) throw Error('Choose a sound no larger than 3 MiB.');
    if (/\.wav$/i.test(name) && SentSound.isWav(buffer)) return {bytes:buffer,mime:'audio/wav'};
    if (/\.mp3$/i.test(name)) return {bytes:buffer,mime:'audio/mpeg'}; // Actual decoder validates MP3.
    if (!/\.(aiff|aif|aifc)$/i.test(name) || b.length < 12 || text(0,4) !== 'FORM' || !['AIFF','AIFC'].includes(text(8,4))) {
      throw Error('Choose a WAV, MP3, or PCM AIFF file.');
    }
    const end = v.getUint32(4) + 8;
    if (end > b.length || end < 12) throw Error('Truncated AIFF file.');
    let comm, ssnd;
    for (let p=12;p<end;) {
      if (p+8>end) throw Error('Truncated AIFF chunk.');
      const size=v.getUint32(p+4), start=p+8;
      if (start+size>end) throw Error('Truncated AIFF chunk.');
      if (text(p,4)==='COMM') comm={start,size};
      if (text(p,4)==='SSND') ssnd={start,size};
      p=start+size+(size%2);
    }
    if (!comm || comm.size<18 || !ssnd || ssnd.size<8) throw Error('AIFF requires COMM and SSND chunks.');
    const c=comm.start, channels=v.getUint16(c), frames=v.getUint32(c+2), bits=v.getUint16(c+6);
    const exponent=v.getUint16(c+8);
    const mantissa=v.getUint32(c+10)*4294967296+v.getUint32(c+14);
    const rate=mantissa*Math.pow(2,(exponent&32767)-16383-63);
    if ((exponent&32768) || !Number.isFinite(rate) || rate<1000 || rate>384000 || Math.abs(rate-Math.round(rate))>.001) throw Error('Unsupported AIFF sample rate.');
    if (![1,2].includes(channels) || ![8,16,24,32].includes(bits) || !frames) throw Error('AIFF supports mono/stereo PCM at 8, 16, 24, or 32 bits.');
    let little=false;
    if (text(8,4)==='AIFC') {
      if (comm.size<22) throw Error('Invalid AIFF-C COMM chunk.');
      const compression=text(c+18,4);
      if (!['NONE','twos','sowt'].includes(compression)) throw Error('Compressed AIFF-C is unsupported. Export as PCM AIFF.');
      little=compression==='sowt';
    }
    const sampleBytes=bits/8, count=frames*channels;
    const start=ssnd.start+8+v.getUint32(ssnd.start);
    if (start>ssnd.start+ssnd.size || count*sampleBytes>ssnd.start+ssnd.size-start) throw Error('Truncated AIFF samples.');
    const length=count*2;
    if (length+44>SentSound.MAX_BYTES) throw Error('Converted AIFF exceeds 3 MiB. Choose a shorter sound.');
    const output=new ArrayBuffer(44+length), w=new DataView(output), out=new Uint8Array(output);
    const write=(p,s)=>{for(let i=0;i<s.length;i++)out[p+i]=s.charCodeAt(i);};
    write(0,'RIFF');w.setUint32(4,36+length,true);write(8,'WAVE');write(12,'fmt ');
    w.setUint32(16,16,true);w.setUint16(20,1,true);w.setUint16(22,channels,true);
    w.setUint32(24,Math.round(rate),true);w.setUint32(28,Math.round(rate)*channels*2,true);
    w.setUint16(32,channels*2,true);w.setUint16(34,16,true);write(36,'data');w.setUint32(40,length,true);
    for(let i=0;i<count;i++) {
      const p=start+i*sampleBytes;
      let value;
      if(bits===8) value=v.getInt8(p)*256;
      else if(bits===16)value=v.getInt16(p,little);
      else if(bits===32)value=v.getInt32(p,little)>>16;
      else {
        let n=little ? b[p]+b[p+1]*256+b[p+2]*65536 : b[p]*65536+b[p+1]*256+b[p+2];
        if(n&0x800000)n-=0x1000000;
        value=n>>8;
      }
      w.setInt16(44+i*2,value,true);
    }
    return {bytes:output,mime:'audio/wav'};
  }
  root.SentSoundFormats={prepareAudio};
  if(typeof module!=='undefined')module.exports={prepareAudio};
})(globalThis);
