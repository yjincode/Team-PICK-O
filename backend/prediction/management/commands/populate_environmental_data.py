# backend/prediction/management/commands/populate_environmental_data.py

import os
import sys
import django
import requests
import datetime
import xml.etree.ElementTree as ET
from dateutil.relativedelta import relativedelta
from django.core.management.base import BaseCommand, CommandParser
from django.conf import settings
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
# 기상청 API 위치 (예: 부산, 목포 등 주요 항구의 격자 X, Y 좌표)
KMA_LOCATIONS = {
    '부산': {'nx': 98, 'ny': 76},
    '목포': {'nx': 50, 'ny': 67},
    '인천': {'nx': 55, 'ny': 124},
}
# 한국해양조사원(KHOA) 관측소 코드 (테스트용 DT_0001 코드 사용)
KHOA_STATION_CODES = {'부산': 'DT_0001', '목포': 'DT_0001', '인천': 'DT_0001'}

# API URL들
KMA_API_BASE_URL = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst"
KHOA_API_BASE_URL = "https://www.khoa.go.kr/api/oceangrid/tideObsTemp/search.do"

class Command(BaseCommand):
    help = "노량진 경매 데이터 기간에 맞춰 수온 및 기상 데이터를 수집합니다."

    def add_arguments(self, parser: CommandParser):
        parser.add_argument('--start', type=str, help='데이터 수집 시작일 (YYYY-MM-DD 형식)')
        parser.add_argument('--end', type=str, help='데이터 수집 종료일 (YYYY-MM-DD 형식)')
        parser.add_argument('--force', action='store_true', help='기존 데이터를 덮어쓰기')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # API 키들은 handle 메서드에서 로드하도록 변경
        self.at_api_key = None
        self.khoa_api_key = None

    def handle(self, *args, **options):
        """스크립트 메인 로직"""
        self.stdout.write("=== 수온/기상 데이터 수집 스크립트 시작 ===")
        
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
        
        self.at_api_key = os.getenv('DATA_GO_KR_API_KEY')
        self.stdout.write(f"DEBUG: DATA_GO_KR_API_KEY 로드됨: {bool(self.at_api_key)}")
        
        self.khoa_api_key = os.getenv('KHOA_API_KEY')
        self.stdout.write(f"DEBUG: KHOA_API_KEY 로드됨: {bool(self.khoa_api_key)}")
        
        # API 키 확인 및 디버그 출력
        self.stdout.write("=== API 키 디버그 정보 ===")
        self.stdout.write(f"DEBUG: DATA_GO_KR_API_KEY = {self.at_api_key[:20] + '...' if self.at_api_key else 'None'}")
        self.stdout.write(f"DEBUG: KHOA_API_KEY = {self.khoa_api_key[:20] + '...' if self.khoa_api_key else 'None'}")
        
        # API 키 존재 여부 확인
        self.stdout.write(f"DEBUG: DATA_GO_KR_API_KEY exists: {bool(self.at_api_key)}")
        self.stdout.write(f"DEBUG: KHOA_API_KEY exists: {bool(self.khoa_api_key)}")
        self.stdout.write("=== API 키 디버그 정보 끝 ===")
        
        # 단계 3: API 키 확인
        self.stdout.write("DEBUG: 단계 3 - API 키 확인 시작")
        
        if not self.at_api_key:
            self.stdout.write(self.style.WARNING("DATA_GO_KR_API_KEY가 설정되지 않았습니다. 기상 데이터를 수집하지 않습니다."))
        else:
            self.stdout.write("DEBUG: DATA_GO_KR_API_KEY 확인됨")
            
        if not self.khoa_api_key:
            self.stdout.write(self.style.WARNING("KHOA_API_KEY가 설정되지 않았습니다. 수온 데이터를 수집하지 않습니다."))
        else:
            self.stdout.write("DEBUG: KHOA_API_KEY 확인됨")
            
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
            self.stdout.write(self.style.SUCCESS(f"=== 지정된 기간의 환경 데이터 수집 시작: {start_date_str} ~ {end_date_str} ==="))
        else:
            # 노량진 데이터 기간에 맞춰 기본값 설정 (2020-01-01 ~ 2025-08-18)
            start_date = datetime.date(2020, 1, 1)
            end_date = datetime.date(2025, 8, 18)
            self.stdout.write(self.style.SUCCESS(f"=== 노량진 데이터 기간에 맞춘 환경 데이터 수집 시작: {start_date} ~ {end_date} ==="))
            
        self.stdout.write(f"DEBUG: 최종 시작일: {start_date}")
        self.stdout.write(f"DEBUG: 최종 종료일: {end_date}")
        self.stdout.write("DEBUG: 단계 4 - 날짜 범위 결정 완료")

        # 단계 5: 기존 데이터 삭제 (force 옵션이 있는 경우)
        if options.get('force'):
            self.stdout.write("DEBUG: 단계 5 - 기존 데이터 삭제 시작")
            self.stdout.write(self.style.WARNING("=== 기존 환경 데이터 삭제 중 ==="))
            
            # 지정된 기간의 기존 데이터 삭제
            deleted_count = ExternalEnvironmentalData.objects.filter(
                data_timestamp__date__range=[start_date, end_date]
            ).delete()[0]
            
            self.stdout.write(self.style.SUCCESS(f"  -> {deleted_count}건의 기존 데이터를 삭제했습니다."))
            self.stdout.write("DEBUG: 단계 5 - 기존 데이터 삭제 완료")

        # 단계 6: 환경 데이터 수집
        self.stdout.write("DEBUG: 단계 6 - 환경 데이터 수집 시작")
        if self.at_api_key or self.khoa_api_key:
            self.stdout.write(self.style.SUCCESS(f"=== 환경 데이터 수집 시작 ==="))
            self.fetch_environmental_data(start_date, end_date)
        else:
            self.stdout.write(self.style.WARNING("=== API 키가 없어 환경 데이터를 수집하지 않습니다. ==="))
            
        self.stdout.write("DEBUG: 단계 6 - 환경 데이터 수집 완료")

        # 단계 7: 스크립트 완료
        self.stdout.write("DEBUG: 단계 7 - 스크립트 완료")
        self.stdout.write(self.style.SUCCESS("\n환경 데이터 수집 작업을 완료했습니다."))

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

    def fetch_environmental_data(self, start_date, end_date):
        """기상청(날씨)과 해양수산부(수온) 데이터를 수집하여 일괄 저장합니다."""
        
        objects_to_create = [] # DB에 일괄 저장할 객체 리스트
        current_date = start_date
        
        # 단위 매핑 정의
        unit_mapping = {
            'TMP': '°C',    # 기온
            'PCP': 'mm',     # 강수량
            'WSD': 'm/s',    # 풍속
            's_temp': '°C'   # 수온
        }
        
        total_days = (end_date - start_date).days + 1
        processed_days = 0
        
        while current_date <= end_date:
            date_str = current_date.strftime('%Y%m%d')
            processed_days += 1
            
            self.stdout.write(f"  -> [{processed_days}/{total_days}] {current_date.strftime('%Y-%m-%d')} 환경 데이터 수집 중...")

            # 1. 기상청 날씨 데이터 수집 (2021년 12월 30일까지만)
            if current_date <= datetime.date(2021, 12, 30) and self.at_api_key:
                for loc_name, coords in KMA_LOCATIONS.items():
                    params = {
                        'serviceKey': self.at_api_key, 'pageNo': 1, 'numOfRows': 1000, 'dataType': 'JSON',
                        'base_date': date_str, 'base_time': str('0500'), # 05시 발표 데이터 기준
                        'nx': coords['nx'], 'ny': coords['ny']
                    }
                    try:
                        response = requests.get(KMA_API_BASE_URL, params=params, timeout=15)
                        response.raise_for_status()
                        data = response.json()
                        
                        # 응답 구조 확인
                        items = data.get('response', {}).get('body', {}).get('items', {})
                        if isinstance(items, dict):
                            items = items.get('item', [])
                        elif not isinstance(items, list):
                            items = []
                        
                        for item in items:
                            # 필요한 데이터(기온, 강수량 등)만 필터링
                            if item.get('category') in ['TMP', 'PCP', 'WSD']: # 기온, 강수량, 풍속
                                try:
                                    # 강수량 데이터 파싱 개선
                                    fcst_value = item.get('fcstValue', '0')
                                    
                                    # 강수량(PCP)인 경우 문자열 값 처리
                                    if item.get('category') == 'PCP':
                                        value = self.parse_precipitation_value(fcst_value)
                                    else:
                                        value = float(fcst_value)
                                    
                                    # 예보 시각 계산 (base_date + base_time + fcstTime)
                                    base_datetime = datetime.datetime.strptime(
                                        f"{item['baseDate']} {item['baseTime']}", '%Y%m%d %H%M'
                                    )
                                    fcst_hour = int(item.get('fcstTime', '00')[:2])
                                    fcst_datetime = base_datetime.replace(hour=fcst_hour)
                                    
                                    objects_to_create.append(
                                        ExternalEnvironmentalData(
                                            data_source='KMA',
                                            data_timestamp=fcst_datetime,
                                            location_identifier=loc_name,
                                            data_type=item['category'],
                                            value=value,
                                            unit=unit_mapping.get(item['category'], 'unknown')
                                        )
                                    )
                                except (ValueError, KeyError) as e:
                                    self.stdout.write(self.style.WARNING(f"    - 기상청 데이터 파싱 오류: {e}"))
                                    
                    except requests.exceptions.RequestException as e:
                        self.stdout.write(self.style.WARNING(f"    - 기상청 API 호출 오류 ({loc_name}): {e}"))
                    except Exception as e:
                        self.stdout.write(self.style.WARNING(f"    - 기상청 데이터 처리 오류 ({loc_name}): {e}"))

            # 2. 한국해양조사원(KHOA) 수온 데이터 수집 (전체 기간)
            if self.khoa_api_key:
                for loc_name, station_code in KHOA_STATION_CODES.items():
                    params = {
                        'ServiceKey': self.khoa_api_key,  # KHOA 전용 API 키 사용
                        'ObsCode': station_code,
                        'Date': date_str,
                        'ResultType': 'json'
                    }
                    try:
                        response = requests.get(KHOA_API_BASE_URL, params=params, timeout=15)
                        response.raise_for_status()
                        
                        # JSON 응답 파싱
                        data = response.json()
                        
                        # 데이터 개수 확인
                        items = data.get('result', {}).get('data', [])
                        total_count = len(items) if isinstance(items, list) else 0
                        
                        if total_count == 0:
                            self.stdout.write(f"    - {loc_name} 지역 {date_str} 수온 데이터가 없습니다.")
                            continue
                        
                        for item in items:
                            try:
                                # JSON에서 수온 데이터 추출 (KHOA API 응답 구조에 맞게 수정)
                                if 'water_temp' in item:
                                    value = float(item['water_temp'])
                                    
                                    # 날짜 정보 추출 (record_time 필드 사용)
                                    if 'record_time' in item:
                                        data_date = datetime.datetime.strptime(item['record_time'], '%Y-%m-%d %H:%M:%S')
                                    else:
                                        data_date = datetime.datetime.strptime(date_str, '%Y%m%d')
                                    
                                    objects_to_create.append(
                                        ExternalEnvironmentalData(
                                            data_source='KHOA',
                                            data_timestamp=data_date,
                                            location_identifier=loc_name,
                                            data_type='s_temp', # surface temperature
                                            value=value,
                                            unit='°C'
                                        )
                                    )
                            except (ValueError, KeyError, AttributeError) as e:
                                self.stdout.write(self.style.WARNING(f"    - KHOA 데이터 파싱 오류: {e}"))
                                
                    except requests.exceptions.RequestException as e:
                        self.stdout.write(self.style.WARNING(f"    - KHOA API 호출 오류 ({loc_name}): {e}"))
                    except Exception as e:
                        self.stdout.write(self.style.WARNING(f"    - KHOA 데이터 처리 오류 ({loc_name}): {e}"))
            
            # 3. 진행률 표시 및 중간 저장 (1000건마다)
            if len(objects_to_create) >= 1000:
                try:
                    ExternalEnvironmentalData.objects.bulk_create(
                        objects_to_create, 
                        ignore_conflicts=True,
                        batch_size=1000
                    )
                    self.stdout.write(self.style.SUCCESS(f"  -> 중간 저장 완료: {len(objects_to_create)}건"))
                    objects_to_create = []  # 리스트 초기화
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"  -> 중간 저장 오류: {e}"))
            
            current_date += datetime.timedelta(days=1)

        # 루프가 끝난 후, 남은 데이터를 DB에 저장!
        if objects_to_create:
            try:
                ExternalEnvironmentalData.objects.bulk_create(
                    objects_to_create, 
                    ignore_conflicts=True,
                    batch_size=1000
                )
                self.stdout.write(self.style.SUCCESS(f"  -> 최종 저장 완료: {len(objects_to_create)}건"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  -> 최종 저장 오류: {e}"))
        
        # 전체 통계 출력
        total_created = ExternalEnvironmentalData.objects.filter(
            data_timestamp__date__range=[start_date, end_date]
        ).count()
        
        self.stdout.write(self.style.SUCCESS(f"  -> 총 {total_created}개의 환경 데이터가 저장되었습니다."))
        
        # 데이터 타입별 통계
        type_stats = ExternalEnvironmentalData.objects.filter(
            data_timestamp__date__range=[start_date, end_date]
        ).values('data_type').annotate(
            count=django.db.models.Count('id')
        ).order_by('-count')
        
        self.stdout.write("  -> 데이터 타입별 분포:")
        for stat in type_stats:
            self.stdout.write(f"    {stat['data_type']}: {stat['count']}건")
