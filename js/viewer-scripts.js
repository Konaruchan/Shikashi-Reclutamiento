/**********************************
 * GESTIÓN DE ERRORES: Mostrar cualquier error (no advertencia)
 * como globo de texto en la esquina superior izquierda.
 **********************************/
window.onerror = function(message, source, lineno, colno, error) {
  let errorDiv = document.getElementById('errorBubble');
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.id = 'errorBubble';
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '10px';
    errorDiv.style.left = '10px';
    errorDiv.style.backgroundColor = 'rgba(255,0,0,0.8)';
    errorDiv.style.color = '#fff';
    errorDiv.style.padding = '5px 10px';
    errorDiv.style.borderRadius = '4px';
    errorDiv.style.zIndex = '9999';
    document.body.appendChild(errorDiv);
  }
  errorDiv.textContent = `Error: ${message} (${source}:${lineno}:${colno})`;
  setTimeout(() => {
    if(errorDiv) errorDiv.remove();
  }, 5000);
  return false;
};

/**********************************
 * CONFIGURACIÓN Y VARIABLES GLOBALES
 **********************************/
const isMobile = window.innerWidth < 600;
// Para móviles usamos un factor menor, para acelerar la carga
const preRenderScale = isMobile ? 2 : 3;
let config = {
  readingMode: 2,  // 2 = doble página, 1 = una página (en móvil se fuerza 1)
  zoom: 1,         // 1 = ajuste perfecto al contenedor (multiplica sobre el "fit")
  bgColor: '#fafafa'
};

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

let pdfDoc = null,
    totalPages = 0,
    currentSpread = 0; // Índice de lectura (0 = primer spread)
let pageCache = [];   // Aquí se almacenan los datos pre-renderizados (dataURL, width, height)

// Elementos canvas y contextos
const canvasLeft = document.getElementById('canvasLeft');
const canvasRight = document.getElementById('canvasRight');
const ctxLeft = canvasLeft.getContext('2d');
const ctxRight = canvasRight.getContext('2d');

/**********************************
 * ELEMENTOS DE CONFIGURACIÓN
 **********************************/
const settingsButton = document.getElementById('settingsButton');
const settingsMenu = document.getElementById('settingsMenu');
const closeSettings = document.getElementById('closeSettings');
const readingModeSelect = document.getElementById('readingMode');
const zoomRange = document.getElementById('zoomRange');
const bgColorPicker = document.getElementById('bgColorPicker');

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
zoomRange.addEventListener('input', () => {
  config.zoom = parseFloat(zoomRange.value);
  renderSpread();
});
bgColorPicker.addEventListener('input', () => {
  config.bgColor = bgColorPicker.value;
  document.getElementById('viewerContainer').style.backgroundColor = config.bgColor;
});

/**********************************
 * ACTUALIZAR CONTADORES DE PÁGINA
 **********************************/
function updatePageInfo() {
  const topInfo = document.getElementById('topPageInfo');
  const bottomInfo = document.getElementById('bottomPageInfo');
  let displayNum, totalDisplay;
  if (isMobile || config.readingMode === 1) {
    displayNum = currentSpread + 1;
    totalDisplay = totalPages;
  } else {
    displayNum = currentSpread + 1;
    totalDisplay = Math.ceil(totalPages / 2);
  }
  let info = `Página ${displayNum} de ${totalDisplay}`;
  topInfo.textContent = info;
  bottomInfo.textContent = info;
}

