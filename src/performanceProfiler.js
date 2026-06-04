/**
 * Performance profiler for Jenga 3D
 * Measures frame time across systems: physics, rendering, AI, logic
 */

class PerformanceProfiler {
  constructor() {
    this.marks = {};
    this.metrics = {
      physics: [],
      rendering: [],
      ai: [],
      logic: [],
      total: [],
    };
    this.enabled = false;
    this.maxSamples = 300; // 5 sec at 60fps
  }

  enable() {
    this.enabled = true;
    this.marks = {};
    Object.keys(this.metrics).forEach(key => {
      this.metrics[key] = [];
    });
  }

  disable() {
    this.enabled = false;
  }

  mark(label) {
    if (!this.enabled) return;
    this.marks[label] = performance.now();
  }

  measure(label, startLabel, system = 'logic') {
    if (!this.enabled) return 0;

    const start = this.marks[startLabel];
    if (!start) return 0;

    const duration = performance.now() - start;
    if (this.metrics[system].length >= this.maxSamples) {
      this.metrics[system].shift();
    }
    this.metrics[system].push(duration);

    return duration;
  }

  getStats(system = 'total') {
    const data = this.metrics[system];
    if (data.length === 0) return null;

    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const p95 = data.sort((a, b) => a - b)[Math.floor(data.length * 0.95)];

    return { avg, max, min, p95, samples: data.length };
  }

  report() {
    if (!this.enabled) return '❌ Profiler not enabled';

    const systems = ['physics', 'rendering', 'ai', 'logic'];
    const results = [];

    results.push('📊 Performance Report (ms):');
    results.push('─'.repeat(50));

    systems.forEach(system => {
      const stats = this.getStats(system);
      if (stats) {
        results.push(
          `${system.padEnd(12)} avg: ${stats.avg.toFixed(2)} | max: ${stats.max.toFixed(2)} | p95: ${stats.p95.toFixed(2)}`
        );
      }
    });

    return results.join('\n');
  }

  reset() {
    Object.keys(this.metrics).forEach(key => {
      this.metrics[key] = [];
    });
    this.marks = {};
  }
}

export const profiler = new PerformanceProfiler();

// GPU profiler (via Three.js WebGLInfo)
export function setupGPUProfiler(renderer) {
  const info = renderer.info;
  const gpuStats = {
    drawCalls: () => info.render.calls,
    triangles: () => info.render.triangles,
    textures: () => info.memory.textures,
    geometries: () => info.memory.geometries,
  };
  return gpuStats;
}

// Frame time hook for React Three Fiber
export function useFrameProfiler(name, system = 'logic') {
  return (state) => {
    profiler.mark(`${name}_start`);
    // Actual work happens in component
    const duration = profiler.measure(name, `${name}_start`, system);
    return duration;
  };
}
