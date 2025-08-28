#!/usr/bin/env python3
"""
데이터 수집 모니터링 스크립트
일별 데이터 수집 상태를 확인하고 문제가 있을 때 알림을 보냅니다.
"""

import os
import sys
import django
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from collections import defaultdict

# ========================================
# 환경별 설정 (배포 시 수정 필요)
# ========================================
# 로컬 개발 환경: C:/Users/201/dev/Team-PICK-O/backend
# 팀 프로덕션 환경: /app/backend
# ========================================

# Django 설정
import sys

# 환경별 경로 설정
if os.path.exists('/app/backend'):
    # 프로덕션 환경 (팀 DB)
    sys.path.append('/app/backend')
    print("🔧 프로덕션 환경 감지: /app/backend")
elif os.path.exists('C:/Users/201/dev/Team-PICK-O/backend'):
    # 로컬 개발 환경
    sys.path.append('C:/Users/201/dev/Team-PICK-O/backend')
    print("🔧 로컬 개발 환경 감지: C:/Users/201/dev/Team-PICK-O/backend")
else:
    # 현재 디렉토리 사용
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(current_dir, '..', 'backend')
    if os.path.exists(backend_dir):
        sys.path.append(backend_dir)
        print(f"🔧 현재 디렉토리 사용: {backend_dir}")

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from prediction.models import FishAuctionData
from django.conf import settings

