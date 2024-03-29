provider "aws" {
  alias  = "monitoring_us_east_1"
  region = local.aws_region_us_east_1
}

resource "aws_oam_sink" "monitoring_sink_us_east_1" {
  name = "monitoring_sink_us_east_1"

  provider = aws.monitoring_us_east_1
}

resource "aws_oam_sink_policy" "monitoring_sink_policy_us_east_1" {
  sink_identifier = aws_oam_sink.monitoring_sink_us_east_1.arn
  policy          = local.sink_policy

  provider = aws.monitoring_us_east_1
}

provider "aws" {
  alias  = "source_a_us_east_1"
  region = local.aws_region_us_east_1
  assume_role {
    role_arn = local.source_a_role_arn
  }
}

resource "aws_oam_link" "source_a_link_us_east_1" {
  sink_identifier = aws_oam_sink.monitoring_sink_us_east_1.arn
  label_template  = local.link_label_template
  resource_types  = local.oam_resource_types

  depends_on = [aws_oam_sink_policy.monitoring_sink_policy_us_east_1]

  provider = aws.source_a_us_east_1
}

provider "aws" {
  alias  = "source_b_us_east_1"
  region = local.aws_region_us_east_1

  assume_role {
    role_arn = local.source_b_role_arn
  }
}

resource "aws_oam_link" "source_b_link_us_east_1" {
  sink_identifier = aws_oam_sink.monitoring_sink_us_east_1.arn
  label_template  = local.link_label_template
  resource_types  = local.oam_resource_types

  depends_on = [aws_oam_sink_policy.monitoring_sink_policy_us_east_1]

  provider = aws.source_b_us_east_1
}
