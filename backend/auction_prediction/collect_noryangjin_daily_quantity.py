import requests
import os
import sys
from datetime import datetime, timedelta
import pandas as pd
import time

# Python 경로에 현재 디렉토리 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Django 설정 가져오기
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from prediction.models import ActualAuctionPrice, FishSpecies, WholesaleMarket, CommonCode

def map_standard_to_tier(standard):
    """규격을 표준 등급으로 매핑합니다."""
    if not standard:
        return 'FWT_M', 0.8, "기본값"
    
    # 미 규격 처리
    if '미' in standard:
        # 숫자 추출
        import re
        numbers = re.findall(r'(\d+(?:\.\d+)?)', standard)
        if numbers:
            mi_number = float(numbers[0])
            if mi_number <= 1:
                return 'FWT_L', 1.0, f"미 규격: {standard} -> FWT_L"
            elif mi_number <= 2:
                return 'FWT_M', 0.5, f"미 규격: {standard} -> FWT_M"
            elif mi_number <= 5:
                return 'FWT_S', 0.2, f"미 규격: {standard} -> FWT_S"
            elif mi_number <= 10:
                return 'FWT_XS', 0.1, f"미 규격: {standard} -> FWT_XS"
            else:
                return 'FWT_XS', 0.05, f"미 규격: {standard} -> FWT_XS"
    
    # 기존 규격 매핑
    if standard in ['소', '특소']:
        return 'FWT_S', 0.4, f"기존 규격: {standard} -> FWT_S"
    elif standard in ['중']:
        return 'FWT_M', 0.8, f"기존 규격: {standard} -> FWT_M"
    elif standard in ['대', '특대']:
        return 'FWT_L', 1.5, f"기존 규격: {standard} -> FWT_L"
    
    # 기본값
    return 'FWT_M', 0.8, f"기본값: {standard} -> FWT_M"

def collect_noryangjin_daily_quantity(start_date_str=None, end_date_str=None):
    """노량진수산시장에서 5종 활어를 일별로 수집합니다 (자동 규격 매핑 포함)."""
    
    print("🐟 노량진수산시장 일별 데이터 수집 (자동 규격 매핑 포함)")
    print("="*60)
    
    # API 설정
    url = "https://www.susansijang.co.kr/nsis/miw/ko/info/excel/miw3130"
    
    cookies = {
        "__smVisitorID": "g9mATaAcvHx",
        "JSESSIONIDMIW": "zDQVT9tHza1NFPra0YvHoR1P41NV9EYF4CE3h1pos73T6LTklpFLN9CEq5i1wJEg.amV1c19kb21haW4vTUlXX1NFUlZFUjE="
    }
    
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    # 수집할 5종 활어 (API 검색용 코드와 저장용 이름 분리)
    target_species = [
        {"name": "(활)넙치", "code": "넙치", "search_name": "넙치"},
        {"name": "(활)참돔", "code": "참돔", "search_name": "참돔"},
        {"name": "(활)농어", "code": "농어", "search_name": "농어"},
        {"name": "(활)참숭어", "code": "참숭어", "search_name": "참숭어"},
        {"name": "(활)우럭", "code": "우럭", "search_name": "우럭"}
    ]
    
    # 수집 기간 설정
    if start_date_str and end_date_str:
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
        except ValueError:
            print("❌ 날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식으로 입력해주세요.")
            return
    else:
        # 기본값: 2018년 1월 1일~2019년 12월 31일
        start_date = datetime(2018, 1, 1)
        end_date = datetime(2019, 12, 31)
        print("📅 기본 기간으로 설정: 2018-01-01 ~ 2019-12-31")
    
    print(f"📅 수집 기간: {start_date.strftime('%Y-%m-%d')} ~ {end_date.strftime('%Y-%m-%d')}")
    print(f"🐟 수집 어종: {[s['name'] for s in target_species]}")
    print(f"📊 수집 방식: 일별 데이터 (규격별 모두 저장 + 자동 매핑)")
    
    # 데이터 저장 디렉토리 생성
    data_dir = "noryangjin_daily"
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
    
    total_collected = 0
    total_processed = 0
    
    for species in target_species:
        print(f"\n🐟 {species['name']} 데이터 수집 중...")
        
        current_date = start_date
        
        while current_date <= end_date:
            # 일별로 수집 (하루씩)
            day_start = current_date
            day_end = day_start
            
            # 파일명 생성
            filename = f"{data_dir}/{species['name']}_{day_start.strftime('%Y-%m-%d')}.xls"
            
            # 이미 파일이 있으면 건너뛰기
            if os.path.exists(filename):
                print(f"  📁 {filename} 이미 존재함")
                current_date = day_end + timedelta(days=1)
                continue
            
            # API 요청 데이터
            data = {
                "pageIndex": 1,
                "pageUnit": 100,
                "pageSize": 100,
                "kdfshNm": species['search_name'],
                "kdfshCode": species['search_name'],
                "searchStartDe": day_start.strftime("%Y.%m.%d"),
                "searchEndDe": day_end.strftime("%Y.%m.%d")
            }
            
            try:
                print(f"  📥 {day_start.strftime('%Y-%m-%d')} 데이터 다운로드 중...")
                
                response = requests.post(url, headers=headers, cookies=cookies, data=data, timeout=30)
                
                if response.status_code == 200 and len(response.content) > 0:
                    # 파일 저장
                    with open(filename, "wb") as f:
                        f.write(response.content)
                    
                    print(f"  ✅ {filename} 저장 완료")
                    total_collected += 1
                    
                    # 엑셀 파일 처리 및 DB 저장
                    processed_count = process_daily_excel(filename, species['name'])
                    total_processed += processed_count
                    
                    # 엑셀 파일 삭제
                    os.remove(filename)
                    print(f"  🗑️ {filename} 삭제 완료")
                    
                    # 서버 부하 방지를 위한 대기
                    time.sleep(1)
                    
                else:
                    print(f"  ❌ {day_start.strftime('%Y-%m-%d')} 다운로드 실패 또는 빈 데이터")
                    
            except Exception as e:
                print(f"  ❌ {day_start.strftime('%Y-%m-%d')} 오류: {e}")
            
            current_date = day_end + timedelta(days=1)
    
    print(f"\n📊 수집 완료")
    print(f"{'='*60}")
    print(f"🎉 총 {total_collected}개 파일 수집 완료")
    print(f"🎉 총 {total_processed}건 DB 저장 완료")

