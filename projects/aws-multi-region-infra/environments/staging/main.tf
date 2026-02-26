terraform {
  required_version = ">= 1.5.0"

  backend "s3" {
    bucket         = "my-terraform-state-bucket"
    key            = "multi-region-infra/staging/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}

module "infrastructure" {
  source = "../../"

  project_name     = "multi-region-infra"
  environment      = "staging"
  primary_region   = "us-east-1"
  secondary_region = "us-west-2"

  vpc_cidr_primary   = "10.10.0.0/16"
  vpc_cidr_secondary = "10.11.0.0/16"

  public_subnet_cidrs  = ["10.10.1.0/24", "10.10.2.0/24", "10.10.3.0/24"]
  private_subnet_cidrs = ["10.10.11.0/24", "10.10.12.0/24", "10.10.13.0/24"]

  instance_type        = "t3.medium"
  asg_min_size         = 1
  asg_max_size         = 4
  asg_desired_capacity = 2

  db_instance_class          = "db.r6g.large"
  db_allocated_storage       = 50
  db_max_allocated_storage   = 200
  db_name                    = "appdb"
  db_username                = var.db_username
  db_password                = var.db_password
  db_multi_az                = false
  db_backup_retention_period = 3

  enable_deletion_protection = false
  health_check_path          = "/health"

  common_tags = {
    CostCenter = "engineering"
    Owner      = "platform-team"
  }
}

variable "db_username" {
  description = "RDS master username"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}

output "primary_alb_dns" {
  description = "Primary ALB DNS name"
  value       = module.infrastructure.primary_alb_dns_name
}

output "primary_rds_endpoint" {
  description = "Primary RDS endpoint"
  value       = module.infrastructure.primary_rds_endpoint
}
