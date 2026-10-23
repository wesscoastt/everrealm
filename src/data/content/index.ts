import type { Board, RegionContent } from './types';
import { CROWNROAD } from './crownroad';
import { onLand } from '../../world/land';
import { GREENWAKE } from './greenwake';
import { OUTER } from './outer';
import { WEATHERHOLMS } from './weatherholms';
import { HOLMSEY } from './holmsey';
import { KETTLE } from './kettle';
import { PACKWOMAN } from './packwoman';
import { STABLE_CONTENT } from './stables';
import { WAITS } from './waits';
import { TAVERN_CONTENT } from './taverns';
import { PEDLAR_CONTENT } from './pedlars';
import { FORT_CONTENT } from './forts';
import { INKHOLM_CONTENT } from './inkholm';
import { KELL_CONTENT } from './kell';
import { PACKET_CONTENT } from './packet';
import { CALLIS_CONTENT } from './callis';
import { MORROW_WILDS } from './morrowWilds';
import { SALTPENNY_CONTENT } from './saltpenny';
import { GREYWASTE_CONTENT } from './greywaste';
import { KINGSBARROW_CONTENT } from './kingsbarrow';
import { MORROW_TOWNS } from './morrowTowns';
import { MOUNT_CONTENT } from './mounts';
import { BOATMAN } from './boatman';
import { SEASON_CONTENT } from './seasons';
import { INN_CONTENT } from './inns';
import { MASTER_CONTENT } from './masters';

// Every region's side content. Add a region by writing its module and listing it here.
export const CONTENT: RegionContent[] = [GREENWAKE, CROWNROAD, WEATHERHOLMS, HOLMSEY, KETTLE, PACKWOMAN, OUTER, STABLE_CONTENT, WAITS, TAVERN_CONTENT, PEDLAR_CONTENT, FORT_CONTENT, INKHOLM_CONTENT, KELL_CONTENT, PACKET_CONTENT, CALLIS_CONTENT, MORROW_WILDS, SALTPENNY_CONTENT, GREYWASTE_CONTENT, KINGSBARROW_CONTENT, MORROW_TOWNS, MOUNT_CONTENT, BOATMAN, SEASON_CONTENT, INN_CONTENT, MASTER_CONTENT];

export const BOARDS: Board[] = CONTENT.flatMap((c) => c.boards ?? []).filter(onLand);
