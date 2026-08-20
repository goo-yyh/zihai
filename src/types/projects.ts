export const PUBLIC_PROJECT_SORTS = ["latest", "hot"] as const;

export type PublicProjectSort = (typeof PUBLIC_PROJECT_SORTS)[number];

export type ProjectCardData = {
  id: string;
  name: string;
  slug: string;
  description: string;
  websiteUrl: string | null;
  githubUrl: string | null;
  imageUrl: string;
  ownerUsername: string | null;
  ownerImage: string | null;
  likeCount: number;
};

export type PublicProjectPage = {
  items: ProjectCardData[];
  nextPage: number | null;
  totalCount: number | null;
};
