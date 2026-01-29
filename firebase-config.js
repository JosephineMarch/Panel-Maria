/*
================================================================================
|       PANEL MARÍA - CONFIGURACIÓN DE FIREBASE (PLANTILLA DE EJEMPLO)
================================================================================
*/

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js';

// ADVERTENCIA DE SEGURIDAD MUY IMPORTANTE
// NO introduzcas tus claves reales en este archivo de ejemplo.
// 1. Crea una COPIA de este archivo y renómbrala a "firebase-config.js".
// 2. El archivo "firebase-config.js" está ignorado por Git para que no se suba.
// 3. Rellena tus claves en "firebase-config.js".
const firebaseConfig = {
  apiKey: "AIzaSyAgsf640E_y-Ry8C6bf5cHMNB7BYjFk6FA",
  authDomain: "panel-de-control-maria.firebaseapp.com",
  projectId: "panel-de-control-maria",
  storageBucket: "panel-de-control-maria.firebasestorage.app",
  messagingSenderId: "434100378252",
  appId: "1:434100378252:web:56c7355bca874a940979a9"
};


let app;
let db;
let auth;
let functions;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  functions = getFunctions(app); // Inicializar Cloud Functions
  console.log('Firebase config loaded and initialized successfully.');
} catch (error) {
  console.error('Error initializing Firebase:', error);
  // Optionally, display an error message to the user
  // alert('Error al inicializar Firebase. Por favor, revisa la consola para más detalles.');
}

export { db, auth, functions };