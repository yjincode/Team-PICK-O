"""
LLM 기반 텍스트 파싱 서비스
Phi-3 Mini 모델을 사용하여 수산물 주문 텍스트를 구조화된 데이터로 변환
"""
import json
import logging
import requests
from typing import Dict, List, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class LLMOrderParser:
    def __init__(self):
        self.ollama_url = "http://localhost:11434/api/generate"
        self.model_name = "phi3:mini"  # 2.3GB 경량 모델
        self._businesses_cache = None
        self._fish_types_cache = None
        self._cache_time = None
        self._auth_token = None
        
    def is_ollama_available(self) -> bool:
        """Ollama 서비스가 실행 중인지 확인"""
        try:
            response = requests.get("http://localhost:11434/api/tags", timeout=10)
            return response.status_code == 200
        except:
            return False
    
    def set_auth_token(self, token: str):
        """인증 토큰 설정"""
        self._auth_token = token
        
    def parse_order_text(self, text: str, user_id: Optional[int] = None) -> Dict:
        """
        LLM을 사용하여 주문 텍스트 파싱
        
        Args:
            text: 파싱할 주문 텍스트
            user_id: 요청한 사용자 ID (선택사항)
            
        Returns:
            Dict: 파싱된 주문 정보
        """
        if not self.is_ollama_available():
            logger.warning("Ollama 서비스를 사용할 수 없습니다. 기본 파싱으로 fallback")
            return self._fallback_parse(text)
        
        try:
            # 백엔드에서 등록된 업체명과 어종명 가져오기 (사용자별)
            businesses = self._fetch_businesses(user_id)
            fish_types = self._fetch_fish_types(user_id)
            
            prompt = self._create_parsing_prompt(text, businesses, fish_types)
            
            response = requests.post(
                self.ollama_url,
                json={
                    "model": self.model_name,
                    "prompt": prompt,
                    "format": "json",
                    "stream": False,
                    "options": {
                        "temperature": 0.1,  # 일관성을 위해 낮게 설정
                        "top_p": 0.9,
                        "num_predict": 300  # 응답 길이 줄여서 속도 향상
                    }
                },
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                parsed_data = json.loads(result.get('response', '{}'))
                return self._validate_and_format_result(parsed_data, text, businesses, fish_types)
            else:
                logger.error(f"Ollama API 오류: {response.status_code}")
                return self._fallback_parse(text)
                
        except Exception as e:
            logger.error(f"LLM 파싱 오류: {e}")
            return self._fallback_parse(text)
    
    def _create_parsing_prompt(self, text: str, businesses: list = None, fish_types: list = None) -> str:
        """파싱용 프롬프트 생성 (데이터베이스 컨텍스트 포함)"""
        
        # 업체명 리스트 생성
        business_context = ""
        if businesses:
            business_names = [b.get('business_name', '') for b in businesses[:20]]  # 상위 20개만
            business_context = f"\nRegistered businesses: {', '.join(business_names)}"
        
        # 어종명 리스트 생성  
        fish_context = ""
        if fish_types:
            fish_names = [f.get('name', '') for f in fish_types[:30]]  # 상위 30개만
            fish_context = f"\nRegistered fish types: {', '.join(fish_names)}"
        
        return f"""Extract seafood order information from Korean text. Use registered data for accurate matching.

Text: "{text}"{business_context}{fish_context}

Instructions:
1. Match business names and fish types from registered data above (exact or similar names)
2. Handle Korean numbers: 세마리=3, 다섯=5, 스물일곱=27, 서른다섯=35
3. Handle typos and similar words: 고릉어→고등어, 갈치→갈치, 광어→광어
4. Extract ALL items with quantity and unit
5. Find delivery dates and business names

Format:
- business_name: match from registered businesses (handle typos)
- fish_name: match from registered fish types (handle typos)  
- quantity: convert Korean numbers to digits
- unit: kg, 마리, 박스, 개

Example:
"바다수산에 고릉어 세마리, 갈치 스물박스" → {{"business_name":"바다수산","items":[{{"fish_name":"고등어","quantity":3,"unit":"마리"}},{{"fish_name":"갈치","quantity":20,"unit":"박스"}}]}}

JSON:"""

    def _validate_and_format_result(self, parsed_data: Dict, original_text: str, businesses: list = None, fish_types: list = None) -> Dict:
        """파싱 결과 검증 및 포맷팅 (실제 데이터베이스와 매칭)"""
        result = {
            "business_name": None,
            "business_id": None,
            "items": [],
            "delivery_date": None,
            "memo": "",
            "source_type": "llm",
            "original_text": original_text,
            "unmatched_items": [],  # 매칭되지 않은 항목들
            "validation_warnings": []  # 검증 경고
        }
        
        # 업체명 검증 및 매칭
        if "business_name" in parsed_data and parsed_data["business_name"]:
            parsed_business = str(parsed_data["business_name"]).strip()
            matched_business = self._find_matching_business(parsed_business, businesses or [])
            
            if matched_business:
                result["business_name"] = matched_business["business_name"]
                result["business_id"] = matched_business.get("id")
            else:
                result["validation_warnings"].append(f"업체명 '{parsed_business}'이 등록되지 않았습니다")
        
        # 품목 추출 및 검증 (실제 데이터베이스와 매칭)
        if "items" in parsed_data and isinstance(parsed_data["items"], list):
            for item in parsed_data["items"]:
                if isinstance(item, dict) and "fish_name" in item:
                    parsed_fish = str(item.get("fish_name", "")).strip()
                    quantity = self._parse_quantity(item.get("quantity", 0))
                    unit = self._normalize_unit(str(item.get("unit", "")).strip())
                    
                    if parsed_fish and quantity > 0:
                        # 실제 어종 데이터베이스에서 매칭 확인
                        matched_fish = self._find_matching_fish(parsed_fish, fish_types or [])
                        
                        if matched_fish:
                            # 매칭된 경우만 정식 항목으로 추가
                            formatted_item = {
                                "fish_type_id": matched_fish.get("id"),
                                "fish_name": matched_fish["name"],
                                "quantity": quantity,
                                "unit": unit,
                                "unit_price": matched_fish.get("default_price", 0)
                            }
                            result["items"].append(formatted_item)
                        else:
                            # 매칭되지 않은 경우 별도 처리
                            unmatched_item = {
                                "original_fish_name": parsed_fish,
                                "quantity": quantity,
                                "unit": unit,
                                "suggested_matches": self._get_fish_suggestions(parsed_fish, fish_types or [])
                            }
                            result["unmatched_items"].append(unmatched_item)
                            result["validation_warnings"].append(f"어종 '{parsed_fish}'이 등록되지 않았습니다")
        
        # 배송일 처리
        if "delivery_date" in parsed_data and parsed_data["delivery_date"]:
            result["delivery_date"] = self._parse_delivery_date(parsed_data["delivery_date"])
        
        # 메모
        if "memo" in parsed_data and parsed_data["memo"]:
            result["memo"] = str(parsed_data["memo"]).strip()
        
        return result
    
    def _parse_quantity(self, quantity) -> float:
        """수량 파싱 (한글 숫자 지원 강화)"""
        try:
            if isinstance(quantity, (int, float)):
                return float(quantity)
            elif isinstance(quantity, str):
                quantity_str = quantity.strip()
                
                # 복합 한글 숫자 처리
                result = self._parse_korean_number(quantity_str)
                if result > 0:
                    return result
                
                # 아라비아 숫자 추출
                import re
                numbers = re.findall(r'\d+(?:\.\d+)?', quantity_str)
                if numbers:
                    return float(numbers[0])
            return 0.0
        except:
            return 0.0
    
    def _parse_korean_number(self, text: str) -> float:
        """한글 숫자를 아라비아 숫자로 변환"""
        # 기본 한글 숫자
        korean_numbers = {
            '영': 0, '공': 0, '일': 1, '이': 2, '삼': 3, '사': 4, '오': 5,
            '육': 6, '칠': 7, '팔': 8, '구': 9, '십': 10, '백': 100, '천': 1000,
            '한': 1, '두': 2, '세': 3, '네': 4, '다섯': 5, '여섯': 6, 
            '일곱': 7, '여덟': 8, '아홉': 9, '열': 10, '스무': 20, '스물': 20,
            '서른': 30, '마흔': 40, '쉰': 50, '예순': 60, '일흔': 70, '여든': 80, '아흔': 90
        }
        
        # 단순 매칭
        if text in korean_numbers:
            return float(korean_numbers[text])
        
        # 복합 숫자 처리 (예: 스물일곱, 서른다섯)
        import re
        
        # 10의 배수 + 1-9 패턴
        tens_ones_pattern = r'(스물|서른|마흔|쉰|예순|일흔|여든|아흔)(일|이|삼|사|오|육|칠|팔|구|한|두|세|네|다섯|여섯|일곱|여덟|아홉)'
        match = re.search(tens_ones_pattern, text)
        if match:
            tens = korean_numbers.get(match.group(1), 0)
            ones = korean_numbers.get(match.group(2), 0)
            return float(tens + ones)
        
        # 십의 자리 처리 (예: 일십, 이십삼)
        tens_pattern = r'(일|이|삼|사|오|육|칠|팔|구)십(일|이|삼|사|오|육|칠|팔|구)?'
        match = re.search(tens_pattern, text)
        if match:
            tens_digit = korean_numbers.get(match.group(1), 0) * 10
            ones_digit = korean_numbers.get(match.group(2) or '', 0)
            return float(tens_digit + ones_digit)
        
        # 단순 십 처리
        if '십' in text and text != '십':
            for num_text, num_val in korean_numbers.items():
                if num_text + '십' == text and 1 <= num_val <= 9:
                    return float(num_val * 10)
        
        return 0.0
    
    def _normalize_unit(self, unit: str) -> str:
        """단위 정규화"""
        unit = unit.lower().strip()
        unit_mapping = {
            'kg': 'kg', 'kilo': 'kg', '키로': 'kg', 'k': 'kg', '킬로': 'kg',
            '마리': '마리', '개': '마리', '미': '마리',
            '박스': '박스', '상자': '박스',
            '통': '통', '팩': '팩'
        }
        return unit_mapping.get(unit, unit or '개')
    
    def _parse_delivery_date(self, date_str: str) -> Optional[str]:
        """배송일 파싱"""
        if not date_str:
            return None
            
        date_str = str(date_str).strip().lower()
        today = datetime.now().date()
        
        date_mapping = {
            '오늘': today,
            '내일': today + timedelta(days=1),
            '모레': today + timedelta(days=2),
            '글피': today + timedelta(days=3)
        }
        
        for korean_date, actual_date in date_mapping.items():
            if korean_date in date_str:
                return actual_date.isoformat()
        
        # 기본값: 내일
        if date_str:
            return (today + timedelta(days=1)).isoformat()
        
        return None
    
    def _fallback_parse(self, text: str) -> Dict:
        """LLM 실패 시 기본 정규식 파싱"""
        import re
        
        result = {
            "business_name": None,
            "business_id": None,
            "items": [],
            "delivery_date": None,
            "memo": "LLM 파싱 실패 - 정규식 fallback",
            "source_type": "regex_fallback",
            "original_text": text
        }
        
        # 간단한 정규식 파싱
        fish_pattern = r'([가-힣]+)\s*(\d+(?:\.\d+)?)\s*(kg|마리|박스|개|통|팩|키로|킬로)'
        matches = re.findall(fish_pattern, text, re.IGNORECASE)
        
        for match in matches:
            fish_name, quantity, unit = match
            result["items"].append({
                "fish_name": fish_name,
                "quantity": float(quantity),
                "unit": self._normalize_unit(unit),
                "unit_price": 0
            })
        
        # 업체명 추출
        business_patterns = [
            r'([가-힣]+(?:수산|마트|식품|어장|회사|상회))[에게로한테으로]',
            r'([가-힣]+(?:수산|마트|식품|어장|회사|상회))',
        ]
        
        for pattern in business_patterns:
            match = re.search(pattern, text)
            if match:
                result["business_name"] = match.group(1)
                break
        
        return result
    
    def _fetch_businesses(self, user_id: Optional[int] = None) -> list:
        """백엔드에서 등록된 업체명 목록 조회 (캐싱 포함)"""
        now = datetime.now()
        
        # 캐시가 5분 이내면 재사용
        if (self._businesses_cache is not None and 
            self._cache_time is not None and 
            (now - self._cache_time).seconds < 300):
            return self._businesses_cache
            
        try:
            import os
            backend_host = os.getenv('BACKEND_HOST', 'localhost')
            backend_port = os.getenv('BACKEND_PORT', '8000')
            backend_url = f"http://{backend_host}:{backend_port}/api/v1/business/customers/"
            
            # 인증 헤더 준비
            headers = {}
            if self._auth_token:
                headers['Authorization'] = self._auth_token
                
            response = requests.get(backend_url, headers=headers, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                # 응답이 리스트면 직접 사용, 딕셔너리면 results 키 확인
                if isinstance(data, list):
                    businesses = data
                elif isinstance(data, dict):
                    businesses = data.get('results', data.get('data', []))
                else:
                    businesses = []
                
                # 캐시 업데이트
                self._businesses_cache = businesses
                self._cache_time = now
                
                return businesses
        except Exception as e:
            logger.warning(f"업체명 조회 실패: {e}")
        
        return self._businesses_cache or []
    
    def _fetch_fish_types(self, user_id: Optional[int] = None) -> list:
        """백엔드에서 등록된 어종명 목록 조회 (캐싱 공유)"""
        now = datetime.now()
        
        # 캐시가 5분 이내면 재사용
        if (self._fish_types_cache is not None and 
            self._cache_time is not None and 
            (now - self._cache_time).seconds < 300):
            return self._fish_types_cache
            
        try:
            import os
            backend_host = os.getenv('BACKEND_HOST', 'localhost')
            backend_port = os.getenv('BACKEND_PORT', '8000')
            backend_url = f"http://{backend_host}:{backend_port}/api/v1/fish-registry/fish-types/"
            
            # 인증 헤더 준비
            headers = {}
            if self._auth_token:
                headers['Authorization'] = self._auth_token
                
            response = requests.get(backend_url, headers=headers, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                # 응답이 리스트면 직접 사용, 딕셔너리면 results 키 확인
                if isinstance(data, list):
                    fish_types = data
                elif isinstance(data, dict):
                    fish_types = data.get('results', data.get('data', []))
                else:
                    fish_types = []
                
                # 캐시 업데이트
                self._fish_types_cache = fish_types
                if not self._cache_time:  # 처음 설정하는 경우
                    self._cache_time = now
                
                return fish_types
        except Exception as e:
            logger.warning(f"어종명 조회 실패: {e}")
        
        return self._fish_types_cache or []
    
    def _find_matching_business(self, parsed_name: str, businesses: list) -> Optional[Dict]:
        """파싱된 업체명과 실제 데이터베이스 업체 매칭"""
        from difflib import SequenceMatcher
        
        parsed_name = parsed_name.strip().lower()
        best_match = None
        best_similarity = 0.0
        
        for business in businesses:
            business_name = business.get("business_name", "").lower()
            
            # 정확 일치
            if parsed_name == business_name:
                return business
            
            # 부분 일치
            if parsed_name in business_name or business_name in parsed_name:
                return business
            
            # 유사도 매칭 (80% 이상)
            similarity = SequenceMatcher(None, parsed_name, business_name).ratio()
            if similarity > best_similarity and similarity > 0.8:
                best_similarity = similarity
                best_match = business
        
        return best_match
    
    def _find_matching_fish(self, parsed_name: str, fish_types: list) -> Optional[Dict]:
        """파싱된 어종명과 실제 데이터베이스 어종 매칭 (오타 처리 강화)"""
        from difflib import SequenceMatcher
        
        parsed_name = parsed_name.strip().lower()
        
        # 일반적인 오타 보정
        typo_corrections = {
            '고릉어': '고등어',
            '고드어': '고등어', 
            '고동어': '고등어',
            '갈지': '갈치',
            '갈취': '갈치',
            '광어': '광어',
            '관어': '광어',
            '명대': '명태',
            '명퇘': '명태',
            '오찡어': '오징어',
            '오지어': '오징어'
        }
        
        # 오타 보정 적용
        corrected_name = typo_corrections.get(parsed_name, parsed_name)
        
        best_match = None
        best_similarity = 0.0
        
        for fish in fish_types:
            fish_name = fish.get("name", "").lower()
            
            # 보정된 이름으로 정확 일치
            if corrected_name == fish_name:
                return fish
            
            # 원본으로 정확 일치
            if parsed_name == fish_name:
                return fish
            
            # 부분 일치 (보정된 이름)
            if corrected_name in fish_name or fish_name in corrected_name:
                return fish
            
            # 부분 일치 (원본)
            if parsed_name in fish_name or fish_name in parsed_name:
                return fish
            
            # 유사도 매칭 (75%로 낮춤 - 오타 허용도 증가)
            similarity_corrected = SequenceMatcher(None, corrected_name, fish_name).ratio()
            similarity_original = SequenceMatcher(None, parsed_name, fish_name).ratio()
            similarity = max(similarity_corrected, similarity_original)
            
            if similarity > best_similarity and similarity > 0.75:
                best_similarity = similarity
                best_match = fish
        
        return best_match
    
    def _get_fish_suggestions(self, parsed_name: str, fish_types: list, limit: int = 3) -> list:
        """매칭되지 않은 어종에 대한 유사한 어종 제안"""
        from difflib import SequenceMatcher
        
        parsed_name = parsed_name.strip().lower()
        suggestions = []
        
        for fish in fish_types:
            fish_name = fish.get("name", "")
            similarity = SequenceMatcher(None, parsed_name, fish_name.lower()).ratio()
            
            if similarity > 0.3:  # 30% 이상 유사도
                suggestions.append({
                    "fish_type_id": fish.get("id"),
                    "name": fish_name,
                    "similarity": round(similarity * 100, 1)
                })
        
        # 유사도 순으로 정렬하여 상위 3개 반환
        suggestions.sort(key=lambda x: x["similarity"], reverse=True)
        return suggestions[:limit]
