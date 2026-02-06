# Mobile API – Test data for retest

Base URL: `http://localhost:3000`  
Swagger UI: `http://localhost:3000/docs`

**Prerequisites:** MongoDB running at `mongodb://localhost:27017` (or set `MONGODB_URI`).

---

## 1. Generate OTP (dummy)

**POST** `/v1/mobile/generate-otp`

**Request body:**
```json
{
  "mobile": "9876543210"
}
```

**Sample response (200):**
```json
{
  "success": true,
  "message": "OTP sent successfully. Use 1234 for testing."
}
```

---

## 2. Validate OTP (use 1234)

**POST** `/v1/mobile/validate-otp`

**Request body:**
```json
{
  "mobile": "9876543210",
  "otp": "1234"
}
```

**Sample response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "userId": "674a1b2c3d4e5f6789012345",
  "mobile": "9876543210"
}
```

**Save `accessToken` and `sessionId` for the next steps.** Use the same mobile for consistency.

**Invalid OTP (400):**
```json
{
  "mobile": "9876543210",
  "otp": "0000"
}
```
→ `400 Bad Request` with message `"Invalid OTP"`.

---

## 3. Get all sessions (requires JWT)

**GET** `/v1/mobile/sessions`  
**Header:** `Authorization: Bearer <accessToken from step 2>`

**Sample response (200):**
```json
[
  { "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "createdAt": "2025-02-04T10:00:00.000Z" },
  { "sessionId": "b2c3d4e5-f6a7-8901-bcde-f12345678901", "createdAt": "2025-02-04T09:30:00.000Z" }
]
```

---

## 4. Get chat messages for a session (requires JWT)

**GET** `/v1/mobile/sessions/:sessionId/messages`  
**Header:** `Authorization: Bearer <accessToken>`

Example: `GET /v1/mobile/sessions/a1b2c3d4-e5f6-7890-abcd-ef1234567890/messages`

**Sample response (200):**
```json
[
  { "role": "user", "content": "Show me laptops", "createdAt": "2025-02-04T10:01:00.000Z" },
  { "role": "assistant", "content": "Thanks for your message: \"Show me laptops\". This is a placeholder response.", "createdAt": "2025-02-04T10:01:01.000Z" }
]
```

---

## 5. Send a message (requires JWT)

**POST** `/v1/mobile/sessions/:sessionId/messages`  
**Header:** `Authorization: Bearer <accessToken>`  
**Request body:**
```json
{
  "message": "Show me laptops under 50k"
}
```

**Sample response (200):**
```json
{
  "role": "assistant",
  "content": "Thanks for your message: \"Show me laptops under 50k\". This is a placeholder response."
}
```

---

## 6. Save cart (requires JWT)

**POST** `/v1/mobile/cart`  
**Header:** `Authorization: Bearer <accessToken>`

**Request body:**
```json
{
  "items": [
    { "productId": "prod-001", "provider": "default", "qty": 2, "unitPrice": 2999 },
    { "productId": "prod-002", "provider": "default", "qty": 1, "unitPrice": 4999 }
  ]
}
```

**Sample response (200):**
```json
{
  "userId": "674a1b2c3d4e5f6789012345",
  "items": [
    { "productId": "prod-001", "provider": "default", "qty": 2, "unitPrice": 2999, "metadata": {} },
    { "productId": "prod-002", "provider": "default", "qty": 1, "unitPrice": 4999, "metadata": {} }
  ]
}
```

---

## 7. Get cart (requires JWT)

**GET** `/v1/mobile/cart`  
**Header:** `Authorization: Bearer <accessToken>`

**Sample response (200):**
```json
{
  "userId": "674a1b2c3d4e5f6789012345",
  "items": [
    { "productId": "prod-001", "provider": "default", "qty": 2, "unitPrice": 2999, "metadata": {} }
  ]
}
```

---

## 8. Save address – billing same as shipping (requires JWT)

**POST** `/v1/mobile/address`  
**Header:** `Authorization: Bearer <accessToken>`

**Request body:**
```json
{
  "shipping": {
    "line1": "123 Main St",
    "line2": "Apt 4",
    "city": "Mumbai",
    "state": "MH",
    "pincode": "400001",
    "country": "IN"
  },
  "billingSameAsShipping": true
}
```

**Sample response (200):**
```json
{
  "userId": "674a1b2c3d4e5f6789012345",
  "shipping": {
    "line1": "123 Main St",
    "line2": "Apt 4",
    "city": "Mumbai",
    "state": "MH",
    "pincode": "400001",
    "country": "IN"
  },
  "billing": {
    "line1": "123 Main St",
    "line2": "Apt 4",
    "city": "Mumbai",
    "state": "MH",
    "pincode": "400001",
    "country": "IN"
  }
}
```

---

## 9. Save address – different billing (requires JWT)

**POST** `/v1/mobile/address`

**Request body:**
```json
{
  "shipping": {
    "line1": "123 Main St",
    "city": "Mumbai",
    "state": "MH",
    "pincode": "400001",
    "country": "IN"
  },
  "billing": {
    "line1": "456 Office Blvd",
    "city": "Mumbai",
    "state": "MH",
    "pincode": "400002",
    "country": "IN"
  },
  "billingSameAsShipping": false
}
```

**Sample response (200):** Same shape as above with your shipping and billing objects.

---

## 10. Get address (requires JWT)

**GET** `/v1/mobile/address`  
**Header:** `Authorization: Bearer <accessToken>`

**Sample response (200):**
```json
{
  "shipping": {
    "line1": "123 Main St",
    "line2": "Apt 4",
    "city": "Mumbai",
    "state": "MH",
    "pincode": "400001",
    "country": "IN"
  },
  "billing": {
    "line1": "123 Main St",
    "line2": "Apt 4",
    "city": "Mumbai",
    "state": "MH",
    "pincode": "400001",
    "country": "IN"
  }
}
```

---

## Suggested retest order

1. **POST** `/v1/mobile/generate-otp` with `{ "mobile": "9876543210" }`.
2. **POST** `/v1/mobile/validate-otp` with `{ "mobile": "9876543210", "otp": "1234" }` → copy `accessToken` and `sessionId`.
3. **GET** `/v1/mobile/sessions` with `Authorization: Bearer <accessToken>`.
4. **POST** `/v1/mobile/sessions/<sessionId>/messages` with `{ "message": "Show me laptops" }`.
5. **GET** `/v1/mobile/sessions/<sessionId>/messages` to see user + assistant messages.
6. **POST** `/v1/mobile/cart` with the cart items JSON above.
7. **GET** `/v1/mobile/cart`.
8. **POST** `/v1/mobile/address` with shipping (and optional billing).
9. **GET** `/v1/mobile/address`.

Use the same `accessToken` for all authenticated requests. Use the `sessionId` from step 2 in steps 4 and 5.
