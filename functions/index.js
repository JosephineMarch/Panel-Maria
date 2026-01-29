const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// Configuración de metascraper
const metascraper = require('metascraper')([
  require('metascraper-image')(),
  require('metascraper-title')(),
  require('metascraper-url')(),
]);
const got = require('got');
const { HttpsError } = require("firebase-functions/v1/https");

// Un caché simple en memoria para evitar peticiones repetidas a la misma URL
const cache = new Map();

exports.scrapeUrl = functions.https.onCall(async (data, context) => {
  const targetUrl = data.url;
  if (!targetUrl) {
    throw new HttpsError('invalid-argument', 'La función debe ser llamada con un argumento "url".');
  }

  // Si la URL está en caché y no es muy antigua, la devolvemos
  if (cache.has(targetUrl)) {
    const cached = cache.get(targetUrl);
    if (Date.now() - cached.timestamp < 1000 * 60 * 5) { // 5 minutos de caché
      return cached.data;
    }
  }

  try {
    const { body: html, url } = await got(targetUrl);
    const metadata = await metascraper({ html, url });

    // Guardamos en caché el resultado exitoso
    cache.set(targetUrl, { timestamp: Date.now(), data: metadata });

    return metadata;
  } catch (error) {
    console.error(`Error al hacer scraping de ${targetUrl}:`, error);
    throw new HttpsError('internal', 'No se pudo obtener la información de la URL.', error);
  }
});
