// Configuration
const VIDEO_SRC = 'https://streams.quintar.ai/kyle/20251207-red-green/40Mbps/index.m3u8';

// DOM Elements
const video = document.getElementById('main-video');
const videoRight = document.getElementById('secondary-video');
const deckPlayBtn = document.getElementById('deck-play-pause');
const tinyPlayBtn = document.getElementById('tiny-play-pause');
const globalTimecode = document.getElementById('global-timecode');
const displayTime = document.querySelector('.display-time');
const reels = [document.getElementById('reel-a'), document.getElementById('reel-b')];
const playhead = document.getElementById('main-playhead');
const volumeKnob = document.getElementById('volume-knob');
const jogKnobMain = document.getElementById('jog-knob-main');
const jogKnobRight = document.getElementById('jog-knob-right');
const spliceLever = document.getElementById('splice-lever');
const ledPlay = document.getElementById('led-play');
const powerToggle = document.getElementById('power-toggle');

// State
let hls;
let isPlaying = false;
let knobStates = {
    volume: 0,
    jogMain: 0,
    jogRight: 0
};
let reelRotation = 0;
let leverPosition = 50; // percentage
let markInTime = null;
let regions = [];
let shuttleSpeed = 0;
let shuttleBaseRotation = 0;
let currentEffect = 'none';
let previewFrames = { left: null, right: null };

// Audio Analysis State
let audioCtx;
let analyser;
let dataArray;
let sourceNode;
let timelineWaveform = []; // Stores {time, amplitude}

// Initialize HLS
function initHls() {
    if (Hls.isSupported()) {
        if (hls) hls.destroy();
        hls = new Hls();
        hls.loadSource(VIDEO_SRC);
        hls.attachMedia(video);
        
        // Secondary HLS for Right Eye cross-fade
        const hlsR = new Hls();
        hlsR.loadSource(VIDEO_SRC);
        hlsR.attachMedia(videoRight);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log("Splicer: HLS Manifest Parsed");
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = VIDEO_SRC;
        videoRight.src = VIDEO_SRC;
    }
}

// Timecode Formatting (30fps assumed)
function formatTimecode(seconds) {
    if (isNaN(seconds)) return "00:00:00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const f = Math.floor((seconds % 1) * 30);
    return [h, m, s, f].map(v => v.toString().padStart(2, '0')).join(':');
}

// Update UI Loop
function updateLoop() {
    // Sync Secondary Video
    if (Math.abs(videoRight.currentTime - video.currentTime) > 0.1) {
        videoRight.currentTime = video.currentTime;
    }
    if (video.paused && !videoRight.paused) videoRight.pause();
    if (!video.paused && videoRight.paused) videoRight.play();

    // Update Timecodes
    const tc = formatTimecode(video.currentTime);
    globalTimecode.textContent = tc;
    displayTime.textContent = tc;
    document.querySelector('.timecode-small').textContent = tc;

    // Update Playhead
    if (video.duration) {
        const percent = (video.currentTime / video.duration) * 100;
        playhead.style.left = `${percent}%`;
    }

    // Update Reels
    if (!video.paused) {
        reelRotation += 2;
        reels.forEach(r => {
            r.querySelector('.reel-inner').style.transform = `rotate(${reelRotation}deg)`;
        });
    }

    // Update Region Preview
    renderRegions();

    // Draw Audio Waveform
    drawWaveform();

    // Render Preview Effects
    renderPreview();

    // Apply Shuttle Speed
    if (shuttleSpeed !== 0) {
        video.currentTime += shuttleSpeed * 0.05; // Sensitivity
    }

    // Update VU Meters (Real Audio)
    if (!video.paused && dataArray) {
        analyser.getByteFrequencyData(dataArray);
        document.querySelectorAll('.vu-bar').forEach((bar, idx) => {
            // Get average level for a slice of the frequency data
            const sliceStart = idx * 10;
            const sliceEnd = sliceStart + 10;
            let sum = 0;
            for (let i = sliceStart; i < sliceEnd; i++) sum += dataArray[i];
            const avg = sum / 10;
            const val = 10 + (avg / 255) * 90;
            bar.style.width = `${val}%`;
        });
    } else {
         document.querySelectorAll('.vu-bar').forEach(bar => {
            bar.style.width = `10%`;
        });
    }

    requestAnimationFrame(updateLoop);
}

