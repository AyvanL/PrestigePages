# PrestigePages - Book Store Website

## Project Overview
This is a static HTML/CSS/JavaScript book store website called "PrestigePages" that has been successfully imported and configured to run in the Replit environment.

## Architecture
- **Frontend**: Static HTML/CSS/JavaScript website served from the `public/` directory
- **Authentication**: Firebase Authentication with email/password and OTP verification
- **Database**: Firebase Firestore for user profiles, cart, and wishlist data
- **Hosting**: Python HTTP server on port 5000

## Key Features
- User authentication (signup/login with OTP verification)
- Book catalog with search and filtering
- Shopping cart functionality
- Wishlist system
- User profile management
- Responsive design

## Project Structure
```
/
├── public/                 # Static website files
│   ├── css/               # Stylesheets
│   ├── js/                # JavaScript files
│   ├── images/            # Static images
│   ├── index.html         # Homepage (non-logged users)
│   ├── homepage-logged.html # Homepage (logged users)
│   ├── login.html         # Login page
│   ├── signup.html        # Sign up page
│   ├── about-us.html      # About page
│   └── checkout.html      # Checkout page
├── firebase.json          # Firebase hosting configuration
└── replit.md             # This documentation
```

## Setup Complete
- ✅ Static HTTP server configured on port 5000
- ✅ Workflow configured to serve website
- ✅ All pages tested and working
- ✅ Deployment configuration set up for autoscale
- ✅ Firebase integration working for authentication and data storage

## Recent Changes
- **2025-09-25**: Successfully imported from GitHub and configured for Replit environment
- Configured Python HTTP server to serve static files from public/ directory
- Set up workflow to automatically serve website on port 5000
- Configured deployment settings for production autoscale hosting

## User Preferences
- Static website with Firebase backend integration
- No build process required - pure HTML/CSS/JS