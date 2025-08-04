/**
 * 음성 파싱 결과를 분석하여 주문 데이터를 추출하는 유틸리티
 */

interface ParsedOrderData {
  business_name?: string;
  phone_number?: string;
  transcribed_text: string;
  delivery_date?: string;
  items: Array<{
    fish_type_id: number;
    quantity: number;
    unit_price?: number;
    unit: string;
  }>;
  memo?: string;
}

// 어종 매핑 (음성 인식 결과와 DB ID 매핑)
const fishTypeMapping: { [key: string]: { id: number; name: string; default_price: number } } = {
  '도미': { id: 201, name: '도미', default_price: 20000 },
  '방어': { id: 202, name: '방어', default_price: 15000 },
  '고등어': { id: 1, name: '고등어', default_price: 48000 },
  '갈치': { id: 2, name: '갈치', default_price: 65000 },
  '오징어': { id: 3, name: '오징어', default_price: 48000 },
  '명태': { id: 4, name: '명태', default_price: 45000 },
  '삼치': { id: 203, name: '삼치', default_price: 35000 },
  '전어': { id: 204, name: '전어', default_price: 25000 },
  '꽁치': { id: 205, name: '꽁치', default_price: 18000 },
  '청어': { id: 206, name: '청어', default_price: 22000 },
  '고등어': { id: 1, name: '고등어', default_price: 48000 },
  '갈치': { id: 2, name: '갈치', default_price: 65000 },
  '오징어': { id: 3, name: '오징어', default_price: 48000 },
  '명태': { id: 4, name: '명태', default_price: 45000 },
}

// 단위 매핑
const unitMapping: { [key: string]: string } = {
  'kg': 'kg',
  '킬로': 'kg',
  '마리': '마리',
  '박스': '박스',
  '개': '개',
  '통': '통',
  '팩': '팩',
}

// 날짜 추출 정규식
const datePatterns = [
  /(\d{1,2})월\s*(\d{1,2})일/g,
  /(\d{1,2})월\s*(\d{1,2})일\s*(오전|오후|저녁|밤)/g,
  /(\d{1,2})일\s*(오전|오후|저녁|밤)/g,
  /(\d{1,2})일/g,
]

/**
 * 음성 파싱 결과를 분석하여 주문 데이터를 추출
 */
export function parseVoiceOrder(voiceText: string): ParsedOrderData {
  const result: ParsedOrderData = {
    transcribed_text: voiceText,
    items: [],
    memo: ''
  }

  // 어종과 수량 추출
  const fishPattern = /([가-힣]+)\s*(\d+)\s*(kg|킬로|마리|박스|개|통|팩)/g
  let match

  while ((match = fishPattern.exec(voiceText)) !== null) {
    const fishName = match[1]
    const quantity = parseInt(match[2])
    const unit = unitMapping[match[3]] || match[3]

    const fishType = fishTypeMapping[fishName]
    if (fishType) {
      result.items.push({
        fish_type_id: fishType.id,
        quantity: quantity,
        unit_price: fishType.default_price,
        unit: unit
      })
    }
  }

  // 날짜 추출
  for (const pattern of datePatterns) {
    const dateMatch = pattern.exec(voiceText)
    if (dateMatch) {
      const month = parseInt(dateMatch[1])
      const day = parseInt(dateMatch[2])
      const currentYear = new Date().getFullYear()
      
      // 현재 날짜보다 이전이면 다음 해로 설정
      const currentDate = new Date()
      const orderDate = new Date(currentYear, month - 1, day)
      
      if (orderDate < currentDate) {
        orderDate.setFullYear(currentDate.getFullYear() + 1)
      }
      
      result.delivery_date = orderDate.toISOString().split('T')[0]
      break
    }
  }

  // 메모 추출 (특별한 요청사항)
  const memoPatterns = [
    /(급한|긴급|빠른|신속).*?(주문|납품|배송)/,
    /(오전|오후|저녁|밤).*?(중|까지|전)/,
    /(특별|특이|주의).*?(사항|요청)/,
  ]

  for (const pattern of memoPatterns) {
    const memoMatch = pattern.exec(voiceText)
    if (memoMatch) {
      result.memo = memoMatch[0]
      break
    }
  }

  return result
}

/**
 * 주문 데이터를 검증하고 보완
 */
export function validateAndCompleteOrder(orderData: ParsedOrderData): ParsedOrderData {
  const validated = { ...orderData }

  // 필수 필드 검증
  if (!validated.items || validated.items.length === 0) {
    throw new Error('주문 품목을 찾을 수 없습니다.')
  }

  // 날짜가 없으면 기본값 설정 (3일 후)
  if (!validated.delivery_date) {
    const defaultDate = new Date()
    defaultDate.setDate(defaultDate.getDate() + 3)
    validated.delivery_date = defaultDate.toISOString().split('T')[0]
  }

  return validated
}

/**
 * 음성 텍스트에서 어종 목록 추출
 */
export function extractFishTypes(voiceText: string): Array<{ name: string; quantity: number; unit: string }> {
  const fishTypes: Array<{ name: string; quantity: number; unit: string }> = []
  const fishPattern = /([가-힣]+)\s*(\d+)\s*(kg|킬로|마리|박스|개|통|팩)/g
  let match

  while ((match = fishPattern.exec(voiceText)) !== null) {
    const fishName = match[1]
    const quantity = parseInt(match[2])
    const unit = unitMapping[match[3]] || match[3]

    fishTypes.push({
      name: fishName,
      quantity: quantity,
      unit: unit
    })
  }

  return fishTypes
} 