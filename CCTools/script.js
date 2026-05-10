class Plant {
    constructor(id, name, iconRow, costM) {
        this.id = id;
        this.name = name;
        this.iconRow = iconRow;
        this.spriteCol = 4;
        this.costM = costM;
        this.recipes = [];
    }
}

const plants = [];
const get = (id) => plants[id];

function add(target, a, minA, b = -1, minB = 0, maxA = 8, maxB = 8) {
    const parentA = get(a);
    const parentB = b === -1 ? null : get(b);
    let label = '';
    if (b === -1) {
        label = minA === maxA ? `${minA}x ${parentA.name}` : `>= ${minA}x ${parentA.name}`;
    } else {
        label = `${parentA.name} + ${parentB.name}`;
    }
    
    get(target).recipes.push({
        parentA: a,
        parentB: b,
        minA, maxA, minB, maxB,
        label,
        hasParentB: b !== -1
    });
}

function initDatabase() {
    const plantNames = [
        "Baker's Wheat", "Thumbcorn", "Cronerice", "Gildmillet", "Ordinary Clover",
        "Golden Clover", "Shimmerlily", "Elderwort", "Bakeberry", "Chocoroot",
        "White Chocoroot", "White Mildew", "Brown Mold", "Meddleweed", "Keenmoss",
        "Drowsyfern", "Wardlichen", "Green Rot", "Ichorpuff", "Queenbeet",
        "Juicy Queenbeet", "Duketater", "Crumbspore", "Doughshroom", "Glovemorel",
        "Fool's Bolete", "Wrinklegill", "Whiskerbloom", "Chimerose", "Nursetulip",
        "Tidygrass", "Everdaisy", "Shriekbulb", "Cheapcap"
    ];

    const iconRows = [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 
        10, 26, 27, 29, 16, 14, 15, 28, 33, 17, 
        18, 19, 20, 24, 21, 23, 25, 11, 12, 13, 
        31, 32, 30, 22
    ];

    const costs = [
        30, 100, 250, 1500, 77777, 777777777777, 777777, 100000000, 100000000, 100000, 
        100000, 1000000, 242424, 1000000000, 100000, 10000, 1000000, 1000000000, 1000000000000, 
        1000000000000, 999, 10000, 100000, 10000, 100000000, 1000000, 9999, 9999, 1000000, 
        10, 4444444444444, 100000000000000, 100000000000000000000, 987654321
    ];

    for (let i = 0; i < 34; i++) {
        plants.push(new Plant(i, plantNames[i], iconRows[i], costs[i]));
    }

    add(0, 0, 2); add(0, 1, 2);
    add(1, 0, 2);
    add(2, 0, 1, 1, 1);
    add(3, 1, 1, 2, 1);
    add(4, 0, 1, 3, 1);
    add(5, 0, 4); add(5, 4, 4); add(5, 0, 1, 3, 1);
    add(6, 4, 1, 3, 1);
    add(7, 6, 1, 2, 1);
    add(8, 0, 2);
    add(9, 0, 1, 12, 1);
    add(10, 9, 1, 11, 1);
    add(11, 12, 1);
    add(12, 11, 1);
    add(13, 13, 1);
    add(14, 17, 1, 12, 1);
    add(15, 9, 1, 14, 1);
    add(16, 2, 1, 14, 1); add(16, 11, 1, 2, 1);
    add(17, 11, 1, 4, 1);
    add(18, 7, 1, 22, 1);
    add(19, 9, 1, 8, 1);
    add(20, 19, 8, -1, 0, 8, 8);
    add(21, 19, 2);
    add(22, 22, 2); add(22, 23, 1);
    add(23, 22, 2);
    add(24, 22, 1, 1, 1);
    add(25, 23, 1, 17, 1);
    add(26, 22, 1, 12, 1);
    add(27, 10, 1, 6, 1);
    add(28, 6, 1, 27, 1);
    add(29, 27, 2);
    add(30, 0, 1, 10, 1);
    add(31, 30, 3, 7, 3);
    add(32, 7, 5); add(32, 23, 4); add(32, 21, 3); add(32, 26, 1, 7, 1);
    add(33, 22, 1, 6, 1);
}

// Global UI State
let currentX = 6;
let currentY = 6;
let selectedTargetPlantId = 20; // Default to JQB
let currentRecipeIndex = 0;
let isDropdownOpen = false;

initDatabase();

window.addEventListener('DOMContentLoaded', () => {
    const img = document.getElementById('spritesheet');
    if (img.complete) {
        onImageLoad();
    } else {
        img.onload = onImageLoad;
    }
});

function onImageLoad() {
    populatePlantSelector();
    updateHeaderUI();
    updateControls();
    setupEvents();
    
    // Initial calculation uses setTimeout to let UI render first
    setTimeout(calculateOptimal, 10);
}

function drawSpriteToCanvasObj(plant, canvas) {
    if (!plant || !canvas) return;
    const ctx = canvas.getContext('2d');
    const img = document.getElementById('spritesheet');
    ctx.clearRect(0, 0, 48, 48);
    ctx.drawImage(img, plant.spriteCol * 48, plant.iconRow * 48, 48, 48, 0, 0, 48, 48);
}

