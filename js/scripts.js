// Función principal para cargar los artículos desde articulos.json
async function fetchArticles() {
    try {
        console.log('Iniciando carga de artículos...');

        // Paso 1: Cargar el archivo JSON
        console.log('Cargando articulos.json...');
        const response = await fetch('articulos.json');
        if (!response.ok) {
            throw new Error(`Error al cargar el archivo 'articulos.json': ${response.status}`);
        }
        console.log('articulos.json cargado correctamente.');

        // Paso 2: Parsear el JSON
        console.log('Parseando datos de articulos.json...');
        const articles = await response.json();
        console.log('Datos parseados:', articles);

        // Paso 3: Exponer los datos para que los HTMLs puedan usarlos
        console.log('Exponiendo datos en window.articlesData...');
        window.articlesData = articles;
        console.log('Datos expuestos en window.articlesData:', window.articlesData);
    } catch (error) {
        console.error('Error al cargar los artículos:', error);
        window.articlesData = []; // Asegurarse de que haya un valor por defecto
    }
}

// Inicializar la carga de artículos
console.log('Inicializando fetchArticles...');
fetchArticles();
