terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "my-terraform-state-bucket"
    key            = "multi-region-infra/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.primary_region

  default_tags {
    tags = merge(var.common_tags, {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    })
  }
}

provider "aws" {
  alias  = "secondary"
  region = var.secondary_region

  default_tags {
    tags = merge(var.common_tags, {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    })
  }
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

# ------------------------------------------------------------------------------
# Primary Region
# ------------------------------------------------------------------------------

module "vpc_primary" {
  source = "./modules/vpc"

  name_prefix          = "${local.name_prefix}-primary"
  vpc_cidr             = var.vpc_cidr_primary
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
}

module "ec2_primary" {
  source = "./modules/ec2"

  name_prefix        = "${local.name_prefix}-primary"
  vpc_id             = module.vpc_primary.vpc_id
  private_subnet_ids = module.vpc_primary.private_subnet_ids
  instance_type      = var.instance_type
  ami_id             = var.ami_id
  min_size           = var.asg_min_size
  max_size           = var.asg_max_size
  desired_capacity   = var.asg_desired_capacity
  target_group_arns  = module.elb_primary.target_group_arns
}

module "rds_primary" {
  source = "./modules/rds"

  name_prefix             = "${local.name_prefix}-primary"
  vpc_id                  = module.vpc_primary.vpc_id
  private_subnet_ids      = module.vpc_primary.private_subnet_ids
  ec2_security_group_id   = module.ec2_primary.instance_security_group_id
  engine_version          = var.db_engine_version
  instance_class          = var.db_instance_class
  allocated_storage       = var.db_allocated_storage
  max_allocated_storage   = var.db_max_allocated_storage
  db_name                 = var.db_name
  db_username             = var.db_username
  db_password             = var.db_password
  multi_az                = var.db_multi_az
  backup_retention_period = var.db_backup_retention_period
  deletion_protection     = var.enable_deletion_protection
}

module "elb_primary" {
  source = "./modules/elb"

  name_prefix         = "${local.name_prefix}-primary"
  vpc_id              = module.vpc_primary.vpc_id
  public_subnet_ids   = module.vpc_primary.public_subnet_ids
  health_check_path   = var.health_check_path
  ssl_certificate_arn = var.ssl_certificate_arn
  deletion_protection = var.enable_deletion_protection
}

# ------------------------------------------------------------------------------
# Secondary Region
# ------------------------------------------------------------------------------

module "vpc_secondary" {
  source = "./modules/vpc"

  providers = {
    aws = aws.secondary
  }

  name_prefix          = "${local.name_prefix}-secondary"
  vpc_cidr             = var.vpc_cidr_secondary
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
}

module "ec2_secondary" {
  source = "./modules/ec2"

  providers = {
    aws = aws.secondary
  }

  name_prefix        = "${local.name_prefix}-secondary"
  vpc_id             = module.vpc_secondary.vpc_id
  private_subnet_ids = module.vpc_secondary.private_subnet_ids
  instance_type      = var.instance_type
  ami_id             = var.ami_id
  min_size           = var.asg_min_size
  max_size           = var.asg_max_size
  desired_capacity   = var.asg_desired_capacity
  target_group_arns  = module.elb_secondary.target_group_arns
}

module "rds_secondary" {
  source = "./modules/rds"

  providers = {
    aws = aws.secondary
  }

  name_prefix             = "${local.name_prefix}-secondary"
  vpc_id                  = module.vpc_secondary.vpc_id
  private_subnet_ids      = module.vpc_secondary.private_subnet_ids
  ec2_security_group_id   = module.ec2_secondary.instance_security_group_id
  engine_version          = var.db_engine_version
  instance_class          = var.db_instance_class
  allocated_storage       = var.db_allocated_storage
  max_allocated_storage   = var.db_max_allocated_storage
  db_name                 = var.db_name
  db_username             = var.db_username
  db_password             = var.db_password
  multi_az                = var.db_multi_az
  backup_retention_period = var.db_backup_retention_period
  deletion_protection     = var.enable_deletion_protection
}

module "elb_secondary" {
  source = "./modules/elb"

  providers = {
    aws = aws.secondary
  }

  name_prefix         = "${local.name_prefix}-secondary"
  vpc_id              = module.vpc_secondary.vpc_id
  public_subnet_ids   = module.vpc_secondary.public_subnet_ids
  health_check_path   = var.health_check_path
  ssl_certificate_arn = var.ssl_certificate_arn
  deletion_protection = var.enable_deletion_protection
}
