// Picks the screen: the menus (SPEC §13) by default; ?play=bus|flight starts a trip with the
// choices the menu put in the URL. ?fps=1 adds a frame-rate readout.
import { initSave } from './core/save';
import { mountFpsMeter } from './ui/fps';
import { watchForUpdates } from './ui/update';

await initSave();
watchForUpdates();
mountFpsMeter();
const play = new URLSearchParams(location.search).get('play');
if (play === 'flight') await import('./flight/main');
else if (play === 'bus') await import('./main');
else await (await import('./ui/menu')).showMenu();

