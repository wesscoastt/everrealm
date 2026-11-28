# First-person arms and weapons (owner, 2026-11-27)

Sent with a concept image: a night path to a lit hall; both forearms come in from the bottom corners in dark sleeves under
brown leather bracers with stitched straps and iron studs, fingerless gloves; the left hand open and relaxed, palm down;
the right hand's fingers wrapped round a leather-wound sword grip, the blade rising up and to the right.

Earlier the same day: "first person needs work, lots of skills have no animation need stuff like eso first person loevel
triple a"; "arms in first person need to be more natural positioion"; "the arms look v shaped..."; "still look v shape. look
at eso / minecraft first person use a mix of both fix the arms."; "Still not right".

---

EVERREALM — First-Person Arm & Weapon Rendering Overhaul
I want a complete overhaul of the first-person player arms and weapon presentation.
The current implementation is not acceptable. The arms look like disconnected black geometric shapes floating in front of the camera. The weapon also appears disconnected from the character's hand.
I want a hybrid visual direction combining:

* The immersive first-person presentation of Elder Scrolls Online.
* The recognizable blocky geometry and visual language of Minecraft.
* The equipment detail and character presentation of a traditional fantasy MMORPG.

IMPORTANT: Do not simply enlarge the existing arms or adjust their position. Rework the actual first-person arm presentation.
1. Arm Geometry and Positioning
Create properly constructed voxel-style arms.
Requirements:

* Both arms must have visible forearms extending naturally from the bottom corners of the screen.
* Arms should have believable proportions relative to the first-person camera.
* Include wrists, hands, fingers or stylized blocky fingers, and appropriate armor or clothing transitions.
* Arms must visually connect to the player's body outside the camera's view.
* Avoid floating disconnected hands, oversized fists, or simple black polygon shapes.
* Use consistent voxel geometry and appropriate shading.

The arms should feel like they belong to the actual player character.
2. Weapon Presentation
Weapons must be physically held by the character.

* The right hand must visibly grip the weapon handle.
* Fingers should wrap around the handle where practical within the voxel art style.
* Weapon orientation must follow the hand's rotation.
* Weapon positioning should feel natural from the first-person perspective.
* Implement appropriate weapon-specific positioning for swords, axes, hammers, daggers, bows, and other weapon categories.
* Two-handed weapons must use both hands.
* Weapon models must not float independently of the hands.

3. Equipment Integration
First-person arms must reflect the character's currently equipped equipment.
Examples:

* Cloth sleeves for cloth armor.
* Leather sleeves and bracers for light armor.
* Metal gauntlets and armored sleeves for heavy armor.
* Different gloves and bracers depending on equipped items.
* Character skin tone must match the actual player character.

Do not create one generic arm model for every character.
4. First-Person Animation
Implement subtle, polished animations:

* Idle breathing and subtle arm movement.
* Natural weapon sway while walking.
* Increased movement during sprinting.
* Weapon-specific attack animations.
* Blocking and defensive animations.
* Spellcasting animations.
* Interaction animations.
* Smooth transitions between animation states.

Animations should feel deliberate and grounded, not exaggerated.
5. Camera and Perspective
The first-person camera should feel like an actual character inhabiting the world.

* Arms should emerge naturally from the lower left and right portions of the screen.
* Avoid excessive screen coverage.
* Maintain consistent proportions across different resolutions.
* Prevent clipping through the camera.
* Weapon and arm positioning must remain consistent when looking up, down, and turning.

6. Technical Requirements
Before implementing anything, inspect the existing player controller, camera, character equipment system, weapon models, and animation architecture.
Build this into the existing Everrealm architecture rather than creating a disconnected visual prototype.
Preserve:

* Existing combat functionality.
* Weapon switching.
* Equipment compatibility.
* First-person camera controls.
* Existing HUD and UI.
* Third-person compatibility, if supported.

Avoid breaking existing gameplay systems.
7. Visual Quality Standard
The final result should look like a polished voxel fantasy MMORPG, not a basic Minecraft clone or a primitive browser-game implementation.
Use the supplied first-person concept image as the visual target for arm placement, proportions, weapon grip, and immersion.
The geometry should remain consistent with Everrealm's voxel art direction.
Do not declare this task complete simply because arms are visible. They must look anatomically coherent within the stylized voxel art direction, properly connected to the camera perspective, and correctly integrated with the weapon and equipment systems.
First inspect the existing implementation, identify why the current arms look disconnected, and then implement the complete solution.
