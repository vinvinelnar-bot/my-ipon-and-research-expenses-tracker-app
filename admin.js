import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { collection, getDocs, doc, getDoc, orderBy, query } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const tbody = document.getElementById("usersTableBody");
const userCount = document.getElementById("userCount");
const allSavings = document.getElementById("allSavings");
const message = document.getElementById("adminMessage");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const adminSnap = await getDoc(doc(db, "admins", user.uid));
  if (!adminSnap.exists() || adminSnap.data().role !== "admin") {
    alert("Wala kang admin access.");
    window.location.href = "dashboard.html";
    return;
  }

  await loadUsers();
});

document.getElementById("refreshBtn").addEventListener("click", loadUsers);

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

async function loadUsers() {
  message.textContent = "Loading users...";
  message.className = "form-message";

  try {
    const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(usersQuery);

    let savingsTotal = 0;
    userCount.textContent = snapshot.size;
    tbody.innerHTML = "";

    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="6" class="muted">Wala pang registered users.</td></tr>';
      allSavings.textContent = peso(0);
      message.textContent = "Wala pang users.";
      return;
    }

    snapshot.forEach((userDoc) => {
      const data = userDoc.data();
      const saved = Number(data.totalSavings || 0);
      savingsTotal += saved;

      const row = document.createElement("tr");
      addCell(row, data.name || "—");
      addCell(row, data.email || "—");
      addCell(row, peso(saved));
      addCell(row, peso(Number(data.goal || 0)));
      addCell(row, formatDate(data.lastLoginAt));
      addCell(row, formatDate(data.createdAt));
      tbody.appendChild(row);
    });

    allSavings.textContent = peso(savingsTotal);
    message.textContent = `Loaded ${snapshot.size} user(s).`;
    message.className = "form-message success";
  } catch (error) {
    console.error(error);
    tbody.innerHTML = '<tr><td colspan="6" class="muted">Hindi ma-load ang users.</td></tr>';
    message.textContent = "Hindi ma-load ang users. Check ang Firestore rules at admin setup.";
    message.className = "form-message error";
  }
}

function addCell(row, text) {
  const cell = document.createElement("td");
  cell.textContent = text;
  row.appendChild(cell);
}

function formatDate(timestamp) {
  if (!timestamp?.toDate) return "—";
  return timestamp.toDate().toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function peso(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP"
  }).format(value);
}
