// DOM Elements
const video = document.getElementById('video');
const playPauseBtn = document.getElementById('play-pause');
const progressBar = document.getElementById('progress-bar');
const progressContainer = document.getElementById('progress-container');
const currentTimeEl = document.getElementById('current-time');
const timeRemainingEl = document.getElementById('time-remaining');
const btnMute = document.getElementById('btn-mute');
const qrTrigger = document.getElementById('qr-trigger');
const qrModal = document.getElementById('qr-modal');
const qrClose = document.querySelector('.qr-close');
const qrTarget = document.getElementById('qr-code-target');
const qrUrlDisplay = document.getElementById('qr-url-display');
const videoWrapper = document.getElementById('video-wrapper');
const btnFull = document.getElementById('btn-full');
const btnSbs = document.getElementById('btn-sbs');
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnSelect = document.getElementById('btn-select');
const btnEllipse = document.getElementById('btn-ellipse');
const btnCurve = document.getElementById('btn-curve');
const btnArrow = document.getElementById('btn-arrow');
const btnDefaults = document.getElementById('btn-defaults');
const btnCopyJson = document.getElementById('btn-copy-json');
const btnClear = document.getElementById('btn-clear');
const btnReset = document.getElementById('btn-reset');
const btnRestart = document.getElementById('btn-restart');
const layerLeft = document.getElementById('layer-left');
const layerRight = document.getElementById('layer-right');
const drawingCanvas = document.getElementById('drawing-canvas');
const sbsCanvas = document.getElementById('sbs-canvas');
const sbsCtx = sbsCanvas.getContext('2d');

// State
let shapes = []; 
let currentMode = 'left';
let activeTool = 'select';
let selectedShapeId = null;
let isDrawing = false;
let activeShapeId = null;
let startX, startY;

// Properties
let activeColor = '#42a5f5';
let activeSize = 4;
let activeStyle = 'solid';
let activeFill = 'none';

let showDefaults = true;
let defaultIds = new Set();

const STORAGE_KEY = 'richard_poc_state_v11';

// HLS Initialization
const videoSrc = 'https://streams.quintar.ai/kyle/20251207-red-green/40Mbps/index.m3u8';
let hls;

function initVideo() {
    console.log("Initializing Video...");
    if (Hls.isSupported()) {
        if (hls) hls.destroy();
        hls = new Hls();
        hls.loadSource(videoSrc);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log("HLS Manifest Parsed");
            loadState();
            // Optional: Re-enable muted autoplay if stable
            // video.muted = true;
            // video.play().catch(e => console.log("Autoplay blocked, waiting for user."));
        });
        hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR: hls.startLoad(); break;
                    case Hls.ErrorTypes.MEDIA_ERROR: hls.recoverMediaError(); break;
                    default: initVideo(); break;
                }
            }
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = videoSrc;
        video.addEventListener('loadedmetadata', () => { loadState(); });
    }
}

// Persistence Logic
function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ shapes, currentMode, isMuted: video.muted, showDefaults }));
}

async function fetchDefaults() {
    try {
        const response = await fetch('default_annotations.json');
        if (!response.ok) throw new Error("HTTP error " + response.status);
        const data = await response.json();
        data.forEach(d => defaultIds.add(d.id));
        return data;
    } catch (e) {
        console.error("Failed to fetch defaults:", e);
        return [];
    }
}

async function toggleDefaults() {
    showDefaults = !showDefaults;
    btnDefaults.classList.toggle('active', showDefaults);
    
    if (showDefaults) {
        const defaults = await fetchDefaults();
        defaults.forEach(ds => {
            if (!shapes.find(s => s.id === ds.id)) {
                shapes.push(ds);
                renderShape(ds);
            }
        });
    } else {
        shapes = shapes.filter(s => !defaultIds.has(s.id));
        document.querySelectorAll('.ellipse-element, .curve-element').forEach(el => {
            if (defaultIds.has(parseInt(el.dataset.id))) el.remove();
        });
        deselectShape();
    }
    updateVisibility();
    saveState();
}

