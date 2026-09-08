// IMPORTANT:
// Palitan ang values sa ibaba gamit ang Firebase config ng sarili mong project.
// Firebase Console > Project settings > Your apps > Web app > SDK setup and configuration.

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBcc8MRQTUfY46Hq4PdLxdo9Tp1CsPtOCM",
  authDomain: "my-ipon.firebaseapp.com",
  projectId: "my-ipon",
  storageBucket: "my-ipon.firebasestorage.app",
  messagingSenderId: "58322898703",
  appId: "58322898703"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
