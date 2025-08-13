/**
 * 전화번호 포맷팅 유틸리티
 * 핸드폰과 일반전화를 구분해서 하이픈을 추가합니다
 */

/**
 * 전화번호를 포맷팅하는 함수
 * @param phoneNumber - 포맷팅할 전화번호 (숫자만 또는 하이픈 포함)
 * @returns 포맷팅된 전화번호
 */
export const formatPhoneNumber = (phoneNumber: string): string => {
  if (!phoneNumber) return '';
  
  // 숫자만 추출
  const numbers = phoneNumber.replace(/\D/g, '');
  
  // 빈 문자열 처리
  if (!numbers) return phoneNumber;
  
  // 길이에 따른 포맷팅
  if (numbers.length === 11) {
    // 핸드폰 번호 (010-1234-5678)
    if (numbers.startsWith('010')) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
    }
    // 기타 11자리 번호
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
  } else if (numbers.length === 10) {
    // 지역번호 + 일반전화 (02-1234-5678, 031-123-4567)
    if (numbers.startsWith('02')) {
      // 서울 지역번호 02
      return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    } else {
      // 기타 지역번호 (031, 032, 041, 042, 043, 044, 051, 052, 053, 054, 055, 061, 062, 063, 064)
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`;
    }
  } else if (numbers.length === 9) {
    // 9자리 지역번호 (02-123-4567)
    if (numbers.startsWith('02')) {
      return `${numbers.slice(0, 2)}-${numbers.slice(2, 5)}-${numbers.slice(5)}`;
    } else {
      // 기타 9자리 번호
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`;
    }
  } else if (numbers.length === 8) {
    // 8자리 번호 (1234-5678)
    return `${numbers.slice(0, 4)}-${numbers.slice(4)}`;
  }
  
  // 기타 길이는 원본 반환
  return phoneNumber;
};

/**
 * 전화번호 타입을 판단하는 함수
 * @param phoneNumber - 전화번호
 * @returns 전화번호 타입 ('mobile' | 'landline' | 'unknown')
 */
export const getPhoneNumberType = (phoneNumber: string): 'mobile' | 'landline' | 'unknown' => {
  if (!phoneNumber) return 'unknown';
  
  const numbers = phoneNumber.replace(/\D/g, '');
  
  if (numbers.startsWith('010') || numbers.startsWith('011') || 
      numbers.startsWith('016') || numbers.startsWith('017') || 
      numbers.startsWith('018') || numbers.startsWith('019')) {
    return 'mobile';
  } else if (numbers.startsWith('02') || numbers.startsWith('03') || 
             numbers.startsWith('04') || numbers.startsWith('05') || 
             numbers.startsWith('06') || numbers.startsWith('070')) {
    return 'landline';
  }
  
  return 'unknown';
};