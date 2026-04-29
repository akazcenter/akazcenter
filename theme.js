// Dark Mode System

window.toggleTheme = function(){
  document.body.classList.toggle("dark");

  const isDark = document.body.classList.contains("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");

  updateIcon();
};

function updateIcon(){
  const isDark = document.body.classList.contains("dark");

  document.querySelectorAll(".theme-btn").forEach(btn=>{
    btn.innerText = isDark ? "☀️" : "🌙";
  });
}

window.addEventListener("DOMContentLoaded", ()=>{
  const saved = localStorage.getItem("theme");

  if(saved === "dark"){
    document.body.classList.add("dark");
  }

  updateIcon();
});
