import { useState, useRef, useCallback } from "react";
import { Upload, Mic, Square, Loader2, AlertCircle } from "lucide-react";
import EditableText from "./EditableText";

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
      if (
        !file.type.startsWith("audio/") &&
        !file.name.match(/\.(wav|mp3|ogg|flac|webm|m4a|mp4)$/i)
      ) {
        setError(
          "ביטע לאָדט אַרויף אַ גילטיקע אַודיאָ טעקע (WAV, MP3, OGG, FLAC, M4A, WEBM)"
        );
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
        const file = new File([blob], `recording-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        stream.getTracks().forEach((t) => t.stop());
        handleFile(file);
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(
        () => setRecordingTime((t) => t + 1),
        1000
      );
    } catch {
      setError("צוטריט צום מיקראָפֿאָן איז פֿאַרוואָרפֿן געוואָרן. ביטע דערלויבט מיקראָפֿאָן צוטריט.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)
      .toString()
      .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="space-y-5" dir="rtl">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() =>
          !isLoading && !isRecording && fileInputRef.current?.click()
        }
        className={`
          relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 cursor-pointer group
          ${
            isDragging
              ? "border-amber-500 bg-amber-50/80"
              : "border-stone-300 hover:border-amber-400 hover:bg-amber-50/30"
          }
          ${isLoading || isRecording ? "pointer-events-none opacity-50" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4 group-hover:bg-amber-200 transition-colors duration-200">
          <Upload
            className="text-amber-600"
            size={24}
            strokeWidth={1.5}
          />
        </div>
        <EditableText
          contentKey="upload_title"
          defaultValue="שלעפּט אַהער אַ אַודיאָ טעקע"
          as="p"
          className="text-stone-800 font-semibold text-lg font-hebrew"
          dir="rtl"
        />
        <EditableText
          contentKey="upload_subtitle"
          defaultValue="אָדער דריקט צו בלעטערן — WAV, MP3, OGG, FLAC, M4A, WEBM"
          as="p"
          className="text-stone-400 text-sm mt-1.5 font-hebrew"
          dir="rtl"
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-stone-200" />
        <EditableText
          contentKey="or_record"
          defaultValue="אָדער נעמט אויף"
          as="span"
          className="text-stone-400 text-sm font-medium font-hebrew"
          dir="rtl"
        />
        <div className="flex-1 h-px bg-stone-200" />
      </div>

      <div className="flex items-center justify-center gap-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={isLoading}
            className="flex items-center gap-2.5 px-7 py-3.5 bg-gradient-to-l from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all duration-200 shadow-md shadow-amber-200/40 hover:shadow-lg hover:shadow-amber-200/50"
          >
            <Mic size={18} />
            <EditableText
              contentKey="start_recording"
              defaultValue="אָנהייבן אויפֿנעמען"
              as="span"
              className="font-hebrew"
              dir="rtl"
            />
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-red-400 animate-pulse-ring" />
              <button
                onClick={stopRecording}
                className="relative flex items-center gap-2.5 px-7 py-3.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors duration-150 shadow-md"
              >
                <Square size={16} />
                <span className="font-display">{formatTime(recordingTime)}</span>
                <EditableText
                  contentKey="stop_recording"
                  defaultValue="— אָפּשטעלן"
                  as="span"
                  className="font-hebrew"
                  dir="rtl"
                />
              </button>
            </div>
          </div>
        )}
        {isLoading && (
          <div className="flex items-center gap-2 text-amber-700 font-medium">
            <Loader2 size={20} className="animate-spin" />
            <EditableText
              contentKey="transcribing_label"
              defaultValue="טראַנסקריבירט..."
              as="span"
              className="font-hebrew"
              dir="rtl"
            />
          </div>
        )}
      </div>

      {error && (
        <div
          className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm font-hebrew"
        >
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