function renderShape(s) {
    [layerLeft, layerRight].forEach(layer => {
        let el;
        if (s.type === 'ellipse') { 
            el = document.createElement('div'); el.className = 'ellipse-element'; 
            layer.appendChild(el); 
        } else { 
            el = document.createElementNS("http://www.w3.org/2000/svg", "path");
            el.setAttribute('class', 'curve-element'); 
            layer.querySelector('svg').appendChild(el); 
        }
        el.dataset.id = s.id; el.style.pointerEvents = 'auto';
        const onSelect = (ev) => { if (activeTool === 'select') { ev.preventDefault(); ev.stopPropagation(); handleShapeClick(s.id); } };
        el.addEventListener('mousedown', onSelect);
        el.addEventListener('touchstart', onSelect, { passive: false });
        updateElementStyles(el, s);
    });
}

async function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const defaults = await fetchDefaults();
        
        if (!saved) {
            showDefaults = true;
            btnDefaults.classList.add('active');
            shapes = [...defaults];
            shapes.forEach(s => renderShape(s));
            updateVisibility();
            return;
        }

        const state = JSON.parse(saved);
        
        // Restore shapes first to prevent overwriting with empty array during UI sync
        if (state.shapes) {
            shapes = state.shapes;
            if (showDefaults) {
                defaults.forEach(ds => { if (!shapes.find(existing => existing.id === ds.id)) shapes.push(ds); });
            } else {
                shapes = shapes.filter(s => !defaultIds.has(s.id));
            }
        }

        if (state.currentMode) setMode(state.currentMode);
        video.muted = state.isMuted !== undefined ? state.isMuted : true;
        btnMute.innerHTML = video.muted ? '🔇' : '🔊';
        
        showDefaults = state.showDefaults !== undefined ? state.showDefaults : true;
        btnDefaults.classList.toggle('active', showDefaults);
        
        shapes.forEach(s => renderShape(s));
        updateVisibility();
    } catch (e) {
        console.error("Failed to load state:", e);
    }
}

// Mode Switching
function setMode(mode) {
    currentMode = mode;
    videoWrapper.className = 'video-container mode-' + mode + (activeTool ? ' tool-active' : '');
    [btnFull, btnSbs, btnLeft, btnRight].forEach(btn => btn.classList.remove('active'));
    if (mode === 'full') btnFull.classList.add('active');
    if (mode === 'sbs') btnSbs.classList.add('active');
    if (mode === 'left') btnLeft.classList.add('active');
    if (mode === 'right') btnRight.classList.add('active');
    if (mode === 'sbs') requestAnimationFrame(renderSbs);
    saveState();
}

btnFull.addEventListener('click', () => setMode('full'));
btnSbs.addEventListener('click', () => setMode('sbs'));
btnLeft.addEventListener('click', () => setMode('left'));
btnRight.addEventListener('click', () => setMode('right'));

// Tool Logic
function selectTool(tool) {
    if (activeTool === tool) {
        activeTool = null;
        [btnSelect, btnEllipse, btnCurve, btnArrow].forEach(b => b.classList.remove('active'));
        videoWrapper.classList.remove('tool-active');
    } else {
        activeTool = tool;
        btnSelect.classList.toggle('active', tool === 'select');
        btnEllipse.classList.toggle('active', tool === 'ellipse');
        btnCurve.classList.toggle('active', tool === 'curve');
        btnArrow.classList.toggle('active', tool === 'arrow');
        videoWrapper.classList.add('tool-active');
        if (tool !== 'select') deselectShape();
    }
}

btnSelect.addEventListener('click', () => selectTool('select'));
btnEllipse.addEventListener('click', () => selectTool('ellipse'));
btnCurve.addEventListener('click', () => selectTool('curve'));
btnArrow.addEventListener('click', () => selectTool('arrow'));

// Property Listeners
document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeColor = btn.dataset.color;
        if (selectedShapeId) {
            const shape = shapes.find(s => s.id === selectedShapeId);
            if (shape) {
                shape.color = activeColor;
                document.querySelectorAll(`[data-id="${shape.id}"]`).forEach(el => updateElementStyles(el, shape));
                saveState();
            }
        }
    });
});

document.querySelectorAll('.opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const parent = btn.closest('.option-row');
        parent.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const label = btn.closest('.prop-group').querySelector('.prop-label').textContent;
        let val = btn.dataset.val;
        
        if (label === 'Size') activeSize = parseInt(val);
        if (label === 'Style') activeStyle = val;
        if (label === 'Fill') activeFill = val;

        if (selectedShapeId) {
            const shape = shapes.find(s => s.id === selectedShapeId);
            if (shape) {
                if (label === 'Size') shape.size = activeSize;
                if (label === 'Style') shape.style = activeStyle;
                if (label === 'Fill') shape.fill = activeFill;
                document.querySelectorAll(`[data-id="${shape.id}"]`).forEach(el => updateElementStyles(el, shape));
                saveState();
            }
        }
    });
});

