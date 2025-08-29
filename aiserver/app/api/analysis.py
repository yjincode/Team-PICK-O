"""
어류 질병 분석 API 엔드포인트
"""
import os
import shutil
import tempfile
from typing import Dict, Any
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from loguru import logger

from app.models.schemas import AnalysisResponse, YoloResponse, HealthCheckResponse
from app.services.analysis_service import FishAnalysisService
from app.services.yolo_service import YOLO11Service
from app.services.vgg_service import VGG16Service

router = APIRouter()

# 분석 서비스 인스턴스
analysis_service = FishAnalysisService()
yolo_service = YOLO11Service()
vgg_service = VGG16Service()

# 허용된 파일 확장자
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp'}
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", "10485760"))  # 10MB


def validate_image_file(file: UploadFile) -> bool:
    """이미지 파일 검증"""
    # 파일 확장자 검사
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in ALLOWED_EXTENSIONS:
        return False
    
    # 파일 크기 검사 (실제로는 내용을 읽어야 정확함)
    return True


@router.post("/predict", response_model=AnalysisResponse)
async def analyze_fish_image(
    image: UploadFile = File(..., description="분석할 어류 이미지 파일")
):
    """
    어류 이미지 질병 분석
    
    YOLO11으로 증상을 탐지하고 VGG16으로 질병을 분류합니다.
    """
    temp_file_path = None
    
    try:
        # 파일 검증
        if not validate_image_file(image):
            raise HTTPException(
                status_code=400,
                detail=f"지원되지 않는 파일 형식입니다. 허용 형식: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # 임시 파일로 저장
        temp_file = tempfile.NamedTemporaryFile(
            delete=False,
            suffix=os.path.splitext(image.filename)[1].lower()
        )
        temp_file_path = temp_file.name
        
        try:
            # 파일 내용을 임시 파일에 저장
            shutil.copyfileobj(image.file, temp_file)
            temp_file.close()
            
            # 파일 크기 검사
            file_size = os.path.getsize(temp_file_path)
            if file_size > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail=f"파일 크기가 너무 큽니다. 최대 {MAX_FILE_SIZE // (1024*1024)}MB까지 허용됩니다."
                )
            
            logger.info(f"이미지 분석 요청: {image.filename} ({file_size} bytes)")
            
            # 분석 수행
            result = analysis_service.analyze_image(temp_file_path)
            
            # 결과 반환
            if result['success']:
                return AnalysisResponse(
                    success=True,
                    message=result['message'],
                    overall_health_status=result.get('overall_health_status'),
                    health_evaluation=result.get('health_evaluation'),
                    health_grade_info=result.get('health_grade_info'),
                    total_detections=result.get('total_detections', 0),
                    yolo_confidence_avg=result.get('yolo_confidence_avg', 0.0),
                    detections=result.get('detections', []),
                    image_info=result.get('image_info'),
                    model_info=result.get('model_info'),
                    vgg_available=result.get('vgg_available', True)
                )
            else:
                # 오류가 있지만 구조화된 응답
                return AnalysisResponse(
                    success=False,
                    message=result['message'],
                    error=result.get('error'),
                    error_type=result.get('error_type'),
                    solution=result.get('solution'),
                    detections=[]
                )
                
        except Exception as processing_error:
            logger.error(f"이미지 처리 중 오류: {str(processing_error)}")
            raise HTTPException(
                status_code=500,
                detail=f"이미지 처리 중 오류가 발생했습니다: {str(processing_error)}"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"분석 요청 처리 중 예상치 못한 오류: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"서버 오류가 발생했습니다: {str(e)}"
        )
    
    finally:
        # 임시 파일 정리
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
                logger.debug(f"임시 파일 삭제 완료: {temp_file_path}")
            except Exception as cleanup_error:
                logger.warning(f"임시 파일 삭제 실패: {cleanup_error}")


@router.get("/status", response_model=HealthCheckResponse)
async def get_analysis_service_status():
    """
    분석 서비스 상태 확인
    
    YOLO11, VGG16 모델의 로드 상태와 서비스 준비 상태를 확인합니다.
    """
    try:
        status = analysis_service.check_service_status()
        
        return HealthCheckResponse(
            status=status["status"],
            models={
                "yolo11": status["services"]["yolo11"],
                "vgg16": status["services"]["vgg16"]
            },
            server={
                "ready": str(status["ready_for_analysis"]),
                "port": os.getenv("AI_SERVER_PORT", "8001"),
                "host": os.getenv("AI_SERVER_HOST", "0.0.0.0")
            }
        )
        
    except Exception as e:
        logger.error(f"상태 확인 중 오류: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail=f"서비스 상태를 확인할 수 없습니다: {str(e)}"
        )