/**********************************
 * SALTO DIRECTO: Permitir editar el contador al hacer clic
 **********************************/
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
          if (isMobile || config.readingMode === 1) {
            if (num >= 1 && num <= totalPages) {
              currentSpread = num - 1;
              renderSpread();
            }
          } else {
            let tot = Math.ceil(totalPages / 2);
            if (num >= 1 && num <= tot) {
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

/**********************************
 * OBTENCIÓN DE PARÁMETROS (issueId)
 **********************************/
function getQueryParam(param) {
  const params = new URLSearchParams(window.location.search);
  return params.get(param);
}
const issueId = getQueryParam('id');
if (!issueId) {
  window.location.href = 'rensai.html';
}

/**********************************
 * CARGAR PDF DESDE issues.json
 **********************************/
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

/**********************************
 * PRE-RENDERIZADO
 * En PC se pre-renderizan TODAS las páginas a alta resolución.
 * En móviles se utiliza lazy loading: se pre-renderiza solo la página actual (o si no está en cache, se renderiza al momento).
 **********************************/
async function preRenderAllPages() {
  if (isMobile) {
    // En móviles no pre-renderizamos todo; se cargará la página cuando se necesite.
    await preRenderMobilePage(totalPages - currentSpread);
  } else {
    pageCache = [];
    const promises = [];
    for (let p = 1; p <= totalPages; p++) {
      promises.push(
        pdfDoc.getPage(p).then(page => {
          const viewport = page.getViewport({ scale: preRenderScale });
          const offscreen = document.createElement('canvas');
          offscreen.width = viewport.width;
          offscreen.height = viewport.height;
          const offCtx = offscreen.getContext('2d');
          return page.render({ canvasContext: offCtx, viewport: viewport }).promise.then(() => {
            return {
              dataURL: offscreen.toDataURL(),
              width: offscreen.width,
              height: offscreen.height
            };
          });
        })
      );
    }
    const results = await Promise.all(promises);
    results.forEach((data, i) => {
      pageCache[i + 1] = data;
    });
  }
}

async function preRenderMobilePage(pageNum) {
  if (pageNum < 1) return;
  if (!pageCache[pageNum]) {
    let page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: preRenderScale });
    const offscreen = document.createElement('canvas');
    offscreen.width = viewport.width;
    offscreen.height = viewport.height;
    const offCtx = offscreen.getContext('2d');
    await page.render({ canvasContext: offCtx, viewport: viewport }).promise;
    pageCache[pageNum] = {
      dataURL: offscreen.toDataURL(),
      width: offscreen.width,
      height: offscreen.height
    };
  }
}

/**********************************
 * RENDERIZAR UNA IMAGEN PRE-RENDERIZADA EN UN CANVAS CON "FIT-TO-CONTAINER"
 * Se calcula el factor base para que la imagen se ajuste al área visible y se multiplica por config.zoom.
 **********************************/
function renderImageOnCanvas(imageData, canvas, availW, availH) {
  let img = new Image();
  img.onload = () => {
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    let scaleFit = Math.min(availW / imageData.width, availH / imageData.height);
    let finalScale = scaleFit * config.zoom;
    let drawW = imageData.width * finalScale;
    let drawH = imageData.height * finalScale;
    canvas.width = drawW;
    canvas.height = drawH;
    ctx.clearRect(0, 0, drawW, drawH);
    ctx.drawImage(img, 0, 0, drawW, drawH);
  };
  img.src = imageData.dataURL;
}

/**********************************
 * RENDERIZAR SPREAD
 * - Modo simple (o móvil): se muestra la página: número = totalPages - currentSpread.
 * - Modo doble: se muestran dos páginas (derecha e izquierda) según lectura invertida.
 * Al acercarse al final se muestra un banner de “fin de lectura”.
 **********************************/
async function renderSpread() {
  const container = document.getElementById('viewerContainer');
  const availW = container.clientWidth;
  const availH = container.clientHeight;
  
  if (isMobile || config.readingMode === 1) {
    canvasLeft.style.display = 'none';
    canvasRight.style.display = 'block';
    let pdfPageNum = totalPages - currentSpread;
    if (pdfPageNum >= 1) {
      if (!pageCache[pdfPageNum]) {
        await preRenderMobilePage(pdfPageNum);
      }
      renderImageOnCanvas(pageCache[pdfPageNum], canvasRight, availW, availH);
    } else {
      ctxRight.clearRect(0, 0, canvasRight.width, canvasRight.height);
    }
  } else {
    canvasLeft.style.display = 'block';
    canvasRight.style.display = 'block';
    let gap = 20;
    let availableWForEach = (availW - gap) / 2;
    let rightPdf = totalPages - (currentSpread * 2);
    let leftPdf = rightPdf - 1;
    if (rightPdf >= 1) {
      if (!pageCache[rightPdf]) {
        await preRenderMobilePage(rightPdf);
      }
      renderImageOnCanvas(pageCache[rightPdf], canvasRight, availableWForEach, availH);
    } else {
      ctxRight.clearRect(0, 0, canvasRight.width, canvasRight.height);
    }
    if (leftPdf >= 1) {
      if (!pageCache[leftPdf]) {
        await preRenderMobilePage(leftPdf);
      }
      renderImageOnCanvas(pageCache[leftPdf], canvasLeft, availableWForEach, availH);
    } else {
      ctxLeft.clearRect(0, 0, canvasLeft.width, canvasLeft.height);
    }
  }
  updatePageInfo();
  checkEndBanner();
}

