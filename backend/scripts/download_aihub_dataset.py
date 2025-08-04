#!/usr/bin/env python3
"""
AI Hub 넙치 질병 데이터셋 다운로드 스크립트
"""

import os
import requests
import zipfile
from pathlib import Path
import json
from tqdm import tqdm

class AIHubDatasetDownloader:
    def __init__(self, api_key: str, download_dir: str = "data/aihub_flounder"):
        self.api_key = api_key
        self.download_dir = Path(download_dir)
        self.download_dir.mkdir(parents=True, exist_ok=True)
        
        # AI Hub API 설정
        self.base_url = "https://api.aihub.or.kr"
        self.dataset_id = "71345"  # 넙치 질병 데이터셋 ID
        
    def download_dataset(self):
        """데이터셋 다운로드"""
        print("🐟 AI Hub 넙치 질병 데이터셋 다운로드 시작...")
        
        # API 인증
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        try:
            # 데이터셋 정보 조회
            dataset_info = self._get_dataset_info(headers)
            print(f"📋 데이터셋 정보: {dataset_info.get('name', 'Unknown')}")
            
            # 파일 목록 조회
            file_list = self._get_file_list(headers)
            print(f"📁 총 {len(file_list)} 개 파일 발견")
            
            # 파일 다운로드
            for file_info in tqdm(file_list, desc="다운로드 진행"):
                self._download_file(file_info, headers)
                
            print("✅ 다운로드 완료!")
            
        except Exception as e:
            print(f"❌ 다운로드 실패: {e}")
            print("💡 수동 다운로드를 시도해주세요.")
            self._manual_download_guide()
    
    def _get_dataset_info(self, headers):
        """데이터셋 정보 조회"""
        url = f"{self.base_url}/datasets/{self.dataset_id}"
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()
    
    def _get_file_list(self, headers):
        """파일 목록 조회"""
        url = f"{self.base_url}/datasets/{self.dataset_id}/files"
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()
    
    def _download_file(self, file_info, headers):
        """개별 파일 다운로드"""
        file_id = file_info['id']
        filename = file_info['name']
        
        url = f"{self.base_url}/datasets/{self.dataset_id}/files/{file_id}/download"
        
        response = requests.get(url, headers=headers, stream=True)
        response.raise_for_status()
        
        file_path = self.download_dir / filename
        
        with open(file_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=1024*1024):  # 1MB chunks
                if chunk:
                    f.write(chunk)
    
    def _manual_download_guide(self):
        """수동 다운로드 가이드"""
        print("\n📖 수동 다운로드 방법:")
        print("1. https://www.aihub.or.kr 로그인")
        print("2. 넙치 질병 데이터셋 페이지 접속")
        print("3. '데이터 다운로드' 버튼 클릭")
        print("4. 다운로드한 파일을 data/aihub_flounder/ 폴더에 압축 해제")
        print("\n📁 예상 폴더 구조:")
        print("data/aihub_flounder/")
        print("├── Training/")
        print("│   ├── RGB/")
        print("│   └── Hyperspectral/")
        print("├── Validation/")
        print("└── annotations.json")
    
    def extract_and_organize(self):
        """다운로드한 압축 파일 추출 및 정리"""
        print("📦 압축 파일 추출 중...")
        
        zip_files = list(self.download_dir.glob("*.zip"))
        
        for zip_file in zip_files:
            print(f"📂 {zip_file.name} 추출 중...")
            
            with zipfile.ZipFile(zip_file, 'r') as zip_ref:
                zip_ref.extractall(self.download_dir)
            
            # 압축 파일 삭제 (선택사항)
            # zip_file.unlink()
        
        print("✅ 추출 완료!")
        self._analyze_dataset_structure()
    
    def _analyze_dataset_structure(self):
        """데이터셋 구조 분석"""
        print("\n🔍 데이터셋 구조 분석:")
        
        total_images = 0
        disease_types = set()
        
        for root, dirs, files in os.walk(self.download_dir):
            image_files = [f for f in files if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
            if image_files:
                print(f"📁 {root}: {len(image_files)} 이미지")
                total_images += len(image_files)
        
        print(f"\n📊 총 이미지 수: {total_images}")
        
        # 어노테이션 파일 분석
        annotation_files = list(self.download_dir.glob("**/annotations.json"))
        if annotation_files:
            with open(annotation_files[0], 'r', encoding='utf-8') as f:
                annotations = json.load(f)
                print(f"📋 어노테이션 데이터: {len(annotations)} 개")


def main():
    # 사용법
    print("🚀 AI Hub 넙치 데이터셋 다운로더")
    print("=" * 50)
    
    # API 키 입력 (AI Hub에서 발급)
    api_key = input("AI Hub API 키를 입력하세요 (없으면 Enter): ").strip()
    
    downloader = AIHubDatasetDownloader(api_key)
    
    if api_key:
        # API를 통한 자동 다운로드
        downloader.download_dataset()
    else:
        # 수동 다운로드 가이드
        downloader._manual_download_guide()
    
    # 압축 해제 여부 확인
    if input("\n압축 파일을 추출하시겠습니까? (y/n): ").lower() == 'y':
        downloader.extract_and_organize()


if __name__ == "__main__":
    main()