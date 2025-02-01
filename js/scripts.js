// Función principal para cargar los artículos desde articulos.json
async function fetchArticles() {
    try {
        // Paso 1: Cargar el archivo JSON
        const response = await fetch('articulos.json');
        if (!response.ok) {
            throw new Error(`Error al cargar el archivo 'articulos.json': ${response.status}`);
        }
        const articles = await response.json();

        // Paso 2: Exponer los datos para que los HTMLs puedan usarlos
        window.articlesData = articles;
    } catch (error) {
        console.error('Error al cargar los artículos:', error);
        window.articlesData = []; // Asegurarse de que haya un valor por defecto
    }
}

// Inicializar la carga de artículos
fetchArticles();
