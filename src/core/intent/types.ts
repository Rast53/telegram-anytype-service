export type IntentName =
  | "create_day_plan"
  | "add_inbox_note"
  | "get_day_plan"
  | "get_inbox"
  | "unknown";

export interface DayPlanEntry {
  dateIso: string;
  items: string[];
  sourceSegment: string;
}

export interface IntentPayloadMap {
  create_day_plan: {
    plans: DayPlanEntry[];
  };
  add_inbox_note: {
    note: string;
  };
  get_day_plan: {
    dateIso: string;
  };
  get_inbox: {
    limit: number;
  };
  unknown: {
    originalText: string;
  };
}

export interface IntentResult<TName extends IntentName = IntentName> {
  intent: TName;
  payload: IntentPayloadMap[TName];
  reason: string;
  confidence: number;
}

export type ResolvedIntentResult = {
  [K in IntentName]: IntentResult<K>;
}[IntentName];
