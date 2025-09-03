// Firebase 설정 및 인증 관련 함수들
import { initializeApp, FirebaseApp } from "firebase/app";
import { 
  getAuth, 
  Auth, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  onAuthStateChanged, 
  ConfirmationResult,
  User,
  UserCredential,
  Unsubscribe
} from "firebase/auth";
import { getAnalytics, Analytics } from "firebase/analytics";

// Firebase 설정 타입
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
}

// 인증 결과 타입
interface AuthResult {
  success: boolean;
  message?: string;
  error?: string;
  user?: User;
  idToken?: string;
  uid?: string;
  phoneNumber?: string;
  confirmationResult?: ConfirmationResult;
}

// 로그아웃 결과 타입
interface SignOutResult {
  success: boolean;
  error?: string;
}

// Window 객체 확장
declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

// Firebase 설정 (새 웹앱)
const firebaseConfig: FirebaseConfig = {
  apiKey: "AIzaSyDFHCiz67HaARszNj3WNdRs7Bqyr0cmsR0",
  authDomain: "pick-o-main.firebaseapp.com",
  projectId: "pick-o-main",
  storageBucket: "pick-o-main.firebasestorage.app",
  messagingSenderId: "237171811665",
  appId: "1:237171811665:web:13f50a4865b4ea74b69f70",
  measurementId: "G-8F8GCQ8EV2"
};

// Firebase 초기화
const app: FirebaseApp = initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);

// reCAPTCHA 설정은 Firebase가 자동 처리
// 언어 설정
auth.languageCode = 'ko';

// Analytics 초기화 (개발 환경에서는 선택적)
let analytics: Analytics;
try {
  analytics = getAnalytics(app);
} catch (error) {
}
// reCAPTCHA 설정
const setupRecaptcha = (): void => {
  try {
    // 기존 reCAPTCHA 정리
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (error) {
        console.log('기존 reCAPTCHA 정리 중 오류:', error);
      }
      window.recaptchaVerifier = undefined;
    }
    
    window.recaptchaVerifier = new RecaptchaVerifier(
      auth,
      'recaptcha-container',
      {
        size: 'invisible',
        callback: (response: string) => {
          console.log('reCAPTCHA solved:', response);
        },
        'expired-callback': () => {
          console.warn('reCAPTCHA expired, please retry.');
        }
      }
    );
    
    console.log('reCAPTCHA 설정 완료');
  } catch (error) {
    console.error('reCAPTCHA 설정 실패:', error);
    throw error;
  }
};

// 테스트 전화번호 확인 함수
const isTestPhoneNumber = (phoneNumber: string): boolean => {
  // Firebase Console에서 설정한 테스트 전화번호들
  const testNumbers = [
    '+8201012341234',  // Firebase에서 설정한 테스트 번호만 유지
  ];
  
  return testNumbers.includes(phoneNumber);
};

// 전화번호 인증 코드 전송
export const sendPhoneVerification = async (phoneNumber: string): Promise<AuthResult> => {
  try {    
    // 전화번호 정규화
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      return {
        success: false,
        error: '유효하지 않은 전화번호 형식입니다.'
      };
    }
      
    // 테스트 전화번호인지 확인
    const isTestNumber = isTestPhoneNumber(normalizedPhone);    
    
    console.log('📱 Firebase 전화 인증 시도:', {
      original: phoneNumber,
      normalized: normalizedPhone,
      isTest: isTestNumber
    });
    
    // 공식 문서 방식: RecaptchaVerifier 생성
    const appVerifier = new RecaptchaVerifier(
      auth,
      'recaptcha-container',
      {
        size: 'invisible',
        callback: (response: string) => {
          console.log('reCAPTCHA solved');
        }
      }
    );
    
    const confirmationResult = await signInWithPhoneNumber(
      auth,
      normalizedPhone,
      appVerifier
    );
    
    // 전역 저장
    window.recaptchaVerifier = appVerifier;
    
    // window 객체에 저장
    window.confirmationResult = confirmationResult;
    
    console.log('SMS 전송 성공!');
    
    return {
      success: true,
      message: '인증 코드가 전송되었습니다.',
      confirmationResult: confirmationResult
    };
    
  } catch (error: any) {
    console.error('Firebase SMS 전송 실패:', error);
    
    const errorMessage = getErrorMessage(error.code);
    
    return {
      success: false,
      error: errorMessage || '인증 코드 전송에 실패했습니다.'
    };
  }
};

