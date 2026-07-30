/* Mui3D — Shared site logic */

(function () {
  const nav = document.querySelector('.nav');
  const toggle = document.querySelector('.nav__toggle');
  const links = document.querySelector('.nav__links');
  const dropdown = document.querySelector('.nav__dropdown');
  const dropdownToggle = document.querySelector('.nav__dropdown-toggle');
  const mobileQuery = window.matchMedia('(max-width: 768px)');

  // Apply configurable contact links
  const contactConfig = window.Mui3DConfig?.contact || {};
  document.querySelectorAll('[data-contact]').forEach((link) => {
    const key = link.dataset.contact;
    const url = contactConfig[key];
    if (!url) return;
    link.href = url;
    if (key === 'email') {
      link.removeAttribute('target');
      link.removeAttribute('rel');
    } else {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    }
  });

  // Scroll effect on nav
  window.addEventListener('scroll', () => {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
  });

  // Mobile menu toggle
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('open');
      links.classList.toggle('open');
      if (!links.classList.contains('open') && dropdown) {
        dropdown.classList.remove('open');
        if (dropdownToggle) dropdownToggle.setAttribute('aria-expanded', 'false');
      }
    });

    links.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        toggle.classList.remove('open');
        links.classList.remove('open');
        if (dropdown) {
          dropdown.classList.remove('open');
          if (dropdownToggle) dropdownToggle.setAttribute('aria-expanded', 'false');
        }
      });
    });
  }

  // Contact dropdown (mobile accordion)
  if (dropdown && dropdownToggle) {
    dropdownToggle.addEventListener('click', (e) => {
      if (!mobileQuery.matches) return;
      e.stopPropagation();
      const isOpen = dropdown.classList.toggle('open');
      dropdownToggle.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', (e) => {
      if (!mobileQuery.matches || !dropdown.classList.contains('open')) return;
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
        dropdownToggle.setAttribute('aria-expanded', 'false');
      }
    });

    mobileQuery.addEventListener('change', () => {
      dropdown.classList.remove('open');
      dropdownToggle.setAttribute('aria-expanded', 'false');
    });
  }

  // Active nav link
  const pathname = window.location.pathname;
  const currentPage = pathname.split('/').pop() || 'index.html';
  const isProjectPage = pathname.includes('/projects/');

  document.querySelectorAll('.nav__links > li > a').forEach((link) => {
    const href = link.getAttribute('href');
    const linkPage = href.split('/').pop();
    const isMatch =
      linkPage === currentPage ||
      (currentPage === '' && href === 'index.html') ||
      (isProjectPage && linkPage === 'portfolio.html');
    if (isMatch) link.classList.add('active');
  });

  if (currentPage === 'youtube.html' && dropdownToggle) {
    dropdownToggle.classList.add('active');
    const youtubeLink = dropdown?.querySelector('a[href*="youtube.html"]');
    if (youtubeLink) youtubeLink.classList.add('active');
  }

  // Scroll reveal
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach((el) => observer.observe(el));
  }

  // Portfolio filter
  const filterBtns = document.querySelectorAll('.filter-btn');
  const galleryItems = document.querySelectorAll('.gallery-item');

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;
      galleryItems.forEach((item) => {
        const category = item.dataset.category;
        const show = filter === 'all' || category === filter;
        item.style.display = show ? '' : 'none';
        if (show) {
          item.style.animation = 'fadeUp 0.4s ease both';
        }
      });
    });
  });

  // Contact form
  const form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const original = btn.textContent;
      btn.textContent = 'Message Sent!';
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = original;
        btn.disabled = false;
        form.reset();
      }, 2500);
    });
  }
})();
