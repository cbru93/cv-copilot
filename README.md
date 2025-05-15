# CV Enhancement Tool

A Next.js application that uses AI to analyze and improve CV summaries and key assignment descriptions based on company guidelines.

## Features

- Upload and analyze CV documents (PDF)
- Use default checklist or upload a custom one
- Choose between different AI model providers (OpenAI, Anthropic, Mistral, Google)
- Analyze CV summaries or key assignments sections
- Get detailed feedback and improvement suggestions
- Copy improved versions directly to clipboard
- **Agent-based CV evaluation** with structured feedback and ratings across multiple criteria
- Direct PDF processing using AI SDK's native file handling capabilities
- Support for both structured (OpenAI) and text-based (Anthropic) evaluation outputs

## Tech Stack

- **Framework**: Next.js 15
- **AI Integration**: Vercel AI SDK with multi-agent capabilities and native PDF handling
- **UI Components**: Combination of custom components and Digdir Design System
- **Styling**: Tailwind CSS
- **Supported AI Providers**: 
  - OpenAI (GPT-4o recommended for best results with agent evaluation)
  - Anthropic (Claude models)
  - Mistral (text-only analysis)
  - Google (text-only analysis)

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
3. Select the AI model to use (OpenAI GPT-4o recommended for agent-based evaluation)
4. Choose between analyzing CV Summary, Key Assignments, or using the Agent-based CV Evaluation
5. Click "Analyze" to start the process
6. Review the analysis results and copy improved versions

## Architecture

The application uses a client-side Next.js frontend with server-side API routes for AI processing:

- `/api/analyze-cv` - Handles basic CV summary and key assignments analysis
- `/api/agent-cv-evaluation` - Implements multi-agent evaluation with specialized tools for each evaluation criterion

The agent-based evaluation uses the AI SDK's tool calling capabilities to create a structured evaluation workflow where specialized evaluation tools assess each aspect of the CV, then provide a comprehensive assessment.

## Deployment

### Deploying to Vercel

The simplest deployment option is Vercel:

```bash
npm install -g vercel
vercel
```

### Deploying to Azure

To deploy to Azure App Service:

1. Create an Azure App Service (Web App):

```bash
az login
az group create --name cv-copilot-rg --location westeurope
az appservice plan create --name cv-copilot-plan --resource-group cv-copilot-rg --sku B1
az webapp create --name cv-copilot --resource-group cv-copilot-rg --plan cv-copilot-plan --runtime "NODE:20-lts"
```

2. Configure environment variables:

```bash
az webapp config appsettings set --resource-group cv-copilot-rg --name cv-copilot --settings OPENAI_API_KEY=your_key ANTHROPIC_API_KEY=your_key WEBSITE_NODE_DEFAULT_VERSION=~20
```

3. Build and deploy the application:

```bash
npm run build
zip -r deployment.zip .next package.json next.config.mjs .env.local public
az webapp deploy --resource-group cv-copilot-rg --name cv-copilot --src-path deployment.zip
```

Alternatively, you can set up continuous deployment from GitHub:

```bash
az webapp deployment source config --name cv-copilot --resource-group cv-copilot-rg --repo-url https://github.com/yourusername/cv-copilot --branch main
```

## License

This project is licensed under the MIT License.
