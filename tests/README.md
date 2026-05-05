# EasyOutstation Automated Tests

## Setup (run once)

```bash
cd ~/Downloads/car-rental\ 3/app
npm install
npx playwright install
```

## Run All Tests

```bash
npx playwright test
```

## Run Specific Test Suite

```bash
# Page load tests only
npx playwright test --grep "Page Load"

# Auth tests only
npx playwright test --grep "Authentication"

# Mobile tests only
npx playwright test --grep "Mobile"

# Critical user journeys
npx playwright test --grep "Critical"
```

## Run on Specific Browser

```bash
# Chrome only (fastest)
npx playwright test --project=chromium

# Mobile only
npx playwright test --project=mobile-chrome
```

## View Test Report

```bash
npx playwright show-report
```

## Test Coverage

| Suite | Tests | What it checks |
|---|---|---|
| Page Load | 10 | All pages load, no 404s, footer links |
| Auth | 5 | Login, signup, wrong credentials, auth gate |
| Booking Widget | 5 | Trip types, passengers, validation, date picker |
| Cars & Fare | 6 | Route banner, toll charges, fare calculation |
| FAQ | 2 | Accordion expand/collapse |
| Mobile | 3 | Mobile layout, WhatsApp button |
| User Journeys | 3 | Full browse → book flow, footer links |

**Total: 34 automated tests across 4 browsers**

## Before Each Release Checklist

Run: `npx playwright test --project=chromium`

All 34 tests should pass before pushing to production.
