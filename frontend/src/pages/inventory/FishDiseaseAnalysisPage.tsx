/**
 * AI 어류 질병 분석 페이지
 * AI 기반 어류 증상 탐지 및 질병 분류 시스템
 */
"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Camera, FileImage, Loader2, AlertCircle, CheckCircle, Info, Eye, Download, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

// 타입 정의
interface DetectionResult {
  bbox_x: number;
  bbox_y: number;
  bbox_width: number;
  bbox_height: number;
  confidence: number;
  disease: {
    class: string;
    name_ko: string;
    name_en: string;
    confidence: number;
    severity: 'mild' | 'moderate' | 'severe' | 'critical';
    description: string;
    symptoms: string;
    treatment: string;
    prevention: string;
  };
}

interface AnalysisResult {
  analysis_id: number;
  status: 'processing' | 'completed' | 'failed';
  overall_health_status: 'good' | 'fair' | 'poor' | string;
  total_detections: number;
  yolo_confidence_avg: number;
  original_image_url: string;
  processed_image_url: string;
  detections: DetectionResult[];
  created_at: string;
  completed_at: string;
  // 오류 관련 필드
  error_type?: string;
  solution?: {
    steps: string[];
    technical_details: string;
  };
  // AI 서버 새로운 응답 필드들
  health_evaluation?: {
    total_score: number;
    percentage: number;
    breakdown?: {
      disease_health: number;
      physical_health: number;
    };
  };
  health_grade_info?: {
    grade: string;
    message: string;
    risk_level: string;
  };
  model_info?: any;
  image_info?: any;
}

// 건강도 평가 결과 타입
interface HealthAssessment {
  totalScore: number;
  percentage: number;
  healthGrade: string;
  healthMessage: string;
  healthDescription?: string; // AI 서버의 상세 설명
  confidence: number;
  diseaseName: string;
  diseaseMessage: string;
  riskLevel: string;
  status: string;
  breakdown: {
    disease_health: number;
    physical_health: number;
  };
}

