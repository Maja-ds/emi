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

let silentUIUpdate = false;
$(function () {


    loadFilterState();
    console.log("STATE beim Start:", filterState);
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
    function normalizeValue(val) {
        return String(val || "")
            .toLowerCase()
            .trim();
    }
    const yearKeyMap = {
        Geburtsjahr: "geburtsjahr",
        Sterbejahr: "sterbejahr",
        Ausreisejahr: "ausreisejahr"
    };

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
        $(this).html('<input type="text" placeholder="' + title + '" style="width:100%;" spellcheck="false" autocomplete="off"/>');
    });

    // Spaltenfilter (UND / ODER / NOT)
    $('#demo thead tr:eq(1) input').on('keydown', function (e) {

        if (e.key !== "Enter") return;

        let colIndex = $(this).closest('th').index();
        let val = $(this).val().trim();

        let regex = buildSearchRegex(val);

        table
            .column(colIndex)
            .search(regex, true, false)
            .draw();
    });
    $('#demo thead tr:eq(1) input').on('input', function () {

        let val = $(this).val().trim();

        // Nur reagieren wenn wirklich leer
        if (val !== '') return;

        let colIndex = $(this).closest('th').index();

        table
            .column(colIndex)
            .search('', true, false)
            .draw();
    });

    // Highlighting
    table.on('draw', function () {

        const headers = $('#demo thead tr:eq(1) input');

        setTimeout(() => {

            $('#demo tbody td').unmark();

            headers.each(function (colIndex) {

                const val = $(this).val().trim();
                if (!val) return;

                const tokens = val.match(/"[^"]+"|\S+/g) || [];

                const terms = tokens
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

        }, 0);
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

        // "Alle" Checkbox immer zuerst
        box.append(`<label><input type="checkbox" class="landCheckbox" value="all" checked> Alle</label><br>`);

        // Alle Länder extrahieren
        let laender = [...new Set(
            daten
                .map(d => d.Ausreiseland)   // neue Spalte verwenden
                .filter(v => v && v.toLowerCase() !== "k.a.") // k.A. optional ausschließen
        )].sort();

        // Checkboxen für Länder hinzufügen
        laender.forEach(l => box.append(`<label><input type="checkbox" class="landCheckbox" value="${l}"> ${l}</label><br>`));

        container.append(box);
    }
    function updateLandOptions(dataArray) {
        let container = $('#landDropdown');
        let box = container.find('.filter-box');
        box.empty();
        box.append(`<label><input type="checkbox" class="landCheckbox" value="all" checked> Alle</label><br>`);

        let laender = [...new Set(
            dataArray
                .map(d => d.Ausreiseland) // neue Spalte
                .filter(v => v && v.toLowerCase() !== "k.a.")
        )].sort();

        laender.forEach(l => box.append(`<label><input type="checkbox" class="landCheckbox" value="${l}"> ${l}</label><br>`));
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

    function syncUIFromState() {
        renderFiltersFromState();

        // Wichtig: erst NACHDEM UI gesetzt ist
        requestAnimationFrame(() => {
            applyFilter();
            saveFilterState();
        });
    }


    function restoreUIFromState() {
        silentUIUpdate = true;
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
        $('.yearFilter').each(function () {
            const rawColumn = $(this).data('column');
            const key = yearKeyMap[rawColumn];

            if (key && filterState.jahr[key]) {
                $(this).val(filterState.jahr[key]);
            }
        });
        updateLandOptions(dataForDropdown);
        updateEmigrationslandDropdown(dataForDropdown);
        silentUIUpdate = false;
        syncUIFromState();
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
        if (!value) return null;

        const filters = [];

        // Split nach Komma ODER Leerzeichen
        const tokens = value.split(/[,\s]+/).filter(Boolean);

        for (let token of tokens) {

            const match = token.match(/^(<=|>=|<|>)?\s*(\d{4})$/);

            if (!match) continue;

            const op = match[1] || "=";
            const year = parseInt(match[2], 10);

            filters.push({ op, year });
        }

        return filters.length > 0 ? filters : null;
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
        silentUIUpdate = true;
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
        silentUIUpdate = false;
    }
    function getYearFiltersFromState() {
        const filters = [];

        for (let key in filterState.jahr) {
            const value = filterState.jahr[key];

            if (!value) continue;

            filters.push({
                column: key,   // z.B. "geburtsjahr"
                value: value
            });
        }

        return filters;
    }

    function checkYear(row, yearFilters) {

        for (let f of yearFilters) {

            if (!f.value) continue;

            const filters = parseYearInput(f.value);

            // kein gültiger Filter → überspringen
            if (!filters) continue;
            const rawValue = row[
                Object.keys(yearKeyMap)
                    .find(k => yearKeyMap[k] === f.column)
            ];
            const rowValue = parseInt(rawValue, 10);

            if (isNaN(rowValue)) return false;

            // "=" (OR)
            const exact = filters.filter(x => x.op === "=");
            if (
                exact.length > 0 &&
                !exact.some(x => rowValue === x.year)
            ) {
                return false;
            }

            // Bereich (AND)
            for (let r of filters.filter(x => x.op !== "=")) {
                if (r.op === ">" && !(rowValue > r.year)) return false;
                if (r.op === "<" && !(rowValue < r.year)) return false;
                if (r.op === ">=" && !(rowValue >= r.year)) return false;
                if (r.op === "<=" && !(rowValue <= r.year)) return false;
            }
        }

        return true;
    }

    function getYearInputStatus(value) {
        if (!value) return "empty";

        const tokens = value.split(/[,\s]+/).filter(Boolean);

        let hasValid = false;

        for (let token of tokens) {

            // gültig: z. B. <1933, 1933
            if (/^(<=|>=|<|>)?\d{4}$/.test(token)) {
                hasValid = true;
                continue;
            }

            // unvollständig: z. B. <, 19, >19
            if (/^(<=|>=|<|>)?\d{0,3}$/.test(token)) {
                return "partial";
            }

            // alles andere = ungültig
            return "invalid";
        }

        return hasValid ? "valid" : "partial";
    }

    function rowPassesFilter(row) {

        const mode = filterState.mode;

        // BERUF / BEREICH
        if (mode === "alle") {

            if (
                filterState.berufsgruppen.length > 0 &&
                !filterState.berufsgruppen.some(v =>
                    splitValues(row.Berufsgruppe).includes(v)
                )
            ) return false;

        } else {

            // Nur Kern-Daten zulassen
            if (
                row.Bereich !== "Geisteswissenschaften" &&
                row.Bereich !== "Exakte Wissenschaften"
            ) return false;

            // Bereich-Filter anwenden
            if (
                filterState.bereich !== "Alle" &&
                row.Bereich !== filterState.bereich
            ) return false;

            // Disziplinen
            if (
                filterState.disziplinen.length > 0 &&
                !filterState.disziplinen.some(v =>
                    splitValues(row.Fachbereich).includes(v)
                )
            ) return false;
        }
        const effectiveReligion =
            filterState.religion.includes("all") ? [] : filterState.religion;

        if (effectiveReligion.length > 0) {

            const relText = (row.Konfession_Gruppe || "").toLowerCase();

            const matches = effectiveReligion.some(cat =>
                (religionMapping[cat] || []).some(term =>
                    relText.includes(term)
                )
            );

            if (!matches) return false;
        }

        // LAND
        if (filterState.land.length > 0) {
            const land = normalizeValue(row.Ausreiseland);
            if (!filterState.land.map(normalizeValue).includes(land)) return false;
        }

        // EMIG LAND
        if (filterState.emigLand.length > 0) {
            const rowLaender = (row.Emigrationsland || "")
                .split(',')
                .map(normalizeValue);

            const match = filterState.emigLand
                .map(normalizeValue)
                .some(l => rowLaender.includes(l));

            if (!match) return false;
        }

        return true;
    }
    // Filterfunktion
    function applyFilter() {
        const yearFilters = getYearFiltersFromState();
        $.fn.dataTable.ext.search.length = 0;

        $.fn.dataTable.ext.search.push(function (_, __, index) {
            const row = table.row(index).data();
            if (!checkYear(row, yearFilters)) return false;
            return rowPassesFilter(row);
        });

        table.draw();

        $('#rowCount').text(table.rows({ search: 'applied' }).count());
        updateFilterStatus();
        saveFilterState();
    }

    


    // Events
    $(document).on('change', '.berufsCheckbox', function () {
        if (silentUIUpdate) return;
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
        if (silentUIUpdate) return;
        const bereich = $('#bereichFilter input:checked').val() || "Alle";
        filterState.bereich = bereich;
        filterState.disziplinen = [];

        createDisziplinDropdown(bereich, filterState.disziplinen);

        saveFilterState();
        applyFilter();
    });

    $(document).on('change', '.disziCheckbox', function () {
        if (silentUIUpdate) return;
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
        if (silentUIUpdate) return;
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

                if (!filterState.religion.includes(value)) {
                    filterState.religion.push(value);
                }

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
        if (silentUIUpdate) return;
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
        if (silentUIUpdate) return;
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
        if (silentUIUpdate) return;
        const value = $(this).val();
        const rawColumn = $(this).data('column');
        const column = yearKeyMap[rawColumn];

        if (!column) return;

        filterState.jahr[column] = value;

        // 👉 Status bestimmen
        const status = getYearInputStatus(value);

        // 👉 Klassen zurücksetzen
        $(this)
            .removeClass('year-valid year-invalid year-partial');

        // 👉 neue Klasse setzen
        if (status === "valid") {
            $(this).addClass('year-valid');
        } else if (status === "invalid") {
            $(this).addClass('year-invalid');
        } else if (status === "partial") {
            $(this).addClass('year-partial');
        }

        clearTimeout(yearFilterTimeout);
        yearFilterTimeout = setTimeout(() => {
            saveFilterState();
            applyFilter();
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

