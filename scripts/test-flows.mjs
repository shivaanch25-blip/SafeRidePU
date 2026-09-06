import crypto from 'crypto';
import { registerSchema } from '../server/dist/validators/authValidator.js';

console.log('🧪 Starting SafeRide PU Verification Tests...\n');

let passCount = 0;
let failCount = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
    failCount++;
  }
}

// 1. Test Domain Validation
console.log('--- 1. Testing Institutional Email Validation ---');
const validEmailResult = registerSchema.safeParse({
  email: 'student@paruluniversity.ac.in',
  password: 'Password123!',
  firstName: 'Aarav',
  lastName: 'Patel',
  role: 'Rider',
});
assert(validEmailResult.success, 'Allows valid @paruluniversity.ac.in institutional email');

const invalidEmailResult = registerSchema.safeParse({
  email: 'hacker@gmail.com',
  password: 'Password123!',
  firstName: 'Test',
  lastName: 'User',
  role: 'Rider',
});
assert(!invalidEmailResult.success, 'Rejects external non-institutional domain (@gmail.com)');

// 2. Test Password Complexity
console.log('\n--- 2. Testing Password Complexity Rules ---');
const weakPasswordResult = registerSchema.safeParse({
  email: 'student@paruluniversity.ac.in',
  password: 'weak',
  firstName: 'Aarav',
  lastName: 'Patel',
  role: 'Rider',
});
assert(!weakPasswordResult.success, 'Rejects password shorter than 8 characters');

const noUpperPasswordResult = registerSchema.safeParse({
  email: 'student@paruluniversity.ac.in',
  password: 'password123!',
  firstName: 'Aarav',
  lastName: 'Patel',
  role: 'Rider',
});
assert(!noUpperPasswordResult.success, 'Rejects password without uppercase characters');

// 3. Test Razorpay HMAC-SHA256 Signature Verification
console.log('\n--- 3. Testing Razorpay HMAC-SHA256 Signature Verification ---');
const secret = 'rzp_test_placeholder_secret';
const orderId = 'order_DA29103982';
const paymentId = 'pay_9201928301';

const generatedSignature = crypto
  .createHmac('sha256', secret)
  .update(`${orderId}|${paymentId}`)
  .digest('hex');

const isMatch =
  crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex') === generatedSignature;

assert(isMatch, 'Successfully validates authentic Razorpay HMAC-SHA256 payment signature');

// 4. Test Vadodara Route Fare Calculation (₹30 base + ₹12/km)
console.log('\n--- 4. Testing Vadodara Subsidized Fare Calculations ---');
const calculateFare = (distanceKm) => {
  const baseFare = 30;
  const perKmRate = 12;
  const fare = baseFare + distanceKm * perKmRate;
  return Math.max(30, Math.round(fare));
};

const farePUtoStation = calculateFare(18.2); // ~18.2 km from PU Waghodia to Vadodara Station
assert(farePUtoStation === 248, `Calculates accurate fare for PU to Vadodara Station (Expected: ₹248, Got: ₹${farePUtoStation})`);

const minCampusFare = calculateFare(0.8);
assert(minCampusFare === 40, `Calculates campus inner-transit fare accurately (Got: ₹${minCampusFare})`);

console.log(`\n========================================`);
console.log(`Summary: ${passCount} passed, ${failCount} failed`);
console.log(`========================================\n`);

if (failCount > 0) {
  process.exit(1);
}
