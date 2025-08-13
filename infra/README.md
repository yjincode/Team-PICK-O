# Terraform AWS 인프라 구성

Team-PICK-O 프로젝트의 AWS 인프라를 Terraform으로 관리합니다.

## 구성 요소

### 네트워크
- **VPC**: 10.0.0.0/16 CIDR 블록
- **퍼블릭 서브넷**: 10.0.1.0/24 CIDR 블록
- **인터넷 게이트웨이**: 외부 인터넷 연결
- **라우트 테이블**: 퍼블릭 라우팅 설정

### 컴퓨팅
- **EC2 인스턴스**: 
  - 타입: t2.micro
  - OS: Amazon Linux 2
  - 퍼블릭 IP 자동 할당
  - Docker 자동 설치

### 보안
- **보안 그룹**: 
  - SSH (22), HTTP (80), HTTPS (443)
  - React (3000), Backend API (8000) 포트 오픈

### 스토리지
- **S3 버킷**: 
  - 버전 관리 활성화
  - 퍼블릭 액세스 차단
- **ECR 저장소**:
  - Backend 이미지용
  - Frontend 이미지용
  - 보안 스캔 활성화
  - 수명 주기 정책 (최근 10개 이미지 유지)

## 사용법

### 1. 사전 준비

AWS CLI 설정:
```bash
aws configure
```

Terraform 설치 확인:
```bash
terraform --version
```

AWS 키 페어 생성 (AWS 콘솔에서):
- EC2 → Key Pairs → Create key pair
- 이름: "my-key" (또는 원하는 이름)
- 파일 다운로드 후 안전한 곳에 보관

### 2. 환경 설정

```bash
# infra 디렉토리로 이동
cd infra

# 설정 파일 복사 및 수정
cp terraform.tfvars.example terraform.tfvars
```

`terraform.tfvars` 파일을 실제 환경에 맞게 수정:
```hcl
project_name = "your-project-name"
key_pair_name = "your-actual-key-name"
aws_region = "ap-northeast-2"
```

### 3. Terraform 실행

```bash
# Terraform 초기화
terraform init

# 실행 계획 확인
terraform plan

# 인프라 생성
terraform apply
```

### 4. 출력 정보 확인

배포 완료 후 중요한 정보들이 출력됩니다:

```bash
# 모든 출력 값 확인
terraform output

# 특정 출력 값 확인
terraform output instance_public_ip
terraform output ssh_connection
```

### 5. EC2 접속

```bash
# SSH 접속
ssh -i ~/.ssh/my-key.pem ec2-user@<EC2_PUBLIC_IP>

# Docker 설치 확인
docker --version
docker compose version
docker-compose --version  # 하위 호환성 확인
```

## GitHub Actions 연동

Terraform 출력을 GitHub Secrets에 설정:

```bash
# GitHub Secrets 설정용 값들 출력
terraform output github_secrets
```

다음 Secrets를 GitHub 저장소에 설정:
- `EC2_HOST`: EC2 퍼블릭 IP
- `EC2_USER`: "ec2-user"
- `AWS_REGION`: AWS 리전
- `EC2_PRIVATE_KEY`: 키 페어 프라이빗 키 내용
- `ECR_REPOSITORY_BACKEND`: 백엔드 ECR 저장소 이름
- `ECR_REPOSITORY_FRONTEND`: 프론트엔드 ECR 저장소 이름

추가로 필요한 Secrets:
- `AWS_ACCESS_KEY_ID`: AWS 액세스 키
- `AWS_SECRET_ACCESS_KEY`: AWS 시크릿 키
- `DATABASE_URL`: 데이터베이스 연결 문자열
- `SECRET_KEY`: 애플리케이션 시크릿 키

## 파일 구조

```
infra/
├── main.tf                 # 메인 리소스 정의
├── variables.tf            # 변수 정의
├── outputs.tf              # 출력 값 정의
├── user_data.sh            # EC2 초기 설정 스크립트
├── terraform.tfvars.example # 설정 예시 파일
└── README.md               # 이 파일
```

## 주의사항

1. **키 페어**: AWS 콘솔에서 미리 생성 필요
2. **비용**: t2.micro는 프리티어 대상이지만 다른 리소스는 비용 발생 가능
3. **보안**: 프라이빗 키와 AWS 자격 증명은 안전하게 보관
4. **정리**: 사용 후 `terraform destroy`로 리소스 정리

## 리소스 정리

```bash
# 모든 리소스 삭제
terraform destroy
```

## 문제 해결

### Terraform 상태 파일 문제
```bash
# 상태 파일 삭제 후 재시작
rm terraform.tfstate*
terraform init
```

### EC2 접속 문제
```bash
# 키 파일 권한 확인
chmod 400 ~/.ssh/my-key.pem

# 보안 그룹 규칙 확인
aws ec2 describe-security-groups --group-ids <SECURITY_GROUP_ID>
```

### Docker 권한 문제
```bash
# EC2 접속 후 Docker 그룹 확인
sudo usermod -a -G docker ec2-user
# 로그아웃 후 재접속 필요
```