btnDefaults.addEventListener('click', toggleDefaults);
btnCopyJson.addEventListener('click', () => { const data = JSON.stringify(shapes, null, 2); navigator.clipboard.writeText(data).then(() => { const originalText = btnCopyJson.innerHTML; btnCopyJson.innerHTML = '✅ Copied!'; setTimeout(() => btnCopyJson.innerHTML = originalText, 2000); }); });
btnClear.addEventListener('click', () => { document.querySelectorAll('.ellipse-element, .curve-element').forEach(el => el.remove()); shapes = []; deselectShape(); saveState(); });
btnReset.addEventListener('click', () => { localStorage.removeItem(STORAGE_KEY); location.reload(); });

function deselectShape() { document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected')); selectedShapeId = null; }
function handleShapeClick(id) { 
    if (activeTool !== 'select') return; 
    deselectShape(); 
    selectedShapeId = id; 
    document.querySelectorAll(`[data-id="${id}"]`).forEach(el => el.classList.add('selected')); 

    const shape = shapes.find(s => s.id === id);
    if (shape) {
        // Sync Color
        if (shape.color) {
            activeColor = shape.color;
            document.querySelectorAll('.color-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.color === activeColor);
            });
        }
        // Sync Size
        if (shape.size) {
            activeSize = shape.size;
            document.querySelectorAll('.prop-group').forEach(group => {
                if (group.querySelector('.prop-label').textContent === 'Size') {
                    group.querySelectorAll('.opt-btn').forEach(btn => {
                        btn.classList.toggle('active', parseInt(btn.dataset.val) === activeSize);
                    });
                }
            });
        }
        // Sync Style
        if (shape.style) {
            activeStyle = shape.style;
            document.querySelectorAll('.prop-group').forEach(group => {
                if (group.querySelector('.prop-label').textContent === 'Style') {
                    group.querySelectorAll('.opt-btn').forEach(btn => {
                        btn.classList.toggle('active', btn.dataset.val === activeStyle);
                    });
                }
            });
        }
        // Sync Fill
        if (shape.fill) {
            activeFill = shape.fill;
            document.querySelectorAll('.prop-group').forEach(group => {
                if (group.querySelector('.prop-label').textContent === 'Fill') {
                    group.querySelectorAll('.opt-btn').forEach(btn => {
                        btn.classList.toggle('active', btn.dataset.val === activeFill);
                    });
                }
            });
        }
    }
}

// SBS Rendering Loop
function renderSbs() {
    if (currentMode !== 'sbs') return;
    if (video.videoWidth > 0) {
        const eyeW = video.videoWidth; const eyeH = video.videoHeight / 2;
        if (sbsCanvas.width !== eyeW * 2) { sbsCanvas.width = eyeW * 2; sbsCanvas.height = eyeH; }
        sbsCtx.drawImage(video, 0, 0, eyeW, eyeH, 0, 0, eyeW, eyeH);
        sbsCtx.drawImage(video, 0, eyeH, eyeW, eyeH, eyeW, 0, eyeW, eyeH);
    }
    if (!video.paused && !video.ended && currentMode === 'sbs') requestAnimationFrame(renderSbs);
}

video.addEventListener('play', () => { if (currentMode === 'sbs') requestAnimationFrame(renderSbs); playPauseBtn.innerHTML = '⏸'; });
video.addEventListener('pause', () => { playPauseBtn.innerHTML = '▶'; });
video.addEventListener('seeked', () => { if (currentMode === 'sbs') requestAnimationFrame(renderSbs); updateVisibility(); });

