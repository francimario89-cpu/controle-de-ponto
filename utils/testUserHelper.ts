import { Firestore, doc, getDoc, setDoc, collection, query, where, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { User, Company, Employee, PointRecord } from '../types';

export const TEST_TEMPORARY_USER: User = {
  name: "Lucas Silva (Temporário)",
  email: "lucas.temporario@pontoexato.com.br",
  matricula: "TEMP-2026",
  companyCode: "DEMO",
  companyName: "PontoExato Demo & Serviços Ltda",
  role: "employee",
  roleFunction: "Assistente Operacional (Temporário)",
  workShift: "08:00 - 12:00 / 13:00 - 17:00",
  cpf: "123.456.789-00",
  phone: "(11) 98765-4321",
  admissionDate: "01/09/2026",
  department: "Operações & Logística Temporária",
  contractType: "Contrato de Trabalho Temporário (Lei nº 6.019/74)",
  contractEndDate: "30/11/2026 (90 dias)",
  isTemporary: true,
  hasFacialRecord: true,
  photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"
};

export const TEST_DEMO_COMPANY: Company = {
  id: "DEMO",
  name: "PontoExato Demo & Serviços Ltda",
  socialReason: "PontoExato Soluções em Ponto e Gestão Ltda",
  cnpj: "12.345.678/0001-90",
  accessCode: "DEMO",
  address: "Av. Paulista, 1000 - Bela Vista",
  city: "São Paulo",
  state: "SP",
  zip: "01310-100",
  adminEmail: "admin@demo.pontoexato.com.br",
  adminPassword: "admin123"
};

/**
 * Garante que a empresa DEMO, o colaborador temporário e registros de teste existam no Firestore
 */
export async function setupTestTemporaryUser(db: Firestore): Promise<{ user: User; company: Company }> {
  try {
    // 1. Garantir Empresa DEMO
    const compRef = doc(db, "companies", "DEMO");
    const compSnap = await getDoc(compRef);
    if (!compSnap.exists()) {
      await setDoc(compRef, TEST_DEMO_COMPANY);
    }

    // 2. Garantir Colaborador Temporário
    const qEmp = query(
      collection(db, "employees"),
      where("companyCode", "==", "DEMO"),
      where("matricula", "==", "TEMP-2026")
    );
    const empSnap = await getDocs(qEmp);

    const empData: Partial<Employee> = {
      name: TEST_TEMPORARY_USER.name,
      email: TEST_TEMPORARY_USER.email,
      matricula: TEST_TEMPORARY_USER.matricula!,
      companyCode: "DEMO",
      status: "active",
      roleFunction: TEST_TEMPORARY_USER.roleFunction,
      workShift: TEST_TEMPORARY_USER.workShift,
      cpf: TEST_TEMPORARY_USER.cpf,
      phone: TEST_TEMPORARY_USER.phone,
      admissionDate: TEST_TEMPORARY_USER.admissionDate,
      department: TEST_TEMPORARY_USER.department,
      contractType: TEST_TEMPORARY_USER.contractType,
      contractEndDate: TEST_TEMPORARY_USER.contractEndDate,
      isTemporary: true,
      password: "123456",
      photo: TEST_TEMPORARY_USER.photo || "",
      hasFacialRecord: true,
      weeklyHours: 40
    };

    if (empSnap.empty) {
      await addDoc(collection(db, "employees"), empData);
    } else {
      // Atualiza para garantir que todos os campos de temporário fiquem consistentes
      const empDocId = empSnap.docs[0].id;
      await setDoc(doc(db, "employees", empDocId), { ...empSnap.docs[0].data(), ...empData }, { merge: true });
    }

    // 3. Garantir algumas batidas de demonstração se não existirem
    const qRec = query(
      collection(db, "records"),
      where("companyCode", "==", "DEMO"),
      where("matricula", "==", "TEMP-2026")
    );
    const recSnap = await getDocs(qRec);

    if (recSnap.empty) {
      await seedSampleRecords(db);
    }
  } catch (err) {
    console.warn("Aviso ao sincronizar dados de teste no Firestore (modo offline disponível):", err);
  }

  return { user: TEST_TEMPORARY_USER, company: TEST_DEMO_COMPANY };
}

/**
 * Cria registros realistas de exemplo para o colaborador temporário
 */
export async function seedSampleRecords(db: Firestore): Promise<void> {
  const now = new Date();
  
  // Ontem
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  
  const yEntrada = new Date(yesterday);
  yEntrada.setHours(7, 58, 12, 0);

  const yAlmocoIni = new Date(yesterday);
  yAlmocoIni.setHours(12, 2, 45, 0);

  const yAlmocoFim = new Date(yesterday);
  yAlmocoFim.setHours(13, 1, 10, 0);

  const ySaida = new Date(yesterday);
  ySaida.setHours(17, 4, 30, 0);

  // Hoje (Entrada de manhã para permitir continuar testando saídas)
  const tEntrada = new Date(now);
  tEntrada.setHours(8, 3, 22, 0);

  const sampleList = [
    {
      userName: TEST_TEMPORARY_USER.name,
      matricula: "TEMP-2026",
      companyCode: "DEMO",
      timestamp: yEntrada,
      type: "entrada" as const,
      address: "Av. Paulista, 1000 - Bela Vista, São Paulo - SP",
      latitude: -23.561414,
      longitude: -46.655881,
      photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
      status: "synchronized" as const,
      digitalSignature: `PX-TEMP-2026-${yEntrada.getTime()}`,
      mood: "😊"
    },
    {
      userName: TEST_TEMPORARY_USER.name,
      matricula: "TEMP-2026",
      companyCode: "DEMO",
      timestamp: yAlmocoIni,
      type: "inicio_intervalo" as const,
      address: "Av. Paulista, 1000 - Bela Vista, São Paulo - SP",
      latitude: -23.561414,
      longitude: -46.655881,
      photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
      status: "synchronized" as const,
      digitalSignature: `PX-TEMP-2026-${yAlmocoIni.getTime()}`,
      mood: "👍"
    },
    {
      userName: TEST_TEMPORARY_USER.name,
      matricula: "TEMP-2026",
      companyCode: "DEMO",
      timestamp: yAlmocoFim,
      type: "fim_intervalo" as const,
      address: "Av. Paulista, 1000 - Bela Vista, São Paulo - SP",
      latitude: -23.561414,
      longitude: -46.655881,
      photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
      status: "synchronized" as const,
      digitalSignature: `PX-TEMP-2026-${yAlmocoFim.getTime()}`,
      mood: "💪"
    },
    {
      userName: TEST_TEMPORARY_USER.name,
      matricula: "TEMP-2026",
      companyCode: "DEMO",
      timestamp: ySaida,
      type: "saida" as const,
      address: "Av. Paulista, 1000 - Bela Vista, São Paulo - SP",
      latitude: -23.561414,
      longitude: -46.655881,
      photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
      status: "synchronized" as const,
      digitalSignature: `PX-TEMP-2026-${ySaida.getTime()}`,
      mood: "👋"
    },
    {
      userName: TEST_TEMPORARY_USER.name,
      matricula: "TEMP-2026",
      companyCode: "DEMO",
      timestamp: tEntrada,
      type: "entrada" as const,
      address: "Av. Paulista, 1000 - Bela Vista, São Paulo - SP",
      latitude: -23.561414,
      longitude: -46.655881,
      photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
      status: "synchronized" as const,
      digitalSignature: `PX-TEMP-2026-${tEntrada.getTime()}`,
      mood: "⚡"
    }
  ];

  for (const record of sampleList) {
    try {
      await addDoc(collection(db, "records"), record);
    } catch (e) {
      console.warn("Erro ao inserir registro de teste:", e);
    }
  }
}
