locals {
  tags = ["app:${var.name}", "managed-by:opentofu"]
}

# Registry namespace names are unique across Scaleway, so add a random suffix.
resource "random_id" "suffix" {
  byte_length = 3
}

# ---------------------------------------------------------------------------
# Container registry
# ---------------------------------------------------------------------------
resource "scaleway_registry_namespace" "main" {
  name        = "${var.name}-${random_id.suffix.hex}"
  description = "Images for the home library app"
  is_public   = false
}

# ---------------------------------------------------------------------------
# Serverless SQL Database (PostgreSQL, scales to zero)
# ---------------------------------------------------------------------------
resource "scaleway_sdb_sql_database" "main" {
  name    = var.name
  min_cpu = 0
  max_cpu = var.db_max_cpu
}

# Serverless SQL Database authenticates with IAM: the username is an IAM
# application ID and the password is that application's API secret key.
resource "scaleway_iam_application" "db" {
  name        = "${var.name}-db"
  description = "Database access for the ${var.name} container"
  tags        = local.tags
}

resource "scaleway_iam_policy" "db" {
  name           = "${var.name}-db-access"
  description    = "Read/write access to Serverless SQL databases in the ${var.name} project"
  application_id = scaleway_iam_application.db.id

  rule {
    project_ids          = [var.project_id]
    permission_set_names = ["ServerlessSQLDatabaseReadWrite"]
  }
}

resource "scaleway_iam_api_key" "db" {
  application_id     = scaleway_iam_application.db.id
  description        = "Serverless SQL Database credentials for the ${var.name} container"
  default_project_id = var.project_id
}

locals {
  # endpoint looks like: postgres://<id>.pg.sdb.fr-par.scw.cloud:5432/library?sslmode=require
  db_endpoint = regex("^postgres(?:ql)?://([^:/?]+)(?::([0-9]+))?/([^?]+)", scaleway_sdb_sql_database.main.endpoint)
  db_host     = local.db_endpoint[0]
  db_port     = coalesce(local.db_endpoint[1], "5432")
  db_name     = local.db_endpoint[2]

  connection_string = join(";", [
    "Host=${local.db_host}",
    "Port=${local.db_port}",
    "Database=${local.db_name}",
    "Username=${scaleway_iam_application.db.id}",
    "Password=${scaleway_iam_api_key.db.secret_key}",
    "SSL Mode=Require",
    # Keep the pool small; the serverless DB scales on demand.
    "Maximum Pool Size=10",
    # Allow for the database waking up from scale-to-zero.
    "Timeout=30",
  ])
}

# ---------------------------------------------------------------------------
# Initial admin password
# ---------------------------------------------------------------------------
resource "random_password" "admin" {
  length  = 20
  special = false
}

locals {
  admin_password = var.admin_password != "" ? var.admin_password : random_password.admin.result
}

# ---------------------------------------------------------------------------
# Serverless Container running the app (API + React SPA)
# ---------------------------------------------------------------------------
resource "scaleway_container_namespace" "main" {
  name        = var.name
  description = "Home library app"
  tags        = local.tags
}

resource "scaleway_container" "app" {
  name         = var.name
  namespace_id = scaleway_container_namespace.main.id
  description  = "Home library web app"
  tags         = local.tags

  image = "${scaleway_registry_namespace.main.endpoint}/${var.name}:${var.image_tag}"
  port  = 8080

  cpu_limit          = var.container_cpu
  memory_limit_bytes = var.container_memory_mb * 1024 * 1024
  min_scale          = 0
  max_scale          = var.max_scale
  timeout            = 60

  privacy                = "public"
  protocol               = "http1"
  https_connections_only = true

  environment_variables = {
    ASPNETCORE_ENVIRONMENT = "Production"
    Admin__Email           = var.admin_email
  }

  secret_environment_variables = {
    ConnectionStrings__Library = local.connection_string
    Admin__Password            = local.admin_password
  }

  # Cold starts run EF migrations, so give startup some slack.
  startup_probe {
    interval          = "5s"
    timeout           = "3s"
    failure_threshold = 24
    http {
      path = "/healthz"
    }
  }

  liveness_probe {
    interval          = "30s"
    timeout           = "5s"
    failure_threshold = 3
    http {
      path = "/healthz"
    }
  }

  depends_on = [scaleway_iam_policy.db]
}

resource "scaleway_container_domain" "custom" {
  count        = var.custom_domain != "" ? 1 : 0
  container_id = scaleway_container.app.id
  hostname     = var.custom_domain
}
