import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { collection, getDocs, doc, getDoc, orderBy, query } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const tbody = document.getElementById("usersTableBody");
const userCount = document.getElementById("userCount");
const allSavings = document.getElementById("allSavings");
const message = document.getElementById("adminMessage");
const researchUsers = document.getElementById("researchUsers");
const researchExpenses = document.getElementById("researchExpenses");

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
    let researchCount = 0;
    let researchExpenseTotal = 0;
    userCount.textContent = snapshot.size;
    tbody.innerHTML = "";

    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="8" class="muted">Wala pang registered users.</td></tr>';
      allSavings.textContent = peso(0);
      message.textContent = "Wala pang users.";
      return;
    }

    snapshot.forEach((userDoc) => {
      const data = userDoc.data();
      const saved = Number(data.totalSavings || 0);
      savingsTotal += saved;
      if ((data.accountType || "personal") === "research") {
        researchCount++;
      }

      const row = document.createElement("tr");
      addCell(row, data.name || "—");
      addCell(row, data.email || "—");
      addCell(row, data.accountType === "research" ? "🔬 Research" : "👤 Personal");
      addCell(row, peso(saved));
      addCell(row, peso(Number(data.goal || 0)));
      addCell(row, formatDate(data.lastLoginAt));
      addCell(row, formatDate(data.createdAt));
      tbody.appendChild(row);
    });

    // Read research expense totals for admin reporting.
    for (const userDoc of snapshot.docs) {
      if ((userDoc.data().accountType || "personal") !== "research") continue;
      const expSnap = await getDocs(collection(db, "users", userDoc.id, "researchExpenses"));
      expSnap.forEach(e => { researchExpenseTotal += Number(e.data().amount || 0); });
    }
    if (allSavings) {
  allSavings.textContent = peso(savingsTotal);
}

if (researchUsers) {
  researchUsers.textContent = researchCount;
}

if (researchExpenses) {
  researchExpenses.textContent = peso(researchExpenseTotal);
}

if (message) {
  message.textContent = `Loaded ${snapshot.size} user(s).`;
  message.className = "form-message success";
}
  } catch (error) {
    console.error(error);
    tbody.innerHTML = '<tr><td colspan="8" class="muted">Hindi ma-load ang users.</td></tr>';
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
