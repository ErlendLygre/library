output "app_url" {
  description = "URL of the app."
  value       = var.custom_domain != "" ? "https://${var.custom_domain}" : "https://${scaleway_container.app.public_endpoint}"
}

output "container_endpoint" {
  description = "Default Scaleway endpoint (CNAME target for a custom domain)."
  value       = scaleway_container.app.public_endpoint
}

output "registry_endpoint" {
  description = "Registry namespace endpoint to push images to."
  value       = scaleway_registry_namespace.main.endpoint
}

output "image" {
  description = "Image the container is running."
  value       = scaleway_container.app.image
}

output "admin_email" {
  value = var.admin_email
}

output "admin_password" {
  description = "Initial admin password (only used when the first admin is created)."
  value       = local.admin_password
  sensitive   = true
}
