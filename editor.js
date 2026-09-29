// --- Mobile Button Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
  const undoBtn = document.getElementById('mobile-undo-btn');
  const redoBtn = document.getElementById('mobile-redo-btn');
  const removeBtn = document.getElementById('mobile-remove-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  const closeBtn = document.getElementById('close-settings-btn');
  const applyBtn = document.getElementById('apply-settings-btn');
  const rowsInput = document.getElementById('grid-rows-input');
const clearBtn = document.getElementById('mobile-clear-btn');
const clearModal = document.getElementById('clear-modal');
const cancelClearBtn = document.getElementById('cancel-clear-btn');
const confirmClearBtn = document.getElementById('confirm-clear-btn');

// Open Clear Modal
if (clearBtn && clearModal) {
  clearBtn.addEventListener('click', () => {
    clearModal.style.display = 'flex';
  });
}

// Close Modal on Cancel
if (cancelClearBtn && clearModal) {
  cancelClearBtn.addEventListener('click', () => {
    clearModal.style.display = 'none';
  });
}

// Perform Grid Clear on Confirm
if (confirmClearBtn && clearModal) {
  confirmClearBtn.addEventListener('click', () => {
    clearGrid();
    clearModal.style.display = 'none';
  });
}

  if (settingsBtn && settingsModal) {
    // Open modal
    settingsBtn.addEventListener('click', () => {
      if (rowsInput) rowsInput.value = GRID_ROWS;
      settingsModal.style.display = 'flex';
    });

    // Close modal
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        settingsModal.style.display = 'none';
      });
    }

    // Apply grid resizing
    if (applyBtn && rowsInput) {
      applyBtn.addEventListener('click', () => {
        let newRows = parseInt(rowsInput.value, 10);

        // Enforce boundary limits (10 to 5000)
        if (isNaN(newRows) || newRows < 10) newRows = 10;
        if (newRows > 5000) newRows = 5000;

        resizeGrid(newRows);
        settingsModal.style.display = 'none';
      });
    }
  } // Properly closed settings block

  // Undo Action
  if (undoBtn) {
    undoBtn.addEventListener('click', () => undo());
  }

  // Redo Action
  if (redoBtn) {
    redoBtn.addEventListener('click', () => redo());
  }

  // Remove/Eraser Toggle Action
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      if (activeTileId === -1) {
        selectTile(1, document.querySelector('.palette-tile'));
        removeBtn.classList.remove('active');
      } else {
        activeTileId = -1;
        document.querySelectorAll('.palette-tile').forEach(el => el.classList.remove('selected'));
        removeBtn.classList.add('active');

        const idTextEl = document.getElementById('active-tile-id-text');
        if (idTextEl) idTextEl.innerText = 'ID: Eraser';

        const previewEl = document.getElementById('active-tile-preview');
        if (previewEl) previewEl.style.backgroundImage = 'none';
      }
    });
  }
}); // Properly closed DOMContentLoaded block

class Tile {
  constructor(index, sheetColumns, totalWidth, sourceTileSize = 64, displayTileSize = 32) {
    this.id = index + 1;
    this.name = `Tile #${this.id}`;
    this.sourceTileSize = sourceTileSize;
    this.displayTileSize = displayTileSize;
    this.sheetColumns = sheetColumns;

    this.cropX = (index % this.sheetColumns) * this.sourceTileSize;
    this.cropY = Math.floor(index / this.sheetColumns) * this.sourceTileSize;

    this.scale = this.displayTileSize / this.sourceTileSize; 
    this.scaledSheetWidth = totalWidth * this.scale;
  }

  applyStyle(element) {
    element.style.backgroundImage = "url('Tileset.png')";
    element.style.backgroundRepeat = "no-repeat";
    element.style.backgroundPosition = `-${this.cropX * this.scale}px -${this.cropY * this.scale}px`;
    element.style.backgroundSize = `${this.scaledSheetWidth}px auto`;
    element.style.imageRendering = "pixelated";
  }
}

const NATIVE_TILE_SIZE = 64;  
const DISPLAY_TILE_SIZE = 32; 
const TOTAL_TILES = 2840;      
const GRID_COLS = 5;          
let GRID_ROWS = 1200; // Changed from const to let
const undoStack = [];
const redoStack = [];
const MAX_HISTORY = 50; 
let currentStroke = null;         

let activeTileId = 0;
let isMouseDown = false;
let mouseButton = 0;
const tileRegistry = new Map();
let levelData = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(-1));

const spriteImg = new Image();
spriteImg.src = 'Tileset.png';
spriteImg.onload = () => {
  const sheetWidth = spriteImg.naturalWidth;
  const sheetColumns = Math.floor(sheetWidth / NATIVE_TILE_SIZE);

  for (let i = 1; i <= TOTAL_TILES; i++) {
    tileRegistry.set(i, new Tile(i - 1, sheetColumns, sheetWidth, NATIVE_TILE_SIZE, DISPLAY_TILE_SIZE));
  }

  initPalette();
  initTrackGrid();
  
  const firstPaletteTile = document.querySelector('.palette-tile');
  selectTile(1, firstPaletteTile);

  scrollToBottom();
};

