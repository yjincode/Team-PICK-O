#!/usr/bin/env python
"""
매일 자동으로 데이터를 수집하는 Django Management Command

사용법:
    python manage.py auto_collect_daily

실행 시간: 매일 오전 6시 (Cron Job으로 설정)
수집 데이터:
    - 노량진 경매 데이터 (5개 어종)
    - 수온 데이터 (KHOA)
    - 기온 데이터 (KMA)
"""

import os
import sys
import django
from datetime import datetime, timedelta, date
import logging

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.management.base import BaseCommand
from django.utils import timezone

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/auto_collection.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = '매일 자동으로 경매 데이터, 수온, 기온을 수집합니다'

    def add_arguments(self, parser):
        parser.add_argument(
            '--date',
            type=str,
            help='수집할 날짜 (YYYY-MM-DD). 기본값: 어제',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='강제로 데이터를 다시 수집합니다',
        )

    def handle(self, *args, **options):
        try:
            # 날짜 결정
            if options['date']:
                target_date = datetime.strptime(options['date'], '%Y-%m-%d').date()
            else:
                # 기본값: 어제
                target_date = date.today() - timedelta(days=1)
            
            logger.info(f"🚀 자동 데이터 수집 시작: {target_date}")
            
            # 1. 경매 데이터 수집 (전날 + 당일)
            self.collect_auction_data(target_date)
            
            # 2. 수온 데이터 수집
            self.collect_water_temperature(target_date)
            
            # 3. 기온 데이터 수집
            self.collect_air_temperature(target_date)
            
            logger.info(f"✅ 자동 데이터 수집 완료: {target_date}")
            
        except Exception as e:
            logger.error(f"❌ 자동 데이터 수집 실패: {e}")
            raise

    def collect_auction_data(self, target_date):
        """경매 데이터 수집"""
        try:
            logger.info(f"🐟 경매 데이터 수집 시작: {target_date}")
            
            # 어종별로 데이터 수집
            species_list = ['우럭', '농어', '참돔', '광어', '숭어']
            
            for species in species_list:
                logger.info(f"  📊 {species} 데이터 수집 중...")
                
                # collect_noryangjin_daily_quantity.py 스크립트 실행
                # 여기서는 실제 API 호출 로직을 구현
                self.collect_single_species_data(species, target_date)
                
            logger.info(f"✅ 경매 데이터 수집 완료: {len(species_list)}개 어종")
            
        except Exception as e:
            logger.error(f"❌ 경매 데이터 수집 실패: {e}")
            raise

    def collect_single_species_data(self, species, target_date):
        """단일 어종 데이터 수집"""
        try:
            # 어종 매핑
            species_mapping = {
                '우럭': '(활)우럭',
                '농어': '(활)농어',
                '참돔': '(활)참돔',
                '광어': '(활)넙치',
                '숭어': '(활)참숭어'
            }
            
            mapped_species = species_mapping.get(species, species)
            
            # 개별 어종별로 직접 API 호출
            target_date_str = target_date.strftime('%Y-%m-%d')
            
            # collect_noryangjin_daily_quantity.py의 로직을 직접 구현
            from auction_prediction.collect_noryangjin_daily_quantity import collect_single_species_daily
            
            result = collect_single_species_daily(mapped_species, target_date_str)
            
            if result:
                logger.info(f"    ✅ {species} ({target_date}) 데이터 수집 완료: {len(result)}건")
            else:
                logger.warning(f"    ⚠️ {species} ({target_date}) 데이터 없음")
            
        except Exception as e:
            logger.error(f"    ❌ {species} 데이터 수집 실패: {e}")

    def collect_water_temperature(self, target_date):
        """수온 데이터 수집 (KHOA)"""
        try:
            logger.info(f"🌊 수온 데이터 수집 시작: {target_date}")
            
            # 실제 KHOA 수온 API 연동
            from prediction.management.commands.collect_water_temp_new import Command as WaterTempCommand
            
            water_temp_cmd = WaterTempCommand()
            water_temp_cmd.handle(
                start=target_date.strftime('%Y-%m-%d'),
                end=target_date.strftime('%Y-%m-%d')
            )
            
            logger.info(f"✅ 수온 데이터 수집 완료: {target_date}")
            
        except Exception as e:
            logger.error(f"❌ 수온 데이터 수집 실패: {e}")
            raise

    def collect_air_temperature(self, target_date):
        """기온 데이터 수집 (KMA)"""
        try:
            logger.info(f"🌡️ 기온 데이터 수집 시작: {target_date}")
            
            # 실제 KMA 기온 API 연동
            from prediction.management.commands.populate_weather_data import Command as WeatherCommand
            
            weather_cmd = WeatherCommand()
            weather_cmd.handle(
                start=target_date.strftime('%Y-%m-%d'),
                end=target_date.strftime('%Y-%m-%d')
            )
            
            logger.info(f"✅ 기온 데이터 수집 완료: {target_date}")
            
        except Exception as e:
            logger.error(f"❌ 기온 데이터 수집 실패: {e}")
            raise

if __name__ == '__main__':
    # 직접 실행 시 테스트
    command = Command()
    command.handle()
