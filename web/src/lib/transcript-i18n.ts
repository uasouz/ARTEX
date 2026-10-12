import type { Locale } from "./i18n";

export function localizeTranscriptText(text: string, locale: Locale): string {
  if (!text || locale === "zh") return text;

  let result = text;

  // Translate known Chinese LLM provider error messages
  if (result.includes("余额不足或无可用资源包,请充值") || result.includes('"code":"1113"') || result.includes("1113")) {
    const errorMsg =
      locale === "pt"
        ? "Saldo insuficiente ou sem pacote de recursos disponível. Por favor, recarregue seus créditos de API."
        : "Insufficient account balance or no available resource pack. Please recharge your API credits.";
    result = result.replace(/余额不足或无可用资源包[，,]请充值[。.]?/g, errorMsg);
  }

  if (result.includes("模型不存在，请检查模型代码") || result.includes('"code":"1211"') || result.includes("1211")) {
    const errorMsg =
      locale === "pt"
        ? "Modelo não encontrado. Verifique o código/nome do modelo na configuração."
        : "Model does not exist. Please check the model name in your configuration.";
    result = result.replace(/模型不存在[，,]请检查模型代码[。.]?/g, errorMsg);
  }

  if (result.includes("认证失败") || result.includes("令牌无效") || result.includes("API key 无效")) {
    const errorMsg =
      locale === "pt"
        ? "Falha de autenticação: chave de API inválida."
        : "Authentication failed: invalid API key.";
    result = result.replace(/(认证失败|令牌无效|API key 无效)/g, errorMsg);
  }

  if (locale === "pt") {
    result = result
      .replace(
        /（无文字总结，终态\s*([a-zA-Z0-9_]+)[：:][^）]+）/g,
        "(Sem resumo de texto, status final $1: Falha na chamada ao modelo ou API)"
      )
      .replace(/（达到运行预算上限[^）]*）/g, "(Limite de orçamento atingido; finalizado)")
      .replace(/（运行被中断[：:][^）]*）/g, "(Execução interrompida)")
      .replace(/- \*\*终态\*\*:/g, "- **Status Final**:")
      .replace(/- \*\*底层错误\*\*:/g, "- **Erro Subjacente**:")
      .replace(/- \*\*已执行\*\*:\s*(\d+)\s*轮模型回合/g, "- **Executado**: $1 turno(s) de modelo")
      .replace(/- \*\*本次运行耗时\*\*:/g, "- **Tempo de Execução**:")
      .replace(
        /- \*\*工具调用\*\*:\s*本次运行还没有发出工具调用就结束了/g,
        "- **Chamadas de Ferramentas**: A execução terminou antes de emitir chamadas de ferramentas"
      )
      .replace(/- \*\*中断原因\*\*:/g, "- **Motivo da Interrupção**:")
      .replace(/- \*\*累计 token\*\*:/g, "- **Tokens Acumulados**:")
      .replace(/输入 (\d+) \/ 输出 (\d+) \/ 缓存读 (\d+) \/ 缓存写 (\d+)/g, "Entrada $1 / Saída $2 / Leitura Cache $3 / Escrita Cache $4")
      .replace(
        /模型或 API 调用失败（网络、鉴权、限流、供应商 5xx 等）[^\n]*/g,
        "Falha na chamada do modelo ou API (rede, autenticação, taxa limite, saldo, provedor 5xx). Tentativas esgotadas e marcado como bloqueado."
      );
  } else {
    // English
    result = result
      .replace(
        /（无文字总结，终态\s*([a-zA-Z0-9_]+)[：:][^）]+）/g,
        "(No text summary, terminal status $1: Model or API call failed)"
      )
      .replace(/（达到运行预算上限[^）]*）/g, "(Reached execution budget limit; finished)")
      .replace(/（运行被中断[：:][^）]*）/g, "(Execution interrupted)")
      .replace(/- \*\*终态\*\*:/g, "- **Terminal Status**:")
      .replace(/- \*\*底层错误\*\*:/g, "- **Underlying Error**:")
      .replace(/- \*\*已执行\*\*:\s*(\d+)\s*轮模型回合/g, "- **Executed**: $1 model turn(s)")
      .replace(/- \*\*本次运行耗时\*\*:/g, "- **Elapsed Time**:")
      .replace(
        /- \*\*工具调用\*\*:\s*本次运行还没有发出工具调用就结束了/g,
        "- **Tool Calls**: Run ended before issuing any tool calls"
      )
      .replace(/- \*\*中断原因\*\*:/g, "- **Abort Reason**:")
      .replace(/- \*\*累计 token\*\*:/g, "- **Token Usage**:")
      .replace(/输入 (\d+) \/ 输出 (\d+) \/ 缓存读 (\d+) \/ 缓存写 (\d+)/g, "Input $1 / Output $2 / Cache Read $3 / Cache Write $4")
      .replace(
        /模型或 API 调用失败（网络、鉴权、限流、供应商 5xx 等）[^\n]*/g,
        "Model or API call failed (network, auth, rate limit, quota, provider 5xx). Retries exhausted and marked as blocked."
      );
  }

  return result;
}
