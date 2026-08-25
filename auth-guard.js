import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyArYShiKgAnb1A4aDEIr7zAM2q7ohbATJQ",
  authDomain: "akazcenter-89c17.firebaseapp.com",
  projectId: "akazcenter-89c17",
  storageBucket: "akazcenter-89c17.firebasestorage.app",
  messagingSenderId: "576111794528",
  appId: "1:576111794528:web:b7ee436f5bd0b60c4a6605",
  measurementId: "G-VYXM40GDCG"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.documentElement.style.visibility = "hidden";

onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  document.documentElement.style.visibility = "visible";
});
