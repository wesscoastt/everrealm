import type { Board, RegionContent } from './types';
import { CROWNROAD } from './crownroad';
import { GREENWAKE } from './greenwake';
import { OUTER } from './outer';
import { WEATHERHOLMS } from './weatherholms';
import { HOLMSEY } from './holmsey';
import { KETTLE } from './kettle';
import { PACKWOMAN } from './packwoman';

// Every region's side content. Add a region by writing its module and listing it here.
export const CONTENT: RegionContent[] = [GREENWAKE, CROWNROAD, WEATHERHOLMS, HOLMSEY, KETTLE, PACKWOMAN, OUTER];

export const BOARDS: Board[] = CONTENT.flatMap((c) => c.boards ?? []);
