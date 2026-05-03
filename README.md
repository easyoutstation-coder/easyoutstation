# EasyOutstation - Premium Car Rental Platform

## Overview

A modern, AI-driven, full-stack car rental platform built with React, TypeScript, tRPC, Drizzle ORM, and MySQL. The platform preserves all original EasyOutstation pricing and business logic while delivering a premium user experience similar to Airbnb/Uber.

## Tech Stack

### Frontend
- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS** + **shadcn/ui** components
- **tRPC** for type-safe API calls
- **React Query** for server state management
- **React Router v7** for client-side routing
- **date-fns** for date formatting

### Backend
- **Hono** + **tRPC 11.x** for type-safe APIs
- **Drizzle ORM** with **MySQL**
- **OAuth 2.0** authentication
- **Superjson** for serialization

### AI Features
- Rule-based AI chatbot for customer queries
- AI car recommendation engine based on route, passengers, and budget
- Voice search integration (Web Speech API)
- Personalized homepage with trending searches

## Design System

### Colors
- **Primary**: `#f59e0b` (Amber/Gold) - CTA buttons, highlights, badges
- **Background**: `#ffffff` (Light) / `#0f172a` (Dark mode slate)
- **Foreground**: `#0f172a` (Text)
- **Muted**: `#f1f5f9` (Secondary backgrounds)
- **Border**: `#e2e8f0` (Input borders)
- **Destructive**: `#ef4444` (Errors)

### Typography
- **Headings**: Playfair Display (serif) - Premium, editorial feel
- **Body**: Inter (sans-serif) - Clean, modern readability

### Spacing & Radius
- Base radius: `0.75rem` (12px)
- Card radius: `1rem` (16px)
- Max content width: `1280px` (max-w-7xl)

## Component Structure

```
src/
├── components/
│   ├── Navbar.tsx          # Responsive navigation with auth state
│   ├── Footer.tsx          # Site footer with links & social
│   ├── AIChatbot.tsx       # Floating AI assistant with voice
│   └── ui/                 # shadcn/ui components (40+)
├── sections/
│   ├── HeroSection.tsx      # Hero with search widget
│   ├── PopularCarsSection.tsx # AI-curated car grid
│   ├── PopularRoutesSection.tsx # Trending destinations
│   ├── FeaturesSection.tsx  # Why Choose Us grid
│   ├── TestimonialsSection.tsx # Customer reviews
│   └── CTASection.tsx      # Final call-to-action
├── pages/
│   ├── Home.tsx            # Landing page (composes sections)
│   ├── Cars.tsx            # Car listing with filters
│   ├── CarDetail.tsx       # Car detail + booking CTA
│   ├── Booking.tsx         # 3-step checkout flow
│   ├── Dashboard.tsx       # User bookings & searches
│   ├── Login.tsx           # OAuth login page
│   └── NotFound.tsx        # 404 page
├── hooks/
│   └── useAuth.ts          # Authentication hook
├── providers/
│   └── trpc.tsx            # tRPC client provider
└── App.tsx                 # Route definitions

api/
├── router.ts               # Main tRPC router
├── car-router.ts           # Car queries & reviews
├── route-booking-router.ts # Routes, bookings, searches
├── ai-router.ts            # AI chat & recommendations
├── auth-router.ts          # OAuth authentication
├── middleware.ts           # tRPC procedures (public/authed/admin)
└── context.ts              # Request context

db/
├── schema.ts               # Database tables
├── relations.ts            # Drizzle relations
└── seed.ts                 # Seed data (cars, routes)
```

## Database Schema

### Tables
1. **users** - OAuth users with roles (user/admin)
2. **cars** - Vehicle inventory with pricing, features, images
3. **routes** - Popular travel routes with distances
4. **bookings** - Customer bookings with status tracking
5. **userSearches** - Search history for AI personalization
6. **carReviews** - Customer ratings and reviews
7. **subscriptions** - Monthly rental plans (Silver/Gold/Platinum)

## Preserved Business Logic

All original EasyOutstation pricing preserved:

| Car | Rate/km | Seats | Category |
|-----|---------|-------|----------|
| Swift Dzire | ₹12 | 4+1 | Sedan |
| Toyota Etios | ₹13 | 4+1 | Sedan |
| Maruti Ertiga | ₹15 | 6+1 | MUV |
| Mahindra Xylo | ₹16 | 6+1 | SUV |
| Kia Carens | ₹17 | 6+1 | Premium |
| Toyota Innova | ₹19 | 6+1 | MUV |
| Innova Crysta | ₹20 | 6+1 | Premium |
| Innova Hycross | ₹22 | 6+1 | Luxury |

- Driver charges: ₹400/day
- Minimum km: 250 km/day
- Extra: Road tax, toll, parking (as applicable)

## Core Features Implemented

### Modern UI/UX
- Mobile-first responsive design
- Smooth animations (fade-in, slide-up, scale-in)
- Premium typography with Playfair Display + Inter
- Dark mode support via CSS variables
- Lazy loading images with blur placeholders

### AI-Driven Features
- **Smart AI Chatbot**: Handles pricing, booking, route, and support queries with contextual responses
- **AI Recommendations**: Suggests cars based on passengers, route (hill detection), and budget
- **Voice Search**: Web Speech API for hands-free car/route search
- **Personalized Homepage**: Recent searches and popular cars based on user behavior

### Booking Flow (3 Steps)
1. **Trip Details**: Route, dates, passengers, pickup address
2. **Personal Info**: Name, phone, email
3. **Review & Pay**: Price breakdown, terms confirmation

### Authentication
- OAuth 2.0 login/signup
- Protected dashboard with booking history
- User role management (user/admin)

### Filters & Search
- Category, fuel type, transmission, seats, price range
- Text search with voice input
- Real-time filter updates

## SEO & Performance

- Semantic HTML structure
- Meta tags and Open Graph ready
- Image optimization with lazy loading
- CSS variables for theming
- Tree-shaking and code splitting via Vite

## Deployment Instructions

### Prerequisites
- Node.js 20+
- MySQL database
- Environment variables configured in `.env`

### Setup
```bash
# 1. Install dependencies
npm install

# 2. Push database schema
npm run db:push

# 3. Seed data (optional)
npx tsx db/seed.ts

# 4. Start development server
npm run dev

# 5. Build for production
npm run build

# 6. Start production server
npm start
```

### Environment Variables
```env
DATABASE_URL=mysql://user:pass@host:3306/db
VITE_KIMI_AUTH_URL=https://auth.example.com
VITE_APP_ID=your_app_id
```

## Future AI Enhancement Suggestions

1. **ML-Based Pricing Predictions**: Integrate demand forecasting for dynamic visual pricing
2. **NLP Booking Extraction**: Parse WhatsApp/email inquiries into structured bookings
3. **Driver Behavior Scoring**: ML model to rate and match drivers to customer preferences
4. **Route Optimization**: AI-powered route suggestions avoiding traffic/weather
5. **Image Recognition**: Allow users to upload photos of their group for automatic car size recommendation
6. **Sentiment Analysis**: Analyze reviews to automatically flag maintenance needs
7. **Chatbot LLM Upgrade**: Replace rule-based with fine-tuned LLM for more natural conversations
8. **Predictive Maintenance**: Alert fleet managers before vehicles need service

## Scalability Architecture

- Modular component design for multi-city expansion
- Database schema supports multiple locations
- tRPC routers organized by feature for easy extension
- Reusable filter/search components
- Subscription model ready for SaaS expansion
