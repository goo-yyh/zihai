import type { SVGProps } from "react";

type BrandIconProps = SVGProps<SVGSVGElement>;

export function ChromeIcon({ className, ...props }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path fill="#EA4335" d="M3.34 7A10 10 0 0 1 20.66 7L12 12Z" />
      <path fill="#34A853" d="M20.66 7A10 10 0 0 1 12 22V12Z" />
      <path fill="#FBBC04" d="M12 22A10 10 0 0 1 3.34 7L12 12Z" />
      <circle cx="12" cy="12" r="5.25" fill="white" />
      <circle cx="12" cy="12" r="4" fill="#4285F4" />
    </svg>
  );
}

export function GitHubIcon({ className, ...props }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.009-.866-.014-1.7-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.071 1.531 1.03 1.531 1.03.892 1.53 2.341 1.088 2.91.832.091-.647.349-1.088.635-1.338-2.221-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.27.098-2.647 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.378.203 2.395.1 2.648.64.7 1.028 1.595 1.028 2.688 0 3.848-2.337 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
    </svg>
  );
}
