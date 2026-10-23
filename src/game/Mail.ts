import { ITEMS } from '../data/items';
import type { Letter, Online } from '../net/Online';
import { tradable } from './Social';

// The Charter Post in the browser (the letters themselves are kept on the realm server:
// server/mail.mjs). A post box stands by every Charter Post sign. Write to any character on the
// realm by name, in the world or not, and send up to six stacks and some marks with the letter.
// Postage is a mark a letter and a mark a stack, paid when it's posted. What comes in a letter stays
// in it until you take it out; a letter can be sent back, things and all.

export interface MailHost {
  net(): Online;
  online(): boolean;
  myName(): string;
  system(text: string): void;
  count(id: string): number;
  take(id: string, n: number): boolean;
  give(id: string, n: number): boolean;
  /** Whether these would all fit in the pack. */
  room(stacks: { id: string; n: number }[]): boolean;
  marks(): number;
  addMarks(n: number): void;
  sound(name: 'coin' | 'click' | 'pickup' | 'mail'): void;
  persist(): void;
  /** Redraw the panel if it's open, and the unread mark by the map. */
  refresh(): void;
}

/** What a letter costs to post, with so many stacks in it. */
export const postage = (stacks: number): number => 1 + stacks;
export const MAIL_STACKS = 6;

export interface MailDraft { to: string; subject: string; body: string; items: { id: string; n: number }[]; marks: number }

export interface MailView {
  online: boolean;
  loading: boolean;
  letters: Letter[];
  unread: number;
  reading: Letter | null;
  draft: MailDraft;
  writing: boolean;
  sending: boolean;
}

const blank = (): MailDraft => ({ to: '', subject: '', body: '', items: [], marks: 0 });

export class Mail {
  private letters: Letter[] = [];
  private loading = false;
  private sending = false;
  unread = 0;
  /** The letter open on the page, or null for the list. */
  reading: number | null = null;
  writing = false;
  draft: MailDraft = blank();

  constructor(private host: MailHost) {}

  hooks() {
    return {
      mailBox: (letters: Letter[]) => {
        this.letters = letters;
        this.unread = letters.filter((l) => !l.read).length;
        this.loading = false;
        this.host.refresh();
      },
      mailNew: (letter: Letter, unread: number) => {
        this.letters = [...this.letters.filter((l) => l.id !== letter.id), letter];
        this.unread = unread;
        this.host.system(letter.returned ? `A letter has come back to you by the Charter Post: ${letter.subject}.` : `A letter from ${letter.from} has come for you by the Charter Post. Read it at any post box.`);
        this.host.sound('mail');
        this.host.refresh();
      },
      mailSent: (to: string) => {
        this.sending = false;
        this.draft = blank();
        this.writing = false;
        this.host.system(`Your letter is on its way to ${to}.`);
        this.host.sound('coin');
        this.host.refresh();
      },
      mailRefused: (items: { id: string; n: number }[], marks: number, paid: number, why: string) => {
        // What went in the letter, and the postage, came out of the pack when it was posted: it comes back
        this.sending = false;
        for (const s of items) if (ITEMS[s.id]) this.host.give(s.id, s.n);
        if (marks + paid) this.host.addMarks(marks + paid);
        this.host.system(why);
        this.host.persist();
        this.host.refresh();
      },
      mailTaken: (id: number, items: { id: string; n: number }[], marks: number) => {
        const l = this.letters.find((x) => x.id === id);
        if (l) { l.items = []; l.marks = 0; l.read = true; }
        for (const s of items) if (ITEMS[s.id]) this.host.give(s.id, s.n);
        if (marks) this.host.addMarks(marks);
        this.host.persist();
        this.host.refresh();
      },
      mailGone: (id: number, unread: number | null) => {
        this.letters = this.letters.filter((l) => l.id !== id);
        if (this.reading === id) this.reading = null;
        if (unread !== null) this.unread = unread;
        this.host.refresh();
      },
      mailUnread: (n: number) => {
        const more = n > this.unread && !this.letters.length;
        this.unread = n;
        if (more) this.host.system(`You have ${n === 1 ? 'a letter' : `${n} letters`} waiting at the Charter Post.`);
        this.host.refresh();
      },
    };
  }