function updateHeaderUI() {
    const targetPlant = plants[selectedTargetPlantId];
    drawSpriteToCanvasObj(targetPlant, document.getElementById('target-plant-canvas'));

    const recipe = targetPlant.recipes[currentRecipeIndex];
    document.getElementById('dropdown-label').textContent = recipe.label;
    
    const dropdownBox = document.getElementById('dropdown-box');
    if (targetPlant.recipes.length > 1) {
        dropdownBox.style.borderColor = 'lightgray';
        document.getElementById('dropdown-arrow').style.display = 'block';
    } else {
        dropdownBox.style.borderColor = 'darkgray';
        document.getElementById('dropdown-arrow').style.display = 'none';
    }

    const dropdownList = document.getElementById('dropdown-list');
    dropdownList.innerHTML = '';
    targetPlant.recipes.forEach((r, idx) => {
        const opt = document.createElement('div');
        opt.className = 'dropdown-option';
        opt.textContent = r.label;
        opt.onclick = () => {
            currentRecipeIndex = idx;
            isDropdownOpen = false;
            dropdownList.style.display = 'none';
            updateHeaderUI();
            calculateOptimal();
        };
        opt.onmouseover = (e) => showTooltip(e, ''); // Raylib dropdown doesn't show tooltip
        dropdownList.appendChild(opt);
    });

    drawSpriteToCanvasObj(plants[recipe.parentA], document.getElementById('parent-a-canvas'));
    
    const parentBBox = document.getElementById('parent-b-box');
    if (recipe.hasParentB) {
        parentBBox.style.display = 'block';
        drawSpriteToCanvasObj(plants[recipe.parentB], document.getElementById('parent-b-canvas'));
    } else {
        parentBBox.style.display = 'none';
    }
}

function populatePlantSelector() {
    const grid = document.getElementById('plant-grid');
    grid.innerHTML = '';
    plants.forEach((p, i) => {
        const c = i % 6;
        const r = Math.floor(i / 6);
        
        const cell = document.createElement('div');
        cell.className = 'plant-cell';
        cell.style.left = (c * 60) + 'px';
        cell.style.top = (r * 60) + 'px';
        
        const canvas = document.createElement('canvas');
        canvas.width = 48; canvas.height = 48;
        drawSpriteToCanvasObj(p, canvas);
        cell.appendChild(canvas);
        
        cell.onmouseover = (e) => showTooltip(e, p.name);
        cell.onmouseout = hideTooltip;
        cell.onclick = () => {
            selectedTargetPlantId = p.id;
            currentRecipeIndex = 0;
            isDropdownOpen = false;
            document.getElementById('dropdown-list').style.display = 'none';
            document.getElementById('state-selection').style.display = 'none';
            document.getElementById('state-main').style.display = 'block';
            updateHeaderUI();
            calculateOptimal();
        };
        
        grid.appendChild(cell);
    });
}

function setupEvents() {
    document.getElementById('btn-w-minus').onclick = () => { if(currentX > 1) { currentX--; updateControls(); calculateOptimal(); }};
    document.getElementById('btn-w-plus').onclick = () => { if(currentX < 6) { currentX++; updateControls(); calculateOptimal(); }};
    document.getElementById('btn-h-minus').onclick = () => { if(currentY > 1) { currentY--; updateControls(); calculateOptimal(); }};
    document.getElementById('btn-h-plus').onclick = () => { if(currentY < 6) { currentY++; updateControls(); calculateOptimal(); }};

    document.getElementById('target-plant-box').onclick = () => {
        document.getElementById('state-main').style.display = 'none';
        document.getElementById('state-selection').style.display = 'block';
    };
    
    document.getElementById('btn-back').onclick = () => {
        document.getElementById('state-selection').style.display = 'none';
        document.getElementById('state-main').style.display = 'block';
    };

    document.getElementById('dropdown-box').onclick = () => {
        const targetPlant = plants[selectedTargetPlantId];
        if (targetPlant.recipes.length > 1) {
            isDropdownOpen = !isDropdownOpen;
            document.getElementById('dropdown-list').style.display = isDropdownOpen ? 'block' : 'none';
        }
    };

    document.getElementById('target-plant-box').onmouseover = (e) => {
        if(!isDropdownOpen) showTooltip(e, "Change Target Plant");
    };
    document.getElementById('target-plant-box').onmouseout = hideTooltip;

    document.getElementById('parent-a-box').onmouseover = (e) => {
        if(isDropdownOpen) return;
        const p = plants[plants[selectedTargetPlantId].recipes[currentRecipeIndex].parentA];
        showTooltip(e, p.name);
    };
    document.getElementById('parent-a-box').onmouseout = hideTooltip;

    document.getElementById('parent-b-box').onmouseover = (e) => {
        if(isDropdownOpen) return;
        const recipe = plants[selectedTargetPlantId].recipes[currentRecipeIndex];
        if(recipe.hasParentB) showTooltip(e, plants[recipe.parentB].name);
    };
    document.getElementById('parent-b-box').onmouseout = hideTooltip;
}

