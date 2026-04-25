import type { ChatbotAnswer, ChatbotConversationState, PharmacyCase } from "./types";

const defaultState: ChatbotConversationState = {
  stage: "inicio"
};

const greetingTerms = ["hola", "buenas", "buenos dias", "buen dia", "buenas tardes", "ayuda"];
const priceTerms = ["precio", "precios", "mayorista", "mayoristas", "valor", "cuesta", "coste"];
const brandTerms = ["marca", "marcas", "laboratorio", "laboratorios"];
const salesTerms = ["venta", "ventas", "vendio", "vendieron", "demanda", "historial", "unidades"];
const averageTerms = ["promedio", "media", "promedio mensual"];
const cheapestTerms = ["mas barata", "mas economica", "economica", "producto mas economico"];
const tabletCostTerms = ["costo por comprimido", "coste por comprimido", "precio por comprimido"];
const stockTerms = ["cuantas cajas", "comprar", "pedido", "stock", "stock minimo", "stock alerta", "stock de alerta"];
const seasonalityTerms = ["estacionalidad", "estacional", "temporada", "invierno"];
const storageTerms = ["almacenamiento", "guardar", "conservar", "bodega", "almacenar"];
const registryTerms = ["registro", "ingreso y salida", "entrada y salida", "kardex", "trazabilidad"];
const riskTerms = ["riesgo", "riesgos", "problema", "problemas"];
const solutionTerms = ["resuelve", "resuelvelo", "haz el ejercicio", "dame la respuesta", "hazlo tu", "todo el ejercicio"];
const outOfScopeTerms = ["futbol", "receta", "diagnostico", "politica", "clima"];
const calculationGuidanceTerms = [
  "como lo tengo que calcular",
  "como se calcula",
  "que hago con ese precio",
  "como lo calculo",
  "como calculo eso",
  "como saco el costo",
  "como obtengo el costo",
  "que hago con el precio",
  "como se hace el calculo",
  "como hago el calculo"
];
const processGuidanceTerms = [
  "que tengo que hacer",
  "por donde empiezo",
  "que sigue",
  "y despues que",
  "no entiendo que hacer",
  "que hago",
  "como empiezo",
  "como sigo",
  "que hago primero",
  "como se hace",
  "estoy perdido",
  "no entiendo",
  "y ahora que"
];
const affirmativeReplies = ["si", "ya", "dale", "ok", "oki", "okay", "va", "vamos", "bueno", "listo"];
const negativeReplies = ["no", "nop", "nah"];
const ordinalTerms = [
  ["primero", "primera"],
  ["segundo", "segunda"],
  ["tercero", "tercera"],
  ["cuarto", "cuarta"]
] as const;

const monthAliases: Record<string, string[]> = {
  enero: ["enero", "ene"],
  febrero: ["febrero", "feb"],
  marzo: ["marzo", "mar"],
  abril: ["abril", "abr"],
  mayo: ["mayo"],
  junio: ["junio", "jun"],
  julio: ["julio", "jul"],
  agosto: ["agosto", "ago"],
  septiembre: ["septiembre", "setiembre", "sep", "sept"],
  octubre: ["octubre", "oct"],
  noviembre: ["noviembre", "nov"],
  diciembre: ["diciembre", "dic"]
};

