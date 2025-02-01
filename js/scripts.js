// Función principal para cargar y parsear los artículos
async function fetchArticles() {
    try {
        // Paso 1: Leer el archivo articulos.txt
        const response = await fetch('articulos.txt');
        if (!response.ok) {
            throw new Error(`Error al cargar el archivo 'articulos.txt': ${response.status}`);
        }
        const data = await response.text();

        // Paso 2: Extraer las rutas de los archivos Markdown
        const articlePaths = data.split('\n').map(line => line.trim()).filter(line => line !== '');

        // Paso 3: Cargar y parsear cada archivo Markdown
        const articles = [];
        for (const path of articlePaths) {
            const article = await loadArticleContent(path);
            if (article) {
                articles.push(article);
            }
        }

        // Paso 4: Exponer los datos para que los HTMLs puedan usarlos
        window.articlesData = articles;
    } catch (error) {
        console.error('Error al cargar los artículos:', error);
        window.articlesData = []; // Asegurarse de que haya un valor por defecto
    }
}

// Función para cargar y parsear el contenido de un artículo
async function loadArticleContent(filePath) {
    try {
        // Leer el archivo Markdown
        const markdownResponse = await fetch(filePath);
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
        const folderName = filePath.split('/')[0];

        // Devolver el artículo parseado
        return {
            ...frontmatter,
            content,
            path: filePath,
            id: folderName
        };
    } catch (error) {
        console.error(`Error al cargar el artículo en la ruta ${filePath}:`, error);
        return null; // Devolver null si hay un error
    }
}

// Inicializar la carga de artículos
fetchArticles();
