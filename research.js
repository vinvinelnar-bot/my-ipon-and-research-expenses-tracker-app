import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  serverTimestamp,
  increment,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";


let currentUser = null;
let expenses = [];
let currentData = {};
let members = [];
let editingExpenseId = null;


const $ = (id) =>
  document.getElementById(id);


// =====================================
// AUTH
// =====================================

onAuthStateChanged(auth, async (user) => {

  if (!user) {
    location.href = "login.html";
    return;
  }

  currentUser = user;

  $("userEmail").textContent =
    user.email || "";


  try {

    const snap = await getDoc(
      doc(db, "users", user.uid)
    );


    if (
      !snap.exists() ||
      (snap.data().accountType || "personal") !== "research"
    ) {

      alert(
        "Ang Research Expenses ay para lamang sa Research account."
      );

      location.href =
        "dashboard.html";

      return;
    }


    currentData =
      snap.data();


    loadProject();

    await loadExpenses();

  } catch (error) {

    console.error(error);

    alert(
      "Hindi ma-load ang research account."
    );
  }
});


// =====================================
// LOGOUT
// =====================================

$("logoutBtn").addEventListener(
  "click",
  async () => {

    await signOut(auth);

    location.href =
      "login.html";
  }
);


// =====================================
// PROJECT
// =====================================

function loadProject() {

  const research =
    currentData.research || {};


  $("product").value =
    research.product || "";


  $("projectTitle").value =
    research.title || "";


  $("researchBudget").value =
    currentData.researchBudget ?? "";


  members =
    Array.isArray(research.members)
      ? [...research.members]
      : [];


  renderMembers();

  updatePrintInfo();
}


// =====================================
// SAVE PROJECT
// =====================================

$("projectForm").addEventListener(
  "submit",
  async (e) => {

    e.preventDefault();


    const product =
      $("product").value.trim();


    const title =
      $("projectTitle").value.trim();


    const budget =
      Number(
        $("researchBudget").value || 0
      );


    const msg =
      $("projectMessage");


    try {

      await updateDoc(
        doc(
          db,
          "users",
          currentUser.uid
        ),
        {

          research: {
            ...(currentData.research || {}),

            product,

            title,

            members
          },

          researchBudget:
            budget
        }
      );


      currentData.research = {

        ...(currentData.research || {}),

        product,

        title,

        members
      };


      currentData.researchBudget =
        budget;


      updatePrintInfo();


      msg.textContent =
        "Na-save na ang project information!";

      msg.className =
        "form-message success";

    } catch (error) {

      console.error(error);

      msg.textContent =
        "Hindi ma-save ang project.";

      msg.className =
        "form-message error";
    }
  }
);


// =====================================
// MEMBERS
// =====================================

$("addMemberBtn").addEventListener(
  "click",
  () => {

    members.push("");

    renderMembers();
  }
);


$("saveMembersBtn").addEventListener(
  "click",
  async () => {

    const msg =
      $("membersMessage");


    members =
      [...document.querySelectorAll(".member-input")]
        .map(input =>
          input.value.trim()
        )
        .filter(Boolean);


    try {

      await updateDoc(
        doc(
          db,
          "users",
          currentUser.uid
        ),
        {
          "research.members":
            members
        }
      );


      currentData.research = {

        ...(currentData.research || {}),

        members
      };


      renderMembers();

      updatePrintInfo();


      msg.textContent =
        "Na-save na ang research members!";

      msg.className =
        "form-message success";

    } catch (error) {

      console.error(error);

      msg.textContent =
        "Hindi ma-save ang members.";

      msg.className =
        "form-message error";
    }
  }
);


function renderMembers() {

  const list =
    $("membersList");


  list.innerHTML = "";


  if (!members.length) {

    const empty =
      document.createElement("p");

    empty.className =
      "muted";

    empty.textContent =
      "Wala pang members. I-click ang + ADD MEMBER.";

    list.appendChild(empty);

    return;
  }


  members.forEach(
    (name, index) => {

      const row =
        document.createElement("div");

      row.className =
        "member-row";


      const input =
        document.createElement("input");

      input.className =
        "member-input";

      input.placeholder =
        `Research member ${index + 1}`;

      input.value =
        name;


      const remove =
        document.createElement("button");

      remove.type =
        "button";

      remove.className =
        "btn danger small-btn";

      remove.textContent =
        "REMOVE";


      remove.onclick =
        () => {

          members.splice(
            index,
            1
          );

          renderMembers();
        };


      row.append(
        input,
        remove
      );


      list.appendChild(row);
    }
  );
}


