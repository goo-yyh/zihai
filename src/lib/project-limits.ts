import { UserFacingError } from "@/lib/errors";

export const MAX_PROJECTS_PER_USER = 10;

export const PROJECT_LIMIT_MESSAGE =
  "Each account can create up to 10 projects. Delete an existing project before creating another.";

export function canCreateProject(currentProjectCount: number) {
  return currentProjectCount < MAX_PROJECTS_PER_USER;
}

export function assertCanCreateProject(currentProjectCount: number) {
  if (!canCreateProject(currentProjectCount)) {
    throw new UserFacingError(PROJECT_LIMIT_MESSAGE);
  }
}
