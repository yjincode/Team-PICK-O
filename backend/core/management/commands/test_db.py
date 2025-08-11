"""
데이터베이스 연결 상태를 테스트하는 Django 관리 명령어
"""
from django.core.management.base import BaseCommand
from django.db import connections
from config.db_router import test_database_connections, get_active_database


class Command(BaseCommand):
    help = '데이터베이스 연결 상태를 테스트합니다'

    def add_arguments(self, parser):
        parser.add_argument(
            '--db',
            type=str,
            help='특정 데이터베이스만 테스트 (default, fallback)',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='상세한 출력 표시',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('데이터베이스 연결 상태를 확인합니다...\n')
        )

        if options['db']:
            # 특정 데이터베이스만 테스트
            db_name = options['db']
            if db_name not in ['default', 'fallback']:
                self.stdout.write(
                    self.style.ERROR(f'잘못된 데이터베이스 이름: {db_name}')
                )
                return

            self.test_single_database(db_name, options['verbose'])
        else:
            # 모든 데이터베이스 테스트
            results = test_database_connections()
            self.display_results(results, options['verbose'])

            # 현재 활성 데이터베이스 표시
            active_db = get_active_database()
            self.stdout.write(
                self.style.WARNING(f'\n현재 활성 데이터베이스: {active_db}')
            )

    def test_single_database(self, db_name, verbose=False):
        """단일 데이터베이스 연결 테스트"""
        try:
            connection = connections[db_name]
            
            if verbose:
                db_settings = connection.settings_dict
                self.stdout.write(f'데이터베이스: {db_name}')
                self.stdout.write(f'  호스트: {db_settings["HOST"]}:{db_settings["PORT"]}')
                self.stdout.write(f'  데이터베이스명: {db_settings["NAME"]}')
                self.stdout.write(f'  사용자: {db_settings["USER"]}')
            
            with connection.cursor() as cursor:
                cursor.execute("SELECT version();")
                version = cursor.fetchone()[0]
                
            self.stdout.write(
                self.style.SUCCESS(f'✅ {db_name}: 연결 성공')
            )
            
            if verbose:
                self.stdout.write(f'  PostgreSQL 버전: {version}')
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ {db_name}: 연결 실패')
            )
            if verbose:
                self.stdout.write(f'  오류: {str(e)}')

    def display_results(self, results, verbose=False):
        """테스트 결과 표시"""
        for db_name, result in results.items():
            if result['status'] == 'connected':
                self.stdout.write(
                    self.style.SUCCESS(f'✅ {db_name}: 연결 성공')
                )
                
                if verbose:
                    try:
                        connection = connections[db_name]
                        db_settings = connection.settings_dict
                        self.stdout.write(f'  호스트: {db_settings["HOST"]}:{db_settings["PORT"]}')
                        self.stdout.write(f'  데이터베이스명: {db_settings["NAME"]}')
                        
                        with connection.cursor() as cursor:
                            cursor.execute("SELECT version();")
                            version = cursor.fetchone()[0]
                            self.stdout.write(f'  PostgreSQL 버전: {version}')
                    except Exception as e:
                        self.stdout.write(f'  상세 정보 조회 실패: {e}')
            else:
                self.stdout.write(
                    self.style.ERROR(f'❌ {db_name}: 연결 실패')
                )
                if verbose and result['error']:
                    self.stdout.write(f'  오류: {result["error"]}')