# PrestigePages - Premium Book Store

## Overview
PrestigePages is a premium book store web application featuring a clean, modern design and Firebase integration for authentication and data management. The application allows users to browse books, create accounts, manage wishlists, and handle shopping cart functionality.

## Project Architecture

### Frontend
- **Technology**: Static HTML/CSS/JavaScript with ES6 modules
- **Structure**: 
  - `public/` - All frontend assets and pages
  - `public/js/` - JavaScript modules for different pages
  - `public/css/` - Stylesheets for different pages
  - `public/images/` - Static assets

### Backend Services
- **Firebase Authentication**: User registration and login
- **Firebase Firestore**: User data, cart, and wishlist storage
- **Firebase Cloud Functions**: OTP verification for signup
- **EmailJS**: Email delivery for OTP codes

### Server Setup
- **Node.js + Express**: Serves static files from public/ directory
- **Port**: 5000 (configured for Replit environment)
- **Hosting**: Serves all routes through index.html (SPA routing)

## Current State
- ✅ Firebase integration configured and centralized
- ✅ Server running on port 5000 with Express
- ✅ All static files properly served
- ✅ Authentication flow functional
- ✅ Deployment configuration set for autoscale

## Key Features
1. **User Authentication**: Firebase auth with email/password
2. **Book Catalog**: Browse and search books with filters
3. **Shopping Cart**: Add/remove items, persist across sessions
4. **Wishlist**: Save favorite books to user account
5. **User Profile**: Manage personal information and address
6. **Responsive Design**: Mobile-friendly interface

## Recent Changes
- **2025-09-26**: Migrated from Firebase hosting to Replit
- **2025-09-26**: Centralized Firebase configuration in `/public/js/firebase-config.js`
- **2025-09-26**: Set up Express server for static file serving
- **2025-09-26**: Configured deployment for autoscale

## User Preferences
- Maintain existing Firebase backend functionality
- Keep clean, minimal UI design
- Preserve mobile responsiveness
- Maintain security best practices

## Dependencies
- **express**: Web server framework
- **Firebase JS SDK**: Authentication and database
- **EmailJS**: Email service for OTP delivery

## Development Setup
1. Install dependencies: `npm install`
2. Start development server: `npm start`
3. Server runs on http://0.0.0.0:5000

## Deployment
- Configured for Replit autoscale deployment
- Uses Node.js server to serve static files
- Production command: `node server.js`

## Security Notes
- Firebase config values are public (client-side requirement)
- OTP verification adds security layer to signup
- User data stored securely in Firestore