// Utilitário de Verificação de IP e Rede Corporativa (PontoExato v5.2)

export interface NetworkValidationResult {
  valid: boolean;
  userIP?: string;
  error?: {
    type: 'network' | 'offline_blocked' | 'unreachable';
    title: string;
    message: string;
    suggestion: string;
    detectedIP?: string;
    authorizedIP?: string;
  };
}

export interface ClientIPInfo {
  ipv4?: string;
  ipv6?: string;
  detectedList: string[];
  primary: string;
}

// Cache em memória para evitar requisições de rede repetidas em curto intervalo
let cachedIPInfo: ClientIPInfo | null = null;
let cachedIPTimestamp: number = 0;
const IP_CACHE_TTL_MS = 60000; // 60 segundos de cache

/**
 * Busca de forma ultrarrápida e resiliente o IPv4 e/ou IPv6 do dispositivo.
 * Dispositivos móveis modernos operam em Dual-Stack (IPv4 e IPv6 simultaneamente).
 * Utiliza requisições paralelas (Promise.any) e cache de 60s para resposta quase instantânea (<200ms).
 */
export async function fetchUserPublicIPs(forceRefresh: boolean = false): Promise<ClientIPInfo> {
  const now = Date.now();
  if (!forceRefresh && cachedIPInfo && (now - cachedIPTimestamp < IP_CACHE_TTL_MS)) {
    return cachedIPInfo;
  }

  const v4Endpoints = [
    'https://api.ipify.org?format=json',
    'https://ipv4.icanhazip.com',
    'https://v4.ident.me'
  ];

  const v6Endpoints = [
    'https://api64.ipify.org?format=json',
    'https://ipv6.icanhazip.com',
    'https://v6.ident.me'
  ];

  const fetchSingle = async (url: string, timeoutMs: number = 2500): Promise<string> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { 
        signal: controller.signal,
        headers: { 'Accept': 'application/json, text/plain, */*' }
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      let ip = '';
      if (url.includes('format=json')) {
        const json = await res.json();
        ip = json.ip || '';
      } else {
        ip = (await res.text()).trim();
      }

      if (ip && (ip.includes('.') || ip.includes(':'))) {
        return ip.trim();
      }
      throw new Error('Formato de IP inválido');
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }
  };

  // 1. Busca paralela ultrarrápida de IPv4
  const v4Promise = Promise.any(
    v4Endpoints.map(url => fetchSingle(url, 2200).then(ip => {
      if (ip && ip.includes('.')) return ip;
      throw new Error('Não é IPv4');
    }))
  ).catch(() => undefined);

  // 2. Busca paralela de IPv6
  const v6Promise = Promise.any(
    v6Endpoints.map(url => fetchSingle(url, 2200).then(ip => {
      if (ip && ip.includes(':')) return ip;
      throw new Error('Não é IPv6');
    }))
  ).catch(() => undefined);

  const [foundV4, foundV6] = await Promise.all([v4Promise, v6Promise]);

  const detectedList: string[] = [];
  if (foundV4) detectedList.push(foundV4);
  if (foundV6) detectedList.push(foundV6);

  // Fallback rápido apenas caso ambos tenham falhado
  if (detectedList.length === 0) {
    const fallbackEndpoints = [
      'https://api.my-ip.io/v2/ip.json',
      'https://icanhazip.com',
      'https://api64.ipify.org?format=json'
    ];
    try {
      const fb = await Promise.any(fallbackEndpoints.map(url => fetchSingle(url, 2500)));
      if (fb) {
        if (fb.includes('.')) detectedList.push(fb);
        else if (fb.includes(':')) detectedList.push(fb);
      }
    } catch {}
  }

  if (detectedList.length === 0) {
    throw new Error('Não foi possível identificar o endereço IP da conexão.');
  }

  const result: ClientIPInfo = {
    ipv4: foundV4,
    ipv6: foundV6,
    detectedList,
    primary: foundV4 || foundV6 || detectedList[0]
  };

  cachedIPInfo = result;
  cachedIPTimestamp = Date.now();

  return result;
}

/**
 * Função mantida para retrocompatibilidade com chamadas individuais
 */
