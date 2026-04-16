function buildSearchRegex(input) {
    if (!input) return '';

    let andParts = input.split(/\s+/).map(part => {

        if (part.includes('|')) {

            let orParts = part
                .split('|')
                .map(p => p.trim())
                .filter(p => p.length > 0)
                .map(escapeRegex);

            if (orParts.length === 0) return '';

            return '(?=.*(' + orParts.join('|') + '))';
        }

        return '(?=.*' + escapeRegex(part) + ')';
    }).filter(Boolean);

    return '^' + andParts.join('') + '.*';
}
