variable "aws_region" {
  description = "AWS region for the EKS cluster"
  type        = string
  default     = "us-west-2"
}

variable "environment" {
  description = "Deployment environment (development, staging, production)"
  type        = string
  default     = "development"

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}

variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
  default     = "microservices-platform"
}

variable "cluster_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.28"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block."
  }
}

variable "node_instance_types" {
  description = "EC2 instance types for the general managed node group"
  type        = list(string)
  default     = ["m5.large", "m5a.large"]
}

variable "node_min_size" {
  description = "Minimum number of nodes in the general node group"
  type        = number
  default     = 2
}

variable "node_max_size" {
  description = "Maximum number of nodes in the general node group"
  type        = number
  default     = 10
}

variable "node_desired_size" {
  description = "Desired number of nodes in the general node group"
  type        = number
  default     = 3
}

variable "node_disk_size" {
  description = "Disk size in GiB for worker nodes"
  type        = number
  default     = 50
}

variable "spot_instance_types" {
  description = "EC2 instance types for the spot managed node group"
  type        = list(string)
  default     = ["m5.large", "m5a.large", "m5d.large", "m5ad.large"]
}

variable "spot_min_size" {
  description = "Minimum number of nodes in the spot node group"
  type        = number
  default     = 0
}

variable "spot_max_size" {
  description = "Maximum number of nodes in the spot node group"
  type        = number
  default     = 20
}

variable "spot_desired_size" {
  description = "Desired number of nodes in the spot node group"
  type        = number
  default     = 2
}

variable "aws_auth_roles" {
  description = "Additional IAM roles to add to the aws-auth configmap"
  type = list(object({
    rolearn  = string
    username = string
    groups   = list(string)
  }))
  default = []
}
