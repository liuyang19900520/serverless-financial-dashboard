# 部署指南

## 生产环境配置

项目已配置好生产环境，可以直接部署到 AWS Lambda。

### 环境变量配置

生产环境变量在 `template.yaml` 中通过参数配置：
- `InvestmentTableName`: DynamoDB 表名（默认: `investment`）
- `AwsRegion`: AWS 区域（默认: `ap-southeast-1`）

这些参数会自动传递给 Lambda 函数作为环境变量：
- `INVESTMENT_TABLE_NAME`
- `AWS_REGION`

### 部署步骤

1. **构建项目**
   ```bash
   sam build
   ```

2. **验证模板**
   ```bash
   sam validate
   ```

3. **部署到 AWS**
   ```bash
   sam deploy
   ```

   或者使用引导模式（首次部署）：
   ```bash
   sam deploy --guided
   ```

4. **部署时指定参数（可选）**
   ```bash
   sam deploy --parameter-overrides InvestmentTableName=your-table-name
   ```

### 配置文件说明

- `samconfig.toml`: SAM CLI 配置文件，包含默认部署参数
- `template.yaml`: CloudFormation/SAM 模板，定义所有 AWS 资源
- `investment/prod-env.json`: 生产环境变量参考（仅用于文档，实际部署时使用 template.yaml 中的参数）

### 部署后获取 API 端点

部署完成后，在输出中会显示 API Gateway 端点 URL，格式如下：
```
https://{api-id}.execute-api.{region}.amazonaws.com/Prod/investment
```

### 更新部署

如果代码或配置有变更，重新运行：
```bash
sam build
sam deploy
```

### 注意事项

1. 确保 AWS 凭证已配置（`aws configure`）
2. 确保 DynamoDB 表已存在且名称正确
3. Lambda 函数会自动获得访问 DynamoDB 表的权限（通过 IAM 策略）
4. 首次部署需要 `CAPABILITY_IAM` 权限（已在 samconfig.toml 中配置）

