(() => {
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const reduce = motionPreference.matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const revealObserver = new IntersectionObserver((entries) => entries.forEach(({ target, isIntersecting }) => {
    target.classList.toggle('in', isIntersecting);
  }), { rootMargin: '-10% 0px -10% 0px' });

  /* Light / dark theme */
  const tbtn = $('#theme');
  const applyTheme = (t, save) => {
    root.dataset.theme = t;
    tbtn.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    if (save) try { localStorage.setItem('theme', t); } catch (e) {}
  };
  applyTheme(root.dataset.theme || 'light');
  tbtn.addEventListener('click', () => {
    root.classList.add('theming');
    applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', true);
    setTimeout(() => root.classList.remove('theming'), 450);
  });

  /* Scroll progress + sticky nav shadow */
  const bar = $('.progress'), nav = $('.nav');
  const onScroll = () => {
    const h = document.documentElement;
    bar.style.transform = `scaleX(${h.scrollTop / (h.scrollHeight - h.clientHeight || 1)})`;
    nav.classList.toggle('stuck', h.scrollTop > 10);
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* Active nav link */
  const links = $$('.nav nav a[href^="#"]:not(.pill)');
  const spy = new IntersectionObserver((es) => es.forEach(e => {
    if (e.isIntersecting) links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('main section').forEach(s => spy.observe(s));

  function applyMotionPreference() {
    document.querySelectorAll('.diagram svg').forEach((diagram) => {
      if (motionPreference.matches) diagram.pauseAnimations();
      else diagram.unpauseAnimations();
    });
    if (motionPreference.matches) {
      revealObserver.disconnect();
      root.classList.remove('animations-ready');
      $$('.reveal').forEach((element) => {
        element.classList.add('in');
        element.getAnimations().forEach((animation) => animation.cancel());
      });
      return;
    }
    startSectionAnimations();
  }

  function startSectionAnimations() {
    const revealElements = $$('.reveal');
    revealObserver.disconnect();
    if (motionPreference.matches || document.hidden) {
      root.classList.remove('animations-ready');
      $$('.reveal').forEach((element) => element.classList.add('in'));
      return;
    }
    root.classList.add('animations-ready');
    revealElements.forEach((element) => revealObserver.observe(element));
  }
  motionPreference.addEventListener('change', applyMotionPreference);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      revealObserver.disconnect();
      root.classList.remove('animations-ready');
      $$('.reveal').forEach((element) => element.classList.add('in'));
      return;
    }
    startSectionAnimations();
  });

  const expertise = $('#expertise');
  expertise.addEventListener('click', (event) => {
    const button = event.target.closest('[data-f]');
    if (!button) return;
    expertise.querySelectorAll('[data-f]').forEach((filter) => {
      const selected = filter === button;
      filter.classList.toggle('on', selected);
      filter.setAttribute('aria-pressed', String(selected));
    });
    let visiblePosition = 0;
    expertise.querySelectorAll('.item').forEach((item) => {
      item.hidden = button.dataset.f !== 'all' && item.dataset.c !== button.dataset.f;
      if (item.hidden) {
        item.getAnimations().forEach((animation) => animation.cancel());
        item.classList.remove('in');
        return;
      }
      item.getAnimations().forEach((animation) => animation.cancel());
      item.style.setProperty('--d', motionPreference.matches ? '0ms' : `${visiblePosition++ * 35}ms`);
      item.classList.remove('in');
      if (!motionPreference.matches) void item.offsetWidth;
      item.classList.add('in');
    });
  });
  expertise.addEventListener('pointermove', (event) => {
    const item = event.target.closest('.item');
    if (!item || motionPreference.matches) return;
    const bounds = item.getBoundingClientRect();
    item.style.setProperty('--mx', event.clientX - bounds.left + 'px');
    item.style.setProperty('--my', event.clientY - bounds.top + 'px');
  });

  /* Hero: typewriter Apex + governor limit meters */
  const code = $('#code'), ok = $('#ok'), meters = $$('.meter');
  const full = code.innerHTML;
  const textNodes = []; const walk = (n) => n.childNodes.forEach(c => c.nodeType === 3 ? textNodes.push([c, c.data]) : walk(c));
  const fmt = (v, max) => (max === 10000 ? v.toLocaleString('en-US') : v) + ' / ' + (max === 10000 ? '10,000' : max);
  function setMeters(on) {
    meters.forEach(m => {
      const v = +m.dataset.v, max = +m.dataset.max;
      m.querySelector('i').style.width = on ? Math.max(v / max * 100, 3) + '%' : '0';
      m.querySelector('b').textContent = on ? fmt(v, max) : '0 / ' + (max === 10000 ? '10,000' : max);
    });
    ok.classList.toggle('show', on);
  }
  function showAll() { code.innerHTML = full; code.classList.remove('caret'); setMeters(true); }
  let run = 0;
  function play() {
    const id = ++run; setMeters(false);
    code.innerHTML = full; textNodes.length = 0; walk(code);
    if (reduce) return showAll();
    textNodes.forEach(([n]) => n.data = '');
    code.classList.add('caret');
    let i = 0, ch = 0;
    const step = () => {
      if (id !== run) return;
      if (i >= textNodes.length) { code.classList.remove('caret'); return setTimeout(() => setMeters(true), 250); }
      const [node, txt] = textNodes[i]; ch += 3; node.data = txt.slice(0, ch);
      if (ch >= txt.length) { i++; ch = 0; }
      setTimeout(step, 14);
    };
    step();
  }
  $('#replay').addEventListener('click', play);

  /* Stat counters: start at 0 until the site is entered */
  const counters = $$('.stats [data-to]');
  if (!reduce) counters.forEach(el => el.textContent = '0');

  /* Everything that animates on arrival starts once the visitor enters */
  function start() {
    startSectionAnimations();

    counters.forEach(el => {
      const to = +el.dataset.to; if (reduce) return;
      const c = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return; c.disconnect();
        const t0 = performance.now();
        const tick = (t) => { const p = Math.min((t - t0) / 1400, 1); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      }); c.observe(el);
    });

    const ide = new IntersectionObserver(([e]) => { if (e.isIntersecting) { ide.disconnect(); setTimeout(play, 600); } }, { threshold: .3 });
    ide.observe($('.ide'));
  }

  const intro = $('#intro');
  let introReady = false;
  let introReadyTimer;
  const enter = () => {
    if (!intro || !introReady || intro.classList.contains('out') || root.classList.contains('entered')) return;
    clearTimeout(introReadyTimer);
    try { sessionStorage.setItem('entered', '1'); } catch (e) {}
    intro.classList.add('out');
    root.classList.remove('locked');
    setTimeout(() => {
      root.classList.add('entered');
      intro.remove();
      start();
    }, 650);
  };

  if (intro && !root.classList.contains('entered')) {
    const enterButton = $('#enter');
    enterButton.disabled = true;
    introReadyTimer = setTimeout(() => {
      introReady = true;
      intro.classList.add('is-ready');
      enterButton.disabled = false;
    }, 1000);
    enterButton.addEventListener('click', enter);
    addEventListener('keydown', (event) => {
      if (event.key === 'Enter') enter();
    });
  } else {
    intro?.remove();
    start();
  }

  /* One accordion item open at a time */
  const det = $$('.acc details');
  det.forEach(d => d.addEventListener('toggle', () => { if (d.open) det.forEach(o => o !== d && (o.open = false)); }));

  /* GitHub projects: list public repos automatically, keep the placeholder if none */
  const repoBox = $('#repos');
  if (repoBox) fetch('https://api.github.com/users/sanju800m/repos?per_page=100&sort=updated')
    .then((r) => r.ok ? r.json() : [])
    .then((list) => {
      const rows = list.filter((r) => !r.fork)
        .sort((a, b) => b.stargazers_count - a.stargazers_count || new Date(b.pushed_at) - new Date(a.pushed_at)).slice(0, 6);
      if (!rows.length) return;
      const esc = (v) => String(v || '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
      repoBox.innerHTML = rows.map((r) => '<a class="repo" href="' + esc(r.html_url) + '" target="_blank" rel="noopener"><h3>' + esc(r.name) +
        '</h3><p>' + esc(r.description || 'No description yet.') + '</p><span class="rmeta">' + esc(r.language || 'Code') + ' · ★ ' + r.stargazers_count + '</span></a>').join('');
    }).catch(() => {});

  /* Contact form: sends the message to Sanjay's email */
  const form = $('#contact-form'), status = $('#status');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    if (fd.get('_honey')) return;
    const emailBody = `Name: ${fd.get('name')}\nEmail: ${fd.get('email')}\n\n${fd.get('message')}`;
    const emailDraft = `mailto:sanju800m@gmail.com?subject=${encodeURIComponent('Portfolio message')}&body=${encodeURIComponent(emailBody)}`;

    if (location.protocol === 'file:') {
      status.className = 'form-status';
      status.textContent = 'A prefilled email draft is opening. Review it and press Send to deliver. ';
      const draftLink = document.createElement('a');
      draftLink.href = emailDraft;
      draftLink.textContent = 'Open draft';
      status.append(draftLink);
      location.href = emailDraft;
      return;
    }

    const btn = form.querySelector('button'), label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Sending...'; status.className = 'form-status'; status.textContent = '';
    try {
      const res = await fetch('https://formsubmit.co/ajax/sanju800m@gmail.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(Object.fromEntries(fd))
      });
      const data = await res.json();
      if (res.ok && String(data.success) === 'true') {
        form.reset(); status.className = 'form-status ok';
        status.textContent = 'Thank you! Your message has been sent. I will reply soon.';
      } else throw new Error(data.message || 'failed');
    } catch (err) {
      console.error('Form error:', err);
      status.className = 'form-status err';
      status.textContent = 'Website delivery is unavailable. ';
      const draftLink = document.createElement('a');
      draftLink.href = emailDraft;
      draftLink.textContent = 'Open a prefilled email draft';
      status.append(draftLink, document.createTextNode(' and press Send.'));
    } finally { btn.disabled = false; btn.textContent = label; }
  });
})();
