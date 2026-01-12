# Stripe Removal Walkthrough

## Summary

Successfully removed **Stripe** payment gateway from the project. Now only **Razorpay** is used for payments.

---

## Files Modified

### Backend

| File | Changes |
|------|---------|
| [payment.ts](file:///f:/vscode_programs/harkirat2.0/photo-ai/photo-ai/apps/backend/services/payment.ts) | Removed Stripe import, `createStripeSession()`, `getStripeSession()`, `verifyStripePayment()` |
| [payment.routes.ts](file:///f:/vscode_programs/harkirat2.0/photo-ai/photo-ai/apps/backend/routes/payment.routes.ts) | Removed Stripe routes: `/stripe/verify`, `/webhook`, `/verify`. Removed `method` parameter from `/create` |
| [.env](file:///f:/vscode_programs/harkirat2.0/photo-ai/photo-ai/apps/backend/.env) | Removed `NEXT_PUBLIC_STRIPE_KEY`, `STRIPE_SECRET_KEY` |

### Frontend

| File | Changes |
|------|---------|
| [usePayment.ts](file:///f:/vscode_programs/harkirat2.0/photo-ai/photo-ai/apps/web/hooks/usePayment.ts) | Removed `@stripe/stripe-js` import, removed `stripePromise`, changed to always use Razorpay |
| [PaymentSuccessContent.tsx](file:///f:/vscode_programs/harkirat2.0/photo-ai/photo-ai/apps/web/components/payment/PaymentSuccessContent.tsx) | Removed Stripe verification logic (session_id handling) |
| [.env](file:///f:/vscode_programs/harkirat2.0/photo-ai/photo-ai/apps/web/.env) | Removed `NEXT_PUBLIC_STRIPE_KEY`, `STRIPE_SECRET_KEY` |

### Docker

| File | Changes |
|------|---------|
| [docker-compose.yml](file:///f:/vscode_programs/harkirat2.0/photo-ai/photo-ai/docker-compose.yml) | Removed all Stripe env vars from backend and frontend services |

---

## Remaining Payment Flow

```
User clicks "Buy Credits"
       ↓
Frontend calls POST /payment/create
       ↓
Backend creates Razorpay order
       ↓
Razorpay checkout opens
       ↓
User completes payment
       ↓
Redirect to /payment/verify
       ↓
Frontend calls POST /payment/razorpay/verify
       ↓
Backend verifies signature, adds credits
       ↓
Success page shows
```

---

## Environment Variables (Current)

**Backend** only needs:
```env
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="..."
```

**Frontend** only needs:
```env
RAZORPAY_KEY_ID="rzp_test_..."    # Optional, passed from backend
RAZORPAY_KEY_SECRET="..."          # Optional, for verification fallback
```
