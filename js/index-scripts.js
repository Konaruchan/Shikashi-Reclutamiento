document.addEventListener('DOMContentLoaded', () => {

  // Activar overlay con efecto glass después de 2s
  const overlayGrid = document.getElementById('overlayGrid');
  setTimeout(() => {
    overlayGrid.classList.add('active');
  }, 2000);

  // === FUNCIONES PARA ARTÍCULOS DESTACADOS EN HERO ===
  const smallItemsContainer = document.getElementById('smallItemsContainer');

  function displayFeaturedArticles(articles) {
    if (!articles || articles.length === 0) return;

    let featured = articles.filter(article => article.featured);
    if (featured.length < 5) {
      const nonFeatured = articles.filter(article => !article.featured);
      featured = featured.concat(nonFeatured);
    }
    const displayArticles = featured.slice(0, 5);

    // Link dinámico en el botón principal
    const bigItemBtn = document.querySelector('.big-item-btn');
    bigItemBtn.href = `Artic-Viewer.html?id=${displayArticles[0].id}`;

    // Click en toda la tarjeta grande
    const bigItemCard = document.querySelector('.big-item');
    bigItemCard.onclick = () => {
      window.location.href = `Artic-Viewer.html?id=${displayArticles[0].id}`;
    };

    // Renderizar las 4 tarjetas pequeñas
    smallItemsContainer.innerHTML = '';
    displayArticles.slice(1, 5).forEach(article => {
      const smallItem = document.createElement('div');
      smallItem.className = 'small-item card';
      smallItem.innerHTML = `
        <div class="card-header">
          <span class="accent"></span>
          <h3>${article.title}</h3>
        </div>
        <div class="card-body">
          <img src="${article.thumbnail}" alt="${article.title}">
        </div>
      `;
      smallItem.onclick = () => {
        window.location.href = `Artic-Viewer.html?id=${article.id}`;
      };
      smallItemsContainer.appendChild(smallItem);
    });
  }

  // === CARRUSEL DE ARTÍCULOS ===
  const carouselPagesContainer = document.getElementById('carouselPages');
  const prevButton = document.getElementById('prevButton');
  const nextButton = document.getElementById('nextButton');
  let currentPage = 0;
  const articlesPerPage = 5;

  function displayCarouselArticles(articles) {
    // Ordenar por "nuevo" y "destacado"
    articles.sort((a, b) => {
      if (a.new && !b.new) return -1;
      if (!a.new && b.new) return 1;
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return new Date(b.date) - new Date(a.date);
    });

    let carouselArticles = [...articles];
    while (carouselArticles.length < 15) {
      carouselArticles = carouselArticles.concat(articles);
    }
    carouselArticles = carouselArticles.slice(0, 15);

    carouselPagesContainer.innerHTML = '';
    const numPages = Math.ceil(carouselArticles.length / articlesPerPage);
    for (let i = 0; i < numPages; i++) {
      const pageContainer = document.createElement('div');
      pageContainer.className = 'carousel-page';
      const start = i * articlesPerPage;
      const pageArticles = carouselArticles.slice(start, start + articlesPerPage);
      pageArticles.forEach(article => {
        const articleElement = document.createElement('div');
        articleElement.className = 'carousel-item';
        articleElement.innerHTML = `
          <div class="carousel-card">
            <img src="${article.thumbnail}" alt="${article.title}" class="carousel-thumbnail">
            <div class="carousel-info">
              ${article.new ? '<span class="new-label">Nuevo!</span>' : ''}
              <span class="date">${article.date}</span>
              <h3>${article.title}</h3>
            </div>
          </div>
        `;
        articleElement.onclick = () => {
          window.location.href = `Artic-Viewer.html?id=${article.id}`;
        };
        pageContainer.appendChild(articleElement);
      });
      carouselPagesContainer.appendChild(pageContainer);
    }
    updateCarousel();
  }

  function updateCarousel() {
    const offset = -currentPage * 100;
    carouselPagesContainer.style.transform = `translateX(${offset}%)`;
  }

  prevButton.onclick = () => {
    currentPage = (currentPage > 0) ? currentPage - 1 : carouselPagesContainer.children.length - 1;
    updateCarousel();
  };
  nextButton.onclick = () => {
    currentPage = (currentPage < carouselPagesContainer.children.length - 1) ? currentPage + 1 : 0;
    updateCarousel();
  };

  let autoAdvanceInterval = setInterval(() => {
    currentPage = (currentPage < carouselPagesContainer.children.length - 1) ? currentPage + 1 : 0;
    updateCarousel();
  }, 5000);
  carouselPagesContainer.parentNode.addEventListener('mouseenter', () => clearInterval(autoAdvanceInterval));
  carouselPagesContainer.parentNode.addEventListener('mouseleave', () => {
    autoAdvanceInterval = setInterval(() => {
      currentPage = (currentPage < carouselPagesContainer.children.length - 1) ? currentPage + 1 : 0;
      updateCarousel();
    }, 5000);
  });

  // === ARTÍCULOS EN LA SECCIÓN LISTA ===
  const articlesListContainer = document.querySelector('.articles-list');
  const selectorButtons = document.querySelectorAll('.selector-btn');

  function displayArticlesList(category) {
    articlesListContainer.innerHTML = '';
    if (!window.articlesData || window.articlesData.length === 0) {
      articlesListContainer.textContent = 'No hay artículos disponibles.';
      return;
    }
    let filteredArticles = [];
    if (category === 'nuevo') {
      filteredArticles = window.articlesData.filter(article => article.new);
    } else if (category === 'destacado') {
      filteredArticles = window.articlesData.filter(article => article.featured);
    } else {
      filteredArticles = window.articlesData;
    }
    filteredArticles.forEach(article => {
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
      articleItem.onclick = () => {
        window.location.href = `Artic-Viewer.html?id=${article.id}`;
      };
      articlesListContainer.appendChild(articleItem);
    });
  }

  selectorButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      selectorButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const category = btn.getAttribute('data-category');
      displayArticlesList(category);
    });
  });

  // === PROMOS laterales ===
  const articlesPromoContainer = document.querySelector('.articles-promo');
  const promoImages = ['img/mainpromo/promo1.jpg', 'img/mainpromo/promo2.jpg'];

  function displayPromoImages() {
    articlesPromoContainer.innerHTML = '';
    if (promoImages.length > 0) {
      promoImages.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        img.alt = 'Promoción';
        img.onerror = function() {
          articlesPromoContainer.innerHTML = '<div class="no-images">¡Bienvenido a Shikashi Monthly Friday Series!</div>';
        };
        articlesPromoContainer.appendChild(img);
      });
    } else {
      articlesPromoContainer.innerHTML = '<div class="no-images">¡Bienvenido a Shikashi Monthly Friday Series!</div>';
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

  function displayObrasCarousel() {
    obrasCarouselPagesContainer.innerHTML = '';
    const numPages = Math.ceil(obrasImages.length / obrasPerPage);
    for (let i = 0; i < numPages; i++) {
      const pageContainer = document.createElement('div');
      pageContainer.className = 'obras-carousel-page';
      const start = i * obrasPerPage;
      const pageImages = obrasImages.slice(start, start + obrasPerPage);
      pageImages.forEach(src => {
        const obraItem = document.createElement('div');
        obraItem.className = 'obras-carousel-item';
        obraItem.innerHTML = `<img src="${src}" alt="Obra Shikashi" onerror="this.onerror=null; this.src='img/placeholder.png';">`;
        pageContainer.appendChild(obraItem);
      });
      obrasCarouselPagesContainer.appendChild(pageContainer);
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

  // === AUTO CARGA FINAL ===
  function initializePage() {
    if (window.articlesData && window.articlesData.length > 0) {
      displayFeaturedArticles(window.articlesData);
      displayCarouselArticles(window.articlesData);
      displayArticlesList('nuevo');
      displayPromoImages();
      displayObrasCarousel();
    } else {
      setTimeout(initializePage, 100);
    }
  }

  initializePage();

});
