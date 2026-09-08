import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc,
  query, orderBy, limit, getDocs, serverTimestamp, increment
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
const researchBtn = document.getElementById("researchBtn");
const researchSummary = document.getElementById("researchSummary");
const researchDepositorWrap = document.getElementById("researchDepositorWrap");
const savingMember = document.getElementById("savingMember");
const researchDepositorOtherWrap = document.getElementById("researchDepositorOtherWrap");
const savingMemberOther = document.getElementById("savingMemberOther");

let currentUser = null;
let currentData = { totalSavings: 0, goal: 5000, accountType: "personal" };

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  currentUser = user;
  userEmail.textContent = user.email || "";
  await checkAdminAccess();
  await loadUserData();
  await loadHistory();
  if (currentData.accountType === "research") await loadResearchSummary();
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
  let memberName = "";
  if (currentData.accountType === "research") {
    memberName = savingMember.value === "__other__" ? savingMemberOther.value.trim() : savingMember.value.trim();
    if (!memberName) {
      message.textContent = "Piliin o ilagay muna ang pangalan ng member na naghulog.";
      message.className = "form-message error"; return;
    }
  }

  if (!currentUser || !Number.isFinite(amount) || amount <= 0) {
    message.textContent = "Maglagay ng valid na amount.";
    message.className = "form-message error"; return;
  }
  message.textContent = "Saving...";
  try {
    await updateDoc(doc(db, "users", currentUser.uid), { totalSavings: increment(amount), lastLoginAt: serverTimestamp() });
    await addDoc(collection(db, "users", currentUser.uid, "savings"), {
      amount,
      note: note || "Savings",
      memberName,
      createdAt: serverTimestamp()
    });
    amountInput.value = ""; noteInput.value = "";
    if (savingMember) savingMember.value = "";
    if (savingMemberOther) savingMemberOther.value = "";
    updateMemberSelector();
    message.textContent = "Na-save na ang hulog mo!"; message.className = "form-message success";
    await loadUserData();
  } catch (error) {
    console.error(error); message.textContent = "Hindi na-save. Check ang Firebase setup at Firestore rules."; message.className = "form-message error";
  }
  await loadHistory();
});

document.getElementById("goalForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const goalInput = document.getElementById("goalAmount");
  const message = document.getElementById("goalMessage");
  const goal = Number(goalInput.value);
  if (!currentUser || !Number.isFinite(goal) || goal <= 0) {
    message.textContent = "Maglagay ng valid na goal."; message.className = "form-message error"; return;
  }
  try {
    await updateDoc(doc(db, "users", currentUser.uid), { goal });
    goalInput.value = ""; message.textContent = "Updated na ang savings goal!"; message.className = "form-message success";
    await loadUserData();
  } catch (error) { console.error(error); message.textContent = "Hindi ma-update ang goal."; message.className = "form-message error"; }
});

async function checkAdminAccess() {
  if (!adminBtn || !currentUser) return;
  try {
    const snap = await getDoc(doc(db, "admins", currentUser.uid));
    adminBtn.hidden = !(snap.exists() && snap.data().role === "admin");
  } catch { adminBtn.hidden = true; }
}

async function loadUserData() {
  const userRef = doc(db, "users", currentUser.uid);
  let snapshot = await getDoc(userRef);
  if (!snapshot.exists()) {
    await setDoc(userRef, { name: currentUser.displayName || "Saver", email: currentUser.email || "", accountType: "personal", totalSavings: 0, goal: 5000, researchBudget: 0, research: { product: "", title: "", members: [] }, createdAt: serverTimestamp() });
    snapshot = await getDoc(userRef);
  }
  currentData = snapshot.data();
  currentData.totalSavings = Number(currentData.totalSavings || 0);
  currentData.goal = Number(currentData.goal || 5000);
  currentData.accountType = currentData.accountType || "personal";
  userName.textContent = currentData.name || currentUser.displayName || "Saver";
if (currentData.accountType === "research") {
  researchBtn.hidden = false;
  researchSummary.hidden = false;
} else {
  researchBtn.hidden = true;
  researchSummary.hidden = true;
}
  updateMemberSelector();
  renderStats();
}

