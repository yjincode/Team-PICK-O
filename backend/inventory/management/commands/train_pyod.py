"""
PyOD 모델 훈련을 위한 Django 관리 명령어
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta
import numpy as np
import logging

from ...anomaly_detection.pyod_engine import PyODAnomalyDetector
from ...models import InventoryLog

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'PyOD 이상탐지 모델 훈련'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=60,
            help='훈련용 데이터 기간 (일) - 기본값: 60일'
        )
        parser.add_argument(
            '--contamination',
            type=float,
            default=0.05,
            help='이상 데이터 비율 - 기본값: 0.05 (5%)'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='기존 모델을 덮어쓰기'
        )

    def handle(self, *args, **options):
        try:
            self.stdout.write("🚀 PyOD 모델 훈련 시작...")
            
            # 설정값
            training_days = options['days']
            contamination = options['contamination']
            force = options['force']
            
            # 1. 훈련 데이터 준비
            self.stdout.write(f"📊 훈련 데이터 준비 중... ({training_days}일)")
            training_logs = self._prepare_training_data(training_days)
            
            if not training_logs:
                self.stdout.write(self.style.ERROR("❌ 훈련 데이터가 없습니다."))
                return
            
            self.stdout.write(f"✅ 훈련 데이터 준비 완료: {len(training_logs)}건")
            
            # 2. PyOD 모델 생성 및 훈련
            self.stdout.write(f"🤖 PyOD 모델 훈련 중... (contamination: {contamination})")
            detector = PyODAnomalyDetector(contamination=contamination)
            
            # 훈련 실행
            success = detector.train(training_logs)
            
            if success:
                self.stdout.write(self.style.SUCCESS("✅ 모델 훈련 완료!"))
                
                # 모델 정보 출력
                model_info = detector.get_model_info()
                self.stdout.write(f"📋 모델 정보:")
                self.stdout.write(f"   - 훈련 상태: {model_info['is_trained']}")
                self.stdout.write(f"   - 모델 버전: {model_info['model_version']}")
                self.stdout.write(f"   - 특징 개수: {len(model_info['feature_names'])}")
                self.stdout.write(f"   - PyOD 사용 가능: {model_info['pyod_available']}")
                
                # 특징 이름 출력
                self.stdout.write(f"🔍 특징 이름:")
                for i, name in enumerate(model_info['feature_names']):
                    self.stdout.write(f"   {i+1}. {name}")
                
            else:
                self.stdout.write(self.style.ERROR("❌ 모델 훈련 실패"))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ 오류 발생: {e}"))
            logger.error(f"PyOD 훈련 명령어 실행 실패: {e}")

    def _prepare_training_data(self, days: int):
        """훈련용 데이터 준비"""
        try:
            # 기준일 설정
            cutoff_date = timezone.now() - timedelta(days=days)
            
            # 훈련용 로그 필터링 (정상 데이터 위주)
            training_logs = InventoryLog.objects.filter(
                created_at__gte=cutoff_date,
                type__in=['in', 'out'],  # 입출고만 (조정 제외)
                after_quantity__gte=0,   # 음수 재고 제외
                memo__isnull=True        # 테스트 데이터 제외
            ).exclude(
                memo__icontains='[TEST]'  # 테스트 태그 제외
            ).order_by('created_at')
            
            # 데이터가 너무 적으면 경고
            if len(training_logs) < 50:
                self.stdout.write(
                    self.style.WARNING(
                        f"⚠️  훈련 데이터가 적습니다: {len(training_logs)}건 "
                        f"(권장: 100건 이상)"
                    )
                )
            
            return list(training_logs)
            
        except Exception as e:
            logger.error(f"훈련 데이터 준비 실패: {e}")
            return []
