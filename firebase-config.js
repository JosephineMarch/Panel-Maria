/*
================================================================================
|       PANEL MARÍA - CONFIGURACIÓN DE FIREBASE
================================================================================
*/

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyAgsf640E_y-Ry8C6bf5cHMNB7BYjFk6FA",
  authDomain: "panel-de-control-maria.firebaseapp.com",
  projectId: "panel-de-control-maria",
  storageBucket: "panel-de-control-maria.firebasestorage.app",
  messagingSenderId: "434100378252",
  appId: "1:434100378252:web:56c7355bca874a940979a9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };

console.log('Firebase config loaded and initialized');