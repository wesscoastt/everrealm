// Which school each skill sounds like (systems/Audio.ts skillCast): a shield's clang, a blade's ring, fire's
// roar, frost's chime, a storm's crack, a bowstring, a shadow's hush, poison's bubbling, a hymn's light, a
// smite, the grave's whisper, the earth's thump, a staff's swing. Skills not named here sound like their
// weapon's swing, as before.

export type SkillSchool = 'shield' | 'warcry' | 'blade' | 'fire' | 'frost' | 'storm' | 'bow' | 'shadow' | 'poison' | 'holy' | 'smite' | 'necro' | 'earth' | 'staff' | 'arcane' | 'beast';

const S: Record<SkillSchool, string[]> = {
  shield: ['bulwark', 'bash', 'holdfast', 'shieldthrow', 'cover', 'unbroken', 'oath'],
  warcry: ['rally', 'challenge', 'bloodup', 'redhour'],
  blade: ['bleed', 'leap', 'rend', 'rush', 'hamstring', 'finisher', 'massacre', 'riposte', 'flurry', 'sunder', 'hack', 'whirl', 'longthrust', 'backstab', 'hook', 'overhead', 'spearsweep', 'twist', 'thousand', 'ambush'],
  fire: ['ward', 'bolt', 'starfall', 'firewall', 'cinderstep', 'kindle', 'smoulder', 'flashfire', 'pillar'],
  frost: ['icebarrier', 'frostbolt', 'blizzard', 'icelance', 'frostnova', 'shatter', 'frostbite', 'deepfreeze'],
  storm: ['spark', 'attune'],
  bow: ['volley', 'rain', 'heartshot', 'smoke', 'snare', 'hobble', 'pointblank', 'deadeye'],
  shadow: ['shadowstep', 'quickstep', 'slipaway', 'vanish', 'tumble'],
  poison: ['pocketsand', 'caltrops', 'poisonblade', 'plague', 'graverot'],
  holy: ['dressing', 'mend', 'lanternlight', 'sanctuary', 'lampward', 'restore', 'mercy', 'vigil'],
  smite: ['rebuke', 'judgement'],
  necro: ['siphon', 'wither', 'raise', 'boneward', 'gravegrip', 'bonespear', 'dread'],
  earth: ['groundpound', 'bellringer'],
  staff: ['sweep', 'staffflurry'],
  arcane: ['blink'],
  beast: ['hound'],
};

export const SKILL_SCHOOL: Record<string, SkillSchool> = Object.fromEntries(
  (Object.entries(S) as [SkillSchool, string[]][]).flatMap(([school, ids]) => ids.map((id) => [id, school])),
);
