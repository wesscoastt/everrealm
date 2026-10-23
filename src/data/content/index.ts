import type { Board, RegionContent } from './types';
import { CROWNROAD } from './crownroad';
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

// Every region's side content. Add a region by writing its module and listing it here.
export const CONTENT: RegionContent[] = [GREENWAKE, CROWNROAD, WEATHERHOLMS, HOLMSEY, KETTLE, PACKWOMAN, OUTER, STABLE_CONTENT, WAITS, TAVERN_CONTENT, PEDLAR_CONTENT, FORT_CONTENT];

export const BOARDS: Board[] = CONTENT.flatMap((c) => c.boards ?? []);