/**********************************
 * MOSTRAR BANNER DE "FIN DE LECTURA"
 **********************************/
function checkEndBanner() {
  let showBanner = false;
  if (isMobile || config.readingMode === 1) {
    if (currentSpread >= totalPages - 2) showBanner = true;
  } else {
    let maxSpread = Math.ceil(totalPages / 2);
    if (currentSpread >= maxSpread - 1) showBanner = true;
  }
  const banner = document.getElementById('surveyBanner');
  banner.style.display = showBanner ? 'block' : 'none';
}

/**********************************
 * NAVEGACIÓN (Desktop)
 * En lectura japonesa: el botón izquierdo (prevArrow) AVANZA y el derecho (nextArrow) RETROCEDE.
 **********************************/
function nextSpread() {
  if (isMobile || config.readingMode === 1) {
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
  } else {
    showExitToast();
  }
}

/**********************************
 * ASIGNAR EVENTOS A LOS BOTONES (Desktop)
 **********************************/
if (!isMobile) {
  document.getElementById('prevArrow').addEventListener('click', nextSpread);
  document.getElementById('nextArrow').addEventListener('click', prevSpread);
}

/**********************************
 * BANNER DE ENCUESTA: Acción de botones
 **********************************/
document.getElementById('surveyButton').addEventListener('click', () => {
  // Redirige a la encuesta (ajusta la URL según necesites)
  window.location.href = `encuestas/${issueId}.json`;
});
document.getElementById('closeBanner').addEventListener('click', () => {
  document.getElementById('surveyBanner').style.display = 'none';
});

/**********************************
 * MOSTRAR UN TOAST DE SALIDA
 **********************************/
function showExitToast() {
  const toast = document.getElementById('exitToast');
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

/**********************************
 * INICIALIZAR EL VISOR PDF
 **********************************/
async function initViewer() {
  try {
    const pdfPath = await getIssuePDFPath(issueId);
    const task = pdfjsLib.getDocument(pdfPath);
    pdfDoc = await task.promise;
    totalPages = pdfDoc.numPages;
    await preRenderAllPages();
    currentSpread = 0;
    await renderSpread();
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

// Botón "Volver": Muestra toast y luego redirige
document.getElementById('backButton').addEventListener('click', () => {
  showExitToast();
  setTimeout(() => {
    window.location.href = 'rensai-details.html?id=' + issueId;
  }, 3000);
});

/**********************************
 * SWIPE EN MÓVILES: Pasar página con gesto
 **********************************/
if (isMobile) {
  let touchStartX = 0, touchCurrentX = 0, isSwiping = false;
  const swipeThreshold = 50; // píxeles mínimos para disparar cambio
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
    if (deltaX < 0) {  // solo swipe de derecha a izquierda
      canvasRight.style.transform = `translateX(${deltaX}px)`;
    }
  });
  
  viewerContainer.addEventListener('touchend', () => {
    if (!isSwiping) return;
    let deltaX = touchCurrentX - touchStartX;
    canvasRight.style.transition = `transform ${Math.abs(deltaX)/200}s ease-out`;
    if (Math.abs(deltaX) > swipeThreshold) {
      canvasRight.style.transform = `translateX(-100%)`;
      setTimeout(() => {
        canvasRight.style.transition = 'none';
        canvasRight.style.transform = 'translateX(0)';
        nextSpread();
      }, Math.abs(deltaX)/200 * 1000);
    } else {
      canvasRight.style.transform = 'translateX(0)';
    }
    isSwiping = false;
  });
}

// Re-renderizar al cambiar el tamaño de la ventana
window.addEventListener('resize', renderSpread);
