# 该项目为Umami的EdgeOne Pages移植版

> [!CAUTION]
> 由于我们发现EdgeOne Pages新版的Nodejs/Nextjs存在一些问题，导致在使用Umami时会出现一些问题。
> 
> 该代码库现在添加了非常多的日志报告，可能会泄露您的敏感信息，如果您是普通用户，建议在该警告撤销后再使用

### 以下是漏洞分析报告

# Bug Report: Next.js App Router Request Body Prematurely Consumed on EdgeOne Pages

## Summary
在 Tencent Cloud EdgeOne Pages (基于 SCF) 环境下部署 Next.js (App Router) 应用时，API Route 接收到的 `Request` 对象的 Body Stream 已经被提前消费 (Consumed/Drained)，导致应用层无法读取请求体。

即使 `content-length` 标头显示请求体存在且非零，应用层调用 `request.text()` 仍返回空字符串，调用 `request.json()` 则抛出 `Body is unusable: Body has already been read` 错误。这表明平台的 Next.js 适配器在将请求传递给应用逻辑之前，已经消耗了 Body 流且未正确重置。

## Environment
- **Platform**: Tencent Cloud EdgeOne Pages (Serverless Cloud Function / SCF)
- **Framework**: Next.js (App Router)
- **Deployment Type**: Serverless / Edge
- **Issue Scope**: All API Routes handling POST/PUT requests with body

## Reproduction Steps (POC)

### 1. POC Code
在 Next.js 项目中创建 `src/app/api/debug-poc/route.ts`：

```typescript
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const logs: string[] = [];
  const log = (msg: string) => logs.push(msg);

  log(`[Start] Method: ${request.method}`);
  
  // 1. Check Headers
  const headers = Object.fromEntries(request.headers);
  const contentLength = headers['content-length'];
  log(`[Headers] content-length: ${contentLength}`);
  log(`[Headers] content-type: ${headers['content-type']}`);

  // 2. Check Body Status
  log(`[Status] request.bodyUsed before read: ${request.bodyUsed}`);

  // 3. Attempt Read
  try {
      const text = await request.text();
      log(`[Result] req.text() returned length: ${text.length}`);
      if (text.length === 0 && Number(contentLength) > 0) {
          log(`[FATAL] Content-Length is ${contentLength} but body text is empty!`);
      }
  } catch (e: any) {
      log(`[Error] req.text() failed: ${e.message}`);
  }

  // 4. Attempt JSON (to trigger specific stream error)
  try {
      // Re-reading specific error message
      await request.json();
  } catch (e: any) {
      log(`[Error] req.json() failed: ${e.message}`);
  }

  return NextResponse.json({
    platform: 'EdgeOne Pages',
    headers: { 'content-length': contentLength },
    logs
  });
}
```

### 2. Execution
发送一个带有 Body 的 POST 请求：
```bash
curl -X POST "https://your-site.edgeone.cool/api/debug-poc" \
     -H "Content-Type: application/json" \
     -d '{"test": "hello"}'
```

## Observed Logs
实际运行结果如下（基于真实环境调试）：

```json
{
    "headers": {
        "content-length": "46"
    },
    "logs": [
        "[Start] Method: POST",
        "[Headers] content-length: 46",
        "[Headers] content-type: application/json",
        "[Status] request.bodyUsed before read: false", 
        "[Result] req.text() returned length: 0",
        "[FATAL] Content-Length is 46 but body text is empty!",
        "[Error] req.json() failed: Body is unusable: Body has already been read"
    ]
}
```

## Technical Analysis
1.  **Stream Drained**: `req.json()` 抛出的错误 `Body has already been read` 是最直接的证据。这表明底层的 ReadableStream 已经被读取过。
2.  **Adapter Issue**: 在 Next.js App Router 中，`Request` 对象应由适配器根据入站事件（如 SCF Event）构建。如果适配器在构建 Request 对象时（例如为了处理 Base64 编码、日志记录或 WAF 检查）读取了流，但没有使用 `tee()` 分流或重置流，应用层拿到的就是枯竭的流。
3.  **Inconsistency**: `request.bodyUsed` 为 `false` 但流实际已空，这可能表明适配器创建了一个新的 Request 对象，但传入了一个已经空的 Stream，或者状态同步存在 Bug。

## Recommendation
建议 EdgeOne 团队检查 Next.js Runtime 适配器中关于 Request Body 的处理逻辑：
1.  确保在读取 Body（如用于 Base64 解码）后，创建一个新的 Buffer/Stream 传递给 Next.js。
2.  或者，确保使用 `stream.tee()` 来保留流的可读性。

### POC 测试并获取详细调试信息（针对当前仓库最新提交）
```curl
curl -X POST "https://eo-umami.acofork.com/api/debug-poc" \
     -H "Content-Type: application/json" \
     -d '{"test": "hello edgeone", "timestamp": 123456}'
```
