# UI brief (from the owner, 2026-10-29)

To do once the current owed list is done (docs/OWED.md item 6b). Kept here word for word.

---

Improve Everrealm's existing user interface to a professional, release-quality standard, taking inspiration from the readability and polish of Guild Wars 2, ESO, and WoW while preserving Everrealm's own Minecraft-inspired voxel identity.

IMPORTANT: This is a refinement of the existing game, not a redesign from scratch.

Before changing anything:

1. Inspect the existing UI implementation, styles, components, and relevant game systems.
2. Identify how the chat/combat log, XP bar, level display, quest tracker, hotbar, minimap, and character frame currently work.
3. Preserve the existing layout and visual identity wherever they are already effective.
4. Identify any shared styles or components that can be improved consistently instead of applying unrelated patches to individual elements.

PRIORITY 1 — CHAT AND COMBAT LOG

Create a cohesive, semi-transparent dark panel behind the existing chat and combat log, using approximately 60–70% black opacity as a starting point. Adjust opacity as necessary for readability across bright environments, nighttime, weather, and different terrain.

Use a restrained border, subtle shadow, readable typography, and consistent spacing. Differentiate player messages, system notifications, and combat events without introducing excessive colors. Keep the newest message readable without changing text size in a way that makes the layout jump.

PRIORITY 2 — XP BAR AND LEVEL DISPLAY

Make the XP bar more visible and satisfying. Improve its thickness, fill treatment, and level badge while matching the existing voxel-fantasy aesthetic.

Animate XP gains smoothly and provide a brief, restrained effect when a level-up actually occurs. Ensure animations reflect real game state and never falsely award XP or levels.

PRIORITY 3 — QUEST TRACKER

Improve the hierarchy between main-story quests, side quests, and other quest types supported by the existing game. Make the currently tracked quest easy to identify through a restrained highlight, icon, or background treatment.

Maintain consistent spacing and readability when multiple quests are active. Do not invent new quest types or modify quest progression logic as part of this UI task.

PRIORITY 4 — HOTBAR AND ACTION BUTTONS

Refine selected-slot states, borders, cooldown visibility, and button feedback. Use subtle tactile effects and a consistent fantasy-inspired palette that complements the existing world.

Preserve existing abilities, hotkeys, inventory interactions, cooldown calculations, and skill behavior. Do not replace existing functional icons or controls with decorative placeholders.

PRIORITY 5 — CONSISTENT FINISHING DETAILS

Review the minimap, character frame, and other existing HUD panels. Improve their contrast, borders, depth, and consistency where needed.

Use one coherent visual language for shadows, outlines, panel opacity, corner treatments, and interactive states. Weather-related visual effects are optional and must never reduce readability.

TECHNICAL REQUIREMENTS

* Preserve all existing gameplay systems, controls, saved progress, and functional UI interactions.
* Avoid broad rewrites when a targeted change will achieve the desired result.
* Do not add unnecessary libraries or expensive visual effects.
* Keep the interface responsive and usable at different browser window sizes.
* Ensure text remains readable against every relevant environment.
* Avoid excessive gradients, glows, blur, animation, and generic fantasy UI decorations.
* Reuse existing components and design tokens where practical.
* Do not introduce placeholder features, fake functionality, or unnecessary duplicate UI elements.

VALIDATION

After implementation, test every modified component in the actual game. Verify chat readability, XP updates, level-up feedback, quest tracking, hotbar selection, cooldowns, and existing button interactions. Check bright outdoor environments, nighttime, and rainy weather if supported.

Report what changed, which files were modified, what was tested, and any remaining issues. Do not claim a feature works unless it has actually been tested.

The goal is a cohesive, polished, production-quality voxel MMO interface—not simply a collection of glowing panels.