function updateControls() {
    document.getElementById('width-label').textContent = 'Width: ' + currentX;
    document.getElementById('height-label').textContent = 'Height: ' + currentY;
}

function calculateOptimal() {
    let reqX = currentX;
    let reqY = currentY;
    const recipe = plants[selectedTargetPlantId].recipes[currentRecipeIndex];
    
    const sig = `${recipe.hasParentB ? 'True' : 'False'}_${recipe.minA}_${recipe.maxA}_${recipe.minB}_${recipe.maxB}`;
    const lookup = PRECOMPUTED_LAYOUTS[sig][`${reqX}x${reqY}`];
    
    let finalGrid = [];
    for (let r = 0; r < reqY; r++) {
        let row = [];
        for (let c = 0; c < reqX; c++) {
            row.push(lookup.Grid[r][c]);
        }
        finalGrid.push(row);
    }
    
    // Optimize by price for 2-parent recipes
    if (recipe.hasParentB) {
        let countA = 0;
        let countB = 0;
        for (let r = 0; r < reqY; r++) {
            for (let c = 0; c < reqX; c++) {
                if (finalGrid[r][c] === 1) countA++;
                if (finalGrid[r][c] === 2) countB++;
            }
        }
        
        const parentA = plants[recipe.parentA];
        const parentB = plants[recipe.parentB];
        
        let swap = false;
        if (parentA.costM > parentB.costM && countA > countB) swap = true;
        else if (parentB.costM > parentA.costM && countB > countA) swap = true;
        
        if (swap) {
            for (let r = 0; r < reqY; r++) {
                for (let c = 0; c < reqX; c++) {
                    if (finalGrid[r][c] === 1) finalGrid[r][c] = 2;
                    else if (finalGrid[r][c] === 2) finalGrid[r][c] = 1;
                }
            }
        }
    }

    document.getElementById('score-text').textContent = `Optimal Yield: ${lookup.Score} tiles`;
    renderGrid(finalGrid);
}

function renderGrid(gridData) {
    const gridEl = document.getElementById('grid-container');
    gridEl.innerHTML = '';
    
    const tileSize = 55;
    const totalWidth = currentX * tileSize;
    const totalHeight = currentY * tileSize;

    gridEl.style.left = (500 - totalWidth / 2) + 'px';
    gridEl.style.top = (355 - totalHeight / 2) + 'px';
    gridEl.style.width = totalWidth + 'px';
    gridEl.style.height = totalHeight + 'px';

    const recipe = plants[selectedTargetPlantId].recipes[currentRecipeIndex];
    const parentA = plants[recipe.parentA];
    const parentB = recipe.hasParentB ? plants[recipe.parentB] : null;

    for (let r = 0; r < currentY; r++) {
        for (let c = 0; c < currentX; c++) {
            const val = gridData[r][c];
            const tile = document.createElement('div');
            tile.className = 'tile' + (val === 0 ? ' empty' : ' soil');
            tile.style.left = (c * tileSize) + 'px';
            tile.style.top = (r * tileSize) + 'px';
            
            let tooltipText = "Empty Soil";
            if (val === 1) {
                const canvas = document.createElement('canvas');
                canvas.width = 48; canvas.height = 48;
                drawSpriteToCanvasObj(parentA, canvas);
                tile.appendChild(canvas);
                tooltipText = parentA.name;
            } else if (val === 2 && parentB) {
                const canvas = document.createElement('canvas');
                canvas.width = 48; canvas.height = 48;
                drawSpriteToCanvasObj(parentB, canvas);
                tile.appendChild(canvas);
                tooltipText = parentB.name;
            }

            tile.onmouseover = (e) => {
                if(!isDropdownOpen) showTooltip(e, tooltipText);
            };
            tile.onmouseout = hideTooltip;

            gridEl.appendChild(tile);
        }
    }
}

const tooltip = document.getElementById('tooltip');
function showTooltip(e, text) {
    if(!text) return;
    tooltip.textContent = text;
    tooltip.style.display = 'block';
    
    const rect = document.getElementById('raylib-window').getBoundingClientRect();
    let x = (e.clientX - rect.left) + 15;
    let y = (e.clientY - rect.top) + 15;
    
    tooltip.style.left = (rect.left + x) + 'px';
    tooltip.style.top = (rect.top + y) + 'px';
}

function hideTooltip() {
    tooltip.style.display = 'none';
}

document.getElementById('raylib-window').addEventListener('mousemove', (e) => {
    if (tooltip.style.display === 'block') {
        const rect = document.getElementById('raylib-window').getBoundingClientRect();
        let x = (e.clientX - rect.left) + 15;
        let y = (e.clientY - rect.top) + 15;
        tooltip.style.left = (rect.left + x) + 'px';
        tooltip.style.top = (rect.top + y) + 'px';
    }
});
