// === CÓDIGO PARA EL BOOKMARKLET "GUARDAR EN PANEL" ===
//
// Instrucciones:
// 1. Copia TODO el código que empieza con "javascript:..."
// 2. Crea un nuevo marcador en tu navegador.
// 3. Pega el código copiado en el campo de la URL del marcador.
// 4. ¡IMPORTANTE! Antes de guardar, reemplaza 'URL_DE_TU_APP_AQUI' con la URL real de tu aplicación.
//
// URL de la aplicación:
// - Si usas un servidor local (como se explica en el siguiente paso): http://127.0.0.1:8000/index.html (o el puerto que uses)
// - Si abres el archivo directamente: file:///H:/MARY%20PROGRAMA/Panel%20Maria/Panel-Maria/index.html (puede tener problemas de seguridad)
//
javascript:(function(){
    const appUrl = 'URL_DE_TU_APP_AQUI'; // <-- ¡CAMBIA ESTO!
    if (appUrl === 'URL_DE_TU_APP_AQUI') {
        alert('Por favor, edita el bookmarklet y cambia donde dice URL_DE_TU_APP_AQUI por la URL real de tu aplicación Panel María.');
        return;
    }
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(document.title);
    const category = 'directorio';
    const finalUrl = `${appUrl}?action=add&url=${url}&title=${title}&category=${category}`;
    window.open(finalUrl, '_blank');
})();
