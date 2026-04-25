export type WholesalePrice = {
  brand: string;
  pricePerBox: number;
};

export type MonthlySale = {
  month: string;
  units: number;
};

export type PharmacyCase = {
  id: string;
  title: string;
  pharmacyName: string;
  educationalRole: string;
  openingStatement: string;
  context: {
    summary: string;
    product: string;
    presentation: string;
    boxContent: string;
    usageHint: string;
  };
  wholesalePrices: WholesalePrice[];
  monthlySales: MonthlySale[];
  learningGoals: string[];
};

export type ChatMessage = {
  id: string;
  sender: "student" | "bot";
  text: string;
  matchedTopic?: string;
  responseLevel?:
    | "welcome"
    | "data"
    | "guidance"
    | "feedback"
    | "clarification"
    | "redirect";
};

export type ConversationStage = "inicio" | "exploracion" | "seguimiento";

export type PendingAction =
  | "show_prices"
  | "tablet_cost_example"
  | "average_total"
  | "stock_reference"
  | "brand_price_compare";

export type ChatbotConversationState = {
  stage: ConversationStage;
  lastTopic?: string;
  lastBrand?: string;
  lastMonth?: string;
  pendingAction?: PendingAction;
};

export type ChatbotAnswer = {
  text: string;
  matchedTopic?: string;
  responseLevel: ChatMessage["responseLevel"];
  nextState: ChatbotConversationState;
};
