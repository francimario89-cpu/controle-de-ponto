// Utilitário de Verificação de IP e Rede Corporativa (PontoExato v5.2)

export interface NetworkValidationResult {
  valid: boolean;
  userIP?: string;
  error?: {
    type: 'network' | 'offline_blocked' | 'unreachable';
    title: string;
    message: string;
    suggestion: string;
  };
}

/**
 * Busca o endereço IP público do dispositivo com timeout e múltiplos provedores redundantes.
 */
export async function fetchUserPublicIP(): Promise<string> {
  const endpoints = [
    { url: 'https://api.ipify.org?format=json', extract: (d: any) => d.ip },
    { url: 'https://api64.ipify.org?format=json', extract: (d: any) => d.ip },
    { url: 'https://ipapi.co/json/', extract: (d: any) => d.ip },
    { url: 'https://api.my-ip.io/v2/ip.json', extract: (d: any) => d.ip },
    { url: 'https://icanhazip.com', extract: (text: string) => text.trim() }
  ];

  let lastError: any = null;

  for (const ep of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(ep.url, { 
        signal: controller.signal,
        headers: { 'Accept': 'application/json, text/plain, */*' }
      });
      clearTimeout(timeoutId);

      if (!res.ok) continue;

      let ip = '';
      if (ep.url.includes('icanhazip')) {
        const text = await res.text();
        ip = ep.extract(text);
      } else {
        const json = await res.json();
        ip = ep.extract(json);
      }

      if (ip && typeof ip === 'string') {
        const cleaned = ip.trim();
        // Validação básica se é um IPv4 ou IPv6
        if (cleaned.length >= 7 && (cleaned.includes('.') || cleaned.includes(':'))) {
          return cleaned;
        }
      }
    } catch (err) {
      lastError = err;
      // Continua para o próximo endpoint redundante
    }
  }

  throw new Error(`Não foi possível detectar o IP público: ${lastError?.message || 'Serviços indisponíveis'}`);
}

/**
 * Normaliza um IP removendo prefixo IPv6 para IPv4 (ex: ::ffff:192.168.1.1 -> 192.168.1.1)
 */
function normalizeIP(ip: string): string {
  const trimmed = ip.trim();
  if (trimmed.startsWith('::ffff:')) {
    return trimmed.substring(7);
  }
  return trimmed;
}

/**
 * Converte um IPv4 para representação numérica inteira (para conferência CIDR)
 */
function ipToLong(ip: string): number {
  return ip.split('.').reduce((acc, octet) => ((acc << 8) + parseInt(octet, 10)) >>> 0, 0);
}

/**
 * Verifica se um IP de usuário está contido em uma faixa CIDR (ex: 177.100.200.0/24)
 */
function matchCIDR(userIP: string, cidr: string): boolean {
  try {
    const [range, bitsStr] = cidr.split('/');
    const bits = parseInt(bitsStr, 10);
    if (isNaN(bits) || bits < 0 || bits > 32) return false;
    
    // Suporte apenas para IPv4 em CIDR por enquanto
    if (!userIP.includes('.') || !range.includes('.')) return false;

    const userLong = ipToLong(normalizeIP(userIP));
    const rangeLong = ipToLong(normalizeIP(range));
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;

    return (userLong & mask) === (rangeLong & mask);
  } catch {
    return false;
  }
}

/**
 * Valida se o IP do usuário é autorizado com base na configuração da empresa.
 * Suporta múltiplos IPs separados por vírgula, ponto e vírgula, barra ou espaço,
 * suporte a wildcards (ex: 177.100.200.*) e notação CIDR (ex: 177.100.200.0/24).
 */
export function isIPAuthorized(userIP: string, authorizedConfig: string): boolean {
  if (!authorizedConfig || !authorizedConfig.trim()) {
    return true; // Se a empresa não configurou IP, o acesso não é restrito por rede
  }

  const cleanUserIP = normalizeIP(userIP);
  // Dividir por vírgula, ponto e vírgula, quebra de linha ou barra vertical
  const allowedEntries = authorizedConfig
    .split(/[,;\n|]+/)
    .map(entry => entry.trim())
    .filter(Boolean);

  if (allowedEntries.length === 0) return true;

  for (const entry of allowedEntries) {
    const cleanEntry = normalizeIP(entry);

    // 1. Igualdade exata
    if (cleanUserIP.toLowerCase() === cleanEntry.toLowerCase()) {
      return true;
    }

    // 2. Notação CIDR (ex: 177.100.200.0/24)
    if (cleanEntry.includes('/')) {
      if (matchCIDR(cleanUserIP, cleanEntry)) {
        return true;
      }
    }

    // 3. Notação Wildcard (ex: 177.100.200.*)
    if (cleanEntry.includes('*')) {
      const regexPattern = '^' + cleanEntry.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$';
      try {
        if (new RegExp(regexPattern).test(cleanUserIP)) {
          return true;
        }
      } catch {
        // Ignora regex inválido
      }
    }
  }

  return false;
}

/**
 * Executa a validação completa de rede corporativa para registro de ponto.
 */
export async function validateCompanyNetwork(
  authorizedConfig: string | undefined,
  isOnline: boolean = navigator.onLine
): Promise<NetworkValidationResult> {
  const trimmedConfig = authorizedConfig ? authorizedConfig.trim() : '';
  
  // Se a empresa NÃO definiu IP autorizado, liberação direta
  if (!trimmedConfig) {
    return { valid: true };
  }

  // Se a empresa exige IP autorizado, OBRIGATÓRIAMENTE precisa estar online para checar a rede
  if (!isOnline) {
    return {
      valid: false,
      error: {
        type: 'offline_blocked',
        title: 'Modo Offline Bloqueado',
        message: 'A sua empresa exige validação obrigatória da rede Wi-Fi corporativa autorizada.',
        suggestion: 'Não é permitido registrar ponto offline fora da rede da empresa. Conecte-se à rede Wi-Fi oficial do estabelecimento.'
      }
    };
  }

  try {
    const userIP = await fetchUserPublicIP();
    const authorized = isIPAuthorized(userIP, trimmedConfig);

    if (authorized) {
      return {
        valid: true,
        userIP
      };
    }

    // IP detectado é diferente do autorizado
    return {
      valid: false,
      userIP,
      error: {
        type: 'network',
        title: 'Rede Wi-Fi Não Autorizada',
        message: `Você está conectado a uma rede não autorizada ou dados móveis (IP: ${userIP}). O registro de ponto nesta empresa é restrito exclusivamente ao Wi-Fi corporativo.`,
        suggestion: `Desconecte do 4G/5G ou de redes externas e conecte-se ao Wi-Fi oficial da empresa. (IPs Autorizados: ${trimmedConfig})`
      }
    };
  } catch (err: any) {
    // ERRO CRÍTICO: Não foi possível detectar o IP. NUNCA liberar silenciosamente!
    return {
      valid: false,
      error: {
        type: 'unreachable',
        title: 'Falha na Validação de Rede',
        message: 'Não foi possível confirmar o endereço IP do seu dispositivo para validar a conexão com o Wi-Fi da empresa.',
        suggestion: 'Verifique se seu dispositivo está conectado à internet via Wi-Fi da empresa e clique em "Tentar Novamente".'
      }
    };
  }
}
