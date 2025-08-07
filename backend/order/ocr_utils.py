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
    
    # Get the directory containing this script
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Path to the local kor.traineddata file
    kor_data_path = os.path.join(current_dir, 'kor.traineddata')
    
    # Configure Tesseract to use the local kor.traineddata file
    tessdata_dir = os.path.dirname(kor_data_path)
    tessdata_dir_config = f'--tessdata-dir "{tessdata_dir}"'
    
    # Set the TESSDATA_PREFIX environment variable to the directory containing kor.traineddata
    os.environ['TESSDATA_PREFIX'] = tessdata_dir
    
    # Extract text with Korean language
    text = pytesseract.image_to_string(
        image,
        lang='kor',  # Using local Korean language data
        config=tessdata_dir_config
    )
    
    return text.strip()
