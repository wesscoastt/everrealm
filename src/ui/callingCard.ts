import { CallingDef } from '../data/classes';
import { abilityIcon } from './icons';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** A calling as a choosable card: role, story, mechanic, the three skills, and what it trades. Used by the creator and the journal. */
export function callingCard(c: CallingDef, selected: boolean): string {
  return `<button class="calling ${selected ? 'sel' : ''}" data-calling="${c.id}" style="--cc:${c.mechanic.color}">
    <span class="ch"><b>${esc(c.name)}</b><small>${esc(c.role)}</small></span>
    <span class="cd">${esc(c.blurb)}</span>
    <span class="cm"><i>${esc(c.mechanic.name)}.</i> ${esc(c.mechanic.desc)}</span>
    <span class="cs">${c.skills.map((s, i) => `<span class="sk" title="${esc(s.desc)}"><img src="${abilityIcon(s.icon)}" alt=""><span><b>${i + 3} · ${esc(s.name)}</b><small>${esc(s.desc)}</small></span></span>`).join('')}</span>
    <span class="cp"><span class="pro">+ ${esc(c.pros)}</span><span class="con">− ${esc(c.cons)}</span></span>
  </button>`;
}
