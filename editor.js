class Tile {
  constructor(index, sheetColumns, totalWidth, sourceTileSize = 64, displayTileSize = 32) {
    this.id = index + 1; // Real ID (1-based: 1, 2, 3...)
    this.name = `Tile #${this.id}`;
    this.sourceTileSize = sourceTileSize;
    this.displayTileSize = displayTileSize;
    this.sheetColumns = sheetColumns;

    // Crop offsets calculated against the 0-based index
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

const NATIVE_TILE_SIZE = 64;  // HD Sprite sheet tile size
const DISPLAY_TILE_SIZE = 32; // Editor UI cell size
const TOTAL_TILES = 2841;      
const GRID_COLS = 5;          
const GRID_ROWS = 80;         

let activeTileId = 0;
let isMouseDown = false;
let mouseButton = 0;
const tileRegistry = new Map();
const levelData = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(-1));

const spriteImg = new Image();
spriteImg.src = 'Tileset.png';
spriteImg.onload = () => {
  const sheetWidth = spriteImg.naturalWidth;
  const sheetColumns = Math.floor(sheetWidth / NATIVE_TILE_SIZE);

  // Use 1-based indexing (1 to TOTAL_TILES)
  for (let i = 1; i <= TOTAL_TILES; i++) {
    // Subtract 1 inside Tile constructor for cropping math (0-based sheet offsets)
    tileRegistry.set(i, new Tile(i - 1, sheetColumns, sheetWidth, NATIVE_TILE_SIZE, DISPLAY_TILE_SIZE));
  }

  initPalette();
  initTrackGrid();
  
  // Select tile ID 1 by default instead of 0
  const firstPaletteTile = document.querySelector('.palette-tile');
  selectTile(1, firstPaletteTile);
};

function initPalette() {
  const paletteContainer = document.getElementById('palette-container');
  if (!paletteContainer) return;
  paletteContainer.innerHTML = '';

  for (let i = 0; i < TOTAL_TILES; i++) {
    const paletteTile = document.createElement('div');
    
    const tileObj = tileRegistry.get(i);
    // Use the actual tile object ID (or i + 1 if your tilesheet starts at ID 1)
    const tileId = tileObj ? tileObj.id : i;

    paletteTile.className = `palette-tile ${tileId === activeTileId ? 'selected' : ''}`;
    
    if (tileObj) tileObj.applyStyle(paletteTile);
    paletteTile.title = tileObj ? tileObj.name : `Tile #${tileId}`;

    // Pass the correct tileId to selectTile
    paletteTile.addEventListener('click', () => selectTile(tileId, paletteTile));
    paletteContainer.appendChild(paletteTile);
  }
}

function selectTile(tileId, tileElement) {
  activeTileId = tileId;

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

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.dataset.row = r;
      cell.dataset.col = c;

      // Mouse Controls
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

  // Mobile Touch Controls
  let isTouching = false;

  trackGrid.addEventListener('touchstart', (e) => {
    isTouching = true;
    handleTouchPaint(e);
  }, { passive: false });

  trackGrid.addEventListener('touchmove', (e) => {
    if (isTouching) {
      e.preventDefault(); // Prevent page scroll while painting
      handleTouchPaint(e);
    }
  }, { passive: false });

  window.addEventListener('touchend', () => {
    isTouching = false;
  });
}

// Helper to determine which grid cell is under the user's finger
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
  const tileId = (mouseButton === 0) ? activeTileId : -1;
  levelData[r][c] = tileId;

  const cell = document.querySelector(`.grid-cell[data-row="${r}"][data-col="${c}"]`);
  if (cell) {
    if (tileId < 0) {
      cell.style.backgroundImage = 'none';
    } else {
      const tileObj = tileRegistry.get(tileId);
      if (tileObj) tileObj.applyStyle(cell);
    }
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
        // --- Configuration derived from active Editor constants ---
        const levelName = "Level1.txt";
        const width = GRID_COLS;       // Uses defined constant (5)
        const height = GRID_ROWS;     // Uses defined constant (80)
        const tileWidth = 40;
        const tileHeight = 40;
        const orientation = "orthogonal";
        const tilesetPath = "../../../../../Tiled/tileMap01.png";
        const layerType = "Level 1";

        // --- Header Section ---
        let output = `[header]\n`;
        output += `width=${width}\n`;
        output += `height=${height}\n`;
        output += `tilewidth=${tileWidth}\n`;
        output += `tileheight=${tileHeight}\n`;
        output += `orientation=${orientation}\n\n`;

        // --- Tilesets Section ---
        output += `[tilesets]\n`;
        output += `tileset=${tilesetPath},${tileWidth},${tileHeight},0,0\n\n`;

        // --- Layer Section ---
        output += `[layer]\n`;
        output += `type=${layerType}\n`;
        output += `data=\n`;

        // --- Data Export Loop ---
        for (let r = 0; r < height; r++) {
            let row = [];
            for (let c = 0; c < width; c++) {
                // Reads directly from levelData array
                let tileId = (levelData[r] && levelData[r][c] !== undefined) 
                    ? levelData[r][c] 
                    : 0;
                row.push(tileId);
            }
            // Join row elements with commas and append trailing comma
            output += row.join(",") + ",\n";
        }

        // --- Trigger Download ---
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