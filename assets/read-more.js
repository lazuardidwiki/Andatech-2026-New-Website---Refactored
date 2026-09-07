document.addEventListener("DOMContentLoaded", function() {
  document.querySelectorAll(".read-more-container").forEach(function(container) {
    const btn = container.querySelector(".read-more-btn");
    const content = container.querySelector(".read-more-content");
    
    btn.addEventListener("click", function(event) {
      event.preventDefault();
      content.style.display = content.style.display === "none" || content.style.display === "" ? "block" : "none";
      btn.textContent = content.style.display === "block" ? "Read Less" : "Read More";
    });
  });
});
