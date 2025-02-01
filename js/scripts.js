// Función para cargar y parsear los artículos
async function fetchArticles() {
    try {
        const response = await fetch('articulos/');
        const data = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(data, 'text/html');
        const links = doc.querySelectorAll('a');
        const articles = [];

        links.forEach(link => {
            const articlePath = link.getAttribute('href');
            if (articlePath.endsWith('/') && articlePath !== '/') {
                articles.push(articlePath);
            }
        });

        const articleData = await Promise.all(articles.map(loadArticleContent));
        return articleData.filter(article => article !== null);
    } catch (error) {
        console.error('Error al cargar los artículos:', error);
        return [];
    }
}

async function loadArticleContent(articlePath) {
    try {
        const markdownResponse = await fetch(`${articlePath}articulo.md`);
        const markdownText = await markdownResponse.text();

        // Parsear el contenido Markdown
        const frontmatterRegex = /^---\s*([\s\S]*?)\s*---\s*([\s\S]*)/;
        const match = markdownText.match(frontmatterRegex);
        if (!match) {
            throw new Error('No se encontró el frontmatter en el archivo Markdown.');
        }

        const frontmatter = YAML.parse(match[1]);
        const content = marked.parse(match[2]);

        // Obtener el nombre de la carpeta como nombre interno del artículo
        const folderName = articlePath.split('/').filter(Boolean)[0];

        return { ...frontmatter, content, path: articlePath, id: folderName };
    } catch (error) {
        console.error(`Error al cargar el artículo ${articlePath}:`, error);
        return null;
    }
}

// Función para exponer los artículos
async function getArticles() {
    const articles = await fetchArticles();
    window.articlesData = articles;
}

// Inicializar la carga de artículos
getArticles();
