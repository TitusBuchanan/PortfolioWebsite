output "primary_vpc_id" {
  description = "VPC ID in the primary region"
  value       = module.vpc_primary.vpc_id
}

output "secondary_vpc_id" {
  description = "VPC ID in the secondary region"
  value       = module.vpc_secondary.vpc_id
}

output "primary_alb_dns_name" {
  description = "DNS name of the Application Load Balancer in the primary region"
  value       = module.elb_primary.alb_dns_name
}

output "secondary_alb_dns_name" {
  description = "DNS name of the Application Load Balancer in the secondary region"
  value       = module.elb_secondary.alb_dns_name
}

output "primary_alb_zone_id" {
  description = "Route 53 zone ID of the primary ALB"
  value       = module.elb_primary.alb_zone_id
}

output "primary_rds_endpoint" {
  description = "RDS writer endpoint in the primary region"
  value       = module.rds_primary.rds_endpoint
}

output "primary_rds_reader_endpoint" {
  description = "RDS reader endpoint in the primary region (if available)"
  value       = module.rds_primary.rds_reader_endpoint
}

output "primary_rds_port" {
  description = "RDS port in the primary region"
  value       = module.rds_primary.rds_port
}

output "primary_asg_name" {
  description = "Auto Scaling Group name in the primary region"
  value       = module.ec2_primary.asg_name
}

output "secondary_asg_name" {
  description = "Auto Scaling Group name in the secondary region"
  value       = module.ec2_secondary.asg_name
}
