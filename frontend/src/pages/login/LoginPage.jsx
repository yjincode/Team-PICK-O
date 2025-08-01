"use client"

import React from "react"
import { useState, useEffect } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Card, CardContent } from "../../components/ui/card"
import { SharkMascot } from "../../components/common/SharkMascot"
import { setupRecaptcha, sendPhoneVerification, verifyPhoneCode, onAuthStateChange } from "../../lib/firebase"
import { authAPI } from "../../lib/api"

export default function LoginPage() {
  const [step, setStep] = useState('phone') // 'phone', 'code', 'register', 'pending'
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userInfo, setUserInfo] = useState({
    business_name: '',
    owner_name: '',
    address: '',
    business_registration_number: '',
    subscription_plan: 'basic'
  })

  useEffect(() => {
    // 페이지 로드 시 reCAPTCHA 설정
    setupRecaptcha('recaptcha-container')
    
    // 이미 로그인된 사용자가 있는지 확인
    const unsubscribe = onAuthStateChange(async (user) => {
      if (user) {
        await handleAuthenticatedUser(user)
      }
    })
    
    return () => unsubscribe()
  }, [])

  const handleAuthenticatedUser = async (user) => {
    try {
      const idToken = await user.getIdToken()
      localStorage.setItem('firebaseIdToken', idToken)
      
      // 사용자 상태 확인
      const response = await authAPI.checkUserStatus(user.uid)
      
      if (response.data.exists) {
        const userData = response.data.user
        localStorage.setItem('userInfo', JSON.stringify(userData))
        
        if (userData.status === 'approved') {
          // 승인된 사용자 -> 대시보드로 이동
          window.location.href = '/dashboard'
        } else if (userData.status === 'pending') {
          // 승인 대기 상태
          setStep('pending')
        } else {
          // 거절 또는 정지 상태
          setError('계정이 비활성화되었습니다. 관리자에게 문의하세요.')
        }
      } else {
        // 미등록 사용자 -> 회원가입 단계로
        setUserInfo(prev => ({ ...prev, firebase_uid: user.uid, phone_number: user.phoneNumber }))
        setStep('register')
      }
    } catch (error) {
      console.error('사용자 상태 확인 오류:', error)
      setError('사용자 정보를 확인하는 중 오류가 발생했습니다.')
    }
  }

  const handleSendCode = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const result = await sendPhoneVerification(phoneNumber)
      
      if (result.success) {
        setStep('code')
      } else {
        setError(result.message)
      }
    } catch (error) {
      setError('인증번호 전송 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const result = await verifyPhoneCode(verificationCode)
      
      if (result.success) {
        // Firebase 인증 성공 -> onAuthStateChange에서 처리됨
      } else {
        setError(result.message)
      }
    } catch (error) {
      setError('인증번호 확인 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const response = await authAPI.register(userInfo)
      
      if (response.status === 201) {
        setStep('pending')
      } else {
        setError('회원가입 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('회원가입 오류:', error)
      setError(error.response?.data?.message || '회원가입 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const renderPhoneStep = () => (
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
        disabled={loading}
        className="w-full h-12 bg-navy hover:bg-navy/90 text-white text-base font-medium mt-6"
      >
        {loading ? '전송 중...' : '인증번호 전송'}
      </Button>
    </form>
  )

  const renderCodeStep = () => (
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
          maxLength="6"
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

  const renderRegisterStep = () => (
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
        <Input
          id="address"
          type="text"
          placeholder="부산광역시 기장군 일광면"
          value={userInfo.address}
          onChange={(e) => setUserInfo(prev => ({ ...prev, address: e.target.value }))}
          className="h-12 text-base border-gray-300 focus:border-accent-blue"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="business_number" className="text-base font-medium text-gray-700">
          사업자등록번호 *
        </Label>
        <Input
          id="business_number"
          type="text"
          placeholder="123-45-67890"
          value={userInfo.business_registration_number}
          onChange={(e) => setUserInfo(prev => ({ ...prev, business_registration_number: e.target.value }))}
          className="h-12 text-base border-gray-300 focus:border-accent-blue"
          required
        />
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

  const renderPendingStep = () => (
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

  const getStepInfo = () => {
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

  const stepInfo = getStepInfo()

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
              <div id="recaptcha-container"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 