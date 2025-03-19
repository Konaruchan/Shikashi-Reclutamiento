document.addEventListener('DOMContentLoaded', () => {
  // Mostrar overlay luego de 2 segundos (efecto glass)
  const overlayGrid = document.getElementById('overlayGrid');
  setTimeout(() => overlayGrid.classList.add('active'), 2000);

  const smallItemsContainer = document.getElementById('smallItemsContainer');
  const carouselPagesContainer = document.getElementById('carouselPages');
  const articlesListContainer = document.querySelector('.articles-list');
  const selectorButtons = document.querySelectorAll('.selector-btn');

  // === CARGA DINÁMICA DESDE JSON ===
  function loadContent() {
    if (!window.articlesData || window.articlesData.length === 0) {
      setTimeout(loadContent, 100);
      return;
    }

    renderHeroArticles();
    renderCarousel();
    renderArticlesList('nuevo');
    renderPromoImages();
    renderObrasCarousel();
  }

  // === HERO OVERLAY (4 destacados) ===
  function renderHeroArticles() {
    const featuredArticles = window.articlesData.filter(a => a.featured).slice(0, 4);
    smallItemsContainer.innerHTML = '';
    featuredArticles.forEach(article => {
      const smallItem = document.createElement('div');
      smallItem.className = 'card';
      smallItem.innerHTML = `
        <div class="card-header">
          <span class="accent"></span>
          <h3>${article.title}</h3>
        </div>
        <div class="card-body">
          <img src="${article.thumbnail}" alt="${article.title}">
        </div>
      `;
      smallItem.addEventListener('click', () => {
        window.location.href = `Artic-Viewer.html?id=${article.id}`;
      });
      smallItemsContainer.appendChild(smallItem);
    });
  }

  // === CARRUSEL PRINCIPAL ===
  let currentPage = 0;
  const articlesPerPage = 5;
  function renderCarousel() {
    let sorted = [...window.articlesData].sort((a, b) => new Date(b.date) - new Date(a.date));
    carouselPagesContainer.innerHTML = '';
    const pages = Math.ceil(sorted.length / articlesPerPage);

    for (let i = 0; i < pages; i++) {
      const page = document.createElement('div');
      page.className = 'carousel-page';
      const articles = sorted.slice(i * articlesPerPage, (i + 1) * articlesPerPage);
      articles.forEach(article => {
        const item = document.createElement('div');
        item.className = 'carousel-item';
        item.innerHTML = `
          <img src="${article.thumbnail}" class="carousel-thumbnail" alt="${article.title}">
          <div class="carousel-info">
            ${article.new ? '<span class="new-label">Nuevo!</span>' : ''}
            <span class="date">${article.date}</span>
            <h3>${article.title}</h3>
          </div>
        `;
        item.addEventListener('click', () => {
          window.location.href = `Artic-Viewer.html?id=${article.id}`;
        });
        page.appendChild(item);
      });
      carouselPagesContainer.appendChild(page);
    }
    updateCarousel();
  }

  function updateCarousel() {
    const offset = -currentPage * 100;
    carouselPagesContainer.style.transform = `translateX(${offset}%)`;
  }

  // Botones carrusel
  document.getElementById('prevButton').addEventListener('click', () => {
    currentPage = (currentPage > 0) ? currentPage - 1 : carouselPagesContainer.children.length - 1;
    updateCarousel();
  });
  document.getElementById('nextButton').addEventListener('click', () => {
    currentPage = (currentPage < carouselPagesContainer.children.length - 1) ? currentPage + 1 : 0;
    updateCarousel();
  });

  // Auto avance carrusel
  let autoCarousel = setInterval(() => {
    currentPage = (currentPage < carouselPagesContainer.children.length - 1) ? currentPage + 1 : 0;
    updateCarousel();
  }, 5000);
  carouselPagesContainer.parentNode.addEventListener('mouseenter', () => clearInterval(autoCarousel));
  carouselPagesContainer.parentNode.addEventListener('mouseleave', () => {
    autoCarousel = setInterval(() => {
      currentPage = (currentPage < carouselPagesContainer.children.length - 1) ? currentPage + 1 : 0;
      updateCarousel();
    }, 5000);
  });

  // === LISTA DE ARTÍCULOS ===
  function renderArticlesList(category) {
    articlesListContainer.innerHTML = '';
    let filtered = [];
    if (category === 'nuevo') {
      filtered = window.articlesData.filter(a => a.new);
    } else if (category === 'destacado') {
      filtered = window.articlesData.filter(a => a.featured);
    } else {
      filtered = [...window.articlesData];
    }

    filtered.forEach(article => {
      const articleItem = document.createElement('div');
      articleItem.className = 'article-item';
      articleItem.innerHTML = `
        <img src="${article.thumbnail}" alt="${article.title}">
        <div class="article-details">
          <h3>${article.title}</h3>
          <p>${article.subtitle}</p>
          <span>${article.date}</span>
        </div>
      `;
      articleItem.addEventListener('click', () => {
        window.location.href = `Artic-Viewer.html?id=${article.id}`;
      });
      articlesListContainer.appendChild(articleItem);
    });
  }

  selectorButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      selectorButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.getAttribute('data-category');
      renderArticlesList(cat);
    });
  });

  // === PROMOS laterales ===
  const articlesPromoContainer = document.querySelector('.articles-promo');
  const promoImages = ['img/mainpromo/promo1.jpg', 'img/mainpromo/promo2.jpg'];

  function renderPromoImages() {
    articlesPromoContainer.innerHTML = '';
    if (promoImages.length > 0) {
      promoImages.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        img.alt = 'Promoción';
        img.onerror = () => {
          articlesPromoContainer.innerHTML = '<div class="no-images">¡Bienvenido a Shikashi Monthly Friday Series!</div>';
        };
        articlesPromoContainer.appendChild(img);
      });
    }
  }

  // === CARRUSEL DE OBRAS ===
  const obrasCarouselPagesContainer = document.getElementById('obrasCarouselPages');
  const obrasPrevButton = document.getElementById('obrasPrevButton');
  const obrasNextButton = document.getElementById('obrasNextButton');
  let currentObrasPage = 0;
  const obrasPerPage = 4;
  const obrasImages = [
    'img/obras/1.png', 'img/obras/2.png', 'img/obras/3.png', 'img/obras/4.png',
    'img/obras/5.png', 'img/obras/6.png', 'img/obras/7.png', 'img/obras/8.png'
  ];

  function renderObrasCarousel() {
    obrasCarouselPagesContainer.innerHTML = '';
    const numPages = Math.ceil(obrasImages.length / obrasPerPage);
    for (let i = 0; i < numPages; i++) {
      const page = document.createElement('div');
      page.className = 'obras-carousel-page';
      const imgs = obrasImages.slice(i * obrasPerPage, (i + 1) * obrasPerPage);
      imgs.forEach(src => {
        const item = document.createElement('div');
        item.className = 'obras-carousel-item';
        item.innerHTML = `<img src="${src}" alt="Obra Shikashi" onerror="this.onerror=null; this.src='img/placeholder.png';">`;
        page.appendChild(item);
      });
      obrasCarouselPagesContainer.appendChild(page);
    }
    updateObrasCarousel();
  }

  function updateObrasCarousel() {
    const offset = -currentObrasPage * 100;
    obrasCarouselPagesContainer.style.transform = `translateX(${offset}%)`;
  }

  obrasPrevButton.onclick = () => {
    currentObrasPage = (currentObrasPage > 0) ? currentObrasPage - 1 : obrasCarouselPagesContainer.children.length - 1;
    updateObrasCarousel();
  };
  obrasNextButton.onclick = () => {
    currentObrasPage = (currentObrasPage < obrasCarouselPagesContainer.children.length - 1) ? currentObrasPage + 1 : 0;
    updateObrasCarousel();
  };

  let autoObrasInterval = setInterval(() => {
    currentObrasPage = (currentObrasPage < obrasCarouselPagesContainer.children.length - 1) ? currentObrasPage + 1 : 0;
    updateObrasCarousel();
  }, 5000);
  obrasCarouselPagesContainer.parentNode.addEventListener('mouseenter', () => clearInterval(autoObrasInterval));
  obrasCarouselPagesContainer.parentNode.addEventListener('mouseleave', () => {
    autoObrasInterval = setInterval(() => {
      currentObrasPage = (currentObrasPage < obrasCarouselPagesContainer.children.length - 1) ? currentObrasPage + 1 : 0;
      updateObrasCarousel();
    }, 5000);
  });

  // Init
  loadContent();
});

