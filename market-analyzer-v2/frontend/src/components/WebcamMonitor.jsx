import { useEffect, useRef, useState, useCallback } from 'react'
import axios from 'axios'

const WebcamMonitor = () => {
  const videoRef = useRef()
  const canvasRef = useRef()
  const [isActive, setIsActive] = useState(false)
  const [status, setStatus] = useState('inactive')

  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const video = videoRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)

    const imageData = canvas.toDataURL('image/jpeg', 0.8)

    try {
      const response = await axios.post('/api/stress/analyze', {
        image: imageData,
      })
      console.log('Stress analysis:', response.data)
    } catch (error) {
      console.error('Stress analysis failed:', error)
    }
  }, [])

  const startMonitoring = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240 },
      })
      videoRef.current.srcObject = stream
      setStatus('active')
      setIsActive(true)

      // capture every 3 seconds
      const intervalId = setInterval(captureFrame, 3000)
      videoRef.current._intervalId = intervalId

      videoRef.current.onloadedmetadata = () => {
        videoRef.current.play()
      }
    } catch (err) {
      setStatus('permission-denied')
      console.error('Camera access denied:', err)
    }
  }, [captureFrame])

  const stopMonitoring = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop())
    }
    if (videoRef.current?._intervalId) {
      clearInterval(videoRef.current._intervalId)
    }
    setIsActive(false)
    setStatus('inactive')
  }

  return (
    <div className="webcam-monitor">
      <div
        className="status-indicator"
        style={{
          background: isActive ? '#10b981' : '#ef4444',
        }}
      />
      <span>{status}</span>

      <video ref={videoRef} style={{ display: isActive ? 'block' : 'none' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {!isActive ? (
        <button onClick={startMonitoring}>Start Stress Monitor</button>
      ) : (
        <button onClick={stopMonitoring}>Stop Monitor</button>
      )}

      <div className="disclaimer">
        * Assistive feature only. Not medically validated.
      </div>
    </div>
  )
}

export default WebcamMonitor
