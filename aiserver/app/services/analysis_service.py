"""
통합 어류 질병 분석 서비스 - FastAPI용
YOLO11 + VGG16을 결합한 완전한 분석 파이프라인
"""
import os
import uuid
from typing import Dict, Any, List
from loguru import logger

from .yolo_service import YOLO11Service
from .vgg_service import VGG16Service


class FishAnalysisService:
    """어류 질병 분석 통합 서비스"""
    
    def __init__(self):
        self.yolo_service = YOLO11Service()
        self.vgg_service = VGG16Service()
    
    def analyze_image(self, image_path: str) -> Dict[str, Any]:
        """
        어류 이미지 분석 수행
        
        Args:
            image_path: 분석할 이미지 파일 경로
            
        Returns:
            분석 결과 딕셔너리
        """
        try:
            analysis_id = str(uuid.uuid4())
            logger.info(f"어류 질병 분석 시작: {analysis_id}")
            
            # 1단계: 원본 이미지로 YOLO 질병 탐지
            logger.info("1단계: 원본 이미지로 YOLO 질병 탐지 시작")
            logger.info(f"📁 YOLO 입력 이미지 경로: {image_path}")
            yolo_result = self.yolo_service.detect_symptoms(image_path)
            
            # YOLO11 탐지 결과 확인 - 명확한 오류 처리
            if not yolo_result['success']:
                error_msg = yolo_result['error']
                
                # C3k2 호환성 문제인 경우 구체적인 해결방안 제시
                if 'C3k2' in error_msg or 'YOLO11' in error_msg or '호환성' in error_msg:
                    logger.error(f"YOLO11 호환성 문제: {error_msg}")
                    return {
                        'success': False,
                        'message': f"YOLO11 모델 호환성 문제: {error_msg}",
                        'error': error_msg,
                        'error_type': 'compatibility_error',
                        'solution': {
                            'steps': [
                                'pip install --upgrade ultralytics',
                                'AI 서버 재시작',
                                '최신 YOLO11 모델 파일 사용'
                            ],
                            'technical_details': 'C3k2 모듈을 지원하는 ultralytics>=8.3.11 버전이 필요합니다.'
                        },
                        'analysis_id': analysis_id
                    }
                
                # 일반적인 오류
                return {
                    'success': False,
                    'message': f"YOLO11 증상 탐지 실패: {error_msg}",
                    'error': error_msg,
                    'analysis_id': analysis_id
                }
            
            detections = yolo_result['detections']
            logger.info(f"YOLO11 탐지 완료: {len(detections)}개 증상 발견")
            
            # ViT 여러 마리 검사 로직 제거됨
            
            # YOLO 탐지가 없어도 VGG 전체 이미지 분류는 진행해야 함
            # (20% 이하 건강 판정을 위해)
            
            # 2단계: VGG16 전체 이미지 질병 분류 (크롭 없음)
            logger.info("2단계: VGG16 전체 이미지 질병 분류 시작")
            
            # 원본 이미지 로드
            from PIL import Image
            image = Image.open(image_path)
            
            # VGG는 항상 전체 이미지로만 분류 (학습된 방식)
            logger.info("전체 이미지 VGG 분류 수행")
            single_result = self.vgg_service.classify_single_image(image)
            
            if not single_result:
                logger.error("⚠️ VGG16 전체 이미지 분류 실패")
                raise Exception("VGG16 전체 이미지 분류에 실패했습니다.")
            
            # VGG 결과를 통합 형식으로 변환
            vgg_results = [{
                'index': 0,
                'yolo_detection': None,  # VGG는 YOLO와 독립적
                'vgg_prediction': single_result,
                'crop_info': None
            }]
            
            logger.info(f"VGG16 전체 이미지 질병 분류 완료: {single_result['disease_name_ko']} (신뢰도: {single_result['confidence']:.3f})")
            

            
            
            # 3단계: VGG 기반 건강도 계산 시스템 적용
            logger.info("3단계: 100점 만점 다차원 건강 평가 시작")
            
            # VGG 결과를 종합하여 건강도 계산
            if vgg_results:
                # 가장 심각한 질병 결과 선택
                worst_result = max(vgg_results, key=lambda x: x['vgg_prediction']['confidence'])
                primary_vgg_result = worst_result['vgg_prediction']
            else:
                # VGG 결과가 없으면 건강한 것으로 간주
                primary_vgg_result = {
                    'class_id': 0,
                    'confidence': 0.0,
                    'disease_class': 'healthy',
                    'disease_name_ko': '건강함',
                    'disease_name_en': 'Healthy',
                    'description': '건강한 상태',
                    'severity': 'mild',
                    'symptoms': '특별한 증상 없음',
                    'treatment': '현재 상태 유지',
                    'prevention': '정기적인 관리'
                }
            
            # VGG 서비스의 상세한 건강 평가 사용 (상처 면적 로깅 포함)
            health_evaluation = self.vgg_service.calculate_comprehensive_health_score(primary_vgg_result, detections)
            
            # 5단계: 건강 등급 및 메시지 결정
            is_healthy = primary_vgg_result['disease_class'] == 'healthy' or primary_vgg_result['confidence'] < 0.2
            total_score = health_evaluation['total_score']
            health_grade_info = self._get_vgg_health_grade_and_message(total_score, is_healthy, primary_vgg_result.get('confidence', 0.0))
            
            # 6단계: 결과 포맷팅
            formatted_detections = self._format_vgg_results(detections, vgg_results, health_evaluation)
            
            # YOLO 신뢰도 평균 계산
            yolo_confidences = [det['confidence'] for det in detections]
            yolo_confidence_avg = sum(yolo_confidences) / len(yolo_confidences) if yolo_confidences else 0.0
            
            logger.info(f"어류 질병 분석 완료: {analysis_id} - 점수: {total_score}/100, 등급: {health_grade_info['grade']}")
            
            return {
                'success': True,
                'message': '어류 질병 분석이 완료되었습니다.',
                'health_evaluation': health_evaluation,
                'health_grade_info': health_grade_info,
                'total_detections': len(detections),
                'yolo_confidence_avg': yolo_confidence_avg,
                'detections': formatted_detections,
                'analysis_id': analysis_id,
                'image_info': yolo_result.get('image_size', {}),
                'model_info': {
                    'yolo11': yolo_result.get('model_info', {}),
                    'vgg16': {
                        'model_path': self.vgg_service.model_path,
                        'input_size': self.vgg_service.input_size,
                        'available': True
                    }
                },
                'vgg16_available': True
            }
            
        except Exception as e:
            logger.error(f"어류 질병 분석 중 오류: {str(e)}")
            return {
                'success': False,
                'message': f'분석 중 오류가 발생했습니다: {str(e)}',
                'error': str(e),
                'analysis_id': analysis_id if 'analysis_id' in locals() else str(uuid.uuid4())
            }
    
    # _extract_fish_region 메서드 제거 - 원본 이미지 사용으로 변경
    
    def _check_multiple_fish(self, detections: List[Dict], yolo_result: Dict) -> bool:
        """
        여러 마리 어류 감지 검사
        
        Args:
            detections: YOLO 탐지 결과
            yolo_result: YOLO 전체 결과
            
        Returns:
            여러 마리 감지 여부
        """
        try:
            if not detections:
                return False
            
            image_info = yolo_result.get('image_size', {})
            image_width = image_info.get('width', 1)
            image_height = image_info.get('height', 1)
            image_area = image_width * image_height
            
            # 1. 탐지된 증상이 너무 많은 경우 (15개 이상)
            if len(detections) >= 15:
                logger.info(f"🐟 여러 마리 의심: 탐지 개수 과다 ({len(detections)}개)")
                return True
            
            # 2. 바운딩 박스들이 여러 군집으로 분산된 경우
            bbox_clusters = self._analyze_bbox_clusters(detections, image_width, image_height)
            if bbox_clusters >= 2:
                logger.info(f"🐟 여러 마리 의심: 분리된 군집 감지 ({bbox_clusters}개)")
                return True
            
            # 3. 탐지 영역들의 총 면적이 이미지의 80% 이상인 경우
            total_detection_area = 0
            for detection in detections:
                bbox_width = detection.get('bbox_width', 0) * image_width
                bbox_height = detection.get('bbox_height', 0) * image_height
                total_detection_area += bbox_width * bbox_height
            
            area_ratio = total_detection_area / image_area if image_area > 0 else 0
            if area_ratio > 0.8 and len(detections) >= 8:
                logger.info(f"🐟 여러 마리 의심: 탐지 영역 과다 ({area_ratio:.1%})")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"여러 마리 감지 검사 오류: {str(e)}")
            return False
    
    def _analyze_bbox_clusters(self, detections: List[Dict], image_width: int, image_height: int) -> int:
        """바운딩 박스 군집 분석"""
        try:
            if len(detections) < 4:
                return 1  # 적은 탐지는 한 마리로 간주
            
            # 바운딩 박스 중심점들 계산
            centers = []
            for detection in detections:
                x = detection.get('bbox_x', 0) * image_width
                y = detection.get('bbox_y', 0) * image_height
                w = detection.get('bbox_width', 0) * image_width
                h = detection.get('bbox_height', 0) * image_height
                
                center_x = x + w / 2
                center_y = y + h / 2
                centers.append((center_x, center_y))
            
            # 간단한 거리 기반 클러스터링
            clusters = []
            cluster_threshold = min(image_width, image_height) * 0.3  # 이미지 크기의 30%
            
            for center in centers:
                added_to_cluster = False
                for cluster in clusters:
                    # 클러스터 중심과의 평균 거리 계산
                    avg_distance = sum(
                        ((center[0] - c[0]) ** 2 + (center[1] - c[1]) ** 2) ** 0.5
                        for c in cluster
                    ) / len(cluster)
                    
                    if avg_distance < cluster_threshold:
                        cluster.append(center)
                        added_to_cluster = True
                        break
                
                if not added_to_cluster:
                    clusters.append([center])
            
            return len(clusters)
            
        except Exception as e:
            logger.error(f"클러스터 분석 오류: {str(e)}")
            return 1
    
    def _validate_fish_image_by_yolo_and_characteristics(self, image_path: str, detections: List[Dict], yolo_result: Dict) -> bool:
        """
        YOLO 결과와 이미지 특성을 기반으로 어류 이미지 여부 검증
        
        Args:
            image_path: 이미지 파일 경로
            detections: YOLO 탐지 결과
            yolo_result: YOLO 전체 결과
            
        Returns:
            어류 이미지 여부 (True/False)
        """
        try:
            logger.info("🔍 어류 이미지 검증 시작")
            
            # 1. 이미지 크기 및 비율 검사
            image_info = yolo_result.get('image_size', {})
            width = image_info.get('width', 0)
            height = image_info.get('height', 0)
            
            if width <= 0 or height <= 0:
                logger.warning("⚠️ 유효하지 않은 이미지 크기")
                return False
            
            aspect_ratio = width / height if height > 0 else 0
            
            # 2. 극단적인 비율의 이미지 거부 (너무 세로길거나 가로긴 이미지)
            if aspect_ratio < 0.3 or aspect_ratio > 3.0:
                logger.info(f"⚠️ 부적절한 이미지 비율: {aspect_ratio:.2f} (어류 이미지에 적합하지 않음)")
                return False
            
            # 3. YOLO 탐지 결과 기반 검증
            if not detections:
                logger.info("🟡 YOLO 탐지 결과 없음 - 매우 건강하거나 어류가 아닐 수 있음")
                
                # 탐지가 없을 때 추가 검증 - 이미지 밝기/대비 검사
                brightness_ok = self._check_image_brightness(image_path)
                if not brightness_ok:
                    logger.info("⚠️ 이미지 품질 불량 (너무 어둡거나 밝음)")
                    return False
                
                # 탐지 없음은 건강한 어류로 간주
                logger.info("✅ 탐지 없음 -> 건강한 어류로 판단")
                return True
            
            # 4. 탐지 패턴 분석
            detection_pattern_valid = self._analyze_detection_pattern(detections, width, height)
            if not detection_pattern_valid:
                logger.info("⚠️ 비정상적인 탐지 패턴 (어류가 아닐 가능성)")
                return False
            
            # 5. 탐지 영역이 너무 많은 경우 (잡음이 많은 이미지)
            if len(detections) > 20:
                logger.info(f"⚠️ 탐지 영역 과다 ({len(detections)}개) - 잡음이 많은 이미지 가능성")
                return False
            
            logger.info(f"✅ 어류 이미지 검증 통과 - 탐지: {len(detections)}개, 비율: {aspect_ratio:.2f}")
            return True
            
        except Exception as e:
            logger.error(f"어류 이미지 검증 중 오류: {str(e)}")
            # 오류 발생 시 안전하게 True 반환 (기존 동작 유지)
            return True
    
    def _check_image_brightness(self, image_path: str) -> bool:
        """이미지 밝기 검사"""
        try:
            from PIL import Image, ImageStat
            import numpy as np
            
            with Image.open(image_path) as img:
                # RGB로 변환
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # 이미지 밝기 계산
                stat = ImageStat.Stat(img)
                avg_brightness = sum(stat.mean) / len(stat.mean)
                
                # 너무 어둡거나 밝은 이미지 거부 
                if avg_brightness < 30 or avg_brightness > 230:
                    logger.info(f"⚠️ 부적절한 밝기: {avg_brightness:.1f}")
                    return False
                
                return True
                
        except Exception as e:
            logger.error(f"이미지 밝기 검사 오류: {str(e)}")
            return True
    
    def _analyze_detection_pattern(self, detections: List[Dict], image_width: int, image_height: int) -> bool:
        """탐지 패턴 분석 - 어류스러운 패턴인지 확인"""
        try:
            # 탐지 영역들이 이미지의 중앙 부근에 집중되어 있는지 확인
            center_x = image_width / 2
            center_y = image_height / 2
            
            center_detections = 0
            edge_detections = 0
            
            for detection in detections:
                det_x = detection.get('bbox_x', 0) * image_width
                det_y = detection.get('bbox_y', 0) * image_height
                
                # 중앙에서의 거리 계산
                distance_from_center = ((det_x - center_x) ** 2 + (det_y - center_y) ** 2) ** 0.5
                max_distance = ((image_width ** 2 + image_height ** 2) ** 0.5) / 2
                
                normalized_distance = distance_from_center / max_distance
                
                if normalized_distance < 0.6:  # 중앙 60% 영역
                    center_detections += 1
                else:  # 가장자리 영역
                    edge_detections += 1
            
            # 대부분의 탐지가 가장자리에만 있다면 비정상적
            if edge_detections > center_detections * 2 and len(detections) > 3:
                logger.info(f"⚠️ 가장자리 탐지 과다: 중앙 {center_detections}개, 가장자리 {edge_detections}개")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"탐지 패턴 분석 오류: {str(e)}")
            return True
    
    def _format_comprehensive_results(self, detections: List[Dict], health_evaluation: Dict) -> List[Dict]:
        """다차원 건강 평가 결과 포맷팅"""
        formatted_results = []
        
        for detection in detections:
            formatted_result = {
                'bbox': {
                    'x': float(detection.get('bbox_x', 0)),
                    'y': float(detection.get('bbox_y', 0)),
                    'width': float(detection.get('bbox_width', 0)),
                    'height': float(detection.get('bbox_height', 0))
                },
                'yolo_confidence': float(detection.get('confidence', 0.0)),
                'class_name': detection.get('class_name', 'unknown'),
                'symptom_severity': health_evaluation.get('symptom_severity_details', {}).get('individual_severity', 0.0),
                'bbox_size_score': health_evaluation.get('symptom_severity_details', {}).get('bbox_size_penalty', 0.0)
            }
            formatted_results.append(formatted_result)
        
        return formatted_results
    
    def _format_yolo_only_results(self, detections: List[Dict]) -> List[Dict]:
        """YOLO 전용 결과 포맷팅 (VGG 없이)"""
        formatted_results = []
        
        for detection in detections:
            formatted_result = {
                'bbox': {
                    'x': float(detection.get('bbox_x', 0)),
                    'y': float(detection.get('bbox_y', 0)),
                    'width': float(detection.get('bbox_width', 0)),
                    'height': float(detection.get('bbox_height', 0))
                },
                'yolo_confidence': float(detection.get('confidence', 0.0)),
                'class_name': detection.get('class_name', 'unknown'),
                'vgg_available': False
            }
            formatted_results.append(formatted_result)
        
        return formatted_results
    
    def _format_detection_results(self, classification_results: List[Dict]) -> List[Dict]:
        """API 응답용 탐지 결과 포맷팅 (구 버전 호환용)"""
        formatted_results = []
        
        for result in classification_results:
            yolo_det = result['yolo_detection']
            vgg_pred = result['vgg_prediction']
            
            formatted_result = {
                'bbox': {
                    'x': yolo_det['bbox_x'],
                    'y': yolo_det['bbox_y'],
                    'width': yolo_det['bbox_width'],
                    'height': yolo_det['bbox_height']
                },
                'yolo_confidence': yolo_det['confidence'],
                'disease': {
                    'class': vgg_pred['disease_class'],
                    'name_ko': vgg_pred['disease_name_ko'],
                    'name_en': vgg_pred['disease_name_en'],
                    'confidence': vgg_pred['confidence'],
                    'severity': vgg_pred['severity'],
                    'description': vgg_pred['description'],
                    'symptoms': vgg_pred['symptoms'],
                    'treatment': vgg_pred['treatment'],
                    'prevention': vgg_pred['prevention']
                }
            }
            
            formatted_results.append(formatted_result)
        
        return formatted_results
    
    def check_service_status(self) -> Dict[str, Any]:
        """서비스 상태 확인"""
        try:
            yolo_status = self.yolo_service.check_model_status()
            vgg16_status = self.vgg_service.check_model_status()
            
            overall_status = "healthy" if (
                yolo_status.get("compatible", False) and 
                vgg16_status.get("trained_model_available", False)
            ) else "unhealthy"
            
            return {
                "status": overall_status,
                "services": {
                    "yolo11": yolo_status,
                    "vgg16": vgg16_status
                },
                "ready_for_analysis": overall_status == "healthy"
            }
            
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "ready_for_analysis": False
            }
    
    def _calculate_vgg_health_score(self, vgg_result: Dict, detections: List[Dict]) -> Dict[str, Any]:
        """VGG 기반 건강도 계산"""
        try:
            # VGG 기반 질병 건강도 (80점 만점)
            disease_health = 80.0
            if vgg_result.get('confidence', 0) > 0.2:
                # 질병이 감지된 경우 신뢰도에 0.3을 더해서 점수 차감 증가 (더 엄격한 평가)
                adjusted_confidence = vgg_result['confidence'] + 0.3
                disease_health = max(20.0, 80.0 - (adjusted_confidence * 60.0))
            
            # YOLO 기반 물리적 건강도 (20점 만점)
            physical_health = 20.0
            if detections:
                detection_penalty = min(len(detections) * 3, 15)
                physical_health = max(5.0, 20.0 - detection_penalty)
            
            total_score = int(disease_health + physical_health)
            percentage = total_score / 100.0
            
            return {
                'total_score': total_score,
                'percentage': percentage,
                'breakdown': {
                    'disease_health': int(disease_health),
                    'physical_health': int(physical_health)
                },
                'processed_vgg_result': vgg_result,
                'yolo_detection_count': len(detections)
            }
            
        except Exception as e:
            logger.error(f"VGG 건강도 계산 오류: {str(e)}")
            # 모킹 데이터 제거 - 실제 계산 실패 시 예외 발생
            raise Exception(f"건강도 계산에 실패했습니다: {str(e)}")
    
    def _get_vgg_health_grade_and_message(self, total_score: int, is_healthy: bool, vgg_confidence: float = 0.0) -> Dict[str, Any]:
        """VGG 기반 건강 등급 및 메시지 결정"""
        try:
            # VGG 신뢰도 기반 위험도 레벨 계산
            vgg_conf_percent = vgg_confidence * 100
            
            def get_risk_level(confidence_percent: float, is_healthy_state: bool) -> str:
                if is_healthy_state or confidence_percent < 10:
                    return '건강'
                elif confidence_percent < 15:
                    return '약간의심'
                elif confidence_percent < 30:
                    return '의심'
                elif confidence_percent < 60:
                    return '질병 위험'
                else:
                    return '격리필요'
            
            risk_level = get_risk_level(vgg_conf_percent, is_healthy)
            
            # VGG 서비스와 동일한 기준 사용
            if is_healthy:
                # 건강 상태인 경우
                if total_score >= 90:
                    grade = '상'
                    message = '건강합니다'
                    description = '매우 좋은 상태입니다'
                elif total_score >= 70:
                    grade = '중상'
                    message = '약간의 상처가 있지만 건강합니다'
                    description = '전반적으로 양호한 상태입니다'
                elif total_score >= 50:
                    grade = '중'
                    message = '상처가 많아 관찰이 필요합니다'
                    description = '지속적인 관찰이 필요합니다'
                elif total_score >= 30:
                    grade = '중하'
                    message = '상처가 심각합니다'
                    description = '적극적인 관리가 필요합니다'
                else:
                    grade = '하'
                    message = '즉시 치료가 필요합니다'
                    description = '긴급한 치료가 필요합니다'
            else:
                # 질병 상태인 경우
                if total_score >= 80:
                    grade = '중상'
                    message = '경미한 질병이 의심됩니다'
                    description = '경미한 질병 상태입니다'
                elif total_score >= 60:
                    grade = '중'
                    message = '질병 진단이 필요합니다'
                    description = '정밀한 진단이 필요합니다'
                elif total_score >= 40:
                    grade = '중하'
                    message = '질병 치료가 필요합니다'
                    description = '치료가 시급합니다'
                elif total_score >= 20:
                    grade = '하'
                    message = '심각한 질병이 의심됩니다'
                    description = '심각한 질병 상태입니다'
                else:
                    grade = '하'
                    message = '즉시 격리 및 치료가 필요합니다'
                    description = '매우 위험한 상태입니다'
            
            return {
                'grade': grade,
                'message': message,
                'description': description,
                'risk_level': risk_level,
                'score': total_score,
                'is_healthy': is_healthy
            }
            
        except Exception as e:
            logger.error(f"VGG 등급 계산 오류: {str(e)}")
            return {
                'grade': '중',
                'message': '상태를 확인할 수 없습니다',
                'description': '평가 중입니다',
                'risk_level': '보통',
                'score': total_score,
                'is_healthy': False
            }
    
    def _format_vgg_results(self, detections: List[Dict], vgg_results: List[Dict], health_evaluation: Dict) -> List[Dict]:
        """VGG 결과 포맷팅"""
        try:
            formatted_results = []
            
            for i, detection in enumerate(detections):
                # 해당하는 VGG 결과 찾기
                vgg_result = None
                for vgg in vgg_results:
                    if vgg.get('index') == i:
                        vgg_result = vgg['vgg_prediction']
                        break
                
                if not vgg_result:
                    # VGG 결과가 없으면 기본값
                    vgg_result = {
                        'disease_class': 'unknown',
                        'disease_name_ko': '알 수 없음',
                        'disease_name_en': 'Unknown',
                        'confidence': 0.0,
                        'severity': 'moderate',
                        'description': '분석 결과 없음',
                        'symptoms': '확인 필요',
                        'treatment': '전문가 상담',
                        'prevention': '정기적인 모니터링'
                    }
                
                # 결과 포맷팅 - 스키마에 맞게 수정
                formatted_result = {
                    'bbox': {
                        'x': detection['bbox_x'],
                        'y': detection['bbox_y'], 
                        'width': detection['bbox_width'],
                        'height': detection['bbox_height']
                    },
                    'yolo_confidence': detection['confidence'],
                    'class_name': detection.get('class_name', 'unknown'),
                    'disease': {
                        'class_name': vgg_result['disease_class'],
                        'name_ko': vgg_result['disease_name_ko'],
                        'name_en': vgg_result['disease_name_en'], 
                        'confidence': vgg_result['confidence'],
                        'severity': vgg_result['severity'],
                        'description': vgg_result['description'],
                        'symptoms': vgg_result['symptoms'],
                        'treatment': vgg_result['treatment'],
                        'prevention': vgg_result['prevention']
                    }
                }
                
                formatted_results.append(formatted_result)
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"VGG 결과 포맷팅 오류: {str(e)}")
            return []