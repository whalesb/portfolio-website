import './styles.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { SITE } from './config.js';

gsap.registerPlugin(ScrollTrigger);

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const page = document.body.dataset.page;

/* ── Config helpers ─────────────────────────────────────────── */
const bookingHref = SITE.calendly || '/contact.html#book';
const bookingAttrs = SITE.calendly ? 'target="_blank" rel="noopener"' : '';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function socialLinks() {
  const out = [];
  if (SITE.linkedin) out.push(`<a href="${esc(SITE.linkedin)}" target="_blank" rel="noopener">LinkedIn ↗</a>`);
  if (SITE.otherSocial?.url) out.push(`<a href="${esc(SITE.otherSocial.url)}" target="_blank" rel="noopener">${esc(SITE.otherSocial.label)} ↗</a>`);
  return out.join('');
}

/* ── Shared navigation ──────────────────────────────────────── */
const NAV = [
  ['home', '/', 'Home'],
  ['services', '/services.html', 'Services'],
  ['about', '/about.html', 'About'],
  ['guides', '/guides.html', 'Practical Guides'],
];

function renderNav() {
  const links = NAV.map(
    ([key, href, label]) => `<a href="${href}" class="nav__link ${page === key ? 'is-active' : ''}" ${page === key ? 'aria-current="page"' : ''}>${label}</a>`
  ).join('');
  const el = document.createElement('header');
  el.className = 'nav';
  el.innerHTML = `
    <a href="/" class="nav__brand" aria-label="${esc(SITE.name)} — home">
      <span class="nav__mark" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="nav__brand-text"><strong>${esc(SITE.name)}</strong><small>${esc(SITE.role)}</small></span>
    </a>
    <nav class="nav__links" aria-label="Main">${links}</nav>
    <a class="btn btn--primary nav__cta" href="${bookingHref}" ${bookingAttrs}><span>Book a Workflow Call</span></a>
    <button class="nav__toggle" aria-expanded="false" aria-controls="menu" aria-label="Open menu"><span></span><span></span></button>
  `;
  document.body.prepend(el);

  const menu = document.createElement('div');
  menu.className = 'menu';
  menu.id = 'menu';
  menu.setAttribute('aria-hidden', 'true');
  menu.innerHTML = `
    <nav class="menu__links" aria-label="Mobile">
      ${NAV.map(([k, h, l], i) => `<a href="${h}" class="${page === k ? 'is-active' : ''}"><span class="mono">0${i + 1}</span>${l}</a>`).join('')}
      <a href="/contact.html"><span class="mono">05</span>Contact</a>
    </nav>
    <a class="btn btn--primary btn--lg" href="${bookingHref}" ${bookingAttrs}><span>Book a Workflow Call</span></a>
  `;
  document.body.append(menu);

  const toggle = el.querySelector('.nav__toggle');
  toggle.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', !open);
    open ? lenis?.stop() : lenis?.start();
  });

  let last = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    el.classList.toggle('is-scrolled', y > 40);
    el.classList.toggle('is-hidden', y > last && y > 400 && !document.body.classList.contains('menu-open'));
    last = y;
  }, { passive: true });
}

/* ── Shared footer ──────────────────────────────────────────── */
function renderFooter() {
  const f = document.createElement('footer');
  f.className = 'footer';
  const year = new Date().getFullYear();
  f.innerHTML = `
    <div class="footer__top wrap">
      <p class="footer__line" data-split>Less copying between tools. <em>Fewer handoffs to chase.</em></p>
      <p class="footer__sub">AI assistants and workflow automation for agency owners, operations leads, and service businesses.</p>
      <a class="btn btn--primary btn--lg" href="${bookingHref}" ${bookingAttrs}><span>Book a Workflow Call</span></a>
    </div>
    <div class="footer__grid wrap">
      <div>
        <p class="eyebrow">Pages</p>
        <a href="/services.html">Services</a><a href="/about.html">About</a><a href="/guides.html">Practical Guides</a><a href="/contact.html">Contact</a>
        ${SITE.privacyUrl ? `<a href="${esc(SITE.privacyUrl)}">Privacy Policy</a>` : ''}
      </div>
      <div>
        <p class="eyebrow">Contact</p>
        ${SITE.email ? `<a href="mailto:${esc(SITE.email)}">${esc(SITE.email)}</a>` : '<span class="todo">[Business email]</span>'}
        ${socialLinks() || '<span class="todo">[LinkedIn profile]</span>'}
      </div>
      <div class="footer__status">
        <p class="eyebrow">Status</p>
        <p><span class="pulse" aria-hidden="true"></span> Taking on new workflow projects</p>
      </div>
    </div>
    <div class="footer__base wrap">
      <span>© ${year} ${esc(SITE.name)}</span>
      <span class="mono">${esc(SITE.role)}</span>
    </div>
  `;
  document.querySelector('main').after(f);
}

