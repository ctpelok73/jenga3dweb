import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockSettingsState = {
  volume: 70,
  moveTimer: 0,
  difficulty: 'normal',
  theme: 'classic',
  environment: 'classic',
};

vi.mock('../settingsTracker', () => ({
  getSettings: vi.fn(() => ({ ...mockSettingsState })),
  updateAllSettings: vi.fn(),
  resetSettings: vi.fn(() => ({
    volume: 70,
    moveTimer: 0,
    difficulty: 'normal',
    theme: 'classic',
    environment: 'classic',
  })),
}));

vi.mock('../soundEngine', () => ({
  updateMasterVolume: vi.fn(),
}));

vi.mock('../blockTextureCache', () => ({
  clearTextureCache: vi.fn(),
}));

vi.mock('../purchaseService', () => ({
  getAvailableSkins: vi.fn(() => ['classic', 'neon']),
  getAvailableEnvThemes: vi.fn(() => ['classic', 'space']),
}));

vi.mock('../hooks/useModalA11y', () => ({
  useModalA11y: vi.fn(() => ({ current: document.createElement('div') })),
  default: vi.fn(() => ({ current: document.createElement('div') })),
}));

import SettingsPanel from '../screens/SettingsPanel';
import * as settingsTracker from '../settingsTracker';
import * as soundEngine from '../soundEngine';
import * as blockTextureCache from '../blockTextureCache';
import * as purchaseService from '../purchaseService';

// ─── Helpers ──────────────────────────────────────────────────────────────

