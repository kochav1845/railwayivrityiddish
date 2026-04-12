import { useState, useRef, useCallback } from "react";
import { Upload, Mic, Square, Loader2, AlertCircle } from "lucide-react";

interface AudioInputProps {
  onTranscribe: (file: File) => void;
  isLoading: boolean;
}

export default function AudioInput({ onTranscribe, isLoading }: AudioInputProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      const validTypes = ["audio/wav", "audio/mp3", "audio/mpeg", "audio/ogg", "audio/flac", "audio/webm", "audio/m4a", "audio/mp4"];
      if (!validTypes.some((t) => file.type.startsWith("audio/")) && !file.name.match(/\.(wav|mp3|ogg|flac|webm|m4a|mp4)$/i)) {
        setError("Please upload a valid audio file (WAV, MP3, OGG, FLAC, M4A, WEBM).");
        return;
      }
      onTranscribe(file);
    },
    [onTranscribe]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        handleFile(file);
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      setError("Microphone access denied. Please allow microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isLoading && !isRecording && fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 cursor-pointer
          ${isDragging ? "border-amber-500 bg-amber-50" : "border-stone-300 hover:border-amber-400 hover:bg-amber-50/40"}
          ${isLoading || isRecording ? "pointer-events-none opacity-60" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <Upload className="mx-auto mb-3 text-amber-600" size={36} strokeWidth={1.5} />
        <p className="text-stone-700 font-medium text-lg">Drop audio file here</p>
        <p className="text-stone-500 text-sm mt-1">or click to browse &mdash; WAV, MP3, OGG, FLAC, M4A, WEBM</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-stone-200" />
        <span className="text-stone-400 text-sm font-medium">or record</span>
        <div className="flex-1 h-px bg-stone-200" />
      </div>

      <div className="flex items-center justify-center gap-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors duration-150 shadow-sm"
          >
            <Mic size={18} />
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors duration-150 shadow-sm animate-pulse"
          >
            <Square size={18} />
            Stop &mdash; {formatTime(recordingTime)}
          </button>
        )}
        {isLoading && (
          <div className="flex items-center gap-2 text-amber-700 font-medium">
            <Loader2 size={20} className="animate-spin" />
            Transcribing...
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
