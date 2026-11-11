(() => {
  const filters = document.querySelector('.filter-row');
  const projects = [...document.querySelectorAll('[data-category]')];
  const result = document.querySelector('#filter-result');
  filters.hidden = false;
  filters.addEventListener('click', (event) => {
    const filter = event.target.closest('[data-filter]');
    if (!filter) return;

    for (const option of filters.querySelectorAll('[data-filter]')) {
      option.setAttribute('aria-pressed', String(option === filter));
    }
    for (const project of projects) {
      project.hidden = filter.dataset.filter !== 'all' &&
        filter.dataset.filter !== project.dataset.category;
    }
    const count = projects.filter((project) => !project.hidden).length;
    result.textContent = `Liczba widocznych projektów: ${count}`;
  });
})();
