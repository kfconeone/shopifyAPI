# 專案名稱

Vercel Serverless API

# 簡介

在 Vercel 上建立 Serverless API

### 語言 :

Typescript

### 主旨 :

- POST
- GET

# 快速開始

## 環境建立

- Visual Studio Code
- Nodejs

## 專案建立

1. 建立資料夾 vercel-api
2. yarn add @vercel/node -D
3. yarn add typescript -D
4. yarn run tsc --init
5. 建立 API 檔案/api/hello.ts

```typescript
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default (request: VercelRequest, response: VercelResponse) => {
  const { name } = request.query;

  console.log(request.body);
  response.status(200).send(`Hello ${name}!`);
};
```

# 佈署

1. 上傳至 github
