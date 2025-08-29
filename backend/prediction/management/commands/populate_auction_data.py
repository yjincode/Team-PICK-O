# backend/prediction/management/commands/populate_auction_data.py

import requests
import datetime
import xml.etree.ElementTree as ET
from dateutil.relativedelta import relativedelta
from django.core.management.base import BaseCommand, CommandParser
from django.conf import settings
from django.db import transaction
from prediction.models import WholesaleMarket, FishSpecies, CommonCode, ActualAuctionPrice, ActualCatchVolume, ExternalEnvironmentalData

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
# 1. 실시간경매속보서비스 (2023-12-30까지)
REALTIME_AUCTION_NEWS_URL = "http://211.237.50.150:7080/openapi/sample/xml/Api_20161208000000000395_1"
# 2. 수산물도매시장별도매경락가격조회 (2000-01-04 ~ 2023-12-31)
WHOLESALE_MARKET_PRICE_URL = "http://211.237.50.150:7080/openapi/sample/xml/Grid_20220822000000000623_1"
# 3. 도매시장 실시간 경락 정보 (최근까지)
REALTIME_AUCTION_INFO_URL = "http://211.237.50.150:7080/openapi/sample/xml/Grid_20240625000000000654_1"

# 기존 API URL들
AT_API_BASE_URL = "http://apis.data.go.kr/B552845/KatRealTime/"
AT_MARKET_PRICE_URL = "http://apis.data.go.kr/B552845/KatRealTime/trades"
AT_CODE_BASE_URL = "http://apis.data.go.kr/B552845/KatCode"
KOSIS_API_BASE_URL = "https://kosis.kr/openapi/statisticsData.do"
KMA_API_BASE_URL = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst"
KHOA_API_BASE_URL = "https://www.khoa.go.kr/api/oceangrid/tideObsTemp/search.do"

# 경매 데이터 수집 대상 어종 코드
TARGET_FISH_CODES_AT = [
    '531200', '532100', '533100', '542100', '531400', '534100'
]


