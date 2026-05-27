const navLinks = document.querySelectorAll(".side-nav a, .corner-nav a");

navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
        event.preventDefault();

        const group = link.closest("nav");
        group.querySelectorAll("a").forEach((item) => item.classList.remove("active"));
        link.classList.add("active");
    });
});
