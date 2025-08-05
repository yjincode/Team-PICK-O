# 프로젝트 설정
variable "project_name" {
  description = "프로젝트 이름"
  type        = string
  default     = "team-pick-o"
}

variable "environment" {
  description = "환경 (dev, staging, prod)"
  type        = string
  default     = "dev"
}

# AWS 설정
variable "aws_region" {
  description = "AWS 리전"
  type        = string
  default     = "ap-northeast-2"  # 서울 리전
}

# 네트워크 설정
variable "vpc_cidr" {
  description = "VPC CIDR 블록"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "퍼블릭 서브넷 CIDR 블록"
  type        = string
  default     = "10.0.1.0/24"
}

# EC2 설정
variable "instance_type" {
  description = "EC2 인스턴스 타입"
  type        = string
  default     = "t2.micro"
}

variable "key_pair_name" {
  description = "EC2 인스턴스에 사용할 키 페어 이름"
  type        = string
  default     = "pick-o-key"
}

variable "server_name" {
  description = "EC2 인스턴스 이름 태그"
  type        = string
  default     = "monolith-server"
}

variable "install_docker" {
  description = "EC2 인스턴스에 Docker 자동 설치 여부"
  type        = bool
  default     = true
}