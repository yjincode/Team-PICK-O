from django.db import models


class Business(models.Model):
    business_name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20)
    address = models.TextField(blank=True)

    def __str__(self):
        return self.business_name


class FishType(models.Model):
    fish_name = models.CharField(max_length=50)
    aliases = models.JSONField(blank=True, null=True)  # 예: ["광어", "넙치"]
    unit = models.CharField(max_length=20, default='kg')  # 예: kg, 마리

    def __str__(self):
        return self.fish_name


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', '등록됨'),
        ('paid', '결제 완료'),
        ('ready', '출고 준비'),
        ('delivered', '납품 완료'),
        ('cancelled', '취소됨'),
    ]

    SOURCE_CHOICES = [
        ('text', '문자'),
        ('voice', '음성'),
        ('image', '이미지'),
        ('manual', '수동'),
    ]

    business = models.ForeignKey(Business, on_delete=models.CASCADE)
    total_price = models.IntegerField(default=0)
    order_datetime = models.DateTimeField()
    delivery_date = models.DateField()
    source_type = models.CharField(max_length=10, choices=SOURCE_CHOICES)
    raw_input_path = models.TextField(blank=True, null=True)  # mp3 경로, 문자 원문 등
    transcribed_text = models.TextField(blank=True)           # 파싱된 텍스트
    memo = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    def __str__(self):
        return f"Order #{self.id} - {self.business.business_name}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    fish_type = models.ForeignKey(FishType, on_delete=models.CASCADE)
    quantity = models.FloatField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20)  # ex. kg, 마리 등

    def __str__(self):
        return f"{self.fish_type.fish_name} - {self.quantity} {self.unit}"
