terraform {
  required_version = "1.7.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "5.43.0"
    }
  }
}

variable "source_a_aws_account_id" {
  type        = string
  description = "The AWS Account ID for Source A"
}

variable "source_b_aws_account_id" {
  type        = string
  description = "The AWS Account ID for Source B"
}

locals {
  aws_region_ap_southeast_2 = "ap-southeast-2"
  aws_region_us_east_1      = "us-east-1"

  source_a_aws_account_id = var.source_a_aws_account_id
  source_a_role_name      = "OrganizationAccountAccessRole"
  source_a_role_arn       = "arn:aws:iam::${local.source_a_aws_account_id}:role/${local.source_a_role_name}"

  source_b_aws_account_id = var.source_b_aws_account_id
  source_b_role_name      = "OrganizationAccountAccessRole"
  source_b_role_arn       = "arn:aws:iam::${local.source_b_aws_account_id}:role/${local.source_b_role_name}"

  link_label_template = "$AccountName"

  oam_resource_types = [
    "AWS::ApplicationInsights::Application",
    "AWS::CloudWatch::Metric",
    "AWS::Logs::LogGroup",
    "AWS::XRay::Trace",
  ]

  sink_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action   = ["oam:CreateLink", "oam:UpdateLink"],
        Effect   = "Allow",
        Resource = "*",
        Principal = {
          AWS = [local.source_a_role_arn, local.source_b_role_arn],
        },
        Condition = {
          "ForAllValues:StringEquals" = {
            "oam:ResourceTypes" = local.oam_resource_types,
          },
        },
      },
    ],
  })
}
