# Control Your Business (COB)

An AI-powered business management app for shopkeepers. Features voice-to-text record keeping, debt tracking (udhari), and AI business memory using Gemini.

## Features

- **Voice First**: Record sales, expenses, and debts using your voice (Urdu/Hindi supported).
- **Daily Sessions**: "Start Shop" and "End Shop" to keep track of daily business.
- **Debt Management**: Track customer debts (Udhaar) and payments (Ardē).
- **AI Assistant**: Ask COB about your business history ("Ajj kitni sale hui?", "Ahmed ka kitna udhaar hai?").
- **WhatsApp Sync**: Manage products and prices for AI-powered WhatsApp replies.

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Motion.
- **AI**: Gemini Pro (via @google/genai).
- **Backend / DB**: Firebase (Firestore & Auth) - currently in simulated mode.

## Setup

1. Clone the repository.
2. Run `npm install`.
3. Create a `.env` file based on `.env.example` and add your `GEMINI_API_KEY`.
4. Run `npm run dev` to start the development server.

## Android Build

This app is configured with Capacitor to run as a native Android app.

### Manual Build
1. Build the web app: `npm run build`
2. Sync Capacitor: `npx cap sync android`
3. Open in Android Studio: `npx cap open android`

### GitHub Actions
A GitHub Actions workflow is included in `.github/workflows/android.yml`. When you push to the `main` branch, it will automatically build a debug APK and upload it as a workflow artifact.