const FishDiseaseAnalysisPage: React.FC = () => {
  // 상태 관리
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string>('');
  const [showMagnifier, setShowMagnifier] = useState<number | null>(null);
  const [croppedImages, setCroppedImages] = useState<string[]>([]);
  const [selectedDetection, setSelectedDetection] = useState<number | null>(null);
  const [diseaseResults, setDiseaseResults] = useState<any[]>([]);
  const [isClassifying, setIsClassifying] = useState(false);
  const [vggAttempted, setVggAttempted] = useState(false); // VGG 분류 시도 여부
  const [currentPage, setCurrentPage] = useState(0);
  const [modalImage, setModalImage] = useState<string | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // 파일 선택 처리
  const handleFileSelect = useCallback((file: File) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setError('');
      setAnalysisResult(null);
      setCroppedImages([]);
      setDiseaseResults([]);
      setVggAttempted(false); // VGG 시도 상태 리셋
      setSelectedDetection(null);
      setCurrentPage(0);
      setModalImage(null);
    } else {
      setError('이미지 파일만 업로드 가능합니다.');
    }
  }, []);

  // 드래그 앤 드롭 처리
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // 파일 입력 처리
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // 바운딩 박스 영역 크롭 함수
  const cropBoundingBoxes = useCallback(() => {
    if (!analysisResult?.detections || !imageRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const croppedUrls: string[] = [];

    analysisResult.detections.forEach((detection, index) => {
      const imgElement = imageRef.current!;
      const imgRect = imgElement.getBoundingClientRect();
      
      // 실제 이미지 크기와 표시된 이미지 크기 비율 계산
      const scaleX = imgElement.naturalWidth / imgElement.width;
      const scaleY = imgElement.naturalHeight / imgElement.height;
      
      // 바운딩 박스 좌표를 픽셀로 변환
      const x = detection.bbox_x * imgElement.naturalWidth;
      const y = detection.bbox_y * imgElement.naturalHeight;
      const width = detection.bbox_width * imgElement.naturalWidth;
      const height = detection.bbox_height * imgElement.naturalHeight;
      
      // 캔버스 크기 설정
      canvas.width = width;
      canvas.height = height;
      
      // 원본 이미지에서 해당 영역 크롭
      ctx.drawImage(
        imgElement,
        x, y, width, height,
        0, 0, width, height
      );
      
      // 크롭된 이미지를 Data URL로 변환
      const croppedDataUrl = canvas.toDataURL('image/png');
      croppedUrls.push(croppedDataUrl);
    });

    setCroppedImages(croppedUrls);
  }, [analysisResult]);

  // VGG 질병 분류 함수 - 전체 이미지를 전송
  const classifyDiseases = useCallback(async () => {
    if (!selectedFile || !analysisResult) {
      return;
    }
    
    // VGG 시도 상태를 true로 설정 (재시도 방지)
    setVggAttempted(true);
    
    try {
      // FormData 생성 - 전체 원본 이미지 전송
        const formData = new FormData();
      formData.append('image', selectedFile);
        
      // VGG 분류 API 호출 (전체 이미지 분석) - 백엔드 통해서 호출
        const classifyResponse = await fetch('/api/v1/fish-analysis/classify/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: formData
        });

        
        if (!classifyResponse.ok) {
          const errorText = await classifyResponse.text();
        return;
        }
        
        const data = await classifyResponse.json();
        
        if (data.success && data.disease_result) {
        // 전체 이미지 VGG 분류 결과 처리
        const result = {
            disease: {
            class: data.disease_result.class_name,
              name_ko: data.disease_result.disease_name_ko,
            name_en: data.disease_result.disease_name_en || '',
              confidence: data.disease_result.confidence,
              severity: data.disease_result.severity,
              description: data.disease_result.description,
              symptoms: data.disease_result.symptoms,
              treatment: data.disease_result.treatment,
              prevention: data.disease_result.prevention,
              is_healthy: data.disease_result.is_healthy  // 중요: is_healthy 필드 추가
            }
          };
        
        setDiseaseResults([result]);
        } else {
      }
    } catch (error) {
    } finally {
      setIsClassifying(false);
    }
  }, [selectedFile, analysisResult]);

  // 분석 완료 후 자동으로 크롭 및 질병 분류 실행
  useEffect(() => {
    if (analysisResult?.detections && analysisResult.detections.length > 0) {
      // 이미지가 로드된 후 크롭 실행
      const timer = setTimeout(() => {
        cropBoundingBoxes();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [analysisResult, cropBoundingBoxes]);

  // YOLO 분석 완료 후 VGG 분류 자동 시작 (한번만)
  useEffect(() => {
    if (analysisResult && !vggAttempted) {
      setIsClassifying(true);
      const timer = setTimeout(() => {
        classifyDiseases();
      }, 500); // YOLO 완료 0.5초 후 VGG 분류 시작
      return () => clearTimeout(timer);
    }
  }, [analysisResult, vggAttempted, classifyDiseases]);

  // croppedImages 변경 시 currentPage 초기화
  useEffect(() => {
    setCurrentPage(0);
  }, [croppedImages.length]);

  // 분석 요청 함수
  const analyzeImage = async () => {
    if (!selectedFile) {
      setError('분석할 이미지를 선택해주세요.');
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      // fishAnalysisApi import 필요
      const { fishAnalysisApi } = await import('../../lib/api');
      
      const data = await fishAnalysisApi.analyze(selectedFile);

      if (data.success) {
        // YOLO 분석 결과 처리
        
        // 각 detection의 bbox 구조 확인
        data.detections?.forEach((det, i) => {
        });
        
        setAnalysisResult({
          analysis_id: Date.now(), // 임시 ID
          status: 'completed',
          overall_health_status: data.overall_health_status || 'fair',
          total_detections: data.total_detections || 0,
          yolo_confidence_avg: data.yolo_confidence_avg || 0,
          detections: data.detections || [],
          model_info: data.model_info,
          image_info: data.image_info,
          original_image_url: previewUrl,
          processed_image_url: previewUrl,
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          // 새로운 건강도 평가 데이터 (있으면 추가)
          health_evaluation: data.health_evaluation,
          health_grade_info: data.health_grade_info
        });

        // YOLO 결과 처리 완료 - VGG는 크롭 완료 후 자동 시작됨
      } else {
        throw new Error(data.error || '분석에 실패했습니다.');
      }

    } catch (err: any) {
      
      if (err.response?.status === 401) {
        setError('로그인이 필요합니다. 다시 로그인해주세요.');
      } else if (err.response?.data?.error) {
        const errorData = err.response.data;
        
        // 호환성 오류인 경우 상세한 해결방안 표시
        if (errorData.error_type === 'compatibility_error' && errorData.solution) {
          const solutionSteps = errorData.solution.steps.map((step: string, index: number) => 
            `${index + 1}. ${step}`
          ).join('\n');
          
          setError(`${errorData.error}\n\n해결 방법:\n${solutionSteps}\n\n${errorData.solution.technical_details}`);
        } else {
          setError(errorData.error);
        }
      } else {
        setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 100점 만점 건강도 평가 시스템
  const getHealthAssessment = (): HealthAssessment => {
    // AI 서버에서 계산된 건강도 평가 데이터 사용
    if (analysisResult?.health_evaluation && analysisResult?.health_grade_info) {
      const healthEval = analysisResult.health_evaluation;
      const gradeInfo = analysisResult.health_grade_info;
      const vggConfidence = (diseaseResults?.[0]?.disease?.confidence || 0) * 100;
      const diseaseName = diseaseResults?.[0]?.disease?.name_ko || '';
      const disease = diseaseResults?.[0]?.disease;
      
      // 백엔드에서 후처리된 결과를 기반으로 질병 메시지 생성 (중복 로직 제거)
      const healthyClasses = ['healthy', 'minor_wound', 'wounds', 'many_wounds'];
      let diseaseMessage = '';
      
      if (disease) {
        // AI 서버에서 직접 제공하는 is_healthy 필드 사용 (20% 정책 포함)
        const isHealthy = disease.is_healthy;
        
        if (isHealthy) {
          // VGG가 건강으로 분류된 경우 (클래스 0 또는 20% 미만) - YOLO 탐지 여부에 따라 메시지 결정
          const hasYoloDetections = analysisResult?.detections && analysisResult.detections.length > 0;
          
          if (hasYoloDetections) {
            diseaseMessage = '상처가 보입니다';
          } else {
            diseaseMessage = '건강한 상태입니다';
          }
        } else {
          // AI 서버에서 실제 질병으로 분류된 경우 (20% 초과) - "확률로" 문구 제거
          diseaseMessage = `${diseaseName}이 의심됩니다`;
        }
      } else {
        diseaseMessage = '질병이 없습니다';
      }
      
      return {
        // 100점 만점 점수 (소수점 제거)
        totalScore: Math.round(healthEval.total_score || 0),
        percentage: Math.round(healthEval.percentage || 0),
        
        // 건강 등급 (상/중상/중/중하/하)
        healthGrade: gradeInfo.grade || '상',
        healthMessage: gradeInfo.message || '건강합니다',
        healthDescription: (gradeInfo as any)?.description, // AI 서버의 상세 설명
        
        // VGG 질병 정보
        confidence: vggConfidence,
        diseaseName: diseaseName,
        diseaseMessage: diseaseMessage, // 새로운 질병 메시지
        
        // 위험도 레벨
        riskLevel: gradeInfo.risk_level || '건강',
        
        // 세부 점수 (소수점 제거)
        breakdown: {
          disease_health: Math.round(healthEval.breakdown?.disease_health || 100),
          physical_health: Math.round(healthEval.breakdown?.physical_health || 100)
        },
        
        // 상태 메시지 (AI 서버 is_healthy 필드 기반) - YOLO 탐지 고려
        status: (() => {
          if (disease && !disease.is_healthy) {
            return `${diseaseName}이 의심됩니다`;
          } else {
            // VGG가 건강으로 분류된 경우 - YOLO 탐지 여부에 따라 결정
            const hasYoloDetections = analysisResult?.detections && analysisResult.detections.length > 0;
            return hasYoloDetections ? '상처가 보입니다' : '건강한 상태입니다';
          }
        })()
      };
    }
    
    // 폴백: 기존 방식으로 계산
    if (!diseaseResults || diseaseResults.length === 0 || !analysisResult) {
      return { 
        totalScore: 100,
        percentage: 100,
        confidence: 0, 
        diseaseName: '', 
        diseaseMessage: '질병이 없습니다', // 새로운 필드 추가
        healthGrade: '상',
        healthMessage: '건강합니다',
        healthDescription: '매우 좋은 상태입니다',
        riskLevel: '건강',
        status: '건강한 상태',
        breakdown: { disease_health: 100, physical_health: 100 }
      };
    }
    
    const result = diseaseResults[0];
    const confidence = result.disease.confidence * 100;
    const diseaseName = result.disease.name_ko;
    
    // 폴백용 질병 메시지 생성 (백엔드 정책과 일관성 유지)
    let diseaseMessage = '';
    if (confidence <= 20) {
      // 20% 미만은 백엔드와 동일하게 건강 상태로 처리 - YOLO 탐지 고려
      const hasYoloDetections = analysisResult?.total_detections && analysisResult.total_detections > 0;
      diseaseMessage = hasYoloDetections ? '상처가 보입니다' : '건강한 상태입니다';
    } else {
      // 20% 이상은 질병 의심 - "확률로" 문구 제거
      diseaseMessage = `${diseaseName}이 의심됩니다`;
    }
    
    // 간단한 점수 계산 (폴백)
    let score = 100;
    score -= confidence * 0.7; // 질병 신뢰도에 따른 차감
    score -= (analysisResult.total_detections || 0) * 5; // 증상 개수에 따른 차감
    score = Math.max(score, 0);
    
    let healthGrade = '상';
    let healthMessage = '건강합니다';
    if (score < 30) { healthGrade = '하'; healthMessage = '격리 또는 특별관리가 필요합니다'; }
    else if (score < 50) { healthGrade = '중하'; healthMessage = '병에 걸렸을 가능성이 높습니다'; }
    else if (score < 70) { healthGrade = '중'; healthMessage = '진단이 필요합니다'; }
    else if (score < 90) { healthGrade = '중상'; healthMessage = '약간의 질병이 의심됩니다'; }
    
    return {
      totalScore: Math.round(score),
      percentage: Math.round(score),
      confidence: confidence,
      diseaseName: diseaseName,
      diseaseMessage: diseaseMessage, // 새로운 필드 추가
      healthGrade: healthGrade,
      healthMessage: healthMessage,
      healthDescription: confidence < 20 ? '매우 좋은 상태입니다' : confidence < 50 ? '지속적인 관찰이 필요합니다' : '정밀한 진단이 필요합니다',
      riskLevel: confidence < 20 ? '건강' : confidence < 30 ? '의심' : confidence < 60 ? '질병 위험' : '격리필요',
      status: confidence < 20 ? (analysisResult?.total_detections && analysisResult.total_detections > 0 ? '상처가 보입니다' : '건강한 상태입니다') : `${diseaseName}이 의심됩니다`,
      breakdown: { disease_health: Math.round(score), physical_health: Math.round(score) }
    };
  };

  // 점수 기반 건강상태 계산 함수 (기존 호환성)
  const calculateHealthScore = () => {
    const assessment = getHealthAssessment();
    return assessment.totalScore;
  };

  // 점수 기반 건강 상태 정보 (개선된 등급 시스템)
  const getHealthStatusInfo = () => {
    const assessment = getHealthAssessment();
    const score = assessment.totalScore;
    
    // 점수 기반 등급 계산
    let grade = '';
    let color = '';
    let bg = '';
    
    if (score >= 80) {
      grade = '상';
      color = 'text-green-600';
      bg = 'bg-green-100';
    } else if (score >= 65) {
      grade = '중상';
      color = 'text-green-500';
      bg = 'bg-green-50';
    } else if (score >= 40) {
      grade = '중';
      color = 'text-yellow-600';
      bg = 'bg-yellow-100';
    } else if (score >= 20) {
      grade = '중하';
      color = 'text-orange-600';
      bg = 'bg-orange-100';
    } else {
      grade = '하';
      color = 'text-red-600';
      bg = 'bg-red-100';
    }
    
    return { 
      color, 
      bg, 
      text: grade, 
      icon: score >= 60 ? CheckCircle : AlertCircle, 
      score: score 
    };
  };

  // 질병 진단 색상 정보
  const getDiseaseStatusColor = () => {
    const assessment = getHealthAssessment();
    const confidence = assessment.confidence;
    
    if (confidence <= 20) {
      return 'text-green-600'; // 건강 - 초록색
    } else if (confidence <= 40) {
      return 'text-yellow-600'; // 약간 의심 - 노란색
    } else if (confidence <= 60) {
      return 'text-orange-600'; // 의심 - 주황색
    } else if (confidence <= 80) {
      return 'text-red-500'; // 가능성 높음 - 빨간색
    } else {
      return 'text-red-700'; // 질병 확정 - 진한 빨간색
    }
  };

  // 건강 상태별 메시지 생성
  const getHealthStatusMessage = () => {
    const assessment = getHealthAssessment();
    const confidence = assessment.confidence;
    const hasYoloDetections = analysisResult?.total_detections > 0;
    
    // VGG 신뢰도 20% 이하 (건강 상태)
    if (confidence <= 20) {
      if (hasYoloDetections) {
        // 건강하지만 YOLO 탐지가 있는 경우 - 상처가 있는 경우
        return {
          title: "상처 치료 안내",
          description: "생선에 외부 상처가 발견되었지만 특별한 질병은 없는 상태입니다. 적절한 관리와 치료로 회복이 가능합니다.",
          symptoms: "외부 상처, 찰과상, 경미한 외상",
          treatment: "상처 부위를 깨끗한 소금물로 세척하고, 항균제를 적용하여 2차 감염을 방지하세요. 스트레스를 줄이고 깨끗한 환경을 유지하세요.",
          prevention: "날카로운 물체 제거, 적절한 사육밀도 유지, 정기적인 수질 관리를 통해 상처 발생을 예방하세요."
        };
      } else {
        // 완전 건강한 경우
        return {
          title: "건강한 생선",
          description: "매우 건강한 상태의 생선입니다. 질병이나 외상의 징후가 발견되지 않았으며, 현재 상태를 잘 유지하고 계십니다.",
          symptoms: "특별한 증상 없음, 건강한 외관, 정상적인 활동",
          treatment: "특별한 치료가 필요하지 않습니다. 현재의 관리 방법을 계속 유지하세요.",
          prevention: "정기적인 수질 검사, 적절한 사료 공급, 스트레스 관리를 통해 건강 상태를 유지하세요."
        };
      }
    }
    
    // VGG 신뢰도 20% 초과 (질병 의심)
    return null; // 기존 질병 정보 사용
  };

  // 기존 건강 상태 함수 (호환성 유지)
  const getOldHealthStatusInfo = () => {
    const assessment = getHealthAssessment();
    
    switch (assessment.healthGrade) {
      case '상':
        return { color: 'text-green-600', bg: 'bg-green-100', text: '상', icon: CheckCircle, score: assessment.totalScore };
      case '중상':
        return { color: 'text-green-500', bg: 'bg-green-50', text: '중상', icon: CheckCircle, score: assessment.totalScore };
      case '중':
        return { color: 'text-yellow-600', bg: 'bg-yellow-100', text: '중', icon: AlertCircle, score: assessment.totalScore };
      case '중하':
        return { color: 'text-orange-600', bg: 'bg-orange-100', text: '중하', icon: AlertCircle, score: assessment.totalScore };
      case '하':
        return { color: 'text-red-600', bg: 'bg-red-100', text: '하', icon: AlertCircle, score: assessment.totalScore };
      default:
        return { color: 'text-green-600', bg: 'bg-green-100', text: '상', icon: CheckCircle, score: 0 };
    }
  };

  // 심각도 색상
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'mild':
        return 'text-green-600 bg-green-100';
      case 'moderate':
        return 'text-yellow-600 bg-yellow-100';
      case 'severe':
        return 'text-orange-600 bg-orange-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI 어류 질병 분석</h1>
          <p className="text-gray-600">AI를 활용한 정밀한 어류 증상 탐지 및 질병 진단</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 왼쪽: 이미지 업로드 및 분석 영역 */}
          <div className="space-y-6">
            {/* 이미지 업로드 카드 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileImage className="w-5 h-5" />
                  이미지 업로드
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  
                  {previewUrl ? (
                    <div className="space-y-4">
                      <div className="relative inline-block">
                        <img 
                          ref={imageRef}
                          src={previewUrl} 
                          alt="업로드된 이미지" 
                          className="max-h-80 mx-auto rounded-lg shadow-md"
                          onLoad={() => {
                            // 이미지 로드 완료 후 크롭 실행
                            if (analysisResult?.detections && analysisResult.detections.length > 0) {
                              setTimeout(cropBoundingBoxes, 100);
                            }
                          }}
                        />
                        
                        {/* 바운딩박스 오버레이 */}
                        {analysisResult?.detections && analysisResult.detections.map((detection, index) => (
                          <div
                            key={index}
                            className="absolute border-2 border-red-500 bg-red-500/20 cursor-pointer hover:bg-red-500/30 transition-all"
                            style={{
                              left: `${(detection.bbox_x || 0) * 100}%`,
                              top: `${(detection.bbox_y || 0) * 100}%`,
                              width: `${(detection.bbox_width || 0) * 100}%`,
                              height: `${(detection.bbox_height || 0) * 100}%`,
                            }}
                            onClick={() => setShowMagnifier(showMagnifier === index ? null : index)}
                          >
                            <div className="absolute -top-6 left-0 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
                              의심증상 {index + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex gap-3">
                        <Button 
                          variant="outline" 
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                          className="flex-1"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          다른 이미지 선택
                        </Button>
                        
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation();
                            analyzeImage();
                          }}
                          disabled={!selectedFile || isAnalyzing}
                          className="flex-1"
                        >
                          {isAnalyzing ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              분석 중...
                            </>
                          ) : (
                            <>
                              <Camera className="w-4 h-4 mr-2" />
                              AI 분석 시작
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="w-12 h-12 mx-auto text-gray-400" />
                      <div>
                        <p className="text-lg font-medium text-gray-900">이미지를 업로드하세요</p>
                        <p className="text-sm text-gray-500 mt-1">
                          드래그하여 놓거나 클릭하여 선택
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          지원 형식: JPG, PNG, BMP (최대 10MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
              </CardContent>
            </Card>


            {/* 의심증상 탐지 결과 - 페이지네이션 방식 */}
            {croppedImages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    의심증상 탐지 결과
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* 증상 이미지 그리드 (3개씩 표시) */}
                    <div className="grid grid-cols-3 gap-3">
                      {croppedImages.slice(currentPage * 3, (currentPage + 1) * 3).map((croppedUrl, index) => {
                        const actualIndex = currentPage * 3 + index;
                        return (
                          <div 
                            key={actualIndex} 
                            className="cursor-pointer border-2 rounded-lg p-2 transition-all border-gray-200 hover:border-blue-300 hover:shadow-md"
                              onClick={() => setModalImage(croppedUrl)}
                            >
                              <img
                                src={croppedUrl}
                              alt={`상처 부위 ${actualIndex + 1}`}
                              className="w-full h-20 object-cover rounded"
                            />
                            <div className="mt-1 text-xs text-center">
                              <div className="font-medium text-gray-700">
                                의심증상 {actualIndex + 1}
                                </div>
                                </div>
                              </div>
                        );
                      })}
                      </div>
                      
                    {/* 페이지네이션 화살표 - 3개 이상일 때만 표시 */}
                      {croppedImages.length > 3 && (
                      <div className="flex justify-center items-center gap-4 mt-4">
                          <button
                          onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                          disabled={currentPage === 0}
                          className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                        
                        <span className="text-sm text-gray-600">
                          {currentPage + 1} / {Math.ceil(croppedImages.length / 3)}
                        </span>
                        
                          <button
                          onClick={() => setCurrentPage(Math.min(Math.ceil(croppedImages.length / 3) - 1, currentPage + 1))}
                          disabled={currentPage >= Math.ceil(croppedImages.length / 3) - 1}
                          className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 오른쪽: 분석 보고서 */}
          <div className="space-y-6">
            {analysisResult ? (
              <>
                {/* 전체 건강 상태 */}
                <Card>
                  <CardHeader>
                    <CardTitle>어류 건강 상태</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* 건강도 평가 바 */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">건강도 평가</span>
                        </div>
                        
                        {/* 건강도 바 (왼쪽: 건강, 오른쪽: 질병의심) */}
                        <div className="relative h-16 bg-gradient-to-r from-green-400 to-red-400 rounded-lg shadow-inner">
                          {/* 라벨 */}
                          <div className="absolute inset-0 flex justify-between items-center px-4">
                            <span className="text-white font-bold text-sm">건강</span>
                            <span className="text-white font-bold text-sm">질병의심</span>
                          </div>
                          
                          {/* 현재 상태 표시 - AI 진단 완료 후에만 표시 */}
                          {diseaseResults.length > 0 && (() => {
                            const assessment = getHealthAssessment();
                            // 100점 만점 점수에 따른 건강도 바 위치 계산 (100점 = 0%, 0점 = 100%)
                            const healthPosition = Math.max(0, Math.min(100, 100 - (assessment.totalScore || 0)));
                            
                            return (
                          <div 
                            className="absolute top-0 bottom-0 w-1 bg-black shadow-lg transform -translate-x-1/2"
                                style={{ left: `${healthPosition}%` }}
                          >
                            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                              <div className="w-0 h-0 border-l-2 border-r-2 border-b-4 border-transparent border-b-black"></div>
                            </div>
                          </div>
                            );
                          })()}
                          
                          {/* 판독 중 상태 표시 */}
                          {diseaseResults.length === 0 && analysisResult && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="bg-black bg-opacity-20 rounded-lg px-3 py-1 flex items-center space-x-2">
                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                                <span className="text-white text-sm font-medium">등급 분석중...</span>
                        </div>
                            </div>
                          )}
                        </div>
                        

                      </div>

                      {/* 통계 정보 */}
                      <div className="grid grid-cols-1 gap-4 pt-4 border-t">
                        <div className="text-center">
                          {diseaseResults.length > 0 ? (
                            <>
                              {/* 종합 건강 점수 표시 (크기 더욱 증대) */}
                        <div className="text-center">
                                <div className="text-6xl font-bold text-blue-600 mb-2">
                                  {getHealthAssessment().totalScore}
                                </div>
                                <div className="text-sm text-gray-500 mb-1">종합 건강 점수</div>
                              </div>
                              
                                                            <div className="relative group mt-4">
                                <p className={`text-xl font-bold cursor-help ${getHealthStatusInfo().color}`}>
                                  {getHealthAssessment().healthMessage}
                                </p>
                                {getHealthAssessment().healthDescription && (
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                    {getHealthAssessment().healthDescription}
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                        </div>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center justify-center space-x-2">
                                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                                <p className="text-lg font-medium text-gray-500">판독중</p>
                              </div>
                              <p className="text-sm text-gray-600">건강도 분석중</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 질병 진단 결과 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>AI 질병 진단</span>
                      {isClassifying && (
                        <div className="flex items-center text-sm text-blue-600">
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          분석 중...
                        </div>
                      )}
                      {/* 진단 결과 상단 우측 */}
                      {diseaseResults.length > 0 && (
                        <div className="text-right">
                          <div className="text-sm text-gray-500 mb-1">진단 결과</div>
                          <div className={`text-lg font-semibold ${getDiseaseStatusColor()}`}>
                            {getHealthAssessment().diseaseMessage}
                          </div>
                        </div>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                          {diseaseResults.length > 0 ? (
                        // VGG 질병 분류 완료된 경우 - 단일 카드
                        <div className="border rounded-lg p-6 bg-white shadow-sm">
                          <div className="flex items-start justify-between mb-4">
                                    <div>
                              <h3 className="font-semibold text-2xl text-gray-900 mb-2">
                                {(() => {
                                  const healthMessage = getHealthStatusMessage();
                                  if (healthMessage) {
                                    return healthMessage.title; // "이란?" 제거
                                  }
                                  return diseaseResults[0].disease.class === 'healthy' ? '건강한 상태란?' : `${diseaseResults[0].disease.name_ko}이란?`;
                                })()}
                              </h3>
                                    </div>
                                  </div>

                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium text-gray-800 mb-2">상태 설명</h4>
                              <p className="text-gray-600">
                                {(() => {
                                  const healthMessage = getHealthStatusMessage();
                                  if (healthMessage) {
                                    return healthMessage.description;
                                  }
                                  return diseaseResults[0].disease.description;
                                })()}
                              </p>
                                </div>

                                  <div>
                              <h4 className="font-medium text-gray-800 mb-2">주요 증상</h4>
                              <p className="text-gray-600">
                                {(() => {
                                  const healthMessage = getHealthStatusMessage();
                                  if (healthMessage) {
                                    return healthMessage.symptoms;
                                  }
                                  return diseaseResults[0].disease.class === 'healthy' 
                                    ? '상처가 있는 것으로 보이나 특별한 질병 없음' 
                                    : diseaseResults[0].disease.symptoms;
                                })()}
                              </p>
                                  </div>
                                  
                                  <div>
                              <h4 className="font-medium text-gray-800 mb-2">관리 방법</h4>
                              <p className="text-gray-600">
                                {(() => {
                                  const healthMessage = getHealthStatusMessage();
                                  if (healthMessage) {
                                    return healthMessage.treatment;
                                  }
                                  return diseaseResults[0].disease.treatment;
                                })()}
                              </p>
                                  </div>
                                  
                                  <div>
                              <h4 className="font-medium text-gray-800 mb-2">예방법</h4>
                              <p className="text-gray-600">
                                {(() => {
                                  const healthMessage = getHealthStatusMessage();
                                  if (healthMessage) {
                                    return healthMessage.prevention;
                                  }
                                  return diseaseResults[0].disease.prevention;
                                })()}
                              </p>
                                  </div>
                                </div>
                              </div>
                      ) : analysisResult ? (
                        // VGG 분석 중인 경우
                        <div className="border rounded-lg p-6 bg-gray-50">
                          <div className="text-center py-8">
                            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-500" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">AI 질병 진단 중...</h3>
                            <p className="text-gray-600">
                              전체 이미지를 분석하여 정확한 질병을 판별하고 있습니다.
                                    </p>
                                  </div>
                                </div>
                      ) : (
                        // 분석 전 상태
                        <div className="text-center py-8 text-gray-500">
                          <Camera className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                          <p>이미지를 업로드하고 분석을 시작하세요</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Camera className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">분석을 시작하세요</h3>
                  <p className="text-gray-600">
                    어류 이미지를 업로드하고 AI 분석 버튼을 클릭하면<br />
                    정밀한 질병 진단 결과를 확인할 수 있습니다.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* 이미지 확대 모달 */}
      {modalImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setModalImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh] p-4">
            <button
              onClick={() => setModalImage(null)}
              className="absolute top-2 right-2 bg-white rounded-full p-2 hover:bg-gray-100 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={modalImage}
              alt="확대된 상처 부위"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default FishDiseaseAnalysisPage;