// Transport Controls
function togglePlay() {
    if (!audioCtx) initAudio(); // Start audio on first interaction
    if (video.paused) {
        video.play();
        ledPlay.classList.add('active');
    } else {
        video.pause();
        ledPlay.classList.remove('active');
    }
}

function initAudio() {
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        
        sourceNode = audioCtx.createMediaElementSource(video);
        sourceNode.connect(analyser);
        analyser.connect(audioCtx.destination);
        console.log("Splicer: Audio Context Initialized");
    } catch (e) {
        console.error("Audio Context Error:", e);
    }
}

deckPlayBtn.addEventListener('click', togglePlay);
tinyPlayBtn.addEventListener('click', togglePlay);

document.getElementById('deck-rewind').addEventListener('click', () => video.currentTime -= 5);
document.getElementById('deck-forward').addEventListener('click', () => video.currentTime += 5);

// Knob Rotation Logic
function setupKnob(el, key, type = 'jog') {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startRotation = knobStates[key];
    let onRightSide = false;

    el.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startRotation = knobStates[key];
        el.style.cursor = 'grabbing';
        el.style.transition = 'none';
        
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        onRightSide = e.clientX > centerX;

        if (type === 'shuttle') video.pause();
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        let dy = startY - e.clientY; // UP = positive
        let dx = e.clientX - startX; // RIGHT = positive

        // Flip Y direction if on the right side of the knob
        if (onRightSide) dy = -dy; 

        const delta = (dy + dx) * 1.5;
        
        if (type === 'shuttle') {
            // Limited displacement for shuttle
            const displacement = Math.min(180, Math.max(-180, delta));
            el.style.transform = `rotate(${startRotation + displacement}deg)`;
            shuttleSpeed = displacement / 15;
        } else {
            const rotation = startRotation + delta;
            knobStates[key] = rotation;
            el.style.transform = `rotate(${rotation}deg)`;
            
            // Mock feedback
            if (key === 'volume') video.volume = Math.min(1, Math.max(0, (rotation % 360) / 360));
            if (key.includes('jog')) video.currentTime += delta * 0.01;
        }
    });

    window.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        el.style.cursor = 'pointer';
        
        if (type === 'shuttle') {
            // Snap back to original rotation
            el.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            el.style.transform = `rotate(${startRotation}deg)`;
            shuttleSpeed = 0;
        }
    });
}

setupKnob(volumeKnob, 'volume');
setupKnob(jogKnobMain, 'jogMain', 'shuttle');
setupKnob(jogKnobRight, 'jogRight', 'jog');

// Lever Logic
let leverDragging = false;
spliceLever.addEventListener('mousedown', (e) => {
    leverDragging = true;
});

window.addEventListener('mousemove', (e) => {
    if (!leverDragging) return;
    const track = document.querySelector('.lever-track');
    const rect = track.getBoundingClientRect();
    let pos = (e.clientY - rect.top) / rect.height * 100;
    pos = Math.min(100, Math.max(0, pos));
    spliceLever.style.top = `${pos}%`;
    
    // Cross-fade Logic: top (0%) = Left Eye, bottom (100%) = Right Eye
    if (videoRight) videoRight.style.opacity = pos / 100;

    // Mock "Splice" effect indicator
    const cutInd = document.querySelector('.cut-indicator');
    if (cutInd) {
        if (pos > 95 || pos < 5) {
            cutInd.style.color = 'var(--led-red)';
            cutInd.style.textShadow = '0 0 10px var(--led-red)';
        } else {
            cutInd.style.color = '#555';
            cutInd.style.textShadow = 'none';
        }
    }
});

window.addEventListener('mouseup', () => leverDragging = false);

// Power Toggle Mock
powerToggle.addEventListener('change', () => {
    const container = document.querySelector('.splicer-container');
    if (powerToggle.checked) {
        container.style.opacity = '1';
        container.style.filter = 'none';
        initHls();
    } else {
        container.style.opacity = '0.3';
        container.style.filter = 'grayscale(1) contrast(1.2)';
        video.pause();
    }
});

