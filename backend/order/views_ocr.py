import os
import uuid
from datetime import datetime
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
from django.core.files.storage import default_storage

from .models import Order
from .serializers import OrderSerializer
from .ocr_utils import extract_text_from_image
from transcription.services.order_service import OrderCreationService

class OCRImageUploadView(APIView):
    """
    API endpoint for uploading images containing order information in Korean.
    Extracts text using OCR and creates an order from the extracted text.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Check if an image file was uploaded
        if 'image' not in request.FILES:
            return Response(
                {'error': 'No image file provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        image_file = request.FILES['image']
        business_id = request.data.get('business_id')
        
        try:
            # Save the uploaded image temporarily
            file_ext = os.path.splitext(image_file.name)[1]
            filename = f"ocr_uploads/{uuid.uuid4()}{file_ext}"
            filepath = default_storage.save(filename, image_file)
            
            try:
                # Extract text using OCR
                extracted_text = extract_text_from_image(image_file)
                
                # Create order from extracted text
                order_service = OrderCreationService(request.user)
                
                # Parse and create the order
                with transaction.atomic():
                    order, order_items = order_service.create_order(
                        text=extracted_text,
                        business_id=business_id
                    )
                
                # Prepare response data
                response_data = {
                    'message': 'Order created successfully from image',
                    'order_id': order.id,
                    'extracted_text': extracted_text,
                    'order': {
                        'id': order.id,
                        'business_id': order.business.id,
                        'business_name': order.business.business_name,
                        'total_price': order.total_price,
                        'status': order.status,
                        'source_type': 'image',
                        'transcribed_text': extracted_text,
                        'created_at': order.order_datetime.isoformat(),
                        'delivery_date': order.delivery_date.isoformat() if order.delivery_date else None,
                        'items': [
                            {
                                'fish_type': item.fish_type.fish_name,
                                'quantity': item.quantity,
                                'unit': item.unit,
                                'unit_price': str(item.unit_price)
                            }
                            for item in order.items.all()
                        ]
                    }
                }
                
                return Response(response_data, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                # Clean up the saved file if there was an error
                if 'filepath' in locals():
                    default_storage.delete(filepath)
                raise
                
        except Exception as e:
            return Response(
                {'error': f'Error processing image: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
