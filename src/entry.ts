// Picks the mode: Flight Mode with ?play=flight, Bus Mode otherwise (a mode-select screen arrives in M8).
if (new URLSearchParams(location.search).get('play') === 'flight') await import('./flight/main');
else await import('./main');

export {};
