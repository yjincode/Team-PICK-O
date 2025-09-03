/**
 * 음성 파싱 결과를 분석하여 주문 데이터를 추출하는 유틸리티
 */
import { businessApi, fishTypeApi } from '../lib/api'
import type { Business, FishType } from '../types'

interface ParsedOrderData {
  business_name?: string;
  phone_number?: string;
  transcribed_text: string;
  delivery_date?: string;
  business_id?: number; // 백엔드에서 매칭된 업체 ID
  items: Array<{
    fish_type_id: number | null;
    quantity: number;
    unit_price?: number | null;
    unit: string;
    fish_name?: string; // 원본 어종명
  }>;
  memo?: string;
  unmatched_items?: any[];
  validation_warnings?: any[];
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
  '청어': { id: 206, name: '청어', default_price: 22000 }
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
 * API에서 어종 목록을 가져와서 매칭
 */
export async function findFishTypeFromAPI(fishName: string): Promise<FishType | null> {
  try {
    const response = await fishTypeApi.getAll()
    const fishTypes = response.data || []
    
    // 완전 일치 검색
    let matchedFish = fishTypes.find((fish: FishType) => 
      fish.name === fishName
    )
    
    // 부분 일치 검색
    if (!matchedFish) {
      matchedFish = fishTypes.find((fish: FishType) => 
        fish.name.includes(fishName) || fishName.includes(fish.name)
      )
    }
    
    // 유사 검색 (2글자 이상 포함)
    if (!matchedFish && fishName.length >= 2) {
      matchedFish = fishTypes.find((fish: FishType) => 
        fish.name.includes(fishName.substring(0, 2)) || 
        fishName.includes(fish.name.substring(0, 2))
      )
    }
    
    return matchedFish || null
    
  } catch (error) {
    return null
  }
}

/**
 * 음성 파싱 결과를 분석하여 주문 데이터를 추출 (백엔드 API 연동)
 */
export async function parseVoiceOrderWithAPI(voiceText: string): Promise<ParsedOrderData> {
  try {
    // sttApi의 parseText 사용 (백엔드가 AI Server로 프록시)
    const { sttApi } = await import('../lib/api');
    
    const data = await sttApi.parseText(voiceText);
    
    console.log('🔍 백엔드에서 받은 파싱 응답:', JSON.stringify(data, null, 2));
    
    // AI Server 응답 형식 확인
    if (data.success && data.data) {
      const parsedData = data.data;
      
      console.log('🔍 파싱된 데이터 상세:', {
        business_name: parsedData.business_name,
        business_id: parsedData.business_id,
        items: parsedData.items,
        memo: parsedData.memo,
        delivery_date: parsedData.delivery_date
      });
      
      // AI Server 응답을 프론트엔드 형식으로 변환
      const result: ParsedOrderData = {
        transcribed_text: voiceText,
        items: parsedData.items || [],
        memo: parsedData.memo || '',
        delivery_date: parsedData.delivery_date,
        business_name: parsedData.business_name,
        business_id: parsedData.business_id,
        unmatched_items: parsedData.unmatched_items || [],
        validation_warnings: parsedData.validation_warnings || []
      };

      console.log('🔍 최종 변환된 결과:', result);
      return result;
    } else {
      console.error('❌ AI Server 파싱 실패:', data);
      throw new Error(data.message || "AI Server 파싱 실패");
    }
  } catch (error) {
    console.error('❌ 백엔드 API 파싱 실패:', error);
    
    // AI 서버 파싱 실패 시 오류 전파 (로컬 fallback 제거)
    throw new Error(`AI 서버 파싱 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
}

/**
 * 음성 파싱 결과를 분석하여 주문 데이터를 추출 (기존 방식)
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
    // 매칭되지 않는 어종도 포함하되, null 값으로 설정
    result.items.push({
      fish_type_id: fishType ? fishType.id : null,
      quantity: quantity,
      unit_price: fishType ? fishType.default_price : null,
      unit: unit,
      fish_name: fishName // 원본 어종명 추가
    })
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

/**
 * 음성 텍스트에서 거래처명 추출 및 매칭
 */
export async function findBusinessFromVoice(voiceText: string): Promise<Business | null> {
  try {
    // 거래처명 추출 패턴 (예: "바다수산에", "동해마트로", "해양식품한테")
    const businessPatterns = [
      /([가-힣]+(?:수산|마트|식품|어장|회사|상회))[에게로한테]/g,
      /([가-힣]+(?:수산|마트|식품|어장|회사|상회))/g,
      /([가-힣]{2,8})[에게로한테]/g
    ]
    
    let extractedNames: string[] = []
    
    for (const pattern of businessPatterns) {
      let match
      while ((match = pattern.exec(voiceText)) !== null) {
        const businessName = match[1]
        if (businessName.length >= 2 && businessName.length <= 8) {
          extractedNames.push(businessName)
        }
      }
    }
    
    // 중복 제거
    extractedNames = [...new Set(extractedNames)]
    
    if (extractedNames.length === 0) {
      return null
    }
    
    
    // 실제 거래처 목록에서 검색
    const response = await businessApi.getAll({ page: 1, page_size: 100 })
    const businesses = response.results || []
    
    // 가장 유사한 거래처 찾기
    for (const extractedName of extractedNames) {
      const matchedBusiness = businesses.find((business: Business) =>
        business.business_name.includes(extractedName) ||
        extractedName.includes(business.business_name.substring(0, 3))
      )
      
      if (matchedBusiness) {
        return matchedBusiness
      }
    }
    
    return null
    
  } catch (error) {
    return null
  }
}

/**
 * 음성 파싱 결과를 분석하여 주문 데이터를 추출 (거래처 포함, API 연동)
 */
export async function parseVoiceOrderWithBusiness(voiceText: string): Promise<ParsedOrderData & { business?: Business }> {
  // 항상 AI 서버를 통한 파싱 사용
  const basicOrderData = await parseVoiceOrderWithAPI(voiceText)  // 백엔드 API에서 업체 정보도 함께 받음
  
  let matchedBusiness: Business | null = null;
  
  // 백엔드에서 business_id를 받은 경우, 해당 업체 정보를 가져옴
  if (basicOrderData.business_id) {
    try {
      const response = await businessApi.getAll({ page: 1, page_size: 100 })
      console.log('🔍 업체 목록 조회 응답:', response);
      const businesses = response.results || []
      console.log('🔍 파싱된 business_id:', basicOrderData.business_id);
      console.log('🔍 조회된 업체 목록:', businesses.map(b => ({ id: b.id, name: b.business_name })));
      matchedBusiness = businesses.find((b: Business) => b.id === basicOrderData.business_id) || null
      console.log('🔍 매칭된 업체:', matchedBusiness);
    } catch (error) {
      console.error('❌ 업체 정보 조회 실패:', error)
    }
  }
  
  // 백엔드에서 매칭하지 못한 경우 프론트엔드에서 추가 시도
  if (!matchedBusiness) {
    matchedBusiness = await findBusinessFromVoice(voiceText)
  }
  
  return {
    ...basicOrderData,
    business: matchedBusiness || undefined,
    business_name: matchedBusiness?.business_name || basicOrderData.business_name
  }
} 


// 음성 파일 전용: STT만 수행하고 텍스트 반환
export async function transcribeAudio(audioFile: File): Promise<string> {
  const formData = new FormData();
  formData.append("audio", audioFile);

  const response = await fetch("/api/v1/transcription/transcribe/", {
    method: "POST",
    body: formData,
    headers: {
      "ngrok-skip-browser-warning": "true"
    }
  });

  if (!response.ok) {
    throw new Error(`음성 변환 실패: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.transcription) {
    throw new Error("음성 변환 결과가 없습니다");
  }

  return data.transcription;
}

// 기존 fetchParsedOrder는 제거하고, 각 탭에서 적절한 함수 사용
// - 텍스트: parseVoiceOrderWithBusiness(text)
// - 음성: transcribeAudio(file) → parseVoiceOrderWithBusiness(text)

  
