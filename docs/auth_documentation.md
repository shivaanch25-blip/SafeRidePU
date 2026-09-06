# SafeRide PU - Authentication, Payments & Mapping Architecture Documentation

This document describes the architectural implementation of the Authentication & Authorization module, the Razorpay Payment Gateway, and the free OpenStreetMap/OSRM interactive mapping system for Vadodara and Parul University.

---

## 1. Authentication & Authorization Module

### Overview
SafeRide PU enforces an institutional security perimeter:
- **Restricted Email Domain**: Only verified `@paruluniversity.ac.in` email addresses (students, faculty, staff) are accepted.
- **Verification Workflow**: Registration creates an inactive account and dispatches a 6-digit OTP code to the user's institutional email with a 10-minute expiry window.
- **Account Lockout Protection**: 5 consecutive failed login attempts trigger an automatic 15-minute account lock and dispatch an alert email.
- **Session & Device Management**: Active sessions track device fingerprints, browser information, IP addresses, and timestamps, allowing remote session revocation and a "Logout All Devices" option.
- **JWT & Token Rotation**: Short-lived Access Tokens (15m) and Refresh Tokens (7d) are delivered via Secure, HTTPOnly cookies. Attempted reuse of a rotated refresh token immediately invalidates the entire token family.
- **Password History**: Users cannot reuse any of their last 3 passwords when resetting or changing credentials.

### API Endpoints
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Public | Initiates institutional registration & sends OTP |
| `POST` | `/api/v1/auth/verify-otp` | Public | Validates 6-digit code for registration or password reset |
| `POST` | `/api/v1/auth/resend-otp` | Public | Resends OTP with 60s cooldown and 3-attempt limit |
| `POST` | `/api/v1/auth/login` | Public | Authenticates credentials, tracks device, sets secure cookies |
| `POST` | `/api/v1/auth/logout` | Public | Revokes refresh token and clears cookies |
| `POST` | `/api/v1/auth/logout-all` | Authenticated | Revokes all active tokens and device sessions |
| `POST` | `/api/v1/auth/refresh` | Public | Rotates refresh token and returns new access token |
| `POST` | `/api/v1/auth/forgot-password` | Public | Sends password reset OTP to institutional email |
| `POST` | `/api/v1/auth/reset-password` | Public | Resets password with token & checks password history |
| `GET` | `/api/v1/auth/me` | Authenticated | Retrieves current authenticated profile |
| `POST` | `/api/v1/auth/change-password` | Authenticated | In-app password update with history checks |
| `GET` | `/api/v1/auth/sessions` | Authenticated | Lists all active device sessions |
| `DELETE` | `/api/v1/auth/sessions/:id` | Authenticated | Revokes a specific remote session |

---

## 2. Indian Payment Gateway (Razorpay)

### Overview
Integrated Razorpay to support instant, secure payments for campus transit:
- **Zero-Fee Institutional Fares**: Real-time fare calculation (₹30 base + ₹12/km).
- **Supported Payment Modes**: UPI (Google Pay, PhonePe, Paytm), Net Banking, Credit/Debit Cards.
- **Signature Verification**: Every successful transaction is verified cryptographically on the backend using HMAC-SHA256 before confirming the payment.

### API Endpoints
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/payments/create-order` | Authenticated | Creates Razorpay order & pending Payment record |
| `POST` | `/api/v1/payments/verify` | Authenticated | Validates HMAC-SHA256 signature and marks payment complete |
| `GET` | `/api/v1/payments/history` | Authenticated | Lists user's past ride transactions and receipts |

---

## 3. Vadodara & India Free Mapping System

### Architecture
To avoid expensive commercial mapping fees and proprietary API keys, SafeRide PU uses a free, open-source stack:
1. **OpenStreetMap (OSM)**: Free vector and tile layers centered on Parul University (`22.2887° N, 73.3634° E`) and the wider Vadodara district.
2. **OSRM (Open Source Routing Machine)**: Free driving routing API (`https://router.project-osrm.org`) providing turn-by-turn route polylines, driving distance (km), and ETA without requiring an API key.
3. **Nominatim**: Free OpenStreetMap geocoder for searching landmarks and addresses across Vadodara.
4. **Campus Geofencing**: Highlighted green polygonal safe zone around the Parul University Waghodia Campus.
5. **Pre-Configured District Landmarks**:
   - Parul University Gates 1 & 2, Hostels, Medical College & Hospital, PIT
   - Vadodara Railway Station, Sayajigunj Central Bus Station, Alkapuri, Fatehgunj, Waghodia Crossing, Airport.
6. **Live Driver GPS Simulation**: Smoothly moves vehicle marker along the calculated driving route.
