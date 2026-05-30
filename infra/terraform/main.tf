terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "project_name" {
  type    = string
  default = "personal-rag"
}

variable "mongodb_uri" {
  type      = string
  sensitive = true
}

variable "github_webhook_secret" {
  type      = string
  sensitive = true
  default   = ""
}

variable "gitlab_webhook_secret" {
  type      = string
  sensitive = true
  default   = ""
}

variable "embedding_provider" {
  type    = string
  default = "ollama"
}

variable "ollama_base_url" {
  type    = string
  default = ""
}

data "archive_file" "webhook_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../../packages/ingestion/src/lambda"
  output_path = "${path.module}/webhook.zip"
}

resource "aws_iam_role" "lambda_role" {
  name = "${var.project_name}-webhook-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "webhook" {
  function_name = "${var.project_name}-webhook"
  role          = aws_iam_role.lambda_role.arn
  handler       = "handler.handler"
  runtime       = "nodejs20.x"
  filename      = data.archive_file.webhook_lambda.output_path
  source_code_hash = data.archive_file.webhook_lambda.output_base64sha256
  timeout       = 30
  memory_size   = 256

  environment {
    variables = {
      MONGODB_URI           = var.mongodb_uri
      GITHUB_WEBHOOK_SECRET = var.github_webhook_secret
      GITLAB_WEBHOOK_SECRET = var.gitlab_webhook_secret
      EMBEDDING_PROVIDER    = var.embedding_provider
      OLLAMA_BASE_URL       = var.ollama_base_url
    }
  }
}

resource "aws_apigatewayv2_api" "webhook_api" {
  name          = "${var.project_name}-webhook-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.webhook_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.webhook.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "github" {
  api_id    = aws_apigatewayv2_api.webhook_api.id
  route_key = "POST /webhooks/github"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "gitlab" {
  api_id    = aws_apigatewayv2_api.webhook_api.id
  route_key = "POST /webhooks/gitlab"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.webhook_api.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.webhook.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.webhook_api.execution_arn}/*/*"
}

output "webhook_api_url" {
  value = aws_apigatewayv2_api.webhook_api.api_endpoint
}

output "github_webhook_url" {
  value = "${aws_apigatewayv2_api.webhook_api.api_endpoint}/webhooks/github"
}

output "gitlab_webhook_url" {
  value = "${aws_apigatewayv2_api.webhook_api.api_endpoint}/webhooks/gitlab"
}
