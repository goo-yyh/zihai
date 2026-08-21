export * from "./auth";
export * from "./feedback";
export * from "./iterations";
export * from "./likes";
export * from "./moderation";
export * from "./projects";

import * as authSchema from "./auth";
import * as feedbackSchema from "./feedback";
import * as iterationSchema from "./iterations";
import * as likeSchema from "./likes";
import * as moderationSchema from "./moderation";
import * as projectSchema from "./projects";

export const schema = {
  ...authSchema,
  ...feedbackSchema,
  ...iterationSchema,
  ...likeSchema,
  ...moderationSchema,
  ...projectSchema,
};
