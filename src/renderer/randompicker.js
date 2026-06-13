/**
 * @file randompicker.js
 * @description Random Picker tool — assigns shuffled choices to a list of names.
 * Supports "multi-slot" mode where choices can recur (e.g., months → multiple people per month).
 */

(function () {
  'use strict';

  let _initialized = false;

  // ─── Preset palette for pill colours ─────────────────────────────────────
  const PILL_COLORS = [
    { bg: '#dce8e0', text: '#2d5a40', border: '#b5d4be' },
    { bg: '#dde5f0', text: '#2a3f6b', border: '#b3c5e0' },
    { bg: '#f0e5d8', text: '#6b3e1a', border: '#e0c8a8' },
    { bg: '#e8ddf0', text: '#4a2a6b', border: '#cdb3e0' },
    { bg: '#f0dde0', text: '#6b2a30', border: '#e0b3b8' },
    { bg: '#ddf0ea', text: '#1a6b52', border: '#a8e0ce' },
    { bg: '#f0f0dd', text: '#5a5a1a', border: '#d8d8a8' },
    { bg: '#ddeaf0', text: '#1a4a6b', border: '#a8cce0' },
    { bg: '#f0e8dd', text: '#6b4a1a', border: '#e0caa8' },
    { bg: '#e8f0dd', text: '#3a6b1a', border: '#c0e0a8' },
    { bg: '#f0ddee', text: '#6b1a60', border: '#e0a8d8' },
    { bg: '#ddf0f0', text: '#1a5a6b', border: '#a8d8e0' },
  ];

  // Map choice label → stable colour index
  const choiceColorMap = new Map();

  function getChoiceColor(label) {
    if (!choiceColorMap.has(label)) {
      choiceColorMap.set(label, choiceColorMap.size % PILL_COLORS.length);
    }
    return PILL_COLORS[choiceColorMap.get(label)];
  }

  // ─── Fisher-Yates shuffle ────────────────────────────────────────────────
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ─── Parse comma/newline separated input → trimmed non-empty strings ─────
  function parseList(raw) {
    return raw.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
  }

  // ─── Build the assignment map ─────────────────────────────────────────────
  /**
   * Assigns choices to names.
   *
   * Multi-slot mode (choices < names OR allow repeats checked):
   *   Each choice can appear multiple times. We distribute slots so that
   *   each choice gets at least floor(names/choices) slots, with the
   *   remainder distributed randomly. Then shuffle and zip.
   *
   * Single-slot mode (choices >= names):
   *   We shuffle choices and pair 1-to-1 with each name.
   */
  function buildAssignments(names, choices, multiSlot) {
    if (!names.length || !choices.length) return [];

    if (multiSlot || choices.length < names.length) {
      // Build a pool: distribute choices across name-count slots
      const n = names.length;
      const c = choices.length;
      const base = Math.floor(n / c);
      const extra = n % c;

      let pool = [];
      choices.forEach((ch, idx) => {
        const count = base + (idx < extra ? 1 : 0);
        for (let i = 0; i < count; i++) pool.push(ch);
      });

      pool = shuffle(pool);
      const shuffledNames = shuffle(names);
      return shuffledNames.map((name, i) => ({ name, choice: pool[i] }));
    } else {
      // More choices than names → pick a random subset, shuffle it
      const subset = shuffle(choices).slice(0, names.length);
      const shuffledNames = shuffle(names);
      return shuffledNames.map((name, i) => ({ name, choice: subset[i] }));
    }
  }

  // ─── Render results ───────────────────────────────────────────────────────
  function renderResults(assignments, choices) {
    const container = document.getElementById('rp-results-container');
    const section = document.getElementById('rp-results-section');
    container.innerHTML = '';
    section.style.display = 'block';

    // Group by choice for the summary view
    const byChoice = new Map();
    choices.forEach(ch => byChoice.set(ch, []));
    assignments.forEach(({ name, choice }) => {
      if (!byChoice.has(choice)) byChoice.set(choice, []);
      byChoice.get(choice).push(name);
    });

    // Determine display mode
    const viewMode = document.querySelector('input[name="rp-view"]:checked')?.value || 'grouped';

    if (viewMode === 'grouped') {
      renderGrouped(container, byChoice);
    } else {
      renderList(container, assignments);
    }

    // Animate cards in
    requestAnimationFrame(() => {
      container.querySelectorAll('.rp-card').forEach((el, i) => {
        el.style.animationDelay = `${i * 40}ms`;
        el.classList.add('rp-card-enter');
      });
    });
  }

  function renderGrouped(container, byChoice) {
    byChoice.forEach((names, choice) => {
      const color = getChoiceColor(choice);
      const card = document.createElement('div');
      card.className = 'rp-card';
      card.style.cssText = `
        background: ${color.bg};
        border: 1.5px solid ${color.border};
      `;

      const namesHtml = names.map(n =>
        `<span class="rp-name-tag">${escHtml(n)}</span>`
      ).join('');

      card.innerHTML = `
        <div class="rp-card-header">
          <span class="rp-choice-label" style="color:${color.text}">${escHtml(choice)}</span>
          <span class="rp-badge" style="background:${color.border};color:${color.text}">${names.length}</span>
        </div>
        <div class="rp-name-tags">${namesHtml || '<em class="rp-empty">—</em>'}</div>
      `;
      container.appendChild(card);
    });
  }

  function renderList(container, assignments) {
    const table = document.createElement('div');
    table.className = 'rp-list-table';

    assignments.forEach(({ name, choice }) => {
      const color = getChoiceColor(choice);
      const row = document.createElement('div');
      row.className = 'rp-card rp-list-row';

      row.innerHTML = `
        <span class="rp-list-name">${escHtml(name)}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          style="color:var(--text-tertiary);flex-shrink:0">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        <span class="rp-choice-pill" style="background:${color.bg};border-color:${color.border};color:${color.text}">
          ${escHtml(choice)}
        </span>
      `;
      table.appendChild(row);
    });

    container.appendChild(table);
  }

  function escHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ─── Validate inputs ──────────────────────────────────────────────────────
  function validate() {
    const namesRaw = document.getElementById('rp-names-input').value;
    const choicesRaw = document.getElementById('rp-choices-input').value;
    const names = parseList(namesRaw);
    const choices = parseList(choicesRaw);
    const errEl = document.getElementById('rp-error');
    const shuffleBtn = document.getElementById('rp-shuffle-btn');

    errEl.textContent = '';
    errEl.style.display = 'none';

    if (!names.length || !choices.length) {
      shuffleBtn.disabled = true;
      return false;
    }

    shuffleBtn.disabled = false;
    return { names, choices };
  }

  // ─── Update live counters ─────────────────────────────────────────────────
  function updateCounters() {
    const namesRaw = document.getElementById('rp-names-input').value;
    const choicesRaw = document.getElementById('rp-choices-input').value;
    const names = parseList(namesRaw);
    const choices = parseList(choicesRaw);

    document.getElementById('rp-names-count').textContent =
      names.length ? `${names.length} name${names.length !== 1 ? 's' : ''}` : '';
    document.getElementById('rp-choices-count').textContent =
      choices.length ? `${choices.length} choice${choices.length !== 1 ? 's' : ''}` : '';

    // Show multi-slot hint
    const hint = document.getElementById('rp-multislot-hint');
    if (choices.length && names.length && names.length > choices.length) {
      hint.style.display = 'flex';
      hint.querySelector('span').textContent =
        `More names than choices — each choice may be assigned to multiple names.`;
    } else {
      hint.style.display = 'none';
    }

    validate();
  }

  // ─── Countdown overlay ───────────────────────────────────────────────────
  const COUNTDOWN_SECONDS = 5;
  const CIRCUMFERENCE = 2 * Math.PI * 52; // matches r="52" in SVG

  /**
   * Shows the countdown overlay and returns a Promise that resolves when
   * the countdown finishes OR the user clicks Skip.
   */
  function showCountdown() {
    return new Promise(resolve => {
      const overlay   = document.getElementById('rp-countdown-overlay');
      const numberEl  = document.getElementById('rp-cd-number');
      const ringFill  = document.getElementById('rp-cd-ring-fill');
      const skipBtn   = document.getElementById('rp-cd-skip');

      let remaining = COUNTDOWN_SECONDS;
      let intervalId = null;
      let done = false;

      function finish() {
        if (done) return;
        done = true;
        clearInterval(intervalId);
        // Fade out
        overlay.style.transition = 'opacity 0.3s ease';
        overlay.style.opacity = '0';
        setTimeout(() => {
          overlay.classList.remove('rp-cd-active');
          overlay.style.transition = '';
          overlay.style.opacity = '';
          resolve();
        }, 300);
      }

      function setNumber(n) {
        numberEl.textContent = n;
        // Retrigger animation by removing/re-adding class
        numberEl.classList.remove('rp-cd-tick');
        void numberEl.offsetWidth; // force reflow
        numberEl.classList.add('rp-cd-tick');
      }

      function setRing(n) {
        // Full at COUNTDOWN_SECONDS, empty at 0
        // We animate continuously within each second via CSS transition
        const fraction = n / COUNTDOWN_SECONDS;
        ringFill.style.strokeDashoffset = CIRCUMFERENCE * (1 - fraction);
      }

      // Show overlay first so the element is painted before we start transitions
      overlay.classList.add('rp-cd-active');

      // Initial state
      setNumber(remaining);
      ringFill.style.transition = 'none';
      ringFill.style.strokeDashoffset = '0'; // full ring
      void ringFill.offsetWidth; // force reflow with element now visible
      // Kick off the ring shrink for the full countdown duration
      ringFill.style.transition = `stroke-dashoffset ${COUNTDOWN_SECONDS}s linear`;
      ringFill.style.strokeDashoffset = CIRCUMFERENCE;

      // Skip button
      const onSkip = () => finish();
      skipBtn.addEventListener('click', onSkip, { once: true });

      // Tick every second
      intervalId = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
          setNumber(0);
          setRing(0);
          setTimeout(finish, 200);
        } else {
          setNumber(remaining);
        }
      }, 1000);
    });
  }

  async function doShuffle(skipCountdown = false) {
    const parsed = validate();
    if (!parsed) return;

    const { names, choices } = parsed;
    choiceColorMap.clear(); // fresh colour mapping each run
    choices.forEach((_, i) => choiceColorMap.set(choices[i], i % PILL_COLORS.length));

    const assignments = buildAssignments(names, choices, false);

    const countdownEnabled = !skipCountdown && document.getElementById('rp-countdown-checkbox')?.checked !== false;
    if (countdownEnabled) {
      await showCountdown();
    }

    renderResults(assignments, choices);

    // Scroll to results
    document.getElementById('rp-results-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ─── Quick presets ────────────────────────────────────────────────────────
  const PRESETS = [
    { label: 'Months', value: 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec' },
    { label: 'Days', value: 'Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday' },
    { label: 'Colours', value: 'Red,Green,Blue,Yellow,Orange,Purple,Pink,Brown' },
    { label: 'Teams', value: 'Team A,Team B,Team C,Team D' },
    { label: 'Quarters', value: 'Q1,Q2,Q3,Q4' },
  ];

  function buildPresetButtons() {
    const wrap = document.getElementById('rp-presets');
    wrap.innerHTML = '';
    PRESETS.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'rp-preset-btn';
      btn.textContent = p.label;
      btn.title = p.value;
      btn.addEventListener('click', () => {
        document.getElementById('rp-choices-input').value = p.value;
        updateCounters();
      });
      wrap.appendChild(btn);
    });
  }

  // ─── Clear ────────────────────────────────────────────────────────────────
  function clearAll() {
    document.getElementById('rp-names-input').value = '';
    document.getElementById('rp-choices-input').value = '';
    document.getElementById('rp-results-section').style.display = 'none';
    document.getElementById('rp-results-container').innerHTML = '';
    document.getElementById('rp-error').style.display = 'none';
    updateCounters();
    document.getElementById('rp-names-input').focus();
  }

  // ─── Copy results as text ─────────────────────────────────────────────────
  function copyResults() {
    const cards = document.querySelectorAll('#rp-results-container .rp-card');
    const viewMode = document.querySelector('input[name="rp-view"]:checked')?.value || 'grouped';
    let text = '';

    if (viewMode === 'grouped') {
      cards.forEach(card => {
        const choice = card.querySelector('.rp-choice-label')?.textContent?.trim() || '';
        const names = [...card.querySelectorAll('.rp-name-tag')].map(el => el.textContent.trim());
        text += `${choice}: ${names.join(', ')}\n`;
      });
    } else {
      cards.forEach(row => {
        const name = row.querySelector('.rp-list-name')?.textContent?.trim() || '';
        const choice = row.querySelector('.rp-choice-pill')?.textContent?.trim() || '';
        text += `${name} → ${choice}\n`;
      });
    }

    if (!text) return;
    navigator.clipboard.writeText(text.trim()).then(() => {
      showToast('Results copied to clipboard!');
    }).catch(() => {
      showToast('Copy failed — please select and copy manually.');
    });
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  window.initRandomPicker = function () {
    if (_initialized) {
      updateCounters();
      return;
    }
    _initialized = true;

    buildPresetButtons();

    const namesInput = document.getElementById('rp-names-input');
    const choicesInput = document.getElementById('rp-choices-input');

    namesInput.addEventListener('input', updateCounters);
    choicesInput.addEventListener('input', updateCounters);

    document.getElementById('rp-shuffle-btn').addEventListener('click', () => doShuffle());
    document.getElementById('rp-clear-btn').addEventListener('click', clearAll);
    document.getElementById('rp-copy-btn').addEventListener('click', copyResults);

    document.querySelectorAll('input[name="rp-view"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const section = document.getElementById('rp-results-section');
        if (section.style.display !== 'none') doShuffle(true); // skip countdown on view toggle
      });
    });

    updateCounters();
  };

})();