// =====================================
// OTHER EXPENSE
// =====================================

$("expenseType").addEventListener(
  "change",
  () => {

    $("otherSpecifyWrap").hidden =
      $("expenseType").value !==
      "other expenses";
  }
);


// =====================================
// PURCHASED
// =====================================

$("purchased").addEventListener(
  "change",
  () => {

    $("purchasedDate").required =
      $("purchased").checked;
  }
);


// =====================================
// ADD / EDIT EXPENSE
// =====================================

$("expenseForm").addEventListener(
  "submit",
  async (e) => {

    e.preventDefault();


    const msg =
      $("expenseMessage");


    const name =
      $("expenseName").value.trim();


    const type =
      $("expenseType").value;


    const other =
      $("otherSpecify").value.trim();


    const amount =
      Number(
        $("expenseAmount").value
      );


    const plannedDate =
      $("plannedDate").value;


    const isPurchased =
      $("purchased").checked;


    const purchasedDate =
      $("purchasedDate").value;


    const deduct =
      $("deductSavings").checked;


    // VALIDATION

    if (
      !name ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !plannedDate
    ) {

      msg.textContent =
        "Kumpletuhin ang item, amount, at planned date.";

      msg.className =
        "form-message error";

      return;
    }


    if (
      type === "other expenses" &&
      !other
    ) {

      msg.textContent =
        "I-specify muna ang Other Expense.";

      msg.className =
        "form-message error";

      return;
    }


    if (
      isPurchased &&
      !purchasedDate
    ) {

      msg.textContent =
        "Ilagay ang actual purchase date.";

      msg.className =
        "form-message error";

      return;
    }


    // =================================
    // EDIT
    // =================================

    if (editingExpenseId) {

      const old =
        expenses.find(
          x =>
            x.id ===
            editingExpenseId
        );


      if (!old) {

        resetExpenseForm();

        return;
      }


      const oldAmount =
        Number(
          old.amount || 0
        );


      const oldDeducted =
        old.deductedFromSavings === true;


      const newDeducted =
        isPurchased &&
        deduct;


      try {

        // OLD = deducted
        // NEW = deducted

        if (
          oldDeducted &&
          newDeducted
        ) {

          const difference =
            oldAmount - amount;


          if (
            difference !== 0
          ) {

            await updateDoc(
              doc(
                db,
                "users",
                currentUser.uid
              ),
              {
                totalSavings:
                  increment(
                    difference
                  )
              }
            );
          }
        }


        // OLD deducted
        // NEW not deducted

        else if (
          oldDeducted &&
          !newDeducted
        ) {

          await updateDoc(
            doc(
              db,
              "users",
              currentUser.uid
            ),
            {
              totalSavings:
                increment(
                  oldAmount
                )
            }
          );
        }


        // OLD not deducted
        // NEW deducted

        else if (
          !oldDeducted &&
          newDeducted
        ) {

          await updateDoc(
            doc(
              db,
              "users",
              currentUser.uid
            ),
            {
              totalSavings:
                increment(
                  -amount
                )
            }
          );
        }


        await updateDoc(
          doc(
            db,
            "users",
            currentUser.uid,
            "researchExpenses",
            editingExpenseId
          ),
          {

            name,

            type,

            otherSpecify:
              type ===
              "other expenses"
                ? other
                : "",

            amount,

            plannedDate,

            purchasedDate:
              isPurchased
                ? purchasedDate
                : "",

            purchased:
              isPurchased,

            deductedFromSavings:
              newDeducted
          }
        );


        msg.textContent =
          "Na-update na ang expense!";

        msg.className =
          "form-message success";


        resetExpenseForm();

        await loadExpenses();

      } catch (error) {

        console.error(error);

        msg.textContent =
          "Hindi ma-update ang expense.";

        msg.className =
          "form-message error";
      }


      return;
    }


    // =================================
    // ADD NEW
    // =================================

    try {

      const expenseRef =
        await addDoc(
          collection(
            db,
            "users",
            currentUser.uid,
            "researchExpenses"
          ),
          {

            name,

            type,

            otherSpecify:
              type ===
              "other expenses"
                ? other
                : "",

            amount,

            plannedDate,

            purchasedDate:
              isPurchased
                ? purchasedDate
                : "",

            purchased:
              isPurchased,

            deductedFromSavings:
              false,

            createdAt:
              serverTimestamp()
          }
        );


      if (
        isPurchased &&
        deduct
      ) {

        await updateDoc(
          doc(
            db,
            "users",
            currentUser.uid
          ),
          {
            totalSavings:
              increment(
                -amount
              )
          }
        );


        await updateDoc(
          expenseRef,
          {
            deductedFromSavings:
              true
          }
        );
      }


      msg.textContent =
        "Na-add na ang research expense!";

      msg.className =
        "form-message success";


      resetExpenseForm();

      await loadExpenses();

    } catch (error) {

      console.error(error);

      msg.textContent =
        "Hindi na-save ang expense.";

      msg.className =
        "form-message error";
    }

  }
);


