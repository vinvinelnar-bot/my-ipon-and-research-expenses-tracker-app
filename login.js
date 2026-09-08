import { auth } from "./firebase-config.js";
import { signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

const form = document.getElementById("loginForm");
const message = document.getElementById("message");

onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = "dashboard.html";
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  message.textContent = "Logging in...";
  message.className = "form-message";

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", credential.user.uid), {
      lastLoginAt: serverTimestamp()
    }, { merge: true });
    window.location.href = "dashboard.html";
  } catch (error) {
    message.textContent = friendlyAuthError(error.code);
    message.className = "form-message error";
  }
});

function friendlyAuthError(code) {
  const errors = {
    "auth/invalid-credential": "Mali ang email o password.",
    "auth/invalid-email": "Invalid ang email address.",
    "auth/too-many-requests": "Masyadong maraming attempts. Subukan ulit mamaya.",
    "auth/network-request-failed": "May problema sa internet connection."
  };
  return errors[code] || "Hindi makapag-login. Pakisubukan ulit.";
}
