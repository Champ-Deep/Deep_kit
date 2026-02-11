# The Sovereign Design Bible v5.6
**Target:** Frontend Development & UI Consistency

## 1. North Star
**"The Hub is an OS, not a website."**
It must feel like a cohesive, locally-running operating system dashboard, not a collection of disparate web pages.

## 2. Primary Palette
*   **Cyber Teal (`#00F2FF`)**: Used for the Main Hub, Navigation, and Active Ports. Represents the "System" and "Connectivity".
*   **Phosphor Green (`#39FF14`)**: Used for AI Inference (Ollama), Healthy Logs, and "Brain" activity. Represents "Intelligence" and "Success".
*   **Bright Amber (`#FFB000`)**: Used for Documentation, Database Management, and Warnings. Represents "Storage" and "Caution".
*   **Deep Core (`#0A0B10`)**: Background color. Infinite depth.

## 3. UI Components

### DeepCards (Widgets)
*   **Concept:** Small, glanceable widgets inspired by mobile OS widgets.
*   **Style:** Glassmorphism with high blur.
    *   `backdrop-filter: blur(15px);`
    *   `border: 1px solid rgba(255, 255, 255, 0.1);`
    *   `background: rgba(10, 11, 16, 0.6);`
*   **Behavior:** "Magnetic Snapping" effect on hover.
*   **Content:**
    *   *Calendar:* "Current Meeting"
    *   *Task Tracker:* "Top Task"
    *   *Time Tracker:* "Active Time"

### Hardware Pulse
*   **Visual:** 10-segment LED-style bars.
*   **Data:** Real-time CPU, GPU, and RAM usage.
*   **Animation:** Segments light up based on load.

### Nexus Mascot (The Silent Admin)
*   **Visual:** Pixel-art SVG entity.
    *   *Core:* Bioluminescent heart (`#00F2FF`).
    *   *Shell:* Rotating geometric segments.
*   **Behavior:**
    *   "Pulses" with system activity.
    *   Rotates slightly (5-15 degrees) toward the user's cursor.
    *   Never interrupts; always observes.

## 4. Typography
*   **Headers/Data Labels:** `VT323` (Retro Terminal) or `Press Start 2P`.
*   **Data/Code/Logs:** `JetBrains Mono` (The standard for technical legibility).
*   **UI Text:** `Inter` (Variable) for general readability where monospace is too harsh.

## 5. Visual Effects
*   **CRT Scanlines:** Global 5% opacity overlay.
*   **Pixelated Edges:** `image-rendering: pixelated` for icons and the Mascot.
*   **Glow:** Text shadows and border glows instead of drop shadows.
