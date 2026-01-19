#!/bin/bash
# Cross-platform development startup script for Lavirant VC

# Set Stripe key
export STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY:-sk_test_placeholder}

# Run development server
npm run dev
