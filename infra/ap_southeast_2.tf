provider "aws" {
  alias  = "monitoring_ap_southeast_2"
  region = local.aws_region_ap_southeast_2
}

resource "aws_oam_sink" "monitoring_sink_ap_southeast_2" {
  name = "monitoring_sink_ap_southeast_2"

  provider = aws.monitoring_ap_southeast_2
}

resource "aws_oam_sink_policy" "monitoring_sink_policy_ap_southeast_2" {
  sink_identifier = aws_oam_sink.monitoring_sink_ap_southeast_2.arn
  policy          = local.sink_policy

  provider = aws.monitoring_ap_southeast_2
}

provider "aws" {
  alias  = "source_a_ap_southeast_2"
  region = local.aws_region_ap_southeast_2
  assume_role {
    role_arn = local.source_a_role_arn
  }
}

resource "aws_oam_link" "source_a_link_ap_southeast_2" {
  sink_identifier = aws_oam_sink.monitoring_sink_ap_southeast_2.arn
  label_template  = local.link_label_template
  resource_types  = local.oam_resource_types

  depends_on = [aws_oam_sink_policy.monitoring_sink_policy_ap_southeast_2]

  provider = aws.source_a_ap_southeast_2
}

provider "aws" {
  alias  = "source_b_ap_southeast_2"
  region = local.aws_region_ap_southeast_2

  assume_role {
    role_arn = local.source_b_role_arn
  }
}

resource "aws_oam_link" "source_b_link_ap_southeast_2" {
  sink_identifier = aws_oam_sink.monitoring_sink_ap_southeast_2.arn
  label_template  = local.link_label_template
  resource_types  = local.oam_resource_types

  depends_on = [aws_oam_sink_policy.monitoring_sink_policy_ap_southeast_2]

  provider = aws.source_b_ap_southeast_2
}
