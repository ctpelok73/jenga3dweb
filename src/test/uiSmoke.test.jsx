import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import StartScreen from '../screens/StartScreen';
import SettingsPanel from '../screens/SettingsPanel';

describe('UI smoke tests', () => {
  it('renders the start screen and starts the game', () => {
    const onStart = vi.fn();
    render(
      <StartScreen
        onStart={onStart}
        playerMode={1}
        setPlayerMode={vi.fn()}
        onOpenSettings={vi.fn()}
        onOpenAchievements={vi.fn()}
        onOpenDailyChallenge={vi.fn()}
        onOpenPurchase={vi.fn()}
        showPurchaseButton={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Начать игру' }));
    expect(onStart).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Премиум магазин' })).not.toBeInTheDocument();
  });

  it('renders settings and updates volume', () => {
    const onSettingsChange = vi.fn();
    render(<SettingsPanel onClose={vi.fn()} onSettingsChange={onSettingsChange} />);

    fireEvent.change(screen.getByLabelText('Громкость'), { target: { value: '25' } });

    expect(onSettingsChange).toHaveBeenCalledWith(expect.objectContaining({ volume: 25 }));
  });
});
