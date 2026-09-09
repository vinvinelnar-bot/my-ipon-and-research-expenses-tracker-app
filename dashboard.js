import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

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


// =====================================================
// ELEMENTS
// =====================================================

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


// =====================================================
// CURRENT USER DATA
// =====================================================

let currentUser = null;

let currentData = {
  totalSavings: 0,
  goal: 5000,
  accountType: "personal"
};


// =====================================================
// AUTH
// =====================================================

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

  if (currentData.accountType === "research") {
    await loadResearchSummary();
  }

});


// =====================================================
// LOGOUT
// =====================================================

document
  .getElementById("logoutBtn")
  .addEventListener("click", async () => {

    await signOut(auth);

    window.location.href = "login.html";

  });


// =====================================================
// ADD SAVINGS
// =====================================================

document
  .getElementById("savingForm")
  .addEventListener("submit", async (event) => {

    event.preventDefault();

    const amountInput =
      document.getElementById("savingAmount");

    const noteInput =
      document.getElementById("savingNote");

    const message =
      document.getElementById("savingMessage");


    const amount =
      Number(amountInput.value);

    const note =
      noteInput.value.trim();


    // VALIDATION
    if (
      !currentUser ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {

      message.textContent =
        "Maglagay ng valid na amount.";

      message.className =
        "form-message error";

      return;
    }


    message.textContent =
      "Saving...";


    try {

      // ADD TO TOTAL SAVINGS
      await updateDoc(
        doc(
          db,
          "users",
          currentUser.uid
        ),
        {
          totalSavings:
            increment(amount),

          lastLoginAt:
            serverTimestamp()
        }
      );


      // SAVE HISTORY
      await addDoc(
        collection(
          db,
          "users",
          currentUser.uid,
          "savings"
        ),
        {
          amount: amount,

          note:
            note || "Savings",

          type:
            "saving",

          createdAt:
            serverTimestamp()
        }
      );


      // CLEAR INPUTS
      amountInput.value = "";
      noteInput.value = "";


      message.textContent =
        "Na-save na ang hulog mo!";

      message.className =
        "form-message success";


      await loadUserData();

      await loadHistory();


    } catch (error) {

      console.error(error);

      message.textContent =
        "Hindi na-save. Check ang Firebase setup at Firestore rules.";

      message.className =
        "form-message error";

    }

  });


// =====================================================
// EMERGENCY HUGOT
// =====================================================

document
  .getElementById("emergencyForm")
  .addEventListener("submit", async (event) => {

    event.preventDefault();


    const amountInput =
      document.getElementById("emergencyAmount");

    const reasonInput =
      document.getElementById("emergencyReason");

    const message =
      document.getElementById("emergencyMessage");


    const amount =
      Number(amountInput.value);

    const reason =
      reasonInput.value.trim();


    // VALIDATION
    if (
      !currentUser ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {

      message.textContent =
        "Maglagay ng valid na amount.";

      message.className =
        "form-message error";

      return;
    }


    if (!reason) {

      message.textContent =
        "Ilagay kung para saan o bakit mo babawasan ang ipon.";

      message.className =
        "form-message error";

      return;
    }


    // CHECK CURRENT SAVINGS
    if (
      amount >
      Number(currentData.totalSavings || 0)
    ) {

      message.textContent =
        "Hindi puwedeng lumampas sa kasalukuyan mong ipon.";

      message.className =
        "form-message error";

      return;
    }


    // CONFIRMATION
    const confirmed =
      confirm(
        `Sigurado ka bang magbabawas ng ${peso(amount)} sa iyong ipon?\n\nDahilan: ${reason}`
      );


    if (!confirmed) {
      return;
    }


    message.textContent =
      "Binabawas sa ipon...";


    try {

      // BAWAS SA TOTAL SAVINGS
      await updateDoc(
        doc(
          db,
          "users",
          currentUser.uid
        ),
        {
          totalSavings:
            increment(-amount)
        }
      );


      // SAVE EMERGENCY HISTORY
      await addDoc(
        collection(
          db,
          "users",
          currentUser.uid,
          "savings"
        ),
        {
          amount:
            -amount,

          note:
            `Emergency Hugot: ${reason}`,

          reason:
            reason,

          type:
            "emergency",

          createdAt:
            serverTimestamp()
        }
      );


      // CLEAR INPUTS
      amountInput.value = "";
      reasonInput.value = "";


      message.textContent =
        "Nabawasan na ang iyong ipon.";

      message.className =
        "form-message success";


      await loadUserData();

      await loadHistory();


    } catch (error) {

      console.error(error);

      message.textContent =
        "Hindi ma-update ang Emergency Hugot.";

      message.className =
        "form-message error";

    }

  });


// =====================================================
// SET GOAL
// =====================================================

document
  .getElementById("goalForm")
  .addEventListener("submit", async (event) => {

    event.preventDefault();


    const goalInput =
      document.getElementById("goalAmount");

    const message =
      document.getElementById("goalMessage");


    const goal =
      Number(goalInput.value);


    if (
      !currentUser ||
      !Number.isFinite(goal) ||
      goal <= 0
    ) {

      message.textContent =
        "Maglagay ng valid na goal.";

      message.className =
        "form-message error";

      return;
    }


    try {

      await updateDoc(
        doc(
          db,
          "users",
          currentUser.uid
        ),
        {
          goal: goal
        }
      );


      goalInput.value = "";


      message.textContent =
        "Updated na ang savings goal!";

      message.className =
        "form-message success";


      await loadUserData();


    } catch (error) {

      console.error(error);

      message.textContent =
        "Hindi ma-update ang goal.";

      message.className =
        "form-message error";

    }

  });


// =====================================================
// ADMIN ACCESS
// =====================================================

async function checkAdminAccess() {

  if (!adminBtn || !currentUser) {
    return;
  }


  try {

    const snap =
      await getDoc(
        doc(
          db,
          "admins",
          currentUser.uid
        )
      );


    adminBtn.hidden =
      !(
        snap.exists() &&
        snap.data().role === "admin"
      );


  } catch {

    adminBtn.hidden = true;

  }

}


// =====================================================
// LOAD USER DATA
// =====================================================

async function loadUserData() {

  const userRef =
    doc(
      db,
      "users",
      currentUser.uid
    );


  let snapshot =
    await getDoc(userRef);


  // CREATE USER DOCUMENT IF NEEDED
  if (!snapshot.exists()) {

    await setDoc(
      userRef,
      {
        name:
          currentUser.displayName ||
          "Saver",

        email:
          currentUser.email ||
          "",

        accountType:
          "personal",

        totalSavings:
          0,

        goal:
          5000,

        researchBudget:
          0,

        research:
          {
            product: "",
            title: "",
            members: []
          },

        createdAt:
          serverTimestamp()
      }
    );


    snapshot =
      await getDoc(userRef);

  }


  currentData =
    snapshot.data();


  currentData.totalSavings =
    Number(
      currentData.totalSavings || 0
    );


  currentData.goal =
    Number(
      currentData.goal || 5000
    );


  currentData.accountType =
    currentData.accountType ||
    "personal";


  userName.textContent =
    currentData.name ||
    currentUser.displayName ||
    "Saver";


  // RESEARCH BUTTON
  researchBtn.hidden =
    currentData.accountType !==
    "research";


  researchSummary.hidden =
    currentData.accountType !==
    "research";


  renderStats();

}


// =====================================================
// RENDER STATS
// =====================================================

function renderStats() {

  const saved =
    currentData.totalSavings;

  const goal =
    currentData.goal;


  const percent =
    goal > 0
      ? Math.min(
          (saved / goal) * 100,
          100
        )
      : 0;


  totalSavings.textContent =
    peso(saved);


  goalDisplay.textContent =
    peso(goal);


  progressText.textContent =
    `${Math.round(percent)}%`;


  progressBar.style.width =
    `${percent}%`;


  progressCaption.textContent =
    `${peso(saved)} of ${peso(goal)}`;

}


// =====================================================
// LOAD SAVINGS HISTORY
// =====================================================

async function loadHistory() {

  const historyQuery =
    query(
      collection(
        db,
        "users",
        currentUser.uid,
        "savings"
      ),

      orderBy(
        "createdAt",
        "desc"
      ),

      limit(10)
    );


  const snapshot =
    await getDocs(historyQuery);


  if (snapshot.empty) {

    historyList.innerHTML =
      '<p class="muted">Wala pang savings entry.</p>';

    return;

  }


  historyList.innerHTML = "";


  snapshot.forEach((entryDoc) => {

    const item =
      entryDoc.data();


    const row =
      document.createElement("div");

    row.className =
      "history-item";


    // LEFT SIDE
    const left =
      document.createElement("div");


    const note =
      document.createElement("strong");


    const date =
      document.createElement("span");


    note.textContent =
      item.note ||
      "Savings";


    date.textContent =
      formatDate(
        item.createdAt
      );


    left.append(
      note,
      date
    );


    // AMOUNT
    const amountValue =
      Number(
        item.amount || 0
      );


    const amount =
      document.createElement("b");


    const isEmergency =
      item.type ===
      "emergency" ||
      amountValue < 0;


    if (isEmergency) {

      amount.textContent =
        `−${peso(
          Math.abs(amountValue)
        )}`;

      amount.style.color =
        "#d9534f";

    } else {

      amount.textContent =
        `+${peso(
          amountValue
        )}`;

    }


    // DELETE BUTTON
    const deleteBtn =
      document.createElement("button");


    deleteBtn.textContent =
      "Delete";


    deleteBtn.className =
      "delete-btn";


    deleteBtn.addEventListener(
      "click",
      async () => {

        const amountValue =
          Number(
            item.amount || 0
          );


        const emergency =
          item.type ===
          "emergency" ||
          amountValue < 0;


        let confirmMessage;


        if (emergency) {

          confirmMessage =
            `Burahin ang Emergency Hugot na ${peso(
              Math.abs(amountValue)
            )}?\n\nIbabalik ang amount na ito sa iyong ipon.`;

        } else {

          confirmMessage =
            `Sigurado ka bang burahin ang ${peso(
              amountValue
            )} savings?`;

        }


        if (!confirm(confirmMessage)) {
          return;
        }


        try {

          // DELETE HISTORY
          await deleteDoc(
            doc(
              db,
              "users",
              currentUser.uid,
              "savings",
              entryDoc.id
            )
          );


          // NORMAL SAVING:
          // subtract from total
          //
          // EMERGENCY:
          // add back to total
          let change;


          if (emergency) {

            change =
              Math.abs(
                amountValue
              );

          } else {

            change =
              -amountValue;

          }


          await updateDoc(
            doc(
              db,
              "users",
              currentUser.uid
            ),
            {
              totalSavings:
                increment(change)
            }
          );


          await loadUserData();

          await loadHistory();


          alert(
            "History deleted successfully!"
          );


        } catch (error) {

          console.error(error);

          alert(
            "Hindi mabura ang history."
          );

        }

      }
    );


    row.append(
      left,
      amount,
      deleteBtn
    );


    historyList.appendChild(row);

  });

}


// =====================================================
// RESEARCH SUMMARY
// =====================================================

async function loadResearchSummary() {

  try {

    const userSnap =
      await getDoc(
        doc(
          db,
          "users",
          currentUser.uid
        )
      );


    const data =
      userSnap.data() || {};


    const project =
      data.research || {};


    document
      .getElementById(
        "researchProjectTitle"
      )
      .textContent =
        project.title ||
        "Research Expenses";


    document
      .getElementById(
        "researchProjectProduct"
      )
      .textContent =
        project.product
          ? `Product: ${project.product}`
          : "Set up your research project.";


    const snap =
      await getDocs(
        collection(
          db,
          "users",
          currentUser.uid,
          "researchExpenses"
        )
      );


    let total = 0;

    let purchased = 0;


    snap.forEach((d) => {

      const x =
        d.data();


      const amount =
        Number(
          x.amount || 0
        );


      total += amount;


      if (x.purchased) {
        purchased += amount;
      }

    });


    document
      .getElementById(
        "dashResearchTotal"
      )
      .textContent =
        peso(total);


    document
      .getElementById(
        "dashResearchPurchased"
      )
      .textContent =
        peso(purchased);


    document
      .getElementById(
        "dashResearchRemaining"
      )
      .textContent =
        peso(
          total - purchased
        );


  } catch (error) {

    console.error(
      "Research summary:",
      error
    );

  }

}


// =====================================================
// PESO FORMAT
// =====================================================

function peso(value) {

  return new Intl.NumberFormat(
    "en-PH",
    {
      style: "currency",
      currency: "PHP"
    }
  ).format(value);

}


// =====================================================
// DATE FORMAT
// =====================================================

function formatDate(timestamp) {

  if (
    !timestamp?.toDate
  ) {

    return "Saving...";

  }


  return timestamp
    .toDate()
    .toLocaleString(
      "en-PH",
      {
        dateStyle: "medium",
        timeStyle: "short"
      }
    );

}