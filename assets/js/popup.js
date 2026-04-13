        function togglePopup(event, element) {
            event.stopPropagation();
            const popup = element.querySelector('.popup');
            const isOpen = popup.classList.contains('active');

            // alle Popups schließen
            document.querySelectorAll('.popup').forEach(p => p.classList.remove('active'));

            if (!isOpen) popup.classList.add('active');
        }

        // Klick irgendwo schließt alle Popups
        document.addEventListener('click', function () {
            document.querySelectorAll('.popup').forEach(p => p.classList.remove('active'));
        });