def process_daily_excel(filename, species_name):
    """일별 엑셀 파일을 처리하여 DB에 저장합니다 (자동 규격 매핑 포함)."""
    
    try:
        # 엑셀 파일 읽기
        df = pd.read_excel(filename)
        
        if df.empty:
            return 0
        
        print(f"    📊 데이터: {df.shape[0]}건")
        
        # 파일명에서 날짜 추출 (먼저 추출)
        filename_parts = filename.split('_')
        if len(filename_parts) >= 3:
            date_part = filename_parts[-1].replace('.xls', '')
            auction_date = datetime.strptime(date_part, '%Y-%m-%d').date()
        else:
            auction_date = datetime.now().date()
        
        # 주요 산지 필터링
        if '산지' in df.columns:
            major_origins = ['태안', '군산', '서천', '안흥', '진도', '통영', '완도', '제주도', '화성', '나로도']
            df_filtered = df[df['산지'].isin(major_origins)]
            print(f"    🔍 주요 산지: {len(df_filtered)}건")
        else:
            df_filtered = df
            print(f"    🔍 산지 필터링 없음: {len(df_filtered)}건")
        
        if df_filtered.empty:
            print(f"    ❌ 필터링 후 데이터 없음")
            return 0
        
        # 규격별 데이터 처리 (모든 규격 저장)
        df_all_standards = apply_quantity_based_filtering(df_filtered, auction_date)
        
        if df_all_standards.empty:
            print(f"    ❌ 처리할 데이터 없음")
            return 0
        
        print(f"    📊 규격별 데이터 처리: {len(df_all_standards)}건")
        
        # 일별 통계 계산
        try:
            # 해당 날짜의 데이터가 이미 있는지 확인
            existing_data = ActualAuctionPrice.objects.filter(
                trade_date=auction_date,
                fish_species__item_small_category_name_kr=species_name
            ).first()
            
            if existing_data:
                print(f"    ⚠️ {auction_date} 데이터가 이미 존재합니다.")
                return 0
            
            # 규격별로 데이터 저장
            saved_count = 0
            
            if '규격' in df_all_standards.columns:
                # 규격별로 그룹화하여 각각 저장
                for standard, group in df_all_standards.groupby('규격'):
                    if not group.empty:
                        # 해당 규격의 통계 계산
                        stats = calculate_quantity_based_stats(group)
                        
                        print(f"    📊 {standard} 규격: {stats['avg_price']:,.0f}원, 수량: {stats['total_quantity']:,.0f}")
                        
                        # 규격 매핑 (fwt_m, fwt_s 등으로 변환)
                        tier_code, avg_weight_kg, mapping_logic = map_standard_to_tier(standard)
                        
                        if tier_code is None:
                            print(f"    ⚠️ 규격 매핑 실패: {standard} -> 기본값 사용")
                            tier_code = 'FWT_M'  # 기본값
                            avg_weight_kg = 0.8
                        
                        print(f"    📊 규격 매핑: {standard} -> {tier_code} ({avg_weight_kg}kg)")
                        
                        # DB에 저장 (ActualAuctionPrice 모델 사용)
                        # 어종 마스터 데이터 가져오기
                        fish_species = FishSpecies.objects.get(item_small_category_name_kr=species_name)
                        
                        # 마스터 데이터 가져오기
                        market = WholesaleMarket.objects.get(market_api_code='NORYANGJIN')
                        unit_code = CommonCode.objects.get(code_type='UNIT', code_value='KG')
                        package_code = CommonCode.objects.get(code_type='PKG', code_value='BOX')
                        origin_code = CommonCode.objects.get(code_type='PLOR', code_value='KOREA')
                        
                        auction_data = ActualAuctionPrice.objects.create(
                            auction_sequence_id=f"NORYANGJIN_{auction_date}_{species_name}_{tier_code}_{saved_count}",
                            trade_date=auction_date,
                            market=market,
                            fish_species=fish_species,
                            origin_place_code=origin_code,
                            package_code=package_code,
                            unit_code=unit_code,
                            trade_volume=stats['total_quantity'],
                            auction_price=stats['avg_price'],
                            unit_weight_kg=avg_weight_kg  # 매핑된 실제 무게
                        )
                        saved_count += 1
            else:
                # 규격 정보가 없는 경우 전체 데이터 저장
                stats = calculate_quantity_based_stats(df_all_standards)
                
                print(f"    📊 전체 데이터: {stats['avg_price']:,.0f}원, 수량: {stats['total_quantity']:,.0f}")
                
                # 규격 매핑 (전체 데이터의 경우 기본값 사용)
                tier_code = 'FWT_M'  # 전체 데이터는 중간 크기로 설정
                avg_weight_kg = 0.8
                
                print(f"    📊 전체 데이터 규격: {tier_code} ({avg_weight_kg}kg)")
                
                # DB에 저장 (ActualAuctionPrice 모델 사용)
                fish_species = FishSpecies.objects.get(item_small_category_name_kr=species_name)
                market = WholesaleMarket.objects.get(market_api_code='NORYANGJIN')
                unit_code = CommonCode.objects.get(code_type='UNIT', code_value='KG')
                package_code = CommonCode.objects.get(code_type='PKG', code_value='BOX')
                origin_code = CommonCode.objects.get(code_type='PLOR', code_value='KOREA')
                
                auction_data = ActualAuctionPrice.objects.create(
                    auction_sequence_id=f"NORYANGJIN_{auction_date}_{species_name}_{tier_code}_전체",
                    trade_date=auction_date,
                    market=market,
                    fish_species=fish_species,
                    origin_place_code=origin_code,
                    package_code=package_code,
                    unit_code=unit_code,
                    trade_volume=stats['total_quantity'],
                    auction_price=stats['avg_price'],
                    unit_weight_kg=avg_weight_kg  # 매핑된 실제 무게
                )
                saved_count = 1
            
            return saved_count
            
        except Exception as e:
            print(f"    ❌ 저장 실패: {e}")
            return 0
        
    except Exception as e:
        print(f"    ❌ 파일 처리 실패: {e}")
        return 0

