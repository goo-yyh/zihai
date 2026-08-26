export * from "./auth";
export * from "./feedback";
export * from "./ideas";
export * from "./likes";
export * from "./moderation";
export * from "./projects";

import * as authSchema from "./auth";
import * as feedbackSchema from "./feedback";
import * as ideaSchema from "./ideas";
import * as likeSchema from "./likes";
import * as moderationSchema from "./moderation";
import * as projectSchema from "./projects";

export const schema = {
  ...authSchema,
  ...feedbackSchema,
  ...ideaSchema,
  ...likeSchema,
  ...moderationSchema,
  ...projectSchema,
};