// 전화번호 정규화 함수
const normalizePhoneNumber = (phoneNumber: string): string | null => {
  // 모든 공백, 하이픈, 괄호 제거
  let cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  // 한국 전화번호 형식 처리 (010으로 시작하는 경우)
  if (cleaned.startsWith('010')) {
    // 010 → +8210으로 변환 (앞의 0만 제거)
    cleaned = '+82' + cleaned.substring(1); // 01089358654 → +8210089358654
  } else if (cleaned.startsWith('8210') && cleaned.length >= 12) {
    cleaned = '+' + cleaned;
  } else if (cleaned.startsWith('+8210') && cleaned.length >= 13) {
    return cleaned; // 이미 올바른 형식
  } else {
    console.error('지원하지 않는 전화번호 형식:', phoneNumber);
    return null;
  }
  
  // 한국 휴대폰 번호 유효성 검사 (+82 10-XXXX-XXXX)
  const phoneRegex = /^\+8210[0-9]{8}$/;
  if (!phoneRegex.test(cleaned)) {
    console.error('전화번호 형식이 올바르지 않습니다:', cleaned);
    return null;
  }
  
  console.log('정규화된 전화번호:', cleaned);
  return cleaned;
};

// 인증 코드 확인
export const verifyPhoneCode = async (confirmationResult: ConfirmationResult, code: string): Promise<AuthResult> => {
  try {    
    if (!confirmationResult) {
      return {
        success: false,
        error: '인증 세션이 만료되었습니다. 다시 시도해주세요.'
      };
    }    
    // 인증 코드 확인
    const result: UserCredential = await confirmationResult.confirm(code);
    
    
    if (result.user) {      
      // ID 토큰 가져오기
      const idToken = await result.user.getIdToken();
      
      return {
        success: true,
        message: '인증이 완료되었습니다.',
        user: result.user,
        idToken: idToken,
        uid: result.user.uid,
        phoneNumber: result.user.phoneNumber || ''
      };
    } else {
      return {
        success: false,
        error: '인증에 실패했습니다.'
      };
    }
    
  } catch (error: any) {
    
    const errorMessage = getErrorMessage(error.code);
    
    return {
      success: false,
      error: errorMessage || '인증 코드가 올바르지 않습니다.'
    };
  }
};

// 현재 사용자 가져오기
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// 인증 상태 변경 감지
export const onAuthStateChange = (callback: (user: User | null) => void): Unsubscribe => {
  return onAuthStateChanged(auth, callback);
};

// 로그아웃
export const signOut = async (): Promise<SignOutResult> => {
  try {
    await auth.signOut();
    
    // reCAPTCHA 정리
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (error) {
        console.log('reCAPTCHA 정리 중 오류:', error);
      }
      window.recaptchaVerifier = undefined;
    }
    
    window.confirmationResult = undefined;    
    return {
      success: true
    };
    
  } catch (error: any) {
    
    return {
      success: false,
      error: '로그아웃에 실패했습니다.'
    };
  }
};

// Firebase 에러 메시지 변환
const getErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/invalid-phone-number':
      return '유효하지 않은 전화번호 형식입니다.';
    case 'auth/invalid-verification-code':
      return '인증 코드가 올바르지 않습니다.';
    case 'auth/invalid-verification-id':
      return '인증 세션이 만료되었습니다. 다시 시도해주세요.';
    case 'auth/quota-exceeded':
      return '인증 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
    case 'auth/too-many-requests':
      return '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.';
    case 'auth/invalid-app-credential':
      return 'Firebase 앱 설정에 문제가 있습니다. 관리자에게 문의하거나 잠시 후 다시 시도해주세요.';
    case 'auth/network-request-failed':
      return '네트워크 연결을 확인해주세요.';
    default:
      return '인증 중 오류가 발생했습니다. 다시 시도해주세요.';
  }
};

export { auth, app, analytics, setupRecaptcha };