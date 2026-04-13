document.addEventListener("DOMContentLoaded", function () {

    const sections = document.querySelectorAll(".content h2");
    const links = document.querySelectorAll("#toc a");

    
    window.addEventListener("scroll", () => {
        let current = "";

        sections.forEach(section => {
            const top = section.getBoundingClientRect().top;
            if (top <= 100) current = section.id;
        });

        links.forEach(link => {
            link.classList.remove("active");
            if (link.getAttribute("href") === "#" + current) {
                link.classList.add("active");
            }
        });
    });

    links.forEach(link => {
        link.addEventListener("click", function (e) {
            e.preventDefault();

            const targetId = this.getAttribute("href");
            const target = document.querySelector(targetId);

            if (target) {
                target.scrollIntoView({ behavior: "smooth" });

                history.replaceState(null, null, targetId);
            }
        });
    });

});
