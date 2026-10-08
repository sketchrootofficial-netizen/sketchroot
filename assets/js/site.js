/* SketchRoot: navigation behaviour. No dependencies, no tracking.
   Every link in the menus exists in the HTML, so the site is fully crawlable
   and usable with JavaScript switched off. */
(function () {
  var nav = document.querySelector('.nav');
  var btn = document.querySelector('.menu-btn');
  var dds = document.querySelectorAll('.dd');

  function closeDropdowns(except) {
    dds.forEach(function (dd) {
      if (dd === except) return;
      dd.classList.remove('open');
      var b = dd.querySelector('.dd-btn');
      if (b) b.setAttribute('aria-expanded', 'false');
    });
  }

  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  dds.forEach(function (dd) {
    var b = dd.querySelector('.dd-btn');
    if (!b) return;
    b.addEventListener('click', function () {
      var open = dd.classList.toggle('open');
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
      closeDropdowns(dd);
    });
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.dd')) closeDropdowns();
    if (nav && nav.classList.contains('open') && !e.target.closest('.nav')) {
      nav.classList.remove('open');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    closeDropdowns();
    if (nav) nav.classList.remove('open');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  });

  // close the mobile panel after choosing an in page link
  document.querySelectorAll('.navlinks a').forEach(function (a) {
    a.addEventListener('click', function () {
      if (nav) nav.classList.remove('open');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
  });
})();

/* ============================================================
   MICROTILT — subtle 3-D parallax tilt on the hero artwork
   and the wordmark logo.

   Desktop  → tracks the mouse via 'mousemove'.
   Mobile   → reads the gyroscope via 'deviceorientation'.
   Both paths write the same CSS transform so the behaviour
   is visually identical on every device.
   ============================================================ */
(function () {
  'use strict';

  var heroEl = document.querySelector('.hero');
  var artEl  = document.querySelector('.hero-art');
  var markEl = document.querySelector('.brand .mark');
  if (!heroEl || (!artEl && !markEl)) return;

  var MAX_ART  = 5;   /* max tilt degrees on hero artwork */
  var MAX_MARK = 3.5; /* max tilt degrees on nav wordmark */

  /* requestAnimationFrame throttle */
  var rafId    = 0;
  var targetRx = 0, targetRy = 0;

  function setTilt(rx, ry) {
    /* rx, ry are normalised values in the range [-1, 1] */
    targetRx = rx;
    targetRy = ry;
    if (rafId) return;
    rafId = requestAnimationFrame(function () {
      rafId = 0;
      var ax = targetRx * MAX_ART;
      var ay = targetRy * MAX_ART;
      var mx = targetRx * MAX_MARK;
      var my = targetRy * MAX_MARK;
      if (artEl)  artEl.style.transform  = 'rotateX(' + ax + 'deg) rotateY(' + ay + 'deg)';
      if (markEl) markEl.style.transform = 'rotateX(' + mx + 'deg) rotateY(' + my + 'deg)';
    });
  }

  function clearTilt() {
    targetRx = 0; targetRy = 0;
    if (artEl)  artEl.style.transform  = '';
    if (markEl) markEl.style.transform = '';
  }

  /* ----------------------------------------------------------
     DESKTOP — mousemove on the hero section
  ---------------------------------------------------------- */
  if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
    heroEl.addEventListener('mousemove', function (e) {
      var r  = heroEl.getBoundingClientRect();
      /* Normalise cursor to [-1, 1] relative to section centre */
      var rx = -((e.clientY - r.top)  / r.height - 0.5) * 2;
      var ry =  ((e.clientX - r.left) / r.width  - 0.5) * 2;
      /* Soft clamp */
      rx = Math.max(-1, Math.min(1, rx));
      ry = Math.max(-1, Math.min(1, ry));
      setTilt(rx, ry);
    });
    heroEl.addEventListener('mouseleave', clearTilt);
  }

  /* ----------------------------------------------------------
     MOBILE / TABLET — deviceorientation (gyroscope)
     Most Android browsers fire this without a permission prompt.
     iOS 13+ requires an explicit permission request which must
     be triggered from a user gesture.
  ---------------------------------------------------------- */
  var orientationRunning = false;

  function startOrientation() {
    if (orientationRunning) return;
    orientationRunning = true;

    /* Capture a neutral baseline on first reading so the tilt
       is relative to however the user is holding the device.  */
    var baseB = null, baseG = null;

    window.addEventListener('deviceorientation', function (e) {
      /* beta:  front/back tilt  (-180 to 180)
         gamma: left/right tilt  (-90  to  90)  */
      var b = e.beta  || 0;
      var g = e.gamma || 0;

      if (baseB === null) { baseB = b; baseG = g; return; }

      /* Offset from neutral; clamp to ±30° window then normalise */
      var db = b - baseB;
      var dg = g - baseG;

      var rx = -Math.max(-1, Math.min(1, db / 25));
      var ry =  Math.max(-1, Math.min(1, dg / 25));

      /* Dead-zone: when held still let the CSS auto-tilt animation show.
         The inline style set by setTilt() would suppress the CSS animation,
         so we only call setTilt() when there's real physical movement. */
      if (Math.abs(rx) < 0.06 && Math.abs(ry) < 0.06) {
        clearTilt();
      } else {
        setTilt(rx, ry);
      }
    });
  }

  if ('DeviceOrientationEvent' in window) {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      /* iOS 13+ — must be called from a user gesture */
      document.addEventListener('click', function iosHandler() {
        DeviceOrientationEvent.requestPermission()
          .then(function (s) { if (s === 'granted') startOrientation(); })
          .catch(function () {/* silently ignore denied */});
        document.removeEventListener('click', iosHandler);
      }, { once: true });
    } else {
      /* Android and older iOS — no permission needed */
      startOrientation();
    }
  }
}());

/* Early access forms: submit in the background so a failed post never lands the
   visitor on a 404. Without JavaScript the normal Netlify form post still works. */
(function () {
  'use strict';
  if (!window.fetch || !window.FormData) return;
  document.querySelectorAll('form[data-netlify]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"], .btn-amber');
      var note = form.querySelector('.form-error');
      if (note) note.remove();
      if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); }
      var body = new URLSearchParams(new FormData(form)).toString();
      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body
      }).then(function (r) {
        if (!r.ok) throw new Error('status ' + r.status);
        try { sessionStorage.removeItem('sr-early-email'); } catch (err) {}
        window.location.assign('/thanks.html');
      }).catch(function () {
        if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); }
        var p = document.createElement('p');
        p.className = 'form-error';
        p.setAttribute('role', 'alert');
        p.style.cssText = 'margin:.6rem 0 0;font-size:.9rem;color:#8a2b1c;line-height:1.45';
        p.innerHTML = 'We could not save your email just now. Please try again in a minute, or write to <a href="mailto:hello@sketchroot.com?subject=SketchRoot%20early%20access">hello@sketchroot.com</a>.';
        form.appendChild(p);
      });
    });
  });
})();


/* Hero "Get Early Access" box: carry the typed email into the subscribe form.
   The address stays in sessionStorage only, never in the URL. */
(function () {
  'use strict';
  var KEY = 'sr-early-email';
  var hero = document.getElementById('hero-capture');
  var heroEmail = document.getElementById('heroemail');
  var section = document.getElementById('subscribe');
  var email = document.getElementById('email');
  var name = document.getElementById('name');
  if (!hero || !heroEmail || !section || !email) return;

  function store(v) { try { sessionStorage.setItem(KEY, v); } catch (e) {} }
  function load() { try { return sessionStorage.getItem(KEY) || ''; } catch (e) { return ''; } }

  // refresh or return visit: restore what they typed
  var saved = load();
  if (saved && !email.value) email.value = saved;

  hero.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!heroEmail.checkValidity()) { heroEmail.reportValidity(); return; }
    var v = heroEmail.value.trim();
    store(v);
    email.value = v;
    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    section.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#subscribe');
    // the email is done, so land on the first thing still empty
    setTimeout(function () { (name && !name.value ? name : email).focus({ preventScroll: true }); }, calm ? 0 : 500);
  });

  email.addEventListener('input', function () { store(email.value.trim()); });
})();