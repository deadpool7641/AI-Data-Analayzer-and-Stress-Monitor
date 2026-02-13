import { useState, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';

// Matches the 7 classes from your training (FER-2013 dataset)
const EMOTION_CLASSES = {
  0: 'Angry',
  1: 'Disgust',
  2: 'Fear',
  3: 'Happy',
  4: 'Sad',
  5: 'Surprise',
  6: 'Neutral'
};

// Map emotions to Stress Levels (0.0 to 1.0)
const STRESS_WEIGHTS = {
  'Angry': 0.9,
  'Fear': 0.95,
  'Sad': 0.7,
  'Disgust': 0.8,
  'Surprise': 0.5,
  'Neutral': 0.1,
  'Happy': 0.0
};

export const useStressModel = (videoRef) => {
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [model, setModel] = useState(null);
  // Default state to prevent UI crashes if model fails
  const [prediction, setPrediction] = useState({ 
    label: 'Initializing...', 
    stress: 0, 
    confidence: 0 
  }); 

  // 1. Load Your Custom Model (With Error Handling)
  useEffect(() => {
    const loadModel = async () => {
      console.log('Loading custom facial model...');
      try {
        await tf.ready();
        
        // Note: The path is relative to the 'public' folder
        // We add a try/catch here specifically for the fetch
        const loadedModel = await tf.loadLayersModel('/models/facial/model.json');
        
        setModel(loadedModel);
        setIsModelLoading(false);
        console.log('✅ Custom Model Loaded');
      } catch (err) {
        console.warn("⚠️ Browser Model Missing or Invalid: Switching to Backend-Only Mode.");
        // We set loading to false so the UI shows up, but model remains null
        setIsModelLoading(false);
        setPrediction({ label: 'Backend Mode', stress: 0, confidence: 0 });
      }
    };
    loadModel();
  }, []);

  // 2. Prediction Loop
  useEffect(() => {
    let isRunning = true;
    let animationFrameId;

    const predictLoop = async () => {
      // SAFETY CHECK: Only run if model exists and video is ready
      if (model && videoRef.current && videoRef.current.readyState === 4) {
        // Tidy cleans up tensors automatically to prevent memory leaks
        tf.tidy(() => {
          try {
            // A. Get Image from Webcam
            const video = tf.browser.fromPixels(videoRef.current);

            // B. Preprocess (MUST match your Python training exactly)
            // 1. Resize to 48x48
            let img = tf.image.resizeBilinear(video, [48, 48]);
            
            // 2. Convert to Grayscale
            img = img.mean(2); // Convert RGB to Grayscale (average channels)
            img = img.expandDims(0); // Add batch dimension [1, 48, 48]
            img = img.expandDims(-1); // Add channel dimension [1, 48, 48, 1]
            img = img.div(255.0); // Normalize to 0-1

            // C. Run Prediction
            const output = model.predict(img);
            const scores = output.dataSync(); // Get array of 7 probabilities

            // D. Find Highest Score
            const maxScoreIndex = scores.indexOf(Math.max(...scores));
            const label = EMOTION_CLASSES[maxScoreIndex];
            const stressLevel = STRESS_WEIGHTS[label];

            // Update State (only if running)
            if (isRunning) {
              setPrediction({
                label: label,
                stress: stressLevel,
                confidence: scores[maxScoreIndex]
              });
            }
          } catch (e) {
            console.warn("Prediction error:", e);
          }
        });
      }
      
      // Loop ~10 times per second is enough (save CPU)
      if (isRunning && model) { // Only loop if model exists
        setTimeout(() => {
          animationFrameId = requestAnimationFrame(predictLoop);
        }, 100); 
      }
    };

    if (!isModelLoading && model) {
      predictLoop();
    }

    return () => {
      isRunning = false;
      cancelAnimationFrame(animationFrameId);
    };
  }, [model, isModelLoading, videoRef]);

  return {
    isModelLoading,
    prediction
  };
};