function scrollToBottom() {
  const viewport = document.getElementById('editor-viewport');
  if (viewport) {
    viewport.scrollTop = viewport.scrollHeight;
  }
}

function initPalette() {
  const paletteContainer = document.getElementById('palette-container');
  if (!paletteContainer) return;
  paletteContainer.innerHTML = '';

  for (let i = 0; i < TOTAL_TILES; i++) {
    const paletteTile = document.createElement('div');
    const tileObj = tileRegistry.get(i + 1);
    const tileId = tileObj ? tileObj.id : i + 1;

    paletteTile.className = `palette-tile ${tileId === activeTileId ? 'selected' : ''}`;
    
    if (tileObj) tileObj.applyStyle(paletteTile);
    paletteTile.title = tileObj ? tileObj.name : `Tile #${tileId}`;

    paletteTile.addEventListener('click', () => selectTile(tileId, paletteTile));
    paletteContainer.appendChild(paletteTile);
  }
}

function selectTile(tileId, tileElement) {
  activeTileId = tileId;

  const removeBtn = document.getElementById('mobile-remove-btn');
  if (removeBtn) removeBtn.classList.remove('active');

  document.querySelectorAll('.palette-tile').forEach(el => el.classList.remove('selected'));
  if (tileElement) {
    tileElement.classList.add('selected');
  }

  const activeTileObj = tileRegistry.get(activeTileId);
  const previewEl = document.getElementById('active-tile-preview');
  if (previewEl && activeTileObj) {
    activeTileObj.applyStyle(previewEl);
  }

  const idTextEl = document.getElementById('active-tile-id-text');
  if (idTextEl) {
    idTextEl.innerText = `ID: ${activeTileId}`;
  }
}

function initTrackGrid() {
  const trackGrid = document.getElementById('track-grid');
  if (!trackGrid) return;
  trackGrid.innerHTML = '';

  for (let r = GRID_ROWS - 1; r >= 0; r--) {
    for (let c = 0; c < GRID_COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.dataset.row = r;
      cell.dataset.col = c;

      cell.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isMouseDown = true;
        mouseButton = e.button;
        applyTileToCell(r, c);
      });

      cell.addEventListener('mouseenter', () => {
        if (isMouseDown) {
          applyTileToCell(r, c);
        }
      });

      trackGrid.appendChild(cell);
    }
  }

  let isTouching = false;

  trackGrid.addEventListener('touchstart', (e) => {
    isTouching = true;
    handleTouchPaint(e);
  }, { passive: false });

  trackGrid.addEventListener('touchmove', (e) => {
    if (isTouching) {
      e.preventDefault();
      handleTouchPaint(e);
    }
  }, { passive: false });

  window.addEventListener('touchend', () => {
    isTouching = false;
  });
}

function handleTouchPaint(e) {
  const touch = e.touches[0];
  const target = document.elementFromPoint(touch.clientX, touch.clientY);
  
  if (target && target.classList.contains('grid-cell')) {
    const r = parseInt(target.dataset.row, 10);
    const c = parseInt(target.dataset.col, 10);
    if (!isNaN(r) && !isNaN(c)) {
      applyTileToCell(r, c);
    }
  }
}

function applyTileToCell(r, c) {
  const targetTileId = (mouseButton === 0) ? activeTileId : -1;
  const previousTileId = levelData[r][c];

  if (previousTileId !== targetTileId) {
    recordTileChange(r, c, previousTileId, targetTileId);
    applyTileToCellRaw(r, c, targetTileId);
  }
}

window.addEventListener('mouseup', () => {
  isMouseDown = false;
});

const viewport = document.getElementById('editor-viewport');
if (viewport) {
  viewport.addEventListener('contextmenu', e => e.preventDefault());
}

function exportLevelText() {
    try {
        const levelName = "Level1.txt";
        const width = GRID_COLS;       
        const height = GRID_ROWS;     
        const tileWidth = 40;
        const tileHeight = 40;
        const orientation = "orthogonal";
        const tilesetPath = "../../../../../Tiled/tileMap01.png";
        const layerType = "Level 1";

        let output = `[header]\n`;
        output += `width=${width}\n`;
        output += `height=${height}\n`;
        output += `tilewidth=${tileWidth}\n`;
        output += `tileheight=${tileHeight}\n`;
        output += `orientation=${orientation}\n\n`;

        output += `[tilesets]\n`;
        output += `tileset=${tilesetPath},${tileWidth},${tileHeight},0,0\n\n`;

        output += `[layer]\n`;
        output += `type=${layerType}\n`;
        output += `data=\n`;

        for (let r = height - 1; r >= 0; r--) {
            let row = [];
            for (let c = 0; c < width; c++) {
                let cellValue = levelData[r] ? levelData[r][c] : -1;
                let tileId = (cellValue !== undefined && cellValue !== -1) ? cellValue : 0;
                row.push(tileId);
            }
            output += row.join(",") + ",\n";
        }

        const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = levelName;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(link.href), 100);

    } catch (err) {
        console.error("Export failed:", err);
    }
}

