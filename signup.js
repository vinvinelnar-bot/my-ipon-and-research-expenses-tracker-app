import { auth, db } from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const form = document.getElementById("signupForm");
const message = document.getElementById("message");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const accountTypeElement =
    document.querySelector('input[name="accountType"]:checked');

  const accountType = accountTypeElement
    ? accountTypeElement.value
    : "";

  if (!accountType) {
    message.textContent = "Pumili muna ng account type.";
    message.className = "form-message error";
    return;
  }

  message.textContent = "Creating account...";
  message.className = "form-message";

  try {

    // CREATE FIREBASE ACCOUNT
    const credential =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    const user = credential.user;

    // SAVE DISPLAY NAME
    await updateProfile(user, {
      displayName: name
    });

    // SAVE USER DATA
    await setDoc(
      doc(db, "users", user.uid),
      {
        name: name,
        email: email,

        // IMPORTANT
        accountType: accountType,

        totalSavings: 0,
        goal: 5000,

        researchBudget: 0,

        research: {
          product: "",
          title: "",
          members: []
        },

        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp()
      }
    );

    // SEND EMAIL VERIFICATION
    await sendEmailVerification(user);

    // LOG OUT AFTER SIGN UP
    await signOut(auth);

    message.textContent =
      "Account created! 📧 I-check ang email mo at i-click ang verification link bago mag-login.";

    message.className = "form-message success";

    form.reset();

  } catch (error) {

    console.error("SIGN UP ERROR:", error);

    message.textContent =
      friendlyAuthError(error.code);

    message.className = "form-message error";
  }
});


function friendlyAuthError(code) {

  const errors = {

    "auth/email-already-in-use":
      "May account na gamit ang email na ito.",

    "auth/invalid-email":
      "Invalid ang email address.",

    "auth/weak-password":
      "Gumamit ng password na hindi bababa sa 6 characters.",

    "auth/network-request-failed":
      "May problema sa internet connection.",

    "auth/operation-not-allowed":
      "Hindi naka-enable ang Email/Password sa Firebase Authentication."
  };

  return errors[code] ||
    "Hindi nagawa ang account. Pakisubukan ulit.";
}