  /** Ask the realm for your box (the page shows what it had meanwhile). */
  open(): void {
    this.reading = null;
    if (!this.host.online()) return;
    this.loading = true;
    this.host.net().mailBox();
  }

  view(): MailView {
    return {
      online: this.host.online(), loading: this.loading,
      letters: [...this.letters].sort((a, b) => b.at - a.at),
      unread: this.unread,
      reading: this.letters.find((l) => l.id === this.reading) ?? null,
      draft: this.draft, writing: this.writing, sending: this.sending,
    };
  }

  read(id: number): void {
    const l = this.letters.find((x) => x.id === id);
    if (!l) return;
    this.reading = id;
    this.writing = false;
    if (!l.read) { l.read = true; this.unread = Math.max(0, this.unread - 1); this.host.net().mailRead(id); }
    this.host.refresh();
  }

  back(): void { this.reading = null; this.writing = false; this.host.refresh(); }

  write(to = '', subject = ''): void {
    this.writing = true;
    this.reading = null;
    if (to) this.draft.to = to;
    if (subject) this.draft.subject = subject;
    this.host.refresh();
  }

  reply(id: number): void {
    const l = this.letters.find((x) => x.id === id);
    if (!l || !l.fromKey) return;
    this.draft = blank();
    this.write(l.from, l.subject.startsWith('Re: ') ? l.subject : ('Re: ' + l.subject).slice(0, 60));
  }

  /** Put a stack in the letter (or take it out again). */
  attach(id: string, n: number): void {
    const d = ITEMS[id];
    if (!d || !tradable(id)) { this.host.system('The Post won\'t carry that.'); return; }
    const i = this.draft.items.findIndex((s) => s.id === id);
    if (i >= 0) { this.draft.items.splice(i, 1); this.host.refresh(); return; }
    if (this.draft.items.length >= MAIL_STACKS) { this.host.system(`A letter carries ${MAIL_STACKS} stacks at most.`); return; }
    this.draft.items.push({ id, n: Math.max(1, Math.min(this.host.count(id), Math.floor(n))) });
    this.host.sound('click');
    this.host.refresh();
  }

  send(): void {
    if (!this.host.online()) { this.host.system('The Charter Post keeps its letters on the realm server. Play online to send one.'); return; }
    if (this.sending) return;
    const d = this.draft;
    d.to = d.to.trim();
    if (!d.to) { this.host.system('Who is it to? Write their name.'); return; }
    if (d.to.toLowerCase() === this.host.myName().toLowerCase()) { this.host.system('The Post won\'t carry a letter to yourself.'); return; }
    if (!d.body.trim() && !d.items.length && !d.marks) { this.host.system('The letter is empty. Write something, or send something with it.'); return; }
    for (const s of d.items) if (this.host.count(s.id) < s.n) { this.host.system(`You don't have ${s.n} ${ITEMS[s.id]?.name ?? s.id} any more.`); return; }
    const cost = postage(d.items.length), marks = Math.max(0, Math.floor(d.marks || 0));
    if (this.host.marks() < cost + marks) { this.host.system(`That needs ${cost + marks} marks: ${marks ? `${marks} to send and ` : ''}${cost} for the postage.`); return; }
    // Out of the pack now; the realm sends it all back if it can't deliver
    for (const s of d.items) this.host.take(s.id, s.n);
    this.host.addMarks(-(cost + marks));
    this.host.persist();
    this.sending = true;
    this.host.net().mailSend(d.to, d.subject.trim(), d.body.trim(), d.items, marks, cost);
    this.host.refresh();
  }

  /** Take out what came in a letter. */
  takeFrom(id: number): void {
    const l = this.letters.find((x) => x.id === id);
    if (!l || (!l.items.length && !l.marks)) return;
    if (!this.host.room(l.items)) { this.host.system('There isn\'t room in your pack for all of that. Make some space first.'); return; }
    this.host.net().mailTake(id);
  }

  remove(id: number): void { this.host.net().mailDelete(id); }
  sendBack(id: number): void { this.host.net().mailReturn(id); }
}
