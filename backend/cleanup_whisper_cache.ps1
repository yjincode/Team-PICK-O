# PowerShell용 Whisper 캐시 정리 스크립트
# UTF-8 인코딩 설정
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "🧹 Whisper 모델 캐시 정리 시작..." -ForegroundColor Green
Write-Host ""

# Hugging Face 캐시 디렉토리 정리
Write-Host "📂 Hugging Face 캐시 정리 중..." -ForegroundColor Yellow
$hfCachePath = "$env:USERPROFILE\.cache\huggingface"
if (Test-Path $hfCachePath) {
    Write-Host "Hugging Face 캐시 디렉토리 발견: $hfCachePath" -ForegroundColor Cyan
    
    # Whisper 모델 캐시 찾기 및 삭제
    $whisperDirs = Get-ChildItem -Path "$hfCachePath\transformers" -Directory -Name "models--openai--whisper*" -ErrorAction SilentlyContinue
    if ($whisperDirs.Count -gt 0) {
        foreach ($dir in $whisperDirs) {
            $fullPath = "$hfCachePath\transformers\$dir"
            Remove-Item -Path $fullPath -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "✅ 삭제됨: $dir" -ForegroundColor Green
        }
        Write-Host "✅ Whisper 모델 캐시 삭제 완료" -ForegroundColor Green
    } else {
        Write-Host "Whisper 모델 캐시 없음" -ForegroundColor Gray
    }
} else {
    Write-Host "Hugging Face 캐시 디렉토리 없음" -ForegroundColor Gray
}
Write-Host ""

# PyTorch 캐시 정리
Write-Host "📂 PyTorch 캐시 정리 중..." -ForegroundColor Yellow
$torchCachePath = "$env:USERPROFILE\.cache\torch"
if (Test-Path $torchCachePath) {
    Write-Host "PyTorch 캐시 디렉토리 발견: $torchCachePath" -ForegroundColor Cyan
    
    # Whisper 체크포인트 파일 찾기 및 삭제
    $whisperFiles = Get-ChildItem -Path "$torchCachePath\hub\checkpoints" -File -Name "whisper*" -ErrorAction SilentlyContinue
    if ($whisperFiles.Count -gt 0) {
        foreach ($file in $whisperFiles) {
            $fullPath = "$torchCachePath\hub\checkpoints\$file"
            Remove-Item -Path $fullPath -Force -ErrorAction SilentlyContinue
            Write-Host "✅ 삭제됨: $file" -ForegroundColor Green
        }
        Write-Host "✅ PyTorch Whisper 캐시 삭제 완료" -ForegroundColor Green
    } else {
        Write-Host "PyTorch Whisper 캐시 없음" -ForegroundColor Gray
    }
} else {
    Write-Host "PyTorch 캐시 디렉토리 없음" -ForegroundColor Gray
}
Write-Host ""

# pip 캐시 정리
Write-Host "📦 pip 캐시 정리 중..." -ForegroundColor Yellow
try {
    & pip cache remove transformers 2>$null
    & pip cache remove torch 2>$null
    & pip cache remove torchaudio 2>$null
    Write-Host "✅ pip 캐시 정리 완료" -ForegroundColor Green
} catch {
    Write-Host "⚠️ pip 캐시 정리 중 일부 오류 발생 (무시 가능)" -ForegroundColor Yellow
}
Write-Host ""

# 사용하지 않는 패키지 제거
Write-Host "🗑️ 사용하지 않는 패키지 제거 중..." -ForegroundColor Yellow
try {
    & pip uninstall -y torch torchaudio torchvision transformers accelerate
    Write-Host "✅ 패키지 제거 완료" -ForegroundColor Green
} catch {
    Write-Host "⚠️ 일부 패키지 제거 중 오류 발생" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "✨ Whisper 캐시 정리 완료!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 다음 단계:" -ForegroundColor Cyan
Write-Host "1. 새로운 requirements.txt 설치: pip install -r requirements.txt" -ForegroundColor White
Write-Host "2. Django 서버 재시작" -ForegroundColor White
Write-Host ""

# 사용자 입력 대기
Read-Host "계속하려면 Enter를 누르세요"