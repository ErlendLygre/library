variable "project_id" {
  description = "Scaleway project ID to deploy into."
  type        = string
}

variable "region" {
  description = "Scaleway region."
  type        = string
  default     = "fr-par"
}

variable "name" {
  description = "Base name used for resources."
  type        = string
  default     = "library"
}

variable "image_tag" {
  description = "Tag of the app image in the container registry (CI passes the git SHA)."
  type        = string
  default     = "latest"
}

variable "admin_email" {
  description = "Email of the initial admin user (created on first start if no admin exists)."
  type        = string
}

variable "admin_password" {
  description = "Initial admin password. Leave empty to generate one (see the admin_password output)."
  type        = string
  default     = ""
  sensitive   = true
}

variable "custom_domain" {
  description = "Optional custom hostname (e.g. library.example.com). Create a CNAME to the container's default endpoint first."
  type        = string
  default     = ""
}

variable "container_cpu" {
  description = "vCPU allocated to each container instance, in mvCPU."
  type        = number
  default     = 280
}

variable "container_memory_mb" {
  description = "Memory allocated to each container instance, in MB."
  type        = number
  default     = 512
}

variable "max_scale" {
  description = "Maximum number of container instances."
  type        = number
  default     = 2
}

variable "db_max_cpu" {
  description = "Maximum vCPU for the Serverless SQL Database (it scales down to 0 when idle)."
  type        = number
  default     = 4
}
