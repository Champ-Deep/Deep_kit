/**
 * DEEPKIT Hardware Pulse Widget
 * "Your Personal AI. Locally Contained. Locally Empowered."
 *
 * A real-time system metrics widget with CRT terminal aesthetic.
 * Shows CPU_LOAD, GPU_COMPUTE, and MEM_ALLOC metrics.
 *
 * Usage:
 *   <div id="hardware-pulse"></div>
 *   <script src="hardware-pulse.js"></script>
 *   <script>
 *     DeepKitPulse.init('hardware-pulse');
 *   </script>
 *
 * Or with options:
 *   DeepKitPulse.init('hardware-pulse', {
 *     position: 'bottom-right', // 'bottom-right', 'bottom-left', 'top-right', 'top-left'
 *     compact: false,           // Compact mode
 *     updateInterval: 2000      // Update interval in ms
 *   });
 */

(function(global) {
  'use strict';

  // DeepKit Color Palette
  const COLORS = {
    green: '#39FF14',
    black: '#000000',
    gray: '#1A1A1A',
    amber: '#FFB000',
    greenDim: 'rgba(57, 255, 20, 0.3)',
    greenBright: 'rgba(57, 255, 20, 0.8)'
  };

  // CSS Styles
  const STYLES = `
    .dk-pulse-container {
      font-family: 'JetBrains Mono', 'Courier New', monospace;
      background: ${COLORS.black};
      border: 2px solid ${COLORS.green};
      padding: 12px;
      min-width: 200px;
      box-shadow: 0 0 20px rgba(57, 255, 20, 0.3);
      position: fixed;
      z-index: 99999;
    }

    .dk-pulse-container.bottom-right { bottom: 20px; right: 20px; }
    .dk-pulse-container.bottom-left { bottom: 20px; left: 20px; }
    .dk-pulse-container.top-right { top: 20px; right: 20px; }
    .dk-pulse-container.top-left { top: 20px; left: 20px; }
    .dk-pulse-container.embedded { position: relative; }

    .dk-pulse-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid ${COLORS.greenDim};
    }

    .dk-pulse-icon {
      width: 16px;
      height: 16px;
      color: ${COLORS.green};
    }

    .dk-pulse-title {
      font-size: 10px;
      color: ${COLORS.greenDim};
      text-transform: uppercase;
      letter-spacing: 2px;
    }

    .dk-pulse-indicator {
      width: 8px;
      height: 8px;
      background: ${COLORS.green};
      border-radius: 50%;
      margin-left: auto;
      animation: dk-pulse-blink 1s infinite;
    }

    @keyframes dk-pulse-blink {
      0%, 100% { opacity: 1; box-shadow: 0 0 10px ${COLORS.green}; }
      50% { opacity: 0.5; box-shadow: none; }
    }

    .dk-pulse-vitals {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .dk-pulse-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .dk-pulse-row-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .dk-pulse-label {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .dk-pulse-label-icon {
      width: 12px;
      height: 12px;
      color: ${COLORS.greenDim};
    }

    .dk-pulse-label-text {
      font-size: 9px;
      color: ${COLORS.greenDim};
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .dk-pulse-value {
      font-size: 11px;
      color: ${COLORS.green};
      text-shadow: 0 0 10px rgba(57, 255, 20, 0.5);
    }

    .dk-pulse-bar-container {
      display: grid;
      grid-template-columns: repeat(20, 1fr);
      gap: 2px;
      height: 6px;
    }

    .dk-pulse-bar-segment {
      background: ${COLORS.gray};
      transition: background 0.15s ease;
    }

    .dk-pulse-bar-segment.active {
      background: ${COLORS.green};
      box-shadow: 0 0 4px ${COLORS.green};
    }

    .dk-pulse-bar-segment.warning {
      background: ${COLORS.amber};
      box-shadow: 0 0 4px ${COLORS.amber};
    }

    /* Compact mode */
    .dk-pulse-container.compact {
      padding: 8px;
      min-width: 160px;
    }

    .dk-pulse-container.compact .dk-pulse-header {
      margin-bottom: 8px;
      padding-bottom: 4px;
    }

    .dk-pulse-container.compact .dk-pulse-vitals {
      gap: 6px;
    }

    .dk-pulse-container.compact .dk-pulse-row {
      gap: 2px;
    }

    /* CRT Scanline Effect */
    .dk-pulse-container::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      background: repeating-linear-gradient(
        0deg,
        rgba(0, 0, 0, 0.15) 0px,
        rgba(0, 0, 0, 0.15) 1px,
        transparent 1px,
        transparent 2px
      );
      opacity: 0.1;
    }
  `;

  // SVG Icons
  const ICONS = {
    activity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"></polyline></svg>',
    cpu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>',
    gpu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"></polygon></svg>',
    memory: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21,12c0,1.66-4,3-9,3s-9-1.34-9-3"></path><path d="M3,5v14c0,1.66,4,3,9,3s9-1.34,9-3V5"></path></svg>'
  };

  // Hardware Pulse Class
  class HardwarePulse {
    constructor(containerId, options = {}) {
      this.container = document.getElementById(containerId);
      this.options = {
        position: options.position || 'embedded',
        compact: options.compact || false,
        updateInterval: options.updateInterval || 2000
      };

      this.vitals = {
        CPU_LOAD: 0,
        GPU_COMPUTE: 0,
        MEM_ALLOC: 0
      };

      this.init();
    }

    init() {
      // Inject styles
      if (!document.getElementById('dk-pulse-styles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'dk-pulse-styles';
        styleEl.textContent = STYLES;
        document.head.appendChild(styleEl);
      }

      // Build HTML
      this.render();

      // Start updates
      this.startUpdates();
    }

    render() {
      const posClass = this.options.position;
      const compactClass = this.options.compact ? 'compact' : '';

      this.container.innerHTML = `
        <div class="dk-pulse-container ${posClass} ${compactClass}">
          <div class="dk-pulse-header">
            <span class="dk-pulse-icon">${ICONS.activity}</span>
            <span class="dk-pulse-title">HARDWARE_PULSE</span>
            <span class="dk-pulse-indicator"></span>
          </div>
          <div class="dk-pulse-vitals">
            ${this.renderVitalRow('CPU_LOAD', ICONS.cpu)}
            ${this.renderVitalRow('GPU_COMPUTE', ICONS.gpu)}
            ${this.renderVitalRow('MEM_ALLOC', ICONS.memory)}
          </div>
        </div>
      `;
    }

    renderVitalRow(name, icon) {
      return `
        <div class="dk-pulse-row" data-vital="${name}">
          <div class="dk-pulse-row-header">
            <div class="dk-pulse-label">
              <span class="dk-pulse-label-icon">${icon}</span>
              <span class="dk-pulse-label-text">${name}</span>
            </div>
            <span class="dk-pulse-value">0%</span>
          </div>
          <div class="dk-pulse-bar-container">
            ${Array(20).fill(0).map(() => '<div class="dk-pulse-bar-segment"></div>').join('')}
          </div>
        </div>
      `;
    }

    updateVital(name, value) {
      const row = this.container.querySelector(`[data-vital="${name}"]`);
      if (!row) return;

      // Update value display
      const valueEl = row.querySelector('.dk-pulse-value');
      valueEl.textContent = `${value}%`;

      // Update bar segments
      const segments = row.querySelectorAll('.dk-pulse-bar-segment');
      const activeCount = Math.round((value / 100) * 20);

      segments.forEach((seg, idx) => {
        seg.classList.remove('active', 'warning');
        if (idx < activeCount) {
          seg.classList.add('active');
          // Warning color for high values
          if (value > 80 && idx >= 16) {
            seg.classList.add('warning');
          }
        }
      });
    }

    startUpdates() {
      // Simulate metrics (in production, replace with actual system metrics)
      const update = () => {
        this.vitals = {
          CPU_LOAD: Math.floor(Math.random() * 15) + 35,
          GPU_COMPUTE: Math.floor(Math.random() * 10) + 12,
          MEM_ALLOC: Math.floor(Math.random() * 5) + 62
        };

        Object.entries(this.vitals).forEach(([name, value]) => {
          this.updateVital(name, value);
        });
      };

      // Initial update
      update();

      // Periodic updates
      this.intervalId = setInterval(update, this.options.updateInterval);
    }

    stop() {
      if (this.intervalId) {
        clearInterval(this.intervalId);
      }
    }

    // Set actual metrics from external source
    setMetrics(metrics) {
      if (metrics.cpu !== undefined) this.updateVital('CPU_LOAD', metrics.cpu);
      if (metrics.gpu !== undefined) this.updateVital('GPU_COMPUTE', metrics.gpu);
      if (metrics.memory !== undefined) this.updateVital('MEM_ALLOC', metrics.memory);
    }
  }

  // Public API
  global.DeepKitPulse = {
    init: function(containerId, options) {
      return new HardwarePulse(containerId, options);
    }
  };

})(typeof window !== 'undefined' ? window : this);
