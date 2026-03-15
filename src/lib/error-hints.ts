export interface TroubleshootingAdvice {
  title: string;
  summary: string;
  checks: string[];
}

function normalizeErrorMessage(error: string): string {
  return error.replace(/\s+/g, ' ').trim();
}

export function getTroubleshootingAdvice(error?: string | null): TroubleshootingAdvice | null {
  const message = normalizeErrorMessage(String(error || ''));
  if (!message) {
    return null;
  }

  if (/401|403|unauthorized|authentication|invalid api key|incorrect api key|invalid key|permission denied/i.test(message)) {
    return {
      title: '鉴权失败',
      summary: '当前请求大概率没有通过 API Key 或权限校验。',
      checks: [
        '检查 API Key 是否填错、过期或粘贴了多余空格。',
        '确认所选协议和供应商一致，例如 Gemini Key 不要走兼容接口。',
        '如果你在用代理或网关，确认它没有额外的鉴权要求。',
      ],
    };
  }

  if (/429|rate limit|too many requests|quota|quota exceeded/i.test(message)) {
    return {
      title: '触发限流',
      summary: '请求频率或额度已经碰到上游限制。',
      checks: [
        '稍等几十秒后再试一次。',
        '把并发调低一点，减少短时间内的请求数。',
        '确认当前 key 是否还有额度，必要时换 key 或换模型。',
      ],
    };
  }

  if ((/request failed\s*\(502\)|bad gateway|\b502\b/i.test(message)) && /fetch failed|targeturl|upstream/i.test(message)) {
    return {
      title: '\u4e0a\u6e38\u7f51\u5173\u8f6c\u53d1\u5931\u8d25',
      summary: '\u8bf7\u6c42\u5df2\u7ecf\u5230\u8fbe\u517c\u5bb9\u63a5\u53e3\u6216\u7f51\u5173\uff0c\u4f46\u5b83\u5728\u8f6c\u53d1\u5230\u771f\u6b63\u6a21\u578b\u540e\u7aef\u65f6\u5931\u8d25\u4e86\u3002',
      checks: [
        '\u8fd9\u79cd 502 \u901a\u5e38\u662f\u4e0a\u6e38\u4e0d\u7a33\u5b9a\uff0c\u53ef\u4ee5\u5148\u76f4\u63a5\u91cd\u8bd5\u5f53\u524d\u6b65\u9aa4\u3002',
        '\u628a\u5e76\u53d1\u8c03\u4f4e\u4e00\u6863\uff0c\u5c24\u5176\u662f\u9010\u9875\u5206\u6790\u9636\u6bb5\uff0c\u51cf\u5c11\u7f51\u5173\u540c\u65f6\u8f6c\u53d1\u7684\u8bf7\u6c42\u6570\u3002',
        '\u6838\u5bf9 baseUrl\u3001\u6a21\u578b ID \u548c\u5f53\u524d\u4f9b\u5e94\u5546\u662f\u5426\u771f\u7684\u5339\u914d\uff0c\u5fc5\u8981\u65f6\u6362\u4e2a\u6a21\u578b\u6216\u4f9b\u5e94\u5546\u518d\u8bd5\u3002',
        '\u5982\u679c\u9519\u8bef\u91cc\u5e26\u4e86 targetUrl\uff0c\u4f18\u5148\u68c0\u67e5\u8fd9\u4e2a\u4e0a\u6e38\u5730\u5740\u5728\u4ee3\u7406\u6216\u7f51\u5173\u91cc\u662f\u5426\u53ef\u8fbe\uff0c\u5e76\u786e\u8ba4\u5b83\u652f\u6301 /chat/completions\u3002',
      ],
    };
  }

  if (/truncated the completion|finish_reason\s*=\s*length/i.test(message)) {
    return {
      title: '输出被截断',
      summary: '模型在输出完之前就撞到了 max_tokens 上限。',
      checks: [
        '把 Chunk Size 再调小一点，减少单次要汇总的内容。',
        '减少单次图片数，尤其是逐页分析阶段。',
        '换一个更擅长长输出的模型，或确认上游兼容接口真的支持更高输出上限。',
      ],
    };
  }

  if (/max_total_tokens|max_seq_len|prompt_tokens|context length|input (?:is )?too (?:long|large)/i.test(message)) {
    return {
      title: '输入太长',
      summary: '这次请求的图片、Prompt 或上下文已经超过模型窗口。',
      checks: [
        '减小 Chunk Size，降低每次一起处理的页数。',
        '减少单次图片数量，或把章节拆得更细。',
        '如果改过系统提示词，检查是否写得过长。',
      ],
    };
  }

  if (/local fallback proxy .* unreachable|run-local-dev\.cmd|run-local-preview\.cmd|ports?\s*8787-8797/i.test(message)) {
    return {
      title: '本地代理没有连上',
      summary: '这不是章节内容本身的问题，而是浏览器直连接口失败后，本地兜底代理也没有连通，请求根本没到模型。',
      checks: [
        '先看顶部状态灯，确认它不是“代理未连接 (8787-8797)”。',
        '在本机启动 scripts/run-local-dev.cmd，或预览环境启动 scripts/run-local-preview.cmd。',
        '如果你坚持浏览器直连第三方兼容接口，确认对方允许 CORS；很多接口在纯前端里直连会失败。',
        '检查本机 8787-8797 端口是否被占用、被防火墙拦截，或代理进程是否已经退出。',
      ],
    };
  }

  if (/network request could not reach|direct browser request could not reach|request failed before it reached the upstream model|request never reached the upstream model|failed to fetch|fetch failed|err_connection|econnreset|econnaborted|socket hang up/i.test(message)) {
    return {
      title: '请求没有真正到达模型',
      summary: '更像是浏览器、代理、网络或 CORS 问题，不是模型本身的内容错误。',
      checks: [
        '核对 API URL / 代理地址是否正确，兼容接口通常需要指到 /v1 前缀。',
        '如果是浏览器直连第三方接口，确认对方允许 CORS，证书也没有问题。',
        '如果你依赖本地代理，确认代理进程和端口都正常。',
      ],
    };
  }

  if (/returned HTML; check API URL or proxy settings|<!doctype html|<html[\s>]/i.test(message)) {
    return {
      title: '接口地址可能填错了',
      summary: '当前返回的不像模型 JSON，更像网页内容或网关错误页。',
      checks: [
        '检查 baseUrl 是否填成了官网页面、控制台地址或缺少 /v1。',
        '兼容接口一般应返回 /models 和 /chat/completions，而不是 HTML 页面。',
        '可以先点“获取模型”验证当前地址是否真的是 API 入口。',
      ],
    };
  }

  if (/malformed json|did not return valid json|did not return a pages array|returned \d+ pages, expected \d+|json without/i.test(message)) {
    return {
      title: '模型没有按预期返回结构化结果',
      summary: '模型响应了，但格式不稳定，程序没法安全继续解析。',
      checks: [
        '优先换更稳一点的模型，尤其是需要严格 JSON 输出的阶段。',
        '把 Chunk Size 调小，让单次任务更简单。',
        '查看“上次发送”里的 Prompt，确认没有把输出格式要求冲掉。',
      ],
    };
  }

  if (/no capacity available for model|at capacity|currently at capacity|capacity unavailable|server is busy|overloaded/i.test(message)) {
    return {
      title: '模型容量紧张',
      summary: '上游模型暂时太忙，不一定是你的配置错了。',
      checks: [
        '等一会再试，或者直接重试当前步骤。',
        '换一个同类但负载更低的模型。',
        '把并发调低，减少同时占用的请求数。',
      ],
    };
  }

  if (/model .* not found|unknown model|unsupported model|no such model|does not exist|model .* unavailable|not available on the server/i.test(message)) {
    return {
      title: '模型名或供应商不匹配',
      summary: '当前供应商下可能没有这个模型，或者模型 ID 写法不对。',
      checks: [
        '先点一次“获取模型”，再从列表里直接选模型。',
        '确认你填的是该供应商支持的真实模型 ID。',
        '如果走兼容接口，注意有些平台不接受带厂商前缀的模型名。',
      ],
    };
  }

  if (/timed out|timeout|deadline exceeded/i.test(message)) {
    return {
      title: '请求超时',
      summary: '模型响应太慢，或者这次任务量对当前模型来说过重。',
      checks: [
        '减少单次图片数量或减小 Chunk Size。',
        '换更快的模型，先跑通流程再追求质量。',
        '检查代理和网络质量，避免长连接被中途掐断。',
      ],
    };
  }

  if (/safety filtering|refused the request|cannot fulfill this request|sexually explicit|safety guidelines/i.test(message)) {
    return {
      title: '内容触发了安全限制',
      summary: '这更像是上游模型的安全策略拦截，不是程序异常。',
      checks: [
        '检查 Prompt 里是否有过强、过敏感或容易误判的描述。',
        '缩短补充提示词，避免和结构化要求混在一起。',
        '必要时换一个安全策略更宽松、但仍稳定的模型。',
      ],
    };
  }

  if (/returned an empty completion .*completion_tokens\s*=\s*0|completion_tokens\s*=\s*0.*blocked or discarded the response|blocked or discarded the response/i.test(message)) {
    return {
      title: '上游疑似拦截了响应',
      summary: '接口虽然返回了 200，但内容为空且 completion_tokens 为 0。更像是模型安全策略或网关直接丢弃了输出，而不是普通的 JSON 解析错误。',
      checks: [
        '打开“查看上次发送”，确认模型、地址、Prompt 和图片都符合预期。',
        '如果这类内容会被上游静默拦截，请把它当作供应商限制，而不是简单重试可以修好的程序错误。',
        '如果你只是想继续处理其他页面，可以跳过当前页，或开启“自动跳过”。',
      ],
    };
  }

  if (/returned an empty completion|empty response/i.test(message)) {
    return {
      title: '模型返回了空结果',
      summary: '请求成功发出，但上游没有给出可用内容。',
      checks: [
        '优先换一个更稳定的模型再试。',
        '检查接口是否真兼容当前协议，尤其是自建网关。',
        '打开“查看上次发送”，确认模型名、地址和 Prompt 都正常。',
      ],
    };
  }

  return {
    title: '需要进一步排查',
    summary: '这是未被专门归类的错误，建议结合上次请求内容一起看。',
    checks: [
      '先看“查看上次发送”，确认模型、地址、图片数和 Prompt 是否符合预期。',
      '如果是兼容接口，优先验证 /models 和 /chat/completions 是否都能正常工作。',
      '保留原始错误，再试一次更小任务，判断是配置问题还是内容规模问题。',
    ],
  };
}
