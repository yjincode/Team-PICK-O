/**
 * 간단하고 깔끔한 로그인 페이지
 * Firebase SMS 인증 + JWT 토큰 시스템
 */

import React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { ConfirmationResult } from 'firebase/auth'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Card, CardContent } from '../../components/ui/card'
import { SharkMascot } from '../../components/common/SharkMascot'
import { setupRecaptcha } from '../../lib/firebase'
import { useKakaoPostcode } from "../../hooks/useKakaoPostcode"
import { KakaoAddress } from "../../types/kakao"

type LoginStep = 'phone' | 'code' | 'register' | 'pending'

interface StepInfo {
  title: string;
  subtitle: string;
}

export default function LoginPage(): JSX.Element {
  const navigate = useNavigate()
  const { user, loading: authLoading, sendSMSCode, verifySMSCode, registerUser } = useAuth()
  
  // 상태 관리 (sessionStorage에서 복원)
  const [currentStep, setCurrentStep] = useState<LoginStep>(() => {
    const forcedStep = sessionStorage.getItem('forced_step')
    return (forcedStep as LoginStep) || 'phone'
  })
  
  const [phoneNumber, setPhoneNumber] = useState<string>(() => {
    return sessionStorage.getItem('phone_number_for_register') || ''
  })
  const [verificationCode, setVerificationCode] = useState<string>('')
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [cooldown, setCooldown] = useState<number>(0)
  const [error, setError] = useState<string>('')
  const [firebaseToken, setFirebaseToken] = useState<string>(() => {
    return sessionStorage.getItem('firebase_token_for_register') || ''
  })
  
  // 회원가입 정보 (phone_number는 Firebase 토큰에서 추출하므로 제외)
  const [userInfo, setUserInfo] = useState({
    business_name: '',
    owner_name: '',
    address: '',
  })

  // 카카오 주소검색
  const { openPostcode } = useKakaoPostcode({
    onComplete: (data: KakaoAddress) => {
      const fullAddress = data.roadAddress || data.jibunAddress;
      setUserInfo(prev => ({ ...prev, address: fullAddress }));
    }
  });

  // 로그인된 사용자는 대시보드로 리다이렉트 (회원가입 중이 아닌 경우에만)
  useEffect(() => {
    if (user && !authLoading && currentStep !== 'register') {
      navigate('/dashboard')
    }
  }, [user, authLoading, navigate, currentStep])

  // reCAPTCHA 초기화
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        setupRecaptcha('recaptcha-container')
      } catch (error) {
        console.error('reCAPTCHA 초기화 실패:', error)
        setError('reCAPTCHA 초기화에 실패했습니다.')
      }
    }, 100);
    
    return () => clearTimeout(timer)
  }, [])

  // 쿨다운 타이머
  const startCooldown = (seconds: number) => {
    setCooldown(seconds)
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

  // 1단계: SMS 인증번호 전송
  const handleSendCode = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const result = await sendSMSCode(phoneNumber)
      setConfirmationResult(result)
      setCurrentStep('code')
      startCooldown(60)
    } catch (error: any) {
      setError(error.message || 'SMS 전송에 실패했습니다.')
      if (error.message?.includes('too-many-requests')) {
        startCooldown(300) // 5분 쿨다운
      }
    } finally {
      setLoading(false)
    }
  }

  // 2단계: 인증번호 확인 및 JWT 교환
  const handleVerifyCode = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!confirmationResult) {
        throw new Error('인증 세션이 만료되었습니다.')
      }
      
      const result = await verifySMSCode(confirmationResult, verificationCode)
      
      if (result.isNewUser && result.firebaseToken) {
        // 신규 사용자 - 회원가입 단계로
        setFirebaseToken(result.firebaseToken)
        setCurrentStep('register')
        
        // sessionStorage에 상태 저장 (새로고침 시 복원용)
        sessionStorage.setItem('forced_step', 'register')
        sessionStorage.setItem('firebase_token_for_register', result.firebaseToken)
        sessionStorage.setItem('phone_number_for_register', phoneNumber)
        
      } else if (result.isNewUser === false) {
        // 기존 사용자 - 대시보드로
        navigate('/dashboard')
      } else {
        setError('인증 결과를 처리할 수 없습니다.')
      }
    } catch (error: any) {
      setError(error.message || '인증번호가 올바르지 않습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 3단계: 회원가입
  const handleRegister = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      if (!firebaseToken) {
        throw new Error('인증 정보가 없습니다. 다시 로그인해주세요.')
      }
      
      await registerUser(userInfo, firebaseToken)
      
      // 회원가입 완료 후 sessionStorage 정리
      sessionStorage.removeItem('forced_step')
      sessionStorage.removeItem('firebase_token_for_register')
      sessionStorage.removeItem('phone_number_for_register')
      
      // 대시보드로 이동 (AuthContext에서 user 상태가 설정됨)
      navigate('/dashboard')
    } catch (error: any) {
      setError(error.message || '회원가입 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 렌더링 함수들
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
          className="h-12 text-base"
          required
        />
        <p className="text-xs text-gray-500">인증번호가 SMS로 전송됩니다.</p>
      </div>

      <Button
        type="submit"
        disabled={loading || cooldown > 0}
        className="w-full h-12 bg-navy hover:bg-navy/90 text-white"
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
          className="h-12 text-base text-center tracking-widest"
          maxLength={6}
          required
        />
        <p className="text-xs text-gray-500">{phoneNumber}로 전송된 인증번호를 입력하세요.</p>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setCurrentStep('phone')}
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
          className="h-12 text-base"
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
          className="h-12 text-base"
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
            className="h-12 text-base flex-1 bg-gray-50"
            required
          />
          <Button
            type="button"
            onClick={openPostcode}
            className="h-12 px-4 bg-accent-blue hover:bg-accent-blue/90 text-white"
          >
            주소검색
          </Button>
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-12 bg-navy hover:bg-navy/90 text-white"
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
    </div>
  )

  const getStepInfo = (): StepInfo => {
    switch (currentStep) {
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

  const stepInfo = getStepInfo()

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Navy with Mascot */}
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

      {/* Right Side - Login Panel */}
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

              {currentStep === 'phone' && renderPhoneStep()}
              {currentStep === 'code' && renderCodeStep()}
              {currentStep === 'register' && renderRegisterStep()}
              {currentStep === 'pending' && renderPendingStep()}

              {/* reCAPTCHA container */}
              <div id="recaptcha-container" className="flex justify-center mt-4" style={{ minHeight: '78px' }}></div>
              
              {currentStep === 'phone' && (
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