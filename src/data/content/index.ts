import type { Board, RegionContent } from './types';
import { CROWNROAD } from './crownroad';
import { GREENWAKE } from './greenwake';
import { WEATHERHOLMS } from './weatherholms';

// Every region's side content. Add a region by writing its module and listing it here.
export const CONTENT: RegionContent[] = [GREENWAKE, CROWNROAD, WEATHERHOLMS];

export const BOARDS: Board[] = CONTENT.flatMap((c) => c.boards ?? []);
