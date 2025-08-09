/*
================================================================================
|       PANEL MARÍA - CONFIGURACIÓN DE FIREBASE
================================================================================
*/

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "TU_API_KEY_AQUI", // Asegúrate de que esto ya esté actualizado por ti
    authDomain: "tu-proyecto.firebaseapp.com", // Asegúrate de que esto ya esté actualizado por ti
    projectId: "tu-proyecto", // Asegúrate de que esto ya esté actualizado por ti
    storageBucket: "tu-proyecto.appspot.com", // Asegúrate de que esto ya esté actualizado por ti
    messagingSenderId: "123456789", // Asegúrate de que esto ya esté actualizado por ti
    appId: "1:123456789:web:abcdef123456" // Asegúrate de que esto ya esté actualizado por ti
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };

console.log('Firebase config loaded and initialized');