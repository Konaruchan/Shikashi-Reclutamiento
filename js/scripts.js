// Función principal para cargar y parsear los artículos
async function fetchArticles() {
    try {
        // Paso 1: Cargar la lista de carpetas dentro de "articulos/"
        const response = await fetch('articulos/');
        if (!response.ok) {
            throw new Error(`Error al cargar la carpeta 'articulos/': ${response.status}`);
        }
        const data = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(data, 'text/html');
        const links = doc.querySelectorAll('a');

        // Filtrar solo las carpetas válidas
        const folders = [];
        links.forEach(link => {
            const folderPath = link.getAttribute('href');
            if (folderPath.endsWith('/') && folderPath !== '/') {
                folders.push(folderPath);
            }
        });

        // Paso 2: Leer los archivos Markdown dentro de cada carpeta
        const articles = [];
        for (const folder of folders) {
            const article = await loadArticleContent(folder);
            if (article) {
                articles.push(article);
            }
        }

        // Paso 3: Exponer los datos para que los HTMLs puedan usarlos
        window.articlesData = articles;
    } catch (error) {
        console.error('Error al cargar los artículos:', error);
        window.articlesData = []; // Asegurarse de que haya un valor por defecto
    }
}

// Función para cargar y parsear el contenido de un artículo
async function loadArticleContent(folderPath) {
    try {
        // Leer el archivo Markdown
        const markdownResponse = await fetch(`${folderPath}articulo.md`);
        if (!markdownResponse.ok) {
            throw new Error(`Error al cargar el archivo Markdown: ${markdownResponse.status}`);
        }
        const markdownText = await markdownResponse.text();

        // Parsear el frontmatter y el contenido
        const frontmatterRegex = /^---\s*([\s\S]*?)\s*---\s*([\s\S]*)/;
        const match = markdownText.match(frontmatterRegex);
        if (!match) {
            throw new Error('No se encontró el frontmatter en el archivo Markdown.');
        }

        const frontmatter = YAML.parse(match[1]);
        const content = marked.parse(match[2]);

        // Obtener el nombre de la carpeta como ID interno del artículo
        const folderName = folderPath.split('/').filter(Boolean)[0];

        // Devolver el artículo parseado
        return {
            ...frontmatter,
            content,
            path: folderPath,
            id: folderName
        };
    } catch (error) {
        console.error(`Error al cargar el artículo en la carpeta ${folderPath}:`, error);
        return null; // Devolver null si hay un error
    }
}

// Inicializar la carga de artículos
fetchArticles();
