# backend/prediction/management/commands/populate_kosis_data_improved.py

import requests
import datetime
from django.core.management.base import BaseCommand, CommandParser
from django.conf import settings
from django.db import transaction
from prediction.models import FishSpecies, ActualCatchVolume

class Command(BaseCommand):
    help = "KOSIS API를 통해 특정 기간의 월별 어획량 데이터를 수집합니다."

    def add_arguments(self, parser: CommandParser):
        """스크립트 실행 시 날짜 인자를 받을 수 있도록 설정"""
        parser.add_argument('--start', type=str, required=True, help='데이터 수집 시작일 (YYYYMMDD 형식)')
        parser.add_argument('--end', type=str, required=True, help='데이터 수집 종료일 (YYYYMMDD 형식)')
        parser.add_argument('--dry-run', action='store_true', help='실제 저장하지 않고 테스트만 실행')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.kosis_api_key = getattr(settings, 'KOSIS_API_KEY', None)
        self.api_base_url = "https://kosis.kr/openapi/Param/statisticsParameterData.do"
        # KOSIS 어종 코드 (연근해어업 어종별 생산량)
        self.target_species_codes = "110024,110099,110030,110057,110126,110006"
        # 연근해어업 어종별 생산량 테이블 ID (다른 테이블로 시도)
        self.table_id = "DT_1EW0004"
        # 대안 테이블 ID들
        self.alternative_table_ids = ["DT_1EW0004", "DT_1EW0003", "DT_1EW0002"]

    def handle(self, *args, **options):
        """스크립트의 메인 로직"""
        if not self.kosis_api_key:
            self.stdout.write(self.style.ERROR(".env 파일에 KOSIS_API_KEY를 설정해주세요."))
            return

        try:
            start_date = self.validate_date_format(options['start'])
            end_date = self.validate_date_format(options['end'])
        except ValueError as e:
            self.stdout.write(self.style.ERROR(f"날짜 형식 오류: {e}"))
            return

        if start_date > end_date:
            self.stdout.write(self.style.ERROR("시작일이 종료일보다 늦을 수 없습니다."))
            return

        dry_run = options.get('dry_run', False)
        if dry_run:
            self.stdout.write(self.style.WARNING("=== DRY RUN 모드: 실제 저장하지 않습니다 ==="))

        self.stdout.write(self.style.SUCCESS(f"=== 월별 어획량 데이터 수집 시작: {start_date.year}년 ~ {end_date.year}년 ==="))
        self.stdout.write(f"  -> 수집 기간: {start_date.strftime('%Y-%m')} ~ {end_date.strftime('%Y-%m')}")
        self.stdout.write(f"  -> 대상 어종: {len(self.target_species_codes.split(','))}개")
        
        try:
            self.fetch_kosis_catch_data(start_date, end_date, dry_run)
            self.stdout.write(self.style.SUCCESS("KOSIS 데이터 수집 작업을 완료했습니다."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"데이터 수집 중 오류 발생: {e}"))
            # 대안 테이블로 재시도
            self.stdout.write(self.style.WARNING("대안 테이블로 재시도합니다..."))
            self.try_alternative_tables(start_date, end_date, dry_run)

    def validate_date_format(self, date_str):
        """날짜 형식 검증"""
        try:
            return datetime.datetime.strptime(date_str, '%Y%m%d').date()
        except ValueError:
            raise ValueError(f"잘못된 날짜 형식: {date_str}. YYYYMMDD 형식을 사용하세요.")

    def validate_kosis_response(self, data):
        """KOSIS API 응답 검증"""
        if not data:
            raise ValueError("빈 응답 데이터")
        
        # 응답이 딕셔너리인 경우 (에러 응답)
        if isinstance(data, dict):
            if "err" in data:
                error_msg = data.get("errMsg", "알 수 없는 오류")
                raise ValueError(f"KOSIS API 오류: {error_msg}")
            else:
                raise ValueError(f"예상치 못한 응답 형식: {type(data)}")
        
        # 응답이 리스트인 경우
        if isinstance(data, list):
            if len(data) == 0:
                raise ValueError("데이터가 없습니다")
            
            # 첫 번째 항목에 에러가 있는지 확인
            if data and isinstance(data[0], dict) and "err" in data[0]:
                error_msg = data[0].get("errMsg", "알 수 없는 오류")
                raise ValueError(f"KOSIS API 오류: {error_msg}")
            
            return True
        
        raise ValueError(f"지원하지 않는 응답 형식: {type(data)}")

    def match_fish_species(self, kosis_species_name):
        """KOSIS 어종명을 우리 DB 어종과 매칭"""
        # 더 정확한 매칭을 위한 매핑
        mapping = {
            '넙치류': ['넙치', '광어'],
            '조피볼락류': ['우럭', '볼락'],
            '농어류': ['농어', '바다농어'],
            '참돔류': ['참돔', '돔'],
            '숭어류': ['숭어'],
            '가자미류': ['가자미', '넙치']
        }
        
        for kosis_name, our_names in mapping.items():
            if kosis_name in kosis_species_name:
                for our_name in our_names:
                    species = FishSpecies.objects.filter(
                        item_small_category_name_kr__icontains=our_name
                    ).first()
                    if species:
                        return species
        
        # 매칭 실패 시 로그
        self.stdout.write(self.style.WARNING(f"    -> 어종 매칭 실패: {kosis_species_name}"))
        return None

    def fetch_kosis_catch_data(self, start_date, end_date, dry_run=False):
        """KOSIS 통계 API를 통해 월별 어획량 데이터를 수집합니다."""
        start_month = start_date.strftime('%Y%m')
        end_month = end_date.strftime('%Y%m')

        # 기본 파라미터
        params = {
            'apiKey': self.kosis_api_key,
            'format': 'json',
            'jsonVD': 'Y',
            'method': 'getList',
            'tblId': self.table_id,
            'objL1': '1',  # 연근해어업
            'objL2': self.target_species_codes,
            'prdSe': 'M',
            'startPrdDe': start_month,
            'endPrdDe': end_month,
            'itmId': 'T01,T05'  # T01:생산량(톤), T05:생산금액(천원)
        }
        
        # 대안 파라미터 조합들
        alternative_params = [
            # 조합 1: 더 간단한 파라미터
            {
                'apiKey': self.kosis_api_key,
                'format': 'json',
                'method': 'getList',
                'tblId': self.table_id,
                'objL1': '1',
                'prdSe': 'M',
                'startPrdDe': start_month,
                'endPrdDe': end_month,
            },
            # 조합 2: 다른 어종 코드
            {
                'apiKey': self.kosis_api_key,
                'format': 'json',
                'method': 'getList',
                'tblId': self.table_id,
                'objL1': '1',
                'objL2': '110024',  # 하나의 어종만
                'prdSe': 'M',
                'startPrdDe': start_month,
                'endPrdDe': end_month,
                'itmId': 'T01'
            }
        ]
        
        # KOSIS API 파라미터 검증
        required_params = ['apiKey', 'tblId', 'objL1', 'objL2', 'prdSe', 'startPrdDe', 'endPrdDe', 'itmId']
        missing_params = [param for param in required_params if not params.get(param)]
        if missing_params:
            raise ValueError(f"필수 파라미터 누락: {missing_params}")
        
        try:
            self.stdout.write(f"  -> KOSIS API 호출 중... ({start_month} ~ {end_month})")
            if dry_run:
                self.stdout.write(f"    -> API URL: {self.api_base_url}")
                self.stdout.write(f"    -> 파라미터: {params}")
            
            response = requests.get(self.api_base_url, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            if dry_run:
                self.stdout.write(f"    -> 응답 타입: {type(data)}")
                self.stdout.write(f"    -> 응답 내용: {data}")
            
            # 응답 검증
            self.validate_kosis_response(data)

            # 데이터 처리
            self.process_kosis_data(data, dry_run)
            
            self.stdout.write(self.style.SUCCESS(
                f"  -> {start_month} ~ {end_month} KOSIS 데이터 처리 완료"
            ))
            return  # 성공하면 종료
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"    오류: KOSIS 데이터 처리 중 문제 발생 - {e}"))
            
            # 대안 파라미터 시도
            self.stdout.write(self.style.WARNING("    -> 대안 파라미터로 재시도..."))
            for i, alt_params in enumerate(alternative_params, 1):
                try:
                    self.stdout.write(f"    -> 대안 파라미터 조합 {i} 시도...")
                    if dry_run:
                        self.stdout.write(f"      -> 파라미터: {alt_params}")
                    
                    response = requests.get(self.api_base_url, params=alt_params, timeout=30)
                    response.raise_for_status()
                    
                    if dry_run:
                        self.stdout.write(f"      -> 응답 상태: {response.status_code}")
                        self.stdout.write(f"      -> 응답 헤더: {dict(response.headers)}")
                        self.stdout.write(f"      -> 응답 텍스트: {response.text[:200]}...")
                    
                    try:
                        data = response.json()
                    except ValueError as json_error:
                        # 따옴표가 없는 JSON 형태 처리
                        try:
                            import re
                            text = response.text
                            # {err:"20",errMsg:"..."} 형태를 {"err":"20","errMsg":"..."} 형태로 변환
                            text = re.sub(r'(\w+):', r'"\1":', text)
                            data = eval(text)  # 안전하지 않지만 KOSIS 응답만 처리
                            self.stdout.write(f"      -> 수정된 JSON 파싱 성공")
                        except Exception as eval_error:
                            self.stdout.write(f"      -> JSON 파싱 실패: {json_error}, 수정 시도도 실패: {eval_error}")
                            continue
                    
                    if dry_run:
                        self.stdout.write(f"      -> 응답 타입: {type(data)}")
                        self.stdout.write(f"      -> 응답 내용: {data}")
                    
                    if isinstance(data, dict) and "err" in data:
                        self.stdout.write(f"      -> 조합 {i} 오류: {data.get('errMsg')}")
                        continue
                    
                    if isinstance(data, list) and len(data) > 0:
                        self.stdout.write(self.style.SUCCESS(f"      -> 조합 {i} 성공! 데이터 {len(data)}건"))
                        self.process_kosis_data(data, dry_run)
                        return
                        
                except Exception as alt_e:
                    self.stdout.write(f"      -> 조합 {i} 시도 실패: {alt_e}")
                    continue
            
            # 모든 시도 실패 시 예외 발생
            raise

        except requests.exceptions.RequestException as e:
            self.stdout.write(self.style.ERROR(f"    오류: KOSIS API 호출 중 문제 발생 - {e}"))
            raise
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"    오류: KOSIS 데이터 처리 중 문제 발생 - {e}"))
            raise

    def try_alternative_tables(self, start_date, end_date, dry_run=False):
        """대안 테이블 ID들을 시도합니다."""
        start_month = start_date.strftime('%Y%m')
        end_month = end_date.strftime('%Y%m')
        
        for table_id in self.alternative_table_ids[1:]:  # 첫 번째는 이미 시도했으므로 제외
            self.stdout.write(f"  -> 대안 테이블 시도: {table_id}")
            
            params = {
                'apiKey': self.kosis_api_key,
                'format': 'json',
                'jsonVD': 'Y',
                'method': 'getList',
                'tblId': table_id,
                'objL1': '1',
                'objL2': self.target_species_codes,
                'prdSe': 'M',
                'startPrdDe': start_month,
                'endPrdDe': end_month,
                'itmId': 'T01,T05'
            }
            
            try:
                response = requests.get(self.api_base_url, params=params, timeout=30)
                response.raise_for_status()
                data = response.json()
                
                if dry_run:
                    self.stdout.write(f"    -> 응답 타입: {type(data)}")
                    self.stdout.write(f"    -> 응답 내용: {data}")
                
                if isinstance(data, dict) and "err" in data:
                    self.stdout.write(f"    -> 테이블 {table_id} 오류: {data.get('errMsg')}")
                    continue
                
                if isinstance(data, list) and len(data) > 0:
                    self.stdout.write(self.style.SUCCESS(f"    -> 테이블 {table_id} 성공! 데이터 {len(data)}건"))
                    # 성공한 테이블로 데이터 처리
                    self.process_kosis_data(data, dry_run)
                    return
                    
            except Exception as e:
                self.stdout.write(f"    -> 테이블 {table_id} 시도 실패: {e}")
                continue
        
        self.stdout.write(self.style.ERROR("  -> 모든 테이블 시도 실패"))

    def process_kosis_data(self, data, dry_run=False):
        """KOSIS 데이터를 처리합니다."""
        # 데이터를 어종별, 기간별로 그룹화하여 처리
        processed_data = {}
        for item in data:
            key = (item['C2_NM'], item['PRD_DE'])  # 어종명과 기간으로 키 생성
            if key not in processed_data:
                processed_data[key] = {'T01': 0, 'T05': 0, 'C1': item['C1'], 'C3': item['C3']}
            
            # 안전한 숫자 변환
            try:
                value = float(item.get('DT', 0))
            except (ValueError, TypeError):
                value = 0
                self.stdout.write(self.style.WARNING(f"    -> 잘못된 데이터 값: {item.get('DT')} -> 0으로 처리"))
            
            processed_data[key][item['ITM_ID']] = value

        processed_count = 0
        skipped_count = 0
        
        if not dry_run:
            with transaction.atomic():
                for (species_name, period), values in processed_data.items():
                    species = self.match_fish_species(species_name)
                    
                    if not species:
                        skipped_count += 1
                        continue

                    # update_or_create로 한 번에 데이터 저장/업데이트
                    ActualCatchVolume.objects.update_or_create(
                        data_period=datetime.datetime.strptime(period, '%Y%m').date(),
                        fish_species=species,
                        defaults={
                           'fishery_type_code': values['C1'],
                           'admin_division_code': values['C3'],
                           'catch_volume': values['T01'],
                           'catch_amount': values['T05'],
                           'last_modified_date': datetime.date.today()
                        }
                    )
                    processed_count += 1
        else:
            # Dry run 모드: 실제 저장하지 않고 통계만 출력
            for (species_name, period), values in processed_data.items():
                species = self.match_fish_species(species_name)
                if species:
                    processed_count += 1
                else:
                    skipped_count += 1
        
        self.stdout.write(self.style.SUCCESS(
            f"  -> KOSIS 데이터 처리 완료 (처리: {processed_count}건, 스킵: {skipped_count}건)"
        ))