/* ── Fill config-driven bits inside page markup ─────────────── */
function hydrateConfig() {
  document.querySelectorAll('[data-book]').forEach((a) => {
    a.href = bookingHref;
    if (SITE.calendly) {
      a.target = '_blank';
      a.rel = 'noopener';
    }
  });
  document.querySelectorAll('[data-name]').forEach((n) => (n.textContent = SITE.name));
  document.querySelectorAll('[data-email]').forEach((a) => {
    if (SITE.email) {
      a.href = `mailto:${SITE.email}`;
      if (a.dataset.email === 'text') a.textContent = SITE.email;
    } else a.classList.add('is-disabled');
  });
  document.querySelectorAll('[data-socials]').forEach((n) => (n.innerHTML = socialLinks()));
  if (!SITE.showTestimonials) document.querySelectorAll('[data-testimonials]').forEach((s) => s.remove());
}

/* ── Photo frames: show the real photo when it exists ───────── */
function initFrames() {
  document.querySelectorAll('.frame[data-src]').forEach((fr) => {
    const img = new Image();
    img.alt = fr.dataset.alt || '';
    // (no loading="lazy" here: a lazy image that isn't on the page yet never loads)
    img.decoding = 'async';
    if (fr.dataset.pos) img.style.objectPosition = fr.dataset.pos;
    img.onload = () => {
      fr.classList.add('has-photo');
      fr.prepend(img);
    };
    img.src = fr.dataset.src;
  });
}

/* ── Text splitting ─────────────────────────────────────────── */
function splitWords(el) {
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) frag.append(document.createTextNode(' '));
          else {
            const w = document.createElement('span');
            w.className = 'w';
            w.innerHTML = `<span class="wi">${esc(part)}</span>`;
            frag.append(w);
          }
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1 && !child.classList.contains('w')) walk(child);
    });
  };
  walk(el);
  return el.querySelectorAll('.wi');
}

/* ── Animations ─────────────────────────────────────────────── */
// Anything already visible when the page loads animates straight away,
// instead of waiting for a scroll trigger that may never fire.
const onScreen = (el) => window.scrollY < 10 && el.getBoundingClientRect().top < window.innerHeight;

