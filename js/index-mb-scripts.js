document.addEventListener('DOMContentLoaded', () => {
  // ==== MENÚ HAMBURGUESA ====
  const hamburger = document.getElementById('hamburger');
  const menu = document.getElementById('mobileMenu');
  hamburger.addEventListener('click', () => {
    menu.classList.toggle('active');
  });

  // ==== OVERLAY: Revista del mes ====
  const overlay = document.getElementById('mobileOverlay');
  setTimeout(() => {
    overlay.classList.add('active');
  }, 2000);

  // ==== FETCH DATA ====
  let articlesData = [];
  let issueData = null;
  fetch('articulos.json')
    .then(res => res.json())
    .then(data => {
      articlesData = data;
      renderCarouselArticles();
      renderObrasCarousel();
      renderArticleList();
    })
    .catch(err => console.error('Error cargando artículos:', err));

  fetch('issues.json')
    .then(res => res.json())
    .then(data => {
      issueData = data[0];
      renderIssueCard();
    })
    .catch(err => console.error('Error cargando issue:', err));

  // ==== RENDER ISSUE CARD ====
  function renderIssueCard() {
    if (!issueData) return;
    document.getElementById('issueTitle').innerText = issueData.title;
    document.getElementById('issueDesc').innerText = issueData.description;
    document.getElementById('issueLink').setAttribute('href', issueData.path);
  }

  // ==== CARRUSEL ARTÍCULOS ====
  const carouselPages = document.getElementById('carouselPages');
  let currentPage = 0;
  function renderCarouselArticles() {
    carouselPages.innerHTML = '';
    const pages = chunkArray(articlesData, 2);
    pages.forEach(page => {
      const pageDiv = document.createElement('div');
      pageDiv.className = 'carousel-page';
      page.forEach(article => {
        const card = document.createElement('div');
        card.className = 'carousel-item';
        card.innerHTML = `
          <img src="${article.thumbnail}" alt="${article.title}">
          <h3>${article.title}</h3>
        `;
        card.addEventListener('click', () => {
          window.location.href = `Artic-Viewer.html?id=${article.id}`;
        });
        pageDiv.appendChild(card);
      });
      carouselPages.appendChild(pageDiv);
    });
    autoSlideCarousel();
  }

  // ==== CARRUSEL OBRAS ====
  const obrasCarouselPages = document.getElementById('obrasCarouselPages');
  let currentObrasPage = 0;
  const obrasImages = ['img/obras/1.png', 'img/obras/2.png', 'img/obras/3.png', 'img/obras/4.png'];

  function renderObrasCarousel() {
    obrasCarouselPages.innerHTML = '';
    const images = obrasImages.length >= 4 ? obrasImages : [...obrasImages, ...obrasImages];
    const pages = chunkArray(images, 2);
    pages.forEach(page => {
      const pageDiv = document.createElement('div');
      pageDiv.className = 'carousel-page';
      page.forEach(src => {
        const obra = document.createElement('div');
        obra.className = 'carousel-item';
        obra.innerHTML = `<img src="${src}" alt="Obra">`;
        pageDiv.appendChild(obra);
      });
      obrasCarouselPages.appendChild(pageDiv);
    });
    autoSlideObrasCarousel();
  }

  // ==== AUTO SLIDE ====
  function autoSlideCarousel() {
    setInterval(() => {
      currentPage = (currentPage + 1) % carouselPages.children.length;
      carouselPages.style.transform = `translateX(-${currentPage * 100}%)`;
    }, 4000);
  }

  function autoSlideObrasCarousel() {
    setInterval(() => {
      currentObrasPage = (currentObrasPage + 1) % obrasCarouselPages.children.length;
      obrasCarouselPages.style.transform = `translateX(-${currentObrasPage * 100}%)`;
    }, 4000);
  }

  // ==== ARTÍCULOS FILTRO ====
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

  // ==== UTILS ====
  function chunkArray(arr, size) {
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  }
});