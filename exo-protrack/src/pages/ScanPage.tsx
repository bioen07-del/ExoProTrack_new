import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function ScanPage() {
  const navigate = useNavigate();
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scannerRef.current.render(
      (decodedText) => {
        // Extract CM lot ID from QR code
        const match = decodedText.match(/CM-\d{8}-\d{4}/);
        if (match) {
          scannerRef.current?.clear();
          navigate(`/cm/${match[0]}`);
        } else {
          setError('QR код не содержит ID CM лота');
        }
      },
      (err) => {
        // Ignore scan errors
      }
    );

    return () => {
      scannerRef.current?.clear().catch(() => {});
    };
  }, [navigate]);

  return (
    <div className="max-w-lg mx-auto p-4">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-4"
      >
        <ArrowLeft size={20} className="mr-2" />
        Назад
      </Button>

      <h1 className="text-xl font-bold mb-4">Сканирование QR кода</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div id="qr-reader" className="w-full" />

      <p className="mt-4 text-sm text-muted-foreground text-center">
        Наведите камеру на QR код CM лота
      </p>
    </div>
  );
}
