// Emotes: typed as /wave and so on in chat, or picked from the chat box's emote menu. Each plays a
// pose that other players see (it rides on the shared animation state) and puts a line in chat.
// Looping ones (sit, dance, kneel, sleep) last until you move.

export type EmoteAnim = 'wave' | 'bow' | 'cheer' | 'dance' | 'sit' | 'clap' | 'point' | 'kneel' | 'laugh' | 'salute' | 'shrug' | 'sleep';

export interface EmoteDef {
  id: EmoteAnim;
  /** What chat says: "<name> waves." */
  text: string;
  /** Seconds it plays for; 0 loops until you move. */
  secs: number;
  icon: string;
}

export const EMOTES: EmoteDef[] = [
  { id: 'wave', text: 'waves.', secs: 2.2, icon: '👋' },
  { id: 'bow', text: 'bows.', secs: 2, icon: '🙇' },
  { id: 'cheer', text: 'cheers!', secs: 2.4, icon: '🙌' },
  { id: 'clap', text: 'claps.', secs: 2.4, icon: '👏' },
  { id: 'laugh', text: 'laughs.', secs: 2.2, icon: '😄' },
  { id: 'salute', text: 'salutes.', secs: 2, icon: '🫡' },
  { id: 'point', text: 'points.', secs: 2, icon: '👉' },
  { id: 'shrug', text: 'shrugs.', secs: 1.8, icon: '🤷' },
  { id: 'dance', text: 'dances.', secs: 0, icon: '💃' },
  { id: 'sit', text: 'sits down.', secs: 0, icon: '🪑' },
  { id: 'kneel', text: 'kneels.', secs: 0, icon: '🧎' },
  { id: 'sleep', text: 'lies down for a nap.', secs: 0, icon: '💤' },
];

export const emoteById = (id: string): EmoteDef | undefined => EMOTES.find((e) => e.id === id);
