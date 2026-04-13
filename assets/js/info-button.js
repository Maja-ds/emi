        $(document).ready(function () {

            const $button = $('#infoButton');
            const $popup = $('#infoPopup');

            $button.on('click', function (e) {
                e.stopPropagation();
                $popup.toggle();
            });

            $(document).on('click', function () {
                $popup.hide();
            });

            $popup.on('click', function (e) {
                e.stopPropagation();
            });

        });