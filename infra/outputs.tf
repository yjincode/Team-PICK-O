# VPC 정보
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "VPC CIDR 블록"
  value       = aws_vpc.main.cidr_block
}

# 서브넷 정보
output "public_subnet_id" {
  description = "퍼블릭 서브넷 ID"
  value       = aws_subnet.public.id
}

output "public_subnet_cidr" {
  description = "퍼블릭 서브넷 CIDR"
  value       = aws_subnet.public.cidr_block
}

# EC2 인스턴스 정보
output "instance_id" {
  description = "EC2 인스턴스 ID"
  value       = aws_instance.web_server.id
}

output "instance_public_ip" {
  description = "EC2 인스턴스 퍼블릭 IP"
  value       = aws_instance.web_server.public_ip
}

output "instance_public_dns" {
  description = "EC2 인스턴스 퍼블릭 DNS"
  value       = aws_instance.web_server.public_dns
}

output "instance_private_ip" {
  description = "EC2 인스턴스 프라이빗 IP"
  value       = aws_instance.web_server.private_ip
}

# 보안 그룹 정보
output "security_group_id" {
  description = "웹 서버 보안 그룹 ID"
  value       = aws_security_group.web_server.id
}

# S3 버킷 정보
output "s3_bucket_name" {
  description = "S3 버킷 이름"
  value       = aws_s3_bucket.app_bucket.id
}

output "s3_bucket_arn" {
  description = "S3 버킷 ARN"
  value       = aws_s3_bucket.app_bucket.arn
}

# 접속 정보
output "ssh_connection" {
  description = "SSH 접속 명령어"
  value       = "ssh -i ~/.ssh/${var.key_pair_name}.pem ec2-user@${aws_instance.web_server.public_ip}"
}

output "web_urls" {
  description = "웹 서비스 접속 URL"
  value = {
    frontend = "http://${aws_instance.web_server.public_ip}:3000"
    backend  = "http://${aws_instance.web_server.public_ip}:8000"
    nginx    = "http://${aws_instance.web_server.public_ip}"
  }
}

# ECR 저장소 정보
output "ecr_repository_backend_url" {
  description = "백엔드 ECR 저장소 URL"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_repository_frontend_url" {
  description = "프론트엔드 ECR 저장소 URL"
  value       = aws_ecr_repository.frontend.repository_url
}

output "ecr_repository_backend_name" {
  description = "백엔드 ECR 저장소 이름"
  value       = aws_ecr_repository.backend.name
}

output "ecr_repository_frontend_name" {
  description = "프론트엔드 ECR 저장소 이름"
  value       = aws_ecr_repository.frontend.name
}

# GitHub Actions Secrets 설정용 출력
output "github_secrets" {
  description = "GitHub Actions에 설정할 시크릿 값들"
  value = {
    EC2_HOST                    = aws_instance.web_server.public_ip
    EC2_USER                    = "ec2-user"
    AWS_REGION                  = var.aws_region
    S3_BUCKET_NAME              = aws_s3_bucket.app_bucket.id
    ECR_REPOSITORY_BACKEND      = aws_ecr_repository.backend.name
    ECR_REPOSITORY_FRONTEND     = aws_ecr_repository.frontend.name
  }
  sensitive = false
}