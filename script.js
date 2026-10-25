(() => {
  const $ = (selector) => document.querySelector(selector);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- personalised guest name: ?guest=Anitha (default: Friend) ---- */
  const guest = (new URLSearchParams(window.location.search).get('guest') || '').replace(/\s+/g, ' ').trim().slice(0, 40) || 'Friend';
  document.querySelectorAll('.guest-name').forEach((el) => { el.textContent = guest; });

  /* keep "Dear <name>," on one line above the printed text */
  const dear = document.querySelector('.land-dear');
  function fitDear() {
    if (!dear) { return; }
    dear.style.fontSize = ''; dear.style.whiteSpace = 'nowrap';
    const r = dear.clientWidth / dear.scrollWidth;
    if (r < 1) {
      if (r >= 0.5) { dear.style.fontSize = 'calc(8.2cqw * ' + (r * 0.97).toFixed(3) + ')'; }
      else { dear.style.whiteSpace = 'normal'; dear.style.fontSize = 'calc(8.2cqw * 0.6)'; }
    }
  }
  fitDear();
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(fitDear); }
  window.addEventListener('resize', fitDear);

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

  /* ---- background song: Thandhaay.mp3 (loops, fades in) ---- */
  let musicOn = false; let fadeTimer;
  const musicBtn = $('#musicBtn');
  const audio = new Audio('Thandhaay.mp3');
  audio.loop = true; audio.preload = 'auto'; audio.volume = 0;
  audio.volume = 0.5; const canFade = audio.volume === 0.5; audio.volume = 0;
  function fadeTo(target, ms, done) {
    window.clearInterval(fadeTimer);
    if (!canFade) { if (done) { done(); } return; }
    const from = audio.volume; const t0 = performance.now();
    fadeTimer = window.setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      audio.volume = Math.max(0, Math.min(1, from + (target - from) * k));
      if (k >= 1) { window.clearInterval(fadeTimer); if (done) { done(); } }
    }, 50);
  }
  function setMusicLabel() {
    musicBtn.textContent = musicOn ? '♪ Pause music' : '♪ Play music';
    musicBtn.setAttribute('aria-pressed', String(musicOn));
  }
  let primed = false;
  function primeAudio() {
    if (primed) { return; }
    primed = true;
    const p = audio.play();
    if (p && p.then) { p.then(() => { if (!musicOn) { audio.pause(); audio.currentTime = 0; } }).catch(() => { primed = false; }); }
  }
  function startMusic() {
    if (musicOn) { return; }
    musicOn = true;
    setMusicLabel();
    const p = audio.play();
    const ok = () => { if (musicOn) { fadeTo(0.7, 2500); } };
    const retry = () => {
      const again = () => { if (musicOn && audio.paused) { audio.play().then(ok).catch(() => {}); } };
      document.addEventListener('pointerdown', again, { once: true });
    };
    if (p && p.then) { p.then(ok).catch(retry); } else { ok(); }
  }
  function stopMusic() {
    if (!musicOn) { return; }
    musicOn = false;
    setMusicLabel();
    if (canFade) { fadeTo(0, 700, () => { if (!musicOn) { audio.pause(); } }); } else { audio.pause(); }
  }
  musicBtn.addEventListener('click', () => (musicOn ? stopMusic() : startMusic()));

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
    if (navigator.vibrate) { navigator.vibrate([20, 40, 14]); }
    if (reduceMotion) { arrive(); return; }
    window.setTimeout(() => { slide.classList.add('is-done'); drop(22, true); }, 300);
    window.setTimeout(fly, 800);
  }
  slide.addEventListener('pointerdown', (e) => {
    if (opened) { return; }
    primeAudio();
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
