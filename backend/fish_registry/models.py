from django.db import models
from django.conf import settings

class FishType(models.Model):
    """어종 모델"""
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, verbose_name="사용자")
    name = models.CharField(max_length=100, verbose_name="어종명")
    aliases = models.TextField(blank=True, null=True, verbose_name="별칭")
    scientific_name = models.TextField(blank=True, null=True, verbose_name="학명")
    unit = models.CharField(max_length=10, verbose_name="단위")
    notes = models.TextField(blank=True, null=True, verbose_name="설명")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성 시각")

    class Meta:
        db_table = 'fish_types'
        verbose_name = '어종'
        verbose_name_plural = '어종 목록'

    def __str__(self):
        return self.name