@router.get("/models/info")
async def get_models_info():
    """
    모델 정보 조회
    
    현재 로드된 YOLO11과 VGG16 모델의 상세 정보를 반환합니다.
    """
    try:
        yolo_status = analysis_service.yolo_service.check_model_status()
        vgg_status = analysis_service.vgg_service.check_model_status()
        
        return {
            "yolo11": {
                "model_path": yolo_status["model_path"],
                "model_exists": yolo_status["model_exists"],
                "loaded": yolo_status["loaded"],
                "version": yolo_status.get("version", "unknown"),
                "compatible": yolo_status.get("compatible", False),
                "compatibility_message": yolo_status.get("compatibility_message", "")
            },
            "vgg16": {
                "model_path": vgg_status["model_path"],
                "model_exists": vgg_status["model_exists"],
                "loaded": vgg_status["loaded"],
                "tensorflow_available": vgg_status.get("tensorflow_available", False),
                "classes_loaded": vgg_status.get("classes_loaded", False)
            }
        }
        
    except Exception as e:
        logger.error(f"모델 정보 조회 중 오류: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"모델 정보를 조회할 수 없습니다: {str(e)}"
        )


@router.post("/models/reload")
async def reload_models():
    """
    모델 재로드
    
    YOLO11과 VGG16 모델을 다시 로드합니다.
    """
    try:
        # 기존 모델 초기화
        analysis_service.yolo_service.model = None
        analysis_service.vgg_service.model = None
        
        # 모델 재로드 시도
        yolo_loaded = analysis_service.yolo_service.load_model()
        vgg_loaded = analysis_service.vgg_service.load_model()
        
        return {
            "message": "모델 재로드 완료",
            "results": {
                "yolo11": {
                    "loaded": yolo_loaded,
                    "status": "success" if yolo_loaded else "failed"
                },
                "vgg16": {
                    "loaded": vgg_loaded,
                    "status": "success" if vgg_loaded else "failed"
                }
            },
            "overall_success": yolo_loaded and vgg_loaded
        }
        
    except Exception as e:
        logger.error(f"모델 재로드 중 오류: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"모델 재로드에 실패했습니다: {str(e)}"
        )


@router.post("/yolo-detect", response_model=YoloResponse)
async def yolo_detect_only(image: UploadFile = File(...)):
    """
    YOLO11만을 사용한 빠른 증상 탐지 (1단계)
    ⚠️ 주의: 어류 검증 없이 실행됩니다. 프로덕션에서는 /predict 사용 권장
    """
    try:
        # 파일 검증
        if image.filename:
            file_extension = os.path.splitext(image.filename)[1].lower()
            if file_extension not in ALLOWED_EXTENSIONS:
                raise HTTPException(
                    status_code=400, 
                    detail=f"지원되지 않는 파일 형식입니다. 허용 형식: {', '.join(ALLOWED_EXTENSIONS)}"
                )
        
        # 임시 파일 생성
        with tempfile.NamedTemporaryFile(suffix=f"_{image.filename}", delete=False) as temp_file:
            temp_file_path = temp_file.name
            contents = await image.read()
            file_size = len(contents)
            
            if file_size > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail=f"파일 크기가 너무 큽니다. 최대 {MAX_FILE_SIZE // (1024*1024)}MB까지 허용됩니다."
                )
            
            temp_file.write(contents)
            
        try:
            logger.info(f"YOLO 탐지 요청: {image.filename} ({file_size} bytes)")
            
            # YOLO 탐지만 수행
            yolo_result = yolo_service.detect_symptoms(temp_file_path)
            
            if yolo_result['success']:
                return YoloResponse(
                    success=True,
                    message=f"YOLO 탐지 완료: {len(yolo_result['detections'])}개 증상 발견",
                    total_detections=len(yolo_result['detections']),
                    detections=yolo_result['detections'],
                    model_info={"yolo_status": "completed", "vgg_status": "pending"}
                )
            else:
                return YoloResponse(
                    success=False,
                    message="YOLO 탐지 실패",
                    error=yolo_result.get('error'),
                    error_type=yolo_result.get('error_type')
                )
            
        finally:
            # 임시 파일 정리
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                logger.debug(f"임시 파일 삭제 완료: {temp_file_path}")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"YOLO 탐지 중 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"YOLO 탐지 오류: {str(e)}")


