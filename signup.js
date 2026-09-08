import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const form = document.getElementById("signupForm");
const message = document.getElementById("message");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  message.textContent = "Creating account...";
  message.className = "form-message";

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    await updateProfile(user, { displayName: name });

    await setDoc(doc(db, "users", user.uid), {
      name,
      email,
      totalSavings: 0,
      goal: 5000,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp()
    });

    window.location.href = "dashboard.html";
  } catch (error) {
    message.textContent = friendlyAuthError(error.code);
    message.className = "form-message error";
  }
});

function friendlyAuthError(code) {
  const errors = {
    "auth/email-already-in-use": "May account na gamit ang email na ito.",
    "auth/invalid-email": "Invalid ang email address.",
    "auth/weak-password": "Gumamit ng password na hindi bababa sa 6 characters.",
    "auth/network-request-failed": "May problema sa internet connection."
  };
  return errors[code] || "Hindi nagawa ang account. Pakisubukan ulit.";
}
