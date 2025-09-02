# backend/prediction/management/commands/populate_weather_data.py

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

# 이제 Django 모델들을 import할 수 있습니다
from prediction.models import ExternalEnvironmentalData

# --- 설정 값 ---

# ⭐️ 환경 데이터 수집을 위한 설정 값 ⭐️
# 기상청 ASOS 지상관측소 코드 (부산, 목포, 인천)
ASOS_STATION_CODES = {
    '부산': '159',  # 부산 ASOS 관측소
    '목포': '165',  # 목포 ASOS 관측소  
    '인천': '112',  # 인천 ASOS 관측소
}

# --- API URL ---
# 기상청 ASOS 일자료 API (과거 데이터 제공)
ASOS_API_BASE_URL = "http://apis.data.go.kr/1360000/AsosDalyInfoService/getWthrDataList"

class Command(BaseCommand):
    help = "기상 데이터만 수집합니다."

    def add_arguments(self, parser: CommandParser):
        parser.add_argument('--start', type=str, help='데이터 수집 시작일 (YYYY-MM-DD 형식)')
        parser.add_argument('--end', type=str, help='데이터 수집 종료일 (YYYY-MM-DD 형식)')
        parser.add_argument('--force', action='store_true', help='기존 데이터를 덮어쓰기')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.at_api_key = None

    def handle(self, *args, **options):
        """스크립트 메인 로직"""
        self.stdout.write("=== 기상 데이터 수집 스크립트 시작 ===")
        
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
        from django.conf import settings
        self.at_api_key = getattr(settings, 'DATA_GO_KR_API_KEY', None)
        self.stdout.write(f"DEBUG: DATA_GO_KR_API_KEY 로드됨: {bool(self.at_api_key)}")
        
        # API 키 확인 및 디버그 출력
        self.stdout.write("=== API 키 디버그 정보 ===")
        self.stdout.write(f"DEBUG: DATA_GO_KR_API_KEY = {self.at_api_key[:20] + '...' if self.at_api_key else 'None'}")
        self.stdout.write(f"DEBUG: DATA_GO_KR_API_KEY exists: {bool(self.at_api_key)}")
        self.stdout.write("=== API 키 디버그 정보 끝 ===")
        
        # 단계 3: API 키 확인
        self.stdout.write("DEBUG: 단계 3 - API 키 확인 시작")
        
        if not self.at_api_key:
            self.stdout.write(self.style.ERROR("DATA_GO_KR_API_KEY가 설정되지 않았습니다. 기상 데이터를 수집할 수 없습니다."))
            return
        else:
            self.stdout.write("DEBUG: DATA_GO_KR_API_KEY 확인됨")
            
        self.stdout.write("DEBUG: 단계 3 - API 키 확인 완료")

        # 단계 4: 날짜 범위 결정
        self.stdout.write("DEBUG: 단계 4 - 날짜 범위 결정 시작")
        start_date_str = options.get('start')
        end_date_str = options.get('end')
        
        self.stdout.write(f"DEBUG: 시작일: {start_date_str}")
        self.stdout.write(f"DEBUG: 종료일: {end_date_str}")

        if start_date_str and end_date_str:
            start_date = datetime.datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.datetime.strptime(end_date_str, '%Y-%m-%d').date()
            self.stdout.write(self.style.SUCCESS(f"=== 지정된 기간의 기상 데이터 수집 시작: {start_date_str} ~ {end_date_str} ==="))
        else:
            # 기본값: 어제부터 어제까지 (하루치만)
            start_date = datetime.date.today() - datetime.timedelta(days=1)
            end_date = datetime.date.today() - datetime.timedelta(days=1)
            self.stdout.write(self.style.SUCCESS(f"=== 기상 데이터 수집 시작: {start_date} ~ {end_date} ==="))
            
        self.stdout.write(f"DEBUG: 최종 시작일: {start_date}")
        self.stdout.write(f"DEBUG: 최종 종료일: {end_date}")
        self.stdout.write("DEBUG: 단계 4 - 날짜 범위 결정 완료")

        # 단계 5: 기존 데이터 삭제 (force 옵션이 있는 경우)
        if options.get('force'):
            self.stdout.write("DEBUG: 단계 5 - 기존 데이터 삭제 시작")
            self.stdout.write(self.style.WARNING("=== 기존 기상 데이터 삭제 중 ==="))
            
            # 지정된 기간의 기존 기상 데이터 삭제 (KMA 소스만)
            deleted_count = ExternalEnvironmentalData.objects.filter(
                data_source='KMA',
                data_timestamp__date__range=[start_date, end_date]
            ).delete()[0]
            
            self.stdout.write(self.style.SUCCESS(f"  -> {deleted_count}건의 기존 기상 데이터를 삭제했습니다."))
            self.stdout.write("DEBUG: 단계 5 - 기존 데이터 삭제 완료")

        # 단계 6: 기상 데이터 수집
        self.stdout.write("DEBUG: 단계 6 - 기상 데이터 수집 시작")
        self.stdout.write(self.style.SUCCESS(f"=== 기상 데이터 수집 시작 ==="))
        self.fetch_weather_data(start_date, end_date)
        self.stdout.write("DEBUG: 단계 6 - 기상 데이터 수집 완료")

        # 단계 7: 스크립트 완료
        self.stdout.write("DEBUG: 단계 7 - 스크립트 완료")
        self.stdout.write(self.style.SUCCESS("\n기상 데이터 수집 작업을 완료했습니다."))

    def parse_precipitation_value(self, value_str):
        """강수량 문자열 값을 숫자로 변환합니다."""
        if not value_str:
            return 0.0
        
        # 문자열 정리
        value_str = str(value_str).strip()
        
        # 특수 케이스 처리
        if value_str in ['강수없음', '강수 없음', '없음']:
            return 0.0
        elif value_str in ['1mm 미만', '1mm미만', '1mm 이하']:
            return 0.5  # 1mm 미만은 0.5mm로 처리
        elif value_str in ['강수예정없음', '예정없음']:
            return 0.0
        
        # 숫자 + mm 형태 처리 (예: '6.0mm', '21.0mm')
        if 'mm' in value_str:
            try:
                # mm 제거하고 숫자만 추출
                numeric_part = value_str.replace('mm', '').strip()
                return float(numeric_part)
            except ValueError:
                return 0.0
        
        # 일반 숫자 처리
        try:
            return float(value_str)
        except ValueError:
            return 0.0

    def fetch_weather_data(self, start_date, end_date):
        """기상청 ASOS 일자료 데이터를 수집하여 저장합니다."""
        
        objects_to_create = [] # DB에 일괄 저장할 객체 리스트
        current_date = start_date
        
        # ASOS 일자료 필드 매핑 (테스트에서 확인한 필드들)
        field_mapping = {
            'avgTa': ('avg_temp', '°C'),      # 평균기온
            'minTa': ('min_temp', '°C'),      # 최저기온  
            'maxTa': ('max_temp', '°C'),      # 최고기온
            'sumRn': ('precipitation', 'mm'), # 강수량
            'avgWs': ('avg_wind_speed', 'm/s'), # 평균풍속
            'avgRhm': ('avg_humidity', '%'),   # 평균습도
            'avgPa': ('avg_pressure', 'hPa'),  # 평균기압
        }
        
        while current_date <= end_date:
            date_str = current_date.strftime('%Y%m%d')
            self.stdout.write(f"  -> {current_date.strftime('%Y-%m-%d')} ASOS 일자료 수집 중...")

            # ASOS 일자료 수집
            for loc_name, station_code in ASOS_STATION_CODES.items():
                params = {
                    'serviceKey': self.at_api_key, 
                    'numOfRows': 10, 
                    'pageNo': 1, 
                    'dataType': 'JSON',
                    'dataCd': 'ASOS',  # 지상관측
                    'dateCd': 'DAY',   # 일자료
                    'startDt': date_str,
                    'endDt': date_str,
                    'stnIds': station_code
                }
                
                try:
                    response = requests.get(ASOS_API_BASE_URL, params=params, timeout=30)
                    
                    if response.status_code != 200:
                        self.stdout.write(self.style.WARNING(f"    - {loc_name} API 오류: {response.status_code}"))
                        continue
                        
                    data = response.json()
                    
                    # 응답 구조 확인
                    items = data.get('response', {}).get('body', {}).get('items', {})
                    if isinstance(items, dict):
                        items = items.get('item', [])
                    elif not isinstance(items, list):
                        items = []
                    
                    self.stdout.write(f"    - {loc_name} 지역 {date_str} 데이터 {len(items)}건 수신")
                    
                    for item in items:
                        # 관측 날짜 파싱
                        tm_str = item.get('tm', '')
                        if not tm_str:
                            continue
                            
                        try:
                            # tm 형식: "2022-01-01"
                            obs_date = datetime.datetime.strptime(tm_str, '%Y-%m-%d')
                        except ValueError:
                            continue
                        
                        # 각 필드별로 데이터 저장
                        for field_key, (data_type, unit) in field_mapping.items():
                            value_str = item.get(field_key, '')
                            
                            # 빈 값이나 결측값 처리
                            if value_str == '' or value_str == '-999' or value_str is None:
                                continue
                                
                            try:
                                value = float(value_str)
                                
                                objects_to_create.append(
                                    ExternalEnvironmentalData(
                                        data_source='KMA_ASOS',
                                        data_timestamp=obs_date,
                                        location_identifier=loc_name,
                                        data_type=data_type,
                                        value=value,
                                        unit=unit
                                    )
                                )
                            except (ValueError, TypeError) as e:
                                self.stdout.write(self.style.WARNING(f"    - {field_key} 파싱 오류: {e}"))
                                
                except requests.exceptions.RequestException as e:
                    self.stdout.write(self.style.WARNING(f"    - {loc_name} API 호출 오류: {e}"))
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"    - {loc_name} 데이터 처리 오류: {e}"))

            # 중간 저장 (메모리 효율성)
            if len(objects_to_create) >= 1000:
                self.stdout.write(f"    -> 중간 저장 중... ({len(objects_to_create)}건)")
                ExternalEnvironmentalData.objects.bulk_create(objects_to_create, ignore_conflicts=True)
                objects_to_create = []
            
            current_date += datetime.timedelta(days=1)
        
        # 최종 저장
        if objects_to_create:
            self.stdout.write(f"    -> 최종 저장 중... ({len(objects_to_create)}건)")
            ExternalEnvironmentalData.objects.bulk_create(objects_to_create, ignore_conflicts=True)
        
        self.stdout.write(self.style.SUCCESS(f"    -> ASOS 일자료 수집 완료"))

        # 전체 통계 출력
        total_created = ExternalEnvironmentalData.objects.filter(
            data_source='KMA_ASOS',
            data_timestamp__date__range=[start_date, end_date]
        ).count()
        
        self.stdout.write(self.style.SUCCESS(f"  -> 총 {total_created}개의 기상 데이터가 저장되었습니다."))
        
        # 데이터 타입별 통계
        type_stats = ExternalEnvironmentalData.objects.filter(
            data_source='KMA_ASOS',
            data_timestamp__date__range=[start_date, end_date]
        ).values('data_type').annotate(
            count=django.db.models.Count('id')
        ).order_by('-count')
        
        self.stdout.write("  -> 데이터 타입별 분포:")
        for stat in type_stats:
            self.stdout.write(f"    {stat['data_type']}: {stat['count']}건")
