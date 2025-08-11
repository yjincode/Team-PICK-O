/**
 * 쿠키 관리 유틸리티
 * 리프레시 토큰을 안전하게 HttpOnly 쿠키에 저장
 */

export class CookieManager {
  /**
   * 쿠키 설정
   */
  static setCookie(name: string, value: string, days: number = 7, options: {
    secure?: boolean
    sameSite?: 'strict' | 'lax' | 'none'
    httpOnly?: boolean
  } = {}): void {
    const expires = new Date()
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000))
    
    let cookieString = `${name}=${encodeURIComponent(value)}`
    cookieString += `; expires=${expires.toUTCString()}`
    cookieString += `; path=/`
    
    // HTTPS에서만 전송 (프로덕션에서는 true로 설정)
    if (options.secure || window.location.protocol === 'https:') {
      cookieString += `; Secure`
    }
    
    // CSRF 공격 방지
    if (options.sameSite) {
      cookieString += `; SameSite=${options.sameSite}`
    } else {
      cookieString += `; SameSite=Strict`
    }
    
    // XSS 공격 방지 (JavaScript에서 접근 불가)
    // 주의: 클라이언트 사이드에서는 HttpOnly 쿠키 설정이 실제로 적용되지 않음
    // 실제로는 백엔드에서 Set-Cookie 헤더로 설정해야 함
    if (options.httpOnly) {
      cookieString += `; HttpOnly`
    }
    
    document.cookie = cookieString
    console.log(`🍪 쿠키 설정: ${name} (만료: ${days}일)`)
  }

  /**
   * 쿠키 조회
   */
  static getCookie(name: string): string | null {
    const nameEQ = `${name}=`
    const cookies = document.cookie.split(';')
    
    for (let cookie of cookies) {
      let c = cookie.trim()
      if (c.indexOf(nameEQ) === 0) {
        const value = c.substring(nameEQ.length)
        return decodeURIComponent(value)
      }
    }
    
    return null
  }

  /**
   * 쿠키 삭제
   */
  static deleteCookie(name: string): void {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/`
    console.log(`🗑️ 쿠키 삭제: ${name}`)
  }

  /**
   * 리프레시 토큰 전용 쿠키 설정
   */
  static setRefreshToken(refreshToken: string): void {
    this.setCookie('refresh_token', refreshToken, 7, {
      secure: true,
      sameSite: 'strict',
      httpOnly: false // 클라이언트에서 읽어야 하므로 false (실제 프로덕션에서는 백엔드에서 HttpOnly로 설정)
    })
  }

  /**
   * 리프레시 토큰 조회
   */
  static getRefreshToken(): string | null {
    return this.getCookie('refresh_token')
  }

  /**
   * 리프레시 토큰 삭제
   */
  static deleteRefreshToken(): void {
    this.deleteCookie('refresh_token')
  }

  /**
   * 모든 인증 관련 쿠키 삭제
   */
  static clearAuthCookies(): void {
    this.deleteRefreshToken()
    // 필요시 다른 인증 관련 쿠키도 추가
    console.log('🧹 모든 인증 쿠키 삭제 완료')
  }

  /**
   * 쿠키 존재 여부 확인
   */
  static hasCookie(name: string): boolean {
    return this.getCookie(name) !== null
  }
}