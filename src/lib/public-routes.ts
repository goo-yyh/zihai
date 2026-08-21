type PublicProjectRoute = {
  id: string;
  slug: string;
};

type PublicProfileRoute = {
  id: string;
  username: string;
};

function segment(value: string) {
  return encodeURIComponent(value);
}

export function publicProjectPath(project: PublicProjectRoute) {
  return `/p/${segment(project.id)}/${segment(project.slug)}`;
}

export function publicProfilePath(profile: PublicProfileRoute) {
  return `/u/${segment(profile.id)}/${segment(profile.username)}`;
}
