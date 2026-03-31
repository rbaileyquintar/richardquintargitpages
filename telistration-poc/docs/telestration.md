# Telestration Systems: Advanced Architectural Design and Functional Taxonomy

## Overview
The technological convergence of computer vision, real-time graphics rendering, and high-performance video processing has transformed sports telestration from a rudimentary drawing overlay into a sophisticated narrative engine. Modern telestration systems are not merely drawing applications; they are **coordinate-aware spatial environments** that reconcile the 2D pixel space of a video frame with the 3D physical space of a playing surface.

## Systematic Taxonomy of Operational Modes

### 1. Static and Temporal Frame Annotation
- **Basic/Still Mode**: Annotation on a frozen temporal moment.
- **Temporal Pinning**: Assigning start and end times to graphics within the video timeline.
- **Sequential Animate**: Multi-step tactical diagrams managed in a prioritized queue.

### 2. Dynamic Motion Tracking and AI Integration
- **SOT/MOT (Single/Multi-Object Tracking)**: Tethering graphics to moving athletes.
- **AI 'Snap-to-Player'**: Utilizing object detection (e.g., YOLO) to automatically center highlights.
- **AI-Powered Pitch Calibration**: Homography Matrix (H) calculation.

### 3. Quest 3 and XR Immersive Support
- **Stereoscopic WebXR Playback**: Mapping the Top-Bottom (Stereo TB) HLS stream to a virtual 3D volume or curved screen.
- **Spatial Parallax**: Ensuring annotations (Arrows, Halos, Polygons) are rendered with correct eye separation and depth parallax so they appear at the correct physical depth within the field of play.
- **Spatial Input Tracking**: Utilizing Quest 3 hand tracking or controllers to create and edit annotations in an immersive 3D environment.

---

## Core Graphics and Visualization Tools

### Field Calibration and Geometry
| Tool | Icon | Description |
| :--- | :--- | :--- |
| **Field Corner Tool** | ⛶ / 🎯 | Marks the 4 corners of the pitch for calibration. |
| **Depth Anchoring Tool** | 📐 | Sets the Y-axis baseline for an illustration plane. |

---

## Technical Implementation Logic

### Coordinate Transformation & Homography
The transformation between screen pixels and physical pitch coordinates is governed by the Homography Matrix **H**. For XR, this is extended into a **Spatial Projection Matrix** that accounts for head position and IPD (Interpupillary Distance).

### Persistence and Serialization
The serialization schema supports spatial data, allowing annotations created in a 2D browser to be viewed with depth in a Quest 3 headset.

---

## Professional Interaction Flow (UI/UX)
*   **J-K-L Scrubbing**: The industry standard for frame-accurate navigation.
*   **Property Bar Selection**: Real-time modification of color and thickness.
*   **View Export**: Context-aware image capture for Full TB, Left, or Right eye views.

---

## Current HLS Streaming POC
- **Transport Controls**: Play/Pause, J-K-L frame-accurate scrubbing.
- **Time Analysis**: Real-time timestamp calculation.
- **High Bitrate Support**: Optimized for 40Mbps streams.

---
*Last Updated: 2026-03-31*
