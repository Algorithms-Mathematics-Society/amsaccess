export type PaymentProviderName = string;

export type PaymentProviderStatus = "not_configured" | "ready";

export type PaymentProviderCapability =
  | "checkout"
  | "subscriptions"
  | "webhooks"
  | "refunds";

export interface PaymentProviderDescriptor {
  name: PaymentProviderName;
  status: PaymentProviderStatus;
  capabilities: PaymentProviderCapability[];
}

