#!/bin/bash

echo "Setting up LocalStack resources..."

# Set AWS CLI to use LocalStack
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_ENDPOINT_URL=http://localhost:4566

docker-compose up -d


aws --endpoint-url=http://localhost:4566 s3 mb s3://my-file-uploads
aws --endpoint-url=http://localhost:4566 dynamodb create-table \
    --table-name FileMetadata \
    --attribute-definitions \
        AttributeName=file_id,AttributeType=S \
        AttributeName=author_name,AttributeType=S \
        AttributeName=upload_date,AttributeType=S \
        AttributeName=category,AttributeType=S \
        AttributeName=file_type,AttributeType=S \
        AttributeName=extracted_at,AttributeType=S \
    --key-schema AttributeName=file_id,KeyType=HASH \
    --global-secondary-indexes \
        IndexName=AuthorIndex,KeySchema='[{AttributeName=author_name,KeyType=HASH}]',Projection='{ProjectionType=ALL}',ProvisionedThroughput='{ReadCapacityUnits=5,WriteCapacityUnits=5}' \
        IndexName=UploadDateIndex,KeySchema='[{AttributeName=upload_date,KeyType=HASH}]',Projection='{ProjectionType=ALL}',ProvisionedThroughput='{ReadCapacityUnits=5,WriteCapacityUnits=5}' \
        IndexName=CategoryIndex,KeySchema='[{AttributeName=category,KeyType=HASH}]',Projection='{ProjectionType=ALL}',ProvisionedThroughput='{ReadCapacityUnits=5,WriteCapacityUnits=5}' \
        IndexName=FileTypeIndex,KeySchema='[{AttributeName=file_type,KeyType=HASH}]',Projection='{ProjectionType=ALL}',ProvisionedThroughput='{ReadCapacityUnits=5,WriteCapacityUnits=5}' \
        IndexName=ExtractedAtIndex,KeySchema='[{AttributeName=extracted_at,KeyType=HASH}]',Projection='{ProjectionType=ALL}',ProvisionedThroughput='{ReadCapacityUnits=5,WriteCapacityUnits=5}' \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5

