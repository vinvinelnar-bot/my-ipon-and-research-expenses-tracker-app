import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  increment
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const totalSavings = document.getElementById("totalSavings");
const goalDisplay = document.getElementById("goalDisplay");
const progressText = document.getElementById("progressText");
const progressBar = document.getElementById("progressBar");
const progressCaption = document.getElementById("progressCaption");
const historyList = document.getElementById("historyList");
const adminBtn = document.getElementById("adminBtn");

let currentUser = null;
let currentData = {
  totalSavings: 0,
  goal: 5000
};

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;
  userEmail.textContent = user.email || "";
  await checkAdminAccess();
  await loadUserData();
  await loadHistory();
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

document.getElementById("savingForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const amountInput = document.getElementById("savingAmount");
  const noteInput = document.getElementById("savingNote");
  const message = document.getElementById("savingMessage");

  const amount = Number(amountInput.value);
  const note = noteInput.value.trim();

  if (!currentUser || !Number.isFinite(amount) || amount <= 0) {
    message.textContent = "Maglagay ng valid na amount.";
    message.className = "form-message error";
    return;
  }

  message.textContent = "Saving...";
  message.className = "form-message";

  try {
    const userRef = doc(db, "users", currentUser.uid);

    await updateDoc(userRef, {
      totalSavings: increment(amount)
    });

    await addDoc(collection(db, "users", currentUser.uid, "savings"), {
      amount,
      note: note || "Savings",
      createdAt: serverTimestamp()
    });

    amountInput.value = "";
    noteInput.value = "";
    message.textContent = "Na-save na ang hulog mo!";
    message.className = "form-message success";

    await loadUserData();
    await loadHistory();
  } catch (error) {
    console.error(error);
    message.textContent = "Hindi na-save. Check ang Firebase setup at Firestore rules.";
    message.className = "form-message error";
  }
});

document.getElementById("goalForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const goalInput = document.getElementById("goalAmount");
  const message = document.getElementById("goalMessage");
  const goal = Number(goalInput.value);

  if (!currentUser || !Number.isFinite(goal) || goal <= 0) {
    message.textContent = "Maglagay ng valid na goal.";
    message.className = "form-message error";
    return;
  }

  try {
    await updateDoc(doc(db, "users", currentUser.uid), { goal });
    goalInput.value = "";
    message.textContent = "Updated na ang savings goal!";
    message.className = "form-message success";
    await loadUserData();
  } catch (error) {
    console.error(error);
    message.textContent = "Hindi ma-update ang goal.";
    message.className = "form-message error";
  }
});

async function checkAdminAccess() {
  if (!adminBtn || !currentUser) return;
  try {
    const adminSnap = await getDoc(doc(db, "admins", currentUser.uid));
    adminBtn.hidden = !(adminSnap.exists() && adminSnap.data().role === "admin");
  } catch (error) {
    console.error("Admin check failed:", error);
    adminBtn.hidden = true;
  }
}

async function loadUserData() {
  const userRef = doc(db, "users", currentUser.uid);
  let snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    await setDoc(userRef, {
      name: currentUser.displayName || "Saver",
      email: currentUser.email || "",
      totalSavings: 0,
      goal: 5000,
      createdAt: serverTimestamp()
    });
    snapshot = await getDoc(userRef);
  }

  currentData = snapshot.data();
  currentData.totalSavings = Number(currentData.totalSavings || 0);
  currentData.goal = Number(currentData.goal || 5000);

  userName.textContent = currentData.name || currentUser.displayName || "Saver";
  renderStats();
}

function renderStats() {
  const saved = currentData.totalSavings;
  const goal = currentData.goal;
  const percent = goal > 0 ? Math.min((saved / goal) * 100, 100) : 0;

  totalSavings.textContent = peso(saved);
  goalDisplay.textContent = peso(goal);
  progressText.textContent = `${Math.round(percent)}%`;
  progressBar.style.width = `${percent}%`;
  progressCaption.textContent = `${peso(saved)} of ${peso(goal)}`;
}

async function loadHistory() {
  const historyQuery = query(
    collection(db, "users", currentUser.uid, "savings"),
    orderBy("createdAt", "desc"),
    limit(10)
  );

  const snapshot = await getDocs(historyQuery);

  if (snapshot.empty) {
    historyList.innerHTML = '<p class="muted">Wala pang savings entry.</p>';
    return;
  }

  historyList.innerHTML = "";

  snapshot.forEach((entryDoc) => {
    const item = entryDoc.data();
    const row = document.createElement("div");
    row.className = "history-item";

    const left = document.createElement("div");
    const note = document.createElement("strong");
    note.textContent = item.note || "Savings";

    const date = document.createElement("span");
    date.textContent = formatDate(item.createdAt);

    left.appendChild(note);
    left.appendChild(date);

    const amount = document.createElement("b");
amount.textContent = `+${peso(Number(item.amount || 0))}`;

const deleteBtn = document.createElement("button");
deleteBtn.textContent = "Delete";
deleteBtn.className = "delete-btn";

deleteBtn.addEventListener("click", async () => {
  const amountValue = Number(item.amount || 0);

  const confirmDelete = confirm(
    `Sigurado ka bang burahin ang ${peso(amountValue)} savings?`
  );

  if (!confirmDelete) return;

  try {
    await deleteDoc(
      doc(db, "users", currentUser.uid, "savings", entryDoc.id)
    );

    await updateDoc(
      doc(db, "users", currentUser.uid),
      {
        totalSavings: increment(-amountValue)
      }
    );

    await loadUserData();
    await loadHistory();

    alert("Savings deleted successfully!");

  } catch (error) {
    console.error(error);
    alert("Hindi mabura ang savings.");
  }
});

row.appendChild(left);
row.appendChild(amount);
row.appendChild(deleteBtn);
historyList.appendChild(row);
  });
}

function peso(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP"
  }).format(value);
}

function formatDate(timestamp) {
  if (!timestamp?.toDate) return "Saving...";
  return timestamp.toDate().toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}
