/**
 * Drag-and-Drop Controller для Jenga 3D
 * Обрабатывает mouse и touch события для перетаскивания блоков
 */

export class DragAndDropController {
  constructor(canvas) {
    this.canvas = canvas;
    this.isDragging = false;
    this.draggedBlockId = null;
    this.dragStartPos = { x: 0, y: 0 };
    this.dragCurrentPos = { x: 0, y: 0 };
    this.dropSlotHovered = null;

    this.listeners = {
      onDragStart: null,
      onDrag: null,
      onDragEnd: null,
      onDropSlotEnter: null,
      onDropSlotLeave: null,
    };

    // Store bound handlers so we can remove them in destroy()
    this._boundHandlers = {
      mousedown: this.handleMouseDown.bind(this),
      mousemove: this.handleMouseMove.bind(this),
      mouseup: this.handleMouseUp.bind(this),
      mouseleave: this.handleMouseLeave.bind(this),
      touchstart: this.handleTouchStart.bind(this),
      touchmove: this.handleTouchMove.bind(this),
      touchend: this.handleTouchEnd.bind(this),
    };

    this.init();
  }

  init() {
    // Mouse события
    this.canvas.addEventListener('mousedown', this._boundHandlers.mousedown);
    this.canvas.addEventListener('mousemove', this._boundHandlers.mousemove);
    this.canvas.addEventListener('mouseup', this._boundHandlers.mouseup);
    this.canvas.addEventListener('mouseleave', this._boundHandlers.mouseleave);

    // Touch события
    this.canvas.addEventListener('touchstart', this._boundHandlers.touchstart, { passive: false });
    this.canvas.addEventListener('touchmove', this._boundHandlers.touchmove, { passive: false });
    this.canvas.addEventListener('touchend', this._boundHandlers.touchend, { passive: false });
  }

  /**
   * Регистрирует слушателя для drag-drop событий
   */
  on(event, callback) {
    if (this.listeners.hasOwnProperty(`on${event.charAt(0).toUpperCase() + event.slice(1)}`)) {
      this.listeners[`on${event.charAt(0).toUpperCase() + event.slice(1)}`] = callback;
    }
  }

  /**
   * Запускает drag по выбранному блоку
   */
  startDrag(blockId) {
    this.isDragging = true;
    this.draggedBlockId = blockId;
    if (this.listeners.onDragStart) {
      this.listeners.onDragStart({ blockId });
    }
  }

  /**
   * Проверяет, находится ли позиция над drop-слотом (по Y координате)
   */
  checkDropSlot(mouseX, mouseY) {
    // Drop slots находятся в верхней части сцены
    // Простая эвристика: если мышь в верхней части экрана и не слишком далеко по X
    const canvasRect = this.canvas.getBoundingClientRect();
    const relX = (mouseX - canvasRect.left) / canvasRect.width;
    const relY = (mouseY - canvasRect.top) / canvasRect.height;

    // Если в верхней трети и примерно по центру - над drop-слотом
    if (relY < 0.35 && relX > 0.3 && relX < 0.7) {
      return 0; // Простой слот (в реальности нужна raycasting)
    }
    return null;
  }

  handleMouseDown(e) {
    if (e.button !== 0) return; // Только левая кнопка
    // Этот обработчик будет переопределён логикой выбора блока в 3D сцене
  }

  handleMouseMove(e) {
    this.dragCurrentPos = { x: e.clientX, y: e.clientY };

    if (this.isDragging && this.listeners.onDrag) {
      this.listeners.onDrag({
        blockId: this.draggedBlockId,
        x: e.clientX,
        y: e.clientY,
        deltaX: e.clientX - this.dragStartPos.x,
        deltaY: e.clientY - this.dragStartPos.y,
      });
    }
  }

  handleMouseUp(e) {
    if (this.isDragging) {
      if (this.listeners.onDragEnd) {
        this.listeners.onDragEnd({
          blockId: this.draggedBlockId,
          x: e.clientX,
          y: e.clientY,
          dropSlot: this.dropSlotHovered,
        });
      }
      this.isDragging = false;
      this.draggedBlockId = null;
      this.dropSlotHovered = null;
    }
  }

  handleMouseLeave(e) {
    if (this.isDragging) {
      this.handleMouseUp(e);
    }
  }

  handleTouchStart(e) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.dragStartPos = { x: touch.clientX, y: touch.clientY };
      // Вызывается из 3D обработчика click
      e.preventDefault();
    }
  }

  handleTouchMove(e) {
    if (e.touches.length === 1 && this.isDragging) {
      const touch = e.touches[0];
      this.dragCurrentPos = { x: touch.clientX, y: touch.clientY };

      if (this.listeners.onDrag) {
        this.listeners.onDrag({
          blockId: this.draggedBlockId,
          x: touch.clientX,
          y: touch.clientY,
          deltaX: touch.clientX - this.dragStartPos.x,
          deltaY: touch.clientY - this.dragStartPos.y,
        });
      }
      e.preventDefault();
    }
  }

  handleTouchEnd(e) {
    if (this.isDragging) {
      const touch = e.changedTouches[0];
      if (this.listeners.onDragEnd) {
        this.listeners.onDragEnd({
          blockId: this.draggedBlockId,
          x: touch.clientX,
          y: touch.clientY,
          dropSlot: this.dropSlotHovered,
        });
      }
      this.isDragging = false;
      this.draggedBlockId = null;
      this.dropSlotHovered = null;
      e.preventDefault();
    }
  }

  /**
   * Уведомление о входе в drop-slot
   */
  enterDropSlot(slotIndex) {
    this.dropSlotHovered = slotIndex;
    if (this.listeners.onDropSlotEnter) {
      this.listeners.onDropSlotEnter({ slotIndex });
    }
  }

  /**
   * Уведомление о выходе из drop-slot
   */
  leaveDropSlot() {
    this.dropSlotHovered = null;
    if (this.listeners.onDropSlotLeave) {
      this.listeners.onDropSlotLeave();
    }
  }

  /**
   * Очистка обработчиков (перед удалением компонента)
   */
  destroy() {
    this.canvas.removeEventListener('mousedown', this._boundHandlers.mousedown);
    this.canvas.removeEventListener('mousemove', this._boundHandlers.mousemove);
    this.canvas.removeEventListener('mouseup', this._boundHandlers.mouseup);
    this.canvas.removeEventListener('mouseleave', this._boundHandlers.mouseleave);
    this.canvas.removeEventListener('touchstart', this._boundHandlers.touchstart);
    this.canvas.removeEventListener('touchmove', this._boundHandlers.touchmove);
    this.canvas.removeEventListener('touchend', this._boundHandlers.touchend);
  }
}
