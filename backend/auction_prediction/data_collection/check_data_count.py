import os
import sys
import django

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from prediction.models import FishAuctionData, ExternalEnvironmentalData, ActualAuctionPrice
from django.db.models import Count
from collections import defaultdict

def check_data_count():
    """API별로 수집된 데이터 건수를 확인합니다."""
    
    print("📊 API별 수집된 데이터 건수 확인")
    print("="*60)
    
    # 1. FishAuctionData (경매 데이터)
    print("\n🎣 경매 데이터 (FishAuctionData)")
    print("-" * 40)
    
    # 전체 건수
    total_count = FishAuctionData.objects.count()
    print(f"📈 전체 건수: {total_count:,}건")
    
    # 데이터 소스별 건수
    source_counts = FishAuctionData.objects.values('data_source').annotate(
        count=Count('id')
    ).order_by('-count')
    
    print("\n📋 데이터 소스별 건수:")
    for source in source_counts:
        print(f"  - {source['data_source']}: {source['count']:,}건")
    
    # 어종별 건수
    species_counts = FishAuctionData.objects.values('target_species').annotate(
        count=Count('id')
    ).order_by('-count')
    
    print("\n🐟 어종별 건수:")
    for species in species_counts:
        print(f"  - {species['target_species']}: {species['count']:,}건")
    
    # 연도별 건수
    year_counts = FishAuctionData.objects.extra(
        select={'year': 'EXTRACT(year FROM auction_date)'}
    ).values('year').annotate(
        count=Count('id')
    ).order_by('year')
    
    print("\n📅 연도별 건수:")
    for year in year_counts:
        print(f"  - {year['year']}년: {year['count']:,}건")
    
    # 2. ExternalEnvironmentalData (환경 데이터)
    print("\n🌤️ 환경 데이터 (ExternalEnvironmentalData)")
    print("-" * 40)
    
    env_total = ExternalEnvironmentalData.objects.count()
    print(f"📈 전체 건수: {env_total:,}건")
    
    if env_total > 0:
        env_source_counts = ExternalEnvironmentalData.objects.values('data_source').annotate(
            count=Count('id')
        ).order_by('-count')
        
        print("\n📋 데이터 소스별 건수:")
        for source in env_source_counts:
            print(f"  - {source['data_source']}: {source['count']:,}건")
    
    # 3. ActualAuctionPrice (실제 경매가)
    print("\n💰 실제 경매가 (ActualAuctionPrice)")
    print("-" * 40)
    
    price_total = ActualAuctionPrice.objects.count()
    print(f"📈 전체 건수: {price_total:,}건")
    
    if price_total > 0:
        price_source_counts = ActualAuctionPrice.objects.values('data_source').annotate(
            count=Count('id')
        ).order_by('-count')
        
        print("\n📋 데이터 소스별 건수:")
        for source in price_source_counts:
            print(f"  - {source['data_source']}: {source['count']:,}건")
    
    # 4. 요약
    print("\n" + "="*60)
    print("📊 전체 요약")
    print("="*60)
    print(f"🎣 경매 데이터: {total_count:,}건")
    print(f"🌤️ 환경 데이터: {env_total:,}건")
    print(f"💰 실제 경매가: {price_total:,}건")
    print(f"📈 총 데이터: {total_count + env_total + price_total:,}건")
    
    # 5. API별 매핑
    print("\n🔗 API별 데이터 매핑")
    print("-" * 40)
    
    api_mapping = {
        "노량진수산시장": "노량진수산시장(주별)",
        "농림축산식품부": "AGRICULTURE_API",
        "aT 경매가": "AT_API",
        "기상청": "KMA_API",
        "한국해양조사원": "KHOA_API",
        "KOSIS": "KOSIS_API"
    }
    
    for api_name, data_source in api_mapping.items():
        count = FishAuctionData.objects.filter(data_source=data_source).count()
        print(f"  - {api_name}: {count:,}건")

if __name__ == "__main__":
    check_data_count()
