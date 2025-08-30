#!/usr/bin/env python3
"""
프론트엔드 배포용 콘솔 로그 제거 스크립트
모든 console.log, console.warn, console.error, console.info, console.debug를 제거합니다.
"""

import os
import re
import glob

def remove_console_logs_from_file(file_path):
    """파일에서 콘솔 로그 제거"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # 콘솔 로그 패턴들
        patterns = [
            # 단일 라인 콘솔 로그 (세미콜론으로 끝나는)
            r'^\s*console\.(log|warn|error|info|debug)\([^;]*\);\s*$',
            # 단일 라인 콘솔 로그 (세미콜론 없이)
            r'^\s*console\.(log|warn|error|info|debug)\([^)]*\)\s*$',
            # 멀티라인 콘솔 로그 (괄호가 다음 줄에서 닫히는 경우)
            r'^\s*console\.(log|warn|error|info|debug)\([^)]*\n[^)]*\);\s*$',
        ]
        
        # 각 패턴에 대해 제거
        for pattern in patterns:
            content = re.sub(pattern, '', content, flags=re.MULTILINE)
        
        # 더 복잡한 멀티라인 콘솔 로그 처리
        # console.log( 부터 시작해서 닫는 괄호와 세미콜론까지
        console_pattern = r'^\s*console\.(log|warn|error|info|debug)\s*\([^)]*(?:\n[^)]*)*\)\s*;?\s*$'
        content = re.sub(console_pattern, '', content, flags=re.MULTILINE | re.DOTALL)
        
        # 빈 줄이 연속으로 3개 이상인 경우 2개로 줄이기
        content = re.sub(r'\n\s*\n\s*\n+', '\n\n', content)
        
        # 변경사항이 있으면 파일 업데이트
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        
        return False
        
    except Exception as e:
        print(f"❌ 파일 처리 오류 ({file_path}): {e}")
        return False

def remove_console_logs_advanced(file_path):
    """고급 콘솔 로그 제거 (라인별 처리)"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        new_lines = []
        i = 0
        removed_count = 0
        
        while i < len(lines):
            line = lines[i]
            
            # 콘솔 로그가 포함된 라인 확인
            if re.search(r'console\.(log|warn|error|info|debug)', line):
                # 단일 라인 콘솔 로그인지 확인
                if line.strip().startswith('console.') and (line.strip().endswith(';') or line.strip().endswith(')')):
                    # 단일 라인 콘솔 로그 제거
                    removed_count += 1
                    i += 1
                    continue
                
                # 멀티라인 콘솔 로그 시작인지 확인
                elif line.strip().startswith('console.') and '(' in line and ')' not in line:
                    # 멀티라인 콘솔 로그 찾기
                    j = i + 1
                    while j < len(lines) and ')' not in lines[j]:
                        j += 1
                    
                    if j < len(lines) and ')' in lines[j]:
                        # 멀티라인 콘솔 로그 전체 제거
                        removed_count += j - i + 1
                        i = j + 1
                        continue
            
            new_lines.append(line)
            i += 1
        
        if removed_count > 0:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.writelines(new_lines)
            return removed_count
        
        return 0
        
    except Exception as e:
        print(f"❌ 파일 처리 오류 ({file_path}): {e}")
        return 0

def main():
    print("🧹 프론트엔드 배포용 콘솔 로그 제거 시작")
    print("=" * 60)
    
    # 프론트엔드 src 디렉토리에서 TypeScript/JavaScript 파일 찾기
    frontend_src = "/Users/jeong-yeongjin/Desktop/exProject/Team-PICK-O/frontend/src"
    
    if not os.path.exists(frontend_src):
        print(f"❌ 프론트엔드 src 디렉토리를 찾을 수 없습니다: {frontend_src}")
        return
    
    # 처리할 파일 패턴
    file_patterns = [
        "**/*.ts",
        "**/*.tsx", 
        "**/*.js",
        "**/*.jsx"
    ]
    
    total_files = 0
    modified_files = 0
    total_removed = 0
    
    for pattern in file_patterns:
        files = glob.glob(os.path.join(frontend_src, pattern), recursive=True)
        
        for file_path in files:
            total_files += 1
            removed_count = remove_console_logs_advanced(file_path)
            
            if removed_count > 0:
                modified_files += 1
                total_removed += removed_count
                rel_path = os.path.relpath(file_path, frontend_src)
                print(f"✅ {rel_path}: {removed_count}개 콘솔 로그 제거")
    
    print("=" * 60)
    print(f"📊 처리 결과:")
    print(f"   - 전체 파일: {total_files}개")
    print(f"   - 수정된 파일: {modified_files}개") 
    print(f"   - 제거된 콘솔 로그: {total_removed}개")
    print("🎉 콘솔 로그 제거 완료!")

if __name__ == "__main__":
    main()
