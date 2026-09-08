import { auth, db, storage } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, deleteDoc,
  serverTimestamp, increment, query, orderBy
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

let currentUser = null;
let expenses = [];
let currentData = {};
let members = [];

const $ = (id) => document.getElementById(id);

onAuthStateChanged(auth, async (user) => {
  if (!user) { location.href = "login.html"; return; }
  currentUser = user;
  $("userEmail").textContent = user.email || "";
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists() || (snap.data().accountType || "personal") !== "research") {
      alert("Ang Research Expenses ay para lamang sa Research account.");
      location.href = "dashboard.html";
      return;
    }
    currentData = snap.data();
    loadProject();
    await loadExpenses();
  } catch (e) {
    console.error(e);
    alert("Hindi ma-load ang research account. Check ang Firestore rules.");
  }
});

$("logoutBtn").addEventListener("click", async () => { await signOut(auth); location.href = "login.html"; });

function loadProject() {
  const r = currentData.research || {};
  $("product").value = r.product || "";
  $("projectTitle").value = r.title || "";
  $("researchBudget").value = currentData.researchBudget ?? "";
  members = Array.isArray(r.members) ? [...r.members] : [];
  renderMembers();
}

$("projectForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = $("projectMessage");
  const product = $("product").value.trim();
  const title = $("projectTitle").value.trim();
  const budget = Number($("researchBudget").value || 0);
  try {
    await updateDoc(doc(db, "users", currentUser.uid), {
      research: { ...(currentData.research || {}), product, title, members },
      researchBudget: budget
    });
    currentData.research = { ...(currentData.research || {}), product, title, members };
    currentData.researchBudget = budget;
    msg.textContent = "Na-save na ang project information!";
    msg.className = "form-message success";
  } catch (e) { console.error(e); msg.textContent = "Hindi ma-save ang project."; msg.className = "form-message error"; }
});

$("addMemberBtn").addEventListener("click", () => {
  members.push("");
  renderMembers();
});

$("saveMembersBtn").addEventListener("click", async () => {
  const msg = $("membersMessage");
  members = [...document.querySelectorAll(".member-input")].map(x => x.value.trim()).filter(Boolean);
  try {
    await updateDoc(doc(db, "users", currentUser.uid), { "research.members": members });
    currentData.research = { ...(currentData.research || {}), members };
    msg.textContent = "Na-save na ang research members!";
    msg.className = "form-message success";
    renderMembers();
  } catch (e) { console.error(e); msg.textContent = "Hindi ma-save ang members."; msg.className = "form-message error"; }
});

function renderMembers() {
  const list = $("membersList"); list.innerHTML = "";
  if (!members.length) {
    const empty = document.createElement("p"); empty.className="muted"; empty.textContent="Wala pang members. I-click ang + ADD MEMBER.";
    list.appendChild(empty); return;
  }
  members.forEach((name, i) => {
    const row = document.createElement("div"); row.className="member-row";
    const input=document.createElement("input"); input.className="member-input"; input.placeholder=`Research member ${i+1}`; input.value=name;
    const btn=document.createElement("button"); btn.type="button"; btn.className="btn danger small-btn"; btn.textContent="REMOVE";
    btn.onclick=()=>{ members.splice(i,1); renderMembers(); };
    row.append(input,btn); list.appendChild(row);
  });
}

$("expenseType").addEventListener("change", () => {
  $("otherSpecifyWrap").hidden = $("expenseType").value !== "other expenses";
});

$("purchased").addEventListener("change", () => {
  $("purchasedDate").required = $("purchased").checked;
});