// =====================================
// EDIT EXPENSE
// =====================================

function editExpense(x) {

  editingExpenseId =
    x.id;


  $("expenseName").value =
    x.name || "";


  $("expenseType").value =
    x.type ||
    "research components";


  $("otherSpecify").value =
    x.otherSpecify || "";


  $("otherSpecifyWrap").hidden =
    x.type !==
    "other expenses";


  $("expenseAmount").value =
    Number(
      x.amount || 0
    );


  $("plannedDate").value =
    x.plannedDate || "";


  $("purchased").checked =
    x.purchased === true;


  $("purchasedDate").value =
    x.purchasedDate || "";


  $("purchasedDate").required =
    x.purchased === true;


  $("deductSavings").checked =
    x.deductedFromSavings === true;


  $("expenseSubmitBtn").textContent =
    "✓ SAVE CHANGES";


  $("cancelEditBtn").hidden =
    false;


  $("expenseMessage").textContent =
    `Editing: ${x.name || "Expense"}`;


  $("expenseMessage").className =
    "form-message";


  $("expenseForm").scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}


// =====================================
// CANCEL EDIT
// =====================================

$("cancelEditBtn").addEventListener(
  "click",
  () => {

    resetExpenseForm();

    $("expenseMessage").textContent =
      "Edit cancelled.";

    $("expenseMessage").className =
      "form-message";
  }
);


// =====================================
// RESET
// =====================================

function resetExpenseForm() {

  editingExpenseId =
    null;


  $("expenseForm").reset();


  $("otherSpecifyWrap").hidden =
    true;


  $("purchasedDate").required =
    false;


  $("expenseSubmitBtn").textContent =
    "+ ADD EXPENSE";


  $("cancelEditBtn").hidden =
    true;
}


// =====================================
// LOAD EXPENSES
// =====================================

async function loadExpenses() {

  const snap =
    await getDocs(
      query(
        collection(
          db,
          "users",
          currentUser.uid,
          "researchExpenses"
        ),
        orderBy(
          "createdAt",
          "desc"
        )
      )
    );


  expenses =
    snap.docs.map(
      d => ({
        id: d.id,
        ...d.data()
      })
    );


  renderExpenses();

  renderSummary();
}


// =====================================
// RENDER
// =====================================

function renderExpenses() {

  const body =
    $("expensesBody");


  const search =
    $("expenseSearch")
      .value
      .trim()
      .toLowerCase();


  const filter =
    $("expenseFilter").value;


  const list =
    expenses.filter(x => {

      const text =
        `${x.name || ""} ${
          x.type || ""
        } ${
          x.otherSpecify || ""
        }`.toLowerCase();


      const searchOk =
        !search ||
        text.includes(search);


      const filterOk =
        filter === "all" ||

        (
          filter === "purchased" &&
          x.purchased
        ) ||

        (
          filter === "pending" &&
          !x.purchased
        ) ||

        x.type === filter;


      return (
        searchOk &&
        filterOk
      );
    });


  body.innerHTML = "";


  if (!list.length) {

    body.innerHTML =
      `
      <tr>
        <td
          colspan="7"
          class="muted"
        >
          Walang expense na tumutugma.
        </td>
      </tr>
      `;

    return;
  }


  list.forEach(x => {

    const tr =
      document.createElement("tr");


    addCell(
      tr,
      `${x.name || "—"}${
        x.type === "other expenses" &&
        x.otherSpecify
          ? ` — ${x.otherSpecify}`
          : ""
      }`
    );


    addCell(
      tr,
      prettyType(x.type)
    );


    addCell(
      tr,
      peso(
        Number(
          x.amount || 0
        )
      )
    );


    addCell(
      tr,
      x.plannedDate || "—"
    );


    addCell(
      tr,
      x.purchasedDate || "—"
    );


    const status =
      document.createElement("td");


    status.innerHTML =
      x.purchased
        ? '<span class="status purchased">✓ NABILI NA</span>'
        : '<span class="status pending">○ HINDI PA</span>';


    tr.appendChild(status);


    // ACTION

    const action =
      document.createElement("td");


    action.className =
      "action-cell no-print";


    // PURCHASED

    const toggle =
      document.createElement("button");


    toggle.className =
      `btn ${
        x.purchased
          ? "secondary"
          : "primary"
      } small-btn`;


    toggle.textContent =
      x.purchased
        ? "MARK UNPURCHASED"
        : "MARK PURCHASED";


    toggle.onclick =
      () =>
        togglePurchased(x);


    // EDIT

    const edit =
      document.createElement("button");


    edit.className =
      "btn secondary small-btn";


    edit.textContent =
      "EDIT";


    edit.onclick =
      () =>
        editExpense(x);


    // DELETE

    const del =
      document.createElement("button");


    del.className =
      "btn danger small-btn";


    del.textContent =
      "DELETE";


    del.onclick =
      () =>
        removeExpense(x);


    action.append(
      toggle,
      edit,
      del
    );


    tr.appendChild(action);


    body.appendChild(tr);

  });
}


