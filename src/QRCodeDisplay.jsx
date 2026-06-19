import React, { useEffect, useRef, useCallback } from 'react';

export function QRCodeDisplay({ url = 'https://jenga3d.app', size = 120 }) {
  const containerRef = useRef(null);
  const qrInstanceRef = useRef(null);
  const scriptLoadedRef = useRef(false);

  const generateQR = useCallback(() => {
    if (!containerRef.current || !window.QRCode) return;

    if (qrInstanceRef.current) {
      qrInstanceRef.current.clear();
    }

    containerRef.current.innerHTML = '';

    qrInstanceRef.current = new window.QRCode(containerRef.current, {
      text: url,
      width: size,
      height: size,
      colorDark: '#2a6eff',
      colorLight: '#ffffff',
      correctLevel: window.QRCode.CorrectLevel.H,
    });
  }, [url, size]);

  useEffect(() => {
    if (scriptLoadedRef.current) {
      generateQR();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    script.async = true;
    script.onload = () => {
      scriptLoadedRef.current = true;
      generateQR();
    };
    script.onerror = () => {
      console.warn('[QRCodeDisplay] Failed to load qrcode.js library');
    };
    document.head.appendChild(script);
  }, [generateQR]);

  return (
    <div
      ref={containerRef}
      className="j-qr-container"
    />
  );
}

export default QRCodeDisplay;