def apply_quantity_based_filtering(df, auction_date):
    """모든 규격의 데이터를 반환합니다 (규격별 저장을 위해)."""
    
    # 규격 컬럼이 있는 경우
    if '규격' in df.columns:
        # 수량 데이터 정리 (쉼표 제거 후 숫자 변환)
        if '수량' in df.columns:
            df['수량_clean'] = df['수량'].astype(str).str.replace(',', '').astype(float)
            
            # 규격별 수량 집계
            standard_quantity = df.groupby('규격')['수량_clean'].sum().sort_values(ascending=False)
            
            if not standard_quantity.empty:
                print(f"    📊 규격별 수량:")
                for i, (standard, quantity) in enumerate(standard_quantity.items()):
                    if i < 5:  # 상위 5개만 출력
                        print(f"      - {standard}: {quantity:,.0f}")
                    else:
                        print(f"      - 기타: {standard_quantity.iloc[5:].sum():,.0f}")
                        break
                
                print(f"    📊 총 {len(standard_quantity)}개 규격 발견")
                return df
        else:
            print(f"    📊 규격별 데이터: {len(df)}건")
            return df
    else:
        print(f"    📊 규격 정보 없음: {len(df)}건")
        return df
    
    # 규격 컬럼이 없는 경우: 전체 데이터 사용
    return df

