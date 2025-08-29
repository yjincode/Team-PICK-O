from faster_whisper import WhisperModel

# 모델 로드 (small, medium, large 등 가능)
model = WhisperModel("medium", device="cuda" if torch.cuda.is_available() else "cpu", compute_type="float16")

# STT 수행
segments, info = model.transcribe("example.wav", beam_size=5)

print(f"Detected language: {info.language}")
print("Transcription:")
for segment in segments:
    print(f"[{segment.start:.2f}s -> {segment.end:.2f}s] {segment.text}")
