import { Holiday } from '../types';

/**
 * Algoritmo Computus para cálculo do Domingo de Páscoa
 */
function getEasterDate(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-index (0 = Jan, 11 = Dez)
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

function formatDate(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function addDaysToDate(year: number, month: number, day: number, daysToAdd: number): string {
  const date = new Date(year, month, day);
  date.setDate(date.getDate() + daysToAdd);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Retorna os feriados nacionais oficiais e pontos facultativos federais para um determinado ano no Brasil.
 * Regulamentação: Leis Federais nº 662/1949, nº 6.802/1980, nº 9.093/1995, nº 10.607/2002 e nº 14.759/2023.
 */
export function getNationalHolidays(year: number): Holiday[] {
  const easter = getEasterDate(year);

  const paixaoCristo = addDaysToDate(year, easter.month, easter.day, -2);
  const carnavalSeg = addDaysToDate(year, easter.month, easter.day, -48);
  const carnavalTer = addDaysToDate(year, easter.month, easter.day, -47);
  const cinzas = addDaysToDate(year, easter.month, easter.day, -46);
  const corpusChristi = addDaysToDate(year, easter.month, easter.day, 60);

  const holidays: Holiday[] = [
    {
      id: `nat_${year}_01_01`,
      date: `${year}-01-01`,
      description: 'Confraternização Universal (Ano Novo)',
      type: 'feriado',
      isNational: true
    },
    {
      id: `nat_${year}_carnaval_seg`,
      date: carnavalSeg,
      description: 'Carnaval (Segunda-feira)',
      type: 'ponto_facultativo',
      isNational: true
    },
    {
      id: `nat_${year}_carnaval_ter`,
      date: carnavalTer,
      description: 'Carnaval (Terça-feira)',
      type: 'ponto_facultativo',
      isNational: true
    },
    {
      id: `nat_${year}_cinzas`,
      date: cinzas,
      description: 'Quarta-feira de Cinzas (até 14h)',
      type: 'ponto_facultativo',
      isNational: true
    },
    {
      id: `nat_${year}_paixao`,
      date: paixaoCristo,
      description: 'Sexta-feira Santa (Paixão de Cristo)',
      type: 'feriado',
      isNational: true
    },
    {
      id: `nat_${year}_04_21`,
      date: `${year}-04-21`,
      description: 'Tiradentes',
      type: 'feriado',
      isNational: true
    },
    {
      id: `nat_${year}_05_01`,
      date: `${year}-05-01`,
      description: 'Dia Mundial do Trabalho',
      type: 'feriado',
      isNational: true
    },
    {
      id: `nat_${year}_corpus`,
      date: corpusChristi,
      description: 'Corpus Christi',
      type: 'ponto_facultativo',
      isNational: true
    },
    {
      id: `nat_${year}_09_07`,
      date: `${year}-09-07`,
      description: 'Independência do Brasil',
      type: 'feriado',
      isNational: true
    },
    {
      id: `nat_${year}_10_12`,
      date: `${year}-10-12`,
      description: 'Nossa Senhora Aparecida (Padroeira do Brasil)',
      type: 'feriado',
      isNational: true
    },
    {
      id: `nat_${year}_11_02`,
      date: `${year}-11-02`,
      description: 'Finados',
      type: 'feriado',
      isNational: true
    },
    {
      id: `nat_${year}_11_15`,
      date: `${year}-11-15`,
      description: 'Proclamação da República',
      type: 'feriado',
      isNational: true
    },
    {
      id: `nat_${year}_11_20`,
      date: `${year}-11-20`,
      description: 'Dia Nacional de Zumbi e da Consciência Negra',
      type: 'feriado',
      isNational: true
    },
    {
      id: `nat_${year}_12_25`,
      date: `${year}-12-25`,
      description: 'Natal',
      type: 'feriado',
      isNational: true
    }
  ];

  return holidays;
}

/**
 * Combina feriados nacionais automáticos com os feriados customizados cadastrados pela empresa.
 */
export function getAllHolidaysForYear(year: number, customHolidays: Holiday[] = []): Holiday[] {
  const national = getNationalHolidays(year);
  
  // Filtra customizados do ano
  const customThisYear = customHolidays.filter(h => {
    return h.date && h.date.startsWith(`${year}-`);
  });

  // Mapa para evitar duplicidades de mesma data (customizado prevalece ou enriquece)
  const map = new Map<string, Holiday>();
  
  for (const h of national) {
    map.set(h.date, h);
  }

  for (const h of customThisYear) {
    map.set(h.date, h);
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Verifica se uma data específica (YYYY-MM-DD) é feriado ou ponto facultativo.
 */
export function getHolidayForDate(dateStr: string, customHolidays: Holiday[] = []): Holiday | null {
  if (!dateStr) return null;
  const year = parseInt(dateStr.split('-')[0]);
  if (!year || isNaN(year)) return null;

  const allHolidays = getAllHolidaysForYear(year, customHolidays);
  return allHolidays.find(h => h.date === dateStr) || null;
}