def calculate_quantity_based_stats(df):
    """수량 기준 통계를 계산합니다."""
    
    # 데이터 정리 (쉼표 제거 후 숫자 변환)
    if '평균가' in df.columns:
        df['평균가_clean'] = df['평균가'].astype(str).str.replace(',', '').astype(float)
    if '낙찰저가' in df.columns:
        df['낙찰저가_clean'] = df['낙찰저가'].astype(str).str.replace(',', '').astype(float)
    if '낙찰고가' in df.columns:
        df['낙찰고가_clean'] = df['낙찰고가'].astype(str).str.replace(',', '').astype(float)
    if '수량' in df.columns:
        df['수량_clean'] = df['수량'].astype(str).str.replace(',', '').astype(float)
    
    # 통계 계산
    stats = {
        'standard': df['규격'].iloc[0] if '규격' in df.columns else '수량기준',
        'origin': df['산지'].iloc[0] if '산지' in df.columns else '주요산지',
        'min_price': df['낙찰저가_clean'].min() if '낙찰저가_clean' in df.columns else 0,
        'avg_price': df['평균가_clean'].mean() if '평균가_clean' in df.columns else 0,
        'max_price': df['낙찰고가_clean'].max() if '낙찰고가_clean' in df.columns else 0,
        'total_quantity': df['수량_clean'].sum() if '수량_clean' in df.columns else 0
    }
    
    return stats

def collect_single_species_daily(species_name, target_date_str):
    """단일 어종의 특정 날짜 데이터를 수집합니다."""
    
    print(f"🐟 {species_name} {target_date_str} 데이터 수집 중...")
    
    # API 설정
    url = "https://www.susansijang.co.kr/nsis/miw/ko/info/excel/miw3130"
    
    cookies = {
        "__smVisitorID": "g9mATaAcvHx",
        "JSESSIONIDMIW": "zDQVT9tHza1NFPra0YvHoR1P41NV9EYF4CE3h1pos73T6LTklpFLN9CEq5i1wJEg.amV1c19kb21haW4vTUlXX1NFUlZFUjE="
    }
    
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        # API 요청 데이터
        data = {
            "pageIndex": 1,
            "pageUnit": 100,
            "pageSize": 100,
            "kdfshNm": species_name,
            "kdfshCode": species_name,
            "searchStartDe": target_date_str.replace('-', '.'),
            "searchEndDe": target_date_str.replace('-', '.')
        }
        
        print(f"  📥 {target_date_str} 데이터 다운로드 중...")
        
        response = requests.post(url, headers=headers, cookies=cookies, data=data, timeout=30)
        
        if response.status_code == 200 and len(response.content) > 0:
            # 임시 파일로 저장
            temp_filename = f"temp_{species_name}_{target_date_str}.xls"
            
            with open(temp_filename, "wb") as f:
                f.write(response.content)
            
            print(f"  ✅ 임시 파일 저장 완료")
            
            # 엑셀 파일 처리 및 DB 저장
            processed_count = process_daily_excel(temp_filename, species_name)
            
            # 임시 파일 삭제
            os.remove(temp_filename)
            print(f"  🗑️ 임시 파일 삭제 완료")
            
            return processed_count
        else:
            print(f"  ❌ {target_date_str} 다운로드 실패 또는 빈 데이터")
            return 0
            
    except Exception as e:
        print(f"  ❌ {target_date_str} 오류: {e}")
        return 0

if __name__ == "__main__":
    import sys
    
    # 명령행 인수로 날짜 받기
    if len(sys.argv) == 3:
        start_date = sys.argv[1]
        end_date = sys.argv[2]
        print(f"📅 입력된 기간: {start_date} ~ {end_date}")
        collect_noryangjin_daily_quantity(start_date, end_date)
    elif len(sys.argv) == 1:
        print("📅 기본 기간으로 실행합니다.")
        collect_noryangjin_daily_quantity()
    else:
        print("❌ 사용법:")
        print("  python collect_noryangjin_daily_quantity.py                    # 기본 기간 (2020-01-01 ~ 2020-01-07)")
        print("  python collect_noryangjin_daily_quantity.py 2020-01-01 2020-01-07  # 지정 기간")
        print("  예시: python collect_noryangjin_daily_quantity.py 2020-01-01 2020-01-31")
