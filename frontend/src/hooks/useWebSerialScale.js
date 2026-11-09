import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

/**
 * useWebSerialScale: Real-time WebSerial API hook for connecting digital weighing scales
 * directly to the DarkStori Web App (Chrome / Edge 89+).
 * 
 * Supports standard industrial formats:
 * - Essae / Mettler-Toledo: STX [DATA 7 chars] ETX e.g. "  1.240" (kg)
 * - CAS / Avery Weigh-Tronix: "ST,GS,+  1.240kg"
 */
export function useWebSerialScale({ onWeightChange, targetToleranceGrams = 15 } = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [liveWeightGrams, setLiveWeightGrams] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Disconnected');
  const [portDetails, setPortDetails] = useState(null);

  const portRef = useRef(null);
  const readerRef = useRef(null);
  const keepReadingRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serial' in navigator) {
      setIsSupported(true);
    } else {
      setIsSupported(false);
      setStatusMessage('WebSerial not supported in this browser (Use Chrome or Edge)');
    }
  }, []);

  const connectScale = useCallback(async () => {
    if (!('serial' in navigator)) {
      toast.error('WebSerial is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return false;
    }

    try {
      setStatusMessage('Requesting USB/Serial port...');
      const port = await navigator.serial.requestPort();
      await port.open({
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none'
      });

      portRef.current = port;
      setIsConnected(true);
      setStatusMessage('Connected to Industrial Scale');
      
      const info = port.getInfo ? port.getInfo() : {};
      setPortDetails({
        usbVendorId: info.usbVendorId ? `0x${info.usbVendorId.toString(16)}` : 'USB-Serial',
        usbProductId: info.usbProductId ? `0x${info.usbProductId.toString(16)}` : 'Adapter'
      });

      toast.success('Digital Platform Scale connected successfully via WebSerial!');

      keepReadingRef.current = true;
      readSerialLoop(port);
      return true;
    } catch (err) {
      console.warn('WebSerial connection cancelled or failed:', err);
      if (err.name !== 'NotFoundError') {
        toast.error(`Scale connection failed: ${err.message || 'Unknown error'}`);
      }
      setStatusMessage('Connection failed or cancelled');
      return false;
    }
  }, []);

  const disconnectScale = useCallback(async () => {
    keepReadingRef.current = false;
    try {
      if (readerRef.current) {
        await readerRef.current.cancel();
      }
      if (portRef.current) {
        await portRef.current.close();
      }
    } catch (err) {
      console.warn('Error closing serial port:', err);
    } finally {
      portRef.current = null;
      readerRef.current = null;
      setIsConnected(false);
      setStatusMessage('Disconnected');
      setPortDetails(null);
      toast.info('Scale disconnected');
    }
  }, []);

  const readSerialLoop = async (port) => {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    const reader = textDecoder.readable.getReader();
    readerRef.current = reader;

    let buffer = '';

    try {
      while (keepReadingRef.current) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buffer += value;
          const lines = buffer.split(/[\r\n]+/);
          buffer = lines.pop() || '';

          for (const line of lines) {
            parseWeightString(line);
          }
        }
      }
    } catch (err) {
      if (keepReadingRef.current) {
        console.warn('Serial stream read error:', err);
        setStatusMessage('Serial stream interrupted');
      }
    } finally {
      reader.releaseLock();
    }
  };

  const parseWeightString = (raw) => {
    if (!raw || typeof raw !== 'string') return;
    
    // Essae / CAS / Standard ASCII formats: e.g. "ST,GS,  1.240kg" or "  1.240" or "W:+1240g"
    const clean = raw.trim();
    const matchKg = clean.match(/([+-]?\d+(?:\.\d+)?)\s*(?:kg|KG)/);
    const matchG = clean.match(/([+-]?\d+(?:\.\d+)?)\s*(?:g|G)/);
    const matchBare = clean.match(/([+-]?\d+\.\d{2,3})/);

    let grams = null;
    if (matchG) {
      grams = Math.round(parseFloat(matchG[1]));
    } else if (matchKg) {
      grams = Math.round(parseFloat(matchKg[1]) * 1000);
    } else if (matchBare) {
      grams = Math.round(parseFloat(matchBare[1]) * 1000);
    }

    if (grams !== null && !isNaN(grams) && grams >= 0 && grams < 100000) {
      setLiveWeightGrams(grams);
      if (onWeightChange) {
        onWeightChange(grams);
      }
    }
  };

  return {
    isSupported,
    isConnected,
    liveWeightGrams,
    statusMessage,
    portDetails,
    connectScale,
    disconnectScale,
    setManualWeight: (grams) => {
      setLiveWeightGrams(grams);
      if (onWeightChange) onWeightChange(grams);
    }
  };
}

export default useWebSerialScale;
