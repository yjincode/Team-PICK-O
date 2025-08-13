// 카카오 주소검색 API 타입 정의

export interface KakaoAddress {
  zonecode: string;           // 우편번호
  address: string;            // 기본 주소 (지번)
  addressEnglish: string;     // 기본 주소 영문
  addressType: string;        // 주소 타입 (R: 도로명, J: 지번)
  bcode: string;             // 법정동/법정리 코드
  bname: string;             // 법정동/법정리명
  bnameEnglish: string;      // 법정동/법정리명 영문
  bname1: string;            // 법정리의 읍/면 이름
  bname1English: string;     // 법정리의 읍/면 이름 영문
  bname2: string;            // 법정동/법정리명
  bname2English: string;     // 법정동/법정리명 영문
  sido: string;              // 도/시 이름
  sidoEnglish: string;       // 도/시 이름 영문
  sigungu: string;           // 시/군/구 이름
  sigunguEnglish: string;    // 시/군/구 이름 영문
  sigunguCode: string;       // 시/군/구 코드
  roadAddress: string;       // 도로명 주소
  roadAddressEnglish: string; // 도로명 주소 영문
  jibunAddress: string;      // 지번 주소
  jibunAddressEnglish: string; // 지번 주소 영문
  autoRoadAddress: string;   // 도로명 주소 (참고용)
  autoJibunAddress: string;  // 지번 주소 (참고용)
  buildingCode: string;      // 건물관리번호
  buildingName: string;      // 건물명
  apartment: string;         // 공동주택 여부 (Y/N)
}

export interface KakaoPostcodeOptions {
  oncomplete: (data: KakaoAddress) => void;
  onclose?: (state: string) => void;
  onresize?: (size: { width: number; height: number }) => void;
  onsearch?: (data: { count: number }) => void;
  width?: string | number;
  height?: string | number;
  animation?: boolean;
  focusInput?: boolean;
  focusContent?: boolean;
  autoMapping?: boolean;
  shorthand?: boolean;
  pleaseReadGuide?: number;
  pleaseReadGuideTimer?: number;
  maxSuggestItems?: number;
  showMoreHName?: boolean;
  hideMapBtn?: boolean;
  hideEngBtn?: boolean;
  alwaysShowEngAddr?: boolean;
  zonecodeOnly?: boolean;
  theme?: {
    bgColor?: string;
    searchBgColor?: string;
    contentBgColor?: string;
    pageBgColor?: string;
    textColor?: string;
    queryTextColor?: string;
    postcodeTextColor?: string;
    emphTextColor?: string;
    outlineColor?: string;
  };
}

// 전역 Daum 객체 타입 정의
declare global {
  interface Window {
    daum?: {
      Postcode: new (options: KakaoPostcodeOptions) => {
        open: () => void;
        embed: (element: HTMLElement) => void;
      };
    };
  }
}

export {};