export function answerQuestion(
  question: string,
  pharmacyCase: PharmacyCase,
  currentState: ChatbotConversationState = defaultState
): ChatbotAnswer {
  const normalized = normalize(question);
  const computed = getComputedData(pharmacyCase);
  const state = { ...defaultState, ...currentState };

  if (!normalized) {
    return respond(
      "Puedes preguntar por precios, marcas, ventas de un mes o historial completo. Con que dato quieres empezar?",
      "clarification",
      { stage: "inicio" },
      "inicio"
    );
  }

  if (matchesAny(normalized, outOfScopeTerms)) {
    return respond(
      "Puedo ayudarte solo con el caso de abastecimiento de paracetamol. Si quieres, revisamos precios o ventas mensuales.",
      "redirect",
      { stage: "exploracion", lastTopic: state.lastTopic, lastBrand: state.lastBrand, lastMonth: state.lastMonth },
      "alcance"
    );
  }

  if (matchesAny(normalized, greetingTerms) && normalized.split(" ").length <= 4) {
    return respond(
      pharmacyCase.openingStatement,
      "welcome",
      { stage: "inicio" },
      "inicio"
    );
  }

  if (matchesAny(normalized, processGuidanceTerms)) {
    return respond(
      "Primero debes analizar los precios. Calcula el costo por comprimido de cada marca.\nLuego analiza el historial de ventas para identificar meses de mayor demanda.\nFinalmente, con esa informacion, toma una decision de abastecimiento.\n\nQuieres empezar por los precios o por las ventas?",
      "guidance",
      { stage: "exploracion", lastTopic: "guia" },
      "guia"
    );
  }

  const continuationAnswer = handleContinuation(normalized, state, computed, pharmacyCase);
  if (continuationAnswer) {
    return continuationAnswer;
  }

  const answerFeedback = evaluateStudentAnswer(normalized, computed);
  if (answerFeedback) {
    return answerFeedback;
  }

  if (matchesAny(normalized, solutionTerms)) {
    return respond(
      "Vamos paso a paso. Primero conviene elegir el dato clave: precios o ventas. Que calculo crees que necesitas hacer primero?",
      "guidance",
      { stage: "exploracion", lastTopic: "guia" },
      "guia"
    );
  }

  const month = findMonth(normalized);
  const brand = findBrand(normalized, pharmacyCase);
  const ordinalBrand = findOrdinalBrand(normalized, pharmacyCase);
  const exampleBrand = brand ?? state.lastBrand ?? "Genfar";

  if (matchesAny(normalized, calculationGuidanceTerms)) {
    const price = computed.priceByBrand.get(exampleBrand) ?? 0;

    return respond(
      `Debes dividir el precio de la caja por la cantidad de comprimidos. En ${exampleBrand} seria ${formatCurrency(price)} dividido en 100. Cuanto da por comprimido?`,
      "guidance",
      { stage: "seguimiento", lastTopic: "costo_por_comprimido", lastBrand: exampleBrand },
      "costo por comprimido"
    );
  }

  if (ordinalBrand && canUseOrdinalReference(state)) {
    return buildOrdinalBrandAnswer(ordinalBrand, computed, pharmacyCase);
  }

  if (month && matchesAny(normalized, salesTerms)) {
    const sale = computed.salesByMonth.get(month);
    return respond(
      `En ${capitalize(month)} se vendieron ${sale?.units} unidades. Que te sugiere ese dato sobre la demanda?`,
      "data",
      { stage: "seguimiento", lastTopic: "ventas", lastMonth: month },
      "ventas"
    );
  }

  if (brand && matchesAny(normalized, priceTerms)) {
    const price = computed.priceByBrand.get(brand);
    return respond(
      `${brand} tiene un precio mayorista de ${formatCurrency(price ?? 0)} por caja de 100 comprimidos. Quieres compararlo con otra marca?`,
      "data",
      { stage: "seguimiento", lastTopic: "precios", lastBrand: brand, pendingAction: "brand_price_compare" },
      "precios"
    );
  }

  if (brand && normalized.length <= 18 && state.lastTopic === "precios") {
    const price = computed.priceByBrand.get(brand);
    return respond(
      `${brand} cuesta ${formatCurrency(price ?? 0)} por caja. Si quieres, luego comparamos el costo por comprimido.`,
      "data",
      { stage: "seguimiento", lastTopic: "precios", lastBrand: brand },
      "precios"
    );
  }

  if (month && normalized.length <= 18 && state.lastTopic === "ventas") {
    const sale = computed.salesByMonth.get(month);
    return respond(
      `${capitalize(month)} registra ${sale?.units} unidades vendidas. Quieres revisar otro mes o el historial completo?`,
      "data",
      { stage: "seguimiento", lastTopic: "ventas", lastMonth: month },
      "ventas"
    );
  }

  if (matchesAny(normalized, brandTerms)) {
    return respond(
      `Hay cuatro marcas disponibles: ${computed.brandListText}. Todas son de 500 mg en cajas de 100 comprimidos. Quieres revisar los precios?`,
      "data",
      { stage: "exploracion", lastTopic: "marcas", pendingAction: "show_prices" },
      "marcas"
    );
  }

  if (matchesAny(normalized, priceTerms)) {
    return respond(
      computed.priceListText,
      "data",
      { stage: "exploracion", lastTopic: "precios" },
      "precios"
    );
  }

  if (normalized.includes("historial completo") || normalized.includes("todas las ventas") || normalized.includes("todo el historial")) {
    return respond(
      computed.salesHistoryText,
      "data",
      { stage: "exploracion", lastTopic: "ventas" },
      "ventas"
    );
  }

  if (matchesAny(normalized, salesTerms) && (normalized.includes("historial") || normalized.includes("mensual") || normalized.includes("meses"))) {
    return respond(
      computed.salesHistoryText,
      "data",
      { stage: "exploracion", lastTopic: "ventas" },
      "ventas"
    );
  }

  if (matchesAny(normalized, cheapestTerms)) {
    return respond(
      "Para saberlo, divide el precio de cada caja por 100. Asi obtienes el costo por comprimido. Quieres hacerlo con una marca primero?",
      "guidance",
      { stage: "seguimiento", lastTopic: "costo_por_comprimido", lastBrand: "Genfar", pendingAction: "tablet_cost_example" },
      "costo por comprimido"
    );
  }

  if (matchesAny(normalized, tabletCostTerms) || normalized.includes("por comprimido")) {
    return respond(
      "Para saberlo, divide el precio de cada caja por 100. Asi obtienes el costo por comprimido. Quieres hacerlo con una marca primero?",
      "guidance",
      { stage: "seguimiento", lastTopic: "costo_por_comprimido", lastBrand: brand ?? "Genfar", pendingAction: "tablet_cost_example" },
      "costo por comprimido"
    );
  }

  if (matchesAny(normalized, averageTerms)) {
    return respond(
      "Para hallar el promedio mensual, suma las ventas de los 12 meses y divide por 12. Quieres que revisemos primero el total anual?",
      "guidance",
      { stage: "seguimiento", lastTopic: "promedio", pendingAction: "average_total" },
      "promedio"
    );
  }

  if (normalized.includes("total anual") || normalized.includes("ventas totales") || normalized.includes("total de ventas")) {
    return respond(
      `El total anual es ${computed.totalAnnualSales} unidades. Ahora puedes dividir ese total por 12 para obtener el promedio mensual.`,
      "data",
      { stage: "seguimiento", lastTopic: "promedio" },
      "promedio"
    );
  }

  if (normalized.includes("mayor venta") || normalized.includes("mes de mayor") || normalized.includes("mes mas alto")) {
    return respond(
      `${capitalize(computed.highestSale.month)} es el mes con mayor venta: ${computed.highestSale.units} unidades. Que decision tomarias para ese periodo?`,
      "data",
      { stage: "seguimiento", lastTopic: "demanda_alta", lastMonth: computed.highestSale.month },
      "demanda alta"
    );
  }

  if (normalized.includes("menor venta") || normalized.includes("mes de menor") || normalized.includes("mes mas bajo")) {
    return respond(
      `${capitalize(computed.lowestSale.month)} es el mes con menor venta: ${computed.lowestSale.units} unidades. Que te muestra eso sobre la variacion anual?`,
      "data",
      { stage: "seguimiento", lastTopic: "demanda_baja", lastMonth: computed.lowestSale.month },
      "demanda baja"
    );
  }

  if (normalized.includes("alta demanda") || normalized.includes("meses de alta") || normalized.includes("demanda alta")) {
    return respond(
      "Revisa mayo a agosto: ahi la demanda sube con fuerza, sobre todo junio, julio y agosto. Cual de esos meses ves como el pico?",
      "guidance",
      { stage: "seguimiento", lastTopic: "demanda_alta" },
      "demanda alta"
    );
  }

  if (normalized.includes("baja demanda") || normalized.includes("meses bajos") || normalized.includes("demanda baja")) {
    return respond(
      "Los meses mas bajos estan al inicio y al final del ano. Febrero es el menor, y enero y diciembre tambien quedan bajos. Quieres compararlos?",
      "guidance",
      { stage: "seguimiento", lastTopic: "demanda_baja" },
      "demanda baja"
    );
  }

  if (matchesAny(normalized, seasonalityTerms)) {
    return respond(
      "Se ve un alza clara entre mayo y agosto, con pico en julio. Eso sugiere una demanda estacional mas alta en invierno. Como ajustarias la compra?",
      "data",
      { stage: "seguimiento", lastTopic: "estacionalidad" },
      "estacionalidad"
    );
  }

  if (matchesAny(normalized, stockTerms)) {
    return respond(
      "Para decidir cuantas cajas comprar, conviene mirar primero los meses de mayor venta y dejar margen de seguridad. Quieres usar julio como referencia?",
      "guidance",
      { stage: "seguimiento", lastTopic: "stock", lastMonth: "julio", pendingAction: "stock_reference" },
      "stock"
    );
  }

  if (matchesAny(normalized, riskTerms) && normalized.includes("estacional")) {
    return respond(
      "Si no consideras el aumento estacional, puedes quedar con quiebre de stock justo cuando mas se vende. Eso afecta atencion, continuidad y planificacion.",
      "data",
      { stage: "seguimiento", lastTopic: "riesgo" },
      "riesgo"
    );
  }

  if (matchesAny(normalized, storageTerms)) {
    return respond(
      "El almacenamiento debe ser ordenado, seco y protegido del calor y la humedad. Tambien conviene mantener control de vencimientos y rotacion del stock.",
      "data",
      { stage: "seguimiento", lastTopic: "almacenamiento" },
      "almacenamiento"
    );
  }

  if (matchesAny(normalized, registryTerms)) {
    return respond(
      "Registrar ingresos y salidas ayuda a saber cuanto entra, cuanto se vende y cuando reponer. Tambien mejora la trazabilidad y evita faltas o excesos.",
      "data",
      { stage: "seguimiento", lastTopic: "registro" },
      "registro"
    );
  }

  return buildContextualFallback(state);
}

