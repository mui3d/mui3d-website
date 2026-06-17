/* Mui3D — Reusable project image gallery */

(function () {
  const data = window.ProjectGalleryData;
  const container = document.getElementById('project-gallery');
  if (!container || !data?.images?.length) return;

  const basePath = data.basePath || '../assets/images/';
  const TRANSITION_MS = 250;
  let currentIndex = 0;
  let isTransitioning = false;

  container.innerHTML = `
    <div class="project-gallery__viewer">
      <div class="project-gallery__stage">
        <img class="project-gallery__main" src="" alt="" width="1600" height="1000">
        <button type="button" class="project-gallery__nav project-gallery__nav--prev" aria-label="Previous image">◀</button>
        <button type="button" class="project-gallery__nav project-gallery__nav--next" aria-label="Next image">▶</button>
        <div class="project-gallery__overlay" aria-hidden="true">
          <h3 class="project-gallery__overlay-title"></h3>
          <p class="project-gallery__overlay-desc"></p>
        </div>
      </div>
      <div class="project-gallery__mobile-caption">
        <h3 class="project-gallery__mobile-title"></h3>
        <p class="project-gallery__mobile-desc"></p>
      </div>
      <div class="project-gallery__thumbs" role="tablist" aria-label="Project images"></div>
    </div>
  `;

  const mainImg = container.querySelector('.project-gallery__main');
  const overlayTitle = container.querySelector('.project-gallery__overlay-title');
  const overlayDesc = container.querySelector('.project-gallery__overlay-desc');
  const mobileTitle = container.querySelector('.project-gallery__mobile-title');
  const mobileDesc = container.querySelector('.project-gallery__mobile-desc');
  const thumbsContainer = container.querySelector('.project-gallery__thumbs');
  const prevBtn = container.querySelector('.project-gallery__nav--prev');
  const nextBtn = container.querySelector('.project-gallery__nav--next');

  data.images.forEach((item, index) => {
    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = 'project-gallery__thumb' + (index === 0 ? ' active' : '');
    thumb.setAttribute('role', 'tab');
    thumb.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
    thumb.setAttribute('aria-label', item.title);
    thumb.innerHTML = `<img src="${basePath}${item.image}" alt="" loading="lazy">`;
    thumb.addEventListener('click', () => goTo(index));
    thumbsContainer.appendChild(thumb);
  });

  const thumbs = container.querySelectorAll('.project-gallery__thumb');

  function normalizeIndex(index) {
    const len = data.images.length;
    return ((index % len) + len) % len;
  }

  function updateCaption(index) {
    const item = data.images[index];
    overlayTitle.textContent = item.title;
    overlayDesc.textContent = item.description;
    mobileTitle.textContent = item.title;
    mobileDesc.textContent = item.description;
    mainImg.alt = item.title;

    thumbs.forEach((thumb, i) => {
      const active = i === index;
      thumb.classList.toggle('active', active);
      thumb.setAttribute('aria-selected', String(active));
      if (active) {
        thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    });
  }

  function goTo(index) {
    const nextIndex = normalizeIndex(index);
    if (isTransitioning || nextIndex === currentIndex) return;

    isTransitioning = true;
    mainImg.classList.add('is-fading');

    window.setTimeout(() => {
      currentIndex = nextIndex;
      const item = data.images[currentIndex];
      mainImg.src = basePath + item.image;
      updateCaption(currentIndex);

      const finish = () => {
        mainImg.classList.remove('is-fading');
        isTransitioning = false;
        mainImg.removeEventListener('load', finish);
      };

      if (mainImg.complete) {
        finish();
      } else {
        mainImg.addEventListener('load', finish);
      }
    }, TRANSITION_MS);
  }

  prevBtn.addEventListener('click', () => goTo(currentIndex - 1));
  nextBtn.addEventListener('click', () => goTo(currentIndex + 1));

  document.addEventListener('keydown', (e) => {
    if (!container.isConnected) return;
    if (e.key === 'ArrowLeft') goTo(currentIndex - 1);
    if (e.key === 'ArrowRight') goTo(currentIndex + 1);
  });

  const first = data.images[0];
  mainImg.src = basePath + first.image;
  updateCaption(0);
})();
