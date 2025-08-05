# 🔐 GitHub Secrets 설정 가이드

Team-PICK-O 프로젝트의 CI/CD를 위한 GitHub Secrets 설정 완전 가이드입니다.

## 📋 필수 GitHub Secrets 목록 (총 14개)

### 🌐 AWS 관련 (4개)
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY  
AWS_REGION
```

### 🐳 ECR 관련 (2개)
```
ECR_REPOSITORY_BACKEND
ECR_REPOSITORY_FRONTEND
```

### 🖥️ EC2 관련 (3개)
```
EC2_HOST
EC2_USER
EC2_PRIVATE_KEY
```

### 🗄️ 데이터베이스 관련 (3개)
```
DATABASE_URL
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASSWORD
```

### 🔒 애플리케이션 관련 (2개)
```
SECRET_KEY
ALLOWED_HOSTS
```

---

## 🛠️ 단계별 설정 가이드

### 1️⃣ AWS IAM 사용자 생성

#### AWS 콘솔에서:
1. **IAM** → **Users** → **Create user**
2. **사용자 이름**: `github-actions-user`
3. **권한 정책 연결**:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "ecr:GetAuthorizationToken",
           "ecr:BatchCheckLayerAvailability",
           "ecr:GetDownloadUrlForLayer",
           "ecr:BatchGetImage",
           "ecr:InitiateLayerUpload",
           "ecr:UploadLayerPart",
           "ecr:CompleteLayerUpload",
           "ecr:PutImage",
           "ecr:CreateRepository",
           "ecr:DescribeRepositories",
           "ecr:DescribeImages"
         ],
         "Resource": "*"
       },
       {
         "Effect": "Allow",
         "Action": [
           "ec2:DescribeInstances",
           "ec2:DescribeImages",
           "ec2:DescribeKeyPairs"
         ],
         "Resource": "*"
       }
     ]
   }
   ```
4. **액세스 키 생성** → 키 ID와 Secret Key 기록

### 2️⃣ Terraform 인프라 배포

```bash
# 인프라 배포
cd infra
terraform init
terraform apply

# 중요한 출력값들 기록
terraform output github_secrets
```

### 3️⃣ GitHub Secrets 설정

**GitHub 저장소** → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

#### AWS 관련:
```bash
# 1. AWS_ACCESS_KEY_ID
# 값: AKIA로 시작하는 액세스 키 ID

# 2. AWS_SECRET_ACCESS_KEY  
# 값: AWS 시크릿 액세스 키 (40자리)

# 3. AWS_REGION
# 값: ap-northeast-2
```

#### ECR 관련:
```bash
# Terraform 출력에서 확인:
terraform output ecr_repository_backend_name
terraform output ecr_repository_frontend_name

# 4. ECR_REPOSITORY_BACKEND
# 값: team-pick-o-backend

# 5. ECR_REPOSITORY_FRONTEND  
# 값: team-pick-o-frontend
```

#### EC2 관련:
```bash
# Terraform 출력에서 확인:
terraform output instance_public_ip

# 6. EC2_HOST
# 값: 123.456.789.012 (EC2 퍼블릭 IP)

# 7. EC2_USER
# 값: ec2-user

# 8. EC2_PRIVATE_KEY
# 값: -----BEGIN RSA PRIVATE KEY-----로 시작하는 전체 키 파일 내용
# (pick-o-key.pem 파일 내용 전체를 복사)
```

#### 데이터베이스 관련:
```bash
# 9. DATABASE_URL
# 값: postgresql://teamPicko:복잡한패스워드@database:5432/teamPickoDB

# 10. POSTGRES_DB
# 값: teamPickoDB

# 11. POSTGRES_USER
# 값: teamPicko

# 12. POSTGRES_PASSWORD
# 값: 복잡한패스워드123!@#
```

#### 애플리케이션 관련:
```bash
# 13. SECRET_KEY
# 값: 매우복잡한JWT시크릿키여기에넣기32자이상권장

# 14. ALLOWED_HOSTS
# 값: 123.456.789.012,your-domain.com
```

---

## 🔍 설정값 생성 도구

### SECRET_KEY 생성:
```python
import secrets
print(secrets.token_urlsafe(32))
```

### 강력한 패스워드 생성:
```bash
openssl rand -base64 32
```

### EC2 키 페어 파일 읽기:
```bash
cat ~/.ssh/pick-o-key.pem
```

---

## ✅ 설정 검증

### GitHub Actions에서 확인:
1. **Actions** 탭에서 워크플로우 실행
2. **Configure AWS credentials** 단계에서 성공 확인  
3. **Check ECR repositories exist** 단계에서 ECR 생성 확인

### 로컬에서 검증:
```bash
# AWS 자격증명 테스트
aws sts get-caller-identity

# ECR 로그인 테스트  
aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-northeast-2.amazonaws.com

# EC2 SSH 테스트
ssh -i ~/.ssh/pick-o-key.pem ec2-user@<EC2_HOST>
```

---

## 🚨 문제 해결

### ECR 권한 오류:
```bash
# ECR 전용 정책 생성 및 연결
aws iam create-policy --policy-name ECRFullAccess --policy-document file://ecr-policy.json
aws iam attach-user-policy --user-name github-actions-user --policy-arn arn:aws:iam::<account>:policy/ECRFullAccess
```

### EC2 접속 오류:
```bash
# 키 파일 권한 확인
chmod 400 ~/.ssh/pick-o-key.pem

# 보안 그룹 SSH 포트 확인
aws ec2 describe-security-groups --group-ids <security-group-id>
```

### Docker 빌드 오류:
```bash
# 로컬에서 테스트
cd backend
docker build -t test-backend .

cd ../frontend  
docker build -t test-frontend .
```

---

## 📊 최종 체크리스트

- [ ] AWS IAM 사용자 생성 및 정책 연결
- [ ] Terraform 인프라 배포 완료
- [ ] 14개 GitHub Secrets 모두 설정
- [ ] GitHub Actions 워크플로우 실행 성공
- [ ] ECR에 이미지 업로드 확인
- [ ] EC2에 SSH 접속 가능
- [ ] 애플리케이션 정상 동작 확인

---

## 💡 보안 팁

1. **정기적 로테이션**: AWS 키와 패스워드 주기적 변경
2. **최소 권한 원칙**: 필요한 권한만 부여
3. **모니터링**: AWS CloudTrail로 API 호출 모니터링
4. **암호화**: 모든 민감 정보는 GitHub Secrets 사용
5. **접근 제한**: GitHub 저장소 접근 권한 관리

이 가이드를 따라 설정하면 완전 자동화된 CI/CD 파이프라인이 동작합니다! 🚀