import { UserFacingError } from "@/lib/errors";

export type FeatureName = "iterations";

const featureFlags: Readonly<Record<FeatureName, boolean>> = {
  iterations: false,
};

export function isFeatureEnabled(feature: FeatureName) {
  return featureFlags[feature];
}

export function assertFeatureEnabled(feature: FeatureName) {
  if (!isFeatureEnabled(feature)) {
    throw new UserFacingError("This feature is temporarily unavailable.");
  }
}
