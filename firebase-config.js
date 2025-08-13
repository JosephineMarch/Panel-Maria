/*
================================================================================
|       PANEL MARÍA - CONFIGURACIÓN DE FIREBASE
================================================================================
*/

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

// IMPORTANTE: Estas claves deben cargarse desde variables de entorno
// para la seguridad de tu proyecto.
// Si usas Vite, crea un archivo .env en la raíz de tu proyecto con:
// VITE_FIREBASE_API_KEY="TU_API_KEY"
// VITE_FIREBASE_AUTH_DOMAIN="TU_AUTH_DOMAIN"
// VITE_FIREBASE_PROJECT_ID="TU_PROJECT_ID"
// VITE_FIREBASE_STORAGE_BUCKET="TU_STORAGE_BUCKET"
// VITE_FIREBASE_MESSAGING_SENDER_ID="TU_MESSAGING_SENDER_ID"
// VITE_FIREBASE_APP_ID="TU_APP_ID"
// Y asegúrate de que .env esté en .gitignore (ya lo está).

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };

console.log('Firebase config loaded and initialized');