/**
 * Automated performance benchmark for Jenga 3D
 * Run this test to get baseline performance metrics
 *
 * Usage:
 *   node scripts/benchmark.mjs
 */

import puppeteer from 'puppeteer';

const GAME_URL = 'http://localhost:5173';
const BENCHMARK_DURATION = 15000; // 15 seconds of gameplay

async function benchmark() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  console.log('🎮 Starting benchmark...');
  console.log(`📍 Target: ${GAME_URL}`);
  console.log(`⏱️  Duration: ${BENCHMARK_DURATION / 1000}s\n`);

  // Set up profiler
  await page.goto(GAME_URL, { waitUntil: 'networkidle2' });

  // Wait for profiler to be ready
  await page.waitForFunction(() => window.profile, { timeout: 5000 });

  // Start profiling
  await page.evaluate(() => {
    window.profile.reset();
    window.profile.start();
  });

  console.log('▶️  Profiler started');

  // Simulate gameplay: wait for benchmark duration
  await new Promise(resolve => setTimeout(resolve, BENCHMARK_DURATION));

  // Stop and get report
  const report = await page.evaluate(() => {
    window.profile.stop();
    const systems = ['total', 'physics', 'rendering', 'logic', 'ai'];
    const results = {};
    systems.forEach(sys => {
      const stats = window.profile.stats(sys);
      results[sys] = stats;
    });
    return results;
  });

  console.log('\n' + '='.repeat(60));
  console.log('📊 BENCHMARK RESULTS');
  console.log('='.repeat(60));

  Object.entries(report).forEach(([system, stats]) => {
    console.log(stats);
  });

  console.log('='.repeat(60) + '\n');

  // Check for performance issues
  const stats = await page.evaluate(() => {
    return {
      total: window.profile.getStats('total'),
      physics: window.profile.getStats('physics'),
      rendering: window.profile.getStats('rendering'),
    };
  });

  let issues = [];
  if (stats.total.avg > 16.67) issues.push('⚠️  Total frame time exceeds 16.67ms budget');
  if (stats.physics.avg > 3) issues.push('⚠️  Physics time exceeds 3ms budget');
  if (stats.rendering.avg > 5) issues.push('⚠️  Rendering time exceeds 5ms budget');
  if (stats.total.max > 33.33) issues.push('⚠️  Frame drops detected (>2x budget)');

  if (issues.length > 0) {
    console.log('🔴 ISSUES DETECTED:');
    issues.forEach(i => console.log('  ' + i));
  } else {
    console.log('✅ Performance within budget!');
  }

  await browser.close();
}

benchmark().catch(console.error);
