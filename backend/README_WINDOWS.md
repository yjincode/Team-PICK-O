# 윈도우 사용자를 위한 샘플 데이터 관리 가이드

## 🚀 빠른 실행 (권장)

### 샘플 데이터 생성
```cmd
run_sample_data.bat
```

### 데이터 클리어
```cmd
clear_data.bat
```

## 🔧 수동 실행

### 1. 가상환경 활성화
```cmd
venv\Scripts\activate.bat
```

### 2. 샘플 데이터 생성
```cmd
python manage.py shell -c "exec(open('sample_data.py', encoding='utf-8').read())"
```

### 3. 데이터 클리어
```cmd
python manage.py shell -c "exec(open('clear_data.py', encoding='utf-8').read())"
```

## ❗ 문제 해결

### 인코딩 오류가 발생하는 경우
```cmd
chcp 65001
set PYTHONIOENCODING=utf-8
```

### 가상환경이 없는 경우
```cmd
python -m venv venv
venv\Scripts\activate.bat
pip install -r requirements.txt
```

### Django 설정 오류
```cmd
set DJANGO_SETTINGS_MODULE=config.settings
```

## 📊 생성되는 데이터

- 🏢 거래처: 12개 (다양한 수산업체)
- 🐟 어종: 20개 (실제 수산시장 어종)
- 📦 재고: 어종당 1-3개 (2주 전 입고)
- 📋 주문: 3000-4000개 (3년치 데이터)
- 💳 결제: 90% 완료, 5% 취소, 5% 환불

## ⚠️ 주의사항

1. **사용자 데이터는 보존됨** - 로그인 계정 정보는 삭제되지 않습니다
2. **대용량 데이터** - 생성에 5-10분 정도 소요될 수 있습니다
3. **백업 권장** - 중요한 데이터가 있다면 미리 백업하세요