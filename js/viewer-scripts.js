/**********************************
 * CONFIGURACIÓN Y VARIABLES GLOBALES
 **********************************/
const preRenderScale = 3; // Factor alto para pre-renderizar (garantiza alta resolución)
let config = {
  readingMode: 2,  // 2 = doble página, 1 = una página (en móvil se fuerza 1)
  zoom: 1,         // 1 = “fit-to-container”. El zoom se aplica multiplicando sobre el fit
  bgColor: '#fafafa',
  animSpeed: 1     // Multiplicador para la duración de la animación (en segundos)
};

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

let pdfDoc = null,
    totalPages = 0,
    currentSpread = 0; // Índice de lectura (0 = primer spread)
let pageCache = [];   // Aquí se almacenan los datos pre-renderizados (objetos con dataURL, width, height)

// Elementos de canvas
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
const animSpeedInput = document.getElementById('animSpeed');

/**********************************
 * EVENTOS DEL MENÚ DE CONFIGURACIÓN
 **********************************/
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
animSpeedInput.addEventListener('input', () => {
  config.animSpeed = parseFloat(animSpeedInput.value);
});

/**********************************
 * ACTUALIZAR CONTADORES (MOSTRAR NÚMERO DE PÁGINA)
 * Se muestran en orden de lectura natural: 
 * - En modo simple: contador = currentSpread+1, total = totalPages.
 * - En modo doble: contador = currentSpread+1, total = Math.ceil(totalPages/2).
 **********************************/
function updatePageInfo() {
  const topInfo = document.getElementById('topPageInfo');
  const bottomInfo = document.getElementById('bottomPageInfo');
  let displayNum, totalDisplay;
  if (window.innerWidth < 600 || config.readingMode === 1) {
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
 * EDITAR CONTADOR AL HACER CLICK (Saltar a un número específico)
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
          if (window.innerWidth < 600 || config.readingMode === 1) {
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
 * OBTENCIÓN DE PARÁMETROS URL (issueId)
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
 * PRE-RENDERIZADO DE TODAS LAS PÁGINAS
 * Se renderiza cada página a un alto preRenderScale para asegurar alta calidad.
 **********************************/
async function preRenderAllPages() {
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

/**********************************
 * FUNCION PARA RENDERIZAR UNA PÁGINA EN UN CANVAS
 * Se calcula el “fit scale” para que la imagen (pre-renderizada a alta resolución)
 * se ajuste completamente al contenedor sin deformar.
 **********************************/
function renderImageOnCanvas(imageData, canvas, availW, availH) {
  let img = new Image();
  img.onload = () => {
    // Resetear transformaciones
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Calcular factor para ajustar la imagen (fit-to-container)
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
 * - En modo simple (o en móvil): se muestra una única página.
 * - En modo doble: se muestran dos páginas (derecha e izquierda) usando la lectura invertida.
 **********************************/
function renderSpread() {
  // En modo simple, la condición de final es currentSpread >= totalPages
  // En modo doble, es currentSpread >= Math.ceil(totalPages / 2)
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
    // Modo simple: mostrar la página: número = totalPages - currentSpread
    canvasLeft.style.display = 'none';
    canvasRight.style.display = 'block';
    let pdfPageNum = totalPages - currentSpread;
    if (pdfPageNum >= 1 && pageCache[pdfPageNum]) {
      renderImageOnCanvas(pageCache[pdfPageNum], canvasRight, availW, availH);
    } else {
      const ctx = canvasRight.getContext('2d');
      ctx.clearRect(0, 0, canvasRight.width, canvasRight.height);
    }
  } else {
    // Modo doble: 
    canvasLeft.style.display = 'block';
    canvasRight.style.display = 'block';
    let gap = 20;
    let availableWForEach = (availW - gap) / 2;
    let rightPdf = totalPages - (currentSpread * 2);
    let leftPdf = rightPdf - 1;
    if (rightPdf >= 1 && pageCache[rightPdf]) {
      renderImageOnCanvas(pageCache[rightPdf], canvasRight, availableWForEach, availH);
    } else {
      const ctx = canvasRight.getContext('2d');
      ctx.clearRect(0, 0, canvasRight.width, canvasRight.height);
    }
    if (leftPdf >= 1 && pageCache[leftPdf]) {
      renderImageOnCanvas(pageCache[leftPdf], canvasLeft, availableWForEach, availH);
    } else {
      const ctx = canvasLeft.getContext('2d');
      ctx.clearRect(0, 0, canvasLeft.width, canvasLeft.height);
    }
  }
  updatePageInfo();
}

/**********************************
 * NAVEGACIÓN (Desktop)
 * Debido a la lectura japonesa, el botón izquierdo (prevArrow) avanza (suma currentSpread)
 * y el botón derecho (nextArrow) retrocede (resta currentSpread)
 **********************************/
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

/**********************************
 * ASIGNAR EVENTOS A LOS BOTONES (Desktop)
 **********************************/
if (window.innerWidth >= 600) {
  document.getElementById('prevArrow').addEventListener('click', nextSpread);
  document.getElementById('nextArrow').addEventListener('click', prevSpread);
}

/**********************************
 * MOSTRAR ENCUESTA AL FINAL
 **********************************/
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

// Botón "Volver"
document.getElementById('backButton').addEventListener('click', () => {
  window.location.href = 'rensai-details.html?id=' + issueId;
});

/**********************************
 * SWIPE EN MÓVILES CON ANIMACIÓN
 * Se utiliza touch events para mover el canvasRight; al soltar se decide si se avanza o retrocede.
 **********************************/
if (window.innerWidth < 600) {
  let touchStartX = 0, touchCurrentX = 0, isSwiping = false;
  const swipeThreshold = 50; // píxeles para disparar cambio
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
    if (deltaX < 0) {  // sólo para swipe de derecha a izquierda
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

// Re-renderizar en resize
window.addEventListener('resize', renderSpread);
