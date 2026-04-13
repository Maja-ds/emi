           function splitValues(value) {
               if (!value) return [];
               return value.split(',').map(v => v.trim());
           }
           const religionMapping = {
               "Jüdisch": ["jüdisch"],
               "Christlich": ["christlich"],
               "Freikirchen": ["freikirchen"],
               "Andere": ["andere"],
               "Konfessionslos": ["konfessionslos"],
               "k.A.": ["k.a."]
           };

            function applyFilter() {
                let mode = $('input[name="mode"]:checked').val();

                let berufsSelected = $('.berufsCheckbox:checked').map((i, e) => e.value).get();
                if (berufsSelected.includes("all")) berufsSelected = [];
                let bereich = $('#bereichFilter').val();
                let disziSelected = $('.disziCheckbox:checked').map((i, e) => e.value).get();
                if (disziSelected.includes("all")) disziSelected = [];
                let landSelected = $('.landCheckbox:checked').map((i, e) => e.value).get();
                if (landSelected.includes("all")) landSelected = [];
                let emigLandSelected = $('.emigLandCheckbox:checked').map((i, e) => e.value).get();
                if (emigLandSelected.includes("all")) emigLandSelected = [];


                $.fn.dataTable.ext.search = [];
                $.fn.dataTable.ext.search.push(function (settings, data, index) {
                    let row = table.row(index).data();

                    // --- Jahresfilter für alle yearFilter-Felder ---
                    let yearPass = true;
                    $('.yearFilter').each(function () {
                        const inputVal = $(this).val().trim();
                        const columnName = $(this).data('column');
                        const rowValue = parseInt(row[columnName]);

                        if (!inputVal) return;

                        const filters = parseYearInput(inputVal);

                        if (isNaN(rowValue)) { yearPass = false; return false; }

                        // OR für "=" Filter
                        const eqFilters = filters.filter(f => f.op === "=");
                        if (eqFilters.length > 0) {
                            let match = eqFilters.some(f => rowValue === f.year);
                            if (!match) { yearPass = false; return false; }
                        }

                        // AND für andere Operatoren
                        const otherFilters = filters.filter(f => f.op !== "=");
                        for (let f of otherFilters) {
                            const { op, year } = f;
                            if (op === ">" && !(rowValue > year)) { yearPass = false; return false; }
                            if (op === "<" && !(rowValue < year)) { yearPass = false; return false; }
                            if (op === ">=" && !(rowValue >= year)) { yearPass = false; return false; }
                            if (op === "<=" && !(rowValue <= year)) { yearPass = false; return false; }
                        }
                    });
                    if (!yearPass) return false;
                    // --- Berufsgruppe / Bereich / Disziplin ---
                    if (mode === "alle") {
                        if (berufsSelected.length > 0 && !berufsSelected.some(v => splitValues(row.Berufsgruppe).includes(v))) return false;
                    } else {
                        if (row.Bereich !== "Geisteswissenschaften" && row.Bereich !== "Exakte Wissenschaften") return false;
                        if (bereich !== "Alle" && row.Bereich !== bereich) return false;
                        if (disziSelected.length > 0 && !disziSelected.some(v => splitValues(row.Disziplin).includes(v))) return false;
                    }

                    let religionSelected = $('input[name="religionFilter"]:checked').map((i, e) => e.value).get();

                    // "All" bedeutet: keine Einschränkung
                    if (religionSelected.includes("all")) religionSelected = [];

                    if (religionSelected.length > 0) {
                        const relText = (row.Religion_Gruppe || "").toLowerCase();
                        const matches = religionSelected.some(cat =>
                            religionMapping[cat].some(term => relText.includes(term))
                        );
                        if (!matches) return false;
                    }
                    if (landSelected.length > 0) {
                        const land = row.Ausreiseland; // neue Spalte
                        if (!land || land.toLowerCase() === "k.a.") return false; // optional k.A. ausschließen
                        if (!landSelected.includes(land)) return false;
                    }
                    if (emigLandSelected.length > 0) {

                        if (!row.Emigrationsland) return false;

                        // Werte aus der Tabelle (auch Komma-getrennt)
                        let rowLaender = row.Emigrationsland
                            .split(',')
                            .map(v => v.trim());

                        // Prüfen, ob mindestens ein Land passt
                        let match = emigLandSelected.some(l => rowLaender.includes(l));

                        if (!match) return false;
                    }

                    return true;
                });

                table.draw();

                $('#rowCount').text(table.rows({ filter: 'applied' }).count());
                updateFilterStatus();
            }