$("expenseForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg=$("expenseMessage");
  const name=$("expenseName").value.trim(), type=$("expenseType").value;
  const other=$("otherSpecify").value.trim(), amount=Number($("expenseAmount").value);
  const plannedDate=$("plannedDate").value, isPurchased=$("purchased").checked;
  const purchasedDate=$("purchasedDate").value;
  const deduct=$("deductSavings").checked;
  const file=$("expensePhoto").files[0];

  if (!name || !Number.isFinite(amount) || amount<=0 || !plannedDate) {
    msg.textContent="Kumpletuhin ang item, amount, at planned purchase date.";
    msg.className="form-message error"; return;
  }
  if (type==="other expenses" && !other) {
    msg.textContent="I-specify muna ang Other Expense."; msg.className="form-message error"; return;
  }
  if (isPurchased && !purchasedDate) {
    msg.textContent="Ilagay ang actual date kung kailan binili."; msg.className="form-message error"; return;
  }
  if (file && file.size > 5*1024*1024) {
    msg.textContent="Maximum 5MB lang ang picture."; msg.className="form-message error"; return;
  }

  msg.textContent="Saving expense...";
  try {
    const expenseRef = await addDoc(collection(db,"users",currentUser.uid,"researchExpenses"), {
      name, type, otherSpecify: type==="other expenses" ? other : "",
      amount, plannedDate, purchasedDate: isPurchased ? purchasedDate : "",
      purchased:isPurchased, deductedFromSavings: false, photoUrl:"", photoPath:"",
      createdAt:serverTimestamp()
    });

    let photoUrl="", photoPath="";
    if (file) {
      photoPath=`research/${currentUser.uid}/${expenseRef.id}/${Date.now()}-${safeFileName(file.name)}`;
      const storageRef=ref(storage,photoPath);
      await uploadBytes(storageRef,file,{contentType:file.type});
      photoUrl=await getDownloadURL(storageRef);
      await updateDoc(expenseRef,{photoUrl,photoPath});
    }

    if (isPurchased && deduct) {
      await updateDoc(doc(db,"users",currentUser.uid), {totalSavings:increment(-amount)});
      await updateDoc(expenseRef,{deductedFromSavings:true});
    }

    $("expenseForm").reset();
    $("otherSpecifyWrap").hidden=true; $("purchasedDate").required=false;
    msg.textContent="Na-add na ang research expense!";
    msg.className="form-message success";
    await loadExpenses();
  } catch(e) {
    console.error(e);
    msg.textContent="Hindi na-save ang expense. Check Firestore/Storage rules.";
    msg.className="form-message error";
  }
});

async function loadExpenses() {
  const snap=await getDocs(query(collection(db,"users",currentUser.uid,"researchExpenses"),orderBy("createdAt","desc")));
  expenses=snap.docs.map(d=>({id:d.id,...d.data()}));
  renderExpenses();
  renderSummary();
}

function renderExpenses() {
  const body=$("expensesBody"), search=$("expenseSearch").value.trim().toLowerCase(), filter=$("expenseFilter").value;
  const list=expenses.filter(x=>{
    const text=`${x.name||""} ${x.type||""} ${x.otherSpecify||""}`.toLowerCase();
    const searchOk=!search||text.includes(search);
    const filterOk=filter==="all"||(filter==="purchased"&&x.purchased)||(filter==="pending"&&!x.purchased)||x.type===filter;
    return searchOk&&filterOk;
  });
  body.innerHTML="";
  if(!list.length){body.innerHTML='<tr><td colspan="8" class="muted">Walang expense na tumutugma.</td></tr>';return;}
  list.forEach(x=>{
    const tr=document.createElement("tr");
    addCell(tr, `${x.name||"—"}${x.type==="other expenses"&&x.otherSpecify?` — ${x.otherSpecify}`:""}`);
    addCell(tr, prettyType(x.type));
    addCell(tr,peso(Number(x.amount||0)));
    addCell(tr,x.plannedDate||"—");
    addCell(tr,x.purchasedDate||"—");
    const status=document.createElement("td"); status.innerHTML=x.purchased?'<span class="status purchased">✓ NABILI NA</span>':'<span class="status pending">○ HINDI PA</span>'; tr.appendChild(status);
    const photo=document.createElement("td");
    if(x.photoUrl){const a=document.createElement("a");a.href=x.photoUrl;a.target="_blank";a.rel="noopener";const img=document.createElement("img");img.className="expense-thumb";img.src=x.photoUrl;img.alt="Documentation";a.appendChild(img);photo.appendChild(a);}
    else {photo.textContent="—";photo.className="muted";}
    tr.appendChild(photo);
    const action=document.createElement("td"); action.className="action-cell";
    const toggle=document.createElement("button"); toggle.className=`btn ${x.purchased?"secondary":"primary"} small-btn`; toggle.textContent=x.purchased?"MARK UNPURCHASED":"MARK PURCHASED"; toggle.onclick=()=>togglePurchased(x);
    const del=document.createElement("button"); del.className="btn danger small-btn"; del.textContent="DELETE"; del.onclick=()=>removeExpense(x);
    action.append(toggle,del); tr.appendChild(action); body.appendChild(tr);
  });
}

