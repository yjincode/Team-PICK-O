# 🚀 어종 가격 예측 자동화 시스템 설정 가이드

## 📋 시스템 구성

### 1. **자동 데이터 수집**
- **실행 시간**: 매일 오전 6시 (설정 가능)
- **수집 데이터**: 
  - 노량진 경매 데이터 (어제)
  - 환경 데이터 (수온, 기온, 습도 등)
- **예측 실행**: 5개 어종 가격 예측
- **결과 저장**: DB + 로그 파일

### 2. **대시보드**
- **URL**: `http://localhost:8000/api/v1/prediction/dashboard/`
- **기능**: 실시간 그래프, 통계, 환경 데이터 시각화

## 🔧 Windows 작업 스케줄러 설정

### **방법 1: 자동 설정 (권장)**
```bash
# 관리자 권한으로 PowerShell 실행 후
cd C:\Users\201\dev\Team-PICK-O\backend
.\setup_automation.bat
```

### **방법 2: 수동 설정**
1. **작업 스케줄러** 열기 (`taskschd.msc`)
2. **기본 작업 만들기** 클릭
3. **작업 이름**: `FishPricePrediction`
4. **트리거**: 매일
5. **시작 시간**: 오전 6:00
6. **동작**: 프로그램 시작
7. **프로그램/스크립트**: `cmd`
8. **인수**: `/c cd /d "C:\Users\201\dev\Team-PICK-O\backend" && python manage.py daily_data_collection`

## 📊 실행 결과 확인

### **로그 파일 확인**
```bash
# 로그 파일 위치
C:\Users\201\dev\Team-PICK-O\backend\logs\daily_collection.log

# 실시간 로그 확인
tail -f logs\daily_collection.log
```

### **작업 스케줄러 상태 확인**
```bash
# 등록된 작업 확인
schtasks /query /tn "FishPricePrediction"

# 작업 실행 기록 확인
schtasks /query /tn "FishPricePrediction" /v /fo list
```

### **대시보드에서 확인**
- 브라우저에서 `http://localhost:8000/api/v1/prediction/dashboard/` 접속
- 최신 예측 결과와 그래프 확인

## ⚙️ 설정 변경

### **실행 시간 변경**
```bash
# 오전 8시로 변경
schtasks /change /tn "FishPricePrediction" /st 08:00
```

### **실행 주기 변경**
```bash
# 주 1회 (월요일)로 변경
schtasks /change /tn "FishPricePrediction" /sc weekly /d MON
```

### **작업 삭제**
```bash
schtasks /delete /tn "FishPricePrediction" /f
```

## 🔍 문제 해결

### **권한 문제**
- 관리자 권한으로 PowerShell 실행
- 또는 `setup_automation.bat`을 관리자 권한으로 실행

### **Python 경로 문제**
- 가상환경 활성화: `venv\Scripts\activate`
- Python 경로 확인: `where python`

### **로그 확인**
```bash
# 최근 실행 결과 확인
python manage.py daily_data_collection --date 2025-08-27
```

## 📈 모니터링

### **일일 확인 사항**
1. 로그 파일에서 오류 메시지 확인
2. 대시보드에서 데이터 업데이트 확인
3. 예측 결과의 합리성 검토

### **주간 확인 사항**
1. 모델 성능 평가
2. 데이터 수집 품질 검토
3. 시스템 리소스 사용량 확인
