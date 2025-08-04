# 🐘 PostgreSQL + pgAdmin 개발환경 가이드

## 🚀 빠른 시작

### 1. Docker Compose 실행 (deployment 폴더에서)
```bash
cd deployment

# PostgreSQL + pgAdmin 실행
docker-compose -f docker-compose.dev.yml up -d

# pgAdmin만 추가로 실행하려면
docker-compose -f docker-compose.dev.yml up -d pgadmin
```

### 2. 접속 정보
- **PostgreSQL**: `localhost:5432`
- **pgAdmin**: `http://localhost:8080`

## 🔐 로그인 정보

### pgAdmin 웹 접속
- URL: http://localhost:8080
- Email: `admin@picko.com`
- Password: `admin123`

### PostgreSQL 데이터베이스
- Host: `localhost` (외부 접속시) 또는 `database` (컨테이너 내부에서)
- Port: `5432`
- Database: `teamPicko`
- Username: `teamPicko`
- Password: `12341234`

## 📊 pgAdmin 사용법

### 1. 서버 연결 설정
pgAdmin 접속 후:

1. **Servers** 우클릭 → **Create** → **Server**
2. **General 탭**:
   - Name: `PICK-O Local DB`
3. **Connection 탭**:
   - Host name/address: `database` (Docker 컨테이너명)
   - Port: `5432`
   - Maintenance database: `teamPicko`
   - Username: `teamPicko`
   - Password: `12341234`
4. **Save** 클릭

### 2. 데이터베이스 탐색
- **Servers** → **PICK-O Local DB** → **Databases** → **teamPicko** → **Schemas** → **public** → **Tables**

### 3. 🔥 사용자 승인하기 (가장 중요!)

**단계별 상세 가이드:**

1. **테이블 찾기**:
   - **Servers** → **PICK-O Local DB** → **Databases** → **teamPicko** → **Schemas** → **public** → **Tables**
   - 스크롤해서 **core_user** 테이블 찾기

2. **데이터 열기**:
   - **core_user** 테이블 **우클릭**
   - **View/Edit Data** → **All Rows** 클릭

3. **사용자 승인**:
   - 테이블에서 승인할 사용자 찾기 (Firebase UID 또는 전화번호로 식별)
   - **status** 컬럼을 더블클릭
   - `pending` → `approved`로 변경
   - **Enter** 키 또는 **F6** 키로 저장

4. **완료**: 사용자가 앱에서 새로고침하면 로그인 가능!

**💡 팁**: 
- 테이블이 안 보이면 **Tables** 옆의 새로고침 버튼 클릭
- **View/Edit Data**가 안 보이면 테이블을 정확히 우클릭했는지 확인

## 🛠️ 자주 사용하는 SQL 명령어

### 사용자 목록 조회
```sql
SELECT id, business_name, owner_name, phone_number, status, created_at 
FROM core_user 
ORDER BY created_at DESC;
```

### 승인 대기 사용자 조회
```sql
SELECT id, business_name, owner_name, phone_number, firebase_uid, created_at 
FROM core_user 
WHERE status = 'pending' 
ORDER BY created_at DESC;
```

### 사용자 승인하기
```sql
UPDATE core_user 
SET status = 'approved' 
WHERE firebase_uid = 'Firebase_UID_여기에_입력';
```

### 사용자 거절하기
```sql
UPDATE core_user 
SET status = 'rejected' 
WHERE firebase_uid = 'Firebase_UID_여기에_입력';
```

### 사용자 정지하기
```sql
UPDATE core_user 
SET status = 'suspended' 
WHERE firebase_uid = 'Firebase_UID_여기에_입력';
```

## 🔄 컨테이너 관리

### 실행/중지 (deployment 폴더에서)
```bash
cd deployment

# 실행
docker-compose -f docker-compose.dev.yml up -d

# 중지
docker-compose -f docker-compose.dev.yml stop

# 완전 삭제 (데이터 포함)
docker-compose -f docker-compose.dev.yml down -v
```

### 로그 확인
```bash
# PostgreSQL 로그
docker-compose -f docker-compose.dev.yml logs database

# pgAdmin 로그
docker-compose -f docker-compose.dev.yml logs pgadmin
```

### 데이터 백업/복원
```bash
# 백업
docker exec picko-postgres pg_dump -U teamPicko teamPicko > backup.sql

# 복원
docker exec -i picko-postgres psql -U teamPicko teamPicko < backup.sql
```

## 🚨 문제해결

### pgAdmin 접속 안됨
```bash
# 컨테이너 상태 확인
docker-compose ps

# 컨테이너 재시작
docker-compose restart pgadmin
```

### PostgreSQL 연결 안됨
```bash
# 포트 확인
docker-compose ps postgres

# 로그 확인
docker-compose logs postgres
```

### Django에서 DB 연결 안됨
1. `backend/config/settings.py`에서 DB 설정 확인
2. 환경변수가 올바른지 확인
3. 마이그레이션 실행: `python manage.py migrate`

## 📝 팀 공유 가이드

팀원들과 공유할 때:

1. **코드 공유**: `docker-compose.yml`, `.env.example` 파일 공유
2. **환경변수**: `.env.example`을 `.env`로 복사 후 필요시 수정
3. **실행**: `docker-compose up -d postgres pgadmin`
4. **접속**: pgAdmin에서 위 가이드대로 서버 연결

## 🔒 보안 주의사항

- 프로덕션에서는 비밀번호 변경 필수
- `.env` 파일은 절대 git에 커밋하지 말 것
- pgAdmin은 개발환경에서만 사용
- 실제 서비스에서는 직접 DB 접근 최소화