function addCell(row,text){const c=document.createElement("td");c.textContent=text;row.appendChild(c);}
function prettyType(t){return t==="research components"?"Research Components":t==="research materials"?"Research Materials":"Other Expenses";}

async function togglePurchased(x) {
  const next=!x.purchased;
  let deduct=x.deductedFromSavings;
  if(next) {
    const date=prompt("Actual date kung kailan binili (YYYY-MM-DD):", new Date().toISOString().slice(0,10));
    if(!date) return;
    const useSavings=confirm(`Ibawas ang ${peso(Number(x.amount||0))} sa Research Savings?\n\nOK = Oo\nCancel = Hindi`);
    if(useSavings && !deduct) {
      await updateDoc(doc(db,"users",currentUser.uid),{totalSavings:increment(-Number(x.amount||0))});
      deduct=true;
    }
    await updateDoc(doc(db,"users",currentUser.uid,"researchExpenses",x.id),{purchased:true,purchasedDate:date,deductedFromSavings:deduct});
  } else {
    if(deduct) {
      await updateDoc(doc(db,"users",currentUser.uid),{totalSavings:increment(Number(x.amount||0))});
    }
    await updateDoc(doc(db,"users",currentUser.uid,"researchExpenses",x.id),{purchased:false,purchasedDate:"",deductedFromSavings:false});
  }
  await loadExpenses();
}

async function removeExpense(x) {
  if(!confirm(`Burahin ang "${x.name}"?`)) return;
  try {
    if(x.deductedFromSavings) await updateDoc(doc(db,"users",currentUser.uid),{totalSavings:increment(Number(x.amount||0))});
    await deleteDoc(doc(db,"users",currentUser.uid,"researchExpenses",x.id));
    if(x.photoPath){try{await deleteObject(ref(storage,x.photoPath));}catch(e){console.warn(e);}}
    await loadExpenses();
  } catch(e){console.error(e);alert("Hindi mabura ang expense.");}
}

function renderSummary() {
  let total=0,purchased=0; const cats={};
  expenses.forEach(x=>{const a=Number(x.amount||0);total+=a;if(x.purchased)purchased+=a;const k=x.type||"other expenses";cats[k]=(cats[k]||0)+a;});
  const remaining=total-purchased,budget=Number(currentData.researchBudget||0);
  $("totalExpenses").textContent=peso(total);$("purchasedExpenses").textContent=peso(purchased);$("remainingExpenses").textContent=peso(remaining);
  $("budgetLeft").textContent=budget>0?peso(budget-total):"—";
  $("categorySummary").innerHTML="";
  Object.entries(cats).forEach(([k,v])=>{const d=document.createElement("div");d.className="summary-box";d.innerHTML=`<span>${prettyType(k)}</span><b>${peso(v)}</b>`;$("categorySummary").appendChild(d);});
  if(!Object.keys(cats).length)$("categorySummary").innerHTML='<p class="muted">Wala pang category data.</p>';
}

$("expenseSearch").addEventListener("input",renderExpenses);
$("expenseFilter").addEventListener("change",renderExpenses);
$("printBtn").addEventListener("click",()=>window.print());

function safeFileName(name){return name.replace(/[^a-zA-Z0-9._-]/g,"_");}
function peso(v){return new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP"}).format(v);}