function recordTileChange(r, c, oldTileId, newTileId) {
  if (oldTileId === newTileId) return;
  
  if (!currentStroke) {
    currentStroke = [];
  }
  
  const exists = currentStroke.some(change => change.r === r && change.c === c);
  if (!exists) {
    currentStroke.push({ r, c, oldTileId, newTileId });
  }
}

function commitStroke() {
  if (currentStroke && currentStroke.length > 0) {
    undoStack.push(currentStroke);
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack.length = 0; 
  }
  currentStroke = null;
}

function undo() {
  if (undoStack.length === 0) return;
  
  const lastStroke = undoStack.pop();
  const redoStroke = [];

  lastStroke.forEach(change => {
    redoStroke.push(change);
    applyTileToCellRaw(change.r, change.c, change.oldTileId);
  });

  redoStack.push(redoStroke);
}

function redo() {
  if (redoStack.length === 0) return;
  
  const nextStroke = redoStack.pop();
  const undoStroke = [];

  nextStroke.forEach(change => {
    undoStroke.push(change);
    applyTileToCellRaw(change.r, change.c, change.newTileId);
  });

  undoStack.push(undoStroke);
}

function applyTileToCellRaw(r, c, tileId) {
  levelData[r][c] = tileId;
  const cell = document.querySelector(`.grid-cell[data-row="${r}"][data-col="${c}"]`);
  if (cell) {
    if (tileId <= 0) {
      cell.style.backgroundImage = 'none';
    } else {
      const tileObj = tileRegistry.get(tileId);
      if (tileObj) tileObj.applyStyle(cell);
    }
  }
}

window.addEventListener('mouseup', () => {
  isMouseDown = false;
  commitStroke();
});

window.addEventListener('touchend', () => {
  commitStroke();
});

window.addEventListener('keydown', (e) => {
  const isCmdOrCtrl = e.ctrlKey || e.metaKey;

  if (isCmdOrCtrl && !e.shiftKey && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    undo();
  } else if (
    (isCmdOrCtrl && e.key.toLowerCase() === 'y') ||
    (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'z')
  ) {
    e.preventDefault();
    redo();
  }
});

function importLevelText(fileText) {
  try {
    const lines = fileText.split(/\r?\n/);
    let isDataSection = false;
    let rawRows = [];

    for (let line of lines) {
      const trimmed = line.trim();

      if (trimmed === 'data=') {
        isDataSection = true;
        continue;
      }

      if (isDataSection) {
        if (trimmed.startsWith('[')) break;
        if (!trimmed) continue;

        const rowValues = trimmed.replace(/,$/, '').split(',').map(v => parseInt(v.trim(), 10));
        
        if (rowValues.length > 0 && !isNaN(rowValues[0])) {
          rawRows.push(rowValues);
        }
      }
    }

    if (rawRows.length === 0) {
      alert("Invalid or empty level file format.");
      return;
    }

    const importedHeight = rawRows.length;
    if (importedHeight !== GRID_ROWS) {
      resizeGrid(importedHeight);
    }

    for (let r = 0; r < Math.min(importedHeight, GRID_ROWS); r++) {
      const targetRow = importedHeight - 1 - r;
      const rowData = rawRows[r];

      for (let c = 0; c < Math.min(rowData.length, GRID_COLS); c++) {
        let tileVal = rowData[c];
        let finalTileId = (tileVal === 0) ? -1 : tileVal;

        applyTileToCellRaw(targetRow, c, finalTileId);
      }
    }

    undoStack.length = 0;
    redoStack.length = 0;
    currentStroke = null;

    alert("Level loaded successfully!");

  } catch (err) {
    console.error("Failed to import level:", err);
    alert("Error parsing level file.");
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const importBtn = document.getElementById('import-btn');
  const fileInput = document.getElementById('import-file-input');

  if (importBtn && fileInput) {
    importBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        importLevelText(evt.target.result);
        fileInput.value = '';
      };
      reader.readAsText(file);
    });
  }
});

function resizeGrid(newRowCount) {
  const oldRowCount = GRID_ROWS;
  GRID_ROWS = newRowCount;

  const newLevelData = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(-1));
  for (let r = 0; r < Math.min(oldRowCount, GRID_ROWS); r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (levelData[r] && levelData[r][c] !== undefined) {
        newLevelData[r][c] = levelData[r][c];
      }
    }
  }
  levelData = newLevelData;

  // Re-build DOM elements for new row count
  initTrackGrid();

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (levelData[r][c] > 0) {
        applyTileToCellRaw(r, c, levelData[r][c]);
      }
    }
  }

  scrollToBottom();
}

function clearGrid() {
  // Reset level data matrix
  levelData = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(-1));

  // Clear visual grid DOM
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      applyTileToCellRaw(r, c, -1);
    }
  }

  // Clear history stacks
  undoStack.length = 0;
  redoStack.length = 0;
  currentStroke = null;
}