function handleContinuation(
  normalized: string,
  state: ChatbotConversationState,
  computed: ReturnType<typeof getComputedData>,
  pharmacyCase: PharmacyCase
) {
  const isAffirmative = isShortAffirmative(normalized);
  const isNegative = isShortNegative(normalized);

  if (!isAffirmative && !isNegative) {
    return undefined;
  }

  if (state.pendingAction === "show_prices") {
    if (isAffirmative) {
      return respond(
        computed.priceListText,
        "data",
        { stage: "exploracion", lastTopic: "precios" },
        "precios"
      );
    }

    return respond(
      "Esta bien. Si luego quieres, puedo mostrarte los precios o las ventas mensuales.",
      "guidance",
      { stage: "exploracion", lastTopic: "marcas" },
      "marcas"
    );
  }

  if (state.pendingAction === "tablet_cost_example") {
    if (isAffirmative) {
      const brand = state.lastBrand ?? "Genfar";
      const price = computed.priceByBrand.get(brand) ?? 0;

      return respond(
        `Perfecto. Hagamoslo con ${brand}: ${formatCurrency(price)} dividido en 100 comprimidos. Cuanto da por comprimido?`,
        "guidance",
        { stage: "seguimiento", lastTopic: "costo_por_comprimido", lastBrand: brand },
        "costo por comprimido"
      );
    }

    return respond(
      "Esta bien. Entonces puedes decirme una marca especifica o pedirme los precios para compararlos.",
      "guidance",
      { stage: "seguimiento", lastTopic: "costo_por_comprimido" },
      "costo por comprimido"
    );
  }

  if (state.pendingAction === "average_total") {
    if (isAffirmative) {
      return respond(
        `Perfecto. El total anual es ${computed.totalAnnualSales} unidades. Ahora divide ese total por 12. Cuanto te da de promedio mensual?`,
        "data",
        { stage: "seguimiento", lastTopic: "promedio" },
        "promedio"
      );
    }

    return respond(
      "No hay problema. Si quieres, puedes pedirme el total anual cuando lo necesites.",
      "guidance",
      { stage: "seguimiento", lastTopic: "promedio" },
      "promedio"
    );
  }

  if (state.pendingAction === "stock_reference") {
    if (isAffirmative) {
      const referenceMonth = state.lastMonth ?? "julio";
      const sale = computed.salesByMonth.get(referenceMonth);

      return respond(
        `Perfecto. En ${capitalize(referenceMonth)} se vendieron ${sale?.units} unidades. Como cada caja trae 100 comprimidos, primero calcula cuantas cajas cubren esa demanda. Cuantas te da como minimo?`,
        "guidance",
        { stage: "seguimiento", lastTopic: "stock", lastMonth: referenceMonth },
        "stock"
      );
    }

    return respond(
      "Esta bien. Si prefieres, podemos usar otro mes de referencia para calcular la compra.",
      "guidance",
      { stage: "seguimiento", lastTopic: "stock" },
      "stock"
    );
  }

  if (state.pendingAction === "brand_price_compare") {
    if (isAffirmative) {
      const nextBrand = getNextBrand(state.lastBrand, pharmacyCase);
      const price = computed.priceByBrand.get(nextBrand) ?? 0;

      return respond(
        `Perfecto. Comparemos con ${nextBrand}: ${formatCurrency(price)} por caja de 100 comprimidos. Quieres revisar una marca mas?`,
        "data",
        { stage: "seguimiento", lastTopic: "precios", lastBrand: nextBrand, pendingAction: "brand_price_compare" },
        "precios"
      );
    }

    return respond(
      "Esta bien. Si quieres seguir comparando, puedes decirme otra marca en cualquier momento.",
      "guidance",
      { stage: "seguimiento", lastTopic: "precios", lastBrand: state.lastBrand },
      "precios"
    );
  }

  if (isAffirmative && state.lastTopic === "costo_por_comprimido") {
    const brand = state.lastBrand ?? "Genfar";
    const price = computed.priceByBrand.get(brand) ?? 0;

    return respond(
      `Sigamos con ${brand}: ${formatCurrency(price)} dividido en 100 comprimidos. Cuanto da por comprimido?`,
      "guidance",
      { stage: "seguimiento", lastTopic: "costo_por_comprimido", lastBrand: brand },
      "costo por comprimido"
    );
  }

  if (isAffirmative && state.lastTopic === "precios") {
    return respond(
      "Podemos seguir con precios. Dime una marca y te doy su valor, o te muestro toda la comparacion.",
      "guidance",
      { stage: "seguimiento", lastTopic: "precios", lastBrand: state.lastBrand },
      "precios"
    );
  }

  if (isAffirmative && state.lastTopic === "ventas") {
    return respond(
      "Podemos seguir con ventas. Dime un mes especifico o pideme el historial completo.",
      "guidance",
      { stage: "seguimiento", lastTopic: "ventas", lastMonth: state.lastMonth },
      "ventas"
    );
  }

  return undefined;
}

