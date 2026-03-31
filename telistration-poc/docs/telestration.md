# Telestration Systems: Advanced Architectural Design

## Overview
This document outlines the functional taxonomy and architectural design for high-performance sports telestration systems, moving beyond simple overlays to coordinate-aware spatial environments.

## Systematic Taxonomy of Operational Modes

### 1. Static and Temporal Frame Annotation
- **Basic Mode**: Annotation on a frozen video frame.
- **Temporal Pinning**: Assigning start/end times (In/Out points) to graphics within the video timeline.
- **Sequential Animate**: Multi-step tactical diagrams managed in a prioritized queue.

### 2. Dynamic Motion Tracking
- **Single/Multi-Object Tracking (SOT/MOT)**: Tethering graphics to moving athletes or objects.
- **AI-Powered Pitch Calibration**: Using deep learning to detect field geometry and calculate the **Homography Matrix (H)**.
- **Perspective Accuracy**: Transforming 2D screen coordinates $(u, v)$ into 3D world coordinates $(x, y)$ to ensure graphics lie flat on the surface.

### 3. Reconstructive 3D Replay
- **Camera Morphing**: Utilizing volumetric models to create virtual perspectives (e.g., "Linesman's Eye" or "Bird's Eye" view).

## Core Graphics and Visualization Tools

### Player Isolation
- **Tracking Halos/Rings**: Elliptical graphics at the player's base.
    - *Open Base Logic*: Hiding the top half of the ring to prevent overlapping legs for a cleaner broadcast look.
- **Spotlights & 3D Columns**: Conical or vertical highlights that scale with perspective.
- **Magnifiers**: Zoomed-in overlays for detail analysis (e.g., grip or release).

### Tactical & Spatial Analysis
- **Perspective-Correct Arrows**: Vectors that narrow toward the vanishing point.
- **3D Occupancy Zones**: Shaded polygons (e.g., "the pocket" or "defensive blocks").
- **Spotlight Mode**: Desaturating and blurring pixels outside a selected zone to focus viewer attention.

## Technical Implementation Logic

### Coordinate Transformation
The relationship between screen pixels $(u, v)$ and physical pitch coordinates $(x, y)$ is defined by:
$$\begin{bmatrix} u \cdot w \\ v \cdot w \\ w \end{bmatrix} = \mathbf{H} \begin{bmatrix} x \\ y \\ 1 \end{bmatrix}$$

### AI-Driven Layering
- **Object Extraction**: Placing graphics *under* a player's feet but *over* the pitch surface using AI segmentation masks (e.g., SAM).
- **AI Infill (Ghosting)**: Reconstructing the background when moving a player's virtual position.

## Current HLS Streaming POC
- **Transport Controls**: Play/Pause, J-K-L frame-accurate scrubbing.
- **Time Analysis**: Real-time timestamp and time remaining calculation.
- **High Bitrate Support**: Optimized for 40Mbps streams.

### Bitrate Analysis
| Target | Actual | Status |
|--------|--------|--------|
| 40 Mbps| 28.2 Mbps | ✅ Operational |

---
*Last Updated: 2026-03-31*
