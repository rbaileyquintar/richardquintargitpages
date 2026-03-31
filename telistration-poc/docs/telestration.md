# Telestration Systems: Advanced Architectural Design and Functional Taxonomy

## Overview
The technological convergence of computer vision, real-time graphics rendering, and high-performance video processing has transformed sports telestration from a rudimentary drawing overlay into a sophisticated narrative engine. Modern telestration systems are not merely drawing applications; they are **coordinate-aware spatial environments** that reconcile the 2D pixel space of a video frame with the 3D physical space of a playing surface.

## Systematic Taxonomy of Operational Modes

### 1. Static and Temporal Frame Annotation
- **Basic/Still Mode**: Annotation on a frozen temporal moment.
- **Temporal Pinning**: Assigning start and end times to graphics within the video timeline.
- **Sequential Animate**: Multi-step tactical diagrams managed in a prioritized queue.

### 2. Dynamic Motion Tracking and AI Integration
- **SOT/MOT (Single/Multi-Object Tracking)**: Tethering graphics to moving athletes or objects.
- **AI-Powered Pitch Calibration**: Using deep learning to detect field geometry and calculate the **Homography Matrix (H)**.
- **Perspective Accuracy**: Ensuring graphics lie flat on the turf.

---

## Core Graphics and Visualization Tools

### Field Calibration and Geometry
| Tool | Icon | Description |
| :--- | :--- | :--- |
| **Field Corner Tool** | ⛶ / 🎯 | Marks the 4 corners of the pitch for calibration. |
| **Depth Anchoring Tool** | 📐 | Sets the Y-axis baseline for an illustration plane. |

---

## View Snapshots and Multi-Format Export

### 1. View-Aware Capture Logic
The system allows analysts to "Copy" or "Export" a snapshot of the current tactical view. This capture is **context-aware**, meaning it respects the active viewport mode:
- **Full View**: Captures the entire Top-Bottom stereo frame with all annotations.
- **Left/Right View**: Captures only the active eye's frame, cropping the video source to 100% height and 50% width, while maintaining the relative positioning of the annotations.

### 2. High-Fidelity Rendering
When an export is triggered, the system:
1.  Synchronizes the current `video` frame with the `canvas` layer.
2.  Renders the combined output into a high-resolution offscreen buffer.
3.  Includes all active metadata (timecode, stream info, team colors) as an optional watermark or separate data field.

### 3. Sharing and Presentations
Exported "Maps" are optimized for use in coaching presentations or broadcast reporting, providing a crisp visual summary of the tactical situation at a specific moment in the match.

---

## Tool Property Bar and Property Logic (Selection & Modification)

### 1. Default Property State
The Tool Property Bar allows the analyst to set the **Default Color** and **Default Thickness** for all new annotations.

### 2. Selection Mode and UI Indicators
Selected annotations receive visual feedback and synchronize the property bar for real-time modification.

---

## Persistence, Serialization, and Sequence Management

### 1. The Playhead Sync Engine
The system monitors `video.currentTime` and performs a "Sync Cycle" on every frame.

### 2. Sequence Selection and Import
Allows analysts to import/check-in external tactical JSON files and hot-swap between different playback sequences.

---

## Comparative Mapping by Sport

| Sport | Ranking of Most Common Tools | Primary Operational Modes | Technical Focus Area |
| :--- | :--- | :--- | :--- |
| **Soccer** | 1. Offside Lines, 2. Passing Lanes | Motion Tracking, 3D Recon | Pitch geometry calibration. |
| **Football** | 1. 1st Down Markers, 2. Route Paths | Sequential Animate | Formation identification. |
| **Basketball** | 1. Shot Arcs, 2. Spacing Links | Real-Time MOT | Court-vision analysis. |
| **Baseball** | 1. Strike Zone, 2. Pitch Trails | Data Fusion | Pitch-by-pitch accuracy. |
| **Hockey** | 1. Puck Trails, 2. Skating Paths | High-Frame-Rate Tracking | Rapid puck tracking. |

---

## Professional Interaction Flow (UI/UX)
*   **J-K-L Scrubbing**: The industry standard for frame-accurate navigation.
*   **Shuttle Controls**: Support for hardware controllers and numeric mapping (1-9) for tool selection.

---

## Current HLS Streaming POC
- **Transport Controls**: Play/Pause, J-K-L frame-accurate scrubbing.
- **Time Analysis**: Real-time timestamp and time remaining calculation.
- **High Bitrate Support**: Optimized for 40Mbps streams.

### Bitrate Analysis
| Target | Actual | Status |
| :--- | :--- | :--- |
| 40 Mbps | 28.2 Mbps | ✅ Operational |

---
*Last Updated: 2026-03-31*