function initAnimations() {
  if (reducedMotion) {
    document.documentElement.classList.add('no-motion');
    return;
  }

  // Headlines rise out of a mask, word by word
  document.querySelectorAll('[data-split]').forEach((el) => {
    const words = splitWords(el);
    gsap.from(words, {
      yPercent: 110,
      rotate: 4,
      duration: 1.1,
      ease: 'expo.out',
      stagger: 0.035,
      scrollTrigger: onScreen(el) ? undefined : { trigger: el, start: 'top 85%' },
    });
  });

  // Long-form lines that light up as you read (Nowak / Mahesh style)
  document.querySelectorAll('[data-scrub]').forEach((el) => {
    const words = splitWords(el);
    el.classList.add('is-scrub');
    gsap.fromTo(
      words,
      { opacity: 0.14 },
      {
        opacity: 1,
        stagger: 0.08,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 78%', end: 'bottom 45%', scrub: true },
      }
    );
  });

  document.querySelectorAll('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      y: 40,
      opacity: 0,
      duration: 1.1,
      ease: 'power3.out',
      delay: parseFloat(el.dataset.reveal) || 0,
      scrollTrigger: onScreen(el) ? undefined : { trigger: el, start: 'top 88%' },
    });
  });

  document.querySelectorAll('[data-stagger]').forEach((group) => {
    gsap.from(group.children, {
      y: 50,
      opacity: 0,
      duration: 1,
      ease: 'power3.out',
      stagger: 0.12,
      scrollTrigger: onScreen(group) ? undefined : { trigger: group, start: 'top 82%' },
    });
  });

  // Frames open like a shutter
  document.querySelectorAll('.frame').forEach((fr) => {
    gsap.from(fr, {
      clipPath: 'inset(18% 18% 18% 18% round 28px)',
      duration: 1.5,
      ease: 'expo.out',
      scrollTrigger: { trigger: fr, start: 'top 85%' },
    });
  });

  // Process: horizontal pinned track on wide screens
  const track = document.querySelector('[data-hscroll]');
  if (track) {
    ScrollTrigger.matchMedia({
      '(min-width: 900px)': () => {
        const section = track.closest('section');
        const dist = () => track.scrollWidth - window.innerWidth + 64;
        const tween = gsap.to(track, {
          x: () => -dist(),
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: () => '+=' + dist(),
            pin: true,
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        });
        const bar = section.querySelector('.hscroll__bar i');
        if (bar) gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: section, start: 'top top', end: () => '+=' + dist(), scrub: true } });
        return () => tween.kill();
      },
    });
  }

  // Huge numerals drift slower than the page
  document.querySelectorAll('[data-parallax]').forEach((el) => {
    gsap.to(el, {
      yPercent: parseFloat(el.dataset.parallax) || -30,
      ease: 'none',
      scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
}

/* ── Card tilt ──────────────────────────────────────────────── */
function initTilt() {
  if (!finePointer || reducedMotion) return;
  document.querySelectorAll('[data-tilt]').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty('--mx', `${(x + 0.5) * 100}%`);
      card.style.setProperty('--my', `${(y + 0.5) * 100}%`);
      gsap.to(card, { rotateY: x * 8, rotateX: -y * 8, duration: 0.6, ease: 'power3.out' });
    });
    card.addEventListener('pointerleave', () => gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.9, ease: 'elastic.out(1, 0.5)' }));
  });
}

/* ── Cursor ─────────────────────────────────────────────────── */
function initCursor() {
  if (!finePointer || reducedMotion) return;
  const c = document.createElement('div');
  c.className = 'cursor';
  c.innerHTML = '<i></i><span></span>';
  document.body.append(c);
  const ring = c.querySelector('span');
  const dot = c.querySelector('i');
  const xr = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' });
  const yr = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
  window.addEventListener('pointermove', (e) => {
    gsap.set(dot, { x: e.clientX, y: e.clientY });
    xr(e.clientX);
    yr(e.clientY);
  });
  document.addEventListener('pointerover', (e) => {
    c.classList.toggle('is-hover', !!e.target.closest('a, button, [data-tilt], input, select, textarea'));
  });
}

/* ── Magnetic buttons ───────────────────────────────────────── */
function initMagnetic() {
  if (!finePointer || reducedMotion) return;
  document.querySelectorAll('.btn--primary, .cta-orb').forEach((b) => {
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * 0.25, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.5, ease: 'power3.out' });
    });
    b.addEventListener('pointerleave', () => gsap.to(b, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.4)' }));
  });
}

/* ── Contact form (Netlify Forms) ───────────────────────────── */
function initForm() {
  const form = document.querySelector('form[data-workflow-form]');
  if (!form) return;
  const status = form.querySelector('.form__status');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    form.classList.add('is-sending');
    try {
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString(),
      });
      if (!res.ok) throw new Error(res.status);
      form.reset();
      status.className = 'form__status is-ok';
      status.textContent = "Thanks, your message is on its way. I'll review what you've shared and reply by email.";
    } catch {
      status.className = 'form__status is-err';
      status.innerHTML = `Your message didn't go through. Please try again, or email ${SITE.email ? `<a href="mailto:${esc(SITE.email)}">${esc(SITE.email)}</a>` : '[Business email]'}.`;
    } finally {
      btn.disabled = false;
      form.classList.remove('is-sending');
    }
  });
}

