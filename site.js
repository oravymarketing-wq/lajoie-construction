(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cleanups = [];

  // Menu mobile
  const mb = $('.menu-btn'), nav = $('#nav');
  if (mb && nav) {
    const close = () => { nav.classList.remove('is-open'); mb.setAttribute('aria-expanded', 'false'); };
    mb.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      mb.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    $$('a', nav).forEach(a => a.addEventListener('click', close));
  }

  // Cordeau qui claque + révélations
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add(en.target.classList.contains('cordeau') ? 'is-snapped' : 'is-in');
      io.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -12% 0px' });
  $$('.cordeau, .reveal').forEach(el => io.observe(el));
  cleanups.push(() => io.disconnect());

  // Scène : la maison qui grandit
  const house = $('.grandir .house');
  if (house) {
    const steps = $$('.grandir .step');
    const label = $('.grandir [data-label]'), count = $('.grandir [data-count]');
    const set = i => {
      house.dataset.step = i;
      steps.forEach(s => s.classList.toggle('is-active', s.dataset.step === String(i)));
      if (label) label.textContent = steps[i].dataset.label;
      if (count) count.textContent = `0${i} / 04`;
    };
    if (reduced) {
      house.dataset.step = '4';
      steps.forEach(s => s.classList.add('is-active'));
      if (label) label.textContent = 'Toutes les étapes';
      if (count) count.textContent = '04 / 04';
    } else {
      const so = new IntersectionObserver(entries => {
        entries.forEach(en => { if (en.isIntersecting) set(Number(en.target.dataset.step)); });
      }, { rootMargin: '-48% 0px -48% 0px' });
      steps.forEach(s => so.observe(s));
      cleanups.push(() => so.disconnect());
    }
  }

  // Réalisations : filtres + visionneuse
  const gal = $('.gallery');
  if (gal) {
    const items = $$('li', gal);
    const btns = $$('[data-filter]');
    const live = $('[data-count-live]');
    const apply = f => {
      btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === f)));
      let n = 0;
      items.forEach(li => { const show = f === 'tout' || li.dataset.cat === f; li.hidden = !show; if (show) n++; });
      if (live) live.textContent = `${n} photo${n > 1 ? 's' : ''} affichée${n > 1 ? 's' : ''}`;
    };
    btns.forEach(b => b.addEventListener('click', () => {
      apply(b.dataset.filter);
      history.replaceState(null, '', b.dataset.filter === 'tout' ? location.pathname : '#' + b.dataset.filter);
    }));
    const hash = location.hash.slice(1);
    if (btns.some(b => b.dataset.filter === hash)) apply(hash);

    const dlg = $('.lightbox');
    if (dlg && typeof dlg.showModal === 'function') {
      const im = $('img', dlg), cap = $('[data-lb-cap]', dlg);
      let cur = 0, opener = null;
      const visible = () => items.filter(li => !li.hidden).map(li => $('.g-btn', li));
      const show = btn => {
        const v = visible(); cur = v.indexOf(btn);
        im.src = btn.dataset.full; im.alt = $('img', btn).alt; cap.textContent = btn.dataset.caption;
      };
      $$('.g-btn', gal).forEach(b => b.addEventListener('click', () => { opener = b; show(b); dlg.showModal(); }));
      const step = d => { const v = visible(); show(v[(cur + d + v.length) % v.length]); };
      $('[data-lb="prev"]', dlg).addEventListener('click', () => step(-1));
      $('[data-lb="next"]', dlg).addEventListener('click', () => step(1));
      $('[data-lb="close"]', dlg).addEventListener('click', () => dlg.close());
      dlg.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1); });
      dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
      dlg.addEventListener('close', () => { if (opener) opener.focus(); });
    } else {
      $$('.g-btn', gal).forEach(b => b.addEventListener('click', () => { location.href = b.dataset.full; }));
    }
  }

  // Formulaire de soumission
  const form = $('#soumission');
  if (form) {
    const params = new URLSearchParams(location.search);
    if (params.get('type') === 'commercial') form.querySelector('input[value="Commercial"]').checked = true;

    const rules = {
      description: v => v.trim().length >= 15 || 'Ajoutez quelques mots sur le projet (15 caractères minimum).',
      nom: v => v.trim().length >= 2 || 'Indiquez votre nom.',
      tel: v => v.replace(/\D/g, '').length >= 10 || 'Entrez un numéro à 10 chiffres.',
      courriel: v => !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'Ce courriel ne semble pas valide.',
    };
    const check = (name, show) => {
      const input = form.elements[name];
      const res = rules[name](input.value);
      const field = input.closest('.field');
      const err = $('.err', field);
      if (res === true) { field.removeAttribute('data-invalid'); input.removeAttribute('aria-invalid'); err.textContent = ''; return true; }
      if (show) { field.setAttribute('data-invalid', ''); input.setAttribute('aria-invalid', 'true'); err.textContent = res; }
      return false;
    };
    // Validation pendant la saisie (jamais au « blur » : le message qui disparaît fait sauter le bouton)
    Object.keys(rules).forEach(n => form.elements[n].addEventListener('input', () => {
      if (form.elements[n].closest('.field').hasAttribute('data-invalid')) check(n, true);
    }));

    const ok = $('[data-status="ok"]', form), ko = $('[data-status="err"]', form);
    const submit = $('button[type="submit"]', form);

    const summary = () => {
      const fd = new FormData(form);
      const travaux = fd.getAll('travaux');
      return [
        `Type de projet : ${fd.get('type')}`,
        `Travaux : ${travaux.length ? travaux.join(', ') : 'non précisé'}`,
        `Ville : ${fd.get('ville') || 'non précisée'}`,
        `Début souhaité : ${fd.get('delai')}`,
        '',
        'Description :',
        fd.get('description').trim(),
        '',
        `Nom : ${fd.get('nom').trim()}`,
        `Téléphone : ${fd.get('tel').trim()}`,
        `Courriel : ${fd.get('courriel').trim() || 'non fourni'}`,
      ].join('\n');
    };

    form.addEventListener('submit', async e => {
      e.preventDefault();
      ok.hidden = true; ko.hidden = true;
      const bad = Object.keys(rules).filter(n => !check(n, true));
      if (bad.length) { form.elements[bad[0]].focus(); return; }

      submit.setAttribute('aria-busy', 'true'); submit.disabled = true;
      const text = summary();
      const endpoint = form.dataset.endpoint;
      try {
        if (endpoint) {
          const r = await fetch(endpoint, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) });
          if (!r.ok) throw new Error('HTTP ' + r.status);
          $('[data-ok-msg]', ok).textContent = 'Merci! Votre demande est envoyée. Lajoie Construction vous rappelle.';
          $('[data-mailto-link]', ok).hidden = true;
        } else {
          const subj = `Demande de soumission – ${form.elements.nom.value.trim()}`;
          const href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(text)}`;
          $('[data-mailto-link]', ok).href = href;
          window.location.href = href;
        }
        $('[data-summary]', ok).textContent = text;
        ok.hidden = false; ok.focus();
      } catch (err) {
        ko.hidden = false; ko.focus();
      } finally {
        submit.removeAttribute('aria-busy'); submit.disabled = false;
      }
    });

    $('[data-copy]', form).addEventListener('click', async ev => {
      const b = ev.currentTarget;
      try { await navigator.clipboard.writeText($('[data-summary]', form).textContent); b.textContent = 'Copié'; }
      catch { b.textContent = 'Sélectionnez le texte ci-dessus'; }
    });
  }

  addEventListener('pagehide', () => cleanups.forEach(f => f()));
})();
