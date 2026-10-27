// Picks the screen: the menus (SPEC §13) by default; ?play=bus|flight starts a trip with the
// choices the menu put in the URL.
import { initSave } from './core/save';
import { watchForUpdates } from './ui/update';

await initSave();
watchForUpdates();
const play = new URLSearchParams(location.search).get('play');
if (play === 'flight') await import('./flight/main');
else if (play === 'bus') await import('./main');
else await (await import('./ui/menu')).showMenu();