function evaluateStudentAnswer(normalized: string, computed: ReturnType<typeof getComputedData>) {
  if (normalized.includes("genfar") && (normalized.includes("mas barata") || normalized.includes("mas economica") || normalized.includes("economica"))) {
    return respond(
      "Si, Genfar es la opcion mas economica. Buen analisis. Si quieres, ahora revisamos cuanto cuesta cada comprimido.",
      "feedback",
      { stage: "seguimiento", lastTopic: "costo_por_comprimido", lastBrand: "Genfar", pendingAction: "tablet_cost_example" },
      "retroalimentacion"
    );
  }

  if (
    (normalized.includes("mintlab") || normalized.includes("chile") || normalized.includes("bago")) &&
    (normalized.includes("mas barata") || normalized.includes("mas economica") || normalized.includes("economica"))
  ) {
    return respond(
      "Esa no es la mas economica. Conviene comparar el precio de cada caja o dividir cada valor por 100. Que marca tiene el menor precio?",
      "feedback",
      { stage: "seguimiento", lastTopic: "costo_por_comprimido", pendingAction: "tablet_cost_example" },
      "retroalimentacion"
    );
  }

  if (normalized.includes("julio") && (normalized.includes("mayor") || normalized.includes("mas alta") || normalized.includes("alta demanda"))) {
    return respond(
      "Correcto. Julio es el mes de mayor venta con 620 unidades. Ese dato es clave para planificar la compra.",
      "feedback",
      { stage: "seguimiento", lastTopic: "demanda_alta", lastMonth: "julio" },
      "retroalimentacion"
    );
  }

  if (normalized.includes("febrero") && (normalized.includes("menor") || normalized.includes("mas baja") || normalized.includes("baja demanda"))) {
    return respond(
      "Correcto. Febrero es el mes de menor venta con 160 unidades. Eso ayuda a ver la variacion del ano.",
      "feedback",
      { stage: "seguimiento", lastTopic: "demanda_baja", lastMonth: "febrero" },
      "retroalimentacion"
    );
  }

  if (includesApproximateNumber(normalized, computed.averageMonthlySales) && normalized.includes("promedio")) {
    return respond(
      "Si, el promedio mensual es 322,5 unidades. Bien hecho. Ahora puedes compararlo con los meses altos para definir stock.",
      "feedback",
      { stage: "seguimiento", lastTopic: "promedio" },
      "retroalimentacion"
    );
  }

  if (normalized.includes("32") && normalized.includes("genfar")) {
    return respond(
      "Correcto. Genfar cuesta $32 por comprimido. Quieres comprobar ahora otra marca?",
      "feedback",
      { stage: "seguimiento", lastTopic: "costo_por_comprimido", lastBrand: "Genfar", pendingAction: "brand_price_compare" },
      "retroalimentacion"
    );
  }

  if (normalized.includes("34") && normalized.includes("chile")) {
    return respond(
      "Vas bien, pero revisa el decimal. Chile queda en $34,5 por comprimido. Quieres seguir con Mintlab?",
      "feedback",
      { stage: "seguimiento", lastTopic: "costo_por_comprimido", lastBrand: "Chile" },
      "retroalimentacion"
    );
  }

  if (normalized.includes("37") && normalized.includes("mintlab")) {
    return respond(
      "Correcto. Mintlab queda en $37 por comprimido. Solo falta comparar con las demas para decidir.",
      "feedback",
      { stage: "seguimiento", lastTopic: "costo_por_comprimido", lastBrand: "Mintlab" },
      "retroalimentacion"
    );
  }

  if ((normalized.includes("42") || normalized.includes("42 5") || normalized.includes("42,5")) && normalized.includes("bago")) {
    return respond(
      "Correcto. Bago queda en $42,5 por comprimido. Con esa comparacion ya puedes identificar la mas economica.",
      "feedback",
      { stage: "seguimiento", lastTopic: "costo_por_comprimido", lastBrand: "Bago" },
      "retroalimentacion"
    );
  }

  return undefined;
}

