import React from 'react';

export default function OnlineGameScreen({ 
  opponentName, 
  connected, 
  yourTurn, 
  turnCount, 
  onLeave 
}) {
  return (
    <div className="j-online-hud">
      <div className="j-online-hud__status">
        <span className={`j-online-dot ${connected ? 'j-online-dot--connected' : 'j-online-dot--disconnected'}`} />
        {connected ? 'Онлайн' : 'Переподключение...'}
      </div>
      
      <div className="j-online-hud__players">
        <div className={`j-online-player ${yourTurn ? 'j-online-player--active' : ''}`}>
          <span className="j-online-player__icon">👤</span>
          <span className="j-online-player__name">Вы</span>
        </div>
        <div className="j-online-hud__vs">VS</div>
        <div className={`j-online-player ${!yourTurn ? 'j-online-player--active' : ''}`}>
          <span className="j-online-player__icon">👤</span>
          <span className="j-online-player__name">{opponentName || 'Противник'}</span>
        </div>
      </div>

      <div className="j-online-hud__turn">
        {yourTurn ? '🟢 Ваш ход' : '🔴 Ход противника'}
      </div>

      <div className="j-online-hud__info">
        Ход: {turnCount || 0}
      </div>

      <button className="j-btn j-btn--small j-btn--danger" onClick={onLeave}>
        Покинуть игру
      </button>
    </div>
  );
}
