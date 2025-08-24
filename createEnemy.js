function createEnemy(scene, startX, startY, patrolDistance, flyingEnemyManager) {
    const enemy = BABYLON.Mesh.CreatePlane("enemy", 1, scene);

    const mat = new BABYLON.StandardMaterial("enemyMat", scene);
    mat.diffuseTexture = new BABYLON.Texture("resources/enemy.png", scene);
    mat.diffuseTexture.hasAlpha = true;
    enemy.material = mat;

    enemy.position.x = startX;
    enemy.position.y = startY;

    // Store patrol info directly on the mesh
    enemy.patrolMinX = startX - patrolDistance;
    enemy.patrolMaxX = startX + patrolDistance;
    enemy.direction = 1; // start moving right
    enemy.speed = 0.04;

    return enemy;
}
