# Firebase Service Account Key 설정 가이드

## 1. Firebase Console에서 Service Account Key 생성

### 단계 1: Firebase Console 접속
1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. 프로젝트 선택

### 단계 2: 프로젝트 설정 이동
1. 좌측 메뉴에서 ⚙️ **프로젝트 설정** 클릭
2. **서비스 계정** 탭 클릭

### 단계 3: Service Account Key 생성
1. **새 비공개 키 생성** 버튼 클릭
2. JSON 형식 선택
3. **키 생성** 클릭
4. JSON 파일이 자동으로 다운로드됩니다

### 단계 4: 키 파일 배치
1. 다운로드된 JSON 파일을 `firebase-admin-key.json`으로 이름 변경
2. `/Users/jeong-yeongjin/Desktop/exProject/mainproject/backend/` 디렉토리에 복사

## 2. 파일 구조 확인
```
backend/
├── firebase-admin-key.json  ← 여기에 배치
├── manage.py
├── config/
│   └── settings.py
└── ...
```

## 3. 보안 주의사항
- `firebase-admin-key.json` 파일은 **절대로 Git에 커밋하지 마세요**
- `.gitignore`에 추가되어 있어야 합니다
- 프로덕션에서는 환경변수로 관리하는 것이 좋습니다

## 4. 설정 완료 후 확인
Django 서버를 재시작하면 다음 메시지가 표시됩니다:
```
✅ Firebase Admin SDK 인증서 파일 발견
✅ Firebase Admin SDK 초기화 완료 (Service Account Key 사용)
```

## 5. 문제 해결
만약 여전히 인증 오류가 발생한다면:
1. JSON 파일의 권한 확인 (`chmod 644 firebase-admin-key.json`)
2. JSON 파일의 내용이 올바른지 확인
3. Firebase 프로젝트 ID가 맞는지 확인