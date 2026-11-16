# One-time setup: the Object Storage bucket that holds OpenTofu state for ../
#
#   cd infra/bootstrap
#   tofu init && tofu apply -var project_id=... -var bucket_name=...
#
# This module keeps its own (tiny) state locally; nothing else depends on it.

terraform {
  required_version = ">= 1.8.0"

  required_providers {
    scaleway = {
      source  = "scaleway/scaleway"
      version = "~> 2.92"
    }
  }
}

variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "fr-par"
}

variable "bucket_name" {
  description = "Globally unique bucket name for OpenTofu state, e.g. library-tofu-state-<something>."
  type        = string
}

provider "scaleway" {
  region     = var.region
  project_id = var.project_id
}

resource "scaleway_object_bucket" "state" {
  name = var.bucket_name
  tags = { app = "library", purpose = "tofu-state" }

  versioning {
    enabled = true
  }

  lifecycle_rule {
    id      = "expire-old-state-versions"
    enabled = true
    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

output "bucket_name" {
  value = scaleway_object_bucket.state.name
}

output "endpoint" {
  value = "https://s3.${var.region}.scw.cloud"
}
