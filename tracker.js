import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getFirestore, doc, setDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyArYShiKgAnblA4aDEIr7zAM2q7oHbATJQ",
  projectId: "akazcenter-89c17"
});

const db = getFirestore(app);

// معرف الجهاز
function getId(){
  let id = localStorage.getItem("akazDevice");
  if(!id){
    id = "dev_" + Math.random().toString(36).slice(2);
    localStorage.setItem("akazDevice", id);
  }
  return id;
}

// اسم الصفحة
function page(){
  return location.pathname.split("/").pop() || "index";
}

// إرسال التواجد
async function ping(){
  await setDoc(doc(db,"activeDevices",getId()),{
    page: page(),
    lastSeen: new Date()
  });
}

// تسجيل النشاط
async function log(action){
  await addDoc(collection(db,"activityLogs"),{
    device:getId(),
    page:page(),
    action:action,
    time:new Date()
  });
}

// كل 20 ثانية
setInterval(ping,20000);
ping();

// تتبع الضغط
document.addEventListener("click",e=>{
  if(e.target.tagName==="BUTTON"){
    log("ضغط زر");
  }
});

// تتبع التعديلات
document.addEventListener("change",()=>{
  log("تعديل بيانات");
});