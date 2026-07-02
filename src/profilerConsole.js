/**
 * Performance profiling utilities for browser console
 * Run in DevTools console to profile performance
 *
 * Systems: physics, logic, total, rendering (via window.profile.gpu())
 */

import { profiler, setupGPUProfiler } from './performanceProfiler';

window.profile = {
  // Start profiling
  start: () => {
    profiler.enable();
    console.log('🟢 Profiler started — play a game, extract blocks');
  },

  // Stop and print report
  stop: () => {
    profiler.disable();
    console.log(profiler.report());
  },

  // Print current stats
  report: () => {
    console.log(profiler.report());
  },

  // Reset metrics
  reset: () => {
    profiler.reset();
    console.log('🔄 Profiler reset');
  },

  // Get individual system stats
  stats: (system = 'total') => {
    const stats = profiler.getStats(system);
    if (!stats) return `No data for "${system}"`;
    return `${system}: avg=${stats.avg.toFixed(2)}ms, max=${stats.max.toFixed(2)}ms, p95=${stats.p95.toFixed(2)}ms (${stats.samples} samples)`;
  },

  // GPU rendering stats (call after a render cycle)
  gpu: null, // Set by setupGPUProfiler(renderer)
};

console.log('ℹ️ Profiler: window.profile.start(), .stop(), .report(), .stats("physics"), .gpu("drawCalls"|etc)');

// Expose setupGPUProfiler so GameScene can wire it up
export function initGPUProfiler(renderer) {
  const gpuStats = setupGPUProfiler(renderer);
  window.profile.gpu = gpuStats;
  console.log('ℹ️ GPU profiler wired — window.profile.gpu.drawCalls() etc available');
  return gpuStats;
}
