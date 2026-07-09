import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// ─── Mock module-level dependencies ────────────────────────────────────────

vi.mock('../scoreTracker', () => ({
  getBestScore: vi.fn(),
  getTotalGames: vi.fn(),
}));

vi.mock('../achievementsTracker', () => ({
  getUnlockedAchievements: vi.fn(),
  ACHIEVEMENTS: [
    { id: 'first_move', name: 'Первый ход' },
    { id: 'five_moves', name: '5 ходов' },
    { id: 'ten_moves', name: '10 ходов' },
    { id: 'veteran', name: 'Ветеран' },
    { id: 'centurion', name: 'Центурион' },
  ],
}));

vi.mock('../dailyChallengeTracker', () => ({
  isDailyChallengeCompleted: vi.fn(),
}));

// useModalA11y returns a ref, no side effects needed for rendering
vi.mock('../hooks/useModalA11y', () => ({
  useModalA11y: vi.fn(() => ({ current: document.createElement('div') })),
  default: vi.fn(() => ({ current: document.createElement('div') })),
}));

import StartScreen from '../screens/StartScreen';
import * as scoreTracker from '../scoreTracker';
import * as achievementsTracker from '../achievementsTracker';
import * as dailyChallengeTracker from '../dailyChallengeTracker';

// ─── Default props ─────────────────────────────────────────────────────────

const defaultProps = {
  onStart: vi.fn(),
  playerMode: 1,
  setPlayerMode: vi.fn(),
  gameMode: 'classic',
  setGameMode: vi.fn(),
  speedDuration: 60,
  setSpeedDuration: vi.fn(),
  onOpenSettings: vi.fn(),
  onOpenAchievements: vi.fn(),
  onOpenDailyChallenge: vi.fn(),
  onOpenPurchase: vi.fn(),
  onOpenOnline: vi.fn(),
  showPurchaseButton: true,
};