// Action Buttons Mock
const actions = ['splice', 'join', 'undo', 'delete'];
actions.forEach(act => {
    document.getElementById(`deck-${act}`).addEventListener('click', () => {
        console.log(`Action: ${act}`);
        currentEffect = act;
        
        // Blink indicator
        const status = document.querySelector('.display-status');
        status.textContent = act.toUpperCase() + "...";
        status.style.color = 'var(--led-orange)';
        setTimeout(() => {
            status.textContent = "READY";
            status.style.color = 'var(--led-green)';
        }, 1000);
    });
});

function renderPreview() {
    const canvas = document.getElementById('preview-canvas');
    if (!canvas || !previewFrames.left) return;
    const ctx = canvas.getContext('2d');
    
    // Set dimensions
    if (canvas.width !== canvas.clientWidth) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    if (currentEffect === 'none' || currentEffect === 'undo') {
        ctx.drawImage(previewFrames.left, 0, 0, width, height);
    } else if (currentEffect === 'splice') {
        // Vertical Split
        ctx.drawImage(previewFrames.left, 0, 0, width/2, height, 0, 0, width/2, height);
        ctx.drawImage(previewFrames.right, width/2, 0, width/2, height, width/2, 0, width/2, height);
        // Split line
        ctx.strokeStyle = 'var(--accent-orange)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(width/2, 0); ctx.lineTo(width/2, height); ctx.stroke();
    } else if (currentEffect === 'join') {
        // Blend
        ctx.globalAlpha = 0.5;
        ctx.drawImage(previewFrames.left, 0, 0, width, height);
        ctx.drawImage(previewFrames.right, 0, 0, width, height);
        ctx.globalAlpha = 1.0;
    } else if (currentEffect === 'delete') {
        // Glitch
        ctx.drawImage(previewFrames.left, 0, 0, width, height);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(0, 0, width, height);
        for(let i=0; i<10; i++) {
            ctx.fillStyle = 'white';
            ctx.fillRect(Math.random()*width, Math.random()*height, Math.random()*50, 1);
        }
    }
}

function drawWaveform() {
    const canvas = document.getElementById('audio-waveform');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (canvas.width !== canvas.clientWidth) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }

    const h = canvas.height;
    const w = canvas.width;
    ctx.clearRect(0, 0, w, h);
    
    // Record current amplitude if playing
    if (dataArray && !video.paused) {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for(let i=0; i<dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        
        // Store point (time bucketed to 0.1s for efficiency)
        const bucket = Math.round(video.currentTime * 10) / 10;
        // Only store if we haven't recorded this bucket or it's a higher peak
        const existing = timelineWaveform.find(p => p.t === bucket);
        if (!existing) {
            timelineWaveform.push({ t: bucket, a: avg });
            // Keep array sorted by time
            timelineWaveform.sort((a,b) => a.t - b.t);
        } else if (avg > existing.a) {
            existing.a = avg;
        }
    }

    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h/2);
    
    const duration = video.duration || 1;
    
    // Draw the recorded waveform across the timeline
    timelineWaveform.forEach(point => {
        const x = (point.t / duration) * w;
        // Scale amplitude: (avg/255) * h/2 * boost
        const amp = (point.a / 255) * (h / 2) * 2.5; 
        ctx.lineTo(x, h/2 - amp);
        ctx.lineTo(x, h/2 + amp);
    });
    
    ctx.stroke();
}

// View Mode Switching
const videoMonitor = document.querySelector('.video-monitor');
const modeButtons = document.querySelectorAll('.mode-btn-tiny');

function setViewMode(mode) {
    videoMonitor.classList.remove('mode-left', 'mode-right', 'mode-stereo');
    videoMonitor.classList.add(`mode-${mode}`);
    
    modeButtons.forEach(btn => {
        btn.classList.toggle('active', btn.id === `mode-${mode}`);
    });
    console.log("View Mode set to:", mode);
}

document.getElementById('mode-left').addEventListener('click', () => setViewMode('left'));
document.getElementById('mode-right').addEventListener('click', () => setViewMode('right'));
document.getElementById('mode-stereo').addEventListener('click', () => setViewMode('stereo'));

// Default to Left mode
setViewMode('left');

// Mark In/Out Logic
document.getElementById('deck-mark-in').addEventListener('click', () => {
    markInTime = video.currentTime;
    console.log("Mark In at", markInTime);
});

