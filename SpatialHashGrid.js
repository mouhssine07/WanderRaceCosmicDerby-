/**
 * SpatialHashGrid.js - Optimizes collision detection from O(n^2) to ~O(n)
 */

class SpatialHashGrid {
  constructor(worldWidth, worldHeight, cellSize = 200) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.cellSize = cellSize;
    this.cols = Math.ceil(worldWidth / cellSize);
    this.rows = Math.ceil(worldHeight / cellSize);
    this.cells = new Map();
  }

  /**
   * Clear the grid for the current frame
   */
  clear() {
    this.cells.clear();
  }

  /**
   * Register an entity into the grid
   */
  insert(entity) {
    const cellKey = this.getKey(entity.pos.x, entity.pos.y);
    if (!this.cells.has(cellKey)) {
      this.cells.set(cellKey, []);
    }
    this.cells.get(cellKey).push(entity);
  }

  getKey(x, y) {
    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);
    return `${col},${row}`;
  }

  /**
   * Get all entities in the same cell and 8 neighboring cells
   */
  getNearby(entity) {
    const nearby = [];
    const col = Math.floor(entity.pos.x / this.cellSize);
    const row = Math.floor(entity.pos.y / this.cellSize);

    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const key = `${col + i},${row + j}`;
        const cell = this.cells.get(key);
        if (cell) {
          for (let e of cell) {
            if (e !== entity) nearby.push(e);
          }
        }
      }
    }
    return nearby;
  }
}
