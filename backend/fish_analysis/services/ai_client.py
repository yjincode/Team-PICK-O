"""
AI 서버 클라이언트
Django 백엔드에서 FastAPI AI 서버를 호출하는 클라이언트
"""
import os
import httpx
import logging
from django.conf import settings
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class AIServerClient:
    """AI 서버 호출 클라이언트"""
    
    def __init__(self):
        self.ai_server_url = getattr(settings, 'AI_SERVER_URL', 'http://localhost:8001')
        self.timeout = 120  # 120초 타임아웃 (AI 분석은 시간이 오래 걸릴 수 있음)
        
    async def analyze_image(self, image_path: str) -> Dict[str, Any]:
        """
        AI 서버 메인 분석 파이프라인 호출 (ViT 검증 → 배경 제거 → YOLO + VGG)
        
        Args:
            image_path: 분석할 이미지 파일 경로
            
        Returns:
            분석 결과 딕셔너리
        """
        try:
            if not os.path.exists(image_path):
                return {
                    'success': False,
                    'error': f'이미지 파일을 찾을 수 없습니다: {image_path}',
                    'error_type': 'file_not_found'
                }
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                with open(image_path, 'rb') as image_file:
                    files = {"image": image_file}
                    
                    logger.info(f"🔍 AI 서버 메인 분석 파이프라인 호출: {self.ai_server_url}/api/v1/analysis/predict")
                    logger.info("📋 파이프라인 단계: ViT 어류 검증 → 배경 제거 → YOLO 증상 탐지 → VGG 질병 분류")
                    
                    # 메인 분석 파이프라인 사용 (ViT 검증 포함)
                    response = await client.post(
                        f"{self.ai_server_url}/api/v1/analysis/predict",
                        files=files
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        logger.info(f"✅ AI 서버 메인 파이프라인 분석 완료: {result.get('message', 'success')}")
                        return result
                    else:
                        error_detail = response.json().get('detail', 'Unknown error')
                        logger.error(f"❌ AI 서버 메인 파이프라인 오류 (HTTP {response.status_code}): {error_detail}")
                        return {
                            'success': False,
                            'error': f'AI 서버 오류: {error_detail}',
                            'error_type': 'ai_server_error',
                            'status_code': response.status_code
                        }
                        
        except httpx.TimeoutException:
            logger.error("AI 서버 응답 타임아웃")
            return {
                'success': False,
                'error': 'AI 서버 응답 타임아웃 (120초)',
                'error_type': 'timeout'
            }
            
        except httpx.ConnectError:
            logger.error(f"AI 서버 연결 실패: {self.ai_server_url}")
            return {
                'success': False,
                'error': f'AI 서버에 연결할 수 없습니다: {self.ai_server_url}',
                'error_type': 'connection_error'
            }
            
        except Exception as e:
            logger.error(f"AI 서버 호출 중 예상치 못한 오류: {str(e)}")
            return {
                'success': False,
                'error': f'AI 서버 호출 중 오류: {str(e)}',
                'error_type': 'unexpected_error'
            }
    
    async def check_ai_server_status(self) -> Dict[str, Any]:
        """AI 서버 상태 확인"""
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(f"{self.ai_server_url}/api/v1/analysis/status")
                
                if response.status_code == 200:
                    return response.json()
                else:
                    return {
                        'status': 'error',
                        'error': f'HTTP {response.status_code}'
                    }
                    
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e)
            }
    
# classify_diseases 메서드는 제거됨 - classify_full_image로 대체



    async def classify_full_image(self, image_path: str) -> Dict[str, Any]:
        """
        EfficientNet 전체 이미지 분류 (별도 엔드포인트)
        
        Args:
            image_path: 분석할 이미지 파일 경로
            
        Returns:
            EfficientNet 분류 결과 딕셔너리
        """
        try:
            if not os.path.exists(image_path):
                return {
                    'success': False,
                    'error': f'이미지 파일을 찾을 수 없습니다: {image_path}',
                    'error_type': 'file_not_found'
                }
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                with open(image_path, 'rb') as image_file:
                    files = {"image": image_file}
                    
                    logger.info(f"🔍 AI 서버 VGG 전체 이미지 분류 호출: {self.ai_server_url}/api/v1/analysis/vgg-classify-full")
                    
                    response = await client.post(
                        f"{self.ai_server_url}/api/v1/analysis/vgg-classify-full",
                        files=files
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        logger.info("✅ VGG 전체 이미지 분류 성공")
                        return result
                    else:
                        error_text = response.text
                        logger.error(f"❌ VGG 분류 실패 (HTTP {response.status_code}): {error_text}")
                        return {
                            'success': False,
                            'error': f'VGG 분류 실패: HTTP {response.status_code}',
                            'error_type': 'api_error',
                            'details': error_text
                        }
                        
        except httpx.TimeoutException:
            logger.error("⏰ VGG 분류 요청 타임아웃")
            return {
                'success': False,
                'error': 'VGG 분류 요청이 시간 초과되었습니다.',
                'error_type': 'timeout'
            }
        except Exception as e:
            logger.error(f"💥 VGG 분류 중 예상치 못한 오류: {str(e)}")
            return {
                'success': False,
                'error': f'VGG 분류 중 오류 발생: {str(e)}',
                'error_type': 'unexpected_error'
            }
    
    def classify_full_image_sync(self, image_path: str) -> Dict[str, Any]:
        """VGG 전체 이미지 분류 (동기 버전)"""
        import asyncio
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        return loop.run_until_complete(self.classify_full_image(image_path))

    def analyze_image_sync(self, image_path: str) -> Dict[str, Any]:
        """
        동기 방식으로 AI 서버 호출 (Django view에서 사용)
        """
        import asyncio
        
        try:
            # 이벤트 루프가 이미 실행 중인지 확인
            try:
                loop = asyncio.get_running_loop()
                # 이미 실행 중인 루프가 있으면 새 스레드에서 실행
                import threading
                import concurrent.futures
                
                def run_in_thread():
                    new_loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(new_loop)
                    try:
                        return new_loop.run_until_complete(self.analyze_image(image_path))
                    finally:
                        new_loop.close()
                
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(run_in_thread)
                    return future.result()
                    
            except RuntimeError:
                # 실행 중인 루프가 없으면 직접 실행
                return asyncio.run(self.analyze_image(image_path))
                
        except Exception as e:
            logger.error(f"동기 AI 서버 호출 중 오류: {str(e)}")
            return {
                'success': False,
                'error': f'AI 서버 호출 실패: {str(e)}',
                'error_type': 'sync_call_error'
            }


# 전역 클라이언트 인스턴스
ai_client = AIServerClient()