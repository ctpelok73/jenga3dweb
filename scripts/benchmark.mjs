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
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  console.log('🎮 Starting benchmark...');
  console.log(`📍 Target: ${GAME_URL}`);
  console.log(`⏱️  Duration: ${BENCHMARK_DURATION / 1000}s\n`);

  // ── Load page ──────────────────────────────────────────────────
  await page.goto(GAME_URL, { waitUntil: 'networkidle2', timeout: 30000 });

  // Wait for profiler to be ready
  await page.waitForFunction(() => window.profile, { timeout: 10000 });
  console.log('✅ Profiler available');

  // ── Start the game by clicking the play button ─────────────────
  console.log('▶️ Starting game...');
  await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      const t = btn.textContent.toLowerCase();
      if (t.includes('играть') || t.includes('solo') || t.includes('start') || t.includes('игру')) {
        btn.click();
        return;
      }
    }
    // Fallback: click first button
    if (buttons.length > 0) buttons[0].click();
  });

  // Wait for 3D scene + physics to load
  await new Promise(resolve => setTimeout(resolve, 5000));
  console.log('✅ Game started, 3D scene loaded');

  // ── Start profiling ────────────────────────────────────────────
  await page.evaluate(() => {
    window.profile.reset();
    window.profile.start();
  });
  console.log('▶️ Profiler started');

  // Simulate gameplay: wait for benchmark duration
  await new Promise(resolve => setTimeout(resolve, BENCHMARK_DURATION));

  // ── Stop and collect report ────────────────────────────────────
  const report = await page.evaluate(() => {
    window.profile.stop();
    const results = {};
    ['total', 'physics', 'rendering', 'logic', 'ai'].forEach(sys => {
      results[sys] = window.profile.stats(sys);
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

  // ── Collect GPU stats ──────────────────────────────────────────
  const gpu = await page.evaluate(() => {
    if (window.profile.gpu) {
      return {
        drawCalls: window.profile.gpu.drawCalls(),
        triangles: window.profile.gpu.triangles(),
        textures: window.profile.gpu.textures(),
        geometries: window.profile.gpu.geometries(),
      };
    }
    return null;
  });

  if (gpu) {
    console.log('🖥️ GPU Stats:');
    console.log(`  Draw calls:  ${gpu.drawCalls}`);
    console.log(`  Triangles:   ${gpu.triangles}`);
    console.log(`  Textures:    ${gpu.textures}`);
    console.log(`  Geometries:  ${gpu.geometries}`);
    console.log('');
  }

  // ── Check for performance issues ───────────────────────────────
  // Parse the string output from window.profile.stats() to extract avg/max
  const parseStats = (str) => {
    if (!str || str.startsWith('No data')) return null;
    const avg = parseFloat(str.match(/avg=([\d.]+)/)?.[1] || 0);
    const max = parseFloat(str.match(/max=([\d.]+)/)?.[1] || 0);
    return { avg, max };
  };

  const totalStats = parseStats(report.total);
  const physicsStats = parseStats(report.physics);
  const renderingStats = parseStats(report.rendering);

  let issues = [];

  if (totalStats) {
    if (totalStats.avg > 16.67) issues.push('⚠️  Total frame time exceeds 16.67ms budget');
    if (totalStats.max > 33.33) issues.push('⚠️  Frame drops detected (>2x budget)');
  } else {
    issues.push('ℹ️  No frame timing data — no physics simulation occurred during profiling');
  }

  if (physicsStats && physicsStats.avg > 3) {
    issues.push('⚠️  Physics time exceeds 3ms budget');
  }

  if (renderingStats && renderingStats.avg > 5) {
    issues.push('⚠️  Rendering time exceeds 5ms budget');
  }

  if (gpu && gpu.drawCalls > 100) {
    issues.push(`⚠️  High draw call count: ${gpu.drawCalls} (target <50)`);
  }

  if (issues.length > 0) {
    console.log('🔴 ISSUES DETECTED:');
    issues.forEach(i => console.log('  ' + i));
  } else {
    console.log('✅ Performance within budget!');
  }

  await browser.close();
  console.log('\n🏁 Benchmark complete.');
}

benchmark().catch(e => { console.error('❌ Benchmark failed:', e.message); process.exit(1); });
