"""
기상청 날씨 및 경보 API 서비스
실시간 날씨 정보와 특보 정보를 가져옵니다.
"""
import requests
import json
from datetime import datetime, timedelta
from django.conf import settings
from typing import List, Dict, Optional, Any
import logging

logger = logging.getLogger(__name__)

# 로깅 레벨 설정 (운영용)
logger.setLevel(logging.INFO)

class WeatherService:
    """기상청 API 서비스 클래스"""
    
    def __init__(self):
        self.api_key = getattr(settings, 'DATA_GO_KR_API_KEY', None)
        if not self.api_key:
            logger.warning("DATA_GO_KR_API_KEY가 설정되지 않았습니다.")
        
        # 기상청 API URL
        self.base_url = "https://apihub.kma.go.kr/api/typ01/url"
        self.forecast_url = f"http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst"
        # 특보 조회 서비스 (현재 발효 중인 특보)
        self.warning_url = f"{self.base_url}/wrn_now_data_new.php"
        # 단기예보 서비스 (특보 관련 데이터 추출용)
        self.forecast_warning_url = f"http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst"
        
        # 주요 도시 격자 좌표
        self.city_coordinates = {
            '서울': {'nx': 60, 'ny': 127},
            '부산': {'nx': 98, 'ny': 76},
            '대구': {'nx': 89, 'ny': 90},
            '인천': {'nx': 55, 'ny': 124},
            '광주': {'nx': 58, 'ny': 74},
            '대전': {'nx': 67, 'ny': 100},
            '울산': {'nx': 102, 'ny': 84},
            '수원': {'nx': 60, 'ny': 120},
            '창원': {'nx': 89, 'ny': 76},
            '청주': {'nx': 69, 'ny': 106},
        }
    
    def get_current_warnings(self, area: str = None) -> List[Dict[str, Any]]:
        """
        현재 발효 중인 특보 정보를 가져옵니다.
        
        Args:
            area: 지역명 (None이면 전체)
            
        Returns:
            특보 정보 리스트
        """
        if not self.api_key:
            logger.error("❌ API 키가 설정되지 않았습니다.")
            return []
        
        warnings = self._try_special_warning_api(area)
        if warnings:
            return warnings
        
        return self._try_forecast_api(area)
    
    def _parse_warning_response(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """새로운 기상청 API 응답을 파싱합니다."""
        warnings = []
        
        try:
            response = data.get('response', {})
            body = response.get('body', {})
            items = body.get('items', {})
            
            if not items:
                return warnings
            
            # items가 리스트인 경우와 딕셔너리인 경우 모두 처리
            if isinstance(items, dict):
                item_list = items.get('item', [])
            elif isinstance(items, list):
                item_list = items
            else:
                item_list = []
            
            if not isinstance(item_list, list):
                item_list = [item_list] if item_list else []
            
            for item in item_list:
                if not isinstance(item, dict):
                    continue
                
                # 새로운 API 응답 구조에 맞게 파싱
                warning_info = {
                    'level': self._get_warning_level(item.get('LVL', '')),
                    'type': self._get_warning_type(item.get('WRN', '')),
                    'message': f"{self._get_warning_type(item.get('WRN', ''))} {self._get_warning_level(item.get('LVL', ''))}",
                    'area': item.get('REG_KO', ''),
                    'validTime': item.get('TM_EF', ''),
                    'raw_data': item
                }
                
                warnings.append(warning_info)
                
        except Exception as e:
            logger.error(f"❌ 특보 응답 파싱 실패: {e}")
        
        return warnings
    
    def _get_warning_level(self, level_str: str) -> str:
        """경보 레벨을 표준화합니다."""
        level_mapping = {
            '주의보': '주의보',
            '경보': '경보',
            '심각': '심각',
            '주의': '주의보',
            '경고': '경보'
        }
        
        for key, value in level_mapping.items():
            if key in level_str:
                return value
        
        return '주의보'  # 기본값
    
    def _get_warning_type(self, type_str: str) -> str:
        """새로운 API 응답 구조에 맞게 경보 타입을 표준화합니다."""
        type_mapping = {
            'H': '폭염',      # 폭염
            'C': '한파',      # 한파
            'T': '태풍',      # 태풍
            'S': '대설',      # 대설
            'W': '강풍',      # 강풍
            'R': '호우',      # 호우
            'D': '건조',      # 건조
            'Y': '황사',      # 황사
            'V': '풍랑',      # 풍랑
            'O': '해일',      # 해일
            'N': '지진해일',  # 지진해일
            'F': '안개'       # 안개
        }
        
        # 코드로 직접 매핑
        if type_str in type_mapping:
            return type_mapping[type_str]
        
        # 텍스트로도 매핑 시도
        for key, value in type_mapping.items():
            if key in type_str or value in type_str:
                return value
        
        return '기타'  # 기본값
    
    def get_weather_forecast(self, area: str = '서울') -> Optional[Dict[str, Any]]:
        """
        단기 예보 정보를 가져옵니다.
        
        Args:
            area: 지역명
            
        Returns:
            예보 정보
        """
        if not self.api_key or area not in self.city_coordinates:
            return None
        
        try:
            coords = self.city_coordinates[area]
            now = datetime.now()
            
            # 기상청 API는 매시 45분에 발표되므로, 가장 최근 발표 시간 계산
            if now.minute < 45:
                base_time = (now - timedelta(hours=1)).strftime('%H%M')
                base_date = (now - timedelta(hours=1)).strftime('%Y%m%d')
            else:
                base_time = now.strftime('%H%M')
                base_date = now.strftime('%Y%m%d')
            
            params = {
                'serviceKey': self.api_key,
                'pageNo': 1,
                'numOfRows': 1000,
                'dataType': 'JSON',
                'base_date': base_date,
                'base_time': base_time,
                'nx': coords['nx'],
                'ny': coords['ny']
            }
            
            response = requests.get(self.forecast_url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            return self._parse_weather_forecast_response(data, area)
            
        except Exception as e:
            logger.error(f"❌ 날씨 예보 데이터 가져오기 실패: {e}")
            return None
    
    def _parse_weather_forecast_response(self, data: Dict[str, Any], area: str) -> Dict[str, Any]:
        """날씨 예보 응답을 파싱합니다."""
        try:
            response = data.get('response', {})
            body = response.get('body', {})
            items = body.get('items', {})
            
            if not items:
                return {}
            
            item_list = items.get('item', [])
            if not isinstance(item_list, list):
                item_list = [item_list] if item_list else []
            
            # 현재 시간과 가장 가까운 예보 찾기
            current_time = datetime.now()
            current_forecast = {}
            
            for item in item_list:
                if not isinstance(item, dict):
                    continue
                
                fcst_time = item.get('fcstTime', '')
                if not fcst_time:
                    continue
                
                try:
                    fcst_datetime = datetime.strptime(fcst_time, '%Y%m%d%H%M')
                    time_diff = abs((fcst_datetime - current_time).total_seconds())
                    
                    if not current_forecast or time_diff < current_forecast.get('time_diff', float('inf')):
                        current_forecast = {
                            'time_diff': time_diff,
                            'temperature': item.get('fcstValue', ''),
                            'humidity': item.get('fcstValue', ''),
                            'precipitation': item.get('fcstValue', ''),
                            'weather': item.get('fcstValue', ''),
                            'time': fcst_time
                        }
                except:
                    continue
            
            return {
                'area': area,
                'current': current_forecast,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ 날씨 예보 응답 파싱 실패: {e}")
            return {}
    
    def _try_special_warning_api(self, area: str = None) -> List[Dict[str, Any]]:
        """기상청 특보 조회 API를 시도합니다."""
        try:
            params = {
                'fe': 'f',  # 발표시간 기준
                'tm': '',   # 현재 시각 (비워두면 현재)
                'disp': '0', # 기본 표출
                'help': '1', # 도움말 정보 포함
                'authKey': self.api_key
            }
            
            logger.info(f"🚨 기상청 특보 API 호출 시작")
            logger.info(f"📡 API URL: {self.warning_url}")
            logger.info(f"🔑 API 키: {self.api_key[:10]}...")
            logger.info(f"📋 요청 파라미터: {params}")
            
            response = requests.get(self.warning_url, params=params, timeout=30)
            response.raise_for_status()
            
            # 응답 내용 확인
            if len(response.content) > 0:
                text_content = response.text
                cleaned_text = text_content.strip()
                
                # START7777 형식인지 확인
                if cleaned_text.startswith('#START7777') or '#START7777' in cleaned_text:
                    data = self._parse_text_response(cleaned_text, area)
                else:
                    try:
                        data = response.json()
                    except Exception as json_error:
                        logger.error(f"❌ JSON 파싱 실패: {json_error}")
                        data = {'response': {'body': {'items': {'item': []}}}}
            else:
                logger.error("❌ 응답 내용이 비어있음")
                data = {'response': {'body': {'items': {'item': []}}}}
            
            # 응답 데이터 파싱
            warnings = self._parse_warning_response(data)
            
            return warnings
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ 특보 API 호출 실패: {e}")
            return []
        except Exception as e:
            logger.error(f"❌ 특보 데이터 처리 실패: {e}")
            return []
    
    def _parse_text_response(self, text: str, area: str = None) -> Dict[str, Any]:
        """텍스트 형태의 기상청 API 응답을 파싱합니다."""
        try:
            if '#START7777' in text:
                lines = text.strip().split('\n')
                data = {'response': {'body': {'items': {'item': []}}}}
                item_count = 0
                target_area_count = 0
                
                for line in lines:
                    if line.startswith('#') or not line.strip():
                        continue
                    
                    parts = line.split(',')
                    if len(parts) < 8:
                        continue
                    
                    region_name = parts[3].strip()
                    warning_type = parts[6].strip()
                    warning_level = parts[7].strip()
                    
                    # 지역별 특보 필터링
                    is_target_area = False
                    if area:
                        if area in region_name:
                            is_target_area = True
                        elif area == '서울' and any(keyword in region_name for keyword in ['서울', '서울특별시', '서울시', '서울동남권', '서울동북권', '서울서남권', '서울서북권']):
                            is_target_area = True
                        elif area == '강릉' and any(keyword in region_name for keyword in ['강릉', '강릉시', '강릉시평지']):
                            is_target_area = True
                        elif area == '부산' and any(keyword in region_name for keyword in ['부산', '부산광역시', '부산동부', '부산서부', '부산중부']):
                            is_target_area = True
                        elif area == '대구' and any(keyword in region_name for keyword in ['대구', '대구광역시']):
                            is_target_area = True
                        elif area == '인천' and any(keyword in region_name for keyword in ['인천', '인천광역시']):
                            is_target_area = True
                        elif area == '광주' and any(keyword in region_name for keyword in ['광주', '광주광역시']):
                            is_target_area = True
                        elif area == '대전' and any(keyword in region_name for keyword in ['대전', '대전광역시']):
                            is_target_area = True
                        elif area == '울산' and any(keyword in region_name for keyword in ['울산', '울산광역시', '울산동부', '울산서부']):
                            is_target_area = True
                        elif area == '수원' and any(keyword in region_name for keyword in ['수원', '수원시']):
                            is_target_area = True
                        elif area == '창원' and any(keyword in region_name for keyword in ['창원', '창원시']):
                            is_target_area = True
                        elif area == '청주' and any(keyword in region_name for keyword in ['청주', '청주시']):
                            is_target_area = True
                        elif area == '춘천' and any(keyword in region_name for keyword in ['춘천', '춘천시']):
                            is_target_area = True
                        elif area == '원주' and any(keyword in region_name for keyword in ['원주', '원주시']):
                            is_target_area = True
                        elif area == '속초' and any(keyword in region_name for keyword in ['속초', '속초시', '속초시평지']):
                            is_target_area = True
                        elif area == '포항' and any(keyword in region_name for keyword in ['포항', '포항시']):
                            is_target_area = True
                        elif area == '경주' and any(keyword in region_name for keyword in ['경주', '경주시']):
                            is_target_area = True
                        elif area == '제주' and any(keyword in region_name for keyword in ['제주', '제주도']):
                            is_target_area = True
                    else:
                        is_target_area = True
                    
                    if is_target_area:
                        item = {
                            'REG_UP': parts[0].strip(),
                            'REG_UP_KO': parts[1].strip(),
                            'REG_ID': parts[2].strip(),
                            'REG_KO': parts[3].strip(),
                            'TM_FC': parts[4].strip(),
                            'TM_EF': parts[5].strip(),
                            'WRN': parts[6].strip(),
                            'LVL': parts[7].strip(),
                            'CMD': parts[8].strip() if len(parts) > 8 else '',
                            'ED_TM': parts[9].strip() if len(parts) > 9 else ''
                        }
                        data['response']['body']['items']['item'].append(item)
                        item_count += 1
                        target_area_count += 1
                        
                        pass
                
                return data
            else:
                logger.warning(f"⚠️ START7777를 찾을 수 없음: {text[:100]}")
                return {'response': {'body': {'items': {'item': []}}}}
            
        except Exception as e:
            logger.error(f"❌ 텍스트 응답 파싱 실패: {e}")
            return {'response': {'body': {'items': {'item': []}}}}
    
    def _try_forecast_api(self, area: str = None) -> List[Dict[str, Any]]:
        """단기예보에서 특보 관련 데이터를 추출합니다."""
        try:
            if not area or area not in self.city_coordinates:
                logger.warning("⚠️ 지역 정보가 없어 단기예보 API 호출 불가")
                return []
            
            coords = self.city_coordinates[area]
            now = datetime.now()
            
            # 기상청 API는 매시 45분에 발표되므로, 가장 최근 발표 시간 계산
            if now.minute < 45:
                base_time = (now - timedelta(hours=1)).strftime('%H%M')
                base_date = (now - timedelta(hours=1)).strftime('%Y%m%d')
            else:
                base_time = now.strftime('%H%M')
                base_date = now.strftime('%Y%m%d')
            
            params = {
                'serviceKey': self.api_key,
                'pageNo': 1,
                'numOfRows': 1000,
                'dataType': 'JSON',
                'base_date': base_date,
                'base_time': base_time,
                'nx': coords['nx'],
                'ny': coords['ny']
            }
            
            response = requests.get(self.forecast_warning_url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            # 단기예보에서 특보 관련 데이터 추출
            warnings = self._parse_forecast_warning_response(data, area)
            
            return warnings
            
        except Exception as e:
            logger.error(f"❌ 단기예보 처리 실패: {e}")
            return []
    
    def _parse_forecast_warning_response(self, data: Dict[str, Any], area: str) -> List[Dict[str, Any]]:
        """단기예보 응답에서 특보 관련 데이터를 추출합니다."""
        warnings = []
        
        try:
            response = data.get('response', {})
            body = response.get('body', {})
            items = body.get('items', {})
            
            if not items:
                return warnings
            
            item_list = items.get('item', [])
            if not isinstance(item_list, list):
                item_list = [item_list] if item_list else []
            
            # 특보 관련 데이터 추출 (날씨 데이터에서 특보 관련 정보 찾기)
            for item in item_list:
                if not isinstance(item, dict):
                    continue
                
                category = item.get('category', '')
                fcst_value = item.get('fcstValue', '')
                
                # 특보 관련 카테고리 확인 (풍랑, 특보 등)
                if category in ['WAV', 'WAV_AMT', 'WAV_HGT'] or '특보' in str(fcst_value):
                    warning_info = {
                        'level': '주의보',  # 기본값
                        'type': '기타',
                        'message': f"{category} 특보 관련 데이터",
                        'area': area,
                        'validTime': item.get('fcstTime', ''),
                        'raw_data': item
                    }
                    warnings.append(warning_info)
            
        except Exception as e:
            logger.error(f"❌ 단기예보 파싱 실패: {e}")
        
        return warnings