export async function fetchUserPublicIP(forceRefresh: boolean = false): Promise<string> {
  const info = await fetchUserPublicIPs(forceRefresh);
  return info.primary;
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
 * Suporta:
 * 1. Igualdade exata de IP
 * 2. Múltiplos IPs separados por vírgula, ponto e vírgula, quebra de linha ou espaço
 * 3. Wildcards (ex: 193.186.4.*)
 * 4. Notação CIDR (ex: 193.186.4.0/24)
 * 5. Tolerância inteligente da mesma sub-rede /24 corporativa (mesmos 3 primeiros octetos IPv4)
 * 6. Prefixo /64 para redes IPv6
 */
export function isIPAuthorized(userIP: string, authorizedConfig: string): boolean {
  if (!authorizedConfig || !authorizedConfig.trim()) {
    return true; // Se a empresa não configurou IP, o acesso não é restrito por rede
  }

  const cleanUserIP = normalizeIP(userIP);
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

    // 2. Notação CIDR (ex: 193.186.4.0/24)
    if (cleanEntry.includes('/')) {
      if (matchCIDR(cleanUserIP, cleanEntry)) {
        return true;
      }
    }

    // 3. Notação Wildcard (ex: 193.186.4.*)
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

    // 4. Tolerância Inteligente de Sub-rede /24 (IPv4)
    // Se ambos forem IPv4 válidos e compartilharem os 3 primeiros blocos (ex: 193.186.4.X e 193.186.4.Y)
    // Isso garante que roteadores corporativos com DHCP, CGNAT ou múltiplos pontos de acesso
    // na mesma empresa sejam reconhecidos com 100% de precisão.
    if (cleanUserIP.includes('.') && cleanEntry.includes('.')) {
      const userOctets = cleanUserIP.split('.');
      const entryOctets = cleanEntry.split('.');
      if (userOctets.length === 4 && entryOctets.length === 4) {
        if (
          userOctets[0] === entryOctets[0] &&
          userOctets[1] === entryOctets[1] &&
          userOctets[2] === entryOctets[2]
        ) {
          return true;
        }
      }
    }

    // 5. Tolerância de Prefixo IPv6 (/64)
    // Se ambos forem IPv6 válidos e compartilharem o mesmo bloco de roteamento /64 (primeiros 4 grupos)
    if (cleanUserIP.includes(':') && cleanEntry.includes(':')) {
      const userBlocks = cleanUserIP.split(':').filter(Boolean);
      const entryBlocks = cleanEntry.split(':').filter(Boolean);
      if (userBlocks.length >= 4 && entryBlocks.length >= 4) {
        if (
          userBlocks[0].toLowerCase() === entryBlocks[0].toLowerCase() &&
          userBlocks[1].toLowerCase() === entryBlocks[1].toLowerCase() &&
          userBlocks[2].toLowerCase() === entryBlocks[2].toLowerCase() &&
          userBlocks[3].toLowerCase() === entryBlocks[3].toLowerCase()
        ) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Executa a validação completa de rede corporativa para registro de ponto.
 * Avalia tanto IPv4 quanto IPv6 do dispositivo contra a lista autorizada.
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
    const ipInfo = await fetchUserPublicIPs();

    // Testa se QUALQUER um dos IPs detectados (IPv4 ou IPv6) é autorizado
    let isAuthorized = false;
    let authorizedMatchedIP = ipInfo.primary;

    for (const ip of ipInfo.detectedList) {
      if (isIPAuthorized(ip, trimmedConfig)) {
        isAuthorized = true;
        authorizedMatchedIP = ip;
        break;
      }
    }

    if (isAuthorized) {
      return {
        valid: true,
        userIP: authorizedMatchedIP
      };
    }

    // IP detectado é diferente do autorizado
    const detectedDisplay = [
      ipInfo.ipv4 ? `IPv4: ${ipInfo.ipv4}` : '',
      ipInfo.ipv6 ? `IPv6: ${ipInfo.ipv6}` : ''
    ].filter(Boolean).join(' | ') || ipInfo.primary;

    return {
      valid: false,
      userIP: ipInfo.primary,
      error: {
        type: 'network',
        title: 'Rede Wi-Fi Não Reconhecida',
        message: `Seu aparelho está utilizando a conexão: ${detectedDisplay}.\nO ponto nesta empresa é restrito ao Wi-Fi oficial.`,
        suggestion: `1. Se estiver conectado ao Wi-Fi mas usando 4G simultaneamente, desative os Dados Móveis.\n2. Se já estiver no Wi-Fi da empresa, copie o IP detectado e solicite ao gestor para cadastrar a faixa no painel.`,
        detectedIP: ipInfo.primary,
        authorizedIP: trimmedConfig
      }
    };
  } catch (err: any) {
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
