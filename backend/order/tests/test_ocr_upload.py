import os
from django.test import TestCase, Client
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.conf import settings
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token
from django.contrib.auth import get_user_model

User = get_user_model()

class OCRUploadTestCase(APITestCase):
    def setUp(self):
        # Create a test user and get token
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            business_name='Test Business',
            owner_name='Test Owner',
            phone_number='010-1234-5678',
            address='Test Address',
            business_registration_number='123-45-67890',
            status='approved'
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        
        # Create a test image file
        self.test_image_path = os.path.join(settings.BASE_DIR, 'order', 'tests', 'test_korean_text.png')
        
        # Create a test business
        from order.models import Business
        self.business = Business.objects.create(
            business_name='Test Business',
            phone_number='010-1234-5678',
            address='Test Address',
        )
    
    def test_ocr_upload_success(self):
        """Test successful OCR image upload and order creation"""
        # Create a test image file in memory
        with open(self.test_image_path, 'rb') as img:
            image_data = img.read()
        
        image = SimpleUploadedFile(
            name='test_korean_text.png',
            content=image_data,
            content_type='image/png'
        )
        
        # Make the POST request
        url = reverse('order-upload-ocr')
        data = {'business_id': self.business.id}
        files = {'image': image}
        
        response = self.client.post(url, data=data, files=files, format='multipart')
        
        # Check the response
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('order_id', response.data)
        self.assertIn('extracted_text', response.data)
        self.assertIn('order', response.data)
        
        # Check that the order was created with the correct data
        order_id = response.data['order_id']
        from order.models import Order
        order = Order.objects.get(id=order_id)
        self.assertEqual(order.business.id, self.business.id)
        self.assertEqual(order.source_type, 'image')
        self.assertGreater(len(order.transcribed_text), 0)
    
    def test_ocr_upload_no_image(self):
        """Test OCR upload with no image file"""
        url = reverse('order-upload-ocr')
        data = {'business_id': self.business.id}
        
        response = self.client.post(url, data=data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_ocr_upload_invalid_business(self):
        """Test OCR upload with invalid business ID"""
        with open(self.test_image_path, 'rb') as img:
            image_data = img.read()
        
        image = SimpleUploadedFile(
            name='test_korean_text.png',
            content=image_data,
            content_type='image/png'
        )
        
        # Use an invalid business ID
        url = reverse('order-upload-ocr')
        data = {'business_id': 99999}  # Non-existent business ID
        files = {'image': image}
        
        response = self.client.post(url, data=data, files=files, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
