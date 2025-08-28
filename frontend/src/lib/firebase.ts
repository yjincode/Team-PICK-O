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

// Firebase 설정 (직접 하드코딩)
const firebaseConfig: FirebaseConfig = {
  apiKey: "AIzaSyChBnuJCAKe-TxcvGT0eCV5AUNA_4btZPo",
  authDomain: "pick-o-main.firebaseapp.com",
  projectId: "pick-o-main",
  storageBucket: "pick-o-main.firebasestorage.app",
  messagingSenderId: "237171811665",
  appId: "1:237171811665:web:445df31d49b637afb69f70",
  measurementId: "G-0MZ40REVBH"
};

// Firebase 초기화
const app: FirebaseApp = initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);

// Analytics 초기화 (개발 환경에서는 선택적)
let analytics: Analytics;
try {
  analytics = getAnalytics(app);
} catch (error) {
  console.warn('Analytics 초기화 실패 (개발 환경에서는 정상):', error);
}

// reCAPTCHA verifier 설정
export const setupRecaptcha = (containerId: string): RecaptchaVerifier => {  
  // 기존 verifier가 있다면 정리
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch (error) {
      console.warn('기존 reCAPTCHA verifier 정리 중 오류:', error);
    }
    window.recaptchaVerifier = undefined;
  }
  
  // DOM 요소 확인
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`reCAPTCHA 컨테이너를 찾을 수 없습니다: ${containerId}`);
  }
  
  // 새로운 RecaptchaVerifier 생성 (테스트 환경에서 더 관대한 설정)
  const recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    'size': 'invisible',  // invisible로 변경하여 테스트 번호에서 덜 방해받도록
    'callback': (response: string) => {
      console.log('✅ reCAPTCHA 검증 완료:', response ? '성공' : '자동 처리됨');
    },
    'expired-callback': () => {
      console.log('❌ reCAPTCHA 만료 - 재설정 시도');
      // 테스트 환경에서는 자동으로 재시도
      setTimeout(() => {
        if (window.recaptchaVerifier) {
          try {
            window.recaptchaVerifier.clear();
            window.recaptchaVerifier = undefined;
          } catch (e) {
            console.warn('reCAPTCHA 정리 실패:', e);
          }
        }
      }, 100);
    },
    'error-callback': (error: any) => {
      console.warn('⚠️ reCAPTCHA 오류 (테스트 환경에서는 무시될 수 있음):', error);
    }
  });
  
  // window 객체에 저장
  window.recaptchaVerifier = recaptchaVerifier;
  
  return recaptchaVerifier;
};

// 테스트 전화번호 확인 함수
const isTestPhoneNumber = (phoneNumber: string): boolean => {
  // Firebase Console에서 설정한 테스트 전화번호들
  const testNumbers = [
    '+8201012341234',  // Firebase에서 설정한 테스트 번호
    '+8201089358654',  // 실제 사용자 전화번호 (테스트용)
    '+821089358654',   // 82로 시작하는 형식
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
    // reCAPTCHA verifier 설정
    const recaptchaVerifier = setupRecaptcha('recaptcha-container');
    
    const confirmationResult = await signInWithPhoneNumber(
      auth,
      normalizedPhone,
      recaptchaVerifier
    );
    
    // window 객체에 저장
    window.confirmationResult = confirmationResult;
    
    return {
      success: true,
      message: '인증 코드가 전송되었습니다.',
      confirmationResult: confirmationResult
    };
    
  } catch (error: any) {
    console.error('❌ 전화번호 인증 오류:', error);
    
    const errorMessage = getErrorMessage(error.code);
    
    return {
      success: false,
      error: errorMessage || '인증 코드 전송에 실패했습니다.'
    };
  }
};

// 전화번호 정규화 함수
const normalizePhoneNumber = (phoneNumber: string): string | null => {
  // 하이픈 제거
  let cleaned = phoneNumber.replace(/[-]/g, '');
  
  // 한국 전화번호 형식 처리
  if (cleaned.startsWith('0')) {
    cleaned = '+82' + cleaned.substring(1);
  } else if (cleaned.startsWith('82')) {
    cleaned = '+' + cleaned;
  } else if (!cleaned.startsWith('+')) {
    cleaned = '+82' + cleaned;
  }
  
  // 유효성 검사 (한국 전화번호: +82 10-1234-5678)
  const phoneRegex = /^\+82[0-9]{9,10}$/;
  if (!phoneRegex.test(cleaned)) {
    return null;
  }
  
  return cleaned;
};

// 인증 코드 확인
export const verifyPhoneCode = async (confirmationResult: ConfirmationResult, code: string): Promise<AuthResult> => {
  try {    
    if (!confirmationResult) {
      console.error('❌ confirmationResult가 없습니다. 인증 세션이 만료되었습니다.');
      return {
        success: false,
        error: '인증 세션이 만료되었습니다. 다시 시도해주세요.'
      };
    }    
    // 인증 코드 확인
    const result: UserCredential = await confirmationResult.confirm(code);
    
    console.log('✅ Firebase 인증 성공:', {
      user: !!result.user,
      uid: result.user?.uid,
      phoneNumber: result.user?.phoneNumber
    });
    
    if (result.user) {      
      // ID 토큰 가져오기
      const idToken = await result.user.getIdToken();
      
      console.log('✅ ID 토큰 획득 완료:', {
        tokenLength: idToken?.length || 0,
        tokenPreview: idToken ? `${idToken.substring(0, 20)}...` : '없음'
      });
      
      return {
        success: true,
        message: '인증이 완료되었습니다.',
        user: result.user,
        idToken: idToken,
        uid: result.user.uid,
        phoneNumber: result.user.phoneNumber || ''
      };
    } else {
      console.error('❌ Firebase 인증은 성공했지만 user 객체가 없습니다.');
      return {
        success: false,
        error: '인증에 실패했습니다.'
      };
    }
    
  } catch (error: any) {
    console.error('❌ 인증 코드 확인 오류:', error);
    console.error('❌ 에러 코드:', error.code);
    console.error('❌ 에러 메시지:', error.message);
    
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
    
    // window 객체 정리
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (error) {
        console.warn('reCAPTCHA verifier 정리 중 오류:', error);
      }
      window.recaptchaVerifier = undefined;
    }
    
    window.confirmationResult = undefined;    
    return {
      success: true
    };
    
  } catch (error: any) {
    console.error('❌ 로그아웃 오류:', error);
    
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

export { auth, app, analytics };