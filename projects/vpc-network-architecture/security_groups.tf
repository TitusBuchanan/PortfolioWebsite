# ---------------------------------------------------------------------------
# Web Tier Security Group (public-facing ALB / web servers)
# ---------------------------------------------------------------------------

resource "aws_security_group" "web" {
  name_prefix = "${local.name_prefix}-web-"
  description = "Web tier - allows HTTP/HTTPS from the internet"
  vpc_id      = aws_vpc.this.id

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${local.name_prefix}-web-sg"
    Tier = "web"
  }
}

resource "aws_security_group_rule" "web_ingress_http" {
  security_group_id = aws_security_group.web.id
  type              = "ingress"
  description       = "HTTP from anywhere"
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
}

resource "aws_security_group_rule" "web_ingress_https" {
  security_group_id = aws_security_group.web.id
  type              = "ingress"
  description       = "HTTPS from anywhere"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
}

resource "aws_security_group_rule" "web_egress_all" {
  security_group_id = aws_security_group.web.id
  type              = "egress"
  description       = "All outbound traffic"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
}

# ---------------------------------------------------------------------------
# Application Tier Security Group
# ---------------------------------------------------------------------------

resource "aws_security_group" "app" {
  name_prefix = "${local.name_prefix}-app-"
  description = "App tier - accepts traffic from web tier and allows outbound"
  vpc_id      = aws_vpc.this.id

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${local.name_prefix}-app-sg"
    Tier = "app"
  }
}

resource "aws_security_group_rule" "app_ingress_from_web" {
  security_group_id        = aws_security_group.app.id
  type                     = "ingress"
  description              = "HTTP from web tier"
  from_port                = 8080
  to_port                  = 8080
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.web.id
}

resource "aws_security_group_rule" "app_ingress_from_web_alt" {
  security_group_id        = aws_security_group.app.id
  type                     = "ingress"
  description              = "HTTPS from web tier"
  from_port                = 8443
  to_port                  = 8443
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.web.id
}

resource "aws_security_group_rule" "app_ingress_ssh" {
  count = length(var.allowed_ssh_cidrs) > 0 ? 1 : 0

  security_group_id = aws_security_group.app.id
  type              = "ingress"
  description       = "SSH from allowed CIDRs"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  cidr_blocks       = var.allowed_ssh_cidrs
}

resource "aws_security_group_rule" "app_egress_all" {
  security_group_id = aws_security_group.app.id
  type              = "egress"
  description       = "All outbound traffic"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
}

# ---------------------------------------------------------------------------
# Database Tier Security Group
# ---------------------------------------------------------------------------

resource "aws_security_group" "db" {
  name_prefix = "${local.name_prefix}-db-"
  description = "DB tier - accepts connections only from the app tier"
  vpc_id      = aws_vpc.this.id

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${local.name_prefix}-db-sg"
    Tier = "database"
  }
}

resource "aws_security_group_rule" "db_ingress_postgres" {
  security_group_id        = aws_security_group.db.id
  type                     = "ingress"
  description              = "PostgreSQL from app tier"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.app.id
}

resource "aws_security_group_rule" "db_ingress_mysql" {
  security_group_id        = aws_security_group.db.id
  type                     = "ingress"
  description              = "MySQL/Aurora from app tier"
  from_port                = 3306
  to_port                  = 3306
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.app.id
}

resource "aws_security_group_rule" "db_ingress_redis" {
  security_group_id        = aws_security_group.db.id
  type                     = "ingress"
  description              = "Redis/ElastiCache from app tier"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.app.id
}

resource "aws_security_group_rule" "db_egress_all" {
  security_group_id = aws_security_group.db.id
  type              = "egress"
  description       = "All outbound traffic"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
}
