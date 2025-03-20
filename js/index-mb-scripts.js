document.addEventListener('DOMContentLoaded', () => {
  // ==== MENU BURGER ====
  const menuToggle = document.getElementById('menuToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
      mobileMenu.classList.toggle('show');
    });
  }

  // ==== FETCH JSON ====
  let articlesData = [];

  // Artículos
  fetch('articulos.json')
    .then(res => res.json())
    .then(data => {
      articlesData = data;
      if (document.getElementById('carouselArticles')) renderCarouselArticles();
      if (document.getElementById('carouselObras')) renderObrasCarousel();
      if (document.getElementById('articlesList')) renderArticleList();
    })
    .catch(err => {
      console.error('Error cargando artículos:', err);
    });

  // Issue
  fetch('issues.json')
    .then(res => res.json())
    .then(data => {
      if (data && data.length > 0) {
        renderIssueOverlay(data[0]);
      }
    })
    .catch(err => {
      console.error('Error cargando issue:', err);
    });

  // ==== HERO OVERLAY ====
  function renderIssueOverlay(issue) {
    const issueTitle = document.getElementById('issueTitle');
    const issueDesc = document.getElementById('issueDesc');
    const issueImage = document.getElementById('issueImage');
    const viewIssueBtn = document.getElementById('viewIssueBtn');
    if (issueTitle && issueDesc && issueImage && viewIssueBtn) {
      issueTitle.innerText = issue.title;
      issueDesc.innerText = issue.description;
      viewIssueBtn.onclick = () => {
        window.location.href = issue.path;
      };
      // Mostrar overlay después de 3 segundos
      setTimeout(() => {
        const heroOverlay = document.getElementById('heroOverlay');
        if (heroOverlay) {
          heroOverlay.classList.add('show');
        }
      }, 3000);
    }
  }

  // ==== CARRUSEL ARTÍCULOS ====
  function renderCarouselArticles() {
    const carousel = document.getElementById('carouselArticles');
    carousel.innerHTML = '';
    const pagedArticles = chunkArray(articlesData, 2);
    pagedArticles.forEach(page => {
      const pageDiv = document.createElement('div');
      pageDiv.className = 'carousel-page';
      page.forEach(article => {
        const card = document.createElement('div');
        card.className = 'carousel-item';
        card.innerHTML = `
          <img src="${article.thumbnail}" alt="${article.title}">
          <h4>${article.title}</h4>
        `;
        card.addEventListener('click', () => {
          window.location.href = `Artic-Viewer.html?id=${article.id}`;
        });
        pageDiv.appendChild(card);
      });
      carousel.appendChild(pageDiv);
    });
    autoSlide(carousel);
  }

  // ==== CARRUSEL OBRAS ====
  function renderObrasCarousel() {
    const carousel = document.getElementById('carouselObras');
    const obrasImages = [
      'img/obras/1.png', 'img/obras/2.png', 'img/obras/3.png', 'img/obras/4.png',
      'img/obras/5.png', 'img/obras/6.png'
    ];
    carousel.innerHTML = '';
    const pagedObras = chunkArray(obrasImages, 2);
    pagedObras.forEach(page => {
      const pageDiv = document.createElement('div');
      pageDiv.className = 'carousel-page';
      page.forEach(src => {
        const card = document.createElement('div');
        card.className = 'obras-carousel-item';
        card.innerHTML = `<img src="${src}" alt="Obra">`;
        pageDiv.appendChild(card);
      });
      carousel.appendChild(pageDiv);
    });
    autoSlide(carousel);
  }

  // ==== ARTÍCULOS LISTA ====
  const selectorButtons = document.querySelectorAll('.selector-btn');
  function renderArticleList(category = 'nuevo') {
    const container = document.getElementById('articlesList');
    container.innerHTML = '';
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
      container.appendChild(item);
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

  function autoSlide(carousel) {
    let index = 0;
    setInterval(() => {
      index = (index + 1) % carousel.children.length;
      carousel.style.transform = `translateX(-${index * 100}%)`;
    }, 3500);
  }
});
