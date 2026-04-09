import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDvPwWyX7i0yMtmh39pJ2SsH6cB_7jC7OE",
  authDomain: "studio-387437657-1e200.firebaseapp.com",
  projectId: "studio-387437657-1e200",
  storageBucket: "studio-387437657-1e200.firebasestorage.app",
  messagingSenderId: "586446158181",
  appId: "1:586446158181:web:e5909a0e137af2de94498c"
};

const app = firebase.initializeApp(firebaseConfig);
const auth = app.auth();
const db = app.firestore();

async function test() {
  try {
    await auth.createUserWithEmailAndPassword('bot2@optima.local', 'BotPassword123!');
    console.log("Created bot user");
    
    // now try to read
    const snapshot = await db.collection('tasks').limit(1).get();
    console.log("Success, tasks count:", snapshot.size);
  } catch (e) {
    console.error("Error:", e);
  }
  process.exit(0);
}

test();
