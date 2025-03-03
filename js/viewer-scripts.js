/* Configurar pdf.js */
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

/********** Configuración Global **********/
let config = {
  readingMode: 2, // 2 = doble página, 1 = una página
  zoom: 1.2,
  bgColor: '#fafafa',
  animSpeed: 1 // multiplicador para la duración de la animación
};

/********** Loading Text Animation **********/
const loadingMessages = [
  "Vistiendo a las chicas mágicas...",
  "Ajustando viajes en el tiempo...",
  "Maquillando a Miyuki...",
  "Preparando los fur-suits...",
  "Preparando las faldas..."
];
let messageIndex = 0;
const loadingTextElem = document.getElementById("loadingText");
setInterval(() => {
  messageIndex = (messageIndex + 1) % loadingMessages.length;
  loadingTextElem.textContent = loadingMessages[messageIndex];
}, 10000);

/********** Variables Globales de PDF **********/
let pdfDoc = null;
let totalPages = 0;
let currentSpread = 0; // se calcula desde el final (lectura inversa)
let pageCache = [];

const canvasLeft = document.getElementById('canvasLeft');
const canvasRight = document.getElementById('canvasRight');
const ctxLeft = canvasLeft.getContext('2d');
const ctxRight = canvasRight.getContext('2d');

/********** Elementos de Configuración **********/
const settingsButton = document.getElementById('settingsButton');
const settingsMenu = document.getElementById('settingsMenu');
const closeSettings = document.getElementById('closeSettings');
const readingModeSelect = document.getElementById('readingMode');
const zoomRange = document.getElementById('zoomRange');
const bgColorPicker = document.getElementById('bgColorPicker');
const animSpeedInput = document.getElementById('animSpeed');

/********** Eventos del Menú de Configuración **********/
settingsButton.addEventListener('click', () => {
  settingsMenu.style.display = 'block';
});
closeSettings.addEventListener('click', () => {
  settingsMenu.style.display = 'none';
});
readingModeSelect.addEventListener('change', (e) => {
  config.readingMode = parseInt(e.target.value);
  renderSpread();
});
zoomRange.addEventListener('input', (e) => {
  config.zoom = parseFloat(e.target.value);
  renderSpread();
});
bgColorPicker.addEventListener('input', (e) => {
  config.bgColor = e.target.value;
  document.getElementById('viewerContainer').style.backgroundColor = config.bgColor;
});
animSpeedInput.addEventListener('input', (e) => {
  config.animSpeed = parseFloat(e.target.value);
});

/********** Actualizar Indicadores (Superior e Inferior) **********/
function updatePageInfo() {
  const topInfo = document.getElementById('topPageInfo');
  const bottomInfo = document.getElementById('bottomPageInfo');
  if (config.readingMode === 1) {
    let pageNum = totalPages - currentSpread;
    let info = `Página ${pageNum} de ${totalPages}`;
    topInfo.textContent = info;
    bottomInfo.textContent = info;
  } else {
    let rightPage = totalPages - currentSpread;
    let leftPage = totalPages - currentSpread - 1;
    let info = leftPage >= 1 ? `Páginas ${leftPage} - ${rightPage} de ${totalPages}` : `Página ${rightPage} de ${totalPages}`;
    topInfo.textContent = info;
    bottomInfo.textContent = info;
  }
}

/********** Obtener Parámetros de URL **********/
function getQueryParam(param) {
  const params = new URLSearchParams(window.location.search);
  return params.get(param);
}
const issueId = getQueryParam('id');
if (!issueId) {
  window.location.href = 'rensai.html';
}

/********** Cargar PDF (issues.json) **********/
async function fetchIssues() {
  try {
    const resp = await fetch('issues.json');
    if (!resp.ok) throw new Error('Error al cargar issues.json');
    return await resp.json();
  } catch (err) {
    console.error(err);
    return [];
  }
}
async function getIssuePDFPath(id) {
  const issues = await fetchIssues();
  const item = issues.find(i => i.id === id);
  if (!item) window.location.href = 'rensai.html';
  const base = item.path.substring(0, item.path.lastIndexOf('/'));
  return base + '/Issue.pdf';
}

