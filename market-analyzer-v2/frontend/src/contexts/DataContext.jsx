// src/contexts/DataContext.jsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { io } from "socket.io-client";

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [symbolData, setSymbolData] = useState({});
  const [stressHistory, setStressHistory] = useState([]);

  // global camera stream for StressMonitor
  const [cameraStream, setCameraStream] = useState(null);

  const socketRef = useRef(null);
  const initializeAttemptedRef = useRef(false);

  useEffect(() => {
    if (initializeAttemptedRef.current) return;
    initializeAttemptedRef.current = true;

    const API_BASE_URL =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

    console.log("Creating new Socket.IO connection to:", API_BASE_URL);
    const newSocket = io(API_BASE_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 30000,
      autoConnect: true,
      reconnection: true,
    });

    newSocket.on("connect", () => {
      console.log("✓ Socket.IO connected with ID:", newSocket.id);
      setIsConnected(true);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("✗ Socket.IO disconnected. Reason:", reason);
      setIsConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Socket.IO connection error:", error);
    });

    // market updates
    newSocket.on("market_update", (data) => {
      setSymbolData((prev) => ({
        ...prev,
        [data.symbol]: {
          ...data.data,
          type: data.type,
          symbol: data.symbol,
          timestamp: new Date().toLocaleTimeString(),
        },
      }));
    });

    // stress updates from backend model
    newSocket.on("stress_update", (data) => {
      setStressHistory((prevHistory) => {
        const updatedHistory = [
          ...prevHistory,
          { ...data, time: new Date().toLocaleTimeString() },
        ];
        return updatedHistory.slice(-50);
      });
    });

    socketRef.current = newSocket;

    return () => {
      // keep socket alive across route changes
      // socketRef.current?.disconnect();
    };
  }, []);

  // open browser camera once and store the stream
  useEffect(() => {
    let stream;
    let cancelled = false;

    const enableCamera = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn("MediaDevices API not available in this browser.");
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });
        if (!cancelled) {
          setCameraStream(stream);
        }
      } catch (err) {
        console.error("Could not access camera:", err);
        if (!cancelled) {
          setCameraStream(null);
        }
      }
    };

    enableCamera();

    return () => {
      cancelled = true;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const dataContextValue = useMemo(
    () => ({
      socket: socketRef.current,
      isConnected,
      symbolData,
      stressHistory,
      cameraStream,
      setCameraStream,
    }),
    [isConnected, symbolData, stressHistory, cameraStream]
  );

  return (
    <DataContext.Provider value={dataContextValue}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};

export default DataContext;