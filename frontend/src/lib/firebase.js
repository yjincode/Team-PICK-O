// Firebase 설정 및 인증 관련 함수들
import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyChBnuJCAKe-TxcvGT0eCV5AUNA_4btZPo",
  authDomain: "pick-o-main.firebaseapp.com",
  projectId: "pick-o-main",
  storageBucket: "pick-o-main.firebasestorage.app",
  messagingSenderId: "237171811665",
  appId: "1:237171811665:web:445df31d49b637afb69f70",
  measurementId: "G-0MZ40REVBH"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const analytics = getAnalytics(app);

// reCAPTCHA verifier 설정
export const setupRecaptcha = (containerId) => {
  if (window.recaptchaVerifier) {
    window.recaptchaVerifier.clear();
  }
  
  window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    'size': 'invisible',
    'callback': (response) => {
      console.log('reCAPTCHA 검증 완료');
    },
    'expired-callback': () => {
      console.log('reCAPTCHA 만료');
      window.recaptchaVerifier.clear();
    }
  });
};

// 전화번호 인증 코드 전송
export const sendPhoneVerification = async (phoneNumber) => {
  try {
    if (!window.recaptchaVerifier) {
      throw new Error('reCAPTCHA verifier가 설정되지 않았습니다.');
    }
    
    // 한국 전화번호 형식으로 변환 (+82)
    const formattedNumber = phoneNumber.startsWith('+82') 
      ? phoneNumber 
      : phoneNumber.replace(/^0/, '+82');
    
    const confirmationResult = await signInWithPhoneNumber(auth, formattedNumber, window.recaptchaVerifier);
    window.confirmationResult = confirmationResult;
    
    return {
      success: true,
      message: '인증번호가 전송되었습니다.',
      confirmationResult
    };
  } catch (error) {
    console.error('전화번호 인증 오류:', error);
    
    // reCAPTCHA 초기화
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
    }
    
    return {
      success: false,
      message: getErrorMessage(error.code),
      error: error.message
    };
  }
};

// 인증번호 확인
export const verifyPhoneCode = async (code) => {
  try {
    const confirmationResult = window.confirmationResult;
    if (!confirmationResult) {
      throw new Error('인증 세션을 찾을 수 없습니다. 다시 인증번호를 요청해주세요.');
    }
    
    const result = await confirmationResult.confirm(code);
    const user = result.user;
    
    // Firebase ID 토큰 획득
    const idToken = await user.getIdToken();
    
    return {
      success: true,
      user: user,
      idToken: idToken,
      uid: user.uid,
      phoneNumber: user.phoneNumber
    };
  } catch (error) {
    console.error('인증번호 확인 오류:', error);
    return {
      success: false,
      message: getErrorMessage(error.code),
      error: error.message
    };
  }
};

// 현재 사용자 정보 가져오기
export const getCurrentUser = () => {
  return auth.currentUser;
};

// 사용자 상태 변화 감지
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// 로그아웃
export const signOut = async () => {
  try {
    await auth.signOut();
    
    // reCAPTCHA 정리
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
    }
    if (window.confirmationResult) {
      window.confirmationResult = null;
    }
    
    return { success: true };
  } catch (error) {
    console.error('로그아웃 오류:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

// 에러 메시지 한글화
const getErrorMessage = (errorCode) => {
  switch (errorCode) {
    case 'auth/invalid-phone-number':
      return '유효하지 않은 전화번호입니다.';
    case 'auth/too-many-requests':
      return '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.';
    case 'auth/invalid-verification-code':
      return '인증번호가 올바르지 않습니다.';
    case 'auth/code-expired':
      return '인증번호가 만료되었습니다. 다시 요청해주세요.';
    case 'auth/session-expired':
      return '세션이 만료되었습니다. 다시 시도해주세요.';
    default:
      return '오류가 발생했습니다. 다시 시도해주세요.';
  }
};

export { auth, app, analytics };