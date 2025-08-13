from django.db import models
from django.contrib.auth import get_user_model
import uuid
from django.core.validators import MinValueValidator, MaxValueValidator

User = get_user_model()

class AudioTranscription(models.Model):
    """
    Model for storing audio transcriptions and their processing status.
    Can be linked to an order if the transcription is used to create one.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('completed_with_errors', 'Completed With Errors'),
        ('failed', 'Failed')
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='transcriptions',
        help_text="User who uploaded the audio"
    )
    audio_file = models.FileField(
        upload_to='audio_files/%Y/%m/%d/',
        help_text="Uploaded audio file"
    )
    transcription = models.TextField(
        blank=True,
        help_text="Transcribed text from the audio"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(
        max_length=25, 
        choices=STATUS_CHOICES, 
        default='pending',
        help_text="Current status of the transcription process"
    )
    language = models.CharField(
        max_length=10, 
        default='ko',
        help_text="Language code for transcription (e.g., 'ko' for Korean, 'en' for English)"
    )
    confidence = models.FloatField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        help_text="Confidence score of the transcription (0.0 to 1.0)"
    )
    create_order = models.BooleanField(
        default=False,
        help_text="Whether to create an order from this transcription"
    )
    business = models.ForeignKey(
        'business.Business',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transcriptions',
        help_text="Business this transcription is associated with"
    )
    order = models.OneToOneField(
        'order.Order',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transcription',
        help_text="Order created from this transcription (if any)"
    )
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['user']),
        ]
    
    def __str__(self):
        return f"Transcription {self.id} - {self.status}"
    
    def save(self, *args, **kwargs):
        # Auto-set create_order based on business if not set
        if self.business and self.create_order is None:
            self.create_order = True
        super().save(*args, **kwargs)
