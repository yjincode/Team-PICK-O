# Firebase Admin SDK 설정 가이드

## 1. Firebase Admin 설치
```bash
cd backend
pip install firebase-admin==6.2.0
```

## 2. Firebase 서비스 키 다운로드
1. Firebase Console → 프로젝트 설정 → 서비스 계정
2. "새 비공개 키 생성" 클릭
3. JSON 파일 다운로드
4. 파일명을 `firebase-admin-key.json`으로 변경
5. `backend/` 폴더에 저장

## 3. 환경변수 설정 (선택사항)
Production 환경에서는 환경변수 사용 권장:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/firebase-admin-key.json"
```

## 4. .gitignore 추가
```
# Firebase 비공개 키 (보안)
firebase-admin-key.json
*.json
```

## 5. 테스트
```bash
python manage.py shell
```
```python
from core.authentication import FirebaseAuthentication
auth = FirebaseAuthentication()
print("Firebase 인증 설정 완료!")
```

## 보안 강화 완료 ✅

### 변경사항:
1. **Firebase 인증 미들웨어 추가**
   - `core/authentication.py`: Firebase 토큰 검증
   - 모든 API 요청에서 자동 인증

2. **API 보안 강화**
   - `BusinessCreateAPIView`: 인증된 사용자만 접근
   - `OrderUploadView`: 인증된 사용자만 주문 생성
   - 사용자 ID 강제 설정으로 데이터 무결성 보장

3. **설정 업데이트**
   - DRF에 Firebase 인증 추가
   - requirements.txt에 firebase-admin 추가

### 이제 안전합니다! 🔒
- Firebase 토큰 없이는 API 접근 불가
- 사용자가 임의로 다른 사람의 ID 사용 불가
- 모든 비즈니스 생성이 올바른 사용자로 연결됨