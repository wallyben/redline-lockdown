const Siren = (() => {
  let audio, oscillator, volume, filter, pan, motor, motorGain, unavailable=false;
  function enable() {
    if (unavailable) return;
    if (!audio) {
      const AudioCtor=globalThis.AudioContext || globalThis.webkitAudioContext;
      if(typeof AudioCtor!=='function'){unavailable=true;return;}
      try {
      audio = new AudioCtor();
      oscillator = audio.createOscillator();
      oscillator.type = 'triangle';
      filter = audio.createBiquadFilter();
      filter.type = 'lowpass';
      volume = audio.createGain();
      volume.gain.value = 0;
      pan = audio.createStereoPanner ? audio.createStereoPanner() : audio.createGain();
      oscillator.connect(filter).connect(volume).connect(pan).connect(audio.destination);
      oscillator.start();
      motor=audio.createOscillator(); motor.type='sawtooth';motorGain=audio.createGain();motorGain.gain.value=0;
      const muffler=audio.createBiquadFilter();muffler.type='lowpass';muffler.frequency.value=250;
      motor.connect(muffler).connect(motorGain).connect(audio.destination);motor.start();
      } catch (error) {
        unavailable=true;
        try{audio?.close?.();}catch{}
        audio=null;
        return;
      }
    }
    if (audio.state === 'suspended') {
      try { Promise.resolve(audio.resume()).catch(()=>{}); } catch {}
    }
  }
  function update(distance, time, covered, direction = 0) {
    if (!audio) return;
    const near = Math.max(0, 1 - distance / 360);
    const now = audio.currentTime;
    if(pan.pan)pan.pan.setTargetAtTime(Math.max(-1,Math.min(1,direction)),now,.1);
    oscillator.frequency.setTargetAtTime(665 + 245 * Math.sin(time * Math.PI * 1.55), now, .04);
    filter.frequency.setTargetAtTime(covered ? 420 : 1950, now, .08);
    volume.gain.setTargetAtTime(near * near * .22, now, .09);
  }
  function engine(active,speed,impact){
    if(!audio)return;
    motor.frequency.setTargetAtTime(38+speed*.22+(impact>0?16:0),audio.currentTime,.08);
    motorGain.gain.setTargetAtTime(active?.025+Math.min(speed/360,1)*.045:0,audio.currentTime,.08);
  }
  // Original two-tone one-shot cue; no external audio, files or network.
  function cue() {
    if (!audio) return;
    const now=audio.currentTime;
    const tone=audio.createOscillator(),gain=audio.createGain();
    tone.type='triangle';
    tone.frequency.setValueAtTime(220,now);
    tone.frequency.exponentialRampToValueAtTime(680,now+.21);
    tone.frequency.exponentialRampToValueAtTime(430,now+.42);
    gain.gain.setValueAtTime(.0001,now);
    gain.gain.exponentialRampToValueAtTime(.055,now+.018);
    gain.gain.exponentialRampToValueAtTime(.0001,now+.48);
    tone.connect(gain).connect(audio.destination);
    tone.start(now);tone.stop(now+.5);
    tone.onended=()=>{tone.disconnect();gain.disconnect();};
  }
  // Lightweight original feedback for real player actions, never a soundtrack.
  // Single short voice per event; no network, samples, assets or added packages.
  function signal(kind) {
    if (!audio || audio.state !== 'running') return;
    const sounds = {
      job:     {from:410,to:730,duration:.24,volume:.036,type:'triangle'},
      relay:   {from:260,to:520,duration:.30,volume:.044,type:'square'},
      grid:    {from:410,to:180,duration:.42,volume:.05,type:'triangle'},
      lockdown:{from:370,to:135,duration:.48,volume:.055,type:'sawtooth'},
      escape:  {from:330,to:880,duration:.48,volume:.052,type:'triangle'},
      busted:  {from:250,to:92,duration:.55,volume:.05,type:'triangle'}
    };
    const sound=sounds[kind];
    if(!sound)return;
    try {
      const now=audio.currentTime;
      const tone=audio.createOscillator(),envelope=audio.createGain();
      tone.type=sound.type;
      tone.frequency.setValueAtTime(sound.from,now);
      tone.frequency.exponentialRampToValueAtTime(sound.to,now+sound.duration);
      envelope.gain.setValueAtTime(.0001,now);
      envelope.gain.exponentialRampToValueAtTime(sound.volume,now+.025);
      envelope.gain.exponentialRampToValueAtTime(.0001,now+sound.duration);
      tone.connect(envelope).connect(audio.destination);
      tone.start(now);tone.stop(now+sound.duration+.025);
      tone.onended=()=>{tone.disconnect();envelope.disconnect();};
    } catch {
      // Audio failure is never allowed to interrupt gameplay.
    }
  }
  return { enable, update, engine, cue, signal };
})();
