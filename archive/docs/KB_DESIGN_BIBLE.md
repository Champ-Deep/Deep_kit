# KB: THE DEEPKIT DESIGN BIBLE (ARSENAL EDITION)

## 1. The Visual Philosophy: "Tactical Monochrome"
DeepKit isn't a website; it’s an OS for your hardware. It evokes the feeling of a high-end 80s arcade cabinet repurposed for elite AI terminal work.

### Color Spectrum (Phosphor Spectrum)
- **Deep Core (Background):** `#000000` (Pure, solid black. No gradients).
- **Primary Data (Cyber Teal):** `#00F2FF`. Used for "The Arsenal" headers, navigation, and active system nodes.
- **AI/Intel (Phosphor Green):** `#39FF14`. Used for LLM outputs (Ollama), status-healthy icons, and terminal font.
- **The Vault (Bright Amber):** `#FFB000`. Used for databases, storage, archives, and warnings.
- **Stealth Mode (Ghost Mono):** `#A0A0A0`. Used for low-density background text and metadata.

## 2. Global Aesthetics & UI Tokens
- **CRT Scanlines:** Global 3-5% opacity linear-gradient overlay. No exceptions.
- **The Glow (Bloom):** Text and borders must have "phosphor burn." Use `text-shadow: 0 0 10px var(--dk-color);` and `box-shadow: 0 0 15px var(--dk-color-dim);`.
- **Hard Edges:** `border-radius: 0px !important;`. DeepKit is mechanical and industrial.
- **Typography:**
    - **Data/Labels:** `JetBrains Mono` (The King of Legibility).
    - **Headers/Display:** `VT323` or `Press Start 2P`.
    - **Language:** Uppercase for system labels (e.g., `RECLAIM YOUR COMPUTE CYCLE`, `SYSTEM_READY`).

## 3. The "DeepCard" Widget System
Every tool in the Hub is a **DeepCard**. A DeepCard is an interactive 1px-bordered box that serves as a mini-dashboard for that tool.
- **Header:** Title on the left, `PORT: XXXX` on the right.
- **Body:** Glanceable data widgets (System Pulse, Sparklines, Status Pills).
- **Interaction:** Cards use "Magnetic Snapping" (cubic-bezier easing) on hover and glow intensity increase.
- **Expanding UI:** Clicking a card should feel like "opening a bay" in a physical hangar.

## 4. Hardware Pulse (The Lifeline)
Every interface must feature the "Hardware Pulse." 
- **Style:** 10-segment vertical or horizontal equalizer bars.
- **Metrics:** CPU_LOAD, GPU_COMPUTE, MEM_ALLOC, DISK_I/O.
- **Visuals:** Segments light up in Teal or Green based on load intensity.

## 5. The Mascot: "The Silent Admin" (The Nexus)
- **Role:** The "Verified Local quality" seal.
- **Placement:** Circular frame in the `SYSTEM_INFO` sidebar.
- **Behavior:** Never speaks. Only pulses. Shifts color (Green for OK, Red for Error, Amber for Busy).
- **Vibe:** The chill, expert owner of the hardware.

---
**"Sovereignty is established through design consistency."**
