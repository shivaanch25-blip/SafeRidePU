$dirs = @(
  "client/src/features/rider",
  "client/src/features/driver",
  "client/src/features/admin",
  "client/src/features/securityOffice",
  "client/src/features/ride",
  "client/src/features/payment",
  "client/src/features/maps",
  "client/src/features/notifications",
  "client/src/features/analytics",
  "client/src/features/chatbot",
  "client/src/features/carpool",
  "client/src/features/profile",
  "client/src/features/settings",
  "client/src/features/shared",
  "client/src/assets",
  "client/src/components",
  "client/src/layouts",
  "client/src/pages",
  "client/src/routes",
  "client/src/hooks",
  "client/src/contexts",
  "client/src/config",
  "client/src/constants",
  "client/src/services",
  "client/src/store",
  "client/src/types",
  "client/src/utils"
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
Write-Output "Client directories setup complete."
