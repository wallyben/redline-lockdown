const Siren = (() => {
  let audio, oscillator, volume, filter, pan;
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
  return { enable, update };
})();
