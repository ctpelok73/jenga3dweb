import React, { useState } from 'react';
import { trackShareClick } from './analyticsService';

/**
 * SocialSharePanel: компонент для шеринга результата игры
 * Поддерживает: Twitter, Telegram, Facebook, WhatsApp, Copy Link
 */
export function SocialSharePanel({
  shareText,
  shareTitle = '🎮 Jenga 3D',
  shareUrl = 'https://jenga3d.app',
  onCopySuccess = null
}) {
  const [copied, setCopied] = useState(false);

  const socialPlatforms = [
    {
      id: 'twitter',
      name: 'Twitter',
      emoji: '🐦',
      color: '#1da1f2',
      onClick: () => {
        trackShareClick('twitter');
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
          '_blank',
          'width=600,height=400'
        );
      },
    },
    {
      id: 'telegram',
      name: 'Telegram',
      emoji: '✈️',
      color: '#0088cc',
      onClick: () => {
        trackShareClick('telegram');
        window.open(
          `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
          '_blank',
          'width=600,height=400'
        );
      },
    },
    {
      id: 'facebook',
      name: 'Facebook',
      emoji: '📘',
      color: '#1877f2',
      onClick: () => {
        trackShareClick('facebook');
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`,
          '_blank',
          'width=600,height=400'
        );
      },
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      emoji: '💬',
      color: '#25d366',
      onClick: () => {
        trackShareClick('whatsapp');
        const message = `${shareText}\n\n${shareUrl}`;
        window.open(
          `https://wa.me/?text=${encodeURIComponent(message)}`,
          '_blank'
        );
      },
    },
    {
      id: 'copy',
      name: 'Copy Link',
      emoji: '📋',
      color: '#888',
      onClick: async () => {
        try {
          const message = `${shareText}\n\n${shareUrl}`;
          await navigator.clipboard.writeText(message);
          trackShareClick('copy');
          setCopied(true);
          if (onCopySuccess) onCopySuccess();
          setTimeout(() => setCopied(false), 2000);
        } catch (err) {
          console.error('Failed to copy:', err);
        }
      },
    },
  ];

  return (
    <div className="j-share-row">
      {socialPlatforms.map((platform) => (
        <button
          key={platform.id}
          onClick={platform.onClick}
          className={`j-share-btn${copied && platform.id === 'copy' ? ' j-share-btn--copied' : ''}`}
          style={{ '--share-color': platform.color }}
          title={`Share on ${platform.name}`}
        >
          {platform.emoji} {platform.name}
          {copied && platform.id === 'copy' && ' ✓'}
        </button>
      ))}
    </div>
  );
}

export default SocialSharePanel;
