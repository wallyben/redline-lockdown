const Siren = (() => {
  let audio, oscillator, volume, filter, pan, motor, motorGain;
  function enable() {
    if (!audio) {
      audio = new AudioContext();
      oscillator = audio.createOscillator();
      oscillator.type = 'triangle';
      filter = audio.createBiquadFilter();
      filter.type = 'lowpass';
      volume = audio.createGain();
      volume.gain.value = 0;
      pan = audio.createStereoPanner();
      oscillator.connect(filter).connect(volume).connect(pan).connect(audio.destination);
      oscillator.start();
      motor=audio.createOscillator(); motor.type='sawtooth';motorGain=audio.createGain();motorGain.gain.value=0;
      const muffler=audio.createBiquadFilter();muffler.type='lowpass';muffler.frequency.value=250;
      motor.connect(muffler).connect(motorGain).connect(audio.destination);motor.start();
    }
    if (audio.state === 'suspended') audio.resume().catch(() => {});
  }
  function update(distance, time, covered, direction = 0) {
    if (!audio) return;
    const near = Math.max(0, 1 - distance / 360);
    const now = audio.currentTime;
    pan.pan.setTargetAtTime(Math.max(-1,Math.min(1,direction)),now,.1);
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
  return { enable, update, engine, cue };
})();