function buildContextualFallback(state: ChatbotConversationState) {
  if (state.lastTopic === "costo_por_comprimido") {
    return respond(
      "Sigamos con el costo por comprimido. Si quieres, usamos Genfar como ejemplo o puedes decirme una marca.",
      "clarification",
      { stage: "seguimiento", lastTopic: "costo_por_comprimido", lastBrand: state.lastBrand, pendingAction: "tablet_cost_example" },
      "costo por comprimido"
    );
  }

  if (state.lastTopic === "precios") {
    return respond(
      "Sigamos con precios. Puedes decirme una marca especifica o pedirme toda la comparacion.",
      "clarification",
      { stage: "seguimiento", lastTopic: "precios", lastBrand: state.lastBrand },
      "precios"
    );
  }

  if (state.lastTopic === "ventas") {
    return respond(
      "Sigamos con ventas. Puedes pedirme un mes especifico o el historial completo.",
      "clarification",
      { stage: "seguimiento", lastTopic: "ventas", lastMonth: state.lastMonth },
      "ventas"
    );
  }

  if (state.lastTopic === "promedio") {
    return respond(
      "Si quieres, revisamos el total anual y luego calculamos el promedio mensual.",
      "clarification",
      { stage: "seguimiento", lastTopic: "promedio", pendingAction: "average_total" },
      "promedio"
    );
  }

  if (state.lastTopic === "stock") {
    return respond(
      "Si quieres, usamos julio como referencia para estimar cuantas cajas comprar.",
      "clarification",
      { stage: "seguimiento", lastTopic: "stock", lastMonth: "julio", pendingAction: "stock_reference" },
      "stock"
    );
  }

  return respond(
    "No estoy seguro de que dato necesitas. Puedes preguntarme por precios, marcas, ventas de un mes o historial completo.",
    "clarification",
    { stage: "exploracion", lastTopic: state.lastTopic, lastBrand: state.lastBrand, lastMonth: state.lastMonth },
    "aclaracion"
  );
}

