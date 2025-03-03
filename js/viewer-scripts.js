/***********************
 * Configuración Global
 ***********************/
let config = {
  readingMode: 2, // 2 = doble página, 1 = una página
  zoom: 1,        // 1 = ajuste exacto al contenedor; se multiplica sobre el "fit"
  bgColor: '#fafafa',
  animSpeed: 1    // multiplicador para la duración de la animación
};

/***********************
 * Inicialización de PDF.js
 ***********************/
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

/***********************
 * Loading Text Animation
 ***********************/
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

/***********************
 * Variables Globales del PDF
 ***********************/
let pdfDoc = null,
    totalPages = 0,
    currentSpread = 0; // 0 = primer spread leído
let pdfPages = [];    // Almacenamos los objetos de página (sin render)

// Elementos Canvas y contextos
const canvasLeft = document.getElementById('canvasLeft');
const canvasRight = document.getElementById('canvasRight');
const ctxLeft = canvasLeft.getContext('2d');
const ctxRight = canvasRight.getContext('2d');

/***********************
 * Elementos de Configuración
 ***********************/
const settingsButton = document.getElementById('settingsButton');
const settingsMenu = document.getElementById('settingsMenu');
const closeSettings = document.getElementById('closeSettings');
const readingModeSelect = document.getElementById('readingMode');
const zoomRange = document.getElementById('zoomRange');
const bgColorPicker = document.getElementById('bgColorPicker');
const animSpeedInput = document.getElementById('animSpeed');

/***********************
 * Eventos del Menú de Configuración
 ***********************/
settingsButton.addEventListener('click', () => {
  settingsMenu.style.display = 'block';
});
closeSettings.addEventListener('click', () => {
  settingsMenu.style.display = 'none';
});
readingModeSelect.addEventListener('change', () => {
  config.readingMode = parseInt(readingModeSelect.value);
  renderSpread();
});
zoomRange.addEventListener('input', async () => {
  config.zoom = parseFloat(zoomRange.value);
  // Al cambiar zoom, re-renderizamos sin necesidad de recargar las páginas
  renderSpread();
});
bgColorPicker.addEventListener('input', () => {
  config.bgColor = bgColorPicker.value;
  document.getElementById('viewerContainer').style.backgroundColor = config.bgColor;
});
animSpeedInput.addEventListener('input', () => {
  config.animSpeed = parseFloat(animSpeedInput.value);
});

/***********************
 * Actualizar Indicadores de Página
 * Se muestran en orden de lectura: spreadDisplay = currentSpread+1, total = (modo simple: totalPages, doble: Math.ceil(totalPages/2))
 ***********************/
function updatePageInfo() {
  const topInfo = document.getElementById('topPageInfo');
  const bottomInfo = document.getElementById('bottomPageInfo');
  let spreadDisplay, totalSpreads;
  if (window.innerWidth < 600 || config.readingMode === 1) {
    spreadDisplay = currentSpread + 1;
    totalSpreads = totalPages;
  } else {
    spreadDisplay = currentSpread + 1;
    totalSpreads = Math.ceil(totalPages / 2);
  }
  let info = `Página ${spreadDisplay} de ${totalSpreads}`;
  topInfo.textContent = info;
  bottomInfo.textContent = info;
}

/***********************
 * Edición del Indicador (al hacer click)
 ***********************/
function makePageInfoEditable() {
  const topInfo = document.getElementById('topPageInfo');
  topInfo.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'editable-input';
    input.placeholder = 'Ir a...';
    topInfo.textContent = "";
    topInfo.appendChild(input);
    input.focus();
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        let num = parseInt(input.value);
        if (!isNaN(num)) {
          if (window.innerWidth < 600 || config.readingMode === 1) {
            if (num >= 1 && num <= totalPages) {
              currentSpread = num - 1;
              renderSpread();
            }
          } else {
            let totalSpreads = Math.ceil(totalPages / 2);
            if (num >= 1 && num <= totalSpreads) {
              currentSpread = num - 1;
              renderSpread();
            }
          }
        }
        topInfo.removeChild(input);
        updatePageInfo();
      }
    });
    input.addEventListener('blur', () => {
      if (topInfo.contains(input)) {
        topInfo.removeChild(input);
        updatePageInfo();
      }
    });
  });
}
makePageInfoEditable();

/***********************
 * Obtener Parámetros de URL
 ***********************/
function getQueryParam(param) {
  const params = new URLSearchParams(window.location.search);
  return params.get(param);
}
const issueId = getQueryParam('id');
if (!issueId) {
  window.location.href = 'rensai.html';
}

/***********************
 * Cargar PDF (issues.json)
 ***********************/
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

/***********************
 * Preload de Páginas: Almacenamos los objetos PDF sin renderizar
 ***********************/
async function preloadAllPages() {
  pdfPages = [];
  for (let p = 1; p <= totalPages; p++) {
    pdfPages[p] = await pdfDoc.getPage(p);
  }
}

/***********************
 * Función para Renderizar una Página en un Canvas con “fit-to-container”
 * Calcula el factor base para que la página se ajuste y luego lo multiplica por config.zoom.
 ***********************/
