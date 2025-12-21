# Serverless Financial Dashboard

Production-ready serverless API for investment management using AWS Lambda, API Gateway, and DynamoDB.

## Prerequisites

- **Docker Desktop** - Must be running for local development
- **AWS CLI** - Configured with credentials (`aws configure`)
- **SAM CLI** - Version 1.148.0 or higher ([Installation Guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html))
- **Node.js** - Version 20.x or higher

## Project Structure

```
serverless-financial-dashboard/
├── src/
│   ├── handlers/          # Lambda entry points (thin handlers)
│   │   └── investment.ts
│   ├── services/          # Business logic layer
│   │   └── investmentService.ts
│   ├── utils/             # Shared utilities
│   │   ├── dynamoClient.ts      # DynamoDB client (initialized outside handler)
│   │   ├── investmentRepository.ts  # Data access layer
│   │   ├── responseHelper.ts    # API response formatting
│   │   └── validators.ts         # Input validation
│   ├── package.json
│   └── local-env.json     # Local development environment variables
├── events/                 # Sample events for testing
├── template.yaml           # SAM/CloudFormation template
├── samconfig.toml         # SAM CLI configuration
└── README.md
```

## Architecture

This project follows the **Thin Handler Pattern**:

- **Handlers** (`src/handlers/`): Thin Lambda entry points that delegate to services
- **Services** (`src/services/`): Business logic and orchestration
- **Repository** (`src/utils/investmentRepository.ts`): Data access layer
- **Utils**: Shared utilities (DynamoDB client, validators, response helpers)

### Key Features

- ✅ **Dependency Injection**: AWS SDK clients initialized outside handlers for execution context reuse
- ✅ **AWS SDK v3**: Modular imports to reduce cold start times
- ✅ **Separation of Concerns**: Clear separation between handlers, services, and data access
- ✅ **Error Handling**: Proper try/catch with structured error responses
- ✅ **Least Privilege IAM**: Scoped DynamoDB permissions only

## Local Development

### 1. Build the project

The project uses TypeScript and esbuild for compilation. The build process:
- Compiles TypeScript files to JavaScript using esbuild
- Bundles dependencies (excluding AWS SDK for smaller bundle size)
- Minifies output for production

```bash
# Build TypeScript files (runs automatically during sam build)
cd src && npm run build

# Build SAM application
cd .. && sam build
```

### 2. Start local API server

```bash
sam local start-api --env-vars src/local-env.json
```

The API will be available at `http://127.0.0.1:3000`

### 3. Test the API

```bash
# Get all investments
curl http://127.0.0.1:3000/investment

# Query by year
curl "http://127.0.0.1:3000/investment?year=2024"

# Get specific investment
curl http://127.0.0.1:3000/investment/47

# Create investment
curl -X POST http://127.0.0.1:3000/investment \
  -H "Content-Type: application/json" \
  -d '{
    "target": "ETF",
    "type1": "股票",
    "type2": "美股",
    "year": "2025",
    "price": 1000,
    "currency": "USD",
    "account": "测试账户",
    "owner": "测试用户"
  }'
```

### Environment Configuration

Edit `src/local-env.json` to configure:
- `INVESTMENT_TABLE_NAME`: Your DynamoDB table name
- `AWS_REGION`: AWS region where your table is located

## Production Deployment

### 1. Build

```bash
sam build
```

### 2. Deploy

```bash
# First-time deployment (guided)
sam deploy --guided

# Subsequent deployments
sam deploy
```

### 3. Deploy to specific environment

```bash
# Development environment
sam deploy --config-env dev

# Production environment (default)
sam deploy --config-env default
```

### Configuration

The `samconfig.toml` file contains environment-specific configurations:
- **default**: Production environment
- **dev**: Development environment
- **local**: Local development settings

### Parameters

- `InvestmentTableName`: DynamoDB table name (default: `investment`)
- `Environment`: Deployment environment - `dev` or `prod` (default: `prod`)

## API Endpoints

- `GET /investment` - List all investments (supports query parameters)
- `GET /investment/{id}` - Get investment by ID
- `POST /investment` - Create new investment
- `PUT /investment/{id}` - Update investment
- `DELETE /investment/{id}` - Delete investment

### Query Parameters

All fields support filtering:
- `year`, `owner`, `currency`, `type1`, `type2`, `target`, `account`, `price`, `id`
- Multiple filters: `?year=2024&owner=李娇&currency=JPY`
- Sorting: `?sort_by=price` (ascending) or `?sort_by=-price` (descending)

## Infrastructure

### Resources Created

- **API Gateway**: RESTful API endpoint
- **Lambda Function**: Serverless compute
- **IAM Role**: Least privilege DynamoDB access

### IAM Permissions

The Lambda function has scoped permissions:
- `dynamodb:GetItem`
- `dynamodb:PutItem`
- `dynamodb:UpdateItem`
- `dynamodb:DeleteItem`
- `dynamodb:Scan`
- `dynamodb:Query`

Only for the specified DynamoDB table.

## Troubleshooting

### Docker Issues

If you see "Docker is not reachable":
1. Ensure Docker Desktop is running
2. Run `docker ps` to verify
3. Upgrade SAM CLI: `brew upgrade aws-sam-cli`

### Build Directory Not Found

If you see "no such file or directory" for `.aws-sam/build`:
```bash
sam build
```

### AWS Credentials

Ensure AWS credentials are configured:
```bash
aws configure
```

## License

MIT