document.getElementById('deck-mark-out').addEventListener('click', () => {
    if (markInTime !== null) {
        const markOutTime = video.currentTime;
        if (markOutTime > markInTime) {
            regions.push({ start: markInTime, end: markOutTime });
            console.log("Region added:", markInTime, markOutTime);
            markInTime = null; // Reset for next region
        } else {
            console.warn("Mark Out must be after Mark In");
        }
    }
});

function renderRegions() {
    const track = document.getElementById('video-track-content');
    if (!track) return;

    // Clear existing region elements
    track.querySelectorAll('.timeline-region').forEach(el => el.remove());

    const duration = video.duration || 1;

    // Render fixed regions
    regions.forEach(reg => {
        const el = document.createElement('div');
        el.className = 'timeline-region';
        const startPct = (reg.start / duration) * 100;
        const widthPct = ((reg.end - reg.start) / duration) * 100;
        el.style.left = `${startPct}%`;
        el.style.width = `${widthPct}%`;
        track.appendChild(el);
    });

    // Render current active "Mark In" preview
    if (markInTime !== null) {
        const el = document.createElement('div');
        el.className = 'timeline-region preview';
        const startPct = (markInTime / duration) * 100;
        const curPct = (video.currentTime / duration) * 100;
        const widthPct = Math.max(0, curPct - startPct);
        el.style.left = `${startPct}%`;
        el.style.width = `${widthPct}%`;
        track.appendChild(el);
    }
}

// Dynamic Thumbnails
async function generateThumbnails() {
    console.log("Generating thumbnails...");
    const clips = document.querySelectorAll('.clip-item');
    const times = [30, 120, 240, 480]; // Random seconds in a long stream
    
    // Create a temporary video element for capturing
    const capVideo = document.createElement('video');
    capVideo.crossOrigin = 'anonymous';
    capVideo.src = VIDEO_SRC; // Using direct link for simplicity if HLS not needed for single frame
    
    // We need HLS for this too if it's an .m3u8
    let capHls;
    if (Hls.isSupported()) {
        capHls = new Hls();
        capHls.loadSource(VIDEO_SRC);
        capHls.attachMedia(capVideo);
    }

    async function captureFrame(time, isRightEye = false) {
        return new Promise((resolve) => {
            capVideo.currentTime = time;
            capVideo.onseeked = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 1920; 
                canvas.height = 1080;
                const ctx = canvas.getContext('2d');
                
                // If isRightEye, capture the bottom half of the 4K stream
                // The source is 3840x4320. Top half 0-2160, Bottom 2160-4320.
                const sourceY = isRightEye ? 2160 : 0;
                ctx.drawImage(capVideo, 0, sourceY, 3840, 2160, 0, 0, 1920, 1080);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
        });
    }

    // Wait for metadata
    capVideo.onloadedmetadata = async () => {
        for (let i = 0; i < clips.length; i++) {
            const dataUrl = await captureFrame(times[i] || Math.random() * video.duration);
            clips[i].querySelector('.clip-thumb').style.backgroundImage = `url(${dataUrl})`;
            
            // Also update the preview-mini with a frame
            if (i === 0) {
                // Store frames for canvas effects
                const imgL = new Image();
                imgL.src = dataUrl;
                previewFrames.left = imgL;
                
                // Get a right eye frame too
                const dataUrlR = await captureFrame(video.duration / 2, true); // true = right eye
                const imgR = new Image();
                imgR.src = dataUrlR;
                previewFrames.right = imgR;
            }

            // Fill Reels with some frames too
            if (i === 1) {
                const reelA = document.getElementById('reel-a');
                if (reelA) {
                    reelA.style.backgroundImage = `url(${dataUrl})`;
                    reelA.style.backgroundSize = 'cover';
                    reelA.style.backgroundPosition = 'center';
                }
            }
            if (i === 2) {
                const reelB = document.getElementById('reel-b');
                if (reelB) {
                    reelB.style.backgroundImage = `url(${dataUrl})`;
                    reelB.style.backgroundSize = 'cover';
                    reelB.style.backgroundPosition = 'center';
                }
            }
        }
        if (capHls) capHls.destroy();
    };
}

// Initialization
initHls();
requestAnimationFrame(updateLoop);

// Generate thumbnails once video duration is known or after a delay
video.addEventListener('loadedmetadata', () => {
    setTimeout(generateThumbnails, 2000); // Wait for stream to be ready
});

console.log("Johns Video Splicer: Logic loaded.");
