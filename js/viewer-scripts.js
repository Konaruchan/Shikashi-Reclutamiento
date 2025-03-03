/* Configurar pdf.js */
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

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
let currentSpread = 0; // Desktop: 2 páginas; Móvil: 1 página
const pdfScale = 1.2;
let pageCache = [];

const canvasLeft = document.getElementById('canvasLeft');
const canvasRight = document.getElementById('canvasRight');
const ctxLeft = canvasLeft.getContext('2d');
const ctxRight = canvasRight.getContext('2d');

/********** Detectar Mobile **********/
function isMobile() {
  return window.innerWidth < 600;
}

/********** Obtener parámetros URL **********/
function getQueryParam(param) {
  const params = new URLSearchParams(window.location.search);
  return params.get(param);
}
const issueId = getQueryParam('id');
if (!issueId) {
  window.location.href = 'rensai.html';
}

/********** Obtener PDF Path de issues.json **********/
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

/********** Preload de páginas con carga concurrente **********/
async function preloadAllPages() {
  const promises = [];
  for (let p = 1; p <= totalPages; p++) {
    promises.push(
      pdfDoc.getPage(p).then(page => {
        const viewport = page.getViewport({ scale: pdfScale });
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

/********** Escalar imagen manteniendo aspect ratio **********/
function getScaledDimensions(cacheObj, availW, availH) {
  const origW = cacheObj.width;
  const origH = cacheObj.height;
  const scaleFactor = Math.min(availW / origW, availH / origH);
  return { width: origW * scaleFactor, height: origH * scaleFactor };
}

/********** Indicador Editable **********/
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
          if (isMobile()) {
            if (num >= 1 && num <= totalPages) {
              currentSpread = totalPages - num;
              renderSpread();
            }
          } else {
            const totalSpreads = Math.ceil(totalPages / 2);
            if (num >= 1 && num <= totalSpreads) {
              currentSpread = totalPages - (num * 2) + 1;
              if (currentSpread < 0) currentSpread = 0;
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

function updatePageInfo() {
  const topInfo = document.getElementById('topPageInfo');
  if (isMobile()) {
    const disp = totalPages - currentSpread;
    topInfo.textContent = `Página ${disp} de ${totalPages}`;
  } else {
    const rightPage = totalPages - currentSpread;
    const leftPage = totalPages - currentSpread - 1;
    let info;
    if (leftPage >= 1) {
      info = `Páginas ${leftPage} - ${rightPage} de ${totalPages}`;
    } else {
      info = `Página ${rightPage} de ${totalPages}`;
    }
    topInfo.textContent = info;
  }
}

/********** Renderizar Spread **********/
async function renderSpread() {
  // Si se excede el número de páginas, muestra la encuesta
  if (currentSpread >= totalPages) {
    showSurvey();
    return;
  }
  if (isMobile()) {
    canvasLeft.style.display = 'none';
    canvasRight.style.display = 'block';
    const container = document.getElementById('viewerContainer');
    const availW = container.clientWidth;
    const availH = container.clientHeight;
    const pdfPage = totalPages - currentSpread; // Lectura inversa
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
    // Desktop: Mostrar dos páginas
    const container = document.getElementById('viewerContainer');
    const availW = container.clientWidth;
    const availH = container.clientHeight;
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
  updatePageInfo();
}

/********** Navegación **********/
function nextSpread() {
  if (isMobile()) {
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
  if (isMobile()) {
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
// Asignar eventos de navegación según dispositivo
if (!isMobile()) {
  document.getElementById('prevArrow').addEventListener('click', nextSpread);
  document.getElementById('nextArrow').addEventListener('click', prevSpread);
} else {
  document.getElementById('mobilePrev').addEventListener('click', nextSpread);
  document.getElementById('mobileNext').addEventListener('click', prevSpread);
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

// Actualizar la visualización al cambiar el tamaño de la ventana
window.addEventListener('resize', renderSpread);

// Asignar acción al botón "Volver"
document.getElementById('backButton').addEventListener('click', () => {
  window.location.href = 'rensai-details.html?id=' + issueId;
});
