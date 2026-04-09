
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDvPwWyX7i0yMtmh39pJ2SsH6cB_7jC7OE",
  authDomain: "studio-387437657-1e200.firebaseapp.com",
  projectId: "studio-387437657-1e200",
  storageBucket: "studio-387437657-1e200.firebasestorage.app",
  messagingSenderId: "586446158181",
  appId: "1:586446158181:web:e5909a0e137af2de94498c"
};

// Initialize Firebase
const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();
export const auth = app.auth();
export const db = app.firestore();
export const storage = app.storage();