/********** Preload de Páginas (Carga Concurrente) **********/
async function preloadAllPages() {
  const promises = [];
  for (let p = 1; p <= totalPages; p++) {
    promises.push(
      pdfDoc.getPage(p).then(page => {
        const viewport = page.getViewport({ scale: config.zoom });
        const offscreen = document.createElement('canvas');
        offscreen.width = viewport.width;
        offscreen.height = viewport.height;
        const offscreenCtx = offscreen.getContext('2d');
        return page.render({ canvasContext: offscreenCtx, viewport: viewport }).promise.then(() => ({
          dataURL: offscreen.toDataURL(),
          width: offscreen.width,
          height: offscreen.height
        }));
      })
    );
  }
  const pagesData = await Promise.all(promises);
  pagesData.forEach((data, index) => {
    pageCache[index + 1] = data;
  });
}

/********** Escalar Imagen sin Deformar **********/
function getScaledDimensions(cacheObj, availW, availH) {
  const origW = cacheObj.width;
  const origH = cacheObj.height;
  const scaleFactor = Math.min(availW / origW, availH / origH);
  return { width: origW * scaleFactor, height: origH * scaleFactor };
}

/********** Renderizar Spread **********/
async function renderSpread() {
  if (currentSpread >= totalPages) {
    showSurvey();
    return;
  }
  const container = document.getElementById('viewerContainer');
  const availW = container.clientWidth;
  const availH = container.clientHeight;
  
  // En móviles se usa siempre el modo de una página (para swipe)
  if (window.innerWidth < 600) {
    canvasLeft.style.display = 'none';
    canvasRight.style.display = 'block';
    const pdfPage = totalPages - currentSpread;
    if (pdfPage >= 1 && pageCache[pdfPage]) {
      const dims = getScaledDimensions(pageCache[pdfPage], availW, availH);
      canvasRight.width = dims.width;
      canvasRight.height = dims.height;
      ctxRight.clearRect(0, 0, dims.width, dims.height);
      let img = new Image();
      img.onload = () => {
        ctxRight.drawImage(img, 0, 0, dims.width, dims.height);
      };
      img.src = pageCache[pdfPage].dataURL;
    } else {
      ctxRight.clearRect(0, 0, canvasRight.width, canvasRight.height);
    }
  } else {
    // En Desktop: respetar el modo configurado
    if (config.readingMode === 1) {
      canvasLeft.style.display = 'none';
      canvasRight.style.display = 'block';
      const pdfPage = totalPages - currentSpread;
      if (pdfPage >= 1 && pageCache[pdfPage]) {
        const dims = getScaledDimensions(pageCache[pdfPage], availW, availH);
        canvasRight.width = dims.width;
        canvasRight.height = dims.height;
        ctxRight.clearRect(0, 0, dims.width, dims.height);
        let img = new Image();
        img.onload = () => {
          ctxRight.drawImage(img, 0, 0, dims.width, dims.height);
        };
        img.src = pageCache[pdfPage].dataURL;
      } else {
        ctxRight.clearRect(0, 0, canvasRight.width, canvasRight.height);
      }
    } else {
      // Modo doble página
      canvasLeft.style.display = 'block';
      canvasRight.style.display = 'block';
      const gap = 20;
      const halfW = (availW - gap) / 2;
      const pdfRight = totalPages - currentSpread;
      const pdfLeft = totalPages - currentSpread - 1;
      if (pdfRight >= 1 && pageCache[pdfRight]) {
        const dims = getScaledDimensions(pageCache[pdfRight], halfW, availH);
        canvasRight.width = dims.width;
        canvasRight.height = dims.height;
        ctxRight.clearRect(0, 0, dims.width, dims.height);
        let imgR = new Image();
        imgR.onload = () => {
          ctxRight.drawImage(imgR, 0, 0, dims.width, dims.height);
        };
        imgR.src = pageCache[pdfRight].dataURL;
      } else {
        ctxRight.clearRect(0, 0, canvasRight.width, canvasRight.height);
      }
      if (pdfLeft >= 1 && pageCache[pdfLeft]) {
        const dims = getScaledDimensions(pageCache[pdfLeft], halfW, availH);
        canvasLeft.width = dims.width;
        canvasLeft.height = dims.height;
        ctxLeft.clearRect(0, 0, dims.width, dims.height);
        let imgL = new Image();
        imgL.onload = () => {
          ctxLeft.drawImage(imgL, 0, 0, dims.width, dims.height);
        };
        imgL.src = pageCache[pdfLeft].dataURL;
      } else {
        ctxLeft.clearRect(0, 0, canvasLeft.width, canvasLeft.height);
      }
    }
  }
  updatePageInfo();
}

