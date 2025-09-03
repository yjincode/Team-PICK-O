from datetime import datetime, timedelta
import re
from typing import Dict, List, Optional, Tuple

from django.db import transaction
from order.models import Order, OrderItem
from business.models import Business
from fish_registry.models import FishType
from accounts.models import UserProfile

class OrderCreationService:
    """
    Service for creating orders from transcribed text.
    Handles parsing of order details from text and creating corresponding database records.
    """
    
    def __init__(self, user):
        """Initialize with the user making the request."""
        self.user = user
        self.user_profile = UserProfile.objects.get(user=user)
    
    def parse_order_from_text(self, text: str) -> Dict:
        """
        Parse order details from transcribed text.
        
        Expected format examples:
        - "광어 10kg 주문해줘"
        - "넙치 5마리 내일 배송으로 부탁해"
        - "우리 매장에 오늘 오후까지 광어 3kg, 우럭 2마리 배달 부탁드립니다"
        """
        # Default values
        order_data = {
            'items': [],
            'delivery_date': datetime.now().date() + timedelta(days=1),  # Default to tomorrow
            'memo': f"자동 주문 생성 - {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            'source_type': 'voice',
            'business_name': None,
            'business_id': None,
        }
        
        # Extract fish items with quantities
        # This is a simple regex - you might need to enhance it based on actual input patterns
        fish_pattern = r'(\S+?)\s*(\d+(?:\.\d+)?)\s*(kg|마리|KG|kilo|키로|k)'
        matches = re.findall(fish_pattern, text, re.IGNORECASE)
        
        for match in matches:
            fish_name, quantity, unit = match
            # Normalize unit
            unit = 'kg' if unit.lower() in ['kg', 'kilo', '키로', 'k'] else '마리'
            
            order_data['items'].append({
                'fish_name': fish_name,
                'quantity': float(quantity),
                'unit': unit,
                'unit_price': 0  # This would need to be set based on your pricing logic
            })
        
        # Extract delivery date if mentioned
        date_phrases = {
            '오늘': 0,
            '내일': 1,
            '모레': 2,
            '글피': 3
        }
        
        for phrase, days in date_phrases.items():
            if phrase in text:
                order_data['delivery_date'] = datetime.now().date() + timedelta(days=days)
                break
        
        # AI Server 파싱 로직 제거됨
        
        # 업체명이 없는 경우 기존 로직으로 추출
        if not order_data.get('business_name'):
            matched_business = self._extract_business_from_text(text)
            if matched_business:
                order_data['business_name'] = matched_business.business_name
                order_data['business_id'] = matched_business.id
        
        return order_data
    
    def create_order(self, text: str, business_id: int = None) -> Tuple[Order, List[OrderItem]]:
        """
        Create an order from transcribed text.
        
        Args:
            text: The transcribed text to parse
            business_id: Optional business ID to associate with the order
            
        Returns:
            Tuple of (order, order_items) created
        """
        # Parse order data from text
        order_data = self.parse_order_from_text(text)
        
        # Get or create business
        if business_id:
            business = Business.objects.get(id=business_id)
        else:
            # Default to first business or handle as needed
            business = Business.objects.first()
            if not business:
                raise ValueError("No business found. Please create a business first.")
        
        with transaction.atomic():
            # Create order
            order = Order.objects.create(
                business=business,
                total_price=0,  # Will be updated after creating items
                delivery_datetime=order_data['delivery_date'],
                source_type=order_data['source_type'],
                raw_input_path=f"transcription/{self.user.id}/{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                transcribed_text=text,
                memo=order_data['memo'],
                order_status='placed'
            )
            
            # Create order items
            order_items = []
            total_price = 0
            
            for item_data in order_data['items']:
                # Find or create fish type
                fish_name = item_data['fish_name']
                fish_type, created = FishType.objects.get_or_create(
                    name=fish_name,
                    defaults={'unit': item_data['unit']}
                )
                
                # Create order item
                order_item = OrderItem.objects.create(
                    order=order,
                    fish_type=fish_type,
                    quantity=item_data['quantity'],
                    unit_price=item_data['unit_price'],
                    unit=item_data['unit']
                )
                
                order_items.append(order_item)
                total_price += order_item.quantity * order_item.unit_price
            
            # Update order total
            order.total_price = total_price
            order.save()
            
            return order, order_items
    
    def _extract_business_from_text(self, text: str) -> Optional[Business]:
        """
        Extract business name from text and find matching business in database.
        
        Expected patterns:
        - "바다수산에 주문합니다"
        - "동해마트로 배송해주세요"
        - "해양식품한테 연락드립니다"
        """
        import re
        from difflib import SequenceMatcher
        
        # Business name extraction patterns
        business_patterns = [
            r'([가-힣]+(?:수산|마트|식품|어장|회사|상회|업체|점))[에게로한테으로]',
            r'([가-힣]+(?:수산|마트|식품|어장|회사|상회|업체|점))',
            r'([가-힣]{2,8})[에게로한테으로]\s*(?:주문|배송|연락|문의)',
            r'([가-힣]{2,8})\s*(?:업체|거래처|매장|상호)',
        ]
        
        extracted_names = set()
        
        for pattern in business_patterns:
            matches = re.finditer(pattern, text)
            for match in matches:
                business_name = match.group(1).strip()
                if 2 <= len(business_name) <= 10:  # Reasonable business name length
                    extracted_names.add(business_name)
        
        if not extracted_names:
            return None
        
        # Get all businesses from database
        try:
            all_businesses = Business.objects.all()
            
            best_match = None
            best_similarity = 0.0
            
            for extracted_name in extracted_names:
                for business in all_businesses:
                    # Exact match
                    if extracted_name == business.business_name:
                        return business
                    
                    # Partial match (contains)
                    if extracted_name in business.business_name or business.business_name in extracted_name:
                        return business
                    
                    # Similarity match
                    similarity = SequenceMatcher(None, extracted_name, business.business_name).ratio()
                    if similarity > best_similarity and similarity > 0.6:  # 60% similarity threshold
                        best_similarity = similarity
                        best_match = business
            
            return best_match
            
        except Exception as e:
            print(f"Error in business extraction: {e}")
            return None
    
