"""
데이터베이스 연결 fallback 로직
1차 데이터베이스 연결 실패 시 자동으로 2차(fallback) 데이터베이스로 연결
"""
import logging
from django.db import DatabaseError, connections
from django.conf import settings

logger = logging.getLogger(__name__)

class DatabaseFallbackRouter:
    """
    데이터베이스 연결 실패 시 fallback 데이터베이스로 전환하는 라우터
    """
    
    def __init__(self):
        self.primary_failed = False
        self.fallback_active = False
    
    def db_for_read(self, model, **hints):
        """읽기 작업용 데이터베이스 선택"""
        if not settings.DATABASE_FALLBACK_ENABLED:
            return 'default'
            
        return self._get_database()
    
    def db_for_write(self, model, **hints):
        """쓰기 작업용 데이터베이스 선택"""
        if not settings.DATABASE_FALLBACK_ENABLED:
            return 'default'
            
        return self._get_database()
    
    def allow_relation(self, obj1, obj2, **hints):
        """객체간 관계 허용 여부"""
        # 같은 데이터베이스에 있는 객체들 간의 관계는 허용
        db_set = {'default', 'fallback'}
        if obj1._state.db in db_set and obj2._state.db in db_set:
            return True
        return None
    
    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """마이그레이션 허용 여부"""
        # 현재 활성 데이터베이스에서만 마이그레이션 수행
        active_db = self._get_database()
        return db == active_db
    
    def _get_database(self):
        """활성 데이터베이스 결정"""
        if self.fallback_active:
            return 'fallback'
            
        if self.primary_failed:
            return 'fallback'
        
        # primary 데이터베이스 연결 테스트
        try:
            connection = connections['default']
            # 간단한 쿼리로 연결 테스트
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            
            # primary 연결 성공
            return 'default'
            
        except (DatabaseError, Exception) as e:
            logger.warning(f"Primary database connection failed: {e}")
            self.primary_failed = True
            
            # fallback 데이터베이스로 전환
            try:
                connection = connections['fallback']
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
                    cursor.fetchone()
                
                logger.info("Switched to fallback database successfully")
                self.fallback_active = True
                return 'fallback'
                
            except (DatabaseError, Exception) as e:
                logger.error(f"Fallback database connection also failed: {e}")
                # 두 데이터베이스 모두 실패한 경우 default로 fallback
                return 'default'


def test_database_connections():
    """
    데이터베이스 연결 상태를 테스트하는 유틸리티 함수
    """
    results = {}
    
    for db_name in ['default', 'fallback']:
        try:
            connection = connections[db_name]
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            results[db_name] = {'status': 'connected', 'error': None}
            logger.info(f"Database '{db_name}' connection: SUCCESS")
        except (DatabaseError, Exception) as e:
            results[db_name] = {'status': 'failed', 'error': str(e)}
            logger.error(f"Database '{db_name}' connection: FAILED - {e}")
    
    return results


def get_active_database():
    """
    현재 활성 데이터베이스 반환
    """
    router = DatabaseFallbackRouter()
    return router._get_database()