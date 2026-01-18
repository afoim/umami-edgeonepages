import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(`[POC] ${msg}`);
    logs.push(msg);
  };

  log(`[Start] Method: ${request.method}, URL: ${request.url}`);

  const headers = Object.fromEntries(request.headers);
  log(`[Headers] content-type: ${headers['content-type']}`);
  log(`[Headers] content-length: ${headers['content-length']}`);
  // Check common serverless headers
  log(`[Headers] x-scf-is-base64-encoded: ${headers['x-scf-is-base64-encoded']}`);
  log(`[Headers] x-forwarded-for: ${headers['x-forwarded-for']}`);

  let bodySource = 'none';
  let rawText = '';

  // 1. Try Clone Strategy
  try {
    log('[Step 1] Attempting req.clone()');
    // Note: In some environments, clone() might work but return an empty stream if already consumed
    const cloned = request.clone();
    log('[Step 1] Clone object created');

    try {
      const text = await cloned.text();
      log(`[Step 1] cloned.text() returned. Length: ${text.length}`);
      if (text) {
        rawText = text;
        bodySource = 'clone';
      } else {
        log('[Step 1] cloned.text() was empty string');
      }
    } catch (e: any) {
      log(`[Step 1] cloned.text() failed: ${e.message}`);
    }
  } catch (e: any) {
    log(`[Step 1] req.clone() failed: ${e.message}`);
  }

  // 2. Try Original Strategy (Fallback)
  if (!rawText) {
    try {
      log('[Step 2] Attempting req.text() on original request');
      // Check if bodyUsed is true
      log(`[Step 2] request.bodyUsed before read: ${request.bodyUsed}`);

      const text = await request.text();
      log(`[Step 2] req.text() returned. Length: ${text.length}`);

      if (text) {
        rawText = text;
        bodySource = 'original';
      } else {
        log('[Step 2] req.text() was empty string');
      }
    } catch (e: any) {
      log(`[Step 2] req.text() failed: ${e.message}`);
    }
  }

  // 3. Try Direct JSON Strategy (Adapter Specific)
  if (!rawText) {
    try {
      log('[Step 3] Attempting req.json() directly (bypassing text stream)');
      // Sometimes text() fails or is empty but json() works due to internal buffering in Next.js/Node
      const json = await request.json();
      if (json) {
        rawText = JSON.stringify(json);
        bodySource = 'json_direct';
        log(`[Step 3] req.json() success. Object keys: ${Object.keys(json).join(',')}`);
      }
    } catch (e: any) {
      log(`[Step 3] req.json() failed: ${e.message}`);
    }
  }

  return NextResponse.json({
    result: rawText ? 'success' : 'failure',
    source: bodySource,
    bodyLength: rawText.length,
    bodyPreview: rawText.substring(0, 200),
    logs,
    headers, // Echo headers back to see what EdgeOne stripped/added
  });
}