function addCell(
  row,
  text
) {

  const cell =
    document.createElement("td");


  cell.textContent =
    text;


  row.appendChild(cell);
}


function prettyType(type) {

  if (
    type ===
    "research components"
  ) {

    return "Research Components";
  }


  if (
    type ===
    "research materials"
  ) {

    return "Research Materials";
  }


  return "Other Expenses";
}


// =====================================
// TOGGLE PURCHASED
// =====================================

async function togglePurchased(x) {

  const next =
    !x.purchased;


  let deduct =
    x.deductedFromSavings;


  try {

    if (next) {

      const date =
        prompt(
          "Actual date kung kailan binili (YYYY-MM-DD):",
          new Date()
            .toISOString()
            .slice(0, 10)
        );


      if (!date) {
        return;
      }


      const useSavings =
        confirm(
          `Ibawas ang ${
            peso(
              Number(
                x.amount || 0
              )
            )
          } sa Research Savings?\n\nOK = Oo\nCancel = Hindi`
        );


      if (
        useSavings &&
        !deduct
      ) {

        await updateDoc(
          doc(
            db,
            "users",
            currentUser.uid
          ),
          {
            totalSavings:
              increment(
                -Number(
                  x.amount || 0
                )
              )
          }
        );


        deduct =
          true;
      }


      await updateDoc(
        doc(
          db,
          "users",
          currentUser.uid,
          "researchExpenses",
          x.id
        ),
        {

          purchased:
            true,

          purchasedDate:
            date,

          deductedFromSavings:
            deduct
        }
      );

    } else {

      if (deduct) {

        await updateDoc(
          doc(
            db,
            "users",
            currentUser.uid
          ),
          {
            totalSavings:
              increment(
                Number(
                  x.amount || 0
                )
              )
          }
        );
      }


      await updateDoc(
        doc(
          db,
          "users",
          currentUser.uid,
          "researchExpenses",
          x.id
        ),
        {

          purchased:
            false,

          purchasedDate:
            "",

          deductedFromSavings:
            false
        }
      );
    }


    await loadExpenses();

  } catch (error) {

    console.error(error);

    alert(
      "Hindi ma-update ang purchased status."
    );
  }
}


// =====================================
// DELETE
// =====================================

async function removeExpense(x) {

  if (
    !confirm(
      `Burahin ang "${x.name}"?`
    )
  ) {

    return;
  }


  try {

    if (
      x.deductedFromSavings
    ) {

      await updateDoc(
        doc(
          db,
          "users",
          currentUser.uid
        ),
        {
          totalSavings:
            increment(
              Number(
                x.amount || 0
              )
            )
        }
      );
    }


    await deleteDoc(
      doc(
        db,
        "users",
        currentUser.uid,
        "researchExpenses",
        x.id
      )
    );


    await loadExpenses();

  } catch (error) {

    console.error(error);

    alert(
      "Hindi mabura ang expense."
    );
  }
}


// =====================================
// SUMMARY
// =====================================

