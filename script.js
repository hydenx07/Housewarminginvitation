(() => {
  const $ = (selector) => document.querySelector(selector);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- personalised guest name: ?guest=Anitha (default: Friend) ---- */
  const guest = (new URLSearchParams(window.location.search).get('guest') || '').replace(/\s+/g, ' ').trim().slice(0, 40) || 'Friend';
  document.querySelectorAll('.guest-name').forEach((el) => { el.textContent = guest; });

  /* ---- falling red flowers ---- */
  const petals = $('#petals');
  function drop(count, burst) {
    for (let i = 0; i < count; i += 1) {
      const petal = document.createElement('i');
      const size = 10 + Math.random() * 16;
      petal.className = 'petal';
      petal.style.cssText = 'left:' + (Math.random() * 100) + '%;width:' + size + 'px;--dur:' + (7 + Math.random() * 7) + 's;--sway:' + Math.round(Math.random() * 80 - 40) + 'px;--spin:' + Math.round(Math.random() * 720 - 360) + 'deg;opacity:' + (0.55 + Math.random() * 0.4) +
        ';animation-delay:' + (burst ? (Math.random() * 1.4).toFixed(2) : (-Math.random() * 10).toFixed(2)) + 's' + (burst ? ';animation-iteration-count:1' : '');
      if (burst) { petal.addEventListener('animationend', () => petal.remove()); }
      petals.appendChild(petal);
    }
  }
  if (!reduceMotion) { drop(14); }

  /* ---- calm piano-style music (generated in the browser, no audio file) ---- */
  let ctx; let master; let musicOn = false; let barTimer; let barIndex = 0;
  const musicBtn = $('#musicBtn');
  const hz = (note) => 440 * Math.pow(2, (note - 69) / 12);
  const progression = [[48, 55, 60, 64, 67, 72], [45, 52, 57, 60, 64, 69], [41, 48, 53, 57, 60, 65], [43, 50, 55, 59, 62, 67], [48, 55, 60, 64, 67, 72], [40, 47, 52, 55, 59, 64], [41, 48, 53, 57, 60, 65], [43, 50, 55, 59, 62, 67]];
  const arpeggio = [0, 2, 3, 4, 3, 2, 4, 3];
  const melody = [72, 74, 76, 79, 81, 84, 79, 76];
  const step = 0.46;

  function setupAudio() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) { return false; }
    ctx = new AudioCtx();
    master = ctx.createGain(); master.gain.value = 0;
    const dry = ctx.createGain(); dry.gain.value = 0.75;
    const wet = ctx.createGain(); wet.gain.value = 0.4;
    const reverb = ctx.createConvolver();
    const length = ctx.sampleRate * 3;
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let c = 0; c < 2; c += 1) {
      const data = impulse.getChannelData(c);
      for (let i = 0; i < length; i += 1) { data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.8); }
    }
    reverb.buffer = impulse;
    master.connect(dry); dry.connect(ctx.destination);
    master.connect(reverb); reverb.connect(wet); wet.connect(ctx.destination);
    return true;
  }

  function note(midi, start, velocity, length) {
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 2600;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(velocity, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    filter.connect(gain); gain.connect(master);
    [[1, 1, 'sine'], [2, 0.3, 'sine'], [3, 0.1, 'triangle'], [4, 0.05, 'sine']].forEach(([mult, amp, type]) => {
      const osc = ctx.createOscillator(); const level = ctx.createGain();
      osc.type = type; osc.frequency.value = hz(midi) * mult; level.gain.value = amp;
      osc.connect(level); level.connect(filter); osc.start(start); osc.stop(start + length + 0.05);
    });
  }

  function playBar() {
    if (!musicOn) { return; }
    const start = ctx.currentTime + 0.08;
    const chord = progression[barIndex % progression.length];
    note(chord[0] - 12, start, 0.05, 4.2);
    arpeggio.forEach((index, i) => note(chord[index], start + i * step + Math.random() * 0.012, 0.035 + (i % 4 === 0 ? 0.012 : 0) + Math.random() * 0.008, 2.6));
    if (barIndex % 2 === 0) {
      note(melody[(barIndex * 3) % melody.length], start + 2 * step, 0.034, 3);
      note(melody[(barIndex * 3 + 2) % melody.length], start + 6 * step, 0.03, 3);
    }
    barIndex += 1;
    barTimer = window.setTimeout(playBar, step * 8 * 1000);
  }

  function setMusicLabel() {
    musicBtn.textContent = musicOn ? '♪ Pause music' : '♪ Play music';
    musicBtn.setAttribute('aria-pressed', String(musicOn));
  }

  function startMusic() {
    if (musicOn) { return; }
    if (!ctx && !setupAudio()) { return; }
    ctx.resume();
    musicOn = true;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 2.5);
    playBar();
    setMusicLabel();
  }

  function stopMusic() {
    if (!musicOn) { return; }
    musicOn = false;
    window.clearTimeout(barTimer);
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
    window.setTimeout(() => { if (!musicOn) { ctx.suspend(); } }, 1500);
    setMusicLabel();
  }

  musicBtn.addEventListener('click', () => (musicOn ? stopMusic() : startMusic()));

  function playClick() {
    if (!ctx) { return; }
    const now = ctx.currentTime;
    const noise = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) { data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3); }
    const src = ctx.createBufferSource(); src.buffer = noise;
    const band = ctx.createBiquadFilter(); band.type = 'bandpass'; band.frequency.value = 1800;
    const level = ctx.createGain(); level.gain.value = 0.35;
    src.connect(band); band.connect(level); level.connect(ctx.destination); src.start(now);
    const thump = ctx.createOscillator(); const thumpGain = ctx.createGain();
    thump.frequency.setValueAtTime(160, now); thump.frequency.exponentialRampToValueAtTime(70, now + 0.15);
    thumpGain.gain.setValueAtTime(0.25, now); thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    thump.connect(thumpGain); thumpGain.connect(ctx.destination); thump.start(now); thump.stop(now + 0.2);
  }

  /* ---- landing: unlock, open the doors, walk in ---- */
  const landing = $('#landing'); const site = $('#site');
  let opened = false;

  let arrived = false;

  function arrive() {
    if (arrived) { return; }
    arrived = true;
    site.classList.add('is-visible');
    document.body.classList.remove('photo-pending', 'is-locked');
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => { landing.hidden = true; }));
  }

  function fly() {
    landing.classList.add('is-flying');
    site.classList.add('is-visible');
    window.setTimeout(arrive, 1500);
  }

  const slide = $('#slide'); const knob = $('#slideKnob'); const fill = $('#slideFill');
  const KNOB = 46; const PAD = 4;
  let dragging = false; let startX = 0; let pos = 0;
  const maxPos = () => slide.clientWidth - KNOB - PAD * 2;
  function setPos(x) {
    pos = Math.max(0, Math.min(x, maxPos()));
    knob.style.transform = 'translateX(' + pos + 'px)';
    fill.style.width = (pos + KNOB + PAD) + 'px';
    slide.setAttribute('aria-valuenow', String(Math.round((pos / maxPos()) * 100)));
  }
  function unlock() {
    if (opened) { return; }
    opened = true;
    slide.classList.add('is-snap');
    setPos(maxPos());
    startMusic();
    playClick();
    if (navigator.vibrate) { navigator.vibrate([20, 40, 14]); }
    if (reduceMotion) { arrive(); return; }
    window.setTimeout(() => { slide.classList.add('is-done'); drop(22, true); }, 300);
    window.setTimeout(fly, 800);
  }
  slide.addEventListener('pointerdown', (e) => {
    if (opened) { return; }
    dragging = true; startX = e.clientX - pos;
    slide.classList.remove('is-snap'); slide.classList.add('is-dragging');
    slide.setPointerCapture(e.pointerId);
  });
  slide.addEventListener('pointermove', (e) => { if (dragging) { setPos(e.clientX - startX); } });
  const release = () => {
    if (!dragging) { return; }
    dragging = false; slide.classList.remove('is-dragging');
    if (pos >= maxPos() * 0.82) { unlock(); } else { slide.classList.add('is-snap'); setPos(0); }
  };
  slide.addEventListener('pointerup', release);
  slide.addEventListener('pointercancel', release);
  slide.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); unlock(); } });

  /* ---- countdown (5 PM, 31 Oct 2026, Dublin = 17:00 UTC) ---- */
  const target = Date.UTC(2026, 9, 31, 17, 0, 0);
  const pad2 = (n) => String(n).padStart(2, '0');
  function tick() {
    const left = Math.max(0, target - Date.now());
    $('#cd-d').textContent = pad2(Math.floor(left / 864e5));
    $('#cd-h').textContent = pad2(Math.floor((left % 864e5) / 36e5));
    $('#cd-m').textContent = pad2(Math.floor((left % 36e5) / 6e4));
    $('#cd-s').textContent = pad2(Math.floor((left % 6e4) / 1e3));
  }
  tick(); window.setInterval(tick, 1000);

  /* ---- reveal on scroll + progress bar ---- */
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('in-view'); observer.unobserve(entry.target); } });
    }, { threshold: 0.15 });
    reveals.forEach((el) => observer.observe(el));
  } else { reveals.forEach((el) => el.classList.add('in-view')); }
  const bar = $('#progress');
  function progress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(window.scrollY / max, 1) : 0) + ')';
  }
  window.addEventListener('scroll', progress, { passive: true });

  /* ---- calendar + copy address ---- */
  const address = '9 Citywest Park Avenue, Citywest Park, Dublin 24, D24 KP3X';
  $('#calBtn').addEventListener('click', () => {
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Housewarming//EN', 'BEGIN:VEVENT', 'UID:housewarming-2026@invite', 'DTSTAMP:20261024T000000Z',
      'DTSTART:20261031T170000Z', 'DTEND:20261031T200000Z', 'SUMMARY:Housewarming', 'LOCATION:' + address.replace(/,/g, '\\,'), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    link.download = 'housewarming.ics';
    document.body.appendChild(link); link.click(); link.remove();
  });
})();
