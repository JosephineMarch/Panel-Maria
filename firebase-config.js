/*
================================================================================
|       PANEL MARÍA - CONFIGURACIÓN DE FIREBASE
================================================================================
*/

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

// ADVERTENCIA DE SEGURIDAD MUY IMPORTANTE
// Estas claves están expuestas y son visibles para cualquiera que visite tu sitio web.
// Esto es un RIESGO DE SEGURIDAD. Cualquiera podría usar tus credenciales para
// abusar de tus servicios de Firebase, lo que podría generar costos o pérdida de datos.
// Se recomienda encarecidamente utilizar variables de entorno en un proyecto real.
// NO SUBAS ESTE ARCHIVO CON CLAVES REALES A UN REPOSITORIO PÚBLICO COMO GITHUB.
const firebaseConfig = {
  apiKey: "AIzaSyAgsf640E_y-Ry8C6bf5cHMNB7BYjFk6FA",
  authDomain: "panel-de-control-maria.firebaseapp.com",
  projectId: "panel-de-control-maria",
  storageBucket: "panel-de-control-maria.appspot.com", // CORRECCIÓN: firebasestorage.app a appspot.com
  messagingSenderId: "434100378252",
  appId: "1:434100378252:web:56c7355bca874a940979a9"
};


let app;
let db;
let auth;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  console.log('Firebase config loaded and initialized successfully.');
} catch (error) {
  console.error('Error initializing Firebase:', error);
  // Optionally, display an error message to the user
  // alert('Error al inicializar Firebase. Por favor, revisa la consola para más detalles.');
}

export { db, auth };