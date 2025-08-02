/**
 * 로그인 페이지
 * 사용자 인증을 위한 로그인 폼을 제공합니다
 */
import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { SharkMascot } from "../../components/common/SharkMascot"

const LoginPage: React.FC = () => {
  // 로그인 폼 데이터 상태
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  })

  // 폼 제출 핸들러
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: 백엔드 API 연동
    // POST /api/auth/login
    // 요청 예시: { username: string, password: string }
    // 응답 예시: { success: true, token: string, user: User }
    console.log("Login attempt:", formData)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          {/* 로고 영역 */}
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20">
              <SharkMascot />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">바다 대장부</CardTitle>
          <p className="text-gray-600">수산업 관리 시스템</p>
        </CardHeader>
        
        {/* 로그인 폼 */}
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">아이디</Label>
              <Input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="아이디를 입력하세요"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="비밀번호를 입력하세요"
                className="mt-1"
                required
              />
            </div>
            <Button type="submit" className="w-full bg-accent-blue hover:bg-accent-blue/90">
              로그인
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default LoginPage; 