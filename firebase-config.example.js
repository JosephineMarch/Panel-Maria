/*
================================================================================
|       PANEL MARÍA - CONFIGURACIÓN DE FIREBASE (PLANTILLA DE EJEMPLO)
================================================================================
*/

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

// ADVERTENCIA DE SEGURIDAD MUY IMPORTANTE
// NO introduzcas tus claves reales en este archivo de ejemplo.
// 1. Crea una COPIA de este archivo y renómbrala a "firebase-config.js".
// 2. El archivo "firebase-config.js" está ignorado por Git para que no se suba.
// 3. Rellena tus claves en "firebase-config.js".
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
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