/* ── Calendly embed ─────────────────────────────────────────── */
function initCalendly() {
  const slot = document.querySelector('[data-calendly]');
  if (!slot) return;
  if (!SITE.calendly) {
    slot.remove();
    return;
  }
  slot.innerHTML = `<iframe title="Book a Workflow Call" src="${esc(SITE.calendly)}?hide_gdpr_banner=1&background_color=0d1014&text_color=edeae3&primary_color=7fe9ff" loading="lazy"></iframe>`;
  slot.hidden = false;
}

/* ── Loader ─────────────────────────────────────────────────── */
function runLoader() {
  const l = document.querySelector('.loader');
  if (!l) return Promise.resolve();
  if (reducedMotion || sessionStorageGet('seen-loader')) {
    l.remove();
    return Promise.resolve();
  }
  sessionStorageSet('seen-loader', '1');
  const num = l.querySelector('.loader__num');
  const steps = l.querySelectorAll('.loader__steps li');
  const o = { v: 0 };
  return new Promise((resolve) => {
    gsap
      .timeline({ onComplete: resolve })
      .to(o, {
        v: 100,
        duration: 1.9,
        ease: 'power2.inOut',
        onUpdate: () => {
          num.textContent = String(Math.round(o.v)).padStart(3, '0');
          steps.forEach((s, i) => s.classList.toggle('is-done', o.v > (i + 1) * 30));
        },
      })
      .to(l, { clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'expo.inOut' }, '+=0.15')
      .add(() => l.remove());
  });
}
function sessionStorageGet(k) {
  try {
    return sessionStorage.getItem(k);
  } catch {
    return null;
  }
}
function sessionStorageSet(k, v) {
  try {
    sessionStorage.setItem(k, v);
  } catch {}
}

/* ── 3D world wiring ────────────────────────────────────────── */
async function initWorld() {
  const canvas = document.querySelector('canvas.webgl');
  if (!canvas) return;
  let api;
  try {
    // panel labels are drawn on canvas, so wait for the font first
    await Promise.race([document.fonts.load('700 28px Urbanist'), new Promise((r) => setTimeout(r, 1500))]).catch(() => {});
    const { initScene } = await import('./scene.js');
    api = initScene(canvas, { reducedMotion });
  } catch (err) {
    console.warn('3D scene unavailable, continuing without it.', err);
    canvas.remove();
    document.documentElement.classList.add('no-webgl');
    return;
  }
  const sections = [...document.querySelectorAll('[data-scene]')];
  const parse = (el) => {
    try {
      return JSON.parse(el.dataset.scene);
    } catch {
      return {};
    }
  };
  if (sections[0]) api.set(parse(sections[0]));
  sections.forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle: (self) => self.isActive && api.to(parse(sec)),
    });
  });
  // fade the world back a little behind long text
  const veil = document.querySelector('.veil');
  if (veil)
    document.querySelectorAll('[data-veil]').forEach((sec) => {
      ScrollTrigger.create({
        trigger: sec,
        start: 'top 60%',
        end: 'bottom 40%',
        onToggle: (self) => gsap.to(veil, { opacity: self.isActive ? parseFloat(sec.dataset.veil) || 0.6 : 0, duration: 0.9 }),
      });
    });
}

/* ── Boot ───────────────────────────────────────────────────── */
let lenis = null;
renderNav();
renderFooter();
hydrateConfig();
initFrames();
initCalendly();
initForm();

if (!reducedMotion) {
  lenis = new Lenis({ duration: 1.15, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  document.querySelectorAll('a[href^="#"]').forEach((a) =>
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        lenis.scrollTo(target, { offset: -40 });
      }
    })
  );
}

initWorld();
runLoader().then(() => {
  document.documentElement.classList.add('is-ready');
  initAnimations();
  initTilt();
  initCursor();
  initMagnetic();
  ScrollTrigger.refresh();
});
