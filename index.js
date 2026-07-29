(() => {
  const header = document.getElementById('header');
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.querySelectorAll('.nav-link');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Navigation ----
  navToggle.addEventListener('click', () => {
    const isOpen = header.classList.toggle('nav-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      header.classList.remove('nav-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  const sections = document.querySelectorAll('section[id]');
  const linkById = new Map(
    Array.from(navLinks).map((link) => [link.getAttribute('href')?.slice(1), link])
  );
  const sectionRatios = new Map();
  let activeSectionId = null;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        sectionRatios.set(entry.target.id, entry.intersectionRatio);
      });

      let maxRatio = 0;
      let nextId = null;
      sectionRatios.forEach((ratio, id) => {
        if (ratio > maxRatio) {
          maxRatio = ratio;
          nextId = id;
        }
      });

      if (!nextId || maxRatio <= 0.1 || nextId === activeSectionId) return;

      activeSectionId = nextId;
      navLinks.forEach((link) => link.classList.remove('active'));
      linkById.get(nextId)?.classList.add('active');
    },
    {
      root: null,
      rootMargin: '-20% 0px -50% 0px',
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
    }
  );

  sections.forEach((section) => observer.observe(section));

  document.getElementById('year').textContent = String(new Date().getFullYear());

  // ---- Footer: last GitHub push (month + year) ----
  const updatedAtEl = document.getElementById('updatedAt');
  const formatMonthYear = (date) =>
    date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const setUpdatedAt = (date) => {
    updatedAtEl.dateTime = date.toISOString().slice(0, 7);
    updatedAtEl.textContent = formatMonthYear(date);
  };

  fetch('https://api.github.com/repos/IceFairyCirno/My-Website')
    .then((res) => (res.ok ? res.json() : Promise.reject(res)))
    .then((repo) => setUpdatedAt(new Date(repo.pushed_at)))
    .catch(() => setUpdatedAt(new Date()));

  // ---- Photo carousel ----
  const profilePhoto = document.getElementById('profilePhoto');
  const prevBtn = document.querySelector('.prev-btn');
  const nextBtn = document.querySelector('.next-btn');
  const indicators = document.querySelectorAll('.indicator');
  const carousel = document.querySelector('.photo-carousel');

  const profileImages = [
    'assets/profile_pic.png',
    'assets/profile_pic2.png',
    'assets/profile_pic3.png',
  ];

  let currentImageIndex = 0;
  let autoPlayInterval = null;
  let fadeTimeout = null;

  function changeImage(index) {
    if (index === currentImageIndex && profilePhoto.style.opacity !== '0') return;

    clearTimeout(fadeTimeout);
    profilePhoto.style.opacity = '0';

    fadeTimeout = setTimeout(() => {
      currentImageIndex = index;
      profilePhoto.src = profileImages[index];
      profilePhoto.style.opacity = '1';

      indicators.forEach((indicator, i) => {
        const isActive = i === index;
        indicator.classList.toggle('active', isActive);
        indicator.setAttribute('aria-current', isActive ? 'true' : 'false');
      });
    }, 250);
  }

  function nextImage() {
    changeImage((currentImageIndex + 1) % profileImages.length);
  }

  function previousImage() {
    changeImage((currentImageIndex - 1 + profileImages.length) % profileImages.length);
  }

  function stopAutoPlay() {
    clearInterval(autoPlayInterval);
    autoPlayInterval = null;
  }

  function startAutoPlay() {
    stopAutoPlay();
    if (prefersReducedMotion) return;
    autoPlayInterval = setInterval(nextImage, 5000);
  }

  function restartAutoPlay() {
    stopAutoPlay();
    startAutoPlay();
  }

  prevBtn.addEventListener('click', () => {
    previousImage();
    restartAutoPlay();
  });

  nextBtn.addEventListener('click', () => {
    nextImage();
    restartAutoPlay();
  });

  indicators.forEach((indicator, index) => {
    indicator.addEventListener('click', () => {
      changeImage(index);
      restartAutoPlay();
    });
  });

  carousel.addEventListener('mouseenter', stopAutoPlay);
  carousel.addEventListener('mouseleave', startAutoPlay);
  startAutoPlay();

  // ---- Contact form (Formspree AJAX) ----
  const contactForm = document.querySelector('.contact-form');
  const submitBtn = contactForm.querySelector('.btn-primary');
  const formStatus = document.getElementById('formStatus');
  const defaultSubmitText = submitBtn.textContent;

  function setFormStatus(message, state) {
    formStatus.textContent = message;
    formStatus.dataset.state = state || '';
  }

  function resetSubmitButton() {
    submitBtn.textContent = defaultSubmitText;
    submitBtn.disabled = false;
  }

  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setFormStatus('', '');

    if (!contactForm.reportValidity()) return;

    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    try {
      const response = await fetch(contactForm.action, {
        method: 'POST',
        body: new FormData(contactForm),
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        contactForm.reset();
        setFormStatus('Thanks — your message was sent.', 'success');
      } else {
        const data = await response.json().catch(() => null);
        const errorMessage = data?.errors?.map((item) => item.message).join(' ')
          || 'Something went wrong. Please try again.';
        setFormStatus(errorMessage, 'error');
      }
    } catch {
      setFormStatus('Network error. Check your connection and try again.', 'error');
    } finally {
      resetSubmitButton();
    }
  });

  // ---- Snowfall (single ambient effect) ----
  const snowCanvas = document.getElementById('snowCanvas');
  if (!snowCanvas || prefersReducedMotion) return;

  const ctx = snowCanvas.getContext('2d');
  let width = 0;
  let height = 0;
  const flakes = [];
  const TWO_PI = Math.PI * 2;
  const rand = (min, max) => Math.random() * (max - min) + min;

  function createFlake(spawnAbove = true) {
    const size = rand(1, 3.2);
    return {
      x: rand(0, width),
      y: spawnAbove ? rand(-height, 0) : rand(0, height),
      r: size,
      speedY: rand(0.25, 0.9) + size * 0.05,
      driftX: rand(-0.4, 0.4),
      phase: rand(0, TWO_PI),
    };
  }

  function rebuildFlakes() {
    const count = Math.min(120, Math.floor((width * height) / 32000));
    flakes.length = 0;
    for (let i = 0; i < count; i += 1) flakes.push(createFlake(false));
  }

  function resize() {
    width = snowCanvas.width = window.innerWidth;
    height = snowCanvas.height = window.innerHeight;
    rebuildFlakes();
  }

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });
  resize();

  let lastTime = 0;
  function tick(ts) {
    const dt = Math.min(32, ts - lastTime);
    lastTime = ts;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(200, 240, 255, 0.85)';

    for (let i = 0; i < flakes.length; i += 1) {
      const flake = flakes[i];
      flake.y += flake.speedY * (dt / 16);
      flake.x += Math.sin((flake.y + flake.phase) * 0.01) * 0.4 + flake.driftX * (dt / 16);

      if (flake.y - flake.r > height) {
        flakes[i] = createFlake(true);
        flakes[i].y = -flake.r;
      }

      ctx.beginPath();
      ctx.arc(flake.x, flake.y, flake.r, 0, TWO_PI);
      ctx.fill();
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();
