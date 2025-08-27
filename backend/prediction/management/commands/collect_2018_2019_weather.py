#!/usr/bin/env python
"""
2018-2019 기상 데이터 수집 스크립트
"""

import os
import sys
import django
import requests
import time
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.conf import settings

# Django 설정
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from prediction.models import ExternalEnvironmentalData

class Command(BaseCommand):
    help = '2018-2019 기상 데이터 수집'

    def add_arguments(self, parser):
        parser.add_argument(
            '--start',
            type=str,
            default='2018-01-01',
            help='시작 날짜 (YYYY-MM-DD)'
        )
        parser.add_argument(
            '--end',
            type=str,
            default='2019-12-31',
            help='종료 날짜 (YYYY-MM-DD)'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='기존 데이터 덮어쓰기'
        )

    def handle(self, *args, **options):
        start_date = options['start']
        end_date = options['end']
        force = options['force']

        print(f"🌤️ 2018-2019 기상 데이터 수집 시작")
        print(f"📅 기간: {start_date} ~ {end_date}")
        print(f"🔧 Force 모드: {force}")

        # KMA API 키 가져오기
        kma_api_key = getattr(settings, 'KMA_API_KEY', None)
        if not kma_api_key:
            print("❌ KMA API 키가 설정되지 않았습니다.")
            return

        # 관측소 목록 (목포, 부산, 인천)
        stations = [
            {'name': '목포', 'code': '165'},
            {'name': '부산', 'code': '159'},
            {'name': '인천', 'code': '112'}
        ]

        # 데이터 타입 매핑
        data_types = [
            ('avg_temp', '평균기온'),
            ('max_temp', '최고기온'),
            ('min_temp', '최저기온'),
            ('avg_humidity', '평균상대습도'),
            ('avg_pressure', '평균해면기압'),
            ('avg_wind_speed', '평균풍속'),
            ('precipitation', '일강수량')
        ]

        total_collected = 0

        for station in stations:
            print(f"\n📍 {station['name']} 관측소 데이터 수집 중...")
            
            station_collected = 0
            
            # 날짜별로 데이터 수집
            current_date = datetime.strptime(start_date, '%Y-%m-%d')
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            
            while current_date <= end_dt:
                date_str = current_date.strftime('%Y%m%d')
                
                try:
                    # KMA ASOS 일자료 API 호출
                    url = "http://apis.data.go.kr/1360000/AsosDalyInfoService/getWthrDataList"
                    params = {
                        'serviceKey': kma_api_key,
                        'pageNo': '1',
                        'numOfRows': '10',
                        'dataType': 'JSON',
                        'dataCd': 'ASOS',
                        'dateCd': 'DAY',
                        'startDt': date_str,
                        'endDt': date_str,
                        'stnIds': station['code']
                    }

                    response = requests.get(url, params=params, timeout=30)
                    response.raise_for_status()
                    
                    data = response.json()
                    
                    if data.get('response', {}).get('header', {}).get('resultCode') == '00':
                        items = data.get('response', {}).get('body', {}).get('items', {}).get('item', [])
                        
                        if not items:
                            items = []
                        elif isinstance(items, dict):
                            items = [items]
                        
                        for item in items:
                            # 기존 데이터 확인
                            if not force:
                                existing = ExternalEnvironmentalData.objects.filter(
                                    data_source='KMA_ASOS',
                                    location_identifier=station['name'],
                                    data_timestamp__date=current_date.date()
                                ).exists()
                                
                                if existing:
                                    continue
                            
                            # 데이터 타입별로 저장
                            for data_type, field_name in data_types:
                                value = item.get(field_name)
                                
                                if value is not None and value != '':
                                    try:
                                        # 값 변환
                                        if data_type in ['avg_temp', 'max_temp', 'min_temp']:
                                            value = float(value)
                                        elif data_type == 'avg_humidity':
                                            value = float(value)
                                        elif data_type == 'avg_pressure':
                                            value = float(value)
                                        elif data_type == 'avg_wind_speed':
                                            value = float(value)
                                        elif data_type == 'precipitation':
                                            value = float(value) if value != '0' else 0.0
                                        
                                        # 데이터 저장
                                        ExternalEnvironmentalData.objects.create(
                                            data_source='KMA_ASOS',
                                            location_identifier=station['name'],
                                            data_type=data_type,
                                            value=value,
                                            data_timestamp=current_date.replace(hour=15, minute=0, second=0, microsecond=0),
                                            unit=self.get_unit(data_type)
                                        )
                                        
                                        station_collected += 1
                                        total_collected += 1
                                        
                                    except (ValueError, TypeError) as e:
                                        print(f"⚠️ 데이터 변환 오류: {data_type}={value}, 오류: {e}")
                                        continue
                    
                    else:
                        result_msg = data.get('response', {}).get('header', {}).get('resultMsg', 'Unknown')
                        print(f"⚠️ API 오류 ({date_str}): {result_msg}")
                
                except requests.exceptions.RequestException as e:
                    print(f"❌ 네트워크 오류 ({date_str}): {e}")
                except Exception as e:
                    print(f"❌ 예상치 못한 오류 ({date_str}): {e}")
                
                # API 호출 간격 조절
                time.sleep(0.5)
                
                # 진행상황 출력
                if current_date.day == 1 or current_date.day % 15 == 0:
                    print(f"  📅 {current_date.strftime('%Y-%m-%d')} 완료")
                
                current_date += timedelta(days=1)
            
            print(f"✅ {station['name']}: {station_collected}건 수집 완료")

        print(f"\n🎉 전체 수집 완료!")
        print(f"📊 총 수집된 데이터: {total_collected}건")
        print(f"📅 기간: {start_date} ~ {end_date}")

    def get_unit(self, data_type):
        """데이터 타입별 단위 반환"""
        units = {
            'avg_temp': '°C',
            'max_temp': '°C',
            'min_temp': '°C',
            'avg_humidity': '%',
            'avg_pressure': 'hPa',
            'avg_wind_speed': 'm/s',
            'precipitation': 'mm'
        }
        return units.get(data_type, '')

if __name__ == "__main__":
    # Django 설정
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    django.setup()
    
    # 명령어 실행
    from django.core.management import execute_from_command_line
    execute_from_command_line(['manage.py', 'collect_2018_2019_weather'])