class Command(BaseCommand):
    help = "특정 기간의 경매 및 관련 데이터를 수집합니다. 날짜 미지정 시 어제 하루 데이터를 수집합니다."

    def add_arguments(self, parser: CommandParser):
        parser.add_argument('--start', type=str, help='데이터 수집 시작일 (YYYY-MM-DD 형식)')
        parser.add_argument('--end', type=str, help='데이터 수집 종료일 (YYYY-MM-DD 형식)')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # API 키들을 .env에서 가져오기
        self.api_key = getattr(settings, 'AGRICULTURE_API_KEY', None)  # 농림축산식품부 API 키
        self.at_api_key = getattr(settings, 'DATA_GO_KR_API_KEY', None)
        self.kosis_api_key = getattr(settings, 'KOSIS_API_KEY', None)
        self.khoa_api_key = getattr(settings, 'KHOA_API_KEY', None)

    @transaction.atomic
    def handle(self, *args, **options):
        """스크립트 메인 로직"""
        # API 키 확인
        if not self.api_key:
            self.stdout.write(self.style.WARNING("AGRICULTURE_API_KEY가 설정되지 않았습니다. 새로운 API 데이터를 수집하지 않습니다."))
        if not self.at_api_key:
            self.stdout.write(self.style.WARNING("DATA_GO_KR_API_KEY가 설정되지 않았습니다. 기존 API 데이터를 수집하지 않습니다."))
        if not self.kosis_api_key:
            self.stdout.write(self.style.WARNING("KOSIS_API_KEY가 설정되지 않았습니다. KOSIS 데이터를 수집하지 않습니다."))

        # 1. 마스터 데이터 업데이트
        self.stdout.write(self.style.SUCCESS("=== 1. 마스터 데이터 업데이트 시작 ==="))
        self.populate_master_data()

        # 2. 날짜 범위 결정
        start_date_str = options.get('start')
        end_date_str = options.get('end')

        if start_date_str and end_date_str:
            start_date = datetime.datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.datetime.strptime(end_date_str, '%Y-%m-%d').date()
            self.stdout.write(self.style.SUCCESS(f"=== 2. 지정된 기간의 데이터 수집 시작: {start_date_str} ~ {end_date_str} ==="))
        else:
            yesterday = datetime.date.today() - datetime.timedelta(days=1)
            start_date = end_date = yesterday
            self.stdout.write(self.style.SUCCESS(f"=== 2. 최신 데이터 수집 시작: {start_date} ==="))

        # 3. 새로운 API 데이터 수집 실행 (API 키가 있을 때만)
        if self.api_key:
            self.stdout.write(self.style.SUCCESS("=== 3. 새로운 API 데이터 수집 시작 ==="))
            
            # 3-1. 실시간경매속보서비스 (2023-12-30까지)
            self.fetch_realtime_auction_news(start_date, end_date)
            
            # 3-2. 수산물도매시장별도매경락가격조회 (2000-01-04 ~ 2023-12-31)
            self.fetch_wholesale_market_price(start_date, end_date)
            
            # 3-3. 도매시장 실시간 경락 정보 (최근까지)
            self.fetch_realtime_auction_info(start_date, end_date)
        else:
            self.stdout.write(self.style.WARNING("=== 3. AGRICULTURE_API_KEY가 없어 새로운 API 데이터를 수집하지 않습니다. ==="))

        # 4. 기존 API 데이터 수집 (API 키가 있을 때만)
        if self.at_api_key:
            self.stdout.write(self.style.SUCCESS(f"=== 4. 기존 API 데이터 수집 시작 ==="))
            current_date = start_date
            while current_date <= end_date:
                self.fetch_daily_auction_data(current_date)
                current_date += datetime.timedelta(days=1)
        else:
            self.stdout.write(self.style.WARNING("=== 4. DATA_GO_KR_API_KEY가 없어 기존 API 데이터를 수집하지 않습니다. ==="))

        # 5. 어획량 데이터 수집 실행 (API 키가 있을 때만)
        if self.kosis_api_key:
            self.stdout.write(self.style.SUCCESS(f"=== 5. 월별 어획량 데이터 수집 시작: {start_date.year}년 ~ {end_date.year}년 ==="))
            self.fetch_kosis_catch_data(start_date, end_date)
        else:
            self.stdout.write(self.style.WARNING("=== 5. KOSIS_API_KEY가 없어 어획량 데이터를 수집하지 않습니다. ==="))

        # 6. 환경 데이터 수집 실행 (API 키가 있을 때만)
        if self.at_api_key:
            self.stdout.write(self.style.SUCCESS(f"=== 6. 일별 환경 데이터 수집 시작 ==="))
            self.fetch_environmental_data(start_date, end_date)
        else:
            self.stdout.write(self.style.WARNING("=== 6. DATA_GO_KR_API_KEY가 없어 환경 데이터를 수집하지 않습니다. ==="))

        self.stdout.write(self.style.SUCCESS("\n모든 데이터 수집 작업을 완료했습니다."))

    def fetch_realtime_auction_news(self, start_date, end_date):
        """실시간경매속보서비스 API를 통해 데이터를 수집합니다."""
        self.stdout.write(f"  -> 실시간경매속보서비스 데이터 수집 중...")
        
        current_date = start_date
        while current_date <= end_date:
            # 2023-12-30 이후 데이터는 수집하지 않음
            if current_date > datetime.date(2023, 12, 30):
                self.stdout.write(f"    -> {current_date}는 2023-12-30 이후로 데이터가 없습니다.")
                break
                
            date_str = current_date.strftime('%Y%m%d')
            
            params = {
                'API_KEY': self.api_key,
                'TYPE': 'xml',
                'API_URL': REALTIME_AUCTION_NEWS_URL,
                'START_INDEX': 1,
                'END_INDEX': 1000,
                'DATES': date_str
            }
            
            try:
                response = requests.get(REALTIME_AUCTION_NEWS_URL, params=params, timeout=15)
                response.raise_for_status()
                data = response.json()
                
                items = data.get('response', {}).get('body', {}).get('items', {}).get('item', [])
                if not items:
                    self.stdout.write(f"    -> {date_str} 실시간경매속보 데이터가 없습니다.")
                else:
                    self.stdout.write(f"    -> {date_str} 실시간경매속보 데이터 수집 완료 ({len(items)}건)")
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"    -> {date_str} 실시간경매속보 API 오류: {e}"))
            
            current_date += datetime.timedelta(days=1)

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
            
            params = {
                'API_KEY': self.api_key,
                'TYPE': 'xml',
                'API_URL': WHOLESALE_MARKET_PRICE_URL,
                'START_INDEX': 1,
                'END_INDEX': 1000,
                'DATES': date_str
            }
            
            try:
                response = requests.get(WHOLESALE_MARKET_PRICE_URL, params=params, timeout=15)
                response.raise_for_status()
                data = response.json()
                
                items = data.get('response', {}).get('body', {}).get('items', {}).get('item', [])
                if not items:
                    self.stdout.write(f"    -> {date_str} 도매경락가격 데이터가 없습니다.")
                else:
                    self.stdout.write(f"    -> {date_str} 도매경락가격 데이터 수집 완료 ({len(items)}건)")
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"    -> {date_str} 도매경락가격 API 오류: {e}"))
            
            current_date += datetime.timedelta(days=1)

    def fetch_realtime_auction_info(self, start_date, end_date):
        """도매시장 실시간 경락 정보 API를 통해 데이터를 수집합니다."""
        self.stdout.write(f"  -> 도매시장 실시간 경락 정보 데이터 수집 중...")
        
        current_date = start_date
        while current_date <= end_date:
            date_str = current_date.strftime('%Y%m%d')
            
            params = {
                'API_KEY': self.api_key,
                'TYPE': 'xml',
                'API_URL': REALTIME_AUCTION_INFO_URL,
                'START_INDEX': 1,
                'END_INDEX': 1000,
                'SALEDATE': date_str
            }
            
            try:
                response = requests.get(REALTIME_AUCTION_INFO_URL, params=params, timeout=15)
                response.raise_for_status()
                data = response.json()
                
                items = data.get('response', {}).get('body', {}).get('items', {}).get('item', [])
                if not items:
                    self.stdout.write(f"    -> {date_str} 실시간경락정보 데이터가 없습니다.")
                else:
                    self.stdout.write(f"    -> {date_str} 실시간경락정보 데이터 수집 완료 ({len(items)}건)")
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"    -> {date_str} 실시간경락정보 API 오류: {e}"))
            
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
        # 도매시장 데이터
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

    def fetch_daily_auction_data(self, date_to_fetch):
        """하루치 경매 데이터를 가져와 DB에 저장합니다."""
        date_str = date_to_fetch.strftime('%Y-%m-%d')
        self.stdout.write(f"  -> {date_str} 데이터 수집 중...")

        # ⭐️ API 기본 URL과 엔드포인트를 정확한 것으로 수정 ⭐️
        base_url = "http://apis.data.go.kr/B552845/KatRealTime"
        endpoint = "/trades"
        
        for fish_code in TARGET_FISH_CODES_AT:
            # ⭐️ 날짜 파라미터 이름을 'baseDate'에서 'trd_dd'로 수정 ⭐️
            params = {
                'serviceKey': self.at_api_key,
                'pageNo': 1,
                'numOfRows': 1000,
                'dataType': 'JSON',
                'trd_dd': date_str,  # <-- 'baseDate'가 아니라 'trd_dd'가 올바른 파라미터명입니다.
                'gds_sclsf_cd': fish_code
            }
            
            try:
                # ⭐️ API 호출 부분을 수정한 URL로 변경 ⭐️
                response = requests.get(f"{base_url}{endpoint}", params=params, timeout=15)
                response.raise_for_status()
                data = response.json()
                
                # 응답 데이터 확인
                items = data.get('response', {}).get('body', {}).get('items', {}).get('item', [])
                if not items:
                    self.stdout.write(self.style.WARNING(f"    -> {date_str} {fish_code} 경매 데이터가 없습니다."))
                    continue
                
                # 데이터 처리 및 저장
                processed_count = 0
                for item in items:
                    try:
                        # 도매시장 찾기
                        market = WholesaleMarket.objects.filter(
                            market_api_code=item.get('marketCode', '')
                        ).first()
                        if not market:
                            continue
                        
                        # 어종 찾기
                        fish_species = FishSpecies.objects.filter(
                            item_small_category_code=item.get('itemCode', '')
                        ).first()
                        if not fish_species:
                            continue
                        
                        # 공통 코드들 찾기
                        origin_place = CommonCode.objects.filter(
                            code_type='PLOR',
                            code_value=item.get('originPlaceCode', 'BUSAN')
                        ).first()
                        
                        package = CommonCode.objects.filter(
                            code_type='PKG',
                            code_value=item.get('packageCode', 'FRESH')
                        ).first()
                        
                        unit = CommonCode.objects.filter(
                            code_type='UNIT',
                            code_value=item.get('unitCode', 'KG')
                        ).first()
                        
                        grade = None
                        if item.get('gradeCode'):
                            grade = CommonCode.objects.filter(
                                code_type='GRD',
                                code_value=item.get('gradeCode')
                            ).first()
                        
                        # 경매 데이터 생성
                        auction_data = ActualAuctionPrice(
                            auction_sequence_id=item.get('auctionSequenceId', f"AUCTION_{date_str}_{item.get('marketCode')}_{item.get('itemCode')}"),
                            trade_date=date_to_fetch,
                            trade_timestamp=datetime.datetime.strptime(item.get('tradeTime', f"{date_str} 00:00:00"), '%Y-%m-%d %H:%M:%S') if item.get('tradeTime') else None,
                            market=market,
                            fish_species=fish_species,
                            origin_place_code=origin_place,
                            package_code=package,
                            unit_code=unit,
                            grade_code=grade,
                            trade_volume=float(item.get('tradeVolume', 0)),
                            auction_price=float(item.get('auctionPrice', 0)),
                            unit_weight_kg=float(item.get('unitWeight', 1.0))
                        )
                        auction_data.save()
                        processed_count += 1
                        
                    except (ValueError, KeyError, TypeError) as e:
                        self.stdout.write(self.style.WARNING(f"    -> 데이터 파싱 오류: {e}"))
                        continue
                
                self.stdout.write(self.style.SUCCESS(f"    -> {date_str} {fish_code} 경매 데이터 수집 완료 ({processed_count}건)"))
                
            except requests.exceptions.RequestException as e:
                self.stdout.write(self.style.ERROR(f"    -> {date_str} {fish_code} API 호출 오류: {e}"))
                # API 응답 내용 확인
                if hasattr(e, 'response') and e.response is not None:
                    try:
                        error_data = e.response.json()
                        self.stdout.write(self.style.ERROR(f"    -> API 응답: {error_data}"))
                    except:
                        self.stdout.write(self.style.ERROR(f"    -> API 응답 텍스트: {e.response.text}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"    -> {date_str} {fish_code} 경매 데이터 수집 오류: {e}"))

    def fetch_kosis_catch_data(self, start_date, end_date):
        """KOSIS 통계 API를 통해 월별 어획량 데이터를 수집합니다."""
        start_month = start_date.strftime('%Y%m')
        end_month = end_date.strftime('%Y%m')

        # KOSIS API 올바른 파라미터로 수정
        params = {
            'method': 'getList',
            'apiKey': self.kosis_api_key,
            'itmId': 'T01+T02+T03+T04+T05+T06+T07+T08+',
            'objL1': 'ALL',
            'objL2': 'ALL', 
            'objL3': 'ALL',
            'objL4': '',
            'objL5': '',
            'objL6': '',
            'objL7': '',
            'objL8': '',
            'format': 'json',
            'jsonVD': 'Y',
            'prdSe': 'M',
            'newEstPrdCnt': 6,
            'outputFields': 'ORG_ID+TBL_ID+TBL_NM+OBJ_ID+OBJ_NM+ITM_ID+ITM_NM+UNIT_NM+PRD_SE+PRD_DE+',
            'orgId': '101',
            'tblId': 'DT_1EW0001'
        }
        
        try:
            self.stdout.write(f"  -> KOSIS API 호출 중... ({start_month} ~ {end_month})")
            self.stdout.write(f"    - KOSIS API URL: {KOSIS_API_BASE_URL}")
            self.stdout.write(f"    - KOSIS API 파라미터: {params}")
            
            response = requests.get(KOSIS_API_BASE_URL, params=params, timeout=30)
            self.stdout.write(f"    - KOSIS API 응답 상태: {response.status_code}")
            
            if response.status_code != 200:
                self.stdout.write(f"    - KOSIS API 오류 응답: {response.text}")
                return
                
            data = response.json()
            self.stdout.write(f"    - KOSIS API 응답 내용: {str(data)[:500]}...")
            
            if not data or not isinstance(data, list):
                self.stdout.write(self.style.WARNING("  -> KOSIS 데이터가 없거나 형식이 올바르지 않습니다."))
                return

            # KOSIS API 응답 구조에 맞게 처리
            processed_count = 0
            for item in data:
                try:
                    # KOSIS API 응답 필드 확인
                    list_id = item.get('LIST_ID', '')
                    list_nm = item.get('LIST_NM', '')
                    tbl_id = item.get('TBL_ID', '')
                    tbl_nm = item.get('TBL_NM', '')
                    
                    self.stdout.write(f"    - 목록: {list_nm} (ID: {list_id})")
                    self.stdout.write(f"    - 통계표: {tbl_nm} (ID: {tbl_id})")
                    
                    processed_count += 1
                    
                except (KeyError, ValueError) as e:
                    self.stdout.write(self.style.WARNING(f"    - KOSIS 데이터 파싱 오류: {e}"))
                    continue
            
            self.stdout.write(self.style.SUCCESS(f"  -> {start_month} ~ {end_month} KOSIS 데이터 처리 완료 ({processed_count}건)"))

        except requests.exceptions.RequestException as e:
            self.stdout.write(self.style.ERROR(f"    오류: KOSIS API 호출 중 문제 발생 - {e}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"    오류: KOSIS 데이터 처리 중 문제 발생 - {e}"))

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
                    'base_date': date_str, 'base_time': '0500', # 05시 발표 데이터 기준
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