const filterState = {
    mode: "alle",

    berufsgruppen: [],
    bereich: "Alle",
    disziplinen: [],

    religion: [],
    land: [],
    emigLand: [],

    jahr: {
        geburtsjahr: "",
        sterbejahr: "",
        ausreisejahr: ""
    }
};

$(function () {

    loadFilterState();
    function showLoading() {
        $('#loadingOverlay').addClass('show').show();
    }

    function hideLoading() {
        $('#loadingOverlay').removeClass('show');
        // Nach Animation ausblenden
        setTimeout(() => { $('#loadingOverlay').hide(); }, 300); // 300ms = Dauer der Transition
    }

    // HILFSFUNKTIONEN
    // Zerlegt kommaseparierte Werte in ein Array
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
    function saveFilterState() {
        sessionStorage.setItem('filterState', JSON.stringify(filterState));
    }
    function loadFilterState() {
        const saved = sessionStorage.getItem('filterState');

        if (!saved) return;

        const parsed = JSON.parse(saved);

        Object.assign(filterState, parsed);
    }

    /* DATATABLE INITIALISIERUNG */

    let table = $('#demo').DataTable({
        data: daten,
        pageLength: 10,
        order: [[0, 'asc']],
        orderCellsTop: true,
        mark: true,
        language: {
            lengthMenu: "_MENU_  Einträge pro Seite",
            paginate: {
                previous: "«",
                next: "»"
            }
        },
        autoWidth: false,
        dom: "<'row'<'col-sm-4'l><'col-sm-4'p>>" + "t" + "<'row'<'col-sm-12'p>>",
        columns: [
            {
                data: "Name",
                render: function (data, type, row) {

                    // Anzeige in der Tabelle
                    if (type === "display") {
                        return `
<span class="tooltip-name">
                ${data}
                <span class="info-text">
                    <strong>${data}</strong><br>
                    ${row.Detailtext}
                </span>
</span>`;
                    }

                    if (type === "filter" || type === "search") {
                        return data;
                    }

                    return data;
                }
            },
            { data: "Beruf" },
            { data: "Geboren", orderable: false },
            { data: "Gestorben", orderable: false },
            { data: "Konfession", orderable: false },
            { data: "Ausreiseort" },
            { data: "Emigrationsweg", orderable: false }
        ]
    })

    /* SUCHFILTER */

    function escapeRegex(text) {
        return text.replace(/[.*+?^${}()[\]\\]/g, '\\$&');
    }

    function buildSearchRegex(input) {
        if (!input) return '';

        let tokens = input.trim().split(/\s+/);

        let parts = tokens.map(t => {

            // OR-Bedingung
            if (t.includes('|')) {
                let orParts = t
                    .split('|')
                    .map(p => escapeRegex(p.trim()))
                    .filter(Boolean);

                return '(' + orParts.join('|') + ')';
            }

            // AND-Teil
            return escapeRegex(t);

        }).filter(Boolean);

        // AND-Verknüpfung
        return parts.map(p => '(?=.*' + p + ')').join('');
    }

    $('#demo thead tr:eq(1) th').each(function (i) {
        let title = $(this).text();
        $(this).html('<input type="text" placeholder="' + title + '" style="width:100%;"/>');
    });


    // Spaltenfilter (UND / ODER / NOT)
    $('#demo thead tr:eq(1) input').on('keyup change', function () {

        let colIndex = $(this).closest('th').index();
        let val = $(this).val().trim();

        let regex = buildSearchRegex(val);

        table
            .column(colIndex)
            .search(regex, true, false)
            .draw();
    });

    // Highlighting
    table.on('draw', function () {

        $('#demo tbody td').unmark();

        $('#demo thead tr:eq(1) input').each(function (colIndex) {

            let val = $(this).val().trim();
            if (!val) return;

            let tokens = val.match(/"[^"]+"|\S+/g) || [];

            let terms = tokens
                .filter(t => !t.startsWith('!'))
                .flatMap(t => {
                    if (t.includes('|')) return t.split('|');
                    if (t.startsWith('"')) return [t.slice(1, -1)];
                    return [t];
                });

            $('#demo tbody tr').each(function () {
                $(this).find('td').eq(colIndex).mark(terms, {
                    separateWordSearch: false,
                    exclude: ['.info-text'] 
                });
            });

        });

    });

    // Update Row Count
    function updateRowCount() {
        let count = table.rows({ search: 'applied' }).count();
        $('#rowCount').text(count);
    }
    table.on('draw', updateRowCount);
    updateRowCount();

    // Berufsgruppe Dropdown
    function createBerufsgruppeDropdown() {
        let container = $('#berufsgruppeDropdown');
        container.empty();
        container.append('<button type="button" class="filter-btn">Berufsgruppe wählen</button>');

        let box = $('<div class="filter-box"></div>');

        // "Alle" Checkbox immer zuerst
        box.append(`<label><input type="checkbox" class="berufsCheckbox" value="all" checked> Alle</label><br>`);

        // Berufsgruppen dynamisch ermitteln
        let berufsgruppen = [...new Set(daten.flatMap(d => splitValues(d.Berufsgruppe)))].sort();
        berufsgruppen = berufsgruppen.filter(v => v !== "Sonstige")
            .concat(berufsgruppen.includes("Sonstige") ? ["Sonstige"] : []);

        // Berufsgruppen hinzufügen
        berufsgruppen.forEach(v => box.append(`<label><input type="checkbox" class="berufsCheckbox" value="${v}"> ${v}</label><br>`));

        container.append(box);
    }
    createBerufsgruppeDropdown();
    renderFiltersFromState();

    // Fachbereichdropdown
    function createDisziplinDropdown(bereich, selectedValues = []) {
        
        if (!bereich) bereich = "Alle";

        const container = $('#disziplinDropdown');
        container.empty();

        container.append('<button type="button" class="filter-btn">Fachbereich wählen</button>');

        const box = $('<div class="filter-box"></div>');

        // STATE-DEFINITION:
        // [] = ALLE aktiv
        const isAllActive = selectedValues.length === 0;

        // ALL checkbox (nur UI)
        box.append(`
        <label>
            <input type="checkbox"
                   class="disziCheckbox"
                   value="all"
                   ${isAllActive ? "checked" : ""}>
            Alle
        </label><br>
    `);

        // Disziplinen berechnen
        let disziplinen = [...new Set(
            daten
                .filter(d => bereich === "Alle" || d.Bereich === bereich)
                .flatMap(d => splitValues(d.Fachbereich))
        )].sort();

        const ohneSonstige = disziplinen.filter(v => v !== "Sonstige");
        const mitSonstige = disziplinen.includes("Sonstige")
            ? [...ohneSonstige, "Sonstige"]
            : ohneSonstige;

        // Checkboxen
        mitSonstige.forEach(v => {

            const checked = selectedValues.includes(v);

            box.append(`
            <label>
                <input type="checkbox"
                       class="disziCheckbox"
                       value="${v}"
                       ${checked ? "checked" : ""}>
                ${v}
            </label><br>
        `);
        });

        container.append(box);
        box.find('input.disziCheckbox[value="all"]')
            .prop('checked', isAllActive);
    }

    //Ausreiselanddropdown
    function createLandDropdown() {
        let container = $('#landDropdown'); // Container div im HTML
        container.empty();
        container.append('<button type="button" class="filter-btn">Ausreiseland wählen</button>');

        let box = $('<div class="filter-box"></div>');
        const isAllActive = filterState.land.length === 0;
        // "Alle" Checkbox immer zuerst
        box.append(`
        <label>
            <input type="checkbox"
                   class="landCheckbox"
                   value="all"
                   ${isAllActive ? "checked" : ""}>
            Alle
        </label><br>
    `);

        // Alle Länder extrahieren
        let laender = [...new Set(
            daten
                .map(d => d.Ausreiseland)   // neue Spalte verwenden
                .filter(v => v && v.toLowerCase() !== "k.a.") // k.A. optional ausschließen
        )].sort();

        // Checkboxen für Länder hinzufügen
        laender.forEach(l => {

            const checked = filterState.land.includes(l);

            box.append(`
            <label>
                <input type="checkbox"
                       class="landCheckbox"
                       value="${l}"
                       ${checked ? "checked" : ""}>
                ${l}
            </label><br>
        `);
        });

        container.append(box);
    }
    function updateLandOptions(dataArray) {
        let container = $('#landDropdown');
        let box = container.find('.filter-box');
        box.empty();
        const isAllActive = filterState.land.length === 0;

        box.append(`
    <label>
        <input type="checkbox"
               class="landCheckbox"
               value="all"
               ${isAllActive ? "checked" : ""}>
        Alle
    </label><br>
`);
        let laender = [...new Set(
            dataArray
                .map(d => d.Ausreiseland) // neue Spalte
                .filter(v => v && v.toLowerCase() !== "k.a.")
        )].sort();

        laender.forEach(l => {

            const checked = filterState.land.includes(l);

            box.append(`
            <label>
                <input type="checkbox"
                       class="landCheckbox"
                       value="${l}"
                       ${checked ? "checked" : ""}>
                ${l}
            </label><br>
        `);
        });
    }
    createLandDropdown();
    updateLandOptions(daten);
    $('#disziplinDropdown').hide();
    renderFiltersFromState();

    //Emigrationslanddropdown

    function createEmigrationslandDropdown() {

        let container = $('#emigrationslandDropdown');

        // Existierende filter-box entfernen (falls neu aufgebaut wird)
        container.find('.filter-box').remove();

        let box = $('<div class="filter-box"></div>');

        // "Alle"-Checkbox
        box.append(`<label><input type="checkbox" class="emigLandCheckbox" value="all" checked> Alle</label><br>`);

        // Länder extrahieren (auch bei Komma-getrennten Werten)
        let laender = [...new Set(
            daten
                .flatMap(d => {
                    if (!d.Emigrationsland) return [];
                    return d.Emigrationsland
                        .split(',')
                        .map(v => v.trim())
                        .filter(v => v && v !== "k.A."); // nur k.A. ausschließen
                })
        )].sort();

        // Checkboxen hinzufügen
        laender.forEach(l => {
            box.append(`<label><input type="checkbox" class="emigLandCheckbox" value="${l}"> ${l}</label><br>`);
        });

        // Box anhängen (Button bleibt erhalten!)
        container.append(box);
    }
    function updateEmigrationslandDropdown(dataArray) {
        let container = $('#emigrationslandDropdown');

        // Alte Box löschen, falls vorhanden
        container.find('.filter-box').remove();

        let box = $('<div class="filter-box"></div>');

        // "Alle"-Checkbox immer zuerst
        box.append(`<label><input type="checkbox" class="emigLandCheckbox" value="all" checked> Alle</label><br>`);

        // Länder aus den aktuellen Daten extrahieren (split bei Komma, trim, k.A. ausschließen)
        let laender = [...new Set(
            dataArray
                .flatMap(d => {
                    if (!d.Emigrationsland) return [];
                    return d.Emigrationsland
                        .split(',')
                        .map(v => v.trim())
                        .filter(v => v && v.toLowerCase() !== "k.a."); // k.A. wird ausgeschlossen
                })
        )].sort();

        laender.forEach(l => {
            box.append(`<label><input type="checkbox" class="emigLandCheckbox" value="${l}"> ${l}</label><br>`);
        });

        container.append(box);
    }

    createEmigrationslandDropdown();
    updateEmigrationslandDropdown(daten);

 

       function restoreUIFromState() {

            // MODE
            $('input[name="mode"]').each(function () {
                this.checked = ($(this).val() === filterState.mode);
            });

            // BEREICH
            $('#bereichFilter input').each(function () {
                this.checked = ($(this).val() === filterState.bereich);
            });
           let dataForDropdown;
            if (filterState.mode === "alle") {

                $('#berufsgruppeDropdown').show();
                $('#bereichFilter').hide();

                $('#disziplinDropdown').hide().empty();
                dataForDropdown = daten;

            } else {

                $('#berufsgruppeDropdown').hide();
                $('#bereichFilter').show();

                $('#disziplinDropdown').show().empty();

                createDisziplinDropdown(
                    filterState.bereich || "Alle",
                    filterState.disziplinen
                );
                dataForDropdown = daten.filter(d =>
                    d.Bereich && d.Bereich.trim() !== ""
                );
           }
           updateLandOptions(dataForDropdown);
           updateEmigrationslandDropdown(dataForDropdown);
           renderFiltersFromState();
           applyFilter();
    }

   
        

    // Dropdown öffnen/schließen
    $(document).on('click', '.filter-btn', function (e) {
        e.stopPropagation();
        $(this).siblings('.filter-box').toggle();
    });

    $(document).on('click', function () {
        $('.filter-box').hide();
    });

    $(document).on('click', '.filter-box', function (e) {
        e.stopPropagation();
    });

    /* JAHRESFILTER */
    function parseYearInput(value) {
        if (!value) return [];

        value = value.trim();
        const filters = [];
        const parts = value.split(',').map(s => s.trim());

        for (let part of parts) {
            const subParts = part.split(/\s+/).filter(Boolean);

            for (let sp of subParts) {
                const match = sp.match(/^(<=|>=|<|>)?\s*(\d*)$/);
                const op = match ? (match[1] || "=") : "=";
                const num = match ? match[2] : "";

                // Buchstaben enthalten → sofort 0 Treffer
                if (/[a-zA-Z]/.test(sp)) {
                    return [{ op: "=", year: 0 }];
                }

                // Operator allein, ohne Zahl → warten
                if (num.length === 0) continue;

                // Weniger als 4 Ziffern → warten
                if (/^\d{1,3}$/.test(num)) continue;

                // Genau 4 Ziffern → gültig
                if (/^\d{4}$/.test(num)) {
                    filters.push({ op, year: parseInt(num, 10) });
                    continue;
                }

                // Mehr als 4 Ziffern → 0 Treffer
                if (/^\d{5,}$/.test(num)) {
                    return [{ op: "=", year: 0 }];
                }
            }
        }

        return filters.length > 0 ? filters : null; // null = warten
    }
    function updateFilterStatus() {

        let active = [];

        if (filterState.berufsgruppen.length > 0) {
            active.push("Beruf: " + filterState.berufsgruppen.join(", "));
        }

        if (filterState.bereich && filterState.bereich !== "Alle") {
            active.push("Bereich: " + filterState.bereich);
        }

        if (filterState.disziplinen.length > 0) {
            active.push("Fachbereich: " + filterState.disziplinen.join(", "));
        }
        if (filterState.religion.length > 0) {
            active.push("Konfession: " + filterState.religion.join(", "));
        }

        if (filterState.land.length > 0) {
            active.push("Ausreiseland: " + filterState.land.join(", "));
        }

        if (filterState.emigLand.length > 0) {
            active.push("Zielland: " + filterState.emigLand.join(", "));
        }

        $('#activeFilters').html(active.map(f => `<span>${f}</span>`).join(" "));
    }

    function renderFiltersFromState() {

        // Berufsgruppe
        $('.berufsCheckbox').each(function () {

            const val = $(this).val();

            if (val === "all") {

                // "Alle" ist aktiv, wenn nichts ausgewählt
                this.checked = filterState.berufsgruppen.length === 0;

            } else {

                this.checked = filterState.berufsgruppen.includes(val);
            }
        });
        $('.disziCheckbox').each(function () {

            const val = $(this).val();

            if (val === "all") {

                this.checked = filterState.disziplinen.length === 0;

            } else {

                this.checked = filterState.disziplinen.includes(val);
            }
        });

        $('input[name="religionFilter"]').each(function () {

            const val = $(this).val();

            if (val === "all") {
                this.checked = filterState.religion.length === 0;
            } else {
                this.checked = filterState.religion.includes(val);
            }
        });
        // LAND
        $('.landCheckbox').each(function () {

            const val = $(this).val();

            if (val === "all") {
                this.checked = filterState.land.length === 0;
            } else {
                this.checked = filterState.land.includes(val);
            }
        });
        $('.emigLandCheckbox').each(function () {

            const val = $(this).val();

            if (val === "all") {
                this.checked = filterState.emigLand.length === 0;
            } else {
                this.checked = filterState.emigLand.includes(val);
            }
        });
    }

    // Filterfunktion
    function applyFilter() {
 
        let mode = filterState.mode;
        let berufsSelected = filterState.berufsgruppen;
        let bereich = filterState.bereich;
        let disziSelected = [...filterState.disziplinen];
        let landSelected = [...filterState.land];
        let emigLandSelected = [...filterState.emigLand];
        let religionSelected = [...filterState.religion];


        $.fn.dataTable.ext.search.length = 0;
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

                if (filters === null) return;
                if (filters.length === 0) return false;

                // fehlende Werte immer ausschließen
                if (isNaN(rowValue)) {
                    yearPass = false;
                    return false;
                }

                // exakte Werte (OR)
                const exact = filters.filter(f => f.op === "=");

                if (exact.length > 0) {
                    const match = exact.some(f => rowValue === f.year);
                    if (!match) {
                        yearPass = false;
                        return false;
                    }
                }

                // Bereichsfilter (AND)
                const range = filters.filter(f => f.op !== "=");

                for (let f of range) {
                    const { op, year } = f;

                    if (op === ">" && !(rowValue > year)) {
                        yearPass = false;
                        return false;
                    }

                    if (op === "<" && !(rowValue < year)) {
                        yearPass = false;
                        return false;
                    }
                }
            });

            if (!yearPass) return false;
            // --- Berufsgruppe / Bereich / Disziplin ---
            if (mode === "alle") {

                if (
                    berufsSelected.length > 0 &&
                    !berufsSelected.some(v => splitValues(row.Berufsgruppe).includes(v))
                ) return false;

            } else {

                if (
                    row.Bereich !== "Geisteswissenschaften" &&
                    row.Bereich !== "Exakte Wissenschaften"
                ) return false;

                let bereich = filterState.bereich;

                if (bereich !== "Alle" && row.Bereich !== bereich) return false;

                if (
                    disziSelected.length > 0 &&
                    !disziSelected.some(v => splitValues(row.Fachbereich).includes(v))
                ) return false;
            }

            let religionSelected = [...filterState.religion];
            // "All" bedeutet: keine Einschränkung
            if (religionSelected.includes("all")) religionSelected = [];

            if (religionSelected.length > 0) {
                const relText = (row.Konfession_Gruppe || "").toLowerCase();
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
        saveFilterState();
    }


    // Events
    $(document).on('change', '.berufsCheckbox', function () {

        const value = $(this).val();
        const isChecked = this.checked;

        if (value === "all") {

            // "Alle" = nichts ausgewählt
            filterState.berufsgruppen = [];

        } else {

            if (isChecked) {

                // hinzufügen (falls noch nicht drin)
                if (!filterState.berufsgruppen.includes(value)) {
                    filterState.berufsgruppen.push(value);
                }

            } else {

                // entfernen
                filterState.berufsgruppen =
                    filterState.berufsgruppen.filter(v => v !== value);
            }
        }

        renderFiltersFromState();
        applyFilter();
    });

    $(document).on('change', '#bereichFilter input', function () {

        const bereich = $('#bereichFilter input:checked').val() || "Alle";
        filterState.bereich = bereich;
        filterState.disziplinen = [];

        createDisziplinDropdown(bereich, filterState.disziplinen);

        saveFilterState();
        applyFilter();
    });

    $(document).on('change', '.disziCheckbox', function () {

        const value = $(this).val();
        const isAll = value === "all";

        if (isAll) {

            if (this.checked) {
                // ALLE aktiv → STATE leeren
                filterState.disziplinen = [];

                // alle anderen abwählen
                $(this).closest('.filter-box')
                    .find('input[type="checkbox"]')
                    .not(this)
                    .prop('checked', false);
            }

        } else {

            if (this.checked) {

                // "all" deaktivieren
                $(this).closest('.filter-box')
                    .find('input[value="all"]')
                    .prop('checked', false);

                if (!filterState.disziplinen.includes(value)) {
                    filterState.disziplinen.push(value);
                }

            } else {

                filterState.disziplinen =
                    filterState.disziplinen.filter(v => v !== value);

                // wenn nichts mehr gewählt → ALL aktivieren
                if (filterState.disziplinen.length === 0) {
                    $(this).closest('.filter-box')
                        .find('input[value="all"]')
                        .prop('checked', true);
                }
            }
        }

        saveFilterState();
        applyFilter();
    });

    $(document).on('change', 'input[name="religionFilter"]', function () {

        const value = $(this).val();
        const isAll = value === "all";

        if (isAll) {

            if (this.checked) {
                filterState.religion = [];

                $('input[name="religionFilter"]')
                    .not(this)
                    .prop('checked', false);
            }

        } else {

            if (this.checked) {

                filterState.religion.push(value);
                filterState.religion = [...new Set(filterState.religion)];

                $('input[name="religionFilter"][value="all"]')
                    .prop('checked', false);

            } else {

                filterState.religion =
                    filterState.religion.filter(v => v !== value);

                if (filterState.religion.length === 0) {
                    $('input[name="religionFilter"][value="all"]')
                        .prop('checked', true);
                }
            }
        }

        saveFilterState();
        applyFilter();
    });

    $(document).on('change', '.landCheckbox', function () {

        const value = $(this).val();
        const isAll = value === "all";

        if (isAll) {

            if (this.checked) {
                filterState.land = [];
                $(this).closest('.filter-box')
                    .find('input[type="checkbox"]')
                    .not(this)
                    .prop('checked', false);
            }

        } else {

            if (this.checked) {

                filterState.land.push(value);
                filterState.land = [...new Set(filterState.land)];

                $(this).closest('.filter-box')
                    .find('input[value="all"]')
                    .prop('checked', false);

            } else {

                filterState.land = filterState.land.filter(v => v !== value);

                if (filterState.land.length === 0) {
                    $(this).closest('.filter-box')
                        .find('input[value="all"]')
                        .prop('checked', true);
                }
            }
        }

        saveFilterState();
        applyFilter();
    });

    $(document).on('change', '.emigLandCheckbox', function () {

        const value = $(this).val();
        const isAll = value === "all";

        if (isAll) {

            if (this.checked) {
                filterState.emigLand = [];

                $(this).closest('.filter-box')
                    .find('input[type="checkbox"]')
                    .not(this)
                    .prop('checked', false);
            }

        } else {

            if (this.checked) {

                if (!filterState.emigLand.includes(value)) {
                    filterState.emigLand.push(value);
                }

                filterState.emigLand = [...new Set(filterState.emigLand)];

                $(this).closest('.filter-box')
                    .find('input[value="all"]')
                    .prop('checked', false);

            } else {

                filterState.emigLand =
                    filterState.emigLand.filter(v => v !== value);

                if (filterState.emigLand.length === 0) {
                    $(this).closest('.filter-box')
                        .find('input[value="all"]')
                        .prop('checked', true);
                }
            }
        }

        saveFilterState();
        applyFilter();
    });

    let yearFilterTimeout;
    $('.yearFilter').on('keyup', function () {

        const column = $(this).data('column');
        const value = $(this).val();

        filterState.jahr[column] = value;

        clearTimeout(yearFilterTimeout);
        yearFilterTimeout = setTimeout(() => {
            applyFilter();
            saveFilterState();
        }, 200);

    });

    // Reset

    function resetAllFilters() {

        filterState.berufsgruppen = [];
        filterState.bereich = "Alle";
        filterState.disziplinen = [];
        filterState.land = [];
        filterState.emigLand = [];
        filterState.religion = [];
        filterState.jahr = {
            geburtsjahr: "",
            sterbejahr: "",
            ausreisejahr: ""
        };

        $('.yearFilter').val('');

        $('.berufsCheckbox').prop('checked', false);
        $('.berufsCheckbox[value="all"]').prop('checked', true);

        $('#bereichFilter input').prop('checked', false);
        $('#bereichFilter input[value="Alle"]').prop('checked', true);
        createDisziplinDropdown("Alle");

        $('input[name="religionFilter"]').prop('checked', false);
        $('input[name="religionFilter"][value="all"]').prop('checked', true);

        $('.landCheckbox').prop('checked', false);
        $('.landCheckbox[value="all"]').prop('checked', true);

        $('.emigLandCheckbox').prop('checked', false);
        $('.emigLandCheckbox[value="all"]').prop('checked', true);

     
    table.order([[0, 'asc']]).draw();
    $('#demo thead tr:eq(1) input').val('');
    table.columns().search('');
    $('#demo tbody td').unmark();
    }

    $('#resetFilters').on('click', function () {

        showLoading();

        setTimeout(() => {

            resetAllFilters();

            applyFilter();

            hideLoading();

        }, 50);
    });

    // Radiobutton Umschaltung
    $('input[name="mode"]').on('change', function () {

        showLoading();

        setTimeout(() => {

            const mode = $(this).val();

            // 1. STATE setzen
            filterState.mode = mode;
            resetAllFilters();
           
            // 4. Dynamische UI neu bauen
            if (mode === "alle") {

                $('#berufsgruppeDropdown').show();
                $('#bereichFilter').hide();

                $('#disziplinDropdown').hide().empty();

                updateLandOptions(daten);
                updateEmigrationslandDropdown(daten);

            } else {

                $('#berufsgruppeDropdown').hide();
                $('#bereichFilter').show();

                $('#disziplinDropdown').show();

                createDisziplinDropdown("Alle");

                let kerngruppeData = daten.filter(d =>
                    d.Bereich && d.Bereich.trim() !== ""
                );

                updateLandOptions(kerngruppeData);
                updateEmigrationslandDropdown(kerngruppeData);
            }

            // 5. FILTER ANWENDEN (nachdem alles steht)
            applyFilter();

            // 6. STATE speichern
            saveFilterState();

            hideLoading();

        }, 50);
    });

    $('#demo tbody').on('click', '.tooltip-name', function (e) {
        e.stopPropagation();

        // Alle anderen Tooltips schließen
        $('.tooltip-name').not(this).removeClass('active');

        // Aktuelles Element toggeln
        $(this).toggleClass('active');
    });

    // Klick außerhalb schließt alle Tooltips
    $(document).on('click', function () {
        $('.tooltip-name').removeClass('active');
    });

    restoreUIFromState();
});

