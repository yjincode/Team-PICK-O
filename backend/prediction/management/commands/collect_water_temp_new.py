# backend/prediction/management/commands/collect_water_temp_new.py

import os
import sys
import django
import requests
import datetime
import json
from django.core.management.base import BaseCommand, CommandParser
from django.db import transaction

# Django 설정을 독립적으로 로드
def setup_django():
    """Django 설정을 독립적으로 로드합니다."""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(current_dir, '..', '..', '..', '..')
    
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
    
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    django.setup()

# Django 설정 로드
setup_django()

from prediction.models import ExternalEnvironmentalData
from django.conf import settings

class Command(BaseCommand):
    help = "해양수산부 국립해양조사원 조위관측소 실측 수온 데이터를 수집합니다."

    def add_arguments(self, parser: CommandParser):
        parser.add_argument('--start', type=str, help='데이터 수집 시작일 (YYYY-MM-DD 형식)')
        parser.add_argument('--end', type=str, help='데이터 수집 종료일 (YYYY-MM-DD 형식)')
        parser.add_argument('--force', action='store_true', help='기존 데이터를 덮어쓰기')

    def handle(self, *args, **options):
        """스크립트 메인 로직"""
        self.stdout.write("🌊 해양수산부 국립해양조사원 수온 데이터 수집 시작")
        self.stdout.write("="*60)
        
        # API 키 확인 - 공공데이터포털 API 사용
        api_key = getattr(settings, 'DATA_GO_KR_API_KEY', None)
        if not api_key:
            self.stdout.write(self.style.ERROR("DATA_GO_KR_API_KEY가 설정되지 않았습니다."))
            return
        
        self.stdout.write(f"🔑 API 키 확인됨: {api_key[:10]}...")
        
        # 날짜 범위 설정
        start_date_str = options.get('start', '2025-08-18')
        end_date_str = options.get('end', '2025-08-27')
        
        try:
            start_date = datetime.datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except ValueError as e:
            self.stdout.write(self.style.ERROR(f"날짜 형식 오류: {e}"))
            return
        
        self.stdout.write(f"�� 수집 기간: {start_date} ~ {end_date}")
        
        # 기존 데이터 처리
        if options.get('force'):
            deleted_count = ExternalEnvironmentalData.objects.filter(data_source='KHO_WATER_TEMP').delete()[0]
            self.stdout.write(f"��️ 기존 KHO 수온 데이터 {deleted_count}건 삭제됨")
        
        # 수온 데이터 수집
        self.collect_water_temp_data(api_key, start_date, end_date)
        
        # 결과 요약
        total_count = ExternalEnvironmentalData.objects.filter(data_source='KHO_WATER_TEMP').count()
        self.stdout.write(f"✅ 최종 KHO 수온 데이터: {total_count}건")
        
        self.stdout.write("🌊 수온 데이터 수집 완료")

    def collect_water_temp_data(self, api_key, start_date, end_date):
        """해양수산부 국립해양조사원 수온 데이터를 수집합니다."""
        
        # 조위관측소 코드 (주요 어업 지역)
        # 문서에서 확인한 실제 관측소 코드들
        station_codes = {
            '인천': 'DT_0001',  # 인천 (문서 예시)
            '부산': 'DT_0004',  # 부산 (문서에서 확인)
            '목포': 'DT_0006',  # 목포 (문서에서 확인)
            '여수': 'DT_0012',  # 여수 (문서에서 확인)
            '울산': 'DT_0015'   # 울산 (문서에서 확인)
        }
        
        objects_to_create = []
        
                # 날짜별로 수집 (문서 예시에 맞게 단일 날짜 사용)
        current_date = start_date
        while current_date <= end_date:
            for location, station_code in station_codes.items():
                self.stdout.write(f"🌊 {location} 지역 수온 데이터 수집 중... ({current_date})")
                
                # API 요청 파라미터 (문서 예시에 정확히 맞춤)
                params = {
                    'serviceKey': api_key,
                    'type': 'json',
                    'obsCode': station_code,
                    'reqDate': current_date.strftime('%Y%m%d'),
                    'pageNo': 1,
                    'numOfRows': 10  # 문서 예시와 동일
                }
                
                try:
                    # API 호출 - 공공데이터포털 새로운 API 사용 (HTTP)
                    response = requests.get(
                        'http://apis.data.go.kr/1192136/surveyWaterTemp/GetSurveyWaterTempApiService',
                        params=params,
                        timeout=30
                    )
                    
                    if response.status_code != 200:
                        self.stdout.write(self.style.WARNING(f"  ❌ {location} API 오류: {response.status_code}"))
                        continue
                    
                    # 응답 내용 확인
                    self.stdout.write(f"  📄 {location} 응답 내용: {response.text[:200]}...")
                    
                    try:
                        data = response.json()
                    except json.JSONDecodeError as e:
                        self.stdout.write(self.style.WARNING(f"  ❌ {location} JSON 파싱 오류: {e}"))
                        self.stdout.write(f"  📄 응답 내용: {response.text}")
                        continue
                    
                    # 응답 데이터 파싱 - 공공데이터포털 API 구조
                    items = data.get('response', {}).get('body', {}).get('items', {}).get('item', [])
                    if not isinstance(items, list):
                        items = [items] if items else []
                    
                    self.stdout.write(f"  📊 {location} 지역 데이터 {len(items)}건 수신")
                    
                    for item in items:
                        try:
                            # 관측 시간 파싱 - 공공데이터포털 API는 obsrvnDt 사용
                            obs_time_str = item.get('obsrvnDt', '')
                            if not obs_time_str:
                                continue
                            
                            obs_time = datetime.datetime.strptime(obs_time_str, '%Y-%m-%d %H:%M:%S')
                            
                            # 수온 값 파싱 - 공공데이터포털 API는 wtem 사용
                            water_temp_str = item.get('wtem', '')
                            if water_temp_str in ['', '-999', None]:
                                continue
                            
                            water_temp = float(water_temp_str)
                            
                            # DB 저장 객체 생성 - 공공데이터포털 API 구조
                            objects_to_create.append(
                                ExternalEnvironmentalData(
                                    data_source='KHO_WATER_TEMP',
                                    data_timestamp=obs_time,
                                    location_identifier=location,
                                    data_type='water_temperature',
                                    value=water_temp,
                                    unit='°C'
                                )
                            )
                            
                        except (ValueError, TypeError) as e:
                            self.stdout.write(self.style.WARNING(f"  ⚠️ {location} 데이터 파싱 오류: {e}"))
                            continue
                            
                except requests.exceptions.RequestException as e:
                    self.stdout.write(self.style.WARNING(f"  ❌ {location} API 호출 오류: {e}"))
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"  ❌ {location} 데이터 처리 오류: {e}"))
            
            # 다음 날로 이동
            current_date += datetime.timedelta(days=1)
        
        # DB에 일괄 저장
        if objects_to_create:
            self.stdout.write(f"💾 {len(objects_to_create)}건의 수온 데이터를 DB에 저장 중...")
            ExternalEnvironmentalData.objects.bulk_create(objects_to_create, ignore_conflicts=True)
            self.stdout.write(f"✅ 수온 데이터 저장 완료")
        else:
            self.stdout.write("⚠️ 저장할 수온 데이터가 없습니다.")