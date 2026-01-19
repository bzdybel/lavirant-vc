@echo off
REM Cross-platform development startup script for Lavirant VC

REM Set Stripe key if not already set
if "%STRIPE_SECRET_KEY%"=="" (
    set STRIPE_SECRET_KEY=sk_test_placeholder
)

REM Run development server
npm run dev