function renderSummary() {

  let total = 0;

  let purchased = 0;

  const categories = {};


  expenses.forEach(x => {

    const amount =
      Number(
        x.amount || 0
      );


    total += amount;


    if (x.purchased) {
      purchased += amount;
    }


    const key =
      x.type ||
      "other expenses";


    categories[key] =
      (categories[key] || 0) +
      amount;
  });


  const remaining =
    total - purchased;


  const budget =
    Number(
      currentData.researchBudget || 0
    );


  $("totalExpenses").textContent =
    peso(total);


  $("purchasedExpenses").textContent =
    peso(purchased);


  $("remainingExpenses").textContent =
    peso(remaining);


  $("budgetLeft").textContent =
    budget > 0
      ? peso(
          budget - total
        )
      : "—";


  $("categorySummary").innerHTML =
    "";


  Object.entries(
    categories
  ).forEach(
    ([key, value]) => {

      const box =
        document.createElement("div");


      box.className =
        "summary-box";


      box.innerHTML =
        `
        <span>
          ${prettyType(key)}
        </span>

        <b>
          ${peso(value)}
        </b>
        `;


      $("categorySummary")
        .appendChild(box);
    }
  );


  if (
    !Object.keys(categories).length
  ) {

    $("categorySummary").innerHTML =
      '<p class="muted">Wala pang category data.</p>';
  }
}


// =====================================
// SEARCH
// =====================================

$("expenseSearch").addEventListener(
  "input",
  renderExpenses
);


// =====================================
// FILTER
// =====================================

$("expenseFilter").addEventListener(
  "change",
  renderExpenses
);


// =====================================
// PRINT
// =====================================

$("printBtn").addEventListener(
  "click",
  () => {

    updatePrintInfo();

    window.print();
  }
);


// =====================================
// PRINT INFORMATION
// =====================================

function updatePrintInfo() {

  const research =
    currentData.research || {};


  $("printResearchTitle").textContent =
    research.title ||
    "Walang research title";


  $("printResearchMembers").textContent =
    Array.isArray(research.members) &&
    research.members.length
      ? research.members.join(", ")
      : "Wala pang members";
}


// =====================================
// EXPORT EXCEL
// =====================================

$("exportExcelBtn").addEventListener(
  "click",
  exportToExcel
);


function exportToExcel() {

  if (
    !window.XLSX
  ) {

    alert(
      "Hindi ma-load ang Excel export library."
    );

    return;
  }


  const research =
    currentData.research || {};


  const title =
    research.title ||
    "Research Expense Report";


  const product =
    research.product ||
    "—";


  const memberList =
    Array.isArray(
      research.members
    )
      ? research.members.join(", ")
      : "—";


  // =================================
  // SHEET DATA
  // =================================

  const rows = [

    [
      "IPON CHALLENGE — RESEARCH EXPENSE REPORT"
    ],

    [],

    [
      "Research Title",
      title
    ],

    [
      "Product",
      product
    ],

    [
      "Research Members",
      memberList
    ],

    [
      "Research Budget",
      Number(
        currentData.researchBudget || 0
      )
    ],

    [],

    [
      "Item / Expense",
      "Type",
      "Amount",
      "Planned Date",
      "Purchased Date",
      "Status",
      "Deducted From Savings"
    ]

  ];


  expenses.forEach(x => {

    rows.push([

      x.name || "",

      prettyType(
        x.type
      ),

      Number(
        x.amount || 0
      ),

      x.plannedDate || "",

      x.purchasedDate || "",

      x.purchased
        ? "NABILI NA"
        : "HINDI PA",

      x.deductedFromSavings
        ? "YES"
        : "NO"

    ]);
  });


  // =================================
  // CREATE WORKBOOK
  // =================================

  const worksheet =
    XLSX.utils.aoa_to_sheet(
      rows
    );


  worksheet["!cols"] = [

    { wch: 35 },

    { wch: 25 },

    { wch: 15 },

    { wch: 18 },

    { wch: 18 },

    { wch: 18 },

    { wch: 25 }

  ];


  const workbook =
    XLSX.utils.book_new();


  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Research Expenses"
  );


  // =================================
  // FILE NAME
  // =================================

  const safeTitle =
    title
      .replace(
        /[\\/:*?"<>|]/g,
        ""
      )
      .trim()
      .replace(
        /\s+/g,
        "_"
      )
      .slice(
        0,
        60
      );


  const fileName =
    `${
      safeTitle ||
      "Research"
    }_Expenses.xlsx`;


  XLSX.writeFile(
    workbook,
    fileName
  );
}


// =====================================
// PESO
// =====================================

function peso(value) {

  return new Intl.NumberFormat(
    "en-PH",
    {
      style: "currency",
      currency: "PHP"
    }
  ).format(value);
}