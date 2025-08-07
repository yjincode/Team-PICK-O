/**
 * 음성 파일 처리 유틸리티
 * 음성 파일을 업로드하고 텍스트로 변환하는 기능을 제공합니다
 */

// Web Speech API 타입 정의
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export interface AudioFileInfo {
  file: File;
  name: string;
  size: number;
  type: string;
  duration?: number;
}

/**
 * 지원하는 오디오 파일 형식
 */
export const SUPPORTED_AUDIO_FORMATS = [
  'audio/wav',
  'audio/mp3',
  'audio/mpeg',
  'audio/ogg',
  'audio/webm',
  'audio/m4a',
  'audio/aac',
  'audio/x-m4a'  // 카카오톡 음성 파일 형식 추가
];

/**
 * 파일이 지원되는 오디오 형식인지 확인
 */
export function isSupportedAudioFormat(file: File): boolean {
  return SUPPORTED_AUDIO_FORMATS.includes(file.type);
}

/**
 * 파일 크기를 사람이 읽기 쉬운 형태로 변환
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 오디오 파일의 재생 시간을 추출
 */
export function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    
    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    });
    
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      reject(new Error('오디오 파일을 읽을 수 없습니다.'));
    });
    
    audio.src = url;
  });
}

/**
 * 음성 파일을 텍스트로 변환 (Mock 구현)
 * TODO: AI 담당자가 백엔드에서 실제 Whisper API 구현 후, 
 * 프론트엔드에서 백엔드 API 호출로 변경 예정
 */
export async function convertAudioToText(file: File): Promise<string> {
  // TODO: AI 담당자가 백엔드 API 구현 후 아래 코드로 교체
  // try {
  //   const formData = new FormData();
  //   formData.append('audio_file', file);
  //   
  //   const response = await fetch('/api/v1/orders/upload/', {
  //     method: 'POST',
  //     body: formData
  //   });
  //   
  //   if (!response.ok) {
  //     throw new Error(`API 호출 실패: ${response.status}`);
  //   }
  //   
  //   const result = await response.json();
  //   return result.transcribed_text;
  // } catch (error) {
  //   console.error('음성 인식 API 오류:', error);
  //   throw error;
  // }
  
  // 현재는 Mock 구현으로 파일명을 기반으로 샘플 텍스트를 반환
  return new Promise((resolve) => {
    setTimeout(() => {
      const fileName = file.name.toLowerCase();
      
      // 파일명에 따라 다른 샘플 텍스트 반환
      if (fileName.includes('도미') || fileName.includes('domi')) {
        resolve('안녕하세요, 이번에 도미 10kg이랑 방어 5마리 주문할게요. 납품은 8월 5일 오전 중으로 부탁드립니다.');
      } else if (fileName.includes('고등어') || fileName.includes('mackerel')) {
        resolve('고등어 50박스, 갈치 30박스 주문해주세요. 급한 주문입니다.');
      } else if (fileName.includes('오징어') || fileName.includes('squid')) {
        resolve('오징어 25박스 주문하고, 명태도 15박스 추가로 부탁드립니다. 배송은 다음 주 월요일까지요.');
      } else {
        resolve('안녕하세요, 이번에 도미 10kg이랑 방어 5마리 주문할게요. 납품은 8월 5일 오전 중으로 부탁드립니다.');
      }
    }, 2000); // 2초 후 결과 반환 (실제 음성 인식 시간 시뮬레이션)
  });
}

/**
 * Web Speech API를 사용한 실시간 음성 인식 (브라우저 지원 시)
 */
export function startRealTimeSpeechRecognition(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      reject(new Error('이 브라우저는 음성 인식을 지원하지 않습니다.'));
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'ko-KR';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    let finalTranscript = '';
    
    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
    };
    
    recognition.onend = () => {
      resolve(finalTranscript);
    };
    
    recognition.onerror = (event: any) => {
      reject(new Error(`음성 인식 오류: ${event.error}`));
    };
    
    recognition.start();
  });
} 