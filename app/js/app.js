(function () {
  'use strict';

  const guideId = document.body.dataset.guideId || 'warehouse';
  const STORAGE_KEY = 'snowflake-study-done-' + guideId;
  const sectionInputs = document.querySelectorAll('input[name="done"]');
  const SECTION_IDS = Array.from(sectionInputs).map(function (inp) { return inp.value; });

  const sidebar = document.getElementById('sidebar');
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelectorAll('.nav-link');
  const progressBar = document.querySelector('.progress-bar');
  const progressFill = document.getElementById('progress-fill');
  const progressCount = document.getElementById('progress-count');
  const sections = document.querySelectorAll('.section[data-section]');

  // Load saved progress and update UI
  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const done = raw ? JSON.parse(raw) : {};
      SECTION_IDS.forEach(function (id) {
        const input = document.querySelector('input[name="done"][value="' + id + '"]');
        if (input) input.checked = !!done[id];
      });
      updateProgress();
    } catch (e) {}
  }

  function saveProgress() {
    const done = {};
    document.querySelectorAll('input[name="done"]').forEach(function (input) {
      if (input.checked) done[input.value] = true;
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(done));
    } catch (e) {}
    updateProgress();
  }

  function updateProgress() {
    const total = SECTION_IDS.length;
    let completed = 0;
    SECTION_IDS.forEach(function (id) {
      const input = document.querySelector('input[name="done"][value="' + id + '"]');
      if (input && input.checked) completed++;
    });
    const pct = total ? Math.round((completed / total) * 100) : 0;
    if (progressFill) progressFill.style.width = pct + '%';
    if (progressCount) progressCount.textContent = completed + '/' + total + ' sections';
    if (progressBar) progressBar.setAttribute('aria-valuenow', completed);
    navLinks.forEach(function (link) {
      const sectionId = link.getAttribute('data-section');
      const input = sectionId ? document.querySelector('input[name="done"][value="' + sectionId + '"]') : null;
      link.classList.toggle('is-complete', !!(input && input.checked));
    });
  }

  // Mobile sidebar toggle
  if (navToggle && sidebar) {
    navToggle.addEventListener('click', function () {
      const open = sidebar.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', open);
      navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    navLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        if (window.innerWidth <= 768) {
          sidebar.classList.remove('is-open');
          navToggle.setAttribute('aria-expanded', 'false');
          navToggle.setAttribute('aria-label', 'Open menu');
        }
      });
    });
  }

  // Smooth scroll for in-page links
  navLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        const id = href.slice(1);
        const target = document.getElementById(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  // Highlight active section on scroll
  function setActiveSection() {
    const scrollY = window.scrollY;
    let current = null;
    sections.forEach(function (section) {
      const rect = section.getBoundingClientRect();
      const top = rect.top + scrollY;
      const height = section.offsetHeight;
      if (scrollY >= top - 120 && scrollY < top + height - 80) {
        current = section.getAttribute('data-section');
      }
    });
    navLinks.forEach(function (link) {
      const section = link.getAttribute('data-section');
      link.classList.toggle('is-active', section === current);
    });
  }

  window.addEventListener('scroll', function () {
    requestAnimationFrame(setActiveSection);
  });
  setActiveSection();

  // Progress checkboxes: positive reinforcement animation + save + sidebar checkmarks
  document.querySelectorAll('input[name="done"]').forEach(function (input) {
    input.addEventListener('change', function () {
      if (input.checked) {
        var label = input.closest('.section-done');
        if (label) {
          label.classList.add('just-completed');
          window.setTimeout(function () {
            label.classList.remove('just-completed');
          }, 2000);
        }
      }
      saveProgress();
    });
  });

  loadProgress();
})();
