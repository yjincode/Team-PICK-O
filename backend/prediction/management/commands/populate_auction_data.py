# backend/prediction/management/commands/populate_auction_data.py

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
from prediction.models import WholesaleMarket, FishSpecies, CommonCode, ActualAuctionPrice, ExternalEnvironmentalData

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

# --- 새로운 API URL ---
# 1. 수산물도매시장별도매경락가격조회 (2000-01-04 ~ 2023-12-31)
WHOLESALE_MARKET_PRICE_URL = "http://211.237.50.150:7080/openapi/sample/xml/Grid_20220822000000000623_1/1/5"
# 2. 도매시장 실시간 경락 정보 (최근까지)
REALTIME_AUCTION_INFO_URL = "http://211.237.50.150:7080/openapi/sample/xml/Grid_20240625000000000654_1/1/5"

# 기존 API URL들 (aT 경매가 제외)
AT_API_BASE_URL = "http://apis.data.go.kr/B552845/KatRealTime/"
AT_CODE_BASE_URL = "http://apis.data.go.kr/B552845/KatCode"
KMA_API_BASE_URL = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst"
KHOA_API_BASE_URL = "https://www.khoa.go.kr/api/oceangrid/tideObsTemp/search.do"

# 6종의 수산물 필터링을 위한 어종명 매핑
TARGET_FISH_SPECIES = {
    '넙치': ['넙치', '광어', '넙치넙치'],
    '조피볼락': ['조피볼락', '우럭',],
    '참돔': ['참돔','활 돔'],
    '가자미': ['가자미', '도다리', '문치가자미'],
    '농어': ['농어'],
    '숭어': ['숭어']
}

def is_target_fish_species(fish_name):
    """6종의 수산물에 해당하는지 확인합니다."""
    if not fish_name:
        return False
    
    fish_name_lower = fish_name.lower()
    for target_species, aliases in TARGET_FISH_SPECIES.items():
        for alias in aliases:
            if alias.lower() in fish_name_lower:
                return True
    return False


