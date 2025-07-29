# MindMate Emotions Flow

A comprehensive mental wellness application that helps users understand, track, and manage their emotions through AI-powered analysis, journaling, and personalized resources.

## 🌟 Overview

MindMate Emotions Flow combines advanced AI emotion analysis with practical wellness tools to create a complete emotional wellbeing ecosystem. The app features real-time emotion detection, intelligent journaling, curated resources, and voice integration to support users on their mental health journey.

## ✨ Features

### 🧠 AI-Powered Emotion Analysis
- Real-time emotion detection from text using Qwen 3 AI model via OpenRouter API
- Voice-to-text capability for hands-free emotion analysis
- Advanced ML backend with intelligent local fallback using Hugging Face transformers
- Emotion history tracking and pattern recognition

### 📝 Smart Journaling System
- Rich text editor with automatic emotion analysis
- Tag support using hashtags (#work, #personal, #health)
- Offline-first architecture with Supabase synchronization
- Journal streaks tracking and mood analytics
- Media attachments support (images, audio)
- Privacy-focused with row-level security

### 📚 Personalized Resource Library
- Curated articles, videos, exercises, and meditations
- AI-powered content recommendations based on emotional state
- Text-to-speech integration for accessibility
- Progress tracking and bookmarking system
- Emotion-specific voice tones and characteristics

### 📊 Analytics & Insights
- Interactive emotion trends visualization
- Personalized insights and suggestions
- Most frequent emotions and patterns analysis
- Mood comparison over time
- Tag-based content organization

## 🛠️ Tech Stack

**Frontend:**
- React 18 with TypeScript
- TailwindCSS + shadcn/ui components
- Framer Motion for animations
- React Router for navigation
- Recharts for data visualization

**Backend:**
- FastAPI (Python) for ML services
- Express.js (Node.js) for API layer
- Hugging Face Transformers for local emotion analysis
- PyTorch for ML model inference

**Database & Services:**
- Supabase for authentication and data storage
- IndexedDB for offline functionality
- OpenRouter API for advanced AI features
- Firebase integration for additional services

**Development & Deployment:**
- Vite for fast development and building
- Docker & Docker Compose for containerization
- ESLint + TypeScript for code quality
- Concurrently for running multiple services

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+)
- Python (v3.8+)
- A Supabase account and project

### Easy Setup
Use our automated setup script:

```bash
# Clone the repository
git clone https://github.com/yourusername/mindmate-emotions-flow.git
cd mindmate-emotions-flow

# Run automated setup (installs all dependencies)
mindmate.bat setup
# or
npm run app:setup

# Quick start both frontend and backend
start-app.bat
# or
npm run app:quick
```

### Manual Setup

1. **Install dependencies:**
   ```bash
   npm install
   cd backend && pip install -r requirements.txt
   ```

2. **Configure environment:**
   Create `.env.local` in the project root:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   ```

3. **Setup database:**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run the contents of `supabase/schema.sql`

4. **Start development servers:**
   ```bash
   npm run dev:complete  # Starts both frontend and backend
   ```

### Application URLs
- **Frontend:** http://localhost:8080
- **Backend API:** http://localhost:8000
- **API Documentation:** http://localhost:8000/docs

## 📁 Project Structure

```
mindmate-emotions-flow/
├── src/                    # Frontend React application
│   ├── components/         # Reusable UI components
│   ├── contexts/          # React context providers
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Shared utilities and libraries
│   ├── pages/             # Page components and routing
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Helper functions
├── backend/               # Python FastAPI backend
│   ├── app.py            # Main FastAPI application
│   ├── requirements.txt   # Python dependencies
│   └── Dockerfile        # Backend container config
├── supabase/             # Database configuration
│   ├── schema.sql        # Database schema and policies
│   └── README.md         # Database setup instructions
├── public/               # Static assets
├── docker-compose.yml    # Multi-container setup
├── package.json          # Node.js dependencies and scripts
└── README.md            # This file
```

## 💻 Development

### Available Scripts

**Quick Commands:**
```bash
mindmate.bat start     # Start both services
mindmate.bat stop      # Stop all services
mindmate.bat restart   # Restart services
start-app.bat         # Quick development start
```

**NPM Scripts:**
```bash
npm run dev           # Frontend only
npm run dev:backend   # Backend only  
npm run dev:complete  # Both services concurrently
npm run build         # Production build
npm run start:all     # Production mode
```

**Database Operations:**
```bash
npm run supabase:deploy    # Deploy schema to Supabase
npm run supabase:export    # Export current schema
npm run test:supabase      # Test database connection
```

### Development Workflow

1. **Start development environment:**
   ```bash
   start-app.bat  # Opens two terminals
   ```

2. **Make changes to code** - Hot reload is enabled for both frontend and backend

3. **Test your changes** using the provided test scripts

4. **Database changes:** Update `supabase/schema.sql` and run deployment script

## 🐳 Deployment

### Docker Deployment
```bash
# Build and start with Docker Compose
docker-compose up --build

# Or use the deployment script
npm run deploy
```

### Manual Production Deployment
```bash
# Build frontend
npm run build

# Start production servers
npm run start:all
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000

## 🔧 Configuration

### Environment Variables
Create `.env.local` with:
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: OpenRouter API for advanced AI features
OPENROUTER_API_KEY=your_openrouter_key

# Backend Configuration (optional)
BACKEND_URL=http://localhost:8000
```

### Supabase Setup
The application uses Supabase for:
- User authentication and profiles
- Journal entries storage with RLS
- Real-time synchronization
- File attachments storage

Run `supabase/schema.sql` in your Supabase SQL editor to set up all required tables and policies.

## 🧪 Testing

```bash
# Test Supabase connection
npm run test:supabase

# Create test journal entries
npm run supabase:create-test

# Test emotion detection API
npm run test:emotion
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Hugging Face](https://huggingface.co/) for transformer models
- [Supabase](https://supabase.com/) for backend services
- [shadcn/ui](https://ui.shadcn.com/) for beautiful UI components
- [OpenRouter](https://openrouter.ai/) for AI API access

---

**Made with ❤️ for mental wellness**

For support or questions, please open an issue on GitHub.