async function renderPage(pageObj, canvas, context, availW, availH) {
  // Reiniciar transformaciones
  context.setTransform(1, 0, 0, 1, 0, 0);
  // Obtener dimensiones originales de la página (escala 1)
  let baseViewport = pageObj.getViewport({ scale: 1 });
  // Para doble página, el ancho disponible se pasa ya reducido
  let baseScale = Math.min(availW / baseViewport.width, availH / baseViewport.height);
  let finalScale = baseScale * config.zoom;
  let viewport = pageObj.getViewport({ scale: finalScale });
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  context.clearRect(0, 0, canvas.width, canvas.height);
  await pageObj.render({ canvasContext: context, viewport: viewport }).promise;
}

/***********************
 * Renderizar Spread
 * En modo simple (o móvil): se muestra la página: PDF page = totalPages - currentSpread.
 * En modo doble: se muestran dos páginas: derecha = totalPages - (currentSpread*2) y izquierda = (totalPages - (currentSpread*2)) - 1.
 ***********************/
async function renderSpread() {
  // Condición de final: si se han leído todas las páginas, se muestra la encuesta.
  if ((window.innerWidth < 600 || config.readingMode === 1) && currentSpread >= totalPages) {
    showSurvey();
    return;
  }
  if (config.readingMode === 2 && currentSpread >= Math.ceil(totalPages / 2)) {
    showSurvey();
    return;
  }
  const container = document.getElementById('viewerContainer');
  const availW = container.clientWidth;
  const availH = container.clientHeight;
  
  if (window.innerWidth < 600 || config.readingMode === 1) {
    // Modo simple / móvil: se renderiza una sola página
    canvasLeft.style.display = 'none';
    canvasRight.style.display = 'block';
    let pdfPageNum = totalPages - currentSpread; // Lectura invertida
    if (pdfPageNum >= 1 && pdfPages[pdfPageNum]) {
      await renderPage(pdfPages[pdfPageNum], canvasRight, ctxRight, availW, availH);
    } else {
      ctxRight.clearRect(0, 0, canvasRight.width, canvasRight.height);
    }
  } else {
    // Modo doble página:
    canvasLeft.style.display = 'block';
    canvasRight.style.display = 'block';
    let gap = 20;
    let availableWForEach = (availW - gap) / 2;
    let rightPdf = totalPages - (currentSpread * 2);
    let leftPdf = rightPdf - 1;
    if (rightPdf >= 1 && pdfPages[rightPdf]) {
      await renderPage(pdfPages[rightPdf], canvasRight, ctxRight, availableWForEach, availH);
    } else {
      ctxRight.clearRect(0, 0, canvasRight.width, canvasRight.height);
    }
    if (leftPdf >= 1 && pdfPages[leftPdf]) {
      await renderPage(pdfPages[leftPdf], canvasLeft, ctxLeft, availableWForEach, availH);
    } else {
      ctxLeft.clearRect(0, 0, canvasLeft.width, canvasLeft.height);
    }
  }
  updatePageInfo();
}

/***********************
 * Navegación (Desktop)
 * En sistema japonés: el botón izquierdo AVANZA (pasa a la siguiente lectura)
 ***********************/
function nextSpread() {
  if (window.innerWidth < 600 || config.readingMode === 1) {
    if (currentSpread < totalPages - 1) {
      currentSpread++;
      renderSpread();
    }
  } else {
    let maxSpread = Math.ceil(totalPages / 2);
    if (currentSpread < maxSpread - 1) {
      currentSpread++;
      renderSpread();
    }
  }
}
function prevSpread() {
  if (currentSpread > 0) {
    currentSpread--;
    renderSpread();
  }
}

/***********************
 * Asignar Eventos a Botones (Desktop)
 * En escritorio: la flecha izquierda llama a nextSpread y la derecha a prevSpread
 ***********************/
if (window.innerWidth >= 600) {
  document.getElementById('prevArrow').addEventListener('click', nextSpread);
  document.getElementById('nextArrow').addEventListener('click', prevSpread);
}

/***********************
 * Mostrar Encuesta al Final
 ***********************/
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

/***********************
 * Inicializar Lector PDF
 ***********************/
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

// Acción del botón "Volver"
document.getElementById('backButton').addEventListener('click', () => {
  window.location.href = 'rensai-details.html?id=' + issueId;
});

/***********************
 * Swipe en Móviles con Animación de Paso de Página
 * Se anima el canvasRight según el gesto; al soltar, se determina si se avanza o retrocede.
 ***********************/
if (window.innerWidth < 600) {
  let touchStartX = 0, touchCurrentX = 0, isSwiping = false;
  const swipeThreshold = 50; // píxeles para disparar el cambio
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
    // Solo movimientos de derecha a izquierda (deltaX negativo)
    if (deltaX < 0) {
      canvasRight.style.transform = `translateX(${deltaX}px)`;
    }
  });
  
  viewerContainer.addEventListener('touchend', () => {
    if (!isSwiping) return;
    let deltaX = touchCurrentX - touchStartX;
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
