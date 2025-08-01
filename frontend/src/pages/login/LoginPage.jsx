"use client"

import React from "react"
import { useState } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Card, CardContent } from "../../components/ui/card"
import { SharkMascot } from "../../components/common/SharkMascot"

export default function LoginPage() {
  const [credentials, setCredentials] = useState({ username: "", password: "" })

  const handleLogin = (e) => {
    e.preventDefault()
    // Simple demo login - in real app, validate credentials
    console.log("Login attempt:", credentials)
  }

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
                <h2 className="text-2xl font-bold text-gray-900">로그인</h2>
                <p className="text-gray-600">계정 정보를 입력해주세요</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-base font-medium text-gray-700">
                    아이디
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="아이디를 입력하세요"
                    value={credentials.username}
                    onChange={(e) => setCredentials((prev) => ({ ...prev, username: e.target.value }))}
                    className="h-12 text-base border-gray-300 focus:border-accent-blue"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-base font-medium text-gray-700">
                    비밀번호
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="비밀번호를 입력하세요"
                    value={credentials.password}
                    onChange={(e) => setCredentials((prev) => ({ ...prev, password: e.target.value }))}
                    className="h-12 text-base border-gray-300 focus:border-accent-blue"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-navy hover:bg-navy/90 text-white text-base font-medium mt-6"
                >
                  로그인
                </Button>
              </form>

              <div className="text-center space-y-2 text-sm text-gray-500">
                <p>
                  계정이 없으신가요? <span className="text-accent-blue cursor-pointer hover:underline">회원가입</span>
                </p>
                <p>
                  <span className="text-accent-blue cursor-pointer hover:underline">비밀번호 찾기</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 