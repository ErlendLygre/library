# Remote state in Scaleway Object Storage (S3-compatible).
# Create the bucket once with ./bootstrap, then initialise with:
#
#   tofu init -backend-config="bucket=<state bucket name>"
#
# Credentials come from AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY, which should
# be set to your Scaleway access key / secret key.
terraform {
  backend "s3" {
    key    = "library/terraform.tfstate"
    region = "fr-par"

    endpoints = {
      s3 = "https://s3.fr-par.scw.cloud"
    }

    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_metadata_api_check     = true
    skip_s3_checksum            = true
  }
}
