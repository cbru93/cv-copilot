# CV Enhancement Tool

A Next.js application that uses AI to analyze and improve CV summaries and key assignment descriptions based on company guidelines.

## Features

- Upload and analyze CV documents (PDF)
- Use default checklist or upload a custom one
- Choose between different AI model providers (OpenAI, Anthropic, Mistral, Google)
- Analyze CV summaries or key assignments sections
- Get detailed feedback and improvement suggestions
- Copy improved versions directly to clipboard

## Tech Stack

- **Framework**: Next.js
- **AI Integration**: Vercel AI SDK
- **Styling**: Tailwind CSS
- **PDF Parsing**: pdf-parse
- **Supported AI Providers**: OpenAI, Anthropic, Mistral, Google

## Getting Started

### Prerequisites

- Node.js 18+ (20.19.1 recommended)
- API keys for at least one of the supported AI providers

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/cv-copilot.git
cd cv-copilot
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file in the root directory and add your API keys:

```
# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key

# Mistral
MISTRAL_API_KEY=your_mistral_api_key

# Google
GOOGLE_API_KEY=your_google_api_key
```

### Running the Application

Start the development server:

```bash
npm run dev
```

The application will be available at http://localhost:3000.

## Usage

1. Upload your CV (PDF format)
2. Optionally upload a custom checklist (TXT format) or use the default
3. Select the AI model to use
4. Choose between analyzing CV Summary or Key Assignments
5. Click "Analyze" to start the process
6. Review the analysis results and copy improved versions

## Deployment

This application can be deployed to Vercel:

```bash
npm install -g vercel
vercel
```

## License

This project is licensed under the MIT License.