// Drawing Logic
function updateElementStyles(el, shape) {
    const color = shape.color || activeColor;
    const size = shape.size || activeSize;
    const style = shape.style || activeStyle;
    const fillMode = shape.fill || activeFill;

    // Calculate scale factor to convert pixels to SVG viewBox units (0-100)
    const rect = drawingCanvas.getBoundingClientRect();
    const svgScale = rect.width > 0 ? (100 / rect.width) : 1;
    const scaledSize = size * svgScale;

    if (shape.type === 'ellipse') {
        el.style.left = (shape.x * 100) + '%'; el.style.top = (shape.y * 100) + '%';
        el.style.width = (shape.w * 100) + '%'; el.style.height = (shape.h * 100) + '%';
        el.style.borderColor = color;
        el.style.borderWidth = size + 'px';
        el.style.borderStyle = style;
        
        let fillAlpha = 0;
        if (fillMode === 'low') fillAlpha = 0.2;
        else if (fillMode === 'mid') fillAlpha = 0.5;
        else if (fillMode === 'full') fillAlpha = 1.0;
        
        const r = parseInt(color.slice(1,3), 16), g = parseInt(color.slice(3,5), 16), b = parseInt(color.slice(5,7), 16);
        el.style.backgroundColor = `rgba(${r},${g},${b},${fillAlpha})`;
    } else {
        let d;
        if (shape.type === 'curve') {
            d = `M ${shape.x*100} ${shape.y*100} Q ${shape.cpX*100} ${shape.cpY*100} ${shape.x2*100} ${shape.y2*100}`;
        } else if (shape.type === 'arrow') {
            const x1 = shape.x * 100, y1 = shape.y * 100, x2 = shape.x2 * 100, y2 = shape.y2 * 100;
            const cpx = shape.cpX * 100, cpy = shape.cpY * 100;
            
            // Quadratic curve path
            d = `M ${x1} ${y1} Q ${cpx} ${cpy} ${x2} ${y2}`;
            
            // Triangle arrowhead (scaled)
            const angle = Math.atan2(y2 - cpy, x2 - cpx);
            const headLen = scaledSize * 2.5;
            const head1X = x2 - headLen * Math.cos(angle - Math.PI / 8);
            const head1Y = y2 - headLen * Math.sin(angle - Math.PI / 8);
            const head2X = x2 - headLen * Math.cos(angle + Math.PI / 8);
            const head2Y = y2 - headLen * Math.sin(angle + Math.PI / 8);
            
            d += ` M ${x2} ${y2} L ${head1X} ${head1Y} L ${head2X} ${head2Y} Z`;
        }
        el.setAttribute('d', d);
        el.setAttribute('stroke', color);
        el.setAttribute('stroke-width', scaledSize);
        
        // Arrows have filled heads
        if (shape.type === 'arrow') {
            el.setAttribute('fill', color);
            el.setAttribute('stroke-linejoin', 'round');
        } else {
            el.setAttribute('fill', 'none');
        }
        
        if (style === 'dashed') el.setAttribute('stroke-dasharray', scaledSize * 2);
        else el.removeAttribute('stroke-dasharray');
    }
}

function handleStart(e) {
    if (!activeTool || activeTool === 'select') return;
    isDrawing = true;
    const rect = drawingCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    let normXGlobal = (clientX - rect.left) / rect.width;
    let normYGlobal = (clientY - rect.top) / rect.height;
    let x, y;
    if (currentMode === 'sbs') { x = (normXGlobal < 0.5) ? (normXGlobal * 2) : ((normXGlobal - 0.5) * 2); y = normYGlobal; }
    else if (currentMode === 'full') { x = normXGlobal; y = (normYGlobal < 0.5) ? (normYGlobal * 2) : ((normYGlobal - 0.5) * 2); }
    else { x = normXGlobal; y = normYGlobal; }
    startX = x; startY = y;
    const newShape = { 
        id: Date.now(), type: activeTool, x: x, y: y, w: 0, h: 0, x2: x, y2: y, 
        time: video.currentTime,
        color: activeColor,
        size: activeSize,
        style: activeStyle,
        fill: activeFill
    };
    shapes.push(newShape); activeShapeId = newShape.id;
    [layerLeft, layerRight].forEach((layer) => {
        let el;
        if (activeTool === 'ellipse') { el = document.createElement('div'); el.className = 'ellipse-element visible'; layer.appendChild(el); }
        else { el = document.createElementNS("http://www.w3.org/2000/svg", "path"); el.setAttribute('class', 'curve-element visible'); layer.querySelector('svg').appendChild(el); }
        el.dataset.id = newShape.id; el.style.pointerEvents = 'auto';
        const onShapeDown = (ev) => { if (activeTool === 'select') { ev.stopPropagation(); handleShapeClick(newShape.id); } };
        el.addEventListener('mousedown', onShapeDown); el.addEventListener('touchstart', onShapeDown);
        updateElementStyles(el, newShape);
    });
}

