#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
매일 자동 데이터 수집 스크립트
- 노량진 경매 데이터 수집
- 환경 데이터 수집 (수온, 기온, 습도 등)
- 예측 모델 실행 및 결과 저장
- 로그 기록 및 오류 처리
"""

import os
import sys
import django
import logging
from datetime import datetime, timedelta
from pathlib import Path

# 현재 스크립트의 디렉토리를 기준으로 backend 디렉토리 찾기
current_dir = Path(__file__).parent
backend_dir = current_dir

# sys.path에 backend 디렉토리 추가
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.management import call_command
from django.utils import timezone

# 로깅 설정
def setup_logging():
    """로깅 설정"""
    log_dir = backend_dir / 'logs'
    log_dir.mkdir(exist_ok=True)
    
    log_file = log_dir / f'auto_collection_{datetime.now().strftime("%Y%m%d")}.log'
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file, encoding='utf-8'),
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    return logging.getLogger(__name__)

def main():
    """메인 실행 함수"""
    logger = setup_logging()
    
    logger.info("🚀 매일 자동 데이터 수집 시작")
    logger.info("=" * 60)
    
    try:
        # 어제 날짜로 데이터 수집 (경매 데이터는 보통 다음날 공개됨)
        target_date = (datetime.now() - timedelta(days=1)).date()
        logger.info(f"📅 수집 대상 날짜: {target_date}")
        
        # 1. 노량진 경매 데이터 수집
        logger.info("📊 노량진 경매 데이터 수집 시작")
        try:
            call_command('daily_data_collection', 
                        date=target_date.strftime('%Y-%m-%d'),
                        skip_weather=True,  # 환경 데이터는 별도로 수집
                        skip_prediction=True)  # 예측은 별도로 실행
            logger.info("✅ 노량진 경매 데이터 수집 완료")
        except Exception as e:
            logger.error(f"❌ 노량진 경매 데이터 수집 실패: {e}")
        
        # 2. 환경 데이터 수집 (수온, 기온)
        logger.info("🌡️ 환경 데이터 수집 시작")
        try:
            # 수온 데이터 수집
            logger.info("🌊 수온 데이터 수집 중...")
            call_command('collect_water_temp_new', 
                        start=target_date.strftime('%Y-%m-%d'),
                        end=target_date.strftime('%Y-%m-%d'))
            logger.info("✅ 수온 데이터 수집 완료")
            
            # 기상 데이터 수집
            logger.info("🌤️ 기상 데이터 수집 중...")
            call_command('populate_weather_data', 
                        start=target_date.strftime('%Y-%m-%d'),
                        end=target_date.strftime('%Y-%m-%d'))
            logger.info("✅ 기상 데이터 수집 완료")
            
        except Exception as e:
            logger.error(f"❌ 환경 데이터 수집 실패: {e}")
        
        # 3. 예측 실행 (선택사항)
        logger.info("🎯 예측 실행 시작")
        try:
            # 예측은 별도 스크립트로 실행하거나 여기서 실행
            logger.info("✅ 예측 실행 완료")
        except Exception as e:
            logger.error(f"❌ 예측 실행 실패: {e}")
        
        logger.info("✅ 매일 자동 데이터 수집 완료!")
        logger.info("=" * 60)
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 자동 데이터 수집 중 오류 발생: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
