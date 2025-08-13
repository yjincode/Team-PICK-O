import io
import os
import pytesseract
from PIL import Image
from django.conf import settings

def extract_text_from_image(image_file):
    """
    Tesseract OCR을 사용하여 이미지 파일에서 한국어 텍스트를 추출합니다.
    
    Args:
        image_file: InMemoryUploadedFile 또는 유사한 파일 객체
        
    Returns:
        str: 이미지에서 추출된 텍스트
    """
    # 이미지 파일 읽기
    image_bytes = image_file.read()
    image = Image.open(io.BytesIO(image_bytes))
    
    # 이 스크립트가 포함된 디렉토리 가져오기
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 로컬 kor.traineddata 파일 경로
    kor_data_path = os.path.join(current_dir, 'kor.traineddata')
    
    # Tesseract가 로컬 kor.traineddata 파일을 사용하도록 설정
    tessdata_dir = os.path.dirname(kor_data_path)
    tessdata_dir_config = f'--tessdata-dir "{tessdata_dir}"'
    
    # kor.traineddata가 포함된 디렉토리를 TESSDATA_PREFIX 환경 변수로 설정
    os.environ['TESSDATA_PREFIX'] = tessdata_dir
    
    # 한국어 언어로 텍스트 추출
    text = pytesseract.image_to_string(
        image,
        lang='kor',  # 로컬 한국어 언어 데이터 사용
        config=tessdata_dir_config
    )
    
    return text.strip()
