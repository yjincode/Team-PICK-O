
"use client"

import React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import { User } from "firebase/auth"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Card, CardContent } from "../../components/ui/card"
import { SharkMascot } from "../../components/common/SharkMascot"
import { setupRecaptcha, sendPhoneVerification, verifyPhoneCode, onAuthStateChange } from "../../lib/firebase.ts"
import { authApi } from "../../lib/api"
import { tokenManager } from "../../lib/utils"
import { useKakaoPostcode } from "../../hooks/useKakaoPostcode"
import { KakaoAddress } from "../../types/kakao"
import {
  LoginStep,
  UserRegistrationData,
  ErrorState,
  UserData
} from "../../types/auth"

interface StepInfo {
  title: string;
  subtitle: string;
}


export default function LoginPage(): JSX.Element {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [step, setStep] = useState<LoginStep>('phone')
  const [phoneNumber, setPhoneNumber] = useState<string>('')
  const [verificationCode, setVerificationCode] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [cooldown, setCooldown] = useState<number>(0)
  const [error, setError] = useState<string>('')
  const [userInfo, setUserInfo] = useState<UserRegistrationData>({
    firebase_uid: '',
    business_name: '',
    owner_name: '',
    phone_number: '',
    address: '',
  })

  // 카카오 주소검색 훅
  const { openPostcode, selectedAddress } = useKakaoPostcode({
    onComplete: (data: KakaoAddress) => {
      const fullAddress = data.roadAddress || data.jibunAddress;
      setUserInfo(prev => ({ ...prev, address: fullAddress }));
    }
  });

  useEffect(() => {
    // 컴포넌트 마운트 시 reCAPTCHA 설정
    try {
      setupRecaptcha('recaptcha-container');
    } catch (error) {
      console.error('reCAPTCHA 초기화 실패:', error);
      setError('reCAPTCHA 초기화에 실패했습니다. 페이지를 새로고침해주세요.');
    }
    
    // 컴포넌트 언마운트 시 정리
    return () => {
      // reCAPTCHA 정리
      try {
        if (window.recaptchaVerifier) {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = undefined;
        }
        window.confirmationResult = undefined;
      } catch (error) {
        console.warn('정리 중 오류:', error);
      }
    }
  }, [])

  const handleAuthenticatedUser = async (user: User): Promise<void> => {
    try {
      // Firebase 토큰 저장
      const idToken = await user.getIdToken();
      tokenManager.setToken(idToken);
      
      // 사용자 상태 확인
      const response = await authApi.checkUserStatus(user.uid);
      
      if (response.exists && response.user) {
        const userData: UserData = response.user;
        
        // AuthContext 상태 업데이트
        await login(user, userData);
        
        if (userData.status === 'approved') {
          navigate('/dashboard', { replace: true });
        } else if (userData.status === 'pending') {
          setStep('pending');
        } else {
          setError('계정이 비활성화되었습니다. 관리자에게 문의하세요.');
        }
      } else {
        // 미등록 사용자 -> 회원가입 단계로
        setUserInfo(prev => ({ 
          ...prev, 
          firebase_uid: user.uid, 
          phone_number: user.phoneNumber || '' 
        }));
        setStep('register');
      }
    } catch (error) {
      console.error('사용자 상태 확인 오류:', error)
      setError('사용자 정보를 확인하는 중 오류가 발생했습니다.')
    }
  }

  const handleSendCode = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const result = await sendPhoneVerification(phoneNumber)
      
      if (result.success) {
        setStep('code')
        // 성공 시 60초 쿨다운
        setCooldown(60)
        const timer = setInterval(() => {
          setCooldown(prev => {
            if (prev <= 1) {
              clearInterval(timer)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      } else {
        setError(result.message || '인증번호 전송에 실패했습니다.')
        
        // too-many-requests 오류인 경우 긴 쿨다운
        if (result.error?.includes('too-many-requests')) {
          setCooldown(300) // 5분 쿨다운
          const timer = setInterval(() => {
            setCooldown(prev => {
              if (prev <= 1) {
                clearInterval(timer)
                return 0
              }
              return prev - 1
            })
          }, 1000)
        }
        
        // reCAPTCHA 관련 오류인 경우 재설정
        if (result.error?.includes('captcha') || result.error?.includes('internal-error')) {
          try {
            setupRecaptcha('recaptcha-container');
          } catch (recaptchaError) {
            console.error('reCAPTCHA 재설정 실패:', recaptchaError);
          }
        }
      }
    } catch (error: any) {
      setError('인증번호 전송 중 오류가 발생했습니다. 페이지를 새로고침하고 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const result = await verifyPhoneCode(verificationCode)
      
      if (result.success && result.user) {
        await handleAuthenticatedUser(result.user)
      } else {
        setError(result.message || '인증번호 확인에 실패했습니다.')
      }
    } catch (error: any) {
      setError('인증번호 확인 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const response = await authApi.registerUser(userInfo)
      
      if (response.user) {
        setStep('pending')
      } else {
        setError('회원가입 중 오류가 발생했습니다.')
      }
    } catch (error: any) {
      console.error('회원가입 오류:', error)
      setError(error.message || '회원가입 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const renderPhoneStep = (): JSX.Element => (
    <form onSubmit={handleSendCode} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-base font-medium text-gray-700">
          전화번호
        </Label>
        <Input
          id="phone"
          type="tel"
          placeholder="010-1234-5678"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="h-12 text-base border-gray-300 focus:border-accent-blue"
          required
        />
        <p className="text-xs text-gray-500">인증번호가 SMS로 전송됩니다.</p>
      </div>

      <Button
        type="submit"
        disabled={loading || cooldown > 0}
        className="w-full h-12 bg-navy hover:bg-navy/90 text-white text-base font-medium mt-6 disabled:opacity-50"
      >
        {loading ? '전송 중...' : 
         cooldown > 0 ? `재전송 (${cooldown}초 후)` : 
         '인증번호 전송'}
      </Button>
    </form>
  )

  const renderCodeStep = (): JSX.Element => (
    <form onSubmit={handleVerifyCode} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="code" className="text-base font-medium text-gray-700">
          인증번호
        </Label>
        <Input
          id="code"
          type="text"
          placeholder="6자리 인증번호"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
          className="h-12 text-base border-gray-300 focus:border-accent-blue text-center tracking-widest"
          maxLength={6}
          required
        />
        <p className="text-xs text-gray-500">{phoneNumber}로 전송된 인증번호를 입력하세요.</p>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep('phone')}
          className="flex-1 h-12"
        >
          뒤로
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 h-12 bg-navy hover:bg-navy/90 text-white"
        >
          {loading ? '확인 중...' : '인증 확인'}
        </Button>
      </div>
    </form>
  )

  const renderRegisterStep = (): JSX.Element => (
    <form onSubmit={handleRegister} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="business_name" className="text-base font-medium text-gray-700">
          사업장명 *
        </Label>
        <Input
          id="business_name"
          type="text"
          placeholder="예: 바다수산"
          value={userInfo.business_name}
          onChange={(e) => setUserInfo(prev => ({ ...prev, business_name: e.target.value }))}
          className="h-12 text-base border-gray-300 focus:border-accent-blue"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="owner_name" className="text-base font-medium text-gray-700">
          대표자명 *
        </Label>
        <Input
          id="owner_name"
          type="text"
          placeholder="홍길동"
          value={userInfo.owner_name}
          onChange={(e) => setUserInfo(prev => ({ ...prev, owner_name: e.target.value }))}
          className="h-12 text-base border-gray-300 focus:border-accent-blue"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address" className="text-base font-medium text-gray-700">
          주소 *
        </Label>
        <div className="flex gap-2">
          <Input
            id="address"
            type="text"
            placeholder="주소검색 버튼을 눌러주세요"
            value={userInfo.address}
            readOnly
            className="h-12 text-base border-gray-300 focus:border-accent-blue flex-1 bg-gray-50"
            required
          />
          <Button
            type="button"
            onClick={openPostcode}
            className="h-12 px-4 bg-accent-blue hover:bg-accent-blue/90 text-white whitespace-nowrap"
          >
            주소검색
          </Button>
        </div>
        {userInfo.address && (
          <p className="text-xs text-gray-500">
            선택된 주소: {userInfo.address}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-12 bg-navy hover:bg-navy/90 text-white text-base font-medium mt-6"
      >
        {loading ? '가입 신청 중...' : '가입 신청'}
      </Button>
    </form>
  )

  const renderPendingStep = (): JSX.Element => (
    <div className="text-center space-y-4">
      <div className="w-16 h-16 mx-auto bg-yellow-100 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">승인 대기 중</h3>
        <p className="text-gray-600">
          회원가입 신청이 완료되었습니다.<br />
          관리자 승인 후 서비스를 이용하실 수 있습니다.
        </p>
      </div>
      <div className="text-sm text-gray-500">
        <p>승인까지 1-2일 정도 소요될 수 있습니다.</p>
        <p>승인 완료 시 SMS로 안내드립니다.</p>
      </div>
    </div>
  )

  const getStepInfo = (): StepInfo => {
    switch (step) {
      case 'phone':
        return { title: '로그인', subtitle: '전화번호로 로그인하세요' }
      case 'code':
        return { title: '인증번호 확인', subtitle: '전송받은 인증번호를 입력하세요' }
      case 'register':
        return { title: '회원가입', subtitle: '사업장 정보를 입력해주세요' }
      case 'pending':
        return { title: '가입 완료', subtitle: '' }
      default:
        return { title: '로그인', subtitle: '전화번호로 로그인하세요' }
    }
  }

  const stepInfo: StepInfo = getStepInfo()

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Dark Navy with Mascot */}
      <div className="flex-1 bg-navy flex flex-col items-center justify-center p-8">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-24 h-24">
              <SharkMascot />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">바다 대장부</h1>
            <p className="text-white/80 text-lg">수산물 도매 통합 관리 시스템</p>
          </div>
          <div className="text-white/60 text-sm max-w-md">
            <p>효율적인 수산물 도매업 관리를 위한</p>
            <p>올인원 ERP-CRM 솔루션</p>
          </div>
        </div>
      </div>

      {/* Right Side - White Login Panel */}
      <div className="flex-1 bg-white flex items-center justify-center p-8">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">{stepInfo.title}</h2>
                {stepInfo.subtitle && <p className="text-gray-600">{stepInfo.subtitle}</p>}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {step === 'phone' && renderPhoneStep()}
              {step === 'code' && renderCodeStep()}
              {step === 'register' && renderRegisterStep()}
              {step === 'pending' && renderPendingStep()}

              {/* reCAPTCHA container */}
              <div id="recaptcha-container" className="flex justify-center mt-4"></div>
              
              {step === 'phone' && (
                <div className="text-xs text-center text-gray-500 mt-2">
                  테스트: 01012341234 (인증번호: 123456)
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}