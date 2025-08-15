-- Team-PICK-O 개발용 데이터베이스 초기화 스크립트

-- 확장 기능 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 개발용 샘플 테이블 (나중에 Alembic으로 관리)
-- 이 파일은 개발 환경 초기 설정용이며, 실제 스키마는 FastAPI에서 관리

-- 타임존 설정
SET timezone = 'Asia/Seoul';

-- 개발용 로깅 설정
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 100;

-- 개발 편의를 위한 설정
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';

-- 설정 적용
SELECT pg_reload_conf();

-- 개발용 사용자 생성 (추가 권한)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dev_user') THEN
        CREATE ROLE dev_user WITH LOGIN PASSWORD '12341234';
        GRANT ALL PRIVILEGES ON DATABASE teamPicko TO dev_user;
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dev_user;
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO dev_user;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO dev_user;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO dev_user;
    END IF;
END
$$;

-- Django가 마이그레이션으로 테이블을 생성하므로 여기서는 제거
-- 필요한 경우 초기 데이터는 Django fixtures나 데이터 마이그레이션으로 처리

-- 개발용 로그 출력
\echo '✅ Team-PICK-O 개발용 데이터베이스 초기화 완료'
\echo '📊 데이터베이스: teamPicko'
\echo '👤 사용자: teamPicko / dev_user'
\echo '🔑 비밀번호: 12341234'
\echo '🌐 접속: localhost:5432'