function renderStats() {
  const saved = currentData.totalSavings, goal = currentData.goal;
  const percent = goal > 0 ? Math.min((saved / goal) * 100, 100) : 0;
  totalSavings.textContent = peso(saved); goalDisplay.textContent = peso(goal);
  progressText.textContent = `${Math.round(percent)}%`; progressBar.style.width = `${percent}%`;
  progressCaption.textContent = `${peso(saved)} of ${peso(goal)}`;
}

async function loadHistory() {
  const historyQuery = query(collection(db, "users", currentUser.uid, "savings"), orderBy("createdAt", "desc"), limit(10));
  const snapshot = await getDocs(historyQuery);
  if (snapshot.empty) { historyList.innerHTML = '<p class="muted">Wala pang savings entry.</p>'; return; }
  historyList.innerHTML = "";
  snapshot.forEach((entryDoc) => {
    const item = entryDoc.data(), row = document.createElement("div");
    row.className = "history-item";
    const left = document.createElement("div"), note = document.createElement("strong"), date = document.createElement("span");
    note.textContent = item.note || "Savings";
    date.textContent = formatDate(item.createdAt);
    left.append(note, date);
    if (currentData.accountType === "research" && item.memberName) {
      const member = document.createElement("small");
      member.className = "history-member";
      member.textContent = `👤 Naghulog: ${item.memberName}`;
      left.append(member);
    }
    const amount = document.createElement("b"); amount.textContent = `+${peso(Number(item.amount || 0))}`;
    const deleteBtn = document.createElement("button"); deleteBtn.textContent = "Delete"; deleteBtn.className = "delete-btn";
    deleteBtn.addEventListener("click", async () => {
      const amountValue = Number(item.amount || 0);
      if (!confirm(`Sigurado ka bang burahin ang ${peso(amountValue)} savings?`)) return;
      try {
        await deleteDoc(doc(db, "users", currentUser.uid, "savings", entryDoc.id));
        await updateDoc(doc(db, "users", currentUser.uid), { totalSavings: increment(-amountValue) });
        await loadUserData(); await loadHistory(); alert("Savings deleted successfully!");
      } catch (error) { console.error(error); alert("Hindi mabura ang savings."); }
    });
    row.append(left, amount, deleteBtn); historyList.appendChild(row);
  });
}

async function loadResearchSummary() {
  try {
    const userSnap = await getDoc(doc(db, "users", currentUser.uid));
    const data = userSnap.data() || {};
    const project = data.research || {};
    document.getElementById("researchProjectTitle").textContent = project.title || "Research Expenses";
    document.getElementById("researchProjectProduct").textContent = project.product ? `Product: ${project.product}` : "Set up your research project.";
    const snap = await getDocs(collection(db, "users", currentUser.uid, "researchExpenses"));
    let total = 0, purchased = 0;
    snap.forEach(d => { const x=d.data(), a=Number(x.amount||0); total+=a; if(x.purchased) purchased+=a; });
    document.getElementById("dashResearchTotal").textContent = peso(total);
    document.getElementById("dashResearchPurchased").textContent = peso(purchased);
    document.getElementById("dashResearchRemaining").textContent = peso(total-purchased);
  } catch (e) { console.error("Research summary:", e); }
}


function updateMemberSelector() {
  if (!researchDepositorWrap || !savingMember) return;
  const isResearch = currentData.accountType === "research";
  researchDepositorWrap.hidden = !isResearch;
  if (!isResearch) {
    researchDepositorOtherWrap.hidden = true;
    return;
  }

  const memberList = Array.isArray(currentData.research?.members)
    ? currentData.research.members.filter(Boolean)
    : [];

  savingMember.innerHTML = '<option value="">Pumili ng research member</option>';
  memberList.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    savingMember.appendChild(option);
  });
  const other = document.createElement("option");
  other.value = "__other__";
  other.textContent = "Iba pa / ilagay ang pangalan";
  savingMember.appendChild(other);

  researchDepositorOtherWrap.hidden = savingMember.value !== "__other__";
}

if (savingMember) {
  savingMember.addEventListener("change", () => {
    researchDepositorOtherWrap.hidden = savingMember.value !== "__other__";
    if (savingMember.value !== "__other__") savingMemberOther.value = "";
  });
}

function peso(value) { return new Intl.NumberFormat("en-PH", {style:"currency", currency:"PHP"}).format(value); }
function formatDate(timestamp) { if (!timestamp?.toDate) return "Saving..."; return timestamp.toDate().toLocaleString("en-PH",{dateStyle:"medium",timeStyle:"short"}); }
