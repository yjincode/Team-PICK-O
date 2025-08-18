import json
import os
from datetime import datetime, timedelta
from django.conf import settings

# TODO: AI 담당자가 구현할 부분
# 1. OpenAI Whisper API 연동
# 2. OCR API 연동 (이미지 텍스트 추출)
# 3. 텍스트 파싱 로직 개선



def parse_audio_to_order_data(file_path):
    """
    TODO: AI 담당자가 Whisper API로 교체 예정
    현재는 테스트용 mock 데이터 리턴
    """
    # TODO: 실제 Whisper API 호출로 교체
    # import openai
    # openai.api_key = os.getenv('OPENAI_API_KEY')
    # with open(file_path, "rb") as audio_file:
    #     transcript = openai.Audio.transcribe("whisper-1", audio_file, language="ko")
    # transcribed_text = transcript.text
    
    return {
        "order": {
            "order_datetime": "2025-08-04T13:22:11",
            "delivery_date": "2025-08-07",
            "transcribed_text": "도미 10kg, 방어 5마리 주문 부탁드립니다.",
            "total_price": 350000,
            "memo": "오전 중 납품 원함",
            "status": "pending"
        },
        "order_items": [
            {
                "fish_type_id": 1,
                "quantity": 10,
                "unit_price": 20000,
                "unit": "kg"
            },
            {
                "fish_type_id": 2,
                "quantity": 5,
                "unit_price": 30000,
                "unit": "마리"
            }
        ]
    }

def parse_text_to_order_data(text):
    """
    변환된 텍스트를 주문 데이터로 파싱
    """
    # 간단한 키워드 기반 파싱 (실제로는 더 정교한 NLP가 필요)
    text_lower = text.lower()
    
    # 어종 키워드 매핑
    fish_keywords = {
        '도미': {'id': 201, 'price': 20000},
        '방어': {'id': 202, 'price': 15000},
        '고등어': {'id': 1, 'price': 48000},
        '갈치': {'id': 2, 'price': 65000},
        '오징어': {'id': 3, 'price': 48000},
        '명태': {'id': 4, 'price': 45000},
    }
    
    order_items = []
    total_price = 0
    
    # 텍스트에서 어종과 수량 추출
    for fish_name, fish_info in fish_keywords.items():
        if fish_name in text_lower:
            # 수량 추출 (간단한 정규식)
            import re
            quantity_match = re.search(rf'{fish_name}\s*(\d+)', text)
            if quantity_match:
                quantity = int(quantity_match.group(1))
                unit_price = fish_info['price']
                total_price += quantity * unit_price
                
                order_items.append({
                    "fish_type_id": fish_info['id'],
                    "quantity": quantity,
                    "unit_price": unit_price,
                    "unit": "마리" if fish_name in ['도미', '방어'] else "kg"
                })
    
    # 배송일 추출
    delivery_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    
    return {
        "order": {
            "order_datetime": datetime.now().isoformat(),
            "delivery_date": delivery_date,
            "transcribed_text": text,
            "total_price": total_price,
            "memo": "음성 인식으로 생성된 주문",
            "status": "pending"
        },
        "order_items": order_items
    }

def parse_image_to_order_data(file_path):
    """
    TODO: AI 담당자가 OCR API로 교체 예정
    현재는 테스트용 mock 데이터 리턴
    """
    # TODO: 실제 OCR API 호출로 교체
    # import pytesseract
    # from PIL import Image
    # image = Image.open(file_path)
    # text = pytesseract.image_to_string(image, lang='kor+eng')
    
    return {
        "order": {
            "order_datetime": "2025-08-04T13:22:11",
            "delivery_date": "2025-08-08",
            "transcribed_text": "고등어 10마리, 갈치 2마리 주문합니다.",
            "total_price": 120000,
            "memo": "이미지에서 추출된 주문",
            "status": "pending"
        },
        "order_items": [
            {
                "fish_type_id": 3,  # 고등어
                "quantity": 10,
                "unit_price": 8000,
                "unit": "마리"
            },
            {
                "fish_type_id": 4,  # 갈치
                "quantity": 2,
                "unit_price": 20000,
                "unit": "마리"
            }
        ]
    }

# TODO: AI 담당자가 추가할 함수들
# def parse_text_to_order_data(text):
#     """변환된 텍스트를 주문 데이터로 파싱하는 로직"""
#     pass
# 
# def extract_fish_info_from_text(text):
#     """텍스트에서 어종, 수량, 가격 정보 추출"""
#     pass 