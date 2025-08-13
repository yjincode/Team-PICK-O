# Team-PICK-O API 문서

## 개요
Team-PICK-O 프로젝트의 백엔드 API 엔드포인트들을 정리한 문서입니다.

**Base URL**: `http://localhost:8000/api/v1`

## 목차
1. [인증 API](#1-인증-api)
2. [거래처 관리 API](#2-거래처-관리-api)
3. [어종 관리 API](#3-어종-관리-api)
4. [재고 관리 API](#4-재고-관리-api)
5. [주문 관리 API](#5-주문-관리-api)
6. [결제 관리 API](#6-결제-관리-api)
7. [매출 분석 API](#7-매출-분석-api)
8. [AI 분석 API](#8-ai-분석-api)
9. [음성 인식 API](#9-음성-인식-api)

---

## 1. 인증 API

### 1.1 새로운 사용자 등록
- **메서드**: `POST`
- **엔드포인트**: `/business/auth/register/`
- **설명**: 새로운 사용자를 등록합니다
- **인증**: 불필요 (공개 엔드포인트)

**Request Body:**
```json
{
  "firebase_uid": "string",
  "email": "user@example.com",
  "name": "사용자명",
  "business_name": "사업체명"
}
```

**Response (200 OK):**
```json
{
  "message": "사용자 등록 완료",
  "data": {
    "id": 1,
    "firebase_uid": "string",
    "email": "user@example.com",
    "name": "사용자명",
    "business_name": "사업체명",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: 필수 필드 누락 또는 유효성 검사 실패
- `409 Conflict`: 이미 등록된 사용자

### 1.2 사용자 상태 확인
- **메서드**: `GET`
- **엔드포인트**: `/business/auth/status/`
- **파라미터**: `firebase_uid` (쿼리 파라미터)
- **설명**: Firebase UID로 사용자 상태를 확인합니다
- **인증**: 불필요

**Request:**
```
GET /business/auth/status/?firebase_uid=example_uid
```

**Response (200 OK):**
```json
{
  "exists": true,
  "user_id": 1,
  "status": "active"
}
```

**Error Responses:**
- `400 Bad Request`: firebase_uid 파라미터 누락
- `404 Not Found`: 사용자를 찾을 수 없음

### 1.3 로그아웃
- **메서드**: `POST`
- **엔드포인트**: `/auth/logout`
- **설명**: 사용자 로그아웃을 처리합니다
- **인증**: JWT 필요

**Response (200 OK):**
```json
{
  "message": "로그아웃 완료"
}
```

**Error Responses:**
- `401 Unauthorized`: 유효하지 않은 토큰

### 1.4 현재 사용자 정보 조회
- **메서드**: `GET`
- **엔드포인트**: `/auth/me`
- **설명**: 현재 로그인한 사용자의 정보를 조회합니다
- **인증**: JWT 필요

**Response (200 OK):**
```json
{
  "data": {
    "id": 1,
    "firebase_uid": "string",
    "email": "user@example.com",
    "name": "사용자명",
    "business_name": "사업체명"
  }
}
```

---

## 2. 거래처 관리 API

### 2.1 거래처 목록 조회
- **메서드**: `GET`
- **엔드포인트**: `/business/customers/`
- **파라미터**: `page`, `page_size` (옵션)
- **설명**: 페이지네이션을 지원하는 거래처 목록 조회
- **인증**: JWT 필요

**Request:**
```
GET /business/customers/?page=1&page_size=10
```

**Response (200 OK):**
```json
{
  "data": {
    "results": [
      {
        "id": 1,
        "name": "거래처명",
        "contact_person": "담당자명",
        "phone": "010-1234-5678",
        "email": "contact@example.com",
        "address": "주소",
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "count": 50,
    "next": "http://localhost:8000/api/v1/business/customers/?page=2",
    "previous": null
  }
}
```

### 2.2 거래처 상세 조회
- **메서드**: `GET`
- **엔드포인트**: `/business/customers/{id}/`
- **설명**: 특정 ID의 거래처 정보 조회
- **인증**: JWT 필요

**Response (200 OK):**
```json
{
  "data": {
    "id": 1,
    "name": "거래처명",
    "contact_person": "담당자명",
    "phone": "010-1234-5678",
    "email": "contact@example.com",
    "address": "주소",
    "notes": "비고",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `404 Not Found`: 거래처를 찾을 수 없음

### 2.3 거래처 생성
- **메서드**: `POST`
- **엔드포인트**: `/business/customers/create/`
- **설명**: 새로운 거래처를 생성합니다
- **인증**: JWT 필요

**Request Body:**
```json
{
  "name": "거래처명",
  "contact_person": "담당자명",
  "phone": "010-1234-5678",
  "email": "contact@example.com",
  "address": "주소",
  "notes": "비고"
}
```

**Response (201 Created):**
```json
{
  "message": "거래처 생성 완료",
  "data": {
    "id": 1,
    "name": "거래처명",
    "contact_person": "담당자명",
    "phone": "010-1234-5678",
    "email": "contact@example.com",
    "address": "주소",
    "notes": "비고",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### 2.4 거래처 수정
- **메서드**: `PUT`
- **엔드포인트**: `/business/customers/{id}/`
- **설명**: 기존 거래처 정보를 수정합니다
- **인증**: JWT 필요

**Request Body:** (거래처 생성과 동일)

**Response (200 OK):** (수정된 거래처 정보)

### 2.5 거래처 삭제
- **메서드**: `DELETE`
- **엔드포인트**: `/business/customers/{id}/`
- **설명**: 거래처를 삭제합니다
- **인증**: JWT 필요

**Response (204 No Content)**

---

## 3. 어종 관리 API

### 3.1 어종 목록 조회/검색
- **메서드**: `GET`
- **엔드포인트**: `/fish-registry/fish-types/`
- **파라미터**: `search` (옵션)
- **설명**: 모든 어종 목록 조회 또는 검색
- **인증**: JWT 필요

**Request:**
```
GET /fish-registry/fish-types/?search=광어
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "광어",
      "scientific_name": "Paralichthys olivaceus",
      "category": "활어",
      "description": "설명",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 3.2 어종 상세 조회
- **메서드**: `GET`
- **엔드포인트**: `/fish-registry/fish-types/{id}/`
- **설명**: 특정 ID의 어종 정보 조회
- **인증**: JWT 필요

### 3.3 어종 생성
- **메서드**: `POST`
- **엔드포인트**: `/fish-registry/fish-types/`
- **설명**: 새로운 어종을 등록합니다
- **인증**: JWT 필요

**Request Body:**
```json
{
  "name": "어종명",
  "scientific_name": "학명",
  "category": "카테고리",
  "description": "설명"
}
```

### 3.4 어종 수정
- **메서드**: `PUT`
- **엔드포인트**: `/fish-registry/fish-types/{id}/`

### 3.5 어종 삭제
- **메서드**: `DELETE`
- **엔드포인트**: `/fish-registry/fish-types/{id}/`

---

## 4. 재고 관리 API

### 4.1 재고 목록 조회
- **메서드**: `GET`
- **엔드포인트**: `/inventory/`
- **파라미터**: `search`, `status` (옵션)
- **설명**: 재고 목록을 조회합니다
- **인증**: JWT 필요

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "fish_type": {
        "id": 1,
        "name": "광어"
      },
      "stock_quantity": 100,
      "unit": "마리",
      "status": "available",
      "aquarium_photo_path": "/path/to/photo.jpg",
      "last_updated": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 4.2 재고 상세 조회
- **메서드**: `GET`
- **엔드포인트**: `/inventory/{id}/`

### 4.3 재고 생성
- **메서드**: `POST`
- **엔드포인트**: `/inventory/`

**Request Body:**
```json
{
  "fish_type_id": 1,
  "stock_quantity": 100,
  "unit": "마리",
  "status": "available",
  "aquarium_photo_path": "/path/to/photo.jpg"
}
```

### 4.4 재고 수정
- **메서드**: `PUT`
- **엔드포인트**: `/inventory/{id}/`

### 4.5 재고 삭제
- **메서드**: `DELETE`
- **엔드포인트**: `/inventory/{id}/`

### 4.6 재고 로그 조회
- **메서드**: `GET`
- **엔드포인트**: `/inventory/logs/`
- **파라미터**: `id` (옵션)
- **설명**: 재고 변동 로그를 조회합니다

---

## 5. 주문 관리 API

### 5.1 주문 목록 조회
- **메서드**: `GET`
- **엔드포인트**: `/order/`
- **파라미터**: `page`, `page_size` (옵션)
- **설명**: 주문 목록을 조회합니다
- **인증**: JWT 필요

**Response (200 OK):**
```json
{
  "data": {
    "results": [
      {
        "id": 1,
        "customer": {
          "id": 1,
          "name": "거래처명"
        },
        "order_items": [
          {
            "fish_type": "광어",
            "quantity": 10,
            "unit": "마리",
            "unit_price": 50000
          }
        ],
        "total_amount": 500000,
        "order_status": "pending",
        "delivery_date": "2024-01-15",
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "count": 20,
    "next": null,
    "previous": null
  }
}
```

### 5.2 주문 상세 조회
- **메서드**: `GET`
- **엔드포인트**: `/order/{id}/`

### 5.3 주문 생성 (음성 파일 지원)
- **메서드**: `POST`
- **엔드포인트**: `/order/upload/`
- **설명**: 새로운 주문을 생성합니다 (음성 파일과 함께 전송 시 FormData 형식 지원)
- **인증**: JWT 필요

**Request Body (JSON):**
```json
{
  "customer_id": 1,
  "order_items": [
    {
      "fish_type_id": 1,
      "quantity": 10,
      "unit": "마리",
      "unit_price": 50000
    }
  ],
  "delivery_date": "2024-01-15",
  "notes": "특이사항"
}
```

**Request Body (FormData - 음성 파일 포함):**
```
audio: [File object]
customer_id: 1
delivery_date: 2024-01-15
notes: 특이사항
```

### 5.4 주문 수정
- **메서드**: `PUT`
- **엔드포인트**: `/order/{id}/`

### 5.5 주문 삭제
- **메서드**: `DELETE`
- **엔드포인트**: `/order/{id}/`

### 5.6 주문 상태 변경
- **메서드**: `PATCH`
- **엔드포인트**: `/order/{id}/status/`
- **설명**: 주문 상태만 업데이트합니다

**Request Body:**
```json
{
  "order_status": "confirmed"
}
```

**상태 값:**
- `pending`: 대기중
- `confirmed`: 확인됨
- `preparing`: 준비중
- `shipped`: 배송중
- `delivered`: 배송완료
- `cancelled`: 취소됨

---

## 6. 결제 관리 API

### 6.1 결제 목록 조회
- **메서드**: `GET`
- **엔드포인트**: `/payments/`
- **파라미터**: `page`, `page_size` (옵션)

### 6.2 결제 상세 조회
- **메서드**: `GET`
- **엔드포인트**: `/payments/{id}/`

### 6.3 결제 생성
- **메서드**: `POST`
- **엔드포인트**: `/payments/`

### 6.4 결제 수정
- **메서드**: `PUT`
- **엔드포인트**: `/payments/{id}/`

### 6.5 결제 삭제
- **메서드**: `DELETE`
- **엔드포인트**: `/payments/{id}/`

### 6.6 토스 결제 승인
- **메서드**: `POST`
- **엔드포인트**: `/payment/toss/confirm/`
- **설명**: 토스 페이먼츠 결제를 승인합니다

**Request Body:**
```json
{
  "paymentKey": "토스_결제_키",
  "orderId": "주문_ID",
  "amount": 500000
}
```

**Response (200 OK):**
```json
{
  "message": "결제 승인 완료",
  "data": {
    "paymentKey": "토스_결제_키",
    "orderId": "주문_ID",
    "status": "DONE",
    "totalAmount": 500000
  }
}
```

---

## 7. 매출 분석 API

### 7.1 매출 데이터 조회
- **메서드**: `GET`
- **엔드포인트**: `/order/`
- **설명**: 매출 분석용 주문 데이터 조회

### 7.2 매출 차트 데이터 조회
- **메서드**: `GET`
- **엔드포인트**: `/sales/chart/`
- **설명**: 매출 차트 표시용 데이터를 조회합니다

**Response (200 OK):**
```json
{
  "data": {
    "daily_sales": [
      {
        "date": "2024-01-01",
        "amount": 1000000
      }
    ],
    "monthly_sales": [
      {
        "month": "2024-01",
        "amount": 30000000
      }
    ],
    "top_fish_types": [
      {
        "name": "광어",
        "total_amount": 5000000
      }
    ]
  }
}
```

### 7.3 AI 경매 예측 데이터 조회
- **메서드**: `GET`
- **엔드포인트**: `/sales/auction-prediction/`
- **설명**: AI 기반 경매 가격 예측 데이터를 조회합니다

---

## 8. AI 분석 API

### 8.1 AI 분석 로그 조회
- **메서드**: `GET`
- **엔드포인트**: `/ai/logs/`
- **설명**: AI 분석 로그를 조회합니다

### 8.2 AI 분석 실행
- **메서드**: `POST`
- **엔드포인트**: `/ai/analysis/`
- **설명**: AI 분석을 실행합니다

---

## 9. 음성 인식 API

### 9.1 음성을 텍스트로 변환
- **메서드**: `POST`
- **엔드포인트**: `/transcription/transcribe/`
- **설명**: 음성 파일을 텍스트로 변환합니다
- **인증**: 불필요 (공개 엔드포인트)
- **Content-Type**: `multipart/form-data`

**Request Body:**
```
audio: [File object] (필수)
language: "ko" (옵션, 기본값: ko)
```

**지원 파일 형식:**
- `.wav`
- `.mp3`
- `.flac`
- `.m4a`
- `.ogg`

**Response (200 OK):**
```json
{
  "message": "Transcription completed",
  "transcription": "변환된 텍스트 내용",
  "language": "ko"
}
```

**Error Responses:**
- `400 Bad Request`: 오디오 파일 없음 또는 지원하지 않는 형식
- `500 Internal Server Error`: STT 처리 실패

---

## 공통 응답 형식

### 성공 응답
```json
{
  "message": "성공 메시지",
  "data": { ... }
}
```

### 페이지네이션 응답
```json
{
  "data": {
    "results": [ ... ],
    "count": 총_개수,
    "next": "다음_페이지_URL",
    "previous": "이전_페이지_URL"
  }
}
```

### 오류 응답
```json
{
  "error": "오류 메시지",
  "details": { ... }
}
```

---

## 공통 에러 코드

| 상태 코드 | 설명 | 예시 |
|---------|------|------|
| 400 | Bad Request | 필수 필드 누락, 유효성 검사 실패 |
| 401 | Unauthorized | JWT 토큰 없음, 만료된 토큰 |
| 403 | Forbidden | 권한 없음, 접근 거부 |
| 404 | Not Found | 리소스를 찾을 수 없음 |
| 409 | Conflict | 중복된 데이터, 제약 조건 위반 |
| 422 | Unprocessable Entity | 요청 형식은 올바르지만 처리할 수 없는 데이터 |
| 500 | Internal Server Error | 서버 내부 오류 |
| 503 | Service Unavailable | 서비스 일시 중단 |

---

## 인증 및 권한

### JWT 토큰 기반 인증
- 모든 API는 JWT 액세스 토큰이 필요합니다 (공개 엔드포인트 제외)
- 토큰은 HTTP 헤더에 포함: `Authorization: Bearer <token>`

### 공개 엔드포인트 (토큰 불필요)
- `/business/auth/register/`
- `/business/auth/status/`
- `/transcription/transcribe/`

### 토큰 갱신 자동 처리
- 액세스 토큰 만료 시 자동으로 리프레시 토큰을 사용하여 갱신
- 갱신 실패 시 로그인 페이지로 자동 리다이렉트

---

## 특별 기능

### 1. 음성 주문 처리 플로우
1. 음성 파일 업로드 (`/transcription/transcribe/`)
2. Faster-Whisper STT 변환 완료 후 자동 주문 파싱
3. 파싱된 데이터를 주문 API로 전송 (`/order/upload/`)

### 2. 자연어 처리
- 음성/텍스트에서 어종, 수량, 단위, 배송일, 거래처명 자동 추출
- 기존 어종/거래처 데이터베이스와 자동 매칭
- 매칭 실패 시 신규 등록 제안

### 3. 파일 업로드 지원
- 음성 파일: STT 처리용
- 이미지 파일: OCR 및 AI 분석용
- 수조 사진: 재고 관리용

---

## 개발 환경 정보

- **백엔드**: Django REST Framework
- **인증**: JWT (JSON Web Token)
- **데이터베이스**: PostgreSQL
- **음성 처리**: Faster-Whisper (오픈소스)
- **결제**: 토스 페이먼츠 연동
- **AI**: YOLOv8, OpenCV
- **OCR**: Tesseract

---

## 추가 정보

### API 버전 관리
- 현재 버전: v1
- Base URL: `http://localhost:8000/api/v1`

### 개발자 문의
- 프로젝트: Team-PICK-O
- 문서 버전: 2024-01-01
- 마지막 업데이트: Faster-Whisper 적용 완료