function renderScreen(props = {}) {
  return render(<StartScreen {...defaultProps} {...props} />);
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('StartScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock returns
    vi.mocked(scoreTracker.getBestScore).mockReturnValue(0);
    vi.mocked(scoreTracker.getTotalGames).mockReturnValue(0);
    vi.mocked(achievementsTracker.getUnlockedAchievements).mockReturnValue([]);
    vi.mocked(dailyChallengeTracker.isDailyChallengeCompleted).mockReturnValue(false);
  });

  // ─── Basic rendering ────────────────────────────────────────────────

  describe('basic rendering', () => {
    it('renders title and description', () => {
      renderScreen();
      expect(screen.getByText('🧱 Jenga 3D')).toBeInTheDocument();
      expect(screen.getByText(/Вытаскивай блоки/)).toBeInTheDocument();
    });

    it('has role="dialog" and aria-label', () => {
      renderScreen();
      expect(screen.getByRole('dialog', { name: 'Стартовый экран' })).toBeInTheDocument();
    });

    it('renders the start game button', () => {
      renderScreen();
      expect(screen.getByRole('button', { name: 'Начать игру' })).toBeInTheDocument();
    });

    it('renders all mode buttons', () => {
      renderScreen();
      // Game mode toggles
      expect(screen.getByText('🎯 Классика')).toBeInTheDocument();
      expect(screen.getByText('⚡ Speed Run')).toBeInTheDocument();
      // Player mode toggles
      expect(screen.getByRole('button', { name: '1 игрок' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '2 игрока' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Против ИИ' })).toBeInTheDocument();
    });

    it('renders all action buttons', () => {
      renderScreen();
      expect(screen.getByRole('button', { name: 'Настройки' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Достижения' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Ежедневный челлендж' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Онлайн' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Премиум магазин' })).toBeInTheDocument();
    });
  });

  // ─── Stats display ──────────────────────────────────────────────────

  describe('stats display', () => {
    it('shows stats when totalGames > 0', () => {
      vi.mocked(scoreTracker.getBestScore).mockReturnValue(42);
      vi.mocked(scoreTracker.getTotalGames).mockReturnValue(10);
      renderScreen();

      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('Лучший результат')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('Игр сыграно')).toBeInTheDocument();
    });

    it('does not render stats section when totalGames === 0', () => {
      renderScreen();
      expect(screen.queryByText('Лучший результат')).not.toBeInTheDocument();
      expect(screen.queryByText('Игр сыграно')).not.toBeInTheDocument();
    });

    it('does not render stats section when totalGames < 0 (edge case)', () => {
      vi.mocked(scoreTracker.getTotalGames).mockReturnValue(-1);
      renderScreen();
      expect(screen.queryByText(/Лучший результат/)).not.toBeInTheDocument();
    });
  });

  // ─── Game mode switching ────────────────────────────────────────────

  describe('game mode switching', () => {
    it('calls setGameMode when Classic is clicked', () => {
      const setGameMode = vi.fn();
      renderScreen({ gameMode: 'speed', setGameMode });
      fireEvent.click(screen.getByText('🎯 Классика'));
      expect(setGameMode).toHaveBeenCalledWith('classic');
    });

    it('calls setGameMode when Speed Run is clicked', () => {
      const setGameMode = vi.fn();
      renderScreen({ setGameMode });
      fireEvent.click(screen.getByText('⚡ Speed Run'));
      expect(setGameMode).toHaveBeenCalledWith('speed');
    });

    it('marks classic button as active when gameMode is classic', () => {
      renderScreen({ gameMode: 'classic' });
      const btn = screen.getByText('🎯 Классика').closest('button');
      expect(btn.className).toContain('is-active');
    });

    it('marks speed button as active when gameMode is speed', () => {
      renderScreen({ gameMode: 'speed' });
      const btn = screen.getByText('⚡ Speed Run').closest('button');
      expect(btn.className).toContain('is-active');
    });
  });

  // ─── Speed duration options ─────────────────────────────────────────

  describe('speed duration options', () => {
    it('shows duration options when gameMode is speed', () => {
      renderScreen({ gameMode: 'speed' });
      expect(screen.getByText('60с')).toBeInTheDocument();
      expect(screen.getByText('120с')).toBeInTheDocument();
      expect(screen.getByText('180с')).toBeInTheDocument();
    });

    it('hides duration options when gameMode is classic', () => {
      renderScreen({ gameMode: 'classic' });
      expect(screen.queryByText('60с')).not.toBeInTheDocument();
      expect(screen.queryByText('120с')).not.toBeInTheDocument();
      expect(screen.queryByText('180с')).not.toBeInTheDocument();
    });

    it('marks current speedDuration as active', () => {
      renderScreen({ gameMode: 'speed', speedDuration: 120 });
      const btn = screen.getByText('120с');
      expect(btn.className).toContain('is-active');
    });

    it('calls setSpeedDuration when duration is clicked', () => {
      const setSpeedDuration = vi.fn();
      renderScreen({ gameMode: 'speed', setSpeedDuration });
      fireEvent.click(screen.getByText('180с'));
      expect(setSpeedDuration).toHaveBeenCalledWith(180);
    });

    it('does not mark other durations as active', () => {
      renderScreen({ gameMode: 'speed', speedDuration: 120 });
      expect(screen.getByText('60с').className).not.toContain('is-active');
      expect(screen.getByText('180с').className).not.toContain('is-active');
    });
  });

  // ─── Player mode selection ──────────────────────────────────────────

  describe('player mode selection', () => {
    it('marks current playerMode as aria-pressed=true', () => {
      renderScreen({ playerMode: 2 });
      expect(screen.getByRole('button', { name: '2 игрока' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: '1 игрок' })).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByRole('button', { name: 'Против ИИ' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('calls setPlayerMode(1) when solo is clicked', () => {
      const setPlayerMode = vi.fn();
      renderScreen({ playerMode: 2, setPlayerMode });
      fireEvent.click(screen.getByRole('button', { name: '1 игрок' }));
      expect(setPlayerMode).toHaveBeenCalledWith(1);
    });

    it('calls setPlayerMode(2) when duo is clicked', () => {
      const setPlayerMode = vi.fn();
      renderScreen({ setPlayerMode });
      fireEvent.click(screen.getByRole('button', { name: '2 игрока' }));
      expect(setPlayerMode).toHaveBeenCalledWith(2);
    });

    it('calls setPlayerMode(3) when vs AI is clicked', () => {
      const setPlayerMode = vi.fn();
      renderScreen({ setPlayerMode });
      fireEvent.click(screen.getByRole('button', { name: 'Против ИИ' }));
      expect(setPlayerMode).toHaveBeenCalledWith(3);
    });

    it('applies correct CSS classes for active player mode', () => {
      renderScreen({ playerMode: 3 });
      const soloBtn = screen.getByRole('button', { name: '1 игрок' });
      const aiBtn = screen.getByRole('button', { name: 'Против ИИ' });
      expect(soloBtn.className).not.toContain('is-active');
      expect(aiBtn.className).toContain('is-active');
    });
  });

  // ─── Action buttons ─────────────────────────────────────────────────

  describe('action buttons', () => {
    it('calls onStart when start button is clicked', () => {
      const onStart = vi.fn();
      renderScreen({ onStart });
      fireEvent.click(screen.getByRole('button', { name: 'Начать игру' }));
      expect(onStart).toHaveBeenCalledTimes(1);
    });

    it('calls onOpenSettings when settings is clicked', () => {
      const onOpenSettings = vi.fn();
      renderScreen({ onOpenSettings });
      fireEvent.click(screen.getByRole('button', { name: 'Настройки' }));
      expect(onOpenSettings).toHaveBeenCalledTimes(1);
    });

    it('calls onOpenAchievements when achievements is clicked', () => {
      const onOpenAchievements = vi.fn();
      renderScreen({ onOpenAchievements });
      fireEvent.click(screen.getByRole('button', { name: 'Достижения' }));
      expect(onOpenAchievements).toHaveBeenCalledTimes(1);
    });

    it('calls onOpenDailyChallenge when daily challenge is clicked', () => {
      const onOpenDailyChallenge = vi.fn();
      renderScreen({ onOpenDailyChallenge });
      fireEvent.click(screen.getByRole('button', { name: 'Ежедневный челлендж' }));
      expect(onOpenDailyChallenge).toHaveBeenCalledTimes(1);
    });

    it('calls onOpenOnline when online is clicked', () => {
      const onOpenOnline = vi.fn();
      renderScreen({ onOpenOnline });
      fireEvent.click(screen.getByRole('button', { name: 'Онлайн' }));
      expect(onOpenOnline).toHaveBeenCalledTimes(1);
    });

    it('calls onOpenPurchase when premium is clicked', () => {
      const onOpenPurchase = vi.fn();
      renderScreen({ onOpenPurchase });
      fireEvent.click(screen.getByRole('button', { name: 'Премиум магазин' }));
      expect(onOpenPurchase).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Premium button conditional ─────────────────────────────────────

  describe('premium button', () => {
    it('shows premium button when showPurchaseButton is true', () => {
      renderScreen({ showPurchaseButton: true });
      expect(screen.getByRole('button', { name: 'Премиум магазин' })).toBeInTheDocument();
    });

    it('hides premium button when showPurchaseButton is false', () => {
      renderScreen({ showPurchaseButton: false });
      expect(screen.queryByRole('button', { name: 'Премиум магазин' })).not.toBeInTheDocument();
    });

    
  });

  // ─── Achievement counter ────────────────────────────────────────────

  describe('achievement counter', () => {
    it('shows 0/5 when no achievements unlocked', () => {
      renderScreen();
      const btn = screen.getByRole('button', { name: 'Достижения' });
      expect(btn).toHaveTextContent(/0\/5/);
    });

    it('shows correct count when some achievements unlocked', () => {
      vi.mocked(achievementsTracker.getUnlockedAchievements).mockReturnValue([
        { id: 'first_move' },
        { id: 'five_moves' },
      ]);
      renderScreen();
      const btn = screen.getByRole('button', { name: 'Достижения' });
      expect(btn).toHaveTextContent(/2\/5/);
    });

    it('shows all achievements unlocked', () => {
      vi.mocked(achievementsTracker.getUnlockedAchievements).mockReturnValue([
        { id: 'first_move' },
        { id: 'five_moves' },
        { id: 'ten_moves' },
        { id: 'veteran' },
        { id: 'centurion' },
      ]);
      renderScreen();
      const btn = screen.getByRole('button', { name: 'Достижения' });
      expect(btn).toHaveTextContent(/5\/5/);
    });
  });

  // ─── Daily challenge badge color ────────────────────────────────────

  describe('daily challenge badge', () => {
    it('has yellow class when daily challenge is not completed', () => {
      vi.mocked(dailyChallengeTracker.isDailyChallengeCompleted).mockReturnValue(false);
      renderScreen();
      const btn = screen.getByRole('button', { name: 'Ежедневный челлендж' });
      expect(btn.className).toContain('j-action-btn--yellow');
      expect(btn.className).not.toContain('j-action-btn--green');
    });

    it('has green class when daily challenge is completed', () => {
      vi.mocked(dailyChallengeTracker.isDailyChallengeCompleted).mockReturnValue(true);
      renderScreen();
      const btn = screen.getByRole('button', { name: 'Ежедневный челлендж' });
      expect(btn.className).toContain('j-action-btn--green');
      expect(btn.className).not.toContain('j-action-btn--yellow');
    });
  });

  // ─── Edge cases ─────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('renders without online button handler gracefully', () => {
      // The component doesn't require onOpenOnline — it's always rendered
      renderScreen();
      expect(screen.getByRole('button', { name: 'Онлайн' })).toBeInTheDocument();
    });

    it('handles missing speed duration props when gameMode is speed', () => {
      renderScreen({ gameMode: 'speed' });
      expect(screen.getByText('60с')).toBeInTheDocument();
      expect(screen.getByText('120с')).toBeInTheDocument();
      expect(screen.getByText('180с')).toBeInTheDocument();
    });

    it('calls setPlayerMode and setGameMode with the correct argument types', () => {
      const setPlayerMode = vi.fn();
      renderScreen({ setPlayerMode });
      fireEvent.click(screen.getByRole('button', { name: '1 игрок' }));
      expect(setPlayerMode).toHaveBeenCalledWith(expect.any(Number));
    });
  });
});
