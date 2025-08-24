let grounded = false;
let vertical = 0;
const speed = 0.06;
const gravity = -0.003;
const jumpHeight = 0.13;
const floor = -70;
let playerHP = 5;       // current health
const maxHP = 5;
const respawnPoint = new BABYLON.Vector3(1, 1, 0); // wherever "start" is
let canTakeDamage = true;   // flag for invincibility frames
const damageCooldown = 1000; // milliseconds (1 second)
let currentState = "idle";

function setupPlayer(box, tiles, scene) {
    // // Enable Babylon collision system
    scene.collisionsEnabled = true;

    // Your box is height = 1, so halfHeight = 0.5
    const halfHeight = 0.5;
    box.checkCollisions = true;
    box.isPickable = false; // don't let rays hit the player itself

// Capsule radius ~0.4, height ~1
    box.ellipsoid = new BABYLON.Vector3(0.4, 0.5, 0.4);

// Shift it upward by half the mesh height
    box.ellipsoidOffset = new BABYLON.Vector3(0, 0.05, 0);

    // Tiles should collide and be pickable for ground ray
    for (let tile of tiles) {
        tile.checkCollisions = true;
        tile.isPickable = true;     // ray will use this
        // tile.name should start with "tile" in your grid code already
        if (!tile.name) tile.name = "tile";
    }
}

function setPlayerState(newState, playerSprite, tiles) {
    if (currentState === newState) return; // don’t replay the same anim
    currentState = newState;

    switch (newState) {
        case "idle":
            playerSprite.playAnimation(6, 9, true, 160);   // loop idle
            break;
        case "run":
            playerSprite.playAnimation(0, 5, true, 100); // loop run
            break;
        case "jump":
            playerSprite.playAnimation(12, 14, false, 120); // one-time jump
            break;
        case "dead":
            playerSprite.playAnimation(36, 40, false, 150);
            break;
    }
}

function updateMovement(inputMap, box, scene, playerSprite) {
    playerSprite.position = box.position;
    let moveX = 0;

    // --- Horizontal input ---
    if (inputMap["a"] || inputMap["A"] || inputMap["ArrowLeft"]) {
        moveX = -speed;
        playerSprite.invertU = true;


    }
    if (inputMap["d"] || inputMap["D"] || inputMap["ArrowRight"]) {
        moveX =  speed;
        playerSprite.invertU = false;

    }

    // --- Jump ---
    if ((inputMap["w"] || inputMap["W"] || inputMap["ArrowUp"]) && grounded) {
        vertical = jumpHeight;
        grounded = false;
        setPlayerState("jump", playerSprite);

    }

    // --- Gravity integrate ---
    vertical += gravity;

    // --- Move X then Y using Babylon collisions ---
    box.moveWithCollisions(new BABYLON.Vector3(moveX, 0, 0));
    box.moveWithCollisions(new BABYLON.Vector3(0, vertical, 0));

    // --- Ground check (no Y snapping!) ---
    // Compute feet world Y: center + offset - ellipsoid.y
    const feetY = box.position.y + box.ellipsoidOffset.y - box.ellipsoid.y;

    // Start a tiny bit above feet, cast a short ray downward
    const rayOrigin = new BABYLON.Vector3(box.position.x, feetY + 0.06, box.position.z);
    const ray = new BABYLON.Ray(rayOrigin, new BABYLON.Vector3(0, -1, 0), 0.12);

    // Only pick tiles; exclude player & background
    const pick = scene.pickWithRay(ray, (mesh) =>
        mesh !== box && mesh.isPickable && mesh.name && mesh.name.startsWith("tile"));

    if (pick.hit && vertical <= 0) {
        const hitTile = pick.pickedMesh;
        // Check if it's lava
        if (hitTile.tileType === 7) {
            takeDamage(5, box, playerSprite);
        }
        if (hitTile.tileType === 8) {
            // Redirect to congrats page
            window.location.href = "end.html";
        }

        // We're standing on something (within epsilon)
        grounded = true;
        // Important: DO NOT snap Y to pick point—let collisions resolve height.
        vertical = 0;
    } else {
        grounded = false;
    }

    // --- Tiny stick-to-ground to prevent "hover" / edge catching ---
    // If we think we're on ground but the capsule is microscopically above it,
    // nudge down a hair so horizontal movement doesn't catch corners.
    // if (grounded && vertical === 0) {
    //     box.moveWithCollisions(new BABYLON.Vector3(0, -0.01, 0));
    // }
    if (grounded) {
        if (moveX !== 0) {
            setPlayerState("run", playerSprite);
        } else {
            setPlayerState("idle", playerSprite);
            box.moveWithCollisions(new BABYLON.Vector3(0, -0.01, 0));
        }
    } else {
        if (vertical > 0) {
            setPlayerState("jump", playerSprite);
        }
    }

    // --- Safety floor ---
    if (box.position.y <= floor) {
        box.position.y = floor;
        vertical = 0;
        grounded = true;
        setPlayerState("idle", playerSprite);
    }

    // --- (Optional) Enemy stomp check can go here. ---
    // Keep it, but don't adjust Y with rays. The above changes won't break it.
    // --- Enemy collision & jump attack ---
    if (window.enemies && window.enemies.length > 0) {
        for (let i = window.enemies.length - 1; i >= 0; i--) {
            let enemy = window.enemies[i];

            const playerBox = box.getBoundingInfo().boundingBox;
            const enemyBox = enemy.getBoundingInfo().boundingBox;

            const playerMin = playerBox.minimumWorld;
            const playerMax = playerBox.maximumWorld;

            const enemyMin = enemyBox.minimumWorld;
            const enemyMax = enemyBox.maximumWorld;

            const collision =
                playerMax.x > enemyMin.x &&
                playerMin.x < enemyMax.x &&
                playerMax.y > enemyMin.y &&
                playerMin.y < enemyMax.y;

            if (collision) {
                // Player jumps on top of enemy
                if (vertical < 0 && box.position.y > enemy.position.y + 0.2) {
                    enemy.dispose();             // Remove enemy mesh
                    window.enemies.splice(i, 1); // Remove from array
                    vertical = jumpHeight / 2;  // Bounce player
                    grounded = false;
                    playerSprite.playAnimation(18,21, false, 80);
                    //setPlayerState("attack", playerSprite);
                } else {
                    // Optional: handle side collision (hurt player)
                    takeDamage(1, box, playerSprite);
                }
            }
        }
    }
}

function takeDamage(amount, box, playerSprite) {
    if (!canTakeDamage) return;

    canTakeDamage = false;       // start cooldown
    setTimeout(() => { canTakeDamage = true; }, damageCooldown);
    playerHP -= amount;
    playerSprite.playAnimation(30, 32, false, 80);
    //setPlayerState("hurt", playerSprite);
    if (playerHP <= 0) {
        setPlayerState("dead", playerSprite);
        playerHP = maxHP;
        box.position = respawnPoint.clone();
        vertical = 0;
        grounded = true;

        console.log("Player died! Respawned at start.");
    } else {
        vertical = jumpHeight / 2;
        grounded = false;
    }

    // Update UI
    buildHearts(playerHP);
}
function buildHearts(hp) {
    heartsPanel.clearControls();
    heartImages = [];
    for (let i = 0; i < maxHP; i++) {
        const heart = new BABYLON.GUI.Image("heart" + i,
            i < hp ? "resources/hearts_full.png" : "resources/hearts_empty.png"
        );
        heart.width = "40px";
        heart.height = "40px";
        heartImages.push(heart);
        heartsPanel.addControl(heart);
    }
}

