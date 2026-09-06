$dirs = @(
  "server/src/config",
  "server/src/controllers",
  "server/src/middlewares",
  "server/src/models",
  "server/src/repositories",
  "server/src/routes",
  "server/src/services",
  "server/src/validators",
  "server/src/events",
  "server/src/sockets",
  "server/src/utils",
  "server/src/constants",
  "server/uploads",
  "server/logs",
  "server/docs",
  "server/src/modules",
  "server/src/modules/authentication",
  "server/src/modules/users",
  "server/src/modules/drivers",
  "server/src/modules/riders",
  "server/src/modules/admins",
  "server/src/modules/securityOffice",
  "server/src/modules/rides",
  "server/src/modules/payments",
  "server/src/modules/notifications",
  "server/src/modules/maps",
  "server/src/modules/analytics",
  "server/src/modules/chatbot",
  "server/src/modules/carpool",
  "server/src/modules/files"
)

foreach ($dir in $dirs) {
  if (!(Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
  $keepFile = Join-Path $dir ".gitkeep"
  if (!(Test-Path $keepFile)) {
    New-Item -ItemType File -Path $keepFile -Force | Out-Null
  }
}
Write-Output "Server directories setup complete."
