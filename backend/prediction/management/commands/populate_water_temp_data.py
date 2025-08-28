# backend/prediction/management/commands/populate_water_temp_data.py

import os
import sys
import django
import requests
import datetime
from django.core.management.base import BaseCommand, CommandParser
from django.db import transaction

# Django 설정을 독립적으로 로드
def setup_django():
    """Django 설정을 독립적으로 로드합니다."""
    # 현재 파일의 경로를 기준으로 backend 디렉토리 찾기
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(current_dir, '..', '..', '..', '..')
    
    # sys.path에 backend 디렉토리 추가
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
    
    # Django 설정 모듈 설정
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    
    # Django 설정
    django.setup()

# Django 설정 로드
setup_django()

# 이제 Django 모델들과 설정을 import할 수 있습니다
from prediction.models import ExternalEnvironmentalData
from django.conf import settings

# --- 설정 값 ---

# ⭐️ 수온 데이터 수집을 위한 설정 값 ⭐️
# 한국해양조사원(KHOA) 관측소 코드
KHOA_STATION_CODES = {
    '부산': 'DT_0001',  # 부산 관측소
    '목포': 'DT_0001',  # 목포 관측소  
    '인천': 'DT_0001',  # 인천 관측소
}

# --- API URL ---
# 한국해양조사원 수온 관측 API
KHOA_API_BASE_URL = "https://www.khoa.go.kr/api/oceangrid/tideObsTemp/search.do"

