import { useState, useRef } from "react";

export const useAudioRecorder = () => {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    setAudioBlob(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const options = { mimeType: 'audio/webm' };
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        options.mimeType = 'audio/ogg';
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const rawBlob = new Blob(audioChunksRef.current, { type: options.mimeType });
        const playableBlob = new Blob([rawBlob], { type: options.mimeType });
        setAudioBlob(playableBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      setRecording(true);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Please allow microphone access to record audio.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  return { recording, audioBlob, startRecording, stopRecording };
};