function getComputedData(pharmacyCase: PharmacyCase) {
  const priceByBrand = new Map(pharmacyCase.wholesalePrices.map((item) => [item.brand, item.pricePerBox]));
  const salesByMonth = new Map(pharmacyCase.monthlySales.map((item) => [item.month, item]));
  const highestSale = pharmacyCase.monthlySales.reduce((top, current) => (current.units > top.units ? current : top));
  const lowestSale = pharmacyCase.monthlySales.reduce((low, current) => (current.units < low.units ? current : low));
  const totalAnnualSales = pharmacyCase.monthlySales.reduce((total, item) => total + item.units, 0);
  const averageMonthlySales = totalAnnualSales / pharmacyCase.monthlySales.length;

  return {
    priceByBrand,
    salesByMonth,
    highestSale,
    lowestSale,
    totalAnnualSales,
    averageMonthlySales,
    brandListText: pharmacyCase.wholesalePrices.map((item) => item.brand).join(", "),
    priceListText: pharmacyCase.wholesalePrices
      .map((item) => `${item.brand}: ${formatCurrency(item.pricePerBox)} por caja`)
      .join(". "),
    salesHistoryText: pharmacyCase.monthlySales
      .map((item) => `${capitalize(item.month)}: ${item.units}`)
      .join(", ")
  };
}

