#!/usr/bin/env python3
"""
넙치 질병 데이터셋 전처리 및 분석
"""

import os
import json
import cv2
import numpy as np
from pathlib import Path
from collections import Counter, defaultdict
import matplotlib.pyplot as plt
from typing import Dict, List, Tuple
import pandas as pd

class FlounderDatasetProcessor:
    def __init__(self, dataset_path: str):
        self.dataset_path = Path(dataset_path)
        self.annotations = {}
        self.disease_mapping = {
            # AI Hub 데이터셋의 질병 라벨을 우리 시스템에 맞게 매핑
            'bacterial_infection': ['세균성감염', '세균감염', 'bacterial'],
            'viral_infection': ['바이러스감염', 'viral'],  
            'parasitic_infection': ['기생충감염', 'parasite'],
            'skin_lesion': ['피부병변', '상처', 'lesion'],
            'healthy': ['정상', '건강', 'normal', 'healthy']
        }
        
    def load_annotations(self):
        """어노테이션 파일 로드"""
        print("📋 어노테이션 데이터 로드 중...")
        
        annotation_files = list(self.dataset_path.glob("**/annotations.json"))
        if not annotation_files:
            annotation_files = list(self.dataset_path.glob("**/*.json"))
            
        for ann_file in annotation_files:
            try:
                with open(ann_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.annotations.update(data)
                    print(f"✅ {ann_file.name}: {len(data)} 개 어노테이션 로드")
            except Exception as e:
                print(f"❌ {ann_file.name} 로드 실패: {e}")
        
        print(f"📊 총 어노테이션: {len(self.annotations)} 개")
    
    def analyze_dataset(self):
        """데이터셋 통계 분석"""
        print("\n🔍 데이터셋 분석 중...")
        
        disease_counts = Counter()
        image_sizes = []
        severity_counts = Counter()
        
        for img_id, annotation in self.annotations.items():
            # 질병 타입 분석
            disease_type = annotation.get('disease_type', 'unknown')
            disease_counts[disease_type] += 1
            
            # 심각도 분석
            severity = annotation.get('severity', 'unknown')
            severity_counts[severity] += 1
            
            # 이미지 크기 분석
            if 'width' in annotation and 'height' in annotation:
                image_sizes.append((annotation['width'], annotation['height']))
        
        # 결과 출력
        print("\n📊 질병 타입 분포:")
        for disease, count in disease_counts.most_common():
            print(f"  {disease}: {count} 개 ({count/len(self.annotations)*100:.1f}%)")
        
        print("\n📊 심각도 분포:")
        for severity, count in severity_counts.most_common():
            print(f"  {severity}: {count} 개")
        
        if image_sizes:
            avg_width = np.mean([size[0] for size in image_sizes])
            avg_height = np.mean([size[1] for size in image_sizes])
            print(f"\n📐 평균 이미지 크기: {avg_width:.0f} x {avg_height:.0f}")
        
        return disease_counts, severity_counts
    
    def extract_disease_regions(self, output_dir: str = "data/disease_regions"):
        """질병 부위별 이미지 추출"""
        print("\n✂️  질병 부위 이미지 추출 중...")
        
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # 질병 타입별 폴더 생성
        for disease_type in self.disease_mapping.keys():
            (output_path / disease_type).mkdir(exist_ok=True)
        
        extracted_count = 0
        
        for img_id, annotation in self.annotations.items():
            try:
                # 원본 이미지 찾기
                img_path = self._find_image_path(img_id)
                if not img_path:
                    continue
                
                # 이미지 로드
                image = cv2.imread(str(img_path))
                if image is None:
                    continue
                
                # 질병 부위 추출
                disease_type = self._map_disease_type(annotation.get('disease_type', 'unknown'))
                
                if 'bbox' in annotation:
                    # 바운딩 박스가 있는 경우
                    bbox = annotation['bbox']
                    x, y, w, h = bbox['x'], bbox['y'], bbox['width'], bbox['height']
                    
                    # ROI 추출
                    roi = image[y:y+h, x:x+w]
                    
                    # 저장
                    save_path = output_path / disease_type / f"{img_id}_{extracted_count}.jpg"
                    cv2.imwrite(str(save_path), roi)
                    extracted_count += 1
                else:
                    # 전체 이미지 사용
                    save_path = output_path / disease_type / f"{img_id}_{extracted_count}.jpg"
                    cv2.imwrite(str(save_path), image)
                    extracted_count += 1
                    
            except Exception as e:
                print(f"⚠️  {img_id} 처리 실패: {e}")
                continue
        
        print(f"✅ {extracted_count} 개 질병 부위 이미지 추출 완료")
    
    def _find_image_path(self, img_id: str) -> Path:
        """이미지 파일 경로 찾기"""
        possible_extensions = ['.jpg', '.jpeg', '.png', '.bmp']
        
        for root in [self.dataset_path / "Training", self.dataset_path / "Validation", self.dataset_path]:
            for ext in possible_extensions:
                img_path = root / f"{img_id}{ext}"
                if img_path.exists():
                    return img_path
                    
                # RGB 폴더 내 검색
                rgb_path = root / "RGB" / f"{img_id}{ext}"
                if rgb_path.exists():
                    return rgb_path
        
        return None
    
    def _map_disease_type(self, original_type: str) -> str:
        """원본 질병 타입을 우리 시스템 타입으로 매핑"""
        original_lower = original_type.lower()
        
        for our_type, original_types in self.disease_mapping.items():
            for orig in original_types:
                if orig.lower() in original_lower:
                    return our_type
        
        return 'unknown'
    
    def create_training_dataset(self, output_dir: str = "data/training_data"):
        """훈련용 데이터셋 생성"""
        print("\n🎯 훈련용 데이터셋 생성 중...")
        
        output_path = Path(output_dir)
        
        # train/val 폴더 생성
        for split in ['train', 'val']:
            for disease_type in self.disease_mapping.keys():
                (output_path / split / disease_type).mkdir(parents=True, exist_ok=True)
        
        # 데이터 분할 (80% train, 20% val)
        disease_images = defaultdict(list)
        
        for img_id, annotation in self.annotations.items():
            disease_type = self._map_disease_type(annotation.get('disease_type', 'unknown'))
            disease_images[disease_type].append((img_id, annotation))
        
        # 각 질병 타입별로 분할
        for disease_type, images in disease_images.items():
            np.random.shuffle(images)
            
            split_idx = int(len(images) * 0.8)
            train_images = images[:split_idx]
            val_images = images[split_idx:]
            
            # 훈련 데이터 복사
            for img_id, annotation in train_images:
                self._copy_image_to_split(img_id, disease_type, 'train', output_path)
            
            # 검증 데이터 복사  
            for img_id, annotation in val_images:
                self._copy_image_to_split(img_id, disease_type, 'val', output_path)
            
            print(f"  {disease_type}: train={len(train_images)}, val={len(val_images)}")
        
        print("✅ 훈련용 데이터셋 생성 완료")
    
    def _copy_image_to_split(self, img_id: str, disease_type: str, split: str, output_path: Path):
        """이미지를 train/val 폴더로 복사"""
        src_path = self._find_image_path(img_id)
        if src_path:
            dst_path = output_path / split / disease_type / f"{img_id}.jpg"
            
            # 이미지 로드 및 저장 (형식 통일)
            image = cv2.imread(str(src_path))
            if image is not None:
                cv2.imwrite(str(dst_path), image)


def main():
    print("🐟 넙치 질병 데이터셋 전처리기")
    print("=" * 50)
    
    # 데이터셋 경로 입력
    dataset_path = input("데이터셋 경로를 입력하세요 (data/aihub_flounder): ").strip()
    if not dataset_path:
        dataset_path = "data/aihub_flounder"
    
    if not Path(dataset_path).exists():
        print(f"❌ 경로가 존재하지 않습니다: {dataset_path}")
        print("💡 먼저 download_aihub_dataset.py로 데이터를 다운로드하세요.")
        return
    
    # 프로세서 초기화
    processor = FlounderDatasetProcessor(dataset_path)
    
    # 어노테이션 로드
    processor.load_annotations()
    
    if not processor.annotations:
        print("❌ 어노테이션 데이터를 찾을 수 없습니다.")
        return
    
    # 데이터셋 분석
    processor.analyze_dataset()
    
    # 사용자 선택
    print("\n📋 수행할 작업을 선택하세요:")
    print("1. 질병 부위 이미지 추출")
    print("2. 훈련용 데이터셋 생성")
    print("3. 모두 수행")
    
    choice = input("선택 (1-3): ").strip()
    
    if choice in ['1', '3']:
        processor.extract_disease_regions()
    
    if choice in ['2', '3']:
        processor.create_training_dataset()
    
    print("\n🎉 전처리 완료!")
    print("💡 다음 단계: 질병 분류 모델 훈련")


if __name__ == "__main__":
    main()