import io
import pytesseract
from PIL import Image
from django.conf import settings

def extract_text_from_image(image_file):
    """
    Extract Korean text from an image file using Tesseract OCR.
    
    Args:
        image_file: InMemoryUploadedFile or similar file-like object
        
    Returns:
        str: Extracted text from the image
    """
    # Read the image file
    image_bytes = image_file.read()
    image = Image.open(io.BytesIO(image_bytes))
    
    # Configure Tesseract for Korean
    tessdata_dir_config = f'--tessdata-dir "{getattr(settings, "TESSERACT_TESSDATA_DIR", "/usr/share/tesseract-ocr/4.00/tessdata")}"'
    
    # Extract text
    text = pytesseract.image_to_string(
        image, 
        lang='kor+eng',  # Korean + English
        config=tessdata_dir_config
    )
    
    return text.strip()