/********** Navegación (Desktop) **********/
function nextSpread() {
  if (config.readingMode === 1) {
    if (currentSpread + 1 < totalPages) {
      currentSpread++;
      renderSpread();
    }
  } else {
    if (currentSpread + 2 < totalPages) {
      currentSpread += 2;
      renderSpread();
    } else {
      currentSpread = totalPages;
      renderSpread();
    }
  }
}
function prevSpread() {
  if (config.readingMode === 1) {
    if (currentSpread - 1 >= 0) {
      currentSpread--;
      renderSpread();
    }
  } else {
    if (currentSpread - 2 >= 0) {
      currentSpread -= 2;
      renderSpread();
    }
  }
}

/********** Mostrar Encuesta al Final **********/
function showSurvey() {
  fetch(`encuestas/${issueId}.json`)
    .then(resp => {
      if (!resp.ok) throw new Error("Encuesta no encontrada");
      return resp.json();
    })
    .then(data => {
      const surveyLink = data.surveyLink;
      const container = document.getElementById('viewerContainer');
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; width: 100%;">
          <h1>¡Gracias por leer!</h1>
          <p>Para ayudarnos a mejorar, por favor completa la encuesta de satisfacción.</p>
          <button onclick="window.location.href='${surveyLink}'" 
            style="font-size: 1.2rem; padding: 0.75rem 1.5rem; border: none; background: #820000; color: #fff; border-radius: 4px; cursor: pointer;">
            Realizar Encuesta
          </button>
          <br><br>
          <button onclick="window.location.href='rensai-details.html?id=${issueId}'" 
            style="font-size: 1rem; padding: 0.5rem 1rem; border: none; background: #ccc; color: #333; border-radius: 4px; cursor: pointer;">
            Volver
          </button>
        </div>
      `;
      document.getElementById('topPageInfo').textContent = '';
    })
    .catch(err => {
      console.error(err);
      const container = document.getElementById('viewerContainer');
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; width: 100%;">
          <h1>¡Gracias por leer!</h1>
          <p>No se encontró la encuesta. Inténtalo más tarde.</p>
        </div>
      `;
    });
}

/********** Inicializar Lector PDF **********/
async function initViewer() {
  try {
    const pdfPath = await getIssuePDFPath(issueId);
    const task = pdfjsLib.getDocument(pdfPath);
    pdfDoc = await task.promise;
    totalPages = pdfDoc.numPages;
    await preloadAllPages();
    currentSpread = 0;
    renderSpread();
    document.getElementById('loadingOverlay').style.display = 'none';
    const directionOverlay = document.getElementById('directionOverlay');
    directionOverlay.style.display = 'flex';
    setTimeout(() => {
      directionOverlay.style.display = 'none';
    }, 3000);
  } catch (error) {
    console.error("Error al inicializar el visor:", error);
  }
}
initViewer();

// Asignar acción al botón "Volver"
document.getElementById('backButton').addEventListener('click', () => {
  window.location.href = 'rensai-details.html?id=' + issueId;
});

/********** Swipe en Móviles con Animación de Paso de Página **********/
if (window.innerWidth < 600) {
  let touchStartX = 0;
  let touchCurrentX = 0;
  let isSwiping = false;
  const swipeThreshold = 50; // píxeles para disparar el cambio de página
  const viewerContainer = document.getElementById('viewerContainer');
  
  viewerContainer.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    isSwiping = true;
    canvasRight.style.transition = 'none';
  });
  
  viewerContainer.addEventListener('touchmove', (e) => {
    if (!isSwiping) return;
    touchCurrentX = e.touches[0].clientX;
    let deltaX = touchCurrentX - touchStartX;
    // Para lectura japonesa, se espera swipe de derecha a izquierda (deltaX negativo)
    if (deltaX < 0) {
      canvasRight.style.transform = `translateX(${deltaX}px)`;
    }
  });
  
  viewerContainer.addEventListener('touchend', () => {
    if (!isSwiping) return;
    let deltaX = touchCurrentX - touchStartX;
    // Duración de la animación en función de la distancia y la velocidad configurada
    canvasRight.style.transition = `transform ${Math.abs(deltaX)/200 * config.animSpeed}s ease-out`;
    if (Math.abs(deltaX) > swipeThreshold) {
      canvasRight.style.transform = `translateX(-100%)`;
      setTimeout(() => {
        canvasRight.style.transition = 'none';
        canvasRight.style.transform = 'translateX(0)';
        nextSpread();
      }, Math.abs(deltaX)/200 * config.animSpeed * 1000);
    } else {
      canvasRight.style.transform = 'translateX(0)';
    }
    isSwiping = false;
  });
}

// Re-renderizar al cambiar el tamaño de la ventana
window.addEventListener('resize', renderSpread);
