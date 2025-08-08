/*
================================================================================
|       PANEL MARÍA - CONFIGURACIÓN DE FIREBASE (PLACEHOLDER)                  |
================================================================================
*/

// Configuración de Firebase para futura implementación
// Copia tus credenciales de Firebase aquí cuando estés listo para usar la nube

const firebaseConfig = {
    // Configuración de tu proyecto Firebase
    apiKey: "TU_API_KEY_AQUI",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};

// Inicialización de Firebase (descomenta cuando estés listo)
/*
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
*/

// Para activar Firebase:
// 1. Descomenta las líneas de importación y exportación arriba
// 2. Reemplaza las credenciales con las de tu proyecto Firebase
// 3. En app.js, cambia storage.setMode('firebase', firebaseConfig)
// 4. Implementa los métodos en FirebaseAdapter en storage.js

console.log('Firebase config loaded (not initialized)');
