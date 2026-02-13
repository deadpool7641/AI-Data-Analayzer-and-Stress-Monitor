import React, { useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useData } from '../contexts/DataContext';

const BackgroundStressWorker = () => {
    const webcamRef = useRef(null);
    const { socket, setCameraStream } = useData();

    // 1. Share the stream with the rest of the app when camera starts
    const handleUserMedia = (stream) => {
        console.log("Camera started background processing...");
        setCameraStream(stream);
    };

    // 2. The Capture Loop (Runs continuously)
    const captureAndSend = useCallback(() => {
        if (webcamRef.current && socket?.connected) {
            try {
                // Get screenshot (base64)
                const imageSrc = webcamRef.current.getScreenshot();
                if (imageSrc) {
                    // Emit to backend for processing
                    socket.emit('video_frame', imageSrc);
                }
            } catch (err) {
                console.error("Frame capture error:", err);
            }
        }
    }, [socket]);

    // 3. Set Interval (1 FPS)
    useEffect(() => {
        const interval = setInterval(captureAndSend, 1000);
        return () => clearInterval(interval);
    }, [captureAndSend]);

    return (
        <div style={{ position: 'fixed', top: '-10000px', left: '-10000px', visibility: 'hidden' }}>
            {/* The actual webcam instance runs here, hidden from view */}
            <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{ width: 640, height: 480, facingMode: 'user' }}
                onUserMedia={handleUserMedia}
                mirrored={true}
            />
        </div>
    );
};

export default BackgroundStressWorker;