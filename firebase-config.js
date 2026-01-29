import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, enableIndexedDbPersistence } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

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

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);

  // Habilitar persistencia offline
  enableIndexedDbPersistence(db)
    .catch((err) => {
      if (err.code == 'failed-precondition') {
        console.warn('Persistencia falló: Multiples pestañas abiertas.');
      } else if (err.code == 'unimplemented') {
        console.warn('Persistencia no soportada por el navegador.');
      }
    });

  auth = getAuth(app);
  console.log('Firebase config loaded and initialized successfully.');
} catch (error) {
  console.error('Error initializing Firebase:', error);
}

export { db, auth };
