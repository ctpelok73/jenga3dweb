import React, { useEffect, useRef } from 'react';

/**
 * QRCodeGenerator: генерирует QR код используя qrcode.js библиотеку
 * Загружает библиотеку динамически из CDN
 */
export function QRCodeDisplay({ url = 'https://jenga3d.app', size = 120 }) {
  const canvasRef = useRef(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    if (scriptLoadedRef.current) {
      generateQR();
      return;
    }

    // Загружаем QR код библиотеку
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    script.async = true;
    script.onload = () => {
      scriptLoadedRef.current = true;
      generateQR();
    };
    document.head.appendChild(script);

    return () => {
      // Не удаляем скрипт, так как он может использоваться повторно
    };
  }, [url, size]);

  const generateQR = () => {
    if (!canvasRef.current || !window.QRCode) return;

    // Очищаем старый QR код
    canvasRef.current.innerHTML = '';

    // Генерируем новый
    new window.QRCode(canvasRef.current, {
      text: url,
      width: size,
      height: size,
      colorDark: '#2a6eff',
      colorLight: '#ffffff',
      correctLevel: window.QRCode.CorrectLevel.H,
    });
  };

  return (
    <div
      ref={canvasRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto',
      }}
    />
  );
}

export default QRCodeDisplay;
