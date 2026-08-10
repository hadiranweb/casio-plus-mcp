# Terraform placeholder — provisioning برای secrets و storage
# در فاز واقعی: S3 / Postgres / Redis برای evidence/feedback persistence

terraform {
  required_version = ">= 1.5"
}

# provider "aws" { region = "eu-west-1" }
# resource "aws_s3_bucket" "evidence" { bucket = "casio-plus-evidence" }
