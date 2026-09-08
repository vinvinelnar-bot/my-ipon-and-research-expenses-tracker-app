import { auth, db } from "./firebase-config.js";

import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const form = document.getElementById("loginForm");
const message = document.getElementById("message");
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");

// LOGIN
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  message.textContent = "Logging in...";
  message.className = "form-message";

  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = credential.user;

    // Check email verification
    if (!user.emailVerified) {
      await signOut(auth);

      message.textContent =
        "📧 Hindi pa verified ang email mo. I-check ang Inbox o Spam/Junk folder at i-click ang verification link.";

      message.className = "form-message error";
      return;
    }

    // Update last login
    await setDoc(
      doc(db, "users", user.uid),
      {
        lastLoginAt: serverTimestamp()
      },
      { merge: true }
    );

    window.location.href = "dashboard.html";

  } catch (error) {
    console.error("LOGIN ERROR:", error);

    message.textContent = friendlyAuthError(error.code);
    message.className = "form-message error";
  }
});


// FORGOT PASSWORD
forgotPasswordBtn.addEventListener("click", async () => {

  const email = document.getElementById("email").value.trim();

  if (!email) {
    message.textContent =
      "Ilagay muna ang email address.";

    message.className = "form-message error";
    return;
  }

  message.textContent = "Sending reset link...";
  message.className = "form-message";

  try {

    await sendPasswordResetEmail(auth, email);

    message.textContent =
      "📧 Nagpadala kami ng password reset link sa email mo. I-check ang Inbox o Spam/Junk folder.";

    message.className = "form-message success";

  } catch (error) {

    console.error("PASSWORD RESET ERROR:", error);

    message.textContent =
      friendlyAuthError(error.code);

    message.className = "form-message error";
  }
});


// ERROR MESSAGES
function friendlyAuthError(code) {

  const errors = {
    "auth/invalid-credential":
      "Mali ang email o password.",

    "auth/invalid-email":
      "Invalid ang email address.",

    "auth/user-not-found":
      "Walang account na gumagamit ng email na ito.",

    "auth/too-many-requests":
      "Masyadong maraming attempts. Subukan ulit mamaya.",

    "auth/network-request-failed":
      "May problema sa internet connection.",

    "auth/user-disabled":
      "Disabled ang account na ito."
  };

  return errors[code] ||
    "Hindi makapag-login. Pakisubukan ulit.";
}