class Command(BaseCommand):
    help = "수온 데이터만 수집합니다."

    def add_arguments(self, parser: CommandParser):
        parser.add_argument('--start', type=str, help='데이터 수집 시작일 (YYYY-MM-DD 형식)')
        parser.add_argument('--end', type=str, help='데이터 수집 종료일 (YYYY-MM-DD 형식)')
        parser.add_argument('--force', action='store_true', help='기존 데이터를 덮어쓰기')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.khoa_api_key = None

    def handle(self, *args, **options):
        """스크립트 메인 로직"""
        self.stdout.write("=== 수온 데이터 수집 스크립트 시작 ===")
        
        # 단계 1: 환경변수 로드
        self.stdout.write("DEBUG: 단계 1 - 환경변수 로드 시작")
        
        # API 키들을 환경변수에서 직접 로드
        import os
        from dotenv import load_dotenv
        
        # .env 파일 로드
        self.stdout.write("DEBUG: .env 파일 로드 중...")
        load_dotenv()
        self.stdout.write("DEBUG: .env 파일 로드 완료")
        
        # 단계 2: API 키 로드
        self.stdout.write("DEBUG: 단계 2 - API 키 로드 시작")
        
        # settings.py에서 API 키 로드
        self.khoa_api_key = getattr(settings, 'KHOA_API_KEY', None)
        self.stdout.write(f"DEBUG: KHOA_API_KEY 로드됨: {bool(self.khoa_api_key)}")
        
        # API 키 확인 및 디버그 출력
        self.stdout.write("=== API 키 디버그 정보 ===")
        self.stdout.write(f"DEBUG: KHOA_API_KEY = {self.khoa_api_key[:20] + '...' if self.khoa_api_key else 'None'}")
        self.stdout.write(f"DEBUG: KHOA_API_KEY exists: {bool(self.khoa_api_key)}")
        self.stdout.write("=== API 키 디버그 정보 끝 ===")
        
        # 단계 3: API 키 확인
        self.stdout.write("DEBUG: 단계 3 - API 키 확인 시작")
        
        if not self.khoa_api_key:
            self.stdout.write(self.style.ERROR("KHOA_API_KEY가 설정되지 않았습니다. 수온 데이터를 수집할 수 없습니다."))
            return
        else:
            self.stdout.write("DEBUG: KHOA_API_KEY 확인됨")
            
        self.stdout.write("DEBUG: 단계 3 - API 키 확인 완료")

        # 단계 4: 날짜 범위 결정
        self.stdout.write("DEBUG: 단계 4 - 날짜 범위 결정 시작")
        
        # 기본값 설정 (2020-01-01 ~ 2025-08-18)
        start_date_str = options.get('start', '2020-01-01')
        end_date_str = options.get('end', '2025-08-18')
        
        try:
            start_date = datetime.datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except ValueError as e:
            self.stdout.write(self.style.ERROR(f"날짜 형식 오류: {e}"))
            return
            
        self.stdout.write(f"DEBUG: 수집 기간: {start_date} ~ {end_date}")
        self.stdout.write("DEBUG: 단계 4 - 날짜 범위 결정 완료")

        # 단계 5: 기존 데이터 처리
        self.stdout.write("DEBUG: 단계 5 - 기존 데이터 처리 시작")
        
        if options.get('force'):
            # 기존 수온 데이터 삭제
            deleted_count = ExternalEnvironmentalData.objects.filter(data_source='KHOA').delete()[0]
            self.stdout.write(f"DEBUG: 기존 KHOA 데이터 {deleted_count}건 삭제됨")
        else:
            # 기존 데이터 확인
            existing_count = ExternalEnvironmentalData.objects.filter(data_source='KHOA').count()
            self.stdout.write(f"DEBUG: 기존 KHOA 데이터 {existing_count}건 존재")
            
        self.stdout.write("DEBUG: 단계 5 - 기존 데이터 처리 완료")

        # 단계 6: 수온 데이터 수집
        self.stdout.write("DEBUG: 단계 6 - 수온 데이터 수집 시작")
        
        if self.khoa_api_key:
            self.fetch_water_temp_data(start_date, end_date)
        else:
            self.stdout.write(self.style.WARNING("KHOA_API_KEY가 없어 수온 데이터를 수집하지 않습니다."))
            
        self.stdout.write("DEBUG: 단계 6 - 수온 데이터 수집 완료")
        
        # 단계 7: 수집 결과 요약
        self.stdout.write("DEBUG: 단계 7 - 수집 결과 요약 시작")
        
        total_count = ExternalEnvironmentalData.objects.filter(data_source='KHOA').count()
        self.stdout.write(f"DEBUG: 최종 KHOA 데이터: {total_count}건")
        
        if total_count > 0:
            min_date = ExternalEnvironmentalData.objects.filter(data_source='KHOA').order_by('data_timestamp').first().data_timestamp
            max_date = ExternalEnvironmentalData.objects.filter(data_source='KHOA').order_by('-data_timestamp').first().data_timestamp
            self.stdout.write(f"DEBUG: KHOA 데이터 기간: {min_date.date()} ~ {max_date.date()}")
            
        self.stdout.write("DEBUG: 단계 7 - 수집 결과 요약 완료")
        
        self.stdout.write("=== 수온 데이터 수집 스크립트 완료 ===")

    def fetch_water_temp_data(self, start_date, end_date):
        """한국해양조사원 수온 데이터를 수집하여 저장합니다."""
        
        objects_to_create = [] # DB에 일괄 저장할 객체 리스트
        
        # KHOA 수온 데이터 수집 (전체 기간)
        for loc_name, station_code in KHOA_STATION_CODES.items():
            self.stdout.write(f"  -> {loc_name} 지역 수온 데이터 수집 중...")
            
            params = {
                'ServiceKey': self.khoa_api_key,  # KHOA 전용 API 키 사용
                'ResultType': 'json',
                'ObsCode': station_code,
                'Date': start_date.strftime('%Y%m%d'),
                'EndDate': end_date.strftime('%Y%m%d')
            }
            
            try:
                response = requests.get(KHOA_API_BASE_URL, params=params, timeout=30)
                
                if response.status_code != 200:
                    self.stdout.write(self.style.WARNING(f"    - {loc_name} API 오류: {response.status_code}"))
                    continue
                    
                data = response.json()
                
                # 응답 구조 확인
                items = data.get('result', {}).get('data', [])
                if not isinstance(items, list):
                    items = []
                
                self.stdout.write(f"    - {loc_name} 지역 데이터 {len(items)}건 수신")
                
                for item in items:
                    # 관측 날짜 파싱
                    obs_date_str = item.get('obs_time', '')
                    if not obs_date_str:
                        continue
                        
                    try:
                        # obs_time 형식: "2020-01-01 00:00:00"
                        obs_date = datetime.datetime.strptime(obs_date_str, '%Y-%m-%d %H:%M:%S')
                    except ValueError:
                        continue
                    
                    # 수온 값 추출
                    water_temp_str = item.get('water_temp', '')
                    if water_temp_str == '' or water_temp_str == '-999' or water_temp_str is None:
                        continue
                        
                    try:
                        water_temp = float(water_temp_str)
                        
                        objects_to_create.append(
                            ExternalEnvironmentalData(
                                data_source='KHOA',
                                data_timestamp=obs_date,
                                location_identifier=loc_name,
                                data_type='s_temp',
                                value=water_temp,
                                unit='°C'
                            )
                        )
                    except (ValueError, TypeError) as e:
                        self.stdout.write(self.style.WARNING(f"    - 수온 파싱 오류: {e}"))
                        
            except requests.exceptions.RequestException as e:
                self.stdout.write(self.style.WARNING(f"    - {loc_name} API 호출 오류: {e}"))
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"    - {loc_name} 데이터 처리 오류: {e}"))

        # 중간 저장 (메모리 효율성)
        if len(objects_to_create) >= 1000:
            self.stdout.write(f"    -> 중간 저장 중... ({len(objects_to_create)}건)")
            ExternalEnvironmentalData.objects.bulk_create(objects_to_create, ignore_conflicts=True)
            objects_to_create = []
        
        # 최종 저장
        if objects_to_create:
            self.stdout.write(f"    -> 최종 저장 중... ({len(objects_to_create)}건)")
            ExternalEnvironmentalData.objects.bulk_create(objects_to_create, ignore_conflicts=True)
        
        self.stdout.write(self.style.SUCCESS(f"    -> KHOA 수온 데이터 수집 완료"))