@router.post("/vgg-classify")
async def vgg_classify_diseases(image: UploadFile = File(...)):
    """
    VGG16을 사용한 질병 분류 (2단계)
    크롭된 이미지들을 받아서 질병을 분류합니다.
    """
    try:
        # 파일 검증
        if image.filename:
            file_extension = os.path.splitext(image.filename)[1].lower()
            if file_extension not in ALLOWED_EXTENSIONS:
                raise HTTPException(
                    status_code=400, 
                    detail=f"지원되지 않는 파일 형식입니다. 허용 형식: {', '.join(ALLOWED_EXTENSIONS)}"
                )
        
        # 임시 파일 생성
        with tempfile.NamedTemporaryFile(suffix=f"_{image.filename}", delete=False) as temp_file:
            temp_file_path = temp_file.name
            contents = await image.read()
            file_size = len(contents)
            
            if file_size > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail=f"파일 크기가 너무 큽니다. 최대 {MAX_FILE_SIZE // (1024*1024)}MB까지 허용됩니다."
                )
            
            temp_file.write(contents)
            
        try:
            logger.info(f"VGG 질병 분류 요청: {image.filename} ({file_size} bytes)")
            
            # YOLO로 먼저 탐지
            yolo_result = yolo_service.detect_symptoms(temp_file_path)
            
            if not yolo_result['success']:
                return {
                    "success": False,
                    "error": "YOLO 탐지 실패",
                    "message": yolo_result.get('error')
                }
            
            if not yolo_result['detections']:
                return {
                    "success": True,
                    "message": "탐지된 증상이 없습니다.",
                    "detections": [],
                    "disease_results": []
                }
            
            # 탐지된 영역 크롭
            cropped_images = yolo_service.crop_detected_regions(temp_file_path, yolo_result['detections'])
            
            if not cropped_images:
                return {
                    "success": False,
                    "error": "크롭된 이미지가 없습니다.",
                    "message": "탐지된 영역을 처리할 수 없습니다."
                }
            
            # VGG로 질병 분류
            disease_results = vgg_service.classify_disease(cropped_images)
            
            # 전체 건강 상태 계산
            overall_health = vgg_service.calculate_overall_health_status(disease_results)
            
            return {
                "success": True,
                "message": f"질병 분류 완료: {len(disease_results)}개 질병 발견",
                "overall_health_status": overall_health,
                "total_detections": len(yolo_result['detections']),
                "yolo_confidence_avg": sum(d.get('confidence', 0) for d in yolo_result['detections']) / len(yolo_result['detections']) if yolo_result['detections'] else 0,
                "detections": yolo_result['detections'],
                "disease_results": disease_results,
                "model_info": {
                    "yolo_status": "completed",
                    "vgg_status": "completed"
                }
            }
            
        finally:
            # 임시 파일 정리
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                logger.debug(f"임시 파일 삭제 완료: {temp_file_path}")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"VGG 질병 분류 중 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"질병 분류 오류: {str(e)}")


@router.post("/vgg-classify-full")
async def vgg_classify_full_image(image: UploadFile = File(...)):
    """
    VGG16을 사용한 전체 이미지 질병 분류
    전체 이미지를 받아서 질병을 분류합니다.
    """
    try:
        # 파일 검증
        if image.filename:
            file_extension = os.path.splitext(image.filename)[1].lower()
            if file_extension not in ALLOWED_EXTENSIONS:
                raise HTTPException(
                    status_code=400, 
                    detail=f"지원되지 않는 파일 형식입니다. 허용 형식: {', '.join(ALLOWED_EXTENSIONS)}"
                )
        
        # 임시 파일 생성
        with tempfile.NamedTemporaryFile(suffix=f"_full_{image.filename}", delete=False) as temp_file:
            temp_file_path = temp_file.name
            contents = await image.read()
            file_size = len(contents)
            
            if file_size > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail=f"파일 크기가 너무 큽니다. 최대 {MAX_FILE_SIZE // (1024*1024)}MB까지 허용됩니다."
                )
            
            temp_file.write(contents)
            
        try:
            logger.info(f"VGG 전체 이미지 분류 요청: {image.filename} ({file_size} bytes)")
            
            # PIL Image로 로드
            from PIL import Image as PILImage
            pil_image = PILImage.open(temp_file_path)
            
            # VGG 전체 이미지 분류
            disease_result = vgg_service.classify_single_image(pil_image)
            
            if disease_result:
                return {
                    "success": True,
                    "message": "전체 이미지 질병 분류 완료",
                    "disease_result": disease_result
                }
            else:
                return {
                    "success": False,
                    "error": "VGG 분류 실패",
                    "message": "질병 분류를 수행할 수 없습니다."
                }
            
        finally:
            # 임시 파일 정리
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                logger.debug(f"임시 파일 삭제 완료: {temp_file_path}")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"VGG 전체 이미지 분류 중 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"전체 이미지 분류 오류: {str(e)}")


# 크롭된 이미지 분류 엔드포인트는 제거됨 - 전체 이미지 분류(/vgg-classify-full)로 대체