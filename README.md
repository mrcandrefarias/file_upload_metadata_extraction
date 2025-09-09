# File Upload Metadata Extraction API


## 🛠️ Prerequisites

- **Node.js** 18.x or higher
- **Docker** and **Docker Compose**
- **AWS SAM CLI** (for local development)

## 📦 Installation & Setup

### 1. Clone and Install Dependencies
```bash
git clone git@github.com:mrcandrefarias/file_upload_metadata_extraction.git
cd file_upload_metadata_extraction
npm install
```

### 2. Start LocalStack
```bash
./start_localstack.sh
```

This script will:
- Start LocalStack Docker container
- Create S3 bucket (`my-file-uploads`)
- Create DynamoDB table (`FileMetadata`) with GSI indexes
- Set up AWS credentials for LocalStack

### 3. Build and Start Lambda Function
```bash
sam build
sam local start-api --host 0.0.0.0 --port 3000
```

The API will be available at `http://localhost:3000`

## Testing

### Test Upload a file:
```bash
curl -X POST http://localhost:3000/upload \
  -H "Content-Type: application/json" \
  -d '{
    "file_data": "data:text/plain;base64,SGVsbG8gV29ybGQh",
    "file_name": "test.txt",
    "file_type": "text/plain",
    "metadata": {
      "author_name": "Test User",
      "description": "Test file upload"
    }
  }'
```

**Store the returned ID for use below**

### 3. Test S3 Trigger (Metadata Extraction)
```bash
# Create an S3 event file for testing
cat > s3-event.json << EOF
{
  "Records": [
    {
      "eventName": "ObjectCreated:Put",
      "s3": {
        "bucket": {"name": "my-file-uploads"},
        "object": {"key": "{returned id}.txt"}
      }
    }
  ]
}
EOF

# Note: LocalStack S3 events don't automatically trigger Lambda functions
# To test metadata extraction, manually invoke the function:
sam local invoke S3MetadataExtractorFunction --event s3-event.json
```

### Test Get metadata:
```bash
curl http://localhost:3000/metadata/{returned id}
```


## Architecture Decisions

### 1. JSON over Multipart Form Data
**Decision**: Use JSON with base64-encoded files instead of multipart form data.

**Rationale**:
- AWS Lambda handles JSON more reliably than multipart data
- Avoids encoding issues with binary data in Lambda runtime
- Simpler parsing and error handling
- Better compatibility with API Gateway

### 2. Single Lambda Handler
**Decision**: Use one Lambda function to handle multiple endpoints.

**Rationale**:
- Reduces cold start overhead
- Simpler deployment and management
- Shared environment variables and dependencies
- Cost-effective for small to medium applications


### 5. LocalStack for Development
**Decision**: Use LocalStack instead of AWS services for local development.

**Rationale**:
- No AWS costs during development
- Faster iteration cycles
- Offline development capability
- Identical API to AWS services


## 📝 Assumptions Made

### 1. File Size Limits
- **Assumption**: Files will be under Lambda's 6MB payload limit
- **Impact**: Large files would need S3 pre-signed URLs or direct upload

### 2. Metadata Schema
- **Assumption**: Fixed metadata schema with common fields (author, description, etc.)
- **Impact**: Schema changes would require database migrations

### 3. Single Region Deployment
- **Assumption**: Application will be deployed in a single AWS region
- **Impact**: Multi-region deployment would need additional configuration

### 4. LocalStack Compatibility
- **Assumption**: LocalStack behavior matches AWS services exactly
- **Impact**: Production deployment might have subtle differences

### 5. Authentication
- **Assumption**: No authentication/authorization required for MVP
- **Impact**: Production deployment would need security layers

## 📁 Project Structure

```
file_upload_metadata_extraction/
├── lambda_api.js            # Main Lambda handler (upload & metadata retrieval)
├── upload.js                # File upload logic
├── get-metadata.js          # Metadata retrieval logic
├── metadata_extraction.js   # metadata extraction logic
├── s3-trigger-handler.js    # S3 trigger Lambda handler
├── config/
│   └── aws-config.js        # Centralized AWS configuration
├── template.yml             # SAM template
├── package.json             # Node.js dependencies
├── docker-compose.yml       # LocalStack configuration
├── start_localstack.sh      # LocalStack setup script
```

## Environment Variables

- `BUCKET_NAME`: S3 bucket name (default: `my-file-uploads`)
- `TABLE_NAME`: DynamoDB table name (default: `FileMetadata`)

## Error Handling & Dead Letter Queue

The S3MetadataExtractorFunction is configured with a Dead Letter Queue (DLQ) for handling failed events:

- **Retry Logic**: When metadata extraction fails, the Lambda function throws an exception
- **Automatic Retries**: AWS Lambda automatically retries failed invocations
- **DLQ Fallback**: After all retries are exhausted, failed events are sent to the `metadata-extraction-dlq` SQS queue
- **Message Retention**: DLQ messages are retained for 14 days for analysis and reprocessing

### Additional Environment Variables

- `LOCALSTACK_ENDPOINT`: LocalStack endpoint URL
- `AWS_REGION`: AWS region (default: `us-east-1`)

## Production Deployment

For production deployment:

1. Remove LocalStack endpoint configuration
2. Use real AWS credentials
3. Deploy with `sam deploy --guided`
4. Add authentication/authorization
5. Implement proper error logging
6. Add monitoring and alerting
