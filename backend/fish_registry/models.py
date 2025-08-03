from django.db import models

class FishType(models.Model):
    UNIT_CHOICES = [
        ('kg', '킬로그램'),
        ('ea', '마리'),
        ('box', '박스'),
    ]

    name = models.CharField(max_length=100, unique=True)
    aliases = models.TextField(blank=True, null=True)
    scientific_name = models.TextField(blank=True, null=True)
    unit = models.CharField(max_length=10, choices=UNIT_CHOICES)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'fish_registry_fish_types'
        verbose_name = '어종'
        verbose_name_plural = '어종 목록'

    def __str__(self):
        return self.name