function handleMove(e) {
    if (!isDrawing) return;
    if (e.touches) e.preventDefault();
    const rect = drawingCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    let curXGlobal = (clientX - rect.left) / rect.width;
    let curYGlobal = (clientY - rect.top) / rect.height;
    let curX, curY;
    if (currentMode === 'sbs') { curX = (curXGlobal < 0.5) ? (curXGlobal * 2) : ((curXGlobal - 0.5) * 2); curY = curYGlobal; }
    else if (currentMode === 'full') { curX = curXGlobal; curY = (curYGlobal < 0.5) ? (curYGlobal * 2) : ((curYGlobal - 0.5) * 2); }
    else { curX = curXGlobal; curY = curYGlobal; }
    const shape = shapes.find(s => s.id === activeShapeId); if (!shape) return;
    if (shape.type === 'ellipse') { shape.w = Math.abs(curX - startX); shape.h = Math.abs(curY - startY); shape.x = Math.min(curX, startX); shape.y = Math.min(curY, startY); }
    else if (shape.type === 'curve' || shape.type === 'arrow') { 
        shape.x2 = curX; shape.y2 = curY; 
        const midX = (startX + curX) / 2, midY = (startY + curY) / 2; 
        const dx = curX - startX, dy = curY - startY; 
        shape.cpX = midX - dy * 0.2; shape.cpY = midY + dx * 0.2; 
    }
    document.querySelectorAll(`[data-id="${shape.id}"]`).forEach(el => updateElementStyles(el, shape));
}

function handleEnd() { if (isDrawing) saveState(); isDrawing = false; activeShapeId = null; }

drawingCanvas.addEventListener('mousedown', handleStart);
window.addEventListener('mousemove', handleMove);
window.addEventListener('mouseup', handleEnd);
drawingCanvas.addEventListener('touchstart', (e) => { if (activeTool && activeTool !== 'select') e.preventDefault(); handleStart(e); }, { passive: false });
window.addEventListener('touchmove', handleMove, { passive: false });
window.addEventListener('touchend', handleEnd);

function updateVisibility() {
    const now = video.currentTime;
    shapes.forEach(shape => { if (shape.id === activeShapeId) return; const isVisible = (now >= shape.time); document.querySelectorAll(`[data-id="${shape.id}"]`).forEach(el => { el.classList.toggle('visible', isVisible); }); });
}

// UI Handlers
btnMute.addEventListener('click', () => { video.muted = !video.muted; btnMute.innerHTML = video.muted ? '🔇' : '🔊'; saveState(); });
playPauseBtn.addEventListener('click', () => { 
    console.log("Play/Pause clicked. Current state paused:", video.paused);
    if (video.paused) { video.play().catch(e => console.error("Play failed:", e)); } 
    else { video.pause(); } 
});
btnRestart.addEventListener('click', () => { video.currentTime = 0; video.play(); });
document.getElementById('rewind').addEventListener('click', () => { video.currentTime -= 10; });
document.getElementById('forward').addEventListener('click', () => { video.currentTime += 10; });

function formatTime(seconds) { if (isNaN(seconds) || seconds === Infinity) return '00:00:00'; const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = Math.floor(seconds % 60); return [h, m, s].map(v => v < 10 ? '0' + v : v).join(':'); }

video.addEventListener('timeupdate', () => {
    if (video.duration && video.duration !== Infinity) {
        const percent = (video.currentTime / video.duration) * 100;
        progressBar.style.width = percent + '%';
        currentTimeEl.textContent = formatTime(video.currentTime);
        timeRemainingEl.textContent = '-' + formatTime(video.duration - video.currentTime);
    }
    updateVisibility();
});

progressContainer.addEventListener('click', (e) => {
    if (video.duration && video.duration !== Infinity) {
        const rect = progressContainer.getBoundingClientRect();
        const pos = (e.pageX - rect.left) / rect.width;
        video.currentTime = pos * video.duration;
    }
});

// Start initialization
initVideo();
selectTool('select');

// QR Modal Trigger
qrTrigger.addEventListener('click', () => {
    const prodUrl = "https://rbaileyquintar.github.io/richardquintargitpages/telistration-poc/index.html";
    qrTarget.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(prodUrl)}" alt="QR Code">`;
    qrUrlDisplay.textContent = prodUrl; qrModal.classList.add('active');
});
qrClose.addEventListener('click', () => qrModal.classList.remove('active'));
qrModal.addEventListener('click', (e) => { if(e.target === qrModal) qrModal.classList.remove('active'); });