function findMonth(normalized: string) {
  for (const [month, aliases] of Object.entries(monthAliases)) {
    if (aliases.some((alias) => normalized.includes(alias))) {
      return month;
    }
  }

  return undefined;
}

function findBrand(normalized: string, pharmacyCase: PharmacyCase) {
  for (const item of pharmacyCase.wholesalePrices) {
    if (normalized.includes(normalize(item.brand))) {
      return item.brand;
    }

    if (normalize(item.brand) === "bago" && normalized.includes("bago")) {
      return item.brand;
    }
  }

  return undefined;
}

function getNextBrand(currentBrand: string | undefined, pharmacyCase: PharmacyCase) {
  const brands = pharmacyCase.wholesalePrices.map((item) => item.brand);
  const currentIndex = currentBrand ? brands.indexOf(currentBrand) : -1;

  if (currentIndex === -1 || currentIndex === brands.length - 1) {
    return brands[0];
  }

  return brands[currentIndex + 1];
}

function findOrdinalBrand(normalized: string, pharmacyCase: PharmacyCase) {
  const index = ordinalTerms.findIndex((group) =>
    group.some((term) => normalized.includes(term))
  );

  if (index === -1) {
    return undefined;
  }

  return pharmacyCase.wholesalePrices[index]?.brand;
}

function canUseOrdinalReference(state: ChatbotConversationState) {
  return (
    state.lastTopic === "marcas" ||
    state.lastTopic === "precios" ||
    state.pendingAction === "show_prices" ||
    state.pendingAction === "brand_price_compare"
  );
}

function buildOrdinalBrandAnswer(
  brand: string,
  computed: ReturnType<typeof getComputedData>,
  pharmacyCase: PharmacyCase
) {
  const price = computed.priceByBrand.get(brand) ?? 0;
  const label = getOrdinalLabel(brand, pharmacyCase);

  return respond(
    `${label} es ${brand}. Su precio mayorista es ${formatCurrency(price)} por caja de 100 comprimidos.`,
    "data",
    { stage: "seguimiento", lastTopic: "precios", lastBrand: brand },
    "precios"
  );
}

function getOrdinalLabel(brand: string, pharmacyCase: PharmacyCase) {
  const index = pharmacyCase.wholesalePrices.findIndex((item) => item.brand === brand);
  const labels = ["El primero", "El segundo", "El tercero", "El cuarto"];

  return labels[index] ?? "Ese";
}

function includesApproximateNumber(text: string, value: number) {
  const options = [
    value.toString(),
    value.toFixed(1),
    value.toFixed(1).replace(".", ","),
    Math.round(value).toString()
  ];

  return options.some((option) => text.includes(option));
}

function respond(
  text: string,
  responseLevel: ChatbotAnswer["responseLevel"],
  nextState: ChatbotConversationState,
  matchedTopic?: string
): ChatbotAnswer {
  return {
    text,
    responseLevel,
    matchedTopic,
    nextState
  };
}

function matchesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(normalize(term)));
}

function isShortAffirmative(text: string) {
  return isShortReply(text) && affirmativeReplies.some((term) => text === normalize(term));
}

function isShortNegative(text: string) {
  return isShortReply(text) && negativeReplies.some((term) => text === normalize(term));
}

function isShortReply(text: string) {
  return text.split(" ").filter(Boolean).length <= 3;
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: value % 1 === 0 ? 0 : 1
  }).format(value);
}
