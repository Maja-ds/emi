           function escapeRegex(text) {
               return text.replace(/[.*+?^${}()[\]\\]/g, '\\$&');
           }

           function buildSearchRegex(input) {
               if (!input) return '';

               let andParts = input.split(/\s+/).map(part => {

                   if (part.includes('|')) {

                       let orParts = part
                           .split('|')
                           .map(p => p.trim())
                           .filter(p => p.length > 0)   // ← wichtig!
                           .map(escapeRegex);

                       if (orParts.length === 0) return '';   // nichts eingeben → ignorieren

                       return '(?=.*\\b(' + orParts.join('|') + '))';
                   }

                   return '(?=.*\\b' + escapeRegex(part) + ')';
               }).filter(Boolean); // leere entfernen

               return '^' + andParts.join('') + '.*';
           }