document.addEventListener('DOMContentLoaded', () => {
  // === MENÚ HAMBURGUESA ===
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const mobileMenu = document.getElementById('mobileMenu');

  hamburgerBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('show');
  });

  // === FETCH DE DATOS ===
  let articlesData = [];
  let issueData = null;

  // Cargar artículos
  fetch('articulos.json')
    .then(res => res.json())
    .then(data => {
      articlesData = data;
      renderArticlesCarousel();
      renderObrasCarousel();
      renderArticleList();
    })
    .catch(err => console.error('Error cargando artículos', err));

  // Cargar issue de la revista
  fetch('issues.json')
    .then(res => res.json())
    .then(data => {
      issueData = data[0]; // Siempre la primera como más reciente
      renderRevistaCard();
    })
    .catch(err => console.error('Error cargando issues', err));

  // === RENDER REVISTA CARD ===
  function renderRevistaCard() {
    const revistaBody = document.getElementById('revistaBody');
    const revistaBtn = document.getElementById('revistaBtn');
    revistaBody.innerHTML = `
      <img src="img/portada-edicion.png" alt="Portada Edición">
      <h3>${issueData.title}</h3>
      <p>${issueData.description}</p>
    `;
    revistaBtn.onclick = () => {
      window.location.href = issueData.path;
    };
  }

  // === CARRUSEL DE ARTÍCULOS ===
  function renderArticlesCarousel() {
    const container = document.getElementById('carouselArticles');
    container.innerHTML = '';
    articlesData.slice(0, 4).forEach(article => {
      const card = document.createElement('div');
      card.className = 'carousel-item';
      card.innerHTML = `
        <img src="${article.thumbnail}" alt="${article.title}">
        <h3>${article.title}</h3>
      `;
      card.addEventListener('click', () => {
        window.location.href = `Artic-Viewer.html?id=${article.id}`;
      });
      container.appendChild(card);
    });
  }

  // === CARRUSEL DE OBRAS ===
  function renderObrasCarousel() {
    const obrasImages = [
      'img/obras/1.png', 'img/obras/2.png', 'img/obras/3.png', 'img/obras/4.png', 
      'img/obras/1.png', 'img/obras/2.png' // Repetidos para completar los 4+4
    ];
    const container = document.getElementById('carouselObras');
    container.innerHTML = '';
    obrasImages.forEach(src => {
      const card = document.createElement('div');
      card.className = 'obras-carousel-item';
      card.innerHTML = `<img src="${src}" alt="Obra Shikashi">`;
      container.appendChild(card);
    });
  }

  // === LISTA DE ARTÍCULOS ===
  const articleListContainer = document.getElementById('articlesList');
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
});