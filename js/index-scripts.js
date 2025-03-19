document.addEventListener('DOMContentLoaded', () => {
  // ==== OVERLAY ====
  const overlayGrid = document.getElementById('overlayGrid');
  setTimeout(() => overlayGrid.classList.add('active'), 1500);

  // ==== JSON FETCH ====
  let articlesData = [];
  fetch('articulos.json')
    .then(res => res.json())
    .then(data => {
      articlesData = data;
      renderOverlayArticles();
      renderCarouselArticles();
      renderArticleList();
    })
    .catch(err => {
      console.error('Error cargando JSON', err);
      articlesData = [];
    });

  // ==== RENDER OVERLAY ====
  function renderOverlayArticles() {
    const smallContainer = document.getElementById('smallItemsContainer');
    const featured = articlesData.filter(a => a.featured).slice(0, 4);
    smallContainer.innerHTML = '';
    featured.forEach(article => {
      const item = document.createElement('div');
      item.className = 'card';
      item.innerHTML = `
        <div class="card-header"><span class="accent"></span><h3>${article.title}</h3></div>
        <div class="card-body">
          <img src="${article.thumbnail}" alt="${article.title}">
        </div>
      `;
      item.addEventListener('click', () => {
        window.location.href = `Artic-Viewer.html?id=${article.id}`;
      });
      smallContainer.appendChild(item);
    });
  }

  // ==== CARRUSEL ARTÍCULOS ====
  const carouselPages = document.getElementById('carouselPages');
  let currentPage = 0;

  function renderCarouselArticles() {
    carouselPages.innerHTML = '';
    const pagedArticles = chunkArray(articlesData, 5);
    pagedArticles.forEach(page => {
      const pageContainer = document.createElement('div');
      pageContainer.className = 'carousel-page';
      page.forEach(article => {
        const card = document.createElement('div');
        card.className = 'carousel-item';
        card.innerHTML = `
          <img src="${article.thumbnail}" alt="${article.title}" class="carousel-thumbnail">
          <div class="carousel-info">
            <h3>${article.title}</h3>
          </div>
        `;
        card.addEventListener('click', () => {
          window.location.href = `Artic-Viewer.html?id=${article.id}`;
        });
        pageContainer.appendChild(card);
      });
      carouselPages.appendChild(pageContainer);
    });
    updateCarousel();
  }

  function updateCarousel() {
    const offset = -currentPage * 100;
    carouselPages.style.transform = `translateX(${offset}%)`;
  }

  document.getElementById('prevButton').onclick = () => {
    currentPage = (currentPage > 0) ? currentPage - 1 : carouselPages.children.length - 1;
    updateCarousel();
  };
  document.getElementById('nextButton').onclick = () => {
    currentPage = (currentPage < carouselPages.children.length - 1) ? currentPage + 1 : 0;
    updateCarousel();
  };

  // ==== CARRUSEL OBRAS SHIKASHI ====
  const obrasCarouselPages = document.getElementById('obrasCarouselPages');
  let currentObrasPage = 0;
  const obrasImages = [
    'img/obras/1.png', 'img/obras/2.png', 'img/obras/3.png', 'img/obras/4.png'
  ];

  function renderObrasCarousel() {
    obrasCarouselPages.innerHTML = '';
    const pagedObras = chunkArray(obrasImages.length ? obrasImages : [null, null, null, null], 4);
    pagedObras.forEach(page => {
      const pageContainer = document.createElement('div');
      pageContainer.className = 'obras-carousel-page';
      page.forEach(src => {
        const obra = document.createElement('div');
        obra.className = 'obras-carousel-item';
        if (src) {
          obra.innerHTML = `<img src="${src}" alt="Obra Shikashi" onerror="this.src='img/placeholder.png';">`;
        } else {
          obra.classList.add('placeholder');
          obra.innerHTML = `<span>Obra</span>`;
        }
        pageContainer.appendChild(obra);
      });
      obrasCarouselPages.appendChild(pageContainer);
    });
    updateObrasCarousel();
  }

  function updateObrasCarousel() {
    const offset = -currentObrasPage * 100;
    obrasCarouselPages.style.transform = `translateX(${offset}%)`;
  }

  document.getElementById('obrasPrevButton').onclick = () => {
    currentObrasPage = (currentObrasPage > 0) ? currentObrasPage - 1 : obrasCarouselPages.children.length - 1;
    updateObrasCarousel();
  };
  document.getElementById('obrasNextButton').onclick = () => {
    currentObrasPage = (currentObrasPage < obrasCarouselPages.children.length - 1) ? currentObrasPage + 1 : 0;
    updateObrasCarousel();
  };

  // ==== RENDER LISTADO DE ARTÍCULOS ====
  const articleListContainer = document.querySelector('.articles-list');
  const selectorButtons = document.querySelectorAll('.selector-btn');

  function renderArticleList(category = 'nuevo') {
    articleListContainer.innerHTML = '';
    let filtered = [];
    if (category === 'nuevo') {
      filtered = articlesData.filter(a => a.new);
    } else if (category === 'destacado') {
      filtered = articlesData.filter(a => a.featured);
    } else {
      filtered = [...articlesData];
    }
    filtered.forEach(article => {
      const item = document.createElement('div');
      item.className = 'article-item';
      item.innerHTML = `
        <img src="${article.thumbnail}" alt="${article.title}">
        <div class="article-details">
          <h3>${article.title}</h3>
          <p>${article.subtitle}</p>
          <span>${article.date}</span>
        </div>
      `;
      item.addEventListener('click', () => {
        window.location.href = `Artic-Viewer.html?id=${article.id}`;
      });
      articleListContainer.appendChild(item);
    });
  }

  selectorButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      selectorButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.getAttribute('data-category');
      renderArticleList(cat);
    });
  });

  // ==== UTILITY ====
  function chunkArray(arr, size) {
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  }

  renderObrasCarousel();
});
