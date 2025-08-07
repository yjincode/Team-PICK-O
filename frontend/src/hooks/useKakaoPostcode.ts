import { useEffect, useState } from 'react';
import { KakaoAddress, KakaoPostcodeOptions } from '../types/kakao';

interface UseKakaoPostcodeResult {
  isScriptLoaded: boolean;
  openPostcode: () => void;
  selectedAddress: string;
  zonecode: string;
  clearAddress: () => void;
}

interface UseKakaoPostcodeProps {
  onComplete?: (data: KakaoAddress) => void;
  onClose?: () => void;
  autoClose?: boolean;
}

export const useKakaoPostcode = ({
  onComplete,
  onClose,
  autoClose = true,
}: UseKakaoPostcodeProps = {}): UseKakaoPostcodeResult => {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [zonecode, setZonecode] = useState('');

  useEffect(() => {
    // 이미 스크립트가 로드되어 있는지 확인
    if (window.daum?.Postcode) {
      setIsScriptLoaded(true);
      return;
    }

    // 이미 스크립트 태그가 있는지 확인..
    if (document.getElementById('kakao-postcode-script')) {
      return;
    }

    // 스크립트 동적 로드 
    const script = document.createElement('script');
    script.id = 'kakao-postcode-script';
    script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    
    script.onload = () => {
      setIsScriptLoaded(true);
    };
    
    script.onerror = () => {
      console.error('카카오 우편번호 서비스 스크립트 로드 실패');
    };
    
    document.head.appendChild(script);

    return () => {
      // 컴포넌트 언마운트 시 정리 (선택적)
      const existingScript = document.getElementById('kakao-postcode-script');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  const openPostcode = () => {
    if (!isScriptLoaded || !window.daum?.Postcode) {
      alert('주소검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    const postcodeOptions: KakaoPostcodeOptions = {
      oncomplete: (data: KakaoAddress) => {
        // 선택된 주소 정보 설정
        const fullAddress = data.roadAddress || data.jibunAddress;
        setSelectedAddress(fullAddress);
        setZonecode(data.zonecode);
        
        // 콜백 함수 호출
        if (onComplete) {
          onComplete(data);
        }
        
        console.log('선택된 주소:', {
          zonecode: data.zonecode,
          address: fullAddress,
          roadAddress: data.roadAddress,
          jibunAddress: data.jibunAddress,
        });
      },
      onclose: (state: string) => {
        console.log('주소검색 창 닫힘:', state);
        if (onClose) {
          onClose();
        }
      },
      width: '100%',
      height: '100%',
      animation: false,
      focusInput: true,
      focusContent: true,
    };

    new window.daum.Postcode(postcodeOptions).open();
  };

  const clearAddress = () => {
    setSelectedAddress('');
    setZonecode('');
  };

  return {
    isScriptLoaded,
    openPostcode,
    selectedAddress,
    zonecode,
    clearAddress,
  };
};