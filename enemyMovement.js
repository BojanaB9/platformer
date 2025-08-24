function enemyMovement(enemy) {
    enemy.position.x += enemy.speed * enemy.direction;

    if (enemy.position.x >= enemy.patrolMaxX) {
        enemy.direction = -1;

    } else if (enemy.position.x <= enemy.patrolMinX) {
        enemy.direction = 1;

    }
}
