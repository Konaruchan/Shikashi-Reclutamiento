document.addEventListener('DOMContentLoaded', () => {
  // --- CÓDIGO PARA OVERLAY, CARRUSELES, LISTA DE ARTÍCULOS, ETC. ---
  
  // Ejemplo de manejo de overlay (se activa con retraso para efecto glass)
  const overlayGrid = document.getElementById('overlayGrid');
  setTimeout(() => {
    overlayGrid.classList.add('active');
  }, 2000);
  
  // --- CÓDIGO DEL CARRUSEL DE ARTÍCULOS ---
  const carouselPagesContainer = document.getElementById('carouselPages');
  const prevButton = document.getElementById('prevButton');
  const nextButton = document.getElementById('nextButton');
  let currentPage = 0;
  const articlesPerPage = 5;
  
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
  document.getElementById('carousel-container').addEventListener('mouseenter', () => clearInterval(autoAdvanceInterval));
  document.getElementById('carousel-container').addEventListener('mouseleave', () => {
    autoAdvanceInterval = setInterval(() => {
      currentPage = (currentPage < carouselPagesContainer.children.length - 1) ? currentPage + 1 : 0;
      updateCarousel();
    }, 5000);
  });
  
  // --- CÓDIGO DEL CARRUSEL DE OBRAS ---
  const obrasCarouselPagesContainer = document.getElementById('obrasCarouselPages');
  const obrasPrevButton = document.getElementById('obrasPrevButton');
  const obrasNextButton = document.getElementById('obrasNextButton');
  let currentObrasPage = 0;
  const obrasPerPage = 4;
  const obrasImages = [
    'img/obras/1.png',
    'img/obras/2.png',
    'img/obras/3.png',
    'img/obras/4.png',
    'img/obras/5.png',
    'img/obras/6.png',
    'img/obras/7.png',
    'img/obras/8.png'
  ];
  
  function updateObrasCarousel() {
    const offset = -currentObrasPage * 100;
    obrasCarouselPagesContainer.style.transform = `translateX(${offset}%)`;
  }
  
  function displayObrasCarousel() {
    obrasCarouselPagesContainer.innerHTML = '';
    const numObrasPages = Math.ceil(obrasImages.length / obrasPerPage);
    for (let i = 0; i < numObrasPages; i++) {
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
  document.getElementById('obrasCarouselContainer').addEventListener('mouseenter', () => clearInterval(autoObrasInterval));
  document.getElementById('obrasCarouselContainer').addEventListener('mouseleave', () => {
    autoObrasInterval = setInterval(() => {
      currentObrasPage = (currentObrasPage < obrasCarouselPagesContainer.children.length - 1) ? currentObrasPage + 1 : 0;
      updateObrasCarousel();
    }, 5000);
  });
  
  displayObrasCarousel();
  
  // --- CÓDIGO PARA ARTÍCULOS Y PROMOS ---
  // (Aquí se inyecta la lógica para mostrar artículos y promos, similar al código actual)
  // Se omite el detalle para enfocarnos en el rediseño visual.
  
  // --- Toast de Salida ---
  function showExitToast() {
    const toast = document.getElementById('exitToast');
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
  }
  
  // Exponer la función para que otros scripts (como el del viewer) puedan llamarla si es necesario.
  window.showExitToast = showExitToast;
  
  // --- Fetch de Artículos ---
  async function fetchArticles() {
    try {
      const response = await fetch('articulos.json');
      if (!response.ok) throw new Error(`Error al cargar 'articulos.json': ${response.status}`);
      const articles = await response.json();
      window.articlesData = articles;
    } catch (error) {
      console.error('Error al cargar los artículos:', error);
      window.articlesData = [];
    }
  }
  fetchArticles();
});
