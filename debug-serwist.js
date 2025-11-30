try {
    const precaching = require('@serwist/precaching');
    console.log('Exports from @serwist/precaching:', Object.keys(precaching));
} catch (e) {
    console.log('Error loading @serwist/precaching:', e.message);
}

try {
    const sw = require('@serwist/sw');
    console.log('Exports from @serwist/sw:', Object.keys(sw));
} catch (e) {
    console.log('Error loading @serwist/sw:', e.message);
}

try {
    const next = require('@serwist/next');
    console.log('Exports from @serwist/next:', Object.keys(next));
} catch (e) {
    console.log('Error loading @serwist/next:', e.message);
}
