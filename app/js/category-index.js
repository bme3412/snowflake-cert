/**
 * Category index: show "You are here" and per-guide completion rates from localStorage.
 * Requires each guide link/card to have data-guide-id and data-sections.
 */
(function () {
  'use strict';

  const STORAGE_PREFIX = 'snowflake-study-done-';

  function getProgress(guideId) {
    try {
      var raw = localStorage.getItem(STORAGE_PREFIX + guideId);
      var done = raw ? JSON.parse(raw) : {};
      return Object.keys(done).length;
    } catch (e) {
      return 0;
    }
  }

  function renderCategoryProgress() {
    var items = document.querySelectorAll('[data-guide-id][data-sections]');
    items.forEach(function (el) {
      var guideId = el.getAttribute('data-guide-id');
      var total = parseInt(el.getAttribute('data-sections'), 10) || 0;
      var completed = getProgress(guideId);
      var existing = el.querySelector('.guide-completion');
      if (existing) existing.remove();
      var span = document.createElement('span');
      span.className = 'guide-completion';
      span.setAttribute('aria-label', 'Progress: ' + completed + ' of ' + total + ' sections');
      if (total > 0) {
        var pct = Math.round((completed / total) * 100);
        span.textContent = completed + '/' + total + (pct === 100 ? ' ✓' : '');
        span.classList.toggle('is-complete', pct === 100);
      }
      var target = el.querySelector('.guide-card-body') || el;
      target.appendChild(span);
    });
  }

  renderCategoryProgress();
})();
