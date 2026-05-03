import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyArYShiKgAnblA4aDEIr7zAM2q7oHbATJQ",
  authDomain: "akazcenter-89c17.firebaseapp.com",
  projectId: "akazcenter-89c17",
  storageBucket: "akazcenter-89c17.firebasestorage.app",
  messagingSenderId: "576111794528",
  appId: "1:576111794528:web:b7ee436f5bd0b60c4a6605"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function getDeviceId(){
  let id = localStorage.getItem("akazDeviceId");
  if(!id){
    id = "device_" + Date.now() + "_" + Math.random().toString(36).slice(2,8);
    localStorage.setItem("akazDeviceId", id);
  }
  return id;
}

function getPageName(){
  const path = location.pathname.split("/").pop() || "index.html";

  const names = {
    "index.html":"الصفحة الرئيسية",
    "work-schedule.html":"جدول الدوام",
    "kids-rooms.html":"غرف الأطفال",
    "hydrotherapy.html":"العلاج المائي",
    "home-visits.html":"الزيارات المنزلية",
    "suggestions.html":"الاقتراحات",
    "therapist-planners.html":"جداول الأخصائيين",
    "therapist-calendar.html":"جدول أخصائي",
    "new-assessment-entry.html":"مدخل توزيع الكشف",
    "new-assessment-view.html":"عرض توزيع الكشف",
    "new-assessment-queue.html":"استقبال الكشف الجديد",
    "functional-assessments.html":"التقييمات الوظيفية",
    "admin.html":"لوحة الإدارة"
  };

  return names[path] || path;
}

async function sendPresence(){
  const id = getDeviceId();

  await setDoc(doc(db, "activeDevices", id), {
    id,
    page: getPageName(),
    url: location.pathname.split("/").pop() || "index.html",
    lastSeen: new Date(),
    userAgent: navigator.userAgent,
    updatedAt: new Date()
  });
}

sendPresence();
setInterval(sendPresence, 20000);
