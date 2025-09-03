#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
매일 자동으로 데이터를 수집하는 Django 관리 명령어
- 노량진 경매 데이터 수집
- 환경 데이터 수집 (수온, 기온, 습도 등)
- 예측 모델 실행 및 결과 저장
"""

import os
import sys
import django
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from prediction.models import ExternalEnvironmentalData
from prediction.views import predict_price, predict_single_species, load_models, get_environmental_data_from_db
from auction_prediction.collect_noryangjin_daily_quantity import collect_noryangjin_daily_quantity
from prediction.management.commands.collect_water_temp_new import Command as WaterTempCommand
from prediction.management.commands.populate_weather_data import Command as WeatherCommand

class Command(BaseCommand):
    help = '매일 자동으로 데이터를 수집하고 예측을 실행합니다'

    def add_arguments(self, parser):
        parser.add_argument(
            '--date',
            type=str,
            help='수집할 날짜 (YYYY-MM-DD 형식, 기본값: 어제)',
            default=None
        )
        parser.add_argument(
            '--skip-auction',
            action='store_true',
            help='경매 데이터 수집 건너뛰기',
        )
        parser.add_argument(
            '--skip-weather',
            action='store_true',
            help='환경 데이터 수집 건너뛰기',
        )
        parser.add_argument(
            '--skip-prediction',
            action='store_true',
            help='예측 실행 건너뛰기',
        )

    def handle(self, *args, **options):
        """메인 실행 함수"""
        self.stdout.write("🚀 매일 자동 데이터 수집 시작")
        self.stdout.write("=" * 60)
        
        # 날짜 설정
        if options['date']:
            try:
                target_date = datetime.strptime(options['date'], '%Y-%m-%d').date()
            except ValueError:
                self.stdout.write(self.style.ERROR("❌ 잘못된 날짜 형식입니다. YYYY-MM-DD 형식을 사용하세요."))
                return
        else:
            # 기본값: 어제
            target_date = (datetime.now() - timedelta(days=1)).date()
        
        self.stdout.write(f"📅 수집 대상 날짜: {target_date}")
        
        # 1. 노량진 경매 데이터 수집
        if not options['skip_auction']:
            self.collect_auction_data(target_date)
        else:
            self.stdout.write("⏭️ 경매 데이터 수집 건너뛰기")
        
        # 2. 환경 데이터 수집
        if not options['skip_weather']:
            self.collect_environmental_data(target_date)
        else:
            self.stdout.write("⏭️ 환경 데이터 수집 건너뛰기")
        
        # 3. 예측 실행 및 저장
        if not options['skip_prediction']:
            self.run_predictions(target_date)
        else:
            self.stdout.write("⏭️ 예측 실행 건너뛰기")
        
        self.stdout.write("\n✅ 매일 자동 데이터 수집 완료!")
        self.stdout.write("=" * 60)

    def collect_auction_data(self, target_date):
        """노량진 경매 데이터 수집"""
        self.stdout.write(f"\n📊 노량진 경매 데이터 수집 ({target_date})")
        self.stdout.write("-" * 40)
        
        try:
            # 노량진 데이터 수집 (수정된 스크립트 활용)
            start_date = target_date.strftime('%Y-%m-%d')
            end_date = target_date.strftime('%Y-%m-%d')
            
            self.stdout.write(f"🔍 {start_date} 경매 데이터 수집 중...")
            
            # collect_noryangjin_daily_quantity.py의 함수 호출 (규격 매핑 포함)
            result = collect_noryangjin_daily_quantity(start_date, end_date)
            
            if result:
                self.stdout.write(self.style.SUCCESS(f"✅ 경매 데이터 수집 성공: {result}"))
            else:
                self.stdout.write(self.style.WARNING("⚠️ 경매 데이터 수집 결과 없음"))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ 경매 데이터 수집 실패: {e}"))

    def collect_environmental_data(self, target_date):
        """환경 데이터 수집 (수온, 기온 등)"""
        self.stdout.write(f"\n🌡️ 환경 데이터 수집 ({target_date})")
        self.stdout.write("-" * 40)
        
        try:
            # 수온 데이터 수집
            self.stdout.write("🌊 수온 데이터 수집 중...")
            water_temp_cmd = WaterTempCommand()
            water_temp_cmd.handle(
                start_date=target_date.strftime('%Y-%m-%d'),
                end_date=target_date.strftime('%Y-%m-%d')
            )
            self.stdout.write(self.style.SUCCESS("✅ 수온 데이터 수집 완료"))
            
            # 기상 데이터 수집
            self.stdout.write("🌤️ 기상 데이터 수집 중...")
            weather_cmd = WeatherCommand()
            weather_cmd.handle(
                start_date=target_date.strftime('%Y-%m-%d'),
                end_date=target_date.strftime('%Y-%m-%d')
            )
            self.stdout.write(self.style.SUCCESS("✅ 기상 데이터 수집 완료"))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ 환경 데이터 수집 실패: {e}"))

    def run_predictions(self, target_date):
        """예측 실행 및 결과 저장"""
        self.stdout.write(f"\n🎯 예측 실행 ({target_date})")
        self.stdout.write("-" * 40)
        
        try:
            # 모델 로드
            self.stdout.write("📦 예측 모델 로딩 중...")
            models = load_models()
            self.stdout.write(f"✅ 로드된 모델: {len(models)}개")
            
            # 환경 데이터 조회
            target_date_str = target_date.strftime('%Y-%m-%d')
            environmental_data = get_environmental_data_from_db(target_date_str)
            
            self.stdout.write(f"🌡️ 환경 데이터 조회 완료:")
            for key, value in environmental_data.items():
                self.stdout.write(f"  {key}: {value}")
            
            # 어종별 예측 실행
            species_mapping = {
                '우럭': '우럭',
                '넙치': '넙치', 
                '숭어': '숭어',
                '참돔': '참돔',
                '농어': '농어'
            }
            
            predictions = {}
            
            for korean_name in species_mapping.values():
                self.stdout.write(f"\n🐟 {korean_name} 예측 중...")
                
                result = predict_single_species(korean_name, target_date_str, environmental_data, models)
                
                if result and 'error' not in result:
                    predictions[korean_name] = {
                        'predicted_price': result['predicted_price'],
                        'lightgbm': result['lightgbm_prediction'],
                        'xgboost': result['xgboost_prediction'],
                        'confidence': result['confidence']
                    }
                    self.stdout.write(f"  ✅ {korean_name}: {result['predicted_price']:,.0f}원 (신뢰도: {result['confidence']})")
                else:
                    self.stdout.write(f"  ❌ {korean_name}: {result.get('error', 'Unknown error')}")
            
            # 예측 결과 요약
            if predictions:
                self.stdout.write(f"\n📊 예측 결과 요약:")
                sorted_predictions = sorted(predictions.items(), key=lambda x: x[1]['predicted_price'], reverse=True)
                for i, (species, data) in enumerate(sorted_predictions, 1):
                    self.stdout.write(f"  {i}위: {species} - {data['predicted_price']:,.0f}원")
                
                # TODO: 예측 결과를 DB에 저장하는 로직 추가
                self.stdout.write(f"\n💾 예측 결과 저장 (구현 예정)")
            else:
                self.stdout.write(self.style.WARNING("⚠️ 예측 결과가 없습니다"))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ 예측 실행 실패: {e}"))
            import traceback
            traceback.print_exc()

    def log_data_collection_status(self, target_date):
        """데이터 수집 상태 로깅"""
        # TODO: 수집 상태를 DB에 기록하는 로직 추가
        pass