class Command(BaseCommand):
    help = "특정 기간의 경매 및 관련 데이터를 수집합니다. 날짜 미지정 시 어제 하루 데이터를 수집합니다."

    def add_arguments(self, parser: CommandParser):
        parser.add_argument('--start', type=str, help='데이터 수집 시작일 (YYYY-MM-DD 형식)')
        parser.add_argument('--end', type=str, help='데이터 수집 종료일 (YYYY-MM-DD 형식)')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # API 키들은 handle 메서드에서 로드하도록 변경
        self.api_key = None
        self.at_api_key = None
        self.khoa_api_key = None

    def handle(self, *args, **options):
        """스크립트 메인 로직"""
        self.stdout.write("=== 스크립트 시작 ===")
        
        # 단계 1: 환경변수 로드 시작
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
        self.api_key = os.getenv('AGRICULTURE_API_KEY')
        self.stdout.write(f"DEBUG: AGRICULTURE_API_KEY 로드됨: {bool(self.api_key)}")
        
        self.at_api_key = os.getenv('DATA_GO_KR_API_KEY')
        self.stdout.write(f"DEBUG: DATA_GO_KR_API_KEY 로드됨: {bool(self.at_api_key)}")
        
        self.khoa_api_key = os.getenv('KHOA_API_KEY')
        self.stdout.write(f"DEBUG: KHOA_API_KEY 로드됨: {bool(self.khoa_api_key)}")
        
        # API 키 확인 및 디버그 출력
        self.stdout.write("=== API 키 디버그 정보 ===")
        self.stdout.write(f"DEBUG: AGRICULTURE_API_KEY = {self.api_key[:20] + '...' if self.api_key else 'None'}")
        self.stdout.write(f"DEBUG: DATA_GO_KR_API_KEY = {self.at_api_key[:20] + '...' if self.at_api_key else 'None'}")
        self.stdout.write(f"DEBUG: KHOA_API_KEY = {self.khoa_api_key[:20] + '...' if self.khoa_api_key else 'None'}")
        
        # API 키 존재 여부 확인
        self.stdout.write(f"DEBUG: AGRICULTURE_API_KEY exists: {bool(self.api_key)}")
        self.stdout.write(f"DEBUG: DATA_GO_KR_API_KEY exists: {bool(self.at_api_key)}")
        self.stdout.write(f"DEBUG: KHOA_API_KEY exists: {bool(self.khoa_api_key)}")
        self.stdout.write("=== API 키 디버그 정보 끝 ===")
        
        # 단계 3: API 키 확인
        self.stdout.write("DEBUG: 단계 3 - API 키 확인 시작")
        
        if not self.api_key:
            self.stdout.write(self.style.WARNING("AGRICULTURE_API_KEY가 설정되지 않았습니다. 새로운 API 데이터를 수집하지 않습니다."))
        else:
            self.stdout.write("DEBUG: AGRICULTURE_API_KEY 확인됨")
            
        if not self.at_api_key:
            self.stdout.write(self.style.WARNING("DATA_GO_KR_API_KEY가 설정되지 않았습니다. 기존 API 데이터를 수집하지 않습니다."))
        else:
            self.stdout.write("DEBUG: DATA_GO_KR_API_KEY 확인됨")
            
        self.stdout.write("DEBUG: 단계 3 - API 키 확인 완료")

        # 단계 4: 마스터 데이터 업데이트
        self.stdout.write("DEBUG: 단계 4 - 마스터 데이터 업데이트 시작")
        self.stdout.write(self.style.SUCCESS("=== 1. 마스터 데이터 업데이트 시작 ==="))
        with transaction.atomic():
            self.populate_master_data()
        self.stdout.write("DEBUG: 단계 4 - 마스터 데이터 업데이트 완료")

        # 단계 5: 날짜 범위 결정
        self.stdout.write("DEBUG: 단계 5 - 날짜 범위 결정 시작")
        start_date_str = options.get('start')
        end_date_str = options.get('end')
        
        self.stdout.write(f"DEBUG: 시작일: {start_date_str}")
        self.stdout.write(f"DEBUG: 종료일: {end_date_str}")

        if start_date_str and end_date_str:
            start_date = datetime.datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.datetime.strptime(end_date_str, '%Y-%m-%d').date()
            self.stdout.write(self.style.SUCCESS(f"=== 2. 지정된 기간의 데이터 수집 시작: {start_date_str} ~ {end_date_str} ==="))
        else:
            yesterday = datetime.date.today() - datetime.timedelta(days=1)
            start_date = end_date = yesterday
            self.stdout.write(self.style.SUCCESS(f"=== 2. 최신 데이터 수집 시작: {start_date} ==="))
            
        self.stdout.write(f"DEBUG: 최종 시작일: {start_date}")
        self.stdout.write(f"DEBUG: 최종 종료일: {end_date}")
        self.stdout.write("DEBUG: 단계 5 - 날짜 범위 결정 완료")

        # 단계 6: 새로운 API 데이터 수집
        self.stdout.write("DEBUG: 단계 6 - 새로운 API 데이터 수집 시작")
        self.stdout.write(f"DEBUG: AGRICULTURE_API_KEY 존재 여부: {self.api_key is not None}")
        if self.api_key:
            self.stdout.write(self.style.SUCCESS("=== 3. 새로운 API 데이터 수집 시작 ==="))
            
            # 3-1. 수산물도매시장별도매경락가격조회 (2000-01-04 ~ 2023-12-31) - 주석처리
            # self.stdout.write("DEBUG: 수산물도매시장별도매경락가격조회 호출 시작")
            # self.fetch_wholesale_market_price(start_date, end_date)
            
            # 3-2. 도매시장 실시간 경락 정보 (2024-06-25 이후)
            self.stdout.write("DEBUG: 도매시장 실시간 경락 정보 호출 시작")
            self.fetch_realtime_auction_info(start_date, end_date)
        else:
            self.stdout.write(self.style.WARNING("=== 3. AGRICULTURE_API_KEY가 없어 새로운 API 데이터를 수집하지 않습니다. ==="))
            
        self.stdout.write("DEBUG: 단계 6 - 새로운 API 데이터 수집 완료")

        # 단계 7: KOSIS 어획량 데이터 수집 제거됨
        self.stdout.write("DEBUG: 단계 7 - KOSIS 어획량 데이터 수집 단계 제거됨")
        self.stdout.write("DEBUG: 단계 7 - KOSIS 어획량 데이터 수집 완료")

        # 단계 8: 환경 데이터 수집
        self.stdout.write("DEBUG: 단계 8 - 환경 데이터 수집 시작")
        if self.at_api_key:
            self.stdout.write(self.style.SUCCESS(f"=== 4. 일별 환경 데이터 수집 시작 ==="))
            self.fetch_environmental_data(start_date, end_date)
        else:
            self.stdout.write(self.style.WARNING("=== 4. DATA_GO_KR_API_KEY가 없어 환경 데이터를 수집하지 않습니다. ==="))
            
        self.stdout.write("DEBUG: 단계 8 - 환경 데이터 수집 완료")

        # 단계 9: 스크립트 완료
        self.stdout.write("DEBUG: 단계 9 - 스크립트 완료")
        self.stdout.write(self.style.SUCCESS("\n모든 데이터 수집 작업을 완료했습니다."))

    def fetch_wholesale_market_price(self, start_date, end_date):
        """수산물도매시장별도매경락가격조회 API를 통해 데이터를 수집합니다."""
        self.stdout.write(f"  -> 수산물도매시장별도매경락가격조회 데이터 수집 중...")
        
        current_date = start_date
        while current_date <= end_date:
            # 2023-12-31 이후 데이터는 수집하지 않음
            if current_date > datetime.date(2023, 12, 31):
                self.stdout.write(f"    -> {current_date}는 2023-12-31 이후로 데이터가 없습니다.")
                break
                
            date_str = current_date.strftime('%Y%m%d')
            
            # 올바른 파라미터 조합
            params = {
                'API_KEY': self.api_key,
                'TYPE': 'xml',  # XML로 변경
                'API_URL': 'Grid_20220822000000000623_1',
                'START_INDEX': 1,
                'END_INDEX': 1000,
                'DATES': date_str
            }
            
            try:
                self.stdout.write(f"    -> {date_str} 도매경락가격 API 호출 중...")
                response = requests.get(WHOLESALE_MARKET_PRICE_URL, params=params, timeout=30)
                self.stdout.write(f"    -> 응답 상태 코드: {response.status_code}")
                
                if response.status_code != 200:
                    self.stdout.write(f"    -> HTTP 오류: {response.text[:200]}")
                    current_date += datetime.timedelta(days=1)
                    continue
                
                response.raise_for_status()
                
                # XML 파싱
                root = ET.fromstring(response.content)
                
                # totalCnt 확인
                total_cnt = root.find('totalCnt')
                if total_cnt is not None:
                    total_count = int(total_cnt.text)
                    self.stdout.write(f"    -> 총 데이터 개수: {total_count}")
                    
                    if total_count == 0:
                        self.stdout.write(f"    -> {date_str} 도매경락가격 데이터가 없습니다.")
                        current_date += datetime.timedelta(days=1)
                        continue
                
                # row 데이터 파싱
                rows = root.findall('row')
                if rows:
                    # 6종의 수산물에 대해서만 필터링
                    filtered_rows = []
                    for row in rows:
                        row_data = {}
                        for child in row:
                            row_data[child.tag] = child.text
                        
                        # 어종명 확인 (MCLASSNAME 또는 SCLASSNAME에서)
                        fish_name = row_data.get('MCLASSNAME', '') or row_data.get('SCLASSNAME', '')
                        if is_target_fish_species(fish_name):
                            filtered_rows.append(row)
                    
                    if filtered_rows:
                        self.stdout.write(f"    -> {date_str} 도매경락가격 데이터 수집 완료 (6종 필터링: {len(filtered_rows)}건)")
                        
                        # 첫 번째 row의 구조 확인
                        if filtered_rows:
                            first_row = filtered_rows[0]
                            row_data = {}
                            for child in first_row:
                                row_data[child.tag] = child.text
                            self.stdout.write(f"    -> 첫 번째 데이터 구조: {row_data}")
                            
                            # 여기서 DB 저장 로직 추가 가능
                            self.save_wholesale_market_data(filtered_rows, current_date)
                    else:
                        self.stdout.write(f"    -> {date_str} 도매경락가격 데이터에서 6종 수산물이 없습니다.")
                else:
                    self.stdout.write(f"    -> {date_str} 도매경락가격 데이터가 없습니다.")
                        
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"    -> {date_str} 도매경락가격 API 오류: {e}"))
                if hasattr(e, 'response') and e.response is not None:
                    self.stdout.write(f"    -> 응답 내용: {e.response.text[:200]}")
            
            # API 요청 간격 조정 (3초 대기)
            import time
            time.sleep(3)
            current_date += datetime.timedelta(days=1)

    def fetch_realtime_auction_info(self, start_date, end_date):
        """도매시장 실시간 경락 정보 API를 통해 데이터를 수집합니다."""
        self.stdout.write(f"  -> 도매시장 실시간 경락 정보 데이터 수집 중...")
        
        current_date = start_date
        while current_date <= end_date:
            # 2020년 데이터도 수집 가능하도록 조건 수정
            # if current_date < datetime.date(2024, 6, 25):
            #     self.stdout.write(f"    -> {current_date}는 2024-06-25 이전으로 데이터가 없습니다.")
            #     current_date += datetime.timedelta(days=1)
            #     continue
                
            date_str = current_date.strftime('%Y%m%d')
            
            # 수산물 도매시장 코드들 (임시로 하드코딩, 실제로는 API에서 조회)
            fish_market_codes = ['110001', '110002', '110003']  # 부산, 목포, 인천
            
            for market_code in fish_market_codes:
                params = {
                    'serviceKey': self.api_key,
                    'pageNo': 1,
                    'numOfRows': 1000,
                    'type': 'xml',
                    'saleDate': date_str,
                    'whslMrktCd': market_code
                }
            
            try:
                self.stdout.write(f"    -> {date_str} 실시간경락정보 API 호출 중...")
                response = requests.get(AT_API_BASE_URL, params=params, timeout=30)
                self.stdout.write(f"    -> 응답 상태 코드: {response.status_code}")
                
                if response.status_code != 200:
                    self.stdout.write(f"    -> HTTP 오류: {response.text[:200]}")
                    current_date += datetime.timedelta(days=1)
                    continue
                
                response.raise_for_status()
                
                # XML 파싱
                root = ET.fromstring(response.content)
                
                # totalCnt 확인
                total_cnt = root.find('totalCnt')
                if total_cnt is not None:
                    total_count = int(total_cnt.text)
                    self.stdout.write(f"    -> 총 데이터 개수: {total_count}")
                    
                    if total_count == 0:
                        self.stdout.write(f"    -> {date_str} 실시간경락정보 데이터가 없습니다.")
                        current_date += datetime.timedelta(days=1)
                        continue
                
                # row 데이터 파싱
                rows = root.findall('row')
                if rows:
                    # 6종의 수산물에 대해서만 필터링
                    filtered_rows = []
                    for row in rows:
                        row_data = {}
                        for child in row:
                            row_data[child.tag] = child.text
                        
                        # 어종 코드 확인 (gdsMclsfCd 또는 gdsSclsfCd에서)
                        fish_code = row_data.get('gdsMclsfCd', '') or row_data.get('gdsSclsfCd', '')
                        fish_name = row_data.get('gdsMclsfNm', '') or row_data.get('gdsSclsfNm', '')
                        
                        # 6종 어종 필터링 (코드 또는 이름으로)
                        if is_target_fish_species(fish_name) or fish_code in ['001', '002', '003', '004', '005', '006']:
                            filtered_rows.append(row)
                    
                    if filtered_rows:
                        self.stdout.write(f"    -> {date_str} 실시간경락정보 데이터 수집 완료 (6종 필터링: {len(filtered_rows)}건)")
                        # 여기서 DB 저장 로직 추가 가능
                        self.save_realtime_auction_info_data(filtered_rows, current_date)
                    else:
                        self.stdout.write(f"    -> {date_str} 실시간경락정보 데이터에서 6종 수산물이 없습니다.")
                else:
                    self.stdout.write(f"    -> {date_str} 실시간경락정보 데이터가 없습니다.")
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"    -> {date_str} 실시간경락정보 API 오류: {e}"))
                if hasattr(e, 'response') and e.response is not None:
                    self.stdout.write(f"    -> 응답 내용: {e.response.text[:200]}")
            
            # API 요청 간격 조정 (3초 대기)
            import time
            time.sleep(3)
            current_date += datetime.timedelta(days=1)

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

    def _fetch_api_data(self, base_url, endpoint, params={}):
        """API 데이터를 가져오는 공통 함수"""
        try:
            response = requests.get(f"{base_url}/{endpoint}", params=params, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            self.stdout.write(self.style.ERROR(f"API 호출 오류: {e}"))
            return None
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"데이터 처리 오류: {e}"))
            return None

    def populate_master_data(self):
        """마스터 데이터를 업데이트합니다."""
        # 도매시장 코드 조회
        self.fetch_wholesale_market_codes()
        
        # 도매시장 데이터 (임시로 하드코딩, 실제로는 API에서 조회)
        markets_data = [
            {'market_api_code': '110001', 'market_name_kr': '부산수산물도매시장', 'location': '부산'},
            {'market_api_code': '110002', 'market_name_kr': '목포수산물도매시장', 'location': '목포'},
            {'market_api_code': '110003', 'market_name_kr': '인천수산물도매시장', 'location': '인천'},
        ]
        
        for market_data in markets_data:
            WholesaleMarket.objects.get_or_create(
                market_api_code=market_data['market_api_code'],
                defaults=market_data
            )
        
        # 어종 데이터
        species_data = [
            {'item_small_category_code': '531200', 'item_small_category_name_kr': '넙치', 'item_large_category_code': '53', 'item_large_category_name_kr': '어류', 'item_medium_category_code': '531', 'item_medium_category_name_kr': '넙치류'},
            {'item_small_category_code': '532100', 'item_small_category_name_kr': '조피볼락', 'item_large_category_code': '53', 'item_large_category_name_kr': '어류', 'item_medium_category_code': '532', 'item_medium_category_name_kr': '볼락류'},
            {'item_small_category_code': '533100', 'item_small_category_name_kr': '참돔', 'item_large_category_code': '53', 'item_large_category_name_kr': '어류', 'item_medium_category_code': '533', 'item_medium_category_name_kr': '돔류'},
            {'item_small_category_code': '542100', 'item_small_category_name_kr': '숭어', 'item_large_category_code': '54', 'item_large_category_name_kr': '어류', 'item_medium_category_code': '542', 'item_medium_category_name_kr': '숭어류'},
            {'item_small_category_code': '531400', 'item_small_category_name_kr': '가자미', 'item_large_category_code': '53', 'item_large_category_name_kr': '어류', 'item_medium_category_code': '531', 'item_medium_category_name_kr': '가자미류'},
            {'item_small_category_code': '534100', 'item_small_category_name_kr': '농어', 'item_large_category_code': '53', 'item_large_category_name_kr': '어류', 'item_medium_category_code': '534', 'item_medium_category_name_kr': '농어류'},
        ]
        
        for species_data_item in species_data:
            FishSpecies.objects.get_or_create(
                item_small_category_code=species_data_item['item_small_category_code'],
                defaults=species_data_item
            )
        
        # 공통 코드 데이터
        common_codes = [
            {'code_type': 'UNIT', 'code_value': 'KG', 'code_name_kr': '킬로그램'},
            {'code_type': 'UNIT', 'code_value': 'BOX', 'code_name_kr': '박스'},
            {'code_type': 'PLOR', 'code_value': 'BUSAN', 'code_name_kr': '부산'},
            {'code_type': 'PLOR', 'code_value': 'MOKPO', 'code_name_kr': '목포'},
            {'code_type': 'PLOR', 'code_value': 'INCHEON', 'code_name_kr': '인천'},
            {'code_type': 'PKG', 'code_value': 'FRESH', 'code_name_kr': '신선'},
            {'code_type': 'PKG', 'code_value': 'FROZEN', 'code_name_kr': '냉동'},
            {'code_type': 'GRD', 'code_value': 'A', 'code_name_kr': 'A등급'},
            {'code_type': 'GRD', 'code_value': 'B', 'code_name_kr': 'B등급'},
            {'code_type': 'GRD', 'code_value': 'C', 'code_name_kr': 'C등급'},
        ]
        
        for code_data in common_codes:
            CommonCode.objects.get_or_create(
                code_type=code_data['code_type'],
                code_value=code_data['code_value'],
                defaults=code_data
            )
        
        self.stdout.write(self.style.SUCCESS("  -> 마스터 데이터 업데이트 완료"))

    def save_wholesale_market_data(self, rows, current_date):
        """수산물도매시장별도매경락가격조회 API 데이터를 정규화하여 저장합니다."""
        processed_count = 0
        
        for row in rows:
            try:
                with transaction.atomic():
                    # XML 데이터를 딕셔너리로 변환
                    row_data = {}
                    for child in row:
                        row_data[child.tag] = child.text
                    
                    # 1. 날짜 정규화 (YYYYMMDD -> YYYY-MM-DD)
                    date_str = row_data.get('DATES', '')
                    if not date_str:
                        continue
                        
                    try:
                        trade_date = datetime.datetime.strptime(date_str, '%Y%m%d').date()
                    except ValueError:
                        self.stdout.write(f"    -> 날짜 파싱 오류: {date_str}")
                        continue
                    
                    # 2. 어종명 매핑 (MCLASSNAME + SCLASSNAME -> FishSpecies)
                    mclass_name = row_data.get('MCLASSNAME', '')
                    sclass_name = row_data.get('SCLASSNAME', '')
                    fish_name = f"{mclass_name} {sclass_name}".strip()
                    
                    # 6종의 수산물에 해당하는지 확인
                    if not is_target_fish_species(fish_name):
                        continue
                    
                    # 어종명으로 FishSpecies 찾기
                    fish_species = FishSpecies.objects.filter(
                        item_small_category_name_kr__icontains=mclass_name
                    ).first()
                    
                    if not fish_species:
                        # 새로운 어종이면 생성
                        fish_species, created = FishSpecies.objects.get_or_create(
                            item_small_category_name_kr=mclass_name,
                            defaults={
                                'item_small_category_code': f"NEW_{mclass_name}",
                                'item_large_category_code': '53',
                                'item_large_category_name_kr': '어류',
                                'item_medium_category_code': '531',
                                'item_medium_category_name_kr': f'{mclass_name}류'
                            }
                        )
                        if created:
                            self.stdout.write(f"    -> 새로운 어종 생성: {mclass_name}")
                    
                    # 3. 도매시장 매핑 (MARKETNAME -> WholesaleMarket)
                    market_name = row_data.get('MARKETNAME', '')
                    market = WholesaleMarket.objects.filter(
                        market_name_kr__icontains=market_name
                    ).first()
                    
                    if not market:
                        # 새로운 도매시장이면 생성
                        market, created = WholesaleMarket.objects.get_or_create(
                            market_name_kr=market_name,
                            defaults={
                                'market_api_code': f"NEW_{market_name}",
                                'location': market_name
                            }
                        )
                        if created:
                            self.stdout.write(f"    -> 새로운 도매시장 생성: {market_name}")
                    
                    # 4. 등급 매핑 (GRADENAME -> CommonCode)
                    grade_name = row_data.get('GRADENAME', '')
                    grade_code = None
                    if grade_name:
                        grade_code, created = CommonCode.objects.get_or_create(
                            code_type='GRD',
                            code_value=grade_name,
                            defaults={'code_name_kr': grade_name}
                        )
                        if created:
                            self.stdout.write(f"    -> 새로운 등급 생성: {grade_name}")
                    
                    # 5. 단위 매핑 (UNITNAME -> CommonCode)
                    unit_name = row_data.get('UNITNAME', '').strip()
                    unit_code = None
                    if unit_name:
                        # 단위 정규화 (예: "1kg" -> "KG")
                        if 'kg' in unit_name.lower():
                            unit_name = 'KG'
                        elif 'box' in unit_name.lower():
                            unit_name = 'BOX'
                        
                        unit_code, created = CommonCode.objects.get_or_create(
                            code_type='UNIT',
                            code_value=unit_name,
                            defaults={'code_name_kr': unit_name}
                        )
                        if created:
                            self.stdout.write(f"    -> 새로운 단위 생성: {unit_name}")
                    else:
                        # 단위가 없으면 기본값 'KG' 사용
                        unit_code, created = CommonCode.objects.get_or_create(
                            code_type='UNIT',
                            code_value='KG',
                            defaults={'code_name_kr': '킬로그램'}
                        )
                    
                    # 6. 가격 정규화 (문자열 -> Decimal)
                    avg_price_str = row_data.get('AVGPRICE', '0')
                    try:
                        auction_price = float(avg_price_str)
                    except ValueError:
                        self.stdout.write(f"    -> 가격 파싱 오류: {avg_price_str}")
                        continue
                    
                    # 7. 거래량 정규화 (문자열 -> Decimal)
                    sum_amt_str = row_data.get('SUMAMT', '0')
                    try:
                        trade_volume = float(sum_amt_str)
                    except ValueError:
                        self.stdout.write(f"    -> 거래량 파싱 오류: {sum_amt_str}")
                        continue
                    
                    # 8. 고유 ID 생성
                    auction_sequence_id = f"WHOLESALE_{trade_date}_{market.market_api_code}_{fish_species.item_small_category_code}_{grade_name}"
                    
                    # 9. 필수 코드들 가져오기
                    origin_place_code = CommonCode.objects.filter(code_type='PLOR', code_value='BUSAN').first()
                    package_code = CommonCode.objects.filter(code_type='PKG', code_value='FRESH').first()
                    
                    # 필수 코드가 없으면 생성
                    if not origin_place_code:
                        origin_place_code = CommonCode.objects.create(
                            code_type='PLOR', code_value='BUSAN', code_name_kr='부산'
                        )
                    if not package_code:
                        package_code = CommonCode.objects.create(
                            code_type='PKG', code_value='FRESH', code_name_kr='신선'
                        )
                    
                    # 10. ActualAuctionPrice 객체 생성 및 저장
                    auction_data = ActualAuctionPrice(
                        auction_sequence_id=auction_sequence_id,
                        trade_date=trade_date,
                        market=market,
                        fish_species=fish_species,
                        grade_code=grade_code,
                        unit_code=unit_code,
                        trade_volume=trade_volume,
                        auction_price=auction_price,
                        origin_place_code=origin_place_code,
                        package_code=package_code,
                    )
                    
                    auction_data.save()
                    processed_count += 1
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"    -> 데이터 저장 오류: {e}"))
                continue
        
        self.stdout.write(self.style.SUCCESS(f"    -> {processed_count}건의 데이터를 저장했습니다."))

    def fetch_wholesale_market_codes(self):
        """도매시장 코드를 조회합니다."""
        self.stdout.write("  -> 도매시장 코드 조회 중...")
        
        params = {
            'serviceKey': self.at_api_key,
            'type': 'xml'
        }
        
        try:
            response = requests.get(f"{AT_CODE_BASE_URL}/wholesaleMarkets", params=params, timeout=30)
            self.stdout.write(f"  -> 응답 상태 코드: {response.status_code}")
            
            if response.status_code != 200:
                self.stdout.write(f"  -> HTTP 오류: {response.text[:200]}")
                return
            
            response.raise_for_status()
            
            # XML 파싱
            root = ET.fromstring(response.content)
            
            # row 데이터 파싱
            rows = root.findall('row')
            if rows:
                self.stdout.write(f"  -> 도매시장 코드 조회 완료: {len(rows)}건")
                
                # 수산물 도매시장 필터링
                fish_markets = []
                for row in rows:
                    row_data = {}
                    for child in row:
                        row_data[child.tag] = child.text
                    
                    market_name = row_data.get('whslMrktNm', '')
                    market_code = row_data.get('whslMrktCd', '')
                    
                    # 수산물 관련 키워드로 필터링
                    if any(keyword in market_name for keyword in ['수산물', '수산', '어항', '어시장']):
                        fish_markets.append({
                            'code': market_code,
                            'name': market_name
                        })
                        self.stdout.write(f"    -> {market_code}: {market_name}")
                
                self.stdout.write(f"  -> 수산물 도매시장: {len(fish_markets)}건")
                return fish_markets
            else:
                self.stdout.write("  -> 도매시장 코드 데이터가 없습니다.")
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"  -> 도매시장 코드 조회 오류: {e}"))
            if hasattr(e, 'response') and e.response is not None:
                self.stdout.write(f"  -> 응답 내용: {e.response.text[:200]}")
            return []

    def save_realtime_auction_info_data(self, rows, current_date):
        """실시간 경락 정보 데이터를 DB에 저장합니다."""
        if not rows:
            self.stdout.write(self.style.WARNING(f"    -> {current_date} 실시간 경락 정보 데이터가 없습니다."))
            return

        saved_count = 0
        for row in rows:
            try:
                with transaction.atomic():
                    # 필수 필드 확인
                    if not all(key in row for key in ['market_name', 'item_name', 'trade_date', 'trade_time', 'trade_volume', 'auction_price']):
                        continue

                    # 도매시장 찾기
                    market_name = row.get('market_name', '').strip()
                    market = WholesaleMarket.objects.filter(market_name_kr__icontains=market_name).first()
                    if not market:
                        self.stdout.write(self.style.WARNING(f"    -> 도매시장 매핑 실패 ({market_name})"))
                        continue

                    # 어종 필터링 (6종 수산물만)
                    item_name = row.get('item_name', '').strip()
                    if not is_target_fish_species(item_name):
                        continue

                    # 어종 찾기 또는 생성
                    fish_species, created = FishSpecies.objects.get_or_create(
                        item_small_category_name=item_name,
                        defaults={
                            'item_small_category_code': f"FISH_{item_name}",
                            'item_middle_category_name': '수산물',
                            'item_large_category_name': '수산물'
                        }
                    )

                    # 거래 날짜 파싱
                    trade_date_str = row.get('trade_date', '')
                    if not trade_date_str:
                        continue
                    
                    try:
                        trade_date = datetime.datetime.strptime(trade_date_str, '%Y-%m-%d').date()
                    except ValueError:
                        continue

                    # 거래 시간 파싱
                    trade_time_str = row.get('trade_time', '')
                    trade_timestamp = None
                    if trade_time_str:
                        try:
                            time_obj = datetime.datetime.strptime(trade_time_str, '%H:%M:%S').time()
                            trade_timestamp = datetime.datetime.combine(trade_date, time_obj)
                        except ValueError:
                            trade_timestamp = datetime.datetime.combine(trade_date, datetime.time(0, 0))

                    # 필수 코드들 가져오기
                    origin_place_code = CommonCode.objects.filter(code_type='PLOR', code_value='BUSAN').first()
                    package_code = CommonCode.objects.filter(code_type='PKG', code_value='FRESH').first()
                    unit_code = CommonCode.objects.filter(code_type='UNIT', code_value='KG').first()
                    
                    # 필수 코드가 없으면 생성
                    if not origin_place_code:
                        origin_place_code = CommonCode.objects.create(
                            code_type='PLOR', code_value='BUSAN', code_name_kr='부산'
                        )
                    if not package_code:
                        package_code = CommonCode.objects.create(
                            code_type='PKG', code_value='FRESH', code_name_kr='신선'
                        )
                    if not unit_code:
                        unit_code = CommonCode.objects.create(
                            code_type='UNIT', code_value='KG', code_name_kr='킬로그램'
                        )

                    # 경매 데이터 생성
                    auction_data = ActualAuctionPrice(
                        auction_sequence_id=f"REALTIME_{trade_date}_{market.market_api_code}_{fish_species.item_small_category_code}_{saved_count}",
                        trade_date=trade_date,
                        trade_timestamp=trade_timestamp,
                        market=market,
                        fish_species=fish_species,
                        origin_place_code=origin_place_code,
                        package_code=package_code,
                        unit_code=unit_code,
                        trade_volume=float(row.get('trade_volume', 0)),
                        auction_price=float(row.get('auction_price', 0)),
                        unit_weight_kg=float(row.get('unit_weight_kg', 1.0))
                    )
                    auction_data.save()
                    saved_count += 1

            except (ValueError, KeyError, TypeError) as e:
                self.stdout.write(self.style.WARNING(f"    -> 실시간 경락 정보 데이터 파싱 오류: {e}"))
                continue

        self.stdout.write(self.style.SUCCESS(f"    -> {current_date} 실시간 경락 정보 데이터 저장 완료 ({saved_count}건)"))

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
        
        while current_date <= end_date:
            date_str = current_date.strftime('%Y%m%d')
            self.stdout.write(f"  -> {current_date.strftime('%Y-%m-%d')} 환경 데이터 수집 중...")

            # 1. 기상청 날씨 데이터 수집
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

            # 2. 한국해양조사원(KHOA) 수온 데이터 수집
            if not self.khoa_api_key:
                self.stdout.write(self.style.WARNING(f"    - KHOA API 키가 없어 수온 데이터를 수집하지 않습니다."))
                continue
                
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
                    
                    # API 응답 내용을 먼저 확인
                    self.stdout.write(f"    - KHOA API 응답 상태: {response.status_code}")
                    self.stdout.write(f"    - KHOA API 응답 헤더: {dict(response.headers)}")
                    self.stdout.write(f"    - KHOA API 응답 내용: {response.text[:500]}...")
                    
                    # JSON 응답 파싱
                    data = response.json()
                    
                    # 데이터 개수 확인
                    items = data.get('result', {}).get('data', [])
                    total_count = len(items) if isinstance(items, list) else 0
                    self.stdout.write(f"    - KHOA 데이터 개수: {total_count}")
                    
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
            
            current_date += datetime.timedelta(days=1)

        # 루프가 끝난 후, 수집된 모든 데이터를 DB에 한 번에 저장!
        if objects_to_create:
            try:
                ExternalEnvironmentalData.objects.bulk_create(
                    objects_to_create, 
                    ignore_conflicts=True,
                    batch_size=1000  # 대용량 데이터 처리를 위한 배치 크기 설정
                )
                self.stdout.write(self.style.SUCCESS(f"  -> 총 {len(objects_to_create)}개의 환경 데이터를 DB에 일괄 저장했습니다."))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  -> 환경 데이터 DB 저장 오류: {e}"))
        else:
            self.stdout.write(self.style.WARNING("  -> 수집된 환경 데이터가 없습니다."))