# Telestration Systems: Advanced Architectural Design and Functional Taxonomy

## Overview
The technological convergence of computer vision, real-time graphics rendering, and high-performance video processing has transformed sports telestration from a rudimentary drawing overlay into a sophisticated narrative engine. Modern telestration systems are not merely drawing applications; they are **coordinate-aware spatial environments** that reconcile the 2D pixel space of a video frame with the 3D physical space of a playing surface.

## Systematic Taxonomy of Operational Modes

### 1. Static and Temporal Frame Annotation
- **Basic/Still Mode**: Annotation on a frozen temporal moment.
- **Temporal Pinning**: Assigning start and end times to graphics within the video timeline.
- **Sequential Animate**: Multi-step tactical diagrams managed in a prioritized queue.
- **Undo/Redo Logic**: A transactional state stack (Memento pattern) for all user actions.

### 2. Dynamic Motion Tracking and AI Integration
- **SOT/MOT (Single/Multi-Object Tracking)**: Tethering graphics to moving athletes.
- **AI 'Snap-to-Player'**: Utilizing object detection (e.g., YOLO) to automatically center highlights on athletes' bounding boxes.
- **AI-Powered Pitch Calibration**: Using deep learning to detect field geometry and calculate the **Homography Matrix (H)**.
- **Perspective Accuracy**: Ensuring graphics lie flat on the turf.

### 3. Audio and Narrative Layering
- **Tactical Voice Annotation**: Synchronizing recorded audio commentary to specific timestamps on the telestration timeline, allowing for a complete narrative review.

---

## Core Graphics and Visualization Tools

### Field Calibration and Geometry
| Tool | Icon | Description |
| :--- | :--- | :--- |
| **Field Corner Tool** | ⛶ / 🎯 | Marks the 4 corners of the pitch for calibration. |
| **Depth Anchoring Tool** | 📐 | Sets the Y-axis baseline for an illustration plane. |

---

### Player Isolation and Analysis
| Tool | Description | Technical Requirement |
| :--- | :--- | :--- |
| **Halos & Rings** | Circular/elliptical graphics at the player's base. | **Open Base Logic**: Hides top half of circle. |
| **Movement Echoes** | Fading paths showing historical trajectory. | Stores past coordinates for $N$ frames. |
| **Biometric Cards** | Floating overlays with performance data. | Requires real-time data fusion (e.g., Statcast). |
| **Spotlight Zones** | Shaded polygons with desaturated exteriors. | Clipping masks with Gaussian blur filters. |

---

## Technical Implementation Logic

### Coordinate Transformation & Homography
The transformation between screen pixels and physical pitch coordinates is governed by the Homography Matrix **H**:
$$\begin{bmatrix} u \cdot w \\ v \cdot w \\ w \end{bmatrix} = \mathbf{H} \begin{bmatrix} x \\ y \\ 1 \end{bmatrix}$$

For Stereo Top-Bottom views, the system computes $\mathbf{H}_{LR}$ to map points between views:
$$P_{right} = \mathbf{H}_{LR} P_{left}$$

---

## Persistence, Serialization, and Sequence Management

### 1. The Playhead Sync Engine
The system monitors `video.currentTime` and performs a "Sync Cycle" on every frame, filtering a registry of annotations for visibility.

### 2. State Serialization Schema
Annotations are stored in a `Registry` object.
```json
{
  "sequenceId": "defensive-breakdown-1",
  "videoId": "index.m3u8",
  "annotations": [
    {
      "id": "uuid-1234",
      "type": "halo",
      "startTime": 12.45,
      "endTime": 15.20,
      "yBaseline": 0.78,
      "points": [{"x": 0.45, "y": 0.67}],
      "style": {"color": "#ffeb3b", "thickness": 4},
      "data": {"speed": "22.4 mph"}
    }
  ],
  "audioUrl": "narration_123.webm"
}
```

---

## Professional Interaction Flow (UI/UX)
*   **J-K-L Scrubbing**: The industry standard for frame-accurate navigation (J: Rewind, K: Pause, L: Fast-Forward).
*   **Property Bar Selection**: Real-time modification of color and thickness for selected tactical annotations.
*   **View Export**: Context-aware image capture for Full TB, Left, or Right eye views.

---

## Current HLS Streaming POC
- **Transport Controls**: Play/Pause, J-K-L frame-accurate scrubbing.
- **Time Analysis**: Real-time timestamp and time remaining calculation.
- **High Bitrate Support**: Optimized for 40Mbps streams.

---
*Last Updated: 2026-03-31*
