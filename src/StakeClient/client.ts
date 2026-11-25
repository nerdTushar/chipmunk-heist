/**
 * Stake Engine Client - Complete Implementation for PixiJS
 * This file contains all necessary functionality for RGS API communication
 */

// Constants
export const API_AMOUNT_MULTIPLIER = 1000000;
export const BOOK_AMOUNT_MULTIPLIER = 100;

// Types
export interface AuthOptions {
  sessionID?: string;
  rgsUrl?: string;
  language?: string;
}

export interface PlayOptions {
  amount: number;
  mode: string;
  sessionID?: string;
  currency?: string;
  rgsUrl?: string;
}

export interface BalanceObject {
  amount: number;
  currency: string;
}

export interface ConfigObject {
  betLevels?: number[];
  gameID?: string;
  minBet?: number;
  maxBet?: number;
  stepBet?: number;
  defaultBetLevel?: number;
  [key: string]: any;
}

export interface AuthenticateResponse {
  balance?: BalanceObject;
  config?: ConfigObject;
  status?: any;
  round?: any;
}

export interface PlayResponse {
  balance?: BalanceObject;
  round?: any;
  status?: any;
}

// Fetcher
interface FetcherOptions {
  method: "GET" | "POST";
  endpoint: string;
  variables?: Record<string, any>;
}

const fetcher = (options: FetcherOptions): Promise<Response> => {
  const { method, endpoint, variables } = options;

  return fetch(endpoint, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    ...(method === "GET" ? {} : { body: JSON.stringify(variables) }),
  });
};

// Error class
export class RGSError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "RGSError";
  }
}

// Client
class StakeEngineClient {
  async post<T = any>(options: {
    rgsUrl: string;
    url: string;
    variables?: any;
  }): Promise<T> {
    const response = await fetcher({
      method: "POST",
      variables: options.variables,
      endpoint: `https://${options.rgsUrl}${options.url}`,
    });

    if (response.status !== 200) {
      const errorData = await response.json().catch(() => ({}));
      throw new RGSError(
        (errorData as any).error || `ERR_${response.status}`,
        (errorData as any).message ||
          `RGS API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return data as T;
  }

  async get<T = any>(options: { rgsUrl: string; url: string }): Promise<T> {
    const response = await fetcher({
      method: "GET",
      endpoint: `https://${options.rgsUrl}${options.url}`,
    });

    if (response.status !== 200) {
      const errorData = await response.json().catch(() => ({}));
      throw new RGSError(
        (errorData as any).error || `ERR_${response.status}`,
        (errorData as any).message ||
          `RGS API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return data as T;
  }
}

const stakeEngineClient = new StakeEngineClient();

// Helper functions
const getUrlParams = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    sessionID: urlParams.get("sessionID"),
    rgsUrl: urlParams.get("rgs_url"),
    language: urlParams.get("lang") || "en",
    currency: urlParams.get("currency") || "USD",
  };
};

export const getReplayUrlParams = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    replay: urlParams.get("replay") === "true",
    amount: Number(urlParams.get("amount")) || 0,
    game: urlParams.get("game") || "",
    version: urlParams.get("version") || "",
    mode: urlParams.get("mode") || "",
    event: urlParams.get("event") || "",
  };
};

export const isReplayMode = () => {
  return new URLSearchParams(window.location.search).get("replay") === "true";
};

// Main API functions
export const authenticate = async (
  options?: AuthOptions,
): Promise<AuthenticateResponse> => {
  const urlParams = getUrlParams();
  const sessionID = options?.sessionID || urlParams.sessionID;
  const rgsUrl = options?.rgsUrl || urlParams.rgsUrl;
  const language = options?.language || urlParams.language;

  if (!sessionID)
    throw new Error("sessionID is required (provide in options or URL param)");
  if (!rgsUrl)
    throw new Error(
      "rgsUrl is required (provide in options or rgs_url URL param)",
    );

  return stakeEngineClient.post<AuthenticateResponse>({
    rgsUrl,
    url: "/wallet/authenticate",
    variables: {
      sessionID,
      language,
    },
  });
};

export const play = async (options: PlayOptions): Promise<PlayResponse> => {
  const urlParams = getUrlParams();
  const sessionID = options.sessionID || urlParams.sessionID;
  const rgsUrl = options.rgsUrl || urlParams.rgsUrl;
  const currency = options.currency || urlParams.currency;

  if (!sessionID)
    throw new Error("sessionID is required (provide in options or URL param)");
  if (!rgsUrl)
    throw new Error(
      "rgsUrl is required (provide in options or rgs_url URL param)",
    );

  return stakeEngineClient.post<PlayResponse>({
    rgsUrl,
    url: "/wallet/play",
    variables: {
      mode: options.mode,
      currency,
      sessionID,
      amount: options.amount * API_AMOUNT_MULTIPLIER,
    },
  });
};

export const getBalance = async (options?: AuthOptions): Promise<any> => {
  const urlParams = getUrlParams();
  const sessionID = options?.sessionID || urlParams.sessionID;
  const rgsUrl = options?.rgsUrl || urlParams.rgsUrl;

  if (!sessionID) throw new Error("sessionID is required");
  if (!rgsUrl) throw new Error("rgsUrl is required");

  return stakeEngineClient.post({
    rgsUrl,
    url: "/wallet/balance",
    variables: { sessionID },
  });
};

export const endRound = async (options?: AuthOptions): Promise<any> => {
  const urlParams = getUrlParams();
  const sessionID = options?.sessionID || urlParams.sessionID;
  const rgsUrl = options?.rgsUrl || urlParams.rgsUrl;

  if (!sessionID) throw new Error("sessionID is required");
  if (!rgsUrl) throw new Error("rgsUrl is required");

  return stakeEngineClient.post({
    rgsUrl,
    url: "/wallet/end-round",
    variables: { sessionID },
  });
};

export const endEvent = async (options: {
  eventIndex: number;
  sessionID?: string;
  rgsUrl?: string;
}): Promise<any> => {
  const urlParams = getUrlParams();
  const sessionID = options.sessionID || urlParams.sessionID;
  const rgsUrl = options.rgsUrl || urlParams.rgsUrl;

  if (!sessionID) throw new Error("sessionID is required");
  if (!rgsUrl) throw new Error("rgsUrl is required");

  return stakeEngineClient.post({
    rgsUrl,
    url: "/bet/event",
    variables: {
      sessionID,
      event: `${options.eventIndex}`,
    },
  });
};

export const replay = async (options: {
  game: string;
  version: string;
  mode: string;
  event: string;
  rgsUrl?: string;
}): Promise<any> => {
  const urlParams = getUrlParams();
  const rgsUrl = options.rgsUrl || urlParams.rgsUrl;

  if (!rgsUrl) throw new Error("rgsUrl is required");

  return stakeEngineClient.get({
    rgsUrl,
    url: `/bet/replay/${options.game}/${options.version}/${options.mode}/${options.event}`,
  });
};

export const requestReplay = replay;

// Deprecated aliases
export const requestAuthenticate = authenticate;
export const requestBalance = getBalance;
export const requestBet = play;
export const requestEndRound = endRound;
export const requestEndEvent = endEvent;

export { stakeEngineClient, StakeEngineClient };