function renderPanel(props = {}) {
  return render(
    <SettingsPanel
      onClose={vi.fn()}
      onSettingsChange={vi.fn()}
      {...props}
    />,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('SettingsPanel', () => {
  beforeEach(() => {
    mockSettingsState.volume = 70;
    mockSettingsState.moveTimer = 0;
    mockSettingsState.difficulty = 'normal';
    mockSettingsState.theme = 'classic';
    mockSettingsState.environment = 'classic';
  });

  // ─── Basic rendering ────────────────────────────────────────────────

  describe('basic rendering', () => {
    it('renders dialog with aria-label', () => {
      renderPanel();
      expect(screen.getByRole('dialog', { name: 'Настройки' })).toBeInTheDocument();
    });

    it('renders title', () => {
      renderPanel();
      expect(screen.getByText('⚙️ Настройки')).toBeInTheDocument();
    });

    it('renders close button', () => {
      renderPanel();
      expect(screen.getByRole('button', { name: 'Закрыть настройки' })).toBeInTheDocument();
    });

    it('renders all section labels', () => {
      renderPanel();
      expect(screen.getByText(/Громкость/)).toBeInTheDocument();
      expect(screen.getByText('⏱️ Таймер хода')).toBeInTheDocument();
      expect(screen.getByText('📐 Сложность')).toBeInTheDocument();
      expect(screen.getByText('🎨 Тема блоков')).toBeInTheDocument();
      expect(screen.getByText('🌍 Окружение')).toBeInTheDocument();
    });

    it('renders reset and done buttons', () => {
      renderPanel();
      expect(screen.getByText('Сбросить')).toBeInTheDocument();
      expect(screen.getByText('Готово')).toBeInTheDocument();
    });
  });

  // ─── Volume ─────────────────────────────────────────────────────────

  describe('volume', () => {
    it('displays current volume percentage', () => {
      renderPanel();
      expect(screen.getByText('🔊 Громкость: 70%')).toBeInTheDocument();
    });

    it('renders range input with correct attributes', () => {
      renderPanel();
      const input = screen.getByLabelText('Громкость');
      expect(input).toHaveAttribute('type', 'range');
      expect(input).toHaveAttribute('min', '0');
      expect(input).toHaveAttribute('max', '100');
      expect(input).toHaveValue('70');
    });

    it('updates volume and calls onSettingsChange', () => {
      const onSettingsChange = vi.fn();
      renderPanel({ onSettingsChange });
      const input = screen.getByLabelText('Громкость');

      fireEvent.change(input, { target: { value: '25' } });

      expect(onSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({ volume: 25 }),
      );
    });

    it('calls updateMasterVolume when volume changes', () => {
      renderPanel();
      const input = screen.getByLabelText('Громкость');

      fireEvent.change(input, { target: { value: '50' } });

      expect(soundEngine.updateMasterVolume).toHaveBeenCalled();
    });

    it('calls updateAllSettings when volume changes', () => {
      renderPanel();
      const input = screen.getByLabelText('Громкость');

      fireEvent.change(input, { target: { value: '80' } });

      expect(settingsTracker.updateAllSettings).toHaveBeenCalledWith(
        expect.objectContaining({ volume: 80 }),
      );
    });
  });

  // ─── Timer options ─────────────────────────────────────────────────

  describe('timer options', () => {
    it('renders all timer options', () => {
      renderPanel();
      expect(screen.getByText('Выкл')).toBeInTheDocument();
      expect(screen.getByText('15 сек')).toBeInTheDocument();
      expect(screen.getByText('30 сек')).toBeInTheDocument();
      expect(screen.getByText('60 сек')).toBeInTheDocument();
    });

    it('marks current moveTimer as active', () => {
      renderPanel();
      const offBtn = screen.getByText('Выкл').closest('button');
      expect(offBtn.className).toContain('is-active');
    });

    it('does not mark other timer options as active', () => {
      renderPanel();
      expect(screen.getByText('15 сек').closest('button').className).not.toContain('is-active');
      expect(screen.getByText('30 сек').closest('button').className).not.toContain('is-active');
      expect(screen.getByText('60 сек').closest('button').className).not.toContain('is-active');
    });

    it('calls updateAllSettings when timer option is clicked', () => {
      renderPanel();
      fireEvent.click(screen.getByText('30 сек'));
      expect(settingsTracker.updateAllSettings).toHaveBeenCalledWith(
        expect.objectContaining({ moveTimer: 30 }),
      );
    });

    it('calls onSettingsChange when timer option is clicked', () => {
      const onSettingsChange = vi.fn();
      renderPanel({ onSettingsChange });
      fireEvent.click(screen.getByText('60 сек'));
      expect(onSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({ moveTimer: 60 }),
      );
    });
  });

  // ─── Difficulty ────────────────────────────────────────────────────

  describe('difficulty options', () => {
    it('renders all difficulty options', () => {
      renderPanel();
      expect(screen.getByText('🟢 Лёгкий')).toBeInTheDocument();
      expect(screen.getByText('🟡 Обычный')).toBeInTheDocument();
      expect(screen.getByText('🔴 Сложный')).toBeInTheDocument();
    });

    it('marks default difficulty as active', () => {
      renderPanel();
      expect(screen.getByText('🟡 Обычный').closest('button').className).toContain('is-active');
    });

    it('calls updateAllSettings when difficulty is clicked', () => {
      renderPanel();
      fireEvent.click(screen.getByText('🔴 Сложный'));
      expect(settingsTracker.updateAllSettings).toHaveBeenCalledWith(
        expect.objectContaining({ difficulty: 'hard' }),
      );
    });
  });

  // ─── Theme options (locked/unlocked) ───────────────────────────────

  describe('theme options', () => {
    it('renders all theme options', () => {
      const { container } = renderPanel();
      // Theme buttons are inside .j-settings-section elements — find them globally
      expect(container.textContent).toContain('🪵 Классика');
      expect(container.textContent).toContain('💜 Неон');
      expect(container.textContent).toContain('🤍 Мрамор');
      expect(container.textContent).toContain('🧊 Лёд');
      expect(container.textContent).toContain('🎋 Бамбук');
      expect(container.textContent).toContain('🍬 Конфеты');
    });

    it('marks unlocked themes as available (includes classic, not locked)', () => {
      renderPanel();
      const allClassic = screen.getAllByText('🪵 Классика');
      const classicBtn = allClassic[0].closest('button');
      expect(classicBtn.className).not.toContain('locked');
      expect(classicBtn).not.toHaveAttribute('aria-disabled', 'true');
    });

    it('marks locked themes with aria-disabled and lock class', () => {
      renderPanel();
      const marbleBtn = screen.getByText('🤍 Мрамор').closest('button');
      expect(marbleBtn.className).toContain('locked');
      expect(marbleBtn).toHaveAttribute('aria-disabled', 'true');
    });

    it('shows premium label for locked themes', () => {
      renderPanel();
      const marbleBtn = screen.getByText('🤍 Мрамор').closest('button');
      expect(marbleBtn).toHaveAttribute(
        'aria-label',
        expect.stringContaining('премиум'),
      );
      expect(marbleBtn).toHaveAttribute(
        'title',
        expect.stringContaining('Премиум'),
      );
    });

    it('calls handleChange and clearTextureCache when unlocked theme is clicked', () => {
      renderPanel();
      fireEvent.click(screen.getByText('💜 Неон'));
      expect(settingsTracker.updateAllSettings).toHaveBeenCalledWith(
        expect.objectContaining({ theme: 'neon' }),
      );
      expect(blockTextureCache.clearTextureCache).toHaveBeenCalled();
    });

    it('does nothing when locked theme is clicked', () => {
      renderPanel();
      fireEvent.click(screen.getByText('🤍 Мрамор'));
      expect(settingsTracker.updateAllSettings).not.toHaveBeenCalledWith(
        expect.objectContaining({ theme: 'marble' }),
      );
    });

    it('activates the current theme', () => {
      renderPanel();
      const allClassic = screen.getAllByText('🪵 Классика');
      const classicBtn = allClassic[0].closest('button');
      expect(classicBtn.className).toContain('is-active');
    });
  });

  // ─── Environment options ───────────────────────────────────────────

  describe('environment options', () => {
    it('renders all environment options', () => {
      const { container } = renderPanel();
      expect(container.textContent).toContain('🪵 Классика');
      expect(container.textContent).toContain('🌌 Космос');
      expect(container.textContent).toContain('🏖️ Пляж');
      expect(container.textContent).toContain('📚 Библиотека');
    });

    it('marks unlocked environments (classic, space)', () => {
      renderPanel();
      // Classic appears twice (themes + env). Env section buttons are after theme buttons
      const allClassic = screen.getAllByText('🪵 Классика');
      const envClassicBtn = allClassic[1].closest('button');
      const spaceBtn = screen.getByText('🌌 Космос').closest('button');
      expect(envClassicBtn).not.toHaveAttribute('aria-disabled', 'true');
      expect(spaceBtn).not.toHaveAttribute('aria-disabled', 'true');
    });

    it('marks locked environments (beach, library)', () => {
      renderPanel();
      const beachBtn = screen.getByText('🏖️ Пляж').closest('button');
      const libBtn = screen.getByText('📚 Библиотека').closest('button');
      expect(beachBtn).toHaveAttribute('aria-disabled', 'true');
      expect(libBtn).toHaveAttribute('aria-disabled', 'true');
    });

    it('calls handleChange when unlocked environment is clicked', () => {
      renderPanel();
      fireEvent.click(screen.getByText('🌌 Космос'));
      expect(settingsTracker.updateAllSettings).toHaveBeenCalledWith(
        expect.objectContaining({ environment: 'space' }),
      );
    });

    it('does nothing when locked environment is clicked', () => {
      renderPanel();
      fireEvent.click(screen.getByText('🏖️ Пляж'));
      expect(settingsTracker.updateAllSettings).not.toHaveBeenCalledWith(
        expect.objectContaining({ environment: 'beach' }),
      );
    });
  });

  // ─── Reset ─────────────────────────────────────────────────────────

  describe('reset', () => {
    it('calls resetSettings when reset button is clicked', () => {
      renderPanel();
      fireEvent.click(screen.getByText('Сбросить'));
      expect(settingsTracker.resetSettings).toHaveBeenCalled();
    });

    it('calls updateMasterVolume when reset is clicked', () => {
      renderPanel();
      fireEvent.click(screen.getByText('Сбросить'));
      expect(soundEngine.updateMasterVolume).toHaveBeenCalled();
    });

    it('calls onSettingsChange with defaults when reset is clicked', () => {
      const onSettingsChange = vi.fn();
      renderPanel({ onSettingsChange });
      fireEvent.click(screen.getByText('Сбросить'));
      expect(onSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          volume: 70,
          moveTimer: 0,
          difficulty: 'normal',
          theme: 'classic',
          environment: 'classic',
        }),
      );
    });

    it('updates displayed volume after reset', () => {
      renderPanel();
      // Change volume first
      const input = screen.getByLabelText('Громкость');
      fireEvent.change(input, { target: { value: '30' } });

      // Reset
      fireEvent.click(screen.getByText('Сбросить'));

      // Volume should show default 70% after reset
      expect(screen.getByText(/Громкость: 70%/)).toBeInTheDocument();
    });
  });

  // ─── Close ─────────────────────────────────────────────────────────

  describe('close', () => {
    it('calls onClose when close button is clicked', () => {
      const onClose = vi.fn();
      renderPanel({ onClose });
      fireEvent.click(screen.getByRole('button', { name: 'Закрыть настройки' }));
      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when done button is clicked', () => {
      const onClose = vi.fn();
      renderPanel({ onClose });
      fireEvent.click(screen.getByText('Готово'));
      expect(onClose).toHaveBeenCalled();
    });
  });

  // ─── onSettingsChange callbacks ────────────────────────────────────

  describe('onSettingsChange', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('is called for each settings change', () => {
      const onSettingsChange = vi.fn();
      renderPanel({ onSettingsChange });

      fireEvent.click(screen.getByText('🔴 Сложный'));
      expect(onSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({ difficulty: 'hard' }),
      );
    });

    it('is not required — renders without onSettingsChange', () => {
      expect(() => renderPanel({ onSettingsChange: undefined })).not.toThrow();
    });

    it('does not call clearTextureCache when changing difficulty (only theme)', () => {
      renderPanel();
      fireEvent.click(screen.getByText('🔴 Сложный'));
      expect(blockTextureCache.clearTextureCache).not.toHaveBeenCalled();
    });

    it('does not call clearTextureCache when changing timer', () => {
      renderPanel();
      fireEvent.click(screen.getByText('30 сек'));
      expect(blockTextureCache.clearTextureCache).not.toHaveBeenCalled();
    });

    it('does not call clearTextureCache when changing environment', () => {
      renderPanel();
      fireEvent.click(screen.getByText('🌌 Космос'));
      expect(blockTextureCache.clearTextureCache).not.toHaveBeenCalled();
    });
  });

  // ─── Edge cases ────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles all themes locked except fallback', () => {
      purchaseService.getAvailableSkins.mockReturnValue([]);

      renderPanel();
      // All non-default themes should show locked state
      const neonBtn = screen.getByText('💜 Неон').closest('button');
      expect(neonBtn).toHaveAttribute('aria-disabled', 'true');
      const marbleBtn = screen.getByText('🤍 Мрамор').closest('button');
      expect(marbleBtn).toHaveAttribute('aria-disabled', 'true');
    });

    it('handles empty available skins without crashing', () => {
      purchaseService.getAvailableSkins.mockReturnValue([]);
      purchaseService.getAvailableEnvThemes.mockReturnValue([]);
      expect(() => renderPanel()).not.toThrow();
      expect(screen.getByText('🎨 Тема блоков')).toBeInTheDocument();
    });
  });
});
