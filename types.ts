
export enum GuardianMode {
  EMPATHETIC = 'Empathetic Friend',
  CARE_TAKER = 'Elder Care Assistant',
  FOCUS_COACH = 'Focus Coach',
  CRISIS_SUPPORT = 'Crisis Support'
}

export interface Message {
  role: 'user' | 'guardian';
  text: string;
  timestamp: Date;
  stressDetected?: boolean;
}

export interface SessionState {
  isActive: boolean;
  isConnecting: boolean;
  isTalking: boolean;
  isListening: boolean;
}
