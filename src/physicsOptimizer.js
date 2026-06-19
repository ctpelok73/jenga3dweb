/**
 * physicsOptimizer.js — Оптимизация производительности Rapier physics
 *
 * Стратегии:
 *   1. Adaptive frame rate — снижаем частоту обновлений при большом числе
 *      динамических блоков и переходим на 30fps когда активной симуляции нет.
 *   2. Velocity threshold — адаптивный порог скорости и таймаут стабилизации
 *      в зависимости от количества активных блоков.
 *
 * Camera-position LOD-менеджер сохранён для совместимости (камеру обновляем
 * на каждом кадре), но per-block LOD/collision cache были удалены — за всё
 * время не использовались в runtime.
 */

/**
 * Adaptive frame rate controller
 * Снижает частоту physics updates с 60fps до 30fps когда нет активной симуляции
 */
export class AdaptiveFrameRateController {
  constructor() {
    this.isSimulating = false;
    this.frameCount = 0;
    this.skipFrames = 0; // 0 = 60fps, 1 = 30fps, 2 = 20fps
  }

  setSimulating(isSimulating, dynamicBlockCount = 0) {
    this.isSimulating = isSimulating;
    this.frameCount = 0;
    if (isSimulating) {
      if (dynamicBlockCount > 15) {
        this.skipFrames = 2;
      } else if (dynamicBlockCount > 8) {
        this.skipFrames = 1;
      } else {
        this.skipFrames = 0;
      }
    } else {
      this.skipFrames = 1;
    }
  }

  shouldUpdatePhysics() {
    if (this.skipFrames === 0) return true;
    const shouldUpdate = this.frameCount % (this.skipFrames + 1) === 0;
    this.frameCount++;
    return shouldUpdate;
  }

  getFrameRate() {
    return this.skipFrames === 0 ? 60 : Math.round(60 / (this.skipFrames + 1));
  }
}

/**
 * Velocity threshold optimizer
 * Адаптивно меняет threshold в зависимости от количества динамических блоков
 */
export class VelocityThresholdOptimizer {
  constructor() {
    this.baseThreshold = 0.08;
    this.maxThreshold = 0.15;
  }

  getThreshold(dynamicBlockCount) {
    const factor = Math.min(dynamicBlockCount / 10, 1);
    return this.baseThreshold + (this.maxThreshold - this.baseThreshold) * factor;
  }

  getTimeout(dynamicBlockCount) {
    const baseTimeout = 8000;
    const factor = Math.min(dynamicBlockCount / 20, 1);
    return baseTimeout + 4000 * factor;
  }
}

/**
 * Главный оптимизатор физики — фасад над AdaptiveFrameRate + VelocityThreshold.
 */
export class PhysicsOptimizer {
  constructor() {
    this.frameRateController = new AdaptiveFrameRateController();
    this.velocityOptimizer = new VelocityThresholdOptimizer();
    this.cameraPosition = [0, 5, 8];
  }

  updateSimulationState(isSimulating, dynamicBlockCount = 0) {
    this.frameRateController.setSimulating(isSimulating, dynamicBlockCount);
  }

  updateCameraPosition(position) {
    this.cameraPosition = position;
  }

  getFrameParams(dynamicBlockCount = 0) {
    return {
      shouldUpdatePhysics: this.frameRateController.shouldUpdatePhysics(),
      frameRate: this.frameRateController.getFrameRate(),
      velocityThreshold: this.velocityOptimizer.getThreshold(dynamicBlockCount),
      timeout: this.velocityOptimizer.getTimeout(dynamicBlockCount),
    };
  }
}

// Singleton instance
export const physicsOptimizer = new PhysicsOptimizer();
