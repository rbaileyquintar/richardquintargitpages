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
let activeTool = null;
let selectedShapeId = null;
let isDrawing = false;
let activeShapeId = null;
let startX, startY;
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
        if (state.currentMode) setMode(state.currentMode);
        video.muted = state.isMuted !== undefined ? state.isMuted : true;
        btnMute.innerHTML = video.muted ? '🔇' : '🔊';
        
        showDefaults = state.showDefaults !== undefined ? state.showDefaults : true;
        btnDefaults.classList.toggle('active', showDefaults);
        
        if (state.shapes) {
            shapes = state.shapes;
            if (showDefaults) {
                defaults.forEach(ds => { if (!shapes.find(existing => existing.id === ds.id)) shapes.push(ds); });
            } else {
                shapes = shapes.filter(s => !defaultIds.has(s.id));
            }
            shapes.forEach(s => renderShape(s));
            updateVisibility();
        }
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
        [btnSelect, btnEllipse, btnCurve].forEach(b => b.classList.remove('active'));
        videoWrapper.classList.remove('tool-active');
    } else {
        activeTool = tool;
        btnSelect.classList.toggle('active', tool === 'select');
        btnEllipse.classList.toggle('active', tool === 'ellipse');
        btnCurve.classList.toggle('active', tool === 'curve');
        videoWrapper.classList.add('tool-active');
        if (tool !== 'select') deselectShape();
    }
}

btnSelect.addEventListener('click', () => selectTool('select'));
btnEllipse.addEventListener('click', () => selectTool('ellipse'));
btnCurve.addEventListener('click', () => selectTool('curve'));
btnDefaults.addEventListener('click', toggleDefaults);
btnCopyJson.addEventListener('click', () => { const data = JSON.stringify(shapes, null, 2); navigator.clipboard.writeText(data).then(() => { const originalText = btnCopyJson.innerHTML; btnCopyJson.innerHTML = '✅ Copied!'; setTimeout(() => btnCopyJson.innerHTML = originalText, 2000); }); });
btnClear.addEventListener('click', () => { document.querySelectorAll('.ellipse-element, .curve-element').forEach(el => el.remove()); shapes = []; deselectShape(); saveState(); });
btnReset.addEventListener('click', () => { localStorage.removeItem(STORAGE_KEY); location.reload(); });

function deselectShape() { document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected')); selectedShapeId = null; }
function handleShapeClick(id) { if (activeTool !== 'select') return; deselectShape(); selectedShapeId = id; document.querySelectorAll(`[data-id="${id}"]`).forEach(el => el.classList.add('selected')); }

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
    if (shape.type === 'ellipse') {
        el.style.left = (shape.x * 100) + '%'; el.style.top = (shape.y * 100) + '%';
        el.style.width = (shape.w * 100) + '%'; el.style.height = (shape.h * 100) + '%';
    } else if (shape.type === 'curve') {
        const d = `M ${shape.x*100} ${shape.y*100} Q ${shape.cpX*100} ${shape.cpY*100} ${shape.x2*100} ${shape.y2*100}`;
        el.setAttribute('d', d);
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
    const newShape = { id: Date.now(), type: activeTool, x: x, y: y, w: 0, h: 0, x2: x, y2: y, cpX: x, cpY: y, time: video.currentTime };
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
    else if (shape.type === 'curve') { shape.x2 = curX; shape.y2 = curY; const midX = (startX + curX) / 2, midY = (startY + curY) / 2; const dx = curX - startX, dy = curY - startY; shape.cpX = midX - dy * 0.2; shape.cpY = midY + dx * 0.2; }
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

// QR Modal Trigger
qrTrigger.addEventListener('click', () => {
    const prodUrl = "https://rbaileyquintar.github.io/richardquintargitpages/telistration-poc/index.html";
    qrTarget.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(prodUrl)}" alt="QR Code">`;
    qrUrlDisplay.textContent = prodUrl; qrModal.classList.add('active');
});
qrClose.addEventListener('click', () => qrModal.classList.remove('active'));
qrModal.addEventListener('click', (e) => { if(e.target === qrModal) qrModal.classList.remove('active'); });