class DataCollectionMonitor:
    def __init__(self):
        self.today = datetime.now().date()
        self.yesterday = self.today - timedelta(days=1)
        self.issues = []
        
    def check_daily_collection(self):
        """일별 데이터 수집 상태 확인"""
        print("🔍 일별 데이터 수집 상태 확인 중...")
        
        # 어제 수집된 데이터 확인
        yesterday_data = FishAuctionData.objects.filter(
            auction_date=self.yesterday,
            data_source='노량진수산시장_일별_규격별'
        )
        
        yesterday_count = yesterday_data.count()
        
        if yesterday_count == 0:
            self.issues.append(f"❌ 어제({self.yesterday}) 데이터가 수집되지 않았습니다.")
            return False
        
        # 데이터 품질 확인
        quality_issues = self.check_data_quality(yesterday_data)
        if quality_issues:
            self.issues.extend(quality_issues)
        
        print(f"✅ 어제 데이터: {yesterday_count}건 수집됨")
        return True
    
    def check_data_quality(self, data_queryset):
        """데이터 품질 확인"""
        issues = []
        
        # 어종별 데이터 수 확인
        species_counts = data_queryset.values('target_species').annotate(
            count=django.db.models.Count('id')
        )
        
        # 주요 어종별 최소 데이터 수
        min_counts = {
            '넙치': 10,
            '참돔': 10,
            '농어': 10,
            '참숭어': 10,
            '우럭': 10,
        }
        
        for species_stat in species_counts:
            species = species_stat['target_species']
            count = species_stat['count']
            
            if species in min_counts and count < min_counts[species]:
                issues.append(f"⚠️ {species} 데이터 부족: {count}건 (최소 {min_counts[species]}건 필요)")
        
        # 가격 데이터 이상치 확인
        price_issues = self.check_price_anomalies(data_queryset)
        if price_issues:
            issues.extend(price_issues)
        
        return issues
    
    def check_price_anomalies(self, data_queryset):
        """가격 이상치 확인"""
        issues = []
        
        # 평균가가 0이거나 비정상적으로 낮은 경우
        zero_price_count = data_queryset.filter(avg_price=0).count()
        if zero_price_count > 0:
            issues.append(f"⚠️ 평균가 0원 데이터: {zero_price_count}건")
        
        # 평균가가 비정상적으로 높은 경우 (1kg당 100만원 이상)
        high_price_count = data_queryset.filter(avg_price__gt=1000000).count()
        if high_price_count > 0:
            issues.append(f"⚠️ 비정상적으로 높은 가격 데이터: {high_price_count}건")
        
        return issues
    
    def check_weekly_trend(self):
        """주간 트렌드 확인"""
        print("📊 주간 데이터 트렌드 확인 중...")
        
        # 최근 7일 데이터
        week_ago = self.today - timedelta(days=7)
        weekly_data = FishAuctionData.objects.filter(
            auction_date__gte=week_ago,
            data_source='노량진수산시장_일별_규격별'
        )
        
        daily_counts = weekly_data.values('auction_date').annotate(
            count=django.db.models.Count('id')
        ).order_by('auction_date')
        
        print("📈 최근 7일 데이터 수집 현황:")
        for day_stat in daily_counts:
            date = day_stat['auction_date']
            count = day_stat['count']
            print(f"   {date}: {count}건")
        
        # 데이터 수집이 없는 날 확인
        collected_dates = set(day_stat['auction_date'] for day_stat in daily_counts)
        missing_dates = []
        
        for i in range(7):
            check_date = self.today - timedelta(days=i)
            if check_date not in collected_dates:
                missing_dates.append(check_date)
        
        if missing_dates:
            self.issues.append(f"❌ 데이터 수집 누락 날짜: {', '.join(str(d) for d in missing_dates)}")
    
    def generate_report(self):
        """모니터링 리포트 생성"""
        print("\n" + "="*60)
        print("📋 데이터 수집 모니터링 리포트")
        print("="*60)
        print(f"📅 생성 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"📊 확인 기간: {self.yesterday} ~ {self.today}")
        
        # 전체 데이터 통계
        total_data = FishAuctionData.objects.count()
        print(f"📈 전체 데이터: {total_data:,}건")
        
        # 최근 데이터 통계
        recent_data = FishAuctionData.objects.filter(
            auction_date__gte=self.yesterday,
            data_source='노량진수산시장_일별_규격별'
        ).count()
        print(f"📊 최근 데이터: {recent_data}건")
        
        # 등급별 분포
        tier_distribution = FishAuctionData.objects.values('tier_code__tier_code').annotate(
            count=django.db.models.Count('id')
        ).order_by('tier_code__avg_weight_kg')
        
        print("\n🏷️ 등급별 데이터 분포:")
        for tier_stat in tier_distribution:
            tier_code = tier_stat['tier_code__tier_code']
            count = tier_stat['count']
            print(f"   {tier_code}: {count:,}건")
        
        # 문제점 리포트
        if self.issues:
            print(f"\n⚠️ 발견된 문제점 ({len(self.issues)}개):")
            for i, issue in enumerate(self.issues, 1):
                print(f"   {i}. {issue}")
        else:
            print("\n✅ 문제점 없음 - 모든 것이 정상입니다!")
        
        return len(self.issues) == 0
    
    def send_alert(self, subject, message):
        """알림 메일 발송 (설정된 경우)"""
        if not hasattr(settings, 'EMAIL_HOST') or not settings.EMAIL_HOST:
            print("📧 이메일 설정이 없어 알림을 발송하지 않습니다.")
            return
        
        try:
            msg = MIMEMultipart()
            msg['From'] = settings.EMAIL_HOST_USER
            msg['To'] = settings.ADMIN_EMAIL if hasattr(settings, 'ADMIN_EMAIL') else settings.EMAIL_HOST_USER
            msg['Subject'] = subject
            
            msg.attach(MIMEText(message, 'plain'))
            
            server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT)
            server.starttls()
            server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
            server.send_message(msg)
            server.quit()
            
            print("📧 알림 메일 발송 완료")
        except Exception as e:
            print(f"📧 알림 메일 발송 실패: {e}")
    
    def run_monitoring(self):
        """전체 모니터링 실행"""
        print("🚀 데이터 수집 모니터링 시작")
        print("="*60)
        
        # 일별 수집 상태 확인
        daily_ok = self.check_daily_collection()
        
        # 주간 트렌드 확인
        self.check_weekly_trend()
        
        # 리포트 생성
        is_healthy = self.generate_report()
        
        # 문제가 있으면 알림 발송
        if not is_healthy:
            subject = f"[Team-PICK-O] 데이터 수집 모니터링 알림 - {self.today}"
            message = f"""
데이터 수집 모니터링에서 문제가 발견되었습니다.

발견된 문제점:
{chr(10).join(f"- {issue}" for issue in self.issues)}

확인 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
            """
            self.send_alert(subject, message)
        
        return is_healthy

def main():
    monitor = DataCollectionMonitor()
    is_healthy = monitor.run_monitoring()
    
    # 종료 코드 설정 (문제가 있으면 1, 없으면 0)
    sys.exit(0 if is_healthy else 1)

if __name__ == "__main__":
    main()
